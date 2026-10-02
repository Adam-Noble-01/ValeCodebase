# r0_revise.py - applies the critic-round revisions to report section R0, then reassembles and validates it.
# Idempotent: always starts from the pristine copies saved in r0_revise_base/ on first run.
# Edits: r0_source.md (prose and tables), r0_build_decisions.py (one decision-table note),
#        r0_assemble.py (path check accepts a VV target that does not exist yet when TV holds the same path).
# Read-only on both apps, NAAPPS and WCP. Every fact below was re-opened on 01-Oct-2026 (path:line in the text).
import os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(HERE, 'r0_revise_base')
FILES = ['r0_source.md', 'r0_build_decisions.py', 'r0_assemble.py']
os.makedirs(BASE, exist_ok=True)
for f in FILES:
    if not os.path.exists(os.path.join(BASE, f)):
        shutil.copy2(os.path.join(HERE, f), os.path.join(BASE, f))

def load(f):
    return open(os.path.join(BASE, f), encoding='utf-8').read()

def save(f, text):
    open(os.path.join(HERE, f), 'w', encoding='utf-8', newline='\n').write(text)

def once(text, old, new, label):
    n = text.count(old)
    assert n == 1, f'{label}: expected 1 match, found {n}'
    return text.replace(old, new)

def line_starting(text, prefix, label):
    hits = [l for l in text.split('\n') if l.startswith(prefix)]
    assert len(hits) == 1, f'{label}: expected 1 line starting {prefix!r}, found {len(hits)}'
    return hits[0]

def replace_line(text, prefix, new_line, label):
    return once(text, line_starting(text, prefix, label), new_line, label)

def insert_after_line(text, prefix, block, label):
    old = line_starting(text, prefix, label)
    return once(text, old, old + '\n' + block, label)

def replace_block(text, start, end, new_block, label):
    i = text.find(start)
    j = text.find(end, i + 1)
    assert i >= 0 and j > i and text.count(start) == 1, f'{label}: block not found'
    return text[:i] + new_block + text[j:]

src = load('r0_source.md')

# ---------------------------------------------------------------------------------------------
# Front matter: how-to-use table and canonical artefacts (issues 1, 2, 4, 5)
# ---------------------------------------------------------------------------------------------
src = replace_line(src, '| What must Adam decide, and what happens if he does not answer?',
    '| What must Adam decide, and what happens if he does not answer? | **R0.2**: DR-01 to DR-44 (K1), Q-VER (R0.2.1) and six questions this report raised (R0.2.11). DR ids gate packages. |',
    'howto decide')
src = replace_line(src, '| What must stay different in VV, and where does each difference live?',
    '| What must stay different in VV, and where does each difference live? | **R0.3** (PD-01 to PD-26 and the tables after it). The swarm never "fixes" these. |\n'
    '| What will still differ from TrueVision when the programme ends, and which answer removes each difference? | **R0.1.8** |',
    'howto differ')
src = insert_after_line(src, '| Evidence | `parity/data/findings_verified.json`',
    '| Release watermark | `parity/report/tools/r5work/release_rows_final.json` (177 TV releases, each with its class, packages and gating DRs; Section E, E.1) | TV release (v2.nn.n) |',
    'artefact release rows')

# ---------------------------------------------------------------------------------------------
# Executive summary verdict and end-state pointer (issues 1, 5)
# ---------------------------------------------------------------------------------------------
src = once(src,
    '- **The port stopped on 20-Sep-2026.** The newest TV release in VV is v2.85.0. TrueVision has shipped 88 releases since (v2.86.0 to v2.172.0), and none of them reached VV.',
    '- **The port stopped on 20-Sep-2026.** The newest TV release in VV is v2.85.0. TrueVision has shipped 88 releases since (v2.86.0 to v2.172.0), and none of them reached VV. Below that mark, 28 older release rows are still open or only partly ported (R0.1.2).',
    'verdict port stopped')
src = insert_after_line(src, '- Allow exactly the named seams in R0.3, and nothing else.',
    '\n**End state.** Run on the K1 defaults alone, the programme ends with an editor that matches TrueVision\'s code and behaviour but still differs on screen in thirteen ways (R0.1.8):\n'
    '\n'
    '- **Two are permanent by design:** the lazy loader\'s cover on a cold first open, and Vale\'s brand content.\n'
    '- **Three close only when TrueVision changes,** because VV is ahead or carries a fix TV lacks.\n'
    '- **Eight close when Adam gives the answer, or takes the live action, named in their row:** the Design Statements tab, the Layout Mode switch, the QR cell, Vale phases in the Document ID, the four held gestures, site plans, design phases and the live publishing path.',
    'end state paragraph')

# ---------------------------------------------------------------------------------------------
# R0.1.1 Releases row (issue 1)
# ---------------------------------------------------------------------------------------------
src = replace_line(src, '| Releases |',
    '| Releases | v2.24.0 to v2.172.0 (177 rows classified) | v2.16.0 to v2.71.0 (the drawing-system releases) | 51 ported, 11 partial, 17 pending sign-off, 80 never considered, 4 reopened by K1 defaults, 2 deliberately not ported, 7 not drawing work, 4 VV-origin, 1 not applicable. **112 open** (partial, pending, never considered and reopened), 28 of them at or below the high-water mark | Section E (E.1.1, E.1.2), data `report/tools/r5work/release_rows_final.json`, recounted 01-Oct-2026. It corrects S11 B3 (55/6/17/79/6/8/4/2, 102 open) from other slices\' evidence. W0-06 acceptance item 1 still quotes the pre-verifier 55/6/14/83/6/7/4/2: replace it with this tally (R0.2.9 note) |',
    'releases row')

