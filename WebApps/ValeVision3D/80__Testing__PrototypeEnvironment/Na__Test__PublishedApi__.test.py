#!/usr/bin/env python3
# =============================================================================
# VALEVISION3D - TEST - PUBLISHED DOCUMENTS API
# =============================================================================
#
# FILE       : Na__Test__PublishedApi__.test.py
# MODULE     : PublishedApiTest
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Prove the published documents routes: atomic writes of sniffed bytes, a JSON 404 for a file not
#              published, an archive that is never written over, a prune that touches one document only, and
#              every path they must refuse
# CREATED    : 01-Oct-2026
#
# DESCRIPTION:
# - Drives WebApps/Whitecardopedia/Server__ValeVisionPublished__Api__.py, with
#   its shared library Server__ValeVisionShared__Lib__.py, through Flask's test
#   client, on its own and as server.py registers it. No server is started and
#   no port is used.
# - NO REAL PROJECT IS WRITTEN. The blueprint reads the Projects folder from
#   the library's constant at call time; the test points it at a temporary
#   folder holding made-up projects before the first request, and checks
#   before it ends that it stayed pointed there.
# - Covers: the published folder made by the first write and never by a read;
#   bytes that are not what their extension says refused; the same bytes twice
#   written once; the size cap; '..', the archive folder, a bad extension, a
#   seventh segment and every other bad segment refused (400); a missing
#   manifest a real JSON 404; a revision change zipped whole into
#   00__Archive__Revisions and never written over, however often or quickly it
#   is archived again; a prune that removes only what ONE document no longer
#   names, never a temporary file, never another document, the root files or
#   the archive; the archive folder refused as a document id; the project named
#   by project-folder and a 4-digit year or by folder-id, spaces allowed; a
#   2-digit year, a missing project and a '..' folder refused with no folder
#   made; nothing written outside the published folder; server.py serves the
#   routes, and the reader's localhost path for a published file that is not
#   there answers a JSON 404, never the index page.
#
# USAGE:
#     python 80__Testing__PrototypeEnvironment/Na__Test__PublishedApi__.test.py
#
#   Exit 0 = every check passed. Exit 1 = at least one did not. Needs flask:
#   the copy bundled with Whitecardopedia's server is used when there is one.
#   Writes no byte-code: the repository tracks Whitecardopedia's __pycache__
#   and the bundled dependencies' __pycache__ files.
#
# -----------------------------------------------------------------------------
#
# PORT NOTE:
# - Authored in   : ValeVision3D first (v2.71.1); no TrueVision twin - TrueVision's published documents
#                   routes (na-apps/ProjectVision__TrueVisionPublished__Api__.py, v2.155.0) have no test of their
#                   own beyond the reader and schema tests
# - Parity        : ValeVision-only (written with the published documents blueprint, W0-19; the pattern of
#                   Na__Test__ScrapbookApi__.test.py)
# - Back-port     : TrueVision's published routes would earn the same checks (the archive folder as a document id,
#                   an archive name taken twice in one second).
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 01-Oct-2026 - Version 1.0.0 (v2.71.1)
# - Written with the published documents blueprint: writes, reads, archive, prune, the fences and the routes as
#   server.py serves them.
#
# =============================================================================

import sys
sys.dont_write_bytecode = True                                        # <-- Whitecardopedia's __pycache__ is tracked; a test must not touch it
import os, json, hashlib, tempfile, shutil, zipfile
from datetime import datetime, timezone
from urllib.parse import quote

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..', 'Whitecardopedia'))   # <-- The folder server.py, the blueprint and its library are in
BUNDLED    = os.path.join(SERVER_DIR, 'src', 'ThirdParty__VersionLockedDependencies', 'SERVER__FlaskServerDepencies')
if os.path.exists(BUNDLED):
    sys.path.insert(0, BUNDLED)                                       # <-- The same flask server.py itself runs on
sys.path.insert(0, SERVER_DIR)

import Server__ValeVisionPublished__Api__ as api                      # noqa: E402
import Server__ValeVisionShared__Lib__ as lib                         # noqa: E402
from flask import Flask                                               # noqa: E402

ROUTE   = '/api/valevision/published'
PROJECT = '9999__PublishedTest'

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

