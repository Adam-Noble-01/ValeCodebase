"""K3 - render report/K3__WorkPackages.md from the validated catalogue (called by k3_build.py)."""
import collections, re

WAVE_THEME = {
    'W0': 'Foundations: decision record and swarm gates, the scripted renumber, hotkey names, the transport (Flask, worker, facade, '
          'loader helpers), the Layout Editor config foundation, vendor copies, sync safety and the shared service-worker package (prepared).',
    'W1': 'Core data and hubs: render-loop overlays, ProjectData and AutoSave over the facade, record/model leaves, SheetRecords and '
          'SheetModel, chrome and paint order, keyboards, the loader facade, the mode-controller core, veil, header fold and tab strip.',
    'W2': 'Subsystems: drawing planes, fog, folder 50, render styles, linework modifiers, site-plan leaves (dormant), drafting modules, '
          'object snap, measurements, grips, vector units (inert), spec lockstep, parametric engine; ends with the viewport convergence.',
    'W3': 'The SheetTools hub in two sub-waves around Sheet Images, then feature activation: drafting aids, rotation, vector tools, '
          'Sheet Images, Floor Areas, regions, panels and the PdfExporter re-sync.',
    'W4': 'Documents: published schema and reader, publisher, sharing, the published-only web viewer, the Drawing Register, and the '
          'Statement Writer last, switched off (DR-10).',
    'W5': 'Convergence and options: the toolbar taken whole, stylesheet and mode-controller convergence checks, and the decision-gated '
          'packages (Cache & Storage, QR resolver, site-plan pipeline).',
    'W6': 'Close-out: legacy retirements, the test sweep, the shared service-worker refresh and the final Parity Scribe pass.',
    'WT': 'TrueVision lane (DR-36): back-ports and record fixes in TrueVision, each only with Adam\'s per-package approval; outside the VV wave barrier.',
}

ADJUSTMENTS = [
    ('Viewport units converge at the end of W2 (W2-16), together with Model Source and the site-plan painter.',
     'The painter imports names VV\'s current files lack (EdgeStyles FillHex, ModelLayers Token/IsOn, Frame States/SizeLayer/HideProgress, Window, Linework StyleToken/StyleBands/BandPaths), so ModelSource, the painter and the viewport units form one import cycle (S04a-V01).'),
    ('The SheetTools hub lands in two sub-waves around the Sheet Images editing set (W3-01, W3-18/W3-02, W3-03).',
     'SheetImages__Insert__ imports the hub\'s ToolState PickUpMove while the hub statically imports Crop and Menu (S05a-F55, S05a-V01; TV Insert import lines read at HEAD).'),
    ('The 49 depth-fog pure leaves go to W1 (W1-09), ahead of the elevation data module.',
     'TV Na__Elevation__ProjectJson__Data__ 1.1.0 imports 49 RecordData (TV :84-89).'),
    ('The Drawing Register moved to W4, after publishing and sharing.',
     'Register__Editor imports 65 Publish__Panel, 66 Share__Button and 31 DocumentKeys (TV import lines); landing it earlier would need seams in all three (S07a-F22).'),
    ('The Statement Writer is last (W4-04..W4-16, W4-12, W4-13), behind LayoutEditor__Statement__Enabled = false.',
     'DR-10 default; its surface imports the QR modules, the register and sharing.'),
    ('PDF.js is vendored in W0-16 (VV vendor 07), not with the Register.',
     'TV loads PDF.js from PlanVision\'s NA path (TV LE AppConfig :1200-1201, ConfigState__EditorSetup :403-404), which VV cannot use; W0-15 writes the VV vendor-07 path into the LE config, so the file must exist from W0 for the K2 path gate (G3).'),
    ('Oversized packages are split along TV import lines into inert leaf landings and a switch-on package.',
     'Reader (W4-17 -> W4-02), register (W4-18 -> W4-10), Statement Writer (W4-04 -> W4-05/W4-16; W4-15), object snap (W2-42 -> W2-19), folder 50 (W2-43 -> W2-06), drawing planes (W2-40 -> W2-01), vector tools (W2-28 -> W2-41), parametric elements (W2-38, W2-39), Sheet Images (W3-18 -> W3-02), Area Schedule (W3-17). Each inert landing links on its own (G2 checks unreachable modules).'),
    ('The toolbar is taken whole only in W5 (W5-01).',
     'TV Toolbar 1.24.0 statically imports ten feature modules from W2-W4 (WP-S06a-10v); W1-35 removes VV-only buttons first and no interim feature buttons are added.'),
    ('W6 retires legacy folders before the test sweep and the service-worker refresh.',
     'The precache list must not name retired files, and the sweep must run on the final tree.'),
    ('TrueVision edits form their own serial lane (WT) outside the VV barrier.',
     'DR-36 default (a) means none of them runs until Adam approves each; every WT package edits TrueVision__DEVLOG__.md, so the lane is serial.'),
]

