# W1-29 scratch: read-only GETs on Adam's running Flask server - the two module URLs the page will request, and the
# server's health route. Proves the server serves exactly the bytes on disk. Writes http_readonly_gets.txt.
import hashlib
import os
import urllib.request

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = 'http://localhost:8000/'
URLS = [
    ('api/check-localhost', None),
    ('ValeVision3D/02__Src__AppModules/03__AppUtils/Na__AppUtils__KeyScope__.js', '02__Src__AppModules/03__AppUtils/Na__AppUtils__KeyScope__.js'),
    ('ValeVision3D/02__Src__AppModules/03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js', '02__Src__AppModules/03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js'),
    ('ValeVision3D/02__Src__AppModules/02__AppData/Na__Hotkeys__3dModelTab__.json', None),
]
lines = []
for url, rel in URLS:
    try:
        with urllib.request.urlopen(urllib.request.Request(BASE + url, method='GET'), timeout=20) as resp:
            body = resp.read()
            status = resp.status
            ctype = resp.headers.get('Content-Type')
    except urllib.error.HTTPError as error:
        body, status, ctype = b'', error.code, None
    note = ''
    if rel:
        disk = open(os.path.join(VV, *rel.split('/')), 'rb').read()
        same = body == disk or body.replace(b'\r\n', b'\n') == disk.replace(b'\r\n', b'\n')
        note = f'  served == disk: {same}  sha1 {hashlib.sha1(body).hexdigest()[:12]}'
    lines.append(f'GET /{url} -> {status} ({ctype}){note}')
open(os.path.join(HERE, 'http_readonly_gets.txt'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
print('\n'.join(lines))
