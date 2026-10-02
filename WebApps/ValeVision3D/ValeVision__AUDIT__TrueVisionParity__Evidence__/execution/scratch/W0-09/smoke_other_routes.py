# W0-09 scratch: the existing routes that now pass through the request guard still answer as before
# (no route that writes the master config is called with a valid body).
import os
import sys
import json
import types
import shutil
import tempfile

sys.dont_write_bytecode = True
WCP     = r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia'
HERE    = os.path.dirname(os.path.abspath(__file__))
BUNDLED = os.path.join(WCP, 'src', 'ThirdParty__VersionLockedDependencies', 'SERVER__FlaskServerDepencies')
sys.path.insert(0, BUNDLED)
sys.path.insert(0, WCP)
module = types.ModuleType('server')
module.__file__ = os.path.join(WCP, 'server.py')
sys.modules['server'] = module
exec(compile(open(os.path.join(HERE, sys.argv[1] if len(sys.argv) > 1 else 'candidate_server.py'), 'rb').read(), module.__file__, 'exec'), module.__dict__)
lib = module.vv_shared

base = tempfile.mkdtemp(prefix='w009_smoke_')
real = lib.PROJECTS_ROOT, lib.PROJECT_BACKUP_ROOT
try:
    lib.PROJECTS_ROOT = os.path.join(base, 'Projects')
    lib.PROJECT_BACKUP_ROOT = os.path.join(base, 'Backups')
    os.makedirs(os.path.join(lib.PROJECTS_ROOT, '2026', '1234__Smoke'))
    with open(os.path.join(lib.PROJECTS_ROOT, '2026', '1234__Smoke', 'project.json'), 'w', encoding='utf-8') as handle:
        json.dump({'projectName': 'Smoke', 'projectCode': '1234'}, handle)
    client = module.app.test_client()
    results = {}
    results['discover'] = client.get('/api/projects/discover').get_json()
    results['assets bad path'] = (lambda a: (a.status_code, a.get_json()))(client.post('/api/projects/2026/1234__Smoke/assets', data={'path': '../x.png'}))
    results['assets escaping id'] = (lambda a: (a.status_code, a.get_json()))(client.post('/api/projects/2026/../../x/assets', data={'path': 'LayoutEditor/Snapshots/a.png'}))
    results['visibility bad body'] = (lambda a: (a.status_code, a.get_json()))(client.post('/api/projects/2026/1234__Smoke/visibility', json={}))
    results['rename escaping old id'] = (lambda a: (a.status_code, a.get_json()))(client.post('/api/projects/2026/%2E%2E/%2E%2E/x/rename', json={}))
    results['rename bad body'] = (lambda a: (a.status_code, a.get_json()))(client.post('/api/projects/2026/1234__Smoke/rename', json={}))
    results['thumbnail no file'] = (lambda a: (a.status_code, a.get_json()))(client.post('/api/projects/2026/1234__Smoke/presentation-thumbnail/S01'))
    results['get project'] = client.get('/api/projects/2026/1234__Smoke').get_json()
    results['get project numeric'] = client.get('/api/projects/1234').get_json()
    results['unknown sub-route GET'] = (lambda a: (a.status_code, a.get_json()))(client.get('/api/projects/2026/1234__Smoke/no-such-route'))
    results['save missing projectCode'] = (lambda a: (a.status_code, a.get_json()))(client.post('/api/projects/2026/1234__Smoke', json={'projectName': 'x'}))
    results['save text body'] = (lambda a: (a.status_code, a.get_json()))(client.post('/api/projects/2026/1234__Smoke', data='x', content_type='text/plain'))
    results['editor-config'] = client.get('/api/editor-config').status_code
    results['refresh-status'] = client.get('/api/refresh-status').status_code
    for key, value in results.items():
        print(f'{key:28} {value}')
    print('files in the project folder:', sorted(os.listdir(os.path.join(lib.PROJECTS_ROOT, '2026', '1234__Smoke'))))
finally:
    lib.PROJECTS_ROOT, lib.PROJECT_BACKUP_ROOT = real
    shutil.rmtree(base, ignore_errors=True)
