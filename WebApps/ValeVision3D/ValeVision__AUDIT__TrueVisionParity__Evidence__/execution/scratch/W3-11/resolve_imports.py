# W3-11 (copied from W3-10's helper): resolve every import of the TV files this package ports (read at the pin, in tv/) against the LIVE
# ValeVision tree. Siblings that this package itself lands (Table, LabelGrip) are judged against TV's copy in tv/.
# Read-only.
import os
import re
import sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
TV = os.path.join(HERE, 'tv')
LE = os.path.join(VV, '02__Src__AppModules', '51__System__LayoutEditor')
OWN = {'Na__LayoutEditor__NoteRegions__Grips__.js', 'Na__LayoutEditor__Panel__MarginNotes__Regions__.js',
       'Na__LayoutEditor__Panel__MarginNotes__.js'}
FILES = {
    'Na__LayoutEditor__NoteRegions__Grips__.js': '50__Feature__Specification',
    'Na__LayoutEditor__Panel__MarginNotes__Regions__.js': '50__Feature__Specification',
    'Na__LayoutEditor__Panel__MarginNotes__.js': '50__Feature__Specification',
    'Na__LayoutEditor__ModeController__.js': '05__Core__ModeController',
}
if len(sys.argv) > 1:
    FILES = {k: v for k, v in FILES.items() if k in sys.argv[1:]}

IMPORT_RE = re.compile(r"import\s*\{([^}]*)\}\s*from\s*'([^']+)'", re.S)
BARE_IMPORT_RE = re.compile(r"^\s*import\s*'([^']+)'", re.M)
EXPORT_RE = re.compile(r'export\s*\{([^}]*)\}', re.S)


def strip_comments(s):
    s = re.sub(r'/\*.*?\*/', '', s, flags=re.S)
    return re.sub(r'//[^\n]*', '', s)


def exports_of(path):
    t = open(path, encoding='utf-8').read()
    names = set()
    for blk in EXPORT_RE.findall(strip_comments(t)):
        for n in blk.split(','):
            n = n.strip()
            if n:
                names.add(n.split(' as ')[-1].strip())
    for m in re.finditer(r'^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z0-9_$]+)', t, re.M):
        names.add(m.group(1))
    return names


def main():
    bad = 0
    for name, folder in FILES.items():
        src = strip_comments(open(os.path.join(TV, name), encoding='utf-8').read())
        print('=== ' + name)
        base = os.path.join(LE, folder)
        for spec in BARE_IMPORT_RE.findall(src):
            print('  BARE IMPORT ' + spec)
        for names, spec in IMPORT_RE.findall(src):
            target = os.path.normpath(os.path.join(base, spec.replace('/', os.sep)))
            own = os.path.basename(target) in OWN
            if own:
                target = os.path.join(TV, os.path.basename(target))
            wanted = [n.strip().split(' as ')[0].strip() for n in names.split(',') if n.strip()]
            if not os.path.exists(target):
                print('  MISSING FILE  ' + spec)
                bad += 1
                continue
            have = exports_of(target)
            missing = [w for w in wanted if w not in have]
            if missing:
                bad += 1
            print('  %s %s [%s] (%d)%s' % ('OK ' if not missing else 'BAD', spec, 'TV own' if own else 'VV',
                                          len(wanted), ('  missing: ' + ', '.join(missing)) if missing else ''))
    print('problems %d' % bad)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
