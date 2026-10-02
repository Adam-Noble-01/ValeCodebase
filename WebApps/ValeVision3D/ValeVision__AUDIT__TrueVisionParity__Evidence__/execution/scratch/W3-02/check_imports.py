import re, os, sys
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\54__Feature__SheetImages'
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), 'tv')
imp_re = re.compile(r"import\s*\{([^}]*)\}\s*from\s*'([^']+)'", re.S)
bad = 0
for f in sorted(os.listdir(SRC)):
    if not f.endswith('.js'):
        continue
    text = open(os.path.join(SRC, f), encoding='utf-8').read()
    for names, path in imp_re.findall(text):
        target = os.path.normpath(os.path.join(VV, path))
        names = [n.split(' as ')[0].strip() for n in re.sub(r'//[^\n]*', '', names).split(',') if n.strip()]
        local = os.path.basename(target) in [x for x in os.listdir(SRC)]
        if not os.path.exists(target):
            tag = 'IN-SET' if local else 'MISSING-FILE'
            if not local: bad += 1
            print(f'{f}: {tag} {path}')
            continue
        t = open(target, encoding='utf-8').read()
        for n in names:
            if not re.search(r'export\s+(?:async\s+)?(?:function\s*\*?\s*|const\s+|let\s+|var\s+|class\s+)' + re.escape(n) + r'\b', t) and not re.search(r'export\s*\{[^}]*\b' + re.escape(n) + r'\b', t):
                bad += 1
                print(f'{f}: MISSING-EXPORT {n} in {path}')
print('bad', bad)
