# W0-09 scratch: build the candidate WCP/server.py from the live file, preserving CRLF and
# every untouched line byte for byte (fine-grained edits; whitespace-only lines kept).
# Writes original_server.py (exact bytes, for a restore) and candidate_server.py beside this
# script. The live server.py is NOT written by this script.
import os

LIVE = r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\server.py'
HERE = os.path.dirname(os.path.abspath(__file__))

raw = open(LIVE, 'rb').read()
assert raw.count(b'\r\n') == raw.count(b'\n'), 'server.py is not pure CRLF'
assert b'\r' not in raw.replace(b'\r\n', b''), 'lone CR in server.py'
text = raw.decode('utf-8').replace('\r\n', '\n')

W4  = ' ' * 4                       # whitespace-only lines, as the file writes them
W8  = ' ' * 8
W12 = ' ' * 12


def lines(*items):
    """Join lines with LF and end with LF (whitespace-only lines given explicitly)."""
    return '\n'.join(items) + '\n'


def replace_once(source, old, new):
    count = source.count(old)
    assert count == 1, f'anchor found {count} times: {old[:90]!r}'
    return source.replace(old, new)


SEP = '# ------------------------------------------------------------'

# -----------------------------------------------------------------------------
# 1. HEADER: description and endpoint list
# -----------------------------------------------------------------------------
text = replace_once(text,
    lines('# - Uses bundled Flask dependencies from ThirdParty__VersionLockedDependencies'),
    lines(
        '# - Uses bundled Flask dependencies from ThirdParty__VersionLockedDependencies',
        '# - Writes every project file atomically and keeps the copy it overwrites',
        '#   first, outside the repository: the last 30 copies of each file in the',
        '#   backup folder the banner prints (Server__ValeVisionShared__Lib__.py,',
        '#   PROJECT_BACKUP_ROOT; the VALEVISION_PROJECT_BACKUP_ROOT variable moves it)',
        '# - Refuses (409) a ValeVision3D drawings save built on drawings that are no',
        '#   longer the ones on disk - the X-ValeVision-Drawings-Base header against the',
        "#   drawings block's fingerprint - so another window's save, an agent's edit or",
        '#   a git checkout is never overwritten unseen. A save without the header is',
        "#   not judged and lands as before (TrueVision3D's guard, v2.146.0)",
        "# - A project folder id never resolves outside Projects/ (no '.' or '..'",
        '#   segment, real path checked: 400 otherwise), and an unknown /api/ route',
        '#   answers a JSON 404, never index.html',
    ))

text = replace_once(text,
    lines('# - GET  /api/check-localhost     : Localhost detection endpoint'),
    lines(
        '# - GET  /api/check-localhost     : Localhost detection endpoint',
        "# - GET  /api/health              : Local server health { status, service : 'whitecardopedia-local-dev', app, port }",
    ))

text = replace_once(text,
    lines('# - POST /api/projects/<folder>   : Save updated project.json data (local mirror \u2014 called AFTER R2 write)'),
    lines(
        '# - POST /api/projects/<folder>   : Save updated project.json data (local mirror \u2014 called AFTER R2 write); backed up',
        '#                                   first; with X-ValeVision-Drawings-Base, refused (409) unless the drawings on disk',
        '#                                   are the ones it names',
        '# - GET  /api/projects/<folder>/drawings-fingerprint : The drawings block on disk now { savedIso, digest }',
        '# - GET  /api/projects/<folder>/backups     : The copies kept of project.json and its sibling files, newest first',
    ))

text = replace_once(text,
    lines(
        '# - GET  /api/projects/<folder>/drawing-notes : Read ValeVision__DrawingNotes__.json beside project.json',
        '# - POST /api/projects/<folder>/drawing-notes : Write ValeVision__DrawingNotes__.json beside project.json',
    ),
    lines(
        '# - GET  /api/projects/<folder>/files/<name>  : Read an allowed sibling of project.json (ValeVision__DrawingNotes__.json,',
        '#                                              ValeVision__StatementDocs__.json) as stored, with Last-Modified',
        '# - POST /api/projects/<folder>/files/<name>  : Write it: backed up first, atomic, 4-space JSON, LF, final newline',
        '# - GET  /api/projects/<folder>/drawing-notes : Read ValeVision__DrawingNotes__.json beside project.json (alias of files/<name>)',
        '# - POST /api/projects/<folder>/drawing-notes : Write ValeVision__DrawingNotes__.json beside project.json (alias of files/<name>)',
    ))