RULINGS = [
    ('G6 facade rule', 'DR-27 (A) gives VV its own same-name facade at TV\'s paths (W0-12). This replaces the older raw acceptance line "No file under VVM imports 80__CloudflareIntegration".'),
    ('Display name', 'Na__CfApi__GetProjectDisplayName (VerbNoun form of WP-S12-V18\'s Na__CfApi__ProjectDisplayName) replaces every TV read of window.TrueVision__Pwa__ProjectContext: SpecPdf :141, SpecDocument :161, Register__Pdf :213, Panel__ScrapbookParametric :290, Statement TrueVisionHub :206.'),
    ('Document code', 'The document-code accessor reads the facade\'s loaded data (W1-12); statements and pictures are filed under it, never under the ?project= token (S07a-V01, S07b-V02).'),
    ('Spec lockstep', 'Goes straight onto the facade; R2DrawingNotes is retired in W2-33 (K2 FR-18).'),
    ('Persistence', 'Folder 50 Persistence is owned by W0-14 (asset upload contract), not by the folder-50 port (W2-06).'),
    ('Gesture holds', 'DR-40 items 7-10 are held by one-line guard constants at the hub entry points (W3-03), removed by W3-04 after Adam\'s yes; no config key.'),
    ('Parametric types', 'W2-38/W2-39 land Cabinet Infill, the Project QR element and the site-plan legend pair inert so Panel__ScrapbookParametric 1.8.0 can be taken whole (DR-12 (A), DR-08 (B)); no raw package carried them.'),
    ('Whole-file takes', 'ShapeGeometry 1.9.0 is taken whole in W1-26; the toolbar gets no interim feature buttons (W1-35 subtractive, W5-01 whole).'),
    ('Paper CSS', 'Styles__Main__Paper lands region by region with its owner packages; W5-02 checks convergence.'),
    ('Tests', 'A TV test is ported by the package that creates its VV file; earlier packages may run named sections from a scratch copy; later ones re-run it. W6-01 closes the TV inventory (102 files).'),
    ('TV halves', 'Mixed packages are split by app: WP-S04a-15 -> W2-02 (VV) + WT-02 (TV); WP-S11-06 items 1/6 -> WT-04, item 3 -> WT-05, items 2/4/5 -> WT-06; the TV notes of the scribe packages -> WT-08; W0-06 only drafts the TV notes of WP-S01-05 (DR-36 lists it), WT-08 applies them.'),
    ('DR-42 offers', 'Items with no raw package are carried by K3-derived optional packages WT-10 (items 4, 5) and WT-11 (items 2, 3, 8, 9, 10, 11).'),
    ('Shared worker', 'WP-S10-12 and WP-S10-14 list the Whitecardopedia worker as a hot file; under R6/DR-07 W5-01 and W5-04 never edit it, and any need goes to W6-02 through the Port Record.'),
    ('Statement gate', 'Raw WP-S07b-05B says "blocked until DR-10"; the DR-10 default is to build behind LayoutEditor__Statement__Enabled = false, so W4-06 runs switched off.'),
    ('Publish entry', 'No interim "Publish drawings..." Dev entry (D-S08-04): the Register lands in the same wave and hosts TV\'s Publish button.'),
    ('Sizes', 'Size is mechanical from est_lines and file count (S <= 300, M <= 1,200, L <= 2,500, XL above or more than 15 files); every XL carries a split_justification.'),
]

