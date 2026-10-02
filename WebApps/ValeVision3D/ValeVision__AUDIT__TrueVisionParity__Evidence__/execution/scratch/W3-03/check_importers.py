"""Reverse check: every VV module (outside W3-03's set) that imports one of W3-03's files must only name exports TV's version has."""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from check_imports import TARGETS, VV, HERE, exports_of  # noqa: E402

SRC_ROOT = os.path.join(VV, '02__Src__AppModules')
imp_re = re.compile(r"import\s*\{([^}]*)\}\s*from\s*'([^']+)'", re.S)
targets = {os.path.normpath(os.path.join(VV, d, n)).lower(): n for n, d in TARGETS.items()}
tv_ex = {n: exports_of(open(os.path.join(HERE, 'tv', n), encoding='utf-8').read()) for n in TARGETS}
bad = 0
count = 0
for root, dirs, files in os.walk(SRC_ROOT):
    dirs[:] = [d for d in dirs if d not in ('node_modules', '.claude')]
    for f in files:
        if not f.endswith(('.js', '.mjs')):
            continue
        if f in TARGETS:
            continue
        p = os.path.join(root, f)
        text = open(p, encoding='utf-8', errors='replace').read()
        for names, spec in imp_re.findall(text):
            if not spec.startswith('.'):
                continue
            t = os.path.normpath(os.path.join(root, spec)).lower()
            if t not in targets:
                continue
            n = targets[t]
            count += 1
            for nm in re.sub(r'//[^\n]*', '', names).split(','):
                nm = nm.strip().split(' as ')[0].strip()
                if nm and nm not in tv_ex[n]:
                    bad += 1
                    print('MISSING', os.path.relpath(p, VV), nm, 'from', n)
print('import statements checked', count, 'bad', bad)
