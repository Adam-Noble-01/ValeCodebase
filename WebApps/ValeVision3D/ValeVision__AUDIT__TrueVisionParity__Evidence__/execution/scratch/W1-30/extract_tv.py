import subprocess, os, sys, hashlib

PIN = 'b2aa9151'
REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
OUT = os.path.dirname(os.path.abspath(__file__))

FILES = [
    '02__Src__AppModules/51__System__LayoutEditor/31__System__DocumentKeys/Na__LayoutEditor__DocumentKeys__.js',
    '02__Src__AppModules/51__System__LayoutEditor/31__System__DocumentKeys/Na__Hotkeys__DocumentTabs__.json',
    '02__Src__AppModules/03__AppUtils/Na__AppUtils__KeyScope__.js',
    '80__Testing__PrototypeEnvironment/Na__Test__DocumentKeys__.test.mjs',
]

for rel in FILES:
    data = subprocess.run(['git', '-C', REPO, 'show', PIN + ':' + APP + rel], capture_output=True, check=True).stdout
    name = 'TV__' + os.path.basename(rel)
    with open(os.path.join(OUT, name), 'wb') as f:
        f.write(data)
    crlf = data.count(b'\r\n')
    print(name, len(data), 'bytes', 'CRLF=' + str(crlf), 'LF=' + str(data.count(b'\n')), 'sha1=' + hashlib.sha1(data).hexdigest())
