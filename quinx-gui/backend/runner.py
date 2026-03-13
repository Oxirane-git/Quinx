import asyncio
import os
import subprocess
from typing import Dict, Optional
from fastapi import WebSocket

# ---------------------------------------------------------------------------
# Process Manager
# ---------------------------------------------------------------------------

class ProcessManager:
    def __init__(self):
        # Maps module name → subprocess.Popen instance
        self.processes: Dict[str, subprocess.Popen] = {}
        # Maps module name → list of connected WebSockets
        self.connections: Dict[str, list[WebSocket]] = {
            "scraper": [],
            "writer": [],
            "sender": []
        }

    async def connect(self, module: str, websocket: WebSocket):
        await websocket.accept()
        if module in self.connections:
            self.connections[module].append(websocket)
            await websocket.send_text(f"[SYSTEM] Connected to {module} log stream.\n")

    def disconnect(self, module: str, websocket: WebSocket):
        if module in self.connections and websocket in self.connections[module]:
            self.connections[module].remove(websocket)

    async def broadcast(self, module: str, message: str):
        if module not in self.connections:
            return
        alive = []
        for ws in self.connections[module]:
            try:
                await ws.send_text(message)
                alive.append(ws)
            except Exception:
                pass
        self.connections[module] = alive

    async def run_command(self, module: str, cmd: list[str], cwd: str, env: Optional[Dict[str, str]] = None):
        """
        Launch cmd as a subprocess (via thread executor to avoid Windows asyncio
        subprocess restrictions), stream stdout/stderr to all connected WebSockets.
        """
        if self.is_running(module):
            await self.broadcast(module, f"[SYSTEM] A process for {module} is already running.\n")
            return

        cmd_str = " ".join(cmd)
        await self.broadcast(module, f"[SYSTEM] Starting process:\n[SYSTEM] Command: {cmd_str}\n[SYSTEM] Workdir: {cwd}\n\n")

        run_env = os.environ.copy()
        run_env["PYTHONUNBUFFERED"] = "1"  # force immediate stdout flush in all child Python scripts
        if env:
            run_env.update(env)

        loop = asyncio.get_running_loop()

        try:
            # Start subprocess in a thread so we never touch asyncio subprocess
            # (which requires ProactorEventLoop and can be flaky under uvicorn --reload)
            def _start() -> subprocess.Popen:
                return subprocess.Popen(
                    cmd,
                    cwd=cwd,
                    env=run_env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                )

            proc = await loop.run_in_executor(None, _start)
            self.processes[module] = proc

            # Read stdout line-by-line in executor, broadcast each line via asyncio
            def _read_line():
                return proc.stdout.readline()

            while True:
                raw = await loop.run_in_executor(None, _read_line)
                if not raw:
                    break
                await self.broadcast(module, raw.decode("utf-8", errors="replace"))

            returncode = await loop.run_in_executor(None, proc.wait)
            self.processes.pop(module, None)
            await self.broadcast(module, f"\n[SYSTEM] Process exited with code {returncode}.\n")
            return returncode

        except Exception as e:
            import traceback
            self.processes.pop(module, None)
            await self.broadcast(module, f"\n[ERROR] {type(e).__name__}: {e}\n{traceback.format_exc()}\n")
            return -1

    def is_running(self, module: str) -> bool:
        proc = self.processes.get(module)
        if proc is None:
            return False
        return proc.poll() is None  # None = still running

    async def stop(self, module: str):
        proc = self.processes.get(module)
        if not proc or proc.poll() is not None:
            return
        loop = asyncio.get_running_loop()
        await self.broadcast(module, "\n[SYSTEM] Sending termination signal...\n")
        try:
            proc.terminate()
            try:
                await asyncio.wait_for(loop.run_in_executor(None, proc.wait), timeout=5.0)
            except asyncio.TimeoutError:
                await self.broadcast(module, "\n[SYSTEM] Force-killing process...\n")
                proc.kill()
                await loop.run_in_executor(None, proc.wait)
        except Exception as e:
            await self.broadcast(module, f"\n[ERROR] Error stopping process: {e}\n")
        finally:
            self.processes.pop(module, None)
            await self.broadcast(module, "\n[SYSTEM] Process stopped.\n")


# Global instance used by the FastAPI app
process_manager = ProcessManager()
