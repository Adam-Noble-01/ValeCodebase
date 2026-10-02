#!/usr/bin/env python3
# =============================================================================
# VALEVISION3D - TEST - STATEMENT WRITER END-TO-END SERVER
# =============================================================================
#
# FILE       : Na__Test__StatementServer__.py
# MODULE     : StatementWriterTestServer
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Serve the app for an in-browser test of the Statement Writer that saves for real and never writes the real statement
# CREATED    : 20-Sep-2026
#
# DESCRIPTION:
# - Serves the repository root, uncached, like a static server - so ValeVision
#   loads a real project with ?project=. The app is at
#   /ValeVision3D/index.html (as server.py serves it) and at
#   /WebApps/ValeVision3D/index.html; /Whitecardopedia/... is served as
#   server.py serves it too.
# - Registers the REAL Statement Writer blueprint
#   (WebApps/Whitecardopedia/Server__ValeVisionStatements__Api__.py), pointed at
#   a TEMPORARY Projects root holding a throwaway copy of the project's
#   statements folder. Every save, rename, move and delete therefore round-trips
#   through the real code, and the statement Adam is actually writing is never
#   touched. Anything under Whitecardopedia/Projects/ is served from the copy
#   first, so the app reads the statements this run is allowed to change.
# - THE COPY IS CHEAP. The markdown files are copied; the photography is HARD
#   LINKED, which is instant and costs no disk. A hard link reads as the real
#   file and MOVING one moves only the link, so even the tidy-up test cannot
#   disturb the originals; the blueprint's writes replace a file rather than
#   write into it, so a write cannot reach an original either. Where a link
#   cannot be made the file is copied instead.
# - Answers /api/health as the local server does (service
#   'whitecardopedia-local-dev'), so the app treats the statements folder as
#   writable, and /api/check-localhost, which ValeVision's own modules still
#   probe.
# - THE CLOUDFLARE WORKER IS NEVER REACHED. /api/editor-config hands the app a
#   FAKE key and a worker address on this server, /api/test/worker, which lists
#   no routes and refuses every write (403) and records it
#   (GET /api/test/blocked). The real key file is never read.
# - --check runs the proofs instead of serving: the routes above, and the
#   blueprint's fences (.., absolute paths, links, depth, bad segments, wrong
#   suffixes), size caps, a picture never written over (__02), a delete refused
#   without confirm and quarantined with it, and a JSON 404 for a missing file,
#   all against a made-up project in a temporary Projects root.
#
# USAGE:
#     python 80__Testing__PrototypeEnvironment/Na__Test__StatementServer__.py [port] [folder-id]
#     python 80__Testing__PrototypeEnvironment/Na__Test__StatementServer__.py --check
#
#   Default port 8841, project 2026/3047__Doous. --check exits 0 when every
#   proof passes, 1 when one does not; it starts no server and uses no port.
#   Writes no byte-code: the repository tracks Whitecardopedia's __pycache__
#   and the bundled dependencies' __pycache__ files.
#
# -----------------------------------------------------------------------------
#
# PORT NOTE:
# - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__StatementServer__.py
# - Source version: 1.0.0 (TrueVision3D v2.95.0, 20-Sep-2026; read at HEAD b2aa9151)
# - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W0-19}}
# - Parity        : adapted - TrueVision's throwaway copy (text copied, pictures hard linked), its sibling-file
#                   stand-in for the statement index, its /api/test/save and its uncached static server; ValeVision's
#                   blueprint, Projects root, probes and worker guard
# - Divergences   :
#   - Imports WebApps/Whitecardopedia/Server__ValeVisionStatements__Api__.py and points the shared library's
#     PROJECTS_ROOT at a temporary Projects/<yyyy>/<folder> copy (TrueVision: the blueprint's PORTAL_ROOT and
#     na-project-portal/<yy>-Projects/<folder>/30__TrueVision__AppContent/10__StatementDocs).
#   - The project is a folder id (default 2026/3047__Doous; TrueVision: project-folder RB05__WestFarm, year 26);
#     project.json, ValeVision__DrawingNotes__.json and ValeVision__StatementDocs__.json are copied beside the
#     statements folder; GET /api/projects/<folder-id> answers the copy's project.json (read only), and
#     files/<name> reads either sibling and writes only the statement index.
#   - /api/health answers service 'whitecardopedia-local-dev' and app 'ValeVision3D' (K1 DR-28 (A); TrueVision:
#     'na-projectvision-local-dev'); /api/check-localhost is answered too.
#   - /api/editor-config answers a fake key and a worker address on this server that refuses every write, so a
#     browser test cannot reach R2 (TrueVision's server cannot stop the app talking to Cloudflare).
#   - Static paths: the repository root, /ValeVision3D/ and /Whitecardopedia/ as server.py serves them; a path
#     with nothing behind it is a JSON 404, and an /api/ path this server does not have is never a file.
#   - --check (new): the proofs the parity plan asks of this server (K3 W0-19, R6 F.8 C36), run through Flask's
#     test client against a made-up project.
# - Back-port     : none.
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 20-Sep-2026 - Version 1.0.0
# - Written with the Statement Writer.
#
# =============================================================================

import base64
import json
import os
import shutil
import sys
import tempfile

sys.dont_write_bytecode = True                                       # <-- Never leave a __pycache__ behind in a tracked folder

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR    = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))                       # <-- WebApps/ValeVision3D
SERVER_DIR = os.path.abspath(os.path.join(APP_DIR, '..', 'Whitecardopedia'))       # <-- Where server.py, the blueprint and its library are
REPO_ROOT  = os.path.abspath(os.path.join(APP_DIR, '..', '..'))                    # <-- ValeCodebase

