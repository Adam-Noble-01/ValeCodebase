"""W0-99 Parity Scribe - the Wave 0 pass over ValeVision__PARITY__TrueVisionLedger__.md.

Appends within the structure W0-06 established and never touches the Archive (section 9) or a history row:
  1.3  a dated note: DIV-5's residual closed (vendors 05-07)
  1.4  the Wave 0 service-worker line
  2.2  the dated release note for the renumber
  3    the dated "Blocked by" note; the rows Wave 0 changed (new state, old kept as [was: ...]); the "Blocked by"
       column for all rows (end-of-Wave-0 port-order map); one added 3.4 row; new 3.7 (Wave 0 by package)
  4    a dated intro bullet and count line; six rows NOT-CONSIDERED -> PARTIAL; dated notes on every row Wave 0 carried
  5.1  a dated note
  6    the back-port offers Wave 0 raised
  8    Transport (DIV-4), written in full below W0-06's stub
Pure CRLF and ASCII, as the file is. The Archive (from '## 9.' to the end) is proven byte-identical.

Usage: python -B update_ledger.py --build | --apply | --restore
"""
import hashlib, os, re, sys
import ledger_lib as L
import blocked_by as BB

HERE = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(HERE, 'ledger__candidate.md')
PRE = os.path.join(HERE, 'preimage_records', 'ValeVision__PARITY__TrueVisionLedger__.md')
EXPECT = '2f06bfef6112b5d57c10108a1c312f7c43814cde'      # W0-06's final SHA-1 (its Port Record)
REL = 'v2.71.1'


def sha1(b):
    return hashlib.sha1(b).hexdigest()


def was(new, old):
    old = old.strip()
    return new if old in ('', '-') else '%s [was: %s]' % (new, old)


def app(old, add):
    old = old.strip()
    return add if old in ('', '-') else '%s; %s' % (old, add)


def note(text):
    return '**[01-Oct-2026 note (W0-99): %s]**' % text


# -----------------------------------------------------------------------------
# Module Register: rows Wave 0 changed. key = VV path (TV path for the 3.5 rows), value = {column: fn(old) -> new}
# Columns: 0 VV path, 1 TV path, 2 TV source ver, 3 TV current ver, 4 Parity, 5 Divergences, 6 Open TV versions,
#          7 Loaded by, 8 Transport, 9 Checked, 10 Packages, 11 Blocked by
# -----------------------------------------------------------------------------
R = lambda new: (lambda old: was(new, old))
A = lambda add: (lambda old: app(old, add))
SET = lambda new: (lambda old: new)

