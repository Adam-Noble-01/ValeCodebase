"""R3 helper: the wiring-system dependency DAG for Section C, derived from K3.

Groups K3 canonical packages (parity/data/wp_canonical.json) into wiring systems, takes every
direct depends_on edge between packages that are not Parity Scribe passes (Wn-99 / W6-04; those are
the wave barriers, listed separately), lifts the edges to systems, removes transitive edges and
prints a mermaid flowchart. Also checks the lifted graph is acyclic. Read-only."""
import json, os, sys
sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(HERE, '..', '..', 'data', 'wp_canonical.json'), encoding='utf-8'))
P = {p['wp_id']: p for p in D['packages']}

SYSTEMS = [
    # id, label, packages
    ('DEC', 'Decision record<br>W0-01', ['W0-01']),
    ('REN', 'Folder renumber W1<br>W0-02', ['W0-02']),
    ('KEYN', 'Hotkey file names<br>W0-03', ['W0-03']),
    ('GATE', 'Swarm gates, port order, ledger<br>W0-04 W0-05 W0-06', ['W0-04', 'W0-05', 'W0-06']),
    ('SYNC', 'Sync pipeline safety<br>W0-07', ['W0-07']),
    ('SW', 'Shared SW package (prepared)<br>W0-08', ['W0-08']),
    ('FLASK', 'Flask core + blueprints<br>W0-09 W0-18 W0-19', ['W0-09', 'W0-18', 'W0-19']),
    ('WORKER', 'Worker 1.6.0<br>W0-10', ['W0-10']),
    ('PLID', 'ProjectLoader identity helpers<br>W0-11', ['W0-11']),
    ('FACADE', 'Transport facade Na__CfApi / Na__LocalMirror<br>W0-12', ['W0-12']),
    ('LSEQ', 'LoadingSequence wiring<br>W0-13', ['W0-13']),
    ('ASSET', 'Asset contract + thumbnail shape<br>W0-14', ['W0-14']),
    ('CFG', 'LE config + KeyMap 1.11.0 + vendors<br>W0-15 W0-16', ['W0-15', 'W0-16']),
    ('IDX', 'index.html start-up order<br>W0-17', ['W0-17']),
    ('RLOOP', 'Render-loop overlays, IsPaused, ModelToggle, PhaseLib<br>W1-01', ['W1-01']),
    ('PDATA', 'ProjectData 1.6.0<br>W1-05', ['W1-05']),
    ('AUTO', 'AutoSave 1.5.0 draft guard<br>W1-07', ['W1-07']),
    ('MODEL', 'Records + SheetModel + late start<br>W1-13 W1-19 W1-20 W1-21', ['W1-13', 'W1-19', 'W1-20', 'W1-21']),
    ('KEYS', 'KeyScope + DocumentKeys<br>W1-29 W1-30', ['W1-29', 'W1-30']),
    ('LOADER', 'Loader facade 1.2<br>W1-31', ['W1-31']),
    ('MC', 'ModeController core<br>W1-32', ['W1-32']),
    ('VEIL', 'Veil + header fold<br>W1-33', ['W1-33']),
    ('TABS', 'TabStrip 2.0.0<br>W1-34', ['W1-34']),
    ('NAV', 'Navigation + Controls keys<br>W1-36', ['W1-36']),
    ('PAINT', 'Chrome, paint order, PDF fonts<br>W1-25 W1-26 W1-28', ['W1-25', 'W1-26', 'W1-28']),
    ('PLANES', 'Drawing Planes 47<br>W2-40 W2-01', ['W2-40', 'W2-01']),
    ('FOGL', 'Depth-fog pure leaves (inert)<br>W1-09', ['W1-09']),
    ('FOG', 'Depth fog wiring + section adapter<br>W2-02 W2-03 W2-12', ['W2-02', 'W2-03', 'W2-12']),
    ('VP', 'Viewport convergence + ModelSource<br>W2-15 W2-16', ['W2-15', 'W2-16']),
    ('SNAP', 'Object snap + drafting aids<br>W2-42 W2-19 W2-18', ['W2-42', 'W2-19', 'W2-18']),
    ('SPEC', 'Spec lockstep + spell check<br>W2-30 W2-31 W2-34', ['W2-30', 'W2-31', 'W2-34']),
    ('HUB', 'SheetTools hub<br>W3-01 W3-02 W3-03', ['W3-01', 'W3-02', 'W3-03']),
    ('ON', 'Feature switch-ons<br>W3-05 W3-07 W3-09 W3-10', ['W3-05', 'W3-07', 'W3-09', 'W3-10']),
    ('PUB', 'Published schema, reader, publisher<br>W4-01 W4-17 W4-02 W4-03 W4-07', ['W4-01', 'W4-17', 'W4-02', 'W4-03', 'W4-07']),
    ('SHARE', 'Document sharing + boot share check<br>W4-08', ['W4-08']),
    ('REG', 'Drawing Register<br>W4-18 W4-10', ['W4-18', 'W4-10']),
    ('VIEWER', 'Web viewer published<br>W4-09', ['W4-09']),
    ('STMTD', 'Statement data + transport binding<br>W4-04 W4-05 W4-06', ['W4-04', 'W4-05', 'W4-06']),
    ('STMT', 'Statement surface + wiring (switched off)<br>W4-11 W4-12 W4-13', ['W4-11', 'W4-12', 'W4-13']),
    ('CONV', 'Convergence: toolbar, CSS, MC<br>W5-01 W5-02 W5-03', ['W5-01', 'W5-02', 'W5-03']),
    ('CLOSE', 'Retirements, SW refresh, test sweep<br>W6-03 W6-02 W6-01', ['W6-03', 'W6-02', 'W6-01']),
]
SCRIBES = {p for p in P if p.endswith('-99')} | {'W6-04'}
sys_of = {}
for sid, _, pkgs in SYSTEMS:
    for w in pkgs:
        assert w in P, w
        sys_of[w] = sid

