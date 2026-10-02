# S03a - Layout Editor core: config, mode controller, tab strip, loading veil, loader, dev menu

Parity slice report, TrueVision 3D (TV, lead) -> ValeVision 3D (VV, target). Written 01-Oct-2026 from the
working trees at TV HEAD b2aa9151 (devlog top v2.172.0) and VV HEAD 7b4e593a (devlog top v2.71.0). Read-only
analysis: nothing in either app was changed.

Path shorthand: `TV/` = `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode`,
`VV/` = `D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D`, `LE/` = `02__Src__AppModules/51__System__LayoutEditor/`.
Line numbers are the current files' (CRLF files, read with LF counting).

Working files produced for this slice (machine-readable, reuse them):
- `scratchpad/parity/work_s03a/appcfg_deep.tsv` - every key-level difference of the two `Na__LayoutEditor__AppConfig__.json` (356 rows: path, state, TV value, VV value).
- `scratchpad/parity/work_s03a/appcfg_classified.tsv` - the same rows classified (label / tv-feature / doc / brand / value-drift / vv-only).
- `scratchpad/parity/work_s03a/diff_sheetsetup.txt`, `diff_editorsetup.txt` - whitespace-blind diffs of the two largest config units.

---

## (a) Scope

| Area | TV files | VV files | Notes |
|---|---|---|---|
| `LE/01__Core__Loader` | 0 | 3 (Loader 758 l. v1.1.0, LoadingScreen 240 l. v1.0.0, Styles__Boot 273 l.) | VV only |
| `LE/03__Core__Config` | 8 (AppConfig 1332 l., ConfigState 1.29.0 + 5 units, `Na__Hotkeys__DrawingTabs__.json` 1267 l.) | 8 (AppConfig 891 l., ConfigState 1.17.0 + 5 units, `Na__LayoutEditor__KeyMappings__.json` 856 l.) | 6 shared paths + 1 renamed pair |
| `LE/05__Core__ModeController` | 3 (ModeController 1.32.0, TabStrip 2.0.0, LoadingVeil 1.1.0) | 3 (1.18.0, 1.5.0, 1.0.0) | all drifted |
| `LE/70__DevTools__DevMenu` | 1 (1.3.0) | 1 (1.4.0) | VV numbered ahead |
| Keyboards outside LE | `03__AppUtils/Na__AppUtils__KeyScope__.js` 1.1.0, `10__NavigationAndCameras/Na__Hotkeys__Manager.js` 2.1.0, `02__AppData/Na__Hotkeys__3dModelTab__.json`, `LE/31__System__DocumentKeys/` (2 files) | `03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js` 1.0.0, `02__AppData/Na__ValeVision__HotkeysDictionary__.json` | KeyScope and DocumentKeys TV only |
| Shell wiring | `TV/Index.html` 1717-1738, CSS index 161-174/182/190, `LE/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css` (tab strip region), `03__Style__AppStylesheets/Na__UiFeature__Styles__AppHeader__.css`, `...LoadingOverlays__.css` | `VV/index.html` 1792-1809, 2269-2283, CSS index 91-92, `Styles__Boot__.css`, the two app stylesheets | |
| Docs read | `TrueVision__PLAN__DrawingMenus__.md`, `TrueVision__NOTES__LayoutEditorPerformance__.md`, `TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md` 2.2/3/4.1/10, TV devlog v2.83, v2.110, v2.155, v2.158 | `ValeVision__PARITY__TrueVisionLedger__.md` (1-60, 224-342, 1080-1247), `ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md` D-table, VV devlog v2.45.0 | |
| Tests | 4 relevant TV tests (DrawingTabKeys, DocumentKeys, SheetPagingWalkExit, AuthoringZoomMax) | none relevant | |

In-scope LE line counts: TV 7,980 lines in 12 files; VV 7,038 lines in 15 files. Every TV module that the TV
mode controller, tab strip, veil and Dev menu import was checked for presence and named exports in VV (Python
import/export walk; results in section (d)).

---

## (b) Narrative findings by sub-system

### b.1 Headline

The VV drawing editor's shell is about 14 mode-controller versions (TV 1.19-1.32) and one tab-strip major
version behind TrueVision, and its config is 356 key-level differences behind. Nearly all of the gap is
WIRING to TV-only subsystems (DraftMode, DrawingGrid, ObjectSnap, OrthoMode, DrawingAxes, DocumentKeys,
HatchPatternTools, VectorTools, DrawingRegister, StatementWriter, SheetImages, ScrapbookSpecification,
FloorAreas, DocumentPublishing, DocumentSharing, ModelSource, site plans) plus four cross-cutting behaviours
that have nothing to do with those features and should land first:

1. **Three keyboards, one live** (TV v2.110.0, v2.115.0): VV's 3D hotkeys still answer under the drawing tabs
   (no key scope), and VV's drawing-tab key map fallback still has the defect TV fixed in KeyMap 1.5.0 (no M,
   no Ctrl+S, space bar deselects).
2. **Page Up / Page Down turning and the sheet-keyboard restart** (TV ModeController 1.23.0 / 1.25.0, v2.112.0 /
   v2.115.0). **[Verifier correction]** The survey listed "leaving Walk / Fly when a drawing opens" here. That is
   ALREADY TRUE in VV: VV's `SuspendThreeD()` takes no options but always runs the whole Walk/Fly exit through
   `Na__NavToolbar__SetOrbitMode` (`VV/02__Src__AppModules/42__System__DrawingViewCore/Na__DrawView__Transitions__.js:114-115`).
   TV's v2.112.0 fault was TV-only (its exit only repainted the toolbar). See S03a-F15 (corrected) and S03a-V03.
3. **The compact five-tab strip** (TV TabStrip 2.0.0, v2.158.0) and the quiet document-tab entry
   (ModeController 1.30.0).
4. **The config pipeline** (AppConfig + ConfigState units), which every feature port reads.

VV's own architecture adds two deliberate layers TV does not have and which every port must route through:
the lazy loader (`LE/01__Core__Loader`, VV v2.45.0) and the per-project Layout Mode switch (VV v2.21.20).
Both are recommended to stay (decisions D-S03a-01, D-S03a-02), with the registration pattern in b.7.

The top-bar fold Adam named (TV v2.83.0) is ALREADY in parity: VV v2.70.0 ported it with identical tokens and
selectors (b.9). What is NOT in parity in the shell is the tab strip's shape, the Drawings menu and the
document tabs.

### b.2 Config: `Na__LayoutEditor__AppConfig__.json`

**The headline diff number is mostly formatting.** The orchestrator's 2083 diff lines are a raw line diff;
VV's JSON was reformatted to aligned colons on 15-Sep-2026 (VV devlog v2.45.0 "Also seen"). Whitespace-blind
it is 528 insertions / 87 deletions; raw it is 1301 / 860 (`git diff --no-index -w --stat`). Structurally
(Python key-tree walk) there are **356 key-level differences**:

| Class | Rows | What it is |
|---|---|---|
| TV-only labels | 188 | Labels of TV-only features, grouped in Appendix A |
| TV-only feature keys / blocks | 66 | Settings of TV-only features (5 whole blocks, 61 keys) |
| TV labels misplaced in the Selection block | 3 | TV defect, see below (VV has them correctly in Labels) |
| TV-only doc notes | 31 | `...Note` / `...Description` keys that come with those settings |
| Doc wording differences | 27 | Same key, different explanatory text |
| Brand / client values | 16 | Logo, DrawnBy, PDF author/creator, file names, asset paths, font order |
| Label wording changes | 13 | Same label, TV reworded (Appendix A) |
| VV-only labels | 8 | Layout Mode (3), Notes toolbar toggle (2), three Measure labels (see TV defect below) |
| Value drift | 3 | Title block Rows, scale list, accordion sections |
| VV-only key | 1 | `ClassicFieldAnchors/A3/DrawingNumber` (TV: `DocumentId`, FontMm 2.2 vs 2.4) |

TV-only blocks (TV line in the JSON): `LayoutEditor__VectorQuality__Config` (220), `LayoutEditor__ModelSource__Config`
(337), `LayoutEditor__PlanDoors__Config` (341), `LayoutEditor__DrawingRegister__Config` (1193, 52 keys),
`LayoutEditor__Statement__Config` (1271, 37 keys).

TV-only keys inside shared blocks (all drift, all inert until their feature lands):
- TitleBlock: `RowWidthFactorByPaper` ({A2:1.2, A1:1.2}, SheetSetup 1.8.0), `ValuePrefix` on the Revision row
  ("Revision A"), 17 `QrCell*` keys (Project QR cell, SheetSetup 1.5.0/1.6.0), `ClassicFieldAnchors/A3/DocumentId`.
- Scales: `SitePlanScaleDenominators` [100,200,500,1250,2500,5000], `SitePlanDefaultScaleDenominator` 500;
  `AvailableScaleDenominators` adds 200 (v2.140.0). VV's ScaleManager reads the list generically
  (`VV/LE/07__Core__SheetData/Na__LayoutEditor__ScaleManager__.js:59-90`), so 1:200 is believed safe to adopt now (verify in app).
- Viewport: `DefaultStyles/DepthFog` (49__System__ElevationDepthFog), `RotateStepDeg/RotateDetentDeg/RotateGripOffsetPx` (v2.138.0).
- Dimensions: `DefaultExtensionMm` (v2.41.0), `DefaultAtScale` (v2.40.0), `DefaultRoundUp/RoundUpStepMm/RoundUpMarker` (v2.139.0).
- Navigation: `AuthoringZoomMax` 64 (v2.135.0), `ZoomSettleMs` 350, `HoldPaperWhileZooming` (v2.111.0).
- Snapping: `SheetChrome` (v2.114.0), `ViewportCarry/ViewportTracking/AcquireDwellMs/AcquireMax/TrackMarkerSizePx` (ViewportSnapMove).
- Selection: `PickDragPx/DoubleClickMs/DoubleClickSlopPx` (ToolSetup 1.1.0, v2.78.0).
- EditScope: `AutoMoveOnSelect`, `AutoMoveKinds` (v2.78.0).
- Shapes: `DefaultAtScale`. Leader: `NoteTooltip`, `NoteTooltipMs` (v2.144.0).
- Pdf: `FontFamily`, `FontBasePath`, `FontCdnBase`, `Fonts` (PdfFonts, v2.36-v2.69).
- Specification: `LegacyFileName`, `LockstepEnabled`, `LockstepPollMs`, `AutoSaveLocalMs` (v2.163.0).
- MarginNotes: six `Region*` keys (v2.143.0) and the Leaderless note.
- Measurements: `ArrayMaxCount` (v2.119.0).

Value drift: `TitleBlock__Rows` (TV `DocumentId` "Document ID" + Revision `ValuePrefix`; VV `DrawingNumber`
"Drawing No."); `AvailableScaleDenominators`; `Panels__AccordionSections` (TV adds `images`, `floor-areas`,
`patterns`, JSON line 282).

Brand / client values to KEEP as VV seams (never overwrite with TV's): `Style__FontFamily` (VV leads with
Helvetica because it has no PdfFonts - see D-S03a-05), every `TitleBlock__Logo*` value (VV asset 2000x444,
aspect 4.5, cell 34, max height 5.5, paddings 1.8/2.5), `DrawnByDefault` "Vale Garden Houses",
`ClassicScanAssets` (VV scan), `Pdf__Author` "Vale Garden Houses Limited", `Pdf__Creator` "ValeVision3D Layout
Editor", `Pdf__JsPdfScriptPath` (see b.10 / F35), `Specification__FileName` `ValeVision__DrawingNotes__.json`.

