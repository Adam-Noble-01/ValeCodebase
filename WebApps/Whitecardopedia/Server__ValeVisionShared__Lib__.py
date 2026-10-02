#!/usr/bin/env python3
# =============================================================================
# VALEVISION3D - SHARED SERVER LIBRARY (FLASK HELPERS)
# =============================================================================
#
# FILE       : Server__ValeVisionShared__Lib__.py
# MODULE     : ValeVisionSharedServerLib
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : The helpers every ValeVision3D route on the local server shares: atomic writes, project file
#              backups kept outside the repository, the drawings fingerprint, and project folders that can
#              never resolve outside WebApps/Whitecardopedia/Projects
# CREATED    : 01-Oct-2026
#
# DESCRIPTION:
# - ONE LIBRARY, NO ROUTES. server.py beside this file and the ValeVision3D
#   blueprints (Server__ValeVision<Feature>__Api__.py) import it; it registers
#   nothing itself. Every helper reads this module's constants AT CALL TIME,
#   so a test points PROJECTS_ROOT and PROJECT_BACKUP_ROOT at temporary
#   folders before its first request and nothing real is written.
# - EVERY JSON WRITE IS ATOMIC. The whole text is built first, written to a
#   temporary file beside the target (*.tmp), flushed to disk and moved over
#   the old file (os.replace). A move Windows refuses for a moment - a reader
#   holding the file open - is retried for about a second and a half; a text
#   write whose move is still refused falls back to writing in place, which
#   is what these routes did before. A write that fails before the move (a
#   full disk, an interrupted request) leaves the old file whole and no
#   temporary file behind.
# - EVERY COPY OVERWRITTEN IS KEPT. Before a route overwrites a project file
#   (project.json, the drawing notes), the copy going is kept under
#   PROJECT_BACKUP_ROOT, the file's path under the Projects folder mirrored
#   beneath it, the moment in its name; the newest PROJECT_BACKUP_KEEP stay.
#   Outside the repository and outside every project folder on purpose: the
#   repository is public (GitHub Pages) and the R2 sync uploads a project
#   folder whole, so a copy kept in either would be published. A root that
#   resolves inside either is refused and nothing is kept there. A copy that
#   cannot be made is printed and the save goes on: a save refused for want
#   of a backup would lose more than the backup protects.
# - THE DRAWINGS FINGERPRINT. What the drawings block of a project document
#   is, as { savedIso, digest }: digest is 'sha1:' and the SHA-1 of the
#   block's canonical JSON (keys sorted, no spaces), so the same drawings
#   fingerprint the same however the file is formatted, and a block changed
#   by anything at all - another window's save, an agent's edit, a git
#   checkout - does not. A save that carries the fingerprint it loaded
#   (DRAWINGS_BASE_HEADER) is refused by server.py when the block on disk has
#   since become something else.
# - PROJECT FOLDERS STAY INSIDE THE PROJECTS FOLDER. A project folder id is
#   refused when a segment of it is '.' or '..' (or only dots and spaces, which
#   Windows reads the same way), and when its real path - links resolved -
#   is not at least a year folder and a project folder deep inside
#   PROJECTS_ROOT. server.py's get_project_path and every blueprint resolver
#   use these checks, so no route can read, write or delete outside it.
#
# CONFIGURATION ADAM CONFIRMS:
# - PROJECT_BACKUP_ROOT (below): %LOCALAPPDATA%\ValeGardenHouses\ValeVision\ProjectDataBackups,
#   keep 30, unless the environment variable VALEVISION_PROJECT_BACKUP_ROOT
#   names another folder outside the repository. The server banner prints it.
#
# -----------------------------------------------------------------------------
#
# PORT NOTE:
# - Ported from   : TrueVision3D's local server, na-apps/ProjectVision__LocalServer__Main__.py (the project
#                   file backups, the drawings fingerprint and _write_json_file), and
#                   na-apps/ProjectVision__TrueVisionUserConfig__Api__.py (write_text_atomic), with the
#                   replace-with-retry of na-apps/ProjectVision__TrueVisionSheetImages__Api__.py
# - Source version: LocalServer (no module version; the save guard and backups of TrueVision3D v2.146.0,
#                   22-Sep-2026, the atomic JSON writes of v2.144.0, 22-Sep-2026); UserConfig API 1.0.0
#                   (TrueVision3D v2.144.0); read at HEAD b2aa9151
# - Ported on     : 01-Oct-2026 for ValeVision3D v2.71.1
# - Parity        : adapted - the helpers TrueVision keeps inside its server file live here in one library
#                   for ValeVision's server.py and blueprints; the fingerprint, the backup naming, the
#                   mirroring and the 30 kept are TrueVision's, so a backup or a fingerprint reads the same
#                   in either app.
# - Divergences   :
#   - Projects root WebApps/Whitecardopedia/Projects/<yyyy>/<folder> (TrueVision's na-project-portal/<yy>-Projects/
#     <folder>/30__TrueVision__AppContent); header X-ValeVision-Drawings-Base; backup root
#     %LOCALAPPDATA%\ValeGardenHouses\ValeVision\ProjectDataBackups or VALEVISION_PROJECT_BACKUP_ROOT; sibling
#     files ValeVision__DrawingNotes__.json and ValeVision__StatementDocs__.json; /api/health service
#     'whitecardopedia-local-dev' (K1 DR-28 (A)).
#   - Project folders are checked by segment and by real path (resolve_project_dir, contain_project_path):
#     TrueVision's server resolves a project by its code and never takes a path; ValeVision's routes take
#     the folder id, and WebApps/Whitecardopedia/server.py's get_project_path joined it unchecked.
#   - A backup root inside the repository or the Projects folder is refused (TrueVision trusts its setting).
#   - write_text_atomic retries a refused move (the sheet-images API's delays) before it writes in place,
#     falls back in place only when the MOVE is refused - never when the temporary write itself failed - and
#     takes TrueVision's file name pattern through tempfile, so two requests never share a temporary file.
#     write_text_atomic(path, text) keeps TrueVision's call shape; newline=None writes the platform's line
#     ending, which project.json is written with (as server.py always wrote it).
#   - PROJECT_FILE_LOCK holds the guard's check, the backup and the write together, so two saves arriving at
#     once cannot both pass the check.
#   - read_json_file reads past a byte order mark; send_json_file answers a file that does not parse with a
#     500 naming the line, never broken JSON.
# - Back-port     : the per-segment and real-path checks, the lock round the guarded write, and the in-place
#                   fallback only on a refused move would each harden TrueVision's own server.
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 01-Oct-2026 - Version 1.0.0 (v2.71.1)
# - Created for the ValeVision3D Flask persistence core: atomic writes with retries, project file backups
#   outside the repository (keep 30), the drawings fingerprint, the sibling-file allow-list, project
#   folder containment, JSON 404s and the stored-bytes JSON reader with Last-Modified.
#
# =============================================================================


