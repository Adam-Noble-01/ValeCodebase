"""W4-06 E2E bridge: WebApps/Whitecardopedia/server.py through Flask's test client, on a throwaway project.

No server is started and no port is used. The child reads one JSON request per line on stdin and
answers one JSON line on stdout. Everything it writes lands under the temporary folder given as
argv[2]: a fake Whitecardopedia root holding Projects/2026/3047__Doous (project.json and the drawing
notes copied from the real project), and a backup root.

  - The shared library's PROJECTS_ROOT and PROJECT_BACKUP_ROOT point at the temporary folder, so the
    project routes and the statements blueprint (W0-19) read and write there.
  - server.py's /Whitecardopedia/<path> route serves files from the folder of server.py's __file__;
    __file__ is pointed at the fake root, so a repository URL reads the throwaway copy too.
"""
import sys
sys.dont_write_bytecode = True
import base64
import contextlib
import json
import os
import shutil

WCP = sys.argv[1]
TMP = sys.argv[2]
BUNDLED = os.path.join(WCP, 'src', 'ThirdParty__VersionLockedDependencies', 'SERVER__FlaskServerDepencies')
if os.path.isdir(BUNDLED):
    sys.path.insert(0, BUNDLED)
sys.path.insert(0, WCP)

with contextlib.redirect_stdout(sys.stderr):
    import server as srv
    import Server__ValeVisionShared__Lib__ as lib

fake_wcp = os.path.join(TMP, 'Whitecardopedia')
projects = os.path.join(fake_wcp, 'Projects')
backups = os.path.join(TMP, 'Backups')
target = os.path.join(projects, '2026', '3047__Doous')
os.makedirs(target, exist_ok=True)
os.makedirs(backups, exist_ok=True)
source = os.path.join(WCP, 'Projects', '2026', '3047__Doous')
for name in ('project.json', 'ValeVision__DrawingNotes__.json'):
    if os.path.isfile(os.path.join(source, name)):
        shutil.copyfile(os.path.join(source, name), os.path.join(target, name))
with open(os.path.join(target, 'W4-06__ThrowawayMarker__.txt'), 'w', encoding='utf-8', newline='\n') as handle:
    handle.write('throwaway copy\n')

lib.PROJECTS_ROOT = projects
lib.PROJECT_BACKUP_ROOT = backups
srv.__file__ = os.path.join(fake_wcp, 'server.py')

client = srv.app.test_client()


def emit(message):
    sys.stdout.write('@@BRIDGE@@ ' + json.dumps(message) + chr(10))
    sys.stdout.flush()


emit({'ready': True, 'projects': projects, 'project': target, 'backups': backups})
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    request = json.loads(line)
    try:
        data = base64.b64decode(request['body']) if request.get('body') is not None else None
        with contextlib.redirect_stdout(sys.stderr):
            response = client.open(request['path'], method=request['method'], headers=request.get('headers') or {}, data=data)
        emit({'id': request['id'], 'status': response.status_code, 'headers': dict(response.headers),
              'body': base64.b64encode(response.get_data()).decode('ascii')})
        response.close()
    except Exception as error:
        emit({'id': request['id'], 'status': 599, 'headers': {}, 'body': base64.b64encode(str(error).encode('utf-8')).decode('ascii')})