# ---------------------------------------------------------------------------------------------
# R0.1.2 rewritten from Section E's reconciliation (issue 1)
# ---------------------------------------------------------------------------------------------
R012 = '''#### R0.1.2 Where the port was up to (Section E's reconciliation of S11)

- **High-water mark: TV v2.85.0** (20-Sep-2026), ported as VV v2.68.0 (`VV/ValeVision__DEVLOG__.md:320`).
- **The most recent port was only partial.** VV v2.70.0 (devlog `:133-134`, committed in `9d250d21` on 21-Sep) took TV v2.83.0, the top-bar fold:
  - the fold is identical;
  - the going-in veil was adapted away: no FirstOpen, no in-host veil base mode, no specification job. VV covers the first open with its full-screen loader instead.

  Section E (E.1.2) therefore classes v2.83.0 as PARTIAL, not PORTED. W1-33 completes it.
- **VV's only later release went the other way.** VV v2.71.0 (28-Sep, per-scene lighting) became TV v2.161.0.
- **Nothing from TV v2.86.0 onward is in VV.** TV shipped those 88 releases between 20 and 29 Sep:
  - 76 of them between 20 and 23 Sep, 43 on 21 Sep alone;
  - 12 on 28-29 Sep.
- **How those 88 are classified:**
  - 77 never considered for VV;
  - 7 parked "on Adam's sign-off";
  - 1 deliberately not ported (v2.88.0);
  - 1 VV-origin (v2.161.0);
  - 2 not drawing work (v2.92.0, v2.139.1).
- **Low-water mark: TV v2.28.0** (13-Sep, viewport snap move). One configuration residue of v2.27.0 also remains (`Drawing2dEdgeWidth`, S09-F33, W2-08).
- **At or below the high-water mark, 28 release rows are open or only partly ported, not the 18 that S11 counted.**
  - The 28 are 27 numbered releases plus the unnumbered 14-Sep eyedropper feature.
  - By class: 11 partial, 10 pending sign-off, 4 reopened, 3 never considered.
  - Section E adds ten rows to S11's 18. Four are "deliberate" non-ports that the K1 defaults reopen: v2.32.0 (DR-09), v2.69.0 (DR-21), v2.71.0 and v2.76.1 (DR-11).
  - The other six are corrections from other slices' evidence. v2.30.2, v2.57.0, v2.65.0, v2.67.0 and v2.83.0 become PARTIAL. v2.75.0 becomes never considered, because its batch commit carried unlogged ItemClipboard 1.3.0 and registrar 1.2.0 changes.
  - Other open examples: v2.37.0 flush joins (signed off by Adam in TV on 14-Sep), v2.42.0 and v2.48.1 plan doors, site plans v2.48.0-v2.49.1, v2.78.0 select-picks-move, v2.82.0 drawing planes.
- **There is no single watermark.** Each feature area has its own low-water release (Section E, E.1.3). Where Section E moved S11 B1's value, the old value is in brackets:
  - LE sheet tools: v2.28.0;
  - LE drawing tools: v2.41.0;
  - LE viewports and render styles: v2.32.0 (S11: v2.38.0; Model Source reopened);
  - projected linework (50): v2.37.0;
  - drawing core, plans, elevations, north, planes and fog (40-49): v2.30.2 (S11: v2.82.0; the start-up config order);
  - LE core: v2.67.0 (S11: v2.106.0; the unsaved-work hold);
  - LE web viewer, PDF and publishing: v2.65.0 (S11: v2.155.0; the broken-bubble hover).
- **The VV parity ledger is out of date.** It records none of the 88 later releases, and about 40 of its rows are stale or contradictory (S11 B4).
- **S11's module table cannot be run as written** (S11 verifier, S11-V01, S11-V02):
  - 10 rows marked no_action hide TV changes that VV lacks;
  - 44 of the 62 whole-file rows import TV modules VV does not have.

Section E carries the full release table (E.1.4) and the per-module watermark. Its data file, `report/tools/r5work/release_rows_final.json`, is the canonical source: W0-06 seeds the ledger's Release Watermark from it (R0.2.9 note).

'''
src = replace_block(src, '#### R0.1.2 Where the port was up to', '#### R0.1.3 Biggest gaps by system', R012, 'R0.1.2 block')

# ---------------------------------------------------------------------------------------------
# R0.1.5 prerequisites: P1 (issue 4) and P10 (issue 7)
# ---------------------------------------------------------------------------------------------
src = replace_line(src, '| P1 |',
    '| P1 | Adam answers DR-01 to DR-07 (or accepts the K1 defaults in writing) and the devlog version-step question (R0.2.1, Q-VER). He also sees the six questions this report raised (R0.2.11). Each has a default; three of them (Q-REG, Q-63, Q-BACKUP) are read by Wave 0. W0-01 records each answer as a VV D-number continuing D01-D40 in `VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md`. | Adam, then W0-01 | K1 section 1; K3 W0-01; DR-35; R0.2.11 |',
    'P1')
src = replace_line(src, '| P10 |',
    '| P10 | **Resolved in code; one live check left.** VV registers Whitecardopedia\'s worker, never `live_sw.js`:<br>'
    '- `VV/index.html:34` loads WCP\'s Url constructor and `:44` its registrar;<br>'
    '- the registrar registers `getServiceWorkerUrl()` (Registrar `:97-105`, `:191-195`), which resolves the WebApps-root stub `Na__Pwa__ServiceWorker__.js` (Url constructor `:38`, `:225-231`). On WCP\'s dev port, Flask serves the stub at the origin root (`WCP/server.py:915-928`);<br>'
    '- the stub `importScripts` the WCP logic file (stub `:24`, `:31`), whose token is `\'2026-09-18-1\'` (`:229`);<br>'
    '- `D:/10_CoreLib__ValeCodebase/WebApps/live_sw.js` is an unreferenced saved copy of that logic file: FILE line `:5`, token `\'2026-09-10-6\'` at `:68`, last commit ff8c492a (10-Sep).<br>'
    'Left: at the W0 deploy, confirm the live site serves the same stub (the GitHub Pages copy is assumed to match the repository). | Adam, at the W0 deploy | R6 F.8 C5; R1 A.4 #11; code read 01-Oct-2026. K2 sections 9 and 12 still list it as open (and cite `:157`; the token is at `:68`) |',
    'P10')