# #region ---------------------------------------------------------------------
# REGION | Imports
# -----------------------------------------------------------------------------

import os
import re
import json
import time
import shutil
import hashlib
import tempfile
import threading

from datetime import datetime, timezone

from flask import Response, jsonify, request

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Configuration
# -----------------------------------------------------------------------------

SCRIPT_DIR               = os.path.dirname(os.path.abspath(__file__))           # <-- WebApps/Whitecardopedia, beside server.py
REPOSITORY_ROOT          = os.path.dirname(os.path.dirname(SCRIPT_DIR))           # <-- D:/10_CoreLib__ValeCodebase: public, so no backup is ever kept inside it
PROJECTS_ROOT            = os.path.join(SCRIPT_DIR, 'Projects')                   # <-- Projects/<yyyy>/<folder>/project.json; read at call time (tests repoint it)

APP_NAME                 = 'ValeVision3D'
LOCAL_SERVICE_NAME       = 'whitecardopedia-local-dev'                            # <-- What GET /api/health names; ported modules compare their SERVICE constant with it

PROJECT_DATA_FILENAME    = 'project.json'
SIBLING_FILES            = frozenset({
    'ValeVision__DrawingNotes__.json',                                            # <-- The specification (drawing notes), beside project.json
    'ValeVision__StatementDocs__.json',                                           # <-- The Statement Writer's index of the project's written documents
})

