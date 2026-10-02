# Port Record - W1-99: Parity Scribe pass for Wave 1

> This file holds both Wave 1 scribe passes. **PART 2** (the Wave 1 continuation, ValeVision3D v2.71.3, 02-Oct-2026
> 09:44-10:30) comes first and is current. **PART 1** (the pass of 02-Oct-2026 02:37-03:28 that released v2.71.2)
> follows below the rule, byte for byte as it was written; where the two differ, PART 2 is current.

---

## PART 2 - the Wave 1 continuation pass (ValeVision3D v2.71.3)

```
WP: W1-99   TV commit read: b2aa9151 (git show of TrueVision's devlog at the pin, read-only, to check the entries of
            v2.39.0, v2.71.0, v2.81.0, v2.109.0, v2.133.0, v2.135.0, v2.145.0 and v2.146.0 before flipping their rows,
            and every heading's date; TrueVision not edited, its working tree not read)
            TV releases covered: none ported by this pass. It records the continuation's releases in the devlog entry
            ValeVision3D v2.71.3: 66 TrueVision releases and eight changes TrueVision never logged (Adam-confirmed in
            TV: none; v2.49.0, v2.104.0, v2.116.0 and v2.150.0 tried by him in part - the entry names every one, DR-01 (c))
Files:
  - VV ValeVision__DEVLOG__.md  <- no TV source   the continuation's entry "ValeVision3D v2.71.3 - 02-Oct-2026 - A
      Drawing's Number Becomes Its Document ID, Every PDF Carries Open Sans, the Layers List Is the Paint Order, and Page
      Down Turns the Drawing" at the top, above v2.71.2 (289 lines, ASCII; the file stays pure CRLF); 718,158 -> 745,972
      bytes; sha1 457c1489 -> f627b250
  - VV ValeVision__PARITY__TrueVisionLedger__.md  <- no TV source   the continuation's rows within W0-06's structure
      (1.4, 2.1, 2.3, 3 incl. new 3.9, 4, 5.1, 6, 7, 8.1); preamble and Archive byte-identical; ASCII, CRLF;
      605,750 -> 682,299 bytes; sha1 dbf77e3a -> 14eb54a3
  - VV ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md: NOT written in this pass (e9531a8c, as part 1 left it):
      WP-S03a-10's PLAN items closed in part 1, and nothing the continuation landed made a PLAN line stale that the
      audit's records packages name (the D-rows' later states live in the ledger's 5.2)
  - VV 68 files (56 under 02__Src__AppModules, 12 under 80__Testing__PrototypeEnvironment): 80 release placeholders
      -> v2.71.3 (brief step 4). Every one sat inside a comment (module logs and PORT NOTEs; one inside an HTML
      comment of a test page). Only the token bytes changed; line endings, BOMs and every other byte kept
    seams re-applied: none     record keys / config keys added: none     importer updates: none
Not ported (and why): nothing to port (a records pass)
Tests (fresh, final tree, after every write): Na__Verify__ModuleGraph__ 554 modules / 0 failures (110 import targets,
  the 1 documented vendor issue); Na__Verify__Exports__ 470 files PASS (38 loader-facade names); path gate PASS through
  the records-exempt wrapper, OC-04 (0 fail, 1 baseline warn; raw: 55, all in the AUDIT report); Na__Verify__ParityNaming__
  0 fail / 0 warn; Na__Verify__PortNotes__ 597 files, 370 PORT NOTEs, 468 logs, 0 fail / 123 warn / 0 pending, --scribe
  PASS; Na__Verify__UiParity__ report 0 of 7 fail ([7] token WARN: 18 releases, newest v2.71.3), --block 1,2,3 PASS and
  --block all PASS; G5 33/33 exit 0; verifier self-tests 19, 16, 19 and 4 cases PASS; Na__Test__AppConfigParity__
  --strict PASS (66 differences, all listed); the W0-07, W0-08 and W0-10 patches still apply (--check)
New or renamed cross-module exports: no
SHARED SERVICE WORKER: this pass adds 0 modules and no export; bump needed: no (comment bytes and records only). The
  CONTINUATION's decision is recorded in the devlog entry ("Not ported, and why") and ledger 1.4: 11 new modules, 18
  modules that landed inert earlier now linked (G1 527 -> 554), exports added to 17 existing modules (the facade +32,
  SheetRecords +11, Layers +7, the Sheets unit +7 ...), and three mixed-cache hazards that break or mislead the editor -
  bump needed: yes, once at deploy, the same consolidated W0/W1 bump (the prepared W0-08 package applied plus one
  shell-token bump, or a full bump); W6-02's precache additions named. Token not bumped ('2026-09-18-1'); Adam's call
  (DR-07).
Transport touched (WCP server.py / CloudflareWorker): none. No Whitecardopedia file, worker, staged package or
  server touched; no request to any server (the Python tests drive Flask test clients over temp folders)
Hot files written (and the lock holder before you): devlog and ledger - W1-99 part 1 before (both at its recorded
  final SHA-1 when read; compare-and-swap at write); 14 hot files among the 68 placeholder files, each at the SHA-1 the
  continuation gate attested (compare-and-swap per file; section 5). Next holder of the devlog and ledger: W2-99
```

