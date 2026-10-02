# -*- coding: utf-8 -*-
# W1-27 scratch: the transitive static-import closure of the five Floor Areas modules, walked over a tree
# (the live ValeVision tree, or TrueVision's at the pin extracted into the session scratchpad by
# extract_tv_closure.py). Lists every module reached, the bare specifiers met (import-map names) and any
# specifier that does not resolve to a file. Reads only.
#
# Usage: python -B closure.py <app root> [--json out.json]

import json
import os
import re
import sys

FA = '02__Src__AppModules/51__System__LayoutEditor/59__Feature__FloorAreas/'
START = [FA + n for n in (
    'Na__LayoutEditor__FloorAreas__Geometry__.js',
    'Na__LayoutEditor__FloorAreas__.js',
    'Na__LayoutEditor__FloorAreas__Tool__.js',
    'Na__LayoutEditor__FloorAreas__Menu__.js',
    'Na__LayoutEditor__FloorAreas__Paint__.js',
)]
# static imports and re-exports (the first form), side-effect imports (the second); dynamic import() is listed apart
STATIC = re.compile(r"(?:^|[;\s])(?:import|export)\s*(?:[\w*{}\s,$]+?\s*from\s*)?['\"]([^'\"]+)['\"]", re.M)
DYNAMIC = re.compile(r"import\(\s*['\"]([^'\"]+)['\"]\s*\)")


def strip_comments(text):
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    return re.sub(r'(?m)^\s*//.*$', '', text)


def walk(root, start, overlay=None):
    seen, order, bare, missing, dynamic = set(), [], set(), [], []
    stack = list(start)
    while stack:
        rel = stack.pop()
        if rel in seen:
            continue
        seen.add(rel)
        path = os.path.join(root, rel.replace('/', os.sep))
        if not os.path.exists(path) and overlay:
            path = os.path.join(overlay, rel.replace('/', os.sep))   # a file this package has not landed yet
        if not os.path.exists(path):
            missing.append(rel)
            continue
        order.append(rel)
        text = strip_comments(open(path, encoding='utf-8', errors='replace').read())
        for spec in DYNAMIC.findall(text):
            dynamic.append((rel, spec))
        for spec in STATIC.findall(text):
            if spec.startswith('./') or spec.startswith('../'):
                target = os.path.normpath(os.path.join(os.path.dirname(rel), spec)).replace(os.sep, '/')
                stack.append(target)
            elif spec.startswith('/') or '://' in spec:
                bare.add(spec)
            else:
                bare.add(spec)
    return sorted(order), sorted(bare), missing, dynamic


def main(argv):
    root = argv[0]
    out = None
    overlay = None
    if '--json' in argv:
        out = argv[argv.index('--json') + 1]
    if '--overlay' in argv:
        overlay = argv[argv.index('--overlay') + 1]
    order, bare, missing, dynamic = walk(root, START, overlay)
    for rel in order:
        print('  ' + rel)
    print('modules: %d' % len(order))
    print('bare specifiers: %s' % (', '.join(bare) or 'none'))
    print('missing: %s' % (', '.join(missing) or 'none'))
    print('dynamic import(): %d %s' % (len(dynamic), '; '.join('%s -> %s' % d for d in dynamic[:20])))
    if out:
        with open(out, 'w', encoding='utf-8') as fh:
            json.dump({'modules': order, 'bare': bare, 'missing': missing, 'dynamic': dynamic}, fh, indent=1)
    return 1 if missing else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