FLIPS = {
    '01__AppCore/Na__AppFlow__LoadingSequence.js': {
        2: R('1.3.1 (TrueVision3D v2.161.0, 28-Sep-2026; read at HEAD b2aa9151) - hunks only (W0-13)'),
        4: A("W0-13 (v2.71.1): TrueVision's overlay, merge-base and scene-ready hunks replayed (TV v2.7.1, v2.8.0, v2.21.0)"),
        5: A('the facade is started after the master index (async Initialize); the overlay list is ProjectData__EditorOwnedKeys; '
             'the overlay is bounded, non-fatal and guarded by projectCode (W0-13)'),
        6: A("after W0-13: 1.3.0's design-phase start-up waits for W1-01 (DR-09), the progressive-render remainder for W2-07"),
        8: R('VV facade: Na__CfApi__Initialize, IsConfigured, ReadProjectData, SetLoadedProjectData (W0-13)'),
    },
    '03__AppUtils/Na__AppUtils__ProjectLoader.js': {
        4: A("W0-11 (v2.71.1): TrueVision's GetProjectFolderFromUrl / GetYearFromUrl names with ValeVision's meaning (master-index "
             'entry, four-digit year, null rather than a guess) and the localhost Flask-copy fallback in ResolveAssetUrl'),
        5: A('the two TrueVision names answer from the master index only (W0-11)'),
        6: A("2.0.1's cache:no-cache not taken (v2.139.1, NOT-DRAWING)"),
    },
    '03__AppUtils/Na__AppUtils__R2AssetUpload__.js': {
        2: R("contract from TV 1.0.1 (TrueVision3D v2.32.1, 13-Sep-2026; read at b2aa9151) on ValeVision's body (W0-14)"),
        4: R("diverged (DIV-4 twin: TrueVision's name, MODULE line, signature and non-throwing result over ValeVision's "
             'two-phase body) - W0-14, v2.71.1'),
        5: R('VV worker route /api/editor/projects/{folderId}/assets + Flask mirror (two-phase); a silent skip off localhost; '
             'one path-guard row per asset kind; resolves { r2Success, localSuccess, publicUrl, relUrl, error }, never throws'),
        6: R("none (TV 1.0.1's contract taken, W0-14)"),
    },
    '21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js': {
        2: R('1.1.0 (TrueVision3D v2.18.0, 07-Sep-2026; read at b2aa9151) - the call shape only (W0-14)'),
        4: R("diverged (DIV-1: a drawing's frame comes from ValeVision's composer preset); TrueVision's "
             'CaptureAndUpload(sceneId[, targetWidthPx]) call shape taken - W0-14, v2.71.1'),
        5: R('DIV-1 drawing branch; ok only on r2Success; uploads through R2AssetUpload, not Na__CfApi__WriteThumbnailWebp'),
    },
    '44__System__PlanDimensions/Na__PlanDimensions__Styles__.css': {
        4: A('banner VALEVISION3D and the PORT NOTE in K2 H5 order (W0-03, v2.71.1)'),
    },
    '50__System__ProjectedLinework/Na__ProjectedLinework__Persistence__.js': {
        2: R('1.2.1 (TrueVision3D v2.54.0, 14-Sep-2026; read at b2aa9151) - taken whole (W0-14)'),
        4: R('adapted - TrueVision 1.2.1 taken whole, seams re-applied (W0-14, v2.71.1)'),
        5: A("IndexedDB ValeVision3D__ProjectedLinework; stored Description 'one ValeVision drawing'; reads from the URL's "
             "project folder (W0-11's helpers)"),
        6: R('none (TV 1.2.1 taken whole at b2aa9151)'),
    },
    '51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__.js': {
        2: R('1.29.0 (TrueVision3D v2.149.0, 22-Sep-2026; read at b2aa9151) - taken whole (W0-15)'),
        4: R('adapted (header only; the code is verbatim) - TrueVision 1.29.0 taken whole (W0-15, v2.71.1)'),
        5: R('banner; INTEGRATION names the lazy loader; PORT NOTE'),
        6: R('none (TV 1.29.0 taken whole at b2aa9151)'),
    },
    '51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__EditorSetup__.js': {
        2: R('1.6.0 (TrueVision3D v2.163.0, 29-Sep-2026; read at b2aa9151) - taken whole (W0-15)'),
        4: R('adapted - TrueVision 1.6.0 taken whole, ValeVision values re-applied (W0-15, v2.71.1)'),
        5: R('spec file ValeVision__DrawingNotes__.json; statement index ValeVision__StatementDocs__.json; register: PDF.js '
             'vendor 07, no NA job stages, DocumentCodeFormat {project}_{drawing}; logo aspect 4.5'),
        6: R('none (TV 1.6.0 taken whole at b2aa9151)'),
    },
    '51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__KeyMap__.js': {
        2: R('1.11.0 (TrueVision3D v2.151.0, 22-Sep-2026; read at b2aa9151) - taken whole (W0-15)'),
        4: R("verbatim - TrueVision 1.11.0 taken whole with TrueVision's key file (W0-15, v2.71.1)"),
        5: R('banner and console prefix only'),
        6: R('none (TV 1.11.0 taken whole at b2aa9151)'),
    },
    '51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__Readers__.js': {
        2: R('1.0.0 (TrueVision3D v2.55.0, 15-Sep-2026; read at b2aa9151)'),
        4: A('PORT NOTE in K2 H5 form (W0-15, v2.71.1)'),
    },
    '51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js': {
        2: R('1.9.0 (TrueVision3D v2.140.0, 22-Sep-2026; read at b2aa9151) - taken whole (W0-15)'),
        4: R("adapted - TrueVision 1.9.0 taken whole, ValeVision fallbacks re-applied (W0-15); its jsPDF fallback is "
             "TrueVision's since W0-16 (v2.71.1)"),
        5: R('Vale logo, Drawn By, PDF author and creator fallbacks; rows fallback DrawingNumber and scales 20/50/100 until '
             'W1-22; Helvetica-first style font until W1-25; swing key ValeVision__Linetype__DoorSwings; PDF font fallbacks on '
             'the AD04 cuts (DR-21)'),
        6: R('none (TV 1.9.0 taken whole at b2aa9151)'),
    },
    '51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__ToolSetup__.js': {
        2: R('1.5.0 (TrueVision3D v2.144.0, 22-Sep-2026; read at b2aa9151) - taken whole (W0-15)'),
        4: R('verbatim - TrueVision 1.5.0 taken whole (W0-15, v2.71.1)'),
        5: R('banner and PORT NOTE only'),
        6: R('none (TV 1.5.0 taken whole at b2aa9151)'),
    },
    '51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__Assets__.js': {
        2: R('1.0.1 (TrueVision3D v2.54.0, 14-Sep-2026; read at b2aa9151) - taken whole (W0-14)'),
        4: R("adapted - TrueVision 1.0.1 taken whole, ValeVision's localhost upload gate re-applied (W0-14, v2.71.1)"),
        5: R("CanUpload = IsRunningOnLocalhost in place of TrueVision's DevGate (VV D24, DR-31 (2)); banner; console prefix; "
             "reads from the URL's project folder (W0-11's helpers)"),
        6: R('none (TV 1.0.1 taken whole at b2aa9151)'),
    },
    '51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__AutoSave__.js': {
        4: A("W0-08 (v2.71.1): TrueVision's unsaved-work flag replayed as window.Na__Pwa__HasUnsavedWork (inert until the "
             'prepared registrar is deployed); 1.5.0 whole waits for W1-07'),
        5: R('the flag is published as window.Na__Pwa__HasUnsavedWork (K2 K4); its reader is the staged Whitecardopedia '
             'registrar (W0-08, not deployed); re-apply the name when W1-07 takes 1.5.0 whole'),
    },
    '51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js': {
        2: R('1.0.0 (TrueVision3D v2.63.0, 17-Sep-2026; still 1.0.0 at HEAD b2aa9151)'),
        4: R('adapted - the project name through Na__CfApi__GetProjectDisplayName (W0-12) and the console prefix (W0-03); '
             'v2.71.1'),
        5: R("Helvetica (no PdfFonts until W1-25); the project name from the facade accessor (alias > displayName > "
             "projectName) in place of TrueVision's PWA global"),
        8: R('VV facade: Na__CfApi__GetProjectDisplayName (W0-12)'),
    },
    '51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js': {
        5: lambda old: ('Helvetica; StyleBands [was: %s - its jsPDF part closed in v2.71.1: jsPDF 4.1.0 at TrueVision\'s '
                        'vendor 05 path, W0-16]' % old.strip()),
    },
    '51__System__LayoutEditor/80__Feature__WebViewer/Na__LayoutEditor__Styles__WebViewer__.css': {
        4: A('banner token ValeVision3D (the W0 gate, FIX-1; v2.71.1)'),
    },
    '02__AppData/Na__AppConfig__Main.json': {
        4: A('W0-07 (v2.71.1): the ValeVision-only block ProjectData__EditorOwnedKeys (13 keys), the one list the sync, the '
             "worker's merge-keys guard and the localhost overlay read"),
        5: R('ProjectData__EditorOwnedKeys (ValeVision-only, DR-06, DR-30)'),
    },
    '51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json': {
        4: R("adapted - every TrueVision key, block, note and label in one additive pass, in TrueVision's formatting (W0-15); "
             'the jsPDF path and the Classic scan repointed (W0-16); 79 listed seams held by Na__Test__AppConfigParity__ '
             '(v2.71.1)'),
        5: R("79 seams: brand 17, decision 12, identity 11, NA path 3, TrueVision defect 3, ValeVision-only 8, withheld 25 "
             "(each with its owner in the test's allow-list)"),
    },
    '51__System__LayoutEditor/03__Core__Config/Na__Hotkeys__DrawingTabs__.json': {
        4: R("verbatim - TrueVision's key file, landed with KeyMap 1.11.0 (W0-15, v2.71.1)"),
        5: A("W0-15: TrueVision's content (59 bindings, 63 actions)"),
    },
    # 3.5: landed at TrueVision's path
    '03__AppUtils/Na__AppUtils__LocalProjectMirror__.js': {
        0: SET('`03__AppUtils/Na__AppUtils__LocalProjectMirror__.js`'),
        1: SET('same path'),
        2: R('1.2.0 (TrueVision3D v2.146.0, 22-Sep-2026; read at HEAD b2aa9151) - the interface only (W0-12)'),
        4: R("diverged (DIV-4: TrueVision's 8 names and signatures over WCP server.py) - landed W0-12, v2.71.1"),
        6: R('none for the interface (TV 1.2.0 mirrored at b2aa9151)'),
        7: R("- (nothing imports it yet; TrueVision's ProjectData 1.6.0 does, W1-05)"),
        8: R('WCP server.py: POST /api/projects/<folderId> (X-ValeVision-Drawings-Base), drawings-fingerprint, files/<name>, '
             '/api/valevision/statements/*'),
    },
    '80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js': {
        0: SET('`80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js`'),
        1: SET('same path'),
        2: R('1.5.0 (TrueVision3D v2.116.0, 21-Sep-2026; read at HEAD b2aa9151) - the interface only (W0-12)'),
        4: R("diverged (DIV-4: TrueVision's 33 names and signatures, plus the ValeVision-only Na__CfApi__GetProjectDisplayName, "
             "over whitecardopedia-editor-api, ValeVision's R2 layout and Flask) - landed W0-12, v2.71.1"),
        6: R('none for the interface (TV 1.5.0 mirrored at b2aa9151)'),
        7: R('`Na__AppFlow__LoadingSequence.js` (+1)'),
        8: R('whitecardopedia-editor-api (1.5.0 routes; project, merge-keys and files once /health lists them), WCP Flask, '
             'the CDN; keys under VaApps/Projects/<folderId>/ (section 8)'),
    },
    '03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js': {
        4: A("fetches TrueVision's file name Na__Hotkeys__3dModelTab__.json since W0-03 (v2.71.1)"),
        10: SET('W0-03, W1-29'),
    },
}
PAGELAYOUT_35 = A('jsPDF and the Classic scan copied out by W0-16 (v2.71.1); this folder is untouched and Image Export still '
                  'loads it')

NEW_34_ROW = ('| `05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js` | same path | 1.0.0 (TrueVision3D v2.12.0, '
              '31-Aug-2026; read at b2aa9151) | 1.0.0 | adapted (identical code; TrueVision\'s NAMESPACE and MODULE lines '
              'since W0-03, v2.71.1; the rest of the header is ValeVision\'s) | DESCRIPTION, INTEGRATION, PURPOSE and CREATED '
              'describe ValeVision\'s dual engine and 41 CrossSectionView (F.8 C12) | none | `Na__DrawView__RenderPreset__.js` '
              '(+11) | - | 01-Oct-2026 | W0-03 | %s |')

