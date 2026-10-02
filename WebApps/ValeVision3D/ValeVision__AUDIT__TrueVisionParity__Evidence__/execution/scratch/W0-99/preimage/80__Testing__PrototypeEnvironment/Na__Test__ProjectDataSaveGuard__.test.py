#!/usr/bin/env python3
# =============================================================================
# VALEVISION3D - TEST - PROJECT DATA SAVE GUARD AND BACKUPS
# =============================================================================
#
# FILE       : Na__Test__ProjectDataSaveGuard__.test.py
# MODULE     : ProjectDataSaveGuardTest
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Prove the local server keeps a copy of every project file it
#              overwrites, and refuses a drawings save built on a block that is
#              no longer the one on disk
# CREATED    : 22-Sep-2026
#
# DESCRIPTION:
# - Drives WebApps/Whitecardopedia/server.py, with its shared library
#   Server__ValeVisionShared__Lib__.py, through Flask's test client. No server
#   is started and no port is used.
# - NO REAL PROJECT IS WRITTEN AND NO REAL BACKUP IS MADE. The server reads its
#   Projects folder and its backup root from the library's constants at call
#   time; the test points both at temporary folders holding one made-up
#   project, and checks before it ends that they stayed pointed there.
# - THE FINGERPRINT: the same drawings block fingerprints the same however the
#   file is formatted; a file with no block answers none.
# - THE GUARD: a save carrying the fingerprint it loaded lands; the same save
#   sent again after the file changed - by another save, or by a hand on the
#   file itself - is refused with 409 and the file is left alone; a save
#   carrying no fingerprint is never judged; "none" matches only a file with
#   no block.
# - THE BACKUPS: the copy overwritten is kept byte for byte, outside the
#   Projects folder, in a folder mirroring the file's path; only the newest
#   KEEP stay; the drawing notes are kept too; the listing is newest first.
# - VALEVISION3D: the header is X-ValeVision-Drawings-Base; the default backup
#   root lies outside the repository and keeps 30; a save without the header
#   behaves as before (validate_project_json kept, project.json written byte
#   for byte as before); two saves on one base sent at once cannot both land;
#   a folder id never leaves the Projects folder; an unknown API route answers
#   a JSON 404 and /api/health names the local server.
#
# USAGE:
#     python 80__Testing__PrototypeEnvironment/Na__Test__ProjectDataSaveGuard__.test.py
#
#   Exit 0 = every check passed. Exit 1 = at least one did not. Needs flask:
#   the copy bundled with Whitecardopedia's server is used when there is one.
#   Writes no byte-code: the repository tracks Whitecardopedia's __pycache__
#   and the bundled dependencies' __pycache__ files.
#
# -----------------------------------------------------------------------------
#
# PORT NOTE:
# - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__ProjectDataSaveGuard__.test.py
# - Source version: 1.0.0 (TrueVision3D v2.146.0, 22-Sep-2026; read at HEAD b2aa9151)
# - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W0-09}}
# - Parity        : adapted - every TrueVision check is kept, in its order, against ValeVision's server
# - Divergences   :
#   - Drives WCP/server.py and WCP/Server__ValeVisionShared__Lib__.py (TrueVision: na-apps/ProjectVision__LocalServer__Main__.py);
#     the constants it repoints and the helpers it calls live in the library.
#   - The made-up project is Projects/2026/9999__SaveGuardTest/project.json, addressed by its folder id
#     (TrueVision: 26-Projects/XX01__Test/30__TrueVision__AppContent, by project code and query); its documents carry
#     projectName, which ValeVision's validate_project_json requires; the notes file is ValeVision__DrawingNotes__.json.
#   - The Projects folder is a subfolder of the temporary folder, so a path that escapes it can be looked for.
#   - ValeVision checks follow TrueVision's (header name, default backup root and keep, a root inside the Projects
#     folder refused, a save without the header written as before, the two-saves race, the legacy numeric id,
#     folder ids that would leave the Projects folder, the JSON 404 and /api/health).
#   - check() falls back to ASCII when the console cannot print a detail.
# - Back-port     : none.
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 22-Sep-2026 - Version 1.0.0
# - Written with the project data save guard and backups (TrueVision3D v2.146.0).
#
# =============================================================================

