"""
W0-18 scratch: prove the candidate server.py compiles, imports and runs its __main__ block in a separate process
exactly as `python server.py` would (Flask.run stubbed, nothing listens), with the two new blueprints importable,
then smoke the new and the old routes through the test client against temporary folders. Nothing real is written.
Usage: python validate_candidate.py [candidate_server.py] [--blueprints candidate|wcp]
"""
import os
import sys
import json
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

import Server__ValeVisionSheetImages__Api__ as sheet_api      # noqa: E402  (the modules server.py imported)
import Server__ValeVisionUserConfig__Api__ as user_api         # noqa: E402
for module in (sheet_api, user_api):
    print('blueprint module from', module.__file__)
    expected_dir = os.path.join(HERE, 'candidate') if source_of_blueprints == 'candidate' else WCP
    assert os.path.normcase(os.path.dirname(module.__file__)) == os.path.normcase(expected_dir), module.__file__

app = namespace['app']
lib = namespace['vv_shared']
rules = {}
for rule in app.url_map.iter_rules():
    rules.setdefault(str(rule), set()).update(rule.methods)
for wanted in ('/api/health', '/api/<path:rest>', '/api/check-localhost', '/api/projects/<path:folder_id>/drawings-fingerprint',
               '/api/projects/<path:folder_id>/files/<name>', '/api/valevision/scrapbook',
               '/api/valevision/sheet-images/list', '/api/valevision/sheet-images/upload',
               '/api/valevision/sheet-images/reconcile', '/api/valevision/user-config/spellings'):
    assert wanted in rules, wanted
assert {'POST', 'PUT'} <= rules['/api/valevision/sheet-images/upload']
assert {'GET', 'POST'} <= rules['/api/valevision/user-config/spellings']
print('routes present:', len(rules))

real_projects, real_backups, real_user = lib.PROJECTS_ROOT, lib.PROJECT_BACKUP_ROOT, user_api.USER_CONFIG_DIR
shipped = os.path.join(real_user, user_api.SPELLINGS_FILE_NAME)
shipped_hash = hashlib.sha1(open(shipped, 'rb').read()).hexdigest() if os.path.exists(shipped) else None
base = tempfile.mkdtemp(prefix='w018_validate_')
try:
    lib.PROJECTS_ROOT       = os.path.join(base, 'Projects')
    lib.PROJECT_BACKUP_ROOT = os.path.join(base, 'Backups')
    user_api.USER_CONFIG_DIR = os.path.join(base, 'UserConfig')
    os.makedirs(user_api.USER_CONFIG_DIR)
    source_dictionary = shipped if os.path.exists(shipped) else os.path.join(HERE, 'candidate', user_api.SPELLINGS_FILE_NAME)
    shutil.copyfile(source_dictionary, os.path.join(user_api.USER_CONFIG_DIR, user_api.SPELLINGS_FILE_NAME))
    os.makedirs(os.path.join(lib.PROJECTS_ROOT, '2026', '1234__Smoke'))
    with open(os.path.join(lib.PROJECTS_ROOT, '2026', '1234__Smoke', 'project.json'), 'w', encoding='utf-8') as handle:
        json.dump({'projectName': 'Smoke', 'projectCode': '1234'}, handle)
    client = app.test_client()
    assert client.get('/api/check-localhost').status_code == 200
    assert client.get('/api/health').get_json()['service'] == 'whitecardopedia-local-dev'
    assert client.get('/api/nope').status_code == 404 and client.get('/api/nope').is_json
    assert client.get('/api/projects/2026/1234__Smoke').get_json()['projectName'] == 'Smoke'
    assert client.get('/api/projects/2026/1234__Smoke/drawings-fingerprint').get_json()['drawings'] == {'savedIso': None, 'digest': None}
    answer = client.get('/api/valevision/sheet-images/list?folder-id=2026/1234__Smoke').get_json()
    assert answer == {'status': 'ok', 'root': '05__Layout__DrawingDocs__Images', 'exists': False, 'entries': []}, answer
    assert not os.path.exists(os.path.join(lib.PROJECTS_ROOT, '2026', '1234__Smoke', '05__Layout__DrawingDocs__Images'))
    assert client.get('/api/valevision/sheet-images/list?project-folder=..&year=2026').status_code == 404
    png = b'\x89PNG\r\n\x1a\n' + b'1' * 40
    name = 'Smoke__' + hashlib.sha256(png).hexdigest()[:10] + '.png'
    answer = client.put('/api/valevision/sheet-images/upload?project-folder=1234__Smoke&year=2026&folder=1234_D01&name=' + name, data=png)
    assert answer.status_code == 200 and answer.get_json()['created'] is True, answer.get_json()
    answer = client.post('/api/valevision/sheet-images/reconcile?folder-id=2026/1234__Smoke', json={'keep': [], 'archive': True}).get_json()
    assert answer['archived'] == ['1234_D01/' + name] and answer['removedFolders'] == ['1234_D01'], answer
    answer = client.get('/api/valevision/user-config/spellings')
    body = answer.get_json()
    assert answer.status_code == 200 and body['status'] == 'ok' and body['writable'] is True and isinstance(body['document'], dict), body.get('status')
    answer = client.post('/api/valevision/user-config/spellings', json={'action': 'add', 'word': 'Smokeboard'})
    assert answer.status_code == 200 and answer.get_json()['added'] is True, answer.get_json()
    assert client.post('/api/valevision/user-config/spellings', json={'action': 'remove', 'word': 'smokeboard'}).get_json()['removed'] == 1
    assert client.post('/api/valevision/user-config/spellings', json={'action': 'add', 'word': 'two words'}).status_code == 400
    print('smoke routes OK')                                   # <-- The scrapbook blueprint is not called: its GET may rewrite the real index
finally:
    lib.PROJECTS_ROOT, lib.PROJECT_BACKUP_ROOT, user_api.USER_CONFIG_DIR = real_projects, real_backups, real_user
    shutil.rmtree(base, ignore_errors=True)
if shipped_hash:
    assert hashlib.sha1(open(shipped, 'rb').read()).hexdigest() == shipped_hash, 'the shipped dictionary changed'
print('VALIDATED', candidate, 'with blueprints from', source_of_blueprints)
