# S11 - Parity Ledger and Release Watermark Reconciliation (where the port was up to)

Slice S11 of the TrueVision (TV) -> ValeVision (VV) drawing-system parity analysis. Read-only survey, 01-Oct-2026.
TV git HEAD b2aa9151 (devlog top TrueVision3D v2.172.0, 29-Sep-2026); VV git HEAD 7b4e593a (devlog top ValeVision3D
v2.71.0, 28-Sep-2026). Paths below are relative to each app root unless stated: `TV/` =
`D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode`, `VV/` =
`D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D`, `LE/` = `02__Src__AppModules/51__System__LayoutEditor/`.

**Headline.** The newest TrueVision release whose drawing-system changes reached ValeVision is **TV v2.85.0
(20-Sep-2026, ported as VV v2.68.0)**, with TV v2.83.0 (VV v2.70.0) the last one ported. The VV side then stopped
(VV's only later release, v2.71.0 on 28-Sep, went the other way and became TV v2.161.0). TrueVision kept going:
**88 TV releases, v2.86.0 to v2.172.0 (20-29 Sep), carry no VV port at all** - 78 never considered for VV, 7 parked
"on Adam's sign-off", 1 deliberately not ported (v2.88.0, Project Admin site address), 1 VV-origin (v2.161.0) and 1
not drawing work (v2.139.1). Below the high-water mark the port was not contiguous either: 18 earlier releases are
missing or only part there (v2.28.0 viewport snap move, the unnumbered eyedropper-viewports frame trait, v2.37.0
flush joins, v2.38.0 frame toggle, v2.38.1 ortho depth bias, v2.39.0 save message, v2.40.0 at-scale rows, v2.41.0
extension lines, v2.42.0 and v2.48.1 plan doors, v2.48.0/v2.49.0/v2.49.1 site plans, v2.58.2 sampling guards,
v2.78.0 select-picks-move, v2.81.0 QR cell, v2.82.0 drawing planes, v2.84.0 planes half). The parity ledger records none of the 88 later releases, and
roughly 40 of its own rows are now stale or contradict each other or the code (section B4 and Appendix B).

> **VERIFIER (01-Oct-2026) - read this first.** The watermark (TV v2.85.0 high, TV v2.28.0 low), the 88-release gap and
> the 18 open releases below the high-water mark all hold, and so do the ledger-hygiene findings. Corrections:
> (1) Four Appendix A rows are reclassified. v2.48.0, v2.49.0 and v2.49.1 are PENDING-SIGNOFF, not NOT-CONSIDERED:
> the ValeVision question was put to Adam on 14-Sep-2026 (`TV/TrueVision__PLAN__SitePlanDrawings__.md` L761), after he
> confirmed site plan viewports in TV. v2.92.0 is NOT-DRAWING (presentation only). Corrected tally: 55 PORTED / 6 PARTIAL /
> 17 PENDING-SIGNOFF / 79 NOT-CONSIDERED / 6 DELIBERATE / 8 NOT-DRAWING / 4 VV-ORIGIN / 2 N/A. Of the 88 later releases,
> 77 are NOT-CONSIDERED and 2 NOT-DRAWING. (2) Three back-ports that B5 calls CLOSED landed in TV only as files and were
> never wired: the dimension config/preview split, StyleRows and the per-drawing style toggles. VV is AHEAD on those, and
> taking TV's files whole would delete VV behaviour (S11-V03). (3) The c.1 module table cannot be run as written. Ten
> `no_action` rows hide TV changes that VV lacks (S11-V01). 44 of the 62 `port_whole_reapply_vv` rows import TV modules
> VV does not have, and three of them import TV's Cloudflare client with no transport seam (S11-V02, Appendix D).
> (4) TV's FacePick/GizmoGrip are not imported by DrawingPlanes or North: DrawingPlanes superseded them in v2.82.0
> (S11-V09). Full account: "Verification" at the end.

---

## (a) Scope - what was examined

| Source | Size | How it was used |
|---|---|---|
| `VV/ValeVision__PARITY__TrueVisionLedger__.md` | 1,246 lines, last commit 7b4e593a (28-Sep) | Read in full; every row re-checked against code (Appendix B) |
| `VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md` | 885 lines | Decisions D01-D40 (section 2), data model (5), integration list (12), file map (Appendix A) |
| `TV/TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md` | 997 lines, last commit 32767407 (19-Sep) | Divergences 2.2, decisions TD01-TD06, folder map 4.1, progress ledger section 12 (rows A-AP) |
| `TV/TrueVision__DEVLOG__.md` | 18,057 lines; 238 headings | Every heading v2.24.0-v2.172.0 (172 headings, 2 duplicated) split into entries; every "ValeVision" line and every Adam sign-off line extracted; entries read where classification needed it |
| `VV/ValeVision__DEVLOG__.md` | 9,177 lines; 190 headings | Every "Ported from / Authored in TrueVision3D vX" line mapped to its VV release (v2.16.0-v2.71.0) |
| Identifier probe | 2,495 backticked identifiers (1,497 distinct) from the 172 TV entries | Each searched in both source trees (`02__Src__AppModules`, `03__Style__AppStylesheets`, entry HTML); 597 distinct identifiers exist in TV only = not-ported evidence |
| Module dev-log watermark | 261 shared module pairs (drawing-system folders) | Newest dated entry in each VV file vs TV entries dated after it (section (c)) |
| PORT NOTE markers | 528 TV lines, 1,250 VV lines (`ref/*_portnote_markers.txt`) | Back-port fields cross-checked against the other app's code |
| Spot checks in code | ~40 targeted greps | Pending back-ports, ledger claims, service worker token, harnesses |

File counts (from `ref/tree_*.tsv`, `ref/drift_all.tsv`): TV `LE/` 341 files / 150,637 lines; VV `LE/` 161 files /
62,817 lines; 155 shared relative paths (2 identical, 40 header-only, 113 drifted), 186 TV-only and 6 VV-only `LE/`
files. TV tests: 102 files in `TV/80__Testing__PrototypeEnvironment` (about 70 `Na__Test__*`); VV: 30.

**Caveats.** (1) Module watermarks compare DATES of dev-log entries, so a TV change made later on the same day as
VV's port is not flagged - checked by hand for the 20-Sep ports. (2) VV restarts a ported module's own version at
1.0.0 (VV `LinkNoodle__` "Version 1.0.0" is TV 1.2.0, per its PORT NOTE), and some VV logs are out of order (VV
`History__` lists 1.3.0 above 1.4.0, so `drift_all.tsv` reports 1.3.0 for a file that is at 1.4.0). TV and VV module
version numbers are therefore NOT comparable; the PORT NOTE source version is. (3) Sign-off status is as the TV
devlog wrote it at release time; later verbal sign-offs are not recorded anywhere I could read.
(4) Reproducible: the scripts that produced every table are in `scratchpad/parity/work_s11/` - `tv_entries.py`
(TV devlog split), `vv_map.py`, `sig.py` (identifier probe), `signoff.py`, `modwm.py` (module watermark),
`folders.py`, `tests_map.py`, `release_table.py` -> `owners.py` -> `add_tests.py` (Appendix A), `module_table.py`,
`assemble.py`. Both VV `Na__Verify__` harnesses were run read-only on 01-Oct-2026 (results in (d) item 4).

---

## (b) Narrative findings

### B1. The watermark - where the port was up to

Per feature area, from the per-release table (Appendix A). "High-water" = newest TV release of that area ported;
"first open" = oldest TV release of that area not (fully) in VV.

| Area | High-water (ported) | VV release | First open (low-water) | Open releases | Partial | Notes |
|---|---|---|---|---|---|---|
| LE sheet tools (select, move, box, clipboard, groups, eyedropper, VCB, snap) | v2.59.0 (Move tool, container editing) | VV v2.52.0 | **v2.28.0** (ViewportSnapMove) | 16 | 3 | v2.78.0 select-picks-move and everything from v2.113.0 (ortho, grid, snap folder, move anchor, copy-drag) absent |
| LE drawing tools (dims, leaders, text, vectors, gradient) | v2.60.0 | VV v2.53.0 | **v2.41.0** (extension lines) | 7 | 0 | v2.90.0 hatch, v2.130.0/v2.150.0 vector tools + booleans, v2.139.0, v2.152.0 absent |
| LE viewports and render styles | v2.64.1 | VV v2.57.0 | **v2.38.0** (frame toggle) | 7 | 0 | v2.38.1 depth-bias fault live in VV; v2.93.0, v2.107.0, v2.111.0, v2.136.0, v2.138.0 absent |
| LE core (model, history, autosave, tabs, toolbar) | v2.73.0 (+ v2.83.0 fold) | VV v2.62.0 / v2.70.0 | v2.106.0 (paint order) | 6 | 0 | v2.124.0 toolbar, v2.135.0 zoom, v2.145.0 draft race, v2.154.0, v2.158.0 five-tab strip absent |
| LE title block and chrome | v2.79.1 | VV v2.66.0 | v2.81.0 (QR cell) | 6 | 0 | QR/Project Portal family v2.100-v2.120 absent (NA identity - decision) |
| LE specification and notes | v2.78.1 (margins; other two changes N/A) | VV v2.66.1 | v2.91.0 | 5 | 0 | Spec Scrapbook, overspill regions, leaderless notes, spell check, lockstep absent |
| LE scrapbooks | v2.85.0 | VV v2.68.0 / v2.69.0 | v2.96.0 | 5 | 0 | Standard items deliberately empty; cabinet infill, site legend, project QR, title underline absent |
| LE web viewer / PDF | v2.65.2 | VV v2.58.1 | v2.155.0 (publishing) | 3 | 0 | Publishing, published-documents loading screen, share links absent |
| Projected linework (50) | v2.64.1 / v2.63.2 | VV v2.57.0 / v2.56.1 | **v2.37.0** (flush joins) | 6 | 0 | doors (v2.42.0, v2.48.1), storeys (v2.105.0), hide swings (v2.140.0), flush tolerance (v2.159.0) |
| Drawing core, plans, elevations, north (40-49) | v2.84.0 (compass half) | VV v2.67.0 | v2.82.0 (drawing planes) | 5 | 1 | v2.86.0 menus, v2.87.0 storey, v2.94.0/v2.103.0 depth fog absent |
| Floor areas (59) | - | - | v2.104.0 | 3 | 0 | whole feature absent |
| Drawing register / document ID / sheet images (51, 54) | - | - | v2.116.0 (images); v2.69/v2.71/v2.76.1 deliberate | 2 | 0 | needs the register decision |
| Statement writer (52) | - | - | v2.95.0 | 12 | 0 | whole feature absent; NA planning content |
| Site plans (21, 36, 52 library) | - | - | v2.48.0 | 7 | 0 | whole feature absent; Vale site data needed |
| Keyboard scopes (31, Na__Hotkeys__*) | - | - | v2.110.0 | 3 | 0 | replaces VV `LE/03__Core__Config/Na__LayoutEditor__KeyMappings__.json` |
| Colour palette (54 top-level) | - | - | v2.126.0 | 2 | 0 | |
| Persistence guards | v2.39.0 (partial) | - | v2.39.0 | 1 | 1 | transport-specific (DIV-4) |
| Presentation / 3D (not drawing) | v2.68.0 | VV v2.63.0 | v2.92.0 | 1 | 1 | v2.58.2 progressive-render guards partial |
| App shell UI | v2.83.0 (top bar fold) | VV v2.70.0 | - | 0 | 0 | fold identical (S10 B1) |

So there is no single watermark. The honest statement for the swarm is:
- **High-water: TV v2.85.0** (20-Sep-2026). Nothing TV released from v2.86.0 (20-Sep, later that day) onward is in VV.
- **Low-water: TV v2.28.0** (13-Sep-2026, viewport snap move). Every TV drawing release older than v2.28.0 is in VV.
- Between them, 18 releases are open or partial (listed in the headline), each with a reason in Appendix A.

### B2. How the port actually ran (cadence)

- 09-10 Sep: VV built the drawing system first (VV v2.16.0-v2.21.21, Phases 0-5, decisions D01-D40). TV ported it in
  (TV v2.20.0-v2.24.0, Phases A-F, TD01-TD06). Direction reversed on 10-Sep (ledger L15-20).
- 12-20 Sep: the "return trip" - TV authored, Adam signed off, VV replayed the hunks the same day (ledger sections
  L57-L924, 30 return-trip tables - VERIFIER: 30, not 27). VV v2.22.0 to v2.70.0 track TV v2.25.0 to v2.85.0, usually within hours.
- 20-Sep evening onward: TV ran 88 releases in nine days (v2.86.0-v2.172.0: 76 of them between 20 and 23 Sep - 43 on 21-Sep alone - then 12 on 28-29 Sep). The
  TV devlog closes almost every one with "NOT tried by Adam; NOT in ValeVision". VV received none of them.
- 21-Sep: the VV commit `9d250d21` "ValeVision - Parity Session With TrueVision" carried VV v2.67.0-v2.70.0. After
  that, only `eb97d162` (25-Sep, one scrapbook index JSON) and v2.71.0 (28-Sep, per-scene lighting, VV-origin).

### B3. Classification of every TV release v2.24.0 - v2.172.0 (Appendix A)

177 rows: the 172 TV headings, plus v2.33.0 (released without a TV devlog heading; TV plan row Q) and four TV
features that shipped with no TV devlog entry at all but were ported to VV (dimension text leader -> VV v2.37.0,
eyedropper viewports -> VV v2.36.0, groups and multi-item copy -> VV v2.38.0, dashed vector edges -> VV v2.40.0).

| Classification | Count | Meaning |
|---|---|---|
| PORTED | 55 | In VV; VV release cited (v2.78.1 counted here: its two other changes do not apply to VV) |
| PARTIAL | 6 | Part in VV; what is missing is listed (v2.28.0, v2.39.0, v2.40.0, v2.58.2, v2.84.0, unnumbered eyedropper viewports) |
| PENDING-SIGNOFF | 14 | TV devlog or ledger parks the VV port "on Adam's sign-off" (v2.37.0, v2.38.0, v2.38.1, v2.41.0, v2.42.0, v2.48.1, v2.82.0, v2.86.0, v2.87.0, v2.93.0, v2.105.0, v2.107.0, v2.111.0, v2.159.0) |
| NOT-CONSIDERED | 83 | "NOT in ValeVision" with no decision and no ledger row |
| DELIBERATE | 6 | Recorded decision not to port (v2.32.0 Model Source, v2.53.0 NA scrapbook items, v2.69.0 PdfFonts/register font, v2.71.0 Document ID, v2.76.1 register column, v2.88.0 Project Admin site address). Five of the six are REOPENED by the "identical experience" goal - each is a decision (section f) |
| NOT-DRAWING | 7 | 3D/PWA/shell only |
| VV-ORIGIN | 4 | TV took it from VV (v2.24.0, v2.55.0, v2.56.0, v2.161.0) |
| N/A | 2 | TV-internal (v2.30.2 config wiring VV already had; v2.68.2 withdrawn port) |

**VERIFIER:** these are the corrected counts after reclassifying v2.48.0, v2.49.0 and v2.49.1 as PENDING-SIGNOFF (the
ValeVision question was asked on 14-Sep-2026: `TV/TrueVision__PLAN__SitePlanDrawings__.md` L687 and L761) and v2.92.0
as NOT-DRAWING: PORTED 55, PARTIAL 6, PENDING-SIGNOFF 17, NOT-CONSIDERED 79, DELIBERATE 6, NOT-DRAWING 8, VV-ORIGIN 4,
N/A 2 (177 rows). The PENDING / NOT-CONSIDERED line still under-counts parked releases. TV's own feature plans, which the
survey did not read, park another 16 NOT-CONSIDERED releases on Adam's sign-off:
- Floor Areas v2.104.0, v2.125.0, v2.148.0: `TrueVision__PLAN__FloorAreas__.md` L268, phase 9 "only once Adam has signed TrueVision off".
- Scrapbook items v2.96.0, v2.122.0, v2.128.0, v2.134.0, v2.164.0: `__PLAN__ScrapbookSystem__.md` L323.
- Sheet Images v2.116.0, v2.121.0: `__PLAN__SheetImages__.md` L132.
- Vector Tools v2.130.0, v2.150.0, v2.151.0: `__PLAN__VectorTools__.md` L337.
- Site plan composites v2.89.0, v2.101.0, v2.132.0: `__PLAN__SitePlanComposites__.md` P10.

They stay NOT-CONSIDERED in the tally, because nobody ever put a VV-side question for them. Each one's Appendix A row
now names its TV plan phase, and the scribe must close that phase with the port.

Sign-off readiness inside the 97 open/pending releases: TV recorded Adam's confirmation for **v2.153.0** (box select
over a viewport, "It works fantastically") and **v2.155.0** (publishing, "CONFIRMED by Adam in Chrome"); v2.85.0 and
earlier were signed off as they were ported. Most of v2.86.0-v2.172.0 read "NOT tried by Adam" at release, but later
releases are built on them and were confirmed on top of them (v2.153.0 sits on rotation v2.138.0, object snap
v2.129.0, move anchor v2.149.0 and doors v2.42.0). See decision D-S11-01.

### B4. Ledger hygiene - stale, contradictory and missing rows (`VV/ValeVision__PARITY__TrueVisionLedger__.md`)

Each item names the ledger line and the evidence. The full corrections list, ready for the scribe, is Appendix B.

