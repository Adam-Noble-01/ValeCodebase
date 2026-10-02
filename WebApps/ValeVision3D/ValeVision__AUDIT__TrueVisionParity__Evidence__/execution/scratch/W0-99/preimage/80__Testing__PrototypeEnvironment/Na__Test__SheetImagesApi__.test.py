#!/usr/bin/env python3
# =============================================================================
# VALEVISION3D - TEST - SHEET IMAGES API
# =============================================================================
#
# FILE       : Na__Test__SheetImagesApi__.test.py
# MODULE     : SheetImagesApiTest
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Prove the sheet picture routes: folders made on demand, pictures
#              stored by content, filed by document id, archived never deleted
# CREATED    : 21-Sep-2026
#
# DESCRIPTION:
# - Drives WebApps/Whitecardopedia/Server__ValeVisionSheetImages__Api__.py,
#   with its shared library Server__ValeVisionShared__Lib__.py, through
#   Flask's test client, on its own and as server.py registers it. No server
#   is started and no port is used.
# - NO REAL PROJECT IS WRITTEN. The blueprint reads the Projects folder from
#   the library's constant at call time; the test points it at a temporary
#   folder holding made-up projects before the first request, and checks
#   before it ends that it stayed pointed there.
# - Covers: the images folder made by the first upload and never by a read;
#   the same picture twice is stored once; a name whose hash does not match
#   its bytes, a type that does not match its name, and every escape (..,
#   the archive folder, a slash, a project of "..") refused; a renumber
#   copied into the new folder and the old copy archived only when asked;
#   an undone delete restored from anywhere; a swap of two numbers; a file
#   that is not ours never archived; empty folders tidied.
# - VALEVISION3D: the images folder is the project folder's own
#   05__Layout__DrawingDocs__Images under Projects/<yyyy>/<folder>; a project
#   is named by project-folder and a 4-digit year or by folder-id, a folder
#   name may hold a space, and a 2-digit year, a missing project or a '..'
#   folder id is refused without a folder being made; an upload lands only in
#   the images folder; reconcile refuses the archive as a home; nothing is
#   ever deleted; server.py serves the three routes.
#
# USAGE:
#     python 80__Testing__PrototypeEnvironment/Na__Test__SheetImagesApi__.test.py
#
#   Exit 0 = every check passed. Exit 1 = at least one did not. Needs flask:
#   the copy bundled with Whitecardopedia's server is used when there is one.
#   Writes no byte-code: the repository tracks Whitecardopedia's __pycache__
#   and the bundled dependencies' __pycache__ files.
#
# -----------------------------------------------------------------------------
#
# PORT NOTE:
# - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__SheetImagesApi__.test.py
# - Source version: 1.0.0 (TrueVision3D v2.116.0, 21-Sep-2026; read at HEAD b2aa9151)
# - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W0-18}}
# - Parity        : adapted - TrueVision's 24 checks, in their order, against ValeVision's blueprint
# - Divergences   :
#   - Drives WCP/Server__ValeVisionSheetImages__Api__.py on /api/valevision/sheet-images (TrueVision:
#     na-apps/ProjectVision__TrueVisionSheetImages__Api__.py, /api/truevision/sheet-images), with the flask bundled
#     beside server.py; the Projects root it repoints is the shared library's.
#   - The made-up project is Projects/2026/9999__SheetImagesTest, its pictures filed straight under the project
#     folder (TrueVision: 26-Projects/XX01__Test/30__TrueVision__AppContent, year 26); the document ids are
#     ValeVision's {project}_{drawing} (9999_D01; TrueVision's carry NA job phases).
#   - ValeVision checks follow TrueVision's (folder-id and a folder name with a space, the 4-digit year, refusals
#     that make no folder, uploads only in the images folder, the archive refused as a home, nothing deleted,
#     the routes as server.py serves them); check() falls back to ASCII when the console cannot print a detail.
# - Back-port     : none.
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 21-Sep-2026 - Version 1.0.0
# - Written with Sheet Images (TrueVision3D v2.116.0).
#
# =============================================================================

import sys
sys.dont_write_bytecode = True                                        # <-- Whitecardopedia's __pycache__ is tracked; a test must not touch it
import os, hashlib, tempfile, shutil
from urllib.parse import quote

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..', 'Whitecardopedia'))   # <-- The folder server.py, the blueprint and its library are in
BUNDLED    = os.path.join(SERVER_DIR, 'src', 'ThirdParty__VersionLockedDependencies', 'SERVER__FlaskServerDepencies')
if os.path.exists(BUNDLED):
    sys.path.insert(0, BUNDLED)                                       # <-- The same flask server.py itself runs on
sys.path.insert(0, SERVER_DIR)

