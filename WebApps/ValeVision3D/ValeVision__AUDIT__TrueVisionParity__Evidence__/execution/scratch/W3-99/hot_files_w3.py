"""W3-99 - read-only: which of the files the placeholder pass changed are hot files with a later editor."""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
EV = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
h = json.load(open(os.path.join(EV, 'parity', 'data', 'hot_file_ownership.json'), encoding='utf-8'))
m = json.load(open(os.path.join(HERE, 'preimage_manifest.json'), encoding='utf-8'))


def entries(x):
    if isinstance(x, dict):
        for k, v in x.items():
            if isinstance(v, (dict, list)) and not re.search(r'\.(js|mjs|cjs|css|json|html|py|md)$', k):
                yield from entries(v)
            else:
                yield k, v
    elif isinstance(x, list):
        for y in x:
            if isinstance(y, dict):
                k = y.get('path') or y.get('file') or y.get('hot_file')
                if k:
                    yield k, y


ents = [(k.replace('\\', '/'), v) for k, v in entries(h)]
lines = []
for r in m:
    rel = r['rel'].replace('WebApps/ValeVision3D/', '')
    base = rel.split('/')[-1]
    parent = rel.split('/')[-2]
    for k, v in ents:
        if k.endswith('/' + base) and (parent in k or '/' not in k[:-len(base) - 1]):
            pk = sorted(set(re.findall(r'W[0-6]-\d\d', json.dumps(v))))
            later = [p for p in pk if p > 'W3-18' or p == 'W3-04']
            lines.append('%s | %s -> %s | later: %s' % (rel, r['sha1_before'][:8], r['sha1_after'][:8],
                                                       ', '.join(later) or 'none'))
            break
open(os.path.join(HERE, 'hot_files_w3.txt'), 'w', encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')
print('\n'.join(lines))
print(len(lines), 'hot files of', len(m))
