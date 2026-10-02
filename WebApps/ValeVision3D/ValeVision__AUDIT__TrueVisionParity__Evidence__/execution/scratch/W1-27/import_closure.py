# W1-27: resolve every import of the five TrueVision Floor Areas modules (read at the pin) against the LIVE
# ValeVision tree. Sibling imports inside 59__Feature__FloorAreas are judged against TrueVision's own sibling (they
# land together in this package). Prints, per file, each specifier, whether its target exists in ValeVision and which
# named imports the target does not export. Read-only on both repositories.
import os
import re
import sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
TVOUT = os.environ.get('W127_TV_OUT') or r'C:\Users\adamw\AppData\Local\Temp\claude\C--Users-adamw-AppData-Roaming-SketchUp-SketchUp-2026-SketchUp-Plugins\a1674149-918e-4d62-a79a-e7961f105155\scratchpad\W1-27_tv'
FOLDER = '02__Src__AppModules/51__System__LayoutEditor/59__Feature__FloorAreas/'
FILES = [
    'Na__LayoutEditor__FloorAreas__Geometry__.js',
    'Na__LayoutEditor__FloorAreas__.js',
    'Na__LayoutEditor__FloorAreas__Tool__.js',
    'Na__LayoutEditor__FloorAreas__Menu__.js',
    'Na__LayoutEditor__FloorAreas__Paint__.js',
]

IMPORT_RE = re.compile(r"import\s*\{([^}]*)\}\s*from\s*'([^']+)'", re.S)
BARE_IMPORT_RE = re.compile(r"^\s*import\s*'([^']+)'", re.M)
EXPORT_RE = re.compile(r'export\s*\{([^}]*)\}', re.S)


def strip_comments(s):
    s = re.sub(r'/\*.*?\*/', '', s, flags=re.S)
    return re.sub(r'//[^\n]*', '', s)


def exports_of(path):
    t = open(path, encoding='utf-8').read()
    names = set()
    for blk in EXPORT_RE.findall(t):
        for n in strip_comments(blk).split(','):
            n = n.strip()
            if n:
                names.add(n.split(' as ')[-1].strip())
    # declaration exports, in case a file uses them
    for m in re.finditer(r'^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z0-9_$]+)', t, re.M):
        names.add(m.group(1))
    return names


def main():
    bad = 0
    total_stmts = 0
    total_names = 0
    for name in FILES:
        tvp = os.path.join(TVOUT, (FOLDER + name).replace('/', os.sep))
        src = open(tvp, encoding='utf-8').read()
        print('=== ' + name)
        vv_dir = os.path.join(VV, FOLDER.replace('/', os.sep))
        tv_dir = os.path.dirname(tvp)
        for spec in BARE_IMPORT_RE.findall(src):
            print('  BARE IMPORT (side effect) ' + spec)
            bad += 1
        for names, spec in IMPORT_RE.findall(src):
            total_stmts += 1
            sibling = spec.startswith('./')
            base = tv_dir if sibling else vv_dir
            target = os.path.normpath(os.path.join(base, spec.replace('/', os.sep)))
            wanted = [n.strip().split(' as ')[0].strip() for n in strip_comments(names).split(',') if n.strip()]
            total_names += len(wanted)
            if not os.path.exists(target):
                print('  MISSING FILE  %s  (%s)' % (spec, 'TV sibling' if sibling else 'VV'))
                bad += 1
                continue
            have = exports_of(target)
            missing = [w for w in wanted if w not in have]
            if missing:
                bad += 1
            print('  %s %s  [%s] (%d names)%s' % ('OK ' if not missing else 'BAD', spec,
                                                  'TV sibling' if sibling else 'VV live', len(wanted),
                                                  ('  missing: ' + ', '.join(missing)) if missing else ''))
    print('statements %d, names %d, problems %d' % (total_stmts, total_names, bad))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
