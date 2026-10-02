"""W1-99 (continuation) - read-only: the Module Register rows of every 02__Src__AppModules file the continuation touched
(from the W1 gate's crosscheck_c2.json), matched by ValeVision path, or by TrueVision path for a 3.5 row; and the touched
files that have no row. Writes rows_c2.txt (full cells) and rows_c2.json.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'W0-99'))
import ledger_lib as L                                  # noqa: E402

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

CROSS = os.path.join(L.EXEC, 'scratch', 'W1-GATE', 'C2', 'crosscheck_c2.json')
COLS = ['VV path', 'TV path', 'TV source ver', 'TV current ver', 'Parity', 'Divergences', 'Open TV versions', 'Loaded by',
        'Transport', 'Checked', 'Packages', 'Blocked by']


def main():
    d = json.load(open(CROSS, encoding='utf-8'))
    pre = 'WebApps/ValeVision3D/02__Src__AppModules/'
    touched = {}
    for r in d:
        if r.get('touched_in_cont') and r['path'].startswith(pre):
            touched[r['path'][len(pre):]] = r.get('strict_cont') or []
    lines = L.read_lines()
    reg = L.register_rows(lines)
    by_vv, by_tv = {}, {}
    for r in reg:
        vv, tv = L.row_paths(r)
        if vv:
            by_vv.setdefault(vv, []).append(r)
        if tv and r['sub'] == '3.5':
            by_tv.setdefault(tv, []).append(r)
    out, js, nomatch = [], [], []
    for rel in sorted(touched):
        rows = by_vv.get(rel) or by_tv.get(rel) or []
        if not rows:
            nomatch.append(rel)
            continue
        for r in rows:
            out.append('=' * 100)
            out.append('%s  [%s] line %d  packages-of-change %s' % (rel, r['sub'], r['i'] + 1, touched[rel]))
            for k, c in zip(COLS, r['cells']):
                out.append('  %-16s %s' % (k, c))
            js.append({'rel': rel, 'sub': r['sub'], 'line': r['i'] + 1, 'pk': touched[rel], 'cells': r['cells']})
    out.append('=' * 100)
    out.append('touched files with no register row (%d):' % len(nomatch))
    out += ['  ' + x for x in nomatch]
    open(os.path.join(HERE, 'rows_c2.txt'), 'w', encoding='utf-8', newline='\n').write('\n'.join(out) + '\n')
    json.dump(js, open(os.path.join(HERE, 'rows_c2.json'), 'w', encoding='utf-8'), indent=1)
    print('touched under 02__Src__AppModules: %d; rows found: %d; no row: %d' % (len(touched), len(js), len(nomatch)))
    for x in nomatch:
        print('  no row: ' + x)


if __name__ == '__main__':
    main()
