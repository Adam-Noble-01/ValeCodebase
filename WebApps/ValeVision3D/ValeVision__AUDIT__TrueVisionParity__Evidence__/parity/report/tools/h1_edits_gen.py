# -*- coding: utf-8 -*-
"""H1 - edits to the inputs of the K1, K2, R0, R2 and R5 generators (rebuilt by h1_harmonise.py)."""
from h1_patchlib import Edit

T = 'report/tools/'

# =====================================================================================================
# K1 (k1_register_content.py -> decision_register.json, K1__DecisionRegister.md)
# =====================================================================================================
K1 = [
    Edit(T + 'k1_register_content.py', 'DR-01 question: the parked count',
         "most close with 'NOT tried by Adam; NOT in ValeVision', 17 are parked 'on Adam's sign-off' in the TV devlog or ledger ",
         "most close with 'NOT tried by Adam; NOT in ValeVision', 7 of them are parked 'on Adam's sign-off' (17 release rows in all, older ones included) in the TV devlog or ledger ",
         'Sweep (a): K1 put "17 are parked" against the 88 later releases; of those 88 only 7 are PENDING-SIGNOFF, 17 is the '
         'count over all 177 rows (R0.1.2, R5 E.1.1).',
         'release_rows_final.json: rows from v2.86.0 = 88 (NOT-CONSIDERED 77, PENDING-SIGNOFF 7, NOT-DRAWING 2, VV-ORIGIN 1, '
         'DELIBERATE 1); PENDING-SIGNOFF over 177 rows = 17'),
    Edit(T + 'k1_register_content.py', 'DR-11 recommendation: no NA phase in the Vale example',
         "\"'2026/3047__Doous_T01_D01' (S07a-V01); GetProjectCode() stays the transport token.",
         "\"'2026/3047__Doous_D01', a folder path inside a document name (S07a-V01); GetProjectCode() stays the transport token.",
         'Sweep (h): the Vale example printed NA job phase T01; under the DR-11 default ({project}_{drawing}) the raw token '
         'prints 2026/3047__Doous_D01, which still shows the defect (a "/" inside a document name).', 'DR-11 default; F.8 C21'),
    Edit(T + 'k1_register_content.py', 'DR-41 evidence: adapter lines',
         "VVM/42__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js:297-299 builds a plan cut",
         "VVM/42__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js:297-300 builds a plan cut",
         'Sweep (e): the -cutHeightMm argument is on line 300 (function :298, normal :299).',
         'VV 42/Na__DrawView__SectionAdapter__.js:298-300 read 01-Oct-2026'),
    Edit(T + 'k1_register_content.py', 'DR-41 verified evidence: adapter lines',
         "\"VVM/42__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js:292-299\",",
         "\"VVM/42__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js:292-300\",",
         'Sweep (e): same line range fix.', 'as above'),
]

