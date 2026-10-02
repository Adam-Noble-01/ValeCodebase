# S07b - Statement Writer (Design Statements tab): TrueVision -> ValeVision parity

Slice owner: S07b. Prepared 01-Oct-2026 against TV HEAD `b2aa9151` (30-Sep-2026 09:07, clean; devlog top v2.172.0) and VV HEAD `7b4e593a` (clean; devlog top v2.71.0).
Path shorthand as in the brief: `TV/`, `VV/`, `TVM/`, `VVM/`, `LE/` (= `51__System__LayoutEditor/`), `NAAPPS/`, `WCP/`.
Every path in the tables is relative to the app root unless it starts with `NAAPPS/` or `WCP/`.

---

## (a) Scope

### What was examined

| Item | TV | VV |
|---|---|---|
| `LE/52__Feature__StatementWriter/` | **33 files, 16,898 lines** in 9 subfolders (below) | **absent** (no `52__` subfolder in VV `LE/`) |
| Local-server API | `NAAPPS/ProjectVision__TrueVisionStatements__Api__.py` (451 lines, 6 routes) + `NAAPPS/ProjectVision__LocalServer__Main__.py` (sibling allowlist :103-105, blueprint registration :235, `/api/health` :637) | **absent** (`WCP/server.py` registers only the scrapbook blueprint, :96) |
| Cloud transport | TV worker `na-truevision-api` generic `/r2/read\|write\|list\|delete` via `TVM/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` 1.5.0 (statement rules :500-731) | **absent** (VV worker `whitecardopedia-editor-api` has no statement route; `WCP/CloudflareWorker/src/index.js` :1-230) |
| Design notes | `TV/TrueVision__NOTES__StatementWriter__.md` (846 lines, 20 sections) | absent |
| Tests | 14 statement files (7 node `.test.mjs`, 6 browser `.html`, 1 `.py` server = 3,252 lines) + `Na__Test__Reference__TyporaTheme__.css` (545) | absent (VV has 30 test files, none for statements) |
| Devlog | v2.95, v2.97, v2.99, v2.110, v2.157, v2.158, v2.162, v2.163, v2.165, v2.166, v2.167, v2.168, v2.169, v2.170, v2.171, v2.172 (all read in full) | no mention (`grep -i statement ValeVision__DEVLOG__.md` -> 1 unrelated hit) |
| Parity ledger | - | **no rows** (`ValeVision__PARITY__TrueVisionLedger__.md`; its return trips stop at ~TV v2.85, the Statement Writer starts at v2.95) |
| Realign plan | `TV/TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md` - **no mention** of statements | `VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md` - no mention |
| Real content | RB05 pre-application statement (262 KB, 2,212 lines, 37 figures) under `na-project-portal/26-Projects/RB05__WestFarm/30__TrueVision__AppContent/10__StatementDocs/` | **none**: `WCP/Projects/` (97 projects in 2026) searched for `*statement*`, `*DAS*`, `*heritage*` to depth 5 - no hits |

TV feature folder breakdown:

| Subfolder | Files | Lines | Owns |
|---|---|---|---|
| `01__Core__Data` | 5 | 2,587 | the index, the open statement, its three copies, transport, picture-link resolution, lockstep verdict |
| `02__Core__Markdown` | 5 | 2,080 | tokenise -> render -> serialise (byte-for-byte), inline runs, figure blocks |
| `03__Ui__Page` | 2 | 1,446 | the tab (bar, desk, lockstep question, keys) and the document manager |
| `04__Ui__Editor` | 5 | 3,139 | contenteditable live preview, typing rules, frozen raw-HTML cards, picture menu/crop, section Move |
| `05__Ui__Reader` | 1 | 178 | the Read view (what the PDF photographs) |
| `06__Export__Pdf` | 1 | 449 | the pageless, deliberately text-free PDF |
| `07__Export__Publish` | 3 | 1,062 | push to R2 (markdown, HTML, pictures), picture resize, the published page |
| `08__Style__Stylesheets` | 2 | 2,379 | chrome stylesheet; document stylesheet (NA Typora theme) |
| `09__Standard__Sections` | 9 | 3,578 | six app-drawn standard sections, their registry and config JSON |
| **Total** | **33** | **16,898** | |

Drift table: `ref/drift_all.tsv` lists all 33 as `tv-only` (no VV counterpart, no header-only or drifted rows).

### Method

1. `drift_all.tsv` rows, `tv_portnote_markers.txt` (24 "offer to ValeVision3D with the statement tab" lines; the 09__Standard__Sections files say "ValeVision : not yet ported (ValeVision has no statement tab)").
2. Header (FILE/NAMESPACE/PURPOSE/INTEGRATION/PORT NOTE/DEVELOPMENT LOG), imports and exports of all 33 files (scripted extraction, then read).
3. Every external import resolved against VV (does the module/export exist at the mapped VV path?), plus a transitive static-import closure from `Statement__Page__.js` (274 files, of which 115 are missing in VV, 47,730 lines - dominated by DrawingRegister/Share/PdfExporter pulling the whole sheet stack).
4. Runtime-string scan of every file for NA / TrueVision / UK-planning assumptions (non-comment lines only).
5. VV transport and server read in full where it matters (`WCP/server.py`, worker `index.js`, `ProjectAsset` and `DrawingNotes` handlers, `VVM/03__AppUtils/Na__AppUtils__R2DrawingNotes__.js`, `Server__ValeVisionScrapbook__Api__.py`).
6. TV's own statement node tests **run on 01-Oct-2026** (read-only on the repos; `TEMP`/`TMP` redirected into the scratchpad): Lockstep 28 PASS, Publish 87 PASS; **RoundTrip, FigureTitle, Standard, Schedule, Finishes FAIL** (2, 1, 5, 1, 3 checks) - see S07b-F10/S07b-F45.
7. `git log` / `git ls-files --eol` / `git check-attr` (read-only) on the TV repo for post-devlog changes and line endings.

---

## (b) Narrative findings by sub-system

### b.1 What the feature is

The Statement Writer (TV v2.95.0, 20-Sep-2026) is the project's written-documents tab: pre-application statements, design and access statements, heritage statements. A statement is a **markdown file in a folder** (the folder also holds its pictures), edited in a Typora-style live-preview surface, read as one endless A4 page, exported as a rasterised PDF, and published to R2 with its pictures. Since v2.158.0 it is the fifth tab of the compact tab strip: **3D Model | Drawings | Specification | Document Register | Design Statements** (`LE/05__Core__ModeController/Na__LayoutEditor__TabStrip__.js` 2.0.0 :358-361, label `LayoutEditor__Labels__StatementsTab` = "Design Statements", AppConfig :595-596).

It is a page lying over the drawing editor host (like the Specification and the Register): `.na-le-stmt { position:absolute; inset:0; z-index:12 }` (chrome CSS :31-40), the sheet underneath is hidden (`.is-stmt-shown > .na-le-shell { visibility:hidden }`). Opening it from the 3D view opens the first sheet quietly underneath (`Na__LeMode__EnterUnder`, ModeController 1.30.0).

Architecture (data flow):

```
TabStrip "Design Statements"  ->  ModeController.OpenStatements(options)  ->  Statement__Page__.Show
                                                                               |
   Page (bar, picker, status, Edit/Read, Standard Sections, Save, Publish, PDF x2, Share, Manage, lockstep sheet)
     |-- Editor (contenteditable) -- Typing (reflow via tokenise/render/serialise) -- Cards (frozen raw HTML, figure titles, drop)
     |                                 \-- Figure (right-click menu, justify/crop/frame/shadow/title) -- Move (standard sections)
     |-- Reader (read-only render) ----------------------------------------> Pdf (html2canvas tiles -> jsPDF, 0 text)
     |-- Manager (create / rename / delete / adopt; authors only)
     |-- Publish (markdown + HTML [Publish__Page__] + pictures [Publish__Images__] -> R2; index stamp last)
     |
   Data (index, open statement, draft, autosave, lockstep watch)  -- Index (pure) -- Lockstep (pure) -- Images (pure)
     |
   Transport  -->  TV: CfApi (Worker /r2/*)  +  LocalMirror (ProjectVision :8090 statement routes)  +  CDN
   Markdown engine (Tokenise, Inline, Render [+expanders], Serialise, Md__Figure)  -- pure, node-tested
   Standard Sections registry (expander) -- Header, Contents, TrueVisionHub, Finishes, DrawingSchedule (+Live source), Footer
```

### b.2 Data and storage (TV)

- **Three copies** (NOTES section 2): the file in the project folder (written whenever typing pauses, `AutoSaveLocalMs` 4000), a browser draft (`localStorage['Na__TrueVision__StatementDraft__<folder>__<id>']`, `DraftDebounceMs` 700), and R2 (written **only** by Publish).
- **The index** `TrueVision__StatementDocs__.json` sits beside `TrueVision__ProjectData__.json` and remembers, per statement, folder, file, title, publish stamp and published pictures (`Doc__Images` with `Img__Width/Height/SourceWidth/SourceHeight`, v2.171). "The folder is the truth; the index is the memory": unknown statements on disk are *offered* (Adopt), never adopted silently. Ids never come round again (`Statement__LastId` counter).
- **Naming** is derived (`LayoutEditor__Statement__FilePattern` `{code}_T{tranche}_S{number}__{project}__{title}__.md`, `FolderPattern` `{index}__{title}`). `{project}` is the `?project-folder=` value with `/^[A-Z]{2}\d{2}__/` stripped (`Statement__Data__.js` :837, :932) - an NA-code assumption.
- **TV paths** (CfApi :509-534, :616-676): R2 key `NaProjectPortal/{yy}-Projects/{folder}/30__TrueVision__AppContent/10__StatementDocs/<path>`; CDN `https://cdn.noble-architecture.com/NaProjectPortal/...`; repo (localhost) `${origin}/na-project-portal/{yy}-Projects/{folder}/30__TrueVision__AppContent/10__StatementDocs/<path>`. Statement paths are fenced client-side: segment regex `^[A-Za-z0-9_\-. &()\[\]]{1,140}$`, suffixes `md|html|json|txt|jpe?g|png|webp|gif|tiff?|bmp|svg`, max depth 5.
- **Local writes** go through the ProjectVision server: index via `POST /api/projects/<code>/files/TrueVision__StatementDocs__.json` (allowlisted, LocalServer :103-105), everything else via `/api/truevision/statements/{tree,file,image,folder,move,delete}` (Statements API, fenced after path resolution, delete needs `confirm` == `path`, pictures never overwritten - suffix `__02`).
- **Lockstep** (v2.157): the file is looked at on open, every `LockstepPollMs` (3 s) while the tab shows, on focus/visibility, and immediately before every autosave; content decides, the clock only explains; split states are ASKED with a modal sheet that has no close button; the unchosen copy is kept in `localStorage['Na__TrueVision__StatementDiscarded__<folder>__<id>']`. It relies on the local server sending `Last-Modified` for the markdown.
- **Readers** (web viewer, off-localhost) read the CDN index and markdown only, and are listed **published statements only** (v2.169, Data 1.2.0).

### b.3 The markdown engine and the byte-for-byte promise

"Open a statement, save it without typing, and the file that comes back is the file that went in" (NOTES section 3). Every block carries its source lines including trailing blank lines plus a render signature; untouched blocks are copied, never regenerated. Raw HTML blocks are frozen islands (cards). All five `02__Core__Markdown` modules are pure and run under node.

**Defect found (affects both apps): the tokeniser is LF-only.** `Md__Tokenise__.js` splits on `'\n'` (:264) and its block regexes end in `$` (:65-73); JS `.` does not match `\r`, so on a CRLF file no heading, rule or table is recognised. Evidence:
- RB05's statement on disk is **CRLF** (2,212 CRLF line ends; mtime 30-Sep-2026 08:17). `git ls-files --eol` -> `i/lf w/crlf attr/text=auto`; TV repo `core.autocrlf=true` and `.gitattributes` `* text=auto`. Every Windows checkout of a tracked statement therefore converts it to CRLF.
- `Na__Test__StatementRoundTrip__` today: "every heading found (0 of 138)", blocks "html 107, paragraph 449" - the round trip still passes byte-for-byte, but the document renders with no headings, dividers or tables.
- Nothing in Data/Transport normalises line ends (only `Standard__Finishes__.js` :311 and `Publish__Page__.js` :277 handle `\r`).
- **VV has the identical git setup** (`D:\10_CoreLib__ValeCodebase` `core.autocrlf=true`, `.gitattributes` `* text=auto`), so a tracked VV statement would break the same way.