text = replace_once(text,
    lines('# - POST /api/valevision/scrapbook/items/delete : Move a Custom Scrapbook item file into its quarantine folder'),
    lines(
        '# - POST /api/valevision/scrapbook/items/delete : Move a Custom Scrapbook item file into its quarantine folder',
        "# - GET|POST /api/<any other path>              : JSON 404 { error : 'no such API route' }",
    ))

# -----------------------------------------------------------------------------
# 2. INITIALIZATION: import the shared library after the scrapbook blueprint
# -----------------------------------------------------------------------------
text = replace_once(text,
    lines(
        'app.register_blueprint(valevision_scrapbook_api)                         # <-- /api/valevision/scrapbook...',
        SEP,
    ),
    lines(
        'app.register_blueprint(valevision_scrapbook_api)                         # <-- /api/valevision/scrapbook...',
        SEP,
        '',
        '',
        '# INITIALIZATION | Import the ValeVision3D Shared Server Library',
        SEP,
        '# Atomic writes, project file backups kept outside the repository, the',
        '# drawings fingerprint and project folder containment, shared with the',
        '# ValeVision3D blueprints beside this file. It registers no routes, and every',
        '# helper reads its constants at call time (a test repoints them).',
        'import Server__ValeVisionShared__Lib__ as vv_shared                      # <-- ValeVision3D Flask persistence core',
        SEP,
    ))

# -----------------------------------------------------------------------------
# 3. HELPERS: the Projects folder from the library; get_project_path contained
# -----------------------------------------------------------------------------
PROJECTS_DIR_LINE_4 = '    projects_dir = vv_shared.PROJECTS_ROOT                               # <-- Whitecardopedia/Projects (the shared library\'s, read at call time)'

text = replace_once(text,      # discover_year_folders
    lines(
        '    base_dir = os.path.dirname(os.path.abspath(__file__))               # <-- Get server directory',
        '    projects_dir = os.path.join(base_dir, PROJECTS_BASE_FOLDER)         # <-- Build projects path',
    ),
    lines(PROJECTS_DIR_LINE_4))

text = replace_once(text,      # get_project_path: the comment block
    lines(
        '# HELPER FUNCTION | Get Absolute Path for Project File',
        SEP,
        'def get_project_path(folder_id):',
    ),
    lines(
        '# HELPER FUNCTION | Get Absolute Path for Project File',
        SEP,
        '# Every path it answers lies inside Projects/, a year folder and a project',
        "# folder down at least: a folder id with a '.' or '..' segment, or one whose",
        '# real path lands anywhere else (outside Projects/, on Projects/ itself or on',
        '# a year folder), raises vv_shared.ProjectPathRefused before a route can read,',
        '# write or delete there. A route taking the id from its path answers that',
        '# with a 400 before it runs (refuse_project_folder_ids_outside_projects).',
        SEP,
        'def get_project_path(folder_id):',
    ))

text = replace_once(text,      # get_project_path: the root and the dot-segment refusal
    lines(
        '    base_dir = os.path.dirname(os.path.abspath(__file__))               # <-- Get server directory',
        W4,
        '    # CHECK IF FOLDER_ID ALREADY INCLUDES YEAR (e.g., "2025/ProjectName")',
    ),
    lines(
        PROJECTS_DIR_LINE_4,
        '    if vv_shared.has_dot_segment(folder_id):',
        "        raise vv_shared.ProjectPathRefused(f'Refused project folder id: {folder_id}')  # <-- '.' and '..' never name a project",
        W4,
        '    # CHECK IF FOLDER_ID ALREADY INCLUDES YEAR (e.g., "2025/ProjectName")',
    ))