# PROJECT FILE BACKUPS | The copy about to be overwritten is kept first
# -----------------------------------------------------------------------------
# Outside the repository and outside every project folder: the repository is
# public and the R2 sync uploads a project folder whole, so a copy kept in
# either would be published. VALEVISION_PROJECT_BACKUP_ROOT in the
# environment moves the folder; the server banner prints where it is.
# ADAM CONFIRMS THIS LOCATION (K1 DR-30, front matter Q-BACKUP): the default
# is TrueVision's own convention with Vale names.
PROJECT_BACKUP_ROOT      = os.environ.get('VALEVISION_PROJECT_BACKUP_ROOT') or os.path.join(
    os.environ.get('LOCALAPPDATA') or os.path.expanduser('~'), 'ValeGardenHouses', 'ValeVision', 'ProjectDataBackups')
PROJECT_BACKUP_KEEP      = 30                                                     # <-- Copies kept per file; the oldest goes as a new one is made
PROJECT_BACKUP_STAMP     = '%Y%m%d-%H%M%S-%f'                                     # <-- Sorts by name into time order

# DRAWINGS SAVE GUARD | A save must be built on the drawings as they are on disk
# -----------------------------------------------------------------------------
# The Layout Editor writes the drawings block whole (every sheet), so a window
# that loaded the block, then saved after another window had, would put the
# other window's sheets back to how they were. The app learns the block's
# fingerprint when it loads (GET .../drawings-fingerprint), sends it back with
# its save, and server.py refuses the write (409) when the block on disk has
# since become something else. A save that carries no header is not checked:
# other writers merge other keys and leave the block as they found it.
DRAWINGS_BLOCK_KEY       = 'LayoutEditor__DrawingsData'
DRAWINGS_SAVED_ISO_KEY   = 'LayoutEditor__DrawingsData__SavedIso'                 # <-- Written by the app on each save: when, for people
DRAWINGS_BASE_HEADER     = 'X-ValeVision-Drawings-Base'                           # <-- The fingerprint the app loaded, or "none"

# WRITES AND FOLDER NAMES
# -----------------------------------------------------------------------------
REPLACE_RETRY_DELAYS_S   = (0.05, 0.1, 0.2, 0.4, 0.8)                             # <-- A file held open by a reader can refuse a rename for a moment
TEMP_SUFFIX              = '.tmp'                                                 # <-- A leftover after a crash is plainly a temporary file
YEAR_PATTERN             = re.compile(r'^\d{4}$')                                 # <-- ValeVision's year folders: 2025, 2026
FOLDER_PATTERN           = re.compile(r'^[^<>:"/\\|?*\x00-\x1F]{1,160}$')         # <-- One project folder name; spaces allowed (2025/FN-62104__Fenner Scheme-01)
FOLDER_ID_PATTERN        = re.compile(r'^(\d{4})/([^<>:"/\\|?*\x00-\x1F]{1,160})$')   # <-- The worker's own folderId rule (ProjectRename), one year and one folder

PROJECT_FILE_LOCK        = threading.Lock()                                       # <-- One guarded write at a time: the check, the backup and the write stay together

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Small Helpers
# -----------------------------------------------------------------------------

class ProjectPathRefused(ValueError):
    """A project folder id that would reach outside the Projects folder, or onto it or a year folder."""


def log(message):
    """
    A line in the server's output that can never fail the request it
    describes: a console that cannot print one of its letters (a cp1252 pipe
    and an accented folder name, say) must not turn a save into an error.
    """
    try:
        print(message)
    except Exception:
        try:
            print(str(message).encode('ascii', 'backslashreplace').decode('ascii'))
        except Exception:
            pass


def now_iso():
    """The current time as the app writes it: UTC, milliseconds, Z."""
    now = datetime.now(timezone.utc)                                     # <-- Read once, so the seconds and the milliseconds are the same instant
    return now.strftime('%Y-%m-%dT%H:%M:%S.') + f'{now.microsecond // 1000:03d}Z'


