"""W1-38 scratch: read the TV files this package ports at the pin (bytes, LF as git show returns them).

Writes them to scratch/W1-38/tv/<basename>, prints sha1, line count, line-ending style.
Also writes git log per file for the record.
"""
import hashlib
import os
import subprocess

NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'tv')
os.makedirs(OUT, exist_ok=True)

FILES = [
    '02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__PanelHost__.js',
    '02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Styles__Panels__.css',
    '80__Testing__PrototypeEnvironment/Na__Test__ColourPalette__.test.mjs',
    '03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css',
]


def show(rel):
    return subprocess.run(['git', '-C', NAWEB, 'show', f'{PIN}:{APP}{rel}'], capture_output=True, check=True).stdout


for rel in FILES:
    data = show(rel)
    name = os.path.basename(rel)
    with open(os.path.join(OUT, name), 'wb') as fh:
        fh.write(data)
    crlf = data.count(b'\r\n')
    lf = data.count(b'\n')
    print(f'{name}: {len(data)} bytes, {lf} lines, CRLF {crlf}, sha1 {hashlib.sha1(data).hexdigest()[:8]}')
    blob = subprocess.run(['git', '-C', NAWEB, 'rev-parse', f'{PIN}:{APP}{rel}'], capture_output=True, text=True).stdout.strip()
    print('   blob', blob[:8])
