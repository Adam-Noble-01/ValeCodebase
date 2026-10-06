#!/usr/bin/env python3
# =============================================================================
# VALEVISION3D - STATEMENT WRITER API (FLASK BLUEPRINT)
# =============================================================================
#
# FILE       : ValeVision3D__Api__Statements__.py
# NAMESPACE  : ValeVision Gallery
# MODULE     : ValeVision Statement Writer - Local File Routes
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Read, write and tidy the statement documents in a project folder
# CREATED    : 20-Sep-2026
#
# DESCRIPTION:
# - A BROWSER CANNOT WRITE A FILE, so the Statement Writer saves through these
#   routes while it is running on localhost. R2 is the record; the copy in the
#   project folder is the one Adam can open in Typora without launching the
#   app at all, which is the whole reason a statement is a markdown file and
#   not a key in a JSON document.
# - EVERYTHING IS FENCED INTO ONE FOLDER. Every path these routes touch must
#   resolve inside
#       WebApps/ValeVisionGallery/Projects/<yyyy>/<folder>/10__StatementDocs
#   and is checked after resolution, not before, so a path that climbs out with
#   .. or through a symbolic link is refused rather than cleaned up and obeyed.
# - THE TREE ROUTE EXISTS BECAUSE A STATIC SERVER CANNOT LIST A FOLDER. The
#   publisher needs to know which pictures are on disk and where, the manager
#   needs to know which statements exist, and the tidy-up needs to know what is
#   no longer used. One listing answers all three.
# - WHAT IT WRITES. Text files - a statement's markdown, the HTML built from
#   it - and the one kind of picture it has to: a picture DRAGGED ONTO the
#   editor, which the browser hands over as bytes rather than as a path, so
#   there is no other way for it to reach the folder. Pictures already on disk
#   are never rewritten; they are read where they are and published from there.
# - WHAT IT WILL NOT DO: delete anything without the caller naming it exactly,
#   or touch a single byte outside that one folder.
# - A DELETE NEVER UNLINKS. What is deleted moves, whole and under the path it
#   had, into 10__StatementDocs/00__Deleted__Quarantine/<moment>/ and stays
#   there until the folder is emptied by hand. The quarantine is the server's:
#   no route writes, makes a folder, moves or deletes anything inside it.
# - THE READ ROUTE. GET file answers a statement file's bytes as stored, with
#   Last-Modified (what the lockstep watch compares) and no-store; a file that
#   is not there is a JSON 404 { missing: true }, never the index page the
#   server's catch-all route answers for a path it does not know.
#
# INTEGRATION:
# - Registered by server.py beside this file, alongside the scrapbook, sheet
#   images, user config and published documents blueprints; built on
#   Server__ValeVisionShared__Lib__.py.
# - Called by Na__LayoutEditor__Statement__Data__Transport__ and
#   Na__LayoutEditor__Statement__Publish__.
# - THE SERVER RELOADS ITS ROUTES. server.py runs Flask's debug reloader, so
#   these routes load when server.py or this file is saved. A server started
#   without it holds whatever routes it had when it started, so these answer
#   the JSON 404 for unknown API routes until it is restarted.
#
# -----------------------------------------------------------------------------
#
# PORT NOTE:
# - Ported from   : TrueVision3D's local server, na-apps/ProjectVision__TrueVisionStatements__Api__.py
# - Source version: no module version in the file (TrueVision3D v2.95.0, 20-Sep-2026, unchanged since; read at
#                   HEAD b2aa9151)
# - Ported on     : 01-Oct-2026 for ValeVision3D v2.71.1
# - Parity        : adapted - TrueVision's six routes, their rules, patterns, suffix lists, size caps and answers;
#                   ValeVision's project folders, route prefix, shared server helpers, a read route and a delete
#                   that quarantines
# - Divergences   :
#   - Routes /api/valevision/statements/{tree,file,image,folder,move,delete}; blueprint valevision_statements_api,
#     registered by WebApps/ValeVisionGallery/server.py (TrueVision: /api/truevision/statements,
#     ProjectVision__LocalServer__Main__).
#   - The statements folder sits in the project folder itself, WebApps/ValeVisionGallery/Projects/<yyyy>/<folder>/
#     10__StatementDocs (K1 DR-29 (A): TrueVision's folder name; the project root takes the place of
#     na-project-portal/<yy>-Projects/<folder>/30__TrueVision__AppContent).
#   - A project is named by TrueVision's query names project-folder and year, the year 4 digits, or by
#     folder-id=YYYY/Folder (projectFolder, year, folderId in a JSON body), and project folder names may hold
#     spaces (2025/FN-62104__Fenner Scheme-01): the shared library's project_context and resolve_project_dir
#     resolve it (pattern, no '.' or '..' segment, real path inside the Projects folder) in place of TrueVision's
#     _context, FOLDER_PATTERN and YEAR_PATTERN.
#   - GET /api/valevision/statements/file is ValeVision's (TrueVision reads a statement through its static
#     server): the bytes as stored, Last-Modified, no-store, 404 { missing: true } - so nothing reads a statement
#     through server.py's catch-all, which answers a missing path with the index page and a 200 (K1 DR-28).
#   - delete moves the file or folder into 10__StatementDocs/00__Deleted__Quarantine/<yyyymmdd-hhmmss-ffffff>/
#     <its path> and answers { deleted, quarantined } (TrueVision: shutil.rmtree / os.remove; K1 DR-28 and the
#     parity plan's D-S07b-08: the scrapbook API's convention). A file never lands at the quarantine's own root,
#     so the statement index's adopt detection never offers a deleted statement back. No route writes, makes a
#     folder, moves or deletes inside the quarantine (400); the tree lists it, as a 00__ folder the Statement
#     Writer already passes over.
#   - The fence holds for a link to a FILE as well as to a folder: a path is refused when its folder OR the file
#     itself resolves outside the statements folder (TrueVision refuses only when both do, so a file link inside
#     the folder pointing outside was followed). A segment made only of dots and spaces is refused ('...' reads
#     as the folder it is in on Windows, the shared library's has_dot_segment rule).
#   - Rebased on Server__ValeVisionShared__Lib__.py: text files are written by its write_text_atomic with
#     newline='' (the markdown keeps its own line endings, as TrueVision's open(newline='') did) and pictures by
#     write_bytes_atomic, so a reader never sees half a file and a hard-linked file is replaced, never written
#     through; the clock and the containment check are the library's, and every line is printed through its
#     never-failing log.
#   - A dropped picture whose __02 ... __99 names are all taken is refused (409) rather than written over
#     __100, so a picture is never written over.
#   - NAMESPACE names the server the routes belong to, ValeVision Gallery (TrueVision: ProjectVision).
# - Back-port     : the file-link fence, the dot-segment refusal and a quarantining delete would harden
#                   TrueVision's own routes.
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 06-Oct-2026 - Version 1.1.0
# - Moved into Api__ValeVision3D for app.valegardenhouses.com: projects come from the Master Library
#   (<project>/ValeVision3D/UserData__UserGeneratedContent__Drawings/10__StatementDocs); every write needs a
#   signed-in user at the authoring level (AppAdmin). Routes and behaviour unchanged.
#
# (TrueVision's file carries none: it was written with TrueVision3D v2.95.0, 20-Sep-2026, and has not changed
# since. ValeVision's history of this port is the PORT NOTE above.)
#
# =============================================================================


