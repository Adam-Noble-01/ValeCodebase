import json, sys
p = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\data\decision_register.json'
d = json.load(open(p, encoding='utf-8'))
want = set(sys.argv[1:])
for item in d:
    if item.get('id') in want or item.get('dr_id') in want:
        print(json.dumps(item, indent=1, ensure_ascii=False))
        print('=' * 70)
