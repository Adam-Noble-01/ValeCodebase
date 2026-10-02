# W0-09 scratch: prove the candidate server.py compiles, imports and runs its __main__ block in a
# separate process exactly as `python server.py` would, with Flask.run stubbed (nothing listens),
# then smoke its routes through the test client against a temporary Projects folder.
import os
import sys
import json
import tempfile
import shutil

sys.dont_write_bytecode = True
WCP     = r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia'
HERE    = os.path.dirname(os.path.abspath(__file__))
BUNDLED = os.path.join(WCP, 'src', 'ThirdParty__VersionLockedDependencies', 'SERVER__FlaskServerDepencies')
sys.path.insert(0, BUNDLED)
sys.path.insert(0, WCP)                                       # <-- As sys.path[0] is the script folder for `python server.py`

import flask                                                  # noqa: E402  (the bundled copy, as server.py inserts it first)
print('flask', flask.__version__ if hasattr(flask, '__version__') else '?', 'from', os.path.dirname(flask.__file__))

calls = []
flask.Flask.run = lambda self, *args, **kwargs: calls.append(kwargs)

candidate = os.path.join(HERE, sys.argv[1] if len(sys.argv) > 1 else 'candidate_server.py')
source    = open(candidate, 'rb').read()
code      = compile(source, os.path.join(WCP, 'server.py'), 'exec')
namespace = {'__name__': '__main__', '__file__': os.path.join(WCP, 'server.py'), '__builtins__': __builtins__}
exec(code, namespace)
assert calls == [{'host': '127.0.0.1', 'port': 8000, 'debug': True}], calls
print('__main__ block ran; app.run called with', calls[0])

app = namespace['app']
lib = namespace['vv_shared']
rules = sorted(str(rule) for rule in app.url_map.iter_rules())
for wanted in ('/api/health', '/api/<path:rest>', '/api/projects/<path:folder_id>/drawings-fingerprint',
               '/api/projects/<path:folder_id>/backups', '/api/projects/<path:folder_id>/files/<name>',
               '/api/projects/<path:folder_id>/drawing-notes', '/api/valevision/scrapbook', '/api/check-localhost'):
    assert wanted in rules, wanted
print('routes present:', len(rules))

real_projects, real_backups = lib.PROJECTS_ROOT, lib.PROJECT_BACKUP_ROOT
base = tempfile.mkdtemp(prefix='w009_validate_')
try:
    lib.PROJECTS_ROOT       = os.path.join(base, 'Projects')
    lib.PROJECT_BACKUP_ROOT = os.path.join(base, 'Backups')
    os.makedirs(os.path.join(lib.PROJECTS_ROOT, '2026', '1234__Smoke'))
    with open(os.path.join(lib.PROJECTS_ROOT, '2026', '1234__Smoke', 'project.json'), 'w', encoding='utf-8') as handle:
        json.dump({'projectName': 'Smoke', 'projectCode': '1234'}, handle)
    client = app.test_client()
    assert client.get('/api/check-localhost').status_code == 200
    assert client.get('/api/health').get_json()['service'] == 'whitecardopedia-local-dev'
    assert client.get('/api/nope').status_code == 404 and client.get('/api/nope').is_json
    assert client.get('/api/projects/2026/1234__Smoke/drawings-fingerprint').get_json()['drawings'] == {'savedIso': None, 'digest': None}
    assert client.get('/api/projects/2026/1234__Smoke').get_json()['projectName'] == 'Smoke'
    assert client.get('/api/projects/2026/1234__Smoke/drawing-notes').status_code == 404
    assert client.get('/api/projects/2026/%2E%2E/%2E%2E/x/drawing-notes').status_code == 400
    print('smoke routes OK')                                   # <-- The scrapbook blueprint is not called: its GET may rewrite the real index
finally:
    lib.PROJECTS_ROOT, lib.PROJECT_BACKUP_ROOT = real_projects, real_backups
    shutil.rmtree(base, ignore_errors=True)
print('VALIDATED', candidate)
