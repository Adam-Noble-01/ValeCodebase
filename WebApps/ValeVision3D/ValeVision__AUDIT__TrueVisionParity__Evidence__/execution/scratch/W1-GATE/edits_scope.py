"""W1 gate: which W1-touched paths are in no W1 package's declared edits / hot_files / vv_targets (wp_canonical.json),
and which W1 Port Record claims each one (strict = in its files part). New files a package creates are allowed
(policy 6); an existing file outside the lists must be an importer update named in the record. Read-only."""
import json, os, sys

EXEC = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution'
OUT = os.path.join(EXEC, 'scratch', 'W1-GATE')
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


owners, targets = {}, {}
for pk in doc['packages']:
    if pk['wave'] != 'W1':
        continue
    for e in pk.get('edits', []) + [h if isinstance(h, str) else h.get('path', '') for h in pk.get('hot_files', [])]:
        owners.setdefault(norm(e), set()).add(pk['wp_id'])
    for e in pk.get('vv_targets', []):
        targets.setdefault(norm(e), set()).add(pk['wp_id'])

rows = json.load(open(os.path.join(OUT, 'crosscheck.json'), encoding='utf-8'))
w1 = [r for r in rows if r['touched_in_w1']]
outside = []
for r in w1:
    pk = owners.get(r['path'])
    r['declared'] = sorted(pk) if pk else []
    r['target_of'] = sorted(targets.get(r['path'], []))
    if not pk:
        outside.append(r)
print('W1-touched paths: %d; in a W1 edits list: %d; outside every W1 edits list: %d' % (len(w1), len(w1) - len(outside), len(outside)))
new_files = [r for r in outside if r['code'] == '??']
existing = [r for r in outside if r['code'] != '??']
print('  of which NEW files: %d; EXISTING files: %d' % (len(new_files), len(existing)))
print('\n== EXISTING files outside every W1 edits list ==')
for r in existing:
    print('  %s %s  vv_target of %s  strict W1 records: %s' % (r['code'], r['path'], ','.join(r['target_of']) or '-', ','.join(r['w1_strict']) or '-'))
print('\n== NEW files outside every W1 edits list ==')
for r in new_files:
    print('  %s  vv_target of %s  strict W1 records: %s' % (r['path'], ','.join(r['target_of']) or '-', ','.join(r['w1_strict']) or ','.join(r['w1_loose']) or '-'))
# declared edits of DONE packages that were NOT touched (for the record)
DONE = set('W1-01 W1-02 W1-03 W1-04 W1-05 W1-08 W1-09 W1-10 W1-11 W1-12 W1-13 W1-14 W1-15 W1-16 W1-18 W1-23 W1-24 W1-29 W1-30 W1-31 W1-32 W1-33 W1-34 W1-35 W1-06 W1-17'.split())
touched = set(r['path'] for r in w1)
print('\n== declared edits of run packages that are not dirty-in-W1 (unchanged or never written) ==')
for path, pks in sorted(owners.items()):
    run = sorted(p for p in pks if p in DONE)
    if run and path not in touched:
        print('  %s  <- %s' % (path, ','.join(run)))
