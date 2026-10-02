"""W2-99 (adapted from W1-99 C2) - the Module Register's "Blocked by" cell for each row, from the port-order map re-run on
the end-of-Wave-2 working tree (scratch/W2-99/pom/port_order_map__endW2.json). The cell rules are W0-99's
(scratch/W0-99/blocked_by.py, imported unchanged); only the map differs.

Run alone it compares the end-of-continuation cells with the cells in the ledger now (part 1's end-of-Wave-1 state).
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'W0-99'))
import ledger_lib as L                                  # noqa: E402
import blocked_by as BB0                                # noqa: E402  (cell_for, compute: pure functions)

MAP = os.path.join(HERE, 'pom', 'port_order_map__endW2.json')


def load_map():
    return json.load(open(MAP, encoding='utf-8'))['modules']


def compute(rows, mods):
    return BB0.compute(rows, mods)


def cell_for(mod):
    return BB0.cell_for(mod)


if __name__ == '__main__':
    import collections
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    lines = L.read_lines()
    rows = L.register_rows(lines)
    mods = load_map()
    res = compute(rows, mods)
    kinds = collections.Counter('none' if v == 'none' else '-' if v == '-' else 'list' for v in res.values())
    old = collections.Counter('none' if r['cells'][11] == 'none' else '-' if r['cells'][11] == '-' else 'list' for r in rows)
    print('rows', len(rows), 'end of W1 continuation:', dict(kinds), ' ledger now (end of W1 part 1):', dict(old))
    changed = [(r, res[r['i']]) for r in rows if r['cells'][11] != res[r['i']]]
    print('cells that change:', len(changed))
    cleared = [r for r, v in changed if v == 'none']
    print('  cleared to none:', len(cleared))
    for r, v in changed[:400]:
        print('  %s | %s\n      was: %s\n      now: %s' % (r['sub'], (r['cells'][0] if not r['cells'][0].startswith('-') else r['cells'][1])[:110],
                                                    r['cells'][11][:220], v[:220]))
