# =============================================================================
# VALEVISION3D - PUBLISHED DOCUMENTS API (FLASK BLUEPRINT)
# =============================================================================
#
# FILE       : Server__ValeVisionPublished__Api__.py
# MODULE     : ValeVision Published Documents - Local Filing
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : File a published drawing's baked files into the project folder, archive a superseded revision, and prune what a re-publish no longer names
# SCHEMA REF : 02__Src__AppModules/53__Data__Layout__PublishedSchema/Na__PublishedSchema__.json
#              and the example folder beside it (ValeVision3D, with the published schema)
#              ^ The readable schema. CHANGE A NAME HERE, CHANGE IT THERE.
# CREATED    : 23-Sep-2026
#
# DESCRIPTION:
# - THE ONE FOLDER THESE ROUTES MAY TOUCH is a project's
#       WebApps/Whitecardopedia/Projects/<yyyy>/<folder>/06__Layout__PublishedDocuments
#   Every path is validated segment by segment and resolved to be inside it,
#   exactly as the sheet-images routes guard 05__Layout__DrawingDocs__Images.
# - WRITES ARE ATOMIC. A file goes to a temp name beside its target and is renamed
#   into place, so the reader never sees half a file.
# - THE ARCHIVE IS MADE HERE, NOT IN THE BROWSER. Python's zipfile is one call and
#   there is no zip library in the app to vendor for it. A revision change zips the
#   whole document folder into 00__Archive__Revisions and removes the folder so
#   the new revision is built clean. An archive is NEVER overwritten: a second
#   archive of the same revision gets a timestamp, because the whole point of the
#   archive is that an issued revision cannot be lost.
# - 00__Archive__Revisions IS LOCAL ONLY. Whitecardopedia's R2 sync uploads only
#   the files at a project folder's top level, never a folder inside it, and the
#   write route refuses to put anything into it - only the archive route writes
#   there. The ValeCodebase .gitignore keeps it out of the repository too.
# - PRUNE IS SCOPED TO ONE DOCUMENT. After a same-revision re-publish the files the
#   new manifest names are kept and the rest of THAT document's folder goes. It
#   never walks the published root, so a pruning mistake can cost one drawing's
#   old files and nothing else.
# - THE SERVER RELOADS ITS ROUTES. Registered by server.py beside this file, which
#   runs Flask's debug reloader, so these routes load when server.py or this file
#   is saved. A server started without it holds whatever routes it had when it
#   started, so these answer the JSON 404 for unknown API routes until it is
#   restarted.
#
# ROUTES:
#   POST|PUT /api/valevision/published/file      raw bytes -> 06__.../<path>
#   GET      /api/valevision/published/file      a JSON file back (manifest, index); a JSON 404 when not published
#   GET      /api/valevision/published/list      every file under the root or one document
#   POST     /api/valevision/published/archive   zip a document folder, then remove it
#   POST     /api/valevision/published/prune     delete what a document no longer names
#
# -----------------------------------------------------------------------------
#
# PORT NOTE:
# - Ported from   : TrueVision3D's local server, na-apps/ProjectVision__TrueVisionPublished__Api__.py
# - Source version: 1.0.0 (TrueVision3D v2.155.0, 23-Sep-2026; read at HEAD b2aa9151)
# - Ported on     : 01-Oct-2026 for ValeVision3D v2.71.1
# - Parity        : adapted - TrueVision's five routes, their rules, patterns, limits and answers; ValeVision's
#                   project folders, route prefix and shared server helpers
# - Divergences   :
#   - Routes /api/valevision/published/{file,list,archive,prune}; blueprint valevision_published_api, registered by
#     WebApps/Whitecardopedia/server.py (TrueVision: /api/truevision/published, ProjectVision__LocalServer__Main__).
#   - The published folder sits in the project folder itself, WebApps/Whitecardopedia/Projects/<yyyy>/<folder>/
#     06__Layout__PublishedDocuments (K1 DR-29 (A): TrueVision's folder name; the project root takes the place of
#     na-project-portal/<yy>-Projects/<folder>/30__TrueVision__AppContent).
#   - A project is named by TrueVision's query names project-folder and year, the year 4 digits, or by
#     folder-id=YYYY/Folder (projectFolder, year, folderId in a JSON body), and project folder names may hold
#     spaces (2025/FN-62104__Fenner Scheme-01): the shared library's project_context and resolve_project_dir
#     resolve it (pattern, no '.' or '..' segment, real path inside the Projects folder) in place of TrueVision's
#     _context, PROJECT_PATTERN and YEAR_PATTERN. A published path itself keeps TrueVision's segment rule.
#   - Rebased on Server__ValeVisionShared__Lib__.py: a file is written by its write_bytes_atomic (a temporary
#     <name>.<random>.tmp beside the target, flushed to disk, then moved over it), so the walk also passes over
#     *.tmp; the retry delays, the clock and the containment check are the library's, and every line is printed
#     through its never-failing log.
#   - The archive folder is refused as a document id by archive and prune (400): TrueVision's DOCUMENT_PATTERN
#     admits "00__Archive__Revisions", and archiving it would zip the archive into itself and then remove every
#     older zip; pruning it would delete them. A stamped archive name that is still taken gets __02, __03 ...,
#     so an archive is never written over even twice in one second.
#   - prune reads a body that is not a JSON object as an empty one (400 for the missing keep list), as the
#     shared project_context does, never a server error.
#   - SCHEMA REF names ValeVision3D's published schema (TrueVision: the AA00 example project folder); the
#     description says where ValeVision's sync stops (it uploads only a project folder's top-level files).
# - Back-port     : the archive-folder refusal and the never-taken archive name would harden TrueVision's own
#                   routes.
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 23-Sep-2026 - Version 1.0.0
# - Created with Phase 5 of TrueVision__PLAN__PublishingSystem__.md.
#
# =============================================================================


