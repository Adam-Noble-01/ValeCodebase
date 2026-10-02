# W2-28 pre-flight (C.1 row 0): every named import of the six TV files must be exported by the VV file at that path.
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
D = '02__Src__AppModules/51__System__LayoutEditor/37__System__VectorTools/'
NAMES = ['Preview', 'Targets', 'CircleTool', 'ArcTool', 'TrimTool', 'JoinTool']
OWN = set('Na__LayoutEditor__VectorTools__%s__.js' % n for n in NAMES)

# Base directory for the source: VV for the dependencies, scratch/tv for the six (they are not landed yet).
src_root = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'tv')

IMP = re.compile(r"^\s*import\s*\{([^}]*)\}\s*from\s*'([^']+)'", re.S | re.M)
EXP_FN = re.compile(r"^\s*export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z0-9_$]+)", re.M)
EXP_LIST = re.compile(r"^\s*export\s*\{([^}]*)\}", re.S | re.M)


def exports_of(path):
    text = open(path, 'r', encoding='utf-8').read()
    names = set(EXP_FN.findall(text))
    for block in EXP_LIST.findall(text):
        for part in block.split(','):
            part = re.sub(r'//.*', '', part).strip()
            if not part:
                continue
            names.add(part.split(' as ')[-1].strip())
    return names


bad = 0
for n in NAMES:
    rel = D + 'Na__LayoutEditor__VectorTools__%s__.js' % n
    text = open(os.path.join(src_root, rel.replace('/', os.sep)), 'r', encoding='utf-8').read()
    for names, spec in IMP.findall(text):
        target_rel = os.path.normpath(os.path.join(os.path.dirname(rel), spec)).replace(os.sep, '/')
        base = os.path.basename(target_rel)
        root = src_root if base in OWN else VV
        target = os.path.join(root, target_rel.replace('/', os.sep))
        if not os.path.exists(target):
            print('MISSING FILE  %s  <- %s' % (target_rel, n))
            bad += 1
            continue
        have = exports_of(target)
        wanted = [re.sub(r'//.*', '', x).strip() for x in names.split(',')]
        wanted = [w.split(' as ')[0].strip() for w in wanted if w.strip()]
        miss = [w for w in wanted if w not in have]
        status = 'ok' if not miss else 'MISSING ' + ', '.join(miss)
        if miss:
            bad += 1
        print('%-10s %-80s %2d names  %s' % (n, target_rel.split('51__System__LayoutEditor/')[-1], len(wanted), status))
print('RESULT', 'FAIL %d' % bad if bad else 'PASS')
sys.exit(1 if bad else 0)
