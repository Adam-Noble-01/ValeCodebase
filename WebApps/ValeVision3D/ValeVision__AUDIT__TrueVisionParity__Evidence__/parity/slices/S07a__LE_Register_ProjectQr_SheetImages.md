# S07a - Layout Editor: Drawing (Document) Register, Project QR Code, Sheet Images

Slice report for the TrueVision 3D (TV, lead) -> ValeVision 3D (VV, target) drawing-system parity
analysis. Written 01-Oct-2026 against TV HEAD b2aa9151 (devlog top v2.172.0) and VV HEAD 7b4e593a
(devlog top v2.71.0). Read-only analysis: nothing in either app, NAAPPS/ or WCP/ was changed.

Path legend (expand to absolute paths when acting):

| Short | Absolute |
|---|---|
| `TV/` | `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode` |
| `VV/` | `D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D` |
| `TVM/`, `VVM/` | `<app>/02__Src__AppModules` |
| `LE/` | `<app>/02__Src__AppModules/51__System__LayoutEditor` |
| `NAAPPS/` | `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps` |
| `NAWEB/` | `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb` (website root: `q/`, `s/`) |
| `WCP/` | `D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia` (VV Flask + VV worker) |
| `VCB/` | `D:\10_CoreLib__ValeCodebase` (ValeCodebase repo root, GitHub Pages root `https://adam-noble-01.github.io/ValeCodebase/`) |

---

## 0. Executive summary

1. **All three systems are wholly absent from VV.** 33 TV files / 10,263 lines
   (`LE/51__Feature__DrawingRegister` 10 files 3,659 lines; `LE/53__Feature__ProjectQrCode` 6 files
   1,895 lines; `LE/54__Feature__SheetImages` 17 files 4,709 lines) have no VV counterpart, plus the
   TV-only title block QR cell (`LE/10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__QrCell__.js`,
   479 lines) and the TV local-server blueprint `NAAPPS/ProjectVision__TrueVisionSheetImages__Api__.py`
   (478 lines). VV's own records say so deliberately: parity ledger rows 86, 121, 125, 126, 220,
   321-339 and VV devlog v2.60.0 (lines 1117-1126) and v2.61.0 (line 968) declare "ValeVision has no
   Drawing Register", "no 53__System__ProjectQrCode", and leave TV v2.71.0's Document ID schema
   "not ported - needs Adam's decision on whether ValeVision gets a register at all" (ledger line 339).
   TV marks every register file "Back-port : offer to ValeVision3D with the register tab", every QR
   file "ValeVision : not yet ported", and `TV/TrueVision__PLAN__SheetImages__.md` line 132 lists
   "ValeVision port | OPEN - offer after Adam confirms".
2. **The folder numbers are free and should be kept identical.** VV's LE has no 51, 53 or 54
   subfolder, so all three land at the same relative paths as TV with no renumbering. Keeping the paths
   identical keeps every `../53__Feature__ProjectQrCode/...` and `../../53__Feature__...` import from
   other TV modules (title block, shape painter, Statement Writer, Parametric Scrapbook) valid verbatim.
3. **The real blocker is not the 33 files, it is what they stand on.** A mechanical import check of
   the 33 files (script `scratchpad/parity/slices/work/s07a_import_check.py`) finds 58 cross-folder
   named-import STATEMENTS (verifier correction: statements, not names): 32 already resolve in VV (with
   the 40->42 DrawingViewCore folder mapping) and **26 do not**, carrying 37 distinct missing names.
   Two of those names (`Na__LeOsnap__Snap`, `Na__LeOsnap__HideMarker`) DO exist in VV under another path,
   VV's older `LE/30__System__SheetTools/Na__LayoutEditor__Snapping__.js` (see B9 and the Verification
   section). The script reads only the 33 feature files, not `TitleBlock__QrCell__.js` or the hub files.
   The 26 fall into eight prerequisite groups: (a) the v2.71.0 Document ID schema (`GetPhase`,
   `GetDocumentId`, `ComposeDocumentId`, `Na__LeRec__DocumentId`, `GetDrawingRegisterSetup`);
   (b) register hooks in the sheet model and autosave (`NotifyRegister`, `FinishRegisterDeletion`,
   `Na__LeAuto__Suspend/Resume/DiscardSavedDraft`); (c) TV's transport modules
   (`80__CloudflareIntegration` ApiClient, `Na__AppUtils__LocalProjectMirror__`) which VV must NOT copy
   but must answer with its own worker and Flask (DIV-4); (d) the save-step contract
   (`Na__DrawData__RegisterSaveStep`, `Save(toast, report, registerKeys)`); (e) TV identity helpers
   (`GetProjectFolderFromUrl`, `GetYearFromUrl` - VV identifies projects by `?project=` and its master
   index); (f) TV-only editor systems (`28__System__ObjectSnap`, `Na__LeTools__PickUpMove`,
   `Na__LeScope__WithAdoption`, `Na__LeGrips__RegisterShapeProvider`); (g) `60__Feature__PdfExport/
   Na__LayoutEditor__PdfFonts__.js`; (h) `31__System__DocumentKeys`, `65__Feature__DocumentPublishing`,
   `66__Feature__DocumentSharing`.
4. **Three VV-specific data facts change the design, and need Adam:**
   - VV project codes are NOT unique per project folder: 13 of the 152 master-index entries share a
     code with a sibling (schemes and variants, e.g. `2026/63592__Bressard-Kayode` and
     `2026/63592__Bressard-Kayode__Scheme-02`; `2026/63578__Yates__Orangery` and `__Porch`). TV's NA
     codes (`PS01`) are unique. This affects the `{project}` part of every Document ID and the key a
     printed QR code resolves.
   - A short QR address cannot reach TV's 42-byte budget from Vale's hosting. The Vale precedent is the
     Lantern Designer's live terms resolver at `https://adam-noble-01.github.io/ValeCodebase/t/` (its
     `VCB/t/index.html` exists). The same pattern for VV (`.../ValeCodebase/q/?63592`, 53 bytes)
     encodes to a version 4 symbol, 33 modules, a 0.270 mm module in the 10 mm strip - under TV's
     `MinModuleMm` 0.28 floor but above the Lantern Designer's proven 0.267 mm.
   - VV has only three projects with sheets in its local mirror (`2026/3047__Doous`, `2026/44371__Gill`,
     `2026/57994__Harris__Scheme-02`) and none stores a `Sheet__Fields__DrawingNumber` (checked
     01-Oct-2026 against `WCP/Projects/*/*/project.json`; R2 not checked). Adopting the register's
     numbering now is close to free; it gets more expensive with every VV sheet authored.
5. **Two TV defects were found that should be fixed in TV before the port** (back-port direction):
   the register PDF never boxes a "yellow" revision warning (`Register__Notes__.js:92` stores
   `'yellow'`, `Register__Pdf__.js:644` boxes only `'red'` or `'amber'`), and `Register__DeleteDialog__.js`
   plus all 15 SheetImages JS files lack the PORT NOTE header block (DeleteDialog also lacks a
   DEVELOPMENT LOG). TV docs also carry stale paths to the QR folder after its v2.155.0 move.
6. **Verifier additions (01-Oct-2026; detail in the Verification section at the end).**
   - VV's drawing-system "project code" is the raw `?project=` token, and Whitecardopedia ALWAYS opens
     VV with `?project=<folderId>` (`2026/3047__Doous`). A verbatim v2.71.0 port therefore composes
     Document IDs like `2026/3047__Doous_T01_D01` (title block, register number, PDF names, picture
     folders). WP-S07a-01 needs a VV document-code accessor first (S07a-V01, WP-S07a-09, D-S07a-13).
   - The QR system and Sheet Images Setup FAIL OPEN to NA addresses when their config JSON cannot be
     read (S07a-V02): `ProjectQr__Enabled:false` alone does not keep NA codes off Vale drawings.
   - The shared-core ports in S03b/S08 (SheetRecords, SheetChrome, ShapeGeometry, PdfExporter) import
     the QR and picture RENDER leaves, so those leaves must land before the hubs (S07a-V04, WP-S07a-10).
   - TV v2.116.0 also changed its service worker (a `tv-images-vN` bucket); VV's shared worker has no
     equivalent (S07a-V03, WP-S07a-11).
   - VV `project.json` identity fields are unreliable (`folderId` missing in 10/155, stale in 54/155),
     and VV can rename a project live (folderId rewritten; projectCode rewritten from project.json or the new
     folder name), which constrains QR keys
     (S07a-V05, S07a-V06, D-S07a-14).

---

## (a) Scope - what was examined

| Area | TV files | TV lines | VV files | How examined |
|---|---|---|---|---|
| `LE/51__Feature__DrawingRegister` | 10 | 3,659 | 0 | Every file read in full |
| `LE/53__Feature__ProjectQrCode` | 6 | 1,895 | 0 | Symbol, ProjectLink, Painter, Config, README in full; Encoder header, constants and exports |
| `LE/54__Feature__SheetImages` | 17 | 4,709 | 0 | Core, Source, Store, Publish, Config in full; the other 12 headers, imports and exports |
| `LE/10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__QrCell__.js` | 1 | 479 | 0 | Header, imports, exports (consumer of the QR system) |
| `NAAPPS/ProjectVision__TrueVisionSheetImages__Api__.py` | 1 | 478 | 0 | Header, config, routes; its registration in `NAAPPS/ProjectVision__LocalServer__Main__.py:69,236` |
| `TVM/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` | (region) | lines 754-972 | 0 | Sheet-image region read in full; header |
| `TV/80__CloudflareIntegration/CloudflareWorker/src` | 2 | - | - | Route list (`/r2/upload`, `/r2/copy` added v1.1.0) |
| `NAWEB/q/index.html`, `NAWEB/q/index.json` | 2 | - | - | Header, constants, index format |
| TV docs | 2 | 339 | - | `TV/TrueVision__PLAN__SheetImages__.md`, `TV/TrueVision__NOTES__DrawingNumberingSchema__.md` in full |
| TV devlog | 23 entries | - | - | v2.69.0, v2.70.0, v2.71.0, v2.72.0, v2.73.0, v2.76.1, v2.78.1, v2.79.0, v2.81.0, v2.100.0, v2.102.0, v2.106.0, v2.108.0, v2.109.0, v2.110.0, v2.112.0, v2.116.0, v2.120.0, v2.121.0, v2.155.0, v2.158.0, v2.162.0, v2.166.0, v2.167.0 (register/QR/image passages) |
| TV consumers and hooks | ~25 | - | ~25 | ModeController, TabStrip, SheetModel/Sheets/Shapes/Layers, SheetRecords, History, AutoSave, ProjectData (40), SheetChrome, TitleBlock Modern, ShapeGeometry, Grips, PointerPress, EditScope, SheetTools ContextMenu, Eyedropper, Panel Sheet/Shapes/Layers, Toolbar, PdfExporter, PdfFonts, ConfigState units, AppConfig, WebViewer, Statement Writer and Parametric Scrapbook consumers - the register/QR/image lines and their DEVELOPMENT LOGs |
| VV counterparts | - | - | ~30 | VV ModeController, Loader, TabStrip, Panel__Sheet, History, AutoSave, SheetRecords, DrawingCode (VV-only), ProjectData (42), LoadingSequence, ProjectLoader, R2SaveProjectJson, R2AssetUpload, 61 ShareProjectLink URL builder, AppConfig, ConfigState, PdfExporter, SpecPdf, WebViewer |
| WCP | 4 | - | - | `WCP/server.py` routes; `WCP/CloudflareWorker/src/index.js` router; `CloudflareHandler__ProjectAsset__.js` guard; master index `WCP/02__Src__AppModules/03__AppData/Na__MasterIndex__ProjectLocations__.json` |
| Tests | 6 TV | - | 0 | `Na__Test__ProjectQr__.test.mjs` (469), `Na__Test__ProjectQr__Decode__.py` (117), `Na__Test__SheetImages__.test.mjs` (474), `Na__Test__SheetImagesApi__.test.py` (152), `Na__Test__DocumentKeys__.test.mjs` (269), `Na__Test__TitleBlockScaleCell__.html` (194) - headers and path assumptions |
| Ledgers | - | - | 2 | VV parity ledger rows 1-135, 321-340, 1176-1177; VV plan section 5.6 (R2 asset keys) |

Not examined (and why): the bodies of Insert/Handles/Crop/Menu/Panel/Paint/Pdf/Encode/Geometry
beyond headers, imports and exports (all are leaf or editor-internal, no transport); the Encoder's
Reed-Solomon body; the TV worker R2 handler internals beyond its route list; the Whitecardopedia
Python sync/build pipeline that writes the VV master index (not located in this pass); live R2 state
of either app (cannot be verified read-only); the 31/65/66 modules themselves (other slices).

---

## (b) Narrative findings by sub-system

### B1. The Drawing (Document) Register - `LE/51__Feature__DrawingRegister`

