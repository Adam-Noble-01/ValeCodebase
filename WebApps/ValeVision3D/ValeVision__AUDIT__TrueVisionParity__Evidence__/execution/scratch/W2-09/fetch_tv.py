# W2-09 scratch: read the TrueVision sources at the pin (bytes, as git show returns them)
# and snapshot the current ValeVision files, so the port starts from known bytes.
import os
import subprocess
import hashlib

PIN = 'b2aa9151'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
VV_APP = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
OUT = os.path.dirname(os.path.abspath(__file__))

FILES = [
    '02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__Enhance__.js',
    '02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__RenderComposites__.js',
    '02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__RenderComposites__Config__.json',
    '80__Testing__PrototypeEnvironment/Na__Test__EnhanceWhitecardStrength__.test.mjs',
]


def eol(b):
    crlf = b.count(b'\r\n')
    lf = b.count(b'\n') - crlf
    return 'CRLF=%d LF=%d' % (crlf, lf)


os.makedirs(os.path.join(OUT, 'tv'), exist_ok=True)
os.makedirs(os.path.join(OUT, 'vv_before'), exist_ok=True)
for rel in FILES:
    name = os.path.basename(rel)
    tv = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + TV_APP + rel], capture_output=True, check=True).stdout
    with open(os.path.join(OUT, 'tv', name), 'wb') as f:
        f.write(tv)
    print('TV', name, len(tv), eol(tv), hashlib.sha1(tv).hexdigest())
    vv_path = os.path.join(VV_APP, rel.replace('/', os.sep))
    if os.path.exists(vv_path):
        with open(vv_path, 'rb') as f:
            vv = f.read()
        with open(os.path.join(OUT, 'vv_before', name), 'wb') as f:
            f.write(vv)
        print('VV', name, len(vv), eol(vv), hashlib.sha1(vv).hexdigest())
    else:
        print('VV', name, 'absent')
