"""R3 helper: list TV drawing-scope config JSON files and whether VV has them at the K2 target path.
Read-only: works from parity/ref/tree_tv.tsv and tree_vv.tsv only."""
import csv, re, sys, os
sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, '..', '..', 'ref')

def rd(name):
    rows = list(csv.DictReader(open(os.path.join(REF, name), encoding='utf-8'), delimiter='\t'))
    return {r['relpath'].replace(chr(92), '/'): r for r in rows}

tv = rd('tree_tv.tsv')
vv = rd('tree_vv.tsv')
VVMAP = {'40__System__2dElevationsView': '91__System__2dElevationsView',
         '42__System__DrawingViewCore': '40__System__DrawingViewCore',
         '43__System__FloorPlanViews': '42__System__FloorPlanViews',
         '44__System__PlanAnnotations': '43__System__PlanAnnotations',
         '45__System__PlanDimensions': '44__System__PlanDimensions',
         '46__System__ElevationViews': '45__System__ElevationViews',
         '47__System__NorthDirection': '46__System__NorthDirection'}

def k2(p):
    for a, b in VVMAP.items():
        if '/' + a + '/' in p:
            return p.replace('/' + a + '/', '/' + b + '/')
    return p

vvk = {k2(p): p for p in vv}
scope = re.compile(r'^02__Src__AppModules/(27__|4\d__|5\d__|80__Cloud)')
rows = []
for p, r in tv.items():
    if not scope.match(p) or not p.endswith('.json'):
        continue
    if '/03__Core__Config/' in p:
        continue
    rows.append((p, r['lines'], 'yes' if p in vvk else 'NO'))
rows.sort()
mode = sys.argv[1] if len(sys.argv) > 1 else 'all'
for p, l, h in rows:
    if mode == 'missing' and h == 'yes':
        continue
    print(h, l, p.replace('02__Src__AppModules/', ''))
print(len(rows), 'rows;', sum(1 for r in rows if r[2] == 'NO'), 'missing in VV')