SECTION_37 = [
    '### 3.7 Wave 0 (ValeVision3D v2.71.1): what each package changed',
    '',
    'Written 01-Oct-2026 by the Wave 0 Parity Scribe (W0-99) from the nineteen Port Records',
    '(`ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/port_records/`) and the integrator\'s gate report',
    '(`.../execution/gate_reports/W0.md`). "Rows" are the rows above that the package changed; a package whose work is not a',
    'module of this register is pointed at the section that records it.',
    '',
    '| Package | What it changed | Rows | Elsewhere in this ledger |',
    '|---|---|---|---|',
    '| W0-01 | The PLAN\'s section 2A: D41-D91 (every DR and open question on its default), the swarm rules and gates | none | 5.1 |',
    '| W0-02 | The renumber: 7 folders and 4 files moved (81 renames), 94 files rewritten; RenderPreset takes TrueVision\'s interface names | every path in 3.1-3.6; 3.3 RenderPreset, SnapshotHistory, DistanceCulling | 2.1, 2.2 |',
    '| W0-03 | TrueVision\'s per-tab hotkey file names (name only); identity hygiene: SpecPdf\'s console prefix, the PlanDimensions styles banner, SectionClipping__State\'s NAMESPACE and MODULE lines | 3.3 both hotkey files; 3.1 PlanDimensions__Styles, SpecPdf; 3.4 SectionClipping__State (added); 3.6 HotkeyHandler; comment-only: Controls__Pc, Controls__TouchScreen, Measurements, ConfigState; the 3D help panel (no row: 3D tab) | 2.2 |',
    '| W0-04 | The G4 gates (ParityNaming, PortNotes, UiParity), the LoaderStylesheets test, ModuleGraph and Exports 1.1.0 (all in 80__Testing__PrototypeEnvironment, outside this register) | none | 6 (the ModuleGraph fix, WT-12) |',
    '| W0-05 | The port-order map (analysis only) | the Blocked by column (re-run on the end-of-Wave-0 tree) | - |',
    '| W0-06 | This ledger\'s restructure, the folder-number registry, the realign plan, the 41 README; six comment-only module headers | 3.1 R2AssetUpload, History, Toolbar, SceneEditor; 3.6 SceneReorder, SceneRowBuilders | 1-9 |',
    '| W0-07 | `ProjectData__EditorOwnedKeys` in the main config (live); the sync pipeline fix (staged for Adam) | 3.2 Na__AppConfig__Main.json | 8.4 |',
    '| W0-08 | AutoSave publishes `window.Na__Pwa__HasUnsavedWork` (live, unread); the shared service-worker package (staged for Adam) | 3.1 AutoSave | 1.4 |',
    '| W0-09 | WCP server.py: the guarded project save, fingerprint, backups, files routes, JSON 404s, the folder-id guard; the shared library; two tests | none (Whitecardopedia) | 8.3 |',
    '| W0-10 | Worker 1.6.0 (staged for Adam, not deployed) | none (Whitecardopedia) | 8.2 |',
    '| W0-11 | ProjectLoader: TrueVision\'s two identity names, the localhost Flask-copy fallback | 3.1 ProjectLoader | 8.1 |',
    '| W0-12 | The transport facade (two new modules at TrueVision\'s paths); SpecPdf\'s project name; the facade test | 3.5 ApiClient, LocalProjectMirror (landed); 3.1 SpecPdf | 8.1 |',
    '| W0-13 | LoadingSequence: the facade start, the localhost overlay of editor-owned keys, the merge base, sceneConfig, na-app-scene-ready | 3.1 LoadingSequence | 8.1, 8.4 |',
    '| W0-14 | Assets 1.0.1 and Persistence 1.2.1 taken whole; R2AssetUpload\'s contract; the thumbnail call shape | 3.1 Assets, Persistence, R2AssetUpload, Thumbnail__Renderer | - |',
    '| W0-15 | The Layout Editor config foundation: the AppConfig additive pass, ConfigState 1.29.0, KeyMap 1.11.0 with TrueVision\'s key file, SheetSetup 1.9.0, ToolSetup 1.5.0, EditorSetup 1.6.0, Readers\' PORT NOTE; the AppConfig parity test | 3.1 the six ConfigState units; 3.2 LE AppConfig; 3.3 Na__Hotkeys__DrawingTabs__.json | 4 (39 release notes) |',
    '| W0-16 | Vendors 05 jsPDF 4.1.0, 06 html2canvas 1.4.1, 07 PDF.js 3.11.174; Vale\'s Classic scan at TrueVision\'s asset convention; the config and SheetSetup repointed | 3.1 SheetSetup, PdfExporter (jsPDF divergence closed); 3.2 LE AppConfig; 3.6 the ten 35 rows | 1.3 (DIV-5) |',
    '| W0-17 | index.html: TrueVision\'s start-up order for the authoring gate, the drawings-data and section-bindings listeners and the drawing view config | none (index.html) | 4 (v2.24.0, v2.30.2) |',
    '| W0-18 | WCP blueprints for sheet images and user config; the Vale dictionary; .gitignore; two tests | none (Whitecardopedia, app root) | 8.3, 8.5 |',
    '| W0-19 | WCP blueprints for published documents and statements; .gitignore and .gitattributes; two tests | none (Whitecardopedia) | 8.3, 8.5 |',
    '| Gate | FIX-1 the web viewer stylesheet banner; FIX-2 the AppConfig parity test\'s stale allow-list entry | 3.1 Styles__WebViewer | - |',
    '| W0-99 | 56 release placeholders resolved to v2.71.1 in 41 files; the facade test\'s PORT NOTE check accepts the resolved release | none | this pass |',
]

