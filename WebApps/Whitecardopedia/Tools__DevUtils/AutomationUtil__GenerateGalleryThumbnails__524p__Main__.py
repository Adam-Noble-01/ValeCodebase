#!/usr/bin/env python3
# =============================================================================
# WHITECARDOPEDIA - GALLERY THUMBNAIL GENERATOR (524p)
# =============================================================================
#
# FILE       : AutomationUtil__GenerateGalleryThumbnails__524p__Main__.py
# NAMESPACE  : Whitecardopedia
# MODULE     : Gallery Thumbnail Generator
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Produce 524p WebP/JPG thumbnails for project gallery cards
# CREATED    : 2026
#
# DESCRIPTION:
# - Walks every project folder under `Projects/<year>/<projectFolder>/`.
# - Locates the first `IMG01__*` image in each folder.
# - Generates a 524p (long-edge) WebP thumbnail and JPG fallback alongside
#   the original.
# - Patches `project.json` with a `thumbnailImage` field referencing the new
#   WebP filename so the gallery loader can prefer the lighter asset.
# - Idempotent: skips work when the existing thumbnail is newer than the
#   source image and the project.json field is already populated.
# - Produces no thumbnails for blacklisted projects already excluded from
#   the master config (e.g. example / template projects).
#
# USAGE:
# - python AutomationUtil__GenerateGalleryThumbnails__524p__Main__.py                         # Process every project
# - python AutomationUtil__GenerateGalleryThumbnails__524p__Main__.py --dry-run               # Report only, do not write
# - python AutomationUtil__GenerateGalleryThumbnails__524p__Main__.py --project <folderId>    # Single project
# - python AutomationUtil__GenerateGalleryThumbnails__524p__Main__.py --force                 # Re-create thumbnails even if newer
#
# REQUIREMENTS:
# - Pillow (PIL fork). Install via `pip install pillow` if not already present.
#
# =============================================================================

import os
import sys
import re
import json
import argparse
from pathlib import Path
from typing import List, Dict, Optional, Tuple

try:
    from PIL import Image                                                                                                           # <-- Pillow image library
except ImportError:
    print('[ERROR] Pillow is required. Install with: pip install pillow')                                                            # <-- Friendly install hint
    raise


# -----------------------------------------------------------------------------
# REGION | Module Constants and Configuration
# -----------------------------------------------------------------------------

# MODULE CONSTANTS | Paths and File Patterns
# ------------------------------------------------------------
PROJECTS_BASE_FOLDER            = '../Projects'                                                                                     # <-- Projects root relative to DevUtils
MASTER_CONFIG_PATH              = '../02__Src__AppModules/03__AppData/Na__AppData__MasterConfig__Main.json'                          # <-- Master config relative path
PROJECT_JSON_FILENAME           = 'project.json'                                                                                    # <-- Project metadata filename
THUMBNAIL_LONG_EDGE_PIXELS      = 524                                                                                               # <-- Long edge dimension target
THUMBNAIL_SUFFIX_TOKEN          = '__Thumbnail__524p__'                                                                             # <-- Filename suffix marker
THUMBNAIL_WEBP_EXTENSION        = '.webp'                                                                                           # <-- Primary thumbnail extension
THUMBNAIL_JPG_EXTENSION         = '.jpg'                                                                                            # <-- Fallback thumbnail extension
THUMBNAIL_QUALITY_WEBP          = 82                                                                                                # <-- WebP quality (good size/quality balance)
THUMBNAIL_QUALITY_JPG           = 88                                                                                                # <-- JPG fallback quality
SOURCE_IMAGE_PREFIX_PATTERN     = re.compile(r'^IMG01(?:_ART\d{2})?__.*\.(png|jpg|jpeg|webp)$', re.IGNORECASE)                      # <-- IMG01 source pattern (gallery card)
ALL_SCENE_IMAGE_PREFIX_PATTERN  = re.compile(r'^IMG\d{2,3}(?:_ART\d{2})?__.*\.(png|jpg|jpeg|webp)$', re.IGNORECASE)                 # <-- Every IMG## scene source (animation thumbnails)
PROJECT_JSON_THUMBNAIL_KEY      = 'thumbnailImage'                                                                                  # <-- New project.json field
# ------------------------------------------------------------


