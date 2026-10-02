import re, os, sys
VV = r'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels'
HERE = os.path.dirname(os.path.abspath(__file__))
files = sys.argv[1:] or ['tv__Na__LayoutEditor__Panel__Dimensions__.js', 'tv__Na__LayoutEditor__Panel__Shapes__.js']
bad = 0
for f in files:
    p = f if os.path.isabs(f) else os.path.join(HERE, f)
    text = open(p, encoding='utf-8').read()
    for m in re.finditer(r"import\s*\{([^}]*)\}\s*from\s*'([^']+)'", text):
        names = [n.strip() for n in m.group(1).split(',') if n.strip()]
        target = os.path.normpath(os.path.join(VV, m.group(2)))
        if not os.path.exists(target):
            print('MISSING MODULE', f, m.group(2)); bad += 1; continue
        src = open(target, encoding='utf-8', errors='replace').read()
        exp = re.findall(r'export\s*\{([^}]*)\}', src)
        exported = set()
        for e in exp:
            for n in e.split(','):
                n = re.sub(r'//.*', '', n).strip()
                if n: exported.add(n.split(' as ')[-1].strip())
        for fn in re.findall(r'export\s+(?:async\s+)?(?:function|const|let|class)\s+(\w+)', src):
            exported.add(fn)
        for n in names:
            if n not in exported:
                print('MISSING EXPORT', f, m.group(2), n); bad += 1
print('bad =', bad)
