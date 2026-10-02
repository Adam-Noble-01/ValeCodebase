import re
p = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W2-42\tv_devlog.md'
lines = open(p, encoding='utf-8').read().split('\n')
heads = [(i, l) for i, l in enumerate(lines) if l.startswith('## ')]
pat = re.compile(r'CabinetInfill__|ScrapbookParametric__ProjectQr__|ScrapbookProjectQr__|ScrapbookCabinetInfill__')
hits = {}
for i, l in enumerate(lines):
    if pat.search(l):
        h = max((hh for hh in heads if hh[0] <= i), default=None)
        if h:
            hits.setdefault(h, []).append(i + 1)
for (hi, hl), ls in sorted(hits.items()):
    # find end of section
    nxt = min((hh[0] for hh in heads if hh[0] > hi), default=len(lines))
    sec = '\n'.join(lines[hi:nxt])
    marks = re.findall(r'[^\n]*(?:tried|TRIED|confirmed|CONFIRMED|sign(?:ed)?[- ]off|Not yet|NOT yet)[^\n]*', sec)
    print(hi + 1, hl[:200])
    print('   hits', ls[:8])
    for m in marks[:4]:
        print('   >', m.strip()[:240])
