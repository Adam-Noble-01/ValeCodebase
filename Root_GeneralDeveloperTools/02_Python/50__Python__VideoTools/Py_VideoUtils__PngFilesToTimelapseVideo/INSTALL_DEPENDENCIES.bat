@echo off
echo ==========================================
echo  PNG/JPG TO TIMELAPSE - DEPENDENCY SETUP
echo ==========================================
echo.
echo This will download all required Python packages
echo to the LocalScope__ExternalCodeDependencies folder.
echo.
echo Press any key to start the download...
pause > nul

REM Run the PowerShell script with execution policy bypass
powershell -ExecutionPolicy Bypass -File "%~dp0Download_Dependencies.ps1"

echo.
echo ==========================================
echo Setup complete! You can now run the Python script.
echo ==========================================
pause
