#!/usr/bin/env python3
# =============================================================================
# VALEVISION3D - TEST - DRAWING NOTES ROUTE
# =============================================================================
#
# FILE       : Na__Test__DrawingNotesRoute__.test.py
# MODULE     : DrawingNotesRouteTest
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Prove the local server reads the drawing notes as stored with the time they last changed,
#              writes them atomically in the house format, keeps the copy it overwrites, and refuses
#              every other file name and every folder id outside the Projects folder
# CREATED    : 01-Oct-2026
#
# DESCRIPTION:
# - Drives WebApps/Whitecardopedia/server.py, with its shared library
#   Server__ValeVisionShared__Lib__.py, through Flask's test client against a
#   temporary Projects folder and a temporary backup root. No server is
#   started, no port is used, and no real project or backup is written.
# - THE READ. GET /api/projects/<folder>/files/ValeVision__DrawingNotes__.json
#   and its alias /drawing-notes send the file's bytes as stored - the keys in
#   the order they were written, never re-sorted - with Last-Modified, the
#   file's modified time (what the specification lockstep compares), and
#   Cache-Control no-store. A file not on disk yet is 404 { missing: true },
#   which the notes client reads as "no file yet"; a file a hand edit broke is
#   a 500 that names the line, never broken JSON.
# - THE WRITE. POST writes 4-space JSON, LF line endings and a final newline -
#   byte for byte what the route always wrote - through a temporary file moved
#   over the old one. Where Windows refuses the move the file is written in
#   place; a write that fails before the move leaves the old file whole; no
#   temporary file is ever left. The copy overwritten is kept first, outside
#   the Projects folder.
# - THE FENCE. files/<name> serves two names only, the drawing notes and the
#   statement index; any other name, and any folder id that would leave the
#   Projects folder, is refused with 400 and nothing is read or written.
#
# USAGE:
#     python 80__Testing__PrototypeEnvironment/Na__Test__DrawingNotesRoute__.test.py
#
#   Exit 0 = every check passed. Exit 1 = at least one did not. Needs flask:
#   the copy bundled with Whitecardopedia's server is used when there is one.
#   Writes no byte-code: the repository tracks Whitecardopedia's __pycache__
#   and the bundled dependencies' __pycache__ files.
#
# -----------------------------------------------------------------------------
#
# PORT NOTE:
# - Authored in   : ValeVision3D first (v2.71.1); no TrueVision twin - TrueVision's sibling-file route
#                   (ProjectVision__LocalServer__Main__.py /files/<name>) has no test of its own, and its save-guard
#                   test covers only the backup
# - Parity        : ValeVision-only (written with the Flask persistence core, W0-09; the notes route hardening of
#                   the parity plan's WP-S06b-02)
# - Back-port     : TrueVision's /files/<name> route would earn the same checks (stored bytes, Last-Modified,
#                   the fence).
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 01-Oct-2026 - Version 1.0.0 (v2.71.1)
# - Written with the Flask persistence core: the read as stored with Last-Modified and no-store, the atomic
#   house-format write and its backup, the allow-list and the folder fence.
#
# =============================================================================

import sys
sys.dont_write_bytecode = True                                        # <-- Whitecardopedia's __pycache__ is tracked; a test must not touch it
import os, json, tempfile, shutil

from email.utils import parsedate_to_datetime
from datetime import datetime, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..', 'Whitecardopedia'))   # <-- The folder server.py and its library are in
BUNDLED    = os.path.join(SERVER_DIR, 'src', 'ThirdParty__VersionLockedDependencies', 'SERVER__FlaskServerDepencies')
if os.path.exists(BUNDLED):
    sys.path.insert(0, BUNDLED)                                       # <-- The same flask server.py itself runs on
sys.path.insert(0, SERVER_DIR)

import server as srv                                                  # noqa: E402
import Server__ValeVisionShared__Lib__ as lib                         # noqa: E402

NOTES      = 'ValeVision__DrawingNotes__.json'
STATEMENTS = 'ValeVision__StatementDocs__.json'

failed = 0


