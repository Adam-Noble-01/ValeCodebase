#!/usr/bin/env python3
"""R2 Section B renderer: writes parity/report/R2__B_ModuleNaming_Divergence.md.

Inputs (all read-only):
  parity/data/file_rename_map.json            K2 file rename map (25 rows)
  parity/report/tools/out/r2b_extract.json     r2b_extract.py (both trees, headers + exports)
  parity/report/tools/out/r2b_analysis.json    r2b_analyse.py (pairs, divergences, collisions)
  parity/report/tools/out/r2b_importnames.json r2b_importnames.py (names TV drawing files import)
  parity/report/tools/out/r2b_tvonly.json      r2b_tvonly.py (TV-only files gained per K3)
Every table that enumerates files, names or counts is generated here from those files; the
curated text (rulings, owners, decision ids) is held in the dictionaries below.
"""
import json
import os
import re
from collections import defaultdict, Counter, OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
PARITY = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
DEST = os.path.join(PARITY, 'report', 'R2__B_ModuleNaming_Divergence.md')

FRM = json.load(open(os.path.join(PARITY, 'data', 'file_rename_map.json'), encoding='utf-8'))
X = json.load(open(os.path.join(OUT, 'r2b_extract.json'), encoding='utf-8'))
A = json.load(open(os.path.join(OUT, 'r2b_analysis.json'), encoding='utf-8'))
IMP = json.load(open(os.path.join(OUT, 'r2b_importnames.json'), encoding='utf-8'))
TVO = json.load(open(os.path.join(OUT, 'r2b_tvonly.json'), encoding='utf-8'))
TVR, VVR = X['tv'], X['vv']
M = '02__Src__AppModules/'
LE = M + '51__System__LayoutEditor/'
D40 = tuple('%d__' % n for n in range(40, 56))


def esc(s):
    return str(s).replace('|', '/').replace('\n', ' ')


def short(p):
    """Abbreviate a path for importer lists: LE/<NN>/<file>, <NN>/<file>."""
    p = p.replace('WEBAPPS/', 'WebApps/')
    if p.startswith(LE):
        rest = p[len(LE):].split('/')
        if len(rest) > 1:
            return 'LE/%s/%s' % (rest[0][:2], '/'.join(rest[1:]))
        return 'LE/' + rest[0]
    if p.startswith(M):
        rest = p[len(M):].split('/')
        return '%s/%s' % (rest[0][:2], '/'.join(rest[1:])) if len(rest) > 1 else rest[0]
    return p


def top2(rel):
    return rel[len(M):].split('/')[0] if rel.startswith(M) else ''


def in4055(rel):
    return rel.startswith(M) and top2(rel).startswith(D40)


L = []


def w(s=''):
    L.append(s)


def table(header, rows):
    w('| ' + ' | '.join(header) + ' |')
    w('|' + '---|' * len(header))
    for r in rows:
        w('| ' + ' | '.join(esc(c) for c in r) + ' |')
    w()


# ============================================================================
# Computed facts used in the prose
# ============================================================================
rows = A['rows']
n_pairs = len(rows)
n_pairs_draw = sum(1 for r in rows if r['draw_scope'])
n_pairs_4055 = sum(1 for r in rows if in4055(r['target']))
ext_counts = Counter(r['ext'] for r in rows)
ns_div = [r for r in rows if r['target'] in set(A['ns_div'])]
TOKEN_NS = {'TrueVision3D', 'ValeVision3D'}
ns_token = [r for r in ns_div if r['tv_ns'] in TOKEN_NS and r['vv_ns'] in TOKEN_NS]
ns_missing = [r for r in ns_div if (not r['tv_ns']) != (not r['vv_ns'])]
ns_real = [r for r in ns_div if r not in ns_token and r not in ns_missing]
vv_only_4055 = [(r, n) for r in rows if in4055(r['target']) for n in r['exp_vv_only']]
vv_only_4055_nocomp = [(r, n) for (r, n) in vv_only_4055 if 'ComposerPreset' not in n]
files_vv_only_4055 = sorted({r['target'] for (r, n) in vv_only_4055_nocomp})
vv_only_support = [(r, n) for r in rows if r['draw_scope'] and not in4055(r['target']) for n in r['exp_vv_only']]
miss_support = [r for r in IMP if not r['draw'] and r['vv_has_module'] and r['missing_in_vv']]
miss_support_names = sum(len(r['missing_in_vv']) for r in miss_support)
miss_4055 = [r for r in IMP if r['draw'] and r['vv_has_module'] and r['missing_in_vv']]
miss_4055_names = sum(len(r['missing_in_vv']) for r in miss_4055)
collisions = A['collisions']
tvo_rows = TVO['rows']
gained = [r for r in tvo_rows if r['gained']]

assert len(ns_div) == len(ns_token) + len(ns_missing) + len(ns_real), 'namespace classes do not add up'

# ============================================================================
# Curated data
# ============================================================================
FR_K3 = {**{'FR-%02d' % i: 'W0-02' for i in range(1, 12)},
         'FR-12': 'W0-03 (name); W0-15 (TV content, KeyMap 1.11.0)', 'FR-13': 'W0-03',
         'FR-14': 'W2-19', 'FR-15': 'W3-08', 'FR-16': 'W0-12', 'FR-17': 'W0-12', 'FR-18': 'W2-33',
         'FR-19': 'W0-16', 'FR-20': 'W0-16', 'FR-21': 'W6-03', 'FR-22': 'W6-03 (only on request)',
         'FR-23': 'W6-03', 'FR-24': 'W5-04 (only on request)', 'FR-25': 'W6-03'}
FR_WHY = {
    'FR-08': 'VV-only DIV-1 profile pass leaves the legacy folder; a file follows its base name, so it sits beside every other Na__RenderEffect__* file (K2 N5).',
    'FR-09': 'Same eight exports; TV built RenderPreset from VV ComposerPreset 1.2.0 "interface only" (TV 40/Na__DrawView__RenderPreset__.js:24-25, :31-32). Composer body and private NAMESPACE Na__DrawPreset stay (K2 H3); RenderFrame gains an optional camera (S02a-F14).',
    'FR-10': 'VV added a trailing __ on port; TV is the naming lead and keeps legacy suffix-less names (ConfirmDialog.js, ProjectLoader.js in both apps).',
    'FR-11': 'Same module one level deeper in VV; TV 40 Transitions and 42/45 ModeControllers import it from 05/. Its own import changes depth (TV :57 already has the new form).',
    'FR-12': 'TV v2.115.0 renamed the file (TV DEVLOG:5043); internal LayoutEditor__KeyMappings__* keys were kept, so only the file name moves now.',
    'FR-13': 'Same per-entry schema, app tokens only (TV 10/Na__Hotkeys__Manager.js:17-21); VV keeps root key Na__ValeVision__HotkeysDictionary, ValeVision__* actions and its handler.',
    'FR-14': 'Step 1 of 2: re-export shim that imports only 28 __Search__ and __State__ and declares the three TONE strings locally (TV did the same, 28/Na__LayoutEditor__ObjectSnap__.js:60-63); never import the controller (cycle).',
    'FR-15': 'Step 2 of 2: delete when no importer is left; grep gate Na__LayoutEditor__Snapping__ / Na__LeOsnap__TONE_.',
    'FR-16': 'New VV-bodied facade at TV\'s path: NAMESPACE Na__CfApi, TV\'s 33 export names and signatures, bodies over whitecardopedia-editor-api + WCP Flask + VaApps/Projects/ (DIV-4).',
    'FR-17': 'New VV-bodied local-mirror shim at TV\'s path: Na__LocalMirror, 8 exports, over WCP/server.py routes.',
    'FR-18': 'VV-only per-document notes client; its role moves into the facade (ReadProjectFile / WriteProjectFile) and LocalMirror WriteSiblingFile.',
    'FR-19': 'Identical jsPDF 4.1.0 build at TV\'s vendor path (TV moved its copy in v2.155.0). Copy now; the 35 original goes with FR-21.',
    'FR-20': 'TV\'s asset path and file name, VALE\'s own scan (md5 59777a65), never TV\'s NA scan. Copy now.',
    'FR-24': 'Optional: TV split the Scene Inspector region out of DropdownAndToast; DR-44 recommends not doing it for drawing parity.',
}
FOLDER_ROWS = ['FR-01', 'FR-02', 'FR-03', 'FR-04', 'FR-05', 'FR-06', 'FR-07', 'FR-21', 'FR-22', 'FR-23', 'FR-25']

# ============================================================================
# Section text
# ============================================================================
w('## Section B - Module Naming Divergence (Recommended Alignments)')
w()
w('Scope: module file names, the header identity lines (banner, `FILE`, `NAMESPACE`, `MODULE`), exported names and the '
  'identifier families that travel inside module code. Folder numbers are Section A, wiring (imports, events, transport routes) '
  'Section C, DOM ids and CSS Section D, the full module inventory Section E and the swarm order Section F. Every VV path given as a '
  'recommendation is a K2 target path (after the W0-02 renumber), relative to the app root. Work is cited by canonical K3 package '
  '(`W0-02` ...), decisions by K1 register id (`DR-02` ...) with the raw slice decision ids beside them where K2 lists them. '
  'Evidence: K2 rulebook and maps, the 28 `module_naming` findings (S01, S02a, S02b, S03a, S03b, S05a, S06a, S06b, S07a, S07b, S09, '
  'S11, S12) and an independent extraction run for this section over both live trees (TV HEAD b2aa9151, VV HEAD 7b4e593a, both '
  'clean on 01-Oct-2026; tools in B.6).')
