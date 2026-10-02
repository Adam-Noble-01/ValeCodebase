"""Scratch only: build W3-GATE/extras_w3.py from W2-GATE/extras_w2.py (same checks A-E, against the W2 checkpoint
W2__20261002-1323 and W3-GATE/crosscheck_w3.json); and W3-GATE/link_sweep_w3.mjs from W2-GATE/link_sweep_w2.mjs."""
import os
EXEC = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution'
src = open(os.path.join(EXEC, r'scratch\W2-GATE\extras_w2.py'), 'rb').read().decode('utf-8')
pairs = [
    ("OUT = os.path.join(EXEC, 'scratch', 'W2-GATE')", "OUT = os.path.join(EXEC, 'scratch', 'W3-GATE')"),
    ("'W1__20261002-1026__files.txt'", "'W2__20261002-1323__files.txt'"),
    ("'crosscheck_w2.json'", "'crosscheck_w3.json'"),
    ("'extras_w2.txt'", "'extras_w3.txt'"),
]
for a, b in pairs:
    assert src.count(a) == 1, (a, src.count(a))
    src = src.replace(a, b)
src = src.replace('W1 checkpoint', 'W2 checkpoint').replace('W2-touched', 'W3-touched')
open(os.path.join(EXEC, r'scratch\W3-GATE\extras_w3.py'), 'wb').write(src.encode('utf-8'))

src = open(os.path.join(EXEC, r'scratch\W2-GATE\link_sweep_w2.mjs'), 'rb').read().decode('utf-8')
pairs = [
    ("join(SCRATCH, 'crosscheck_w2.json')", "join(SCRATCH, 'crosscheck_w3.json')"),
    ("join(SCRATCH, 'link_sweep_w2_results.json')", "join(SCRATCH, 'link_sweep_w3_results.json')"),
    ("const PAGE    = APP + '__W2GATE__LinkSweep__.html';", "const PAGE    = APP + '__W3GATE__LinkSweep__.html';"),
    ("' touched in W2)", "' touched in W3)"),
]
for a, b in pairs:
    assert src.count(a) == 1, (a, src.count(a))
    src = src.replace(a, b)
open(os.path.join(EXEC, r'scratch\W3-GATE\link_sweep_w3.mjs'), 'wb').write(src.encode('utf-8'))
print('ok')
