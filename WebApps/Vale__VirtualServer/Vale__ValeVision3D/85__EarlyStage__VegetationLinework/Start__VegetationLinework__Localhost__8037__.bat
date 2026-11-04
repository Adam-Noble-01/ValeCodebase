@echo off
setlocal
cd /d "%~dp0"
echo =============================================================================
echo  VALEVISION 3D - VEGETATION LINEWORK PROTOTYPE
echo =============================================================================
echo  Serves the isolated demo on http://127.0.0.1:8037 and opens it. Read only:
echo  nothing here writes to a project. Close this window to stop it.
echo =============================================================================

python "Na__VegLine__LocalServer__.py" 8037 --open
if errorlevel 1 pause
