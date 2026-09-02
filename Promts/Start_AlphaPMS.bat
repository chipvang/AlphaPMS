@echo off
setlocal
title AlphaPMS Launcher

set "LAUNCHER=%~dp0Start-AlphaPMS.ps1"

if not exist "%LAUNCHER%" (
    echo [ERROR] Khong tim thay launcher PowerShell:
    echo %LAUNCHER%
    pause
    exit /b 1
)

echo [AlphaPMS] Dang kiem tra va khoi dong backend/frontend...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%LAUNCHER%"
set "RESULT=%ERRORLEVEL%"

if not "%RESULT%"=="0" (
    echo.
    echo [ERROR] Khoi dong AlphaPMS that bai. Ma loi: %RESULT%
    echo Kiem tra log tai: %TEMP%\AlphaPMS
    pause
    exit /b %RESULT%
)

echo.
echo AlphaPMS san sang:
echo   Backend : http://localhost:5080
echo   Frontend: http://localhost:3000
timeout /t 3 /nobreak >nul 2>nul
exit /b 0