# -----------------------------------------------------------------------------
# Release Watermark: class flips, VV release, packages added, dated notes
# -----------------------------------------------------------------------------
CFG = 'v2.71.1 carried its configuration only (W0-15\'s additive pass: keys, notes and labels, read by nothing yet)'
KEYS = 'v2.71.1 carried its key bindings and configuration only (KeyMap 1.11.0 and TrueVision\'s key file, W0-15; VV\'s keyboard ignores the new actions until their packages land)'
WM = {
    'v2.24.0': {'note': 'v2.71.1 aligned two of its parts: the start-up order of the authoring gate and the drawings-data and section-bindings listeners (W0-17), and ResolveAssetUrl\'s localhost repository fallback (W0-11)'},
    'v2.30.2': {'vv': 'VV v2.71.1 (the start-up order, W0-17)', 'note': 'W0-17 moved Na__DrawCfg__SetAppConfig / Load (and ProjectData and the section scene data) above StartLoadingSequence, as TrueVision; the Drawing2d keys wait for W2-08'},
    'v2.32.1': {'note': 'W0-14 (v2.71.1) also took TV R2AssetUpload 1.0.1\'s non-throwing result contract and MODULE line onto ValeVision\'s body'},
    'v2.39.0': {'vv': 'VV v2.71.1 (part: the local-mirror facade W0-12, the two labels W0-15)', 'note': 'landed in v2.71.1: Na__AppUtils__LocalProjectMirror__ at TrueVision\'s path (its 8 names over WCP server.py, W0-12) and the SavedLocalMessage / SavedLocalFailedMessage labels (W0-15, inert); the toast waits for ProjectData 1.6.0 (W1-05)'},
    'v2.54.0': {'vv_app': 'v2.71.1 (the unlogged Assets 1.0.1 and Persistence 1.2.1, W0-14)', 'note': 'the release commit (ffbaee21) also carried Assets 1.0.1 and Persistence 1.2.1, which its devlog entry does not name; both taken whole in v2.71.1 (W0-14)'},
    'v2.63.0': {'note': 'v2.71.1: SpecPdf prints the project name through the facade accessor Na__CfApi__GetProjectDisplayName in place of TrueVision\'s PWA global (W0-12)'},
    'v2.67.0': {'vv_app': 'v2.71.1 (the unsaved-work flag, W0-08)', 'note': 'W0-08 (v2.71.1): AutoSave publishes window.Na__Pwa__HasUnsavedWork (TrueVision\'s flag under a neutral name; live, read by nothing yet); the registrar 1.1.0 hold-off that reads it is prepared for Adam in the shared service-worker package, not deployed. Stays PARTIAL until he deploys it'},
    'v2.71.0': {'note': 'v2.71.1 carried its configuration only (the DrawingRegister block: DocumentCodeFormat {project}_{drawing}, no job stages; W0-15, inert); the Document ID code waits for W1-12, W1-19 and W1-22'},
    'v2.75.0': {'note': 'registrar 1.2.0\'s no-reload-on-first-install is prepared for Adam in the shared service-worker package (W0-08, not deployed); ItemClipboard 1.3.0 waits for W2-21. Nothing of it is in ValeVision yet'},
    'v2.77.0': {'note': CFG}, 'v2.79.0': {'note': CFG},
    'v2.78.0': {'note': 'v2.71.1 carried its configuration rows only (EditScope AutoMoveOnSelect / AutoMoveKinds, W0-15), read by nothing: the gesture stays held behind W3-03\'s guards until Adam answers DR-40 items 7-10'},
    'v2.81.0': {'note': 'v2.71.1 carried its configuration only (LayoutEditor__TitleBlock__QrCellEnabled = false, DR-12; W0-15)'},
    'v2.94.0': {'note': CFG},
    'v2.95.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.1 (part: the local statement routes and test server W0-19, the facade\'s statement names W0-12, the Statement config with Enabled = false W0-15)', 'pk': ['W0-19', 'W0-12', 'W0-15'], 'note': 'landed in v2.71.1: /api/valevision/statements/{tree,file,image,folder,move,delete} on WCP server.py with a quarantining delete, and the statement test server (W0-19); the facade\'s statement names over worker 1.6.0\'s files routes (W0-12); the Statement config block with LayoutEditor__Statement__Enabled = false (W0-15). The writer itself (W4-04 to W4-16) stays off (DR-10)'},
    'v2.104.0': {'note': CFG}, 'v2.106.0': {'note': CFG},
    'v2.107.0': {'note': KEYS}, 'v2.109.0': {'note': CFG}, 'v2.111.0': {'note': KEYS}, 'v2.112.0': {'note': KEYS},
    'v2.113.0': {'note': KEYS}, 'v2.114.0': {'note': KEYS},
    'v2.115.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.1 (part: the per-tab key file names W0-03, the drawing-tab key content and KeyMap 1.11.0 W0-15)', 'pk': ['W0-15'], 'note': 'landed in v2.71.1: the 3D and drawing-tab key files under TrueVision\'s names (W0-03; the 3D file keeps ValeVision\'s content, K2 F4) and TrueVision\'s drawing-tab key content with KeyMap 1.11.0 (W0-15; its fallback fix for M, space and Ctrl+S is live). Waiting: KeyScope (W1-29), the document-tab file and 31 DocumentKeys (W1-30), Navigation and Controls (W1-36)'},
    'v2.116.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.1 (part: the local sheet-image routes W0-18, the facade\'s sheet-image names W0-12)', 'pk': ['W0-12'], 'note': 'landed in v2.71.1: /api/valevision/sheet-images/{list,upload,reconcile} on WCP server.py (W0-18; live on localhost, nothing calls it yet) and the facade\'s SheetImage names over worker 1.6.0\'s files routes (W0-12; refused until 1.6.0 is deployed); the images cache bucket is prepared in the shared service-worker package (W0-08, not deployed). The client feature (W1-16, W3-02, W3-09, W3-18) waits, and P12 holds until W0-07 is applied and 1.6.0 deployed. Adam\'s own run is recorded in TrueVision; the ValeVision port waits on his sign-off'},
    'v2.117.0': {'note': 'v2.71.1 carried its configuration row only (SelectionBindings CopyDragModifier, W0-15), read by nothing: the gesture stays held (DR-40)'},
    'v2.118.0': {'note': CFG}, 'v2.119.0': {'note': KEYS}, 'v2.122.0': {'note': CFG}, 'v2.123.0': {'note': CFG},
    'v2.127.0': {'note': CFG}, 'v2.130.0': {'note': KEYS}, 'v2.131.0': {'note': KEYS}, 'v2.135.0': {'note': KEYS},
    'v2.136.0': {'note': CFG}, 'v2.138.0': {'note': CFG}, 'v2.139.0': {'note': KEYS}, 'v2.140.0': {'note': KEYS},
    'v2.141.0': {'note': KEYS}, 'v2.142.0': {'note': KEYS}, 'v2.143.0': {'note': KEYS},
    'v2.144.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.1 (part: the user-config spellings API and the Vale dictionary W0-18, atomic JSON writes W0-09)', 'pk': ['W0-09'], 'note': 'landed in v2.71.1: GET and POST /api/valevision/user-config/spellings over 50__ValeVision__UserConfig/ValeVision__UserSpellings__.json, re-seeded with Vale\'s words (DR-20; W0-18), write_text_atomic for every JSON the local server writes (W0-09) and the configuration (W0-15). The spell-check client (W2-34), the row editor and the tooltip wait'},
    'v2.146.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.1 (part: the local server\'s save guard, fingerprint and backups W0-09, the local-mirror facade W0-12)', 'pk': ['W0-09'], 'note': 'landed in v2.71.1 and LIVE on localhost: the guarded POST /api/projects/<folderId> (X-ValeVision-Drawings-Base, 409 on a stale base, nothing written), GET drawings-fingerprint and backups, a backup of every overwritten project file outside the repository (W0-09); Na__AppUtils__LocalProjectMirror__ (W0-12). Waiting: the draft guard (W1-06, W1-07) and ProjectData 1.6.0 (W1-05); R2 judging (worker merge-keys drawingsBase, W0-10, staged) stays off behind its flag (DR-30)'},
    'v2.147.0': {'note': CFG},
    'v2.149.0': {'note': 'v2.71.1 carried its configuration row only (SelectionBindings MoveAnchorModifier, W0-15), read by nothing: the gesture stays held (DR-40)'},
    'v2.151.0': {'note': KEYS},
    'v2.155.0': {'cls': 'PARTIAL', 'vv': 'VV v2.71.1 (part: Phase 0 vendors W0-16, the local publishing routes W0-19, the facade\'s published names W0-12)', 'pk': ['W0-19', 'W0-12'], 'note': 'landed in v2.71.1: jsPDF 4.1.0 and html2canvas 1.4.1 at TrueVision\'s vendor paths and Vale\'s own Classic scan at TrueVision\'s asset convention (Phase 0, W0-16; PDF.js 3.11.174 as ValeVision\'s vendor 07); /api/valevision/published/{file,list,archive,prune} on WCP server.py (W0-19, unused until W4-03 and W4-07); the facade\'s Published names (W0-12, need worker 1.6.0); the published cache bucket is prepared in the shared service-worker package (W0-08, not deployed). Adam\'s confirmation in TrueVision covers the PDF exporter fix, not Phase 0, the archive route\'s revision change or the R2 push'},
    'v2.157.0': {'note': CFG}, 'v2.158.0': {'note': CFG}, 'v2.163.0': {'note': CFG},
}

WM_INTRO = [
    '- **After Wave 0 (ValeVision3D v2.71.1, 01-Oct-2026; W0-99).** No release became PORTED in Wave 0, which laid foundations.',
    '  Six releases are now PARTIAL, each with something real in ValeVision: v2.95.0 (statement routes), v2.115.0 (key files and',
    '  KeyMap 1.11.0), v2.116.0 (sheet-image routes), v2.144.0 (the dictionary and its API), v2.146.0 (the local save guard, live)',
    '  and v2.155.0 (Phase 0 vendors and the publishing routes). The configuration of 39 releases (W0-15) and the start-up order',
    '  of v2.24.0 and v2.30.2 (W0-17) also came across; each row says what. So "nothing from TrueVision v2.86.0 onward is in',
    '  ValeVision" is no longer true for those rows; the high-water of fully ported releases stays v2.85.0, the low-water',
    '  v2.28.0. TrueVision releases Adam has confirmed that Wave 0 touched: v2.7.1 (W0-13; older than this table), and',
    '  v2.116.0 and v2.155.0 in part (their rows say which part).',
]
WM_COUNTS = ['After Wave 0 (v2.71.1): PARTIAL 17 and NOT-CONSIDERED 74 (v2.95.0, v2.115.0, v2.116.0, v2.144.0, v2.146.0 and',
             'v2.155.0 moved); every other class unchanged; open still **112**.']

S13_NOTE = ['**01-Oct-2026 note (W0-99).** DIV-5\'s residual closed in ValeVision3D v2.71.1: jsPDF 4.1.0 and html2canvas 1.4.1',
            'now sit at TrueVision\'s vendor paths 05 and 06, byte-identical to TrueVision\'s, and PDF.js 3.11.174 is ValeVision\'s',
            'vendor 07 (W0-16). The 35 copy of jsPDF stays until 35 retires (W6-03).']