def check(name, passed, detail=''):
    global failed
    if not passed:
        failed += 1
    line = ('  PASS  ' if passed else '  FAIL  ') + name + (('   ' + str(detail)) if (detail and not passed) else '')
    try:
        print(line)
    except UnicodeEncodeError:
        print(line.encode('ascii', 'backslashreplace').decode('ascii'))


def read_bytes(path):
    with open(path, 'rb') as handle:
        return handle.read()


def write_bytes(path, data):
    with open(path, 'wb') as handle:
        handle.write(data)


def temp_files(folder):
    return [ name for name in os.listdir(folder) if name.endswith('.tmp') ]


def house_bytes(document):
    """What the route has always written: 4-space JSON, non-ASCII as it is, LF, a final newline."""
    return (json.dumps(document, indent=4, ensure_ascii=False) + '\n').encode('utf-8')


print('\nValeVision3D - drawing notes route\n')

real_projects = lib.PROJECTS_ROOT
real_backups  = lib.PROJECT_BACKUP_ROOT
real_delays   = lib.REPLACE_RETRY_DELAYS_S
tmp_base      = tempfile.mkdtemp(prefix='na_notes_route_')
backups       = tempfile.mkdtemp(prefix='na_notes_route_bak_')
try:
    projects = os.path.join(tmp_base, 'Projects')
    project  = os.path.join(projects, '2026', '3047__NotesTest')
    spaced   = os.path.join(projects, '2025', 'FN-62104__Fenner Scheme-01')
    outside  = os.path.join(tmp_base, 'outside')
    for folder in (project, spaced, outside):
        os.makedirs(folder)
    for folder in (project, spaced):
        write_bytes(os.path.join(folder, 'project.json'), b'{\n    "projectName": "Notes Test",\n    "projectCode": "3047"\n}\n')
    outside_notes = os.path.join(outside, NOTES)
    write_bytes(outside_notes, b'{"outside": true}\n')
    lib.PROJECTS_ROOT       = projects
    lib.PROJECT_BACKUP_ROOT = backups
    client     = srv.app.test_client()
    BASE       = '/api/projects/2026/3047__NotesTest'
    FILES      = BASE + '/files/' + NOTES
    ALIAS      = BASE + '/drawing-notes'
    notes_path = os.path.join(project, NOTES)

    # THE READ
    # ------------------------------------------------------------
    stored = b'{\n    "ProjectSpecification__Version": 3,\n    "Zeta": "kept first",\n    "Alpha": [\n        "and not re-sorted"\n    ]\n}\n'
    write_bytes(notes_path, stored)
    stamp = 1790000000                                                # <-- A whole second, so the HTTP date is exact
    os.utime(notes_path, (stamp, stamp))
    answer = client.get(FILES)
    check('a notes file is sent as stored: the bytes on disk, keys in the order written', answer.status_code == 200 and answer.data == stored, (answer.status_code, answer.data[:80]))
    modified = answer.headers.get('Last-Modified')
    check('...with Last-Modified, the file\'s modified time', bool(modified) and parsedate_to_datetime(modified) == datetime.fromtimestamp(stamp, timezone.utc), modified)
    check('...and Cache-Control no-store', answer.headers.get('Cache-Control') == 'no-store', answer.headers.get('Cache-Control'))
    check('...as JSON', answer.mimetype == 'application/json', answer.mimetype)
    alias = client.get(ALIAS)
    check('the /drawing-notes alias answers the same bytes and headers', alias.status_code == 200 and alias.data == stored and alias.headers.get('Last-Modified') == modified and alias.headers.get('Cache-Control') == 'no-store')
    write_bytes(os.path.join(spaced, NOTES), b'{"spaced": true}\n')
    answer = client.get('/api/projects/2025/FN-62104__Fenner%20Scheme-01/drawing-notes')
    check('a project folder with a space in its name is read too', answer.status_code == 200 and answer.get_json() == {'spaced': True}, (answer.status_code, answer.data[:80]))

    os.remove(notes_path)
    for route in (FILES, ALIAS):
        answer = client.get(route)
        check('a notes file not on disk yet is 404 { missing: true } (' + route.rsplit('/', 1)[-1] + ')', answer.status_code == 404 and (answer.get_json() or {}).get('missing') is True, (answer.status_code, answer.get_json()))
    answer = client.get('/api/projects/2026/0000__NoSuchProject/drawing-notes')
    check('a project folder that does not exist is a 404, and nothing is made', answer.status_code == 404 and not os.path.exists(os.path.join(projects, '2026', '0000__NoSuchProject')), answer.status_code)

    write_bytes(notes_path, b'{ "ProjectSpecification__Notes": [')
    answer = client.get(FILES)
    body = answer.get_json() or {}
    check('a notes file a hand edit broke answers 500 unreadable, naming the line, never broken JSON', answer.status_code == 500 and body.get('unreadable') is True and 'line 1, column' in body.get('error', ''), (answer.status_code, body))
    write_bytes(notes_path, b'\xef\xbb\xbf{"bom": true}\n')
    answer = client.get(ALIAS)
    check('a notes file saved with a byte order mark is read', answer.status_code == 200 and json.loads(answer.data.decode('utf-8-sig')) == {'bom': True}, (answer.status_code, answer.data[:40]))

    # THE WRITE
    # ------------------------------------------------------------
    write_bytes(notes_path, stored)
    document = {
        'ProjectSpecification__Version' : 4,
        'Zeta'                          : 'Façade in Cotswold stone',
        'Alpha'                         : [ { 'id' : 'EW01', 'text' : 'Line one' }, [] ],
        'Empty'                         : {}
    }
    answer = client.post(ALIAS, data=json.dumps(document), content_type='application/json')    # <-- Sent in its own key order
    body = answer.get_json() or {}
    check('a POST to /drawing-notes answers success and its message, as before', answer.status_code == 200 and body.get('success') is True and body.get('message') == 'Drawing notes saved for 2026/3047__NotesTest', body)
    written = read_bytes(notes_path)
    check('...and writes 4-space JSON, LF, a final newline: the bytes the route always wrote', written == house_bytes(document), written[:120])
    check('...with no CR anywhere and non-ASCII written as it is', b'\r' not in written and 'Façade'.encode('utf-8') in written)
    check('...and no temporary file is left beside it', temp_files(project) == [], os.listdir(project))
    backup = body.get('backup')
    check('...after keeping the copy it overwrote, byte for byte', isinstance(backup, str) and os.path.isfile(backup) and read_bytes(backup) == stored, backup)
    check('...outside the Projects folder, under the backup root', isinstance(backup, str) and lib.is_inside(backup, backups) and not lib.is_inside(backup, projects), backup)

    second = dict(document, ProjectSpecification__Version=5)
    answer = client.post(FILES, data=json.dumps(second), content_type='application/json')
    check('files/' + NOTES + ' writes the same file in the same format', answer.status_code == 200 and read_bytes(notes_path) == house_bytes(second), (answer.status_code, answer.get_json()))

    before = read_bytes(notes_path)
    kept_before = len(lib.list_backups(notes_path))
    for label, kwargs in (
        ('a list body is refused with 400',  { 'data' : json.dumps([1, 2]), 'content_type' : 'application/json' }),
        ('a text body is refused with 400',  { 'data' : 'notes', 'content_type' : 'text/plain' }),
        ('a broken JSON body is refused with 400', { 'data' : '{ "x": ', 'content_type' : 'application/json' }),
    ):
        answer = client.post(ALIAS, **kwargs)
        check(label, answer.status_code == 400 and 'must be a JSON object' in (answer.get_json() or {}).get('error', ''), (answer.status_code, answer.get_json()))
    check('...and the notes are untouched, with no copy kept for a write that did not happen', read_bytes(notes_path) == before and len(lib.list_backups(notes_path)) == kept_before)

    real_replace = os.replace
    def refusing_replace(source, target):
        raise PermissionError('held open by another program')
    lib.REPLACE_RETRY_DELAYS_S = (0.01,)
    os.replace = refusing_replace
    try:
        third = dict(document, ProjectSpecification__Version=6)
        answer = client.post(ALIAS, data=json.dumps(third), content_type='application/json')
    finally:
        os.replace = real_replace
        lib.REPLACE_RETRY_DELAYS_S = real_delays
    check('where Windows refuses the move the notes are still written, in place', answer.status_code == 200 and read_bytes(notes_path) == house_bytes(third), (answer.status_code, answer.get_json()))
    check('...and the temporary file is cleaned up', temp_files(project) == [], os.listdir(project))

    before = read_bytes(notes_path)
    real_fsync = os.fsync
    def failing_fsync(descriptor):
        raise OSError(28, 'No space left on device')
    os.fsync = failing_fsync
    try:
        answer = client.post(ALIAS, data=json.dumps(dict(document, ProjectSpecification__Version=7)), content_type='application/json')
    finally:
        os.fsync = real_fsync
    check('a write that fails before the move answers 500 and leaves the old notes whole', answer.status_code == 500 and read_bytes(notes_path) == before, (answer.status_code, answer.get_json()))
    check('...and leaves no temporary file', temp_files(project) == [], os.listdir(project))

    statements = { 'StatementDocs__Index' : [] }
    answer = client.post(BASE + '/files/' + STATEMENTS, data=json.dumps(statements), content_type='application/json')
    check('the statement index is the other name files/<name> serves', answer.status_code == 200 and read_bytes(os.path.join(project, STATEMENTS)) == house_bytes(statements) and client.get(BASE + '/files/' + STATEMENTS).status_code == 200, (answer.status_code, answer.get_json()))

    # THE FENCE
    # ------------------------------------------------------------
    listing_before = sorted(os.listdir(project))
    for name in ('project.json', 'ValeVision__Other__.json', 'Na__DrawingNotes__.json', 'valevision__drawingnotes__.json', NOTES + '.bak', '..', '..%2Fproject.json'):
        get_status  = client.get(BASE + '/files/' + name).status_code
        post_status = client.post(BASE + '/files/' + name, json={'x': 1}).status_code
        check('files/<name> refuses ' + name + ' (GET and POST answer 400)', get_status == 400 and post_status == 400, (get_status, post_status))
    check('...and nothing was written into the project folder', sorted(os.listdir(project)) == listing_before, sorted(os.listdir(project)))

    outside_before = read_bytes(outside_notes)
    for url in (
        '/api/projects/2026/../../outside/files/' + NOTES,
        '/api/projects/2026/%2E%2E/%2E%2E/outside/files/' + NOTES,
        '/api/projects/2026/../../outside/drawing-notes',
        '/api/projects/%2E%2E/drawing-notes',
        '/api/projects/2026/./3047__NotesTest/files/' + NOTES,
    ):
        get_answer  = client.get(url)
        post_answer = client.post(url, json={'escaped': True})
        check('files/<name> and /drawing-notes refuse the folder id in ' + url + ' (400)', get_answer.status_code == 400 and post_answer.status_code == 400 and 'Refused project folder id' in (get_answer.get_json() or {}).get('error', ''), (get_answer.status_code, post_answer.status_code, get_answer.get_json()))
    check('...and the file outside the Projects folder was neither read nor written', read_bytes(outside_notes) == outside_before and sorted(os.listdir(outside)) == [NOTES])

    check('the real Projects folder and backup root were never the target', lib.PROJECTS_ROOT == projects and lib.PROJECT_BACKUP_ROOT == backups and os.path.normcase(real_projects) != os.path.normcase(projects))

finally:
    lib.PROJECTS_ROOT          = real_projects
    lib.PROJECT_BACKUP_ROOT    = real_backups
    lib.REPLACE_RETRY_DELAYS_S = real_delays
    shutil.rmtree(tmp_base, ignore_errors=True)
    shutil.rmtree(backups, ignore_errors=True)

print('\n  ' + (('FAIL - %d check(s) did not pass.' % failed) if failed else 'PASS - the drawing notes route reads, writes, keeps and refuses as it should.') + '\n')
sys.exit(1 if failed else 0)
