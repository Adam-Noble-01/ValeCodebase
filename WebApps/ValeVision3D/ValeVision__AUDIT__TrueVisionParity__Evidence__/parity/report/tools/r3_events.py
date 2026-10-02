"""R3 helper: window-event catalogue diff for Section C (e).
Reads parity/work_s09/event_catalogue.json (S09's read-only scan of both trees) and
parity/data/wp_canonical.json; maps VV paths to K2 targets and names the K3 package that
lands each TV-only dispatcher / listener. Prints markdown tables. Read-only on the apps."""
import json, os, re, sys
sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
PAR = os.path.join(HERE, '..', '..')
cat = json.load(open(os.path.join(PAR, 'work_s09', 'event_catalogue.json'), encoding='utf-8'))
wp = json.load(open(os.path.join(PAR, 'data', 'wp_canonical.json'), encoding='utf-8'))['packages']
VVMAP = {'40__System__2dElevationsView': '91__System__2dElevationsView',
         '42__System__DrawingViewCore': '40__System__DrawingViewCore',
         '43__System__FloorPlanViews': '42__System__FloorPlanViews',
         '44__System__PlanAnnotations': '43__System__PlanAnnotations',
         '45__System__PlanDimensions': '44__System__PlanDimensions',
         '46__System__ElevationViews': '45__System__ElevationViews',
         '47__System__NorthDirection': '46__System__NorthDirection'}

def short(p):
    p = p.replace('02__Src__AppModules/', '').replace('51__System__LayoutEditor/', 'LE/')
    return p

def k2(p):
    for a, b in VVMAP.items():
        if a + '/' in p:
            return p.replace(a + '/', b + '/')
    return p

def owner(tvpath):
    base = os.path.basename(tvpath)
    hits = []
    for p in wp:
        if p['wave'] == 'WT':
            continue
        for s in (p.get('tv_sources') or []):
            if base in str(s):
                hits.append(p['wp_id'])
                break
    return hits

def fmt(paths, vv=False):
    if not paths:
        return '-'
    return '<br>'.join('`' + short(k2(x) if vv else x) + '`' for x in paths)

mode = sys.argv[1] if len(sys.argv) > 1 else 'tvonly'
rows = [e for e in cat]
if mode == 'tvonly':
    print('| Event | TV dispatcher | TV listeners | Lands with (K3) |')
    print('|---|---|---|---|')
    for e in sorted(rows, key=lambda x: x['event']):
        if e['in_tv'] and not e['in_vv']:
            owners = sorted({o for f in e['tv_dispatch'] + e['tv_listen'] for o in owner(f)})
            print(f"| `{e['event']}` | {fmt(e['tv_dispatch'])} | {fmt(e['tv_listen'])} | {', '.join(owners) or '-'} |")
elif mode == 'vvonly':
    print('| Event | VV dispatcher (K2 path) | VV listeners (K2 path) |')
    print('|---|---|---|')
    for e in sorted(rows, key=lambda x: x['event']):
        if e['in_vv'] and not e['in_tv']:
            print(f"| `{e['event']}` | {fmt(e['vv_dispatch'], True)} | {fmt(e['vv_listen'], True)} |")
elif mode == 'counts':
    tv = sum(1 for e in rows if e['in_tv']); vv = sum(1 for e in rows if e['in_vv'])
    both = sum(1 for e in rows if e['in_tv'] and e['in_vv'])
    print('TV', tv, 'VV', vv, 'shared', both, 'TV-only', tv - both, 'VV-only', vv - both)
elif mode == 'shared_diff':
    print('| Event | TV dispatch | VV dispatch | TV-only listeners | VV-only listeners |')
    print('|---|---|---|---|---|')
    for e in sorted(rows, key=lambda x: x['event']):
        if not (e['in_tv'] and e['in_vv']):
            continue
        tvd = set(e['tv_dispatch']); vvd = {k2(x) for x in e['vv_dispatch']}
        tvl = set(e['tv_listen']); vvl = {k2(x) for x in e['vv_listen']}
        if tvd == vvd and tvl == vvl:
            continue
        print(f"| `{e['event']}` | {fmt(sorted(tvd))} | {fmt(sorted(vvd))} | {fmt(sorted(tvl - vvl))} | {fmt(sorted(vvl - tvl))} |")
