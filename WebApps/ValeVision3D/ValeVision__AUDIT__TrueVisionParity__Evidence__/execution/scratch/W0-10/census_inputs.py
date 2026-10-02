# W0-10 scratch: read-only census of the inputs the worker package needs.
# Reads the hot-file register rows for the worker, the master index folderIds,
# and the local project folders. Writes nothing outside stdout.
import json
import os
import re
import sys

sys.dont_write_bytecode = True

EVID = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__'
WCP = r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia'

# 1. Hot-file register rows naming the worker
hot = json.load(open(os.path.join(EVID, 'parity', 'data', 'hot_file_ownership.json'), encoding='utf-8'))
print('hot_file_ownership keys:', list(hot.keys())[:20])
def walk(o, path=''):
    if isinstance(o, dict):
        for k, v in o.items():
            if 'CloudflareWorker' in str(k):
                print('HOT', path + '/' + str(k), json.dumps(v)[:600])
            else:
                walk(v, path + '/' + str(k))
    elif isinstance(o, list):
        for i, v in enumerate(o):
            s = json.dumps(v)
            if 'CloudflareWorker' in s and not isinstance(v, (dict, list)):
                print('HOT', path + '[' + str(i) + ']', s[:600])
            else:
                walk(v, path + '[' + str(i) + ']')
walk(hot)

# 2. Master index folderIds against the rename handler's pattern
pat = re.compile(r'^\d{4}/[^<>:"/\\|?*\x00-\x1F]+$')
idx = json.load(open(os.path.join(WCP, '02__Src__AppModules', '03__AppData', 'Na__MasterIndex__ProjectLocations__.json'), encoding='utf-8'))
projects = idx['projects'] if isinstance(idx, dict) else idx
ids = [p.get('folderId') for p in projects]
print('master index entries:', len(ids))
print('fail pattern:', [i for i in ids if not pat.match(str(i))])
print('with spaces:', [i for i in ids if ' ' in str(i)])
print('non-ascii:', [i for i in ids if any(ord(c) > 127 for c in str(i))])
print('first entry keys:', sorted(projects[0].keys()))

# 3. Local project folders
root = os.path.join(WCP, 'Projects')
local = []
for y in sorted(os.listdir(root)):
    yp = os.path.join(root, y)
    if os.path.isdir(yp) and re.match(r'^\d{4}$', y):
        for f in sorted(os.listdir(yp)):
            if os.path.isdir(os.path.join(yp, f)):
                local.append(y + '/' + f)
print('local folders:', len(local))
print('local fail pattern:', [i for i in local if not pat.match(i)])
print('local not in index:', [i for i in local if i not in ids][:20])
