#!/usr/bin/env python3
# =============================================================================
# WHITECARDOPEDIA - SHARED CLOUDFLARE R2 LIBRARY
# =============================================================================
#
# FILE       : AutomationUtil__R2Common__Lib__.py
# NAMESPACE  : Whitecardopedia
# MODULE     : Shared R2 + Master Index Library
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Single shared library for every R2 automation script — boto3
#              credentials/client, HEAD/list/upload helpers, a content-type
#              map, and the authoritative master project index (read / upsert /
#              write to both R2 and the committed GitHub Pages fallback copy).
# CREATED    : 25-Jun-2026
#
# DESCRIPTION:
# - DRY home for the Cloudflare R2 plumbing that was previously duplicated
#   across the bulk GLB builder and the single-project sync orchestrator.
# - Reads R2 credentials from Tools__DevUtils/API__Cloudflare/Token__CloudflareAPI.env
#   (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_ENDPOINT).
# - Provides the master index artifact (Na__MasterIndex__ProjectLocations__.json):
#     * Primary  : R2 key VaApps/Index/Na__MasterIndex__ProjectLocations__.json
#     * Fallback : committed copy under Whitecardopedia/02__Src__AppModules/03__AppData/
#   Both web apps fetch the R2 copy first and fall back to the GH copy.
# - The index lists every masterConfig project with its year, asset home
#   (r2|gh), R2 presence flags, image count and last-synced timestamp so the
#   web apps can resolve each project's correct source directly (no 404 flood).
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 25-Jun-2026 - Version 1.0.0
# - Initial release: creds/client, head/list/upload, content-type map,
#   masterConfig reader, master-index read/upsert/write (R2 + GH copy).
#
# =============================================================================

import os
import json
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List

# -----------------------------------------------------------------------------
# REGION | Module Constants and Path Resolution
# -----------------------------------------------------------------------------

    # MODULE CONSTANTS | Paths and Prefixes
    # ------------------------------------------------------------
_LIB_DIR                     = Path(__file__).parent                        # <-- Tools__DevUtils
_WCP_ROOT                    = _LIB_DIR.parent                              # <-- Whitecardopedia project root
ENV_FILE_PATH                = _LIB_DIR / "API__Cloudflare" / "Token__CloudflareAPI.env"  # <-- Cloudflare credentials
APP_DATA_DIR                 = _WCP_ROOT / "02__Src__AppModules" / "03__AppData"           # <-- Web AppData folder
MASTER_CONFIG_PATH           = APP_DATA_DIR / "Na__AppData__MasterConfig__Main.json"       # <-- Authoritative project list
WCP_PROJECTS_BASE            = _WCP_ROOT / "Projects"                       # <-- Local Whitecardopedia projects root
    # ------------------------------------------------------------

    # MODULE CONSTANTS | R2 Prefixes and Index Artifact
    # ------------------------------------------------------------
R2_BASE_PREFIX               = "VaApps/Projects"                            # <-- R2 root prefix for per-project assets
R2_INDEX_PREFIX              = "VaApps/Index"                               # <-- R2 prefix for the master index
INDEX_FILENAME               = "Na__MasterIndex__ProjectLocations__.json"   # <-- Master index filename (R2 + GH copy)
R2_INDEX_KEY                 = f"{R2_INDEX_PREFIX}/{INDEX_FILENAME}"        # <-- Full R2 object key for the index
GH_INDEX_PATH                = APP_DATA_DIR / INDEX_FILENAME                 # <-- Committed GitHub Pages fallback copy
PROJECT_JSON_FILENAME        = "project.json"                              # <-- Web project metadata file
    # ------------------------------------------------------------

    # MODULE CONSTANTS | Public Asset Base URLs (kept in step with web SSOT)
    # ------------------------------------------------------------
R2_BASE_URL                  = "https://cdn.noble-architecture.com/VaApps/Projects"                       # <-- R2 CDN base for projects
GH_BASE_URL                  = "https://adam-noble-01.github.io/ValeCodebase/WebApps/Whitecardopedia/Projects"  # <-- GH Pages base for projects
R2_INDEX_URL                 = f"https://cdn.noble-architecture.com/{R2_INDEX_KEY}"                        # <-- R2 CDN URL for the index
INDEX_VERSION                = "1.0.0"                                      # <-- Schema version stamped into the index
    # ------------------------------------------------------------

    # MODULE CONSTANTS | Filename Markers and Content Types
    # ------------------------------------------------------------
