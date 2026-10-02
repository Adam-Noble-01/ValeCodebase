import re, os, sys
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\57__Feature__ScrapbookParametric'
src = open(os.path.join(os.path.dirname(__file__), sys.argv[1] if len(sys.argv) > 1 else 'tv_panel.js'), encoding='utf-8').read()
ok = True
for m in re.finditer(r"import\s*\{([^}]*)\}\s*from\s*'([^']+)'", src):
    names = [n.strip().split(' as ')[0] for n in m.group(1).split(',') if n.strip()]
    path = os.path.normpath(os.path.join(VV, m.group(2)))
    if not os.path.exists(path):
        print('MISSING FILE', m.group(2)); ok = False; continue
    body = open(path, encoding='utf-8').read()
    for n in names:
        if not re.search(r'export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+' + re.escape(n) + r'\b', body) and not re.search(r'export\s*\{[^}]*\b' + re.escape(n) + r'\b', body):
            print('MISSING EXPORT', n, 'in', m.group(2)); ok = False
print('ALL OK' if ok else 'PROBLEMS')
