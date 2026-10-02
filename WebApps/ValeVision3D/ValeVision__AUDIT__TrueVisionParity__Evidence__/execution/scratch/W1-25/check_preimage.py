"""Explain the PdfExporter change since W1-24 wrote it: placeholder resolution only?"""
import glob
import hashlib
import os

ROOT = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
LIVE = os.path.join(ROOT, r'02__Src__AppModules\51__System__LayoutEditor\60__Feature__PdfExport\Na__LayoutEditor__PdfExporter__.js')
CAND_DIR = os.path.join(ROOT, r'ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-24\candidate')

live = open(LIVE, 'rb').read()
print('live', len(live), hashlib.sha256(live).hexdigest()[:16])
for path in glob.glob(os.path.join(CAND_DIR, '*')):
    data = open(path, 'rb').read()
    print('cand', os.path.basename(path), len(data), hashlib.sha256(data).hexdigest()[:16], 'CRLF' if b'\r\n' in data else 'LF')
    for placeholder in (b'{{VVREL:W1-24}}', b'{{VVREL:W1-23}}'):
        print('  ', placeholder, data.count(placeholder))
    resolved = data.replace(b'{{VVREL:W1-24}}', b'v2.71.2').replace(b'{{VVREL:W1-23}}', b'v2.71.2')
    if b'\r\n' not in resolved and b'\r\n' in live:
        resolved = resolved.replace(b'\n', b'\r\n')
    print('   resolved == live:', resolved == live, len(resolved))
