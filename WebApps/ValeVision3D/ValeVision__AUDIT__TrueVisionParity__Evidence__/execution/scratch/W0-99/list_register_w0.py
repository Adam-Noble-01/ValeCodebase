"""W0-99 - read-only: the Module Register rows Wave 0 touched (file changed since HEAD, or a W0 package named)."""
import collections, sys
import ledger_lib as L

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

lines = L.read_lines()
rows = L.register_rows(lines)
print('register rows', len(rows), dict(collections.Counter(r['sub'] for r in rows)))
ch = L.w0_changed()
print('changed files under 02__Src__AppModules (new path, no deletions):', len(ch))
covered = set()
n = 0
for r in rows:
    vv, tv = L.row_paths(r)
    key = vv or tv
    covered.add(key)
    w0pk = [p.strip() for p in r['cells'][10].split(',') if p.strip().startswith('W0-')]
    changed = key in ch
    if changed or w0pk:
        n += 1
        c = r['cells']
        print('--- %s L%d %s | changed=%s mentions=%s | W0 in Packages %s' % (r['sub'], r['i'] + 1, key, changed, ch.get(key), w0pk))
        print('     srcver: %s | tvcur: %s' % (c[2], c[3]))
        print('     parity: %s' % c[4][:220])
        print('     div   : %s' % c[5][:220])
        print('     open  : %s | transport: %s | packages: %s' % (c[6][:60], c[8][:110], c[10]))
print('rows touched or naming W0:', n)
print('=== changed files with NO register row:')
for k in sorted(ch):
    if k not in covered:
        print('   ', k, ch[k])
