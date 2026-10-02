"""W2-18 - resolve every named import of the TV files (as fetched at the pin) against the LIVE VV export blocks.

Each TV file is resolved from the VV folder it will land in (its own folder number is the same in both apps)."""
import os, re
HERE = os.path.dirname(os.path.abspath(__file__))
VV_LE = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor'
FILES = {
    'Na__LayoutEditor__DraftMode__.js': '26__System__DraftMode',
    'Na__LayoutEditor__DrawingGrid__.js': '27__System__DrawingGrid',
    'Na__LayoutEditor__Panel__DrawingGrid__.js': '27__System__DrawingGrid',
    'Na__LayoutEditor__OrthoMode__.js': '32__System__OrthoMode',
    'Na__LayoutEditor__DrawingAxes__.js': '33__System__DrawingAxes',
}
# Siblings landed by THIS package: resolved from the TV copy (they are verbatim apart from comments)
OWN = {('27__System__DrawingGrid', './Na__LayoutEditor__DrawingGrid__.js'): os.path.join(HERE, 'tv', 'Na__LayoutEditor__DrawingGrid__.js')}

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
for f, folder in FILES.items():
    src = open(os.path.join(HERE, 'tv', f), 'r', encoding='utf-8').read()
    src_nc = re.sub(r'//[^\n]*', '', src)
    base = os.path.join(VV_LE, folder)
    for m in IMP.finditer(src_nc):
        names = [n.strip().split(' as ')[0].strip() for n in m.group(1).split(',') if n.strip()]
        spec = m.group(2)
        target = OWN.get((folder, spec)) or os.path.normpath(os.path.join(base, spec))
        if not os.path.exists(target):
            print('MISSING MODULE', f, spec)
            bad += 1
            continue
        ex = exports_of(target)
        miss = [n for n in names if n not in ex]
        if miss:
            bad += 1
        print('OK  ' if not miss else 'FAIL', f, '->', spec, len(names), 'names', ('missing: ' + ', '.join(miss)) if miss else '')
print('PRECHECK', 'PASS' if bad == 0 else 'FAIL (%d)' % bad)
