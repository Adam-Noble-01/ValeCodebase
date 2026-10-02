"""W2-19 - resolve every named import of the TV files (as fetched at the pin) against the LIVE VV export blocks."""
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
OSDIR = os.path.join(VV, '02__Src__AppModules', '51__System__LayoutEditor', '28__System__ObjectSnap')
FILES = ['Na__LayoutEditor__ObjectSnap__%s__.js' % n for n in ('Search', 'Moves', 'GridMoves', 'Menu')] + ['Na__LayoutEditor__ObjectSnap__.js']
if len(sys.argv) > 1:
    FILES = sys.argv[1:]

IMP = re.compile(r'import\s*\{([^}]*)\}\s*from\s*[\'"]([^\'"]+)[\'"]', re.S)
EXP_BLOCK = re.compile(r'export\s*\{([^}]*)\}', re.S)
EXP_DECL = re.compile(r'export\s+(?:const|let|var|function\*?|async\s+function|class)\s+([A-Za-z0-9_$]+)')


def exports_of(path):
    t = open(path, 'r', encoding='utf-8').read()
    t2 = re.sub(r'//[^\n]*', '', t)
    names = set()
    for m in EXP_BLOCK.finditer(t2):
        for part in m.group(1).split(','):
            part = part.strip()
            if not part:
                continue
            if ' as ' in part:
                part = part.split(' as ')[1].strip()
            names.add(part)
    names.update(EXP_DECL.findall(t2))
    return names


bad = 0
for f in FILES:
    src = open(os.path.join(HERE, 'tv', os.path.basename(f)), 'r', encoding='utf-8').read() if not os.path.isabs(f) else open(f, encoding='utf-8').read()
    src_nc = re.sub(r'//[^\n]*', '', src)
    base = OSDIR if not os.path.isabs(f) else os.path.dirname(f)
    for m in IMP.finditer(src_nc):
        names = [n.strip().split(' as ')[0].strip() for n in m.group(1).split(',') if n.strip()]
        spec = m.group(2)
        target = os.path.normpath(os.path.join(base, spec))
        if not os.path.exists(target):
            print('MISSING MODULE', os.path.basename(f), spec)
            bad += 1
            continue
        ex = exports_of(target)
        miss = [n for n in names if n not in ex]
        status = 'OK  ' if not miss else 'FAIL'
        if miss:
            bad += 1
        print(status, os.path.basename(f), '->', spec, len(names), 'names', ('missing: ' + ', '.join(miss)) if miss else '')
print('PRECHECK', 'PASS' if bad == 0 else 'FAIL (%d)' % bad)
