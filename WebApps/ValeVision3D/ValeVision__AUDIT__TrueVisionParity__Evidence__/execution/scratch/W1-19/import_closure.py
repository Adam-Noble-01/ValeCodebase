# -*- coding: utf-8 -*-
# W1-19 scratch: C.1 row 0 pre-flight. Resolve every import a SheetRecords text makes
# against the LIVE ValeVision tree, as if the file sat at ValeVision's SheetRecords path,
# and check every imported name is exported by the target module (export { } block or
# an exported declaration). Reads only.
#
# Usage: python -B import_closure.py <sheetrecords file> [more files ...]

import os
import re
import sys

VV_APP = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
SITS_AT = os.path.join(VV_APP, '02__Src__AppModules', '51__System__LayoutEditor', '07__Core__SheetData')

IMPORT = re.compile(r"^[ \t]*import\s*\{([^}]*)\}\s*from\s*'([^']+)';", re.M)
EXPORT_BLOCK = re.compile(r"export\s*\{([^}]*)\}", re.S)
EXPORT_DECL = re.compile(r"export\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z0-9_$]+)")
LINE_COMMENT = re.compile(r"//[^\n]*")
BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.S)


def strip_comments(text):
    text = BLOCK_COMMENT.sub('', text)
    return LINE_COMMENT.sub('', text)


def exports_of(path):
    text = strip_comments(open(path, 'r', encoding='utf-8').read())
    names = set()
    for m in EXPORT_BLOCK.finditer(text):
        for part in m.group(1).split(','):
            part = part.strip()
            if not part:
                continue
            pieces = re.split(r'\s+as\s+', part)
            names.add(pieces[-1].strip())
    for m in EXPORT_DECL.finditer(text):
        names.add(m.group(1))
    return names


def check(path):
    text = open(path, 'r', encoding='utf-8').read()
    code = BLOCK_COMMENT.sub('', text)
    problems = 0
    count = 0
    for m in IMPORT.finditer(code):
        names = [re.split(r'\s+as\s+', n.strip())[0].strip() for n in LINE_COMMENT.sub('', m.group(1)).split(',') if n.strip()]
        target = os.path.normpath(os.path.join(SITS_AT, m.group(2).replace('/', os.sep)))
        rel = os.path.relpath(target, VV_APP).replace(os.sep, '/')
        if not os.path.isfile(target):
            print('  MISSING MODULE  %s  (names: %s)' % (rel, ', '.join(names)))
            problems += 1
            continue
        have = exports_of(target)
        missing = [n for n in names if n not in have]
        count += len(names)
        if missing:
            print('  MISSING NAMES   %s: %s' % (rel, ', '.join(missing)))
            problems += 1
        else:
            print('  ok  %-2d name(s)  %s' % (len(names), rel))
    print('%s: %d import statement(s), %d name(s), %d problem(s)' % (os.path.basename(path), len(IMPORT.findall(code)), count, problems))
    return problems


def main(argv):
    total = 0
    for p in argv:
        print('== ' + p)
        total += check(p)
    sys.exit(1 if total else 0)


if __name__ == '__main__':
    main(sys.argv[1:])