1. **The ledger stops at TV v2.87.0.** Its newest TV reference is L87 ("v2.86.0 ... and v2.87.0 ... not ported -
   awaiting Adam's sign-off there"). No row exists for TV v2.88.0-v2.172.0 except the VV-origin per-scene lighting
   (L1192-1210). 85 TV releases are unrecorded.
2. **Header block L22-49 contradicts the code and the TV plan.**
   - L29 (Phase C) says "Pick Face, gizmo grip, scene editor splits ... all landed". The scene editor splits were
     WITHDRAWN and deleted in TV v2.68.2 (TV devlog L9778-9841: "do not re-port"); TV plan section 12 C row says
     FacePick + GizmoGrip "- Not yet ported" (TV plan L765) while the files exist in `TV/02__Src__AppModules/
     45__System__ElevationViews/Na__Elevation__FacePick__.js` / `__GizmoGrip__.js` and are imported by
     `47__System__DrawingPlanes/Na__DrawingPlanes__Grip__.js` and `46__System__NorthDirection/Na__North__PickTool__.js`
     (wired by TV v2.82.0 "Aim at face"). Both documents are wrong in opposite directions.
     **VERIFIER CORRECTION:** TV's `Na__Elevation__FacePick__` and `__GizmoGrip__` are NOT imported by DrawingPlanes
     or North. Their only importer is `TV/Index.html` (L911-912, initialise calls). TV v2.82.0 built its own pick and
     grip in `47__System__DrawingPlanes/Na__DrawingPlanes__Grip__.js` (`Na__PlaneGrip__StartFacePick`, "Aim at face").
     That module's PORT NOTE (L59-61) says it "Supersedes Na__Elevation__GizmoGrip__ and Na__Elevation__FacePick__
     there when it is" ported. `Na__North__PickTool__.js` was only written "after" FacePick (L49) and does not import it.
     TV v2.86.0 (devlog L7921) records PlaneGizmo, GizmoGrip and FacePick as "still on disk and initialised, unused
     since v2.82.0". So the back-port did land, and TV plan row C ("Not yet ported") is stale. But it is dead code in
     TV now, and porting TV v2.82.0 retires VV's live FacePick and GizmoGrip (S11-V09).
   - L34-37 "Closed ... scene row builders and reorder splits" - withdrawn, not closed.
   - L39-42 "Still outstanding: ... the two Lantern Designer items" - both are IN TV already
     (`TV/.../50__System__ProjectedLinework/Na__ProjectedLinework__SoupBuilder__.js:109,148` ViewMapFromBasis /
     TurnPoint; `__ClipWorker__.js:139-173` HiddenSegments).
   - L44-49 "DevGate ... and the two verification harnesses ... ValeVision has no equivalent" - VV has DevGate 1.1.0
     and `VV/80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs` + `Na__Verify__ModuleGraph__.mjs` since
     VV v2.22.0; the ledger itself says "ported" at L867-868.
   - L11-12 names a TV working copy `D:\WE10_--_Public-Repo_--_Live-Website\na-apps\...` that does not exist.
3. **"No service worker" is stated 14 times and is false.** L236, L340, L384, L404, L420, L429, L439, L452, L522,
   L542, L569, L615, L849, L1189 each say VV has no PWA worker; L135-175 established that production VV runs under
   Whitecardopedia's shared worker (`WCP/02__Src__AppModules/62__Feature__AppInstallability/
   Whitecardopedia__Pwa__ServiceWorker__Logic__.js:229`, token `'2026-09-18-1'`, unchanged on 01-Oct-2026). VV
   v2.61.0, v2.62.0, v2.65.0, v2.66.0, v2.67.0-v2.70.0 (+21 modules, new exports) and v2.71.0 all shipped
   cross-module exports without a token bump (decision D-S11-04).
4. **Closed items still written as open.** L242-244 (undo/redo row "remains open" - closed by VV v2.64.0, L55),
   L460-461 and L467 ("AnnounceRestore ... still pending sign-off"), L571-573 and L617-619 ("History shape row still
   missing" - it arrived with the VV v2.38.0 groups port, as L55 itself says), L810-812 (palette mode and
   undo-restore "deliberately NOT ported" - ported in VV v2.27.0 and v2.64.0).
5. **Phase 5 table L1041-1043** says "No TrueVision counterpart exists for this phase ... every module is a back-port
   candidate". TV has had the Layout Editor since TV v2.23.0/v2.24.0 and has since grown it to 341 files.
6. **The loader contradicts itself.** L1122 ("ValeVision only until the loader is back-ported") and L1230 (Pending
   back-port) and the VV loader PORT NOTE (`LE/01__Core__Loader/Na__LayoutEditor__Loader__.js:51` "Back-port :
   candidate") versus L1244 ("Not a back-port candidate"). Decision D-S11-05.
7. **The subfolder table L1120-1136 is out of date.** L1128 lists TrueVision-only bases "ModelSource, PlanDoors,
   ViewportSnapMove"; TV now has 17 `LE/` subfolders VV lacks (21, 26, 27, 28, 31, 32, 33, 36, 37, 51, 52, 53, 54,
   58, 59, 65, 66) and 186 TV-only `LE/` files. L1134 lists `55__Feature__Scrapbook` as TV-only; VV has had 55, 56
   and 57 since VV v2.68.0/v2.69.0.
8. **Wrong TV folder name.** L126 "53__System__ProjectQrCode does not exist here": the TV folder is
   `LE/53__Feature__ProjectQrCode`; top-level `53__` in TV is `53__Data__Layout__PublishedSchema`.
9. **Module versions recorded as current are stale** (the TV side moved on 21-23 Sep): e.g. L190 SheetRecords "TV
   1.23.0" (now 1.39.0), L117 Cells 1.1.0 (now 1.2.0, TV v2.109.0), L118 Modern 1.2.0 (now 1.5.0), L74 Groups 1.2.0 /
   Grips 1.8.0 (now 1.4.0 / 1.12.0), L75 ItemClipboard 1.2.0 (now 1.7.0), L77 PanelHost 1.4.0 (now 1.6.0), L79 the
   parametric set (Panel 1.8.0, Grips 1.6.0, LinkNoodle 1.2.2, DrawingTitle and ViewportLink later). Full list in the
   module table (c).
10. **Ordering and structure.** The 20-Sep top-bar-fold table (L1235-1246) sits after the Pending back-port table;
    return-trip sections are reverse-chronological but not strictly; per-module truth is scattered across 30 (VERIFIER: 30, not 27)
    narrative sections, so no row says "module X is at TV version Y". The ledger cannot answer "where was this up to"
    without a full re-read - which is why this slice exists.
11. **Open rows that are still genuinely open** (keep, re-word): L219 `'margin'` step reason missing from
    `Na__LeHist__STEP_REASONS` (VV `LE/07__Core__SheetData/Na__LayoutEditor__History__.js:140`; TV has `'margin'` and
    `'areas'`), L482 extension lines, L495/L489 `Viewport__ShowFrame`, L505-521 Draw/Measure-at-scale rows, L720
    purple carry tone (no ViewportSnapMove), L339 Document ID, L1169 SpecPdf/PdfFonts.

### B5. Pending back-ports VV -> TV, re-checked in TV's source on 01-Oct-2026

| Ledger row | Item | Status in TV today | Evidence |
|---|---|---|---|
| L1218 | Scene row builders / reorder split | **WITHDRAWN** - do not port | TV devlog v2.68.2 (L9778-9841); TV plan L562, L766 |
| L1219 | Ground Floor Plan quick action | **OPEN** | No quick action in `TV/.../42__System__FloorPlanViews/Na__FloorPlan__DevMenu__Editor__.js` (TV v2.87.0 StoreyLevel is a different feature); VV `43/.../DevMenu__Editor__.js:23,54` |
| L1219 | Per-drawing style toggles | **OPEN - data only in TV** (VERIFIER; survey said CLOSED) | TV plan L762 records only the record keys ("Styles, exclusions, linework asset on both records"). The UI (L565, "through the shared StyleRows") never landed: `Na__FpData__SetStyle`/`SetExcludeTokens` and `Na__ElevData__SetStyle`/`SetExcludeTokens` have no caller in TV, and TV's 2.0.0 row builders build no Styles or Exclusions rows. VV builds them (`43/...RowBuilders__.js:92-93,367-368`; `46/...RowBuilders__.js:96-97,563-564`), so VV is ahead (S11-V03, D-S11-10) |
| L1220 | Dimension config / preview splits | **HALF - files only** (VERIFIER; survey said CLOSED). TV's `Data__` (988 lines) and `Editor__` (907) were never slimmed: Data still defines every getter itself, and TV's mode controllers load Data's copy. The only TV importer of the split `ConfigState__` is LE `MarkupBridge__` (L259). That copy's config is never loaded, so it reads the fallbacks (static reading, not run). `EditorPreview__` has no importer in TV. VV is single-sourced through ConfigState (S11-V03) | `TV/.../44__System__PlanDimensions/Na__PlanDimensions__ConfigState__.js`, `__EditorPreview__.js` (header-only drift) |
| L1221 | R2 asset upload | CLOSED (TV's own, "Back-port: no") | `TV/02__Src__AppModules/03__AppUtils/Na__AppUtils__R2AssetUpload__.js` 1.0.1 |
| L1222 | Async confirm dialog | **HALF** - module present, no DOM | `TV/Index.html` has no `naConfirmDialog` markup and TV CSS no rules, so TV falls back to `window.confirm` (module L18, L147); VV `index.html` has it (6 hits) and `Na__UiFeature__Styles__DropdownAndToast__.css` styles it (also S10 Appendix B item 3) |
| L1223 | Pick Face, Re-pick, gizmo grip | CLOSED as a back-port, then SUPERSEDED in TV v2.82.0 (VERIFIER; survey said "re-armed") | TV's copies are initialised from Index.html L911-912 but unused since v2.82.0 (TV devlog L7921). DrawingPlanes Grip supersedes them (B4.2 correction, S11-V09) |
| L1224 | Sections filed by drawing type | **OPEN / decision** | `TV/.../45__System__ElevationViews/Na__Elevation__SceneLink__.js:15-28` files every elevation (sections too) into "Elevations"; TV v2.86.0 added `48__System__CrossSectionViews` (placeholder 0.1.0) which only LISTS sections; VV files them into "Cross Sections" (D28, `46/.../SceneLink__.js:186-187`) |
| L1225 | Shared style rows / config state | **HALF** (VERIFIER; survey said CLOSED). `40/Na__DrawView__ConfigState__.js` is wired (4 importers), but `40/Na__DrawView__StyleRows__.js` has NO importer or caller in TV; VV imports it from three places | TV `40/Na__DrawView__StyleRows__.js`, `__ConfigState__.js` |
| L1226-1227 | Lantern Designer rotation path / hidden segments | CLOSED in TV **and in VV** (VERIFIER: both apps carry `Na__PlSoup__ViewMapFromBasis`/`TurnPoint` and `HiddenSegments`, VV `50/...SoupBuilder__.js:112,151`, `...ClipWorker__.js:145,169`; the ledger called them VV-to-VV items) | B4.2 |
| L1228 | Whole Layout Editor | CLOSED (TV v2.23.0) | - |
| L1229 | Pose-preserving mode release, look-ahead target | **OPEN** | No `ReleaseToOrbit`, `EnterModeAtPose` or `SyncFromCamera` anywhere in `TV/02__Src__AppModules` |
| L1230 | Layout Editor loader | **OPEN / decision** | `TV/LE/` has no `01__Core__Loader`; TV `Index.html` imports the editor at start-up |
| L1231 | Add Viewport list rebuilt on refresh | **OPEN (bug in TV)** | `TV/LE/40__Ui__Panels/Na__LayoutEditor__Panel__ViewportSettings__.js:647` still `addSelect.options.length <= 1` |
| L1232 | Drawing thumbnail bake | **OPEN** | No ThumbnailBake module in TV; TV devlog v2.161.0 L917 "has no counterpart here" |
| L84 | `.gitkeep` per scrapbook category | OPEN (minor) | `TV/51__LayoutEditor__UserScrapbookContent/` has only `00__Deleted__Quarantine` and `01__ScrapbookItems__General`, no `.gitkeep` |
| L85 | `sys.dont_write_bytecode` in the scrapbook Python tests | OPEN (minor) | absent from `TV/80__Testing__PrototypeEnvironment/Na__Test__ScrapbookApi__.test.py` and `__ScrapbookServer__.py` |
| L1192-1210 | Per-scene lighting | CLOSED (TV v2.161.0) | - |

Back-ports go to TrueVision, the lead app, so each needs Adam's approval (D-S11-06); the swarm should not edit TV
without it.

### B6. TrueVision-side records that are stale (for Adam; TV is the source of truth)

1. **TV plan section 12** (last commit 19-Sep): rows U (spec), Y (VCB), AI (3D zoom), AJ (spec read), AK (rotate
   text), AM (margin), AP (short tabs) and N ("ValeVision has the same fault") still read "-" / pending although VV
   ported them (unrecorded commit 66937440, VV v2.35.0, v2.42.0, v2.43.0, v2.41.0, v2.44.0, v2.61.0, v2.64.0). Row C
   FacePick + GizmoGrip "-" though they are in TV. The table ends at AP (TV v2.70.0): nothing for v2.71.0-v2.172.0.
   Section 4.1's folder map has no row for TV `46__System__NorthDirection` (VV 47) and no VV slots for TV 47-49
   (VV's 47 is taken by North) - see S02a.
   **VERIFIER additions:** row L ("Clipboard and snap move back-port to ValeVision - Pending") is half stale:
   ViewportClipboard went across in VV v2.35.0, ViewportSnapMove did not. Two Phase C rows overstate TV:
   "C | Confirm dialog, dimension config + preview splits | x" and "C | Styles, exclusions, linework asset on both
   records | x". The confirm dialog has no DOM, the dimension split was never wired, and the style rows never got a UI
   (B5 corrections). The 12 TV feature PLAN files at the TV root also carry "ValeVision port" phases (B3 verifier
   note). Those are TV-side records to close too.
2. **TV devlog v2.159.0 (L1067)** "ValeVision has FlushJoins 1.0.0 with the old tolerances" - false; VV
   `50__System__ProjectedLinework/` has no FlushJoins module (TV v2.37.0 was never ported).
3. **"ValeVision has no web viewer"** - TV devlog v2.166.0 L553 and the four TV `LE/80__Feature__WebViewer/*` PORT
   NOTEs ("Back-port : candidate (ValeVision has no web viewer)") - false since VV v2.58.0 (18-Sep).
4. **Stale TV PORT NOTE back-port fields**: `LE/05/Na__LayoutEditor__LoadingVeil__.js:54` "PENDING to ValeVision3D"
   (ported VV v2.70.0); `LE/20/Na__LayoutEditor__ForceRender__.js:42` "PENDING" (ported VV v2.57.0, identical
   1.1.0); `LE/50/Na__LayoutEditor__SpecPdf__.js:44` "offer ... with the revision fields" (VV v2.56.0);
   `LE/50/Na__LayoutEditor__SpecEditor__Notes__.js:36` (VV v2.61.0); `LE/60/Na__LayoutEditor__PdfFilename__.js:40`
   (VV v2.55.0); `LE/10/Na__LayoutEditor__Styles__Surfaces__.css:37` "offer ... with the register tab" (the tokens went
   across in VV v2.60.0 without the register - half stale); `LE/20/Na__LayoutEditor__ViewportClipboard__.js:94`
   "back-port to follow" (VV v2.35.0). Accurate and to keep: `LE/05/Na__LayoutEditor__TabStrip__.js:60` "PENDING to
   ValeVision3D (offer after Adam's sign-off)" - it refers to TabStrip 2.0.0 (v2.158.0), which VV does not have.
5. **TV devlog structure**: no heading for v2.33.0 (Drawing Layers grip, TV plan row Q); no entries at all for four
   features VV ported (groups, dimension text leader, eyedropper viewports, LineStyleTool 1.0.0 dashed edges) nor
   for `LE/60__Feature__PdfExport/Na__LayoutEditor__PdfFonts__.js` 1.0.0 (14-Sep); duplicate headings v2.27.0
   (L14096 rectangle, L14263 edge styles) and v2.65.1 (L10352 viewer, L10433 walk mode).

### B7. ValeVision devlog hygiene (`VV/ValeVision__DEVLOG__.md`)

1. Two entries numbered **v2.54.0** (L1673 "Title Block Says What Paper It Is"; L1704 "Progressive Renderer Stall,
   and the Scale Cell's Paper Size").
2. **The Project Specification port has no entry** (VV v2.44.0 Notes, L2608-2611: "in checkpoint commit 66937440
   ... has no entry of its own"); SpecMargin / ConfigState / SheetRecords changes landed "from a writer that left no
   entry" (L2602-2607).
3. VV v2.70.0's ModeController and Loader edits were never added to those modules' DEVELOPMENT LOGs (S10 Appendix B
   item 4); VV `Toolbar__` lists 1.8.0 and 1.9.0 twice; VV `History__` lists 1.3.0 above 1.4.0.
   **VERIFIER:** VV `History__` carries TWO 1.3.0 entries: 14-Sep groups (L80) and 20-Sep Common fields (L49, written
   above 1.4.0 by a parallel writer). The fix is to renumber the 20-Sep entry, not just to reorder.
4. Several VV module PORT NOTEs still say "Ported from : Lantern Designer ... Parity : new / Back-port : none"
   (`ConfigState__`, `ModeController__`, `TabStrip__`, `Assets__`) although their logs now record a dozen TV ports
   each; and the VV-side "Back-port : candidate" fields are stale for R2AssetUpload, PerSceneLighting,
   SceneLightingRows, GroupEditor confirm dialog, MaterialPreset, ProjectData, RenameDrawing, StyleRows, Transitions,
   FacePick, GizmoGrip, the dimension splits, the 40 "the same split applies to TrueVision's copy" unit headers (TV did the
   same splits in v2.55.0) and SheetModel.

### B8. Version numbers do not line up - and that hides gaps

VV restarts a ported module at its own 1.0.0 and records the TV version only in prose (PORT NOTE "its 1.2.0" or a
log line "Ported from TrueVision3D v2.52.0 (ConfigState 1.21.0)"). Consequences: `tv_ver` vs `vv_ver` in
`drift_all.tsv` cannot be compared (VV `Panel__Sheet__` 1.4.0 = TV 1.4.0 by coincidence; VV `LinkNoodle__` 1.0.0 =
TV 1.2.0); "same version" claims in the ledger are unverifiable without reading both logs; and out-of-order VV logs
(History) mislead tools. Recommendation (D-S11-03): when a file is taken whole from TV (`port_whole_reapply_vv`),
adopt TV's module version and add a mandatory machine-readable PORT NOTE line
`// - Source version: <TV module version> (TrueVision3D v<app version>)`; the ledger's Module Register keeps that
pair. The per-module watermark in section (c) was computed from dates for exactly this reason.

**VERIFIER:** the convention is not new. 72 VV files already carry `// - Source version: <TV module x.y.z> (<date>)`:
20 in `50__System__ProjectedLinework`, 13 in 45, 9 in 46, 8 in 43, 8 in 21, 6 in 44, 6 in 42 and 2 elsewhere. They were
written at the Phase 0-5 port and never refreshed by the return trip. No `51__System__LayoutEditor` file has one, and
TV has none. `drift_all.tsv` reads that line as VV's own version: VV `43/Na__FloorPlan__ModeController__.js` is
recorded as 1.1.0, but its log tops at 1.2.2. So `vv_ver` is unreliable for those 72 rows. D-S11-03 should extend the
existing line (add the TrueVision3D app version), and the verifier must parse both forms.

### B9. The shared service worker token

Every port wave adds exports to existing modules (TV's own ports bump `TrueVision__Pwa__ServiceWorker__Logic__.js`
`PWA_SW_VERSION_TOKEN`, now `'2026-09-29-03'`, TV `62__Feature__AppInstallability/...:682`). VV is served under
Whitecardopedia's worker whose token is still `'2026-09-18-1'`; bumping it evicts every Vale app's caches including
models, so it is Adam's call (ledger L161-175, raised twice on 20-Sep, never actioned). The alignment will add
hundreds of new exports; a partly revalidated VV client would fail to link the editor until its next visit. This
must be decided before the first deploy of swarm output (D-S11-04).

### B10. Recommended ledger and devlog procedure for the swarm

The ledger, the VV devlog, `VV/index.html`, the loader's `Na__LeLoad__STYLESHEETS`, `LE/03__Core__Config/
Na__LayoutEditor__AppConfig__.json` and the ConfigState units are touched by almost every package. Parallel agents
appending to the two documents will collide and mis-number releases (the user's own memory note: "parallel sessions
bump devlogs and rewire shared files mid-task; pick the number from a fresh read"). Procedure:

1. **Coding agents never edit `ValeVision__PARITY__TrueVisionLedger__.md` or `ValeVision__DEVLOG__.md`.** They edit
   code, each touched module's header (PORT NOTE + one DEVELOPMENT LOG entry) and tests only. Where a module log needs
   the VV release number they write the token `{{VVREL:<WP-id>}}` (e.g. `// 02-Oct-2026 - Version 1.21.0` followed by
   `// - Ported from TrueVision3D v2.118.0 for ValeVision3D {{VVREL:WP-S04b-06}}`).
2. **Each package returns a Port Record** (in its structured result or a handoff file outside the repos) with: TV
   releases covered (exact versions); per file: TV path, TV module version taken, VV path, VV version written,
   parity (verbatim / adapted / diverged), each VV seam re-applied; record keys and config keys added; deliberate
   non-ports and why; tests ported and run, with counts; `Na__Verify__Exports__` / `Na__Verify__ModuleGraph__`
   results; whether new cross-module exports were added (service worker relevance).
3. **One Parity Scribe agent, serialised after each wave** (never concurrent with a wave touching the same docs):
   a. `git status` and a fresh read of the top of `VV/ValeVision__DEVLOG__.md`; allocate the next minor versions
      (v2.72.0, v2.73.0, ...) in merge order - one per package (or one per wave for packages under ~50 changed lines).
   b. Replace every `{{VVREL:<WP-id>}}` in the package's files with its allocated version.
   c. Write one VV devlog entry per allocated version in the house format: `## ValeVision3D v2.N.0 - DD-Mon-YYYY -
      Title` / `### Ported from TrueVision3D vA.B.C[, vX.Y.Z]` / Overview / What came across / Adapted for ValeVision
      (the seams) / Not ported, and why / Verified (harness counts) / Files. Separate entries with the existing
      `# ---------------------------------------------------------` rule.
   d. Update the ledger's **Module Register** rows (one per VV module: VV path, TV path, TV source version, TV
      current version, parity, divergences, open TV versions, checked date) and **Release Watermark** rows (the
      Appendix A table becomes a ledger section; flip the classification and fill the VV version).
   e. Close or re-word Pending back-port rows touched by the wave; never delete history - move superseded narrative
      to an Archive section.
   f. Record the service worker decision for the wave ("token bumped to X" or "not bumped - Adam's call").
4. **Verification gate before the scribe writes**: an integration agent runs `node VV/80__Testing__PrototypeEnvironment/
   Na__Verify__ModuleGraph__.mjs` and `Na__Verify__Exports__.mjs` and every ported `Na__Test__*` for the wave; counts
   go into the devlog entry. No entry claims a test that was not run.
5. **TV-side documents** (TV plan section 12, TV PORT NOTE back-port fields, TV devlog "NOT in ValeVision" lines) are
   corrected only in a separate TV package approved by Adam (D-S11-06); until then the VV ledger records the truth.
6. **Folder renumbering** (S02a WP-S02a-01) changes thousands of path strings in the ledger: the scribe adds a dated
   folder-map section and leaves historical rows as written ("rows above keep the paths they were written with" -
   the convention the ledger already uses at L1116-1118).
7. **Commits**: the swarm does not commit; Adam commits per wave (one commit per allocated VV version keeps
   `git log` and the devlog in step).
8. **VERIFIER addition - hot files beyond the two documents.** The scribe serialises only the ledger and the devlog.
   Every wave also needs one named owner for each other hot file: VV `index.html`, the loader's `Na__LeLoad__STYLESHEETS`,
   `LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json`, `02__AppData/Na__AppConfig__Main.json`, the ConfigState
   units, `SheetRecords__`, `SheetModel__*`, `ModeController__`, `Toolbar__` and the SheetTools units. Two packages in
   one wave must not both take one of these whole; the second one works in hunks, or waits.
9. **VERIFIER addition - import pre-check.** Before a package takes a TV file whole, it resolves every import of that
   file against VV, with the folder renumbering applied. It then either ports the missing modules in the same
   package or works in hunks. Appendix D lists the blocked files today. The two integration harnesses catch a miss,
   but only after the edit.

### B11. ValeVision plan decisions the TrueVision lead has since moved past

`VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md` still opens "Plan for review. Nothing has been built yet."
(L3) with "Parity target: TrueVision 3D v2.19.0" (L7). Its decisions are the record the ledger's Decisions section
should cross-reference; these no longer describe the target:

| VV decision | Says | TrueVision today | Consequence |
|---|---|---|---|
| D22 | Tab strip under the header, a tab per sheet; localhost only while Enable Layout Mode is on (v2.21.20) | Five tabs: 3D Model, Drawings menu, Specification, Document Register, Design Statements (TV v2.158.0, TabStrip 2.0.0); no Layout Mode key | Superseded for the UI (S10 D-S10-02, S03a) |
| D27 | Scales 1:20, 1:50, 1:100 (`LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json:127` `[ 20, 50, 100 ]`) | `[20, 50, 100, 200]` + site plan scales `[100, 200, 500, 1250, 2500, 5000]` (TV AppConfig L159-161; v2.140.0, v2.49.0) | Superseded |
| D28 | Sections filed into "Cross Sections" | TV files all into "Elevations"; Cross Sections menu is a 0.1.0 placeholder (v2.86.0) | Open - D-S11-07 |
| D31 | Layer type is a tag; top of the list draws frontmost | The list IS the sheet's paint order (v2.106.0 `PaintOrder__`, `Sheet__LayerStack`); reference layers (v2.123.0) | Superseded (S03b WP-S03b-07) |
| D11 | Storey seeding + one-click Ground Floor Plan | Storey levels per plan (v2.87.0); no quick action | Ground Floor Plan stays a VV-only back-port candidate (B5) |
| D26 | Classic (Vale scan) + Modern title blocks | Modern only (TD04), NA branding; QR cell (v2.81.0) | Permanent identity divergence; QR cell is an open decision (S07a) |
| D35 | PDF in jsPDF, Helvetica measuring face | Embedded Open Sans via `PdfFonts__` (14-Sep, v2.69.0 fix) | Reopened - D-S08-03 |
| D36 | Binary assets via the `whitecardopedia-editor-api` asset route + Flask mirror | TV writes through generic `/r2/write` (DIV-4) | Permanent transport divergence (keep) |
| D33 (VERIFIER) | The four style toggles also exist per plan and elevation record (the Styles and Exclusions rows in the drawing editors) | TV has the record keys and reads them (MaterialPreset, RenderPreset) but has no UI to set them: its 2.0.0 row builders build no Styles or Exclusions rows, and `40/Na__DrawView__StyleRows__.js` is dead | VV is AHEAD. Keep the rows as a seam through every whole-file port of TV's plan and elevation editors and row builders, and offer them to TV (D-S11-10) |

---

## (c) Module-by-module table

### c.1 Shared module pairs - per-module port watermark

One row per drawing-system module present in both apps (folders 01, 03, 15, 21, 30, VV 42-47 / TV 40-46, 50, 51).
"VV last port" is the newest dated entry in VV's own DEVELOPMENT LOG; "TV app cite" is the newest
`TrueVision3D v2.N.0` the VV file quotes. "TV dev-log entries after VV's last port" lists TV module versions dated
AFTER that day (with the TV app version where TV's log names one) - i.e. what VV's copy cannot contain. Same-day TV
changes are not flagged (caveat, section a). TV ver / VV ver are each app's own module numbers and are NOT
comparable (B8). Action rule: no newer TV entries -> `no_action` (header refresh only); one or two newer entries and
under 300 diff lines -> `port_adapted`; three or more, or a large drift -> `port_whole_reapply_vv` (take TV's file,
re-apply the VV seams in the last column). The detailed per-file work belongs to the owning slices (S02a-S10); this
table is the cross-check the Parity Scribe uses to fill the ledger's Module Register.

**VERIFIER caveat - do not seed the Module Register from this table unchanged.**
1. `no_action` is not a skip list. Four things defeat the date rule. Cherry-picked ports: VV took TV MultiModel 1.3.1,
   1.3.2 and 1.4.0 but skipped 1.3.0, the v2.38.1 depth bias. VV's own later edits: VV v2.71.0 touched Viewport3d,
   SnapshotRenderer, SceneEditor and BatchOps on 28-Sep, hiding TV's 20-21 Sep entries. Same-day entries. And
   `header-only` rows that differ in code (ModelStage, lines 150-152). Ten rows are wrong as a result; see "Verifier
   corrections to c.1" after the table.
2. 44 of the 62 `port_whole_reapply_vv` rows import TV modules that VV does not have (Appendix D). Three of them import
   TV's Cloudflare client with no transport seam listed.
3. `VV ver (local)` comes from `drift_all.tsv`, which reads the PORT NOTE "Source version" line where one exists (B8
   verifier note).

| # | TV path | TV ver | VV path | VV ver (local) | VV last port / TV app cite | State (diff lines) | TV dev-log entries after VV's last port | Recommended action | VV adaptation to re-apply |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__ActiveView__.js` | 1.0.0 | `02__Src__AppModules/42__System__DrawingViewCore/Na__DrawView__ActiveView__.js` | 1.0.0 | 07-Sep / - | header-only (21) | - | no_action | - |
| 2 | `02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__ConfigState__.js` | 1.0.1 | `02__Src__AppModules/42__System__DrawingViewCore/Na__DrawView__ConfigState__.js` | 1.0.0 | 09-Sep / - | header-only (35) | 13-Sep 1.0.1 | port_adapted | - |
| 3 | `02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__MarkupFocus__.js` | 1.1.0 | `02__Src__AppModules/42__System__DrawingViewCore/Na__DrawView__MarkupFocus__.js` | 1.1.0 | 31-Aug / - | header-only (20) | - | no_action | - |
| 4 | `02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__MarkupMount__.js` | 1.0.0 | `02__Src__AppModules/42__System__DrawingViewCore/Na__DrawView__MarkupMount__.js` | 1.0.0 | 07-Sep / - | drifted (54) | - | no_action (re-verify VV seams) | - |
| 5 | `02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__MaterialPreset__.js` | 1.1.0 | `02__Src__AppModules/42__System__DrawingViewCore/Na__DrawView__MaterialPreset__.js` | 1.1.0 | 09-Sep / - | drifted (45) | - | no_action (re-verify VV seams) | - |
| 6 | `02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__Navigation__.js` | 1.0.0 | `02__Src__AppModules/42__System__DrawingViewCore/Na__DrawView__Navigation__.js` | 1.0.0 | 07-Sep / - | header-only (17) | - | no_action | - |
| 7 | `02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js` | 1.6.0 | `02__Src__AppModules/42__System__DrawingViewCore/Na__DrawView__ProjectData__.js` | 1.2.0 | 20-Sep / - | drifted (742) | 21-Sep 1.4.0; 22-Sep 1.6.0; 22-Sep 1.5.0 | port_whole_reapply_vv | Keep VV transport: Na__DrawData__Save -> GET-merge + Na__AppUtils__R2SaveProjectJson (R2 + Flask mirror); TV writes via Na__CfApi__MergeAndSaveKeys (DIV-4) |
| 8 | `02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenameDrawing__.js` | 1.1.0 | `02__Src__AppModules/42__System__DrawingViewCore/Na__DrawView__RenameDrawing__.js` | 1.0.0 | 10-Sep / - | drifted (144) | 20-Sep 1.1.0 | port_adapted | Loader re-stamp path (VV lazy editor); fourth holder = CrossSection binding key |
| 9 | `02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RowAccordion__.js` | - | `02__Src__AppModules/42__System__DrawingViewCore/Na__DrawView__RowAccordion__.js` | - | - / - | drifted (122) | - | no_action (re-verify VV seams) | - |
| 10 | `02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__SceneLinkRow__.js` | 1.0.0 | `02__Src__AppModules/42__System__DrawingViewCore/Na__DrawView__SceneLinkRow__.js` | 1.0.0 | 07-Sep / - | header-only (17) | - | no_action | - |
| 11 | `02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js` | 1.0.0 | `02__Src__AppModules/42__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js` | 1.2.0 | 09-Sep / - | drifted (515) | 10-Sep 1.0.0 | keep_vv_divergence | Permanent DIV-2: VV wraps 41__System__CrossSectionView; never take TV file |
| 12 | `02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__StyleRows__.js` | 1.0.0 | `02__Src__AppModules/42__System__DrawingViewCore/Na__DrawView__StyleRows__.js` | 1.0.0 | 09-Sep / - | header-only (12) | - | no_action | - |
| 13 | `02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__Styles__DevMenu__.css` | - | `02__Src__AppModules/42__System__DrawingViewCore/Na__DrawView__Styles__DevMenu__.css` | - | - / - | drifted (138) | - | no_action (re-verify VV seams) | - |
| 14 | `02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__Transitions__.js` | 1.1.0 | `02__Src__AppModules/42__System__DrawingViewCore/Na__DrawView__Transitions__.js` | 1.1.0 | 09-Sep / - | drifted (102) | 21-Sep 1.1.0 [2.110.0] | port_adapted | - |
| 15 | `02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__ConfigState__.js` | 1.1.0 | `02__Src__AppModules/43__System__FloorPlanViews/Na__FloorPlan__ConfigState__.js` | 1.0.0 | 31-Aug / - | drifted (48) | 20-Sep 1.1.0 | port_adapted | - |
| 16 | `02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__DevMenu__Editor__.js` | 2.0.0 | `02__Src__AppModules/43__System__FloorPlanViews/Na__FloorPlan__DevMenu__Editor__.js` | 1.0.0 | 15-Sep / - | drifted (1280) | 20-Sep 2.0.0 [2.21.0]; 20-Sep 1.1.0 | port_whole_reapply_vv | Keep VV Add Ground Floor Plan, ThumbnailBake queueing, confirm dialog; TV 2.0.0 menu rebuild needs DraftGuard/DevRowShell |
| 17 | `02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__DevMenu__RowBuilders__.js` | 2.0.0 | `02__Src__AppModules/43__System__FloorPlanViews/Na__FloorPlan__DevMenu__RowBuilders__.js` | 1.0.0 | 09-Sep / - | drifted (239) | 20-Sep 2.0.0 | port_adapted | - |
| 18 | `02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__Framing__.js` | 1.0.0 | `02__Src__AppModules/43__System__FloorPlanViews/Na__FloorPlan__Framing__.js` | 1.0.0 | 31-Aug / - | header-only (19) | - | no_action | - |
| 19 | `02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__ModeController__.js` | 1.1.0 | `02__Src__AppModules/43__System__FloorPlanViews/Na__FloorPlan__ModeController__.js` | 1.1.0 | 09-Sep / - | drifted (394) | - | no_action (re-verify VV seams) | - |
| 20 | `02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__OrthoCamera__.js` | 1.0.0 | `02__Src__AppModules/43__System__FloorPlanViews/Na__FloorPlan__OrthoCamera__.js` | 1.0.0 | 31-Aug / - | header-only (19) | - | no_action | - |
| 21 | `02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__ProjectJson__Data__.js` | 1.1.0 | `02__Src__AppModules/43__System__FloorPlanViews/Na__FloorPlan__ProjectJson__Data__.js` | 1.0.0 | 10-Sep / - | drifted (477) | 20-Sep 1.1.0 | port_whole_reapply_vv | - |
| 22 | `02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__SceneLink__.js` | 1.0.0 | `02__Src__AppModules/43__System__FloorPlanViews/Na__FloorPlan__SceneLink__.js` | 1.0.0 | 31-Aug / - | drifted (37) | - | no_action (re-verify VV seams) | - |
| 23 | `02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__Styles__DevMenu__.css` | - | `02__Src__AppModules/43__System__FloorPlanViews/Na__FloorPlan__Styles__DevMenu__.css` | - | - / - | drifted (60) | - | no_action (re-verify VV seams) | - |
| 24 | `02__Src__AppModules/43__System__PlanAnnotations/Na__PlanAnnotations__Data__.js` | 1.0.0 | `02__Src__AppModules/44__System__PlanAnnotations/Na__PlanAnnotations__Data__.js` | 1.0.0 | 31-Aug / - | header-only (21) | - | no_action | - |
| 25 | `02__Src__AppModules/43__System__PlanAnnotations/Na__PlanAnnotations__Editor__.js` | 1.0.0 | `02__Src__AppModules/44__System__PlanAnnotations/Na__PlanAnnotations__Editor__.js` | 1.0.0 | 31-Aug / - | header-only (28) | - | no_action | - |
| 26 | `02__Src__AppModules/43__System__PlanAnnotations/Na__PlanAnnotations__History__.js` | 1.1.0 | `02__Src__AppModules/44__System__PlanAnnotations/Na__PlanAnnotations__History__.js` | 1.1.0 | 31-Aug / - | header-only (22) | - | no_action | - |
| 27 | `02__Src__AppModules/43__System__PlanAnnotations/Na__PlanAnnotations__Hotkeys__.js` | 1.0.0 | `02__Src__AppModules/44__System__PlanAnnotations/Na__PlanAnnotations__Hotkeys__.js` | 1.0.0 | 31-Aug / - | header-only (22) | - | no_action | - |
| 28 | `02__Src__AppModules/43__System__PlanAnnotations/Na__PlanAnnotations__Overlay__.js` | 1.1.0 | `02__Src__AppModules/44__System__PlanAnnotations/Na__PlanAnnotations__Overlay__.js` | 1.1.0 | 07-Sep / - | header-only (21) | - | no_action | - |
| 29 | `02__Src__AppModules/43__System__PlanAnnotations/Na__PlanAnnotations__Styles__.css` | - | `02__Src__AppModules/44__System__PlanAnnotations/Na__PlanAnnotations__Styles__.css` | - | - / - | header-only (8) | - | no_action | - |
| 30 | `02__Src__AppModules/43__System__PlanAnnotations/Na__PlanAnnotations__Toolbar__.js` | 1.1.0 | `02__Src__AppModules/44__System__PlanAnnotations/Na__PlanAnnotations__Toolbar__.js` | 1.0.0 | 31-Aug / - | drifted (52) | 21-Sep 1.1.0 | port_adapted | - |
| 31 | `02__Src__AppModules/44__System__PlanDimensions/Na__PlanDimensions__AxisLock__.js` | 1.0.0 | `02__Src__AppModules/45__System__PlanDimensions/Na__PlanDimensions__AxisLock__.js` | 1.0.0 | 31-Aug / - | header-only (20) | - | no_action | - |
| 32 | `02__Src__AppModules/44__System__PlanDimensions/Na__PlanDimensions__ClientMode__.js` | 1.0.0 | `02__Src__AppModules/45__System__PlanDimensions/Na__PlanDimensions__ClientMode__.js` | 1.0.0 | 31-Aug / - | header-only (26) | - | no_action | - |
| 33 | `02__Src__AppModules/44__System__PlanDimensions/Na__PlanDimensions__ConfigState__.js` | 1.0.0 | `02__Src__AppModules/45__System__PlanDimensions/Na__PlanDimensions__ConfigState__.js` | 1.0.0 | 09-Sep / - | header-only (18) | - | no_action | - |
| 34 | `02__Src__AppModules/44__System__PlanDimensions/Na__PlanDimensions__Crosshair__.js` | 1.0.0 | `02__Src__AppModules/45__System__PlanDimensions/Na__PlanDimensions__Crosshair__.js` | 1.0.0 | 31-Aug / - | header-only (20) | - | no_action | - |
| 35 | `02__Src__AppModules/44__System__PlanDimensions/Na__PlanDimensions__Data__.js` | 1.0.0 | `02__Src__AppModules/45__System__PlanDimensions/Na__PlanDimensions__Data__.js` | 1.0.0 | 31-Aug / - | drifted (393) | - | no_action (re-verify VV seams) | - |
| 36 | `02__Src__AppModules/44__System__PlanDimensions/Na__PlanDimensions__Disclaimer__.js` | 1.0.0 | `02__Src__AppModules/45__System__PlanDimensions/Na__PlanDimensions__Disclaimer__.js` | 1.0.0 | 31-Aug / - | header-only (20) | - | no_action | - |
| 37 | `02__Src__AppModules/44__System__PlanDimensions/Na__PlanDimensions__EditorPreview__.js` | 1.0.0 | `02__Src__AppModules/45__System__PlanDimensions/Na__PlanDimensions__EditorPreview__.js` | 1.0.0 | 09-Sep / - | header-only (14) | - | no_action | - |
| 38 | `02__Src__AppModules/44__System__PlanDimensions/Na__PlanDimensions__Editor__.js` | 1.0.0 | `02__Src__AppModules/45__System__PlanDimensions/Na__PlanDimensions__Editor__.js` | 1.0.0 | 31-Aug / - | drifted (145) | - | no_action (re-verify VV seams) | - |
| 39 | `02__Src__AppModules/44__System__PlanDimensions/Na__PlanDimensions__Grid__.js` | 1.0.0 | `02__Src__AppModules/45__System__PlanDimensions/Na__PlanDimensions__Grid__.js` | 1.0.0 | 31-Aug / - | header-only (17) | - | no_action | - |
| 40 | `02__Src__AppModules/44__System__PlanDimensions/Na__PlanDimensions__History__.js` | 1.0.0 | `02__Src__AppModules/45__System__PlanDimensions/Na__PlanDimensions__History__.js` | 1.0.0 | 31-Aug / - | header-only (25) | - | no_action | - |
| 41 | `02__Src__AppModules/44__System__PlanDimensions/Na__PlanDimensions__Hotkeys__.js` | 1.0.0 | `02__Src__AppModules/45__System__PlanDimensions/Na__PlanDimensions__Hotkeys__.js` | 1.0.0 | 31-Aug / - | header-only (27) | - | no_action | - |
| 42 | `02__Src__AppModules/44__System__PlanDimensions/Na__PlanDimensions__Overlay__.js` | 1.0.0 | `02__Src__AppModules/45__System__PlanDimensions/Na__PlanDimensions__Overlay__.js` | 1.0.0 | 31-Aug / - | header-only (32) | - | no_action | - |
| 43 | `02__Src__AppModules/44__System__PlanDimensions/Na__PlanDimensions__Styles__.css` | 1.0.0 | `02__Src__AppModules/45__System__PlanDimensions/Na__PlanDimensions__Styles__.css` | 1.0.0 | 31-Aug / - | header-only (6) | - | no_action | - |
| 44 | `02__Src__AppModules/44__System__PlanDimensions/Na__PlanDimensions__VertexEditor__.js` | 1.0.0 | `02__Src__AppModules/45__System__PlanDimensions/Na__PlanDimensions__VertexEditor__.js` | 1.0.0 | 31-Aug / - | header-only (30) | - | no_action | - |
| 45 | `02__Src__AppModules/45__System__ElevationViews/Na__Elevation__ConfigState__.js` | 1.0.0 | `02__Src__AppModules/46__System__ElevationViews/Na__Elevation__ConfigState__.js` | 1.0.0 | 07-Sep / - | drifted (56) | - | no_action (re-verify VV seams) | - |
| 46 | `02__Src__AppModules/45__System__ElevationViews/Na__Elevation__DevMenu__Editor__.js` | 2.1.0 | `02__Src__AppModules/46__System__ElevationViews/Na__Elevation__DevMenu__Editor__.js` | 1.0.0 | 15-Sep / - | drifted (1549) | 20-Sep 2.1.0; 20-Sep 2.0.0 [2.21.0]; 20-Sep 1.1.0 | port_whole_reapply_vv | Keep VV mode-based group filing (D28), ThumbnailBake; TV 2.x rebuild (Aim at face, auto names) |
| 47 | `02__Src__AppModules/45__System__ElevationViews/Na__Elevation__DevMenu__RowBuilders__.js` | 2.1.0 | `02__Src__AppModules/46__System__ElevationViews/Na__Elevation__DevMenu__RowBuilders__.js` | 1.0.0 | 09-Sep / - | drifted (572) | 20-Sep 2.1.0; 20-Sep 2.0.0 | port_whole_reapply_vv | - |
| 48 | `02__Src__AppModules/45__System__ElevationViews/Na__Elevation__FacePick__.js` | 1.0.0 | `02__Src__AppModules/46__System__ElevationViews/Na__Elevation__FacePick__.js` | 1.0.0 | 09-Sep / - | header-only (14) | - | no_action | - |
| 49 | `02__Src__AppModules/45__System__ElevationViews/Na__Elevation__Framing__.js` | 1.0.0 | `02__Src__AppModules/46__System__ElevationViews/Na__Elevation__Framing__.js` | 1.0.0 | 07-Sep / - | header-only (19) | - | no_action | - |
| 50 | `02__Src__AppModules/45__System__ElevationViews/Na__Elevation__GizmoGrip__.js` | 1.0.0 | `02__Src__AppModules/46__System__ElevationViews/Na__Elevation__GizmoGrip__.js` | 1.0.0 | 09-Sep / - | header-only (14) | - | no_action | - |
| 51 | `02__Src__AppModules/45__System__ElevationViews/Na__Elevation__ModeController__.js` | 1.1.0 | `02__Src__AppModules/46__System__ElevationViews/Na__Elevation__ModeController__.js` | 1.0.0 | 09-Sep / - | drifted (381) | 20-Sep 1.1.0 | port_whole_reapply_vv | - |
| 52 | `02__Src__AppModules/45__System__ElevationViews/Na__Elevation__OrthoCamera__.js` | 1.0.0 | `02__Src__AppModules/46__System__ElevationViews/Na__Elevation__OrthoCamera__.js` | 1.0.0 | 07-Sep / - | header-only (17) | - | no_action | - |
| 53 | `02__Src__AppModules/45__System__ElevationViews/Na__Elevation__PlaneGizmo__.js` | 1.0.0 | `02__Src__AppModules/46__System__ElevationViews/Na__Elevation__PlaneGizmo__.js` | 1.0.0 | 07-Sep / - | drifted (47) | - | no_action (re-verify VV seams) | - |
| 54 | `02__Src__AppModules/45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js` | 1.1.0 | `02__Src__AppModules/46__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js` | 1.0.0 | 10-Sep / - | drifted (518) | 20-Sep 1.1.0 | port_whole_reapply_vv | - |
| 55 | `02__Src__AppModules/45__System__ElevationViews/Na__Elevation__SceneLink__.js` | 1.0.0 | `02__Src__AppModules/46__System__ElevationViews/Na__Elevation__SceneLink__.js` | 1.0.0 | 09-Sep / - | drifted (140) | - | no_action (re-verify VV seams) | VV files sections into Cross Sections (D28); TV files all into Elevations - decision |
| 56 | `02__Src__AppModules/45__System__ElevationViews/Na__Elevation__Styles__DevMenu__.css` | - | `02__Src__AppModules/46__System__ElevationViews/Na__Elevation__Styles__DevMenu__.css` | - | - / - | drifted (181) | - | no_action (re-verify VV seams) | - |
| 57 | `02__Src__AppModules/46__System__NorthDirection/Na__North__CompassGizmo__.js` | 1.1.0 | `02__Src__AppModules/47__System__NorthDirection/Na__North__CompassGizmo__.js` | 1.0.0 | 20-Sep / v2.85.0 | drifted (96) | - | no_action (re-verify VV seams) | VV shows compass only while panel open (no InteractiveOverlays registry) |
| 58 | `02__Src__AppModules/46__System__NorthDirection/Na__North__Compass__.js` | 1.0.0 | `02__Src__AppModules/47__System__NorthDirection/Na__North__Compass__.js` | 1.0.0 | 20-Sep / v2.85.0 | header-only (14) | - | no_action | - |
| 59 | `02__Src__AppModules/46__System__NorthDirection/Na__North__ConfigState__.js` | 1.0.0 | `02__Src__AppModules/47__System__NorthDirection/Na__North__ConfigState__.js` | 1.0.0 | 20-Sep / v2.85.0 | header-only (18) | - | no_action | - |
| 60 | `02__Src__AppModules/46__System__NorthDirection/Na__North__DevMenu__Editor__.js` | 1.1.0 | `02__Src__AppModules/47__System__NorthDirection/Na__North__DevMenu__Editor__.js` | 1.0.0 | 20-Sep / v2.85.0 | drifted (120) | - | no_action (re-verify VV seams) | Same as CompassGizmo |
| 61 | `02__Src__AppModules/46__System__NorthDirection/Na__North__PickTool__.js` | 1.0.0 | `02__Src__AppModules/47__System__NorthDirection/Na__North__PickTool__.js` | 1.0.0 | 20-Sep / v2.85.0 | header-only (18) | - | no_action | - |
| 62 | `02__Src__AppModules/46__System__NorthDirection/Na__North__ProjectJson__Data__.js` | 1.0.0 | `02__Src__AppModules/47__System__NorthDirection/Na__North__ProjectJson__Data__.js` | 1.0.0 | 20-Sep / v2.85.0 | drifted (38) | - | no_action (re-verify VV seams) | - |
| 63 | `02__Src__AppModules/46__System__NorthDirection/Na__North__Styles__DevMenu__.css` | 1.0.0 | `02__Src__AppModules/47__System__NorthDirection/Na__North__Styles__DevMenu__.css` | 1.0.0 | 20-Sep / - | header-only (13) | - | no_action | - |
| 64 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__AuthoredEdges__.js` | 1.2.0 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__AuthoredEdges__.js` | 1.1.0 | 13-Sep / - | drifted (116) | 14-Sep 1.2.0 | port_adapted | - |
| 65 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__ClipKernel__.js` | - | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__ClipKernel__.js` | - | 13-Sep / - | drifted (51) | 14-Sep 1.2.0 | port_adapted | - |
| 66 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__ClipWorker__.js` | 1.0.0 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__ClipWorker__.js` | 1.1.0 | 13-Sep / - | header-only (30) | - | no_action | - |
| 67 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__ConfigAccess__.js` | 1.2.0 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__ConfigAccess__.js` | 1.0.1 | 18-Sep / - | drifted (101) | 21-Sep 1.2.0 | port_adapted | - |
| 68 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__CpuBackend__.js` | - | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__CpuBackend__.js` | 1.2.1 | 18-Sep / - | drifted (113) | 21-Sep 1.4.0 | port_adapted | - |
| 69 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__DevMenu__Controls__.js` | 1.1.0 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__DevMenu__Controls__.js` | 1.1.0 | 13-Sep / - | drifted (62) | 14-Sep 1.1.0 | port_adapted | - |
| 70 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__DiffHarness__.js` | 1.0.0 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__DiffHarness__.js` | 1.0.0 | 09-Sep / - | drifted (20) | - | no_action (re-verify VV seams) | - |
| 71 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__EdgeExtractor__.js` | 1.3.0 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__EdgeExtractor__.js` | 1.2.0 | 13-Sep / - | drifted (105) | 14-Sep 1.3.0 | port_adapted | - |
| 72 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__ExportCompositor__.js` | 1.0.0 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__ExportCompositor__.js` | 1.0.0 | 09-Sep / - | header-only (16) | - | no_action | - |
| 73 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__FlatBvh__.js` | - | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__FlatBvh__.js` | - | 09-Sep / - | header-only (14) | - | no_action | - |
| 74 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__ModelStage__.js` | 1.2.0 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__ModelStage__.js` | 1.1.0 | 18-Sep / - | header-only (56) | - | no_action | Fingerprint from VV model (no model groups) |
| 75 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__Owners__.js` | 1.0.0 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__Owners__.js` | 1.0.0 | 12-Sep / - | header-only (12) | - | no_action | - |
| 76 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__Persistence__.js` | 1.2.1 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__Persistence__.js` | 1.2.0 | 13-Sep / - | drifted (78) | 14-Sep 1.2.1 | port_adapted | VV R2AssetUpload worker route + Flask mirror; localhost authoring gate |
| 77 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__Pipeline__.js` | 1.5.0 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__Pipeline__.js` | 1.1.0 | 10-Sep / - | drifted (148) | 13-Sep 1.2.0; 14-Sep 1.4.0; 14-Sep 1.3.0; 21-Sep 1.5.0 | port_whole_reapply_vv | - |
| 78 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__Projector__.js` | 1.5.0 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__Projector__.js` | 1.1.1 | 18-Sep / - | drifted (175) | 21-Sep 1.5.0 | port_adapted | - |
| 79 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__RasterPreview__.js` | 1.0.0 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__RasterPreview__.js` | 1.0.0 | 09-Sep / - | header-only (18) | - | no_action | - |
| 80 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__Scheduler__.js` | 1.0.0 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__Scheduler__.js` | - | 09-Sep / - | header-only (14) | - | no_action | - |
| 81 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__SoupBuilder__.js` | 1.0.0 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__SoupBuilder__.js` | 1.0.0 | 09-Sep / - | header-only (15) | - | no_action | - |
| 82 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__StageSampler__.js` | 1.2.0 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__StageSampler__.js` | 1.1.0 | 13-Sep / - | drifted (118) | 14-Sep 1.1.0; 20-Sep 1.2.0 | port_adapted | VV model root/helper flags; category tokens ValeVision__ |
| 83 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__Styles__Main__.css` | - | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__Styles__Main__.css` | - | - / - | header-only (4) | - | no_action | - |
| 84 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__SvgOverlay__.js` | 1.0.0 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__SvgOverlay__.js` | 1.0.0 | 09-Sep / - | header-only (18) | - | no_action | - |
| 85 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__ViewDefinition__.js` | 1.2.0 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__ViewDefinition__.js` | 1.0.0 | 09-Sep / - | drifted (122) | 14-Sep 1.2.0; 14-Sep 1.1.0 | port_adapted | - |
| 86 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__WebGpuBackend__.js` | - | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__WebGpuBackend__.js` | - | 09-Sep / - | drifted (53) | - | no_action (re-verify VV seams) | - |
| 87 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__WorkerPool__.js` | 1.0.0 | `02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__WorkerPool__.js` | 1.1.0 | 13-Sep / - | drifted (31) | - | no_action (re-verify VV seams) | - |
| 88 | `02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__.js` | 1.29.0 | `02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__.js` | 1.17.0 | 20-Sep / v2.52.0 | drifted (197) | 21-Sep 1.28.0; 21-Sep 1.27.0; 22-Sep 1.29.0 | port_whole_reapply_vv | - |
| 89 | `02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__EditorSetup__.js` | 1.6.0 | `02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__EditorSetup__.js` | 1.0.0 | 15-Sep / - | drifted (285) | 19-Sep 1.1.0; 21-Sep 1.3.0; 21-Sep 1.2.0; 21-Sep 1.1.1; 22-Sep 1.4.0; 23-Sep 1.5.0; 29-Sep 1.6.0 | port_whole_reapply_vv | - |
| 90 | `02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__KeyMap__.js` | 1.11.0 | `02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__KeyMap__.js` | 1.0.0 | 15-Sep / - | drifted (254) | 21-Sep 1.9.0; 21-Sep 1.8.0; 21-Sep 1.7.0; 21-Sep 1.6.0; 21-Sep 1.5.0; 21-Sep 1.4.0; 21-Sep 1.3.0; 21-Sep 1.2.0; 21-Sep 1.1.0; 22-Sep 1.11.0; 22-Sep 1.10.0 | port_whole_reapply_vv | - |
| 91 | `02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__Readers__.js` | 1.0.0 | `02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__Readers__.js` | 1.0.0 | 15-Sep / - | header-only (12) | - | no_action | - |
| 92 | `02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js` | 1.9.0 | `02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js` | 1.3.0 | 20-Sep / - | drifted (266) | 21-Sep 1.9.0; 21-Sep 1.8.0 | port_adapted | - |
| 93 | `02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__ToolSetup__.js` | 1.5.0 | `02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__ToolSetup__.js` | 1.0.0 | 15-Sep / - | drifted (89) | 19-Sep 1.1.0; 21-Sep 1.4.0; 21-Sep 1.3.0; 21-Sep 1.2.0; 22-Sep 1.5.0 | port_whole_reapply_vv | - |
| 94 | `02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js` | 1.1.0 | `02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js` | 1.0.0 | 20-Sep / v2.83.0 | drifted (234) | - | no_action (re-verify VV seams) | VV exports DrawingSettled for the loader; no text-metrics job (no PdfFonts) |
| 95 | `02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js` | 1.32.0 | `02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js` | 1.18.0 | 20-Sep / v2.57.0 | drifted (828) | 21-Sep 1.28.0; 21-Sep 1.27.0; 21-Sep 1.26.0; 21-Sep 1.25.0; 21-Sep 1.24.0; 21-Sep 1.23.0; 21-Sep 1.22.0; 21-Sep 1.21.0 [2.57.0,2.104.0]; 22-Sep 1.29.0; 23-Sep 1.30.0; 29-Sep 1.32.0 [2.166.0]; 29-Sep 1.31.0 | port_whole_reapply_vv | VV initialised by 01__Core__Loader; WaitForFirstDrawing; IsAvailable = Layout Mode on AND a sheet |
| 96 | `02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__TabStrip__.js` | 2.0.0 | `02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__TabStrip__.js` | 1.5.0 | 19-Sep / v2.70.0 | drifted (656) | 23-Sep 2.0.0 | port_whole_reapply_vv | Reads go through the loader facade (Na__LeLoad__*); Layout Mode gate (D22) |
| 97 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__Assets__.js` | 1.0.1 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__Assets__.js` | 1.0.0 | 09-Sep / - | drifted (48) | 14-Sep 1.0.1 | port_adapted | - |
| 98 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__AutoSave__.js` | 1.5.0 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__AutoSave__.js` | 1.3.0 | 20-Sep / v2.67.0 | drifted (314) | 22-Sep 1.5.0; 22-Sep 1.4.0 | port_whole_reapply_vv | No TrueVision__Pwa__HasUnsavedWork reader in VV (shared Whitecardopedia worker) |
| 99 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__DrawingScale__.js` | 1.0.0 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__DrawingScale__.js` | 1.0.0 | 14-Sep / v2.46.0 | header-only (14) | - | no_action | - |
| 100 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__History__.js` | 1.7.0 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__History__.js` | 1.3.0 | 20-Sep / v2.35.0 | drifted (112) | 21-Sep 1.7.0 | port_adapted | - |
| 101 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__ProjectRecord__.js` | 1.1.0 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__ProjectRecord__.js` | 1.0.0 | 20-Sep / - | drifted (235) | - | keep_vv_divergence (re-check hunks) | Permanent: reads project config (clientDrawingName, siteAddress), no Project Admin fetch |
| 102 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__ScaleManager__.js` | 1.2.1 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__ScaleManager__.js` | 1.0.0 | 09-Sep / - | header-only (72) | 14-Sep 1.1.0; 17-Sep 1.2.0; 21-Sep 1.2.1 | port_whole_reapply_vv | No site plan scale list (IsListed asks one list) until site plans decided |
| 103 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetLayout__.js` | 1.2.0 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetLayout__.js` | 1.2.0 | 15-Sep / - | header-only (16) | - | no_action | - |
| 104 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__.js` | - | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__.js` | - | 20-Sep / v2.52.0 | drifted (502) | 21-Sep 1.33.0; 21-Sep 1.32.0; 21-Sep 1.31.0; 21-Sep 1.30.0; 21-Sep 1.29.0; 21-Sep 1.28.0; 22-Sep 1.35.1 [2.147.0]; 22-Sep 1.35.0; 22-Sep 1.34.0 | port_whole_reapply_vv | - |
| 105 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__Common__.js` | 1.0.0 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__Common__.js` | 1.0.0 | 20-Sep / - | header-only (51) | - | no_action | - |
| 106 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__DrawOrder__.js` | 1.0.0 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__DrawOrder__.js` | 1.0.0 | 15-Sep / - | header-only (8) | - | no_action | - |
| 107 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__Groups__.js` | 1.3.0 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__Groups__.js` | 1.1.0 | 20-Sep / - | drifted (64) | 21-Sep 1.2.0; 22-Sep 1.3.0 | port_adapted | - |
| 108 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__Layers__.js` | 1.4.0 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__Layers__.js` | 1.0.0 | 15-Sep / - | drifted (349) | 21-Sep 1.4.0; 21-Sep 1.3.0; 21-Sep 1.2.1; 21-Sep 1.2.0; 21-Sep 1.1.0 | port_whole_reapply_vv | - |
| 109 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__Leaders__.js` | 1.2.0 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__Leaders__.js` | 1.1.0 | 18-Sep / - | header-only (32) | 22-Sep 1.2.0 | port_adapted | - |
| 110 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__Shapes__.js` | 1.6.0 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__Shapes__.js` | 1.0.0 | 15-Sep / - | drifted (216) | 21-Sep 1.5.0; 21-Sep 1.4.0; 21-Sep 1.3.0; 21-Sep 1.2.1; 21-Sep 1.2.0; 21-Sep 1.1.0; 22-Sep 1.6.0 | port_whole_reapply_vv | - |
| 111 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__Sheets__.js` | 1.4.0 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__Sheets__.js` | 1.1.0 | 19-Sep / v2.70.0 | drifted (435) | 21-Sep 1.2.0; 22-Sep 1.4.0; 22-Sep 1.3.0 | port_whole_reapply_vv | - |
| 112 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__State__.js` | 1.2.0 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__State__.js` | 1.1.0 | 20-Sep / - | drifted (69) | 21-Sep 1.2.0 | port_adapted | - |
| 113 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__TextAndDimensions__.js` | 1.2.0 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__TextAndDimensions__.js` | 1.1.0 | 20-Sep / - | drifted (43) | 21-Sep 1.1.0; 22-Sep 1.2.0 | port_adapted | - |
| 114 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__Viewports__.js` | 1.4.0 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__Viewports__.js` | 1.1.0 | 20-Sep / - | drifted (165) | 21-Sep 1.3.0; 21-Sep 1.2.0; 22-Sep 1.4.0 | port_whole_reapply_vv | - |
| 115 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js` | 1.39.0 | `02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js` | 1.15.0 | 20-Sep / v2.70.0 | drifted (1229) | 21-Sep 1.34.0; 21-Sep 1.33.0; 21-Sep 1.32.0; 21-Sep 1.31.0; 21-Sep 1.30.0; 21-Sep 1.29.0; 21-Sep 1.28.0; 21-Sep 1.27.0; 21-Sep 1.26.0; 21-Sep 1.25.0; 21-Sep 1.24.0; 22-Sep 1.38.0; 22-Sep 1.37.0; 22-Sep 1.36.0; 22-Sep 1.35.0; 23-Sep 1.39.0 | port_whole_reapply_vv | DrawingCode__ leaf re-export; no register/DocumentId; one drawing type |
| 116 | `02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Controls__Pc__.js` | 1.4.0 | `02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Controls__Pc__.js` | 1.1.0 | 14-Sep / - | drifted (165) | 21-Sep 1.4.0; 21-Sep 1.3.0 [2.110.0]; 21-Sep 1.2.0 | port_whole_reapply_vv | - |
| 117 | `02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Controls__TouchScreen__.js` | 1.1.0 | `02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Controls__TouchScreen__.js` | 1.0.0 | 10-Sep / - | header-only (21) | 21-Sep 1.1.0 | port_adapted | - |
| 118 | `02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Navigation__.js` | 1.3.0 | `02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Navigation__.js` | 1.1.0 | 10-Sep / - | drifted (56) | 21-Sep 1.3.0; 21-Sep 1.2.0 | port_adapted | - |
| 119 | `02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js` | 1.14.0 | `02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js` | 1.5.0 | 15-Sep / v2.52.0 | drifted (433) | 17-Sep 1.8.0; 19-Sep 1.9.0; 21-Sep 1.13.0; 21-Sep 1.12.0; 21-Sep 1.11.0; 21-Sep 1.10.0; 22-Sep 1.14.0 | port_whole_reapply_vv | Helvetica measuring face (no PdfFonts) |
| 120 | `02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__SheetSurface__.js` | 1.13.0 | `02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__SheetSurface__.js` | 1.6.0 | 18-Sep / v2.34.0 | drifted (499) | 21-Sep 1.12.0; 21-Sep 1.11.0; 21-Sep 1.10.0; 21-Sep 1.9.0; 21-Sep 1.8.0; 21-Sep 1.7.0; 22-Sep 1.13.0 | port_whole_reapply_vv | - |
| 121 | `02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css` | - | `02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css` | - | - / v2.46.0 | drifted (249) | - | no_action (re-verify VV seams) | - |
| 122 | `02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css` | - | `02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css` | - | - / v2.45.0 | drifted (429) | - | no_action (re-verify VV seams) | - |
| 123 | `02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Surfaces__.css` | - | `02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Surfaces__.css` | - | - / v2.72.0 | header-only (35) | - | no_action | - |
| 124 | `02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Cells__.js` | 1.2.0 | `02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Cells__.js` | 1.0.0 | 20-Sep / - | drifted (91) | 21-Sep 1.2.0 | port_adapted | - |
| 125 | `02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Classic__.js` | 1.0.0 | `02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Classic__.js` | 1.0.0 | 09-Sep / - | header-only (12) | - | no_action | VV-only meaning: Vale scan (TD04) |
| 126 | `02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Modern__.js` | 1.5.0 | `02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Modern__.js` | 1.2.0 | 20-Sep / v2.79.0 | drifted (166) | 21-Sep 1.5.0 | port_adapted | Vale logo + cell, Helvetica-measured widths, Drawing No. (not Document ID) |
| 127 | `02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__DimensionGeometry__.js` | 1.6.0 | `02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__DimensionGeometry__.js` | 1.2.0 | 14-Sep / v2.31.0 | drifted (131) | 23-Sep 1.6.0 | port_adapted | - |
| 128 | `02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__Groups__.js` | 1.4.0 | `02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__Groups__.js` | 1.2.0 | 20-Sep / - | drifted (133) | 22-Sep 1.4.0 [2.141.0]; 22-Sep 1.3.0 | port_adapted | - |
| 129 | `02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__LeaderGeometry__.js` | 1.3.0 | `02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__LeaderGeometry__.js` | 1.0.0 | 14-Sep / - | drifted (153) | 18-Sep 1.2.0; 22-Sep 1.3.0 | port_adapted | - |
| 130 | `02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__MarkupBridge__.js` | 1.20.0 | `02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__MarkupBridge__.js` | 1.10.0 | 17-Sep / v2.52.0 | drifted (484) | 18-Sep 1.13.0; 21-Sep 1.18.0; 21-Sep 1.17.0; 21-Sep 1.16.0; 21-Sep 1.15.0; 21-Sep 1.14.0; 22-Sep 1.19.0; 23-Sep 1.20.0 | port_whole_reapply_vv | - |
| 131 | `02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__MeasureParse__.js` | 1.1.0 | `02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__MeasureParse__.js` | 1.0.0 | 14-Sep / v2.46.0 | drifted (57) | 21-Sep 1.1.0 | port_adapted | - |
| 132 | `02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__ShapeGeometry__.js` | 1.9.0 | `02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__ShapeGeometry__.js` | 1.5.0 | 14-Sep / v2.45.0 | drifted (281) | 21-Sep 1.8.0; 21-Sep 1.7.0; 21-Sep 1.6.0; 22-Sep 1.9.0 | port_whole_reapply_vv | - |
| 133 | `02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__ForceRender__.js` | 1.1.0 | `02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__ForceRender__.js` | 1.1.0 | 18-Sep / - | header-only (12) | - | no_action | - |
| 134 | `02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__RasterQuality__.js` | 1.0.0 | `02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__RasterQuality__.js` | 1.0.0 | 10-Sep / - | header-only (13) | - | no_action | - |
| 135 | `02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__.js` | 1.16.0 | `02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__.js` | 1.8.0 | 18-Sep / - | drifted (337) | 20-Sep 1.12.0; 21-Sep 1.15.0; 21-Sep 1.14.0; 21-Sep 1.13.0; 29-Sep 1.16.0 | port_whole_reapply_vv | No SitePlan unit; Render2d stillWanted arg position |
| 136 | `02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__Frame__.js` | 1.4.0 | `02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__Frame__.js` | 1.1.0 | 18-Sep / - | drifted (261) | 20-Sep 1.2.0; 21-Sep 1.4.0; 21-Sep 1.3.0 | port_whole_reapply_vv | - |
| 137 | `02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__Linework__.js` | 1.2.0 | `02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__Linework__.js` | 1.1.0 | 18-Sep / - | drifted (123) | 20-Sep 1.2.0 | port_adapted | - |
| 138 | `02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__Window__.js` | 1.2.0 | `02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__Window__.js` | 1.0.0 | 15-Sep / - | drifted (93) | 21-Sep 1.2.0; 21-Sep 1.1.0 | port_adapted | - |
| 139 | `02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport3dZoom__.js` | 1.1.0 | `02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport3dZoom__.js` | 1.0.0 | 14-Sep / v2.50.0 | header-only (20) | 21-Sep 1.1.0 | port_adapted | - |
| 140 | `02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport3d__.js` | 1.8.1 | `02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport3d__.js` | 1.6.1 | 28-Sep / - | drifted (157) | - | no_action (re-verify VV seams) | VV tiled renderer per-tile shear; scene lighting fingerprint |
| 141 | `02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__ViewportClipboard__.js` | - | `02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__ViewportClipboard__.js` | - | 18-Sep / v2.44.0 | drifted (43) | 21-Sep 1.4.0; 21-Sep 1.3.0 | port_adapted | - |
| 142 | `02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__ViewportHandles__.js` | 1.5.0 | `02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__ViewportHandles__.js` | 1.4.0 | 14-Sep / v2.34.0 | drifted (274) | 21-Sep 1.5.0 | port_adapted | - |
| 143 | `02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__ViewportIdentity__.js` | 1.1.0 | `02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__ViewportIdentity__.js` | 1.0.0 | 20-Sep / v2.85.0 | drifted (152) | - | no_action (re-verify VV seams) | PhaseOf unknown (no Model Source), no site plan branch |
| 144 | `02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__ViewportTitleText__.js` | 1.1.0 | `02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__ViewportTitleText__.js` | 1.0.0 | 20-Sep / v2.85.0 | drifted (141) | - | no_action (re-verify VV seams) | - |
| 145 | `02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__EdgeStyles__.js` | 1.1.0 | `02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__EdgeStyles__.js` | 1.0.0 | 12-Sep / - | drifted (133) | 14-Sep 1.1.0 | port_adapted | - |
| 146 | `02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__Enhance__.js` | 1.1.0 | `02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__Enhance__.js` | 1.0.0 | 10-Sep / - | drifted (98) | 20-Sep 1.1.0 | port_adapted | - |
| 147 | `02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__ModelLayers__.js` | 1.4.0 | `02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__ModelLayers__.js` | 1.1.0 | 13-Sep / - | drifted (111) | 14-Sep 1.3.0; 20-Sep 1.4.0 | port_adapted | - |
| 148 | `02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__RenderComposites__.js` | 1.3.0 | `02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__RenderComposites__.js` | 1.1.0 | 13-Sep / - | drifted (76) | 20-Sep 1.3.0; 20-Sep 1.2.0 | port_adapted | - |
| 149 | `02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js` | 1.13.0 | `02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js` | 1.7.0 | 28-Sep / - | drifted (700) | - | no_action (re-verify VV seams) | DIV-1: ComposerPreset + LineworkSettings consumers instead of RenderPreset/Sobel quad |
| 150 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__AxisLock__.js` | 1.0.0 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__AxisLock__.js` | 1.0.0 | 10-Sep / - | header-only (16) | - | no_action | - |
| 151 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__ContextMenu__.js` | 1.1.0 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__ContextMenu__.js` | 1.0.0 | 10-Sep / - | drifted (303) | 21-Sep 1.1.0 | port_whole_reapply_vv | - |
| 152 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__EditScope__.js` | 1.4.0 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__EditScope__.js` | 1.1.0 | 17-Sep / - | drifted (233) | 21-Sep 1.2.0; 21-Sep 1.1.1; 22-Sep 1.4.0; 22-Sep 1.3.0 | port_whole_reapply_vv | - |
| 153 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__Eyedropper__.js` | - | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__Eyedropper__.js` | - | 17-Sep / v2.57.0 | drifted (114) | 21-Sep 1.9.0; 21-Sep 1.8.2; 21-Sep 1.8.1 | port_whole_reapply_vv | No Viewport__ShowFrame trait until frame toggle ported |
| 154 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__Grips__.js` | 1.12.0 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__Grips__.js` | 1.8.0 | 20-Sep / v2.52.0 | drifted (372) | 21-Sep 1.11.0; 21-Sep 1.10.0; 21-Sep 1.9.0; 22-Sep 1.12.0 | port_whole_reapply_vv | - |
| 155 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__ItemClipboard__.js` | 1.7.0 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__ItemClipboard__.js` | 1.2.0 | 20-Sep / - | drifted (540) | 21-Sep 1.6.0; 21-Sep 1.5.0; 21-Sep 1.4.0; 22-Sep 1.7.0 | port_whole_reapply_vv | - |
| 156 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__Measurements__.js` | 1.10.0 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__Measurements__.js` | 1.4.0 | 17-Sep / v2.47.0 | drifted (393) | 21-Sep 1.9.0; 21-Sep 1.8.0; 21-Sep 1.7.0; 21-Sep 1.6.0; 21-Sep 1.5.1; 22-Sep 1.10.0 | port_whole_reapply_vv | - |
| 157 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SelectionBox__.js` | 1.7.0 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SelectionBox__.js` | 1.4.0 | 17-Sep / v2.52.0 | drifted (91) | 21-Sep 1.6.0; 21-Sep 1.5.0; 22-Sep 1.7.0 | port_whole_reapply_vv | - |
| 158 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SelectionSet__.js` | 1.2.0 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SelectionSet__.js` | 1.0.0 | 14-Sep / - | drifted (218) | 21-Sep 1.1.0; 22-Sep 1.2.0 | port_adapted | - |
| 159 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__.js` | - | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__.js` | - | 17-Sep / v2.52.0 | drifted (373) | 19-Sep 1.31.0; 21-Sep 1.36.0; 21-Sep 1.35.0; 21-Sep 1.34.0; 21-Sep 1.33.0; 21-Sep 1.32.0; 22-Sep 1.39.0; 22-Sep 1.38.0; 22-Sep 1.37.0 | port_whole_reapply_vv | - |
| 160 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__ContentEditing__.js` | 1.0.0 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__ContentEditing__.js` | 1.0.0 | 15-Sep / - | header-only (6) | - | no_action | - |
| 161 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__ContextMenu__.js` | 1.7.0 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__ContextMenu__.js` | 1.2.0 | 18-Sep / v2.57.0 | drifted (235) | 21-Sep 1.5.0; 21-Sep 1.4.0; 21-Sep 1.3.0; 21-Sep 1.2.0; 22-Sep 1.7.0; 22-Sep 1.6.0 | port_whole_reapply_vv | - |
| 162 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__HitResolution__.js` | 1.11.0 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__HitResolution__.js` | 1.2.0 | 17-Sep / - | drifted (372) | 19-Sep 1.3.0; 21-Sep 1.8.0; 21-Sep 1.7.0; 21-Sep 1.6.0; 21-Sep 1.5.0; 21-Sep 1.4.0; 22-Sep 1.11.0; 22-Sep 1.10.0; 22-Sep 1.9.0 | port_whole_reapply_vv | - |
| 163 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__Keyboard__.js` | 1.18.0 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__Keyboard__.js` | 1.3.0 | 17-Sep / v2.58.0 | drifted (560) | 21-Sep 1.13.0; 21-Sep 1.12.0; 21-Sep 1.11.0; 21-Sep 1.10.0; 21-Sep 1.9.0; 21-Sep 1.8.0; 21-Sep 1.7.0; 22-Sep 1.18.0; 22-Sep 1.17.0; 22-Sep 1.16.0; 22-Sep 1.15.0; 22-Sep 1.14.0 | port_whole_reapply_vv | - |
| 164 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__PointerDrag__.js` | 1.19.0 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__PointerDrag__.js` | 1.4.0 | 17-Sep / - | drifted (1085) | 18-Sep 1.5.0; 19-Sep 1.6.0; 20-Sep 1.7.0; 21-Sep 1.16.0; 21-Sep 1.15.0; 21-Sep 1.14.0; 21-Sep 1.13.0; 21-Sep 1.12.0; 21-Sep 1.11.0; 21-Sep 1.10.0; 21-Sep 1.9.0; 21-Sep 1.8.0; 22-Sep 1.19.0; 22-Sep 1.18.0; 22-Sep 1.17.0 | port_whole_reapply_vv | - |
| 165 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__PointerPress__.js` | 1.10.0 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__PointerPress__.js` | 1.1.0 | 17-Sep / - | drifted (510) | 19-Sep 1.2.0; 21-Sep 1.6.0; 21-Sep 1.5.0; 21-Sep 1.4.0; 21-Sep 1.3.0; 22-Sep 1.9.0; 22-Sep 1.8.0; 22-Sep 1.7.0; 23-Sep 1.10.0 | port_whole_reapply_vv | - |
| 166 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__State__.js` | 1.8.0 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__State__.js` | 1.1.0 | 17-Sep / - | drifted (101) | 19-Sep 1.3.0; 21-Sep 1.7.0; 21-Sep 1.6.0; 21-Sep 1.5.0; 21-Sep 1.4.0; 22-Sep 1.8.0 | port_whole_reapply_vv | - |
| 167 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__ToolState__.js` | 1.7.0 | `02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__ToolState__.js` | 1.1.0 | 17-Sep / - | drifted (209) | 19-Sep 1.2.0; 21-Sep 1.5.0; 21-Sep 1.4.0; 21-Sep 1.3.0; 22-Sep 1.7.0; 22-Sep 1.6.0 | port_whole_reapply_vv | - |
| 168 | `02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools/Na__LayoutEditor__DimensionTool__.js` | 1.12.0 | `02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools/Na__LayoutEditor__DimensionTool__.js` | 1.5.0 | 14-Sep / v2.46.0 | drifted (163) | 21-Sep 1.12.0; 21-Sep 1.11.0; 21-Sep 1.10.0; 21-Sep 1.9.0; 21-Sep 1.8.0 | port_whole_reapply_vv | - |
| 169 | `02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools/Na__LayoutEditor__GradientTool__.js` | - | `02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools/Na__LayoutEditor__GradientTool__.js` | - | 13-Sep / - | drifted (47) | 22-Sep 1.1.0 | port_adapted | - |
| 170 | `02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools/Na__LayoutEditor__LeaderTool__.js` | 1.2.0 | `02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools/Na__LayoutEditor__LeaderTool__.js` | 1.0.0 | 14-Sep / - | header-only (31) | 21-Sep 1.2.0 | port_adapted | - |
| 171 | `02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools/Na__LayoutEditor__LineStyleTool__.js` | - | `02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools/Na__LayoutEditor__LineStyleTool__.js` | - | 14-Sep / - | drifted (83) | 23-Sep 1.1.0 | port_adapted | - |
| 172 | `02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools/Na__LayoutEditor__RectangleTool__.js` | 1.4.0 | `02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools/Na__LayoutEditor__RectangleTool__.js` | 1.2.0 | 14-Sep / v2.46.0 | drifted (66) | 21-Sep 1.3.0; 22-Sep 1.4.0 | port_adapted | - |
| 173 | `02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools/Na__LayoutEditor__ShapeTool__.js` | 1.10.0 | `02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools/Na__LayoutEditor__ShapeTool__.js` | 1.6.0 | 14-Sep / v2.46.0 | drifted (101) | 21-Sep 1.10.0; 21-Sep 1.9.0; 21-Sep 1.8.0; 21-Sep 1.7.0 | port_whole_reapply_vv | - |
| 174 | `02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools/Na__LayoutEditor__TextTool__.js` | 1.4.0 | `02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools/Na__LayoutEditor__TextTool__.js` | 1.3.0 | 15-Sep / v2.52.0 | header-only (24) | 21-Sep 1.4.0 | port_adapted | - |
| 175 | `02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__PanelHost__.js` | 1.6.0 | `02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__PanelHost__.js` | 1.4.0 | 20-Sep / v2.57.0 | drifted (196) | 21-Sep 1.6.0 | port_adapted | - |
| 176 | `02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__Dimensions__.js` | 1.7.0 | `02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__Dimensions__.js` | 1.4.0 | 17-Sep / v2.57.0 | drifted (303) | 21-Sep 1.6.0; 23-Sep 1.7.0 | port_whole_reapply_vv | - |
| 177 | `02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__Layers__.js` | 1.3.0 | `02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__Layers__.js` | 1.1.0 | 13-Sep / - | drifted (68) | 21-Sep 1.2.0; 21-Sep 1.1.1; 23-Sep 1.3.0 | port_whole_reapply_vv | - |
| 178 | `02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__Leaders__.js` | 1.2.0 | `02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__Leaders__.js` | 1.2.0 | 17-Sep / v2.57.0 | drifted (30) | - | no_action (re-verify VV seams) | - |
| 179 | `02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__ModelLayers__.js` | 1.3.0 | `02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__ModelLayers__.js` | 1.1.0 | 13-Sep / - | drifted (66) | 14-Sep 1.3.0 | port_adapted | - |
| 180 | `02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__Shapes__.js` | 1.9.0 | `02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__Shapes__.js` | 1.8.0 | 17-Sep / v2.57.0 | drifted (300) | 21-Sep 1.9.0; 21-Sep 1.8.2; 21-Sep 1.8.1 | port_whole_reapply_vv | - |
| 181 | `02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__Sheet__.js` | 1.4.0 | `02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__Sheet__.js` | 1.4.0 | 20-Sep / v2.70.0 | drifted (121) | - | no_action (re-verify VV seams) | - |
| 182 | `02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__Styles__.js` | 1.7.0 | `02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__Styles__.js` | 1.6.1 | 13-Sep / - | drifted (50) | 20-Sep 1.7.0 | port_adapted | - |
| 183 | `02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__Text__.js` | 1.4.0 | `02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__Text__.js` | 1.4.0 | 17-Sep / v2.57.0 | drifted (53) | - | no_action (re-verify VV seams) | - |
| 184 | `02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__ViewportSettings__.js` | 1.10.0 | `02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__ViewportSettings__.js` | 1.4.1 | 15-Sep / v2.44.0 | drifted (576) | 21-Sep 1.9.0; 21-Sep 1.8.0; 22-Sep 1.10.0 | port_whole_reapply_vv | - |
| 185 | `02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Styles__Panels__.css` | - | `02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Styles__Panels__.css` | - | - / - | drifted (214) | - | no_action (re-verify VV seams) | - |
| 186 | `02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js` | 1.24.0 | `02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js` | 1.9.0 | 19-Sep / v2.35.0 | drifted (366) | 21-Sep 1.22.0; 21-Sep 1.21.0; 21-Sep 1.20.0; 21-Sep 1.19.0; 21-Sep 1.18.0; 21-Sep 1.17.0; 21-Sep 1.16.0; 21-Sep 1.15.0; 21-Sep 1.14.0; 21-Sep 1.13.0; 29-Sep 1.24.0 [2.166.0]; 29-Sep 1.23.0 | port_whole_reapply_vv | Short-tab label; Save shared with Ctrl+S |
| 187 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__MarginGrip__.js` | 1.3.0 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__MarginGrip__.js` | 1.0.0 | 14-Sep / - | drifted (35) | 19-Sep 1.1.0; 21-Sep 1.2.0; 22-Sep 1.3.0 | port_whole_reapply_vv | - |
| 188 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__Panel__MarginNotes__.js` | 1.2.0 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__Panel__MarginNotes__.js` | 1.0.0 | 14-Sep / - | drifted (92) | 22-Sep 1.2.0; 22-Sep 1.1.0 | port_adapted | - |
| 189 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecData__.js` | - | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecData__.js` | - | 18-Sep / - | drifted (98) | 22-Sep 1.4.0; 29-Sep 1.5.0 | port_adapted | - |
| 190 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecData__Document__.js` | 1.1.0 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecData__Document__.js` | 1.0.0 | 15-Sep / - | drifted (119) | 29-Sep 1.1.0 | port_adapted | - |
| 191 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecData__Draft__.js` | 1.1.0 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecData__Draft__.js` | 1.0.0 | 15-Sep / - | header-only (29) | 29-Sep 1.1.0 | port_adapted | - |
| 192 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecData__Editing__.js` | 1.1.0 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecData__Editing__.js` | 1.0.0 | 15-Sep / - | header-only (21) | 29-Sep 1.1.0 | port_adapted | - |
| 193 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecData__State__.js` | 1.2.0 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecData__State__.js` | 1.0.0 | 15-Sep / - | drifted (56) | 22-Sep 1.1.0; 29-Sep 1.2.0 | port_adapted | - |
| 194 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecData__Transport__.js` | 1.3.0 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecData__Transport__.js` | 1.1.0 | 18-Sep / - | drifted (394) | 22-Sep 1.2.0; 29-Sep 1.3.0 | port_whole_reapply_vv | VV R2DrawingNotes + Flask; TV CfApi whole-file read/write (DIV-4) |
| 195 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecDocument__.js` | 1.0.0 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecDocument__.js` | 1.0.0 | 14-Sep / v2.51.0 | drifted (39) | - | no_action (re-verify VV seams) | - |
| 196 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecEditor__.js` | 1.2.0 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecEditor__.js` | 1.2.0 | 15-Sep / v2.51.0 | header-only (9) | - | no_action | - |
| 197 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecEditor__Actions__.js` | 1.1.0 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecEditor__Actions__.js` | 1.1.0 | 18-Sep / - | header-only (10) | - | no_action | - |
| 198 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecEditor__Bar__.js` | 1.4.0 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecEditor__Bar__.js` | 1.2.0 | 19-Sep / v2.70.0 | drifted (73) | 29-Sep 1.4.0 [2.166.0]; 29-Sep 1.3.0 | port_adapted | - |
| 199 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecEditor__Builders__.js` | 1.0.0 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecEditor__Builders__.js` | 1.0.0 | 15-Sep / - | header-only (6) | - | no_action | - |
| 200 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecEditor__NoteDrag__.js` | 1.0.0 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecEditor__NoteDrag__.js` | 1.0.0 | 15-Sep / - | header-only (6) | - | no_action | - |
| 201 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecEditor__Notes__.js` | 1.1.0 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecEditor__Notes__.js` | 1.1.0 | 19-Sep / v2.70.0 | header-only (15) | - | no_action | - |
| 202 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecEditor__Render__.js` | 1.0.0 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecEditor__Render__.js` | 1.0.0 | 15-Sep / - | header-only (6) | - | no_action | - |
| 203 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecEditor__State__.js` | 1.0.0 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecEditor__State__.js` | 1.0.0 | 15-Sep / - | header-only (6) | - | no_action | - |
| 204 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecLinks__.js` | 1.2.0 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecLinks__.js` | 1.0.0 | 14-Sep / - | drifted (49) | 18-Sep 1.1.0; 22-Sep 1.2.0 | port_adapted | - |
| 205 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecMargin__.js` | 1.5.0 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecMargin__.js` | 1.3.0 | 14-Sep / - | drifted (404) | 22-Sep 1.5.0; 22-Sep 1.4.0 | port_whole_reapply_vv | - |
| 206 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js` | 1.0.0 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js` | 1.0.0 | 17-Sep / - | drifted (28) | - | no_action (re-verify VV seams) | Helvetica (no PdfFonts); project name from folder id |
| 207 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__Styles__Specification__.css` | - | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__Styles__Specification__.css` | - | - / v2.51.0 | drifted (189) | - | no_action (re-verify VV seams) | - |
| 208 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__Styles__Specification__Notes__.css` | - | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__Styles__Specification__Notes__.css` | - | - / - | drifted (309) | - | no_action (re-verify VV seams) | - |
| 209 | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__Styles__Specification__Read__.css` | - | `02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__Styles__Specification__Read__.css` | - | - / - | header-only (14) | - | no_action | - |
| 210 | `02__Src__AppModules/51__System__LayoutEditor/55__Feature__Scrapbook/Na__LayoutEditor__Panel__Scrapbook__.js` | 1.2.1 | `02__Src__AppModules/51__System__LayoutEditor/55__Feature__Scrapbook/Na__LayoutEditor__Panel__Scrapbook__.js` | 1.0.0 | 20-Sep / v2.85.0 | drifted (40) | - | no_action (re-verify VV seams) | - |
| 211 | `02__Src__AppModules/51__System__LayoutEditor/55__Feature__Scrapbook/Na__LayoutEditor__Scrapbook__.js` | 1.1.0 | `02__Src__AppModules/51__System__LayoutEditor/55__Feature__Scrapbook/Na__LayoutEditor__Scrapbook__.js` | 1.0.0 | 20-Sep / v2.85.0 | header-only (37) | - | no_action | - |
| 212 | `02__Src__AppModules/51__System__LayoutEditor/55__Feature__Scrapbook/Na__LayoutEditor__Scrapbook__TileDrag__.js` | 1.2.0 | `02__Src__AppModules/51__System__LayoutEditor/55__Feature__Scrapbook/Na__LayoutEditor__Scrapbook__TileDrag__.js` | 1.0.0 | 20-Sep / v2.85.0 | drifted (134) | 21-Sep 1.2.0 | port_adapted | - |
| 213 | `02__Src__AppModules/51__System__LayoutEditor/56__Feature__ScrapbookCustom/Na__LayoutEditor__Panel__ScrapbookCustom__.js` | 1.0.0 | `02__Src__AppModules/51__System__LayoutEditor/56__Feature__ScrapbookCustom/Na__LayoutEditor__Panel__ScrapbookCustom__.js` | 1.0.0 | 20-Sep / v2.85.0 | header-only (19) | - | no_action | - |
| 214 | `02__Src__AppModules/51__System__LayoutEditor/56__Feature__ScrapbookCustom/Na__LayoutEditor__ScrapbookCustom__.js` | 1.0.0 | `02__Src__AppModules/51__System__LayoutEditor/56__Feature__ScrapbookCustom/Na__LayoutEditor__ScrapbookCustom__.js` | 1.0.0 | 20-Sep / v2.85.0 | drifted (38) | - | no_action (re-verify VV seams) | - |
| 215 | `02__Src__AppModules/51__System__LayoutEditor/56__Feature__ScrapbookCustom/Na__LayoutEditor__ScrapbookCustom__Transport__.js` | 1.0.0 | `02__Src__AppModules/51__System__LayoutEditor/56__Feature__ScrapbookCustom/Na__LayoutEditor__ScrapbookCustom__Transport__.js` | 1.0.0 | 20-Sep / v2.85.0 | drifted (80) | - | no_action (re-verify VV seams) | WCP server.py /api/valevision/scrapbook, /api/check-localhost |
| 216 | `02__Src__AppModules/51__System__LayoutEditor/56__Feature__ScrapbookCustom/Na__LayoutEditor__Styles__ScrapbookCustom__.css` | 1.0.0 | `02__Src__AppModules/51__System__LayoutEditor/56__Feature__ScrapbookCustom/Na__LayoutEditor__Styles__ScrapbookCustom__.css` | 1.0.0 | 20-Sep / - | header-only (15) | - | no_action | - |
| 217 | `02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__Panel__ScrapbookParametric__.js` | 1.8.0 | `02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__Panel__ScrapbookParametric__.js` | 1.0.0 | 20-Sep / v2.85.0 | drifted (829) | 21-Sep 1.7.0; 21-Sep 1.6.0; 21-Sep 1.5.0; 29-Sep 1.8.0 | port_whole_reapply_vv | - |
| 218 | `02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__.js` | - | `02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__.js` | 1.0.0 | 20-Sep / v2.85.0 | drifted (343) | 21-Sep 1.7.0; 21-Sep 1.6.0; 21-Sep 1.5.0; 21-Sep 1.4.0 | port_whole_reapply_vv | - |
| 219 | `02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__DrawingTitle__.js` | - | `02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__DrawingTitle__.js` | 1.0.0 | 20-Sep / v2.85.0 | drifted (328) | 21-Sep 1.3.0 | port_whole_reapply_vv | - |
| 220 | `02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__Grips__.js` | 1.6.0 | `02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__Grips__.js` | 1.0.0 | 20-Sep / v2.85.0 | drifted (361) | 21-Sep 1.6.0; 21-Sep 1.5.0; 21-Sep 1.4.0; 21-Sep 1.3.0 | port_whole_reapply_vv | - |
| 221 | `02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__LinkNoodle__.js` | 1.2.2 | `02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__LinkNoodle__.js` | 1.0.0 | 20-Sep / v2.85.0 | drifted (53) | 21-Sep 1.2.2; 21-Sep 1.2.1 | port_adapted | - |
| 222 | `02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__ScaleBar__.js` | 1.1.0 | `02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__ScaleBar__.js` | 1.0.0 | 20-Sep / v2.85.0 | drifted (41) | - | no_action (re-verify VV seams) | - |
| 223 | `02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__ViewportLink__.js` | - | `02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__ViewportLink__.js` | - | 20-Sep / v2.85.0 | drifted (140) | 21-Sep 1.5.1; 21-Sep 1.5.0; 21-Sep 1.4.0; 21-Sep 1.3.0 | port_whole_reapply_vv | - |
| 224 | `02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__Styles__ScrapbookParametric__.css` | 1.3.0 | `02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__Styles__ScrapbookParametric__.css` | 1.0.0 | 20-Sep / v2.85.0 | drifted (108) | 21-Sep 1.3.0; 21-Sep 1.2.0 | port_adapted | - |
| 225 | `02__Src__AppModules/51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js` | 1.12.0 | `02__Src__AppModules/51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js` | 1.2.0 | 14-Sep / - | drifted (364) | 17-Sep 1.5.0; 20-Sep 1.6.0; 21-Sep 1.9.0; 21-Sep 1.8.0; 21-Sep 1.7.0; 22-Sep 1.10.0; 23-Sep 1.12.0; 23-Sep 1.11.0 | port_whole_reapply_vv | Helvetica; StyleBands; jsPDF path (VV vendors jsPDF under 35__System__PageLayoutSystem) |
| 226 | `02__Src__AppModules/51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfFilename__.js` | 1.0.0 | `02__Src__AppModules/51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfFilename__.js` | 1.0.0 | 17-Sep / - | header-only (13) | - | no_action | - |
| 227 | `02__Src__AppModules/51__System__LayoutEditor/70__DevTools__DevMenu/Na__LayoutEditor__DevMenu__Controls__.js` | 1.3.0 | `02__Src__AppModules/51__System__LayoutEditor/70__DevTools__DevMenu/Na__LayoutEditor__DevMenu__Controls__.js` | 1.4.0 | 19-Sep / - | drifted (224) | - | no_action (re-verify VV seams) | VV 1.4.0 ahead: loader facade reads, Layout Mode switch |
| 228 | `02__Src__AppModules/51__System__LayoutEditor/80__Feature__WebViewer/Na__LayoutEditor__Styles__WebViewer__.css` | - | `02__Src__AppModules/51__System__LayoutEditor/80__Feature__WebViewer/Na__LayoutEditor__Styles__WebViewer__.css` | - | - / - | header-only (13) | - | no_action | - |
| 229 | `02__Src__AppModules/51__System__LayoutEditor/80__Feature__WebViewer/Na__LayoutEditor__WebViewer__.js` | 1.2.0 | `02__Src__AppModules/51__System__LayoutEditor/80__Feature__WebViewer/Na__LayoutEditor__WebViewer__.js` | 1.1.0 | 18-Sep / - | drifted (254) | 29-Sep 1.2.0 [2.166.0] | port_adapted | Documents() without site plan split |
| 230 | `02__Src__AppModules/51__System__LayoutEditor/80__Feature__WebViewer/Na__LayoutEditor__WebViewer__Drawings__.js` | 1.1.0 | `02__Src__AppModules/51__System__LayoutEditor/80__Feature__WebViewer/Na__LayoutEditor__WebViewer__Drawings__.js` | 1.1.0 | 18-Sep / - | header-only (9) | - | no_action | - |
| 231 | `02__Src__AppModules/51__System__LayoutEditor/80__Feature__WebViewer/Na__LayoutEditor__WebViewer__Spec__.js` | 1.0.0 | `02__Src__AppModules/51__System__LayoutEditor/80__Feature__WebViewer/Na__LayoutEditor__WebViewer__Spec__.js` | 1.0.0 | 18-Sep / - | header-only (9) | - | no_action | - |
| 232 | `02__Src__AppModules/51__System__LayoutEditor/80__Feature__WebViewer/Na__LayoutEditor__WebViewer__TouchControls__.js` | 1.1.0 | `02__Src__AppModules/51__System__LayoutEditor/80__Feature__WebViewer/Na__LayoutEditor__WebViewer__TouchControls__.js` | 1.1.0 | 18-Sep / - | header-only (9) | - | no_action | - |
| 233 | `02__Src__AppModules/01__AppCore/AppCore__DataLib__Loader.js` | - | `02__Src__AppModules/01__AppCore/AppCore__DataLib__Loader.js` | 1.0.0 | 10-Jun / - | drifted (101) | - | no_action (re-verify VV seams) | - |
| 234 | `02__Src__AppModules/01__AppCore/Na__AppConfig__Loader.js` | - | `02__Src__AppModules/01__AppCore/Na__AppConfig__Loader.js` | - | - / - | header-only (20) | - | no_action | - |
| 235 | `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js` | 1.3.1 | `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js` | 1.7.0 | 09-Sep / - | drifted (1915) | 13-Sep 1.3.0; 28-Sep 1.3.1 [2.71.0] | keep_vv_divergence (re-check hunks) | VV boot sequence differs (loader, Flask, build token) |
| 236 | `02__Src__AppModules/03__AppUtils/Na__AppUtils__ConfirmDialog.js` | 1.0.0 | `02__Src__AppModules/03__AppUtils/Na__AppUtils__ConfirmDialog.js` | 1.0.0 | 29-Apr / - | header-only (11) | - | no_action | - |
| 237 | `02__Src__AppModules/03__AppUtils/Na__AppUtils__DevGate__.js` | 1.1.0 | `02__Src__AppModules/03__AppUtils/Na__AppUtils__DevGate__.js` | 1.1.0 | 18-Sep / - | drifted (58) | - | no_action (re-verify VV seams) | - |
| 238 | `02__Src__AppModules/03__AppUtils/Na__AppUtils__ProjectLoader.js` | 2.0.1 | `02__Src__AppModules/03__AppUtils/Na__AppUtils__ProjectLoader.js` | 1.0.0 | 25-Jun / - | drifted (637) | 21-Sep 2.0.1 | keep_vv_divergence (re-check hunks) | Different loaders by design (VV build-manifest token; TV FetchTrueVisionProjectData) |
| 239 | `02__Src__AppModules/03__AppUtils/Na__AppUtils__R2AssetUpload__.js` | 1.0.1 | `02__Src__AppModules/03__AppUtils/Na__AppUtils__R2AssetUpload__.js` | 1.0.0 | 09-Sep / - | drifted (281) | 10-Sep 1.0.0; 13-Sep 1.0.1 | port_adapted | VV worker route /api/editor/projects/{folderId}/assets + Flask; throws on failure |
| 240 | `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__Camera__SceneTransition.js` | 1.0.0 | `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__Camera__SceneTransition.js` | 1.5.0 | 28-Sep / - | drifted (520) | - | no_action (re-verify VV seams) | - |
| 241 | `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__BatchOps__.js` | 1.2.0 | `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__BatchOps__.js` | 1.1.0 | 28-Sep / - | drifted (246) | - | no_action (re-verify VV seams) | - |
| 242 | `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__GroupEditor__.js` | 1.0.0 | `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__GroupEditor__.js` | 1.0.0 | 09-Sep / - | drifted (61) | - | no_action (re-verify VV seams) | - |
| 243 | `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__Modal__.js` | 1.2.0 | `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__Modal__.js` | 1.0.0 | 19-Sep / - | drifted (69) | 20-Sep 1.1.0; 22-Sep 1.2.0 | port_adapted | - |
| 244 | `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__SceneEditor.js` | 1.4.0 | `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__SceneEditor.js` | 1.4.0 | 28-Sep / v2.19.0 | drifted (2451) | - | no_action (re-verify VV seams) | VV keeps SceneRowBuilders/SceneReorder splits (TV withdrew them v2.68.2) |
| 245 | `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__SceneLightingRows__.js` | 1.0.0 | `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__SceneLightingRows__.js` | 1.0.0 | 28-Sep / - | header-only (24) | - | no_action | - |
| 246 | `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js` | 1.1.1 | `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js` | 1.0.0 | 09-Sep / - | drifted (427) | 19-Sep 1.1.0; 28-Sep 1.1.1 | port_whole_reapply_vv | - |
| 247 | `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__SceneGroups__Data__.js` | 1.0.0 | `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__SceneGroups__Data__.js` | 1.0.0 | 09-Sep / - | header-only (47) | - | no_action | - |
| 248 | `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__Styles__SceneGroupSelector__.css` | - | `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__Styles__SceneGroupSelector__.css` | 1.0.0 | - / - | drifted (204) | - | no_action (re-verify VV seams) | - |
| 249 | `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js` | 1.1.0 | `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js` | 1.1.0 | 09-Sep / - | drifted (192) | - | no_action (re-verify VV seams) | - |
| 250 | `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__UI__SceneCarousel.js` | 1.3.0 | `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__UI__SceneCarousel.js` | 1.4.0 | 16-Sep / v2.18.0 | drifted (359) | 19-Sep 1.3.0 | port_whole_reapply_vv | - |
| 251 | `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__UI__SceneGroupSelector__.js` | 1.0.0 | `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__UI__SceneGroupSelector__.js` | 1.0.0 | 09-Sep / - | header-only (39) | - | no_action | - |
| 252 | `02__Src__AppModules/15__ModelLoader/Na__ModelLoader__ContentStamp__.js` | 1.0.0 | `02__Src__AppModules/15__ModelLoader/Na__ModelLoader__ContentStamp__.js` | 1.0.0 | 18-Sep / v2.64.1 | header-only (18) | - | no_action | - |
| 253 | `02__Src__AppModules/15__ModelLoader/Na__ModelLoader__MultiModel.js` | 1.4.0 | `02__Src__AppModules/15__ModelLoader/Na__ModelLoader__MultiModel.js` | 1.3.0 | 18-Sep / - | drifted (1182) | - | no_action (re-verify VV seams) | - |
| 254 | `02__Src__AppModules/30__System__ImageExport/Na__ImageExport__AsyncYield__.js` | 1.0.0 | `02__Src__AppModules/30__System__ImageExport/Na__ImageExport__AsyncYield__.js` | - | - / - | header-only (45) | - | no_action | - |
| 255 | `02__Src__AppModules/30__System__ImageExport/Na__ImageExport__PostProcessEffects__HighPassSharpen.js` | - | `02__Src__AppModules/30__System__ImageExport/Na__ImageExport__PostProcessEffects__HighPassSharpen.js` | - | - / - | drifted (204) | - | no_action (re-verify VV seams) | - |
| 256 | `02__Src__AppModules/30__System__ImageExport/Na__ImageExport__PostProcessEffects__Levels.js` | - | `02__Src__AppModules/30__System__ImageExport/Na__ImageExport__PostProcessEffects__Levels.js` | - | - / - | header-only (122) | - | no_action | - |
| 257 | `02__Src__AppModules/30__System__ImageExport/Na__ImageExport__PostProcessEffects__Pipeline.js` | - | `02__Src__AppModules/30__System__ImageExport/Na__ImageExport__PostProcessEffects__Pipeline.js` | - | - / - | header-only (40) | - | no_action | - |
| 258 | `02__Src__AppModules/30__System__ImageExport/Na__ImageExport__StaticExport__TilePlan__.js` | 1.0.0 | `02__Src__AppModules/30__System__ImageExport/Na__ImageExport__StaticExport__TilePlan__.js` | 1.0.0 | 19-Aug / - | drifted (64) | 12-Sep 1.0.0 | port_adapted | - |
| 259 | `02__Src__AppModules/30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js` | 2.1.0 | `02__Src__AppModules/30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js` | 1.0.0 | 14-Sep / - | drifted (792) | - | no_action (re-verify VV seams) | - |
| 260 | `02__Src__AppModules/30__System__ImageExport/Na__UiFeature__ImageExport__Controls.js` | - | `02__Src__AppModules/30__System__ImageExport/Na__UiFeature__ImageExport__Controls.js` | - | - / - | drifted (612) | - | no_action (re-verify VV seams) | - |
| 261 | `02__Src__AppModules/30__System__ImageExport/Na__UiFeature__ImageExport__ViewportOverlays.js` | - | `02__Src__AppModules/30__System__ImageExport/Na__UiFeature__ImageExport__ViewportOverlays.js` | - | - / - | drifted (27) | - | no_action (re-verify VV seams) | - |


#### Verifier corrections to c.1 (01-Oct-2026)

| # | Module | Table says | Correct | Evidence |
|---|---|---|---|---|
| 74 | `50/Na__ProjectedLinework__ModelStage__.js` | header-only, no_action | **port_adapted** with TV v2.37.0 (S02b) | TV 1.1.0 (14-Sep) folds linework-first, seams and flush joins into the fingerprint (TV L150-152, `Na__PlCfg__GetProjectionSetup`); absent in VV; TV PORT NOTE L51 "1.1.0 PENDING to ValeVision3D" |
| 140 | `LE/20/Na__LayoutEditor__Viewport3d__.js` | no_action | **port_adapted** with TV v2.107.0 Draft mode (S04b) | TV 1.8.0 (21-Sep) Draft mode, hidden by VV's 28-Sep v2.71.0 entry; no `DraftMode` anywhere in VV |
| 143, 144 | `LE/20/...ViewportIdentity__.js`, `...ViewportTitleText__.js` | no_action | **port_adapted** with TV v2.87.0 (S02a/S04a) | TV 1.1.0 (20-Sep) adds the storey as a sixth fact; TV devlog L7782: "ValeVision holds those five Layout Editor modules one fact behind" |
| 149 | `LE/25/...SnapshotRenderer__.js` | no_action | **port_adapted** with TV v2.94.0 depth fog and v2.105.0 storey doors (S02b/S04a), keeping the DIV-1 seams | TV 1.12.0 (20-Sep) fog source in Render2d; 1.12.1 (21-Sep) `Na__PlDoors__Apply`; both hidden by VV's 28-Sep entry |
| 210 | `LE/55/...Panel__Scrapbook__.js` | no_action | **port_adapted** (S06a) | TV 1.2.1 (20-Sep) tab hover text (`spec.hint`); VV has none |
| 222 | `LE/57/...ScrapbookParametric__ScaleBar__.js` | no_action | **port_adapted** with TV v2.96.0 (S06a) | TV 1.1.0 (20-Sep) exports `Na__LeParamBar__PaperMm`; absent in VV |
| 241, 244 | `21/...DevMenu__BatchOps__.js`, `...DevMenu__SceneEditor.js` | no_action | **port_adapted** with TV v2.92.0 (owner needed, S11-V05) | TV BatchOps 1.1.0 `{ groupName }` and SceneEditor 1.3.0 `Na__PmDev__RunImageExport` are absent in VV; both hidden by VV's 28-Sep entries |
| 253 | `15/Na__ModelLoader__MultiModel.js` | no_action | **port_adapted** with TV v2.38.1 (S02b; agrees with S11-F20) | VV skipped TV 1.3.0 (14-Sep) while taking 1.3.1, 1.3.2 and 1.4.0 |
| 57, 60 | `47/Na__North__CompassGizmo__.js`, `__DevMenu__Editor__.js` | no_action | port whole with `Na__InteractiveOverlays` (TV v2.84.0 half, S02a) | VV PORT NOTE: "When Na__InteractiveOverlays is ported, take TrueVision's 1.1.0 whole" |
| 16, 17, 46, 47 | plan and elevation `DevMenu__Editor__` and `DevMenu__RowBuilders__` | seams listed without StyleRows | add the seam **keep VV's Styles and Exclusions rows** (`Na__DrawStyleRow__BuildStylesRow`/`BuildExclusionsRow`, D33) | TV's 2.0.0 builders have no such rows (S11-V03) |
| 35, 38 | `45/Na__PlanDimensions__Data__.js`, `__Editor__.js` | no_action (re-verify) | **keep_vv_divergence** (VV is ahead) until TV finishes the split | TV's Data (988 lines) and Editor (907) keep their own copies; VV imports the split ConfigState (S11-V03) |
| 111, 217, 246 | `SheetModel__Sheets__`, `Panel__ScrapbookParametric__`, `PresentationMode__ProjectJson__SceneData` | port_whole, adaptation "-" | add a transport seam (DIV-4) | They import TV `80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js`: `Na__CfApi__GetLoadedProjectData`, and `Na__CfApi__BuildContentCdnUrl` in SceneData. Re-point them to VV's own loader and CDN accessors (S12) |
| 19 | `43/Na__FloorPlan__ModeController__.js` | VV 1.1.0 | VV 1.2.2 (09-Sep; DIV-1/DIV-2 seams) | VV log L63-72; 1.1.0 is the PORT NOTE "Source version" |

### c.2 TrueVision-only modules, mapped to the releases that introduced them

| TV path (relative to TV root) | Files / lines | TV releases | Classification of those releases | Owning slice / decision |
|---|---|---|---|---|
| `LE/21__System__SitePlanData/` | 2 / 1,168 | v2.48.0, v2.49.0, v2.132.0, v2.155.0 | NOT-CONSIDERED | S04a, D-S04a-01 (dormant port recommended) |
| `LE/26__System__DraftMode/` | 4 / 649 | v2.107.0, v2.111.0 | PENDING-SIGNOFF | S04b |
| `LE/27__System__DrawingGrid/` | 5 / 1,451 | v2.114.0 (+v2.123.0, v2.129.0, v2.137.0) | NOT-CONSIDERED | S04b |
| `LE/28__System__ObjectSnap/` | 16 / 5,534 | v2.28.0 (ViewportSnapMove), v2.129.0, v2.137.0, v2.149.0 (MoveAnchor) and 11 more | PARTIAL / NOT-CONSIDERED | S04b; replaces VV-only `LE/30__System__SheetTools/Na__LayoutEditor__Snapping__.js` (rename + move) |
| `LE/31__System__DocumentKeys/` | 2 / 457 | v2.110.0, v2.112.0, v2.115.0 | NOT-CONSIDERED | S05a |
| `LE/32__System__OrthoMode/` | 3 / 438 | v2.113.0 | NOT-CONSIDERED | S04b |
| `LE/33__System__DrawingAxes/` | 3 / 680 | v2.131.0 | NOT-CONSIDERED | S04b |
| `LE/36__System__HatchPatternTools/` | 3 / 1,480 | v2.90.0, v2.101.0, v2.126.0 | NOT-CONSIDERED | S05b |
| `LE/37__System__VectorTools/` | 18 / 7,385 | v2.130.0, v2.150.0, v2.151.0 | NOT-CONSIDERED | S05b |
| `LE/51__Feature__DrawingRegister/` | 10 / 3,659 | v2.69.0-v2.79.1, v2.112.0 | DELIBERATE (reopened) | S07a, D-S07a-01 |
| `LE/52__Feature__StatementWriter/` | 33 / 16,898 | v2.95.0 ... v2.172.0 (12 releases - VERIFIER: Appendix A has 12 LE-STMT rows, not 13) | NOT-CONSIDERED | S07b, D-S07b-01 |
| `LE/53__Feature__ProjectQrCode/` | 6 / 1,895 | v2.81.0, v2.100.0, v2.102.0, v2.108.0, v2.109.0, v2.120.0, v2.162.0 | NOT-CONSIDERED | S07a (NA "Project Portal" identity) |
| `LE/54__Feature__SheetImages/` | 17 / 4,709 | v2.116.0, v2.121.0 | NOT-CONSIDERED | S07a (+ WCP image route) |
| `LE/58__Feature__ScrapbookSpecification/` | 5 / 2,220 | v2.91.0, v2.144.0 | NOT-CONSIDERED | S06b |
| `LE/59__Feature__FloorAreas/` | 10 / 4,222 | v2.104.0, v2.125.0, v2.148.0 | NOT-CONSIDERED | S06b |
| `LE/65__Feature__DocumentPublishing/` | 7 / 2,604 | v2.155.0, v2.160.0, v2.170.0-v2.172.0 | NOT-CONSIDERED | S08 |
| `LE/66__Feature__DocumentSharing/` | 7 / 2,116 | v2.166.0 | NOT-CONSIDERED | S08 |
| TV-only files in shared `LE/` subfolders (35) | 15,091 | `Na__Hotkeys__DrawingTabs__.json` v2.115.0; `SheetModel__AreaGroups__` v2.104.0; `SheetRecords__LeaderlessNotes__` v2.147.0; `SheetRecords__NoteRegions__` v2.143.0; `TitleBlock__QrCell__` v2.81.0; `DimensionRounding__` v2.139.0; `PaintOrder__` v2.106.0; `ShapeRings__` v2.150.0/v2.160.0; `ModelSource__` v2.32.0; `PlanDoors__` v2.42.0/v2.48.1/v2.140.0; `VectorQuality__` v2.136.0; `Viewport2d__DepthFog__` v2.94.0; `Viewport2d__SitePlan__` v2.49.0/v2.55.0; `ViewportRotation__` v2.138.0; `SitePlanComposites__` (+config, panel) v2.89.0; `LayerMenu__` v2.123.0; `SheetTools__CopyDrag__` v2.117.0/v2.119.0; `SheetTools__HoverTooltip__`, `__NoteTooltip__` v2.144.0; `NoteRegions__` (+Grips, Tool), `Panel__MarginNotes__Regions__`, `SpecMargin__Column__` v2.143.0; `Panel__MarginNotes__Leaderless__` v2.147.0; `SpecData__Lockstep__`, `SpecLockstep__` v2.163.0; parametric `AreaSchedule__` v2.104.0/v2.148.0, `CabinetInfill__` v2.128.0/v2.134.0, `ProjectQr__` v2.100.0, `SiteLegend__` (+Link) v2.164.0; `PdfFonts__` (14-Sep, unrecorded) | see Appendix A per release | per release |
| TV `02__Src__AppModules/40__System__DrawingViewCore/` (VV 42): `DevRowShell__`, `DraftGuard__`, `DraftMaths__`, `DrawingUsage__` | 4 / 1,379 | v2.86.0 | PENDING-SIGNOFF | S02a WP-S02a-04 |
| TV `40/Na__DrawView__ProfileLines__.js`, `__RenderPreset__.js` | 2 / 1,114 | v2.19.0 / v2.21.0 (DIV-1) | permanent divergence | keep VV ComposerPreset (DIV-1) |
| TV `41__System__SectionCutEngine/` (7) | 7 / 2,638 | v2.21.0 (TD06) | permanent divergence (DIV-2) | keep VV 41 CrossSectionView |
| TV `42/Na__FloorPlan__StoreyLevel__.js`, `__DevMenu__StoreyRow__.js` | 2 / 564 | v2.87.0 | PENDING-SIGNOFF | S02a WP-S02a-05 |
| TV `45/Na__Elevation__AutoName__.js`, `__AutoNameText__.js` | 2 / 464 | v2.86.0 | PENDING-SIGNOFF | S02a WP-S02a-06 |
| TV `50/...DoorPose__.js`, `...FlushJoins__.js`, `...Storeys__.js` | 3 / 1,435 | v2.42.0/v2.48.1, v2.37.0/v2.159.0, v2.105.0 | PENDING-SIGNOFF | S02b |
| TV `03__AppUtils/Na__AppUtils__KeyScope__.js` | 1 / 237 | v2.110.0, v2.115.0 | NOT-CONSIDERED | S05a/S03a |
| TV `03__AppUtils/Na__AppUtils__LocalProjectMirror__.js` | 1 / 447 | v2.39.0, v2.146.0 | transport (DIV-4) | S09 (VV equivalent = Flask route in WCP `server.py`) |
| TV top-level `47__System__DrawingPlanes` | 9 | v2.82.0, v2.84.0 | PENDING-SIGNOFF | S02a WP-S02a-07 |
| TV top-level `48__System__CrossSectionViews` | 1 | v2.86.0 | PENDING-SIGNOFF | S02a WP-S02a-09; interacts with D-S11-07 |
| TV top-level `49__System__ElevationDepthFog` | 8 | v2.94.0, v2.103.0 | NOT-CONSIDERED | S02b WP-S02b-04 |
| TV top-level `52__System__Layout__PublishedDocuments`, `53__Data__Layout__PublishedSchema` | 11 + n | v2.155.0, v2.156.0, v2.166.0 | NOT-CONSIDERED | S08 |
| TV top-level `54__Feature__ColourPalette`, `55__Feature__SpellCheck` | 6 + 7 | v2.126.0, v2.133.0; v2.144.0 | NOT-CONSIDERED | S06b |
| TV app root `50__TrueVision__UserConfig/`, `52__LayoutEditor__HatchPatternLibrary/` | 1 + 24 | v2.144.0; v2.101.0, v2.126.0 | NOT-CONSIDERED | S06b; S05b |

### c.3 ValeVision-only modules and their ledger status

| VV path | Ledger status today | Recommended status |
|---|---|---|
| `42__System__DrawingViewCore/Na__DrawView__ComposerPreset__.js` 1.3.0 | DIV-1, permanent (L970) | keep_vv_divergence; TV's `RenderPreset__` presents the same interface |
| `42__System__DrawingViewCore/Na__DrawView__ThumbnailBake__.js` 1.0.1 | Pending back-port L1232 | OPEN back-port (WP-S11-06) |
| `41__System__CrossSectionView/` (7 files) | DIV-2, permanent | keep_vv_divergence; schema byte-compatible (TD06) |
| `LE/01__Core__Loader/` (Loader 1.1.0, LoadingScreen 1.0.0, Styles__Boot) | contradictory (L1122/L1230 vs L1244) | decision D-S11-05; recommended: permanent VV divergence, "not a back-port candidate" everywhere |
| `LE/03__Core__Config/Na__LayoutEditor__KeyMappings__.json` | not in ledger | rename/move to TV's `Na__Hotkeys__DrawingTabs__.json` with the key-scope port (S03a WP-S03a-02) |
| `02__AppData/Na__ValeVision__HotkeysDictionary__.json` + `03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js` (VERIFIER) | not in ledger | These are the 3D-model-tab keys. TV holds them as `02__AppData/Na__Hotkeys__3dModelTab__.json` + `10__NavigationAndCameras/Na__Hotkeys__Manager.js`, and TV's `KeyScope__` reads one hotkey file per kind of tab (3D model, drawing, document). They belong to the key-scope alignment (S11-F16, S11-V08, S03a): rename and scope them, or record the divergence |
| `LE/07__Core__SheetData/Na__LayoutEditor__DrawingCode__.js` 1.0.0 | L330 "ported with a divergence" (leaf for the loader) | keep while the loader exists (tied to D-S11-05) |
| `LE/30__System__SheetTools/Na__LayoutEditor__Snapping__.js` 1.2.0 | ledger calls it `51/Na__LayoutEditor__Snapping__` | becomes TV's `LE/28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__.js` family (S04b). VERIFIER: 11 VV modules import it (ModeController; SheetTools and its ContextMenu, HitResolution, Keyboard and PointerDrag units; the Dimension, Leader, Rectangle and Shape tools; Toolbar), so the move must rewrite every importer in the same package. TV's `ViewportSnapMove__` also lives in `LE/28__System__ObjectSnap/`, not in `20__System__Viewports` as ledger L1128 says |
| `03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js`, `__R2DrawingNotes__.js` (and the same-named but differently-built `__R2AssetUpload__.js`, which TV also has) | DIV-4 | keep_vv_divergence (VV transport: whitecardopedia-editor-api + Flask mirror) |
| `03__AppUtils/Na__AppUtils__SnapshotHistory__.js` | L986 "verbatim - file name suffix" | module_naming: TV's file is `Na__AppUtils__SnapshotHistory.js` (no trailing `__`); align one way (D-S11-08). VERIFIER: there are 2 importers on each side (VV `44`/`45` `__History__.js`; TV `43`/`44`), and the trailing-`__` rule is not uniform anyway: `Na__AppUtils__ConfirmDialog.js` and `Na__AppUtils__ProjectLoader.js` lack it in both apps |
| `21__System__PresentationMode/...SceneRowBuilders__.js`, `...SceneReorder__.js`, `...ScenePersistence__.js` | "back-port" rows L1218, VV PORT NOTEs "the split itself" | permanent VV divergence (TV v2.68.2 withdrew them); correct the PORT NOTEs |

---

## (d) Wiring notes (what this slice's work touches)

1. **Hot documents.** `VV/ValeVision__PARITY__TrueVisionLedger__.md` and `VV/ValeVision__DEVLOG__.md` are written
   only by the Parity Scribe (B10). `TV/TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md`,
   `TV/TrueVision__DEVLOG__.md` and TV module headers only by an Adam-approved TV package (WP-S11-07).
2. **Release tokens.** Coding agents write `{{VVREL:<WP-id>}}` in module logs; the scribe resolves them. A
   leftover token must fail the new `Na__Verify__PortNotes__` harness (WP-S11-03).
3. **Service worker.** `WCP/02__Src__AppModules/62__Feature__AppInstallability/
   Whitecardopedia__Pwa__ServiceWorker__Logic__.js:229` (`PWA_SW_VERSION_TOKEN = '2026-09-18-1'`). Any wave that adds
   or renames a cross-module export needs a recorded decision (D-S11-04). Owned jointly with S10 WP-S10-08 - do it
   once, in one package.
4. **Verification harnesses.** `VV/80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs` and
   `Na__Verify__Exports__.mjs` exist and pass today - run read-only on 01-Oct-2026 from the VV root: Exports PASS on 415
   files; ModuleGraph 517 modules from 1 entry point, 0 failures, the 1 known vendor issue (three-edge-projection
   worker specifier) unchanged. This is the baseline every wave must keep; every wave runs both, plus the
   TV tests it ports (Appendix A names the TV test per release where one exists - e.g. `Na__Test__MoveRetype__`,
   `Na__Test__ViewportRotation__`, `Na__Test__FlushJoins__`, `Na__Test__DimensionRoundUp__`).
5. **Loader stylesheet list.** Every TV stylesheet a package ports is imported by TV's
   `03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css` but must be added to VV's `Na__LeLoad__STYLESHEETS`
   (`LE/01__Core__Loader/Na__LayoutEditor__Loader__.js`) in the same cascade position (S03a WP-S03a-07, S09). The
   ledger's Module Register should carry a "loaded by" column so this is never missed.
6. **Version-number references inside code.** ConfigState and SheetRecords logs quote TV versions in prose; the
   scribe's Module Register is the only place the TV source version of each file is kept as data.
7. **WCP server.** Ports that need a local-server route (TV v2.39.0/v2.146.0 local mirror and save guard, v2.116.0
   sheet images, v2.144.0 user spellings, v2.95.0+ statements, v2.155.0 publishing) must land their Flask blueprint
   in `WCP/server.py` (pattern: `WCP/Server__ValeVisionScrapbook__Api__.py`) and their R2 handler in
   `WCP/CloudflareWorker/src/` - each such row in the ledger needs a "transport" column (DIV-4).

## (e) UI notes

- Adam's example - **the top nav bar fold** - is TV v2.83.0 and is **PORTED** (VV v2.70.0, ledger L1235-1246:
  `Na__UiFeature__Styles__AppHeader__.css` fold region "verbatim"); S10 re-verified the rules identical on 01-Oct.
  What VV lacks is what TV changed around it afterwards: v2.158.0 (five-tab strip; the fold now follows a document
  tab too), v2.124.0 (toolbar without Undo/Redo/Fit; VV `LE/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js:318,323`
  still builds them), v2.154.0 (layer switch reds), v2.156.0 (published drawings loading screen). See S10.
- VV-only UI that TV lacks: the localhost **Enable Layout Mode** switch (`LayoutEditor__DrawingsData__
  LayoutModeEnabled`, VV v2.21.20, D22 refined) - TV has no such key anywhere in `02__Src__AppModules`. With TV's
  five-tab strip the switch's meaning changes; S10 D-S10-02 owns it.

---

## (f) Decisions needed

| Id | Question | Options | Recommendation |
|---|---|---|---|
| D-S11-01 | Port gate. Most of TV v2.86.0-v2.172.0 is recorded "NOT tried by Adam" at release; the old rule was "port after Adam's sign-off". Does "align ValeVision exactly with TrueVision" count as that sign-off? | (a) port everything to TV HEAD now; (b) port only releases with a recorded confirmation (v2.153.0, v2.155.0) plus what they depend on; (c) port everything in dependency order, but every VV devlog entry flags the TV releases Adam has not confirmed, and the acceptance checklist goes to Adam for both apps | **(c)**. Later TV releases are built on the unconfirmed ones (v2.153.0 needs v2.129/v2.138/v2.149), so (b) collapses into (a) anyway; (c) keeps the testing debt visible |
| D-S11-02 | Ledger shape | (a) keep appending narrative return-trip sections; (b) restructure: Module Register + Release Watermark + Decisions + Back-ports + Folder map, narrative moved to an Archive section in the same file; (c) as (b) with the archive in a separate `ValeVision__PARITY__TrueVisionLedger__Archive__.md` | **(b)**: one file, still greppable, current truth on top. Seeded from this report's sections (c) and Appendix A |
| D-S11-03 | Module version numbers | (a) keep VV-local numbering; (b) on a whole-file port adopt TV's module version; always add a `Source version` PORT NOTE line | **(b)** - versions become comparable and gaps visible |
| D-S11-04 | Shared Whitecardopedia service worker token (`2026-09-18-1`) - VV v2.61.0-v2.71.0 already shipped new exports without a bump | (a) bump at the end of every deploy wave; (b) bump once before the first deploy of swarm output, then per wave; (c) never (accept stale-link risk) | **(b)** - Adam's call; it evicts every Vale app's caches including models. Merge with S10 WP-S10-08 |
| D-S11-05 | The VV loader (`LE/01__Core__Loader`): back-port candidate or permanent VV divergence? | (a) back-port to TV (TV Index.html stops importing the editor at start-up); (b) permanent VV-only seam, recorded once | **(b)** unless Adam wants TV's start-up lighter: TV is the lead and was built without it; the loader is VV's way of loading the same modules. Fix the three contradictory ledger rows either way |
| D-S11-06 | May the swarm edit TrueVision (back-ports B5, TV document hygiene B6)? | (a) no - VV-only edits, TV items recorded in the VV ledger; (b) yes, in separate approved TV packages (WP-S11-06, WP-S11-07) | **(b) with explicit approval per package**; until then (a) |
| D-S11-07 | Sections filed by drawing type (VV D28: sections go to "Cross Sections") vs TV (all elevations to "Elevations"; v2.86.0 Cross Sections menu placeholder) | (a) VV keeps D28 and TV takes it (back-port); (b) VV aligns to TV now (files sections into Elevations) and both move when TV's 48 Cross Sections system is built; (c) keep both until TV builds 48 | **(c)**, recorded as a temporary divergence with a trigger ("when TV 48__System__CrossSectionViews passes 0.1.0") - flipping VV now would move existing Vale cards |
| D-S11-08 | `SnapshotHistory` file name: TV `03__AppUtils/Na__AppUtils__SnapshotHistory.js`, VV `...SnapshotHistory__.js` | (a) VV renames to TV's name (exact alignment); (b) TV renames to the house convention (trailing `__`) | **(b)** if TV packages are approved (D-S11-06), else **(a)**. VERIFIER: recommend **(a)** unconditionally. TV is the naming lead, the rename touches 2 VV importers and no TV file, and the trailing-`__` rule is not uniform in either app's `03__AppUtils` |
| D-S11-09 | Reopened "deliberate" non-ports (Model Source v2.32.0, Document ID/register v2.69-v2.71/v2.76.1, NA scrapbook items v2.53.0, PdfFonts v2.69.0, Project Admin site address v2.88.0) | owned by other slices | Defer to D-S04a-02 (Model Source), D-S07a-01 (register), D-S06a-04 (scrapbook items), D-S08-03 (PdfFonts); v2.88.0 stays a permanent divergence (VV has no Project Admin) |
| D-S11-10 (VERIFIER) | Per-drawing style toggles (VV D33). VV edits each plan's and elevation's Styles and Exclusions in the Dev editors; TV has the record keys but no UI, and its StyleRows module is dead. For an identical experience, which way? | (a) back-port the rows to TV's 2.0.0 row builders (TV plan L565 always intended this); (b) VV drops its rows to match TV; (c) keep VV ahead as a recorded divergence | **(a)**, as a TV package under D-S11-06 (WP-S11-09). Until then **(c)**: every whole-file port of TV's plan and elevation editors re-applies VV's rows |

---

## (g) Proposed work packages

### WP-S11-01 - Parity ledger reconciliation and restructure (M)
- Scope: apply every correction in Appendix B; restructure per D-S11-02 into: Header (roots, divergences DIV-1..DIV-5
  with DIV-5 closed, folder map incl. VV 47 North vs TV 46 and TV 47-49), **Module Register** (seeded from c.1/c.3,
  one row per module: VV path, TV path, TV source version, TV current version, parity, divergences, open TV versions,
  loaded-by, transport, checked date), **Release Watermark** (Appendix A, 177 rows, with VV version and owning
  package), **Decisions** (D01-D40, TD01-TD06 cross-references, this report's D-S11-xx), **Pending back-ports
  VV->TV** (B5 statuses), **Archive** (the 30 return-trip sections - VERIFIER: 30, not 27 - and phase tables, unchanged, under a dated note).
- Files: `VV/ValeVision__PARITY__TrueVisionLedger__.md` only. Hot files: the ledger.
- Depends on: D-S11-02; runs before wave 1 so later scribe passes have rows to update.
- Acceptance: no live (non-archive) row says VV has no service worker; the loader appears with one status; every
  Pending back-port row carries a B5 status and evidence; the Release Watermark has 177 rows whose counts match B3;
  Module Register row count = shared + VV-only + TV-only modules in scope; a grep for `WE10_--_Public-Repo` returns
  nothing outside the archive.

### WP-S11-02 - ValeVision devlog and module-header hygiene (S)
- Scope: (1) a dated "Records" note at the top of `VV/ValeVision__DEVLOG__.md` (not a new version) recording: the
  Specification port of commit 66937440 (TV v2.36.0); the duplicate v2.54.0 headings (annotate the second as "second
  entry of v2.54.0"; do not renumber shipped releases); (2) module logs put in descending order (`LE/07__Core__SheetData/
  Na__LayoutEditor__History__.js` 1.4.0 above 1.3.0; `LE/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js` duplicate
  1.8.0/1.9.0 renumbered as 1.8.1/1.9.1 with a note) - coordinate with S10 WP-S10-08 which owns the ModeController /
  Loader / TabStrip / Toolbar PORT NOTEs; (3) VV PORT NOTE "Back-port" fields corrected where TV already has the
  thing (R2AssetUpload, PerSceneLighting, SceneLightingRows, GroupEditor, MaterialPreset, ProjectData, RenameDrawing,
  StyleRows, Transitions, FacePick, GizmoGrip, PlanDimensions splits, the 40 "same split applies" unit headers, SheetModel)
  and where it was withdrawn (SceneRowBuilders, SceneReorder, SceneEditor).
- Files: VV devlog; headers (comment-only) of the modules above. Hot files: `VV/ValeVision__DEVLOG__.md`.
- Acceptance: `git diff -w` on the touched modules shows comment lines only; the new verifier (WP-S11-03) reports no
  out-of-order logs and no stale "candidate" back-port on a module TV already has.

### WP-S11-03 - Port-note and watermark verifier (S)
- Scope: new `VV/80__Testing__PrototypeEnvironment/Na__Verify__PortNotes__.mjs` (Node, no dependencies): (1) every
  VV module whose header says "Ported from : TrueVision3D" carries `- Source version : <x.y.z> (TrueVision3D
  v<app>)`; (2) DEVELOPMENT LOG entries are in descending date/version order with no duplicate version; (3) no
  `{{VVREL:` token remains; (4) optional `--tv <TV app root>`: for each VV module, list TV dev-log entries dated after
  VV's last entry (the c.1 algorithm), so a package can prove it left nothing behind.
- Files: the new harness only. Hot files: none.
- Acceptance: on today's tree it reports the known History/Toolbar order faults and the missing Source version lines;
  a planted token and a planted out-of-order entry are both caught (prove by deliberate break, as the two existing
  `Na__Verify__` harnesses were proved).
- Tests to port: none (new tool); pattern after `Na__Verify__Exports__.mjs`.

### WP-S11-04 - Parity Scribe pass (S, recurring once per wave)
- Scope: the B10 procedure: fresh read of devlog top + `git status`; allocate VV versions; resolve `{{VVREL}}`
  tokens; write devlog entries from the wave's Port Records; update Module Register and Release Watermark rows; close
  back-port rows; record the service worker decision; run both `Na__Verify__` harnesses and WP-S11-03's verifier.
- Hot files: `VV/ValeVision__DEVLOG__.md`, `VV/ValeVision__PARITY__TrueVisionLedger__.md`, the wave's module headers
  (token replacement only).
- Depends on: WP-S11-01, WP-S11-03, and the wave's packages being merged.
- Acceptance: every TV release a package claims is flipped in the Release Watermark with its VV version; every
  devlog entry names its TV versions; zero tokens left; harness counts recorded.

### WP-S11-05 - Progressive-render remainder of TV v2.58.2 (S/M)
- Scope: TV v2.58.2 was ported only as the `EnsureBuffer` floor (VV v2.54.0). Bring across: `05__RenderPipeline/
  Na__RenderEffect__ProgressiveRefine__.js` 1.0.2 (planFrame reads its own clock) and the VV-side log entry for
  1.0.3 (the floor VV already has); the render loop's `Na__RenderLoop__ArmNextFrame` in a `finally`, the thrown-frame
  guard, the 2.5 s refinement watchdog and the engine-hold stand-down (a sheet that owns the screen is not painted
  over) in VV's `01__AppCore/Na__AppFlow__LoadingSequence.js` render loop, adapted to VV's loop. The LE half
  (`Asset__Samples` on snapshot assets) stays with S04a.
- Files: VV `05__RenderPipeline/Na__RenderEffect__ProgressiveRefine__.js`; hot file VV `01__AppCore/
  Na__AppFlow__LoadingSequence.js`.
- Acceptance: a fractional composer buffer converges 16/16 in two chunks; a frame that throws does not stop the
  loop; with a Layout Editor sheet open and the engine held, the refiner paints nothing; `git diff -w` of
  ProgressiveRefine against TV shows header lines only.

### WP-S11-06 - ValeVision -> TrueVision back-ports (M, TV side, only with Adam's approval - D-S11-06)
- Scope: (1) Add Viewport list rebuilt on every refresh + Viewport panel refreshed on scene broadcasts (VV
  `Panel__ViewportSettings__` 1.4.1 / ModeController 1.15.1 -> TV `LE/40__Ui__Panels/
  Na__LayoutEditor__Panel__ViewportSettings__.js:647`); (2) `Na__DrawView__ThumbnailBake__.js` into TV `40/` with the
  floor plan / elevation dev editors' bake queueing and Bake Missing Thumbnails; (3) confirm dialog markup into TV
  `Index.html` and its CSS (S10 WP-S10-07 - one owner); (4) pose-preserving mode release and entry
  (`Na__NavigationModes__Switcher` ReleaseToOrbit / EnterModeAtPose, walk/fly SyncFromCamera, SceneTransition
  arrival rules); (5) Ground Floor Plan quick action into TV `42/Na__FloorPlan__DevMenu__Editor__.js` (or record it as
  superseded by TV's StoreyLevel - Adam); (6) `.gitkeep` in TV's five scrapbook category folders and
  `sys.dont_write_bytecode` in TV's two scrapbook Python tests.
- Hot files (TV): `Index.html`, `03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css`, `42/
  Na__FloorPlan__DevMenu__Editor__.js`, `45/Na__Elevation__DevMenu__Editor__.js`, `LE/05__Core__ModeController/
  Na__LayoutEditor__ModeController__.js`, TV devlog.
- Acceptance: each item proved in TV the way the VV original was (Add Viewport offers a plan created after the sheet
  opened; seeded cards show pictures; destructive dev actions show the styled dialog; a walk scene arrives at its
  saved pose); TV PORT NOTEs name the VV source version; VV ledger back-port rows closed.

### WP-S11-07 - TrueVision record hygiene (S, TV side, only with Adam's approval)
- Scope: TV plan section 12: update rows C, N, U, Y, AI, AJ, AK, AM, AP and add a pointer row "TV v2.71.0 onward:
  see ValeVision ledger Release Watermark"; section 4.1 folder map gains TV 46 North -> VV 47 and the 47-49 note;
  correct the stale TV PORT NOTE back-port fields (B6.4) and the four "ValeVision has no web viewer" notes; a new TV
  devlog note correcting v2.159.0's FlushJoins claim and v2.166.0's web-viewer claim (no rewriting of old entries).
- Files: `TV/TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md`, headers (comment-only) of the TV modules in
  B6.4, `TV/TrueVision__DEVLOG__.md`.
- Acceptance: `git diff -w` of TV source files shows comment lines only; plan section 12 has no row contradicted by
  VV's ledger.

### Verifier corrections to the work packages (01-Oct-2026)
- **WP-S11-01**: the acceptance counts become 55/6/17/79/6/8/4/2 (B3 verifier note). The archive holds **30** return-trip
  sections, not 27. The Release Watermark gains a "TV plan phase" column, filled from the ValeVision rows of the 12 TV
  feature PLAN files. The Module Register must not take VV versions from `drift_all.tsv` (B8 verifier note) and must carry
  the c.1 corrections.
- **WP-S11-02**: VV `History__` has two 1.3.0 entries; renumber the 20-Sep Common-fields entry (and say so in the log),
  then order. Do NOT mark the "Back-port" fields of `StyleRows__` or the PlanDimensions
  `ConfigState__`/`EditorPreview__` stale, because TV never wired them (S11-V03). (`MaterialPreset__`'s field IS stale: TV's
  copy applies the per-drawing keys, L250-251.) Reword the unwired ones to "TV has the file, not
  the wiring". There are 13 VV "Back-port : candidate" fields, not about 15.
- **WP-S11-03**: compute "open TV versions" by **version citation**, not by dates. A TV log entry counts as open unless
  the VV file's PORT NOTE or log cites that TV module version, or a later whole-file take. Add an `--imports` mode that
  resolves a TV file's imports against VV (folder map applied) and lists what is missing; it should reproduce Appendix
  D. Extra acceptance: it flags MultiModel 1.3.0, ModelStage 1.1.0, Viewport3d 1.8.0 and BatchOps 1.1.0.
- **WP-S11-05**: `files_vv` must include VV `01__AppCore/Na__AppFlow__LoadingSequence.js`, which is edited, not only
  hot.
- **WP-S11-06**: TV `Index.html` and the TV devlog are shared with other TV sessions, so re-read them before writing.
  TV's dead `Na__Elevation__FacePick__`, `__GizmoGrip__` and `__PlaneGizmo__` initialisers are TV's own clean-up
  (v2.86.0 "still open"), not a back-port; leave them out unless Adam asks.
- **WP-S11-07**: add TV plan row L (half stale), the two overstated Phase C rows ("Confirm dialog, dimension config +
  preview splits" and "Styles, exclusions"), and the ValeVision phase rows of the TV feature PLAN files.

### WP-S11-08 (VERIFIER) - Port-order map from the TV import graph (S)
- Scope: for every TV drawing-system and LE module the swarm will take whole, compute the closure of its imports that
  do not exist in VV (folder map applied), the way Appendix D does for the 62 c.1 rows. Emit a "blocked-by" column
  for the Module Register and a leaves-first wave order: a module is taken whole only after everything it imports
  exists in VV. Until then it gets hunks (port_adapted) or a VV-safe stub of the import, recorded as a seam. Hubs
  come last: LE `ModeController__` (27 missing imports), `SheetTools__PointerDrag__` (12), `Toolbar__` (12),
  `SheetTools__Keyboard__` (11), `SheetTools__ContextMenu__` (9), `Panel__ScrapbookParametric__` (9), the elevation
  and floor plan `DevMenu__Editor__` (9, 8).
- Files: none in either app; the output goes to the planner and the ledger's Module Register (through the scribe).
- Depends on: nothing. Run before wave 1.
- Acceptance: reproduces Appendix D for the 62 rows; every TV import that targets `80__CloudflareIntegration`,
  `LocalProjectMirror__` or a NAAPPS route is flagged "transport seam (DIV-4)", never "port".

### WP-S11-09 (VERIFIER) - Finish TV's half-landed VV back-ports (S, TV side, only with Adam's approval - D-S11-06, D-S11-10)
- Scope: (1) PlanDimensions split: make TV `44/Na__PlanDimensions__Data__.js` and `__Editor__.js` import from the split
  `ConfigState__` and `EditorPreview__` and delete the duplicate getters, so there is one loaded config (today LE
  `MarkupBridge__` reads the unloaded copy). (2) Per-drawing style toggles: wire `40/Na__DrawView__StyleRows__.js`
  Styles and Exclusions rows into TV's 2.0.0 floor plan and elevation row builders (VV `43/46 ...RowBuilders__.js`
  pattern), or record Adam's decision to drop them.
- Files (TV): `44__System__PlanDimensions/Na__PlanDimensions__Data__.js`, `__Editor__.js`, `__ConfigState__.js`,
  `__EditorPreview__.js` and their importers (AxisLock, ClientMode, Overlay, PlanAnnotations Toolbar, DrawView
  MarkupMount, LE MarkupBridge, FloorPlan and Elevation ModeControllers); `42/Na__FloorPlan__DevMenu__RowBuilders__.js`,
  `45/Na__Elevation__DevMenu__RowBuilders__.js`. Hot: TV devlog.
- Acceptance: TV `Data__` no longer defines `Na__PlDim__GetLineSetup` and friends; exactly one module calls
  `Na__PlDim__Load` per config; a plan's Styles toggle changes its drawing in TV as in VV; TV `Na__Verify__` harnesses
  pass; the VV ledger rows L1219/L1220/L1225 close.

### Sequencing for the planner
WP-S11-01 and WP-S11-03 first (before wave 1); WP-S11-02 alongside; WP-S11-04 after every wave; WP-S11-05 any
time (independent of the LE waves; touches the VV render loop, so not in the same wave as S10/S03a packages that edit
`Na__AppFlow__LoadingSequence.js`); WP-S11-06/07 only after D-S11-06. The Release Watermark's "Owning slice" column
(Appendix A) is the map from each open TV release to the slice whose packages close it.

**VERIFIER sequencing additions:** WP-S11-08 runs before wave 1, because its leaves-first order decides the waves. WP-S11-09
goes with WP-S11-06 and only after D-S11-06 and D-S11-10. No package takes a c.1 `port_whole_reapply_vv` file until
its Appendix D imports exist in VV.

---

## Appendix A - Every TrueVision release v2.24.0 - v2.172.0, classified

Legend - Area: LE-CORE (sheet model, history, autosave, tabs, toolbar, loader), LE-VIEWPORT (viewports, render
styles), LE-TOOLS (sheet tools), LE-DRAW (drawing tools), LE-TITLE (title block, chrome, QR), LE-SPEC
(specification and notes), LE-SCRAP (scrapbooks), LE-AREAS (floor areas), LE-REG (register, document IDs, sheet
images), LE-STMT (statement writer), LE-PUB (publishing, sharing, web viewer, PDF), LE-SITE (site plans, hatch
library), PL (projected linework 50), DRAW-CORE (drawing core, plans, elevations, north, planes, depth fog),
KEYS, COLOUR, PERSIST, PM (presentation), 3D, SHELL. Classification as in B3. "(Lnnnn)" is the heading's line in
`TV/TrueVision__DEVLOG__.md` (jump with Read offset).

**VERIFIER:** four rows are reclassified: v2.48.0, v2.49.0 and v2.49.1 become PENDING-SIGNOFF, and v2.92.0 becomes
NOT-DRAWING. 16 NOT-CONSIDERED rows carry a "parked by TV PLAN" note (B3 verifier note). All 172 "(Lnnnn)" references
and dates were re-checked against `ref/tv_devlog_index.txt`: 0 mismatches.

| TV version | Date | Title (TV devlog) | Area | Classification | VV version | Owning slice | Notes / evidence | TV tests |
|---|---|---|---|---|---|---|---|---|
| v2.172.0 (L5) | 29-Sep-2026 | R2 Holds Every Statement Picture Where the Statement Says It Is: a Publish Alone Makes the W... | LE-STMT/PUB | **NOT-CONSIDERED** | - | S07b+S08 | Statement pictures published to R2 at their linked address (Publish__Images 1.2.0). TV: "NOT in ValeVision (no statement tab there)". Needs the Statement Writer + publishing + a VV R2 statement route (DIV-4). | updated: Na__Test__StatementFinishes__, Na__Test__StatementFinishes__, Na__Test__StatementPublish__ |
| v2.171.0 (L64) | 29-Sep-2026 | The Web Viewer Shows a Statement's Published Pictures: No More 404s, Figures at Their True S... | LE-STMT/PUB | **NOT-CONSIDERED** | - | S07b+S08 | Web viewer reads a statement's published pictures (Reader 1.1.0, Images 1.1.0, Publisher 1.2.0, Pdf 1.2.0). Depends on v2.95.0+ statement writer and v2.155.0 publishing. | updated: Na__Test__StatementFinishes__, Na__Test__StatementFinishes__, Na__Test__StatementPublish__ |
| v2.170.0 (L126) | 29-Sep-2026 | A Published Statement Is the Read View: Every New Element Publishes, the Start Draws Right o... | LE-STMT/PUB | **NOT-CONSIDERED** | - | S07b+S08 | Published statement = the Read view (Statement__Publish__Page__). Statement writer chain. | TV tests: Na__Test__StatementPublish__ |
| v2.169.0 (L205) | 29-Sep-2026 | The Web Viewer's Design Statements Tab Offers Nothing but Reading: No Manage, No Rename, No... | LE-STMT/PUB | **NOT-CONSIDERED** | - | S07b+S08 | Web viewer Design Statements tab read-only (Statement__Manager/Page). Statement writer chain. | - |
| v2.168.0 (L275) | 29-Sep-2026 | The Materials Table Becomes a Finishes Comparison: Each Element's Existing Finish Over Its P... | LE-STMT | **NOT-CONSIDERED** | - | S07b | Finishes Comparison standard section. NOT confirmed by Adam in TV. NA planning-statement content: needs VV adaptation decision. | TV tests: Na__Test__StatementFinishes__, Na__Test__StatementFinishes__; updated: Na__Test__StatementStandard__, Na__Test__StatementStandard__ |
| v2.167.0 (L360) | 29-Sep-2026 | A Statement Ends the Same Way Every Time: a Drawing Schedule Synced From the Register at a B... | LE-STMT/REG | **NOT-CONSIDERED** | - | S07b | Drawing Schedule synced from the Register + Footer standard sections. Needs Register (51__Feature__DrawingRegister) and Statement Writer. NOT confirmed by Adam. | TV tests: Na__Test__StatementSchedule__; updated: Na__Test__StatementRoundTrip__, Na__Test__StatementStandard__, Na__Test__StatementStandard__ |
| v2.166.0 (L466) | 29-Sep-2026 | Share: Every Read View Hands Out a Link That Opens That One Document, Read-Only, on Any Devi... | LE-PUB | **NOT-CONSIDERED** | - | S08 | Share links (66__Feature__DocumentSharing, PubSchema ShareLinks, q/ folder). TV note "no web viewer" is WRONG: VV has 80__Feature__WebViewer since VV v2.58.0; VV lacks the published system and q/ folder. | TV tests: Na__Test__ShareLinks__; updated: Na__Test__PublishedSchema__ |
| v2.165.0 (L556) | 29-Sep-2026 | A Figure's Title Lives Inside the Figure: It Starts at the Picture's Left Edge and Wraps at... | LE-STMT | **NOT-CONSIDERED** | - | S07b | Figure title inside the figure (Statement__Editor__Figure, Md__Figure). NOT confirmed by Adam. | TV tests: Na__Test__StatementFigureTitle__ |
| v2.164.0 (L620) | 29-Sep-2026 | A Site Plan Legend in the Parametric Scrapbook: Every Wash, Hatch and Line the Site Plans Sh... | LE-SCRAP/SITE | **NOT-CONSIDERED** (VERIFIER: parked on sign-off by TV PLAN ScrapbookSystem phase 7) | - | S06a (+S04a site plans) | Site Plan Legend parametric scrapbook items (SiteLegend__, SiteLegendLink__). Needs site plans (v2.48.0+) and hatch (v2.90.0). TV: "it has no site plan drawings". | TV tests: Na__Test__ScrapbookSiteLegend__; updated: Na__Test__AreaSchedule__, Na__Test__ScrapbookCabinetInfill__ |
| v2.163.0 (L704) | 29-Sep-2026 | The Project Specification Is Kept in Step With Its File, as a Statement Is: an Agent's Edit... | LE-SPEC | **NOT-CONSIDERED** | - | S06b | Specification lockstep with its file (SpecData__Lockstep, SpecLockstep). TV: port needs the Statement Writer's pure rules file (Statement__Lockstep__). | TV tests: Na__Test__SpecLockstep__; updated: Na__Test__SpecInlineEdit__ |
| v2.162.0 (L797) | 29-Sep-2026 | Standard Sections: the Header, the Contents and the TrueVision 3D Project Hub Are Switched O... | LE-STMT | **NOT-CONSIDERED** | - | S07b | Statement standard sections incl. "TrueVision 3D Project Hub" (Standard__TrueVisionHub__, ProjectQr). NA identity content - VV adaptation decision. | TV tests: Na__Test__StatementStandard__, Na__Test__StatementStandard__ |
| v2.161.0 (L873) | 28-Sep-2026 | A Scene Can Turn the Sun, and Every Scene It Does Not Touch Keeps the Default (Ported From V... | PM (3D) | **VV-ORIGIN** | VV v2.71.0 | - | Per-scene lighting authored in VV v2.71.0 and ported to TV the same day; ledger "Per-Scene Lighting" table records parity. Nothing to port. | TV tests: Na__Test__PerSceneLighting__ (VV has it) |
| v2.160.0 (L967) | 23-Sep-2026 | A Published or Printed Site Plan Filled In Its Holes: the Lake Got the Field's Grass, the Is... | LE-SITE/PUB | **NOT-CONSIDERED** | - | S08+S04a | Site plan holes in publish/print (ShapeRings, Publish__Viewports, PdfExporter site fills). TV: "ValeVision has neither the publisher nor Shape__Holes". | TV tests: Na__Test__SitePlanFaces__ |
| v2.159.0 (L1017) | 23-Sep-2026 | A Storey Seam Thirteen Microns Out Drew a Line Across Every Elevation: the Flush-Join Test N... | PL | **PENDING-SIGNOFF** | - | S02b | FlushJoins tolerance. TV devlog says "ValeVision has FlushJoins 1.0.0 ... port on Adam's sign-off" - FALSE: VV 50 has no FlushJoins module at all (v2.37.0 never ported). Port v2.37.0 + v2.159.0 together. | TV tests: Na__Test__FlushJoins__ |
| v2.158.0 (L1077) | 23-Sep-2026 | The Tab Strip Is Five Tabs: 3D Model, Drawings (a Menu of Every Drawing), Specification, Doc... | LE-CORE (UI) | **NOT-CONSIDERED** | - | S03a+S10 | Tab strip = five tabs (3D Model, Drawings menu, Specification, Document Register, Design Statements); TabStrip 2.0.0, LeMode__EnterUnder. VV TabStrip 1.5.0 still one tab per sheet. Major UI parity item (S03a/S10). | - |
| v2.157.0 (L1161) | 23-Sep-2026 | Statement Writer Lockstep: The App's Copy and the Markdown File Are Checked Against Each Oth... | LE-STMT | **NOT-CONSIDERED** | - | S07b | Statement Writer lockstep with its markdown file. Statement writer chain. | TV tests: Na__Test__StatementLockstep__; updated: Na__Test__StatementRoundTrip__ |
| v2.156.0 (L1214) | 23-Sep-2026 | Published Drawings Loading Screen: Each Drawing Arrives Whole, Named, With What Is Loading S... | LE-PUB | **NOT-CONSIDERED** | - | S08 (+S10 loading screen) | Published drawings loading screen (52__System__Layout__PublishedDocuments PubDoc__LoadingScreen). Needs the publishing system. | updated: Na__Test__PublishedReader__, Na__Test__PublishedSchema__ |
| v2.155.0 (L1266) | 23-Sep-2026 | Publishing: Drawings Are Baked Once on the Authoring Machine, and the Web Viewer Only Shows... | LE-PUB | **NOT-CONSIDERED** | - | S08 | Publishing: drawings baked once, web viewer shows files (65__Feature__DocumentPublishing, 52/53 top-level folders, PublishedDocuments schema). CONFIRMED by Adam in TV. Needs VV R2/worker routes (DIV-4). | TV tests: Na__Test__PublishedReader__, Na__Test__PublishedReader__Harness__, Na__Test__PublishedSchema__ |
| v2.154.0 (L1366) | 23-Sep-2026 | Layer Switches in One Red: Off, Unlock and Ref Show Which Layers Are Out of Their Usual State | LE-CORE (UI) | **NOT-CONSIDERED** | - | S06a (Layers panel) / S10 | Layer Off/Unlock/Ref buttons in one red (Panel__Layers 1.3.0, na-le-btn--eye absent in VV). Needs v2.123.0 reference layers first. | updated: Na__Test__LayerMenu__, Na__Test__LayerStack__ |
| v2.153.0 (L1391) | 23-Sep-2026 | Box Select Over a Viewport: a Drag That Moves Nothing Draws the Box | LE-TOOLS | **NOT-CONSIDERED** | - | S05a | Box select over an unlocked viewport (PointerPress 1.10.0 ViewportHoldsStill; absent in VV). CONFIRMED by Adam in TV ("It works fantastically"). | - |
| v2.152.0 (L1428) | 23-Sep-2026 | Dimension Line Weight and Line Style: Line pt and Dashed Lines in the Dimensions Panel | LE-DRAW | **NOT-CONSIDERED** | - | S05b | Dimension Line pt + dashed lines (Dimension__LinePt / Dimension__LineStyle absent in VV; LineStyleTool 1.1.0, Panel__Dimensions 1.7.0, DimensionGeometry 1.6.0, MarkupBridge 1.20.0). | - |
| v2.151.0 (L1481) | 22-Sep-2026 | The Boolean Keys: Shift+U Union, Shift+S Subtract, Shift+T Trim and Shift+O Outer Shell, on... | LE-DRAW/KEYS | **NOT-CONSIDERED** (VERIFIER: parked on sign-off by TV PLAN VectorTools L337) | - | S05b (+S05a keys) | Boolean keys Shift+U/S/T/O (VectorTools__BooleanTool, Na__Hotkeys__DrawingTabs__.json). Needs v2.150.0 and the key-scope split (v2.110.0/v2.115.0). | updated: Na__Test__DrawingTabKeys__, Na__Test__VectorBooleans__ |
| v2.150.0 (L1552) | 22-Sep-2026 | Boolean Tools and Vectors With Holes: Union, Subtract, Trim, Intersect, Split and Outer Shell | LE-DRAW | **NOT-CONSIDERED** (VERIFIER: parked on sign-off by TV PLAN VectorTools L337) | - | S05b | Boolean tools + vectors with holes (37__System__VectorTools Boolean, ShapeRings, Shape__Holes). TV warns a VV reader without Shape__Holes draws stray edges: record-schema item. | TV tests: Na__Test__VectorBooleans__; updated: Na__Test__SetMoveLeaderTips__ |
| v2.149.0 (L1669) | 22-Sep-2026 | The Move Anchor: Ctrl+Click an Item, Put the Red Cross on a Point, and Move It From That Poi... | LE-TOOLS | **NOT-CONSIDERED** | - | S04b (ObjectSnap) / S05a | Move Anchor (Ctrl+click red cross; MoveAnchor__ + config, Styles__ObjectSnap). TV devlog has no VV line. Needs 28__System__ObjectSnap. | TV tests: Na__Test__MoveAnchor__; updated: Na__Test__CopyDrag__, Na__Test__GroupMoveSnapping__, Na__Test__SetMoveLeaderTips__ |
| v2.148.0 (L1757) | 22-Sep-2026 | Project Floor Areas: One Master List of Floors Across Every Sheet, and a Floor After a Sched... | LE-AREAS | **NOT-CONSIDERED** (VERIFIER: parked on sign-off by TV PLAN FloorAreas phase 9) | - | S06b | Project Floor Areas master list (AreaSchedule 1.1.0, FloorAreas__Table 1.1.0). Floor Areas chain (v2.104.0). | updated: Na__Test__AreaSchedule__, Na__Test__FloorAreas__ |
| v2.147.0 (L1795) | 22-Sep-2026 | Leaderless Notes: Whole Specification Groups Listed on a Sheet With No Bubble Pointing at Th... | LE-SPEC | **NOT-CONSIDERED** | - | S06b | Leaderless notes (Panel__MarginNotes__Leaderless, SheetRecords__LeaderlessNotes). VV SpecMargin 1.3.0-equivalent lacks it. | TV tests: Na__Test__LeaderlessNotes__; updated: Na__Test__NoteRegions__ |
| v2.146.0 (L1901) | 22-Sep-2026 | Three Guards Round the Project File: a Draft Is Judged Before It Goes Back, a Save Is Judged... | PERSIST | **NOT-CONSIDERED** | - | S03b+S09 | Three guards round the project file (DrawingsData__SavedIso, LocalProjectMirror, ProjectVision local server). Transport-specific (DIV-4): VV needs its own Flask route in WCP/server.py + R2SaveProjectJson guard. | TV tests: Na__Test__DraftGuard__, Na__Test__ProjectDataSaveGuard__; updated: Na__Test__DraftRestore__ |
| v2.145.0 (L2006) | 22-Sep-2026 | The Browser Draft of Unsaved Sheets Comes Back After a Reload, Whichever Gets There First -... | LE-CORE | **NOT-CONSIDERED** | - | S03b | Browser draft restore race (Na__DrawData__IsLoaded absent in VV). Check whether VV's lazy loader already orders drawings-before-editor; port the guard regardless for parity. | TV tests: Na__Test__DraftRestore__ |
| v2.144.0 (L2084) | 22-Sep-2026 | A Specification Note Is Reworded Beside the Drawing, Spell-Checked With the Practice's Own D... | LE-SPEC/SPELL | **NOT-CONSIDERED** | - | S06b | Spec note reworded beside the drawing + practice dictionary spell check (55__Feature__SpellCheck, 58 RowEditor, NoteTooltip, 50__TrueVision__UserConfig, TrueVisionUserConfig API). VV needs a Flask user-config route (WCP). | TV tests: Na__Test__BubbleNoteTooltip__, Na__Test__SpecInlineEdit__, Na__Test__SpellCheckDictionary__, Na__Test__SpellCheckField__, Na__Test__UserSpellingsApi__ |
| v2.143.0 (L2253) | 22-Sep-2026 | Overspill Note Regions: Boxes Drawn Anywhere on a Sheet That Hold the Notes the Margin Cannot | LE-SPEC | **NOT-CONSIDERED** | - | S06b | Overspill note regions (NoteRegions__, SheetRecords__NoteRegions, SpecMargin__Column, Region__ keys). | TV tests: Na__Test__NoteRegions__; updated: Na__Test__ObjectSnap__ |
| v2.142.0 (L2384) | 22-Sep-2026 | A Viewport Groups With Its Notes, and What Is Placed Inside an Open Group Joins It | LE-TOOLS | **NOT-CONSIDERED** | - | S05a | A viewport groups with its notes; placing inside an open group joins it (Groups, EditScope, ItemClipboard). Builds on v2.138.0 (LeVpRot) and v2.116.0 (SheetImages__Insert). | updated: Na__Test__CrossSheetClipboard__, Na__Test__LayerMenu__, Na__Test__SetMoveLeaderTips__ |
| v2.141.0 (L2506) | 22-Sep-2026 | A Leader Travels With What It Is Moved With, and a Group Takes Its Leaders and Dimensions | LE-TOOLS | **NOT-CONSIDERED** | - | S05a | A leader travels with what it is moved with; groups take leaders and dimensions (CopyDrag, LeMarkup__DimensionBounds absent in VV). | TV tests: Na__Test__SetMoveLeaderTips__; updated: Na__Test__GroupMoveSnapping__ |
| v2.140.0 (L2594) | 22-Sep-2026 | Hide Swings: a Roof Plan No Longer Draws the Top Storey's Door Swings Over Its Roof - and 1:... | PL/LE-VIEWPORT | **NOT-CONSIDERED** | - | S02b+S04a | Hide swings (Viewport__HideSwings) and 1:200 scale. Rides on plan doors (v2.42.0) and storeys (v2.105.0). | TV tests: Na__Test__HideSwings__; updated: Na__Test__GroupMoveSnapping__ |
| v2.139.1 (L2700) | 21-Sep-2026 | Project Data Is Always Asked of the CDN, So a Tab Never Runs on a Previous Build's Layer List | SHELL (loader) | **NOT-DRAWING** | - | - | TV project-data fetch gets cache:no-cache. VV loader differs (build-manifest token + no-store manifest fetch, Na__AppUtils__ProjectLoader 1.0.0). Not applicable as written; check VV project.json caching separately. | - |
| v2.139.0 (L2720) | 21-Sep-2026 | Round Up to 5 mm: a Dimension Can Show Its Figure Raised to the Next 5 mm, With an Asterisk... | LE-DRAW | **NOT-CONSIDERED** | - | S05b | Round dimension up to 5 mm with asterisk (Dimension__RoundUp, DimensionRounding__ absent in VV). | TV tests: Na__Test__DimensionRoundUp__ |
| v2.138.0 (L2800) | 21-Sep-2026 | Viewports Turn on the Page: a Round Grip Off the Top of the Frame Turns the Whole Viewport A... | LE-VIEWPORT | **NOT-CONSIDERED** | - | S04a | Viewport rotation grip (Viewport__RotationDeg, ViewportRotation__). Touches snaps, crops, boxes, doors, PDF; prerequisite of v2.140-v2.142, v2.144. | TV tests: Na__Test__ViewportRotation__; updated: Na__Test__LayerMenu__, Na__Test__ObjectSnap__, Na__Test__PaintedOnThePoint__ |
| v2.137.0 (L2909) | 21-Sep-2026 | The Snap Marker Sits ON the Corner It Found: at 32x It Was Painted 17 Pixels From It, Half o... | LE-TOOLS | **NOT-CONSIDERED** | - | S04b | Snap marker painted on the corner (ObjectSnap__Marker, LeSurface__ZOOM_SETTLED_EVENT). | TV tests: Na__Test__PaintedOnThePoint__; updated: Na__Test__DrawingAxes__, Na__Test__DrawingGrid__, Na__Test__ObjectSnap__, Na__Test__OrthoMode__, Na__Test__VectorQuality__ |
| v2.136.0 (L3013) | 21-Sep-2026 | Dimensioning a Heavy Plan: the Pointer Move Drops From 12 ms to Half a Millisecond, and a Ne... | LE-VIEWPORT | **NOT-CONSIDERED** | - | S04a | Heavy-plan pointer performance + Vector quality Low/Medium/High (VectorQuality__, LeModel__Revision, LeSurface__PutSlot). Not confirmed by Adam. | TV tests: Na__Test__SheetsNormaliseOnce__, Na__Test__VectorQuality__ |
| v2.135.0 (L3158) | 21-Sep-2026 | An Author Zooms In to 6400%; the Web Viewer Still Stops at 800% | LE-CORE | **NOT-CONSIDERED** | - | S03b | Author zoom to 6400%, web viewer 800% (Navigation 1.3.0, DevGate-gated ZoomMax). Test Na__Test__AuthoringZoomMax__. | TV tests: Na__Test__AuthoringZoomMax__; updated: Na__Test__DrawingTabKeys__, Na__Test__SheetPagingWalkExit__ |
| v2.134.0 (L3216) | 21-Sep-2026 | The Cabinet Infill Is Held by Its Bottom Left Corner, Fitted by Any Other, and Its Options A... | LE-SCRAP | **NOT-CONSIDERED** (VERIFIER: parked on sign-off by TV PLAN ScrapbookSystem phase 7) | - | S06a | Cabinet infill held by bottom-left corner (LeParam__BasePoint). Needs v2.128.0. | updated: Na__Test__ScrapbookCabinetInfill__ |
| v2.133.0 (L3302) | 21-Sep-2026 | The Browser's Colour Mixer Opened a Screen Away From the Field; It Now Sits on Top of the Pa... | COLOUR | **NOT-CONSIDERED** | - | S06b | Native colour mixer placed over the palette (ColourPicker__Place). Needs 54__Feature__ColourPalette (v2.126.0). | updated: Na__Test__ColourPalette__ |
| v2.132.0 (L3375) | 21-Sep-2026 | Tag the Face and It Fills: Hard Standing and Paving in Two Greys, and a Wash That No Longer... | LE-SITE | **NOT-CONSIDERED** (VERIFIER: parked on sign-off by TV PLAN SitePlanComposites P10) | - | S04a | Site plan face fills by tag (SitePlan__Store, Layer__LineworkFile). TV: "Not in ValeVision - it has no site plan system". Needs Vale site plan data decision. | TV tests: Na__Test__SitePlanStore__; updated: Na__Test__SitePlanComposites__ |
| v2.131.0 (L3436) | 21-Sep-2026 | The Drawing Axes Overlay (F9): SketchUp's Red and Green Axes, Carried by the Cursor Out to t... | LE-TOOLS | **NOT-CONSIDERED** | - | S04b | Drawing Axes overlay F9 (33__System__DrawingAxes). | TV tests: Na__Test__DrawingAxes__ |
| v2.130.0 (L3544) | 21-Sep-2026 | The Vector Editor Could Draw a Line and a Rectangle and Move Their Points; It Can Now Trim,... | LE-DRAW | **NOT-CONSIDERED** (VERIFIER: parked on sign-off by TV PLAN VectorTools L337) | - | S05b | Vector editor trim/extend/join/split/offset/fillet/chamfer, circles and arcs (37__System__VectorTools, Shape__Curve). | TV tests: Na__Test__VectorTools__; updated: Na__Test__CrossSheetClipboard__ |
| v2.129.0 (L3651) | 21-Sep-2026 | A Picked Vertex Was White on White Paper Once Zoomed In; a Grip Now Says Whether Its Point I... | LE-TOOLS | **NOT-CONSIDERED** | - | S04b | Object snap gets its own folder (28__System__ObjectSnap: six AutoCAD modes, marker, grips say where a point is). VV keeps 30__System__SheetTools/Na__LayoutEditor__Snapping__.js (1.2.0) - module rename/move needed. | TV tests: Na__Test__ObjectSnap__; updated: Na__Test__DrawingGrid__, Na__Test__GroupMoveSnapping__, Na__Test__LayerMenu__, Na__Test__MoveRetype__, Na__Test__OrthoMode__ |
| v2.128.0 (L3801) | 21-Sep-2026 | A Cabinet Infill for the Scrapbook: Adam's Dashed Cross and Boxed Name, Measured Off His Lay... | LE-SCRAP | **NOT-CONSIDERED** (VERIFIER: parked on sign-off by TV PLAN ScrapbookSystem phase 7) | - | S06a | Cabinet infill parametric item (ScrapbookParametric__CabinetInfill__). TV: needs the engine's adopt hook and grips corner snap. | TV tests: Na__Test__ScrapbookCabinetInfill__ |
| v2.127.0 (L3906) | 21-Sep-2026 | A Paste on Another Sheet Brings Its Layer: Found by Name, or Made Where It Sat in the List,... | LE-TOOLS | **NOT-CONSIDERED** | - | S05a | Cross-sheet paste brings its layer (LeClip__Landing, LeModel__GetLayerByName). | updated: Na__Test__CrossSheetClipboard__, Na__Test__LayerMenu__ |
| v2.126.0 (L3982) | 21-Sep-2026 | A Colour Palette Opens Above Every Colour Field; a Hatch Gets Its Own Line Weight and Colour... | COLOUR/LE-DRAW | **NOT-CONSIDERED** | - | S06b (+S05b hatch) | Colour palette over every colour field (54__Feature__ColourPalette), hatch weight/colour, construction materials pack (52__LayoutEditor__HatchPatternLibrary). Palette colours are NA/SSOT - VV token review. | TV tests: Na__Test__ColourPalette__, Na__Test__HatchLineControls__; updated: Na__Test__SitePlanComposites__ |
| v2.125.0 (L4125) | 21-Sep-2026 | A Room's Label Starts in the Middle of Its Box, and in Edit Mode It Can Be Dragged to Wherev... | LE-AREAS | **NOT-CONSIDERED** (VERIFIER: parked on sign-off by TV PLAN FloorAreas phase 9) | - | S06b | Room label starts centred and drags in Edit (FloorAreas__LabelGrip). TV: "Floor Areas goes across whole, once signed off". | updated: Na__Test__FloorAreas__ |
| v2.124.0 (L4193) | 21-Sep-2026 | Undo, Redo, Fit and the Zoom Readout Leave the Drawing Toolbar; Their Keys Stay | LE-CORE (UI) | **NOT-CONSIDERED** | - | S10 | Undo/Redo/Fit/zoom readout removed from the toolbar (Toolbar 1.19.0). VV Toolbar__ still builds undo/fit buttons (lines 318, 323). | - |
| v2.123.0 (L4231) | 21-Sep-2026 | A Right Click Moves Anything to Another Drawing Layer, and a Layer Can Be Made a Reference:... | LE-TOOLS | **NOT-CONSIDERED** | - | S05a | Right-click Move to layer + reference layers (LayerMenu__, Layer__Selectable, LeModel__MoveToLayer). | TV tests: Na__Test__LayerMenu__; updated: Na__Test__CrossSheetClipboard__, Na__Test__DrawingGrid__, Na__Test__GroupMoveSnapping__ |
| v2.122.0 (L4366) | 21-Sep-2026 | A Drawing Title's Underline Runs Five Millimetres Past Its Words, and No Longer Stops Short... | LE-SCRAP | **NOT-CONSIDERED** (VERIFIER: parked on sign-off by TV PLAN ScrapbookSystem phase 7) | - | S06a | Drawing Title underline runs 5 mm past its words (DrawingTitle__UnderlinePastTextMm). VV DrawingTitle is TV 1.0.0-equivalent. | updated: Na__Test__ScrapbookDrawingTitle__ |
| v2.121.0 (L4436) | 21-Sep-2026 | Sheet Pictures Are Stored at Print Size, Not Render Size: a 13.8 MB PNG Placed 196 mm Wide I... | LE-REG (images) | **NOT-CONSIDERED** (VERIFIER: parked on sign-off by TV PLAN SheetImages L132) | - | S07a | Sheet pictures stored at print size (LeImgEnc/LeImgGeo/LeImgPub). Needs Sheet Images (v2.116.0). | updated: Na__Test__SheetImages__ |
| v2.120.0 (L4504) | 21-Sep-2026 | The Project Portal Block's Code Is a Soft Grey, Not Black; the Title Block's Stays Black | LE-TITLE (QR) | **NOT-CONSIDERED** | - | S07a | Project Portal block code soft grey (ProjectQr Symbol). Needs the Portal block (v2.100.0). NA "Project Portal" identity - decision. | updated: Na__Test__ProjectQr__, Na__Test__ProjectQr__Decode__, Na__Test__ScrapbookProjectQr__ |
| v2.119.0 (L4561) | 21-Sep-2026 | Copy Arrays, SketchUp's Way: Drag a Copy, Type 1000 and Enter, Then 3x - or /3 to Divide the... | LE-TOOLS | **NOT-CONSIDERED** | - | S05a | Copy arrays (drag a copy, type 1000, then 3x or /3; SheetTools__CopyDrag). Needs v2.117.0. | updated: Na__Test__CopyDrag__ |
| v2.118.0 (L4661) | 21-Sep-2026 | The Measurements Box Froze the Moment a Move Began, and a Move Could Not Be Corrected: It No... | LE-TOOLS | **NOT-CONSIDERED** | - | S05a | Measurements box reads every move step; retype the last move (GetMoveRetype absent in VV). PointerDrag 1.12.0, HitResolution 1.5.0. | TV tests: Na__Test__MoveRetype__; updated: Na__Test__CrossSheetClipboard__ |
| v2.117.0 (L4766) | 21-Sep-2026 | Ctrl-Drag Copies, as in SketchUp LayOut: Duplicate and Move Are One Gesture, and Every Lock... | LE-TOOLS | **NOT-CONSIDERED** | - | S05a | Ctrl-drag copies (SheetTools__CopyDrag). | TV tests: Na__Test__CopyDrag__; updated: Na__Test__CrossSheetClipboard__, Na__Test__DrawingTabKeys__, Na__Test__GroupMoveSnapping__ |
| v2.116.0 (L4851) | 21-Sep-2026 | Sheet Images: a Picture on a Drawing Is Filed Under That Drawing's Number, Wherever the Numb... | LE-REG (images) | **NOT-CONSIDERED** (VERIFIER: parked on sign-off by TV PLAN SheetImages L132) | - | S07a | Sheet Images filed under the drawing number (54__Feature__SheetImages, Shape__Image, TrueVisionSheetImages API). Needs a VV Flask/R2 image route (DIV-4) and Document ID decision. | TV tests: Na__Test__SheetImagesApi__, Na__Test__SheetImages__ |
| v2.115.0 (L4979) | 21-Sep-2026 | M Was Never Stuck: Every Click on the Paper Left the Keyboard in Whatever Panel Control Had... | KEYS | **NOT-CONSIDERED** | - | S05a (+S03a key map) | Keyboard left in panel controls (KeyScope__, Na__Hotkeys__3dModelTab/DocumentTabs/DrawingTabs json, 31__System__DocumentKeys). Replaces LE KeyMappings json - module rename (S03a). | TV tests: Na__Test__DrawingTabKeys__; updated: Na__Test__CrossSheetClipboard__, Na__Test__SheetPagingWalkExit__ |
| v2.114.0 (L5072) | 21-Sep-2026 | The Drawing Grid: SketchUp LayOut's Grid, Shown on F6 and Snapped To on F7 - and the Title B... | LE-TOOLS | **NOT-CONSIDERED** | - | S04b | Drawing Grid F6/F7 (27__System__DrawingGrid); title block becomes snappable. | TV tests: Na__Test__CrossSheetClipboard__, Na__Test__DrawingGrid__, Na__Test__GroupMoveSnapping__ |
| v2.113.0 (L5206) | 21-Sep-2026 | Ortho Mode on F8, as in AutoCAD: a Held Shift, Latched - and Shift Then Frees It | LE-TOOLS | **NOT-CONSIDERED** | - | S04b | Ortho mode F8 (32__System__OrthoMode). | TV tests: Na__Test__OrthoMode__ |
| v2.112.0 (L5324) | 21-Sep-2026 | Page Down Turns the Drawing, Ctrl+S Saves the Register, and Opening a Drawing Really Leaves... | KEYS/LE-CORE | **NOT-CONSIDERED** | - | S05a+S02a | Page Down steps sheets, Ctrl+S saves the register, opening a drawing leaves Walk (LeMode__StepSheet, Nav__NextSheet, Transitions). Register half N/A until a register exists. | TV tests: Na__Test__SheetPagingWalkExit__; updated: Na__Test__DocumentKeys__ |
| v2.111.0 (L5404) | 21-Sep-2026 | Zoom Now, Redraw When It Rests: a Wheel Notch Was Rebuilding Things That Had Nothing to Do W... | LE-VIEWPORT | **PENDING-SIGNOFF** | - | S04b | Zoom now, redraw when it rests (ZoomSettleMs, HoldPaperWhileZooming). TV: "Not ported. Goes with Draft mode, on Adam's sign-off". | - |
| v2.110.0 (L5496) | 21-Sep-2026 | Three Tool Sets, Three Keyboards: a Letter Typed Into a Statement Is a Letter | KEYS | **NOT-CONSIDERED** | - | S05a | Three tool sets, three keyboards (KeyScope, DocumentKeys config). Prerequisite for statement/spec typing. | TV tests: Na__Test__DocumentKeys__ |
| v2.109.0 (L5575) | 21-Sep-2026 | The Big Sheets Give the Small Title Block Cells Air, the Rev Cell Says "Revision A", and the... | LE-TITLE | **NOT-CONSIDERED** | - | S03b (+S07a portal) | Title block cells widen on big sheets, "Revision A", portal block at 20 mm (LeTitleCells__Widen, RowWidthFactorByPaper). TV: "VV has the cells solver at v1.1.0 and no portal block". Cells half portable now. | updated: Na__Test__ScrapbookProjectQr__, Na__Test__TitleBlockCells__, Na__Test__TitleBlockCells__ |
| v2.108.0 (L5635) | 21-Sep-2026 | The Scan Me Button's Handset Now Looks Like the Phone in Somebody's Pocket | LE-TITLE (QR) | **NOT-CONSIDERED** | - | S07a | Scan Me button handset icon (ScrapbookParametric__ProjectQr). Needs the portal block. | updated: Na__Test__ScrapbookProjectQr__ |
| v2.107.0 (L5662) | 21-Sep-2026 | Draft Mode, on LayOut's Own Key: A Heavy Sheet Was Never Slow to Draw, Only to Draw Again at... | LE-VIEWPORT | **PENDING-SIGNOFF** | - | S04b | Draft Mode on LayOut's key (26__System__DraftMode). TV: "Not ported. It waits for Adam's sign-off, then the question". | - |
| v2.106.0 (L5787) | 21-Sep-2026 | The Layers List Was Only Ever the Order of the Viewports; Now It Is the Order of the Sheet | LE-CORE | **NOT-CONSIDERED** | - | S03b | Layers list = paint order of the sheet (PaintOrder__, Sheet__LayerStack). Record/rendering semantics change - high-impact parity item (S03b WP-S03b-07). | TV tests: Na__Test__LayerStack__; updated: Na__Test__ScrapbookProjectQr__, Na__Test__SitePlanComposites__ |
| v2.105.0 (L5925) | 21-Sep-2026 | A Floor Plan Is One Storey: Its Cut Picks the Floor, and Every Other Floor's Doors and Swing... | PL | **PENDING-SIGNOFF** | - | S02b | Floor plan = one storey; other floors' doors/swings off (Storeys__, ProjectedLinework__Storeys__Config). TV: "rides with the pending plan doors port, on Adam's sign-off". | TV tests: Na__Test__StoreyBand__ |
| v2.104.0 (L6030) | 21-Sep-2026 | A Room's Area Is Not Something to Store, It Is a Question to Ask the Drawing Underneath It | LE-AREAS | **NOT-CONSIDERED** (VERIFIER: parked on sign-off by TV PLAN FloorAreas phase 9) | - | S06b | Floor Areas (59__Feature__FloorAreas, SheetModel__AreaGroups, AreaSchedule). History step reason "areas". | TV tests: Na__Test__AreaSchedule__, Na__Test__FloorAreas__ |
| v2.103.0 (L6147) | 21-Sep-2026 | Every Pixel of the Depth Fog Was a Colour That Does Not Exist, and Chrome Was Quietly Forgiv... | DRAW-CORE (fog) | **NOT-CONSIDERED** | - | S02b | Depth fog colour fix (ElevationDepthFog__Shader). Needs v2.94.0. | TV tests: Na__Test__IosTextureProbe__ |
| v2.102.0 (L6201) | 21-Sep-2026 | The Project Portal Block Was Placed, Not Set: Every Gap Was a Baseline, Measured as Though I... | LE-TITLE (QR) | **NOT-CONSIDERED** | - | S07a | Project Portal block typesetting (ScrapbookParametric__ProjectQr). Needs v2.100.0. | updated: Na__Test__ScrapbookProjectQr__ |
| v2.101.0 (L6251) | 21-Sep-2026 | The Fields Were the Gaps: Grassland, Rough Grassland and a Light Grey for the Drives - and a... | LE-SITE | **NOT-CONSIDERED** (VERIFIER: parked on sign-off by TV PLAN SitePlanComposites P10) | - | S04a+S05b | Site plan grassland/drive hatches; hatch keeps its colour (36 HatchPatterns, HatchPack index, Viewport2d__SitePlan). TV: "no site plan system at all". | updated: Na__Test__SitePlanComposites__ |
| v2.100.0 (L6345) | 21-Sep-2026 | A Drawing Can Now Ask to Be Scanned: the Project Portal Block, Whose Code Is the Project's O... | LE-TITLE (QR) | **NOT-CONSIDERED** | - | S07a | Project Portal block - a drawing asks to be scanned (Shape__Qr, ProjectQr). TV: "needs Shape__Qr in its record layer". NA portal identity: VV adaptation decision. | TV tests: Na__Test__ScrapbookProjectQr__; updated: Na__Test__SitePlanComposites__ |
| v2.99.0 (L6431) | 21-Sep-2026 | Four Things Wrong With a Statement Read on Paper - a Buried Heading, a Congested Title, Fram... | LE-STMT | **NOT-CONSIDERED** | - | S07b | Statement read on paper fixes (Statement__Editor__Figure, Styles__Statement__Document). | updated: Na__Test__StatementFigure__ |
| v2.98.0 (L6509) | 21-Sep-2026 | A Viewport Would Not Take the Arrow-Key Axis Lock, Because It Was Never a "Move Drag" and It... | LE-TOOLS | **NOT-CONSIDERED** | - | S04b | Viewport takes the arrow-key axis lock (LeVpMove__Solve). Needs ViewportSnapMove (v2.28.0). | - |
| v2.97.0 (L6573) | 20-Sep-2026 | A Picture in a Statement Can Now Be Placed and Trimmed From Its Own Right-Click Menu, and th... | LE-STMT | **NOT-CONSIDERED** | - | S07b | Statement picture right-click menu (27__System__ContextMenuSystem Ui__Open). | TV tests: Na__Test__Reference__TyporaTheme__, Na__Test__StatementFigure__, Na__Test__StatementTypography__ |
| v2.96.0 (L6666) | 20-Sep-2026 | The Bar Belongs Under the Far Corner of the Building, Not Under the Title, So the Far End Is... | LE-SCRAP | **NOT-CONSIDERED** (VERIFIER: parked on sign-off by TV PLAN ScrapbookSystem phase 7) | - | S06a | Scale bar far end held (Meta__BarRight absent in VV). | TV tests: Na__Test__ScrapbookDrawingTitle__ (VV has it); updated: Na__Test__ScrapbookScaleBar__ |
| v2.95.0 (L6771) | 20-Sep-2026 | The Statements a Project Is Won On Were the One Document the App Could Not Open, So It Now W... | LE-STMT | **NOT-CONSIDERED** | - | S07b | Statement Writer (52__Feature__StatementWriter, ~40 files). NA planning statements - VV identity decision (S07b). | TV tests: Na__Test__StatementDomRoundTrip__, Na__Test__StatementRoundTrip__, Na__Test__StatementTyping__ |
| v2.94.0 (L6950) | 20-Sep-2026 | An Elevation Drew the Coach House Forty Metres Back as Hard as the Wall in Front of It, So E... | DRAW-CORE (fog) | **NOT-CONSIDERED** | - | S02b+S04a | Elevation depth fog (49__System__ElevationDepthFog, Elevation__DepthFog/FloorPlan__DepthFog, Viewport2d__DepthFog). TV: "everything else carries over"; VV renders drawings through its composer (DIV-1) so the two draw calls land elsewhere. | TV tests: Na__Test__ElevationDepthFog__ |
| v2.93.0 (L7119) | 20-Sep-2026 | The Enhance Whitecard Effect Had One Setting, and That Setting Was All of It | LE-VIEWPORT | **PENDING-SIGNOFF** | - | S04a | Enhance Whitecard strength as a percent composite weight (Enhance 1.1.0, Weight__Kind "percent" absent in VV). TV: "NOT SIGNED OFF BY ADAM, and not in ValeVision". | TV tests: Na__Test__EnhanceWhitecardStrength__ |
| v2.92.0 (L7224) | 20-Sep-2026 | One Group's Images, Because the Whole Project Is a Long Job on a Massive Model | PM | **NOT-DRAWING** (VERIFIER; was NOT-CONSIDERED) | - | no package yet; S11-V05 (S10 or a presentation package) | Presentation batch: one group's images (PmDev__GetWorkingScenesInGroup, RunImageExport). Presentation Scenes menu, not drawing; VV BatchOps 1.1.0 lacks it. | - |
| v2.91.0 (L7326) | 20-Sep-2026 | You Cannot Read the Specification and Tag a Drawing at the Same Time, So the Specification C... | LE-SPEC | **NOT-CONSIDERED** | - | S06b | Specification Scrapbook beside the drawing (58__Feature__ScrapbookSpecification). TV: "Nothing here is app-specific, and ValeVision holds both halves it stands on". | - |
| v2.90.0 (L7464) | 20-Sep-2026 | A Hatch Stopped Being a Site Plan Thing and Became Something Any Vector Can Have | LE-DRAW | **NOT-CONSIDERED** | - | S05b | Hatch on any vector (Shape__Hatch, Hatch__ keys, LeHatch__DrawPdf). Record-schema item. | updated: Na__Test__SitePlanComposites__, Na__Test__SitePlanComposites__Output__ |
| v2.89.0 (L7530) | 20-Sep-2026 | A Site Plan Is Two Different Drawings, and the Panel That Tuned Them Was Writing to a Record... | LE-SITE | **NOT-CONSIDERED** (VERIFIER: parked on sign-off by TV PLAN SitePlanComposites P10) | - | S04a | Site plan is two drawings; composites panel record fixed (SitePlanComposites config, Viewport__SitePlan.SitePlan__PlanType). Site plan chain. | TV tests: Na__Test__SitePlanComposites__, Na__Test__SitePlanComposites__Output__ |
| v2.88.0 (L7624) | 20-Sep-2026 | The Site Address Was Only Ever Written Down in a Quotation, and Not Every Job Has One | LE-TITLE (record) | **DELIBERATE** | - | S03b (keep divergence) | Site address read from Project Admin quotations/PlanVision (ProjectRecord 1.1.0). VV has no Project Admin; VV ProjectRecord reads project config (ledger "Common title block fields": permanent divergence). | TV tests: Na__Test__ProjectRecordAddress__ |
| v2.87.0 (L7678) | 20-Sep-2026 | A Plan Knew How High It Was Cut and Not Which Floor That Was | DRAW-CORE | **PENDING-SIGNOFF** | - | S02a (+S04a titles) | Floor plan storey level (FloorPlan__StoreyLevel, StoreyRow; ViewportTitleText/Identity 1.1.0). Ledger row L87: "not ported - awaiting Adam's sign-off there". | TV tests: Na__Test__FloorPlanStoreyLevel__ |
| v2.86.0 (L7788) | 20-Sep-2026 | A Nudged Slider Could Move Every Drawing, and the Save Button Under It Had Not Saved a Drawi... | DRAW-CORE | **PENDING-SIGNOFF** | - | S02a | Elevations/Floor Plans menus rebuilt (DraftGuard, DevRowShell, AutoName, Elevation__NameIsAuto, 48 Cross Sections placeholder). Ledger row L87: awaiting sign-off. Elevation/plan DevMenu Editors TV 2.x vs VV 1.x. | TV tests: Na__Test__DrawingDrafts__ |
| v2.85.0 (L7925) | 20-Sep-2026 | The Noodle Has Two Ends, and People Reach for Different Ones | LE-SCRAP | **PORTED** | VV v2.68.0 | - | Noodle plug (LinkNoodle 1.2.0). Plug-hidden-while-dragged fix found by the VV port, fixed in both. TV since 1.2.2. | - |
| v2.84.0 (L7979) | 20-Sep-2026 | The Compass Was Bigger Than the House, and Both It and the Planes Went Out Whenever You Look... | DRAW-CORE | **PARTIAL** | VV v2.67.0 | S02a | Compass size ported "as TV v2.84.0 left it"; NOT ported: drawing planes half and Na__RenderLoop__InteractiveOverlays__ registry (Show Compass). Ledger row L68. | - |
| v2.83.0 (L8066) | 20-Sep-2026 | The Top Bar Knows When It Is Not Wanted, and Neither Crossing Is a Cold Drop Any More | SHELL/LE-CORE (UI) | **PORTED** | VV v2.70.0 | - | Top bar fold + loading veils. Adapted: VV LoadingVeil exports DrawingSettled, no text-metrics job; ModeController WaitForFirstDrawing. TV LoadingVeil since 1.1.0. Ledger bottom table. | - |
| v2.82.0 (L8181) | 20-Sep-2026 | Every Plan and Elevation Has a Plane You Can See, Grab and Snap - and the Landscape Stopped... | DRAW-CORE | **PENDING-SIGNOFF** | - | S02a | Drawing planes for every plan/elevation (47__System__DrawingPlanes; FacePick/GizmoGrip re-armed as Aim at face). TV: "Not yet signed off by Adam. Not in ValeVision, whose category keys are shorter". | TV tests: Na__Test__DrawingPlanes__ |
| v2.81.0 (L8314) | 20-Sep-2026 | A Drawing Can Be Scanned Into Its Own Model - Once Its Address Was Short Enough for the Titl... | LE-TITLE (QR) | **NOT-CONSIDERED** | - | S07a+S03b | QR cell in the title block (TitleBlock__QrCell, 53__Feature__ProjectQrCode). Ledger L126 says "53__System__ProjectQrCode does not exist here" (wrong folder name: TV path is LE/53__Feature__ProjectQrCode). | TV tests: Na__Test__ProjectQr__, Na__Test__ProjectQr__Decode__ |
| v2.80.0 (L8447) | 20-Sep-2026 | The App Had Been Calling the Green Axis North, and Adam Had Been Correcting It by Hand | DRAW-CORE | **PORTED** | VV v2.67.0 | - | North direction + viewport identity + Drawing Title. Folder renumbered 46->47; ViewportIdentity adapted (no Model Source / site plans). TV ViewportIdentity/TitleText since 1.1.0 (v2.86/v2.87). | - |
| v2.79.1 (L8549) | 20-Sep-2026 | When the Paper Runs Out, the Title Gives Way Before the Date Does | LE-TITLE | **PORTED** | VV v2.66.0 | - | Title gives way before the date (Cells 1.1.0). VV never shipped the old behaviour. Register transaction part N/A. | updated: Na__Test__TitleBlockCells__, Na__Test__TitleBlockCells__ |
| v2.79.0 (L8604) | 19-Sep-2026 | A Title Block Cell Is a Width in Millimetres, Not a Share of the Paper - and a Drawing Now S... | LE-TITLE | **PORTED** | VV v2.66.0 | - | Title block cell widths in mm + Status. Adapted: Drawing No. not Document ID; widths re-measured for Helvetica; logo text and logo cell not ported (Vale identity). | TV tests: Na__Test__TitleBlockCells__ (VV has it), Na__Test__TitleBlockCells__ (VV has it) |
| v2.78.1 (L8721) | 19-Sep-2026 | jsPDF's align Does Not Know About Letter-Spacing, So the Letterhead Hung Off the Page | LE-SPEC/REG | **PORTED** | VV v2.66.1 | - | Spec page margins ported (1 of 3 changes); the jsPDF align/setCharSpace fix and the register warm palette do not apply to VV (checked: no setCharSpace anywhere; no register). Re-opens if the register is ported (D-S07a-01). | - |
| v2.78.0 (L8777) | 19-Sep-2026 | Selecting Something Is the First Half of Moving It, So Select Now Picks Move Up | LE-TOOLS | **NOT-CONSIDERED** | - | S05a | Select picks Move up (PicksUpMove, AutoMoveOnSelect absent in VV). TV: "Not yet in ValeVision". Prerequisite of v2.118.0/v2.153.0 behaviour. | - |
| v2.77.0 (L8878) | 19-Sep-2026 | The Tab and the Noodle Were Both in the Pictures, and I Read Them as Decoration | LE-SCRAP | **PORTED** | VV v2.68.0 | - | Scrapbook tab (PanelHost RegisterTab) + linking noodle. | updated: Na__Test__ScrapbookServer__ |
| v2.76.1 (L8962) | 19-Sep-2026 | DWG No. | LE-REG | **DELIBERATE** | - | S07a | "DWG No." register column label (Na__LeCfg__REGISTER_COLUMNS). No Drawing Register in VV (decision needed with the register). | - |
| v2.76.0 (L8989) | 19-Sep-2026 | Two More Scrapbooks, a Scale Bar That Reads the Drawing Above It, and the Redo That Proved a... | LE-SCRAP | **PORTED** | VV v2.68.0 / v2.69.0 | - | Custom + Parametric scrapbooks, scale bar, RegisterBeforeAnnounce. Server route ported to WCP Server__ValeVisionScrapbook__Api__.py (adapted, /api/valevision/scrapbook). Standard items config deliberately empty (NA site plan furniture). | TV tests: Na__Test__ScrapbookApi__ (VV has it), Na__Test__ScrapbookScaleBar__ (VV has it), Na__Test__ScrapbookServer__ (VV has it) |
| v2.75.0 (L9118) | 19-Sep-2026 | Safari Reads the First Manifest and Never Looks Again, and the First One Was the Wrong One | SHELL (PWA) | **NOT-DRAWING** | - | - | Safari manifest order (TrueVision__Pwa__*). VV has no own PWA module; runs under Whitecardopedia's shared worker. | - |
| v2.74.0 (L9208) | 19-Sep-2026 | One Client, One Site, One Place to Type Them | LE-TITLE | **PORTED** | VV v2.65.0 | - | Common client/site address on the drawings block. Adapted ProjectRecord (no Project Admin) - permanent divergence. | - |
| v2.73.0 (L9306) | 19-Sep-2026 | Ctrl+S Had to Blur Before It Could Save, Because the Button Was Getting That for Free | LE-CORE | **PORTED** | VV v2.62.0 | - | Ctrl+S blurs before saving (Na__LeMode__OnSaveKey, Na__LeToolbar__Save). | - |
| v2.72.0 (L9364) | 19-Sep-2026 | Three Greys, Three Shadows and Three Letterheads for One Pack of Documents | LE-CORE (UI) | **PORTED** | VV v2.60.0 | - | Surfaces tokens (Styles__Surfaces__.css) linked first by the VV loader. Register letterhead half N/A. | - |
| v2.71.0 (L9445) | 19-Sep-2026 | A Drawing Number Was Three Facts in a Trench Coat, and Renumbering Shot Two of Them | LE-REG | **DELIBERATE** | - | S07a | Document ID = project+phase+drawing code (Sheet__Fields__DocumentId, ComposeDocumentId). Needs the Drawing Register; ledger L339: "needs Adam's decision on whether ValeVision gets a register at all". | - |
| v2.70.0 (L9545) | 19-Sep-2026 | The Number Was Typed Twice and Shown Twice: a Tab Reads "D03 - 3D Images" and Nobody Types t... | LE-CORE | **PORTED** | VV v2.61.0 | - | Short sheet tabs. Adapted: VV-only DrawingCode__ leaf for the loader facade; Drawing No. stays editable (no register). | - |
| v2.69.0 (L9676) | 19-Sep-2026 | The Register Was Never Given Its Font, So Every Reader Invented One | LE-REG (pdf fonts) | **DELIBERATE** | - | S08 (PdfFonts) / S07a | Register given its font; PdfFonts__Install fix. VV has no PdfFonts__ (Helvetica by recorded decision - ledger SpecPdf row L1169). Reopened by "exact alignment": decision. | - |
| v2.68.2 (L9778) | 19-Sep-2026 | Two Modules Describing a Menu That No Longer Exists: a Port That Never Landed, Deleted | PM | **N/A** | - | - | TV deleted the never-imported VV scene-editor splits; VV keeps them (deliberate divergence). Makes VV ledger L29/L34/L1218 stale. | - |
| v2.68.1 (L9856) | 19-Sep-2026 | The Floor Was Shading Itself: a Grazing View Reads the Ground as Its Own Occluder | 3D | **NOT-DRAWING** | VV v2.59.1 | - | AO floor self-shading fix, applied to both copies the same day. | - |
| v2.68.0 (L9936) | 19-Sep-2026 | Twelve Rows of Buttons, and Only One of Them Belonged to the Scene You Were Looking At | PM | **PORTED** | VV v2.63.0 | - | Presentation Scenes menu: one scene open at a time. Adapted (event name na-pm-scene-selected; no layer-timing row). | - |
| v2.67.0 (L10127) | 19-Sep-2026 | An Hour of Drawing Sat Behind One Button, and Ctrl+W Never Asked | LE-CORE | **PORTED** | VV v2.62.0 | - | Close guard. TrueVision__Pwa__HasUnsavedWork hold-off not ported (ledger row 236 premise "no service worker" is wrong - see ledger L135-175). | - |
| v2.66.0 (L10197) | 19-Sep-2026 | The Settle Was Buying Sixteen Copies of the Same Noise, and the Monitor Was Timing the Silence | 3D | **NOT-DRAWING** | VV v2.59.0 | - | Progressive refine settle noise; applied to both copies. | - |
| v2.65.2 (L10296) | 18-Sep-2026 | The Drawing Keeps the Finger: an iPad Was Turning the Page Every Time It Was Panned | LE-PUB (viewer) | **PORTED** | VV v2.58.1 | - | iPad web viewer gestures; applied to both copies. | - |
| v2.65.1 (L10352) | 18-Sep-2026 | The Viewer Keeps the Tabs, and the Page Is Where the Drawing Ends | LE-PUB (viewer) | **PORTED** | VV v2.58.0 | - | Viewer keeps the tabs; page is where the drawing ends. VV already had the tab-strip clearance (ledger L1188). | - |
| v2.65.1 (L10433) | 18-Sep-2026 | Walk Mode Stops Colliding With a Line Nothing Draws | 3D | **NOT-DRAWING** | VV v2.56.1 | - | Walk mode collision exemption for Linetype__ lines; same one-line change in both. NOTE duplicate TV version heading v2.65.1. | - |
| v2.65.0 (L10456) | 18-Sep-2026 | The Public Web Is a Viewer, Not a Disabled Editor | LE-PUB (viewer) | **PORTED** | VV v2.58.0 | - | Public web is a viewer (80__Feature__WebViewer, DevGate tri-state). Adapted: Documents() without site plan split. | - |
| v2.64.1 (L10549) | 18-Sep-2026 | A Moved Hopper Is a New Model: Content Stamps, and a Force Render That Repaints | LE-VIEWPORT/PL | **PORTED** | VV v2.57.0 | - | Content stamps + force render repaints. | - |
| v2.64.0 (L10612) | 18-Sep-2026 | Drawing Tabs Stay Rendered: the Viewport Cache | LE-VIEWPORT | **PORTED** | VV v2.57.0 | - | Viewport cache (park/restore). Adapted: Render2d stillWanted 9th arg (no design phase lines). | - |
| v2.63.2 (L10686) | 18-Sep-2026 | Linetype Linework Is a Drawing Layer, So the 3D Render Stops Drawing It | PL | **PORTED** | VV v2.56.1 | - | Linetype linework is projection-only. | - |
| v2.63.1 (L10733) | 18-Sep-2026 | A Line Tagged Dashed in SketchUp Arrives Dashed on the Sheet | PL | **PORTED** | VV v2.56.1 | - | Dashed SketchUp linetypes arrive dashed. | - |
| v2.63.0 (L10805) | 17-Sep-2026 | The Specification Is a Document Now: It Has a Revision, a Number, and a Download | LE-SPEC | **PORTED** | VV v2.56.0 | - | Spec revision/number/download. | - |
| v2.62.0 (L10873) | 17-Sep-2026 | A Downloaded Sheet Is Named After the Drawing, Not After the App | LE-PUB (pdf) | **PORTED** | VV v2.55.0 | - | PDF named after the drawing (PdfFilename__). | - |
| v2.61.1 (L10925) | 17-Sep-2026 | Viewport Captions Stop Eating Their Own Scale | LE-TITLE (chrome) | **PORTED** | VV v2.54.1 | - | Caption font fit. Adapted: no PdfFonts.EnsureLoaded. | updated: Na__Test__TitleBlockScaleCell__ |
| v2.61.0 (L10982) | 17-Sep-2026 | The Title Block Says What Paper It Is, and Names Every Scale On the Sheet | LE-TITLE | **PORTED** | VV v2.54.0 | - | Title block names paper and every scale. Adapted: no site plan scale list. NOTE VV devlog has TWO v2.54.0 entries (lines 1673 and 1704). | TV tests: Na__Test__TitleBlockScaleCell__ |
| v2.60.0 (L11048) | 17-Sep-2026 | Dimensions You Can Grab, Constrain, Type Into and Slide | LE-DRAW | **PORTED** | VV v2.53.0 | - | Dimensions you can grab/constrain/type/slide. TV devlog heading itself records "ValeVision3D v2.53.0". | - |
| v2.59.0 (L11151) | 17-Sep-2026 | Container Editing, the Move Tool, and Dimensions You Can Actually Edit | LE-TOOLS | **PORTED** | VV v2.52.0 | - | Container editing + Move tool (EditScope). Adapted: no fixed-length extension lines in PushDimension. | - |
| v2.58.2 (L11297) | 17-Sep-2026 | The Progressive Renderer Was Rebuilding Its Buffer on Every Chunk | 3D (+LE) | **PARTIAL** | VV v2.54.0 | S11 (render loop) + S04a (Asset__Samples) | Only EnsureBuffer floor ported. Missing: render-loop ArmNextFrame/finally, thrown-frame guard, refine watchdog, one clock, engine-hold stand-down, and LE Asset__Samples (PDF can print an under-sampled 3D viewport in VV). | - |
| v2.58.0 (L11399) | 17-Sep-2026 | Arrow Keys Constrain a Vertex Drag, a Typed Length Can Be Retyped, and the Space Bar Toggles... | LE-TOOLS | **PORTED** | VV v2.52.0 | - | Arrow keys constrain a vertex drag, retype a length, Space toggles Select (Na__LeRect__Retypable, Tool__SelectSpace present). | - |
| v2.57.0 (L11474) | 17-Sep-2026 | Match Properties to a Whole Selection, and One Markup Panel Open at a Time | LE-TOOLS | **PORTED** | VV v2.51.0 | - | Match properties to a whole selection; one markup panel open (Na__LeDrop__ApplyMany, AccordionSections present). | - |
| v2.56.2 (L11547) | 16-Sep-2026 | Carousel Holds Opaque Longer on First Reveal; Mobile Swap Breakpoint Tightened | SHELL | **NOT-DRAWING** | VV v2.50.1 | - | Carousel opaque longer; mobile breakpoint - in step with VV. | - |
| v2.56.1 (L11568) | 16-Sep-2026 | Mobile Menu Swap: Also Trigger on Near-Square/Portrait Windows | SHELL | **NOT-DRAWING** | VV v2.49.1 | - | Mobile menu swap breakpoint - ported identical. | - |
| v2.56.0 (L11588) | 16-Sep-2026 | The Progressive Renderer, and the Tools Menu Brought Into Line With ValeVision | 3D/SHELL | **VV-ORIGIN** | VV v2.48.0-v2.48.1 | - | Progressive renderer ported FROM VV; Tools menu aligned to VV (icons, App Settings). Nothing to port. | - |
| v2.55.0 (L11691) | 15-Sep-2026 | Layout Editor Sorted Into Numbered Subfolders, the Same as ValeVision | LE-CORE (structure) | **VV-ORIGIN** | VV v2.47.0 | - | LE numbered subfolders - VV first (v2.47.0), TV followed (Task 04). TV-only Viewport2d__SitePlan__ unit. | - |
| v2.54.0 (L11779) | 14-Sep-2026 | Margin Notes Spread Out When the Column Has Room | LE-SPEC | **PORTED** | VV v2.44.0 | - | Margin notes spread out (SpecMargin 1.3.0; SheetLayout MarginRect). | - |
| v2.53.0 (L11832) | 14-Sep-2026 | Scrapbook - Drag the Mapping Data Credentials and the North Point onto a Site Plan | LE-SCRAP | **DELIBERATE** | host VV v2.68.0 | S06a | Site-plan scrapbook items (mapping credentials, north point). Scrapbook host arrived with VV v2.68.0; NA items deliberately not copied (ledger L78) - VV config empty. | - |
| v2.52.0 (L11894) | 14-Sep-2026 | Rotate Text - a Round Grip Turns a Text Box | LE-DRAW | **PORTED** | VV v2.41.0 | - | Rotate text grip (Annotation__RotationDeg). | - |
| v2.51.0 (L11980) | 14-Sep-2026 | Project Specification, Read - the Notes as A4 Pages, to Print or Read Aloud | LE-SPEC | **PORTED** | VV v2.43.0 | - | Spec Read as A4 pages. Adapted: project name from folder id (no TrueVision__Pwa__ProjectContext). | - |
| v2.50.0 (L12020) | 14-Sep-2026 | Zoom Inside a 3D Viewport - Frame the Picture, Enter to Keep It | LE-VIEWPORT | **PORTED** | VV v2.42.0 | - | Zoom inside a 3D viewport (Viewport3dZoom). Adapted: VV tiled renderer keeps per-tile shear; no design phase lines. TV Viewport3dZoom since 1.1.0. | - |
| v2.49.1 (L12116) | 14-Sep-2026 | Site Plan Tabs Look Like Every Other Tab | LE-SITE | **PENDING-SIGNOFF** (VERIFIER; was NOT-CONSIDERED: the VV question was asked on 14-Sep-2026, TV PLAN SitePlanDrawings L761, after Adam confirmed site plan viewports in TV) | - | S04a | Site plan tabs look like other tabs. Site plan chain. | - |
| v2.49.0 (L12130) | 14-Sep-2026 | Site Plan Drawings, Part 2 - Site Plan Viewports at 1:500 and 1:1250 | LE-SITE | **PENDING-SIGNOFF** (VERIFIER; was NOT-CONSIDERED: the VV question was asked on 14-Sep-2026, TV PLAN SitePlanDrawings L761, after Adam confirmed site plan viewports in TV) | - | S04a | Site plan viewports 1:500/1:1250 (SitePlan__Store). Needs Vale site plan data (R2 layout under VaApps/Projects). | - |
| v2.48.1 (L12193) | 14-Sep-2026 | Doors Stay Shut on Elevations and Sections | PL | **PENDING-SIGNOFF** | - | S02b+S04a | Doors stay shut on elevations/sections (DoorPose Shut, PlDoors__PutBack). TV: "rides with the pending plan doors port (ledger AA), on Adam's sign-off". | - |
| v2.48.0 (L12259) | 14-Sep-2026 | Site Plan Drawings, Part 1 - Drawing Type, Tab Order and the Site Plan Store | LE-SITE | **PENDING-SIGNOFF** (VERIFIER; was NOT-CONSIDERED: the VV question was asked on 14-Sep-2026, TV PLAN SitePlanDrawings L761, after Adam confirmed site plan viewports in TV) | - | S04a | Drawing type (Sheet__DrawingType) + site plan store. VV sheets have no drawing type (ledger rows say "one drawing type"). | - |
| v2.47.0 (L12306) | 14-Sep-2026 | Type a Length While Dragging a Viewport | LE-TOOLS | **PORTED** | VV v2.39.0 | - | Typed length while dragging a viewport. ViewportSnapMove carry left out. | - |
| v2.46.0 (L12330) | 14-Sep-2026 | Type a Length While Dragging a Vertex | LE-TOOLS | **PORTED** | VV v2.35.0 | - | Typed length while dragging a vertex. | - |
| v2.45.0 (L12355) | 14-Sep-2026 | Vector Moves Snap to the Linework; Shift-Click Inserts a Vertex | LE-TOOLS | **PORTED** | VV v2.35.0 | - | Whole-shape snap; Shift-click inserts a vertex. | - |
| v2.44.0 (L12382) | 14-Sep-2026 | Vector Undo, Redo, Copy, Paste and Duplicate | LE-TOOLS | **PORTED** | VV v2.35.0 | - | Vector clipboard + draw-vertex undo (ViewportClipboard included). | - |
| v2.43.0 (L12417) | 14-Sep-2026 | Dimension End Size - Resize Ticks, Arrows and Dots Per Dimension | LE-DRAW | **PORTED** | VV v2.34.0 | - | Dimension end size (Dimension__TickLengthMm). | - |
| v2.42.0 (L12452) | 14-Sep-2026 | Doors Stand Open on Plans - Click One to Close It | PL/LE-VIEWPORT | **PENDING-SIGNOFF** | - | S02b+S04a | Plan doors open, click to close (PlanDoors__, DoorPose__, Viewport__ClosedDoors). TV: "waits for Adam's sign-off"; TV plan AA: needs VV door module ADR/MOD/ROT contract first. | - |
| v2.41.0 (L12545) | 14-Sep-2026 | Fixed Length Extension Lines - Dimensions Stand Clear of the Drawing | LE-DRAW | **PENDING-SIGNOFF** | - | S05b | Fixed-length extension lines (Dimension__Start/EndExtensionMm, ExtensionsLinked absent in VV). VV v2.37.0 and v2.52.0 explicitly skipped them. | - |
| v2.40.0 (L12632) | 14-Sep-2026 | The Measurements Box and Drawing at Scale - Type the Size, Draw It True | LE-TOOLS | **PARTIAL** | VV v2.35.0 | S05b (+S05a) | Measurements box ported; Draw/Measure-at-scale panel rows NOT (atScale hardcoded true; Shapes__/Dimensions__DefaultAtScale absent; VV DimensionTool does not store Dimension__AtScale). | - |
| v2.39.0 (L12719) | 14-Sep-2026 | Save Sheets Says Where the Sheets Went - R2 and a Local Copy | PERSIST | **PARTIAL** | - | S03b/S09 (labels) + S10 | Save Sheets says where sheets went: TV LocalProjectMirror__ is transport (DIV-4, VV mirrors via Flask in R2SaveProjectJson); VV lacks SavedLocalMessage/SavedLocalFailedMessage labels and toast. TV: "waits for Adam's sign-off". | - |
| v2.38.1 (L12796) | 14-Sep-2026 | Base Images Stop Showing Lines Through Faces - The Line Bias Was 75 mm in Plans and Elevations | LE-VIEWPORT (3D) | **PENDING-SIGNOFF** | - | S02b | Ortho linework depth bias (RenderConfig__Linework__OrthoDepthBiasMm). VV has the SAME fixed 0.00015 bias (15__ModelLoader/Na__ModelLoader__MultiModel.js:683-692) - fault live in VV base images. | - |
| v2.38.0 (L12845) | 14-Sep-2026 | Viewport Frames Switch Off - Set Out With Them, Then Title the Drawing Yourself | LE-VIEWPORT | **PENDING-SIGNOFF** | - | S03b+S06a | Viewport Frame toggle (Viewport__ShowFrame). VV mentions it only in Eyedropper comments (lines 90, 113). TV plan W: "nothing TrueVision-only". | - |
| v2.37.0 (L12893) | 14-Sep-2026 | Projected Linework Matches the 3D View - Joins Between Wall Pieces Stop Drawing | PL | **PENDING-SIGNOFF** | - | S02b | Flush joins + seams occlude + LineworkFirst (FlushJoins__, ClipKernel 1.2.0). Not in VV (no module). TV PORT NOTEs: "1.2.0 PENDING to ValeVision3D, on Adam's sign-off". | - |
| (unnumbered, 14-Sep) | 14-Sep-2026 | Dashed edges on vectors (TV LineStyleTool 1.0.0) | LE-DRAW | **PORTED** | VV v2.40.0 | - | No TV devlog entry; VV v2.40.0 "Ported from TrueVision3D (LineStyleTool 1.0.0)". Draw-at-scale row left out. | - |
| (unnumbered, 14-Sep) | 14-Sep-2026 | Group / Ungroup (Ctrl+G) and multi-item copy (TV Groups 1.0.0, ItemClipboard 1.0.0) | LE-TOOLS | **PORTED** | VV v2.38.0 | - | No TV devlog entry; ledger "groups and multi-item clipboard" section. | - |
| (unnumbered, 14-Sep) | 14-Sep-2026 | Eyedropper matches unlocked viewports (TV eyedropper 1.6.0; plan row AF "working") | LE-TOOLS | **PARTIAL** | VV v2.36.0 | S05a (+S03b frame toggle) | No TV devlog entry. Viewport__ShowFrame trait skipped (frame toggle v2.38.0 not ported). | - |
| (unnumbered, 14-Sep) | 14-Sep-2026 | Dimension text leader: drag the value off the line (TV DimensionGeometry 1.3.0-1.5.1) | LE-DRAW | **PORTED** | VV v2.37.0 | - | No TV devlog entry; ledger "dimension text leader" section. | - |
| v2.36.0 (L12978) | 14-Sep-2026 | Project Specification & Margin Notes - Notes Numbered by Their Place, Bubbles That Follow Them | LE-SPEC | **PORTED** | unrecorded (commit 66937440, ~14-Sep) | - | Project Specification + margin notes. VV devlog has NO entry (v2.44.0 notes: "has no entry of its own"); TV plan U row still says "Pending". | - |
| v2.35.0 (L13141) | 14-Sep-2026 | Leaders & Annotation Bubbles - a Note or a Specification Code on a Sweeping Leader | LE-DRAW | **PORTED** | VV v2.32.0 | - | Leaders and annotation bubbles. History shape row arrived with the groups port (v2.38.0) - ledger L617-619 stale. | - |
| v2.34.0 (L13270) | 14-Sep-2026 | Box Select - A Window to the Right, a Crossing to the Left | LE-TOOLS | **PORTED** | VV v2.33.0 | - | Box select. CarryTarget guard left out (no viewport carry). | - |
| v2.33.0 (no TV devlog entry) | 13-Sep-2026 | Drawing Layers: a grip to reorder, Lock / Unlock (TV plan section 12 row Q) | LE-CORE (UI) | **PORTED** | VV v2.31.0 | - | TV released it without a devlog heading; recorded only in TV plan section 12 (Q) and VV ledger. | - |
| v2.32.1 (L13399) | 13-Sep-2026 | A Refused Snapshot Upload No Longer Claims a Picture R2 Never Received | LE-VIEWPORT | **PORTED** | VV v2.31.1 | - | Refused snapshot upload never counted as baked. | - |
| v2.32.0 (L13479) | 13-Sep-2026 | Model Source - Existing and Proposed on One Sheet, the Same View of Two Models | LE-VIEWPORT | **DELIBERATE** | - | S04a | Model Source / design phases (ModelSource__, PhaseLibrary). VV has no model groups (TV devlog + plan P). Reopened by "exact alignment" (S04a WP-S04a-05 dormant port). | - |
| v2.31.0 (L13611) | 13-Sep-2026 | Ortho Dimensions - Hold Shift for Horizontal or Vertical - and Snaps Coloured by Tool | LE-DRAW | **PORTED** | VV v2.29.0 | - | Ortho dimensions + snap tones; purple carry tone ported but unused (no ViewportSnapMove). | - |
| v2.30.2 (L13693) | 13-Sep-2026 | The Drawing View Reads Its Own Config | DRAW-CORE | **N/A** | - | - | TV wired the drawing-view config VV already loaded. Divergence: fallback profile width 0.55 (TV) vs 1.0 (VV). | - |
| v2.30.1 (L13787) | 13-Sep-2026 | Undo Stops Saving the Project Behind Your Back | LE-CORE | **PORTED** | VV v2.64.0 | - | Undo stops writing the project. History 1.4.0 / AutoSave 1.3.0. "margin" step reason still missing in VV (ledger L219 open). | - |
| v2.30.0 (L13843) | 13-Sep-2026 | The Palette - Shift+B Sets What You Draw Next | LE-TOOLS | **PORTED** | VV v2.27.0 | - | Eyedropper palette (Shift+B). | - |
| v2.29.0 (L13905) | 13-Sep-2026 | Gradient Fills - Fade a Drawing Out Into the Page | LE-DRAW | **PORTED** | VV v2.26.0 | - | Gradient fills; Rectangle gradient default fixed in both (1.0.1). | - |
| v2.28.0 (L14009) | 13-Sep-2026 | Viewports Copy, Paste and Snap Into Line - Set One Up Once, Line Them Up by Their Corners | LE-TOOLS | **PARTIAL** | VV v2.35.0 | S04b (ViewportSnapMove) | ViewportClipboard ported with v2.44.0 in VV v2.35.0; ViewportSnapMove (carry, tracking) NOT ported - TV plan L: pending sign-off. Blocks v2.98.0 and purple tone. | - |
| v2.27.0 (L14096) | 13-Sep-2026 | The Rectangle Tool - Corner to Corner, Then It Is Just a Polygon | LE-DRAW | **PORTED** | VV v2.25.0 | - | Rectangle tool. NOTE duplicate TV version heading v2.27.0. | - |
| v2.27.0 (L14263) | 13-Sep-2026 | Edge Styles - Walls Black, Windows Grey, Furniture Faint | LE-VIEWPORT/PL | **PORTED** | VV v2.28.0 + v2.30.0 | - | Edge styles + owner tags (VV 2.30.0) and Render Composites weights (VV 2.28.0); weight consumers diverge by DIV-1. | - |
| v2.26.1 (L14180) | 13-Sep-2026 | Vectors Redraw, the Click Stops Waiting on the Disk, and Vectors Snap to Vectors | LE-CORE | **PORTED** | VV v2.24.0 | - | Vectors redraw, debounced draft, coalesced refresh, sheet-object snapping (tab strip gate adapted to Layout Mode). | - |
| v2.26.0 (L14462) | 12-Sep-2026 | The Eyedropper - Make That One Look Like This One | LE-TOOLS | **PORTED** | VV v2.24.0 | - | Eyedropper. | - |
| v2.25.0 (L14530) | 12-Sep-2026 | Supersampling - The Pixel Stops Guessing | 3D/LE-VIEWPORT | **PORTED** | VV v2.22.0 / v2.23.0 | - | Supersampling + tiled exporter; return trip. TV-only target route deliberately has no VV caller. | - |
| v2.24.0 (L14644) | 11-Sep-2026 | The Drawing Editor Arrives - Tabs, Sheets, Viewports at Scale | LE-CORE | **VV-ORIGIN** | VV v2.21.x (origin); DevGate + harnesses back in VV v2.22.0 | - | TV's Layout Editor arrives (ported FROM VV, Phases A-F). DevGate and both Na__Verify__ harnesses returned to VV in v2.22.0. | - |

---

## Appendix B - Ledger corrections, line by line (`VV/ValeVision__PARITY__TrueVisionLedger__.md`)

| Line(s) | Says | Should say | Evidence |
|---|---|---|---|
| 11-12 | TV working copy `D:\WE10_--_Public-Repo_--_Live-Website\na-apps\30__TrueVision__CoreAppCode` | Remove (path does not exist); TV root is `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode` | `ls` fails on the WE10 path |
| 15-20 | "five structural divergences ... and (until now) the library baseline" | Four permanent divergences (DIV-1 to DIV-4); DIV-5 closed by TV v2.20.0 | L942 |
| 29 | Phase C "Pick Face, gizmo grip, scene editor splits ... all landed" | Pick Face/grip landed, then superseded by DrawingPlanes in TV v2.82.0 (VERIFIER: not "re-armed"); the dimension splits and style rows landed as files only, and the per-drawing style toggles not at all (VERIFIER); scene editor splits WITHDRAWN (TV v2.68.2); Ground Floor Plan and section filing still open | B4.2, B5 |
| 34-37 | "Closed ... scene row builders and reorder splits" | Withdrawn - permanent VV divergence | TV devlog L9778-9841 |
| 39-42 | Lantern Designer items outstanding | Both already in TV (ViewMapFromBasis/TurnPoint; HiddenSegments), and in VV too (VERIFIER: VV `SoupBuilder__.js:112,151`, `ClipWorker__.js:145,169`, `WorkerPool__.js:290`); not TV back-ports | B4.2 |
| 44-49 | DevGate and both harnesses "ValeVision has no equivalent" | Ported in VV v2.22.0 (DevGate 1.1.0 since 18-Sep) | L867-868; VV `80__Testing__PrototypeEnvironment/Na__Verify__*.mjs` |
| 51-55 | "Pending return trip" table | Closed (VV v2.64.0); move to Archive | L55 itself |
| 69, 70 | TitleText / Identity "TV since at 1.1.0 (not signed off)" | Keep; add: TV 1.1.0 is v2.86.0/v2.87.0 (PENDING-SIGNOFF in Release Watermark) | modwm: TV TitleText/Identity 1.1.0 dated 20-Sep |
| 74-79 | Versions of Groups, Grips, ItemClipboard, PanelHost, scrapbook modules "verbatim" | Verbatim as of TV v2.85.0; TV has since moved to Groups 1.4.0, Grips 1.12.0, ItemClipboard 1.7.0, PanelHost 1.6.0, TileDrag 1.2.0, Panel__ScrapbookParametric 1.8.0, ScrapbookParametric__Grips 1.6.0, LinkNoodle 1.2.2 | c.1 table |
| 87 | v2.86.0 / v2.87.0 "awaiting Adam's sign-off there" | Keep, and add rows for v2.88.0-v2.172.0 (Release Watermark) | Appendix A |
| 89-94, 161-175 | Service worker exposure "raised with Adam ... not changed" | Still unchanged on 01-Oct-2026 (token `2026-09-18-1`); link D-S11-04 | WCP logic file :229 |
| 126 | "`53__System__ProjectQrCode` does not exist here" | "TV `LE/53__Feature__ProjectQrCode` has not been ported" | TV tree |
| 236, 340, 384, 404, 420, 429, 439, 452, 522, 542, 569, 615, 849, 1189 | "n/a - this tree has no (PWA) service worker" | "VV runs under Whitecardopedia's shared worker in production; token not bumped (Adam's call, D-S11-04)" | L135-175 |
| 242-244 | AutoSave "still at TV v1.1.0 ... undo/redo row remains open" | Closed by VV v2.64.0 (AutoSave 1.3.0) | L55 |
| 460-461, 467 | AnnounceRestore / restore field "still pending sign-off" | Ported VV v2.64.0 | L55 |
| 482 | Extension-line lengths "still a separate pending port" | Keep - still open (TV v2.41.0, PENDING-SIGNOFF) | `Dimension__StartExtensionMm` absent in VV |
| 489-495 | `Viewport__ShowFrame` skipped | Keep - still open (TV v2.38.0) | VV mentions it only in Eyedropper comments :90, :113 |
| 505-521 | atScale hardcoded; measure-at-scale rows skipped | Keep - open (TV v2.40.0 PARTIAL) | `DefaultAtScale` absent in VV |
| 571-573, 617-619 | "History shape row still missing" | Arrived with the groups port (VV v2.38.0) | L55 |
| 720 | Purple carry tone "comes with the carry" | Keep - open (TV v2.28.0 ViewportSnapMove) | `ViewportSnapMove__` absent in VV |
| 810-812 | Palette mode and undo-restore "deliberately NOT ported" | Both ported later (VV v2.27.0, v2.64.0) | L770-785, L55 |
| 1041-1043 | "No TrueVision counterpart exists for this phase" | TV has the Layout Editor since TV v2.23.0/v2.24.0 | TV devlog v2.24.0 |
| 1122, 1230 vs 1244 | Loader "back-port candidate" vs "not a back-port candidate" | One status per D-S11-05 | VV Loader PORT NOTE :51 |
| 1128 | TV-only bases "ModelSource, PlanDoors, ViewportSnapMove" | 17 TV-only subfolders and 186 TV-only files (c.2) | drift_all.tsv |
| 1134 | `55__Feature__Scrapbook` listed TV-only | VV has 55/56/57 since VV v2.68.0/v2.69.0 | VV tree |
| 1169 | SpecPdf/PdfFonts deliberate divergence | Keep, and link D-S08-03 (reopened by alignment) | S08 |
| 1214-1232 | Pending back-port table | Replace the State column with the B5 statuses (withdrawn / closed / open / half) | B5 |
| 1235-1246 | Fold and veils table placed after the back-port table | Move up into the Release Watermark (TV v2.83.0 -> VV v2.70.0); add TV v2.158.0 as the open follow-on (S10 Appendix B item 2) | S10 |
| (missing) | No rows for TV v2.88.0-v2.172.0 | Release Watermark rows (Appendix A) | Appendix A |
| (missing) | No record of the unrecorded Specification port | Row: TV v2.36.0 -> VV commit 66937440 (14-Sep), no VV release number | VV devlog L2608-2611 |
| 34-37 (VERIFIER) | "Closed ... per-drawing style toggles; dimension config and preview splits ... shared drawing style rows" | Keep three rows OPEN. The dimension split and StyleRows landed in TV as files only and were never wired; the per-drawing style UI never landed (record keys only). VV is ahead (S11-V03, D-S11-10) | TV `44/Na__PlanDimensions__Data__.js` is 988 lines and nothing imports `EditorPreview__`; nothing imports `40/Na__DrawView__StyleRows__.js`; nothing calls `Na__FpData__SetStyle` |
| 1128 (VERIFIER) | ViewportSnapMove listed as a TV-only base of `20__System__Viewports` | TV holds it in `LE/28__System__ObjectSnap/Na__LayoutEditor__ViewportSnapMove__.js` | TV tree |
| 1219, 1220, 1225 (VERIFIER) | Pending back-port rows | Not closed, as above; WP-S11-09 closes them | B5 corrections |

## Appendix C - Templates for the swarm

**Port Record (returned by every coding package)**
```
WP: <WP-id>            TV releases covered: v2.A.0, v2.B.0 (Adam-confirmed in TV: yes/no each)
Files:
  - VV <path>  <- TV <path>  TV module <x.y.z>  parity <verbatim|adapted|diverged>  VV module <x.y.z>
    seams re-applied: <list>     record keys / config keys added: <list>
Not ported (and why): <list>
Tests: <Na__Test__... n/n>; Na__Verify__ModuleGraph__ <n>; Na__Verify__Exports__ <n files>
New or renamed cross-module exports: <yes/no - list>   (service worker relevance)
Transport touched (WCP server.py / CloudflareWorker): <none | route ...>
```

**Module PORT NOTE (required lines)**
```
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/<TV path>
// - Source version: <TV module x.y.z> (TrueVision3D v2.N.0)
// - Ported on     : DD-Mon-YYYY for ValeVision3D {{VVREL:<WP-id>}}
// - Parity        : verbatim | adapted | diverged
// - Divergences   :
//   - <one line per VV seam>
// - Back-port     : <n/a | what TrueVision would want>
```

**VV devlog entry**
```
# ---------------------------------------------------------
## ValeVision3D v2.N.0 - DD-Mon-YYYY - <Title in the house voice>
### Ported from TrueVision3D v2.A.0[, v2.B.0] (Adam-confirmed in TV: <which>)

**Overview** ...
**What came across** ...
**Adapted for ValeVision** (seams, transport, identity) ...
**Not ported, and why** ...
**Verified** (harness counts; what was NOT exercised) ...
**Files** ...
```

**Ledger Module Register row**
```
| VV path | TV path | TV source ver (app ver) | TV current ver | Parity | Divergences | Open TV versions | Loaded by | Transport | Checked |
```

**Ledger Release Watermark row** - the Appendix A columns, with "VV version" filled by the scribe.

## Appendix D (verifier) - TV-only imports that block a whole-file port

For every c.1 row recommended `port_whole_reapply_vv`, these are the modules the TV file imports (static `from` and
literal `import()`) that do not exist at the mapped VV path today, with the folder map applied (TV 40->42, 42->43,
43->44, 44->45, 45->46, 46->47). 44 of the 62 rows are blocked. "Transport" marks an import of TV's Cloudflare client
or local mirror: that is never a port; it is a seam to VV's own worker and Flask routes (DIV-4). Script:
`scratchpad/parity/work_s11v/prereq.py`.

| c.1 # | TV module | Missing in VV | Imports VV lacks | Transport |
|---|---|---|---|---|
| 7 | `Na__DrawView__ProjectData__.js` | 2 | `Na__AppUtils__LocalProjectMirror__`, `Na__CloudflareIntegration__ApiClient__` | yes |
| 16 | `Na__FloorPlan__DevMenu__Editor__.js` | 8 | `Na__DrawView__DevRowShell__`, `Na__DrawView__DraftGuard__`, `Na__SectionCut__Engine__`, `Na__DrawingPlanes__ConfigState__`, `Na__DrawingPlanes__DevMenu__Controls__`, `Na__DrawingPlanes__Grip__`, `Na__DrawingPlanes__Maths__`, `Na__DrawingPlanes__Overlay__` |  |
| 21 | `Na__FloorPlan__ProjectJson__Data__.js` | 1 | `Na__FloorPlan__StoreyLevel__` |  |
| 46 | `Na__Elevation__DevMenu__Editor__.js` | 9 | `Na__DrawView__DevRowShell__`, `Na__DrawView__DraftGuard__`, `Na__SectionCut__Engine__`, `Na__Elevation__AutoName__`, `Na__DrawingPlanes__Bounds__`, `Na__DrawingPlanes__DevMenu__Controls__`, `Na__DrawingPlanes__Grip__`, `Na__DrawingPlanes__Maths__`, `Na__DrawingPlanes__Overlay__` |  |
| 47 | `Na__Elevation__DevMenu__RowBuilders__.js` | 3 | `Na__DrawView__DevRowShell__`, `Na__Elevation__AutoName__`, `Na__ElevationDepthFog__DevMenu__Row__` |  |
| 51 | `Na__Elevation__ModeController__.js` | 3 | `Na__RenderEffect__DistanceCulling__`, `Na__SectionCut__Engine__`, `Na__ElevationDepthFog__RenderLayer__` |  |
| 54 | `Na__Elevation__ProjectJson__Data__.js` | 1 | `Na__ElevationDepthFog__RecordData__` |  |
| 77 | `Na__ProjectedLinework__Pipeline__.js` | 2 | `Na__ProjectedLinework__DoorPose__`, `Na__ProjectedLinework__Storeys__` |  |
| 95 | `Na__LayoutEditor__ModeController__.js` | 27 | `Na__AppUtils__KeyScope__`, `Na__ModelGroup__PhaseLibrary__`, `Na__LayoutEditor__ModelSource__`, `Na__LayoutEditor__SitePlanComposites__`, `Na__LayoutEditor__DrawingGrid__`, `Na__LayoutEditor__Panel__DrawingGrid__`, `Na__LayoutEditor__ObjectSnap__Search__`, `Na__LayoutEditor__DocumentKeys__`, `Na__LayoutEditor__DrawingAxes__`, `Na__LayoutEditor__HatchPatterns__`, `Na__LayoutEditor__Panel__Patterns__`, `Na__LayoutEditor__Panel__VectorTools__`, `Na__LayoutEditor__VectorTools__`, `Na__LayoutEditor__Panel__SitePlanComposites__`, `Na__LayoutEditor__NoteRegions__Grips__`, `Na__LayoutEditor__SpecLockstep__`, `Na__LayoutEditor__Register__Data__`, `Na__LayoutEditor__Register__Editor__`, `Na__LayoutEditor__Register__Transactions__`, `Na__LayoutEditor__Statement__Data__`, `Na__LayoutEditor__Statement__Page__`, `Na__LayoutEditor__Panel__SheetImages__`, `Na__LayoutEditor__SheetImages__`, `Na__LayoutEditor__Panel__ScrapbookSpecification__`, `Na__LayoutEditor__FloorAreas__`, `Na__LayoutEditor__FloorAreas__Table__`, `Na__LayoutEditor__Panel__FloorAreas__` |  |
| 104 | `Na__LayoutEditor__SheetModel__.js` | 1 | `Na__LayoutEditor__SheetModel__AreaGroups__` |  |
| 111 | `Na__LayoutEditor__SheetModel__Sheets__.js` | 4 | `Na__LayoutEditor__SheetRecords__LeaderlessNotes__`, `Na__LayoutEditor__SheetRecords__NoteRegions__`, `Na__LayoutEditor__Register__Numbering__`, `Na__CloudflareIntegration__ApiClient__` | yes |
| 114 | `Na__LayoutEditor__SheetModel__Viewports__.js` | 3 | `Na__LayoutEditor__ViewportRotation__`, `Na__LayoutEditor__SitePlanComposites__`, `Na__LayoutEditor__HatchPatterns__` |  |
| 115 | `Na__LayoutEditor__SheetRecords__.js` | 7 | `Na__LayoutEditor__SheetRecords__LeaderlessNotes__`, `Na__LayoutEditor__SheetRecords__NoteRegions__`, `Na__LayoutEditor__ShapeRings__`, `Na__LayoutEditor__ViewportRotation__`, `Na__LayoutEditor__SitePlanComposites__`, `Na__LayoutEditor__HatchPatterns__`, `Na__LayoutEditor__SheetImages__Geometry__` |  |
| 116 | `Na__LayoutEditor__Controls__Pc__.js` | 1 | `Na__AppUtils__KeyScope__` |  |
| 119 | `Na__LayoutEditor__SheetChrome__.js` | 6 | `Na__LayoutEditor__ShapeRings__`, `Na__LayoutEditor__ViewportRotation__`, `Na__LayoutEditor__HatchPatterns__`, `Na__ProjectQr__Painter__`, `Na__LayoutEditor__SheetImages__Painter__`, `Na__LayoutEditor__PdfFonts__` |  |
| 120 | `Na__LayoutEditor__SheetSurface__.js` | 3 | `Na__LayoutEditor__PaintOrder__`, `Na__LayoutEditor__VectorQuality__`, `Na__LayoutEditor__ViewportRotation__` |  |
| 130 | `Na__LayoutEditor__MarkupBridge__.js` | 3 | `Na__LayoutEditor__DimensionRounding__`, `Na__LayoutEditor__PaintOrder__`, `Na__LayoutEditor__FloorAreas__Paint__` |  |
| 132 | `Na__LayoutEditor__ShapeGeometry__.js` | 3 | `Na__LayoutEditor__ShapeRings__`, `Na__ProjectQr__Symbol__`, `Na__LayoutEditor__SheetImages__Paint__` |  |
| 135 | `Na__LayoutEditor__Viewport2d__.js` | 6 | `Na__LayoutEditor__ModelSource__`, `Na__LayoutEditor__PlanDoors__`, `Na__LayoutEditor__Viewport2d__DepthFog__`, `Na__LayoutEditor__Viewport2d__SitePlan__`, `Na__SitePlan__Store__`, `Na__LayoutEditor__DraftMode__State__` |  |
| 136 | `Na__LayoutEditor__Viewport2d__Frame__.js` | 3 | `Na__LayoutEditor__PlanDoors__`, `Na__LayoutEditor__Viewport2d__DepthFog__`, `Na__LayoutEditor__DraftMode__State__` |  |
| 153 | `Na__LayoutEditor__Eyedropper__.js` | 1 | `Na__LayoutEditor__ViewportRotation__` |  |
| 154 | `Na__LayoutEditor__Grips__.js` | 1 | `Na__LayoutEditor__ObjectSnap__Search__` |  |
| 156 | `Na__LayoutEditor__Measurements__.js` | 2 | `Na__LayoutEditor__NoteRegions__Tool__`, `Na__LayoutEditor__FloorAreas__Tool__` |  |
| 157 | `Na__LayoutEditor__SelectionBox__.js` | 1 | `Na__LayoutEditor__ViewportRotation__` |  |
| 159 | `Na__LayoutEditor__SheetTools__.js` | 5 | `Na__LayoutEditor__MoveAnchor__`, `Na__LayoutEditor__ViewportSnapMove__`, `Na__LayoutEditor__SheetTools__NoteTooltip__`, `Na__LayoutEditor__VectorTools__`, `Na__LayoutEditor__VectorTools__State__` |  |
| 161 | `Na__LayoutEditor__SheetTools__ContextMenu__.js` | 9 | `Na__LayoutEditor__ModelSource__`, `Na__LayoutEditor__PlanDoors__`, `Na__LayoutEditor__ViewportRotation__`, `Na__LayoutEditor__ObjectSnap__`, `Na__LayoutEditor__LayerMenu__`, `Na__LayoutEditor__VectorTools__`, `Na__LayoutEditor__SheetImages__Menu__`, `Na__LayoutEditor__FloorAreas__Menu__`, `Na__LayoutEditor__FloorAreas__Tool__` |  |
| 162 | `Na__LayoutEditor__SheetTools__HitResolution__.js` | 3 | `Na__LayoutEditor__PlanDoors__`, `Na__LayoutEditor__MoveAnchor__`, `Na__LayoutEditor__ObjectSnap__Search__` |  |
| 163 | `Na__LayoutEditor__SheetTools__Keyboard__.js` | 11 | `Na__AppUtils__KeyScope__`, `Na__LayoutEditor__DraftMode__`, `Na__LayoutEditor__DrawingGrid__`, `Na__LayoutEditor__ObjectSnap__`, `Na__LayoutEditor__ViewportSnapMove__`, `Na__LayoutEditor__SheetTools__CopyDrag__`, `Na__LayoutEditor__OrthoMode__`, `Na__LayoutEditor__DrawingAxes__`, `Na__LayoutEditor__VectorTools__`, `Na__LayoutEditor__NoteRegions__Tool__`, `Na__LayoutEditor__FloorAreas__Tool__` |  |
| 164 | `Na__LayoutEditor__SheetTools__PointerDrag__.js` | 12 | `Na__LayoutEditor__MoveAnchor__`, `Na__LayoutEditor__ObjectSnap__GridMoves__`, `Na__LayoutEditor__ObjectSnap__Moves__`, `Na__LayoutEditor__ObjectSnap__Search__`, `Na__LayoutEditor__ViewportSnapMove__`, `Na__LayoutEditor__SheetTools__CopyDrag__`, `Na__LayoutEditor__SheetTools__HoverTooltip__`, `Na__LayoutEditor__SheetTools__NoteTooltip__`, `Na__LayoutEditor__OrthoMode__State__`, `Na__LayoutEditor__VectorTools__`, `Na__LayoutEditor__NoteRegions__Tool__`, `Na__LayoutEditor__FloorAreas__Tool__` |  |
| 165 | `Na__LayoutEditor__SheetTools__PointerPress__.js` | 7 | `Na__LayoutEditor__PlanDoors__`, `Na__LayoutEditor__MoveAnchor__`, `Na__LayoutEditor__ViewportSnapMove__`, `Na__LayoutEditor__VectorTools__`, `Na__LayoutEditor__NoteRegions__Tool__`, `Na__LayoutEditor__SheetImages__Crop__`, `Na__LayoutEditor__FloorAreas__Tool__` |  |
| 166 | `Na__LayoutEditor__SheetTools__State__.js` | 1 | `Na__LayoutEditor__VectorTools__State__` |  |
| 167 | `Na__LayoutEditor__SheetTools__ToolState__.js` | 4 | `Na__LayoutEditor__MoveAnchor__`, `Na__LayoutEditor__ViewportSnapMove__`, `Na__LayoutEditor__VectorTools__`, `Na__LayoutEditor__VectorTools__Setup__` |  |
| 168 | `Na__LayoutEditor__DimensionTool__.js` | 3 | `Na__LayoutEditor__DrawingGrid__State__`, `Na__LayoutEditor__ObjectSnap__Search__`, `Na__LayoutEditor__OrthoMode__State__` |  |
| 173 | `Na__LayoutEditor__ShapeTool__.js` | 3 | `Na__LayoutEditor__ObjectSnap__Search__`, `Na__LayoutEditor__OrthoMode__State__`, `Na__LayoutEditor__VectorTools__` |  |
| 180 | `Na__LayoutEditor__Panel__Shapes__.js` | 1 | `Na__LayoutEditor__HatchPatterns__` |  |
| 184 | `Na__LayoutEditor__Panel__ViewportSettings__.js` | 5 | `Na__LayoutEditor__ModelSource__`, `Na__LayoutEditor__PlanDoors__`, `Na__LayoutEditor__ViewportRotation__`, `Na__SitePlan__Store__`, `Na__LayoutEditor__SitePlanComposites__` |  |
| 186 | `Na__LayoutEditor__Toolbar__.js` | 12 | `Na__LayoutEditor__VectorQuality__`, `Na__LayoutEditor__DraftMode__`, `Na__LayoutEditor__DrawingGrid__`, `Na__LayoutEditor__ObjectSnap__`, `Na__LayoutEditor__ObjectSnap__Menu__`, `Na__LayoutEditor__OrthoMode__`, `Na__LayoutEditor__DrawingAxes__`, `Na__LayoutEditor__VectorTools__Setup__`, `Na__LayoutEditor__VectorTools__State__`, `Na__LayoutEditor__SheetImages__Insert__`, `Na__LayoutEditor__SheetImages__Setup__`, `Na__LayoutEditor__Share__Button__` |  |
| 194 | `Na__LayoutEditor__SpecData__Transport__.js` | 2 | `Na__LayoutEditor__SpecData__Lockstep__`, `Na__CloudflareIntegration__ApiClient__` | yes |
| 205 | `Na__LayoutEditor__SpecMargin__.js` | 4 | `Na__LayoutEditor__SheetRecords__LeaderlessNotes__`, `Na__LayoutEditor__SheetRecords__NoteRegions__`, `Na__LayoutEditor__NoteRegions__`, `Na__LayoutEditor__SpecMargin__Column__` |  |
| 217 | `Na__LayoutEditor__Panel__ScrapbookParametric__.js` | 9 | `Na__LayoutEditor__HatchPatterns__`, `Na__ProjectQr__ProjectLink__`, `Na__LayoutEditor__ScrapbookParametric__AreaSchedule__`, `Na__LayoutEditor__ScrapbookParametric__CabinetInfill__`, `Na__LayoutEditor__ScrapbookParametric__ProjectQr__`, `Na__LayoutEditor__ScrapbookParametric__SiteLegendLink__`, `Na__LayoutEditor__ScrapbookParametric__SiteLegend__`, `Na__LayoutEditor__PdfFonts__`, `Na__CloudflareIntegration__ApiClient__` | yes |
| 220 | `Na__LayoutEditor__ScrapbookParametric__Grips__.js` | 1 | `Na__LayoutEditor__ObjectSnap__Search__` |  |
| 223 | `Na__LayoutEditor__ScrapbookParametric__ViewportLink__.js` | 1 | `Na__LayoutEditor__ViewportRotation__` |  |
| 225 | `Na__LayoutEditor__PdfExporter__.js` | 6 | `Na__LayoutEditor__PaintOrder__`, `Na__LayoutEditor__ShapeRings__`, `Na__LayoutEditor__ViewportRotation__`, `Na__LayoutEditor__HatchPatterns__`, `Na__LayoutEditor__SheetImages__Pdf__`, `Na__LayoutEditor__PdfFonts__` |  |
| 246 | `Na__PresentationMode__ProjectJson__SceneData.js` | 1 | `Na__CloudflareIntegration__ApiClient__` | yes |

## Verification

Adversarial verifier, 01-Oct-2026. Read-only on both apps, NAAPPS and WCP: TV b2aa9151 and VV 7b4e593a, both trees
clean (`git status` of each app folder empty). The only writes were to this report and to
`scratchpad/parity/work_s11v/` (scripts, the pre-verifier copy of this report `S11__report_before_verifier.md`, and
working data).

### What was checked
- **Release backbone.** Recounted the TV devlog headings: 172 in v2.24.0-v2.172.0, duplicates v2.27.0 and v2.65.1,
  no v2.33.0; 88 from v2.86.0, dated 20/21/22/23/28/29-Sep = 12/43/12/9/1/11. All 172 Appendix A line references and
  dates match `ref/tv_devlog_index.txt` (0 mismatches). Appendix A has 177 rows, and its counts were as stated.
- **Watermark.** No VV source, stylesheet, `index.html` or test cites any TV release after v2.85.0. The VV devlog cites
  only v2.161.0 (the v2.71.0 hand-over), and the ledger's newest TV reference is L87. VV git: 9d250d21 (21-Sep 22:46,
  60 files), eb97d162 (25-Sep, scrapbook index JSON only), then f951441f, 3b666bb9 and 7b4e593a (28-Sep, v2.71.0).
  Every PORTED row's VV version matches a VV devlog entry that cites that TV version. The cites without a
  "TrueVision3D" prefix (VV v2.22.0-v2.24.0, v2.35.0-v2.40.0) were read by hand.
- **"Absent in VV" claims.** About 110 identifiers were probed across VV `02__Src__AppModules`,
  `03__Style__AppStylesheets` and `index.html`. Every claimed-absent identifier is absent. The hits for SpellCheck,
  KeyScope, DocumentId, OrthoMode, ZoomMax, SitePlan and Weight__Kind were unrelated (vendored jsPDF, node_modules,
  the legacy page layout system, the section tool); VV's `Weight__Kind` has no `percent` kind. A sample of PORTED
  identifiers is present.
- **Ledger.** Read L1-55, L80-94, L117-118, L126, L133-176, L190-210, L219, L236, L242-244, L339, L460-467, L482,
  L571-573, L617-619, L720, L810-812, L865-869, L1041-1043, L1087-1136, L1169 and L1188-1246 against the claims.
  The 14 "no worker" lines are confirmed. The Whitecardopedia token `2026-09-18-1` is at WCP logic L229, last changed
  18-Sep (4a92a943); TV's token `2026-09-29-03` is at L682.
- **Back-ports (B5), re-checked in TV source.** As stated: the Add Viewport fill-once (TV L647, inside `Refresh`); the
  confirm dialog's `window.confirm` fallback (module L18, L147; no markup or CSS in TV); no
  ReleaseToOrbit/EnterModeAtPose/SyncFromCamera, no ThumbnailBake and no Ground Floor Plan action in TV; no
  `.gitkeep` or bytecode guard; section filing. Four statuses were wrong (corrected list below).
- **TV-side records.** Plan 4.1 and section 12 rows C, L, N, U, W, Y, AA, AF and AI-AP; devlog v2.159.0 L1067,
  v2.166.0 L553 and v2.161.0 L917; the four WebViewer PORT NOTEs; the seven stale TV back-port fields; TabStrip L60.
  All as stated. Also read: the ValeVision rows of the 12 TV feature PLAN files.
- **VV records.** The duplicate v2.54.0; the v2.44.0 notes (L2600-2611); the History and Toolbar logs; the four
  "Lantern Designer / new" PORT NOTEs; 40 "same split applies" fields; 13 "Back-port : candidate" fields.
- **Harnesses.** Checked first that both VV `Na__Verify__` harnesses only read, then re-ran them from the VV root.
  Exports: PASS on 415 files. ModuleGraph: 517 modules from 1 entry point, 0 failures, 1 known vendor issue. This
  reproduces the survey. The graph follows literal dynamic `import()`, so the lazy-loaded editor is inside it.
- **c.1 and c.2.** Counts (261 rows: 131 no_action / 64 port_adapted / 62 port_whole / 4 keep). The size of every
  TV-only folder, and the 35 TV-only files in shared LE subfolders. Module versions spot-checked (ModeController,
  SheetRecords, PointerDrag, Toolbar, Cells, Modern, Groups, Grips, ItemClipboard, PanelHost). A code-level diff of
  every `no_action` row, with comments stripped and folder renumbering normalised. Import resolution of all 62
  `port_whole_reapply_vv` TV files against VV.
- **UI.** The fold region of `Na__UiFeature__Styles__AppHeader__.css` has 24 rule lines on each side and 0 differences
  (only the comments differ).

### What was corrected
1. B4.2 / S11-F21: the FacePick/GizmoGrip importers were wrong. DrawingPlanes superseded them in TV v2.82.0, and they
   are dead in TV.
2. B5 / S11-F27: the dimension split is HALF (files only); the shared style rows are HALF (StyleRows dead in TV); the
   per-drawing style toggles are OPEN (data only in TV); Pick Face was superseded, not re-armed. The Lantern Designer
   items are present in both apps.
3. Appendix A: v2.48.0, v2.49.0 and v2.49.1 become PENDING-SIGNOFF, and v2.92.0 becomes NOT-DRAWING. New counts:
   55/6/17/79/6/8/4/2. 16 rows are annotated as parked by TV feature plans.
4. c.1: ten rows were wrongly `no_action`; four plan/elevation rows lacked the StyleRows seam; two PlanDimensions rows
   must keep VV; three whole-file rows lacked a transport seam; one VV version was wrong. See the verifier table
   after c.1.
5. Counts: Statement Writer has 12 releases (not 13); the ledger has 30 return-trip sections (not 27); 14 TV `50/`
   files say "PENDING to ValeVision3D" (S11-F10 said 9); VV has 13 "Back-port : candidate" fields (not about 15).
6. VV History has two 1.3.0 entries. The "Source version" convention already exists in 72 VV files. D-S11-08 now
   recommends (a).
7. Added as S11-V08 rather than a correction (S11-F16 is right but incomplete): VV's 3D-tab key map (`Na__ValeVision__HotkeysDictionary__.json` +
   `Na__AppUtils__ValeVision__HotkeyHandler__.js`) is part of the key-scope alignment.

### What was added
S11-V01 to S11-V09 (in the JSON deltas), Appendix D, the c.1 and work-package correction tables, WP-S11-08,
WP-S11-09, D-S11-10, and B10 items 8-9.

### What remains unverified
- Runtime behaviour of either app. In particular, "TV's LE `MarkupBridge__` reads fallback dimension line and text
  settings" comes from reading the code (the split `ConfigState__` is never loaded), not from running TV.
- Whether TV dropped the per-drawing Styles/Exclusions UI on purpose. No devlog entry says so, and TV plan L565 says
  it was planned.
- The 121 c.1 `no_action` rows other than the ten corrected were not compared hunk by hunk. My normalised code diff
  (comments stripped) still shows differences in about 40 drifted rows. Those may be VV seams or further hidden gaps,
  so each owning package must diff -w against TV HEAD.
- WCP `CloudflareWorker` and `server.py` internals, and the NAAPPS servers.
- The full bodies of the 88 later TV entries. Only their ValeVision, sign-off and confirmation lines were searched
  (in every entry), plus targeted reads.
- S10's full re-verification of the fold. Only the AppHeader fold region was re-checked here.
