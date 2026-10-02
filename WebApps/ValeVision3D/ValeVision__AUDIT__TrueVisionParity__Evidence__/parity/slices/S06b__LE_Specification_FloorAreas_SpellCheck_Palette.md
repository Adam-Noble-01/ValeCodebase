# S06b - Specification and Margin Notes, Floor Areas, Spell Check, Colour Palette

Parity slice report, TrueVision 3D (TV, lead) -> ValeVision 3D (VV, target). Read-only analysis, 01-Oct-2026.

Path shorthand (as in the brief): `TV/` = `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode`,
`VV/` = `D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D`, `TVM/` and `VVM/` = their `02__Src__AppModules`, `LE/` =
`51__System__LayoutEditor/`, `NAAPPS/` = `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps`, `WCP/` =
`D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia`. Line numbers are 1-based and refer to the files as they stood on
01-Oct-2026 (TV HEAD b2aa9151, VV HEAD 7b4e593a). "TV vX" = a TrueVision DEVLOG version.

---------------------------------------------------------------------------------------------------------------------

## (a) Scope

### What was examined

| Area | TV files / lines | VV files / lines | Drift (drift_all.tsv) |
|---|---|---|---|
| `LE/50__Feature__Specification/` | 31 / 12,492 | 23 / 7,693 | 13 drifted, 10 "header-only", 8 tv-only (2,007 diff lines) |
| `LE/59__Feature__FloorAreas/` | 10 / 4,222 | 0 | all tv-only |
| `TVM/54__Feature__ColourPalette/` (top level) | 6 / 1,821 | 0 | tv-only top-level folder |
| `TVM/55__Feature__SpellCheck/` (top level) | 7 / 1,804 | 0 | tv-only top-level folder |
| `TV/50__TrueVision__UserConfig/TrueVision__UserSpellings__.json` | 1 / 404 | 0 | tv-only app-root folder |
| `NAAPPS/ProjectVision__TrueVisionUserConfig__Api__.py` | 1 / 418 | 0 | TV local-server blueprint |
| VV specification transport | (TV equivalents: `TVM/80__CloudflareIntegration/...ApiClient__.js`, `TVM/03__AppUtils/Na__AppUtils__LocalProjectMirror__.js`) | `VVM/03__AppUtils/Na__AppUtils__R2DrawingNotes__.js` (296), `WCP/CloudflareWorker/src/handlers/CloudflareHandler__DrawingNotes__.js` (164), `WCP/CloudflareWorker/src/index.js` (230), `WCP/server.py` drawing-notes route (782-819) | VV-only by design (DIV-4) |

Supporting files read (dependencies and wiring), all read-only: TV `LE/07__Core__SheetData/` `SheetRecords__NoteRegions__`,
`SheetRecords__LeaderlessNotes__`, `SheetModel__AreaGroups__`, `SheetModel__Sheets__`, `SheetRecords__`, `History__`,
`AutoSave__`; `LE/52__Feature__StatementWriter/01__Core__Data/Na__LayoutEditor__Statement__Lockstep__.js`;
`LE/57__Feature__ScrapbookParametric/...AreaSchedule__.js`; `LE/05__Core__ModeController/...ModeController__.js`;
`LE/40__Ui__Panels/` `Toolbar__`, `PanelHost__`, `Panel__Layers__`; `LE/15__Core__Markup/LeaderGeometry__`, `MarkupBridge__`,
`ShapeGeometry__`; `LE/35__System__DrawingTools/RectangleTool__`, `ShapeTool__`; `LE/30__System__SheetTools/*` (grep);
`LE/60__Feature__PdfExport/PdfExporter__`; `LE/03__Core__Config/` `AppConfig__.json`, `ConfigState__EditorSetup__`,
`Na__Hotkeys__DrawingTabs__.json`; `TVM/43__System__PlanAnnotations/Na__PlanAnnotations__Toolbar__.js`;
`NAAPPS/ProjectVision__LocalServer__Main__.py` (sibling-file route, backups, atomic write); the CSS indexes of both apps;
VV `LE/01__Core__Loader/Na__LayoutEditor__Loader__.js`; VV `56__Feature__ScrapbookCustom/...Transport__.js` (server-probe
precedent); `WCP/Server__ValeVisionScrapbook__Api__.py` (blueprint precedent); 13 TV tests; `TV/TrueVision__PLAN__FloorAreas__.md`;
`TV/TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md`; VV parity ledger; both DEVLOGs (TV v2.91, v2.104, v2.125,
v2.126, v2.133, v2.143, v2.144, v2.147, v2.148, v2.163; VV v2.43, v2.44, v2.56).

### Headline

- VV's specification (Project Specification tab, notes margin, bubbles) is a faithful port of TV **as it stood on
  17-20 Sep (TV v2.63-v2.70)**. Everything TV added from v2.91 on is missing: the specification **lockstep with its
  local file** (TV v2.163), **WriteLocalCopy / one write queue** (v2.144), **bubble note resolver + Locate** (v2.144),
  **Overspill Note Regions** (v2.143), **Leaderless Notes** (v2.147), and the whole of **Floor Areas** (v2.104, v2.125,
  v2.148), **Colour Palette** (v2.126, v2.133) and **Spell Check + user dictionary** (v2.144).
- Two of the gaps are **live data-safety faults in VV today**, not just missing features: (1) Sync writes the local
  `ValeVision__DrawingNotes__.json` without looking at it, and a browser draft is put back unasked over a newer file;
  (2) **Reload Local marks the file as the cloud copy**, so an agent's or hand edit loaded that way never reads as
  unsynced and never reaches R2 (TV fixed exactly this in Transport 1.3.0, v2.163).
- Folder and module names already line up: every shared spec file is at the identical path in both apps, every TV-only
  folder number in scope (top-level 54, 55; LE 59; LE 52/01__Core__Data) is **free in VV**, so no rename or renumber
  is needed - only creations. App-identity tokens (file names, console prefixes, dictionary keys) are the only naming
  seams.
- **No Cloudflare worker change and no wrangler deploy are needed** for this slice. VV needs Flask (`WCP/server.py`) work:
  a new user-config blueprint, and hardening of the existing drawing-notes route (Last-Modified, atomic write, backup).
- **Verifier (01-Oct-2026) - read section "Verification" at the end before scheduling.** Three planning facts were
  missing here: (1) Floor Areas cannot go "last": TV's SheetTools hub (`PointerPress__`, `PointerDrag__`, `Keyboard__`,
  `SheetTools__ContextMenu__`), `Measurements__` and `MarkupBridge__` statically import `59__Feature__FloorAreas`
  (`__Tool__`, `__Menu__`, `__Paint__`) and `50/NoteRegions__Tool__`, and S05a (WP-S05a-07/08) and S03b (WP-S03b-07)
  port those files whole - so the Floor Areas core modules and the Region tool module must land BEFORE them, as inert
  modules (S06b-V01, WP-S06b-07a/10a). (2) Much of this slice's hunk work is also owned, as whole-file ports, by other
  slices (S03b records/model/History/LeaderGeometry, S03a config, S05a hub/Grips/Measurements, S05b Rectangle/Shape tools,
  S06a Toolbar/PanelHost/AreaSchedule, S07b the Statement lockstep leaf, S08 SpecPdf/Share/PdfExporter) - one owner per
  file is needed (S06b-V02). (3) VV is served under Whitecardopedia's service worker (token `'2026-09-18-1'`), so every
  package that adds exports needs a token bump (S06b-V03).

---------------------------------------------------------------------------------------------------------------------

## (b) Narrative findings by sub-system

### B1. How each app stores, loads and saves the specification (SpecData Transport TV 1.3.0 vs VV 1.1.0)

**TrueVision (Transport 1.3.0 + Lockstep 1.0.0, TV v2.163):**
- File `TrueVision__DrawingNotes__.json` (config `LayoutEditor__Specification__FileName`); previous name
  `TrueVision__ProjectSpecification__.json` (`LegacyFileName`) is read only when the new key is absent.
- Location from `Na__CfApi__ProjectFileLocation(fileName)` (`TVM/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js:616-625`):
  R2 key `NaProjectPortal/{yy}-Projects/{folder}/30__TrueVision__AppContent/{file}`, CDN URL, and `repoUrl`
  `{origin}/na-project-portal/...` - the local copy served statically by the ProjectVision local server
  (`send_from_directory`, so it carries `Last-Modified`).
- **Load** (`EnsureLoaded`, Transport `:404-430`, once per project on first editor entry): on localhost the local file is
  read first through `Na__LeSpec__ReadLocalFile` (Lockstep `:350-356`, `no-store`, `Last-Modified` -> `modifiedIso`);
  `UsesWorker()` (CfApi configured AND (localhost OR DevGate authoring), `:254-256`) -> R2 through the worker's generic
  `/r2/read` with a timeout, legacy fallback, then `Reconcile(cloud, local)` (newer local adopted as `localAhead` with
  the cloud bookkeeping kept; newer cloud seeds the local file; same stamp different content -> local); worker failure ->
  local copy (localhost) or CDN, status `failed`. Public web -> CDN only. Then: `Adopt` (returns the seed write's
  promise) -> the seed is AWAITED -> `SettleFile` (record what the file holds; a local copy overwritten by a newer cloud
  seed is kept in `localStorage`) -> `RestoreDraftOrAsk` (a browser draft that differs from the file raises the
  question instead of being put back).
- **Saves** (four kinds): (1) browser draft (`DraftDebounceMs`), unchanged; (2) **autosave to the local file**
  `AutoSaveLocalMs` (4 s) after editing pauses - looks at the file first, inside the queue turn, writes nothing and
  asks if it moved, reads back to verify (Lockstep `SaveLocal :718-764`); (3) `WriteLocalCopy` (Enter in the drawing
  editor's own Specification tab row editor, 58__) = `SaveLocal({verify:true})`; (4) **Sync** (tab Sync, or Save Sheets
  when `dirty && canSync`, Transport `:605-682`): refuses while a question stands -> `LookBeforeWrite` (`:624`) ->
  reads cloud -> asks if the cloud stamp is not the base -> `FileCopy()` (stamped copy; live doc never stamped) ->
  `Na__CfApi__WriteProjectFile` (`:653`, R2 only) -> `MirrorLocal(out, { look : true })` (`:658`, local write in its own
  queue turn, held if the file moved during the R2 write).
- **Watch**: `StartWatch` when the editor opens (ModeController 1.31.0, non-viewer, localhost + editable +
  `LockstepEnabled`), every `LockstepPollMs` (3 s) while the tab is visible, plus window focus / visibilitychange;
  `StopWatch` on Leave; `ResetLockstep` on project change. Content decides (`LockJson` = content without note stamps;
  `FileKey` = file content normalised with the id floor held at 0, flagged `#ids-missing`), the clock only explains.
- **Answer**: `ResolveConflict('app' | 'file')` (Lockstep `:945-984`); the copy not kept goes to
  `localStorage['Na__LayoutEditor__SpecDiscarded__<code>']`. Reload Local / "Load the file" use `AdoptFile`, which leaves
  the cloud bookkeeping alone so a file that differs from R2 reads as unsynced.
- **Server**: `POST /api/projects/<code>/files/TrueVision__DrawingNotes__.json`
  (`NAAPPS/ProjectVision__LocalServer__Main__.py:754-798`): allowlisted file name, `_backup_before_overwrite` (TV v2.146),
  atomic write (`write_text_atomic`, TV v2.144).

**ValeVision (Transport 1.1.0 + `Na__AppUtils__R2DrawingNotes__` 1.0.0):**
- File `ValeVision__DrawingNotes__.json` beside `project.json`; R2 key `VaApps/Projects/{folderId}/ValeVision__DrawingNotes__.json`
  (`WCP/CloudflareWorker/src/handlers/CloudflareHandler__DrawingNotes__.js:73-75`).
- Cloud read `Na__R2Notes__ReadCloud` (`R2DrawingNotes:183-201`): worker `GET /api/editor/projects/{folderId}/drawing-notes`
  with `X-Editor-Api-Key` when Flask's `/api/editor-config` answers (localhost only), else the CDN
  `https://cdn.noble-architecture.com/VaApps/Projects/{folderId}/{file}`.
- Local read `Na__R2Notes__ReadLocal` (`:265-276`): Flask `GET /api/projects/{folderId}/drawing-notes`
  (`WCP/server.py:790-818`) - returns `jsonify(json.load(f))`, **no `Last-Modified`**.
- Load: same `Reconcile` code as TV (identical), but `Adopt` seeds the local file **fire-and-forget**
  (`void MirrorLocal`, Transport `:305`) and `EnsureLoaded` calls **`RestoreDraft()` unconditionally** (`:324`): a browser
  draft is put back with a toast even when the file on disk is newer.
- Sync (`:493-558`): reads cloud, asks if the stamp moved, stamps inline (same keys as TV `FileCopy`), then
  `Na__R2Notes__Write` (`:529`) = worker POST (which also bumps the build manifest, handler `:135`) **then Flask POST of
  the same object, without looking at the file** (`R2DrawingNotes:207-242`). An edit made on disk by an agent or by hand
  since load is overwritten.
- `ReloadFromLocal` (`:452-483`) calls `Adopt({ status:READY, data:local, source:'repository' })` (`:478`) which sets
  `BaseStamp` and `SyncedJson` FROM THE FILE, i.e. treats the file as the cloud copy -> `IsDirty()` false -> Save
  Sheets / Sync stay off -> the agent's edit never reaches R2. This is the exact fault TV v2.163 describes ("Reload Local
  marked the file it loaded as the cloud copy").
- No watch, no autosave to the file, no conflict question, no `WriteLocalCopy`, no `KeepDiscarded`.
- Flask write (`server.py:806-811`) is in place (`open(...,'w')`), **not atomic**, **no backup**.
- `CanReloadCloud` = project code in the URL (`:395`), not "worker configured" - a deliberate, documented VV divergence
  (its ReadCloud always has the CDN to fall back to). Keep.
- The Sync gate `if (!Na__AppUtils__GetProjectCodeFromUrl())` shows label `SpecSyncNoWorker` (`:500`), and the worker's
  `'Worker config unavailable'` error is mapped to the same toast (`:532`). Keep (VV seam).

**What the VV port must do (recipe; the full seam list is in section (c) row SPEC-06 and WP-S06b-01):**
1. Port the pure leaf `LE/52__Feature__StatementWriter/01__Core__Data/Na__LayoutEditor__Statement__Lockstep__.js` (TV 1.0.0,
   245 lines, no imports) verbatim at the SAME path (the VV Statement Writer port then lands beside it).
2. `Na__AppUtils__R2DrawingNotes__` 1.1.0: add `Na__R2Notes__WriteCloud(fileName, data)` = worker POST only (Sync must
   write R2 and then let the lockstep write the local copy in its own turn - calling the two-phase `Write` would bypass
   the look and re-open the overwrite hole); make `Na__R2Notes__ReadLocal` also return `lastModified` (the raw
   `Last-Modified` header, or `''`). Keep `Write`/`WriteLocal` for compatibility.
3. `SpecData__Lockstep__` (new, adapted): TV file with three seams - (a) `ReadLocalFile` delegates to
   `Na__R2Notes__ReadLocal(setup.fileName)` and maps to `{ ok, data, missing, modifiedIso : Na__LeStmtLock__FromHttpDate(lastModified), skipped, error }`
   (off localhost it still answers `skipped` itself); (b) `MirrorLocalNow` calls `Na__R2Notes__WriteLocal(doc)` instead
   of `Na__LocalMirror__WriteSiblingFile`; (c) the `Na__CfApi__ProjectFileLocation` null checks become "a project code
   in the URL" (`Na__AppUtils__GetProjectCodeFromUrl`). Paths `40__` -> `42__System__DrawingViewCore`; console prefix
   `[ValeVision3D]`.
