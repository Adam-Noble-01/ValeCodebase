@echo off
:: =============================================================================
:: VALEVISION3D - EMAIL WORKER - DEPLOY
:: =============================================================================
::
:: Runs the master build & deploy pipeline:
::   - Re-encrypts address book if contacts changed
::   - Syncs the AES key to all six locations
::   - Deploys the Cloudflare Worker via wrangler
::   - Commits and pushes changed files to GitHub
::
:: To force re-encryption regardless of contact changes:
::   python "..\Na__EmailSystem__BuildAndDeploy__.py.--HIDDEN" --force-encrypt
::
:: To deploy Worker code changes only (contacts unchanged):
::   python "..\Na__EmailSystem__BuildAndDeploy__.py.--HIDDEN" --skip-encrypt
::
:: To push ALL secrets from .dev.vars to Cloudflare (first-time setup):
::   python "..\Na__EmailSystem__BuildAndDeploy__.py.--HIDDEN" --update-all-secrets
::
:: See the master script header for full flag reference.
::
:: =============================================================================

cd /d "%~dp0"

python "..\Na__EmailSystem__BuildAndDeploy__.py.--HIDDEN" %*

pause
