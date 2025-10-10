@echo off
REM =============================================================================
REM WHITECARDOPEDIA - LOCAL DEVELOPMENT SERVER LAUNCHER
REM =============================================================================
REM
REM FILE       : start_server.bat
REM AUTHOR     : Adam Noble - Noble Architecture
REM PURPOSE    : Launch local HTTP server for Whitecardopedia development
REM CREATED    : 2025
REM
REM DESCRIPTION:
REM - Automatically starts Python HTTP server on port 8000
REM - Opens default browser to Whitecardopedia application
REM - Press Ctrl+C to stop server
REM
REM =============================================================================

echo.
echo ========================================================================
echo  WHITECARDOPEDIA - LOCAL DEVELOPMENT SERVER
echo ========================================================================
echo.
echo  Starting Python HTTP server on port 8000...
echo  Application will be available at: http://localhost:8000
echo.
echo  Press Ctrl+C to stop the server
echo.
echo ========================================================================
echo.

REM Start Python HTTP server
python -m http.server 8000

pause