NA-specific values inside TV-only blocks that need a VV value or a decision before they can be adopted
(they are what a blind copy would get wrong):
- `PlanDoors__SwingCategoryKeys` `["TrueVision__Linetype__DoorSwings"]` -> VV `ValeVision__Linetype__DoorSwings` (VV's linetype keys are `ValeVision__Linetype__*`, verified by grep).
- `Specification__LegacyFileName` `TrueVision__ProjectSpecification__.json` -> VV has no legacy name; use `""` and confirm SpecData skips an empty legacy read.
- `Pdf__FontBasePath` `../01__Assets__NaApps__CommonAssets/NaApps__CommonFonts/`, `Pdf__FontCdnBase` `https://www.noble-architecture.com/...` -> VV must host its own Open Sans cuts (no TTF exists anywhere under `VV/` or `WebApps/`, checked).
- `DrawingRegister__PdfJsScriptPath/PdfJsWorkerPath` `/na-apps/20__PlanVision__CoreAppCode/.../PdfJs__3.11.174/...` -> a VV-vendored PDF.js.
- `DrawingRegister__LetterheadLogoAspect` 4.096 (NA asset) -> 4.5 (Vale asset); the register palette ("Noble Architecture Paper Palette", `EditorSetup` comment) -> Vale palette or kept neutral; `Phases` T01 Concept / T02 Planning / T03 Building Regs / T04 Site & Remedial are NA job stages (decision).
- `Statement__IndexFileName` `TrueVision__StatementDocs__.json` -> `ValeVision__StatementDocs__.json`; `Statement__StylesheetUrl` (noble-architecture.com) -> VV public host; `Statement__Html2CanvasScriptPath` -> VV vendors html2canvas 1.4.1.
- Label `SitePlanNoData` names `30__TrueVision__AppContent/SitePlan__DrawingData` -> VV content folder.
- `TitleBlock__QrCell*` (Project Portal QR, NA) -> decision D-S03a-06.

**TV defect found (do not copy, back-port the fix to TV):** three labels sit INSIDE TV's
`LayoutEditor__Selection__Config` instead of `LayoutEditor__Labels__Config`
(`TV/LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json:367-369`: `LayoutEditor__Labels__MeasureOffsetAgain`,
`...MeasureNoOffsetSide`, `...MeasureDimOffsetTitle`). `Na__LeCfg__GetLabel` reads only the Labels block
(`TV/.../Na__LayoutEditor__ConfigState__.js:372-375`), so in TV they are dead and the code fallbacks
(`TV/.../30__System__SheetTools/Na__LayoutEditor__Measurements__.js:619,921,925`) print instead. VV has them correctly
in Labels (`VV/.../Na__LayoutEditor__AppConfig__.json:881`). This is why they show up as "VV-only labels".

**VV-only labels**: `LayoutModeLabel/Hint/OffNote` (VV Layout Mode switch, D-S03a-01) and
`MarginToggle/MarginToggleTitle` (VV's toolbar Notes button, `VV/LE/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js:292`; TV
removed that button in Toolbar 1.17.0 - "The Notes toggle is gone from the toolbar", `TV/LE/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js:93-97`;
owned by the Toolbar slice).

### b.3 Config: the ConfigState barrel and its five units

| Unit | TV | VV | Getters / exports TV has that VV lacks | Other TV deltas |
|---|---|---|---|---|
| `ConfigState__` (barrel) | 1.29.0 | 1.17.0 | re-exports `ReloadKeyMap` (1.27.0, v2.115.0), `GetCopyDragModifier`, `IsCopyDragKey` (1.28.0, v2.117.0), `GetMoveAnchorModifier` (1.29.0, v2.149.0), plus `GetVectorQualitySetup`, `GetPlanDoorsSetup`, `GetModelSourceSetup`, `GetDrawingRegisterSetup`, `GetStatementSetup` | VV matches TV up to TV 1.26.0 (StatusToStore) |
| `__Readers__` | 1.0.0 | 1.0.0 | none | header + console prefix only (verbatim) |
| `__KeyMap__` | 1.11.0 | 1.0.0 | `ReloadKeyMap`, `GetCopyDragModifier`, `GetMoveAnchorModifier`, `IsCopyDragKey` | `MatchKeyBinding(key, held, context)` with `When` (1.8.0); `MatchSelectionModifier` returns `copy`/`anchor`; `GetMeasureKeys.array`; fallback rows for PageUp/PageDown, K, F6/F7/F8/F9, M, space=Select, Ctrl+S, Ctrl+X, vector-tool and boolean keys; file renamed |
| `__SheetSetup__` | 1.9.0 | 1.3.0 | `GetVectorQualitySetup`, `GetPlanDoorsSetup`, `GetModelSourceSetup`, private `PdfFontCuts` | `GetTitleBlockSetup`: rowWidthFactorByPaper + 17 qrCell* fields; rows fallback DocumentId + ValuePrefix; `GetScaleSetup`: sitePlan lists; `GetViewportSetup`: rotate*; `DefaultStyles.depthFog`; `GetPdfSetup`: fontFamily/fontBasePath/fontCdnBase/fonts; scales fallback 20/50/100/200 |
| `__ToolSetup__` | 1.5.0 | 1.0.0 | none new (same 12 getters) | `GetDimensionSetup` + defaultExtensionMm, defaultAtScale, defaultRoundUp/roundUpStepMm/roundUpMarker; `GetSelectionSetup` + pickDragPx/doubleClickMs/doubleClickSlopPx; `GetEditScopeSetup` + autoMoveOnSelect/autoMoveKinds; `GetShapeSetup.defaultAtScale`; `GetMeasureSetup.arrayMaxCount`; `GetLeaderSetup.noteTooltip/noteTooltipMs`; `GetSnappingSetup.sheetChrome` + 5 viewport-carry fields |
| `__EditorSetup__` | 1.6.0 | 1.0.0 | `GetDrawingRegisterSetup` (+ private `RegisterColumns`, `RegisterPhases`), `GetStatementSetup` | `GetSpecificationSetup` + legacyFileName, lockstepEnabled/lockstepPollMs/autoSaveLocalMs (1.6.0); `GetMarginNotesSetup` + six region fields (1.4.0); `GetNavigationSetup` + authoringZoomMax (1.3.0, v2.135.0), zoomSettleMs, holdPaperWhileZooming (1.2.0, v2.111.0); accordion fallback adds floor-areas, patterns (1.1.1) |

**VV defect found:** `GetScaleSetup` returns `sheetShowPaperSize`, `sheetMaxScales`, `sheetMixedLabel` (and the
three joiners) twice in one object literal (`VV/LE/03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js:235-246`).
Harmless at run time (same values) but TV removed the duplicates; taking TV's unit fixes it.

Fallbacks that must be re-applied as VV seams when a TV unit is taken whole: SheetSetup logo fallbacks
(34 / 33 / 5.5 / 4.5 / 1.8 / 2.5, Vale logo path), `DrawnByDefault`, rows fallback (`DrawingNumber` until the
register lands), PDF author/creator/jsPDF path, `swingCategoryKeys`; EditorSetup `fileName`
`ValeVision__DrawingNotes__.json`, `legacyFileName` `""`, `indexFileName` `ValeVision__StatementDocs__.json`,
register PDF.js paths and `logoAspect` 4.5. The KeyMap unit's file URL becomes `Na__Hotkeys__DrawingTabs__.json`
in both apps (rename, b.4).

### b.4 Keyboards: "Three Tool Sets, Three Keyboards" (TV v2.110.0) and the key files

TV now has one live keyboard at a time, chosen by `03__AppUtils/Na__AppUtils__KeyScope__.js` (a leaf with no
imports): `model` (3D Model tab; `Na__Hotkeys__Manager.js` 2.1.0 acts only there), `sheet` (drawing tab; the
sheet tools and PC controls) and `document` (Specification, Register, Statements; `LE/31__System__DocumentKeys`,
a capture-phase listener that goes first). The mode controller hands its reader over once
(`TV/LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js:653-656`, `:1182`). Three hotkey files, each named
for the tab it serves (KeyScope 1.1.0, v2.115.0): `02__AppData/Na__Hotkeys__3dModelTab__.json`,
`LE/03__Core__Config/Na__Hotkeys__DrawingTabs__.json`, `LE/31__System__DocumentKeys/Na__Hotkeys__DocumentTabs__.json`.

VV has none of the scope layer:
- `VV/02__Src__AppModules/03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js:53-56` tests only input/textarea/select
  (no contenteditable) and `:91-101` dispatches every binding on `window` with no scope check. Its dictionary
  (`VV/02__Src__AppModules/02__AppData/Na__ValeVision__HotkeysDictionary__.json`) binds bare R, B, T, Y, V,
  PageUp, PageDown and 1-9. VV's sheet keyboard also listens on `window` (`VV/LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__.js:476`)
  and never checks `defaultPrevented` (grep), so on a VV drawing tab **T picks Text AND calls
  `Na__NavToolbar__SetWalkMode()`** (`VV/index.html:1795`), R picks Rectangle AND resets the hidden camera,
  V picks Select AND toggles the scene carousel - exactly TV's v2.110.0 report. Evidence is the code path; not
  run in a browser.
- ~~Walk/Fly is not left when a drawing opens~~ **REFUTED by verifier.** VV's `SuspendThreeD()` takes no options
  (`VV/.../ModeController__.js:524`), but VV `42__System__DrawingViewCore/Na__DrawView__Transitions__.js:114-115`
  always calls `Na__NavToolbar__SetOrbitMode()` when Walk or Fly is active, which runs `HandleOrbitClick` -> the
  index.html `'return-to-orbit'` wrappers -> `Na__UiFeature__ToggleWalkMode/ToggleFlyMode(null, SetActiveMode('orbit'))`,
  the whole exit (`Na__UiFeature__NavigationToolbar__Controls.js:233-236,403`, `VV/index.html:2016-2047`). TV's own
  Transitions PORT NOTE says "check ValeVision's SetOrbitMode really leaves Walk before assuming parity" - it does.
  What VV really lacks is TV Transitions 1.1.0's OPT-IN: VV's snapshot renderer suspends around every viewport
  picture (`.../25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js:501`), so a picture rendered from
  the 3D tab (a bake, a quiet re-stamp) throws a walker back to Orbit. That is S02a's WP-S02a-11; see S03a-V03.

Drawing-tab key map: VV's `Na__LayoutEditor__KeyMappings__.json` is a strict subset of TV's
`Na__Hotkeys__DrawingTabs__.json` - same 11 blocks, same schema keys (TV kept the `LayoutEditor__KeyMappings__*`
prefixes inside the renamed file), keyboard list 36 vs 59 bindings, actions 41 vs 63. TV-only bindings:
Nav__PreviousSheet/NextSheet (PageUp/Down), Ortho__Toggle (F8) + disabled Ctrl+L alternate, View__DraftToggle (K),
View__GridToggle (F6), Snap__GridToggle (F7), View__AxesToggle (F9), Edit__Cut, Tool__FloorArea (A), Tool__Circle (C),
Tool__Arc (Shift+A), Tool__Trim (T, When InContainer), Edit__Boolean{Union,Subtract,Trim,OuterShell} (Shift+U/S/T/O,
When BooleanSelection/OuterShellSelection), Tool__Extend (Shift+T), Join (J), Split (U), Offset (F), Fillet (Shift+F),
Chamfer (Shift+C). TV-only keys: `MeasurementsBox__ArrayCharacters`, `SelectionBindings__CopyDragModifier`,
`SelectionBindings__MoveAnchorModifier`.

**Live VV bug (fixed in TV KeyMap 1.5.0, v2.115.0):** VV's built-in fallback
(`VV/LE/03__Core__Config/Na__LayoutEditor__ConfigState__KeyMap__.js:71-110`) has no `Tool__Move`, no
`Tool__SelectSpace`, no `Edit__Save`, and still binds the space bar to `Edit__Deselect` enabled (`:91`) while the
shipped JSON has it disabled. Whenever the key file fails to load, M is dead for the session and Ctrl+S is not
matched by `Na__LeMode__OnSaveKey` (`VV/.../ModeController__.js:627-643`), so the browser's Save Page dialog opens over
the sheet. The ledger already noted the symptom (`VV/ValeVision__PARITY__TrueVisionLedger__.md:240`).

**Atomicity rule for the key-map port:** TV's JSON lists `Tool__Trim` (T, When InContainer) BEFORE `Tool__Text`
(T). VV's current `MatchKeyBinding` has no `When` test, so dropping TV's JSON in alone would make T resolve to
Trim (a no-op in VV - its keyboard switch returns on unknown actions,
`VV/LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__Keyboard__.js` `default: return;`) and the Text tool
would become unreachable. The JSON rename and the KeyMap unit 1.11.0 must land in ONE change. With TV's unit
and no context passed by VV's callers, every `When` binding is skipped and T stays Text; the other new
bindings resolve to actions VV's switch ignores (no `preventDefault`), so nothing regresses.

3D hotkey layer naming (outside the drawing system proper, but the scope guard is not): TV `Na__Hotkeys__Manager.js`
2.0.0 was itself "ported from ValeVision3D's Na__AppUtils__ValeVision__HotkeyHandler__.js" (TV file header) and
moved to `10__NavigationAndCameras` with UI-label propagation; VV keeps its handler in `03__AppUtils`. Recommended:
keep VV's handler module and its `ValeVision__*` action names and VV-only actions (V views panel, Alt+Backspace
back, Shift+Alt+F fog, the `DrawingMarkup__Contextual` documentation rows), add the KeyScope guard and the
contenteditable test; rename only the JSON file (D-S03a-03).

### b.5 The mode controller (`LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js`)

TV 1.32.0 (1292 l.) against VV 1.18.0 (906 l.). The two logs share features up to TV 1.19.0; mapping:

