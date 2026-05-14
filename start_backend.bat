@echo off
cd /d "%~dp0quinx-gui\backend"
echo Starting Quinx backend on port 8002...
venv\Scripts\python.exe -m uvicorn main:app --port 8002 --reload
pause
