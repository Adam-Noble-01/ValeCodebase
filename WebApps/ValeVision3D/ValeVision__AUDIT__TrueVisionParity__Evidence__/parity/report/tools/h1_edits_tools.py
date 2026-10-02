# -*- coding: utf-8 -*-
"""H1 - edits to generator inputs and tools (the generated sections are then rebuilt by h1_harmonise.py).

Groups: K3/R6 F.8 layer (r6_corrections.py, k3_f8_corrections.py, k3_report_md.py), R6 prose and builder
(r6_prose.py, r6_build_sectionF.py), H2's record/validators (h2_record_corrections.py, h2_validate.py,
h2_diff_r6.py), the critic's id checker, K1 (k1_register_content.py), K2 (k2_build_maps.py), R0 (r0_source.md,
r0_build_decisions.py), R2 (r2b_render.py) and R5 (R5_template.md, r5_inventory.py, r5_assemble.py).
Every fact was re-checked on 01-Oct-2026, read-only (TV at b2aa9151, VV at 7b4e593a).
"""
from h1_patchlib import Edit

T = 'report/tools/'

# =====================================================================================================
# 1. F.8 rows C34-C36 (r6_corrections.py) - applied to wp_canonical.json by k3_build.py
# =====================================================================================================
NEW_ROWS = r'''    },
    # ---- rows added by H1, the report's final cross-section harmonisation (01-Oct-2026) ----
    {
        'id': 'C34',
        'item': "W0-06 acceptance item 1: the Release Watermark tally and DIV-3's status",
        'finding': ("W0-06 acceptance item 1 seeds the ledger's Release Watermark with S11's pre-verifier tally ('classification counts "
                    "55/6/14/83/6/7/4/2 as S11 B3') and lists DIV-1..DIV-4 as permanent. S11's verifier corrected the tally to "
                    "55/6/17/79/6/8/4/2 (102 open), and Section E's reconciliation of every slice's evidence gives 51/11/17/80/4/2/7/4/1 "
                    "(112 open), which the front matter makes canonical and quotes as W0-06's replacement text (R0.1.1, R0.2.9 note). "
                    "DIV-3 is closed: both apps own the top-level LayoutEditor__DrawingsData block (R0.3.1)."),
        'evidence': ("`parity/report/tools/r5work/release_rows_final.json`, recounted on 01-Oct-2026: 177 rows - PORTED 51, PARTIAL 11, "
                     "PENDING-SIGNOFF 17, NOT-CONSIDERED 80, REOPENED 4, DELIBERATE 2, NOT-DRAWING 7, VV-ORIGIN 4, N/A 1; "
                     "`slices/S11__Ledger_Release_Watermark.md:21-27` (the verifier's tally); R5 E.1.1; R0 R0.1.1, the R0.2.9 note and "
                     "R0.3.1 DIV-3; `TVM/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js:179` and VV "
                     "`42__System__DrawingViewCore/Na__DrawView__ProjectData__.js:106` (`Na__DrawData__BLOCK_KEY = 'LayoutEditor__DrawingsData'` in both)."),
        'ops': [
            _op('W0-06', 'list_sub', 'acceptance', index=1,
                old='Header (roots; DIV-1..DIV-4 permanent, DIV-5 closed)',
                new='Header (roots; DIV-1, DIV-2 and DIV-4 permanent, DIV-3 and DIV-5 closed)'),
            _op('W0-06', 'list_sub', 'acceptance', index=1,
                old='Release Watermark (177 rows, classification counts 55/6/14/83/6/7/4/2 as S11 B3)',
                new='Release Watermark (177 rows) seeded from `parity/report/tools/r5work/release_rows_final.json`: 51 ported / 11 partial / 17 pending sign-off / 80 never considered / 4 reopened / 2 deliberate / 7 not drawing / 4 VV-origin / 1 n/a, 112 open'),
        ],
    },
    {
        'id': 'C35',
        'item': "The front matter's open questions (R0.2.1 Q-VER; R0.2.11 Q-63, Q-35ASSETS, Q-REG, Q-AZIMUTH, Q-COVER, Q-BACKUP) named in the packages they gate",
        'finding': ("R0.2.11 says a package in a question's Gates column must not start until the question is answered or W0-01 has "
                    "recorded its default, but no package names the questions: W0-01 records one D-number per K1 DR only; W0-06 and W0-04 "
                    "do not say how 08, 09, 12-14 and 16-19 (Q-REG) or 63 (Q-63) are registered; W0-09 leaves the backup root to config "
                    "(Q-BACKUP); W6-03's keep-or-archive gate (F.8 C31) and the 63 -> 93 fallback carry no question id; W1-10 and W2-05 "
                    "(Q-AZIMUTH, ruled by F.8 C20) and W1-33 (Q-COVER, part 2 ruled by F.8 C22) do not cite them; W0-16 does not say what "
                    "an early Q-35ASSETS (a) adds. A brief written from the JSON would miss the gate."),
        'evidence': ("R0 R0.1.5 P1, R0.2.1 (Q-VER), R0.2.11; `wp_canonical.json` W0-01 acceptance item 1 (one D-number per K1 DR, "
                     "DR-01..DR-44); no 'Q-' id in any package (grep of wp_canonical.json, 01-Oct-2026); "
                     "`NAAPPS/ProjectVision__LocalServer__Main__.py:112-116` (TRUEVISION_PROJECT_BACKUP_ROOT, else "
                     "LOCALAPPDATA/NobleArchitecture/TrueVision/ProjectDataBackups; PROJECT_BACKUP_KEEP = 30)."),
        'also': "F.5.2 (W0, W1 and W6 entry), F.5.4 W6 item 1, the F.6 brief template's decisions line and the F.6.1 brief (decisions, notes and stop lines).",
        'ops': [
            _op('W0-01', 'list_add', 'acceptance',
                "The Decisions block also records the front matter's open questions, each as a VV D-number with Adam's answer or 'default, unanswered' and the default it then applies: Q-VER (the devlog step of item 3; R0.2.1), Q-63, Q-35ASSETS, Q-REG, Q-AZIMUTH, Q-COVER and Q-BACKUP (R0.2.11). Q-AZIMUTH and part (2) of Q-COVER are recorded as the planner's rulings already applied (F.8 C20 in W1-10 and W2-05, F.8 C22 in W1-33)."),
            _op('W0-04', 'list_add', 'notes',
                "The unregistered-number check reads the registry as W0-06 writes it under the front matter's defaults: 08, 09, 12-14 and 16-19 are TV growth (R0.2.11 Q-REG), and 63 stays VV-reserved while TV's branch claude/westfarm-intro-notes-37b804 is unmerged (Q-63)."),
            _op('W0-06', 'list_add', 'notes',
                "Registry defaults from the front matter (R0.2.11): Q-REG - 08, 09, 12-14 and 16-19 are written as TV growth, extending DR-03 registry (i); Q-63 - 63 stays VV-reserved (VVM/63__Feature__AppNotificationEmail/) while TV's unmerged branch claude/westfarm-intro-notes-37b804 (commit 4db73420) adds 63__System__LocalFileParity; if that branch merges as 63 first, the registry records 93 for VV's folder, which moves with W6-03 (Q-63 (b))."),
            _op('W0-09', 'list_add', 'notes',
                "Backup root (R0.2.11 Q-BACKUP): unless Adam names another location, config holds %LOCALAPPDATA%\\ValeGardenHouses\\ValeVision\\ProjectDataBackups, keep 30, mirroring TV's TRUEVISION_PROJECT_BACKUP_ROOT, else %LOCALAPPDATA%\\NobleArchitecture\\TrueVision\\ProjectDataBackups (NAAPPS/ProjectVision__LocalServer__Main__.py:112-116); Adam confirms it before the first guarded save."),
            _op('W0-16', 'list_add', 'notes',
                "R0.2.11 Q-35ASSETS: if Adam answers (a) before W0-16 is dispatched, the planner adds 35's VizDpt A3 variant (02__VizDpt__TitleBlock__Pdf__/, pdf and png) and the 12 RecConcept layouts (03__TitleBlock__LayoutPdfs__RecConcept__Feb-2026__/) to this package as copies beside the Classic scan in VV/01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/; otherwise the choice waits for W6-03's hard gate, which F.8 C31 set."),
            _op('W1-10', 'list_add', 'notes',
                "R0.2.11 Q-AZIMUTH is the planner's ruling (b), applied by F.8 C20: both VV-only setters stay exported through W1, and W2-05 retires them."),
            _op('W1-33', 'list_add', 'notes',
                "R0.2.11 Q-COVER: part (2), how 'immediate' reaches FirstOpen, is settled by the seam above (F.8 C22); part (1), the boot cover's words on a cold document-tab press (Specification, later Register or Statements), is Adam's - default: the drawing cover's headline with VV's two pre-load status lines and no drawing job, confirmed by eye (R4 D.4 check 15)."),
            _op('W2-05', 'list_add', 'notes',
                "R0.2.11 Q-AZIMUTH (b), applied by F.8 C20: this package retires Na__ElevData__SetAzimuthDeg and Na__ElevData__SetSeededFrom."),
            _op('W6-03', 'list_add', 'notes',
                "Front-matter questions (R0.2.11): the keep-or-archive choice in the hard gate is Q-35ASSETS (recommended (a): copy the 14 files beside the Classic scan in VV/01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/); if TV's branch claude/westfarm-intro-notes-37b804 has merged 63__System__LocalFileParity first, Q-63 (b) moves VVM/63__Feature__AppNotificationEmail/ to VVM/93__Feature__AppNotificationEmail/ with this package (3 files; one import at VVM/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__UiInteractionLogic__.js:25), and the planner adds those paths to its targets."),
        ],
    },
    {
        'id': 'C36',
        'item': "W0-19 acceptance item 2: the statement test server answers TV's local-server probe",
        'finding': ("W0-19's adapted Na__Test__StatementServer__.py is to answer /api/check-localhost, but TV's test answers /api/health "
                    "'as the ProjectVision local server does, so the app treats the statements folder as writable' (TV test :25-26, "
                    ":133-135), and under DR-28 (A) the ported statement transport recognises the local server through GET /api/health "
                    "with service 'whitecardopedia-local-dev' (one SERVICE constant per module; F.8 C28 corrected W2-34 the same way). "
                    "A test server without /api/health would not let the ported code treat the statements folder as writable."),
        'evidence': ("TV `80__Testing__PrototypeEnvironment/Na__Test__StatementServer__.py:25-26` and `:133-135` (service "
                     "'na-projectvision-local-dev'); DR-28 recommendation ('/api/health (A)'); R3 C.2 (g) 'Local-server recognition' row "
                     "and the C.4 S1 statement rows (service 'whitecardopedia-local-dev'); F.8 C28."),
        'ops': [
            _op('W0-19', 'list_sub', 'acceptance', index=2,
                old='answers /api/check-localhost and /api/editor-config with a fake key',
                new="answers GET /api/health with service 'whitecardopedia-local-dev' (DR-28 (A); TV's test answers /api/health, :25-26, :133-135), /api/check-localhost (still probed by VV's own modules) and /api/editor-config with a fake key"),
        ],
    },
]

# The proposed package (no wp_canonical.json record yet, so no overlay): rendered as F.8 C33.'''

