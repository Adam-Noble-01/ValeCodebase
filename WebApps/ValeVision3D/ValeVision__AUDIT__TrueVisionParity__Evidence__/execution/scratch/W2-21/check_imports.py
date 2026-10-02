import re, os, sys
VV = r'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools'
here = os.path.dirname(os.path.abspath(__file__))
files = sys.argv[1:] or [f for f in os.listdir(os.path.join(here, 'tv')) if f.endswith('.js')]
imp_re = re.compile(r"import\s*\{([^}]*)\}\s*from\s*'([^']+)'", re.S)

def strip_comments(t):
    t = re.sub(r'/\*.*?\*/', '', t, flags=re.S)
    t = re.sub(r'//[^\n]*', '', t)
    return t

def exports_of(path):
    t = strip_comments(open(path, encoding='utf-8').read())
    names = set()
    for m in re.finditer(r'export\s*\{([^}]*)\}', t, re.S):
        for n in m.group(1).split(','):
            n = n.strip()
            if not n: continue
            if ' as ' in n: n = n.split(' as ')[1].strip()
            names.add(n)
    for m in re.finditer(r'export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z0-9_$]+)', t):
        names.add(m.group(1))
    return names

bad = 0
for f in files:
    t = strip_comments(open(os.path.join(here, 'tv', f), encoding='utf-8').read())
    for m in imp_re.finditer(t):
        names = [n.strip().split(' as ')[0].strip() for n in m.group(1).split(',') if n.strip()]
        target = os.path.normpath(os.path.join(VV, m.group(2)))
        if not os.path.exists(target):
            print('MISSING FILE', f, m.group(2)); bad += 1; continue
        ex = exports_of(target)
        miss = [n for n in names if n not in ex]
        if miss:
            print('MISSING NAMES', f, m.group(2), miss); bad += 1
        else:
            print('ok', f, m.group(2), len(names))
print('BAD', bad)
