"""
W0-19 scratch: prove the candidate server.py compiles, imports and runs its __main__ block in a separate process
exactly as `python server.py` would (Flask.run stubbed, nothing listens), with the two new blueprints importable,
then smoke the new and the old routes through the test client against temporary folders. Nothing real is written.
Usage: python validate_candidate.py [candidate_server.py] [--blueprints candidate|wcp]
"""
import os
import sys
import json
import base64
import shutil
import hashlib
import tempfile

sys.dont_write_bytecode = True
WCP     = r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia'
HERE    = os.path.dirname(os.path.abspath(__file__))
BUNDLED = os.path.join(WCP, 'src', 'ThirdParty__VersionLockedDependencies', 'SERVER__FlaskServerDepencies')
source_of_blueprints = sys.argv[sys.argv.index('--blueprints') + 1] if '--blueprints' in sys.argv else 'candidate'
sys.path.insert(0, BUNDLED)
sys.path.insert(0, WCP)                                       # <-- As sys.path[0] is the script folder for `python server.py`
if source_of_blueprints == 'candidate':
    sys.path.insert(0, os.path.join(HERE, 'candidate'))       # <-- The blueprints are not in WCP yet

import flask                                                  # noqa: E402  (the bundled copy, as server.py inserts it first)
print('flask from', os.path.dirname(flask.__file__))

calls = []
flask.Flask.run = lambda self, *args, **kwargs: calls.append(kwargs)

positional = [arg for arg in sys.argv[1:] if not arg.startswith('--') and arg not in ('candidate', 'wcp')]
candidate = os.path.join(HERE, positional[0] if positional else 'candidate_server.py')
source    = open(candidate, 'rb').read()
code      = compile(source, os.path.join(WCP, 'server.py'), 'exec')
namespace = {'__name__': '__main__', '__file__': os.path.join(WCP, 'server.py'), '__builtins__': __builtins__}
exec(code, namespace)
assert calls == [{'host': '127.0.0.1', 'port': 8000, 'debug': True}], calls
print('__main__ block ran; app.run called with', calls[0])

import Server__ValeVisionPublished__Api__ as published_api    # noqa: E402  (the modules server.py imported)
import Server__ValeVisionStatements__Api__ as statements_api  # noqa: E402
for module in (published_api, statements_api):
    print('blueprint module from', module.__file__)
    expected_dir = os.path.join(HERE, 'candidate') if source_of_blueprints == 'candidate' else WCP
    assert os.path.normcase(os.path.dirname(module.__file__)) == os.path.normcase(expected_dir), module.__file__

app = namespace['app']
lib = namespace['vv_shared']
rules = {}
for rule in app.url_map.iter_rules():
    rules.setdefault(str(rule), set()).update(rule.methods)
for wanted in ('/api/health', '/api/<path:rest>', '/api/check-localhost', '/api/editor-config', '/api/projects/<path:folder_id>/drawings-fingerprint',
               '/api/projects/<path:folder_id>/files/<name>', '/api/valevision/scrapbook',
               '/api/valevision/sheet-images/list', '/api/valevision/sheet-images/upload', '/api/valevision/sheet-images/reconcile',
               '/api/valevision/user-config/spellings',
               '/api/valevision/published/file', '/api/valevision/published/list', '/api/valevision/published/archive', '/api/valevision/published/prune',
               '/api/valevision/statements/tree', '/api/valevision/statements/file', '/api/valevision/statements/image',
               '/api/valevision/statements/folder', '/api/valevision/statements/move', '/api/valevision/statements/delete'):
    assert wanted in rules, wanted
assert {'GET', 'POST', 'PUT'} <= rules['/api/valevision/published/file'], rules['/api/valevision/published/file']
assert {'GET', 'POST'} <= rules['/api/valevision/statements/file'], rules['/api/valevision/statements/file']
assert {'POST'} <= rules['/api/valevision/published/archive'] and {'POST'} <= rules['/api/valevision/statements/delete']
print('routes present:', len(rules))

