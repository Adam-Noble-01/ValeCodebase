#!/usr/bin/env python3
"""R6 - builds Section F (Swarm Delegation Plan) of the parity report.

Reads only the parity scratchpad (K1-K3 artefacts, ref snapshots, r6_eol_scan.json).
Writes parity/report/R6__F_SwarmDelegationPlan.md. Re-run after any change to
parity/data/wp_canonical.json; never hand-edit the generated tables.
"""
import collections
import math
import os
import re
import sys

TOOLS = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, TOOLS)

import r6_compute as C          # noqa: E402
import r6_prose as T            # noqa: E402
import r6_corrections as K      # noqa: E402
from k3_report_md import WAVE_THEME  # noqa: E402

OUT = os.path.join(C.REPORT, 'R6__F_SwarmDelegationPlan.md')
P = C.P
PV = K.overlaid(P, C.canon)     # overlay OFF since H2: the JSON carries every F.8 correction; this only checks they are all there
L = []
A = L.append


def fmt(n):
    return '-' if n is None else '{:,}'.format(n)


TAG = re.compile(r'<(?=[A-Za-z/!])')


def cell(s):
    """Escape for a markdown table cell: pipes, newlines, and tag-like '<' outside code spans
    (inside a backtick span '<' is literal and an entity would print as-is)."""
    s = (s or '').replace('\r', ' ').replace('\n', ' ')
    parts = s.split('`')
    for i in range(0, len(parts), 2):
        parts[i] = TAG.sub('&lt;', parts[i])
    s = '`'.join(parts)
    return s.replace('|', '\\|')


def short(p):
    p = p.replace('TVM/51__System__LayoutEditor/', 'TLE/').replace('VVM/51__System__LayoutEditor/', 'VLE/')
    p = p.replace('VV/02__Src__AppModules/51__System__LayoutEditor/', 'VLE/').replace('TV/02__Src__AppModules/51__System__LayoutEditor/', 'TLE/')
    p = p.replace('VV/02__Src__AppModules/', 'VVM/').replace('TV/02__Src__AppModules/', 'TVM/')
    return p


def group_render(entries):
    """entries: list of (display_path, label_suffix, prefix_mark). Group by folder."""
    by_dir = collections.OrderedDict()
    singles = []
    for disp, notes, mark in entries:
        if disp.endswith('/') or '/' not in disp:
            singles.append((disp, notes, mark))
            continue
        d, f = disp.rsplit('/', 1)
        by_dir.setdefault(d, []).append((f, notes, mark))
    out = []
    for d, files in by_dir.items():
        names = []
        for f, notes, mark in files:
            nm = mark + f
            if notes:
                nm += ' (' + '; '.join(notes) + ')'
            names.append(nm)
        if len(names) == 1:
            out.append('`%s/%s`' % (d, names[0]))
        else:
            out.append('`%s/{%s}`' % (d, ', '.join(names)))
    for disp, notes, mark in singles:
        nm = mark + disp
        if notes:
            nm += ' (' + '; '.join(notes) + ')'
        out.append('`%s`' % nm)
    return out


def side(path):
    for pre, root in (('TVM/', 'M'), ('VVM/', 'M'), ('TV/', 'R'), ('VV/', 'R')):
        if path.startswith(pre):
            return root, path[len(pre):]
    return None, None


def pair_label(root, rel):
    if root == 'M':
        if rel.startswith('51__System__LayoutEditor/'):
            return 'LE/' + rel[len('51__System__LayoutEditor/'):]
        return 'M/' + rel
    return 'R/' + rel


def sources_targets(p):
    tv = [C.parse_item(s) for s in p['tv_sources']]
    vv = [C.parse_item(s) for s in p['vv_targets']]
    tvt = [C.parse_item(s) for s in p.get('tv_targets', [])]
    moves = [x['text'] for x in tv + vv + tvt if x['kind'] == 'move']
    tv = [x for x in tv if x['kind'] == 'path']
    vv = [x for x in vv if x['kind'] == 'path']
    tvt = [x for x in tvt if x['kind'] == 'path']
    tv_keys = {}
    for x in tv:
        r, rel = side(x['path'])
        if r and x['path'].startswith(('TVM/', 'TV/')):
            tv_keys[(r, rel)] = x
    same, vv_only = [], []
    used = set()
    for x in vv:
        r, rel = side(x['path'])
        if r and x['path'].startswith(('VVM/', 'VV/')) and (r, rel) in tv_keys:
            t = tv_keys[(r, rel)]
            used.add((r, rel))
            same.append((pair_label(r, rel), t['notes'] + x['notes'], '+' if x['new'] else ''))
        else:
            vv_only.append((short(x['path']), x['notes'], '+' if x['new'] else ''))
    tv_only = []
    for x in tv:
        r, rel = side(x['path'])
        if (r, rel) in used:
            continue
        tv_only.append((short(x['path']), x['notes'], ''))
    parts = []
    if same:
        parts.append('**=** ' + ', '.join(group_render(same)))
    if tv_only:
        parts.append('**TV:** ' + ', '.join(group_render(tv_only)))
    if vv_only:
        parts.append('**VV:** ' + ', '.join(group_render(vv_only)))
    if tvt:
        parts.append('**TV edits:** ' + ', '.join(group_render([(short(x['path']), x['notes'], '+' if x['new'] else '') for x in tvt])))
    if moves:
        parts.append('**move:** ' + ', '.join('`%s`' % short(m) for m in moves))
    return '<br>'.join(parts) if parts else '-'


