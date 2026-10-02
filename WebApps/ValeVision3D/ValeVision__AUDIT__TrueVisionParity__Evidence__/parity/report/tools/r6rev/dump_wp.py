import json, sys, os
D = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), 'data')
d = json.load(open(os.path.join(D, 'wp_canonical.json'), encoding='utf-8'))
P = {x['wp_id']: x for x in d['packages']}
fields = sys.argv[2].split(',') if len(sys.argv) > 2 else None
for w in sys.argv[1].split(','):
    p = P[w]
    print('=' * 20, w, p['title'])
    for k, v in p.items():
        if fields and k not in fields:
            continue
        if k in ('gate_provenance',):
            continue
        print('--', k, ':', json.dumps(v, ensure_ascii=False, indent=1) if isinstance(v, (list, dict)) else v)
