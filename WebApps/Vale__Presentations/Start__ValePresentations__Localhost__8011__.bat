@echo off
setlocal
cd /d "%~dp0"
echo =============================================================================
echo  VALE PRESENTATIONS - LOCALHOST STARTER
echo =============================================================================
echo  Serving  : %~dp0
echo  Opening  : http://127.0.0.1:8011/
echo =============================================================================

where py >nul 2>nul
if %ERRORLEVEL%==0 (
    py ValePresentations__LocalServer__Localhost__.py --port 8011 --open
) else (
    where python >nul 2>nul
    if %ERRORLEVEL%==0 (
        python ValePresentations__LocalServer__Localhost__.py --port 8011 --open
    ) else (
        echo.
        echo [ERROR] No Python interpreter found on PATH.
        echo         Install Python 3 and make sure "py" or "python" resolves.
        pause
        exit /b 1
    )
)

set "Na__ServerExitCode=%ERRORLEVEL%"
if not "%Na__ServerExitCode%"=="0" (
    echo.
    echo [WARNING] The Vale Presentations server exited with code %Na__ServerExitCode%.
    pause
)

endlocal & exit /b %Na__ServerExitCode%
