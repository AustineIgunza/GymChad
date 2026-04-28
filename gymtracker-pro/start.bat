@echo off
REM Quick start script for testing GymChad locally on Windows

echo.
echo 🚀 Starting GymChad locally...
echo.

REM Backend
echo 📦 Starting backend (FastAPI)...
cd backend
if not exist venv (
    python -m venv venv
)
call venv\Scripts\activate.bat
pip install -r requirements.txt > nul 2>&1
start cmd /k python main.py

REM Wait a bit for backend to start
timeout /t 3 /nobreak

REM Frontend
echo 📦 Starting frontend (React)...
cd ..\frontend
call npm install > nul 2>&1
start cmd /k npm run dev

echo.
echo ✅ Services started!
echo.
echo 🌐 Access at:
echo    Frontend:  http://localhost:5173
echo    Backend:   http://localhost:3001
echo    API Docs:  http://localhost:3001/docs
echo.
echo Close terminal windows to stop services
echo.
pause
