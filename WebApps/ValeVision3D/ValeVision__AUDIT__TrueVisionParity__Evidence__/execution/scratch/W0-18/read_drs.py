import json, sys
sys.stdout.reconfigure(encoding='utf-8')
d = json.load(open(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\data\decision_register.json', encoding='utf-8'))
want = set(sys.argv[1:]) or {'DR-06', 'DR-13', 'DR-20', 'DR-27', 'DR-28', 'DR-29'}
for it in d:
    if it.get('dr_id') in want:
        print('=====', it['dr_id'])
        for k, v in it.items():
            if k == 'dr_id':
                continue
            s = v if isinstance(v, str) else json.dumps(v, ensure_ascii=False, indent=1)
            print('--', k, ':', s)
