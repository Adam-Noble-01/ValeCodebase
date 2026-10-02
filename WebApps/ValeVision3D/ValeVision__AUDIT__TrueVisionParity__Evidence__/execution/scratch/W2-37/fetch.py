"""W2-37: dump TV files at the pin and VV's current files into scratch (read-only on both trees)."""
import os, subprocess, shutil, hashlib

PIN = 'b2aa9151'
TVREPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TVAPP = 'na-apps/30__TrueVision__CoreAppCode/'
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))

LE57 = '02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/'
LE55 = '02__Src__AppModules/51__System__LayoutEditor/55__Feature__Scrapbook/'
FILES = [
    LE57 + 'Na__LayoutEditor__ScrapbookParametric__.js',
    LE57 + 'Na__LayoutEditor__ScrapbookParametric__ScaleBar__.js',
    LE57 + 'Na__LayoutEditor__ScrapbookParametric__DrawingTitle__.js',
    LE57 + 'Na__LayoutEditor__ScrapbookParametric__Grips__.js',
    LE57 + 'Na__LayoutEditor__ScrapbookParametric__LinkNoodle__.js',
    LE57 + 'Na__LayoutEditor__ScrapbookParametric__ViewportLink__.js',
    LE57 + 'Na__LayoutEditor__Styles__ScrapbookParametric__.css',
    LE57 + 'Na__LayoutEditor__ScrapbookParametric__Config__.json',
    LE57 + 'Na__LayoutEditor__Panel__ScrapbookParametric__.js',
    LE55 + 'Na__LayoutEditor__Scrapbook__TileDrag__.js',
    '80__Testing__PrototypeEnvironment/Na__Test__ScrapbookScaleBar__.test.mjs',
    '80__Testing__PrototypeEnvironment/Na__Test__ScrapbookDrawingTitle__.test.mjs',
]

def tv(path, rev=PIN):
    r = subprocess.run(['git', '-C', TVREPO, 'show', f'{rev}:{TVAPP}{path}'], capture_output=True)
    if r.returncode != 0:
        return None
    return r.stdout

for sub in ('tv', 'vv_before'):
    os.makedirs(os.path.join(HERE, sub), exist_ok=True)

for f in FILES:
    name = os.path.basename(f)
    b = tv(f)
    if b is not None:
        open(os.path.join(HERE, 'tv', name), 'wb').write(b)
    vp = os.path.join(VV, f.replace('/', os.sep))
    vb = open(vp, 'rb').read() if os.path.exists(vp) else None
    dst = os.path.join(HERE, 'vv_before', name)
    if vb is not None and not os.path.exists(dst):
        open(dst, 'wb').write(vb)
    print(f"{name:65s} TV {len(b) if b else '-':>7}  VV {len(vb) if vb else '-':>7} "
          f"{'CRLF' if vb and b'\r\n' in vb else 'LF  '} sha {hashlib.sha256(vb).hexdigest()[:10] if vb else '-'}")
