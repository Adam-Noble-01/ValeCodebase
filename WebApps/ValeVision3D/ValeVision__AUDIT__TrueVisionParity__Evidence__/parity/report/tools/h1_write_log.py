# -*- coding: utf-8 -*-
"""H1 - write parity/report/HARMONISATION_LOG.md from the edit record (h1work/h1_edit_record.json), the diffs of every
changed file against the pre-H1 snapshot (h1work/pre_h1/) and the last validator run (h1work/second_run.txt)."""
import difflib
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
REP = os.path.dirname(HERE)
PAR = os.path.dirname(REP)
H1 = os.path.join(PAR, 'h1work')
PRE = os.path.join(H1, 'pre_h1')
OUT = os.path.join(REP, 'HARMONISATION_LOG.md')

rec = json.load(open(os.path.join(H1, 'h1_edit_record.json'), encoding='utf-8'))
run = open(os.path.join(H1, 'second_run.txt'), encoding='utf-8', errors='replace').read()

GEN_OF = {
    'report/tools/r6_corrections.py': 'wp_canonical.json, K3__WorkPackages.md, wp_corrections_applied.json (k3_build.py, h2_record_corrections.py) and R6 F.3/F.8 (r6_build_sectionF.py)',
    'report/tools/k3_f8_corrections.py': 'wp_canonical.json f8_corrections block (k3_build.py)',
    'report/tools/k3_report_md.py': 'K3__WorkPackages.md (k3_build.py)',
    'report/tools/h2_record_corrections.py': 'data/wp_corrections_applied.json',
    'report/tools/h2_validate.py': '(validator only)',
    'report/tools/h2_diff_r6.py': '(validator only)',
    'report/tools/critic/ids_check.py': '(validator only)',
    'report/tools/r6_prose.py': 'R6__F_SwarmDelegationPlan.md (r6_build_sectionF.py)',
    'report/tools/r6_build_sectionF.py': 'R6__F_SwarmDelegationPlan.md',
    'report/tools/k1_register_content.py': 'decision_register.json, K1__DecisionRegister.md (k1_build_register.py)',
    'report/tools/k2_build_maps.py': 'target_folder_map.json, file_rename_map.json, K2__TargetMaps.md tables, k2work/k2_tables.json',
    'report/tools/r0_source.md': 'R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)',
    'report/tools/r0_build_decisions.py': 'R0 decision tables and notes (r0_assemble.py)',
    'report/tools/r2b_render.py': 'R2__B_ModuleNaming_Divergence.md',
    'report/tools/R5_template.md': 'R5__E_ParityMatrix_Watermark_Inventory.md (r5_assemble.py)',
    'report/tools/r5_inventory.py': 'r5work/frag_E3_inventory.md, tv_only_inventory.json -> R5 E.3',
    'report/tools/r5_assemble.py': 'R5__E_ParityMatrix_Watermark_Inventory.md',
}


def fence(s):
    s = s.rstrip('\n')
    return '~~~~text\n' + s + '\n~~~~'


def changed_lines(a, b):
    al = open(a, encoding='utf-8').read().split('\n')
    bl = open(b, encoding='utf-8').read().split('\n')
    n = 0
    for l in difflib.unified_diff(al, bl, lineterm='', n=0):
        if (l.startswith('+') or l.startswith('-')) and not l.startswith('+++') and not l.startswith('---'):
            n += 1
    return n


L = []
A = L.append
A('# Harmonisation log - H1, final cross-section harmonisation (01-Oct-2026)')
A('')
A('Scope: the cross-section follow-ups 1-8 left by the section revisers and the sweep (a)-(i) over R0-R6 and the K documents. '
  'Read-only on both apps, NAAPPS and WCP (TV read at b2aa9151, VV at 7b4e593a; every code fact below was re-opened on '
  '01-Oct-2026). Every write is inside `parity/`.')
A('')
A('## How the changes were made')
A('')
A('- **Generated files were changed only through their generators or inputs**, then rebuilt: K1 (`k1_build_register.py`), K2 '
  '(`k2_build_maps.py`), K3 and its F.8 layer (`k3_build.py` -> `k3_f8_corrections.py` -> ops in `r6_corrections.py`), the '
  'F.8 record (`h2_record_corrections.py`), R0 (`r0_assemble.py`), R2 (`r2b_render.py`), R5 (`r5_inventory.py`, '
  '`r5_assemble.py`) and R6 (`r6_build_sectionF.py`). R1, R3, R4, `K2__NamingRulebook.md` and the prose of '
  '`K2__TargetMaps.md` (outside its `BEGIN:K2`/`END:K2` tables) are hand-maintained and were patched directly.')