Written 02-Oct-2026 by the W1-99 Parity Scribe for the Wave 1 continuation (workflow run wf_2aeb57ef-e2a), after the
integrator's continuation gate (`gate_reports/W1.md` PART 2, PASS_WITH_NOTES, 09:17-09:42). Orchestrator corrections
followed: OC-04 (G3 through the wrapper), OC-05 (the sweep covers the WCP Flask files and `execution/prepared/`), OC-10
(the continuation's scribe allocates the next patch version). Scratch: `execution/scratch/W1-99/C2/` (part 1's scratch
in `execution/scratch/W1-99/` untouched).

### 1. What was done, in order

| Step | Action | Result |
|---|---|---|
| 0 | Brief, R6 F.5.5, the twelve continuation Port Records (W1-07, W1-19, W1-20, W1-21, W1-22, W1-25, W1-26, W1-27, W1-28, W1-36, W1-37, W1-38), the gate report (both parts), `orchestrator_corrections.md`, the working memory, part 1's record and scripts | read |
| a | Fresh `git status` (`C2/status_start.txt`, 5,025 lines; equal to the gate's final snapshot outside scratch) and a fresh read of the devlog top | top = v2.71.2 (part 1's entry), AS EXPECTED - no surprise; devlog, ledger and PLAN at part 1's final SHA-1s (457c1489, dbf77e3a, e9531a8c). Version allocated: **v2.71.3** (the next patch step, D85; OC-10) |
| b | `C2/resolve_vvrel_c2.py` dry run (scope widened to the brief's list: 04, 01, 50, 51, 52 app-root folders, index.html, the WCP Flask files, `execution/prepared/`), `C2/token_context_c2.py` (every token inside a comment), then `--apply`: pre-images and manifest first, compare-and-swap per file | 80 placeholders in 68 files -> `v2.71.3`, the gate's list exactly (W1-07 x3, W1-19 x3, W1-20 x10, W1-21 x6, W1-22 x8, W1-25 x6, W1-26 x11, W1-27 x6, W1-28 x10, W1-36 x9, W1-37 x5, W1-38 x3); scanned 1,253 VV files, 7 WCP Flask files and 19 staged files - none in the Flask files, `execution/prepared/`, the stylesheets folder, index.html or the app-root content folders; nothing refused |
| b' | Tests asserting a literal placeholder | none: only `Na__Test__TransportFacade__` names one (W0-12's, accepting either form) and the verifiers build theirs at run time; G5 33/33 after the pass, so no follow-on edit |
| g | POSTPASS gates (the gate's runners copied to `C2/`: `run_gates.py`, `run_g5.py`, `run_extras.py` with `--block all`) and PortNotes `--scribe` | all green with the gate's counts; pending placeholders 80 -> 0 |
| d | End-of-continuation port-order map (`C2/make_pom_endW1c.py`: part 1's working-tree copy of W0-05's script, writing only to `C2/pom/`), `C2/blocked_by_w1c.py`, `C2/rows_c2.py`, `C2/loaded_by_diff_c2.py`, `C2/release_files_c2.py`, `C2/portnote_fields_c2.py`, `C2/tv_release_dates.py` | the "Blocked by", "Loaded by" and source-version values for the register; each touched release's files and state |
| d | `C2/update_ledger_w1c.py` (candidate first, checks, compare-and-swap) | section 3 |
| c | `C2/write_devlog_w1c.py` (fresh-read rule, candidate, undo proof, compare-and-swap) | section 2 |
| g | FINAL gates on the finished tree | counts identical to POSTPASS (the token warning now "predates 18 ValeVision release(s), newest v2.71.3") |
| f | Final `git status` (`C2/status_end.txt`) against the start; whole-app placeholder sweep (part 1's `vvrel_sweep.py`); `resolve_vvrel_c2.py --check` again; `C2/register_diff_stats_c2.py` | no change outside `execution/scratch/` (+215 lines, all under scratch); sweep in section 5; check PASS; ledger ASCII, pure CRLF, preamble and Archive identical |

### 2. The devlog entry (ValeVision3D v2.71.3)

House format of F.5.5 in the voice of the v2.71.1 and v2.71.2 entries: the `# ---` rule, `## ValeVision3D v2.71.3 -
02-Oct-2026 - <title>`, then `### Ported from TrueVision3D in part, read at b2aa9151:` naming all 66 releases and the
eight changes TrueVision never logged, with Adam's confirmation in brackets. Sections: Overview (12 packages ran - 11
done, 1 partial; every DR on its default); the sheet records and the sheet model (W1-19, W1-20, W1-21); the title block,
Document ID and 1:200 (W1-22, W1-26); Open Sans in every PDF (W1-25, W1-26); the Layers list as the paint order (W1-28);
paging, the keyboard and the zoom (W1-36); drafts, the colour palette and the panels (W1-07, W1-37, W1-38); inert
groundwork (W1-27); Adapted for ValeVision; Not ported, and why (with THE SHARED SERVICE WORKER paragraph); Held,
partial and not run; TrueVision releases and what Adam has confirmed (DR-01 (c), in groups: confirmed - none; tried in
part; not confirmed per TrueVision's own entry; no record either way, with the eight unlogged changes; headers only);
Verified (the FINAL counts; NOT EXERCISED: the app by eye - deferred to the orchestrator's smoke test); Known, accepted;
Files; "Not yet confirmed by Adam." Inserted above v2.71.2 after the title; removing the block gives back the old file
byte for byte (checked before the write).

Readings I took where records and TrueVision's devlog needed a decision:

- **The sheet PDF's file name.** The gate (item 4.2) calls the `fields.DocumentId` file name an unlogged change of
  commit 32767407. TrueVision's own v2.71.0 entry names it ("`Na__LePdf__Filename` names exports after
  `fields.DocumentId`"); it is unlogged only in the exporter's module log. The entry and the ledger say both, and keep
  v2.71.0 PARTIAL because of it.
- **v2.155.0.** W1-26 records the ScaleCell page's jsPDF path (Phase 0's move) as "CONFIRMED by Adam 23-Sep". As in part
  1, TrueVision's confirmation line covers the PDF exporter fix only; the entry names the continuation's v2.155.0 parts
  (ShowPublished, the page's path) as not confirmed.
- **v2.104.0** goes under "tried by Adam in part": W1-27 records that his notes drove four later releases while
  TrueVision's floor area plan keeps its ValeVision phase open until he signs Floor Areas off.
- **Class flips to PORTED** (six): v2.39.0 (every app file in; the sync tools' editor-owned keys are W0-07's staged fix),
  v2.81.0 (every app file in, switched off; the q/ resolver is Noble Architecture's site and never ported - a Vale
  resolver and the switch-on are W5-05's, held), v2.133.0, v2.135.0, v2.145.0 and v2.146.0 (R2 judging stays off in
  both apps). v2.109.0 stays PARTIAL (its Portal block size is W2-38's); v2.71.0 stays PARTIAL (the file name; the
  register).

### 3. The ledger rows (within W0-06's structure; no history row rewritten)

- 1.4: the continuation's shared-service-worker bullet (the decision above; W6-02's precache additions).
- 2.1 and 2.3: dated notes - folder 54 created at TrueVision's number (the palette, live); LE/59 created (ValeVision now
  has 28 of TrueVision's 34 Layout Editor subfolders; 7 to come: 21, 28, 33, 52, 58, 65, 66).
- 3: a dated note after part 1's "Refreshed" note; **130 register rows rewritten**: **77 by the packages' work** (the 59
  rows of the 60 continuation-touched files under `02__Src__AppModules` that have one - the Fly controls have none - plus
  the 18 modules landed in part 1 that the continuation linked, whose "Loaded by" and parity now say so; old cells kept
  as `[was: ...]`; the TrueVision-only 3.5 rows that landed now name their ValeVision path, source version, parity,
  seams, "Loaded by" and transport) and **53 with only "Blocked by" refreshed** from the end-of-continuation map (`none`
  156 -> 186, a list 178 -> 148, `-` 276; the three modules that left the closure in part 1 keep `none`). 3.8: two
  dated notes (the "Not run" row; the SheetChrome / LeaderGeometry records item, CLOSED). **New 3.9**: what each package
  changed (12 lines, plus Gate and W1-99) and the audit's records items for the continuation (WP-S03b-12, ValeVision's
  half): SheetChrome and LeaderGeometry CLOSED; History's log now TrueVision's own (Legacy marker, queued for WT-08);
  every S03b file pair has its row and state.
- 4: an intro bullet and a count line; **64 rows**: 6 -> PORTED (v2.39.0, v2.81.0 from PARTIAL; v2.133.0, v2.135.0 from
  NOT-CONSIDERED; v2.145.0, v2.146.0 from PARTIAL); 16 -> PARTIAL (11 from NOT-CONSIDERED: v2.100.0, v2.104.0, v2.109.0,
  v2.123.0, v2.125.0, v2.127.0, v2.137.0, v2.140.0, v2.141.0, v2.142.0, v2.154.0; 4 from PENDING-SIGNOFF: v2.38.0,
  v2.41.0, v2.48.0, v2.111.0; 1 from REOPENED: v2.69.0); 30 PARTIAL rows extended (the unnumbered eyedropper row among
  them); 12 keep their class with a dated note. After: PORTED 61, PARTIAL 64, PENDING-SIGNOFF 6, NOT-CONSIDERED 31,
  REOPENED 1; open 102 (after part 1: 108). The newest fully ported release is v2.146.0; the low-water stays v2.28.0.
  The Archive is byte-identical.
- 5.1: a dated note - the continuation also ran on every default, DR-40 items 4 and 6 came in, 7-10 stay held, and the
  in-package choices for Adam's eye.
- 6: a dated note on the dimension-split row (the Plan Annotations toolbar carries the same seam, W1-37); "Offers raised
  by the Wave 1 continuation" (2 rows: the logo text key, WT-11 item 9; a draft-guard test case); none happens on
  DR-42's default.
- 7: dated notes on two of part 1's rows (the QrCellNote now reworded here; the 124-file row); "Added ... for the
  continuation" (11 rows queued for WT-08): the SheetRecords, units, Common, History, facade, AutoSave and test log
  gaps; LeaderGeometry 1.2.0 and MarkupBridge 1.13.0 with no heading and MarkupBridge's repeated 1.12.0; the exporter's
  unlogged file-name line; the Floor Areas and palette PORT NOTEs and the floor area plan's phase 9; PanelHost's slider
  box and the panels' mid-edit "40%" reading (code, WT-04); the unnamed commits for the one TV devlog records note.
- 8.1: a dated note on the facade's new caller (the Sheets unit's register-block check) and the specification's
  document code.

