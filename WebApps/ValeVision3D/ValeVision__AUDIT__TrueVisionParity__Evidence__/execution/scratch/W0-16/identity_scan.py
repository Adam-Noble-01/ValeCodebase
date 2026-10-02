"""W0-16 scratch: the K2 section 12.3 identity rules (G4's list, run by hand while W0-04's lint has not
landed) over the eleven files this package wrote. Usage: python identity_scan.py
"""
import os, re, sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import apply_w0_16 as A  # noqa: E402

RULES = [
    ('TRUEVISION3D banner', re.compile(r'TRUEVISION3D')),
    ('[TrueVision3D console prefix', re.compile(r'\[TrueVision3D')),
    ('TrueVision__ literal', re.compile(r'TrueVision__')),
    ('window.TrueVision__ read', re.compile(r'window\.TrueVision__')),
    ('/api/truevision route', re.compile(r'/api/truevision', re.I)),
    ('NaProjectPortal', re.compile(r'NaProjectPortal')),
    ('30__TrueVision__AppContent', re.compile(r'30__TrueVision__AppContent')),
    ('/na-apps/ path', re.compile(r'/na-apps/')),
    ('Noble Architecture Ltd', re.compile(r'Noble Architecture Ltd')),
    ('NA QR / share resolver', re.compile(r'noble-architecture\.com/(q|s)/')),
    ('noble-architecture.com other than cdn.../VaApps or www.../assets', re.compile(r'(?<!cdn\.)(?<!www\.)noble-architecture\.com|cdn\.noble-architecture\.com/(?!VaApps/)|www\.noble-architecture\.com/(?!assets/)')),
    ('TrueVision title-block scan path', re.compile(r'01__AppAssets__TrueVision')),
]
bad = 0
for rel in A.NEW_FILES + list(A.EDITS):
    text = open(os.path.join(VV, rel.replace('/', os.sep)), 'rb').read().decode('utf-8', 'replace')
    hits = []
    for name, rx in RULES:
        if rel.endswith('.png'):
            break
        for m in rx.finditer(text):
            line = text.count('\n', 0, m.start()) + 1
            hits.append('%s (line %d)' % (name, line))
    bad += bool(hits)
    print(('CLEAN ' if not hits else 'HIT   ') + rel + ('' if not hits else '  ' + '; '.join(hits[:6])))
print('\n%d files with a hit' % bad)
sys.exit(1 if bad else 0)
