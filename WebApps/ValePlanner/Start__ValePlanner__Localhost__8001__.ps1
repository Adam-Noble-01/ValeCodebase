$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptRoot

Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host " VALEPLANNER - LOCALHOST STARTER (POWERSHELL)" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host " Launching python server.py on http://127.0.0.1:8001/index.html" -ForegroundColor Yellow
Write-Host "=============================================================================" -ForegroundColor Cyan

$PortInUseConnections = Get-NetTCPConnection -LocalPort 8001 -State Listen -ErrorAction SilentlyContinue
if ($PortInUseConnections) {
    Write-Host "" -ForegroundColor Yellow
    Write-Host " [WARNING] Port 8001 is already in use by another process." -ForegroundColor Yellow
    Write-Host " [WARNING] ValePlanner will not force-stop it to avoid impacting other apps." -ForegroundColor Yellow
    Write-Host " [WARNING] Stop the existing process manually or run ValePlanner on another port." -ForegroundColor Yellow
    Write-Host "" -ForegroundColor Yellow
    exit 1
}

try {
    python -u server.py --host 127.0.0.1 --port 8001
}
catch {
    Write-Host "python failed, trying py launcher..." -ForegroundColor Yellow
    py -3 -u server.py --host 127.0.0.1 --port 8001
}