# #region ---------------------------------------------------------------------
# REGION | Imports
# -----------------------------------------------------------------------------

import base64
import os
import re
import shutil

from datetime import datetime, timezone

from flask import Blueprint, Response, jsonify, request

import ValeVision3D__Api__Core__ as vv_shared                     # <-- ValeVision3D's shared server helpers: project folders, atomic writes, the log
from ValeShared__Auth__ import Na__Auth__Require                    # <-- Writes need the authoring level (vv_shared.AUTHOR_LEVEL)

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Configuration
# -----------------------------------------------------------------------------
# The Projects root and the year and project folder rules are the shared
# library's (PROJECTS_ROOT, YEAR_PATTERN, FOLDER_PATTERN), read at call time,
# so a test repoints them there.

STATEMENTS_DIR          = '10__StatementDocs'
QUARANTINE_DIR          = '00__Deleted__Quarantine'                   # <-- Where a delete puts things; emptied by hand, never through a route

SEGMENT_PATTERN         = re.compile(r'^[A-Za-z0-9_\-. &()\[\]]{1,140}$')

TEXT_SUFFIXES           = ('.md', '.html', '.json', '.txt', '.note')
IMAGE_SUFFIXES          = ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.tif', '.tiff', '.bmp', '.svg', '.heic')
MAX_TEXT_BYTES          = 8 * 1024 * 1024                            # <-- A statement is tens of kilobytes; this only stops a runaway request
MAX_IMAGE_BYTES         = 64 * 1024 * 1024                           # <-- A 6144x4096 render is about 13 MB; this leaves room and still stops a runaway request
MAX_TREE_ENTRIES        = 6000