CONFLICTS = [
    ('K2 places vendor 07 (PDF.js) "with LE/51"; the W0-15 config writes its path in W0.',
     'Read TV LE AppConfig :1200-1201 and ConfigState__EditorSetup :403-404 (TV loads it from /na-apps/20__PlanVision__CoreAppCode/...); listed NAAPPS/20__PlanVision__CoreAppCode/01__AppDependencies__VersionLocked/PdfJs__3.11.174/build/ (pdf.min.js 377,137 B; pdf.worker.min.js 1,133,681 B). Vendoring moved to W0-16.'),
    ('W0-02\'s move list named 91__System__2dElevationsView/...2dProfileLines as the source of the 2dProfileLines move.',
     'K2 file_rename_map FR-08 moves it straight from 40__System__2dElevationsView to 05__RenderPipeline; corrected.'),
    ('The register stylesheet and the Statement Writer stylesheets: CSS index or loader list?',
     'Neither: TV links them from the modules (Register__Editor :596 new URL(...); Statement Page :827-828; Statement Publish :130). No index or loader edit in W4-10/W4-15.'),
    ('Raw WP-S07b-02 places the TV statement .gitattributes at "NaWeb/.gitattributes (TV repo root)".',
     'Listed NaWeb: it holds .git and .gitattributes, so NaWeb is TV\'s git root (NAWEB/ in K3 paths).'),
    ('W1-16 said the full Sheet Images suite lands in W3-12; W1-14 said the rotation suite completes in W3-07.',
     'The packages that create the files are W3-09 (Sheet Images on) and W3-06 (rotatable viewports); both texts corrected and W1-14 now creates the rotation test file it first runs.'),
    ('The Cache & Storage panel reads TV\'s registrar global.',
     'TV panel :238 reads window.TrueVision__Pwa__ServiceWorker__Registrar; Whitecardopedia exposes window.Whitecardopedia__Pwa__ServiceWorker__Registrar (Registrar :378). W5-04 adapts it.'),
    ('Raw test packages (WP-S02b-08, WP-S05a-09, WP-S05b-10) port suites that feature packages also port.',
     'Each suite is created by one package (test-ownership table); the raw test packages become the W6-01 sweep.'),
    ('The ProjectVision path in W0-07 and WT-12.',
     'Listed na-apps: 05__ProjectVision__CoreAppCode sits under NaWeb/na-apps (CloudflareR2__ModelSync__Main__.py, ProjectVision__BuildScript__.py), so the path is NAAPPS/05__ProjectVision__CoreAppCode/...'),
]

K2_CROSSWALK = [
    ('K2 "W1" (scripted renumber, FR-01..FR-11)', 'W0-02'),
    ('K2 "W1b" (hotkey file names FR-12, FR-13)', 'W0-03'),
    ('K2 "W2 (first)" (facade FR-16, FR-17; TF-T49)', 'W0-12'),
    ('K2 "W2" vendor and asset copies (FR-19, FR-20, TF-R04..R06)', 'W0-16'),
    ('K2 TF-R07 PDF.js "add_later with LE/51"', 'W0-16 (moved, see section 4)'),
    ('K2 "W2" feature folders (47, 48, 49, 54, 55; LE 21, 26-37, 51-59, 65, 66)', 'W1-W4 owner packages (per folder: see vv_targets)'),
    ('K2 FR-14 Snapping shim / FR-15 retire', 'W2-19 / W3-08'),
    ('K2 FR-18 retire R2DrawingNotes', 'W2-33'),
    ('K2 "W3" retirements (FR-21 35, FR-23 old three.js, FR-25 91) and FR-22 (62 -> 92, deferred)', 'W6-03'),
    ('K2 FR-24 Scene Inspector split (optional, not recommended by DR-44)', 'W5-04 (only on request)'),
]


def esc(s):
    return (s or '').replace('|', '\\|').replace('\n', ' ')


def short_title(t, n=44):
    s = re.split(r'\s+\(|:\s| - ', t)[0]
    s = s.strip()
    if len(s) > n:
        s = s[:n - 1].rstrip() + '...'
    return s.replace('"', "'")


def short_path(p):
    p = re.sub(r'\s*\([^()]*\)\s*$', '', p).rstrip('/')
    return p.split('/')[-1]


def fmt_lines(n):
    return '-' if n is None else '{:,}'.format(n)