def is_inside(candidate_path, parent_path):
    """True when candidate_path resolves to parent_path or somewhere inside it."""
    parent    = os.path.normcase(os.path.realpath(parent_path))
    candidate = os.path.normcase(os.path.realpath(candidate_path))
    return candidate == parent or candidate.startswith(parent.rstrip(os.sep) + os.sep)


def json_404(message='no such API route', **extra):
    """A JSON 404, never the index page: { error, ...extra }."""
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
# REGION | Project Folders - Never Outside the Projects Folder
# -----------------------------------------------------------------------------

def has_dot_segment(folder_id):
    """
    True when a segment of the folder id is '.' or '..', or is made only of
    dots and spaces - Windows trims a segment's trailing dots and spaces, so
    '... ' reads as a step up or nothing at all.
    """
    for segment in re.split(r'[\\/]', str(folder_id or '')):
        if segment and segment.strip(' .') == '' and '.' in segment:
            return True
    return False


def is_contained_project_path(candidate_path, min_depth=2):
    """
    True when the candidate's real path (links resolved) lies inside
    PROJECTS_ROOT at least min_depth folders down: a year folder and a project
    folder. The Projects folder itself and a year folder are never a project.
    """
    root = os.path.realpath(PROJECTS_ROOT)
    real = os.path.realpath(candidate_path)
    root_case, real_case = os.path.normcase(root), os.path.normcase(real)
    if not real_case.startswith(root_case.rstrip(os.sep) + os.sep):
        return False
    try:
        relative = os.path.relpath(real, root)
    except ValueError:                                                    # <-- Another drive altogether
        return False
    depth = len([part for part in relative.split(os.sep) if part not in ('', '.')])
    return depth >= min_depth


def contain_project_path(candidate_path, folder_id=None):
    """candidate_path when it is a project path inside PROJECTS_ROOT; ProjectPathRefused otherwise."""
    if has_dot_segment(folder_id) or not is_contained_project_path(candidate_path):
        raise ProjectPathRefused(f'Refused project folder id: {folder_id if folder_id is not None else candidate_path}')
    return candidate_path


def project_context():
    """
    The project a blueprint request names, as (project_folder, year, folder_id):
    TrueVision's query names project-folder and year (a 4-digit year here), or
    folder-id=YYYY/Folder; the same keys in a JSON body as projectFolder, year
    and folderId. Empty strings where nothing was given.
    """
    body = request.get_json(silent=True) if request.is_json else None
    body = body if isinstance(body, dict) else {}
    folder    = request.args.get('project-folder') or body.get('projectFolder') or body.get('project-folder')
    year      = request.args.get('year') or body.get('year')
    folder_id = request.args.get('folder-id') or body.get('folderId') or body.get('folder-id')
    return (
        str(folder).strip() if folder is not None else '',
        str(year).strip() if year is not None else '',
        str(folder_id).strip().strip('/') if folder_id is not None else ''
    )


def resolve_project_dir(project_folder=None, year=None, folder_id=None):
    """
    The folder of a project that exists, Projects/<yyyy>/<folder>, or None. Takes
    folder_id 'YYYY/Folder', or project_folder with a 4-digit year. Every part
    is checked by pattern and the result by real path, so neither '..' nor a
    link gets out of PROJECTS_ROOT. Nothing is created here.
    """
    if folder_id:
        match = FOLDER_ID_PATTERN.match(str(folder_id))
        if not match:
            return None
        year, project_folder = match.group(1), match.group(2)
    if not project_folder or not year:
        return None
    year, project_folder = str(year).strip(), str(project_folder).strip()
    if not YEAR_PATTERN.match(year) or not FOLDER_PATTERN.match(project_folder) or has_dot_segment(project_folder):
        return None
    project_dir = os.path.join(PROJECTS_ROOT, year, project_folder)
    if not os.path.isdir(project_dir) or not is_contained_project_path(project_dir):
        return None
    return project_dir