CONTENT_TYPES           = {                                          # <-- What the read route answers each suffix with
    '.md'   : 'text/markdown; charset=utf-8',
    '.html' : 'text/html; charset=utf-8',
    '.json' : 'application/json',
    '.txt'  : 'text/plain; charset=utf-8',
    '.note' : 'text/plain; charset=utf-8',
    '.jpg'  : 'image/jpeg',
    '.jpeg' : 'image/jpeg',
    '.png'  : 'image/png',
    '.webp' : 'image/webp',
    '.gif'  : 'image/gif',
    '.tif'  : 'image/tiff',
    '.tiff' : 'image/tiff',
    '.bmp'  : 'image/bmp',
    '.svg'  : 'image/svg+xml',
    '.heic' : 'image/heic'
}

valevision_statements_api = Blueprint('valevision_statements_api', __name__)

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Helpers
# -----------------------------------------------------------------------------

_now_iso   = vv_shared.now_iso                                       # <-- The current time as the app writes it: UTC, milliseconds, Z
_is_inside = vv_shared.is_inside                                     # <-- True when candidate_path resolves to somewhere inside parent_path
_log       = vv_shared.log                                           # <-- A line in the server's output that can never fail the request it describes


def _statements_root(project_folder, year_code, folder_id=''):
    """
    The one folder these routes may touch, or None when the project is not
    there. The folder itself is NOT created here: a project with no statements
    yet answers "not found" to a read and is created by the folder route.
    """
    project_dir = vv_shared.resolve_project_dir(project_folder, year_code, folder_id)
    if not project_dir:
        return None

    root = os.path.join(project_dir, STATEMENTS_DIR)
    if not _is_inside(root, vv_shared.PROJECTS_ROOT):
        return None
    return root


def _context():
    """The project from the query string or the JSON body: (project_folder, year, folder_id)."""
    return vv_shared.project_context()


def _project_label(project_folder, year_code, folder_id):
    """The project as a refusal names it."""
    return folder_id if folder_id else f'{project_folder} ({year_code})'


def _resolve(root, relative_path):
    """
    A caller-supplied path inside the statements folder, or None when it is not
    one. Every segment is checked by pattern AND the result is checked to be
    inside the root after resolution, so neither .. nor a link gets out.
    """
    if relative_path is None:
        return None
    text = str(relative_path).replace('\\', '/').strip().strip('/')
    if text == '':
        return root
    segments = [segment for segment in text.split('/') if segment != '']
    if not segments or len(segments) > 8:
        return None
    for segment in segments:
        if segment in ('.', '..') or not SEGMENT_PATTERN.match(segment):
            return None
        if segment.strip(' .') == '':
            return None                                                           # <-- '...' or '. .': Windows reads it as the folder it is in
    target = os.path.join(root, *segments)
    if not _is_inside(os.path.dirname(target) or root, root) or not _is_inside(target, root):
        return None                                                               # <-- Its folder OR itself resolving outside is out: a file link too
    return target


def _in_quarantine(root, target):
    """True when target is the quarantine folder or anything inside it."""
    return _is_inside(target, os.path.join(root, QUARANTINE_DIR))


def _refuse(message, status=400):
    return jsonify({'error': message}), status


def _kind_of(name):
    lower = name.lower()
    if lower.endswith(TEXT_SUFFIXES):
        return 'text'
    if lower.endswith(IMAGE_SUFFIXES):
        return 'image'
    return 'other'

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Routes - Reading
# -----------------------------------------------------------------------------

