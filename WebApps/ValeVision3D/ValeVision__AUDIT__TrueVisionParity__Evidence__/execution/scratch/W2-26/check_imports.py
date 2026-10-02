import re, pathlib, sys
here = pathlib.Path(__file__).parent
vvdir = pathlib.Path(r'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools')
names = ['DimensionTool', 'RectangleTool', 'TextTool', 'LeaderTool']
imp = re.compile(r'import\s*\{([^}]*)\}\s*from\s*[\'"]([^\'"]+)[\'"]', re.S)
bad = 0
for n in names:
    src = (here / f'tv_{n}.js').read_text(encoding='utf-8')
    for m in imp.finditer(src):
        syms = [s.strip().split(' as ')[0].strip() for s in m.group(1).split(',')]
        syms = [re.sub(r'//.*', '', s).strip() for s in syms]
        syms = [s for s in syms if s]
        target = (vvdir / m.group(2)).resolve()
        if not target.exists():
            print(n, 'MISSING FILE', m.group(2)); bad += 1; continue
        t = target.read_text(encoding='utf-8', errors='replace')
        exports = set()
        for blk in re.finditer(r'export\s*\{([^}]*)\}', t):
            for s in blk.group(1).split(','):
                s = re.sub(r'//.*', '', s).strip()
                if not s: continue
                parts = s.split(' as ')
                exports.add(parts[-1].strip())
        for d in re.finditer(r'export\s+(?:const|let|function|class|async function)\s+(\w+)', t):
            exports.add(d.group(1))
        miss = [s for s in syms if s not in exports]
        print(n, m.group(2).split('/')[-1], len(syms), 'ok' if not miss else 'MISSING ' + ','.join(miss))
        bad += len(miss)
print('BAD', bad)
sys.exit(1 if bad else 0)
