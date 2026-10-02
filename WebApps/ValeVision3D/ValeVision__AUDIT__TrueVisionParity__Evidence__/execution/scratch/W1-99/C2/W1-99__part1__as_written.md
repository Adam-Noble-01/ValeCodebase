# Port Record - W1-99: Parity Scribe pass for Wave 1

```
WP: W1-99   TV commit read: b2aa9151 (git show of TrueVision's devlog at the pin, read-only, to check each release's
            entry and Adam's confirmation line; TrueVision not edited, its working tree not read)
            TV releases covered: none ported by this package. It records the wave's releases in the devlog entry
            ValeVision3D v2.71.2: 59 TrueVision releases and five changes TrueVision never logged (Adam-confirmed in
            TV: v2.155.0's PDF exporter fix; v2.49.0, v2.116.0 and v2.150.0 in part; none of the others - the entry
            names every one, DR-01 (c))
Files:
  - VV ValeVision__DEVLOG__.md  <- no TV source   the Wave 1 entry "ValeVision3D v2.71.2 - 02-Oct-2026 - The Tab Strip
      Becomes TrueVision's, a Drawing Opens Under Its Veil, and the 3D Keys Stay on the 3D Tab" at the top, above the
      v2.71.1 entry (263 lines, ASCII; the file stays pure CRLF); 692,714 -> 718,158 bytes; sha1 3b03fc28 -> 457c1489
  - VV ValeVision__PARITY__TrueVisionLedger__.md  <- no TV source   the Wave 1 rows within W0-06's structure (1.4, 2.1,
      2.3, 3 incl. new 3.8, 4, 5.1, 6, 7, 8.1); preamble and Archive byte-identical; ASCII, CRLF; 528,788 -> 605,750
      bytes; sha1 3db558ae -> dbf77e3a
  - VV ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md  <- no TV source   three dated notes beside D22's stale text
      (WP-S03a-10): the D22 row (:73), the drawings-block comment (:402), the settled item (:973); nothing rewritten;
      LF kept, 1,045 lines (each note extends its line); 165,392 -> 166,282 bytes; sha1 7a8771f7 -> e9531a8c
  - VV 101 files (89 under 02__Src__AppModules, 12 under 80__Testing__PrototypeEnvironment): 136 release
      placeholders -> v2.71.2 (brief step 4). Every one sat inside a comment (module logs and PORT NOTEs; three inside
      the HTML comments of two test pages). Only the token bytes changed; line endings, BOMs and every other byte kept
    seams re-applied: none     record keys / config keys added: none     importer updates: none
Not ported (and why): nothing to port (a records pass)
Tests (fresh, final tree, after every write): Na__Verify__ModuleGraph__ 527 modules / 0 failures (110 import
  targets, the 1 documented vendor issue); Na__Verify__Exports__ 459 files PASS (37 loader-facade names); path gate
  PASS through the records-exempt wrapper, OC-04 (0 fail, 1 baseline warn; raw: 55, all in the AUDIT report);
  Na__Verify__ParityNaming__ 0 fail / 0 warn; Na__Verify__PortNotes__ 573 files, 348 PORT NOTEs, 448 logs, 0 fail /
  128 warn / 0 pending, --scribe PASS; Na__Verify__UiParity__ report 1 of 7 fail ([4] panels, W1-38 not run),
  --block 1,2,3 PASS, --block all FAIL on [4] only (section 6); G5 24/24 exit 0; verifier self-tests 19, 16, 18 and 4
  cases PASS; Na__Test__AppConfigParity__ --strict PASS; the W0-07, W0-08 and W0-10 patches still apply (--check)
New or renamed cross-module exports: no
SHARED SERVICE WORKER: this pass adds 0 modules and no export; bump needed: no (comment bytes and records only). The
  WAVE's decision is recorded in the devlog entry ("Not ported, and why") and ledger 1.4: 42 new modules, exports
  added to 18 existing modules, the positional signatures of Render2d and Render3d changed (W1-23) - bump needed:
  yes, once at deploy, the same consolidated W0/W1 bump (the prepared W0-08 package applied plus one shell-token bump,
  or a full bump); W6-02's precache additions named. Token not bumped ('2026-09-18-1'; UiParity [7]: it predates 17
  ValeVision releases, newest v2.71.2); Adam's call (DR-07).
Transport touched (WCP server.py / CloudflareWorker): none. No Whitecardopedia file, worker, staged package or
  server touched; no request to any server (the Python tests drive Flask test clients over temp folders)
Hot files written (and the lock holder before you): devlog and ledger - W0-99 before (both at its recorded final
  SHA-1 when read; compare-and-swap at write); the PLAN - W0-06 before (7a8771f7 when read); the 101 placeholder
  files at the SHA-1 the W1 gate left (compare-and-swap per file; the hot ones in section 5). Next holder of the
  devlog and ledger: the next Parity Scribe pass (a Wave 1 continuation's, or W2-99)
```

