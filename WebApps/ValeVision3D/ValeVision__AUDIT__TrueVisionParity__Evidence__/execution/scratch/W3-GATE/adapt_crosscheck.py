"""Build W3-GATE/crosscheck_w3.py from the W2 gate's crosscheck_w2.py (same method, W2 checkpoint, W3 records)."""
import os
EXEC = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution'
src = open(os.path.join(EXEC, r'scratch\W2-GATE\crosscheck_w2.py'), encoding='utf-8').read()
reps = [
    ("OUT = os.path.join(EXEC, 'scratch', 'W2-GATE')", "OUT = os.path.join(EXEC, 'scratch', 'W3-GATE')"),
    ("CP = os.path.join(EXEC, 'checkpoints', 'W1__20261002-1026')", "CP = os.path.join(EXEC, 'checkpoints', 'W2__20261002-1323')"),
    ("f.startswith('W2-') and f.endswith('.md'))", "f.startswith('W3-') and f.endswith('.md'))"),
    ("'gate:W2-GATE'", "'gate:W3-GATE'"),
    ("'crosscheck_w2.json'", "'crosscheck_w3.json'"),
    ("'crosscheck_w2.txt'", "'crosscheck_w3.txt'"),
]
for a, b in reps:
    assert src.count(a) == 1, a
    src = src.replace(a, b)
# labels: W1 checkpoint -> W2 checkpoint; W2-touched -> W3-touched
src = src.replace('W2', 'W3').replace('W1', 'W2')
# the replace above turned the checkpoint name back - fix it
src = src.replace("'W3__20261002-1323'", "'W2__20261002-1323'")
assert "checkpoints', 'W2__20261002-1323'" in src
assert "'W3-GATE'" in src
# the scratch hash lists: also the W3-05 adjudicator folder
src = src.replace("for d in CONT:\n    root0", "for d in CONT + ['W3-05-adjudicator']:\n    root0")
open(os.path.join(EXEC, r'scratch\W3-GATE\crosscheck_w3.py'), 'w', encoding='utf-8', newline='\n').write(src)
print('ok')
