import json, io

SRC = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\data\wp_canonical.json'
OUT = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W0-01\rules_dump.txt'

d = json.load(open(SRC, encoding='utf-8'))
with io.open(OUT, 'w', encoding='utf-8', newline='\n') as f:
    for k in ('id', 'generated', 'tv_head', 'vv_head', 'description', 'size_rule'):
        f.write('%s: %s\n' % (k, d[k]))
    f.write('\npath_notation:\n%s\n' % json.dumps(d['path_notation'], indent=1, ensure_ascii=False))
    f.write('\nSTANDARD GATES:\n')
    for g in d['standard_gates']:
        f.write(json.dumps(g, indent=1, ensure_ascii=False) + '\n')
    f.write('\nSWARM RULES:\n')
    for r in d['swarm_rules']:
        f.write(json.dumps(r, indent=1, ensure_ascii=False) + '\n')
    f.write('\nF8 CORRECTIONS (keys):\n')
    f.write(json.dumps(d['f8_corrections'], indent=1, ensure_ascii=False)[:20000] + '\n')
    f.write('\nWAVES:\n')
    for w in d['waves']:
        f.write(json.dumps({k: v for k, v in w.items() if k != 'packages'}, ensure_ascii=False)[:1500] + '\n')
print('wrote', OUT)