w()

# ---------------------------------------------------------------- B.0
w('### B.0 Conclusions')
w()
w(f'1. **Module names are already nearly identical; the divergence is concentrated in a few files.** After the K2 renumber, {n_pairs} '
  f'VV/TV source files (.js/.css/.json under `02__Src__AppModules` and `03__Style__AppStylesheets`: {ext_counts[".js"]} JS, '
  f'{ext_counts[".css"]} CSS, {ext_counts[".json"]} JSON) pair by identical relative path; {n_pairs_draw} of them are the drawing system or its '
  f'import surface and {n_pairs_4055} sit in folders 40-55. Every TV `FILE` line equals its file name, and so does every VV one except a VV-only worker entry '
  '(`62__Feature__EmailWorkers/CloudflareWorker/src/index.js`); between twins the `FILE` lines differ only where K2 renames the file '
  '(FR-09, FR-10) or where one side has no header block (4 legacy files, B.3.1).')
w('2. **Six path changes align every shared module name**, all scripted in W0-02 (FR-08 2dProfileLines to 05, FR-09 ComposerPreset to '
  'RenderPreset, FR-10 SnapshotHistory, FR-11 DistanceCulling) and W0-03 (FR-12, FR-13 hotkey files). Two VV-bodied files are created '
  'at TV\'s paths (FR-16, FR-17 in W0-12), one VV module is shimmed then retired (FR-14 W2-19, FR-15 W3-08), one retired (FR-18 W2-33), '
  'two vendor/asset files copied (FR-19, FR-20 in W0-16). The other 11 K2 rows are folder moves and retirements (Section A).')
w(f'3. **NAMESPACE lines differ in {len(ns_div)} twins, and only one is wrong.** {len(ns_token)} only carry the app name as the namespace '
  f'value (`TrueVision3D` / `ValeVision3D`: swap, no action); {len(ns_missing)} have no `NAMESPACE` line on one side (legacy headers); 2 are deliberate VV-bodied '
  'twins (`Na__DrawPreset` in RenderPreset, `Na__DrawSection` in SectionAdapter - K2 H3); 1 is a real VV error: '
  '`05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js` says `Na__RenderEffect` while its seven exports are '
  '`Na__SectionClipping__*` (VV :6, :146-153). W0-03 owns that fix since R6 F.8 C12 (B.3.1).')
w('4. **Exported names: three true renames, three placement divergences.** Renames: the 8 `Na__DrawView__ComposerPreset__*` names '
  '(W0-02), `Na__LeTools__SnapShapeTranslation` which TV renamed `Na__LeOsnap__ShapeTranslation` in `LE/28 ObjectSnap__Moves__` '
  '(lands with W2-19 + W3-03), and two dead `Na__StaticExport__*` wrappers where TV re-exports `Na__TilePlan__*` (W2-03). Placement: '
  'the snap API moving from `Snapping__` to the 28 ObjectSnap family (FR-14/FR-15), 13 `Na__PlanDim__*` config getters that TV exports '
  'from `44 Data__` and VV from `44 ConfigState__` (DR-42 item 7; a seam in every ported importer), and `Na__LeModel__AnnounceRestore` '
  '(W1-21).')
w(f'5. **VV-only export names in shared drawing files: {len(vv_only_4055_nocomp)} in {len(files_vv_only_4055)} files** (S01-F41\'s 18-in-12 '
  'recounted exactly), plus the 8 ComposerPreset names W0-02 renames. 13 are kept as declared seams (Layout Mode, D33 styles, D28 filing, '
  'the loader facade), 4 retire (three with whole-file ports in W1-21 and W3-03, and the `Na__ElevData__SetSeededFrom` setter, which '
  'DR-32 leaves without a writer), 1 needed a ruling (`Na__ElevData__SetAzimuthDeg`: retire it with W2-05, the planner\'s ruling R0.2.11 Q-AZIMUTH, applied by R6 F.8 C20). The 3D support modules the drawing system imports '
  f'carry {len(vv_only_support)} more VV-only names, all kept.')
w(f'6. **TV names VV must add to modules it keeps with VV bodies: {miss_support_names} names in {len(miss_support)} modules** (ProjectLoader 2 in '
  'W0-11; Invalidation 1 and ModelToggle 3 in W1-01; door module 6 in W1-02), plus the SectionAdapter\'s four new calls (six names, '
  'W2-02; proposed in B.3.5, fixed by R6 F.8 C25) and the two facades (W0-12). Inside 40-55, TV drawing files import '
  f'{miss_4055_names} names that VV\'s twins lack across {len(miss_4055)} modules: 4 resolve with the FR-09 rename, 11 are the PlanDimensions '
  f'getters (placement seam above), and the other {miss_4055_names - 15} arrive with the package K3 already assigns to each module.')
w('7. **App tokens inside names.** One TV module VV takes carries TV\'s token in its file name '
  '(`LE/52 .../Na__LayoutEditor__Statement__Standard__TrueVisionHub__.js`): keep the name (F1), exclude it by config (DR-43, W4-12) '
  'and the W0-04 naming lint carries a named exception for it (R6 F.8 C13). VV\'s own token stays in two VV-only names (the 3D hotkey handler and its '
  'JSON root key, DR-33).')
w(f'8. **VV-only modules that stay** are the deliberate divergences: DIV-1 render engine and profile pass (05, 30, 70), DIV-2 '
  '`41__System__CrossSectionView` (7 files), DIV-4 `R2SaveProjectJson__`, the lazy loader `LE/01__Core__Loader` and its `DrawingCode__` '
  'leaf, `ThumbnailBake__`, the 3D hotkey handler and the folder-21 Presentation Mode splits. **VV gains '
  f'{len(gained)} TV-only code files** (counts by system in B.4.2; full list in Section E).')
w('9. **Gaps this section found in K1-K3** (each also in Open issues): the SectionClipping__State header has no owner; W0-14 should take '
  'TV\'s `MODULE` line for R2AssetUpload (K2 H3); no package creates `41__System__CrossSectionView/README__CrossSectionView__.md` '
  '(K2 N6, DR-26); W0-04\'s lint needs the TrueVisionHub exception; W1-10 must re-apply `Na__ElevData__STYLE_KEYS` (DR-32); W6-03 '
  'says the retired 91 folder holds 4 files but it holds 7 after FR-08 (verified on disk). Section F\'s F.8 has since closed '
  'each of them in `wp_canonical.json` (C12, C18, C14, C13, C20, C31; B.5).')
w()

# ---------------------------------------------------------------- B.1
w('### B.1 The naming rulebook (condensed from K2)')
w()
w('**The one-sentence rule (K2):** code identity - folders, file names, namespaces, exports, events, CSS names, data keys - is '
  'TrueVision\'s; app identity - the app token in banners, console prefixes, category keys, project files, storage keys that embed the '
  'app name, routes, hosts and brand values - stays ValeVision\'s. TV is the lead: never rename a TV name to fit VV and never "fix" one side '
  'only. The full contract, with filled header examples, is `parity/report/K2__NamingRulebook.md`.')
