#!/usr/bin/env python3
# W1-21 scratch: print test ownership rows for the tests W1-21 names (read-only).
import json
P = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\data\wp_canonical.json'
d = json.load(open(P, encoding='utf-8'))
print('top-level keys:', list(d.keys()) if isinstance(d, dict) else type(d))
own = d.get('test_ownership') if isinstance(d, dict) else None
names = ['SheetsNormaliseOnce', 'NoteRegions', 'LeaderlessNotes', 'DraftRestore', 'DraftGuard', 'LoaderFacade']
if isinstance(own, dict):
    for k, v in own.items():
        if any(n in k for n in names):
            print('-', k, '->', json.dumps(v, ensure_ascii=False))
elif isinstance(own, list):
    for row in own:
        s = json.dumps(row, ensure_ascii=False)
        if any(n in s for n in names):
            print('-', s)
# Which packages list these tests in tests_to_port
pk = d.get('packages') or d.get('work_packages') or []
for p in pk:
    for t in p.get('tests_to_port', []) or []:
        if any(n in t for n in names):
            print(p['wp_id'], '|', t)