# MODULE CONSTANTS | Console Color Codes
# ------------------------------------------------------------
COLOR_RESET                     = '\033[0m'                                                                                         # <-- Reset color
COLOR_GREEN                     = '\033[92m'                                                                                        # <-- Success messages
COLOR_YELLOW                    = '\033[93m'                                                                                        # <-- Warning messages
COLOR_BLUE                      = '\033[94m'                                                                                        # <-- Info messages
COLOR_CYAN                      = '\033[96m'                                                                                        # <-- Highlight messages
COLOR_RED                       = '\033[91m'                                                                                        # <-- Error messages
# ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Helper Functions
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Resolve Path Relative to Script Location
# ---------------------------------------------------------------
def Whitecardopedia__GalleryThumbnails__ResolveRelativePath(relativeValue: str) -> Path:
    scriptDirectory             = Path(__file__).resolve().parent                                                                   # <-- Script directory
    return (scriptDirectory / relativeValue).resolve()                                                                              # <-- Absolute path
# ---------------------------------------------------------------


# HELPER FUNCTION | Load Master Configuration JSON
# ---------------------------------------------------------------
def Whitecardopedia__GalleryThumbnails__LoadMasterConfig() -> Dict:
    masterConfigAbsolute        = Whitecardopedia__GalleryThumbnails__ResolveRelativePath(MASTER_CONFIG_PATH)                       # <-- Absolute config path
    if not masterConfigAbsolute.exists():
        return {'projects': []}                                                                                                     # <-- Tolerate missing config

    with masterConfigAbsolute.open('r', encoding='utf-8') as configFile:
        return json.load(configFile)                                                                                                # <-- Parse config JSON
# ---------------------------------------------------------------


# HELPER FUNCTION | List Enabled Project Folder Identifiers
# ---------------------------------------------------------------
def Whitecardopedia__GalleryThumbnails__ListEnabledProjectFolderIds() -> List[str]:
    masterConfig                = Whitecardopedia__GalleryThumbnails__LoadMasterConfig()                                            # <-- Load config
    projectsListed              = masterConfig.get('projects', [])                                                                  # <-- Extract list

    enabledFolderIds            = []
    for projectEntry in projectsListed:
        if not projectEntry.get('enabled', False):
            continue                                                                                                                # <-- Skip disabled projects
        folderIdValue           = projectEntry.get('folderId')                                                                      # <-- Read folder id
        if folderIdValue:
            enabledFolderIds.append(folderIdValue)                                                                                  # <-- Track enabled folder

    return enabledFolderIds                                                                                                         # <-- Return enabled list
# ---------------------------------------------------------------


# HELPER FUNCTION | Locate Source IMG01 File for Project Folder
# ---------------------------------------------------------------
def Whitecardopedia__GalleryThumbnails__FindSourceImage(projectFolderPath: Path) -> Optional[Path]:
    if not projectFolderPath.exists():
        return None                                                                                                                 # <-- Project folder missing

    candidateMatches            = []
    for entry in projectFolderPath.iterdir():
        if not entry.is_file():
            continue                                                                                                                # <-- Skip folders
        if THUMBNAIL_SUFFIX_TOKEN in entry.name:
            continue                                                                                                                # <-- Skip our own thumbnails
        if SOURCE_IMAGE_PREFIX_PATTERN.match(entry.name):
            candidateMatches.append(entry)                                                                                          # <-- IMG01 candidate

    if not candidateMatches:
        return None                                                                                                                 # <-- No candidate found

    candidateMatches.sort(key=lambda matchedFile: matchedFile.name.lower())                                                          # <-- Stable ordering
    return candidateMatches[0]                                                                                                      # <-- First match wins
# ---------------------------------------------------------------


