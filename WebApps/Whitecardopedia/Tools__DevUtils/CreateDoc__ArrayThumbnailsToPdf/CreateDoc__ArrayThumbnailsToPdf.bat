@echo off
REM =============================================================================
REM WHITECARDOPEDIA - THUMBNAIL PDF GENERATOR LAUNCHER
REM =============================================================================
REM
REM FILE       : CreateDoc__ArrayThumbnailsToPdf.bat
REM PURPOSE    : Launch the Thumbnail PDF Generator utility
REM AUTHOR     : Adam Noble - Noble Architecture
REM
REM =============================================================================

echo.
echo ============================================================
echo   Whitecardopedia - Thumbnail PDF Generator
echo ============================================================
echo.

REM Navigate to script directory
cd /d "%~dp0"

REM Run Python script
python CreateDoc__ArrayThumbnailsToPdf__Main__.py

REM Pause to see output if run directly
if "%1"=="" pause
