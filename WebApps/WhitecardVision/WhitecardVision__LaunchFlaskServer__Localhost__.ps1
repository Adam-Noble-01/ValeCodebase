<#
.SYNOPSIS
    WhitecardVision - Localhost Launcher (port 8004)

.DESCRIPTION
    Launches the Python Flask-style server for the WhitecardVision web app.
    Handles port-busy detection, optional kill + restart, and auto-opening
    the app in the default browser after a successful health check.

.PARAMETER PortBusyAction
    When port 8004 is already in use, what to do:
      Prompt  - ask (default)
      Restart - kill the offending PID and start a fresh server
      Open    - skip launching and just open the browser
      Exit    - abort without doing anything
#>

[CmdletBinding()]
param(
    [int]   $Port           = 8004,
    [switch]$NoOpen,
    [ValidateSet('Prompt', 'Restart', 'Open', 'Exit')]
    [string]$PortBusyAction = 'Prompt'
)

$ErrorActionPreference = 'Stop'

# -----------------------------------------------------------------------------
# REGION | Constants
# -----------------------------------------------------------------------------

$Wv__ScriptRoot   = Split-Path -Parent $MyInvocation.MyCommand.Path
$Wv__ServerScript = Join-Path $Wv__ScriptRoot '05__FlaskServerScripts\WhitecardVision__FlaskServer__Main__.py'
$Wv__AppUrl       = "http://127.0.0.1:$Port/WhitecardVision__App__.html"
$Wv__HealthUrl    = "http://127.0.0.1:$Port/api/system/health"

Write-Host ('=' * 77) -ForegroundColor DarkCyan
Write-Host " WHITECARDVISION - LAUNCHER" -ForegroundColor Cyan
Write-Host ('=' * 77) -ForegroundColor DarkCyan
Write-Host " Port       : $Port"
Write-Host " Script     : $Wv__ServerScript"
Write-Host " App URL    : $Wv__AppUrl"
Write-Host ('=' * 77) -ForegroundColor DarkCyan

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Helpers
# -----------------------------------------------------------------------------

function Wv__Starter__TestHealth {
    try {
        $healthResponse = Invoke-RestMethod -Uri $Wv__HealthUrl -TimeoutSec 2 -ErrorAction Stop
        return [bool]$healthResponse.ok
    } catch {
        return $false
    }
}

function Wv__Starter__GetListenerConnection {
    try {
        return (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop | Select-Object -First 1)
    } catch {
        return $null
    }
}

function Wv__Starter__OpenApp {
    Write-Host " Opening $Wv__AppUrl" -ForegroundColor Green
    try   { Start-Process $Wv__AppUrl | Out-Null }
    catch { Write-Warning "Could not auto-open browser: $($_.Exception.Message)" }
}

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Preflight - Script present?
# -----------------------------------------------------------------------------

if (-not (Test-Path $Wv__ServerScript -PathType Leaf)) {
    Write-Host " [ERROR] Missing server script: $Wv__ServerScript" -ForegroundColor Red
    exit 1
}

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Preflight - Port Busy?
# -----------------------------------------------------------------------------

$listenerConnection = Wv__Starter__GetListenerConnection
if ($listenerConnection) {
    $offendingPid = $listenerConnection.OwningProcess
    try { $offendingProcess = Get-Process -Id $offendingPid -ErrorAction Stop }
    catch { $offendingProcess = $null }

    Write-Host ""
    Write-Host " [INFO] Port $Port is already in use by PID $offendingPid ($($offendingProcess.ProcessName))" -ForegroundColor Yellow

    $alreadyHealthy = Wv__Starter__TestHealth
    if ($alreadyHealthy) { Write-Host " [INFO] Existing server responds to /api/system/health" -ForegroundColor Green }

    $chosenAction = $PortBusyAction
    if ($chosenAction -eq 'Prompt') {
        Write-Host ""
        Write-Host "   [R]estart  kill PID $offendingPid and start fresh"
        Write-Host "   [O]pen     skip launch and just open the app"
        Write-Host "   [E]xit     abort"
        $userInput = Read-Host " Choose [R/O/E]"
        switch ($userInput.ToUpperInvariant()) {
            'R' { $chosenAction = 'Restart' }
            'O' { $chosenAction = 'Open' }
            default { $chosenAction = 'Exit' }
        }
    }

    switch ($chosenAction) {
        'Restart' {
            Write-Host " [ACTION] Stopping PID $offendingPid..." -ForegroundColor Yellow
            try {
                Stop-Process -Id $offendingPid -Force -ErrorAction Stop
                Start-Sleep -Seconds 1
            } catch {
                Write-Host " [ERROR] Could not stop PID $offendingPid - $($_.Exception.Message)" -ForegroundColor Red
                exit 1
            }
        }
        'Open' {
            if (-not $NoOpen) { Wv__Starter__OpenApp }
            exit 0
        }
        'Exit' {
            Write-Host " Aborted." -ForegroundColor DarkYellow
            exit 0
        }
    }
}

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Launch Python server
# -----------------------------------------------------------------------------

$pythonExecutable = (Get-Command python -ErrorAction SilentlyContinue)
if (-not $pythonExecutable) { $pythonExecutable = (Get-Command py -ErrorAction SilentlyContinue) }
if (-not $pythonExecutable) {
    Write-Host " [ERROR] Python not found on PATH. Install Python 3.9+ and retry." -ForegroundColor Red
    exit 1
}

Write-Host " Starting server: $($pythonExecutable.Source) `"$Wv__ServerScript`" --port $Port" -ForegroundColor Green
$serverProcess = Start-Process -FilePath $pythonExecutable.Source `
    -ArgumentList @("`"$Wv__ServerScript`"", "--port", "$Port") `
    -PassThru -WindowStyle Normal

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Health check loop
# -----------------------------------------------------------------------------

Write-Host " Waiting for /api/system/health..." -ForegroundColor DarkGray
$healthAttemptCount = 0
$healthAttemptLimit = 30
$healthReached      = $false
while ($healthAttemptCount -lt $healthAttemptLimit) {
    Start-Sleep -Milliseconds 500
    if (Wv__Starter__TestHealth) { $healthReached = $true; break }
    $healthAttemptCount++
}

if (-not $healthReached) {
    Write-Host " [ERROR] Server failed to become healthy within timeout." -ForegroundColor Red
    try { if ($serverProcess -and -not $serverProcess.HasExited) { Stop-Process -Id $serverProcess.Id -Force } } catch {}
    exit 1
}

Write-Host " Server is healthy." -ForegroundColor Green

if (-not $NoOpen) { Wv__Starter__OpenApp }

Write-Host ""
Write-Host " Press Ctrl+C in the server window to stop. (Type --r / --R in that" -ForegroundColor DarkGray
Write-Host " window to hot-restart without killing it.)" -ForegroundColor DarkGray

# endregion ----------------------------------------------------
