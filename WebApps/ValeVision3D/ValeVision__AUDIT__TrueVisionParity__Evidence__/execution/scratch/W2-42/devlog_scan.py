import re, os
HERE = os.path.dirname(os.path.abspath(__file__))
lines = open(os.path.join(HERE, 'tv_devlog.md'), encoding='utf-8-sig').read().split('\n')
heads = [(i, l) for i, l in enumerate(lines) if re.match(r'^## TrueVision3D v2\.\d+\.\d+', l)]
def release_of(idx):
    r = None
    for i, l in heads:
        if i <= idx:
            r = (i, l)
    return r
pat = re.compile(r'ObjectSnap__(State|Geometry|Glyphs|Index|Sources|Marker|Config)__|Snapping__\.js|ObjectSnap')
hits = {}
for i, l in enumerate(lines):
    if pat.search(l):
        r = release_of(i)
        if r:
            hits.setdefault(r, []).append(i + 1)
for (i, l), ls in sorted(hits.items()):
    # title line(s) after heading
    title = lines[i + 1].strip() if i + 1 < len(lines) else ''
    nxt = [j for j, _ in heads if j > i]
    end = nxt[0] if nxt else len(lines)
    body = '\n'.join(lines[i:end])
    sign = []
    for m in re.finditer(r'[^\n]*(sign(?:ed)?[- ]off|NOT tried|not tried|Adam-confirmed|confirmed by Adam|tested by Adam|Adam tried|Adam has)[^\n]*', body):
        sign.append(m.group(0).strip()[:200])
    print('%5d %s | %s | hits %s' % (i + 1, l.strip(), title[:110], ls[:6]))
    for s in sign[:3]:
        print('        SIGN: ' + s)