S14_BULLET = [
    '- **Wave 0 (ValeVision3D v2.71.1, 01-Oct-2026; W0-99).** The wave adds two modules (the transport facade:',
    '  `80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` and `03__AppUtils/Na__AppUtils__LocalProjectMirror__.js`,',
    '  neither precached) and new exports on existing modules (ProjectLoader +2; the ConfigState barrel +9, KeyMap +4, SheetSetup',
    '  +3, EditorSetup +2; RenderPreset\'s eight exports renamed from ComposerPreset with its file), and moves 81 files to new URLs',
    '  (the renumber). A warm client holding a mix of old and new files cannot link the editor, and, with the facade now in the',
    '  start-up graph (W0-13), cannot start, for that one load. Bump needed: yes, once at deploy for the whole wave - deploy Wave 0',
    '  only with the prepared W0-08 package applied plus one shell-token bump, or with a full bump (audit Section F.5.6 item 4).',
    '  The live precache still names the pre-renumber DistanceCulling path (harmless; corrected in W0-08\'s staged copy). Service',
    '  worker token: shared Whitecardopedia worker - Adam\'s call; it was not bumped (`\'2026-09-18-1\'`).',
]

S22_NOTE = [
    '**Released 01-Oct-2026 as ValeVision3D v2.71.1 (W0-99).** The renumber ships in the Wave 0 release together with the two',
    'hotkey renames, whose drawing-tab file now carries TrueVision\'s key content (W0-15). At the wave gate none of the seven old',
    'folder names existed on disk, not even empty, and no code named one; the only stale path left anywhere is the shared',
    'service worker\'s DistanceCulling precache line, corrected in the prepared W0-08 package (section 1.4). The moves are not',
    'committed: `git mv` staged the 81 renames; W0-03\'s two renames are plain moves, to be staged as pairs.',
]

S3_NOTE = [
    '**Filled 01-Oct-2026 by W0-99 (ValeVision3D v2.71.1).** "Blocked by" comes from W0-05\'s port-order analysis re-run on the',
    'end-of-Wave-0 working tree (`ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/scratch/W0-99/pom/port_order_map__endW0.json`;',
    'W0-05\'s script, pointed at the working tree instead of the git index). `none` = the TrueVision module is in the map and',
    'nothing it imports is missing in ValeVision; a list = the modules still missing, or the names a present module still lacks,',
    'each with the package that lands it; `-` = no TrueVision module at this path is in the map (ValeVision-only, a configuration',
    'file, or not reached by any whole-file take). Wave 0 cleared the blockers of 29 TrueVision modules (TrueVision\'s two',
    'ProjectLoader names, W0-11, and the ConfigState units, W0-15); 216 still wait on at least one. Rows Wave 0 changed carry their',
    'new state with the old kept as "[was: ...]"; 3.4 gains one row (SectionClipping__State, W0-03), so 3.4 holds 6 rows and the',
    'register 610; section 3.7 lists the changes by package.',
]

S51_NOTE = [
    '- **01-Oct-2026 note (W0-99).** Wave 0 (ValeVision3D v2.71.1) ran on every default: no answer to DR-01..DR-44 or the seven',
    '  questions arrived during the wave. DR-40 items 7-10 stay held (W3-03 writes the guards; W3-04 waits).',
]

S6_OFFERS = [
    '',
    '**Offers raised by Wave 0 (01-Oct-2026, ValeVision3D v2.71.1; W0-99).** None happens on DR-42\'s default and TrueVision is',
    'not edited (DR-36 (a)); each is recorded so the TrueVision lane can take it with Adam\'s approval.',
    '',
    '| Item | ValeVision source | Status in TrueVision (01-Oct-2026) | Evidence | Next |',
    '|---|---|---|---|---|',
    '| String literals blanked before the import scan, so prose is never read as a specifier | `80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs` 1.1.0 (W0-04) | OPEN - TrueVision\'s 1.0.0 still stops on its scene-editor string | W0-04 Port Record; WP-S09-14 | WT-12 (held) |',
    '| The unsaved-work flag under an app-neutral name, so AutoSave needs no seam | `LE/07__Core__SheetData/Na__LayoutEditor__AutoSave__.js` 1.3.1, `window.Na__Pwa__HasUnsavedWork` (W0-08) | OPEN - TrueVision publishes `window.TrueVision__Pwa__HasUnsavedWork` | W0-08 Port Record | WT-11 item 10 (held) |',
    '| The local server: folder containment of every project id, a lock round the guarded write, the in-place fallback only when the move is refused | `WCP/Server__ValeVisionShared__Lib__.py`, `WCP/server.py` (W0-09) | OPEN - TrueVision\'s local server joins `..` unchecked | W0-09 Port Record | no package yet (DR-42) |',
    '| R2 judging of the drawings base on merge-keys, and server-side path families with the key on every route | worker 1.6.0, staged (W0-10) | OPEN - TrueVision\'s worker has neither (its v2.146.0 log lists R2 judging as not done) | W0-10 Port Record | no package yet (DR-42) |',
    '| A display-name accessor in place of the PWA project-context global | `Na__CfApi__GetProjectDisplayName` (W0-12) | OPEN - TrueVision\'s SpecPdf, SpecDocument, Register Pdf and parametric title read the global | W0-12 Port Record | no package yet (DR-42) |',
    '| A bounded overlay wait, a projectCode guard, and the full editor-owned list in the overlay | `01__AppCore/Na__AppFlow__LoadingSequence.js` 1.7.1 (W0-13) | OPEN - TrueVision\'s overlay read has no time limit and its list lacks `CrossSection__SceneData` and `LayoutEditor__DrawingRegister` | W0-13 Port Record; S09 B8 | WT-12 adds CrossSection__SceneData (held); the rest no package yet |',
    '| An unreadable R2 copy is never treated as absent by the model sync | `WCP/Tools__DevUtils/AutomationUtil__R2Common__Lib__.py`, staged (W0-07) | OPEN - TrueVision\'s `fetch_r2_json` returns None on every read error | W0-07 Port Record | no package yet (DR-42) |',
    '| PDF.js at the shared vendor layout instead of PlanVision\'s path | `04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174/` (W0-16) | OPEN - TrueVision\'s register loads PlanVision\'s copy | W0-16 Port Record | no package yet (DR-42) |',
    '| The dictionary\'s key prefix and the sheet-image root read from config | `WCP/Server__ValeVisionUserConfig__Api__.py`, `...SheetImages__Api__.py` (W0-18) | OPEN - both hard-coded in TrueVision | W0-18 Port Record | WT-11 item 3 for the prefix (held) |',
    '| Published and statement routes: the archive folder refused as a document id, archive names never reused within a second, a path refused when its folder or the file itself resolves outside (TrueVision refuses only when both do), dot-only segments refused, a quarantining delete, no picture past __99 | `WCP/Server__ValeVisionPublished__Api__.py`, `...Statements__Api__.py` (W0-19) | OPEN - TrueVision\'s routes lack each | W0-19 Port Record | no package yet (DR-42) |',
]

