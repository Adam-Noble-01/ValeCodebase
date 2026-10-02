import json, io, sys

SRC = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\data\decision_register.json'
OUT = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W0-01\drs_dump.txt'

d = json.load(open(SRC, encoding='utf-8'))
with io.open(OUT, 'w', encoding='utf-8', newline='\n') as f:
    for r in d:
        f.write('=' * 100 + '\n')
        f.write('%s  key=%s  theme=%s  urgency=%s\n' % (r['dr_id'], r['key'], r['theme'], r['urgency']))
        f.write('TITLE: %s\n' % r['title'])
        f.write('QUESTION: %s\n' % r['question'])
        f.write('OPTIONS:\n')
        for o in r['options']:
            f.write('  - %s\n' % o)
        f.write('RECOMMENDATION: %s\n' % r['recommendation'])
        f.write('DEFAULT: %s\n' % r['default_if_unanswered'])
        b = r.get('blocks') or {}
        f.write('BLOCKS.systems: %s\n' % '; '.join(b.get('systems', []) or []))
        f.write('BLOCKS.waves: %s\n' % b.get('waves'))
        f.write('RELATED: %s\n' % r.get('related_ids'))
print('wrote', OUT)
