# Simple in-memory task store to replace Celery for local testing.
import threading

_lock = threading.Lock()
_tasks: dict = {}  # job_id -> {"status": str, "result": any, "log": str, "proc": subprocess or None}

def create(job_id: str):
    with _lock:
        _tasks[job_id] = {"status": "PENDING", "result": None, "log": "", "proc": None}

def update(job_id: str, status: str, result=None, log: str = ""):
    with _lock:
        if job_id in _tasks:
            _tasks[job_id]["status"] = status
            _tasks[job_id]["result"] = result
            _tasks[job_id]["log"] = log
        else:
            _tasks[job_id] = {"status": status, "result": result, "log": log, "proc": None}

def set_proc(job_id: str, proc):
    with _lock:
        if job_id in _tasks:
            _tasks[job_id]["proc"] = proc

def get(job_id: str) -> dict:
    with _lock:
        t = _tasks.get(job_id, {"status": "UNKNOWN", "result": None, "log": ""})
        return {"status": t["status"], "result": t["result"], "log": t["log"]}

def cancel(job_id: str) -> bool:
    with _lock:
        t = _tasks.get(job_id)
        if not t:
            return False
        proc = t.get("proc")
        if proc and proc.poll() is None:
            proc.kill()
        t["status"] = "CANCELLED"
        t["result"] = {"error": "Cancelled by user"}
        return True
