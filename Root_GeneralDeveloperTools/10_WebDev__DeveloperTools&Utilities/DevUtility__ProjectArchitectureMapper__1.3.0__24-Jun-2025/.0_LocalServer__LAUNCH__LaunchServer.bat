@echo off
REM =============================================================================
REM VALEDESIGNSUITE - PROJECT ARCHITECTURE MAPPER SERVER LAUNCHER
REM =============================================================================
REM
REM FILE       : launch_server.bat
REM NAMESPACE  : ProjectArchitectureMapper
REM MODULE     : ServerLauncher
REM AUTHOR     : Adam Noble - Noble Architecture
REM PURPOSE    : Windows Batch Launcher for Flask Server
REM CREATED    : 2025
REM
REM DESCRIPTION:
REM - Windows batch file to launch the Flask server
REM - Checks Python installation and dependencies
REM - Provides clear error messages and instructions
REM - Opens browser automatically when server starts
REM
REM -----------------------------------------------------------------------------
REM
REM DEVELOPMENT LOG:
REM 2025 - Version 1.0.0
REM - Initial Windows batch launcher implementation
REM - Dependency checking and automatic browser launch
REM
REM =============================================================================

echo.
echo =============================================================================
echo VALEDESIGNSUITE - PROJECT ARCHITECTURE MAPPER SERVER
echo =============================================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://python.org
    echo.
    pause
    exit /b 1
)

echo Python installation found.
echo.

REM Check if requirements.txt exists and install dependencies
if exist requirements.txt (
    echo Installing/updating dependencies...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        echo Please check your pip installation
        echo.
        pause
        exit /b 1
    )
    echo Dependencies installed successfully.
    echo.
) else (
    echo WARNING: requirements.txt not found, installing Flask directly...
    pip install flask
    if errorlevel 1 (
        echo ERROR: Failed to install Flask
        echo.
        pause
        exit /b 1
    )
    echo Flask installed successfully.
    echo.
)

REM Check if the Flask server file exists
if not exist "LocalServer__LaunchFlaskServer.py" (
    echo ERROR: LocalServer__LaunchFlaskServer.py not found
    echo Please ensure you are in the correct directory
    echo.
    pause
    exit /b 1
)

echo Starting Flask server...
echo.
echo Server will be available at: http://localhost:5000
echo Press Ctrl+C to stop the server
echo.

REM Launch the Flask server
python "LocalServer__LaunchFlaskServer.py"

REM If we get here, the server has stopped
echo.
echo Server stopped.
pause 