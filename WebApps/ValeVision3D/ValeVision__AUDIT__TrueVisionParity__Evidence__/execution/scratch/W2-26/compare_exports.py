import re, pathlib
here = pathlib.Path(__file__).parent
def exports(t):
    out = set()
    for blk in re.finditer(r'export\s*\{([^}]*)\}', t):
        for s in blk.group(1).split(','):
            s = re.sub(r'//.*', '', s).strip()
            if s: out.add(s.split(' as ')[-1].strip())
    for d in re.finditer(r'export\s+(?:const|let|function|class|async function)\s+(\w+)', t):
        out.add(d.group(1))
    return out
for n in ['DimensionTool', 'RectangleTool', 'TextTool', 'LeaderTool']:
    tv = exports((here / f'tv_{n}.js').read_text(encoding='utf-8'))
    vv = exports((here / f'vv_before_{n}.js').read_text(encoding='utf-8'))
    print(n, 'TV', len(tv), 'VV', len(vv), 'dropped:', sorted(vv - tv), 'new:', sorted(tv - vv))
