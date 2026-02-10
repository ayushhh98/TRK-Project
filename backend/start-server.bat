@echo off
REM Production-Level Server Startup Script
REM Handles port conflicts and process cleanup automatically

echo ==================================
echo TRK Backend Server Startup
echo ==================================
echo.

REM Kill any existing Node processes on port 5000
echo Checking for existing processes on port 5000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000') do (
    echo Found process %%a running on port 5000
    taskkill /F /PID %%a 2>nul
    echo Process %%a terminated
)

echo.
echo Starting backend server...
cd /d "%~dp0"
npm run dev

pause