import Server__ValeVisionSheetImages__Api__ as api                    # noqa: E402
import Server__ValeVisionShared__Lib__ as lib                         # noqa: E402
from flask import Flask                                               # noqa: E402

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

def every_file(folder):
    found = []
    for current, _, files in os.walk(folder):
        for name in files:
            found.append(os.path.relpath(os.path.join(current, name), folder).replace('\\', '/'))
    return sorted(found)

def managed_names(folder):
    return sorted(name for name in (path.rsplit('/', 1)[-1] for path in every_file(folder)) if api.MANAGED_PATTERN.match(name))

real_projects = lib.PROJECTS_ROOT
check('the Projects folder is Whitecardopedia/Projects', os.path.normcase(real_projects) == os.path.normcase(os.path.join(SERVER_DIR, 'Projects')), real_projects)
check('the images folder keeps TrueVision\'s name, 05__Layout__DrawingDocs__Images, with its 00__Archive', api.IMAGES_DIR == '05__Layout__DrawingDocs__Images' and api.ARCHIVE_DIR == '00__Archive')

tmp = tempfile.mkdtemp(prefix='sheetimg_')
try:
    projects = os.path.join(tmp, 'Projects')
    project  = os.path.join(projects, '2026', '9999__SheetImagesTest')
    os.makedirs(project)
    with open(os.path.join(project, 'project.json'), 'w', encoding='utf-8') as f:
        f.write('{ "projectName": "Sheet Images Test", "projectCode": "9999" }\n')
    lib.PROJECTS_ROOT = projects
    app = Flask(__name__)
    app.register_blueprint(api.valevision_sheet_images_api)
    client = app.test_client()
    ROUTE = '/api/valevision/sheet-images'
    q = 'project-folder=9999__SheetImagesTest&year=2026'
    root = os.path.join(project, '05__Layout__DrawingDocs__Images')

    r = client.get(ROUTE + '/list?' + q)
    check('list before any picture: exists False', r.status_code == 200 and r.get_json()['exists'] is False, r.get_json())
    check('no images folder made by a list', not os.path.exists(root))

    # A tiny valid WebP header + payload (only the magic bytes are sniffed)
    webp = b'RIFF' + (100).to_bytes(4, 'little') + b'WEBP' + b'VP8 ' + os.urandom(90)
    h = hashlib.sha256(webp).hexdigest()[:10]
    name = 'FrontCgi__' + h + '.webp'

    r = client.post(ROUTE + '/upload?' + q + '&folder=9999_D01&name=' + name, data=webp, content_type='image/webp')
    check('upload creates', r.status_code == 200 and r.get_json()['created'] is True, r.get_json())
    check('images folder made on demand', os.path.isfile(os.path.join(root, '9999_D01', name)))

    r = client.post(ROUTE + '/upload?' + q + '&folder=9999_D01&name=' + name, data=webp, content_type='image/webp')
    check('same picture again: created False', r.status_code == 200 and r.get_json()['created'] is False, r.get_json())

    r = client.post(ROUTE + '/upload?' + q + '&folder=9999_D01&name=Other__0123456789.webp', data=webp, content_type='image/webp')
    check('hash mismatch refused', r.status_code == 400, r.get_json())

    r = client.post(ROUTE + '/upload?' + q + '&folder=9999_D01&name=Bad__' + h + '.png', data=webp, content_type='image/png')
    check('type mismatch refused', r.status_code == 400, r.get_json())

    r = client.post(ROUTE + '/upload?' + q + '&folder=..&name=' + name, data=webp)
    check('folder .. refused', r.status_code == 400)
    r = client.post(ROUTE + '/upload?' + q + '&folder=00__Archive&name=' + name, data=webp)
    check('archive folder refused', r.status_code == 400)
    r = client.post(ROUTE + '/upload?' + q + '&folder=A%2FB&name=' + name, data=webp)
    check('slash in folder refused', r.status_code == 400)
    r = client.post(ROUTE + '/upload?project-folder=..&year=2026&folder=A&name=' + name, data=webp)
    check('project .. refused', r.status_code == 404)

    # Somebody's own file in the folder (not managed) must never be archived
    own = os.path.join(root, '9999_D01', '9999_V10__FrontFascade__.png')
    with open(own, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + b'0' * 20)

    # Renumber: D01 -> D02. Reconcile copies into the new folder from the hint.
    r = client.post(ROUTE + '/reconcile?' + q, json={'keep': [{'folder': '9999_D02', 'file': name, 'from': ['9999_D01']}]})
    res = r.get_json()
    check('reconcile copies into the new folder', r.status_code == 200 and res['results'][0]['state'] == 'copied' and res['results'][0]['source'] == '9999_D01', res)
    check('old copy still there (copy, not move)', os.path.isfile(os.path.join(root, '9999_D01', name)))
    check('nothing archived without archive flag', res['archived'] == [])

    # Archive after the save: the old folder's copy goes to 00__Archive; the unmanaged file stays.
    r = client.post(ROUTE + '/reconcile?' + q, json={'keep': [{'folder': '9999_D02', 'file': name}], 'archive': True})
    res = r.get_json()
    check('archive moves the unused managed copy', res['archived'] == ['9999_D01/' + name], res)
    check('archived file exists', os.path.isfile(os.path.join(root, '00__Archive', '9999_D01', name)))
    check('unmanaged file left alone', os.path.isfile(own))
    check('folder with the unmanaged file kept', '9999_D01' not in res['removedFolders'])

    # Undo brings the D01 reference back: reconcile restores from the archive.
    r = client.post(ROUTE + '/reconcile?' + q, json={'keep': [{'folder': '9999_D01', 'file': name, 'from': []}]})
    res = r.get_json()
    check('restored from anywhere (live copy preferred over archive)', res['results'][0]['state'] == 'copied' and res['results'][0]['source'] == '9999_D02', res)

    # Missing picture reported
    r = client.post(ROUTE + '/reconcile?' + q, json={'keep': [{'folder': '9999_D05', 'file': 'Nope__abcdefabcd.webp'}]})
    check('missing reported', r.get_json()['results'][0]['state'] == 'missing', r.get_json())

    # Swap D01 <-> D02 with two pictures; both end up where wanted.
    webp2 = b'RIFF' + (100).to_bytes(4, 'little') + b'WEBP' + b'VP8 ' + os.urandom(90)
    name2 = 'RearCgi__' + hashlib.sha256(webp2).hexdigest()[:10] + '.webp'
    client.post(ROUTE + '/upload?' + q + '&folder=9999_D02&name=' + name2, data=webp2)
    r = client.post(ROUTE + '/reconcile?' + q, json={'keep': [
        {'folder': '9999_D02', 'file': name, 'from': ['9999_D01']},
        {'folder': '9999_D01', 'file': name2, 'from': ['9999_D02']}], 'archive': True})
    res = r.get_json()
    check('swap: both present in new homes', os.path.isfile(os.path.join(root, '9999_D02', name)) and os.path.isfile(os.path.join(root, '9999_D01', name2)), res)
    check('swap: stale copies archived', sorted(res['archived']) == sorted(['9999_D01/' + name, '9999_D02/' + name2]), res)

    r = client.get(ROUTE + '/list?' + q)
    entries = r.get_json()['entries']
    check('list reports archive entries marked', any(e['archived'] for e in entries) and any(not e['archived'] for e in entries), entries)

    # Empty keep + archive archives everything managed and removes empty folders
    stored_before = managed_names(root)
    r = client.post(ROUTE + '/reconcile?' + q, json={'keep': [], 'archive': True})
    res = r.get_json()
    check('delete all: 9999_D02 removed when empty', '9999_D02' in res['removedFolders'], res)

    # VALEVISION3D | the project folder, the archive and nothing deleted
    # ------------------------------------------------------------
    check('nothing is deleted: every stored picture is still on disk, now in the archive', managed_names(os.path.join(root, '00__Archive')) == stored_before == managed_names(root) and len(stored_before) == 4, (stored_before, every_file(root)))
    outside = [path for path in every_file(project) if path != 'project.json' and not path.startswith('05__Layout__DrawingDocs__Images/')]
    check('uploads land only in the images folder (the project folder holds nothing else new)', outside == [], outside)
    check('...and nothing is written outside the Projects folder', sorted(os.listdir(tmp)) == ['Projects'] and sorted(os.listdir(projects)) == ['2026'], sorted(os.listdir(tmp)))

    r = client.get(ROUTE + '/list?folder-id=2026/9999__SheetImagesTest')
    check('folder-id=YYYY/Folder names the project too', r.status_code == 200 and r.get_json()['exists'] is True and r.get_json()['root'] == '05__Layout__DrawingDocs__Images', r.get_json())

    spaced = os.path.join(projects, '2025', 'FN-0001__Space Test 01')
    os.makedirs(spaced)
    webp3 = b'RIFF' + (100).to_bytes(4, 'little') + b'WEBP' + b'VP8 ' + os.urandom(90)
    name3 = 'Site__' + hashlib.sha256(webp3).hexdigest()[:10] + '.webp'
    r = client.post(ROUTE + '/upload?folder-id=' + quote('2025/FN-0001__Space Test 01', safe='/') + '&folder=FN-0001_D01&name=' + name3, data=webp3, content_type='image/webp')
    check('a project folder name with a space takes a picture', r.status_code == 200 and os.path.isfile(os.path.join(spaced, '05__Layout__DrawingDocs__Images', 'FN-0001_D01', name3)), r.get_json())
    r = client.get(ROUTE + '/list?project-folder=' + quote('FN-0001__Space Test 01') + '&year=2025')
    check('...and lists it by project-folder and year', r.status_code == 200 and [e['file'] for e in r.get_json()['entries']] == [name3], r.get_json())

    before = every_file(tmp)
    r1 = client.get(ROUTE + '/list?project-folder=9999__SheetImagesTest&year=26')
    r2 = client.post(ROUTE + '/upload?project-folder=0000__NoSuchProject&year=2026&folder=0000_D01&name=' + name, data=webp, content_type='image/webp')
    r3 = client.post(ROUTE + '/upload?folder-id=2026/..&folder=9999_D01&name=' + name, data=webp, content_type='image/webp')
    r4 = client.post(ROUTE + '/reconcile?folder-id=2026/../2026/9999__SheetImagesTest', json={'keep': [], 'archive': True})
    check('a 2-digit year, a project that is not there and a ".." folder id are refused (404)', [r1.status_code, r2.status_code, r3.status_code, r4.status_code] == [404, 404, 404, 404], [r1.status_code, r2.status_code, r3.status_code, r4.status_code])
    check('...and make no folder', every_file(tmp) == before and not os.path.exists(os.path.join(projects, '2026', '0000__NoSuchProject')))

    r = client.post(ROUTE + '/reconcile?' + q, json={'keep': [{'folder': '00__Archive', 'file': name}, {'folder': '..', 'file': name}, {'folder': '9999_D01', 'file': '../' + name}]})
    check('reconcile refuses the archive, ".." and a path as a home', r.status_code == 200 and [x['state'] for x in r.get_json()['results']] == ['refused', 'refused', 'refused'], r.get_json())
    r = client.post(ROUTE + '/reconcile?' + q, data='keep', content_type='text/plain')
    check('a reconcile body that is not a JSON object is refused', r.status_code == 400 and 'error' in (r.get_json() or {}), r.get_json())
    r1 = client.post(ROUTE + '/upload?' + q + '&folder=9999_D01&name=Text__0123456789.webp', data=b'not a picture at all', content_type='image/webp')
    r2 = client.post(ROUTE + '/upload?' + q + '&folder=9999_D01&name=Empty__0123456789.webp', data=b'', content_type='image/webp')
    check('bytes that are not a picture, and no bytes, are refused', r1.status_code == 400 and r2.status_code == 400, [r1.get_json(), r2.get_json()])

    webp4 = b'RIFF' + (100).to_bytes(4, 'little') + b'WEBP' + b'VP8 ' + os.urandom(90)
    r1 = client.post(ROUTE + '/upload?' + q + '&folder=9999_D03&name=Plain.webp', data=webp, content_type='image/webp')
    r2 = client.post(ROUTE + '/upload?' + q + '&folder=9999_D03&name=Plain.webp', data=webp4, content_type='image/webp')
    check('a different picture under a stored name is refused (409) and the stored one kept', r1.status_code == 200 and r2.status_code == 409 and open(os.path.join(root, '9999_D03', 'Plain.webp'), 'rb').read() == webp, [r1.get_json(), r2.get_json()])
    check('no temporary file is left in the images folder', [path for path in every_file(root) if path.endswith(('.tmp', '.copying', '.writing'))] == [], every_file(root))

    import server as srv                                              # noqa: E402  (the same blueprint and library modules)
    rules = {}
    for rule in srv.app.url_map.iter_rules():
        rules.setdefault(str(rule), set()).update(rule.methods)
    wanted = {ROUTE + '/list': {'GET'}, ROUTE + '/upload': {'POST', 'PUT'}, ROUTE + '/reconcile': {'POST'}}
    check('server.py serves the three routes', all(path in rules and methods <= rules[path] for path, methods in wanted.items()), {path: sorted(rules.get(path, ())) for path in wanted})
    r = srv.app.test_client().get(ROUTE + '/list?' + q)
    check('...and its list answers from the Projects folder (not the JSON 404 for unknown routes)', r.status_code == 200 and r.get_json().get('status') == 'ok' and r.get_json().get('exists') is True, r.get_json())
finally:
    lib.PROJECTS_ROOT = real_projects
    shutil.rmtree(tmp, ignore_errors=True)
check('the Projects folder is pointed back at Whitecardopedia/Projects', lib.PROJECTS_ROOT == real_projects)

print('FAILURES:', failures)
sys.exit(1 if failures else 0)
