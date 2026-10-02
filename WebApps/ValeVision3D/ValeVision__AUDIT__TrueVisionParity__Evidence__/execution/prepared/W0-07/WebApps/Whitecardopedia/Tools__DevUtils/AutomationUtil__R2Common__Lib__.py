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
# - Owns the two R2 safety rules every pipeline follows (DR-06):
#     * na_list_top_level_keys - a purge listing sees only the keys stored
#       directly under a project prefix (Delimiter '/', paginated); nothing in
#       a sub-folder is ever a purge candidate.
#     * na_upload_project_json_preserving_editor_keys - a project.json upload
#       keeps every ValeVision editor-owned key R2 holds and mirrors the merged
#       document locally; it uploads nothing when it cannot read what it must
#       keep. The key list is ProjectData__EditorOwnedKeys in ValeVision3D's
#       Na__AppConfig__Main.json (one list, also read by the editor worker's
#       merge-keys guard and the localhost load overlay); it is never copied
#       into this file.
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 25-Jun-2026 - Version 1.0.0
# - Initial release: creds/client, head/list/upload, content-type map,
#   masterConfig reader, master-index read/upsert/write (R2 + GH copy).
#
# 01-Oct-2026 - Version 1.0.1
# - na_list_top_level_keys: Delimiter '/' listing that follows continuation
#   tokens and never returns a key in a sub-folder; it raises on a listing
#   error so a purge acts on a complete list or not at all (ValeVision W0-07,
#   DR-06).
# - na_load_editor_owned_keys, na_fetch_r2_json, na_merge_editor_owned_keys,
#   na_write_json_document_atomic and na_upload_project_json_preserving_editor_keys:
#   one project.json upload for the sync and the audit tool that keeps R2's
#   copy of every ProjectData__EditorOwnedKeys key (read from the ValeVision3D
#   app config, never copied here), runs the caller's transform on the merged
#   document, writes it locally (temp file + replace, the file's own line
#   endings) and uploads it no-cache. It fails closed: no upload when the list,
#   the local file or R2's copy cannot be read, or when the list names a
#   pipeline key.
#
# =============================================================================

import os
import copy
import json
import time
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List, Tuple

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

    # MODULE CONSTANTS | Shared Build Manifest + Master Config Mirror
    # ------------------------------------------------------------
BUILD_MANIFEST_FILENAME      = "Na__BuildVersion__Manifest__.json"         # <-- Shared build-version manifest filename
R2_BUILD_MANIFEST_KEY        = f"{R2_INDEX_PREFIX}/{BUILD_MANIFEST_FILENAME}"  # <-- Full R2 key for the build manifest
MASTER_CONFIG_FILENAME       = "Na__AppData__MasterConfig__Main.json"      # <-- Whitecardopedia master config filename
R2_MASTER_CONFIG_KEY         = f"{R2_INDEX_PREFIX}/{MASTER_CONFIG_FILENAME}"   # <-- Full R2 key for the master config mirror
MANIFEST_CACHE_CONTROL       = "no-cache, max-age=0"                       # <-- Origin hint so the edge revalidates manifest/config
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

    # MODULE CONSTANTS | ValeVision Editor-Owned project.json Keys (DR-06, DR-30)
    # ------------------------------------------------------------
VV_APP_CONFIG_PATH           = (_WCP_ROOT.parent / "ValeVision3D" / "02__Src__AppModules"
                                / "02__AppData" / "Na__AppConfig__Main.json")   # <-- Holds THE editor-owned key list