# =====================================================================================================
# K2 (k2_build_maps.py -> target_folder_map.json, file_rename_map.json, K2__TargetMaps.md tables)
# =====================================================================================================
K2GEN = [
    Edit(T + 'k2_build_maps.py', 'TF-T32 spec: keep 62 (DR-03)',
         "'62__Feature__EmailWorkers': ('renumber', 'collision_deferred', 'VV-only, but 62 is TV\\'s (and WCP\\'s) 62__Feature__AppInstallability. Nothing ports across the number (VV uses WCP\\'s PWA, never TV 62), so the collision is nominal: record it now, move to 92__Feature__EmailWorkers in W3 only after its 1,857 tracked node_modules files are untracked (1,877 tracked files in the folder; BUILD__Deploy__EmailWorker.bat.lnk holds an absolute path Adam must re-point).',",
         "'62__Feature__EmailWorkers': ('keep', 'collision_deferred', 'VV-only, but 62 is TV\\'s (and WCP\\'s) 62__Feature__AppInstallability. Nothing ports across the number (VV uses WCP\\'s PWA, never TV 62), so the collision is nominal: record it and keep 62 (DR-03: recommendation \"keep 62 for now\", default \"62 unchanged\"). The move to 92__Feature__EmailWorkers (FR-22) runs only if Adam asks (D-S01-08 (a); K3 W6-03), and only after its 1,857 tracked node_modules files are untracked (1,877 tracked files in the folder; BUILD__Deploy__EmailWorker.bat.lnk holds an absolute path Adam must re-point).',",
         'Item 4 / sweep (b): TF-T32 said action renumber (62 -> 92, "W3 (deferred)") while DR-03 keeps 62 (recommendation '
         '"keep 62 for now", default "62 unchanged") and K3 W6-03, R0, R1, R2, R4, R5 and R6 move it only on request.',
         'DR-03 recommendation/default_if_unanswered; D-S01-08 "(b) now and (a) later"; K3 W6-03 goal and hard_gate'),
    Edit(T + 'k2_build_maps.py', 'TF-T32 target: stays 62',
         "        if folder == '62__Feature__EmailWorkers':\n            target = M + '/92__Feature__EmailWorkers/'\n",
         "        # 62__Feature__EmailWorkers keeps 62 (DR-03); its optional move to 92 is FR-22 (K3 W6-03, only on request; H1).\n",
         'Item 4: the target map shows the DR-03 target (62); FR-22 carries the optional move.', 'as above'),
    Edit(T + 'k2_build_maps.py', 'TF-T32 phase and risk',
         "            row['phase'] = 'W3 (deferred)'\n"
         "            row['risk'] = 'Medium: 1,857 tracked node_modules files make the git mv heavy until untracked; the .lnk deploy shortcut breaks silently.'",
         "            row['phase'] = 'W3 (only on request; K3 W6-03)'\n"
         "            row['risk'] = 'None while 62 stays. If FR-22 runs: medium - 1,857 tracked node_modules files make the git mv heavy until untracked, and the .lnk deploy shortcut breaks silently.'",
         'Item 4: K2\'s phase vocabulary (W3 = deferred / decision-gated) kept, with the condition and the K3 package named.', ''),
    Edit(T + 'k2_build_maps.py', 'FR-22 reason and phase',
         "       reason='Clears the nominal collision with TV/WCP 62__Feature__AppInstallability. 92 proved free (never used by TV). Deferred until node_modules is untracked (1,857 of 1,877 tracked files).',\n"
         "       importers=s['main'], risk='Medium (deploy shortcut .lnk embeds an absolute path).', decision_refs=['D-S01-08', 'D-S01-05'], phase='W3 (deferred)',",
         "       reason='Clears the nominal collision with TV/WCP 62__Feature__AppInstallability. 92 proved free (never used by TV). Runs only if Adam asks (D-S01-08 (a); K3 W6-03): the DR-03 default keeps 62 (TF-T32). Never before node_modules is untracked (1,857 of 1,877 tracked files).',\n"
         "       importers=s['main'], risk='Medium (deploy shortcut .lnk embeds an absolute path).', decision_refs=['D-S01-08', 'D-S01-05'], phase='W3 (only on request; K3 W6-03)',",
         'Item 4: FR-22 is the optional, on-request move.', 'as above'),
    Edit(T + 'k2_build_maps.py', 'collision table: 62 kept',
         "            if n == '41':\n                st = 'same number and role, different engine (DIV-2, kept on purpose)'\n",
         "            if n == '41':\n                st = 'same number and role, different engine (DIV-2, kept on purpose)'\n"
         "            if n == '62':\n                st = 'nominal collision, kept (DR-03 default): VV EmailWorkers stays at 62 and moves to 92 only on request (FR-22, K3 W6-03); TV\\'s AppInstallability is never ported (VV uses the WCP PWA)'\n",
         'Item 4: with TF-T32 kept at 62 the collision row states the DR-03 default.', ''),
    Edit(T + 'k2_build_maps.py', 'collision table: 62 text (unreachable branch kept in step)',
         "                st = 'nominal collision until W3 (VV EmailWorkers -> 92); TV\\'s AppInstallability is never ported (VV uses the WCP PWA)'",
         "                st = 'nominal collision, kept (DR-03 default): VV EmailWorkers moves to 92 only on request (FR-22, K3 W6-03); TV\\'s AppInstallability is never ported (VV uses the WCP PWA)'",
         'Item 4: the older branch (reached only if TF-T32 targeted another number) says the same.', ''),
    Edit(T + 'k2_build_maps.py', 'collision table: 92 reserved',
         "        elif n == '90':\n            st = 'TV historical (90__System__PageLayoutSystem, retired v2.155.0) - burnt, never reuse'",
         "        elif n == '92':\n"
         "            st = 'VV-only band: reserved for 62__Feature__EmailWorkers if Adam asks for the move (FR-22, K3 W6-03)'\n"
         "            when = 'W3 (only on request; K3 W6-03)'\n"
         "        elif n == '90':\n            st = 'TV historical (90__System__PageLayoutSystem, retired v2.155.0) - burnt, never reuse'",
         'Item 4: 92 stays reserved for the optional move.', ''),
]