def hot_cell(p):
    out = []
    for h in p['hot_files']:
        cp = C.canon_path(h)
        base = cp.rstrip('/').split('/')[-1]
        e = C.HOT.get(cp)
        if not e:
            out.append('`%s`' % base)
            continue
        if e.get('integrator'):
            out.append('`%s` (integrator: %s)' % (base, e['integrator']))
            continue
        pos = None
        for so in e.get('same_wave_serial_orders', []):
            if so['wave'] == p['wave'] and p['wp_id'] in so['serial_order']:
                order = so['serial_order']
                i = order.index(p['wp_id'])
                pre = order[i - 1] if i > 0 else None
                nxt = order[i + 1] if i + 1 < len(order) else None
                bits = []
                if pre:
                    bits.append('after ' + pre)
                if nxt:
                    bits.append('before ' + nxt)
                pos = ', '.join(bits) if bits else 'first'
        if pos is None:
            eds = e['editors']
            i = eds.index(p['wp_id']) if p['wp_id'] in eds else -1
            pos = 'editor %d of %d, barrier-ordered' % (i + 1, len(eds)) if i >= 0 else 'listed hot'
        out.append('`%s` (%s)' % (base, pos))
    return '<br>'.join(out) if out else '-'


def deps_cell(p):
    ds = p['depends_on']
    if p['wp_id'] in C.SCRIBES.values() and len(ds) > 6:
        return 'every package of %s (%d)' % (p['wave'], len(ds))
    return ', '.join(ds) if ds else '-'


def gated_cell(p):
    s = ', '.join(p['gated_by']) if p['gated_by'] else '-'
    if p['hard_gate']:
        s += '<br>**HARD:** ' + cell(p['hard_gate'])
    return s


def gates_short(g):
    std = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7']
    if all(x in std for x in g):
        if g == std or sorted(g) == std:
            return 'G1-G7'
        return ','.join(sorted(g, key=lambda x: int(x[1:])))
    return '; '.join(g)


def tests_cell(p):
    t = [cell(x) for x in p['tests_to_port']]
    t.append('Gates: ' + cell(gates_short(p['harness_gates'])))
    return '<br>'.join(t)


def acc_cell(p):
    return '<br>'.join('%d. %s' % (i + 1, cell(a)) for i, a in enumerate(p['acceptance'])) or '-'


def size_cell(p):
    return '%s (%s)' % (p['size'], fmt(p['est_lines']) if p['est_lines'] is not None else 'unestimated')


# =============================================================================
# Section header and F.0
# =============================================================================
A('## Section F - Swarm Delegation Plan')
A('')
A(T.INTRO)
A('')
eff = {r['wave']: r for r in C.effort()}
vv_pk = sum(eff[w]['packages'] for w in C.VV_WAVES)
vv_est = sum(eff[w]['est'] for w in C.VV_WAVES)
crit = C.critical()
KS = (1, 2, 3, 4, 6, 8, 13)
SIZING = {k: sum(C.simulate(w, k) for w in C.VV_WAVES) for k in KS}      # list-scheduling makespans (F.2.3)
_cpl = crit['by_est_lines']['est_lines']
assert SIZING[6] == _cpl, 'the text says six package agents reach the critical path'
WITHIN4 = '%d%%' % max(1, math.ceil(100.0 * (SIZING[4] - _cpl) / _cpl))
HALF2 = '%d%%' % round(100.0 * SIZING[2] / SIZING[1])
A('**Headline.** %d canonical packages: %d in the ValeVision waves W0-W6 (seven of them Parity Scribe passes) and %d in the TrueVision lane WT. '
  'Estimated %s lines in the VV waves (plus W5-06, unestimated) and %s in WT. The critical path is %s estimated lines over %d packages (%d packages by count); '
  'W4 is the longest stretch (%s lines). %d files are written by more than one package, all serialised. List scheduling over the same estimates (F.2.3) shows '
  'that 4 package agents finish within %s of the critical path and 6 reach it, so the swarm should be 4-6 package agents plus one integrator and one scribe; more agents add lock contention without shortening the path. The counts include W5-07 (retiring the Layout Mode switch), the conditional package F.8 C33 added to `wp_canonical.json` on 01-Oct-2026 with the other F.8 corrections. '
  'Run on the K1 defaults alone, the programme ends with an editor that matches TrueVision\'s code and behaviour but still differs on screen in the thirteen ways the front matter lists (R0.1.8, E1-E13): '
  'for example four tabs, not five, while DR-10 keeps the Statement Writer switched off; each row there names the answer or live action that removes the difference, and two of them (the lazy loader\'s first-open cover and Vale\'s brand content) are permanent by design.'
  % (len(C.ORDER), vv_pk, eff['WT']['packages'], fmt(vv_est), fmt(eff['WT']['est']), fmt(crit['by_est_lines']['est_lines']),
     len(crit['by_est_lines']['path']), crit['by_package_count']['packages'], fmt(crit['per_wave']['W4']['est_lines']),
     C.hot['counts']['files_with_multiple_editors'], WITHIN4))
A('')
A(T.STATE)
A('')

# =============================================================================
# F.1
# =============================================================================
A(T.PRINCIPLES_HEAD)
for pid, name, rule, ev in T.PRINCIPLES:
    A('| %s | %s | %s | %s |' % (pid, cell(name), cell(rule), cell(ev)))
