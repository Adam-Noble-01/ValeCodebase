"""W0-99 - the Module Register's "Blocked by" cell for each row, from the port-order map re-run on the end-of-Wave-0
working tree (scratch/W0-99/pom/port_order_map__endW0.json; W0-05's analysis, unchanged apart from the tree it reads).

Cell values:
  none                      the TV module is in the map and nothing it imports is missing in ValeVision now
  <list>                    the TV modules (or names) still missing, each with the package that lands it
  -                         no TV module at this row's path is in the map (VV-only, configuration, or not reachable from
                            any whole-file take)
"""
import json, os
import ledger_lib as L

MAP = os.path.join(L.EXEC, 'scratch', 'W0-99', 'pom', 'port_order_map__endW0.json')


def load_map():
    return json.load(open(MAP, encoding='utf-8'))['modules']


def landers_for(mod):
    """import path -> sorted landers (from blocked_by_with_landers)."""
    out = {}
    for e in mod.get('blocked_by_with_landers') or []:
        lb = e.get('landed_by')
        imp = e.get('import')
        if imp is None:
            continue
        s = out.setdefault(imp, set())
        if lb:
            if isinstance(lb, list):
                s.update(lb)
            else:
                s.add(lb)
    return {k: sorted(v) for k, v in out.items()}


def cell_for(mod, max_items=3):
    missing = list(mod.get('blocked_by_missing') or [])
    upgrade = dict(mod.get('blocked_by_upgrade') or {})
    if not missing and not upgrade:
        return 'none'
    land = landers_for(mod)
    items = []
    for p in sorted(missing):
        items.append((os.path.basename(p), 'missing', land.get(p, [])))
    for p in sorted(upgrade):
        n = len(upgrade[p])
        items.append((os.path.basename(p), '+%d name%s' % (n, '' if n == 1 else 's'), land.get(p, [])))
    def fmt(it):
        name, what, by = it
        return '`%s` (%s%s)' % (name, what, (', ' + '/'.join(by)) if by else ', no lander')
    if len(items) <= max_items + 1:
        return '; '.join(fmt(it) for it in items)
    shown = '; '.join(fmt(it) for it in items[:max_items])
    rest = items[max_items:]
    by_all = sorted({b for it in rest for b in it[2]})
    return '%d modules: %s; and %d more (%s)' % (len(items), shown, len(rest),
                                                ('landed by ' + ', '.join(by_all)) if by_all else 'no lander')


def compute(rows, mods):
    res = {}
    for r in rows:
        vv, tv = L.row_paths(r)
        if r['sub'] == '3.6' or tv is None:
            res[r['i']] = '-'
            continue
        key = L.SRC + tv
        res[r['i']] = cell_for(mods[key]) if key in mods else '-'
    return res


if __name__ == '__main__':
    import collections, sys
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    lines = L.read_lines()
    rows = L.register_rows(lines)
    mods = load_map()
    res = compute(rows, mods)
    kinds = collections.Counter('none' if v == 'none' else '-' if v == '-' else 'list' for v in res.values())
    print('rows', len(rows), dict(kinds))
    by_sub = collections.Counter((r['sub'], 'none' if res[r['i']] == 'none' else '-' if res[r['i']] == '-' else 'list') for r in rows)
    for k in sorted(by_sub):
        print('  ', k, by_sub[k])
    print('max cell length', max(len(v) for v in res.values()))
    for r in rows[:4] + [x for x in rows if 'ModeController__.js' in x['cells'][0] or 'ModeController__.js' in x['cells'][1]][:3]:
        print(r['sub'], r['cells'][0][:70], r['cells'][1][:40], '=>', res[r['i']][:400])
    in_map_not_rows = set(mods) - {L.SRC + (L.row_paths(r)[1] or '') for r in rows}
    print('map modules with no register row:', len(in_map_not_rows))
    for k in sorted(in_map_not_rows)[:40]:
        print('   ', k)
