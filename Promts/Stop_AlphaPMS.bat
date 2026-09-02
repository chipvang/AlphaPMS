@echo off
setlocal
title Stop AlphaPMS

set "RUNTIME=%TEMP%\AlphaPMS"

echo [AlphaPMS] Dang dung backend/frontend...

call :StopSavedProcess "%RUNTIME%\backend.pid"
call :StopSavedProcess "%RUNTIME%\frontend.pid"

rem Dung theo cong de xu ly ca tien trinh con (node.exe/AlphaPMS.Api.exe)
rem khong duoc ghi dung vao file PID.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ports = 5080, 3000; $processIds = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $ports -contains $_.LocalPort } | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($processId in $processIds) { & taskkill.exe /PID $processId /T /F | Out-Null }"

del /q "%RUNTIME%\backend.pid" >nul 2>&1
del /q "%RUNTIME%\frontend.pid" >nul 2>&1

echo Da gui lenh dung AlphaPMS tren cong 5080 va 3000.
timeout /t 2 /nobreak >nul 2>nul
exit /b 0

:StopSavedProcess
if exist "%~1" (
    for /f "usebackq delims=" %%P in ("%~1") do (
        taskkill /PID %%P /T /F >nul 2>&1
    )
)
exit /b 0
