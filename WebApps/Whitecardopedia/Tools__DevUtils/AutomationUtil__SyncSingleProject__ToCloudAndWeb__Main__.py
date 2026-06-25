#!/usr/bin/env python3
# =============================================================================
# WHITECARDOPEDIA - SINGLE PROJECT SYNC ORCHESTRATOR
# =============================================================================
#
# FILE       : AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py
# NAMESPACE  : Whitecardopedia
# MODULE     : Single Project Sync Orchestrator
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Fast single-project sync from local production folder to
#              Cloudflare R2 + Whitecardopedia working copy. Called from
#              the ValeVision Cloud Sync SketchUp plugin.
# CREATED    : 25-Jun-2026
#
# DESCRIPTION:
# - Accepts --project <folder_name>, --year <YY>, --action <all|images|cameras>
# - Chains: clone images -> generate 524p thumbnails -> upload R2 -> merge project.json
# - Merges ValeVison3D__SketchUpCameraData key into web + R2 project.json (key-scoped,
#   no full-overwrite) to preserve fog / render-engine / presentation data.
# - Emits a JSON report on stdout for the Ruby orchestrator to parse.
# - R2 auth reuses Token__CloudflareAPI.env (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
#   R2_BUCKET_NAME, R2_ENDPOINT).
# - Reuses modules from FetchLocalProjects and BuildCloudflareBucket rather than
#   duplicating logic.
#
# USAGE:
#   python AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py \
#       --project "AB01__MyHouse__Whitecard" --year 26 --action all --json
#
# =============================================================================

import os
import sys
import json
import re
import shutil
import argparse
import time
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List

# Ensure we can import sibling modules from Tools__DevUtils
_SCRIPT_DIR = Path(__file__).parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

# -----------------------------------------------------------------------------
# REGION | Module Constants and Configuration
# -----------------------------------------------------------------------------

# MODULE CONSTANTS | Paths and Prefixes
# ------------------------------------------------------------
LOCAL_PROJECTS_BASE          = Path(r"C:\01__ValeProjects")          # <-- Base folder with year subfolders
WCP_PROJECTS_BASE            = _SCRIPT_DIR.parent / "Projects"       # <-- Whitecardopedia projects root
CONTENT_DELIVERED_SUBFOLDER  = "10__ContentDelivered__Local"         # <-- Content delivery subfolder
IMAGE_SUFFIX_PATTERN         = r'__WhitecardImage__'                 # <-- Image filename marker
CAMERA_DATA_KEY              = "ValeVison3D__SketchUpCameraData"     # <-- Key to merge (one 'i' — matches web app)
PROJECT_DATA_SUBFOLDER       = "00__ProjectData"                     # <-- Local project data folder
PROJECT_DATA_SUFFIX          = "__ProjectData__.json"                # <-- Project data file suffix
PROJECT_JSON_FILENAME        = "project.json"                        # <-- Web project metadata file
R2_BASE_PREFIX               = "VaApps/Projects"                     # <-- R2 root prefix
ENV_FILE_PATH                = _SCRIPT_DIR / "API__Cloudflare" / "Token__CloudflareAPI.env"  # <-- Cloudflare credentials
THUMBNAIL_SCRIPT             = _SCRIPT_DIR / "AutomationUtil__GenerateGalleryThumbnails__524p__Main__.py"
FETCH_SCRIPT                 = _SCRIPT_DIR / "AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py"
# ------------------------------------------------------------

# MODULE CONSTANTS | Console Colours
# ------------------------------------------------------------
COLOR_RESET  = '\033[0m'
COLOR_GREEN  = '\033[92m'
COLOR_YELLOW = '\033[93m'
COLOR_RED    = '\033[91m'
COLOR_CYAN   = '\033[96m'
COLOR_BLUE   = '\033[94m'
# ------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Report Builder
# -----------------------------------------------------------------------------

