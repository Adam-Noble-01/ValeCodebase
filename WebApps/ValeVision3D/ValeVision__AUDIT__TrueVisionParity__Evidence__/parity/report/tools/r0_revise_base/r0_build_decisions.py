# r0_build_decisions.py - builds the Decision Register tables for report section R0.
# Read-only on every input. Inputs:
#   parity/data/decision_register.json  (K1 canonical decisions)
#   parity/report/K1__DecisionRegister.md section 1 (K1's short recommended answer / default)
#   parity/data/wp_canonical.json        (K3 packages: gated_by, hard_gate, wave)
# Output: parity/report/tools/r0_decisions.md (pasted into R0 by r0_assemble.py)
import json, os, re, collections

P = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
DATA = os.path.join(P, 'data')
REP = os.path.join(P, 'report')

drs = json.load(open(os.path.join(DATA, 'decision_register.json'), encoding='utf-8'))
DR = {r['dr_id']: r for r in drs}
W = json.load(open(os.path.join(DATA, 'wp_canonical.json'), encoding='utf-8'))
PK = {p['wp_id']: p for p in W['packages']}
TOPO = {wid: i for i, wid in enumerate(W['topological_order'])}

# K1 answer sheet: | DR | Theme | Decision | Recommended answer | Default if unanswered | Urgency |
short = {}
in_sheet = False
for line in open(os.path.join(REP, 'K1__DecisionRegister.md'), encoding='utf-8'):
    if line.startswith('## 1. Answer sheet'):
        in_sheet = True
        continue
    if in_sheet and line.startswith('## '):
        break
    if in_sheet and line.startswith('| DR-'):
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        short[cells[0]] = {'theme': cells[1], 'decision': cells[2], 'rec': cells[3], 'default': cells[4], 'urgency': cells[5]}
assert len(short) == 44, len(short)

# K3 gating per DR
gated = collections.defaultdict(list)
for p in W['packages']:
    for d in p['gated_by']:
        gated[d].append(p['wp_id'])