K3_F8 = [
    Edit(T + 'r6_corrections.py', 'CORRECTIONS: rows C34-C36 appended after C32',
         "    },\n]\n\n# The proposed package (no wp_canonical.json record yet, so no overlay): rendered as F.8 C33.",
         NEW_ROWS,
         'Item 1 (W0-06 acceptance item 1 takes the exact text of R0.2.9 note), item 8/(i) (the R0.2.11 questions named where '
         'they gate work) and sweep (f) (W0-19 probe still /api/check-localhost against DR-28 (A)). Rows are applied to '
         'wp_canonical.json by k3_build.py through k3_f8_corrections.py, like C1-C33.',
         'W0-06 acceptance[1] still read "55/6/14/83/6/7/4/2 as S11 B3" and "DIV-1..DIV-4 permanent" after H2; '
         'release_rows_final.json recount 51/11/17/80/4/2/7/4/1; TV Na__Test__StatementServer__.py:25-26, :133-135; '
         'grep of wp_canonical.json for "Q-" found no question ids.'),
    Edit(T + 'r6_corrections.py', 'module docstring',
         "     ops of CORRECTIONS for C10-C32, PLANNER_OPS for the steps a row leaves to the planner or that",
         "     ops of CORRECTIONS for C10-C32 and C34-C36 (C34-C36 added by H1, the report's final cross-section\n"
         "     harmonisation, 01-Oct-2026), PLANNER_OPS for the steps a row leaves to the planner or that",
         'Docstring names the new rows.', ''),
    Edit(T + 'r6_corrections.py', 'rows(): numeric order',
         "    out.append((PROPOSED['id'], PROPOSED['item'], PROPOSED['finding'], PROPOSED['evidence'], PROPOSED['applied']))\n    return out",
         "    out.append((PROPOSED['id'], PROPOSED['item'], PROPOSED['finding'], PROPOSED['evidence'], PROPOSED['applied']))\n"
         "    return sorted(out, key=lambda r: int(r[0][1:]))       # C33 (PROPOSED) before the H1 rows C34-C36",
         'F.8 renders C10..C36 in numeric order now that rows follow C33.', ''),
    Edit(T + 'k3_f8_corrections.py', 'meta(): rows and by',
         "        'by': 'H2 (k3_build.py through k3_f8_corrections.py)',\n"
         "        'rows': 'Section F (report/R6__F_SwarmDelegationPlan.md), F.8 rows C1-C33',",
         "        'by': 'H2 (k3_build.py through k3_f8_corrections.py); rows C34-C36 added by H1 (01-Oct-2026) and applied the same way',\n"
         "        'rows': 'Section F (report/R6__F_SwarmDelegationPlan.md), F.8 rows C1-C%d' % max(int(c['id'][1:]) for c in K.CORRECTIONS),",
         'The f8_corrections block of wp_canonical.json names the row range it carries.', ''),
    Edit(T + 'k3_f8_corrections.py', 'module docstring',
         "Section F of the parity report corrects K3 in its F.8 rows C1-C33.",
         "Section F of the parity report corrects K3 in its F.8 rows C1-C36 (C34-C36 added by H1 on 01-Oct-2026).",
         'Docstring names the row range.', ''),
    Edit(T + 'k3_report_md.py', 'K3 md: Section F corrections paragraph',
         "corrects this catalogue in its F.8 rows C1-C33; '",
         "corrects this catalogue in its F.8 rows C1-C36 (C34-C36 added by the report\\'s final harmonisation, H1, 01-Oct-2026); '",
         'K3__WorkPackages.md states the F.8 row range it carries.', ''),
]

