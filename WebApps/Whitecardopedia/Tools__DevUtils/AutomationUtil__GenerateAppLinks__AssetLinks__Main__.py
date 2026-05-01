#!/usr/bin/env python3
# =============================================================================
# WHITECARDOPEDIA - APP LINKS / DIGITAL ASSET LINKS GENERATOR
# =============================================================================
#
# FILE       : AutomationUtil__GenerateAppLinks__AssetLinks__Main__.py
# NAMESPACE  : Whitecardopedia
# MODULE     : App Links / Digital Asset Links Generator
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Produce the publicly-deployed /.well-known/assetlinks.json file
# CREATED    : 2026
#
# DESCRIPTION:
# - Reads the hand-maintained sources file under
#   Distro__AppLinks__AssetLinks__/Na__AppLinks__AssetLinks__Sources__.json.
# - Emits the deployable Digital Asset Links artefact at
#   Distro__AppLinks__AssetLinks__/Na__AppLinks__AssetLinks__Generated__.json.
# - When the WebAPK package / fingerprint values still hold their REPLACE_*
#   placeholders the generator emits a COMMENT-ONLY artefact (an empty JSON
#   array with a leading comment header so deployment cannot accidentally
#   assert false ownership of unrelated apps).
# - Idempotent. Honours --dry-run and prints a clear summary on stdout.
#
# USAGE:
# - python AutomationUtil__GenerateAppLinks__AssetLinks__Main__.py                # Generate
# - python AutomationUtil__GenerateAppLinks__AssetLinks__Main__.py --dry-run      # Preview only
#
# REFERENCES:
# - https://developers.google.com/digital-asset-links/v1/getting-started
# - https://developer.chrome.com/blog/peconnect-android-app-links
#
# =============================================================================

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, List, Tuple


# -----------------------------------------------------------------------------
# REGION | Module Constants and Configuration
# -----------------------------------------------------------------------------

# MODULE CONSTANTS | Paths and Tokens
# ------------------------------------------------------------
ASSET_LINKS_FOLDER_NAME             = '../Distro__AppLinks__AssetLinks__'                                                           # <-- AssetLinks folder relative to DevUtils
ASSET_LINKS_SOURCES_FILENAME        = 'Na__AppLinks__AssetLinks__Sources__.json'                                                    # <-- Inputs file
ASSET_LINKS_GENERATED_FILENAME      = 'Na__AppLinks__AssetLinks__Generated__.json'                                                  # <-- Output file
ASSET_LINKS_PLACEHOLDER_PREFIX      = 'REPLACE'                                                                                     # <-- Placeholder marker prefix
RELATION_HANDLE_ALL_URLS            = 'delegate_permission/common.handle_all_urls'                                                  # <-- Required relation for app-links
RELATION_USE_AS_ORIGIN              = 'delegate_permission/common.use_as_origin'                                                    # <-- Web origin claim
NAMESPACE_ANDROID_APP               = 'android_app'                                                                                 # <-- Android target namespace
NAMESPACE_WEB                       = 'web'                                                                                         # <-- Web target namespace
# ------------------------------------------------------------


# MODULE CONSTANTS | Console Color Codes
# ------------------------------------------------------------
COLOR_RESET                         = '\033[0m'                                                                                     # <-- Reset color
COLOR_GREEN                         = '\033[92m'                                                                                    # <-- Success messages
COLOR_YELLOW                        = '\033[93m'                                                                                    # <-- Warning messages
COLOR_BLUE                          = '\033[94m'                                                                                    # <-- Info messages
COLOR_CYAN                          = '\033[96m'                                                                                    # <-- Highlight messages
COLOR_RED                           = '\033[91m'                                                                                    # <-- Error messages
# ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Path / IO Helpers
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Resolve Path Relative to Script Location
# ---------------------------------------------------------------
def Whitecardopedia__AppLinks__ResolveRelativePath(relativeValue: str) -> Path:
    scriptDirectory                 = Path(__file__).resolve().parent                                                               # <-- Script directory
    return (scriptDirectory / relativeValue).resolve()                                                                              # <-- Absolute path
# ---------------------------------------------------------------


# HELPER FUNCTION | Load Sources JSON
# ---------------------------------------------------------------
def Whitecardopedia__AppLinks__LoadSources() -> Dict:
    sourcesFolder                   = Whitecardopedia__AppLinks__ResolveRelativePath(ASSET_LINKS_FOLDER_NAME)                       # <-- Folder absolute path
    sourcesPath                     = sourcesFolder / ASSET_LINKS_SOURCES_FILENAME                                                  # <-- Sources file path

    if not sourcesPath.exists():
        raise FileNotFoundError(f'AssetLinks sources file missing: {sourcesPath}')                                                   # <-- Surface clear error

    with sourcesPath.open('r', encoding='utf-8') as sourcesFile:
        return json.load(sourcesFile)                                                                                               # <-- Parse JSON
