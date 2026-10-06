#!/usr/bin/env python3
# =============================================================================
# VALEVISION 3D - API CORE (SHARED HELPERS FOR EVERY ROUTE)
# =============================================================================
#
# FILE       : ValeVision3D__Api__Core__.py
# MODULE     : ValeVision3D API Core
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : The helpers every ValeVision 3D API route shares: where a project's
#              ValeVision 3D files live in the Projects Master Library, atomic writes,
#              the drawings fingerprint, and JSON files sent as stored
# CREATED    : 06-Oct-2026
#
# DESCRIPTION:
# - ONE LIBRARY, NO ROUTES. wsgi.py and the ValeVision3D__Api__<Feature>__
#   blueprints import it as vv_shared; it registers nothing itself.
# - WHERE THINGS LIVE (the Projects Master Library, one folder per project):
#     <library>/ValeProjects__<yyyy>/<id>/ProjectData__<id>__.json            the project record
#     <id>/ValeVision3D/Content__3dModel__GlbFiles/                           models (pushed from the PC)
#     <id>/ValeVision3D/Content__AnimationScenes__Thumbnails/                 scene thumbnails (public)
#     <id>/ValeVision3D/UserData__UserGeneratedContent__Drawings/             everything the Layout
#         LayoutEditor/{Linework,Snapshots}/ ValeVision__DrawingNotes__.json   Editor and the Statement
#         ValeVision__StatementDocs__.json 05__Layout__DrawingDocs__Images/    Writer make (user data:
#         06__Layout__PublishedDocuments/ 10__StatementDocs/                   collected, never pushed)
#   resolve_project_dir() answers that last folder, so the blueprints ported
#   from the local server write exactly where they always wrote, relative to it.
# - THE PROJECT ID IS THE LIBRARY FOLDER NAME ("64135__Washington"). A bare job
#   number ("64135"), a legacy "2026/<folder>" and a legacy folder name with a
#   space ("FN-62104__Fenner Scheme-01") all resolve to it (resolve_project).
# - EVERY JSON WRITE IS ATOMIC, AND THE COPY OVERWRITTEN IS KEPT as a revision in
#   <id>/ProjectData__Revisions/<same relative path>/ (ValeShared__Library__'s rule).
#
# -----------------------------------------------------------------------------
#
# PORT NOTE:
# - Ported from   : WebApps/ValeVisionGallery/Server__ValeVisionShared__Lib__.py 1.0.0 (ValeVision3D v2.71.1)
# - Ported on     : 06-Oct-2026, the move to app.valegardenhouses.com
# - Divergences   : projects come from the Master Library (ValeShared__Library__), not
#                   ValeVisionGallery/Projects/<yyyy>/<folder>; backups are revisions beside the
#                   project (ProjectData__Revisions) instead of %LOCALAPPDATA%; the health service is
#                   'valevision3d-api'. The write, fingerprint and send helpers are unchanged.
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 06-Oct-2026 - Version 1.0.0
# - Ported for the VPS: library paths, revisions, no repository or R2 rules.
#
# =============================================================================

# #region ---------------------------------------------------------------------
# REGION | Imports
# -----------------------------------------------------------------------------

import hashlib
import json
import os
import re
import tempfile
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

from flask import Response, jsonify, request

from ValeShared__Library__ import (NA__LIBRARY__DIR, NA__LIBRARY__ROOT, Na__Library__Find, Na__Library__ListProjects,
                                   Na__Library__Year)

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Configuration
# -----------------------------------------------------------------------------

APP_NAME                 = 'ValeVision3D'
SERVICE_NAME             = 'valevision3d-api'                                     # <-- What GET /api/health names
VALE_ROOT                = NA__LIBRARY__ROOT                                      # <-- The mirror on the PC, /srv/vale on the server
PROJECTS_ROOT            = str(NA__LIBRARY__DIR)                                  # <-- Vale__Projects__MasterLibrary; nothing a route writes leaves it
APP_DIR                  = VALE_ROOT / 'Vale__ValeVision3D'                       # <-- The app's own folder (app-wide user data lives in its UserData folders)