text = replace_once(text,      # get_project_path: the year-aware path
    lines(
        "        project_path = os.path.join(base_dir, PROJECTS_BASE_FOLDER, folder_id.replace('/', os.sep))  # <-- Build path with year",
        '        return project_path                                              # <-- Return year-aware path',
    ),
    lines(
        "        project_path = os.path.join(projects_dir, folder_id.replace('/', os.sep))  # <-- Build path with year",
        '        return vv_shared.contain_project_path(project_path, folder_id)   # <-- Return year-aware path (inside Projects/ only)',
    ))

text = replace_once(text,
    lines('        year_path = os.path.join(base_dir, PROJECTS_BASE_FOLDER, year)'),
    lines('        year_path = os.path.join(projects_dir, year)'))

text = replace_once(text,
    lines('            return exact_path'),
    lines('            return vv_shared.contain_project_path(exact_path, folder_id)'))

text = replace_once(text,
    lines('                return os.path.join(year_path, matches[0])'),
    lines('                return vv_shared.contain_project_path(os.path.join(year_path, matches[0]), folder_id)'))

text = replace_once(text,
    lines(
        '    project_path = os.path.join(base_dir, PROJECTS_BASE_FOLDER, latest_year, folder_id)  # <-- Build fallback path',
        '    return project_path                                                  # <-- Return fallback path',
    ),
    lines(
        '    project_path = os.path.join(projects_dir, latest_year, folder_id)    # <-- Build fallback path',
        '    return vv_shared.contain_project_path(project_path, folder_id)       # <-- Return fallback path (inside Projects/ only)',
    ))

text = replace_once(text,      # discover_project_folders
    lines(
        '        base_dir = os.path.dirname(os.path.abspath(__file__))            # <-- Get server directory',
        '        projects_dir = os.path.join(base_dir, PROJECTS_BASE_FOLDER)      # <-- Build projects base path',
    ),
    lines("        projects_dir = vv_shared.PROJECTS_ROOT                           # <-- Whitecardopedia/Projects (the shared library's, read at call time)"))

# -----------------------------------------------------------------------------
# 4. API: the request guard, then /api/health after /api/check-localhost
# -----------------------------------------------------------------------------
text = replace_once(text,
    lines(
        '# REGION | API Endpoints',
        '# -----------------------------------------------------------------------------',
        '',
        '# API ENDPOINT | Check Localhost Status',
    ),
    lines(
        '# REGION | API Endpoints',
        '# -----------------------------------------------------------------------------',
        '',
        '# REQUEST GUARD | Project Folder Ids Stay Inside Projects/',
        SEP,
        '# A route that takes a project folder id from its path (folder_id,',
        "# old_folder_id) is answered with a 400 before it runs when the id has a '.'",
        "# or '..' segment or resolves outside Projects/, so no route can read, write",
        '# or delete outside it whatever its own checks. An id from a request body is',
        '# held to the same rule by get_project_path itself.',
        SEP,
        '@app.before_request',
        'def refuse_project_folder_ids_outside_projects():',
        '    """Answer 400 for a route whose project folder id would leave Projects/"""',
        '    view_args = request.view_args or {}',
        "    for key in ('folder_id', 'old_folder_id'):",
        '        folder_id = view_args.get(key)',
        '        if folder_id is None:',
        '            continue',
        '        try:',
        '            get_project_path(folder_id)                                  # <-- Raises for an id that would leave Projects/',
        '        except vv_shared.ProjectPathRefused:',
        '            return jsonify({',
        "                'error': f'Refused project folder id: {folder_id}'       # <-- Never a path outside Projects/",
        '            }), 400',
        '        except Exception:',
        "            return None                                                  # <-- Anything else is the route's own to answer",
        '    return None',
        SEP,
        '',
        '',
        '# API ENDPOINT | Check Localhost Status',
    ))