A('- **One script does it all, re-runnably:** `parity/report/tools/h1_harmonise.py` applies every edit (definitions in '
  '`h1_edits_tools.py`, `h1_edits_gen.py`, `h1_edits_docs.py`; exact-snippet patcher `h1_patchlib.py`, which keeps each '
  'file\'s line ending and refuses an edit whose old text is gone), rebuilds the generated files in dependency order '
  '(K1 -> K2 -> K3 -> F.8 record -> R6 -> R2 -> R5 -> R0) and runs every validator. A second run changes nothing (md5 of '
  'every report, data and fragment file identical; `h1work/md5_a.txt`, `md5_b.txt`). If `r0_revise.py` is ever re-run it '
  'restores `r0_source.md` from `r0_revise_base/`; run `h1_harmonise.py` after it.')
A('- **Before-images:** every file H1 touched was copied first to `parity/h1work/pre_h1/` (reports, data, tools, R5 '
  'fragments); per-file diffs of the final state are in `parity/h1work/diffs/`. This log is written by '
  '`h1_write_log.py` from `parity/h1work/h1_edit_record.json`.')
A('- **A defect found and fixed during the work:** the first version of `h1_patchlib.py` re-applied insertion edits whose new '
  'text contains their anchor (old text), which duplicated six inserts on a second run. The run was discarded: every touched '
  'file was restored byte for byte from `h1work/pre_h1/` (0 differences on check), the patcher now tests for the new text '
  'first, and the pipeline was run once from the restored baseline. H2\'s mark check (`h2_validate.py` check O) also caught '
  'that a C35 note citing "(F.8 C31)" in brackets read as a change mark; the note now says "which F.8 C31 set".')
