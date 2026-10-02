"""W2-19 - read the TrueVision sources at the pin b2aa9151 (bytes, exactly as git show returns them)."""
import subprocess, os
PIN = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
OS = '02__Src__AppModules/51__System__LayoutEditor/28__System__ObjectSnap/'
FILES = [OS + 'Na__LayoutEditor__ObjectSnap__%s__.js' % n for n in ('Search', 'Moves', 'GridMoves', 'Menu')] + [
    OS + 'Na__LayoutEditor__ObjectSnap__.js',
    OS + 'Na__LayoutEditor__Styles__ObjectSnap__.css',
    '80__Testing__PrototypeEnvironment/Na__TestEnv__ObjectSnapBundle__.cjs',
    '80__Testing__PrototypeEnvironment/Na__Test__ObjectSnap__.test.mjs',
    # context, read only
    '02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__Snapping__.js',
    '02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css',
    '02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__Keyboard__.js',
    '02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js',
    '02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__ContextMenu__.js',
    '02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js',
    '03__Style__AppStylesheets/Na__LayoutEditor__Styles__Index__.css',
]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tv')
os.makedirs(OUT, exist_ok=True)
for f in FILES:
    r = subprocess.run(['git', '-C', REPO, 'show', PIN + ':' + APP + f], capture_output=True)
    if r.returncode != 0:
        print('MISSING', f, r.stderr.decode().strip()[:200])
        continue
    b = r.stdout
    blob = subprocess.run(['git', '-C', REPO, 'rev-parse', PIN + ':' + APP + f], capture_output=True).stdout.decode().strip()
    with open(os.path.join(OUT, os.path.basename(f)), 'wb') as fh:
        fh.write(b)
    print(os.path.basename(f), len(b), 'B', b.count(b'\n'), 'lines', 'CRLF' if b'\r\n' in b else 'LF', 'blob', blob[:8])
