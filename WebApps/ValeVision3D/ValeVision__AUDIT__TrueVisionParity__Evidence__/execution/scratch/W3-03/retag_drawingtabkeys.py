"""OC-12: the held Na__Test__DrawingTabKeys__ (W1-36's build) lands with W3-03; its release placeholder becomes W3-03's.
Reads bytes, changes the one placeholder line, writes back with the file's own line endings."""
import os

P = r'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/80__Testing__PrototypeEnvironment/Na__Test__DrawingTabKeys__.test.mjs'
OLD = b'// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-36}}, with the PC controls 1.4.0 (its key map'
NEW = b'// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-03}}, with the PC controls 1.4.0 (its key map'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'staged', 'Na__Test__DrawingTabKeys__.test.mjs')

with open(P, 'rb') as f:
    data = f.read()
assert data.count(OLD) == 1, 'placeholder line not found once'
assert data.count(b'{{VVREL:') == 1, 'more than one placeholder'
data = data.replace(OLD, NEW)
with open(P, 'wb') as f:
    f.write(data)
with open(OUT, 'wb') as f:
    f.write(data)
print('retagged', len(data), 'bytes')
