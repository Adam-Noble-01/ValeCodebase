"""Scratch only: copy the W1 continuation gate's link sweep (W1-GATE/C2/link_sweep_c2.mjs) to W2-GATE/link_sweep_w2.mjs,
reading W2-GATE/crosscheck_w2.json (touched_in_cont = touched in W2) and writing link_sweep_w2_results.json. Exact-once replacements; LF kept."""
import os
EXEC = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution'
src = open(os.path.join(EXEC, r'scratch\W1-GATE\C2\link_sweep_c2.mjs'), 'rb').read().decode('utf-8')
pairs = [
    ("join(SCRATCH, 'crosscheck_c2.json')", "join(SCRATCH, 'crosscheck_w2.json')"),
    ("join(SCRATCH, 'link_sweep_c2_results.json')", "join(SCRATCH, 'link_sweep_w2_results.json')"),
    ("const PAGE    = APP + '__W1GATE__LinkSweep__.html';", "const PAGE    = APP + '__W2GATE__LinkSweep__.html';"),
    ("' touched in the continuation)", "' touched in W2)"),
]
for a, b in pairs:
    assert src.count(a) == 1, (a, src.count(a))
    src = src.replace(a, b)
open(os.path.join(EXEC, r'scratch\W2-GATE\link_sweep_w2.mjs'), 'wb').write(src.encode('utf-8'))
print('ok')