def write(canon, raw_map, hot, out_path, verification=None):
    P = {p['wp_id']: p for p in canon['packages']}
    order = canon['topological_order']
    pos = {w: i for i, w in enumerate(order)}
    lanes = ['W0', 'W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'WT']
    by_wave = collections.defaultdict(list)
    for p in canon['packages']:
        by_wave[p['wave']].append(p)
    anc = {}
    def ancestors(w):
        if w in anc:
            return anc[w]
        s = set()
        for d in P[w]['depends_on']:
            s.add(d)
            s |= ancestors(d)
        anc[w] = s
        return s
    for w in order:
        ancestors(w)

    L = []
    A = L.append
    cov = raw_map['coverage']
    vv_count = sum(1 for p in canon['packages'] if p['wave'] != 'WT')
    wt_count = len(by_wave['WT'])
    cp = canon['critical_path']
    A('# K3 - Canonical Work Packages: ValeVision drawing-system parity with TrueVision')
    A('')
    A('Generated 01-Oct-2026 by `parity/report/tools/k3_build.py` (catalogue modules `k3_cat_w0..w4`, `k3_cat_w56`, `k3_cat_wt`). '
      'TrueVision (lead) HEAD %s; ValeVision (target) HEAD %s. Read-only on both apps; every path below was checked against the tree '
      'snapshots or, outside them, on disk.' % (canon['tv_head'], canon['vv_head']))
    A('')
    A('Machine-readable outputs: `parity/data/wp_canonical.json` (catalogue, DAG, critical path, test ownership), '
      '`parity/data/wp_raw_map.json` (raw-id map), `parity/data/hot_file_ownership.json` (hot files).')
    A('')
    f8 = canon.get('f8_corrections')
    if f8:
        A('**Section F corrections applied (%s).** Section F of the parity report (R6) corrects this catalogue in its F.8 rows C1-C36 (C34-C36 added by the report\'s final harmonisation, H1, 01-Oct-2026); '
          '`k3_build.py` applies them through `k3_f8_corrections.py` (the ops are in `r6_corrections.py`), so this document and the JSON carry them: '
          'a changed line ends in `[F.8 Cn]`, an added target, hot file or source note carries `(F.8 Cn)`, each corrected package lists its rows in '
          '`f8_corrections`, swarm rules %s and gate G4 are amended, and W5-07 is the package C33 added. Every change, with its old and new text, is in '
          '`parity/data/wp_corrections_applied.json`; the files from before the corrections are kept as `*.pre_h2.json` (this document as '
          '`K3__WorkPackages.pre_h2.md`). Rows %s change nothing in K3.'
          % (f8['applied'], ', '.join(r for r in f8['rules_amended'] if r.startswith('R')), ' and '.join(f8['rows_with_nothing_to_apply'])))
        A('')
    A('## 1. Summary')
    A('')
    A('- **%d raw work packages** (`data/work_packages.json`) become **%d canonical packages**: %d in the ValeVision waves W0-W6 and %d in the TrueVision lane WT. '
      '%d raw ids are mapped (each to exactly one primary package), %d is dropped with a reason, and the %d raw ids the verifiers refuted or superseded (some still named in raw dependencies or K1 blocks) are mapped through their live replacements.'
      % (cov['live_raw_ids'], len(canon['packages']), vv_count, wt_count, cov['mapped'], cov['dropped'], cov['retired_aliases']))
    A('- **The dependency graph is acyclic** (topological sort of all %d packages succeeds); every wave starts after the previous wave\'s Parity Scribe pass and every scribe closes its wave.' % len(canon['packages']))
    A('- **Critical path (VV waves, by estimated lines): %s lines over %d packages**; by package count it is %d packages long. The longest stretch is W4 (%s lines).'
      % (fmt_lines(cp['by_est_lines']['est_lines']), len(cp['by_est_lines']['path']), cp['by_package_count']['packages'], fmt_lines(cp['per_wave']['W4']['est_lines'])))
    A('- **%d files are written by more than one package.** Every same-wave pair is ordered by the DAG (%d files carry a same-wave serial order); the VV devlog and ledger have one integrator, the Parity Scribe.'
      % (hot['counts']['files_with_multiple_editors'], hot['counts']['same_wave_serialised']))
    xl = [p['wp_id'] for p in canon['packages'] if p['size'] == 'XL']
    A('- **%d packages remain XL**, each with a recorded split_justification (%s): %s.'
      % (len(xl), 'atomic, small but over 15 files, or conditional and unestimated' if f8 else 'atomic, or conditional and unestimated', ', '.join(xl)))
    A('- Validation: %d errors, %d warnings (section 13).' % (len(canon['validation']['errors']), len(canon['validation']['warnings'])))
    A('')
    A('## 2. Conventions')
    A('')
    A('Paths: `TVM/` = TrueVision `02__Src__AppModules`, `TV/` = TrueVision app root, `VVM/` = ValeVision `02__Src__AppModules` (target paths, after W0-02), '
      '`VV/` = ValeVision app root, `WCP/` = Whitecardopedia, `VCB/` = ValeCodebase git root, `NAAPPS/` = NaWeb/na-apps, `NAWEB/` = NaWeb (TrueVision git root). '
      'A target marked `(new)` is created by that package.')
    A('')
    A('Size: %s' % canon['size_rule'])
    A('')
    A('**Standard gates** (every VV coding package; the JSON lists which apply per package):')
    A('')
    for g in canon['standard_gates']:
        A('- %s' % g)
    A('')
    A('**Swarm rules:**')
    A('')
    for r in canon['swarm_rules']:
        A('- %s' % r)
    A('')
    A('A package\'s `gated_by` lists every decision that changes its scope or content (provenance in the JSON). It runs on the DR default when unanswered, '
      'unless its **hard gate** says it waits.')
    A('')

    # ---------------------------------------------------------------- wave summary
    A('## 3. Wave summary')
    A('')
    A('| Wave | Theme | Packages | Est. lines | S / M / L / XL | Entry | Exit | Wave critical path (lines) |')
    A('|---|---|---|---|---|---|---|---|')
    for w in canon['waves']:
        sz = w['sizes']
        sizes = ' / '.join(str(sz.get(k, 0)) for k in ('S', 'M', 'L', 'XL'))
        entry = 'W0-01' if w['wave'] == 'W0' else ('W0-01 (lane start)' if w['wave'] == 'WT' else {'W1': 'W0-99', 'W2': 'W1-99', 'W3': 'W2-99', 'W4': 'W3-99', 'W5': 'W4-99', 'W6': 'W5-99'}[w['wave']])
        exitp = w['scribe'] or 'WT-08'
        A('| %s | %s | %d | %s%s | %s | %s | %s | %s |' % (
            w['wave'], esc(WAVE_THEME[w['wave']]), w['packages'], fmt_lines(w['est_lines']),
            (' (+%d unestimated)' % len(w['unestimated'])) if w['unestimated'] else '', sizes, entry, exitp,
            fmt_lines(w['critical_path_lines'])))
    A('')

    # ---------------------------------------------------------------- adjustments
    A('## 4. Wave design: adjustments made on the evidence')
    A('')
    A('The starting design was W0 foundations, W1 core, W2 subsystems, W3 hubs and activation, W4 documents, W5 polish, W6 close-out. These changes come from the code:')
    A('')
    A('| Adjustment | Evidence |')
    A('|---|---|')
    for a, e in ADJUSTMENTS:
        A('| %s | %s |' % (esc(a), esc(e)))
    A('')

    # ---------------------------------------------------------------- per-wave sections
    A('## 5. Catalogue by wave')
    A('')
    A('Each wave has a dependency diagram (transitive reduction; the dashed node is the previous wave\'s scribe; dashed borders are hard-gated packages) and one table. '
      'Goals, targets, adaptations, acceptance and tests in full are in `wp_canonical.json`.')
    A('')
    prev_scribe = {'W1': 'W0-99', 'W2': 'W1-99', 'W3': 'W2-99', 'W4': 'W3-99', 'W5': 'W4-99', 'W6': 'W5-99'}
    for lane in lanes:
        ps = sorted(by_wave[lane], key=lambda p: pos[p['wp_id']])
        if not ps:
            continue
        ids = {p['wp_id'] for p in ps}
        title = 'TrueVision lane (WT)' if lane == 'WT' else 'Wave %s' % lane
        A('### %s' % title)
        A('')
        A(WAVE_THEME[lane])
        A('')
        # mermaid
        A('```mermaid')
        A('flowchart TD')
        ext = set()
        edges = []
        for p in ps:
            deps = [d for d in p['depends_on']]
            for d in deps:
                redundant = any(d in anc.get(d2, set()) for d2 in deps if d2 != d)
                if redundant:
                    continue
                if d in ids:
                    edges.append((d, p['wp_id']))
                else:
                    ext.add(d)
                    edges.append((d, p['wp_id']))
        for d in sorted(ext, key=lambda x: pos[x]):
            A('    %s["%s"]:::entry' % (d.replace('-', '_'), d))
        for p in ps:
            cls = 'scribe' if p['wp_id'].endswith('-99') or p['wp_id'] == 'W6-04' else ('held' if p.get('hard_gate') else 'pkg')
            A('    %s["%s<br/>%s"]:::%s' % (p['wp_id'].replace('-', '_'), p['wp_id'], short_title(p['title']), cls))
        for a, b in edges:
            A('    %s --> %s' % (a.replace('-', '_'), b.replace('-', '_')))
        A('    classDef entry stroke-dasharray: 3 3')
        A('    classDef held stroke-dasharray: 6 4')
        A('    classDef scribe stroke-width: 3px')
        A('    classDef pkg stroke-width: 1px')
        A('```')
        A('')
        A('| ID | Package and goal | Size (est. lines) | Depends on | Gated by | Hot files | Raw sources | Risk |')
        A('|---|---|---|---|---|---|---|---|')
        for p in ps:
            raw = ', '.join(p['source_wp_ids']) or '-'
            if p['split_from']:
                raw += '; split from ' + ', '.join(p['split_from'])
            gates = ', '.join(p['gated_by']) or '-'
            if p.get('hard_gate'):
                gates += '. **Hard gate:** ' + p['hard_gate']
            hotf = ', '.join(sorted({short_path(h) for h in p['hot_files']})) or '-'
            deps = ', '.join(p['depends_on']) or '-'
            if len(p['depends_on']) > 8:
                deps = ', '.join(p['depends_on'][:6]) + ' ... (%d in all; every package of the wave)' % len(p['depends_on'])
            A('| %s | **%s** %s | %s (%s) | %s | %s | %s | %s | %s |' % (
                p['wp_id'], esc(p['title']), esc(p['goal']), p['size'], fmt_lines(p['est_lines']), deps, esc(gates), esc(hotf), esc(raw), esc(p['risk'])))
        A('')

    # ---------------------------------------------------------------- hot files
    A('## 6. Hot-file ownership')
    A('')
    A('Every file written by more than one package (vv_targets, hot_files and tv_targets together), with its editors in topological order. '
      'Across waves the wave barrier orders editors; inside a wave the stated serial order is enforced by DAG edges (checked for every pair).')
    A('')
    A('| File | Editors (in order) | Rule | DAG-checked |')
    A('|---|---|---|---|')
    for h in hot['files']:
        A('| `%s` | %s | %s | %s |' % (h['file'], ', '.join(h['editors']), esc(h['rule']), 'yes' if h['dag_verified'] else '**NO**'))
    A('')

    # ---------------------------------------------------------------- critical path
    A('## 7. Critical path')
    A('')
    A('Weighted by estimated lines over the VV waves (W0-W6), the wave barrier makes the whole-programme path the chain of each wave\'s longest path:')
    A('')
    A('| Wave | Path | Est. lines |')
    A('|---|---|---|')
    for w, v in cp['per_wave'].items():
        A('| %s | %s | %s |' % (w, ' -> '.join(v['path']), fmt_lines(v['est_lines'])))
    A('| **All** | %d packages | **%s** |' % (len(cp['by_est_lines']['path']), fmt_lines(cp['by_est_lines']['est_lines'])))
    A('')
    A('By package count the longest chain is %d packages: %s.' % (cp['by_package_count']['packages'], ' -> '.join(cp['by_package_count']['path'])))
    A('')
    A('TrueVision lane (serial, outside the barrier): %s (%s lines).' % (' -> '.join(cp['truevision_lane']['path']), fmt_lines(cp['truevision_lane']['est_lines'])))
    A('')

    # ---------------------------------------------------------------- tests
    t = canon['test_ownership']
    A('## 8. Test ownership')
    A('')
    A('TrueVision has %d files in 80__Testing__PrototypeEnvironment. Each is ported by the package that creates its VV file, kept as VV\'s own, or excluded with a reason. '
      '"Sections earlier" are packages that run named sections from a scratch copy before the file lands.' % t['tv_inventory'])
    A('')
    A('| TV test file | Status | Ported by | Sections earlier | Re-run by |')
    A('|---|---|---|---|---|')
    for name, v in sorted(t['by_test'].items()):
        A('| `%s` | %s | %s | %s | %s |' % (name, esc(v['status'] + (': ' + v['reason'] if v.get('reason') else '')),
                                          v.get('porter') or '-', ', '.join(v.get('sections_run_earlier_by') or []) or '-',
                                          ', '.join(v.get('also_run_by') or []) or '-'))
    A('')
    A('VV-only tests and verifiers created by this plan: ' + ', '.join('`%s` (%s)' % (k, ', '.join(w for w, _ in v)) for k, v in t['vv_only_new_tests'].items()) + '.')
    A('')

    # ---------------------------------------------------------------- raw map
    A('## 9. Raw-id map')
    A('')
    A('Every live raw id maps to exactly one canonical package (its primary owner); "also in" lists canonical packages that carry part of it.')
    A('')
    A('| Raw id | Raw title | Canonical | Also in |')
    A('|---|---|---|---|')
    for r, v in raw_map['map'].items():
        A('| %s | %s | %s | %s |' % (r, esc(v['raw_title']), v['canonical'] or ('**dropped**' if v['status'] == 'dropped' else '-'), ', '.join(v['split_into']) or '-'))
    A('')
    A('**Dropped:**')
    A('')
    for r, why in raw_map['dropped'].items():
        A('- %s: %s' % (r, why))
    A('')
    A('**Retired raw ids** (refuted or superseded by the verifiers, `data/raw/verify__*.json`; "Named by" shows the raw packages or K1 decisions that still name them):')
    A('')
    A('| Retired id | Replaced by | Canonical | Named by | Verifier reason |')
    A('|---|---|---|---|---|')
    for a, v in raw_map['retired_aliases'].items():
        reason = v['verifier_reason']
        if len(reason) > 220:
            reason = reason[:217].rstrip() + '...'
        named = ', '.join(v['referenced_by']) or '-'
        A('| %s | %s | %s | %s | %s |' % (a, ', '.join(v['replaced_by']), ', '.join(v['canonical']), esc(named), esc(reason)))
    A('')
    unsourced = [p['wp_id'] for p in canon['packages'] if not p['source_wp_ids'] and not p['wp_id'].endswith('-99') and p['wp_id'] != 'W6-04']
    A('Packages with no primary raw id (split parts or K3-derived): ' + ', '.join(unsourced) + '.')
    A('')

    # ---------------------------------------------------------------- crosswalk, rulings, conflicts
    A('## 10. K2 phase crosswalk')
    A('')
    A('K2 used its own phase labels; they are not K3 waves.')
    A('')
    A('| K2 label | K3 package(s) |')
    A('|---|---|')
    for a, b in K2_CROSSWALK:
        A('| %s | %s |' % (esc(a), esc(b)))
    A('')
    A('## 11. K3 rulings')
    A('')
    A('| Topic | Ruling |')
    A('|---|---|')
    for a, b in RULINGS:
        A('| %s | %s |' % (esc(a), esc(b)))
    A('')
    A('## 12. Disagreements resolved from the code')
    A('')
    A('| Disagreement | Resolution |')
    A('|---|---|')
    for a, b in CONFLICTS:
        A('| %s | %s |' % (esc(a), esc(b)))
    A('')
    A('## 13. Validation')
    A('')
    A('`python parity/report/tools/k3_build.py` checks, and fails on any breach of:')
    A('')
    for s in [
        'unique ids matching their wave; every dependency exists; no VV package depends on a later wave or on the WT lane;',
        'a topological sort of all packages (no cycle); every package of wave n depends, directly or not, on wave n-1\'s scribe, and each scribe depends on its whole wave;',
        'every live raw id is the primary source of exactly one package or dropped; every split_from id is live; every retired id referenced by raw dependencies, K1 blocks or the verifiers has a live replacement;',
        'every TV source exists in the TV tree snapshot (or on disk outside it); every VV target exists in the VV tree after the renumber stage that applies to the package, or is created by an ancestor; no file is created twice;',
        'every file edited by two packages of the same wave is ordered by the DAG; only scribes and the records packages (W0-01, W0-06) write the VV devlog and ledger; only W0-08 and W6-02 touch the shared service worker; no VV-wave package edits TrueVision and no WT package edits Vale files;',
        'every package above 2,500 estimated lines or 15 files carries a split_justification; every TV test file is ported, VV-owned or excluded.',
    ]:
        A('- ' + s)
    A('')
    A('Result: %d errors, %d warnings.' % (len(canon['validation']['errors']), len(canon['validation']['warnings'])))
    for e in canon['validation']['errors']:
        A('- ERROR: ' + e)
    for w in canon['validation']['warnings']:
        A('- WARNING: ' + w)
    A('')
    if verification:
        facts, fails = verification
        A('Independent re-check, `python parity/report/tools/k3_verify_outputs.py` (reads only the written JSON files and `data/work_packages.json`; '
          'it recomputes ownership, the topological sort, the critical path, the hot-file table and the barrier): **%s**.' % ('PASS' if not fails else 'FAIL'))
        A('')
        for f in facts:
            A('- ' + f)
        for f in fails:
            A('- FAIL: ' + f)
        A('')
    A('## 14. Open issues')
    A('')
    for o in OPEN_ISSUES:
        A('- ' + (OPEN_ISSUES_F8.get(o, o) if f8 else o))
    A('')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(L))


