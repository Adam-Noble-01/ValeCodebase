"""For each TV release W3-03 carries, print its devlog heading and every line that speaks of Adam's trial / sign-off."""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
text = open(os.path.join(HERE, 'tv', 'TrueVision__DEVLOG__.md'), encoding='utf-8').read().splitlines()
VERS = ['2.28.0', '2.32.0', '2.42.0', '2.65.0', '2.75.0', '2.78.0', '2.98.0', '2.104.0', '2.107.0', '2.111.0', '2.113.0',
        '2.114.0', '2.115.0', '2.116.0', '2.117.0', '2.118.0', '2.119.0', '2.123.0', '2.129.0', '2.130.0', '2.131.0',
        '2.137.0', '2.138.0', '2.141.0', '2.142.0', '2.143.0', '2.144.0', '2.148.0', '2.149.0', '2.150.0', '2.151.0',
        '2.153.0']
heads = [(i, l) for i, l in enumerate(text) if re.match(r'^##\s+TrueVision3D\s+v2\.\d+\.\d+', l) or re.match(r'^##\s.*v2\.\d+\.\d+', l)]
for v in VERS:
    idx = [k for k, (i, l) in enumerate(heads) if re.search(r'v' + re.escape(v) + r'\b', l)]
    if not idx:
        print('v' + v, 'NO HEADING')
        continue
    k = idx[0]
    i, l = heads[k]
    end = heads[k + 1][0] if k + 1 < len(heads) else len(text)
    body = text[i:end]
    adam = [b.strip() for b in body if re.search(r'Adam|sign(ed)?[- ]off|NOT tried|confirmed', b, re.I)]
    print(':%d %s' % (i + 1, l.strip()))
    for a in adam[:4]:
        print('      ', a[:220])
