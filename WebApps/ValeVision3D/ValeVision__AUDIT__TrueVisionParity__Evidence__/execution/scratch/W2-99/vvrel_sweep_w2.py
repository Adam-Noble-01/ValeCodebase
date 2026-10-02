"""W1-99: every release placeholder left anywhere in the ValeVision app (outside the audit's evidence folder, .claude,
node_modules and .git), in the Whitecardopedia Flask files and in execution/prepared. Read-only.
The PLAN's two quotations of the placeholder rule are expected (exempt history text)."""
import os, re, sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
VCB = r'D:\10_CoreLib__ValeCodebase'
VV = os.path.join(VCB, 'WebApps', 'ValeVision3D')
WCP = os.path.join(VCB, 'WebApps', 'Whitecardopedia')
HERE = os.path.dirname(os.path.abspath(__file__))
PREPARED = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'prepared')
SKIP = {'.git', '.claude', 'node_modules', '__pycache__', '.wrangler'}
TOK = re.compile(rb'\{\{VVREL[^}\n]*\}\}')
BIN = ('.png', '.jpg', '.jpeg', '.webp', '.glb', '.gltf', '.bin', '.zip', '.pdf', '.ttf', '.otf', '.woff', '.woff2',
       '.ico', '.pyc', '.ktx2', '.hdr', '.exr', '.mp4', '.skp', '.psd', '.dwg', '.exe', '.dll')
hits, scanned = [], 0


def scan(path):
    global scanned
    try:
        b = open(path, 'rb').read()
    except Exception:
        return
    scanned += 1
    if b'{{VVREL' not in b:
        return
    for i, ln in enumerate(b.split(b'\n'), 1):
        for m in TOK.finditer(ln):
            hits.append('%s:%d  %s' % (os.path.relpath(path, VCB).replace(os.sep, '/'), i, m.group(0).decode()))


for dp, dn, fn in os.walk(VV):
    rel = os.path.relpath(dp, VV)
    dn[:] = [d for d in dn if d not in SKIP and not (rel == '.' and d.startswith('ValeVision__AUDIT__'))]
    for f in fn:
        if not f.lower().endswith(BIN):
            scan(os.path.join(dp, f))
for f in os.listdir(WCP):
    if f == 'server.py' or (f.startswith('Server__ValeVision') and f.endswith('.py')):
        scan(os.path.join(WCP, f))
for dp, dn, fn in os.walk(PREPARED):
    for f in fn:
        scan(os.path.join(dp, f))
print('files scanned: %d; placeholders found: %d' % (scanned, len(hits)))
for h in hits:
    print('  ' + h)
