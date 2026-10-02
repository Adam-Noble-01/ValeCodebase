#!/usr/bin/env python3
"""EXECUTION COPY (01-Oct-2026): identical to parity/report/tools/k2_renumber_apply.py except that the
parity audit and working-memory records at the app root are exempt from rewriting and from the git
clean-tree preflight (made by execution/tools/make_renumber_exec_copy.py).

K2 - the drawing-system renumber as ONE scripted, atomic change (WP-K2-W1).

What it does (in this order, so no target is ever occupied):
  file moves   F1 40__System__2dElevationsView/Na__RenderEffect__2dProfileLines__.js -> 05__RenderPipeline/  (D-S01-13 a)
               F2 03__AppUtils/Na__AppUtils__SnapshotHistory__.js -> Na__AppUtils__SnapshotHistory.js        (D-S02b-12R a)
               F3 05__RenderPipeline/02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__.js -> 05__RenderPipeline/ (D-S01-07 a)
               F4 42__System__DrawingViewCore/Na__DrawView__ComposerPreset__.js -> Na__DrawView__RenderPreset__.js (D-S01-06 a)
  folder moves D1 40__System__2dElevationsView -> 91__System__2dElevationsView (D-S01-13 a; --legacy 39 for S02a's option)
               D2..D7 42->40, 43->42, 44->43, 45->44, 46->45, 47->46
  text         T8 drop the PORT NOTE bullets the change makes false
               T1/T2 2dProfileLines specifiers, T3 DistanceCulling specifiers (the shared WCP SW precache line
               only with --edit-wcp-sw: K1 DR-07 keeps the shared worker out of feature packages; the stale
               entry is harmless because the precache is best-effort per URL, WCP logic :592-600),
               T4 relative specifiers INSIDE the moved files recomputed from their new folder,
               T5 SnapshotHistory file name, T6 ComposerPreset -> RenderPreset (file, exports, header),
               T7 the seven full folder names, single pass (each old name is unique, no chaining).
  History documents (ValeVision__DEVLOG__, __PARITY__TrueVisionLedger__, __PLAN__) are never rewritten.

Modes
  --mode dry-run (default)  read-only. Builds the whole change in memory, prints it, and proves no
                            retired name survives in a rewritten file. Writes nothing (unless --report).
  --mode copy --sim-dir D   copies the VV app (text + vendor + assets, never node_modules) to D/ValeVision3D
                            and applies the change THERE with plain renames. Used to prove the procedure.
  --mode git                applies in place with `git mv` (history kept) and byte-exact rewrites.
                            For the ONE swarm agent that owns the renumber package. Refuses on a dirty tree.
Byte-exact: files are read and written as bytes, so CRLF / LF / BOM stay exactly as they were.

After --mode copy or git, run (from the app root):
  node 80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs
  node 80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs
  python <this folder>/k2_path_gate.py --root <app root>
"""
import argparse, json, os, re, shutil, subprocess, sys

VV_DEFAULT = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
TV_DEFAULT = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode'
M = '02__Src__AppModules'
SCOPES = [M, '03__Style__AppStylesheets', '80__Testing__PrototypeEnvironment', '79__Testing__GenerateObjects']
SKIP_DIRS = {'node_modules', '.wrangler', '.claude', '.git', '__pycache__'}
TEXT_EXT = {'.js', '.mjs', '.cjs', '.json', '.css', '.html', '.htm', '.md', '.py', '.txt', '.jsonc', '.toml', '.webmanifest'}
HISTORY = re.compile(r'(DEVLOG|PARITY__TrueVisionLedger|__PLAN__|^Research__|^TASK__|__AUDIT__TrueVisionParity__|__WORKING_MEMORY__TrueVisionParity__)')  # EXEC COPY 01-Oct-2026: parity audit + working memory are records, never rewritten
WCP_SW_REL = os.path.join('..', 'Whitecardopedia', M, '62__Feature__AppInstallability', 'Whitecardopedia__Pwa__ServiceWorker__Logic__.js')


