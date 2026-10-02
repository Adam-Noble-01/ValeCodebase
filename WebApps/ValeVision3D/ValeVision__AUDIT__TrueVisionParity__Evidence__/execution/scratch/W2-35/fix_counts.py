p = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\port_records\W2-35.md'
b = open(p, 'rb').read().decode('utf-8')
pairs = [
    ("package's automatable acceptance: 53/53 PASS.", "package's automatable acceptance: 51/51 PASS."),
    ("a ValeVision region (20 checks)", "a ValeVision region (19 checks)"),
    ("53/53 PASS (TV's 33 + 20 ValeVision)", "51/51 PASS (TV's 32 + 19 ValeVision)"),
    ("**PASS.** 53/53; G1 PASS", "**PASS.** 51/51; G1 PASS"),
]
for old, new in pairs:
    assert b.count(old) == 1, old
    b = b.replace(old, new)
open(p, 'wb').write(b.encode('utf-8'))
print('ok')