text = replace_once(text,
    lines(
        "        'message': 'Server running on localhost'                         # <-- Status message",
        '    })',
        SEP,
    ),
    lines(
        "        'message': 'Server running on localhost'                         # <-- Status message",
        '    })',
        SEP,
        '',
        '',
        '# API ENDPOINT | Local Server Health',
        SEP,
        '# The modules ported from TrueVision3D know their local server by GET',
        "# /api/health and the service name it answers; ValeVision3D's copies compare",
        "# one SERVICE constant with 'whitecardopedia-local-dev'. /api/check-localhost",
        '# above stays for the modules that probe it.',
        SEP,
        "@app.route('/api/health', methods=['GET'])",
        'def health_check():',
        '    """Health check endpoint for the local server"""',
        '    return jsonify({',
        "        'status'  : 'ok',                                                # <-- The server answers",
        "        'service' : vv_shared.LOCAL_SERVICE_NAME,                        # <-- 'whitecardopedia-local-dev'",
        "        'app'     : vv_shared.APP_NAME,                                  # <-- 'ValeVision3D'",
        "        'port'    : SERVER_PORT                                          # <-- 8000",
        '    })',
        SEP,
    ))

# -----------------------------------------------------------------------------
# 5. API: the guarded project save, then the fingerprint and backups routes
# -----------------------------------------------------------------------------
text = replace_once(text,
    lines(
        '# API ENDPOINT | Save Updated Project Data',
        SEP,
        "@app.route('/api/projects/<path:folder_id>', methods=['POST'])",
    ),
    lines(
        '# API ENDPOINT | Save Updated Project Data',
        SEP,
        '# THE DRAWINGS SAVE GUARD. A save carrying X-ValeVision-Drawings-Base (the',
        '# fingerprint of the drawings block its window loaded, or "none" for a',
        '# project that had none) is refused with 409 { error, conflict, drawings }',
        '# when the block on disk is no longer that one - saved since by another',
        '# window, edited by an agent, changed by a git checkout - and the file is',
        '# left exactly as it was. A save without the header is not judged: other',
        '# writers (the Project Editor, the Dev menus) merge other keys and land as',
        '# before. Every save that lands keeps the copy it overwrites first, outside',
        '# the repository, is written atomically in the same format as before, and',
        "# answers the fingerprint now on disk (the window's next base) and the copy.",
        SEP,
        "@app.route('/api/projects/<path:folder_id>', methods=['POST'])",
    ))

text = replace_once(text,
    lines(
        '        # WRITE UPDATED JSON TO FILE',
        "        with open(json_path, 'w', encoding='utf-8') as f:",
        '            json.dump(project_data, f, indent=4, ensure_ascii=False)     # <-- Write formatted JSON',
        W8,
        '        return jsonify({',
        "            'success': True,                                             # <-- Success flag",
        "            'message': f'Project {folder_id} saved successfully'         # <-- Success message",
        '        })',
    ),
    lines(
        '        with vv_shared.PROJECT_FILE_LOCK:                                # <-- The check, the backup and the write stay together',
        '            # DRAWINGS SAVE GUARD | The block on disk must still be the one the window loaded',
        '            base_sent = request.headers.get(vv_shared.DRAWINGS_BASE_HEADER)',
        '            if base_sent is not None:',
        '                on_disk = vv_shared.drawings_fingerprint(vv_shared.read_json_file(json_path))',
        "                if (base_sent.strip() or 'none') != (on_disk['digest'] or 'none'):",
        "                    vv_shared.log(f' [SAVE GUARD] Refused a drawings save for {folder_id}: the block on disk is not the one the window loaded')",
        '                    return jsonify({',
        "                        'error'    : 'The drawings on disk are not the ones this window loaded: they were saved '",
        "                                     'elsewhere since. Reload to pick them up before saving.',",
        "                        'conflict' : True,                               # <-- Nothing was written, and no copy kept",
        "                        'drawings' : on_disk                             # <-- What the block on disk is now",
        '                    }), 409',
        W12,
        '            # WRITE UPDATED JSON TO FILE | The copy going is kept first, whoever is saving',
        '            backup_path = vv_shared.backup_before_overwrite(json_path)',
        "            vv_shared.write_text_atomic(json_path, json.dumps(project_data, indent=4, ensure_ascii=False), newline=None)   # <-- Formatted as before: 4-space JSON, the platform's line ending, no final newline",
        W8,
        '        return jsonify({',
        "            'success'  : True,                                           # <-- Success flag",
        "            'message'  : f'Project {folder_id} saved successfully',      # <-- Success message",
        "            'drawings' : vv_shared.drawings_fingerprint(project_data),   # <-- What is on disk now: the window's next base",
        "            'backup'   : backup_path                                     # <-- The copy kept, or None",
        '        })',
    ))