IMAGE_SOURCE_MARKER          = "__WhitecardImage__"                        # <-- Marks a delivered scene image
THUMBNAIL_TOKEN              = "__Thumbnail__524p__"                       # <-- Marks a generated 524p thumbnail
CONTENT_TYPE_MAP             = {
    ".json" : "application/json",
    ".png"  : "image/png",
    ".webp" : "image/webp",
    ".jpg"  : "image/jpeg",
    ".jpeg" : "image/jpeg",
    ".glb"  : "model/gltf-binary"
}
DEFAULT_CONTENT_TYPE         = "application/octet-stream"                  # <-- Fallback content type
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | R2 Credentials and Client
# -----------------------------------------------------------------------------

    # FUNCTION | Load R2 Credentials From Token__CloudflareAPI.env
    # ------------------------------------------------------------
def na_load_r2_credentials(env_path: Optional[Path] = None) -> Dict:
    """Parse the Cloudflare .env file into a credentials dict (no dotenv dep)."""
    creds: Dict[str, str] = {}                                              # <-- Empty when file absent
    path = Path(env_path) if env_path else ENV_FILE_PATH                    # <-- Allow override for tests
    if not path.exists():
        return creds                                                        # <-- Caller treats empty as 'missing'

    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            key, _, val = line.partition('=')
            creds[key.strip()] = val.strip().strip('"').strip("'")          # <-- Strip wrapping quotes
    return creds
    # ------------------------------------------------------------


    # FUNCTION | Build a boto3 S3 Client Pointed at Cloudflare R2
    # ------------------------------------------------------------
def na_create_r2_client(creds: Dict):
    """Return a boto3 S3 client for R2, or None if boto3 / creds unavailable."""
    if not creds or not creds.get('R2_ENDPOINT'):
        return None                                                         # <-- No endpoint means no client
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
        return None                                                         # <-- boto3 not installed
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | R2 Object Helpers
# -----------------------------------------------------------------------------

    # HELPER FUNCTION | Resolve Content Type For a Filename
    # ------------------------------------------------------------
def na_content_type_for(filename: str) -> str:
    """Map a file extension to its content type (defaults to octet-stream)."""
    suffix = Path(filename).suffix.lower()                                  # <-- e.g. '.png'
    return CONTENT_TYPE_MAP.get(suffix, DEFAULT_CONTENT_TYPE)
    # ------------------------------------------------------------


    # HELPER FUNCTION | HEAD Check Whether an R2 Object Exists
    # ------------------------------------------------------------
def na_head_exists(client, bucket: str, key: str) -> bool:
    """Return True when the key exists in the bucket (HEAD object)."""
    if not client or not bucket:
        return False
    try:
        client.head_object(Bucket=bucket, Key=key)
        return True
    except Exception:
        return False                                                        # <-- 404 / access errors treated as 'absent'
    # ------------------------------------------------------------


    # HELPER FUNCTION | List Object Keys Under a Prefix
    # ------------------------------------------------------------
def na_list_prefix(client, bucket: str, prefix: str) -> List[str]:
    """Return all object keys under prefix (handles pagination)."""
    keys: List[str] = []
    if not client or not bucket:
        return keys
    try:
        token = None
        while True:
            kwargs = {'Bucket': bucket, 'Prefix': prefix}
            if token:
                kwargs['ContinuationToken'] = token
            resp = client.list_objects_v2(**kwargs)
            for obj in resp.get('Contents', []):
                keys.append(obj['Key'])
            if resp.get('IsTruncated'):
                token = resp.get('NextContinuationToken')
            else:
                break
    except Exception:
        pass                                                                # <-- Best-effort; empty list on error
    return keys
    # ------------------------------------------------------------


    # FUNCTION | Upload a Local File to R2 With the Correct Content Type
    # ------------------------------------------------------------