S8_BODY = r'''
**Written 01-Oct-2026 by the Wave 0 Parity Scribe (W0-99) for ValeVision3D v2.71.1**, from the Port Records of W0-07, W0-09,
W0-10, W0-11, W0-12, W0-13, W0-14, W0-18 and W0-19 and the files as they now stand. "Live" means in the working tree and served
by Adam's local server; "staged" means prepared under `ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/prepared/`
for Adam to apply. Nothing was deployed.

### 8.1 The facade at TrueVision's paths (DIV-4; DR-27 (A); W0-12)

TrueVision's modules import their storage from two files. ValeVision has both since v2.71.1, at TrueVision's paths and with
TrueVision's names, parameters and result shapes, over ValeVision's own transport. Neither ever throws: a failure resolves
`{ ok: false, error }`.

| Family | Names | ValeVision body | Worker needed |
|---|---|---|---|
| Start-up and identity | `Na__CfApi__Initialize`, `IsConfigured`, `GetProjectContext`, `SetLoadedProjectData`, `GetLoadedProjectData`, `BuildContentCdnUrl`; ValeVision-only `Na__CfApi__GetProjectDisplayName` | Initialize (async) awaits the master index, then on localhost reads `/api/editor-config` and the worker's `/health` once. The folder is the master-index entry `?project=` names (`Na__AppUtils__GetYearFromUrl` + `GetProjectFolderFromUrl`, W0-11), never project.json's folderId; with no entry there is no folder and every write is refused. IsConfigured is true only on localhost with the worker config and a folder. The CDN base is `ProjectData__AssetUrls__R2BaseUrl`; the display name is projectNameAlias, else displayName, else projectName | any |
| Project data | `ReadProjectData`, `WriteProjectData`, `MergeAndSaveKeys`, `DeleteProjectKeys` | One queue. Pipeline-owned keys refused on every path. A merge uses `merge-keys` when the worker lists it, else a whole-document save over a fresh `GET /api/projects/<folderId>` from the local server (the loaded copy if that cannot be read). Reads use the worker's `project` route when listed, else the CDN copy (no-store). `drawingsBase` is sent only when a caller passes it (R2 judging is off, DR-30) | `project`, `merge-keys`: 1.6.0 |
| Assets | `WriteThumbnailWebp`, `WriteProjectAsset` | `files/upload` or `files/write` when listed (no build-manifest bump), else `/assets` (base64; bumps the build manifest) | 1.5.0 or 1.6.0 |
| Sibling files | `ProjectFileLocation`, `ReadProjectFile`, `WriteProjectFile` | `ValeVision__DrawingNotes__.json` and `ValeVision__StatementDocs__.json` beside project.json; `files/*` when listed, else `drawing-notes` or the CDN | any |
| Statements | `StatementFileLocation`, `ReadStatementFile`, `WriteStatementFile` | `<folderId>/10__StatementDocs/...`; `files/*` only, refused (saying so) on an older worker | 1.6.0 |
| Sheet pictures | `SHEET_IMAGES_DIR` (`05__Layout__DrawingDocs__Images`), `SHEET_IMAGES_ARCHIVE`, `SheetImageLocation`, `SheetImagesPrefix`, `ListSheetImages`, `UploadSheetImage`, `CopySheetImage`, `DeleteSheetImage` | managed names (`<slug>__<10 hex of SHA-256>`); `files/*` only | 1.6.0 |
| Published documents | `PublishedLocation`, `PublishedPrefix`, `ListPublished`, `UploadPublished`, `DeletePublished` | `<folderId>/06__Layout__PublishedDocuments/...`; hashed files immutable; `files/*` only | 1.6.0 |
| Other apps' files | `AdminFileLocation`, `PlansFileLocation` | answer null: ValeVision has no admin or PlanVision files | - |
| Local mirror (`03__AppUtils/Na__AppUtils__LocalProjectMirror__.js`) | `Na__LocalMirror__MergeKeys`, `DrawingsFingerprint`, `WriteSiblingFile`, `StatementTree`, `WriteStatementFile`, `MakeStatementFolder`, `MoveStatement`, `DeleteStatement` | WCP `server.py`: `POST /api/projects/<folderId>` with `X-ValeVision-Drawings-Base` (409 on a stale base), `GET .../drawings-fingerprint`, `POST .../files/<name>`, `/api/valevision/statements/*`. Localhost only; on the web every call reports skipped | local server |

Callers today: `Na__AppFlow__LoadingSequence.js` (start-up, the localhost overlay, the merge base; W0-13) and
`Na__LayoutEditor__SpecPdf__.js` (the display name; W0-12). The TrueVision modules that import the facade arrive with their
packages: 32 imports in 27 modules (W0-05's map, `transport_seams`). Test: `Na__Test__TransportFacade__.test.mjs` (175 checks,
the real server.py among them).

### 8.2 The editor worker (`whitecardopedia-editor-api`, `WebApps/Whitecardopedia/CloudflareWorker`)

- **Deployed: 1.5.0.** `GET https://whitecardopedia-editor-api.adam-fb3.workers.dev/api/editor/health` answered
  `{"ok":true,"worker":"whitecardopedia-editor-api"}` on 01-Oct-2026 (W0-99): no version and no route list, the 1.5.0 shape. The
  facade reads that as `save`, `assets` and `drawing-notes` only.
- **1.6.0: staged, not deployed** (W0-10; `execution/prepared/W0-10/` and `execution/prepared/W0-10.patch`, which applies
  cleanly to the live files). Proven by node tests (ProjectFiles 263/263, MergeKeys 95/95; re-run by the gate and by W0-99) and
  an esbuild bundle built with wrangler's options; the `wrangler dev` proof and the deploy are Adam's. After the deploy,
  `/api/editor/health` must answer `version: '1.6.0'` and `routes: ['save', 'assets', 'drawing-notes', 'project', 'merge-keys',
  'files']`; roll back with `npx wrangler rollback`.

| Route | Method | 1.5.0 (deployed) | 1.6.0 (staged) |
|---|---|---|---|
| `/api/editor/health` | GET | `{ ok, worker }` | adds `version` and `routes` |
| `/api/editor/projects/<folderId>` (save) | POST | yes | yes, only when the whole rest is `YYYY/Folder` |
| `.../assets` | POST | yes | yes |
| `.../drawing-notes` | GET, POST | yes | yes |
| `.../visibility`, `.../rename`, `.../delete` | POST | yes | yes, with every folderId checked |
| `.../project` | GET | - | new: the stored bytes, no-store; 404 `{missing:true}` |
| `.../merge-keys` | POST | - | new: `{ set, remove, drawingsBase?, bumpBuild? }`; editor-owned keys only; 409 `{missing:true}` or `{conflict:true}`; written on the etag read, 503 `{retry:true}`; bumps the build manifest only with `bumpBuild: true` |
| `.../files/read`, `/files/write`, `/files/upload`, `/files/list`, `/files/copy`, `/files/delete` | POST | - | new: six families (F-SIB sibling files, F-THUMB thumbnails, F-ASSET LayoutEditor assets, F-IMG sheet pictures, F-PUB published documents, F-STMT statements); type and cache decided by the server; 25 MB read whole, 95 MB streamed; never the build manifest |
| any other path | - | may fall into the save route | a JSON 404, with or without the key |

- **A live hazard 1.6.0 closes** (W0-10): in the deployed 1.5.0 a keyed `POST /api/editor/projects/2026/delete` takes folderId
  "2026" and deletes every 2026 project on R2, and `.../2026/rename` moves them all. Only Adam's localhost tools hold the key;
  nothing should send a year-only folderId until 1.6.0 is live.
- 1.6.0 bundles `Na__AppConfig__Main.json` for its merge-keys list: a key added to `ProjectData__EditorOwnedKeys` reaches the
  worker only at its next deploy (until then merge-keys refuses it and the facade falls back to a whole-document save).

### 8.3 The local server (`WebApps/Whitecardopedia/server.py` and its blueprints; live, debug reloader)

| File | Routes | Package |
|---|---|---|
| `server.py` | `GET /api/health` (`{status, service 'whitecardopedia-local-dev', app 'ValeVision3D', port 8000}`); `POST /api/projects/<folderId>` guarded by `X-ValeVision-Drawings-Base` (409, nothing written), with a backup and an atomic write in the file's existing format; `GET .../drawings-fingerprint`; `GET .../backups`; GET and POST `.../files/<name>` (allow-list: `ValeVision__DrawingNotes__.json`, `ValeVision__StatementDocs__.json`), with `.../drawing-notes` kept as its alias; GET and POST `/api/<path>` answer a JSON 404; a before-request guard refuses (400) any folder id that would leave `Projects/` | W0-09 |
| `Server__ValeVisionShared__Lib__.py` (new) | no routes: the shared library every blueprint uses (project context, folder containment, atomic writes, backups, JSON 404s); backup root `%LOCALAPPDATA%\ValeGardenHouses\ValeVision\ProjectDataBackups` (or `VALEVISION_PROJECT_BACKUP_ROOT`), the last 30 of each file, refused inside the repository (Q-BACKUP default; Adam to confirm) | W0-09 |
| `Server__ValeVisionSheetImages__Api__.py` (new) | `GET /api/valevision/sheet-images/list`, POST and PUT `.../upload`, `POST .../reconcile`, over `Projects/<yyyy>/<folder>/05__Layout__DrawingDocs__Images/` (00__Archive local only; nothing deleted) | W0-18 |
| `Server__ValeVisionUserConfig__Api__.py` (new) | GET and POST `/api/valevision/user-config/spellings`, over `ValeVision3D/50__ValeVision__UserConfig/ValeVision__UserSpellings__.json` | W0-18 |
| `Server__ValeVisionPublished__Api__.py` (new) | `GET /api/valevision/published/list`, GET, POST and PUT `.../file`, `POST .../archive`, `POST .../prune`, over `Projects/<yyyy>/<folder>/06__Layout__PublishedDocuments/` (00__Archive__Revisions local only) | W0-19 |
| `Server__ValeVisionStatements__Api__.py` (new) | `GET /api/valevision/statements/tree`, GET and POST `.../file`, `POST .../image`, `.../folder`, `.../move`, `.../delete` (a delete moves into `10__StatementDocs/00__Deleted__Quarantine/<moment>/`), over `Projects/<yyyy>/<folder>/10__StatementDocs/` | W0-19 |
| `Server__ValeVisionScrapbook__Api__.py` | `/api/valevision/scrapbook...` (before this programme) | - |

Unchanged apart from the folder-id guard: `/api/check-localhost`, `/api/editor-config`, `/api/refresh-status`, `/api/projects`,
`GET /api/projects/<folderId>`, visibility, rename, delete, presentation-thumbnail, assets, discover and the static routes.
Every new route answered on the running server at the wave gate without a restart (the debug reloader took each save), and
`/api/check-localhost` and `/api/health` answered again for W0-99. Tests: ProjectDataSaveGuard (60), DrawingNotesRoute (43),
SheetImagesApi (42), UserSpellingsApi (62), PublishedApi (54), StatementServer `--check` (63), all through Flask's test client
on temporary folders.

### 8.4 Editor-owned keys: one list (W0-07)

`02__Src__AppModules/02__AppData/Na__AppConfig__Main.json`, block `ProjectData__EditorOwnedKeys`, key
`ProjectData__EditorOwnedKeys__Keys` (13): `PresentationMode__SavedCameraScenes`, `LayoutEditor__DrawingsData`,
`LayoutEditor__DrawingRegister`, `CrossSection__SceneData`, `CrossSection__Config`, `Navmode__EnabledModes`,
`Navmode__OrbitMaxDistanceMm`, `Camera__DefaultPosition`, `OrbitHelperCube__Position`, `FogPlane__Config`, `RenderEngine__Config`,
`VideoStudio__Config`, `GridLine__Grid__Offset__Config`.

| Reader | State |
|---|---|
| The localhost load overlay (`Na__AppFlow__LoadingSequence.js`, W0-13) | live: on localhost each listed key R2 holds replaces the local value before any project dispatch; bounded by the fetch timeout, never fatal, logged; skipped when the copies name different projects |
| The Whitecardopedia sync and the R2 audit tool (`WebApps/Whitecardopedia/Tools__DevUtils`, W0-07) | staged: the sync keeps R2's copy of each listed key and its purges list top-level keys only. Until Adam applies it, a Cloud Sync of a project deletes its Layout Editor snapshots and Views-bar thumbnails on R2 (20 objects for 2026/3047__Doous) |
| The worker's merge-keys guard (W0-10) | staged with worker 1.6.0 |
| The facade (W0-12) | live: refuses the pipeline-owned keys on every path |

Pipeline-owned keys (never on the list; the facade, the worker and the sync tools all refuse them): `projectCode`,
`projectName`, `folderId`, `basePath`, `images`, `allImages`, `displayImages`, `thumbnailImage`, `valeVision_ModelUrls`,
`valeVision_ModelUrl`, `ValeVison3D__SketchUpCameraData`, and setting the legacy `valeVision_Camera__DefaultPosition`.

### 8.5 Storage and the repository (DR-29 (A))

New content takes TrueVision's relative folder names inside ValeVision's own prefix, with no app-content level between: on R2
`VaApps/Projects/<folderId>/` and locally `WebApps/Whitecardopedia/Projects/<yyyy>/<folder>/` hold
`05__Layout__DrawingDocs__Images/`, `06__Layout__PublishedDocuments/` and `10__StatementDocs/` beside `project.json`,
`ValeVision__DrawingNotes__.json`, `ValeVision__StatementDocs__.json`, `LayoutEditor/` and `PresentationMode/Thumbnails/`.
What git keeps (`.gitignore` and `.gitattributes` at the repository root, W0-18 and W0-19; DR-29's default, JSON only): every
file under an images folder is ignored; published rasters, PDFs, vectors and the revision archive are ignored, published JSON
is kept; statements keep `.md`, `.html` and `.json` (checked out with LF line endings) and their quarantine is ignored. Until
W0-07 is applied and worker 1.6.0 deployed, no package writes new content into those R2 subfolders (swarm rule P12).
'''


