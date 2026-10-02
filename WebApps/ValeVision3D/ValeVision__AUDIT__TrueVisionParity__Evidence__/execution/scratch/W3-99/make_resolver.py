"""Build resolve_vvrel_w3.py from W2-99's resolver: id set W3-01..W3-18, version v2.71.5, own pre-image folder."""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, '..', 'W2-99', 'resolve_vvrel_w2.py'), 'rb').read()
reps = [
    (b'W2-99 Parity Scribe (Wave 2) - resolve Wave 2', b'W3-99 Parity Scribe (Wave 3) - resolve Wave 3'),
    (b"(Adapted from W1-99's resolve_vvrel_c2.py; only the id set, the version and the pre-image folder changed.)",
     b"(Adapted from W2-99's resolve_vvrel_w2.py; only the id set, the version and the pre-image folder changed.)"),
    (b'is a Wave 2 package (W2-01 .. W2-43) with exactly \'v2.71.4\'', b'is a Wave 3 package (W3-01 .. W3-18) with exactly \'v2.71.5\''),
    (b"VERSION = b'v2.71.4'", b"VERSION = b'v2.71.5'"),
    (b"WAVE_IDS = {'W2-%02d' % i for i in range(1, 44)}", b"WAVE_IDS = {'W3-%02d' % i for i in range(1, 19)}"),
    (b"TOKEN_OK = re.compile(rb'\\{\\{VVREL:(W2-\\d\\d)\\}\\}')", b"TOKEN_OK = re.compile(rb'\\{\\{VVREL:(W3-\\d\\d)\\}\\}')"),
    (b"'.w2-99.tmp'", b"'.w3-99.tmp'"),
    (b'scratch/W2-99/preimage/', b'scratch/W3-99/preimage/'),
]
for a, b in reps:
    n = src.count(a)
    if n < 1:
        raise SystemExit('pattern not found: %r' % a)
    src = src.replace(a, b)
src = src.replace(b'resolve_vvrel_c2.py', b'resolve_vvrel_w3.py')
open(os.path.join(HERE, 'resolve_vvrel_w3.py'), 'wb').write(src)
print('ok')