A('')
A(T.HEADER_SKELETON)
A('')

# =============================================================================
# F.2
# =============================================================================
A('### F.2 Waves, the package DAG and the critical path')
A('')
A(T.PROGRAMME_FLOW)
A('')

# ---- F.2.2 wave summary
A('#### F.2.2 Wave summary (generated)')
A('')
A('"Levels" counts the dependency steps inside the wave (scribe excluded); "widest" is the most packages that can run at once; "useful concurrency" is the wave\'s estimated lines divided by its critical path - the average number of agents the wave can keep busy.')
A('')
A('| Wave | Theme | Packages | Est. lines | S / M / L / XL | Levels | Widest level | Critical path (lines) | Useful concurrency | Hard-gated packages | Scribe |')
A('|---|---|---|---|---|---|---|---|---|---|---|')
for w in C.WAVES:
    r = eff[w]
    lv, by = C.levels(w)
    widest = max(len(v) for v in by.values())
    cpl = crit['per_wave'][w]['est_lines'] if w in crit['per_wave'] else crit['truevision_lane']['est_lines']
    sz = ' / '.join(str(r['sizes'].get(k, 0)) for k in ('S', 'M', 'L', 'XL'))
    held = [x for x in C.wave_members(w) if P[x]['hard_gate']]
    held_s = ', '.join(held) if w != 'WT' else 'all 12 (DR-36)'
    est = fmt(r['est']) + (' (+%s unestimated)' % ', '.join(r['unest']) if r['unest'] else '')
    A('| %s | %s | %d | %s | %s | %d | %d | %s | %.1f | %s | %s |' % (
        w, cell(WAVE_THEME[w]), r['packages'], est, sz, len(by), widest, fmt(cpl), (r['est'] / cpl) if cpl else 0,
        held_s or '-', C.SCRIBES.get(w, '- (each package writes the TV devlog)')))
A('')

# ---- F.2.3 swarm sizing
A('#### F.2.3 Swarm sizing: makespan by number of package agents (generated)')
A('')
A('Greedy list scheduling inside each wave (a package starts when its dependencies are DONE; priority = longest remaining path), using K3\'s estimated lines as the duration unit and the wave barrier between waves. The scribe is included in its wave. Hot-file orders are already DAG edges, so the simulation respects them.')
A('')
ks = KS
A('| Wave | ' + ' | '.join('%d agent%s' % (k, '' if k == 1 else 's') for k in ks) + ' |')
A('|---|' + '---|' * len(ks))
tot = collections.Counter()
for w in C.VV_WAVES:
    row = []
    for k in ks:
        m = C.simulate(w, k)
        tot[k] += m
        row.append(fmt(m))
    A('| %s | %s |' % (w, ' | '.join(row)))
A('| **W0-W6** | %s |' % ' | '.join('**%s**' % fmt(tot[k]) for k in ks))
A('| WT (serial) | %s |' % ' | '.join(fmt(C.simulate('WT', 1)) for _ in ks))
A('')
A('Reading: two agents cut the programme to %s of the one-agent time; four come within %s of the critical path (%s lines); six reach it. W3 and W4 are chains around their hubs (W3-03, W4-12) and gain nothing beyond two or three agents, so more agents only add lock contention. Assign the strongest agent to the critical-path packages (F.2.5) and to the two atomic XL hubs.' % (HALF2, WITHIN4, fmt(crit['by_est_lines']['est_lines'])))
A('')

# ---- F.2.4 dispatch levels
A('#### F.2.4 Dispatch levels inside each wave (generated)')
A('')
A('Dispatch by readiness, not by level: a package starts as soon as its own dependencies are DONE and its hot-file locks are free (F.4.2). The levels only show how wide each wave gets. Estimated lines in brackets; **bold** = on the wave\'s critical path.')
A('')
A('| Wave | Level | Packages |')
A('|---|---|---|')
for w in C.WAVES:
    lv, by = C.levels(w)
    cp = set(crit['per_wave'][w]['path']) if w in crit['per_wave'] else set(crit['truevision_lane']['path'])
    for l in sorted(by):
        ids = sorted(by[l], key=lambda x: C.POS[x])
        txt = ', '.join(('**%s**' % x if x in cp else x) + ' (%s)' % fmt(P[x]['est_lines']) for x in ids)
        A('| %s | %d | %s |' % (w, l, txt))
    if w in C.SCRIBES:
        A('| %s | last | %s (scribe, %s) |' % (w, C.SCRIBES[w], fmt(P[C.SCRIBES[w]]['est_lines'])))
A('')

# ---- F.2.5 critical path
A('#### F.2.5 Critical path (generated from `wp_canonical.json`)')
A('')
A('| Wave | Path | Est. lines | Share of wave |')
A('|---|---|---|---|')
for w in C.VV_WAVES:
    cpw = crit['per_wave'][w]
    A('| %s | %s | %s | %d%% |' % (w, ' -> '.join(cpw['path']), fmt(cpw['est_lines']), round(100 * cpw['est_lines'] / eff[w]['est'])))
A('| **W0-W6** | %d packages | **%s** | %d%% |' % (len(crit['by_est_lines']['path']), fmt(crit['by_est_lines']['est_lines']), round(100 * crit['by_est_lines']['est_lines'] / vv_est)))
A('| WT | %s | %s | 100%% |' % (' -> '.join(crit['truevision_lane']['path']), fmt(crit['truevision_lane']['est_lines'])))
A('')
A('By package count the longest chain is %d packages: %s.' % (crit['by_package_count']['packages'], ' -> '.join(crit['by_package_count']['path'])))
A('')

