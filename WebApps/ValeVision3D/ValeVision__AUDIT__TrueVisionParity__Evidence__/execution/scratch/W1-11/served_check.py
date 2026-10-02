# W1-11 - read-only GETs on Adam's running Flask server: it answers, and serves the three landed files byte-identical to disk.
import hashlib
import os
import urllib.request

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
BASE = 'http://localhost:8000/'
FILES = [
    '02__Src__AppModules/46__System__NorthDirection/Na__North__AppConfig__.json',
    '02__Src__AppModules/46__System__NorthDirection/Na__North__CompassGizmo__.js',
    '02__Src__AppModules/46__System__NorthDirection/Na__North__DevMenu__Editor__.js',
]


def get(url):
    req = urllib.request.Request(url, headers={'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=15) as res:
        return res.status, res.read()


status, _ = get(BASE + 'api/check-localhost')
print('/api/check-localhost', status)
for rel in FILES:
    status, body = get(BASE + 'ValeVision3D/' + rel)
    disk = open(os.path.join(VV, rel.replace('/', os.sep)), 'rb').read()
    print('%-80s %d  %s' % (rel, status, 'served == disk' if body == disk else 'DIFFERENT (served sha1 %s, disk %s)' % (
        hashlib.sha1(body).hexdigest()[:8], hashlib.sha1(disk).hexdigest()[:8])))