def na_upload_file(client, bucket: str, local_path: Path, key: str, content_type: Optional[str] = None) -> bool:
    """Upload one file to R2. Returns True on success."""
    local_path = Path(local_path)
    if not client or not bucket or not local_path.is_file():
        return False
    ctype = content_type or na_content_type_for(local_path.name)            # <-- Derive type when not supplied
    try:
        client.upload_file(
            str(local_path), bucket, key,
            ExtraArgs={'ContentType': ctype}
        )
        return True
    except Exception:
        return False
    # ------------------------------------------------------------


    # FUNCTION | Upload Raw Bytes to R2 (used for the index object)
    # ------------------------------------------------------------
def na_put_bytes(client, bucket: str, key: str, body: bytes, content_type: str = "application/json") -> bool:
    """Put an in-memory bytes object to R2. Returns True on success."""
    if not client or not bucket:
        return False
    try:
        client.put_object(Bucket=bucket, Key=key, Body=body, ContentType=content_type)
        return True
    except Exception:
        return False
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | masterConfig Project Reader
# -----------------------------------------------------------------------------

    # FUNCTION | Read Enabled Projects From the Whitecardopedia masterConfig
    # ------------------------------------------------------------
def na_read_master_config_projects(only_enabled: bool = True) -> List[Dict]:
    """Return the masterConfig projects list ([{folderId, enabled}])."""
    if not MASTER_CONFIG_PATH.exists():
        return []
    try:
        cfg      = json.loads(MASTER_CONFIG_PATH.read_text(encoding='utf-8'))
        projects = cfg.get('projects', [])
        if only_enabled:
            return [p for p in projects if p.get('enabled')]                # <-- Skip disabled / template rows
        return list(projects)
    except Exception:
        return []
    # ------------------------------------------------------------


    # HELPER FUNCTION | Split a folderId Into Year + Folder Name
    # ------------------------------------------------------------
def na_split_folder_id(folder_id: str) -> Dict:
    """'2026/63592__Bressard-Kayode' -> {year, folder, folderId}."""
    parts = folder_id.split('/', 1)
    if len(parts) == 2:
        return {'year': parts[0], 'folder': parts[1], 'folderId': folder_id}
    return {'year': '', 'folder': folder_id, 'folderId': folder_id}
    # ------------------------------------------------------------


    # HELPER FUNCTION | Derive Project Code + Name From a project.json Dict
    # ------------------------------------------------------------
def na_derive_project_meta(project_json: Dict, folder_id: str) -> Dict:
    """Return {projectCode, name} from project.json, with folder-name fallback."""
    code = ''
    name = ''
    if isinstance(project_json, dict):
        code = str(project_json.get('projectCode', '') or '')
        name = str(project_json.get('projectName', '') or '')

    if not code or not name:
        folder = na_split_folder_id(folder_id)['folder']                    # <-- e.g. 'VE-61058__Staley'
        bits   = folder.split('__')
        if not code:
            head = bits[0] if bits else folder
            code = head.split('-')[-1] if '-' in head else head             # <-- 'VE-61058' -> '61058'
        if not name and len(bits) > 1:
            name = bits[1]                                                  # <-- 'Staley'
    return {'projectCode': code, 'name': name}
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Master Index Read / Upsert / Write
# -----------------------------------------------------------------------------

    # FUNCTION | Create an Empty Master Index Skeleton
    # ------------------------------------------------------------
def na_index_new() -> Dict:
    """Return a fresh index document with header fields and empty projects."""
    return {
        'indexVersion' : INDEX_VERSION,
        'generatedAt'  : datetime.now().strftime('%d-%b-%Y at %H:%M'),
        'r2BaseUrl'    : R2_BASE_URL,
        'ghBaseUrl'    : GH_BASE_URL,
        'projects'     : []
    }
    # ------------------------------------------------------------


    # FUNCTION | Read the Master Index (R2-first, GH copy fallback)
    # ------------------------------------------------------------
def na_index_read(client, bucket: str) -> Dict:
    """Load the index from R2; fall back to the committed GH copy; else new."""
    if client and bucket:
        try:
            resp = client.get_object(Bucket=bucket, Key=R2_INDEX_KEY)
            return json.loads(resp['Body'].read().decode('utf-8'))
        except Exception:
            pass                                                            # <-- Fall through to local copy

    if GH_INDEX_PATH.exists():
        try:
            return json.loads(GH_INDEX_PATH.read_text(encoding='utf-8'))
        except Exception:
            pass

    return na_index_new()                                                   # <-- Nothing yet — start fresh
    # ------------------------------------------------------------


    # FUNCTION | Insert or Update a Single Project Entry in the Index
    # ------------------------------------------------------------