def read(path):
    with open(path, 'rb') as handle:
        return handle.read()

def json_bytes(document):
    return (json.dumps(document, indent=4) + '\n').encode('utf-8')

def png(tag):
    return b'\x89PNG\r\n\x1a\n' + tag.encode('ascii') * 8

def webp(tag):
    return b'RIFF' + (100).to_bytes(4, 'little') + b'WEBP' + b'VP8 ' + tag.encode('ascii') * 8

PDF = b'%PDF-1.7\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n'
SVG = b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0L10 10"/></svg>'

real_projects = lib.PROJECTS_ROOT
check('the Projects folder is Whitecardopedia/Projects', os.path.normcase(real_projects) == os.path.normcase(os.path.join(SERVER_DIR, 'Projects')), real_projects)
check('the published folder and its archive keep TrueVision\'s names', api.PUBLISHED_DIR == '06__Layout__PublishedDocuments' and api.ARCHIVE_DIR == '00__Archive__Revisions')
check('TrueVision\'s path, document and revision rules, extensions and size cap are kept',
      api.SEGMENT_PATTERN.pattern == r'^[A-Za-z0-9][A-Za-z0-9_\-.]{0,159}$'
      and api.DOCUMENT_PATTERN.pattern == r'^[A-Za-z0-9][A-Za-z0-9_\-]{2,79}$'
      and api.REVISION_PATTERN.pattern == r'^[A-Za-z0-9]{1,8}$'
      and api.ALLOWED_EXTENSIONS == ('.json', '.svg', '.webp', '.png', '.pdf', '.md', '.note')
      and api.MAX_FILE_BYTES == 256 * 1024 * 1024)

