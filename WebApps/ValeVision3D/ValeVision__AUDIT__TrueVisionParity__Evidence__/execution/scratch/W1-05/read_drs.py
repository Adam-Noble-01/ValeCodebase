import json
import sys

PATH = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\data\decision_register.json'
WANT = sys.argv[1:] or ['DR-01', 'DR-25', 'DR-27', 'DR-30', 'DR-34', 'DR-41']

with open(PATH, encoding='utf-8') as fh:
    data = json.load(fh)

for item in data:
    if item.get('dr_id') in WANT:
        print('=' * 20, item.get('dr_id'), item.get('title'))
        for key in ('question', 'options', 'recommendation', 'default_if_unanswered', 'blocks', 'verified_evidence'):
            value = item.get(key)
            text = json.dumps(value, ensure_ascii=False, indent=1) if not isinstance(value, str) else value
            print('--', key, ':')
            print(text[:3000])
        print()
