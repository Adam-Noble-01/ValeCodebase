@echo off
REM =============================================================================
REM VALE DESIGN SUITE - HATCH EDITOR TOOL SERVER STARTER
REM =============================================================================
REM
REM PURPOSE    : Start local development server for Hatch Editor Tool
REM AUTHOR     : Generated for Vale Design Suite
REM CREATED    : 2025
REM
REM USAGE      : Double-click this file to start the server
REM
REM =============================================================================

echo.
echo =============================================================================
echo VALE DESIGN SUITE - HATCH EDITOR TOOL SERVER
echo =============================================================================
echo.
echo Starting local development server...
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://python.org
    echo.
    pause
    exit /b 1
)

REM Start the server
echo Server will be available at: http://localhost:8000
echo Press Ctrl+C to stop the server
echo.
python local_server.py

pause 