def build_plan(a):
    legacy_new = {'91': '91__System__2dElevationsView', '39': '39__System__2dElevationsView'}[a.legacy]
    file_moves = [('F1', M + '/40__System__2dElevationsView/Na__RenderEffect__2dProfileLines__.js',
                   M + '/05__RenderPipeline/Na__RenderEffect__2dProfileLines__.js')]
    if not a.no_snapshothistory:
        file_moves.append(('F2', M + '/03__AppUtils/Na__AppUtils__SnapshotHistory__.js', M + '/03__AppUtils/Na__AppUtils__SnapshotHistory.js'))
    if not a.no_distanceculling:
        file_moves.append(('F3', M + '/05__RenderPipeline/02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__.js',
                           M + '/05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js'))
    if not a.no_renderpreset:
        file_moves.append(('F4', M + '/42__System__DrawingViewCore/Na__DrawView__ComposerPreset__.js',
                           M + '/42__System__DrawingViewCore/Na__DrawView__RenderPreset__.js'))
    folder_moves = [
        ('D1', '40__System__2dElevationsView', legacy_new),
        ('D2', '42__System__DrawingViewCore', '40__System__DrawingViewCore'),
        ('D3', '43__System__FloorPlanViews', '42__System__FloorPlanViews'),
        ('D4', '44__System__PlanAnnotations', '43__System__PlanAnnotations'),
        ('D5', '45__System__PlanDimensions', '44__System__PlanDimensions'),
        ('D6', '46__System__ElevationViews', '45__System__ElevationViews'),
        ('D7', '47__System__NorthDirection', '46__System__NorthDirection'),
    ]
    return file_moves, folder_moves


def final_path(relp, file_moves, folder_moves):
    """Where a pre-change app-relative path ends up after every move."""
    for _, old, new in file_moves:
        if relp == old:
            relp = new
            break
    parts = relp.split('/')
    if len(parts) > 1 and parts[0] == M:
        for _, old, new in folder_moves:
            if parts[1] == old:
                parts[1] = new
                break
    return '/'.join(parts)


def iter_text_files(root):
    for sub in SCOPES:
        base = os.path.join(root, sub)
        if not os.path.isdir(base):
            continue
        for dp, dns, fns in os.walk(base):
            dns[:] = [d for d in dns if d not in SKIP_DIRS]
            for fn in fns:
                if os.path.splitext(fn)[1].lower() in TEXT_EXT:
                    full = os.path.join(dp, fn)
                    yield os.path.relpath(full, root).replace(os.sep, '/')
    for fn in os.listdir(root):
        if os.path.isfile(os.path.join(root, fn)) and os.path.splitext(fn)[1].lower() in TEXT_EXT:
            yield fn


SPEC_RE = re.compile(rb"""(?P<pre>(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+|new\s+URL\(\s*|@delegate:\s*))(?P<q>['"]?)(?P<spec>\.{1,2}/[^'"\s)]+)(?P=q)""", re.M)


def recompute_self_specifiers(data, old_rel, new_rel, file_moves, folder_moves, root):
    """T4: rewrite relative specifiers inside a file that changed folder."""
    old_dir = os.path.dirname(old_rel)
    new_dir = os.path.dirname(new_rel)
    changes = []

    def fix(m):
        spec = m.group('spec').decode('utf-8')
        target_old = os.path.normpath(os.path.join(old_dir, spec)).replace(os.sep, '/')
        if not os.path.exists(os.path.join(root, target_old)):
            return m.group(0)
        target_new = final_path(target_old, file_moves, folder_moves)
        new_spec = os.path.relpath(target_new, new_dir).replace(os.sep, '/')
        if not new_spec.startswith('.'):
            new_spec = './' + new_spec
        if new_spec == spec:
            return m.group(0)
        changes.append((spec, new_spec))
        return m.group('pre') + m.group('q') + new_spec.encode('utf-8') + m.group('q')

    out = SPEC_RE.sub(fix, data)
    return out, changes