Checks on the candidate before the write (`update_ledger_w1c.py`): ASCII and pure CRLF; preamble and Archive
byte-identical; every table row in sections 1-8 has its header's column count and no bare `|` inside a cell; 610
register rows of 12, none with an empty "Blocked by"; every old non-table line present in order (the one extended line
as a prefix); expected class-flip counts asserted; 177 watermark rows counted. Re-counted after the write, pre-image
against the live file (`register_diff_stats_c2.py`): the same 130 and 64.

### 4. The PLAN

Not written. Part 1 closed WP-S03a-10's PLAN items (three dated notes beside D22). The continuation's landings change
D-rows the ledger's 5.2 already marks with their packages (D27 by D57 1:200, W1-22; D31 by the paint order, W1-28; D32
by PanelHost 1.6.0, W1-38; D35 by PdfFonts, W1-25) - the PLAN's own D-rows keep their 09-Sep text, as W0-01 left them,
and any answer or later state goes into the ledger (D75). The file stays at e9531a8c.

### 5. Placeholders (brief step 4)

- **Resolved:** 80 in 68 files -> `v2.71.3`: 02__Src__AppModules 56 files / 66, 80__Testing__PrototypeEnvironment 12
  files / 14. All inside comments (`C2/token_context.txt`: 80 of 80 "COMMENT").