text = replace_once(text,
    lines(
        SEP,
        '',
        '',
        '# API ENDPOINT | Mirror Gallery Visibility Toggle Locally',
    ),
    lines(
        SEP,
        '',
        '',
        '# API ENDPOINT | What the Drawings Block on Disk Is Now',
        SEP,
        '# { status, folderId, projectFile, drawings : { savedIso, digest } }: the',
        '# fingerprint a ValeVision3D window learns when it loads its project and',
        '# sends back with its save (X-ValeVision-Drawings-Base). Never cached.',
        SEP,
        "@app.route('/api/projects/<path:folder_id>/drawings-fingerprint', methods=['GET'])",
        'def project_drawings_fingerprint(folder_id):',
        '    """What the project\'s drawings block is on disk now: { savedIso, digest }"""',
        '    try:',
        '        project_path = get_project_path(folder_id)                       # <-- Resolve project directory',
        "        json_path = os.path.join(project_path, 'project.json')           # <-- Build JSON file path",
        '',
        '        if not os.path.isfile(json_path):',
        "            return jsonify({'error': f'Project not found: {folder_id}'}), 404",
        '',
        '        response = jsonify({',
        "            'status'      : 'ok',",
        "            'folderId'    : folder_id,",
        "            'projectFile' : json_path,",
        "            'drawings'    : vv_shared.drawings_fingerprint(vv_shared.read_json_file(json_path))",
        '        })',
        "        response.headers['Cache-Control'] = 'no-store'                  # <-- Always the file as it is now",
        '        return response',
        '',
        '    except Exception as e:',
        "        return jsonify({'error': f'Server error: {str(e)}'}), 500",
        SEP,
        '',
        '',
        "# API ENDPOINT | The Copies Kept of a Project's Files",
        SEP,
        '# The backups kept of project.json and its sibling files, newest first, and',
        '# the folder they are kept in (outside the repository).',
        SEP,
        "@app.route('/api/projects/<path:folder_id>/backups', methods=['GET'])",
        'def project_backups(folder_id):',
        '    """The copies kept of the project\'s data file and its sibling files, newest first"""',
        '    try:',
        '        project_path = get_project_path(folder_id)                       # <-- Resolve project directory',
        "        json_path = os.path.join(project_path, 'project.json')           # <-- Build JSON file path",
        '',
        '        if not os.path.isfile(json_path):',
        "            return jsonify({'error': f'Project not found: {folder_id}'}), 404",
        '',
        "        files = {'project.json': vv_shared.list_backups(json_path)}",
        '        for sibling_name in sorted(vv_shared.SIBLING_FILES):',
        '            files[sibling_name] = vv_shared.list_backups(os.path.join(project_path, sibling_name))',
        '',
        '        response = jsonify({',
        "            'status'     : 'ok',",
        "            'folderId'   : folder_id,",
        "            'backupRoot' : vv_shared.backup_dir_for(json_path),",
        "            'keep'       : vv_shared.PROJECT_BACKUP_KEEP,",
        "            'files'      : files",
        '        })',
        "        response.headers['Cache-Control'] = 'no-store'",
        '        return response',
        '',
        '    except Exception as e:',
        "        return jsonify({'error': f'Server error: {str(e)}'}), 500",
        SEP,
        '',
        '',
        '# API ENDPOINT | Mirror Gallery Visibility Toggle Locally',
    ))

