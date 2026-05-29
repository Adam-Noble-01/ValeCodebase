# =============================================================================
# NOBLEIMAGETOOLS - POWERSHELL LAUNCHER
# =============================================================================
#
# FILE       : NobleImageTools__LaunchServer__Localhost__8005__.ps1
# PURPOSE    : Activates the Python virtual environment (if present), starts
#              the Flask server, and opens the app in the default browser.
#
# SETUP (first time):
#   1. Create a venv:     python -m venv .venv
#   2. Activate it:       .\.venv\Scripts\Activate.ps1
#   3. Install deps:      pip install -r 05__Server__Sam2Backend\requirements.txt
#   4. For GPU (NVIDIA):  pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
#   5. Download model:    python 00__AiModels\download_models.py
#   6. Run this script:   .\NobleImageTools__LaunchServer__Localhost__8005__.ps1
#
# USAGE:
#   Right-click → Run with PowerShell
#   Or from terminal: .\NobleImageTools__LaunchServer__Localhost__8005__.ps1
#
# =============================================================================

$ErrorActionPreference = "Stop"

$ScriptDir      = Split-Path -Parent $MyInvocation.MyCommand.Path
$VenvPath       = Join-Path $ScriptDir ".venv"
$VenvActivate   = Join-Path $VenvPath "Scripts\Activate.ps1"
$ServerScript   = Join-Path $ScriptDir "NobleImageTools__LaunchServer__Localhost__8005__.py"
$AppUrl         = "http://127.0.0.1:8005/NobleImageTools__App__.html"

Set-Location $ScriptDir

Write-Host ""
Write-Host "======================================================================="
Write-Host " NOBLEIMAGETOOLS - LAUNCH SERVER"
Write-Host "======================================================================="
Write-Host ""

# Activate venv if it exists
if (Test-Path $VenvActivate) {
    Write-Host " Activating virtual environment: $VenvPath"
    & $VenvActivate
} else {
    Write-Host " No .venv found - using system Python."
    Write-Host " (Run: python -m venv .venv && .\.venv\Scripts\Activate.ps1 && pip install -r 05__Server__Sam2Backend\requirements.txt)"
}

Write-Host ""
Write-Host " Starting Flask server on http://127.0.0.1:8005"
Write-Host " Opening browser in 3 seconds..."
Write-Host ""

# Open browser after a short delay (server needs time to start)
$BrowserJob = Start-Job -ScriptBlock {
    param($url)
    Start-Sleep -Seconds 3
    Start-Process $url
} -ArgumentList $AppUrl

# Run server (blocks until Ctrl+C)
python $ServerScript

# Clean up background job
Stop-Job $BrowserJob -ErrorAction SilentlyContinue
Remove-Job $BrowserJob -ErrorAction SilentlyContinue