w()
table(['Family', 'MUST MATCH TV', 'MUST STAY VV', 'Example (VV, K2 target)', 'K2 rule'], [
    ['Folders', 'TV\'s `NN__Category__Name` for every shared system, top level and LE sub-folders', 'VV-only numbers, registered; legacy goes to 91-99', '`02__Src__AppModules/40__System__DrawingViewCore/` (was 42)', 'N1-N9, Section A'],
    ['Module file names', 'Character for character, including legacy names without the trailing `__`', 'Names of VV-only modules', '`02__Src__AppModules/03__AppUtils/Na__AppUtils__SnapshotHistory.js` (FR-10)', 'F1'],
    ['Placement', 'A file follows its base name; split units and `__Config__.json` sit with their base', '`LE/01__Core__Loader` is VV-reserved', '`02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__2dProfileLines__.js` (FR-08)', 'N4, N5'],
    ['Config, style, README, test names', '`Na__<System>__AppConfig__.json`, `Na__<Prefix>__<Feature>__Config__.json`, `Na__<System>__Styles__<Role>__.css`, `README__<Topic>__.md`, `Na__Test__<Feature>__.test.mjs`, `Na__Verify__<X>__.mjs`', 'VV-only legacy `__Config.json`, `__Stylesheet__.css` and `Na__GridLineSysem__*` keep their names (hard-coded paths, S01-F63)', '`02__Src__AppModules/51__System__LayoutEditor/32__System__OrthoMode/Na__LayoutEditor__OrthoMode__Config__.json`', 'F3, F5-F7'],
    ['Hotkey files', 'TV\'s three file names', 'Root key `Na__ValeVision__HotkeysDictionary`, `ValeVision__*` actions, VV\'s handler', '`02__Src__AppModules/02__AppData/Na__Hotkeys__3dModelTab__.json` (FR-13)', 'F4, DR-33'],
    ['Root documents and project files', 'TV\'s numbered content folder names (`10__StatementDocs/`)', '`ValeVision__<KIND>__<Topic>__.md`, `ValeVision__DrawingNotes__.json`, lowercase `index.html`', '`ValeVision__NOTES__FolderNumberRegistry__.md`', 'F8, F9'],
    ['Header lines', 'Banner text after the token; `FILE`, `NAMESPACE`, `MODULE`, `AUTHOR`, `PURPOSE`, `CREATED`; DESCRIPTION and INTEGRATION; on a whole-file port TV\'s module version and DEVELOPMENT LOG', 'Token `VALEVISION3D - `; the PORT NOTE block (VV format: Ported from, Source version, Ported on, Parity, Divergences, Back-port)', 'K2 section 3 filled examples', 'H1-H7, DR-34'],
    ['VV-bodied twins (DIV-1, DIV-2, DIV-4)', '`FILE`, `MODULE`, banner and every exported name', 'Private `NAMESPACE` (`Na__DrawPreset`, `Na__DrawSection`), listed under Divergences', '`02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js`', 'H3'],
    ['Namespaces and exports', '`Na__<Ns>__<VerbNoun>`, constants `Na__<Ns>__SCREAMING_SNAKE`; TV\'s name for a shared mechanism even over a VV body; names missing from shared VV modules added at TV\'s paths first', 'VV-only exports: additive, listed under PORT NOTE Divergences, re-added after every whole-file port', '`Na__RenderLoop__IsPaused` beside VV\'s pause events (W1-01)', 'X1-X4'],
    ['Console prefixes', 'TV\'s system word', '`[ValeVision3D <System>]`', '`[ValeVision3D LayoutEditor]`', 'C1'],
    ['CSS properties, classes, DOM ids', 'Names (TV itself uses `--Vale_*`); classes `na-le-*`; ids', 'Values for brand; a colliding VV-only id is renamed by VV', '`naCrossSectionToolDev*` (DR-26)', 'S1-S5, Section D'],
    ['Window events', 'TV\'s names and `_EVENT` constants (43 shared)', 'VV-only events (21); never copy TV\'s broken variants', '`Na__LeModel__CHANGED_EVENT`', 'E1-E3, Section C'],
    ['Browser storage', 'TV\'s keys', 'Keys that embed the app name swap the token', '`Na__ValeVision__StatementDraft__<id>`', 'B1-B3'],
    ['Data keys', 'Blocks and record keys (`LayoutEditor__DrawingsData`)', 'Model category prefix `ValeVision__`; `CrossSection__SceneData`; no `window.TrueVision__*` reads', '`ValeVision__Vegetation`', 'K1-K4'],
    ['Transport', 'Client paths and export names (`Na__CfApi__*`, `Na__LocalMirror__*`)', 'Bodies, worker routes, `/api/valevision/*`, `X-ValeVision-*`, `VaApps/Projects/`', '`02__Src__AppModules/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` (FR-16)', 'R1-R6, Section C'],
    ['Config values', 'Keys', 'Brand values; NA-only markers never ship', '`LayoutEditor__Pdf__FontCdnBase` with a Vale value', 'V1, V2'],
])
w('**Gates every package passes on names (K2 section 12, K3 G1-G4):** `Na__Verify__ModuleGraph__.mjs` and `Na__Verify__Exports__.mjs` '
  '(G1, G2), `parity/report/tools/k2_path_gate.py` (G3), and from W0-04 on `Na__Verify__ParityNaming__.mjs` + `Na__Verify__PortNotes__.mjs` '
  '(G4: `VALEVISION3D` banners, `FILE` lines, no `[TrueVision3D`, no `TrueVision__` literal, no `window.TrueVision__`, no NA-only marker '
  'outside the exempt parts: the whole PORT NOTE block of a file, history documents (devlog, ledger, `__PLAN__`, `__NOTES__`, '
  '`Research__` and `TASK__` files) and the named TrueVisionHub statement file; a hit on W0-04\'s baseline allow-list prints WARN '
  'instead of failing - K3 G4, R6 F.8 C13). History documents (devlog, ledger, plans) are never rewritten (K2 section 13).')
w()

# ---------------------------------------------------------------- B.2
w('### B.2 Complete file-level rename map (K2 `file_rename_map.json`, 25 rows)')
w()
w('Rendered from `parity/data/file_rename_map.json`. VV paths are as they are today (HEAD 7b4e593a); the target column is the K2 target. '
  'Importer abbreviations: `LE/NN/` = `02__Src__AppModules/51__System__LayoutEditor/NN__*/`, `NN/` = `02__Src__AppModules/NN__*/`; '
  '"comments" lines are text references the same change rewrites. K2 used its own phase labels; the K3 column gives the canonical package '
  '(K3 crosswalk: K2 "W1" = W0-02, "W1b" = W0-03). FR-01..FR-11 are executed only by `k2_renumber_apply.py --mode git` in W0-02 - no '
  'agent hand-edits those paths.')
w()
w('#### B.2.1 File and region rows')
w()
frows = []
for r in FRM:
    if r['id'] in FOLDER_ROWS:
        continue
    imps = r['importers']
    if r['id'] in ('FR-16', 'FR-17'):
        n_tv = len([i for i in imps if not i.startswith('(TV importers')])
        imp_txt = f'{n_tv} TV files that port with unchanged specifiers (list in the JSON)'
    else:
        imp_txt = '; '.join(short(i) for i in imps)
    selfi = '; '.join(r['self_imports_to_fix']) if r['self_imports_to_fix'] else '-'
    cur = r['current_vv'] or '(new file)'
    tgt = r['target_vv'] or '(deleted)'
    twin = r['tv_twin'] or '-'
    frows.append([r['id'], r['kind'], cur, tgt, twin, FR_WHY.get(r['id'], r['reason']), imp_txt, selfi,
                  r['risk'].replace('folders W1 renumbers', 'folders W0-02 renumbers'),
                  FR_K3[r['id']], ', '.join(r['dr_refs']) or '-', ', '.join(r['decision_refs']) or '-'])
table(['FR', 'Kind', 'VV now', 'VV target (K2)', 'TV twin', 'Why', 'Importers to update', 'Own imports to fix', 'Risk', 'K3', 'K1 DR', 'Raw decisions'], frows)

w('#### B.2.2 Folder and retirement rows (detail in Section A)')
w()
frows = []
for r in FRM:
    if r['id'] not in FOLDER_ROWS:
        continue
    n_imp = len(r['importers'])
    risk = r['risk']
    if risk.startswith('See TF row'):
        risk = 'Mechanical; scripted in W0-02 (Section A)'
    frows.append([r['id'], r['kind'], r['current_vv'], r['target_vv'] or '(retired)', r['tv_twin'] or '-',
                  f'{n_imp} files', risk, FR_K3[r['id']], ', '.join(r['dr_refs']) or '-', ', '.join(r['decision_refs']) or '-'])
table(['FR', 'Kind', 'VV now', 'VV target (K2)', 'TV twin', 'Importers', 'Risk', 'K3', 'K1 DR', 'Raw decisions'], frows)

w('#### B.2.3 Execution notes that change how an agent runs a row')
w()
w('- **FR-09** keeps VV\'s composer body; the script rewrites `FILE`, banner and `MODULE` (preview `parity/k2work/renumber_W1_preview.diff:130-137`) '
  'but the PORT NOTE is hand-written (K2 rulebook section 3 filled example) and `RenderFrame` gains its optional camera argument in the '
  'same change - the one non-mechanical edit W0-02 allows. The four names TV\'s LE SnapshotRenderer imports (Enter, Exit, '
  'GetExportOverrides, RenderFrame) then resolve.')
w('- **FR-10** - the script also rewrites the file\'s own `FILE` line (preview diff :59-60) and deletes the two PORT NOTE bullets that '
  'become false (PlanAnnotations / PlanDimensions History :38).')
w('- **FR-11** - after the move, give the banner TV\'s text (`DISTANCE CULLING`, TV :2; VV says `DISTANCE CULLING (MAXENGINE ONLY)`, VV :2) '
  'and keep the MaxEngine-only note in the PORT NOTE (K2 H1). Not in the K2 script: a one-line hand edit inside W0-02.')
w('- **FR-12** renames the file only; TV\'s key content lands with `ConfigState__KeyMap__` 1.11.0 in W0-15, never on VV\'s 1.0.0 matcher '
  '(T would reach Trim, S03a-F08, S09-F06). **FR-13** must repoint both fetches (HotkeyHandler :116 and NavigationHelpPanel :84) or the '
  'help panel empties (S03a-F30).')
w('- **FR-14 -> FR-15:** the shim lands with the ObjectSnap switch-over (W2-19) and is deleted by W3-08 after the hub and drawing-tool ports '
  '(W3-03) have repointed the 10 importing files (S01\'s "11" counted a comment at `LE/30/Na__LayoutEditor__SheetTools__.js:336`).')
w('- **FR-16 / FR-17** must exist before the first TV module that imports them: 16 TV drawing-system files import 21 of the 33 '
  '`Na__CfApi__*` names (27 TV files in all) and 6 import all 8 `Na__LocalMirror__*` names (S01-F13, recounted - B.3.5).')
w('- **FR-18** is conditional on DR-27: if the facade keeps `R2DrawingNotes__` as a per-document client (D-S09-V01 c) the file stays; it '
  'is then the one VV-only file whose `NAMESPACE` line must be corrected to `Na__R2Notes` (its exports; S06b-F49, K2 H2).')
w('- **FR-19 / FR-20 copy, never move**; the 35 originals go with FR-21. **FR-25** retires 7 files (6 JS + 1 JSON after FR-08 moves '
  '2dProfileLines out; verified on disk), not the 4 W6-03\'s estimate note says.')
w()

# ---------------------------------------------------------------- B.3
w('### B.3 Namespace and export divergences between twins, and how to resolve each')
w()
w(f'Twins = a VV file and a TV file at the same K2 target path ({n_pairs} pairs). Inside folders 40-55, paired at today\'s file names, the '
  'slices and this extraction agree: one `NAMESPACE` divergence (SectionAdapter), no `FILE`-line divergence, 18 VV-only names in 12 files '
  '(S01-F41). Pairing at K2 targets adds RenderPreset (FR-09), whose private `NAMESPACE` is deliberate (H3). The extraction extends the '
  'check to the whole tree and to the support modules TV drawing files import.')