# ---------------------------------------------------------------------------------------------
# R0.1.7 risk T1 (issue 8)
# ---------------------------------------------------------------------------------------------
src = replace_line(src, '| T1 |',
    '| T1 | **Live R2 data loss.** The Whitecardopedia sync lists `VaApps/Projects/{folderId}/` recursively: Prefix only, no Delimiter, first 1,000 keys. It deletes every `.png`/`.jpg`/`.jpeg`/`.webp` whose bare name is not a local top-level image.<br>'
    '- By code reading, every full or images sync (`na_sync_all`, `na_sync_images`; the GLB-only sync at `:964` does not purge) therefore deletes the R2 copies of PresentationMode thumbnails and Layout Editor snapshots. The repository holds 25 thumbnails (7 projects) and 18 snapshots (all in `2026/3047__Doous`). Whether R2 still holds their copies is unverified.<br>'
    '- It would also delete every sheet picture, published picture and statement picture this programme adds. | '
    '`WCP/Tools__DevUtils/AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py:659-680` (`list_objects_v2` at `:667`), called at `:926` and `:959`; S12-F01 ("Not verified against R2"), S08-F02, S07b-V01 (critical); local counts by `find` under `WCP/Projects`, 01-Oct-2026; R2 state is an open item in R3 C.6 | '
    'DR-06; W0-07 is prepared and dry-run, then Adam applies it; Adam checks what R2 holds before he applies it (R3 C.6); no package writes new content under project subfolders until then (K3 R8) |',
    'T1')

# ---------------------------------------------------------------------------------------------
# R0.1.8 end state under the K1 defaults (issue 5)
# ---------------------------------------------------------------------------------------------
R018 = '''#### R0.1.8 End state under the K1 defaults versus an identical editor

Adam asked for an identical Drawing Layout Editor. The K1 defaults stop short of that wherever acting would put untried behaviour, NA-only content or a live-data change in front of Vale users (R0.2, "How defaults work").

A programme run on the defaults alone therefore ends, after W6-04, with the differences below, and every package that waits for an answer is still held.

- Each row names the answer or action that removes the difference.
- E8 and E9 are permanent by design. So are the structural divergences of R0.3.1, which show on screen only through E8.
- Section D (R4) has the case-by-case detail.

| # | What a Vale user sees under the defaults | What TrueVision shows | What removes it | Permanent by design? |
|---|---|---|---|---|
| E1 | Four tabs: 3D Model, Drawings, Specification, Document Register. Design Statements is built (W4-12, W4-13) but switched off (`LayoutEditor__Statement__Enabled = false`) | Five tabs, Design Statements included, even on a project with no statement (R4 D.2.1 #1) | DR-10 answered (a) with the switch on | No |
| E2 | On a project whose Layout Mode is off: no tab strip, so no header fold (R4 D.1.5 case 8) | No such switch: the strip shows whenever the editor is enabled and a sheet exists (`TVM/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__TabStrip__.js:316`) | Adam re-decides DR-25 at the publishing port (W4-09) and retires the switch, as K1 recommends | No (R0.3.6) |
| E3 | No QR code in the title block's end cell and no Project Portal block (`ProjectQr__Enabled` and `LayoutEditor__TitleBlock__QrCellEnabled` false) | A QR code to NA's `/q/` resolver in the title block and in the Portal block | DR-12: a Vale resolver (W5-05, hard-gated), then both switches on. The Portal wording is DR-43 | No |
| E4 | A two-part Document ID, `{project}_{drawing}`, in the title block, the register, PDF names and published folders | Three parts, `{project}_{phase}_{drawing}`, with NA's phases T01-T04 | DR-11: Adam supplies Vale's phase list (a config change, needed before the first publish) | The format converges; the phase names stay Vale's (PD-15) |
| E5 | Four gestures held: auto-Move after a select, Ctrl-drag copy, viewport carry and the move anchor (guard constants from W3-03) | All four live | DR-40 items 7-10 answered yes; W3-04 removes the guards | No |
| E6 | No site-plan drawings: the Drawing Type row is hidden and the site-plan code (LE/21, the composites panel, the legend) is dormant | Location and block plans at 1:100 to 1:5000 | DR-08 (A) with a Vale site-data pipeline (W5-06, hard-gated, XL) | No |
| E7 | No design phases: no Model Source choice per viewport and no Design Phase menu. TV hides the same UI on one-model projects, so the two match on any single-model project | Phase UI on projects with existing and proposed models | DR-09 (d): real phases, which needs Vale multi-model projects | No |
| E8 | Cold first open of a session: an opaque cover under the strip from the first frame, reading "Your Drawings Are Loading" with VV's two pre-load lines, while the editor downloads. A cold Specification, Register or Statements press shows a short cover. A failed load shows VV's full-screen error state | The in-host veil only after 550 ms, and only if still drawing; nothing on a document tab; no load-failure state, because the editor loads at start-up | Only DR-24 (b), dropping the lazy loader, which K1 does not recommend. The cover's words on a document tab are Q-COVER | **Yes** (DR-24, PD-05) |
| E9 | Vale brand content: Vale logo, title and palette name; the header title hidden at 600 px and narrower; an empty Standard Scrapbook and an unseeded Custom Scrapbook; no Project Hub section; Vale's Classic scan; a Vale spell-check dictionary | Noble Architecture's equivalents | Vale content for each NA-only item (DR-43, DR-20) | **Yes** for brand values (PD-13, PD-15). The scrapbooks and the statement section fill only when Adam supplies Vale content |
| E10 | Authoring extras VV keeps: the Styles/Exclusions rows, the Ground Floor Plan quick action and the thumbnail bake in the plan and elevation Dev menus. Section-mode elevations are filed under "Cross Sections" (D28) | None of these rows; every elevation under "Elevations" | DR-36 (b) approving WT-06 and WT-09 (TV takes VV's rows). D28 retires when TV's 48 passes 0.1.0 (DR-26) | Until TrueVision adopts them (R0.3.5, R0.3.6) |
| E11 | App chrome where VV is ahead: a styled confirm dialog, toasts at 96 px, and the 3D canvas and export safe frame clearing the strip | `window.confirm`, toasts at 40 px, the canvas under the strip (R4 D.2.1 #25, #26, #29) | DR-36 (b) approving WT-05 and WT-07 (TV takes VV's) | Until TrueVision adopts them (PD-10, R0.3.5) |
| E12 | The register PDF boxes a "yellow" warning as amber (a W4-18 seam) | No box for a "yellow" warning: a TV defect (`TVM/51__System__LayoutEditor/51__Feature__DrawingRegister/Na__LayoutEditor__Register__Pdf__.js:644` boxes only red and amber) | DR-36 (b) with WT-08 fixing TV; VV then drops its seam | Until TrueVision is fixed (DR-37) |
| E13 | Until Adam applies the sync fix (W0-07, DR-06) and deploys worker 1.6.0 (W0-10), no package writes sheet pictures or published files to R2. So the public site keeps VV's live viewer, which draws sheets on the reader's device (DR-22 default) | A published-only viewer | Adam's live actions (P9) | No |

'''
src = once(src, '### R0.2 Decision Register', R018 + '### R0.2 Decision Register', 'R0.1.8 insert')