A('')
A('## Follow-ups 1-8: disposition')
A('')
A('| # | Follow-up | Done | Where (edits below) |')
A('|---|---|---|---|')
rows8 = [
    ('1', 'R0 -> R6: F.8 row replacing W0-06 acceptance item 1 with the R0.2.9 text',
     'New F.8 row **C34** (two ops on W0-06 acceptance item 1: the watermark clause takes R0.2.9\'s exact text, with the path given from `parity/`; DIV-3 listed closed). H2 had not applied it (item 1 still read "55/6/14/83/6/7/4/2 as S11 B3"). R0.1.1, R0.2.9 note and the DIV-3 row now say it is applied.',
     'r6_corrections.py C34; r0_source.md; r0_build_decisions.py'),
    ('2', 'R0 -> R3: C.6 service worker; C.4 R0 column',
     'C.6 row now "Resolved in code (R0 P10; R6 F.8 C5; K3 section 14)" with the one live check left. C.4 R0 column: S10 PD-20, S13 PD-21, S17 PD-22, S18 PD-23, S19 PD-24, S23 PD-25 as asked; checked every row against R0.3\'s seam list and also aligned S7 (R0.3.6 Layout Mode), S11 (PD-03, PD-12), S14 (R0.3.6 Snapping), S16 (PD-12, PD-20), S20 (PD-02, DIV-2). h1_check M proves the 23 rows equal R0.3\'s list.',
     'R3 edits'),
    ('3', 'R0 -> R6/K3: the "TrueVision 3D Project Hub"',
     'Governing DR-43 (Hub option "exclude it from VV\'s DEFINITIONS via config", default "Hub excluded"): the module lands inert at TV\'s path, is never rendered, and is G4\'s one named exception. R6 P15 and K2 V2 rewritten to say so; R0 PD-15 corrected where it credited DR-43 with an option it does not list; R2 B.3.7/B.0 #7/B.5 #3 marked settled. K3 W0-04 already carried the named exception in vv_adaptations[1] and acceptance[1] and gate G4 (H2 applied F.8 C13) - verified, no further K3 change.',
     'r6_prose.py P15; K2 rulebook V2; r0_source.md PD-15; r2b_render.py'),
    ('4', 'R4 -> K2: 62 -> 92',
     'Governing DR-03 (recommendation "keep 62 for now", default "62 unchanged") and K3 W6-03 ("only if D-S01-08 (a)"): TF-T32 is now action **keep** (target 62, phase "W3 (only on request; K3 W6-03)"), FR-22 stays the optional move with the same phase, the collision table says "kept (DR-03 default)" and keeps 92 reserved; K2 headline, registry, section 10 and rulebook N3/ruling 8 reworded; R0 PD-17 and R1 A.2.7 aligned. R1, R2, R4, R5, R6 and K3 already said "only on request".',
     'k2_build_maps.py; K2 docs; r0_source.md; R1'),
    ('5', 'R6 -> R1/R2: W0-01 commit before W0-02; G4 exemption wording',
     'R1 A.3.2 Step 0 #1 now requires Adam\'s W0-01 PLAN commit in HEAD (the Wave 0 deadlock, F.8 C10); #2, Step 4, A.3.3 and A.4 #6/#8 aligned with R6 F.5.2 and K3 R11. The G4 exemption (whole PORT NOTE block, history documents incl. `__NOTES__`, the named TrueVisionHub file, baseline allow-list WARN) now reads the same in R1 (A.3.4 risk 2), R2 (B.1, B.3.1), R6 (F.5.1, P7, RK-11), R0 (PD-12) and the K2 rulebook (gate 3).',
     'R1; r2b_render.py; r0_source.md; K2 rulebook'),
    ('6', 'R5 -> R6: README owners',
     'Confirmed in wp_canonical.json: `README__PublishedDocuments__.md` is a W4-17 target and edit (F.8 C30), `README__SpellCheck__.md` a W2-34 target and edit. R5 E.3 said the first had no package and `r5_assemble.py` failed its own assertion after H2; template, inventory owner and assertion fixed; E.3 row now "W4-17".',
     'R5_template.md; r5_inventory.py; r5_assemble.py'),
    ('7', 'critic ids_check.py',
     'Read `dr_id` (it read `id`, so its DR set was {None} and it flagged every DR in every section, run shown below); skips `*.pre_*` backups. Run: every section "bad []" for packages, DRs, TFs and FRs.',
     'critic/ids_check.py'),
    ('8', 'Open issues from the writers',
     'R3: W2-34 probe settled by C28 (and W0-19\'s statement test server by new **C36**); W4-17 localhost URL settled by C30; W0-09 restart line by C16 - R3 C.5/C.6, R0 PD-23 updated. R2: SectionClipping header (C12) and 41 README (C14) settled - R0 DIV-2/PD-02, R1, R2, R5 updated. R1: the 63 branch is R0 Q-63 and the registry gap Q-REG - both already in R0, now cited in R1 and named in the gated packages (new **C35**). R4: the "immediate" seam is settled by C22 (R0 Q-COVER part 2 marked settled), the cold document-tab cover wording is Q-COVER part 1 (Adam\'s), W1-34\'s acceptance settled by C23 (R4 D.5 #2 also gains the re-render call site, TV TabStrip :370). R5: v2.92.0 is outside the alignment by DR-44, and the twelve TV-only 3D-tab files (07, 11, 15 x2, 21, 26 x6, 70) are out of scope by R0\'s scope rule - explicit in R0.0 and R5 E.2.5. No new Q-xx was needed.',
     'r6_corrections.py C35, C36; R3; r0_source.md; R4; R5_template.md'),
]
for r in rows8:
    A('| %s | %s | %s | %s |' % r)
