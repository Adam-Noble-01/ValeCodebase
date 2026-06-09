#!/usr/bin/env python3
# =============================================================================
# NOBLE ARCHITECTURE - PYTHON APP LAUNCHER
# =============================================================================
#
# FILE       : Py_WinUtil__PythonAppLauncher__Main__.py
# NAMESPACE  : PythonAppLauncher
# MODULE     : PythonAppLauncher
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Tkinter launcher + Windows system tray menu for every Python tool
#              inside Root_GeneralDeveloperTools/02_Python.
# CREATED    : 23-Apr-2026
#
# DESCRIPTION
# - Auto-discovers every `*__Main__.py` script across the five 02_Python tool
#   categories and renders them as category-grouped buttons in an "App Launcher"
#   tab of a ttk.Notebook.
# - Offers a "Settings" tab with a per-app checkbox so tools can be hidden from
#   the launcher grid without deleting them; state persists to a local JSON
#   config file between sessions.
# - Runs resident in the Windows system tray with the Noble Architecture logo,
#   close-button on the window hides to tray (does not quit). The tray menu
#   exposes Open Menu / Refresh Apps / Exit.
# - Ships with a silent `.vbs` launcher for linking from `shell:startup` so it
#   loads with Windows with zero visible console.
# - Single-instance guarded: a second launch raises the existing window
#   instead of spawning a second tray icon.
#
# DEPENDENCIES
# - Standard library: tkinter, pathlib, subprocess, json, os, sys, logging,
#   threading, dataclasses, datetime, msvcrt, tempfile.
# - Bundled (00__ThirdParty__VersionLockedDependencies/):
#     pystray  0.19.5
#     Pillow   10.4.0         (also used to load the header banner PNG)
#
# DEVELOPMENT LOG
# See `Py_WinUtil__PythonAppLauncher__DEVLOG__.md` for version history.
#
# =============================================================================


# =============================================================================
# REGION | IMPORTS - Standard library
# =============================================================================
import os
import sys
import re
import json
import time
import logging
import threading
import subprocess
from pathlib import Path
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

import tkinter as tk
from tkinter import ttk

# endregion -------------------------------------------------------------------


# =============================================================================
# REGION | DEPENDENCY PATH SETUP - prepend bundled packages to sys.path
# =============================================================================
SCRIPT_DIR                   = Path(__file__).resolve().parent
DEPS_ROOT                    = SCRIPT_DIR / "00__ThirdParty__VersionLockedDependencies"
_BUNDLED_DEP_FOLDERS         = [
    "00__PyStray__PythonPackage__",
    "01__Pillow__PythonPackage__",
]

for _dep_folder_name in _BUNDLED_DEP_FOLDERS:                                    # Inject each bundled package folder onto sys.path
    _dep_path = DEPS_ROOT / _dep_folder_name                                     # Build absolute path to the bundled package folder
    if _dep_path.is_dir():
        _dep_str = str(_dep_path)
        if _dep_str not in sys.path:
            sys.path.insert(0, _dep_str)                                         # Prepend so bundled deps beat any system site-packages
# endregion -------------------------------------------------------------------


# =============================================================================
# REGION | IMPORTS - pystray + PIL.Image (from bundled deps, soft-fail)
# =============================================================================
try:
    import pystray                                                              # Windows system tray icon library
    from pystray import Menu as TrayMenu, MenuItem as TrayMenuItem              # Friendlier aliases for menu building
    from PIL import Image as PilImage                                           # Needed by pystray for the icon bitmap
    TRAY_LIBS_AVAILABLE      = True
except Exception as _tray_import_err:                                           # Keep the app usable even if tray deps are missing
    TRAY_LIBS_AVAILABLE      = False
    _TRAY_IMPORT_ERROR       = _tray_import_err
# endregion -------------------------------------------------------------------


# =============================================================================
# REGION | IMPORTS - Noble icon loader (shared common lib, pass-through fallback)
# =============================================================================
_CATEGORY_ROOT               = SCRIPT_DIR.parent                                 # e.g. ...\10__Python__WinFileSystemTools
_PYTHON_ROOT                 = _CATEGORY_ROOT.parent                             # e.g. ...\02_Python
_COMMON_LIBS_DIR             = _PYTHON_ROOT / "02__Python__CommonLocalCodeLibs"
if _COMMON_LIBS_DIR.is_dir():
    _common_libs_str = str(_COMMON_LIBS_DIR)
    if _common_libs_str not in sys.path:
        sys.path.insert(0, _common_libs_str)

try:
    from Py_CoreCommonUtils__IconLoaderAndHandling import set_noble_icon        # type: ignore
except Exception:                                                                # Fallback: no-op if the shared lib is missing
    def set_noble_icon(root):                                                    # pylint: disable=unused-argument
        return None
# endregion -------------------------------------------------------------------


# =============================================================================
# REGION | LOGGING SETUP - writes Py_WinUtil__PythonAppLauncher.log next to this file
# =============================================================================
LOG_FILE_PATH                = SCRIPT_DIR / "Py_WinUtil__PythonAppLauncher.log"