EDITOR_OWNED_KEYS_BLOCK      = "ProjectData__EditorOwnedKeys"              # <-- Config block holding the list
EDITOR_OWNED_KEYS_FIELD      = "ProjectData__EditorOwnedKeys__Keys"        # <-- Array of top-level project.json keys
PIPELINE_OWNED_PROJECT_KEYS  = frozenset({                                 # <-- Keys the pipelines write; a list naming one is refused
    "projectCode", "projectName", "folderId", "basePath",
    "images", "allImages", "displayImages", "thumbnailImage",
    "valeVision_ModelUrls", "ValeVison3D__SketchUpCameraData"
})
PROJECT_JSON_CACHE_CONTROL   = "no-cache, max-age=0"                       # <-- Same header as the editor worker's save path
R2_MISSING_OBJECT_CODES      = frozenset({"NoSuchKey", "404", "NotFound"}) # <-- get_object codes meaning 'absent', not 'error'
LOCAL_WRITE_RETRY_DELAYS_S   = (0.05, 0.1, 0.2, 0.4, 0.8)                  # <-- os.replace retries while Windows holds the file
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


    # HELPER FUNCTION | List the Keys Stored Directly Under a Prefix (Purge Scope)
    # ------------------------------------------------------------
def na_list_top_level_keys(client, bucket: str, prefix: str) -> List[str]:
    """Return the keys stored directly under prefix - never a key in a sub-folder.

    Lists with Delimiter '/' (sub-folders come back as CommonPrefixes and are
    ignored) and follows NextContinuationToken past 1,000 keys. A key with a
    further '/' after the prefix is skipped too, in case a backend ignores the
    delimiter. Unlike na_list_prefix this raises on a listing error, so a
    caller that deletes acts on a complete list or not at all."""
    if not client or not bucket:
        raise ValueError("R2 client or bucket missing")
    if not prefix.endswith('/'):
        prefix = f"{prefix}/"                                               # <-- 'VaApps/Projects/2026/X' -> '.../X/'
    keys: List[str] = []
    token = None
    while True:
        kwargs = {'Bucket': bucket, 'Prefix': prefix, 'Delimiter': '/'}
        if token:
            kwargs['ContinuationToken'] = token
        resp = client.list_objects_v2(**kwargs)
        for obj in resp.get('Contents', []) or []:
            key  = obj.get('Key', '')
            rest = key[len(prefix):] if key.startswith(prefix) else ''
            if rest and '/' not in rest:
                keys.append(key)                                            # <-- Top-level object only
        if not resp.get('IsTruncated'):
            break
        token = resp.get('NextContinuationToken')
        if not token:
            raise RuntimeError(f"listing of {prefix} was truncated without a continuation token")
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


    # FUNCTION | Rebuild the Full Master Index From Current R2 + Local State
    # ------------------------------------------------------------
def na_index_rebuild_all(client, bucket: str, projects: Optional[List[Dict]] = None) -> Dict:
    """Probe R2 + read local project.json per enabled project to assemble a
    fresh index. Reused by the audit/backfill tool and the GLB builder (DRY)."""
    if projects is None:
        projects = na_read_master_config_projects(only_enabled=True)        # <-- Default: every enabled project

    index = na_index_new()
    for project in projects:
        folder_id = project.get('folderId')
        if not folder_id:
            continue

        probe   = na_probe_project_r2(client, bucket, folder_id)            # <-- One list per project
        pj_path = WCP_PROJECTS_BASE / folder_id / PROJECT_JSON_FILENAME

        project_json = {}
        if pj_path.is_file():
            try:
                project_json = json.loads(pj_path.read_text(encoding='utf-8'))
            except Exception:
                project_json = {}

        meta       = na_derive_project_meta(project_json, folder_id)
        asset_home = 'r2' if probe['hasProjectJson_R2'] else 'gh'           # <-- Where project.json actually lives

        entry = na_make_index_entry(
            folder_id           = folder_id,
            project_code        = meta['projectCode'],
            name                = meta['name'],
            enabled             = bool(project.get('enabled', True)),
            asset_home          = asset_home,
            has_project_json_r2 = probe['hasProjectJson_R2'],
            has_images_r2       = probe['hasImages_R2'],
            has_thumbnails_r2   = probe['hasThumbnails_R2'],
            has_glb_r2          = probe['hasGlb_R2'],
            image_count         = probe['imageCount']
        )
        na_index_upsert_project(index, entry)

    return index
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


