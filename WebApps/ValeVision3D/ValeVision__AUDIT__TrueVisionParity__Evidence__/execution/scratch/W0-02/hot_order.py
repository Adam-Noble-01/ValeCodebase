"""Scratch (W0-02): W0-02's place in the serial order of every hot file it writes."""
import json, sys

P = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\parity\data\hot_file_ownership.json'
d = json.load(open(P, encoding='utf-8'))
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
items = d
if isinstance(d, dict):
    for k in ('hot_files', 'files', 'items'):
        if k in d:
            items = d[k]
            break
if isinstance(items, dict):
    items = [dict(v, path=k) if isinstance(v, dict) else {'path': k, 'order': v} for k, v in items.items()]
print('records:', len(items))
sample = items[0] if items else None
print('sample keys:', list(sample.keys()) if isinstance(sample, dict) else sample)
for it in items:
    s = json.dumps(it, ensure_ascii=False)
    if 'W0-02' not in s:
        continue
    order = None
    for k in ('serial_order', 'order', 'editors', 'editors_in_order', 'packages'):
        if isinstance(it, dict) and k in it:
            order = it[k]
            break
    path = it.get('path') or it.get('file') or it.get('vv_path') if isinstance(it, dict) else None
    if isinstance(order, list):
        ids = [o if isinstance(o, str) else (o.get('wp_id') or o.get('id')) for o in order]
        pos = ids.index('W0-02') + 1 if 'W0-02' in ids else None
        before = ids[pos - 2] if pos and pos > 1 else None
        print('%-110s pos %s of %d; before W0-02: %s; next: %s' % (path, pos, len(ids), before, ids[pos] if pos and pos < len(ids) else None))
    else:
        print(path, '::', s[:300])
