@echo off
:: =============================================================================
:: VALEVISION3D - EMAIL WORKER - DEPLOY TO CLOUDFLARE
:: =============================================================================
::
:: Deploys the Cloudflare Worker and sets Wrangler secrets.
:: Run from any directory — the script resolves its own path.
::
:: USAGE:
::   Double-click this file, or run from terminal:
::     Deploy__Worker.bat
::
:: PREREQUISITES:
::   - Node.js installed
::   - npm packages installed (run `npm install` in CloudflareWorker/ first)
::
:: =============================================================================

cd /d "%~dp0"

:: Load Cloudflare API token from shared env file
for /f "tokens=1,2 delims==" %%A in ('findstr "CLOUDFLARE_WORKERS_API_TOKEN" "..\..\..\..\Whitecardopedia\Tools__DevUtils\API__Cloudflare\Token__CloudflareAPI.env"') do (
    set "CLOUDFLARE_API_TOKEN=%%B"
)

if "%CLOUDFLARE_API_TOKEN%"=="" (
    echo [ERROR] Could not load CLOUDFLARE_WORKERS_API_TOKEN from Token__CloudflareAPI.env
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   ValeVision3D Email Worker - Deploy
echo ============================================================
echo.

:: Step 1: Deploy the Worker code
echo [1/3] Deploying Worker to Cloudflare...
echo.
call npx wrangler deploy
if errorlevel 1 (
    echo.
    echo [ERROR] Worker deploy failed. Check output above.
    pause
    exit /b 1
)
echo.

:: Step 2: Set EMAIL_AUTH_PASSWORD secret (you will be prompted to enter the value)
echo [2/3] Setting EMAIL_AUTH_PASSWORD secret...
echo.
npx wrangler secret put EMAIL_AUTH_PASSWORD
if errorlevel 1 (
    echo.
    echo [WARN] Secret EMAIL_AUTH_PASSWORD may not have been set. Set manually:
    echo        npx wrangler secret put EMAIL_AUTH_PASSWORD
)
echo.

:: Step 3: Set EMAIL_AUTH_TOKEN_SECRET secret (you will be prompted to enter the value)
echo [3/3] Setting EMAIL_AUTH_TOKEN_SECRET secret...
echo.
npx wrangler secret put EMAIL_AUTH_TOKEN_SECRET
if errorlevel 1 (
    echo.
    echo [WARN] Secret EMAIL_AUTH_TOKEN_SECRET may not have been set. Set manually:
    echo        npx wrangler secret put EMAIL_AUTH_TOKEN_SECRET
)
echo.

echo ============================================================
echo   Deploy complete.
echo ============================================================
echo.
pause
