# W2-40 scratch (read-only): list every .glb URL a project.json names, with the JSON path it sits at
import json, sys

def walk(node, path, out):
    if isinstance(node, dict):
        for k, v in node.items():
            walk(v, path + [str(k)], out)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            walk(v, path + [str(i)], out)
    elif isinstance(node, str) and '.glb' in node.lower():
        out.append(('/'.join(path), node))

for p in sys.argv[1:]:
    with open(p, 'rb') as f:
        data = json.loads(f.read().decode('utf-8-sig'))
    out = []
    walk(data, [], out)
    print('===', p, len(out), 'glb strings')
    for path, url in out:
        print(path, '=>', url)
