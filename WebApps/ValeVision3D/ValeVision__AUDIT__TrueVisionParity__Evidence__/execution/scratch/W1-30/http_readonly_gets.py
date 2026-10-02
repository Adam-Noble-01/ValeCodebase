# Read-only GETs on Adam's running Flask server (no writes, no restarts):
# the server answers, and both new files are served byte-for-byte as on disk.
import urllib.request, hashlib, os

VV_ROOT = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
BASE    = 'http://localhost:8000'
REL     = '02__Src__AppModules/51__System__LayoutEditor/31__System__DocumentKeys/'

def get(url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'Cache-Control': 'no-cache'}), timeout=15) as r:
            return r.status, r.headers.get('Content-Type'), r.read()
    except Exception as error:
        return 'ERR', str(error), b''

status, ctype, body = get(BASE + '/api/check-localhost')
print('/api/check-localhost', status, ctype, body[:120])

for name in ('Na__Hotkeys__DocumentTabs__.json', 'Na__LayoutEditor__DocumentKeys__.js', '../../03__AppUtils/Na__AppUtils__KeyScope__.js'):
    url = BASE + '/ValeVision3D/' + REL + name
    status, ctype, body = get(url)
    disk_path = os.path.normpath(os.path.join(VV_ROOT, *REL.split('/'), *name.split('/')))
    with open(disk_path, 'rb') as f:
        disk = f.read()
    print(name, status, ctype, len(body), 'bytes', 'served == disk:', body == disk, hashlib.sha1(body).hexdigest()[:8])
