import subprocess, os, sys
PIN = 'b2aa9151'
TVR = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tv')
FILES = [
    '02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__Grips__.js',
    '02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css',
    '80__Testing__PrototypeEnvironment/Na__Test__PaintedOnThePoint__.test.mjs',
    '02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__SheetSurface__.js',
]
FILES += sys.argv[1:]
for f in FILES:
    data = subprocess.run(['git', '-C', TVR, 'show', PIN + ':' + APP + f], capture_output=True, check=True).stdout
    dst = os.path.join(OUT, f.replace('/', os.sep))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, 'wb') as fh:
        fh.write(data)
    print(len(data), b'\r\n' in data, f)
