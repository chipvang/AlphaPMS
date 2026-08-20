@echo off
title AlphaPMS Local Server

cd /d "D:\A VinAlpha\AlphaPMS\Code"

echo ==========================================
echo   Starting AlphaPMS Local Server...
echo ==========================================
echo.

start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

npm.cmd run dev

pause