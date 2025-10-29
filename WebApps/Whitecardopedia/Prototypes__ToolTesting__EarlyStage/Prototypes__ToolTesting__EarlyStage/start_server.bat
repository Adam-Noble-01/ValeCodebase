@echo off
REM =============================================================================
REM VALEDESIGNSUITE - LOCAL WEB SERVER LAUNCHER (WINDOWS)
REM =============================================================================
REM
REM FILE       : start_server.bat
REM AUTHOR     : Adam Noble - Noble Architecture
REM PURPOSE    : Windows batch script to launch Artist Timeline Visualizer
REM CREATED    : 24-Oct-2025
REM
REM DESCRIPTION:
REM - Simple double-click launcher for Windows users
REM - Starts Python HTTP server and opens browser automatically
REM - Press CTRL+C to stop the server
REM
REM =============================================================================

echo.
echo ========================================================================
echo VALE DESIGN SUITE - ARTIST TIMELINE VISUALIZER
echo ========================================================================
echo.

REM Try to start with Python 3 first, then fall back to Python 2
python start_server.py
if errorlevel 1 (
    echo.
    echo Python not found or error occurred.
    echo Please ensure Python is installed and added to your PATH.
    echo.
    pause
)

