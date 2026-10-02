"""W1-99 (continuation): put the pass's real times into the scratch draft of its Port Record (W1-99__part2.md): it
started 09:44 (C2/status_start.txt) and resolved the placeholders at 09:47:58 (C2/preimage_manifest.json).
Byte-level; LF kept; each anchor asserted once."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, 'W1-99__part2.md')
b = open(P, 'rb').read()
EDITS = [
    (b'02-Oct-2026\n> 09:55-10:30) comes first', b'02-Oct-2026\n> 09:44-10:30) comes first'),
    (b"recorded one of these files' hashes before 10:05 on 02-Oct-2026", b"recorded one of these files' hashes before 09:48 on 02-Oct-2026"),
]
for old, new in EDITS:
    assert b.count(old) == 1, (old, b.count(old))
    b = b.replace(old, new)
open(P, 'wb').write(b)
print('fixed')
