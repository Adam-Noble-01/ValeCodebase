import re, os
here = os.path.dirname(os.path.abspath(__file__))
lines = open(os.path.join(here, 'tv_devlog.md'), encoding='utf-8').read().split('\n')
mods = ['EditScope__', 'ItemClipboard__', 'SelectionSet__', 'SelectionBox__', 'Eyedropper__', 'LayerMenu__', 'NoteTooltip__']
cur = None
hits = {}
status = {}
for i, l in enumerate(lines):
    m = re.match(r'^## TrueVision3D (v2\.\d+\.\d+)', l)
    if m:
        cur = m.group(1); continue
    if cur is None: continue
    for mod in mods:
        if mod in l:
            hits.setdefault(cur, set()).add(mod)
    if re.search(r'tried by Adam|Adam.s sign-off|signed .* off|Adam confirmed|confirmed by Adam', l, re.I):
        status.setdefault(cur, []).append(l.strip()[:160])
def key(v): return tuple(int(x) for x in v[1:].split('.'))
for v in sorted(hits, key=key):
    if key(v) < (2, 59, 0): continue
    print(v, sorted(hits[v]))
    for s in status.get(v, [])[:2]: print('    ', s)