APP_BUCKET               = 'ValeVision3D'                                         # <-- The app's folder inside each project
MODELS_DIR               = 'Content__3dModel__GlbFiles'
SCENE_THUMBS_DIR         = 'Content__AnimationScenes__Thumbnails'
DRAWINGS_DIR             = 'UserData__UserGeneratedContent__Drawings'             # <-- resolve_project_dir() answers <project>/ValeVision3D/<this>

SIBLING_FILES            = frozenset({
    'ValeVision__DrawingNotes__.json',                                            # <-- The specification (drawing notes)
    'ValeVision__StatementDocs__.json',                                           # <-- The Statement Writer's index of the project's written documents
})

# DRAWINGS SAVE GUARD | A save must be built on the drawings as they are on disk
# The Layout Editor writes the drawings block whole (every sheet), so a window
# that loaded the block, then saved after another window had, would put the
# other window's sheets back. The app learns the block's fingerprint when it
# loads, sends it back with its save, and the save is refused (409) when the
# block on disk has since become something else.
DRAWINGS_BLOCK_KEY       = 'LayoutEditor__DrawingsData'
DRAWINGS_SAVED_ISO_KEY   = 'LayoutEditor__DrawingsData__SavedIso'
DRAWINGS_BASE_HEADER     = 'X-ValeVision-Drawings-Base'

REPLACE_RETRY_DELAYS_S   = (0.05, 0.1, 0.2, 0.4, 0.8)                             # <-- A file held open by a reader can refuse a rename for a moment (Windows)
TEMP_SUFFIX              = '.tmp'
AUTHOR_LEVEL             = os.environ.get('VALEVISION3D_AUTHOR_LEVEL') or 'AppAdmin'   # <-- Who may write: the same level that sees the Dev Tools menu
PROJECT_FILE_LOCK        = threading.RLock()                                      # <-- One guarded write at a time in this process
KEEP_REVISIONS           = 50

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Small Helpers
# -----------------------------------------------------------------------------

def log(message):
    """A line in the server's output that can never fail the request it describes."""
    try:
        print(message, flush=True)
    except Exception:
        try:
            print(str(message).encode('ascii', 'backslashreplace').decode('ascii'), flush=True)
        except Exception:
            pass


def now_iso():
    """The current time as the app writes it: UTC, milliseconds, Z."""
    now = datetime.now(timezone.utc)
    return now.strftime('%Y-%m-%dT%H:%M:%S.') + f'{now.microsecond // 1000:03d}Z'


def is_inside(candidate_path, parent_path):
    """True when candidate_path resolves to parent_path or somewhere inside it."""
    parent    = os.path.normcase(os.path.realpath(parent_path))
    candidate = os.path.normcase(os.path.realpath(candidate_path))
    return candidate == parent or candidate.startswith(parent.rstrip(os.sep) + os.sep)


def json_404(message='no such API route', **extra):
    body = {'error': message}
    body.update(extra)
    return jsonify(body), 404


def _remove_quietly(path):
    try:
        os.remove(path)
    except OSError:
        pass

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Projects - Found in the Master Library
# -----------------------------------------------------------------------------

def resolve_project(token):
    """
    The library folder (Path) of the project a token names, or None:
    "64135__Washington" (the id), "2026/64135__Washington" (legacy folderId),
    "FN-62104__Fenner Scheme-01" (legacy name with a space) or a bare job
    number "64135". A job number can name several projects (schemes, options):
    a shown project beats a hidden one, the main scheme ("63592__Bressard-Kayode")
    beats its "__Scheme-02" sibling, and then the record edited last wins.
    Links the apps make always carry the full id, so this only serves old or
    hand-typed links.
    """
    raw = str(token or '').strip().strip('/')
    if not raw:
        return None
    pid = re.sub(r'_*\s+_*', '__', raw.split('/')[-1])
    found = Na__Library__Find(pid)
    if found:
        return found
    if re.fullmatch(r'[A-Za-z0-9-]{1,40}', pid):
        matches = [p for i, p in Na__Library__ListProjects() if i.startswith(pid + '__')]
        if matches:
            return min(matches, key=_job_number_rank)
    return None


def _job_number_rank(folder: Path):
    """Sort key for the projects one job number names: shown, main scheme, edited last."""
    record = project_record_path(folder)
    hidden = (read_json_file(str(record)) or {}).get('enabled') is False
    try:
        edited = record.stat().st_mtime
    except OSError:
        edited = 0
    return (hidden, folder.name.count('__'), -edited, folder.name)