logging.basicConfig(
    level                    = logging.INFO,
    format                   = "%(asctime)s | %(levelname)-7s | %(message)s",
    handlers                 = [
        logging.FileHandler(LOG_FILE_PATH, mode="a", encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log                          = logging.getLogger("PythonAppLauncher")
log.info("=== Python App Launcher starting ===")
if not TRAY_LIBS_AVAILABLE:
    log.warning("Tray libs unavailable (%s) - run INSTALL_DEPENDENCIES.bat", _TRAY_IMPORT_ERROR)
# endregion -------------------------------------------------------------------


# =============================================================================
# REGION | CONSTANTS
# =============================================================================
APP_TITLE                    = "Python App Launcher"
APP_VERSION                  = "1.2.1"
CONFIG_FILE_NAME             = "Py_WinUtil__PythonAppLauncher__AppConfig__.json"
CONFIG_SCHEMA_VERSION        = 2

CATEGORY_FOLDERS             = [                                                 # Hard-coded, ordered: hotkeys last (rarely used)
    "10__Python__WinFileSystemTools",
    "20__Python__PDFTools",
    "30__Python__ImageTools",
    "50__Python__VideoTools",
    "05__Python__HotkeyManagers",
]

SELF_MAIN_FILENAME           = Path(__file__).name                               # Used to exclude the launcher itself from discovery

NOBLE_TRAY_ICON_PATH         = (
    _PYTHON_ROOT
    / "00__Python__CommonDependencyFiles"
    / "Na__CommonBrandAssets"
    / "CustomAppIcon__NobleArchLogo.png"
)
NOBLE_HEADER_LOGO_PATH       = (                                                  # Wide banner graphic rendered at the top of the window
    _PYTHON_ROOT
    / "00__Python__CommonDependencyFiles"
    / "Na__CommonBrandAssets"
    / "AppHeaderGraphic__NobleArchLogo__.png"
)

LOCK_DIR                     = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "ValeArch" / "PythonAppLauncher"
LOCK_FILE_PATH               = LOCK_DIR / "PythonAppLauncher.lock"
SHOW_FLAG_PATH               = LOCK_DIR / "show.flag"

WINDOW_WIDTH                 = 1000
WINDOW_HEIGHT                = 1200
BUTTON_COLUMN_COUNT          = 4
CARD_MIN_HEIGHT_PX           = 120
CARD_CORNER_RADIUS_PX        = 14                                                 # Rounded-rect radius used by the launcher cards
CARD_NAME_WRAPLENGTH_PX      = 220
CARD_DESC_WRAPLENGTH_PX      = 220

# Theme palette ---------------------------------------------------------------
THEME_BG                     = "#f2f3f5"                                          # Lighter grey body behind everything
THEME_HEADER_BG              = "#ffffff"                                          # Header banner strip behind the logo
CARD_BG_DEFAULT              = "#ffffff"                                          # Card fill (rounded rectangle + inner labels)
CARD_BG_HOVER                = "#eaf2fb"                                          # Hover tint for the rounded fill
CARD_BORDER_DEFAULT          = "#d5d7dc"                                          # Subtle card outline
CARD_BORDER_HOVER            = "#4a7cb1"                                          # Accent outline on hover
CARD_FG_NAME                 = "#1a1a1a"
CARD_FG_DESCRIPTION          = "#555555"

# Notebook tab palette (flat, modern) ----------------------------------------
TAB_INACTIVE_BG              = "#e4e6ea"                                          # Sits between body and white tab so unselected tabs have presence
TAB_ACTIVE_BG                = "#ffffff"                                          # Selected tab matches the card / banner fill
TAB_HOVER_BG                 = "#eef0f3"                                          # Subtle hover tint on the inactive tab
TAB_FG                       = "#5b606b"
TAB_ACTIVE_FG                = "#1a1a1a"
TAB_ACCENT                   = "#4a7cb1"                                          # Same accent as the hover card border - visually ties the UI together

HEADER_LOGO_TARGET_HEIGHT_PX = 68                                                 # Banner height (width scales to preserve aspect ratio)
HEADER_PAD_Y                 = 10                                                 # Vertical padding around the banner
DEFAULT_ORDER_STEP           = 10                                                 # Auto-seeded `order` values step by 10 (leaves gaps for inserts)

SHOW_FLAG_POLL_INTERVAL_MS   = 800                                               # How often the running instance checks for show.flag
# endregion -------------------------------------------------------------------


# =============================================================================
# REGION | CURATED APP METADATA - hard-coded names + descriptions per key
# =============================================================================
# Keys are the forward-slashed relative path from the 02_Python root.
# Resolution priority (descending): user JSON override > this registry > heuristic.
# When adding a new app to the 02_Python tree, drop an entry in here to give it
# a polished default name/description on first discovery; otherwise the
# heuristic fallback still produces a reasonable label.
CURATED_APP_METADATA: dict[str, tuple[str, str]] = {
    # 10__Python__WinFileSystemTools ------------------------------------------
    "10__Python__WinFileSystemTools/Py_FileUtils__FileCompression__StandardArchivalScript/Py_FileUtils__FileCompression__StandardArchivalScript__Main__.py": (
        "Standard Archival Compressor",
        "One-click archiver - zips a chosen folder using the standard Vale archival profile for long-term storage.",
    ),
    "10__Python__WinFileSystemTools/Py_FileUtils__SimpleFileLogger__ListItems__InCurrentFolder/Py_FileUtils__SimpleFileLogger__ListFilesInCurrentFolder__DumpTxt__Main__.py": (
        "List Files in Folder",
        "Dumps every file (with size) from a chosen folder into a timestamped .txt report.",
    ),
    "10__Python__WinFileSystemTools/Py_FileUtils__SimpleFileLogger__ListItems__InCurrentFolder/Py_FileUtils__SimpleFileLogger__ListFoldersAtCurrentDirLevel__DumpTxt__Main__.py": (
        "List Subfolders",
        "Dumps every direct subfolder name at the chosen directory level into a .txt report.",
    ),
    "10__Python__WinFileSystemTools/Py_WinUtil__BuildValeProjectStructure/Py_WinUtil__BuildValeProjectStructure__Main__.py": (
        "Build Vale Project Structure",
        "Scaffolds the canonical Vale project folder tree for a new job at the chosen location.",
    ),
    "10__Python__WinFileSystemTools/Py_WinUtil__ProjectFileTreeViewer/Py_WinUtil__ProjectFileTreeViewer__Main__.py": (
        "Project File Tree Viewer",
        "Interactive tree browser with high-quality image export of a project's directory structure.",
    ),
    # 20__Python__PDFTools ----------------------------------------------------
    "20__Python__PDFTools/Py_PdfUtils__A3PdfDocCompiler/Py_PdfUtils__PdfDocCompiler__Main__.py": (
        "PDF Doc Compiler (A3)",
        "Merges multiple PDFs into a single A3 document with consistent page sizing and ordering.",
    ),
    "20__Python__PDFTools/Py_PdfUtils__CompressPdfFile/Py_PdfUtils__CompressPdfFile__Main__.py": (
        "Compress PDF",
        "Shrinks a PDF's file size by re-encoding embedded images while keeping text crisp.",
    ),
    "20__Python__PDFTools/Py_PdfUtils__HtmlToPagelessPdfConverter/Py_PdfUtils__HtmlToPagelessPdfConverter__Main__.py": (
        "HTML to Pageless PDF",
        "Renders an HTML file or URL into a single long pageless PDF - ideal for web captures.",
    ),
    "20__Python__PDFTools/Py_PdfUtils__PdfToDxfConverter/Py_PdfUtils__PdfToDxfConverter__Main__.py": (
        "PDF to DXF",
        "Converts vector PDF drawings into DXF files ready for CAD consumption.",
    ),
    "20__Python__PDFTools/Py_PdfUtils__PdfToPngConverter/Py_PdfUtils__PdfToPngConverter__Main__.py": (
        "PDF to PNG",
        "Rasterises every page of a PDF into individual PNG images at a chosen DPI.",
    ),
    "20__Python__PDFTools/Py_PdfUtils__PdfToTextExtractor/Py_PdfUtils__PdfToTextExtractor__Main__.py": (
        "PDF to Text Extractor",
        "Extracts embedded text or OCRs scanned PDFs and saves a structured Markdown file.",
    ),
    "20__Python__PDFTools/Py_PdfUtils__PngToPdfConverter/Py_PdfUtils__PngToPdfConverter__Main__.py": (
        "PNG to PDF",
        "Compiles a batch of PNG images into a single ordered PDF document.",
    ),
    # 30__Python__ImageTools --------------------------------------------------
    "30__Python__ImageTools/Py_ImgUtils__HeicToPngConverter/Py_ImgUtils__HeicToPngConverter__Main__.py": (
        "HEIC to PNG",
        "Batch-converts Apple HEIC photos into PNG files, preserving image quality.",
    ),
    "30__Python__ImageTools/Py_ImgUtils__PhotoMetadataPurger/Py_ImgUtils__PhotoMetadataPurger__Main__.py": (
        "Photo Metadata Purger",
        "Strips EXIF and other metadata from a batch of photos for safe public sharing.",
    ),
    "30__Python__ImageTools/Py_ImgUtils__CadBackgroundRemover/Py_ImgUtils__CadBackgroundRemover__Main__.py": (
        "CAD Background Remover",
        "Batch-strips white and light-grey backgrounds from CAD linework images, saving clean transparent PNGs beside the originals.",
    ),
    # 50__Python__VideoTools --------------------------------------------------
    "50__Python__VideoTools/Py_VideoUtils__CombineVideosInChronologicalOrder/SyPy_VideoUtils__CombineVideosInChronologicalOrder__Main__.py": (
        "Combine Videos (Chronological)",
        "Stitches multiple video files into one output, ordered by original capture date.",
    ),
    "50__Python__VideoTools/Py_VideoUtils__PngFilesToTimelapseVideo/Py_VideoUtils__PngFilesToTimelapseVideo__Main__.py": (
        "PNG Frames to Timelapse",
        "Turns a folder of numbered PNG stills into a smooth MP4 timelapse video.",
    ),
    # 05__Python__HotkeyManagers (rendered last) ------------------------------
    "05__Python__HotkeyManagers/Py__HotkeyManager__AutoEmail__ValeTemplates/Py__HotkeyManager__AutoEmail__ValeTemplates__Main__.py": (
        "Auto Email (Vale Templates)",
        "AutoHotkey-style triggers that paste pre-built Vale delivery and project-sharing emails.",
    ),
    "05__Python__HotkeyManagers/Py__HotkeyManager__ValeTypingShorthand/Py__HotkeyManager__ValeTypingShorthand__Main__.py": (
        "Vale Typing Shorthand",
        "System-tray hotstring engine that expands typed shortcuts into Markdown-backed snippets.",
    ),
}


    # HELPER | Resolve a sensible (name, description) default for a LaunchableApp
    # ------------------------------------------------------------
def resolve_default_metadata(app: "LaunchableApp") -> tuple[str, str]:
    curated = CURATED_APP_METADATA.get(app.key)
    if curated is not None:
        return curated
    fallback_name = app.display_name.replace("\n", " ")                          # Flatten the multi-line heuristic label
    fallback_desc = f"Launches {app.main_script.name} from {app.category_label}."
    return fallback_name, fallback_desc
    # ---------------------------------------------------------------
# endregion -------------------------------------------------------------------


# =============================================================================
# REGION | DATA MODEL - LaunchableApp dataclass
# =============================================================================
@dataclass(frozen=True)
class LaunchableApp:
    key                      : str                                               # Stable ID (forward-slashed relative path from 02_Python)
    display_name             : str                                               # Multi-line button label (\n separated)
    category_folder          : str                                               # e.g. "20__Python__PDFTools"
    category_label           : str                                               # e.g. "PDF Tools"
    app_folder               : Path
    main_script              : Path
    relative_hint            : str = ""                                          # Greyed path hint shown in Settings
# endregion -------------------------------------------------------------------


# =============================================================================
# REGION | LABEL HELPERS - filename -> human label
# =============================================================================
    # SUB FUNCTION | Split CamelCase into space-separated words, preserving runs of caps
    # ---------------------------------------------------------------
def _camel_split(token: str) -> str:
    if not token:
        return token
    cleaned = re.sub(r"[_\-]+", " ", token)                                      # Collapse underscores/dashes to spaces first
    cleaned = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", cleaned)                    # lowerUpper -> lower Upper
    cleaned = re.sub(r"(?<=[A-Z])(?=[A-Z][a-z])", " ", cleaned)                  # UPPERCamel -> UPPER Camel
    return re.sub(r"\s+", " ", cleaned).strip()
    # ---------------------------------------------------------------

    # SUB FUNCTION | Derive human label from a *__Main__.py filename (multi-line)
    # ---------------------------------------------------------------
def _derive_display_name(main_filename: str) -> str:
    stem = main_filename
    for suffix in ("__Main__.py", "__Main__.pyw"):
        if stem.endswith(suffix):
            stem = stem[: -len(suffix)]
            break
    segments = [s for s in stem.split("__") if s]                                # Drop empty tokens from consecutive underscores
    if segments and re.match(r"^(?:Sy)?Py(?:_[A-Za-z0-9]+)?$", segments[0]):     # Drop leading Py / Py_XxxUtils / SyPy / SyPy_XxxUtils prefix
        segments = segments[1:]
    friendly = [_camel_split(seg) for seg in segments if seg]
    friendly = [f for f in friendly if f]                                        # Drop anything that degenerated to empty
    if not friendly:
        friendly = [stem or main_filename]
    return "\n".join(friendly)
    # ---------------------------------------------------------------

    # SUB FUNCTION | Derive human label for a category folder name
    # ---------------------------------------------------------------
def _derive_category_label(folder_name: str) -> str:
    core = re.sub(r"^\d+__", "", folder_name)                                    # Strip leading "NN__"
    core = re.sub(r"^Python__", "", core, flags=re.IGNORECASE)                   # Strip "Python__" token
    pretty = _camel_split(core)
    return pretty.replace("PDF", "PDF")                                          # Keep the common acronym uppercased (camel_split already preserves it)
    # ---------------------------------------------------------------
# endregion -------------------------------------------------------------------


# =============================================================================
# REGION | DISCOVERY - walk categories, build LaunchableApp list
# =============================================================================
    # FUNCTION | Discover every *__Main__.py across the configured categories
    # ------------------------------------------------------------
def discover_apps() -> list[LaunchableApp]:
    apps: list[LaunchableApp] = []
    self_main = SCRIPT_DIR / SELF_MAIN_FILENAME
    for category_folder in CATEGORY_FOLDERS:
        category_path = _PYTHON_ROOT / category_folder
        if not category_path.is_dir():
            log.warning("Discovery: category folder missing -> %s", category_path)
            continue
        category_label = _derive_category_label(category_folder)
        for app_folder in sorted(category_path.iterdir(), key=lambda p: p.name.lower()):
            if not app_folder.is_dir():
                continue
            mains = sorted(app_folder.glob("*__Main__.py"))
            for main_script in mains:
                if main_script.resolve() == self_main.resolve():                  # Never include ourselves
                    continue
                rel = main_script.relative_to(_PYTHON_ROOT).as_posix()
                app = LaunchableApp(
                    key                = rel,
                    display_name       = _derive_display_name(main_script.name),
                    category_folder    = category_folder,
                    category_label     = category_label,
                    app_folder         = app_folder,
                    main_script        = main_script,
                    relative_hint      = rel,
                )
                apps.append(app)
    log.info("Discovery: found %d launchable apps across %d categories", len(apps), len(CATEGORY_FOLDERS))
    return apps
    # ---------------------------------------------------------------
# endregion -------------------------------------------------------------------


# =============================================================================
# REGION | CONFIG PERSISTENCE - v2 JSON with per-app {enabled, name, description}
# =============================================================================
CONFIG_FILE_PATH             = SCRIPT_DIR / CONFIG_FILE_NAME


@dataclass
class AppMetadata:
    """Per-app user-facing settings persisted to JSON (one row per discovered app)."""
    enabled                  : bool = True
    name                     : str = ""                                           # Curated / user-edited button name
    description              : str = ""                                           # Short sentence shown under the name
    order                    : int = 0                                            # Within-category sort key (low -> left, 0 = unset)
# ---------------------------------------------------------------


    # FUNCTION | Load the v2 metadata map from JSON, auto-migrating v1 configs
    # ------------------------------------------------------------
def load_app_metadata() -> dict[str, AppMetadata]:
    if not CONFIG_FILE_PATH.exists():
        return {}
    try:
        with CONFIG_FILE_PATH.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
    except Exception as err:
        log.warning("Config load failed (%s) - starting with a blank metadata map", err)
        return {}

    schema = int(data.get("schema_version", 1) or 1)
    result: dict[str, AppMetadata] = {}

    if schema >= 2:                                                               # Native v2 path
        for key, value in (data.get("apps") or {}).items():
            if not isinstance(key, str) or not isinstance(value, dict):
                continue
            result[key] = AppMetadata(
                enabled     = bool(value.get("enabled", True)),
                name        = str(value.get("name", "") or ""),
                description = str(value.get("description", "") or ""),
                order       = int(value.get("order", 0) or 0),
            )
        return result

    # --- v1 migration: {"disabled_app_keys": [...]} --------------------------
    for key in (data.get("disabled_app_keys") or []):
        if isinstance(key, str):
            result[key] = AppMetadata(enabled=False, name="", description="")
    log.info("Config migrated from schema v1 -> v2 (disabled entries carried forward)")
    return result
    # ---------------------------------------------------------------


    # FUNCTION | Save the current metadata map atomically, pruning stale keys
    # ------------------------------------------------------------
def save_app_metadata(metadata: dict[str, AppMetadata], known_keys: set[str]) -> None:
    cleaned_keys = sorted(k for k in metadata.keys() if k in known_keys)         # Garbage-collect stale entries
    payload_apps = {
        key: {
            "enabled"     : bool(metadata[key].enabled),
            "order"       : int(metadata[key].order),
            "name"        : metadata[key].name,
            "description" : metadata[key].description,
        }
        for key in cleaned_keys
    }
    payload = {
        "schema_version"  : CONFIG_SCHEMA_VERSION,
        "apps"            : payload_apps,
        "last_modified"   : datetime.now().strftime("%d-%b-%Y %H:%M:%S"),
    }
    tmp_path = CONFIG_FILE_PATH.with_suffix(CONFIG_FILE_PATH.suffix + ".tmp")
    with tmp_path.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2)
    os.replace(tmp_path, CONFIG_FILE_PATH)
    disabled_count = sum(1 for k in cleaned_keys if not metadata[k].enabled)
    log.info("Config saved - %d app(s) tracked (%d disabled)", len(cleaned_keys), disabled_count)
    # ---------------------------------------------------------------
# endregion -------------------------------------------------------------------


# =============================================================================
# REGION | LAUNCHER - subprocess wrapper that spawns detached, windowless tools
# =============================================================================
_CREATE_NO_WINDOW            = 0x08000000
_DETACHED_PROCESS            = 0x00000008

    # HELPER | Resolve a pythonw.exe path (no-console Python) for child processes
    # ------------------------------------------------------------
def _find_pythonw_exe() -> str:
    candidates: list[str] = []
    local_app = os.environ.get("LOCALAPPDATA")
    if local_app:
        candidates.append(str(Path(local_app) / "Programs" / "Python" / "Python312" / "pythonw.exe"))
        candidates.append(str(Path(local_app) / "Programs" / "Python" / "Python311" / "pythonw.exe"))
    current_python = Path(sys.executable)
    candidates.append(str(current_python.parent / "pythonw.exe"))                # Sibling of the currently running python
    candidates.append(str(current_python))                                        # Last resort - this one may briefly show a console
    for c in candidates:
        if c and Path(c).is_file():
            return c
    return sys.executable
    # ---------------------------------------------------------------

    # FUNCTION | Spawn the given app in a detached subprocess (no console for the child)
    # ------------------------------------------------------------
def launch_app(app: LaunchableApp) -> None:
    env = os.environ.copy()
    cwd = str(app.app_folder)
    creationflags = _CREATE_NO_WINDOW | _DETACHED_PROCESS
    # Always run the main script with pythonw. Sibling Start__*.ps1 files are for
    # manual/Explorer use only; Popen(powershell -WindowStyle Hidden) breaks Tk.
    pythonw = _find_pythonw_exe()
    cmd = [pythonw, str(app.main_script)]
    log.info("Launching app: %s", app.key)
    try:
        subprocess.Popen(
            cmd,
            cwd                = cwd,
            env                = env,
            creationflags      = creationflags,
            close_fds          = True,
        )
    except Exception as err:
        log.exception("Launch failed for %s: %s", app.key, err)
    # ---------------------------------------------------------------
# endregion -------------------------------------------------------------------


# =============================================================================
# REGION | SINGLE-INSTANCE GUARD - lock file + show.flag signalling
# =============================================================================
try:
    import msvcrt                                                                 # Windows-only - we are Windows-only by design
    _MSVCRT_AVAILABLE        = True
except ImportError:
    _MSVCRT_AVAILABLE        = False

_LOCK_FILE_HANDLE            = None

    # FUNCTION | Try to claim the single-instance lock; returns True if we are the primary instance
    # ------------------------------------------------------------
def acquire_single_instance_lock() -> bool:
    global _LOCK_FILE_HANDLE
    if not _MSVCRT_AVAILABLE:
        return True                                                               # Non-Windows - skip the check, allow launch
    try:
        LOCK_DIR.mkdir(parents=True, exist_ok=True)
        _LOCK_FILE_HANDLE = open(LOCK_FILE_PATH, "a+b")                           # Keep the handle alive for the whole process lifetime
        try:
            msvcrt.locking(_LOCK_FILE_HANDLE.fileno(), msvcrt.LK_NBLCK, 1)
            log.info("Single-instance lock acquired at %s", LOCK_FILE_PATH)
            return True
        except OSError:
            _LOCK_FILE_HANDLE.close()
            _LOCK_FILE_HANDLE = None
            log.info("Lock already held - this is a secondary launch")
            return False
    except Exception as err:
        log.warning("Lock check failed (%s) - allowing launch anyway", err)
        return True
    # ---------------------------------------------------------------

    # FUNCTION | Signal the running primary instance to show its window, then exit
    # ------------------------------------------------------------
def signal_primary_to_show() -> None:
    try:
        LOCK_DIR.mkdir(parents=True, exist_ok=True)
        SHOW_FLAG_PATH.write_text(datetime.now().isoformat(), encoding="utf-8")
        log.info("Signalled primary instance via %s", SHOW_FLAG_PATH)
    except Exception as err:
        log.warning("Failed to signal primary instance: %s", err)
    # ---------------------------------------------------------------
# endregion -------------------------------------------------------------------


# =============================================================================
# REGION | UI - main application window
# =============================================================================
class PythonAppLauncherApp:
    """Tk application wrapper hosting the Launcher + Settings notebook."""

    # CONSTRUCTOR | Wire up state, widgets, tray thread, and polling hooks
    # ------------------------------------------------------------
    def __init__(self, root: tk.Tk) -> None:
        self.root                    = root
        self.apps: list[LaunchableApp] = []
        self.metadata: dict[str, AppMetadata] = load_app_metadata()              # Per-key {enabled, order, name, description}
        self.tray_icon               = None
        self._tray_thread            = None
        self._last_flag_signature    = None
        self._header_photo: Optional[object] = None                              # Retained ref to prevent PhotoImage garbage collection
        self._settings_checkvars: dict[str, tk.BooleanVar] = {}
        self._settings_name_vars: dict[str, tk.StringVar] = {}
        self._settings_desc_vars: dict[str, tk.StringVar] = {}
        self._settings_order_vars: dict[str, tk.StringVar] = {}
        self._settings_saved_var     = tk.StringVar(value="")
        self._status_var             = tk.StringVar(value=f"Ready - {APP_TITLE} {APP_VERSION}")

        self._configure_root()
        self._build_notebook()
        self.refresh()

        self.root.protocol("WM_DELETE_WINDOW", self._hide_to_tray)
        self._start_show_flag_poller()

        if TRAY_LIBS_AVAILABLE:
            self._spawn_tray_thread()
    # ---------------------------------------------------------------

    # FUNCTION | Basic root-window configuration (title, size, icon, style)
    # ------------------------------------------------------------
    def _configure_root(self) -> None:
        self.root.title(f"{APP_TITLE} - v{APP_VERSION}")
        self.root.geometry(f"{WINDOW_WIDTH}x{WINDOW_HEIGHT}")
        self.root.minsize(760, 480)
        try:
            set_noble_icon(self.root)
        except Exception as err:
            log.debug("Noble icon skipped: %s", err)

        self.root.configure(bg=THEME_BG)

        style = ttk.Style(self.root)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass

        style.configure(".",                background=THEME_BG)                 # Global default for ttk frames / labels / buttons
        style.configure("TFrame",           background=THEME_BG)
        style.configure("TLabel",           background=THEME_BG)
        style.configure("TCheckbutton",     background=THEME_BG)
        style.configure("TSeparator",       background="#dcdde0")
        style.configure("Category.TLabel",  font=("Segoe UI Semibold", 12), padding=(0, 8, 0, 4), background=THEME_BG)
        style.configure("Hint.TLabel",      foreground="#666666", font=("Segoe UI", 8),  background=THEME_BG)
        style.configure("Saved.TLabel",     foreground="#2e7d32", font=("Segoe UI", 9),  background=THEME_BG)
        style.configure("StatusBar.TLabel", padding=(8, 4),       font=("Segoe UI", 9),  background=THEME_BG)
        style.configure("Header.TFrame",    background=THEME_HEADER_BG)
        style.configure("Header.TLabel",    background=THEME_HEADER_BG, foreground=CARD_FG_NAME, font=("Segoe UI Semibold", 16))

        # Modern flat notebook tabs (no bevel, no focus dotted box) ------------
        style.layout("TNotebook.Tab", [                                          # Strips clam's Notebook.focus layer so there is no dotted focus rectangle
            ("Notebook.tab", {
                "sticky"   : "nswe",
                "children" : [
                    ("Notebook.padding", {
                        "side"     : "top",
                        "sticky"   : "nswe",
                        "children" : [
                            ("Notebook.label", {"side": "top", "sticky": ""}),
                        ],
                    }),
                ],
            }),
        ])
        style.configure(
            "TNotebook",
            background  = THEME_BG,
            borderwidth = 0,
            tabmargins  = [10, 6, 10, 0],
        )
        style.configure(
            "TNotebook.Tab",
            padding     = (22, 10),
            font        = ("Segoe UI Semibold", 10),
            background  = TAB_INACTIVE_BG,
            foreground  = TAB_FG,
            borderwidth = 0,
        )
        style.map(
            "TNotebook.Tab",
            background  = [("selected", TAB_ACTIVE_BG), ("active", TAB_HOVER_BG)],
            foreground  = [("selected", TAB_ACTIVE_FG), ("active", TAB_ACTIVE_FG)],
            padding     = [("selected", (22, 10, 22, 10)), ("!selected", (22, 10, 22, 10))],  # Identical geometry both states = no shrunken/expanded look
            expand      = [("selected", [0, 0, 0, 0]),     ("!selected", [0, 0, 0, 0])],      # Neutralise clam's default selected-tab lift
            lightcolor  = [("selected", TAB_ACTIVE_BG),    ("!selected", TAB_INACTIVE_BG)],   # Flatten clam's bevel so tabs read as solid fills
            darkcolor   = [("selected", TAB_ACTIVE_BG),    ("!selected", TAB_INACTIVE_BG)],
            bordercolor = [("selected", TAB_ACTIVE_BG),    ("!selected", TAB_INACTIVE_BG)],
        )
    # ---------------------------------------------------------------

    # FUNCTION | Build the header banner, two-tab notebook, and status bar
    # ------------------------------------------------------------
    def _build_notebook(self) -> None:
        self._build_header_banner(self.root)                                      # Wide Noble logo + app title strip sits above the notebook

        self.notebook            = ttk.Notebook(self.root)
        self.notebook.pack(fill="both", expand=True, padx=10, pady=(6, 4))

        self.launcher_tab        = ttk.Frame(self.notebook)
        self.settings_tab        = ttk.Frame(self.notebook)
        self.notebook.add(self.launcher_tab, text="  App Launcher  ")
        self.notebook.add(self.settings_tab, text="  Settings  ")

        self._build_launcher_tab(self.launcher_tab)
        self._build_settings_tab(self.settings_tab)

        self.status_bar = ttk.Label(self.root, textvariable=self._status_var, style="StatusBar.TLabel", relief="sunken", anchor="w")
        self.status_bar.pack(fill="x", side="bottom")
    # ---------------------------------------------------------------

    # HELPER | Build the white header strip holding the Noble Architecture banner
    # ---------------------------------------------------------------
    def _build_header_banner(self, parent: tk.Widget) -> None:
        header_strip = tk.Frame(parent, bg=THEME_HEADER_BG)
        header_strip.pack(fill="x", side="top")

        self._header_photo = self._load_header_logo(HEADER_LOGO_TARGET_HEIGHT_PX)
        if self._header_photo is not None:
            logo_label = tk.Label(
                header_strip,
                image   = self._header_photo,   # type: ignore[arg-type]
                bg      = THEME_HEADER_BG,
                bd      = 0,
            )
            logo_label.pack(side="left", padx=16, pady=HEADER_PAD_Y)
        else:                                                                     # Fallback: plain text title if PIL/banner unavailable
            tk.Label(
                header_strip,
                text   = APP_TITLE,
                bg     = THEME_HEADER_BG,
                fg     = CARD_FG_NAME,
                font   = ("Segoe UI Semibold", 18),
            ).pack(side="left", padx=16, pady=HEADER_PAD_Y)

        tk.Frame(parent, height=1, bg="#d8dadf").pack(fill="x", side="top")       # Hairline separator under the banner
    # ---------------------------------------------------------------

    # HELPER | Load + resize the header PNG to the target pixel height (returns ImageTk.PhotoImage or None)
    # ---------------------------------------------------------------
    def _load_header_logo(self, target_height_px: int) -> Optional[object]:
        try:
            from PIL import Image as _PilImage, ImageTk as _PilImageTk            # Pillow is bundled as a tray dep; import lazily
        except Exception as err:
            log.warning("Header logo skipped - Pillow import failed: %s", err)
            return None
        if not NOBLE_HEADER_LOGO_PATH.exists():
            log.warning("Header logo missing at %s", NOBLE_HEADER_LOGO_PATH)
            return None
        try:
            with _PilImage.open(NOBLE_HEADER_LOGO_PATH) as img:
                img = img.convert("RGBA")
                orig_w, orig_h = img.size
                if orig_h <= 0:
                    return None
                scale = target_height_px / float(orig_h)
                new_w = max(1, int(round(orig_w * scale)))
                resized = img.resize((new_w, target_height_px), _PilImage.LANCZOS)
                return _PilImageTk.PhotoImage(resized)
        except Exception as err:
            log.warning("Header logo load failed: %s", err)
            return None
    # ---------------------------------------------------------------

    # FUNCTION | Populate the launcher tab with a scrollable grid of category sections
    # ------------------------------------------------------------
    def _build_launcher_tab(self, parent: ttk.Frame) -> None:
        header = ttk.Frame(parent)
        header.pack(fill="x", padx=6, pady=(8, 6))
        ttk.Label(header, text="All tools", font=("Segoe UI Semibold", 13)).pack(side="left")
        ttk.Button(header, text="Refresh", command=self.refresh).pack(side="right")

        self._launcher_scroll_host = ttk.Frame(parent)
        self._launcher_scroll_host.pack(fill="both", expand=True, padx=4, pady=4)
        self._launcher_body = self._make_scrollable_body(self._launcher_scroll_host)
    # ---------------------------------------------------------------

    # FUNCTION | Populate the settings tab with a scrollable checkbox list
    # ------------------------------------------------------------
    def _build_settings_tab(self, parent: ttk.Frame) -> None:
        header = ttk.Frame(parent)
        header.pack(fill="x", padx=6, pady=(8, 6))
        ttk.Label(header, text="Enable / disable apps", font=("Segoe UI Semibold", 12)).pack(side="left")
        ttk.Label(header, textvariable=self._settings_saved_var, style="Saved.TLabel").pack(side="right")

        self._settings_scroll_host = ttk.Frame(parent)
        self._settings_scroll_host.pack(fill="both", expand=True, padx=4, pady=4)
        self._settings_body = self._make_scrollable_body(self._settings_scroll_host)
    # ---------------------------------------------------------------

    # HELPER | Build a scrollable canvas + inner frame, return the inner frame
    # ---------------------------------------------------------------
    def _make_scrollable_body(self, host: ttk.Frame) -> ttk.Frame:
        canvas = tk.Canvas(host, borderwidth=0, highlightthickness=0, bg=THEME_BG)
        vscroll = ttk.Scrollbar(host, orient="vertical", command=canvas.yview)
        canvas.configure(yscrollcommand=vscroll.set)
        canvas.pack(side="left", fill="both", expand=True)
        vscroll.pack(side="right", fill="y")

        inner = ttk.Frame(canvas)
        inner_id = canvas.create_window((0, 0), window=inner, anchor="nw")

        def _on_inner_configure(_event):
            canvas.configure(scrollregion=canvas.bbox("all"))

        def _on_canvas_configure(event):
            canvas.itemconfigure(inner_id, width=event.width)

        def _on_mousewheel(event):
            delta = -1 if event.delta > 0 else 1                                 # Windows delta is +/- 120
            canvas.yview_scroll(delta, "units")

        inner.bind("<Configure>", _on_inner_configure)
        canvas.bind("<Configure>", _on_canvas_configure)
        canvas.bind_all("<MouseWheel>", _on_mousewheel, add="+")
        return inner
    # ---------------------------------------------------------------

    # FUNCTION | Re-run discovery and rebuild both tabs
    # ------------------------------------------------------------
    def refresh(self) -> None:
        self.apps = discover_apps()
        known_keys = {a.key for a in self.apps}

        dirty = False
        for key in list(self.metadata.keys()):                                    # Prune any stale JSON entries for apps that no longer exist
            if key not in known_keys:
                del self.metadata[key]
                dirty = True
        for app in self.apps:                                                     # Seed curated / heuristic defaults for any first-seen key
            if app.key not in self.metadata:
                default_name, default_desc = resolve_default_metadata(app)
                self.metadata[app.key] = AppMetadata(enabled=True, name=default_name, description=default_desc, order=0)
                dirty = True
            else:                                                                 # Fill in any blank fields (e.g. v1 migration leaves name/description empty)
                meta = self.metadata[app.key]
                if not meta.name or not meta.description:
                    default_name, default_desc = resolve_default_metadata(app)
                    if not meta.name:
                        meta.name = default_name
                        dirty = True
                    if not meta.description:
                        meta.description = default_desc
                        dirty = True

        if self._seed_missing_order_values():                                     # Auto-assign order values (10, 20, ...) to any row still at 0
            dirty = True

        if dirty:
            save_app_metadata(self.metadata, known_keys)

        self._rebuild_launcher_body()
        self._rebuild_settings_body()

        self._set_status(f"Discovered {len(self.apps)} app(s) across {len(CATEGORY_FOLDERS)} categories")
        self._update_tray_tooltip()
    # ---------------------------------------------------------------

    # HELPER | Resolve the live (name, description) to show for an app, with fallbacks
    # ---------------------------------------------------------------
    def _effective_metadata(self, app: LaunchableApp) -> tuple[str, str]:
        meta = self.metadata.get(app.key)
        if meta is None:
            return resolve_default_metadata(app)
        name = meta.name.strip() or resolve_default_metadata(app)[0]
        desc = meta.description.strip() or resolve_default_metadata(app)[1]
        return name, desc
    # ---------------------------------------------------------------

    # HELPER | Is this app enabled according to current metadata?
    # ---------------------------------------------------------------
    def _is_enabled(self, app: LaunchableApp) -> bool:
        meta = self.metadata.get(app.key)
        return True if meta is None else bool(meta.enabled)
    # ---------------------------------------------------------------

    # HELPER | Effective order (0 -> very large so unset rows fall to the end)
    # ---------------------------------------------------------------
    def _order_of(self, app: LaunchableApp) -> int:
        meta = self.metadata.get(app.key)
        if meta is None or meta.order <= 0:
            return 9_999
        return int(meta.order)
    # ---------------------------------------------------------------

    # HELPER | Sort apps by (order asc, display_name asc) for stable ordering
    # ---------------------------------------------------------------
    def _sort_apps_by_order(self, apps: list[LaunchableApp]) -> list[LaunchableApp]:
        return sorted(apps, key=lambda a: (self._order_of(a), a.display_name.lower(), a.key))
    # ---------------------------------------------------------------

    # HELPER | Seed order=10,20,30... per-category for any apps still at order 0
    # ---------------------------------------------------------------
    def _seed_missing_order_values(self) -> bool:
        changed = False
        by_category: dict[str, list[LaunchableApp]] = {}
        for app in self.apps:
            by_category.setdefault(app.category_folder, []).append(app)

        for category_folder in CATEGORY_FOLDERS:
            cat_apps = by_category.get(category_folder, [])
            if not cat_apps:
                continue
            cat_apps_sorted = sorted(cat_apps, key=lambda a: a.display_name.lower())

            used_orders = {
                self.metadata[a.key].order
                for a in cat_apps_sorted
                if a.key in self.metadata and self.metadata[a.key].order > 0
            }
            next_order = DEFAULT_ORDER_STEP
            for app in cat_apps_sorted:
                meta = self.metadata.get(app.key)
                if meta is None or meta.order > 0:
                    continue
                while next_order in used_orders:                                  # Never collide with an explicit user value
                    next_order += DEFAULT_ORDER_STEP
                meta.order = next_order
                used_orders.add(next_order)
                next_order += DEFAULT_ORDER_STEP
                changed = True
        return changed
    # ---------------------------------------------------------------

    # HELPER | Rebuild the launcher tab's grid from current state (white card buttons)
    # ---------------------------------------------------------------
    def _rebuild_launcher_body(self) -> None:
        for child in self._launcher_body.winfo_children():
            child.destroy()

        enabled_by_category: dict[str, list[LaunchableApp]] = {}
        for app in self.apps:
            if not self._is_enabled(app):
                continue
            enabled_by_category.setdefault(app.category_folder, []).append(app)
        for cat_key, cat_list in enabled_by_category.items():                     # Honour the per-app `order` value inside each group
            enabled_by_category[cat_key] = self._sort_apps_by_order(cat_list)

        if not enabled_by_category:
            ttk.Label(
                self._launcher_body,
                text    = "No apps enabled.\nEnable one from the Settings tab.",
                justify = "center",
                padding = 24,
            ).pack(anchor="center")
            return

        for category_folder in CATEGORY_FOLDERS:                                 # Renders in the order defined by CATEGORY_FOLDERS
            category_apps = enabled_by_category.get(category_folder)
            if not category_apps:
                continue
            category_label_text = _derive_category_label(category_folder)
            ttk.Label(self._launcher_body, text=category_label_text, style="Category.TLabel").pack(anchor="w", padx=8, pady=(10, 0))
            ttk.Separator(self._launcher_body, orient="horizontal").pack(fill="x", padx=8, pady=(0, 6))

            grid_frame = ttk.Frame(self._launcher_body)
            grid_frame.pack(fill="x", padx=8, pady=(0, 6))
            for col_index in range(BUTTON_COLUMN_COUNT):
                grid_frame.columnconfigure(col_index, weight=1, uniform="launcher_col")

            for idx, app in enumerate(category_apps):
                row = idx // BUTTON_COLUMN_COUNT
                col = idx % BUTTON_COLUMN_COUNT
                card = self._build_launcher_card(grid_frame, app)
                card.grid(row=row, column=col, padx=6, pady=6, sticky="nsew")
    # ---------------------------------------------------------------

    # HELPER | Build a single rounded white card button for the launcher grid
    # ---------------------------------------------------------------
    def _build_launcher_card(self, parent: tk.Widget, app: LaunchableApp) -> tk.Canvas:
        name, description = self._effective_metadata(app)

        canvas = tk.Canvas(
            parent,
            bg                  = THEME_BG,
            highlightthickness  = 0,
            bd                  = 0,
            height              = CARD_MIN_HEIGHT_PX,
            cursor              = "hand2",
        )

        shape_id = canvas.create_polygon(
            self._rounded_rect_points(2, 2, 10, CARD_MIN_HEIGHT_PX - 2, CARD_CORNER_RADIUS_PX),
            smooth  = True,
            splinesteps = 36,
            fill    = CARD_BG_DEFAULT,
            outline = CARD_BORDER_DEFAULT,
            width   = 1,
        )

        inner = tk.Frame(canvas, bg=CARD_BG_DEFAULT)
        name_lbl = tk.Label(
            inner,
            text        = name,
            bg          = CARD_BG_DEFAULT,
            fg          = CARD_FG_NAME,
            font        = ("Segoe UI Semibold", 11),
            wraplength  = CARD_NAME_WRAPLENGTH_PX,
            anchor      = "w",
            justify     = "left",
            cursor      = "hand2",
        )
        name_lbl.pack(fill="x", anchor="w")
        desc_lbl = tk.Label(
            inner,
            text        = description,
            bg          = CARD_BG_DEFAULT,
            fg          = CARD_FG_DESCRIPTION,
            font        = ("Segoe UI", 9),
            wraplength  = CARD_DESC_WRAPLENGTH_PX,
            anchor      = "w",
            justify     = "left",
            cursor      = "hand2",
        )
        desc_lbl.pack(fill="both", expand=True, anchor="w", pady=(3, 0))

        window_id = canvas.create_window(14, 12, anchor="nw", window=inner)

        click_widgets = (canvas, inner, name_lbl, desc_lbl)

        # -- Redraw the rounded shape + reflow labels when the cell resizes --
        def _on_canvas_configure(event, cv=canvas, sid=shape_id, win=window_id, nl=name_lbl, dl=desc_lbl):
            w = max(event.width, 40)
            h = max(event.height, 40)
            cv.coords(sid, *self._rounded_rect_points(2, 2, w - 2, h - 2, CARD_CORNER_RADIUS_PX))
            inner_width = max(w - 28, 80)
            nl.configure(wraplength=inner_width)
            dl.configure(wraplength=inner_width)
            cv.itemconfigure(win, width=inner_width)
            cv.coords(win, 14, 12)
        canvas.bind("<Configure>", _on_canvas_configure)

        # -- Auto-grow the canvas to fit the wrapped name + description --
        def _on_inner_configure(event, cv=canvas):
            needed = event.height + 24                                           # 12px top + 12px bottom padding around the inner frame
            target = max(CARD_MIN_HEIGHT_PX, needed)
            if cv.winfo_reqheight() != target:
                cv.configure(height=target)                                      # Grid row height follows the tallest canvas in the row
        inner.bind("<Configure>", _on_inner_configure)

        def _set_state(bg: str, border: str) -> None:
            canvas.itemconfigure(shape_id, fill=bg, outline=border)
            inner.configure(bg=bg)
            name_lbl.configure(bg=bg)
            desc_lbl.configure(bg=bg)

        def _on_click(_event, a=app):
            self._on_launch_click(a)

        def _on_enter(_event):
            _set_state(CARD_BG_HOVER, CARD_BORDER_HOVER)

        def _on_leave(_event):
            _set_state(CARD_BG_DEFAULT, CARD_BORDER_DEFAULT)

        for widget in click_widgets:
            widget.bind("<Button-1>", _on_click)
            widget.bind("<Enter>",    _on_enter)
            widget.bind("<Leave>",    _on_leave)

        return canvas
    # ---------------------------------------------------------------

    # HELPER | Compute the polygon points for a rounded rectangle (for Canvas.create_polygon + smooth=True)
    # ---------------------------------------------------------------
    @staticmethod
    def _rounded_rect_points(x1: float, y1: float, x2: float, y2: float, r: float) -> list[float]:
        r = max(0.0, min(r, (x2 - x1) / 2.0, (y2 - y1) / 2.0))
        return [
            x1 + r, y1,
            x2 - r, y1,
            x2,     y1,
            x2,     y1 + r,
            x2,     y2 - r,
            x2,     y2,
            x2 - r, y2,
            x1 + r, y2,
            x1,     y2,
            x1,     y2 - r,
            x1,     y1 + r,
            x1,     y1,
        ]
    # ---------------------------------------------------------------

    # HELPER | Rebuild the settings tab's editable list from current state
    # ---------------------------------------------------------------
    def _rebuild_settings_body(self) -> None:
        for child in self._settings_body.winfo_children():
            child.destroy()
        self._settings_checkvars.clear()
        self._settings_name_vars.clear()
        self._settings_desc_vars.clear()
        self._settings_order_vars.clear()

        apps_by_category: dict[str, list[LaunchableApp]] = {}
        for app in self.apps:
            apps_by_category.setdefault(app.category_folder, []).append(app)
        for cat_key, cat_list in apps_by_category.items():                        # Same ordering as the launcher grid so what-you-edit = what-you-see
            apps_by_category[cat_key] = self._sort_apps_by_order(cat_list)

        if not self.apps:
            ttk.Label(
                self._settings_body,
                text    = "No apps discovered. Check the category folders exist.",
                padding = 24,
            ).pack(anchor="center")
            return

        intro_frame = ttk.Frame(self._settings_body)
        intro_frame.pack(fill="x", padx=8, pady=(6, 6))
        ttk.Label(
            intro_frame,
            text    = "Toggle apps on/off, edit their button Name and Description (autosaves on blur or Enter).",
            style   = "Hint.TLabel",
        ).pack(side="left")

        for category_folder in CATEGORY_FOLDERS:
            category_apps = apps_by_category.get(category_folder)
            if not category_apps:
                continue
            category_label_text = _derive_category_label(category_folder)

            header_frame = ttk.Frame(self._settings_body)
            header_frame.pack(fill="x", padx=8, pady=(12, 0))
            ttk.Label(header_frame, text=category_label_text, style="Category.TLabel").pack(side="left")
            ttk.Button(
                header_frame,
                text    = "Enable all",
                width   = 12,
                command = lambda cf=category_folder: self._bulk_set_category(cf, enable=True),
            ).pack(side="right", padx=(4, 0))
            ttk.Button(
                header_frame,
                text    = "Disable all",
                width   = 12,
                command = lambda cf=category_folder: self._bulk_set_category(cf, enable=False),
            ).pack(side="right", padx=(4, 0))

            ttk.Separator(self._settings_body, orient="horizontal").pack(fill="x", padx=8, pady=(2, 4))

            rows_frame = ttk.Frame(self._settings_body)
            rows_frame.pack(fill="x", padx=12, pady=(0, 6))

            for app in category_apps:
                self._build_settings_row(rows_frame, app)
    # ---------------------------------------------------------------

    # HELPER | One editable settings row (checkbox + order spinbox + Name + Description + Reset)
    # ---------------------------------------------------------------
    def _build_settings_row(self, parent: tk.Widget, app: LaunchableApp) -> None:
        current_name, current_desc = self._effective_metadata(app)
        enabled_now = self._is_enabled(app)
        current_order = self._order_of(app) if self._order_of(app) < 9_999 else 0

        row_wrap = ttk.Frame(parent)
        row_wrap.pack(fill="x", pady=(6, 4))

        top_row = ttk.Frame(row_wrap)
        top_row.pack(fill="x")

        enabled_var = tk.BooleanVar(value=enabled_now)
        self._settings_checkvars[app.key] = enabled_var
        ttk.Checkbutton(
            top_row,
            text     = "",
            variable = enabled_var,
            command  = lambda a=app, v=enabled_var: self._on_setting_toggle(a, v),
        ).pack(side="left", padx=(0, 6))

        order_var = tk.StringVar(value=str(current_order))
        self._settings_order_vars[app.key] = order_var
        ttk.Label(top_row, text="#", style="Hint.TLabel").pack(side="left", padx=(0, 2))
        order_spin = ttk.Spinbox(
            top_row,
            from_         = 0,
            to            = 9999,
            increment     = 1,
            width         = 5,
            textvariable  = order_var,
            font          = ("Segoe UI", 10),
            command       = lambda a=app: self._on_order_committed(a),            # Covers the up/down arrows
        )
        order_spin.pack(side="left", padx=(0, 8))
        order_spin.bind("<FocusOut>", lambda _e, a=app: self._on_order_committed(a))
        order_spin.bind("<Return>",   lambda _e, a=app: self._on_order_committed(a))

        name_var = tk.StringVar(value=current_name)
        self._settings_name_vars[app.key] = name_var
        name_entry = ttk.Entry(top_row, textvariable=name_var, width=34, font=("Segoe UI Semibold", 10))
        name_entry.pack(side="left", padx=(0, 8))
        name_entry.bind("<FocusOut>", lambda _e, a=app: self._on_name_committed(a))
        name_entry.bind("<Return>",   lambda _e, a=app: self._on_name_committed(a))

        ttk.Button(
            top_row,
            text    = "Reset to default",
            width   = 18,
            command = lambda a=app: self._reset_metadata_to_default(a),
        ).pack(side="right", padx=(4, 0))

        ttk.Label(top_row, text=app.relative_hint, style="Hint.TLabel").pack(side="right", padx=(0, 8))

        bottom_row = ttk.Frame(row_wrap)
        bottom_row.pack(fill="x", padx=(28, 0), pady=(3, 0))

        desc_var = tk.StringVar(value=current_desc)
        self._settings_desc_vars[app.key] = desc_var
        desc_entry = ttk.Entry(bottom_row, textvariable=desc_var, font=("Segoe UI", 9))
        desc_entry.pack(fill="x", expand=True)
        desc_entry.bind("<FocusOut>", lambda _e, a=app: self._on_description_committed(a))
        desc_entry.bind("<Return>",   lambda _e, a=app: self._on_description_committed(a))
    # ---------------------------------------------------------------

    # EVENT HANDLER | Launcher-tab button click
    # ---------------------------------------------------------------
    def _on_launch_click(self, app: LaunchableApp) -> None:
        launch_app(app)
        name, _ = self._effective_metadata(app)
        flat_label = name.replace("\n", " - ")
        self._set_status(f"Launched: {flat_label}")
    # ---------------------------------------------------------------

    # EVENT HANDLER | Settings-tab checkbox toggle - autosaves
    # ---------------------------------------------------------------
    def _on_setting_toggle(self, app: LaunchableApp, var: tk.BooleanVar) -> None:
        meta = self._ensure_metadata_for(app)
        meta.enabled = bool(var.get())
        self._persist_and_toast()
        self._rebuild_launcher_body()
    # ---------------------------------------------------------------

    # EVENT HANDLER | Bulk enable/disable for a whole category
    # ---------------------------------------------------------------
    def _bulk_set_category(self, category_folder: str, *, enable: bool) -> None:
        for app in self.apps:
            if app.category_folder != category_folder:
                continue
            meta = self._ensure_metadata_for(app)
            meta.enabled = enable
            if app.key in self._settings_checkvars:
                self._settings_checkvars[app.key].set(enable)
        self._persist_and_toast()
        self._rebuild_launcher_body()
    # ---------------------------------------------------------------

    # EVENT HANDLER | Name entry committed (Enter or focus-out)
    # ---------------------------------------------------------------
    def _on_name_committed(self, app: LaunchableApp) -> None:
        var = self._settings_name_vars.get(app.key)
        if var is None:
            return
        new_value = var.get().strip()
        meta = self._ensure_metadata_for(app)
        if not new_value:                                                         # Blank -> snap back to the curated / heuristic default
            new_value = resolve_default_metadata(app)[0]
            var.set(new_value)
        if meta.name == new_value:
            return
        meta.name = new_value
        self._persist_and_toast()
        self._rebuild_launcher_body()
    # ---------------------------------------------------------------

    # EVENT HANDLER | Order spinbox committed (arrow click, Enter, or focus-out)
    # ---------------------------------------------------------------
    def _on_order_committed(self, app: LaunchableApp) -> None:
        var = self._settings_order_vars.get(app.key)
        if var is None:
            return
        raw_value = var.get().strip() or "0"
        try:
            new_order = max(0, min(9999, int(raw_value)))
        except ValueError:
            new_order = 0
        var.set(str(new_order))
        meta = self._ensure_metadata_for(app)
        if meta.order == new_order:
            return
        meta.order = new_order
        self._persist_and_toast()
        self._rebuild_launcher_body()
        self._rebuild_settings_body()                                             # Re-sort rows so the UI reflects the new ordering
    # ---------------------------------------------------------------

    # EVENT HANDLER | Description entry committed (Enter or focus-out)
    # ---------------------------------------------------------------
    def _on_description_committed(self, app: LaunchableApp) -> None:
        var = self._settings_desc_vars.get(app.key)
        if var is None:
            return
        new_value = var.get().strip()
        meta = self._ensure_metadata_for(app)
        if not new_value:
            new_value = resolve_default_metadata(app)[1]
            var.set(new_value)
        if meta.description == new_value:
            return
        meta.description = new_value
        self._persist_and_toast()
        self._rebuild_launcher_body()
    # ---------------------------------------------------------------

    # EVENT HANDLER | Reset this row's name + description back to the curated default
    # ---------------------------------------------------------------
    def _reset_metadata_to_default(self, app: LaunchableApp) -> None:
        default_name, default_desc = resolve_default_metadata(app)
        meta = self._ensure_metadata_for(app)
        meta.name        = default_name
        meta.description = default_desc
        if app.key in self._settings_name_vars:
            self._settings_name_vars[app.key].set(default_name)
        if app.key in self._settings_desc_vars:
            self._settings_desc_vars[app.key].set(default_desc)
        self._persist_and_toast()
        self._rebuild_launcher_body()
    # ---------------------------------------------------------------

    # HELPER | Lazy-create the AppMetadata entry for this app so mutations always land
    # ---------------------------------------------------------------
    def _ensure_metadata_for(self, app: LaunchableApp) -> AppMetadata:
        meta = self.metadata.get(app.key)
        if meta is None:
            default_name, default_desc = resolve_default_metadata(app)
            meta = AppMetadata(enabled=True, name=default_name, description=default_desc)
            self.metadata[app.key] = meta
        return meta
    # ---------------------------------------------------------------

    # HELPER | Persist the metadata map and flash the "Saved at" indicator
    # ---------------------------------------------------------------
    def _persist_and_toast(self) -> None:
        known_keys = {a.key for a in self.apps}
        save_app_metadata(self.metadata, known_keys)
        self._settings_saved_var.set(f"Saved at {datetime.now().strftime('%H:%M:%S')}")
        self._update_tray_tooltip()
    # ---------------------------------------------------------------

    # HELPER | Status bar toast
    # ---------------------------------------------------------------
    def _set_status(self, text: str) -> None:
        self._status_var.set(text)
    # ---------------------------------------------------------------

    # =============================================================================
    # REGION | SYSTEM TRAY - pystray icon, menu wiring, show/hide/quit handlers
    # =============================================================================

    # FUNCTION | Spawn the pystray daemon thread that runs the tray icon event loop
    # ------------------------------------------------------------
    def _spawn_tray_thread(self) -> None:
        try:
            self.tray_icon = self._build_tray_icon()
        except Exception as err:
            log.warning("Tray icon construction failed: %s", err)
            self.tray_icon = None
            return
        self._tray_thread = threading.Thread(target=self._run_tray_loop, daemon=True, name="TrayIconThread")
        self._tray_thread.start()
    # ---------------------------------------------------------------

    # HELPER | Run the pystray loop, isolated for exception logging
    # ---------------------------------------------------------------
    def _run_tray_loop(self) -> None:
        try:
            self.tray_icon.run()
        except Exception as err:
            log.exception("Tray loop crashed: %s", err)
    # ---------------------------------------------------------------

    # FUNCTION | Build the pystray.Icon (Noble logo, menu, tooltip)
    # ------------------------------------------------------------
    def _build_tray_icon(self):
        icon_image = self._load_tray_image()
        menu = TrayMenu(
            TrayMenuItem("Open Menu",     self._tray_open_menu, default=True),   # Default = left-click action
            TrayMenu.SEPARATOR,
            TrayMenuItem("Refresh Apps",  self._tray_refresh_apps),
            TrayMenu.SEPARATOR,
            TrayMenuItem("Exit",          self._tray_exit),
        )
        return pystray.Icon(
            name   = "PythonAppLauncher",
            icon   = icon_image,
            title  = self._compose_tray_tooltip(),
            menu   = menu,
        )
    # ---------------------------------------------------------------

    # HELPER | Load the Noble Arch PNG as a PIL image (fallback to grey square)
    # ---------------------------------------------------------------
    def _load_tray_image(self):
        try:
            if NOBLE_TRAY_ICON_PATH.is_file():
                return PilImage.open(NOBLE_TRAY_ICON_PATH)
            log.warning("Noble tray icon not found at %s - using fallback", NOBLE_TRAY_ICON_PATH)
        except Exception as err:
            log.warning("Tray icon load failed (%s) - using fallback", err)
        return PilImage.new("RGB", (64, 64), color=(64, 64, 64))                 # Neutral grey fallback so the app still starts
    # ---------------------------------------------------------------

    # HELPER | Tooltip text for the tray icon
    # ---------------------------------------------------------------
    def _compose_tray_tooltip(self) -> str:
        count = sum(1 for a in self.apps if self._is_enabled(a))
        return f"{APP_TITLE} - {count} app(s) enabled"
    # ---------------------------------------------------------------

    # HELPER | Push an updated tooltip to the live tray icon
    # ---------------------------------------------------------------
    def _update_tray_tooltip(self) -> None:
        if self.tray_icon is None:
            return
        try:
            self.tray_icon.title = self._compose_tray_tooltip()
        except Exception:
            pass
    # ---------------------------------------------------------------

    # EVENT HANDLER | Tray "Open Menu" / left-click
    # ---------------------------------------------------------------
    def _tray_open_menu(self, _icon=None, _item=None) -> None:
        self.root.after(0, self._show_window)                                    # Marshal to Tk thread
    # ---------------------------------------------------------------

    # EVENT HANDLER | Tray "Refresh Apps"
    # ---------------------------------------------------------------
    def _tray_refresh_apps(self, _icon=None, _item=None) -> None:
        self.root.after(0, self.refresh)
    # ---------------------------------------------------------------

    # EVENT HANDLER | Tray "Exit"
    # ---------------------------------------------------------------
    def _tray_exit(self, _icon=None, _item=None) -> None:
        self.root.after(0, self._quit_app)
    # ---------------------------------------------------------------

    # FUNCTION | Show + raise + focus the main window
    # ------------------------------------------------------------
    def _show_window(self) -> None:
        try:
            self.root.deiconify()
            self.root.lift()
            self.root.focus_force()
            self.root.attributes("-topmost", True)
            self.root.after(150, lambda: self.root.attributes("-topmost", False))
        except Exception as err:
            log.debug("Show-window issue: %s", err)
    # ---------------------------------------------------------------

    # FUNCTION | Hide the main window (tray icon keeps app alive)
    # ------------------------------------------------------------
    def _hide_to_tray(self) -> None:
        if self.tray_icon is None:
            self._quit_app()                                                      # No tray available = X really quits
            return
        log.info("Hiding window to tray")
        try:
            self.root.withdraw()
        except Exception as err:
            log.debug("Hide-to-tray issue: %s", err)
    # ---------------------------------------------------------------

    # FUNCTION | Fully shut down tray + Tk + release the single-instance lock
    # ------------------------------------------------------------
    def _quit_app(self) -> None:
        log.info("Shutting down")
        if self.tray_icon is not None:
            try:
                self.tray_icon.stop()
            except Exception as err:
                log.debug("Tray stop issue: %s", err)
            self.tray_icon = None
        global _LOCK_FILE_HANDLE
        if _LOCK_FILE_HANDLE is not None:
            try:
                if _MSVCRT_AVAILABLE:
                    try:
                        msvcrt.locking(_LOCK_FILE_HANDLE.fileno(), msvcrt.LK_UNLCK, 1)
                    except OSError:
                        pass
                _LOCK_FILE_HANDLE.close()
            except Exception:
                pass
            _LOCK_FILE_HANDLE = None
        try:
            self.root.destroy()
        except Exception:
            pass
    # ---------------------------------------------------------------

    # FUNCTION | Poll show.flag so a secondary launch can raise the existing window
    # ------------------------------------------------------------
    def _start_show_flag_poller(self) -> None:
        self._poll_show_flag()
    # ---------------------------------------------------------------

    # HELPER | Actually check the flag file signature
    # ---------------------------------------------------------------
    def _poll_show_flag(self) -> None:
        try:
            if SHOW_FLAG_PATH.exists():
                sig = SHOW_FLAG_PATH.stat().st_mtime_ns
                if sig != self._last_flag_signature:
                    self._last_flag_signature = sig
                    log.info("show.flag signal received - raising window")
                    self._show_window()
        except Exception as err:
            log.debug("show.flag poll issue: %s", err)
        self.root.after(SHOW_FLAG_POLL_INTERVAL_MS, self._poll_show_flag)
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------


# =============================================================================
# REGION | ENTRY POINT
# =============================================================================
def main() -> int:
    if not acquire_single_instance_lock():
        signal_primary_to_show()
        log.info("Secondary instance exiting cleanly")
        return 0

    try:
        SHOW_FLAG_PATH.unlink()                                                   # Clear any stale flag left over from a previous run
    except FileNotFoundError:
        pass
    except Exception as err:
        log.debug("show.flag cleanup skipped: %s", err)

    root = tk.Tk()
    app = PythonAppLauncherApp(root)                                              # noqa: F841 - keep reference so tray thread isn't orphaned
    try:
        root.mainloop()
    except KeyboardInterrupt:
        app._quit_app()                                                            # noqa: SLF001
    log.info("=== Python App Launcher exited ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
# endregion -------------------------------------------------------------------