w()
w('#### B.3.1 Header identity lines (`NAMESPACE`, `FILE`, `MODULE`, banner)')
w()
HDR = [
    ['`40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js`', 'NAMESPACE :6', '`Na__DrawView__RenderPreset`', '`Na__DrawPreset` (after FR-09)', 'VV composer body (DIV-1)', 'Keep; list under PORT NOTE Divergences', 'W0-02', 'H3, DR-04'],
    ['same file', 'FILE :5, MODULE :7, banner :2', '`...RenderPreset__.js`, "Render Preset"', '`...ComposerPreset__.js`, "Composer Preset"', 'Pre-rename', 'Rewritten by the script (T6)', 'W0-02', 'FR-09'],
    ['`40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js`', 'NAMESPACE :6', '`Na__DrawView__SectionAdapter`', '`Na__DrawSection` (52 private identifiers use it)', 'VV body drives the live 41 tool (DIV-2)', 'Keep; the 13 exports are identical (TV :253-267, VV :480-494)', 'W2-02', 'H3, DR-26'],
    ['`03__AppUtils/Na__AppUtils__SnapshotHistory.js`', 'FILE :5', '`Na__AppUtils__SnapshotHistory.js`', '`Na__AppUtils__SnapshotHistory__.js`', 'VV rename on port', 'Rewritten by the script (T5)', 'W0-02', 'FR-10'],
    ['`05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js`', 'NAMESPACE :6, MODULE :7', '`Na__SectionClipping`; "Render Pipeline - Section Clipping State"', '`Na__RenderEffect`; "Section Clipping State"', 'VV authored the file (14-Jul-2026); TV ported it on 31-Aug-2026 "unchanged apart from the header" (TV DEVELOPMENT LOG) with its own NAMESPACE and MODULE lines', 'Set `NAMESPACE : Na__SectionClipping` (the 7 exports, VV :146-153) and TV\'s `MODULE`; keep VV\'s DESCRIPTION / INTEGRATION (dual engine, 41 CrossSectionView) as declared divergences. Body identical (git diff -w: header only)', 'W0-03 (R6 F.8 C12)', 'H2'],
    ['`03__AppUtils/Na__AppUtils__R2AssetUpload__.js`', 'MODULE :7', '"App Utils - R2 Asset Upload"', '"R2AssetUpload"', 'VV header style', 'Take TV\'s `MODULE` line when W0-14 adopts TV\'s upload contract', 'W0-14', 'H3'],
    ['`44__System__PlanDimensions/Na__PlanDimensions__Data__.js`', 'banner :2, MODULE :7', '"DATA MODEL AND CONFIG"', '"DATA MODEL"', 'VV moved the config getters into `ConfigState__` (B.3.3)', 'Keep VV\'s text (true for VV) until TV adopts the split; PORT NOTE Divergences', 'WT-01 (TV lane)', 'DR-42 item 7'],
    ['`51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js`', 'MODULE :7', '"(into the drawings, and back to the model)"', '"(the wait for a drawing, and the way back to the model)"', 'VV 1.0.0 vs TV 1.1.0', 'Whole-file take brings TV\'s line; VV\'s `DrawingSettled` export is re-applied', 'W1-33', 'H2, DR-39'],
    ['`51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__ProjectRecord__.js`', 'MODULE :7', '"(the admin system\'s own facts)"', '"(the project\'s own facts)"', 'VV has no admin system; it reads the project root', 'Keep VV\'s wording (it describes VV\'s body); PORT NOTE Divergences', 'W1-12', 'DR-35 (TV v2.88.0 kept permanent)'],
    ['`05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js`', 'banner :2', '"DISTANCE CULLING"', '"DISTANCE CULLING (MAXENGINE ONLY)"', 'VV dual-engine qualifier', 'TV\'s banner; qualifier into the PORT NOTE (B.2.3)', 'W0-02 (hand edit)', 'H1'],
    ['`05__RenderPipeline/Na__RenderLoop__Invalidation.js`', 'FILE / NAMESPACE / MODULE', '(none: TV has a banner only)', 'full header', 'TV legacy header', 'Keep VV\'s header; nothing to match', 'W1-01', 'H2'],
    ['`30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js`', 'banner :2, MODULE :7', '"STATIC EXPORT TILED RENDERER"', '"STATIC TILED EXPORT RENDERER"', 'Wording', 'Take TV\'s text when W2-03 edits the file', 'W2-03', 'H1, H2'],
    ['`21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js`', 'banner :2, MODULE :7', '"PROJECT DATA SCENE DATA"', '"PROJECT JSON SCENE DATA"', 'TV reworded', 'Align on next touch (3D side; no drawing package edits it)', '-', 'H1, H2'],
    ['`30__System__ImageExport/Na__ImageExport__AsyncYield__.js`', 'whole header', 'present (NAMESPACE `Na__ExportYield`)', 'missing (84 vs 113 lines)', 'VV copy predates TV\'s header', 'Out of drawing scope (no TV drawing importer); add on next touch', '-', 'H2'],
    ['`10__NavigationAndCameras/` DefaultNavmode Ipad/Mouse controls, OrbitMode SystemLogic', 'header block', 'missing (OrbitMode keeps only `FILE` and `PURPOSE`, TV :5-6)', 'present', 'TV legacy headers', 'Keep VV\'s; out of scope', '-', '-'],
    [f'{len(ns_token)} twins (05 ProfileLines effect, 10 Fly/Walk x6, 25 x3, 26 ViewBuildingStoreys, 70 PurgeAppCache, 5 stylesheets)', 'NAMESPACE', '`TrueVision3D`', '`ValeVision3D`', 'App name used as the namespace value', 'None - token swap is correct (H1)', '-', 'H1'],
]
table(['Twin (K2 target, under `02__Src__AppModules/` unless noted)', 'Line', 'TV', 'VV', 'Cause', 'Resolution', 'K3', 'Rule / DR'], HDR)
w('Identity leaks in VV source today (the G4 baseline, verified by grep): banner `TRUEVISION3D - PLAN DIMENSIONS - STYLES` at '
  '`44__System__PlanDimensions/Na__PlanDimensions__Styles__.css:8` and console prefix `[TrueVision3D LayoutEditor]` at '
  '`51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js:431` (both W0-03); '
  '`window.TrueVision__Pwa__ProjectContext` read at `SpecPdf__.js:147` (W0-12, replaced by `Na__CfApi__GetProjectDisplayName`). '
  '`LE/07/Na__LayoutEditor__AutoSave__.js:48` names TV\'s global inside its PORT NOTE block, which G4 exempts (R6 F.8 C13).')
w()

w('#### B.3.2 Same function, different exported name (true renames)')
w()
table(['Module (K2 target)', 'VV name today', 'TV name', 'Importers', 'Resolution', 'K3'], [
    ['`02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js`', '`Na__DrawView__ComposerPreset__{ApplyStyles, Enter, Exit, GetCamera, GetExportOverrides, Initialize, IsActive, RenderFrame}`', '`Na__DrawView__RenderPreset__{same eight}`', '6 VV files + the file itself, 52 code refs (FR-09)', 'Scripted rename (T6)', 'W0-02'],
    ['VV `51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__HitResolution__.js` -> TV `51__System__LayoutEditor/28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Moves__.js`', '`Na__LeTools__SnapShapeTranslation` (used by VV PointerDrag)', '`Na__LeOsnap__ShapeTranslation` (TV also adds `Na__LeOsnap__GroupTranslation`)', 'VV PointerDrag', 'Arrives with the Moves unit (W2-19) and the whole-file takes of HitResolution 1.11.0 and PointerDrag 1.19.0 (W3-03); no shim (W3-01 records it as the only VV export TV drops)', 'W2-19, W3-03'],
    ['`02__Src__AppModules/30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js`', '`Na__StaticExport__ClampToDeviceLimits`, `Na__StaticExport__IsIosDevice` (wrappers, VV :173, :184; no VV importer)', 're-exports `Na__TilePlan__ClampToDeviceLimits`, `Na__TilePlan__IsIosDevice` (TV :541-542)', 'none (TV drawing files import only `Na__StaticExport__RenderToCanvas`)', 'Replace the wrappers by TV\'s re-export (X1)', 'W2-03 (first VV editor)'],
])
w('Checked and **not** renames: `Na__PresentationMode__UI__SCENE_ACTIVE_EVENT` (TV :148, `na-presentation-mode-scene-activated`) and VV\'s '
  '`SCENE_SELECTED_EVENT` (VV :212, `na-pm-scene-selected`) are different events; Fly/Walk `SetFovOverride` (TV) and `SyncFromCamera` (VV) '
  'are different functions. Neither is imported by a TV drawing file.')
w()

