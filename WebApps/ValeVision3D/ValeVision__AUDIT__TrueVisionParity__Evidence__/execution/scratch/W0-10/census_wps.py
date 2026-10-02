# W0-10 scratch: print the raw slice work packages folded into W0-10.
import json
import os
import sys

sys.dont_write_bytecode = True

EVID = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__'
wps = json.load(open(os.path.join(EVID, 'parity', 'data', 'work_packages.json'), encoding='utf-8'))
items = wps if isinstance(wps, list) else (wps.get('work_packages') or wps.get('packages') or list(wps.values()))
want = {'WP-S12-04', 'WP-S07a-06', 'WP-S07b-03', 'WP-S08-05'}
for it in items:
    if not isinstance(it, dict):
        continue
    wid = it.get('wp_id') or it.get('id')
    if wid in want:
        print('=' * 30, wid)
        print(json.dumps(it, indent=1, ensure_ascii=False)[:6000])
