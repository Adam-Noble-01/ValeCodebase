@echo off
:: =============================================================================
:: WHITECARDOPEDIA - DEPLOY EDITOR API WORKER TO CLOUDFLARE
:: =============================================================================
cd /d "%~dp0"
echo.
echo  Deploying whitecardopedia-editor-api to Cloudflare Workers...
echo  Account: fb32e89aeb7dce82f8391f6496ec8b34
echo.
npx wrangler deploy
echo.
pause