@valevision_statements_api.route('/api/valevision/statements/tree')
def statements_tree():
    """
    Every folder and file under 10__StatementDocs, with sizes and modified
    times. A static server cannot list a folder, so this is how the manager
    finds the statements, how the publisher finds the pictures a statement
    links to, and how the tidy-up finds the ones it does not.
    """
    project_folder, year_code, folder_id = _context()
    root = _statements_root(project_folder, year_code, folder_id)
    if not root:
        return _refuse(f'Project not found: {_project_label(project_folder, year_code, folder_id)}', 404)
    if not os.path.isdir(root):
        return jsonify({'status': 'ok', 'root': STATEMENTS_DIR, 'exists': False, 'entries': []})

    entries = []
    truncated = False
    for current, directories, files in os.walk(root):
        directories.sort()
        relative_dir = os.path.relpath(current, root).replace('\\', '/')
        if relative_dir == '.':
            relative_dir = ''
        for name in sorted(files):
            if len(entries) >= MAX_TREE_ENTRIES:
                truncated = True
                break
            full = os.path.join(current, name)
            try:
                stat = os.stat(full)
            except OSError:
                continue
            entries.append({
                'path'     : (relative_dir + '/' + name).lstrip('/'),
                'folder'   : relative_dir,
                'name'     : name,
                'kind'     : _kind_of(name),
                'bytes'    : stat.st_size,
                'modified' : datetime.fromtimestamp(stat.st_mtime, timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
            })
        if truncated:
            break

    return jsonify({
        'status'    : 'ok',
        'root'      : STATEMENTS_DIR,
        'exists'    : True,
        'truncated' : truncated,
        'entries'   : entries
    })


@valevision_statements_api.route('/api/valevision/statements/file', methods=['GET'])
def statements_read_file():
    """
    One file of the statements folder AS STORED - a statement's markdown, the
    HTML built from it, a picture - with Last-Modified (the file's modified
    time, read before its bytes, which the lockstep watch compares) and
    Cache-Control no-store. A file that is not there answers a JSON 404
    { missing: true }: the Statement Writer reads that as "no file", where the
    index page a static catch-all would send back reads as a statement.
    """
    project_folder, year_code, folder_id = _context()
    root = _statements_root(project_folder, year_code, folder_id)
    if not root:
        return _refuse(f'Project not found: {_project_label(project_folder, year_code, folder_id)}', 404)

    asked = request.args.get('path')
    target = _resolve(root, asked)
    if not target or target == root:
        return _refuse(f'Refused statement path "{asked}"')
    if _kind_of(os.path.basename(target)) == 'other':
        return _refuse('Only markdown, HTML, JSON, text files and pictures are read through this route')
    if not os.path.isfile(target):
        return jsonify({'error': f'Nothing at "{asked}"', 'missing': True}), 404

    try:
        with open(target, 'rb') as file_handle:
            modified = os.fstat(file_handle.fileno()).st_mtime
            data     = file_handle.read()
    except OSError as error:
        _log(f'[Statements] Failed to read {target}')
        _log(f'[Statements] {type(error).__name__}: {error}')
        return _refuse('Failed to read the statement file', 500)

    extension = os.path.splitext(target)[1].lower()
    response = Response(data, content_type=CONTENT_TYPES.get(extension, 'application/octet-stream'))
    response.last_modified = modified
    response.headers['Cache-Control'] = 'no-store'
    return response

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Routes - Writing
# -----------------------------------------------------------------------------

@valevision_statements_api.route('/api/valevision/statements/file', methods=['POST'])
@Na__Auth__Require(vv_shared.AUTHOR_LEVEL)
def statements_write_file():
    """
    Write one text file - a statement's markdown, its generated HTML - into the
    statements folder. The folders on the way to it are created; the file is
    written whole, with the newline convention the app writes everywhere.
    """
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return _refuse('Request body must be a JSON object')

    project_folder, year_code, folder_id = _context()
    root = _statements_root(project_folder, year_code, folder_id)
    if not root:
        return _refuse(f'Project not found: {_project_label(project_folder, year_code, folder_id)}', 404)

    target = _resolve(root, body.get('path'))
    if not target or target == root or _in_quarantine(root, target):
        return _refuse(f'Refused statement path "{body.get("path")}"')
    if not target.lower().endswith(TEXT_SUFFIXES):
        return _refuse('Only markdown, HTML, JSON and text files are written through this route')

    text = body.get('text')
    if not isinstance(text, str):
        return _refuse('"text" must be a string')
    if len(text.encode('utf-8')) > MAX_TEXT_BYTES:
        return _refuse('That file is larger than this route will take')

    try:
        vv_shared.write_text_atomic(target, text, newline='')                  # <-- newline='' so the markdown keeps its own line endings
    except Exception as error:                                                  # noqa: BLE001 - reported, never raised at the browser
        _log(f'[Statements] Failed to write {target}')
        _log(f'[Statements] {type(error).__name__}: {error}')
        return _refuse('Failed to write the statement file', 500)

    return jsonify({
        'status'   : 'ok',
        'path'     : os.path.relpath(target, root).replace('\\', '/'),
        'bytes'    : len(text.encode('utf-8')),
        'written'  : _now_iso()
    })


@valevision_statements_api.route('/api/valevision/statements/image', methods=['POST'])
@Na__Auth__Require(vv_shared.AUTHOR_LEVEL)
def statements_write_image():
    """
    Put a dropped picture into the statement's own pictures folder.

    A picture dragged onto the editor comes from wherever it happens to live
    on this machine - a camera roll, a render output folder - and the browser
    hands over its bytes, never its path. So the bytes come through here as
    base64 and land beside the statement, which is what makes the link in the
    markdown work in Typora as well as in the app.
    """
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return _refuse('Request body must be a JSON object')

    project_folder, year_code, folder_id = _context()
    root = _statements_root(project_folder, year_code, folder_id)
    if not root:
        return _refuse(f'Project not found: {_project_label(project_folder, year_code, folder_id)}', 404)

    target = _resolve(root, body.get('path'))
    if not target or target == root or _in_quarantine(root, target):
        return _refuse(f'Refused statement path "{body.get("path")}"')
    if not target.lower().endswith(IMAGE_SUFFIXES):
        return _refuse('Only pictures are written through this route')

    encoded = body.get('dataBase64')
    if not isinstance(encoded, str) or not encoded:
        return _refuse('"dataBase64" must be a base64 string')

    try:
        blob = base64.b64decode(encoded, validate=True)
    except Exception:                                                           # noqa: BLE001
        return _refuse('"dataBase64" is not valid base64')
    if len(blob) > MAX_IMAGE_BYTES:
        return _refuse('That picture is larger than this route will take')

    # A PICTURE IS NEVER WRITTEN OVER. Two shots can easily share a name, and
    # the one already in the folder may be the one the statement links to, so
    # a clash gets a suffix and the caller is told what the file ended up as.
    final = target
    if os.path.exists(final):
        stem, suffix = os.path.splitext(target)
        index = 2
        while os.path.exists(f'{stem}__{index:02d}{suffix}') and index < 100:
            index += 1
        final = f'{stem}__{index:02d}{suffix}'
        if os.path.exists(final):
            return _refuse(f'Every name for "{body.get("path")}" up to __{index:02d} is taken; nothing was written', 409)

    try:
        vv_shared.write_bytes_atomic(final, blob)
    except Exception as error:                                                  # noqa: BLE001
        _log(f'[Statements] Failed to write {final}')
        _log(f'[Statements] {type(error).__name__}: {error}')
        return _refuse('Failed to write the picture', 500)

    return jsonify({
        'status' : 'ok',
        'path'   : os.path.relpath(final, root).replace('\\', '/'),
        'bytes'  : len(blob),
        'renamed': final != target
    })


@valevision_statements_api.route('/api/valevision/statements/folder', methods=['POST'])
@Na__Auth__Require(vv_shared.AUTHOR_LEVEL)
def statements_make_folder():
    """Create a folder inside the statements folder, and its parents with it."""
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return _refuse('Request body must be a JSON object')

    project_folder, year_code, folder_id = _context()
    root = _statements_root(project_folder, year_code, folder_id)
    if not root:
        return _refuse(f'Project not found: {_project_label(project_folder, year_code, folder_id)}', 404)

    target = _resolve(root, body.get('path'))
    if not target or _in_quarantine(root, target):
        return _refuse(f'Refused statement path "{body.get("path")}"')

    try:
        os.makedirs(target, exist_ok=True)
    except Exception as error:                                                  # noqa: BLE001
        _log(f'[Statements] Failed to create {target}')
        _log(f'[Statements] {type(error).__name__}: {error}')
        return _refuse('Failed to create the folder', 500)

    return jsonify({'status': 'ok', 'path': os.path.relpath(target, root).replace('\\', '/')})


@valevision_statements_api.route('/api/valevision/statements/move', methods=['POST'])
@Na__Auth__Require(vv_shared.AUTHOR_LEVEL)
def statements_move():
    """
    Move or rename a file or folder inside the statements folder. This is what
    renames a statement and what parks a picture the document no longer uses
    in its 00__Images folder. It will not write over something already there.
    """
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return _refuse('Request body must be a JSON object')

    project_folder, year_code, folder_id = _context()
    root = _statements_root(project_folder, year_code, folder_id)
    if not root:
        return _refuse(f'Project not found: {_project_label(project_folder, year_code, folder_id)}', 404)

    source = _resolve(root, body.get('from'))
    target = _resolve(root, body.get('to'))
    if not source or source == root or _in_quarantine(root, source):
        return _refuse(f'Refused source "{body.get("from")}"')
    if not target or target == root or _in_quarantine(root, target):
        return _refuse(f'Refused destination "{body.get("to")}"')
    if not os.path.exists(source):
        return _refuse(f'Nothing at "{body.get("from")}"', 404)
    if os.path.exists(target):
        return _refuse(f'Something is already at "{body.get("to")}"', 409)

    try:
        os.makedirs(os.path.dirname(target), exist_ok=True)
        shutil.move(source, target)
    except Exception as error:                                                  # noqa: BLE001
        _log(f'[Statements] Failed to move {source} -> {target}')
        _log(f'[Statements] {type(error).__name__}: {error}')
        return _refuse('Failed to move it', 500)

    return jsonify({
        'status' : 'ok',
        'from'   : os.path.relpath(source, root).replace('\\', '/'),
        'to'     : os.path.relpath(target, root).replace('\\', '/')
    })


@valevision_statements_api.route('/api/valevision/statements/delete', methods=['POST'])
@Na__Auth__Require(vv_shared.AUTHOR_LEVEL)
def statements_delete():
    """
    Delete a file, or a whole statement folder. The caller must send back the
    exact path as "confirm" as well as "path": deleting a statement takes a
    folder of somebody's writing with it, and a mistyped path that happens to
    exist is not an instruction. Nothing is unlinked: it moves into the
    quarantine, under the path it had, and stays there until emptied by hand.
    """
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return _refuse('Request body must be a JSON object')

    project_folder, year_code, folder_id = _context()
    root = _statements_root(project_folder, year_code, folder_id)
    if not root:
        return _refuse(f'Project not found: {_project_label(project_folder, year_code, folder_id)}', 404)

    asked = body.get('path')
    if body.get('confirm') != asked:
        return _refuse('The delete was not confirmed: "confirm" must repeat "path" exactly')

    target = _resolve(root, asked)
    if not target or target == root:
        return _refuse(f'Refused statement path "{asked}"')
    if _in_quarantine(root, target):
        return _refuse('The quarantine is emptied by hand, never through this route')
    if not os.path.exists(target):
        return _refuse(f'Nothing at "{asked}"', 404)

    relative    = os.path.relpath(target, root).replace('\\', '/')
    stamp       = datetime.now().strftime('%Y%m%d-%H%M%S-%f')
    destination = os.path.join(root, QUARANTINE_DIR, stamp, *relative.split('/'))
    try:
        os.makedirs(os.path.dirname(destination), exist_ok=True)
        shutil.move(target, destination)
    except Exception as error:                                                  # noqa: BLE001
        _log(f'[Statements] Failed to quarantine {target}')
        _log(f'[Statements] {type(error).__name__}: {error}')
        return _refuse('Failed to delete it', 500)

    _log(f'[Statements] Quarantined {relative} as {QUARANTINE_DIR}/{stamp}/{relative}')
    return jsonify({'status': 'ok', 'deleted': relative, 'quarantined': f'{QUARANTINE_DIR}/{stamp}/{relative}'})

# endregion -------------------------------------------------------------------
