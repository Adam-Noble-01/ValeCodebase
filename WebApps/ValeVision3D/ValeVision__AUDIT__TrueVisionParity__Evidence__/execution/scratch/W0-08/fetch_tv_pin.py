# W0-08 scratch: read TrueVision files at the pin (b2aa9151) as bytes, never from TV's working tree.
import hashlib
import os
import subprocess

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tv_pin')

FILES = [
    '02__Src__AppModules/62__Feature__AppInstallability/TrueVision__Pwa__ServiceWorker__Registrar__.js',
    '02__Src__AppModules/62__Feature__AppInstallability/TrueVision__Pwa__ServiceWorker__Logic__.js',
    '02__Src__AppModules/62__Feature__AppInstallability/README__PwaInstallability__.md',
    '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__AutoSave__.js',
]

os.makedirs(OUT, exist_ok=True)
for rel in FILES:
    data = subprocess.run(['git', '-C', NAWEB, 'show', f'{PIN}:{APP}{rel}'], capture_output=True, check=True).stdout
    dest = os.path.join(OUT, os.path.basename(rel))
    with open(dest, 'wb') as fh:
        fh.write(data)
    crlf = data.count(b'\r\n')
    lf = data.count(b'\n')
    print(f'{os.path.basename(rel)}  bytes={len(data)}  lines={lf}  crlf={crlf}  sha1={hashlib.sha1(data).hexdigest()}')
