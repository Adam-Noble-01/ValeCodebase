@echo off
REM =============================================================================
REM PEN & WASH WATERCOLOR EFFECTS - LOCAL DEVELOPMENT SERVER LAUNCHER
REM =============================================================================
REM
REM FILE       : start_server.bat
REM AUTHOR     : Adam Noble - Noble Architecture
REM PURPOSE    : Launch local HTTP server for Pen & Wash Watercolor Effects
REM CREATED    : 2025
REM
REM DESCRIPTION:
REM - Automatically starts Python HTTP server on port 8001
REM - Opens default browser to testing environment
REM - Press Ctrl+C to stop server
REM
REM =============================================================================

echo.
echo ========================================================================
echo  PEN ^& WASH WATERCOLOR EFFECTS - HTTP DEVELOPMENT SERVER
echo ========================================================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Python is not installed or not in PATH
    echo  Please install Python or add it to your system PATH
    echo.
    echo ========================================================================
    echo.
    pause
    exit /b 1
)

echo  Starting HTTP server on port 8001...
echo  Application will be available at: http://localhost:8001
echo.
echo  Press Ctrl+C to stop the server
echo.
echo ========================================================================
echo.

REM Start HTTP development server
python server.py

if errorlevel 1 (
    echo.
    echo ========================================================================
    echo  Server failed to start. Check error messages above.
    echo ========================================================================
    echo.
)

pause