### b.4 UI: page, editor, reader

- **Bar** (`Statement__Page__.js` BuildBar :277-360): title + summary ("N statements"), statement picker (`<select>`), status pill (disk vs cloud: Unsaved / Saved to file, not published / Published / Out of step with the file / failed), **Manage** (authors only, v2.169), **Edit/Read** pills, **Standard Sections** menu (edit only, via the app's context menu renderer), **Save** (Ctrl+S), **Publish** (primary), one button per PDF preset (**Download PDF** 1.50/0.80, **Download PDF (print)** 2.00/0.92), **Share** (Read only, 66__Feature__DocumentSharing). Below: alerts row (e.g. "local server running without the statement routes"), desk with the A4 paper, progress bar, manager sheet, lockstep sheet.
- **Editor**: no preview pane; typing `## ` makes a heading, `**bold**` bold (reflow through the same tokeniser); `Ctrl+/` raw markdown, `Ctrl+.` Lucida Console (both remembered in localStorage); drag-and-drop pictures are stored into the statement's pictures folder and written as a `<figure>` with a `Fig  -  <name>` title; frozen cards for raw HTML with Edit/raw field; figure right-click menu (Justify L/C/R, Frame, Drop shadow, Title On/Off, Crop/Crop again/Remove crop, Edit raw HTML, Remove) - string rewrites, never DOM re-serialisation; standard-section cards with badge, Move, Edit, Switch Off, Sync + "Synced today at ...".
- **Reader**: the same render with no handles; shrinks the A4 paper on narrow desks; it is what the PDF rasterises; off-localhost it shows the published picture copies (`Doc__Images`, srcset `2000w`/`sizes <original>px`).
- **Keyboard**: the tab's keys go through `31__System__DocumentKeys` (Doc__Save, Doc__ToggleSource, Doc__ToggleMono; map `Na__Hotkeys__DocumentTabs__.json`), and `03__AppUtils/Na__AppUtils__KeyScope__.js` keeps the 3D hotkeys out of a contenteditable statement (v2.110). Without it, letters typed into the statement are stolen.

### b.5 PDF

Deliberately rasterised (zero extractable text, "a change of policy, not a bug fix", `LayoutEditor__Statement__PdfNote`): html2canvas 1.4.1 tiles of a clone of the Reader at A4 width onto pageless jsPDF pages capped at 14,399 pt; link annotations laid over every http(s) link (v2.162); figure frames unzoomed (v2.162) and srcset pictures pinned to their box (`OwnSize`, v2.171). Needs `Na__LePdf__LoadLibrary` from the sheet PDF exporter (jsPDF only, no fonts) and the vendored html2canvas.

### b.6 Publish

Order (`Statement__Publish__.js` :238-317): save local -> pictures the markdown actually links (`Na__LeStmtImg__Used`, resized to 2000 px WebP q0.82 unless already <= 350 KB; stored at the link's own address under its own name with true content type, v2.172) -> HTML page (`Publish__Page__`: viewport 842, the app's fonts `@font-face` made absolute, the app reset, the document stylesheet written in without comments, the desk; title from the Document Header) -> companion `.html` on disk -> markdown as-is -> index stamp **last** (`MarkPublished`). Waits for `Na__LeStmtStd__Ready()` and `Na__ProjectQr__Ready()` first. A statement publish also re-records the share-link manifest (Share__Manifest__ listens for `reason:'published'`, :450-462).

### b.7 Standard sections (v2.162-v2.168)

Six sections stored as one marker `<div class="na-le-stmt-std-marker" data-na-standard-section="<Id>">...</div>` and drawn fresh by the renderer's expander:

| Id | File | Kind | Content in marker | NA / TV assumption |
|---|---|---|---|---|
| DocumentHeader | `Standard__Header__.js` 1.0.0 | takes over the house header (logo, `##`, `#####` fields) | job fields | NA logo URL (:86), "Prepared By: Mr Adam Noble of Noble Architecture" (:94), `alt="Noble Architecture"` (:208); UK planning fields (Applicant, Site Address, Local Planning Authority) |
| Contents | `Standard__Contents__.js` 1.0.0 | drawn from headings | fallback sentence | fallback text names "TrueVision's Statement Writer" (:77); assumes `### N.0 \|` / `#### N.N \|` numbering |
| TrueVisionHub | `Standard__TrueVisionHub__.js` 1.1.0 | QR + button + case for the 3D hub | fallback sentence | **wholly TV-branded**: copy "published through TrueVision 3D, Noble Architecture's own project platform", "Open {ProjectName} In TrueVision 3D", QR to `/q/?CODE` short address (53__Feature__ProjectQrCode), project name from `window.TrueVision__Pwa__ProjectContext` (:206) |
| FinishesComparison | `Standard__Finishes__.js` 1.0.0 | takes over a comparison pipe table in place | the writer's table | UK householder / DAS-skill vocabulary (NEW, MATCHES EXISTING, [TO CONFIRM]); otherwise generic |
| DrawingSchedule | `Standard__DrawingSchedule__.js` 1.0.0 + `__Live__.js` 1.0.0 | snapshot synced from the Drawing Register on demand | heading, words, table | needs `51__Feature__DrawingRegister/Na__LayoutEditor__Register__Pdf__.js` `Na__LeRegPdf__Rows` (TV-only) and the Specification's document number/revision |
| DocumentFooter | `Standard__Footer__.js` 1.0.0 | always last, takes over the h6 house footer | End Note / Copyright fields | "Copyright: (c) {Year} Noble Architecture" (:93) |

Every sentence lives in `Standard__Config__.json` (191 lines, 49 runtime NA/TV/planning strings per the scan) and is mirrored as built-in defaults in each module.

### b.8 TV is a moving target

- 16 devlog releases touch the feature in 10 days (v2.95 20-Sep -> v2.172 29-Sep). ~~every one says "NOT confirmed by Adam" and "NOT in ValeVision"~~ **Corrected by verifier:** only v2.95, v2.165, v2.167 and v2.168 say "NOT confirmed by Adam". v2.97, v2.99, v2.110, v2.157, v2.162 and v2.163 say "NOT tried by Adam", and v2.158 says "NOT tried on a real phone". v2.166 and v2.169-v2.172 carry no confirmation line at all, and v2.169, v2.170, v2.171 and v2.172 each open "From Adam" about his own live use of RB05's published statement on the web viewer, on his phone. **The feature is in production use**: it is still changing, but it is not unconfirmed. Every entry except v2.95 also says "NOT in ValeVision".
- TV commits its releases under "Minor" messages: 55014c6a, cbb05234, a6b8bac5, 0cc4dd6e, 501e5a4d and 089a02df (all 29-Sep) carry v2.162-v2.172. One later commit, **b884e290 (30-Sep), changed the feature with no devlog entry**: it reworded the hub's LeadParagraphs/CloseParagraphs in both `Standard__Config__.json` and `Standard__TrueVisionHub__.js` (no version bump). **Port from TV HEAD `b2aa9151`, not from devlog versions.**
- TV's own suites are red today, mostly because five of them read the **live** RB05 statement: CRLF (RoundTrip, Standard ordering), changed content (Finishes "thirteen [TO CONFIRM]" -> 0; Schedule row count 16), and one stale expectation (`Na__Test__StatementStandard__.test.mjs` :249 still expects "from ground level and from a bird's-eye view", removed by b884e290).
- TV NOTES section 14 still names the key map `Na__LayoutEditor__DocumentKeys__Config__.json`; the file is `31__System__DocumentKeys/Na__Hotkeys__DocumentTabs__.json` since DocumentKeys 1.1.0 (:69-70, :103).

### b.9 External dependencies (direct imports) and their VV status

| Imported from (TV path) | Names | Used by | VV status |
|---|---|---|---|
| `LE/03__Core__Config/Na__LayoutEditor__ConfigState__.js` | `Na__LeCfg__GetStatementSetup`, `Na__LeCfg__GetLabel` | Data, Transport, Page, Cards, Pdf, Publish, Publish__Images, Figure | GetLabel present; **GetStatementSetup absent** (VV EditorSetup 1.0.0 exports 7 readers, :209-217); **no `LayoutEditor__Statement__Config` block** in VV AppConfig |
| `40__System__DrawingViewCore/Na__DrawView__ProjectData__.js` | `Na__DrawData__GetProjectCode` | Data, Publish, Schedule Live | present at `42__System__DrawingViewCore` (map 40->42) |
| `03__AppUtils/Na__AppUtils__ProjectLoader.js` | `IsRunningOnLocalhost`, `GetProjectFolderFromUrl`, `GetYearFromUrl` | Data, Transport, Cards, Reader | only `IsRunningOnLocalhost` exists in VV (:303-307, port 8000); **`GetProjectFolderFromUrl` and `GetYearFromUrl` absent** (VV exports :535-550; VV has no `?project-folder=`/`?year=`) |
| `03__AppUtils/Na__AppUtils__ConfirmDialog.js` | `ConfirmDialog__Show` | Data, Manager, Editor | present (VV is the original; VV index.html has `#naConfirmDialog` markup :1323, TV does not -> TV falls back to `window.confirm`) |
| `03__AppUtils/Na__AppUtils__DevGate__.js` | `IsAuthoringEnabled` | Transport | present (drifted, other slice) |
| `80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` | 7 CfApi statement/project-file functions | Transport, Publish, Publish__Images | **must not be ported** - VV keeps its own worker (DIV-4) |
| `03__AppUtils/Na__AppUtils__LocalProjectMirror__.js` 1.2.0 | 6 statement/sibling functions | Transport, Publish | absent; VV pattern is per-document `Na__AppUtils__R2*` modules |
| `LE/53__Feature__ProjectQrCode/*` (Symbol 1.2.0, Painter, ProjectLink) | READY_EVENT, Ready, GetSymbol, GetUrl, GetSetup, CheckPrint, SvgDocument, CurrentProject | Page, Publish, Hub | absent (TV-only LE subfolder) |
| `27__System__ContextMenuSystem/Na__ContextMenuSystem__Ui__MenuRenderer__.js` 1.0.0 | `Ui__Open`, `Ui__Close` | Page (Standard Sections menu), Figure | absent (TV-only top-level folder; 27 is free in VV) |
| `LE/66__Feature__DocumentSharing/Na__LayoutEditor__Share__Button__.js` 1.0.0 | `Na__LeShareUi__Open` | Page | absent; **and Share__Open/Manifest/Button import Statement Data back** (mutual dependency) |
| `LE/31__System__DocumentKeys/Na__LayoutEditor__DocumentKeys__.js` 1.1.0 (+ `03__AppUtils/Na__AppUtils__KeyScope__.js` 1.1.0) | `Register`, `KeyLabel` | Page | absent |
| `LE/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js` 1.12.0 | `Na__LePdf__LoadLibrary` | Pdf | VV PdfExporter 1.2.0 has the same function under the name `Na__LePdf__EnsureJsPdf` (:97-112, exports :332-336); no `LoadLibrary` export |
| `LE/51__Feature__DrawingRegister/Na__LayoutEditor__Register__Pdf__.js` 1.1.0 | `Na__LeRegPdf__Rows` | Schedule Live | absent (TV-only LE subfolder) |
| `LE/50__Feature__Specification/Na__LayoutEditor__SpecData__.js` | EnsureLoaded, IsLoaded, ListNotes, GetDocumentNumber, GetRevision | Schedule Live | all five present in VV with compatible signatures (`SpecData__Document__.js` :201-210, :280, :393; Transport :315) |
| vendored `04__Lib__ThirdParty__VersionLocked/06__Vendor__Html2Canvas__v1.4.1/html2canvas.umd.js` | (classic script) | Pdf, tests | **absent in VV** (VV vendor folder has 01-04 only); jsPDF 4.1.0 is present in VV but at the legacy `35__System__PageLayoutSystem/01__Dependencies__VersionLocked/jspdf.umd.js` (VV AppConfig :402) |
| `03__Style__AppStylesheets/Na__CoreUi__Styles__Fonts__.css` | Open Sans 300/400/500/600 | document CSS, Publish | VV declares **300/400/600 only - no Medium (500)**, which every statement heading and bold uses |

Inbound (TV modules outside the folder that import the Statement Writer): ModeController (:361-363, :503-504, :942-972, :1230), TabStrip (:155, :159, :359), SpecData__Lockstep__ (:121-127), SpecLockstep__ (:67), SpecEditor__Bar__ (:94), Share__Open__ (:78), Share__Manifest__ (:97-98), Share__Button__ (:71), SW logic (precache :763-764).

**Verifier addition - the transitive prerequisites that matter for VV (recomputed 01-Oct).** In VV the statement PDF takes `LoadLibrary` from VV's own PdfExporter (alias, S07b-F37), and CfApi/LocalMirror are replaced by VV transport, so TV PdfExporter 1.12.0's closure (SheetImages, ColourPalette, SectionCutEngine, ElevationDepthFog, ObjectSnap...) is **not** needed. Stopping the closure at modules VV already has, the Page needs exactly **17 TV-only files (7,001 lines)**, or 14 files (5,528 lines) without the Register's Live source:
- QR: `53/Na__ProjectQr__Symbol__` 397, `__Encoder__` 863, `__ProjectLink__` 196, `__Painter__` 226.
- Sharing: `66/Share__Button__` 454, `Share__Links__` 418, `Share__Manifest__` 487.
- Through Share__Manifest__: `53__Data__Layout__PublishedSchema/Na__PublishedSchema__Paths__` 678 and `__Version__` 172, `52__System__Layout__PublishedDocuments/Na__PubDoc__Urls__` 340, `65__Feature__DocumentPublishing/Publish__Transport__` 282.
- Keys and menu: `31/DocumentKeys__` 384, `03__AppUtils/Na__AppUtils__KeyScope__` 237, `27/Na__ContextMenuSystem__Ui__MenuRenderer__` 394.
- Register (Live source only): `51/Register__Pdf__` 846, `Register__Data__` 377, `60/PdfFonts__` 250.

So the Statement Writer **does** depend, transitively, on the Published Schema (53), the published-documents URL module (52) and the Document Publishing transport (65), through DocumentSharing. See S07b-F57 (corrected).

### b.10 Transport for VV (DIV-4: own worker, own file structure)

TV's transport (generic unauthenticated `/r2/write` over `NaProjectPortal/`; TV v2.169 itself records that the Worker has **no authorisation**) must not be copied. VV's pattern (`Na__AppUtils__R2DrawingNotes__.js`, worker `CloudflareHandler__DrawingNotes__.js`, Flask `/api/projects/<folder>/drawing-notes`) is per-document routes, `X-Editor-Api-Key` from `/api/editor-config` (localhost only), R2 `VaApps/Projects/{folderId}/...`, CDN `https://cdn.noble-architecture.com/VaApps/Projects/{folderId}/...`, disk `WCP/Projects/{year}/{folder}/...`.

Proposed VV storage (decision D-S07b-03 confirms):

| What | TV | VV (proposed) |
|---|---|---|
| statements folder | `<project>/30__TrueVision__AppContent/10__StatementDocs/` | `WCP/Projects/{year}/{folder}/10__StatementDocs/` (beside `project.json`) |
| index file | `TrueVision__StatementDocs__.json` beside `TrueVision__ProjectData__.json` | `ValeVision__StatementDocs__.json` beside `project.json` (mirrors `ValeVision__DrawingNotes__.json`) |
| R2 key | `NaProjectPortal/{yy}-Projects/{folder}/30__TrueVision__AppContent/10__StatementDocs/<p>` | `VaApps/Projects/{folderId}/10__StatementDocs/<p>` |
| CDN | `cdn.noble-architecture.com/NaProjectPortal/...` | `cdn.noble-architecture.com/VaApps/Projects/{folderId}/...` |
| local read (lockstep, pictures) | static repo URL with `Last-Modified` | **dedicated Flask GET route** (see trap below) or `/Whitecardopedia/Projects/...` (server.py :899-912 answers 404 JSON when missing) |
| local writes | `/api/truevision/statements/*` + `/api/projects/<code>/files/<index>` | `/api/valevision/statements/{index,tree,file,image,folder,move,delete}` in a new blueprint `WCP/Server__ValeVisionStatements__Api__.py` |
| R2 writes | `/r2/write` (no auth) | new worker routes `/api/editor/projects/{folderId}/statements/{index,file}` (GET+POST) with `X-Editor-Api-Key`, in `WCP/CloudflareWorker/src/handlers/CloudflareHandler__StatementDocs__.js` |
| localhost health | `/api/health` service `na-projectvision-local-dev` | `/api/check-localhost` (server.py :322); Flask runs `debug=True` (:1010) so new routes reload - the TV "405 until restart" trap does not apply |

**VV-specific trap:** `WCP/server.py` `serve_static` (:956-977) answers a **missing** file with `index.html` and HTTP 200. TV's `Na__LeStmtIo__FetchText` treats only 404/403 as missing, so reading a statement or a picture through the catch-all route would load the Whitecardopedia index page as the statement text (or upload it as a picture on Publish). The VV transport must never read statement files through the catch-all route.

**Verifier additions (VV-specific, missed by the survey):**
- **VV's project sync deletes published statement pictures from R2 (critical, S07b-V01).** `WCP/Tools__DevUtils/AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py` `na_purge_stale_r2_images` (:659-680, called at :926 and :959) lists `VaApps/Projects/{folderId}/` with no Delimiter. It then deletes every `.png/.jpg/.jpeg/.webp` whose bare name is not a TOP-LEVEL image of the local project folder (`na_collect_local_image_names` :645-656 uses `iterdir()`). Every picture Publish writes under `VaApps/Projects/{folderId}/10__StatementDocs/` would therefore disappear on the next sync, and the web reader would show the same broken pictures that TV v2.171 fixed. The markdown, HTML and JSON survive because the purge is gated on extension. This needs S08's WP-S08-04, scoped so it also protects `10__StatementDocs/`; purging top-level keys only (`Delimiter='/'`) does that.
- **Worker storage details (S07b-V04).** VV's `CloudflareHandler__DrawingNotes__` stores with `cacheControl: 'no-cache, max-age=0'` and rewrites the shared `VaApps/Index/Na__BuildVersion__Manifest__.json` on every write (:135). That manifest's `buildVersion` is the global `?v=` token VV appends to every project.json and GLB URL (`Na__AppUtils__WithBuildToken`, ProjectLoader :251, :407-408, :514-519). A statement handler that copied the DrawingNotes body would bump the token once per picture, dozens of times per Publish, and force GLB re-downloads for every project. The statement routes should store index, md and html with no-cache, and should not touch the build manifest (or touch it at most once, on the index write).
- **Transport strategy is a cross-slice decision (S07b-V03, D-S07b-10).** S09's D-S09-04 (a) / WP-S09-06 proposes same-name VV shims for all `Na__CfApi__*` names (including `ReadStatementFile`, `StatementFileLocation`, `WriteStatementFile`) and all `Na__LocalMirror__*` names (including the six statement ones). S08 wiring note 8 / WP-S08-06 adds `GetProjectFolderFromUrl` and `GetYearFromUrl` facades to VV's ProjectLoader. Under that strategy, `Data__Transport__`, `Publish__` and `Publish__Images__` port **verbatim**, and `Na__AppUtils__R2StatementDocs__` (S07b-F28) is not built; only `Editor__Cards__` (hard-coded `/api/truevision/statements/image`) and `Data__` (branding, regex, `{code}`) stay adapted. The two strategies must not both be built.

### b.11 Size of the work

| Part | Lines | Nature |
|---|---|---|
| Feature folder | 16,898 | ~13,900 verbatim (pure engine, UI, CSS), ~3,000 adapted (Data, Transport rewrite, Page, Cards, Publish x2, Header, Footer, Hub, Config JSON) |
| VV transport (new) | ~900-1,300 est. | worker handler (~250), Flask blueprint (~450, from the 451-line TV API), client `Na__AppUtils__R2StatementDocs__.js` (~350), wiring |
| Wiring edits | ~250 est. | AppConfig block (60 keys incl. notes), EditorSetup reader, ModeController, Loader facade, TabStrip tab, fonts, PdfExporter export, SW token |
| Tests | 3,252 + 545 | 7 node suites + 6 harnesses + server; need a VV fixture statement |
| Prerequisite TV-only systems (other slices) | ~3,500 direct | DocumentKeys+KeyScope (621), ContextMenu renderer (394), ProjectQrCode (1,682), DocumentSharing (1,723 + CSS/JSON), DrawingRegister Register__Pdf (846 + its data) |

Overall: **XL** for the slice, but it decomposes into independent M-sized packages once the prerequisites exist.

**Verifier correction to sizing.** The "274 files / 115 missing (47,730 lines)" closure in the method (step 3), S07b-F48 and Appendix A is a TV-graph artefact. I recomputed it at 276 / 117 / 48,911 with re-exports counted; 30 of those files are the feature's own, and most of the rest come only through TV PdfExporter 1.12.0, which VV does not need (alias on VV's own PdfExporter). The prerequisite set VV actually needs is **17 TV-only files, 7,001 lines** (list in b.9), or 14 files and 5,528 lines without the Register's Live source.

