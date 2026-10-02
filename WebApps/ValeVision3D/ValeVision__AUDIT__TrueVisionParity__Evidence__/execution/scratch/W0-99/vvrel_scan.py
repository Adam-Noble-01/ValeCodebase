"""W0-99 scribe: list every {{VVREL:...}} placeholder, in scope (VV 02/03/80 + index.html) and outside it.

Read-only. Walks named folders only (never .claude/worktrees, node_modules or the AUDIT evidence folder).
Usage: python vvrel_scan.py [--json out.json]
"""
import json, os, re, sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

VCB = r'D:\10_CoreLib__ValeCodebase'
VV = os.path.join(VCB, 'WebApps', 'ValeVision3D')
WCP = os.path.join(VCB, 'WebApps', 'Whitecardopedia')
TOK = re.compile(r'\{\{VVREL[^}\n]*\}\}')
SKIP_DIRS = {'.claude', 'node_modules', '.git', '__pycache__', '.wrangler'}
TEXT_EXT = ('.js', '.mjs', '.cjs', '.css', '.html', '.json', '.md', '.py', '.txt', '.toml', '.bat', '.ps1', '.rb')

IN_SCOPE_DIRS = ['02__Src__AppModules', '03__Style__AppStylesheets', '80__Testing__PrototypeEnvironment']
OTHER_VV_DIRS = ['01__AppAssets__ValeVision', '04__Lib__ThirdParty__VersionLocked', '50__ValeVision__UserConfig',
                 '51__LayoutEditor__UserScrapbookContent']


def walk(root):
    for dp, dn, fn in os.walk(root):
        dn[:] = [d for d in dn if d not in SKIP_DIRS and not d.startswith('ValeVision__AUDIT__')]
        for f in fn:
            if f.lower().endswith(TEXT_EXT):
                yield os.path.join(dp, f)


def scan_file(path):
    hits = []
    try:
        data = open(path, 'rb').read()
    except Exception:
        return hits
    text = data.decode('utf-8', errors='replace')
    for i, ln in enumerate(text.splitlines(), 1):
        for m in TOK.finditer(ln):
            hits.append({'line': i, 'token': m.group(0), 'text': ln.strip()[:200]})
    return hits


def rel(p):
    return os.path.relpath(p, VCB).replace(os.sep, '/')


def main():
    out = {'in_scope': [], 'vv_other': [], 'vv_root_files': [], 'wcp': []}
    for d in IN_SCOPE_DIRS:
        for p in walk(os.path.join(VV, d)):
            for h in scan_file(p):
                out['in_scope'].append(dict(file=rel(p), **h))
    for h in scan_file(os.path.join(VV, 'index.html')):
        out['in_scope'].append(dict(file=rel(os.path.join(VV, 'index.html')), **h))
    for d in OTHER_VV_DIRS:
        root = os.path.join(VV, d)
        if os.path.isdir(root):
            for p in walk(root):
                for h in scan_file(p):
                    out['vv_other'].append(dict(file=rel(p), **h))
    for f in sorted(os.listdir(VV)):
        p = os.path.join(VV, f)
        if os.path.isfile(p) and f.lower().endswith(TEXT_EXT) and f != 'index.html':
            for h in scan_file(p):
                out['vv_root_files'].append(dict(file=rel(p), **h))
    for f in sorted(os.listdir(WCP)):
        p = os.path.join(WCP, f)
        if os.path.isfile(p) and f.lower().endswith(TEXT_EXT):
            for h in scan_file(p):
                out['wcp'].append(dict(file=rel(p), **h))
    for k in ('in_scope', 'vv_other', 'vv_root_files', 'wcp'):
        rows = out[k]
        ids = {}
        for r in rows:
            ids[r['token']] = ids.get(r['token'], 0) + 1
        print('%-14s %3d tokens in %2d files  %s' % (k, len(rows), len({r['file'] for r in rows}),
                                                    ', '.join('%s x%d' % (t, n) for t, n in sorted(ids.items()))))
    print()
    for k in ('vv_other', 'vv_root_files', 'wcp'):
        for r in out[k]:
            print('  [%s] %s:%d  %s' % (k, r['file'], r['line'], r['text']))
    if '--json' in sys.argv:
        dst = sys.argv[sys.argv.index('--json') + 1]
        with open(dst, 'w', encoding='utf-8', newline='\n') as fh:
            json.dump(out, fh, indent=1)
        print('wrote', dst)


if __name__ == '__main__':
    main()