Written 02-Oct-2026 by the W1-99 Parity Scribe, after the integrator's W1 gate (`gate_reports/W1.md`, PASS_WITH_NOTES,
02:13-02:45). Orchestrator corrections followed: OC-04 (G3 through the wrapper) and OC-05 (the sweep covers the WCP
`Server__ValeVision*.py` files, `server.py` and `execution/prepared/`).

## 1. What was done, in order

| Step | Action | Result |
|---|---|---|
| 0 | Brief, the PLAN's R5/R6/G7 and F.5.5, the 26 W1 Port Records, the gate report, `orchestrator_corrections.md`, the working memory | read |
| a | Fresh `git status` (`status_start.txt`, 3,072 lines) and a fresh read of the devlog top | top = v2.71.1 (W0-99's entry), AS EXPECTED - no surprise; devlog and ledger at W0-99's final SHA-1s (3b03fc28, 3db558ae), the PLAN at W0-06's (7a8771f7). Version allocated: **v2.71.2** (one per wave, the D85 patch step) |
| b | `resolve_vvrel.py` dry run, then `--apply`: pre-images and manifest first, compare-and-swap per file | 136 placeholders in 101 files -> `v2.71.2`, exactly that string (the PortNotes fingerprint blanks both forms, so the baseline stays "114 still as recorded, 25 since rewritten"); scanned 602 VV files, 7 WCP Flask files and 19 staged files - none in the Flask files, none in `execution/prepared/`, none in `03__Style__AppStylesheets/` or `index.html`; nothing refused |
| b' | Tests asserting a literal placeholder | none: only `Na__Test__TransportFacade__` names one (W0-12's, accepting either form since W0-99) and the verifiers build theirs at run time. G5 24/24 after the pass, so no follow-on edit |
| g | POSTPASS gates (the gate's own runners, `run_gates.py`, `run_g5.py`, `run_extras.py`, writing to `scratch/W1-99/`) | all green with the gate's counts; pending placeholders 136 -> 0; PortNotes `--scribe` PASS |
| d | End-of-Wave-1 port-order map (`make_pom_endW1.py`: W0-05's script on the working tree, writing only to scratch), `blocked_by_w1.py`, `importers.py` | the "Blocked by" and "Loaded by" values for the register |
| d | `update_ledger_w1.py` (candidate first, checks, compare-and-swap) | section 3 |
| e | `patch_plan.py` (candidate, undo proof, compare-and-swap) | section 4 |
| c | `write_devlog_w1.py` (candidate, checks, compare-and-swap) | section 2 |
| g | FINAL gates on the finished tree, and UiParity with `--block all` at the pin and at the working tree | counts identical to POSTPASS (the token warning now "predates 17 ValeVision release(s), newest v2.71.2"); `--block all` FAIL on [4] only |
| f | Final `git status` (`status_end.txt`, 3,314 lines) against the start; whole-app placeholder sweep (`vvrel_sweep.py`); `resolve_vvrel.py --check` again; each record against its candidate | no change outside `execution/scratch/` (+242 lines, all under scratch); sweep in section 5; check PASS; each live record equals its candidate byte for byte |

## 2. The devlog entry (ValeVision3D v2.71.2)

House format of F.5.5 in the voice of the v2.67-v2.71.1 entries: the `# ---` rule, `## ValeVision3D v2.71.2 -
02-Oct-2026 - <title>`, then `### Ported from TrueVision3D in part, read at b2aa9151:` naming all 59 releases and the
five unlogged changes, with Adam's confirmation in brackets. Sections: Overview (26 packages ran - 24 done, 2 partial -
and 12 did not; every DR on its default); the drawing tabs, veil and header fold (W1-31 to W1-34); keys stay with their
tab (W1-29, W1-30, W1-32); the toolbar (W1-35, DR-40 item 3); drawings data, saves and the document code (W1-05, W1-06,
W1-08, W1-10, W1-12); 3D and render fixes (W1-01 to W1-04, W1-11, W1-23, W1-24); inert groundwork (W1-09, W1-13 to
W1-18); Adapted for ValeVision; Not ported, and why (with THE SHARED SERVICE WORKER paragraph); Held, partial and not
run; TrueVision releases and what Adam has confirmed (DR-01 (c), in groups: confirmed, tried in part, not confirmed
per TV's own entry, not confirmed though DR-01's register counts them, no record either way, already in ValeVision,
names or citations only); Verified (fresh counts; NOT EXERCISED: the app by eye - Adam's Wave 1 checklist, audit
F.5.4, is deferred to the orchestrator's smoke test); Known, accepted; Files; "Not yet confirmed by Adam." Inserted
above v2.71.1 after the title; removing the block gives back the old file byte for byte (checked before the write).

Readings I took where package records disagreed with TrueVision's devlog at the pin:

- **v2.155.0.** W1-15 recorded it as Adam-confirmed. TV's "CONFIRMED by Adam in Chrome 23-Sep-2026" line covers the PDF
  exporter fix only (W1-24); Phase 0's moves, which give the QR folder its path here (W1-15), were "Adam's Option 2", a
  choice rather than a confirmed test. The entry names the fix confirmed and the moves not.
- **v2.81.0 to v2.84.0.** W1-31, W1-32 and W1-33 counted v2.83.0 as confirmed through DR-01's register reading
  (releases up to v2.85.0). TV's own entries say "Not yet signed off" / "Not yet confirmed"; the entry names the four
  NOT CONFIRMED and records the register's reading beside them.
- **v2.38.1** counts as fully ported by W1-03: SnapshotRenderer appears in that release only as its verification.

## 3. The ledger rows (within W0-06's structure; no history row rewritten)

- 1.4: the Wave 1 shared-service-worker bullet (the wave's decision above; W6-02's precache additions).
- 2.1 and 2.3: dated notes - folder 49 created at TrueVision's number; the nine Layout Editor subfolders Wave 1 created
  (LE/26, 27, 31, 32, 36, 37, 51, 53, 54; ValeVision now has 27 of TrueVision's 34); the app-root hatch library.
- 3: a dated note after W0-99's "Filled" note; **190 register rows rewritten**: **102 flipped** by the wave's work (the
  100 W1-touched files that have rows, plus "Loaded by" on LocalProjectMirror and the facade; old cells kept as
  `[was: ...]`; the TrueVision-only 3.5 rows that landed now name their ValeVision path "same path", source version,
  parity, seams, "Loaded by" and transport) and **88 with only "Blocked by" refreshed** from the end-of-Wave-1 map
  (`none` 118 -> 156, a list 216 -> 178, `-` 276; RenameDrawing, Invalidation and the door module left the map's
  closure and keep `none`). **New 3.8**: what each package changed (26 lines, plus Not run, Gate and W1-99) and the
  audit's records items for this wave (WP-S03a-10 and WP-S03b-12, ValeVision's half), each CLOSED or OPEN -
  SheetChrome 1.8.0 and LeaderGeometry 1.1.0 stay OPEN because W1-26 did not run.
- 4: an intro bullet and a count line; **64 rows**: 4 -> PORTED (v2.38.1, v2.83.0, v2.103.0, v2.124.0); 36 -> PARTIAL
  (28 from NOT-CONSIDERED; 6 from PENDING-SIGNOFF: v2.42.0, v2.49.0, v2.82.0, v2.86.0, v2.87.0, v2.107.0; 2 from
  REOPENED: v2.32.0, v2.71.0); 7 PARTIAL rows extended (v2.39.0, v2.84.0, v2.95.0, v2.115.0, v2.116.0, v2.146.0,
  v2.155.0); 17 keep their class with a dated note. After: PORTED 55, PARTIAL 52, PENDING-SIGNOFF 10, NOT-CONSIDERED
  44, REOPENED 2; open 108 (W0: 112). The Archive is byte-identical.
- 5.1: a dated note - Wave 1 also ran on every default, and the in-package choices it made.
- 6: a dated note on the lazy-loader row (aligned by W1-31); "Offers raised by Wave 1" (6 rows; none happens on DR-42's
  default).
- 7: "Added 02-Oct-2026" (19 rows queued for WT-08): TrueVision's halves of WP-S03a-10 (the three Selection-block
  labels, the dead `--spec` rule and SheetTabEditTitle, the Dev menu's NoSheets fallback and its PORT NOTE, the missing
  v2.155.0 ModeController log entry, LoadingVeil's Back-port line) and WP-S03b-12 (SheetSurface's ShowPublished log,
  PaintOrder's PORT NOTE, the SheetRecords fields of 29-Sep 55014c6a, TD04), and the TV-side notes Wave 1's records
  raised (the door README, Supersampler, the fog shader, the Dev menu sheet, RowAccordion and the modal, the elevation
  data description, b6baf301 / PdfExporter 1.4.0, the hatch module, LineStyleTool and GradientTool, QrCellNote, the 124
  files not yet ported).
- 8.1: a dated note on the facade's new callers (ProjectData, ProjectRecord, the Sheet Images source).

Checks on the candidate before the write: ASCII and pure CRLF; preamble and Archive byte-identical; every table row in
sections 1-8 has its header's column count and no bare `|` inside a cell; 610 register rows of 12, none with an empty
"Blocked by"; only the planned rows rewritten (190 register, 64 watermark, 1 section-6 row) and every other old line
present in order. Re-counted after the write, pre-image against the live file (`register_diff_stats.py`): the same 190
and 64.

## 4. The PLAN's dated notes (WP-S03a-10)

D22 (when the drawing tabs show), the drawings-block comment "the live site ignores it" and the matching settled item in
section 13 still described the split that v2.45.0 removed. Three dated notes stand beside the stale text (nothing
rewritten), each checked against the devlog's v2.45.0 entry ("One availability rule, everywhere"): since v2.45.0
(15-Sep-2026) one rule holds on localhost and on the live site alike - the project's Layout Mode switch on and at least
one sheet; D65 (DR-25 (a)) keeps the switch; since v2.71.2 the strip is TrueVision's TabStrip 2.0.0 (D78, W1-34).

## 5. Placeholders (brief step 4)

- **Resolved:** 136 in 101 files -> `v2.71.2`: 02__Src__AppModules 89 files / 122, 80__Testing__PrototypeEnvironment
  12 files / 14. Per package: W1-01 x8, W1-02 x2, W1-03 x4, W1-04 x3, W1-05 x3, W1-06 x9, W1-08 x6, W1-09 x6, W1-10 x5,
  W1-11 x2, W1-12 x5, W1-13 x10, W1-14 x7, W1-15 x6, W1-16 x7, W1-17 x1, W1-18 x2, W1-23 x14, W1-24 x2, W1-29 x3,
  W1-30 x1, W1-31 x5, W1-32 x4, W1-33 x10, W1-34 x8, W1-35 x3 - the gate's pending list exactly. All inside comments
  (`token_context.py`, `html_comment_check.py`).
- **Proof:** `resolve_vvrel.py --check` on the final tree - "files checked: 101; placeholders left in scope: 0 / CHECK
  PASS" (each file differs from its pre-image only at the tokens, line endings and BOM kept); Na__Verify__PortNotes__
  `--scribe` PASS, 0 pending.
- **Whole-app sweep** (`vvrel_sweep.py`: every text file of the app outside the evidence folder, plus the WCP Flask files
  and `execution/prepared/`; 1,307 files): 13 occurrences, none in code -
  - 10 in the AUDIT report (orchestrator-owned): the rule's quotations and W1-33's brief text (:5665) - rule text;
  - 2 in the PLAN (:200, R5; :216, G7) - rule text, exempt;
  - **1 real leftover:** `04__Lib__ThirdParty__VersionLocked/Vale__Dependencies__VersionLock__README__.md:62` carries
    W0-16's placeholder (Wave 0). OC-05's tool resolved W0-99's six Flask leftovers to v2.71.1 (they read v2.71.1
    today) but not this one. It should read v2.71.1; the folder is outside this pass's scope and G4 does not scan
    it, so it is left for the orchestrator (issue 1).
- **Hot files the pass changed** (comment bytes only; each 15-byte token became the 7-byte `v2.71.2`). Any package that
  recorded one of these files' hashes before 02:41 on 02-Oct-2026 must re-read it at its turn:

| File (02__Src__AppModules/ unless shown) | SHA-1 before -> after | Bytes | Named next holder |
|---|---|---|---|
| 51/01__Core__Loader/Na__LayoutEditor__Loader__.js | 0ae79ea4 -> 14c6e3f7 | 64,517 -> 64,469 | - |
| 51/01__Core__Loader/Na__LayoutEditor__LoadingScreen__.js | 9406389c -> d36ea562 | 17,954 -> 17,922 | - |
| 51/01__Core__Loader/Na__LayoutEditor__Styles__Boot__.css | cb6bfc03 -> 70bddfb3 | 17,170 -> 17,154 | - |
| 51/05__Core__ModeController/Na__LayoutEditor__ModeController__.js | 38618bde -> 87616834 | 77,988 -> 77,940 | - |
| 51/05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js | 286a5a4e -> 10210f36 | 26,405 -> 26,397 | - |
| 51/05__Core__ModeController/Na__LayoutEditor__TabStrip__.js | c2ccc9f9 -> c93b1e3c | 44,713 -> 44,705 | - |
| 51/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css | 70fe7384 -> 4b0fe80f | 14,154 -> 14,146 | - |
| 51/15__Core__Markup/Na__LayoutEditor__ShapeRings__.js | f7901e68 -> 0efd6f49 | 20,165 -> 20,157 | - |
| 51/31__System__DocumentKeys/Na__LayoutEditor__DocumentKeys__.js | 5c1c4d93 -> bba3485e | 21,046 -> 21,038 | - |
| 51/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js | 550db24f -> 7e392b41 | 25,061 -> 25,045 | W2-19 (W1-35 F4 names 550db24f) |
| 51/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js | c2b6a594 -> ed4ba0ea | 25,122 -> 25,090 | W1-25 (W1-24 F4 names sha256 d1b5385e70f1387c; now 2994ac15df76ef5e) |
| 01__AppCore/Na__AppFlow__LoadingSequence.js | c2fd39de -> 515a3543 | 118,655 -> 118,639 | - |
| 03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js | 0bad5770 -> f6669df4 | 14,346 -> 14,330 | - |
| 03__AppUtils/Na__AppUtils__KeyScope__.js | 4cc3e884 -> 89d0ba8a | 14,165 -> 14,157 | - |
| 40__System__DrawingViewCore/Na__DrawView__ProjectData__.js | 6d45915b -> f6a56e3c | 68,237 -> 68,221 | - |
| 42__System__FloorPlanViews/Na__FloorPlan__ModeController__.js | 6b84a00b -> f98ec64a | 40,221 -> 40,213 | - |
| 45__System__ElevationViews/Na__Elevation__ModeController__.js | b130d4ae -> 5412b538 | 44,820 -> 44,812 | - |
| 80__Testing__PrototypeEnvironment/Na__Test__LoaderFacade__.test.mjs | d5fc90c5 -> 8b5c6a24 | 75,098 -> 75,082 | - |
| 80__Testing__PrototypeEnvironment/Na__Test__AppConfigParity__.test.mjs | 46ee9ef0 -> 58014790 | 27,435 -> 27,427 | - |
| 80__Testing__PrototypeEnvironment/Na__Test__DocumentKeys__.test.mjs | 89085a3f -> abf1a742 | 39,634 -> 39,626 | - |

The full list of 101 files, with line endings: `scratch/W1-99/placeholders_resolved.txt`; before and after hashes and
sizes: `scratch/W1-99/preimage_manifest.json`.

## 6. Acceptance items

| # | Item | Result |
|---|---|---|
| 1 | Every W1 Port Record has a devlog entry naming its TV releases and flagging those Adam has not confirmed (DR-01) | **PASS** - one entry for the wave, v2.71.2; all 26 packages that ran are covered with their releases; every release's confirmation is named in the entry's DR-01 (c) section; W1-17's held stylesheet and the twelve packages that did not run are named |
| 2 | Module Register and Release Watermark rows flipped | **PASS** - 102 register rows flipped, 88 "Blocked by" refreshed, new 3.8; 64 watermark rows (4 PORTED, 36 PARTIAL, 7 PARTIAL extended, 17 notes) |
| 3 | Zero release placeholders remain (G4) | **PASS** in scope - 0 (`--check` and `--scribe`); one Wave 0 leftover outside the scope reported (section 5, issue 1) |
| 4 | The SHARED SERVICE WORKER decision recorded | **PASS** - the devlog's "Not ported, and why" and ledger 1.4 |
| 5 | Harness counts in the devlog entry come from a fresh run | **PASS** - the FINAL run after every write; the entry's counts equal it |
| 6 | WP-S03a-10 (ValeVision's half) and WP-S03b-12 rows corrected; TrueVision-side notes queued for WT-08 | **PASS** - ledger 3.8 lists each item CLOSED or OPEN (SheetChrome and LeaderGeometry OPEN: W1-26 did not run); the PLAN's D22 notes; ledger 7 queues TrueVision's halves |
| 7 | G1 and G2 re-run on the final tree with counts recorded; the G4 port-note verifier shows zero placeholders | **PASS** - G1 527 / 0, G2 459 PASS; PortNotes 0 pending, `--scribe` PASS |
| - | UiParity with every check blocking (the verifier's rule "--block all from W1-99 on") | **FAIL on [4] panels only** (TrueVision 678 entries, here 584): its owner W1-38 did not run. Not this pass's to fix; the wave's exit condition is not met until W1-38 lands (issue 2) |
| - | Adam's smoke test (F.5.4 W1) | **DEFERRED to the orchestrator's smoke test** (listed in the entry's Verified section) |
| - | Adam commits | DEFERRED - the orchestrator's checkpoint stands in (policy 1) |

## 7. Issues for the orchestrator

1. **W0 leftover placeholder:** `WebApps/ValeVision3D/04__Lib__ThirdParty__VersionLocked/Vale__Dependencies__VersionLock__README__.md:62`
   still carries W0-16's placeholder; it should read v2.71.1. Outside this pass's scope and G4's; OC-05's tool covered
   only the Flask files. One token, byte-level, before the wave's commit.
2. **Wave-exit blocker:** UiParity `--block all` fails on [4] panels until W1-38 runs; with `--block 1,2,3` it passes,
   and G1-G5 are green.
3. **Twelve packages did not run** (W1-07, W1-19, W1-20, W1-21, W1-22, W1-25, W1-26, W1-27, W1-28, W1-36, W1-37,
   W1-38). The interim states are in the entry's Known, accepted: no Save Sheets success toast (W1-21); Page Up and
   Page Down inert on a drawing tab (W1-36); ScaleManager names 1:200 while the list lacks it (W1-22); the Properties
   hint needs PanelHost (W1-38). A continuation's scribe allocates v2.71.3.
4. **W1-17 PARTIAL:** before W2-29 is dispatched, move `LE/36 Na__LayoutEditor__Styles__Patterns__.css` from W1-17 to
   W2-29 and rule on its Source version line (a `- Legacy :` field) - W1-17 F1.
5. **Before v2.71.2 goes to the live site:** in the read-only web viewer the first drawing of a session fills in
   uncovered until W4-09 (the first-open veil is skipped in the viewer, as in TrueVision). A one-line seam until W4-09,
   or hold the live deploy (W1-33 section 1.1). Localhost is unaffected.
6. **Gaps with no owning package:** TrueVision's Fly controls 1.0.1 release of the render loop (W1-04 F2: after one
   flight the loop keeps drawing every frame); the specification's document number still uses the `?project=` token
   (W1-12 F1: SpecPdf :159, SpecDocument :162, the specification bar :209); the floor plans' exclusion-token trim
   against the elevations' as-typed tokens (W1-10 F3, for W2-05).
7. **`ValeVision__NOTES__FolderNumberRegistry__.md`** still shows "-" in ValeVision's column for the folders Wave 1
   created (49__System__ElevationDepthFog; LE/26, 27, 31, 32, 36, 37, 51, 53, 54), and some "VV gains it with ..."
   notes name later packages. ParityNaming passes (the classes are right); no scribe lists the file (W0-06 done,
   WT-08 held).
8. **Confirmation readings** that differ from package records (section 2): W1-15 on v2.155.0's Phase 0; W1-31, W1-32
   and W1-33 on v2.83.0 (and v2.81.0-v2.84.0). The devlog follows TrueVision's own entries.
9. **JSON provenance lines** of the Sheet Images config, the hatch library index and the QR config name their package,
   not v2.71.2 (JSON carries no placeholder); recorded in the entry.
10. **Hot-file hashes changed by this pass** (section 5): W2-19's Toolbar lock and W1-25's PdfExporter lock, as named
    in W1-35 and W1-24, no longer match; every unrun package re-reads its files.
11. **Records hygiene for the next owners:** `Na__North__ConfigState__.js`'s PORT NOTE Parity line still says the config
    does not carry ShownByDefault (W1-11); `Na__Test__AppConfigParity__`'s allow-list row for `Panels/FocusNote` still
    names W1-32 as the next owner (W1-32: W2-16, W2-29, W3-09, W3-10); Navigation :30 (W1-36) and Eyedropper :695
    (W2-21) carry comments v2.124.0 made stale (W1-35).
12. **Browser checks:** the gate's real-browser link check of the 86 touched modules and its app boot ran before this
    comment-only pass and were not re-run; G1 and G2 re-ran green on the final tree.
13. **Temp folders:** 19 `na-drafts-*` folders in the OS temp folder (01-Oct 23:27 to 02-Oct 00:10) from drafts-test
    runs while AutoNameText was missing; none from this pass. Safe to delete.
14. **Orchestrator-owned records:** `execution_state.json` and the working memory still show Wave 1 as running.

## 8. Follow-ups for Adam

1. Read the v2.71.2 entry at the top of `ValeVision__DEVLOG__.md`; relabel before committing if you prefer another step
   (D85).
2. TrueVision releases ported but not confirmed by you in TrueVision are named in the entry (DR-01 (c)).
3. Run the Wave 1 checklist (audit F.5.4) after the orchestrator's smoke test. It needs a project with Layout Mode on
   and sheets (3047__Doous has neither): the cold first press and the veil, the strip and the Drawings menu, the 3D
   keys on a drawing tab, the slimmed toolbar, a door click, the fascia lines gone from an elevation, Show Compass, and
   a PDF of "Elevations Test".
4. Decide the live-site viewer question (issue 5) before deploying; deploy only with the consolidated service-worker
   bump (the prepared W0-08 package plus one shell-token bump, or a full bump).
5. Questions the packages left for you: TrueVision's strict PDF mode treats a deliberately empty 3D frame as a failure
   (W1-24, worth a word in TrueVision); Command+S on the Specification on a Mac is the browser's, in TrueVision as here
   (W1-30); ReturnToOrbit kept TrueVision's body, proven equivalent to the planned seam (W1-04); TrueVision's project
   names in the fog shader's and the auto-name modules' comments, kept verbatim (W1-09, W1-10; DR-43); the Sheet
   Images frame keeps TrueVision's bronze `#555041`, while the Vale title-block ink is `#172b3a` (W1-16, DR-13); the
   MarginNotes description now TrueVision's (W1-35).
6. Commit from the wave's path list only, never `git add -A` at the repository root; keep `execution/scratch/` (it
   holds TrueVision text) out of any commit.

## 9. Files written

- Records: `ValeVision__DEVLOG__.md`, `ValeVision__PARITY__TrueVisionLedger__.md`,
  `ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md`.
- Placeholders: 101 files (89 under 02__Src__AppModules, 12 under 80__Testing__PrototypeEnvironment); list in
  `scratch/W1-99/placeholders_resolved.txt`, hashes in `scratch/W1-99/preimage_manifest.json`.
- This Port Record.
- Scratch (`execution/scratch/W1-99/`): the scripts (`resolve_vvrel.py`, `update_ledger_w1.py`, `patch_plan.py`,
  `write_devlog_w1.py` with `devlog_entry_w1.txt`, `make_pom_endW1.py` and `pom/`, `blocked_by_w1.py`, `importers.py`,
  `w1_files.py`, `wm_rows.py`, `release_files.py`, `tv_devlog_section.py`, `portnote_fields.py`, the gate runners, the
  read-only checks `vvrel_sweep.py`, `final_hashes.py`, `register_diff_stats.py`, `token_context.py`,
  `html_comment_check.py`, `hot_files_now.py`, `wcp_release_lines.py`, `placeholders_list.py`, `status_diff.py`), the
  pre-images (`preimage/`, `preimage_records/`), the three candidates, the gate outputs (`POSTPASS__*`, `FINAL__*`,
  `G5__*`) and the status snapshots. Nothing written outside the app's records, the 101 files, this record and scratch.
- Restores (run in `scratch/W1-99/`, newest first; each refuses if its file changed since):
  `python -B write_devlog_w1.py --restore`, `python -B patch_plan.py --restore`, `python -B update_ledger_w1.py
  --restore`, `python -B resolve_vvrel.py --restore`.
