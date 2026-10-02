#!/usr/bin/env python3
# W1-21 scratch: print the decisions in W1-21's gated_by list (read-only).
import json, sys
P = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\data\decision_register.json'
want = sys.argv[1:] or ['DR-01', 'DR-05', 'DR-11', 'DR-14', 'DR-40', 'DR-42']
d = json.load(open(P, encoding='utf-8'))
for item in d:
    if item.get('dr_id') in want:
        print('=' * 100)
        for k, v in item.items():
            if isinstance(v, (list, dict)):
                v = json.dumps(v, ensure_ascii=False, indent=1)
            print(f'{k}: {v}')