# HELPER FUNCTION | Locate Every IMG## Scene Source Image for Project Folder
# ---------------------------------------------------------------
# Used by the --all-scenes mode so each SketchUp animation scene (IMG01, IMG02,
# ...) receives its own 524p thumbnail.  Our own generated thumbnails are
# excluded so they are never treated as sources.
# ---------------------------------------------------------------
def Whitecardopedia__GalleryThumbnails__FindAllSceneImages(projectFolderPath: Path) -> List[Path]:
    if not projectFolderPath.exists():
        return []                                                                                                                   # <-- Project folder missing

    sceneMatches                = []
    for entry in projectFolderPath.iterdir():
        if not entry.is_file():
            continue                                                                                                                # <-- Skip folders
        if THUMBNAIL_SUFFIX_TOKEN in entry.name:
            continue                                                                                                                # <-- Skip our own thumbnails
        if ALL_SCENE_IMAGE_PREFIX_PATTERN.match(entry.name):
            sceneMatches.append(entry)                                                                                              # <-- IMG## scene candidate

    sceneMatches.sort(key=lambda matchedFile: matchedFile.name.lower())                                                             # <-- Stable IMG01, IMG02, ... ordering
    return sceneMatches                                                                                                             # <-- All scene sources
# ---------------------------------------------------------------


# HELPER FUNCTION | Build Thumbnail Filename for Source Image
# ---------------------------------------------------------------
def Whitecardopedia__GalleryThumbnails__BuildThumbnailFilenames(sourceImagePath: Path) -> Tuple[str, str]:
    sourceStem                  = sourceImagePath.stem                                                                              # <-- Source filename without extension
    webpFilename                = f'{sourceStem}{THUMBNAIL_SUFFIX_TOKEN}{THUMBNAIL_WEBP_EXTENSION}'                                  # <-- WebP target name
    jpgFilename                 = f'{sourceStem}{THUMBNAIL_SUFFIX_TOKEN}{THUMBNAIL_JPG_EXTENSION}'                                   # <-- JPG fallback name
    return webpFilename, jpgFilename                                                                                                # <-- Return both names
# ---------------------------------------------------------------


# HELPER FUNCTION | Compute Resized Dimensions Preserving Aspect
# ---------------------------------------------------------------
def Whitecardopedia__GalleryThumbnails__ComputeTargetSize(sourceWidth: int, sourceHeight: int) -> Tuple[int, int]:
    longEdge                    = max(sourceWidth, sourceHeight)                                                                    # <-- Determine long edge
    if longEdge <= THUMBNAIL_LONG_EDGE_PIXELS:
        return sourceWidth, sourceHeight                                                                                            # <-- Source already small enough

    scaleFactor                 = THUMBNAIL_LONG_EDGE_PIXELS / float(longEdge)                                                      # <-- Compute scale ratio
    targetWidth                 = max(1, int(round(sourceWidth * scaleFactor)))                                                     # <-- Scaled width
    targetHeight                = max(1, int(round(sourceHeight * scaleFactor)))                                                    # <-- Scaled height
    return targetWidth, targetHeight                                                                                                # <-- Return scaled dimensions
# ---------------------------------------------------------------


# HELPER FUNCTION | Determine if Thumbnail is Up to Date
# ---------------------------------------------------------------
def Whitecardopedia__GalleryThumbnails__IsThumbnailFresh(sourceImagePath: Path, thumbnailPath: Path) -> bool:
    if not thumbnailPath.exists():
        return False                                                                                                                # <-- Thumbnail missing -> stale
    sourceMtime                 = sourceImagePath.stat().st_mtime                                                                   # <-- Source mtime
    thumbnailMtime              = thumbnailPath.stat().st_mtime                                                                     # <-- Thumbnail mtime
    return thumbnailMtime >= sourceMtime                                                                                            # <-- Fresh when newer or equal
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Thumbnail Generation
# -----------------------------------------------------------------------------

