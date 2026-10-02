"""Which TrueVision releases W0-15 lands, and whether Adam confirmed each (read-only).

Sources: TV's devlog at the pin (tv_devlog_at_pin.md) and the keys W0-15 added
or adopted (keytree_before.tsv: TV vs VV before the port), plus the module
versions taken (from the units' TV DEVELOPMENT LOGs at the pin).

For every TV-only key short name (and every adopted doc key), the FIRST devlog
section (oldest first) that names it is taken as the release that introduced
it. A section is "confirmed" when it says Adam tried / confirmed it, and
"NOT confirmed" when it says NOT tried by Adam / awaiting sign-off; otherwise
"not stated". Writes tv_releases_covered.json and prints a table.
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
text = open(os.path.join(HERE, 'tv_devlog_at_pin.md'), encoding='utf-8').read()
lines = text.split('\n')

# sections: (version, date, title, body)
secs = []
cur = None
for i, l in enumerate(lines):
    m = re.match(r'^## TrueVision3D (v\d+\.\d+\.\d+)\s+-\s+(\d\d-\w\w\w-\d{4})', l)
    if m:
        if cur:
            secs.append(cur)
        title = lines[i + 1][4:].strip() if i + 1 < len(lines) and lines[i + 1].startswith('### ') else ''
        cur = {'version': m.group(1), 'date': m.group(2), 'title': title, 'body': []}
    elif cur is not None:
        cur['body'].append(l)
if cur:
    secs.append(cur)
for s in secs:
    s['text'] = '\n'.join(s['body'])
secs_oldest_first = list(reversed(secs))


def vkey(v):
    return tuple(int(x) for x in v[1:].split('.'))


def status(t):
    tl = re.sub(r'\s+', ' ', t.lower())
    if re.search(r'not tried by adam|not yet tried by adam|adam has not tried|not yet confirmed|not tried on a real|awaiting adam|on adam.s sign-off|waits for adam|for adam to confirm', tl):
        return 'NOT confirmed'
    if re.search(r'adam (confirmed|tried|tested|approved)|confirmed by adam|tried by adam', tl):
        return 'confirmed'
    return 'not stated'


rows = [l.rstrip('\n').split('\t') for l in open(os.path.join(HERE, 'keytree_before.tsv'), encoding='utf-8')]
names = set()
for p, st, a, b in rows:
    leaf = p.split('/')[-1]
    if st in ('TV-only', 'value'):
        short = re.sub(r'^LayoutEditor__[A-Za-z]+__', '', leaf)
        if short and short not in ('Description',):
            names.add(short)

hits = {}
for n in sorted(names):
    pat = re.compile(r'(?<![A-Za-z])' + re.escape(n) + r'(?![a-z])')
    for s in secs_oldest_first:
        if vkey(s['version']) < (2, 70, 0):
            continue                                               # <-- VV's config holds TV's up to about v2.79 (S03a); older mentions are not this port
        if pat.search(s['text']):
            hits.setdefault(s['version'], []).append(n)
            break

# module log versions taken (unit: [(module version, TV release)])
modules = {
    'ConfigState__ (barrel) 1.27.0-1.29.0': ['v2.115.0', 'v2.117.0', 'v2.149.0'],
    'ConfigState__KeyMap__ 1.1.0-1.11.0': ['v2.107.0', 'v2.112.0', 'v2.113.0', 'v2.114.0', 'v2.115.0', 'v2.117.0', 'v2.119.0', 'v2.130.0', 'v2.131.0', 'v2.149.0', 'v2.151.0'],
    'ConfigState__SheetSetup__ 1.5.0-1.9.0': ['v2.81.0', 'v2.94.0', 'v2.109.0', 'v2.140.0'],
    'ConfigState__ToolSetup__ 1.1.0-1.5.0': ['v2.78.0', 'v2.114.0', 'v2.119.0', 'v2.139.0', 'v2.144.0'],
    'ConfigState__EditorSetup__ 1.2.0-1.6.0': ['v2.111.0', 'v2.135.0', 'v2.143.0', 'v2.157.0', 'v2.163.0'],
    'Na__Hotkeys__DrawingTabs__.json (content)': [],
}
# check the module releases against the devlog: a release cited must exist and mention the unit or the key file
by_version = {s['version']: s for s in secs}
unit_words = {'ConfigState__ (barrel)': 'ConfigState', 'ConfigState__KeyMap__': 'KeyMap', 'ConfigState__SheetSetup__': 'SheetSetup',
              'ConfigState__ToolSetup__': 'ToolSetup', 'ConfigState__EditorSetup__': 'EditorSetup'}
module_check = {}
for mod, vers in modules.items():
    word = next((w for k, w in unit_words.items() if mod.startswith(k)), None)
    module_check[mod] = [(v, (v in by_version), bool(word and v in by_version and word in by_version[v]['text'])) for v in vers]
# key-file releases: sections naming the drawing-tab key file after v2.85
keyfile = [s['version'] for s in secs_oldest_first if vkey(s['version']) > (2, 85, 0) and re.search(r'Hotkeys__DrawingTabs__\.json|KeyMappings__\.json', s['text'])]
modules['Na__Hotkeys__DrawingTabs__.json (content)'] = keyfile

allv = set(hits) | {v for vs in modules.values() for v in vs}
table = []
for v in sorted(allv, key=vkey):
    s = by_version.get(v)
    table.append({'version': v, 'date': s['date'] if s else '?', 'title': s['title'] if s else '(not in the devlog at the pin)',
                  'status': status(s['text']) if s else '?', 'config_keys': sorted(hits.get(v, [])),
                  'modules': sorted(m for m, vs in modules.items() if v in vs)})
json.dump({'table': table, 'module_check': module_check, 'unmatched_names': sorted(n for n in names if not any(n in h for h in hits.values()))},
          open(os.path.join(HERE, 'tv_releases_covered.json'), 'w', encoding='utf-8'), indent=1)
for r in table:
    print('%-9s %-11s %-13s keys %-3d units %s | %s' % (r['version'], r['date'], r['status'], len(r['config_keys']), ', '.join(m.split(' ')[0] for m in r['modules']) or '-', r['title'][:90]))
print('releases:', len(table), ' NOT confirmed:', sum(1 for r in table if r['status'] == 'NOT confirmed'),
      ' confirmed:', sum(1 for r in table if r['status'] == 'confirmed'), ' not stated:', sum(1 for r in table if r['status'] == 'not stated'))
print('module release check (exists, names the unit):')
for m, cs in module_check.items():
    bad = [c for c in cs if not (c[1] and c[2])]
    print('  ', m, 'OK' if not bad else 'CHECK ' + str(bad))
