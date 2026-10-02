import re, os
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
TV_G = os.path.join(HERE, 'tv', '02__Src__AppModules', '51__System__LayoutEditor', '30__System__SheetTools', 'Na__LayoutEditor__Grips__.js')
VV_G = os.path.join(VV, '02__Src__AppModules', '51__System__LayoutEditor', '30__System__SheetTools', 'Na__LayoutEditor__Grips__.js')


def exports(txt):
    m = re.search(r'export\s*\{([^}]*)\}', txt)
    names = []
    for part in m.group(1).split(','):
        part = re.sub(r'//.*', '', part).strip()
        if part:
            names.append(part.split(' as ')[-1].strip())
    return names


def imports(txt):
    out = []
    for m in re.finditer(r'import\s*\{([^}]*)\}\s*from\s*[\'"]([^\'"]+)[\'"]', txt):
        names = [n.strip().split(' as ')[0].strip() for n in m.group(1).split(',') if n.strip()]
        out.append((m.group(2), names))
    return out


tv = open(TV_G, encoding='utf-8').read()
vv = open(VV_G, encoding='utf-8').read()
te, ve = exports(tv), exports(vv)
print('TV exports', len(te), 'VV exports', len(ve))
print('VV-only exports:', [n for n in ve if n not in te])
print('TV-only exports:', [n for n in te if n not in ve])

# resolve TV imports against VV files
base = os.path.dirname(VV_G)
for path, names in imports(tv):
    f = os.path.normpath(os.path.join(base, path))
    if not os.path.exists(f):
        print('MISSING FILE', path)
        continue
    ex = exports(open(f, encoding='utf-8').read())
    miss = [n for n in names if n not in ex]
    print('OK' if not miss else 'MISSING ' + str(miss), path)
