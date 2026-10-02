"""Compare two getters_dump.mjs outputs (old units+config vs new units+config).

Every getter the old build had must answer the same for every field it had;
new getters and new fields are listed as ADDED. Any changed old field is
printed as CHANGED (the regression signal).
Usage: python compare_getters.py <old.json> <new.json>
"""
import json
import sys


def walk(a, b, path, changed, added):
    if isinstance(a, dict) and isinstance(b, dict):
        for k in a:
            if k not in b:
                changed.append((path + '.' + k, a[k], '<missing>'))
            else:
                walk(a[k], b[k], path + '.' + k, changed, added)
        for k in b:
            if k not in a:
                added.append((path + '.' + k, b[k]))
    elif a != b:
        changed.append((path, a, b))


old = json.load(open(sys.argv[1], encoding='utf-8'))
new = json.load(open(sys.argv[2], encoding='utf-8'))
changed, added = [], []
walk(old, new, '', changed, added)
print('CHANGED %d' % len(changed))
for p, a, b in changed:
    print('  %s\n     old %s\n     new %s' % (p, json.dumps(a)[:300], json.dumps(b)[:300]))
print('ADDED %d' % len(added))
for p, b in added:
    print('  %s = %s' % (p, json.dumps(b, ensure_ascii=False)[:220]))
