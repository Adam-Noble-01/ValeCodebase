"""W1-38 scratch: which packages list a given file in edits / vv_targets / hot_files, and test ownership."""
import json
import sys

P = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\data\wp_canonical.json'
d = json.load(open(P, encoding='utf-8'))
needles = sys.argv[1:] or ['PanelHost', 'Styles__Panels', 'ColourPalette']
for pkg in d['packages']:
    hits = []
    for field in ('edits', 'vv_targets', 'hot_files', 'tv_sources', 'tests_to_port'):
        for v in pkg.get(field) or []:
            if any(n in str(v) for n in needles):
                hits.append((field, v))
    for field in ('acceptance', 'notes', 'vv_adaptations', 'goal', 'risk'):
        val = pkg.get(field)
        txt = json.dumps(val, ensure_ascii=False) if val is not None else ''
        if any(n in txt for n in needles):
            hits.append((field, '(mentions)'))
    if hits:
        print(pkg['wp_id'], pkg.get('wave'), pkg.get('title'))
        for h in hits:
            print('    ', h)
print()
print('test_ownership:')
to = d.get('test_ownership')
if isinstance(to, dict):
    for k, v in to.items():
        if any(n in k for n in needles) or any(n in json.dumps(v) for n in needles):
            print('  ', k, json.dumps(v, ensure_ascii=False)[:600])
elif isinstance(to, list):
    for row in to:
        s = json.dumps(row, ensure_ascii=False)
        if any(n in s for n in needles):
            print('  ', s[:600])
