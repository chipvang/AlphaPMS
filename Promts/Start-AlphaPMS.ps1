<#
.SYNOPSIS
Khởi động API AlphaPMS và máy chủ frontend trên localhost.

.DESCRIPTION
Chỉ khởi động dịch vụ nếu cổng tương ứng chưa được sử dụng.
Nhật ký và PID được lưu tại %TEMP%\AlphaPMS để dùng cùng các launcher hiện có.
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$frontendPath = $PSScriptRoot
if (-not (Test-Path -LiteralPath (Join-Path $frontendPath 'package.json'))) {
    $frontendPath = Join-Path (Split-Path -Parent $PSScriptRoot) 'Code'
}
$backendPath = Join-Path $frontendPath 'Backend\src\AlphaPMS.Api'
$backendProject = Join-Path $backendPath 'AlphaPMS.Api.csproj'
$runtimePath = Join-Path $env:TEMP 'AlphaPMS'

if (-not (Test-Path -LiteralPath (Join-Path $frontendPath 'package.json'))) {
    throw "Khong tim thay frontend tai: $frontendPath"
}

if (-not (Test-Path -LiteralPath $backendProject)) {
    throw "Khong tim thay backend tai: $backendProject"
}

New-Item -ItemType Directory -Path $runtimePath -Force | Out-Null

function Test-PortListening {
    param([Parameter(Mandatory)][int]$Port)

    return $null -ne (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Start-AlphaPmsProcess {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][int]$Port,
        [Parameter(Mandatory)][string]$FilePath,
        [Parameter(Mandatory)][string]$ArgumentList,
        [Parameter(Mandatory)][string]$WorkingDirectory
    )

    if (Test-PortListening -Port $Port) {
        Write-Host "[OK] $Name dang chay tai http://localhost:$Port"
        return
    }

    $process = Start-Process -FilePath $FilePath -ArgumentList $ArgumentList -WorkingDirectory $WorkingDirectory -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $runtimePath "$Name.out.log") `
        -RedirectStandardError (Join-Path $runtimePath "$Name.err.log")
    $process.Id | Set-Content -LiteralPath (Join-Path $runtimePath "$Name.pid")
    Write-Host "[OK] Da khoi dong $Name (PID $($process.Id))."
}

Start-AlphaPmsProcess -Name 'backend' -Port 5080 -FilePath 'dotnet' `
    -ArgumentList "run --project `"$backendProject`" --urls http://localhost:5080" `
    -WorkingDirectory $backendPath

Start-AlphaPmsProcess -Name 'frontend' -Port 3000 -FilePath 'cmd.exe' `
    -ArgumentList '/c pnpm dev' `
    -WorkingDirectory $frontendPath

Write-Host ''
Write-Host 'AlphaPMS da nhan lenh khoi dong:'
Write-Host '  Backend : http://localhost:5080'
Write-Host '  Frontend: http://localhost:3000'
Write-Host "  Nhat ky  : $runtimePath"