- **Proof:** `resolve_vvrel_c2.py --check` on the final tree - "files checked: 68; placeholders left in scope: 0 / CHECK
  PASS" (each file differs from its pre-image only at the tokens, line endings and BOM kept); Na__Verify__PortNotes__
  `--scribe` PASS, 0 pending.
- **Whole-app sweep** (part 1's `vvrel_sweep.py`: every text file of the app outside the evidence folder, plus the WCP
  Flask files and `execution/prepared/`; 1,332 files): 12 occurrences, none in code - 10 in the AUDIT report
  (orchestrator-owned rule text, W1-33's brief at :5665 included) and the PLAN's two rule quotations (:200, :216;
  exempt). The Wave 0 leftover part 1 reported (`04__Lib__ThirdParty__VersionLocked/...README__.md:62`) is gone (the
  orchestrator's fix, 03:31). The held `Na__Test__DrawingTabKeys__` copy in `execution/scratch/W1-36/out/` keeps its
  W1-36 placeholder for the package that lands it (outside the tree, as the gate asked).
- **Hot files the pass changed** (comment bytes only; each 15-byte token became the 7-byte `v2.71.3`). Any package that
  recorded one of these files' hashes before 09:48 on 02-Oct-2026 must re-read it at its turn:

| File (02__Src__AppModules/51__System__LayoutEditor/ unless shown) | SHA-1 before -> after | Bytes | Later editors (hot_file_ownership) |
|---|---|---|---|
| 01__Core__Loader/Na__LayoutEditor__Loader__.js | 0a390e66 -> 5b59c8bb | 67,488 -> 67,472 | W2-19 first |
| 03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js | c6739f68 -> c43667c3 | 39,300 -> 39,284 | - |
| 05__Core__ModeController/Na__LayoutEditor__ModeController__.js | 26a24216 -> 3105a133 | 82,885 -> 82,869 | W2-19 first |
| 07__Core__SheetData/Na__LayoutEditor__AutoSave__.js | 037e6cce -> 92b51dfa | 39,256 -> 39,248 | - |
| 07__Core__SheetData/Na__LayoutEditor__History__.js | b5786aa7 -> fb06f32d | 20,690 -> 20,682 | - |
| 07__Core__SheetData/Na__LayoutEditor__SheetModel__.js | c795e861 -> be1bcfcc | 47,943 -> 47,935 | W4-07 |
| 07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js | f98593fb -> c25ddd0f | 115,459 -> 115,451 | - |
| 10__Core__SheetSurface/Na__LayoutEditor__Controls__Pc__.js | 9e123697 -> f332d636 | 30,350 -> 30,342 | - |
| 10__Core__SheetSurface/Na__LayoutEditor__Controls__TouchScreen__.js | 5ec2690c -> f2e3f4ac | 17,548 -> 17,540 | - |
| 10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css | 6a923cd2 -> a3bbf983 | 31,088 -> 31,080 | W2-20 first |
| 15__Core__Markup/Na__LayoutEditor__MarkupBridge__.js | e9a5992a -> 01fd4c5a | 63,257 -> 63,249 | - |
| 50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js | b4cc24b3 -> 1460d447 | 25,670 -> 25,662 | - |
| 60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js | 4d103048 -> 04c18aae | 28,251 -> 28,219 | W3-16 |
| VV/80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.test.mjs | 06883696 -> 13c22e23 | 20,303 -> 20,287 | - |

Also changed, not in hot_file_ownership: `80__Testing__PrototypeEnvironment/Na__Test__AppConfigParity__.test.mjs`
11131bb5 -> b604ba39 (the gate's FIX-C1 bytes; its `apply_gate_fixes_c2.py --restore` now refuses until this pass is
restored first). Every package restore script of the continuation refuses the same way for its files: run
`python -B execution/scratch/W1-99/C2/resolve_vvrel_c2.py --restore` first. The full list of 68 files with line
endings, before and after hashes and sizes: `C2/preimage_manifest.json` (dry run in `C2/resolve_dryrun.txt`).

### 6. Acceptance items

| # | Item | Result |
|---|---|---|
| 1 | Every W1 Port Record has a devlog entry naming its TV releases and flagging those Adam has not confirmed (DR-01) | **PASS** - part 1's 26 packages in v2.71.2 and the continuation's 12 in v2.71.3; every release's confirmation is named in the entry's DR-01 (c) section, with the eight unlogged changes |
| 2 | Module Register and Release Watermark rows flipped | **PASS** - 130 register rows (77 by the packages' work, 53 "Blocked by" only), new 3.9; 64 watermark rows (6 PORTED, 16 PARTIAL, 30 PARTIAL extended, 12 notes) |
| 3 | Zero release placeholders remain (G4) | **PASS** - 0 in scope (`--check` and `--scribe`); the whole-app sweep finds only rule text in the AUDIT report and the PLAN |
| 4 | The SHARED SERVICE WORKER decision recorded | **PASS** - the devlog's "Not ported, and why" and ledger 1.4 |
| 5 | Harness counts in the devlog entry come from a fresh run | **PASS** - the FINAL run after every write; its counts equal POSTPASS's and the entry's |
| 6 | WP-S03a-10 (ValeVision's half) and WP-S03b-12 rows corrected; TrueVision-side notes queued for WT-08 | **PASS** - 3.8's dated notes and 3.9's records items (SheetChrome and LeaderGeometry CLOSED; History's log now TrueVision's); ledger 7 queues the continuation's TrueVision-side notes |
| 7 | G1 and G2 re-run on the final tree with counts recorded; the G4 port-note verifier shows zero placeholders | **PASS** - G1 554 / 0, G2 470 PASS; PortNotes 0 pending, `--scribe` PASS |
| - | UiParity with every check blocking (the verifier's rule "--block all from W1-99 on") | **PASS** - 0 of 7 fail ([4] panels passes since W1-38); part 1's one red is gone |
| - | Adam's smoke test (F.5.4 W1) and his approval of the visible changes (Document ID, Open Sans, the toolbar, the paint order) | **DEFERRED to the orchestrator's smoke test** (listed in the entry's Verified section) |
| - | Adam commits | DEFERRED - the orchestrator's checkpoint stands in (policy 1) |

### 7. Issues for the orchestrator

1. **Devlog top as expected:** v2.71.2 (part 1), unchanged since 03:15:20; v2.71.3 allocated with no surprise.
2. **The folder-number registry** (`ValeVision__NOTES__FolderNumberRegistry__.md`, 5370e491): the continuation created
   `54__Feature__ColourPalette` (row :116, W1-37) and LE/`59__Feature__FloorAreas` (row :233, W1-27), whose ValeVision
   column still reads "-". The gate (its section 5 item 5) hands this to the scribe, but the file is not in W1-99's edits
   list (policy 6), so it was not written; fill both as `tools/fix_records_after_W1a.py` did for part 1's ten. The lint
   passes either way.
3. **Gate item 4.1 (needs an OC):** W1-36's held Na__Test__DrawingTabKeys__ - W3-03 should land and run it
   (`execution/scratch/W1-36/build_w1_36.py --land-held-test`, 53/53 expected), changing its placeholder id to W3-03's.
4. **Gate item 4.2 (needs an OC):** the sheet PDF's file name on the Document ID (two lines in PdfExporter, a seam for
   the document code, a PORT NOTE line and a log entry). TrueVision's own v2.71.0 entry names the change (the gate
   called it unlogged; it is unlogged only in the exporter's module log). Recorded in the entry's Known, accepted and on
   the v2.71.0 watermark row, which stays PARTIAL for it.
5. **Gate item 4.3 (ratify or revert):** W1-26's three files outside its list (the LogoFallbackText key, its reader, two
   allow-list rows); the ledger's register rows name W1-26 as "outside its list" until an OC ratifies it.
6. **Hot-file hashes changed by this pass** (section 5): the Loader and the mode controller (next W2-19), the Paper
   sheet (W2-20), SheetModel (W4-07), PdfExporter (W3-16); every package restore script of the continuation and the
   gate's FIX-C1 restore now refuse until `resolve_vvrel_c2.py --restore` runs first.
7. **Classification readings to review** (section 2): v2.81.0 PORTED while switched off (resolver W5-05, held); v2.39.0
   PORTED with its sync-tool half in W0-07's staged fix; v2.104.0 under "tried by Adam in part".
8. **Carried and still open:** the live-site viewer gap before any deploy of v2.71.2+ (W1-33; working memory 02-Oct
   03:31); the SpecEditor Bar's document code (W2-31, OC-09); the elevation exclusion-token trim (W2-05, OC-11); W1-27's
   `depends_on` omits W1-21 (catalogue note, gate 4.4); records hygiene for W6-01 (SheetShortCode, the DrawingCode note,
   the TitleBlockCells pages' font wait, the NA stage codes in two config notes); W1-27 F2 (the A key between W3-03 and
   W3-10).
9. **Orchestrator-owned records:** `execution_state.json` and the working memory still show W1-99 pending and W1 running.
10. **OS temp:** 238 `Na__Test__<name>__*.mjs` stubs from TrueVision-design tests (part 1 also noted 19 `na-drafts-*`
    folders); none written by this pass. Safe to delete.

### 8. Follow-ups for Adam

1. Read the v2.71.3 entry at the top of `ValeVision__DEVLOG__.md`; relabel before committing if you prefer another step
   (D85).
2. TrueVision releases ported but not confirmed by you in TrueVision are named in the entry (DR-01 (c)); none of the
   continuation's is confirmed, four are tried in part.
3. Run the Wave 1 checklist (audit F.5.4) after the orchestrator's smoke test, on a project with Layout Mode on and
   sheets (2026/57994__Harris__Scheme-02; 3047__Doous has neither) - the entry's Verified section lists every deferred
   look; approve the visible changes (Document ID, Open Sans, the slimmed toolbar, the paint order).
4. Decide before any deploy: the PDF file name (an OC for one package, or wait for W3-16) and the live-site viewer gap;
   deploy only with the consolidated service-worker bump (the prepared W0-08 package plus one shell-token bump, or a
   full bump).
5. Questions the packages left for you: RenumberSheets' form without a register block (W1-21 1.1); the brand seam in
   config rather than code (W1-26 1.1); 3047__Doous D01's caption under a white vector (W1-28 F2); on the 3D tab Page
   Up is the NEXT scene while on a drawing Page Down is the next drawing - TrueVision's binding, a TrueVision-lane
   question (W1-36); the mid-edit "40%" suffix reading in both apps (W1-38); a Vale-owned font copy when you name one
   (W1-25, DR-21); each pre-upgrade browser draft is asked about once (W1-07).
6. Commit from the wave's path list only, never `git add -A` at the repository root; keep `execution/scratch/` (it holds
   TrueVision text) out of any commit.

### 9. Files written

- Records: `ValeVision__DEVLOG__.md`, `ValeVision__PARITY__TrueVisionLedger__.md` (the PLAN not written).
- Placeholders: 68 files (56 under 02__Src__AppModules, 12 under 80__Testing__PrototypeEnvironment); hashes and line
  endings in `C2/preimage_manifest.json`.
- This Port Record (PART 2 above; PART 1 below as written, also kept as `C2/W1-99__part1__as_written.md`, sha1 67293d10).
- Scratch (`execution/scratch/W1-99/C2/`): the scripts (`resolve_vvrel_c2.py`, `token_context_c2.py`,
  `update_ledger_w1c.py`, `write_devlog_w1c.py` with `devlog_entry_w1c.txt`, `make_pom_endW1c.py` and `pom/`,
  `blocked_by_w1c.py`, `rows_c2.py`, `loaded_by_diff_c2.py`, `release_files_c2.py`, `portnote_fields_c2.py`,
  `tv_release_dates.py`, `show_cells_c2.py`, `register_diff_stats_c2.py`, `hot_files_c2.py`, and the gate's runners
  `run_gates.py`, `run_g5.py`, `run_extras.py`, `g5_table.py`), their outputs, the pre-images (`preimage/`,
  `preimage_records/`), the two candidates, the gate outputs (`POSTPASS__*`, `FINAL__*`, `G5__*`) and the status
  snapshots. Nothing written outside the two records, the 68 files, this record and scratch.
- Restores (run in `execution/scratch/W1-99/C2/`, newest first; each refuses if its file changed since):
  `python -B write_devlog_w1c.py --restore`, `python -B update_ledger_w1c.py --restore`,
  `python -B resolve_vvrel_c2.py --restore`.

---

## PART 1 - the pass of 02-Oct-2026 02:37-03:28 (W1 part 1, released as v2.71.2), preserved as written

