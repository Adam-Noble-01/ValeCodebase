# W0-10 scratch: prove the live worker and the two inputs are byte-identical
# to the pre-images recorded before the package began, and that no temp tree
# or bytecode cache was left behind.
import glob
import hashlib
import json
import os
import sys
import tempfile

sys.dont_write_bytecode = True

VCB = r'D:\10_CoreLib__ValeCodebase'
SCRATCH = os.path.dirname(os.path.abspath(__file__))
manifest = json.load(open(os.path.join(SCRATCH, 'preimage_manifest.json'), encoding='utf-8'))
changed = []
for group in ('worker', 'inputs'):
    for rel, digest in manifest[group].items():
        path = os.path.join(VCB, *rel.split('/'))
        now = hashlib.sha1(open(path, 'rb').read()).hexdigest() if os.path.exists(path) else 'MISSING'
        if now != digest:
            changed.append((rel, digest, now))
live_worker = os.path.join(VCB, 'WebApps', 'Whitecardopedia', 'CloudflareWorker')
extra = []
for dirpath, dirnames, filenames in os.walk(live_worker):
    dirnames[:] = [d for d in dirnames if d not in ('node_modules', '.wrangler')]
    for name in filenames:
        rel = os.path.relpath(os.path.join(dirpath, name), VCB).replace('\\', '/')
        if rel not in manifest['worker']:
            extra.append(rel)
temp_bases = [os.environ.get('NA_W0_10_TEMP') or tempfile.gettempdir(), tempfile.gettempdir()]
leftovers = sorted(set(p for base in temp_bases for p in glob.glob(os.path.join(base, 'na_w0_10_*'))))
caches = [p for p in glob.glob(os.path.join(SCRATCH, '**', '__pycache__'), recursive=True)]
print('pre-image entries checked:', sum(len(v) for v in manifest.values()))
print('changed since the package began:', changed or 'none')
print('new files in the live worker folder:', extra or 'none')
print('temp trees left:', leftovers or 'none')
print('__pycache__ in scratch:', caches or 'none')
sys.exit(0 if not (changed or extra or leftovers or caches) else 1)
