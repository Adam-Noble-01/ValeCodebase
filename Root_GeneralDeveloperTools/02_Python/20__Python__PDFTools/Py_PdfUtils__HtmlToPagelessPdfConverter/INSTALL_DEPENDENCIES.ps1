# =============================================================================
# HTML to Pageless PDF Converter - Dependency Installation Script (PowerShell)
# =============================================================================
# This script installs all required dependencies to the local folder
# to keep the application portable and independent of system Python
# =============================================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "HTML TO PAGELESS PDF CONVERTER - DEPENDENCY INSTALLATION" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[INFO] Python installation found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python 3.7 or higher" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Create local library directory if it doesn't exist
if (!(Test-Path "01__LocalScope__ExternalCodeLibraries")) {
    Write-Host "[INFO] Creating local library directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path "01__LocalScope__ExternalCodeLibraries" | Out-Null
}

Write-Host "[INFO] Installing required dependencies to local folder..." -ForegroundColor Yellow
Write-Host ""

# Install Pillow for image processing
Write-Host "[1/3] Installing Pillow (image processing)..." -ForegroundColor Cyan
python -m pip install pillow --target ./01__LocalScope__ExternalCodeLibraries --upgrade
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install Pillow" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Install ReportLab for PDF generation
Write-Host "[2/3] Installing ReportLab (PDF generation)..." -ForegroundColor Cyan
python -m pip install reportlab --target ./01__LocalScope__ExternalCodeLibraries --upgrade
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install ReportLab" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Install Playwright for HTML rendering
Write-Host "[3/3] Installing Playwright (HTML rendering)..." -ForegroundColor Cyan
python -m pip install playwright --target ./01__LocalScope__ExternalCodeLibraries --upgrade
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install Playwright" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[INFO] Installing Playwright browser (Chromium)..." -ForegroundColor Yellow
python -m playwright install chromium
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Could not install Chromium browser" -ForegroundColor Yellow
    Write-Host "         You can install it manually later from the GUI" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "INSTALLATION COMPLETE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "All dependencies have been installed to:" -ForegroundColor Green
Write-Host "  ./01__LocalScope__ExternalCodeLibraries/" -ForegroundColor White
Write-Host ""
Write-Host "You can now run the HTML to PDF converter:" -ForegroundColor Green
Write-Host "  python Py_PdfUtils__HtmlToPagelessPdfConverter__Main__.py" -ForegroundColor White
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

Read-Host "Press Enter to exit"
