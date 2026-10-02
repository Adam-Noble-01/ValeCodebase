# Harmonisation log - H1, final cross-section harmonisation (01-Oct-2026)

Scope: the cross-section follow-ups 1-8 left by the section revisers and the sweep (a)-(i) over R0-R6 and the K documents. Read-only on both apps, NAAPPS and WCP (TV read at b2aa9151, VV at 7b4e593a; every code fact below was re-opened on 01-Oct-2026). Every write is inside `parity/`.

## How the changes were made

- **Generated files were changed only through their generators or inputs**, then rebuilt: K1 (`k1_build_register.py`), K2 (`k2_build_maps.py`), K3 and its F.8 layer (`k3_build.py` -> `k3_f8_corrections.py` -> ops in `r6_corrections.py`), the F.8 record (`h2_record_corrections.py`), R0 (`r0_assemble.py`), R2 (`r2b_render.py`), R5 (`r5_inventory.py`, `r5_assemble.py`) and R6 (`r6_build_sectionF.py`). R1, R3, R4, `K2__NamingRulebook.md` and the prose of `K2__TargetMaps.md` (outside its `BEGIN:K2`/`END:K2` tables) are hand-maintained and were patched directly.
- **One script does it all, re-runnably:** `parity/report/tools/h1_harmonise.py` applies every edit (definitions in `h1_edits_tools.py`, `h1_edits_gen.py`, `h1_edits_docs.py`; exact-snippet patcher `h1_patchlib.py`, which keeps each file's line ending and refuses an edit whose old text is gone), rebuilds the generated files in dependency order (K1 -> K2 -> K3 -> F.8 record -> R6 -> R2 -> R5 -> R0) and runs every validator. A second run changes nothing (md5 of every report, data and fragment file identical; `h1work/md5_a.txt`, `md5_b.txt`). If `r0_revise.py` is ever re-run it restores `r0_source.md` from `r0_revise_base/`; run `h1_harmonise.py` after it.
- **Before-images:** every file H1 touched was copied first to `parity/h1work/pre_h1/` (reports, data, tools, R5 fragments); per-file diffs of the final state are in `parity/h1work/diffs/`. This log is written by `h1_write_log.py` from `parity/h1work/h1_edit_record.json`.
- **A defect found and fixed during the work:** the first version of `h1_patchlib.py` re-applied insertion edits whose new text contains their anchor (old text), which duplicated six inserts on a second run. The run was discarded: every touched file was restored byte for byte from `h1work/pre_h1/` (0 differences on check), the patcher now tests for the new text first, and the pipeline was run once from the restored baseline. H2's mark check (`h2_validate.py` check O) also caught that a C35 note citing "(F.8 C31)" in brackets read as a change mark; the note now says "which F.8 C31 set".

## Follow-ups 1-8: disposition

| # | Follow-up | Done | Where (edits below) |
|---|---|---|---|
| 1 | R0 -> R6: F.8 row replacing W0-06 acceptance item 1 with the R0.2.9 text | New F.8 row **C34** (two ops on W0-06 acceptance item 1: the watermark clause takes R0.2.9's exact text, with the path given from `parity/`; DIV-3 listed closed). H2 had not applied it (item 1 still read "55/6/14/83/6/7/4/2 as S11 B3"). R0.1.1, R0.2.9 note and the DIV-3 row now say it is applied. | r6_corrections.py C34; r0_source.md; r0_build_decisions.py |
| 2 | R0 -> R3: C.6 service worker; C.4 R0 column | C.6 row now "Resolved in code (R0 P10; R6 F.8 C5; K3 section 14)" with the one live check left. C.4 R0 column: S10 PD-20, S13 PD-21, S17 PD-22, S18 PD-23, S19 PD-24, S23 PD-25 as asked; checked every row against R0.3's seam list and also aligned S7 (R0.3.6 Layout Mode), S11 (PD-03, PD-12), S14 (R0.3.6 Snapping), S16 (PD-12, PD-20), S20 (PD-02, DIV-2). h1_check M proves the 23 rows equal R0.3's list. | R3 edits |
| 3 | R0 -> R6/K3: the "TrueVision 3D Project Hub" | Governing DR-43 (Hub option "exclude it from VV's DEFINITIONS via config", default "Hub excluded"): the module lands inert at TV's path, is never rendered, and is G4's one named exception. R6 P15 and K2 V2 rewritten to say so; R0 PD-15 corrected where it credited DR-43 with an option it does not list; R2 B.3.7/B.0 #7/B.5 #3 marked settled. K3 W0-04 already carried the named exception in vv_adaptations[1] and acceptance[1] and gate G4 (H2 applied F.8 C13) - verified, no further K3 change. | r6_prose.py P15; K2 rulebook V2; r0_source.md PD-15; r2b_render.py |
| 4 | R4 -> K2: 62 -> 92 | Governing DR-03 (recommendation "keep 62 for now", default "62 unchanged") and K3 W6-03 ("only if D-S01-08 (a)"): TF-T32 is now action **keep** (target 62, phase "W3 (only on request; K3 W6-03)"), FR-22 stays the optional move with the same phase, the collision table says "kept (DR-03 default)" and keeps 92 reserved; K2 headline, registry, section 10 and rulebook N3/ruling 8 reworded; R0 PD-17 and R1 A.2.7 aligned. R1, R2, R4, R5, R6 and K3 already said "only on request". | k2_build_maps.py; K2 docs; r0_source.md; R1 |
| 5 | R6 -> R1/R2: W0-01 commit before W0-02; G4 exemption wording | R1 A.3.2 Step 0 #1 now requires Adam's W0-01 PLAN commit in HEAD (the Wave 0 deadlock, F.8 C10); #2, Step 4, A.3.3 and A.4 #6/#8 aligned with R6 F.5.2 and K3 R11. The G4 exemption (whole PORT NOTE block, history documents incl. `__NOTES__`, the named TrueVisionHub file, baseline allow-list WARN) now reads the same in R1 (A.3.4 risk 2), R2 (B.1, B.3.1), R6 (F.5.1, P7, RK-11), R0 (PD-12) and the K2 rulebook (gate 3). | R1; r2b_render.py; r0_source.md; K2 rulebook |
| 6 | R5 -> R6: README owners | Confirmed in wp_canonical.json: `README__PublishedDocuments__.md` is a W4-17 target and edit (F.8 C30), `README__SpellCheck__.md` a W2-34 target and edit. R5 E.3 said the first had no package and `r5_assemble.py` failed its own assertion after H2; template, inventory owner and assertion fixed; E.3 row now "W4-17". | R5_template.md; r5_inventory.py; r5_assemble.py |
| 7 | critic ids_check.py | Read `dr_id` (it read `id`, so its DR set was {None} and it flagged every DR in every section, run shown below); skips `*.pre_*` backups. Run: every section "bad []" for packages, DRs, TFs and FRs. | critic/ids_check.py |
| 8 | Open issues from the writers | R3: W2-34 probe settled by C28 (and W0-19's statement test server by new **C36**); W4-17 localhost URL settled by C30; W0-09 restart line by C16 - R3 C.5/C.6, R0 PD-23 updated. R2: SectionClipping header (C12) and 41 README (C14) settled - R0 DIV-2/PD-02, R1, R2, R5 updated. R1: the 63 branch is R0 Q-63 and the registry gap Q-REG - both already in R0, now cited in R1 and named in the gated packages (new **C35**). R4: the "immediate" seam is settled by C22 (R0 Q-COVER part 2 marked settled), the cold document-tab cover wording is Q-COVER part 1 (Adam's), W1-34's acceptance settled by C23 (R4 D.5 #2 also gains the re-render call site, TV TabStrip :370). R5: v2.92.0 is outside the alignment by DR-44, and the twelve TV-only 3D-tab files (07, 11, 15 x2, 21, 26 x6, 70) are out of scope by R0's scope rule - explicit in R0.0 and R5 E.2.5. No new Q-xx was needed. | r6_corrections.py C35, C36; R3; r0_source.md; R4; R5_template.md |

## Sweep (a)-(i): result

| | Fact | Result |
|---|---|---|
| a | Release watermark and class tallies | One tally everywhere: 51 ported / 11 partial / 17 pending / 80 never considered / 4 reopened / 2 deliberate / 7 not drawing / 4 VV-origin / 1 n/a, 112 open (recount of `release_rows_final.json`). W0-06 (JSON, R6 F.3) now carries it (C34). K1 DR-01 said "17 are parked" of the 88 later releases; 7 of the 88 are (17 over all 177 rows) - corrected. |
| b | Folder renumber targets and timing | 42-47 -> 40, 42-46 and legacy 40 -> 91 in W0-02 (K2 "W1") everywhere; 62 stays and moves to 92 only on request (W6-03) everywhere, K2 JSON included. K2 top-level renumber count is now 7, matching "seven folder moves". |
| c | Hub and other NA content | Hub: inert, never rendered, one G4 exception (R0 PD-15, R2 B.3.7, R6 P15, K2 V2, K3 W0-04/W4-12/G4). Other NA content (QR/Portal, letterheads, NA scan, site-plan furniture and OS licence, PDF.js path, T01-T04) reviewed in R0 PD-15/R0.3.4, R2, R3 S2, R4 D.3 and W4-xx: consistent, no change. |
| d | Service-worker question | Resolved in code, one live check at the W0 deploy: R0 P10, R1 A.4 #11, R3 C.6, R6 F.8 C5, K3 section 14 and now K2 sections 9 and 12 (which also cited :157 for the token; the token is :68). |
| e | positionMm sign | Code re-read: VV builds a plan cut through normal (0,-1,0) x (-h) (`SectionAdapter__.js:298-300`, `:243`), so constant = +h (`SystemLogic.js:567`), and saves -constant = -h (`:1502`); TV holds constant = +h (`Engine__.js:132-134`, `:360-367`) and saves +constant (`Serialize__.js:194`). R0 DIV-2, R3 S4/C.5, R6 WT-02 and K1 DR-41 all say VV -h, TV +h, TV's comment wrong (TD06 = VV). Only K1's evidence line range was off by one (:292-299/:297-299 -> :292-300/:297-300). |
| f | Transport facade and local-server probe | Facade per DR-27 (A) consistent in R3, R6 P11, K1. Probe per DR-28 (A) (`/api/health`, service `whitecardopedia-local-dev`): W2-34 fixed by C28; W0-19's adapted statement test server still answered only `/api/check-localhost` - fixed by C36 (TV's test answers `/api/health`, :25-26, :133-135). |
| g | Identical-experience caveat | R0 executive summary and R0.1.8 (13 differences, E1-E13; four tabs while DR-10 is off) unchanged; R4 D.5 #8 now points to R0.1.8; R6 had no caveat - its headline now states it. |
| h | NA job phases | JSON: T01-T04 appear only inside "never NA's T01-T04" / "no T01-T04" (C21). Text: the Vale example `2026/3047__Doous_T01_D01` in R0 PD-20, R3 S10 and K1 DR-11 became `2026/3047__Doous_D01` (the DR-11 default form). Left verbatim: the title of finding S07a-V01 in K1's raw-id index (evidence) and the old texts quoted in the F.8 C21/C34 audit rows. |
| i | Ids and Q-xx | critic `ids_check.py` (fixed) and `h1_check.py` check I: every DR, package, TF, FR, F.8 row (C1-C36) and Q id cited in R0-R6, K1-K3 and the K JSON exists. Check Q: every Q-xx is named in each package of its Gates column (C35), and R6 F.5.2, the F.6 template and the F.6.1 brief cite them. |
| + | H2-derived figures (not in (a)-(i) but stale after H2) | R0: 165 packages (153 VV, 154,649 lines), 93 hot files (ModeController 20, AppConfig 17, Loader 16), 24 hard gates (W5-07), critical path 65,429 over 53 (56 by count), W5 chain W5-01 -> W5-05 -> W5-07 -> W5-99 (1,570), DR-01 gates 122 in W1-W6, the R0.2.7 note (C1 applied), E2 and R0.3.6 (W5-07 retires the switch). R3 DAG note (165), R4 D.1.5 case 8. R0's decision tables were regenerated from the H2 JSON (DR-01 124, DR-22 10, DR-25 8 with hard gate W5-07). R6 F.5.5 and F.8 C6 said twelve `.1` fixes after v2.22.0; the devlog has thirteen (R0 already said 13). |

## Reviewed and left unchanged

- K3 W0-04 acceptance and G4: the named TrueVisionHub exception was already applied by H2 (F.8 C13); no new edit (follow-up 3).
- K3 W0-03 acceptance item 3 ("PORT NOTE 'Ported from' lines excepted"): W0-03's own grep for a `[TrueVision3D` prefix or `TRUEVISION3D` banner, run before G4 exists; after W0-03's two fixes no such hit sits anywhere else in a PORT NOTE block (F.8 C13's grep), so it holds as written and is not the G4 exemption.
- R6 F.8 rows C8 and C13 keep their original findings (65,179; "exempts only PORT NOTE 'Ported from' lines") as the audit trail; their status lines already give the corrected state.
- K1 raw-id index row S07a-V01 keeps the finding's verbatim title ("prints 2026/3047__Doous_T01_D01").
- R0 executive summary's end-state paragraph (thirteen ways) and R0.1.8 E1-E13: consistent with R4 and the JSON; no change.
- R1 A.3.1 history-document list (devlog, ledger, `__PLAN__`, `Research__`, `TASK__`) describes `k2_renumber_apply.py`'s own skip pattern (`HISTORY` regex, :42), not G4; correct as written.
- h2_diff_r6.py now classifies H2's diff against the R6 H2 wrote (the pre-H1 snapshot, byte-identical); its own rule ("F.8 rows unchanged") is H2's, not H1's.

## Validation (final run, `h1work/second_run.txt`)

~~~~text
  k1_build_register.py         exit 0  wrote C:\Users\adamw\AppData\Local\Temp\claude\C--Users-adamw-AppData-Roaming-SketchUp-SketchUp-2026-SketchUp-Plugins\a1674149-918e-4d62-a79a-e7961f10
  k2_build_maps.py             exit 0  VALIDATION: PASS
  k3_build.py                  exit 0  written; independent re-check: PASS
  h2_record_corrections.py     exit 0  unattributed: none
  r6_build_sectionF.py         exit 0  wrote C:\Users\adamw\AppData\Local\Temp\claude\C--Users-adamw-AppData-Roaming-SketchUp-SketchUp-2026-SketchUp-Plugins\a1674149-918e-4d62-a79a-e7961f10
  r2b_render.py                exit 0  written C:\Users\adamw\AppData\Local\Temp\claude\C--Users-adamw-AppData-Roaming-SketchUp-SketchUp-2026-SketchUp-Plugins\a1674149-918e-4d62-a79a-e7961f
  r5_inventory.py              exit 0  E.5 rows 102 {'ported': 80, 'vv-owned environment': 7, 'excluded': 3, 'ported (replaces VV copy)': 6, 'vv-owned suite': 3, 'vv-has, re-run': 1, 'vv-ow
  r5_assemble.py               exit 0  {'N_OPEN': '112', 'N_E3': '265', 'N_E3_LE': '186', 'N_E3_LE_L': '72,656', 'N_E3_L': '100,039', 'N_E3_OUT': '79', 'N_E3_OUT_L': '27,383', 'N_WPFIX': '7
  r0_assemble.py               exit 0  warnings 0
  k1_check_register.py         exit 0  PASS
  k2_validate_maps.py          exit 0  VALID
  k3_verify_outputs.py         exit 0  OK   wave barrier: every scribe closes its wave; every package reaches the previous scribe
  r6_check_md.py               exit 0  PASS
  r6_check_mermaid.py          exit 0  PASS
  h2_validate.py               exit 0  14 checks, 0 failed
  r3_check_tables.py           exit 0  problems: 0
  r4_check_section.py          exit 0  findings cited 21 missing []
  r1_check_paths.py            exit 0  ok     VVM/35__System__PageLayoutSystem/02__VizDpt__TitleBlock__Pdf__/
  critic/ids_check.py          exit 0  R6__F_SwarmDelegationPlan.md wp refs 165 bad [] | DR bad [] | TF bad [] | FR bad []
  h1_check.py                  exit 0  11 checks, 0 failed
validators failing: none
~~~~

`h1_check.py` (H1's own checks, read-only; re-reads the code for (e)):

~~~~text
PASS I   every DR, package, TF, FR, F.8 row and Q id cited in R0-R6, K1-K3 and the K JSON exists
         14 documents, Q ids ['Q-35ASSETS', 'Q-63', 'Q-AZIMUTH', 'Q-BACKUP', 'Q-COVER', 'Q-REG', 'Q-VER'], F.8 rows C1-C36
PASS Q   every front-matter question is named in each package of its Gates column (wp_canonical.json)
         Q-35ASSETS -> W0-16/W6-03, Q-63 -> W0-06/W6-03, Q-AZIMUTH -> W1-10/W2-05, Q-BACKUP -> W0-09, Q-COVER -> W1-33, Q-REG -> W0-04/W0-06, Q-VER -> W0-01
PASS A   one release tally (51/11/17/80/4/2/7/4/1, 112 open; 7 of the 88 parked); W0-06 item 1 = R0.2.9 note text
         recount (51, 11, 17, 80, 4, 2, 7, 4, 1) open 112; stale []; note found True
PASS B   62 stays (DR-03 default) and moves to 92 only on request everywhere; legacy 40 -> 91 in W0-02
         TF-T32 keep/02__Src__AppModules/62__Feature__EmailWorkers//W3 (only on request; K3 W6-03); FR-22 W3 (only on request; K3 W6-03)
PASS C   Hub section: lands inert at TV's path, never rendered, one named G4 exception (R0 PD-15, R2 B.3.7, R6 P15, K2 V2, K3)
         | P15 | Identity: NA content never ships | NA-only markers (`NaProjectPortal`, `30__TrueVision__AppContent`, `/na-apps/...` paths, the `/q/` and `/s/` resolvers
PASS D   service-worker question resolved in code (one live check left) in R0, R3, R6, K2, K3
PASS E   positionMm sign: VV stores -h (SystemLogic :1502), TV +h (Serialize :194); R0, R3 S4/C.5, R6 WT-02 and K1 DR-41 say so
         code True texts True
PASS F   local-server probe: /api/health with service whitecardopedia-local-dev for W2-34 and W0-19 (DR-28 (A)); facade per DR-27 (A)
PASS G   end-state caveat (thirteen on-screen differences on the K1 defaults; four tabs while DR-10 is off) in R0, R4 and R6
PASS H   no NA job phase (T01-T04) in Vale acceptance text, adaptations, notes or examples (JSON; R0-R5; K1 DR-11)
PASS M   R3 C.4 R0 column = R0.3 seam list (S1-S23); R0 carries the post-H2 counts (165, 93, 65,429, W5-07, 24 hard gates)
         counts True
11 checks, 0 failed
~~~~

The critic helper before the fix (pre-H1 copy, same data): `165 1 113 25` - one DR id, `None` - and every section listed DR-01 ... DR-44 as bad. After: `165 44 113 25` and every section `bad []`.

## Files changed

| File | Kind | Changed lines vs pre-H1 |
|---|---|---|
| `report/K1__DecisionRegister.md` | section / K doc | 8 |
| `report/K2__NamingRulebook.md` | section / K doc | 8 |
| `report/K2__TargetMaps.md` | section / K doc | 28 |
| `report/K3__WorkPackages.md` | section / K doc | 2 |
| `report/R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md` | section / K doc | 66 |
| `report/R1__A_FolderNaming_FolderDivergence.md` | section / K doc | 57 |
| `report/R2__B_ModuleNaming_Divergence.md` | section / K doc | 38 |
| `report/R3__C_WiringRequirements.md` | section / K doc | 50 |
| `report/R4__D_BroaderUiParity.md` | section / K doc | 52 |
| `report/R5__E_ParityMatrix_Watermark_Inventory.md` | section / K doc | 22 |
| `report/R6__F_SwarmDelegationPlan.md` | section / K doc | 44 |
| `data/decision_register.json` | canonical data | 8 |
| `data/file_rename_map.json` | canonical data | 4 |
| `data/target_folder_map.json` | canonical data | 10 |
| `data/wp_canonical.json` | canonical data | 76 |
| `data/wp_corrections_applied.json` | canonical data | 171 |
| `report/tools/r5work/frag_E3_inventory.md` | R5 fragment (generated) | 2 |
| `report/tools/r5work/tv_only_inventory.json` | R5 fragment (generated) | 4 |
| `k2work/k2_tables.json` | K2 tables (generated) | - |
| `report/R6__F_SwarmDelegationPlan.pre_h1.md` | new: the R6 H2 wrote, kept (like `*.pre_h2.md`) for `h2_diff_r6.py` | - |
| `report/tools/h1_*.py` | new: H1 scripts (patcher, edits, runner, checks, this log) | - |

## Changes in the generated outputs (rebuilt; before -> after)

These follow from the edits listed after this section; nothing here was hand-edited. Lines are cut at 500 characters; the full unified diffs are in `parity/h1work/diffs/`.

### `report/R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md`

~~~~diff
@@ -33,0 +34 @@
+  - TV v2.92.0, the presentation batch export (DR-44: outside this alignment unless Adam wants it), and the twelve TV-only 3D-tab files no drawing package needs: `07` DefaultFogEffect, `11` ViewModeFov DevControls, `15` InstanceConsolidation and LineworkColours, `21` Visibility StateCapture, `26` model-group and storey UI (six files; the model-group selector and its overlay also fall under DR-09 (a)) and `70` AssetCullDistance DevControls (R2 B.4.2, R5 E.2.5). TV's `15` MultiModel imports two o [...]
@@ -61 +62 @@
-| Work packages | `parity/data/wp_canonical.json` (164 packages, DAG, critical path, tests); `parity/data/wp_raw_map.json` (221 raw ids mapped); `parity/data/hot_file_ownership.json` (92 files) | W0-nn ... W6-nn, WT-nn |
+| Work packages | `parity/data/wp_canonical.json` (165 packages, DAG, critical path, tests; every Section F correction applied, recorded in `parity/data/wp_corrections_applied.json`); `parity/data/wp_raw_map.json` (221 raw ids mapped); `parity/data/hot_file_ownership.json` (93 files) | W0-nn ... W6-nn, WT-nn |
@@ -67 +68 @@
-1. **DR ids gate packages.** Each K3 package lists `gated_by`. When a DR is unanswered, the package runs on that DR's default, unless its `hard_gate` says it must wait. 23 packages are hard-gated:
+1. **DR ids gate packages.** Each K3 package lists `gated_by`. When a DR is unanswered, the package runs on that DR's default, unless its `hard_gate` says it must wait. 24 packages are hard-gated:
@@ -71 +72 @@
-   - W5-04, W5-05, W5-06;
+   - W5-04, W5-05, W5-06, W5-07;
@@ -118 +119 @@
-| Releases | v2.24.0 to v2.172.0 (177 rows classified) | v2.16.0 to v2.71.0 (the drawing-system releases) | 51 ported, 11 partial, 17 pending sign-off, 80 never considered, 4 reopened by K1 defaults, 2 deliberately not ported, 7 not drawing work, 4 VV-origin, 1 not applicable. **112 open** (partial, pending, never considered and reopened), 28 of them at or below the high-water mark | Section E (E.1.1, E.1.2), data `report/tools/r5work/release_rows_final.json`, recounted 01-Oct-2026. It corrects [...]
+| Releases | v2.24.0 to v2.172.0 (177 rows classified) | v2.16.0 to v2.71.0 (the drawing-system releases) | 51 ported, 11 partial, 17 pending sign-off, 80 never considered, 4 reopened by K1 defaults, 2 deliberately not ported, 7 not drawing work, 4 VV-origin, 1 not applicable. **112 open** (partial, pending, never considered and reopened), 28 of them at or below the high-water mark | Section E (E.1.1, E.1.2), data `report/tools/r5work/release_rows_final.json`, recounted 01-Oct-2026. It corrects [...]
@@ -123,2 +124,2 @@
-| Work | - | - | 221 raw packages merged into 164: 152 VV packages in W0-W6 (about 154,399 estimated lines, plus W5-06 unestimated) and 12 TV-lane packages (4,010 lines) | K3 section 1; `wp_canonical.json` |
-| Contention | - | - | 92 files are written by more than one package. The worst are the LE ModeController (19 packages), the LE AppConfig (16) and the Loader (15) | `hot_file_ownership.json` |
+| Work | - | - | 221 raw packages merged into 164, plus W5-07 that R6 F.8 C33 added: 165 - 153 VV packages in W0-W6 (about 154,649 estimated lines, plus W5-06 unestimated) and 12 TV-lane packages (4,010 lines) | K3 section 1; `wp_canonical.json` |
+| Contention | - | - | 93 files are written by more than one package. The worst are the LE ModeController (20 packages), the LE AppConfig (17) and the Loader (16) | `hot_file_ownership.json` |
@@ -201 +202 @@
-| P1 | Adam answers DR-01 to DR-07 (or accepts the K1 defaults in writing) and the devlog version-step question (R0.2.1, Q-VER). He also sees the six questions this report raised (R0.2.11). Each has a default; three of them (Q-REG, Q-63, Q-BACKUP) are read by Wave 0. W0-01 records each answer as a VV D-number continuing D01-D40 in `VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md`. | Adam, then W0-01 | K1 section 1; K3 W0-01; DR-35; R0.2.11 |
+| P1 | Adam answers DR-01 to DR-07 (or accepts the K1 defaults in writing) and the devlog version-step question (R0.2.1, Q-VER). He also sees the six questions this report raised (R0.2.11). Each has a default; three of them (Q-REG, Q-63, Q-BACKUP) are read by Wave 0. W0-01 records each answer as a VV D-number continuing D01-D40 in `VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md`, and each question is named in the packages it gates (R6 F.8 C35). | Adam, then W0-01 | K1 section 1; K3 W0-0 [...]
@@ -210 +211 @@
-| P10 | **Resolved in code; one live check left.** VV registers Whitecardopedia's worker, never `live_sw.js`:<br>- `VV/index.html:34` loads WCP's Url constructor and `:44` its registrar;<br>- the registrar registers `getServiceWorkerUrl()` (Registrar `:97-105`, `:191-195`), which resolves the WebApps-root stub `Na__Pwa__ServiceWorker__.js` (Url constructor `:38`, `:225-231`). On WCP's dev port, Flask serves the stub at the origin root (`WCP/server.py:915-928`);<br>- the stub `importScripts` the [...]
+| P10 | **Resolved in code; one live check left.** VV registers Whitecardopedia's worker, never `live_sw.js`:<br>- `VV/index.html:34` loads WCP's Url constructor and `:44` its registrar;<br>- the registrar registers `getServiceWorkerUrl()` (Registrar `:97-105`, `:191-195`), which resolves the WebApps-root stub `Na__Pwa__ServiceWorker__.js` (Url constructor `:38`, `:225-231`). On WCP's dev port, Flask serves the stub at the origin root (`WCP/server.py:915-928`);<br>- the stub `importScripts` the [...]
@@ -221 +222 @@
-| W5 | W5-01 -> W5-05 -> W5-99 | 1,320 | W5-05 runs only if Adam picks a Vale QR resolver (DR-12). Without it, the W5 chain is W5-02 -> W5-03 -> W5-99 (750 lines). W5-06, the site-plan pipeline (XL, unestimated), joins only under DR-08 (A) |
+| W5 | W5-01 -> W5-05 -> W5-07 -> W5-99 | 1,570 | W5-05 runs only if Adam picks a Vale QR resolver (DR-12), and W5-07 (R6 F.8 C33) only if he answers DR-25 'retire' at W4-09. Without the conditional packages (W5-04 to W5-07), the W5 chain is W5-02 -> W5-03 -> W5-99 (750 lines). W5-06, the site-plan pipeline (XL, unestimated), joins only under DR-08 (A) |
@@ -223 +224 @@
-| **All** | **52 packages** (55 by package count) | **65,179** | Every wave starts only after the previous wave's Parity Scribe pass; Adam commits once per wave (K3 R11) |
+| **All** | **53 packages** (56 by package count) | **65,429** | Every wave starts only after the previous wave's Parity Scribe pass; Adam commits once per wave (K3 R11) |
@@ -241 +242 @@
-| T11 | **Parallel agents collide on shared files.** 92 files are written by more than one package. Parallel sessions also bump the VV devlog. | `hot_file_ownership.json` | DR-05 one owner per file; the serial orders in `hot_file_ownership.json`; scribe-only records (K3 R5) |
+| T11 | **Parallel agents collide on shared files.** 93 files are written by more than one package. Parallel sessions also bump the VV devlog. | `hot_file_ownership.json` | DR-05 one owner per file; the serial orders in `hot_file_ownership.json`; scribe-only records (K3 R5) |
@@ -256 +257 @@
-| E2 | On a project whose Layout Mode is off: no tab strip, so no header fold (R4 D.1.5 case 8) | No such switch: the strip shows whenever the editor is enabled and a sheet exists (`TVM/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__TabStrip__.js:316`) | Adam re-decides DR-25 at the publishing port (W4-09) and retires the switch, as K1 recommends | No (R0.3.6) |
+| E2 | On a project whose Layout Mode is off: no tab strip, so no header fold (R4 D.1.5 case 8) | No such switch: the strip shows whenever the editor is enabled and a sheet exists (`TVM/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__TabStrip__.js:316`) | Adam re-decides DR-25 at the publishing port (W4-09) and answers 'retire', as K1 recommends; W5-07 then removes the switch (R6 F.8 C33) | No (R0.3.6) |
@@ -295 +296 @@
-| 1 | **DR-01** Port gate | Decides whether the 01-Oct request is Adam's sign-off for the 88 untried TV releases. It gates 121 packages in W1-W6, and W3-04 is hard-gated on it. | (c): port everything in dependency order, flag unconfirmed releases, hold the four gestures |
+| 1 | **DR-01** Port gate | Decides whether the 01-Oct request is Adam's sign-off for the 88 untried TV releases. It gates 122 packages in W1-W6, and W3-04 is hard-gated on it. | (c): port everything in dependency order, flag unconfirmed releases, hold the four gestures |
@@ -313 +314 @@
-| Q-REG, Q-63, Q-BACKUP (raised by this report, R0.2.11) | W0-04 and W0-06 (registry and lint); W0-09 (backup root) | Unowned numbers become TV growth; 63 stays VV-reserved and nothing moves while TV's branch is unmerged; backups go to a folder outside the repository, keep 30 |
+| Q-REG, Q-63, Q-BACKUP (raised by this report, R0.2.11) | W0-04 and W0-06 (registry and lint); W0-09 (backup root); each package names its question (R6 F.8 C35) | Unowned numbers become TV growth; 63 stays VV-reserved and nothing moves while TV's branch is unmerged; backups go to a folder outside the repository, keep 30 |
@@ -319 +320 @@
-| **DR-01** | Port gate: does the 01-Oct-2026 alignment request sign off TV features still marked 'awaiting Adam's sign-off' or 'NOT tried by Adam'? | (c) Port everything in dependency order; flag unconfirmed TV releases in each VV devlog entry; one acceptance checklist; hold the four gesture changes. | (c), gesture changes held. | Every TV-only feature port (47, 48, 49, folder 50 to HEAD, LE 26-33, 37, 51-54, 57-59, 65/66, 54/55). First needed by **W1-01**; gates 123 packages (W0 2, W1 38, W2  [...]
+| **DR-01** | Port gate: does the 01-Oct-2026 alignment request sign off TV features still marked 'awaiting Adam's sign-off' or 'NOT tried by Adam'? | (c) Port everything in dependency order; flag unconfirmed TV releases in each VV devlog entry; one acceptance checklist; hold the four gesture changes. | (c), gesture changes held. | Every TV-only feature port (47, 48, 49, folder 50 to HEAD, LE 26-33, 37, 51-54, 57-59, 65/66, 54/55). First needed by **W1-01**; gates 124 packages (W0 2, W1 38, W2  [...]
@@ -363 +364 @@
-| **DR-22** | Publishing pipeline and TV's published-only web viewer for Vale | (a) Adopt TV's publishing and published-only viewer; TV's local-first write order; register bar entry. | (a) after prerequisites; VV live viewer meanwhile. | 52 PublishedDocuments, 53 PublishedSchema, LE/65, LE/80 viewer. First needed by **W0-19**; gates 9 packages (W0 2, W3 1, W4 6). | before the wave that needs it |
+| **DR-22** | Publishing pipeline and TV's published-only web viewer for Vale | (a) Adopt TV's publishing and published-only viewer; TV's local-first write order; register bar entry. | (a) after prerequisites; VV live viewer meanwhile. | 52 PublishedDocuments, 53 PublishedSchema, LE/65, LE/80 viewer. First needed by **W0-19**; gates 10 packages (W0 2, W3 1, W4 6, W5 1). | before the wave that needs it |
@@ -373 +374 @@
-| **DR-25** | VV's per-project Layout Mode switch | (a) Keep now; retire at the publishing port. | (a). | Layout Mode switch, TabStrip visibility, Loader IsAvailable. First needed by **W1-31**; gates 7 packages (W1 3, W2 1, W4 2, W5 1). | before the wave that needs it |
+| **DR-25** | VV's per-project Layout Mode switch | (a) Keep now; retire at the publishing port. | (a). | Layout Mode switch, TabStrip visibility, Loader IsAvailable. First needed by **W1-31**; gates 8 packages (W1 3, W2 1, W4 2, W5 2); hard gate: W5-07. | before the wave that needs it |
@@ -387 +388 @@
-Note: DR-40 items 7-10 are held by one-line guard constants that W3-03 lands; W3-04 removes them after Adam says yes (K3 section 11 and the W3-03/W3-04 package text). The fifth acceptance bullet of W0-01 says "W3-04 lands them held (W3-05 switches them on later)"; that wording is wrong, because W3-05 switches on the drafting aids.
+Note: DR-40 items 7-10 are held by one-line guard constants that W3-03 lands; W3-04 removes them after Adam says yes (K3 section 11 and the W3-03/W3-04 package text). The fifth acceptance bullet of W0-01 said "W3-04 lands them held (W3-05 switches them on later)", which was wrong because W3-05 switches on the drafting aids; R6 F.8 C1 corrected it to "if unanswered, W3-03 writes the four guards and W3-04 stays held".
@@ -402 +403 @@
-Note: W0-06 acceptance item 1 quotes S11's pre-verifier release tally ("55/6/14/83/6/7/4/2"). The canonical source is now Section E's `report/tools/r5work/release_rows_final.json`. Brief W0-06 with: "Release Watermark (177 rows) seeded from `r5work/release_rows_final.json`: 51 ported / 11 partial / 17 pending sign-off / 80 never considered / 4 reopened / 2 deliberate / 7 not drawing / 4 VV-origin / 1 n/a, 112 open" (R0.1.1, R0.1.2). The same item lists DIV-1 to DIV-4 as permanent; DIV-3 is clos [...]
+Note: W0-06 acceptance item 1 quoted S11's pre-verifier release tally ("55/6/14/83/6/7/4/2"). The canonical source is now Section E's `report/tools/r5work/release_rows_final.json`, and R6 F.8 C34 has replaced the item's watermark clause in `wp_canonical.json` with this text: "Release Watermark (177 rows) seeded from `parity/report/tools/r5work/release_rows_final.json`: 51 ported / 11 partial / 17 pending sign-off / 80 never considered / 4 reopened / 2 deliberate / 7 not drawing / 4 VV-origin /  [...]
@@ -418 +419,2 @@
-- Q-AZIMUTH and the second half of Q-COVER are code rulings for the planner. The rest are Adam's.
+- Q-AZIMUTH and the second half of Q-COVER were code rulings for the planner, and Section F has made both (R6 F.8 C20, C22, in `wp_canonical.json`). The rest are Adam's.
+- Since R6 F.8 C35 each question is named in the packages of its Gates column, and W0-01 records each answer or default as a VV D-number.
@@ -423 +425 @@
-| **Q-35ASSETS** | Folder 35 holds Vale title-block material that no package keeps:<br>- the "VizDpt" A3 variant (`VVM/35__System__PageLayoutSystem/02__VizDpt__TitleBlock__Pdf__/`: a PDF and a PNG);<br>- 12 files in `VVM/35__System__PageLayoutSystem/03__TitleBlock__LayoutPdfs__RecConcept__Feb-2026__/` (A1-A3 landscape and portrait layouts, each as PDF and PNG).<br>W0-16 copies only jsPDF and the Classic A3 scan. Keep or archive before W6-03 retires 35? | (a) Copy them beside the Classic scan in [...]
+| **Q-35ASSETS** | Folder 35 holds Vale title-block material that no package keeps:<br>- the "VizDpt" A3 variant (`VVM/35__System__PageLayoutSystem/02__VizDpt__TitleBlock__Pdf__/`: a PDF and a PNG);<br>- 12 files in `VVM/35__System__PageLayoutSystem/03__TitleBlock__LayoutPdfs__RecConcept__Feb-2026__/` (A1-A3 landscape and portrait layouts, each as PDF and PNG).<br>W0-16 copies only jsPDF and the Classic A3 scan. Keep or archive before W6-03 retires 35? | (a) Copy them beside the Classic scan in [...]
@@ -425,2 +427,2 @@
-| **Q-AZIMUTH** | `Na__ElevData__SetAzimuthDeg` is a VV-only export of `VVM/45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js` (today 46; defined `:437`, exported `:805`). Its only caller is VV's elevation Dev-menu editor (import `:130`, call `:402`), which W2-05 replaces with TV 2.1.0. TV has no such name. Keep or retire? | (a) Keep it as a FacePick seam.<br>(b) Retire it with W2-05 | (b), with one condition. W1-10 takes TV's data module 1.1.0 whole in Wave 1, while VV's old edi [...]
-| **Q-COVER** | (1) What VV's boot cover says on a cold document-tab press (Specification, later Register or Statements, pressed from the 3D view before the editor has loaded). TV never shows a cover there, because its editor loads at start-up.<br>(2) How the `immediate` option reaches `Na__LeVeil__FirstOpen`, since TV's `Enter(sheetId)` takes no option | (1) The drawing cover's headline with VV's two pre-load status lines and no drawing job, or other words Adam names.<br>(2) The loader passes  [...]
+| **Q-AZIMUTH** | `Na__ElevData__SetAzimuthDeg` is a VV-only export of `VVM/45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js` (today 46; defined `:437`, exported `:805`). Its only caller is VV's elevation Dev-menu editor (import `:130`, call `:402`), which W2-05 replaces with TV 2.1.0. TV has no such name. Keep or retire? | (a) Keep it as a FacePick seam.<br>(b) Retire it with W2-05 | (b), with one condition. W1-10 takes TV's data module 1.1.0 whole in Wave 1, while VV's old edi [...]
+| **Q-COVER** | (1) What VV's boot cover says on a cold document-tab press (Specification, later Register or Statements, pressed from the 3D view before the editor has loaded). TV never shows a cover there, because its editor loads at start-up.<br>(2) How the `immediate` option reaches `Na__LeVeil__FirstOpen`, since TV's `Enter(sheetId)` takes no option | (1) The drawing cover's headline with VV's two pre-load status lines and no drawing job, or other words Adam names.<br>(2) The loader passes  [...]
@@ -455,2 +457,2 @@
-| **DIV-2** Section engine (plan `:101-115`; TD06 `:189`) | **Live, permanent.** TD06 makes VV's schema the reference. TV deviates in two places (positionMm sign, camelCase per-scene entries); these are fixed in TV only | - `VVM/41__System__CrossSectionView/`: 7 files, 3,697 lines, name kept. K2 N6 and DR-26 call for `README__CrossSectionView__.md` naming the twins, but no K3 package creates it yet (open issue: add it to W0-06)<br>- `VVM/40__System__DrawingViewCore/Na__DrawView__SectionAdapter_ [...]
-| **DIV-3** Location of drawing records (plan `:117-133`) | **Closed.** Both apps own the top-level `LayoutEditor__DrawingsData` block (`TVM/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js:179`; VV today `42/...:106`) | VV-only keys inside the block:<br>- `LayoutEditor__DrawingsData__LayoutModeEnabled` (VV `:112`, `:323-331`; TV has none)<br>- `Elevation__SeededFrom` (preserve on read and save; stop writing new values) | - No VV migration.<br>- W1-05 takes TV ProjectData 1.6.0 whole  [...]
+| **DIV-2** Section engine (plan `:101-115`; TD06 `:189`) | **Live, permanent.** TD06 makes VV's schema the reference. TV deviates in two places (positionMm sign, camelCase per-scene entries); these are fixed in TV only | - `VVM/41__System__CrossSectionView/`: 7 files, 3,697 lines, name kept. K2 N6 and DR-26 call for `README__CrossSectionView__.md` naming the twins; W0-06 creates it (R6 F.8 C14)<br>- `VVM/40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js`: same path and 13 exports a [...]
+| **DIV-3** Location of drawing records (plan `:117-133`) | **Closed.** Both apps own the top-level `LayoutEditor__DrawingsData` block (`TVM/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js:179`; VV today `42/...:106`) | VV-only keys inside the block:<br>- `LayoutEditor__DrawingsData__LayoutModeEnabled` (VV `:112`, `:323-331`; TV has none)<br>- `Elevation__SeededFrom` (preserve on read and save; stop writing new values) | - No VV migration.<br>- W1-05 takes TV ProjectData 1.6.0 whole  [...]
@@ -465 +467 @@
-| **PD-02** | DIV-2 section engine and schema | VV's live Cross Sections tool; TD06 | As DIV-2 above | Never port TV 41; add `README__CrossSectionView__.md` (not yet in any K3 package) | DIV-2 row |
+| **PD-02** | DIV-2 section engine and schema | VV's live Cross Sections tool; TD06 | As DIV-2 above | Never port TV 41; W0-06 adds `README__CrossSectionView__.md` (R6 F.8 C14) | DIV-2 row |
@@ -475 +477 @@
-| **PD-12** | App identity tokens | Two apps, two identities | - banner `VALEVISION3D - ...`<br>- console `[ValeVision3D <System>]`<br>- storage keys that embed the app name: `ValeVision3D__AuthoringUnlocked`, `Na__ValeVision__StatementDraft__<id>`, IndexedDB `ValeVision3D__ProjectedLinework`<br>- model category keys `ValeVision__*`<br>- sibling files `ValeVision__DrawingNotes__.json`, `ValeVision__StatementDocs__.json`, `ValeVision__UserSpellings__.json`<br>- root documents `ValeVision__<KIND> [...]
+| **PD-12** | App identity tokens | Two apps, two identities | - banner `VALEVISION3D - ...`<br>- console `[ValeVision3D <System>]`<br>- storage keys that embed the app name: `ValeVision3D__AuthoringUnlocked`, `Na__ValeVision__StatementDraft__<id>`, IndexedDB `ValeVision3D__ProjectedLinework`<br>- model category keys `ValeVision__*`<br>- sibling files `ValeVision__DrawingNotes__.json`, `ValeVision__StatementDocs__.json`, `ValeVision__UserSpellings__.json`<br>- root documents `ValeVision__<KIND> [...]
@@ -478 +480 @@
-| **PD-15** | NA content never reaches a Vale user; NA-only features land switched off | Noble Architecture identity, URLs and planning content | - QR (LE/53) off: Symbol fails closed; `FALLBACKS.baseUrl` is empty until a Vale resolver exists; `LayoutEditor__TitleBlock__QrCellEnabled` false<br>- the Statement Writer's "TrueVision 3D Project Hub" section is **present but never rendered**. Its module `VVM/51__System__LayoutEditor/52__Feature__StatementWriter/09__Standard__Sections/Na__LayoutEdito [...]
+| **PD-15** | NA content never reaches a Vale user; NA-only features land switched off | Noble Architecture identity, URLs and planning content | - QR (LE/53) off: Symbol fails closed; `FALLBACKS.baseUrl` is empty until a Vale resolver exists; `LayoutEditor__TitleBlock__QrCellEnabled` false<br>- the Statement Writer's "TrueVision 3D Project Hub" section is **present but never rendered**. Its module `VVM/51__System__LayoutEditor/52__Feature__StatementWriter/09__Standard__Sections/Na__LayoutEdito [...]
@@ -480 +482 @@
-| **PD-17** | Naming twins and reserved numbers | Same role, different implementation | - `41__System__CrossSectionView` against TV `41__System__SectionCutEngine`<br>- `60__Feature__FullScreenMode` against TV `76__System__FullscreenMode`<br>- VV `index.html` against TV `Index.html`<br>- `95__SketchUpSisterTools__ToolsAndUtils` against TV `90__rubyScript__...`<br>- `00__Archive` against TV `00__ArchivedVersions`<br>- VV-reserved numbers 28, 29, 31, 35, 60, 61, 62 (until moved to 92), 63, 64, 69, [...]
+| **PD-17** | Naming twins and reserved numbers | Same role, different implementation | - `41__System__CrossSectionView` against TV `41__System__SectionCutEngine`<br>- `60__Feature__FullScreenMode` against TV `76__System__FullscreenMode`<br>- VV `index.html` against TV `Index.html`<br>- `95__SketchUpSisterTools__ToolsAndUtils` against TV `90__rubyScript__...`<br>- `00__Archive` against TV `00__ArchivedVersions`<br>- VV-reserved numbers 28, 29, 31, 35, 60, 61, 62 (moves to 92 only on request, FR [...]
@@ -483 +485 @@
-| **PD-20** | Document code in document names | VV's `?project=` token is a folderId (`2026/3047__Doous`); TV's is a bare code (`TVM/03__AppUtils/Na__AppUtils__ProjectLoader.js:81-86`). Used raw, VV would print `2026/3047__Doous_T01_D01` (S07a-V01) | - `Na__DrawData__GetDocumentCode()`, a VV-only export that W1-12 adds to `VVM/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js` (today 42). It returns the loaded project's `projectCode` through `Na__CfApi__GetLoadedProjectData()`, falling [...]
+| **PD-20** | Document code in document names | VV's `?project=` token is a folderId (`2026/3047__Doous`); TV's is a bare code (`TVM/03__AppUtils/Na__AppUtils__ProjectLoader.js:81-86`). Used raw, VV would print `2026/3047__Doous_D01`, a folder path inside a document name (S07a-V01) | - `Na__DrawData__GetDocumentCode()`, a VV-only export that W1-12 adds to `VVM/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js` (today 42). It returns the loaded project's `projectCode` through `Na__CfApi [...]
@@ -486 +488 @@
-| **PD-23** | Published-reader URLs | On localhost VV's Flask answers `index.html` with 200 for a missing file under `/Projects/` (`WCP/server.py:958-977`), which breaks TV's "a 404 is an answer" rule. VV's R2 base also differs | `VVM/52__System__Layout__PublishedDocuments/Na__PubDoc__Urls__.js` (new, at TV's path; W4-17):<br>- the localhost first URL must be 404-honest: `/Whitecardopedia/Projects/{folderId}/...`, which answers real JSON 404s (`WCP/server.py:901-907`), or W0-19 makes `/Projects [...]
+| **PD-23** | Published-reader URLs | On localhost VV's Flask answers `index.html` with 200 for a missing file under `/Projects/` (`WCP/server.py:958-977`), which breaks TV's "a 404 is an answer" rule. VV's R2 base also differs | `VVM/52__System__Layout__PublishedDocuments/Na__PubDoc__Urls__.js` (new, at TV's path; W4-17):<br>- the localhost first URL is the facade's `repoUrl` form, `new URL('../Whitecardopedia/Projects/' + folderId + '/06__Layout__PublishedDocuments/...', AppRootUrl)`, whose ` [...]
@@ -540 +542 @@
-| Per-project Layout Mode switch | `LayoutModeEnabled` in `VVM/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js`; ModeController `IsAvailable`/`IsLayoutModeOn`/`SetLayoutMode`; Loader `IsAvailable` | Re-decided at the publishing port (W4-07 to W4-09); retirement recommended then | DR-25 |
+| Per-project Layout Mode switch | `LayoutModeEnabled` in `VVM/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js`; ModeController `IsAvailable`/`IsLayoutModeOn`/`SetLayoutMode`; Loader `IsAvailable` | Re-decided at the publishing port (W4-07 to W4-09); retirement recommended then, and W5-07 retires the switch on a 'retire' answer (R6 F.8 C33) | DR-25 |
~~~~

### `report/R2__B_ModuleNaming_Divergence.md`

~~~~diff
@@ -9 +9 @@
-3. **NAMESPACE lines differ in 25 twins, and only one is wrong.** 17 only carry the app name as the namespace value (`TrueVision3D` / `ValeVision3D`: swap, no action); 5 have no `NAMESPACE` line on one side (legacy headers); 2 are deliberate VV-bodied twins (`Na__DrawPreset` in RenderPreset, `Na__DrawSection` in SectionAdapter - K2 H3); 1 is a real VV error: `05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js` says `Na__RenderEffect` while its seven exports are `Na__SectionClipping_ [...]
+3. **NAMESPACE lines differ in 25 twins, and only one is wrong.** 17 only carry the app name as the namespace value (`TrueVision3D` / `ValeVision3D`: swap, no action); 5 have no `NAMESPACE` line on one side (legacy headers); 2 are deliberate VV-bodied twins (`Na__DrawPreset` in RenderPreset, `Na__DrawSection` in SectionAdapter - K2 H3); 1 is a real VV error: `05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js` says `Na__RenderEffect` while its seven exports are `Na__SectionClipping_ [...]
@@ -11,3 +11,3 @@
-5. **VV-only export names in shared drawing files: 18 in 12 files** (S01-F41's 18-in-12 recounted exactly), plus the 8 ComposerPreset names W0-02 renames. 13 are kept as declared seams (Layout Mode, D33 styles, D28 filing, the loader facade), 4 retire (three with whole-file ports in W1-21 and W3-03, and the `Na__ElevData__SetSeededFrom` setter, which DR-32 leaves without a writer), 1 needs a ruling (`Na__ElevData__SetAzimuthDeg`). The 3D support modules the drawing system imports carry 33 more  [...]
-6. **TV names VV must add to modules it keeps with VV bodies: 12 names in 4 modules** (ProjectLoader 2 in W0-11; Invalidation 1 and ModelToggle 3 in W1-01; door module 6 in W1-02), plus the SectionAdapter's four new calls (six names, W2-02; proposed in B.3.5) and the two facades (W0-12). Inside 40-55, TV drawing files import 232 names that VV's twins lack across 62 modules: 4 resolve with the FR-09 rename, 11 are the PlanDimensions getters (placement seam above), and the other 217 arrive with t [...]
-7. **App tokens inside names.** One TV module VV takes carries TV's token in its file name (`LE/52 .../Na__LayoutEditor__Statement__Standard__TrueVisionHub__.js`): keep the name (F1), exclude it by config (DR-43, W4-12) and give the W0-04 naming lint a declared exception for it. VV's own token stays in two VV-only names (the 3D hotkey handler and its JSON root key, DR-33).
+5. **VV-only export names in shared drawing files: 18 in 12 files** (S01-F41's 18-in-12 recounted exactly), plus the 8 ComposerPreset names W0-02 renames. 13 are kept as declared seams (Layout Mode, D33 styles, D28 filing, the loader facade), 4 retire (three with whole-file ports in W1-21 and W3-03, and the `Na__ElevData__SetSeededFrom` setter, which DR-32 leaves without a writer), 1 needed a ruling (`Na__ElevData__SetAzimuthDeg`: retire it with W2-05, the planner's ruling R0.2.11 Q-AZIMUTH, ap [...]
+6. **TV names VV must add to modules it keeps with VV bodies: 12 names in 4 modules** (ProjectLoader 2 in W0-11; Invalidation 1 and ModelToggle 3 in W1-01; door module 6 in W1-02), plus the SectionAdapter's four new calls (six names, W2-02; proposed in B.3.5, fixed by R6 F.8 C25) and the two facades (W0-12). Inside 40-55, TV drawing files import 232 names that VV's twins lack across 62 modules: 4 resolve with the FR-09 rename, 11 are the PlanDimensions getters (placement seam above), and the ot [...]
+7. **App tokens inside names.** One TV module VV takes carries TV's token in its file name (`LE/52 .../Na__LayoutEditor__Statement__Standard__TrueVisionHub__.js`): keep the name (F1), exclude it by config (DR-43, W4-12) and the W0-04 naming lint carries a named exception for it (R6 F.8 C13). VV's own token stays in two VV-only names (the 3D hotkey handler and its JSON root key, DR-33).
@@ -15 +15 @@
-9. **Gaps this section found in K1-K3** (each also in Open issues): the SectionClipping__State header has no owner; W0-14 should take TV's `MODULE` line for R2AssetUpload (K2 H3); no package creates `41__System__CrossSectionView/README__CrossSectionView__.md` (K2 N6, DR-26); W0-04's lint needs the TrueVisionHub exception; W1-10 must re-apply `Na__ElevData__STYLE_KEYS` (DR-32); W6-03 says the retired 91 folder holds 4 files but it holds 7 after FR-08 (verified on disk).
+9. **Gaps this section found in K1-K3** (each also in Open issues): the SectionClipping__State header has no owner; W0-14 should take TV's `MODULE` line for R2AssetUpload (K2 H3); no package creates `41__System__CrossSectionView/README__CrossSectionView__.md` (K2 N6, DR-26); W0-04's lint needs the TrueVisionHub exception; W1-10 must re-apply `Na__ElevData__STYLE_KEYS` (DR-32); W6-03 says the retired 91 folder holds 4 files but it holds 7 after FR-08 (verified on disk). Section F's F.8 has since [...]
@@ -40 +40 @@
-**Gates every package passes on names (K2 section 12, K3 G1-G4):** `Na__Verify__ModuleGraph__.mjs` and `Na__Verify__Exports__.mjs` (G1, G2), `parity/report/tools/k2_path_gate.py` (G3), and from W0-04 on `Na__Verify__ParityNaming__.mjs` + `Na__Verify__PortNotes__.mjs` (G4: `VALEVISION3D` banners, `FILE` lines, no `[TrueVision3D`, no `TrueVision__` literal, no `window.TrueVision__`, no NA-only marker outside PORT NOTE "Ported from" lines and history). History documents (devlog, ledger, plans) are [...]
+**Gates every package passes on names (K2 section 12, K3 G1-G4):** `Na__Verify__ModuleGraph__.mjs` and `Na__Verify__Exports__.mjs` (G1, G2), `parity/report/tools/k2_path_gate.py` (G3), and from W0-04 on `Na__Verify__ParityNaming__.mjs` + `Na__Verify__PortNotes__.mjs` (G4: `VALEVISION3D` banners, `FILE` lines, no `[TrueVision3D`, no `TrueVision__` literal, no `window.TrueVision__`, no NA-only marker outside the exempt parts: the whole PORT NOTE block of a file, history documents (devlog, ledger, [...]
@@ -104 +104 @@
-| `05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js` | NAMESPACE :6, MODULE :7 | `Na__SectionClipping`; "Render Pipeline - Section Clipping State" | `Na__RenderEffect`; "Section Clipping State" | VV authored the file (14-Jul-2026); TV ported it on 31-Aug-2026 "unchanged apart from the header" (TV DEVELOPMENT LOG) with its own NAMESPACE and MODULE lines | Set `NAMESPACE : Na__SectionClipping` (the 7 exports, VV :146-153) and TV's `MODULE`; keep VV's DESCRIPTION / INTEGRATION (dual  [...]
+| `05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js` | NAMESPACE :6, MODULE :7 | `Na__SectionClipping`; "Render Pipeline - Section Clipping State" | `Na__RenderEffect`; "Section Clipping State" | VV authored the file (14-Jul-2026); TV ported it on 31-Aug-2026 "unchanged apart from the header" (TV DEVELOPMENT LOG) with its own NAMESPACE and MODULE lines | Set `NAMESPACE : Na__SectionClipping` (the 7 exports, VV :146-153) and TV's `MODULE`; keep VV's DESCRIPTION / INTEGRATION (dual  [...]
@@ -117 +117 @@
-Identity leaks in VV source today (the G4 baseline, verified by grep): banner `TRUEVISION3D - PLAN DIMENSIONS - STYLES` at `44__System__PlanDimensions/Na__PlanDimensions__Styles__.css:8` and console prefix `[TrueVision3D LayoutEditor]` at `51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js:431` (both W0-03); `window.TrueVision__Pwa__ProjectContext` read at `SpecPdf__.js:147` (W0-12, replaced by `Na__CfApi__GetProjectDisplayName`). `LE/07/Na__LayoutEditor__AutoSav [...]
+Identity leaks in VV source today (the G4 baseline, verified by grep): banner `TRUEVISION3D - PLAN DIMENSIONS - STYLES` at `44__System__PlanDimensions/Na__PlanDimensions__Styles__.css:8` and console prefix `[TrueVision3D LayoutEditor]` at `51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js:431` (both W0-03); `window.TrueVision__Pwa__ProjectContext` read at `SpecPdf__.js:147` (W0-12, replaced by `Na__CfApi__GetProjectDisplayName`). `LE/07/Na__LayoutEditor__AutoSav [...]
@@ -215 +215 @@
-| `Na__LayoutEditor__Statement__Standard__TrueVisionHub__.js` (NAMESPACE `Na__LeStmtHub`; ID `TrueVisionHub`, block `StatementStandard__TrueVisionHub__Config`, prefix `TrueVisionHub__`, :102-104; 19 "TrueVision" strings) | TV | `02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/09__Standard__Sections/` | Keep TV's file name, ID and keys (F1, K1: the Standard Registry :140 imports it and statements carry the `TrueVisionHub` marker); exclude it from DEFINITIONS by config ( [...]
+| `Na__LayoutEditor__Statement__Standard__TrueVisionHub__.js` (NAMESPACE `Na__LeStmtHub`; ID `TrueVisionHub`, block `StatementStandard__TrueVisionHub__Config`, prefix `TrueVisionHub__`, :102-104; 19 "TrueVision" strings) | TV | `02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/09__Standard__Sections/` | Keep TV's file name, ID and keys (F1, K1: the Standard Registry :140 imports it and statements carry the `TrueVisionHub` marker); exclude it from DEFINITIONS by config ( [...]
@@ -242 +242 @@
-| `41__System__CrossSectionView/` | 7 files / 3,697 lines | several | Stays | DIV-2 live Cross Sections tool; TV's twin `41__System__SectionCutEngine/` (7 files) is never ported; add `README__CrossSectionView__.md` naming the twins (K2 N6, F6) | DR-26, DR-41 | README unowned (Open issues) |
+| `41__System__CrossSectionView/` | 7 files / 3,697 lines | several | Stays | DIV-2 live Cross Sections tool; TV's twin `41__System__SectionCutEngine/` (7 files) is never ported; add `README__CrossSectionView__.md` naming the twins (K2 N6, F6) | DR-26, DR-41 | README: W0-06 (R6 F.8 C14) |
@@ -344,8 +344,8 @@
-1. No K3 package owns the `05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js` header fix (`NAMESPACE` / `MODULE` to TV's, B.3.1); recommended: add it to W0-03 (header-only, no import change).
-2. No K3 package creates `02__Src__AppModules/41__System__CrossSectionView/README__CrossSectionView__.md` (K2 N6, DR-26); recommended: W0-06.
-3. W0-04's naming lint (G4) needs a declared exception for `LE/52 .../Na__LayoutEditor__Statement__Standard__TrueVisionHub__.js` (TV-token file name, ID and NA product strings kept at TV's path by W4-12), or W4-12 fails its own gate.
-4. W1-10's adaptations re-apply only `Elevation__SeededFrom`; `Na__ElevData__STYLE_KEYS` (DR-32 D33) must also be re-added. `Na__ElevData__SetAzimuthDeg` loses its only caller when W2-05 replaces VV's Elevation DevMenu Editor with TV 2.1.0 - keep it as a FacePick seam or retire it (ruling for W1-10/W2-05); the `SetSeededFrom` setter retires under DR-32 (no new writes; the field is still read and preserved).
-5. W0-14 should take TV's `MODULE` line for `03__AppUtils/Na__AppUtils__R2AssetUpload__.js` (K2 H3); its adaptations do not mention the header.
-6. The four non-slice-named SectionAdapter names (`__Serialize`, `__Apply`, `__GetOutlineWidthPx`, `__SetOutlineWidthPx`) are proposed here (B.3.5); W2-02 must fix them before WT-02 copies them.
-7. Every TV file that imports a `Na__PlanDim__*` config getter from `44 Data__` needs the `ConfigState__` seam in VV; W2-04 states it, W1-37 and W2-03 do not (B.3.3).
-8. W6-03's estimate note counts 4 files in 91; the folder holds 7 after FR-08 (verified on disk); FR-25's importer list (4 files) is unaffected.
+1. No K3 package owns the `05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js` header fix (`NAMESPACE` / `MODULE` to TV's, B.3.1); recommended: add it to W0-03 (header-only, no import change). Settled: W0-03 owns it since R6 F.8 C12.
+2. No K3 package creates `02__Src__AppModules/41__System__CrossSectionView/README__CrossSectionView__.md` (K2 N6, DR-26); recommended: W0-06. Settled: W0-06 creates it (R6 F.8 C14).
+3. W0-04's naming lint (G4) needs a declared exception for `LE/52 .../Na__LayoutEditor__Statement__Standard__TrueVisionHub__.js` (TV-token file name, ID and NA product strings kept at TV's path by W4-12), or W4-12 fails its own gate. Settled: W0-04's adaptations and acceptance and gate G4 name it (R6 F.8 C13).
+4. W1-10's adaptations re-apply only `Elevation__SeededFrom`; `Na__ElevData__STYLE_KEYS` (DR-32 D33) must also be re-added. `Na__ElevData__SetAzimuthDeg` loses its only caller when W2-05 replaces VV's Elevation DevMenu Editor with TV 2.1.0 - keep it as a FacePick seam or retire it (ruling for W1-10/W2-05); the `SetSeededFrom` setter retires under DR-32 (no new writes; the field is still read and preserved). Settled: W1-10 re-adds `Na__ElevData__STYLE_KEYS` and keeps both setters through W1, and [...]
+5. W0-14 should take TV's `MODULE` line for `03__AppUtils/Na__AppUtils__R2AssetUpload__.js` (K2 H3); its adaptations do not mention the header. Settled: R6 F.8 C18.
+6. The four non-slice-named SectionAdapter names (`__Serialize`, `__Apply`, `__GetOutlineWidthPx`, `__SetOutlineWidthPx`) are proposed here (B.3.5); W2-02 must fix them before WT-02 copies them. Settled: R6 F.8 C25 fixes the six names for W2-02 and WT-02.
+7. Every TV file that imports a `Na__PlanDim__*` config getter from `44 Data__` needs the `ConfigState__` seam in VV; W2-04 states it, W1-37 and W2-03 do not (B.3.3). Settled: R6 F.8 C24.
+8. W6-03's estimate note counts 4 files in 91; the folder holds 7 after FR-08 (verified on disk); FR-25's importer list (4 files) is unaffected. Settled: R6 F.8 C31.
@@ -355 +355 @@
-12. Two small hand edits are assigned here and are in neither the K2 script nor the K3 adaptations: the DistanceCulling banner after FR-11 (W0-02) and replacing the TiledRenderer `Na__StaticExport__ClampToDeviceLimits` / `IsIosDevice` wrappers by TV's `Na__TilePlan__*` re-export (W2-03).
+12. Two small hand edits are assigned here and are in neither the K2 script nor the K3 adaptations: the DistanceCulling banner after FR-11 (W0-02) and replacing the TiledRenderer `Na__StaticExport__ClampToDeviceLimits` / `IsIosDevice` wrappers by TV's `Na__TilePlan__*` re-export (W2-03). Settled: R6 F.8 C11 (W0-02) and C26 (W2-03).
~~~~

### `report/R5__E_ParityMatrix_Watermark_Inventory.md`

~~~~diff
@@ -628 +628,3 @@
-and storey UI, `70` AssetCullDistance) belong to no slice and no K3 package (see the open issues). TV's
+and storey UI, `70` AssetCullDistance; also `07` DefaultFogEffect and `11` ViewModeFov DevControls) belong to no slice and no
+K3 package: they are outside this alignment as 3D-tab features (the front matter's scope, R0.0; the model-group selector and its
+overlay also fall under DR-09 (a)), and Section B records each (B.4.2). TV's
@@ -644,7 +646,7 @@
-265 files against every K3 package's `tv_sources`, `vv_targets`, `edits` and `hot_files` leaves 15
-files outside K3: 14 are the exclusions marked below (TV's ProfileLines, five 41 engine files, seven 27
-menu files, the 80 note) and one is a K3 gap closed here. K3 gives `README__PublishedDocuments__.md` (52) no package, so
-this section assigns it to W4-17, the first package to create files in that folder (W1-15, W1-37, W2-34, W4-01 and
-W4-08 each carry their folder's README); the delegator adds it to W4-17's targets, a K3 correction for Section F's list
-(F.8). `README__SpellCheck__.md` is W2-34's: a new VV target there (`vv_targets` and `edits`), though not one of its
-`tv_sources`.
+265 files against every K3 package's `tv_sources`, `vv_targets`, `edits` and `hot_files` leaves 14
+files outside K3, all of them the exclusions marked below (TV's ProfileLines, five 41 engine files, seven 27 menu files,
+the 80 note). The one K3 gap this section found is closed: `README__PublishedDocuments__.md` (52) had no package, so this
+section assigned it to W4-17, the first package to create files in that folder (W1-15, W1-37, W2-34, W4-01 and W4-08 each
+carry their folder's README), and Section F's F.8 C30 added it to W4-17's `vv_targets` and `edits` in `wp_canonical.json`
+(01-Oct-2026). `README__SpellCheck__.md` is W2-34's: a new VV target there (`vv_targets` and `edits`), though not one of
+its `tv_sources`.
@@ -1021 +1023 @@
-| TVM/52__System__Layout__PublishedDocuments/README__PublishedDocuments__.md | 60 | - | v2.155.0 | gated, adapted - DR-22 a; README adapted for VV: Vale identity, SCHEMA REF at the VV example folder W4-01 seeds, the Urls line as W4-17's VV Urls; no K3 package lists it, so the delegator adds it to W4-17's targets | W4-17 (assigned here; not in wp_canonical.json) |
+| TVM/52__System__Layout__PublishedDocuments/README__PublishedDocuments__.md | 60 | - | v2.155.0 | gated, adapted - DR-22 a; README adapted for VV: Vale identity, SCHEMA REF at the VV example folder W4-01 seeds, the Urls line as W4-17's VV Urls; a W4-17 target since Section F's F.8 C30 | W4-17 |
@@ -1073 +1075 @@
-| `41__System__CrossSectionView/` | 7 (3,697) | keep (DIV-2; TD06 keeps VV's `CrossSection__SceneData` schema); adapter completed (W2-02); the five Dev-gate ids `naCrossSectionDev*` (`index.html:855-866`, DevControls `:79-83`) become `naCrossSectionToolDev*` (W2-05); a new `README__CrossSectionView__.md` names the twins (K2 N6; no K3 package creates it, Sections A and B propose W0-06) | W2-02, W2-05, W0-06 (proposed); TV side WT-02 | DR-26, DR-41; TF-T21 |
+| `41__System__CrossSectionView/` | 7 (3,697) | keep (DIV-2; TD06 keeps VV's `CrossSection__SceneData` schema); adapter completed (W2-02); the five Dev-gate ids `naCrossSectionDev*` (`index.html:855-866`, DevControls `:79-83`) become `naCrossSectionToolDev*` (W2-05); a new `README__CrossSectionView__.md` names the twins (K2 N6; W0-06 creates it, R6 F.8 C14) | W2-02, W2-05, W0-06; TV side WT-02 | DR-26, DR-41; TF-T21 |
~~~~

### `report/R6__F_SwarmDelegationPlan.md`

~~~~diff
@@ -9 +9 @@
-**Headline.** 165 canonical packages: 153 in the ValeVision waves W0-W6 (seven of them Parity Scribe passes) and 12 in the TrueVision lane WT. Estimated 154,649 lines in the VV waves (plus W5-06, unestimated) and 4,010 in WT. The critical path is 65,429 estimated lines over 53 packages (56 packages by count); W4 is the longest stretch (19,460 lines). 93 files are written by more than one package, all serialised. List scheduling over the same estimates (F.2.3) shows that 4 package agents finish  [...]
+**Headline.** 165 canonical packages: 153 in the ValeVision waves W0-W6 (seven of them Parity Scribe passes) and 12 in the TrueVision lane WT. Estimated 154,649 lines in the VV waves (plus W5-06, unestimated) and 4,010 in WT. The critical path is 65,429 estimated lines over 53 packages (56 packages by count); W4 is the longest stretch (19,460 lines). 93 files are written by more than one package, all serialised. List scheduling over the same estimates (F.2.3) shows that 4 package agents finish  [...]
@@ -49 +49 @@
-| P15 | Identity: NA content never ships | NA-only markers (`NaProjectPortal`, `30__TrueVision__AppContent`, `/na-apps/...` paths, the `/q/` and `/s/` resolvers, NA logo and letterheads, "TrueVision 3D Project Hub") never land in VV; features whose content is NA-only land switched off (Project QR DR-12, Statement Writer DR-10, site plans DR-08); brand lives in config values, keys stay TV's. One named exception: the TrueVisionHub statement section lands at TV's path, excluded from VV's DEFINITIO [...]
+| P15 | Identity: NA content never ships | NA-only markers (`NaProjectPortal`, `30__TrueVision__AppContent`, `/na-apps/...` paths, the `/q/` and `/s/` resolvers, NA logo and letterheads) never land in VV, and NA content never reaches a Vale user: features whose content is NA-only land switched off (Project QR DR-12, Statement Writer DR-10, site plans DR-08); brand lives in config values, keys stay TV's. The "TrueVision 3D Project Hub" statement section is present but never rendered: its module  [...]
@@ -797 +797 @@
-- `[F.8 Cn]` after a line, or `(F.8 Cn)` on a target: text that F.8 row Cn corrected or added. F.8 corrects 29 packages and adds W5-07 (C33). Since 01-Oct-2026 the corrections are in `wp_canonical.json` itself, including the fields this table does not show (goal, adaptations, risk, notes, estimate notes; each corrected package lists its rows in `f8_corrections`), so this catalogue and the JSON agree and either can be used to brief.
+- `[F.8 Cn]` after a line, or `(F.8 Cn)` on a target: text that F.8 row Cn corrected or added. F.8 corrects 30 packages and adds W5-07 (C33). Since 01-Oct-2026 the corrections are in `wp_canonical.json` itself, including the fields this table does not show (goal, adaptations, risk, notes, estimate notes; each corrected package lists its rows in `f8_corrections`), so this catalogue and the JSON agree and either can be used to brief.
@@ -803 +803 @@
-| W0-01 | Decision record and swarm rules published | **VV:** `VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md` | `ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md` (before W0-06) | - | DR-01, DR-02, DR-03, DR-04, DR-05, DR-06, DR-07, DR-22, DR-35 | S (200) | 1. VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md has a dated Decisions block with one VV D-number per K1 DR (DR-01..DR-44), each naming the option chosen (or "default, unanswered") and the key or constant it sets.<br>2.  [...]
+| W0-01 | Decision record and swarm rules published | **VV:** `VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md` | `ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md` (before W0-06) | - | DR-01, DR-02, DR-03, DR-04, DR-05, DR-06, DR-07, DR-22, DR-35 | S (200) | 1. VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md has a dated Decisions block with one VV D-number per K1 DR (DR-01..DR-44), each naming the option chosen (or "default, unanswered") and the key or constant it sets.<br>2.  [...]
@@ -807 +807 @@
-| W0-06 | Ledger restructure, folder-number registry and records hygiene | **TV:** `TV/TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md`<br>**VV:** `VV/{ValeVision__PARITY__TrueVisionLedger__.md, ValeVision__DEVLOG__.md, +ValeVision__PLAN__TrueVisionRealign__DrawingSystems__.md, +ValeVision__NOTES__FolderNumberRegistry__.md, ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md}`, `VLE/07__Core__SheetData/Na__LayoutEditor__History__.js`, `VLE/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js` [...]
+| W0-06 | Ledger restructure, folder-number registry and records hygiene | **TV:** `TV/TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md`<br>**VV:** `VV/{ValeVision__PARITY__TrueVisionLedger__.md, ValeVision__DEVLOG__.md, +ValeVision__PLAN__TrueVisionRealign__DrawingSystems__.md, +ValeVision__NOTES__FolderNumberRegistry__.md, ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md}`, `VLE/07__Core__SheetData/Na__LayoutEditor__History__.js`, `VLE/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js` [...]
@@ -821 +821 @@
-| W0-19 | Flask blueprints: published documents and statements; .gitignore and .gitattributes for both | **TV:** `NAAPPS/{ProjectVision__TrueVisionPublished__Api__.py, ProjectVision__TrueVisionStatements__Api__.py}`<br>**VV:** `WCP/{+Server__ValeVisionPublished__Api__.py, +Server__ValeVisionStatements__Api__.py, server.py}`, `VCB/{.gitignore, +.gitattributes}`, `VV/80__Testing__PrototypeEnvironment/{+Na__Test__PublishedApi__.test.py, +Na__Test__StatementServer__.py}` | `server.py` (after W0-18) [...]
+| W0-19 | Flask blueprints: published documents and statements; .gitignore and .gitattributes for both | **TV:** `NAAPPS/{ProjectVision__TrueVisionPublished__Api__.py, ProjectVision__TrueVisionStatements__Api__.py}`<br>**VV:** `WCP/{+Server__ValeVisionPublished__Api__.py, +Server__ValeVisionStatements__Api__.py, server.py}`, `VCB/{.gitignore, +.gitattributes}`, `VV/80__Testing__PrototypeEnvironment/{+Na__Test__PublishedApi__.test.py, +Na__Test__StatementServer__.py}` | `server.py` (after W0-18) [...]
@@ -1171,2 +1171,2 @@
-| W0 | DR-01..DR-07 answered or defaults accepted (K1 urgency "before Wave 0"); Adam's devlog version step asked by W0-01 (fallback: patch steps from v2.71.1); WCP sync data committed or set aside so W0-02's preflight (clean WebApps/ValeVision3D AND WebApps/Whitecardopedia) passes; inside the wave Adam commits W0-01's PLAN edit before W0-02 is dispatched, and W0-02 alone before the rest of W0 (F.8 C10); baselines of F.0 recorded by the integrator. | DR-01 (2), DR-02 (3), DR-03 (5), DR-04 (3), D [...]
-| W1 | W0 committed; G4 and the UI report available; Adam has exported the live project.json of every VV project with sheets before any W1 build is deployed (W1-19 re-normalises every sheet; recommended here, see F.5.7). | DR-01 (38), DR-02 (1), DR-05 (7), DR-07 (1), DR-08 (4), DR-09 (2), DR-11 (5), DR-12 (5), DR-13 (1), DR-14 (5), DR-15 (3), DR-16 (2), DR-17 (3), DR-19 (1), DR-20 (1), DR-21 (2), DR-24 (4), DR-25 (3), DR-27 (2), DR-29 (1), DR-30 (2), DR-32 (4), DR-33 (3), DR-34 (1), DR-35 (1),  [...]
+| W0 | DR-01..DR-07 answered or defaults accepted (K1 urgency "before Wave 0"); Adam's devlog version step asked by W0-01 (fallback: patch steps from v2.71.1); WCP sync data committed or set aside so W0-02's preflight (clean WebApps/ValeVision3D AND WebApps/Whitecardopedia) passes; inside the wave Adam commits W0-01's PLAN edit before W0-02 is dispatched, and W0-02 alone before the rest of W0 (F.8 C10); the front matter's questions that Wave 0 reads (R0.2.1 Q-VER; R0.2.11 Q-REG, Q-63, Q-BACKUP) [...]
+| W1 | W0 committed; G4 and the UI report available; Adam has exported the live project.json of every VV project with sheets before any W1 build is deployed (W1-19 re-normalises every sheet; recommended here, see F.5.7); R0.2.11 Q-COVER part (1), the boot cover's words on a cold document-tab press, answered or its default recorded before W1-33 is dispatched (F.8 C35). | DR-01 (38), DR-02 (1), DR-05 (7), DR-07 (1), DR-08 (4), DR-09 (2), DR-11 (5), DR-12 (5), DR-13 (1), DR-14 (5), DR-15 (3), DR-1 [...]
@@ -1177 +1177 @@
-| W6 | W5 committed; Adam confirmed the user-visible removals (DR-03), chose keep or archive for 35's Vale title-block material (F.8 C31) and, for 62 -> 92, answered D-S01-08 (a). | DR-01 (1), DR-03 (1), DR-05 (1), DR-07 (1), DR-18 (1), DR-19 (1), DR-34 (1), DR-35 (1) | W6-03 landed or SKIPPED-HELD; W6-01 sweep green (every TV test ported, VV-owned, excluded or held); W6-02's consolidated token request handed to Adam; W6-04 done; final commit; Adam bumps the token at deploy. |
+| W6 | W5 committed; Adam confirmed the user-visible removals (DR-03), chose keep or archive for 35's Vale title-block material (R0.2.11 Q-35ASSETS, F.8 C31) and, for 62 -> 92, answered D-S01-08 (a); if TV has merged its own 63 first, Q-63 (b) travels with W6-03 (F.8 C35). | DR-01 (1), DR-03 (1), DR-05 (1), DR-07 (1), DR-18 (1), DR-19 (1), DR-34 (1), DR-35 (1) | W6-03 landed or SKIPPED-HELD; W6-01 sweep green (every TV test ported, VV-owned, excluded or held); W6-02's consolidated token request [...]
@@ -1209 +1209 @@
-| W6 | 1. Image Export still exports; the Tools menu no longer offers the legacy Create Drawing page; the email form still works; 35's VizDpt and RecConcept title-block files are kept or archived as Adam chose (W6-03, F.8 C31). 2. Read W6-02's consolidated token request; bump the shared token at deploy (DR-07). 3. Final commit from the integrator's path list. |
+| W6 | 1. Image Export still exports; the Tools menu no longer offers the legacy Create Drawing page; the email form still works; 35's VizDpt and RecConcept title-block files are kept or archived as Adam chose (W6-03, F.8 C31; R0.2.11 Q-35ASSETS). 2. Read W6-02's consolidated token request; bump the shared token at deploy (DR-07). 3. Final commit from the integrator's path list. |
@@ -1240 +1240 @@
-**Version step.** W0-01 asks Adam before W0-99 allocates anything; if he has not answered, the scribe uses patch steps from v2.71.1 (the only written rule on record, as the front matter's Q-VER suggests) and Adam can relabel before his commit. Evidence both ways: Adam's memory note (21-Aug-2026, when VV was at v2.21.N) asks for patch bumps in `ValeVision__DEVLOG__.md`, and the devlog did step v2.21.1-v2.21.21 that way (10-11 Sep, `VV/ValeVision__DEVLOG__.md:4763` up to `:3942`); from v2.22.0 (1 [...]
+**Version step.** W0-01 asks Adam before W0-99 allocates anything; if he has not answered, the scribe uses patch steps from v2.71.1 (the only written rule on record, as the front matter's Q-VER suggests) and Adam can relabel before his commit. Evidence both ways: Adam's memory note (21-Aug-2026, when VV was at v2.21.N) asks for patch bumps in `ValeVision__DEVLOG__.md`, and the devlog did step v2.21.1-v2.21.21 that way (10-11 Sep, `VV/ValeVision__DEVLOG__.md:4763` up to `:3942`); from v2.22.0 (1 [...]
@@ -1325 +1325,2 @@
-- Decisions you implement: <DR-nn: answer or "default: ...">, ...
+- Decisions you implement: <DR-nn: answer or "default: ...">, ... and every front-matter question your notes or acceptance name
+  (<Q-xx: answer or "default: ...">; R0.2.1, R0.2.11; W0-01 records them)
@@ -1383 +1384,2 @@
-  selector and the bare-stage check; in wp_canonical.json since 01-Oct-2026, so already in the text below.
+  selector and the bare-stage check; C35 - the note naming the front matter's Q-COVER; in wp_canonical.json since
+  01-Oct-2026, so already in the text below.
@@ -1388 +1390,3 @@
-  DR-39 TV wording, TV's in-host veil with the fold visible, a veil for the first drawing after a document tab.
+  DR-39 TV wording, TV's in-host veil with the fold visible, a veil for the first drawing after a document tab;
+  R0.2.11 Q-COVER: part (2) is the C22 seam in section 4; part (1), what the boot cover says on a cold document-tab
+  press, is Adam's (default: the drawing cover's headline with VV's two pre-load lines and no drawing job).
@@ -1417,0 +1422 @@
+- Notes: R0.2.11 Q-COVER: part (2), how 'immediate' reaches FirstOpen, is settled by the seam above (F.8 C22); part (1), the boot cover's words on a cold document-tab press (Specification, later Register or Statements), is Adam's - default: the drawing cover's headline with VV's two pre-load status lines and no drawing job, confirmed by eye (R4 D.4 check 15). [F.8 C35]
@@ -1449 +1454 @@
-- a gate fails twice on your files; DR-39 has been answered differently from the default above.
+- a gate fails twice on your files; DR-39 or Q-COVER (1) has been answered differently from the default above.
@@ -1508 +1513 @@
-K3 still validates with the corrections applied (`k3_verify_outputs.py` on the corrected files: schema, raw ids, topological sort of 165, critical path 65,429, 93 hot files with 0 unordered pairs, wave barrier - all PASS on 01-Oct-2026). C1-C9 were found while building this section. C10-C33 carry the package-level corrections raised in Sections A-E and in review, each re-checked against the code on 01-Oct-2026; C33 proposed one new conditional package, W5-07. On 01-Oct-2026 (H2) every row that  [...]
+K3 still validates with the corrections applied (`k3_verify_outputs.py` on the corrected files: schema, raw ids, topological sort of 165, critical path 65,429, 93 hot files with 0 unordered pairs, wave barrier - all PASS on 01-Oct-2026). C1-C9 were found while building this section. C10-C33 carry the package-level corrections raised in Sections A-E and in review, each re-checked against the code on 01-Oct-2026; C33 proposed one new conditional package, W5-07. C34-C36 were added by the report's  [...]
@@ -1517 +1522 @@
-| C6 | K3 open issue: devlog version step | K3 leaves the step to W0-01 with no evidence of current practice. The devlog shows patch steps v2.21.1-v2.21.21 (10-11 Sep), then minor steps from v2.22.0 to v2.71.0 with `.1` only for twelve follow-up fixes; Adam's memory note asking for patch bumps (21-Aug) predates that change. | `VV/ValeVision__DEVLOG__.md:4`, `:509`, `:3862`, `:3942`, `:4763`; memory note dated 21-Aug-2026. | Still Adam's call in W0-01; the fallback is patch steps from v2.71.1, m [...]
+| C6 | K3 open issue: devlog version step | K3 leaves the step to W0-01 with no evidence of current practice. The devlog shows patch steps v2.21.1-v2.21.21 (10-11 Sep), then minor steps from v2.22.0 to v2.71.0 with `.1` only for thirteen follow-up fixes; Adam's memory note asking for patch bumps (21-Aug) predates that change. | `VV/ValeVision__DEVLOG__.md:4`, `:509`, `:3862`, `:3942`, `:4763`; memory note dated 21-Aug-2026. | Still Adam's call in W0-01; the fallback is patch steps from v2.71.1, [...]
@@ -1545 +1550,4 @@
-
+| C34 | W0-06 acceptance item 1: the Release Watermark tally and DIV-3's status | W0-06 acceptance item 1 seeds the ledger's Release Watermark with S11's pre-verifier tally ('classification counts 55/6/14/83/6/7/4/2 as S11 B3') and lists DIV-1..DIV-4 as permanent. S11's verifier corrected the tally to 55/6/17/79/6/8/4/2 (102 open), and Section E's reconciliation of every slice's evidence gives 51/11/17/80/4/2/7/4/1 (112 open), which the front matter makes canonical and quotes as W0-06's replace [...]
+| C35 | The front matter's open questions (R0.2.1 Q-VER; R0.2.11 Q-63, Q-35ASSETS, Q-REG, Q-AZIMUTH, Q-COVER, Q-BACKUP) named in the packages they gate | R0.2.11 says a package in a question's Gates column must not start until the question is answered or W0-01 has recorded its default, but no package names the questions: W0-01 records one D-number per K1 DR only; W0-06 and W0-04 do not say how 08, 09, 12-14 and 16-19 (Q-REG) or 63 (Q-63) are registered; W0-09 leaves the backup root to config (Q [...]
+| C36 | W0-19 acceptance item 2: the statement test server answers TV's local-server probe | W0-19's adapted Na__Test__StatementServer__.py is to answer /api/check-localhost, but TV's test answers /api/health 'as the ProjectVision local server does, so the app treats the statements folder as writable' (TV test :25-26, :133-135), and under DR-28 (A) the ported statement transport recognises the local server through GET /api/health with service 'whitecardopedia-local-dev' (one SERVICE constant pe [...]
+
~~~~

### `report/K1__DecisionRegister.md`

~~~~diff
@@ -95 +95 @@
-| **DR-01** Port gate: does the 01-Oct-2026 alignment request sign off TV features still marked 'awaiting Adam's sign-off' or 'NOT tried by Adam'? | TrueVision shipped 88 releases (v2.86.0 to v2.172.0) after the last return trip to ValeVision (20-Sep, TV v2.85.0); most close with 'NOT tried by Adam; NOT in ValeVision', 17 are parked 'on Adam's sign-off' in the TV devlog or ledger and 16 more in TV's feature plans, and 68 TV module files say the ValeVision port waits for your sign-off or that yo [...]
+| **DR-01** Port gate: does the 01-Oct-2026 alignment request sign off TV features still marked 'awaiting Adam's sign-off' or 'NOT tried by Adam'? | TrueVision shipped 88 releases (v2.86.0 to v2.172.0) after the last return trip to ValeVision (20-Sep, TV v2.85.0); most close with 'NOT tried by Adam; NOT in ValeVision', 7 of them are parked 'on Adam's sign-off' (17 release rows in all, older ones included) in the TV devlog or ledger and 16 more in TV's feature plans, and 68 TV module files say t [...]
@@ -185 +185 @@
-| DR-41 | Which sign is right | S02a-F21 / D-S02a-03: fix TV to VV's convention. TV's own Serialize comment says the engines store constant with opposite signs, so +constant is correct. S12 D-S12-V02: fix TV's entry keys too. | VVM/42__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js:297-299 builds a plan cut with normal (0,-1,0) at -cutHeight along it (constant = +h) and VVM/41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js:1502 writes -constant, restoring through norm [...]
+| DR-41 | Which sign is right | S02a-F21 / D-S02a-03: fix TV to VV's convention. TV's own Serialize comment says the engines store constant with opposite signs, so +constant is correct. S12 D-S12-V02: fix TV's entry keys too. | VVM/42__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js:297-300 builds a plan cut with normal (0,-1,0) at -cutHeight along it (constant = +h) and VVM/41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js:1502 writes -constant, restoring through norm [...]
@@ -199 +199 @@
-| DR-41 | VVM/42__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js:292-299 |
+| DR-41 | VVM/42__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js:292-300 |
@@ -252 +252 @@
-| **DR-11** Drawing Register and TV's three-part Document ID for Vale drawings | TV v2.71.0 numbers drawings through a Drawing Register (51__Feature__DrawingRegister): a register-written sequence, a per-sheet phase and the project code compose a 'Document ID' printed in the title block and used for PDF names, published folders and picture folders. VV prints a hand-typed 'Drawing No.' (default 3047-01). Adopt TV's model, and with what Vale values? | A. Adopt fully: the register and the Document  [...]
+| **DR-11** Drawing Register and TV's three-part Document ID for Vale drawings | TV v2.71.0 numbers drawings through a Drawing Register (51__Feature__DrawingRegister): a register-written sequence, a per-sheet phase and the project code compose a 'Document ID' printed in the title block and used for PDF names, published folders and picture folders. VV prints a hand-typed 'Drawing No.' (default 3047-01). Adopt TV's model, and with what Vale values? | A. Adopt fully: the register and the Document  [...]
~~~~

### `report/K3__WorkPackages.md`

~~~~diff
@@ -7 +7 @@
-**Section F corrections applied (01-Oct-2026).** Section F of the parity report (R6) corrects this catalogue in its F.8 rows C1-C33; `k3_build.py` applies them through `k3_f8_corrections.py` (the ops are in `r6_corrections.py`), so this document and the JSON carry them: a changed line ends in `[F.8 Cn]`, an added target, hot file or source note carries `(F.8 Cn)`, each corrected package lists its rows in `f8_corrections`, swarm rules R3, R5, R8, R11 and gate G4 are amended, and W5-07 is the pac [...]
+**Section F corrections applied (01-Oct-2026).** Section F of the parity report (R6) corrects this catalogue in its F.8 rows C1-C36 (C34-C36 added by the report's final harmonisation, H1, 01-Oct-2026); `k3_build.py` applies them through `k3_f8_corrections.py` (the ops are in `r6_corrections.py`), so this document and the JSON carry them: a changed line ends in `[F.8 Cn]`, an added target, hot file or source note carries `(F.8 Cn)`, each corrected package lists its rows in `f8_corrections`, swar [...]
~~~~

### `report/K2__TargetMaps.md` (generated tables only; its prose is in the edits below)

~~~~diff
@@ -43,2 +43,3 @@
-3. **VV-only numbers.** Only two VV-only folders move: legacy 40 -> **91** (W1) and EmailWorkers 62 -> **92** (W3, deferred).
-   Both numbers are proved free in TV now and in TV's history. Everything else VV-only stays and is reserved in a registry
+3. **VV-only numbers.** Only one VV-only folder moves: legacy 40 -> **91** (W1). EmailWorkers keeps 62 (a nominal collision,
+   recorded; DR-03 default "62 unchanged") and moves to **92** only if Adam asks (FR-22; K3 W6-03, after node_modules is
+   untracked). Both numbers are proved free in TV now and in TV's history. Everything else VV-only stays and is reserved in a registry
@@ -89 +90 @@
-| TF-T32 | 62__Feature__EmailWorkers/ | 92__Feature__EmailWorkers/ | - | **renumber** | W3 (deferred) | 4 files / 4 refs | DR-03 | D-S01-08, D-S01-05 |
+| TF-T32 | 62__Feature__EmailWorkers/ | 62__Feature__EmailWorkers/ | - | **keep** | W3 (only on request; K3 W6-03) | 4 files / 4 refs | DR-03 | D-S01-08, D-S01-05 |
@@ -234 +235 @@
-| FR-22 | **move** | folder | 62__Feature__EmailWorkers/ | 92__Feature__EmailWorkers/ | - | W3 (deferred) | 4 files | DR-03 | D-S01-08, D-S01-05 |
+| FR-22 | **move** | folder | 62__Feature__EmailWorkers/ | 92__Feature__EmailWorkers/ | - | W3 (only on request; K3 W6-03) | 4 files | DR-03 | D-S01-08, D-S01-05 |
@@ -323 +324 @@
-| 62 | 62__Feature__AppInstallability | 62__Feature__EmailWorkers | - | W3 (deferred) | nominal collision until W3 (VV EmailWorkers -> 92); TV's AppInstallability is never ported (VV uses the WCP PWA) |
+| 62 | 62__Feature__AppInstallability | 62__Feature__EmailWorkers | 62__Feature__EmailWorkers | W3 (only on request; K3 W6-03) | nominal collision, kept (DR-03 default): VV EmailWorkers stays at 62 and moves to 92 only on request (FR-22, K3 W6-03); TV's AppInstallability is never ported (VV uses the WCP PWA) |
@@ -334 +335 @@
-| 92 | - | - | 92__Feature__EmailWorkers | W3 (deferred) | VV-only band: 62__Feature__EmailWorkers moves here |
+| 92 | - | - | - | W3 (only on request; K3 W6-03) | VV-only band: reserved for 62__Feature__EmailWorkers if Adam asks for the move (FR-22, K3 W6-03) |
@@ -352,2 +353,2 @@
-| VV-reserved (TV never takes these) | VV | 28, 29, 31, 35 (until retired, then burnt), 60, 61, 63, 64, 69, 71; 62 until FR-22 moves it |
-| VV legacy / VV-only band | VV | 91 (2dElevationsView), 92 (EmailWorkers), 93-99 free for future VV-only folders |
+| VV-reserved (TV never takes these) | VV | 28, 29, 31, 35 (until retired, then burnt), 60, 61, 63, 64, 69, 71; 62 (FR-22 moves it to 92 only on request) |
+| VV legacy / VV-only band | VV | 91 (2dElevationsView), 92 (reserved for EmailWorkers if FR-22 runs), 93-99 free for future VV-only folders |
@@ -426,2 +427,4 @@
-single service-worker package (cache split, unsaved-work hold, precache fixes) lands before the first deploy of swarm output. `WebApps/live_sw.js:157` is a stale tracked copy (token `2026-09-10-6`); confirm which file the deployed site
-registers before editing it (S01 W7).
+single service-worker package (cache split, unsaved-work hold, precache fixes) lands before the first deploy of swarm output. Which file VV registers is resolved in code (R0 P10, R6 F.8 C5): the WCP registrar registers the WebApps stub
+`Na__Pwa__ServiceWorker__.js`, which imports the WCP logic file; `WebApps/live_sw.js` is an unreferenced saved copy (token
+`2026-09-10-6` at `:68`; `:157` is its stale DistanceCulling precache line). Left: confirm at the W0 deploy that the live site
+serves the same stub (S01 W7).
@@ -449 +452 @@
-| W3 | FR-21 (retire 35), FR-25 (retire 91), FR-22 (62 -> 92), FR-23 (old three.js), FR-24 (SceneInspector split, optional and not recommended by DR-44); vendor 07 PdfJs only if the Register needs it before TV adopts it. | User-visible removals and housekeeping; none blocks a port. |
+| W3 | FR-21 (retire 35), FR-25 (retire 91), FR-22 (62 -> 92, only on request), FR-23 (old three.js), FR-24 (SceneInspector split, optional and not recommended by DR-44); vendor 07 PdfJs only if the Register needs it before TV adopts it. | User-visible removals and housekeeping; none blocks a port. |
@@ -485 +488,2 @@
-- Whether the deployed site registers the WCP stub or the stale `WebApps/live_sw.js` (S01 W7) is unverified.
+- Resolved in code (R0 P10, R6 F.8 C5): VV registers the WCP stub, and `WebApps/live_sw.js` is an unreferenced saved copy;
+  only the live site's copy is left to confirm, at the W0 deploy (S01 W7).
~~~~

### `data/wp_canonical.json` (F.8 rows C34-C36 as `k3_build.py` applied them; from `data/wp_corrections_applied.json`)

| Row | Package | Field | Before | After |
|---|---|---|---|---|
| C34 | W0-06 | `acceptance[1]` | Ledger sections: Header (roots; DIV-1..DIV-4 permanent, DIV-5 closed), Folder map with the dated "Folder renumbering" old->new table and the four file moves, Module Register (one row per module in scope; its blocked-by column is filled by W0-99 from the W0-05 map), Release Watermark (177 rows, classification counts 55/6/14/83/6/7/4/2 as S11 B3), Decisions, VV->TV back-ports (B5 statuses), Archive. | Ledger sections: Header (roots; DIV-1, DIV-2 and DIV-4 permanent, DIV-3 and DIV-5 closed), Folder map with the dated "Folder renumbering" old->new table and the four file moves, Module Register (one row per module in scope; its blocked-by column is filled by W0-99 from the W0-05 map), Release Watermark (177 rows) seeded from `parity/report/tools/r5work/release_rows_final.json`: 51 ported / 11 part |
| C35 | W0-01 | `acceptance[7] (added)` | - | The Decisions block also records the front matter's open questions, each as a VV D-number with Adam's answer or 'default, unanswered' and the default it then applies: Q-VER (the devlog step of item 3; R0.2.1), Q-63, Q-35ASSETS, Q-REG, Q-AZIMUTH, Q-COVER and Q-BACKUP (R0.2.11). Q-AZIMUTH and part (2) of Q-COVER are recorded as the planner's rulings already applied (F.8 C20 in W1-10 and W2-05, F.8 C |
| C35 | W0-04 | `notes[2] (added)` | - | The unregistered-number check reads the registry as W0-06 writes it under the front matter's defaults: 08, 09, 12-14 and 16-19 are TV growth (R0.2.11 Q-REG), and 63 stays VV-reserved while TV's branch claude/westfarm-intro-notes-37b804 is unmerged (Q-63). [F.8 C35] |
| C35 | W0-06 | `notes[2] (added)` | - | Registry defaults from the front matter (R0.2.11): Q-REG - 08, 09, 12-14 and 16-19 are written as TV growth, extending DR-03 registry (i); Q-63 - 63 stays VV-reserved (VVM/63__Feature__AppNotificationEmail/) while TV's unmerged branch claude/westfarm-intro-notes-37b804 (commit 4db73420) adds 63__System__LocalFileParity; if that branch merges as 63 first, the registry records 93 for VV's folder, wh |
| C35 | W0-09 | `notes[1] (added)` | - | Backup root (R0.2.11 Q-BACKUP): unless Adam names another location, config holds %LOCALAPPDATA%\ValeGardenHouses\ValeVision\ProjectDataBackups, keep 30, mirroring TV's TRUEVISION_PROJECT_BACKUP_ROOT, else %LOCALAPPDATA%\NobleArchitecture\TrueVision\ProjectDataBackups (NAAPPS/ProjectVision__LocalServer__Main__.py:112-116); Adam confirms it before the first guarded save. [F.8 C35] |
| C35 | W0-16 | `notes[2] (added)` | - | R0.2.11 Q-35ASSETS: if Adam answers (a) before W0-16 is dispatched, the planner adds 35's VizDpt A3 variant (02__VizDpt__TitleBlock__Pdf__/, pdf and png) and the 12 RecConcept layouts (03__TitleBlock__LayoutPdfs__RecConcept__Feb-2026__/) to this package as copies beside the Classic scan in VV/01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/; otherwise the choice waits for W6-03's hard gate, w |
| C35 | W1-10 | `notes[1] (added)` | - | R0.2.11 Q-AZIMUTH is the planner's ruling (b), applied by F.8 C20: both VV-only setters stay exported through W1, and W2-05 retires them. [F.8 C35] |
| C35 | W1-33 | `notes[1] (added)` | - | R0.2.11 Q-COVER: part (2), how 'immediate' reaches FirstOpen, is settled by the seam above (F.8 C22); part (1), the boot cover's words on a cold document-tab press (Specification, later Register or Statements), is Adam's - default: the drawing cover's headline with VV's two pre-load status lines and no drawing job, confirmed by eye (R4 D.4 check 15). [F.8 C35] |
| C35 | W2-05 | `notes[1] (added)` | - | R0.2.11 Q-AZIMUTH (b), applied by F.8 C20: this package retires Na__ElevData__SetAzimuthDeg and Na__ElevData__SetSeededFrom. [F.8 C35] |
| C35 | W6-03 | `notes[1] (added)` | - | Front-matter questions (R0.2.11): the keep-or-archive choice in the hard gate is Q-35ASSETS (recommended (a): copy the 14 files beside the Classic scan in VV/01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/); if TV's branch claude/westfarm-intro-notes-37b804 has merged 63__System__LocalFileParity first, Q-63 (b) moves VVM/63__Feature__AppNotificationEmail/ to VVM/93__Feature__AppNotificationE |
| C36 | W0-19 | `acceptance[2]` | Adapted Na__Test__StatementServer__.py imports the VV blueprint against a temp Projects root, answers /api/check-localhost and /api/editor-config with a fake key, blocks worker writes, and proves fencing (.., absolute, symlink, depth, bad segment, wrong suffix), size caps, never-overwrite of a picture (__02), delete refused without confirm, 404 JSON for a missing file. | Adapted Na__Test__StatementServer__.py imports the VV blueprint against a temp Projects root, answers GET /api/health with service 'whitecardopedia-local-dev' (DR-28 (A); TV's test answers /api/health, :25-26, :133-135), /api/check-localhost (still probed by VV's own modules) and /api/editor-config with a fake key, blocks worker writes, and proves fencing (.., absolute, symlink, depth, bad segment |

Also in `wp_canonical.json`: each corrected package lists its new rows in `f8_corrections` (W0-01, W0-04, W0-06, W0-09, W0-16, W0-19, W1-10, W1-33, W2-05, W6-03), and the `f8_corrections` block reads "F.8 rows C1-C36" with C34-C36 in `rows_applied`. No dependency, gate, size, estimate, hot file or target changed: `hot_file_ownership.json` and `wp_raw_map.json` are byte-identical to their pre-H1 copies, and the critical path, waves and topological order are unchanged. `wp_corrections_applied.json` now holds rows C1-C36 (84 ops, 30 packages corrected, nothing unattributed).

### `data/target_folder_map.json`, `data/file_rename_map.json`, `data/decision_register.json` (changed fields)

| File | Row | Field | Before | After |
|---|---|---|---|---|
| target_folder_map.json | TF-T32 | `target_vv` | ..."02__Src__AppModules/92__Feature__EmailWorkers/"... | ..."02__Src__AppModules/62__Feature__EmailWorkers/"... |
| target_folder_map.json | TF-T32 | `action` | ..."renumber"... | ..."keep"... |
| target_folder_map.json | TF-T32 | `reason` | ...number (VV uses WCP's PWA, never TV 62), so the collision is nominal: record it now, move to 92__Feature__EmailWorkers in W3 only after its 1,857 tracked node_modules files are untracked (1,877 tracked files in the folder; BUILD__Deploy__EmailWorker.bat.lnk holds an absolute path Adam must re-point)."... | ...number (VV uses WCP's PWA, never TV 62), so the collision is nominal: record it and keep 62 (DR-03: recommendation \"keep 62 for now\", default \"62 unchanged\"). The move to 92__Feature__EmailWorkers (FR-22) runs only if Adam asks (D-S01-08 (a); K3 W6-03), and only after its 1,857 tracked node_modules files are untracked (1,877 tracked files in the folder; BUILD__Deploy__EmailWorker.bat.lnk holds... |
| target_folder_map.json | TF-T32 | `risk` | ..."Medium: 1,857 tracked node_modules files make the git mv heavy until untracked; the .lnk deploy shortcut breaks silently."... | ..."None while 62 stays. If FR-22 runs: medium - 1,857 tracked node_modules files make the git mv heavy until untracked, and the .lnk deploy shortcut breaks silently."... |
| target_folder_map.json | TF-T32 | `phase` | ..."W3 (deferred)"... | ..."W3 (only on request; K3 W6-03)"... |
| file_rename_map.json | FR-22 | `reason` | ... with TV/WCP 62__Feature__AppInstallability. 92 proved free (never used by TV). Deferred until node_modules is untracked (1,857 of 1,877 tracked files)."... | ... with TV/WCP 62__Feature__AppInstallability. 92 proved free (never used by TV). Runs only if Adam asks (D-S01-08 (a); K3 W6-03): the DR-03 default keeps 62 (TF-T32). Never before node_modules is untracked (1,857 of 1,877 tracked files)."... |
| file_rename_map.json | FR-22 | `phase` | ..."W3 (deferred)"... | ..."W3 (only on request; K3 W6-03)"... |
| decision_register.json | DR-01 | `question` | ...n (20-Sep, TV v2.85.0); most close with 'NOT tried by Adam; NOT in ValeVision', 17 are parked 'on Adam's sign-off' in the TV devlog or ledger and 16 more in TV's feature plans, and 68 TV module files say the ValeVision port waits for your sign-off or that you have not tried the feature (62 of them in a PORT NOTE Back-port or ValeVision line). Does your request to align ValeVision exactly with True... | ...n (20-Sep, TV v2.85.0); most close with 'NOT tried by Adam; NOT in ValeVision', 7 of them are parked 'on Adam's sign-off' (17 release rows in all, older ones included) in the TV devlog or ledger and 16 more in TV's feature plans, and 68 TV module files say the ValeVision port waits for your sign-off or that you have not tried the feature (62 of them in a PORT NOTE Back-port or ValeVision line). Do... |
| decision_register.json | DR-11 | `recommendation` | ...picture folders; never the ?project= token, which would print '2026/3047__Doous_T01_D01' (S07a-V01); GetProjectCode() stays the transport token. Use the per-sheet escape hatch where scheme siblings collide (13 codes are shared, S07a-F15); if Vale needs cross-scheme uniqueness, add a project-level override in BOTH apps. Phases: you supply Vale's stage words; TV's T01 Concept / T02 Planning / T03 Bu... | ...picture folders; never the ?project= token, which would print '2026/3047__Doous_D01', a folder path inside a document name (S07a-V01); GetProjectCode() stays the transport token. Use the per-sheet escape hatch where scheme siblings collide (13 codes are shared, S07a-F15); if Vale needs cross-scheme uniqueness, add a project-level override in BOTH apps. Phases: you supply Vale's stage words; TV's T... |
| decision_register.json | DR-41 | `conflicts_resolved` | ...idence": "VVM/42__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js:297-299 builds a plan cut with normal (0,-1,0) at -cutHeight along it (constant = +h) and VVM/41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js:1502 writes -constant, restoring through normal*positionMm (:1540-1541); TVM/41__System__SectionCutEngine/Na__SectionCut__Serialize__.js:185-194 writes +constant; T... | ...idence": "VVM/42__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js:297-300 builds a plan cut with normal (0,-1,0) at -cutHeight along it (constant = +h) and VVM/41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js:1502 writes -constant, restoring through normal*positionMm (:1540-1541); TVM/41__System__SectionCutEngine/Na__SectionCut__Serialize__.js:185-194 writes +constant; T... |
| decision_register.json | DR-41 | `verified_evidence` | ...["VVM/42__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js:292-299", "VVM/41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js:567, :1502, :1540-1541", "TVM/41__System__SectionCutEngine/Na__SectionCut__Serialize__.js:185-194, :246-262", "TV/TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md:189, :217, :245, :761"]... | ...["VVM/42__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js:292-300", "VVM/41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js:567, :1502, :1540-1541", "TVM/41__System__SectionCutEngine/Na__SectionCut__Serialize__.js:185-194, :246-262", "TV/TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md:189, :217, :245, :761"]... |

## Every edit (file, location, before -> after, reason, evidence)

Edits to a generator or its input are marked with the output they feed; those outputs were rebuilt, never hand-edited.

### 1. `report/tools/r6_corrections.py` - CORRECTIONS: rows C34-C36 appended after C32

- **Feeds:** wp_canonical.json, K3__WorkPackages.md, wp_corrections_applied.json (k3_build.py, h2_record_corrections.py) and R6 F.3/F.8 (r6_build_sectionF.py)
- **Reason:** Item 1 (W0-06 acceptance item 1 takes the exact text of R0.2.9 note), item 8/(i) (the R0.2.11 questions named where they gate work) and sweep (f) (W0-19 probe still /api/check-localhost against DR-28 (A)). Rows are applied to wp_canonical.json by k3_build.py through k3_f8_corrections.py, like C1-C33.
- **Evidence:** W0-06 acceptance[1] still read "55/6/14/83/6/7/4/2 as S11 B3" and "DIV-1..DIV-4 permanent" after H2; release_rows_final.json recount 51/11/17/80/4/2/7/4/1; TV Na__Test__StatementServer__.py:25-26, :133-135; grep of wp_canonical.json for "Q-" found no question ids.
- **Before:**

~~~~text
    },
]

# The proposed package (no wp_canonical.json record yet, so no overlay): rendered as F.8 C33.
~~~~

- **After:**

~~~~text
    },
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

# The proposed package (no wp_canonical.json record yet, so no overlay): rendered as F.8 C33.
~~~~

### 2. `report/tools/r6_corrections.py` - module docstring

- **Feeds:** wp_canonical.json, K3__WorkPackages.md, wp_corrections_applied.json (k3_build.py, h2_record_corrections.py) and R6 F.3/F.8 (r6_build_sectionF.py)
- **Reason:** Docstring names the new rows.
- **Before:**

~~~~text
     ops of CORRECTIONS for C10-C32, PLANNER_OPS for the steps a row leaves to the planner or that
~~~~

- **After:**

~~~~text
     ops of CORRECTIONS for C10-C32 and C34-C36 (C34-C36 added by H1, the report's final cross-section
     harmonisation, 01-Oct-2026), PLANNER_OPS for the steps a row leaves to the planner or that
~~~~

### 3. `report/tools/r6_corrections.py` - rows(): numeric order

- **Feeds:** wp_canonical.json, K3__WorkPackages.md, wp_corrections_applied.json (k3_build.py, h2_record_corrections.py) and R6 F.3/F.8 (r6_build_sectionF.py)
- **Reason:** F.8 renders C10..C36 in numeric order now that rows follow C33.
- **Before:**

~~~~text
    out.append((PROPOSED['id'], PROPOSED['item'], PROPOSED['finding'], PROPOSED['evidence'], PROPOSED['applied']))
    return out
~~~~

- **After:**

~~~~text
    out.append((PROPOSED['id'], PROPOSED['item'], PROPOSED['finding'], PROPOSED['evidence'], PROPOSED['applied']))
    return sorted(out, key=lambda r: int(r[0][1:]))       # C33 (PROPOSED) before the H1 rows C34-C36
~~~~

### 4. `report/tools/k3_f8_corrections.py` - meta(): rows and by

- **Feeds:** wp_canonical.json f8_corrections block (k3_build.py)
- **Reason:** The f8_corrections block of wp_canonical.json names the row range it carries.
- **Before:**

~~~~text
        'by': 'H2 (k3_build.py through k3_f8_corrections.py)',
        'rows': 'Section F (report/R6__F_SwarmDelegationPlan.md), F.8 rows C1-C33',
~~~~

- **After:**

~~~~text
        'by': 'H2 (k3_build.py through k3_f8_corrections.py); rows C34-C36 added by H1 (01-Oct-2026) and applied the same way',
        'rows': 'Section F (report/R6__F_SwarmDelegationPlan.md), F.8 rows C1-C%d' % max(int(c['id'][1:]) for c in K.CORRECTIONS),
~~~~

### 5. `report/tools/k3_f8_corrections.py` - module docstring

- **Feeds:** wp_canonical.json f8_corrections block (k3_build.py)
- **Reason:** Docstring names the row range.
- **Before:**

~~~~text
Section F of the parity report corrects K3 in its F.8 rows C1-C33.
~~~~

- **After:**

~~~~text
Section F of the parity report corrects K3 in its F.8 rows C1-C36 (C34-C36 added by H1 on 01-Oct-2026).
~~~~

### 6. `report/tools/k3_report_md.py` - K3 md: Section F corrections paragraph

- **Feeds:** K3__WorkPackages.md (k3_build.py)
- **Reason:** K3__WorkPackages.md states the F.8 row range it carries.
- **Before:**

~~~~text
corrects this catalogue in its F.8 rows C1-C33; '
~~~~

- **After:**

~~~~text
corrects this catalogue in its F.8 rows C1-C36 (C34-C36 added by the report\'s final harmonisation, H1, 01-Oct-2026); '
~~~~

### 7. `report/tools/h2_record_corrections.py` - ITEMS in numeric order

- **Feeds:** data/wp_corrections_applied.json
- **Reason:** wp_corrections_applied.json lists rows C1-C36 in order.
- **Before:**

~~~~text
ITEMS[K.PROPOSED['id']] = K.PROPOSED['item']
~~~~

- **After:**

~~~~text
ITEMS[K.PROPOSED['id']] = K.PROPOSED['item']
ITEMS = collections.OrderedDict(sorted(ITEMS.items(), key=lambda kv: int(kv[0][1:])))   # H1: C34-C36 follow C33
~~~~

### 8. `report/tools/h2_record_corrections.py` - record description

- **Feeds:** data/wp_corrections_applied.json
- **Reason:** The record names the H1 rows.
- **Before:**

~~~~text
('description', 'Every Section F (R6) F.8 correction (rows C1-C33) as applied to the K3 artefacts on 01-Oct-2026 by k3_build.py through '
~~~~

- **After:**

~~~~text
('description', 'Every Section F (R6) F.8 correction (rows C1-C33, and C34-C36 that H1 added) as applied to the K3 artefacts on 01-Oct-2026 by k3_build.py through '
~~~~

### 9. `report/tools/h2_validate.py` - ROWS: every F.8 row id defined

- **Feeds:** (validator only)
- **Reason:** h2_validate.py keeps passing with the H1 rows (its row set was hard-coded to C1-C33).
- **Before:**

~~~~text
ROWS = {'C%d' % n for n in range(1, 34)}
~~~~

- **After:**

~~~~text
import r6_corrections as _K6, r6_prose as _T6  # noqa: E402  (H1: rows C34-C36 follow C1-C33)
ROWS = {c[0] for c in _T6.CORRECTIONS} | {c['id'] for c in _K6.CORRECTIONS} | {_K6.PROPOSED['id']}
~~~~

### 10. `report/tools/h2_validate.py` - check A label

- **Feeds:** (validator only)
- **Reason:** Label follows the row set.
- **Before:**

~~~~text
check('A', 'wp_corrections_applied.json: rows C1-C33, every applied row has a change, nothing unattributed',
~~~~

- **After:**

~~~~text
check('A', 'wp_corrections_applied.json: rows C1-C%d, every applied row has a change, nothing unattributed' % max(int(c[1:]) for c in ROWS),
~~~~

### 11. `report/tools/h2_diff_r6.py` - NEW: the R6 that H2 wrote

- **Feeds:** (validator only)
- **Reason:** h2_diff_r6.py classifies H2's own diff; after H1 the live R6 also carries H1's rows, so it reads the snapshot H2 left (report/R6__F_SwarmDelegationPlan.pre_h1.md, as H2 kept *.pre_h2.md), byte-identical to H2's output.
- **Evidence:** cmp of the snapshot with R6 before any H1 change: identical
- **Before:**

~~~~text
NEW = os.path.join(REPORT, 'R6__F_SwarmDelegationPlan.md')
~~~~

- **After:**

~~~~text
NEW = os.path.join(REPORT, 'R6__F_SwarmDelegationPlan.pre_h1.md')   # H2's own output, kept by H1 (which changed R6 after it)
~~~~

### 12. `report/tools/critic/ids_check.py` - DR ids read from dr_id

- **Feeds:** (validator only)
- **Reason:** Item 7: the critic helper read d.get('id'), so every DR looked unknown; the register keys them dr_id.
- **Evidence:** decision_register.json rows: keys dr_id, key, theme, ...
- **Before:**

~~~~text
drids = set(d.get('id') for d in dr)
~~~~

- **After:**

~~~~text
drids = set(d.get('dr_id') for d in dr)   # H1: decision_register.json keys DRs as dr_id (d.get('id') gave {None})
~~~~

### 13. `report/tools/critic/ids_check.py` - skip backup copies

- **Feeds:** (validator only)
- **Reason:** Item 7: the helper also scanned the *.pre_h2.md backups; a true result is for the live sections.
- **Before:**

~~~~text
    if not fn.startswith('R') or not fn.endswith('.md'): continue
~~~~

- **After:**

~~~~text
    if not fn.startswith('R') or not fn.endswith('.md') or '.pre_' in fn: continue   # H1: live sections only
~~~~

### 14. `report/tools/r6_prose.py` - F.1 P15

- **Feeds:** R6__F_SwarmDelegationPlan.md (r6_build_sectionF.py)
- **Reason:** Item 3 / sweep (c): P15 listed "TrueVision 3D Project Hub" among markers that never land in VV, contradicting W4-12, R2 B.3.7 and R0 PD-15 (the module lands inert at TV's path and is never rendered). Governing DR-43: Hub option "exclude it from VV's DEFINITIONS via config"; default "Hub excluded".
- **Evidence:** DR-43 options and default_if_unanswered; W4-12 vv_adaptations[1]; TVM .../Na__LayoutEditor__Statement__Standard__Registry__.js:140
- **Before:**

~~~~text
     "NA-only markers (`NaProjectPortal`, `30__TrueVision__AppContent`, `/na-apps/...` paths, the `/q/` and `/s/` resolvers, NA logo and letterheads, \"TrueVision 3D Project Hub\") never land in VV; features whose content is NA-only land switched off (Project QR DR-12, Statement Writer DR-10, site plans DR-08); brand lives in config values, keys stay TV's. One named exception: the TrueVisionHub statement section lands at TV's path, excluded from VV's DEFINITIONS by config and exempt from G4 by name (W4-12, F.8 C13).",
     "DR-43; K2 V1-V2; K3 R9; G4."),
~~~~

- **After:**

~~~~text
     "NA-only markers (`NaProjectPortal`, `30__TrueVision__AppContent`, `/na-apps/...` paths, the `/q/` and `/s/` resolvers, NA logo and letterheads) never land in VV, and NA content never reaches a Vale user: features whose content is NA-only land switched off (Project QR DR-12, Statement Writer DR-10, site plans DR-08); brand lives in config values, keys stay TV's. The \"TrueVision 3D Project Hub\" statement section is present but never rendered: its module `LE/52__Feature__StatementWriter/09__Standard__Sections/Na__LayoutEditor__Statement__Standard__TrueVisionHub__.js` lands inert at TV's path with W4-12 (TV's Registry imports it statically), VV's config excludes it from DEFINITIONS (DR-43 default), and it is the one file G4 exempts by name (W0-04, F.8 C13).",
     "DR-43; K2 V1-V2; K3 R9; G4; R0 PD-15; R2 B.3.7."),
~~~~

### 15. `report/tools/r6_prose.py` - F.5.2 W0 entry

- **Feeds:** R6__F_SwarmDelegationPlan.md (r6_build_sectionF.py)
- **Reason:** Sweep (i): the R0.2.11 questions referenced where they gate work.
- **Evidence:** R0 R0.2.1 Tier 2 table (Q-REG, Q-63, Q-BACKUP read by Wave 0)
- **Before:**

~~~~text
inside the wave Adam commits W0-01's PLAN edit before W0-02 is dispatched, and W0-02 alone before the rest of W0 (F.8 C10); baselines of F.0 recorded by the integrator.",
~~~~

- **After:**

~~~~text
inside the wave Adam commits W0-01's PLAN edit before W0-02 is dispatched, and W0-02 alone before the rest of W0 (F.8 C10); the front matter's questions that Wave 0 reads (R0.2.1 Q-VER; R0.2.11 Q-REG, Q-63, Q-BACKUP) answered or their defaults recorded by W0-01 (F.8 C35); baselines of F.0 recorded by the integrator.",
~~~~

### 16. `report/tools/r6_prose.py` - F.5.2 W1 entry

- **Feeds:** R6__F_SwarmDelegationPlan.md (r6_build_sectionF.py)
- **Reason:** Sweep (i): Q-COVER gates W1-33.
- **Evidence:** R0.2.11 Q-COVER Gates column: W1-33
- **Before:**

~~~~text
before any W1 build is deployed (W1-19 re-normalises every sheet; recommended here, see F.5.7).",
~~~~

- **After:**

~~~~text
before any W1 build is deployed (W1-19 re-normalises every sheet; recommended here, see F.5.7); R0.2.11 Q-COVER part (1), the boot cover's words on a cold document-tab press, answered or its default recorded before W1-33 is dispatched (F.8 C35).",
~~~~

### 17. `report/tools/r6_prose.py` - F.5.2 W6 entry

- **Feeds:** R6__F_SwarmDelegationPlan.md (r6_build_sectionF.py)
- **Reason:** Sweep (i): Q-35ASSETS and Q-63 gate W6-03.
- **Evidence:** R0.2.11 Q-35ASSETS and Q-63 Gates columns
- **Before:**

~~~~text
chose keep or archive for 35's Vale title-block material (F.8 C31) and, for 62 -> 92, answered D-S01-08 (a).",
~~~~

- **After:**

~~~~text
chose keep or archive for 35's Vale title-block material (R0.2.11 Q-35ASSETS, F.8 C31) and, for 62 -> 92, answered D-S01-08 (a); if TV has merged its own 63 first, Q-63 (b) travels with W6-03 (F.8 C35).",
~~~~

### 18. `report/tools/r6_prose.py` - F.5.4 W6 item 1

- **Feeds:** R6__F_SwarmDelegationPlan.md (r6_build_sectionF.py)
- **Reason:** Sweep (i): Q-35ASSETS named in the smoke item it closes.
- **Before:**

~~~~text
35's VizDpt and RecConcept title-block files are kept or archived as Adam chose (W6-03, F.8 C31).
~~~~

- **After:**

~~~~text
35's VizDpt and RecConcept title-block files are kept or archived as Adam chose (W6-03, F.8 C31; R0.2.11 Q-35ASSETS).
~~~~

### 19. `report/tools/r6_prose.py` - F.5.5 version step: thirteen .1 fixes

- **Feeds:** R6__F_SwarmDelegationPlan.md (r6_build_sectionF.py)
- **Reason:** R0 (Q-VER) counts 13 `.1` releases after v2.22.0; R6 said twelve. The devlog has 13: v2.22.1, 31.1, 44.1, 45.1, 47.1, 48.1, 49.1, 50.1, 54.1, 56.1, 58.1, 59.1, 66.1.
- **Evidence:** grep -c "^## ValeVision3D v2.(22-71).[1-9]" VV/ValeVision__DEVLOG__.md = 13 (lines 509 ... 3816)
- **Before:**

~~~~text
every feature release steps the minor number and twelve follow-up fixes take `.1`
~~~~

- **After:**

~~~~text
every feature release steps the minor number and thirteen follow-up fixes take `.1`
~~~~

### 20. `report/tools/r6_prose.py` - F.8 C6 row: count and note for R0

- **Feeds:** R6__F_SwarmDelegationPlan.md (r6_build_sectionF.py)
- **Reason:** Same count as F.5.5 and R0 Q-VER (13).
- **Evidence:** as above
- **Before:**

~~~~text
then minor steps from v2.22.0 to v2.71.0 with `.1` only for twelve follow-up fixes;
~~~~

- **After:**

~~~~text
then minor steps from v2.22.0 to v2.71.0 with `.1` only for thirteen follow-up fixes;
~~~~

### 21. `report/tools/r6_prose.py` - F.8 C6 row: note for R0 now answered

- **Feeds:** R6__F_SwarmDelegationPlan.md (r6_build_sectionF.py)
- **Reason:** R0 Q-VER (R0.2.1 row 8) already records the patch run v2.21.1-v2.21.21; the note was stale.
- **Evidence:** R0 R0.2.1 Tier 1 row 8
- **Before:**

~~~~text
Note for R0: Q-VER says minor bumps since v2.16.0, but v2.21.1-v2.21.21 were patch steps."),
~~~~

- **After:**

~~~~text
Note for R0: Q-VER said minor bumps since v2.16.0, but v2.21.1-v2.21.21 were patch steps (R0's Q-VER now records both, H1)."),
~~~~

### 22. `report/tools/r6_prose.py` - F.6 template: decisions and notes lines

- **Feeds:** R6__F_SwarmDelegationPlan.md (r6_build_sectionF.py)
- **Reason:** Sweep (i): a brief carries the R0.2.11 question its package names (F.8 C35).
- **Before:**

~~~~text
- Decisions you implement: <DR-nn: answer or "default: ...">, ...
~~~~

- **After:**

~~~~text
- Decisions you implement: <DR-nn: answer or "default: ...">, ... and every front-matter question your notes or acceptance name
  (<Q-xx: answer or "default: ...">; R0.2.1, R0.2.11; W0-01 records them)
~~~~

### 23. `report/tools/r6_build_sectionF.py` - Headline: identical-experience caveat

- **Feeds:** R6__F_SwarmDelegationPlan.md
- **Reason:** Sweep (g): R6 did not state the identical-experience caveat that R0.1.8 and R4 D.5 #8 give.
- **Evidence:** R0 R0.1.8 E1-E13; R4 D.5 #8
- **Before:**

~~~~text
The counts include W5-07 (retiring the Layout Mode switch), the conditional package F.8 C33 added to `wp_canonical.json` on 01-Oct-2026 with the other F.8 corrections.'
~~~~

- **After:**

~~~~text
The counts include W5-07 (retiring the Layout Mode switch), the conditional package F.8 C33 added to `wp_canonical.json` on 01-Oct-2026 with the other F.8 corrections. '
  'Run on the K1 defaults alone, the programme ends with an editor that matches TrueVision\'s code and behaviour but still differs on screen in the thirteen ways the front matter lists (R0.1.8, E1-E13): '
  'for example four tabs, not five, while DR-10 keeps the Statement Writer switched off; each row there names the answer or live action that removes the difference, and two of them (the lazy loader\'s first-open cover and Vale\'s brand content) are permanent by design.'
~~~~

### 24. `report/tools/r6_build_sectionF.py` - F.8 intro: rows C34-C36

- **Feeds:** R6__F_SwarmDelegationPlan.md
- **Reason:** Item 1: the new F.8 rows are introduced; F.8 stays the audit trail.
- **Before:**

~~~~text
C33 proposed one new conditional package, W5-07. On 01-Oct-2026 (H2)
~~~~

- **After:**

~~~~text
C33 proposed one new conditional package, W5-07. C34-C36 were added by the report\'s final cross-section harmonisation (H1, 01-Oct-2026): W0-06\'s watermark tally and DIV-3 status in the words of the front matter\'s R0.2.9 note (C34), the front matter\'s open questions named in the packages they gate (C35) and W0-19\'s statement test server answering `/api/health` (C36); `k3_build.py` applied them like the others. On 01-Oct-2026 (H2)
~~~~

### 25. `report/tools/r6_build_sectionF.py` - F.8 intro: C6 count

- **Feeds:** R6__F_SwarmDelegationPlan.md
- **Reason:** Records the one H1 change to an existing row.
- **Before:**

~~~~text
The rows below are the audit trail, unchanged; the last line of each says how it reached the JSON (C5 and C8 change nothing in K3).'
~~~~

- **After:**

~~~~text
The rows below are the audit trail, unchanged except the count of `.1` fixes in C6, which H1 corrected from twelve to thirteen; the last line of each says how it reached the JSON (C5 and C8 change nothing in K3).'
~~~~

### 26. `report/tools/r6_build_sectionF.py` - F.6.1 brief: W1-33 rows (C22, C35)

- **Feeds:** R6__F_SwarmDelegationPlan.md
- **Reason:** C35 adds a Q-COVER note to W1-33; the brief asserts its F.8 rows.
- **Before:**

~~~~text
assert p.get('f8_corrections') == ['C22'], p.get('f8_corrections')
A('- F.8 corrections that name W1-33 (its f8_corrections): C22 - the seam that carries "immediate", the .na-vs-tl')
A('  selector and the bare-stage check; in wp_canonical.json since 01-Oct-2026, so already in the text below.')
~~~~

- **After:**

~~~~text
assert p.get('f8_corrections') == ['C22', 'C35'], p.get('f8_corrections')
A('- F.8 corrections that name W1-33 (its f8_corrections): C22 - the seam that carries "immediate", the .na-vs-tl')
A('  selector and the bare-stage check; C35 - the note naming the front matter\'s Q-COVER; in wp_canonical.json since')
A('  01-Oct-2026, so already in the text below.')
~~~~

### 27. `report/tools/r6_build_sectionF.py` - F.6.1 brief: decisions line names Q-COVER

- **Feeds:** R6__F_SwarmDelegationPlan.md
- **Reason:** Sweep (i): Q-COVER referenced in the brief of the package it gates.
- **Before:**

~~~~text
A('  DR-39 TV wording, TV\'s in-host veil with the fold visible, a veil for the first drawing after a document tab.')
~~~~

- **After:**

~~~~text
A('  DR-39 TV wording, TV\'s in-host veil with the fold visible, a veil for the first drawing after a document tab;')
A('  R0.2.11 Q-COVER: part (2) is the C22 seam in section 4; part (1), what the boot cover says on a cold document-tab')
A('  press, is Adam\'s (default: the drawing cover\'s headline with VV\'s two pre-load lines and no drawing job).')
~~~~

### 28. `report/tools/r6_build_sectionF.py` - F.6.1 brief: notes line (as the template)

- **Feeds:** R6__F_SwarmDelegationPlan.md
- **Reason:** The filled brief now follows its template, which has a Notes line (the Q-COVER note lives there).
- **Before:**

~~~~text
A('  - plus the standard seams: VALEVISION3D banner, [ValeVision3D LayoutEditor] console prefix, PORT NOTE block.')
~~~~

- **After:**

~~~~text
A('  - plus the standard seams: VALEVISION3D banner, [ValeVision3D LayoutEditor] console prefix, PORT NOTE block.')
A('- Notes: ' + ('; '.join(p['notes']) if p.get('notes') else 'none'))
~~~~

### 29. `report/tools/r6_build_sectionF.py` - F.6.1 brief: stop rule names Q-COVER

- **Feeds:** R6__F_SwarmDelegationPlan.md
- **Reason:** Sweep (i).
- **Before:**

~~~~text
A('- a gate fails twice on your files; DR-39 has been answered differently from the default above.')
~~~~

- **After:**

~~~~text
A('- a gate fails twice on your files; DR-39 or Q-COVER (1) has been answered differently from the default above.')
~~~~

### 30. `report/tools/k1_register_content.py` - DR-01 question: the parked count

- **Feeds:** decision_register.json, K1__DecisionRegister.md (k1_build_register.py)
- **Reason:** Sweep (a): K1 put "17 are parked" against the 88 later releases; of those 88 only 7 are PENDING-SIGNOFF, 17 is the count over all 177 rows (R0.1.2, R5 E.1.1).
- **Evidence:** release_rows_final.json: rows from v2.86.0 = 88 (NOT-CONSIDERED 77, PENDING-SIGNOFF 7, NOT-DRAWING 2, VV-ORIGIN 1, DELIBERATE 1); PENDING-SIGNOFF over 177 rows = 17
- **Before:**

~~~~text
most close with 'NOT tried by Adam; NOT in ValeVision', 17 are parked 'on Adam's sign-off' in the TV devlog or ledger 
~~~~

- **After:**

~~~~text
most close with 'NOT tried by Adam; NOT in ValeVision', 7 of them are parked 'on Adam's sign-off' (17 release rows in all, older ones included) in the TV devlog or ledger 
~~~~

### 31. `report/tools/k1_register_content.py` - DR-11 recommendation: no NA phase in the Vale example

- **Feeds:** decision_register.json, K1__DecisionRegister.md (k1_build_register.py)
- **Reason:** Sweep (h): the Vale example printed NA job phase T01; under the DR-11 default ({project}_{drawing}) the raw token prints 2026/3047__Doous_D01, which still shows the defect (a "/" inside a document name).
- **Evidence:** DR-11 default; F.8 C21
- **Before:**

~~~~text
"'2026/3047__Doous_T01_D01' (S07a-V01); GetProjectCode() stays the transport token.
~~~~

- **After:**

~~~~text
"'2026/3047__Doous_D01', a folder path inside a document name (S07a-V01); GetProjectCode() stays the transport token.
~~~~

### 32. `report/tools/k1_register_content.py` - DR-41 evidence: adapter lines

- **Feeds:** decision_register.json, K1__DecisionRegister.md (k1_build_register.py)
- **Reason:** Sweep (e): the -cutHeightMm argument is on line 300 (function :298, normal :299).
- **Evidence:** VV 42/Na__DrawView__SectionAdapter__.js:298-300 read 01-Oct-2026
- **Before:**

~~~~text
VVM/42__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js:297-299 builds a plan cut
~~~~

- **After:**

~~~~text
VVM/42__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js:297-300 builds a plan cut
~~~~

### 33. `report/tools/k1_register_content.py` - DR-41 verified evidence: adapter lines

- **Feeds:** decision_register.json, K1__DecisionRegister.md (k1_build_register.py)
- **Reason:** Sweep (e): same line range fix.
- **Evidence:** as above
- **Before:**

~~~~text
"VVM/42__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js:292-299",
~~~~

- **After:**

~~~~text
"VVM/42__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js:292-300",
~~~~

### 34. `report/tools/k2_build_maps.py` - TF-T32 spec: keep 62 (DR-03)

- **Feeds:** target_folder_map.json, file_rename_map.json, K2__TargetMaps.md tables, k2work/k2_tables.json
- **Reason:** Item 4 / sweep (b): TF-T32 said action renumber (62 -> 92, "W3 (deferred)") while DR-03 keeps 62 (recommendation "keep 62 for now", default "62 unchanged") and K3 W6-03, R0, R1, R2, R4, R5 and R6 move it only on request.
- **Evidence:** DR-03 recommendation/default_if_unanswered; D-S01-08 "(b) now and (a) later"; K3 W6-03 goal and hard_gate
- **Before:**

~~~~text
'62__Feature__EmailWorkers': ('renumber', 'collision_deferred', 'VV-only, but 62 is TV\'s (and WCP\'s) 62__Feature__AppInstallability. Nothing ports across the number (VV uses WCP\'s PWA, never TV 62), so the collision is nominal: record it now, move to 92__Feature__EmailWorkers in W3 only after its 1,857 tracked node_modules files are untracked (1,877 tracked files in the folder; BUILD__Deploy__EmailWorker.bat.lnk holds an absolute path Adam must re-point).',
~~~~

- **After:**

~~~~text
'62__Feature__EmailWorkers': ('keep', 'collision_deferred', 'VV-only, but 62 is TV\'s (and WCP\'s) 62__Feature__AppInstallability. Nothing ports across the number (VV uses WCP\'s PWA, never TV 62), so the collision is nominal: record it and keep 62 (DR-03: recommendation "keep 62 for now", default "62 unchanged"). The move to 92__Feature__EmailWorkers (FR-22) runs only if Adam asks (D-S01-08 (a); K3 W6-03), and only after its 1,857 tracked node_modules files are untracked (1,877 tracked files in the folder; BUILD__Deploy__EmailWorker.bat.lnk holds an absolute path Adam must re-point).',
~~~~

### 35. `report/tools/k2_build_maps.py` - TF-T32 target: stays 62

- **Feeds:** target_folder_map.json, file_rename_map.json, K2__TargetMaps.md tables, k2work/k2_tables.json
- **Reason:** Item 4: the target map shows the DR-03 target (62); FR-22 carries the optional move.
- **Evidence:** as above
- **Before:**

~~~~text
        if folder == '62__Feature__EmailWorkers':
            target = M + '/92__Feature__EmailWorkers/'
~~~~

- **After:**

~~~~text
        # 62__Feature__EmailWorkers keeps 62 (DR-03); its optional move to 92 is FR-22 (K3 W6-03, only on request; H1).
~~~~

### 36. `report/tools/k2_build_maps.py` - TF-T32 phase and risk

- **Feeds:** target_folder_map.json, file_rename_map.json, K2__TargetMaps.md tables, k2work/k2_tables.json
- **Reason:** Item 4: K2's phase vocabulary (W3 = deferred / decision-gated) kept, with the condition and the K3 package named.
- **Before:**

~~~~text
            row['phase'] = 'W3 (deferred)'
            row['risk'] = 'Medium: 1,857 tracked node_modules files make the git mv heavy until untracked; the .lnk deploy shortcut breaks silently.'
~~~~

- **After:**

~~~~text
            row['phase'] = 'W3 (only on request; K3 W6-03)'
            row['risk'] = 'None while 62 stays. If FR-22 runs: medium - 1,857 tracked node_modules files make the git mv heavy until untracked, and the .lnk deploy shortcut breaks silently.'
~~~~

### 37. `report/tools/k2_build_maps.py` - FR-22 reason and phase

- **Feeds:** target_folder_map.json, file_rename_map.json, K2__TargetMaps.md tables, k2work/k2_tables.json
- **Reason:** Item 4: FR-22 is the optional, on-request move.
- **Evidence:** as above
- **Before:**

~~~~text
       reason='Clears the nominal collision with TV/WCP 62__Feature__AppInstallability. 92 proved free (never used by TV). Deferred until node_modules is untracked (1,857 of 1,877 tracked files).',
       importers=s['main'], risk='Medium (deploy shortcut .lnk embeds an absolute path).', decision_refs=['D-S01-08', 'D-S01-05'], phase='W3 (deferred)',
~~~~

- **After:**

~~~~text
       reason='Clears the nominal collision with TV/WCP 62__Feature__AppInstallability. 92 proved free (never used by TV). Runs only if Adam asks (D-S01-08 (a); K3 W6-03): the DR-03 default keeps 62 (TF-T32). Never before node_modules is untracked (1,857 of 1,877 tracked files).',
       importers=s['main'], risk='Medium (deploy shortcut .lnk embeds an absolute path).', decision_refs=['D-S01-08', 'D-S01-05'], phase='W3 (only on request; K3 W6-03)',
~~~~

### 38. `report/tools/k2_build_maps.py` - collision table: 62 kept

- **Feeds:** target_folder_map.json, file_rename_map.json, K2__TargetMaps.md tables, k2work/k2_tables.json
- **Reason:** Item 4: with TF-T32 kept at 62 the collision row states the DR-03 default.
- **Before:**

~~~~text
            if n == '41':
                st = 'same number and role, different engine (DIV-2, kept on purpose)'
~~~~

- **After:**

~~~~text
            if n == '41':
                st = 'same number and role, different engine (DIV-2, kept on purpose)'
            if n == '62':
                st = 'nominal collision, kept (DR-03 default): VV EmailWorkers stays at 62 and moves to 92 only on request (FR-22, K3 W6-03); TV\'s AppInstallability is never ported (VV uses the WCP PWA)'
~~~~

### 39. `report/tools/k2_build_maps.py` - collision table: 62 text (unreachable branch kept in step)

- **Feeds:** target_folder_map.json, file_rename_map.json, K2__TargetMaps.md tables, k2work/k2_tables.json
- **Reason:** Item 4: the older branch (reached only if TF-T32 targeted another number) says the same.
- **Before:**

~~~~text
                st = 'nominal collision until W3 (VV EmailWorkers -> 92); TV\'s AppInstallability is never ported (VV uses the WCP PWA)'
~~~~

- **After:**

~~~~text
                st = 'nominal collision, kept (DR-03 default): VV EmailWorkers moves to 92 only on request (FR-22, K3 W6-03); TV\'s AppInstallability is never ported (VV uses the WCP PWA)'
~~~~

### 40. `report/tools/k2_build_maps.py` - collision table: 92 reserved

- **Feeds:** target_folder_map.json, file_rename_map.json, K2__TargetMaps.md tables, k2work/k2_tables.json
- **Reason:** Item 4: 92 stays reserved for the optional move.
- **Before:**

~~~~text
        elif n == '90':
            st = 'TV historical (90__System__PageLayoutSystem, retired v2.155.0) - burnt, never reuse'
~~~~

- **After:**

~~~~text
        elif n == '92':
            st = 'VV-only band: reserved for 62__Feature__EmailWorkers if Adam asks for the move (FR-22, K3 W6-03)'
            when = 'W3 (only on request; K3 W6-03)'
        elif n == '90':
            st = 'TV historical (90__System__PageLayoutSystem, retired v2.155.0) - burnt, never reuse'
~~~~

### 41. `report/tools/r0_source.md` - R0.0 Scope: out of scope

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** Item 8 (R5): v2.92.0 and the TV-only 3D modules outside the drawing scope get an explicit disposition.
- **Evidence:** DR-44 options/recommendation ("v2.92.0 is outside this alignment unless you want it"); tree_tv.tsv vs tree_vv.tsv (12 TV-only files in 07, 11, 15, 21, 26 (6), 70 named by no K3 package); TV 15/Na__ModelLoader__MultiModel.js :94, :99
- **Before:**

~~~~text
  - 3D-only features unless they touch the editor (VV 28, 29, 31, 60-64, 69, 71; TV 62, 75, 76);
~~~~

- **After:**

~~~~text
  - 3D-only features unless they touch the editor (VV 28, 29, 31, 60-64, 69, 71; TV 62, 75, 76);
  - TV v2.92.0, the presentation batch export (DR-44: outside this alignment unless Adam wants it), and the twelve TV-only 3D-tab files no drawing package needs: `07` DefaultFogEffect, `11` ViewModeFov DevControls, `15` InstanceConsolidation and LineworkColours, `21` Visibility StateCapture, `26` model-group and storey UI (six files; the model-group selector and its overlay also fall under DR-09 (a)) and `70` AssetCullDistance DevControls (R2 B.4.2, R5 E.2.5). TV's `15` MultiModel imports two of them, so W1-03 stays a hunk port;
~~~~

### 42. `report/tools/r0_source.md` - R0.0 artefacts table: K3 counts

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** H2 consequence: W5-07 (F.8 C33) makes 165 packages and 93 hot files.
- **Evidence:** wp_canonical.json (165), hot_file_ownership.json counts (93)
- **Before:**

~~~~text
`parity/data/wp_canonical.json` (164 packages, DAG, critical path, tests); `parity/data/wp_raw_map.json` (221 raw ids mapped); `parity/data/hot_file_ownership.json` (92 files)
~~~~

- **After:**

~~~~text
`parity/data/wp_canonical.json` (165 packages, DAG, critical path, tests; every Section F correction applied, recorded in `parity/data/wp_corrections_applied.json`); `parity/data/wp_raw_map.json` (221 raw ids mapped); `parity/data/hot_file_ownership.json` (93 files)
~~~~

### 43. `report/tools/r0_source.md` - R0.0 reading rule 1: hard gates

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** H2 consequence: W5-07 is hard-gated (DR-25 retire).
- **Evidence:** wp_canonical.json: 24 packages with hard_gate
- **Before:**

~~~~text
unless its `hard_gate` says it must wait. 23 packages are hard-gated:
~~~~

- **After:**

~~~~text
unless its `hard_gate` says it must wait. 24 packages are hard-gated:
~~~~

### 44. `report/tools/r0_source.md` - R0.0 reading rule 1: W5 list

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** H2 consequence.
- **Evidence:** as above
- **Before:**

~~~~text
   - W5-04, W5-05, W5-06;
~~~~

- **After:**

~~~~text
   - W5-04, W5-05, W5-06, W5-07;
~~~~

### 45. `report/tools/r0_source.md` - R0.1.1 Releases row: W0-06

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** Item 1: F.8 C34 now applies the R0.2.9 text to wp_canonical.json.
- **Evidence:** wp_canonical.json W0-06 acceptance[1] after k3_build.py
- **Before:**

~~~~text
W0-06 acceptance item 1 still quotes the pre-verifier 55/6/14/83/6/7/4/2: replace it with this tally (R0.2.9 note)
~~~~

- **After:**

~~~~text
W0-06 acceptance item 1 carries this tally since R6 F.8 C34 (R0.2.9 note)
~~~~

### 46. `report/tools/r0_source.md` - R0.1.1 Work row

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** H2 consequence.
- **Evidence:** wp_canonical.json: 153 VV packages, 154,649 est. lines; WT 12, 4,010
- **Before:**

~~~~text
221 raw packages merged into 164: 152 VV packages in W0-W6 (about 154,399 estimated lines, plus W5-06 unestimated) and 12 TV-lane packages (4,010 lines)
~~~~

- **After:**

~~~~text
221 raw packages merged into 164, plus W5-07 that R6 F.8 C33 added: 165 - 153 VV packages in W0-W6 (about 154,649 estimated lines, plus W5-06 unestimated) and 12 TV-lane packages (4,010 lines)
~~~~

### 47. `report/tools/r0_source.md` - R0.1.1 Contention row

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** H2 consequence (C20 adds the elevation data module; C33 adds W5-07 to six hot files).
- **Evidence:** hot_file_ownership.json editors: 20 / 17 / 16
- **Before:**

~~~~text
92 files are written by more than one package. The worst are the LE ModeController (19 packages), the LE AppConfig (16) and the Loader (15)
~~~~

- **After:**

~~~~text
93 files are written by more than one package. The worst are the LE ModeController (20 packages), the LE AppConfig (17) and the Loader (16)
~~~~

### 48. `report/tools/r0_source.md` - R0.1.5 P1: questions named in packages

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** Sweep (i).
- **Evidence:** F.8 C35
- **Before:**

~~~~text
W0-01 records each answer as a VV D-number continuing D01-D40 in `VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md`. | Adam, then W0-01 |
~~~~

- **After:**

~~~~text
W0-01 records each answer as a VV D-number continuing D01-D40 in `VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md`, and each question is named in the packages it gates (R6 F.8 C35). | Adam, then W0-01 |
~~~~

### 49. `report/tools/r0_source.md` - R0.1.5 P10 evidence

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** Sweep (d): K2 sections 9 and 12 and R3 C.6 now record the question as resolved in code (H1).
- **Evidence:** WebApps/live_sw.js:68 (PWA_SW_VERSION_TOKEN = '2026-09-10-6'), :157 (DistanceCulling precache entry)
- **Before:**

~~~~text
| Adam, at the W0 deploy | R6 F.8 C5; R1 A.4 #11; code read 01-Oct-2026. K2 sections 9 and 12 still list it as open (and cite `:157`; the token is at `:68`) |
~~~~

- **After:**

~~~~text
| Adam, at the W0 deploy | R6 F.8 C5; R1 A.4 #11; R3 C.6; K2 sections 9 and 12; code read 01-Oct-2026 (`live_sw.js`: token at `:68`; `:157` is its stale DistanceCulling precache line) |
~~~~

### 50. `report/tools/r0_source.md` - R0.1.6 W5 row

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** H2 consequence: the W5 critical chain runs through W5-07.
- **Evidence:** wp_canonical.json critical_path.per_wave.W5 = W5-01, W5-05, W5-07, W5-99 (1,570); W5-02 300 + W5-03 200 + W5-99 250 = 750
- **Before:**

~~~~text
| W5 | W5-01 -> W5-05 -> W5-99 | 1,320 | W5-05 runs only if Adam picks a Vale QR resolver (DR-12). Without it, the W5 chain is W5-02 -> W5-03 -> W5-99 (750 lines). W5-06, the site-plan pipeline (XL, unestimated), joins only under DR-08 (A) |
~~~~

- **After:**

~~~~text
| W5 | W5-01 -> W5-05 -> W5-07 -> W5-99 | 1,570 | W5-05 runs only if Adam picks a Vale QR resolver (DR-12), and W5-07 (R6 F.8 C33) only if he answers DR-25 'retire' at W4-09. Without the conditional packages (W5-04 to W5-07), the W5 chain is W5-02 -> W5-03 -> W5-99 (750 lines). W5-06, the site-plan pipeline (XL, unestimated), joins only under DR-08 (A) |
~~~~

### 51. `report/tools/r0_source.md` - R0.1.6 All row

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** H2 consequence.
- **Evidence:** wp_canonical.json critical_path: by_est_lines 53 packages, 65,429; by_package_count 56
- **Before:**

~~~~text
| **All** | **52 packages** (55 by package count) | **65,179** |
~~~~

- **After:**

~~~~text
| **All** | **53 packages** (56 by package count) | **65,429** |
~~~~

### 52. `report/tools/r0_source.md` - R0.1.7 T11

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** H2 consequence.
- **Evidence:** hot_file_ownership.json: 93
- **Before:**

~~~~text
| T11 | **Parallel agents collide on shared files.** 92 files are written by more than one package.
~~~~

- **After:**

~~~~text
| T11 | **Parallel agents collide on shared files.** 93 files are written by more than one package.
~~~~

### 53. `report/tools/r0_source.md` - R0.1.8 E2: what removes it

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** H2 consequence: W5-07 is the package that retires the switch.
- **Evidence:** W5-07 hard_gate
- **Before:**

~~~~text
| Adam re-decides DR-25 at the publishing port (W4-09) and retires the switch, as K1 recommends | No (R0.3.6) |
~~~~

- **After:**

~~~~text
| Adam re-decides DR-25 at the publishing port (W4-09) and answers 'retire', as K1 recommends; W5-07 then removes the switch (R6 F.8 C33) | No (R0.3.6) |
~~~~

### 54. `report/tools/r0_source.md` - R0.2.1 Tier 1 DR-01 count

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** H2 consequence: W5-07 is gated by DR-01.
- **Evidence:** wp_canonical.json: DR-01 in gated_by of 124 packages (W0 2, W1 38, W2 42, W3 17, W4 18, W5 6, W6 1)
- **Before:**

~~~~text
It gates 121 packages in W1-W6, and W3-04 is hard-gated on it.
~~~~

- **After:**

~~~~text
It gates 122 packages in W1-W6, and W3-04 is hard-gated on it.
~~~~

### 55. `report/tools/r0_source.md` - R0.2.1 Tier 2: Q row

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** Sweep (i).
- **Evidence:** F.8 C35
- **Before:**

~~~~text
| Q-REG, Q-63, Q-BACKUP (raised by this report, R0.2.11) | W0-04 and W0-06 (registry and lint); W0-09 (backup root) |
~~~~

- **After:**

~~~~text
| Q-REG, Q-63, Q-BACKUP (raised by this report, R0.2.11) | W0-04 and W0-06 (registry and lint); W0-09 (backup root); each package names its question (R6 F.8 C35) |
~~~~

### 56. `report/tools/r0_source.md` - R0.2.11 intro

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** Item 8 (R4: the immediate seam is settled by C22) and sweep (i).
- **Evidence:** wp_canonical.json W1-33 vv_adaptations[6] [F.8 C22]; W1-10/W2-05 [F.8 C20]
- **Before:**

~~~~text
- Q-AZIMUTH and the second half of Q-COVER are code rulings for the planner. The rest are Adam's.
~~~~

- **After:**

~~~~text
- Q-AZIMUTH and the second half of Q-COVER were code rulings for the planner, and Section F has made both (R6 F.8 C20, C22, in `wp_canonical.json`). The rest are Adam's.
- Since R6 F.8 C35 each question is named in the packages of its Gates column, and W0-01 records each answer or default as a VV D-number.
~~~~

### 57. `report/tools/r0_source.md` - R0.2.11 Q-35ASSETS default

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** Item 8 (R1): the question is already in W6-03's hard gate.
- **Evidence:** wp_canonical.json W6-03 hard_gate [F.8 C31]
- **Before:**

~~~~text
| Nothing is copied. W6-03 stays held until Adam confirms the removals (DR-03 hard gate), and this question goes to him with them |
~~~~

- **After:**

~~~~text
| Nothing is copied. W6-03 stays held until Adam confirms the removals (DR-03 hard gate), and this question goes to him with them (W6-03's hard gate carries it since R6 F.8 C31) |
~~~~

### 58. `report/tools/r0_source.md` - R0.2.11 Q-AZIMUTH default

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** Item 8 (R2): the ruling is applied.
- **Evidence:** wp_canonical.json W1-10 vv_adaptations[2], W2-05 acceptance[4] [F.8 C20]
- **Before:**

~~~~text
| As recommended (planner's ruling; nothing user-visible) | W1-10, W2-05 |
~~~~

- **After:**

~~~~text
| As recommended (planner's ruling; nothing user-visible). Settled: R6 F.8 C20 applied it to W1-10 and W2-05 | W1-10, W2-05 |
~~~~

### 59. `report/tools/r0_source.md` - R0.2.11 Q-COVER default (2)

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** Item 8 (R4): W1-33's unspecified seam for "immediate" is settled by F.8 C22; only part (1) stays Adam's.
- **Evidence:** wp_canonical.json W1-33 vv_adaptations[6] [F.8 C22]
- **Before:**

~~~~text
| (1) As recommended.<br>(2) The planner picks before W1-33 is handed out | W1-33 |
~~~~

- **After:**

~~~~text
| (1) As recommended.<br>(2) Settled by R6 F.8 C22: LoadingScreen exports `Na__LeLoadScreen__IsShown()` (true while the loader's cover is up) and the ModeController passes `immediate: Na__LeLoadScreen__IsShown()` to `Na__LeVeil__FirstOpen` at TV's call site, so `Enter(sheetId)` keeps TV's signature; recorded in the three PORT NOTEs | W1-33 |
~~~~

### 60. `report/tools/r0_source.md` - R0.3.1 DIV-2: 41 README

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** Item 8 (R2): F.8 C14 gave the README to W0-06.
- **Evidence:** wp_canonical.json W0-06 vv_targets[12], acceptance[6] [F.8 C14]
- **Before:**

~~~~text
K2 N6 and DR-26 call for `README__CrossSectionView__.md` naming the twins, but no K3 package creates it yet (open issue: add it to W0-06)
~~~~

- **After:**

~~~~text
K2 N6 and DR-26 call for `README__CrossSectionView__.md` naming the twins; W0-06 creates it (R6 F.8 C14)
~~~~

### 61. `report/tools/r0_source.md` - R0.3.1 DIV-3 evidence

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** Item 1 / sweep (a).
- **Evidence:** F.8 C34
- **Before:**

~~~~text
| DR-25, DR-32; K3 W1-05; S12-F32. The W0-06 acceptance lists DIV-1 to DIV-4 as permanent; DIV-3 is closed, as both ProjectData files show |
~~~~

- **After:**

~~~~text
| DR-25, DR-32; K3 W1-05; S12-F32. DIV-3 is closed, as both ProjectData files show; W0-06 acceptance item 1 says so since R6 F.8 C34 |
~~~~

### 62. `report/tools/r0_source.md` - R0.3.2 PD-02

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** Item 8 (R2).
- **Evidence:** F.8 C14
- **Before:**

~~~~text
Never port TV 41; add `README__CrossSectionView__.md` (not yet in any K3 package)
~~~~

- **After:**

~~~~text
Never port TV 41; W0-06 adds `README__CrossSectionView__.md` (R6 F.8 C14)
~~~~

### 63. `report/tools/r0_source.md` - R0.3.2 PD-12: G4 exemptions

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** Item 5 / sweep (c): the G4 exemption wording reads the same everywhere (K3 G4 since F.8 C13).
- **Evidence:** wp_canonical.json standard_gates G4
- **Before:**

~~~~text
- Gate G4: `Na__Verify__ParityNaming__` (W0-04) fails on a `TRUEVISION3D` banner, a `[TrueVision3D` prefix, a `TrueVision__` literal or `window.TrueVision__` outside PORT NOTE "Ported from" lines.
~~~~

- **After:**

~~~~text
- Gate G4: `Na__Verify__ParityNaming__` (W0-04) fails on a `TRUEVISION3D` banner, a `[TrueVision3D` prefix, a `TrueVision__` literal or `window.TrueVision__`. Exempt: the whole PORT NOTE block of a file, history documents (devlog, ledger, `__PLAN__`, `__NOTES__`, `Research__` and `TASK__` files) and the named TrueVisionHub statement file (PD-15); a hit on W0-04's baseline allow-list prints WARN instead of failing (K3 G4, R6 F.8 C13).
~~~~

### 64. `report/tools/r0_source.md` - R0.3.2 PD-15: exception source

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** Item 3: the exception is now in W0-04 and G4.
- **Evidence:** wp_canonical.json W0-04 vv_adaptations[1], acceptance[1] [F.8 C13]
- **Before:**

~~~~text
- W0-04 adds one named G4 exception, for the Hub file above.
~~~~

- **After:**

~~~~text
- W0-04 adds one named G4 exception, for the Hub file above (R6 F.8 C13).
~~~~

### 65. `report/tools/r0_source.md` - R0.3.2 PD-15: DR-43 options

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** Sweep (c): R0 credited DR-43 with an option it does not list; its three Hub options are exclude via config, a ValeVision 3D Project Hub with Vale words, or the TrueVisionHub id with VV words.
- **Evidence:** decision_register.json DR-43 options[1]
- **Before:**

~~~~text
- If Adam wants no NA copy in VV's source at all, DR-43's alternative is a Registry seam that drops the Hub import and its DEFINITIONS entry; the file then stays out of VV.
~~~~

- **After:**

~~~~text
- If Adam wants no NA copy in VV's source at all, DR-43's other Hub options give the section Vale words (a 'ValeVision 3D Project Hub', or the TrueVisionHub id with VV words); keeping the module out of VV altogether is none of DR-43's options and would need a new, recorded Registry seam that drops the Hub import and its DEFINITIONS entry.
~~~~

### 66. `report/tools/r0_source.md` - R0.3.2 PD-17: 62

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** Item 4 / sweep (b): 62 moves only on request (DR-03).
- **Evidence:** DR-03 default
- **Before:**

~~~~text
- VV-reserved numbers 28, 29, 31, 35, 60, 61, 62 (until moved to 92), 63, 64, 69, 71, 91-99
~~~~

- **After:**

~~~~text
- VV-reserved numbers 28, 29, 31, 35, 60, 61, 62 (moves to 92 only on request, FR-22), 63, 64, 69, 71, 91-99
~~~~

### 67. `report/tools/r0_source.md` - R0.3.2 PD-20: Vale example

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** Sweep (h): no NA job phase in a Vale example; the DR-11 default composes {project}_{drawing}.
- **Evidence:** DR-11 default; F.8 C21
- **Before:**

~~~~text
Used raw, VV would print `2026/3047__Doous_T01_D01` (S07a-V01)
~~~~

- **After:**

~~~~text
Used raw, VV would print `2026/3047__Doous_D01`, a folder path inside a document name (S07a-V01)
~~~~

### 68. `report/tools/r0_source.md` - R0.3.2 PD-23: localhost reader URL

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** Item 8 (R3): F.8 C30 chose the 404-honest path for W4-17.
- **Evidence:** wp_canonical.json W4-17 vv_adaptations[1] [F.8 C30]; WCP/server.py:897-907, :956-977
- **Before:**

~~~~text
- the localhost first URL must be 404-honest: `/Whitecardopedia/Projects/{folderId}/...`, which answers real JSON 404s (`WCP/server.py:901-907`), or W0-19 makes `/Projects/` 404-honest<br>
~~~~

- **After:**

~~~~text
- the localhost first URL is the facade's `repoUrl` form, `new URL('../Whitecardopedia/Projects/' + folderId + '/06__Layout__PublishedDocuments/...', AppRootUrl)`, whose `/Whitecardopedia/<path>` route answers real JSON 404s (`WCP/server.py:897-907`); `/Projects/...` would reach the catch-all (R6 F.8 C30)<br>
~~~~

### 69. `report/tools/r0_source.md` - R0.3.2 PD-23 evidence

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** Item 8 (R3).
- **Evidence:** F.8 C30
- **Before:**

~~~~text
| DR-22, DR-29; R3 C.4 S18, C.5, C.6 |
~~~~

- **After:**

~~~~text
| DR-22, DR-29; R3 C.4 S18, C.5, C.6; R6 F.8 C30 |
~~~~

### 70. `report/tools/r0_source.md` - R0.3.6 Layout Mode row

- **Feeds:** R0__FrontMatter_ExecutiveSummary_Decisions_Divergences.md (r0_assemble.py)
- **Reason:** H2 consequence.
- **Evidence:** W5-07
- **Before:**

~~~~text
| Re-decided at the publishing port (W4-07 to W4-09); retirement recommended then | DR-25 |
~~~~

- **After:**

~~~~text
| Re-decided at the publishing port (W4-07 to W4-09); retirement recommended then, and W5-07 retires the switch on a 'retire' answer (R6 F.8 C33) | DR-25 |
~~~~

### 71. `report/tools/r0_build_decisions.py` - R0.2.9 note: W0-06 text applied

- **Feeds:** R0 decision tables and notes (r0_assemble.py)
- **Reason:** Item 1: the note now carries the text F.8 C34 applies verbatim (path given from parity/ so an agent can open it).
- **Evidence:** wp_canonical.json W0-06 acceptance[1] after k3_build.py
- **Before:**

~~~~text
 'R0.2.9 Ledger and versioning':
  'W0-06 acceptance item 1 quotes S11\'s pre-verifier release tally ("55/6/14/83/6/7/4/2"). The canonical source is now Section E\'s `report/tools/r5work/release_rows_final.json`. Brief W0-06 with: "Release Watermark (177 rows) seeded from `r5work/release_rows_final.json`: 51 ported / 11 partial / 17 pending sign-off / 80 never considered / 4 reopened / 2 deliberate / 7 not drawing / 4 VV-origin / 1 n/a, 112 open" (R0.1.1, R0.1.2). The same item lists DIV-1 to DIV-4 as permanent; DIV-3 is closed (R0.3.1).',
~~~~

- **After:**

~~~~text
 'R0.2.9 Ledger and versioning':
  'W0-06 acceptance item 1 quoted S11\'s pre-verifier release tally ("55/6/14/83/6/7/4/2"). The canonical source is now Section E\'s `report/tools/r5work/release_rows_final.json`, and R6 F.8 C34 has replaced the item\'s watermark clause in `wp_canonical.json` with this text: "Release Watermark (177 rows) seeded from `parity/report/tools/r5work/release_rows_final.json`: 51 ported / 11 partial / 17 pending sign-off / 80 never considered / 4 reopened / 2 deliberate / 7 not drawing / 4 VV-origin / 1 n/a, 112 open" (R0.1.1, R0.1.2). The same row lists DIV-3 as closed with DIV-5 (R0.3.1).',
~~~~

### 72. `report/tools/r0_build_decisions.py` - R0.2.7 note: W0-01 bullet corrected by C1

- **Feeds:** R0 decision tables and notes (r0_assemble.py)
- **Reason:** H2 consequence: F.8 C1 is applied in wp_canonical.json.
- **Evidence:** wp_canonical.json W0-01 acceptance[5] [F.8 C1]
- **Before:**

~~~~text
The fifth acceptance bullet of W0-01 says "W3-04 lands them held (W3-05 switches them on later)"; that wording is wrong, because W3-05 switches on the drafting aids.',
~~~~

- **After:**

~~~~text
The fifth acceptance bullet of W0-01 said "W3-04 lands them held (W3-05 switches them on later)", which was wrong because W3-05 switches on the drafting aids; R6 F.8 C1 corrected it to "if unanswered, W3-03 writes the four guards and W3-04 stays held".',
~~~~

### 73. `report/tools/r2b_render.py` - B.0 #3: SectionClipping owner

- **Feeds:** R2__B_ModuleNaming_Divergence.md
- **Reason:** Item 8 (R2): F.8 C12 gave the header fix to W0-03.
- **Evidence:** wp_canonical.json W0-03 vv_targets/acceptance [F.8 C12]
- **Before:**

~~~~text
'`Na__SectionClipping__*` (VV :6, :146-153). No K3 package owns that fix (B.3.1).')
~~~~

- **After:**

~~~~text
'`Na__SectionClipping__*` (VV :6, :146-153). W0-03 owns that fix since R6 F.8 C12 (B.3.1).')
~~~~

### 74. `report/tools/r2b_render.py` - B.0 #5: SetAzimuthDeg ruling

- **Feeds:** R2__B_ModuleNaming_Divergence.md
- **Reason:** Item 8 / sweep (i).
- **Evidence:** F.8 C20
- **Before:**

~~~~text
1 needs a ruling (`Na__ElevData__SetAzimuthDeg`).
~~~~

- **After:**

~~~~text
1 needed a ruling (`Na__ElevData__SetAzimuthDeg`: retire it with W2-05, the planner\'s ruling R0.2.11 Q-AZIMUTH, applied by R6 F.8 C20).
~~~~

### 75. `report/tools/r2b_render.py` - B.0 #6: SectionAdapter names fixed

- **Feeds:** R2__B_ModuleNaming_Divergence.md
- **Reason:** Item 8 (R2): the names are fixed by F.8 C25.
- **Evidence:** wp_canonical.json W2-02, WT-02 [F.8 C25]
- **Before:**

~~~~text
plus the SectionAdapter\'s four new calls (six names, '
  'W2-02; proposed in B.3.5)
~~~~

- **After:**

~~~~text
plus the SectionAdapter\'s four new calls (six names, '
  'W2-02; proposed in B.3.5, fixed by R6 F.8 C25)
~~~~

### 76. `report/tools/r2b_render.py` - B.0 #7: named exception

- **Feeds:** R2__B_ModuleNaming_Divergence.md
- **Reason:** Item 3: W0-04 now carries the exception.
- **Evidence:** F.8 C13
- **Before:**

~~~~text
and give the W0-04 naming lint a declared exception for it.
~~~~

- **After:**

~~~~text
and the W0-04 naming lint carries a named exception for it (R6 F.8 C13).
~~~~

### 77. `report/tools/r2b_render.py` - B.0 #9: gaps closed

- **Feeds:** R2__B_ModuleNaming_Divergence.md
- **Reason:** Item 8 (R2): every gap this section listed is closed by an F.8 row.
- **Evidence:** wp_corrections_applied.json rows C12, C13, C14, C18, C20, C31
- **Before:**

~~~~text
'says the retired 91 folder holds 4 files but it holds 7 after FR-08 (verified on disk).')
~~~~

- **After:**

~~~~text
'says the retired 91 folder holds 4 files but it holds 7 after FR-08 (verified on disk). Section F\'s F.8 has since closed '
  'each of them in `wp_canonical.json` (C12, C18, C14, C13, C20, C31; B.5).')
~~~~

### 78. `report/tools/r2b_render.py` - B.1: G4 exemptions

- **Feeds:** R2__B_ModuleNaming_Divergence.md
- **Reason:** Item 5: G4 exemption wording identical in R1, R2 and R6 (K3 G4 since F.8 C13).
- **Evidence:** wp_canonical.json standard_gates G4
- **Before:**

~~~~text
'outside PORT NOTE "Ported from" lines and history). History documents (devlog, ledger, plans) are never rewritten (K2 section 13).')
~~~~

- **After:**

~~~~text
'outside the exempt parts: the whole PORT NOTE block of a file, history documents (devlog, ledger, `__PLAN__`, `__NOTES__`, '
  '`Research__` and `TASK__` files) and the named TrueVisionHub statement file; a hit on W0-04\'s baseline allow-list prints WARN '
  'instead of failing - K3 G4, R6 F.8 C13). History documents (devlog, ledger, plans) are never rewritten (K2 section 13).')
~~~~

### 79. `report/tools/r2b_render.py` - B.3.1: SectionClipping owner cell

- **Feeds:** R2__B_ModuleNaming_Divergence.md
- **Reason:** Item 8 (R2).
- **Evidence:** F.8 C12
- **Before:**

~~~~text
'**unowned - add to W0-03**', 'H2'],
~~~~

- **After:**

~~~~text
'W0-03 (R6 F.8 C12)', 'H2'],
~~~~

### 80. `report/tools/r2b_render.py` - B.3.1: AutoSave PORT NOTE exempt

- **Feeds:** R2__B_ModuleNaming_Divergence.md
- **Reason:** Item 5: the exemption is the whole PORT NOTE block, not "history".
- **Evidence:** F.8 C13 finding (AutoSave__.js:48 is a Divergences line)
- **Before:**

~~~~text
names TV\'s global inside a PORT NOTE (history, exempt).')
~~~~

- **After:**

~~~~text
names TV\'s global inside its PORT NOTE block, which G4 exempts (R6 F.8 C13).')
~~~~

### 81. `report/tools/r2b_render.py` - B.3.7: TrueVisionHub ruling

- **Feeds:** R2__B_ModuleNaming_Divergence.md
- **Reason:** Item 3 / sweep (c).
- **Evidence:** F.8 C13; R0 PD-15
- **Before:**

~~~~text
**W0-04 must declare a lint exception for this one file** or G4 fails on "TrueVision 3D Project Hub"; WT-03 (DR-42 item 6) would move the branding into config'],
~~~~

- **After:**

~~~~text
**W0-04 declares a named G4 exception for this one file (R6 F.8 C13)**, without which G4 fails on "TrueVision 3D Project Hub"; the section is present but never rendered (R0 PD-15); WT-03 (DR-42 item 6) would move the branding into config'],
~~~~

### 82. `report/tools/r2b_render.py` - B.4.1: 41 README owner

- **Feeds:** R2__B_ModuleNaming_Divergence.md
- **Reason:** Item 8 (R2).
- **Evidence:** F.8 C14
- **Before:**

~~~~text
'DR-26, DR-41', 'README unowned (Open issues)'),
~~~~

- **After:**

~~~~text
'DR-26, DR-41', 'README: W0-06 (R6 F.8 C14)'),
~~~~

### 83. `report/tools/r2b_render.py` - B.5 #1 settled

- **Feeds:** R2__B_ModuleNaming_Divergence.md
- **Reason:** Item 8 (R2).
- **Evidence:** F.8 C12
- **Before:**

~~~~text
recommended: add it to W0-03 (header-only, no import change).',
~~~~

- **After:**

~~~~text
recommended: add it to W0-03 (header-only, no import change). Settled: W0-03 owns it since R6 F.8 C12.',
~~~~

### 84. `report/tools/r2b_render.py` - B.5 #2 settled

- **Feeds:** R2__B_ModuleNaming_Divergence.md
- **Reason:** Item 8 (R2).
- **Evidence:** F.8 C14
- **Before:**

~~~~text
(K2 N6, DR-26); recommended: W0-06.',
~~~~

- **After:**

~~~~text
(K2 N6, DR-26); recommended: W0-06. Settled: W0-06 creates it (R6 F.8 C14).',
~~~~

### 85. `report/tools/r2b_render.py` - B.5 #3 settled

- **Feeds:** R2__B_ModuleNaming_Divergence.md
- **Reason:** Item 3.
- **Evidence:** F.8 C13
- **Before:**

~~~~text
kept at TV\'s path by W4-12), or W4-12 fails its own gate.',
~~~~

- **After:**

~~~~text
kept at TV\'s path by W4-12), or W4-12 fails its own gate. Settled: W0-04\'s adaptations and acceptance and gate G4 name it (R6 F.8 C13).',
~~~~

### 86. `report/tools/r2b_render.py` - B.5 #4 settled

- **Feeds:** R2__B_ModuleNaming_Divergence.md
- **Reason:** Item 8 / sweep (i).
- **Evidence:** F.8 C20
- **Before:**

~~~~text
(no new writes; the field is still read and preserved).',
~~~~

- **After:**

~~~~text
(no new writes; the field is still read and preserved). Settled: W1-10 re-adds `Na__ElevData__STYLE_KEYS` and keeps both setters through W1, and W2-05 retires them (R6 F.8 C20; the planner\'s ruling R0.2.11 Q-AZIMUTH).',
~~~~

### 87. `report/tools/r2b_render.py` - B.5 #5 settled

- **Feeds:** R2__B_ModuleNaming_Divergence.md
- **Reason:** Item 8 (R2).
- **Evidence:** F.8 C18
- **Before:**

~~~~text
its adaptations do not mention the header.',
~~~~

- **After:**

~~~~text
its adaptations do not mention the header. Settled: R6 F.8 C18.',
~~~~

### 88. `report/tools/r2b_render.py` - B.5 #6 settled

- **Feeds:** R2__B_ModuleNaming_Divergence.md
- **Reason:** Item 8 (R2).
- **Evidence:** F.8 C25
- **Before:**

~~~~text
W2-02 must fix them before WT-02 copies them.',
~~~~

- **After:**

~~~~text
W2-02 must fix them before WT-02 copies them. Settled: R6 F.8 C25 fixes the six names for W2-02 and WT-02.',
~~~~

### 89. `report/tools/r2b_render.py` - B.5 #7 settled

- **Feeds:** R2__B_ModuleNaming_Divergence.md
- **Reason:** Item 8 (R2).
- **Evidence:** F.8 C24
- **Before:**

~~~~text
W2-04 states it, W1-37 and W2-03 do not (B.3.3).',
~~~~

- **After:**

~~~~text
W2-04 states it, W1-37 and W2-03 do not (B.3.3). Settled: R6 F.8 C24.',
~~~~

### 90. `report/tools/r2b_render.py` - B.5 #8 settled

- **Feeds:** R2__B_ModuleNaming_Divergence.md
- **Reason:** Item 8 (R2).
- **Evidence:** F.8 C31
- **Before:**

~~~~text
FR-25\'s importer list (4 files) is unaffected.',
~~~~

- **After:**

~~~~text
FR-25\'s importer list (4 files) is unaffected. Settled: R6 F.8 C31.',
~~~~

### 91. `report/tools/r2b_render.py` - B.5 #12 settled

- **Feeds:** R2__B_ModuleNaming_Divergence.md
- **Reason:** Item 8 (R2).
- **Evidence:** F.8 C11, C26
- **Before:**

~~~~text
`Na__TilePlan__*` re-export (W2-03).',
~~~~

- **After:**

~~~~text
`Na__TilePlan__*` re-export (W2-03). Settled: R6 F.8 C11 (W0-02) and C26 (W2-03).',
~~~~

### 92. `report/tools/R5_template.md` - E.2.5: TV-only 3D modules disposition

- **Feeds:** R5__E_ParityMatrix_Watermark_Inventory.md (r5_assemble.py)
- **Reason:** Item 8 (R5): the sentence pointed at an "open issues" list R5 does not have; the modules get an explicit out-of-scope disposition, matching R0.0 and R2 B.4.2.
- **Evidence:** tree_tv.tsv vs tree_vv.tsv; no K3 package names them (grep of wp_canonical.json)
- **Before:**

~~~~text
TV-only 3D modules (`15` InstanceConsolidation and LineworkColours, `21` Visibility__StateCapture, `26` model-group
and storey UI, `70` AssetCullDistance) belong to no slice and no K3 package (see the open issues). TV's
~~~~

- **After:**

~~~~text
TV-only 3D modules (`15` InstanceConsolidation and LineworkColours, `21` Visibility__StateCapture, `26` model-group
and storey UI, `70` AssetCullDistance; also `07` DefaultFogEffect and `11` ViewModeFov DevControls) belong to no slice and no
K3 package: they are outside this alignment as 3D-tab features (the front matter's scope, R0.0; the model-group selector and its
overlay also fall under DR-09 (a)), and Section B records each (B.4.2). TV's
~~~~

### 93. `report/tools/R5_template.md` - E.3 ownership check

- **Feeds:** R5__E_ParityMatrix_Watermark_Inventory.md (r5_assemble.py)
- **Reason:** Item 6: README__PublishedDocuments__.md is W4-17's since F.8 C30 (applied by H2), README__SpellCheck__.md is W2-34's; E.3 still called the first unowned, and r5_assemble.py failed its own assertion after H2.
- **Evidence:** wp_canonical.json W4-17 vv_targets[7] (F.8 C30) and edits; W2-34 vv_targets and edits; r5_assemble.py run 01-Oct-2026: "outside K3: 14 excluded: 14 gaps: []" then AssertionError
- **Before:**

~~~~text
{{N_E3}} files against every K3 package's `tv_sources`, `vv_targets`, `edits` and `hot_files` leaves {{N_E3_OUTSIDE}}
files outside K3: {{N_E3_OUTSIDE_EXCL}} are the exclusions marked below (TV's ProfileLines, five 41 engine files, seven 27
menu files, the 80 note) and one is a K3 gap closed here. K3 gives `README__PublishedDocuments__.md` (52) no package, so
this section assigns it to W4-17, the first package to create files in that folder (W1-15, W1-37, W2-34, W4-01 and
W4-08 each carry their folder's README); the delegator adds it to W4-17's targets, a K3 correction for Section F's list
(F.8). `README__SpellCheck__.md` is W2-34's: a new VV target there (`vv_targets` and `edits`), though not one of its
`tv_sources`.
~~~~

- **After:**

~~~~text
{{N_E3}} files against every K3 package's `tv_sources`, `vv_targets`, `edits` and `hot_files` leaves {{N_E3_OUTSIDE}}
files outside K3, all of them the exclusions marked below (TV's ProfileLines, five 41 engine files, seven 27 menu files,
the 80 note). The one K3 gap this section found is closed: `README__PublishedDocuments__.md` (52) had no package, so this
section assigned it to W4-17, the first package to create files in that folder (W1-15, W1-37, W2-34, W4-01 and W4-08 each
carry their folder's README), and Section F's F.8 C30 added it to W4-17's `vv_targets` and `edits` in `wp_canonical.json`
(01-Oct-2026). `README__SpellCheck__.md` is W2-34's: a new VV target there (`vv_targets` and `edits`), though not one of
its `tv_sources`.
~~~~

### 94. `report/tools/R5_template.md` - E.4 41 row: README owner

- **Feeds:** R5__E_ParityMatrix_Watermark_Inventory.md (r5_assemble.py)
- **Reason:** Item 8 (R2): F.8 C14.
- **Evidence:** F.8 C14
- **Before:**

~~~~text
a new `README__CrossSectionView__.md` names the twins (K2 N6; no K3 package creates it, Sections A and B propose W0-06) | W2-02, W2-05, W0-06 (proposed); TV side WT-02 |
~~~~

- **After:**

~~~~text
a new `README__CrossSectionView__.md` names the twins (K2 N6; W0-06 creates it, R6 F.8 C14) | W2-02, W2-05, W0-06; TV side WT-02 |
~~~~

### 95. `report/tools/r5_inventory.py` - owner of the 52 README

- **Feeds:** r5work/frag_E3_inventory.md, tv_only_inventory.json -> R5 E.3
- **Reason:** Item 6.
- **Evidence:** F.8 C30
- **Before:**

~~~~text
PROPOSED_OWNER = {
    "02__Src__AppModules/52__System__Layout__PublishedDocuments/README__PublishedDocuments__.md":
        "W4-17 (assigned here; not in wp_canonical.json)",
}
~~~~

- **After:**

~~~~text
# H1 (01-Oct-2026): Section F's F.8 C30 put the 52 README in W4-17's vv_targets and edits, so the K3 lookup finds it.
PROPOSED_OWNER = {}
~~~~

### 96. `report/tools/r5_inventory.py` - E.3 note on the 52 README

- **Feeds:** r5work/frag_E3_inventory.md, tv_only_inventory.json -> R5 E.3
- **Reason:** Item 6.
- **Evidence:** F.8 C30
- **Before:**

~~~~text
"Urls; no K3 package lists it, so the delegator adds it to W4-17's targets",
~~~~

- **After:**

~~~~text
"Urls; a W4-17 target since Section F's F.8 C30",
~~~~

### 97. `report/tools/r5_assemble.py` - E.3 coverage assertion

- **Feeds:** R5__E_ParityMatrix_Watermark_Inventory.md
- **Reason:** Item 6: the generator now asserts the post-H2 truth (no gap) instead of failing.
- **Evidence:** r5_assemble.py run before H1: AssertionError
- **Before:**

~~~~text
assert outside_gap == ["README__PublishedDocuments__.md"], "E.3 coverage sentence names the gap by hand: re-check it"
~~~~

- **After:**

~~~~text
assert outside_gap == [], "E.3 coverage sentence says every file outside K3 is an exclusion (README gap closed by F.8 C30): re-check it"
~~~~

### 98. `report/R1__A_FolderNaming_FolderDivergence.md` - A.2.1 row 41

- **Reason:** Item 8 (R2/R1): F.8 C14 gave the README to W0-06.
- **Evidence:** wp_canonical.json W0-06 vv_targets[12]
- **Before:**

~~~~text
| keep; README in W0-06 (proposed, A.4 #3); gate ids renamed in W2-05 |
~~~~

- **After:**

~~~~text
| keep; README in W0-06 (R6 F.8 C14); gate ids renamed in W2-05 |
~~~~

### 99. `report/R1__A_FolderNaming_FolderDivergence.md` - A.2.1 row 63: decision

- **Reason:** Item 8 (R1): the 63 threat is R0's Q-63.
- **Evidence:** R0 R0.2.11 Q-63
- **Before:**

~~~~text
| keep (A.2.7) | TF-T33 | none yet (A.4 #5) |
~~~~

- **After:**

~~~~text
| keep (A.2.7) | TF-T33 | R0.2.11 Q-63 (A.4 #5) |
~~~~

### 100. `report/R1__A_FolderNaming_FolderDivergence.md` - A.2.5: 41 README

- **Reason:** Item 8.
- **Evidence:** F.8 C14
- **Before:**

~~~~text
(A.4 #3: no K3 package owns it
  yet).
~~~~

- **After:**

~~~~text
(A.4 #3; W0-06 creates it
  since R6 F.8 C14).
~~~~

### 101. `report/R1__A_FolderNaming_FolderDivergence.md` - A.2.7 registry: 08-19 and 62

- **Reason:** Item 8 (R1): K2's registry gap is R0's Q-REG.
- **Evidence:** R0 R0.2.11 Q-REG
- **Before:**

~~~~text
TV growth: **08, 09, 12-14, 16-19 (R1: unowned in K2)**,
~~~~

- **After:**

~~~~text
TV growth: **08, 09, 12-14, 16-19 (R1: unowned in K2; R0.2.11 Q-REG)**,
~~~~

### 102. `report/R1__A_FolderNaming_FolderDivergence.md` - A.2.7 registry: 62

- **Reason:** Item 4 / sweep (b): 62 moves only on request (DR-03).
- **Evidence:** DR-03 default
- **Before:**

~~~~text
| 28, 29, 31, 60, 61, 63, 64, 69, 71; 62 until FR-22. VV band:
~~~~

- **After:**

~~~~text
| 28, 29, 31, 60, 61, 63, 64, 69, 71; 62 (to 92 only on request, FR-22). VV band:
~~~~

### 103. `report/R1__A_FolderNaming_FolderDivergence.md` - A.2.7: 63 recommendation is Q-63

- **Reason:** Item 8 (R1) / sweep (i).
- **Evidence:** F.8 C35
- **Before:**

~~~~text
Recommendation, which needs a decision (no K1 DR covers it):
~~~~

- **After:**

~~~~text
Recommendation, which needs a decision (no K1 DR covers it; R0.2.11 Q-63, named in W0-06 and W6-03 by R6 F.8 C35):
~~~~

### 104. `report/R1__A_FolderNaming_FolderDivergence.md` - A.2.7: TV registry twin

- **Reason:** H2 consequence: F.8 C32 applied.
- **Evidence:** wp_canonical.json WT-08 tv_targets [F.8 C32]
- **Before:**

~~~~text
Either way, the registry only binds TV once a TV twin exists. Add `TV/TrueVision__NOTES__FolderNumberRegistry__.md` to WT-08
(DR-36 (b)).
~~~~

- **After:**

~~~~text
Either way, the registry only binds TV once a TV twin exists: WT-08 adds `TV/TrueVision__NOTES__FolderNumberRegistry__.md`
(R6 F.8 C32; DR-36 (b)).
~~~~

### 105. `report/R1__A_FolderNaming_FolderDivergence.md` - A.3.2 Step 0 #1: W0-01 committed first

- **Reason:** Item 5: Step 0 must require Adam's W0-01 commit before W0-02 (R6 C10, K3 R11, W0-01 acceptance item 6, W0-02 acceptance item 1).
- **Evidence:** wp_canonical.json W0-02 acceptance[1] "Adam's W0-01 commit is in HEAD"; k2_renumber_apply.py:269-273
- **Before:**

~~~~text
1. W0-01 has recorded DR-02, DR-03 and DR-04 (or their defaults). DR-07 gates only the deploy.
~~~~

- **After:**

~~~~text
1. W0-01 has recorded DR-02, DR-03 and DR-04 (or their defaults), and Adam has committed that PLAN edit on its own, so it is in
   HEAD: W0-01 writes `VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md` inside the VV app root, and item 2 would otherwise
   refuse the tree (the Wave 0 deadlock, R6 F.8 C10). DR-07 gates only the deploy.
~~~~

### 106. `report/R1__A_FolderNaming_FolderDivergence.md` - A.3.2 Step 0 #2: WCP data

- **Reason:** Item 5: aligned with R6 F.5.2 W0 entry (clean VV and WCP trees) and C4.
- **Evidence:** R6 F.5.2 W0 row
- **Before:**

~~~~text
is empty. The script refuses a dirty VV tree in git
   mode (`k2_renumber_apply.py:269-273`). Today WCP is not clean (A.4 #6): Adam commits that first, or the check is narrowed to VV.
~~~~

- **After:**

~~~~text
is empty (W0-01's commit is in HEAD). The script refuses a dirty VV tree
   in git mode (`k2_renumber_apply.py:269-273`). Today WCP is not clean (A.4 #6): Adam commits or sets aside that sync data first
   (R6 F.5.2 W0 entry; F.8 C4).
~~~~

### 107. `report/R1__A_FolderNaming_FolderDivergence.md` - A.3.2 Step 4: before any other W0 package

- **Reason:** Item 5: R6 C10 and K3 R11 say "before any other W0 package" (W0-03, W0-05, W0-06 and W0-08 all depend on W0-02).
- **Evidence:** wp_canonical.json swarm_rules R11; W0-02 acceptance[7]
- **Before:**

~~~~text
Adam commits it, code only, before W0-03 starts.
~~~~

- **After:**

~~~~text
Adam commits it, code only, before any other W0 package is dispatched (R6 F.8 C10; K3 R11).
~~~~

### 108. `report/R1__A_FolderNaming_FolderDivergence.md` - A.3.2 Step 5: 41 README

- **Reason:** Item 8.
- **Evidence:** F.8 C14
- **Before:**

~~~~text
the realign-plan mirror and (proposed) the 41 README.
~~~~

- **After:**

~~~~text
the realign-plan mirror and the 41 README (R6 F.8 C14).
~~~~

### 109. `report/R1__A_FolderNaming_FolderDivergence.md` - A.3.3 W0-01 row

- **Reason:** Item 5.
- **Evidence:** F.8 C10
- **Before:**

~~~~text
| W0-01 | Records the DR-02, DR-03 and DR-04 answers as VV D-numbers | - |
~~~~

- **After:**

~~~~text
| W0-01 | Records the DR-02, DR-03 and DR-04 answers as VV D-numbers; Adam commits that PLAN edit alone before W0-02 is dispatched (R6 F.8 C10) | - |
~~~~

### 110. `report/R1__A_FolderNaming_FolderDivergence.md` - A.3.3 W0-02 row

- **Reason:** Item 5.
- **Evidence:** F.8 C10
- **Before:**

~~~~text
| **W0-02** | The renumber (FR-01..FR-11); the highest-contention package (21 hot files), run alone | W0-01 |
~~~~

- **After:**

~~~~text
| **W0-02** | The renumber (FR-01..FR-11); the highest-contention package (21 hot files), run alone, then committed alone (R6 F.8 C10) | W0-01, committed by Adam |
~~~~

### 111. `report/R1__A_FolderNaming_FolderDivergence.md` - A.3.3 W0-06 row

- **Reason:** Item 8.
- **Evidence:** F.8 C14
- **Before:**

~~~~text
(and, proposed, the 41 README)
~~~~

- **After:**

~~~~text
(and the 41 README, R6 F.8 C14)
~~~~

### 112. `report/R1__A_FolderNaming_FolderDivergence.md` - A.3.3 WT-08 row

- **Reason:** H2 consequence.
- **Evidence:** F.8 C32
- **Before:**

~~~~text
| WT-08 | TV plan 4.1 note; TV registry twin (proposed) |
~~~~

- **After:**

~~~~text
| WT-08 | TV plan 4.1 note; TV registry twin (R6 F.8 C32) |
~~~~

### 113. `report/R1__A_FolderNaming_FolderDivergence.md` - A.3.4 risk 2: G4 exemptions

- **Reason:** Item 5: the G4 exemption wording reads the same in R1, R2 and R6.
- **Evidence:** wp_canonical.json standard_gates G4
- **Before:**

~~~~text
and the W0-04 lint fails on NA-only markers. |
~~~~

- **After:**

~~~~text
and the W0-04 lint fails on NA-only markers outside its exemptions: the whole PORT NOTE block of a file, history documents and the named TrueVisionHub statement file; a hit on W0-04's baseline allow-list prints WARN (K3 G4, R6 F.8 C13). |
~~~~

### 114. `report/R1__A_FolderNaming_FolderDivergence.md` - A.3.4 risk 5: live_sw.js lines

- **Reason:** Sweep (d): the token is at :68; :157 is the precache entry (R0 P10).
- **Evidence:** WebApps/live_sw.js:68, :157
- **Before:**

~~~~text
`WebApps/live_sw.js:157` is an older tracked copy (token `2026-09-10-6`).
~~~~

- **After:**

~~~~text
`WebApps/live_sw.js` is an older, unreferenced tracked copy of the logic file (token `2026-09-10-6` at `:68`; `:157` is its DistanceCulling precache line).
~~~~

### 115. `report/R1__A_FolderNaming_FolderDivergence.md` - A.4 #2 action

- **Reason:** H2 consequence / sweep (i).
- **Evidence:** wp_canonical.json W6-03 hard_gate [F.8 C31]
- **Before:**

~~~~text
| Add a keep-or-archive choice to W6-03's hard gate |
~~~~

- **After:**

~~~~text
| Done: W6-03's hard gate (R6 F.8 C31); the choice is R0.2.11 Q-35ASSETS |
~~~~

### 116. `report/R1__A_FolderNaming_FolderDivergence.md` - A.4 #3 action

- **Reason:** H2 consequence.
- **Evidence:** F.8 C14
- **Before:**

~~~~text
| Assign it to W0-06 (documentation only; already gated by DR-26) |
~~~~

- **After:**

~~~~text
| Done: W0-06 creates it (R6 F.8 C14) |
~~~~

### 117. `report/R1__A_FolderNaming_FolderDivergence.md` - A.4 #4 action

- **Reason:** Item 8 (R1) / sweep (i).
- **Evidence:** F.8 C35
- **Before:**

~~~~text
| Assign them to TV growth (A.2.7) |
~~~~

- **After:**

~~~~text
| Assign them to TV growth (A.2.7); R0.2.11 Q-REG, named in W0-04 and W0-06 (R6 F.8 C35) |
~~~~

### 118. `report/R1__A_FolderNaming_FolderDivergence.md` - A.4 #5 action

- **Reason:** Item 8 (R1).
- **Evidence:** R0 R0.2.11 Q-63
- **Before:**

~~~~text
| New decision, not in K1: rename it on the branch, or move VV 63 -> 93 (A.2.7) |
~~~~

- **After:**

~~~~text
| New decision, not in K1: R0.2.11 Q-63 (rename it on the branch, or move VV 63 -> 93; A.2.7) |
~~~~

### 119. `report/R1__A_FolderNaming_FolderDivergence.md` - A.4 #6 action

- **Reason:** Item 5: aligned with R6.
- **Evidence:** R6 F.5.2
- **Before:**

~~~~text
| Adam commits the sync output first, or the acceptance check narrows to VV |
~~~~

- **After:**

~~~~text
| Adam commits or sets aside the sync output first (R6 F.5.2 W0 entry; F.8 C4) |
~~~~

### 120. `report/R1__A_FolderNaming_FolderDivergence.md` - A.4 #8 action

- **Reason:** Item 5.
- **Evidence:** F.8 C10
- **Before:**

~~~~text
| Commit W0-02 alone (A.3.2 Step 4) |
~~~~

- **After:**

~~~~text
| Commit W0-02 alone (A.3.2 Step 4); now in K3 R11 and the W0-01 and W0-02 acceptance (R6 F.8 C10) |
~~~~

### 121. `report/R1__A_FolderNaming_FolderDivergence.md` - A.4 #10 action

- **Reason:** H2 consequence.
- **Evidence:** F.8 C32
- **Before:**

~~~~text
| Add `TV/TrueVision__NOTES__FolderNumberRegistry__.md` to WT-08 |
~~~~

- **After:**

~~~~text
| Done: WT-08 lists it (R6 F.8 C32) |
~~~~

### 122. `report/R1__A_FolderNaming_FolderDivergence.md` - A.4 #11 finding

- **Reason:** Sweep (d).
- **Evidence:** R0 P10
- **Before:**

~~~~text
what the deployed site actually serves is still unverified.
~~~~

- **After:**

~~~~text
what the deployed site actually serves is still unverified (R0 P10: resolved in code, one live check left at the W0 deploy; R6 F.8 C5).
~~~~

### 123. `report/R3__C_WiringRequirements.md` - C.2 (g) published reader URLs

- **Reason:** Item 8 (R3): F.8 C30 settled W4-17's localhost URL.
- **Evidence:** wp_canonical.json W4-17 vv_adaptations[1], W0-19 goal [F.8 C30]
- **Before:**

~~~~text
W4-17's text gives `http://127.0.0.1:8000/Projects/{folderId}/06__...`, which today reaches the catch-all that answers `index.html` with 200 (`server.py:956-977`), so use `/Whitecardopedia/Projects/...` (real 404, :899-909) unless W0-19 makes `/Projects/` answer 404 (C.5).
~~~~

- **After:**

~~~~text
W4-17's text gave `http://127.0.0.1:8000/Projects/{folderId}/06__...`, which reaches the catch-all that answers `index.html` with 200 (`server.py:956-977`); since R6 F.8 C30 W4-17 reads `/Whitecardopedia/Projects/...` (the facade's `repoUrl` form; real 404, :899-909) and W0-19 answers missing published and statement files with a JSON 404 through its blueprints (C.5).
~~~~

### 124. `report/R3__C_WiringRequirements.md` - C.2 (g) route reloading

- **Reason:** Item 8 (R3): F.8 C16 settled the W0-09 risk line.
- **Evidence:** wp_canonical.json W0-09 risk [F.8 C16]; WCP/server.py:1007-1011
- **Before:**

~~~~text
K3's W0-09 risk line "Flask does not reload routes (restart needed)" holds only for a server started without the reloader (C.5).
~~~~

- **After:**

~~~~text
K3's W0-09 risk line said "Flask does not reload routes (restart needed)", which holds only for a server started without the reloader; R6 F.8 C16 rewrote it and gave restarts to the integrator (F.4.1; C.5).
~~~~

### 125. `report/R3__C_WiringRequirements.md` - C.3 DAG note: package count

- **Reason:** H2 consequence.
- **Evidence:** wp_canonical.json topological_order (165)
- **Before:**

~~~~text
(K3 section 13: topological sort of 164 packages, 0 errors)
~~~~

- **After:**

~~~~text
(K3 section 13: topological sort of 164 packages, 0 errors, when this section was written; 165 since R6 F.8 C33 added W5-07, which sits inside W5 and is not drawn)
~~~~

### 126. `report/R3__C_WiringRequirements.md` - C.4 S7: R0 column and W5-07

- **Reason:** Item 2: R0.3 maps S7 to R0.3.6 (Layout Mode); H2 consequence (W5-07).
- **Evidence:** R0 R0.3 rule list (S7 R0.3.6)
- **Before:**

~~~~text
| W1-05, W1-31, W1-34, W2-17; re-decided W4-09 | DR-25 | PD-05 |
~~~~

- **After:**

~~~~text
| W1-05, W1-31, W1-34, W2-17; re-decided W4-09; W5-07 retires it on a 'retire' answer (R6 F.8 C33) | DR-25 | R0.3.6 (Layout Mode) |
~~~~

### 127. `report/R3__C_WiringRequirements.md` - C.4 S10: Vale example

- **Reason:** Sweep (h): no NA job phase in a Vale example (DR-11 default {project}_{drawing}).
- **Evidence:** DR-11 default; F.8 C21
- **Before:**

~~~~text
VV's `?project=` token can be `2026/3047__Doous`, which would print `2026/3047__Doous_T01_D01` (S07a-V01, DR-11)
~~~~

- **After:**

~~~~text
VV's `?project=` token can be `2026/3047__Doous`, which would print `2026/3047__Doous_D01`, a folder path inside a document name (S07a-V01, DR-11)
~~~~

### 128. `report/R3__C_WiringRequirements.md` - C.4 S10: R0 column

- **Reason:** Item 2: R0 PD-20 is S10's row.
- **Evidence:** R0 R0.3 rule list (S10 PD-20)
- **Before:**

~~~~text
| W1-12 | DR-11 | - |
~~~~

- **After:**

~~~~text
| W1-12 | DR-11 | PD-20 |
~~~~

### 129. `report/R3__C_WiringRequirements.md` - C.4 S11: R0 column

- **Reason:** Item 2 (checked against R0.3): R0 maps S11 to PD-03 and PD-12.
- **Evidence:** R0 R0.3 rule list (S11 PD-03 and PD-12)
- **Before:**

~~~~text
| W0-12 | DR-27 (K2 K4) | PD-12 |
~~~~

- **After:**

~~~~text
| W0-12 | DR-27 (K2 K4) | PD-03, PD-12 |
~~~~

### 130. `report/R3__C_WiringRequirements.md` - C.4 S13: R0 column

- **Reason:** Item 2.
- **Evidence:** R0 R0.3 rule list (S13 PD-21)
- **Before:**

~~~~text
| W0-14 | DR-27 | - |
~~~~

- **After:**

~~~~text
| W0-14 | DR-27 | PD-21 |
~~~~

### 131. `report/R3__C_WiringRequirements.md` - C.4 S14: R0 column

- **Reason:** Item 2 (checked against R0.3).
- **Evidence:** R0 R0.3 rule list (S14 R0.3.6)
- **Before:**

~~~~text
| W2-19, W3-08 | DR-05 | - |
~~~~

- **After:**

~~~~text
| W2-19, W3-08 | DR-05 | R0.3.6 (`Snapping__.js`) |
~~~~

### 132. `report/R3__C_WiringRequirements.md` - C.4 S16: R0 column

- **Reason:** Item 2 (checked against R0.3).
- **Evidence:** R0 R0.3 rule list (S16 PD-12 and PD-20)
- **Before:**

~~~~text
| W4-06 | DR-11, DR-29 | PD-12 |
~~~~

- **After:**

~~~~text
| W4-06 | DR-11, DR-29 | PD-12, PD-20 |
~~~~

### 133. `report/R3__C_WiringRequirements.md` - C.4 S17: R0 column

- **Reason:** Item 2.
- **Evidence:** R0 R0.3 rule list (S17 PD-22)
- **Before:**

~~~~text
| W4-07, W4-08 | DR-23 | PD-15 |
~~~~

- **After:**

~~~~text
| W4-07, W4-08 | DR-23 | PD-22 |
~~~~

### 134. `report/R3__C_WiringRequirements.md` - C.4 S18: localhost URL and R0 column

- **Reason:** Item 2 and item 8 (R3).
- **Evidence:** R0 R0.3 rule list (S18 PD-23); F.8 C30
- **Before:**

~~~~text
| the localhost first URL must be 404-honest and the live URL is built from the configured R2 base, never through `ResolveAssetUrl` (catalogue g1, C.5) | W4-17 | DR-22, DR-29 | - |
~~~~

- **After:**

~~~~text
| the localhost first URL is the facade's `repoUrl` form, `/Whitecardopedia/Projects/{folderId}/06__Layout__PublishedDocuments/...`, which answers real 404s (R6 F.8 C30), and the live URL is built from the configured R2 base, never through `ResolveAssetUrl` (catalogue g1, C.5) | W4-17 | DR-22, DR-29 | PD-23 |
~~~~

### 135. `report/R3__C_WiringRequirements.md` - C.4 S19: R0 column

- **Reason:** Item 2.
- **Evidence:** R0 R0.3 rule list (S19 PD-24)
- **Before:**

~~~~text
| W2-14 | DR-08, DR-29 | - |
~~~~

- **After:**

~~~~text
| W2-14 | DR-08, DR-29 | PD-24 |
~~~~

### 136. `report/R3__C_WiringRequirements.md` - C.4 S20: R0 column

- **Reason:** Item 2 (checked against R0.3): R0 maps S20 to DIV-2 (PD-02), whose row carries the naCrossSectionToolDev* rename.
- **Evidence:** R0 R0.3 rule list (S4 and S20 DIV-2 (PD-02)); R0.3.1 DIV-2 rule column
- **Before:**

~~~~text
| W2-05 | DR-26 | PD-17 |
~~~~

- **After:**

~~~~text
| W2-05 | DR-26 | PD-02 (DIV-2) |
~~~~

### 137. `report/R3__C_WiringRequirements.md` - C.4 S23: R0 column

- **Reason:** Item 2.
- **Evidence:** R0 R0.3 rule list (S23 PD-25)
- **Before:**

~~~~text
| W1-06 | DR-24, DR-41 | PD-05 |
~~~~

- **After:**

~~~~text
| W1-06 | DR-24, DR-41 | PD-25 |
~~~~

### 138. `report/R3__C_WiringRequirements.md` - C.5 probe row

- **Reason:** Item 8 (R3) / sweep (f).
- **Evidence:** wp_canonical.json W2-34 goal [F.8 C28]; W0-19 acceptance[2] [F.8 C36]
- **Before:**

~~~~text
VV's existing ScrapbookCustom transport keeps `/api/check-localhost` (VV :84, an adaptation already shipped, S06a :255). K3's W2-34 wording needs aligning (C.6) |
~~~~

- **After:**

~~~~text
VV's existing ScrapbookCustom transport keeps `/api/check-localhost` (VV :84, an adaptation already shipped, S06a :255). K3's W2-34 wording was aligned by R6 F.8 C28, and W0-19's statement test server by F.8 C36 |
~~~~

### 139. `report/R3__C_WiringRequirements.md` - C.5 reader row

- **Reason:** Item 8 (R3).
- **Evidence:** F.8 C30
- **Before:**

~~~~text
Use `/Whitecardopedia/Projects/{folderId}/...` (the facade's `repoUrl` form) or have W0-19 make `/Projects/` 404-honest |
~~~~

- **After:**

~~~~text
Use `/Whitecardopedia/Projects/{folderId}/...` (the facade's `repoUrl` form) or have W0-19 make `/Projects/` 404-honest. R6 F.8 C30 chose the first for W4-17 and has W0-19 answer missing files with JSON 404s through its blueprints |
~~~~

### 140. `report/R3__C_WiringRequirements.md` - C.5 Flask row

- **Reason:** Item 8 (R3).
- **Evidence:** F.8 C16
- **Before:**

~~~~text
A restart is needed only for a server started another way; not tried at runtime |
~~~~

- **After:**

~~~~text
A restart is needed only for a server started another way; not tried at runtime. R6 F.8 C16 rewrote the W0-09 risk line; the integrator owns restarts (F.4.1) |
~~~~

### 141. `report/R3__C_WiringRequirements.md` - C.6 W2-34 row

- **Reason:** Item 8 (R3) / sweep (f).
- **Evidence:** F.8 C28, C36
- **Before:**

~~~~text
| align the W2-34 text with DR-28 (A) before the package is handed out |
~~~~

- **After:**

~~~~text
| Settled: R6 F.8 C28 aligned W2-34 with DR-28 (A) in `wp_canonical.json`; F.8 C36 did the same for W0-19's statement test server |
~~~~

### 142. `report/R3__C_WiringRequirements.md` - C.6 W4-17 row

- **Reason:** Item 8 (R3).
- **Evidence:** F.8 C30
- **Before:**

~~~~text
| pick `/Whitecardopedia/Projects/...` in W4-17 or a real 404 under `/Projects/` in W0-19 |
~~~~

- **After:**

~~~~text
| Settled: R6 F.8 C30 (W4-17 reads `/Whitecardopedia/Projects/...`; W0-19 answers missing files with JSON 404s through its blueprints) |
~~~~

### 143. `report/R3__C_WiringRequirements.md` - C.6 W0-09 row

- **Reason:** Item 8 (R3).
- **Evidence:** F.8 C16
- **Before:**

~~~~text
| confirm on Adam's machine; the line can then go |
~~~~

- **After:**

~~~~text
| Settled in the text: R6 F.8 C16 rewrote the risk line and gave restarts to the integrator (F.4.1); whether the reloader picks up a new blueprint is still to be seen on Adam's machine |
~~~~

### 144. `report/R3__C_WiringRequirements.md` - C.6 merge-keys row

- **Reason:** H2 consequence.
- **Evidence:** wp_canonical.json W0-10 [F.8 C17]
- **Before:**

~~~~text
| W0-10 derives its families from the list, or its tests cover both directions |
~~~~

- **After:**

~~~~text
| Settled: R6 F.8 C17 (W0-10 derives its families from the list and its tests cover both directions) |
~~~~

### 145. `report/R3__C_WiringRequirements.md` - C.6 SectionAdapter names row

- **Reason:** H2 consequence.
- **Evidence:** wp_canonical.json W2-02, WT-02 [F.8 C25]
- **Before:**

~~~~text
| fix the names in W2-02 and record them for WT-02 |
~~~~

- **After:**

~~~~text
| Settled: R6 F.8 C25 fixed the six names for W2-02 and WT-02 |
~~~~

### 146. `report/R3__C_WiringRequirements.md` - C.6 service-worker row

- **Reason:** Item 2 / sweep (d): R3 C.6 still listed the question as open; R0 P10 and R6 F.8 C5 resolve it in code.
- **Evidence:** VV/index.html:34, :44; Url constructor :38, :225-231; stub :24, :31; live_sw.js:68
- **Before:**

~~~~text
| `WebApps/live_sw.js` is a stale copy (token `2026-09-10-6`); K3 section 14 lists this too | confirm before W0-08 is handed to Adam |
~~~~

- **After:**

~~~~text
| Resolved in code (R0 P10; R6 F.8 C5; K3 section 14): VV registers WCP's stub `WebApps/Na__Pwa__ServiceWorker__.js`, which imports the WCP logic file; `WebApps/live_sw.js` (token `2026-09-10-6` at `:68`) is an unreferenced saved copy | One live check left: at the W0 deploy, confirm the live site serves the same stub |
~~~~

### 147. `report/R3__C_WiringRequirements.md` - C.6 K3 section 14 row

- **Reason:** Sweep (i).
- **Evidence:** R0 R0.2.1 row 8
- **Before:**

~~~~text
| answered in W0-01 |
~~~~

- **After:**

~~~~text
| answered in W0-01 (the step is the front matter's Q-VER, R0.2.1) |
~~~~

### 148. `report/R4__D_BroaderUiParity.md` - D.1.4 W1-33 item 1: .na-vs-tl

- **Reason:** Item 8 (R4): F.8 C22 added the selector to W1-33.
- **Evidence:** wp_canonical.json W1-33 vv_adaptations[7] [F.8 C22]
- **Before:**

~~~~text
Optionally add the VV-only `body.na-layout-editor--active .na-vs-tl`
   (S10-V03), recorded as a divergence.
~~~~

- **After:**

~~~~text
Add the VV-only `body.na-layout-editor--active .na-vs-tl`
   (S10-V03), recorded as a divergence (a W1-33 adaptation since R6 F.8 C22).
~~~~

### 149. `report/R4__D_BroaderUiParity.md` - D.1.4 hand-over: the immediate seam

- **Reason:** Item 8 (R4): W1-33's seam for "immediate" is settled by F.8 C22.
- **Evidence:** wp_canonical.json W1-33 vv_adaptations[6] [F.8 C22]
- **Before:**

~~~~text
- **Open seam.** How Enter learns that the loader's cover is up is not specified by any source; see D.5 item 5.
~~~~

- **After:**

~~~~text
- **Seam (settled by R6 F.8 C22; R0.2.11 Q-COVER part 2).** No source said how Enter learns that the loader's cover is up.
  LoadingScreen now exports `Na__LeLoadScreen__IsShown()` (true while its loading state is up, not fading and not the
  error state), and the ModeController passes `immediate: Na__LeLoadScreen__IsShown()` to FirstOpen at TV's call site, so
  `Enter(sheetId)` keeps TV's signature (D.5 item 5).
~~~~

### 150. `report/R4__D_BroaderUiParity.md` - D.1.5 case 3: cover words

- **Reason:** Item 8 (R4) / sweep (i): the cold document-tab cover wording is routed to R0's Q-COVER.
- **Evidence:** R0 R0.2.11 Q-COVER
- **Before:**

~~~~text
| cold VV shows a short cover; its headline is D.5 item 6 |
~~~~

- **After:**

~~~~text
| cold VV shows a short cover; its words are R0.2.11 Q-COVER part 1, Adam's (D.5 item 6) |
~~~~

### 151. `report/R4__D_BroaderUiParity.md` - D.1.5 case 8: Layout Mode

- **Reason:** H2 consequence / sweep (g).
- **Evidence:** W5-07
- **Before:**

~~~~text
| no strip, no fold | recorded divergence (DR-25) |
~~~~

- **After:**

~~~~text
| no strip, no fold | recorded divergence (DR-25); W5-07 retires the switch on a 'retire' answer at W4-09 (R6 F.8 C33) |
~~~~

### 152. `report/R4__D_BroaderUiParity.md` - D.2.1 row 2: W1-34 acceptance

- **Reason:** Item 8 (R4).
- **Evidence:** wp_canonical.json W1-34 acceptance[1] [F.8 C23]
- **Before:**

~~~~text
should read "after the fold" (D.5 item 2) |
~~~~

- **After:**

~~~~text
should read "after the fold" (D.5 item 2; R6 F.8 C23 made that change) |
~~~~

### 153. `report/R4__D_BroaderUiParity.md` - D.4 check 15: cover words

- **Reason:** Sweep (i).
- **Evidence:** R0 R0.2.11 Q-COVER
- **Before:**

~~~~text
| cold VV shows a short cover while the editor imports (D.5 item 6) |
~~~~

- **After:**

~~~~text
| cold VV shows a short cover while the editor imports; its words are R0.2.11 Q-COVER part 1 (D.5 item 6) |
~~~~

### 154. `report/R4__D_BroaderUiParity.md` - D.5 #2: PlaceMenu call sites, settled

- **Reason:** Item 8 (R4): W1-34's acceptance is corrected by F.8 C23; D.5 #2 also missed the re-render call site (TV TabStrip :370).
- **Evidence:** TV 51/05__Core__ModeController/Na__LayoutEditor__TabStrip__.js:370, :508, :574, :649, :655-658, :662
- **Before:**

~~~~text
   it should say "after the fold". `Na__LeTabs__PlaceMenu` (TabStrip 508-519) runs only on open, scroll and resize
   (649, 655-659), and a mode change shuts the menu (662). This is identical in TV (S03a verifier, (e) note 3).
~~~~

- **After:**

~~~~text
   it should say "after the fold". `Na__LeTabs__PlaceMenu` (TabStrip 508-519) runs only on open (574), on a re-render
   while the menu is open (370), on scroll (649) and on resize (655-659), and a mode change shuts the menu (662). This is
   identical in TV (S03a verifier, (e) note 3). Settled: R6 F.8 C23 made this change in `wp_canonical.json`.
~~~~

### 155. `report/R4__D_BroaderUiParity.md` - D.5 #2: tense (the line is corrected)

- **Reason:** Item 8 (R4): the acceptance line no longer says this (F.8 C23).
- **Evidence:** wp_canonical.json W1-34 acceptance[1]
- **Before:**

~~~~text
2. **Correct K3 W1-34's acceptance line.** It says the menu "hangs under the strip during and after the header fold";
~~~~

- **After:**

~~~~text
2. **Correct K3 W1-34's acceptance line.** It said the menu "hangs under the strip during and after the header fold";
~~~~

### 156. `report/R4__D_BroaderUiParity.md` - D.5 #3: tense (the note is rewritten)

- **Reason:** H2 consequence: the note no longer says this (F.8 C2).
- **Evidence:** wp_canonical.json W0-04 notes[1]
- **Before:**

~~~~text
3. **W0-04 note: when each UI check can pass.** The note says the UI gate fails "until W1-30/W1-31". In the code:
~~~~

- **After:**

~~~~text
3. **W0-04 note: when each UI check can pass.** The note said the UI gate fails "until W1-30/W1-31". In the code:
~~~~

### 157. `report/R4__D_BroaderUiParity.md` - D.5 #3: settled

- **Reason:** H2 consequence.
- **Evidence:** wp_canonical.json W0-04 notes[1] [F.8 C2]
- **Before:**

~~~~text
   Run the gate as a report until W1-38.
~~~~

- **After:**

~~~~text
   Run the gate as a report until W1-38. Settled: R6 F.8 C2 rewrote W0-04's note (each check blocks once its owner is DONE,
   every check from W1-99).
~~~~

### 158. `report/R4__D_BroaderUiParity.md` - D.5 #5: settled seam

- **Reason:** Item 8 (R4).
- **Evidence:** wp_canonical.json W1-33 vv_adaptations[6] [F.8 C22]
- **Before:**

~~~~text
5. **Open seam: how `immediate` reaches FirstOpen.** TV's `Enter(sheetId)` takes no option, and no source says how
   VV's Enter learns that the loader's cover is up. It needs a recorded VV seam. Options: the loader passes an
   option through the facade, or LoadingVeil checks the cover itself (`#naLayoutEditorLoading` visible). The veil
   must show synchronously inside Enter (D.1.4, hand-over detail).
~~~~

- **After:**

~~~~text
5. **Seam: how `immediate` reaches FirstOpen (settled; R0.2.11 Q-COVER part 2).** TV's `Enter(sheetId)` takes no option,
   and no source said how VV's Enter learns that the loader's cover is up. Options were: the loader passes an option
   through the facade, or LoadingVeil checks the cover itself (`#naLayoutEditorLoading` visible). The veil must show
   synchronously inside Enter (D.1.4, hand-over detail). Settled by R6 F.8 C22: LoadingScreen exports
   `Na__LeLoadScreen__IsShown()` and the ModeController passes `immediate: Na__LeLoadScreen__IsShown()` to FirstOpen at
   TV's call site (a check of the loader's cover, made through LoadingScreen's own state); `Enter(sheetId)` keeps TV's
   signature.
~~~~

### 159. `report/R4__D_BroaderUiParity.md` - D.5 #6: routed to Q-COVER

- **Reason:** Item 8 (R4) / sweep (i).
- **Evidence:** R0 R0.2.11 Q-COVER
- **Before:**

~~~~text
6. **Open: what the cold-VV cover says on a document tab.**
~~~~

- **After:**

~~~~text
6. **Open (Adam's, R0.2.11 Q-COVER part 1): what the cold-VV cover says on a document tab.**
~~~~

### 160. `report/R4__D_BroaderUiParity.md` - D.5 #7: settled

- **Reason:** H2 consequence.
- **Evidence:** wp_canonical.json W0-06 notes[1], W1-34 vv_adaptations[4] [F.8 C15]
- **Before:**

~~~~text
   PORT NOTE belongs to W0-06 or W1-35, since W1-34 does not edit the Toolbar.
~~~~

- **After:**

~~~~text
   PORT NOTE belongs to W0-06 or W1-35, since W1-34 does not edit the Toolbar. Settled: R6 F.8 C15 (W1-33 and W1-34
   write those lines; the Toolbar PORT NOTE is W0-06's).
~~~~

### 161. `report/R4__D_BroaderUiParity.md` - D.5 #8: end state

- **Reason:** Sweep (g): R4 and R0.1.8 state the same end state.
- **Evidence:** R0 R0.1.8
- **Before:**

~~~~text
   shows four tabs after W4-10. DR-25 (a) also keeps VV's strip, and so its fold, hidden on any project whose Layout
   Mode is off.
~~~~

- **After:**

~~~~text
   shows four tabs after W4-10. DR-25 (a) also keeps VV's strip, and so its fold, hidden on any project whose Layout
   Mode is off, until a DR-25 'retire' answer releases W5-07 (R6 F.8 C33). The front matter lists every difference that
   remains on the K1 defaults and the answer that removes each (R0.1.8, E1-E13).
~~~~

### 162. `report/R4__D_BroaderUiParity.md` - D.5 #9: .na-vs-tl settled

- **Reason:** Item 8 (R4).
- **Evidence:** wp_canonical.json W1-33 vv_adaptations[7] [F.8 C22]
- **Before:**

~~~~text
   - The VV-only `.na-vs-tl` hide selector (S10-V03) is not in K3 W1-33's adaptations; add it there as a recorded
     divergence, or leave it, since it is a localhost-only Video Studio case.
~~~~

- **After:**

~~~~text
   - The VV-only `.na-vs-tl` hide selector (S10-V03) is in W1-33's adaptations since R6 F.8 C22, as a recorded
     divergence.
~~~~

### 163. `report/K2__TargetMaps.md` - section 1 Headline 3

- **Reason:** Item 4: K2 described 62 -> 92 as a planned move; DR-03 keeps 62 and K3 W6-03 moves it only on request.
- **Evidence:** DR-03 recommendation/default; K3 W6-03
- **Before:**

~~~~text
3. **VV-only numbers.** Only two VV-only folders move: legacy 40 -> **91** (W1) and EmailWorkers 62 -> **92** (W3, deferred).
   Both numbers are proved free in TV now and in TV's history.
~~~~

- **After:**

~~~~text
3. **VV-only numbers.** Only one VV-only folder moves: legacy 40 -> **91** (W1). EmailWorkers keeps 62 (a nominal collision,
   recorded; DR-03 default "62 unchanged") and moves to **92** only if Adam asks (FR-22; K3 W6-03, after node_modules is
   untracked). Both numbers are proved free in TV now and in TV's history.
~~~~

### 164. `report/K2__TargetMaps.md` - section 8 registry: VV-reserved

- **Reason:** Item 4.
- **Evidence:** DR-03
- **Before:**

~~~~text
| VV-reserved (TV never takes these) | VV | 28, 29, 31, 35 (until retired, then burnt), 60, 61, 63, 64, 69, 71; 62 until FR-22 moves it |
~~~~

- **After:**

~~~~text
| VV-reserved (TV never takes these) | VV | 28, 29, 31, 35 (until retired, then burnt), 60, 61, 63, 64, 69, 71; 62 (FR-22 moves it to 92 only on request) |
~~~~

### 165. `report/K2__TargetMaps.md` - section 8 registry: VV band

- **Reason:** Item 4.
- **Evidence:** DR-03
- **Before:**

~~~~text
| VV legacy / VV-only band | VV | 91 (2dElevationsView), 92 (EmailWorkers), 93-99 free for future VV-only folders |
~~~~

- **After:**

~~~~text
| VV legacy / VV-only band | VV | 91 (2dElevationsView), 92 (reserved for EmailWorkers if FR-22 runs), 93-99 free for future VV-only folders |
~~~~

### 166. `report/K2__TargetMaps.md` - section 9 step 4: service worker

- **Reason:** Sweep (d): K2 still listed the service-worker file as open and cited :157 for the token (R0 P10 noted both).
- **Evidence:** WebApps/live_sw.js:68, :157; VV/index.html:34, :44; Url constructor :38, :225-231
- **Before:**

~~~~text
`WebApps/live_sw.js:157` is a stale tracked copy (token `2026-09-10-6`); confirm which file the deployed site
registers before editing it (S01 W7).
~~~~

- **After:**

~~~~text
Which file VV registers is resolved in code (R0 P10, R6 F.8 C5): the WCP registrar registers the WebApps stub
`Na__Pwa__ServiceWorker__.js`, which imports the WCP logic file; `WebApps/live_sw.js` is an unreferenced saved copy (token
`2026-09-10-6` at `:68`; `:157` is its stale DistanceCulling precache line). Left: confirm at the W0 deploy that the live site
serves the same stub (S01 W7).
~~~~

### 167. `report/K2__TargetMaps.md` - section 10: W3 row

- **Reason:** Item 4.
- **Evidence:** DR-03; K3 W6-03
- **Before:**

~~~~text
| W3 | FR-21 (retire 35), FR-25 (retire 91), FR-22 (62 -> 92), FR-23 (old three.js),
~~~~

- **After:**

~~~~text
| W3 | FR-21 (retire 35), FR-25 (retire 91), FR-22 (62 -> 92, only on request), FR-23 (old three.js),
~~~~

### 168. `report/K2__TargetMaps.md` - section 12: service worker

- **Reason:** Sweep (d).
- **Evidence:** as above
- **Before:**

~~~~text
- Whether the deployed site registers the WCP stub or the stale `WebApps/live_sw.js` (S01 W7) is unverified.
~~~~

- **After:**

~~~~text
- Resolved in code (R0 P10, R6 F.8 C5): VV registers the WCP stub, and `WebApps/live_sw.js` is an unreferenced saved copy;
  only the live site's copy is left to confirm, at the W0 deploy (S01 W7).
~~~~

### 169. `report/K2__NamingRulebook.md` - N3: 62 and 92

- **Reason:** Item 4.
- **Evidence:** DR-03
- **Before:**

~~~~text
**VV-reserved** 28, 29, 31, 35, 60, 61, 62 (until it moves to 92), 63, 64, 69, 71 and 91-99 (91 legacy 2dElevationsView, 92 EmailWorkers, 93-99 future VV-only).
~~~~

- **After:**

~~~~text
**VV-reserved** 28, 29, 31, 35, 60, 61, 62 (it moves to 92 only if Adam asks, FR-22), 63, 64, 69, 71 and 91-99 (91 legacy 2dElevationsView, 92 EmailWorkers if it moves, 93-99 future VV-only).
~~~~

### 170. `report/K2__NamingRulebook.md` - V2: the Hub section

- **Reason:** Item 3 / sweep (c): V2 listed the Hub among markers that never ship, against W4-12 and R0 PD-15.
- **Evidence:** DR-43; W4-12; F.8 C13
- **Before:**

~~~~text
`Noble Architecture Ltd`, "TrueVision 3D Project Hub". `cdn.noble-architecture.com/VaApps/...`
~~~~

- **After:**

~~~~text
`Noble Architecture Ltd`, and the "TrueVision 3D Project Hub" section in any rendered statement (its module lands inert at TV's path, excluded from DEFINITIONS by config and named in G4's one exception: DR-43, R0 PD-15). `cdn.noble-architecture.com/VaApps/...`
~~~~

### 171. `report/K2__NamingRulebook.md` - section 12 gate 3: exemptions

- **Reason:** Item 5: G4 exemption wording identical to K3 G4.
- **Evidence:** wp_canonical.json standard_gates G4
- **Before:**

~~~~text
no NA-only marker (V2) outside PORT NOTE "Ported from" lines and history.
~~~~

- **After:**

~~~~text
no NA-only marker (V2). Exempt: the whole PORT NOTE block of a file, history documents (devlog, ledger, `__PLAN__`, `__NOTES__`, `Research__` and `TASK__` files) and the named TrueVisionHub statement file; a hit on W0-04's baseline allow-list prints WARN instead of failing (K3 G4, W0-04; R6 F.8 C13).
~~~~

### 172. `report/K2__NamingRulebook.md` - section 14 ruling 8: 62

- **Reason:** Item 4.
- **Evidence:** DR-03; D-S01-08; K3 W6-03
- **Before:**

~~~~text
| **Keep now (nominal collision recorded), move to `92__Feature__EmailWorkers` in W3** after untracking node_modules. Same as K1 DR-03. |
~~~~

- **After:**

~~~~text
| **Keep (nominal collision recorded; the DR-03 default leaves 62 unchanged). Move to `92__Feature__EmailWorkers` only if Adam asks** (D-S01-08 (a); FR-22 in K3 W6-03), after untracking node_modules. Same as K1 DR-03. |
~~~~