OPEN_ISSUES = [
    'DR-40 items 7-10 (auto-Move, Ctrl-drag copy, viewport carry, move anchor) are unanswered: W3-03 lands four K3-proposed guard constants and W3-04 is held until Adam says yes.',
    'Devlog version step: Adam\'s standing rule is patch bumps; DR-34 assumes minor releases from v2.72.0. W0-01 records the answer and the scribes follow it.',
    'K3-proposed names need Adam\'s or the naming rulebook\'s confirmation: Na__CfApi__GetProjectDisplayName, the gesture guard constants, and the VV-only tests and verifiers (Na__Test__TransportFacade__, Na__Test__LineworkModifiers__, Na__Test__RegisterNumbering__, Na__Test__AppConfigParity__, Na__Test__LoaderFacade__, Na__Test__LoaderStylesheets__, Na__Test__DrawingNotesRoute__, Na__Test__PublishedApi__, Na__Verify__ParityNaming__, Na__Verify__PortNotes__, Na__Verify__UiParity__).',
    'Packages with no raw source were added by K3 (split parts and K3-derived packages, listed in section 9); W2-38/W2-39 (parametric element types) and WT-10/WT-11 (DR-42 offers) have no raw package at all.',
    'Import closures for the inert landings were read from single-line `from \'...\'` statements at TV HEAD; a multi-line import could hide a dependency. G2 at landing is the proof.',
    'The WT lane runs only if Adam answers DR-36 with (b), package by package; until then VV carries the seams the lane would remove.',
    'K2 and K3 use different wave labels (crosswalk in section 10); K2\'s "W1" is K3\'s W0-02.',
    'Which service-worker file the deployed ValeVision site registers is not verified in this pass (the Whitecardopedia registrar global is confirmed at Registrar :378).',
    'W5-06 (site-plan data pipeline) is not estimated: it spans the SketchUp Plugins repository and the Whitecardopedia pipeline, read here only by file name; it runs only under DR-08 (A).',
    'Estimates come from TV line counts and the drift table; verbatim copies count their full length, hunk replays their diff lines.',
    'The statement fixture folder name (W4-14) follows TV\'s frozen fixture if WT-03 lands it; otherwise W4-14 names it.',
    'TrueVision has no DrawingCode leaf: WT-10 assumes TV adopts VV\'s file name and folder (51__System__LayoutEditor/07__Core__SheetData) if Adam accepts DR-42 item 4.',
    'Six packages stay XL because they are atomic (W0-02 scripted renumber, W0-15 config barrel + key map, W3-03 hub sub-wave B, W4-12 statement surface, WT-01 TV PlanDimensions split) or unestimated and conditional (W5-06); each records its reason in split_justification.',
]