A('')
A('## Sweep (a)-(i): result')
A('')
A('| | Fact | Result |')
A('|---|---|---|')
sweep = [
    ('a', 'Release watermark and class tallies', 'One tally everywhere: 51 ported / 11 partial / 17 pending / 80 never considered / 4 reopened / 2 deliberate / 7 not drawing / 4 VV-origin / 1 n/a, 112 open (recount of `release_rows_final.json`). W0-06 (JSON, R6 F.3) now carries it (C34). K1 DR-01 said "17 are parked" of the 88 later releases; 7 of the 88 are (17 over all 177 rows) - corrected.'),
    ('b', 'Folder renumber targets and timing', '42-47 -> 40, 42-46 and legacy 40 -> 91 in W0-02 (K2 "W1") everywhere; 62 stays and moves to 92 only on request (W6-03) everywhere, K2 JSON included. K2 top-level renumber count is now 7, matching "seven folder moves".'),
    ('c', 'Hub and other NA content', 'Hub: inert, never rendered, one G4 exception (R0 PD-15, R2 B.3.7, R6 P15, K2 V2, K3 W0-04/W4-12/G4). Other NA content (QR/Portal, letterheads, NA scan, site-plan furniture and OS licence, PDF.js path, T01-T04) reviewed in R0 PD-15/R0.3.4, R2, R3 S2, R4 D.3 and W4-xx: consistent, no change.'),
    ('d', 'Service-worker question', 'Resolved in code, one live check at the W0 deploy: R0 P10, R1 A.4 #11, R3 C.6, R6 F.8 C5, K3 section 14 and now K2 sections 9 and 12 (which also cited :157 for the token; the token is :68).'),
    ('e', 'positionMm sign', 'Code re-read: VV builds a plan cut through normal (0,-1,0) x (-h) (`SectionAdapter__.js:298-300`, `:243`), so constant = +h (`SystemLogic.js:567`), and saves -constant = -h (`:1502`); TV holds constant = +h (`Engine__.js:132-134`, `:360-367`) and saves +constant (`Serialize__.js:194`). R0 DIV-2, R3 S4/C.5, R6 WT-02 and K1 DR-41 all say VV -h, TV +h, TV\'s comment wrong (TD06 = VV). Only K1\'s evidence line range was off by one (:292-299/:297-299 -> :292-300/:297-300).'),
    ('f', 'Transport facade and local-server probe', 'Facade per DR-27 (A) consistent in R3, R6 P11, K1. Probe per DR-28 (A) (`/api/health`, service `whitecardopedia-local-dev`): W2-34 fixed by C28; W0-19\'s adapted statement test server still answered only `/api/check-localhost` - fixed by C36 (TV\'s test answers `/api/health`, :25-26, :133-135).'),
    ('g', 'Identical-experience caveat', 'R0 executive summary and R0.1.8 (13 differences, E1-E13; four tabs while DR-10 is off) unchanged; R4 D.5 #8 now points to R0.1.8; R6 had no caveat - its headline now states it.'),
    ('h', 'NA job phases', 'JSON: T01-T04 appear only inside "never NA\'s T01-T04" / "no T01-T04" (C21). Text: the Vale example `2026/3047__Doous_T01_D01` in R0 PD-20, R3 S10 and K1 DR-11 became `2026/3047__Doous_D01` (the DR-11 default form). Left verbatim: the title of finding S07a-V01 in K1\'s raw-id index (evidence) and the old texts quoted in the F.8 C21/C34 audit rows.'),
    ('i', 'Ids and Q-xx', 'critic `ids_check.py` (fixed) and `h1_check.py` check I: every DR, package, TF, FR, F.8 row (C1-C36) and Q id cited in R0-R6, K1-K3 and the K JSON exists. Check Q: every Q-xx is named in each package of its Gates column (C35), and R6 F.5.2, the F.6 template and the F.6.1 brief cite them.'),
    ('+', 'H2-derived figures (not in (a)-(i) but stale after H2)', 'R0: 165 packages (153 VV, 154,649 lines), 93 hot files (ModeController 20, AppConfig 17, Loader 16), 24 hard gates (W5-07), critical path 65,429 over 53 (56 by count), W5 chain W5-01 -> W5-05 -> W5-07 -> W5-99 (1,570), DR-01 gates 122 in W1-W6, the R0.2.7 note (C1 applied), E2 and R0.3.6 (W5-07 retires the switch). R3 DAG note (165), R4 D.1.5 case 8. R0\'s decision tables were regenerated from the H2 JSON (DR-01 124, DR-22 10, DR-25 8 with hard gate W5-07). R6 F.5.5 and F.8 C6 said twelve `.1` fixes after v2.22.0; the devlog has thirteen (R0 already said 13).'),
]
for s in sweep:
    A('| %s | %s | %s |' % s)
A('')
A('## Reviewed and left unchanged')
A('')
for s in [
    'K3 W0-04 acceptance and G4: the named TrueVisionHub exception was already applied by H2 (F.8 C13); no new edit (follow-up 3).',
    'K3 W0-03 acceptance item 3 ("PORT NOTE \'Ported from\' lines excepted"): W0-03\'s own grep for a `[TrueVision3D` prefix or `TRUEVISION3D` banner, run before G4 exists; after W0-03\'s two fixes no such hit sits anywhere else in a PORT NOTE block (F.8 C13\'s grep), so it holds as written and is not the G4 exemption.',
    'R6 F.8 rows C8 and C13 keep their original findings (65,179; "exempts only PORT NOTE \'Ported from\' lines") as the audit trail; their status lines already give the corrected state.',
    'K1 raw-id index row S07a-V01 keeps the finding\'s verbatim title ("prints 2026/3047__Doous_T01_D01").',
    'R0 executive summary\'s end-state paragraph (thirteen ways) and R0.1.8 E1-E13: consistent with R4 and the JSON; no change.',
    'R1 A.3.1 history-document list (devlog, ledger, `__PLAN__`, `Research__`, `TASK__`) describes `k2_renumber_apply.py`\'s own skip pattern (`HISTORY` regex, :42), not G4; correct as written.',
    'h2_diff_r6.py now classifies H2\'s diff against the R6 H2 wrote (the pre-H1 snapshot, byte-identical); its own rule ("F.8 rows unchanged") is H2\'s, not H1\'s.',
]:
    A('- ' + s)
