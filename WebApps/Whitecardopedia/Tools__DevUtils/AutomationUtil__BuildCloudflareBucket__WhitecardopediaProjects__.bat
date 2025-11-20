@echo off
REM =============================================================================
REM WHITECARDOPEDIA - CLOUDFLARE R2 GLB MODEL SYNC UTILITY LAUNCHER
REM =============================================================================
REM
REM FILE       : AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__.bat
REM NAMESPACE  : Whitecardopedia
REM MODULE     : Cloudflare R2 Sync Utility Launcher
REM AUTHOR     : Adam Noble - Noble Architecture
REM PURPOSE    : Windows batch launcher for Cloudflare R2 GLB sync utility
REM CREATED    : 2025
REM
REM DESCRIPTION:
REM - Launches the Cloudflare R2 GLB model sync utility
REM - Ensures Python environment is available
REM - Provides user-friendly error messages
REM
REM =============================================================================

echo.
echo ===============================================================================
echo  WHITECARDOPEDIA - CLOUDFLARE R2 GLB MODEL SYNC UTILITY
echo ===============================================================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo.
    echo Please install Python 3.8 or later from:
    echo https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

REM Check if required dependencies are installed
echo [CHECK] Verifying Python dependencies...
python -c "import boto3, dotenv" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Required Python packages not found
    echo.
    echo Installing required packages: boto3, python-dotenv
    echo.
    pip install boto3 python-dotenv
    echo.
)

REM Run the Python script
echo [RUN] Starting Cloudflare R2 GLB Model Sync Utility...
echo.
python AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__Main__.py %*

echo.
echo ===============================================================================
echo  SCRIPT EXECUTION COMPLETE
echo ===============================================================================
echo.
pause

