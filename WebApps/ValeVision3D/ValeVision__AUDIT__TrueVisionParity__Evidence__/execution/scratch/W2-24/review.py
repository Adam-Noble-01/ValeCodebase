import difflib, os
import port_w2_24 as p
S = os.path.join(p.HERE, 'staged')
for rel, base, label in ((p.GRIPS, p.TV, 'TV'), (p.TEST, p.TV, 'TV'), (p.PAPER, p.VV, 'VV-live'), (p.PAPER, p.TV, 'TV')):
    a = open(os.path.join(base, rel), encoding='utf-8').read().replace('\r\n', '\n').splitlines()
    b = open(os.path.join(S, rel), encoding='utf-8').read().replace('\r\n', '\n').splitlines()
    print('=' * 20, label, '->', 'staged', rel)
    for l in difflib.unified_diff(a, b, label, 'staged', lineterm='', n=1):
        print(l)
