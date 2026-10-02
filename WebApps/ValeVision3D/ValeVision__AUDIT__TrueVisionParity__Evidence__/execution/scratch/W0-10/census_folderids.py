# W0-10 scratch: check the stricter folderId rule against every known folderId.
# Rule: the rename handler's pattern ^\d{4}/[^<>:"/\\|?*\x00-\x1F]+$, plus the
# folder segment is not "." or "..", does not start or end with a space and
# does not end with a dot (Windows cannot hold such a folder either).
import json
import os
import re
import sys

sys.dont_write_bytecode = True

WCP = r'D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia'
pat = re.compile(r'^\d{4}/[^<>:"/\\|?*\x00-\x1F]+$')


def ok(fid):
    if not pat.match(fid):
        return False
    folder = fid.split('/', 1)[1]
    if folder in ('.', '..'):
        return False
    if folder != folder.strip(' '):
        return False
    if folder.endswith('.'):
        return False
    return True


idx = json.load(open(os.path.join(WCP, '02__Src__AppModules', '03__AppData', 'Na__MasterIndex__ProjectLocations__.json'), encoding='utf-8'))
ids = [p.get('folderId') for p in idx['projects']]
root = os.path.join(WCP, 'Projects')
local = []
for y in sorted(os.listdir(root)):
    yp = os.path.join(root, y)
    if os.path.isdir(yp) and re.match(r'^\d{4}$', y):
        for f in sorted(os.listdir(yp)):
            if os.path.isdir(os.path.join(yp, f)):
                local.append(y + '/' + f)

# project.json folderId fields (S12: wrong in 54, missing in 10; never used for a path, checked for interest)
pj_ids = []
for fid in local:
    p = os.path.join(root, *fid.split('/'), 'project.json')
    if os.path.isfile(p):
        try:
            d = json.load(open(p, encoding='utf-8'))
            if isinstance(d.get('folderId'), str):
                pj_ids.append(d['folderId'])
        except Exception:
            pass

print('index ids:', len(ids), 'refused:', [i for i in ids if not ok(i)])
print('local folders:', len(local), 'refused:', [i for i in local if not ok(i)])
print('project.json folderId fields:', len(pj_ids), 'refused:', sorted(set(i for i in pj_ids if not ok(i))))