# =====================================================================================================
# R0 (r0_source.md + r0_build_decisions.py NOTES -> R0__...md via r0_assemble.py)
# =====================================================================================================
R0S = T + 'r0_source.md'
R0 = [
    Edit(R0S, 'R0.0 Scope: out of scope',
         "  - 3D-only features unless they touch the editor (VV 28, 29, 31, 60-64, 69, 71; TV 62, 75, 76);\n",
         "  - 3D-only features unless they touch the editor (VV 28, 29, 31, 60-64, 69, 71; TV 62, 75, 76);\n"
         "  - TV v2.92.0, the presentation batch export (DR-44: outside this alignment unless Adam wants it), and the twelve TV-only 3D-tab files no drawing package needs: `07` DefaultFogEffect, `11` ViewModeFov DevControls, `15` InstanceConsolidation and LineworkColours, `21` Visibility StateCapture, `26` model-group and storey UI (six files; the model-group selector and its overlay also fall under DR-09 (a)) and `70` AssetCullDistance DevControls (R2 B.4.2, R5 E.2.5). TV's `15` MultiModel imports two of them, so W1-03 stays a hunk port;\n",
         'Item 8 (R5): v2.92.0 and the TV-only 3D modules outside the drawing scope get an explicit disposition.',
         'DR-44 options/recommendation ("v2.92.0 is outside this alignment unless you want it"); tree_tv.tsv vs tree_vv.tsv '
         '(12 TV-only files in 07, 11, 15, 21, 26 (6), 70 named by no K3 package); TV 15/Na__ModelLoader__MultiModel.js :94, :99'),
    Edit(R0S, 'R0.0 artefacts table: K3 counts',
         "`parity/data/wp_canonical.json` (164 packages, DAG, critical path, tests); `parity/data/wp_raw_map.json` (221 raw ids mapped); `parity/data/hot_file_ownership.json` (92 files)",
         "`parity/data/wp_canonical.json` (165 packages, DAG, critical path, tests; every Section F correction applied, recorded in `parity/data/wp_corrections_applied.json`); `parity/data/wp_raw_map.json` (221 raw ids mapped); `parity/data/hot_file_ownership.json` (93 files)",
         'H2 consequence: W5-07 (F.8 C33) makes 165 packages and 93 hot files.', 'wp_canonical.json (165), hot_file_ownership.json counts (93)'),
    Edit(R0S, 'R0.0 reading rule 1: hard gates',
         "unless its `hard_gate` says it must wait. 23 packages are hard-gated:",
         "unless its `hard_gate` says it must wait. 24 packages are hard-gated:",
         'H2 consequence: W5-07 is hard-gated (DR-25 retire).', 'wp_canonical.json: 24 packages with hard_gate'),
    Edit(R0S, 'R0.0 reading rule 1: W5 list',
         "   - W5-04, W5-05, W5-06;\n",
         "   - W5-04, W5-05, W5-06, W5-07;\n",
         'H2 consequence.', 'as above'),
    Edit(R0S, 'R0.1.1 Releases row: W0-06',
         "W0-06 acceptance item 1 still quotes the pre-verifier 55/6/14/83/6/7/4/2: replace it with this tally (R0.2.9 note)",
         "W0-06 acceptance item 1 carries this tally since R6 F.8 C34 (R0.2.9 note)",
         'Item 1: F.8 C34 now applies the R0.2.9 text to wp_canonical.json.', 'wp_canonical.json W0-06 acceptance[1] after k3_build.py'),
    Edit(R0S, 'R0.1.1 Work row',
         "221 raw packages merged into 164: 152 VV packages in W0-W6 (about 154,399 estimated lines, plus W5-06 unestimated) and 12 TV-lane packages (4,010 lines)",
         "221 raw packages merged into 164, plus W5-07 that R6 F.8 C33 added: 165 - 153 VV packages in W0-W6 (about 154,649 estimated lines, plus W5-06 unestimated) and 12 TV-lane packages (4,010 lines)",
         'H2 consequence.', 'wp_canonical.json: 153 VV packages, 154,649 est. lines; WT 12, 4,010'),
    Edit(R0S, 'R0.1.1 Contention row',
         "92 files are written by more than one package. The worst are the LE ModeController (19 packages), the LE AppConfig (16) and the Loader (15)",
         "93 files are written by more than one package. The worst are the LE ModeController (20 packages), the LE AppConfig (17) and the Loader (16)",
         'H2 consequence (C20 adds the elevation data module; C33 adds W5-07 to six hot files).', 'hot_file_ownership.json editors: 20 / 17 / 16'),
    Edit(R0S, 'R0.1.5 P1: questions named in packages',
         "W0-01 records each answer as a VV D-number continuing D01-D40 in `VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md`. | Adam, then W0-01 |",
         "W0-01 records each answer as a VV D-number continuing D01-D40 in `VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md`, and each question is named in the packages it gates (R6 F.8 C35). | Adam, then W0-01 |",
         'Sweep (i).', 'F.8 C35'),
    Edit(R0S, 'R0.1.5 P10 evidence',
         "| Adam, at the W0 deploy | R6 F.8 C5; R1 A.4 #11; code read 01-Oct-2026. K2 sections 9 and 12 still list it as open (and cite `:157`; the token is at `:68`) |",
         "| Adam, at the W0 deploy | R6 F.8 C5; R1 A.4 #11; R3 C.6; K2 sections 9 and 12; code read 01-Oct-2026 (`live_sw.js`: token at `:68`; `:157` is its stale DistanceCulling precache line) |",
         'Sweep (d): K2 sections 9 and 12 and R3 C.6 now record the question as resolved in code (H1).',
         'WebApps/live_sw.js:68 (PWA_SW_VERSION_TOKEN = \'2026-09-10-6\'), :157 (DistanceCulling precache entry)'),
    Edit(R0S, 'R0.1.6 W5 row',
         "| W5 | W5-01 -> W5-05 -> W5-99 | 1,320 | W5-05 runs only if Adam picks a Vale QR resolver (DR-12). Without it, the W5 chain is W5-02 -> W5-03 -> W5-99 (750 lines). W5-06, the site-plan pipeline (XL, unestimated), joins only under DR-08 (A) |",
         "| W5 | W5-01 -> W5-05 -> W5-07 -> W5-99 | 1,570 | W5-05 runs only if Adam picks a Vale QR resolver (DR-12), and W5-07 (R6 F.8 C33) only if he answers DR-25 'retire' at W4-09. Without the conditional packages (W5-04 to W5-07), the W5 chain is W5-02 -> W5-03 -> W5-99 (750 lines). W5-06, the site-plan pipeline (XL, unestimated), joins only under DR-08 (A) |",
         'H2 consequence: the W5 critical chain runs through W5-07.',
         'wp_canonical.json critical_path.per_wave.W5 = W5-01, W5-05, W5-07, W5-99 (1,570); W5-02 300 + W5-03 200 + W5-99 250 = 750'),
    Edit(R0S, 'R0.1.6 All row',
         "| **All** | **52 packages** (55 by package count) | **65,179** |",
         "| **All** | **53 packages** (56 by package count) | **65,429** |",
         'H2 consequence.', 'wp_canonical.json critical_path: by_est_lines 53 packages, 65,429; by_package_count 56'),
    Edit(R0S, 'R0.1.7 T11',
         "| T11 | **Parallel agents collide on shared files.** 92 files are written by more than one package.",
         "| T11 | **Parallel agents collide on shared files.** 93 files are written by more than one package.",
         'H2 consequence.', 'hot_file_ownership.json: 93'),
    Edit(R0S, 'R0.1.8 E2: what removes it',
         "| Adam re-decides DR-25 at the publishing port (W4-09) and retires the switch, as K1 recommends | No (R0.3.6) |",
         "| Adam re-decides DR-25 at the publishing port (W4-09) and answers 'retire', as K1 recommends; W5-07 then removes the switch (R6 F.8 C33) | No (R0.3.6) |",
         'H2 consequence: W5-07 is the package that retires the switch.', 'W5-07 hard_gate'),
    Edit(R0S, 'R0.2.1 Tier 1 DR-01 count',
         "It gates 121 packages in W1-W6, and W3-04 is hard-gated on it.",
         "It gates 122 packages in W1-W6, and W3-04 is hard-gated on it.",
         'H2 consequence: W5-07 is gated by DR-01.', 'wp_canonical.json: DR-01 in gated_by of 124 packages (W0 2, W1 38, W2 42, W3 17, W4 18, W5 6, W6 1)'),
    Edit(R0S, 'R0.2.1 Tier 2: Q row',
         "| Q-REG, Q-63, Q-BACKUP (raised by this report, R0.2.11) | W0-04 and W0-06 (registry and lint); W0-09 (backup root) |",
         "| Q-REG, Q-63, Q-BACKUP (raised by this report, R0.2.11) | W0-04 and W0-06 (registry and lint); W0-09 (backup root); each package names its question (R6 F.8 C35) |",
         'Sweep (i).', 'F.8 C35'),
    Edit(R0S, 'R0.2.11 intro',
         "- Q-AZIMUTH and the second half of Q-COVER are code rulings for the planner. The rest are Adam's.\n",
         "- Q-AZIMUTH and the second half of Q-COVER were code rulings for the planner, and Section F has made both (R6 F.8 C20, C22, in `wp_canonical.json`). The rest are Adam's.\n"
         "- Since R6 F.8 C35 each question is named in the packages of its Gates column, and W0-01 records each answer or default as a VV D-number.\n",
         'Item 8 (R4: the immediate seam is settled by C22) and sweep (i).', 'wp_canonical.json W1-33 vv_adaptations[6] [F.8 C22]; W1-10/W2-05 [F.8 C20]'),
    Edit(R0S, 'R0.2.11 Q-35ASSETS default',
         "| Nothing is copied. W6-03 stays held until Adam confirms the removals (DR-03 hard gate), and this question goes to him with them |",
         "| Nothing is copied. W6-03 stays held until Adam confirms the removals (DR-03 hard gate), and this question goes to him with them (W6-03's hard gate carries it since R6 F.8 C31) |",
         'Item 8 (R1): the question is already in W6-03\'s hard gate.', 'wp_canonical.json W6-03 hard_gate [F.8 C31]'),
    Edit(R0S, 'R0.2.11 Q-AZIMUTH default',
         "| As recommended (planner's ruling; nothing user-visible) | W1-10, W2-05 |",
         "| As recommended (planner's ruling; nothing user-visible). Settled: R6 F.8 C20 applied it to W1-10 and W2-05 | W1-10, W2-05 |",
         'Item 8 (R2): the ruling is applied.', 'wp_canonical.json W1-10 vv_adaptations[2], W2-05 acceptance[4] [F.8 C20]'),
    Edit(R0S, 'R0.2.11 Q-COVER default (2)',
         "| (1) As recommended.<br>(2) The planner picks before W1-33 is handed out | W1-33 |",
         "| (1) As recommended.<br>(2) Settled by R6 F.8 C22: LoadingScreen exports `Na__LeLoadScreen__IsShown()` (true while the loader's cover is up) and the ModeController passes `immediate: Na__LeLoadScreen__IsShown()` to `Na__LeVeil__FirstOpen` at TV's call site, so `Enter(sheetId)` keeps TV's signature; recorded in the three PORT NOTEs | W1-33 |",
         'Item 8 (R4): W1-33\'s unspecified seam for "immediate" is settled by F.8 C22; only part (1) stays Adam\'s.',
         'wp_canonical.json W1-33 vv_adaptations[6] [F.8 C22]'),
    Edit(R0S, 'R0.3.1 DIV-2: 41 README',
         "K2 N6 and DR-26 call for `README__CrossSectionView__.md` naming the twins, but no K3 package creates it yet (open issue: add it to W0-06)",
         "K2 N6 and DR-26 call for `README__CrossSectionView__.md` naming the twins; W0-06 creates it (R6 F.8 C14)",
         'Item 8 (R2): F.8 C14 gave the README to W0-06.', 'wp_canonical.json W0-06 vv_targets[12], acceptance[6] [F.8 C14]'),
    Edit(R0S, 'R0.3.1 DIV-3 evidence',
         "| DR-25, DR-32; K3 W1-05; S12-F32. The W0-06 acceptance lists DIV-1 to DIV-4 as permanent; DIV-3 is closed, as both ProjectData files show |",
         "| DR-25, DR-32; K3 W1-05; S12-F32. DIV-3 is closed, as both ProjectData files show; W0-06 acceptance item 1 says so since R6 F.8 C34 |",
         'Item 1 / sweep (a).', 'F.8 C34'),
    Edit(R0S, 'R0.3.2 PD-02',
         "Never port TV 41; add `README__CrossSectionView__.md` (not yet in any K3 package)",
         "Never port TV 41; W0-06 adds `README__CrossSectionView__.md` (R6 F.8 C14)",
         'Item 8 (R2).', 'F.8 C14'),
    Edit(R0S, 'R0.3.2 PD-12: G4 exemptions',
         "- Gate G4: `Na__Verify__ParityNaming__` (W0-04) fails on a `TRUEVISION3D` banner, a `[TrueVision3D` prefix, a `TrueVision__` literal or `window.TrueVision__` outside PORT NOTE \"Ported from\" lines.",
         "- Gate G4: `Na__Verify__ParityNaming__` (W0-04) fails on a `TRUEVISION3D` banner, a `[TrueVision3D` prefix, a `TrueVision__` literal or `window.TrueVision__`. Exempt: the whole PORT NOTE block of a file, history documents (devlog, ledger, `__PLAN__`, `__NOTES__`, `Research__` and `TASK__` files) and the named TrueVisionHub statement file (PD-15); a hit on W0-04's baseline allow-list prints WARN instead of failing (K3 G4, R6 F.8 C13).",
         'Item 5 / sweep (c): the G4 exemption wording reads the same everywhere (K3 G4 since F.8 C13).', 'wp_canonical.json standard_gates G4'),
    Edit(R0S, 'R0.3.2 PD-15: exception source',
         "- W0-04 adds one named G4 exception, for the Hub file above.",
         "- W0-04 adds one named G4 exception, for the Hub file above (R6 F.8 C13).",
         'Item 3: the exception is now in W0-04 and G4.', 'wp_canonical.json W0-04 vv_adaptations[1], acceptance[1] [F.8 C13]'),
    Edit(R0S, 'R0.3.2 PD-15: DR-43 options',
         "- If Adam wants no NA copy in VV's source at all, DR-43's alternative is a Registry seam that drops the Hub import and its DEFINITIONS entry; the file then stays out of VV.",
         "- If Adam wants no NA copy in VV's source at all, DR-43's other Hub options give the section Vale words (a 'ValeVision 3D Project Hub', or the TrueVisionHub id with VV words); keeping the module out of VV altogether is none of DR-43's options and would need a new, recorded Registry seam that drops the Hub import and its DEFINITIONS entry.",
         'Sweep (c): R0 credited DR-43 with an option it does not list; its three Hub options are exclude via config, a ValeVision '
         '3D Project Hub with Vale words, or the TrueVisionHub id with VV words.', 'decision_register.json DR-43 options[1]'),
    Edit(R0S, 'R0.3.2 PD-17: 62',
         "- VV-reserved numbers 28, 29, 31, 35, 60, 61, 62 (until moved to 92), 63, 64, 69, 71, 91-99",
         "- VV-reserved numbers 28, 29, 31, 35, 60, 61, 62 (moves to 92 only on request, FR-22), 63, 64, 69, 71, 91-99",
         'Item 4 / sweep (b): 62 moves only on request (DR-03).', 'DR-03 default'),
    Edit(R0S, 'R0.3.2 PD-20: Vale example',
         "Used raw, VV would print `2026/3047__Doous_T01_D01` (S07a-V01)",
         "Used raw, VV would print `2026/3047__Doous_D01`, a folder path inside a document name (S07a-V01)",
         'Sweep (h): no NA job phase in a Vale example; the DR-11 default composes {project}_{drawing}.', 'DR-11 default; F.8 C21'),
    Edit(R0S, 'R0.3.2 PD-23: localhost reader URL',
         "- the localhost first URL must be 404-honest: `/Whitecardopedia/Projects/{folderId}/...`, which answers real JSON 404s (`WCP/server.py:901-907`), or W0-19 makes `/Projects/` 404-honest<br>",
         "- the localhost first URL is the facade's `repoUrl` form, `new URL('../Whitecardopedia/Projects/' + folderId + '/06__Layout__PublishedDocuments/...', AppRootUrl)`, whose `/Whitecardopedia/<path>` route answers real JSON 404s (`WCP/server.py:897-907`); `/Projects/...` would reach the catch-all (R6 F.8 C30)<br>",
         'Item 8 (R3): F.8 C30 chose the 404-honest path for W4-17.', 'wp_canonical.json W4-17 vv_adaptations[1] [F.8 C30]; WCP/server.py:897-907, :956-977'),
    Edit(R0S, 'R0.3.2 PD-23 evidence',
         "| DR-22, DR-29; R3 C.4 S18, C.5, C.6 |",
         "| DR-22, DR-29; R3 C.4 S18, C.5, C.6; R6 F.8 C30 |",
         'Item 8 (R3).', 'F.8 C30'),
    Edit(R0S, 'R0.3.6 Layout Mode row',
         "| Re-decided at the publishing port (W4-07 to W4-09); retirement recommended then | DR-25 |",
         "| Re-decided at the publishing port (W4-07 to W4-09); retirement recommended then, and W5-07 retires the switch on a 'retire' answer (R6 F.8 C33) | DR-25 |",
         'H2 consequence.', 'W5-07'),
    Edit(T + 'r0_build_decisions.py', 'R0.2.9 note: W0-06 text applied',
         " 'R0.2.9 Ledger and versioning':\n"
         "  'W0-06 acceptance item 1 quotes S11\\'s pre-verifier release tally (\"55/6/14/83/6/7/4/2\"). The canonical source is now Section E\\'s `report/tools/r5work/release_rows_final.json`. Brief W0-06 with: \"Release Watermark (177 rows) seeded from `r5work/release_rows_final.json`: 51 ported / 11 partial / 17 pending sign-off / 80 never considered / 4 reopened / 2 deliberate / 7 not drawing / 4 VV-origin / 1 n/a, 112 open\" (R0.1.1, R0.1.2). The same item lists DIV-1 to DIV-4 as permanent; DIV-3 is closed (R0.3.1).',",
         " 'R0.2.9 Ledger and versioning':\n"
         "  'W0-06 acceptance item 1 quoted S11\\'s pre-verifier release tally (\"55/6/14/83/6/7/4/2\"). The canonical source is now Section E\\'s `report/tools/r5work/release_rows_final.json`, and R6 F.8 C34 has replaced the item\\'s watermark clause in `wp_canonical.json` with this text: \"Release Watermark (177 rows) seeded from `parity/report/tools/r5work/release_rows_final.json`: 51 ported / 11 partial / 17 pending sign-off / 80 never considered / 4 reopened / 2 deliberate / 7 not drawing / 4 VV-origin / 1 n/a, 112 open\" (R0.1.1, R0.1.2). The same row lists DIV-3 as closed with DIV-5 (R0.3.1).',",
         'Item 1: the note now carries the text F.8 C34 applies verbatim (path given from parity/ so an agent can open it).',
         'wp_canonical.json W0-06 acceptance[1] after k3_build.py'),
    Edit(T + 'r0_build_decisions.py', 'R0.2.7 note: W0-01 bullet corrected by C1',
         "The fifth acceptance bullet of W0-01 says \"W3-04 lands them held (W3-05 switches them on later)\"; that wording is wrong, because W3-05 switches on the drafting aids.',",
         "The fifth acceptance bullet of W0-01 said \"W3-04 lands them held (W3-05 switches them on later)\", which was wrong because W3-05 switches on the drafting aids; R6 F.8 C1 corrected it to \"if unanswered, W3-03 writes the four guards and W3-04 stays held\".',",
         'H2 consequence: F.8 C1 is applied in wp_canonical.json.', 'wp_canonical.json W0-01 acceptance[5] [F.8 C1]'),
]

