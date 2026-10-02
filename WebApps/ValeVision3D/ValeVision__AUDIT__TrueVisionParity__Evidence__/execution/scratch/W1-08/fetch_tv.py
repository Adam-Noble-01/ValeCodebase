# W1-08 scratch: fetch the TrueVision sources at the pin (bytes, exactly as git show returns them)
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
    '02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__StoreyLevel__.js',
    '02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__DevMenu__StoreyRow__.js',
    '02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__ConfigState__.js',
    '02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__ProjectJson__Data__.js',
    '02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__AppConfig__.json',
    '02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__Styles__DevMenu__.css',
    '80__Testing__PrototypeEnvironment/Na__Test__FloorPlanStoreyLevel__.test.mjs',
]

EXTRA = sys.argv[1:]

os.makedirs(OUT, exist_ok=True)
for rel in FILES + EXTRA:
    data = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + APP + rel], capture_output=True, check=True).stdout
    name = os.path.basename(rel)
    with open(os.path.join(OUT, name), 'wb') as f:
        f.write(data)
    crlf = data.count(b'\r\n')
    print('%-60s %7d bytes  sha1 %s  lines %d  crlf %d' % (name, len(data), hashlib.sha1(data).hexdigest()[:8], data.count(b'\n'), crlf))