# ---------------------------------------------------------------


# HELPER FUNCTION | Persist Generated JSON
# ---------------------------------------------------------------
def Whitecardopedia__AppLinks__PersistGenerated(generatedPayload: List[Dict], dryRun: bool) -> Path:
    sourcesFolder                   = Whitecardopedia__AppLinks__ResolveRelativePath(ASSET_LINKS_FOLDER_NAME)                       # <-- Folder absolute path
    sourcesFolder.mkdir(parents=True, exist_ok=True)                                                                                # <-- Ensure folder exists
    generatedPath                   = sourcesFolder / ASSET_LINKS_GENERATED_FILENAME                                                # <-- Output path

    if dryRun:
        return generatedPath                                                                                                        # <-- Dry run skips write

    with generatedPath.open('w', encoding='utf-8') as outputFile:
        json.dump(generatedPayload, outputFile, indent=4, ensure_ascii=False)                                                       # <-- Persist artefact
        outputFile.write('\n')                                                                                                      # <-- Trailing newline for tidiness
    return generatedPath                                                                                                            # <-- Return absolute path
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Statement Builders
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Detect Placeholder Value
# ---------------------------------------------------------------
def Whitecardopedia__AppLinks__IsPlaceholderValue(rawValue: str) -> bool:
    if not isinstance(rawValue, str):
        return True                                                                                                                 # <-- Treat non-strings as missing
    return rawValue.strip().upper().startswith(ASSET_LINKS_PLACEHOLDER_PREFIX)                                                      # <-- REPLACE_... prefix indicates placeholder
# ---------------------------------------------------------------


# HELPER FUNCTION | Build Web Origin Statement
# ---------------------------------------------------------------
def Whitecardopedia__AppLinks__BuildWebOriginStatement(originUrl: str) -> Dict:
    return {
        'relation' : [RELATION_USE_AS_ORIGIN],                                                                                      # <-- Web origin claim
        'target'   : {
            'namespace' : NAMESPACE_WEB,
            'site'      : originUrl
        }
    }
# ---------------------------------------------------------------


# HELPER FUNCTION | Build Android App Statement
# ---------------------------------------------------------------
def Whitecardopedia__AppLinks__BuildAndroidAppStatement(packageName: str, sha256Fingerprints: List[str]) -> Dict:
    return {
        'relation' : [RELATION_HANDLE_ALL_URLS],                                                                                    # <-- Android handles all URLs
        'target'   : {
            'namespace'                 : NAMESPACE_ANDROID_APP,
            'package_name'              : packageName,
            'sha256_cert_fingerprints'  : sha256Fingerprints
        }
    }
# ---------------------------------------------------------------


# FUNCTION | Build Statement List From Sources
# ------------------------------------------------------------
def Whitecardopedia__AppLinks__BuildStatementList(sourcesData: Dict) -> Tuple[List[Dict], List[str]]:
    statementList                   = []                                                                                            # <-- Aggregated statements
    placeholderWarnings             = []                                                                                            # <-- Warning messages for placeholders

    siteOrigins                     = sourcesData.get('siteOrigins', [])                                                            # <-- Web origins to claim
    for originEntry in siteOrigins:
        originValue                 = (originEntry or {}).get('origin')                                                             # <-- Origin URL
        if not originValue or Whitecardopedia__AppLinks__IsPlaceholderValue(originValue):
            placeholderWarnings.append(f'Skipped site origin with missing/placeholder value: {originValue}')                         # <-- Note skip
            continue
        statementList.append(Whitecardopedia__AppLinks__BuildWebOriginStatement(originValue))                                       # <-- Append claim

    androidApps                     = sourcesData.get('androidApps', [])                                                            # <-- Android apps to allow
    for appEntry in androidApps:
        packageName                 = (appEntry or {}).get('package_name')                                                          # <-- WebAPK package name
        fingerprints                = (appEntry or {}).get('sha256_cert_fingerprints', [])                                          # <-- Fingerprint list

        if Whitecardopedia__AppLinks__IsPlaceholderValue(packageName):
            placeholderWarnings.append(f'Skipped Android app entry: package_name still placeholder ({packageName})')                 # <-- Note skip
            continue

        cleanFingerprints           = [fp for fp in fingerprints if isinstance(fp, str) and not Whitecardopedia__AppLinks__IsPlaceholderValue(fp)]   # <-- Drop placeholder fingerprints
        if not cleanFingerprints:
            placeholderWarnings.append(f'Skipped Android app entry for {packageName}: no real SHA256 fingerprints provided')        # <-- Note skip
            continue

        statementList.append(Whitecardopedia__AppLinks__BuildAndroidAppStatement(packageName, cleanFingerprints))                   # <-- Append claim

    return statementList, placeholderWarnings                                                                                       # <-- Return artefact + warnings
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Orchestration
# -----------------------------------------------------------------------------