CHECK      = '--check' in sys.argv
POSITIONAL = [arg for arg in sys.argv[1:] if not arg.startswith('--')]
PORT       = int(POSITIONAL[0]) if len(POSITIONAL) > 0 else 8841
FOLDER_ID  = POSITIONAL[1].strip().strip('/') if len(POSITIONAL) > 1 else '2026/3047__Doous'

BUNDLED    = os.path.join(SERVER_DIR, 'src', 'ThirdParty__VersionLockedDependencies', 'SERVER__FlaskServerDepencies')
if os.path.exists(BUNDLED):
    sys.path.insert(0, BUNDLED)                                       # <-- The same flask server.py itself runs on
sys.path.insert(0, SERVER_DIR)

import Server__ValeVisionShared__Lib__ as vv_shared                  # noqa: E402
import Server__ValeVisionStatements__Api__ as statements_api         # noqa: E402
from flask import Flask, jsonify, request, send_from_directory      # noqa: E402

REAL_PROJECTS  = vv_shared.PROJECTS_ROOT                              # <-- WebApps/Whitecardopedia/Projects: read only, never written
INDEX_NAME     = 'ValeVision__StatementDocs__.json'                   # <-- The statement index beside project.json
SIBLING_NAMES  = ('project.json', 'ValeVision__DrawingNotes__.json', INDEX_NAME)
FAKE_API_KEY   = 'statement-test-server--fake-key--never-a-real-one'
WORKER_PATH    = '/api/test/worker'                                   # <-- The worker address the app is handed: this server, refusing every write


# #region ---------------------------------------------------------------------
# REGION | The Throwaway Projects Root
# -----------------------------------------------------------------------------

def make_throwaway_copy(temp_projects, folder_id):
    """
    Copy one project's statements folder and its project files into a temporary
    Projects root: the writing copied, so a test may rewrite it freely; the
    photography hard linked - instant, and moving a link moves only the link.
    Returns (copied, linked, failed).
    """
    year, _, folder = folder_id.partition('/')
    real_project = vv_shared.resolve_project_dir(folder, year)
    temp_project = os.path.join(temp_projects, year, folder)
    os.makedirs(os.path.join(temp_project, statements_api.STATEMENTS_DIR), exist_ok=True)
    copied = linked = failed = 0
    if not real_project:
        return copied, linked, failed

    for name in SIBLING_NAMES:                                        # <-- The project data has to exist for the temp project to load at all
        source = os.path.join(real_project, name)
        if os.path.isfile(source):
            shutil.copy2(source, os.path.join(temp_project, name))

    real_statements = os.path.join(real_project, statements_api.STATEMENTS_DIR)
    temp_statements = os.path.join(temp_project, statements_api.STATEMENTS_DIR)
    if os.path.isdir(real_statements):
        for current, _directories, files in os.walk(real_statements):
            relative = os.path.relpath(current, real_statements)
            target_dir = temp_statements if relative == '.' else os.path.join(temp_statements, relative)
            os.makedirs(target_dir, exist_ok=True)
            for name in files:
                source = os.path.join(current, name)
                target = os.path.join(target_dir, name)
                if name.lower().endswith(statements_api.TEXT_SUFFIXES):
                    shutil.copy2(source, target)                     # <-- The writing is copied, so a test may rewrite it freely
                    copied += 1
                    continue
                try:
                    os.link(source, target)                          # <-- The photography is linked: instant, and moving a link moves only the link
                    linked += 1
                except OSError:
                    try:
                        shutil.copy2(source, target)
                        copied += 1
                    except OSError:
                        failed += 1
    return copied, linked, failed

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | The Server
# -----------------------------------------------------------------------------