# #region ---------------------------------------------------------------------
# REGION | Imports
# -----------------------------------------------------------------------------

import hashlib
import json
import os
import re
import shutil
import tempfile
import time
import zipfile

from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

import Server__ValeVisionShared__Lib__ as vv_shared                  # <-- ValeVision3D's shared server helpers: project folders, atomic writes, the log

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Configuration
# -----------------------------------------------------------------------------
# The Projects root, the year and project folder rules and the retry delays are
# the shared library's (PROJECTS_ROOT, YEAR_PATTERN, FOLDER_PATTERN,
# REPLACE_RETRY_DELAYS_S), read at call time, so a test repoints them there.

PUBLISHED_DIR           = '06__Layout__PublishedDocuments'               # <-- Never changes; Na__PubSchema__ and the R2 client name it too
ARCHIVE_DIR             = '00__Archive__Revisions'                       # <-- 00__ keeps it off R2 and out of every sync

SEGMENT_PATTERN         = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_\-.]{0,159}$')   # <-- Letter or digit first, so "." and ".." never name a segment
DOCUMENT_PATTERN        = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_\-]{2,79}$')
REVISION_PATTERN        = re.compile(r'^[A-Za-z0-9]{1,8}$')
ALLOWED_EXTENSIONS      = ('.json', '.svg', '.webp', '.png', '.pdf', '.md', '.note')
TEMP_SUFFIXES           = ('.writing', '.copying', vv_shared.TEMP_SUFFIX)  # <-- A half-written temp is nobody's file; .tmp is the shared atomic write's

MAX_FILE_BYTES          = 256 * 1024 * 1024                              # <-- A baked A1 PDF can be large; this only stops a runaway request

valevision_published_api = Blueprint('valevision_published_api', __name__)

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Helpers
# -----------------------------------------------------------------------------

_now_iso   = vv_shared.now_iso                                       # <-- The current time as the app writes it: UTC, milliseconds, Z
_is_inside = vv_shared.is_inside                                     # <-- True when candidate_path resolves to somewhere inside parent_path
_log       = vv_shared.log                                           # <-- A line in the server's output that can never fail the request it describes


def _context():
    """The project from the query string or the JSON body: (project_folder, year, folder_id)."""
    return vv_shared.project_context()


def _project_label(project_folder, year_code, folder_id):
    """The project as a refusal names it."""
    return folder_id if folder_id else f'{project_folder} ({year_code})'


