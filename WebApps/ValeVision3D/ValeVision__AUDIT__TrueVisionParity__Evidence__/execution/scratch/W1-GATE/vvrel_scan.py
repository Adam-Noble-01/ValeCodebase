"""W1 gate: every VVREL release placeholder in every file this wave touched (VV and WCP alike), by package id, and any
outside the PortNotes verifier's scope (VV 02__Src__AppModules, 03__Style__AppStylesheets,
80__Testing__PrototypeEnvironment and index.html) or outside a W1 id. Also sweeps the WCP Flask files and
execution/prepared (the scribe's other folders). Read-only."""
import json, os, re, sys

VCB = r'D:\10_CoreLib__ValeCodebase'
EXEC = os.path.join(VCB, r'WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution')
OUT = os.path.join(EXEC, 'scratch', 'W1-GATE')
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
rows = json.load(open(os.path.join(OUT, 'crosscheck.json'), encoding='utf-8'))
TOK = re.compile(r'\{\{VVREL[^}\n]*\}\}')
SCOPE = ('WebApps/ValeVision3D/02__Src__AppModules/', 'WebApps/ValeVision3D/03__Style__AppStylesheets/',
         'WebApps/ValeVision3D/80__Testing__PrototypeEnvironment/')
per_id, in_scope, out_scope, files = {}, 0, [], set()


def scan(rel, full):
    global in_scope
    try:
        text = open(full, encoding='utf-8', errors='replace').read()
    except Exception:
        return
    for i, ln in enumerate(text.splitlines(), 1):
        for m in TOK.finditer(ln):
            tid = m.group(0)
            per_id[tid] = per_id.get(tid, 0) + 1
            files.add(rel)
            if rel.startswith(SCOPE) or rel == 'WebApps/ValeVision3D/index.html':
                in_scope += 1
            else:
                out_scope.append('%s:%d  %s' % (rel, i, ln.strip()[:160]))


for r in rows:
    p = r['path']
    full = os.path.join(VCB, *p.split('/'))
    if os.path.isfile(full) and not p.endswith(('.png', '.pyc', '.zip', '.ttf', '.pdf')):
        scan(p, full)
# the scribe's other folders: WCP Flask files and execution/prepared
for fn in os.listdir(os.path.join(VCB, 'WebApps', 'Whitecardopedia')):
    if fn == 'server.py' or (fn.startswith('Server__ValeVision') and fn.endswith('.py')):
        scan('WebApps/Whitecardopedia/' + fn, os.path.join(VCB, 'WebApps', 'Whitecardopedia', fn))
for root, _, fns in os.walk(os.path.join(EXEC, 'prepared')):
    for fn in fns:
        full = os.path.join(root, fn)
        scan(os.path.relpath(full, VCB).replace('\\', '/'), full)
print('placeholders: %d in %d file(s) (in the verifier scope %d, outside it %d)' % (sum(per_id.values()), len(files), in_scope, len(out_scope)))
for k in sorted(per_id):
    print('  %-22s %d' % (k, per_id[k]))
print('outside the verifier scope:')
for x in out_scope:
    print('  ' + x)
