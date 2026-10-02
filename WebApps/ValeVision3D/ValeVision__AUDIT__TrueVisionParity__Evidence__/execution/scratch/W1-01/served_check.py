"""Read-only GETs on Adam's running Flask server: is it up, and does it serve the five W1-01 files byte-identical to disk?"""
import hashlib, os, urllib.request
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
BASE = 'http://localhost:8000'
FILES = [
    '02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js',
    '02__Src__AppModules/05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js',
    '02__Src__AppModules/05__RenderPipeline/Na__RenderLoop__Invalidation.js',
    '02__Src__AppModules/26__System__ToggleModelElements/Na__ModelGroup__PhaseLibrary__.js',
    '02__Src__AppModules/26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js',
]
def get(url):
    req = urllib.request.Request(url, headers={'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.status, r.read(), r.headers.get('Content-Type')
try:
    status, body, ctype = get(BASE + '/api/check-localhost')
    print('GET /api/check-localhost', status, body[:120])
except Exception as e:
    print('GET /api/check-localhost FAILED', e)
for rel in FILES:
    disk = hashlib.sha1(open(os.path.join(VV, rel.replace('/', os.sep)), 'rb').read()).hexdigest()
    try:
        status, body, ctype = get(BASE + '/ValeVision3D/' + rel)
        served = hashlib.sha1(body).hexdigest()
        print('GET %-90s %d %-28s %s' % (rel, status, ctype, 'served == disk' if served == disk else 'served %s != disk %s' % (served[:10], disk[:10])))
    except Exception as e:
        print('GET %s FAILED %s' % (rel, e))