**What it is.** A full-page tab ("Document Register" on the strip since TV v2.158.0, "Drawing
Register" on its own heading) that owns the drawing pack's numbering and per-sheet revision
history. Two views share one source: **Edit** (a quiet table - drag handle, DWG No., PHASE,
DOCUMENT CODE, DOCUMENT NAME, SCALE, SIZE, REVISION, STATUS, expand - `Register__Editor__.js:127`) and
**Read** (the exact register PDF rasterised with PDF.js, `Register__Editor__.js:464-476`,
`Register__Preview__.js:151-186`). The bar (`Register__Editor__.js:498-568`) carries Edit/Read,
Concise/Register + revision history, Export register PDF, Share (Read only, v2.166.0), Export all
drawings, Download entire pack, Publish drawings... (authoring only, v2.155.0), Save / Load notes
(Save Locally, Save to R2, Load Local, Load R2), a sync status line and Retry Local Sync.

**Data and records.**
- Project block `LayoutEditor__DrawingRegister` (`Register__Data__.js:72`) in TV's project data file
  (`TrueVision__ProjectData__.json`), normalised at `Register__Data__.js:119-138`:
  `DrawingRegister__Document__Description/Version/Updated`, `DrawingRegister__Numbering`
  (`__Prefix`, `__Start`, `__Digits`, `__Overrides` {sheetId: number}) and
  `DrawingRegister__Revisions` {sheetId: [ {`DrawingRegister__Revision__Id`, `__Code`, `__Date`,
  `__Notes`, `__Warning` none|yellow|red, `__WarningText`} ]} (`Register__Notes__.js:166-173`).
- Sheet metadata stays on the sheet records: `Sheet__Fields__DrawingNumber` (sequence only, e.g. D01),
  `Sheet__Fields__Phase` (T01-T04), `Sheet__Fields__Revision`, `Sheet__Fields__Status`, `Sheet__Name`
  (short name), `Sheet__Order`; `Sheet__Fields__DocumentId` is a hand-set escape hatch
  (`TV/TrueVision__NOTES__DrawingNumberingSchema__.md` lines 98-103).
- Browser draft: `localStorage['Na__DrawingRegister__Draft__<projectCode>']`, revision notes only, never
  numbering (`Register__Data__.js:111-113, 160-169`).
- Event: `na-layouteditor-register-changed` (`Register__Data__.js:73`); the sheet model announces
  `'register-updated'` (TV `SheetModel__.js:659`).
- Config block `LayoutEditor__DrawingRegister__Config` in `LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json`
  (prefix D, start 1, digits 2, PDF typography/rhythm, Columns, Phases T01 Concept/T02 Planning/T03
  Building Regs/T04 Site & Remedial, DefaultPhase T01, DocumentCodeFormat `{project}_{phase}_{drawing}`,
  RegisterNumberSuffix `_REGISTER`, LetterheadLogoAspect 4.096, PdfJsScriptPath/WorkerPath pointing at
  PlanVision's `/na-apps/20__PlanVision__CoreAppCode/01__AppDependencies__VersionLocked/PdfJs__3.11.174/`,
  colours). Read by `Na__LeCfg__GetDrawingRegisterSetup` in TV
  `LE/03__Core__Config/Na__LayoutEditor__ConfigState__EditorSetup__.js:391`.

**Behaviour that matters for parity.**
- Every structural edit (name, revision, phase, status, renumber, jump, move, delete) is a confirmed
  transaction that drains autosave (`Na__LeAuto__Suspend`), applies in memory, then saves through
  `Na__DrawData__Save(toast, report, registerKeys)` - one R2 write carrying the drawings block AND the
  register block - with an honest partial-success state (R2 ok, local failed -> Retry Local Sync,
  `Register__Transactions__.js:140-206`). R2 failure restores the in-memory metadata.
- Delete requires typing the exact drawing number (`Register__DeleteDialog__.js`) and writes the local
  copy FIRST (`payload.localFirst = true`, `Register__Transactions__.js:329`), then R2.
- Revision notes are browser-draft only until Save Locally / Save to R2; Save to R2 reads R2 first and
  asks before replacing notes another session changed, and never writes an older numbering over a
  structural save (`Register__Data__.js:259-297`). Ctrl+S on the register tab saves the notes (TV
  v2.112.0, via `31__System__DocumentKeys`).
- Read view and download are the same bytes (`Register__Pdf__.js:745-816`, v2.69.0), Open Sans embedded
  through `Na__LePdfFonts__EnsureLoaded` (the v2.69.0 fix), A4 portrait, the Project Specification's
  letterhead (v2.72.0), DWG No. column (v2.76.1), self-placed tracked text (v2.78.1), STATUS kept out
  of the printed columns (v2.79.0 `StatusColumnNote`).
- "Export all drawings" / "Download entire pack" walk every sheet through
  `Na__LePdf__ExportSheet(sheet, toast, { strict : true })` then the register and the specification
  (`Register__Export__.js:76-154`).
- A new sheet renumbers the whole pack from the register series (TV `SheetModel__Sheets__.js:261-272`
  `Na__LeModel__RenumberSheets` uses `Na__LeRegNum__Plan/Apply`; devlog v2.70.0 lines 9654-9661).

**VV state.** Nothing. VV's `Panel__Sheet__.js` 1.2.0/1.4.0 keeps every title block row editable,
Drawing No. included, "because that field is where a ValeVision drawing's number is set" (VV
`Panel__Sheet__.js:58-61`, ledger row 335). VV History 1.4.0 skipped the `'register-updated'` rewrite
(VV `History__.js:71-74`); VV AutoSave does not ignore `'register-updated'` (VV `AutoSave__.js:135`,
TV `AutoSave__.js:176`). VV ModeController 1.18.0 has only `VIEW_SHEET` and `VIEW_SPEC`
(VV `ModeController__.js:287-288`), and VV's lazy loader holds copies of those two view names only
(VV `Loader__.js:115-116, 284-296`).

**Defects found in TV while reading (fix in TV, then port the fixed file).**
- `'yellow'` vs `'amber'`: Notes offers `none|yellow|red` (`Register__Notes__.js:92`); the PDF boxes a
  warning only when the level is `'red'` or `'amber'` (`Register__Pdf__.js:644`), and the config names
  `WarnAmberFill/WarnAmberInk`. A "Yellow - awaiting confirmation" note therefore prints as plain body
  text with no amber panel in "Register + revision history". Verified by reading; not rendered.
- `Register__DeleteDialog__.js` has no PORT NOTE and no DEVELOPMENT LOG (lines 1-9).
- `Na__LeAuto__Suspend/Resume/DiscardSavedDraft` (TV `AutoSave__.js:620-640`) and the
  `'register-updated'` ignore (`:176`) came with the register but are not in AutoSave's DEVELOPMENT LOG.

### B2. The Document ID schema (TV v2.71.0) - the register's foundation

TV v2.71.0 split a drawing's identifier into three facts (`TV/TrueVision__NOTES__DrawingNumberingSchema__.md`):
project code (from project data), phase (`Sheet__Fields__Phase`, per sheet, default T01) and drawing
number (`Sheet__Fields__DrawingNumber`, the register's sequence), composed on every read by
`Na__LeRec__ComposeDocumentId` through `DocumentCodeFormat` and never stored. The title block's fourth
row became `DocumentId` / "Document ID" (TV AppConfig TitleBlock Rows), `Na__LePdf__Filename` names
exports after it, the Sheet panel hides it, History tracks `Phase` and `DocumentId`. An unnumbered
sheet reads `prefix + padded order` from the register's series (D04), not `projectCode-04`.

VV has the v2.70.0 half (short tabs) through its own leaf `LE/07__Core__SheetData/Na__LayoutEditor__DrawingCode__.js`
(VV-only, so the loader facade can name tabs before the editor loads) but not v2.71.0: its
`Na__LeRec__DrawingNumber` default is still `code + '-' + order` (VV `SheetRecords__.js:730-735`), its
title block row is still `DrawingNumber` / "Drawing No." (ledger row 121), and
`80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.test.mjs:115` actively asserts "the number
cell is this app's Drawing No., not TrueVision's Document ID". VV devlog v2.60.0 (lines 1117-1126)
explains why it was declined: it depends on the register's config. The register cannot be ported
without this schema, and Sheet Images files pictures by `Na__LeRec__DocumentId`, so it is the first
work package.

**Verifier addition - the `{project}` part is NOT the same fact in VV.** TV composes it from
`Na__DrawData__GetProjectCode()` (TV `SheetRecords__.js:1604-1607`; also the register number
`Register__Pdf__.js:763-765` and the PDF names `PdfExporter__.js:474-482`), which in TV is the NA code off
`?project=PS01`. VV's function returns the raw `?project=` token (VV `42/Na__DrawView__ProjectData__.js:224-229`,
set from `Na__AppUtils__GetProjectCodeFromUrl()` at VV `Na__AppFlow__LoadingSequence.js:672, 728-729`), and
Whitecardopedia always navigates with the full folderId (`WCP/02__Src__AppModules/61__Feature__PwaAppHelpers/
Na__Feature__PwaAppHelpers__ValeVisionLinkRouting__Logic__.js:36-55`, `projectData.folderId` set at
`WCP/02__Src__AppModules/03__AppData/Na__AppData__ProjectLoader.js:519`). A verbatim port composes
`2026/3047__Doous_T01_D01`; the existing VV default already prints `2026/3047__Doous-01` on every unnumbered
sheet opened from the gallery (VV `SheetRecords__.js:730-735`) and VV SpecPdf numbers its document from the same
token (VV `SpecPdf__.js:144`). The token must stay what it is for transport (`Na__DrawData__Save` GETs
`/api/projects/<token>`), so WP-S07a-01 needs a separate VV document-code accessor (S07a-V01, WP-S07a-09).

### B3. The Project QR Code - `LE/53__Feature__ProjectQrCode`

**What it is.** One QR symbol per project, carrying a short address that opens the project's live 3D
model, printed on every document: the modern title block's right-hand cell
(`TitleBlock__QrCell__.js`, TV v2.81.0), the Project Portal parametric scrapbook block (v2.100.0, grey
`#595959` since v2.120.0), the Statement Writer's "TrueVision 3D Project Hub" section (v2.162.0), and
the share links' twin resolver `s/` (v2.166.0). Vector everywhere (one filled path:
`Na__ProjectQr__Painter__.js:104-111, 141-206`).

