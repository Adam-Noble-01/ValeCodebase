"""W1-99: for the hot files the placeholder pass touched, the SHA-1 and size before -> after (manifest) and the live
SHA-1 / SHA-256 now (next holders lock on one or the other). Read-only."""
import hashlib, json, os, re, sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
HERE = os.path.dirname(os.path.abspath(__file__))
VCB = r'D:\10_CoreLib__ValeCodebase'
HOT = re.compile(r'(Loader__\.js|LoadingScreen__|Styles__Boot__|LoadingVeil__|LayoutEditor__ModeController__|TabStrip__|'
                 r'Styles__Main__|ShapeRings__|LayoutEditor__DocumentKeys__\.js|Toolbar__\.js|PdfExporter__|LoadingSequence|'
                 r'DrawView__ProjectData__|HotkeyHandler__|KeyScope__|FloorPlan__ModeController__|Elevation__ModeController__|'
                 r'Test__AppConfigParity__|Test__DocumentKeys__|Test__LoaderFacade__)')
rows = json.load(open(os.path.join(HERE, 'preimage_manifest.json'), encoding='utf-8'))
for r in sorted(rows, key=lambda r: r['rel']):
    if not HOT.search(r['rel']):
        continue
    b = open(os.path.join(VCB, *r['rel'].split('/')), 'rb').read()
    ok = hashlib.sha1(b).hexdigest() == r['sha1_after']
    print('%s | %s -> %s | %d -> %d bytes | sha256 now %s | live = after: %s' % (
        r['rel'].replace('WebApps/ValeVision3D/02__Src__AppModules/', '').replace('WebApps/ValeVision3D/', ''),
        r['sha1_before'][:8], r['sha1_after'][:8], r['size_before'], r['size_after'],
        hashlib.sha256(b).hexdigest()[:16], ok))