# =====================================================================================================
# 2. H2's record and validators: generalised to the H1 rows (they still check H2's own work exactly)
# =====================================================================================================
H2_TOOLS = [
    Edit(T + 'h2_record_corrections.py', 'ITEMS in numeric order',
         "ITEMS[K.PROPOSED['id']] = K.PROPOSED['item']\n",
         "ITEMS[K.PROPOSED['id']] = K.PROPOSED['item']\n"
         "ITEMS = collections.OrderedDict(sorted(ITEMS.items(), key=lambda kv: int(kv[0][1:])))   # H1: C34-C36 follow C33\n",
         'wp_corrections_applied.json lists rows C1-C36 in order.', ''),
    Edit(T + 'h2_record_corrections.py', 'record description',
         "('description', 'Every Section F (R6) F.8 correction (rows C1-C33) as applied to the K3 artefacts on 01-Oct-2026 by k3_build.py through '",
         "('description', 'Every Section F (R6) F.8 correction (rows C1-C33, and C34-C36 that H1 added) as applied to the K3 artefacts on 01-Oct-2026 by k3_build.py through '",
         'The record names the H1 rows.', ''),
    Edit(T + 'h2_validate.py', 'ROWS: every F.8 row id defined',
         "ROWS = {'C%d' % n for n in range(1, 34)}",
         "import r6_corrections as _K6, r6_prose as _T6  # noqa: E402  (H1: rows C34-C36 follow C1-C33)\n"
         "ROWS = {c[0] for c in _T6.CORRECTIONS} | {c['id'] for c in _K6.CORRECTIONS} | {_K6.PROPOSED['id']}",
         'h2_validate.py keeps passing with the H1 rows (its row set was hard-coded to C1-C33).', ''),
    Edit(T + 'h2_validate.py', 'check A label',
         "check('A', 'wp_corrections_applied.json: rows C1-C33, every applied row has a change, nothing unattributed',",
         "check('A', 'wp_corrections_applied.json: rows C1-C%d, every applied row has a change, nothing unattributed' % max(int(c[1:]) for c in ROWS),",
         'Label follows the row set.', ''),
    Edit(T + 'h2_diff_r6.py', 'NEW: the R6 that H2 wrote',
         "NEW = os.path.join(REPORT, 'R6__F_SwarmDelegationPlan.md')",
         "NEW = os.path.join(REPORT, 'R6__F_SwarmDelegationPlan.pre_h1.md')   # H2's own output, kept by H1 (which changed R6 after it)",
         'h2_diff_r6.py classifies H2\'s own diff; after H1 the live R6 also carries H1\'s rows, so it reads the snapshot H2 left '
         '(report/R6__F_SwarmDelegationPlan.pre_h1.md, as H2 kept *.pre_h2.md), byte-identical to H2\'s output.', 'cmp of the snapshot with R6 before any H1 change: identical'),
    Edit(T + 'critic/ids_check.py', 'DR ids read from dr_id',
         "drids = set(d.get('id') for d in dr)",
         "drids = set(d.get('dr_id') for d in dr)   # H1: decision_register.json keys DRs as dr_id (d.get('id') gave {None})",
         'Item 7: the critic helper read d.get(\'id\'), so every DR looked unknown; the register keys them dr_id.',
         'decision_register.json rows: keys dr_id, key, theme, ...'),
    Edit(T + 'critic/ids_check.py', 'skip backup copies',
         "    if not fn.startswith('R') or not fn.endswith('.md'): continue",
         "    if not fn.startswith('R') or not fn.endswith('.md') or '.pre_' in fn: continue   # H1: live sections only",
         'Item 7: the helper also scanned the *.pre_h2.md backups; a true result is for the live sections.', ''),
]