import sys
sys.dont_write_bytecode = True                                        # <-- Whitecardopedia's __pycache__ is tracked; a test must not touch it
import os, json, tempfile, shutil, time, threading

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..', 'Whitecardopedia'))   # <-- The folder server.py and its library are in
BUNDLED    = os.path.join(SERVER_DIR, 'src', 'ThirdParty__VersionLockedDependencies', 'SERVER__FlaskServerDepencies')
if os.path.exists(BUNDLED):
    sys.path.insert(0, BUNDLED)                                       # <-- The same flask server.py itself runs on
sys.path.insert(0, SERVER_DIR)

import server as srv                                                  # noqa: E402
import Server__ValeVisionShared__Lib__ as lib                         # noqa: E402

failures = 0
def check(label, ok, extra=''):
    global failures
    line = ('PASS ' if ok else 'FAIL ') + label + ((' :: ' + str(extra)) if (extra and not ok) else '')
    try:
        print(line)
    except UnicodeEncodeError:
        print(line.encode('ascii', 'backslashreplace').decode('ascii'))
    if not ok:
        failures += 1

def read_text(path):
    with open(path, 'r', encoding='utf-8', newline='') as handle:
        return handle.read()

def write_text(path, text):
    with open(path, 'w', encoding='utf-8', newline='') as handle:
        handle.write(text)

def project_doc(sheet_names, saved_iso=None, other='camera-1'):
    block = {
        'LayoutEditor__DrawingsData__Version' : 1,
        'LayoutEditor__DrawingsData__Sheets'  : [ { 'Sheet__Id' : f'Sheet_{i + 1:03d}', 'Sheet__Name' : name } for i, name in enumerate(sheet_names) ]
    }
    if saved_iso:
        block['LayoutEditor__DrawingsData__SavedIso'] = saved_iso
    return { 'projectName' : 'Save Guard Test', 'projectCode' : '9999', 'Camera__DefaultPosition' : other, 'LayoutEditor__DrawingsData' : block }

def no_block_doc():
    return { 'projectName' : 'Save Guard Test', 'projectCode' : '9999' }

# THE DEFAULTS | Read before anything is repointed; nothing is written there
# ------------------------------------------------------------
real_projects = lib.PROJECTS_ROOT
real_backups  = lib.PROJECT_BACKUP_ROOT
real_keep     = lib.PROJECT_BACKUP_KEEP
check('the save guard header is X-ValeVision-Drawings-Base', lib.DRAWINGS_BASE_HEADER == 'X-ValeVision-Drawings-Base', lib.DRAWINGS_BASE_HEADER)
check('thirty copies of each file are kept by default', real_keep == 30, real_keep)
check('the default backup root is outside the repository and the Projects folder', not lib.is_inside(real_backups, lib.REPOSITORY_ROOT) and not lib.is_inside(real_backups, real_projects) and lib.backup_root_problem() is None, real_backups)
if not os.environ.get('VALEVISION_PROJECT_BACKUP_ROOT'):
    expected_root = os.path.join(os.environ.get('LOCALAPPDATA') or os.path.expanduser('~'), 'ValeGardenHouses', 'ValeVision', 'ProjectDataBackups')
    check('...and is %LOCALAPPDATA%\\ValeGardenHouses\\ValeVision\\ProjectDataBackups, as configured for Adam to confirm', os.path.normcase(real_backups) == os.path.normcase(expected_root), real_backups)
check('the Projects folder is Whitecardopedia/Projects', os.path.normcase(real_projects) == os.path.normcase(os.path.join(SERVER_DIR, 'Projects')), real_projects)

