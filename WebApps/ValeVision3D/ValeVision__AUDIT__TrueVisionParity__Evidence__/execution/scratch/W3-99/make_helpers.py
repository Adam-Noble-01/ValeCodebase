"""W3-99 - copy W2-99's read-only helpers with the wave's names (each replacement asserted)."""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
W2 = os.path.join(HERE, '..', 'W2-99')

JOBS = {
    'blocked_by_w3.py': ('blocked_by_w2.py', [
        ("MAP = os.path.join(HERE, 'pom', 'port_order_map__endW2.json')",
         "MAP = os.path.join(HERE, 'pom', 'port_order_map__endW3.json')"),
        ('"""W2-99 (adapted from W1-99 C2)', '"""W3-99 (adapted from W2-99)'),
    ]),
    'importers.py': ('importers.py', []),
    'portnote_fields_w3.py': ('portnote_fields_w2.py', [
        ("CROSS = os.path.join(L.EXEC, 'scratch', 'W2-GATE', 'crosscheck_w2.json')",
         "CROSS = os.path.join(L.EXEC, 'scratch', 'W3-GATE', 'crosscheck_w3.json')"),
        ("open(os.path.join(HERE, 'portnote_fields_w2.json'), 'w', encoding='utf-8')",
         "open(os.path.join(HERE, 'portnote_fields_w3.json'), 'w', encoding='utf-8')"),
        ("open(os.path.join(HERE, 'portnote_fields_w2.txt'), 'w', encoding='utf-8', newline='\\n')",
         "open(os.path.join(HERE, 'portnote_fields_w3.txt'), 'w', encoding='utf-8', newline='\\n')"),
    ]),
    'rows_w3.py': ('rows_w2.py', [
        ("pf = json.load(open(os.path.join(HERE, 'portnote_fields_w2.json'), encoding='utf-8'))",
         "pf = json.load(open(os.path.join(HERE, 'portnote_fields_w3.json'), encoding='utf-8'))"),
        ("json.dump(out, open(os.path.join(HERE, 'rows_w2.json'), 'w', encoding='utf-8'), indent=1)",
         "json.dump(out, open(os.path.join(HERE, 'rows_w3.json'), 'w', encoding='utf-8'), indent=1)"),
        ("open(os.path.join(HERE, 'rows_w2.txt'), 'w', encoding='utf-8', newline='\\n')",
         "open(os.path.join(HERE, 'rows_w3.txt'), 'w', encoding='utf-8', newline='\\n')"),
    ]),
}
for dst, (src, reps) in JOBS.items():
    t = open(os.path.join(W2, src), encoding='utf-8').read()
    for a, b in reps:
        n = t.count(a)
        if n != 1:
            raise SystemExit('%s: anchor %d times: %r' % (src, n, a[:70]))
        t = t.replace(a, b)
    open(os.path.join(HERE, dst), 'w', encoding='utf-8', newline='\n').write(t)
    print('wrote', dst)
