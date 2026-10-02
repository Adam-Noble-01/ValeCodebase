# W1-07 scratch: C.1 row 0 pre-flight and the harness's module closure. Reads only.
#
#   python -B import_check.py --names <file> <sits-at-rel>   every named import of <file> (as if it sat at
#                                                            <sits-at-rel> in ValeVision) resolves and is exported
#   python -B import_check.py --closure <rel> [<rel> ...]    the transitive import closure of these ValeVision
#                                                            modules (static imports only), one path per line
import os
import re
import sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
IMPORT = re.compile(r"^[ \t]*import\s*(\{[^}]*\}|[\w*\s,]+)\s*from\s*'([^']+)';", re.M)
SIDE = re.compile(r"^[ \t]*import\s*'([^']+)';", re.M)
EXPORT_BLOCK = re.compile(r"export\s*\{([^}]*)\}", re.S)
EXPORT_DECL = re.compile(r"export\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z0-9_$]+)")
LINE_COMMENT = re.compile(r"(?<![:'\"])//[^\n]*")
BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.S)


def code_of(path):
    text = open(path, 'r', encoding='utf-8').read()
    return BLOCK_COMMENT.sub('', text)


def exports_of(path):
    text = LINE_COMMENT.sub('', code_of(path))
    names = set()
    for m in EXPORT_BLOCK.finditer(text):
        for part in m.group(1).split(','):
            part = part.strip()
            if part:
                names.add(re.split(r'\s+as\s+', part)[-1].strip())
    for m in EXPORT_DECL.finditer(text):
        names.add(m.group(1))
    return names


def names_check(path, sits_at_rel):
    base_dir = os.path.dirname(os.path.join(VV, sits_at_rel.replace('/', os.sep)))
    problems = 0
    for m in IMPORT.finditer(code_of(path)):
        body = LINE_COMMENT.sub('', m.group(1))
        names = [re.split(r'\s+as\s+', n.strip())[0].strip() for n in body.strip('{} \n').split(',') if n.strip()]
        target = os.path.normpath(os.path.join(base_dir, m.group(2).replace('/', os.sep)))
        rel = os.path.relpath(target, VV).replace(os.sep, '/')
        if not os.path.isfile(target):
            print('  MISSING MODULE  %s' % rel)
            problems += 1
            continue
        have = exports_of(target)
        missing = [n for n in names if n not in have]
        if missing:
            print('  MISSING NAMES   %s: %s' % (rel, ', '.join(missing)))
            problems += 1
        else:
            print('  ok  %2d name(s)  %s' % (len(names), rel))
    print('problems: %d' % problems)
    return problems


def closure(rels):
    seen = []
    todo = list(rels)
    while todo:
        rel = todo.pop(0)
        if rel in seen:
            continue
        seen.append(rel)
        path = os.path.join(VV, rel.replace('/', os.sep))
        if not os.path.isfile(path):
            print('MISSING', rel)
            continue
        code = code_of(path)
        here = os.path.dirname(path)
        specs = [m.group(2) for m in IMPORT.finditer(code)] + [m.group(1) for m in SIDE.finditer(code)]
        for spec in specs:
            if not spec.startswith('.'):
                print('  bare specifier in %s: %s' % (rel, spec))
                continue
            target = os.path.normpath(os.path.join(here, spec.replace('/', os.sep)))
            todo.append(os.path.relpath(target, VV).replace(os.sep, '/'))
    for rel in seen:
        print(rel)
    print('modules: %d' % len(seen))


if __name__ == '__main__':
    if sys.argv[1] == '--names':
        sys.exit(1 if names_check(sys.argv[2], sys.argv[3]) else 0)
    closure(sys.argv[2:])