A('')
A('## Validation (final run, `h1work/second_run.txt`)')
A('')
A('~~~~text')
for line in run.split('\n'):
    if re.match(r'^\s{2}\S+\.py\s+exit', line) or line.startswith('validators failing'):
        A(line.rstrip())
A('~~~~')
A('')
A('`h1_check.py` (H1\'s own checks, read-only; re-reads the code for (e)):')
A('')
A('~~~~text')
import subprocess, sys  # noqa: E402
hc = subprocess.run([sys.executable, os.path.join(HERE, 'h1_check.py')], capture_output=True, text=True, cwd=HERE,
                    encoding='utf-8', errors='replace').stdout
for line in hc.split('\n'):
    if line.strip():
        A(line.rstrip())
A('~~~~')
A('')
A('The critic helper before the fix (pre-H1 copy, same data): `165 1 113 25` - one DR id, `None` - and every section listed '
  'DR-01 ... DR-44 as bad. After: `165 44 113 25` and every section `bad []`.')
A('')
A('## Files changed')
A('')
A('| File | Kind | Changed lines vs pre-H1 |')
A('|---|---|---|')
pairs = []
for sub, kind in (('report', 'section / K doc'), ('data', 'canonical data')):
    for f in sorted(os.listdir(os.path.join(PRE, sub))):
        a = os.path.join(PRE, sub, f)
        b = os.path.join(REP if sub == 'report' else os.path.join(PAR, 'data'), f)
        if not os.path.exists(b) or f.startswith('k2work__'):
            continue
        if open(a, 'rb').read() != open(b, 'rb').read():
            pairs.append(('%s/%s' % ('report' if sub == 'report' else 'data', f), kind, changed_lines(a, b)))
for p in pairs:
    A('| `%s` | %s | %d |' % p)
for f in ('frag_E3_inventory.md', 'tv_only_inventory.json'):
    A('| `report/tools/r5work/%s` | R5 fragment (generated) | %d |' % (f, changed_lines(os.path.join(PRE, 'r5work', f), os.path.join(HERE, 'r5work', f))))
A('| `k2work/k2_tables.json` | K2 tables (generated) | - |')
A('| `report/R6__F_SwarmDelegationPlan.pre_h1.md` | new: the R6 H2 wrote, kept (like `*.pre_h2.md`) for `h2_diff_r6.py` | - |')
A('| `report/tools/h1_*.py` | new: H1 scripts (patcher, edits, runner, checks, this log) | - |')
A('')
A('## Changes in the generated outputs (rebuilt; before -> after)')
A('')
A('These follow from the edits listed after this section; nothing here was hand-edited. Lines are cut at 500 characters; '
  'the full unified diffs are in `parity/h1work/diffs/`.')
A('')
GENERATED_MD = ['R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md', 'R2__B_ModuleNaming_Divergence.md',
                'R5__E_ParityMatrix_Watermark_Inventory.md', 'R6__F_SwarmDelegationPlan.md', 'K1__DecisionRegister.md',
                'K3__WorkPackages.md', 'K2__TargetMaps.md']
for f in GENERATED_MD:
    a, b = os.path.join(PRE, 'report', f), os.path.join(REP, f)
    al, bl = open(a, encoding='utf-8').read().split('\n'), open(b, encoding='utf-8').read().split('\n')
    A('### `report/%s`%s' % (f, ' (generated tables only; its prose is in the edits below)' if f.startswith('K2') else ''))
    A('')
    A('~~~~diff')
    for l in difflib.unified_diff(al, bl, lineterm='', n=0):
        if l.startswith('@@'):
            A(l)
        elif (l.startswith('+') or l.startswith('-')) and not l.startswith('+++') and not l.startswith('---'):
            A(l[:500] + (' [...]' if len(l) > 500 else ''))
    A('~~~~')
    A('')