4. `SpecData__Transport__` 1.3.0 (whole TV file, VV seams re-applied): R2Notes imports instead of CfApi/DevGate; no
   `UsesWorker`/`FetchJson`/legacy name; VV `Fetch` shape (ReadCloud does worker-or-CDN) but with `WithLocal(result,
   localCopy)` and the local read through the lockstep's `ReadLocalFile`; `Adopt` returns the seed promise;
   `EnsureLoaded`/`Retry`/`ReloadFromCloud`/`ReloadFromLocal` exactly TV's logic; `Sync` = TV's sequence with
   `Na__R2Notes__WriteCloud` + `MirrorLocal(out,{look:true})`, keeping VV's project-code gate and toast mapping;
   `CanReloadCloud` stays VV's.
5. State 1.2.0, Document 1.1.0 (minus `Na__CfApi__IsConfigured` in `canSync`), Draft 1.1.0, Editing 1.1.0, barrel 1.5.0.
6. Config: `LockstepEnabled` (true), `LockstepPollMs` (3000), `AutoSaveLocalMs` (4000), `LockstepNote` in
   `LayoutEditor__Specification__Config`; `GetSpecificationSetup` returns `lockstepEnabled`, `lockstepPollMs`,
   `autoSaveLocalMs` (TV `ConfigState__EditorSetup__.js:145-147`). Not `LegacyFileName` (TV-only history).
