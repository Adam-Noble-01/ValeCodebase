@echo off
REM =============================================================================
REM VALEDESIGNSUITE - VALE DRIVE LINK PROTOCOL HANDLER - UNINSTALLER
REM =============================================================================
REM
REM FILE       : ValeDriveLink__ProtocolHandler__Remove__.cmd
REM AUTHOR     : Adam Noble - Noble Architecture
REM PURPOSE    : Double click wrapper that removes the valefile URI scheme
REM CREATED    : 02-Sep-2026
REM
REM DESCRIPTION:
REM - Deletes the per user valefile registration created by the installer.
REM - Existing valefile links in old emails simply stop being clickable.
REM - Nothing else on the computer is changed.
REM
REM =============================================================================

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0ValeDriveLink__ProtocolHandler__Install__.ps1" -Uninstall
