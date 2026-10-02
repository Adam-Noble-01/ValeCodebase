"""W3 gate - G6 / policy 9, 10, 13 sweep over the W3-touched files (read-only).
Forbidden: TV's api client, /r2/ routes, NaProjectPortal keys, the /q/ and /s/ resolvers, the NA project hub section,
workers.dev / cdn. / api. hosts in new code, localhost-means-Flask host tests; counts TODO(OVH-MIGRATION) seams.
Lines are classed code / comment (a line whose first non-space characters are //, *, /*, # or <!--)."""
import json, os, re, sys
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
VCB = r'D:\10_CoreLib__ValeCodebase'
OUT = os.path.dirname(os.path.abspath(__file__))
rows = json.load(open(os.path.join(OUT, 'crosscheck_w3.json'), encoding='utf-8'))
PATS = [
    ('na-truevision-api', r'na-truevision-api'),
    ('/r2/ route', r'/r2/'),
    ('NaProjectPortal', r'NaProjectPortal'),
    ('/q/ or /s/ resolver', r'noble-architecture\.com/(q|s)/|[\'"`]/(q|s)/'),
    ('Project Hub', r'TrueVision 3D Project Hub'),
    ('workers.dev', r'workers\.dev'),
    ('cdn./api. host', r'https?://(cdn|api)\.'),
    ('localhost host test', r'IsRunningOnLocalhost|hostname\s*===?\s*[\'"]localhost'),
    ('NA job phase', r'\bT0[1-4]\b'),
    ('Noble Architecture', r'Noble Architecture'),
    ('TRUEVISION banner/prefix', r'TRUEVISION3D|\[TrueVision3D'),
    ('/api/truevision', r'/api/truevision'),
]
L, hits, ovh = [], [], {}
for r in rows:
    if not r.get('touched_in_cont'):
        continue
    fp = os.path.join(VCB, *r['path'].split('/'))
    if not os.path.isfile(fp) or not fp.endswith(('.js', '.mjs', '.cjs', '.css', '.json', '.html', '.py')):
        continue
    for n, line in enumerate(open(fp, encoding='utf-8', errors='replace').read().split('\n'), 1):
        if 'TODO(OVH-MIGRATION)' in line:
            ovh[r['path']] = ovh.get(r['path'], 0) + 1
        s = line.lstrip()
        kind = 'comment' if s.startswith(('//', '*', '/*', '#', '<!--')) else 'code'
        for name, pat in PATS:
            if re.search(pat, line):
                hits.append((name, kind, r['path'].replace('WebApps/ValeVision3D/', ''), n, line.strip()[:170]))
L.append('W3-touched files scanned: %d' % sum(1 for r in rows if r.get('touched_in_cont')))
L.append('hits: %d (code %d, comment %d)' % (len(hits), sum(1 for h in hits if h[1] == 'code'), sum(1 for h in hits if h[1] == 'comment')))
for h in hits:
    L.append('  [%s] %-7s %s:%d  %s' % h)
L.append('TODO(OVH-MIGRATION) seams: %d in %d file(s)' % (sum(ovh.values()), len(ovh)))
for p, c in sorted(ovh.items()):
    L.append('  %3d  %s' % (c, p.replace('WebApps/ValeVision3D/', '')))
open(os.path.join(OUT, 'g6_w3.txt'), 'w', encoding='utf-8', newline='\n').write('\n'.join(L) + '\n')
print('\n'.join(L))