def plan_rewrites(root, a, file_moves, folder_moves):
    legacy_new = folder_moves[0][2]
    t8 = [re.compile(rb'^[ \t]*//[ \t]*-[ \t]*Import paths follow the ValeVision folder numbers[^\r\n]*\r?\n', re.M)]
    t8r = []
    if not a.no_snapshothistory:
        t8.append(re.compile(rb'^[ \t]*//[ \t]*-[ \t]*Snapshot history imported from Na__AppUtils__SnapshotHistory__\.js[^\r\n]*\r?\n', re.M))
        # the renamed file's own bullet is its only divergence: keep the list valid
        t8r.append((re.compile(rb'(^[ \t]*//[ \t]*-[ \t]*)File name carries the ValeVision double-underscore suffix\.', re.M), rb'\1none.'))
    t1 = (re.compile(rb'40__System__2dElevationsView/Na__RenderEffect__2dProfileLines__\.js'), b'05__RenderPipeline/Na__RenderEffect__2dProfileLines__.js')
    t2 = (re.compile(rb"(?<=['\"\s])\./Na__RenderEffect__2dProfileLines__\.js"), b'../05__RenderPipeline/Na__RenderEffect__2dProfileLines__.js')
    t3 = (re.compile(rb'05__RenderPipeline/02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__\.js'), b'05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js')
    t5 = (re.compile(rb'Na__AppUtils__SnapshotHistory__\.js'), b'Na__AppUtils__SnapshotHistory.js')
    t6 = [(re.compile(rb'Na__DrawView__ComposerPreset__'), b'Na__DrawView__RenderPreset__'),
          (re.compile(rb'DRAWING VIEW CORE - COMPOSER PRESET'), b'DRAWING VIEW CORE - RENDER PRESET'),
          (re.compile(rb'(MODULE\s*:\s*Drawing View Core - )Composer Preset'), rb'\1Render Preset')]
    fmap = {old.encode(): new.encode() for _, old, new in folder_moves}
    t7 = re.compile(b'|'.join(re.escape(k) for k in fmap))
    moved_old = {old: new for _, old, new in file_moves}
    legacy_old_dir = M + '/40__System__2dElevationsView/'
    edits = {}
    stats = {'T8': 0, 'T1': 0, 'T2': 0, 'T3': 0, 'T4': 0, 'T5': 0, 'T6': 0, 'T7': 0}
    t4_log = {}
    for relp in iter_text_files(root):
        if HISTORY.search(os.path.basename(relp)) and '/' not in relp:
            continue
        if HISTORY.search(relp):
            continue
        full = os.path.join(root, relp)
        data = open(full, 'rb').read()
        new = data
        for rg in t8:
            new, n = rg.subn(b'', new)
            stats['T8'] += n
        for rg, rep in t8r:
            new, n = rg.subn(rep, new)
            stats['T8'] += n
        new, n = t1[0].subn(t1[1], new); stats['T1'] += n
        if relp.startswith(legacy_old_dir):
            new, n = t2[0].subn(t2[1], new); stats['T2'] += n
        if not a.no_distanceculling:
            new, n = t3[0].subn(t3[1], new); stats['T3'] += n
        if relp in moved_old and os.path.dirname(relp) != os.path.dirname(moved_old[relp]):
            new, ch = recompute_self_specifiers(new, relp, moved_old[relp], file_moves, folder_moves, root)
            stats['T4'] += len(ch)
            t4_log[relp] = ch
        if not a.no_snapshothistory:
            new, n = t5[0].subn(t5[1], new); stats['T5'] += n
        if not a.no_renderpreset:
            for rg, rep in t6:
                new, n = rg.subn(rep, new); stats['T6'] += n
        new, n = t7.subn(lambda m: fmap[m.group(0)], new); stats['T7'] += n
        if new != data:
            edits[relp] = (data, new)
    # the shared Whitecardopedia service worker precache list (same git repository)
    sw = os.path.normpath(os.path.join(a.wcp_base or root, WCP_SW_REL))
    sw_edit = None
    if a.edit_wcp_sw and not a.no_distanceculling and os.path.isfile(sw):
        d = open(sw, 'rb').read()
        nd, n = t3[0].subn(t3[1], d)
        if n:
            sw_edit = (sw, d, nd, n)
    return edits, stats, t4_log, sw_edit


def retired_patterns(a, folder_moves):
    pats = [old for _, old, _ in folder_moves]
    if not a.no_snapshothistory:
        pats.append('Na__AppUtils__SnapshotHistory__')
    if not a.no_renderpreset:
        pats.append('Na__DrawView__ComposerPreset')
    if not a.no_distanceculling:
        pats.append('02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__')
    pats.append('Import paths follow the ValeVision folder numbers')
    return re.compile('|'.join(re.escape(p) for p in pats).encode())