# =====================================================================================================
# R2 (r2b_render.py -> R2__B_ModuleNaming_Divergence.md)
# =====================================================================================================
R2R = T + 'r2b_render.py'
R2 = [
    Edit(R2R, 'B.0 #3: SectionClipping owner',
         "'`Na__SectionClipping__*` (VV :6, :146-153). No K3 package owns that fix (B.3.1).')",
         "'`Na__SectionClipping__*` (VV :6, :146-153). W0-03 owns that fix since R6 F.8 C12 (B.3.1).')",
         'Item 8 (R2): F.8 C12 gave the header fix to W0-03.', 'wp_canonical.json W0-03 vv_targets/acceptance [F.8 C12]'),
    Edit(R2R, 'B.0 #5: SetAzimuthDeg ruling',
         "1 needs a ruling (`Na__ElevData__SetAzimuthDeg`).",
         "1 needed a ruling (`Na__ElevData__SetAzimuthDeg`: retire it with W2-05, the planner\\'s ruling R0.2.11 Q-AZIMUTH, applied by R6 F.8 C20).",
         'Item 8 / sweep (i).', 'F.8 C20'),
    Edit(R2R, 'B.0 #6: SectionAdapter names fixed',
         "plus the SectionAdapter\\'s four new calls (six names, '\n  'W2-02; proposed in B.3.5)",
         "plus the SectionAdapter\\'s four new calls (six names, '\n  'W2-02; proposed in B.3.5, fixed by R6 F.8 C25)",
         'Item 8 (R2): the names are fixed by F.8 C25.', 'wp_canonical.json W2-02, WT-02 [F.8 C25]'),
    Edit(R2R, 'B.0 #7: named exception',
         "and give the W0-04 naming lint a declared exception for it.",
         "and the W0-04 naming lint carries a named exception for it (R6 F.8 C13).",
         'Item 3: W0-04 now carries the exception.', 'F.8 C13'),
    Edit(R2R, 'B.0 #9: gaps closed',
         "'says the retired 91 folder holds 4 files but it holds 7 after FR-08 (verified on disk).')",
         "'says the retired 91 folder holds 4 files but it holds 7 after FR-08 (verified on disk). Section F\\'s F.8 has since closed '\n  'each of them in `wp_canonical.json` (C12, C18, C14, C13, C20, C31; B.5).')",
         'Item 8 (R2): every gap this section listed is closed by an F.8 row.', 'wp_corrections_applied.json rows C12, C13, C14, C18, C20, C31'),
    Edit(R2R, 'B.1: G4 exemptions',
         "'outside PORT NOTE \"Ported from\" lines and history). History documents (devlog, ledger, plans) are never rewritten (K2 section 13).')",
         "'outside the exempt parts: the whole PORT NOTE block of a file, history documents (devlog, ledger, `__PLAN__`, `__NOTES__`, '\n"
         "  '`Research__` and `TASK__` files) and the named TrueVisionHub statement file; a hit on W0-04\\'s baseline allow-list prints WARN '\n"
         "  'instead of failing - K3 G4, R6 F.8 C13). History documents (devlog, ledger, plans) are never rewritten (K2 section 13).')",
         'Item 5: G4 exemption wording identical in R1, R2 and R6 (K3 G4 since F.8 C13).', 'wp_canonical.json standard_gates G4'),
    Edit(R2R, 'B.3.1: SectionClipping owner cell',
         "'**unowned - add to W0-03**', 'H2'],",
         "'W0-03 (R6 F.8 C12)', 'H2'],",
         'Item 8 (R2).', 'F.8 C12'),
    Edit(R2R, 'B.3.1: AutoSave PORT NOTE exempt',
         "names TV\\'s global inside a PORT NOTE (history, exempt).')",
         "names TV\\'s global inside its PORT NOTE block, which G4 exempts (R6 F.8 C13).')",
         'Item 5: the exemption is the whole PORT NOTE block, not "history".', 'F.8 C13 finding (AutoSave__.js:48 is a Divergences line)'),
    Edit(R2R, 'B.3.7: TrueVisionHub ruling',
         "**W0-04 must declare a lint exception for this one file** or G4 fails on \"TrueVision 3D Project Hub\"; WT-03 (DR-42 item 6) would move the branding into config'],",
         "**W0-04 declares a named G4 exception for this one file (R6 F.8 C13)**, without which G4 fails on \"TrueVision 3D Project Hub\"; the section is present but never rendered (R0 PD-15); WT-03 (DR-42 item 6) would move the branding into config'],",
         'Item 3 / sweep (c).', 'F.8 C13; R0 PD-15'),
    Edit(R2R, 'B.4.1: 41 README owner',
         "'DR-26, DR-41', 'README unowned (Open issues)'),",
         "'DR-26, DR-41', 'README: W0-06 (R6 F.8 C14)'),",
         'Item 8 (R2).', 'F.8 C14'),
    Edit(R2R, 'B.5 #1 settled',
         "recommended: add it to W0-03 (header-only, no import change).',",
         "recommended: add it to W0-03 (header-only, no import change). Settled: W0-03 owns it since R6 F.8 C12.',",
         'Item 8 (R2).', 'F.8 C12'),
    Edit(R2R, 'B.5 #2 settled',
         "(K2 N6, DR-26); recommended: W0-06.',",
         "(K2 N6, DR-26); recommended: W0-06. Settled: W0-06 creates it (R6 F.8 C14).',",
         'Item 8 (R2).', 'F.8 C14'),
    Edit(R2R, 'B.5 #3 settled',
         "kept at TV\\'s path by W4-12), or W4-12 fails its own gate.',",
         "kept at TV\\'s path by W4-12), or W4-12 fails its own gate. Settled: W0-04\\'s adaptations and acceptance and gate G4 name it (R6 F.8 C13).',",
         'Item 3.', 'F.8 C13'),
    Edit(R2R, 'B.5 #4 settled',
         "(no new writes; the field is still read and preserved).',",
         "(no new writes; the field is still read and preserved). Settled: W1-10 re-adds `Na__ElevData__STYLE_KEYS` and keeps both setters through W1, and W2-05 retires them (R6 F.8 C20; the planner\\'s ruling R0.2.11 Q-AZIMUTH).',",
         'Item 8 / sweep (i).', 'F.8 C20'),
    Edit(R2R, 'B.5 #5 settled',
         "its adaptations do not mention the header.',",
         "its adaptations do not mention the header. Settled: R6 F.8 C18.',",
         'Item 8 (R2).', 'F.8 C18'),
    Edit(R2R, 'B.5 #6 settled',
         "W2-02 must fix them before WT-02 copies them.',",
         "W2-02 must fix them before WT-02 copies them. Settled: R6 F.8 C25 fixes the six names for W2-02 and WT-02.',",
         'Item 8 (R2).', 'F.8 C25'),
    Edit(R2R, 'B.5 #7 settled',
         "W2-04 states it, W1-37 and W2-03 do not (B.3.3).',",
         "W2-04 states it, W1-37 and W2-03 do not (B.3.3). Settled: R6 F.8 C24.',",
         'Item 8 (R2).', 'F.8 C24'),
    Edit(R2R, 'B.5 #8 settled',
         "FR-25\\'s importer list (4 files) is unaffected.',",
         "FR-25\\'s importer list (4 files) is unaffected. Settled: R6 F.8 C31.',",
         'Item 8 (R2).', 'F.8 C31'),
    Edit(R2R, 'B.5 #12 settled',
         "`Na__TilePlan__*` re-export (W2-03).',",
         "`Na__TilePlan__*` re-export (W2-03). Settled: R6 F.8 C11 (W0-02) and C26 (W2-03).',",
         'Item 8 (R2).', 'F.8 C11, C26'),
]