def _issue(prefix):
    hits = [o for o in OPEN_ISSUES if o.startswith(prefix)]
    assert len(hits) == 1, prefix
    return hits[0]


# Section F's F.8 rows settle or change three of these issues (shown when the catalogue carries the F.8 layer, H2).
OPEN_ISSUES_F8 = {
    _issue('Devlog version step'):
        "Devlog version step: Adam's standing rule is patch bumps; DR-34 assumes minor releases from v2.72.0 (the devlog stepped "
        "v2.21.1-v2.21.21 by patches, then by minor numbers from v2.22.0). W0-01 records the answer and the scribes follow it; if Adam "
        "has not answered by W0-99, the scribe uses patch steps from v2.71.1 (R6 F.5.5). [F.8 C6]",
    _issue('Which service-worker file'):
        "Resolved in code (R6 F.8 C5): VV registers Whitecardopedia's service worker through the WCP Url constructor and registrar "
        "(VV/index.html :34, :44); the registered stub VCB/WebApps/Na__Pwa__ServiceWorker__.js imports the WCP logic file, and "
        "VCB/WebApps/live_sw.js is an unreferenced saved copy of it. The deployed GitHub Pages copy is assumed to match the repository. [F.8 C5]",
    _issue('Six packages stay XL'):
        'Seven packages stay XL: atomic (W0-02 scripted renumber, W0-15 config barrel + key map, W3-03 hub sub-wave B, W4-12 statement '
        'surface, WT-01 TV PlanDimensions split), small but over 15 files (W0-03: 60 lines in 16 files once F.8 C12 added the '
        'SectionClipping__State header) or unestimated and conditional (W5-06); each records its reason in split_justification. [F.8 C12]',
}