# ---------------------------------------------------------------------------------------------
# R0.2.1 Tier 1 Q-VER (issue 6) and Tier 2 report-raised row (issue 4)
# ---------------------------------------------------------------------------------------------
src = replace_line(src, '| 8 | **Q-VER**',
    '| 8 | **Q-VER** Devlog version step (not a DR) | Adam\'s written rule says patch bumps for `ValeVision__DEVLOG__.md` and file headers (`devlog-entries-use-patch-bumps.md`, 21-Aug-2026). The rule lives in the SketchUp Plugins project memory, which ValeVision sessions may not load.<br>'
    'Practice since 21-Aug has been mixed:<br>'
    '- minor steps from v2.15.0 (02-Sep) to v2.21.0 (10-Sep); v2.16.0-v2.21.0 are the port phases;<br>'
    '- patch steps v2.21.1-v2.21.21 (10-11 Sep, `VV/ValeVision__DEVLOG__.md:4763` to `:3942`);<br>'
    '- then minor steps from v2.22.0 (12-Sep, `:3862`) to v2.71.0 (`:4`), with `.1` for 13 follow-up fixes (v2.22.1 to v2.66.1).<br>'
    'So the recent practice is minor, and DR-34 and S11 B10 assume minor releases from v2.72.0. W0-01 records the answer and the scribes follow it (K3 section 14). | '
    'Not set by K1 or K3. Suggested: patch bumps from v2.71.1, because the written rule is the only explicit instruction on record. If Adam prefers the recent practice: minor bumps from v2.72.0 (R6 F.8 C6). |',
    'Q-VER')
src = insert_after_line(src, '| DR-24, DR-26, DR-34, DR-35, DR-36',
    '| Q-REG, Q-63, Q-BACKUP (raised by this report, R0.2.11) | W0-04 and W0-06 (registry and lint); W0-09 (backup root) | Unowned numbers become TV growth; 63 stays VV-reserved and nothing moves while TV\'s branch is unmerged; backups go to a folder outside the repository, keep 30 |',
    'tier 2 report row')