w('#### B.3.3 Same names, different module (placement divergences)')
w()
table(['Names', 'TV module', 'VV module', 'Who is affected', 'Resolution', 'K3 / DR'], [
    ['11 of VV\'s 14 `Na__LeOsnap__*` (CHANGED_EVENT, Clear, Find, HideMarker, IsEnabled, KIND_END, KIND_MID, SetEnabled, ShowMarker, Snap, Toggle); the 3 `TONE_*` have no TV home', '`LE/28__System__ObjectSnap/` (`ObjectSnap__`, `__Search__`, `__State__`, `__Marker__`)', '`LE/30__System__SheetTools/Na__LayoutEditor__Snapping__.js`', '10 VV importing files', 'FR-14 shim, FR-15 delete', 'W2-19, W3-08; DR-05'],
    ['13 `Na__PlanDim__*` config getters (GetAxisLockSetup, GetClientModeSetup, GetCrosshairSetup, GetDisclaimerSetup, GetEditingSetup, GetGridSetup, GetInteractionSetup, GetLabel, GetLayerSetup, GetLineSetup, GetTextSetup, IsEnabled, Load)', '`44__System__PlanDimensions/Na__PlanDimensions__Data__.js` (TV\'s `ConfigState__` duplicates them but only MarkupBridge :259 loads it)', '`44__System__PlanDimensions/Na__PlanDimensions__ConfigState__.js` (VV `Data__` re-imports them, :83)', 'TV drawing files import 11 of them from `Data__`: 9 files inside 44, FloorPlan DevMenu Editor, MarkupMount, PlanAnnotations Toolbar, both mode controllers', 'Seam in every ported TV importer: import from `ConfigState__` (VV files say so in their PORT NOTEs, e.g. `44/Na__PlanDimensions__AxisLock__.js:57`). Packages that take such a TV file: W2-04 (states it), W1-37 (PlanAnnotations Toolbar), W2-03 (Elevation ModeController hunk). G2 catches a miss. TV half: WT-01', 'DR-42 item 7'],
    ['`Na__LeModel__AnnounceRestore`', '`LE/07/Na__LayoutEditor__SheetModel__.js` (facade)', '`LE/07/Na__LayoutEditor__SheetModel__Sheets__.js` (re-exported by the facade)', 'AutoSave, History (import from the facade in both apps)', 'Moves to the facade with SheetModel 1.35.1 + Sheets 1.4.0', 'W1-21'],
])

w('#### B.3.4 VV-only exported names in shared files')
w()
w(f'Inside folders 40-55 ({len(vv_only_4055_nocomp)} names in {len(files_vv_only_4055)} files, excluding the 8 ComposerPreset names). '
  'Rule X2: a kept name is additive, listed under PORT NOTE Divergences and re-applied after every whole-file take of its file.')
w()
RULING = {
    'Na__DrawData__GetLayoutModeEnabled': ('Keep', 'Layout Mode switch', 'DR-25', 'W1-05 re-applies'),
    'Na__DrawData__SetLayoutModeEnabled': ('Keep', 'Layout Mode switch', 'DR-25', 'W1-05 re-applies'),
    'Na__FloorPlanMode__ApplyStyles': ('Keep', 'D33 per-drawing style rows; VV keeps its own 42 controller', 'DR-32', 'W2-04 (calls kept)'),
    'Na__FpData__STYLE_KEYS': ('Keep', 'D33', 'DR-32', 'W1-08 re-adds'),
    'Na__ElevCfg__GetSectionGroupTarget': ('Keep (temporary)', 'D28 section filing; trigger "TV 48 past 0.1.0"', 'DR-26', 'no change (TV and VV both 1.0.0)'),
    'Na__ElevationMode__ApplyStyles': ('Keep', 'D33; VV keeps its own 45 controller', 'DR-32', 'W2-05 (calls kept)'),
    'Na__ElevData__STYLE_KEYS': ('Keep', 'D33', 'DR-32', '**W1-10 must re-add** (its adaptations name only SeededFrom)'),
    'Na__ElevData__SetAzimuthDeg': ('Ruling needed', 'FacePick seeding; only caller is VV\'s Elevation DevMenu Editor, which W2-05 replaces with TV 2.1.0', 'DR-32', 'W1-10 / W2-05'),
    'Na__ElevData__SetSeededFrom': ('Retire the setter, keep the field', 'DR-32: stop writing new values, preserve existing ones on read and save; only caller is the VV editor W2-05 replaces', 'DR-32', 'W1-10 / W2-05'),
    'Na__ElevLink__SyncSceneGroup': ('Keep (temporary)', 'D28 filing', 'DR-26', 'W2-04, W2-05 keep'),
    'Na__LeVeil__DrawingSettled': ('Keep', 'Lazy-loader veil hand-over', 'DR-24, DR-39', 'W1-33 re-applies'),
    'Na__LeMode__IsAvailable': ('Keep', 'Loader facade + Layout Mode', 'DR-24, DR-25', 'W1-32 re-applies'),
    'Na__LeMode__IsLayoutModeOn': ('Keep', 'Layout Mode', 'DR-25', 'W1-32'),
    'Na__LeMode__SetLayoutMode': ('Keep', 'Layout Mode', 'DR-25', 'W1-32'),
    'Na__LeMode__WaitForFirstDrawing': ('Keep', 'Loader wait contract', 'DR-24', 'W1-31, W1-32, W1-33'),
    'Na__LeModel__AnnounceRestore': ('Retire from this file', 'TV keeps it in the SheetModel facade (B.3.3)', 'DR-05', 'W1-21'),
    'Na__LeRec__SheetShortCode': ('Retire', 'Its only consumer is VV\'s Sheets__, replaced whole by W1-21; W1-19 keeps it exported until then', 'DR-24', 'W1-19 -> W1-21'),
    'Na__LeTools__SnapShapeTranslation': ('Retire (renamed by TV)', 'B.3.2', 'DR-05', 'W3-03'),
}
vrows = []
for r, n in sorted(vv_only_4055_nocomp, key=lambda x: (x[0]['target'], x[1])):
    rl = RULING.get(n, ('?', '?', '?', '?'))
    vrows.append(['`' + r['target'].replace(M, '') + '`', '`' + n + '`', rl[0], rl[1], rl[2], rl[3]])
table(['File (K2 target, under `02__Src__AppModules/`)', 'VV-only name', 'Ruling', 'Why', 'DR', 'K3'], vrows)
missing_rulings = [n for (_, n) in vv_only_4055_nocomp if n not in RULING]
assert not missing_rulings, missing_rulings

w(f'In the 3D support modules TV drawing files import ({len(vv_only_support)} names): all **kept**. TV code never needs them, and they '
  'shadow no TV name except the TiledRenderer pair in B.3.2.')
w()
SUPPORT_NOTE = {
    '03__AppUtils/Na__AppUtils__ProjectLoader.js': 'VV master-index / build-manifest loader (W0-11 adds TV\'s 2 names beside them)',
    '05__RenderPipeline/Na__RenderLoop__Invalidation.js': 'VV\'s event-based pause (K2 E2); W1-01 adds TV\'s IsPaused beside it (X3)',
    '10__NavigationAndCameras/Na__Navmode__FlyMode__SystemLogic.js': 'VV 3D navigation',
    '10__NavigationAndCameras/Na__Navmode__WalkMode__SystemLogic.js': 'VV 3D navigation',
    '10__NavigationAndCameras/Na__UiFeature__NavigationToolbar__Controls.js': 'VV toolbar API; W1-04 uses SetOrbitMode as the walk exit',
    '20__System__MaterialsSystem/Na__MaterialsSystem__LibraryLoader.js': 'VV materials library',
    '21__System__PresentationMode/Na__PresentationMode__Camera__SceneTransition.js': 'VV per-scene navigation mode',
    '21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js': 'VV scene data helpers (W0-14 uses GetActiveProjectCode)',
    '21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js': 'VV frame-renderer hook (W0-14 adapts the call shape)',
    '21__System__PresentationMode/Na__PresentationMode__UI__SceneCarousel.js': 'VV carousel event and toggle (not TV\'s SCENE_ACTIVE_EVENT)',
    '25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js': 'Video Studio door speed and snap-closed (W1-02 keeps them)',
    '26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js': 'VV category list',
    '30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js': 'see B.3.2 (replace with TV\'s re-export)',
}
srows = []
by_mod = defaultdict(list)
for r, n in vv_only_support:
    by_mod[r['target'].replace(M, '')].append(n)
for mod in sorted(by_mod):
    srows.append(['`' + mod + '`', ', '.join('`' + x + '`' for x in sorted(by_mod[mod])), SUPPORT_NOTE.get(mod, '?')])
table(['Module (under `02__Src__AppModules/`)', 'VV-only names', 'Purpose / note'], srows)
assert all(m in SUPPORT_NOTE for m in by_mod), [m for m in by_mod if m not in SUPPORT_NOTE]

w('#### B.3.5 TV names VV must add to modules it keeps with VV bodies (rules X3, X4)')
w()
w(f'Computed from every `import {{ ... }}` in TV folders 40-55 against VV\'s exports at the same K2 target: outside 40-55 VV lacks exactly '
  f'{miss_support_names} imported names in {len(miss_support)} modules it keeps, matching S01-F15 and S01-V01/V02. Each must exist before the first TV '
  'importer lands; the K3 graph already orders it so (W1-01 before W2-01 Drawing Planes, W1-02 before W2-06 DoorPose, W0-12 before every '
  'facade importer - checked transitively in `wp_canonical.json`).')
