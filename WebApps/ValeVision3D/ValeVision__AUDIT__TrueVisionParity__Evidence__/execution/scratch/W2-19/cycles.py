"""W2-19 - static import cycles through the object snap files (Tarjan SCC over every module reachable from them)."""
import os, re, sys
SRC = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules'
LE = os.path.join(SRC, '51__System__LayoutEditor')
STATIC = re.compile(r'^\s*import\s+(?:[\w*\s{},$]+?\s+from\s+)?[\'"]([^\'"]+)[\'"]', re.M)
SEEDS = [os.path.join(LE, p) for p in (
    r'28__System__ObjectSnap\Na__LayoutEditor__ObjectSnap__.js',
    r'28__System__ObjectSnap\Na__LayoutEditor__ObjectSnap__Search__.js',
    r'28__System__ObjectSnap\Na__LayoutEditor__ObjectSnap__Menu__.js',
    r'28__System__ObjectSnap\Na__LayoutEditor__ObjectSnap__Moves__.js',
    r'30__System__SheetTools\Na__LayoutEditor__Snapping__.js',
    r'30__System__SheetTools\Na__LayoutEditor__SheetTools__Keyboard__.js',
    r'30__System__SheetTools\Na__LayoutEditor__SheetTools__ContextMenu__.js',
    r'40__Ui__Panels\Na__LayoutEditor__Toolbar__.js',
    r'05__Core__ModeController\Na__LayoutEditor__ModeController__.js')]
graph = {}


def deps(path):
    if path in graph:
        return graph[path]
    text = open(path, encoding='utf-8').read()
    text = re.sub(r'/\*[\s\S]*?\*/', '', text)
    text = re.sub(r'^\s*//[^\n]*', '', text, flags=re.M)
    out = []
    for spec in STATIC.findall(text):
        if spec.startswith('.'):
            t = os.path.normpath(os.path.join(os.path.dirname(path), spec))
            if os.path.exists(t) and t.endswith('.js'):
                out.append(t)
    graph[path] = out
    return out


stack = list(SEEDS)
seen = set()
while stack:
    p = stack.pop()
    if p in seen:
        continue
    seen.add(p)
    stack.extend(deps(p))

sys.setrecursionlimit(100000)
index, low, on, st, sccs, counter = {}, {}, set(), [], [], [0]


def strong(v):
    index[v] = low[v] = counter[0]; counter[0] += 1
    st.append(v); on.add(v)
    for w in graph.get(v, []):
        if w not in index:
            strong(w); low[v] = min(low[v], low[w])
        elif w in on:
            low[v] = min(low[v], index[w])
    if low[v] == index[v]:
        comp = []
        while True:
            w = st.pop(); on.discard(w); comp.append(w)
            if w == v:
                break
        if len(comp) > 1:
            sccs.append(comp)


for v in list(graph):
    if v not in index:
        strong(v)

rel = lambda p: os.path.relpath(p, LE)
mine = {os.path.normpath(s) for s in SEEDS} | {os.path.join(LE, r'28__System__ObjectSnap', f) for f in os.listdir(os.path.join(LE, '28__System__ObjectSnap'))}
print('modules reachable from the seeds:', len(graph))
hit = 0
for comp in sccs:
    touches = [rel(p) for p in comp if os.path.normpath(p) in mine]
    print('CYCLE (%d modules)%s' % (len(comp), (' touching ' + ', '.join(touches)) if touches else ' (none of this package\'s files)'))
    for p in sorted(comp)[:40]:
        print('    ', rel(p))
    if touches:
        hit += 1
print('CYCLES THROUGH THIS PACKAGE\'S FILES:', hit)