# ---------------------------------------------------------------------------------------------
# R0.2.11 decisions raised by this report (issue 4) - placed after the generated R0.2.2-R0.2.10 block
# ---------------------------------------------------------------------------------------------
R0211 = '''

#### R0.2.11 Decisions raised by this report (not in K1)

The sections found six questions that no K1 DR covers.

- Each has a default, so none blocks Wave 0.
- The package in the Gates column must not start until the question is answered, or W0-01 has recorded its default.
- Q-AZIMUTH and the second half of Q-COVER are code rulings for the planner. The rest are Adam's.

| Id | Question | Options | Recommendation | Default if unanswered | Gates | Raised in |
|---|---|---|---|---|---|---|
| **Q-63** | TV's unmerged branch `claude/westfarm-intro-notes-37b804` (commit `4db73420`, 22-Sep-2026; not an ancestor of b2aa9151) adds `02__Src__AppModules/63__System__LocalFileParity/` (Logic, Modal, Registry, Styles, Watcher). It also edits five drawing-system files (`Na__AppUtils__LocalProjectMirror__.js`, TV 40 `Na__DrawView__ProjectData__.js`, LE AutoSave, SpecData Draft and Transport), `Index.html` and the NAAPPS local server. 63 is VV-reserved (`VVM/63__Feature__AppNotificationEmail/`); if the branch merges as 63, K2 N2 forces VV's folder to move. Which way? | (a) Adam renames the folder on the branch to a TV-growth number, e.g. `65__System__LocalFileParity`, before it merges (5 files plus `Index.html`).<br>(b) VV moves to `VVM/93__Feature__AppNotificationEmail/` (3 files; one import at `VVM/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__UiInteractionLogic__.js:25`), travelling with W6-03 | (a) | Nothing moves while the branch is unmerged; the registry keeps 63 VV-reserved. If it merges as 63 first, (b) runs with W6-03 | W0-06 (registry); W6-03 (hard-gated). A merged branch also changes five files pinned at b2aa9151: they need a fresh pin (DR-01) and follow-up hunks (R6 F.8 C3) | R1 A.2.7, A.4 #5; `git show --name-only 4db73420`; `git merge-base --is-ancestor 4db73420 b2aa9151` is false |
| **Q-35ASSETS** | Folder 35 holds Vale title-block material that no package keeps:<br>- the "VizDpt" A3 variant (`VVM/35__System__PageLayoutSystem/02__VizDpt__TitleBlock__Pdf__/`: a PDF and a PNG);<br>- 12 files in `VVM/35__System__PageLayoutSystem/03__TitleBlock__LayoutPdfs__RecConcept__Feb-2026__/` (A1-A3 landscape and portrait layouts, each as PDF and PNG).<br>W0-16 copies only jsPDF and the Classic A3 scan. Keep or archive before W6-03 retires 35? | (a) Copy them beside the Classic scan in `VV/01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/`.<br>(b) Leave them to git history | (a): 14 files keep Vale's own title-block artwork in the tree after 35 is burnt | Nothing is copied. W6-03 stays held until Adam confirms the removals (DR-03 hard gate), and this question goes to him with them | W6-03 (hard-gated); W0-16 if answered (a) early | R1 A.2.6, A.4 #2 |
| **Q-REG** | K2's registry (K2 N3) gives 08, 09, 12-14 and 16-19 no owner, so W0-04's "unregistered folder number" lint has gaps | (a) TV growth: VV never takes them (R1 A.2.7).<br>(b) Another split Adam names | (a) | (a): W0-06 writes them as TV growth, extending DR-03 registry (i) | W0-06, W0-04 | R1 A.2.7, A.4 #4 |
| **Q-AZIMUTH** | `Na__ElevData__SetAzimuthDeg` is a VV-only export of `VVM/45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js` (today 46; defined `:437`, exported `:805`). Its only caller is VV's elevation Dev-menu editor (import `:130`, call `:402`), which W2-05 replaces with TV 2.1.0. TV has no such name. Keep or retire? | (a) Keep it as a FacePick seam.<br>(b) Retire it with W2-05 | (b), with one condition. W1-10 takes TV's data module 1.1.0 whole in Wave 1, while VV's old editor still imports `SetAzimuthDeg` and `SetSeededFrom` (`:130-131`) until W2-05 in Wave 2. So W1-10 keeps both setters exported, and W2-05 removes both: TV's 2.1.0 face pick writes the azimuth itself (`TVM/45__System__ElevationViews/Na__Elevation__DevMenu__Editor__.js:730-739`), and DR-32 retires `SetSeededFrom` | As recommended (planner's ruling; nothing user-visible) | W1-10, W2-05 | R2 B.3.4, B.5 #4 |
| **Q-COVER** | (1) What VV's boot cover says on a cold document-tab press (Specification, later Register or Statements, pressed from the 3D view before the editor has loaded). TV never shows a cover there, because its editor loads at start-up.<br>(2) How the `immediate` option reaches `Na__LeVeil__FirstOpen`, since TV's `Enter(sheetId)` takes no option | (1) The drawing cover's headline with VV's two pre-load status lines and no drawing job, or other words Adam names.<br>(2) The loader passes an option through the facade, or LoadingVeil checks the loader's cover (`#naLayoutEditorLoading` visible) itself | (1) The first, confirmed by eye (R4 D.4 check 15).<br>(2) Either, recorded as a VV seam in W1-33's PORT NOTE; the veil must show synchronously inside Enter | (1) As recommended.<br>(2) The planner picks before W1-33 is handed out | W1-33 | R4 D.5 #5, #6 |
| **Q-BACKUP** | Where the Flask save guard keeps project backups (W0-09). DR-30 says only "outside D:/10_CoreLib__ValeCodebase", and its default leaves "the backup location in config for you to confirm" | (a) A folder outside the repository, keep 30.<br>(b) Another location Adam names | (a), mirroring TV's convention with Vale names. TV uses `NAAPPS/ProjectVision__LocalServer__Main__.py:112-117`: the environment variable `TRUEVISION_PROJECT_BACKUP_ROOT`, else `%LOCALAPPDATA%\\NobleArchitecture\\TrueVision\\ProjectDataBackups`, keep 30. Suggested VV name: `%LOCALAPPDATA%\\ValeGardenHouses\\ValeVision\\ProjectDataBackups` | W0-09 writes the suggested location into config; Adam confirms it before the first guarded save | W0-09 | K3 W0-09; DR-30 |'''
src = once(src, '<!-- R0:DECISIONS -->', '<!-- R0:DECISIONS -->' + R0211, 'R0.2.11 insert')

# ---------------------------------------------------------------------------------------------
# R0.3 rule: map every Section C seam to a row (issue 2)
# ---------------------------------------------------------------------------------------------
src = insert_after_line(src, "- Every seam is written in the hosting file's PORT NOTE `Divergences` field (K2 H5).",
    "- Section C's seam table (R3 C.4, S1-S23) is the wiring contract for these rows, and every C.4 seam has a row here:\n"
    "  - S1 PD-03; S2 PD-12, PD-13, PD-15; S3 PD-14; S4 and S20 DIV-2 (PD-02); S5 and S22 PD-05; S6 PD-01;\n"
    "  - S7 R0.3.6 (Layout Mode); S8 PD-11; S9 PD-07; S10 PD-20; S11 PD-03 and PD-12; S12 PD-04; S13 PD-21;\n"
    "  - S14 R0.3.6 (`Snapping__.js`); S15 PD-19; S16 PD-12 and PD-20; S17 PD-22; S18 PD-23; S19 PD-24; S21 PD-06; S23 PD-25.\n"
    "- Section D's structural UI seams (R4 D.3) are PD-05, PD-26, and the R0.3.6 rows for the Layout Mode gate and drag-to-reorder. Its chrome items where VV's values win are in R0.3.5.",
    'R0.3 mapping')