w()
ADD = []
for r in miss_support:
    mod = r['module'].replace(M, '')
    names = ', '.join('`' + n + '`' for n in r['missing_in_vv'])
    imps = sorted({short(i) for n in r['missing_in_vv'] for i in r['missing_importers'][n]})
    if 'ProjectLoader' in mod:
        own, dr, body = 'W0-11', 'DR-27', 'VV meaning: ?project-folder= / &year=, else the master index for ?project=; never project.json folderId (S12-V02)'
        imp_txt = f'{len(r["missing_importers"]["Na__AppUtils__GetProjectFolderFromUrl"])} / {len(r["missing_importers"]["Na__AppUtils__GetYearFromUrl"])} TV files (50 Persistence, LE Assets, SitePlan Store, Statement, ProjectQr, SheetImages, Publish, Share, PubDoc)'
    elif 'Invalidation' in mod:
        own, dr, body = 'W1-01', 'X3', 'Mirror VV\'s hold reasons inside the module; keep `na-pause/resume-render-loop` events'
        imp_txt = ', '.join(imps)
    elif 'ModelToggle' in mod:
        own, dr, body = 'W1-01', 'X3, X4', 'VV bodies; keep the `na-model-visibility-changed` dispatch'
        imp_txt = ', '.join(imps) + ' (TV :212)'
    else:
        own, dr, body = 'W1-02', 'X4, DR-16', 'Merge TV 1.8.0/1.9.0 onto VV 1.7.1 (also FindAdrAncestor, IsDoorOpen, MOD_TYPE_MVE_ONLY, MOD_TYPE_ROT_MVE, ResolveHitPanel); keep VV\'s four `Na__DoorAnimation__*`'
        imp_txt = ', '.join(imps)
    ADD.append(['`' + mod + '`', names, imp_txt, body, own, dr])
ADD.append(['`40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js` (new in both apps)',
            'Proposed: `Na__DrawView__SectionAdapter__Serialize`, `__Apply`, `__GetOutlineWidthPx`, `__SetOutlineWidthPx`, `__SetModelRoot`, `__RenderDepthInto`',
            'Replaces TV SnapshotRenderer\'s 41 imports (`Na__SectSerialize__Serialize/Apply` :213, used :1008, :1050; `Na__SectCutCfg__Get/SetAppearance` :223, used for `lineWidthPx` only :877, :902, :956; `Na__SectionCut__SetModelRoot` :244, used :786, :819) and 49 RenderLayer\'s `Na__SectionCut__RenderDepthInto` (:105)',
            'VV bodies over the 41 tool (W2-02: SerializeSections / ApplySerializedSections, GetAppearance / SetLineWidth, a no-op SetModelRoot, a cap-only depth render); TV pass-throughs (WT-02). SetModelRoot and RenderDepthInto are named in S04a/S02b; the other four are proposed here from K3\'s wording - W2-02 fixes them and WT-02 uses the same',
            'W2-02 (VV), WT-02 (TV)', 'DR-26, DR-42 item 1'])
ADD.append(['`80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js`, `03__AppUtils/Na__AppUtils__LocalProjectMirror__.js` (new)',
            '33 `Na__CfApi__*`, 8 `Na__LocalMirror__*` (TV\'s names and signatures)', '16 TV drawing files import 21 `Na__CfApi__*` names (27 TV files in all); 6 import all 8 `Na__LocalMirror__*`',
            'VV bodies (FR-16, FR-17)', 'W0-12', 'DR-27'])
table(['Module (K2 target, under `02__Src__AppModules/`)', 'TV names to add', 'TV importers', 'VV body', 'K3', 'Rule / DR'], ADD)
w(f'Inside 40-55, TV drawing files import {miss_4055_names} names VV\'s twins lack today, across {len(miss_4055)} modules. Every one of '
  'those modules has a K3 package that takes TV\'s file (whole or by hunk replay) - except `44__System__PlanDimensions/Na__PlanDimensions__Data__.js` '
  '(the 11 getters of B.3.3) and `40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js` (4 names, resolved by FR-09). '
  'The modules, names and TV importers are listed in `parity/report/tools/out/r2b_importnames.json`; each module\'s owner is the K3 '
  'package that names its TV source in `parity/data/wp_canonical.json`.')
w()

w('#### B.3.6 Cross-module name collisions (the same exported name in two different modules)')
w()
GROUPS = OrderedDict([
    ('Na__LeOsnap__', ('VV `LE/30 Snapping__` vs TV `LE/28` ObjectSnap units', 'Intended overlap during the shim; FR-14 then FR-15 (W2-19, W3-08)')),
    ('Na__PlanDim__', ('VV `44 ConfigState__` vs TV `44 Data__` + `ConfigState__`', 'Placement seam, DR-42 item 7 (B.3.3)')),
    ('Na__SectCap__', ('VV `41 Na__CrossSectionView__CapGeometry.js` vs TV `41 Na__SectionCut__CapGeometry__.js`', 'DIV-2 twins share the namespace: TV 41 is never ported into VV (DR-26, DR-41); G2 stays clean only while that holds')),
    ('Na__SectSceneData__', ('VV `41 Na__CrossSectionView__SceneData.js` vs TV `41 Na__SectionCut__SceneData__.js`', 'Same as above; VV keeps the `CrossSection__SceneData` schema (K2 rule K2, TD06)')),
    ('Na__LeModel__AnnounceRestore', ('VV Sheets__ + facade vs TV facade', 'W1-21')),
    ('Na__TilePlan__', ('TV re-exports from TiledRenderer', 'W2-03 (B.3.2)')),
    ('Na__ModelLoader__ApplyProfileLineColoursToMeshRoot', ('TV split it into `15/Na__ModelLoader__LineworkColours__.js` (re-exported by MultiModel)', '3D side, no TV drawing importer; VV keeps one file (W1-03 ports only the two drawing fixes)')),
    ('Na__Supersampler__', ('VV `05 Supersampler__` and `31 Na__VideoStudio__Export__Supersampler.js`', 'VV-internal duplicate, out of scope')),
    ('Na__UiFeature__InitializeLocalhostDevMenu', ('TV has it in 26 and 70', 'TV-internal duplicate, out of scope')),
])
grows = []
counted = 0
for pre, (where, ruling) in GROUPS.items():
    names = [c['name'] for c in collisions if c['name'].startswith(pre)]
    counted += len(names)
    grows.append([f'`{pre}*`' if pre.endswith('__') else f'`{pre}`', str(len(names)), where, ruling])
assert counted == len(collisions), (counted, len(collisions))
table(['Names', 'Count', 'Where', 'Ruling'], grows)
w(f'Total {len(collisions)} names; none is unexplained. Shared prefix without a shared name: VV `41/Na__CrossSectionView__SystemLogic.js` exports 35 '
  '`Na__CrossSection__*` names and TV `48/Na__CrossSection__DevMenu__Editor__.js` (NAMESPACE `Na__XSecDev`) exports '
  '`Na__CrossSection__DevMenu__Initialize` - no clash, but their DOM ids do clash (VV `index.html:855-866` and 41 DevControls :79-83 vs '
  'TV `Index.html:600-605` and 48 :79-81): VV renames its own five ids to `naCrossSectionToolDev*` in W2-05 (DR-26, Section D).')
w()

w('#### B.3.7 App tokens inside module and export names')
w()
table(['Name', 'Token', 'Where', 'Ruling'], [
    ['`Na__LayoutEditor__Statement__Standard__TrueVisionHub__.js` (NAMESPACE `Na__LeStmtHub`; ID `TrueVisionHub`, block `StatementStandard__TrueVisionHub__Config`, prefix `TrueVisionHub__`, :102-104; 19 "TrueVision" strings)', 'TV', '`02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/09__Standard__Sections/`', 'Keep TV\'s file name, ID and keys (F1, K1: the Standard Registry :140 imports it and statements carry the `TrueVisionHub` marker); exclude it from DEFINITIONS by config (DR-43, W4-12). **W0-04 declares a named G4 exception for this one file (R6 F.8 C13)**, without which G4 fails on "TrueVision 3D Project Hub"; the section is present but never rendered (R0 PD-15); WT-03 (DR-42 item 6) would move the branding into config'],
    ['`Na__AppUtils__FetchTrueVisionProjectData`', 'TV', '`03__AppUtils/Na__AppUtils__ProjectLoader.js`', 'Not imported by any TV drawing file; never added to VV (DR-09: no design phases)'],
    ['`Na__AppUtils__ValeVision__HotkeyHandler__.js` (`Na__ValeVision__HotkeyHandler__Initialize`, `__Destroy`)', 'VV', '`03__AppUtils/`', 'Keep (DR-33); its TV twin `10__NavigationAndCameras/Na__Hotkeys__Manager.js` is not ported'],
    ['`Na__ValeVision__HotkeysDictionary` (JSON root key)', 'VV', '`02__AppData/Na__Hotkeys__3dModelTab__.json` after FR-13', 'Keep (K2 F4)'],
    ['`ValeVision__DrawingNotes__.json`, `ValeVision__StatementDocs__.json`, `ValeVision__UserSpellings__.json`; `50__ValeVision__UserConfig/`, `01__AppAssets__ValeVision/`', 'VV', 'project files, app-root folders', 'Token swap of TV\'s names (K2 F9, N7, N8)'],
])

