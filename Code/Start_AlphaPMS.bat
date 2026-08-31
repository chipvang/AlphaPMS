@echo off
setlocal
title AlphaPMS Launcher

set "ROOT=D:\A VinAlpha\AlphaPMS"
set "FRONTEND=%ROOT%\Code"
set "BACKEND=%ROOT%\Code\Backend\src\AlphaPMS.Api"
set "BACKEND_CSPROJ=%BACKEND%\AlphaPMS.Api.csproj"
set "RUNTIME=%TEMP%\AlphaPMS"

if not exist "%RUNTIME%" mkdir "%RUNTIME%"

if not exist "%FRONTEND%\package.json" (
    echo [ERROR] Khong tim thay frontend: %FRONTEND%\package.json
    pause
    exit /b 1
)

if not exist "%BACKEND_CSPROJ%" (
    echo [ERROR] Khong tim thay backend: %BACKEND_CSPROJ%
    pause
    exit /b 1
)

echo [AlphaPMS] Khoi dong backend : http://localhost:5080
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$x=Get-NetTCPConnection -LocalPort 5080 -State Listen -ErrorAction SilentlyContinue; if($x){Write-Host '[OK] Backend da chay - bo qua.'} else {$p=Start-Process -FilePath 'dotnet' -ArgumentList @('run','--project','%BACKEND_CSPROJ%','--urls','http://localhost:5080') -WorkingDirectory '%BACKEND%' -WindowStyle Hidden -PassThru -RedirectStandardOutput '%RUNTIME%\backend.out.log' -RedirectStandardError '%RUNTIME%\backend.err.log'; $p.Id | Set-Content '%RUNTIME%\backend.pid'; Write-Host ('[OK] Backend PID ' + $p.Id)}"

echo [AlphaPMS] Khoi dong frontend: http://localhost:3000
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$x=Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; if($x){Write-Host '[OK] Frontend da chay - bo qua.'} else {$p=Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c','pnpm dev') -WorkingDirectory '%FRONTEND%' -WindowStyle Hidden -PassThru -RedirectStandardOutput '%RUNTIME%\frontend.out.log' -RedirectStandardError '%RUNTIME%\frontend.err.log'; $p.Id | Set-Content '%RUNTIME%\frontend.pid'; Write-Host ('[OK] Frontend PID ' + $p.Id)}"

echo.
echo Da gui lenh khoi dong AlphaPMS.
echo Backend : http://localhost:5080
echo Frontend: http://localhost:3000
echo Log     : %RUNTIME%
echo.
echo Cua so nay se tu dong dong. Backend/Frontend van tiep tuc chay.
timeout /t 2 /nobreak >nul
exit
