import re, os
HERE = os.path.dirname(os.path.abspath(__file__))
lines = open(os.path.join(HERE, 'tv', 'TrueVision__DEVLOG__.md'), encoding='utf-8').read().split('\n')
heads = [(i, l) for i, l in enumerate(lines) if l.startswith('## ')]
def head_of(n):
    best = None
    for i, l in heads:
        if i <= n:
            best = (i, l)
    return best
for n in [1705, 2856, 2976, 3720, 4814, 5152, 6565, 13667, 14087]:
    i, l = head_of(n - 1)
    # adam-tried lines inside the entry
    nxt = [j for j, _ in heads if j > i]
    end = nxt[0] if nxt else len(lines)
    tried = [lines[k].strip()[:160] for k in range(i, end) if re.search(r'tried|sign-off|Adam has not|NOT tried|confirmed', lines[k], re.I)]
    print(n, '->', i + 1, l[:150])
    for t in tried[:4]:
        print('     ', t)
