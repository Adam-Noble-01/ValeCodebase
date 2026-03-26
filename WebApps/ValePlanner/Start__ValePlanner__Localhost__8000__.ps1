$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptRoot

Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host " VALEPLANNER - LOCALHOST STARTER (POWERSHELL)" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host " Launching python server.py on http://127.0.0.1:8000/index.html" -ForegroundColor Yellow
Write-Host "=============================================================================" -ForegroundColor Cyan

$PortInUseConnections = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($PortInUseConnections) {
    $PortInUsePids = $PortInUseConnections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($PidValue in $PortInUsePids) {
        Write-Host " Port 8000 already in use. Stopping PID $PidValue..." -ForegroundColor Yellow
        Stop-Process -Id $PidValue -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Milliseconds 350
}

try {
    python -u server.py --host 127.0.0.1 --port 8000
}
catch {
    Write-Host "python failed, trying py launcher..." -ForegroundColor Yellow
    py -3 -u server.py --host 127.0.0.1 --port 8000
}
