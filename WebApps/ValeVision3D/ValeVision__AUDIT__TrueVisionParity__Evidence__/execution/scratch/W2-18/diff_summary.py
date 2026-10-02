"""W2-18 - what differs between each landed file and TrueVision at the pin, outside the header comment."""
import os, difflib
import port_w2_18 as p

for rel in p.ALL:
    tv = p.git_show(rel).decode('utf-8').split('\n')
    vv = open(os.path.join(p.VV_APP, rel.replace('/', os.sep)), 'r', encoding='utf-8', newline='').read().split('\n')
    # header end: first 'REGION |' line (JS/CSS); JSON has no header
    def body_start(lines):
        for i, l in enumerate(lines):
            if 'REGION |' in l:
                return i
        return 0
    tb, vb = body_start(tv), body_start(vv)
    body_diff = [l for l in difflib.unified_diff(tv[tb:], vv[vb:], lineterm='', n=0) if l[:1] in '+-' and not l.startswith(('+++', '---'))]
    head_diff = [l for l in difflib.unified_diff(tv[:tb], vv[:vb], lineterm='', n=0) if l[:1] in '+-' and not l.startswith(('+++', '---'))]
    print('%-62s header +-%3d   body +-%2d' % (os.path.basename(rel), len(head_diff), len(body_diff)))
    for l in body_diff:
        print('      ', l.strip()[:150])
