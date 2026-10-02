"""W0-16 scratch: every quoted path string in ValeVision3D that names one of this package's vendor or
title-block files, resolved against the base its runtime uses, must name a file that exists.

Scans (never the app root, P17): 02__Src__AppModules, 03__Style__AppStylesheets,
80__Testing__PrototypeEnvironment and index.html; skips the vendor builds themselves.
Bases: an HTML page resolves against its own folder (or its <base href>); the legacy 35 page's
scripts and config resolve against the 35 folder (they load into that page); every other module
and config resolves against the app root (index.html). Usage: python path_strings_resolve.py
"""
import os, re, sys, json

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
DIRS = ['02__Src__AppModules', '03__Style__AppStylesheets', '80__Testing__PrototypeEnvironment']
TARGETS = r'(jspdf\.umd\.js|html2canvas\.umd\.js|pdf\.min\.js|pdf\.worker\.min\.js|TitleBlock__ClassicScan__A3__\.png|PageLayoutSystem__TitleBlock__A3__\.png)'
QUOTED = re.compile(r'(["\'])([^"\'\s<>]*?' + TARGETS + r')\1')
BASE_HREF = re.compile(r'<base\s+href="([^"]+)"', re.I)
SKIP_FILES = {'jspdf.umd.js', 'html2canvas.umd.js', 'pdf.min.js', 'pdf.worker.min.js'}
LEGACY_35 = os.path.join(VV, '02__Src__AppModules', '35__System__PageLayoutSystem')


def files():
    yield os.path.join(VV, 'index.html')
    for d in DIRS:
        for root, subdirs, names in os.walk(os.path.join(VV, d)):
            subdirs[:] = [s for s in subdirs if s not in ('node_modules', '.claude')]
            for n in names:
                if n in SKIP_FILES or not n.lower().endswith(('.js', '.mjs', '.json', '.html', '.css', '.py')):
                    continue
                yield os.path.join(root, n)


rows, bad = [], 0
for path in files():
    text = open(path, 'rb').read().decode('utf-8', 'replace')
    if not re.search(TARGETS, text):
        continue
    if path.lower().endswith('.html'):
        m = BASE_HREF.search(text)
        base = os.path.normpath(os.path.join(os.path.dirname(path), m.group(1))) if m else os.path.dirname(path)
    elif os.path.dirname(path) == LEGACY_35:
        base = LEGACY_35
    else:
        base = VV
    for lineno, line in enumerate(text.splitlines(), 1):
        for m in QUOTED.finditer(line):
            s = m.group(2)
            if s.startswith(('http:', 'https:', 'data:')) or '/' not in s and not os.path.dirname(path) == LEGACY_35:
                # a bare file name outside the 35 page (for example a log message) is not a path
                if '/' not in s:
                    continue
            target = os.path.normpath(os.path.join(base, s.replace('/', os.sep)))
            ok = os.path.isfile(target)
            bad += not ok
            rows.append({'file': os.path.relpath(path, VV), 'line': lineno, 'string': s,
                         'resolves_to': os.path.relpath(target, VV), 'exists': ok})
for r in rows:
    print('%s  %s:%d  %s  ->  %s' % ('OK  ' if r['exists'] else 'MISS', r['file'], r['line'], r['string'], r['resolves_to']))
json.dump(rows, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'path_strings_resolve.json'), 'w'), indent=2)
print('\n%d path strings, %d missing' % (len(rows), bad))
sys.exit(1 if bad else 0)
