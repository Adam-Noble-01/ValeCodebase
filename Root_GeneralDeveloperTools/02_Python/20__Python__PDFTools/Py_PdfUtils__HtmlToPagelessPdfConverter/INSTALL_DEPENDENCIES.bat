@echo off
REM =============================================================================
REM HTML to Pageless PDF Converter - Dependency Installation Script
REM =============================================================================
REM This script installs all required dependencies to the local folder
REM to keep the application portable and independent of system Python
REM =============================================================================

echo.
echo ============================================================
echo HTML TO PAGELESS PDF CONVERTER - DEPENDENCY INSTALLATION
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.7 or higher
    pause
    exit /b 1
)

echo [INFO] Python installation found
python --version
echo.

REM Create local library directory if it doesn't exist
if not exist "01__LocalScope__ExternalCodeLibraries" (
    echo [INFO] Creating local library directory...
    mkdir "01__LocalScope__ExternalCodeLibraries"
)

echo [INFO] Installing required dependencies to local folder...
echo.

REM Install Pillow for image processing
echo [1/3] Installing Pillow (image processing)...
python -m pip install pillow --target ./01__LocalScope__ExternalCodeLibraries --upgrade
if errorlevel 1 (
    echo [ERROR] Failed to install Pillow
    pause
    exit /b 1
)

echo.
REM Install ReportLab for PDF generation
echo [2/3] Installing ReportLab (PDF generation)...
python -m pip install reportlab --target ./01__LocalScope__ExternalCodeLibraries --upgrade
if errorlevel 1 (
    echo [ERROR] Failed to install ReportLab
    pause
    exit /b 1
)

echo.
REM Install Playwright for HTML rendering
echo [3/3] Installing Playwright (HTML rendering)...
python -m pip install playwright --target ./01__LocalScope__ExternalCodeLibraries --upgrade
if errorlevel 1 (
    echo [ERROR] Failed to install Playwright
    pause
    exit /b 1
)

echo.
echo [INFO] Installing Playwright browser (Chromium)...
python -m playwright install chromium
if errorlevel 1 (
    echo [WARNING] Could not install Chromium browser
    echo          You can install it manually later from the GUI
)

echo.
echo ============================================================
echo INSTALLATION COMPLETE
echo ============================================================
echo.
echo All dependencies have been installed to:
echo   ./01__LocalScope__ExternalCodeLibraries/
echo.
echo You can now run the HTML to PDF converter:
echo   python Py_PdfUtils__HtmlToPagelessPdfConverter__Main__.py
echo.
echo ============================================================
echo.

pause
