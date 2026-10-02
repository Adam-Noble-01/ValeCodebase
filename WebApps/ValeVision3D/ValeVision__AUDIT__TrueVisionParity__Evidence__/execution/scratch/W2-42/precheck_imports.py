"""Resolve every import of the six TV modules against the LIVE VV tree (names in each target's export block)."""
import os, re
HERE = os.path.dirname(os.path.abspath(__file__))
TV = os.path.join(HERE, 'tv')
VVLE = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor'
SNAPDIR = os.path.join(VVLE, '28__System__ObjectSnap')
IMPORT_RE = re.compile(r'^\s*import\s*\{([^}]*)\}\s*from\s*\'([^\']+)\'', re.M | re.S)


def exports_of(text):
    names = set()
    for m in re.finditer(r'export\s*\{([^}]*)\}', text, re.S):
        for part in m.group(1).split(','):
            part = re.sub(r'//[^\n]*', '', part).strip()
            if not part:
                continue
            if ' as ' in part:
                part = part.split(' as ')[1].strip()
            names.add(part)
    for m in re.finditer(r'export\s+(?:const|let|function|class|async function)\s+([A-Za-z0-9_$]+)', text):
        names.add(m.group(1))
    return names

ok = True
for f in sorted(os.listdir(TV)):
    if not f.endswith('.js'):
        continue
    text = open(os.path.join(TV, f), encoding='utf-8').read()
    for m in IMPORT_RE.finditer(text):
        names = [re.sub(r'//[^\n]*', '', n).strip() for n in m.group(1).split(',')]
        names = [n.split(' as ')[0].strip() for n in names if n.strip()]
        spec = m.group(2)
        if spec.startswith('./'):
            # sibling: resolve against TV copy (the package lands it)
            target = os.path.join(TV, spec[2:])
            where = 'sibling (TV copy, landed by this package)'
        else:
            target = os.path.normpath(os.path.join(SNAPDIR, spec))
            where = 'VV live'
        if not os.path.exists(target):
            print('MISSING FILE', f, spec)
            ok = False
            continue
        ex = exports_of(open(target, encoding='utf-8').read())
        missing = [n for n in names if n not in ex]
        print('%-45s %-95s %s %s' % (f, spec, where, 'OK' if not missing else 'MISSING ' + ','.join(missing)))
        if missing:
            ok = False
print('PRECHECK', 'PASS' if ok else 'FAIL')