# ---- F.2.6 per-wave DAG
A('#### F.2.6 Package DAG per wave (generated; transitive reduction)')
A('')
A('Filled nodes are on the wave\'s critical path. Dashed nodes carry a hard gate: either held until Adam answers (W3-04, W5-04, W5-05, W5-06, W5-07, W6-03 and the whole WT lane) or dispatched normally but landed prepared or switched off with an action of Adam\'s outstanding (W0-07, W0-08, W0-10, W4-12, W4-13, W6-02). The thick node is the scribe; a dotted entry node is the previous wave\'s scribe (or, for WT, W0-01 and W4-99).')
A('')


def mid(w):
    return w.replace('-', '_')


def short_title(t, n=40):
    s = re.split(r'\s+\(|:\s| - ', t)[0].strip()
    if len(s) > n:
        s = s[:n - 1].rstrip() + '...'
    return s.replace('"', "'")


for w in C.WAVES:
    members = C.wave_members(w)
    cp = set(crit['per_wave'][w]['path']) if w in crit['per_wave'] else set(crit['truevision_lane']['path'])
    A('**%s** - %s' % (w, WAVE_THEME[w]))
    A('')
    A('```mermaid')
    A('flowchart TD')
    entries = set()
    for x, ext in C.entry_nodes(w):
        for e in ext:
            entries.add(e)
    for e in sorted(entries, key=lambda z: C.POS[z]):
        A('    %s["%s"]:::entry' % (mid(e), e))
    for x in members:
        if x == C.SCRIBES.get(w):
            cls = 'scribe'
        elif P[x]['hard_gate']:
            cls = 'critheld' if x in cp else 'held'
        else:
            cls = 'crit' if x in cp else 'pkg'
        A('    %s["%s<br/>%s"]:::%s' % (mid(x), x, short_title(P[x]['title']), cls))
    for x, ext in C.entry_nodes(w):
        mset = set(members)
        intra = [d for d in P[x]['depends_on'] if d in mset]
        for e in ext:
            # draw the entry edge only when no intra-wave dependency already implies it
            if not any(e in C.ancestors(d) for d in intra):
                A('    %s -.-> %s' % (mid(e), mid(x)))
    for a, b in C.reduced_edges(w):
        A('    %s --> %s' % (mid(a), mid(b)))
    A('    classDef entry stroke-dasharray: 3 3')
    A('    classDef held stroke-dasharray: 6 4')
    A('    classDef scribe stroke-width: 3px')
    A('    classDef crit fill:#fde68a,stroke:#92400e')
    A('    classDef critheld fill:#fde68a,stroke:#92400e,stroke-dasharray: 6 4')
    A('    classDef pkg stroke-width: 1px')
    A('```')
    A('')

# =============================================================================
# F.3 catalogue
# =============================================================================
A('### F.3 Work-package catalogue (generated, one table per wave)')
A('')
A('Source: `parity/data/wp_canonical.json` (goal, adaptations, risk, raw ids and gate provenance are there and in K3 section 5; this catalogue carries what a delegator needs to dispatch and accept a package). Conventions:')
A('')
A('- **=** `<path>`: the same relative path in both apps, TV file at the pin -> VV target. `LE/` = `51__System__LayoutEditor/` under TVM/ (TV side) or VVM/ (VV side); `M/` = `02__Src__AppModules/` of each app; `R/` = each app root. **TV:** TV-only sources (read, not landed at that path); **VV:** VV-only targets; **TV edits:** files a WT package changes in TrueVision; **move:** a rename or move. `+name` = created by the package; `{a, b}` = several files in one folder; `(text)` = K3\'s annotation (hunks, reference only, verbatim...).')
A('- Hot files: position in that file\'s same-wave serial order (F.4.4); "barrier-ordered" = other editors are in other waves; "integrator" = written only by the named role.')
A('- Gated by: the K1 decisions that set the package\'s scope; it runs on the DR default unless a **HARD** gate says it waits. Size: S <= 300 est. lines, M <= 1,200, L <= 2,500, XL above that or more than 15 files.')
A('- Tests: TV tests ported (or VV-only tests written) by the package, then its harness gates (F.5.1).')
A('- `[F.8 Cn]` after a line, or `(F.8 Cn)` on a target: text that F.8 row Cn corrected or added. F.8 corrects %d packages and adds W5-07 (C33). Since 01-Oct-2026 the corrections are in `wp_canonical.json` itself, including the fields this table does not show (goal, adaptations, risk, notes, estimate notes; each corrected package lists its rows in `f8_corrections`), so this catalogue and the JSON agree and either can be used to brief.' % (len(K.touched()) - 1))
A('')
for w in C.WAVES:
    members = C.wave_members(w)
    A('#### %s - %s' % (w, WAVE_THEME[w]))
    A('')
    A('| ID | Title | TV sources -> VV targets | Hot files | Depends on | Gated by | Size (est. lines) | Acceptance | Tests |')
    A('|---|---|---|---|---|---|---|---|---|')
    for x in members:
        p = PV[x]
        A('| %s | %s | %s | %s | %s | %s | %s | %s | %s |' % (
            x, cell(p['title']), sources_targets(p), hot_cell(p), deps_cell(p), gated_cell(p), size_cell(p), acc_cell(p), tests_cell(p)))
    A('')

