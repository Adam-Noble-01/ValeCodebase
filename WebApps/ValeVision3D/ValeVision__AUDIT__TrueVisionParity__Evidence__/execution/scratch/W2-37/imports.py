"""W2-37: resolve every import (and named binding) of the TV files against the live VV tree."""
import os, re, sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
LE57 = os.path.join(VV, r'02__Src__AppModules\51__System__LayoutEditor\57__Feature__ScrapbookParametric')
LE55 = os.path.join(VV, r'02__Src__AppModules\51__System__LayoutEditor\55__Feature__Scrapbook')
TESTS = os.path.join(VV, '80__Testing__PrototypeEnvironment')
SRC_DIR = os.path.join(HERE, sys.argv[1] if len(sys.argv) > 1 else 'tv')

HOME = {
    'Na__LayoutEditor__Scrapbook__TileDrag__.js': LE55,
    'Na__Test__ScrapbookScaleBar__.test.mjs': TESTS,
    'Na__Test__ScrapbookDrawingTitle__.test.mjs': TESTS,
}

IMP = re.compile(r'import\s*(?:\{([^}]*)\}\s*from\s*)?[\'"]([^\'"]+)[\'"]', re.S)
DYN = re.compile(r'import\(\s*[\'"]([^\'"]+)[\'"]')

def exports_of(path):
    t = open(path, encoding='utf-8', errors='replace').read()
    names = set()
    for m in re.finditer(r'export\s*\{([^}]*)\}', t, re.S):
        for n in m.group(1).split(','):
            n = re.sub(r'//.*', '', n).strip()
            if not n:
                continue
            if ' as ' in n:
                n = n.split(' as ')[1].strip()
            names.add(n)
    for m in re.finditer(r'export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z0-9_$]+)', t):
        names.add(m.group(1))
    return names

for name in (sorted(os.listdir(SRC_DIR)) if __name__ == '__main__' else []):
    if not name.endswith(('.js', '.mjs')):
        continue
    home = HOME.get(name, LE57)
    t = open(os.path.join(SRC_DIR, name), encoding='utf-8', errors='replace').read()
    print('==', name)
    for m in IMP.finditer(t):
        names, spec = m.group(1), m.group(2)
        if not spec.startswith('.'):
            print('   (bare)', spec); continue
        target = os.path.normpath(os.path.join(home, spec.replace('/', os.sep)))
        if not os.path.exists(target):
            print('   MISSING FILE', spec); continue
        if names:
            ex = exports_of(target) if target.endswith(('.js', '.mjs')) else set()
            want = []
            for n in names.split(','):
                n = re.sub(r'//.*', '', n).strip()
                if not n: continue
                n = n.split(' as ')[0].strip()
                want.append(n)
            miss = [n for n in want if n not in ex]
            print('   ok' if not miss else '   MISSING NAMES', spec, miss if miss else '')
        else:
            print('   ok (side-effect)', spec)
    for m in DYN.finditer(t):
        spec = m.group(1)
        target = os.path.normpath(os.path.join(home, spec.replace('/', os.sep)))
        print('   dyn', 'ok' if os.path.exists(target) else 'MISSING', spec)