# ---------------------------------------------------------------------------------------------
# PD-05 boot-veil class (issue 2, R4 D.3)
# ---------------------------------------------------------------------------------------------
src = once(src,
    '`SetLayoutMode`, `WaitForFirstDrawing` | - Every TV LE stylesheet',
    '`SetLayoutMode`, `WaitForFirstDrawing`<br>- the boot veil\'s VV-only modifier class `.na-le-veil--boot` in Styles__Boot (W1-33) | - Every TV LE stylesheet',
    'PD-05 where')
src = once(src,
    'S09-F10, S10-F24 |',
    'S09-F10, S10-F24; R4 D.3 |',
    'PD-05 evidence')

# ---------------------------------------------------------------------------------------------
# PD-15 and R0.3.4: the TrueVision Hub module lands inert, never renders (issue 3)
# ---------------------------------------------------------------------------------------------
src = replace_line(src, '| **PD-15** |',
    '| **PD-15** | NA content never reaches a Vale user; NA-only features land switched off | Noble Architecture identity, URLs and planning content | '
    '- QR (LE/53) off: Symbol fails closed; `FALLBACKS.baseUrl` is empty until a Vale resolver exists; `LayoutEditor__TitleBlock__QrCellEnabled` false<br>'
    '- the Statement Writer\'s "TrueVision 3D Project Hub" section is **present but never rendered**. Its module `VVM/51__System__LayoutEditor/52__Feature__StatementWriter/09__Standard__Sections/Na__LayoutEditor__Statement__Standard__TrueVisionHub__.js` lands inert at TV\'s path with W4-12, because TV\'s Registry imports it statically (`TVM/51__System__LayoutEditor/52__Feature__StatementWriter/09__Standard__Sections/Na__LayoutEditor__Statement__Standard__Registry__.js:140`; `Na__LeStmtStd__DEFINITIONS` at `:155-162` has no filter)<br>'
    '- VV\'s Registry filters DEFINITIONS by config (a VV seam until TV\'s WT-03 adds the filter, DR-42 (6)), and VV\'s config excludes `TrueVisionHub`<br>'
    '- the Hub file reads the project name through `Na__CfApi__GetProjectDisplayName`, not `window.TrueVision__Pwa__ProjectContext` (TV `:206`)<br>'
    '- Standard Scrapbook empty; Custom Scrapbook not seeded<br>'
    '- Document ID phases are Vale\'s, never NA\'s T01-T04<br>'
    '- spell-check dictionary is Vale\'s (`VV/50__ValeVision__UserConfig/`)<br>'
    '- PDF.js from VV vendor 07, never `/na-apps/20__PlanVision__CoreAppCode` | '
    '- Gate G4 NA-marker lint: `NaProjectPortal`, `30__TrueVision__AppContent`, `/na-apps/30__TrueVision__CoreAppCode`, `noble-architecture.com/q/` and `/s/`. Allow-list `cdn.noble-architecture.com/VaApps` and `www.noble-architecture.com/assets`.<br>'
    '- W0-04 adds one named G4 exception, for the Hub file above. That file carries TV\'s token in its file name, ID and keys, has 19 lines naming TrueVision, and holds NA product copy (e.g. TV `:124`). Without the exception, W4-12 fails its own gate (R2 B.3.7). No other file is excepted.<br>'
    '- If Adam wants no NA copy in VV\'s source at all, DR-43\'s alternative is a Registry seam that drops the Hub import and its DEFINITIONS entry; the file then stays out of VV. | '
    'DR-10, DR-11, DR-12, DR-20, DR-42, DR-43; K2 V2; R2 B.3.7; K3 W4-12; S06a-F25, S07a-F58, S07a-V02 |',
    'PD-15')
src = once(src,
    '<br>- the "TrueVision 3D Project Hub" section<br>',
    '<br>- the "TrueVision 3D Project Hub" section in any rendered statement (its module lands inert, PD-15)<br>',
    'R0.3.4 hub')