# closure over non-scribe package edges (so a path through an unselected package still counts)
def deps(w):
    return [d for d in P[w]['depends_on'] if d not in SCRIBES]

memo = {}
def reach(w):
    if w in memo:
        return memo[w]
    out = set()
    for d in deps(w):
        out.add(d)
        out |= reach(d)
    memo[w] = out
    return out

edges = set()
for w, s in sys_of.items():
    for d in reach(w):
        if d in sys_of and sys_of[d] != s:
            edges.add((sys_of[d], s))

# acyclic check
ids = [s[0] for s in SYSTEMS]
adj = {i: set() for i in ids}
for a, b in edges:
    adj[a].add(b)
seen, stack, order = set(), set(), []
def dfs(n):
    if n in stack:
        raise SystemExit('cycle at ' + n)
    if n in seen:
        return
    stack.add(n)
    for m in adj[n]:
        dfs(m)
    stack.discard(n)
    seen.add(n)
    order.append(n)
for i in ids:
    dfs(i)

# transitive reduction
def reachable(a, b, skip):
    todo = [x for x in adj[a] if (a, x) != skip]
    vis = set()
    while todo:
        n = todo.pop()
        if n == b:
            return True
        if n in vis:
            continue
        vis.add(n)
        todo.extend(adj[n])
    return False
red = {(a, b) for (a, b) in edges if not reachable(a, b, (a, b))}

def wave_of(sid):
    pk = [x for s, _, x in SYSTEMS if s == sid][0]
    return min(P[w]['wave'] for w in pk)
waves = ['W0', 'W1', 'W2', 'W3', 'W4', 'W5', 'W6']
titles = {'W0': 'W0 foundations', 'W1': 'W1 core data and hubs', 'W2': 'W2 subsystems',
          'W3': 'W3 SheetTools hub and switch-ons', 'W4': 'W4 documents', 'W5': 'W5 convergence', 'W6': 'W6 close-out'}
print('```mermaid')
print('flowchart TD')
for wv in waves:
    members = [s for s in SYSTEMS if wave_of(s[0]) == wv]
    if not members:
        continue
    print(f'    subgraph {wv}["{titles[wv]}"]')
    for sid, label, _ in members:
        print(f'        {sid}["{label}"]')
    print('    end')
for a, b in sorted(red, key=lambda e: (ids.index(e[0]), ids.index(e[1]))):
    print(f'    {a} --> {b}')
present = [w for w in waves if any(wave_of(s[0]) == w for s in SYSTEMS)]
for x, y in zip(present, present[1:]):
    print(f'    {x} ==>|{x}-99 scribe barrier| {y}')
print('```')
print(f'<!-- systems {len(SYSTEMS)}, lifted edges {len(edges)}, after reduction {len(red)}, acyclic yes -->')
