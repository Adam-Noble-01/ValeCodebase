"""W1-38 scratch: the Scrapbook and Column Tabs regions of Styles__Panels - byte-identical (line endings aside) between
this app's pre-image, the landed sheet and TrueVision's sheet at the pin. Also lists every REGION title in both
the pre-image and the landed sheet, so a region added or lost shows.

Usage: python -B region_compare.py
"""
import os
import re
import subprocess

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
REL = '02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Styles__Panels__.css'
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'


def lines(b):
    return b.decode('utf-8').replace('\r\n', '\n').split('\n')


def regions(ls):
    out = {}
    order = []
    for i, l in enumerate(ls):
        m = re.match(r'^/\* REGION\s+\|\s+(.*?)\s*\*/\s*$', l)
        if m:
            title = m.group(1).strip()
            j = i
            while j < len(ls) and 'endregion' not in ls[j]:
                j += 1
            out[title] = ls[i - 1:j + 1]          # <-- from the rule line above the title to the endregion line
            order.append(title)
    return out, order


pre = lines(open(os.path.join(HERE, 'preimage', 'Na__LayoutEditor__Styles__Panels__.css'), 'rb').read())
live = lines(open(os.path.join(VV, REL.replace('/', os.sep)), 'rb').read())
tv = lines(subprocess.run(['git', '-C', NAWEB, 'show', 'b2aa9151:na-apps/30__TrueVision__CoreAppCode/' + REL], capture_output=True, check=True).stdout)
rp, op = regions(pre)
rl, ol = regions(live)
rt, ot = regions(tv)
print('pre-image regions :', op)
print('landed regions    :', ol)
print('TrueVision regions:', [t.replace('TrueVision3D', 'ValeVision3D') for t in ot] == ol and '(same titles as landed, banner aside)' or ot)
ok = True
for title in ('Scrapbook', 'Column Tabs'):
    a, b, c = rp.get(title), rl.get(title), rt.get(title)
    same_pre = a is not None and a == b
    same_tv = c is not None and c == b
    ok = ok and same_pre and same_tv
    print(f'{"PASS" if same_pre and same_tv else "FAIL"}  region "{title}": {len(b or [])} lines; landed == pre-image: {same_pre}; landed == TrueVision: {same_tv}')
print('RESULT:', 'PASS' if ok else 'FAIL')
