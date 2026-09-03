# =============================================================================
# VALEDESIGNSUITE - VALE DRIVE LINK PROTOCOL LAUNCHER
# =============================================================================
#
# FILE       : ValeDriveLink__ProtocolHandler__Launcher__.ps1
# NAMESPACE  : ValeDriveLink
# MODULE     : ProtocolHandler
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Resolve a valefile:// URI to a company share path and open it
# CREATED    : 02-Sep-2026
#
# DESCRIPTION:
# - Registered as the shell open command for the custom "valefile" URI scheme.
# - Browsers and Outlook hand the full URI in as the first argument.
# - Converts valefile://vale-fs1/share/folder/file.ext back to a UNC path.
# - Refuses any host that is not on the allow list in the config file.
# - Folders open in Explorer, known document types open directly, and
#   everything else is revealed in Explorer rather than executed.
#
# SECURITY NOTES:
# - This script is reachable from any email or web page once installed, so it
#   deliberately does the least dangerous thing that is still useful.
# - The host allow list is the primary control: only the Vale file server is
#   ever touched, and only paths that already exist are acted on.
# - Unknown or executable file types are never launched. They are selected in
#   an Explorer window so the person decides whether to open them.
#
# =============================================================================

param(
    [Parameter(Position = 0)]
    [string] $Uri
)

# -----------------------------------------------------------------------------
# REGION | Script Constants and Configuration Loading
# -----------------------------------------------------------------------------

    # MODULE CONSTANTS | Fallback Configuration
    # ------------------------------------------------------------
$ScriptRoot           = Split-Path -Parent $MyInvocation.MyCommand.Path        # <-- Folder containing this launcher
$ConfigFileName       = 'ValeDriveLink__Config__.json'                         # <-- Shared config file name
$DefaultScheme        = 'valefile'                                             # <-- Fallback URI scheme name
$DefaultAllowedHosts  = @( 'vale-fs1' )                                        # <-- Fallback server allow list
    # ---------------------------------------------------------------

    # MODULE CONSTANTS | File Types Permitted To Open Directly
    # ------------------------------------------------------------
$DirectOpenExtensions = @(                                                     # <-- Everything else is revealed, not launched
    '.pdf',  '.mp4',  '.mov',  '.avi',  '.mkv',  '.webm',
    '.jpg',  '.jpeg', '.png',  '.gif',  '.bmp',  '.tif',  '.tiff', '.webp',
    '.doc',  '.docx', '.xls',  '.xlsx', '.ppt',  '.pptx',
    '.txt',  '.md',   '.csv',  '.rtf',
    '.dwg',  '.dxf',  '.skp',  '.3dm'
)
    # ---------------------------------------------------------------

    # FUNCTION | Show a Message Box Without Requiring a Console
    # ------------------------------------------------------------
function Show-LauncherMessage {
    param(
        [string] $Message,                                                     # <-- Body text shown to the user
        [string] $Title = 'Vale Drive Link'                                    # <-- Dialog caption
    )
    try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop          # <-- Load WinForms for the dialog
        [void][System.Windows.Forms.MessageBox]::Show(
            $Message,
            $Title,
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Warning
        )
    } catch {
        # Nothing further to do: the launcher runs with no console attached
    }
}
    # ---------------------------------------------------------------

    # FUNCTION | Load Allowed Hosts From the Shared Config File
    # ------------------------------------------------------------
function Get-AllowedHostList {
    $configPath = Join-Path $ScriptRoot $ConfigFileName                        # <-- Resolve config path beside this script

    if (-not (Test-Path -LiteralPath $configPath)) {                           # <-- Fall back when config is missing
        return $DefaultAllowedHosts
    }

    try {
        $config = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json   # <-- Parse config JSON
        if ($config.AllowedHosts -and $config.AllowedHosts.Count -gt 0) {       # <-- Use configured list when present
            return @($config.AllowedHosts | ForEach-Object { $_.ToString().ToLower() })
        }
    } catch {
        # Fall through to the built in default on any parse failure
    }

    return $DefaultAllowedHosts                                                # <-- Return fallback allow list
}
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | URI Parsing and Path Reconstruction
# -----------------------------------------------------------------------------

    # FUNCTION | Convert a valefile URI Into a UNC Path
    # ------------------------------------------------------------
