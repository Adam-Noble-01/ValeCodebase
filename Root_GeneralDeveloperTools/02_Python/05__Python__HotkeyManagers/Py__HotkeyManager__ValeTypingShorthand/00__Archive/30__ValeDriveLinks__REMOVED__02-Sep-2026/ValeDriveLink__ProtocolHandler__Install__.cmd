@echo off
REM =============================================================================
REM VALEDESIGNSUITE - VALE DRIVE LINK PROTOCOL HANDLER - ONE CLICK INSTALLER
REM =============================================================================
REM
REM FILE       : ValeDriveLink__ProtocolHandler__Install__.cmd
REM AUTHOR     : Adam Noble - Noble Architecture
REM PURPOSE    : Double click wrapper around the PowerShell registration script
REM CREATED    : 02-Sep-2026
REM
REM DESCRIPTION:
REM - Registers the valefile URI scheme for the person currently logged on.
REM - No administrator rights are needed and nothing is installed system wide.
REM - Safe to run more than once. Re-running simply refreshes the registration.
REM
REM USAGE:
REM - Double click this file, then click OK on the confirmation.
REM - To remove it again, double click ValeDriveLink__ProtocolHandler__Remove__.cmd
REM
REM =============================================================================

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0ValeDriveLink__ProtocolHandler__Install__.ps1"
