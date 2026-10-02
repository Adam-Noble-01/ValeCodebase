# -*- coding: utf-8 -*-
# W1-21 scratch: who imports the SheetModel facade, the Sheets unit and History in ValeVision, and does every
# name they take exist in TrueVision's file (the text handed in)? Also lists `editor.model.Na__LeModel__X`
# reads in the loader facade (G2 pass 3's subject). Searches only 02__Src__AppModules and
# 80__Testing__PrototypeEnvironment (never the app root). Reads only.
#
# Usage: python -B importers.py <tv facade> <tv sheets> <tv history>

import os
import re
import sys

VV_APP = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
ROOTS = ['02__Src__AppModules', '80__Testing__PrototypeEnvironment']
TARGETS = {
    'Na__LayoutEditor__SheetModel__.js': None,
    'Na__LayoutEditor__SheetModel__Sheets__.js': None,
    'Na__LayoutEditor__History__.js': None,
}
IMPORT = re.compile(r"import\s*\{([^}]*)\}\s*from\s*'([^']+)'", re.S)
DYN = re.compile(r"import\(\s*'([^']+)'\s*\)")
EXPORT_BLOCK = re.compile(r"export\s*\{([^}]*)\}", re.S)
LINE_COMMENT = re.compile(r"//[^\n]*")
BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.S)
MODEL_READ = re.compile(r"\.model\.(Na__LeModel__[A-Za-z0-9_]+)")


def exports_of(path):
    text = BLOCK_COMMENT.sub('', open(path, 'r', encoding='utf-8').read())
    text = LINE_COMMENT.sub('', text)
    names = set()
    for m in EXPORT_BLOCK.finditer(text):
        for part in m.group(1).split(','):
            part = part.strip()
            if part:
                names.add(re.split(r'\s+as\s+', part)[-1].strip())
    return names


def main(argv):
    tv = dict(zip(TARGETS.keys(), argv))
    tv_exports = {k: exports_of(v) for k, v in tv.items()}
    problems = 0
    for root in ROOTS:
        for dirpath, dirnames, filenames in os.walk(os.path.join(VV_APP, root)):
            dirnames[:] = [d for d in dirnames if d not in ('node_modules', '.claude', '__pycache__')]
            for name in filenames:
                if not name.endswith(('.js', '.mjs', '.cjs', '.html')):
                    continue
                path = os.path.join(dirpath, name)
                try:
                    raw = open(path, 'r', encoding='utf-8').read()
                except UnicodeDecodeError:
                    continue
                code = LINE_COMMENT.sub('', BLOCK_COMMENT.sub('', raw))
                rel = os.path.relpath(path, VV_APP).replace(os.sep, '/')
                for m in IMPORT.finditer(code):
                    base = m.group(2).split('/')[-1]
                    if base in TARGETS:
                        names = [re.split(r'\s+as\s+', n.strip())[0].strip() for n in m.group(1).split(',') if n.strip()]
                        missing = [n for n in names if n not in tv_exports[base]]
                        flag = 'MISSING ' + ', '.join(missing) if missing else 'ok'
                        if missing:
                            problems += 1
                        print('%-9s %-48s <- %s (%d names)' % ('' if not missing else 'PROBLEM', base, rel, len(names)) + ('' if not missing else '  ' + flag))
                for m in DYN.finditer(code):
                    base = m.group(1).split('/')[-1]
                    if base in TARGETS:
                        print('          %-48s <- %s (dynamic import)' % (base, rel))
                reads = sorted(set(MODEL_READ.findall(code)))
                if reads:
                    missing = [n for n in reads if n not in tv_exports['Na__LayoutEditor__SheetModel__.js']]
                    if missing:
                        problems += 1
                    print('%-9s editor.model reads in %s: %d names%s' % ('PROBLEM' if missing else '', rel, len(reads), ('  MISSING ' + ', '.join(missing)) if missing else ''))
    print('problems: %d' % problems)
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main(sys.argv[1:])
