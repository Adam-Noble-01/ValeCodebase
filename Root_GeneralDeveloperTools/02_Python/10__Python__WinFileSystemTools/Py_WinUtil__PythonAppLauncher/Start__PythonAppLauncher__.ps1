# =============================================================================
# Start__PythonAppLauncher__.ps1
# =============================================================================
# Dev-friendly launcher for the Python App Launcher.
# Uses python.exe (not pythonw.exe) so console log output stays visible while
# debugging. For shell:startup linking use Start__PythonAppLauncher__Silent__.vbs
# instead so no console appears on login.
# =============================================================================

$ErrorActionPreference = "Stop"

$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Definition
$mainScript = Join-Path $scriptDir "Py_WinUtil__PythonAppLauncher__Main__.py"

if (-not (Test-Path $mainScript)) {
    Write-Error "Main script not found: $mainScript"
    exit 1
}

Write-Host "Launching Python App Launcher..." -ForegroundColor Cyan
Write-Host "Main: $mainScript" -ForegroundColor DarkGray

python $mainScript
exit $LASTEXITCODE
