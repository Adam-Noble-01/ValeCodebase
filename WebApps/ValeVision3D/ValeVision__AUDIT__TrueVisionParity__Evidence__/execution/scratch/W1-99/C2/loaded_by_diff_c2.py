"""W1-99 (continuation) - read-only: every Module Register row whose module exists in ValeVision now, with its current
"Loaded by" cell and what importers.py computes today. Lists the rows where an inert module ("nothing imports it yet")
now has an importer, and every other difference in the first importer named, for the scribe's review.
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'W0-99'))
sys.path.insert(0, os.path.join(HERE, '..'))
import ledger_lib as L                                  # noqa: E402
import importers as IMP                                 # noqa: E402

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass


def main():
    lines = L.read_lines()
    reg = L.register_rows(lines)
    out_inert, out_other = [], []
    for r in reg:
        vv, tv = L.row_paths(r)
        rel = vv or (tv if r['cells'][0] == 'same path' else None)
        if vv is None:
            continue
        p = os.path.join(L.VV, '02__Src__AppModules', *vv.split('/'))
        if not os.path.exists(p):
            continue
        now = IMP.loaded_by(vv)
        cur = r['cells'][7]
        cur_head = cur.split(' [was:')[0].strip()
        if cur_head.startswith('- (nothing imports it yet') or cur_head == '-':
            if now != '-':
                out_inert.append('%s [%s]\n    now : %s\n    cell: %s' % (vv, r['sub'], now, cur))
        else:
            first_cur = cur_head.split(' (+')[0].split(' - ')[0].strip()
            first_now = now.split(' (+')[0].strip()
            if first_cur != first_now and not cur_head.startswith('named by'):
                out_other.append('%s [%s]\n    now : %s\n    cell: %s' % (vv, r['sub'], now, cur))
    print('inert rows that now have an importer: %d' % len(out_inert))
    print('\n'.join(out_inert))
    print('\nother rows whose first importer differs: %d' % len(out_other))
    print('\n'.join(out_other))


if __name__ == '__main__':
    main()