### b.12 Scoping recommendation

The Design Statements tab is one of TV's five tabs and lives inside the Layout Editor host, so an "identical drawing layout editor experience" includes it. Against that: VV has no statement content today (0 of 97 projects), the content layer is NA/UK-planning specific, TV's feature is unconfirmed by Adam and changing daily, and it hard-depends on five other TV-only systems plus a new VV transport.

**Recommendation:** in scope, as **the identical engine and tab with Vale-branded words and VV's own transport**, scheduled **last** among the Layout Editor parity work, ported from a pinned TV commit after (1) Adam signs the TV feature off and (2) the CRLF defect is fixed. *(Verifier: for (1), read "Adam gives the go-ahead for Vale and a stable TV commit is pinned". The TV feature is already in Adam's live use (v2.169-v2.172 are his own reports from the published RB05 statement), so there is no separate "confirm it works" step to wait for. Add (3): VV's sync purge is fixed (S07b-V01) before the first VV Publish.)* Port the pure `Lockstep` leaf **now** (the Specification slice needs it for TV v2.163). Gate the tab with a config switch (`LayoutEditor__Statement__Enabled`, back-ported to TV as default `true`) so VV can carry identical code while Adam decides whether Vale shows it. Decision D-S07b-01.

---

## (c) Module-by-module table

State for every row is **tv-only** (VV absent) unless stated. "TV devlog" = the releases that created or changed the file. Actions use the brief's enum.

