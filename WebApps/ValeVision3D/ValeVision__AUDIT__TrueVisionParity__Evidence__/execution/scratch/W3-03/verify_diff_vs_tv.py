"""Acceptance 1: diff every live W3-03 file against TrueVision at the pin and classify each changed line as banner,
PORT NOTE block, recorded gesture guard (VV GUARD) or OTHER. Any OTHER line is a defect. Also the identity sweep."""
import difflib
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import port_w3_03 as P  # noqa: E402

GUARD_NAMES = ('Na__LeTools__VV_HOLD_AUTO_MOVE', 'Na__LeTools__VV_HOLD_VIEWPORT_CARRY',
               'Na__LeTools__VV_HOLD_COPY_DRAG', 'Na__LeTools__VV_HOLD_MOVE_ANCHOR')
BAD_TOKENS = ('TRUEVISION3D', '[TrueVision3D', 'NaProjectPortal', 'noble-architecture.com', '80__CloudflareIntegration',
              'na-truevision-api', '/api/truevision', '30__TrueVision__AppContent', '/na-apps/')

total_other = 0
for rel, _ in P.FILES:
    name = os.path.basename(rel)
    live = open(os.path.join(P.VV, rel), 'rb').read().decode('utf-8').replace('\r\n', '\n')
    tvt = P.tv(name)
    a, b = tvt.split('\n'), live.split('\n')
    # PORT NOTE span in the live file (from "// PORT NOTE:" to the next rule)
    note_lines = set()
    if '// PORT NOTE:' in b:
        s = b.index('// PORT NOTE:')
        e = s
        while not b[e].startswith('// ----------'):
            e += 1
        note_lines = set(range(s, e))
    tv_note = set()
    if '// PORT NOTE:' in a:
        s = a.index('// PORT NOTE:')
        e = s
        while not a[e].startswith('// ----------'):
            e += 1
        tv_note = set(range(s, e))
    # guard regions in the live file
    guard_lines = set()
    for i, l in enumerate(b):
        if 'REGION | ValeVision Gesture Guards' in l:
            j = i - 1
            k = i
            while not b[k].startswith('// endregion'):
                k += 1
            guard_lines.update(range(j, k + 4))
        if 'VV GUARD' in l or l.strip() in [g for g in GUARD_NAMES] or any(l.strip().rstrip(',') == g for g in GUARD_NAMES):
            guard_lines.add(i)
    counts = {'banner': 0, 'note': 0, 'guard': 0, 'other': 0}
    others = []
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            continue
        for i in range(i1, i2):
            if i == 1:
                counts['banner'] += 1
            elif i in tv_note:
                counts['note'] += 1
            elif a[i].rstrip(',') .strip() == 'Na__LeTools__CarryTarget' and tag == 'replace':
                counts['guard'] += 1                      # the export / import list line that gained a comma
            else:
                counts['other'] += 1
                others.append('-%d %s' % (i + 1, a[i]))
        for j in range(j1, j2):
            if j == 1:
                counts['banner'] += 1
            elif j in note_lines:
                counts['note'] += 1
            elif j in guard_lines or b[j].strip() == 'Na__LeTools__CarryTarget,':
                counts['guard'] += 1
            else:
                if name == 'Na__LayoutEditor__MarginGrip__.js':
                    pass
                counts['other'] += 1
                others.append('+%d %s' % (j + 1, b[j]))
    hits = []
    for i, l in enumerate(b):
        if i in note_lines:
            continue
        for t in BAD_TOKENS:
            if t in l and not (t == 'TRUEVISION3D' and False):
                hits.append('%d %s' % (i + 1, t))
    total_other += counts['other']
    print('%-52s banner %d  note %3d  guard %3d  OTHER %d  identity hits %d' % (name, counts['banner'], counts['note'], counts['guard'], counts['other'], len(hits)))
    for o in others[:10]:
        print('     ', o[:150])
    for h in hits[:5]:
        print('      identity:', h)
print('TOTAL OTHER', total_other)
