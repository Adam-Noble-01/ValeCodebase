$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $PSScriptRoot "ValePlanner__Admin__RetrospectiveEditor.py"
if (-not (Test-Path $scriptPath)) {
    Write-Host "Could not find Python script:" -ForegroundColor Red
    Write-Host $scriptPath -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

try {
    & py -3 $scriptPath
    exit $LASTEXITCODE
} catch {
    try {
        & python $scriptPath
        exit $LASTEXITCODE
    } catch {
        Write-Host "Failed to launch Python script." -ForegroundColor Red
        Write-Host "Install Python or ensure 'py'/'python' is on PATH." -ForegroundColor Yellow
        Write-Host $_.Exception.Message -ForegroundColor DarkYellow
        Read-Host "Press Enter to close"
        exit 1
    }
}
$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $PSScriptRoot "ValePlanner__Admin__RetrospectiveEditor.py"
if (-not (Test-Path $scriptPath)) {
    Write-Host "Could not find Python script:" -ForegroundColor Red
    Write-Host $scriptPath -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

try {
    & py -3 $scriptPath
    exit $LASTEXITCODE
} catch {
    try {
        & python $scriptPath
        exit $LASTEXITCODE
    } catch {
        Write-Host "Failed to launch Python script." -ForegroundColor Red
        Write-Host "Install Python or ensure 'py'/'python' is on PATH." -ForegroundColor Yellow
        Write-Host $_.Exception.Message -ForegroundColor DarkYellow
        Read-Host "Press Enter to close"
        exit 1
    }
}