def _published_root(project_folder, year_code, folder_id=''):
    """
    The published documents folder of a project that exists, or None. NOT
    created here - only a write that needs it makes it.
    """
    project_dir = vv_shared.resolve_project_dir(project_folder, year_code, folder_id)
    if not project_dir:
        return None
    root = os.path.join(project_dir, PUBLISHED_DIR)
    return root if _is_inside(root, vv_shared.PROJECTS_ROOT) else None


def _relative_parts(relative_path):
    """A published relative path split into validated segments, or None."""
    if not isinstance(relative_path, str) or not relative_path.strip():
        return None
    parts = [part for part in relative_path.replace('\\', '/').strip('/').split('/') if part != '']
    if not parts or len(parts) > 6:
        return None
    for part in parts:
        if part in ('.', '..') or not SEGMENT_PATTERN.match(part):
            return None
    return parts


def _target(root, relative_path, allow_archive=False):
    """root/<relative path> when every segment is allowed and it stays inside root, else None."""
    parts = _relative_parts(relative_path)
    if not parts:
        return None
    if parts[0] == ARCHIVE_DIR and not allow_archive:
        return None                                                               # <-- Only the archive route writes into the archive
    if not parts[-1].lower().endswith(ALLOWED_EXTENSIONS):
        return None
    path = os.path.join(root, *parts)
    return path if _is_inside(os.path.dirname(path), root) else None


def _refuse(message, status=400):
    return jsonify({'error': message}), status


def _sniff(data, extension):
    """True when the bytes are what the extension says they are."""
    head = data[:16]
    if extension == '.png':
        return head[:8] == b'\x89PNG\r\n\x1a\n'
    if extension == '.webp':
        return len(head) >= 12 and head[0:4] == b'RIFF' and head[8:12] == b'WEBP'
    if extension == '.pdf':
        return head[:5] == b'%PDF-'
    if extension == '.json':
        try:
            json.loads(data.decode('utf-8'))
            return True
        except (UnicodeDecodeError, ValueError):
            return False
    if extension == '.svg':
        text = data[:2048].decode('utf-8', errors='replace').lstrip()
        return text.startswith('<svg') or text.startswith('<?xml') or text.startswith('<!--')
    return True                                                                   # <-- .md / .note: text, taken as given


def _replace_with_retry(source, target):
    """os.replace, retried briefly while a reader holds the target open."""
    for delay in vv_shared.REPLACE_RETRY_DELAYS_S + (None,):
        try:
            os.replace(source, target)
            return
        except PermissionError:
            if delay is None:
                raise
            time.sleep(delay)


def _write_bytes(path, data):
    """Write through a temp file beside the target, then rename it into place (the shared library's atomic write)."""
    vv_shared.write_bytes_atomic(path, data)


def _walk(root, start):
    """Every file under start, as root-relative forward-slash paths."""
    found = []
    if not os.path.isdir(start):
        return found
    for folder, _dirs, files in os.walk(start):
        for name in files:
            if name.endswith(TEMP_SUFFIXES):
                continue                                                          # <-- A half-written temp is nobody's file
            full = os.path.join(folder, name)
            found.append(os.path.relpath(full, root).replace('\\', '/'))
    return sorted(found)


def _remove_empty_dirs(start, stop):
    """Remove empty folders from start upwards, never at or above stop."""
    for folder, _dirs, _files in sorted(os.walk(start), key=lambda item: -len(item[0])):
        if os.path.realpath(folder) == os.path.realpath(stop):
            continue
        try:
            if not os.listdir(folder):
                os.rmdir(folder)
        except OSError:
            pass


def _is_document(document):
    """A document id the archive and prune routes may act on: TrueVision's pattern, never the archive folder."""
    return DOCUMENT_PATTERN.match(document) is not None and document.lower() != ARCHIVE_DIR.lower()

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Routes - Reading
# -----------------------------------------------------------------------------