# ---------------------------------------------------------------------------------------------
# PD-20 to PD-26: the seams Section C and Section D define that the closed list lacked (issue 2)
# ---------------------------------------------------------------------------------------------
PD_NEW = '\n'.join([
'| **PD-20** | Document code in document names | VV\'s `?project=` token is a folderId (`2026/3047__Doous`); TV\'s is a bare code (`TVM/03__AppUtils/Na__AppUtils__ProjectLoader.js:81-86`). Used raw, VV would print `2026/3047__Doous_T01_D01` (S07a-V01) | '
  '- `Na__DrawData__GetDocumentCode()`, a VV-only export that W1-12 adds to `VVM/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js` (today 42). It returns the loaded project\'s `projectCode` through `Na__CfApi__GetLoadedProjectData()`, falling back to the master-index entry<br>'
  '- one marked seam in each document-name host: the DrawingNumber default in `VVM/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js` (W1-19); the number in `VVM/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js`; `Na__LePdf__Filename` in `VVM/51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js`; `VVM/51__System__LayoutEditor/51__Feature__DrawingRegister/Na__LayoutEditor__Register__Pdf__.js` (W4-18); the Sheet Images folder names (LE/54)<br>'
  '- the Statement Writer\'s `{code}` (R3 C.4 S16, W4-06) | '
  '- `Na__DrawData__GetProjectCode()` stays the transport token (`/api/projects/<token>`); only document uses take the accessor.<br>'
  '- Each host records its seam in the PORT NOTE Divergences, and every later whole-file port of a host re-applies it.<br>'
  '- The host seams retire only if TV adopts the accessor, which is not one of DR-42\'s eleven offers. | '
  'DR-11; R3 C.4 S10, S16; K3 W1-12; S07a-V01 |',
'| **PD-21** | Thumbnail call shape | VV\'s renderer takes `(sceneId, projectCode, showToast)` (VV `:229`); TV\'s callers pass `(sceneId, targetWidthPx)` (`TVM/21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js:261`) | '
  '`VVM/21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js`: `Na__PresentationMode__Thumbnail__CaptureAndUpload` accepts both shapes. A numeric second argument is the width, and the project code is then resolved inside. W0-14 adds this, which also fixes VV\'s Update All Thumbnails (K3 W0-14) | '
  '- Keep both shapes through every later port of the renderer or its callers; PORT NOTE Divergences.<br>'
  '- W0-14\'s node stub test pins `(id)`, `(id, 512)` and `(id, code, toast)`. | '
  'DR-27; R3 C.4 S13; K3 W0-14 |',
'| **PD-22** | Share-link token and base | VV\'s project token is a folderId that can hold `/`, `_`, `-`, `.` and spaces; TV\'s links carry a bare code and NA\'s resolver | '
  '`VVM/51__System__LayoutEditor/66__Feature__DocumentSharing/` (new, at TV\'s path):<br>'
  '- `Na__LayoutEditor__Share__Links__.js`: a project-token pattern admitting `/`, `_`, `-`, `.` and the three space-containing folders replaces `Na__LeShareLink__CODE_PATTERN` (`TVM/51__System__LayoutEditor/66__Feature__DocumentSharing/Na__LayoutEditor__Share__Links__.js:119`, `/^[A-Za-z0-9]{2,12}$/`) (W4-07)<br>'
  '- `Na__LayoutEditor__Share__Config__.json`: VV\'s app URL replaces NA\'s `Link__BaseUrl` `https://www.noble-architecture.com/s/` (TV `:16`) (W4-08)<br>'
  '- `Na__LayoutEditor__Share__Button__.js`: a Vale share title replaces the "Noble Architecture" fallback (TV `:320`) (W4-08) | '
  '- Document keys and `?open=` stay verbatim. The link form is `?project={folderId}&open={key}`, with no resolver host (DR-23).<br>'
  '- Never a bare code while codes collide.<br>'
  '- G4 NA-marker lint; PORT NOTE Divergences. | '
  'DR-23, DR-43; R3 C.4 S17; K3 W4-07, W4-08 |',
'| **PD-23** | Published-reader URLs | On localhost VV\'s Flask answers `index.html` with 200 for a missing file under `/Projects/` (`WCP/server.py:958-977`), which breaks TV\'s "a 404 is an answer" rule. VV\'s R2 base also differs | '
  '`VVM/52__System__Layout__PublishedDocuments/Na__PubDoc__Urls__.js` (new, at TV\'s path; W4-17):<br>'
  '- the localhost first URL must be 404-honest: `/Whitecardopedia/Projects/{folderId}/...`, which answers real JSON 404s (`WCP/server.py:901-907`), or W0-19 makes `/Projects/` 404-honest<br>'
  '- the live URL is built from `ProjectData__AssetUrls__R2BaseUrl` (`VVM/03__AppUtils/Na__AppUtils__ProjectLoader.js:145-146`). It never goes through VV\'s `Na__AppUtils__ResolveAssetUrl`, whose `hasImages_R2` gate (`:464-475`) sends some projects to GitHub Pages; TV\'s reader calls its own `ResolveAssetUrl` (TV `:54`, `:202`) | '
  '- Keep TV\'s retry rule verbatim: a 404 is never retried (TV `:26`, `:243`).<br>'
  '- PORT NOTE Divergences. | '
  'DR-22, DR-29; R3 C.4 S18, C.5, C.6 |',
'| **PD-24** | Site-plan store identity (dormant) | TV\'s store reads NA\'s CDN prefix and TrueVision-named manifest stems | '
  '`VVM/51__System__LayoutEditor/21__System__SitePlanData/Na__SitePlan__Store__.js` (new, at TV\'s path; dormant; W2-14):<br>'
  '- the W0-12 facade names and VV identity replace `Na__SpStore__CDN_BASE` = `https://cdn.noble-architecture.com/NaProjectPortal` (`TVM/51__System__LayoutEditor/21__System__SitePlanData/Na__SitePlan__Store__.js:118`)<br>'
  '- TV\'s folder names `SitePlan__DrawingData__{Existing,Proposed}/` and project key `SitePlan__DataStores`, inside VV\'s prefix<br>'
  '- manifest stems `TrueVision__SitePlan__` (TV `:124`) read as `ValeVision__SitePlan__`; both names accepted | '
  '- Dormant until DR-08 (A) and W5-06; the Drawing Type row stays hidden by config.<br>'
  '- G4 and G6 apply; PORT NOTE Divergences. | '
  'DR-08, DR-29; R3 C.4 S19; K3 W2-14; S04a-V04 |',
'| **PD-25** | Rename restamp route | VV\'s editor loads lazily, so a folder-40 module must not import an editor module; VV\'s section bindings live in its own 41 | '
  '`VVM/40__System__DrawingViewCore/Na__DrawView__RenameDrawing__.js` (today 42):<br>'
  '- imports `Na__LeLoad__PrepareRestamp` and `Na__LeLoad__RestampForScene` from `VVM/51__System__LayoutEditor/01__Core__Loader/Na__LayoutEditor__Loader__.js` (VV `:121`; Loader `:671`, `:681`). TV instead imports `TVM/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport3d__.js` lazily (TV `:116-138`)<br>'
  '- imports `Na__SectSceneData__RenameSceneKey` from VV\'s own 41 (VV `:120`; TV `:118` imports it from TV 41) | '
  '- Never take TV\'s file whole. W1-06 re-applies TV\'s StageHolders, StageFloorPlan and StageElevation on this route.<br>'
  '- PORT NOTE Divergences. | '
  'DR-24, DR-41; R3 C.4 S23; K3 W1-06 |',
'| **PD-26** | Cascade order of the 54 and 55 stylesheets | VV\'s loader links the editor sheets at the end of `<head>` (`VVM/51__System__LayoutEditor/01__Core__Loader/Na__LayoutEditor__Loader__.js:276`), after the whole CSS index. TV imports 54 and 55 after its editor sheets (`TV/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css:182`, `:190`, after `:161-174`). So the order flips | '
  '`VV/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css`: the lines for `VVM/54__Feature__ColourPalette/Na__ColourPalette__Styles__.css` (W1-37) and `VVM/55__Feature__SpellCheck/Na__SpellCheck__Styles__.css` (W2-34) | '
  '- Both sheets keep their own namespaces (`.na-colour-palette*`, `.na-spellcheck-*`). The only exposure is an element carrying `.na-spellcheck-field` plus an editor class that sets `white-space`, `outline`, `cursor` or `user-select`.<br>'
  '- W2-34 checks every such host field, or VV also links 54 and 55 last from `Na__LeLoad__STYLESHEETS`.<br>'
  '- Record the order in both PORT NOTEs. | '
  'DR-24; R4 D.3, D.2.1 #14; S10 wiring note 12 |',
])
src = insert_after_line(src, '| **PD-19** |', PD_NEW, 'PD-20..26')

