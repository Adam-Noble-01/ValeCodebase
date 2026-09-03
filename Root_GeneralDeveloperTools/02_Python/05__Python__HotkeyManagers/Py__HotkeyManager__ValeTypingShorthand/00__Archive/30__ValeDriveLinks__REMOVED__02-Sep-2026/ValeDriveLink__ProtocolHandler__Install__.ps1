# =============================================================================
# VALEDESIGNSUITE - VALE DRIVE LINK PROTOCOL HANDLER INSTALLER
# =============================================================================
#
# FILE       : ValeDriveLink__ProtocolHandler__Install__.ps1
# NAMESPACE  : ValeDriveLink
# MODULE     : ProtocolHandler
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Register the valefile URI scheme for the current user
# CREATED    : 02-Sep-2026
#
# DESCRIPTION:
# - Registers a custom "valefile" URI scheme under HKEY_CURRENT_USER.
# - No administrator rights are required and no machine wide keys are touched.
# - Once registered, valefile links become clickable in Outlook on the web,
#   New Outlook for Windows, Outlook Classic, Teams and any browser.
# - The registered command points back at the launcher script sitting beside
#   this installer, so the whole folder can be published to the N drive and
#   run in place by every member of staff.
#
# USAGE:
# - Double click ValeDriveLink__ProtocolHandler__Install__.cmd
# - Or run:  powershell -ExecutionPolicy Bypass -File "<this file>"
# - Pass -Quiet to suppress the confirmation dialog for scripted rollout.
# - Pass -Uninstall to remove the registration again.
#
# =============================================================================

param(
    [switch] $Uninstall,                                                       # <-- Remove the registration instead of adding it
    [switch] $Quiet                                                            # <-- Suppress the confirmation dialog
)

# -----------------------------------------------------------------------------
# REGION | Script Constants and Path Resolution
# -----------------------------------------------------------------------------

    # MODULE CONSTANTS | Registration Targets
    # ------------------------------------------------------------
$ScriptRoot        = Split-Path -Parent $MyInvocation.MyCommand.Path            # <-- Folder containing this installer
$SchemeName        = 'valefile'                                                 # <-- Custom URI scheme being registered
$LauncherFileName  = 'ValeDriveLink__ProtocolHandler__Launcher__.ps1'           # <-- Launcher invoked by the scheme
$RegistryRoot      = "HKCU:\Software\Classes\$SchemeName"                       # <-- Per user class registration root
    # ---------------------------------------------------------------

    # FUNCTION | Report Progress to the User
    # ------------------------------------------------------------
function Write-InstallerMessage {
    param(
        [string] $Message,                                                      # <-- Body text shown to the user
        [string] $Title = 'Vale Drive Link Setup',                              # <-- Dialog caption
        [switch] $IsError                                                       # <-- Render as a warning dialog
    )

    Write-Output $Message                                                       # <-- Always emit to stdout for scripted runs

    if ($Quiet) { return }                                                      # <-- Skip the dialog in quiet mode

    try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop           # <-- Load WinForms for the dialog
        $icon = if ($IsError) {
            [System.Windows.Forms.MessageBoxIcon]::Warning
        } else {
            [System.Windows.Forms.MessageBoxIcon]::Information
        }
        [void][System.Windows.Forms.MessageBox]::Show(
            $Message,
            $Title,
            [System.Windows.Forms.MessageBoxButtons]::OK,
            $icon
        )
    } catch {
        # Console output above is sufficient when WinForms is unavailable
    }
}
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Uninstall Path
# -----------------------------------------------------------------------------

if ($Uninstall) {
    if (Test-Path -LiteralPath $RegistryRoot) {                                 # <-- Only remove when actually present
        Remove-Item -LiteralPath $RegistryRoot -Recurse -Force
        Write-InstallerMessage -Message "The valefile link handler has been removed from this computer."
    } else {
        Write-InstallerMessage -Message "The valefile link handler was not registered on this computer."
    }
    exit 0
}

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Install Path
# -----------------------------------------------------------------------------

    # VALIDATION | Confirm the Launcher Script Is Present
    # ------------------------------------------------------------
$launcherPath = Join-Path $ScriptRoot $LauncherFileName                         # <-- Absolute path to the launcher script

if (-not (Test-Path -LiteralPath $launcherPath)) {                              # <-- Refuse to register a missing target
    Write-InstallerMessage -IsError -Message ("Setup could not continue." + [Environment]::NewLine + [Environment]::NewLine + "The launcher script is missing from:" + [Environment]::NewLine + $ScriptRoot)
    exit 1
}
    # ---------------------------------------------------------------

    # BUILD | Compose the Shell Open Command
    # ------------------------------------------------------------
$powerShellExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'   # <-- Full path to Windows PowerShell

$openCommand = '"' + $powerShellExe + '"' +
               ' -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden' +
               ' -File "' + $launcherPath + '" "%1"'                            # <-- URI is substituted into %1 by the shell
    # ---------------------------------------------------------------

    # WRITE | Create the Per User Scheme Registration
    # ------------------------------------------------------------
try {
    New-Item -Path $RegistryRoot -Force | Out-Null                              # <-- Create the scheme root key
    New-ItemProperty -Path $RegistryRoot -Name '(Default)'    -Value 'URL:Vale Drive Link' -PropertyType String -Force | Out-Null
    New-ItemProperty -Path $RegistryRoot -Name 'URL Protocol' -Value ''                     -PropertyType String -Force | Out-Null

    New-Item -Path "$RegistryRoot\DefaultIcon" -Force | Out-Null                # <-- Give the scheme an Explorer icon
    New-ItemProperty -Path "$RegistryRoot\DefaultIcon" -Name '(Default)' -Value 'explorer.exe,0' -PropertyType String -Force | Out-Null

    New-Item -Path "$RegistryRoot\shell\open\command" -Force | Out-Null         # <-- Create the open verb command key
    New-ItemProperty -Path "$RegistryRoot\shell\open\command" -Name '(Default)' -Value $openCommand -PropertyType String -Force | Out-Null
}
catch {
    Write-InstallerMessage -IsError -Message ("Setup failed while writing to the registry." + [Environment]::NewLine + [Environment]::NewLine + $_.Exception.Message)
    exit 1
}
    # ---------------------------------------------------------------

    # REPORT | Confirm Successful Registration
    # ------------------------------------------------------------
$summary = "Vale drive links are now active on this computer." + [Environment]::NewLine + [Environment]::NewLine +
           "Links beginning valefile: in emails, Teams messages and web pages will open the matching folder or file on the Vale server." + [Environment]::NewLine + [Environment]::NewLine +
           "The first time you click one, your browser or Outlook will ask for permission to open it. Tick the box to always allow it and you will not be asked again." + [Environment]::NewLine + [Environment]::NewLine +
           "Handler location:" + [Environment]::NewLine + $launcherPath

Write-InstallerMessage -Message $summary
exit 0

# endregion -------------------------------------------------------------------
