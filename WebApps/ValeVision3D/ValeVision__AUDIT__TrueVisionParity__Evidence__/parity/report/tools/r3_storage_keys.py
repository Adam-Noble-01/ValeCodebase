"""R3 helper: browser-storage key literals in the drawing systems of both apps (read-only scan).
Heuristic: files that touch localStorage / sessionStorage / indexedDB; collect quoted string literals
that look like storage keys or key prefixes (na-..., Na__..., TrueVision3D__..., ValeVision3D__...)
declared in constants whose name contains KEY / STORAGE / PREFIX / DB, or passed straight to
getItem / setItem / removeItem / indexedDB.open."""
import os, re, sys, json
sys.stdout.reconfigure(encoding='utf-8')
ROOTS = {'TV': 'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb/na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules',
         'VV': 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules'}
SCOPE = re.compile(r'^(03__AppUtils|27__|4\d__|5\d__)')
DECL = re.compile(r"const\s+(\w*(?:KEY|Key|STORAGE|Storage|PREFIX|Prefix|DB|Db)\w*)\s*=\s*'([^']+)'")
CALL = re.compile(r"(?:getItem|setItem|removeItem|indexedDB\.open)\(\s*'([^']+)'")
out = {}
for app, root in ROOTS.items():
    for dp, dn, fn in os.walk(root):
        rel = os.path.relpath(dp, root).replace(chr(92), '/')
        if rel == '.':
            continue
        if not SCOPE.match(rel) or 'node_modules' in rel or 'CloudflareWorker' in rel:
            continue
        for f in fn:
            if not f.endswith('.js'):
                continue
            p = os.path.join(dp, f)
            t = open(p, encoding='utf-8', errors='replace').read()
            if not re.search(r'localStorage|sessionStorage|indexedDB', t):
                continue
            keys = set()
            for m in DECL.finditer(t):
                v = m.group(2)
                if re.match(r'^(na-|Na__|TrueVision|ValeVision)', v):
                    keys.add(v)
            for m in CALL.finditer(t):
                keys.add(m.group(1))
            for k in keys:
                out.setdefault(k, {}).setdefault(app, []).append(rel + '/' + f)
rows = sorted(out.items())
for k, v in rows:
    tv = 'TV' in v
    vv = 'VV' in v
    where = (v.get('TV') or v.get('VV'))[0]
    print(f"{'both' if tv and vv else ('TV' if tv else 'VV')} | {k} | {where}")
print(len(rows), 'keys')