w('#### B.3.8 New names proposed by K2/K3, checked against the rulebook')
w()
table(['Proposed name', 'Proposed by', 'Kind', 'Check', 'Verdict'], [
    ['`Na__CfApi__GetProjectDisplayName()`', 'W0-12 (K3 ruling; VerbNoun form of WP-S12-V18\'s `Na__CfApi__ProjectDisplayName`)', 'VV-only export in the VV-bodied facade', 'X1 VerbNoun; X2 additive. S01-V04 had proposed `Na__DrawData__GetProjectDisplayName` - K3\'s facade name wins (the facade sits at TV\'s path, so a TV back-port makes every reader identical)', 'Adopt; one accessor only; used by W3-14, W4-12, W4-18 and SpecPdf'],
    ['`Na__DrawData__GetDocumentCode()`', 'W1-12', 'VV-only export in shared `40/Na__DrawView__ProjectData__.js`', 'X1, X2; W1-05 takes ProjectData whole first, so W1-12 adds it after', 'Adopt; re-apply after any later whole-file take'],
    ['SectionAdapter calls (B.3.5)', 'W2-02 / WT-02', 'new exports', 'X1 with TV\'s adapter prefix `Na__DrawView__SectionAdapter__`', 'Fix the six names in W2-02'],
    ['Gesture guard constants', 'W3-03', 'VV-only constants', 'K3 left them unnamed; X1 requires `Na__<Ns>__SCREAMING_SNAKE` in each file\'s own namespace, listed in its PORT NOTE', 'Name in W3-03'],
    ['`Na__Verify__ParityNaming__.mjs`, `Na__Verify__PortNotes__.mjs`, `Na__Verify__UiParity__.mjs`, `Na__Test__LoaderStylesheets__.test.mjs`, `Na__Test__DrawingNotesRoute__.test.py`, `Na__Test__TransportFacade__.test.mjs`, `Na__Test__AppConfigParity__.test.mjs`, `Na__Test__PublishedApi__.test.py`, `Na__Test__LoaderFacade__.test.mjs`, `Na__Test__LineworkModifiers__.test.mjs`, `Na__Test__RegisterNumbering__.test.mjs`', 'W0-04, W0-09, W0-12, W0-15, W0-19, W1-31, W2-13, W4-18', 'VV-only tests in `80__Testing__PrototypeEnvironment/`', 'F7 pattern; none collides with a TV test name (TV `80__Testing__PrototypeEnvironment` listed)', 'Adopt'],
    ['WCP `Server__ValeVisionShared__Lib__.py`, `Server__ValeVisionSheetImages__Api__.py`, `Server__ValeVisionUserConfig__Api__.py`, `Server__ValeVisionPublished__Api__.py`, `Server__ValeVisionStatements__Api__.py`', 'W0-09, W0-18, W0-19', 'Flask modules', 'R5 / F10 (precedent `Server__ValeVisionScrapbook__Api__.py`; `__Lib__` for the shared helper)', 'Adopt'],
    ['WCP `CloudflareWorker/src/handlers/CloudflareHandler__ProjectFiles__.js`, `CloudflareHandler__ProjectMerge__.js`, `CloudflareWorker/src/CloudflareHelper__PathGuards__.js`', 'W0-10', 'worker files', 'F10 (precedents `CloudflareHandler__DrawingNotes__.js`, `CloudflareHelper__Cors__.js`)', 'Adopt'],
    ['`ValeVision__NOTES__FolderNumberRegistry__.md`, `ValeVision__PLAN__TrueVisionRealign__DrawingSystems__.md`, `ValeVision__NOTES__StatementWriter__.md`', 'W0-06, W4-99', 'root documents', 'F8 (mirrors TV\'s `TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md`, `TrueVision__NOTES__StatementWriter__.md`)', 'Adopt'],
    ['`03__AppUtils/Na__AppUtils__R2StatementDocs__.js`, `CloudflareHandler__StatementDocs__.js` (S07b-F03); `Na__AppUtils__R2PublishedDocs__` (WP-S08-06)', 'slices', 'per-feature transport clients', 'Superseded by DR-27 (A): one facade at TV\'s paths and one generic files handler (W0-10, W0-11)', '**Do not create**'],
])

# ---------------------------------------------------------------- B.4
w('### B.4 VV-only modules that stay, and what VV gains')
w()
w('#### B.4.1 VV-only modules in the drawing system and its import surface')
w()
VVONLY = [
    ('02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__ThumbnailBake__.js', 'Stays', 'Bakes carousel thumbnails on add, seed and Update (VV seam kept in TV\'s 2.x menus); offered to TV', 'DR-32', 'W2-04, W2-05; TV: WT-06'),
    ('02__Src__AppModules/41__System__CrossSectionView/', 'Stays', 'DIV-2 live Cross Sections tool; TV\'s twin `41__System__SectionCutEngine/` (7 files) is never ported; add `README__CrossSectionView__.md` naming the twins (K2 N6, F6)', 'DR-26, DR-41', 'README: W0-06 (R6 F.8 C14)'),
    ('02__Src__AppModules/51__System__LayoutEditor/01__Core__Loader/', 'Stays', 'Lazy editor loader (keeps ~73 modules off start-up); LE/01 reserved for VV', 'DR-24', 'W1-31, W1-33'),
    ('02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__DrawingCode__.js', 'Stays', 'Tab-code string leaf of the loader; SheetRecords keeps importing it; offered to TV', 'DR-24, DR-42 item 4', 'W1-19; TV: WT-10'),
    ('02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__2dProfileLines__.js', 'Stays (moved by FR-08)', 'DIV-1 ortho profile pass of the composer route', 'DR-03', 'W0-02'),
    ('02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__LineworkSettings__State.js', 'Stays', 'DIV-1 linework state; gains TV\'s linework modifiers as `ValeVision__LineworkModifier__*`', 'DR-31', 'W2-13'),
    ('02__Src__AppModules/05__RenderPipeline/01__Engine__PureEngine/Na__RenderPipeline__PureEngine__Setup.js', 'Stays', 'DIV-1 dual engine (TV twin `05__RenderPipeline/Na__RenderPipeline__PostProcessing__Setup.js` not ported)', '-', '-'),
    ('02__Src__AppModules/05__RenderPipeline/02__Engine__MaxEngine/Na__RenderPipeline__MaxEngine__Setup.js', 'Stays', 'DIV-1 dual engine', '-', '-'),
    ('02__Src__AppModules/05__RenderPipeline/Na__RenderEngine__State.js', 'Stays', 'DIV-1 engine state', '-', '-'),
    ('02__Src__AppModules/05__RenderPipeline/Na__UiFeature__RenderEngine__Controls.js', 'Stays', 'DIV-1 engine switch', '-', '-'),
    ('02__Src__AppModules/30__System__ImageExport/Na__UiFeature__LineworkSettings__Controls.js', 'Stays', 'DIV-1 linework controls', '-', '-'),
    ('02__Src__AppModules/70__System__DevTools/Na__UiFeature__ProfileLines__Controls.js', 'Stays', 'DIV-1 dev controls', '-', '-'),
    ('02__Src__AppModules/70__System__DevTools/Na__UiFeature__RenderEngine__DevControls.js', 'Stays', 'DIV-1 dev controls', '-', '-'),
    ('02__Src__AppModules/03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js', 'Stays', 'DIV-4 per-route client the facade fronts; VV Dev savers', 'DR-27', 'W0-12; W2-33 (optional saver migration)'),
    ('02__Src__AppModules/03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js', 'Stays', '3D keys; twin of TV `10__NavigationAndCameras/Na__Hotkeys__Manager.js`; gated by KeyScope', 'DR-33', 'W0-03 (fetch path), W1-29'),
    ('02__Src__AppModules/03__AppUtils/Na__AppUtils__LoadingOverlay__.js', 'Stays', 'VV app core (3D start-up)', '-', '-'),
    ('02__Src__AppModules/03__AppUtils/Na__AppUtils__ResilientLoad__.js', 'Stays', 'VV app core', '-', '-'),
    ('02__Src__AppModules/01__AppCore/Na__AppCore__GpuLifecycle__.js', 'Stays', 'VV app core', '-', '-'),
    ('02__Src__AppModules/01__AppCore/Na__AppCore__LoadWatchdog__.js', 'Stays', 'VV app core; its global is read by the shared WCP registrar (S01-V05)', '-', '-'),
    ('02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__ScenePersistence__.js', 'Stays', 'VV split of the scene editor, accepted by TV v2.68.2 (S01-F65)', '-', 'W0-06 (headers)'),
    ('02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__SceneReorder__.js', 'Stays', 'as above', '-', 'W0-06'),
    ('02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__SceneRowBuilders__.js', 'Stays', 'as above (NAMESPACE `Na__PmRows`)', '-', 'W0-06'),
    ('02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevTools__CameraPathVisualizer.js', 'Stays', 'VV dev tool', '-', '-'),
    ('02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__Snapping__.js', 'Retires', 'Superseded by `LE/28__System__ObjectSnap/` (FR-14, FR-15)', 'DR-05', 'W2-19, W3-08'),
    ('02__Src__AppModules/03__AppUtils/Na__AppUtils__R2DrawingNotes__.js', 'Retires', 'Role absorbed by the facade (FR-18)', 'DR-27', 'W2-33'),
    ('02__Src__AppModules/91__System__2dElevationsView/', 'Retires', 'Legacy Elevation View: moved 40 -> 91 (FR-01), retired later (FR-25)', 'DR-03', 'W0-02, W6-03'),
    ('02__Src__AppModules/35__System__PageLayoutSystem/', 'Retires', 'Legacy Create Drawing (FR-19/FR-20 copies first, FR-21)', 'DR-03', 'W0-16, W6-03'),
]


def folder_stats(prefix):
    files = [rel for rel, rec in VVR.items() if rec['target'].startswith(prefix)]
    return len(files), sum(VVR[f].get('lines', 0) for f in files)


vrows = []
for path, status, why, dr, k3 in VVONLY:
    if path.endswith('/'):
        n, lines = folder_stats(path)
        ns = 'several'
        size = f'{n} files / {lines:,} lines'
    else:
        src = [rel for rel, rec in VVR.items() if rec['target'] == path]
        assert src, path
        rec = VVR[src[0]]
        ns = rec.get('NAMESPACE', '') or '-'
        size = f'{rec.get("lines", 0):,} lines'
    if path.endswith('35__System__PageLayoutSystem/'):
        size += ' (incl. the 32,999-line vendored jsPDF)'
    vrows.append(['`' + path.replace(M, '') + '`', size, '`' + ns + '`' if ns not in ('-', 'several') else ns, status, why, dr, k3])