# =====================================================================================================
# R5 (R5_template.md, r5_inventory.py, r5_assemble.py -> R5__...md)
# =====================================================================================================
R5 = [
    Edit(T + 'R5_template.md', 'E.2.5: TV-only 3D modules disposition',
         "TV-only 3D modules (`15` InstanceConsolidation and LineworkColours, `21` Visibility__StateCapture, `26` model-group\n"
         "and storey UI, `70` AssetCullDistance) belong to no slice and no K3 package (see the open issues). TV's",
         "TV-only 3D modules (`15` InstanceConsolidation and LineworkColours, `21` Visibility__StateCapture, `26` model-group\n"
         "and storey UI, `70` AssetCullDistance; also `07` DefaultFogEffect and `11` ViewModeFov DevControls) belong to no slice and no\n"
         "K3 package: they are outside this alignment as 3D-tab features (the front matter's scope, R0.0; the model-group selector and its\n"
         "overlay also fall under DR-09 (a)), and Section B records each (B.4.2). TV's",
         'Item 8 (R5): the sentence pointed at an "open issues" list R5 does not have; the modules get an explicit '
         'out-of-scope disposition, matching R0.0 and R2 B.4.2.', 'tree_tv.tsv vs tree_vv.tsv; no K3 package names them (grep of wp_canonical.json)'),
    Edit(T + 'R5_template.md', 'E.3 ownership check',
         "{{N_E3}} files against every K3 package's `tv_sources`, `vv_targets`, `edits` and `hot_files` leaves {{N_E3_OUTSIDE}}\n"
         "files outside K3: {{N_E3_OUTSIDE_EXCL}} are the exclusions marked below (TV's ProfileLines, five 41 engine files, seven 27\n"
         "menu files, the 80 note) and one is a K3 gap closed here. K3 gives `README__PublishedDocuments__.md` (52) no package, so\n"
         "this section assigns it to W4-17, the first package to create files in that folder (W1-15, W1-37, W2-34, W4-01 and\n"
         "W4-08 each carry their folder's README); the delegator adds it to W4-17's targets, a K3 correction for Section F's list\n"
         "(F.8). `README__SpellCheck__.md` is W2-34's: a new VV target there (`vv_targets` and `edits`), though not one of its\n"
         "`tv_sources`.",
         "{{N_E3}} files against every K3 package's `tv_sources`, `vv_targets`, `edits` and `hot_files` leaves {{N_E3_OUTSIDE}}\n"
         "files outside K3, all of them the exclusions marked below (TV's ProfileLines, five 41 engine files, seven 27 menu files,\n"
         "the 80 note). The one K3 gap this section found is closed: `README__PublishedDocuments__.md` (52) had no package, so this\n"
         "section assigned it to W4-17, the first package to create files in that folder (W1-15, W1-37, W2-34, W4-01 and W4-08 each\n"
         "carry their folder's README), and Section F's F.8 C30 added it to W4-17's `vv_targets` and `edits` in `wp_canonical.json`\n"
         "(01-Oct-2026). `README__SpellCheck__.md` is W2-34's: a new VV target there (`vv_targets` and `edits`), though not one of\n"
         "its `tv_sources`.",
         'Item 6: README__PublishedDocuments__.md is W4-17\'s since F.8 C30 (applied by H2), README__SpellCheck__.md is W2-34\'s; '
         'E.3 still called the first unowned, and r5_assemble.py failed its own assertion after H2.',
         'wp_canonical.json W4-17 vv_targets[7] (F.8 C30) and edits; W2-34 vv_targets and edits; r5_assemble.py run 01-Oct-2026: '
         '"outside K3: 14 excluded: 14 gaps: []" then AssertionError'),
    Edit(T + 'R5_template.md', 'E.4 41 row: README owner',
         "a new `README__CrossSectionView__.md` names the twins (K2 N6; no K3 package creates it, Sections A and B propose W0-06) | W2-02, W2-05, W0-06 (proposed); TV side WT-02 |",
         "a new `README__CrossSectionView__.md` names the twins (K2 N6; W0-06 creates it, R6 F.8 C14) | W2-02, W2-05, W0-06; TV side WT-02 |",
         'Item 8 (R2): F.8 C14.', 'F.8 C14'),
    Edit(T + 'r5_inventory.py', 'owner of the 52 README',
         "PROPOSED_OWNER = {\n"
         "    \"02__Src__AppModules/52__System__Layout__PublishedDocuments/README__PublishedDocuments__.md\":\n"
         "        \"W4-17 (assigned here; not in wp_canonical.json)\",\n"
         "}",
         "# H1 (01-Oct-2026): Section F's F.8 C30 put the 52 README in W4-17's vv_targets and edits, so the K3 lookup finds it.\n"
         "PROPOSED_OWNER = {}",
         'Item 6.', 'F.8 C30'),
    Edit(T + 'r5_inventory.py', 'E.3 note on the 52 README',
         "\"Urls; no K3 package lists it, so the delegator adds it to W4-17's targets\",",
         "\"Urls; a W4-17 target since Section F's F.8 C30\",",
         'Item 6.', 'F.8 C30'),
    Edit(T + 'r5_assemble.py', 'E.3 coverage assertion',
         "assert outside_gap == [\"README__PublishedDocuments__.md\"], \"E.3 coverage sentence names the gap by hand: re-check it\"",
         "assert outside_gap == [], \"E.3 coverage sentence says every file outside K3 is an exclusion (README gap closed by F.8 C30): re-check it\"",
         'Item 6: the generator now asserts the post-H2 truth (no gap) instead of failing.', 'r5_assemble.py run before H1: AssertionError'),
]
