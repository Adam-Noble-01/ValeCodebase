@echo off
REM =============================================================================
REM VALEDESIGNSUITE - INVISIBLE LAUNCHER FOR VALE TYPING SHORTHAND
REM =============================================================================
REM
REM FILE       : Launch__ValeTypingShorthand__Invisible__.bat
REM AUTHOR     : Adam Noble - Noble Architecture
REM PURPOSE    : Launch Vale Typing Shorthand invisibly using pythonw.exe
REM CREATED    : 05-Dec-2025
REM
REM DESCRIPTION:
REM - This batch file launches the Vale Typing Shorthand hotkey manager.
REM - Uses pythonw.exe to ensure no console window appears.
REM - Note: The .vbs launcher is recommended for truly invisible startup.
REM - This batch file may briefly flash a window on some systems.
REM
REM USAGE:
REM - Double-click to run, or place shortcut in shell:startup
REM - For best results, use the .vbs launcher instead
REM
REM =============================================================================

REM Get the directory where this batch file is located
cd /d "%~dp0"

REM Launch Python script using pythonw.exe (windowless Python)
REM The "start" command with empty title and /b flag runs in background
start "" /b pythonw.exe "Py__HotkeyManager__ValeTypingShorthand__Main__.py"