# FUNCTION | Generate WebP and JPG Thumbnails for Source
# ------------------------------------------------------------
def Whitecardopedia__GalleryThumbnails__GenerateThumbnails(
    sourceImagePath: Path,
    targetFolderPath: Path,
    forceRebuild: bool,
    dryRun: bool
) -> Tuple[Optional[str], Optional[str]]:

    webpFilename, jpgFilename   = Whitecardopedia__GalleryThumbnails__BuildThumbnailFilenames(sourceImagePath)                      # <-- Compute target names
    webpTargetPath              = targetFolderPath / webpFilename                                                                   # <-- WebP target path
    jpgTargetPath               = targetFolderPath / jpgFilename                                                                    # <-- JPG fallback target path

    needsWebp                   = forceRebuild or not Whitecardopedia__GalleryThumbnails__IsThumbnailFresh(sourceImagePath, webpTargetPath)     # <-- WebP regen check
    needsJpg                    = forceRebuild or not Whitecardopedia__GalleryThumbnails__IsThumbnailFresh(sourceImagePath, jpgTargetPath)      # <-- JPG regen check

    if not needsWebp and not needsJpg:
        return webpFilename, jpgFilename                                                                                            # <-- Nothing to do

    if dryRun:
        return webpFilename, jpgFilename                                                                                            # <-- Dry run skips writes

    with Image.open(sourceImagePath) as sourceImage:                                                                                # <-- Open source image
        sourceImage.load()                                                                                                          # <-- Force load before transforms

        targetWidth, targetHeight = Whitecardopedia__GalleryThumbnails__ComputeTargetSize(sourceImage.width, sourceImage.height)    # <-- Compute target size
        resizedImage            = sourceImage.resize((targetWidth, targetHeight), Image.Resampling.LANCZOS)                         # <-- High-quality downsample

        if needsWebp:
            resizedImage.save(webpTargetPath, format='WEBP', quality=THUMBNAIL_QUALITY_WEBP, method=6)                              # <-- Write WebP target

        if needsJpg:
            jpgImage            = resizedImage.convert('RGB') if resizedImage.mode != 'RGB' else resizedImage                       # <-- Drop alpha for JPG
            jpgImage.save(jpgTargetPath, format='JPEG', quality=THUMBNAIL_QUALITY_JPG, optimize=True, progressive=True)             # <-- Write JPG fallback

    return webpFilename, jpgFilename                                                                                                # <-- Return both filenames
# ---------------------------------------------------------------


# FUNCTION | Patch project.json with Thumbnail Reference
# ------------------------------------------------------------
def Whitecardopedia__GalleryThumbnails__PatchProjectJson(
    projectFolderPath: Path,
    thumbnailFilename: str,
    dryRun: bool
) -> bool:

    projectJsonPath             = projectFolderPath / PROJECT_JSON_FILENAME                                                         # <-- project.json path
    if not projectJsonPath.exists():
        return False                                                                                                                # <-- No project.json to patch

    with projectJsonPath.open('r', encoding='utf-8') as projectJsonFile:
        projectJsonData         = json.load(projectJsonFile)                                                                        # <-- Load existing data

    existingValue               = projectJsonData.get(PROJECT_JSON_THUMBNAIL_KEY)                                                   # <-- Existing thumbnail field
    if existingValue == thumbnailFilename:
        return False                                                                                                                # <-- Already up to date

    projectJsonData[PROJECT_JSON_THUMBNAIL_KEY] = thumbnailFilename                                                                 # <-- Update field

    if dryRun:
        return True                                                                                                                 # <-- Dry run reports change only

    with projectJsonPath.open('w', encoding='utf-8') as projectJsonFile:
        json.dump(projectJsonData, projectJsonFile, indent=4, ensure_ascii=False)                                                   # <-- Persist update
        projectJsonFile.write('\n')                                                                                                 # <-- Trailing newline for tidiness
    return True                                                                                                                     # <-- Indicate file written
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Orchestration
# -----------------------------------------------------------------------------