tmp = tempfile.mkdtemp(prefix='published_api_')
real_datetime = api.datetime
real_cap = api.MAX_FILE_BYTES
try:
    projects = os.path.join(tmp, 'Projects')
    project  = os.path.join(projects, '2026', PROJECT)
    os.makedirs(project)
    with open(os.path.join(project, 'project.json'), 'w', encoding='utf-8') as f:
        f.write('{ "projectName": "Published Test", "projectCode": "9999" }\n')
    lib.PROJECTS_ROOT = projects
    app = Flask(__name__)
    app.register_blueprint(api.valevision_published_api)
    client = app.test_client()
    q = 'project-folder=' + PROJECT + '&year=2026'
    root = os.path.join(project, '06__Layout__PublishedDocuments')
    archive = os.path.join(root, '00__Archive__Revisions')

    def put(path, data, method='post', query=None):
        url = ROUTE + '/file?' + (query or q) + '&path=' + quote(path, safe='/')
        return getattr(client, method)(url, data=data, content_type='application/octet-stream')

    # READ BEFORE ANYTHING | a list answers and makes nothing
    # ------------------------------------------------------------
    r = client.get(ROUTE + '/list?' + q)
    check('list before any publish: status ok, the root named, no files', r.status_code == 200 and r.get_json() == {'status': 'ok', 'root': '06__Layout__PublishedDocuments', 'document': None, 'files': []}, r.get_json())
    check('...and no published folder is made by a list', not os.path.exists(root))

    # WRITES | raw bytes, sniffed, atomic, never rewritten when unchanged
    # ------------------------------------------------------------
    manifest = {'Manifest__Document': '9999_D01', 'Manifest__Revision': 'A', 'Manifest__Files': ['Document__Sheet__.json']}
    body = json_bytes(manifest)
    r = put('9999_D01/Document__Manifest__.json', body)
    answer = r.get_json()
    check('a manifest is written: status ok, unchanged false, its size and SHA-256', r.status_code == 200 and answer['status'] == 'ok' and answer['unchanged'] is False and answer['bytes'] == len(body) and answer['sha256'] == hashlib.sha256(body).hexdigest() and answer['path'] == '9999_D01/Document__Manifest__.json', answer)
    manifest_path = os.path.join(root, '9999_D01', 'Document__Manifest__.json')
    check('...the bytes on disk are exactly the bytes sent, the folders made on the way', read(manifest_path) == body)
    stamp = os.stat(manifest_path).st_mtime_ns
    r = put('9999_D01/Document__Manifest__.json', body)
    check('the same bytes again answer unchanged true and the file is not rewritten', r.status_code == 200 and r.get_json()['unchanged'] is True and os.stat(manifest_path).st_mtime_ns == stamp, r.get_json())
    r = put('9999_D01/03__Viewports__Raster/Viewport_001__Tier01__Fit__0123456789.webp', webp('t1'), method='put')
    check('PUT writes too (a WebP tier, two folders deep)', r.status_code == 200 and read(os.path.join(root, '9999_D01', '03__Viewports__Raster', 'Viewport_001__Tier01__Fit__0123456789.webp')) == webp('t1'), r.get_json())
    good = {'9999_D01/02__Viewports__Vector/Viewport_001__Linework__0123456789.svg': SVG,
            '9999_D01/03__Viewports__Raster/Viewport_001__Print__0123456789.png': png('print'),
            '9999_D01/Document__Print__0123456789.pdf': PDF,
            '9999_D01/Document__Sheet__.json': json_bytes({'Sheet__Id': '9999_D01'}),
            '9999_D01/Notes__.md': b'# Notes\n',
            '9999_D01/Archive__ReadMe__.note': b'kept for the record\n'}
    answers = [put(path, data).status_code for path, data in good.items()]
    check('an SVG, a PNG, a PDF, a JSON, a .md and a .note whose bytes are what they say are written', answers == [200] * 6 and all(read(os.path.join(root, *path.split('/'))) == data for path, data in good.items()), answers)

    wrong = {'9999_D05/a.png': webp('x'), '9999_D05/b.webp': png('x'), '9999_D05/c.pdf': b'%PD not a pdf',
             '9999_D05/d.json': b'{ not json', '9999_D05/e.svg': b'GIF89a not an svg', '9999_D05/f.json': b'\xff\xfe\x00{'}
    answers = [put(path, data).status_code for path, data in wrong.items()]
    check('bytes that are not what the extension says are refused (400)', answers == [400] * 6, answers)
    check('...and nothing of them is written', not os.path.exists(os.path.join(root, '9999_D05')))
    r = put('9999_D05/Document__Manifest__.json', b'')
    check('a request with no bytes is refused (400)', r.status_code == 400 and not os.path.exists(os.path.join(root, '9999_D05')), r.get_json())
    api.MAX_FILE_BYTES = 64
    r = put('9999_D05/Big__.json', json_bytes({'pad': 'x' * 80}))
    api.MAX_FILE_BYTES = real_cap
    check('a file over the size cap is refused (413) and not written (cap read at call time)', r.status_code == 413 and not os.path.exists(os.path.join(root, '9999_D05')), r.get_json())

    # PATHS | the fence on every write and read
    # ------------------------------------------------------------
    refused = ['..', '../Escape__.json', '9999_D01/../../Escape__.json', '9999_D01/..', './9999_D01/a.json',
               '00__Archive__Revisions/9999_D01__Revision__Z.json', '00__Archive__Revisions/Archive__ReadMe__.note',
               '9999_D01/Run.exe', '9999_D01/Page.html', '9999_D01/Notes.txt', '9999_D01/NoExtension',
               'a/b/c/d/e/f/g.json', '_Hidden/a.json', '-Dash/a.json', '.Dot/a.json', 'Space Name/a.json',
               '9999_D01/a b.json', 'C:/Escape__.json', '9999_D01\\..\\..\\Escape__.json', '9999_D01/%2E%2E/a.json']
    answers = {path: put(path, json_bytes({'x': 1})).status_code for path in refused}
    check('"..", the archive folder, a bad extension, a seventh segment and every other bad segment are refused (400)', set(answers.values()) == {400}, answers)
    check('...and the archive folder was never made by a write', not os.path.exists(archive))
    r = put('a/b/c/d/e/Six__.json', json_bytes({'deep': 6}))
    check('six segments - TrueVision\'s limit - are accepted', r.status_code == 200 and os.path.isfile(os.path.join(root, 'a', 'b', 'c', 'd', 'e', 'Six__.json')), r.get_json())
    check('nothing was written outside the published folder or above it', sorted(os.listdir(tmp)) == ['Projects'] and sorted(os.listdir(project)) == ['06__Layout__PublishedDocuments', 'project.json'], (os.listdir(tmp), os.listdir(project)))

    # READS | a JSON file back, and a real 404 for one not published
    # ------------------------------------------------------------
    r = client.get(ROUTE + '/file?' + q + '&path=9999_D01/Document__Manifest__.json')
    check('GET file answers the manifest as JSON', r.status_code == 200 and r.get_json() == {'status': 'ok', 'path': '9999_D01/Document__Manifest__.json', 'json': manifest}, r.get_json())
    r = client.get(ROUTE + '/file?' + q + '&path=9999_D07/Document__Manifest__.json')
    check('GET file of a manifest not published is a real 404 with a JSON answer, never a page', r.status_code == 404 and r.is_json and r.get_json() == {'error': 'Not published: 9999_D07/Document__Manifest__.json'}, (r.status_code, r.data[:120]))
    answers = [client.get(ROUTE + '/file?' + q + '&path=' + path).status_code for path in
               ('9999_D01/03__Viewports__Raster/Viewport_001__Tier01__Fit__0123456789.webp', '00__Archive__Revisions/x.json', '../project.json', '')]
    check('GET file refuses a picture, the archive, ".." and no path (400): it reads JSON only', answers == [400, 400, 400, 400], answers)

    # ARCHIVE | a revision change zipped whole, never written over
    # ------------------------------------------------------------
    d02 = {'9999_D02/Document__Manifest__.json': json_bytes({'Manifest__Document': '9999_D02', 'Manifest__Revision': 'A'}),
           '9999_D02/Document__Sheet__.json': json_bytes({'Sheet__Id': '9999_D02'}),
           '9999_D02/01__Elements__Data/Elements__Text__.json': json_bytes({'Text': ['FRONT ELEVATION']}),
           '9999_D02/03__Viewports__Raster/Viewport_001__Tier02__Read__abcdef0123.webp': webp('d02')}
    for path, data in d02.items():
        put(path, data)
    r = client.post(ROUTE + '/archive?' + q + '&document=9999_D02&revision=A')
    answer = r.get_json()
    first_zip = os.path.join(archive, '9999_D02__Revision__A.zip')
    check('archive zips the document folder into 00__Archive__Revisions/<document>__Revision__<old>.zip', r.status_code == 200 and answer['archived'] == '00__Archive__Revisions/9999_D02__Revision__A.zip' and answer['files'] == 4 and os.path.isfile(first_zip), answer)
    with zipfile.ZipFile(first_zip) as bundle:
        names = sorted(bundle.namelist())
        same = all(bundle.read(path.split('/', 1)[1]) == data for path, data in d02.items())
    check('...the zip holds every file of the document, by its path inside the document, byte for byte', names == sorted(path.split('/', 1)[1] for path in d02) and same, names)
    check('...the document folder is removed so the new revision is built clean; other documents untouched', not os.path.exists(os.path.join(root, '9999_D02')) and read(manifest_path) == body)
    first_bytes = read(first_zip)

    d02['9999_D02/Document__Manifest__.json'] = json_bytes({'Manifest__Document': '9999_D02', 'Manifest__Revision': 'A', 'Republished': True})
    for path, data in d02.items():
        put(path, data)
    r = client.post(ROUTE + '/archive?' + q + '&document=9999_D02&revision=A')
    answer = r.get_json()
    check('archiving the same revision again makes a second, timestamped zip', r.status_code == 200 and answer['archived'].startswith('00__Archive__Revisions/9999_D02__Revision__A__') and answer['archived'] != '00__Archive__Revisions/9999_D02__Revision__A.zip', answer)
    check('...and the first zip is never written over', read(first_zip) == first_bytes)

    class FixedClock(datetime):                                       # <-- Every archive in "one second": the stamped name is taken too
        @classmethod
        def now(cls, tz=None):
            return datetime(2026, 10, 1, 12, 0, 0, tzinfo=timezone.utc)
    api.datetime = FixedClock
    zips_before = {name: read(os.path.join(archive, name)) for name in os.listdir(archive)}
    archived = []
    for _ in range(3):
        for path, data in d02.items():
            put(path, data)
        archived.append(client.post(ROUTE + '/archive?' + q + '&document=9999_D02&revision=A').get_json().get('archived'))
    api.datetime = real_datetime
    check('archived three times in one second: the stamped name, then __02 and __03 - never an older zip',
          archived == ['00__Archive__Revisions/9999_D02__Revision__A__20261001-120000.zip',
                       '00__Archive__Revisions/9999_D02__Revision__A__20261001-120000__02.zip',
                       '00__Archive__Revisions/9999_D02__Revision__A__20261001-120000__03.zip']
          and all(read(os.path.join(archive, name)) == data for name, data in zips_before.items()), archived)

    r = client.post(ROUTE + '/archive?' + q + '&document=9999_D08&revision=A')
    check('archiving a document with nothing published answers archived null and makes nothing', r.status_code == 200 and r.get_json()['archived'] is None and not os.path.exists(os.path.join(root, '9999_D08')), r.get_json())
    answers = {document: client.post(ROUTE + '/archive?' + q + '&document=' + quote(document) + '&revision=A').status_code
               for document in ('', '9', 'ab', 'a.b', '..', 'x/y', '_x1', '00__Archive__Revisions', '00__archive__revisions')}
    check('archive refuses a document id outside TrueVision\'s pattern, and the archive folder itself (400)', set(answers.values()) == {400}, answers)
    answers = {revision: client.post(ROUTE + '/archive?' + q + '&document=9999_D01&revision=' + quote(revision)).status_code
               for revision in ('', 'A-1', 'ABCDEFGHI', '..', 'A B')}
    check('archive refuses a revision outside TrueVision\'s pattern (400)', set(answers.values()) == {400}, answers)
    check('...and every refusal left the published document and every zip as they were', read(manifest_path) == body and all(read(os.path.join(archive, name)) == data for name, data in zips_before.items()))

    # PRUNE | one document, only what its new manifest does not name
    # ------------------------------------------------------------
    d03 = {'9999_D03/Document__Manifest__.json': json_bytes({'Manifest__Document': '9999_D03'}),
           '9999_D03/03__Viewports__Raster/Viewport_001__Tier01__Fit__1111111111.webp': webp('keep'),
           '9999_D03/03__Viewports__Raster/Viewport_001__Tier01__Fit__2222222222.webp': webp('old'),
           '9999_D03/02__Viewports__Vector/Viewport_001__Linework__2222222222.svg': SVG}
    d04 = {'9999_D04/Document__Manifest__.json': json_bytes({'Manifest__Document': '9999_D04'}),
           '9999_D04/03__Viewports__Raster/Viewport_001__Tier01__Fit__2222222222.webp': webp('d04')}
    index = {'PublishedDocuments__Index__.json': json_bytes({'Index__Documents': ['9999_D01', '9999_D03', '9999_D04']})}
    for path, data in list(d03.items()) + list(d04.items()) + list(index.items()):
        put(path, data)
    in_flight = os.path.join(root, '9999_D03', '03__Viewports__Raster', 'Viewport_001__Tier02__Read__3333333333.webp.k2j3h4.tmp')
    with open(in_flight, 'wb') as handle:
        handle.write(b'half a file')
    listed = client.get(ROUTE + '/list?' + q + '&document=9999_D03').get_json()
    check('list of one document names its files with their sizes, and never a temporary file',
          listed['document'] == '9999_D03' and listed['files'] == [{'path': path, 'bytes': len(d03[path])} for path in sorted(d03)], listed)
    archive_before = {name: read(os.path.join(archive, name)) for name in os.listdir(archive)}
    keep = ['9999_D03/Document__Manifest__.json', '\\9999_D03\\03__Viewports__Raster\\Viewport_001__Tier01__Fit__1111111111.webp']
    r = client.post(ROUTE + '/prune?' + q, json={'document': '9999_D03', 'keep': keep})
    answer = r.get_json()
    check('prune removes what the document no longer names (keep paths taken with either slash)', r.status_code == 200 and sorted(answer['removed']) == ['9999_D03/02__Viewports__Vector/Viewport_001__Linework__2222222222.svg', '9999_D03/03__Viewports__Raster/Viewport_001__Tier01__Fit__2222222222.webp'], answer)
    check('...keeps what it names', os.path.isfile(os.path.join(root, '9999_D03', 'Document__Manifest__.json')) and os.path.isfile(os.path.join(root, '9999_D03', '03__Viewports__Raster', 'Viewport_001__Tier01__Fit__1111111111.webp')))
    check('...never touches a temporary file still being written', os.path.isfile(in_flight))
    check('...removes the folders it emptied and keeps the document folder', not os.path.exists(os.path.join(root, '9999_D03', '02__Viewports__Vector')) and os.path.isdir(os.path.join(root, '9999_D03')))
    check('...and touches no other document, no root file and no archive', all(read(os.path.join(root, *path.split('/'))) == data for path, data in list(d04.items()) + list(index.items())) and read(manifest_path) == body and {name: read(os.path.join(archive, name)) for name in os.listdir(archive)} == archive_before)
    os.remove(in_flight)

    answers = {
        'keep not a list'        : client.post(ROUTE + '/prune?' + q, json={'document': '9999_D04', 'keep': '9999_D04/x.json'}).status_code,
        'keep with a non-string' : client.post(ROUTE + '/prune?' + q, json={'document': '9999_D04', 'keep': [1]}).status_code,
        'no keep'                : client.post(ROUTE + '/prune?' + q, json={'document': '9999_D04'}).status_code,
        'bad document'           : client.post(ROUTE + '/prune?' + q, json={'document': '../9999_D04', 'keep': []}).status_code,
        'the archive folder'     : client.post(ROUTE + '/prune?' + q, json={'document': '00__Archive__Revisions', 'keep': []}).status_code,
        'archive, by query'      : client.post(ROUTE + '/prune?' + q + '&document=00__Archive__Revisions', json={'keep': []}).status_code,
        'a body that is a list'  : client.post(ROUTE + '/prune?' + q, json=['9999_D04']).status_code,
        'a body that is no JSON' : client.post(ROUTE + '/prune?' + q, data='keep', content_type='text/plain').status_code,
    }
    check('prune refuses a keep that is not a list of paths, a bad document id and the archive folder (400, never a server error)', set(answers.values()) == {400}, answers)
    check('...and every zip and the other document are still there, byte for byte', {name: read(os.path.join(archive, name)) for name in os.listdir(archive)} == archive_before and all(read(os.path.join(root, *path.split('/'))) == data for path, data in d04.items()))
    r = client.post(ROUTE + '/prune?' + q, json={'document': '9999_D09', 'keep': []})
    check('pruning a document never published removes nothing', r.status_code == 200 and r.get_json() == {'status': 'ok', 'removed': []}, r.get_json())

    # LISTS | the whole root, one document, and a refused document id
    # ------------------------------------------------------------
    listed = client.get(ROUTE + '/list?' + q).get_json()
    paths = [entry['path'] for entry in listed['files']]
    check('list of the root names every published file, the root index and the archive, sorted, and no temporary file', paths == sorted(paths) and 'PublishedDocuments__Index__.json' in paths and '9999_D04/Document__Manifest__.json' in paths and any(path.startswith('00__Archive__Revisions/') for path in paths) and not any(path.endswith(('.tmp', '.writing', '.copying')) for path in paths), paths)
    r = client.get(ROUTE + '/list?' + q + '&document=..')
    check('list refuses a document id outside the pattern (400)', r.status_code == 400, r.get_json())

    # PROJECTS | named by folder and year or by folder-id; the refusals make nothing
    # ------------------------------------------------------------
    r = client.get(ROUTE + '/list?folder-id=2026/' + PROJECT + '&document=9999_D04')
    check('folder-id=YYYY/Folder names the project too', r.status_code == 200 and [entry['path'] for entry in r.get_json()['files']] == sorted(d04), r.get_json())
    spaced = os.path.join(projects, '2025', 'FN-0001__Space Test 01')
    os.makedirs(spaced)
    r = put('FN-0001_D01/Document__Manifest__.json', json_bytes({'Manifest__Document': 'FN-0001_D01'}), query='folder-id=' + quote('2025/FN-0001__Space Test 01', safe='/'))
    check('a project folder name with a space takes a published file', r.status_code == 200 and os.path.isfile(os.path.join(spaced, '06__Layout__PublishedDocuments', 'FN-0001_D01', 'Document__Manifest__.json')), r.get_json())
    r = client.get(ROUTE + '/list?project-folder=' + quote('FN-0001__Space Test 01') + '&year=2025')
    check('...and lists it by project-folder and year', r.status_code == 200 and [entry['path'] for entry in r.get_json()['files']] == ['FN-0001_D01/Document__Manifest__.json'], r.get_json())
    before = every_file(tmp)
    statuses = [
        client.get(ROUTE + '/list?project-folder=' + PROJECT + '&year=26').status_code,
        put('9999_D01/x.json', json_bytes({'x': 1}), query='project-folder=0000__NoSuchProject&year=2026').status_code,
        put('9999_D01/x.json', json_bytes({'x': 1}), query='project-folder=..&year=2026').status_code,
        put('9999_D01/x.json', json_bytes({'x': 1}), query='folder-id=2026/..').status_code,
        client.post(ROUTE + '/archive?folder-id=2026/../2026/' + PROJECT + '&document=9999_D01&revision=A').status_code,
        client.post(ROUTE + '/prune?project-folder=' + PROJECT + '&year=', json={'document': '9999_D01', 'keep': []}).status_code,
        client.get(ROUTE + '/file?path=9999_D01/Document__Manifest__.json').status_code,
    ]
    check('a 2-digit year, a project that is not there, a ".." folder and no project at all are refused (404)', statuses == [404] * 7, statuses)
    check('...and make no folder and touch no file', every_file(tmp) == before and not os.path.exists(os.path.join(projects, '2026', '0000__NoSuchProject')))

    # WHAT IS LEFT | only the published folder ever written, no temporary file anywhere
    # ------------------------------------------------------------
    outside = [path for path in every_file(project) if path != 'project.json' and not path.startswith('06__Layout__PublishedDocuments/')]
    check('writes land only in the published folder (the project folder holds nothing else new)', outside == [], outside)
    check('no temporary file is left anywhere', [path for path in every_file(tmp) if path.endswith(('.tmp', '.writing', '.copying'))] == [], every_file(tmp))

    # SERVER.PY | the routes as the real server serves them
    # ------------------------------------------------------------
    import server as srv                                              # noqa: E402  (the same blueprint and library modules)
    rules = {}
    for rule in srv.app.url_map.iter_rules():
        rules.setdefault(str(rule), set()).update(rule.methods)
    wanted = {ROUTE + '/file': {'GET', 'POST', 'PUT'}, ROUTE + '/list': {'GET'}, ROUTE + '/archive': {'POST'}, ROUTE + '/prune': {'POST'}}
    check('server.py serves the four published routes with their methods', all(path in rules and methods <= rules[path] for path, methods in wanted.items()), {path: sorted(rules.get(path, ())) for path in wanted})
    real_client = srv.app.test_client()
    r = real_client.get(ROUTE + '/file?' + q + '&path=9999_D07/Document__Manifest__.json')
    check('...its GET file answers the blueprint\'s own 404 for a manifest not published (not the JSON 404 for unknown routes)', r.status_code == 404 and r.get_json() == {'error': 'Not published: 9999_D07/Document__Manifest__.json'}, r.get_json())
    r = real_client.get(ROUTE + '/list?' + q + '&document=9999_D04')
    check('...and its list answers from the Projects folder', r.status_code == 200 and [entry['path'] for entry in r.get_json()['files']] == sorted(d04), r.get_json())
    r = real_client.get('/Whitecardopedia/Projects/2026/0000__NoSuchProject__W019/06__Layout__PublishedDocuments/9999_D01/03__Viewports__Raster/Viewport_001__Tier01__Fit__0123456789.webp')
    check('a published file that is not there, read the way the reader reads it on localhost (/Whitecardopedia/Projects/...), is a JSON 404, never the index page', r.status_code == 404 and r.is_json, (r.status_code, r.content_type))
finally:
    api.datetime = real_datetime
    api.MAX_FILE_BYTES = real_cap
    lib.PROJECTS_ROOT = real_projects
    shutil.rmtree(tmp, ignore_errors=True)
check('the Projects folder is pointed back at Whitecardopedia/Projects', lib.PROJECTS_ROOT == real_projects)

print('FAILURES:', failures)
sys.exit(1 if failures else 0)