# =============================================================================
# F.4 hot files
# =============================================================================
A('### F.4 Hot-file ownership and the integrator role')
A('')
A('K3\'s hot-file register (`parity/data/hot_file_ownership.json`) lists %d files written by more than one package: %d with a same-wave serial order enforced by DAG edges, the rest ordered by the wave barrier, %d unordered. Three are integrator-owned: the VV devlog and ledger (the wave\'s Parity Scribe) and the shared service worker (W0-08, then W6-02).'
  % (C.hot['counts']['files_with_multiple_editors'], C.hot['counts']['same_wave_serialised'], C.hot['counts']['unordered']))
A('')
A(T.ROLES)
A('')
A('#### F.4.3 The hubs (five or more editors; generated)')
A('')
A('| File | Editors | Same-wave serial chains | Line ending today |')
A('|---|---|---|---|')
eolf = C.load('r6_eol_scan.json', C.TOOLS)['files']
hubs = sorted(C.hot['files'], key=lambda h: (-len(h['editors']), h['file']))
for h in hubs:
    if len(h['editors']) < 5:
        continue
    chains = '; '.join('%s: %s' % (so['wave'], ' > '.join(so['serial_order'])) for so in h.get('same_wave_serial_orders', []))
    if h.get('integrator'):
        chains = 'integrator: ' + h['integrator']
    A('| `%s` | %d: %s | %s | %s |' % (short(h['file']), len(h['editors']), ', '.join(h['editors']), chains or 'barrier only', eolf.get(h['file'], 'n/a (not yet at this path)')))
A('')
A('#### F.4.4 Every hot file, editors in order (generated)')
A('')
A('| File | Editors (topological order) | Rule |')
A('|---|---|---|')
for h in sorted(C.hot['files'], key=lambda h: h['file']):
    A('| `%s` | %s | %s |' % (short(h['file']), ', '.join(h['editors']), cell(h['rule'])))
A('')

# =============================================================================
# F.5 gates
# =============================================================================
A('### F.5 Gates between waves')
A('')
A(T.GATE_LADDER)
A('')
A('#### F.5.2 Wave entry and exit conditions')
A('')
A('"Decisions read" is generated: every DR in the `gated_by` of the wave\'s packages, with the number of packages that read it. Unanswered decisions run on their K1 default except where a package has a hard gate.')
A('')
A('| Wave | Entry (true before the first dispatch) | Decisions read in the wave (packages) | Exit (all must hold before the next wave) |')
A('|---|---|---|---|')
for w in C.WAVES:
    g = C.gated_union(w)
    gtxt = ', '.join('%s (%d)' % (k, v) for k, v in sorted(g.items(), key=lambda kv: int(kv[0][3:])))
    ent, ext = T.WAVE_GATES[w]
    A('| %s | %s | %s | %s |' % (w, cell(ent), gtxt, cell(ext)))
A('')

# ---- F.5.3 tests per wave
port, rerun, early, vvonly, replaces = C.tests_by_wave()
A('#### F.5.3 Tests per wave (generated from K3 test ownership)')
A('')
A('A TV test is ported by the package that creates its VV file; "re-run" lists suites a later package must run again; "sections earlier" are run from a scratch copy before the file lands. At every wave gate the integrator runs the WHOLE VV suite (every `Na__Test__*` and `Na__Verify__*` in `VV/80__Testing__PrototypeEnvironment`), not just the wave\'s. Baseline today: 6 node tests, 2 Python tests, 2 HTML harnesses and 2 verifiers (F.0).')
A('')
A('| Wave | TV tests ported (porter) | VV-only tests and verifiers written | Re-runs required in the wave | New test files at wave exit (cumulative) |')
A('|---|---|---|---|---|')
cum = 0
for w in C.WAVES:
    pt = sorted(port[w], key=lambda t: t[0])
    newfiles = [t for t in pt if 'replaces' not in t[2]] + vvonly[w]
    cum += len(newfiles)
    ptxt = '<br>'.join('`%s` (%s%s)' % (n, wp, ', replaces VV copy' if 'replaces' in st else '') for n, wp, st in pt) or '-'
    vtxt = '<br>'.join('`%s` (%s)' % (n, wp) for n, wp in sorted(vvonly[w])) or '-'
    rtxt = '<br>'.join('`%s` (%s)' % (n, wp) for n, wp in sorted(set(rerun[w]))) or '-'
    A('| %s | %s | %s | %s | %s |' % (w, ptxt, vtxt, rtxt, '-' if w == 'WT' else str(cum)))
A('')
A('Not ported, with reasons (K3 section 8): `Na__Test__DrawingProfileLines__.html` (imports TV 40 ProfileLines, which VV never ports - DIV-1), `Na__Test__IosTextureProbe__.html` (an on-device WebGL probe), `Na__Verify__RubySyntax__.py` (SketchUp Ruby). VV keeps its own sandbox environment files and its own Scrapbook and PerSceneLighting suites (re-run in W6-01).')
A('')
A(T.SMOKE)
A('')
A(T.RECORDS)
A('')
A(T.SW_POLICY)
A('')
A(T.ROLLBACK)
A('')

# =============================================================================
# F.6 brief template + W1-33
# =============================================================================
A(T.BRIEF_TEMPLATE.replace('{RULES}', '\n'.join('- ' + r for r in T.BRIEF_RULES)))
A('')
A(T.BRIEF_W133_INTRO)
A('')
p = PV['W1-33']