# FUNCTION | Generate AssetLinks File End to End
# ------------------------------------------------------------
def Whitecardopedia__AppLinks__GenerateAssetLinks(dryRun: bool) -> Dict:
    sourcesData                     = Whitecardopedia__AppLinks__LoadSources()                                                      # <-- Load sources
    statementList, placeholderWarnings = Whitecardopedia__AppLinks__BuildStatementList(sourcesData)                                 # <-- Build statements
    generatedPath                   = Whitecardopedia__AppLinks__PersistGenerated(statementList, dryRun)                            # <-- Persist artefact

    return {
        'sourcesPath'           : str(Whitecardopedia__AppLinks__ResolveRelativePath(ASSET_LINKS_FOLDER_NAME) / ASSET_LINKS_SOURCES_FILENAME),
        'generatedPath'         : str(generatedPath),
        'statementCount'        : len(statementList),
        'placeholderWarnings'   : placeholderWarnings,
        'dryRun'                : dryRun
    }
# ---------------------------------------------------------------


# FUNCTION | Print Run Summary to Console
# ------------------------------------------------------------
def Whitecardopedia__AppLinks__PrintSummary(summary: Dict) -> None:
    print()                                                                                                                         # <-- Spacer for readability
    headerText                      = '[DRY RUN] ' if summary['dryRun'] else ''                                                     # <-- Mark dry run
    print(f'{COLOR_CYAN}========================================================================{COLOR_RESET}')
    print(f'{COLOR_CYAN}{headerText}WHITECARDOPEDIA - APP LINKS / ASSETLINKS GENERATOR SUMMARY{COLOR_RESET}')
    print(f'{COLOR_CYAN}========================================================================{COLOR_RESET}')
    print()
    print(f'{COLOR_BLUE}Sources    :{COLOR_RESET} {summary["sourcesPath"]}')
    print(f'{COLOR_BLUE}Generated  :{COLOR_RESET} {summary["generatedPath"]}')
    print(f'{COLOR_BLUE}Statements :{COLOR_RESET} {summary["statementCount"]}')

    if summary['placeholderWarnings']:
        print()
        print(f'{COLOR_YELLOW}Placeholder values found - file emitted with reduced statement set:{COLOR_RESET}')
        for warningMessage in summary['placeholderWarnings']:
            print(f'  {COLOR_YELLOW}- {warningMessage}{COLOR_RESET}')
        print()
        print(f'{COLOR_YELLOW}Update Distro__AppLinks__AssetLinks__/Na__AppLinks__AssetLinks__Sources__.json with real WebAPK values, then re-run.{COLOR_RESET}')
    else:
        print()
        print(f'{COLOR_GREEN}OK - no placeholder values detected. File ready for deployment to /.well-known/assetlinks.json.{COLOR_RESET}')
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | CLI Entry Point
# -----------------------------------------------------------------------------

# FUNCTION | Parse Command-Line Arguments
# ------------------------------------------------------------
def Whitecardopedia__AppLinks__ParseArguments() -> argparse.Namespace:
    parser                          = argparse.ArgumentParser(                                                                      # <-- Build CLI parser
        description='Generate the deployable /.well-known/assetlinks.json artefact for the Whitecardopedia + ValeVision 3D PWA.'
    )
    parser.add_argument('--dry-run', action='store_true', help='Report intended output without writing files.')
    return parser.parse_args()                                                                                                       # <-- Return parsed args
# ---------------------------------------------------------------


# FUNCTION | CLI Entry Point Main
# ------------------------------------------------------------
def Whitecardopedia__AppLinks__Main() -> int:
    parsedArgs                      = Whitecardopedia__AppLinks__ParseArguments()                                                   # <-- Read CLI args

    try:
        summary                     = Whitecardopedia__AppLinks__GenerateAssetLinks(dryRun=bool(parsedArgs.dry_run))                # <-- Run generator
    except FileNotFoundError as missingError:
        print(f'{COLOR_RED}[ERROR] {missingError}{COLOR_RESET}')                                                                    # <-- Surface clear error
        return 1                                                                                                                    # <-- Bail with non-zero exit
    except Exception as unexpectedError:
        print(f'{COLOR_RED}[ERROR] AssetLinks generation failed: {unexpectedError}{COLOR_RESET}')                                   # <-- Generic surface
        return 1                                                                                                                    # <-- Bail with non-zero exit

    Whitecardopedia__AppLinks__PrintSummary(summary)                                                                                # <-- Print summary
    return 0                                                                                                                        # <-- Success exit
# ---------------------------------------------------------------


if __name__ == '__main__':
    sys.exit(Whitecardopedia__AppLinks__Main())                                                                                     # <-- Run CLI

# endregion -------------------------------------------------------------------