# ---------------------------------------------------------------------------------------------
# R0.3.5 chrome where VV's values win (issue 2: R4 D.3 lists it; DR-44 default keeps it)
# ---------------------------------------------------------------------------------------------
src = insert_after_line(src, '| Authenticated, path-guarded statement and publish routes; delete to quarantine |',
    '| Toast offset and the strip clearance of the 3D canvas and the export safe frame | `.na-toast` `bottom: 96px` (`VV/03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css:1250`; TV `:1264` has 40px); the canvas `top` (`VV/03__Style__AppStylesheets/Na__CoreUi__Styles__RenderCanvas__.css:9`, `:14`) and the safe frame (`VV/03__Style__AppStylesheets/Na__ImageExport__Styles__ViewportOverlays__.css:29`, `:32`) clear the tab strip | TV takes VV\'s values (WT-07; DR-44, DR-36) | R4 D.2.1 #25, #29, D.3; DR-44 |',
    'R0.3.5 chrome')

# ---------------------------------------------------------------------------------------------
# R0.3.6 transitional elevation setters (Q-AZIMUTH)
# ---------------------------------------------------------------------------------------------
src = insert_after_line(src, '| `Elevation__SeededFrom` | Elevation records |',
    '| VV-only elevation setters `Na__ElevData__SetAzimuthDeg` and `Na__ElevData__SetSeededFrom` | `VVM/45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js` (today 46), kept exported by W1-10 because VV\'s old Dev-menu editor still imports them (`VVM/45__System__ElevationViews/Na__Elevation__DevMenu__Editor__.js:130-131`, today 46) | W2-05 takes TV\'s 2.1.0 editor and removes both (Q-AZIMUTH) | R2 B.3.4; DR-32 |',
    'R0.3.6 setters')

save('r0_source.md', src)

# ---------------------------------------------------------------------------------------------
# r0_build_decisions.py: note under R0.2.9 for the W0-06 acceptance (issue 1)
# ---------------------------------------------------------------------------------------------
bd = load('r0_build_decisions.py')
bd = once(bd, "NOTES = {\n",
    "NOTES = {\n"
    " 'R0.2.9 Ledger and versioning':\n"
    "  'W0-06 acceptance item 1 quotes S11\\'s pre-verifier release tally (\"55/6/14/83/6/7/4/2\"). The canonical source is now Section E\\'s `report/tools/r5work/release_rows_final.json`. Brief W0-06 with: \"Release Watermark (177 rows) seeded from `r5work/release_rows_final.json`: 51 ported / 11 partial / 17 pending sign-off / 80 never considered / 4 reopened / 2 deliberate / 7 not drawing / 4 VV-origin / 1 n/a, 112 open\" (R0.1.1, R0.1.2). The same item lists DIV-1 to DIV-4 as permanent; DIV-3 is closed (R0.3.1).',\n",
    'decisions note')
save('r0_build_decisions.py', bd)

# ---------------------------------------------------------------------------------------------
# r0_assemble.py: a VV target may be a new file at TV's path (K2: TV-only modules land at TV's path)
# ---------------------------------------------------------------------------------------------
asm = load('r0_assemble.py')
asm = once(asm, "'21__System__SitePlanData', 'README__CrossSectionView__.md')",
    "'21__System__SitePlanData', 'README__CrossSectionView__.md',\n          '93__Feature__AppNotificationEmail')   # <-- Q-63 option (b), a proposed path\nNEW_AT_TV = []",
    'assemble NEW_OK')
asm = once(asm, "            if os.path.exists(os.path.join(base, c)):\n                return True\n    return False",
    "            if os.path.exists(os.path.join(base, c)):\n                return True\n"
    "    # Not in VV yet: a K2 target for a TV-only module equals TV's path, so TV must hold it\n"
    "    for base in (os.path.join(TV_ROOT, '02__Src__AppModules'), TV_ROOT):\n"
    "        if os.path.exists(os.path.join(base, rel)):\n"
    "            NEW_AT_TV.append(rel)\n"
    "            return True\n"
    "    return False",
    'assemble fallback')
asm = once(asm, "print('paths checked', dict(checked))",
    "print('paths checked', dict(checked))\nprint('VV targets not yet in VV, found at TV\\'s path:', len(NEW_AT_TV)); [print('  N', n) for n in sorted(set(NEW_AT_TV))]",
    'assemble report')
save('r0_assemble.py', asm)

r = subprocess.run([sys.executable, os.path.join(HERE, 'r0_assemble.py')])
sys.exit(r.returncode)
