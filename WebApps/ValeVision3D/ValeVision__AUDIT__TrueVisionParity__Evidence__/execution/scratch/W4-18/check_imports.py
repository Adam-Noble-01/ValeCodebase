"""Resolve every import of the six TV register files against the live VV tree (names inside export blocks)."""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
TV = os.path.join(HERE, 'tv')
VV_DIR = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\51__Feature__DrawingRegister'
FILES = sys.argv[1:] or ['Data', 'DeleteDialog', 'Transactions', 'Notes', 'Preview', 'Pdf']

IMPORT_RE = re.compile(r'import\s*\{([^}]*)\}\s*from\s*[\'"]([^\'"]+)[\'"]', re.S)
EXPORT_RE = re.compile(r'export\s*\{([^}]*)\}', re.S)


def names(block):
    out = []
    for part in block.split(','):
        part = re.sub(r'//[^\n]*', '', part).strip()
        if not part:
            continue
        out.append(part.split(' as ')[0].strip())
    return out


def exports_of(path):
    text = open(path, encoding='utf-8').read()
    found = set()
    for m in EXPORT_RE.finditer(text):
        found.update(names(m.group(1)))
    for m in re.finditer(r'export\s+(?:async\s+)?(?:function|const|let|class)\s+(\w+)', text):
        found.add(m.group(1))
    return found

problems = 0
for short in FILES:
    src = os.path.join(TV, 'Na__LayoutEditor__Register__%s__.js' % short)
    text = open(src, encoding='utf-8').read()
    for m in IMPORT_RE.finditer(text):
        wanted = names(m.group(1))
        spec = m.group(2)
        target = os.path.normpath(os.path.join(VV_DIR, spec))
        if not os.path.exists(target):
            sibling = os.path.join(TV, os.path.basename(spec))
            if spec.startswith('./') and os.path.exists(sibling):
                have = exports_of(sibling)
                where = 'TV sibling (lands in this package)'
            else:
                print('%-13s MISSING FILE %s' % (short, spec)); problems += 1; continue
        else:
            have = exports_of(target)
            where = 'VV'
        missing = [n for n in wanted if n not in have]
        status = 'OK' if not missing else 'MISSING ' + ', '.join(missing)
        if missing:
            problems += 1
        print('%-13s %-90s %-36s %s' % (short, spec, where, status))
print('problems:', problems)
