"""W0 gate: which changed paths are in no W0 package's declared edits list (wp_canonical.json), and which package's
Port Record claims each one. Read-only."""
import json, os, sys
EXEC = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution'
OUT = os.path.join(EXEC, 'scratch', 'W0-GATE')
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
doc = json.load(open(os.path.join(EXEC, '..', 'parity', 'data', 'wp_canonical.json'), encoding='utf-8'))

def norm(p):
    p = p.strip().split(' ')[0].replace('\\', '/')
    for a, b in (('VVM/', 'WebApps/ValeVision3D/02__Src__AppModules/'), ('LE/', 'WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/'),
                 ('VV/', 'WebApps/ValeVision3D/'), ('WCP/', 'WebApps/Whitecardopedia/'), ('VCB/', '')):
        if p.startswith(a):
            return b + p[len(a):]
    return p

owners = {}
for pk in doc['packages']:
    if pk['wave'] != 'W0':
        continue
    for e in pk.get('edits', []) + [h if isinstance(h, str) else h.get('path', '') for h in pk.get('hot_files', [])]:
        owners.setdefault(norm(e), set()).add(pk['wp_id'])

rows = json.load(open(os.path.join(OUT, 'crosscheck_strict.json'), encoding='utf-8'))
outside = []
for r in rows:
    pk = owners.get(r['path']) or (owners.get(r['old']) if r['old'] else None)
    r['declared'] = sorted(pk) if pk else []
    if not pk:
        outside.append(r)
json.dump(rows, open(os.path.join(OUT, 'edits_scope.json'), 'w', encoding='utf-8', newline='\n'), indent=1, ensure_ascii=False)
print('changed paths: %d; in a W0 edits list: %d; outside every W0 edits list: %d' % (len(rows), len(rows) - len(outside), len(outside)))
for r in outside:
    print('%s %s%s  claimed by %s' % (r['code'], r['path'], (' (from ' + r['old'] + ')') if r['old'] else '', ','.join(r['strict']) or '-'))