def build(text_lines):
    lines = list(text_lines)
    reg = L.register_rows(lines)
    mods = BB.load_map()

    # ---- Module Register flips -------------------------------------------------
    flipped = []
    seen = set()
    for r in reg:
        vv, tv = L.row_paths(r)
        key = vv or tv
        cells = list(r['cells'])
        spec = None
        if key in FLIPS:
            spec = FLIPS[key]
            seen.add(key)
        elif r['sub'] == '3.6' and key and key.startswith('35__System__PageLayoutSystem/'):
            spec = {4: PAGELAYOUT_35}
        if spec:
            for col, fn in spec.items():
                cells[col] = fn(cells[col])
            flipped.append(key)
        r['cells'] = cells
    missing = set(FLIPS) - seen
    if missing:
        raise SystemExit('flip keys not found in the register: %s' % sorted(missing))

    # ---- Blocked by (after flips: 3.5 rows that landed now read their own path) ----
    bb = BB.compute(reg, mods)
    for r in reg:
        if r['cells'][11].strip():
            raise SystemExit('Blocked by already filled at line %d' % (r['i'] + 1))
        r['cells'][11] = bb[r['i']]
        lines[r['i']] = L.join_row(r['cells'])

    # ---- 3.4 new row --------------------------------------------------------------
    last34 = max(r['i'] for r in reg if r['sub'] == '3.4')
    key34 = L.SRC + '05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js'
    new34 = NEW_34_ROW % (BB.cell_for(mods[key34]) if key34 in mods else '-')
    lines.insert(last34 + 1, new34)

    # ---- 3.7 after the 3.6 table (insert before the '---' that closes section 3) ----
    i4 = lines.index('## 4. Release Watermark')
    j = i4 - 1
    while lines[j] != '---':
        j -= 1
    assert lines[j - 1] == '' and lines[j - 2].startswith('| ')
    lines[j - 1:j - 1] = [''] + SECTION_37
    # ---- 3 dated note after the "Blocked by" column bullet --------------------------
    k = [n for n, ln in enumerate(lines) if ln.startswith('- **Blocked by** - left empty for the W0 Parity Scribe')]
    assert len(k) == 1
    k = k[0]
    assert lines[k + 1].startswith('  whole-file take still waits for.') and lines[k + 2] == ''
    lines[k + 2:k + 2] = [''] + S3_NOTE

    # ---- Release Watermark ----------------------------------------------------------
    i4 = lines.index('## 4. Release Watermark')
    i5 = lines.index('## 5. Decisions')
    done = set()
    for n in range(i4, i5):
        ln = lines[n]
        if not ln.startswith('| v2.'):
            continue
        c = L.split_row(ln)
        ver = c[0].split()[0]
        if ver not in WM:
            continue
        spec = WM[ver]
        if 'cls' in spec:
            assert c[4] == '**NOT-CONSIDERED**', (ver, c[4])
            c[4] = '**%s**' % spec['cls']
        if 'vv' in spec:
            assert c[5] == '-', (ver, c[5])
            c[5] = spec['vv']
        if 'vv_app' in spec:
            c[5] = app(c[5], spec['vv_app'])
        if 'pk' in spec:
            have = [p.strip() for p in c[6].split(',') if p.strip() and p.strip() != '-']
            c[6] = ', '.join(have + [p for p in spec['pk'] if p not in have])
        c[10] = note(spec['note']) if c[10].strip() in ('', '-') else c[10].rstrip() + ' ' + note(spec['note'])
        lines[n] = L.join_row(c)
        done.add(ver)
    if set(WM) - done:
        raise SystemExit('watermark versions not found: %s' % sorted(set(WM) - done))
    # intro bullet after the "Adam confirmed in TrueVision" bullet
    k = [n for n, ln in enumerate(lines) if ln.startswith('- **Adam confirmed in TrueVision**, among the open releases')]
    assert len(k) == 1
    k = k[0]
    assert lines[k + 2].startswith('  DR-01\'s default (c) and named as unconfirmed') and lines[k + 3] == ''
    lines[k + 3:k + 3] = WM_INTRO
    k = [n for n, ln in enumerate(lines) if ln.startswith('| **Open** | PARTIAL + PENDING-SIGNOFF')]
    assert len(k) == 1 and lines[k[0] + 1] == ''
    lines[k[0] + 1:k[0] + 1] = [''] + WM_COUNTS

    # ---- 1.3, 1.4, 2.2 -----------------------------------------------------------
    k = lines.index('to TrueVision.')
    assert lines[k - 1].startswith('Every other difference between the apps is either a named seam') and lines[k + 1] == ''
    lines[k + 1:k + 1] = [''] + S13_NOTE
    k = [n for n, ln in enumerate(lines) if ln.startswith('- **In this ledger** a row about the token reads')]
    assert len(k) == 1 and lines[k[0] + 1].startswith('  row claims ValeVision runs without one') and lines[k[0] + 2] == ''
    lines[k[0] + 2:k[0] + 2] = S14_BULLET
    k = [n for n, ln in enumerate(lines) if ln.startswith('Not moved: `41__System__CrossSectionView` (DIV-2, name kept)')]
    assert len(k) == 1 and lines[k[0] + 1].startswith('W6-03), `62__Feature__EmailWorkers`') and lines[k[0] + 2] == ''
    lines[k[0] + 2:k[0] + 2] = [''] + S22_NOTE

    # ---- 5.1 ------------------------------------------------------------------
    k = lines.index('### 5.2 D01 to D40, as they stand on 01-Oct-2026')
    assert lines[k - 1] == '' and lines[k - 2].startswith('  S01 set is recorded with its answers')
    lines[k - 1:k - 1] = S51_NOTE

    # ---- 6 offers after the back-port table -------------------------------------------
    k = lines.index('## 7. TrueVision-side records waiting for the TrueVision lane')
    j = k - 1
    while lines[j] != '---':
        j -= 1
    assert lines[j - 1] == '' and lines[j - 2].startswith('| Toast offset 96 px')
    lines[j - 1:j - 1] = S6_OFFERS

    # ---- 8 after W0-06's stub ----------------------------------------------------
    k = lines.index('## 8. Transport (DIV-4)')
    j = lines.index('## 9. Archive - the ledger as it stood before 01-Oct-2026')
    stub_end = j - 1
    while lines[stub_end] != '---':
        stub_end -= 1
    assert lines[stub_end - 1] == '' and lines[stub_end - 2].startswith('`WebApps/Whitecardopedia/server.py`; keys only under')
    lines[stub_end - 1:stub_end - 1] = [''] + S8_BODY.strip('\n').split('\n')
    return lines, flipped