class SyncReport:
    """Accumulates step results and emits a JSON report at the end."""

    def __init__(self, project_folder: str, action: str):
        self.project_folder = project_folder
        self.action         = action
        self.started_at     = datetime.now().strftime('%d-%b-%Y at %H:%M')
        self.steps: List[Dict] = []
        self.uploaded        = 0
        self.mirrored        = 0
        self.elapsed_ms      = 0
        self._start_time     = time.time()

    def add_step(self, label: str, success: bool, message: str, **extras):
        step = {'label': label, 'success': success, 'message': message}
        step.update(extras)
        self.steps.append(step)
        color = COLOR_GREEN if success else COLOR_RED
        print(f"  {color}{'✔' if success else '✗'}{COLOR_RESET}  {label}: {message}")

    def finalise(self) -> Dict:
        self.elapsed_ms = int((time.time() - self._start_time) * 1000)
        all_ok  = all(s['success'] for s in self.steps)
        message = f"Sync complete ({self.action})." if all_ok else "Sync completed with errors — see step details."
        report  = {
            'success':    all_ok,
            'message':    message,
            'project':    self.project_folder,
            'action':     self.action,
            'started_at': self.started_at,
            'elapsed_ms': self.elapsed_ms,
            'uploaded':   self.uploaded,
            'mirrored':   self.mirrored,
            'steps':      self.steps
        }
        return report

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Path Resolution
# -----------------------------------------------------------------------------

def na_resolve_local_project_root(project_folder: str, year: str) -> Optional[Path]:
    """Walk LOCAL_PROJECTS_BASE/ValeProjects__{year}/ and find the project folder."""
    full_year = f"20{year}" if len(year) == 2 else year
    year_dir  = LOCAL_PROJECTS_BASE / f"ValeProjects__{full_year}"   # <-- Local year folder carries ValeProjects__ prefix
    if not year_dir.is_dir():
        return None
    candidate = year_dir / project_folder
    return candidate if candidate.is_dir() else None


def na_derive_web_folder_name(local_folder: str) -> str:
    """Local '..__Whitecard' folder -> Whitecardopedia/R2 folder name (suffix stripped)."""
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("na_fetch_local_projects", FETCH_SCRIPT)
        mod  = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        web = mod.generate_destination_folder_name(local_folder)   # <-- Canonical transform (strips type suffix)
        if web:
            return web
    except Exception:
        pass
    for suffix in ('__Whitecard', '__Blockout', '__MaxModel'):     # <-- Fallback strip if import unavailable
        if local_folder.endswith(suffix):
            return local_folder[: -len(suffix)]
    return local_folder


def na_resolve_wcp_project_dir(project_folder: str, year: str) -> Path:
    """Return the Whitecardopedia project directory path (may not exist yet)."""
    full_year = f"20{year}" if len(year) == 2 else year
    return WCP_PROJECTS_BASE / full_year / project_folder


def na_find_latest_edition_folder(content_dir: Path) -> Optional[Path]:
    """Find the most recent VisDpt__Whitecard__*Edition* folder."""
    if not content_dir.is_dir():
        return None
    candidates = sorted(
        [d for d in content_dir.iterdir() if d.is_dir() and 'Whitecard' in d.name and 'Edition' in d.name],
        key=lambda d: d.stat().st_mtime,
        reverse=True
    )
    return candidates[0] if candidates else None


def na_find_project_data_file(project_root: Path) -> Optional[Path]:
    """Find the *__ProjectData__.json file in 00__ProjectData."""
    data_dir = project_root / PROJECT_DATA_SUBFOLDER
    if not data_dir.is_dir():
        return None
    matches = list(data_dir.glob('*__ProjectData__.json'))
    return matches[0] if matches else None

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Image Cloning
# -----------------------------------------------------------------------------

