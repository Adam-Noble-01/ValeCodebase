# W0-10 scratch: print the hot-file register rows for the worker files.
import json
import os
import sys

sys.dont_write_bytecode = True

EVID = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__'
hot = json.load(open(os.path.join(EVID, 'parity', 'data', 'hot_file_ownership.json'), encoding='utf-8'))
files = hot['files']
print(type(files).__name__, len(files))
sample = files[0] if isinstance(files, list) else next(iter(files.items()))
print('sample:', json.dumps(sample)[:600])
rows = files if isinstance(files, list) else [dict(path=k, **(v if isinstance(v, dict) else {'v': v})) for k, v in files.items()]
for r in rows:
    s = json.dumps(r)
    if 'Cloudflare' in s or 'CloudflareWorker' in s:
        print('ROW:', s[:1200])
