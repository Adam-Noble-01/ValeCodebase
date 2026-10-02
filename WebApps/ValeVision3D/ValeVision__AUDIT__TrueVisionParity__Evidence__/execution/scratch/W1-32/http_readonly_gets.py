# W1-32 scratch: read-only GETs on Adam's running Flask server - served bytes equal the files on disk.
import hashlib
import os
import urllib.request

BASE = 'http://localhost:8000'
VV   = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
FILES = [
    '02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js',
    '02__Src__AppModules/51__System__LayoutEditor/55__Feature__Scrapbook/Na__LayoutEditor__Panel__Scrapbook__.js',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json',
    '02__Src__AppModules/51__System__LayoutEditor/31__System__DocumentKeys/Na__LayoutEditor__DocumentKeys__.js',
    '02__Src__AppModules/03__AppUtils/Na__AppUtils__KeyScope__.js',
]


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, method='GET'), timeout=10) as response:
        return response.status, response.headers.get('Content-Type'), response.read()


status, ctype, body = get(BASE + '/api/check-localhost')
print('/api/check-localhost', status, ctype, body[:80])
for rel in FILES:
    status, ctype, body = get(BASE + '/ValeVision3D/' + rel)
    with open(os.path.join(VV, rel.replace('/', os.sep)), 'rb') as f:
        disk = f.read()
    print('%-104s %s %-28s served=disk %s' % (rel, status, ctype, hashlib.sha1(body).hexdigest() == hashlib.sha1(disk).hexdigest()))
