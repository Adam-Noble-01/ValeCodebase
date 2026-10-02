"""Scratch only: build W2-GATE/extras_w2.py from W1-GATE/C2/extras_c2.py (same checks A-E, against the W1 checkpoint
W1__20261002-1026 and W2-GATE/crosscheck_w2.json)."""
import os
EXEC = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution'
src = open(os.path.join(EXEC, r'scratch\W1-GATE\C2\extras_c2.py'), 'rb').read().decode('utf-8')
pairs = [
    ("OUT = os.path.join(EXEC, 'scratch', 'W1-GATE', 'C2')", "OUT = os.path.join(EXEC, 'scratch', 'W2-GATE')"),
    ("'W1a__20261002-0331__files.txt'", "'W1__20261002-1026__files.txt'"),
    ("'crosscheck_c2.json'", "'crosscheck_w2.json'"),
    ("'extras_c2.txt'", "'extras_w2.txt'"),
]
for a, b in pairs:
    assert src.count(a) == 1, (a, src.count(a))
    src = src.replace(a, b)
src = src.replace('W1a checkpoint', 'W1 checkpoint').replace('continuation-touched', 'W2-touched')
open(os.path.join(EXEC, r'scratch\W2-GATE\extras_w2.py'), 'wb').write(src.encode('utf-8'))
print('ok')
