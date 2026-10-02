import json, sys
p = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\data\decision_register.json'
d = json.load(open(p, encoding='utf-8'))
want = set(sys.argv[1:])
print(list(d[0].keys()))
for x in d:
    ident = x.get('id') or x.get('dr_id') or x.get('DR')
    if ident in want:
        print(json.dumps(x, indent=1, ensure_ascii=False))
        print('======')
