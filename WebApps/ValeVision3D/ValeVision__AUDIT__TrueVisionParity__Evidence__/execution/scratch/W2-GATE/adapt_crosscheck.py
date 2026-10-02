"""Build W2-GATE/crosscheck_w2.py from the W1 continuation gate's crosscheck_c2.py (same method, W1 checkpoint, W2 records)."""
import os
EXEC = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution'
src = open(os.path.join(EXEC, r'scratch\W1-GATE\C2\crosscheck_c2.py'), encoding='utf-8').read()
reps = [
    ("OUT = os.path.join(EXEC, 'scratch', 'W1-GATE', 'C2')", "OUT = os.path.join(EXEC, 'scratch', 'W2-GATE')"),
    ("CP = os.path.join(EXEC, 'checkpoints', 'W1a__20261002-0331')", "CP = os.path.join(EXEC, 'checkpoints', 'W1__20261002-1026')"),
    ("CONT = ['W1-07', 'W1-19', 'W1-20', 'W1-21', 'W1-22', 'W1-25', 'W1-26', 'W1-27', 'W1-28', 'W1-36', 'W1-37', 'W1-38']",
     "CONT = sorted(f[:-3] for f in os.listdir(os.path.join(EXEC, 'port_records')) if f.startswith('W2-') and f.endswith('.md'))"),
    ("'gate:W1-GATE (FIX-C1)'", "'gate:W2-GATE'"),
    ("'crosscheck_c2.json'", "'crosscheck_w2.json'"),
    ("'crosscheck_c2.txt'", "'crosscheck_w2.txt'"),
]
for a, b in reps:
    assert src.count(a) == 1, a
    src = src.replace(a, b)
src = src.replace('W1a', 'W1').replace('continuation', 'W2')
open(os.path.join(EXEC, r'scratch\W2-GATE\crosscheck_w2.py'), 'w', encoding='utf-8', newline='\n').write(src)
print('ok')
