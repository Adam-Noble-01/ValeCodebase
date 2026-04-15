$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptRoot

Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host " VALESPEC - LOCALHOST STARTER (POWERSHELL)" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host " Launching python ValeSpec__FlaskServer__Localhost__.py on http://127.0.0.1:8002/ValeSpec__App__.html" -ForegroundColor Yellow
Write-Host "=============================================================================" -ForegroundColor Cyan

$PortInUseConnections = Get-NetTCPConnection -LocalPort 8002 -State Listen -ErrorAction SilentlyContinue
if ($PortInUseConnections) {
    Write-Host "" -ForegroundColor Yellow
    Write-Host " [WARNING] Port 8002 is already in use by another process." -ForegroundColor Yellow
    Write-Host " [WARNING] ValeSpec will not force-stop it to avoid impacting other apps." -ForegroundColor Yellow
    Write-Host " [WARNING] Stop the existing process manually or run ValeSpec on another port." -ForegroundColor Yellow
    Write-Host "" -ForegroundColor Yellow
    exit 1
}

try {
    python -u ValeSpec__FlaskServer__Localhost__.py --host 127.0.0.1 --port 8002
}
catch {
    Write-Host "python failed, trying py launcher..." -ForegroundColor Yellow
    py -3 -u ValeSpec__FlaskServer__Localhost__.py --host 127.0.0.1 --port 8002
}