WAVE_ORDER = ['W0', 'W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'WT']

def wave_counts(ids):
    c = collections.Counter(i.split('-')[0] for i in ids)
    return ', '.join(f'{w} {c[w]}' for w in WAVE_ORDER if c[w])

RECORDS = {'W0-01', 'W0-06'}   # decision record and ledger restructure: they record every DR, they do not consume it

def is_scribe(i):
    return i.endswith('-99') or i == 'W6-04'

def first_vv(ids):
    vv = [i for i in ids if not i.startswith('WT') and i not in RECORDS and not is_scribe(i)]
    if not vv:
        return None
    return min(vv, key=lambda i: TOPO[i])

# raw work-package ids (WP-Sxx-nn) inside K1's short text -> canonical K3 ids
RAWMAP = json.load(open(os.path.join(DATA, 'wp_raw_map.json'), encoding='utf-8'))
def canon(raw):
    m = RAWMAP['map'].get(raw)
    if m and m.get('canonical'):
        return m['canonical']
    a = RAWMAP['retired_aliases'].get(raw)
    if a and a.get('canonical'):
        return '/'.join(a['canonical'])
    return None

def translate(s):
    def rep(mo):
        c = canon(mo.group(0))
        return c if c else mo.group(0)
    return re.sub(r'WP-S\d\d[ab]?-[0-9A-Za-z]+', rep, s)

def hard(ids, dr):
    out = []
    for i in ids:
        hg = PK[i].get('hard_gate')
        if hg and (dr in hg or dr in ','.join(PK[i]['gated_by'][:1]) or True):
            # keep only hard gates that name this DR, or whose package is gated solely through it
            if dr in hg:
                out.append(i)
    return out

# Short human summary of what each DR governs (from K1 blocks.systems, condensed by hand; see K1 section 2).
SYSTEMS = {
 'DR-01': 'every TV-only feature port (47, 48, 49, folder 50 to HEAD, LE 26-33, 37, 51-54, 57-59, 65/66, 54/55)',
 'DR-02': 'the renumber of VV 42-47 to TV 40-46; every port into 40-49',
 'DR-03': 'slot 40 (legacy tool to 91), 2dProfileLines to 05, folder registry, 62 EmailWorkers',
 'DR-04': 'RenderPreset, DistanceCulling and SnapshotHistory names/paths',
 'DR-05': 'every hot file and shared test; hubs atomic and last',
 'DR-06': 'every new R2 write under VaApps/Projects/{folderId}/ subfolders',
 'DR-07': 'every deploy of swarm output; WCP registrar and SW logic',
 'DR-08': 'LE/21 SitePlanData, site-plan painter, panels, hatch packs',
 'DR-09': '26 PhaseLibrary, LE/20 ModelSource, viewport render signatures',
 'DR-10': 'LE/52 StatementWriter, Design Statements tab, 27 renderer',
 'DR-11': 'LE/51 DrawingRegister, Document ID, PDF and publish names',
 'DR-12': 'LE/53 ProjectQrCode, title-block QR cell, Portal block',
 'DR-13': 'LE/54 SheetImages, hub picture hooks, sheet-image routes',
 'DR-14': 'LE/59 FloorAreas, Area Schedule, hub wiring',
 'DR-15': '49 ElevationDepthFog on drawings, sheets and exports',
 'DR-16': 'door module (25), folder 50 DoorPose/Storeys, LE plan doors',
 'DR-17': 'Panel__Layers Ref switch, 1:200 scale',
 'DR-18': 'LE/37 VectorTools and Booleans, drawing-tab keys',
 'DR-19': 'app-root 52 HatchPatternLibrary, Panel__Patterns',
 'DR-20': '55 SpellCheck (Vale dictionary), 54 ColourPalette name',
 'DR-21': 'PdfFonts, Open Sans embedding, font host',
 'DR-22': '52 PublishedDocuments, 53 PublishedSchema, LE/65, LE/80 viewer',
 'DR-23': 'LE/66 DocumentSharing link form',
 'DR-24': 'LE/01__Core__Loader facade and Na__LeLoad__STYLESHEETS',
 'DR-25': 'Layout Mode switch, TabStrip visibility, Loader IsAvailable',
 'DR-26': '41 folder name, TV 48 placeholder, VV gate ids, D28 filing',
 'DR-27': 'VV facade at TV paths (80/ApiClient, LocalProjectMirror, ProjectLoader helpers)',
 'DR-28': 'WCP worker 1.6.0 routes, uploads, manifest bumps, Flask deletes, /api/health',
 'DR-29': 'new content folders under VaApps/Projects/{folderId}/; .gitignore',
 'DR-30': 'save guard, localhost overlay of editor-owned keys, notes route',
 'DR-31': 'folder 50 to TV HEAD, bake gate, LineworkModifiers, BuildToken re-bake',
 'DR-32': 'VV plan/elevation mode controllers, North 1.1.0, VV-only menu features',
 'DR-33': 'hotkey file names, KeyScope, DocumentKeys',
 'DR-34': 'module versions and DEVELOPMENT LOG on whole-file ports',
 'DR-35': 'VV ledger, devlog and plan records',
 'DR-36': 'every TrueVision-side package (WT lane)',
 'DR-37': 'TV defects a verbatim port would copy (CRLF tokeniser, amber, hatch, events)',
 'DR-38': 'TabStrip 2.0.0 and the Drawings menu; sheet reordering',
 'DR-39': 'loader loading screen, LoadingVeil 1.1.0, Styles__Boot',
 'DR-40': 'clipboard, snap colours, toolbar, undo reasons, grid defaults, vector quality, four gestures',
 'DR-41': 'TV 41 Serialize/SceneData (TV-side fix only)',
 'DR-42': 'eleven optional TV back-ports',
 'DR-43': 'NA content: URLs, Hub section, Portal/QR wording, title-block text and scan, scrapbook items',
 'DR-44': 'toast/canvas CSS, confirm dialog, 60/76 full screen, 3D-tab dev panels',
}

def compress_wt(ids):
    wt = [i for i in ids if i.startswith('WT')]
    rest = [i for i in ids if not i.startswith('WT')]
    allwt = sorted(p['wp_id'] for p in W['packages'] if p['wave'] == 'WT')
    if wt and sorted(wt) == allwt:
        return rest + ['WT-01 to WT-12']
    return rest + sorted(wt)

def blocks_cell(dr):
    ids = sorted(gated.get(dr, []), key=lambda i: TOPO.get(i, 9999))
    fv = first_vv(ids)
    hg = hard(ids, dr)
    wt = [i for i in ids if i.startswith('WT')]
    parts = []
    if fv:
        parts.append(f'First needed by **{fv}**')
    elif wt:
        parts.append(f'First needed by **{wt[0]}** (TV lane)')
    elif ids:
        parts.append('Read only by the records packages and scribes')
    if ids:
        parts.append(f'gates {len(ids)} packages ({wave_counts(ids)})')
    if hg:
        parts.append('hard gate: ' + ', '.join(compress_wt(hg)))
    return SYSTEMS[dr][0].upper() + SYSTEMS[dr][1:] + '. ' + '; '.join(parts) + '.'

def esc(s):
    return s.replace('|', '/').replace('\n', ' ')

GROUPS = [
 ('R0.2.2 Process and gates (the port gate first)', ['DR-01', 'DR-05']),
 ('R0.2.3 Structure and naming', ['DR-02', 'DR-03', 'DR-04', 'DR-26', 'DR-33']),
 ('R0.2.4 Transport, storage and shared Vale infrastructure', ['DR-06', 'DR-07', 'DR-27', 'DR-28', 'DR-29', 'DR-30']),
 ('R0.2.5 Feature scope', ['DR-08', 'DR-09', 'DR-10', 'DR-11', 'DR-12', 'DR-13', 'DR-14', 'DR-15', 'DR-16', 'DR-17', 'DR-18', 'DR-19', 'DR-20', 'DR-21', 'DR-22', 'DR-23']),
 ('R0.2.6 Architecture seams', ['DR-24', 'DR-25', 'DR-31', 'DR-32', 'DR-41']),
 ('R0.2.7 User interface and behaviour', ['DR-38', 'DR-39', 'DR-40', 'DR-44']),
 ('R0.2.8 Brand and content', ['DR-43']),
 ('R0.2.9 Ledger and versioning', ['DR-34', 'DR-35']),
 ('R0.2.10 TrueVision-side work', ['DR-36', 'DR-37', 'DR-42']),
]
allg = [d for _, ds in GROUPS for d in ds]
assert sorted(allg) == sorted(DR), set(DR) ^ set(allg)
assert len(allg) == len(set(allg))

# Short notes where K3 refined or a later check corrected K1's text (each states its source).
NOTES = {
 'R0.2.4 Transport, storage and shared Vale infrastructure':
  'K3 ruling (section 11): DR-27\'s optional interim, putting the specification lockstep on R2Notes first, is not used. The lockstep goes straight onto the facade in W2-30, and R2DrawingNotes retires in W2-33 (K2 FR-18).',
 'R0.2.7 User interface and behaviour':
  'DR-40 items 7-10 are held by one-line guard constants that W3-03 lands; W3-04 removes them after Adam says yes (K3 section 11 and the W3-03/W3-04 package text). The fifth acceptance bullet of W0-01 says "W3-04 lands them held (W3-05 switches them on later)"; that wording is wrong, because W3-05 switches on the drafting aids.',
 'R0.2.5 Feature scope':
  'Hard gates: the Statement Writer surface and wiring (W4-12, W4-13) land with `LayoutEditor__Statement__Enabled = false` until Adam answers DR-10. The Vale QR resolver (W5-05) and the site-plan pipeline (W5-06) run only on DR-12 and DR-08 answers that differ from the defaults.',
}

out = []
for title, ds in GROUPS:
    out.append(f'#### {title}\n')
    out.append('| DR | Decision | Recommendation | Default if unanswered | Blocks (scope; K3 packages) | Urgency |')
    out.append('|---|---|---|---|---|---|')
    for d in ds:
        s = short[d]
        out.append(f"| **{d}** | {esc(DR[d]['title'])} | {esc(translate(s['rec']))} | {esc(translate(s['default']))} | {esc(blocks_cell(d))} | {s['urgency']} |")
    out.append('')
    if title in NOTES:
        out.append('Note: ' + NOTES[title])
        out.append('')

while out and out[-1] == '':
    out.pop()
open(os.path.join(REP, 'tools', 'r0_decisions.md'), 'w', encoding='utf-8', newline='\n').write('\n'.join(out))

# Stats for the summary
urg = collections.Counter(s['urgency'] for s in short.values())
print('urgency', dict(urg))
w0 = sorted({d for p in W['packages'] if p['wave'] == 'W0' for d in p['gated_by']}, key=lambda s: int(s[3:]))
print('DRs read by W0 packages:', w0)
for d in ['DR-01','DR-02','DR-03','DR-04','DR-05','DR-06','DR-07']:
    ids = sorted(gated.get(d, []), key=lambda i: TOPO.get(i, 9999))
    print(d, 'first', first_vv(ids), 'hard', hard(ids, d), 'W0 pkgs', [i for i in ids if i.startswith('W0')])
hard_all = {p['wp_id']: p['hard_gate'] for p in W['packages'] if p.get('hard_gate')}
for k, v in hard_all.items():
    print('HARD', k, '|', v[:140])
tot = collections.Counter()
for p in W['packages']:
    tot[p['wave']] += (p['est_lines'] or 0)
print('est lines by wave', dict(tot), 'VV total', sum(v for k, v in tot.items() if k != 'WT'))
print('packages', len(W['packages']), collections.Counter(p['wave'] for p in W['packages']))
