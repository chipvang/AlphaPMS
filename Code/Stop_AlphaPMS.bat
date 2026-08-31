@echo off
setlocal
title Stop AlphaPMS

set "RUNTIME=%TEMP%\AlphaPMS"

echo [AlphaPMS] Dang dung backend/frontend...

if exist "%RUNTIME%\backend.pid" (
    for /f "usebackq delims=" %%P in ("%RUNTIME%\backend.pid") do (
        taskkill /PID %%P /T /F >nul 2>&1
    )
    del /q "%RUNTIME%\backend.pid" >nul 2>&1
)

if exist "%RUNTIME%\frontend.pid" (
    for /f "usebackq delims=" %%P in ("%RUNTIME%\frontend.pid") do (
        taskkill /PID %%P /T /F >nul 2>&1
    )
    del /q "%RUNTIME%\frontend.pid" >nul 2>&1
)

echo Da gui lenh dung AlphaPMS.
timeout /t 2 /nobreak >nul
exit