| TV version (date, app version) | What it does | In VV? |
|---|---|---|
| 1.8.0 TrueVision (13-Sep, v2.32.0) | Model Source: PhaseLib changes refresh frames/panels; `Na__LeSource__Initialize` | No - ModelSource and `26__System__ToggleModelElements/Na__ModelGroup__PhaseLibrary__.js` are TV only (D-S03a-10) |
| 1.9.0-1.13.0 | Leaders panel, Spec tab, Measurements box, groups, dashed-edge config | Yes (VV 1.10.0-1.14.0) |
| 1.14.0 (14-Sep, v2.53.0) | Scrapbook section registered | Yes, in the right column's Scrapbook tab (VV 1.18.0) |
| 1.15.0 (17-Sep, v2.57.0) | SectionForKind / FocusPanelForSelection | Yes (VV 1.16.0), but the 1-argument form; TV's takes `items` (1.21.0) |
| 1.16.0 (18-Sep, v2.65.0) | web viewer shell | Yes (VV 1.17.0) |
| 1.17.0 / 1.18.0 (19-Sep, v2.76/v2.77) | Custom + Parametric scrapbooks; right-column tabs | Yes (VV 1.18.0) |
| 1.19.0 (20-Sep, v2.80.0) | ViewportIdentity | Yes (VV 1.18.0) |
| 1.20.0 (20-Sep, v2.91.0) | Left column tabs: Document Preferences + Specification (58__Feature__ScrapbookSpecification) | No |
| 1.21.0 (21-Sep, v2.106.0) | Floor Areas and Patterns fold with the group; a viewport folds the group; site plan viewport opens Patterns; `'areas'` reason; `AllAreas/AllImages/OneSitePlan` | No |
| 1.22.0 (21-Sep, v2.110.0) | KeyScope reader + Follow; DocumentKeys Ready + Initialize | No |
| 1.23.0 (21-Sep, v2.112.0) | StepSheet (Page Up/Down via `Na__LePc__STEP_SHEET_EVENT`); `SuspendThreeD({ returnToOrbit : true })` | StepSheet: No. Walk exit: **already yes in VV** (unconditional; verifier, see b.4) - the option only matters once Transitions 1.1.0 makes the exit opt-in (S02a WP-S02a-11) |
| 1.24.0 (21-Sep, v2.114.0) | Drawing Grid panel + Attach/Detach | No |
| 1.25.0 (21-Sep, v2.115.0) | RestartSheetKeys (detach, `Na__LeCfg__ReloadKeyMap`, attach, `Na__LePc__TakeKeyboard`) on every entry from another tab | No |
| 1.26.0 (21-Sep, v2.116.0) | Sheet Images: Ready, Initialize, input attach/detach, Images panel, SectionForKind 'images' | No |
| 1.27.0 (21-Sep, v2.130.0) | Vector Tools panel + `Na__LeVec__Initialize` | No |
| 1.28.0 (21-Sep, v2.131.0) | Drawing Axes attach/detach | No |
| 1.29.0 (22-Sep, v2.143.0) | Overspill note region grips attach/detach | No |
| (no log entry; v2.155.0) | Viewer never calls `SetSheet`, in Enter AND in OnSheetsChanged (published drawings) | No - and the TV module log is missing this entry (TV doc gap) |
| 1.30.0 (23-Sep, v2.158.0) | `EnterUnder` (quiet first sheet under a document tab; no first-open veil) | No |
| 1.31.0 (29-Sep, v2.163.0) | Spec lockstep watch start/stop; `Na__LeSpecLock__Mount` | No |
| 1.32.0 (29-Sep, v2.166.0) | `OpenRegister(options)` / `OpenStatements(options)` for shared links | No |

Also TV-only, not separately logged: the Drawing Register and Statement Writer mounts and initialisation in
Build/Initialize (`:502-504`, `:1200-1202`), `'register-updated'` -> chrome refresh (`:1142`), Leave hiding the
register and statements first (`:765-766`), `Na__LeSpec__StopWatch` in Leave (`:768`), the Ready chain additions
`Na__LeHatch__Ready`, `Na__LeSpComp__Ready`, `Na__LeArea__Ready`, `Na__LeDocKeys__Ready`, `Na__LeImg__Ready` (`:1193`),
`PreloadMetrics` returning its promise (`:632-640`) so the veil can wait on it, the left-column `RegisterTab`
with hint text (`:521`, `:538`), and the exports `VIEW_REGISTER`, `VIEW_STATEMENT`, `OpenRegister`, `OpenStatements`.

VV-only (keep as seams; one is a TV back-port):
- `IsAvailable`, `IsLayoutModeOn`, `SetLayoutMode` (`VV/...:327-354`, exports `:900-902`), the Enter guard on
  `IsAvailable` (`:498`) and the leave-on-unavailable rule in OnSheetsChanged (`:777`) - the Layout Mode switch
  (D-S03a-01).
- `WaitForFirstDrawing` (`:595-600`) - the loader's wait (b.6, b.7).
- The scene-broadcast listeners (`:866-867`, VV 1.15.1, v2.45.1): Add Viewport's scene list follows scenes added
  while a sheet is open. The ledger lists this as a pending back-port to TV (`ValeVision__PARITY__TrueVisionLedger__.md:1231`).
  It must survive any wholesale take of TV's file.
- Folder numbers `42__System__DrawingViewCore` / `43__System__FloorPlanViews` / `46__System__ElevationViews`
  (`:191`, `:243-249`; permanent per realign plan section 4.1).
- `Na__LeOsnap__Clear` from `30__System__SheetTools/Na__LayoutEditor__Snapping__.js` (`:228`) until object snap
  moves to `28__System__ObjectSnap` (TV `:349`).

Recommended method: the mode controller is the integration hub and is edited by almost every feature port.
Port it in three steps - (1) the feature-independent hunks first (KeyScope reader, RestartSheetKeys,
StepSheet, returnToOrbit, EnterUnder/Quiet, the view constants, PreloadMetrics promise, Leave order); (2) each
feature package adds exactly its own TV hunk (section (d) lists them line by line); (3) a final convergence
pass diffs against TV with `git diff --no-index -w` and leaves only the listed VV seams. Treat the file as a
HOT file: the planner must serialise every package that edits it.

### b.6 Tab strip (TV 2.0.0) and how the document tabs open

TV 2.0.0 (`TV/LE/05__Core__ModeController/Na__LayoutEditor__TabStrip__.js`): five tabs, however large the pack -
**3D Model | Drawings | Specification | Document Register | Design Statements** (`:321-361`). Drawings opens a
menu (`:421-615`) of every drawing in register order, each row reading "D03 - 3D Images"
(`Na__LeModel__GetTabLabel`) with the whole number on its hover, the open one marked and focused, then on an
editable session a "+ New sheet" row in place of the old + tab (`:488-496`). Pressing Drawings never leaves the
open drawing; Escape, an outside press or any mode change shuts the menu; Up/Down/Home/End walk the rows
(`:542-557`). The menu lives on `document.body` (`.na-le-tabs__menu`, fixed, z-index 1002) so the strip's
overflow cannot clip it. Arrows at the strip ends step tabs; landing on Drawings opens the last drawing read
(`Na__LeTabs__Activate` WeakMap, `:192`, `:341`). Rename on double-click and reorder by drag are gone (the
register and the Sheet panel do both). The strip is shown only while the project has a drawing sheet
(`:316`). The document tabs are present from the 3D view. Exports add `Na__LeTabs__CloseMenu`.

VV 1.5.0: one tab per sheet + a + tab (`VV/...TabStrip__.js:307-340`), double-click rename (`:182-201`), drag
reorder (`:316-330`), a "Project Specification" tab only while a drawing is open (`:342-351`). Every read and action
goes through the loader facade (`:108-131`), so the strip can draw before the editor exists.

How a document tab opens in TV: `OpenSpecification/OpenRegister/OpenStatements` call `Na__LeMode__EnterUnder`
(`TV/...ModeController__.js:883-888`), which opens the first sheet underneath with `Quiet` set, so the first-open
veil (z-index 40) is not put over the register/statements pages (z-index 12).

VV adaptation needed (not a copy): in VV the first press of ANY tab goes through `Na__LeLoad__WithEditor`, which
shows the loading screen, loads the editor, runs the action and then waits on
`Na__LeMode__WaitForFirstDrawing` before hiding (`VV/LE/01__Core__Loader/Na__LayoutEditor__Loader__.js:388-422`,
`:376-384`). `WaitForFirstDrawing` waits for the ACTIVE sheet's viewports whenever the editor is active
(`VV/...ModeController__.js:595-600`). A Register or Statements tab pressed from the 3D view would therefore keep
the loading screen over the page the reader asked for until the sheet nobody asked for has drawn underneath -
the exact fault TV 1.30.0 fixed. Today it is latent (VV's spec tab only appears once a drawing is open); TabStrip
2.0.0 makes it live. Fix: `WaitForFirstDrawing` resolves at once when `Na__LeMode__View !== VIEW_SHEET` or in
viewer mode (b.7, WP-S03a-05).

Strip CSS: VV keeps the strip's rules in `LE/01__Core__Loader/Na__LayoutEditor__Styles__Boot__.css` (it must
style the strip before the editor loads); TV keeps them in `LE/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css:57-260`.
A selector-level comparison shows VV Boot lacks 10 TV rules (`.na-le-tabs__tab--menu-open`, `.na-le-tabs__caret`,
`.na-le-tabs__tab--menu-open .na-le-tabs__caret`, `.na-le-tabs__menu`, `.na-le-tabs__menu[hidden]`,
`.na-le-tabs__menu-row`, `:hover/:focus-visible`, `--open`, `--add`, `.na-le-tabs__menu-divider`) and still carries
6 rules TV dropped with 2.0.0 (`.na-le-tabs__tab--add`, `.na-le-tabs__renaming`, `-code`, `-code[hidden]`,
`.na-le-tabs__renaming .na-le-tabs__rename`, `.na-le-tabs__rename`). All other strip, scroller, arrow and Dev
section rules are byte-identical. TV's spec stylesheet still has `.na-le-tabs__tab--spec { margin-left: 8px }`,
now dead because 2.0.0 uses `--specification` (TV devlog v2.158.0 says so); drop it on both sides.

Labels the port brings (AppConfig): `DrawingsTab`, `DrawingsTabTitle`, `DrawingsTabOpenTitle`, `RegisterTab`,
`RegisterTabTitle`, `StatementsTab`, `StatementsTabTitle`, `TabStripNote` (TV-only); wording changes
`SpecificationTab` "Specification" (VV "Project Specification"), `TabsPreviousTitle`/`TabsNextTitle` "The tab
before/after this one" (VV "The drawing..."), `NoSheets` (TV "No sheets yet. New Sheet below makes the first; the
tab strip and its Drawings menu appear with it."). Before the editor loads, VV's strip shows code FALLBACKS
(`Na__LeLoad__GetLabel`, `Loader.js:558-560`), so the TabStrip fallbacks must equal TV's config text - TV's do.
`SheetTabEditTitle` becomes dead in both (TV kept it).

### b.7 VV's lazy loader (`LE/01__Core__Loader`)

What it does today (`Loader.js` 1.1.0):
- index.html imports ONLY the loader (`VV/index.html:1442`, initialised `:2274-2283` with the same render context
  TV hands `Na__LeMode__Initialize` at `TV/Index.html:1719-1728`). Its static imports are deliberately limited to
  the drawings block (`42__System__DrawingViewCore/Na__DrawView__ProjectData__.js`), the authoring gate, the
  dependency-free `07__Core__SheetData/Na__LayoutEditor__DrawingCode__.js` leaf and its own LoadingScreen (`:82-96`).
- **Offered** = `LayoutModeEnabled && raw sheet count > 0` (`:503-507`); the first time it is offered it imports the
  tab strip (`:434-438`) and announces `na-layouteditor-loader-changed` (`:447-455`).
- **Loaded** on first need (`:349-356`, `:388-422`): sheet tab, + tab, rename/drag, a Dev action, or a quiet re-stamp
  (`PrepareRestamp`, `:671-675`). `Run()` imports six entry modules with literal specifiers (mode, model, spec,
  config, viewport3d, pdf; `:244-253`) and links `Na__LeLoad__STYLESHEETS` in parallel (`:125-134`, `:264-278`), then
  calls `Na__LeMode__Initialize(Context)` (`:329`), checks the event/view name copies (`:284-295`), and replays the
  sheet model's `'loaded'` announcement so AutoSave/History/SpecLinks get their start (`:307-311`).
- **Before load** the strip and the Dev section are answered from the raw drawings block (`SheetViews`, `:187-196`,
  carrying `Sheet__Fields` read-only for the tab code), the web read-only flag (`:202-206`), nothing open, nothing
  dirty, label fallbacks (`:558-566`). Every action loads first.
- **Dev section**: `WireDevSection` (`:464-481`) reveals `#naLayoutEditorDevItem` (same ids as TV, `TV/Index.html:629-636`)
  and spends the first toggle click importing `70__DevTools__DevMenu`, which then opens itself (`open : true`).
- **The wait**: `AwaitFirstDrawing` (`:376-384`) calls `editor.mode.Na__LeMode__WaitForFirstDrawing(onProgress)`,
  which counts `.na-le-frame` pictures against the model's viewport count through `Na__LeVeil__DrawingSettled`
  and drives the status line "Drawing the Views - n of m".
- `Na__LeLoad__STYLESHEETS`: Surfaces, Main, Main__Paper, Panels, Specification, Specification__Notes,
  Specification__Read, WebViewer (last). TV's CSS index imports the same eight PLUS DraftMode, DrawingGrid,
  ObjectSnap, DrawingAxes (after Main__Paper) and SheetImages, Share (after Spec__Read, before WebViewer)
  (`TV/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css:161-174`), and ColourPalette / SpellCheck in their
  own regions (`:182`, `:190`). TV's Patterns, FloorAreas, DrawingRegister, ScrapbookSpecification, VectorTools and
  the two Statement stylesheets are NOT in the index: their modules link themselves
  (`new URL('./...css', import.meta.url)`, e.g. `TV/LE/51__Feature__DrawingRegister/Na__LayoutEditor__Register__Editor__.js:596`),
  so they need no loader entry.