table(['VV module (K2 target, under `02__Src__AppModules/`)', 'Size', 'NAMESPACE', 'Status', 'Rationale', 'DR', 'K3'], vrows)
w('VV-only feature folders 28, 29, 31, 60, 61, 63, 64, 69 and 71 stay and are registered (62 moves to 92 only on request) - Section A. '
  'VV-only 3D files outside the drawing system (`02__AppData/Na__AppConfig__MaterialsLibrary.json`, `10/Na__Navmode__OrbitPivot__InteractionSwap.js`, '
  'three `11/...VerticalCorrection...` files) stay and are out of scope.')
w()

w('#### B.4.2 TV-only modules VV gains, counted by system (full list in Section E)')
w()
w('A TV-only code file (.js/.mjs/.cjs/.css/.json with no VV twin at its K2 target) counts as **gained** when a VV-wave K3 package '
  '(W0-W6) creates it at TV\'s path. READMEs, HTML harnesses and assets are not counted here. Several gained systems land dormant or switched '
  'off (site plans DR-08, Statement Writer DR-10, QR DR-12) and the publishing set waits for its prerequisites (DR-22).')
w()
GROUP_OF = OrderedDict([
    ('Drawing core and drawing systems (40-50)', ['40__', '41__', '42__', '45__', '47__', '48__', '49__', '50__']),
    ('Layout Editor (51)', ['51 LE/']),
    ('Document and feature systems (52-55)', ['52__', '53__', '54__', '55__']),
    ('Support modules the drawing system imports', ['03__AppUtils', '05__', '25__', '26__', '27__', '80__']),
])
by = defaultdict(lambda: {'n': 0, 'lines': 0, 'own': set(), 'not': Counter()})
for r in tvo_rows:
    s = r['system']
    if r['gained']:
        by[s]['n'] += 1
        by[s]['lines'] += r['lines']
        by[s]['own'] |= set(r['gained_by'])
    else:
        by[s]['not'][r['reason'] or 'outside the drawing system, no package'] += 1
NOT_REASON_SHORT = {
    'outside the drawing system, no package': '3D-tab storey and dev-menu files, no package',
}
grand = Counter()
for gname, prefixes in GROUP_OF.items():
    w(f'**{gname}**')
    w()
    grows = []
    for s in sorted(by):
        if not any(s.startswith(p) for p in prefixes):
            continue
        d = by[s]
        nots = '; '.join(f'{c} ({NOT_REASON_SHORT.get(k, k)})' for k, c in d['not'].items()) or '-'
        grows.append([s.replace('51 LE/', 'LE/'), str(d['n']), f'{d["lines"]:,}', ', '.join(sorted(d['own'])) or '-', nots])
        grand['n'] += d['n']
        grand['lines'] += d['lines']
        grand['not'] += sum(d['not'].values())
    table(['System', 'Gained files', 'Lines', 'K3 packages', 'Not gained'], grows)
other_g = sum(by[s]['n'] for s in by if not any(s.startswith(p) for ps in GROUP_OF.values() for p in ps))
other_n = sum(sum(by[s]['not'].values()) for s in by if not any(s.startswith(p) for ps in GROUP_OF.values() for p in ps))
w(f'Drawing system and support modules: **{grand["n"]} files ({grand["lines"]:,} lines) gained**, {grand["not"]} TV-only files not gained, '
  'each for a recorded reason. '
  f'Elsewhere in the tree VV gains {other_g} optional 3D-tab files (Cache & Storage panel and its sheet, W5-04, DR-44) and does not take {other_n} '
  '(62 AppInstallability x15, 75 x3, 76 x3, the 01 ProjectDataLoader placeholder, 10 Hotkeys Manager, the PwaInstallability and SceneInspector '
  'sheets, and 3D-tab files no package names: 07 DefaultFogEffect, 11 ViewModeFov DevControls, 15 InstanceConsolidation and LineworkColours, '
  '21 Visibility StateCapture, 70 AssetCullDistance). '
  f'Overall {len(gained)} gained of {len(tvo_rows)} TV-only code files.')
w()

# ---------------------------------------------------------------- B.5
w('### B.5 Open issues')
w()
OPEN = [
    'No K3 package owns the `05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js` header fix (`NAMESPACE` / `MODULE` to TV\'s, B.3.1); recommended: add it to W0-03 (header-only, no import change). Settled: W0-03 owns it since R6 F.8 C12.',
    'No K3 package creates `02__Src__AppModules/41__System__CrossSectionView/README__CrossSectionView__.md` (K2 N6, DR-26); recommended: W0-06. Settled: W0-06 creates it (R6 F.8 C14).',
    'W0-04\'s naming lint (G4) needs a declared exception for `LE/52 .../Na__LayoutEditor__Statement__Standard__TrueVisionHub__.js` (TV-token file name, ID and NA product strings kept at TV\'s path by W4-12), or W4-12 fails its own gate. Settled: W0-04\'s adaptations and acceptance and gate G4 name it (R6 F.8 C13).',
    'W1-10\'s adaptations re-apply only `Elevation__SeededFrom`; `Na__ElevData__STYLE_KEYS` (DR-32 D33) must also be re-added. `Na__ElevData__SetAzimuthDeg` loses its only caller when W2-05 replaces VV\'s Elevation DevMenu Editor with TV 2.1.0 - keep it as a FacePick seam or retire it (ruling for W1-10/W2-05); the `SetSeededFrom` setter retires under DR-32 (no new writes; the field is still read and preserved). Settled: W1-10 re-adds `Na__ElevData__STYLE_KEYS` and keeps both setters through W1, and W2-05 retires them (R6 F.8 C20; the planner\'s ruling R0.2.11 Q-AZIMUTH).',
    'W0-14 should take TV\'s `MODULE` line for `03__AppUtils/Na__AppUtils__R2AssetUpload__.js` (K2 H3); its adaptations do not mention the header. Settled: R6 F.8 C18.',
    'The four non-slice-named SectionAdapter names (`__Serialize`, `__Apply`, `__GetOutlineWidthPx`, `__SetOutlineWidthPx`) are proposed here (B.3.5); W2-02 must fix them before WT-02 copies them. Settled: R6 F.8 C25 fixes the six names for W2-02 and WT-02.',
    'Every TV file that imports a `Na__PlanDim__*` config getter from `44 Data__` needs the `ConfigState__` seam in VV; W2-04 states it, W1-37 and W2-03 do not (B.3.3). Settled: R6 F.8 C24.',
    'W6-03\'s estimate note counts 4 files in 91; the folder holds 7 after FR-08 (verified on disk); FR-25\'s importer list (4 files) is unaffected. Settled: R6 F.8 C31.',
    'K3-proposed names awaiting Adam\'s confirmation (K3 open issues): `Na__CfApi__GetProjectDisplayName`, the gesture guard constants and the 11 VV-only test/verifier names; B.3.8 finds them rule-compliant.',
    'S01-V04 (`Na__DrawData__GetProjectDisplayName`) and K3 (`Na__CfApi__GetProjectDisplayName`) named the same accessor differently; this section follows K3. Only one may be created.',
    'Rows follow K1\'s recommended answers; a different answer to DR-02/DR-03/DR-04 flips FR-01..FR-11 (K2 script switches `--legacy 39`, `--no-renderpreset`, `--no-distanceculling`, `--no-snapshothistory`).',
    'Two small hand edits are assigned here and are in neither the K2 script nor the K3 adaptations: the DistanceCulling banner after FR-11 (W0-02) and replacing the TiledRenderer `Na__StaticExport__ClampToDeviceLimits` / `IsIosDevice` wrappers by TV\'s `Na__TilePlan__*` re-export (W2-03). Settled: R6 F.8 C11 (W0-02) and C26 (W2-03).',
]
for i, o in enumerate(OPEN, 1):
    w(f'{i}. {o}')
w()

# ---------------------------------------------------------------- B.6
w('### B.6 Method and reproducibility')
w()
table(['Tool (`parity/report/tools/`)', 'What it does'], [
    ['`r2b_extract.py`', 'Walks both trees\' `02__Src__AppModules` and `03__Style__AppStylesheets` (skips node_modules, .wrangler, .claude, vendored 04__Lib), reads header lines and exports with a comment- and string-aware scanner, maps every VV path to its K2 target (FR-01..FR-13) and pairs twins. Read-only.'],
    ['`r2b_analyse.py`', 'NAMESPACE / FILE / MODULE / banner divergences, export differences, cross-module name collisions, shared prefixes; the TV drawing import surface.'],
    ['`r2b_importnames.py`', 'Every `import { ... }` in TV folders 40-55 checked against VV\'s exports at the same target (B.3.5).'],
    ['`r2b_tvonly.py`', 'TV-only files gained per K3 `vv_targets` (B.4.2).'],
    ['`r2b_render.py`', 'Writes this section from the outputs above, `data/file_rename_map.json` and the curated rulings; asserts every VV-only name, collision and module has a ruling.'],
])
w('Cross-checks: the extraction reproduces S01\'s 18 VV-only names in 12 files, its single in-40-55 NAMESPACE divergence, K2\'s 70 '
  'drawing pairs and the S01-V01/V02/F15 missing names exactly; spot checks opened the cited lines in both trees (SectionAdapter, '
  'SectionClipping__State, TiledRenderer, the PlanDimensions imports, the TrueVisionHub module, the DOM ids).')
w()

open(DEST, 'w', encoding='utf-8', newline='\n').write('\n'.join(L))
print('written', DEST, len(L), 'lines')