**Modules.** `Symbol` (the one door: config, cached symbol, note words, print-size guard, index check;
`Na__ProjectQr__Symbol__.js` 1.2.0), `Encoder` (first-party, byte mode, level M, versions 1-10; ported
from the Vale Lantern Designer's `VghLantern__AppUtils__QrEncoder__.js`, `Encoder__.js:53-60`),
`Painter` (SVG group, SVG document, jsPDF), `ProjectLink` (address from config pattern and the address
bar's project identity, never `window.location`; 1.1.0), `Config` JSON, README.

**Infrastructure outside the app (NA).** `https://www.noble-architecture.com/q/?PS01` (42 bytes =
exactly a version 3 symbol) is resolved by `NAWEB/q/index.html` using `NAWEB/q/index.json`
({ "PS01": { projectFolder, projectYear } }), written by `NAAPPS/05__ProjectVision__CoreAppCode/
ProjectVision__BuildScript__.py` (`build_qr_link_index`, `--qr-index-only`) and kept current by the
Project Manager (`_update_qr_index`) (devlog v2.81.0 lines 8356-8378). The config's `IndexUrl`
`../../../../../q/index.json` is relative to the module folder and lands on `NAWEB/q/`. On localhost
`GetSymbol` verifies the project against the index once (`Symbol__.js:237-270, 302`).

**History in TV.** Folder created as top-level `02__Src__AppModules/53__System__ProjectQrCode`
(v2.81.0), moved to `51__System__LayoutEditor/53__Feature__ProjectQrCode` in v2.155.0 Phase 0
(devlog lines 1284-1285). Stale references to the old location remain in TV text:
`LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json` `LayoutEditor__TitleBlock__QrCellNote`
("02__Src__AppModules/53__Feature__ProjectQrCode/...") and
`LE/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__Config__.json:206`
("02__Src__AppModules/53__Feature__ProjectQrCode/").

**What VV must adapt (the only identity-dependent parts).**
- `ProjectLink` reads `Na__AppUtils__GetProjectCodeFromUrl`, `GetProjectFolderFromUrl`, `GetYearFromUrl`
  (`ProjectLink__.js:85-89, 119-126`) and draws a code only when BOTH code and folder are present
  (`:173-177`). VV identifies a project by `?project=` alone (VV `ProjectLoader.js:319-322`) and resolves
  `{year}/{folder}` from its master index (`NormalizeProjectFolderId`, `:335-353`); VV's `project.json`
  also carries `folderId`, `projectCode`, `displayName`, `projectNameAlias`.
- `Symbol.VerifyEntry` compares `entry.projectFolder` / `entry.projectYear` - must compare against
  whatever index VV's resolver uses.
- `Config`: `BaseUrl`, `QueryPattern`, `IndexUrl`, `MinModuleMm`, notes; `Enabled` should ship **false**
  until VV has a resolver, so the port is invisible until switched on.
- **Verifier correction - the off switch is not enough on its own: the system FAILS OPEN.**
  `Na__ProjectQr__IsEnabled()` answers true when the config JSON could not be read
  (`return !Na__ProjectQr__Config || ...`, `Symbol__.js:185-186`) and the FALLBACKS carry NA's resolver
  (`Symbol__.js:100-113`). A VV config fetch failure (offline, a stale service-worker copy, Flask answering a
  missing file with `index.html`) would therefore draw a code addressed to `https://www.noble-architecture.com/q/`
  on a Vale drawing. VV's Symbol must fail closed (no config, no code) and its FALLBACKS `baseUrl` must be `''`
  until the Vale resolver exists; set `LayoutEditor__TitleBlock__QrCellEnabled: false` in VV AppConfig as a
  second guard (S03a D-S03a-06 and S03b D-S03b-03 name the two switches differently - align them).
- **Verifier correction - VV identity sources.** `{projectFolder}`/`{year}` must come from the master index
  (`Na__AppUtils__NormalizeProjectFolderId(?project=)`, VV `ProjectLoader.js:260-279, 335-353`), NOT from
  `project.json` `folderId`, which is missing in 10 of the 155 local project files and differs from the real
  folder in 54 (e.g. `2025/59494__Weeks` stores `2025/WK-3007__Weeks`; `2025/43822__Napthine` stores
  `43822__Napthine`). `{projectCode}` must be the resolver key (D-S07a-05/D-S07a-14), never the raw token: a
  verbatim ProjectLink on a gallery-opened project encodes `.../q/?2026%2F57994__Harris__Scheme-02` = 79 bytes,
  a version 5 symbol at 0.244 mm (measured with TV's own encoder).
- **Address budget for Vale** (computed, byte-mode level M, 10 mm strip, 2-module quiet zone):

  | Address | Bytes | Symbol | Module |
  |---|---|---|---|
  | TV `https://www.noble-architecture.com/q/?PS01` | 42 | v3, 29 modules | 0.303 mm |
  | VV `https://adam-noble-01.github.io/ValeCodebase/q/?63592` | 53 | v4, 33 modules | 0.270 mm |
  | VV with scheme key `...q/?63592-2` | 55 | v4, 33 | 0.270 mm |
  | VV with folder name `...q/?3038__Gordon__Scheme-04` | 71 | v5, 37 | 0.244 mm |
  | VV app URL `...ValeVision3D/?project=63592` | 80 | v5, 37 | 0.244 mm |
  | Lantern Designer precedent `.../ValeCodebase/t/?t=15134&l=0` | 59 | v4, 33 | 0.270 mm (it prints 0.267 in 8.8 mm) |
  | A short VV-owned domain, e.g. 21 bytes | 21 | v2, 25 | 0.345 mm |

- **VV's existing share link is not a substitute.** `VVM/61__Feature__ShareProjectLink/
  Na__Feature__ShareProjectLink__UrlGeneratorLogic__.js:32-40` builds the URL from `window.location.href`
  with `?project=` - exactly the address TV's QR deliberately never prints ("a code reading
  http://localhost:8090/... opens on the authoring machine and on no phone in the world",
  `ProjectLink__.js:40-45`). Keep 61 as VV's in-app share feature (VV-only); the QR uses a fixed live base.

### B4. Sheet Images - `LE/54__Feature__SheetImages`

**What it is (TV v2.116.0, print-size storage v2.121.0, group adoption v2.142.0).** Pictures (CGIs,
photographs) composed on sheets. A picture is an ordinary vector shape carrying `Shape__Image`
{ `Image__File`, `Image__Folder`, `Image__PixelW/H`, `Image__Crop`, `Image__Frame`, `Image__Alpha`,
`Image__Name`, `Image__SourceW/H` } on an `image` layer ("Images"); four corner grips only, never
stretched; crop overlay (double-click/menu/panel); right-click rows; an Images panel; drag-and-drop and
an Image toolbar button; frame = 1.5 pt `#555041` rule + soft Gaussian shadow; PDF copies cut to 300 dpi.

**Storage.** File name = slug + `__` + first 10 hex digits of SHA-256 of the stored bytes. Stored as WebP
q 0.90 at print size (300 dpi x headroom at the largest placed size), cut by the SAVE from the original
held in memory - nothing is written at the drop. Filed under the sheet's Document ID:
`<project>/30__TrueVision__AppContent/05__Layout__DrawingDocs__Images/<DocumentId>/<file>`; unused files
move to `00__Archive` on disk and are deleted on R2 (`Publish__.js:346-389`).

**The save step.** `Na__LeImgPub__Register` registers a step with `Na__DrawData__RegisterSaveStep`
(TV `ProjectData__` 1.4.0): `before` cuts and files every picture on disk (local `reconcile`) and on R2
(list, copy inside the bucket, else upload), `payload` points the copy about to be written at folders R2
confirmed, `after` adopts folders, deletes stale R2 objects and archives on disk only when the local
drawings copy was written (`Publish__.js:251-389`). Every drawings save runs it - including every
register transaction - so a renumber moves the pictures.

**Sources.** Web viewer: CDN (R2) -> the site's copy -> `https://www.noble-architecture.com/...`
(GitHub Pages). Localhost: repository copy -> CDN (`Source__.js:107-115`). Each picture fetched once
and held as a blob URL.

**Transport in TV.** Client: ApiClient sheet-image region (`TVM/80__CloudflareIntegration/
Na__CloudflareIntegration__ApiClient__.js:754-972`; key prefix `NaProjectPortal/`, raw `PUT /r2/upload`
with immutable cache header, `POST /r2/copy`, `/r2/list`, `/r2/delete`, base64 `/r2/write` fallback).
Worker: `TV/80__CloudflareIntegration/CloudflareWorker/src/CloudflareWorker__Main__.js` 1.1.0 routes
(`/r2/upload`, `/r2/copy` - "NOT DEPLOYED" at v2.116.0). Local: blueprint
`NAAPPS/ProjectVision__TrueVisionSheetImages__Api__.py` (`/api/truevision/sheet-images/{list,upload,
reconcile}` at lines 260, 293, 362; hash-checked names; archive never delete; one folder level) registered
at `NAAPPS/ProjectVision__LocalServer__Main__.py:69, 236`; the client recognises the server by
`/api/health` `service == 'na-projectvision-local-dev'` (`Store__.js:61-62, 88-96`).

**VV state.** Nothing, and VV's transport cannot take it yet:
- VV worker `whitecardopedia-editor-api` (`WCP/CloudflareWorker/src/index.js:140-216`) has project save,
  drawing-notes, visibility, rename, delete and one asset route `POST /api/editor/projects/{folderId}/
  assets` (base64 JSON) whose guard allows only `PresentationMode/Thumbnails`, `LayoutEditor/Linework`,
  `LayoutEditor/Snapshots`, one file deep, `.webp|.png|.json`, 25 MB
  (`CloudflareHandler__ProjectAsset__.js:51-53`). No list, copy, delete or raw upload.
- VV Flask `WCP/server.py` mirrors that guard (`:750-786`) and has no sheet-image routes; it has no
  `/api/health` (its probe is `/api/check-localhost`, `:322-330`) and runs Flask in debug mode (reloads
  itself - ledger row 83), so TV's "restart the 8090 server" message does not apply.
- VV's R2 layout is `VaApps/Projects/{folderId}/...` with assets under `LayoutEditor/...` (VV plan
  section 5.6), CDN `https://cdn.noble-architecture.com/VaApps/Projects`, GitHub Pages fallback
  `https://adam-noble-01.github.io/ValeCodebase/WebApps/Whitecardopedia/Projects` (VV
  `02__AppData/Na__AppConfig__Main.json:363-370`), localhost project files under `WCP/Projects/{year}/
  {folder}/`.
- The editing modules need TV-only editor systems: `28__System__ObjectSnap` (Crop, Handles),
  `Na__LeTools__PickUpMove` (Insert; TV v2.78.0 "Select picks Move up"), `Na__LeScope__WithAdoption`
  (Insert 1.2.0; TV v2.142.0), `Na__LeGrips__RegisterShapeProvider` (Handles; TV Grips 1.9.0).
  *Verifier correction:* the two snap names are not missing from VV - VV's older single-file engine
  `LE/30__System__SheetTools/Na__LayoutEditor__Snapping__.js` 1.2.0 exports `Na__LeOsnap__Snap` and
  `Na__LeOsnap__HideMarker` in the same namespace, and its `Snap(sheet, pointMm, exclude, tone)` honours the
  `{ kind : 'shape', id }` exclusion Crop/Handles pass and returns `{ x, y, snapped, kind }` (VV
  `Snapping__.js:246-276, 376-381`; TV `ObjectSnap__Search__.js:511-517` has the same return shape plus
  `target` and a grid fallback). S04b WP-S04b-06 turns that file into a re-export shim of the 28 units, which
  is what makes the TV import path resolve.
- *Verifier addition - service worker.* TV v2.116.0 (devlog lines 4942-4943) gave its PWA worker a fifth
  bucket, `tv-images-vN`, cache-first and capped at 160, matched by `/05__Layout__DrawingDocs__Images/<id>/<file>`
  (TV `62__Feature__AppInstallability/TrueVision__Pwa__ServiceWorker__Logic__.js:687-706, 1083, 1123`). VV's
  shared worker (`WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js`,
  buckets `:229-236`, classifier `:391-401`) has no such bucket: a `.webp`/`.jpg` picture on
  `cdn.noble-architecture.com` classifies as `other`, a `.png` as `shell` (S07a-V03, WP-S07a-11).

### B5. Persistence and transport - VV keeps its own worker and file structure (DIV-4)

The register and the images are the first features in this re-alignment whose TV code imports TV's
transport modules directly (`80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` and
`03__AppUtils/Na__AppUtils__LocalProjectMirror__.js`). VV must not copy those modules' behaviour
(NaProjectPortal prefix, `na-truevision-api`, ProjectVision server), but every ported file names them.
Two consistent ways to land them are set out as decision D-S07a-08; the recommendation is a
**VV-implemented facade at TV's module paths exporting exactly the names the ported features import**,
implemented over VV's own `whitecardopedia-editor-api` worker, Flask and `VaApps/Projects/{folderId}/`
layout (internally reusing `Na__AppUtils__R2SaveProjectJson__` and `Na__AppUtils__R2AssetUpload__`).
That keeps the 33 feature files' import lines verbatim (future TV->VV re-syncs stay mechanical) while
VV's infrastructure stays VV's. Whatever is chosen must match the DIV-4 transport slice.

The register needs, from that facade or adapter: the register block as loaded (TV
`Na__CfApi__GetLoadedProjectData`), a fresh R2 read of the project document (`ReadProjectData` - in VV a
cache-busted CDN read of `VaApps/Projects/{folderId}/project.json` works without a worker change; *verifier
correction:* use a per-call `?t=<Date.now()>` with `cache : 'no-store'`, the pattern VV's ProjectLoader uses for
the build manifest (`ProjectLoader.js:218-230`), NOT the `?v=<buildVersion>` token `FetchProjectJson` appends -
that token is read once per session and is edge-cacheable between builds, and `FetchProjectJson` is memoised
per project code (`ProjectLoader.js:289-291, 373-376`), so either route can return the copy this session
loaded, which defeats Save to R2's "changed since load" question), a key-merge save (`MergeAndSaveKeys` -> VV GET
local `/api/projects/<code>` + set block + `Na__AppUtils__R2SaveProjectJson`), a local-only merge
(`Na__LocalMirror__MergeKeys` -> Flask GET + POST `/api/projects/<code>`), and a local read for Load
Local (TV fetches `TrueVision__ProjectData__.json` by repository URL, `Register__Data__.js:320-322`; VV:
GET `${origin}/api/projects/${code}`). VV's `Na__DrawData__Save(showToast)` (VV `42__System__
DrawingViewCore/Na__DrawView__ProjectData__.js:380-429`) must grow TV's contract `(showToast, report,
registerKeys)` with `registerKeys.cloud/local/localFirst`, `report.cloudSaved/local/localKeys/
localFirstWritten/steps`, and `RegisterSaveStep` before/payload/after phases (TV `40__System__
DrawingViewCore/Na__DrawView__ProjectData__.js:710-836, 873-895`). VV's loading sequence must hand the
register block over, as it already does per block (VV `01__AppCore/Na__AppFlow__LoadingSequence.js:726-730`).

### B6. NA-specific content in scope, and the VV adaptation

| NA content | Where | VV adaptation |
|---|---|---|
| `https://www.noble-architecture.com/q/` resolver | QR Config `ProjectQr__Link__BaseUrl`, Symbol FALLBACKS `:101` | VV resolver per D-S07a-04/05; ship `Enabled:false` until it exists |
| `q/index.json` written by ProjectVision build | QR Config `IndexUrl`, README | VV index from the Whitecardopedia master index with unique keys (D-S07a-05) |
| `https://www.noble-architecture.com` GitHub Pages base | SheetImages Config `Sources__PagesBaseUrl` | `https://adam-noble-01.github.io/ValeCodebase/WebApps/Whitecardopedia` |
| `30__TrueVision__AppContent/05__Layout__DrawingDocs__Images/` | SheetImages Config Meta/Storage notes; ApiClient; local API | `VaApps/Projects/{folderId}/LayoutEditor/SheetImages/<DocumentId>/` (D-S07a-07) |
| `/api/truevision/sheet-images/*`, `na-projectvision-local-dev` | `Store__.js:61-62` | `/api/valevision/sheet-images/*`; identify by `/api/check-localhost` (precedent: VV Custom Scrapbook transport, ledger row 82) |
| PlanVision's PDF.js `/na-apps/20__PlanVision__...` | Register config PdfJs paths | VV vendors PDF.js 3.11.174 (document-relative path) |
| `'Noble Architecture Ltd'` fallback | `Register__Pdf__.js:777` | `'Vale Garden Houses Limited'` (VV `LayoutEditor__Pdf__Author` already says this) |
| `window.TrueVision__Pwa__ProjectContext` project name | `Register__Pdf__.js:212-217` | VV has no PWA context. *Verifier correction:* use VV's established source, `Na__PresentationMode__ProjectJson__GetActiveConfig().projectName` (what VV's title block Project field uses, VV `SheetRecords__.js:767-769`; S06a recommends the same for 57). `projectName` is in 155/155 local project files; `displayName` only 31/155 and `projectNameAlias` 7/155 |
| `Na__DrawData__GetProjectCode()` as the document's project code (Document IDs, `<code>_REGISTER`, PDF names, picture folders) | TV `SheetRecords__.js:1604-1607`, `Register__Pdf__.js:763-765`, `PdfExporter__.js:474-482` | *Verifier addition:* in VV that is the `?project=` token, normally the full folderId (`2026/3047__Doous`). Add a VV document-code accessor returning the loaded `project.json` `projectCode` (S07a-V01, WP-S07a-09, D-S07a-13) |
| QR FALLBACKS and fail-open enable | `Symbol__.js:100-113, 185-186` | *Verifier addition:* fail closed in VV; FALLBACKS `baseUrl` `''` until the Vale resolver exists (S07a-V02) |
| Sheet Images Setup fallback `PagesBaseUrl` `https://www.noble-architecture.com` and frame `#555041` | `SheetImages__Setup__.js:158, 184`; `Painter__.js:84` | *Verifier addition:* Setup is not NA-neutral - fallback Pages base -> VV's; frame fallbacks follow D-S07a-11 |
| NA logo aspect 4.096 | `LetterheadLogoAspect` | 4.5 (VV logo `AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png` is 2000 x 444 = 4.505) |
| Title block bronze `#555041` | SheetImages Frame colour | Keep for parity or Vale colour (D-S07a-11) |
| Phases T01-T04 (NA RIBA-like stages) | Register config | Confirm Vale stages (D-S07a-02) |
| Project codes `PS01` (2 letters + 2 digits, unique) | Document IDs, QR keys | VV numeric codes, not unique (D-S07a-03, -05) |
| "Project Portal", "TrueVision 3D Project Hub" copy | 57 Parametric Scrapbook, 52 Statement Writer (other slices) | Vale wording decision (D-S07a-06) |
| `[TrueVision3D ...]` console prefixes, `TRUEVISION3D` banners | all files | `[ValeVision3D ...]`, `VALEVISION3D` + PORT NOTE blocks |

### B7. Tests

| TV test | What it proves | VV action |
|---|---|---|
| `Na__Test__ProjectQr__.test.mjs` (469 lines, 50 checks at v2.120.0) | Independent decoder for versions 1-10; config held to its print floor; Portal grey contrast; **section 4: every portal project is in `NAWEB/q/index.json`** (`:335-358`, reads `REPO_ROOT/q` and `REPO_ROOT/na-project-portal`) | Port; sections 1-3, 5-6 verbatim (paths `51__System__LayoutEditor/53__Feature__ProjectQrCode` identical); section 4 rewritten against VV's resolver index and `WCP/Projects/` (or skipped while `Enabled:false`); floor check uses VV `MinModuleMm`. *Verifier:* the harness stages ProjectLoader alone (`:82-91`) but VV's imports `./Na__AppUtils__ResilientLoad__.js` (VV `:77`) - stage it too; section 4's "every code is a version 3 symbol" must become the Vale address's version (4 for option A) |
| `Na__Test__ProjectQr__Decode__.py` (117) | OpenCV reads every dumped case in both inks | Port verbatim (needs numpy + opencv-python) |
| `Na__Test__SheetImages__.test.mjs` (474, 90 checks at v2.121.0) | Geometry, painter, record normaliser, the save step through 9 scenarios with in-memory R2/Flask stubs | Port; stubs re-pointed at the VV facade names (unchanged if D-S07a-08 option A) |
| `Na__Test__SheetImagesApi__.test.py` (152, 24 checks) | The Flask blueprint via test client on a temp portal | Port against `WCP/Server__ValeVisionSheetImages__Api__.py`; keep `sys.dont_write_bytecode` (VV ledger row 85 lesson) |
| `Na__Test__DocumentKeys__.test.mjs` (269) | Document keyboard and key scope - `Doc__Save` through the statements and specification registrations (verifier: it never registers the register tab) | Port with the 31 DocumentKeys slice |
| `Na__Test__TitleBlockScaleCell__.html` (194) | The modern strip through the real chrome | Port with the title block slice; renders the QR cell when a project is on the address bar |
| (none) | TV has **no register test** | New `Na__Test__RegisterNumbering__.test.mjs`: Plan (jumps, backward jump refused, prefix/digits validation), ComposeDocumentId (v2.71.0's case list), transaction rollback on R2 failure; back-port to TV |
| VV `Na__Test__TitleBlockCells__.test.mjs:115` | Asserts VV keeps `DrawingNumber` | Must flip to `DocumentId` with WP-S07a-01 |

### B8. Ledger and documentation state

- VV ledger rows to rewrite when this lands: 86 (Drawing Register "not ported"), 121 (title block row is
  DrawingNumber), 125 (register STATUS "n/a"), 126 (QR cell "not part of this port; 53__System__ProjectQrCode
  does not exist here" - also the old folder name), 220 (`'register-updated'` "not reachable"), 321-339
  (short tabs: "ValeVision has no Drawing Register"; Panel__Sheet divergence; Document ID "not ported"),
  1176-1177 (register margin and warm palette "not applicable").
- VV History's DEVELOPMENT LOG has two "Version 1.3.0" entries (lines 49 and 80) around a 1.4.0 (line 56):
  re-read before numbering the register entry (use 1.5.0 or later).
- TV: `TV/TrueVision__PLAN__SheetImages__.md` section 9 "ValeVision port | OPEN"; README/config stale QR
  paths (B3); the two header gaps (B1); the yellow/amber defect (B1).

### B9. Import resolution matrix (the 26 unresolved import statements)

Computed by `scratchpad/parity/slices/work/s07a_import_check.py` (relative named imports from the 33
files that leave the three feature folders; `40__System__DrawingViewCore` mapped to VV's `42__`). Verifier
re-ran it on 01-Oct-2026: 58 statements, 32 resolve, 26 do not, 37 distinct missing names. It checks names
only, not signatures (e.g. it cannot see that VV's `Na__DrawData__Save(showToast)` lacks TV's `report` and
`registerKeys` arguments) and ignores dynamic loads (Register__Preview adds PDF.js as a classic script).

Fan-in the other way (verifier): TV files OUTSIDE the three folders that import them - ModeController (51,
54), SheetModel__Sheets (51 Numbering), SheetRecords (54 Geometry), SheetChrome (53 Painter, 54 Painter),
TitleBlock__QrCell (53 Symbol), ShapeGeometry (53 Symbol, 54 Paint), SheetTools ContextMenu and PointerPress
(54), Panel__Sheet (51 Transactions), Toolbar (54 Insert), PdfExporter (54 Pdf), Statement Page, Publish,
DrawingSchedule__Live and TrueVisionHub (51 Pdf, 53), Panel__ScrapbookParametric (53 ProjectLink). Keeping the
three paths identical keeps all of these verbatim; nothing is renamed, so no importer breaks.

| Importing TV module | Needs from | Missing in VV |
|---|---|---|
| Register__Data, Editor, Pdf, Preview | `03__Core__Config/...ConfigState__.js` | `Na__LeCfg__GetDrawingRegisterSetup` |
| Register__Pdf | `07__Core__SheetData/...SheetModel__.js` | `Na__LeModel__GetPhase`, `Na__LeModel__GetDocumentId` |
| Register__Transactions | same | `GetPhase`, `ComposeDocumentId`, `FinishRegisterDeletion`, `NotifyRegister` |
| Register__Transactions | `07__Core__SheetData/...AutoSave__.js` | `Na__LeAuto__Suspend`, `Resume`, `DiscardSavedDraft` |
| Register__Data, Pdf | `TVM/80__CloudflareIntegration/...ApiClient__.js` (file absent) | `GetLoadedProjectData`, `MergeAndSaveKeys`, `ReadProjectData`, `ProjectFileLocation` |
| Register__Data, Transactions | `TVM/03__AppUtils/Na__AppUtils__LocalProjectMirror__.js` (absent) | `Na__LocalMirror__MergeKeys` |
| Register__Pdf | `60__Feature__PdfExport/...PdfFonts__.js` (absent) | `EnsureLoaded`, `Install`, `SetFont` |
| Register__Editor | `31__System__DocumentKeys/...` (absent) | `Na__LeDocKeys__Register`, `KeyLabel` |
| Register__Editor | `65__Feature__DocumentPublishing/...Publish__Panel__.js` (absent) | `Na__LePubPanel__Open` |
| Register__Editor | `66__Feature__DocumentSharing/...Share__Button__.js` (absent) | `Na__LeShareUi__Open` |
| ProjectQr__ProjectLink, SheetImages__Store | `03__AppUtils/Na__AppUtils__ProjectLoader.js` | `GetProjectFolderFromUrl`, `GetYearFromUrl` (VV identity differs - adapt, do not add) |
| SheetImages__Crop, Handles | `28__System__ObjectSnap/...ObjectSnap__Search__.js` (absent) | `Na__LeOsnap__Snap`, `HideMarker` - *verifier: both exist in VV at `30__System__SheetTools/Na__LayoutEditor__Snapping__.js` (same namespace, call-compatible for the 3-argument form used); the path resolves once S04b WP-S04b-06 makes that file a shim* |
| SheetImages__Handles | `30__System__SheetTools/...Grips__.js` | `Na__LeGrips__RegisterShapeProvider` |
| SheetImages__Insert | `30__System__SheetTools/...ToolState__.js` | `Na__LeTools__PickUpMove` |
| SheetImages__Insert | `30__System__SheetTools/...EditScope__.js` | `Na__LeScope__WithAdoption` |
| SheetImages__Publish | `42__System__DrawingViewCore/...ProjectData__.js` | `Na__DrawData__RegisterSaveStep` |
| SheetImages__Publish | `07__Core__SheetData/...SheetRecords__.js` | `Na__LeRec__DocumentId` |
| SheetImages__Publish, Source | `TVM/80__CloudflareIntegration/...ApiClient__.js` (absent) | `IsConfigured`, `SHEET_IMAGES_ARCHIVE`, `ListSheetImages`, `UploadSheetImage`, `CopySheetImage`, `DeleteSheetImage`, `SheetImageLocation` |

Path seam to apply in every ported file that reaches the drawing core:
`../../40__System__DrawingViewCore/` -> `../../42__System__DrawingViewCore/` (Register__Data, Transactions,
Pdf; SheetImages core and Publish).

---

## (c) Module-by-module table

State key: tv-only = no VV file. "Proposed VV path" is relative to `VV/`; every LE path is identical to TV's.

### C1. Drawing Register (`02__Src__AppModules/51__System__LayoutEditor/51__Feature__DrawingRegister/`)

| TV path (file) | TV ver | Proposed VV path | VV ver | State | What VV lacks / differs (TV devlog) | Action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|---|---|
| `Na__LayoutEditor__Register__Data__.js` (377) | 1.0.1 | same | - | tv-only | Register block, browser draft, Save/Load notes, conflict ask (created 19-Sep-2026; v2.69-v2.71 era) | port_adapted | 40->42 path; `Na__CfApi__*`/`Na__LocalMirror__*` via VV facade (D-08); Load Local = GET `/api/projects/<code>`; console prefix | WP-01, WP-02 |
| `Na__LayoutEditor__Register__Transactions__.js` (425) | 1.2.0 | same | - | tv-only | Confirmed Metadata/Renumber/Override/Move/Delete, R2 rollback, Retry Local Sync; status (v2.79.0), ApplySheetName (v2.70.0) | port_adapted | 40->42 path; VV `Na__DrawData__Save(toast, report, registerKeys)` incl. `localFirst`; AutoSave Suspend/Resume/DiscardSavedDraft; facade MergeKeys | WP-01, WP-02 |
| `Na__LayoutEditor__Register__Numbering__.js` (113) | 1.0.1 | same | - | tv-only | Plan/Apply numbering, jumps, validation | port_verbatim | none (pure leaf); also imported by `07__Core__SheetData/...SheetModel__Sheets__.js` RenumberSheets | - |
| `Na__LayoutEditor__Register__DeleteDialog__.js` (64) | (none) | same | - | tv-only | Typed-number delete confirmation | port_verbatim | add standard header + PORT NOTE + DEVELOPMENT LOG (also fix in TV) | - |
| `Na__LayoutEditor__Register__Editor__.js` (688) | 1.3.0 | same | - | tv-only | Edit/Read tab, bar, rows, expanded row; Share (v2.166.0), Ctrl+S (v2.112.0), Status column (v2.79.0), Publish button (v2.155.0) | port_adapted | Only seams: imports of 31/65/66 (`:90-99`) until those systems land (D-10); CSS self-link via `import.meta.url` works unchanged | WP-01..03, 31, 65, 66 |
| `Na__LayoutEditor__Register__Pdf__.js` (846) | 1.1.0 | same | - | tv-only | Register PDF: embedded font (v2.69.0), letterhead (v2.72.0), DWG No. (v2.76.1), tracked text (v2.78.1), code columns (v2.71.0) | port_adapted | 40->42 path; PdfFonts dependency (D-09); project name from `Na__PresentationMode__ProjectJson__GetActiveConfig().projectName` (verifier: not displayName/alias); register number from the VV document-code accessor, not the `?project=` token (S07a-V01); `:777` fallback 'Vale Garden Houses Limited'; fix yellow/amber `:644` | WP-01, WP-02, WP-09, PdfFonts |
| `Na__LayoutEditor__Register__Preview__.js` (204) | 1.1.0 | same | - | tv-only | PDF.js rasteriser at device pixel ratio (v2.69.0) | port_verbatim | Paths come from config: vendor PDF.js in VV | PDF.js vendoring |
| `Na__LayoutEditor__Register__Export__.js` (171) | 1.0.1 | same | - | tv-only | Sequential pack export | port_verbatim | Needs VV `Na__LePdf__ExportSheet(sheet, toast, options)` with `options.strict` (VV `PdfExporter__.js:303` takes 2 args; TV `:548`) | PdfExporter slice |
| `Na__LayoutEditor__Register__Notes__.js` (196) | 1.0.1 | same | - | tv-only | Revision history cards | port_verbatim | none (fix the level name with Pdf) | - |
| `Na__LayoutEditor__Styles__DrawingRegister__.css` (575) | (19-Sep STATUS) | same | - | tv-only | Register page styles | port_verbatim | Tokens `--Na_Le_Stage/Ink/InkMuted/Paper/PaperShadow/PaperGap` already defined in VV `10__Core__SheetSurface/Na__LayoutEditor__Styles__Surfaces__.css`; header text | - |

### C2. Project QR Code (`02__Src__AppModules/51__System__LayoutEditor/53__Feature__ProjectQrCode/`)

| TV path (file) | TV ver | Proposed VV path | VV ver | State | What VV lacks / differs | Action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|---|---|
| `Na__ProjectQr__Encoder__.js` (863) | 1.0.0 | same | - | tv-only | QR encoder v1-10 (v2.81.0) | port_verbatim | Banner/PORT NOTE only. Lineage: Vale Lantern Designer `VCB/WebApps/Vale__LanternDesigner/02__Src__AppModules/03__AppUtils/VghLantern__AppUtils__QrEncoder__.js` | - |
| `Na__ProjectQr__Painter__.js` (226) | 1.0.0 | same | - | tv-only | One-path SVG/jsPDF painter | port_verbatim | Banner only | - |
| `Na__ProjectQr__Symbol__.js` (397) | 1.2.0 | same | - | tv-only | One door; print guard; index check (v2.81.0); portal grey (v2.120.0) | port_adapted | FALLBACKS mirror VV config with `baseUrl` `''` until the resolver exists; **fail closed** (IsEnabled false when the config cannot be read - TV fails open, `:185-186`); VerifyEntry against VV index schema; console prefix | ProjectLink, D-04/05; WP-10 (ShapeGeometry imports it) |
| `Na__ProjectQr__ProjectLink__.js` (196) | 1.1.0 | same | - | tv-only | Address builder (v2.81.0) | port_adapted | `CurrentProject()`: `{projectCode}` = the permanent resolver key (D-05/D-14), `{projectFolder}`/`{year}` from the master index via `Na__AppUtils__NormalizeProjectFolderId(?project=)` (verifier: NOT `project.json` `folderId`, missing 10/155 and stale 54/155; NOT the raw token, usually a folderId); gate on a resolved folder | D-05, D-14 |
| `Na__ProjectQr__Config__.json` (47) | - | same | - | tv-only | Address, symbol, note | port_adapted | `Enabled:false` AND `BaseUrl` `''` until a resolver; QueryPattern/IndexUrl per D-04/05; `MinModuleMm` 0.265 if option A; notes rewritten; plus VV AppConfig `LayoutEditor__TitleBlock__QrCellEnabled:false` | D-04, D-05 |
| `README__ProjectQrCode__.md` (166) | - | same | - | tv-only | Rules and proofs | port_adapted | VV resolver, never-move rule for VV `q/` | - |
| `LE/10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__QrCell__.js` (479) | 1.0.0 | same | - | tv-only | Title block QR cell, compact form on narrow paper (v2.81.0) | port_verbatim | Coordinate with the title block slice | SheetChrome 'qr', Modern 1.3.0 hook |

### C3. Sheet Images (`02__Src__AppModules/51__System__LayoutEditor/54__Feature__SheetImages/`)

| TV path (file) | TV ver | Proposed VV path | VV ver | State | What VV lacks / differs | Action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|---|---|
| `Na__LayoutEditor__SheetImages__.js` (196) | 1.0.0 | same | - | tv-only | Entry point: Ready/Initialize/AttachInput (v2.116.0) | port_adapted | 40->42 path only | ModeController |
| `...SheetImages__Setup__.js` (212) | 1.1.0 | same | - | tv-only | Config reader leaf (v2.121.0 quality/print dpi) | **port_adapted** (verifier; was port_verbatim) | fallback `PagesBaseUrl` `https://www.noble-architecture.com` (`:184`) -> VV Pages base; frame fallback `#555041` (`:158`) per D-11 | WP-10 (early leaf) |
| `...SheetImages__Geometry__.js` (472) | 1.1.0 | same | - | tv-only | Box/crop/scale/StoreSize/names leaf | port_verbatim | - | WP-10 (early leaf: TV SheetRecords 1.39.0 imports it) |
| `...SheetImages__Painter__.js` (229) | 1.0.0 | same | - | tv-only | 'picture' primitive SVG/jsPDF leaf | port_verbatim | frame fallback `555041` (`:84`) per D-11 | SheetChrome 1.11.0 hook; WP-10 (early leaf) |
| `...SheetImages__Paint__.js` (172) | 1.0.0 | same | - | tv-only | Shape -> primitive, shadow filter id | port_verbatim | - (verifier: imports Source, so it needs the shim's `SheetImageLocation`) | ShapeGeometry 1.7.0 hook; WP-10 |
| `...SheetImages__Pdf__.js` (112) | 1.0.0 | same | - | tv-only | Print copies before a page | port_verbatim | - (verifier: imports Source and Encode) | PdfExporter 1.8.0 hook; WP-10 |
| `...SheetImages__Encode__.js` (389) | 1.1.0 | same | - | tv-only | WebP store, SHA-256 names, Recut, shadow PNG | port_verbatim | - | WP-10 (Pdf imports it) |
| `...SheetImages__Source__.js` (304) | 1.0.0 | same | - | tv-only | R2 -> site -> Pages; localhost repo first | port_adapted | VV `SheetImageLocation` (CDN `VaApps/Projects/...`, localhost `${origin}/Projects/...`, GH Pages); `PagesBaseUrl` VV; folder from the master index, not `project.json` `folderId` (S07a-V05) | WP-10 (shim `SheetImageLocation` read side first), WP-06 |
| `...SheetImages__Store__.js` (208) | 1.0.0 | same | - | tv-only | Local server routes | port_adapted | `/api/valevision/sheet-images/*`, query `folder-id`, probe `/api/check-localhost`, no restart wording | WP-06 |
| `...SheetImages__Publish__.js` (464) | 1.1.0 | same | - | tv-only | The save step; print-size cut (v2.121.0) | port_adapted | 40->42 path; facade names | RegisterSaveStep, DocumentId, WP-06 |
| `...SheetImages__Insert__.js` (382) | 1.2.0 | same | - | tv-only | Drop/pick/replace; joins open group (v2.142.0) | port_verbatim | - | PickUpMove, WithAdoption |
| `...SheetImages__Handles__.js` (259) | 1.0.0 | same | - | tv-only | Corner grips, snapping | port_verbatim | - | Grips 1.9.0, 28 ObjectSnap (S04b WP-S04b-06; VV `Snapping__.js` already exports the two names) |
| `...SheetImages__Crop__.js` (525) | 1.0.0 | same | - | tv-only | Crop overlay | port_verbatim | - | 28 ObjectSnap (S04b WP-S04b-06; as above) |
| `...SheetImages__Menu__.js` (118) | 1.0.0 | same | - | tv-only | Right-click rows | port_verbatim | - | SheetTools ContextMenu 1.2.0 |
| `Na__LayoutEditor__Panel__SheetImages__.js` (309) | 1.1.0 | same | - | tv-only | Images panel | port_verbatim | - | ModeController registration |
| `...SheetImages__Config__.json` (122) | Meta 1.1.0 | same | - | tv-only | Storage, placement, frame, crop, pdf, sources, labels | port_adapted | Meta/Storage notes to VV folders; `Sources__PagesBaseUrl`; Frame colour per D-11 | D-07, D-11 |
| `Na__LayoutEditor__Styles__SheetImages__.css` (236) | 1.1.0 | same | - | tv-only | Drop look, grips, crop, panel | port_verbatim | Add to VV loader `Na__LeLoad__STYLESHEETS` before the WebViewer sheet | Loader |

### C4. Transport, infrastructure and shared-file hooks

| TV item | TV ver | VV counterpart | VV ver | State | Gap | Action |
|---|---|---|---|---|---|---|
| `NAAPPS/ProjectVision__TrueVisionSheetImages__Api__.py` | 1.0.0 | `WCP/Server__ValeVisionSheetImages__Api__.py` (new) + `WCP/server.py` registration | - | absent | upload/reconcile/list | build_vv_transport |
| ApiClient sheet-image region `TVM/80__CloudflareIntegration/...ApiClient__.js:754-972` | 1.5.0 | VV facade (D-08) | - | absent | location/list/upload/copy/delete | build_vv_transport |
| TV worker `/r2/upload`, `/r2/copy` | 1.1.0 | `WCP/CloudflareWorker/src` routes | - | absent | guard + list/copy/delete | build_vv_transport |
| `NAWEB/q/index.html` + `index.json` | - | `VCB/q/` (new; `VCB/t/` precedent) | - | absent | resolver + unique-key index | build_vv_transport (D-04/05) |
| `LE/07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js` | 1.39.0 | same | 1.15.0 | drifted | Phase/ComposeDocumentId/DocumentId (v2.71.0); NormaliseShapeQr 1.24.0; 'image' layer + NormaliseShapeImage 1.27.0/1.29.0 | port_whole_reapply_vv (owned by 07 slice) |
| `.../Na__LayoutEditor__SheetModel__.js` / `__Sheets__.js` | 1.35.1 / 1.4.0 | same | 1.18.0 / 1.1.0 | drifted | GetPhase/GetDocumentId/ComposeDocumentId, NotifyRegister, FinishRegisterDeletion, RenumberSheets from register, Save report.steps (1.29.0) | port_adapted |
| `.../SheetModel__Shapes__.js` / `__Layers__.js` | 1.6.0 / 1.4.0 | same | 1.0.0 / 1.0.0 | drifted | UpdateShape `qr` (1.1.0); ShapeLayerType 'image' (1.3.0); DeleteLayer rehomes pictures (1.2.1) | port_adapted |
| `.../Na__LayoutEditor__History__.js` | 1.7.0 | same | 1.4.0 (log misnumbered) | drifted | `'register-updated'` rewrite incl. Status/Phase/DocumentId (TV `:233-247`, 1.6.0) | port_adapted |
| `60__Feature__PdfExport/Na__LayoutEditor__PdfFilename__.js` (verifier) | 1.0.0 | same | 1.0.0 | header-only | none - it is a pure builder; the v2.71.0 change "exports named after DocumentId" is in PdfExporter's `Na__LePdf__Filename` (TV `PdfExporter__.js:474-482`, `code : fields.DocumentId`; VV `:245-252` passes `fields.DrawingNumber`) | no change here; edit PdfExporter |
| `WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js` (verifier) | TV SW logic 1.9.15+ (`tv-images-vN`) | VV shared SW | token `2026-09-18-1` | absent | no sheet-picture bucket or pattern (S07a-V03) | update_wiring (WP-11) |
| `.../Na__LayoutEditor__AutoSave__.js` | 1.5.0 | same | 1.3.0 | drifted | Suspend/Resume/DiscardSavedDraft; ignore 'register-updated' | port_adapted |
| `LE/10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js` | 1.14.0 | same | 1.5.0 | drifted | 'qr' primitive (1.9.0, `PushQr :522`); 'picture' (1.11.0, `:809, :984`) | port_adapted |
| `.../Na__LayoutEditor__TitleBlock__Modern__.js` | 1.5.0 | same | 1.2.0 | drifted | QR cell Solve/Build (1.3.0, `:134, :291, :337`) | port_adapted |
| `LE/15__Core__Markup/Na__LayoutEditor__ShapeGeometry__.js` | 1.9.0 | same | 1.5.0 | drifted | Shape__Qr (1.6.0, `PushQr :440`), picture push + hit (1.7.0, `:313, :464`), portal grey (1.8.0) | port_adapted |
| `LE/30__System__SheetTools/Na__LayoutEditor__Grips__.js` | 1.12.0 | same | 1.8.0 | drifted | RegisterShapeProvider (1.9.0) | port_adapted |
| `.../SheetTools__PointerPress__.js` | 1.10.0 | same | 1.1.0 | drifted | Double-click crops (1.3.0, `:271, :872`) | port_adapted |
| `.../Na__LayoutEditor__EditScope__.js` | 1.4.0 | same | 1.1.0 | drifted | Picture not enterable (1.1.1); WithAdoption (v2.142.0) | port_adapted |
| `.../SheetTools__ContextMenu__.js` | 1.7.0 | same | 1.2.0 | drifted | Picture rows (1.2.0, `:203, :443`) | port_adapted |
| `.../Na__LayoutEditor__Eyedropper__.js` | 1.9.0 | same | 1.7.0 | drifted | Picture neither source nor target (1.8.1) | port_adapted |
| `LE/40__Ui__Panels/...Panel__Shapes__.js`, `Panel__Layers__.js` | 1.9.0 / 1.3.0 | same | 1.8.0 / 1.1.0 | drifted | Pictures excluded (1.8.2); "Images" type (1.1.1) | port_adapted |
| `.../Na__LayoutEditor__Panel__Sheet__.js` | 1.4.0 | same | 1.4.0 (diverged) | drifted | Register owns numbering: DocumentId row hidden; name/revision via `Na__LeRegEdit__Metadata` (TV `:117, :195, :306, :315`) | port_adapted (retire VV divergence) |
| `.../Na__LayoutEditor__Toolbar__.js` | 1.24.0 | same | 1.9.0 | drifted | Image button (1.18.0, `:221, :465`) | port_adapted |
| `LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js` | 1.32.0 | same | 1.18.0 | drifted | Register view/mount/open (TV `:357-360, :429, :502, :928-939`); images (1.26.0, `:295, :341, :547, :578, :582, :1059, :1082, :1151, :1193, :1209`) | port_adapted |
| `.../Na__LayoutEditor__TabStrip__.js` | 2.0.0 | same | 1.5.0 | drifted | Document Register tab (`:353-356`) | port_adapted (TabStrip slice) |
| `LE/01__Core__Loader/Na__LayoutEditor__Loader__.js` (VV-only) | - | same | VV | vv-only | needs VIEW_REGISTER copy, CheckNames row, OpenRegister facade, SheetImages CSS in STYLESHEETS | keep_vv_divergence + update_wiring |
| `LE/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js` | 1.12.0 | same | 1.2.0 | drifted | `options.strict`; `Na__LeImgPdf__Prepare` (1.8.0, `:173, :501`); 'qr'/'picture' offsets (`:229-230`) | port_adapted |
| `.../Na__LayoutEditor__PdfFonts__.js` | 1.0.0 | same | - | tv-only | Embedded Open Sans | missing_module (PdfExport slice) |
| `LE/03__Core__Config/...ConfigState__EditorSetup__.js` / `__SheetSetup__.js` / `ConfigState__.js` / AppConfig | 1.6.0 / 1.9.0 / 1.29.0 | same | 1.0.0 / 1.3.0 / 1.17.0 | drifted | GetDrawingRegisterSetup; QrCell readers (1.5.0/1.6.0); register block; QrCell keys; 'images' accordion; RegisterTab labels; row key DocumentId. *Verifier:* the reader's own fallbacks are NA too - PlanVision PDF.js paths (TV `EditorSetup__.js:403-404`), NA phases (`:419`, `Na__LeCfg__REGISTER_PHASES`), logo aspect 4.096 (`:423`) - and must carry the VV values like the JSON (S03a's EditorSetup row says the same) | port_adapted |
| `LE/80__Feature__WebViewer/Na__LayoutEditor__WebViewer__.js` | 1.2.0 | same | 1.1.0 | drifted | Register in the dock, `ShowRegister` (TV `:188, :207, :621`), Share | port_adapted (WebViewer slice) |
| `TVM/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js` | 1.6.0 | `VVM/42__System__DrawingViewCore/...` | 1.2.0 | drifted | `Save(toast, report, registerKeys)`, RegisterSaveStep (1.4.0), report.steps | port_adapted (DrawingViewCore slice; DIV-4) |
| `VVM/01__AppCore/Na__AppFlow__LoadingSequence.js` | - | VV | - | vv path | Hand over `LayoutEditor__DrawingRegister` block | update_wiring |

### C5. Tests

| TV test | Lines/checks | VV target | Action |
|---|---|---|---|
| `80__Testing__PrototypeEnvironment/Na__Test__ProjectQr__.test.mjs` | 469 / 50 | same path | port_test (section 4 adapted) |
| `.../Na__Test__ProjectQr__Decode__.py` | 117 | same | port_test (verbatim) |
| `.../Na__Test__SheetImages__.test.mjs` | 474 / 90 | same | port_test (stubs) |
| `.../Na__Test__SheetImagesApi__.test.py` | 152 / 24 | same, driving `WCP/Server__ValeVisionSheetImages__Api__.py` | port_test (adapted) |
| `.../Na__Test__DocumentKeys__.test.mjs` | 269 | same | port_test with 31 slice |
| `.../Na__Test__TitleBlockScaleCell__.html` | 194 | same | port_test with title block slice |
| `.../Na__Test__ScrapbookProjectQr__.test.mjs` | (55 checks at v2.100.0) | same | port_test with 57 Parametric Scrapbook slice (needs QR + Shape__Qr) |
| (new) `Na__Test__RegisterNumbering__.test.mjs` | - | VV first | port_test (author; back-port to TV) |
| VV `Na__Test__TitleBlockCells__.test.mjs:115` | - | VV | update to DocumentId |
| (verifier) VV `Na__Test__TitleBlockCells__.html:95` | fixture `Sheet__Fields__DrawingNumber '57079-NN'` | VV | re-check with WP-S07a-01 |
| (verifier) TV tests owned by other slices that embed this slice's names: `Na__Test__HatchLineControls__` (`:337-339`) and `Na__Test__VectorBooleans__` (`:372-374`) stub `Na__ProjectQr__GetSymbol/GetSetup/CheckPrint`; `Na__Test__SheetsNormaliseOnce__` (`:82-91`) stubs `Na__LeRegNum__Plan/Apply` and `Na__LeRec__Phase/DocumentId/ComposeDocumentId`; `Na__Test__StatementSchedule__` (`:68`) stages `53__Feature__ProjectQrCode` and reads the register rows; `Na__Test__PublishedSchema__` (`:190-191`) composes DocumentId | - | S05b, S03b, S07b, S08 | their stubs only match if the 51/53 names land verbatim; port them after (or with) WP-S07a-01/-10 |

---

## (d) Wiring notes

**D1. ModeController (VV `LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js` 1.18.0).** Add,
in TV's order (TV 1.32.0 line refs in brackets):
- Imports: `Na__LeRegEd__Mount/Show/Hide` [358], `Na__LeReg__Initialize` [359], `Na__LeRegEdit__Initialize`
  [360], `Na__LeImg__Ready/Initialize/Is/AttachInput/DetachInput` [295], `Na__LePanelImages__Register` [341].
- Constant `Na__LeMode__VIEW_REGISTER = 'register'` [429] beside VV's `:287-288`; export it and
  `Na__LeMode__OpenRegister` [1277, 1284] (VV exports at `:890-891`).
- Build (VV `:375-441`): `Na__LeRegEd__Mount(host, { editable, showToast, navigation : { enter, openRegister } })`
  straight after `Na__LeSurface__Mount` [502] - for the viewer too; the viewer branch's `Na__LeVw__Build`
  callbacks gain `openRegister` [512]; `Na__LePanelImages__Register()` after `Na__LePanelShapes__Register()`
  (TV registers it after the Vector Tools panel [547], which VV does not have yet).
- `OpenRegister(options)` [928-939]: EnterUnder (quiet entry from 3D, v2.158.0 - TabStrip slice),
  `Na__LeText__Commit`, DetachSheetInput, hide spec (and statements when ported), viewer `ShowRegister`,
  `View = VIEW_REGISTER`, `Na__LeRegEd__Show(options)`, Dispatch. `Na__LeRegEd__Hide()` in Enter, Leave and
  OpenSpecification [690, 765, 900, 959].
- AttachSheetInput / DetachSheetInput (VV `:448-459`): `Na__LeImg__AttachInput()` last on attach [578],
  `Na__LeImg__DetachInput()` first on detach [582].
- SectionForKind (VV `:736`): `'images'` for a selection of pictures [1059, 1082]; OnSheetsChanged refresh
  `'images'` on shape changes [1151].
- *Verifier addition:* the same model-change handler's `'register-updated'` branch,
  `else if (reason === 'register-updated') Na__LeSurface__Refresh('chrome');` [1142], so a register save
  repaints the title block of the open sheet; it goes beside VV's `'sheet-updated' || 'fields'` branch (VV `:780`).
- ReadyOnce (VV `:828`): add `Na__LeImg__Ready()` [1193] (and `Na__LeDocKeys__Ready()` with the 31 slice);
  after `Na__LeAuto__Initialize` add `Na__LeReg__Initialize(o)` + `Na__LeRegEdit__Initialize(o)` [1200-1202];
  after the spec/link/snap/viewId initialisers add `Na__LeImg__Initialize({ editable, showToast })` [1209].

**D2. Lazy loader (VV-only `LE/01__Core__Loader/Na__LayoutEditor__Loader__.js`).** Add
`Na__LeLoad__VIEW_REGISTER = 'register'` beside `:115-116`, a CheckNames row (`:284-296`), and
`Na__LeLoad__OpenRegister(options)` = `WithEditor((e) => e.mode.Na__LeMode__OpenRegister(options), quiet)`
beside `OpenSpecification` (`:606-608`); export it. Add
`../54__Feature__SheetImages/Na__LayoutEditor__Styles__SheetImages__.css` to `Na__LeLoad__STYLESHEETS`
(`:125-134`) before the WebViewer sheet, which must stay last. The register CSS needs no entry (it is
self-linked at Mount, `Register__Editor__.js:594-597`). Pre-load labels fall back to the caller's string
(`:558-560`), so the tab label fallback must be "Document Register".

**D3. Tab strip.** TV 2.0.0 adds the Document Register tab from the 3D view onwards (`TabStrip__.js:353-356`,
labels `RegisterTab`, `RegisterTabTitle`). In VV's 1.5.0 strip (per-sheet tabs, Specification only while a
drawing is open, `:342-350`) the minimum is a Register tab beside the Specification tab calling
`Na__LeLoad__OpenRegister`; parity is the 2.0.0 compact strip (TabStrip slice). Either way the tab must go
through the loader facade, never import the editor.

**D4. Project data and save contract (DrawingViewCore slice; DIV-4).** VV `Na__DrawData__Save` must accept
`(showToast, report, registerKeys)`: merge `registerKeys.cloud` keys into the document written to R2,
`registerKeys.local` into the local copy, honour `localFirst` (Flask POST first; abort before R2 on failure),
fill `report.cloudSaved/local/localKeys/localFirstWritten/steps`, and run registered save steps before /
payload / after (TV `:710-836, :873-895`). VV's `R2SaveProjectJson` returns `{ r2Success, localSuccess }`
(VV `:184-216`) - map `localSuccess` to `report.local.ok` and `ctx.local.ok` for the images' after phase.
The loading sequence hands over `projectData.LayoutEditor__DrawingRegister` beside the drawings block (VV
`LoadingSequence.js:726-730`).

*Verifier additions to D4.* (1) The save-step context is a contract, not just three phase names: TV hands each
step `ctx.block` (the drawings block about to be written), `ctx.state` (per-step scratch, Sheet Images keeps
`ctx.state.sheetImages`), `ctx.note(message, isError)` (feeds `report.steps`) and, in `after`, `ctx.local`
(`{ ok }` of the local write) - TV `ProjectData__.js:860-895`, consumed at `SheetImages__Publish__.js:253-389`. VV's
Save must build the same object. (2) The same loading-sequence dispatch should also hand over the document code
(`projectData.projectCode`) for the VV accessor of S07a-V01 - the `projectCode` it passes today is the URL token.
(3) This facade is the same one S09 specifies as "same-name shims" (D-S09-04, WP-S09-06): build it once there.

**D5. Sheet model / records / history / autosave.** v2.71.0 schema functions and the register hooks listed in
C4; `'register-updated'` must be ignored by AutoSave (VV `:135`) and rewrite kept steps in History. Keep VV's
`Na__LayoutEditor__DrawingCode__.js` leaf split (the loader names tabs before the editor loads); if the
pre-load hover is to show the whole Document ID, give the leaf a pure `Compose(format, project, phase,
drawing)` and let the facade read format/default phase from the AppConfig it already fetches, otherwise the
hover shows the stored number until the editor loads (decision for the TabStrip slice).

*Verifier additions to D5.* (1) TV's `Na__LeModel__RenumberSheets` (TV `SheetModel__Sheets__.js:261-272`) renumbers
the whole pack from the config series even when a project has NO register block (that is how PS01 was flattened,
devlog v2.70.0 lines 9654-9661). S03b's table says the opposite for VV ("be a no-op without a
`LayoutEditor__DrawingRegister` block"). Which one VV gets IS decision D-S07a-01: adopt the register -> TV
behaviour; no register -> S03b's no-op guard. (2) These are the same files S03b ports whole
(`port_whole_reapply_vv`: SheetRecords, the SheetModel facade, Sheets, History, as WP-S03b-03/04). WP-S07a-01 must
ride with those ports, not land as separate hunks on VV's old files. (3) S03b D-S03b-02 already proposes giving
VV's `DrawingCode` leaf a pure `ComposeDocumentId` and back-porting the leaf to TV - consistent with this section.

**D6. Title block and markup (QR).** SheetChrome 'qr' primitive; TitleBlock Modern Solve/Build of the QR cell;
ConfigState__SheetSetup QrCell readers; AppConfig `LayoutEditor__TitleBlock__QrCell*` keys (VV has none);
ShapeGeometry `PushQr`; SheetRecords `NormaliseShapeQr`; SheetModel__Shapes `qr` patch key; PdfExporter
'qr' offset. With `ProjectQr__Enabled:false` the cell solves to null and the strip is unchanged
(`TitleBlock__QrCell__.js` header "NO CODE, NO CELL") - *verifier: only while the config JSON loads; see the
fail-open note in B3. Ship VV with `BaseUrl ''`, a fail-closed Symbol, and `LayoutEditor__TitleBlock__QrCellEnabled:false`
(read at TV `ConfigState__SheetSetup__.js:265`, tested at `TitleBlock__QrCell__.js:309`).* Ordering (verifier):
SheetChrome 1.14.0, ShapeGeometry 1.9.0 and SheetRecords 1.39.0 are ported whole by S03b and import the 53/54
render leaves, so those leaves land first as WP-S07a-10, before the hooks in this section.

**D7. Pictures across the editor.** The TV v2.116.0 "Shared files" list (devlog lines 4921-4930) is the
checklist: SheetRecords 1.27.0, Shapes 1.3.0, Layers 1.2.1, SheetModel 1.29.0, ShapeGeometry 1.7.0, SheetChrome
1.11.0, Grips 1.9.0, PointerPress 1.3.0, EditScope 1.1.1, SheetTools ContextMenu 1.2.0, Eyedropper 1.8.1,
Panel Shapes 1.8.2, Panel Layers 1.1.1, Toolbar 1.18.0, ModeController 1.26.0, PdfExporter 1.8.0, ProjectData
1.4.0, ApiClient 1.5.0 (-> VV facade), AppConfig `LayoutEditor__Panels__AccordionSections` gains `"images"`
(TV `[ "text", "dimensions", "shapes", "images", "leaders", "floor-areas", "patterns" ]`; VV
`[ "text", "dimensions", "shapes", "leaders" ]`), and the stylesheet (VV: loader list). *Verifier additions:* the
same release also changed TV's service worker (a `tv-images-vN` bucket, S07a-V03 -> WP-S07a-11 in VV's shared
worker), and TV's own open item "Pictures in Custom Scrapbook items / pasted across projects - they point at the
source project's file (not found)" (`TV/TrueVision__PLAN__SheetImages__.md` section 9) carries over to VV's 56
Custom Scrapbook unchanged (S07a-V08).

**D8. Cross-feature consumers (other slices must know).** Statement Writer: `Statement__Standard__
DrawingSchedule__Live__.js:56` imports `Na__LeRegPdf__Rows` (v2.167.0); `Statement__Standard__TrueVisionHub__.js:88-90`,
`Statement__Page__.js:158`, `Statement__Publish__.js:97` import QR modules. Parametric Scrapbook:
`ScrapbookParametric__ProjectQr__.js` (Project Portal, v2.100-v2.120) and `Panel__ScrapbookParametric__.js:198`
(`Na__QrLink__CurrentProject`). Document Sharing: `Share__Links__.js` reuses the QR link builder pattern and the
`s/` twin resolver (v2.166.0). WebViewer: register dock entry. All need the QR folder at
`LE/53__Feature__ProjectQrCode` and the register at `LE/51__Feature__DrawingRegister` - another reason to keep
the paths identical.

**D9. Vendored PDF.js.** Copy PDF.js 3.11.174 (`pdf.min.js` 377,137 B, `pdf.worker.min.js` 1,133,681 B; source
`NAAPPS/20__PlanVision__CoreAppCode/01__AppDependencies__VersionLocked/PdfJs__3.11.174/build/`) to
`VV/04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174/build/` (05 and 06 reserved to match TV's
`05__Vendor__JsPdf__v4.1.0` and `06__Vendor__Html2Canvas__v1.4.1`), list it in
`Vale__Dependencies__ImportMap__Index__.json` and the version-lock README, and set the register config paths
document-relative (`./04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174/build/pdf.min.js`), the same
convention as VV's `LayoutEditor__Pdf__JsPdfScriptPath`. `git check-ignore` reports no ignore rule on that path in
`VCB/.gitignore`. TV should make the same move (its register depends on PlanVision's copy, a cross-app path).

---

## (e) UI notes

| Surface | TV (lead) | VV now | Parity requirement |
|---|---|---|---|
| Tab strip | "Document Register" tab (hover "Every drawing of the project - its number, revision and status, and the revision notes"), from the 3D view (v2.158.0) | No register tab | Tab via loader facade; compact strip with the TabStrip slice |
| Register page | Edit table (10 columns), expandable row (number jump, Open drawing, Delete drawing, Revision history), Read view of the real PDF, bar actions (B1) | - | Port verbatim; Publish/Share buttons depend on 65/66 |
| Register PDF | A4 portrait, letterhead (logo left, running head right), title strip (Project, Document No. `<code>_REGISTER`, Date, Contents), table, optional revision appendix, footer (company, Page n of m) | - | Vale logo + 'Vale Garden Houses Limited' come from config; embedded Open Sans needs PdfFonts |
| Title block | Row "Document ID" (`PS01_T02_D01`), QR cell at the right end ("NAVIGATE THIS BUILDING IN 3D" + sentence; "3D MODEL" turned up the side on A4/A3 portrait), Rev printed "Revision A" (v2.109.0 title block slice) | Row "Drawing No.", no QR cell | WP-01 + WP-04 |
| Sheet panel | Name row shows code as fixed text; no Drawing No./Document ID row; name/revision edits are confirmed register saves | Every row editable incl. Drawing No. | Retire the VV divergence with the register |
| Toolbar | "Image" button after the tool buttons (v2.116.0) | - | WP-07 |
| Properties | Images section (file, folder, pixels "W x H of SW x SH", prints at, width, frame, crop/reset/replace, info/warning notes) | - | WP-07 |
| Sheet | Drop hint "Drop to place on this sheet", corner grips only, double-click crop overlay with thirds grid, picture context rows (name + dpi, Show frame, Crop picture..., Reset crop, Replace picture..., Fit to its print resolution) | - | WP-07 |
| Save toasts | "N picture(s) stored at 300 dpi ...", "pushed to R2", "filed under their new document id" join the Save Sheets toast (SheetModel 1.29.0) | - | WP-07 + save contract |
| Web viewer | Register in the dock, Share beside PDF | - | WebViewer slice |

The "top bar fold" animation Adam named is not in this slice (TV v2.83.0 -> VV v2.70.0, ledger line 1235); the
register page and the images' crop overlay sit inside the Layout Editor host and need nothing from it.

---

## (f) Decisions needed

| Id | Question | Options | Recommendation |
|---|---|---|---|
| D-S07a-01 | Does VV adopt the Drawing (Document) Register and TV v2.71.0's three-part Document ID? (VV ledger row 339 waits on this) | A full parity; B register without phases (`{project}_{drawing}`); C keep VV's divergence (no register) | **A** - the goal is an identical editor; VV's local mirror has 3 projects with sheets and no stored numbers, so migration is near free now |
| D-S07a-02 | Vale's phase list and default | A TV's T01 Concept/T02 Planning/T03 Building Regs/T04 Site & Remedial, default T01; B a Vale list from Adam; C no phases | **A at launch** (config-only change later); Adam to confirm Vale stage words |
| D-S07a-03 | What is `{project}` in a Vale Document ID, given 13 codes are shared by schemes/variants? | A numeric projectCode (`63592_T01_D01`, scheme siblings collide); B code + scheme suffix (`63592-2`); C per-project override (new field) | **A**, with the existing per-sheet escape hatch `Sheet__Fields__DocumentId`; if Vale needs cross-scheme uniqueness, add a project-level override in BOTH apps rather than a VV-only field. *Verifier: option A needs D-S07a-13 first - today VV's "project code" is the `?project=` token, normally the full folderId, so without a new accessor A silently becomes `2026/63592__Bressard-Kayode_T01_D01`* |
| D-S07a-04 | Where does a printed VV QR code point? | A `https://adam-noble-01.github.io/ValeCodebase/q/?<key>` (Lantern `t/` precedent; v4 symbol, 0.270 mm module, VV `MinModuleMm` 0.265); B a short VV-owned domain served by VV's worker (v2, 0.345 mm); C defer with `ProjectQr__Enabled:false` | **C now, then A**; B as the upgrade path |
| D-S07a-05 | The resolver key for VV projects | A bare projectCode (ambiguous for 13 codes); B a unique short key per folder written into the resolver index by the Whitecardopedia build; C folder name (v5, 0.244 mm) | **B** - *verifier: and the key must be permanent across VV's live project rename (D-S07a-14); the index writers are `WCP/Tools__DevUtils/AutomationUtil__R2Common__Lib__.py` (`na_make_index_entry`, `na_index_write`, `na_index_rebuild_all`) and the worker's `CloudflareHelper__MasterIndexR2__.js` (`na_patch_master_index_entry` on rename/visibility, `na_remove_master_index_entry` on delete)* |
| D-S07a-06 | QR note and Project Portal wording for Vale clients | A keep TV copy ("Navigate This Building in 3D", "Project Portal", "Live Drawings Online"); B Vale copy | **A for the title block note** (no NA naming); Portal block copy and the "TrueVision 3D Project Hub" section name to be decided in the 57/52 slices |
| D-S07a-07 | VV sheet-image storage folder | A `VaApps/Projects/{folderId}/LayoutEditor/SheetImages/<DocumentId>/` (+`00__Archive`), matching VV's `LayoutEditor/Linework` and `/Snapshots`; B TV's literal `05__Layout__DrawingDocs__Images` | **A** |
| D-S07a-08 | Shape of VV's answer to TV's transport imports | A VV-implemented facade at TV's paths/names (`VVM/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` subset, `VVM/03__AppUtils/Na__AppUtils__LocalProjectMirror__.js`) over VV's worker and Flask; B VV-named adapters and edited imports in each ported file | **A** (feature files stay verbatim; must match the DIV-4 slice's choice) |
| D-S07a-09 | Register PDF typeface | A port PdfFonts (embedded Open Sans; VV UI is already Open Sans via `--Vale_FontFamily`); B Helvetica (VV SpecPdf divergence) | **A**, landed by the PdfExport slice before the register |
| D-S07a-10 | Sequencing against 31 DocumentKeys, 65 Publishing, 66 Sharing (static imports in the Editor) | A port those first; B port the register with three marked seams (no Publish button, no Share button, Ctrl+S left to the editor's save as TV did before v2.112.0) and remove them later | **A if they are scheduled in the same wave, otherwise B** |
| D-S07a-11 | Picture frame colour | A keep `#555041`; B a Vale colour | **A** for parity |
| D-S07a-12 | Fix TV's yellow/amber register warning first? | A fix in TV (treat `'yellow'` as amber in `Register__Pdf__.js:644`) and port the fixed file; B port as is | **A** |
| D-S07a-13 (verifier) | Where does VV's document code - the `{project}` of a Document ID, `<code>_REGISTER`, `<code>_SPEC`, the PDF names and the picture folders - come from? | A a VV accessor returning the loaded `project.json` `projectCode` (numeric, present in all 155 local project files), handed over by the loading sequence; B keep `Na__DrawData__GetProjectCode()` (the `?project=` token: `2026/3047__Doous` from the gallery, `3047` or a folder name when typed); C a new per-project `documentCode` field | **A**, used by SheetRecords (DocumentId and the DrawingNumber default), Register__Pdf, PdfExporter and SpecPdf; keep `GetProjectCode()` as the transport token. Also fixes today's VV title blocks printing `2026/3047__Doous-01` on unnumbered sheets |
| D-S07a-14 (verifier) | A printed QR key must outlive VV's live project rename (`CloudflareHandler__ProjectRename__.js` moves `VaApps/Projects/{old}/` to `{new}` and rewrites the master index entry's folderId, year, name and projectCode - the code from `project.json`, else the new folder name, `:300-304`). What key? | A projectCode (13 are shared, and a rename can rewrite it); B folderId or folder name (changes on rename; v5 at 0.244 mm); C a permanent `qrKey` field in each master index entry, written once by the Python index writer and preserved by the rename handler | **C** (the NA resolver can key on PS01 only because NA codes never change) |

---

## (g) Work packages

Every package: keep files CRLF; header banner `VALEVISION3D - ...`, PORT NOTE (Ported from TrueVision3D
`<path>` `<version>`, Ported on, Parity, Divergences, Back-port), console prefix `[ValeVision3D ...]`; run
`VV/80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs` and `Na__Verify__ModuleGraph__.mjs`; one VV
devlog entry `## ValeVision3D v2.N.0 - DD-Mon-YYYY - Title` (minor bump, read the devlog top first); update the
parity ledger rows named in B8. Adam tests in the app; agents prove with node/python tests and fetch guards.

### WP-S07a-01 - Document ID schema and register configuration in VV core (L)
- Scope: TV v2.71.0 in VV: SheetRecords `Na__LeRec__Phase`, `ComposeDocumentId`, `DocumentId`, register-series
  default for `DrawingNumber`; SheetModel/SheetModel__Sheets `GetPhase`, `GetDocumentId`, `ComposeDocumentId`,
  `NotifyRegister`, `FinishRegisterDeletion`, `RenumberSheets` from the register numbering (reads the loaded
  register block); ConfigState__EditorSetup `GetDrawingRegisterSetup` (+ column/phase readers and fallbacks,
  v2.76.1); ConfigState re-export; AppConfig `LayoutEditor__DrawingRegister__Config` with VV values
  (LetterheadLogoAspect 4.5, VV PDF.js paths, phases per D-02) and TitleBlock row `DrawingNumber` ->
  `DocumentId` "Document ID" (+ SheetSetup row fallbacks and classic anchors key); History `'register-updated'`
  rewrite (Title, DrawingNumber, Phase, DocumentId, Revision, Status); AutoSave ignore `'register-updated'`
  and Suspend/Resume/DiscardSavedDraft; PdfFilename on DocumentId; keep the VV DrawingCode leaf split.
- Hot files: `LE/07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js`, `SheetModel__.js`,
  `SheetModel__Sheets__.js`, `Na__LayoutEditor__DrawingCode__.js`, `History__.js`, `AutoSave__.js`;
  `LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json`, `ConfigState__.js`, `ConfigState__EditorSetup__.js`,
  `ConfigState__SheetSetup__.js`; `LE/60__Feature__PdfExport/Na__LayoutEditor__PdfFilename__.js`;
  `LE/01__Core__Loader/Na__LayoutEditor__Loader__.js`; `80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.test.mjs`.
- Depends on: D-01, D-02, D-03.
- Acceptance: v2.71.0's ComposeDocumentId cases (all parts, each missing, all missing, untrimmed, leading/trailing
  literal) pass in node; a never-numbered VV pack composes `<code>_T01_D01`; the title block prints "Document ID";
  `Na__Test__TitleBlockCells__` updated and passing; the three VV projects with sheets load unchanged; both
  verifiers pass.
- *Verifier corrections:* (1) `<code>` must be the numeric `projectCode` from WP-S07a-09's accessor - add the
  acceptance "opened from the Whitecardopedia gallery (`?project=2026/3047__Doous`) the title block reads
  `3047_T01_D01`, never `2026/3047__Doous_...`". (2) The "PdfFilename on DocumentId" item is a change to
  PdfExporter's `Na__LePdf__Filename` (TV `PdfExporter__.js:474-482`); `Na__LayoutEditor__PdfFilename__.js` is
  header-only drift and needs nothing - swap it for `Na__LayoutEditor__PdfExporter__.js` in the hot files.
  (3) Execute inside S03b's whole-file ports of SheetRecords / SheetModel facade / Sheets / History
  (WP-S03b-03/04), not as hunks; RenumberSheets behaviour per D-S07a-01 (D5). (4) Re-measure the Document ID
  cell in VV's mm row widths (TV moved its share 18 -> 26 for the longer string) and re-key VV's Classic anchors;
  the VV fixture `80__Testing__PrototypeEnvironment/Na__Test__TitleBlockCells__.html:95` builds
  `Sheet__Fields__DrawingNumber '57079-NN'` and needs re-checking too. (5) Depends also on WP-S07a-09.

### WP-S07a-02 - VV transport for the register and the save contract (M)
- Scope: per D-08 the VV facade(s) for `GetLoadedProjectData` (register block), `ReadProjectData` (cache-busted
  CDN read of `VaApps/Projects/{folderId}/project.json`), `MergeAndSaveKeys` (local GET + block merge +
  `Na__AppUtils__R2SaveProjectJson`), `ProjectFileLocation`/local read (`GET /api/projects/<code>`) and
  `Na__LocalMirror__MergeKeys` (Flask GET + POST); VV `Na__DrawData__Save(showToast, report, registerKeys)` with
  `localFirst` and the report fields; `Na__DrawData__RegisterSaveStep` with before/payload/after; loading sequence
  hand-over of `LayoutEditor__DrawingRegister`. Coordinate with the DrawingViewCore and DIV-4 slices.
- Hot files: `VVM/42__System__DrawingViewCore/Na__DrawView__ProjectData__.js`, `VVM/01__AppCore/Na__AppFlow__LoadingSequence.js`,
  `VVM/03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js`; new facade files.
- Depends on: WP-01, D-08.
- Acceptance: under a fetch guard on a scratch project: a save with `registerKeys` writes both blocks in ONE worker
  POST and the same keys to Flask; `localFirst` posts to Flask before the worker and stops on a Flask failure;
  `report` carries cloudSaved/local/localKeys/localFirstWritten/steps; a registered step's three phases run in order
  and a throwing step does not fail the save; reload adopts the register block.
- *Verifier corrections:* the facade half of this package IS S09's same-name transport shims (D-S09-04 option a,
  WP-S09-06, which lists all 21 `Na__CfApi__*` and 8 `Na__LocalMirror__*` names). Build the shim files once there
  (`VVM/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js`, `VVM/03__AppUtils/Na__AppUtils__LocalProjectMirror__.js`)
  with a header that says "VALEVISION3D TRANSPORT SHIM - never overwrite from TrueVision" (a mechanical re-sync
  that copies TV's ApiClient over it would point VV at `na-truevision-api`); this package keeps the VV
  `Na__DrawData__Save(showToast, report, registerKeys)` contract, the save-step context (`ctx.block`, `ctx.state`,
  `ctx.note`, `ctx.local`, see D4) and the loading-sequence hand-over. `ReadProjectData` = `?t=` + `no-store`
  CDN read (B5), never `FetchProjectJson` (memoised, build-token cached).

### WP-S07a-03 - Port the Drawing Register and wire it in (L)
- Scope: the 10 files (C1) with their seams; PDF.js vendoring (D9); ModeController (D1); loader facade (D2); a
  Document Register tab (D3); Panel__Sheet to TV 1.3.0/1.4.0 behaviour (DocumentId row hidden, name and revision via
  `Na__LeRegEdit__Metadata`); WebViewer dock entry and `ShowRegister` (or hand to the WebViewer slice); AppConfig
  labels (`RegisterTab`, `RegisterTabTitle`, `SheetNameCodeTitle` wording); new register test.
- Hot files: `LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js`, `Na__LayoutEditor__TabStrip__.js`,
  `LE/01__Core__Loader/Na__LayoutEditor__Loader__.js`, `LE/40__Ui__Panels/Na__LayoutEditor__Panel__Sheet__.js`,
  `LE/80__Feature__WebViewer/Na__LayoutEditor__WebViewer__.js`, `LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json`,
  `VV/04__Lib__ThirdParty__VersionLocked/Vale__Dependencies__ImportMap__Index__.json` and its README.
- Depends on: WP-01, WP-02, PdfFonts (PdfExport slice), `Na__LePdf__ExportSheet` strict option, 31/65/66 or the
  D-10 seams.
- Acceptance: the tab opens from the 3D view and from a drawing and hides on Leave/Enter/OpenSpecification; the Edit
  table shows the 10 columns; a phase change asks "Its document code becomes <code>_T02_D01."; renumber, jump, move,
  status, name, revision and delete each confirm, write once to R2 and locally, and restore on an R2 failure (guarded
  test); notes survive a reload as a draft and Save to R2 asks when R2 changed; Read view equals the download
  (same bytes); the downloaded register is named with code `DR`; Download entire pack yields sheets + register + spec
  PDFs; the read-only web build shows Read only; `Na__Test__RegisterNumbering__` passes.
- Tests to port/author: new `Na__Test__RegisterNumbering__.test.mjs`; `Na__Test__DocumentKeys__.test.mjs` with 31.
- *Verifier corrections:* the WebViewer register entry cannot be done here - TV WebViewer 1.2.0 imports
  `52__System__Layout__PublishedDocuments` (its `ShowRegister` calls `Na__PubLoad__CancelAll`, TV `:621-626`) and
  66's Share button; leave it to S08. `Na__Test__DocumentKeys__` exercises `Doc__Save` through the statements and
  specification registrations only - it does not register the register tab, so it is not a register test.
  Also depends on WP-S07a-09 (register number `<code>_REGISTER` from the document code).

### WP-S07a-04 - Port the Project QR Code and its title block and shape hooks (M)
- Scope: the 6 QR files (C2; Encoder/Painter verbatim, Symbol/ProjectLink/Config/README adapted, `Enabled:false`);
  `TitleBlock__QrCell__.js`; TitleBlock Modern 1.3.0 hook; SheetChrome 'qr' primitive (1.9.0); ConfigState__SheetSetup
  QrCell readers (1.5.0, 1.6.0); AppConfig QrCell keys; ShapeGeometry Shape__Qr (1.6.0, 1.8.0); SheetRecords
  NormaliseShapeQr (1.24.0); SheetModel__Shapes `qr` (1.1.0); PdfExporter 'qr' offset.
- Hot files: `LE/10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js`, `Na__LayoutEditor__TitleBlock__Modern__.js`;
  `LE/03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js`, `Na__LayoutEditor__AppConfig__.json`;
  `LE/15__Core__Markup/Na__LayoutEditor__ShapeGeometry__.js`; `LE/07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js`,
  `Na__LayoutEditor__SheetModel__Shapes__.js`; `LE/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js`.
- Depends on: D-04, D-05, D-06; title block slice ordering.
- Acceptance: with `Enabled:false` every sheet's strip is identical to before (TitleBlockCells test unchanged); with a
  test config pointing at a resolver, the cell draws an 8.79 mm code with 0.61 mm round it on A3 landscape and the
  compact form on A4; `CheckPrint` reports the module; `Na__Test__ProjectQr__` (sections 1-3, 5-6) and the Decode test
  pass.
- Tests: `Na__Test__ProjectQr__.test.mjs`, `Na__Test__ProjectQr__Decode__.py`.
- *Verifier corrections:* the five QR files move to WP-S07a-10 (they must precede S03b's SheetChrome/ShapeGeometry
  whole-file ports); this package keeps the title block cell and the shape hooks. Add the acceptance "with the QR
  config JSON made unreadable (renamed in a scratch copy) the strip is still unchanged" (fail-closed, S07a-V02), and
  set `LayoutEditor__TitleBlock__QrCellEnabled:false` in VV AppConfig. The test harness stages
  `03__AppUtils/Na__AppUtils__ProjectLoader.js` alone into a temp folder (TV test `:82-91`); VV's ProjectLoader
  imports `./Na__AppUtils__ResilientLoad__.js` (VV `:77`), so the VV port must stage that file too, and section 4's
  "every project's code is a version 3 symbol" becomes the version the chosen Vale address allows (4 for option A).

### WP-S07a-05 - VV QR resolver outside the app (M, decision-gated; verifier: was labelled S here, M in the JSON)
- Scope: `VCB/q/index.html` (port of `NAWEB/q/index.html`: text-node rendering, `?key`, `?p=`, `?project=`, `#key`
  accepted, relative `location.replace` to `WebApps/ValeVision3D/?project=<folderId>`); a resolver index with unique
  keys generated from the Whitecardopedia master index (D-05); README "never move, never hand-edit, keep answering old
  forms"; switch `ProjectQr__Enabled` on; adapt section 4 of the ProjectQr test.
- Hot files: the Whitecardopedia sync/build script that writes `Na__MasterIndex__ProjectLocations__.json` (not located
  in this pass), `LE/53__Feature__ProjectQrCode/Na__ProjectQr__Config__.json`.
- Depends on: WP-04, D-04, D-05.
- Acceptance: every enabled VV folder resolves to its own scheme; the duplicated codes resolve correctly; OpenCV reads a
  printed-size render of a VV code; a phone scan of a printed drawing (Adam).
- *Verifier corrections:* the master-index writers were located - `WCP/Tools__DevUtils/AutomationUtil__R2Common__Lib__.py`
  (`na_make_index_entry`, `na_index_upsert_project`, `na_index_write` writes R2 and the GitHub copy,
  `na_index_rebuild_all`) and, in the worker, `WCP/CloudflareWorker/src/CloudflareHelper__MasterIndexR2__.js`
  (`na_patch_master_index_entry`, used by the rename handler at `CloudflareHandler__ProjectRename__.js:300-304`, and
  `na_remove_master_index_entry`). Put those in the hot files. The key must survive a live rename (D-S07a-14): add
  the acceptance "rename a scratch project through the worker; its printed key still resolves to the new folder".
  The resolver could read the existing master index (CDN `VaApps/Index/...`, GitHub fallback) instead of a second
  generated index, provided it carries the permanent key.

### WP-S07a-06 - VV transport for sheet images (M)
- Scope: `WCP/Server__ValeVisionSheetImages__Api__.py` (port of the NAAPPS blueprint: upload/reconcile/list under
  `Projects/<year>/<folder>/LayoutEditor/SheetImages`, hash-checked names, one folder level, `00__Archive`, never
  delete) registered in `WCP/server.py` (+ header endpoint list); VV worker: allow
  `LayoutEditor/SheetImages/<DocumentId>/<file>.(webp|jpg|png)` (immutable cache header for hashed names) and add
  list/delete (and copy, or let the client copy via the CDN as TV's fallback does); the VV facade's
  `SheetImageLocation/ListSheetImages/UploadSheetImage/CopySheetImage/DeleteSheetImage/IsConfigured/SHEET_IMAGES_DIR/
  SHEET_IMAGES_ARCHIVE`; `VCB/.gitignore` allowlist so only hashed names are tracked and `00__Archive` is not.
- Hot files: `WCP/server.py`, `WCP/CloudflareWorker/src/index.js`, `WCP/CloudflareWorker/src/handlers/CloudflareHandler__ProjectAsset__.js`
  (or a new handler), `VCB/.gitignore`, the facade shared with WP-02.
- Depends on: D-07, D-08, WP-02.
- Acceptance: `Na__Test__SheetImagesApi__` (VV) passes its 24 adapted checks with `sys.dont_write_bytecode`; the
  worker rejects paths outside the guard and the archive; before `wrangler deploy` the client falls back without
  breaking (Adam deploys).
- Tests: `Na__Test__SheetImagesApi__.test.py`.
- *Verifier corrections:* VV's asset handler stores every object with `cacheControl 'no-cache, max-age=0'` and bumps
  the project's build manifest on every write (`CloudflareHandler__ProjectAsset__.js:137-148`); sheet pictures are
  content-hashed, so their route must write `'public, max-age=31536000, immutable'` and must NOT bump the manifest
  (a bump changes every client's `?v=` build token for the project). Coordinate the worker guard and handler with
  S08 (published documents grow the same guard) and S09 WP-S09-06 - one owner per edit of
  `CloudflareHandler__ProjectAsset__.js` and `WCP/server.py`.

### WP-S07a-07 - Port Sheet Images and its editor hooks (XL; verifier: was labelled L here, XL in the JSON)
- Scope: the 17 files (C3); the D7 checklist of shared hooks; loader STYLESHEETS entry; AppConfig accordion `images`.
- Hot files: `LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js`, `LE/01__Core__Loader/Na__LayoutEditor__Loader__.js`,
  `LE/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js`, `Na__LayoutEditor__Panel__Shapes__.js`, `Na__LayoutEditor__Panel__Layers__.js`,
  `LE/30__System__SheetTools/Na__LayoutEditor__Grips__.js`, `Na__LayoutEditor__SheetTools__PointerPress__.js`,
  `Na__LayoutEditor__EditScope__.js`, `Na__LayoutEditor__SheetTools__ContextMenu__.js`, `Na__LayoutEditor__Eyedropper__.js`,
  `LE/07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js`, `Na__LayoutEditor__SheetModel__.js`, `SheetModel__Shapes__.js`,
  `SheetModel__Layers__.js`, `LE/15__Core__Markup/Na__LayoutEditor__ShapeGeometry__.js`,
  `LE/10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js`, `LE/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js`,
  `LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json`.
- Depends on: WP-01 (DocumentId), WP-02 (RegisterSaveStep), WP-06, `28__System__ObjectSnap`, ToolState `PickUpMove`
  (TV v2.78.0), EditScope `WithAdoption` (TV v2.142.0), Grips `RegisterShapeProvider`.
- Acceptance: `Na__Test__SheetImages__` (90 checks) passes; in the editor under a fetch guard: a 14 MB PNG drops and shows
  at once with nothing written; Save Sheets cuts it to 300 dpi for its placed size, files it under the sheet's Document
  ID on disk and on R2 before the drawings, and archives what nothing uses; a renumber moves it; the web build reads it
  from R2 then GitHub Pages; the PDF prints a 300 dpi JPEG with its shadow PNG and rule.
- Tests: `Na__Test__SheetImages__.test.mjs`.
- *Verifier corrections:* the seven render files (Setup, Geometry, Painter, Paint, Source, Pdf, Encode) and the
  config move to WP-S07a-10; this package keeps Insert, Handles, Crop, Menu, Panel, the core, Publish, Store and the
  stylesheet. The `28__System__ObjectSnap` dependency is S04b WP-S04b-06 (VV's `Snapping__.js` becomes its shim and
  already exports `Na__LeOsnap__Snap`/`HideMarker`). The service-worker bucket is WP-S07a-11.

### WP-S07a-08 - Ledgers, TV back-ports and verification (S)
- Scope: VV parity ledger rows (B8) and devlog; TV fixes to back-port: yellow/amber in `Register__Pdf__.js:644`,
  PORT NOTE blocks for `Register__DeleteDialog__.js` and the 15 SheetImages files, AutoSave DEVELOPMENT LOG entry for
  Suspend/Resume/'register-updated', stale QR paths in TV AppConfig `QrCellNote` and ScrapbookParametric config `:206`,
  `TV/TrueVision__PLAN__SheetImages__.md` section 9 row, TV vendoring of PDF.js (D9); the new register test back-ported.
- Hot files: `VV/ValeVision__PARITY__TrueVisionLedger__.md`, `VV/ValeVision__DEVLOG__.md`, the TV files named.
- Depends on: WP-01..WP-07.
- Acceptance: ledger rows say what is in the tree; both verifiers pass in both apps; TV register PDF boxes a yellow note.

### WP-S07a-09 - VV document project code accessor (S; verifier addition)
- Scope: a VV accessor for the document code (e.g. `Na__DrawData__GetDocumentCode()` in
  `VVM/42__System__DrawingViewCore/Na__DrawView__ProjectData__.js`) answering the loaded `project.json` `projectCode`
  (handed over by `Na__AppFlow__LoadingSequence.js` beside the drawings block, `:726-730`), falling back to the
  master index entry's `projectCode` for the `?project=` token (`Na__AppUtils__LookupIndexEntry` is not exported
  from VV `ProjectLoader.js` today, `:535-548`); repoint the DOCUMENT uses only - VV
  `SheetRecords__.js:730-735` (DrawingNumber default), `SpecPdf__.js:144` (`<code>_SPEC`), PdfExporter
  `Na__LePdf__Filename` `projectCode` - and keep `Na__DrawData__GetProjectCode()` (the token) for transport
  (`/api/projects/<token>`, `R2SaveProjectJson`). The ported Register__Pdf, SheetRecords DocumentId and Sheet Images
  then call the accessor (one marked seam each, recorded in their PORT NOTEs) - or, cleaner, TV adopts the same
  accessor name returning its `?project=` code so the seam disappears (back-port).
- Depends on: D-S07a-13.
- Hot files: `VVM/42__System__DrawingViewCore/Na__DrawView__ProjectData__.js`, `VVM/01__AppCore/Na__AppFlow__LoadingSequence.js`,
  `LE/07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js`, `LE/50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js`,
  `LE/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js`.
- Acceptance: opened as `?project=2026/3047__Doous`, `?project=3047` and `?project=3047__Doous`, the title block
  default, the spec number and the PDF names all read `3047...`; saves still reach `/api/projects/<token>`.

### WP-S07a-10 - QR and picture render leaves, early (M; verifier addition)
- Scope: port the render half of 53 and 54 ahead of the shared-core whole-file ports that import it (S03b
  SheetRecords 1.39.0 -> 54 Geometry; SheetChrome 1.14.0 -> 53 Painter, 54 Painter; ShapeGeometry 1.9.0 -> 53 Symbol,
  54 Paint; S08 PdfExporter 1.12.0 -> 54 Pdf): `53` Encoder, Painter (verbatim), Symbol (fail closed), ProjectLink
  (VV identity), Config (`Enabled:false`, `BaseUrl ''`), README; `54` Setup (adapted fallbacks), Geometry, Painter,
  Paint, Source (adapted), Pdf, Encode (verbatim), Config (adapted). Needs the read side of the transport shim
  (`Na__CfApi__SheetImageLocation`, `IsConfigured`) from WP-S09-06 and `Na__AppUtils__IsRunningOnLocalhost` (VV has it).
- Depends on: WP-S09-06 (read side only), D-S07a-04/05 (config values; shipping disabled needs neither).
- Hot files: none shared - new files in `LE/53__Feature__ProjectQrCode/` and `LE/54__Feature__SheetImages/`.
- Acceptance: `Na__Verify__Exports__.mjs` and `Na__Verify__ModuleGraph__.mjs` pass with the leaves present and
  nothing importing them yet; `Na__Test__ProjectQr__` sections 1-3, 5-6 and the leaf parts of `Na__Test__SheetImages__`
  pass; with the QR config unreadable, `Na__ProjectQr__GetSymbol` answers no symbol.

### WP-S07a-11 - Shared service worker: a sheet-pictures bucket (S; verifier addition)
- Scope: in `WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js`
  add a `wpwa-images-<token>` bucket and owned prefix, a pattern for `/LayoutEditor/SheetImages/<id>/<name>__<10 hex>.(webp|jpe?g|png)`
  classified BEFORE the shell pattern, cache-first with an LRU cap (TV uses 160), mirroring TV's `tv-images-vN`
  (TV SW logic `:687-706, 1083, 1123`); bump `PWA_SW_VERSION_TOKEN` only on Adam's say-so (it evicts every Vale app's
  caches - S06a D-S06a-12).
- Depends on: D-S07a-07 (the folder name).
- Hot files: the shared SW logic file above (also touched by S06a, S07b, S08 for the token).
- Acceptance: a picture fetched twice from the CDN is served from the images bucket the second time; a `.png`
  picture no longer lands in the shell cache; the gallery's thumbnail and image rules are unchanged.

---

## Appendix A - evidence index

- TV register: `Register__Data__.js:72-73, 111-113, 119-138, 153-173, 259-297, 303-340`;
  `Register__Transactions__.js:140-206, 212-249, 295-362`; `Register__Editor__.js:90-99, 127, 464-476, 498-568, 589-617,
  636-643, 653-659`; `Register__Pdf__.js:82-86, 212-217, 229-249, 644, 745-816, 777`; `Register__Notes__.js:92, 166-173`;
  `Register__Preview__.js:89-118, 151-186`; `Register__Export__.js:76-154`; `Register__Numbering__.js:47-80`.
- TV QR: `Na__ProjectQr__Symbol__.js:93, 100-113, 237-270, 294-305, 340-361`; `ProjectLink__.js:85-89, 119-126,
  140-162, 173-177`; `Config__.json` lines 10-19; `README__ProjectQrCode__.md` lines 43-58, 75, 142-163;
  `Encoder__.js:53-60, 856-860`; `Painter__.js:104-111, 141-206`.
- TV images: `Na__LayoutEditor__SheetImages__.js:59-68, 97-108, 140-154`; `Source__.js:107-115`; `Store__.js:61-62,
  74-82, 88-96`; `Publish__.js:74-88, 132-134, 251-321, 331-340, 346-389, 401-410`; Config lines 9-11, 16, 46, 74.
- TV hooks: ModeController `:295, 341, 357-360, 429, 502, 512, 547, 578, 582, 928-939, 1059, 1082, 1151, 1193,
  1200-1202, 1209`; TabStrip `:353-356`; SheetModel `:649-659`; SheetModel__Sheets `:111, 261-272, 441-447`;
  History `:233-247`; AutoSave `:176, 620-640`; ProjectData (40) `:710-836, 873-895`; SheetChrome `:193-194, 522, 809,
  984`; TitleBlock Modern `:134, 291, 337`; ShapeGeometry `:123-126, 313, 440, 464`; SheetRecords `:406, 426, 844-851,
  876-903`; Toolbar `:221, 465`; ContextMenu `:203, 443`; PointerPress `:271, 872`; PdfExporter `:173, 229-230, 501, 548`;
  Panel__Sheet `:117, 195, 306, 315`; WebViewer `:188, 207, 621`; ApiClient `:754-972`.
- TV devlog (TV/TrueVision__DEVLOG__.md line of heading): v2.69.0 9676, v2.70.0 9545, v2.71.0 9445, v2.72.0 9364,
  v2.76.1 8962, v2.78.1 8721, v2.79.0 8604, v2.81.0 8314, v2.100.0 6345, v2.102.0 6201, v2.108.0 5635, v2.109.0
  5575, v2.112.0 5324, v2.116.0 4851, v2.120.0 4504, v2.121.0 4436, v2.155.0 1266, v2.158.0 1077, v2.162.0 797,
  v2.166.0 466, v2.167.0 360.
- VV: ModeController `:287-288, 375-441, 448-459, 649-666, 736, 828, 890-891`; Loader `:115-116, 125-134, 284-296,
  542-560, 606-608`; TabStrip `:342-350`; Panel__Sheet `:58-61`; History `:49, 56, 71-74`; AutoSave `:135`;
  SheetRecords `:213, 730-735`; ProjectData (42) `:380-429, 467-493`; LoadingSequence `:726-730`; ProjectLoader
  `:303-322, 335-353`; R2SaveProjectJson `:184-216`; R2AssetUpload guard `:70`; 61 UrlGeneratorLogic `:32-40`;
  PdfExporter `:303`; SpecPdf PORT NOTE `:42-50`; TitleBlockCells test `:115`; ledger rows 82-86, 121, 125-126, 220,
  321-339, 1176-1177; devlog lines 968, 1117-1126.
- WCP: `server.py:21-36, 96, 322-330, 750-786`; worker `src/index.js:140-216`; `CloudflareHandler__ProjectAsset__.js:51-53`;
  master index (152 entries, 13 shared codes).
- VCB: `VCB/t/index.html` (Lantern resolver), Lantern config `TermsQrBaseUrl https://adam-noble-01.github.io/ValeCodebase/t/`.

---

## Verification (adversarial verifier, 01-Oct-2026)

Read-only. Working files: `scratchpad/parity/verify_s07a/` (`vv_sheets.py`, `master_index.py`,
`vv_identity_fields.py`, a copy of TV's QR encoder used to re-measure the address budget, and a backup of this report
as it stood before verification, `S07a_report_before_verify.md`).

### What was checked
- **Coverage.** Every in-scope TV file in `drift_all.tsv` / `tree_tv.tsv` (33 feature files, `TitleBlock__QrCell__.js`,
  the NAAPPS blueprint; line counts re-summed: 3,659 + 1,895 + 4,709 = 10,263) is in C1-C4; VV has no file in scope
  (`tree_vv.tsv` and a grep of VVM for `Na__LeReg|Na__ProjectQr|Na__QrLink|Na__LeImg|Shape__Qr|Shape__Image|PushQr`
  return nothing). Every TV test that touches these systems was listed by grepping `80__Testing__PrototypeEnvironment`;
  five extra ones belong to other slices but embed this slice's names (C5, S07a-V07). One TV artefact outside the
  module folders was missing: the service worker's picture bucket (S07a-V03).
- **Re-ran** `s07a_import_check.py` (58 statements, 32 ok, 26 not, 37 distinct names) and grepped VVM - every folder,
  every namespace - for each missing name. Only `Na__LeOsnap__Snap/HideMarker` exist in VV (old `Snapping__.js`).
- **Opened** every critical/high finding's evidence (22 of 22): F01, F03, F04, F07, F08, F13, F14, F15, F16, F17, F19,
  F21, F22, F29, F32, F39, F43, F46, F47, F48, F49, F50 - and a sample of 30 medium/low ones. Versions checked in file
  headers (ModeController 1.32.0/1.18.0, TabStrip 2.0.0/1.5.0, History 1.7.0/1.4.0 with the doubled 1.3.0, AutoSave
  1.5.0/1.3.0, SheetModel 1.35.1/1.18.0, Sheets, Shapes, Layers, SheetRecords 1.39.0/1.15.0, SheetChrome, Modern,
  ShapeGeometry, Grips, PointerPress, EditScope, ToolState, Eyedropper 1.9.0/1.7.0, Panels, Toolbar, PdfExporter
  1.12.0/1.2.0, ConfigState units, WebViewer, ProjectData 1.6.0/1.2.0). Devlog headings and passages checked against
  `tv_devlog_index.txt` (v2.69-v2.71, v2.81, v2.116, v2.121, v2.155, v2.158, v2.162, v2.166, v2.167). Ledger lines 82-86,
  121, 125, 126, 220, 321, 335, 338, 339, 1176, 1177, 1235 and VV devlog lines 952-1126 read.
- **Data re-measured:** master index 152 entries / 13 shared codes (exact list reproduced); 3 local projects with
  sheets and no stored numbers (155 project files scanned); Vale logo 2000 x 444 (4.505); QR budget table re-encoded
  with TV's own encoder (42 B v3 0.303 mm, 53 B v4 0.270 mm, 55 B v4, 79 B v5 0.244 mm for a folderId token, 80 B v5).
- **The TV defect** (yellow never boxed): confirmed by reading `Register__Notes__.js:92`, `Register__Pdf__.js:641-699`;
  no normaliser maps `'yellow'` to `'amber'` anywhere in the register folder.

### Verdicts on the survey's findings
- **Confirmed as written:** F01, F02, F03, F04, F06, F07, F09, F10, F11, F12, F17, F18, F19,
  F22, F24, F25, F26, F27, F31, F32, F33, F34, F35, F36, F40, F42, F43, F45, F46, F49, F51, F53, F54, F55, F56, F57, F58,
  F59, F60, F61.
- **Corrected (substance right, a field wrong or incomplete):** F05 (RenumberSheets renumbers even without a register
  block; S03b says the opposite - tie to D-01), F08 (project name source), F13 (the reader's own fallbacks are NA:
  PlanVision PDF.js paths, NA phases, aspect 4.096), F14 (the `{project}` token trap; PdfExporter not
  PdfFilename; execute inside S03b's whole-file ports), F15 (identity sources, rename), F16 (missing the
  `'register-updated'` chrome refresh, TV `:1142`), F20 (WebViewer register entry needs 52 PublishedDocuments and 66 -
  S08 only), F21 (`?t=`+`no-store`, not `?v=`; build as S09's shims), F23 (PdfFonts' TTF sources are NA-hosted), F28
  and F30 (fail open), F29 (master index, not `project.json` `folderId`), F37 (Setup is port_adapted - NA fallback),
  F38 (Paint and Pdf import Source -> transport), F39 and F50 (VV already has the two snap names; dependency is S04b
  WP-S04b-06), F47 (cache header, no manifest bump), F48 (save-step context contract), F52 (harness staging, v3 check),
  and the executive summary's "58 named imports" (58 statements).
- **Refuted:** none. The slice is accurate on facts it states; its gaps are VV-side behaviours it did not test
  (the token, fail-open fallbacks, identity data quality, rename) and cross-slice sequencing.

### Added
- Findings S07a-V01 (document code = `?project=` token, high), V02 (QR / Setup fail open, high), V03 (service worker
  bucket, medium), V04 (render leaves must precede S03b/S08 hub ports, high - and the EDITING modules are pulled in
  by S05a's PointerPress 1.3.0+ (54 Crop) and SheetTools ContextMenu 1.2.0+ (54 Menu) and S06a's Toolbar 1.18.0+
  (54 Insert) whole-file ports, while WP-07 itself waits for S04b/S05a tool-state work: a cross-slice cycle to break by
  landing them in one wave or by marked seams on the picture lines of those three hubs), V05 (`project.json` identity fields
  unreliable, medium), V06 (live project rename constrains the QR key, medium), V07 (other slices' tests embed these
  names, low), V08 (TV's open "pictures in Custom Scrapbook items" gap carries over, low).
- Work packages WP-S07a-09 (document code accessor), WP-S07a-10 (render leaves early), WP-S07a-11 (shared SW bucket).
- Decisions D-S07a-13 (document code source), D-S07a-14 (permanent QR key across renames).
- In-place corrections to WP-01, -02, -03, -04, -05 (size M; index writers located), -06, -07 (size XL).

### Cross-slice conflicts the planner must resolve (one owner each)
1. **RenumberSheets** - S07a (renumber from the series) vs S03b (no-op without a register block): decided by D-S07a-01.
2. **Transport shims** - S07a D-08 and S09 D-S09-04 agree (same-name VV shims); S03b/S06a phrase it as "never import
   `80__CloudflareIntegration`" - true of TV's file, not of a VV shim at that path. Build once (WP-S09-06), banner it
   "never overwrite from TrueVision".
3. **ProjectLoader getters** - S09 proposes adding `Na__AppUtils__GetProjectFolderFromUrl/GetYearFromUrl` shims to VV.
   Harmless for most importers, but TV's `GetYearFromUrl` answers a 2-digit year (`'26'` default) and ProjectLink's
   `{projectCode}` would still be the raw token - QR and Store must still be adapted (F29, F42).
4. **QR switches** - S03a says `QrCellEnabled:false`, S03b/S07a say `ProjectQr__Enabled:false`: ship both, plus fail
   closed (S07a-V02).
5. **ModeController / TabStrip / Loader register wiring** is specified in both S03a (b.7, d.1) and S07a (D1-D3) -
   assign one owner; the line references agree.
6. **Shared hot files** - `CloudflareHandler__ProjectAsset__.js` and `WCP/server.py` (S07a WP-06, S08 published docs,
   S09 WP-S09-06); the shared SW logic (S06a, S07b, S08, S07a WP-11).

### Not verified
- Runtime behaviour of anything (no app was run; Adam tests in the app).
- Bodies of Insert, Handles, Crop, Menu, Panel, Paint, Pdf and Encode beyond imports, exports and NA strings; the
  Encoder's Reed-Solomon body.
- Live R2 contents of either app, and whether GitHub Pages would serve a new `VCB/q/` (only the `t/` precedent).
- Every VV entry point's `?project=` form: Whitecardopedia passes the folderId (verified); hand-typed URLs, the 61 share
  link (which re-emits whatever token is on the address bar) and the VV ledger's `3047-01` example show other forms
  are in use too.
- `IndexByCode` "newest year wins" on a duplicate code is from the code comment (`ProjectLoader.js:115`), not traced.
- PdfFonts and the 31/65/66 modules (other slices).