# -----------------------------------------------------------------------------
# 6. API: sibling files, with /drawing-notes kept as an alias
# -----------------------------------------------------------------------------
text = replace_once(text,
    lines(
        '# API ENDPOINT | Read or Write Drawing Notes (beside project.json)',
        SEP,
        '# Local sibling of ValeVision__DrawingNotes__.json. Filename is allowlisted',
        '# internally so the client cannot write an arbitrary file into the folder.',
        '# GET 404s with { missing: true } when the file is not there yet.',
        SEP,
        "DRAWING_NOTES_FILE = 'ValeVision__DrawingNotes__.json'",
        '',
        "@app.route('/api/projects/<path:folder_id>/drawing-notes', methods=['GET', 'POST'])",
        'def drawing_notes(folder_id):',
        '    """Read or write ValeVision__DrawingNotes__.json beside project.json"""',
        '    try:',
        '        project_path = get_project_path(folder_id)                           # <-- Resolve project directory',
        '        if not os.path.exists(project_path):',
        "            return jsonify({'error': f'Project folder not found: {folder_id}'}), 404",
        '',
        '        notes_path = os.path.join(project_path, DRAWING_NOTES_FILE)',
        '',
        "        if request.method == 'GET':",
        '            if not os.path.exists(notes_path):',
        "                return jsonify({'missing': True}), 404",
        "            with open(notes_path, 'r', encoding='utf-8') as f:",
        '                return jsonify(json.load(f))',
        '',
        '        data = request.get_json(silent=True)',
        '        if data is None or not isinstance(data, dict):',
        "            return jsonify({'error': 'Drawing notes must be a JSON object'}), 400",
        "        with open(notes_path, 'w', encoding='utf-8', newline='\\n') as f:",
        '            json.dump(data, f, indent=4, ensure_ascii=False)',
        "            f.write('\\n')",
        '        return jsonify({',
        "            'success' : True,",
        "            'message' : f'Drawing notes saved for {folder_id}'",
        '        })',
        '',
        '    except Exception as e:',
        "        return jsonify({'error': f'Server error: {str(e)}'}), 500",
        SEP,
    ),
    lines(
        "# API ENDPOINT | Read or Write a Project's Sibling Files (beside project.json)",
        SEP,
        '# The allowed siblings of project.json are ValeVision__DrawingNotes__.json',
        '# and ValeVision__StatementDocs__.json (vv_shared.SIBLING_FILES); any other',
        '# name is refused, so a client can never write an arbitrary file into the',
        '# folder. GET sends the file AS STORED (never re-serialised) with',
        '# Last-Modified - its modified time - and Cache-Control no-store; a file not',
        '# there yet is a 404 with { missing: true }; a file a hand edit broke is a',
        '# 500 naming the line, never broken JSON. POST keeps the copy it overwrites',
        '# first (outside the repository), then writes 4-space JSON with LF and a',
        '# final newline, atomically. /drawing-notes stays as an alias of the notes.',
        SEP,
        "DRAWING_NOTES_FILE = 'ValeVision__DrawingNotes__.json'",
        '',
        'def read_or_write_project_file(folder_id, file_name, label):',
        '    """GET or POST one allowed sibling file of project.json (label names it in the answers)"""',
        '    try:',
        '        safe_name = vv_shared.sanitize_sibling_filename(file_name)       # <-- Allow-listed names only',
        '        if not safe_name:',
        '            return jsonify({\'error\': f\'Refused project file "{file_name}"\'}), 400',
        '',
        '        project_path = get_project_path(folder_id)                       # <-- Resolve project directory',
        '        if not os.path.exists(project_path):',
        "            return jsonify({'error': f'Project folder not found: {folder_id}'}), 404",
        '',
        '        file_path = os.path.join(project_path, safe_name)',
        '',
        "        if request.method == 'GET':",
        '            if not os.path.isfile(file_path):',
        "                return jsonify({'error': f'{safe_name} is not on disk yet', 'missing': True}), 404",
        '            return vv_shared.send_json_file(file_path)                   # <-- The stored bytes, Last-Modified, no-store',
        '',
        '        data = request.get_json(silent=True)',
        '        if data is None or not isinstance(data, dict):',
        "            return jsonify({'error': f'{label} must be a JSON object'}), 400",
        '        with vv_shared.PROJECT_FILE_LOCK:',
        '            backup_path = vv_shared.backup_before_overwrite(file_path)   # <-- The notes are as precious as the sheets',
        '            vv_shared.write_json_file(file_path, data)                   # <-- 4-space JSON, LF, final newline, atomic',
        '        return jsonify({',
        "            'success'     : True,",
        "            'message'     : f'{label} saved for {folder_id}',",
        "            'projectFile' : file_path,",
        "            'backup'      : backup_path",
        '        })',
        '',
        '    except Exception as e:',
        "        return jsonify({'error': f'Server error: {str(e)}'}), 500",
        '',
        '',
        "@app.route('/api/projects/<path:folder_id>/files/<name>', methods=['GET', 'POST'])",
        'def project_sibling_file(folder_id, name):',
        '    """Read or write an allowed sibling file beside project.json"""',
        '    return read_or_write_project_file(folder_id, name, name)',
        '',
        '',
        "@app.route('/api/projects/<path:folder_id>/drawing-notes', methods=['GET', 'POST'])",
        'def drawing_notes(folder_id):',
        '    """Read or write ValeVision__DrawingNotes__.json beside project.json (alias of files/<name>)"""',
        "    return read_or_write_project_file(folder_id, DRAWING_NOTES_FILE, 'Drawing notes')",
        SEP,
    ))

