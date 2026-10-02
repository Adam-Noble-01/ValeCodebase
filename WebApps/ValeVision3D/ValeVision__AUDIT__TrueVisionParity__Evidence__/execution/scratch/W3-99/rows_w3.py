"""W2-99 - read-only: which Module Register row each Wave-2-touched module has (3.1-3.6), with its current cells and the
PORT NOTE fields as the file now stands. Writes rows_w2.txt (for review) and rows_w2.json (for update_ledger_w2.py)."""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'W0-99'))
import ledger_lib as L                                  # noqa: E402

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

SRC = '02__Src__AppModules/'


def main():
    pf = json.load(open(os.path.join(HERE, 'portnote_fields_w3.json'), encoding='utf-8'))
    lines = L.read_lines()
    rows = L.register_rows(lines)
    by_vv, by_tv = {}, {}
    for r in rows:
        vv, tv = L.row_paths(r)
        if vv:
            by_vv.setdefault(vv, []).append(r)
        if r['cells'][0].startswith('- (lands') and tv:
            by_tv.setdefault(tv, []).append(r)
    out, txt, missing = [], [], []
    for x in pf:
        if not x['rel'].startswith(SRC):
            missing.append(x['rel'] + '  (outside 02__Src__AppModules)')
            continue
        rel = x['rel'][len(SRC):]
        hit = by_vv.get(rel) or by_tv.get(rel) or []
        if len(hit) != 1:
            missing.append('%s  (%d rows) %s' % (rel, len(hit), x['pk']))
            continue
        r = hit[0]
        out.append({'rel': rel, 'i': r['i'], 'sub': r['sub'], 'landed': r['cells'][0].startswith('- (lands'),
                    'pk': x['pk'], 'deleted': x.get('deleted', False), 'f': x.get('f', {}), 'cells': r['cells']})
        c = r['cells']
        f = x.get('f', {})
        txt.append('== %s [%s%s] %s %s' % (rel, r['sub'], ' LANDS' if r['cells'][0].startswith('- (lands') else '',
                                             x['pk'], 'DELETED' if x.get('deleted') else ''))
        txt.append('   row src : %s' % c[2][:300])
        txt.append('   row cur : %s | parity: %s' % (c[3], c[4][:300]))
        txt.append('   row open: %s' % c[6][:300])
        txt.append('   row pk  : %s | blocked: %s' % (c[10], c[11][:160]))
        for k in ('Source version', 'Parity', 'log'):
            if k in f:
                txt.append('   PN %-6s: %s' % (k[:6], f[k][:300]))
    json.dump(out, open(os.path.join(HERE, 'rows_w3.json'), 'w', encoding='utf-8'), indent=1)
    txt.append('\nNO ROW (%d):' % len(missing))
    txt += ['   ' + m for m in missing]
    open(os.path.join(HERE, 'rows_w3.txt'), 'w', encoding='utf-8', newline='\n').write('\n'.join(txt) + '\n')
    print('rows found:', len(out), ' no row:', len(missing))


if __name__ == '__main__':
    main()
