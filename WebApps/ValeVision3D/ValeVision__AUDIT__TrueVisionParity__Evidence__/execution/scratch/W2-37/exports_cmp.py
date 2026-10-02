"""W2-37: exports VV-before vs TV-pin per module, and every VV importer's names against the TV exports."""
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from imports import exports_of  # noqa: E402  (imports.py runs its report at import; harmless)

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
SCAN = [os.path.join(VV, '02__Src__AppModules'), os.path.join(VV, '80__Testing__PrototypeEnvironment')]
MODS = [n for n in os.listdir(os.path.join(HERE, 'tv')) if n.endswith('.js')]
BUILT = os.path.join(HERE, sys.argv[1]) if len(sys.argv) > 1 else os.path.join(HERE, 'tv')

for n in sorted(MODS):
    if n.startswith('Na__LayoutEditor__Panel__'):
        continue
    before = exports_of(os.path.join(HERE, 'vv_before', n))
    after = exports_of(os.path.join(BUILT, n)) if os.path.exists(os.path.join(BUILT, n)) else exports_of(os.path.join(HERE, 'tv', n))
    print('==', n, 'removed:', sorted(before - after), 'added:', len(after - before))
    for root in SCAN:
        for dp, dn, fn in os.walk(root):
            dn[:] = [d for d in dn if d not in ('node_modules', '.claude')]
            for f in fn:
                if not f.endswith(('.js', '.mjs')) or f == n:
                    continue
                t = open(os.path.join(dp, f), encoding='utf-8', errors='replace').read()
                for m in re.finditer(r'import\s*\{([^}]*)\}\s*from\s*[\'"]([^\'"]*' + re.escape(n) + r')[\'"]', t, re.S):
                    want = [re.sub(r'//.*', '', x).strip().split(' as ')[0].strip() for x in m.group(1).split(',')]
                    miss = [w for w in want if w and w not in after]
                    print('   importer', os.path.relpath(os.path.join(dp, f), VV), 'MISSING ' + str(miss) if miss else 'ok')
