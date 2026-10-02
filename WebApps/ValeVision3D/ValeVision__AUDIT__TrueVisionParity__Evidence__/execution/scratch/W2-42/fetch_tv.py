import subprocess, os, hashlib
PIN = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
BASE = 'na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/51__System__LayoutEditor/28__System__ObjectSnap/'
NAMES = ['State', 'Geometry', 'Glyphs', 'Index', 'Sources', 'Marker']
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tv')
os.makedirs(OUT, exist_ok=True)
files = ['Na__LayoutEditor__ObjectSnap__%s__.js' % n for n in NAMES] + ['Na__LayoutEditor__ObjectSnap__Config__.json']
for f in files:
    b = subprocess.run(['git', '-C', REPO, 'show', PIN + ':' + BASE + f], capture_output=True, check=True).stdout
    blob = subprocess.run(['git', '-C', REPO, 'rev-parse', PIN + ':' + BASE + f], capture_output=True, check=True).stdout.decode().strip()
    with open(os.path.join(OUT, f), 'wb') as fh:
        fh.write(b)
    print(f, len(b), 'bytes', b.count(b'\n'), 'lines', 'CRLF' if b'\r\n' in b else 'LF', 'blob', blob[:8])