@valevision_published_api.route('/api/valevision/published/list', methods=['GET'])
def published_list():
    """Every file under the published root, or under one document when ?document= names it."""
    project_folder, year_code, folder_id = _context()
    root = _published_root(project_folder, year_code, folder_id)
    if not root:
        return _refuse(f'Project not found: {_project_label(project_folder, year_code, folder_id)}', 404)
    document = (request.args.get('document') or '').strip()
    if document and not DOCUMENT_PATTERN.match(document):
        return _refuse(f'Refused document id "{document}"')
    start = os.path.join(root, document) if document else root
    files = []
    for relative in _walk(root, start):
        full = os.path.join(root, *relative.split('/'))
        try:
            size = os.path.getsize(full)
        except OSError:
            continue
        files.append({'path': relative, 'bytes': size})
    return jsonify({'status': 'ok', 'root': PUBLISHED_DIR, 'document': document or None, 'files': files})


@valevision_published_api.route('/api/valevision/published/file', methods=['GET'])
def published_read():
    """A published JSON file, read fresh - the publisher reads the old manifest to decide on a revision."""
    project_folder, year_code, folder_id = _context()
    root = _published_root(project_folder, year_code, folder_id)
    if not root:
        return _refuse(f'Project not found: {_project_label(project_folder, year_code, folder_id)}', 404)
    relative = (request.args.get('path') or '').strip()
    target = _target(root, relative, allow_archive=False)
    if not target or not target.lower().endswith('.json'):
        return _refuse(f'Refused path "{relative}"')
    if not os.path.isfile(target):
        return _refuse(f'Not published: {relative}', 404)
    try:
        with open(target, 'r', encoding='utf-8') as handle:
            return jsonify({'status': 'ok', 'path': relative, 'json': json.load(handle)})
    except (OSError, ValueError) as error:
        return _refuse(f'Could not read {relative}: {error}', 500)

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Routes - Writing
# -----------------------------------------------------------------------------

@valevision_published_api.route('/api/valevision/published/file', methods=['POST', 'PUT'])
def published_write():
    """
    One baked file, as raw bytes, into 06__Layout__PublishedDocuments/<path>.
    The bytes must be what the extension says; the archive folder is refused.
    """
    project_folder, year_code, folder_id = _context()
    root = _published_root(project_folder, year_code, folder_id)
    if not root:
        return _refuse(f'Project not found: {_project_label(project_folder, year_code, folder_id)}', 404)

    relative = (request.args.get('path') or '').strip()
    target = _target(root, relative, allow_archive=False)
    if not target:
        return _refuse(f'Refused published path "{relative}"')

    length = request.content_length
    if length is not None and length > MAX_FILE_BYTES:
        return _refuse('That file is larger than this route will take', 413)
    data = request.get_data(cache=False)
    if not data:
        return _refuse('No file in the request')
    if len(data) > MAX_FILE_BYTES:
        return _refuse('That file is larger than this route will take', 413)

    extension = os.path.splitext(target)[1].lower()
    if not _sniff(data, extension):
        return _refuse(f'Those bytes are not a valid {extension} file')

    digest = hashlib.sha256(data).hexdigest()
    same = False
    if os.path.exists(target):
        try:
            with open(target, 'rb') as handle:
                same = hashlib.sha256(handle.read()).hexdigest() == digest
        except OSError:
            same = False
    if not same:
        try:
            _write_bytes(target, data)
        except Exception as error:                                              # noqa: BLE001 - reported, never raised at the browser
            _log(f'[Published] Failed to write {target}')
            _log(f'[Published] {type(error).__name__}: {error}')
            return _refuse('Failed to write the file', 500)

    return jsonify({'status': 'ok', 'path': relative, 'bytes': len(data), 'sha256': digest,
                    'unchanged': same, 'written': _now_iso()})