def sanitize_sibling_filename(filename):
    """The file name when it is an allowed sibling of project.json, else None."""
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
        with open(file_path, 'r', encoding='utf-8-sig') as file_handle:   # <-- -sig: a byte order mark a Windows editor saved is read past
            document = json.load(file_handle)
        return document if isinstance(document, dict) else None
    except (OSError, ValueError):
        return None


def _replace_with_retry(source, target):
    """os.replace, retried briefly while a reader holds the target open."""
    for delay in REPLACE_RETRY_DELAYS_S + (None,):
        try:
            os.replace(source, target)
            return
        except PermissionError:
            if delay is None:
                raise
            time.sleep(delay)


def write_bytes_atomic(file_path, data, in_place_fallback=False):
    """
    Write bytes so a reader never sees half of them: to a temporary file beside
    the target, flushed to disk, then moved over it (retried while a reader
    holds the target). A failure before the move leaves the target untouched
    and removes the temporary file. Where the move itself is still refused,
    in_place_fallback writes the target in place; otherwise the error is
    raised and the target is as it was.
    """
    directory = os.path.dirname(os.path.abspath(file_path))
    os.makedirs(directory, exist_ok=True)
    handle, temp_path = tempfile.mkstemp(prefix=os.path.basename(file_path) + '.', suffix=TEMP_SUFFIX, dir=directory)
    try:
        with os.fdopen(handle, 'wb') as file_handle:
            file_handle.write(data)
            file_handle.flush()
            os.fsync(file_handle.fileno())
    except BaseException:
        _remove_quietly(temp_path)
        raise
    try:
        _replace_with_retry(temp_path, file_path)
    except OSError:
        _remove_quietly(temp_path)
        if not in_place_fallback:
            raise
        with open(file_path, 'wb') as file_handle:                       # <-- The move was refused (a target another program holds open on Windows): write in place, as before
            file_handle.write(data)
    except BaseException:
        _remove_quietly(temp_path)
        raise


def write_text_atomic(file_path, text, newline='\n'):
    """
    TrueVision's write_text_atomic(file_path, text): UTF-8, written through a
    temporary file and moved over the target, written in place where the move
    is refused. newline follows open(): '\\n' or '' writes the text as it is
    (LF), None writes the platform's line ending, '\\r\\n' writes CRLF.
    """
    if newline is None:
        line_ending = os.linesep
    elif newline in ('', '\n'):
        line_ending = '\n'
    else:
        line_ending = newline
    if line_ending != '\n':
        text = text.replace('\n', line_ending)
    write_bytes_atomic(file_path, text.encode('utf-8'), in_place_fallback=True)


def json_text(payload):
    """A JSON object with project-standard formatting: 4-space indents, LF, a final newline."""
    return json.dumps(payload, indent=4, ensure_ascii=False) + '\n'


def write_json_file(file_path, payload):
    """
    Write a JSON object with project-standard formatting (TrueVision's
    _write_json_file). The text is built in full first and written atomically,
    so a save that fails part way leaves the previous file whole.
    """
    write_text_atomic(file_path, json_text(payload))


def unreadable_message(file_name, error):
    """Where a file edited by hand stopped being readable, so it can be found and put right."""
    if isinstance(error, json.JSONDecodeError):
        return f'{file_name} is not valid JSON: line {error.lineno}, column {error.colno} ({error.msg})'
    if isinstance(error, UnicodeDecodeError):
        return f'{file_name} is not UTF-8 text (byte {error.start}): save it as UTF-8'
    return f'{file_name} could not be read ({type(error).__name__})'


def send_json_file(file_path):
    """
    A JSON file's bytes AS STORED - never re-serialised, so keys keep the order
    the app wrote them in - with Last-Modified (the file's modified time, read
    before its bytes, so a change while it is read shows on the next look) and
    Cache-Control no-store. A file that does not parse answers 500 with
    unreadable true and the line and column, never broken JSON.
    """
    with open(file_path, 'rb') as file_handle:
        modified = os.fstat(file_handle.fileno()).st_mtime
        data     = file_handle.read()
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
# REGION | The Drawings Fingerprint
# -----------------------------------------------------------------------------

