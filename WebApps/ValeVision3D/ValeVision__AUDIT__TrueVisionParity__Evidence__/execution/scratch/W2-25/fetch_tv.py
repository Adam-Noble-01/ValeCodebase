import subprocess, os, hashlib
PIN = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tv')
FILES = [
    '02__Src__AppModules/51__System__LayoutEditor/28__System__ObjectSnap/Na__LayoutEditor__MoveAnchor__.js',
    '02__Src__AppModules/51__System__LayoutEditor/28__System__ObjectSnap/Na__LayoutEditor__MoveAnchor__Config__.json',
    '02__Src__AppModules/51__System__LayoutEditor/28__System__ObjectSnap/Na__LayoutEditor__ViewportSnapMove__.js',
    '02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css',
    '02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__AxisLock__.js',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__ToolSetup__.js',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__KeyMap__.js',
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__.js',
    'TrueVision__DEVLOG__.md',
]
os.makedirs(OUT, exist_ok=True)
for f in FILES:
    b = subprocess.run(['git', '-C', REPO, 'show', PIN + ':' + APP + f], capture_output=True).stdout
    name = os.path.basename(f)
    with open(os.path.join(OUT, name), 'wb') as fh:
        fh.write(b)
    print(name, len(b), b.count(b'\n'), 'CRLF' if b'\r\n' in b else 'LF', hashlib.sha1(b).hexdigest()[:10])
