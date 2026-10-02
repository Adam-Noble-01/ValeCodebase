# W2-09 scratch: compare ValeVision's current copies with TrueVision's copies just before the
# commit that brought Enhance 1.1.0, RenderComposites 1.2.0/1.3.0 and config 1.3.0/1.4.0
# (62dade1c, under the v2.95.0 heading; parent 62dade1c^). Proves which VV lines are VV seams
# (header, console prefix, PORT NOTE, VV wording) and that nothing else of VV's would be lost.
import difflib
import os
import subprocess

NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
HERE = os.path.dirname(os.path.abspath(__file__))
FILES = {
    'Na__LayoutEditor__Enhance__.js': '02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__Enhance__.js',
    'Na__LayoutEditor__RenderComposites__.js': '02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__RenderComposites__.js',
    'Na__LayoutEditor__RenderComposites__Config__.json': '02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__RenderComposites__Config__.json',
}

for name, rel in FILES.items():
    parent = subprocess.run(['git', '-C', NAWEB, 'show', '62dade1c^:' + TV_APP + rel], capture_output=True, check=True).stdout
    with open(os.path.join(HERE, 'vv_before', name), 'rb') as f:
        vv = f.read()
    a = parent.decode('utf-8').replace('\r\n', '\n').split('\n')
    b = vv.decode('utf-8').replace('\r\n', '\n').split('\n')
    print('=' * 100)
    print(name, '  TV 62dade1c^ vs VV now (line endings ignored)')
    for line in difflib.unified_diff(a, b, 'TV@62dade1c^', 'VV-now', n=0, lineterm=''):
        print(line)