# FUNCTION | Process Single Project Folder Identifier
# ------------------------------------------------------------
def Whitecardopedia__GalleryThumbnails__ProcessSingleProject(
    projectsBasePath: Path,
    folderIdValue: str,
    forceRebuild: bool,
    dryRun: bool,
    generateAllScenes: bool = False
) -> Dict:

    projectFolderPath           = projectsBasePath / folderIdValue                                                                  # <-- Resolve absolute project folder
    sourceImagePath             = Whitecardopedia__GalleryThumbnails__FindSourceImage(projectFolderPath)                            # <-- Locate IMG01 gallery source

    if not sourceImagePath:
        return {'folderId': folderIdValue, 'status': 'skipped-no-source', 'thumbnail': None}                                        # <-- No source -> skip

    try:
        webpFilename, _jpg      = Whitecardopedia__GalleryThumbnails__GenerateThumbnails(                                           # <-- Gallery card thumbnail (IMG01)
            sourceImagePath        = sourceImagePath,
            targetFolderPath       = projectFolderPath,
            forceRebuild           = forceRebuild,
            dryRun                 = dryRun
        )

        sceneThumbCount         = 0                                                                                                 # <-- Count of per-scene animation thumbnails
        if generateAllScenes:
            # GENERATE A 524p THUMBNAIL FOR EVERY IMG## ANIMATION SCENE
            # The gallery card still uses the IMG01 thumbnail; this only adds the
            # missing per-scene thumbnails consumed by the ValeVision carousel.
            for sceneImagePath in Whitecardopedia__GalleryThumbnails__FindAllSceneImages(projectFolderPath):
                if sceneImagePath.name == sourceImagePath.name:
                    sceneThumbCount += 1                                                                                            # <-- IMG01 already generated above
                    continue
                Whitecardopedia__GalleryThumbnails__GenerateThumbnails(                                                             # <-- One thumbnail per scene
                    sourceImagePath    = sceneImagePath,
                    targetFolderPath   = projectFolderPath,
                    forceRebuild       = forceRebuild,
                    dryRun             = dryRun
                )
                sceneThumbCount += 1
    except Exception as generationError:
        return {'folderId': folderIdValue, 'status': 'error', 'error': str(generationError), 'thumbnail': None}                     # <-- Surface generation error

    didPatchJson                = Whitecardopedia__GalleryThumbnails__PatchProjectJson(                                             # <-- Patch project.json (gallery card)
        projectFolderPath          = projectFolderPath,
        thumbnailFilename          = webpFilename,
        dryRun                     = dryRun
    )

    return {
        'folderId'        : folderIdValue,
        'status'          : 'updated' if didPatchJson else 'fresh',
        'thumbnail'       : webpFilename,
        'sceneThumbnails' : sceneThumbCount if generateAllScenes else 0
    }
# ---------------------------------------------------------------


# FUNCTION | Process Every Enabled Project Folder
# ------------------------------------------------------------
def Whitecardopedia__GalleryThumbnails__ProcessAllProjects(
    forceRebuild: bool,
    dryRun: bool,
    singleProject: Optional[str],
    generateAllScenes: bool = False
) -> List[Dict]:

    projectsBasePath            = Whitecardopedia__GalleryThumbnails__ResolveRelativePath(PROJECTS_BASE_FOLDER)                     # <-- Resolve projects root

    if singleProject:
        targetFolderIds         = [singleProject]                                                                                   # <-- Honour single-project filter
    else:
        targetFolderIds         = Whitecardopedia__GalleryThumbnails__ListEnabledProjectFolderIds()                                 # <-- All enabled projects

    resultsList                 = []
    for folderIdValue in targetFolderIds:
        result                  = Whitecardopedia__GalleryThumbnails__ProcessSingleProject(                                         # <-- Process single project
            projectsBasePath       = projectsBasePath,
            folderIdValue          = folderIdValue,
            forceRebuild           = forceRebuild,
            dryRun                 = dryRun,
            generateAllScenes      = generateAllScenes
        )
        resultsList.append(result)                                                                                                  # <-- Track outcome

    return resultsList                                                                                                              # <-- Return aggregated results
# ---------------------------------------------------------------


