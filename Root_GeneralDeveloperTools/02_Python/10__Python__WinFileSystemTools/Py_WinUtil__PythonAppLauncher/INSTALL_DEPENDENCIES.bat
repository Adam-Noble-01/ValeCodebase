@echo off
REM ============================================================================
REM INSTALL_DEPENDENCIES.bat
REM ============================================================================
REM Installs the two external Python packages needed for the Python App Launcher
REM into their own isolated subfolders inside
REM 00__ThirdParty__VersionLockedDependencies so the tool stays portable and
REM never pollutes the user's site-packages.
REM
REM Packages:
REM   - pystray  : Windows system-tray icon with context menu
REM   - Pillow   : PIL.Image to load the Noble Arch logo and hand it to pystray
REM
REM Everything else the launcher needs (tkinter, pathlib, subprocess, json,
REM logging, threading, dataclasses, msvcrt) is standard library.
REM ============================================================================

setlocal
set "PROJECT_ROOT=%~dp0"
set "DEPS=%PROJECT_ROOT%00__ThirdParty__VersionLockedDependencies"

echo.
echo === Installing pystray ==========================================
python -m pip install --upgrade --target "%DEPS%\00__PyStray__PythonPackage__" "pystray==0.19.5"
if errorlevel 1 goto :error

echo.
echo === Installing Pillow ===========================================
python -m pip install --upgrade --target "%DEPS%\01__Pillow__PythonPackage__" "Pillow==10.4.0"
if errorlevel 1 goto :error

echo.
echo All dependencies installed successfully.
echo.
echo NEXT STEPS:
echo   - Run Start__PythonAppLauncher__.ps1 for a dev launch (with console).
echo   - Or link Start__PythonAppLauncher__Silent__.vbs from shell:startup for a
echo     silent, no-console launch on Windows login.
echo.
endlocal
exit /b 0

:error
echo.
echo [ERROR] Dependency installation failed. See messages above.
endlocal
exit /b 1
