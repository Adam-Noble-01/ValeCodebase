"""W1-38 scratch: each candidate (or, with --live, each landed file) against TrueVision at the pin, and against the
VV pre-image. Unified diffs, EOL-normalised. Writes review_<mode>.txt and prints a summary.

Usage: python -B review_diffs.py [--live]
"""
import difflib
import os
import subprocess
import sys

NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
LIVE = '--live' in sys.argv
FILES = [
    ('02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__PanelHost__.js', True),
    ('02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Styles__Panels__.css', True),
    ('80__Testing__PrototypeEnvironment/Na__Test__ColourPalette__.test.mjs', False),
]


def norm(b):
    return b.decode('utf-8').replace('\r\n', '\n').split('\n')


out = []
for rel, had in FILES:
    name = os.path.basename(rel)
    mine = open(os.path.join(VV, rel) if LIVE else os.path.join(HERE, 'candidates', name), 'rb').read()
    tvb = subprocess.run(['git', '-C', NAWEB, 'show', f'{PIN}:{APP}{rel}'], capture_output=True, check=True).stdout
    d_tv = list(difflib.unified_diff(norm(tvb), norm(mine), f'TV@{PIN}', 'VV ' + ('live' if LIVE else 'candidate'), n=0, lineterm=''))
    out.append(f'##### {name} vs TrueVision at the pin: {sum(1 for l in d_tv if l.startswith("+") and not l.startswith("+++"))} added, '
               f'{sum(1 for l in d_tv if l.startswith("-") and not l.startswith("---"))} removed')
    out.extend(d_tv)
    if had:
        pre = open(os.path.join(HERE, 'preimage', name), 'rb').read()
        d_vv = list(difflib.unified_diff(norm(pre), norm(mine), 'VV pre-image', 'VV ' + ('live' if LIVE else 'candidate'), n=0, lineterm=''))
        out.append(f'##### {name} vs this app\'s pre-image: {sum(1 for l in d_vv if l.startswith("+") and not l.startswith("+++"))} added, '
                   f'{sum(1 for l in d_vv if l.startswith("-") and not l.startswith("---"))} removed')
    out.append('')
path = os.path.join(HERE, 'review_' + ('live' if LIVE else 'candidates') + '.txt')
with open(path, 'w', encoding='utf-8', newline='\n') as fh:
    fh.write('\n'.join(out) + '\n')
print('\n'.join(l for l in out if l.startswith('#####')))
print('written', path)
