"""Key-tree diff of two Layout Editor AppConfig JSON files (read-only).

Usage: python appcfg_keytree.py <tv.json> <vv.json> [--tsv out.tsv]

Walks objects recursively (arrays are compared as whole values) and prints one
row per difference: path, state (TV-only / VV-only / value), TV value, VV value.
Detects duplicate keys in either file.
"""
import json
import sys


def load(path):
    dups = []

    def hook(pairs):
        seen = {}
        for k, v in pairs:
            if k in seen:
                dups.append(k)
            seen[k] = v
        return dict(pairs)

    with open(path, 'rb') as f:
        raw = f.read()
    text = raw.decode('utf-8-sig')
    data = json.loads(text, object_pairs_hook=hook)
    return data, dups


def walk(tv, vv, path, rows):
    keys = list(tv.keys()) + [k for k in vv.keys() if k not in tv]
    for k in keys:
        p = path + '/' + k
        if k not in vv:
            rows.append((p, 'TV-only', tv[k], None))
        elif k not in tv:
            rows.append((p, 'VV-only', None, vv[k]))
        else:
            a, b = tv[k], vv[k]
            if isinstance(a, dict) and isinstance(b, dict):
                walk(a, b, p, rows)
            elif a != b:
                rows.append((p, 'value', a, b))


def short(v, n=160):
    s = json.dumps(v, ensure_ascii=False)
    return s if len(s) <= n else s[:n] + '...'


def main():
    tv, d1 = load(sys.argv[1])
    vv, d2 = load(sys.argv[2])
    rows = []
    walk(tv, vv, '', rows)
    out = None
    if '--tsv' in sys.argv:
        out = sys.argv[sys.argv.index('--tsv') + 1]
    print('duplicate keys TV:', d1, ' VV:', d2)
    counts = {}
    for r in rows:
        counts[r[1]] = counts.get(r[1], 0) + 1
    print('differences:', len(rows), counts)
    if out:
        with open(out, 'w', encoding='utf-8') as f:
            for p, st, a, b in rows:
                f.write('\t'.join([p, st, json.dumps(a, ensure_ascii=False), json.dumps(b, ensure_ascii=False)]) + '\n')
    if '--print' in sys.argv:
        for p, st, a, b in rows:
            print(st, '|', p, '| TV', short(a), '| VV', short(b))


if __name__ == '__main__':
    main()