@valevision_published_api.route('/api/valevision/published/archive', methods=['POST'])
def published_archive():
    """
    A revision change: zip <document> into 00__Archive__Revisions/<document>__Revision__<old>.zip,
    then remove the document folder so the new revision is built clean. An
    existing archive of the same name is never overwritten.
    """
    project_folder, year_code, folder_id = _context()
    root = _published_root(project_folder, year_code, folder_id)
    if not root:
        return _refuse(f'Project not found: {_project_label(project_folder, year_code, folder_id)}', 404)
    document = (request.args.get('document') or '').strip()
    revision = (request.args.get('revision') or '').strip()
    if not _is_document(document):
        return _refuse(f'Refused document id "{document}"')
    if not REVISION_PATTERN.match(revision):
        return _refuse(f'Refused revision "{revision}"')

    source = os.path.join(root, document)
    if not os.path.isdir(source) or not _is_inside(source, root):
        return jsonify({'status': 'ok', 'archived': None, 'note': 'nothing published under that document yet'})

    archive_dir = os.path.join(root, ARCHIVE_DIR)
    os.makedirs(archive_dir, exist_ok=True)
    name = f'{document}__Revision__{revision}.zip'
    target = os.path.join(archive_dir, name)
    if os.path.exists(target):                                                   # <-- NEVER overwrite an issued revision
        stamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')
        name = f'{document}__Revision__{revision}__{stamp}.zip'
        target = os.path.join(archive_dir, name)
        taken = 2
        while os.path.exists(target) and taken < 1000:                          # <-- Twice in one second: still never over an older zip
            name = f'{document}__Revision__{revision}__{stamp}__{taken:02d}.zip'
            target = os.path.join(archive_dir, name)
            taken += 1
        if os.path.exists(target):
            return _refuse(f'Every archive name for {document} revision {revision} is taken; nothing was archived', 409)

    temp_handle, temp_path = tempfile.mkstemp(prefix=name + '.', suffix='.writing', dir=archive_dir)
    os.close(temp_handle)
    try:
        count = 0
        with zipfile.ZipFile(temp_path, 'w', zipfile.ZIP_DEFLATED) as bundle:
            for relative in _walk(source, source):
                bundle.write(os.path.join(source, *relative.split('/')), relative)
                count += 1
        _replace_with_retry(temp_path, target)
    except Exception as error:                                                  # noqa: BLE001
        try:
            os.remove(temp_path)
        except OSError:
            pass
        _log(f'[Published] Archive of {document} failed: {type(error).__name__}: {error}')
        return _refuse('Failed to archive the document', 500)

    # THE ZIP IS WHOLE AND IN PLACE before a single file of the folder goes.
    try:
        shutil.rmtree(source)
    except OSError as error:
        return _refuse(f'Archived to {name}, but the old folder could not be removed: {error}', 500)

    _log(f'[Published] Archived {document} revision {revision} -> {ARCHIVE_DIR}/{name} ({count} files)')
    return jsonify({'status': 'ok', 'archived': f'{ARCHIVE_DIR}/{name}', 'files': count, 'written': _now_iso()})


@valevision_published_api.route('/api/valevision/published/prune', methods=['POST'])
def published_prune():
    """
    After a same-revision re-publish: delete every file under ONE document's
    folder that the new manifest does not name. Scoped to that folder, always.
    """
    project_folder, year_code, folder_id = _context()
    root = _published_root(project_folder, year_code, folder_id)
    if not root:
        return _refuse(f'Project not found: {_project_label(project_folder, year_code, folder_id)}', 404)
    body = request.get_json(silent=True)
    body = body if isinstance(body, dict) else {}
    document = (request.args.get('document') or body.get('document') or '').strip()
    keep = body.get('keep')
    if not _is_document(document):
        return _refuse(f'Refused document id "{document}"')
    if not isinstance(keep, list) or not all(isinstance(one, str) for one in keep):
        return _refuse('keep must be a list of paths relative to the published root')

    folder = os.path.join(root, document)
    if not os.path.isdir(folder) or not _is_inside(folder, root):
        return jsonify({'status': 'ok', 'removed': []})

    wanted = set(path.replace('\\', '/').strip('/') for path in keep)
    removed = []
    for relative in _walk(root, folder):
        if relative in wanted:
            continue
        full = os.path.join(root, *relative.split('/'))
        if not _is_inside(full, folder):
            continue
        try:
            os.remove(full)
            removed.append(relative)
        except OSError as error:
            _log(f'[Published] Could not prune {relative}: {error}')
    _remove_empty_dirs(folder, folder)
    if removed:
        _log(f'[Published] Pruned {len(removed)} stale file(s) from {document}')
    return jsonify({'status': 'ok', 'removed': removed})

# endregion -------------------------------------------------------------------