# -----------------------------------------------------------------------------
# 7. API: unknown /api/ routes answer a JSON 404
# -----------------------------------------------------------------------------
text = replace_once(text,
    lines(
        "            'error': f'Server error discovering projects: {str(e)}'     # <-- Generic error",
        '        }), 500',
        SEP,
        '',
        '# endregion -------------------------------------------------------------------',
    ),
    lines(
        "            'error': f'Server error discovering projects: {str(e)}'     # <-- Generic error",
        '        }), 500',
        SEP,
        '',
        '',
        '# API ENDPOINT | Unknown API Routes Answer a JSON 404',
        SEP,
        '# Without it an unknown GET under /api/ fell through to the static route',
        '# below and answered index.html with a 200, which a client reads as a route',
        '# that exists and then fails to parse; an unknown POST answered an HTML 405.',
        '# Every specific route above and in the blueprints still wins over it; a',
        '# path under /api/projects/<folder> is still taken by the project routes,',
        '# which answer it as a project that is not found.',
        SEP,
        "@app.route('/api/<path:rest>', methods=['GET', 'POST'])",
        'def api_route_not_found(rest):',
        '    """Unknown API routes answer a JSON 404, never the index page"""',
        "    return vv_shared.json_404('no such API route')",
        SEP,
        '',
        '# endregion -------------------------------------------------------------------',
    ))

# -----------------------------------------------------------------------------
# 8. BANNER: where the backups are kept
# -----------------------------------------------------------------------------
text = replace_once(text,
    lines(
        "    print('   --reboot / --Reboot    : Restart the server')",
        '    print()',
    ),
    lines(
        "    print('   --reboot / --Reboot    : Restart the server')",
        '    print()',
        "    vv_shared.log(f' Project file backups: the last {vv_shared.PROJECT_BACKUP_KEEP} copies of each file it overwrites, under')",
        "    vv_shared.log(f'   {vv_shared.PROJECT_BACKUP_ROOT}')",
        '    if vv_shared.backup_root_problem():',
        "        vv_shared.log(f'   WARNING: {vv_shared.backup_root_problem()}')",
        '    else:',
        "        vv_shared.log('   (outside the repository; the VALEVISION_PROJECT_BACKUP_ROOT variable moves it)')",
        '    print()',
    ))

# -----------------------------------------------------------------------------
# WRITE: original bytes and the CRLF candidate, beside this script
# -----------------------------------------------------------------------------
assert '\r' not in text
assert 'PROJECTS_BASE_FOLDER)' not in text, 'a PROJECTS_BASE_FOLDER join is left'
assert 'base_dir' not in text.split('def get_project_path')[1].split('def validate_project_json')[0], 'base_dir left in get_project_path'
candidate = text.replace('\n', '\r\n').encode('utf-8')
with open(os.path.join(HERE, 'original_server.py'), 'wb') as handle:
    handle.write(raw)
with open(os.path.join(HERE, 'candidate_server.py'), 'wb') as handle:
    handle.write(candidate)
print('original bytes', len(raw), 'candidate bytes', len(candidate))
print('candidate CRLF', candidate.count(b'\r\n'), 'LF', candidate.count(b'\n'))
original_non_ascii = {ch for ch in raw.decode('utf-8') if ord(ch) > 127}
print('non-ASCII characters added:', sorted({ch for ch in text if ord(ch) > 127} - original_non_ascii))
