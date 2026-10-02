# S06a - Layout Editor UI Panels and the Scrapbooks (TrueVision -> ValeVision parity)

Analysed 01-Oct-2026, read-only, against TV HEAD b2aa9151 (devlog top v2.172.0) and VV HEAD 7b4e593a (devlog top v2.71.0).

**Path shorthand used throughout**

- `LE/` = `02__Src__AppModules/51__System__LayoutEditor/` (the same relative path in both apps).
- `TV/` = `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode`
- `VV/` = `D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D`
- `WCP/` = `D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia`
- `NAAPPS/` = `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps`

**Method.** Every pair was compared with `git diff --no-index -w`. I extracted the headers, imports and exports of all 71 files with a script, resolved every TV-only import against VV (applying the 40->42 drawing-core folder map), and key-tree diffed the JSON configs. I enumerated each TV file's DEVELOPMENT LOG entries that are newer than VV's copy, and mapped each one to its TV release through the TV devlog. The working scripts and their outputs are in `scratchpad/parity/slices/S06a_work/` (`extract.py`, `deps.py`, `jsondiff.py`, `labels.py`).

**Verified 01-Oct-2026 by an adversarial pass.** All 57 findings were checked and none is refuted. The verifier's corrections are marked "Verifier" inline. Four findings (S06a-V01 to V04) and one decision (D-S06a-14) were added. WP-S06a-03, -04, -05, -08 and -10 are superseded by corrected versions ("-v") in the section "Verifier-added findings and corrected work packages". What was checked, and what still is not, is in "## Verification" at the end.

---------------------------------------------------------------------------------------------------

## (a) Scope

| Folder | TV files / lines | VV files / lines | State (drift_all) |
|---|---|---|---|
| `LE/40__Ui__Panels` | 13 / 7,449 | 12 / 5,562 | 12 drifted, 1 TV-only (`Panel__SitePlanComposites`) |
| `LE/55__Feature__Scrapbook` | 4 / 1,226 | 4 / 1,087 | 2 drifted, 2 "header-only" (see caveat) |
| `LE/56__Feature__ScrapbookCustom` | 5 / 1,393 | 5 / 1,406 | 2 drifted, 3 header-only |
| `LE/57__Feature__ScrapbookParametric` | 14 / 10,276 | 9 / 4,247 | 9 drifted, 5 TV-only |
| `LE/58__Feature__ScrapbookSpecification` | 5 / 2,220 | 0 | all TV-only |
| **Total** | **41 / 22,564** | **30 / 12,302** | 25 drifted, 5 header-only, 11 TV-only |
| App root `51__LayoutEditor__UserScrapbookContent/` | index + 3 items + 2 quarantined, **1 category folder on disk** | index (empty) + 5 category folders with `.gitkeep` | - |
| Scrapbook server blueprint | `NAAPPS/ProjectVision__TrueVisionScrapbook__Api__.py` (1.0.0) | `WCP/Server__ValeVisionScrapbook__Api__.py` (1.0.0) | logic identical, see b.8 |
| Tests in scope | 6 shared + about 25 TV-only that exercise these modules | 6 | see b.11 |

I also read, as wiring context (other slices own them), both apps' `LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js`, both `LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json`, VV's `LE/01__Core__Loader/Na__LayoutEditor__Loader__.js`, TV's `03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css`, `WCP/server.py` and `NAAPPS/ProjectVision__LocalServer__Main__.py`. Plan context came from `TV/TrueVision__PLAN__ScrapbookSystem__.md` (sections 1-17), the VV parity ledger (rows 57-106, 497-530, 1041-1246) and the TV devlog entries v2.39.0 to v2.166.0 that touch these files.

**Caveat on the shared reference.** `drift_all.tsv` marks `LE/55/Na__LayoutEditor__Scrapbook__.js` and `LE/55/Na__LayoutEditor__Scrapbook__Config__.json` as "header-only". Neither is.

