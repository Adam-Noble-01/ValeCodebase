# W3-09: put the Insert PORT NOTE's W3-09 line under "Ported on" and close the Parity parenthesis (LF file, bytes in/out).
import hashlib, sys
P = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\54__Feature__SheetImages\Na__LayoutEditor__SheetImages__Insert__.js'
raw = open(P, 'rb').read()
if hashlib.sha1(raw).hexdigest() != '0eaec031' + hashlib.sha1(raw).hexdigest()[8:]:
    sys.exit('ABORT: Insert changed since the W3-09 build')
t = raw.decode('utf-8')
if '\r\n' in t: sys.exit('ABORT: expected LF')
pairs = [
    ('//                   on, and W3-09 put its guard in (Divergences)\n'
     '//                   02-Oct-2026 for ValeVision3D {{VVREL:W3-09}}: switched on (the mode controller\'s wiring), with\n'
     '//                   the DR-40 item 7 guard below\n'
     '// - Divergences   :\n',
     '//                   on, and W3-09 put its guard in: see Divergences)\n'
     '// - Divergences   :\n'),
    ('//                   ("NOT tried by Adam") come across under DR-01 (c), named as not yet confirmed.\n'
     '// - Parity',
     '//                   ("NOT tried by Adam") come across under DR-01 (c), named as not yet confirmed;\n'
     '//                   02-Oct-2026 for ValeVision3D {{VVREL:W3-09}}: switched on (the mode controller\'s\n'
     '//                   wiring), with the DR-40 item 7 guard below.\n'
     '// - Parity'),
    ('//                   console prefixes, this note and the guard are the only differences. DESCRIPTION is TrueVision\'s: its "and onto R2"\n',
     '//                   console prefixes, this note and the guard are the only differences. DESCRIPTION is\n'
     '//                   TrueVision\'s: its "and onto R2"\n'),
]
for old, new in pairs:
    if t.count(old) != 1: sys.exit('ABORT: anchor count ' + str(t.count(old)) + ' for ' + old[:60])
    t = t.replace(old, new)
open(P, 'wb').write(t.encode('utf-8'))
print('ok', hashlib.sha1(t.encode('utf-8')).hexdigest()[:8])