def drawings_fingerprint(document):
    """
    What the drawings block of a project document is, as { savedIso, digest }.
    digest is 'sha1:' and the SHA-1 of the block's canonical JSON (keys sorted,
    no spaces), so two files holding the same drawings fingerprint the same
    however they were formatted, and a block changed by anything at all does
    not. Both are None when the document has no block.
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


# #region ---------------------------------------------------------------------
# REGION | Project File Backups - Outside the Repository
# -----------------------------------------------------------------------------

def backup_root_problem():
    """Why no backup may be kept at PROJECT_BACKUP_ROOT (inside the repository or the Projects folder), or None."""
    root = PROJECT_BACKUP_ROOT
    if not root:
        return 'no backup folder is configured'
    for name, folder in (('the repository', REPOSITORY_ROOT), ('the Projects folder', PROJECTS_ROOT)):
        if is_inside(root, folder):
            return f'the backup folder {root} is inside {name} ({folder}), which is published: no backups are kept there'
    return None


def backup_dir_for(file_path):
    """Where a file's backups go: its path under the Projects folder, mirrored under PROJECT_BACKUP_ROOT."""
    try:
        relative = os.path.relpath(os.path.abspath(file_path), os.path.abspath(PROJECTS_ROOT))
    except ValueError:                                                    # <-- Another drive altogether
        relative = os.path.basename(file_path)
    if relative.startswith('..') or os.path.isabs(relative):
        relative = os.path.basename(file_path)                            # <-- A file outside the Projects folder keeps just its name
    return os.path.join(PROJECT_BACKUP_ROOT, os.path.dirname(relative))


def backup_before_overwrite(file_path):
    """
    Copy the file about to be overwritten into its backup folder, named with
    the moment, and keep the newest PROJECT_BACKUP_KEEP of them. Returns the
    copy's path, or None when there was nothing to copy or no copy could be
    kept. Never raises: a copy that could not be made is printed and the save
    goes on.
    """
    if not os.path.isfile(file_path):
        return None
    problem = backup_root_problem()
    if problem:
        log(f' [BACKUP] Not kept for {file_path}: {problem}')
        return None
    try:
        stem, extension = os.path.splitext(os.path.basename(file_path))
        backup_dir  = backup_dir_for(file_path)
        os.makedirs(backup_dir, exist_ok=True)
        stamp       = datetime.now().strftime(PROJECT_BACKUP_STAMP)
        backup_path = os.path.join(backup_dir, f'{stem}.{stamp}{extension}')
        shutil.copy2(file_path, backup_path)
        kept = sorted(
            name for name in os.listdir(backup_dir)
            if name.startswith(stem + '.') and name.endswith(extension) and len(name) > len(stem) + len(extension) + 1
        )
        for name in kept[:-PROJECT_BACKUP_KEEP] if len(kept) > PROJECT_BACKUP_KEEP else []:
            _remove_quietly(os.path.join(backup_dir, name))
        return backup_path
    except Exception as error:
        log(f' [BACKUP] Backup before overwrite failed for {file_path}')
        log(f' [BACKUP] {type(error).__name__}: {error}')
        return None


def list_backups(file_path):
    """The backups kept for a file, newest first: [{ file, path, bytes, modifiedIso }]."""
    stem, extension = os.path.splitext(os.path.basename(file_path))
    backup_dir = backup_dir_for(file_path)
    if not os.path.isdir(backup_dir):
        return []
    entries = []
    for name in os.listdir(backup_dir):
        if not (name.startswith(stem + '.') and name.endswith(extension)):
            continue
        path = os.path.join(backup_dir, name)
        try:
            stat = os.stat(path)
        except OSError:
            continue
        entries.append({
            'file'        : name,
            'path'        : path,
            'bytes'       : stat.st_size,
            'modifiedIso' : datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat().replace('+00:00', 'Z')
        })
    entries.sort(key=lambda entry: entry['file'], reverse=True)
    return entries

# endregion -------------------------------------------------------------------
