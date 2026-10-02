"""W0-11 scratch: a G4-equivalent self-check on the one file this package edits (W0-04's verifiers are not
landed yet). Checks K2 H1/H2/H5/C1/K4/V2 on Na__AppUtils__ProjectLoader.js; the PORT NOTE block is exempt
from the identity-marker checks, as G4 specifies."""
import re
import sys

PATH = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\03__AppUtils\Na__AppUtils__ProjectLoader.js'
text = open(PATH, 'rb').read().decode('utf-8')
lines = text.split('\n')

fails = []

# Banner (H1) and FILE line (F2/H2)
if lines[1] != '// VALEVISION3D - APPLICATION UTILITIES - PROJECT LOADER':
    fails.append('banner line 2: %r' % lines[1])
if '// FILE       : Na__AppUtils__ProjectLoader.js' not in lines[:8]:
    fails.append('FILE line does not equal the file name')
for want in ('// NAMESPACE  : Na__AppUtils', '// MODULE     : ProjectLoader', '// AUTHOR     : Adam Noble - Noble Architecture', '// CREATED    : 24-Feb-2026'):
    if want not in lines[:12]:
        fails.append('header line missing: ' + want)

# PORT NOTE block (H5): present, fields in order, Source version present
start = next((i for i, l in enumerate(lines) if l.strip() == '// PORT NOTE:'), None)
if start is None:
    fails.append('no PORT NOTE block')
    port_note = range(0)
else:
    end = next(i for i in range(start + 1, len(lines)) if lines[i].startswith('// ----'))
    port_note = range(start, end)
    block = '\n'.join(lines[start:end])
    order = ['- Ported from   :', '- Source version:', '- Ported on     :', '- Parity        :', '- Divergences   :', '- Back-port     :']
    pos = [block.find(f) for f in order]
    if -1 in pos or pos != sorted(pos):
        fails.append('PORT NOTE fields missing or out of order: %r' % pos)
    if '{{VVREL:W0-11}}' not in block:
        fails.append('PORT NOTE has no {{VVREL:W0-11}} token')

# DEVELOPMENT LOG line carries the VVREL token (G7)
if not re.search(r'^// 01-Oct-2026 - Version 1\.4\.1 \(.*\{\{VVREL:W0-11\}\}\)$', text, re.M):
    fails.append('DEVELOPMENT LOG entry 1.4.1 with {{VVREL:W0-11}} not found')

# Identity markers outside the PORT NOTE block (C1, K4, V2, G4 list)
markers = [r'TRUEVISION3D', r'\[TrueVision3D', r'TrueVision__', r'window\.TrueVision__', r'/api/truevision',
           r'NaProjectPortal', r'30__TrueVision__AppContent', r'/na-apps/', r'na-project-portal',
           r'noble-architecture\.com/q/', r'noble-architecture\.com/s/', r'na-truevision-api']
for i, line in enumerate(lines):
    if i in port_note:
        continue
    for m in markers:
        if re.search(m, line):
            fails.append('marker %s at line %d: %s' % (m, i + 1, line.strip()[:120]))

# Console prefix (C1): every console call in the file uses [ValeVision3D...]
for i, line in enumerate(lines):
    if re.search(r'console\.(log|warn|error|info)\(', line) and '[ValeVision3D' not in line:
        fails.append('console call without the [ValeVision3D] prefix at line %d' % (i + 1))

# H7: one export block, no default export
if len(re.findall(r'^\s*export\s*\{', text, re.M)) != 1 or re.search(r'export\s+default', text):
    fails.append('export block rule (H7)')

print('G4-equivalent self-check on', PATH)
for f in fails:
    print('  FAIL', f)
print('RESULT:', 'PASS' if not fails else 'FAIL (%d)' % len(fails))
sys.exit(0 if not fails else 1)