def turn(vv_path):
    cp = C.canon_path(vv_path)
    e = C.HOT.get(cp)
    if not e:
        return 'only editor in the programme'
    for so in e.get('same_wave_serial_orders', []):
        if so['wave'] == 'W1' and 'W1-33' in so['serial_order']:
            order = so['serial_order']
            i = order.index('W1-33')
            later = [x for x in e['editors'] if C.P[x]['wave'] != 'W1' and C.POS[x] > C.POS['W1-33']]
            s = ' > '.join(('[W1-33]' if x == 'W1-33' else x) for x in order)
            if later:
                s += '; later waves: ' + ', '.join(later)
            return s
    later = [x for x in e['editors'] if C.POS[x] > C.POS['W1-33']]
    return 'W1 single editor; later waves: ' + (', '.join(later) or '-')


ACTIONS = {
    'VVM/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js':
        'whole-file port of TV 1.1.0 (`TLE/05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js`); re-add VV-only export `Na__LeVeil__DrawingSettled`; add the `immediate` option to `FirstOpen`: with `jobs.immediate === true` it adds `na-le-veil--visible` and `na-le-veil--shown` together, with no reflow between them, before returning (full opacity in the first frame, TV LoadingOverlays `:275-277`), instead of arming the 550 ms timer (TV `:103`, `:353`); rewrite the PORT NOTE (VV `:53-62` says the going-in veil is deliberately not ported - no longer true)',
    'VVM/51__System__LayoutEditor/01__Core__Loader/Na__LayoutEditor__Loader__.js':
        'hunks: add `na-layout-editor--active` before the import for a non-quiet press that will enter; remove it on load failure, editor off in config, `Na__LeMode__Enter` false and Back to 3D Model; hide the boot veil straight after `action(editor)` returns (Enter has by then put the in-host veil up at full opacity); `WaitForFirstDrawing` resolves at once off the sheet view',
    'VVM/51__System__LayoutEditor/01__Core__Loader/Na__LayoutEditor__LoadingScreen__.js':
        'hunks: loading state restyled as `.na-le-veil.na-le-veil--boot`; TV headline "Your Drawings Are Loading"; Title Case statuses ("Fetching the Drawing Tools", "Reading the Drawing Settings"); add and export `Na__LeLoadScreen__IsShown()` (true while the loading state is up, not fading and not the error state - the test `Show` makes at `:166`, `:168`; F.8 C22); the VV-only error state unchanged',
    'VVM/51__System__LayoutEditor/01__Core__Loader/Na__LayoutEditor__Styles__Boot__.css':
        'receive the 3D-furniture hiding block verbatim (comment included) and the `--boot` rules: fixed; top `calc(var(--Vale_HeaderHeight) + var(--Vale_LayoutTabStripHeight))`; left, right, bottom 0; z-index 600; opaque `#ffffff`, no backdrop blur; `body.na-layout-editor--active .na-le-veil--boot { top: var(--Vale_LayoutTabStripHeight) }`; add the VV-only `body.na-layout-editor--active .na-vs-tl` to the moved block (S10-V03, F.8 C22)',
    'VVM/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css':
        'delete the furniture block at `:30-50` (it moves to Styles__Boot; TV keeps it in its start-up sheet, so the timing becomes TV\'s)',
    'VV/03__Style__AppStylesheets/Na__UiFeature__Styles__LoadingOverlays__.css':
        'replace VV region "Layout Editor Return-to-Model Veil" (`:269-344`) with TV region "Layout Editor Loading Veils" (TV `:256-339`) verbatim; keep the VV-only Load Error State, `--opaque` and `__status--error` rules',
    'VVM/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js':
        'hunks (VV sequence + `Source version` line): from `Enter`, when not a viewer and not `Na__LeMode__Quiet`, call `Na__LeVeil__FirstOpen(host, { specification, textMetrics, viewportCount, immediate: Na__LeLoadScreen__IsShown() })` at TV\'s call site (TV `:733`; the promises from `:712-713`, `PreloadMetrics` returning its promise comes from W1-32); import `Na__LeVeil__FirstOpen` beside ReturnTo3d and Dismiss3d (TV `:289`) and `Na__LeLoadScreen__IsShown` from `../01__Core__Loader/Na__LayoutEditor__LoadingScreen__.js` (a leaf with no imports); list that read under PORT NOTE Divergences (F.8 C22)',
}

A('````markdown')
A('# Swarm brief - W1-33: %s' % p['title'])
A('')
A('You are a package agent in the ValeVision 3D drawing-system parity swarm. ValeVision (VV,')
A('D:\\10_CoreLib__ValeCodebase\\WebApps\\ValeVision3D) is being aligned exactly with TrueVision (TV,')
A('D:\\11_RefLib__StudioRepository__RemoteSystem\\NaWeb\\na-apps\\30__TrueVision__CoreAppCode), keeping VV\'s own')
A('worker, Flask server and R2 storage. TV is the source of truth. This brief is your whole scope.')
A('')
A('## 1. Rules (non-negotiable; Section F.1 of the parity report)')
for r in T.BRIEF_RULES:
    A('- ' + r.replace('<pin>', 'b2aa9151'))
