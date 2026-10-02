"""W1-99 (continuation): correct the file counts in the scratch draft of this pass's Port Record (W1-99__part2.md):
56 files under 02__Src__AppModules and 12 under 80__Testing__PrototypeEnvironment (C2/preimage_manifest.json).
Byte-level; LF kept; each anchor asserted to its count."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, 'W1-99__part2.md')
b = open(P, 'rb').read()
EDITS = [
    (b'68 files (55 under 02__Src__AppModules, 13 under 80__Testing__PrototypeEnvironment)',
     b'68 files (56 under 02__Src__AppModules, 12 under 80__Testing__PrototypeEnvironment)', 2),
    (b'02__Src__AppModules 55 files / 66, 80__Testing__PrototypeEnvironment 13',
     b'02__Src__AppModules 56 files / 66, 80__Testing__PrototypeEnvironment 12', 1),
]
for old, new, n in EDITS:
    assert b.count(old) == n, (old, b.count(old))
    b = b.replace(old, new)
assert b'\r\n' not in b
open(P, 'wb').write(b)
print('fixed')
