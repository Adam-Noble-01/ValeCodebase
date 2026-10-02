"""Scratch (W0-02): list wp_canonical.json mentions of a regex, per package."""
import json, re, sys

P = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\data\wp_canonical.json'
pat = re.compile(sys.argv[1])
width = int(sys.argv[2]) if len(sys.argv) > 2 else 160
d = json.load(open(P, encoding='utf-8'))
pk = d['packages'] if isinstance(d, dict) and 'packages' in d else d
if isinstance(pk, dict):
    pk = list(pk.values())
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
for p in pk:
    if not isinstance(p, dict):
        continue
    for k, v in p.items():
        s = json.dumps(v, ensure_ascii=False)
        for m in pat.finditer(s):
            a = max(0, m.start() - width)
            b = min(len(s), m.end() + width)
            print('%s [%s] :: %s' % (p.get('wp_id'), k, s[a:b]))