tmp_base = tempfile.mkdtemp(prefix='savegrd_')
backups  = tempfile.mkdtemp(prefix='savegrd_bak_')
try:
    tmp     = os.path.join(tmp_base, 'Projects')
    content = os.path.join(tmp, '2026', '9999__SaveGuardTest')
    os.makedirs(content)
    data_path  = os.path.join(content, 'project.json')
    notes_path = os.path.join(content, 'ValeVision__DrawingNotes__.json')
    lib.PROJECTS_ROOT       = tmp
    lib.PROJECT_BACKUP_ROOT = backups
    lib.PROJECT_BACKUP_KEEP = 3
    client      = srv.app.test_client()
    PROJECT     = '/api/projects/2026/9999__SaveGuardTest'
    FINGERPRINT = PROJECT + '/drawings-fingerprint'
    HEADER      = lib.DRAWINGS_BASE_HEADER

    # THE FINGERPRINT
    # ------------------------------------------------------------
    doc = project_doc(['D01', 'D02'])
    write_text(data_path, json.dumps(doc, indent=4) + '\n')
    answer = client.get(FINGERPRINT).get_json()
    digest_pretty = answer['drawings']['digest']
    check('the fingerprint route answers the block\'s digest', isinstance(digest_pretty, str) and digest_pretty.startswith('sha1:') and len(digest_pretty) == 45, answer)
    check('...and no saved stamp when the block has none', answer['drawings']['savedIso'] is None)
    write_text(data_path, json.dumps(doc, separators=(',', ':')))     # <-- The same drawings, formatted differently
    digest_compact = client.get(FINGERPRINT).get_json()['drawings']['digest']
    check('the same drawings fingerprint the same however the file is formatted', digest_compact == digest_pretty)
    doc_other = project_doc(['D01', 'D02'], other='camera-2')
    write_text(data_path, json.dumps(doc_other, indent=4) + '\n')
    check('a change outside the block does not change the fingerprint', client.get(FINGERPRINT).get_json()['drawings']['digest'] == digest_pretty)
    write_text(data_path, json.dumps(no_block_doc(), indent=4) + '\n')
    check('a file with no block answers none', client.get(FINGERPRINT).get_json()['drawings'] == { 'savedIso' : None, 'digest' : None })
    check('an unknown project is 404', client.get('/api/projects/2026/0000__None/drawings-fingerprint').status_code == 404)

    # THE GUARD
    # ------------------------------------------------------------
    write_text(data_path, json.dumps(doc, indent=4) + '\n')
    base = client.get(FINGERPRINT).get_json()['drawings']['digest']
    saved_a = project_doc(['D01', 'D02', 'D03'], saved_iso='2026-09-22T11:00:00.000Z')
    answer = client.post(PROJECT, json=saved_a, headers={ HEADER : base })
    check('a save built on the block on disk lands', answer.status_code == 200, (answer.status_code, answer.get_json()))
    body = answer.get_json()
    after_a = client.get(FINGERPRINT).get_json()['drawings']
    check('...and answers the fingerprint the file has now', body['drawings'] == after_a and after_a['digest'] != base, (body.get('drawings'), after_a))
    check('...with the stamp the app wrote', after_a['savedIso'] == '2026-09-22T11:00:00.000Z')
    on_disk_a = read_text(data_path)

    saved_stale = project_doc(['D01', 'D02', 'STALE'], saved_iso='2026-09-22T11:05:00.000Z')
    answer = client.post(PROJECT, json=saved_stale, headers={ HEADER : base })
    check('the same base sent again after the file changed is refused with 409', answer.status_code == 409, answer.status_code)
    body = answer.get_json() or {}
    check('...naming the conflict and the fingerprint on disk', body.get('conflict') is True and body.get('drawings') == after_a, body)
    check('...and the file is left exactly as it was', read_text(data_path) == on_disk_a)
    check('...and no copy was kept for a save that did not land', len(lib.list_backups(data_path)) == 1, len(lib.list_backups(data_path)))

    write_text(data_path, on_disk_a.replace('"D03"', '"D03 edited by hand"'))          # <-- An agent, or a git checkout, changes the file itself
    answer = client.post(PROJECT, json=saved_a, headers={ HEADER : after_a['digest'] })
    check('a file changed by hand since the app loaded it refuses the save too', answer.status_code == 409, answer.status_code)
    check('...and keeps the hand edit', '"D03 edited by hand"' in read_text(data_path))

    hand = client.get(FINGERPRINT).get_json()['drawings']['digest']
    answer = client.post(PROJECT, json=saved_stale, headers={ HEADER : hand })
    check('a save built on the file as it is now lands', answer.status_code == 200, answer.status_code)

    answer = client.post(PROJECT, json=project_doc(['NO HEADER']))
    check('a save carrying no fingerprint is never judged', answer.status_code == 200, answer.status_code)
    check('...and its answer still carries the fingerprint written', answer.get_json()['drawings']['digest'] == client.get(FINGERPRINT).get_json()['drawings']['digest'])

    answer = client.post(PROJECT, json=project_doc(['X']), headers={ HEADER : 'none' })
    check('"none" against a file that has a block is refused', answer.status_code == 409, answer.status_code)
    write_text(data_path, json.dumps(no_block_doc(), indent=4) + '\n')
    answer = client.post(PROJECT, json=project_doc(['FIRST']), headers={ HEADER : 'none' })
    check('"none" against a file with no block lands: the first drawings a project gets', answer.status_code == 200, answer.status_code)

    # THE BACKUPS
    # ------------------------------------------------------------
    backup_dir = lib.backup_dir_for(data_path)
    expected_dir = os.path.join(backups, '2026', '9999__SaveGuardTest')
    check('backups go under the backup root, mirroring the file\'s path in the Projects folder', os.path.normcase(backup_dir) == os.path.normcase(expected_dir), backup_dir)
    check('...never inside the Projects folder', not os.path.normcase(os.path.abspath(backup_dir)).startswith(os.path.normcase(os.path.abspath(tmp))))
    listing = client.get(PROJECT + '/backups').get_json()
    kept = listing['files']['project.json']
    check('every overwrite so far kept a copy, capped at KEEP', len(kept) == 3 and listing['keep'] == 3, (len(kept), listing.get('keep')))
    check('the listing is newest first', [ entry['file'] for entry in kept ] == sorted((entry['file'] for entry in kept), reverse=True))

    before = read_text(data_path)
    time.sleep(0.002)
    answer = client.post(PROJECT, json=project_doc(['AFTER']))
    body = answer.get_json()
    check('the answer names the copy it kept', isinstance(body.get('backup'), str) and os.path.isfile(body['backup']), body.get('backup'))
    check('...and the copy is the overwritten file byte for byte', read_text(body['backup']) == before)
    kept = client.get(PROJECT + '/backups').get_json()['files']['project.json']
    check('the oldest went as the new one came: still KEEP copies', len(kept) == 3 and kept[0]['file'] == os.path.basename(body['backup']), [ entry['file'] for entry in kept ])

    write_text(notes_path, json.dumps({ 'ProjectSpecification__Notes' : [] }) + '\n')
    notes_before = read_text(notes_path)
    answer = client.post(PROJECT + '/files/ValeVision__DrawingNotes__.json', json={ 'ProjectSpecification__Notes' : [ { 'id' : 'EW01' } ] })
    check('the drawing notes file is kept before it is overwritten too', answer.status_code == 200 and isinstance(answer.get_json().get('backup'), str), answer.get_json())
    check('...byte for byte', read_text(answer.get_json()['backup']) == notes_before)
    check('...and listed beside the project data', len(client.get(PROJECT + '/backups').get_json()['files']['ValeVision__DrawingNotes__.json']) == 1)

    check('a first write of a file that does not exist yet keeps nothing and lands', lib.backup_before_overwrite(os.path.join(content, 'ValeVision__StatementDocs__.json')) is None)

    # VALEVISION3D | CALLERS WITHOUT THE HEADER BEHAVE AS BEFORE
    # ------------------------------------------------------------
    plain = project_doc(['PLAIN'])
    plain['projectName'] = 'Café Säve'                         # <-- Not ASCII: written as it is, as before
    answer = client.post(PROJECT, data=json.dumps(plain), content_type='application/json')    # <-- Sent in its own key order
    body = answer.get_json() or {}
    check('a save without the header answers success and its message, as before', answer.status_code == 200 and body.get('success') is True and body.get('message') == 'Project 2026/9999__SaveGuardTest saved successfully', body)
    with open(data_path, 'rb') as handle:
        written = handle.read()
    expected = json.dumps(plain, indent=4, ensure_ascii=False).replace('\n', os.linesep).encode('utf-8')
    check('...and project.json is written byte for byte as before: 4-space JSON, the platform line ending, no final newline', written == expected, written[-60:])
    check('...and no temporary file is left beside it', [ name for name in os.listdir(content) if name.endswith('.tmp') ] == [], os.listdir(content))

    unnamed = project_doc(['NO NAME'])
    del unnamed['projectName']
    before = read_text(data_path)
    answer = client.post(PROJECT, json=unnamed, headers={ HEADER : client.get(FINGERPRINT).get_json()['drawings']['digest'] })
    check('validate_project_json is kept: a document without projectName is refused with 400, header or not', answer.status_code == 400 and 'projectName' in (answer.get_json() or {}).get('error', ''), answer.get_json())
    check('...and the file is untouched', read_text(data_path) == before)
    answer = client.post('/api/projects/2026/0000__NoSuchProject', json=project_doc(['NOWHERE']))
    check('a save for a project folder that does not exist is still a 404, and makes nothing', answer.status_code == 404 and not os.path.exists(os.path.join(tmp, '2026', '0000__NoSuchProject')), answer.status_code)
    check('the legacy numeric id finds the same project', client.get('/api/projects/9999/drawings-fingerprint').get_json().get('drawings') == client.get(FINGERPRINT).get_json()['drawings'])

    # VALEVISION3D | TWO SAVES ON ONE BASE, SENT AT ONCE
    # ------------------------------------------------------------
    race_base = client.get(FINGERPRINT).get_json()['drawings']['digest']
    statuses  = []
    def race(name):
        answer = srv.app.test_client().post(PROJECT, json=project_doc(['RACE ' + name]), headers={ HEADER : race_base })
        statuses.append(answer.status_code)
    racers = [ threading.Thread(target=race, args=(name,)) for name in ('A', 'B') ]
    for racer in racers:
        racer.start()
    for racer in racers:
        racer.join()
    check('two saves built on one base and sent at once: one lands, the other is refused', sorted(statuses) == [200, 409], statuses)

    # VALEVISION3D | A BACKUP ROOT INSIDE THE PROJECTS FOLDER IS REFUSED
    # ------------------------------------------------------------
    inside_root = os.path.join(content, 'Backups')
    lib.PROJECT_BACKUP_ROOT = inside_root
    answer = client.post(PROJECT, json=project_doc(['INSIDE']))
    check('a backup root inside the Projects folder keeps nothing there, and the save still lands', answer.status_code == 200 and answer.get_json().get('backup') is None and not os.path.exists(inside_root), answer.get_json())
    lib.PROJECT_BACKUP_ROOT = backups

    # VALEVISION3D | A FOLDER ID NEVER LEAVES THE PROJECTS FOLDER
    # ------------------------------------------------------------
    outside = os.path.join(tmp_base, 'outside')
    os.makedirs(outside)
    for label, url in (
        ('a folder id climbing out with .. is refused with 400',  '/api/projects/2026/../../outside'),
        ('...and so is one percent-encoded',                      '/api/projects/2026/%2E%2E/%2E%2E/outside'),
        ('...and a bare .. folder id',                            '/api/projects/%2E%2E'),
    ):
        answer = client.post(url, json=project_doc(['ESCAPED']))
        check(label, answer.status_code == 400 and 'Refused project folder id' in (answer.get_json() or {}).get('error', ''), (answer.status_code, answer.get_json()))
    check('...and nothing was written outside the Projects folder', os.listdir(outside) == [] and not os.path.exists(os.path.join(tmp_base, 'project.json')) and not os.path.exists(os.path.join(tmp, 'project.json')), os.listdir(outside))
    answer = client.post('/api/projects/2026/', json=project_doc(['YEAR']))
    check('a folder id naming a year folder is refused', answer.status_code == 400 and not os.path.exists(os.path.join(tmp, '2026', 'project.json')), (answer.status_code, answer.get_json()))
    refused = 0
    for folder_id in ('2026/../../outside', '..', '2026/./9999__SaveGuardTest', '2026\\..\\..\\outside', '2026/... /x'):
        try:
            srv.get_project_path(folder_id)
        except lib.ProjectPathRefused:
            refused += 1
    check('get_project_path refuses every such id itself, for ids that come in a body', refused == 5, refused)
    check('...and still finds a real project by its folder id', os.path.normcase(srv.get_project_path('2026/9999__SaveGuardTest')) == os.path.normcase(content))
    check('a blueprint resolves a project by folder and 4-digit year, or folder id, and nothing else', lib.resolve_project_dir('9999__SaveGuardTest', '2026') == content and lib.resolve_project_dir(folder_id='2026/9999__SaveGuardTest') == content and lib.resolve_project_dir('9999__SaveGuardTest', '26') is None and lib.resolve_project_dir('..', '2026') is None and lib.resolve_project_dir(folder_id='2026/../outside') is None)

    # VALEVISION3D | UNKNOWN API ROUTES AND /api/health
    # ------------------------------------------------------------
    answer = client.get('/api/does-not-exist')
    check('GET /api/does-not-exist answers 404 JSON, not index.html', answer.status_code == 404 and answer.is_json and (answer.get_json() or {}).get('error') == 'no such API route', (answer.status_code, answer.content_type))
    answer = client.post('/api/does-not-exist', json={})
    check('...and so does a POST, not an HTML 405', answer.status_code == 404 and answer.is_json, (answer.status_code, answer.content_type))
    answer = client.get('/api/valevision/no-such-feature')
    check('...and an unknown /api/valevision/ route', answer.status_code == 404 and answer.is_json, (answer.status_code, answer.content_type))
    check('/api/health names the local server', client.get('/api/health').get_json() == { 'status' : 'ok', 'service' : 'whitecardopedia-local-dev', 'app' : 'ValeVision3D', 'port' : 8000 }, client.get('/api/health').get_json())
    check('/api/check-localhost answers as before', client.get('/api/check-localhost').get_json() == { 'isLocalhost' : True, 'message' : 'Server running on localhost' })
    answer = client.get('/no-such-page-W0-09')
    check('a path outside /api/ still falls back to the index page', answer.status_code == 200 and answer.mimetype == 'text/html', (answer.status_code, answer.mimetype))
    answer.close()

    check('the real Projects folder and backup root were never the target', lib.PROJECTS_ROOT == tmp and lib.PROJECT_BACKUP_ROOT == backups and os.path.normcase(real_projects) != os.path.normcase(tmp))

finally:
    lib.PROJECTS_ROOT       = real_projects
    lib.PROJECT_BACKUP_ROOT = real_backups
    lib.PROJECT_BACKUP_KEEP = real_keep
    shutil.rmtree(tmp_base, ignore_errors=True)
    shutil.rmtree(backups, ignore_errors=True)

print('FAILURES:', failures)
sys.exit(1 if failures else 0)