Every TV-only LE subsystem is imported only from inside the LE graph (import walk: DraftMode, DrawingGrid,
ObjectSnap, DocumentKeys, OrthoMode, DrawingAxes, HatchPatternTools, VectorTools, DrawingRegister,
StatementWriter, ProjectQrCode, SheetImages, ScrapbookSpecification, FloorAreas, DocumentPublishing,
DocumentSharing, SitePlanData are each imported only by LE modules reachable from the mode controller). TV's
only outside importer of LE (`40__System__DrawingViewCore/Na__DrawView__RenameDrawing__.js:130`) already uses a
dynamic import; VV routes the same need through `PrepareRestamp/RestampForScene`. So under VV's loader every
feature port becomes lazy automatically, and the registration work is confined to:

| TV start-up wiring | TV location | VV registration through the loader |
|---|---|---|
| `Na__LeMode__Initialize(context)` | `TV/Index.html:1719-1728` | exists: `Loader.js:329` |
| `Na__LeTabs__Initialize()` | `TV/Index.html:1730` | exists: `ImportTabs` `:434-438` (strip drawn before load) |
| `Na__LayoutEditor__DevMenu__Initialize()` | `TV/Index.html:1731` | exists: `WireDevSection` `:464-481` |
| `Na__LeShareOpen__Initialize()` (66__Feature__DocumentSharing) | `TV/Index.html:1733-1738`, outside the `.then` | NEW when 66 ports: in `Na__LeLoad__Initialize`, only when the URL carries `?open=`, call `Require()` then a literal `import('../66__Feature__DocumentSharing/Na__LayoutEditor__Share__Open__.js')` and its Initialize. A project opened without `?open=` must load nothing |
| CSS index LE imports (14) | CSS index `:161-174` | `Na__LeLoad__STYLESHEETS` in the SAME cascade order; each feature package adds its own line when its CSS exists (a missing file only warns, `:272-275`, so never pre-register) |
| ColourPalette / SpellCheck CSS | CSS index `:182`, `:190` | VV page CSS index if VV's 3D tab uses them (TV's Plan Annotations toolbar does); else the loader list (54/55 slices decide) |
| KeyScope reader | ModeController `:1182` | inside the lazy controller - correct: until load the scope is `model`, which is right because no drawing tab can be open. KeyScope itself must be page-level (imported by VV's HotkeyHandler) |
| DocumentKeys capture listener | ModeController `:1211` | inside the lazy controller (document tabs only exist after load) |
| Strip actions | TV TabStrip imports the controller | NEW facade: `Na__LeLoad__OpenRegister(options)`, `Na__LeLoad__OpenStatements(options)`, `Na__LeLoad__IsSitePlanSheet(sheet)` (pre-load: `record.Sheet__DrawingType === 'siteplan'`, TV `SheetRecords__.js:433,1311`), copies `Na__LeLoad__VIEW_REGISTER = 'register'`, `VIEW_STATEMENT = 'statement'` added to `CheckNames`, and a feature-presence answer for the tab gate (D-S03a-04). **[Verifier]** `SheetViews` (`Loader.js:187-196`) does not carry `Sheet__DrawingType` today - add it; after load VV's SheetModel has NO `Na__LeModel__IsSitePlanSheet` until the site plan port (S04a), so the facade must answer false when the export is absent. Make the feature-presence answer a static map in the loader that each feature package flips (no runtime probe), and have OpenRegister/OpenStatements refuse without loading anything while their features are absent |
| Dev Bake live-phase filter | TV DevMenu imports ModelSource | when ModelSource ports: add a literal `modelSource` entry to `ImportEditor` and reach `editor.modelSource.Na__LeSource__Resolve` |
| Wait contract | n/a | `WaitForFirstDrawing` resolves at once for document views and the viewer; otherwise waits the same three jobs TV's first-open veil waits (drawing count, specification, PDF text metrics) and reports the first outstanding one |

**Recommendation: keep the loader in VV (permanent divergence) with the pattern above written into its
header, and offer it to TV as an optional back-port (D-S03a-02).** Evidence:
- VV v2.45.0 measured the start-up cost it removed: JS modules 417 files / 9.5 MB -> 345 / 7.6 MB, the editor's
  share 73 files / 1.9 MB -> 2 files / 48 KB; stylesheets 104 KB -> 7 KB (`VV/ValeVision__DEVLOG__.md:2471-2478`).
- Full parity grows VV's LE to TV's size: TV LE today is 289 JS files / 7.8 MB, 23 CSS / 418 KB, 27 JSON / 533 KB
  against VV's 139 JS / 3.2 MB, 11 CSS / 158 KB, 11 JSON / 223 KB (tree_tv.tsv / tree_vv.tsv byte sums). Without
  the loader, aligning to TV would roughly double VV's start-up JavaScript for every project, drawings or not.
- TV still imports the whole editor at start-up (`TV/Index.html:901-904`).
- **[Verifier correction]** The survey also cited TV's phone crashes (v2.155.0) and
  `TrueVision__NOTES__LayoutEditorPerformance__.md`. Neither measures start-up weight: the v2.155.0 crashes were
  viewport RENDERING on the reader's device (fixed by the viewer never calling SetSheet), and the NOTES file is an
  authoring-performance audit (sheet normalisation once per announcement, the Vector hold; both "NOT in ValeVision",
  owned by S03b/S04a). The loader case rests on the two bullets above.

**Ledger contradiction to fix:** the Pending back-port table lists the loader as a TV candidate
(`ValeVision__PARITY__TrueVisionLedger__.md:1230`), the loader's own PORT NOTE says "Back-port: candidate.
TrueVision's Index.html still imports the editor at start-up." (`Loader.js:51`), but the 20-Sep veil section says
"No TrueVision counterpart - TrueVision does not lazy-load its editor. Not a back-port candidate." (`:1244`).
Resolve to one statement per D-S03a-02.

### b.8 Dev menu (`LE/70__DevTools__DevMenu/Na__LayoutEditor__DevMenu__Controls__.js`)

VV 1.4.0 (413 l.) holds the NEWER architecture: loader-aware (every read and action through `Na__LeLoad__*`;
1.3.0), the Enable Layout Mode switch at the head of the section (1.2.0, `VV/...:BuildLayoutModeSwitch`), open on
the first click that imported it, Delete asks before loading. VV 1.4.0's own content (sheet names as tabs) is TV
1.3.0's. TV holds one behaviour VV lacks: **TV 1.2.0 (13-Sep)** - the linework bake names a drawing only when the
viewport draws the LIVE design phase (`Na__LeSource__Resolve(v).isLive`, `TV/...:177`); depends on ModelSource.
TV's `NoSheets` fallback is stale ("Add one from the Dev menu or the + tab.", `TV/...:207`) against TV's own
config. Action: keep VV's file; add the isLive filter through the loader when ModelSource lands; take TV's
2.0.0 `NoSheets` wording with the strip; back-port to TV only if D-S03a-02 says so. Related but not this module:
`TrueVision__PLAN__DrawingMenus__.md` (v2.86.0) rebuilt the Floor Plans / Elevations Dev panels (DraftGuard,
DevRowShell, RowAccordion in `40__System__DrawingViewCore`) - "Not in ValeVision"; owned by the DrawingViewCore slice.

### b.9 UI parity of the shell (top bar, veils)

- **Top bar fold - in parity.** `03__Style__AppStylesheets/Na__UiFeature__Styles__AppHeader__.css` in both apps:
  `--Vale_HeaderFoldDuration 1000ms`, `--Vale_HeaderFoldEase cubic-bezier(0.40, 0.00, 0.20, 1)`,
  `--Vale_HeaderFoldDelay 1000ms` (TV `:210-212`, VV `:206-208`), the same `body.na-layout-editor--active .app-header`
  / `.na-le-tabs` / `.na-le-host` rules, one-way delay, no reduced-motion branch. Differences are comments only
  (TV adds a "canvas deliberately left out" note). Ledger `:1239` "verbatim" is correct. No action.
  **[Verifier]** Confirmed by `git diff --no-index -w`: the fold region differs in comments only; the fold is CSS
  only (TV devlog v2.83.0 "Files"). Two adjacent differences are NOT the fold and belong to S10: the narrow-screen
  title (TV 18 px, VV hidden - D-S10-08, brand) and the 3D canvas, which VV places BELOW a visible tab strip
  (`VV/03__Style__AppStylesheets/Na__CoreUi__Styles__RenderCanvas__.css:9,14`) while TV leaves the strip over it
  (D-S10-04). With TabStrip 2.0.0 the strip shows over the 3D view on every project with drawings, so D-S10-04
  becomes visible on every such project.
- **Coming-out veil** ("Loading Your 3D Model"): ported (VV LoadingVeil 1.0.0 = TV 1.1.0's ReturnTo3d), overlays
  CSS adapted (VV carries only `--over-model`). No action beyond helper alignment.
- **Going-in cover**: TV shows "Your Drawings Are Loading" after 550 ms with a status line naming the first
  outstanding job - "Drawing the Views - n of m", "Reading the Project Specification", "Preparing the Drawing
  Fonts" (`TV/...LoadingVeil__.js` FirstOpen). VV shows its loader screen "Loading Layout Editor..." with
  "Fetching the drawing tools" / "Reading the drawing settings" / "Drawing the Views - n of m"
  (`VV/LE/01__Core__Loader/Na__LayoutEditor__LoadingScreen__.js:61`, `Loader.js:144-146`) and does not wait for the
  specification or the PDF metrics (VV's `PreloadMetrics` returns nothing, `VV/...ModeController__.js:467-475`). For an
  identical experience: keep VV's screen (it must cover the import), adopt TV's headline wording and the two
  extra job lines (D-S03a-09), and make the wait cover the same three jobs.
  **[Verifier]** The text-metrics job was left out DELIBERATELY in VV v2.70.0 and in VV LoadingVeil's PORT NOTE
  ("No text metrics job either: ValeVision has no PdfFonts module to preload"); it becomes meaningful only with
  D-S03a-05 (VV's `PreloadMetrics` still loads jsPDF). The SPECIFICATION job is the real gap and can land now.
  One more difference: TV's `Na__LeVeil__FirstOpen` answers once per session and is skipped only for the quiet
  entry under a document tab, so when a session starts on a document tab the FIRST drawing tab still gets the
  veil; VV's loader screen covers only the editor's first load (`Loader.js:388-422` runs every later action with no
  screen), so that first drawing tab gets no cover. Reachable once TabStrip 2.0.0 shows the document tabs from the
  3D view (S03a-V05, D-S03a-11).
- **Tab strip / Drawings menu / document tabs**: see b.6 - the main visible UI gap in this slice.

### b.10 Library and asset placement that the config points at

VV's jsPDF lives in the legacy page-layout folder (`./02__Src__AppModules/35__System__PageLayoutSystem/01__Dependencies__VersionLocked/jspdf.umd.js`)
and is byte-identical to TV's `04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js` apart
from line endings (both 4.1.0, built 2026-02-02; `cmp` after stripping CR: identical). VV has no html2canvas
(needed by the Statement Writer PDF) and its Classic title-block scan is still under `35__System__PageLayoutSystem`.
TV moved all three in v2.155.0 Phase 0 (jsPDF and html2canvas to `04__Lib__ThirdParty__VersionLocked/05__...` and
`06__...`, the scan to `01__AppAssets__TrueVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png`).
Mirroring that in VV (`01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/`) keeps the AppConfig paths
structurally identical and frees `35__System__PageLayoutSystem` for retirement (that folder's slice decides).

**[Verifier correction] COPY, do not move.** VV's legacy page layout system is still live:
`02__Src__AppModules/30__System__ImageExport/Na__UiFeature__ImageExport__Controls.js:627` opens
`35__System__PageLayoutSystem/Na__PageLayoutSystem__Layout__.html`, which loads `01__Dependencies__VersionLocked/jspdf.umd.js`
by a relative script tag (`:40`) and `PageLayoutSystem__TitleBlock__A3__.png` by relative path
(`Na__PageLayoutSystem__Config.json:6`, `Na__PageLayoutSystem__SystemLogic__Main__.js:33`). Moving the files breaks
Image Export's "send to drawing document" tab. Copy them to TV's locations, point only the Layout Editor's config and
fallbacks at the copies, and leave the 35 copies until 35 is retired (S09 D-S09-10). See WP-S03a-V02.

### b.11 Port-note and ledger hygiene found in this slice

- TV `ModeController__.js:40-45` says "Parity: verbatim ... Divergences: Console prefix, header and folder numbers
  only" - false since 1.17.0. TV `LoadingVeil__.js:53-54` "Back-port: PENDING to ValeVision3D" - VV ported it
  (adapted) in v2.70.0. TV `DevMenu__Controls__.js:25-29` "verbatim" - VV's is loader-adapted with a Layout Mode switch.
- VV `ModeController__.js:47-52` and `TabStrip__.js:43-48` still read "Parity: new / Ported from Lantern
  Designer"; VV ConfigState and its units still read "Back-port: the same split applies to TrueVision's copy"
  (done in TV v2.55.0).
- TV ModeController's log has no entry for the v2.155.0 viewer change (TV devlog `:1334-1335` records it).
- Ledger: the loader contradiction (b.7); "the two verification harnesses ... ValeVision has no equivalent"
  (`:44-49`) is stale (VV has `80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs` and `Na__Verify__ModuleGraph__.mjs`);
  the Pending back-port row "The whole Layout Editor" (`:1228`) is stale (TV has it since v2.23.0 per `:31`); the VV
  plan's D22 text and its JSON comment "the live site ignores it" (`ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md:70`, `:242`)
  predate VV v2.45.0, where the switch became "on localhost and on the live site alike".

---

## (c) Module-by-module table

| TV path | TV ver | VV path | VV ver | State | What VV lacks or does differently (TV devlog versions) | Recommended action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|---|---|
| `LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json` | - | same | - | drifted (356 key diffs; 615 -w lines vs 2161 raw) | 5 blocks, 61 keys, 188 labels, 31 notes (b.2, App. A); 13 label rewordings; 3 value drifts | port_whole_reapply_vv in two passes: additive keys/blocks/notes now; behaviour-changing values with their features | keep the 16 brand values; VV values for NA paths (b.2); keep LayoutMode labels (D-S03a-01); do NOT copy TV's Selection-block labels; adopt TV's compact JSON formatting | features for value changes; D-S03a-05/06/07 |
| `LE/03__Core__Config/Na__LayoutEditor__ConfigState__.js` | 1.29.0 | same | 1.17.0 | drifted | 9 re-exports (b.3) | port_whole_reapply_vv | header "INTEGRATION: called by the loader"; console prefix | units below |
| `LE/03__Core__Config/Na__LayoutEditor__ConfigState__Readers__.js` | 1.0.0 | same | 1.0.0 | header-only | nothing | no_action (fix port note) | console prefix | - |
| `LE/03__Core__Config/Na__LayoutEditor__ConfigState__KeyMap__.js` | 1.11.0 | same | 1.0.0 | drifted | 1.1.0 K (v2.107), 1.2.0 PgUp/PgDn (v2.112), 1.3.0 F8 (v2.113), 1.4.0 F6/F7 (v2.114), 1.5.0 fallback Move/Save/Space + ReloadKeyMap + file rename (v2.115), 1.6.0 CopyDrag (v2.117), 1.7.0 ArrayCharacters (v2.119), 1.8.0 When context + vector keys (v2.130), 1.9.0 F9 (v2.131), 1.10.0 MoveAnchor (v2.149), 1.11.0 booleans (v2.151) | port_verbatim, atomically with the key-file rename | console prefix only | - |
| `LE/03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js` | 1.9.0 | same | 1.3.0 | drifted | 1.5.0/1.6.0 QR cell, 1.7.0 depthFog (v2.94), 1.8.0 row width factor + ValuePrefix (v2.109), 1.9.0 hide swings + 1:200 (v2.140); TV-only GetPlanDoorsSetup, GetModelSourceSetup, PdfFontCuts, GetVectorQualitySetup; VV duplicate keys `:235-246` | port_whole_reapply_vv | VV logo/DrawnBy/PDF fallbacks; rows fallback keeps DrawingNumber until register; swing key `ValeVision__Linetype__DoorSwings`; PDF font fallbacks per D-S03a-05 | register (rows), PdfFonts (fonts) |
| `LE/03__Core__Config/Na__LayoutEditor__ConfigState__ToolSetup__.js` | 1.5.0 | same | 1.0.0 | drifted | 1.1.0 auto-move/pick-drag (v2.78), 1.2.0 sheetChrome (v2.114), 1.3.0 arrayMaxCount (v2.119), 1.4.0 round-up (v2.139), 1.5.0 note tooltip (v2.144); TV-first defaultExtensionMm, defaultAtScale, viewport-carry keys | port_verbatim | none | - |
| `LE/03__Core__Config/Na__LayoutEditor__ConfigState__EditorSetup__.js` | 1.6.0 | same | 1.0.0 | drifted | 1.1.0 register setup, 1.1.1 accordion fallback, 1.2.0 zoom settle (v2.111), 1.3.0 authoringZoomMax (v2.135), 1.4.0 regions (v2.143), 1.5.0 statement lockstep (v2.157), 1.6.0 spec lockstep (v2.163); GetDrawingRegisterSetup, GetStatementSetup | port_whole_reapply_vv | fileName, legacyFileName "", indexFileName, register PDF.js paths, logoAspect 4.5, html2canvas path, palette comment | D-S03a-07, -08 |
| `LE/03__Core__Config/Na__Hotkeys__DrawingTabs__.json` | (key file) | `LE/03__Core__Config/Na__LayoutEditor__KeyMappings__.json` | - | renamed + drifted | 23 bindings, 22 actions, ArrayCharacters, CopyDrag/MoveAnchor modifiers; TV description "one of the app's three hotkey files" | rename_move + port_verbatim (atomic with KeyMap unit) | none (internal key prefixes are identical) | KeyMap 1.11.0 |
| `LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js` | 1.32.0 | same | 1.18.0 | drifted (828 diff lines) | 1.20.0-1.32.0 + 1.8.0 + v2.155.0 viewer path (b.5) | port_adapted, incrementally (feature-independent hunks, then one hunk per feature, then converge) | seams S1-S7 (b.5): folder numbers, console prefix, Layout Mode, WaitForFirstDrawing (adapted), scene-broadcast listeners, loader INTEGRATION header, Snapping path until 28 lands | every feature in (d) |
| `LE/05__Core__ModeController/Na__LayoutEditor__TabStrip__.js` | 2.0.0 | same | 1.5.0 | drifted (656 diff lines) | 2.0.0 compact five-tab strip + Drawings menu (v2.158) | port_adapted | all reads/actions via loader; visibility = `Na__LeLoad__IsAvailable` if D-S03a-01 keeps the switch; render at Initialize; document tabs gated on feature presence (D-S03a-04); fallbacks = TV text | WP-S03a-05 facade; register/statements for their tabs |
| `LE/05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js` | 1.1.0 | same | 1.0.0 | drifted (adapted, 234 diff lines) | FirstOpen (by design absent); TV's Advance/Settled helpers and job tracking | keep_vv_divergence + port_adapted helpers | export a VV `FirstOpenJobs(jobs, onStatus)` built on TV's track/Advance code; keep DrawingSettled | WP-S03a-05 |
| `LE/70__DevTools__DevMenu/Na__LayoutEditor__DevMenu__Controls__.js` | 1.3.0 | same | 1.4.0 | drifted (VV newer architecture) | TV 1.2.0 live-phase bake filter | keep_vv_divergence + port_adapted (isLive through loader) | loader facade; Layout Mode switch per D-S03a-01 | ModelSource (D-S03a-10) |
| none | - | `LE/01__Core__Loader/Na__LayoutEditor__Loader__.js` | 1.1.0 | vv-only | - | keep_vv_divergence; extend facade (b.7) | add OpenRegister/OpenStatements/IsSitePlanSheet/VIEW copies/feature presence; `?open=` path; STYLESHEETS per feature; header pattern | D-S03a-02 |
| none | - | `LE/01__Core__Loader/Na__LayoutEditor__LoadingScreen__.js` | 1.0.0 | vv-only | - | keep_vv_divergence | TV wording "Your Drawings Are Loading" + TV job lines (D-S03a-09) | - |
| `LE/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css` (tab strip region `:57-260`) | - | `LE/01__Core__Loader/Na__LayoutEditor__Styles__Boot__.css` | - | vv-only file, adapted | 10 menu rules; carries 6 dropped rename/add rules | port_adapted | menu rules go to Boot (strip draws before load) | TabStrip 2.0.0 |
| `03__AppUtils/Na__AppUtils__KeyScope__.js` | 1.1.0 | none | - | tv-only | whole module | port_verbatim | header names VV's handler and key files | - |
| `LE/31__System__DocumentKeys/Na__LayoutEditor__DocumentKeys__.js` + `Na__Hotkeys__DocumentTabs__.json` | 1.1.0 | none | - | tv-only | whole module and key map | port_verbatim (other slice may own; wiring here) | console prefix | KeyScope; register/statements to register actions |
| `10__NavigationAndCameras/Na__Hotkeys__Manager.js` | 2.1.0 | `03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js` | 1.0.0 | diverged (same lineage) | scope guard + contenteditable test (TV 2.1.0, v2.110) | port_adapted (guard only) | keep VV module, names and actions | KeyScope |
| `02__AppData/Na__Hotkeys__3dModelTab__.json` | - | `02__AppData/Na__ValeVision__HotkeysDictionary__.json` | - | diverged | file name; TV extra display/reference blocks | rename_move (D-S03a-03) | keep `Na__ValeVision__HotkeysDictionary` array key and `ValeVision__*` actions; update the fetch path in the handler `:116` **AND in the navigation help panel (`10__NavigationAndCameras/Na__UiFeature__NavigationHelpPanel__Controls.js:84`, verifier: a second runtime consumer the survey missed) and the index.html comments `:1261`, `:1776`**; consider moving the ten `DrawingMarkup__Contextual` documentation rows out of the dispatch array (S03a-V04) | - |
| `03__Style__AppStylesheets/Na__UiFeature__Styles__AppHeader__.css` (fold) | - | same | - | in parity (comments differ) | nothing | no_action | - | - |
| `03__Style__AppStylesheets/Na__UiFeature__Styles__LoadingOverlays__.css` (veil) | - | same | - | adapted | in-host veil (not used by VV) | keep_vv_divergence | - | - |
| `LE/50__Feature__Specification/Na__LayoutEditor__Styles__Specification__.css` (tab rules `:23-38`) | - | same (`:20-35`) | - | dead rule both sides | `.na-le-tabs__tab--spec` margin dead after 2.0.0 | backport_to_tv (delete) + delete in VV with the strip | - | TabStrip 2.0.0 |
| `TV/Index.html` `:901-904`, `:1717-1738` | - | `VV/index.html` `:1442`, `:2269-2283` | - | permanent divergence | TV imports editor + strip + Dev + share-open at start-up | keep_vv_divergence | loader only; share-open via loader | D-S03a-02 |
| `TV/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css` `:161-174` | - | `VV/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css` `:91-92` | - | permanent divergence | 14 LE imports vs Boot only | update_wiring (mirror in STYLESHEETS) | order preserved | each feature |
| `80__Testing__PrototypeEnvironment/Na__Test__DrawingTabKeys__.test.mjs`, `Na__Test__DocumentKeys__.test.mjs`, `Na__Test__SheetPagingWalkExit__.test.mjs`, `Na__Test__AuthoringZoomMax__.test.mjs` | 1.0.0/1.1.0 | none | - | tv-only | four test files | port_test (adapted) | VV file names; VV handler instead of Hotkeys__Manager | their modules |

---

## (d) Wiring notes

### d.1 TV mode controller call site -> module -> what VV must add

All line numbers TV `LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js` unless stated. "VV has?"
is the result of the import/export walk against VV's tree (folder map applied).

| TV call site | Module (TV path) | VV has? | What VV must add |
|---|---|---|---|
| import `:288` `Na__LeCfg__ReloadKeyMap`; `RestartSheetKeys` `:611-617`, called `:694`, `:709` | `LE/03__Core__Config/Na__LayoutEditor__ConfigState__.js` (KeyMap 1.5.0) | no (export missing) | KeyMap 1.11.0 + barrel; RestartSheetKeys hunk |
| `:319` `Na__LePc__STEP_SHEET_EVENT` (`:1219`), `Na__LePc__TakeKeyboard` (`:616`) | `LE/10__Core__SheetSurface/Na__LayoutEditor__Controls__Pc__.js` | no (2 exports missing) | Pc controls from the SheetSurface slice; StepSheet `:810-819` + listener `:1219` |
| `:707` `SuspendThreeD({ returnToOrbit : true })` | `40__System__DrawingViewCore/Na__DrawView__Transitions__.js:171` (VV `42/...:114` takes no options) | **behaviour yes, option no** (verifier: VV's SuspendThreeD always exits Walk/Fly) | the one-line change in Enter lands WITH S02a's Transitions 1.1.0 opt-in, together with the same option in VV's floor plan (`43/...ModeController__.js:465`) and elevation (`46/...ModeController__.js:526`) entries (S03a-V03) |
| `:289` `Na__LeVeil__FirstOpen` (`:733-737`) | `LE/05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js` | no (by design) | VV seam: not called; loader screen + WaitForFirstDrawing jobs (WP-S03a-05) |
| `:389` KeyScope constants + `Follow` (`:1182`); reader `:653-656` | `03__AppUtils/Na__AppUtils__KeyScope__.js` | no | port KeyScope; hunk |
| `:390` `Na__LeDocKeys__Ready` (`:1193`), `Initialize` (`:1211`) | `LE/31__System__DocumentKeys/Na__LayoutEditor__DocumentKeys__.js` | no | port; hunk |
| `:327` `Na__LePanelGrid__Register` (`:529`); `:328` `Na__LeGrid__Attach/Detach` (`:574`, `:585`) | `LE/27__System__DrawingGrid/` | no | with the DrawingGrid port; STYLESHEETS `Styles__DrawingGrid__` after Main__Paper |
| `:329` `Na__LeAxes__Attach/Detach` (`:575`, `:586`) | `LE/33__System__DrawingAxes/` | no | with DrawingAxes; STYLESHEETS `Styles__DrawingAxes__` |
| (no MC call) | `LE/26__System__DraftMode/`, `LE/32__System__OrthoMode/` | no | wired by SheetTools/Toolbar/Viewport2d, not the MC; STYLESHEETS `Styles__DraftMode__` (DraftMode only) |
| `:349` `Na__LeOsnap__Clear` (`:774`) | `LE/28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Search__.js` (VV: `LE/30__System__SheetTools/Na__LayoutEditor__Snapping__.js`) | different path | keep VV import until ObjectSnap ports, then switch; STYLESHEETS `Styles__ObjectSnap__` |
| `:291` `Na__LePanelPatterns__Register` (`:552`); `:297` `Na__LeHatch__Ready` (`:1193`) | `LE/36__System__HatchPatternTools/` | no | with Hatch port (CSS self-links) |
| `:292-294` `Na__LePanelArea__Register` (`:553`), `Na__LeArea__Ready/Is` (`:1088`, `:1193`), `Na__LeAreaTable__Attach` (`:1208`); `'areas'` reason `:1003`, panel `'floor-areas'` `:1028`, `SectionForKind` `:1059` | `LE/59__Feature__FloorAreas/` | no | with FloorAreas port (CSS self-links); AccordionSections config value |
| `:295` `Na__LeImg__*` (`:578`, `:582`, `:1082`, `:1193`, `:1209`); `:341` `Na__LePanelImages__Register` (`:547`); `'images'` refresh `:1151` | `LE/54__Feature__SheetImages/` | no | with SheetImages; STYLESHEETS `Styles__SheetImages__` after Spec__Read |
| `:339-340` `Na__LePanelVec__Register` (`:546`), `Na__LeVec__Initialize` (`:1198`) | `LE/37__System__VectorTools/` | no | with VectorTools (CSS self-links) |
| `:333` `Na__LePanelScrapSpec__RegisterTab/Register` (`:522`, `:536`); left tab `:521` | `LE/58__Feature__ScrapbookSpecification/` + PanelHost hint support | no | with ScrapbookSpecification + PanelHost (40 slice) |
| `:343-344` `Na__LePanelSpComp__Register` (`:533`), `Na__LeSpComp__Ready` (`:1193`); `:315` `Na__LeModel__IsSitePlanViewport` (`:1076`) | `LE/40__Ui__Panels/Na__LayoutEditor__Panel__SitePlanComposites__.js`, `LE/25__System__RenderStyles/Na__LayoutEditor__SitePlanComposites__.js`, SheetModel | no | with the site plan port (21/25/40) |
| `:354` `Na__LeSpec__StartWatch/StopWatch` (`:710`, `:768`); `:355` `Na__LeSpecLock__Mount` (`:557`) | `LE/50__Feature__Specification/Na__LayoutEditor__SpecData__Lockstep__.js`, `...SpecLockstep__.js` | no | with Spec lockstep (VV transport: needs a local Flask route; 50 slice) |
| `:366` `Na__LeRegionGrip__Attach/Detach` (`:577`, `:583`) | `LE/50__Feature__Specification/Na__LayoutEditor__NoteRegions__Grips__.js` | no | with Note regions |
| `:358-360` `Na__LeRegEd__Mount/Show/Hide`, `Na__LeReg__Initialize`, `Na__LeRegEdit__Initialize` (`:502`, `:690`, `:765`, `:900`, `:932-936`, `:959`, `:1201-1202`); `'register-updated'` `:1142` | `LE/51__Feature__DrawingRegister/` | no | with the register port; `OpenRegister` `:928-939`; viewer `Na__LeVw__ShowRegister` (`:407`, `:934`, 80__Feature__WebViewer) |
| `:362-363` `Na__LeStmtPage__Mount/Show/Hide`, `Na__LeStmt__OPEN_EVENT/Initialize` (`:503-504`, `:691`, `:766`, `:901`, `:933`, `:966`, `:1230`) | `LE/52__Feature__StatementWriter/` | no | with the Statement Writer; `OpenStatements` `:957-969` |
| `:378` `Na__PhaseLib__CHANGED_EVENT` (`:1247-1251`); `:379` `Na__LeSource__Initialize` (`:1206`) | `26__System__ToggleModelElements/Na__ModelGroup__PhaseLibrary__.js`, `LE/20__System__Viewports/Na__LayoutEditor__ModelSource__.js` | no | only if D-S03a-10 brings design phases to VV |
| `:752-755`, `:1131-1138` viewer never SetSheet | `52__System__Layout__PublishedDocuments` + `LE/80__Feature__WebViewer` ShowDrawing published | no | with publishing (52/53/65); then WaitForFirstDrawing must skip the viewer |
| `:883-888` `EnterUnder` (Quiet `:444`, `:733`) | MC | no | hunk now (feature-independent) |
| `:928`, `:957` `options` (shared links) | `LE/66__Feature__DocumentSharing/` | no | with sharing; loader `?open=` path |
| `:1193` Ready chain (+Hatch, SpComp, Area, DocKeys, Img) | each feature | no | each feature package appends its Ready - all must resolve, never reject |
| exports `:1277-1278`, `:1284-1285` | MC | no | VIEW_REGISTER, VIEW_STATEMENT, OpenRegister, OpenStatements (loader copies + CheckNames) |

### d.2 Tab strip, loader and Dev menu

| Consumer | Needs | VV has? | Add |
|---|---|---|---|
| TV TabStrip 2.0.0 `:135-161` | `Na__LeModel__IsSitePlanSheet`; `Na__LeMode__VIEW_REGISTER/VIEW_STATEMENT/OpenRegister/OpenStatements` | no | through the loader facade (d.1 last row; b.7) |
| TV TabStrip menu CSS | 10 rules | no | Boot CSS |
| Loader `CheckNames` `:284-295` | new view names | no | add VIEW_REGISTER, VIEW_STATEMENT |
| Loader `WaitForFirstDrawing` contract | document views and viewer skip | no | ModeController seam + loader status lines |
| TV DevMenu `:76` `Na__LeSource__Resolve` | ModelSource | no | `ImportEditor` literal entry when ModelSource exists |
| `Na__LeLoad__AnnounceProjectLoad` `:307-311` | register/statements listening for `'loaded'` | n/a | verify the register/statement data modules start correctly from the replayed announcement |

### d.3 Keyboard wiring

| From | To | VV change |
|---|---|---|
| VV `03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js:91-101` | `03__AppUtils/Na__AppUtils__KeyScope__.js` | at the top of HandleKeyDown: `if (!Na__KeyScope__Is(Na__KeyScope__MODEL)) return;` and replace `IsInputFocused` with `Na__KeyScope__IsTypingTarget(document.activeElement)` |
| VV ModeController Initialize | KeyScope | `Na__KeyScope__Follow(Na__LeMode__KeyScope)` (TV `:1182`) |
| VV `LE/10__Core__SheetSurface/Na__LayoutEditor__Controls__Pc__.js`, `LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__Keyboard__.js` | KeyScope `ControlKeepsKey` | owned by SheetSurface / SheetTools slices (TV imports at `Controls__Pc__.js:127`, `SheetTools__Keyboard__.js:278`) |
| VV `LE/03__Core__Config/Na__LayoutEditor__ConfigState__KeyMap__.js:63` | key file URL | `./Na__Hotkeys__DrawingTabs__.json` |
| comments naming `Na__LayoutEditor__KeyMappings__` | - | update in `Controls__Pc__`, `Controls__TouchScreen__`, `Measurements__`, AppConfig descriptions (grep list) |
| VV index.html `:1775-1809` | dictionary path inside the handler `:116` | only if the 3D JSON is renamed (D-S03a-03) - **and** the help panel's own fetch (`Na__UiFeature__NavigationHelpPanel__Controls.js:84`) plus the index.html comments `:1261`, `:1776` (verifier) |
| VV `03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js:91-101` | documentation rows | skip a binding whose action has no registered callback BEFORE `preventDefault` (D, O, Delete and Escape are swallowed with a console warning today on every tab, S03a-V04) |

---

## (e) UI notes

1. **Five-tab strip with a Drawings menu** (TV 2.0.0) is the one shell UI difference a user sees first. In VV it
   must render before the editor loads, so the menu's rows come from the loader's raw `SheetViews` and its CSS
   from Boot. Arrow stepping onto Drawings opens a drawing, never the menu.
2. **Document tabs from the 3D view**: Specification, Document Register, Design Statements open their pages over
   a quietly opened first sheet; on VV's first use the loading screen covers only the module import, then lifts
   on the document page (WaitForFirstDrawing skip rule).
3. **Top bar fold**: already identical; verify by eye after the strip port (the strip's `top` transition is in
   AppHeader CSS in both apps, the menu hangs from the strip's bottom edge so it follows the fold).
   **[Verifier]** The menu does NOT follow the fold: it is fixed on the body and placed once when it opens (and again
   on scroll and resize, TV `TabStrip__.js` PlaceMenu). A menu opened during the 2 s fold sits up to 60 px low until
   it is shut. Identical in TV, so this is not a parity gap; WP-S03a-06's "hangs under the strip during the fold"
   acceptance line should read "after the fold".
4. **Loading wording**: "Your Drawings Are Loading" + the job lines (D-S03a-09).
5. **Left column tabs** (Document Preferences | Specification) and the hover hints on all four panel tabs arrive
   with ScrapbookSpecification (TV 1.20.0); they are part of the visible shell but owned by the 58/40 slices.
6. **Dev menu**: VV's Layout Editor section keeps its Layout Mode switch at the head (if D-S03a-01 keeps it);
   otherwise the section matches TV row for row.

---

## (f) Decisions needed

| Id | Question | Options | Recommendation |
|---|---|---|---|
| D-S03a-01 | Keep VV's per-project **Enable Layout Mode** switch (`LayoutEditor__DrawingsData__LayoutModeEnabled`, off by default; strip shown only when ON and a sheet exists, here and live)? | (a) keep as a VV-only gate; (b) retire it for exact parity (strip whenever a sheet exists, TV rule); (c) keep and back-port to TV | (a) Keep: it is a client-facing safety gate on a client app and costs TV nothing; revisit after publishing (52/53/65) lands, which gives TV's own "unpublished" safety. Record it as a permanent divergence in the ledger |
| D-S03a-02 | The lazy loader: keep in VV, back-port to TV, or drop? | (a) keep in VV only; (b) keep and back-port; (c) drop | (a) now, (b) offered: keep with the documented registration pattern (b.7); back-porting is TV's call, but it would make `01__Core__Loader` identical in both trees. Fix the ledger contradiction either way |
| D-S03a-03 | Hotkey file names in VV | (a) rename all three to TV's per-tab names (`Na__Hotkeys__3dModelTab__.json`, `Na__Hotkeys__DrawingTabs__.json`, `Na__Hotkeys__DocumentTabs__.json`); (b) rename only the two Layout Editor files | (a): the drawing-tab rename is required by the verbatim KeyMap unit and its test anyway; renaming the 3D file is one fetch path. Keep VV's array key and `ValeVision__*` action names |
| D-S03a-04 | Tab strip 2.0.0 before VV has a Drawing Register or Statement Writer | (a) port the strip only after both features; (b) port now with document tabs shown only for features present (loader feature-presence answer) | (b): the compact strip and the Drawings menu fix VV's scrolling pack now; Register / Design Statements tabs appear as those ports land, with no further strip edit |
| D-S03a-05 | PDF text: embed Open Sans (port `60__Feature__PdfExport/Na__LayoutEditor__PdfFonts__.js`, VV-hosted TTFs, Style FontFamily Open Sans first) or keep Helvetica | (a) adopt; (b) keep Helvetica | (a): VV's own decision D14 says Open Sans 300/400/600; host the three cuts under a VV asset folder, never the NA CDN |
| D-S03a-06 | Title block QR cell (TV "Project Portal" block) on VV drawings | (a) enable with a VV project link and Vale wording; (b) `QrCellEnabled: false` | (b) until Adam names VV's public project URL scheme (VV has `61__Feature__ShareProjectLink`); the keys still land so turning it on is a config change |
| D-S03a-07 | VV Drawing Register values: job phases (TV T01 Concept..T04 Site & Remedial), document code format, PDF.js location, register palette | per value | Port the block with VV values: Adam supplies Vale's phases; vendor PDF.js 3.11.174 under `VV/04__Lib__ThirdParty__VersionLocked/`; palette neutral ink/greys as TV's (they are not NA brand colours) unless Vale colours are wanted |
| D-S03a-08 | VV Statement Writer storage names and public stylesheet URL | - | `ValeVision__StatementDocs__.json`; stylesheet URL on VV's own public host; html2canvas 1.4.1 vendored |
| D-S03a-09 | Loading-screen wording | (a) TV "Your Drawings Are Loading" + TV job lines; (b) keep "Loading Layout Editor..." | (a) for an identical experience; keep VV's two pre-load lines ("Fetching the drawing tools", "Reading the drawing settings") before them |
| D-S03a-10 | Design phases (existing / proposed models: PhaseLibrary, ModelSource, the Dev bake's live-phase filter) in VV | (a) port; (b) permanent divergence | Adam decides (depends on whether Vale jobs have existing-vs-proposed models); default (b) with the config block landed inert |
| D-S03a-11 (verifier) | When a VV session's first Layout Editor entry is a document tab (Specification, later Register / Statements), should the first DRAWING tab opened afterwards get a loading cover, as TV's once-per-session first-open veil gives it? | (a) yes: the loader shows its screen on the first sheet view of a session whose editor was loaded for a document view, waiting on WaitForFirstDrawing; (b) no: VV's cover stays tied to the editor's first load | (a) for an identical experience; a loader-only change, no second overlay. Decide with D-S03a-09 |

---

## (g) Proposed work packages

Order: 01 -> 02 -> 03 -> 04 -> 05 -> 06; 07-09 run alongside features; 10-11 any time. HOT files are listed so the
planner can serialise: `LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json`, the six ConfigState files,
`LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js`, `LE/01__Core__Loader/Na__LayoutEditor__Loader__.js`
(especially `Na__LeLoad__STYLESHEETS`), `LE/01__Core__Loader/Na__LayoutEditor__Styles__Boot__.css`.

> **REFUTED by verifier - replaced by WP-S03a-V01 (Verification section).** As written it takes "the six
> ConfigState files" while KeyMap 1.11.0 lands later in WP-S03a-02. TV's barrel statically imports
> `ReloadKeyMap`, `GetCopyDragModifier`, `GetMoveAnchorModifier` and `IsCopyDragKey` from the KeyMap unit
> (`TV/.../Na__LayoutEditor__ConfigState__.js:236-253`); on VV's KeyMap 1.0.0 that fails module linking and the editor
> never loads. The barrel's four KeyMap names must land with KeyMap 1.11.0.

**WP-S03a-01 - Config foundation (L).** Take TV's AppConfig and the six ConfigState files; re-apply VV seams.
Pass 1 lands every ADDITIVE TV key, block, note and label (inert until features arrive), the TV doc-text, TV's
compact JSON formatting, the 1:200 scale, and TV's units with VV fallbacks; it withholds the behaviour-changing
values (title block Rows/DocumentId, AccordionSections, Style FontFamily, the 13 label rewordings) for the
packages that bring their features. Fix VV's duplicate `GetScaleSetup` keys by taking TV's unit. Do not copy
TV's Selection-block labels.
Acceptance: Python key-tree diff VV vs TV = only an allow-listed seam set (brand 16 + NA-path values + VV-only
labels + withheld values); every changed module parses (`node --check`); `Na__Verify__Exports__.mjs` and
`Na__Verify__ModuleGraph__.mjs` pass; in-app: an existing VV sheet opens and prints unchanged.
Tests: new `Na__Test__AppConfigParity__.test.mjs` (VV) encoding the allow-list; port the config half of
`Na__Test__AuthoringZoomMax__.test.mjs`.

**WP-S03a-02 - Drawing-tab key map (M).** Rename `Na__LayoutEditor__KeyMappings__.json` -> `Na__Hotkeys__DrawingTabs__.json`
with TV's content and port KeyMap unit 1.11.0 in the same change; update the unit URL and every comment naming the
old file. Acceptance: with the key file blocked (404), M, space and Ctrl+S still work (fallback parity); T still
selects Text on the sheet (no When context passed); Shift+T, C, A, K, F6-F9 do nothing harmful.
Tests: port `Na__Test__DrawingTabKeys__.test.mjs` (fallback-vs-file parity and ReloadKeyMap parts now; the
ControlKeepsKey and keyboard parts with WP-S03a-03 and the SheetTools slice).

> **REFUTED by verifier - replaced by WP-S03a-V03.** Its optional 3D-dictionary rename updates only the handler's
> fetch path; `10__NavigationAndCameras/Na__UiFeature__NavigationHelpPanel__Controls.js:84` fetches the same file and
> would lose every shortcut row. It also misses the dispatched documentation rows (S03a-V04) and the Page Up/Down
> interim until Controls__Pc answers Nav__PreviousSheet/NextSheet (S05a ordering note).

**WP-S03a-03 - Key scope and the 3D hotkeys (M).** Port `03__AppUtils/Na__AppUtils__KeyScope__.js`; guard VV's
HotkeyHandler by scope and contenteditable; ModeController hunk: KeyScope reader + Follow; rename the 3D
dictionary if D-S03a-03 (a). Acceptance: on a drawing tab T/R/V/B/Y/1-9/PageUp/PageDown leave the hidden camera,
Walk mode and the carousel untouched; on the 3D tab R still resets the view; a contenteditable on the 3D tab keeps
its letters. Tests: port `Na__Test__DocumentKeys__.test.mjs` (scope + 3D hotkeys sections, adapted to VV's
handler).

> **REFUTED by verifier - replaced by WP-S03a-V04.** Its Walk acceptance ("opening a drawing while walking leaves
> Walk") already passes on VV today, so it proves nothing; the option only matters with S02a's Transitions 1.1.0
> opt-in, which must also reach VV's floor plan and elevation entries (S03a-V03). It also omits the feature-independent
> "a viewport folds the markup group" rule of TV 1.21.0 (S03a-V02).

**WP-S03a-04 - Mode controller core realignment (L).** Feature-independent TV hunks: RestartSheetKeys (1.25.0),
StepSheet (1.23.0), `SuspendThreeD({ returnToOrbit : true })`, EnterUnder/Quiet (1.30.0), VIEW_REGISTER/VIEW_STATEMENT
constants and `OpenRegister/OpenStatements` that refuse cleanly while their features are absent, PreloadMetrics
returning its promise, Leave ordering, SectionForKind(kind, items) signature. Keep seams S1-S7 (b.5) and the
scene-broadcast listeners. Depends on WP-S03a-02, Pc controls (`STEP_SHEET_EVENT`, `TakeKeyboard`) from the
SheetSurface slice and Transitions `returnToOrbit` from the DrawingViewCore slice.
Acceptance: opening a drawing while walking leaves Walk; Page Up/Down turn drawings in tab order and stop at the
ends; returning from the specification restarts the sheet keyboard. Tests: port `Na__Test__SheetPagingWalkExit__.test.mjs`.

**WP-S03a-05 - Loader 1.2 and the first-open wait (M).** Facade additions (OpenRegister, OpenStatements,
IsSitePlanSheet, VIEW copies + CheckNames, feature presence), `WaitForFirstDrawing` contract (document views and
viewer resolve at once; otherwise the three TV jobs with their status lines via a VV `Na__LeVeil__FirstOpenJobs`),
LoadingScreen wording per D-S03a-09, loader header documenting the registration pattern (b.7), ledger fix for
the contradiction. Acceptance: first press of Specification from the 3D view lifts the screen on the spec page
without waiting for the sheet underneath; first drawing tab shows "Drawing the Views - n of m" then lifts when drawn.
Tests: new `Na__Test__LoaderFacade__.test.mjs` (names match the editor's real constants; pre-load answers from a
raw block; a document-view wait resolves immediately).

**WP-S03a-06 - Tab strip 2.0.0 (M).** Port TV's TabStrip through the loader (seams: facade imports, IsAvailable
visibility per D-S03a-01, immediate render, feature-gated document tabs per D-S03a-04, `CloseMenu` export); Boot
CSS gains the 10 menu rules and loses the 6 rename/add rules; AppConfig gets the TV tab labels and rewordings
(`SpecificationTab`, `TabsPreviousTitle`, `TabsNextTitle`, `NoSheets`); Dev menu `NoSheets` fallback follows.
Acceptance (TV v2.158.0 proof, replayed in VV): strip shows 3D Model | Drawings | Specification (+ document tabs as
present) from the 3D view; the menu lists every sheet in order with the open one marked and focused; Escape and an
outside press shut it; at 375 px the arrows step tabs and landing on Drawings opens a drawing; with no sheets the
strip hides (height 0, body class off). Depends on WP-S03a-05.

**WP-S03a-07 - Loader stylesheet registration (S, recurring).** Each feature package whose TV CSS is in TV's CSS
index adds its line to `Na__LeLoad__STYLESHEETS` in TV's order: DraftMode, DrawingGrid, ObjectSnap, DrawingAxes
after `Styles__Main__Paper__`; SheetImages, Share after `Styles__Specification__Read__`; WebViewer stays last.
Self-linking stylesheets need nothing. Acceptance: new `Na__Test__LoaderStylesheets__.test.mjs` reads TV's CSS
index LE region and asserts VV's list is the same sequence restricted to files that exist in VV.

**WP-S03a-08 - Dev menu alignment (S).** Keep VV 1.4.0; add TV 1.2.0's live-phase bake filter through the loader
when ModelSource exists (D-S03a-10); Layout Mode switch per D-S03a-01; port-note refresh.

**WP-S03a-09 - Document keyboard (S).** Port `LE/31__System__DocumentKeys/` and its key map; ModeController hunk
(Ready + Initialize); Register and Statement pages register their actions when they port. Acceptance: on the
Specification tab bare letters type; Ctrl+S reaches the editor save. Tests: the DocumentKeys sections of
`Na__Test__DocumentKeys__.test.mjs`.

**WP-S03a-10 - Port notes, ledger and TV back-ports (S, both apps).** VV: refresh port notes (b.11), ledger rows
(loader contradiction, verification harnesses, stale "whole Layout Editor", plan D22 text). TV (back-port): move
the three Selection-block labels into Labels; delete `.na-le-tabs__tab--spec` and the dead `SheetTabEditTitle`;
fix DevMenu `NoSheets` fallback; add the scene-broadcast panel refresh (ledger `:1231`); add the missing v2.155.0
ModeController log entry; correct TV port notes (ModeController, LoadingVeil, DevMenu).

> **REFUTED by verifier - replaced by WP-S03a-V02.** "Move" breaks VV's live legacy page layout (Image Export opens
> `35__System__PageLayoutSystem/Na__PageLayoutSystem__Layout__.html`, which loads jsPDF and the title block PNG by
> relative path), and its grep acceptance ("no module still references 35 for these three assets") cannot pass while 35
> exists. Copy instead.

**WP-S03a-11 - Library and asset placement (S).** Move VV jsPDF to `04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/`
(identical bytes modulo CRLF), vendor html2canvas 1.4.1 to `06__Vendor__Html2Canvas__v1.4.1/`, move the Classic scan
to `01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png`; update AppConfig paths,
ConfigState fallbacks, the import-map index and version-lock README. Acceptance: PDF export and Classic title
block render as before.

**WP-S03a-12 - Per-feature mode-controller hunks (template, M each).** Each feature slice's package must add exactly
its TV hunk from table d.1 (imports, Build registration in TV's order, Attach/Detach position, Ready entry,
Initialize call, change-reason routing, SectionForKind rule, Leave cleanup) and its STYLESHEETS line (WP-S03a-07).
Acceptance per hunk: `git diff --no-index -w` of the touched region against TV shows only VV seams.

---

## Appendix A - AppConfig label groups

TV-only labels (188), by feature: tab strip 8 (DrawingsTab, DrawingsTabTitle, DrawingsTabOpenTitle, RegisterTab,
RegisterTabTitle, StatementsTab, StatementsTabTitle, TabStripNote); site plan drawings and composites 22;
hatch and Patterns 24; floor areas 4; layer menu, reference layers and paste-layer messages 19; vector quality 5;
model source 9; overspill regions and leaderless notes 56; Measurements move/copy/array 12; draw/measure at scale and
round-up 9; plan doors 10; viewport frame off 3; save/draft messages 5; MenuShowInSpecification 1; SheetName 1.
Full names in `work_s03a/appcfg_deep.tsv` (state `TV-only`, path under `/LayoutEditor__Labels__Config`).

Label rewordings (13): TabLabelFormatNote, StatusTitle, SheetNameCodeTitle, NoSheets, TabsPreviousTitle,
TabsNextTitle, ToolMoveTitle, ToolSelectTitle, SpecificationTab, PdfMarginOverflow, MeasureIdleTitle,
MeasurePaperTitle, MeasureViewportTitle - each names a TV feature (register, auto-move, regions, retype) and should
change with that feature.

VV-only labels (8): LayoutModeLabel, LayoutModeHint, LayoutModeOffNote (D-S03a-01); MarginToggle,
MarginToggleTitle (Toolbar slice: TV removed the button); MeasureOffsetAgain, MeasureNoOffsetSide,
MeasureDimOffsetTitle (present in TV but misplaced - TV defect).

## Appendix B - Evidence commands

- `git diff --no-index -w --stat <vv> <tv>` for every pair in the table (CRLF-safe).
- AppConfig key-tree walk: `work_s03a/appcfg_deep.py` (writes appcfg_deep.tsv); classification `appcfg_classified.tsv`.
- Import/export walk of TV ModeController, TabStrip, DevMenu, LoadingVeil against VV: `work_s03a/mc_imports.py`,
  `work_s03a/other_imports.py` (folder map 40->42, 42->43, 45->46 applied).
- Key map comparison: `work_s03a/keymap_lists.py`; 3D dictionaries: `work_s03a/hotkeys3d.py`.
- jsPDF identity: `cmp <(tr -d '\r' < VV/...jspdf.umd.js) <(tr -d '\r' < TV/...jspdf.umd.js)` -> identical.

---

## Verification

Adversarial verification, 01-Oct-2026, against the same working trees (TV HEAD b2aa9151, VV HEAD 7b4e593a).
Read-only. Working files: `scratchpad/parity/verify_s03a/` (`appcfg.py` + `appcfg_rows.json` key-tree walk,
`mc_imp.py` import walk, `keymaps.py`, `exports.py`, `css_sel.py`, a pre-edit backup of this report).

### V.1 What was checked

- **Coverage.** Every in-scope file in both trees (`drift_all.tsv`, `tree_tv.tsv`, `tree_vv.tsv`): LE/01 (3, VV only),
  LE/03 (8 + 8), LE/05 (3 + 3), LE/70 (1 + 1), LE/31 (2, TV only), `03__AppUtils/Na__AppUtils__KeyScope__.js` (TV),
  `10__NavigationAndCameras/Na__Hotkeys__Manager.js` (TV), `03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js`
  (VV), both `02__AppData` 3D hotkey JSONs, the shell wiring in both index files and CSS indexes, and the two TV docs.
  All are accounted for in table (c) or a finding. The TV docs were re-read: `TrueVision__PLAN__DrawingMenus__.md` is
  S02a's (DevRowShell, DraftGuard, RowAccordion - covered there); `TrueVision__NOTES__LayoutEditorPerformance__.md` is an
  authoring-performance audit whose two items (normalise once per announcement, the Vector hold) are covered by
  S03b / S04a. It is not evidence for the loader (correction to S03a-F22).
- **All 16 critical and high findings were opened against the files** (F01, F02, F06, F07, F08, F13, F15, F17, F18,
  F22, F23, F24, F28, F29, F33, F42), plus 25 of the 31 medium and low ones.
- **Numbers re-derived independently:**
  - AppConfig: 356 key-level differences (288 TV-only, 59 value, 9 VV-only) and the 16 brand values.
  - The three misplaced TV labels (`TV AppConfig:367-369`; `GetLabel` reads only the Labels block, `ConfigState__.js:372-375`).
  - Drawing-tab key map: 59/36 keyboard bindings (69/46 across all binding lists, which is S05a's count - consistent)
    and 63/41 actions. `Tool__Trim` (When InContainer) sits at index 44, before `Tool__Text` at 55. TV's
    `MatchKeyBinding` skips every When binding when no context is passed.
  - Barrel: 56/47 exports (the nine TV-only names). Unit exports, versions and logs.
  - ModeController: import walk (31 missing or partial, same as the survey), Ready chain 11 v 6, about 25 TV line
    references.
  - Tab strip CSS: exactly 10 TV-only and 6 VV-only selectors; every shared body is identical.
  - Fold: the tokens, and a `git diff -w` of AppHeader (comments only in the fold region).
  - Sizes: LE size sums (289 JS / 7.8 MB v 139 / 3.2 MB) and VV v2.45.0's loader numbers.
  - Also: jsPDF identity; the ledger contradiction (1230 v 1244) and the stale rows; the 21 TV devlog versions the
    report cites all exist.

### V.2 Corrections made (each also returned as a schema correction)

1. **S03a-F15 - partly refuted.** VV already leaves Walk/Fly when a drawing opens. VV Transitions 1.0.0
   `SuspendThreeD()` always calls `Na__NavToolbar__SetOrbitMode()`, which runs the index.html `'return-to-orbit'`
   wrappers - the whole exit. TV's v2.112.0 fault was TV-only: `SetActiveMode('orbit')` only repaints. Corrected in the
   headline (b.1 item 2), b.4, the b.5 table and d.1. The RestartSheetKeys and StepSheet gaps stand. Severity high ->
   medium. What VV really lacks is the opt-in (S03a-V03, S02a WP-S02a-11).
2. **S03a-F30 - incomplete rename.** The VV 3D dictionary has a second runtime consumer, the navigation help panel
   (`Na__UiFeature__NavigationHelpPanel__Controls.js:84`). The index.html comments at `:1261` and `:1776` also name it.
3. **S03a-F34 - move -> copy.** 35__System__PageLayoutSystem is still live through Image Export
   (`30__System__ImageExport/Na__UiFeature__ImageExport__Controls.js:627` -> `Na__PageLayoutSystem__Layout__.html:40`).
4. **S03a-F07 evidence.** The VV ledger does NOT record the key-map fallback symptom; row 240 is about where the
   listeners register. The evidence is TV KeyMap 1.1.0 (drift noted) and 1.5.0 (fixed).
5. **S03a-F22 evidence.** Neither the NOTES file nor the v2.155.0 phone crashes is evidence about start-up weight.
6. **S03a-F03 / F09 counts.** The Project QR cell is 25 TitleBlock keys in TV: 16 settings and 9 notes, and
   `QrCellEnabled` is true in TV. SheetSetup reads 16 `qrCell*` fields, not 17.
7. **S03a-F10 count.** ToolSetup has 10 getters in both apps, not 12.
8. **S03a-F20.** VV left out the text-metrics job on purpose (v2.70.0, no PdfFonts). The specification job is the
   real gap. Added the "first drawing tab after a quiet document entry" difference (S03a-V05).
9. **S03a-F24.** `SheetViews` must carry `Sheet__DrawingType`. After load, VV's SheetModel has no
   `Na__LeModel__IsSitePlanSheet` until the site plan port, so the facade must answer false.
10. **S03a-F33.** The test ports carry dependencies:
    - `Na__Test__SheetPagingWalkExit__` has a check that "a bare SuspendThreeD() leaves Walk running". It fails on VV
      until S02a's Transitions 1.1.0 lands.
    - `Na__Test__DrawingTabKeys__` has ControlKeepsKey, SheetTools-keyboard and Controls__Pc sections that need the
      S05a and S03b ports.
11. **S03a-F38 / F02.** VV holds no Open Sans TTF. But it already loads the three cuts at run time for its screen
    font, from `www.noble-architecture.com/assets/AD04_...` (`VV/03__Style__AppStylesheets/Na__CoreUi__Styles__Fonts__.css`).
    So an NA host is already a VV runtime dependency (S10's D-S10-05 asks the same question).
12. **S03a-F06.** Sequencing rule: the barrel must never land ahead of the units whose names it imports (S03a-V01).
13. **Detail additions to S03a-F17, F29, F32, F35 and F36:**
    - F17: TV's own TabStrip PORT NOTE says "offer after Adam's sign-off", and v2.158.0 leaves label questions open.
    - F29: the Page Up/Down interim once the 3D keys are gated.
    - F32: the canvas-under-strip difference (D-S10-04).
    - F35: the VV Loader header still says "three stylesheets".
    - F36: ViewportSettings 1.4.1 is half of the scene-broadcast back-port, and TV `Index.html:1730` still comments
      "one tab per sheet".
14. **(e) UI note 3:** the Drawings menu does not follow the fold, because it is placed when it opens. This is
    identical in TV.

### V.3 Findings added

| Id | Severity | What |
|---|---|---|
| S03a-V01 | high | TV's barrel statically imports four KeyMap names and five TV-only getters. Landing it ahead of its units (WP-S03a-01 as written) fails module linking, and the editor never loads |
| S03a-V02 | low | Selecting a viewport folds the markup group (TV MC 1.21.0 `FOLD_GROUP`). This is feature-independent in VV, because `Na__LePanels__FocusSection(null)` already folds the group (VV `PanelHost__.js:474`) |
| S03a-V03 | medium | When Transitions becomes opt-in (S02a WP-S02a-11), VV's floor plan (`43/...ModeController__.js:465`) and elevation (`46/...ModeController__.js:526`) entries must pass `{ returnToOrbit : true }`, or they stop leaving Walk. The snapshot renderer (`.../SnapshotRenderer__.js:501`) stays bare |
| S03a-V04 | low | VV's 3D dictionary dispatches its ten `ValeVision__DrawingMarkup__Contextual` documentation rows. D, O, Delete and Escape are `preventDefault`ed with a "No callback" console warning on every press, on every tab. TV keeps its reference rows outside the dispatch array |
| S03a-V05 | low | TV's first-open veil still covers the first drawing tab after a quiet document-tab entry. VV's loader screen covers only the first editor load (decision D-S03a-11) |

### V.4 Work packages replaced

**WP-S03a-V01 - Config foundation, sequenced (L). Replaces WP-S03a-01.**
- AppConfig additive pass exactly as WP-01: compact formatting; every TV-only key, block, note and label; VV values
  for NA paths; the behaviour-changing values withheld; no Selection-block Measure labels.
- SheetSetup 1.9.0, ToolSetup 1.5.0 and EditorSetup 1.6.0, with VV fallbacks. Readers: port note only.
- The barrel at TV 1.29.0, EXCEPT its four KeyMap names (`ReloadKeyMap`, `GetCopyDragModifier`,
  `GetMoveAnchorModifier`, `IsCopyDragKey`). WP-S03a-02 adds those in the same change as KeyMap 1.11.0.
- `Pdf JsPdfScriptPath` and `ClassicScanAssets` stay on the 35 paths until WP-S03a-V02.
- Acceptance:
  - The key-tree diff shows the allow-list only.
  - `Na__Verify__Exports__.mjs` and `Na__Verify__ModuleGraph__.mjs` pass.
  - The editor loads through the loader with no link error in the console.
  - An existing VV sheet opens and prints unchanged.
  - `GetScaleSetup` returns each key once.

**WP-S03a-V02 - Library and asset placement by copy (S). Replaces WP-S03a-11.**
- Copy jsPDF to `04__Lib__ThirdParty__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js`.
- Vendor html2canvas 1.4.1 to `06__Vendor__Html2Canvas__v1.4.1/html2canvas.umd.js`.
- Copy the Classic scan to `01__AppAssets__ValeVision/06__AppAssets__TitleBlocks/TitleBlock__ClassicScan__A3__.png`.
- Point the Layout Editor's AppConfig and SheetSetup fallback at the copies. Update the import-map index and the
  version-lock README.
- Leave the 35 copies in place; D-S09-10 decides when 35 is retired.
- Acceptance:
  - The Layout Editor's PDF and Classic title block are unchanged, served from the new paths.
  - Image Export's page-layout tab still loads jsPDF and its title block, with no 404.
  - No Layout Editor module or LE config references 35.

**WP-S03a-V03 - Key scope and the 3D hotkey guard (M). Replaces WP-S03a-03.**
- Port KeyScope 1.1.0 verbatim; its header names VV's handler and key files.
- In VV's handler: test `Na__KeyScope__Is(Na__KeyScope__MODEL)` first; use `Na__KeyScope__IsTypingTarget`; skip a
  binding whose action has no registered callback before `preventDefault`.
- Mode controller: the `Na__LeMode__KeyScope` reader and `Na__KeyScope__Follow` in Initialize.
- If D-S03a-03 is (a): rename the 3D dictionary and update BOTH fetches (handler `:116`, help panel `:84`) and the
  index.html comments.
- Ship with, or just before, Controls__Pc's Nav__PreviousSheet/NextSheet (S03b/S05a). Once the 3D keys are gated,
  Page Up/Down on a drawing tab stop moving the hidden camera, and do nothing until that lands.
- Record the shared service-worker token step (D-S09-06).
- Acceptance: as WP-03, plus:
  - The help panel still lists every shortcut.
  - D, O and Escape on the 3D tab no longer log "No callback".

**WP-S03a-V04 - Mode controller core realignment (L). Replaces WP-S03a-04.**
- Everything in WP-04: RestartSheetKeys, StepSheet and its listener, EnterUnder/Quiet, VIEW_REGISTER/VIEW_STATEMENT,
  OpenRegister/OpenStatements refusing cleanly, PreloadMetrics returning its promise, the Leave ordering, and the
  two-argument SectionForKind/FocusPanelFor.
- Plus the viewport `FOLD_GROUP` rule (S03a-V02).
- `SuspendThreeD({ returnToOrbit : true })` lands with S02a's Transitions 1.1.0, together with the same option in VV's
  floor plan and elevation entries (S03a-V03).
- Acceptance:
  - Page Up/Down turn the drawings and stop at the ends.
  - Returning from the specification restarts the sheet keyboard.
  - Selecting a viewport folds Text, Dimensions, Shapes and Leaders.
  - Non-regression: opening a drawing, a plan or an elevation while walking still leaves Walk.
  - After Transitions 1.1.0: re-stamping a picture from the 3D tab while walking does not leave Walk.
  - `git diff -w` against TV shows only the listed seams and the hunks of features not yet ported.

Dependants re-point: WP-S03a-02 -> V01; WP-S03a-05 and WP-S03a-12 -> V04; WP-S03a-09 -> V03 and V04.

### V.5 Cross-slice overlaps the planner must resolve

- **Same files, three slices.** WP-S03a-02/V03/09, S05a (WP-S05a-01, -02, -05) and S09 (WP-S09-05) all propose the
  KeyScope leaf, the 3D-hotkey guard, the drawing-tab key-file rename and the DocumentKeys folder. Give each file one
  owner; S03a keeps the mode controller hunks.
- **Same decisions, several ids.** Ask Adam once for each group:
  - Layout Mode switch: D-S03a-01 = D-S09-03 = D-S10-02.
  - Loader: D-S03a-02 = D-S09-01.
  - Strip before the Register and Statements land: D-S03a-04 = D-S10-01.
  - Loading wording: D-S03a-09 = D-S10-03.
  - Open Sans host: D-S03a-05 ~ D-S10-05.
  - QR and sharing: D-S03a-06 ~ D-S09-08.
  - Design phases: D-S03a-10 = D-S09-07.

### V.6 Still unverified

- Nothing was run in a browser. The 3D-hotkey cross-talk, the loader waits, the documentation-row swallowing and the
  menu placement rest on code-path evidence.
- VV's `ScaleManager` with 1:200 (the survey's "believed safe") was not re-read.
- Whether TV's `Na__PubDoc__Styles__Main__.css` should be linked (TV does not link it) is S08's call.
- The AppConfig `...Note` / `...Description` wording differences were counted, not read one by one.
