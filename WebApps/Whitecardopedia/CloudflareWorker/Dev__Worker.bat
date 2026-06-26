@echo off
:: =============================================================================
:: WHITECARDOPEDIA - START EDITOR API WORKER IN LOCAL DEV MODE
:: =============================================================================
:: Worker runs at http://127.0.0.1:8787
:: Configure EDITOR_WORKER_URL in Token__CloudflareAPI.env to point here:
::   EDITOR_WORKER_URL=http://127.0.0.1:8787/api/editor
:: =============================================================================
cd /d "%~dp0"
echo.
echo  Starting whitecardopedia-editor-api in dev mode on port 8787...
echo  Worker URL: http://127.0.0.1:8787
echo.
npx wrangler dev --port 8787
pause
