"""
W0-19 scratch: exercise Na__Test__StatementServer__.py's SERVE-mode wiring without starting a server (execution policy
1: no server is started): import the module, make the throwaway copy of 2026/3047__Doous exactly as `python
Na__Test__StatementServer__.py` would, point the library at it, build the app and drive it with Flask's test client.
The real project is only read; the copy lives in a temporary folder that is removed afterwards.
"""
import hashlib
import importlib.util
import os
import shutil
import sys
import tempfile

sys.dont_write_bytecode = True
TEST = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\80__Testing__PrototypeEnvironment\Na__Test__StatementServer__.py'
DOOUS = r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\Projects\2026\3047__Doous'

sys.argv = [TEST]                                                     # <-- No --check, no port: the module's defaults
spec = importlib.util.spec_from_file_location('statement_test_server', TEST)
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)                                       # <-- Definitions only: the __main__ block does not run

before = {name: hashlib.sha1(open(os.path.join(DOOUS, name), 'rb').read()).hexdigest() for name in os.listdir(DOOUS) if os.path.isfile(os.path.join(DOOUS, name))}
failures = 0
def check(label, ok, extra=''):
    global failures
    print(('PASS ' if ok else 'FAIL ') + label + ((' :: ' + str(extra)) if (extra and not ok) else ''))
    failures += 0 if ok else 1

check('serve-mode defaults: port 8841, project 2026/3047__Doous', server.PORT == 8841 and server.FOLDER_ID == '2026/3047__Doous' and server.CHECK is False)
temp_root = tempfile.mkdtemp(prefix='w019_serve_smoke_')
temp_projects = os.path.join(temp_root, 'Projects')
try:
    copied, linked, failed = server.make_throwaway_copy(temp_projects, server.FOLDER_ID)
    temp_project = os.path.join(temp_projects, '2026', '3047__Doous')
    check('the throwaway copy holds the project files and an empty statements folder (Doous has no statements yet)',
          os.path.isfile(os.path.join(temp_project, 'project.json')) and os.path.isdir(os.path.join(temp_project, '10__StatementDocs')) and (copied, linked, failed) == (0, 0, 0),
          (sorted(os.listdir(temp_project)), copied, linked, failed))
    server.vv_shared.PROJECTS_ROOT = temp_projects
    app = server.build_app(temp_projects, os.path.join(temp_root, '__test_output'), server.PORT)
    client = app.test_client()
    r = client.get('/api/health')
    check('/api/health answers whitecardopedia-local-dev', r.status_code == 200 and r.get_json()['service'] == 'whitecardopedia-local-dev', r.get_json())
    r = client.get('/api/projects/2026/3047__Doous')
    check('GET /api/projects/2026/3047__Doous answers the copy\'s project.json, byte for byte', r.status_code == 200 and r.data == open(os.path.join(DOOUS, 'project.json'), 'rb').read(), r.status_code)
    r = client.get('/api/valevision/statements/tree?folder-id=2026/3047__Doous')
    check('the statements tree answers from the copy (exists, empty)', r.status_code == 200 and r.get_json()['exists'] is True and r.get_json()['entries'] == [], r.get_json())
    r = client.get('/ValeVision3D/index.html')
    check('/ValeVision3D/index.html is served from the repository, uncached', r.status_code == 200 and b'<html' in r.data.lower() and r.headers.get('Cache-Control') == 'no-store, max-age=0', (r.status_code, r.headers.get('Cache-Control')))
    r = client.get('/Whitecardopedia/Projects/2026/3047__Doous/project.json')
    check('/Whitecardopedia/Projects/... reads the copy first', r.status_code == 200 and r.data == open(os.path.join(temp_project, 'project.json'), 'rb').read(), r.status_code)
    r = client.get('/Whitecardopedia/Projects/2026/3047__Doous/10__StatementDocs/01__None/None.md')
    check('...and a missing statement file there is a JSON 404', r.status_code == 404 and r.is_json, r.status_code)
    r = client.get('/api/editor-config')
    check('/api/editor-config hands out the fake key and this server as the worker', r.get_json()['apiKey'] == server.FAKE_API_KEY and r.get_json()['workerApiBaseUrl'] == 'http://127.0.0.1:8841/api/test/worker', r.get_json())
finally:
    server.vv_shared.PROJECTS_ROOT = server.REAL_PROJECTS
    shutil.rmtree(temp_root, ignore_errors=True)
after = {name: hashlib.sha1(open(os.path.join(DOOUS, name), 'rb').read()).hexdigest() for name in os.listdir(DOOUS) if os.path.isfile(os.path.join(DOOUS, name))}
check('the real project folder is byte for byte as it was, and no folder was made in it', before == after and not os.path.exists(os.path.join(DOOUS, '10__StatementDocs')))
print('FAILURES:', failures)
sys.exit(1 if failures else 0)
