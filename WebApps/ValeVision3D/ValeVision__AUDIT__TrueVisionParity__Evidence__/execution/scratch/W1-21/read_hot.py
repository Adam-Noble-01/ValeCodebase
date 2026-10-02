#!/usr/bin/env python3
# W1-21 scratch: print hot-file serial orders for W1-21's files (read-only).
import json
P = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\data\hot_file_ownership.json'
d = json.load(open(P, encoding='utf-8'))
keys = ['SheetModel__.js', 'SheetModel__Sheets__.js', 'History__.js', 'Loader__.js']
def walk(obj, path=''):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if any(k.endswith(x) for x in keys) and 'LayoutEditor' in k:
                print('=' * 80)
                print(k)
                print(json.dumps(v, ensure_ascii=False, indent=1)[:4000])
            else:
                walk(v, path + '/' + str(k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            if isinstance(v, dict):
                f = v.get('file') or v.get('path') or ''
                if any(str(f).endswith(x) for x in keys) and 'LayoutEditor' in str(f):
                    print('=' * 80)
                    print(json.dumps(v, ensure_ascii=False, indent=1)[:4000])
                    continue
            walk(v, path + f'[{i}]')
print(type(d), list(d.keys())[:20] if isinstance(d, dict) else len(d))
walk(d)
