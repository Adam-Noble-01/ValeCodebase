@echo off
REM =============================================================================
REM WHITECARDOPEDIA - SILENT STARTUP LAUNCHER
REM =============================================================================
REM
REM FILE       : start_server__WindowsStartUp.bat
REM AUTHOR     : Adam Noble - Noble Architecture
REM PURPOSE    : Silent launcher for Whitecardopedia server on Windows startup
REM CREATED    : 2025
REM
REM DESCRIPTION:
REM - Launches start_server.bat silently in background (no visible window)
REM - Designed for Windows Startup folder to auto-start server on boot
REM - Uses PowerShell to run completely hidden
REM - Server will run on port 8000 at http://localhost:8000
REM
REM INSTALLATION:
REM - Press Win+R, type: shell:startup
REM - Create shortcut to this file in the Startup folder
REM - Server will auto-start on Windows boot
REM
REM TO STOP SERVER:
REM - Open Task Manager
REM - End "python.exe" process running server.py
REM
REM =============================================================================

REM Launch start_server.bat hidden using PowerShell
powershell -WindowStyle Hidden -Command "Start-Process -FilePath '%~dp0start_server.bat' -WindowStyle Hidden"

REM Exit immediately (don't wait)
exit