def na_clone_images_to_wcp(local_project_root: Path, wcp_project_dir: Path, report: SyncReport) -> int:
    """Copy the latest edition's IMG## images into the Whitecardopedia project folder."""
    content_dir   = local_project_root / CONTENT_DELIVERED_SUBFOLDER
    edition_folder = na_find_latest_edition_folder(content_dir)

    if not edition_folder:
        report.add_step('Clone Images', False, 'No edition folder found in ContentDelivered.')
        return 0

    wcp_project_dir.mkdir(parents=True, exist_ok=True)
    img_pattern = re.compile(r'^IMG\d{2,3}.*__WhitecardImage__.*\.png$', re.IGNORECASE)
    img_files   = [f for f in edition_folder.iterdir() if f.is_file() and img_pattern.match(f.name)]

    if not img_files:
        report.add_step('Clone Images', False, f'No IMG## WhitecardImage PNG files found in {edition_folder.name}.')
        return 0

    # PURGE STALE IMG SOURCES + THUMBNAILS | Keep the destination mirroring the latest edition only
    stale_pattern = re.compile(r'^IMG.*\.(png|jpg|jpeg|webp)$', re.IGNORECASE)
    purged        = 0
    for existing in wcp_project_dir.iterdir():
        if existing.is_file() and stale_pattern.match(existing.name):
            existing.unlink()                        # <-- Remove superseded image / thumbnail
            purged += 1

    copied = 0
    for img_file in img_files:
        dest = wcp_project_dir / img_file.name
        shutil.copy2(img_file, dest)
        copied += 1

    purge_note = f' (purged {purged} stale)' if purged else ''
    report.add_step('Clone Images', True, f'Cloned {copied} image(s) from {edition_folder.name}{purge_note}.')
    report.mirrored += copied
    return copied


def na_update_project_json_images(wcp_project_dir: Path, report: SyncReport) -> List[str]:
    """Rebuild project.json 'images' from the IMG## PNGs actually present in the
    Whitecardopedia folder, so freshly-cloned scenes (e.g. IMG02) appear and stale
    filenames (old dates / removed scenes) are dropped. Returns the new list."""
    project_json_path = wcp_project_dir / PROJECT_JSON_FILENAME
    if not project_json_path.exists():
        report.add_step('Update Image List', False, f'project.json not found at {project_json_path}.')
        return []

    # Collect current IMG## source PNGs (exclude our generated thumbnails)
    img_pattern   = re.compile(r'^IMG\d{2,3}.*__WhitecardImage__.*\.png$', re.IGNORECASE)
    source_images = sorted(
        f.name for f in wcp_project_dir.iterdir()
        if f.is_file() and img_pattern.match(f.name) and '__Thumbnail__524p__' not in f.name
    )

    if not source_images:
        report.add_step('Update Image List', False, 'No IMG## source PNGs found in Whitecardopedia folder.')
        return []

    try:
        existing            = json.loads(project_json_path.read_text(encoding='utf-8'))
        previous            = existing.get('images', [])
        existing['images']  = source_images

        tmp_path = project_json_path.with_suffix('.tmp.json')
        tmp_path.write_text(json.dumps(existing, indent=4), encoding='utf-8')
        tmp_path.replace(project_json_path)

        changed = 'updated' if previous != source_images else 'unchanged'
        report.add_step('Update Image List', True,
                        f"project.json images {changed} — {len(source_images)} scene(s): {', '.join(source_images)}.")
        return source_images
    except Exception as exc:
        report.add_step('Update Image List', False, f'Could not rewrite images array: {exc}')
        return []

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Thumbnail Generation
# -----------------------------------------------------------------------------

