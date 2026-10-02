"""W1-99: the W1-touched paths (from the gate's crosscheck.json) with their owning package(s), and the ledger's Module
Register row each one matches (by VV path, or by TV path for TrueVision-only rows). Read-only.

Usage: python -B w1_files.py [--rows]     (--rows also prints each matched row's cells)
Writes w1_files.json (the list, used by update_ledger_w1.py).
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'W0-99'))
import ledger_lib as L                                  # noqa: E402  (W0-99's read-only helpers)

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

d = json.load(open(os.path.join(L.EXEC, 'scratch', 'W1-GATE', 'crosscheck.json'), encoding='utf-8'))
w1 = [r for r in d if r.get('touched_in_w1')]
lines = L.read_lines()
reg = L.register_rows(lines)
by_vv, by_tv = {}, {}
for r in reg:
    vv, tv = L.row_paths(r)
    if vv:
        by_vv.setdefault(vv, []).append(r)
    if tv:
        by_tv.setdefault(tv, []).append(r)
PFX = 'WebApps/ValeVision3D/02__Src__AppModules/'
out = []
for r in sorted(w1, key=lambda x: x['path']):
    p = r['path']
    owners = r.get('w1_strict') or r.get('w1_loose') or []
    rel = p[len(PFX):] if p.startswith(PFX) else None
    rows = (by_vv.get(rel) or by_tv.get(rel) or []) if rel else []
    out.append({'path': p, 'code': r['code'], 'owners': owners, 'rel': rel,
                'rows': [{'i': x['i'], 'sub': x['sub'], 'cells': x['cells']} for x in rows]})
json.dump(out, open(os.path.join(HERE, 'w1_files.json'), 'w', encoding='utf-8'), indent=1)
show = '--rows' in sys.argv
nrow = 0
for o in out:
    tag = ','.join('%s:%d' % (x['sub'], x['i'] + 1) for x in o['rows']) or '-'
    nrow += 1 if o['rows'] else 0
    print('%-3s %-110s %-14s %s' % (o['code'].strip() or '?', o['path'][21:], '/'.join(o['owners']), tag))
    if show:
        for x in o['rows']:
            print('      ' + ' || '.join(c[:140] for c in x['cells']))
print('W1-touched paths: %d; with a register row: %d' % (len(out), nrow))