| # | TV path (`02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/...`) | TV ver / lines | VV path | What VV lacks (TV devlog) | Action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|---|
| 1 | `01__Core__Data/Na__LayoutEditor__Statement__Data__.js` (Na__LeStmt) | 1.2.0 / 1,195 | same path | whole module: index, open statement, draft, autosave, lockstep watch, CRUD, MarkPublished, CHANGED/OPEN events (v2.95; 1.1.0 lockstep v2.157; 1.2.0 reader lists published only v2.169) | port_adapted | storage prefixes `Na__TrueVision__StatementDraft__`/`Discarded__` (:158-159) -> `Na__ValeVision__...`; `STARTER` template (:168-198: NA logo URL, "Mr Adam Noble of Noble Architecture", UK planning header) -> Vale starter (or config, S07b-F51); `GetProjectFolderFromUrl` (:101, :289, :332, :837, :932) -> VV folder id/name (`NormalizeProjectFolderId(GetProjectCodeFromUrl())`, strip `/^\d+__/` not `/^[A-Z]{2}\d{2}__/`); DrawView import 40->42; console prefix. **Verifier: also `{code}`.** `NameFor` (:833-842, :929-937) passes `Na__DrawData__GetProjectCode()` as the file-name `{code}`. In VV that is the raw `?project=` value, and Whitecardopedia launches VV with `?project=<folderId>` = `2026/3047__Doous` (PwaAppHelpers ValeVisionLinkRouting :52-54), so the file name would contain a `/`. Derive the code from the normalised folder (`3047`) or from project.json `projectCode` (S07b-V02) | Transport (VV), Lockstep, Index, ConfigState `GetStatementSetup`, ConfirmDialog |
| 2 | `01__Core__Data/Na__LayoutEditor__Statement__Data__Index__.js` (Na__LeStmtIdx) | 1.0.0 / 361 | same | pure index document, naming, adopt-detection (v2.95) | port_adapted (1 string) | `Na__LeStmtIdx__DESCRIPTION` (:62) is written into the index JSON and says "TrueVision Statement Writer ... 10__StatementDocs" -> ValeVision wording | - |
| 3 | `01__Core__Data/Na__LayoutEditor__Statement__Data__Transport__.js` (Na__LeStmtIo) | 1.1.0 / 434 | same | the transport unit (v2.95; 1.1.0 `modifiedIso`, `ReadStatementLocal` v2.157) | port_adapted (**rewrite body, keep the 15-name export list**) | the one VV seam the TV port note names ("the unit that would need its own bucket paths", :52-53): R2 via new worker routes + `X-Editor-Api-Key`; CDN `VaApps/Projects/{folderId}/10__StatementDocs`; local via the new Flask blueprint; `Last-Modified` from the blueprint's GET; never the catch-all static route | WP-S07b-03 transport |
| 4 | `01__Core__Data/Na__LayoutEditor__Statement__Images__.js` (Na__LeStmtImg) | 1.2.0 / 352 | same | trust-the-file-name link resolution, Used/Unused/Apply (v2.95; 1.1.0 published copies + srcset v2.171; 1.2.0 `target` v2.172) | port_verbatim | none (pure) | - |
| 5 | `01__Core__Data/Na__LayoutEditor__Statement__Lockstep__.js` (Na__LeStmtLock) | 1.0.0 / 245 | same | pure four-state verdict, times, line counts (v2.157) | port_verbatim (**first**) | none; also the prerequisite of TV v2.163 Spec lockstep (`SpecData__Lockstep__` :121-127, `SpecLockstep__` :67, `SpecEditor__Bar__` 1.4.0 :94) | - |
| 6 | `02__Core__Markdown/Na__LayoutEditor__Statement__Md__Figure__.js` (Na__LeStmtFigMd) | 1.0.0 / 474 | same | picture+title `<figure>` strings, AdoptCaptions (v2.165) | port_verbatim | none | Tokenise, Inline |
| 7 | `02__Core__Markdown/Na__LayoutEditor__Statement__Md__Inline__.js` (Na__LeStmtInl) | 1.0.0 / 421 | same | inline scanner, newline = `<br>` (v2.95) | port_verbatim | none | - |
| 8 | `02__Core__Markdown/Na__LayoutEditor__Statement__Md__Render__.js` (Na__LeStmtRnd) | 1.2.0 / 397 | same | renderer, expanders, FigureZoom (v2.95; 1.1.0 v2.162; 1.2.0 v2.165) | port_verbatim | console prefix (:122) | Tokenise, Inline |
| 9 | `02__Core__Markdown/Na__LayoutEditor__Statement__Md__Serialise__.js` (Na__LeStmtSer) | 1.0.0 / 287 | same | DOM -> markdown with copy-if-untouched (v2.95) | port_verbatim | none | Inline |
| 10 | `02__Core__Markdown/Na__LayoutEditor__Statement__Md__Tokenise__.js` (Na__LeStmtMd) | 1.0.0 / 501 | same | byte-preserving tokeniser (v2.95) | port_verbatim + **CRLF fix** (decision D-S07b-02) | none; LF-only (:264, :65-73) - see S07b-F10 | - |
| 11 | `03__Ui__Page/Na__LayoutEditor__Statement__Manager__.js` (Na__LeStmtMgr) | 1.1.0 / 407 | same | create/rename/delete/adopt sheet (v2.95; 1.1.0 authors only v2.169) | port_verbatim | placeholder "Design and Access Statement" (:308) is UK-planning wording - keep unless D-S07b-04 says otherwise; in VV the confirms show the styled `#naConfirmDialog` modal | Data, ConfirmDialog |
| 12 | `03__Ui__Page/Na__LayoutEditor__Statement__Page__.js` (Na__LeStmtPage) | 1.6.0 / 1,039 | same | the tab (v2.95; 1.1.0 DocumentKeys v2.110; 1.2.0 lockstep sheet v2.157; 1.3.0 Standard Sections v2.162; 1.4.0 Share v2.166; 1.5.0 schedule source v2.167; 1.6.0 Manage authors-only v2.169) | port_adapted | keys `Na__TrueVision__StatementView__/Mono__/Last__` (:179-181) -> `Na__ValeVision__...`; Standard Sections title names "TrueVision 3D Project Hub" (:320); stylesheet self-injection (:824-834) works as-is (dedupes by absolute href); imports Share/QR/ContextMenu/DocumentKeys/Schedule Live must exist | Data, Editor, Reader, Manager, Pdf, Publish, Registry, Schedule Live, ProjectQr, ContextMenu renderer, Share Button, DocumentKeys |
| 13 | `04__Ui__Editor/Na__LayoutEditor__Statement__Editor__.js` (Na__LeStmtEd) | 1.4.0 / 683 | same | the writing surface (v2.95; 1.1.0 v2.162; 1.2.0 v2.165; 1.3.0 v2.167; 1.4.0 v2.168) | port_verbatim | console prefix only | Typing, Cards, Registry, Data, Images, ConfirmDialog |
| 14 | `04__Ui__Editor/Na__LayoutEditor__Statement__Editor__Cards__.js` (Na__LeStmtCard) | 1.3.0 / 724 | same | frozen cards, figure titles, Sync button, dropped-picture store (v2.95; 1.1.0 v2.162; 1.2.0 v2.165; 1.3.0 v2.167) | port_adapted | `Na__LeStmtCard__Store` (:656-688; imports :92, query :666-667) POSTs to `/api/truevision/statements/image?project-folder=&year=` using `GetProjectFolderFromUrl`/`GetYearFromUrl` (absent in VV) -> call the transport unit (VV `/api/valevision/statements/image`) | Data, Images, Figure, Move, Registry, Render, Serialise, Md__Figure, ProjectLoader |
| 15 | `04__Ui__Editor/Na__LayoutEditor__Statement__Editor__Figure__.js` (Na__LeStmtFig) | 1.2.0 / 839 | same | picture menu, justify, crop, frame/shadow, title switch (v2.97; v2.99; 1.1.0; 1.2.0 v2.165) | port_verbatim | 13 `Statement*` labels are read with built-in fallbacks (GetLabel) - none needed in config | ContextMenu renderer (27), ConfigState, Md__Figure |
| 16 | `04__Ui__Editor/Na__LayoutEditor__Statement__Editor__Move__.js` (Na__LeStmtMove) | 1.1.0 / 323 | same | drag a standard section between dividers (v2.162) | port_verbatim | none | - |
| 17 | `04__Ui__Editor/Na__LayoutEditor__Statement__Editor__Typing__.js` (Na__LeStmtType) | 1.0.0 / 570 | same | live markdown typing (v2.95) | port_verbatim | none; **needs KeyScope/DocumentKeys first or VV's 3D hotkeys eat letters** (S07b-F34) | Tokenise, Render, Serialise |
| 18 | `05__Ui__Reader/Na__LayoutEditor__Statement__Reader__.js` (Na__LeStmtRead) | 1.1.0 / 178 | same | the Read view (v2.95; 1.1.0 published copies v2.171) | port_verbatim | none | Tokenise, Render, Data, Images, ProjectLoader |
| 19 | `06__Export__Pdf/Na__LayoutEditor__Statement__Pdf__.js` (Na__LeStmtPdf) | 1.2.0 / 449 | same | rasterised pageless PDF (v2.95; presets v2.99; 1.1.0 link annotations/Unzoom v2.162; 1.2.0 OwnSize v2.171) | port_verbatim | none, once `Na__LePdf__LoadLibrary` exists in VV and html2canvas is vendored | PdfExporter `LoadLibrary`, html2canvas, ConfigState |
| 20 | `07__Export__Publish/Na__LayoutEditor__Statement__Publish__.js` (Na__LeStmtPublish) | 1.2.0 / 349 | same | Publish run (v2.95; 1.1.0 styles written in v2.170; 1.2.0 picture sizes v2.171) | port_adapted | CfApi `IsConfigured/StatementFileLocation/WriteStatementFile` and `LocalMirror__WriteStatementFile` (imports :107-112; calls :245, :271, :277, :282, :326) -> transport unit; fonts path `../../../../03__Style__AppStylesheets/Na__CoreUi__Styles__Fonts__.css` resolves identically in VV | Transport, Publish__Page, Publish__Images, Registry Ready, ProjectQr Ready, Data, Images |
| 21 | `07__Export__Publish/Na__LayoutEditor__Statement__Publish__Images__.js` (Na__LeStmtPub) | 1.2.0 / 312 | same | resize + send linked pictures (v2.95; 1.1.0 v2.170; 1.2.0 link-address storage v2.172) | port_adapted | CfApi -> transport; reads the original through `location.repoUrl` (:263); CfApi calls :95-96, :223, :256, :273 - must be a 404-honest VV URL | Transport, ConfigState |
| 22 | `07__Export__Publish/Na__LayoutEditor__Statement__Publish__Page__.js` (Na__LeStmtPubPage) | 1.0.0 / 401 | same | the published HTML page (v2.170) | port_adapted (1 string) | `<meta name="generator" content="Noble Architecture - TrueVision Statement Writer">` (:338); reset CSS (:121-127) equals VV's `Na__CoreUi__Styles__BaseLayout__.css` :7-11 | Tokenise, Render, Inline |
| 23 | `08__Style__Stylesheets/Na__LayoutEditor__Styles__Statement__.css` | - / 1,049 | same | chrome: page, bar, pills, desk, editor, cards, crop tool, drop, standard sections/move, manager, lockstep sheet, progress, narrow screens | port_verbatim | all seven `--Na_Le_*` tokens it uses exist in VV `10__Core__SheetSurface/Na__LayoutEditor__Styles__Surfaces__.css`; `.na-le-btn*` classes exist in VV Panels CSS :528-572 | Surfaces CSS, Panels CSS |
| 24 | `08__Style__Stylesheets/Na__LayoutEditor__Styles__Statement__Document__.css` | - / 1,330 | same | the house document style (NA Typora theme "01-na-diary-view-a4.css" v2.1.1; v2.95, v2.97, v2.99, v2.162-v2.168 regions) | port_verbatim (D-S07b-05) | olive `#555041` throughout; hub navy `#172b3a` = Vale brand blue (`--Vale_PrimaryBrand`); the same NA theme already sits at VV's git root as `VSCode_MarkdownRenderStyle_CoreStandard.css`; needs Open Sans 500 | Fonts CSS (500) |
| 25 | `09__Standard__Sections/Na__LayoutEditor__Statement__Standard__Config__.json` | - / 191 | same | every standard-section word (v2.162-v2.168; reworded by b884e290 30-Sep) | port_adapted (data) | Vale logo absolute URL, "Prepared By" default, footer copyright "Vale Garden Houses", hub words (D-S07b-06); keep the UK planning field names unless Adam says otherwise | Registry |
| 26 | `09__Standard__Sections/Na__LayoutEditor__Statement__Standard__Contents__.js` (Na__LeStmtToc) | 1.0.0 / 248 | same | Contents drawn from headings (v2.162) | port_verbatim (1 string) | fallback text "TrueVision's Statement Writer" (:77) | Registry |
| 27 | `09__Standard__Sections/Na__LayoutEditor__Statement__Standard__DrawingSchedule__.js` (Na__LeStmtSched) | 1.0.0 / 579 | same | pure parse/build/merge/describe (v2.167) | port_verbatim | none | Inline |
| 28 | `09__Standard__Sections/Na__LayoutEditor__Statement__Standard__DrawingSchedule__Live__.js` (Na__LeStmtSchedLive) | 1.0.0 / 140 | same | Sync source: register rows + spec row (v2.167) | port_verbatim (after DrawingRegister) | DrawView 40->42; without the register, the Page must not import it ("no source, no Sync button" is the designed fallback) | DrawingRegister `Na__LeRegPdf__Rows`, SpecData |
| 29 | `09__Standard__Sections/Na__LayoutEditor__Statement__Standard__Finishes__.js` (Na__LeStmtFin) | 1.0.0 / 644 | same | finishes comparison (v2.168) | port_verbatim | words in config | Inline, Tokenise |
| 30 | `09__Standard__Sections/Na__LayoutEditor__Statement__Standard__Footer__.js` (Na__LeStmtFoot) | 1.0.0 / 311 | same | document footer (v2.167) | port_adapted (default) | default `Copyright: (c) {Year} Noble Architecture` (:93) -> Vale | Registry |
| 31 | `09__Standard__Sections/Na__LayoutEditor__Statement__Standard__Header__.js` (Na__LeStmtHead) | 1.0.0 / 324 | same | document header (v2.162) | port_adapted (defaults) | NA logo URL (:86), "Prepared By" (:94), `alt="Noble Architecture"` (:208) -> Vale | Registry |
| 32 | `09__Standard__Sections/Na__LayoutEditor__Statement__Standard__Registry__.js` (Na__LeStmtStd) | 1.3.0 (header) / 818 | same | list, markers, placement anchors, expander, sync API (v2.162 1.0/1.1; v2.167 1.2; v2.168 1.3) | port_verbatim (+ optional DEFINITIONS filter, S07b-F51) | static `DEFINITIONS` (:155-162) includes the hub | all six sections, Render, Tokenise |
| 33 | `09__Standard__Sections/Na__LayoutEditor__Statement__Standard__TrueVisionHub__.js` (Na__LeStmtHub) | 1.1.0 / 323 | same or `..._ValeVisionHub__.js` | TV 3D hub section (v2.162; 1.1.0 site-neutral words; reworded b884e290) | needs_decision (D-S07b-06) | TV-branded copy; QR `/q/?CODE` short address (no `/q/` resolver for VV); project name from `window.TrueVision__Pwa__ProjectContext` (:206) which VV lacks (VV's own `SpecPdf__.js` :147 has the same dead reference) | ProjectQrCode (53), VV project-name source |
| 34 | `NAAPPS/ProjectVision__TrueVisionStatements__Api__.py` | - / 451 | `WCP/Server__ValeVisionStatements__Api__.py` (new) | local file routes (v2.95) | build_vv_transport | same rules (fence after resolution, segment pattern, suffix lists, size caps, never overwrite pictures, delete needs confirm), root `WCP/Projects/{year}/{folder}/10__StatementDocs`, prefix `/api/valevision/statements`, plus `index` GET/POST and `file` GET with `Last-Modified`; delete to a quarantine folder like the VV scrapbook API | `WCP/server.py` registration |
| 35 | TV worker `/r2/*` via `TVM/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` :500-731 | 1.5.0 | `WCP/CloudflareWorker/src/handlers/CloudflareHandler__StatementDocs__.js` (new) | R2 writes/reads of index, markdown, HTML, pictures | build_vv_transport | `X-Editor-Api-Key`; key guard `VaApps/Projects/{folderId}/10__StatementDocs/` + same segment/suffix/depth rules; text vs base64 bodies; content type from body or extension | `WCP/CloudflareWorker/src/index.js` routes |
| 36 | `TVM/03__AppUtils/Na__AppUtils__LocalProjectMirror__.js` statement half | 1.2.0 | `VVM/03__AppUtils/Na__AppUtils__R2StatementDocs__.js` (new) | client for both of the above | build_vv_transport | follow `Na__AppUtils__R2DrawingNotes__.js` (worker GET/POST with key, CDN fallback, Flask mirror) | WP-S07b-03 |
| 37 | `TV/TrueVision__NOTES__StatementWriter__.md` | 846 | `VV/ValeVision__NOTES__StatementWriter__.md` (new) | the map of the feature | port_adapted | VV paths, transport, test server; fix stale key-map filename (section 14) | - |

Tests (all absent in VV; all `port_test`):

| TV test | Lines | Checks (TV) | Today on TV | VV adaptation |
|---|---|---|---|---|
| `80__Testing__PrototypeEnvironment/Na__Test__StatementLockstep__.test.mjs` | 158 | 28 | PASS | verbatim |
| `.../Na__Test__StatementRoundTrip__.test.mjs` | 179 | synthetic + real file | FAIL 2 (CRLF) | replace RB05 with a VV fixture statement (+ a CRLF case) |
| `.../Na__Test__StatementFigureTitle__.test.mjs` | 176 | 32 | FAIL 1 (live RB05) | fixture |
| `.../Na__Test__StatementStandard__.test.mjs` | 280 | 45 | FAIL 5 (CRLF + stale hub wording :249) | fixture; VV hub words or hub excluded |
| `.../Na__Test__StatementSchedule__.test.mjs` | 353 | 64 | FAIL 1 (live row count) | fixture; register rows stubbed (already stubbed in TV) |
| `.../Na__Test__StatementFinishes__.test.mjs` | 337 | 59 | FAIL 3 (live [TO CONFIRM] count) | fixture; reads the DAS skill exemplar only when present |
| `.../Na__Test__StatementPublish__.test.mjs` | 424 | 87 | PASS | VV CDN base (`VaApps/Projects/...`), VV fonts/BaseLayout files, fixture |
| `.../Na__Test__StatementDomRoundTrip__.html` | 175 | browser | - | fixture URL on WCP Flask |
| `.../Na__Test__StatementTyping__.html` | 229 | browser (trusted typing) | - | verbatim paths |
| `.../Na__Test__StatementFigure__.html` | 284 | browser | - | verbatim |
| `.../Na__Test__StatementTypography__.html` + `Na__Test__Reference__TyporaTheme__.css` | 235 + 545 | browser, 18 element kinds | - | verbatim (VV fonts need 500) |
| `.../Na__Test__StatementStandard__.html` | 77 | browser + html2canvas | - | drop `TrueVision__Pwa__ProjectContext__.js` script tag (:27) |
| `.../Na__Test__StatementFinishes__.html` | 105 | browser + html2canvas | - | fixture |
| `.../Na__Test__StatementServer__.py` | 240 | e2e server, throwaway copy | - | register the VV blueprint against a temp `Projects` root; answer `/api/check-localhost` and `/api/editor-config` (fake key); guard worker writes |

---

## (d) Wiring notes

1. **Config** (hot files `VVM/LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json`, `..._ConfigState__EditorSetup__.js`, `..._ConfigState__.js`): add the `LayoutEditor__Statement__Config` block (TV AppConfig :1271-1330, 37 keys) with VV values: `FolderName` `10__StatementDocs`, `IndexFileName` `ValeVision__StatementDocs__.json`, `StylesheetUrl` the VV public address of the document CSS (GH Pages base `https://adam-noble-01.github.io/ValeCodebase/WebApps/ValeVision3D/...` - **unverified live**), `Html2CanvasScriptPath`; add labels `LayoutEditor__Labels__StatementsTab`/`StatementsTabTitle` (TV :595-596); add `Na__LeCfg__GetStatementSetup` (TV EditorSetup :163-210) to VV EditorSetup and re-export from ConfigState__ (TV :293, :429).
2. **ModeController** (hot file `VVM/LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js`, VV 1.18.0 vs TV 1.32.0): import Page Mount/Show/Hide and Data `OPEN_EVENT`/`Initialize` (TV :361-363); `VIEW_STATEMENT = 'statement'` (TV :431); `Na__LeStmt__Initialize` + `Na__LeStmtPage__Mount` **before** the viewer branch so readers get the Read view (TV :503-504; VV Build :375-436: surface mount :397, viewer branch :401-407 returns before the editor mounts); `Na__LeStmtPage__Hide()` in Enter/Leave/OpenSpecification/OpenRegister (TV :691, :766, :901, :933); `Na__LeMode__OpenStatements(options)` (TV :942-972, needs `EnterUnder` from TV 1.30.0); `OPEN_EVENT` listener (TV :1230); export `VIEW_STATEMENT`, `OpenStatements`. Belongs with the ModeController/TabStrip slice; this slice supplies the statement lines.
3. **VV loader facade** (hot file `VVM/LE/01__Core__Loader/Na__LayoutEditor__Loader__.js`): VV's TabStrip may import only the loader (`TabStrip` :103-131). Add `Na__LeLoad__VIEW_STATEMENT = 'statement'` beside `VIEW_SPEC` (:116), a `CheckNames` row (:290), `Na__LeLoad__OpenStatements(options)` = `WithEditor(editor => editor.mode.Na__LeMode__OpenStatements(options), false)` mirroring `OpenSpecification`, and export them. Optional: add the two statement CSS files to `Na__LeLoad__STYLESHEETS` (:125-134); not required (the page self-injects, deduped by absolute href).
4. **TabStrip** (hot file `VVM/LE/05__Core__ModeController/Na__LayoutEditor__TabStrip__.js`, VV 1.5.0 per-sheet tabs vs TV 2.0.0 five tabs): the Design Statements tab is part of the TabStrip 2.0.0 port (TV :358-361); in VV it calls the facade (`Na__LeLoad__OpenStatements`) and reads `Na__LeLoad__GetView() === Na__LeLoad__VIEW_STATEMENT`. If `LayoutEditor__Statement__Enabled` (D-S07b-01) is false, the tab is not built.
5. **Keyboard** (prerequisite): VV `VVM/03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js` treats only input/textarea/select as typing (:53-56, :92). ~~Its dictionary binds R, B, T, Y, V, F, 1-9, PageUp/PageDown and Backspace -> NavigateBack~~ **Corrected by verifier:** a match calls `preventDefault()` before dispatch (:96), and the dictionary matches these **bare** keys: r, b, t, y, v, 1-9, PageUp, PageDown, **and also d, o, Delete and Escape**. The last four are documentation entries whose action `ValeVision__DrawingMarkup__Contextual` has no callback, so they are swallowed with a console warning. Upper-case letters typed with Shift are not matched. **F is bound only as Alt+Shift+F** (fog toggle) and **Backspace only as Alt+Backspace** (`history.back()`, index.html :1800, dictionary :182-183), so plain Backspace is NOT stolen. A contenteditable statement would therefore lose the letters r, b, t, y, v, d and o, the digits 1-9, Delete and Escape, and Alt+Backspace would leave the page. Port KeyScope (`03__AppUtils/Na__AppUtils__KeyScope__.js` 1.1.0) + DocumentKeys (`LE/31__System__DocumentKeys/` 1.1.0 + `Na__Hotkeys__DocumentTabs__.json`) and make VV's handler act only in the model scope (TV did this to `Na__Hotkeys__Manager.js` 2.1.0, v2.110) before the statement editor ships.
6. **Context menu**: Page (Standard Sections menu) and Figure (picture menu) need `27__System__ContextMenuSystem/Na__ContextMenuSystem__Ui__MenuRenderer__.js` (a 394-line leaf) and its stylesheet `Na__ContextMenuSystem__Styles__.css` (TV CSS index :103). Folder 27 is free in VV top level. *(Verifier: no slice owns this port. S09 says "port with 52 Statement", and S10 marks 27 optional and wrongly says it has no LE use. The renderer has no imports and runs on built-in defaults, and its 157-line CSS holds only `.na-context-menu*` rules. The CSS reaches the page only through TV's app CSS index, so in VV it must be linked explicitly, through the loader's STYLESHEETS (WP-S03a-07 pattern) or VV's CSS index. New WP-S07b-11.)*
7. **Project QR code**: Page and Publish await `Na__ProjectQr__Ready()`; the hub draws the symbol. Static imports - the module must exist even if the hub is excluded. *(Verifier: it is also reached by the Editor and Cards, because both import the Registry, which imports the Hub, which imports Symbol, Painter and ProjectLink. So the writing surface cannot load in VV before WP-S07a-04, and a config filter on DEFINITIONS does not remove that static import.)*
8. **Document Sharing** (mutual): Page imports `Share__Button__` (Share in Read); `Share__Open__`, `__Manifest__`, `__Button__` import Statement Data (`EnsureLoaded`, `List`, `CHANGED_EVENT`). Order: port Statement Data before or with DocumentSharing. In VV, `Share__Open__` must be started through the loader, not from `index.html` as TV does (TV Index.html :904, call :1738), or the Statement Data and its transport land on VV's start-up path and break the lazy loader. *(Verifier: "start it through the loader once the editor has loaded" is circular for a shared link: the link itself must cause the editor to load. TV's Share__Open__ imports the ModeController directly (:67-69) and calls `Na__LeMode__OpenStatements({statementId, view:'read'})` (:276). VV needs a light boot-time check of the share parameter, with no static editor import, that calls the loader facade (`Na__LeLoad__OpenStatements`, or a generic facade entry) when a link is present. Coordinate with WP-S08-11 and WP-S09-12. S07b-V07.)*
9. **Specification lockstep**: TV v2.163 Spec lockstep imports `Na__LayoutEditor__Statement__Lockstep__.js`; port it first (WP-S07b-01).
10. **PDF exporter**: VV `LE/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js` exports `EnsureJsPdf` (jsPDF only). Either the PdfExporter 1.12.0 port lands first, or add `Na__LePdf__LoadLibrary` as an alias export (one line).
11. **Drawing Register**: `__Live__` imports `Na__LeRegPdf__Rows`; ModeController's `OpenStatements` hides the register (`Na__LeRegEd__Hide`). Without the register in VV, omit the Live import (no Sync button) and the hide call (VV adaptation recorded in the port note). *(Verifier: whether VV gets a register at all is an **open decision for Adam** recorded in VV's ledger (`ValeVision__PARITY__TrueVisionLedger__.md`, the TV v2.71.0 Document ID row, "needs Adam's decision on whether ValeVision gets a register at all"). Until it is decided, the Page's static `DrawingSchedule__Live__` import (Page :157) is a Page adaptation, and S07b-F12 must list it.)*
12. **Service worker** (hot file `WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js`): VV's SW serves deployed JS/CSS stale-while-revalidate and relies on `PWA_SW_VERSION_TOKEN` (:229, currently `2026-09-18-1`); bump it in the release that adds the tab (the TV v2.97 stale-stylesheet fault applies). Adding the statement CSS to `PWA_SW_SHELL_PRECACHE_RELATIVE` (:260) is optional (TV does, :763-764).
13. **Worker + Flask registration** (hot files `WCP/CloudflareWorker/src/index.js`, `WCP/server.py`): route the new handler before the generic `projects/(.+)` save route (index.js pattern); `app.register_blueprint(valevision_statements_api)` beside the scrapbook one (server.py :95-96). Worker redeploy via `WCP/CloudflareWorker/Deploy__Worker.bat` is Adam's.
14. **Repository hygiene** (hot files `D:\10_CoreLib__ValeCodebase\.gitignore`, `.gitattributes`): add the allowlist (track only `.md`, `.html`, `.json` under `WebApps/Whitecardopedia/Projects/**/10__StatementDocs/**`; TV `.gitignore` :115-136) and an `eol=lf` rule for those files (S07b-F10).
15. **Project name source**: the hub (and VV's existing `SpecPdf__.js` :147) read `window.TrueVision__Pwa__ProjectContext`, which VV never defines; give VV one source (project.json `projectName`) and use it in both.

---

## (e) UI notes

- **Tab strip**: TV shows "Design Statements" as the fifth tab whenever the strip shows (TabStrip 2.0.0 :358-361; v2.158 "still Adam's call": label could be "Design Statement"). VV still has per-sheet tabs + Project Specification (TabStrip 1.5.0). The statements tab arrives with the TabStrip 2.0.0 port.
- **Page chrome** reads as the Specification/Register pages (same `--Na_Le_*` palette and `.na-le-btn` classes, both present in VV), so no VV restyle is needed for the chrome.
- **Confirmations**: VV's `#naConfirmDialog` modal (index.html :1323, z-index 9999 over the LE host's 600) replaces TV's `window.confirm` fallback for Delete, Adopt, Sync and cloud-overwrite questions. Better UX in VV; browser tests must click the modal instead of stubbing `window.confirm`. Back-port candidate: add the dialog markup to TV Index.html (TV v2.167 notes the gap).
- **Lockstep sheet**: modal over the desk, no close button, focus on the newer answer, Tab trapped, Escape inert (Page 1.2.0).
- **Fonts**: the document style needs Open Sans **500**; VV fonts CSS lacks it, so headings and bold would render as synthetic/regular - add the Medium face (TV's TTF `na-apps/01__Assets__NaApps__CommonAssets/NaApps__CommonFonts/CommonFont-01__OpenSans__Medium__.ttf` or a VV-hosted copy). TV v2.97 also changed Index.html's font console to report all four weights.
- **Narrow screens**: picker hidden < 720 px except for readers (`.na-le-stmt.is-reader .na-le-stmt__picker`, v2.169).
- **Header fold / top-nav animation**: the statements page is inside the LE host, so it inherits whatever header-fold behaviour the host has (TV v2.83 -> VV v2.70 already ported per the ledger). Nothing statement-specific.
- **Spellcheck**: the editor uses the browser's native spellcheck (`Editor__.js` :243, `Cards__.js` :502), not `55__Feature__SpellCheck` - no dependency on that slice.

---

## (f) Decisions needed

| Id | Question | Options | Recommendation |
|---|---|---|---|
| D-S07b-01 | Is the Statement Writer (Design Statements tab) in VV's scope? | (a) full identical port, Vale words, own transport; (b) identical code shipped behind `LayoutEditor__Statement__Enabled` (off until Adam turns it on); (c) out of scope - port only the Lockstep leaf and adapt DocumentSharing to drop statement links | **(a) with the switch from (b)**, default ON for parity; schedule last, after the prerequisites and Adam's sign-off of the TV feature. Port the Lockstep leaf now whatever is chosen. |
| D-S07b-02 | How to fix the LF-only tokeniser (CRLF statements render with no headings, tables or rules)? | (1) `.gitattributes` `**/10__StatementDocs/**/*.md text eol=lf` (+ .html/.json) in both repos; (2) tokeniser tolerates `\r\n` while keeping source lines byte-exact; (3) Data normalises to LF on read (breaks byte-for-byte on CRLF files) | **(1) + (2)**, done in TV first (back-port), then ported. Never (3). |
| D-S07b-03 | VV storage layout and names | folder `10__StatementDocs` beside project.json vs under `LayoutEditor/`; index `ValeVision__StatementDocs__.json`; file pattern for numeric codes (`3047_T01_S01__Doous__DesignAccessStatement__.md`) | Keep TV's folder name and patterns (config-driven), folder beside `project.json`, index `ValeVision__StatementDocs__.json`. |
| D-S07b-04 | Vale wording for UK-planning defaults (header fields Applicant / Site Address / Local Planning Authority, Manager placeholder "Design and Access Statement", Finishes vocabulary) | keep (Vale orangeries go through planning too) / replace with Vale terms | Keep the field names (generic UK planning); replace only names of people and companies. |
| D-S07b-05 | House document style in VV | port the NA Typora theme verbatim (olive `#555041`) / Vale restyle (navy `#172b3a`) via a token layer | Verbatim now (identical, and the same theme already styles markdown in the VV repo root); a token layer later if Vale wants navy. |
| D-S07b-06 | The TrueVision 3D Project Hub section in VV | (a) exclude from VV's DEFINITIONS; (b) "ValeVision 3D Project Hub" with Vale words and a VV project URL (QR only once VV has a short-link resolver); (c) keep the id `TrueVisionHub` with VV words in config | (b) with a config-only adaptation if Adam wants the nudge; otherwise (a). Keep the marker id stable per app. |
| D-S07b-07 | Keep the rasterised, text-free PDF policy for Vale? | keep / selectable text | Keep (identical; a policy, not a bug). |
| D-S07b-08 | Statement delete in the VV Flask blueprint | `shutil.rmtree` like TV / quarantine like VV's scrapbook API (`00__Deleted__Quarantine`) | Quarantine (VV convention, safer); offer as a TV back-port. |
| D-S07b-09 | Back-port prep in TV before the port | do it (route all IO through Transport, branding strings to config, DEFINITIONS filter, CRLF fix, stale test/notes fixes) / port as-is and carry more VV seams | Do it in TV first: it turns the VV port into 1 adapted file + config instead of 9 adapted files. |

---

## (g) Proposed work packages

Order: WP-01 now; WP-02 (TV side) and WP-03/WP-04 in parallel; WP-05 after WP-03/04 and the prerequisite slices; WP-06/07/08 after WP-05; WP-09 alongside; WP-10 last.

> **Verifier: work-package status.** WP-S07b-01 is REFUTED as a duplicate: WP-S06b-01 already ports the same file and test (S06b row STMT-01), so keep one owner. WP-S07b-05, -06 and -07 are REFUTED as a split. The Page statically imports Publish (07) and the Registry and Schedule Live (09); the Editor and Cards import the Registry; and the Registry imports the Hub, which imports ProjectQrCode. So none of the three can land or pass its acceptance alone. They are replaced by WP-S07b-05A (pure modules, inert), WP-S07b-05B (data, transport binding, reader, manager) and WP-S07b-05C (registry, hub, surface, PDF, publish and page, in one landing), plus WP-S07b-11 (the context-menu renderer leaf). See "## Verification". WP-02, 03, 04, 08, 09 and 10 stand, with the overlaps listed in S07b-V08.

### WP-S07b-01 - Statement Lockstep leaf (prerequisite for the Specification lockstep) - S **[REFUTED by verifier: duplicate of WP-S06b-01 (STMT-01); keep one owner]**
- Files (new, VV): `02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/01__Core__Data/Na__LayoutEditor__Statement__Lockstep__.js` (verbatim from TV HEAD, VALEVISION3D header, PORT NOTE), `80__Testing__PrototypeEnvironment/Na__Test__StatementLockstep__.test.mjs`.
- Hot files: none.
- Acceptance: `node 80__Testing__PrototypeEnvironment/Na__Test__StatementLockstep__.test.mjs` 28/28 in VV; `node 80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs` passes; the Spec lockstep port can import it at the TV-identical relative path.

### WP-S07b-02 - TV-side back-port prep (optional but recommended; TV repo) - M
- TV files: `Na__LayoutEditor__Statement__Data__Transport__.js` (new exports for picture store, file location, write), `Publish__.js`, `Publish__Images__.js`, `Editor__Cards__.js` (call Transport only), `Data__.js`/`Page__.js`/`Publish__Page__.js`/`Header__.js`/`Footer__.js`/`Contents__.js` (branding strings and storage prefixes to `LayoutEditor__Statement__Config` / Standard config), `Registry__.js` (optional `StatementStandard__Enabled` filter), `Md__Tokenise__.js` (CRLF tolerance), `.gitattributes` (eol=lf for statement files), `Na__Test__StatementStandard__.test.mjs` :249 (stale), all live-file tests switched to a frozen fixture, NOTES section 14 filename.
- Acceptance: all 7 TV node suites green on a frozen fixture and on a CRLF copy of it; zero CfApi/LocalMirror imports outside the Transport unit (`grep`); `Na__Verify__Exports__` passes.

### WP-S07b-03 - VV statement transport (worker, Flask, client) - M
- New: `WCP/CloudflareWorker/src/handlers/CloudflareHandler__StatementDocs__.js`, `WCP/Server__ValeVisionStatements__Api__.py`, `02__Src__AppModules/03__AppUtils/Na__AppUtils__R2StatementDocs__.js`.
- Hot files: `WCP/CloudflareWorker/src/index.js` (routes before the generic save route; header route list), `WCP/server.py` (import + `register_blueprint`).
- Routes: worker `GET|POST /api/editor/projects/{folderId}/statements/index`, `GET|POST /api/editor/projects/{folderId}/statements/file?path=` (text or base64 body, contentType), all with `X-Editor-Api-Key`; Flask `/api/valevision/statements/{index (GET/POST), tree (GET), file (GET with Last-Modified, POST), image (POST), folder (POST), move (POST), delete (POST, confirm == path, quarantine)}`.
- Acceptance: a Python test (pattern of VV `Na__Test__ScrapbookApi__.test.py`) proves fencing (`..`, absolute, symlink, depth > 8, bad segment, wrong suffix), size caps, picture never overwritten (`__02`), delete refused without confirm, `GET file` 404 JSON when missing and `Last-Modified` when present; worker routes exercised against `wrangler dev` (401 without key, 400 outside `10__StatementDocs`, round trip of md/html/webp with correct content types); nothing reads through `serve_static`.

### WP-S07b-04 - Environment and config prerequisites - M
- Hot files: `02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json` (Statement block with VV values + 2 labels + optional `Enabled`), `.../Na__LayoutEditor__ConfigState__EditorSetup__.js` (GetStatementSetup), `.../Na__LayoutEditor__ConfigState__.js` (re-export), `02__Src__AppModules/51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js` (`LoadLibrary` export, unless the PdfExporter port lands first), `03__Style__AppStylesheets/Na__CoreUi__Styles__Fonts__.css` (Open Sans 500), `04__Lib__ThirdParty__VersionLocked/` (new `06__Vendor__Html2Canvas__v1.4.1/html2canvas.umd.js` + `Vale__Dependencies__VersionLock__README__.md`/import-map index note), `D:\10_CoreLib__ValeCodebase\.gitignore` (allowlist), `D:\10_CoreLib__ValeCodebase\.gitattributes` (eol=lf for statement files).
- Acceptance: config JSON parses with no duplicate keys; `document.fonts.check('500 1em "Open Sans"')` true in VV; html2canvas loads from the configured path; `git check-ignore` proves a `.png` under a statement folder is ignored and the `.md` is not; `git ls-files --eol` shows `w/lf` for a statement after checkout.

### WP-S07b-05 - Core engine and tab port - L **[REFUTED by verifier: cannot land alone (Page imports 07/09; Editor/Cards import the 09 Registry -> Hub -> ProjectQrCode); replaced by WP-S07b-05A/05B/05C]**
- New (VV): the 20 files of `01__Core__Data` (4, Lockstep came with WP-01), `02__Core__Markdown`, `03__Ui__Page`, `04__Ui__Editor`, `05__Ui__Reader`, `06__Export__Pdf`, `08__Style__Stylesheets` under `02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/`.
- Adapted: Transport (rewrite on `Na__AppUtils__R2StatementDocs__`), Data (prefixes, starter, folder id/name), Index (description), Page (keys, title), Cards (store via Transport); headers VALEVISION3D and console prefix `[ValeVision3D]` everywhere; PORT NOTE on each file (Ported from TV HEAD b2aa9151, Parity verbatim/adapted, Divergences listed).
- Depends: WP-01, WP-03, WP-04; prerequisite slices DocumentKeys+KeyScope (incl. VV HotkeyHandler scoping), ContextMenu renderer, ProjectQrCode, DocumentSharing Share__Button (or sequence those first).
- Hot files: none outside the feature folder (wiring is WP-08).
- Acceptance: RoundTrip/FigureTitle node suites green on the VV fixture; `Na__Test__StatementTyping__.html` green in a browser served by WCP Flask; in-app on a throwaway VV project: create, type (R, T, 1, Backspace land in the text; camera and history untouched), Ctrl+S writes the file, Ctrl+/ and Ctrl+. switch once each, an outside edit to the `.md` raises the lockstep sheet within one poll, PDF has zero text (`fitz` check from NOTES section 13).

### WP-S07b-06 - Publish - M **[REFUTED by verifier: Publish imports the 09 Registry and the QR Symbol, and the Page imports Publish, so it cannot follow WP-05; folded into WP-S07b-05C]**
- New/adapted: `07__Export__Publish/` three files (Publish and Publish__Images adapted to Transport; Publish__Page generator string).
- Hot files: AppConfig (`StylesheetUrl`, already added in WP-04).
- Depends: WP-03, WP-05, ProjectQrCode, DocumentSharing (manifest listener).
- Acceptance: `Na__Test__StatementPublish__.test.mjs` green with VV CDN base and VV fonts/BaseLayout; a real publish against a throwaway project with worker writes faked: every linked picture written at its link's own key under `VaApps/Projects/{folderId}/10__StatementDocs/`, content types correct, index stamped last; off-localhost (`*.localhost` host) Read view loads every picture from the CDN copies with no 404.

### WP-S07b-07 - Standard sections - M **[REFUTED by verifier: the Editor, Cards and Page import the Registry, so it cannot follow WP-05; pure parts in WP-S07b-05A, Registry/Hub/Live in WP-S07b-05C]**
- New/adapted: `09__Standard__Sections/` nine files; Config JSON with Vale words (logo absolute URL, Prepared By, footer copyright, hub per D-S07b-06); Header/Footer/Contents defaults to match.
- Depends: WP-05; DrawingRegister slice for `__Live__` (else Page omits the import); ProjectQrCode for the hub.
- Acceptance: `Na__Test__StatementStandard__`, `__Schedule__`, `__Finishes__` node suites green on the VV fixture; on/off of every section gives the file back byte for byte; no two dividers touch; the hub (if kept) contains no "TrueVision" or "Noble Architecture" string.

### WP-S07b-08 - Wiring into VV's Layout Editor - M
- Hot files: `02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js`, `.../05__Core__ModeController/Na__LayoutEditor__TabStrip__.js`, `02__Src__AppModules/51__System__LayoutEditor/01__Core__Loader/Na__LayoutEditor__Loader__.js`, `WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js` (token).
- Depends: WP-05; the TabStrip 2.0.0 / ModeController 1.32.0 port (owner slice); DrawingRegister for `Na__LeRegEd__Hide`.
- Acceptance: from the 3D view the Design Statements tab loads the editor (loading screen), opens the first sheet quietly underneath and shows the page; switching 3D -> Drawings -> Specification -> Statements -> Register keeps one page visible; a reader session (`?authoring=off`) sees only Read, the published statements and no Manage; the loader's `CheckNames` reports no mismatch; `Na__Verify__ModuleGraph__.mjs` passes; the editor modules stay off the start-up path (no statement module in the network log before the first tab press).

### WP-S07b-09 - Tests, fixtures and test server - L
- New (VV `80__Testing__PrototypeEnvironment/`): the 13 test files and reference CSS above; a fixture statement folder (headings, `#### N.N |` sections, dividers, figures with titles and a crop, a comparison table, the header and footer house blocks, a CRLF twin) under `TestEnv__Fixtures/` or similar; `Na__Test__StatementServer__.py` adapted to the VV blueprint.
- Acceptance: all 7 node suites green in VV and independent of any live project file; browser harnesses green on WCP Flask; the server never writes outside a temp copy.

### WP-S07b-10 - Ledger, devlog and notes - S
- Hot files: `VV/ValeVision__PARITY__TrueVisionLedger__.md` (new "Return trip - Statement Writer (TV v2.95-v2.172 HEAD b2aa9151)" section, one row per file with verbatim/adapted), `VV/ValeVision__DEVLOG__.md` (new `## ValeVision3D v2.N.0 - DD-Mon-YYYY - ...` entry), new `VV/ValeVision__NOTES__StatementWriter__.md`.
- Acceptance: every ported file has a ledger row and a PORT NOTE naming its TV source version; the devlog lists the transport routes and the worker redeploy Adam must run.

---

## Appendix A - Evidence index

- TV devlog entries: v2.95 :6771-6948; v2.97 :6573-6664; v2.99 :6431-6507; v2.110 :5496-5573; v2.157 :1161-1212; v2.158 :1077-1159; v2.162 :797-871; v2.163 :704-795; v2.165 :556-618; v2.166 :466-554; v2.167 :360-464; v2.168 :275-358; v2.169 :205-273; v2.170 :126-203; v2.171 :64-124; v2.172 :5-62.
- TV git: the 29-Sep "Minor" commits that carry v2.162-v2.172 are 55014c6a, cbb05234, a6b8bac5, 0cc4dd6e, 501e5a4d, 089a02df; the only post-devlog change to the feature is b884e290 (30-Sep, hub words); HEAD b2aa9151 does not touch the feature.
- RB05 statement: CRLF 2,212; `git ls-files --eol` `i/lf w/crlf attr/text=auto`; TV `core.autocrlf=true`; VV `core.autocrlf=true`; both `.gitattributes` `* text=auto`.
- TV node tests 01-Oct-2026 (TEMP redirected): Lockstep 28 pass; Publish 87 pass; RoundTrip FAIL 2 ("every heading found (0 of 138)" / "(0 of 52)"); FigureTitle FAIL 1 ("every figure is one block (37, at least 23)"); Standard FAIL 5 (house order x2, Contents hub/columns, "ground level"); Schedule FAIL 1 (16 rows); Finishes FAIL 3 (NEW count, [TO CONFIRM] 13 -> 0, note-only proposal).
- VV absence: no `52__` subfolder in `VVM/LE/`; no `Statement` in VV ledger, plan, devlog; no statement routes in `WCP/server.py` or worker; no statement documents in `WCP/Projects`.
- Import closure from `Statement__Page__.js`: 274 files, 115 missing in VV (47,730 lines) - dominated by `Register__Pdf__`, `Share__Button__` and `PdfExporter__` pulling the sheet stack; the Statement Writer's own direct external needs are the 16 rows of table b.9.

## Appendix B - Finding index (matches the structured return)

| Id | Category | Action | Severity | Title |
|---|---|---|---|---|
| S07b-F01 | decision | needs_decision | high | Statement Writer (Design Statements tab) is absent from VV - scope decision **(corrected by verifier)** |
| S07b-F02 | folder | port_verbatim | medium | Create `LE/52__Feature__StatementWriter/` at the identical path, nine identical subfolders |
| S07b-F03 | module_naming | port_adapted | low | Keep every TV module and namespace name; VV-only transport files follow VV naming |
| S07b-F04 | missing_module | port_verbatim | high | Lockstep leaf first - the Specification lockstep (TV v2.163) imports it **(corrected by verifier)** |
| S07b-F05 | missing_module | port_adapted | high | Statement Data module (keys, starter, folder id) **(corrected by verifier)** |
| S07b-F06 | missing_module | port_adapted | low | Statement Data Index (one description string) |
| S07b-F07 | transport | port_adapted | critical | Transport unit is the single VV seam - rewrite on VV's worker and Flask **(corrected by verifier)** |
| S07b-F08 | missing_module | port_verbatim | medium | Picture-link resolution (Images) |
| S07b-F09 | missing_module | port_verbatim | high | Markdown engine, five pure modules |
| S07b-F10 | decision | backport_to_tv | critical | LF-only tokeniser + autocrlf checkouts: CRLF statements lose every heading, rule and table |
| S07b-F11 | missing_module | port_verbatim | medium | Document manager |
| S07b-F12 | missing_module | port_adapted | high | The tab page **(corrected by verifier)** |
| S07b-F13 | missing_module | port_verbatim | high | Editor, typing rules, section Move **(corrected by verifier)** |
| S07b-F14 | missing_module | port_adapted | medium | Frozen cards - dropped-picture store calls a TV-only route |
| S07b-F15 | missing_module | port_verbatim | medium | Picture menu (needs the context menu renderer) **(corrected by verifier)** |
| S07b-F16 | missing_module | port_verbatim | medium | Reader |
| S07b-F17 | missing_module | port_verbatim | medium | Rasterised PDF |
| S07b-F18 | missing_module | port_adapted | high | Publish and picture publishing **(corrected by verifier)** |
| S07b-F19 | missing_module | port_adapted | low | Published page builder |
| S07b-F20 | ui | port_verbatim | medium | Chrome and document stylesheets |
| S07b-F21 | data_schema | port_adapted | medium | Standard sections config - NA words |
| S07b-F22 | missing_module | port_verbatim | medium | Registry, Contents, Finishes, Drawing Schedule (pure) **(corrected by verifier)** |
| S07b-F23 | missing_module | port_verbatim | medium | Drawing Schedule live source needs the Drawing Register **(corrected by verifier)** |
| S07b-F24 | decision | needs_decision | medium | TrueVision 3D Project Hub section in VV |
| S07b-F25 | missing_module | port_adapted | low | Header and Footer defaults (NA logo, author, copyright) |
| S07b-F26 | transport | build_vv_transport | critical | VV Flask blueprint for statement files |
| S07b-F27 | transport | build_vv_transport | critical | VV worker handler for statement R2 writes |
| S07b-F28 | transport | build_vv_transport | high | VV client module `Na__AppUtils__R2StatementDocs__` **(corrected by verifier)** |
| S07b-F29 | transport | build_vv_transport | high | VV catch-all static route answers missing files with index.html 200 |
| S07b-F30 | data_schema | build_vv_transport | high | VV storage layout (folder, index, R2 keys, CDN) |
| S07b-F31 | wiring | update_wiring | high | Config block, GetStatementSetup, tab labels **(corrected by verifier)** |
| S07b-F32 | wiring | update_wiring | high | ModeController statement view |
| S07b-F33 | wiring | update_wiring | high | Loader facade and TabStrip tab **(corrected by verifier)** |
| S07b-F34 | wiring | update_wiring | critical | Keyboard: VV 3D hotkeys would eat statement typing (Backspace navigates back) **(corrected by verifier)** |
| S07b-F35 | wiring | update_wiring | high | Document Sharing <-> Statement Data mutual dependency; keep Share__Open off VV start-up **(corrected by verifier)** |
| S07b-F36 | wiring | update_wiring | medium | Project QR Code is a static import of page, publisher and hub **(corrected by verifier)** |
| S07b-F37 | wiring | update_wiring | medium | `Na__LePdf__LoadLibrary` export missing in VV |
| S07b-F38 | tooling | port_verbatim | medium | Vendor html2canvas 1.4.1 into VV **(corrected by verifier)** |
| S07b-F39 | tooling | update_wiring | medium | Bump VV's service worker token with the release |
| S07b-F40 | tooling | port_adapted | high | `.gitignore` allowlist for VV statement folders |
| S07b-F41 | ui | port_adapted | medium | Open Sans Medium (500) missing from VV fonts **(corrected by verifier)** |
| S07b-F42 | ui | keep_vv_divergence | low | VV's styled confirm modal vs TV's window.confirm |
| S07b-F43 | ui | needs_decision | medium | Design Statements tab label, placement and a config gate |
| S07b-F44 | wiring | port_adapted | low | VV has no project display-name source (`TrueVision__Pwa__ProjectContext`) |
| S07b-F45 | test | port_test | high | Seven node suites - must run on a VV fixture, not live files **(corrected by verifier)** |
| S07b-F46 | test | port_test | medium | Six browser harnesses + reference Typora CSS |
| S07b-F47 | test | port_test | medium | Statement end-to-end test server |
| S07b-F48 | test | port_test | low | Export/module-graph verification of the port **(corrected by verifier)** |
| S07b-F49 | ledger | fix_ledger | medium | No ledger section; TV notes name a stale key-map file |
| S07b-F50 | permanent_divergence | keep_vv_divergence | high | VV worker authenticates writes; TV's does not |
| S07b-F51 | decision | backport_to_tv | medium | TV-side prep: route all IO through Transport, branding to config |
| S07b-F52 | decision | needs_decision | low | House document style (NA olive vs Vale navy) |
| S07b-F53 | decision | needs_decision | low | Keep the deliberately text-free PDF for Vale |
| S07b-F54 | decision | needs_decision | high | TV feature still moving and unconfirmed - when and from which commit to port **(corrected by verifier)** |
| S07b-F55 | permanent_divergence | keep_vv_divergence | low | Delete to quarantine in the VV blueprint |
| S07b-F56 | data_schema | port_verbatim | medium | Index schema and statement folder structure stay identical |
| S07b-F57 | wiring | no_action | low | No dependency on Sheet Images, Document Publishing, Spell Check, Colour Palette or the Published Schema **(corrected by verifier)** |
| S07b-F58 | decision | needs_decision | low | UK-planning wording in the defaults |


---

## Verification

Adversarial verification, 01-Oct-2026, read-only against TV HEAD `b2aa9151` (clean) and VV HEAD `7b4e593a`. `WebApps/ValeVision3D` and `WebApps/Whitecardopedia` are unmodified; the VV repo shows unrelated edits in ValePlanner, ValeSpec and LanternDesigner. All scripts and scratch output are in `scratchpad/parity/verify_s07b/`. The pre-verification copy of this report is `verify_s07b/S07b__before_verification.md`.

### What was checked (about 80 claims)

- **Coverage.**
  - All 33 `drift_all.tsv` rows (all tv-only; 16,898 lines summed, matching the report). The 14 test files (3,252 lines) and the reference Typora CSS (545). The NAAPPS API (451) and the NOTES (846).
  - Every file maps to a finding: 01 -> F04-F08; 02 -> F09/F10; 03 -> F11/F12; 04 -> F13-F15; 05 -> F16; 06 -> F17; 07 -> F18/F19; 08 -> F20/F52; 09 -> F21-F25; API -> F26; NOTES -> F49; tests -> F45-F48.
  - The VV side holds no statement code under any name: I searched `VVM` for statement, LeStmt, markdown, tokenise and contenteditable, outside node_modules.
- **All 5 critical and all 18 high findings were opened against the files.** So were all 35 medium and low findings; F51 and F53 were checked only through the seams and config keys that other findings cite.
- **Re-executed:**
  - The 7 TV node suites with TEMP redirected. Results are identical to the survey: Lockstep 28 pass; RoundTrip 2 fail; FigureTitle 1 fail; Standard 5 fail; Schedule 1 fail; Finishes 3 fail; Publish 87 pass.
  - The tokeniser on a CRLF sample: four paragraphs instead of heading, paragraph, rule and table, and the join is still byte-exact. This reproduces F10.
  - The RB05 file: 2,212 CRLF. `git ls-files --eol` gives `i/lf w/crlf`. `core.autocrlf=true` comes from the system gitconfig, so it applies to both repos.
- **Recomputed:**
  - Every external import of the 33 files resolved against VV with the 40->42 map. 16 modules: absent are CfApi, LocalMirror, ContextMenu renderer, DocumentKeys, Register__Pdf, QR x3 and Share__Button; present but missing exports are `GetStatementSetup`, `LoadLibrary`, `GetProjectFolderFromUrl` and `GetYearFromUrl`.
  - The internal import graph of the feature, and the VV-relevant prerequisite closure (b.9).

### Corrections made (22 findings, details in the structured return)

- **F01, F54** - The TV feature is NOT "unconfirmed in every release". Only 4 entries say "NOT confirmed by Adam" and 6 say "NOT tried". v2.169-v2.172 are Adam's own live-use reports from RB05's published statement. Gate the port on a pinned commit and Adam's go-ahead for Vale, not on a confirmation that already exists in practice.
- **F34** - Key list corrected.
  - Bare r, b, t, y, v, d, o, 1-9, PageUp, PageDown, Delete and Escape are swallowed (preventDefault before dispatch; d, o, Delete and Escape are callback-less "Contextual" entries).
  - F is only Alt+Shift+F; Backspace is only Alt+Backspace. Plain Backspace is NOT bound.
  - Severity stays critical.
- **F05** - Adds the `{code}` seam (S07b-V02).
- **F07, F18, F28** - The transport rewrite is conditional on D-S07b-10. The same-name shim strategy (D-S09-04 (a), D-S07a-08 A) would port Transport, Publish and Publish__Images verbatim.
- **F04** - Owned by WP-S06b-01 (STMT-01), which already ports the same file and test.
- **F12** - The Page adaptation must also drop the static `DrawingSchedule__Live__` import while VV has no register (D-S07a-01 open).
- **F13, F22, F36** - The Editor and Cards reach ProjectQrCode through the Registry and the Hub. A DEFINITIONS config filter does not remove that static import. The Publish import line is :97, not :111.
- **F15** - No WP owns the MenuRenderer port, and its CSS must be linked explicitly in VV (new WP-S07b-11).
- **F23** - The Register is Adam's open decision (VV ledger; D-S07a-01).
- **F31, F33, F38, F41** - Overlap with WPs owned elsewhere: WP-S03a-01 (config block and EditorSetup 1.6.0), WP-S03a-05 and WP-S09-03 (loader facade), WP-S09-10 (html2canvas), WP-S10-09 (Open Sans 500).
- **F35** - VV needs a boot-time share-link entry that triggers the lazy editor (S07b-V07).
- **F45** - The Standard suite has 47 checks, not 45.
- **F48** - The 274/115 closure is a TV-graph artefact; the VV prerequisite set is 17 files and 7,001 lines.
- **F57** - The page does depend, transitively, on 53 PublishedSchema (Paths, Version), 52 `Na__PubDoc__Urls__` and 65 `Publish__Transport__`, through Share__Button -> Share__Manifest.

### Refuted

- No finding is refuted outright.
- **Work packages:**
  - WP-S07b-01 is a duplicate of WP-S06b-01.
  - WP-S07b-05, WP-S07b-06 and WP-S07b-07 cannot land separately: the Page imports 07 and 09, and the Editor and Cards import the 09 Registry, which imports the Hub, which imports QR.

### Added findings

| Id | Sev | Title |
|---|---|---|
| S07b-V01 | critical | VV project sync deletes every published statement picture from R2 (needs WP-S08-04, scoped to protect `10__StatementDocs/`) |
| S07b-V02 | high | Statement file names would carry `2026/3047__Doous` as `{code}` (slash in a file name) |
| S07b-V03 | high | Transport strategy conflicts across slices (S07b per-document client vs D-S09-04 / D-S07a-08 same-name shims vs S08 per-feature client + ProjectLoader facades) |
| S07b-V04 | medium | Statement worker routes: no-cache storage, no per-write build-manifest bump (global `?v=` token also busts GLBs) |
| S07b-V05 | high | Static import chain makes WP-05/06/07 one landing; the writing surface needs ProjectQrCode |
| S07b-V06 | medium | Context-menu renderer leaf + CSS has no owner; port it here, link the CSS |
| S07b-V07 | medium | Shared statement links need a boot-time entry that loads the lazy editor |
| S07b-V08 | medium | Cross-slice ownership overlaps to resolve before the swarm runs |
| S07b-V09 | low | The VV node suites need the QR port and a VV address simulation; Standard is 47 checks |
| S07b-V10 | low | The off-localhost acceptance needs a port other than 8000 or 8090 (VV's localhost test is port-based) |

### Added work packages and decisions

- **Work packages:**
  - WP-S07b-05A: pure modules, inert. 18 files, about 8,760 lines.
  - WP-S07b-05B: data, transport binding, reader and manager.
  - WP-S07b-05C: registry, hub, surface, PDF, publish and page, in one landing.
  - WP-S07b-11: the context-menu renderer leaf.
- **Decision D-S07b-10:** the transport strategy, aligned with D-S09-04 and D-S07a-08.

### Not verified

- **Live state:**
  - The deployed workers and the live R2/CDN state (no network probes).
  - The public URLs of a Vale logo and of VV's GitHub Pages stylesheet.
  - Whether Werkzeug's debug reloader picks up a new blueprint in WCP (asserted from `debug=True` only).
- **Not executed:** the six browser harnesses.
- **Not counted exactly:**
  - The 49-hit brand scan of the Standard config. My scan agrees on the strings, not the count.
  - The DocumentSharing and PublishedSchema internals beyond their import edges (S08 owns them).
- **The swallowed-key list (F34) is read from code, not typed in a browser.** It also means that VV's existing plan-annotation editor (contenteditable) loses d, o, Delete and Escape today. That is outside this slice; the keyboard slices (S03a, S05a, S09) list only R, B, T, Y and the digits.