def na_generate_thumbnails(year: str, web_folder: str, report: SyncReport):
    """Call the 524p thumbnail generator for the project."""
    if not THUMBNAIL_SCRIPT.exists():
        report.add_step('Generate Thumbnails', False, f'Thumbnail script not found: {THUMBNAIL_SCRIPT.name}')
        return

    full_year = f"20{year}" if len(year) == 2 else year
    folder_id = f"{full_year}/{web_folder}"          # <-- folderId is relative to Projects/ (e.g. 2026/63592__Bressard-Kayode)

    cmd = [
        sys.executable,
        str(THUMBNAIL_SCRIPT),
        '--project', folder_id,                      # <-- Thumbnail script resolves Projects/<folderId> itself
        '--force',                                   # <-- Always refresh thumbnails on an explicit sync
        '--all-scenes'                               # <-- Produce a 524p thumbnail per IMG## scene for the ValeVision animation carousel
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode == 0:
            report.add_step('Generate Thumbnails', True, 'Thumbnail generation complete.')
        else:
            report.add_step('Generate Thumbnails', False, f'Thumbnail script exited {result.returncode}: {result.stderr.strip()[:200]}')
    except subprocess.TimeoutExpired:
        report.add_step('Generate Thumbnails', False, 'Thumbnail generation timed out after 120s.')
    except Exception as exc:
        report.add_step('Generate Thumbnails', False, f'Thumbnail error: {exc}')

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Camera Data Merge
# -----------------------------------------------------------------------------

def na_read_camera_data_from_project_data(project_root: Path) -> Optional[Dict]:
    """Read ValeVison3D__SketchUpCameraData from the local ProjectData JSON array."""
    data_file = na_find_project_data_file(project_root)
    if not data_file:
        return None

    try:
        raw = json.loads(data_file.read_text(encoding='utf-8'))
        if isinstance(raw, list):
            for item in raw:
                if isinstance(item, dict) and CAMERA_DATA_KEY in item:
                    return item[CAMERA_DATA_KEY]
        if isinstance(raw, dict) and CAMERA_DATA_KEY in raw:
            return raw[CAMERA_DATA_KEY]
    except Exception as exc:
        print(f"  {COLOR_YELLOW}Warning: Could not read ProjectData JSON: {exc}{COLOR_RESET}")

    return None


def na_merge_camera_key_into_project_json(project_json_path: Path, camera_data: Dict, report: SyncReport, label_suffix: str = ''):
    """Key-scoped merge of ValeVison3D__SketchUpCameraData into an existing project.json."""
    label = f'Merge Camera Data into project.json{label_suffix}'

    if not project_json_path.exists():
        report.add_step(label, False, f'project.json not found at {project_json_path}.')
        return

    try:
        existing = json.loads(project_json_path.read_text(encoding='utf-8'))
        existing[CAMERA_DATA_KEY] = camera_data

        tmp_path = project_json_path.with_suffix('.tmp.json')
        tmp_path.write_text(json.dumps(existing, indent=4), encoding='utf-8')
        tmp_path.replace(project_json_path)
        report.add_step(label, True, f'Merged {CAMERA_DATA_KEY} into {project_json_path.name}.')
    except Exception as exc:
        report.add_step(label, False, f'Merge failed: {exc}')

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | R2 Upload
# -----------------------------------------------------------------------------

def na_load_r2_credentials() -> Dict:
    """Load R2 credentials from Token__CloudflareAPI.env."""
    creds = {}
    if not ENV_FILE_PATH.exists():
        return creds

    for line in ENV_FILE_PATH.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            key, _, val = line.partition('=')
            creds[key.strip()] = val.strip().strip('"').strip("'")

    return creds


def na_build_r2_client(creds: Dict):
    """Build and return a boto3 S3 client pointed at Cloudflare R2."""
    try:
        import boto3
        return boto3.client(
            's3',
            aws_access_key_id     = creds.get('R2_ACCESS_KEY_ID', ''),
            aws_secret_access_key = creds.get('R2_SECRET_ACCESS_KEY', ''),
            endpoint_url          = creds.get('R2_ENDPOINT', ''),
            region_name           = 'auto'
        )
    except ImportError:
        return None


def na_upload_folder_to_r2(s3_client, bucket: str, local_dir: Path, r2_prefix: str, extensions: List[str], report: SyncReport, label: str):
    """Upload all files matching extensions from local_dir to R2 under r2_prefix."""
    if not local_dir.is_dir():
        report.add_step(label, False, f'Local folder not found: {local_dir}')
        return

    files = [f for f in local_dir.iterdir() if f.is_file() and f.suffix.lower() in extensions]
    if not files:
        report.add_step(label, True, f'No matching files to upload in {local_dir.name}.')
        return

    uploaded = 0
    for f in files:
        key = f"{r2_prefix}/{f.name}"
        try:
            s3_client.upload_file(str(f), bucket, key)
            uploaded += 1
        except Exception as exc:
            report.add_step(label, False, f'Upload failed for {f.name}: {exc}')
            return

    report.add_step(label, True, f'Uploaded {uploaded} file(s) to R2 under {r2_prefix}/.')
    report.uploaded += uploaded


def na_upload_project_json_to_r2(s3_client, bucket: str, project_json_path: Path, r2_prefix: str, report: SyncReport):
    """Upload project.json to R2 under the given prefix."""
    label = 'Upload project.json to R2'
    if not project_json_path.exists():
        report.add_step(label, False, f'project.json not found: {project_json_path}')
        return

    key = f"{r2_prefix}/{PROJECT_JSON_FILENAME}"
    try:
        s3_client.upload_file(str(project_json_path), bucket, key)
        report.add_step(label, True, f'Uploaded project.json to R2 key: {key}')
        report.uploaded += 1
    except Exception as exc:
        report.add_step(label, False, f'project.json upload failed: {exc}')


def na_merge_camera_in_r2_project_json(s3_client, bucket: str, r2_key: str, camera_data: Dict, report: SyncReport):
    """Download project.json from R2, merge camera key, re-upload."""
    label = 'Merge Camera Data into R2 project.json'
    import io
    try:
        response = s3_client.get_object(Bucket=bucket, Key=r2_key)
        existing = json.loads(response['Body'].read().decode('utf-8'))
        existing[CAMERA_DATA_KEY] = camera_data
        merged_bytes = json.dumps(existing, indent=4).encode('utf-8')
        s3_client.put_object(
            Bucket      = bucket,
            Key         = r2_key,
            Body        = merged_bytes,
            ContentType = 'application/json'
        )
        report.add_step(label, True, f'Merged {CAMERA_DATA_KEY} into R2 project.json.')
    except Exception as exc:
        report.add_step(label, False, f'R2 camera merge failed: {exc}')

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Main Sync Actions
# -----------------------------------------------------------------------------

def na_sync_all(project_folder: str, year: str, local_root: Path, wcp_dir: Path, report: SyncReport):
    """Full sync: images -> rebuild image list -> thumbnails -> R2 upload -> camera merge."""
    na_clone_images_to_wcp(local_root, wcp_dir, report)
    na_update_project_json_images(wcp_dir, report)            # <-- Keep project.json images in step with cloned files
    na_generate_thumbnails(year, project_folder, report)

    creds = na_load_r2_credentials()
    s3    = na_build_r2_client(creds)
    if not s3:
        report.add_step('R2 Upload', False, 'boto3 not available or credentials missing.')
    else:
        bucket    = creds.get('R2_BUCKET_NAME', '')
        full_year = f"20{year}" if len(year) == 2 else year
        r2_prefix = f"{R2_BASE_PREFIX}/{full_year}/{project_folder}"

        na_upload_folder_to_r2(s3, bucket, wcp_dir, r2_prefix, ['.png', '.jpg', '.webp'], report, 'Upload Images to R2')
        na_upload_project_json_to_r2(s3, bucket, wcp_dir / PROJECT_JSON_FILENAME, r2_prefix, report)

        camera_data = na_read_camera_data_from_project_data(local_root)
        if camera_data:
            na_merge_camera_key_into_project_json(wcp_dir / PROJECT_JSON_FILENAME, camera_data, report, ' (local)')
            r2_project_key = f"{r2_prefix}/{PROJECT_JSON_FILENAME}"
            na_merge_camera_in_r2_project_json(s3, bucket, r2_project_key, camera_data, report)


def na_sync_images(project_folder: str, year: str, local_root: Path, wcp_dir: Path, report: SyncReport):
    """Images-only sync: clone + rebuild image list + thumbnails + R2 images."""
    na_clone_images_to_wcp(local_root, wcp_dir, report)
    na_update_project_json_images(wcp_dir, report)            # <-- Keep project.json images in step with cloned files
    na_generate_thumbnails(year, project_folder, report)

    creds = na_load_r2_credentials()
    s3    = na_build_r2_client(creds)
    if s3:
        bucket    = creds.get('R2_BUCKET_NAME', '')
        full_year = f"20{year}" if len(year) == 2 else year
        r2_prefix = f"{R2_BASE_PREFIX}/{full_year}/{project_folder}"
        na_upload_folder_to_r2(s3, bucket, wcp_dir, r2_prefix, ['.png', '.jpg', '.webp'], report, 'Upload Images to R2')
    else:
        report.add_step('R2 Upload', False, 'boto3 not available or credentials missing.')


def na_sync_cameras(project_folder: str, year: str, local_root: Path, wcp_dir: Path, report: SyncReport):
    """Camera-only sync: merge camera data into local + R2 project.json."""
    camera_data = na_read_camera_data_from_project_data(local_root)
    if not camera_data:
        report.add_step('Read Camera Data', False, 'ValeVison3D__SketchUpCameraData not found in ProjectData JSON.')
        return

    report.add_step('Read Camera Data', True, f'Read {len(camera_data.get("scenes", []))} scene(s) from ProjectData.')

    local_pj = wcp_dir / PROJECT_JSON_FILENAME
    na_merge_camera_key_into_project_json(local_pj, camera_data, report, ' (local)')

    creds = na_load_r2_credentials()
    s3    = na_build_r2_client(creds)
    if s3:
        bucket    = creds.get('R2_BUCKET_NAME', '')
        full_year = f"20{year}" if len(year) == 2 else year
        r2_prefix = f"{R2_BASE_PREFIX}/{full_year}/{project_folder}"
        r2_key    = f"{r2_prefix}/{PROJECT_JSON_FILENAME}"
        na_merge_camera_in_r2_project_json(s3, bucket, r2_key, camera_data, report)
    else:
        report.add_step('R2 Camera Merge', False, 'boto3 not available or credentials missing.')

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Master Index Update
# -----------------------------------------------------------------------------

def na_update_master_index_for_project(web_folder: str, year: str, wcp_dir: Path, report: SyncReport):
    """Upsert this project's master-index entry (R2 presence flags + lastSynced)
    and write the index to R2 + the committed GH copy via the shared lib."""
    label = 'Update Master Index'
    try:
        import AutomationUtil__R2Common__Lib__ as r2lib       # @delegate: ./AutomationUtil__R2Common__Lib__.py
    except Exception as exc:
        report.add_step(label, False, f'Index lib import failed: {exc}')
        return

    creds  = r2lib.na_load_r2_credentials()
    client = r2lib.na_create_r2_client(creds)
    bucket = creds.get('R2_BUCKET_NAME', '')
    if not client or not bucket:
        report.add_step(label, False, 'R2 client unavailable; master index not updated.')
        return

    full_year = f"20{year}" if len(year) == 2 else year
    folder_id = f"{full_year}/{web_folder}"
    try:
        index = r2lib.na_index_read(client, bucket)                       # <-- R2-first, GH copy fallback
        probe = r2lib.na_probe_project_r2(client, bucket, folder_id)      # <-- Live R2 presence flags

        project_json = {}
        pj_path = wcp_dir / r2lib.PROJECT_JSON_FILENAME
        if pj_path.is_file():
            project_json = json.loads(pj_path.read_text(encoding='utf-8'))

        meta       = r2lib.na_derive_project_meta(project_json, folder_id)
        asset_home = 'r2' if probe['hasProjectJson_R2'] else 'gh'
        entry      = r2lib.na_make_index_entry(
            folder_id           = folder_id,
            project_code        = meta['projectCode'],
            name                = meta['name'],
            enabled             = True,
            asset_home          = asset_home,
            has_project_json_r2 = probe['hasProjectJson_R2'],
            has_images_r2       = probe['hasImages_R2'],
            has_thumbnails_r2   = probe['hasThumbnails_R2'],
            has_glb_r2          = probe['hasGlb_R2'],
            image_count         = probe['imageCount']
        )
        r2lib.na_index_upsert_project(index, entry)
        results = r2lib.na_index_write(client, bucket, index, write_gh_copy=True)

        ok = bool(results.get('r2') or results.get('gh'))
        report.add_step(label, ok,
                        f"Index entry upserted for {folder_id} (home={asset_home}, "
                        f"R2:{'OK' if results.get('r2') else 'no'} GH:{'OK' if results.get('gh') else 'no'}).")
    except Exception as exc:
        report.add_step(label, False, f'Index update failed: {exc}')

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | CLI Entry Point
# -----------------------------------------------------------------------------

def na_force_utf8_streams():
    """Force UTF-8 stdout/stderr so status glyphs survive cp1252 consoles + pipes."""
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding='utf-8')   # <-- Python 3.7+; no-op if already utf-8
        except Exception:
            pass


