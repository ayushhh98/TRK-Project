@echo off
echo "🚀 TRK Backend: Cleanup & Start"
echo -----------------------------
echo 🔍 Checking for staleness on port 5002...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5002') do (
    echo 🔪 Terminating existing process (PID %%a)...
    taskkill /F /PID %%a
)
echo ✅ Port 5002 is clear.
echo 🔌 Starting Backend Server...
node src/server.js
pause