A('### `data/wp_canonical.json` (F.8 rows C34-C36 as `k3_build.py` applied them; from `data/wp_corrections_applied.json`)')
A('')
W = json.load(open(os.path.join(PAR, 'data', 'wp_corrections_applied.json'), encoding='utf-8'))
A('| Row | Package | Field | Before | After |')
A('|---|---|---|---|---|')
for cid in ('C34', 'C35', 'C36'):
    for pkg, fields in W['applied'].get(cid, {}).items():
        for fld, v in fields.items():
            cut = lambda s: ('-' if s is None else str(s)).replace('|', '/').replace('\n', ' ')[:400]
            A('| %s | %s | `%s` | %s | %s |' % (cid, pkg, fld, cut(v.get('old')), cut(v.get('new'))))
A('')
A('Also in `wp_canonical.json`: each corrected package lists its new rows in `f8_corrections` (W0-01, W0-04, W0-06, W0-09, W0-16, '
  'W0-19, W1-10, W1-33, W2-05, W6-03), and the `f8_corrections` block reads "F.8 rows C1-C36" with C34-C36 in `rows_applied`. '
  'No dependency, gate, size, estimate, hot file or target changed: `hot_file_ownership.json` and `wp_raw_map.json` are '
  'byte-identical to their pre-H1 copies, and the critical path, waves and topological order are unchanged. '
  '`wp_corrections_applied.json` now holds rows C1-C36 (84 ops, 30 packages corrected, nothing unattributed).')
A('')
TFp = {t['id']: t for t in json.load(open(os.path.join(PRE, 'data', 'target_folder_map.json'), encoding='utf-8'))}
TFn = {t['id']: t for t in json.load(open(os.path.join(PAR, 'data', 'target_folder_map.json'), encoding='utf-8'))}
FRp = {t['id']: t for t in json.load(open(os.path.join(PRE, 'data', 'file_rename_map.json'), encoding='utf-8'))}
FRn = {t['id']: t for t in json.load(open(os.path.join(PAR, 'data', 'file_rename_map.json'), encoding='utf-8'))}
DRp = {t['dr_id']: t for t in json.load(open(os.path.join(PRE, 'data', 'decision_register.json'), encoding='utf-8'))}
DRn = {t['dr_id']: t for t in json.load(open(os.path.join(PAR, 'data', 'decision_register.json'), encoding='utf-8'))}
A('### `data/target_folder_map.json`, `data/file_rename_map.json`, `data/decision_register.json` (changed fields)')
A('')
A('| File | Row | Field | Before | After |')
A('|---|---|---|---|---|')
for name, old, new in (('target_folder_map.json', TFp, TFn), ('file_rename_map.json', FRp, FRn), ('decision_register.json', DRp, DRn)):
    for k in new:
        for fld in new[k]:
            if old[k].get(fld) != new[k].get(fld):
                a, b = json.dumps(old[k].get(fld), ensure_ascii=False), json.dumps(new[k].get(fld), ensure_ascii=False)
                sm = difflib.SequenceMatcher(None, a, b)
                i1 = min(op[1] for op in sm.get_opcodes() if op[0] != 'equal')
                j1 = min(op[3] for op in sm.get_opcodes() if op[0] != 'equal')
                ca = a[max(0, i1 - 80):i1 + 320].replace('|', '/')
                cb = b[max(0, j1 - 80):j1 + 320].replace('|', '/')
                A('| %s | %s | `%s` | ...%s... | ...%s... |' % (name, k, fld, ca, cb))
A('')
A('## Every edit (file, location, before -> after, reason, evidence)')
A('')
A('Edits to a generator or its input are marked with the output they feed; those outputs were rebuilt, never hand-edited.')
A('')
n = 0
for r in rec:
    n += 1
    feeds = GEN_OF.get(r['file'])
    A('### %d. `%s` - %s' % (n, r['file'], r['where']))
    A('')
    if feeds:
        A('- **Feeds:** %s' % feeds)
    A('- **Reason:** %s' % r['reason'])
    if r['evidence']:
        A('- **Evidence:** %s' % r['evidence'])
    A('- **Before:**')
    A('')
    A(fence(r['old']))
    A('')
    A('- **After:**')
    A('')
    A(fence(r['new']))
    A('')
open(OUT, 'w', encoding='utf-8', newline='\n').write('\n'.join(L).rstrip() + '\n')
print('wrote', OUT, n, 'edits')