def project_record_path(folder: Path) -> Path:
    return folder / f'ProjectData__{folder.name}__.json'


def project_web_base(folder: Path) -> str:
    """The project folder's public URL ("/Vale__Projects__MasterLibrary/ValeProjects__2026/64135__Washington/")."""
    rel = Path(folder).resolve().relative_to(Path(VALE_ROOT).resolve()).as_posix()
    return '/' + '/'.join(map(_quote_segment, rel.split('/'))) + '/'


def _quote_segment(s):
    from urllib.parse import quote
    return quote(s, safe='')


def project_context():
    """
    The project a blueprint request names, as (project_folder, year, folder_id):
    ?project-folder=&year= or ?folder-id=YYYY/Folder, the same keys in a JSON
    body (projectFolder, year, folderId), or ?project=<id>. Empty strings where
    nothing was given.
    """
    body = request.get_json(silent=True) if request.is_json else None
    body = body if isinstance(body, dict) else {}
    folder    = (request.args.get('project-folder') or body.get('projectFolder') or body.get('project-folder')
                 or request.args.get('project') or body.get('project'))
    year      = request.args.get('year') or body.get('year')
    folder_id = request.args.get('folder-id') or body.get('folderId') or body.get('folder-id')
    return (
        str(folder).strip() if folder is not None else '',
        str(year).strip() if year is not None else '',
        str(folder_id).strip().strip('/') if folder_id is not None else ''
    )


def resolve_project_dir(project_folder=None, year=None, folder_id=None):
    """
    The ValeVision 3D drawings folder of a project that exists:
    <library>/ValeProjects__<yyyy>/<id>/ValeVision3D/UserData__UserGeneratedContent__Drawings,
    made if missing (the project itself must exist), or None. The year is not
    needed (the id is unique across years) and is ignored.
    """
    folder = resolve_project(folder_id or project_folder)
    if not folder:
        return None
    drawings = folder / APP_BUCKET / DRAWINGS_DIR
    drawings.mkdir(parents=True, exist_ok=True)
    return str(drawings) if is_inside(drawings, PROJECTS_ROOT) else None


def project_summary(pid, folder: Path, record=None):
    """What the app needs to know about where a project lives (never a filesystem path)."""
    base = project_web_base(folder)
    return {
        'id'         : pid,
        'year'       : Na__Library__Year(folder),
        'folder'     : folder.name,
        'webBase'    : base,                                                      # <-- Public content root of the project
        'modelsUrl'  : f'{base}{APP_BUCKET}/{MODELS_DIR}/',
        'scenesUrl'  : f'{base}{APP_BUCKET}/{SCENE_THUMBS_DIR}/',
        'galleryUrl' : f'{base}ValeVisionGallery/Content__GalleryImages__FullQuality__VariantImages/',
    }


def sanitize_sibling_filename(filename):
    raw       = (filename or '').strip() if isinstance(filename, str) else ''
    safe_name = os.path.basename(raw)
    if not safe_name or safe_name != raw:
        return None
    return safe_name if safe_name in SIBLING_FILES else None

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Reading and Writing Files Atomically
# -----------------------------------------------------------------------------

def read_json_file(file_path):
    """The JSON object on disk, or None when the file is missing, unreadable or not an object."""
    try:
        with open(file_path, 'r', encoding='utf-8-sig') as fh:
            document = json.load(fh)
        return document if isinstance(document, dict) else None
    except (OSError, ValueError):
        return None


def _replace_with_retry(source, target):
    for delay in REPLACE_RETRY_DELAYS_S + (None,):
        try:
            os.replace(source, target)
            return
        except PermissionError:
            if delay is None:
                raise
            time.sleep(delay)


def write_bytes_atomic(file_path, data, in_place_fallback=False):
    """Bytes through a temporary file beside the target, flushed, then moved over it."""
    directory = os.path.dirname(os.path.abspath(file_path))
    os.makedirs(directory, exist_ok=True)
    handle, temp_path = tempfile.mkstemp(prefix=os.path.basename(file_path) + '.', suffix=TEMP_SUFFIX, dir=directory)
    try:
        with os.fdopen(handle, 'wb') as fh:
            fh.write(data)
            fh.flush()
            os.fsync(fh.fileno())
    except BaseException:
        _remove_quietly(temp_path)
        raise
    try:
        _replace_with_retry(temp_path, file_path)
    except OSError:
        _remove_quietly(temp_path)
        if not in_place_fallback:
            raise
        with open(file_path, 'wb') as fh:
            fh.write(data)
    except BaseException:
        _remove_quietly(temp_path)
        raise


