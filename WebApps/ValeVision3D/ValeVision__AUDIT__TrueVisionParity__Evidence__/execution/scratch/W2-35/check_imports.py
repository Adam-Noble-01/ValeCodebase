import re, os, sys
VVM = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules'
TV = os.path.join(os.path.dirname(__file__), 'tv')
base_dir = os.path.join(VVM, '51__System__LayoutEditor', '58__Feature__ScrapbookSpecification')
files = sys.argv[1:] or ['Na__LayoutEditor__Panel__ScrapbookSpecification__.js', 'Na__LayoutEditor__ScrapbookSpecification__.js', 'Na__LayoutEditor__ScrapbookSpecification__RowEditor__.js']
imp_re = re.compile(r'import\s*\{([^}]*)\}\s*from\s*[\'"]([^\'"]+)[\'"]', re.S)
for f in files:
    src = open(os.path.join(TV, f), encoding='utf-8').read()
    for m in imp_re.finditer(src):
        names = [n.strip().split(' as ')[0].strip() for n in re.sub(r'//[^\n]*', '', m.group(1)).split(',') if n.strip()]
        rel = m.group(2)
        target = os.path.normpath(os.path.join(base_dir, rel))
        if rel.startswith('./'):
            print(f, rel, '(sibling, ported in this package)')
            continue
        if not os.path.exists(target):
            print('MISSING FILE', f, rel, target)
            continue
        t = open(target, encoding='utf-8').read()
        for n in names:
            if not re.search(r'export\s+(?:async\s+)?(?:function\s*\*?|const|let|var|class)\s+' + re.escape(n) + r'\b', t) and not re.search(r'export\s*\{[^}]*\b' + re.escape(n) + r'\b', t):
                print('MISSING EXPORT', f, rel, n)
        print('ok', f, rel, len(names))