# -----------------------------------------------------------------------------
# REGION | Shared Build Manifest + Master Config Mirror
# -----------------------------------------------------------------------------

    # FUNCTION | Write the Shared Build-Version Manifest to R2
    # ------------------------------------------------------------
def na_write_build_manifest(client, bucket: str, last_project: str = "") -> bool:
    """Write VaApps/Index/Na__BuildVersion__Manifest__.json with an increasing
    Unix-timestamp buildVersion. Both web apps read this on load to decide
    whether their cached content is stale. Returns True on success."""
    if not client or not bucket:
        return False
    manifest = {
        'buildVersion' : int(time.time()),                                  # <-- Unix timestamp (always increases)
        'buildDate'    : datetime.now().strftime('%d-%b-%Y at %H:%M'),       # <-- Human-readable build time
        'lastProject'  : last_project                                       # <-- Last project that triggered a build
    }
    payload = json.dumps(manifest, indent=4).encode('utf-8')
    try:
        client.put_object(
            Bucket       = bucket,
            Key          = R2_BUILD_MANIFEST_KEY,
            Body         = payload,
            ContentType  = "application/json",
            CacheControl = MANIFEST_CACHE_CONTROL                           # <-- Edge revalidation hint
        )
        return True
    except Exception:
        return False
    # ------------------------------------------------------------


    # FUNCTION | Mirror the Local Master Config to R2
    # ------------------------------------------------------------
def na_upload_master_config(client, bucket: str) -> bool:
    """Mirror Na__AppData__MasterConfig__Main.json to R2 so the web app can fetch
    the project list directly from the CDN — removing the GH Pages push + deploy
    wait when adding or enabling a project. Returns True on success."""
    if not client or not bucket or not MASTER_CONFIG_PATH.is_file():
        return False
    try:
        payload = MASTER_CONFIG_PATH.read_bytes()
        client.put_object(
            Bucket       = bucket,
            Key          = R2_MASTER_CONFIG_KEY,
            Body         = payload,
            ContentType  = "application/json",
            CacheControl = MANIFEST_CACHE_CONTROL                           # <-- Edge revalidation hint
        )
        return True
    except Exception:
        return False
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | project.json Upload That Keeps the Editor-Owned Keys (DR-06, DR-30)
# -----------------------------------------------------------------------------

    # FUNCTION | Read THE Editor-Owned Key List From the ValeVision App Config
    # ------------------------------------------------------------
def na_load_editor_owned_keys(config_path: Optional[Path] = None) -> List[str]:
    """Return ProjectData__EditorOwnedKeys from ValeVision3D's Na__AppConfig__Main.json.

    The list lives in the app config only (one list for the sync tools, the
    editor worker's merge-keys guard and the localhost load overlay); it is
    never copied into this file. Raises ValueError naming the problem when the
    config is missing or unreadable, the list is absent, empty or holds an
    invalid entry, or it names a pipeline key - callers then upload nothing."""
    path = Path(config_path) if config_path else VV_APP_CONFIG_PATH
    try:
        config = json.loads(path.read_text(encoding='utf-8'))
    except FileNotFoundError:
        raise ValueError(f"ValeVision app config not found at {path}") from None
    except Exception as exc:
        raise ValueError(f"ValeVision app config unreadable at {path}: {exc}") from None

    block = config.get(EDITOR_OWNED_KEYS_BLOCK) if isinstance(config, dict) else None
    keys  = block.get(EDITOR_OWNED_KEYS_FIELD) if isinstance(block, dict) else None
    if not isinstance(keys, list) or not keys:
        raise ValueError(f"{EDITOR_OWNED_KEYS_BLOCK}.{EDITOR_OWNED_KEYS_FIELD} missing or empty in {path}")

    cleaned: List[str] = []
    for key in keys:
        if not isinstance(key, str) or not key or key != key.strip():
            raise ValueError(f"{EDITOR_OWNED_KEYS_FIELD} holds an invalid entry: {key!r}")
        if key in PIPELINE_OWNED_PROJECT_KEYS:
            raise ValueError(f"{EDITOR_OWNED_KEYS_FIELD} names the pipeline key '{key}', which only the pipelines may write")
        if key not in cleaned:
            cleaned.append(key)                                             # <-- Order kept, duplicates dropped
    return cleaned
    # ------------------------------------------------------------


    # HELPER FUNCTION | S3 Error Code Carried by a Client Exception
    # ------------------------------------------------------------