def write_text_atomic(file_path, text, newline='\n'):
    line_ending = '\n' if newline in ('', '\n') else (os.linesep if newline is None else newline)
    if line_ending != '\n':
        text = text.replace('\n', line_ending)
    write_bytes_atomic(file_path, text.encode('utf-8'), in_place_fallback=True)


def json_text(payload):
    """4-space indents, LF, a final newline."""
    return json.dumps(payload, indent=4, ensure_ascii=False) + '\n'


def write_json_file(file_path, payload):
    write_text_atomic(file_path, json_text(payload))


def unreadable_message(file_name, error):
    if isinstance(error, json.JSONDecodeError):
        return f'{file_name} is not valid JSON: line {error.lineno}, column {error.colno} ({error.msg})'
    if isinstance(error, UnicodeDecodeError):
        return f'{file_name} is not UTF-8 text (byte {error.start}): save it as UTF-8'
    return f'{file_name} could not be read ({type(error).__name__})'


def send_json_file(file_path):
    """A JSON file's bytes AS STORED, Last-Modified, no-store; a broken file is a 500 naming the line."""
    with open(file_path, 'rb') as fh:
        modified = os.fstat(fh.fileno()).st_mtime
        data     = fh.read()
    try:
        json.loads(data.decode('utf-8-sig'))
    except (UnicodeDecodeError, ValueError) as error:
        message = unreadable_message(os.path.basename(file_path), error)
        log(f' [ERROR] {message}')
        return jsonify({'error': message, 'unreadable': True}), 500
    response = Response(data, mimetype='application/json')
    response.last_modified = modified
    response.headers['Cache-Control'] = 'no-store'
    return response

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Revisions - The Copy Overwritten Is Kept Beside the Project
# -----------------------------------------------------------------------------

def keep_revision(file_path, user_code=''):
    """
    Copy a project file about to be overwritten into
    <project>/ProjectData__Revisions/<its path inside the project, no extension>/<stamp>__<USR>.json,
    keeping the newest KEEP_REVISIONS. Returns the revision's path inside the
    project, or None. Never raises: a save is never refused for want of a copy.
    """
    try:
        path = Path(file_path)
        if not path.is_file():
            return None
        project = next((p for p in path.parents if p.parent.parent == Path(PROJECTS_ROOT)), None)
        if project is None:
            return None
        rel = path.relative_to(project)
        rev_dir = project / 'ProjectData__Revisions' / rel.with_suffix('').as_posix()   # <-- The shared library's layout: a folder per file, named without its extension
        rev_dir.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now().strftime('%Y%m%d-%H%M%S-%f')
        rev = rev_dir / f'{stamp}__{re.sub(r"[^A-Za-z0-9]", "", user_code or "") or "unknown"}{path.suffix}'
        rev.write_bytes(path.read_bytes())
        for old in sorted(rev_dir.iterdir())[:-KEEP_REVISIONS]:
            _remove_quietly(old)
        return rev.relative_to(project).as_posix()
    except Exception as error:                                                    # noqa: BLE001
        log(f' [REVISION] Not kept for {file_path}: {type(error).__name__}: {error}')
        return None

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | The Drawings Fingerprint
# -----------------------------------------------------------------------------

def drawings_fingerprint(document):
    """
    { savedIso, digest } of a project document's drawings block: digest is
    'sha1:' + the SHA-1 of the block's canonical JSON (keys sorted, no spaces).
    Both None when the document has no block.
    """
    block = document.get(DRAWINGS_BLOCK_KEY) if isinstance(document, dict) else None
    if not isinstance(block, dict):
        return {'savedIso': None, 'digest': None}
    canonical = json.dumps(block, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    saved_iso = block.get(DRAWINGS_SAVED_ISO_KEY)
    return {
        'savedIso': saved_iso if isinstance(saved_iso, str) else None,
        'digest'  : 'sha1:' + hashlib.sha1(canonical).hexdigest()
    }

# endregion -------------------------------------------------------------------