A('')
A('## 2. Inputs')
A('- Package record: PARITY/data/wp_canonical.json -> packages[wp_id = "W1-33"].')
assert p.get('f8_corrections') == ['C22', 'C35'], p.get('f8_corrections')
A('- F.8 corrections that name W1-33 (its f8_corrections): C22 - the seam that carries "immediate", the .na-vs-tl')
A('  selector and the bare-stage check; C35 - the note naming the front matter\'s Q-COVER; in wp_canonical.json since')
A('  01-Oct-2026, so already in the text below.')
A('- TV pin: b2aa9151. If WT-12 or WT-08 has landed and Adam has committed it, read TLE/05__Core__ModeController/')
A('  Na__LayoutEditor__LoadingVeil__.js at that commit instead (their change there is comment-only).')
A('- Decisions you implement: DR-01 (c) port and name unconfirmed TV releases (the fold and veils are TV v2.83.0,')
A('  20-Sep-2026 - check its Release Watermark row); DR-24 (a) keep VV\'s lazy loader in VLE/01__Core__Loader;')
A('  DR-39 TV wording, TV\'s in-host veil with the fold visible, a veil for the first drawing after a document tab;')
A('  R0.2.11 Q-COVER: part (2) is the C22 seam in section 4; part (1), what the boot cover says on a cold document-tab')
A('  press, is Adam\'s (default: the drawing cover\'s headline with VV\'s two pre-load lines and no drawing job).')
A('- Upstream packages DONE: W1-31 (loader facade 1.2, LoadingScreen), W1-32 (ModeController core: EnterUnder, the')
A('  Quiet flag, PreloadMetrics returning its promise); their Port Records: <paths from the integrator>.')
A('- Already true (checked 01-Oct-2026): the four imports of TV LoadingVeil 1.1.0 (ConfigState GetLabel,')
A('  SnapshotRenderer GetOutstanding, the SceneCarousel and SceneTransition calls, TV :82-85) resolve in VV today')
A('  (VV :79-82); the AppHeader fold rules already equal TV\'s, so AppHeader.css is NOT yours to edit.')
A('')
A('## 3. Files you own')
A('| VV path | Action | Hot? Your turn | SHA-1 at hand-over |')
A('|---|---|---|---|')
for t in p['vv_targets']:
    it = C.parse_item(t)
    A('| %s | %s | %s | <from the integrator> |' % (short(it['path']), ACTIONS.get(it['path'], 'see goal'), turn(it['path'])))
A('')
A('## 4. What to change')
A('- Goal: ' + p['goal'])
A('- TV sources: ' + '; '.join(p['tv_sources']))
A('- VV seams to re-apply (and nothing else):')
for s in p['vv_adaptations']:
    A('  - ' + s)
A('  - plus the standard seams: VALEVISION3D banner, [ValeVision3D LayoutEditor] console prefix, PORT NOTE block.')
A('- Notes: ' + ('; '.join(p['notes']) if p.get('notes') else 'none'))
A('')
A('## 5. Procedure')
A('0. Preflight (G0): git -C "D:\\10_CoreLib__ValeCodebase" status --short -- WebApps/ValeVision3D WebApps/Whitecardopedia ;')
A('   check the seven SHA-1s; stop if a file you own moved since hand-over.')
A('1. Import pre-check for LoadingVeil 1.1.0 (expected to pass, see section 2).')
A('2. Port LoadingVeil whole from git show b2aa9151:na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/')
A('   51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js ; it takes TV\'s 1.1.0 and')
A('   TV\'s DEVELOPMENT LOG (DR-34); VV\'s 1.0.0 history becomes one PORT NOTE line; Parity: adapted; Divergences:')
A('   DrawingSettled export (VV-only), the immediate option (F.8 C22).')
A('3. Apply the hunks to Loader, LoadingScreen, ModeController (each keeps VV\'s own version sequence plus a')
A('   "Source version" line; read each file\'s top log entry at your turn - W1-31/W1-32 will have bumped them) and')
A('   the CSS moves; module log lines end "for ValeVision3D {{VVREL:W1-33}}". Patch with a Python script that keeps')
A('   each file\'s line ending (Loader, Styles__Boot, Styles__Main, ModeController and LoadingOverlays are CRLF today;')
A('   LoadingScreen is LF: 0 CRLF in its 240 lines and git ls-files --eol w/lf on 01-Oct-2026).')
A('4. Gates: G1, G2, G3, G4; G4-UI checks (1) AppHeader fold and (3) LoadingOverlays veil must PASS; G6.')
A('5. Return the Port Record. SHARED SERVICE WORKER: new exports Na__LeVeil__FirstOpen (LoadingVeil) and')
A('   Na__LeLoadScreen__IsShown (LoadingScreen) on existing modules ->')
A('   bump needed: yes (Adam\'s call; do not touch the worker).')
A('')
A('## 6. Acceptance (all must hold)')
for i, a in enumerate(p['acceptance']):
    A('%d. %s' % (i + 1, a))
A('')
A('## 7. Tests')
A('No TV test is ported by W1-33. Gates: %s. Leave the visual checks to Adam\'s W1 smoke list (F.5.4 W1 item 1).' % gates_short(p['harness_gates']))
A('')
A('## 8. Stop and report if')
A('- an import is missing; a seam you need is not in section 4; a file you own changed under you;')
A('- a gate fails twice on your files; DR-39 or Q-COVER (1) has been answered differently from the default above.')
A('````')
A('')