def na_index_upsert_project(index: Dict, entry: Dict) -> Dict:
    """Replace the matching folderId entry (or append). Returns the index."""
    if 'projects' not in index or not isinstance(index['projects'], list):
        index['projects'] = []

    folder_id = entry.get('folderId')
    for i, existing in enumerate(index['projects']):
        if existing.get('folderId') == folder_id:
            index['projects'][i] = entry                                    # <-- In-place replace
            return index

    index['projects'].append(entry)                                        # <-- New project row
    return index
    # ------------------------------------------------------------


    # HELPER FUNCTION | Build a Per-Project Index Entry
    # ------------------------------------------------------------
def na_make_index_entry(folder_id: str, project_code: str, name: str, enabled: bool,
                        asset_home: str, has_project_json_r2: bool, has_images_r2: bool,
                        has_thumbnails_r2: bool, has_glb_r2: bool, image_count: int,
                        last_synced: Optional[str] = None) -> Dict:
    """Assemble the canonical index entry shape consumed by both web apps."""
    split = na_split_folder_id(folder_id)
    return {
        'folderId'          : folder_id,
        'year'              : split['year'],
        'projectCode'       : project_code,
        'name'              : name,
        'enabled'           : bool(enabled),
        'assetHome'         : asset_home,                                   # <-- 'r2' or 'gh'
        'hasProjectJson_R2' : bool(has_project_json_r2),
        'hasImages_R2'      : bool(has_images_r2),
        'hasThumbnails_R2'  : bool(has_thumbnails_r2),
        'hasGlb_R2'         : bool(has_glb_r2),
        'imageCount'        : int(image_count),
        'lastSynced'        : last_synced or datetime.now().strftime('%d-%b-%Y at %H:%M')
    }
    # ------------------------------------------------------------


    # FUNCTION | Write the Index to R2 and the Committed GH Copy
    # ------------------------------------------------------------
def na_index_write(client, bucket: str, index: Dict, write_gh_copy: bool = True) -> Dict:
    """Stamp generatedAt, then write the index to R2 + the GH fallback copy."""
    index['generatedAt']  = datetime.now().strftime('%d-%b-%Y at %H:%M')    # <-- Refresh timestamp on every write
    index['indexVersion'] = index.get('indexVersion', INDEX_VERSION)

    payload = json.dumps(index, indent=4).encode('utf-8')
    results = {'r2': False, 'gh': False}

    if client and bucket:
        results['r2'] = na_put_bytes(client, bucket, R2_INDEX_KEY, payload, "application/json")

    if write_gh_copy:
        try:
            GH_INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
            GH_INDEX_PATH.write_text(json.dumps(index, indent=4), encoding='utf-8')
            results['gh'] = True
        except Exception:
            results['gh'] = False

    return results
    # ------------------------------------------------------------


    # FUNCTION | Probe R2 Presence Flags for One Project
    # ------------------------------------------------------------
def na_probe_project_r2(client, bucket: str, folder_id: str) -> Dict:
    """List the project prefix once and derive presence flags + image count."""
    prefix = f"{R2_BASE_PREFIX}/{folder_id}"
    keys   = na_list_prefix(client, bucket, prefix)
    names  = [k.rsplit('/', 1)[-1] for k in keys]                           # <-- Bare filenames

    has_project_json = PROJECT_JSON_FILENAME in names
    image_names      = [n for n in names if IMAGE_SOURCE_MARKER in n and THUMBNAIL_TOKEN not in n
                        and n.lower().endswith('.png')]
    thumb_names      = [n for n in names if THUMBNAIL_TOKEN in n]
    glb_names        = [n for n in names if n.lower().endswith('.glb')]

    return {
        'hasProjectJson_R2' : has_project_json,
        'hasImages_R2'      : len(image_names) > 0,
        'hasThumbnails_R2'  : len(thumb_names) > 0,
        'hasGlb_R2'         : len(glb_names) > 0,
        'imageCount'        : len(image_names)
    }
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------
