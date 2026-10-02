#!/usr/bin/env python3
"""Fifth one-off patch of r2b_render.py: one more open issue (hand edits assigned by this section)."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
p = os.path.join(HERE, 'r2b_render.py')
s = open(p, encoding='utf-8').read()

old = """    'Rows follow K1\\'s recommended answers; a different answer to DR-02/DR-03/DR-04 flips FR-01..FR-11 (K2 script switches `--legacy 39`, `--no-renderpreset`, `--no-distanceculling`, `--no-snapshothistory`).',
]"""
new = """    'Rows follow K1\\'s recommended answers; a different answer to DR-02/DR-03/DR-04 flips FR-01..FR-11 (K2 script switches `--legacy 39`, `--no-renderpreset`, `--no-distanceculling`, `--no-snapshothistory`).',
    'Two small hand edits are assigned here and are in neither the K2 script nor the K3 adaptations: the DistanceCulling banner after FR-11 (W0-02) and replacing the TiledRenderer `Na__StaticExport__ClampToDeviceLimits` / `IsIosDevice` wrappers by TV\\'s `Na__TilePlan__*` re-export (W2-03).',
]"""
assert old in s, 'anchor missing'
s = s.replace(old, new, 1)
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('patched')
