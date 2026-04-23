@echo off
REM ============================================================================
REM INSTALL_DEPENDENCIES.bat
REM ============================================================================
REM Installs each exterior Python package into its own isolated subfolder inside
REM 00__ThirdParty__VersionLockedDependencies so the tool stays portable.
REM
REM After the Ghostscript-free OCR refactor, PyMuPDF is the ONLY Python package
REM this app needs. OCR is performed by calling tesseract.exe directly via
REM subprocess - no ocrmypdf / pdfplumber / Pillow / pdfminer bundles required.
REM ============================================================================

setlocal
set "PROJECT_ROOT=%~dp0"
set "DEPS=%PROJECT_ROOT%00__ThirdParty__VersionLockedDependencies"

echo.
echo === Installing PyMuPDF ==========================================
python -m pip install --upgrade --target "%DEPS%\00__PyMuPDF__PythonPackage__" "PyMuPDF==1.24.10"
if errorlevel 1 goto :error

echo.
echo All dependencies installed successfully.
echo Remember: OCR also needs Tesseract-OCR installed (auto-detected at
echo Program Files / Program Files (x86) / %%LOCALAPPDATA%%\Programs\Tesseract-OCR).
echo.
endlocal
exit /b 0

:error
echo.
echo [ERROR] Dependency installation failed. See messages above.
endlocal
exit /b 1
