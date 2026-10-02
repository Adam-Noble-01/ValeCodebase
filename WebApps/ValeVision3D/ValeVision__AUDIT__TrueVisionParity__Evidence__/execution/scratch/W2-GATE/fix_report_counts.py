"""Correct two statements in gate_reports/W2.md (the gate's own report): the staged W2-38 counts (the PASS-line count
included each test's closing 'PASS - every check passed' line) and W2-08's description. Exact-once replacements; LF kept."""
p = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\gate_reports\W2.md'
s = open(p, 'rb').read().decode('utf-8')
pairs = [
    ("W2-38: CabinetInfill **75 / 75** and ProjectQr **74 / 74** on both trees",
     "W2-38: CabinetInfill **74 / 74** and ProjectQr **73 / 73** checks on both trees (exit 0, \"PASS - every check passed\")"),
    ("the three tests pass 75 / 75,\n   74 / 74 and 56 / 56 (1.1).",
     "the three tests pass 74 / 74,\n   73 / 73 and 56 / 56 (1.1)."),
    ("**W2-08** (a config JSON change: `Meta__` / description text only)",
     "**W2-08** (five `Drawing2d` keys in `Na__AppConfig__Main.json`; JSON carries no placeholder)"),
]
for a, b in pairs:
    assert s.count(a) == 1, a
    s = s.replace(a, b)
open(p, 'wb').write(s.encode('utf-8'))
print('ok')