def na_client_error_code(exc: Exception) -> str:
    """Return the S3 error code of a boto3 ClientError (or a stub's), else ''."""
    response = getattr(exc, 'response', None)
    if isinstance(response, dict):
        error = response.get('Error')
        if isinstance(error, dict) and error.get('Code') is not None:
            return str(error.get('Code'))
    return ''
    # ------------------------------------------------------------


    # FUNCTION | Read and Parse a JSON Object From R2 (Missing and Error Kept Apart)
    # ------------------------------------------------------------
def na_fetch_r2_json(client, bucket: str, key: str) -> Tuple[str, Optional[object], str]:
    """Return ('ok', document, ''), ('missing', None, '') when R2 has no such
    key, or ('error', None, reason) for anything else - an access or network
    error, or a body that is not valid JSON. A caller about to overwrite the
    object must treat 'error' as 'do not write'."""
    try:
        resp = client.get_object(Bucket=bucket, Key=key)
    except Exception as exc:
        if na_client_error_code(exc) in R2_MISSING_OBJECT_CODES:
            return 'missing', None, ''
        return 'error', None, f"{type(exc).__name__}: {exc}"
    try:
        body = resp['Body'].read()
        return 'ok', json.loads(body.decode('utf-8')), ''
    except Exception as exc:
        return 'error', None, f"R2's copy is not valid JSON ({exc})"
    # ------------------------------------------------------------


    # FUNCTION | Take the Editor-Owned Keys From R2's Copy
    # ------------------------------------------------------------
def na_merge_editor_owned_keys(local_doc: Dict, remote_doc: Optional[Dict], editor_keys: List[str]) -> Tuple[Dict, List[str]]:
    """Return (merged, kept): a deep copy of the local document in which every
    listed key R2 holds carries R2's value. A listed key R2 lacks keeps the
    local value; every other key (images, model URLs, camera data,
    Whitecardopedia metadata) stays the local pipeline's. Neither input changes."""
    merged = copy.deepcopy(local_doc)
    kept: List[str] = []
    if isinstance(remote_doc, dict):
        for key in editor_keys:
            if key in remote_doc:
                merged[key] = copy.deepcopy(remote_doc[key])                # <-- The editor saves to R2 first: R2 wins
                kept.append(key)
    return merged, kept
    # ------------------------------------------------------------


    # FUNCTION | Write a JSON Document Atomically With the File's Own Line Endings
    # ------------------------------------------------------------
def na_write_json_document_atomic(path: Path, document: Dict, newline: str = "\n") -> None:
    """Write json.dumps(document, indent=4) - the sync's project.json format -
    through a temp file and os.replace, retrying the replace while Windows
    holds the target open. Raises the last error when every try fails."""
    path = Path(path)
    data = json.dumps(document, indent=4).replace("\n", newline).encode('utf-8')
    tmp  = path.with_name(f"{path.name}.tmp")
    tmp.write_bytes(data)
    last_error = None
    for delay in (0.0,) + LOCAL_WRITE_RETRY_DELAYS_S:
        if delay:
            time.sleep(delay)
        try:
            os.replace(str(tmp), str(path))
            return
        except OSError as exc:
            last_error = exc
    try:
        tmp.unlink()
    except OSError:
        pass
    raise last_error
    # ------------------------------------------------------------


    # FUNCTION | Upload project.json Keeping the Editor-Owned Keys From R2
    # ------------------------------------------------------------
