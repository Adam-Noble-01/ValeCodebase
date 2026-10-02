"""W1-38 scratch: unified diff of a TV file (at the pin, from scratch/W1-38/tv) against the VV live file (EOL-normalised).

usage: python -B diff_tv_vv.py css|js [--context N]
"""
import difflib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
PAIRS = {
    'css': ('Na__LayoutEditor__Styles__Panels__.css', VV + r'\02__Src__AppModules\51__System__LayoutEditor\40__Ui__Panels\Na__LayoutEditor__Styles__Panels__.css'),
    'js': ('Na__LayoutEditor__PanelHost__.js', VV + r'\02__Src__AppModules\51__System__LayoutEditor\40__Ui__Panels\Na__LayoutEditor__PanelHost__.js'),
}
which = sys.argv[1]
ctx = 3
if '--context' in sys.argv:
    ctx = int(sys.argv[sys.argv.index('--context') + 1])
tv_name, vv_path = PAIRS[which]
tv = open(os.path.join(HERE, 'tv', tv_name), 'rb').read().decode('utf-8').replace('\r\n', '\n').split('\n')
vv = open(vv_path, 'rb').read().decode('utf-8').replace('\r\n', '\n').split('\n')
for line in difflib.unified_diff(vv, tv, 'VV(live)', 'TV@b2aa9151', n=ctx, lineterm=''):
    print(line)
