# W2-09 scratch: two wording fixes in port_w2_09.py's PORT NOTE templates (the script is mine; LF file).
import os

PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'port_w2_09.py')
with open(PATH, 'rb') as f:
    data = f.read()

pairs = [
    (b"    '//                   before it was its own 1.0.0, unchanged since 10-Sep-2026. TrueVision\\'s v2.93.0\\n'\n"
     b"    '//                   entry says NOT signed off by Adam; it comes across under DR-01 (c) and is named so.\\n'\n",
     b"    '//                   before it was its own 1.0.0. TrueVision\\'s v2.93.0 entry says NOT signed off by\\n'\n"
     b"    '//                   Adam; it comes across under DR-01 (c) and is named so.\\n'\n"),
    (b"    '//                   before it was 1.1.0, ported from TrueVision3D on 13-Sep-2026 (ValeVision3D v2.28.0).\\n'\n",
     b"    '//                   before it was 1.1.0, ported from TrueVision3D on 13-Sep-2026 (ValeVision3D v2.28.0;\\n'\n"
     b"    '//                   the 2.00 Context Layer default followed in v2.59.0, as in TrueVision).\\n'\n"),
]
for old, new in pairs:
    count = data.count(old)
    if count != 1:
        raise SystemExit('expected one occurrence, found %d: %r' % (count, old[:80]))
    data = data.replace(old, new)
with open(PATH, 'wb') as f:
    f.write(data)
print('patched', PATH)
