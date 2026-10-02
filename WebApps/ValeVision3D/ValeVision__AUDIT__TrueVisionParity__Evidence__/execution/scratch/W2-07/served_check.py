"""Read-only GETs on Adam's running Flask server: /api/check-localhost answers, and the two W2-07 files are served
byte-identical to disk. Nothing is written, nothing is started or stopped.
Usage: python -B served_check.py
"""
import urllib.request
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
BASE = 'http://localhost:8000'
FILES = [
    '02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js',
    '02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__ProgressiveRefine__.js',
]
def get(url):
    req = urllib.request.Request(url, headers={'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.status, r.read()
try:
    status, body = get(BASE + '/api/check-localhost')
    print('GET /api/check-localhost ->', status, body[:120])
except Exception as e:
    print('GET /api/check-localhost failed:', e)
for rel in FILES:
    disk = open(VV + '\\' + rel.replace('/', '\\'), 'rb').read()
    try:
        status, body = get(BASE + '/ValeVision3D/' + rel)
        print('GET', rel, '->', status, len(body), 'bytes;', 'IDENTICAL to disk' if body == disk else 'DIFFERS from disk (' + str(len(disk)) + ' on disk)')
    except Exception as e:
        print('GET', rel, 'failed:', e)