# FUNCTION | Print Run Summary to Console
# ------------------------------------------------------------
def Whitecardopedia__GalleryThumbnails__PrintSummary(resultsList: List[Dict], dryRun: bool) -> None:
    print()                                                                                                                         # <-- Spacer for readability
    headerText                  = '[DRY RUN] ' if dryRun else ''                                                                    # <-- Mark dry run output
    print(f'{COLOR_CYAN}========================================================================{COLOR_RESET}')
    print(f'{COLOR_CYAN}{headerText}WHITECARDOPEDIA - GALLERY THUMBNAIL GENERATOR SUMMARY{COLOR_RESET}')
    print(f'{COLOR_CYAN}========================================================================{COLOR_RESET}')
    print()

    statusCounts                = {'updated': 0, 'fresh': 0, 'skipped-no-source': 0, 'error': 0}                                    # <-- Outcome buckets

    for result in resultsList:
        statusValue             = result.get('status', 'error')                                                                     # <-- Read status
        statusCounts[statusValue] = statusCounts.get(statusValue, 0) + 1                                                            # <-- Increment bucket

        if statusValue == 'updated':
            print(f'{COLOR_GREEN}[UPDATED]{COLOR_RESET} {result["folderId"]} -> {result.get("thumbnail")}')
        elif statusValue == 'fresh':
            print(f'{COLOR_BLUE}[FRESH]  {COLOR_RESET} {result["folderId"]} -> {result.get("thumbnail")}')
        elif statusValue == 'skipped-no-source':
            print(f'{COLOR_YELLOW}[SKIP]   {COLOR_RESET} {result["folderId"]} (no IMG01 source found)')
        else:
            print(f'{COLOR_RED}[ERROR]  {COLOR_RESET} {result["folderId"]} -> {result.get("error")}')

    print()
    print(f'{COLOR_CYAN}Totals:{COLOR_RESET} updated={statusCounts.get("updated", 0)} fresh={statusCounts.get("fresh", 0)} '
          f'skipped={statusCounts.get("skipped-no-source", 0)} errors={statusCounts.get("error", 0)}')
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | CLI Entry Point
# -----------------------------------------------------------------------------

# FUNCTION | Parse Command-Line Arguments
# ------------------------------------------------------------
def Whitecardopedia__GalleryThumbnails__ParseArguments() -> argparse.Namespace:
    parser                      = argparse.ArgumentParser(                                                                          # <-- Build CLI parser
        description='Generate 524p WebP/JPG thumbnails for project gallery cards.',
    )
    parser.add_argument('--dry-run', action='store_true', help='Report intended changes without writing files.')
    parser.add_argument('--force', action='store_true', help='Re-create thumbnails even if up to date.')
    parser.add_argument('--project', type=str, default=None, help='Process a single project folder identifier (e.g. 2025/00__ExampleProject).')
    parser.add_argument('--all-scenes', action='store_true', help='Generate a 524p thumbnail for every IMG## scene (animation), not just IMG01.')
    return parser.parse_args()                                                                                                       # <-- Return parsed args
# ---------------------------------------------------------------


# FUNCTION | CLI Entry Point Main
# ------------------------------------------------------------
def Whitecardopedia__GalleryThumbnails__Main() -> int:
    parsedArgs                  = Whitecardopedia__GalleryThumbnails__ParseArguments()                                              # <-- Read CLI args

    resultsList                 = Whitecardopedia__GalleryThumbnails__ProcessAllProjects(                                           # <-- Run pipeline
        forceRebuild               = bool(parsedArgs.force),
        dryRun                     = bool(parsedArgs.dry_run),
        singleProject              = parsedArgs.project,
        generateAllScenes          = bool(parsedArgs.all_scenes)
    )

    Whitecardopedia__GalleryThumbnails__PrintSummary(resultsList, bool(parsedArgs.dry_run))                                         # <-- Output summary

    errorCount                  = sum(1 for r in resultsList if r.get('status') == 'error')                                         # <-- Count errors
    return 1 if errorCount > 0 else 0                                                                                               # <-- Exit code reflects health
# ---------------------------------------------------------------


if __name__ == '__main__':
    sys.exit(Whitecardopedia__GalleryThumbnails__Main())                                                                            # <-- Run CLI

# endregion -------------------------------------------------------------------
