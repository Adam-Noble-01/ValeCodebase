param(
    [ValidateSet("Prompt", "Restart", "Open", "Exit")]
    [string]$PortBusyAction = "Prompt",
    [switch]$NoPause,
    [switch]$NoBrowser
)

# =============================================================================
# NAAUDIO - LOCALHOST STARTER (POWERSHELL)
# =============================================================================
#
# FILE       : Start__NaAudio__Localhost__8010__.ps1
# NAMESPACE  : NaAudio
# MODULE     : Dev - Localhost Starter
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Launch the AudioSPACE localhost server and open the application
# CREATED    : 08-Aug-2026
#
# DESCRIPTION:
# - Wraps NaAudio__LocalServer__Localhost__.py so a double-click starts the app.
# - Checks port 8010 first. Something already listening there is nearly always a
#   server left running from an earlier session, so the script offers to reuse it
#   rather than failing with a bind error that means nothing to a passer-by.
#
# =============================================================================

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptRoot

$Na__Port      = 8010
$Na__AppUrl    = "http://127.0.0.1:$Na__Port/NaAudio__App__.html"
$Na__ServerPy  = "NaAudio__LocalServer__Localhost__.py"


# -----------------------------------------------------------------------------
# REGION | Helper Functions
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Pause Unless Suppressed
    # ------------------------------------------------------------
    function Na__Starter__PauseIfNeeded {
        param([string]$Message)
        if (-not $NoPause) {
            Write-Host ""
            [void](Read-Host $Message)
        }
    }
    # ------------------------------------------------------------


    # HELPER FUNCTION | Find a Listener on the AudioSPACE Port
    # ------------------------------------------------------------
    function Na__Starter__GetListenerConnection {
        return Get-NetTCPConnection -LocalPort $Na__Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    }
    # ------------------------------------------------------------


    # HELPER FUNCTION | Resolve the Python Executable
    # ------------------------------------------------------------
    # 'py' is the Windows launcher and is the more reliable of the two - a bare
    # 'python' on Windows can be the Microsoft Store stub, which opens the Store
    # instead of running anything and gives no useful error at all.
    function Na__Starter__ResolvePython {
        foreach ($candidate in @("py", "python", "python3")) {
            $found = Get-Command $candidate -ErrorAction SilentlyContinue
            if ($found) { return $found.Source }
        }
        return $null
    }
    # ------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Start-Up
# -----------------------------------------------------------------------------

Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host " NAAUDIO - AUDIOSPACE LOCALHOST STARTER" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host " Launching $Na__ServerPy on $Na__AppUrl" -ForegroundColor Yellow
Write-Host "=============================================================================" -ForegroundColor Cyan

$PortConnection = Na__Starter__GetListenerConnection

if ($PortConnection) {
    $PortPid = $PortConnection.OwningProcess
    $PortProcess = Get-Process -Id $PortPid -ErrorAction SilentlyContinue

    Write-Host ""
    Write-Host " Port $Na__Port is already in use by PID $PortPid ($($PortProcess.ProcessName))." -ForegroundColor Yellow
    Write-Host " That is almost always an AudioSPACE server left running from earlier." -ForegroundColor Gray

    $Action = $PortBusyAction
    if ($Action -eq "Prompt") {
        Write-Host ""
        Write-Host "   [O] Open the application against the running server  (default)"
        Write-Host "   [R] Stop that process and restart the server"
        Write-Host "   [X] Exit"
        $Choice = Read-Host " Choose"
        switch ($Choice.ToUpper()) {
            "R"     { $Action = "Restart" }
            "X"     { $Action = "Exit" }
            default { $Action = "Open" }
        }
    }

    switch ($Action) {
        "Open" {
            Write-Host " Opening $Na__AppUrl" -ForegroundColor Green
            if (-not $NoBrowser) { Start-Process $Na__AppUrl }
            exit 0
        }
        "Exit" {
            Write-Host " Cancelled." -ForegroundColor Gray
            exit 0
        }
        "Restart" {
            Write-Host " Stopping PID $PortPid" -ForegroundColor Yellow
            Stop-Process -Id $PortPid -Force
            Start-Sleep -Milliseconds 600
        }
    }
}

$PythonExe = Na__Starter__ResolvePython
if (-not $PythonExe) {
    Write-Host ""
    Write-Host " [ERROR] No Python interpreter found on PATH." -ForegroundColor Red
    Write-Host "         Install Python 3 and make sure 'py' or 'python' resolves." -ForegroundColor Gray
    Na__Starter__PauseIfNeeded "Press Enter to close"
    exit 1
}

Write-Host " Python         : $PythonExe" -ForegroundColor Gray
Write-Host " Working folder : $ScriptRoot" -ForegroundColor Gray
Write-Host ""

$ServerArgs = @($Na__ServerPy, "--port", $Na__Port)
if (-not $NoBrowser) { $ServerArgs += "--open" }

& $PythonExe @ServerArgs
$ExitCode = $LASTEXITCODE

if ($ExitCode -ne 0) {
    Write-Host ""
    Write-Host " [WARNING] The server exited with code $ExitCode." -ForegroundColor Yellow
    Na__Starter__PauseIfNeeded "Press Enter to close"
}

exit $ExitCode

# endregion ----------------------------------------------------
