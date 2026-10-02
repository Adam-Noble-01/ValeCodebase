# W2-09 scratch: save (1) the git diff of the package's files against HEAD and (2) each landed file's
# changed lines against TrueVision at the pin (line endings ignored), for the Port Record.
import difflib
import os
import subprocess

HERE   = os.path.dirname(os.path.abspath(__file__))
VCB    = r'D:\10_CoreLib__ValeCodebase'
VV_APP = os.path.join(VCB, 'WebApps', 'ValeVision3D')
NAWEB  = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
FILES  = [
    '02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__Enhance__.js',
    '02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__RenderComposites__.js',
    '02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__RenderComposites__Config__.json',
    '80__Testing__PrototypeEnvironment/Na__Test__EnhanceWhitecardStrength__.test.mjs',
]

diff = subprocess.run(['git', '-C', VCB, 'diff', '--'] + ['WebApps/ValeVision3D/' + f for f in FILES[:3]],
                      capture_output=True).stdout
with open(os.path.join(HERE, 'git_diff__W2-09.diff'), 'wb') as f:
    f.write(diff)
print('git diff (3 existing files):', len(diff), 'bytes')

os.makedirs(os.path.join(HERE, 'diffs'), exist_ok=True)
for rel in FILES:
    tv = subprocess.run(['git', '-C', NAWEB, 'show', 'b2aa9151:na-apps/30__TrueVision__CoreAppCode/' + rel],
                        capture_output=True, check=True).stdout.decode('utf-8').replace('\r\n', '\n').split('\n')
    with open(os.path.join(VV_APP, rel.replace('/', os.sep)), 'rb') as f:
        vv = f.read().decode('utf-8').replace('\r\n', '\n').split('\n')
    lines = list(difflib.unified_diff(tv, vv, 'TV@b2aa9151', 'VV-live', n=0, lineterm=''))
    name = os.path.basename(rel) + '.tv_vs_vv.diff'
    with open(os.path.join(HERE, 'diffs', name), 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines) + '\n')
    hunks = [l for l in lines if l.startswith('@@')]
    print('%-62s hunks: %s' % (os.path.basename(rel), ' '.join(h.split('@@')[1].strip() for h in hunks)))