- The `.js` file has a code seam at VV line 188 (`const type = 'architectural';`, replacing TV's `Na__LeModel__IsSitePlanSheet` test) and a console prefix at line 126.
- The config has entirely different content: VV ships an empty library.

The swarm must not treat "header-only" as safe to overwrite without reading the diff.

> **Verifier (01-Oct-2026): the misclassification is wider.** Two more files that `drift_all.tsv` calls "header-only" carry VV adaptations below the header:
> - `LE/56/Na__LayoutEditor__Panel__ScrapbookCustom__.js`: two fallback strings naming VV's server (VV `:263-264`).
> - `LE/56/Na__LayoutEditor__ScrapbookCustom__Config__.json`: `Library__ApiPath` is `/api/valevision/scrapbook` (VV `:19`), plus the `Meta__Saving` text and the `SaveNoServer` and `SaveRestart` labels (`:11, :50-51`). **Overwriting this config with TV's would point VV's saves at `/api/truevision/scrapbook`, a route Whitecardopedia's `server.py` does not have, so every save would fail (DIV-4).**
>
> The heuristic treats any difference inside the first ~120 lines as a header difference, so every JSON config shorter than 120 lines is "header-only" whatever changed in it.

---------------------------------------------------------------------------------------------------

## (b) Narrative findings by sub-system

### b.1 Folder and module naming - already aligned; one folder to create

- **The subfolder numbers in scope are the same in both apps:** `40__Ui__Panels`, `55__Feature__Scrapbook`, `56__Feature__ScrapbookCustom` and `57__Feature__ScrapbookParametric`. The app-root content folder `51__LayoutEditor__UserScrapbookContent` and its category names (`01__ScrapbookItems__General` ... `05__ScrapbookItems__GeneralNotes`, plus `00__Deleted__Quarantine`) also match. No folder in scope needs renumbering. VV must **create `LE/58__Feature__ScrapbookSpecification/`** at the same number.
- **File names, namespaces and exports match** for every shared file (`Na__LePanels`, `Na__LeToolbar`, `Na__LePanel*`, `Na__LeScrap*`, `Na__LeParam*`). The only per-app identity in code is the console prefix (`[ValeVision3D LayoutEditor]`), the header line and a few user-facing strings.
- **Server-side naming is VV's own and should stay so** (DIV-4):
  - The file is `WCP/Server__ValeVisionScrapbook__Api__.py`, with blueprint `valevision_scrapbook_api` and route prefix `/api/valevision/scrapbook`.
  - It is registered at `WCP/server.py:95-96`.
  - TV's equivalent is `NAAPPS/ProjectVision__TrueVisionScrapbook__Api__.py` with `truevision_scrapbook_api` under `/api/truevision/scrapbook`, registered at `NAAPPS/ProjectVision__LocalServer__Main__.py:67,234`.
- **Version numbering does NOT align, and this will confuse the swarm.** Files VV took whole from TV were restarted at 1.0.0:

  | VV file | VV says | It is TV's |
  |---|---|---|
  | `Scrapbook__` | 1.0.0 | 1.1.0 |
  | `Panel__Scrapbook__` | 1.0.0 | 1.2.0 |
  | the parametric engine | 1.0.0 | 1.2.0 |
  | `ViewportLink__` | 1.0.0 | 1.2.0 |
  | `Grips__` | 1.0.0 | 1.1.0 |
  | `LinkNoodle__` | 1.0.0 | 1.2.0 |
  | `Panel__ScrapbookParametric__` | 1.0.0 | 1.2.0 |

  - VV's `Toolbar__` log is out of order: it lists 1.9.0 (19-Sep), then 1.8.0 (17-Sep), then 1.9.0 and 1.8.0 again (14 and 13-Sep), so 1.8.0 and 1.9.0 each appear twice.
  - TV's `ViewportLink__` log also has two different "Version 1.3.0" entries (20-Sep ViewLevel, 21-Sep linkable).
  - Decision D-S06a-06 proposes that VV adopts TV's number on whole-file ports.

### b.2 Panel host and the column tabs (`LE/40/Na__LayoutEditor__PanelHost__.js`: TV 1.6.0, VV 1.4.0)

VV lacks:

- **1.2.0 `LinkedPairRow` / `ShowLink`** (TV v2.41.0): the padlocked pair, needed by the Dimensions panel's Ext. lines row. These are the only TV exports VV is missing.
- **1.5.0 tab hover text** (`spec.hint`, TV v2.91.0): `button.title = spec.hint || spec.title || spec.id`.
- **1.6.0 the Colour Palette** (TV v2.126.0): `Na__LePanels__Input('color', ...)` calls `Na__ColourPalette__Attach(input)` from the top-level `02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__.js`. The import is static, so VV cannot take this line until folder 54 exists in VV.
- **An unversioned SliderRow change.** Every slider gets a typable number box (`na-le-input--rangebox`) sharing its control name, and `ShowSlider` writes both. It is not logged in PanelHost's own devlog. VV's slider rows show only a "50%" reading.

The rest of the code is identical. VV's AdvancedToggle (its 1.1.0) is also in TV. **Action:** port whole, header only, with the palette line gated on folder 54 landing.

**The tab strip.**

- VV has right-column tabs (Properties, Scrapbook) since its v2.68.0.
- **TV also has LEFT-column tabs** ("Document Preferences" and "Specification", TV v2.91.0), registered by its ModeController (`TV LE/05/...ModeController__.js:521-522`). VV's left column has no tabs (`VV ModeController:410-420`).
- The Specification tab only exists with folder 58 (b.10).
- **Verifier correction: one left tab shows nothing.** PanelHost hides a column's tab strip until that column has two tabs (`strip.hidden = tabs.length < 2`, VV `PanelHost__.js:273`; same code in TV). If VV registers TV's left `'document'` tab before folder 58 exists, nothing changes on screen. The left tabs first appear when `Na__LePanelScrapSpec__RegisterTab()` adds the second one. So register `'document'` in the same change as LE/58 (WP-S06a-06). Registering it early is harmless, but nobody can see or test it.

### b.3 The toolbar (`LE/40/Na__LayoutEditor__Toolbar__.js`: TV 1.24.0, VV "1.9.0", about TV 1.12.0)

TV's strip (`TV Toolbar__.js:423ff`):

> name | Select, Move, Text, Leader, Dimension, Draw, Rectangle, **Circle, Arc, Floor Area**, Eyedropper | **Image** | **Snap + options arrow** | **Draft | Grid | Grid Snap | Ortho | Axes** | dropper hint, scope hint | Raster, **Vector** | Save Sheets, Download PDF, **Share**

VV's strip (`VV Toolbar__.js:257ff`):

> name | Select, Move, Text, Leader, Dimension, Draw, Rectangle, Eyedropper | Snap | **Notes** | hints | **Undo | Redo** | **Fit | 100%** | Raster | Save Sheets, Download PDF

What VV still has that TV removed:

- **Undo, Redo, Fit and the zoom readout** (TV 1.19.0, v2.124.0, "useless ... I need the space"). The keys stay. VV's own right-click menu already offers Zoom to fit (`VV LE/30/...SheetTools__ContextMenu__.js:101,217`), so removing them is safe in VV too.
- **The Notes toggle** (TV 1.17.0, 21-Sep; the release is not named in the TV devlog). VV's Margin Notes panel already has "Show notes margin" (`VV LE/50/...Panel__MarginNotes__.js:80`), so the toolbar button is a second switch for the same setting.
- **The listeners** on `Na__LeHist__CHANGED_EVENT` and `Na__LeSurface__ZOOM_EVENT`, and the import of the old snap module `LE/30__System__SheetTools/Na__LayoutEditor__Snapping__.js` (VV-only).

What VV lacks, each tied to a TV-only system:

| Missing | TV release | Depends on |
|---|---|---|
| Draft | v2.107.0 | `26__System__DraftMode` |
| Grid and Grid Snap | v2.114.0 | `27__System__DrawingGrid` |
| Ortho | v2.113.0 | `32__System__OrthoMode` |
| Axes | v2.131.0 | `33__System__DrawingAxes` |
| Snap split button and menu | v2.129.0 | `28__System__ObjectSnap` (`ObjectSnap__.js`, `__Menu__.js`) |
| Circle and Arc | v2.130.0 | `37__System__VectorTools` |
| Floor Area | v2.104.0, unversioned in the Toolbar log | `59__Feature__FloorAreas` (`TOOL_AREA` in SheetTools) |
| Image | v2.116.0 | `54__Feature__SheetImages` |
| Vector quality select | v2.136.0, unversioned | `20__System__Viewports/Na__LayoutEditor__VectorQuality__.js` |
| Share | 1.24.0, v2.166.0 | `66__Feature__DocumentSharing` |
| "specification not synced: out of step" toast | 1.23.0, v2.163.0 | spec lockstep |

The Select and Move tooltips also changed with TV v2.78.0 ("Select picks Move up").

> **Verifier correction: do not port those tooltips with the toolbar.**
> - TV's new wording (`Toolbar__.js:438-440`, TV `AppConfig__.json:877-878`) describes v2.78.0's automatic Move: `PickUpMove`, `PutDownMove` and `IsMoveAuto` in ToolState, `PicksUpMove` in HitResolution, and `AutoMoveKinds` in EditScope. VV has none of these: a grep of VVM LE for those names finds nothing. The behaviour belongs to the SheetTools slice (S05a).
> - VV's `AppConfig__.json:661-662` still holds the old wording, and `Na__LeCfg__GetLabel` prefers a config value over the code fallback. So changing the toolbar's fallbacks would change nothing on screen. Changing the config would tell Vale users that Select picks up Move when it does not.
> - Change the fallbacks and VV's `ToolSelectTitle` and `ToolMoveTitle` config values together, in the same change as S05a's v2.78.0 port (S06a-V02).
>
> **Verifier note on read-only safety.** Removing Fit and 100% is safe for read-only viewers as well:
> - VV's context menu offers Zoom to fit when the sheet is not editable (`SheetTools__ContextMenu__.js:193`).
> - The web viewer has its own Fit button (`80__Feature__WebViewer/...WebViewer__.js:272`).
> - VV's key map binds `Nav__ZoomFit` and `Nav__ZoomActualSize` (`Na__LayoutEditor__KeyMappings__.json:118,130`; handled in `Controls__Pc__.js:183-184`).
> - Nothing else in VV reads `data-na-toolbar`.
>
> **Verifier note on the Notes removal.** TV also deleted `LayoutEditor__Labels__MarginToggle` and `MarginToggleTitle` from its AppConfig, and reworded `LayoutEditor__MarginNotes__Description` (TV `:539`). VV still has both keys and the sentence "Switched on per sheet with the Notes button on the toolbar or in the Margin Notes panel" (VV `:428`). WP-S06b-11 scopes the same removal; fold it into WP-S06a-03v (S06a-V03).
>
> **Verifier note on the lockstep toast.** The 1.23.0 toast reads `spec.conflict` from `Na__LeSpec__GetState()`; it imports nothing new. In VV the field is undefined, so the toast never fires. It is a runtime dependency on the specification lockstep, not a link-time one.

**Action: two phases.**

1. Phase 1 (WP-S06a-03) is subtractive and has no dependencies: remove the five buttons and their listeners.
2. Phase 2 (WP-S06a-10) is a whole-file port of TV 1.24.0, done after the dependent systems exist in VV, with explicit seams for any feature Adam declines.

### b.4 Property panels (right column, Properties tab)

**Text** (`Panel__Text__`: TV 1.4.0, VV 1.4.0) - **a VV defect under an equal version number.**

- VV's 1.4.0 log claims the TV v2.57.0 port: "the panel reads the first text item and writes all of them".
- VV defines `Na__LePanelText__Many()` (`VV Panel__Text__.js:121`), but `Refresh` (`:157`) never calls it. It reads only `Selected()` and falls back to the new-text defaults.
- With several text items selected, the size, weight and colour boxes show the defaults, not the selection, while a change still goes to all of them through `ApplyToSelection`. The note uses the old wording ("Click one text item on its own to edit it").
- TV's Refresh uses `reading = selected || many` and adds a `TextNoneOfKindNote` branch.
- **Action:** take TV's file whole (the rest is identical).

**Stale multi-select labels in BOTH AppConfigs** (TV `LE/03/...AppConfig__.json:852-854`, VV `:648,649,652`).

- `LayoutEditor__Labels__TextManyNote`, `DimManyNote` and `ShapeManyNote` still say "{count} items selected. Click one ... on its own to edit it; these settings apply to new ...".
- That is pre-v2.57.0 behaviour. `Na__LeCfg__GetLabel` prefers the config value over the code's fallback (`TV ConfigState__.js:372-375`), so **both apps tell the user the opposite of what the panel does.**
- Leaders has no config key, so the correct fallback shows.
- **Action:** replace the three values with the code fallbacks ("Editing {count} selected ...: a change here goes to all of them.") and add the `*NoneOfKindNote` keys, in both apps (VV fix plus back-port to TV).
- **Verifier refinement.** Neither AppConfig has any `*NoneOfKindNote` key (grep finds 0 in TV and 0 in VV); both apps run on the code fallbacks. Adding them is optional. The smallest identical fix in both apps is to **delete** the three stale `*ManyNote` keys, so the correct fallbacks show, or to overwrite them with the fallback text. Only VV's `Panel__Text` also needs the code fix (S06a-F08); VV's Dimensions, Vectors and Leaders panels already read `selected || many` (VV `Panel__Dimensions__.js:151-152`, `Panel__Shapes__.js:244-245`, `Panel__Leaders__.js:321`).

**Leaders** (TV 1.2.0, VV 1.2.0). Code is identical. TV has two extra comment blocks and a 1.1.0 log entry (spec note row, v2.36.0) whose code VV already has. **Action:** header and comment sync only.

**Dimensions** (TV 1.7.0, VV 1.4.0). VV holds TV 1.1.0, 1.4.0 and 1.5.0 (as its 1.1.0, 1.2.0 and 1.4.0) and lacks:

- **1.2.0 Measure at scale** (v2.40.0).
- **1.3.0 Ext. lines** (v2.41.0, the padlocked pair).
- **1.6.0 Round up to 5 mm** (v2.139.0; `15__Core__Markup/Na__LayoutEditor__DimensionRounding__.js`, TV-only).
- **1.7.0 Line pt and Dashed lines** (v2.152.0; needs `Dimension__LinePt`, `Dimension__LineStyle`, `Na__LeMarkup__SheetDimensionPt` and the `LineStyleTool` 'dim' prefix).

The VV ledger records two of these as **deliberately skipped**: "Vectors/Dimensions panel `atScale` rows: skipped - hardcoded `atScale: true`" and "Extension-line panel rows: skipped" (ledger lines 505-524). VV's Measurements box already reads `getShapeDefaults().atScale` and `getDimensionDefaults().atScale` (`VV LE/30/...Measurements__.js:346,404,429`). So the panel rows only need VV's ToolState to stop hard-coding `true` (`VV LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__ToolState__.js:153,162`), and `CreateDimension` to store `Dimension__AtScale`.

> **Verifier additions.**
> - TV's ToolState reads `s.defaultAtScale` from the Dimension and Shape setups (TV `ToolState__.js:219,232`). Un-hardcoding means adding that config key and reading it, not just deleting `true`.
> - VV's AppConfig `LayoutEditor__Measurements__Description` (VV `:457`) ends "The Vectors/Dimensions panel toggle rows are not here: atScale is hardcoded true so DrawingScale works". WP-S06a-07 must reword it when the rows arrive.
> - At link time, TV `Panel__Dimensions__` 1.7.0 needs only `Na__LeMarkup__SheetDimensionPt` and PanelHost's `LinkedPairRow`/`ShowLink`. `DimensionRounding__` and the record fields are needed for the rows to do anything, not for the editor to load.

**Vectors** (`Panel__Shapes__`: TV 1.9.0, VV 1.8.0). VV lacks:

- **1.6.0 Draw at scale** (v2.40.0, deliberately skipped; see above).
- **The hatch block** (v2.90.0, unversioned in the panel log) **and its line pt and colour** (1.9.0, v2.126.0). These need `LE/36__System__HatchPatternTools/` (TV-only), `Shape__Hatch` in SheetRecords and `TV/52__LayoutEditor__HatchPatternLibrary/`.
- **1.8.1 Edges off with several selected no longer recolours every fill** (v2.106.0). This is a real data-damaging bug in VV today: selecting coloured rooms plus a line and unticking Edges paints them all in the new-shape default fill. The fix is a three-line guard in the panel.
- **1.8.2 Pictures excluded** (v2.116.0). A no-op without Sheet Images, so it is safe to port now.

### b.5 Document Preferences panels (left column)

**Sheet** (`Panel__Sheet__`: TV 1.4.0, VV 1.4.0 - same number, different content).

- TV has a Drawing Type row (1.2.0, v2.48.0; site plans), Name and Revision edits routed through `51__Feature__DrawingRegister/Na__LayoutEditor__Register__Transactions__.js` (`Na__LeRegEdit__Metadata`), and hides the `DocumentId` row because the register owns the number.
- VV deliberately keeps Drawing No. editable because it has no register (VV log 1.2.0). VV's 1.3.0 Common switch is TV v2.74.0 code that both apps hold.
- TV also has an Enter-blurs-field keydown on `sheet-name` and `sheet-field` (v2.115.0 keyboard-focus work).
- **Action:** keep VV divergence (no register, no site plans); port the Enter keydown; revisit if the Drawing Register is ported.

**Layers** (`Panel__Layers__`: TV 1.3.0, VV 1.1.0). VV lacks:

- **1.1.1** the "Images" type label (v2.116.0) and the "Floor Areas" (`area`) label (v2.104.0, unversioned).
- **1.2.0 the Ref switch** (v2.123.0, Blender's Selectable). This needs the reference-layer feature, which spans 17 TV modules: `Layer__Selectable`, `Na__LeModel__IsLayerSelectable`, HitResolution, SelectionBox, ObjectSnap sources, ItemClipboard, the LayerMenu and others. VV has none of them.
- **1.3.0 one red for Off, Unlock and Ref** (v2.154.0). The Off and Unlock parts are pure UI and can port now.

**Render Composites** (`Panel__Styles__`: TV 1.7.0, VV 1.6.1). VV lacks 1.7.0, the `percent` weight kind and its hint (v2.93.0, Enhance Whitecard strength). It is harmless to port verbatim. It only matters once the render-styles slice brings the percent weight in.

**Model Layers** (`Panel__ModelLayers__`: TV 1.3.0, VV 1.1.0). VV lacks:

- 1.2.0, rows from the viewport's design phase (`Na__LeSource__CategoryKeys`, Model Source, v2.32.0).
- 1.3.0, site plan layer rows (v2.49.0).
- Two unversioned columns, Fill and Line scale, both site-plan-only (`Na__LeEdge__FillHex`; EdgeStyles says "Only a site plan layer carries one [dashScale]").

VV has one model per project and no site plans, so this is a **permanent divergence** unless D-S06a-01 or D-S06a-02 change that.

**Site Plan Composites** (`Panel__SitePlanComposites__`: TV-only 1.0.0). Its own port note reads "goes to ValeVision3D with the site plan feature, if that is ever ported". Keep it absent in VV.

### b.6 Viewport panel (`Panel__ViewportSettings__`: TV 1.10.0, VV 1.4.1)

VV lacks:

| TV version | Feature | TV release | Status for VV |
|---|---|---|---|
| 1.3.0 | Model Source | v2.32.0 | permanent divergence |
| 1.4.0 | Frame (`Viewport__ShowFrame`) | v2.38.0 | universal; the ledger notes VV's `BuildFrame` has no ShowFrame guard |
| 1.5.0 | Doors | v2.42.0 | `LE/20/Na__LayoutEditor__PlanDoors__.js`, TV-only; needs a VV door contract first |
| 1.6.0 | site plans | v2.49.0 | permanent divergence |
| 1.8.0 | Rotation deg | v2.138.0 | `LE/20/Na__LayoutEditor__ViewportRotation__.js`, a pure leaf with no imports |
| 1.9.0 | Hide swings, and 1:200 from the config | v2.140.0 | needs PlanDoors and the floor plan storey (`Na__FpData__GetStoreyLevel`) |
| 1.10.0 | a viewport added inside an open group joins it | v2.142.0 | `Na__LeScope__WithAdoption`, Groups 1.4.0 |

VV-only and **must be kept**: its 1.4.1 fix (VV v2.45.1). The Add Viewport scene list is rebuilt on every refresh (`VV Panel__ViewportSettings__.js:308-313`), and VV's ModeController refreshes the panel on scene broadcasts (`VV ModeController:866-867`, its 1.15.1). TV still has the one-time fill (`TV Panel__ViewportSettings__.js:647`, `addSelect.options.length <= 1`) and no scene-broadcast refresh. This is an **open back-port to TV** (ledger line 1231).

**Action:** `port_whole_reapply_vv` once the dependencies exist, re-applying VV's 1.4.1 hunk and excluding Model Source and site plans, either by the drawing-type shim (D-S06a-02) or by a VV seam.

> **Verifier correction: a byte-for-byte copy would break the editor link.** TV's file imports two top-level drawing folders under TV's numbers:
> - `:206` `../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js`. In VV this is `42__System__DrawingViewCore`; VV's `40__` is the legacy `40__System__2dElevationsView`.
> - `:207` `../../42__System__FloorPlanViews/Na__FloorPlan__ProjectJson__Data__.js`. In VV this is `43__System__FloorPlanViews`; VV's `42__` is DrawingViewCore.
>
> The port must rewrite both specifiers with the section 4.1 folder map (S06a-V01). `Na__FpData__GetStoreyLevel` must also exist in VV's `43__System__FloorPlanViews/Na__FloorPlan__ProjectJson__Data__.js`; today it does not (NAME-MISSING).

### b.7 Standard Scrapbook and the shared tile drag (`LE/55`)

- **`Scrapbook__.js`** (TV 1.1.0 = VV 1.0.0). Code is identical apart from the site-plan seam: TV asks `Na__LeModel__IsSitePlanSheet` and VV hard-codes `'architectural'` (VV line 188).
- **`Panel__Scrapbook__.js`** (TV 1.2.1, VV = TV 1.2.0). VV lacks the tab hover text (1.2.1, v2.91.0, needs PanelHost 1.5.0). It also has a seam: a config that cannot be read shows the section on every sheet, where TV shows it only on a site plan sheet.
- **`Scrapbook__Config__.json` is deliberately empty in VV.** TV's two items are a mapping data credentials block, carrying NA's Ordnance Survey licence number `100053143`, and a north point, both on `Item__DrawingTypes ['siteplan']`. They are NA site plan furniture (ledger row 78). This is a **permanent divergence**. Whether VV should have Vale house items is D-S06a-04.
  - *Verifier precision:* TV's config has **two pieces** (`MappingDataCredentials`, `NorthPoint`) and **three tiles** built from them: "Mapping Data Credentials and North Point", "Mapping Data Credentials" and "North Point" (TV config `:48-62`). All three are `Item__DrawingTypes ['siteplan']`, so even a copied config would never show them in VV, which has no site plan sheets.
- **`Scrapbook__TileDrag__.js`** (TV 1.2.0, VV = TV 1.0.0). VV lacks:
  - 1.1.0 `spec.caption` (v2.91.0, needed by the Specification Scrapbook's rows).
  - 1.2.0 `spec.hold` / `spec.snap` (v2.134.0, needed by the Cabinet Infill). This imports `Na__LeOsnap__Snap` and `Na__LeOsnap__HideMarker` from `LE/28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Search__.js` (TV-only folder) and `Na__LeSurface__PaperMmToClient`, which VV has.
  - VV's own `LE/30/Na__LayoutEditor__Snapping__.js` exports a call-compatible `Na__LeOsnap__Snap(sheet, pointMm, exclude, tone)` and `Na__LeOsnap__HideMarker()`. An interim one-line import seam is therefore possible if the ObjectSnap port lags.

### b.8 Custom Scrapbook, its server and its content folder (`LE/56`, server, app root)

- **Library, panel, config and CSS are verbatim except for strings.** The VV item document is TV's key for key, so item files are portable between the apps.
- **One unversioned TV hunk is missing in VV** (`ScrapbookCustom__.js`, TV v2.104.0, Floor Areas): a saved measured room keeps its name and drops `Area__Group` and `Area__ScaleDenominator`. It is guarded by `if (copy.Shape__Area ...)`, so it is a no-op in VV until Floor Areas lands. **Port verbatim.** TV should bump the file to 1.0.1 (hygiene).
- **The transport is a deliberate, correct VV adaptation (keep it).** VV probes `/api/check-localhost` (`{ isLocalhost: true }`) instead of `/api/health` plus a service name. It saves through `/api/valevision/scrapbook`, and treats Whitecardopedia's HTML-200 catch-all as "not JSON". This is DIV-4 and needs no change.
- **The servers are at parity.** `git diff -w` of the two blueprints differs only in the header and port note, the folder constants (`TRUEVISION_APP_DIR` vs `VALEVISION_APP_DIR = ../ValeVision3D`), the blueprint name, the three route decorators and the index description. Every rule (category pattern, file naming, quarantine, limits, allowed kinds) is the same. Both are registered (`WCP/server.py:95-96`, `NAAPPS/...LocalServer__Main__.py:67,234`).
- **Content folders.**
  - VV has five category folders, each with `.gitkeep`, and an empty index.
  - **TV has only `01__ScrapbookItems__General` on disk** (plus quarantine). TV's config lists all five categories (`TV LE/56/...Config__.json:22-27`), and the server never creates a folder, so **saving into Dimensions, Annotations, 2D Entourage or General Notes fails in TV today.** VV's ledger row 84 flagged this as a back-port; it is still open.
  - TV holds three items from RB05: "GFFL" (a level marker), "Leader Standards" and "Test". Seeding VV with the first two is D-S06a-05.
  - *Verifier addition:* each TV item names TV and NA's project. `UserScrapbookItem__Meta.Meta__Description` reads "A Custom Scrapbook item for the TrueVision 3D Layout Editor ... through the ProjectVision local server", and `UserScrapbookItem__SourceProject` is `RB05` (`SourceSheet` "Project Introduction" for Leader Standards). If D-S06a-05 is taken, reword the Meta description to VV's own wording (the text VV's `ScrapbookCustom__.js` writes) and decide whether `SourceProject` stays as provenance or is cleared. The server's next read rebuilds VV's index from the folder.
- VV's two scrapbook Python tests set `sys.dont_write_bytecode` (VV `Na__Test__ScrapbookApi__.test.py:49`, `Na__Test__ScrapbookServer__.py:61`). TV's do not. The ledger's back-port candidate (row 85) is still open.
  - *Verifier addition:* the back-port matters in TV too. The NaWeb repository tracks `na-apps/__pycache__/ProjectVision__TrueVisionScrapbook__Api__.cpython-312.pyc` and the other ProjectVision API `.pyc` files (17 tracked `__pycache__` files in total), and TV's `Na__Test__ScrapbookApi__.test.py` imports that module straight from `na-apps`.

### b.9 Parametric Scrapbook (`LE/57`) - the largest gap

**Engine** (`ScrapbookParametric__.js`: TV 1.7.0, VV = TV 1.2.0). TV's own port note lists 1.3.0-1.7.0 as "TrueVision only". VV lacks:

| TV version | What | TV release |
|---|---|---|
| 1.3.0 | slide point | v2.96.0 |
| 1.4.0 | `choices`, `linkable:false`, `qr` in ShapePatch | v2.100.0 |
| 1.5.0 | `Refit` | v2.122.0 |
| 1.6.0 | `adopt` | v2.128.0 |
| 1.7.0 | `BasePoint`, `Insert {at:'base'}`, `Regenerate options.origin` | v2.134.0 |

- VV is missing the exports `Na__LeParam__BasePoint`, `IsLinkable` and `Refit`.
- Every VV-side line in the diff is older TV code. The only VV seams are the header, the console prefix and `const type = 'architectural'` (VV line 240).
- VV's `Na__LeModel__UpdateShape` ignores an unknown `qr` key, so the 1.4.0 ShapePatch is harmless in VV.

**Types.**

| Type | TV version | VV version | Universal? | Notes |
|---|---|---|---|---|
| ScaleBar | 1.1.0 | 1.0.0 | universal | `PaperMm` (v2.96.0); fill `#666666`->`#858585` (v2.96.0, a config value) |
| DrawingTitle | 1.3.0 | 1.0.0 | universal | ViewLevel fact (1.1.0, v2.87.0; inert without VV storey levels); bar to the right (1.2.0, v2.96.0); underline 5 mm past the words, `Misfits` and `refit` (1.3.0, v2.122.0) |
| CabinetInfill | 1.2.0 | none | **universal** | measured from NA's LayOut sheets, but a generic plan convention; words Storage, Services, Full Height Storage, Wardrobes, Pantry Unit, Shelving |
| AreaSchedule | 1.1.0 | none | universal, but needs `59__Feature__FloorAreas` | its numbers are filled by FloorAreas' before-announce hook (TV port note: "goes with the rest of Floor Areas") |
| ProjectQr | 1.3.0 | none | **NA-specific** | needs `53__Feature__ProjectQrCode` (link base `https://www.noble-architecture.com/q/?<code>`), `Shape__Qr` in records, ShapeGeometry `PushQr`, PdfExporter `'qr'`; the copy is generic ("Project Portal") but the concept is NA's Project Hub -> D-S06a-03 |
| SiteLegend + SiteLegendLink | 1.0.0 | none | site plan only | `Element__DrawingTypes ['siteplan']`; reads `Na__LeVp2d__SitePlanLegend` and the site plan store -> permanent divergence |

**Helpers.**

- **ViewportLink** (TV 1.5.1, VV = TV 1.2.0). VV lacks:
  - ViewLevel facts and `linkable` (both numbered 1.3.0).
  - **1.4.0 Refit, and the `FactsPatch` normalise fix** (v2.122.0). Without it, a viewport name with odd spacing rebuilds the title on every refresh, which costs an undo step and a dirty sheet on every visit. This is a real bug.
  - 1.5.0 Ref-layer exclusion (needs `Na__LeModel__IsLayerSelectable`).
  - 1.5.1 rotated frames (needs `Na__LeVpRot__DistanceTo`).
- **Grips** (TV 1.6.0, VV = TV 1.1.0). VV lacks the slide (1.2.0), choices and stretch words (1.3.0), `{grid:false}` (1.4.0), the corner grip and the Options title (1.5.0), and the base and corner grips (1.6.0). It imports ObjectSnap Search and SheetSurface `GetElements`, `GetPixelsPerMm` and `GetZoom` (VV has these three).
  - *Verifier addition:* Grips 1.6.0 also imports `Na__LeParamTitle__PLACE_BELOW` and `PLACE_RIGHT` from DrawingTitle (added in DrawingTitle 1.2.0). Port DrawingTitle 1.2.0 or later before, or with, Grips, or the editor fails to link.
  - *Verifier check of the interim snap seam:* VV `Snapping__.js:376` `Snap(sheet, pointMm, exclude, tone)` returns `{ x, y, snapped, kind }`, which is all TileDrag and Grips read. Grips passes `{ grid : false }` as the fourth argument; VV treats an unknown tone as the vertex tone (`:409`), so the seam is call-compatible. **But WP-S04b-09 deletes `Snapping__.js`**, and its acceptance is that a grep for `Snapping__` finds nothing. Either schedule WP-S06a-05v after WP-S04b-06 so no seam is needed, or make WP-S04b-09 repoint the TileDrag and Grips seams to `28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Search__.js` in the same change (S06a-V04).
- **LinkNoodle** (TV 1.2.2, VV = TV 1.2.0). VV lacks 1.2.1, reading every chrome SVG (v2.106.0). That is harmless now and required once VV adopts PaintOrder stacking. It also lacks 1.2.2, rotated frames (needs `Na__LeVpRot__Bounds`).
- **CSS** (TV 1.3.0, VV = TV 1.0.0). VV lacks the slide, reversed-stretch and guide rules (1.1.0), the corner grip (1.2.0) and the base and corner grips (1.3.0). It is pure CSS and the panel links it itself (`link.href = new URL('./...Styles__ScrapbookParametric__.css', import.meta.url)`).
- **Config.** 485 TV-only keys, broken down below. VV's wording adaptations (no phase, no site plans) must be re-applied.

  | Block | TV-only keys |
  |---|---|
  | AreaSchedule | 56 |
  | CabinetInfill | 36 |
  | DrawingTitle (bar to the right, underline-past-text) | 13 |
  | Elements (eight tiles) | 164 key paths |
  | Grips | 4 |
  | Labels | 99 |
  | ProjectQr | 72 |
  | SiteLegend | 38 |

  The tiles: TV ships 11 (Title + Bar, Title + Bar to the Right, Title, Scale Bar, Portal Compact, Portal Full, three Area Schedules, Cabinet Infill, Site Legend). VV ships 3.

**The panel is the hard part** (`Panel__ScrapbookParametric__.js`: TV 1.8.0 at 1,346 lines, VV = TV 1.2.0 at 561 lines).

TV's panel is the subsystem's one entry point and **statically imports every type and every dependency**:

| Import | Source |
|---|---|
| AreaSchedule, CabinetInfill, ProjectQr, SiteLegend, SiteLegendLink | `LE/57` (TV-only) |
| `Na__LeHatch__Ready`, `TileMarks` | `LE/36` (TV-only) |
| `Na__QrLink__CurrentProject` | `LE/53` (TV-only) |
| `Na__CfApi__GetLoadedProjectData` | `02__Src__AppModules/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js`, **TV's worker client, which VV must never import (DIV-4)** |
| `Na__LePdfFonts__EnsureLoaded` | TV-only `LE/60/Na__LayoutEditor__PdfFonts__.js` |
| `Na__LeViewText__SOURCE_LEVEL`, `SOURCE_NAME` | TitleText 1.1.0 (VV has 1.0.0) |

It also reads `window.TrueVision__Pwa__ProjectContext` for the project name (`TV Panel__ScrapbookParametric__.js:289-298`).

**Because ESM imports are static, VV cannot take this file whole until every one of those exists. A single missing export stops the whole editor from linking.**

Options are in D-S06a-07. The recommended fix is a small TV refactor: move type registration, the tools object and the project-name resolver into a per-app "types" module, so the panel itself becomes verbatim. Until then VV needs an adapted panel:

- Register only ScaleBar, DrawingTitle and CabinetInfill, plus AreaSchedule once Floor Areas lands.
- Gate metrics on `Na__LePdf__EnsureJsPdf()` alone.
- Resolve the project name from `Na__PresentationMode__ProjectJson__GetActiveConfig()` (`projectName` / `displayName`, see VV `LE/07/...ProjectRecord__.js:20-45`) plus `Na__DrawData__GetProjectCode()`, if and only if ProjectQr is adopted.
- *Verifier addition, import path:* TV's panel imports `Na__DrawData__GetProjectCode` from `../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js` (TV `:199`). VV's path is `../../42__System__DrawingViewCore/...`; VV's `40__` folder is the legacy 2D elevations view. Any copy of TV's panel must rewrite the folder number (S06a-V01).
- *Verifier caveat on "metrics = EnsureJsPdf only":* TV's `AwaitMetrics` (TV `:398-413`) deliberately leaves `metricsReady` false when Open Sans fails to load, so that nothing is refit to Helvetica. The VV interim does the opposite: every title is refit to Helvetica widths once jsPDF loads. That is better than today's estimate-built titles. But when PdfFonts (D-S06a-13) lands, every title will refit once more, with one undo step and one dirty sheet per sheet on its first visit. Record this in the panel's PORT NOTE, and tell Adam before PdfFonts ships.

**Text metrics divergence.** VV's chrome measures text with jsPDF Helvetica (`VV LE/10/...SheetChrome__.js:174-186`), but its paper shows Open Sans (`VV ...Styles__Main__Paper__.css:276,399`). TV embeds Open Sans through `PdfFonts`. The following are all measured through `tools.measureTextMm`, so in VV they are measured against the wrong face:

- the DrawingTitle "5 mm past the words" rule;
- the Cabinet Infill label box;
- the Area Schedule and legend column widths.

Porting `PdfFonts` (PDF slice) is a prerequisite for those to match TV to the millimetre (D-S06a-13).

### b.10 Specification Scrapbook (`LE/58`, TV-only)

There are five files: `ScrapbookSpecification__` 1.0.1, `Panel__ScrapbookSpecification__` 1.2.0, `ScrapbookSpecification__RowEditor__` 1.1.0, `__Config__.json` (Meta 1.2.0) and `Styles__ScrapbookSpecification__.css` 1.2.0.

- **What it is.** A left-column Specification tab with one row per note: the code in a bubble, the title and the text, a filter, Show full notes and an on-sheet count. Dragging a row drops a linked specification bubble.
- **Inline editing** (v2.144.0): right-click or F2, spell-checked.
- **Locate:** a bubble's "Show in Specification" centres its row and pulses a halo.
- TV's port note: "Nothing here is app-specific", except the RowEditor's local-file write.

Dependencies, resolved against VV:

| Need | Provided by | In VV? |
|---|---|---|
| tab hint | PanelHost 1.5.0 | no |
| `spec.caption` | TileDrag 1.1.0 | no |
| `Na__LeSpec__LOCATE_EVENT` | SpecData State 1.1.0+ (TV 1.2.0) | **missing** |
| `Na__LeSpec__WriteLocalCopy` | SpecData Transport 1.2.0+ (TV 1.3.0) | **missing**; VV 1.1.0 |
| `Na__SpellCheck__Field`, `WordBar` | top-level `55__Feature__SpellCheck` (TV-only) | missing |
| the practice dictionary | `TV/50__TrueVision__UserConfig/TrueVision__UserSpellings__.json` through `NAAPPS/ProjectVision__TrueVisionUserConfig__Api__.py` | missing |
| `Na__LeVpRot__DistanceTo`, `Centre` | ViewportRotation leaf | missing |
| context menu "Show in Specification" plus bubble hover label | SheetTools ContextMenu 1.6.0+, LeaderGeometry 1.3.0 `NoteFor`, SpecLinks 1.2.0 `NoteOf`, SheetTools NoteTooltip | VV has ContextMenu 1.2.0, LeaderGeometry 1.0.0, SpecLinks 1.0.0 |
| RowEditor 1.1.0 lockstep | `SpecData__Lockstep__`, `SpecLockstep__` (TV v2.162.0/v2.163.0) | missing |

**VV adaptation.**

- Config wording: `TrueVision__DrawingNotes__.json` becomes `ValeVision__DrawingNotes__.json`, and `50__TrueVision__UserConfig` becomes the VV equivalent.
- The local write goes through `WCP/server.py`'s `POST /api/projects/<folder>/drawing-notes` (`server.py:32-33,790`), not TV's project-file route. That is `build_vv_transport`, owned by the specification slice.
- The dictionary needs a VV file (Vale brand and product words, Adam to curate) and a WCP blueprint (D-S06a-11).

> **Verifier corrections to the dependency table above.**
> - **VV's local notes transport already exists.** `VVM/03__AppUtils/Na__AppUtils__R2DrawingNotes__.js` exports `Na__R2Notes__WriteLocal` and `Na__R2Notes__ReadLocal` against the WCP drawing-notes route, and VV's `SpecData__Transport__.js:171` (`Na__LeSpec__MirrorLocal`) already writes the local file. What VV lacks is the exported contract the RowEditor calls: `Na__LeSpec__WriteLocalCopy` (write at once, read back, verified). Building it on those two functions is an adaptation, not new transport. No WCP route is needed for notes; only the dictionary blueprint is new server work.
> - **Where TV's `WriteLocalCopy` lives now.** TV moved it from the Transport unit (1.2.0, v2.144.0) into the new `SpecData__Lockstep__.js` (1.0.0, 29-Sep, v2.162.0/v2.163.0, `:780`), re-exported by the `SpecData__.js` facade (1.5.0). WP-S06b-01 owns both, and `LOCATE_EVENT`, so WP-S06a-06 should depend on WP-S06b-01 rather than re-specify them.
> - **Link-time and runtime needs differ.** The folder fails to link without: `Na__LeSpec__LOCATE_EVENT` and `Na__LeSpec__WriteLocalCopy` (the SpecData facade), `Na__LeVpRot__DistanceTo` and `Centre` (the ViewportRotation leaf), and `Na__SpellCheck__Field` and `WordBar` (top-level 55). PanelHost 1.5.0 (`spec.hint`) and TileDrag 1.1.0 (`spec.caption`) are runtime-only: with VV's 1.4.0 and 1.0.0 the tab has no hover text and the rows show the note's name instead of its title and text. TV's own TileDrag log says a missing caption "shows such a tile with its name, never a broken one".

### b.11 Tests

**Shared (VV at the TV v2.85 state).**

| Test | VV | TV |
|---|---|---|
| `Na__Test__ScrapbookScaleBar__` | 35 checks, expects `#666666` | expects `#858585` |
| `Na__Test__ScrapbookDrawingTitle__` | 178 lines, 39 checks | 281 lines, v1.3.0 header, 73+ checks: ViewLevel, bar right, 5 mm rule |
| `Na__Test__ScrapbookApi__.test.py` / `Na__Test__ScrapbookServer__.py` | adapted; VV adds `dont_write_bytecode` | - |
| `Na__Test__ViewportTitleText__` / `Na__Test__NorthCompass__` | - | - (viewports slice) |

**TV-only tests that prove modules in this slice.**

- Pure, portable once the module exists:
  - `Na__Test__ScrapbookCabinetInfill__` (335 lines, copies the type plus config).
  - `Na__Test__AreaSchedule__` (277).
  - `Na__Test__ScrapbookProjectQr__` (430, also copies the QR encoder and painter).
  - `Na__Test__ScrapbookSiteLegend__` (278, copies the hatch library).
  - `Na__Test__LayerMenu__` (758) and `Na__Test__LayerStack__` (277) for Layers Ref / PaintOrder.
  - *Verifier precision:* neither test loads `Panel__Layers__`. LayerMenu tests the reference-layer model (`SheetModel__Layers__`), `LayerMenu__` and `ItemClipboard__`, so it belongs with the reference-layer port (D-S06a-10). LayerStack tests `PaintOrder__` and `SheetRecords` `NormaliseLayerStack`, so it belongs with the PaintOrder port (SheetData/SheetSurface slices), not with WP-S06a-09.
- Panel features:
  - `Na__Test__DimensionRoundUp__` (Dimensions 1.6.0)
  - `Na__Test__HatchLineControls__` (Vectors 1.9.0)
  - `Na__Test__ViewportRotation__` (Viewport 1.8.0)
  - `Na__Test__HideSwings__` (Viewport 1.9.0)
  - `Na__Test__VectorQuality__`, `Na__Test__DrawingGrid__`, `Na__Test__OrthoMode__`, `Na__Test__DrawingAxes__`, `Na__Test__ObjectSnap__`, `Na__Test__ShareLinks__` (Toolbar)
  - `Na__Test__ColourPalette__` (PanelHost 1.6.0)
  - `Na__Test__EnhanceWhitecardStrength__` (Styles 1.7.0)
- Specification Scrapbook: `Na__Test__SpecInlineEdit__`, `Na__Test__BubbleNoteTooltip__`, `Na__Test__SpellCheckDictionary__`, `Na__Test__SpellCheckField__.html`, `Na__Test__UserSpellingsApi__.test.py`, `Na__Test__SpecLockstep__`.

**Harnesses.** VV has `Na__Verify__Exports__.mjs` and `Na__Verify__ModuleGraph__.mjs` (343 and 378 lines, the same sizes as TV's). Run both after every WP here. The static-import risk in b.9 is exactly what they catch.

### b.12 Cross-cutting

- **The shared service worker.**
  - In production VV is served under `WebApps/Na__Pwa__ServiceWorker__.js`, whose shell cache is keyed on `PWA_SW_VERSION_TOKEN = '2026-09-18-1'` (`WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js:229`).
  - It has not been bumped through VV v2.61.0-v2.71.0, although those releases added cross-module exports (ledger lines 135-176, 89-94).
  - Every WP below adds exports (`LinkedPairRow`, `BasePoint`, `Refit`, `IsLinkable`, `LOCATE_EVENT`, ...). Without a bump, a warm client can load a new importer against an old exporter and fail to link the editor. Bumping is Adam's call (it evicts every Vale app's caches): D-S06a-12.
- **The drawing-type API.** VV's SheetModel lacks `Na__LeModel__DRAWING_ARCHITECTURAL`, `DRAWING_SITEPLAN`, `IsSitePlanSheet` and `IsSitePlanViewport`. These are the cause of every site-plan seam in this slice: Scrapbook, Panel__Scrapbook, the engine, Panel__Sheet, ModelLayers, ViewportSettings and the ModeController focus rule. A stub (constants, plus two functions that return false) would let the TV files port byte for byte: D-S06a-02.
- **The ViewportRotation leaf** (`LE/20/Na__LayoutEditor__ViewportRotation__.js`, 313 lines, "A pure leaf: imports nothing"). It is imported by `ViewportLink` 1.5.1, `LinkNoodle` 1.2.2, `ScrapbookSpecification` 1.0.1 and `Panel__ViewportSettings` 1.8.0. With no `Viewport__RotationDeg` on a record it answers exactly as the unrotated maths does. **Porting it early, verbatim, unblocks four files here** even if the rotate grip itself waits.
  - *Verifier caveat:* the leaf's own PORT NOTE (TV `ViewportRotation__.js:47`) says "ValeVision: not yet ported - it waits for Adam's sign-off". TV's `TrueVision__PLAN__ScrapbookSystem__.md` makes the same rule for the whole scrapbook system (section 7, phase 7: "ValeVision port, once Adam has signed TrueVision off"). Get that sign-off (D-S06a-14) before the swarm ports the leaf or anything that imports it. In TV, 23 modules import the leaf (SheetRecords, SheetChrome, SheetSurface, Groups, ObjectSnap Search, SelectionBox, PdfExporter and others), so it is an enabler well beyond this slice; the viewports slice should own it.

---------------------------------------------------------------------------------------------------

## (c) Module-by-module table

Paths are relative to the app root. "LE" = `02__Src__AppModules/51__System__LayoutEditor`. TV release numbers come from the TV devlog.

| TV path | TV ver | VV path | VV ver | State | What VV lacks or does differently | Action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|---|---|
| LE/40__Ui__Panels/Na__LayoutEditor__PanelHost__.js | 1.6.0 | same | 1.4.0 | drifted | LinkedPairRow/ShowLink (1.2.0, v2.41.0); tab hint (1.5.0, v2.91.0); Colour Palette attach (1.6.0, v2.126.0); slider number box (unversioned) | port_whole_reapply_vv | header only; palette import gated on folder 54 | 02__Src__AppModules/54__Feature__ColourPalette |
| LE/40__Ui__Panels/Na__LayoutEditor__Styles__Panels__.css | - | same | - | drifted | Linked Pair region (v2.41.0); rangebox and range-suffix; toggle-group wrap and `--tight` (v2.140.0); `.na-le-row__inline-check` (v2.140.0); `.na-le-btn--ref` and one-red rules (v2.123.0, v2.154.0); percent comment. Scrapbook and Column Tabs regions are byte-identical | port_verbatim | header only; VV links it from `Na__LeLoad__STYLESHEETS` (Loader:129), no change | none |
| LE/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js | 1.24.0 | same | "1.9.0" (about TV 1.12.0) | drifted | VV keeps Undo/Redo (removed 1.19.0, v2.124.0), Fit/100%, and Notes (removed 1.17.0). VV lacks Draft (v2.107.0), Grid/Grid Snap (v2.114.0), Ortho (v2.113.0), Axes (v2.131.0), Snap split + menu (v2.129.0), Circle/Arc (v2.130.0), Floor Area (v2.104.0), Image (v2.116.0), Vector select (v2.136.0), Share (v2.166.0), lockstep toast (v2.163.0), new Select/Move tooltips | port_adapted now (remove only), then port_whole_reapply_vv | interim: keep VV `Snapping__` import until folder 28 lands; final: seams only for features Adam declines. **Verifier:** do NOT take TV's Select/Move tooltips until VV has v2.78.0 auto-Move (S05a), and then change VV AppConfig `ToolSelectTitle`/`ToolMoveTitle` too (config wins); also delete VV AppConfig `MarginToggle`/`MarginToggleTitle` and reword `MarginNotes__Description` (S06a-V02, V03) | 26, 27, 28, 32, 33, 37, 54 SheetImages, 59 FloorAreas, VectorQuality, 66 DocumentSharing, SpecData lockstep |
| LE/40__Ui__Panels/Na__LayoutEditor__Panel__Text__.js | 1.4.0 | same | 1.4.0 | drifted (VV defect) | VV Refresh never calls `Many()` (`:121`, `:157-176`): with several items selected the readout shows defaults; old note | port_verbatim | header only | none |
| LE/40__Ui__Panels/Na__LayoutEditor__Panel__Leaders__.js | 1.2.0 | same | 1.2.0 | comment-only | two comment blocks; log lacks 1.1.0 entry (code present) | port_verbatim | header | none |
| LE/40__Ui__Panels/Na__LayoutEditor__Panel__Dimensions__.js | 1.7.0 | same | 1.4.0 | drifted | Measure at scale (1.2.0, v2.40.0, skipped by VV); Ext. lines (1.3.0, v2.41.0, skipped); Round up (1.6.0, v2.139.0); Line pt + Dashed lines (1.7.0, v2.152.0) | port_whole_reapply_vv | none expected once deps exist | PanelHost 1.2.0; un-hardcode atScale in VV ToolState; Dimension__AtScale/Start/EndExtensionMm/ExtensionsLinked/RoundUp/LinePt/LineStyle records; 15__Core__Markup/DimensionRounding; MarkupBridge `SheetDimensionPt`; LineStyleTool 'dim' |
| LE/40__Ui__Panels/Na__LayoutEditor__Panel__Shapes__.js | 1.9.0 | same | 1.8.0 | drifted | Draw at scale (1.6.0, v2.40.0, skipped); hatch block (v2.90.0) + pt/colour (1.9.0, v2.126.0); edges-off multi fix (1.8.1, v2.106.0, real bug); picture guard (1.8.2, v2.116.0) | port_adapted now (1.8.1, 1.8.2); port_whole_reapply_vv later | none once deps exist | 36__System__HatchPatternTools; Shape__Hatch; atScale un-hardcode |
| LE/40__Ui__Panels/Na__LayoutEditor__Panel__Layers__.js | 1.3.0 | same | 1.1.0 | drifted | Images/Floor Areas labels (1.1.1, v2.116.0/v2.104.0); Ref switch (1.2.0, v2.123.0); one red (1.3.0, v2.154.0) | port_adapted (labels, red) then port_verbatim after reference layers | none | reference-layer feature (SheetModel Layers, HitResolution, ObjectSnap sources, LayerMenu ...) |
| LE/40__Ui__Panels/Na__LayoutEditor__Panel__ModelLayers__.js | 1.3.0 | same | 1.1.0 | drifted | design-phase rows (1.2.0, v2.32.0, ModelSource); site plan rows (1.3.0, v2.49.0); Fill and Line scale columns (site plan only) | keep_vv_divergence (needs_decision) | VV: one model, no site plans | ModelSource, SitePlan store, EdgeStyles FillHex (only if D-S06a-01/02 change) |
| LE/40__Ui__Panels/Na__LayoutEditor__Panel__Sheet__.js | 1.4.0 | same | 1.4.0 | drifted | Drawing Type row (1.2.0, v2.48.0); Register-routed name and revision; DocumentId hidden; Enter-blur keydown (v2.115.0) | keep_vv_divergence + port_adapted (keydown) | VV: Drawing No. stays editable (no register) | Drawing Register (TV-only), site plans |
| LE/40__Ui__Panels/Na__LayoutEditor__Panel__Styles__.js | 1.7.0 | same | 1.6.1 | drifted | percent weight kind and hint (1.7.0, v2.93.0) | port_verbatim | header | Enhance strength (render styles) for effect |
| LE/40__Ui__Panels/Na__LayoutEditor__Panel__ViewportSettings__.js | 1.10.0 | same | 1.4.1 | drifted | ModelSource (1.3.0); Frame (1.4.0, v2.38.0); Doors (1.5.0, v2.42.0); site plans (1.6.0); Rotation (1.8.0, v2.138.0); Hide swings and 1:200 (1.9.0, v2.140.0); WithAdoption (1.10.0, v2.142.0). VV-only add-list refresh (1.4.1) | port_whole_reapply_vv + backport_to_tv (1.4.1) | keep VV 1.4.1 hunk (`:308-313`); exclude ModelSource and site plan (shim or seam). **Verifier:** rewrite TV `:206` `../../40__System__DrawingViewCore` -> `../../42__System__DrawingViewCore` and `:207` `../../42__System__FloorPlanViews` -> `../../43__System__FloorPlanViews` (S06a-V01) | Viewport__ShowFrame in chrome/records/PDF; ViewportRotation; PlanDoors (decision); EditScope WithAdoption, Groups 1.4.0; FpData GetStoreyLevel |
| LE/40__Ui__Panels/Na__LayoutEditor__Panel__SitePlanComposites__.js | 1.0.0 | - | - | tv-only | site plan decks panel | keep_vv_divergence | absent | site plans |
| LE/55__Feature__Scrapbook/Na__LayoutEditor__Scrapbook__.js | 1.1.0 | same | 1.0.0 (= TV 1.1.0) | code seam (misclassified header-only) | none beyond the site-plan seam (VV:188) | no_action (or verbatim with shim) | `const type = 'architectural'` | D-S06a-02 shim |
| LE/55__Feature__Scrapbook/Na__LayoutEditor__Panel__Scrapbook__.js | 1.2.1 | same | 1.0.0 (= TV 1.2.0) | drifted | tab hint (1.2.1, v2.91.0) | port_whole_reapply_vv | show rule `|| failed` (VV:186) unless shim | PanelHost 1.5.0 |
| LE/55__Feature__Scrapbook/Na__LayoutEditor__Scrapbook__Config__.json | - | same | - | permanent divergence (misclassified header-only) | TV items: OS credentials (licence 100053143) + north point, site plan only (verifier: 2 pieces, 3 tiles - both alone and combined - all `['siteplan']`) | keep_vv_divergence | empty library (VV's own Meta) | D-S06a-04 |
| LE/55__Feature__Scrapbook/Na__LayoutEditor__Scrapbook__TileDrag__.js | 1.2.0 | same | 1.0.0 (= TV 1.0.0) | drifted | caption (1.1.0, v2.91.0); hold and snap (1.2.0, v2.134.0) | port_verbatim (after 28) or port_adapted (import seam) | interim: import Snap/HideMarker from `../30__System__SheetTools/Na__LayoutEditor__Snapping__.js` | 28__System__ObjectSnap |
| LE/56__Feature__ScrapbookCustom/Na__LayoutEditor__ScrapbookCustom__.js | 1.0.0 | same | 1.0.0 | drifted | Shape__Area portability hunk (v2.104.0, unversioned) | port_verbatim | item Meta description string | none (no-op until FloorAreas) |
| LE/56__Feature__ScrapbookCustom/Na__LayoutEditor__Panel__ScrapbookCustom__.js | 1.0.0 | same | 1.0.0 | header-only (verifier: misclassified - VV strings at `:263-264`) | two fallback strings name VV's server | no_action | keep strings | - |
| LE/56__Feature__ScrapbookCustom/Na__LayoutEditor__ScrapbookCustom__Transport__.js | 1.0.0 | same | 1.0.0 | adapted (DIV-4) | probe `/api/check-localhost`; route `/api/valevision/scrapbook`; HTML-200 handling | keep_vv_divergence | permanent | WCP/server.py |
| LE/56__Feature__ScrapbookCustom/Na__LayoutEditor__ScrapbookCustom__Config__.json | - | same | - | header-only (verifier: misclassified - `Library__ApiPath` `/api/valevision/scrapbook` at `:19` must never be overwritten) | ApiPath, saving note, labels name VV's server | keep_vv_divergence | permanent | - |
| LE/56__Feature__ScrapbookCustom/Na__LayoutEditor__Styles__ScrapbookCustom__.css | 1.0.0 | same | 1.0.0 | header-only | - | no_action | - | - |
| LE/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__.js | 1.7.0 | same | 1.0.0 (= TV 1.2.0) | drifted | slide (1.3.0, v2.96.0); choices, linkable, qr (1.4.0, v2.100.0); Refit (1.5.0, v2.122.0); adopt (1.6.0, v2.128.0); base point (1.7.0, v2.134.0) | port_whole_reapply_vv | site-plan seam (VV:240) unless shim; console prefix | Groups/ItemClipboard InsertSet (VV has); D-S06a-02 |
| LE/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__ScaleBar__.js | 1.1.0 | same | 1.0.0 | drifted | PaperMm (1.1.0, v2.96.0); fill `#858585` default | port_verbatim | header | none |
| LE/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__DrawingTitle__.js | 1.3.0 | same | 1.0.0 | drifted | ViewLevel (1.1.0, v2.87.0); bar to the right (1.2.0, v2.96.0); 5 mm underline and Misfits (1.3.0, v2.122.0) | port_verbatim | ViewLevel stays '' until VV has storey levels | ViewportTitleText 1.1.0 (to letter the level) |
| LE/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__ViewportLink__.js | 1.5.1 | same | 1.0.0 (= TV 1.2.0) | drifted | ViewLevel facts and linkable (1.3.0 x2); Refit + FactsPatch fix (1.4.0, v2.122.0); Ref exclusion (1.5.0, v2.123.0); rotated frames (1.5.1, v2.138.0) | port_whole_reapply_vv | interim: drop the IsLayerSelectable test until reference layers exist | ViewportRotation leaf; reference layers; ViewportIdentity 1.1.0 |
| LE/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__Grips__.js | 1.6.0 | same | 1.0.0 (= TV 1.1.0) | drifted | slide (1.2.0); choices (1.3.0); grid:false (1.4.0); corner (1.5.0); base and corners (1.6.0) | port_whole_reapply_vv | interim import seam to VV Snapping__ (verifier: WP-S04b-09 deletes Snapping__ - sequence or repoint, S06a-V04) | 28 ObjectSnap Search; engine 1.7.0; **DrawingTitle 1.2.0+ (`PLACE_BELOW`, `PLACE_RIGHT`, verifier)** |
| LE/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__LinkNoodle__.js | 1.2.2 | same | 1.0.0 (= TV 1.2.0) | drifted | every chrome SVG (1.2.1, v2.106.0); rotated frame box (1.2.2, v2.138.0) | port_verbatim | none | ViewportRotation leaf |
| LE/57__Feature__ScrapbookParametric/Na__LayoutEditor__Panel__ScrapbookParametric__.js | 1.8.0 | same | 1.0.0 (= TV 1.2.0) | drifted | storey why-sentence (1.3.0); bar placement controls (1.4.0); metrics and refit (1.5.0); CabinetInfill (1.6.0); base hold (1.7.0); SiteLegend (1.8.0); ProjectQr and AreaSchedule blocks (unversioned) | port_adapted now; port_verbatim after D-S06a-07 | VV type set; metrics = EnsureJsPdf only; no CfApi, no PWA context; ProjectName from VV config if QR adopted. **Verifier:** rewrite TV `:199` `../../40__System__DrawingViewCore` -> `../../42__System__DrawingViewCore` (S06a-V01) | TitleText 1.1.0; engine/grips/TileDrag; types; PdfFonts (optional) |
| LE/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__Config__.json | - | same | Meta 1.1.0 | drifted | 485 TV-only keys (see b.9); ScaleBar fill | port_adapted | keep VV phase and no-site-plan wording; drop ProjectQr, SiteLegend, AreaSchedule blocks until adopted | types adopted |
| LE/57__Feature__ScrapbookParametric/Na__LayoutEditor__Styles__ScrapbookParametric__.css | 1.3.0 | same | 1.0.0 | drifted | slide, reversed stretch, guide (1.1.0); corner (1.2.0); base and corners (1.3.0) | port_verbatim | header | none |
| LE/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__CabinetInfill__.js | 1.2.0 | - | - | tv-only | universal element | port_verbatim | none (pure, no imports) | engine 1.6/1.7, Grips 1.5/1.6, TileDrag 1.2, panel 1.6/1.7, config block, CSS 1.2/1.3 |
| LE/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__AreaSchedule__.js | 1.1.0 | - | - | tv-only | universal; data from Floor Areas | port_verbatim (with FloorAreas) | none (pure) | 59__Feature__FloorAreas, SheetModel__AreaGroups |
| LE/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__ProjectQr__.js | 1.3.0 | - | - | tv-only | NA Project Portal QR block | needs_decision | VV link base and wording if adopted | 53__Feature__ProjectQrCode, Shape__Qr, ShapeGeometry PushQr, PdfExporter 'qr' |
| LE/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__SiteLegend__.js | 1.0.0 | - | - | tv-only | site plan legend | keep_vv_divergence | absent | site plans |
| LE/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__SiteLegendLink__.js | 1.0.0 | - | - | tv-only | its data feed | keep_vv_divergence | absent | site plans, 21__System__SitePlanData |
| LE/58__Feature__ScrapbookSpecification/Na__LayoutEditor__ScrapbookSpecification__.js | 1.0.1 | - | - | tv-only | the library | port_verbatim | none ("nothing app-specific") | SpecData (has), SpecLinks (has), InsertSet (has), ViewportRotation leaf |
| LE/58__Feature__ScrapbookSpecification/Na__LayoutEditor__Panel__ScrapbookSpecification__.js | 1.2.0 | - | - | tv-only | left Specification tab | port_verbatim | none | PanelHost 1.5.0, TileDrag 1.1.0, SpecData LOCATE_EVENT, ContextMenu Open (has), RowEditor |
| LE/58__Feature__ScrapbookSpecification/Na__LayoutEditor__ScrapbookSpecification__RowEditor__.js | 1.1.0 | - | - | tv-only | inline edit + spell check | port_adapted | local write via VV transport | 55__Feature__SpellCheck; SpecData Transport WriteLocalCopy (VV route); lockstep (1.1.0). **Verifier:** VV already has the client (`03__AppUtils/Na__AppUtils__R2DrawingNotes__.js` `WriteLocal`/`ReadLocal`, `SpecData__Transport__.js:171` `MirrorLocal`); only the exported `Na__LeSpec__WriteLocalCopy` contract is missing, and in TV it now lives in `SpecData__Lockstep__.js:780` - owner WP-S06b-01 |
| LE/58__Feature__ScrapbookSpecification/Na__LayoutEditor__ScrapbookSpecification__Config__.json | Meta 1.2.0 | - | - | tv-only | labels | port_adapted | `ValeVision__DrawingNotes__.json`, VV dictionary folder | - |
| LE/58__Feature__ScrapbookSpecification/Na__LayoutEditor__Styles__ScrapbookSpecification__.css | 1.2.0 | - | - | tv-only | rows, editor, halo | port_verbatim | none (self-linked by the panel, `TV Panel:718`) | - |
| 51__LayoutEditor__UserScrapbookContent/ (folders) | - | same | - | drifted | TV lacks 02-05 folders on disk (saves fail there) | backport_to_tv | VV's `.gitkeep` x5 | - |
| 51__LayoutEditor__UserScrapbookContent/ (items) | - | same | - | content | TV: GFFL, Leader Standards, Test (RB05) | needs_decision | VV library empty by design; if seeded, reword each item's `Meta__Description` (names TrueVision and the ProjectVision server) and decide on `SourceProject` RB05 (verifier) | D-S06a-05 |
| NAAPPS/ProjectVision__TrueVisionScrapbook__Api__.py | 1.0.0 | WCP/Server__ValeVisionScrapbook__Api__.py | 1.0.0 | adapted | logic identical | keep_vv_divergence | folder, route, blueprint | - |
| 80__Testing__PrototypeEnvironment/Na__Test__Scrapbook*.{mjs,py} | various | same | 1.0.0 | drifted | ScaleBar colour; DrawingTitle +34 checks; TV lacks dont_write_bytecode | port_test + backport_to_tv | VV module paths | the modules |

---------------------------------------------------------------------------------------------------

## (d) Wiring notes

### d.1 ModeController panel registration

Hot file: `VV LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js:409-436`, compared with TV `:517-557`.

| TV (in order) | VV | Note |
|---|---|---|
| `RegisterTab('left', {id:'document', title:'Document Preferences', hint})` | absent | first left tab; label keys `PanelTabDocument` and `PanelTabDocumentHint` are fallback-only in both AppConfigs. **Verifier:** invisible on its own - PanelHost hides a strip with fewer than two tabs (`:273`); register it with the Specification tab (WP-S06a-06) |
| `Na__LePanelScrapSpec__RegisterTab()` | absent | needs 58 |
| `Na__LePanelSheet__Register()` | yes | |
| `Na__LePanelGrid__Register()` | absent | `27__System__DrawingGrid/Na__LayoutEditor__Panel__DrawingGrid__.js` |
| `Na__LePanelMargin__Register()`, `Na__LePanelLayers__Register()`, `Na__LePanelStyles__Register()` | yes | |
| `Na__LePanelSpComp__Register()` | absent | site plans |
| `Na__LePanelModelLayers__Register()` | yes | |
| `Na__LePanelScrapSpec__Register()` | absent | 58 |
| `RegisterTab('right', {id:'properties', ..., hint})` | yes, **no hint** | add `hint` (`PanelTabPropertiesHint`) |
| `Na__LePanelScrap__RegisterTab()`, `Na__LePanelParam__RegisterProperties()`, Viewport, Text, Leaders, Dims, Shapes | yes | |
| `Na__LePanelVec__Register()` | absent | `37__System__VectorTools/...Panel__VectorTools__.js` |
| `Na__LePanelImages__Register()` | absent | `54__Feature__SheetImages/...Panel__SheetImages__.js` |
| Standard, Param library, Custom | yes | |
| `Na__LePanelPatterns__Register()` | absent | `36__System__HatchPatternTools/...Panel__Patterns__.js` (Properties tab) |
| `Na__LePanelArea__Register()` | absent | `59__Feature__FloorAreas/...Panel__FloorAreas__.js` (last on Properties) |
| `Na__LeSpecLock__Mount(host)` | absent | spec lockstep |

**FocusSection on selection.**

- TV folds the whole accordion group when a viewport is selected (`TV ModeController:1068`, v2.106.0: `FOLD_GROUP`, or Patterns for one site plan viewport). It also opens Floor Areas or Images for rooms and pictures (`:1059`).
- VV's `SectionForKind(kind)` (`VV:736-745`) returns null for a viewport, which leaves Text, Dimensions, Vectors and Leaders standing open over a selected drawing.
- Port the non-site-plan half now: `if (kind === 'viewport') return FOLD_GROUP;` plus the `section || null` call shape. `PanelHost.FocusSection(null)` already folds the group in VV, because the code is identical (verifier: confirmed, VV `PanelHost__.js` FocusSection folds every group member when given no id).
- *Verifier addition:* reword VV AppConfig `LayoutEditor__Panels__FocusNote` (VV `:230`) to TV's "any other viewport folds the whole group" sentence (TV `:281`), leaving out the Floor Areas, Patterns and site plan clauses until those exist.

**Accordion.** `LayoutEditor__Panels__AccordionSections` is `["text","dimensions","shapes","images","leaders","floor-areas","patterns"]` in TV (AppConfig:282) and `["text","dimensions","shapes","leaders"]` in VV (:231). Add each id as its feature lands.

**Keep VV's scene-broadcast refresh** (`VV ModeController:866-867`) when the ModeController is next re-aligned. TV lacks it (back-port).

### d.2 Stylesheets

- `Styles__Panels__.css` is linked by `Na__LeLoad__STYLESHEETS` in VV (Loader:124-133) and imported by TV's CSS index (`TV 03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css:168`). No change is needed.
- The scrapbook stylesheets (Custom, Parametric and, when ported, Specification) are **self-linked by their panels**: TV `Panel__ScrapbookCustom__:365`, `Panel__ScrapbookParametric__:429`, `Panel__ScrapbookSpecification__:718`; VV `:368`, `:178`. **No loader or index edit is needed for them.**
- The Colour Palette and Spell Check stylesheets are global imports in TV's CSS index (top-level features). In VV they belong in `VV/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css`, because the 3D tab uses the palette too. That is owned by the 54/55 slice.
- *Verifier addition, toolbar stylesheets:* TV's final toolbar (1.24.0) is styled partly outside this slice. The Snap split button and caret live in `28__System__ObjectSnap/Na__LayoutEditor__Styles__ObjectSnap__.css` (`.na-le-toolbar__split`, TV `:139-176`). The Draft, Grid and Axes looks are in their folders' stylesheets, and the Image and Share boxes in `54__Feature__SheetImages/...Styles__SheetImages__.css` and `66__Feature__DocumentSharing/...Styles__Share__.css`. TV imports all of them from its CSS index (`Na__CoreUi__Styles__Index__.css:164-167, 172-173`). In VV each must join `Na__LeLoad__STYLESHEETS` (VV `Loader__.js:125-134`) in TV's cascade order. 26, 27, 28 and 33 go between `Styles__Main__Paper__` and `Styles__Panels__`; 54 and 66 go after the Specification sheets and before the WebViewer sheet. S04b's WP-S04b-09 and the sheet-images and sharing slices own those lines. WP-S06a-10v depends on them.

### d.3 AppConfig label keys VV must add

These are present in TV's `LE/03/...AppConfig__.json` and absent from VV's (from `labels.py`; the full lists are in the S06a_work output). Each goes with its feature.

- **Panel__Dimensions:** `DimAtScale`, `DimAtScaleTitle`, `DimAtSheetScale`, `DimPaperMeasure`, `DimRoundUp`, `DimRoundUpTitle`, `DimRoundedShown`.
- **Panel__Layers:** `LayerReference`, `LayerReferenceTitle`, `LayerReferenceOnTitle`.
- **Panel__Shapes:** `ShapeAtScale`, `ShapeAtScaleTitle`, and 15 `ShapeHatch*` keys.
- **Panel__ViewportSettings:** 22 keys (`ShowFrameLabel`, `ShowFrameTitle`, `CaptionNeedsFrame`, `Doors*` x7, `ModelSource*` x3, `SitePlan*` x8, `AddSitePlanViewport`).
- **Toolbar:** `ToolFloorArea`, `ToolFloorAreaTitle`, `VectorLabel`, `VectorTitle`.
- **Panel__Sheet:** `DrawingType*` x3, `SheetName`.
- **Fix in both apps:** `TextManyNote`, `DimManyNote`, `ShapeManyNote` (b.4).

Many other TV keys are fallback-only in both apps (24 in Dimensions, 25 in ViewportSettings), so a port needs no config row for them.

### d.4 Dependency resolution

From `deps.py`: TV-only imports of in-scope files, resolved in VV with the 40->42 folder map.

- **Present in VV (no action):**
  - `Na__DrawData__IsElevationScene` and its siblings, `GetProjectCode`.
  - `Na__LeCfg__GetLineweightSetup`, `GetTextSetup`.
  - All four `Na__LeDrawScale__*`.
  - `Na__LeLayout__Solve`.
  - `Na__LeSurface__Refresh`, `PaperMmToClient`, `GetElements`, `GetPixelsPerMm`, `GetZoom`.
  - `Na__LeLeadGeo__TYPE_BUBBLE`, `Layout`.
  - `Na__LeMenu__Open`, `Na__LeClip__InsertSet`, `Na__LeMeasure__Refresh`, `Na__LeTools__GetLeaderDefaults`.
  - `Na__LeDash__*`, `Na__LeSpecLink__IsBubble`, `NoteIdOf`, `Na__LePdf__EnsureJsPdf`.
  - SheetModel `GetGroupById`, `RegisterBeforeAnnounce`, `GetViewports`, `MarkDirty`, `GetLeaders`.
- **Name missing in an existing VV file:**
  - SheetModel `DRAWING_ARCHITECTURAL`, `DRAWING_SITEPLAN`, `IsSitePlanSheet`, `IsSitePlanViewport`, `IsLayerSelectable`.
  - MarkupBridge `SheetDimensionPt`.
  - Viewport2d `SitePlanLegend`, `SitePlanStoreId`.
  - ViewportTitleText `SOURCE_LEVEL`, `SOURCE_NAME`.
  - EdgeStyles `FillHex`.
  - EditScope `WithAdoption`.
  - SheetTools `TOOL_AREA`.
  - SpecData `LOCATE_EVENT`, `WriteLocalCopy`.
  - FloorPlan data `Na__FpData__GetStoreyLevel`.
  - PanelHost `LinkedPairRow`, `ShowLink`.
  - The parametric engine's `BasePoint`, `IsLinkable`, `Refit`.
  - DrawingTitle `PLACE_BELOW`, `PLACE_RIGHT`.
  - ScaleBar `PaperMm`.
  - ViewportLink `BookRefresh`.
- **Whole file missing in VV:**
  - LE/20: `ModelSource`, `PlanDoors`, `VectorQuality`, `ViewportRotation`.
  - LE/21: `SitePlan__Store`.
  - LE/25: `SitePlanComposites`.
  - LE/26 `DraftMode`, LE/27 `DrawingGrid`, LE/28 `ObjectSnap` (with `__Menu__` and `__Search__`), LE/32 `OrthoMode`, LE/33 `DrawingAxes`.
  - LE/36 `HatchPatterns`, LE/37 `VectorTools__State__` and `__Setup__`.
  - LE/51 `Register__Transactions`, LE/53 `ProjectQr__ProjectLink`, LE/54 `SheetImages__Insert` and `__Setup`, LE/60 `PdfFonts`, LE/66 `Share__Button`.
  - The five TV-only parametric type modules and the three 58 modules.
  - Top-level `54__Feature__ColourPalette/Na__ColourPalette__.js`, `55__Feature__SpellCheck/Na__SpellCheck__.js`, and `80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` (**never import in VV**).

### d.5 Transport and servers

- **Custom Scrapbook** saves go to `WCP/server.py` routes `/api/valevision/scrapbook...`, registered at lines 95-96 and documented at lines 34-36. Reads work on the live site from the committed `UserScrapbook__Index__.json`. No R2 is involved in either app. Parity holds and nothing needs doing.
- **Specification Scrapbook RowEditor** writes the notes file locally. VV's route is `GET/POST /api/projects/<folder>/drawing-notes`, writing `ValeVision__DrawingNotes__.json` (`server.py:32-33,790`). TV uses its project-file route (v2.144.0). This adaptation is owned by the specification slice (`SpecData__Transport__` 1.2.0+).
- **Spell-check dictionary.**
  - TV: `/api/truevision/user-config/spellings` on `NAAPPS/ProjectVision__TrueVisionUserConfig__Api__.py`, with the file `TV/50__TrueVision__UserConfig/TrueVision__UserSpellings__.json`.
  - VV needs a WCP blueprint (proposed: `WCP/Server__ValeVisionUserConfig__Api__.py`, routes `/api/valevision/user-config/spellings`), a VV dictionary file at an app-root folder (proposed: `VV/50__ValeVision__UserConfig/ValeVision__UserSpellings__.json`) and registration in `WCP/server.py`. Owned by the 55 SpellCheck slice; listed here because RowEditor depends on it.

---------------------------------------------------------------------------------------------------

## (e) UI notes - what a user sees differently today

1. **Toolbar.** VV shows Undo, Redo, Fit, 100% and Notes, which TV dropped. VV lacks the drafting toggles (Draft, Grid, Grid Snap, Ortho, Axes), the Snap options arrow, Circle, Arc, Floor Area, Image, the Vector quality list and Share. The VV strip is visibly a different tool set (b.3).
2. **Left column.** TV has two tabs (Document Preferences | Specification) styled like the right column's. VV has no left tabs and no Drawing Grid section.
3. **Tabs.** TV tabs carry hover text; VV's do not.
4. **Panels.**
   - Colour fields: TV opens the Colour Palette above the browser's colour menu; VV does not.
   - Sliders: every TV slider has a typable figure box; VV has a reading only.
   - Layers: TV's Off, Unlock and Ref buttons share one faint red; VV marks only the locked button.
   - Dimensions: TV has Measure at scale, Ext. lines with a padlock, Round up, Line pt and Dashed lines.
   - Vectors: TV has Draw at scale and the Hatch block.
   - Viewport: TV has Frame, Doors, Rotation, Hide swings and 1:200.
   - Selection: with a viewport selected, TV folds the markup sections; VV leaves them open.
5. **Scrapbook tab.** VV shows 3 parametric tiles. TV ships 11 and shows 10 of them on an architectural sheet: Cabinet Infill is architectural-only and the Site Plan Legend is site-plan-only.
   - TV's Drawing Title also comes "with the bar to the right", with a slide grip, a dashed snap guide and a reversed stretch arrow.
   - TV's bar checker is `#858585`; VV's is `#666666`.
   - TV's underline always runs 5 mm past the title; VV's stops at the measured width plus `UnderlineFitExtraMm`.
6. **Specification tab** (TV only): a code-bubble list, filter, full-notes toggle, on-sheet counts, inline edit with spell check and the locate halo.
7. **Multi-select notes.** Both apps show a misleading "Click one ... on its own" when several items are selected (b.4).
8. **The top bar fold** (the "top nav bar animation" Adam named). Outside this slice, but checked for context. `03__Style__AppStylesheets/Na__UiFeature__Styles__AppHeader__.css` differs only in brand comments and VV hiding the "ValeVision 3D" text on phone widths, with the fold rules at parity (ledger 1239 "verbatim", ported TV v2.83.0 -> VV v2.70.0). The UI slice owns the full check.

---------------------------------------------------------------------------------------------------

## (f) Decisions needed

| Id | Question | Options | Recommendation |
|---|---|---|---|
| D-S06a-01 | Will VV ever have site plan drawings? | (a) never: SitePlanComposites, ModelLayers 1.3.0, ViewportSettings 1.6.0, Sheet Drawing Type, SiteLegend/Link and Standard Scrapbook items stay out permanently. (b) port the site plan system (TV 21, 25, OS data). | (a) for now. VV has no OS mapping pipeline. Record each as `permanent_divergence` in the ledger. |
| D-S06a-02 | Give VV TV's drawing-type API as a stub so TV files port byte for byte? | (a) add `Na__LeModel__DRAWING_ARCHITECTURAL='architectural'`, `DRAWING_SITEPLAN='siteplan'`, and `IsSitePlanSheet()` / `IsSitePlanViewport()` returning false to VV's SheetModel. (b) keep per-file seams. | (a). It removes 6 seams in this slice alone and makes `Scrapbook__`, `Panel__Scrapbook__` and the engine verbatim. Owned by the SheetData slice. |
| D-S06a-03 | The Project Portal QR block in VV? | (a) leave out. (b) port with a Vale link base and Vale wording, plus a VV QR system (53) and title-block QR. | (a) until Adam decides whether VV gets a public project viewer link. It needs the whole QR system, which is NA's portal. |
| D-S06a-04 | Vale house items in the Standard Scrapbook? | (a) stay empty. (b) Adam supplies Vale items (logo block, notes) as config pieces. | (a), and revisit when TV's parametric north point (TV plan phase 6) exists, then share it. |
| D-S06a-05 | Seed VV's Custom Scrapbook with TV's universal items? | (a) no. (b) copy GFFL and Leader Standards (portable files; Test excluded). | (b) if Adam wants identical libraries, restyled to Vale fonts and colours if needed. Never copy Test. |
| D-S06a-06 | VV version numbers on whole-file ports | (a) VV restarts at 1.0.0 (today). (b) adopt TV's number, logged "Ported from TV x.y.z". | (b). The header then says which TV state VV holds, which is what every future parity check asks. |
| D-S06a-07 | How does VV take `Panel__ScrapbookParametric__` (statically imports NA-only and site-plan types, TV's CfApi client and the PWA context)? | (a) VV ports every dependency. (b) TV refactor (back-port): a per-app `...ScrapbookParametric__Types__.js` holds type registration, tools and the ProjectName resolver; the panel becomes app-neutral. (c) VV keeps an adapted panel with a documented seam list. | (b), with (c) as the interim. It is the only way the 1,346-line panel stays verbatim. |
| D-S06a-08 | Adopt 1:200 in VV's architectural scales (revises VV D27)? | yes / no | Yes for an identical experience (TV v2.140.0). The SheetData/config slice owns it; the Viewport panel's wrapping toggle CSS comes with this slice. |
| D-S06a-09 | Plan doors and Hide swings in VV | (a) port PlanDoors (needs a VV door data contract, realign plan row AA). (b) leave out. | Decide with the drawing-core slice. The panel rows follow automatically. |
| D-S06a-10 | Reference layers (Ref) in VV | port (17 TV modules) / leave out | Port. It is universal and drives Panel__Layers 1.2.0 and ViewportLink 1.5.0. |
| D-S06a-11 | Spell check and a Vale user dictionary | port 55 + VV dictionary + WCP blueprint / leave RowEditor without spell check | Port. Adam curates `ValeVision__UserSpellings__.json`. |
| D-S06a-12 | Bump the shared service worker token (`PWA_SW_VERSION_TOKEN`) when these WPs ship? | bump per release / batch / never | Bump once per VV release that adds exports. It is Adam's call: it evicts every Vale app's caches. |
| D-S06a-13 | Embed Open Sans in VV's PDF and text measurer (`PdfFonts`)? | yes / no | Yes. Otherwise the DrawingTitle 5 mm rule, infill boxes and schedule widths are measured in Helvetica while drawn in Open Sans. |
| D-S06a-14 (verifier) | Has Adam signed off the TV features this slice would port, or does his 01-Oct-2026 alignment request count as that sign-off? | (a) The alignment request is the sign-off for everything TV shipped up to v2.172.0; record that once in the VV ledger. (b) Port only what TV's plans mark as signed off, and ask about the rest: the Specification Scrapbook (v2.91.0, v2.144.0), the bar to the right (v2.96.0), the Cabinet Infill (v2.128.0, v2.134.0), ViewportRotation (v2.138.0) and the storey ViewLevel (v2.87.0). | (a), recorded in the ledger. TV's scrapbook plan header ("built and tested by Claude, not yet tried by Adam") is out of date: the devlog shows Adam used the Cabinet Infill (v2.134.0, "after Adam used it") and the Specification tab (v2.144.0). But the ViewportRotation PORT NOTE and the plan's section 7 phase 7 still gate the port on his sign-off, so ask once, before the swarm starts. |

---------------------------------------------------------------------------------------------------

## (g) Work packages

Each WP ends with: `node --check` on every touched `.js`; `node 80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs` and `Na__Verify__ModuleGraph__.mjs` clean; a VV devlog entry; a ledger row. In-app checks follow Adam's convention: he tests himself, so hand him a checklist.

### WP-S06a-01 - Dependency-free panel fixes (S)

- **Scope.**
  - Take TV `Panel__Text__.js` 1.4.0 whole (fixes the multi-select readout).
  - Update the `TextManyNote`, `DimManyNote` and `ShapeManyNote` labels and add the three `*NoneOfKindNote` keys in VV AppConfig.
  - `Panel__Shapes__` hunks 1.8.1 (edges-off on several) and 1.8.2 (picture guard).
  - `Panel__Styles__` 1.7.0.
  - `Panel__Leaders__` header and comment sync.
  - `Panel__Layers__` 1.1.1 labels (`area`, `image`) and the 1.3.0 Off-red (`na-le-btn--eye is-off`, `aria-pressed`).
  - The CSS one-red rule (Off and Unlock now; the Ref selector is harmless).
  - The `ScrapbookCustom__` Shape__Area hunk.
- **Hot files:** `VV LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json`, `LE/40__Ui__Panels/Na__LayoutEditor__Styles__Panels__.css`.
- **Acceptance.**
  - Select three text items of different sizes: the panel shows the first one's size, and the note reads "Editing 3 selected text items: a change here goes to all of them."
  - The same for dimensions and vectors (notes only).
  - Select a coloured room plus a plain line, untick Edges: the fills are unchanged.
  - A hidden layer's On/Off button is faint red (`#9b3b3b` on `#fbf3f3`).
- **Tests:** none new; existing suites pass.

### WP-S06a-02 - PanelHost 1.6.0 and the panel stylesheet (M)

> **Verifier note (not superseded).** WP-S06b-08 (Colour Palette) also edits VV `PanelHost__.js`: it adds the `Na__ColourPalette__Attach` line and import. Whichever lands second must keep the other's change. Simplest: WP-S06a-02 takes the TV file with the one-line palette seam, and WP-S06b-08 later turns the seam into the real import (S06a-V04). Na__Verify__Exports__ and ModuleGraph pass on VV today (01-Oct-2026), so any failure after this package is the package's own.

- **Scope.**
  - TV `PanelHost__.js` whole: LinkedPairRow, ShowLink, tab hint, slider number box. Add the Colour Palette attach line only if `02__Src__AppModules/54__Feature__ColourPalette` is already in VV, otherwise leave a one-line seam with a TODO.
  - `Styles__Panels__.css` whole: Linked Pair, rangebox, range-suffix, toggle-group wrap/tight, inline-check, ref.
- **Hot files:** none outside the package. PanelHost is shared by every panel, so serialise with every other WP that edits panels.
- **Acceptance.**
  - Every opacity slider row has a number box; typing 40 and pressing Enter sets 40 and moves the slider.
  - Tabs show hover text.
  - `Na__Verify__Exports__` finds `LinkedPairRow` and `ShowLink`.
- **Tests:** `Na__Test__ColourPalette__.test.mjs` (only once 54 lands).

### WP-S06a-03 - Toolbar, subtractive phase (S)

> **SUPERSEDED by WP-S06a-03v (verifier, section "Verifier-added findings and corrected work packages").** Two problems. First, "adopt TV's Select and Move tooltips" would describe v2.78.0 auto-Move, which VV lacks, and VV's AppConfig values override the fallbacks anyway (S06a-V02). Second, the package missed the AppConfig cleanup for the Notes toggle (`MarginToggle` keys, the `MarginNotes__Description` wording), which duplicates WP-S06b-11 (S06a-V03).

- **Scope.**
  - Remove Undo, Redo, Fit, 100% and Notes, their separators, the History, Navigation and SheetSurface zoom imports, the `ZOOM_EVENT` and `Hist` listeners, and the margin sync (port_adapted from TV 1.19.0 and 1.17.0).
  - Adopt TV's Select and Move tooltips.
  - Keep VV's `Snapping__` import.
- **Hot files:** none.
- **Acceptance.**
  - The strip reads: name | tools | Snap | hints | Raster | Save Sheets, Download PDF.
  - Ctrl+Z, Ctrl+Y and Ctrl+Shift+Z work.
  - Right-click Zoom to fit works.
  - "Show notes margin" in the Margin Notes panel toggles the margin.

### WP-S06a-04 - Column tabs and panel focus wiring (M)

> **SUPERSEDED by WP-S06a-04v (verifier).** Its first acceptance check ("Both columns show tabs") cannot pass. PanelHost hides a column's strip until it has two tabs (VV `PanelHost__.js:273`), and VV's left column gets its second tab only with LE/58. The 'document' tab registration moves to WP-S06a-06.

- **Scope.**
  - ModeController: add the `hint` to the right Properties tab; add the left 'document' tab with hint, registered first in the left column so existing sections stay on it.
  - Port `SectionForKind(kind, items)` with `FOLD_GROUP` for viewports (non-site-plan half of v2.106.0) and the `FocusSection(section || null)` call shape.
  - `Panel__Scrapbook__` 1.2.1 (hint).
- **Depends on:** WP-S06a-02.
- **Hot files:** `VV LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js`, `VV LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json` (Panels block, PanelTab labels if added).
- **Acceptance.**
  - Both columns show tabs styled alike, each with hover text.
  - Selecting a viewport folds Text, Dimensions, Vectors and Leaders.
  - Selecting a text item opens Text and folds the rest.

### WP-S06a-05 - Parametric Scrapbook to the TV v2.134 state, plus the Cabinet Infill (L)

> **SUPERSEDED by WP-S06a-05v (verifier).** Three changes:
> - The adapted panel must rewrite TV `:199`'s `../../40__System__DrawingViewCore` import to VV's `42__` (S06a-V01).
> - Grips 1.6.0 imports DrawingTitle's `PLACE_BELOW` and `PLACE_RIGHT`, so DrawingTitle 1.2.0 or later goes in first.
> - The interim `Snapping__` seam collides with WP-S04b-09, which deletes `Snapping__.js` (S06a-V04). Also, "5 mm past the words" is measured in Helvetica in VV until PdfFonts lands (D-S06a-13), so the acceptance check is reworded.

- **Scope.**
  - Whole files, with header and console seams, from TV:
    - engine 1.7.0, `ScaleBar__` 1.1.0, `DrawingTitle__` 1.3.0, `Grips__` 1.6.0, `LinkNoodle__` 1.2.1 (1.2.2 after the ViewportRotation leaf);
    - `ViewportLink__` 1.4.0 hunks (Refit plus the FactsPatch normalise fix; 1.5.0 and 1.5.1 after their dependencies);
    - Styles 1.3.0, `TileDrag__` 1.1.0 and 1.2.0, `CabinetInfill__` 1.2.0 (new).
  - Config: port_adapted. Add the DrawingTitle bar-right keys, the CabinetInfill block, Grips and Labels keys, and the elements `DrawingTitleBarRight` and `CabinetInfill`; set the ScaleBar fill to `#858585`; keep VV's phase and site-plan wording; omit the ProjectQr, AreaSchedule and SiteLegend blocks.
  - Panel: port_adapted to TV 1.7.0's behaviour, without the AreaSchedule, ProjectQr and SiteLegend imports and without CfApi or the PWA context. Metrics wait on `Na__LePdf__EnsureJsPdf()` only. Document the seam list in the PORT NOTE.
- **Depends on.**
  - 28 ObjectSnap Search, or the interim import seam to `LE/30/Na__LayoutEditor__Snapping__.js`.
  - `LE/20/Na__LayoutEditor__ViewportTitleText__.js` 1.1.0 (panel 1.3.0 imports `SOURCE_LEVEL` and `SOURCE_NAME`), or keep the panel's why-sentence at 1.2.0 as a seam.
  - The ViewportRotation leaf (for 1.2.2 and 1.5.1).
  - Optionally D-S06a-13 (PdfFonts).
- **Hot files:** none outside `LE/55` and `LE/57` (ModeController registration is unchanged).
- **Acceptance.**
  - The Scrapbook tab shows 5 tiles: Title + Bar, Title + Bar to the Right, Title, Scale Bar, Cabinet Infill.
  - A bar to the right slides in 50 mm steps and lands exactly on a snapped corner with a dashed guide; its far end holds while the stretch runs backwards.
  - The title underline ends 5 mm past the words, at every scale.
  - The Cabinet Infill drops by its bottom-left base onto a snapped corner; its three corner grips each hold the opposite corner; a fill recoloured inside the group survives a corner drag; undo and redo are byte for byte for each.
  - Renaming a viewport with two spaces round its dash no longer dirties the sheet on every visit.
- **Tests to port.**
  - `Na__Test__ScrapbookScaleBar__.test.mjs` (expects `#858585`).
  - `Na__Test__ScrapbookDrawingTitle__.test.mjs` (TV 1.3.0, 73+ checks; the ViewLevel checks need TitleText 1.1.0, so mark them pending if absent).
  - `Na__Test__ScrapbookCabinetInfill__.test.mjs` (new).

### WP-S06a-06 - Specification Scrapbook (58) (L)

> **Verifier corrections (not superseded).**
> - Register the left `'document'` tab here, straight before `Na__LePanelScrapSpec__RegisterTab()`. It only becomes visible once this second left tab exists.
> - Depend on WP-S06b-01 for `Na__LeSpec__LOCATE_EVENT` and `Na__LeSpec__WriteLocalCopy`. In TV, `WriteLocalCopy` now lives in `SpecData__Lockstep__.js` and is re-exported by the `SpecData__.js` facade 1.5.0. VV's notes client (`Na__AppUtils__R2DrawingNotes__.js` `WriteLocal`/`ReadLocal`) already reaches WCP's drawing-notes route, so no new notes route is needed.
> - Depend on WP-S06b-09 for the spell check, the Vale dictionary and the WCP user-config blueprint.
> - Add D-S06a-14 (sign-off) as a dependency.

- **Scope.**
  - New folder `LE/58__Feature__ScrapbookSpecification/`: all five files.
  - Config adapted (`ValeVision__DrawingNotes__.json` wording; VV dictionary folder name).
  - RowEditor adapted to VV's local write.
  - ModeController: `Na__LePanelScrapSpec__RegisterTab()` straight after the left 'document' tab, and `Na__LePanelScrapSpec__Register()` after ModelLayers.
- **Depends on.**
  - WP-S06a-02 (hint), WP-S06a-04 (left tabs), WP-S06a-05 (TileDrag 1.1.0 caption).
  - The ViewportRotation leaf.
  - SpecData State 1.1.0+ (`LOCATE_EVENT`), SpecData Transport 1.2.0+ (`WriteLocalCopy` via WCP drawing-notes), SpecData `__.js` re-exports.
  - `55__Feature__SpellCheck` plus the VV dictionary and WCP blueprint (D-S06a-11).
  - SheetTools ContextMenu 1.6.0, LeaderGeometry 1.3.0, SpecLinks 1.2.0 and the NoteTooltip (for "Show in Specification").
  - SpecData Lockstep (RowEditor 1.1.0; otherwise port RowEditor 1.0.0 behaviour as a seam).
- **Hot files:** `VV LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js`, `VV LE/50__Feature__Specification/Na__LayoutEditor__SpecData__State__.js`, `...SpecData__Transport__.js`, `...SpecData__.js` (owned by the specification slice; serialise), `WCP/server.py` (dictionary blueprint, via the 55 slice).
- **Acceptance.**
  - The left Specification tab lists every note by group with its bubble.
  - Dragging a row drops a linked bubble centred under the pointer, with its tail aimed at the nearest viewport, in one undo step.
  - The filter "rf" matches only codes starting RF.
  - F2 edits a row, Enter writes `ValeVision__DrawingNotes__.json` through WCP and reads it back, and Save Sheets lights.
  - "Show in Specification" on a bubble centres its row with three pulses.
- **Tests to port:** `Na__Test__SpecInlineEdit__.test.mjs`, `Na__Test__BubbleNoteTooltip__.test.mjs`, `Na__Test__SpellCheckDictionary__.test.mjs`, `Na__Test__SpellCheckField__.html`, `Na__Test__UserSpellingsApi__.test.py` (adapted to the VV blueprint), and `Na__Test__SpecLockstep__.test.mjs` if lockstep is ported.

### WP-S06a-07 - Dimensions and Vectors panels to TV (M)

- **Scope.** TV `Panel__Dimensions__` 1.7.0 and `Panel__Shapes__` 1.9.0 whole, once:
  - VV ToolState stops hard-coding `atScale: true`, and `CreateDimension` stores `Dimension__AtScale`;
  - the dimension records carry the extension, RoundUp, LinePt and LineStyle fields;
  - `15__Core__Markup/Na__LayoutEditor__DimensionRounding__.js` exists;
  - MarkupBridge exports `SheetDimensionPt`;
  - `LineStyleTool` takes the 'dim' prefix;
  - `36__System__HatchPatternTools` and `Shape__Hatch` exist (for Shapes 1.9.0).
- **Depends on:** WP-S06a-02 (LinkedPairRow), and the dimension and hatch slices.
- **Hot files:** `VV LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json` (Dim* and ShapeHatch* labels), `VV LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__ToolState__.js` (owned elsewhere).
- **Acceptance.**
  - Measure at scale unticked reads paper mm; the Ext. lines padlock links Start and End.
  - Round up shows `1205*` for 1201 mm.
  - Line pt is empty, which means the sheet's Dimension pt.
  - A Vectors hatch picks Brickwork first.
- **Tests:** `Na__Test__DimensionRoundUp__.test.mjs`, `Na__Test__HatchLineControls__.test.mjs`.

### WP-S06a-08 - Viewport panel to TV 1.10.0 (M)

> **SUPERSEDED by WP-S06a-08v (verifier).** A whole copy of TV's file imports `../../40__System__DrawingViewCore` (`:206`) and `../../42__System__FloorPlanViews` (`:207`). In VV those numbers are `42__` and `43__`, so a verbatim copy breaks the editor link (S06a-V01).

- **Scope.** TV `Panel__ViewportSettings__` whole.
  - Re-apply VV's 1.4.1 add-list refresh hunk.
  - Exclude Model Source and site plans by the D-S06a-02 shim or a seam.
  - Include Frame, Rotation and WithAdoption as their dependencies land, and Doors/Hide swings per D-S06a-09.
  - Add the `toggle-group--tight` class use (CSS from WP-S06a-02).
- **Depends on:** `Viewport__ShowFrame` (SheetChrome, SheetRecords, PdfExporter), the ViewportRotation leaf plus the rotate grip (viewports slice), EditScope `WithAdoption` plus Groups 1.4.0, PlanDoors (decision), and `Na__FpData__GetStoreyLevel`.
- **Hot files:** `VV LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json` (22 labels).
- **Acceptance.**
  - Frame unticked hides the frame and caption on screen and in the PDF.
  - Rotation +90 turns the viewport about its middle.
  - A viewport added while a group is open joins it.
  - A plan added in Dev Tools appears in Add Viewport without a reload (the VV fix kept).
- **Tests:** `Na__Test__ViewportRotation__.test.mjs`, `Na__Test__HideSwings__.test.mjs` (if doors are ported).

### WP-S06a-09 - Layers Ref switch (S, after the reference-layer feature)

> **Verifier note (not superseded).** `Na__Test__LayerStack__` tests `PaintOrder__` and `SheetRecords` `NormaliseLayerStack`, not the Layers panel. Move it to the PaintOrder port's package. `Na__Test__LayerMenu__` tests the reference-layer model, `LayerMenu__` and `ItemClipboard__`, so it belongs to the reference-layer feature package this one depends on.

- **Scope:** TV `Panel__Layers__` 1.3.0 whole; `ViewportLink__` 1.5.0 (Nearest skips Ref layers).
- **Depends on:** the reference-layer feature (SheetModel Layers `selectable`, `IsLayerSelectable`, HitResolution, SelectionBox, ObjectSnap sources, ItemClipboard, LayerMenu).
- **Hot files:** `VV LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json` (`LayerReference*`).
- **Acceptance.**
  - Ref on a layer: its items are drawn and printed but cannot be picked or snapped to.
  - The Ref button is the shared faint red.
  - A scale bar dropped beside a Ref viewport does not bind to it.
- **Tests:** `Na__Test__LayerMenu__.test.mjs`, `Na__Test__LayerStack__.test.mjs` (with PaintOrder).

### WP-S06a-10 - Toolbar, final verbatim port (L)

> **SUPERSEDED by WP-S06a-10v (verifier).** The package is missing three dependencies:
> - WP-S04b-09, which owns the toolbar's Snap split and menu, the five toggles, their key rows and the loader `STYLESHEETS` lines for 26/27/28/33.
> - The stylesheet lines for 54 SheetImages and 66 DocumentSharing.
> - S05a's v2.78.0 port, which carries the new Select/Move tooltips and their config.
>
> Without these, the F-key acceptance checks and the split button's look cannot pass.

- **Scope.** TV `Toolbar__` 1.24.0 whole, with seams only for features Adam declines.
- **Depends on:**
  - `26__System__DraftMode`, `27__System__DrawingGrid` (plus its panel and the ModeController registration), `28__System__ObjectSnap` (plus Menu), `32__System__OrthoMode`, `33__System__DrawingAxes`, `37__System__VectorTools`;
  - `20__System__Viewports/Na__LayoutEditor__VectorQuality__.js`, `54__Feature__SheetImages`, `59__Feature__FloorAreas` (`TOOL_AREA`);
  - `66__Feature__DocumentSharing` (Share needs VV's own share links and worker, DIV-4);
  - SpecData lockstep (the conflict toast).
- **Hot files:** `VV LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json` (`VectorLabel`, `VectorTitle`, `ToolFloorArea*`, `ShareDrawing*`).
- **Acceptance:** the strip matches TV's order exactly (b.3); every toggle is lit while on and re-syncs on its CHANGED event; F3, F6, F7, F8 and F9 light their buttons.
- **Tests:** `Na__Test__DrawingGrid__`, `Na__Test__OrthoMode__`, `Na__Test__DrawingAxes__`, `Na__Test__ObjectSnap__`, `Na__Test__VectorQuality__`, `Na__Test__ShareLinks__` (`.test.mjs`).

### WP-S06a-11 - Back-ports to TrueVision (S)

- **Scope.**
  1. `TV LE/40/Na__LayoutEditor__Panel__ViewportSettings__.js`: replace the one-time fill at `:647` with VV 1.4.1's rebuild (keep the choice; skip while focused).
  2. `TV LE/05/...ModeController__.js`: listen for `na-presentation-mode-scenes-loaded` and `-cleared` and refresh 'viewport' (VV 1.15.1).
  3. Create `TV/51__LayoutEditor__UserScrapbookContent/02__ScrapbookItems__Dimensions`, `03__ScrapbookItems__Annotations`, `04__ScrapbookItems__2dEntourage` and `05__ScrapbookItems__GeneralNotes`, each with `.gitkeep`.
  4. `sys.dont_write_bytecode = True` in `TV 80__Testing__PrototypeEnvironment/Na__Test__ScrapbookApi__.test.py` and `Na__Test__ScrapbookServer__.py`.
  5. TV AppConfig `TextManyNote`, `DimManyNote` and `ShapeManyNote` wording (b.4).
  6. Hygiene:
     - `ScrapbookCustom__` 1.0.1 log entry (Shape__Area, v2.104.0);
     - `ViewportLink__` duplicate 1.3.0, renumbered;
     - Toolbar log entries for Floor Area (v2.104.0) and Vector (v2.136.0);
     - a PanelHost log entry for the slider number box;
     - the panel PORT NOTEs still claim "Parity: verbatim" from 10-Sep and should read "TrueVision ahead".
- **Hot files:** the TV files listed above.
- **Acceptance.**
  - In TV, a plan added after a sheet opens appears in Add Viewport.
  - Saving a Custom item into Dimensions succeeds.
  - Selecting 3 text items reads "Editing 3 selected...".

### WP-S06a-12 - Ledger, devlog and deployment (S)

- **Scope.**
  - New ledger section "Return trip (S06a, panels and scrapbooks)" with one row per module in table (c), giving VV version = TV version where D-S06a-06 is adopted.
  - Mark ModelLayers, SitePlanComposites, SiteLegend/Link, the Standard config and the scrapbook transport/server as `permanent_divergence` with reasons.
  - Close ledger row 1231 once WP-S06a-11 lands; refresh the Phase 5 rows 1069-1072.
  - Per-release VV devlog entries.
  - Record Adam's service-worker decision (D-S06a-12) for each release.
- **Hot files:** `VV/ValeVision__PARITY__TrueVisionLedger__.md`, `VV/ValeVision__DEVLOG__.md`, `WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js` (token, only on Adam's say-so).
- **Acceptance:** every module in table (c) has a ledger row with both versions and a state; no row says "verbatim" where the diff is non-empty.

### WP-S06a-13 - Area Schedule element (M, with Floor Areas)

> **Verifier note (not superseded): duplicate ownership.** WP-S06b-10 (Floor Areas) already scopes `LE/57/...AreaSchedule__.js` 1.1.0 as FA-10, with its registration and config keys. Give it one owner (S06a-V04). The cleanest owner is WP-S06b-10, since the element is meaningless without Floor Areas.

- **Scope.** `LE/57/...AreaSchedule__.js` 1.1.0 (new, pure); the config AreaSchedule block and three elements; panel registration and its settings block; Custom Scrapbook portability (already in WP-S06a-01).
- **Depends on:** `59__Feature__FloorAreas` (its before-announce data hook), `SheetModel__AreaGroups__`, WP-S06a-05.
- **Hot files:** none beyond `LE/57`.
- **Acceptance:** an Area Schedule dropped on a sheet with measured rooms lists them by group with subtotals; renaming a room rewrites one text record; the Project form totals across sheets.
- **Tests:** `Na__Test__AreaSchedule__.test.mjs`.

---------------------------------------------------------------------------------------------------

## Verifier-added findings and corrected work packages (01-Oct-2026)

### S06a-V01 - Whole-file ports must remap the drawing-folder import paths (wiring, high)

Three import lines in this slice's TV files name top-level drawing folders whose numbers differ in VV:

| TV file:line | TV specifier | VV specifier | What sits at TV's number in VV |
|---|---|---|---|
| `LE/40/Na__LayoutEditor__Panel__ViewportSettings__.js:206` | `../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js` | `../../42__System__DrawingViewCore/...` | `40__System__2dElevationsView` (legacy), no such file |
| `LE/40/Na__LayoutEditor__Panel__ViewportSettings__.js:207` | `../../42__System__FloorPlanViews/Na__FloorPlan__ProjectJson__Data__.js` | `../../43__System__FloorPlanViews/...` | `42__System__DrawingViewCore`, no such file |
| `LE/57/Na__LayoutEditor__Panel__ScrapbookParametric__.js:199` | `../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js` | `../../42__System__DrawingViewCore/...` | as row 1 |

- **What happens:** a byte-for-byte copy imports files that do not exist in VV, and the whole editor fails to link.
- **What the report said:** "header seam" for whole-file ports, without this path seam. VV's current copies already use 42 (VV `Panel__ViewportSettings__.js` imports `../../42__System__DrawingViewCore`).
- **Search:** no other in-scope TV file imports a renumbered top-level folder (grep of LE/40 and LE/55-58 for `../../4N__`).
- **Recommendation:**
  - Every whole-file port applies the folder map from section 4.1 of `TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md` to `../../NN__` specifiers: 40 -> 42, 42 -> 43, 43 -> 44, 44 -> 45, 45 -> 46, 46 -> 47.
  - Record the remap in the PORT NOTE as a standing seam.
  - Run `node 80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs` and `Na__Verify__Exports__.mjs 51__System__LayoutEditor`; both PASS on VV today (verifier run, 01-Oct-2026). They report a missing file or name, so a failure after a port points at that port.
  - `Na__FpData__GetStoreyLevel` (`:207`) must also be added to VV's `43__System__FloorPlanViews/Na__FloorPlan__ProjectJson__Data__.js` first (NAME-MISSING today; drawing-core slice).

### S06a-V02 - The Select and Move tooltips go with v2.78.0 auto-Move, and they live in AppConfig (ui, medium)

- **What TV says:** the new tooltips say a Select press on text, a vector, a leader's bubble or a group picks the Move tool up. They are at TV `Toolbar__.js:438-440` and TV `AppConfig__.json:877-878`.
- **What VV has:** none of TV v2.78.0's machinery. A grep of VVM LE for `PickUpMove|PutDownMove|IsMoveAuto|AutoMoveKinds|PicksUpMove` finds nothing. S05a owns that port (its table: ToolState 1.2.0, HitResolution 1.3.0, PointerPress 1.2.0, EditScope config).
- **Why the fallbacks do nothing:** VV `AppConfig__.json:661-662` holds the old sentences, and `Na__LeCfg__GetLabel` prefers config over the code fallback. Changing the toolbar's fallbacks alone changes nothing on screen; changing the config would describe a behaviour VV does not have.
- **Recommendation:** take the tooltips out of WP-S06a-03. Change VV's `ToolSelectTitle` and `ToolMoveTitle` config values, and the toolbar fallbacks, in the same change as S05a's v2.78.0 port.

### S06a-V03 - Removing the Notes toggle also removes its labels and its sentence; duplicates WP-S06b-11 (wiring, low)

- **What TV did:** deleted `LayoutEditor__Labels__MarginToggle` and `MarginToggleTitle` from its AppConfig (grep: 0 in TV), and reworded `LayoutEditor__MarginNotes__Description` to "Switched on per sheet with Show notes margin in the Margin Notes panel" (TV `:539`).
- **What VV has:** both keys, and "Switched on per sheet with the Notes button on the toolbar or in the Margin Notes panel" (VV `:428`).
- **What to keep:** TV kept the `ZoomFit`, `Undo` and `Redo` label keys (the web viewer's Fit button reads `ZoomFit`, VV `WebViewer__.js:272`). Keep them in VV.
- **Duplicate:** WP-S06b-11 scopes this exact removal and says it is "best folded into the toolbar slice's package". It is folded into WP-S06a-03v below.

### S06a-V04 - The same files sit in competing packages across slices (tooling, high)

| File or contract | Packages that edit it | Risk |
|---|---|---|
| `LE/40/Na__LayoutEditor__Toolbar__.js` | WP-S06a-03/-10 (this slice); WP-S04b-09 ("Toolbar split + menu + five toggles"); WP-S06b-11 (Notes removal) | three parallel edits of one 400-600 line file |
| `LE/40/Na__LayoutEditor__PanelHost__.js` | WP-S06a-02 (whole file); WP-S06b-08 (palette `Attach` line) | the second to land overwrites the first |
| `LE/57/...AreaSchedule__.js` + its config block | WP-S06a-13; WP-S06b-10 (FA-10) | duplicated work |
| `Na__LeSpec__WriteLocalCopy`, `LOCATE_EVENT` | S06a-F46 / WP-S06a-06; WP-S06b-01 | two designs of one contract |
| VV dictionary file + WCP user-config blueprint | D-S06a-11; WP-S06b-09 | duplicated work |
| `LE/30/Na__LayoutEditor__Snapping__.js` | WP-S04b-09 deletes it; S06a-F26/F36 propose interim imports from it (TileDrag, Grips) | if WP-S06a-05 lands first, the deletion breaks the editor link |

**Recommendation.** The planner gives each row one owner and a fixed order:

1. Toolbar: WP-S06a-03v, then WP-S04b-09 (toggles, split, keys), then WP-S06a-10v (the rest, verbatim).
2. PanelHost: WP-S06a-02 with a one-line palette seam; WP-S06b-08 later fills the seam.
3. AreaSchedule: WP-S06b-10 owns it.
4. The specification contracts: WP-S06b-01.
5. The dictionary: WP-S06b-09.
6. `Snapping__`: schedule WP-S06a-05v after WP-S04b-06, or make WP-S04b-09 repoint the two seams to `28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Search__.js` in the same change that deletes `Snapping__.js`.

### Corrected work packages

**WP-S06a-03v - Toolbar, subtractive phase (S)** (replaces WP-S06a-03)

- **Scope.**
  - Remove Undo, Redo, Fit, 100% and Notes from VV `Toolbar__.js` (TV 1.17.0, 1.19.0). This takes their gaps; the History, Navigation (`Fit`, `ZoomTo`), SheetSurface zoom, `UpdateMarginNotes` and `MarginNotes` imports; the `Hist` and `ZOOM` listeners; and the margin sync.
  - In VV AppConfig, delete `LayoutEditor__Labels__MarginToggle` and `MarginToggleTitle`, and reword `LayoutEditor__MarginNotes__Description` to TV's sentence. This folds in WP-S06b-11.
  - Keep the `ZoomFit`, `Undo` and `Redo` keys.
  - Keep VV's `Snapping__` import (WP-S04b-09 repoints it).
  - Do not touch the Select and Move tooltips (S06a-V02).
- **Acceptance.**
  - The editable strip reads: name | Select ... Eyedropper | Snap | hints | Raster | Save Sheets, Download PDF. The read-only strip reads: name | Raster | read-only note | Download PDF.
  - Ctrl+Z, Ctrl+Y and Ctrl+Shift+Z still undo and redo.
  - A right-click on bare paper offers Zoom to fit, in an editable sheet and in a read-only one.
  - The key map's `Nav__ZoomFit` and `Nav__ZoomActualSize` still work.
  - 'Show notes margin' in the Margin Notes panel still switches the margin.
  - A grep of VVM for `MarginToggle` finds nothing.
  - `node --check` passes on every touched `.js`; `Na__Verify__Exports__` and `Na__Verify__ModuleGraph__` PASS.
- **Hot files:** `LE/40/Na__LayoutEditor__Toolbar__.js`, `LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json`, `ValeVision__DEVLOG__.md`.

**WP-S06a-04v - Panel focus wiring and tab hover text (S)** (replaces WP-S06a-04)

- **Scope.**
  - VV ModeController: port `SectionForKind(kind, items)` with `FOLD_GROUP` for a viewport (the non-site-plan half of TV v2.106.0), and the `FocusSection(section || null)` call.
  - Add `hint` to the right Properties tab.
  - Reword VV AppConfig `LayoutEditor__Panels__FocusNote`.
  - Take `Panel__Scrapbook__` 1.2.1 (the Scrapbook tab hint).
  - The left `'document'` tab moves to WP-S06a-06.
- **Acceptance.**
  - Hovering the Properties and Scrapbook tabs shows their hover text.
  - Selecting a viewport folds Text, Dimensions, Vectors and Leaders.
  - Selecting text opens Text and folds the rest.
  - Clearing the selection leaves the folds alone.
  - VV ModeController `:866-867` (scene-broadcast refresh) is unchanged.
  - Both verifiers PASS.
- **Depends on:** WP-S06a-02.
- **Hot files:** ModeController, AppConfig.

**WP-S06a-05v - Parametric Scrapbook to the TV v2.134 state, plus the Cabinet Infill (L)** (replaces WP-S06a-05)

- **Scope.** As WP-S06a-05, plus three changes:
  1. DrawingTitle 1.3.0 lands before or with Grips 1.6.0, which imports its `PLACE_BELOW` and `PLACE_RIGHT`.
  2. The adapted panel imports `Na__DrawData__GetProjectCode`, if it needs it, from `../../42__System__DrawingViewCore/Na__DrawView__ProjectData__.js` (S06a-V01). Its PORT NOTE lists the seams: VV type set; no CfApi; no `window.TrueVision__Pwa__ProjectContext`; `metricsReady` = jsPDF loaded, with the refit-again-when-PdfFonts-lands caveat.
  3. Use the `Snapping__` seam for TileDrag and Grips only if WP-S04b-06 has not landed, and record it so WP-S04b-09 repoints it.
- **Acceptance.** As WP-S06a-05, except:
  - The title underline runs `UnderlinePastTextMm` (5 mm) past the width measured by VV's jsPDF Helvetica measurer. It reads exactly 5 mm on screen only after D-S06a-13 (PdfFonts).
  - A grep for `40__System__DrawingViewCore` in VV LE/57 finds nothing.
  - Both verifiers PASS after every file.
- **Depends on:** WP-S06a-02; WP-S04b-06 or the recorded seam; ViewportTitleText 1.1.0 or the why-sentence seam; S06a-F53 for LinkNoodle 1.2.2 and ViewportLink 1.5.1; D-S06a-07 interim; D-S06a-14.

**WP-S06a-08v - Viewport panel to TV 1.10.0 (M)** (replaces WP-S06a-08)

- **Scope.** As WP-S06a-08, plus rewrite TV `:206` and `:207` to VV's `42__System__DrawingViewCore` and `43__System__FloorPlanViews` (S06a-V01).
- **Depends on:** the drawing-core slice's `Na__FpData__GetStoreyLevel` in VV `43__System__FloorPlanViews/Na__FloorPlan__ProjectJson__Data__.js`, plus everything WP-S06a-08 already lists.
- **Acceptance.** As WP-S06a-08, plus:
  - The file's only top-level drawing imports are `42__` and `43__`.
  - Both verifiers PASS.

**WP-S06a-10v - Toolbar, final verbatim port (L)** (replaces WP-S06a-10)

- **Scope.** After WP-S04b-09 has added the Snap split, the menu, the five toggles and their key rows, take TV `Toolbar__` 1.24.0 whole. This adds Circle, Arc, Floor Area, Image, the Vector select, Share and the lockstep toast. The toast reads `spec.conflict`, so it imports nothing new.
- **Depends on:**
  - WP-S04b-09, which owns the key rows for F3, F6, F7, F8, F9 and K, and the loader `STYLESHEETS` lines for 26, 27, 28 and 33.
  - The SheetImages and DocumentSharing packages, which own their `STYLESHEETS` lines.
  - 37 VectorTools, `20/VectorQuality`, 59 FloorAreas (`TOOL_AREA`).
  - 66 DocumentSharing on VV's own share links and worker (DIV-4).
  - S05a's v2.78.0 port, if the Select and Move tooltips are to match.
- **Acceptance.**
  - The strip matches TV's order.
  - Each toggle is lit while on and re-syncs on its CHANGED event.
  - F3, F6, F7, F8 and F9 light their buttons.
  - The snap arrow opens the snap options menu, styled.
  - Share never calls TV's worker.
  - Both verifiers PASS.
- **Hot files:** `Toolbar__.js`, AppConfig, `Na__LeLoad__STYLESHEETS` (`LE/01__Core__Loader/Na__LayoutEditor__Loader__.js`).


---------------------------------------------------------------------------------------------------

## Appendix A - TV release for every module version newer than VV's copy

| Module | TV versions VV lacks, with release |
|---|---|
| PanelHost | 1.2.0 v2.41.0; 1.5.0 v2.91.0; 1.6.0 v2.126.0 |
| Toolbar | 1.10.0 v2.39.0 (content present in VV); 1.13.0 v2.107.0; 1.14.0 v2.111.0 (superseded by 1.19.0); 1.15.0 v2.113.0; 1.16.0 v2.114.0; 1.17.0 21-Sep (release not named); 1.18.0 v2.116.0; 1.19.0 v2.124.0; 1.20.0 v2.129.0; 1.21.0 v2.130.0; 1.22.0 v2.131.0; 1.23.0 v2.163.0; 1.24.0 v2.166.0; Floor Area v2.104.0 and Vector v2.136.0 (both unversioned) |
| Panel__Dimensions | 1.2.0 v2.40.0; 1.3.0 v2.41.0; 1.6.0 v2.139.0; 1.7.0 v2.152.0 |
| Panel__Shapes | 1.6.0 v2.40.0; hatch block v2.90.0; 1.8.1 v2.106.0; 1.8.2 v2.116.0; 1.9.0 v2.126.0 |
| Panel__Layers | 1.1.1 v2.116.0 (+ `area` v2.104.0); 1.2.0 v2.123.0; 1.3.0 v2.154.0 |
| Panel__ModelLayers | 1.2.0 v2.32.0; 1.3.0 v2.49.0 |
| Panel__Sheet | 1.2.0 v2.48.0; register routing (Drawing Register era); keydown v2.115.0 |
| Panel__Styles | 1.7.0 v2.93.0 |
| Panel__ViewportSettings | 1.3.0 v2.32.0; 1.4.0 v2.38.0; 1.5.0 v2.42.0; 1.6.0 v2.49.0; 1.8.0 v2.138.0; 1.9.0 v2.140.0; 1.10.0 v2.142.0 |
| Panel__Scrapbook | 1.2.1 v2.91.0 |
| TileDrag | 1.1.0 v2.91.0; 1.2.0 v2.134.0 |
| ScrapbookParametric (engine) | 1.3.0 v2.96.0; 1.4.0 v2.100.0; 1.5.0 v2.122.0; 1.6.0 v2.128.0; 1.7.0 v2.134.0 |
| ScaleBar | 1.1.0 v2.96.0 |
| DrawingTitle | 1.1.0 v2.87.0; 1.2.0 v2.96.0; 1.3.0 v2.122.0 |
| ViewportLink | 1.3.0 v2.87.0; 1.3.0 v2.100.0; 1.4.0 v2.122.0; 1.5.0 v2.123.0; 1.5.1 v2.138.0 |
| Grips | 1.2.0 v2.96.0; 1.3.0 v2.100.0; 1.4.0 v2.114.0; 1.5.0 v2.128.0; 1.6.0 v2.134.0 |
| LinkNoodle | 1.2.1 v2.106.0; 1.2.2 v2.138.0 |
| Panel__ScrapbookParametric | 1.3.0 v2.87.0; 1.4.0 v2.96.0; 1.5.0 v2.122.0; 1.6.0 v2.128.0; 1.7.0 v2.134.0; 1.8.0 v2.164.0; QR block v2.100.0; Area block v2.104.0/v2.148.0 |
| Styles__ScrapbookParametric | 1.1.0 v2.96.0; 1.2.0 v2.128.0; 1.3.0 v2.134.0 |
| CabinetInfill (new) | 1.0.0 v2.128.0; 1.1.0 v2.134.0; 1.2.0 22-Sep (release not named) |
| AreaSchedule (new) | 1.0.0 v2.104.0; 1.1.0 v2.148.0 |
| ProjectQr (new) | 1.0.0 v2.100.0; 1.1.0 v2.102.0; 1.2.0 v2.108.0; 1.3.0 v2.109.0; its code colour v2.120.0 is in the QR config |
| SiteLegend + SiteLegendLink (new) | 1.0.0 v2.164.0 |
| ScrapbookSpecification (new folder) | library 1.0.0 v2.91.0 and 1.0.1 v2.138.0; panel 1.0.0 v2.91.0, 1.1.0 v2.144.0, 1.2.0 22-Sep; RowEditor 1.0.0 v2.144.0 and 1.1.0 v2.162.0/v2.163.0; CSS 1.1.0 v2.144.0 and 1.2.0 22-Sep |
| ScrapbookCustom | Shape__Area hunk v2.104.0 (unversioned) |

## Appendix B - Evidence index (path:line)

- **VV Panel__Text defect:** `VV LE/40__Ui__Panels/Na__LayoutEditor__Panel__Text__.js:121` (Many defined), `:157-176` (Refresh ignores it).
- **Stale labels:** TV `LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json:852-854`; VV `:648,649,652`; `TV LE/03/...ConfigState__.js:372-375` (config wins).
- **One-time fill in TV:** `TV LE/40/...Panel__ViewportSettings__.js:647`; VV fix `:308-313`; VV ModeController `:866-867`.
- **Registration:** TV ModeController `:517-557`; VV `:409-436`; focus TV `:1048-1068`, VV `:736-745`; accordion TV AppConfig `:282`, VV `:231`.
- **Toolbar:** TV Mount `:423`; VV Mount `:257`, Undo/Redo `:318-319`, Fit/100% `:323-324`, Notes `:292`, Snapping import `:110`.
- **Scrapbook seams:** VV `LE/55/...Scrapbook__.js:188`, `LE/57/...ScrapbookParametric__.js:240`, `LE/55/...Panel__Scrapbook__.js:186`.
- **Parametric panel dependencies:** `TV LE/57/...Panel__ScrapbookParametric__.js:197-200,214-215` (imports), `:289-298` (ProjectName via PWA context and CfApi), `:405-412` (metrics), `:425-449` (Wire).
- **Text measure:** VV `LE/10/...SheetChrome__.js:174-186` (Helvetica); VV `...Styles__Main__Paper__.css:276,399` (Open Sans on screen).
- **Servers:** `WCP/server.py:34-36,95-96`; `NAAPPS/ProjectVision__LocalServer__Main__.py:67,234`.
- **Content folders:** TV config `LE/56/...ScrapbookCustom__Config__.json:22-27`; TV folder listing (only `01` and `00`); VV five `.gitkeep`s tracked.
- **Service worker:** `WCP/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js:229` (`'2026-09-18-1'`).
- **ViewportRotation leaf:** `TV LE/20/Na__LayoutEditor__ViewportRotation__.js` header ("A pure leaf: imports nothing"), exports at `:294`.

---------------------------------------------------------------------------------------------------

## Verification

The adversarial verifier ran on 01-Oct-2026 against the same heads: TV `b2aa9151`, VV `7b4e593a`. It was read-only on both apps, NAAPPS and WCP. Its scripts and outputs are in `scratchpad/parity/verify_s06a/` (`vdeps.py`, `jkeys.py`, `insert_section.py`), with the report as it stood before verification in `S06a__LE_Panels_Scrapbooks.BEFORE_VERIFY.md`.

**Overall: the slice is reliable.** All 57 findings were checked against the files. None is refuted. Seventeen needed a correction, mostly additions and caveats. Four material findings and one decision were added, and five work packages were replaced by corrected versions.

### What was checked

**Coverage.** Every in-scope file was enumerated from `drift_all.tsv`, `tree_tv.tsv` and `tree_vv.tsv`:
- LE/40 (13 TV, 12 VV), LE/55 (4/4), LE/56 (5/5), LE/57 (14/9), LE/58 (5/0): 41 TV files with 22,564 lines and 30 VV files with 12,302 lines. These match section (a).
- Every file has a row in table (c). There are no VV-only files in scope.
- The app-root content folder was checked on disk and in git. TV has only `00__Deleted__Quarantine` and `01__ScrapbookItems__General`; VV has five category folders, each tracked by a `.gitkeep`.
- The two server blueprints were diffed with `git diff -w`; both are registered (`WCP/server.py:95-96`, `NAAPPS/...LocalServer__Main__.py:67,234`).
- All 24 TV-only test files the report names exist. VV has the six shared tests (NorthCompass, ViewportTitleText, ScrapbookScaleBar, ScrapbookDrawingTitle, ScrapbookApi, ScrapbookServer).

**Imports.** An independent resolver (`vdeps.py`) checked every import of the 25 TV `.js` files in scope against VV's exports, with comments stripped, `export * from` followed and the section 4.1 folder map applied. It also checked `59/FloorAreas__Table__.js` and the ModeController, which both import this slice.
- It reproduced every "VV lacks / name missing" claim in d.4.
- It found the Grips -> DrawingTitle `PLACE_*` dependency that the report missed.
- It confirmed that `Panel__Text`, `Panel__Leaders`, `Panel__Styles`, `Panel__Layers` and the three Custom Scrapbook files link in VV today.

**Exports.** Exports of every shared file were compared. No shared file has a VV-only export. The TV-only exports are exactly: LinkedPairRow and ShowLink; AddSitePlan; BasePoint, IsLinkable and Refit; Misfits, PLACES, PLACE_BELOW, PLACE_RIGHT and SlideTo; PaperMm; BookRefresh.

**Versions.**
- The TV and VV header versions of all 22 versioned files in LE/55-57 were read.
- The "Ported from TrueVision3D's x.y.z" lines confirm the restart table in b.1.
- All 45 TV releases the report cites exist in `tv_devlog_index.txt`, with matching titles. The v2.96.0 entry confirms the `#666666 -> #858585` change (devlog `:6731`). The v2.78.0 entry shows what the new tooltips depend on.

**Defects, re-proved from the code.**
- VV `Panel__Text` never calls `Many()` (`:121`, `:157-176`). VV's other three markup panels do read `selected || many`.
- The edges-off repaint in VV `Panel__Shapes` (`:358-363`). VV's normaliser keeps edges on a shape with no fill (`SheetRecords__.js:534`), so TV's 1.8.1 guard is safe to port.
- The FactsPatch rebuild loop: VV's `NormaliseFacts` collapses whitespace (`ViewportTitleText__.js:132`), while VV's FactsPatch compares raw facts (`ViewportLink__.js:284-292`).
- TV's one-time Add Viewport fill (`:647`). TV does dispatch `na-presentation-mode-scenes-loaded`, so the back-port is feasible.
- TV saves to a missing category fail with a 400 (`ProjectVision__TrueVisionScrapbook__Api__.py:265-266`).
- The stale AppConfig notes: `GetLabel` prefers the config value (`ConfigState__.js:372-375`).

**Transport and brand.**
- No recommended port imports TV's CfApi client, TV's local server or NA branding, apart from the items already marked `needs_decision` (ProjectQr, Custom items) or permanent divergences (site plans, the OS licence block).
- The NA QR link base (`https://www.noble-architecture.com/q/`) and the TV PWA context are confirmed.
- The shared service worker token `2026-09-18-1` and its stale-while-revalidate policy for deployed origins are confirmed.

**Ledger rows** 57-106, 497-524, 1069-1072, 1214-1233 and 1235-1246 were read.

**Verifier tools.** `Na__Verify__Exports__.mjs 51__System__LayoutEditor` (139 files) and `Na__Verify__ModuleGraph__.mjs` were run on VV. Both PASS today, so this is the baseline for every work package.

### What was corrected

| Finding | Correction |
|---|---|
| F06 | Don't adopt TV's Select and Move tooltips until S05a ports v2.78.0. Add the AppConfig cleanup for the Notes toggle. |
| F07 | The lockstep toast is a runtime field (`spec.conflict`), not an import. The tooltips and the feature stylesheets and hotkeys are owned by S05a and S04b. |
| F09 | Neither app has `*NoneOfKindNote` keys. Delete the three stale keys, or overwrite them. |
| F11 | Add the `defaultAtScale` config read and the `Measurements__Description` reword. The panel's link-time needs are smaller than listed. |
| F18 | Path remap at `:206-207` (S06a-V01). |
| F20 | One left tab is invisible: PanelHost `:273`. |
| F25 | TV has two pieces and three tiles. |
| F31 | The item metadata names TrueVision and RB05. |
| F36 | Add the DrawingTitle 1.2.0 dependency. |
| F38 | Path remap at `:199`; caveat on `metricsReady`. |
| F45 | Separate link-time from runtime dependencies. |
| F46 | VV's notes client already exists. `WriteLocalCopy` now lives in TV's Lockstep unit. Action changed to `port_adapted`. |
| F47 | LayerStack belongs to PaintOrder, not to WP-S06a-09. |
| F49 | TV tracks the `.pyc` files. |
| F53 | Gated by the leaf's own sign-off note. |
| F55 | Two more misclassified files, one of them DIV-4-critical. Severity raised to medium. |

### What was added

- S06a-V01: drawing-folder import paths.
- S06a-V02: tooltips need v2.78.0.
- S06a-V03: the Notes label cleanup, which duplicates WP-S06b-11.
- S06a-V04: cross-slice ownership and the `Snapping__` deletion conflict.
- D-S06a-14: sign-off.
- WP-S06a-03v, -04v, -05v, -08v and -10v replace WP-S06a-03, -04, -05, -08 and -10. WP-S06a-02, -06, -09 and -13 carry verifier notes but stand.

### What remains unverified

- **Runtime behaviour.** The app was not run. Every defect is proved from code, not reproduced on screen. This follows Adam's rule that he tests in the app himself.
- **Full logic of the TV-only modules.** The bodies of CabinetInfill, AreaSchedule, ProjectQr, SiteLegend and SiteLegendLink, and of the three LE/58 modules, were not audited line by line. Their headers, imports, exports and port notes were.
- **Exact config key counts.** The verifier's key-tree diff of the Parametric config gives 493 TV-only leaf keys (Elements 154, Labels 99, ProjectQr 78, AreaSchedule 59, SiteLegend 42, CabinetInfill 41, DrawingTitle 13, Grips 4, Meta 3) against the survey's 485. The difference comes from how list items are keyed. The conclusion is unchanged.
- **Test check counts** (VV 39 and TV 73+ for DrawingTitle) were not recounted.
- **Two release mappings** remain unknown, as the survey said: TV Toolbar 1.17.0, and the 22-Sep CabinetInfill 1.2.0 and Spec panel and CSS 1.2.0. These came in commits titled "Minor" or "mINOR" (`a2e0a836`, `b1e0220f`) with no devlog entry.
- **Other slices' coverage.** Whether the sheet-images and sharing slices list their stylesheet lines for VV's `Na__LeLoad__STYLESHEETS` was not checked.
- **Live deployment.** Whether the live site deploys `51__LayoutEditor__UserScrapbookContent/` for read-only Custom Scrapbook reads was not checked.

### Repository state

`WebApps/ValeVision3D` and the TV app are untouched. Under the same VV git root, other web apps now show modified files that this verifier did not make: ValePlanner data and its startup log, the ValeSpec startup log, and the Lantern Designer service worker. Another session or a running server is probably active. Re-read the VV devlog top before each work package writes to it.
