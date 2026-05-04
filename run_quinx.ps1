# Quinx AI — Run Everything
# This script starts the Backend and Frontend in separate windows.

$ROOT = Get-Location

Write-Host "Starting Quinx Backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$ROOT\quinx-gui\backend`"; ..\..\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

Write-Host "Starting Quinx Frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$ROOT\quinx-gui\frontend`"; npm run dev"

Write-Host "Both processes started in separate windows." -ForegroundColor Green
