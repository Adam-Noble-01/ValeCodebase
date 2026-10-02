# W1-06 scratch: fetch TrueVision files at the pin b2aa9151 (bytes, exactly as git show returns them).
# Read-only on TrueVision. Writes copies into scratch/W1-06/tv/ (deleted at the end of the package: NA markers).
import hashlib
import os
import subprocess
import sys

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'tv')

FILES = [
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__DraftMaths__.js',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__DrawingUsage__.js',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__DevRowShell__.js',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__DraftGuard__.js',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RowAccordion__.js',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenameDrawing__.js',
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__Styles__DevMenu__.css',
    '02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__Modal__.js',
    '03__Style__AppStylesheets/Na__PresentationMode__Styles__SceneCarousel__.css',
    '03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css',
    '80__Testing__PrototypeEnvironment/Na__Test__DrawingDrafts__.test.mjs',
    '80__Testing__PrototypeEnvironment/Na__Test__DraftGuard__.test.cjs',
    '02__Src__AppModules/45__System__ElevationViews/Na__Elevation__AutoNameText__.js',
]

def main():
    os.makedirs(OUT, exist_ok=True)
    for rel in FILES:
        spec = PIN + ':' + APP + rel
        r = subprocess.run(['git', '-C', NAWEB, 'show', spec], capture_output=True)
        if r.returncode != 0:
            print('MISSING', rel, r.stderr.decode('utf-8', 'replace').strip())
            continue
        data = r.stdout
        dest = os.path.join(OUT, rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, 'wb') as fh:
            fh.write(data)
        crlf = data.count(b'\r\n')
        print('%-100s %7d bytes %5d lines sha1 %s crlf=%d' % (
            rel, len(data), data.count(b'\n'), hashlib.sha1(data).hexdigest()[:8], crlf))

if __name__ == '__main__':
    sys.exit(main())