# =============================================================================
# F.7 effort and risks
# =============================================================================
A('### F.7 Effort per wave and the risk register')
A('')
A('#### F.7.1 Effort per wave (generated)')
A('')
A('"Files written" is the union of the packages\' `edits` (VV app, WCP, VCB root, TV, NAAPPS); "new" are targets K3 marks `(new)`; "TV lines read" sums the full TV files named as sources (vendor copies and binary assets excluded), so it overstates hunk work; "hot-file slots" counts package-file pairs on the hot-file register.')
A('')
A('| Wave | Packages | Est. lines | Files written | of which new | VV / WCP / VCB / TV / NAAPPS | TV source files | TV lines read | Hot-file slots | XL packages |')
A('|---|---|---|---|---|---|---|---|---|---|')
tot = collections.Counter()
for w in C.WAVES:
    r = eff[w]
    br = r['by_repo']
    A('| %s | %d | %s%s | %d | %d | %d / %d / %d / %d / %d | %d | %s | %d | %s |' % (
        w, r['packages'], fmt(r['est']), ' (+W5-06)' if r['unest'] else '', r['files'], r['new_all'],
        br.get('VV', 0), br.get('WCP', 0), br.get('VCB', 0), br.get('TV', 0), br.get('NAAPPS', 0),
        r['tv_files'], fmt(r['tv_lines']), r['hot_slots'], ', '.join(r['xl']) or '-'))
    if w != 'WT':
        for k in ('packages', 'est', 'files', 'new_all', 'tv_files', 'tv_lines', 'hot_slots'):
            tot[k] += r[k]
A('| **W0-W6** | %d | %s | %d (sum over waves) | %d | | %d | %s | %d | |' % (
    tot['packages'], fmt(tot['est']), tot['files'], tot['new_all'], tot['tv_files'], fmt(tot['tv_lines']), tot['hot_slots']))
A('')
A('For scale (orchestrator facts): TV `LE/` is 341 files and 150,637 lines against VV\'s 161 files and 62,817; 186 TV-only files (72,656 lines) and 113 drifted shared files make up most of the estimate.')
A('')
A('#### F.7.2 Risk register')
A('')
A('Likelihood and impact: H / M / L. "Owner" is who acts on it; detection gates are in F.5.1.')
A('')
A('| Id | Risk | L | I | Packages | Mitigation and detection | Owner |')
A('|---|---|---|---|---|---|---|')
for rid, risk, li, im, pk, mit, own in T.RISKS:
    A('| %s | %s | %s | %s | %s | %s | %s |' % (rid, cell(risk), li, im, cell(pk), cell(mit), cell(own)))
A('')

# =============================================================================
# F.8 corrections
# =============================================================================
A('### F.8 Corrections to K3 made by this section')
A('')
import k3_verify_outputs as KV  # noqa: E402
_vfails, _vfacts = KV.verify()
assert not _vfails, _vfails
_cpb = C.canon['critical_path']['by_est_lines']
A('K3 still validates with the corrections applied (`k3_verify_outputs.py` on the corrected files: schema, raw ids, topological sort of %d, critical path %s, %d hot files with %d unordered pairs, wave barrier - all PASS on 01-Oct-2026). C1-C9 were found while building this section. C10-C33 carry the package-level corrections raised in Sections A-E and in review, each re-checked against the code on 01-Oct-2026; C33 proposed one new conditional package, W5-07. C34-C36 were added by the report\'s final cross-section harmonisation (H1, 01-Oct-2026): W0-06\'s watermark tally and DIV-3 status in the words of the front matter\'s R0.2.9 note (C34), the front matter\'s open questions named in the packages they gate (C35) and W0-19\'s statement test server answering `/api/health` (C36); `k3_build.py` applied them like the others. On 01-Oct-2026 (H2) every row that changes K3 was applied to `wp_canonical.json` by K3\'s own generator (`k3_build.py` through `k3_f8_corrections.py`, with the ops in `r6_corrections.py`), C20\'s and C33\'s hot-file slots reached `hot_file_ownership.json`, and `K3__WorkPackages.md` was regenerated; `parity/data/wp_corrections_applied.json` records every change (correction -> package -> field -> old -> new) and the files as they were are kept as `*.pre_h2.json`. F.3 and the F.6.1 brief now render the JSON as it stands: the overlay is off, and `r6_corrections.py` raises if a correction is missing from the JSON. The rows below are the audit trail, unchanged except the count of `.1` fixes in C6, which H1 corrected from twelve to thirteen; the last line of each says how it reached the JSON (C5 and C8 change nothing in K3).'
  % (len(C.ORDER), fmt(_cpb['est_lines']), C.hot['counts']['files_with_multiple_editors'], C.hot['counts']['unordered']))
A('')
A('| # | K3 item | Finding | Evidence | Applied here as |')
A('|---|---|---|---|---|')
_c8 = (' Recomputed on the corrected JSON (W5-07 included): 4 package agents reach %s lines and 6 reach the critical path, %s (F.2.3).'
       % (fmt(SIZING[4]), fmt(SIZING[6])))
for cid, item, finding, ev, applied in list(T.CORRECTIONS) + K.rows():
    status = K.json_line(cid, _c8 if cid == 'C8' else '')
    A('| %s | %s | %s | %s | %s<br>%s |' % (cid, cell(item), cell(finding), cell(ev), cell(applied), cell(status)))
A('')

text = '\n'.join(L).rstrip() + '\n'
with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
    f.write(text)
print('wrote', OUT, len(text), 'chars', text.count('\n'), 'lines')
