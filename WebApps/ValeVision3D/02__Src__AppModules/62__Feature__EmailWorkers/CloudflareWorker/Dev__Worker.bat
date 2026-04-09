@echo off
:: =============================================================================
:: VALEVISION3D - EMAIL WORKER - LOCAL DEV SERVER
:: =============================================================================
::
:: Starts the Wrangler local dev server at http://127.0.0.1:8787
:: Uses secrets from .dev.vars automatically.
::
:: USAGE:
::   Double-click this file, or run from terminal:
::     Dev__Worker.bat
::
:: =============================================================================

cd /d "%~dp0"

echo.
echo ============================================================
echo   ValeVision3D Email Worker - Local Dev
echo   http://127.0.0.1:8787
echo ============================================================
echo.

call npx wrangler dev

pause
