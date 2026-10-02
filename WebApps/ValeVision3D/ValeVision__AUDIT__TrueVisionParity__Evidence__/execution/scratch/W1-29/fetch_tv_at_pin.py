# W1-29 scratch: copy the TrueVision files this package reads, at the pin, as git show returns them (bytes).
import os
import subprocess
import hashlib

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
OUT = os.path.dirname(os.path.abspath(__file__))

FILES = {
    'tv_KeyScope_at_pin.js': '02__Src__AppModules/03__AppUtils/Na__AppUtils__KeyScope__.js',
    'tv_HotkeysManager_at_pin.js': '02__Src__AppModules/10__NavigationAndCameras/Na__Hotkeys__Manager.js',
    'tv_Test_DocumentKeys_at_pin.mjs': '80__Testing__PrototypeEnvironment/Na__Test__DocumentKeys__.test.mjs',
    'tv_Test_DrawingTabKeys_at_pin.mjs': '80__Testing__PrototypeEnvironment/Na__Test__DrawingTabKeys__.test.mjs',
    'tv_DocumentKeys_at_pin.js': '02__Src__AppModules/51__System__LayoutEditor/31__System__DocumentKeys/Na__LayoutEditor__DocumentKeys__.js',
    'tv_Hotkeys_3dModelTab_at_pin.json': '02__Src__AppModules/02__AppData/Na__Hotkeys__3dModelTab__.json',
    'tv_ModeController_at_pin.js': '02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js',
}

for name, rel in FILES.items():
    data = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + APP + rel], capture_output=True, check=True).stdout
    with open(os.path.join(OUT, name), 'wb') as fh:
        fh.write(data)
    crlf = data.count(b'\r\n')
    lf = data.count(b'\n')
    print(f'{name:40s} {len(data):7d} bytes  lines={lf}  crlf={crlf}  sha1={hashlib.sha1(data).hexdigest()[:12]}  <- {rel}')
