# =============================================================================
# Start__PdfToTextExtractor__.ps1
# =============================================================================
# Launches the PDF-to-Text Extraction Engine GUI.
# =============================================================================

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$mainScript = Join-Path $scriptDir "Py_PdfUtils__PdfToTextExtractor__Main__.py"

if (-not (Test-Path $mainScript)) {
    Write-Error "Main script not found: $mainScript"
    exit 1
}

Write-Host "Launching PDF-to-Text Extraction Engine..." -ForegroundColor Cyan
Write-Host "Main: $mainScript" -ForegroundColor DarkGray

python $mainScript
exit $LASTEXITCODE
