param(
    [ValidateSet("Prompt", "Restart", "Open", "Exit")]
    [string]$PortBusyAction = "Prompt",
    [switch]$NoPause
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptRoot

$Na__AppUrl = "http://127.0.0.1:8006/VghLantern__App__.html"

function Na__Starter__PauseIfNeeded {
    param([string]$Message)
    if (-not $NoPause) {
        Write-Host ""
        [void](Read-Host $Message)
    }
}

function Na__Starter__TestHealth {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:8006/api/system/health" -TimeoutSec 2
        return ($response.StatusCode -eq 200)
    } catch {
        return $false
    }
}

function Na__Starter__GetListenerConnection {
    return Get-NetTCPConnection -LocalPort 8006 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
}

Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host " VGHLANTERN - LOCALHOST STARTER (POWERSHELL)" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host " Launching python VghLantern__FlaskServer__Localhost__.py on $Na__AppUrl" -ForegroundColor Yellow
Write-Host "=============================================================================" -ForegroundColor Cyan

$PortConnection = Na__Starter__GetListenerConnection
if ($PortConnection) {
    $PortPid = $PortConnection.OwningProcess
    Write-Host ""
    Write-Host " [INFO] Port 8006 is already in use (PID $PortPid)." -ForegroundColor Yellow

    if (Na__Starter__TestHealth) {
        Write-Host " [INFO] VghLantern health endpoint is responding." -ForegroundColor Green
        $choiceRaw = ""
        if ($PortBusyAction -eq "Prompt") {
            $choiceRaw = Read-Host " [ACTION] Type R to restart here for live logs, O to open app, or X to exit [R]"
        } elseif ($PortBusyAction -eq "Restart") {
            $choiceRaw = "R"
            Write-Host " [ACTION] PortBusyAction=Restart -> restarting in this window for live logs." -ForegroundColor Cyan
        } elseif ($PortBusyAction -eq "Open") {
            $choiceRaw = "O"
            Write-Host " [ACTION] PortBusyAction=Open -> opening app and leaving existing server running." -ForegroundColor Cyan
        } elseif ($PortBusyAction -eq "Exit") {
            $choiceRaw = "X"
            Write-Host " [ACTION] PortBusyAction=Exit -> no launcher action will be taken." -ForegroundColor Cyan
        }
        $choice = if ([string]::IsNullOrWhiteSpace($choiceRaw)) { "R" } else { $choiceRaw.Trim().ToUpperInvariant() }

        if ($choice -eq "O") {
            Start-Process $Na__AppUrl | Out-Null
            Na__Starter__PauseIfNeeded "VghLantern app opened. Press Enter to close this window..."
            exit 0
        }

        if ($choice -eq "X") {
            Na__Starter__PauseIfNeeded "No action taken. Press Enter to close this window..."
            exit 0
        }

        if ($choice -ne "R") {
            Write-Host " [WARNING] Unknown option '$choiceRaw'. Defaulting to restart." -ForegroundColor Yellow
        }

        try {
            Stop-Process -Id $PortPid -Force -ErrorAction Stop
            Start-Sleep -Milliseconds 500
            Write-Host " [INFO] Existing server process stopped. Starting visible server now..." -ForegroundColor Green
        } catch {
            Write-Host " [ERROR] Could not stop existing process PID ${PortPid}: $($_.Exception.Message)" -ForegroundColor Red
            Na__Starter__PauseIfNeeded "Press Enter to close this window..."
            exit 1
        }
    } else {
        Write-Host " [WARNING] Port 8006 is busy but VghLantern health check failed." -ForegroundColor Yellow
        Write-Host " [WARNING] Stop the occupying process manually and try again." -ForegroundColor Yellow
        Na__Starter__PauseIfNeeded "Press Enter to close this window..."
        exit 1
    }
}

$PythonExe = Get-Command python.exe -ErrorAction SilentlyContinue
$PyExe = Get-Command py.exe -ErrorAction SilentlyContinue

if ($PythonExe) {
    $LauncherPath = $PythonExe.Source
    $LauncherArgs = @("-u", "VghLantern__FlaskServer__Localhost__.py", "--host", "127.0.0.1", "--port", "8006")
} elseif ($PyExe) {
    $LauncherPath = $PyExe.Source
    $LauncherArgs = @("-3", "-u", "VghLantern__FlaskServer__Localhost__.py", "--host", "127.0.0.1", "--port", "8006")
} else {
    Write-Host " [ERROR] Could not find python.exe or py.exe on PATH." -ForegroundColor Red
    Na__Starter__PauseIfNeeded "Press Enter to close this window..."
    exit 1
}

& $LauncherPath @LauncherArgs
$ExitCode = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 0 }

if ($ExitCode -ne 0) {
    Write-Host ""
    Write-Host " [WARNING] VghLantern server exited with code $ExitCode." -ForegroundColor Yellow
}

Na__Starter__PauseIfNeeded "VghLantern server stopped. Press Enter to close this window..."
exit $ExitCode