function ConvertFrom-ValeFileUri {
    param(
        [string] $RawUri                                                       # <-- Full URI handed in by the shell
    )

    $trimmed = $RawUri.Trim().Trim('"')                                        # <-- Strip shell quoting and whitespace

    # Braces around the variable name are required here. Without them PowerShell
    # reads "$DefaultScheme:" as a scoped variable reference and fails to parse.
    if ($trimmed -notmatch "^(?i)${DefaultScheme}:") {                         # <-- Reject anything that is not our scheme
        return $null
    }

    $body = $trimmed -replace "^(?i)${DefaultScheme}:", ''                     # <-- Remove the scheme prefix
    $body = $body -replace '^/+', ''                                           # <-- Remove the leading authority slashes
    $body = $body -replace '/+$', ''                                           # <-- Remove any trailing slash

    if ([string]::IsNullOrWhiteSpace($body)) {                                 # <-- Reject an empty payload
        return $null
    }

    $decoded = [System.Uri]::UnescapeDataString($body)                         # <-- Percent decode spaces and symbols
    $decoded = $decoded -replace '/', '\'                                      # <-- Swap forward slashes for backslashes

    if ($decoded -match '\.\.') {                                              # <-- Reject any parent directory traversal
        return $null
    }

    return '\\' + $decoded                                                     # <-- Rebuild the full UNC path
}
    # ---------------------------------------------------------------

    # FUNCTION | Extract the Server Name From a UNC Path
    # ------------------------------------------------------------
function Get-UncHostName {
    param(
        [string] $UncPath                                                      # <-- Full UNC path
    )

    $withoutPrefix = $UncPath -replace '^\\\\', ''                             # <-- Drop the leading double backslash
    $segments      = $withoutPrefix -split '\\'                                # <-- Split into path segments

    if ($segments.Count -lt 1) {                                               # <-- Guard against malformed input
        return $null
    }

    return $segments[0].ToLower()                                              # <-- Return the server name in lower case
}
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Target Opening Logic
# -----------------------------------------------------------------------------

    # FUNCTION | Open a Resolved Target in the Safest Useful Way
    # ------------------------------------------------------------
function Open-ResolvedTarget {
    param(
        [string] $TargetPath                                                   # <-- Validated UNC path to open
    )

    if (Test-Path -LiteralPath $TargetPath -PathType Container) {              # <-- Folders open straight into Explorer
        Start-Process -FilePath 'explorer.exe' -ArgumentList ('"' + $TargetPath + '"')
        return
    }

    if (Test-Path -LiteralPath $TargetPath -PathType Leaf) {                   # <-- Files branch on their extension
        $extension = [System.IO.Path]::GetExtension($TargetPath).ToLower()     # <-- Normalise the extension for matching

        if ($DirectOpenExtensions -contains $extension) {                      # <-- Known document types open directly
            Start-Process -FilePath $TargetPath
        } else {                                                               # <-- Everything else is only revealed
            Start-Process -FilePath 'explorer.exe' -ArgumentList ('/select,"' + $TargetPath + '"')
        }
        return
    }

    Show-LauncherMessage -Message ("This location could not be found on the Vale server." + [Environment]::NewLine + [Environment]::NewLine + $TargetPath + [Environment]::NewLine + [Environment]::NewLine + "It may have been moved or renamed since the link was sent.")
}
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Main Entry Point
# -----------------------------------------------------------------------------

if ([string]::IsNullOrWhiteSpace($Uri)) {                                      # <-- Nothing handed in by the shell
    Show-LauncherMessage -Message 'No Vale drive link was supplied.'
    exit 1
}

$uncPath = ConvertFrom-ValeFileUri -RawUri $Uri                                # <-- Rebuild the UNC path from the URI

if (-not $uncPath) {                                                           # <-- Reject unparsable links
    Show-LauncherMessage -Message ('This Vale drive link could not be read.' + [Environment]::NewLine + [Environment]::NewLine + $Uri)
    exit 1
}

$allowedHosts = Get-AllowedHostList                                            # <-- Load the server allow list
$hostName     = Get-UncHostName -UncPath $uncPath                              # <-- Determine the target server

if (-not $hostName -or ($allowedHosts -notcontains $hostName)) {               # <-- Refuse any server outside the allow list
    Show-LauncherMessage -Message ('This link points at a server that is not on the approved Vale list, so it has been blocked.' + [Environment]::NewLine + [Environment]::NewLine + 'Server: ' + $hostName)
    exit 1
}

Open-ResolvedTarget -TargetPath $uncPath                                       # <-- Open, launch or reveal the target
exit 0

# endregion -------------------------------------------------------------------