def checks(old_lines, new_lines):
    old_t = '\r\n'.join(old_lines)
    new_t = '\r\n'.join(new_lines)
    # ASCII and CRLF
    new_t.encode('ascii')
    for ln in new_lines:
        assert '\r' not in ln and '\n' not in ln
    # the Archive byte-identical
    a_old = old_t[old_t.index('## 9. Archive'):]
    a_new = new_t[new_t.index('## 9. Archive'):]
    assert a_old == a_new, 'Archive changed'
    # everything before section 1 unchanged
    assert old_t[:old_t.index('## 1. Header')] == new_t[:new_t.index('## 1. Header')]
    # every table row in sections 1-8 has its header's column count
    cur = None
    bad = []
    stop = new_lines.index('## 9. Archive - the ledger as it stood before 01-Oct-2026')
    for n, ln in enumerate(new_lines[:stop]):
        if ln.startswith('| ') and n + 1 < len(new_lines) and new_lines[n + 1].startswith('|---'):
            cur = len(L.split_row(ln))
            continue
        if ln.startswith('|---'):
            continue
        if ln.startswith('| '):
            if cur is None or len(L.split_row(ln)) != cur:
                bad.append((n + 1, len(L.split_row(ln)), cur))
        elif not ln.startswith('|'):
            cur = cur if ln.startswith('|') else None
    assert not bad, 'table rows with the wrong column count: %r' % bad[:5]
    # no bare pipe inside any cell of sections 1-8 (GFM splits a cell on every unescaped pipe)
    cur = None
    bad = []
    for n, ln in enumerate(new_lines[:stop]):
        if ln.startswith('| ') and n + 1 < len(new_lines) and new_lines[n + 1].startswith('|---'):
            cur = ln.count('|')
            continue
        if ln.startswith('| ') and ln.count('|') != cur:
            bad.append((n + 1, ln.count('|'), cur))
    assert not bad, 'table rows with a bare pipe in a cell: %r' % bad[:5]
    # 610 register rows of 12, every Blocked by cell filled
    reg = L.register_rows(new_lines)
    assert len(reg) == 610, len(reg)
    assert all(r['cells'][11] for r in reg), 'an empty Blocked by cell'
    # every old line outside the rewritten table rows survives, in order (only insertions and planned rewrites)
    old_stop = old_lines.index('## 9. Archive - the ledger as it stood before 01-Oct-2026')
    in_tables = lambda ln: ln.startswith('| ') and not ln.startswith('|---')
    keep = [ln for ln in old_lines[:old_stop] if not in_tables(ln)]
    it = iter(new_lines[:stop])
    lost = [ln for ln in keep if not any(ln == x for x in it)]
    assert not lost, 'old lines lost or reordered: %r' % lost[:3]
    # every old table row either survives unchanged or is one of the planned rewrites (register rows, watermark rows)
    new_set = set(new_lines[:stop])
    changed = [ln for ln in old_lines[:old_stop] if in_tables(ln) and ln not in new_set]
    reg_old = {L.join_row(r['cells']) for r in L.register_rows(old_lines)}
    wm_old = {ln for ln in changed if ln.startswith('| v2.') and ln.split(' | ')[0][2:].split()[0] in WM}
    unplanned = [ln for ln in changed if ln not in reg_old and ln not in wm_old]
    assert not unplanned, 'table rows changed outside the plan: %r' % [u[:90] for u in unplanned[:3]]
    print('checks: ASCII, CRLF, Archive identical, preamble identical, column counts, no bare pipes, 610 register rows, '
          '%d old table rows rewritten (%d register, %d watermark), every other old line kept in order' % (
              len(changed), len([c for c in changed if c in reg_old]), len(wm_old)))
    return True


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--build'
    if mode == '--restore':
        cur = open(L.LEDGER, 'rb').read()
        cand = open(CAND, 'rb').read()
        if sha1(cur) != sha1(cand):
            raise SystemExit('REFUSED: the ledger is not this pass\'s output (%s)' % sha1(cur)[:8])
        open(L.LEDGER, 'wb').write(open(PRE, 'rb').read())
        print('restored the ledger to', sha1(open(PRE, 'rb').read())[:8])
        return
    cur = open(L.LEDGER, 'rb').read()
    if sha1(cur) != EXPECT:
        raise SystemExit('REFUSED: the ledger is at %s, expected W0-06\'s %s' % (sha1(cur)[:8], EXPECT[:8]))
    old_lines = L.read_lines()
    new_lines, flipped = build(old_lines)
    checks(old_lines, new_lines)
    out = '\r\n'.join(new_lines).encode('ascii')
    open(CAND, 'wb').write(out)
    print('candidate: %d -> %d lines, %d -> %d bytes, sha1 %s; %d register rows flipped' % (
        len(old_lines), len(new_lines), len(cur), len(out), sha1(out)[:8], len(flipped)))
    if mode == '--apply':
        os.makedirs(os.path.dirname(PRE), exist_ok=True)
        open(PRE, 'wb').write(cur)
        tmp = L.LEDGER + '.w0-99.tmp'
        open(tmp, 'wb').write(out)
        if sha1(open(L.LEDGER, 'rb').read()) != EXPECT:
            os.remove(tmp)
            raise SystemExit('STOPPED: the ledger changed while the candidate was built')
        os.replace(tmp, L.LEDGER)
        print('written; live sha1', sha1(open(L.LEDGER, 'rb').read())[:8])


if __name__ == '__main__':
    main()