real_projects, real_backups = lib.PROJECTS_ROOT, lib.PROJECT_BACKUP_ROOT
base = tempfile.mkdtemp(prefix='w019_validate_')
try:
    lib.PROJECTS_ROOT       = os.path.join(base, 'Projects')
    lib.PROJECT_BACKUP_ROOT = os.path.join(base, 'Backups')
    project = os.path.join(lib.PROJECTS_ROOT, '2026', '1234__Smoke')
    os.makedirs(project)
    with open(os.path.join(project, 'project.json'), 'w', encoding='utf-8') as handle:
        json.dump({'projectName': 'Smoke', 'projectCode': '1234'}, handle)
    client = app.test_client()
    # THE ROUTES SERVER.PY ALREADY HAD
    assert client.get('/api/check-localhost').status_code == 200
    assert client.get('/api/health').get_json()['service'] == 'whitecardopedia-local-dev'
    assert client.get('/api/nope').status_code == 404 and client.get('/api/nope').is_json
    assert client.get('/api/projects/2026/1234__Smoke').get_json()['projectName'] == 'Smoke'
    assert client.get('/api/projects/2026/1234__Smoke/drawings-fingerprint').get_json()['drawings'] == {'savedIso': None, 'digest': None}
    assert client.get('/api/projects/2026/..').status_code == 400
    answer = client.get('/api/valevision/sheet-images/list?folder-id=2026/1234__Smoke').get_json()
    assert answer == {'status': 'ok', 'root': '05__Layout__DrawingDocs__Images', 'exists': False, 'entries': []}, answer
    answer = client.get('/api/valevision/user-config/spellings')
    assert answer.status_code == 200 and answer.get_json()['status'] == 'ok', answer.status_code      # <-- Read only: the real dictionary is never written here
    # PUBLISHED DOCUMENTS
    q = 'folder-id=2026/1234__Smoke'
    answer = client.get('/api/valevision/published/list?' + q).get_json()
    assert answer == {'status': 'ok', 'root': '06__Layout__PublishedDocuments', 'document': None, 'files': []}, answer
    assert not os.path.exists(os.path.join(project, '06__Layout__PublishedDocuments'))
    manifest = json.dumps({'Manifest__Document': '1234_D01'}).encode('utf-8')
    answer = client.post('/api/valevision/published/file?' + q + '&path=1234_D01/Document__Manifest__.json', data=manifest, content_type='application/octet-stream')
    assert answer.status_code == 200 and answer.get_json()['unchanged'] is False, answer.get_json()
    assert client.get('/api/valevision/published/file?' + q + '&path=1234_D01/Document__Manifest__.json').get_json()['json'] == {'Manifest__Document': '1234_D01'}
    missing = client.get('/api/valevision/published/file?' + q + '&path=1234_D02/Document__Manifest__.json')
    assert missing.status_code == 404 and missing.get_json() == {'error': 'Not published: 1234_D02/Document__Manifest__.json'}, missing.get_json()
    assert client.put('/api/valevision/published/file?' + q + '&path=00__Archive__Revisions/x.json', data=manifest).status_code == 400
    answer = client.post('/api/valevision/published/archive?' + q + '&document=1234_D01&revision=A').get_json()
    assert answer['archived'] == '00__Archive__Revisions/1234_D01__Revision__A.zip' and answer['files'] == 1, answer
    assert client.post('/api/valevision/published/prune?' + q, json={'document': '00__Archive__Revisions', 'keep': []}).status_code == 400
    assert client.post('/api/valevision/published/prune?' + q, json={'document': '1234_D01', 'keep': []}).get_json() == {'status': 'ok', 'removed': []}
    # STATEMENTS
    answer = client.get('/api/valevision/statements/tree?' + q).get_json()
    assert answer == {'status': 'ok', 'root': '10__StatementDocs', 'exists': False, 'entries': []}, answer
    assert client.post('/api/valevision/statements/file?' + q, json={'path': '01__Smoke/1234_S01__Smoke__.md', 'text': '# Smoke\r\n'}).status_code == 200
    read = client.get('/api/valevision/statements/file?' + q + '&path=01__Smoke/1234_S01__Smoke__.md')
    assert read.status_code == 200 and read.data == b'# Smoke\r\n' and read.headers.get('Last-Modified') and read.headers.get('Cache-Control') == 'no-store', read.headers
    missing = client.get('/api/valevision/statements/file?' + q + '&path=01__Smoke/Missing.md')
    assert missing.status_code == 404 and missing.get_json()['missing'] is True
    png = base64.b64encode(b'\x89PNG\r\n\x1a\n' + b'1' * 40).decode('ascii')
    first = client.post('/api/valevision/statements/image?' + q, json={'path': '01__Smoke/Site.png', 'dataBase64': png}).get_json()
    second = client.post('/api/valevision/statements/image?' + q, json={'path': '01__Smoke/Site.png', 'dataBase64': png}).get_json()
    assert first['path'] == '01__Smoke/Site.png' and second['path'] == '01__Smoke/Site__02.png' and second['renamed'] is True, (first, second)
    assert client.post('/api/valevision/statements/folder?' + q, json={'path': '02__Smoke'}).status_code == 200
    assert client.post('/api/valevision/statements/move?' + q, json={'from': '02__Smoke', 'to': '03__Smoke'}).status_code == 200
    assert client.post('/api/valevision/statements/delete?' + q, json={'path': '03__Smoke'}).status_code == 400
    answer = client.post('/api/valevision/statements/delete?' + q, json={'path': '03__Smoke', 'confirm': '03__Smoke'}).get_json()
    assert answer['deleted'] == '03__Smoke' and answer['quarantined'].startswith('00__Deleted__Quarantine/'), answer
    assert os.path.isdir(os.path.join(project, '10__StatementDocs', *answer['quarantined'].split('/')))
    assert client.post('/api/valevision/statements/file?' + q, json={'path': '../escape.md', 'text': 'x'}).status_code == 400
    assert client.get('/api/valevision/statements/tree?project-folder=..&year=2026').status_code == 404
    print('smoke routes OK')                                   # <-- The scrapbook blueprint is not called: its GET may rewrite the real index
finally:
    lib.PROJECTS_ROOT, lib.PROJECT_BACKUP_ROOT = real_projects, real_backups
    shutil.rmtree(base, ignore_errors=True)
print('VALIDATED', candidate, 'with blueprints from', source_of_blueprints, 'sha1', hashlib.sha1(source).hexdigest()[:8])