def na_write_report_file(report_path: str, report: Dict):
    """Write the JSON report to a file path supplied by the caller.

    GUI-host callers (the SketchUp plugin) cannot reliably capture a child
    process's stdout, so the report file is the PRIMARY hand-off channel. Stdout
    JSON is kept as a secondary channel for plain command-line use."""
    if not report_path:
        return
    try:
        Path(report_path).write_text(json.dumps(report, indent=2), encoding='utf-8')
    except Exception as exc:
        print(f"  {COLOR_YELLOW}Warning: could not write report file '{report_path}': {exc}{COLOR_RESET}")


def main():
    na_force_utf8_streams()                        # <-- Guard against UnicodeEncodeError on Windows
    parser = argparse.ArgumentParser(description='ValeVision Cloud Sync — Single Project Orchestrator')
    parser.add_argument('--project', required=True,  help='Project folder name (e.g. AB01__MyHouse__Whitecard)')
    parser.add_argument('--year',    required=True,  help='Two-digit year (e.g. 26 for 2026)')
    parser.add_argument('--action',  default='all',  choices=['all', 'images', 'cameras'], help='Sync scope')
    parser.add_argument('--json',    action='store_true', help='Emit JSON report on stdout at the end')
    parser.add_argument('--report-file', default='', help='Write the JSON report to this path (robust channel for GUI-host callers)')
    args = parser.parse_args()

    project_folder = args.project
    year           = args.year
    action         = args.action

    print(f"\n{COLOR_CYAN}ValeVision Cloud Sync — Single Project Orchestrator{COLOR_RESET}")
    print(f"  Project : {project_folder}")
    print(f"  Year    : {year}")
    print(f"  Action  : {action}")
    print()

    report = SyncReport(project_folder, action)

    local_root = na_resolve_local_project_root(project_folder, year)
    if not local_root:
        report.add_step('Resolve Project Root', False, f'Project folder not found under {LOCAL_PROJECTS_BASE}/{year}/.')
        final = report.finalise()
        na_write_report_file(args.report_file, final)     # <-- Primary hand-off channel (even on early exit)
        if args.json:
            print(json.dumps(final))
        sys.exit(1 if not final['success'] else 0)

    report.add_step('Resolve Project Root', True, f'Found project at {local_root}.')

    web_folder = na_derive_web_folder_name(project_folder)            # <-- Stripped web/R2 folder name
    wcp_dir    = na_resolve_wcp_project_dir(web_folder, year)         # <-- Whitecardopedia dir uses web name

    if action == 'all':
        na_sync_all(web_folder, year, local_root, wcp_dir, report)
    elif action == 'images':
        na_sync_images(web_folder, year, local_root, wcp_dir, report)
    elif action == 'cameras':
        na_sync_cameras(web_folder, year, local_root, wcp_dir, report)

    na_update_master_index_for_project(web_folder, year, wcp_dir, report)  # <-- Keep the master index fresh after every sync

    final = report.finalise()

    na_write_report_file(args.report_file, final)     # <-- Primary hand-off channel for GUI-host callers

    print()
    color = COLOR_GREEN if final['success'] else COLOR_RED
    print(f"{color}{'✔ Complete' if final['success'] else '✗ Completed with errors'}{COLOR_RESET}  "
          f"({final['elapsed_ms']}ms | {final['uploaded']} uploaded | {final['mirrored']} mirrored)")

    if args.json:
        print(json.dumps(final))

    sys.exit(0 if final['success'] else 1)

# endregion -------------------------------------------------------------------

if __name__ == '__main__':
    main()

# =============================================================================
# END OF FILE
# =============================================================================