def copy_tree(src_root, dst_root):
    if os.path.exists(dst_root):
        shutil.rmtree(dst_root)
    os.makedirs(dst_root)
    for sub in SCOPES + ['04__Lib__ThirdParty__VersionLocked', '01__AppAssets__ValeVision', '51__LayoutEditor__UserScrapbookContent']:
        s = os.path.join(src_root, sub)
        if os.path.isdir(s):
            shutil.copytree(s, os.path.join(dst_root, sub), ignore=shutil.ignore_patterns(*SKIP_DIRS, '*.zip', '*.glb'))
    for fn in os.listdir(src_root):
        if os.path.isfile(os.path.join(src_root, fn)):
            shutil.copy2(os.path.join(src_root, fn), os.path.join(dst_root, fn))
    # the WCP service-worker logic file sits beside the app in the real repo
    wcp_src = os.path.normpath(os.path.join(src_root, WCP_SW_REL))
    wcp_dst = os.path.normpath(os.path.join(dst_root, WCP_SW_REL))
    if os.path.isfile(wcp_src):
        os.makedirs(os.path.dirname(wcp_dst), exist_ok=True)
        shutil.copy2(wcp_src, wcp_dst)


def git(root, *args):
    return subprocess.run(['git', '-C', root] + list(args), capture_output=True, text=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', default=VV_DEFAULT)
    ap.add_argument('--mode', default='dry-run', choices=['dry-run', 'copy', 'git'])
    ap.add_argument('--sim-dir')
    ap.add_argument('--legacy', default='91', choices=['91', '39'])
    ap.add_argument('--no-renderpreset', action='store_true')
    ap.add_argument('--no-distanceculling', action='store_true')
    ap.add_argument('--no-snapshothistory', action='store_true')
    ap.add_argument('--report')
    ap.add_argument('--edit-wcp-sw', action='store_true', help='also rewrite the shared Whitecardopedia SW precache line (DR-07 says: only with Adam\'s OK)')
    ap.add_argument('--tv-root', default=TV_DEFAULT)
    a = ap.parse_args()
    a.wcp_base = None
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    root = os.path.abspath(a.root)
    if a.mode == 'copy':
        if not a.sim_dir:
            sys.exit('--mode copy needs --sim-dir')
        sim_app = os.path.join(os.path.abspath(a.sim_dir), 'WebApps', 'ValeVision3D')
        print('copying %s -> %s (no node_modules) ...' % (root, sim_app))
        copy_tree(root, sim_app)
        root = sim_app
    file_moves, folder_moves = build_plan(a)

    # ---- preflight ------------------------------------------------------
    problems = []
    for fid, old, new in file_moves:
        if not os.path.isfile(os.path.join(root, old)):
            problems.append('%s source missing: %s' % (fid, old))
        if os.path.exists(os.path.join(root, new)):
            problems.append('%s target exists: %s' % (fid, new))
    for did, old, new in folder_moves:
        if not os.path.isdir(os.path.join(root, M, old)):
            problems.append('%s source folder missing: %s' % (did, old))
    targets_free_after = {n for _, _, n in folder_moves} - {o for _, o, _ in folder_moves}
    for t in targets_free_after:
        if os.path.exists(os.path.join(root, M, t)):
            problems.append('target folder already exists: %s' % t)
    if a.mode == 'git':
        sw_path = os.path.normpath(os.path.join(root, WCP_SW_REL))
        st = git(root, 'status', '--porcelain', '--', '.', sw_path) if a.edit_wcp_sw else git(root, 'status', '--porcelain', '--', '.')
        st.stdout = chr(10).join(l for l in st.stdout.splitlines() if '__AUDIT__TrueVisionParity__' not in l and '__WORKING_MEMORY__TrueVisionParity__' not in l)  # EXEC COPY: records ignored
        if st.stdout.strip():
            problems.append('git working tree not clean under the app root or the WCP service-worker file:\n' + st.stdout[:2000])
    if problems:
        print('PREFLIGHT FAILED'); [print('  ' + p) for p in problems]; sys.exit(2)

    # ---- plan the text change (against the pre-move tree) ------------------
    edits, stats, t4_log, sw_edit = plan_rewrites(root, a, file_moves, folder_moves)
    retired = retired_patterns(a, folder_moves)
    leftovers = []
    for relp, (old, new) in edits.items():
        for i, ln in enumerate(new.split(b'\n'), 1):
            if retired.search(ln):
                leftovers.append('%s:%d %s' % (relp, i, ln.strip()[:120].decode('utf-8', 'replace')))
    # files that were never edited but still hold a retired name (should be none)
    for relp in iter_text_files(root):
        if relp in edits or HISTORY.search(relp):
            continue
        d = open(os.path.join(root, relp), 'rb').read()
        if retired.search(d):
            leftovers.append('%s (unedited)' % relp)

    print('PLAN  legacy -> %s ; RenderPreset=%s DistanceCulling=%s SnapshotHistory=%s' % (
        folder_moves[0][2], not a.no_renderpreset, not a.no_distanceculling, not a.no_snapshothistory))
    for fid, old, new in file_moves:
        print('  %s  %s  ->  %s' % (fid, old, new))
    for did, old, new in folder_moves:
        print('  %s  %s/%s/  ->  %s/%s/' % (did, M, old, M, new))
    inside = [p for p in edits if re.match(M + r'/(40|42|43|44|45|46|47)__', p)]
    print('TEXT  %d files rewritten (%d inside the moved folders, %d outside), replacements %s' % (
        len(edits), len(inside), len(edits) - len(inside), stats))
    for relp, ch in t4_log.items():
        print('  T4 %s: %s' % (relp, ch))
    if sw_edit:
        print('  WCP service worker precache: %s (%d line)' % (sw_edit[0], sw_edit[3]))
    print('RETIRED NAMES LEFT IN NON-HISTORY FILES AFTER THE CHANGE: %d' % len(leftovers))
    for l in leftovers[:40]:
        print('  ' + l)

    report = {'root': root, 'mode': a.mode, 'file_moves': file_moves, 'folder_moves': folder_moves,
              'stats': stats, 'files_rewritten': sorted(edits), 't4': t4_log,
              'wcp_sw': sw_edit[0] if sw_edit else None, 'leftovers': leftovers}

    if a.mode == 'dry-run':
        if a.report:
            json.dump(report, open(a.report, 'w', encoding='utf-8'), indent=1)
        print('DRY RUN - nothing written to the app.')
        sys.exit(0 if not leftovers else 1)

    # ---- apply: text first (paths are still the old ones), then moves --------
    for relp, (old, new) in edits.items():
        with open(os.path.join(root, relp), 'wb') as f:
            f.write(new)
    if sw_edit:
        with open(sw_edit[0], 'wb') as f:
            f.write(sw_edit[2])
    for fid, old, new in file_moves:
        if a.mode == 'git':
            r = git(root, 'mv', old, new)
            if r.returncode:
                sys.exit('git mv failed for %s: %s' % (fid, r.stderr))
        else:
            os.rename(os.path.join(root, old), os.path.join(root, new))
    for did, old, new in folder_moves:
        src, dst = M + '/' + old, M + '/' + new
        if a.mode == 'git':
            r = git(root, 'mv', src, dst)
            if r.returncode:
                sys.exit('git mv failed for %s: %s' % (did, r.stderr))
        else:
            os.rename(os.path.join(root, src), os.path.join(root, dst))

    # ---- post: pairing with TrueVision by identical relative path ----------
    pair = {}
    for tvf in ['40__System__DrawingViewCore', '42__System__FloorPlanViews', '43__System__PlanAnnotations',
                '44__System__PlanDimensions', '45__System__ElevationViews', '46__System__NorthDirection']:
        vdir = os.path.join(root, M, tvf)
        tdir = os.path.join(a.tv_root, M, tvf)
        vset = set(os.listdir(vdir)) if os.path.isdir(vdir) else set()
        tset = set(os.listdir(tdir)) if os.path.isdir(tdir) else set()
        pair[tvf] = {'paired': len(vset & tset), 'vv_only': sorted(vset - tset), 'tv_only': sorted(tset - vset)}
    tot = sum(v['paired'] for v in pair.values())
    print('PAIRING with TrueVision by identical path: %d shared drawing files' % tot)
    for k, v in pair.items():
        print('  %-30s paired %2d  vv-only %s  tv-only %s' % (k, v['paired'], v['vv_only'], v['tv_only']))
    report['pairing'] = pair
    if a.report:
        json.dump(report, open(a.report, 'w', encoding='utf-8'), indent=1)
    print('APPLIED (%s). Now run the two Verify harnesses and k2_path_gate.py against %s' % (a.mode, root))


if __name__ == '__main__':
    main()