def build_app(temp_projects, scratch_dir, port):
    """The test server's Flask app over the temporary Projects root (vv_shared.PROJECTS_ROOT must already point at it)."""
    app = Flask(__name__, static_folder=None)
    app.register_blueprint(statements_api.valevision_statements_api)
    blocked = []
    app.config['BLOCKED_WORKER_CALLS'] = blocked

    def temp_project_dir(folder_id):
        return vv_shared.resolve_project_dir(folder_id=str(folder_id or '').strip('/'))

    @app.route('/api/health')
    def health():
        return jsonify({'status': 'ok', 'service': vv_shared.LOCAL_SERVICE_NAME, 'app': vv_shared.APP_NAME, 'port': port, 'test': True})

    @app.route('/api/check-localhost')
    def check_localhost():
        return jsonify({'isLocalhost': True, 'message': 'Server running on localhost', 'test': True})

    @app.route('/api/editor-config')
    def editor_config():
        """A fake key and a worker that is this server: the real key file is never read."""
        return jsonify({'workerApiBaseUrl': f'http://127.0.0.1:{port}{WORKER_PATH}', 'apiKey': FAKE_API_KEY, 'test': True})

    @app.route(WORKER_PATH + '/health')
    def worker_health():
        return jsonify({'ok': True, 'worker': 'statement-test-server', 'version': 'test', 'routes': [], 'test': True})

    @app.route(WORKER_PATH + '/<path:rest>', methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
    def worker_blocked(rest):
        """Every call the app makes to its Cloudflare worker lands here: reads find nothing, writes are refused."""
        blocked.append({'method': request.method, 'path': rest, 'apiKey': request.headers.get('X-Editor-Api-Key')})
        print(f'[StatementTestServer] BLOCKED worker {request.method} /{rest}', flush=True)
        if request.method == 'GET':
            return jsonify({'error': 'the statement test server holds no R2 objects', 'missing': True, 'blocked': True}), 404
        return jsonify({'error': 'the statement test server never writes to R2', 'blocked': True}), 403

    @app.route('/api/test/blocked')
    def blocked_calls():
        return jsonify({'status': 'ok', 'calls': list(blocked)})

    @app.route('/api/projects/<path:folder_id>', methods=['GET'])
    def get_project(folder_id):
        """Read only: the copy's project.json. There is no POST: nothing here writes a project."""
        project_dir = temp_project_dir(folder_id)
        json_path = os.path.join(project_dir, 'project.json') if project_dir else None
        if not json_path or not os.path.isfile(json_path):
            return jsonify({'error': f'Project not found: {folder_id}'}), 404
        return vv_shared.send_json_file(json_path)

    @app.route('/api/projects/<path:folder_id>/files/<name>', methods=['GET', 'POST'])
    def project_sibling_file(folder_id, name):
        """
        The statement index is a sibling file beside project.json, written through
        the local server's own route rather than the statement routes. Without a
        stand-in here the index would live only in the browser, and a reload would
        forget every statement in the list. Only the statement index is written:
        nothing else belongs to this test. Either sibling can be read.
        """
        project_dir = temp_project_dir(folder_id)
        safe_name = vv_shared.sanitize_sibling_filename(name)
        if not project_dir:
            return jsonify({'error': f'Project not found: {folder_id}'}), 404
        if not safe_name:
            return jsonify({'error': f'Refused project file name: {name}'}), 400
        target = os.path.join(project_dir, safe_name)
        if request.method == 'GET':
            if not os.path.isfile(target):
                return jsonify({'error': f'{safe_name} not found', 'missing': True}), 404
            return vv_shared.send_json_file(target)
        if safe_name != INDEX_NAME:
            return jsonify({'error': f'This test server only writes the statement index, not "{safe_name}"'}), 400
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({'error': 'Request body must be a JSON object'}), 400
        vv_shared.write_json_file(target, payload)
        return jsonify({'success': True, 'status': 'ok', 'projectFile': target})

    @app.route('/api/test/save', methods=['POST'])
    def test_save():
        """
        Take a file the BROWSER made - a baked PDF, a resized picture - and put it
        somewhere it can be opened and measured. Writes only into this run's own
        scratch folder, which goes when the server does.
        """
        body = request.get_json(silent=True)
        if not isinstance(body, dict):
            return jsonify({'error': 'Request body must be a JSON object'}), 400
        name = os.path.basename(str(body.get('name') or 'output.bin'))
        if not name or name.startswith('.'):
            return jsonify({'error': 'Give the file a name'}), 400
        encoded = body.get('dataBase64')
        if not isinstance(encoded, str) or not encoded:
            return jsonify({'error': '"dataBase64" must be a base64 string'}), 400
        try:
            blob = base64.b64decode(encoded, validate=True)
        except Exception:                                            # noqa: BLE001
            return jsonify({'error': 'not valid base64'}), 400
        os.makedirs(scratch_dir, exist_ok=True)
        target = os.path.join(scratch_dir, name)
        with open(target, 'wb') as file_handle:
            file_handle.write(blob)
        return jsonify({'status': 'ok', 'path': target, 'bytes': len(blob)})

    @app.route('/api/<path:rest>', methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
    def api_not_here(rest):
        return jsonify({'error': 'no such API route on the statement test server'}), 404

    def serve_file(full_path):
        if os.path.isfile(full_path):
            return send_from_directory(os.path.dirname(full_path), os.path.basename(full_path))
        if os.path.isdir(full_path) and os.path.isfile(os.path.join(full_path, 'index.html')):
            return send_from_directory(full_path, 'index.html')
        return None

    @app.route('/', defaults={'filepath': ''})
    @app.route('/<path:filepath>')
    def static_files(filepath):
        """
        The repository, with one substitution: anything under the Projects folder
        is served from the throwaway copy FIRST, so the app reads the statements
        this run is allowed to change. Anything the copy does not hold falls
        through to the real repository, read only. Nothing found is a JSON 404.
        """
        normalized = filepath.replace('\\', '/')
        for prefix, base in (('ValeVision3D/', os.path.join(REPO_ROOT, 'WebApps', 'ValeVision3D')),
                             ('Whitecardopedia/', os.path.join(REPO_ROOT, 'WebApps', 'Whitecardopedia')),
                             ('WebApps/', os.path.join(REPO_ROOT, 'WebApps')),
                             ('', REPO_ROOT)):
            if not normalized.startswith(prefix):
                continue
            inside = normalized[len(prefix):]
            if prefix in ('Whitecardopedia/', 'WebApps/'):
                projects_prefix = 'Projects/' if prefix == 'Whitecardopedia/' else 'Whitecardopedia/Projects/'
                if inside.startswith(projects_prefix):
                    candidate = os.path.join(temp_projects, *inside[len(projects_prefix):].split('/'))
                    if vv_shared.is_inside(candidate, temp_projects):
                        answer = serve_file(candidate)
                        if answer is not None:
                            return answer
            full_path = os.path.join(base, *inside.split('/')) if inside else base
            if not vv_shared.is_inside(full_path, REPO_ROOT):
                break                                                 # <-- Nothing above the repository is served
            answer = serve_file(full_path)
            if answer is not None:
                return answer
            break
        return jsonify({'error': f'Not found: /{normalized}', 'missing': True}), 404

    @app.after_request
    def no_cache(response):
        response.headers['Cache-Control'] = 'no-store, max-age=0'
        return response

    return app

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | The Proofs (--check)
# -----------------------------------------------------------------------------

def run_checks():
    """Every proof the parity plan asks of this server, against a made-up project. Returns the number that failed."""
    from email.utils import parsedate_to_datetime

    failures = []

    def check(label, ok, extra=''):
        line = ('PASS ' if ok else 'FAIL ') + label + ((' :: ' + str(extra)) if (extra and not ok) else '')
        try:
            print(line)
        except UnicodeEncodeError:
            print(line.encode('ascii', 'backslashreplace').decode('ascii'))
        if not ok:
            failures.append(label)

    def every_file(folder):
        found = []
        for current, _, files in os.walk(folder):
            for name in files:
                found.append(os.path.relpath(os.path.join(current, name), folder).replace('\\', '/'))
        return sorted(found)

    def read(path):
        with open(path, 'rb') as handle:
            return handle.read()

    check('the blueprint under test is the real one beside server.py', os.path.normcase(os.path.dirname(os.path.abspath(statements_api.__file__))) == os.path.normcase(SERVER_DIR), statements_api.__file__)

    base     = tempfile.mkdtemp(prefix='vv_statement_check_')
    projects = os.path.join(base, 'Projects')
    outside  = os.path.join(base, 'Outside')                          # <-- Beside the Projects root: a link target nothing may reach
    project  = os.path.join(projects, '2026', '9999__StatementTest')
    os.makedirs(project)
    os.makedirs(outside)
    with open(os.path.join(project, 'project.json'), 'w', encoding='utf-8') as handle:
        handle.write('{ "projectName": "Statement Test", "projectCode": "9999" }\n')
    with open(os.path.join(outside, 'Secret__.md'), 'w', encoding='utf-8') as handle:
        handle.write('outside the statements folder\n')
    outside_before = {path: read(os.path.join(outside, path)) for path in every_file(outside)}
    real_caps = (statements_api.MAX_TEXT_BYTES, statements_api.MAX_IMAGE_BYTES)
    vv_shared.PROJECTS_ROOT = projects
    try:
        app    = build_app(projects, os.path.join(base, '__test_output'), PORT)
        client = app.test_client()
        ROUTE  = '/api/valevision/statements'
        q      = 'project-folder=9999__StatementTest&year=2026'
        root   = os.path.join(project, '10__StatementDocs')
        check('the blueprint reads the temporary Projects root, not the real one', vv_shared.PROJECTS_ROOT == projects and os.path.normcase(projects) != os.path.normcase(REAL_PROJECTS))

        def post(route, payload, query=None):
            return client.post(ROUTE + '/' + route + '?' + (query or q), json=payload)

        def write_text(path, text):
            return post('file', {'path': path, 'text': text})

        def write_picture(path, data):
            return post('image', {'path': path, 'dataBase64': base64.b64encode(data).decode('ascii')})

        # THE LOCAL SERVER THE APP EXPECTS
        # ------------------------------------------------------------
        r = client.get('/api/health')
        check('GET /api/health answers service whitecardopedia-local-dev, as the local server does', r.status_code == 200 and r.get_json()['status'] == 'ok' and r.get_json()['service'] == 'whitecardopedia-local-dev' and r.get_json()['app'] == 'ValeVision3D', r.get_json())
        r = client.get('/api/check-localhost')
        check('GET /api/check-localhost answers isLocalhost true', r.status_code == 200 and r.get_json()['isLocalhost'] is True, r.get_json())
        r = client.get('/api/editor-config')
        config = r.get_json()
        check('GET /api/editor-config answers a FAKE key and a worker address on this server', r.status_code == 200 and config['apiKey'] == FAKE_API_KEY and config['workerApiBaseUrl'] == f'http://127.0.0.1:{PORT}{WORKER_PATH}', config)

        # WORKER WRITES ARE BLOCKED
        # ------------------------------------------------------------
        r = client.get(WORKER_PATH + '/health')
        check('the fake worker lists no routes, so the app calls none of its file routes', r.status_code == 200 and r.get_json()['routes'] == [], r.get_json())
        headers = {'X-Editor-Api-Key': FAKE_API_KEY}
        answers = [
            client.post(WORKER_PATH + '/projects/2026/9999__StatementTest/files/write', json={'path': '10__StatementDocs/x.md', 'data': 'x'}, headers=headers),
            client.post(WORKER_PATH + '/projects/2026/9999__StatementTest/files/upload?path=10__StatementDocs/x.png', data=b'\x89PNG', headers=headers),
            client.post(WORKER_PATH + '/projects/2026/9999__StatementTest', json={'projectCode': '9999'}, headers=headers),
            client.put(WORKER_PATH + '/projects/2026/9999__StatementTest/assets', data=b'x', headers=headers),
        ]
        check('every write to the worker is refused (403, blocked)', [a.status_code for a in answers] == [403] * 4 and all(a.get_json()['blocked'] is True for a in answers), [a.status_code for a in answers])
        r = client.get('/api/test/blocked')
        check('...each one recorded for the browser test to see', r.status_code == 200 and [call['method'] for call in r.get_json()['calls'][-4:]] == ['POST', 'POST', 'POST', 'PUT'], r.get_json())
        check('...and nothing reached the project folder', every_file(project) == ['project.json'], every_file(project))

        # TREE AND FOLDERS
        # ------------------------------------------------------------
        r = client.get(ROUTE + '/tree?' + q)
        check('tree before any statement: exists false, no entries', r.status_code == 200 and r.get_json() == {'status': 'ok', 'root': '10__StatementDocs', 'exists': False, 'entries': []}, r.get_json())
        check('...and no statements folder is made by a read', not os.path.exists(root))
        r = post('folder', {'path': ''})
        check('the folder route makes the statements folder itself (path "")', r.status_code == 200 and os.path.isdir(root), r.get_json())
        r = post('folder', {'path': '01__Design__Statement/02_Images__Content'})
        check('...and a statement folder with its parents', r.status_code == 200 and os.path.isdir(os.path.join(root, '01__Design__Statement', '02_Images__Content')), r.get_json())

        # TEXT WRITES AND THE READ ROUTE
        # ------------------------------------------------------------
        lf_text   = '# Design Statement\n\n#### 1.1 | Site\n\nThe site sits on the corner.\n'
        crlf_text = '# Notes\r\n\r\nWritten on Windows.\r\n'
        statement = '01__Design__Statement/9999_S01__StatementTest__DesignStatement__.md'
        r1 = write_text(statement, lf_text)
        r2 = write_text('01__Design__Statement/Notes__N01__.md', crlf_text)
        check('a statement is written: status ok, its path and its size', r1.status_code == 200 and r1.get_json()['path'] == statement and r1.get_json()['bytes'] == len(lf_text.encode('utf-8')), r1.get_json())
        check('...byte for byte, LF and CRLF files each keeping their own line endings', read(os.path.join(root, *statement.split('/'))) == lf_text.encode('utf-8') and read(os.path.join(root, '01__Design__Statement', 'Notes__N01__.md')) == crlf_text.encode('utf-8') and r2.status_code == 200)
        r = write_text(statement, lf_text + '\nA second paragraph.\n')
        check('a statement is written over by its next save (only pictures are never written over)', r.status_code == 200 and read(os.path.join(root, *statement.split('/'))).endswith(b'A second paragraph.\n'), r.get_json())
        stored = read(os.path.join(root, *statement.split('/')))
        bare = Flask('statement_blueprint_alone')                     # <-- The blueprint's own headers, without this server's no-cache layer
        bare.register_blueprint(statements_api.valevision_statements_api)
        r = bare.test_client().get(ROUTE + '/file?' + q + '&path=' + statement)
        modified = int(os.stat(os.path.join(root, *statement.split('/'))).st_mtime)
        sent = int(parsedate_to_datetime(r.headers.get('Last-Modified')).timestamp()) if r.headers.get('Last-Modified') else None
        check('GET file answers the statement as stored', r.status_code == 200 and r.data == stored and r.content_type.startswith('text/markdown'), (r.status_code, r.content_type))
        check('...with Last-Modified, the file\'s modified time, and Cache-Control no-store', sent == modified and r.headers.get('Cache-Control') == 'no-store', (r.headers.get('Last-Modified'), modified, r.headers.get('Cache-Control')))
        r = client.get(ROUTE + '/file?' + q + '&path=01__Design__Statement/9999_S02__Missing__.md')
        check('GET file of a statement not on disk is a JSON 404 { missing: true }, never a page', r.status_code == 404 and r.is_json and r.get_json().get('missing') is True, (r.status_code, r.data[:120]))
        answers = [client.get(ROUTE + '/file?' + q + '&path=' + path).status_code for path in ('../project.json', '01__Design__Statement', 'Run.exe', '')]
        check('GET file refuses "..", a folder, an unknown suffix and no path (400)', answers == [400, 400, 400, 400], answers)
        entries = client.get(ROUTE + '/tree?' + q).get_json()['entries']
        found = {entry['path']: entry for entry in entries}
        check('tree lists the statement with its folder, name, kind, size and modified time', statement in found and found[statement]['folder'] == '01__Design__Statement' and found[statement]['kind'] == 'text' and found[statement]['bytes'] == len(stored) and found[statement]['modified'].endswith('Z'), entries)

        # PICTURES ARE NEVER WRITTEN OVER
        # ------------------------------------------------------------
        picture  = '01__Design__Statement/02_Images__Content/Site__Photo__.png'
        first    = b'\x89PNG\r\n\x1a\n' + b'first' * 20
        second   = b'\x89PNG\r\n\x1a\n' + b'second' * 20
        third    = b'\x89PNG\r\n\x1a\n' + b'third' * 20
        r1, r2, r3 = write_picture(picture, first), write_picture(picture, second), write_picture(picture, third)
        check('a dropped picture is written', r1.status_code == 200 and r1.get_json() == {'status': 'ok', 'path': picture, 'bytes': len(first), 'renamed': False}, r1.get_json())
        check('the same name again is written beside it as __02, then __03', r2.get_json()['path'] == picture.replace('.png', '__02.png') and r2.get_json()['renamed'] is True and r3.get_json()['path'] == picture.replace('.png', '__03.png'), (r2.get_json(), r3.get_json()))
        check('...and the first picture is untouched', read(os.path.join(root, *picture.split('/'))) == first and read(os.path.join(root, *picture.replace('.png', '__02.png').split('/'))) == second)
        crowd = '01__Design__Statement/02_Images__Content/Crowd.png'
        write_picture(crowd, first)
        for index in range(2, 101):
            with open(os.path.join(root, *crowd.replace('.png', f'__{index:02d}.png').split('/')), 'wb') as handle:
                handle.write(b'taken')
        r = write_picture(crowd, second)
        check('when __02 to __100 are all taken the picture is refused (409), never written over', r.status_code == 409 and read(os.path.join(root, *crowd.replace('.png', '__100.png').split('/'))) == b'taken', r.get_json())

        # THE FENCE
        # ------------------------------------------------------------
        before = every_file(base)
        answers = {path: write_text(path, 'x').status_code for path in
                   ('..', '../Escape.md', '../../Escape.md', '01__Design__Statement/../../Escape.md', '01__Design__Statement/..')}
        check('".." is refused (400) wherever it is', set(answers.values()) == {400}, answers)
        answers = {path: write_text(path, 'x').status_code for path in ('C:/Windows/Escape.md', 'D:\\Escape.md', 'C:Escape.md')}
        check('a drive-absolute path is refused (400)', set(answers.values()) == {400}, answers)
        check('...and nothing was written anywhere', every_file(base) == before, sorted(set(every_file(base)) ^ set(before)))
        r = write_text('/01__Design__Statement/Rooted.md', 'x')
        check('a path with a leading slash is taken inside the statements folder, never at a drive root', r.status_code == 200 and os.path.isfile(os.path.join(root, '01__Design__Statement', 'Rooted.md')), r.get_json())
        made_links = []
        try:
            os.symlink(outside, os.path.join(root, 'DirLink'), target_is_directory=True)
            made_links.append('a folder link')
        except OSError:
            try:
                import _winapi
                _winapi.CreateJunction(outside, os.path.join(root, 'DirLink'))
                made_links.append('a folder junction')
            except Exception:                                        # noqa: BLE001
                pass
        try:
            os.symlink(os.path.join(outside, 'Secret__.md'), os.path.join(root, 'FileLink.md'))
            made_links.append('a file link')
        except OSError:
            pass
        if os.path.lexists(os.path.join(root, 'DirLink')):
            answers = [write_text('DirLink/Escape.md', 'x').status_code, write_picture('DirLink/Escape.png', first).status_code,
                       post('folder', {'path': 'DirLink/Made'}).status_code, client.get(ROUTE + '/file?' + q + '&path=DirLink/Secret__.md').status_code,
                       post('delete', {'path': 'DirLink/Secret__.md', 'confirm': 'DirLink/Secret__.md'}).status_code,
                       post('move', {'from': 'DirLink/Secret__.md', 'to': 'Taken.md'}).status_code]
            check('through ' + made_links[0] + ' pointing outside: write, picture, folder, read, delete and move are all refused (400)', answers == [400] * 6, answers)
        else:
            check('a folder link could be made to prove the fence (skipped: links not permitted here)', True)
        if os.path.lexists(os.path.join(root, 'FileLink.md')):
            answers = [write_text('FileLink.md', 'overwritten').status_code, client.get(ROUTE + '/file?' + q + '&path=FileLink.md').status_code,
                       post('delete', {'path': 'FileLink.md', 'confirm': 'FileLink.md'}).status_code]
            check('a FILE link inside the folder pointing outside is refused too: write, read, delete (400)', answers == [400] * 3, answers)
        else:
            check('a file link could be made to prove the fence (skipped: links not permitted here)', True)
        check('...and the file outside the statements folder is exactly as it was', {path: read(os.path.join(outside, path)) for path in every_file(outside)} == outside_before)
        for name in ('DirLink', 'FileLink.md'):
            link = os.path.join(root, name)
            if not os.path.lexists(link):
                continue
            try:
                os.unlink(link)                                       # <-- The link goes, never what it points at
            except OSError:
                os.rmdir(link)                                        # <-- A folder link or junction Windows will only remove as a folder
        deep8 = '/'.join(['D%d' % n for n in range(1, 8)]) + '/Deep.md'
        deep9 = '/'.join(['D%d' % n for n in range(1, 9)]) + '/TooDeep.md'
        r8, r9 = write_text(deep8, 'eight'), write_text(deep9, 'nine')
        check('depth: eight segments are taken, nine refused (400)', r8.status_code == 200 and r9.status_code == 400 and not os.path.exists(os.path.join(root, *deep9.split('/'))), (r8.status_code, r9.status_code))
        answers = {path: write_text(path, 'x').status_code for path in
                   ('a:b.md', 'a*b.md', 'a?b.md', 'a|b.md', '<x>.md', 'a"b.md', 'caf\u00e9.md', '.../x.md', 'x/. ./y.md', 'x/ ./y.md', 'x/.../y.md', '%2E%2E/x.md', 'x' * 141 + '.md')}
        check('a bad segment - a reserved character, a letter outside the pattern, only dots and spaces, over 140 characters - is refused (400)', set(answers.values()) == {400}, answers)
        answers = [write_text('01__Design__Statement/Plan.png', 'x').status_code, write_text('01__Design__Statement/Run.exe', 'x').status_code,
                   write_text('01__Design__Statement/NoSuffix', 'x').status_code, write_picture('01__Design__Statement/Photo.md', first).status_code,
                   write_picture('01__Design__Statement/Run.exe', first).status_code]
        check('a wrong suffix is refused: a picture or an .exe through the text route, a .md or an .exe through the picture route (400)', answers == [400] * 5, answers)
        check('...and none of the refusals wrote a file', not any(path.endswith(('Escape.md', 'Plan.png', 'Run.exe', 'NoSuffix', 'Photo.md', 'TooDeep.md')) for path in every_file(base)), every_file(root))

        # SIZE CAPS AND BODIES
        # ------------------------------------------------------------
        statements_api.MAX_TEXT_BYTES, statements_api.MAX_IMAGE_BYTES = 10, 10
        r1 = write_text('01__Design__Statement/Big.md', 'x' * 11)
        r2 = write_picture('01__Design__Statement/Big.png', b'\x89PNG\r\n\x1a\n' + b'xxx')
        r3 = write_text('01__Design__Statement/Small.md', 'x' * 10)
        statements_api.MAX_TEXT_BYTES, statements_api.MAX_IMAGE_BYTES = real_caps
        check('a text or a picture over its size cap is refused (400); one at the cap is taken (caps read at call time)', r1.status_code == 400 and r2.status_code == 400 and r3.status_code == 200 and not os.path.exists(os.path.join(root, '01__Design__Statement', 'Big.md')), (r1.status_code, r2.status_code, r3.status_code))
        check('the size caps are TrueVision\'s: 8 MB of text, 64 MB a picture', real_caps == (8 * 1024 * 1024, 64 * 1024 * 1024), real_caps)
        answers = [client.post(ROUTE + '/' + route + '?' + q, data='not json', content_type='text/plain').status_code for route in ('file', 'image', 'folder', 'move', 'delete')]
        answers += [post('file', {'path': 'x.md', 'text': 5}).status_code, post('image', {'path': 'x.png', 'dataBase64': 'not base64!'}).status_code, post('image', {'path': 'x.png'}).status_code]
        check('a body that is not a JSON object, text that is not a string and bad base64 are refused (400)', answers == [400] * 8, answers)

        # MOVE
        # ------------------------------------------------------------
        write_text('02__Pre__App/9999_S02__StatementTest__PreApp__.md', 'pre-app\n')
        r = post('move', {'from': '02__Pre__App', 'to': '02__PreApplication__Statement'})
        check('a statement folder is renamed', r.status_code == 200 and r.get_json() == {'status': 'ok', 'from': '02__Pre__App', 'to': '02__PreApplication__Statement'} and os.path.isfile(os.path.join(root, '02__PreApplication__Statement', '9999_S02__StatementTest__PreApp__.md')), r.get_json())
        answers = [post('move', {'from': '02__PreApplication__Statement', 'to': '01__Design__Statement'}).status_code,
                   post('move', {'from': '03__Not__There', 'to': '03__Elsewhere'}).status_code,
                   post('move', {'from': '../project.json', 'to': 'x.json'}).status_code,
                   post('move', {'from': '', 'to': '05__Root'}).status_code,
                   post('move', {'from': '01__Design__Statement', 'to': ''}).status_code]
        check('move refuses an occupied destination (409), a missing source (404), ".." and the root (400)', answers == [409, 404, 400, 400, 400], answers)

        # DELETE: CONFIRMED, AND QUARANTINED, NEVER UNLINKED
        # ------------------------------------------------------------
        target = os.path.join(root, *statement.split('/'))
        answers = [post('delete', {'path': statement}).status_code, post('delete', {'path': statement, 'confirm': statement.upper()}).status_code,
                   post('delete', {'path': '', 'confirm': ''}).status_code, post('delete', {'path': '..', 'confirm': '..'}).status_code]
        check('delete is refused without "confirm" repeating "path" exactly, and for the root and ".." (400)', answers == [400] * 4, answers)
        check('...and the statement is still there', os.path.isfile(target) and read(target) == stored)
        r = post('delete', {'path': statement, 'confirm': statement})
        answer = r.get_json()
        check('a confirmed delete answers deleted and where it was quarantined', r.status_code == 200 and answer['deleted'] == statement and answer['quarantined'].startswith('00__Deleted__Quarantine/') and answer['quarantined'].endswith('/' + statement), answer)
        kept = os.path.join(root, *answer['quarantined'].split('/')) if isinstance(answer.get('quarantined'), str) else ''
        check('...the file has left its place and sits in the quarantine, byte for byte - never unlinked', not os.path.exists(target) and os.path.isfile(kept) and read(kept) == stored, every_file(root))
        r = post('delete', {'path': '02__PreApplication__Statement', 'confirm': '02__PreApplication__Statement'})
        folder_answer = r.get_json()
        check('a whole statement folder is quarantined whole', r.status_code == 200 and not os.path.exists(os.path.join(root, '02__PreApplication__Statement')) and os.path.isfile(os.path.join(root, *folder_answer['quarantined'].split('/'), '9999_S02__StatementTest__PreApp__.md')), folder_answer)
        r = post('delete', {'path': statement, 'confirm': statement})
        check('deleting what has already gone is a JSON 404', r.status_code == 404 and r.is_json, r.get_json())
        quarantined = answer['quarantined']
        answers = [post('delete', {'path': quarantined, 'confirm': quarantined}).status_code, post('delete', {'path': '00__Deleted__Quarantine', 'confirm': '00__Deleted__Quarantine'}).status_code,
                   write_text('00__Deleted__Quarantine/Planted.md', 'x').status_code, write_picture('00__Deleted__Quarantine/Planted.png', first).status_code,
                   post('folder', {'path': '00__Deleted__Quarantine/Made'}).status_code, post('move', {'from': quarantined, 'to': 'Restored.md'}).status_code,
                   post('move', {'from': '01__Design__Statement/Rooted.md', 'to': '00__Deleted__Quarantine/Rooted.md'}).status_code]
        check('nothing inside the quarantine is deleted, written, made or moved through a route (400)', answers == [400] * 7, answers)
        quarantine = os.path.join(root, '00__Deleted__Quarantine')
        loose = [name for name in os.listdir(quarantine) if os.path.isfile(os.path.join(quarantine, name))] if os.path.isdir(quarantine) else []
        check('...and no file sits at the quarantine\'s own root, so a deleted statement is never offered back for adoption', os.path.isdir(quarantine) and loose == [], loose)

        # PROJECTS
        # ------------------------------------------------------------
        before = every_file(base)
        statuses = [client.get(ROUTE + '/tree?project-folder=9999__StatementTest&year=26').status_code,
                    client.get(ROUTE + '/tree?project-folder=0000__NoSuchProject&year=2026').status_code,
                    client.get(ROUTE + '/tree?project-folder=..&year=2026').status_code,
                    client.get(ROUTE + '/tree?folder-id=2026/..').status_code,
                    post('folder', {'path': '01__X'}, query='folder-id=2026/../2026/9999__StatementTest').status_code,
                    client.get(ROUTE + '/file?path=x.md').status_code]
        check('a 2-digit year, a project that is not there, a ".." folder and no project are refused (404)', statuses == [404] * 6, statuses)
        check('...and make no folder', every_file(base) == before and not os.path.exists(os.path.join(projects, '2026', '0000__NoSuchProject')))
        r = client.get(ROUTE + '/tree?folder-id=2026/9999__StatementTest')
        check('folder-id=YYYY/Folder names the project too', r.status_code == 200 and r.get_json()['exists'] is True, r.get_json())
        spaced = os.path.join(projects, '2025', 'FN-0001__Space Test 01')
        os.makedirs(spaced)
        r = post('file', {'path': '01__Statement/FN-0001_S01__Spaced__.md', 'text': 'spaced\n'}, query='folder-id=2025/FN-0001__Space%20Test%2001')
        check('a project folder name with a space takes a statement', r.status_code == 200 and os.path.isfile(os.path.join(spaced, '10__StatementDocs', '01__Statement', 'FN-0001_S01__Spaced__.md')), r.get_json())

        # WHAT IS LEFT, AND THE REST OF THE TEST SERVER
        # ------------------------------------------------------------
        check('nothing was written outside the temporary Projects root', sorted(os.listdir(base)) == ['Outside', 'Projects'] and {path: read(os.path.join(outside, path)) for path in every_file(outside)} == outside_before, os.listdir(base))
        outside_statements = [path for path in every_file(project) if path != 'project.json' and not path.startswith('10__StatementDocs/')]
        check('in the project, only the statements folder was written', outside_statements == [], outside_statements)
        check('no temporary file is left in the statements folder', [path for path in every_file(root) if path.endswith(('.tmp', '.writing', '.copying'))] == [], every_file(root))
        r = client.get('/Whitecardopedia/Projects/2026/9999__StatementTest/10__StatementDocs/01__Design__Statement/Notes__N01__.md')
        check('a statement file is served from the throwaway copy at /Whitecardopedia/Projects/...', r.status_code == 200 and r.data == crlf_text.encode('utf-8'), r.status_code)
        r = client.get('/WebApps/Whitecardopedia/Projects/2026/9999__StatementTest/10__StatementDocs/01__Design__Statement/Missing.md')
        check('...and a file that is not there is a JSON 404, never the index page', r.status_code == 404 and r.is_json, r.status_code)
        r = client.get('/api/nothing-here')
        check('an /api/ path this server does not have is a JSON 404, never a file', r.status_code == 404 and r.is_json, r.status_code)
        r = client.get('/api/projects/2026/9999__StatementTest')
        check('GET /api/projects/<folder-id> answers the copy\'s project.json', r.status_code == 200 and r.get_json()['projectName'] == 'Statement Test', r.status_code)
        index = {'StatementDocs__Documents': [{'Doc__Folder': '01__Design__Statement'}]}
        r1 = client.post('/api/projects/2026/9999__StatementTest/files/' + INDEX_NAME, json=index)
        r2 = client.post('/api/projects/2026/9999__StatementTest/files/ValeVision__DrawingNotes__.json', json={'notes': []})
        r3 = client.get('/api/projects/2026/9999__StatementTest/files/' + INDEX_NAME)
        check('the statement index is written beside project.json (4-space JSON, LF, final newline) and read back', r1.status_code == 200 and read(os.path.join(project, INDEX_NAME)) == (json.dumps(index, indent=4, ensure_ascii=False) + '\n').encode('utf-8') and r3.status_code == 200 and r3.get_json() == index, (r1.status_code, r3.status_code))
        check('...and no other project file is written by this server (400)', r2.status_code == 400 and not os.path.exists(os.path.join(project, 'ValeVision__DrawingNotes__.json')), r2.status_code)
    finally:
        statements_api.MAX_TEXT_BYTES, statements_api.MAX_IMAGE_BYTES = real_caps
        vv_shared.PROJECTS_ROOT = REAL_PROJECTS
        shutil.rmtree(base, ignore_errors=True)
    check('the Projects root is pointed back at Whitecardopedia/Projects', vv_shared.PROJECTS_ROOT == REAL_PROJECTS)

    print('FAILURES:', len(failures))
    return len(failures)

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Start
# -----------------------------------------------------------------------------

if __name__ == '__main__':
    if CHECK:
        sys.exit(1 if run_checks() else 0)

    TEMP_ROOT     = tempfile.mkdtemp(prefix='vv_statements_live_')
    TEMP_PROJECTS = os.path.join(TEMP_ROOT, 'Projects')
    SCRATCH_DIR   = os.path.join(TEMP_ROOT, '__test_output')         # <-- Where a file the browser made is put down for inspection
    copied, linked, failed = make_throwaway_copy(TEMP_PROJECTS, FOLDER_ID)
    vv_shared.PROJECTS_ROOT = TEMP_PROJECTS                           # <-- THE BLUEPRINT IS POINTED AT THE COPY. Its routes read this at call time
    app = build_app(TEMP_PROJECTS, SCRATCH_DIR, PORT)

    print(f'[StatementTestServer] project {FOLDER_ID}; statements folder for this run: '
          f'{os.path.join(TEMP_PROJECTS, *FOLDER_ID.split("/"), statements_api.STATEMENTS_DIR)}', flush=True)
    print(f'[StatementTestServer] files the browser hands back go to: {SCRATCH_DIR}', flush=True)
    print(f'[StatementTestServer] {copied} file(s) copied, {linked} linked, {failed} could not be brought over', flush=True)
    print(f'[StatementTestServer] open http://127.0.0.1:{PORT}/ValeVision3D/index.html?project={FOLDER_ID}', flush=True)
    try:
        app.run(host='127.0.0.1', port=PORT, debug=False, threaded=True)
    finally:
        vv_shared.PROJECTS_ROOT = REAL_PROJECTS
        shutil.rmtree(TEMP_ROOT, ignore_errors=True)

# endregion -------------------------------------------------------------------