def na_upload_project_json_preserving_editor_keys(client, bucket: str, project_json_path: Path, r2_key: str,
                                                  editor_keys: Optional[List[str]] = None,
                                                  transform=None) -> Dict:
    """Upload a project's project.json to R2 without erasing what the ValeVision
    editor saved there (DR-06; the pattern of TrueVision's model sync).

    1. Read the editor-owned key list (na_load_editor_owned_keys) and the local file.
    2. Read R2's current copy and take every listed key it holds from R2.
    3. Run transform(merged) when given - the sync re-points IMG-slot scene
       thumbnails on R2's copy of PresentationMode__SavedCameraScenes here; the
       return value is reported as a note.
    4. Write the merged document over the local file when it differs (so the
       local copy receives R2's editor data), then upload it no-cache.

    Fails closed: when the list, the local file or R2's copy cannot be read
    (anything but 'no such key'), nothing is written or uploaded. Returns
    {ok, uploaded, kept, r2State, localUpdated, note, message}."""
    result = {'ok': False, 'uploaded': False, 'kept': [], 'r2State': '', 'localUpdated': False, 'note': '', 'message': ''}
    path   = Path(project_json_path)

    try:
        keys = list(editor_keys) if editor_keys is not None else na_load_editor_owned_keys()
    except ValueError as exc:
        result['message'] = f"project.json NOT uploaded - editor-owned key list unavailable: {exc}"
        return result

    try:
        raw       = path.read_bytes()
        local_doc = json.loads(raw.decode('utf-8'))
    except Exception as exc:
        result['message'] = f"project.json NOT uploaded - local file unreadable: {exc}"
        return result
    if not isinstance(local_doc, dict):
        result['message'] = "project.json NOT uploaded - the local file is not a JSON object."
        return result

    state, remote_doc, reason = na_fetch_r2_json(client, bucket, r2_key)
    result['r2State'] = state
    if state == 'error':
        result['message'] = (f"project.json NOT uploaded - could not read R2's copy to keep the editor-owned keys "
                             f"({reason}); R2 left unchanged.")
        return result
    if state == 'ok' and not isinstance(remote_doc, dict):
        result['message'] = "project.json NOT uploaded - R2's copy is not a JSON object; R2 left unchanged."
        return result

    merged, kept   = na_merge_editor_owned_keys(local_doc, remote_doc, keys)
    result['kept'] = kept

    if transform is not None:
        try:
            result['note'] = str(transform(merged) or '')
        except Exception as exc:
            result['message'] = f"project.json NOT uploaded - post-merge step failed: {exc}"
            return result

    local_error = ''
    if merged != local_doc:
        try:
            na_write_json_document_atomic(path, merged, "\r\n" if b"\r\n" in raw else "\n")
            result['localUpdated'] = True
        except Exception as exc:
            local_error = f"local project.json NOT updated ({exc})"

    try:
        client.put_object(
            Bucket       = bucket,
            Key          = r2_key,
            Body         = json.dumps(merged, indent=4).encode('utf-8'),
            ContentType  = "application/json",
            CacheControl = PROJECT_JSON_CACHE_CONTROL                       # <-- Revalidated on every fetch
        )
        result['uploaded'] = True
    except Exception as exc:
        result['message'] = f"project.json upload failed: {exc}" + (f"; {local_error}" if local_error else "")
        return result

    if state == 'missing':
        message = f"Uploaded project.json to R2 key: {r2_key} (first upload - R2 held no copy)"
    elif kept:
        message = f"Uploaded project.json to R2 key: {r2_key} - kept from R2: {', '.join(kept)}"
    else:
        message = f"Uploaded project.json to R2 key: {r2_key} - R2 held no editor-owned key"
    if result['note']:
        message += f"; {result['note']}"
    if result['localUpdated']:
        message += "; local project.json updated to match"
    if local_error:
        message += f"; {local_error}"
    result['ok']      = not local_error
    result['message'] = message
    return result
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------