# =====================================================================================================
# 3. R6 prose and builder
# =====================================================================================================
R6 = [
    Edit(T + 'r6_prose.py', 'F.1 P15',
         r'''     "NA-only markers (`NaProjectPortal`, `30__TrueVision__AppContent`, `/na-apps/...` paths, the `/q/` and `/s/` resolvers, NA logo and letterheads, \"TrueVision 3D Project Hub\") never land in VV; features whose content is NA-only land switched off (Project QR DR-12, Statement Writer DR-10, site plans DR-08); brand lives in config values, keys stay TV's. One named exception: the TrueVisionHub statement section lands at TV's path, excluded from VV's DEFINITIONS by config and exempt from G4 by name (W4-12, F.8 C13).",
     "DR-43; K2 V1-V2; K3 R9; G4."),''',
         r'''     "NA-only markers (`NaProjectPortal`, `30__TrueVision__AppContent`, `/na-apps/...` paths, the `/q/` and `/s/` resolvers, NA logo and letterheads) never land in VV, and NA content never reaches a Vale user: features whose content is NA-only land switched off (Project QR DR-12, Statement Writer DR-10, site plans DR-08); brand lives in config values, keys stay TV's. The \"TrueVision 3D Project Hub\" statement section is present but never rendered: its module `LE/52__Feature__StatementWriter/09__Standard__Sections/Na__LayoutEditor__Statement__Standard__TrueVisionHub__.js` lands inert at TV's path with W4-12 (TV's Registry imports it statically), VV's config excludes it from DEFINITIONS (DR-43 default), and it is the one file G4 exempts by name (W0-04, F.8 C13).",
     "DR-43; K2 V1-V2; K3 R9; G4; R0 PD-15; R2 B.3.7."),''',
         'Item 3 / sweep (c): P15 listed "TrueVision 3D Project Hub" among markers that never land in VV, contradicting W4-12, '
         'R2 B.3.7 and R0 PD-15 (the module lands inert at TV\'s path and is never rendered). Governing DR-43: Hub option '
         '"exclude it from VV\'s DEFINITIONS via config"; default "Hub excluded".',
         'DR-43 options and default_if_unanswered; W4-12 vv_adaptations[1]; TVM .../Na__LayoutEditor__Statement__Standard__Registry__.js:140'),
    Edit(T + 'r6_prose.py', 'F.5.2 W0 entry',
         "inside the wave Adam commits W0-01's PLAN edit before W0-02 is dispatched, and W0-02 alone before the rest of W0 (F.8 C10); baselines of F.0 recorded by the integrator.\",",
         "inside the wave Adam commits W0-01's PLAN edit before W0-02 is dispatched, and W0-02 alone before the rest of W0 (F.8 C10); the front matter's questions that Wave 0 reads (R0.2.1 Q-VER; R0.2.11 Q-REG, Q-63, Q-BACKUP) answered or their defaults recorded by W0-01 (F.8 C35); baselines of F.0 recorded by the integrator.\",",
         'Sweep (i): the R0.2.11 questions referenced where they gate work.', 'R0 R0.2.1 Tier 2 table (Q-REG, Q-63, Q-BACKUP read by Wave 0)'),
    Edit(T + 'r6_prose.py', 'F.5.2 W1 entry',
         "before any W1 build is deployed (W1-19 re-normalises every sheet; recommended here, see F.5.7).\",",
         "before any W1 build is deployed (W1-19 re-normalises every sheet; recommended here, see F.5.7); R0.2.11 Q-COVER part (1), the boot cover's words on a cold document-tab press, answered or its default recorded before W1-33 is dispatched (F.8 C35).\",",
         'Sweep (i): Q-COVER gates W1-33.', 'R0.2.11 Q-COVER Gates column: W1-33'),
    Edit(T + 'r6_prose.py', 'F.5.2 W6 entry',
         "chose keep or archive for 35's Vale title-block material (F.8 C31) and, for 62 -> 92, answered D-S01-08 (a).\",",
         "chose keep or archive for 35's Vale title-block material (R0.2.11 Q-35ASSETS, F.8 C31) and, for 62 -> 92, answered D-S01-08 (a); if TV has merged its own 63 first, Q-63 (b) travels with W6-03 (F.8 C35).\",",
         'Sweep (i): Q-35ASSETS and Q-63 gate W6-03.', 'R0.2.11 Q-35ASSETS and Q-63 Gates columns'),
    Edit(T + 'r6_prose.py', 'F.5.4 W6 item 1',
         "35's VizDpt and RecConcept title-block files are kept or archived as Adam chose (W6-03, F.8 C31).",
         "35's VizDpt and RecConcept title-block files are kept or archived as Adam chose (W6-03, F.8 C31; R0.2.11 Q-35ASSETS).",
         'Sweep (i): Q-35ASSETS named in the smoke item it closes.', ''),
    Edit(T + 'r6_prose.py', 'F.5.5 version step: thirteen .1 fixes',
         "every feature release steps the minor number and twelve follow-up fixes take `.1`",
         "every feature release steps the minor number and thirteen follow-up fixes take `.1`",
         'R0 (Q-VER) counts 13 `.1` releases after v2.22.0; R6 said twelve. The devlog has 13: v2.22.1, 31.1, 44.1, 45.1, 47.1, '
         '48.1, 49.1, 50.1, 54.1, 56.1, 58.1, 59.1, 66.1.',
         'grep -c "^## ValeVision3D v2.(22-71).[1-9]" VV/ValeVision__DEVLOG__.md = 13 (lines 509 ... 3816)'),
    Edit(T + 'r6_prose.py', 'F.8 C6 row: count and note for R0',
         "then minor steps from v2.22.0 to v2.71.0 with `.1` only for twelve follow-up fixes;",
         "then minor steps from v2.22.0 to v2.71.0 with `.1` only for thirteen follow-up fixes;",
         'Same count as F.5.5 and R0 Q-VER (13).', 'as above'),
    Edit(T + 'r6_prose.py', 'F.8 C6 row: note for R0 now answered',
         "Note for R0: Q-VER says minor bumps since v2.16.0, but v2.21.1-v2.21.21 were patch steps.\"),",
         "Note for R0: Q-VER said minor bumps since v2.16.0, but v2.21.1-v2.21.21 were patch steps (R0's Q-VER now records both, H1).\"),",
         'R0 Q-VER (R0.2.1 row 8) already records the patch run v2.21.1-v2.21.21; the note was stale.', 'R0 R0.2.1 Tier 1 row 8'),
    Edit(T + 'r6_prose.py', 'F.6 template: decisions and notes lines',
         "- Decisions you implement: <DR-nn: answer or \"default: ...\">, ...",
         "- Decisions you implement: <DR-nn: answer or \"default: ...\">, ... and every front-matter question your notes or acceptance name\n"
         "  (<Q-xx: answer or \"default: ...\">; R0.2.1, R0.2.11; W0-01 records them)",
         'Sweep (i): a brief carries the R0.2.11 question its package names (F.8 C35).', ''),
    Edit(T + 'r6_build_sectionF.py', 'Headline: identical-experience caveat',
         "The counts include W5-07 (retiring the Layout Mode switch), the conditional package F.8 C33 added to `wp_canonical.json` on 01-Oct-2026 with the other F.8 corrections.'",
         "The counts include W5-07 (retiring the Layout Mode switch), the conditional package F.8 C33 added to `wp_canonical.json` on 01-Oct-2026 with the other F.8 corrections. '\n"
         "  'Run on the K1 defaults alone, the programme ends with an editor that matches TrueVision\\'s code and behaviour but still differs on screen in the thirteen ways the front matter lists (R0.1.8, E1-E13): '\n"
         "  'for example four tabs, not five, while DR-10 keeps the Statement Writer switched off; each row there names the answer or live action that removes the difference, and two of them (the lazy loader\\'s first-open cover and Vale\\'s brand content) are permanent by design.'",
         'Sweep (g): R6 did not state the identical-experience caveat that R0.1.8 and R4 D.5 #8 give.', 'R0 R0.1.8 E1-E13; R4 D.5 #8'),
    Edit(T + 'r6_build_sectionF.py', 'F.8 intro: rows C34-C36',
         "C33 proposed one new conditional package, W5-07. On 01-Oct-2026 (H2)",
         "C33 proposed one new conditional package, W5-07. C34-C36 were added by the report\\'s final cross-section harmonisation (H1, 01-Oct-2026): W0-06\\'s watermark tally and DIV-3 status in the words of the front matter\\'s R0.2.9 note (C34), the front matter\\'s open questions named in the packages they gate (C35) and W0-19\\'s statement test server answering `/api/health` (C36); `k3_build.py` applied them like the others. On 01-Oct-2026 (H2)",
         'Item 1: the new F.8 rows are introduced; F.8 stays the audit trail.', ''),
    Edit(T + 'r6_build_sectionF.py', 'F.8 intro: C6 count',
         "The rows below are the audit trail, unchanged; the last line of each says how it reached the JSON (C5 and C8 change nothing in K3).'",
         "The rows below are the audit trail, unchanged except the count of `.1` fixes in C6, which H1 corrected from twelve to thirteen; the last line of each says how it reached the JSON (C5 and C8 change nothing in K3).'",
         'Records the one H1 change to an existing row.', ''),
    Edit(T + 'r6_build_sectionF.py', 'F.6.1 brief: W1-33 rows (C22, C35)',
         "assert p.get('f8_corrections') == ['C22'], p.get('f8_corrections')\n"
         "A('- F.8 corrections that name W1-33 (its f8_corrections): C22 - the seam that carries \"immediate\", the .na-vs-tl')\n"
         "A('  selector and the bare-stage check; in wp_canonical.json since 01-Oct-2026, so already in the text below.')",
         "assert p.get('f8_corrections') == ['C22', 'C35'], p.get('f8_corrections')\n"
         "A('- F.8 corrections that name W1-33 (its f8_corrections): C22 - the seam that carries \"immediate\", the .na-vs-tl')\n"
         "A('  selector and the bare-stage check; C35 - the note naming the front matter\\'s Q-COVER; in wp_canonical.json since')\n"
         "A('  01-Oct-2026, so already in the text below.')",
         'C35 adds a Q-COVER note to W1-33; the brief asserts its F.8 rows.', ''),
    Edit(T + 'r6_build_sectionF.py', 'F.6.1 brief: decisions line names Q-COVER',
         "A('  DR-39 TV wording, TV\\'s in-host veil with the fold visible, a veil for the first drawing after a document tab.')",
         "A('  DR-39 TV wording, TV\\'s in-host veil with the fold visible, a veil for the first drawing after a document tab;')\n"
         "A('  R0.2.11 Q-COVER: part (2) is the C22 seam in section 4; part (1), what the boot cover says on a cold document-tab')\n"
         "A('  press, is Adam\\'s (default: the drawing cover\\'s headline with VV\\'s two pre-load lines and no drawing job).')",
         'Sweep (i): Q-COVER referenced in the brief of the package it gates.', ''),
    Edit(T + 'r6_build_sectionF.py', 'F.6.1 brief: notes line (as the template)',
         "A('  - plus the standard seams: VALEVISION3D banner, [ValeVision3D LayoutEditor] console prefix, PORT NOTE block.')\n",
         "A('  - plus the standard seams: VALEVISION3D banner, [ValeVision3D LayoutEditor] console prefix, PORT NOTE block.')\n"
         "A('- Notes: ' + ('; '.join(p['notes']) if p.get('notes') else 'none'))\n",
         'The filled brief now follows its template, which has a Notes line (the Q-COVER note lives there).', ''),
    Edit(T + 'r6_build_sectionF.py', 'F.6.1 brief: stop rule names Q-COVER',
         "A('- a gate fails twice on your files; DR-39 has been answered differently from the default above.')",
         "A('- a gate fails twice on your files; DR-39 or Q-COVER (1) has been answered differently from the default above.')",
         'Sweep (i).', ''),
]