7. Flask (WP-S06b-02): GET sends `Last-Modified` (from `os.path.getmtime`) and `Cache-Control: no-store`; POST writes
   atomically (port TV's `write_text_atomic`); optional backup-before-overwrite (TV v2.146). Without `Last-Modified` the
   lockstep still works (it falls back to the file's own `UpdatedIso`); only the "when" and the Newer badge get coarser.
   *Verifier: prefer serving the file's bytes as stored (`send_from_directory`/`send_file`, conditional) over
   `jsonify(json.load(f))`. The bundled Flask is 3.0.0, whose `DefaultJSONProvider.sort_keys` is True and `server.py`
   does not override it, so today's GET re-serialises the notes with every object's keys sorted. Normalise rebuilds
   the schema keys in a fixed order, so the current files (no extra keys - checked on all four VV project notes files)
   compare correctly, but a group or note carrying two or more non-schema keys would read back in a different key order
   than the app wrote it, and the lockstep would ask about a file that did not move. `send_from_directory` also gives
   Last-Modified and ETag for free - it is what TV's lockstep reads (the static `repoUrl`). Backups-before-overwrite
   belong with S09's WP-S09-06 (VV `backups` routes).*

### B2. Lockstep question, bar status and wiring (TV v2.163)

- `SpecLockstep__.js` (TV-only, 365 lines, `Na__LeSpecLock`): the card over the whole editor host with two large answers
  ("Keep the app's copy" / "Load the specification file"), Newer badge + focus on the newer copy, a "What differs" line
  (codes only in one copy, notes worded/numbered differently, revision/number/groups). App-agnostic; labels are inline
  fallbacks (`SpecLock*`), no config labels needed. Imports `Na__LeStmtLock__When` from the Statement Writer leaf.
- `SpecEditor__Bar__` 1.3.0: status reads disk first ("Out of step with the file", "Saving...", "Unsaved changes",
  "Saved to file, not synced"), then the cloud states; hover title says when the file last changed; an alert while the
  question stands. Imports `Na__LeStmtLock__When`.
- `Styles__Specification__.css`: new region "The Lockstep Question" (`.na-le-spec-lock*`, z-index 50) and the
  `.na-le-spec__spacer` rule moved up (no visual change).
- ModeController 1.31.0 (TV `:557`, `:710`, `:768`): mount the card when editable; `StartWatch` on Enter for non-viewers;
  `StopWatch` on Leave. Toolbar 1.23.0 (TV `Toolbar__.js:402-404`): Save Sheets says "The specification was not synced:
  it and its file on disk are out of step - choose which copy to keep" when `spec.conflict`.

### B3. Specification editor, document, PDF (mostly at parity)

- The seven SpecEditor units are **code-identical** (verified with `git diff --no-index -w`, only comments/headers differ;
  `SpecEditor__Notes__` differs in one comment). No action.
- `SpecDocument__` (both 1.0.0): VV takes the project name from the folder id (`Na__AppUtils__NormalizeProjectFolderId`)
  and shows the Vale logo; TV reads `window.TrueVision__Pwa__ProjectContext`. **Permanent divergence** (VV has no PWA
  context). Keep.
- `SpecPdf__` (both 1.0.0): VV sets pages in Helvetica (no `PdfFonts__`); TV embeds Open Sans
  (`Na__LePdfFonts__EnsureLoaded/Install`). Also TV now awaits `doc.save(filename, { returnPromise : true })` (TV
  `:423`, no DEVLOG entry). Keep the font divergence until `60__Feature__PdfExport/Na__LayoutEditor__PdfFonts__.js` is
  ported (another slice), then take TV's file whole; adopt the `returnPromise` line now (harmless).
- `SpecEditor__Bar__` 1.4.0 (TV v2.166): a **Share** button in the Read view (`Na__LeShareUi__Open`, from
  `66__Feature__DocumentSharing`, TV-only). Depends on the document-sharing port.

### B4. Specification links and the bubble's note (TV v2.144)

- `SpecLinks__` 1.1.0 (18-Sep) registers a broken-link resolver (`Na__LeLeadGeo__SetBrokenResolver`); 1.2.0 registers
  `Na__LeSpecLink__NoteOf` as the note resolver (`SetNoteResolver`) answering `{ noteId, code, title, linked, locate }`;
  `locate()` raises `Na__LeSpec__LOCATE_EVENT` (State 1.1.0).
- VV's `LE/15__Core__Markup/Na__LayoutEditor__LeaderGeometry__.js` is **1.0.0** (it has `SetCodeResolver` code but neither
  `SetBrokenResolver`/`IsBroken` (TV 1.2.0) nor `SetNoteResolver`/`NoteFor` (TV 1.3.0)). SpecLinks 1.2.0 cannot link in VV
  until LeaderGeometry is brought to 1.3.0 (markup slice).
  *Verifier: the markup slice owns it - S03b row "LeaderGeometry 1.3.0 port_verbatim" in WP-S03b-06. The red halo
  round a broken bubble also needs MarkupBridge 1.13.0's options pass-through (TV `MarkupBridge__.js:103-108`, `:846`)
  and SheetSurface's `{ showBrokenHalos : true }` opt-in (TV `SheetSurface__.js:880`); both arrive with WP-S03b-07.
  Without them `IsBroken` answers correctly but no halo is drawn (VV has no `showBrokenHalos` anywhere today).*
- Consumers of the resolver, all outside this folder: `30__System__SheetTools/...SheetTools__NoteTooltip__.js` (TV-only,
  hover label "EW01 Loggia Arcade"), `SheetTools__ContextMenu__` 1.6.0 ("Show in Specification"), and
  `58__Feature__ScrapbookSpecification/...Panel__ScrapbookSpecification__` (answers LOCATE with a pulsing halo). Ported by
  their own slices; until then LOCATE has no listener, which is harmless.

### B5. The notes margin (SpecMargin, Column, MarginGrip, panel, record)

- `SpecMargin__` 1.3.0 -> 1.5.0: 1.4.0 (TV v2.143) plans margin + regions together (`PlanAll`), `Push` draws regions
  after the margin, `Report` gains `regionsOn, inRegions, marginOverflow, marginLost, unlisted, regions[]` and
  `overflow` now counts notes that fit NOWHERE; the column itself moved verbatim to `SpecMargin__Column__` (`Wrap`,
  `Lay`; headings too wide now wrap). 1.5.0 (TV v2.147) lists leaderless groups first (`Entries`), counts `leaderless`,
  reports `leaderlessOn`. Every consumer draws through `Na__LeMargin__Push`, so VV's MarkupBridge (`:697`), PDF, web
  viewer and scrapbook previews get regions for free once SpecMargin lands.
- `MarginGrip__` 1.0.0 -> 1.3.0: 1.1.0 stays up under an automatic Move (`Na__LeTools__IsMoveAuto`, TV v2.78); 1.2.0
  re-plans on `Na__LeSurface__ZOOM_SETTLED_EVENT` (TV v2.111) not every zoom frame; 1.3.0 badge counts `marginLost`.
  VV has **neither** `ZOOM_SETTLED_EVENT` (SheetSurface VV 1.6.0 vs TV 1.13.0) nor `IsMoveAuto` (SheetTools). Port whole
  once those land; interim: take 1.3.0's `marginLost` change only.
- `Panel__MarginNotes__` 1.0.0 -> 1.2.0: settings split into `column` (Width, Heading - margin on) and `list` (Text mm,
  List general notes, Group headings - margin OR regions on); status line counts regions, not-listed, lost,
  leaderless; builds/refreshes/registers the Leaderless and Regions sub-panels.
- **The record (critical ordering point):** VV `SheetRecords__.js:585-603` `NormaliseMarginNotes` **rebuilds**
  `Sheet__MarginNotes` from six known keys, so any `RegionsOn`, `Regions`, `LeaderlessOn`, `LeaderlessGroups` written
  by a newly ported panel would be **silently dropped on the next normalise** (load, update, paste). TV
  `SheetRecords__.js:1291-1292` calls `Na__LeRec__NormaliseNoteRegions(raw, out)` and
  `Na__LeRec__NormaliseLeaderlessNotes(raw, out)` from two new leaves. The records work must land before (or in the same
  change as) any UI that writes those keys.
- `SheetModel__Sheets__` (VV 1.1.0, `:340-353`) needs TV 1.3.0/1.4.0's `UpdateMarginNotes` patch keys
  (`regionsOn`, `leaderlessOn`, `leaderlessGroup {id,on}`, `leaderlessMove {id,index}`) and `AddNoteRegion`,
  `UpdateNoteRegion` (silent while a grip drags), `DeleteNoteRegion` (TV `:531-600`); the SheetModel barrel re-exports.
- **Undo**: every margin/region/leaderless change is one `'margin'` announcement. VV `History__.js:140`
  `STEP_REASONS` omits `'margin'` (and `'areas'`); TV `History__.js:129` has both. The VV ledger
  (`ValeVision__PARITY__TrueVisionLedger__.md:219`) left `'margin'` **open, pending a decision**. Without it, a region
  drag or a leaderless re-order is not undoable in VV and the next step swallows it.
  *Verifier: this is already live in VV today - VV `SheetModel__Sheets__.js:351` announces `'margin'` for every
  width/heading/text change and History ignores it. VV History is 1.4.0, not 1.3.0: its log has two 20-Sep entries and
  the top one is mislabelled 1.3.0. The same decision is D-S03b-06, and S03b's WP-S03b-01 (bridge) and WP-S03b-04
  (History 1.7.0 whole) both edit this array - one owner.*
- `PdfExporter__` toast: VV `:311-312` requires `margin.on && margin.overflow > 0`; TV counts `overflow` (fits nowhere)
  whatever the margin switch, with label `PdfMarginOverflow` reworded ("...enlarge a note region...").
- Toolbar: TV removed the toolbar **Notes** toggle in Toolbar 1.17.0 (21-Sep, "Show notes margin in the Margin Notes
  panel is the only way to switch it now"); VV still has it (`Toolbar__.js:292`, labels `MarginToggle`,
  `MarginToggleTitle`, and the MarginNotes Description mentions "the Notes button on the toolbar").

### B6. Overspill Note Regions (TV v2.143) - all TV-only in VV

- New TV files: `SheetRecords__NoteRegions__` (07, leaf, record/defaults/repairs/readers), `SpecMargin__Column__`,
  `NoteRegions__` (Place/Push), `NoteRegions__Tool__` (the Region tool = Rectangle tool with a `land` hook),
  `NoteRegions__Grips__` (sides, corners, tab, badge), `Panel__MarginNotes__Regions__` (switch, folds, Add/Redraw/Delete).
- Dependencies outside the slice (all TV-only or ahead of VV): `RectangleTool__` 1.4.0 `land` hook (VV 1.2.0;
  1.3.0 also carries the floor-area `area`/`layerId`); SheetTools `TOOL_REGION` ('note-region') in `SheetTools__State__`
  1.8.0 and the dispatch sites in `SheetTools__` 1.37.0, `PointerPress__` 1.7.0, `PointerDrag__` 1.17.0, `Keyboard__`
  1.14.0, `Measurements__` 1.10.0 (`TOOL_REGION` measures as the Rectangle tool); `28__System__ObjectSnap/...Search__.js`
  (`Na__LeOsnap__Snap/Find/ShowMarker/HideMarker/KIND_GRID`) and `...Sources__` 1.1.0 (RegionBoxes);
  `27__System__DrawingGrid/...State__.js` (`IsSnapping`, `Nearest`); `32__System__OrthoMode/...State__.js` (`Resolve`);
  SheetSurface `ZOOM_SETTLED_EVENT`; SheetTools `IsMoveAuto`; ModeController 1.29.0 (grips attach/detach beside the
  margin grip, never for a viewer).
- VV note: VV's own `30__System__SheetTools/Na__LayoutEditor__Snapping__.js` already uses the `Na__LeOsnap` namespace but
  has no `KIND_GRID`, no Perpendicular and no region sources; adapting the grips onto it would create a VV-only fork.
  Recommendation: port the grips after the ObjectSnap/DrawingGrid/OrthoMode slices land (the planner should order it so).
- *Verifier - the dependency also runs the other way.* TV `SheetTools__PointerPress__.js:197`, `__PointerDrag__.js:337`,
  `__Keyboard__.js:248` and `Measurements__.js:189` statically import `NoteRegions__Tool__.js`. S05a ports those files
  whole (WP-S05a-07 Measurements, WP-S05a-08 hub, both listing "NoteRegions `__Tool__`" as a dependency), so the Region
  tool module must exist in VV BEFORE them; the TOOL_REGION dispatch then arrives with the hub, not as S06b hunks.
  `ObjectSnap__Sources__` RegionBoxes reads `Sheet__MarginNotes.Regions` directly (no import) and lands verbatim with
  S04b's ObjectSnap folder; `RectangleTool__` 1.4.0 (`land`) lands verbatim in WP-S05b-07. See WP-S06b-07a/07b.
- Config: MarginNotes gains `RegionMinSizeMm 15`, `RegionPaddingMm 3`, `RegionOverspillTitle "NOTES (CONTINUED)"`,
  `RegionGroupsTitle "NOTES"`, `RegionBordersDefault true`, `RegionGripPx 10`, `RegionsNote`; `GetMarginNotesSetup`
  reads them (TV `ConfigState__EditorSetup__.js:259-264`). Labels: 39 `Region*` keys and 4 `Margin*` status keys.
- CSS: `Styles__Specification__Notes__.css` regions "Overspill Note Regions in the Margin Notes Panel" and "Overspill
  Note Regions on the Paper".

### B7. Leaderless Notes (TV v2.147) - all TV-only in VV

- New TV files: `SheetRecords__LeaderlessNotes__` (07, leaf with no imports) and `Panel__MarginNotes__Leaderless__`
  (switch, drag stack with the Layers grip, arrow keys, other groups). Record keys `LeaderlessOn` (stored only true),
  `LeaderlessGroups` (ids in print order, kept when the spec lacks them). `SpecMargin__` 1.5.0 lists them first.
- Labels: 11 `Leaderless*` + `MarginStatusLeaderless`; config `LeaderlessNote`; CSS region "Leaderless Notes in the
  Margin Notes Panel". Depends on the same record/model/History work as B6 (but not on the snapping systems).

### B8. Floor Areas (TV v2.104, v2.106 paint order, v2.125 label drag, v2.148 project schedule) - all TV-only

- 10 files in `LE/59__Feature__FloorAreas/` (versions: `FloorAreas__` 1.2.2, `Geometry__` 1.1.0, `LabelGrip__` 1.0.0,
  `Menu__` 1.1.1, `Paint__` 1.1.0, `Table__` 1.1.0, `Tool__` 1.0.0, `Panel__FloorAreas__` 1.2.1, `Config.json` meta
  1.0.0, `Styles__FloorAreas__.css`), plus `07/SheetModel__AreaGroups__` 1.0.0 and `57/...ScrapbookParametric__AreaSchedule__` 1.1.0
  (pure type, no imports; registered by `Panel__ScrapbookParametric__` with 64 `AreaSchedule__*` config keys).
- Design (TV `TrueVision__PLAN__FloorAreas__.md` sections 2-6): an area is an ordinary vector carrying `Shape__Area`
  on a layer of `Layer__Type: 'area'`; area/perimeter/scale are never stored (solved from points and the drawing
  scale); groups keyed by NAME in `Sheet__AreaGroups`; label at box middle (visual centre fallback); schedules are a
  parametric type fed by a before-announce hook.
- Shared code it touches (TV plan section 6, all VV files behind): `SheetRecords__` (`'area'` in `LAYER_TYPES` - VV
  `:213` lacks it; `NormaliseShapeArea`, `NormaliseAreaGroups`, a default Floor Areas layer), `SheetModel__Shapes__`
  (area patch key; `CreateShape` honours `area`/`layerId`), `SheetModel__Layers__` (TV 1.4.0 vs VV 1.0.0:
  `LayerIndexAboveDrawings`, `DeleteLayer` re-homes shapes), `History__` (`'areas'`), `ModeController__` (panel
  registered LAST after Patterns, `Na__LeArea__Ready`, `Na__LeAreaTable__Attach`, `'areas'` -> markup redraw and the
  `floor-areas` panel, an area selection opens the section), `MarkupBridge__` (`Na__LeAreaPaint__Push` in the shapes
  pass), `ShapeGeometry__` (hit inside an area), `SelectionBox__` (`area : true` parts), `ItemClipboard__` (paste keeps
  an area on an area layer), `56/ScrapbookCustom__` (`PortableRecord` strips `Area__Group` and
  `Area__ScaleDenominator`, TV `:426-428`), `SheetTools__State/ToolState/PointerPress/PointerDrag/Keyboard/ContextMenu`
  (`TOOL_AREA`, six dispatch sites, Delete keeps 3 vertices, right-click/double-click finish closed),
  `Measurements__`, `Toolbar__` (Floor Area button, TV `:448`), `Panel__Layers__` (`area : 'Floor Areas'`),
  `RectangleTool__` 1.3.0 / `ShapeTool__` 1.7.0 (`area`, `layerId` defaults), `30/Grips__` (`RegisterShapeProvider`, used
  by `LabelGrip__`), `20/ViewportRotation__` (`Na__LeVpRot__Contains`, TV-only), `32/OrthoMode__State__` (TV-only),
  config (`AccordionSections` + `'floor-areas'`, labels `FloorAreasTitle`, `LayerTypeArea`, `ToolFloorArea`,
  `ToolFloorAreaTitle`), and the A key (`Tool__FloorArea`, TV `Na__Hotkeys__DrawingTabs__.json:557-568`; VV still keeps
  its bindings in `Na__LayoutEditor__KeyMappings__.json`, where A is free).
- Paint order: TV v2.106 (`15/Na__LayoutEditor__PaintOrder__.js`, TV-only) made the Layers list the real back-to-front
  order so a Floor Areas layer can sit under a plan's linework; without it VV would paint every room tint over every
  viewport. The Floor Areas visual result depends on that port.
- Publishing: `65/Na__LayoutEditor__Publish__Sheet__.js` imports `Na__LeArea__Is/Value/NameOf/FormatArea` - when the
  publishing slice ports, it needs Floor Areas first (or a guard).
- *Verifier - more importers than Publishing, and they decide the order.* TV `MarkupBridge__.js:233` imports
  `FloorAreas__Paint__`; `Measurements__.js:188`, `SheetTools__PointerPress__.js:196`, `__PointerDrag__.js:336`,
  `__Keyboard__.js:247` import `FloorAreas__Tool__`; `SheetTools__ContextMenu__.js:201-202` imports `__Tool__` and
  `__Menu__`; `ModeController__.js:292-294` imports the panel, `FloorAreas__` and `__Table__`. S03b ports MarkupBridge whole
  in WP-S03b-07 (dependency "59/FloorAreas__Paint (or D-S03b-04 stub)") and S05a ports the hub and Measurements whole
  (WP-S05a-07/08, dependency "FloorAreas `__Tool__`"). So the five core modules (`__Geometry__`, `FloorAreas__`, `__Tool__`,
  `__Menu__`, `__Paint__`) must land first, inert (none has import-time side effects), while this slice's own plan put
  Floor Areas last and made it depend on those very ports - a cycle. Their link-time needs in VV (checked name by name):
  `Na__LeModel__LayerIndexAboveDrawings` (Layers 1.2.0+), `AnnounceAreas`, `GetAreaGroups`, `AddAreaGroup`,
  `AreaGroupKey` (new `SheetModel__AreaGroups__`, which needs `Na__LeRec__NormaliseAreaGroups`) and
  `20/ViewportRotation__` (WP-S04a-01 / WP-S04b-01). Split into WP-S06b-10a (core, early) and WP-S06b-10b (activation, after
  the hubs). D-S06b-01 and D-S03b-04 are the same question.
- Sign-off: TV `TrueVision__PLAN__FloorAreas__.md:268,330` "Phase 9 (ValeVision) stays open until Adam has used this in
  TrueVision and said it works"; every FloorAreas header says "not yet ported - the whole system goes across together".
  Decision D-S06b-01.
- The panel links its own stylesheet at registration (`Panel__FloorAreas__.js:730-734`), so VV's loader
  `Na__LeLoad__STYLESHEETS` needs **no** entry for it.
- Content: config is app-neutral (suggestions Ground Floor, First Floor, Second Floor, Basement, Garage, Outbuilding;
  fill `#bcd9ee` at 0.3; m2 with ft2 offered). Only console prefixes name TrueVision.

### B9. Colour Palette (TV v2.126, v2.133) - top-level, TV-only

- `TVM/54__Feature__ColourPalette/`: `Na__ColourPalette__.js` (the one door, re-exports only), `...__Manager__.js` 1.1.0
  (reads the config; imports nothing), `...__Picker__.js` 1.1.0 (palette above a colour field + the browser mixer
  stacked on top, page-zoom aware; imports only the Manager), `...__Config__.json` 1.1.0, `...__Styles__.css`,
  `README__ColourPalette__.md`. Self-contained leaf feature; config fetched relative to `import.meta.url`.
- Who calls it (TV): `LE/40__Ui__Panels/Na__LayoutEditor__PanelHost__.js:674` (`if (type === 'color')
  Na__ColourPalette__Attach(input);` in `Na__LePanels__Input` - covers every panel colour field) and
  `TVM/43__System__PlanAnnotations/Na__PlanAnnotations__Toolbar__.js:253` (the dimension colour swatch). Stylesheet
  `@import` in `TV/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css:182`. In VV the same two sites exist:
  `VVM/51/40__Ui__Panels/Na__LayoutEditor__PanelHost__.js:626-634` (8 colour fields today: GradientTool 1, Dimensions 1,
  Leaders 3, Shapes 2, Text 1) and `VVM/44__System__PlanAnnotations/Na__PlanAnnotations__Toolbar__.js:255` (VV 1.0.0; TV
  1.1.0's only change is this attach plus folder-number paths).
- Branding: the palette is "Noble Architecture Standard" (`ColourPalette__Standard.Palette__MenuName`); groups
  `Monochrome` (the ten greys of the Edge Materials SSOT `MTE100__GreyscaleSeries__`) and `Dimensions` (Proposed
  `#960000`, Existing `#000096`, Special `#009600` after v2.133). The CSS uses the same literal panel colours VV's LE
  panels already use (`#172b3a`, `#1a7fc4`), so it reads as part of VV's editor unchanged.
- `Na__Test__ColourPalette__` checks the config against the SSOT file on this machine (same path for both apps), the
  placement maths, and a wiring rule: any source file making `<input type="color">` without `Na__ColourPalette__Attach`
  fails by name. In VV only `44/Na__PlanAnnotations__Toolbar__.js` makes its own colour input.
- *Verifier:* with one palette, `Palette__MenuName` is drawn as the palette's on-screen title (`Na__ColourPalette__Picker__.js:214`),
  so "Noble Architecture Standard" would show in VV - the rename in D-S06b-04 is required, not cosmetic. The test does not
  assert the name (it checks the key `ColourPalette__Standard`), so the rename keeps it portable. S10's D-S10-10 asks the
  same question ("(a) identical palette"); answer both together and do not let "identical" carry the NA name. Order
  WP-S06b-08 before WP-S06a-02 (PanelHost whole port): S06a otherwise leaves a TODO seam for the attach line.

### B10. Spell Check, the user dictionary and its route (TV v2.144) - top-level, TV-only

- `TVM/55__Feature__SpellCheck/`: `Na__SpellCheck__.js` (door), `...__Dictionary__.js` (config + dictionary load, word
  rule = the server's, Add/Remove queue; imports only `Na__AppUtils__IsRunningOnLocalhost`), `...__Field__.js` (the
  contenteditable box that wraps dictionary words in `spellcheck="false"` spans, own undo, plain-text paste),
  `...__WordBar__.js` (Add/Remove for the word at the caret), `...__Config__.json`, `...__Styles__.css`, README.
- App-specific seams (all in `Dictionary__` and `Config__.json`): `dictionaryFile`
  `50__TrueVision__UserConfig/TrueVision__UserSpellings__.json` (read from the app root as a static file everywhere);
  `apiPath` `/api/truevision/user-config/spellings` (localhost writes); `K_GROUPS` `TrueVision__UserSpellings__Groups`
  (`:101`); the server probe `GET /api/health` expecting `service: 'na-projectvision-local-dev'` (`:97`, `:353-361`) to
  tell "restart the server" from "no server". VV's Flask has **no `/api/health`**; the VV precedent
  (`VVM/51/56__Feature__ScrapbookCustom/...Transport__.js:84,139-147`) probes `/api/check-localhost` for
  `{ isLocalhost : true }`. Labels mention TrueVision (`AddWordTitle`, `Unreadable`, `Added`, `Removed`).
  *Verifier: the same TrueVision words are also hard-coded as inline fallbacks in `Na__SpellCheck__WordBar__.js:107,114,172-173`
  (AddWordTitle, RemoveTitle, Added, AlreadyThere, Removed), the Dictionary's own fallbacks and errors name "the
  ProjectVision local server" (`:449-451`, `:477-479`), and Field/WordBar/Dictionary carry `[TrueVision3D SpellCheck]`
  console prefixes - so WordBar and Field are string-adapted, not verbatim.*
- Consumers: only `58__Feature__ScrapbookSpecification/...RowEditor__.js` (the drawing editor's own Specification tab row
  editor, another slice) uses `Na__SpellCheck__Field/WordBar`; TV v2.144 notes "Only the row editor's boxes use the
  dictionary; the Project Specification tab's own editors are unchanged". Stylesheet `@import` in the CSS index
  (`:190`).
- Server: `NAAPPS/ProjectVision__TrueVisionUserConfig__Api__.py` (418 lines, Flask blueprint `truevision_user_config_api`):
  `GET/POST /api/truevision/user-config/spellings`, house-style writer (byte round-trip), atomic write
  (`write_text_atomic`, also used by the TV main server for every JSON), word validation (`WORD_PATTERN`,
  `MAX_WORD_LENGTH 60`), broken file reported as `unreadable` with line/column, `AddedInTheApp` group. VV needs the same
  as a WCP blueprint (`WCP/Server__ValeVisionUserConfig__Api__.py`, routes `/api/valevision/user-config/spellings`,
  folder `VV/50__ValeVision__UserConfig/`), registered in `WCP/server.py` beside the scrapbook blueprint
  (`server.py:91-97`) - the same pattern VV used for `Server__ValeVisionScrapbook__Api__.py` (ported from TV's scrapbook
  API, v2.69.0).
- Dictionary content: 339 entries in six groups (manufacturers 240, product names, stone/quarry, construction terms,
  abbreviations, the practice's software) + `AddedInTheApp`. Most is shared building vocabulary; the "practice's
  software" group and the `AddedInTheApp` title ("Added in TrueVision") are NA-specific. Decision D-S06b-03.

### B11. Tests (VV has none of the slice's tests)

| TV test | Lines | What it proves | VV port | Needs |
|---|---|---|---|---|
| `Na__Test__SpecLockstep__.test.mjs` | 374 | autosave, file-ahead held, answers, both moved, same words, file moved during Sync, load-time draft question, Reload Local unsynced, id-less note, off localhost | **port_adapted**: the world stubs become `Na__R2Notes__ReadCloud/WriteCloud/WriteLocal/ReadLocal` and `Na__AppUtils__GetProjectCodeFromUrl` instead of `Na__CfApi__*`/`Na__LocalMirror__WriteSiblingFile`; file name `ValeVision__DrawingNotes__.json` | WP-S06b-01 |
| `Na__Test__StatementLockstep__.test.mjs` | 158 | the pure four-state rules | port_verbatim | Statement leaf |
| `Na__Test__SpecInlineEdit__.test.mjs` | 294 | WriteLocalCopy, one undo step, queue order, row editor rules | port_adapted with 58 | 58 RowEditor slice + WP-01 |
| `Na__Test__BubbleNoteTooltip__.test.mjs` | 321 | resolver, hover label, Show in Specification | port with SheetTools NoteTooltip | WP-04 + SheetTools slice |
| `Na__Test__NoteRegions__.test.mjs` | 384 | record, model add/update/delete, placement rules, borders, titles | port_verbatim | WP-05/06 (+07 for nothing - it does not load the panels) |
| `Na__Test__LeaderlessNotes__.test.mjs` | 381 | record, patch keys, list order, regions claim | port_verbatim (the RB05 fixture check reads a TV project file - drop or point at a VV project) | WP-05/06 |
| `Na__Test__ObjectSnap__.test.mjs` 1.1.0 | - | 8 region-snap checks | with ObjectSnap port | WP-07 + 28 slice |
| `Na__Test__FloorAreas__.test.mjs` | 176 | pure geometry (copies the module) | port_verbatim | WP-10 (can run first) |
| `Na__Test__AreaSchedule__.test.mjs` | 277 | the parametric table | port_verbatim | WP-10 |
| `Na__Test__ColourPalette__.test.mjs` | 353 | config vs SSOT, placement, wiring rule, CSS index import | port_adapted (palette name; CSS index line) | WP-08 |
| `Na__Test__SpellCheckDictionary__.test.mjs` | 257 | word rule = server's, matching, Add/Remove, read-only states | port_adapted (`API_FILE` -> `WCP/Server__ValeVisionUserConfig__Api__.py`, apiPath) | WP-09 |
| `Na__Test__UserSpellingsApi__.test.py` | 243 | routes on a copy, refusals, BOM, atomic write, shipped file untouched | port_adapted (VV `Na__Test__ScrapbookApi__.test.py:52-61` pattern: `SERVER_DIR = ../../Whitecardopedia`) | WP-09 |
| `Na__Test__SpellCheckField__.html` | 196 | caret/undo/paste in Chromium | port_verbatim | WP-09 |
| `Na__Test__SpecificationPdf__.html` | 122 (VV 114) | spec PDF build | exists in VV; VV loads jsPDF from legacy `35__System__PageLayoutSystem/01__Dependencies__VersionLocked/jspdf.umd.js`, TV from `04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/` | align when 35 is retired (other slice) |
| `Na__Verify__Exports__.mjs`, `Na__Verify__ModuleGraph__.mjs` | - | names and graph | exist in VV; run after every WP | - |

### B12. Ledger and header state

- VV's parity ledger has no rows for any TV work from v2.91 on in this slice (last spec rows: v2.63 revision set,
  17-Sep; margin spacing v2.54 -> VV v2.44; read mode v2.51 -> VV v2.43; v2.78.1 read margins, 20-Sep). The `'margin'`
  step-reason row (`:219`) is open.
- TV headers are stale in the other direction (*verifier: 8 files, not 9 - the eight listed next; TV plan row U
  (`TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md:861`) is stale too, and that plan has no rows at all for the
  v2.104+ work of this slice - its last row is AP, v2.70*): TV spec files say "ValeVision: not yet ported" although VV ported
  them 14-15 Sep (`MarginGrip__:32`, `Panel__MarginNotes__:36`, `SpecData__:99`, `SpecDocument__:54`, `SpecEditor__:72`,
  `SpecLinks__:45`, `SpecMargin__:50`, `Styles__Specification__.css:6`; `SpecEditor__Notes__:36` and `SpecPdf__:44` still
  say "Back-port: offer to ValeVision3D" though VV has both). TV realign plan rows AJ and AM
  (`TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md:921,933`) still say "ValeVision port - pending" though VV
  shipped them as v2.43.0 and v2.44.0. Row U's base port itself (SpecData, SpecLinks, SpecEditor, SpecMargin 1.0.0,
  MarginGrip, Panel__MarginNotes, R2DrawingNotes) landed in VV checkpoint commit 66937440 on 14-Sep **with no DEVLOG
  entry of its own** (`VV/ValeVision__DEVLOG__.md:2608-2610`) and no ledger section - the VV ledger has never recorded
  the specification's base parity state.
- The shared drift table classifies `SpecData__Editing__.js` and `SpecData__Draft__.js` as **header-only**, but both
  carry real code changes beyond line 120 (Editing: `Na__LeSpec__AfterEdit()` calls in `Changed` and `ApplySnapshot`;
  Draft: `ReadDraft`/`WriteDraft` exported). A swarm agent trusting "header-only" would skip a required change.
- TV CSS says the Lockstep Question is "(v2.162.0)" (`Styles__Specification__.css` header) while the DEVLOG entry is
  v2.163.0 - cosmetic.

---------------------------------------------------------------------------------------------------------------------

## (c) Module-by-module table

State: `drifted` = shared path, VV behind; `tv-only` = missing in VV; `same` = code identical (comments only).
Action vocabulary as in the brief. "LE" paths are under `02__Src__AppModules/51__System__LayoutEditor/`.

### C1. `LE/50__Feature__Specification/`

| # | TV path | TV ver | VV path | VV ver | State | What VV lacks / does differently (TV DEVLOG) | Action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|---|---|---|
| SPEC-01 | `Na__LayoutEditor__SpecData__State__.js` | 1.2.0 | same | 1.0.0 | drifted (56) | `LOCATE_EVENT` (1.1.0, v2.144); `FileJson, FileIso, LiveIso, Conflict, LocalSaving` + setters, `DISCARDED_PREFIX` (1.2.0, v2.163) | port_verbatim | `DESCRIPTION` keeps "ValeVision drawings"; header | - |
| SPEC-02 | `...SpecData__Document__.js` | 1.1.0 | same | 1.0.0 | drifted (119) | `LockJson`, `LockstepOn`, `GetState` lockstep fields, `canSync` off while conflict (v2.163) | port_adapted | no CfApi import: `canSync = loaded && Editable && !Syncing && !conflict`; keep `IsRunningOnLocalhost` import | SPEC-01 |
| SPEC-03 | `...SpecData__Draft__.js` | 1.1.0 | same | 1.0.0 | drifted (drift table says header-only - wrong) | exports `ReadDraft`, `WriteDraft` (v2.163) | port_verbatim | `42__` path, console prefix | SPEC-01/02 |
| SPEC-04 | `...SpecData__Editing__.js` | 1.1.0 | same | 1.0.0 | drifted (drift table says header-only - wrong) | `AfterEdit()` after every change and every undo/redo (v2.163) | port_verbatim | - | SPEC-05 |
| SPEC-05 | `...SpecData__Lockstep__.js` | 1.0.0 | - | - | tv-only (1,045) | the lockstep: queue, file read with date, stamped `FileCopy`, `MirrorLocal`, look/verdict, question, `SaveLocal`, `WriteLocalCopy`, autosave, watch, `ResolveConflict` (v2.144 parts, v2.163) | port_adapted | `ReadLocalFile` -> `Na__R2Notes__ReadLocal` (+`lastModified` -> `FromHttpDate`); `MirrorLocalNow` -> `Na__R2Notes__WriteLocal`; project-location checks -> project code in URL; `42__`; `[ValeVision3D]` | STMT-01, R2N-01, SPEC-01..03 |
| SPEC-06 | `...SpecData__Transport__.js` | 1.3.0 | same | 1.1.0 | drifted (394) | 1.2.0 `InTurn`, `FileCopy`, `WriteLocalCopy` (v2.144); 1.3.0 lockstep load/settle/ask, Sync look-before-write and look-in-turn, Reload Local keeps the cloud bookkeeping (fault fix), reloads keep what they replace (v2.163) | port_whole_reapply_vv | VV seams: R2Notes instead of CfApi/DevGate; no `UsesWorker`/`FetchJson`/legacy name; `CanReloadCloud` = project code; Sync gate + `'Worker config unavailable'` toast; Sync writes via new `Na__R2Notes__WriteCloud` then `MirrorLocal(out,{look:true})` | SPEC-05, R2N-01 |
| SPEC-07 | `Na__LayoutEditor__SpecData__.js` | 1.5.0 | same | 1.3.0 | drifted (98) | re-exports `LOCATE_EVENT`, `WriteLocalCopy` (1.4.0); Lockstep API, `LockstepOn` (1.5.0); `Initialize` -> `ListenForLockstep`; project change -> `ResetLockstep` | port_verbatim | header names VV files; `42__` path | SPEC-01..06 |
| SPEC-08 | `Na__LayoutEditor__SpecLockstep__.js` | 1.0.0 | - | - | tv-only (365) | the out-of-step question card (v2.163) | port_verbatim | header only | SPEC-07, STMT-01, CSS-01 |
| SPEC-09 | `Na__LayoutEditor__SpecEditor__Bar__.js` | 1.4.0 | same | 1.2.0 | drifted (73) | 1.3.0 disk-first status, file hover, out-of-step alert (v2.163); 1.4.0 Share in Read (v2.166) | port_adapted (staged) | `42__` path; take 1.3.0 now; Share when `66__Feature__DocumentSharing` exists | SPEC-07, STMT-01; 66 slice for 1.4.0 |
| SPEC-10 | `SpecEditor__.js`, `__Actions__`, `__Builders__`, `__NoteDrag__`, `__Notes__`, `__Render__`, `__State__` | 1.2.0 / 1.1.0 / 1.0.0 / 1.0.0 / 1.1.0 / 1.0.0 / 1.0.0 | same | same | same (header/comment only, verified) | nothing | no_action | refresh headers only if desired | - |
| SPEC-11 | `Na__LayoutEditor__SpecLinks__.js` | 1.2.0 | same | 1.0.0 | drifted (49) | 1.1.0 broken-link resolver (18-Sep); 1.2.0 `NoteOf` note resolver + `locate()` (v2.144) | port_verbatim | - | LeaderGeometry 1.3.0 (markup slice), SPEC-01 |
| SPEC-12 | `Na__LayoutEditor__SpecMargin__.js` | 1.5.0 | same | 1.3.0 | drifted (404) | 1.4.0 regions, `PlanAll`, Report fields (v2.143); 1.5.0 leaderless first (v2.147) | port_verbatim | - | SPEC-13, SPEC-14, REC-01, REC-02 |
| SPEC-13 | `Na__LayoutEditor__SpecMargin__Column__.js` | 1.0.0 | - | - | tv-only (303) | the column (`Wrap`, `Lay`, heading wrap) | port_verbatim | header | ConfigState, `Na__LeChrome__MeasureTextMm` (exists in VV) |
| SPEC-14 | `Na__LayoutEditor__NoteRegions__.js` | 1.0.1 | - | - | tv-only (346) | `Place`, `Push`, `AutoTitle`, `Rect` | port_verbatim | header | SPEC-13, REC-01, `Na__LeLayout__ClampToPage` (exists in VV `SheetLayout__:197`) |
| SPEC-15 | `Na__LayoutEditor__NoteRegions__Tool__.js` | 1.0.0 | - | - | tv-only (268) | the Region tool through the Rectangle tool's `land` | port_verbatim | header | RectangleTool 1.4.0, MOD-01, SheetTools `TOOL_REGION` + dispatch, Measurements 1.10.0 |
| SPEC-16 | `Na__LayoutEditor__NoteRegions__Grips__.js` | 1.0.0 | - | - | tv-only (518) | sides/corners/tab/badge, snapping, Ortho/Shift | port_verbatim (after deps) | header | 28 ObjectSnap Search, 27 DrawingGrid State, 32 OrthoMode State, SheetSurface `ZOOM_SETTLED_EVENT`, SheetTools `IsMoveAuto`, SPEC-12, SPEC-15 |
| SPEC-17 | `Na__LayoutEditor__Panel__MarginNotes__.js` | 1.2.0 | same | 1.0.0 | drifted (92) | 1.1.0 settings split + regions status (v2.143); 1.2.0 leaderless (v2.147) | port_verbatim | - | SPEC-18, SPEC-19 |
| SPEC-18 | `Na__LayoutEditor__Panel__MarginNotes__Regions__.js` | 1.0.0 | - | - | tv-only (511) | the regions section | port_verbatim | header | SPEC-14..16, MOD-01, SheetTools `TOOL_REGION`, `SetTool` |
| SPEC-19 | `Na__LayoutEditor__Panel__MarginNotes__Leaderless__.js` | 1.0.0 | - | - | tv-only (510) | the leaderless stack | port_verbatim | header | REC-01, REC-02, MOD-01 |
| SPEC-20 | `Na__LayoutEditor__MarginGrip__.js` | 1.3.0 | same | 1.0.0 | drifted (35) | 1.1.0 `IsMoveAuto` (v2.78); 1.2.0 `ZOOM_SETTLED_EVENT` (v2.111); 1.3.0 badge = `marginLost` (v2.143) | port_verbatim (interim: 1.3.0 hunk only) | interim keep `ZOOM_EVENT`, no `IsMoveAuto` until SheetSurface/SheetTools land | SPEC-12; SheetSurface 1.13.0; SheetTools `IsMoveAuto` |
| SPEC-21 | `Na__LayoutEditor__SpecDocument__.js` | 1.0.0 | same | 1.0.0 | drifted (39, all VV adaptation) | none | keep_vv_divergence | project name from folder id, Vale logo, `42__` | - |
| SPEC-22 | `Na__LayoutEditor__SpecPdf__.js` | 1.0.0 | same | 1.0.0 | drifted (28) | embedded Open Sans (`PdfFonts__`); `await doc.save(.., {returnPromise:true})` | keep_vv_divergence (+ take the save line) | Helvetica until PdfFonts | 60 PdfFonts (another slice) |
| CSS-01 | `Na__LayoutEditor__Styles__Specification__.css` | - | same | - | drifted (189) | "The Lockstep Question" region (v2.163); spacer rule moved | port_verbatim | header comment says the loader links it (VV) | - |
| CSS-02 | `...Styles__Specification__Notes__.css` | - | same | - | drifted (+305/-4) | regions panel, leaderless, paper regions (v2.143, v2.147) | port_verbatim | header | - |
| CSS-03 | `...Styles__Specification__Read__.css` | - | same | - | same (comments only) | nothing | no_action | - | - |

### C2. Supporting units outside the folder that this slice needs

| # | TV path | TV ver | VV path | VV ver | State | What / why | Action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|---|---|---|
| STMT-01 | `LE/52__Feature__StatementWriter/01__Core__Data/Na__LayoutEditor__Statement__Lockstep__.js` | 1.0.0 | - | - | tv-only (245) | pure four-state rules, `Compare`, `NeedsChoice`, `Newer`, `FromHttpDate`, `When` - imported by SPEC-05, SPEC-08, SPEC-09 | port_verbatim - *verifier: S07b's WP-S07b-01 ports this same file and its test first; S06b depends on it, does not port it again* | header; create `LE/52__Feature__StatementWriter/01__Core__Data/` | WP-S07b-01 |
| REC-01 | `LE/07__Core__SheetData/Na__LayoutEditor__SheetRecords__NoteRegions__.js` | 1.0.0 | - | - | tv-only (308) | region record leaf | port_verbatim | header | ConfigState margin setup (CFG-02) |
| REC-02 | `LE/07__Core__SheetData/Na__LayoutEditor__SheetRecords__LeaderlessNotes__.js` | 1.0.0 | - | - | tv-only (178) | leaderless record leaf | port_verbatim | header | - |
| REC-03 | `LE/07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js` | 1.39.0 | same | 1.15.0 | drifted (1,229) | `NormaliseMarginNotes` keeps regions + leaderless (1.36.0/1.37.0); `'area'` layer type, `NormaliseShapeArea`, `NormaliseAreaGroups`, Floor Areas default layer (1.2x, v2.104) | update_wiring (hunks only; whole file belongs to the SheetData slice) | - | REC-01, REC-02 |
| MOD-01 | `LE/07__Core__SheetData/Na__LayoutEditor__SheetModel__Sheets__.js` (+ barrel `SheetModel__.js`) | 1.4.0 | same | 1.1.0 | drifted (435) | `UpdateMarginNotes` patch keys; `Add/Update/DeleteNoteRegion` (1.3.0, 1.4.0) | update_wiring (hunks) | - | REC-01..03 |
| MOD-02 | `LE/07__Core__SheetData/Na__LayoutEditor__SheetModel__AreaGroups__.js` | 1.0.0 | - | - | tv-only (292) | group list CRUD announced `'areas'` | port_verbatim | header | REC-03 |
| HIST-01 | `LE/07__Core__SheetData/Na__LayoutEditor__History__.js` | 1.7.0 | same | 1.4.0 (verifier: log top mislabelled 1.3.0) | drifted (112) | `'margin'` and `'areas'` in `STEP_REASONS` (TV `:129`; VV `:140`) | update_wiring (one array) - *verifier: also WP-S03b-01/04; one owner* | - | D-S06b-02 = D-S03b-06 |
| CFG-01 | `LE/03__Core__Config/Na__LayoutEditor__ConfigState__EditorSetup__.js` | 1.6.0 | same | 1.0.0 | drifted (285) | `GetSpecificationSetup` lockstep keys (1.6.0); `GetMarginNotesSetup` region keys (1.4.0) | update_wiring (hunks) | VV `fileName` fallback `ValeVision__DrawingNotes__.json`, no `legacyFileName` | - |
| CFG-02 | `LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json` | - | same | - | drifted (2,083) | Specification: `LockstepEnabled`, `LockstepPollMs`, `AutoSaveLocalMs`, `LockstepNote`; MarginNotes: 6 `Region*` + `RegionsNote`, `LeaderlessNote`, Description; Leader: `NoteTooltip*` (v2.144); Labels: 39 `Region*`, 11 `Leaderless*`, 5 `Margin*`, `MenuShowInSpecification`, `LeaderNoteUntitled`, `PdfMarginOverflow` (reworded), 4 floor-area labels; Panels `AccordionSections` + `'floor-areas'` | update_wiring | VV wording keeps `project.json`; drop `MarginToggle*` with WP-11 | - |
| R2N-01 | (TV: `80__CloudflareIntegration/...ApiClient__.js` + `03__AppUtils/Na__AppUtils__LocalProjectMirror__.js`) | - | `VVM/03__AppUtils/Na__AppUtils__R2DrawingNotes__.js` | 1.0.0 | vv-only | needs cloud-only write and `Last-Modified` on local read for the lockstep | build_vv_transport | add `Na__R2Notes__WriteCloud`; `ReadLocal` returns `lastModified`; keep `Write`/`WriteLocal`; fix header NAMESPACE (`Na__AppUtils` vs `Na__R2Notes`) | - |
| SRV-01 | `NAAPPS/ProjectVision__LocalServer__Main__.py:754-798` (sibling route: backup + atomic) | - | `WCP/server.py:782-819` (`drawing_notes`) | - | vv-only route | no `Last-Modified`, in-place write, no backup | build_vv_transport | GET: `Last-Modified` + `Cache-Control: no-store`; POST: atomic (`write_text_atomic` from SRV-02's module, as TV imports it); optional backup (coordinate with persistence slice) | SRV-02 (for the helper) |
| WRK-01 | (TV generic `/r2/read`, `/r2/write`) | - | `WCP/CloudflareWorker/src/handlers/CloudflareHandler__DrawingNotes__.js`, `src/index.js:186-198` | 1.0.0 / 1.5.0 | vv-only (DIV-4) | sufficient as is | keep_vv_divergence / no_action | none - no deploy needed | - |
| LDR-01 | `LE/15__Core__Markup/Na__LayoutEditor__LeaderGeometry__.js` | 1.3.0 | same | 1.0.0 | drifted (153) | `SetBrokenResolver`/`IsBroken` (1.2.0), `SetNoteResolver`/`NoteFor` (1.3.0) | port_verbatim - *verifier: owned by WP-S03b-06; the halo also needs WP-S03b-07 (MarkupBridge 1.13.0 options, SheetSurface opt-in)* | - | WP-S03b-06 |
| TBR-01 | `LE/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js` | 1.24.0 | same | 1.9.0 | drifted (366) | 1.17.0 Notes toggle removed; 1.23.0 spec held toast; Floor Area button | update_wiring (hunks) | - | SPEC-07 |
| MC-01 | `LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js` | 1.32.0 | same | 1.18.0 | drifted (828) | 1.29.0 region grips; 1.31.0 lockstep watch + question mount; floor areas (register, Ready, Table attach, `'areas'`) | update_wiring (hunks; VV loader architecture kept) | VV `Enter`/`Leave`/`AttachSheetInput` sites (see d) | SPEC-07/08/16, FA-* |
| PDF-01 | `LE/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js` | 1.12.0 | same | 1.2.0 | drifted (364) | margin toast counts notes that fit nowhere (1.10.0) | update_wiring (one condition + label) - *verifier: S08's WP-S08-02 (interim 1.11.0) and WP-S08-14 (whole 1.12.0) carry this hunk; one owner* | - | SPEC-12 |
| RECT-01 | `LE/35__System__DrawingTools/Na__LayoutEditor__RectangleTool__.js` | 1.4.0 | same | 1.2.0 | drifted (66) | 1.3.0 `area`/`layerId` defaults (v2.104); 1.4.0 `land` hook (v2.143) | port_verbatim - *verifier: owned by WP-S05b-07 (verbatim body)* | - | WP-S05b-07 |

*Verifier - ownership of the rows above:* REC-01/REC-02 are also WP-S03b-02 ("Pure leaves", same acceptance); REC-03
is inside WP-S03b-03 (SheetRecords whole, incl. NormaliseMarginNotes, NormaliseAreaGroups, `'area'`); MOD-01 and HIST-01
are WP-S03b-04 (SheetModel__Sheets 1.4.0 + History 1.7.0 whole, atomic); MOD-02 is WP-S03b-03 per D-S03b-04; CFG-01
(`ConfigState__EditorSetup__` 1.6.0) and CFG-02 (AppConfig additive pass) are S03a's port_whole_reapply_vv rows. The
code is TV-identical either way, so an early S06b hunk is harmless in content - but the two must never run concurrently,
and the planner must pick one owner per file (S06b-V02, D-S06b-V02).

### C3. `LE/59__Feature__FloorAreas/` and the area schedule type (all tv-only)

| # | TV path | TV ver | Lines | Action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|
| FA-01 | `Na__LayoutEditor__FloorAreas__.js` (`Na__LeArea`) | 1.2.2 | 849 | port_verbatim | console prefix | MOD-02, REC-03, SheetModel__Shapes/Layers, DrawingScale, `20/ViewportRotation__` (`Na__LeVpRot__Contains`) |
| FA-02 | `Na__LayoutEditor__FloorAreas__Config__.json` | 1.0.0 | 158 | port_verbatim | none needed (decision D-S06b-11 optional) | - |
| FA-03 | `Na__LayoutEditor__FloorAreas__Geometry__.js` | 1.1.0 | 566 | port_verbatim | - | none (pure) |
| FA-04 | `Na__LayoutEditor__FloorAreas__LabelGrip__.js` | 1.0.0 | 315 | port_verbatim | - | `30/Grips__` `RegisterShapeProvider`, EditScope, SheetTools State/HitResolution, `32/OrthoMode__State__` |
| FA-05 | `Na__LayoutEditor__FloorAreas__Menu__.js` | 1.1.1 | 204 | port_verbatim | - | FA-01, SheetTools ContextMenu |
| FA-06 | `Na__LayoutEditor__FloorAreas__Paint__.js` | 1.1.0 | 231 | port_verbatim | - | FA-01, SheetChrome |
| FA-07 | `Na__LayoutEditor__FloorAreas__Table__.js` | 1.1.0 | 492 | port_verbatim | console prefix | FA-10, 57 engine (exists in VV), `55/Scrapbook__TileDrag__` `PlaceInView` (exists), `RegisterBeforeAnnounce` (exists) |
| FA-08 | `Na__LayoutEditor__FloorAreas__Tool__.js` | 1.0.0 | 309 | port_verbatim | - | ShapeTool 1.7.0+, RectangleTool 1.3.0+ |
| FA-09 | `Na__LayoutEditor__Panel__FloorAreas__.js` | 1.2.1 | 871 | port_verbatim | - | PanelHost (`SliderRow`, `ShowSlider`, `GetContext` exist), SheetTools `TOOL_AREA`, FA-04/07/08 |
| FA-10 | `LE/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__AreaSchedule__.js` | 1.1.0 | 668 | port_verbatim - *verifier: also S06a's WP-S06a-13 (same file, panel registration and config); one owner* | - | none (pure); registration in `Panel__ScrapbookParametric__` + config (*verifier: a 56-key `LayoutEditor__ScrapbookParametric__AreaSchedule` block (54 named `AreaSchedule__*`) plus 29 `Area*` labels and the element-list entries - not "64 keys"*) |
| FA-11 | `Na__LayoutEditor__Styles__FloorAreas__.css` | - | 227 | port_verbatim | - | self-linked by FA-09 (no loader entry) |

### C4. Top-level features and app-root content (all tv-only)

| # | TV path | TV ver | VV path (new) | Action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|
| PAL-01 | `TVM/54__Feature__ColourPalette/Na__ColourPalette__.js` | 1.0.0 | `VVM/54__Feature__ColourPalette/` same name | port_verbatim | header | - |
| PAL-02 | `.../Na__ColourPalette__Manager__.js` | 1.1.0 | same | port_adapted | console prefix `[ValeVision3D ColourPalette]` | - |
| PAL-03 | `.../Na__ColourPalette__Picker__.js` | 1.1.0 | same | port_verbatim | header | PAL-02 |
| PAL-04 | `.../Na__ColourPalette__Config__.json` | 1.1.0 | same | port_adapted | `Palette__MenuName` (decision D-S06b-04), Meta wording; Monochrome + Dimensions groups unchanged | - |
| PAL-05 | `.../Na__ColourPalette__Styles__.css`, `README__ColourPalette__.md` | - | same | port_verbatim / port_adapted (README wording) | - | - |
| SPL-01 | `TVM/55__Feature__SpellCheck/Na__SpellCheck__.js`, `__Field__.js`, `__WordBar__.js`, `__Styles__.css` | 1.0.0 | `VVM/55__Feature__SpellCheck/` same names | port_verbatim (door, Styles); *verifier: port_adapted, strings only, for Field (console prefix) and WordBar (five inline fallback labels name "the TrueVision dictionary", `:107`, `:114`, `:172-173`) - not optional, or a config miss shows TrueVision in VV* | headers, console prefixes, WordBar fallback labels | SPL-02 |
| SPL-02 | `.../Na__SpellCheck__Dictionary__.js` | 1.0.0 | same | port_adapted | `SETTINGS_DEFAULTS.dictionaryFile` `50__ValeVision__UserConfig/ValeVision__UserSpellings__.json`, `apiPath` `/api/valevision/user-config/spellings`, `K_GROUPS` `ValeVision__UserSpellings__Groups`, server probe `/api/check-localhost` -> `isLocalhost === true` (VV ScrapbookCustom precedent), messages name ValeVision and the Whitecardopedia server | SRV-02 |
| SPL-03 | `.../Na__SpellCheck__Config__.json`, `README__SpellCheck__.md` | - | same | port_adapted | `Dictionary__File`, `Dictionary__ApiPath`, labels naming TrueVision | - |
| UC-01 | `TV/50__TrueVision__UserConfig/TrueVision__UserSpellings__.json` | 1.0.0 | `VV/50__ValeVision__UserConfig/ValeVision__UserSpellings__.json` | port_adapted | key prefix `ValeVision__UserSpellings__`; content per D-S06b-03 | - |
| SRV-02 | `NAAPPS/ProjectVision__TrueVisionUserConfig__Api__.py` | 1.0.0 | `WCP/Server__ValeVisionUserConfig__Api__.py` | port_adapted | `VALEVISION_APP_DIR = ../ValeVision3D` (as `Server__ValeVisionScrapbook__Api__.py:79-81`), `USER_CONFIG_DIR`, file/key prefix, blueprint `valevision_user_config_api`, route `/api/valevision/user-config/spellings`, `APP_GROUP_TITLE "Added in ValeVision"`; keep every rule, limit and the house-style writer | - |
| SRV-03 | (TV main server registers it) | - | `WCP/server.py:91-97` | update_wiring | `from Server__ValeVisionUserConfig__Api__ import valevision_user_config_api, write_text_atomic`; `app.register_blueprint(...)`; header route list | SRV-02 |

---------------------------------------------------------------------------------------------------------------------

## (d) Wiring notes (exact sites in VV; hot files)

1. **`VVM/51/05__Core__ModeController/Na__LayoutEditor__ModeController__.js`** (VV 1.18.0):
   - imports block near `:232-236`: add `Na__LeSpec__StartWatch, Na__LeSpec__StopWatch` to the SpecData import;
     `import { Na__LeSpecLock__Mount } from '../50__Feature__Specification/Na__LayoutEditor__SpecLockstep__.js';`;
     `import { Na__LeRegionGrip__Attach, Na__LeRegionGrip__Detach } from '../50__Feature__Specification/Na__LayoutEditor__NoteRegions__Grips__.js';`
     (WP-07 only); Floor Areas imports (`Na__LePanelArea__Register`, `Na__LeArea__Ready, Na__LeArea__Is`,
     `Na__LeAreaTable__Attach`) (WP-10 only).
   - shell build `:433-436`: after `Na__LeSpecEd__Mount(host, ...)` (`:436`) add `if (editable) Na__LeSpecLock__Mount(host);`
     (TV `:557`); after `Na__LePanelScrapCustom__Register();` (`:433`) add `Na__LePanelArea__Register();` (TV registers it
     after Patterns `:553`; Patterns is the 36 slice).
   - `Na__LeMode__AttachSheetInput` `:448-453`: after the margin grip (`:453`) add `Na__LeRegionGrip__Attach({ editable : Na__LeMode__IsEditable() });`;
     `DetachSheetInput` `:455-457`: `Na__LeRegionGrip__Detach();` before `Na__LeMarginGrip__Detach();` (`:457`; TV `:576-584`).
   - `Enter` `:526` (the entry from the 3D view, NOT the return from the specification page at `:511`): after
     `Na__LeMode__AttachSheetInput();` add `if (!Na__LeVw__IsViewerMode()) Na__LeSpec__StartWatch();` (TV `:710`).
   - `Leave` `:551-552`: after `if (!Na__LeMode__Active) return false;` add `Na__LeSpec__StopWatch();` (TV `:768`).
   - markup reasons list `:701` and routing `:724`: add `'areas'` -> redraw and `if (reason === 'areas') return 'floor-areas';`
     (TV `:1003`, `:1028`); Ready `Promise.all` gains `Na__LeArea__Ready()` and `Na__LeAreaTable__Attach()` after it
     (TV `:1193`, `:1208`); area selection opens the Floor Areas section (TV `:1088`).
2. **`VVM/51/07__Core__SheetData/Na__LayoutEditor__History__.js:140`**: `STEP_REASONS` gains `'margin'` (after
   `'leader'`) and `'areas'` (last), as TV `:129`. One array, two WPs (WP-05 and WP-10) - serialise or do both in WP-05.
3. **`VVM/51/07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js`**: `:585-603` add the two leaf calls after the
   rebuilt object (TV `:1291-1292`) and their imports; `:213` `LAYER_TYPES` gains `'area'` (FA; `'image'` belongs to
   the SheetImages slice); `NormaliseShapeArea`, `NormaliseAreaGroups` (TV `:760`, `:1455`), default Floor Areas layer.
4. **`VVM/51/07__Core__SheetData/Na__LayoutEditor__SheetModel__Sheets__.js:340-353`**: TV `:531-548` patch keys and the
   three region functions after it; barrel `SheetModel__.js` re-exports `AddNoteRegion`, `UpdateNoteRegion`,
   `DeleteNoteRegion` (+ AreaGroups exports for FA).
5. **`VVM/51/03__Core__Config/Na__LayoutEditor__ConfigState__EditorSetup__.js`** (`GetSpecificationSetup` `:86`,
   `GetMarginNotesSetup` `:121`): TV `:145-147` and `:259-264` keys.
6. **`VVM/51/03__Core__Config/Na__LayoutEditor__AppConfig__.json`**: the keys listed in CFG-02. Note the VV-only
   `Labels__MarginToggle*` go with WP-11.
7. **`VVM/51/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js`**: save handler (VV `:237-238`) add
   `else if (spec.conflict) note('The specification was not synced: it and its file on disk are out of step - choose which copy to keep', true);`
   (TV `:404`); remove the Notes toggle (`:292`, TV 1.17.0) in WP-11; Floor Area tool button in WP-10 (TV `:448`).
8. **`VVM/51/40__Ui__Panels/Na__LayoutEditor__PanelHost__.js:626-634`**: `if (type === 'color') Na__ColourPalette__Attach(input);`
   before `return input;` + `import { Na__ColourPalette__Attach } from '../../54__Feature__ColourPalette/Na__ColourPalette__.js';`
   (TV `:113`, `:674`).
9. **`VVM/44__System__PlanAnnotations/Na__PlanAnnotations__Toolbar__.js:255`**: after `input.type = 'color';` block,
   `Na__ColourPalette__Attach(input);` + import `'../54__Feature__ColourPalette/Na__ColourPalette__.js'` (TV 1.1.0).
   Note this VV file is LF-terminated in the working copy (git warns), unlike most.
10. **`VV/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css`** (113 lines): append two regions after the Dev
    Tools Menu region (`:108-112`), copying TV `:176-190`: `@import url('../02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__Styles__.css');`
    and `@import url('../02__Src__AppModules/55__Feature__SpellCheck/Na__SpellCheck__Styles__.css');`. These are app-wide
    features (the 3D tab uses the palette), so they go in the index, NOT in the lazy loader list.
11. **`VVM/51/01__Core__Loader/Na__LayoutEditor__Loader__.js:125-134`** (`Na__LeLoad__STYLESHEETS`): **no change**. The
    three specification sheets are already linked; the Floor Areas sheet is self-linked by its panel.
12. **`WCP/server.py`**: `:91-97` register the user-config blueprint (and import `write_text_atomic`); `:782-819`
    drawing-notes route hardening; header route list `:20-40`.
13. **`VVM/51/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js:311-312`**: drop `margin.on &&`; label
    `PdfMarginOverflow` as TV.
14. **SheetTools / Measurements / RectangleTool / ShapeTool / Grips / MarkupBridge / ShapeGeometry / SelectionBox /
    ItemClipboard / ScrapbookCustom / Panel__Layers / Panel__ScrapbookParametric + its config / KeyMappings**: Floor
    Areas and Region-tool hunks only (sections B6, B8). These files are owned by other slices; the planner should run
    WP-07 and WP-10 after (or as hunks inside) those slices' packages.

Dependency direction (who must exist first): STMT-01 -> SPEC-05 -> SPEC-06/07 -> SPEC-08/09 -> MC-01;
REC-01/02 + REC-03 hunk -> MOD-01 -> HIST-01 -> SPEC-12/13/14 -> SPEC-17/19 -> (RectangleTool 1.4.0, SheetTools
TOOL_REGION, 27/28/32) -> SPEC-15/16/18; LDR-01 -> SPEC-11; PAL-* independent; SRV-02 -> SPL-* (writes only; reading
works without it); FA-* last (largest footprint).

---------------------------------------------------------------------------------------------------------------------

## (e) UI notes (what a person sees differently in VV today)

1. **Specification bar status** - VV shows cloud states only ("Unsynced - kept in this browser", "Synced 10:42"); TV
   shows the file first: "Out of step with the file" (red), "Saving...", "Unsaved changes", "Saved to file, not synced",
   with a hover that says when the file on disk last changed, and an amber alert above the groups while the question
   stands.
2. **The lockstep question card** - TV raises a blocking card over every editor view when the file and the app
   disagree; VV never asks (and silently overwrites or silently restores).
3. **Share** on the specification's Read view (TV v2.166) - absent in VV (with the sharing port).
4. **Margin Notes panel** - TV: column settings vs list settings, a status line that counts regions / not listed / lost /
   leaderless, a "Leaderless Notes" switch with a draggable stack, an "Overspill Note Regions" switch with one fold per
   region (Title, Borders, Lists, Redraw, Delete; hovering a fold lights the region). VV: the 2026-09-14 panel.
5. **On the paper** - TV regions with grips, a move tab and a "not shown" badge; the margin grip stays up under an
   automatic Move and its badge counts only the margin's own lost notes.
6. **Toolbar** - VV still has the "Notes" toggle that TV removed (TV Toolbar 1.17.0); TV has a "Floor Area" tool (A).
7. **Bubbles** - TV: hovering a bubble 500 ms names its note ("EW01 Loggia Arcade"); right-click leads with "Show in
   Specification", which opens the left column's Specification tab with the row pulsing (SheetTools/58 slices).
8. **Colour fields** - TV: one click opens a palette of standard colours (Monochrome greys, Dimension red/blue/green)
   directly above the field, with the browser mixer stacked on top; VV: the browser mixer only.
9. **Spell check** - TV: the left Specification tab's row editor is spell-checked with the practice dictionary and a
   word bar (Add/Remove); VV: no row editor and no dictionary (58 slice + this slice).
10. **Floor Areas** - TV: right-column "Floor Areas" panel (last, folds with the others), measured rooms with labels
    that can be dragged in edit mode, area schedules (per room / per group / project) in the Parametric scrapbook, a
    "Floor Areas" layer type; VV: none.

---------------------------------------------------------------------------------------------------------------------

## (f) Decisions needed (for Adam)

| ID | Question | Options | Recommendation |
|---|---|---|---|
| D-S06b-01 | TV marks Colour Palette and Spell Check "not yet ported - it waits for Adam's sign-off", and Floor Areas "Phase 9 stays open until Adam has used this in TrueVision and said it works". Does the "align ValeVision's Drawing System exactly with TrueVision" brief count as that sign-off? | (a) yes, port all now; (b) port palette + spell check now, Floor Areas after an explicit nod; (c) wait | (a), with Floor Areas scheduled LAST because of its footprint (WP-S06b-10). Record the sign-off in both ledgers. *Verifier: REFUTED in part - "last" is impossible if the SheetTools hub, Measurements and MarkupBridge are ported whole (they import 59 modules); land the five core modules early and inert (WP-S06b-10a) and only the activation last (WP-S06b-10b). Same question as D-S03b-04 - answer once.* |
| D-S06b-02 | Add `'margin'` (and `'areas'`) to VV `Na__LeHist__STEP_REASONS`? The VV ledger left `'margin'` open on 20-Sep because it "changes what undo covers". | (a) add both (TV parity: one undo step per margin/region/leaderless change); (b) leave out | (a). Regions and leaderless re-orders are not undoable without it, and the next step would swallow them. *Verifier: same decision as D-S03b-06 (and a live VV fault today: VV already announces `'margin'`, Sheets:351).* |
| D-S06b-03 | VV user dictionary: folder/file names and seed content. | (a) `VV/50__ValeVision__UserConfig/ValeVision__UserSpellings__.json` seeded with TV's shared groups (manufacturers, products, stone, construction terms, abbreviations), the "practice's software" group replaced with Vale's (ValeVision, Whitecardopedia...), `AddedInTheApp` titled "Added in ValeVision"; (b) empty dictionary; (c) share one file between apps | (a). Same folder number and shape as TV (identity token swapped, like `01__AppAssets__ValeVision`); separate files because the apps are separate repos and servers. *Verifier: same decision as D-S06a-11. GitHub Pages (`ValeCodebase/_config.yml`) excludes only `*.md` and named folders, so the JSON publishes and the live site can read it.* |
| D-S06b-04 | Colour palette branding/content in VV. | (a) rename the palette "Vale Garden Houses Standard", keep Monochrome + Dimensions byte-identical; (b) also add a Vale brand group (from the `--Vale_` tokens); (c) verbatim | (a) now, (b) optional later. The two groups are drawing conventions both apps share; keeping them identical keeps `Na__Test__ColourPalette__` portable. *Verifier: confirmed - the name is the palette's on-screen title (Picker `:214`) and the test checks only the key. Same question as D-S10-10.* |
| D-S06b-05 | Where the Statement Writer's pure lockstep rules live in VV before the Statement Writer itself is ported. | (a) TV path `LE/52__Feature__StatementWriter/01__Core__Data/`; (b) a copy inside `50__Feature__Specification/` | (a): identical path keeps every importer verbatim; the Statement Writer port later lands beside it. |
| D-S06b-06 | Harden VV's Flask drawing-notes route to TV's standard? | (a) `Last-Modified` + no-store on GET, atomic write on POST, backup-before-overwrite; (b) Last-Modified + atomic only; (c) nothing (lockstep falls back to UpdatedIso) | (b) in this slice; backups with the persistence (DIV-4) slice, which owns the backup root and retention for project files. *Verifier: that slice is S09 (WP-S09-06 adds the VV `backups` routes). Serve GET with `send_from_directory` (bytes as stored, Last-Modified/ETag free) rather than `jsonify`, which sorts keys in Flask 3.0.* |
| D-S06b-07 | SpecEditor Bar 1.4.0 Share button depends on `66__Feature__DocumentSharing`. | (a) take Bar 1.3.0 now, 1.4.0 with the sharing port; (b) take 1.4.0 now with the button hidden | (a) - no VV-only intermediate code. |
| D-S06b-08 | Spec PDF fonts: keep Helvetica (VV) or embed Open Sans like TV? | (a) keep until `PdfFonts__` is ported by the PDF slice, then take SpecPdf whole; (b) port fonts now | (a). Recorded as a deliberate divergence in the VV ledger already (17-Sep). *Verifier: S08 recommends porting PdfFonts (D-S08-03) and owns SpecPdf in WP-S08-03; answer D-S08-03 and this falls out.* |
| D-S06b-09 | Remove VV's toolbar "Notes" toggle (TV removed it in Toolbar 1.17.0)? | (a) remove (parity); (b) keep (VV convenience) | (a), for an identical editor. *Verifier: already decided inside WP-S06a-03 (removes Notes with Undo/Redo/Fit/100%).* |
| D-S06b-10 | Version numbers when a VV file is replaced by TV's whole file. | (a) adopt TV's version and add a "Ported from TrueVision3D vX (file a.b.c)" dev-log line; (b) continue VV's own sequence | (a) - makes drift visible by version alone. (Likely a global planner decision.) |
| D-S06b-11 | Floor Areas group suggestions for Vale projects (TV: Ground Floor, First Floor, Second Floor, Basement, Garage, Outbuilding). | (a) keep; (b) add Vale terms (Orangery, Garden Room...) | (a) unless Adam asks - the list is a config value either way. |

---------------------------------------------------------------------------------------------------------------------

## (g) Proposed work packages

Every package ends with: `node --check` on every touched module, `node 80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs`
and `Na__Verify__ModuleGraph__.mjs` passing in VV, a VV DEVLOG entry (`## ValeVision3D v2.N.0 - DD-Mon-YYYY - Title`,
"### Ported from TrueVision3D vX"), PORT NOTE blocks on every new/changed file ("Ported from / Parity / Divergences /
Back-port"), and a parity ledger section. In-app checks are for Adam (handed a checklist).
*Verifier: add to every package that adds or changes an export another module imports - a bump of `PWA_SW_VERSION_TOKEN`
(`'2026-09-18-1'`, `WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js:229`,
scope includes `/ValeVision3D/`, `:250`). A warm client holding the old SpecData barrel or SheetModel would otherwise fail
to link the new importers - the fault TV records for v2.104 and v2.143. Adam's call per release (D-S06a-12, S10-F17);
the file is shared by every slice, so serialise it.*

### WP-S06b-01 - Specification lockstep core and transport (size L)
- **Scope**: STMT-01; SPEC-01..07 (State 1.2.0, Document 1.1.0, Draft 1.1.0, Editing 1.1.0, Lockstep 1.0.0 adapted,
  Transport 1.3.0 whole + VV seams, barrel 1.5.0); R2N-01 (`R2DrawingNotes` 1.1.0: `WriteCloud`, `ReadLocal.lastModified`);
  CFG-01 spec keys; CFG-02 Specification keys.
- **Files (VV, new/changed own)**: `VVM/51/52__Feature__StatementWriter/01__Core__Data/Na__LayoutEditor__Statement__Lockstep__.js` (new),
  `VVM/51/50__Feature__Specification/Na__LayoutEditor__SpecData__{State,Document,Draft,Editing,Lockstep,Transport}__.js`,
  `Na__LayoutEditor__SpecData__.js`, `VVM/03__AppUtils/Na__AppUtils__R2DrawingNotes__.js`.
- **Hot files**: `VVM/51/03__Core__Config/Na__LayoutEditor__ConfigState__EditorSetup__.js`, `VVM/51/03__Core__Config/Na__LayoutEditor__AppConfig__.json`.
- **Acceptance**: (1) `Na__Test__SpecLockstep__` (VV-adapted) passes all cases including "file moved during Sync's R2
  write is not written over" and "Reload Local leaves an agent's file unsynced"; (2) `Na__Test__StatementLockstep__`
  passes; (3) with `LockstepEnabled:false` the old behaviour holds (draft restored, last save wins); (4) off localhost
  nothing touches Flask; (5) VV Sync writes R2 through `WriteCloud` only and the local copy only through the lockstep's
  `MirrorLocal(..., {look:true})` - no remaining caller of the two-phase `Na__R2Notes__Write` in the spec units;
  (6) `Na__LeSpec__WriteLocalCopy` is exported for the 58 row editor.
- **Tests to port**: `Na__Test__SpecLockstep__.test.mjs` (adapted), `Na__Test__StatementLockstep__.test.mjs`.
- **Risk**: the Flask GET has no `Last-Modified` until WP-02 (falls back to `UpdatedIso`: works, coarser "Newer").
- *Verifier:* STMT-01 and `Na__Test__StatementLockstep__` are WP-S07b-01's first deliverable - depend on it rather than
  port them twice. Confirmed the Lockstep's only TV-specific lines are `:111` (40__ path), `:114-115` (LocalMirror, CfApi
  imports), `:353` and `:731` (ProjectFileLocation), `:389` (WriteSiblingFile) and five console prefixes, so the adapted
  unit stays a small diff. If S09's D-S09-04 same-name shims (`Na__CfApi__ProjectFileLocation` with a Flask `repoUrl`,
  `Na__LocalMirror__WriteSiblingFile`) land first, the Lockstep can go verbatim instead (D-S06b-V01). The 58 RowEditor
  calls only the barrel's `WriteLocalCopy`, so after this package it ports verbatim (S06a's "port_adapted, local write via
  VV transport" is unnecessary).

### WP-S06b-02 - Flask drawing-notes route hardening (size S)
- **Scope**: SRV-01 (GET `Last-Modified` + `Cache-Control: no-store`; POST atomic via `write_text_atomic`); optional
  backup per D-S06b-06.
- **Hot files**: `WCP/server.py`.
- **Acceptance**: GET of an existing file returns `Last-Modified` equal to the file mtime (HTTP date); GET of a missing
  file still returns 404 `{ missing: true }`; POST leaves no partial file when serialisation fails (temp + `os.replace`,
  in-place fallback); bytes written unchanged (4-space JSON, LF, final newline); a `Na__Test__DrawingNotesRoute__.test.py`
  (new, Flask test client, modelled on `Na__Test__ScrapbookApi__.test.py`) passes.
- **Depends on**: the helper from WP-09 (or a local copy of `write_text_atomic`, then de-duplicated).

### WP-S06b-03 - Lockstep question, bar status, wiring (size M)
- **Scope**: SPEC-08 (SpecLockstep new), SPEC-09 Bar 1.3.0, CSS-01; MC-01 lockstep hunks; TBR-01 1.23.0 hunk.
- **Hot files**: `VVM/51/05__Core__ModeController/Na__LayoutEditor__ModeController__.js`, `VVM/51/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js`.
- **Acceptance**: the card mounts only in editable sessions; StartWatch runs on entering the editor (not in the web
  viewer) and stops on leaving; bar shows the four disk-first states; Save Sheets with an open question saves sheets
  and says the specification was held; module graph clean.
- **Depends on**: WP-S06b-01.

### WP-S06b-04 - Specification links: broken and note resolvers (size S)
- **Scope**: SPEC-11 (SpecLinks 1.2.0); LDR-01 (LeaderGeometry 1.3.0) unless the markup slice delivers it first.
- **Hot files**: `VVM/51/15__Core__Markup/Na__LayoutEditor__LeaderGeometry__.js`.
- **Acceptance**: a bubble linked to a deleted note reads broken (`IsBroken`); `NoteFor(leader)` answers
  `{noteId, code, title, linked, locate}`; `locate()` dispatches `na-layouteditor-spec-locate`.
- **Tests to port**: `Na__Test__BubbleNoteTooltip__.test.mjs` once `SheetTools__NoteTooltip__` exists (SheetTools slice).
- **Depends on**: WP-S06b-01 (LOCATE_EVENT).
- *Verifier:* LeaderGeometry 1.3.0 is WP-S03b-06's (port_verbatim); take it from there. The "draws its red halo"
  acceptance also needs WP-S03b-07 (MarkupBridge 1.13.0+ options pass-through and SheetSurface's `showBrokenHalos`
  opt-in) - until then accept on `IsBroken` alone. `Na__Test__BubbleNoteTooltip__` is also listed by WP-S05a-08.

### WP-S06b-05 - Notes margin data layer: regions and leaderless records, model, undo, config (size M)
- **Scope**: REC-01, REC-02 (new leaves), REC-03 hunk (`NormaliseMarginNotes`), MOD-01 hunks (patch keys + three region
  functions + barrel), HIST-01 (`'margin'`, and `'areas'` if D-S06b-02 = both), CFG-01 margin keys, CFG-02 MarginNotes
  keys + 39 `Region*`, 11 `Leaderless*`, 5 `Margin*` labels + `PdfMarginOverflow`.
- **Hot files**: `VVM/51/07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js`, `.../Na__LayoutEditor__SheetModel__Sheets__.js`,
  `.../Na__LayoutEditor__SheetModel__.js`, `.../Na__LayoutEditor__History__.js`, `VVM/51/03__Core__Config/Na__LayoutEditor__ConfigState__EditorSetup__.js`,
  `VVM/51/03__Core__Config/Na__LayoutEditor__AppConfig__.json`.
- **Acceptance**: a margin record without the new keys normalises byte-identical (every existing VV sheet unchanged);
  `RegionsOn`/`Regions`/`LeaderlessOn`/`LeaderlessGroups` survive a normalise round-trip; each patch key is one
  `'margin'` announcement and one undo step; silent region updates announce nothing.
- **Tests to port**: the record/model parts of `Na__Test__NoteRegions__` and `Na__Test__LeaderlessNotes__`.
- **Depends on**: D-S06b-02; must land before WP-06/07 (else the new keys are dropped on normalise).
- *Verifier:* every file here is also scheduled, whole, by another slice: the two leaves in WP-S03b-02, SheetRecords in
  WP-S03b-03, SheetModel__Sheets + barrel + History in WP-S03b-04 (and `'margin'` in the WP-S03b-01 bridge),
  ConfigState__EditorSetup and the AppConfig keys in S03a's two whole-file rows. The content is TV-identical, so this
  package is a valid EARLY bridge only if the planner wants regions/leaderless before WP-S03b-03 (XL, gated on other
  slices' leaves); otherwise drop it and gate WP-06 on those packages. Never run it concurrently with them (D-S06b-V02).

### WP-S06b-06 - Margin layout, leaderless panel, margin panel status (size L)
- **Scope**: SPEC-13 (Column), SPEC-14 (NoteRegions Place/Push), SPEC-12 (SpecMargin 1.5.0), SPEC-19 (Leaderless panel),
  SPEC-20 (MarginGrip 1.3.0 - whole if SheetSurface `ZOOM_SETTLED_EVENT` and SheetTools `IsMoveAuto` are in VV, else the
  `marginLost` hunk), CSS-02, PDF-01 hunk.
- **Hot files**: `VVM/51/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js`.
- **Acceptance**: `Na__Test__NoteRegions__` (53 checks) and `Na__Test__LeaderlessNotes__` (51 checks, RB05 fixture
  replaced or skipped) pass on VV's real modules; a sheet with no regions and no leaderless groups plans, draws and
  reports exactly as before (compare `Na__LeMargin__Push` primitives before/after on a VV project, as TV did over 156
  cases); the PDF toast counts notes that fit nowhere.
- **Depends on**: WP-S06b-05.
- **Note**: `Panel__MarginNotes__` 1.2.0 imports both sub-panels, so it is taken in WP-07; the leaderless panel file is
  added here and registered by WP-07's panel.
- *Verifier:* the PdfExporter hunk is also in S08's WP-S08-02 / WP-S08-14 and the MarginGrip `IsMoveAuto` line in
  WP-S05a-08 - one owner each. Because the Regions sub-panel imports the grips (and they import 27/28/32), Leaderless
  Notes have no UI in VV until WP-S06b-07b - see D-S06b-V03.

### WP-S06b-07 - Overspill regions: tool, grips, regions panel, margin panel 1.2.0 (size L)

> **REFUTED by verifier (as scoped):** its SheetTools/Measurements/RectangleTool/ObjectSnap hunks are delivered verbatim
> by WP-S05a-08 (hub incl. `TOOL_REGION` dispatch), WP-S05a-07 (Measurements 1.10.0), WP-S05b-07 (RectangleTool 1.4.0
> `land`) and S04b's ObjectSnap folder (`Sources` 1.1.0+ RegionBoxes, which imports nothing of this slice) - and those
> whole-file ports import `NoteRegions__Tool__`, so the tool module must land BEFORE them, not after. Replaced by
> **WP-S06b-07a** (Region tool module, early, inert) and **WP-S06b-07b** (grips, regions panel, Panel__MarginNotes 1.2.0,
> ModeController grip wiring) in the Verification section. The text below is kept for its acceptance criteria.

- **Scope**: SPEC-15 (Tool), SPEC-16 (Grips), SPEC-18 (Regions panel), SPEC-17 (Panel__MarginNotes 1.2.0); MC-01 grips
  hunk; SheetTools `TOOL_REGION` dispatch (State, PointerPress, PointerDrag, Keyboard), Measurements `TOOL_REGION`,
  RectangleTool 1.4.0 `land` (if not already ported), ObjectSnap `Sources` RegionBoxes (with the ObjectSnap port).
- **Hot files**: `VVM/51/05__Core__ModeController/Na__LayoutEditor__ModeController__.js`, `VVM/51/30__System__SheetTools/Na__LayoutEditor__SheetTools__State__.js`,
  `...SheetTools__.js`, `...SheetTools__PointerPress__.js`, `...SheetTools__PointerDrag__.js`, `...SheetTools__Keyboard__.js`,
  `...Measurements__.js`, `VVM/51/35__System__DrawingTools/Na__LayoutEditor__RectangleTool__.js`,
  `VVM/51/28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Sources__.js` (once it exists).
- **Acceptance**: Add region arms the tool, a dragged box becomes a region and Select returns with its fold open; a box
  is never under 15 mm and stays on the paper; grips snap (object snap, grid, perpendicular to the margin divider), one
  undo step per drag, Escape restores; `Na__Test__ObjectSnap__` region checks pass (with the ObjectSnap port).
- **Depends on**: WP-S06b-06; the ObjectSnap (28), DrawingGrid (27), OrthoMode (32) ports; SheetSurface
  `ZOOM_SETTLED_EVENT`; SheetTools `IsMoveAuto`; RectangleTool 1.4.0.

### WP-S06b-08 - Colour Palette (size S)
- **Scope**: PAL-01..05 (new `VVM/54__Feature__ColourPalette/`), wiring in PanelHost and the PlanAnnotations toolbar, the
  CSS index import.
- **Hot files**: `VVM/51/40__Ui__Panels/Na__LayoutEditor__PanelHost__.js`, `VVM/44__System__PlanAnnotations/Na__PlanAnnotations__Toolbar__.js`,
  `VV/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css`.
- **Acceptance**: `Na__Test__ColourPalette__` (adapted) passes - SSOT greys, placement in all cases, the wiring rule (no
  VV source makes a bare colour input), the CSS index import; a disabled field (read-only web viewer) gets no palette.
- **Tests to port**: `Na__Test__ColourPalette__.test.mjs`.
- **Depends on**: D-S06b-04 (palette name only); independent of every other package.
- *Verifier:* schedule it BEFORE WP-S06a-02 (PanelHost 1.6.0 whole), which otherwise has to leave a TODO seam for the
  attach line; S10 (D-S10-10, the 54 row) and S06a (WP-S06a-02 tests) also list this feature/test - this package owns them.

### WP-S06b-09 - Spell Check, user dictionary and Flask route (size M)
- **Scope**: SPL-01..03 (new `VVM/55__Feature__SpellCheck/`), UC-01 (new `VV/50__ValeVision__UserConfig/`), SRV-02 (new
  `WCP/Server__ValeVisionUserConfig__Api__.py`), SRV-03 (registration), the CSS index import.
- **Hot files**: `WCP/server.py`, `VV/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css`.
- **Acceptance**: GET `/api/valevision/user-config/spellings` returns `{status:'ok', writable:true, document}` on the
  local server; Add/Remove round-trip byte-for-byte in the house style; a broken file answers 500 `unreadable` with
  line/column and is never written; on a server without the route the word bar says "restart" (probe
  `/api/check-localhost`), with no server it says read-only; off localhost the dictionary is read from the static file.
- **Tests to port**: `Na__Test__SpellCheckDictionary__.test.mjs` (adapted), `Na__Test__UserSpellingsApi__.test.py`
  (adapted), `Na__Test__SpellCheckField__.html`.
- **Depends on**: D-S06b-03. The only consumer (58 row editor) is another slice; this package is usable on its own.
- *Verifier:* WP-S06a-06 lists the same three tests and depends on this package (D-S06a-11 = D-S06b-03); this package
  owns the tests. Field and WordBar take string seams (console prefix, five WordBar fallback labels), not a verbatim copy.
  `WCP/server.py` is also a hot file of WP-S09-06 and WP-S07b-03 - serialise.

### WP-S06b-10 - Floor Areas (size XL)

> **REFUTED by verifier (as scoped):** "Floor Areas last, after the SheetData, SheetTools, DrawingTools and Markup
> slices" is a cycle - those slices' whole-file ports import `59__Feature__FloorAreas` (WP-S05a-07/08:
> `FloorAreas__Tool__`, `__Menu__`; WP-S03b-07: `FloorAreas__Paint__`). Most of the hot-file hunks listed below are
> also delivered by whole-file ports elsewhere (S03b WP-03/04/07, S05a WP-07/08, S05b WP-07/08, S06a WP-01/10/13).
> Replaced by **WP-S06b-10a** (the five core modules, early and inert) and **WP-S06b-10b** (activation) in the
> Verification section. The text below is kept for its acceptance criteria.

- **Scope**: FA-01..11, MOD-02, REC-03 area hunks, the shared-code hunks of section B8, CFG-02 area keys (labels,
  `AccordionSections`), the A binding, `HIST-01` `'areas'`.
- **Hot files**: `VVM/51/07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js`, `...SheetModel__.js`, `...SheetModel__Shapes__.js`,
  `...SheetModel__Layers__.js`, `...History__.js`, `VVM/51/05__Core__ModeController/Na__LayoutEditor__ModeController__.js`,
  `VVM/51/15__Core__Markup/Na__LayoutEditor__MarkupBridge__.js`, `...ShapeGeometry__.js`,
  `VVM/51/30__System__SheetTools/Na__LayoutEditor__SelectionBox__.js`, `...ItemClipboard__.js`, `...SheetTools__State__.js`,
  `...SheetTools__ToolState__.js`, `...SheetTools__PointerPress__.js`, `...SheetTools__PointerDrag__.js`,
  `...SheetTools__Keyboard__.js`, `...SheetTools__ContextMenu__.js`, `...Measurements__.js`, `...Grips__.js`,
  `VVM/51/35__System__DrawingTools/Na__LayoutEditor__RectangleTool__.js`, `...ShapeTool__.js`,
  `VVM/51/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js`, `...Panel__Layers__.js`,
  `VVM/51/56__Feature__ScrapbookCustom/Na__LayoutEditor__ScrapbookCustom__.js`,
  `VVM/51/57__Feature__ScrapbookParametric/Na__LayoutEditor__Panel__ScrapbookParametric__.js`,
  `.../Na__LayoutEditor__ScrapbookParametric__Config__.json`, `VVM/51/03__Core__Config/Na__LayoutEditor__AppConfig__.json`,
  `VVM/51/03__Core__Config/Na__LayoutEditor__KeyMappings__.json`.
- **Acceptance**: `Na__Test__FloorAreas__` (pure geometry, can run first) and `Na__Test__AreaSchedule__` pass; every
  sheet saved before the port loads and saves byte-identical; a room's area follows the drawing scale with nothing
  stored; `'areas'` changes are undo steps with correct redo; paste keeps a room on the Floor Areas layer; a custom
  scrapbook item drops its group and fixed scale; the panel is the last right-column section and folds with the others.
- **Depends on**: D-S06b-01; WP-S06b-05 (History, SheetRecords serialisation); the SheetData, SheetTools, DrawingTools,
  Markup (PaintOrder v2.106), ViewportRotation (`Na__LeVpRot__Contains`), OrthoMode and Grips (`RegisterShapeProvider`)
  ports from other slices.

### WP-S06b-11 - Toolbar Notes toggle removal (size S)

> **REFUTED by verifier:** duplicate of WP-S06a-03 ("Toolbar, subtractive phase"), which removes the Notes toggle
> together with Undo, Redo, Fit and 100%, with the same acceptance ("Show notes margin in the Margin Notes panel toggles
> the margin"). Fold this package's two extras into WP-S06a-03: delete `Labels__MarginToggle` / `MarginToggleTitle`
> (VV `AppConfig__.json:719-720`) and reword `LayoutEditor__MarginNotes__Description` (VV `:428`, "the Notes button on
> the toolbar").

- **Scope**: remove VV's Notes toggle (TV Toolbar 1.17.0), its labels, and the "Notes button" wording in the MarginNotes
  Description.
- **Hot files**: `VVM/51/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js`, `VVM/51/03__Core__Config/Na__LayoutEditor__AppConfig__.json`.
- **Acceptance**: the toolbar matches TV's strip in this respect; Show notes margin in the Margin Notes panel switches the
  margin; no dangling label references.
- **Depends on**: D-S06b-09; best folded into the toolbar slice's package if one exists.

### WP-S06b-12 - Specification Share and PDF fonts follow-ups (size S)

> **REFUTED by verifier:** both halves are owned by S08 - SpecPdf with PdfFonts and the `returnPromise` save in
> WP-S08-03 (S08 row "SpecPdf ... port_adapted with PdfFonts"), and the Read-view Share button in `SpecEditor__Bar__`
> in WP-S08-11 ("Document sharing (66) and its buttons"). The Specification test page's jsPDF path (S06b-F54) is
> WP-S08-01's. Keep D-S06b-07/08 only as pointers to D-S08-03 and WP-S08-11.

- **Scope**: SPEC-09 1.4.0 (Share) once `66__Feature__DocumentSharing` is in VV; SPEC-22 whole once `PdfFonts__` is in VV
  (and the `returnPromise` line now).
- **Hot files**: none beyond the two spec files.
- **Acceptance**: Read view shows Share; the downloaded specification embeds the same face the sheets use.
- **Depends on**: the document-sharing and PDF-export slices.

### WP-S06b-13 - Ledgers and headers (size S)
- **Scope**: VV parity ledger section for TV v2.91-v2.166 spec/margin/areas/palette/spell work and the `'margin'` row
  closure; note the drift-table misclassification of Editing/Draft; optional (needs Adam's OK, TV is the lead) TV header
  corrections: the nine "ValeVision: not yet ported" PORT NOTEs, `SpecEditor__Notes__`/`SpecPdf__` "offer to
  ValeVision3D" lines, plan rows AJ/AM.
- **Hot files**: `VV/ValeVision__PARITY__TrueVisionLedger__.md`, `VV/ValeVision__DEVLOG__.md` (shared with every package -
  the planner should serialise ledger/devlog edits).
- **Acceptance**: every file touched in WP-01..12 has a ledger row with parity state and divergences.

---------------------------------------------------------------------------------------------------------------------

## Verification (adversarial verifier, 01-Oct-2026)

### V.1 What was checked, and how

- **Coverage.** Every file of the slice was enumerated from `tree_tv.tsv`, `tree_vv.tsv` and `drift_all.tsv`: TV
  `LE/50__Feature__Specification` 31 files (23 shared + 8 tv-only; VV has no VV-only file there), `LE/59__Feature__FloorAreas`
  10, `TVM/54__Feature__ColourPalette` 6, `TVM/55__Feature__SpellCheck` 7, `TV/50__TrueVision__UserConfig` 1, the NAAPPS
  blueprint, VV `R2DrawingNotes`, the WCP handler/index/route, and the 13 slice tests plus `Na__Test__SpecificationPdf__.html`.
  Every one is accounted for in sections (c) and B11; nothing material was missing from the file inventory. Searches of
  all of `VVM` for an equivalent under another name (lockstep, LOCATE_EVENT, WriteLocalCopy, palette, spell, floor
  area, note region, leaderless, area schedule, `type = 'color'`) found none (VV's Eyedropper "palette mode" and the
  GridLineSystem colour select are different features).
- **Refute-checks, by opening the files.** All 20 critical/high findings (F01-F04, F07-F11, F14, F20, F23-F25, F37-F39,
  F45, F52, F57) and 35 of the 37 others. Every quoted line number in the Transport, Lockstep, R2DrawingNotes, server.py,
  ModeController, Toolbar, SheetRecords, SheetModel__Sheets, History, EditorSetup, PanelHost and PlanAnnotations
  Toolbar citations was opened. `git diff --no-index -w` was re-run on State, Document, Draft, Editing, the barrel, Bar,
  SpecLinks, MarginGrip, Panel__MarginNotes, SpecPdf, SpecDocument, the 7 SpecEditor units (comment lines filtered: 0
  code lines differ; Notes differs by one trailing comment) and the three stylesheets. Config keys and labels were
  diffed with Python (39 `Region*`, 11 `Leaderless*`, 5 `Margin*`, 4 floor-area labels, 3 Leader NoteTooltip keys, 4
  Specification lockstep keys + `LegacyFileName`, 8 MarginNotes keys: all confirmed). A name-by-name import check of
  every TV-only and changed module against VV's exports (script `verify_s06b/names.py`) confirmed each "VV lacks"
  claim and each dependency list. TV DEVLOG entries v2.104, v2.143, v2.144, v2.147, v2.148 and v2.163 were read in full;
  every cited version exists in the index.
- **Cross-slice reads.** The S03a, S03b, S04a, S04b, S05a, S05b, S06a, S07b, S08, S09 and S10 reports were searched for
  every file and decision this slice touches.

### V.2 Confirmed (checked and right)

F01, F02, F03, F04, F06, F07, F08, F09, F10, F12, F14, F15, F16, F17, F18, F20, F21, F22, F23, F24, F27, F28, F29, F30,
F31, F32, F36, F39, F41, F42, F46, F47, F48, F49, F50, F52, F55, F56, F57. Highlights: both live VV data-safety faults
are real (`Transport__.js:324` RestoreDraft unconditional; `:478` Reload Local adopts the file as the cloud copy, and the
Sync button is disabled while `!state.dirty`, `Bar__.js:236`); the drift table's "header-only" rows for Draft and Editing
are wrong (code hunks at Editing `:107`/`:370`, Draft exports `:184`); `NormaliseMarginNotes` really rebuilds six keys
(VV `:594-601`); `/api/check-localhost` answers `{ isLocalhost : true }` (`server.py:322-328`); the user dictionary holds
339 entries in six groups plus an empty `AddedInTheApp`.

### V.3 Corrections (applied above, and returned in the schema)

| Id | Field | Correction |
|---|---|---|
| F05 | recommendation | Serve GET with `send_from_directory` (bytes as stored; Last-Modified/ETag free). `jsonify` sorts keys (Flask 3.0.0 bundled, `sort_keys = True`, not overridden in `server.py`), which would make the lockstep ask about files carrying non-schema keys. Backups belong to S09's WP-S09-06 |
| F11 | recommendation | WP-S07b-01 already ports this leaf and its test first; depend on it |
| F13 | recommendation | Bar 1.4.0's Share hunk belongs to WP-S08-11 |
| F19 | detail/recommendation | LeaderGeometry 1.3.0 is WP-S03b-06's; the halo also needs WP-S03b-07 (MarkupBridge 1.13.0 options, SheetSurface `showBrokenHalos` opt-in, TV `:880`) |
| F25 | vv_version | 1.4.0 (VV log top entry mislabelled 1.3.0); same decision as D-S03b-06 |
| F26 | recommendation | No dispatch hunks here: they arrive with WP-S05a-08 / WP-S05a-07 / WP-S05b-07; the Tool module must land BEFORE them |
| F33 | recommendation | PdfExporter hunk owned by S08 (WP-S08-02/14); config keys by S03a's additive pass |
| F34 | detail | The logo is config-driven (`logoAssetPath`) in both; only the project-name source differs in code |
| F35 | recommendation | Owned by WP-S08-03 (D-S08-03 recommends porting PdfFonts) |
| F37 | recommendation | Not last: core modules early (WP-S06b-10a), activation last (WP-S06b-10b) |
| F38 | detail | Add `ConfigState__KeyMap__.js` (TV `:209` fallback binding for A); most listed files are whole-file ports owned elsewhere that already carry the hunks |
| F40 | evidence | 56-key AreaSchedule block (54 `AreaSchedule__*`) + 29 `Area*` labels, not "64 keys"; WP-S06a-13 also owns the type |
| F43 | recommendation | Land before WP-S06a-02; D-S10-10 is the same question as D-S06b-04 |
| F44 | detail | WordBar's five inline fallback labels, the Dictionary's server wording and three console prefixes name TrueVision: string-adapt Field and WordBar |
| F45 | evidence | Config constants are at `:86-109` |
| F51 | detail | The NoteTooltip config reader is `ConfigState__ToolSetup__` 1.5.0 `GetLeaderSetup` (S05a) |
| F53 | detail | 8 stale TV headers, not 9; TV plan row U (`:861`) also stale; the TV realign plan has no rows for any v2.104+ work of this slice |
| F54 | recommendation | VV does NOT vendor jsPDF 4.1.0 (`VV/04__Lib__ThirdParty__VersionLocked` holds only vendors 01-04) and LE config `JsPdfScriptPath` still points at folder 35 (`AppConfig__.json:402`); owned by WP-S08-01 |

### V.4 Added findings

- **S06b-V01 (high, wiring) - Floor Areas and the Region tool are prerequisites of other slices' whole-file ports, not
  the last step.** Static imports in TV: `Measurements__.js:188-189`, `SheetTools__PointerPress__.js:196-197`,
  `__PointerDrag__.js:336-337`, `__Keyboard__.js:247-248` (`FloorAreas__Tool__`, `NoteRegions__Tool__`);
  `SheetTools__ContextMenu__.js:201-202` (`FloorAreas__Tool__`, `__Menu__`); `MarkupBridge__.js:233` (`FloorAreas__Paint__`).
  S05a's WP-S05a-07/08 and S03b's WP-S03b-07 port these whole and already list the 59/50 modules as dependencies,
  while this slice made Floor Areas depend on those slices - a cycle. None of the five core modules or the Region tool
  has import-time side effects, so they can land inert. Their VV link needs (checked name by name): `SheetModel__AreaGroups__`
  (+ `Na__LeRec__NormaliseAreaGroups`), `LayerIndexAboveDrawings` (Layers 1.2.0+), `20/ViewportRotation__`;
  `AddNoteRegion`/`UpdateNoteRegion` and `SheetRecords__NoteRegions__` for the Region tool.
- **S06b-V02 (high, decision) - one owner per file across slices.** Same files scheduled twice: Statement lockstep leaf +
  test (WP-S06b-01 / WP-S07b-01); record leaves, SheetRecords, SheetModel__Sheets, History, AreaGroups (WP-S06b-05/10 /
  WP-S03b-01..04); EditorSetup + AppConfig keys (WP-S06b-01/05 / S03a whole-file rows); LeaderGeometry (WP-S06b-04 /
  WP-S03b-06); RectangleTool/ShapeTool (WP-S06b-07/10 / WP-S05b-07/08); SheetTools hub, Measurements, Grips, MarginGrip
  `IsMoveAuto` (WP-S06b-06/07/10 / WP-S05a-07/08); Toolbar Notes toggle, Floor Area button and spec-held toast
  (WP-S06b-03/10/11 / WP-S06a-03/10); PanelHost palette line (WP-S06b-08 / WP-S06a-02); AreaSchedule + ScrapbookCustom
  PortableRecord (WP-S06b-10 / WP-S06a-13/01); SpecPdf, Bar Share, PdfExporter toast, SpecificationPdf test page
  (WP-S06b-06/12 / WP-S08-01/02/03/11/14); spell-check and lockstep tests (WP-S06b-01/09 / WP-S06a-06). Duplicate
  decisions: D-S06b-01 = D-S03b-04, D-S06b-02 = D-S03b-06, D-S06b-03 = D-S06a-11, D-S06b-04 = D-S10-10, D-S06b-08 = D-S08-03,
  D-S06b-09 = WP-S06a-03.
- **S06b-V03 (medium, wiring) - VV's shell is cached by Whitecardopedia's service worker.** `PWA_SW_VERSION_TOKEN =
  '2026-09-18-1'` (`WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js:229`;
  managed folders include `/ValeVision3D/` at `:250`). Every package here adds exports that existing modules import
  (SpecData barrel, State, Document, Draft, SheetModel, LeaderGeometry), so a warm client can fail to link until the
  token is bumped. It is in no S06b package footer.
- **S06b-V04 (medium, transport) - the spec transport seam conflicts with S09's plan.** This slice adapts Lockstep and
  Transport onto `Na__R2Notes__*`; S09's D-S09-04 recommends same-name `Na__CfApi__*`/`Na__LocalMirror__*` shims so TV
  modules port unedited (its Appendix B lists the Lockstep and Transport as importers of `ProjectFileLocation` and
  `WriteSiblingFile`). Either works; one must be chosen before WP-S06b-01 starts (D-S06b-V01).
- **S06b-V05 (low, transport) - the Flask GET re-serialises with sorted keys.** See the F05 correction; latent today (no
  VV notes file carries non-schema keys - all four checked), but it would make the lockstep raise false questions.
- **S06b-V06 (low, wiring) - the 58 RowEditor can port verbatim after WP-S06b-01.** It imports only the SpecData barrel
  (`WriteLocalCopy`, `:86`, `:403`) and SpellCheck; the VV transport seam stays inside SpecData. S06a's "RowEditor
  port_adapted (local write via VV transport)" can drop to header + console prefix.

### V.5 Work packages - refuted and replaced

- **Refuted:** WP-S06b-07 and WP-S06b-10 (as scoped - see the notes on each), WP-S06b-11 (duplicate of WP-S06a-03),
  WP-S06b-12 (duplicate of WP-S08-03 + WP-S08-11). WP-S06b-05 is kept only as an optional early bridge (see its note).
- **WP-S06b-07a - Region tool module ahead of the SheetTools hub (S).** Port `50/NoteRegions__Tool__` 1.0.0 verbatim
  (header, PORT NOTE). Depends on the margin-record prerequisites (WP-S06b-05, or WP-S03b-02 + WP-S03b-04). Must land
  before WP-S05a-07 and WP-S05a-08. Acceptance: both Verify scripts pass with the module present and unimported; then
  the hub and Measurements ports link in VV. Hot files: none.
- **WP-S06b-07b - Overspill regions UI (L).** `NoteRegions__Grips__`, `Panel__MarginNotes__Regions__`, `Panel__MarginNotes__`
  1.2.0 (registers both sub-panels), the ModeController grip attach/detach at VV `:448-457`. Depends on WP-S06b-06,
  WP-S06b-07a, WP-S05a-08 (`TOOL_REGION` dispatch, `IsMoveAuto`), WP-S03b-07 (`ZOOM_SETTLED_EVENT`), S04b ObjectSnap/
  DrawingGrid/OrthoMode, WP-S05b-07 (RectangleTool `land`). Acceptance and tests: WP-S06b-07's, minus the dispatch hunks.
- **WP-S06b-10a - Floor Areas core modules ahead of the hub and MarkupBridge ports (M).** Port verbatim (console prefix
  only) `FloorAreas__Geometry__`, `FloorAreas__`, `FloorAreas__Tool__`, `FloorAreas__Menu__`, `FloorAreas__Paint__` and
  `FloorAreas__Config__.json`. Depends on WP-S03b-03/04 (AreaGroups unit + barrel, `NormaliseAreaGroups`,
  `LayerIndexAboveDrawings`) and WP-S04a-01 or WP-S04b-01 (ViewportRotation leaf). Must land before WP-S03b-07,
  WP-S05a-07 and WP-S05a-08. Acceptance: `Na__Test__FloorAreas__` passes on VV's copy; both Verify scripts pass with the
  modules unregistered. Risk: once the hub and the A binding (WP-S05a-05) land, A arms the Area tool before the panel
  exists - keep the binding disabled until WP-S06b-10b, or land 10b right after the hub.
- **WP-S06b-10b - Floor Areas activation (L).** `Panel__FloorAreas__`, `__Table__`, `__LabelGrip__`, the stylesheet
  (self-linked), the AreaSchedule type with its 57 registration and config (unless WP-S06a-13 owns it), the ModeController
  hunks (register, `Ready`, `Table__Attach`, `'areas'` routing, area selection), AppConfig labels and AccordionSections
  `'floor-areas'`, and whatever of Toolbar button / Layers label / A key / `'areas'` step the whole-file ports have not
  already delivered. Depends on WP-S06b-10a, WP-S05a-08, WP-S05a-07 (Grips 1.9.0+ `RegisterShapeProvider`), S04b OrthoMode,
  WP-S05b-07/08 (Rectangle 1.3.0+/Shape 1.7.0+), WP-S03b-07 (PaintOrder, for rooms under the linework), D-S06b-01.
  Acceptance and tests: WP-S06b-10's.

### V.6 Added decisions

- **D-S06b-V01 - spec transport seam:** adapt Lockstep + Transport onto `Na__R2Notes__*` (this slice) or port them
  verbatim over S09's CfApi/LocalMirror shims (D-S09-04)? Recommendation: adapt now - it closes the two live faults
  without waiting for WP-S09-06, and the Lockstep's TV-specific surface is six lines; re-base onto the shims later if
  D-S09-04 is (a). The shims would also need a synchronous `IsConfigured` (VV fetches its worker config asynchronously).
- **D-S06b-V02 - owners for the doubly-scheduled files in S06b-V02.** Recommendation: whole-file owners keep their files
  (S03b, S03a, S05a, S05b, S06a, S07b, S08); this slice keeps the 50/52-leaf/54/55/59 folders, R2DrawingNotes, the Flask
  work, the ModeController lockstep/regions/areas hunks and the tests named in its packages.
- **D-S06b-V03 - Leaderless Notes before the regions stack?** `Panel__MarginNotes__` 1.2.0 imports the Regions sub-panel,
  which imports the grips and 27/28/32. Options: (a) wait (verbatim only); (b) an interim VV `Panel__MarginNotes__` with
  only the leaderless sub-panel. Recommendation: (a) unless the snap stack is more than a release away.

### V.7 Not verified

- Nothing was run: no node test, no browser, no Flask. "Inert" for the 10a/07a modules rests on a static read (no
  top-level calls found), not on a load in VV.
- Bodies of the Floor Areas panel/table/label grip, the region grips and panels, and the SpellCheck Field were not
  read line by line; their import lists and app-specific strings were.
- Whether `send_from_directory` in the bundled Werkzeug sends Last-Modified for this route was not executed (it is
  Werkzeug's documented default for a file path).
- Whether any agent or tool writes `ValeVision__DrawingNotes__.json` today (the trigger for F01/F03 in VV) is unknown;
  hand edits and a second browser session are enough to hit both faults.
- The GitHub Pages publish of the new app-root `50__ValeVision__UserConfig/` was checked against `_config.yml` only.
