"""W0 gate: every {{VVREL:<id>}} placeholder in every file this wave changed (VV and WCP alike), with its id and line.
Read-only. Compares against the PortNotes verifier's PENDING scope (VV 02__Src__AppModules, 03__Style__AppStylesheets,
80__Testing__PrototypeEnvironment and index.html)."""
import json, os, re, sys
VCB = r'D:\10_CoreLib__ValeCodebase'
OUT = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W0-GATE'
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
rows = json.load(open(os.path.join(OUT, 'crosscheck.json'), encoding='utf-8'))
TOK = re.compile(r'\{\{VVREL[^}\n]*\}\}')
SCOPE = ('WebApps/ValeVision3D/02__Src__AppModules/', 'WebApps/ValeVision3D/03__Style__AppStylesheets/',
         'WebApps/ValeVision3D/80__Testing__PrototypeEnvironment/')
per_id, in_scope, out_scope = {}, 0, []
for r in rows:
    p = r['path']
    full = os.path.join(VCB, *p.split('/'))
    if not os.path.isfile(full) or p.endswith(('.png', '.pyc', '.zip')) or '04__Lib__ThirdParty' in p:
        continue
    try:
        text = open(full, encoding='utf-8', errors='replace').read()
    except Exception:
        continue
    for i, ln in enumerate(text.splitlines(), 1):
        for m in TOK.finditer(ln):
            tid = m.group(0)
            per_id[tid] = per_id.get(tid, 0) + 1
            scoped = p.startswith(SCOPE) or p == 'WebApps/ValeVision3D/index.html'
            if scoped:
                in_scope += 1
            else:
                out_scope.append('%s:%d  %s' % (p, i, ln.strip()[:160]))
print('placeholders in changed files: %d (in the verifier scope %d, outside it %d)' % (sum(per_id.values()), in_scope, len(out_scope)))
for k in sorted(per_id):
    print('  %-22s %d' % (k, per_id[k]))
print('outside the verifier scope:')
for x in out_scope:
    print('  ' + x)
