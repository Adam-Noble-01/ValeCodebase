# S05b - Layout Editor: Drawing Tools, Hatch Patterns and Vector Tools (TrueVision -> ValeVision parity)

Slice owner: S05b. Analysed 01-Oct-2026, read-only on both apps.
TV = `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode` (HEAD b2aa9151, devlog top v2.172.0).
VV = `D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D` (HEAD 7b4e593a, devlog top v2.71.0).
LE = `02__Src__AppModules/51__System__LayoutEditor/`. All paths below are relative to the app root unless prefixed TV/ or VV/.
Working files (diffs, resolver output, scripts) are in `scratchpad/parity/work_S05b/`.

---------------------------------------------------------------------------------------------------

## 0. Headline (read this first)

1. **ValeVision has none of TrueVision's hatch, vector-editing, Boolean or "dimension style" work.** Zero
   occurrences of `Hatch`, `Shape__Holes`, `Shape__Curve`, `Na__LeVec`, `Na__LeRings`, `clipper2` (in source),
   `Dimension__RoundUp`, `Dimension__LinePt`, `Dimension__LineStyle`, `Dimension__StartExtensionMm` in
   `VV/02__Src__AppModules` (grep, 01-Oct-2026). TV-only in this slice: 2 LE subfolders (21 files, 8,865 lines),
   2 leaves in `15__Core__Markup` (487 lines), the app-root hatch library (24 files) and 4 Node test suites (1,671 lines).
2. **Every shared file in scope is pure "VV behind TV" drift.** A code-only diff (header stripped, app name
   normalised) of all 11 shared files found NO ValeVision-specific seam to preserve except the snapping import
   path (`30__System__SheetTools/Na__LayoutEditor__Snapping__.js`, VV-only) - every other VV-side line is simply
   the older TV line. So the right action for each is "take TV's body, rewrite the VV header", gated only on
   dependencies.
3. **The single hard load-order trap**: TV `28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Sources__.js:110`
   statically imports `37__System__VectorTools/Na__LayoutEditor__VectorTools__Curves__.js`
   (`Na__LeVecCurve__KIND_CIRCLE`, `Na__LeVecCurve__Describe`). If the ObjectSnap folder lands in VV before
   `VectorTools__Curves__.js`, the whole editor stops loading (TV/TrueVision__PLAN__VectorTools__.md section 9).
   Curves is a pure leaf with no imports - land it first, in WP-S05b-01.
   **[Verifier, 01-Oct-2026]** Curves is only ONE of four outside-folder imports of `ObjectSnap__Sources__.js:105-110` that VV
   lacks: it also needs ShapeGeometry `Rings` / `EdgePairs` (TV ShapeGeometry 1.9.0, holes), SheetModel `IsLayerSelectable`
   and SheetSurface `GetSheetChrome`. The ShapeGeometry holes exports are planned by S03b WP-06 (whole file) and S04b WP-02
   (additive exports) - they must ALSO precede the ObjectSnap folder. See section (h) for the cross-slice owner map.
4. **Most of this slice's TV-only modules are leaves** (ShapeRings, DimensionRounding, HatchPatterns, VectorTools
   State / Curves / Geometry / Offset / Boolean / Setup). They can land in VV before anything else, inert, and
   unblock both this slice and the ObjectSnap / SheetRecords / SheetChrome ports in other slices.
5. **No transport work.** The hatch library and every config in this slice are static app files fetched relative to
   the module URL (`new URL('../../../', import.meta.url)` + `52__LayoutEditor__HatchPatternLibrary`,
   TV/LE/36__System__HatchPatternTools/Na__LayoutEditor__HatchPatterns__.js:108-111). VV's Flask server already
   serves `/ValeVision3D/<path>` (WCP/server.py:871-888) and VV's Custom Scrapbook already resolves an app-root
   content folder the same way (VV/LE/56__Feature__ScrapbookCustom/Na__LayoutEditor__ScrapbookCustom__Transport__.js:83).
   No worker route, no R2 key, no Flask blueprint. DIV-4 is untouched.
6. **Version numbers are NOT comparable across the apps for these files** - VV renumbered several ports
   (e.g. VV DimensionTool 1.5.0 is roughly TV 1.7.0; VV Panel__Dimensions 1.2.0 is TV 1.4.0). The swarm must use
   the content map in Appendix A, not "TV entries newer than VV's version".

---------------------------------------------------------------------------------------------------

## (a) Scope - what was examined

| Area | TV files | VV files | Notes |
|---|---|---|---|
| `LE/35__System__DrawingTools` | 9 (7 JS + 2 JSON) | 9 | 7 drifted JS, 2 identical configs |
| `LE/36__System__HatchPatternTools` | 3 (1,480 lines) | 0 | TV-only folder |
| `LE/37__System__VectorTools` | 18 (7,385 lines) | 0 | TV-only folder (16 JS incl. the panel, 1 JSON, 1 CSS) |
| `LE/15__Core__Markup` (context) | ShapeGeometry, DimensionGeometry, ShapeRings, DimensionRounding (+ PaintOrder as dependency) | ShapeGeometry, DimensionGeometry | ShapeRings / DimensionRounding / PaintOrder TV-only |
| `LE/40__Ui__Panels` (context) | Panel__Shapes, Panel__Dimensions | same | both drifted |
| `52__LayoutEditor__HatchPatternLibrary` (app root) | 24 (2 packs: 15 + 6 JSON, root index, 2 PNG reference sheets) | 0 | TV-only |
| Tests | Na__Test__VectorTools__ (428), __VectorBooleans__ (726), __HatchLineControls__ (409), __DimensionRoundUp__ (108); partial: __SitePlanComposites__, __DrawingTabKeys__, __CrossSheetClipboard__, __SetMoveLeaderTips__ | none of these | VV has Na__Verify__Exports__ / __ModuleGraph__ |
| Docs | TV/TrueVision__PLAN__VectorTools__.md (339 lines, all read), TV devlog v2.90, v2.101, v2.106, v2.126, v2.129-v2.132, v2.136, v2.139, v2.142, v2.150-v2.152, v2.164 entries; TV realign plan section 12; VV ledger (return-trip sections, subfolders table) | | |
| Hot / dependency files read (headers, devlogs, targeted hunks) | SheetRecords, SheetModel (+ Shapes / Groups / TextAndDimensions / Layers / State units), SheetChrome, MarkupBridge, PdfExporter, Eyedropper, SheetTools (+ State / ToolState / PointerPress / PointerDrag / Keyboard / ContextMenu / HitResolution), SelectionBox, Measurements, ModeController, Toolbar, PanelHost, Styles__Panels, ConfigState (+ KeyMap / ToolSetup), AppConfig JSON, key map JSON, ObjectSnap Search / Sources, OrthoMode State, DrawingGrid State, ViewportRotation, VectorQuality, ProjectQr Symbol, SheetImages Paint, VV Loader, VV Snapping, WCP/server.py | same where they exist | |

Totals: TV in-scope files 60 (+ 1 dependency leaf PaintOrder); VV in-scope files 13 (+ VV-only Snapping as a dependency).
Method: `drift_all.tsv` rows -> `git diff --no-index -w` per shared file -> a code-only diff (`work_S05b/codediff.py`) ->
an import resolver that checks every TV import NAME against VV's exports at the same path
(`work_S05b/resolve.py`, output `work_S05b/import_resolution.txt`) -> an importer graph for call sites
(`work_S05b/graph.py`) -> TV devlog entries per feature -> config key diff (`work_S05b/cfg_slice_diff.txt`) -> key map diff
(`work_S05b/keys_compare.txt`).

**Correction to the reference data**: `drift_all.tsv` marks `35__System__DrawingTools/Na__LayoutEditor__LeaderTool__.js`
and `__TextTool__.js` as `header-only`. Both have CODE differences beyond line 120 (TV LeaderTool:213 and :257 grid snap,
TV TextTool:243 grid snap, plus the ObjectSnap import path in LeaderTool). Treat them as drifted.

---------------------------------------------------------------------------------------------------

## (b) Narrative findings by sub-system

### b1. Drawing tools (`LE/35__System__DrawingTools`)

All seven JS tools exist in both apps at the same path and namespace. The code-only diff (VV -> TV):

| File | Code hunks | +TV / -VV lines | VV-side lines that are a real VV seam |
|---|---|---|---|
| DimensionTool | 16 | +37 / -14 | only the `30__System__SheetTools/Na__LayoutEditor__Snapping__.js` import (VV:129) and its `TONE_DIMENSION` argument |
| ShapeTool | 11 | +28 / -10 | only the Snapping import (VV:121) |
| RectangleTool | 4 | +5 / -3 | only the Snapping import (VV:98) |
| LeaderTool | 3 | +4 / -1 | only the Snapping import (VV:77) |
| TextTool | 2 | +2 / -0 | none |
| GradientTool | 5 | +15 / -6 | none (old DrawPdf body) |
| LineStyleTool | 10 | +34 / -19 | none (old CONTROLS constant) |

What VV lacks, by TV devlog version (details in the table in section (c)):
- **DimensionTool** (TV 1.12.0, VV 1.5.0): the `Dimension__AtScale` field on create (TV 1.3.0, v2.40.0 - VV deliberately
  left it out, VV/LE/35/Na__LayoutEditor__DimensionTool__.js:74), fixed-length extension line fields (TV 1.4.0, v2.41.0),
  Ortho XOR Shift (1.8.0, v2.113.0), grid snap for the offset (1.9.0, v2.114.0), skip reference-layer dimensions in the
  inference (1.10.0, v2.123.0), Object Snap folder + Perpendicular `from` + marker targets (1.11.0, v2.129.0),
  `roundUp` (1.12.0, v2.139.0) and - **unlogged in the module** - `linePt` / `dash` on create (v2.152.0,
  TV/LE/35/Na__LayoutEditor__DimensionTool__.js:328-335). The TV module's DEVELOPMENT LOG stops at 1.12.0, so the v2.152
  hunk is only discoverable from the TV DEVLOG (TV/TrueVision__DEVLOG__.md:1428-1478).
- **ShapeTool** (TV 1.10.0, VV 1.6.0): Floor Areas pass-through `area` / `layerId` and room closure (1.7.0), Ortho (1.8.0),
  Object Snap + Perpendicular `from` (1.9.0), adopt into an open group from the first point (1.10.0, imports
  `Na__LeVec__AdoptIntoOpenGroup`, TV:152).
- **RectangleTool** (TV 1.4.0, VV 1.2.0): `area` / `layerId` pass-through (1.3.0, Floor Areas) and the `land` hook for the
  Note Region tool (1.4.0, v2.143.0); Object Snap path. Both hooks are inert without their callers.
- **TextTool** (TV 1.4.0, VV 1.3.0): grid snap on placement (v2.114.0).
- **LeaderTool** (TV 1.2.0; VV header says 1.0.0 but its code already carries TV 1.1.0's SpecLinks, VV:80/140/304/306):
  grid snap on the head (1.2.0, v2.114.0) and the Object Snap path. VV's DEVELOPMENT LOG must be corrected to 1.1.0.
- **GradientTool** (TV 1.1.0, VV 1.0.0): `DrawPdf(doc, points, gradient, holes)` even-odd PDF clip for holed vectors
  (v2.150.0), importing `Na__LeRings__Spans` (TV:138).
- **LineStyleTool** (TV 1.1.0, VV 1.0.0): `BuildRows / RefreshRows / RegisterControls` take `{ prefix, dashedLabel,
  dashedTitle }` so the Dimensions panel can build the same Dashed rows (v2.152.0). No dependencies - can port now.
- `GradientTool__Config__.json`, `LineStyleTool__Config__.json`: byte-identical. No action.

Dependency summary for verbatim tool bodies (resolver, `work_S05b/import_resolution.txt`):
`28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Search__.js` (Snap, ShowMarker, HideMarker, KIND_END,
TARGET_SHAPE, TARGET_DIMENSION), `27__System__DrawingGrid/Na__LayoutEditor__DrawingGrid__State__.js` (SnapPoint),
`32__System__OrthoMode/Na__LayoutEditor__OrthoMode__State__.js` (Resolve), `Na__LeModel__IsLayerSelectable` (SheetModel),
`37__System__VectorTools/Na__LayoutEditor__VectorTools__.js` (AdoptIntoOpenGroup), `15__Core__Markup/...ShapeRings__.js`
(Spans). DrawingGrid State, OrthoMode State and ViewportRotation are pure leaves with NO imports and default OFF
(Ortho reads `localStorage` `'1'` only, TV OrthoMode__State:91-92), so they can land inert before their UI.
Interim option only if ObjectSnap is late: TV's `Na__LeOsnap__Snap(sheet, point, exclude, options, legacyOptions)` accepts the
old tone string (TV ObjectSnap__Search:505-517), and VV's Snapping `Snap(sheet, point, exclude, tone)` treats an unknown
tone as the vertex tone (VV Snapping:376, :409) - so tool bodies could be taken with only the import path pointed at VV's
Snapping. Not recommended as an end state.
**[Verifier correction]** Only partly true. VV `30__System__SheetTools/Na__LayoutEditor__Snapping__.js:437-452` exports
`KIND_END, KIND_MID, TONE_*, CHANGED_EVENT, IsEnabled, SetEnabled, Toggle, Clear, Find, Snap, ShowMarker, HideMarker` and NO
`Na__LeOsnap__TARGET_DIMENSION` / `Na__LeOsnap__TARGET_SHAPE`. TV DimensionTool:179 imports `TARGET_DIMENSION` and TV
ShapeTool:148 imports `TARGET_SHAPE`, so pointing those two verbatim bodies at VV Snapping is a static import failure (blank
editor, `Na__Verify__Exports__` exit 1). The interim swap works only for RectangleTool and LeaderTool (Snap, HideMarker) and the
six 37 tools (Snap and/or HideMarker); TextTool imports no snap. DimensionTool and ShapeTool wait for the ObjectSnap folder.

### b2. Markup geometry (`LE/15__Core__Markup`)

- **ShapeGeometry** (TV 1.9.0 / 532 lines vs VV 1.5.0 / 303 lines; 17 code hunks, +183/-10). VV lacks:
  the HATCH DECK in `Push` and hatch-as-fill in `Hit` (v2.90.0, **unlogged** in the module); `Shape__Qr` painting
  (1.6.0, v2.100.0) and its softer portal colour (1.8.0, v2.120.0); `Shape__Image` pictures (1.7.0, v2.116.0);
  HOLES (1.9.0, v2.150.0): `Holes, Rings, EdgePairs, EdgeEnd, HolesAfterInsert, RemoveVertices`, ring-aware
  `Segments / Contains / ClosestOnEdge / Push`; `Hit` also treats `Shape__Area` as a fill (Floor Areas).
  TV's file statically imports `Na__LeChrome__PushQr` (SheetChrome), `53__Feature__ProjectQrCode/Na__ProjectQr__Symbol__.js`
  and `54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Paint__.js` (TV:117-121). Those two features are NA-flavoured
  (the Project Portal QR, `/q/?PS01`) or need server routes (Sheet Images) and belong to other slices. **ShapeGeometry is the
  one file in this slice that cannot go verbatim until a decision is made** (D-S05b-03).
  **[Verifier]** The Sheet Images branch is a TRANSPORT dependency, not just another slice's feature: TV
  `54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Paint__.js` imports `__Source__.js`, which imports
  `../../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js` (TV's `na-truevision-api` worker client - DIV-4) and
  `03__AppUtils/Na__AppUtils__ProjectLoader.js`. A verbatim ShapeGeometry in VV therefore needs S07a's SheetImages port WITH a VV
  transport adapter (VV's own worker / Flask), or the D-S05b-03 (b) seam. ShapeGeometry is also a whole-file port in S03b WP-06.
- **DimensionGeometry** (TV 1.6.0 vs VV 1.2.0, where VV 1.2.0 == TV 1.3.0-1.5.1 text leader). VV lacks TV 1.2.0 (fixed-length
  extension lines: `Skeleton(..., extension)`, `ExtensionLength`, `ExtensionFrom`, `G1/G2`) and 1.6.0 (`spec.dashArray`:
  rules pushed as two-point polylines so the dash reaches SVG and PDF; terminators stay solid). Only imports SheetChrome
  `PushLine / PushPolyline` which VV has (VV SheetChrome 1.4.0 already carries DashArray). **Can port now.**
- **ShapeRings** (TV-only, 1.1.0, 385 lines, `Na__LeRings`): the holes leaf. NO imports. Exports Clean, Of, Has, Spans,
  Split, FacesFromRings, Flatten, RingAt, Next, Prev, Edges, Area, Contains, AfterInsert, Remove. Importers in TV:
  SheetRecords:374 (Clean), SheetChrome:196 (Spans), ShapeGeometry:127, GradientTool:138 (Spans), PdfExporter:163 and
  Publish__Viewports:69 (FacesFromRings - site plan / publishing only), plus 37 (via ShapeGeometry). TV's port note warns a
  reader that does not know `Shape__Holes` "paints a holed vector as one run: the outline and its holes joined by a stray
  edge" (TV ShapeRings:52-54).
- **DimensionRounding** (TV-only, 1.0.0, 102 lines, `Na__LeDimRound__Up`): pure leaf; read only by MarkupBridge
  `FormatDimension` (TV MarkupBridge:231). Rounds the printed figure UP to `RoundUpStepMm` and appends `RoundUpMarker` only
  when it moved (v2.139.0, TV DEVLOG:2720-2797).
- **PaintOrder** (TV-only dependency, 1.0.0, 205 lines; imports SheetModel only): `Na__LePaint__MarkupBackToFront` is used by
  the Boolean tool to order a selection (Illustrator's Pathfinder rule). Owned by the layers / paint-order slice (v2.106.0),
  but a hard prerequisite of `VectorTools__BooleanTool__.js:99`.

### b3. Panels (`LE/40__Ui__Panels`)

- **Panel__Shapes** (Vectors panel; TV 1.9.0 / 668 lines vs VV 1.8.0 / 424; 14 code hunks, +205/-4). VV numbering
  diverged (VV 1.6.0 = TV 1.7.0 dashed edges). VV lacks: **Draw at scale** first row (TV 1.6.0, v2.40.0 - skipped by VV,
  ledger VV:520); the **Hatch block** last in the panel (toggle, Pattern, Pattern scale, Pattern deg, Pattern line pt,
  Pattern colour, Standard button, missing-pattern note - v2.90.0 unlogged + 1.9.0, v2.126.0); **1.8.1 bug fix** (v2.106.0,
  TV DEVLOG:5866-5870): with several vectors selected, unticking Edges wrote ONE fill colour to all of them and repainted
  every room the same colour - **VV still has this bug** (the `ApplyToSelection(..., { stroked:false })` early return is
  absent); 1.8.2 pictures excluded (Sheet Images, inert in VV).
- **Panel__Dimensions** (TV 1.7.0 / 486 vs VV 1.4.0 / 229; 20 code hunks, +207/-5). VV lacks: **Measure at scale** first
  row (TV 1.2.0, v2.40.0, skipped - VV ledger:520); **Ext. lines** linked pair with padlock (TV 1.3.0, v2.41.0, needs PanelHost
  `LinkedPairRow / ShowLink`, TV PanelHost 1.2.0, and the `Linked Pair` CSS region in `Styles__Panels__.css`); **Round up to 5 mm**
  (1.6.0, v2.139.0) with the "Measures ... - shown rounded up as" line; **Line pt** and **Dashed lines** (1.7.0, v2.152.0,
  via LineStyleTool 1.1.0 with prefix `dim`, and MarkupBridge `SheetDimensionPt`).

### b4. Hatch patterns (`LE/36__System__HatchPatternTools`) and the library (`52__LayoutEditor__HatchPatternLibrary`)

How it is located and loaded (TV/LE/36/Na__LayoutEditor__HatchPatterns__.js):
- `APP_ROOT = new URL('../../../', import.meta.url)`, `FOLDER = '52__LayoutEditor__HatchPatternLibrary'` (:108-111). The folder
  name and its place at the APP ROOT are load-bearing; no config key, no server route, no R2.
- `Na__LeHatch__Ready()` (:260-306) fetches `HatchLibrary__Index__.json`, then each listed pack's `HatchPack__Index__.json`, then
  every pattern file, **serially**, `cache:'no-store'` (:165). Never rejects; a missing library gives an empty Patterns panel.
  "Nothing lists a directory" - packs and patterns exist only if indexed.
- The module is a LEAF (no imports), on purpose: SheetRecords (:396) and SheetModel__Viewports (:98) import its field names,
  SheetChrome (:191) its painters (`Get, SvgPaint, DrawPdf`), Panel__Shapes (:141) its clamps, PdfExporter (:167) and
  Viewport2d__SitePlan (:104) its site plan painters, ScrapbookParametric (:197, SiteLegendLink :107) `TileMarks`.
- Versions: 1.0.0-1.1.0 (v2.89/v2.90 site plan deck, then any vector), 1.2.0 (v2.101 pattern's own ink), 1.3.0 (v2.126 line pt and
  colour per use, seam copies), 1.4.0 (v2.150 holes even-odd PDF clip), 1.5.0 (v2.164 TileMarks for the site legend).
- Brand: neutral. Only console prefixes `[TrueVision3D]` (:269, :289, :301, :700, :906) need `[ValeVision3D]`.

The library (24 files):
- `HatchLibrary__Index__.json` 1.1.0 lists two packs in order: Construction Materials (`02__ConstructionMaterialHatches`)
  then Site Plan Hatches (`05__SitePlanHatches`). The FIRST pattern of the FIRST pack is what "tick Hatch with nothing chosen"
  picks (Brickwork), so pack order is behaviour.
- `02__ConstructionMaterialHatches` (index 1.0.0 + 14 patterns, `Pack__SwatchInk #333333`): Brickwork, Blockwork, Concrete,
  Hardcore, Earth / Subsoil, Screed & Render, Insulation (Quilt), Insulation (Rigid), Timber (Grain), Steel & Metal,
  Brick Coursing, Block Coursing, Roof Tiles (Plain), Cladding Boards. British drawing conventions, `inherit` ink, no NA
  branding (only `Meta__Author`). Directly relevant to Vale's garden rooms and orangeries.
- `05__SitePlanHatches` (index 1.2.0 + 5): Mixed Woodland, Ponds & Lakes, Grassland, Rough Grassland, Gravel - Ordnance-Survey
  style, written for TV's site plan system (tag-driven defaults). VV has no site plan sheets (VV DEVLOG:366 "This app has no
  site plan sheets"; NA site plan furniture was deliberately not carried, VV DEVLOG:360-364).
- `OS_Symbol__Examples__.png` (1.4 MB) and `OS_Symbol__Examples__Woodland&Water__.png` (1.16 MB): authoring reference sheets;
  nothing fetches them (only a comment, HatchPatterns:152). Not needed at runtime.

The Patterns panel (TV/LE/36/Na__LayoutEditor__Panel__Patterns__.js 1.1.0): two roles in one section - the LIBRARY
(tiles grouped by pack, drawn with `SwatchMarkup`) and, with a site plan viewport selected, per-LAYER hatch overrides written to
`Viewport__SitePlanHatches`. It imports `Na__LeModel__IsSitePlanViewport` (:72) and the site plan store
`21__System__SitePlanData/Na__SitePlan__Store__.js` (:92) - both absent in VV. It injects its own stylesheet with a `<link>` from
`import.meta.url` (:361-366), hides itself until the library loads, and registers last-but-one in the right column (before Floor
Areas, TV ModeController:552). Without the site plan system the panel is a library browser whose tile click does nothing (the
patch returns early with no site plan viewport, :343-349) - exactly what TV shows when no site plan viewport is selected.
**[Verifier]** S04a recommends D-S04a-01 (B): port the site plan client DORMANT and verbatim behind a VV flag, and its
WP-S04a-10 lists "HatchPatterns + Patterns panel + 52__LayoutEditor__HatchPatternLibrary/05__SitePlanHatches". If Adam takes
that option, `Na__SitePlan__Store__` and `Na__LeModel__IsSitePlanViewport` exist in VV and Panel__Patterns can go VERBATIM (no
seam) and the Site Plan pack ships with it. D-S05b-01 / D-S05b-02 must be resolved together with D-S04a-01 (see D-S05b-V02).

A vector's hatch (the part VV needs regardless): `Shape__Hatch { Hatch__PatternKey, Hatch__Scale, Hatch__RotationDeg,
[Hatch__StrokePt], [Hatch__Colour] }`, kept only when a pattern is named (TV SheetRecords:681-697). Painted fill -> gradient ->
hatch -> outline; the outline rides on the hatch path (v2.90). Colour order: the hatch's own -> the pattern's ink -> the shape's
edge colour (SheetChrome 1.12.0, :376-393). PDF stamps tiles clipped to the outline (even-odd for holes).

**Possible TV defect found (needs Adam / in-app confirmation):** the Vectors panel keeps `hatchOn` / `hatch` in the
settings for NEW shapes (TV ToolState:235, Panel__Shapes:357/:405-420), but none of the four tools that create vectors pass it
on: ShapeTool (TV:293), RectangleTool (TV:214), CircleTool (TV:150) and ArcTool (TV:247) call `CreateShape` with `gradient` and `dash`
from the defaults but no `hatch` (grep of all four files: 0 hits for "hatch"). CreateShape does accept `opts.hatch`
(SheetModel__Shapes). So "Hatch ticked with nothing selected" changes nothing for the next shape drawn - the same class of
fault the gradient port found in RectangleTool 1.0.1. See D-S05b-05.

### b5. Vector tools (`LE/37__System__VectorTools`) - Circle, Arc, Trim, Extend, Join, Split, Offset, Fillet, Chamfer, and the six Booleans with holes

Design (TV/TrueVision__PLAN__VectorTools__.md sections 4-5, 10): everything the tools make is an ordinary vector; a curve is a
closed / open run of points plus one word `Shape__Curve { Curve__Kind }`; ONE adapter (`Na__LayoutEditor__VectorTools__.js`)
answers six dispatch sites in the sheet tools and never imports them back; tools work INSIDE an open container and draw into an
open group (`DrawInsideOpenGroup`); one gesture is one undo step (`Na__LeModel__AnnounceShapes`); Booleans run on the vendored
Clipper2 flat `execute` only (PolyTree, InflatePaths, InvalidRect64 are broken in 0.9.0 - plan section 10 traps); holes live
in the same run of points (`Shape__Holes` = start indices), painted even-odd.

Units and their layer (resolver-verified imports):
- Leaves / pure: `State__` 1.1.0 (no imports), `Curves__` 1.0.0 (no imports; **frozen name and exports - ObjectSnap imports it**),
  `Geometry__` 1.0.0 (no imports), `Offset__` 1.0.0 (Curves only), `Boolean__` 1.0.0 (Clipper2 by relative path
  `../../../04__Lib__ThirdParty__VersionLocked/03__Vendor__Clipper2Js__v0.9.0/fesm2020/clipper2-js.mjs`, TV:81 - present in VV;
  content identical to TV apart from 18 CRLF line endings), `Setup__` 1.0.0 (State only; fetches `Config__.json` from its own URL,
  :57/:115), `Config__.json` 1.1.0 (behaviour, preview colours, 144 labels, research notes; brand-neutral).
- Interactive: `Preview__` (SheetSurface), `Targets__` 1.2.0 (SheetModel, EditScope, Groups, Viewport2d GetSnapSource,
  **ViewportRotation Bounds**, ShapeGeometry Rings), `CircleTool__`, `ArcTool__` (+ **OrthoMode State**, AxisLock), `TrimTool__`,
  `JoinTool__`, `OffsetTool__`, `BooleanTool__` 1.1.0 (+ **PaintOrder**, ShapeGeometry Rings / DistanceToEdge / Contains) - all
  import **ObjectSnap Search** (Snap and / or HideMarker).
- Adapter `VectorTools__` 1.2.0 (SheetModel `AddGroupMember`, `RegisterBeforeAnnounce`; DrawingScale; MeasureParse; Groups
  ParentOf; EditScope; every unit above).
- UI: `Panel__VectorTools__` 1.1.0 (straight after Vectors, NOT in the accordion group so no selection folds it; lights the tool
  that is up; one hint line; only the active tool's settings; resize a selected circle / arc) and `Styles__VectorTools__.css`
  (self-injected `<link>`, :376; classes `na-le-vectools__*`; base classes `na-le-btn`, `na-le-btn--active`,
  `na-le-note--heading`, `na-le-row--toggle` all exist in VV CSS).

VV symbols missing for the 37 folder OUTSIDE the folder itself (resolver): SheetModel `AddGroupMember`, `AnnounceShapes`,
`IsLayerSelectable` (+ InsertShape `afterId`, CreateShape `opts.curve / opts.holes`, UpdateShape `patch.curve / patch.holes` -
present as functions but without these parameters in VV, VV SheetModel__Shapes:89); ShapeGeometry `Rings` (and ring-aware
behaviour); `ObjectSnap__Search__`; `OrthoMode__State__`; `ViewportRotation__`; `PaintOrder__`. Everything else the folder
imports already exists in VV with the same names (EditScope, Groups ParentOf, DrawingScale, MeasureParse, AxisLock,
SheetSurface, PanelHost, SheetTools CHANGED_EVENT / SetTool / GetTool / GetShapeDefaults, Viewport2d GetSnapSource - which returns
the same `{ classes, window, key }` shape, VV Viewport2d:289-297; Targets tolerates a window without `ToFrame` /
`FrameToPaper`, TV Targets:283-285).

Six dispatch sites + extras that must be wired in VV (TV line refs; all hot files):
`SheetTools__State__:121/144` (TOOLS += Na__LeVec__TOOLS), `SheetTools__ToolState__:133/135/266/316/325/327/344` (Cancel,
KeepsContainer, Arm, IsDrawTool, DrawInsideOpenGroup), `SheetTools__PointerPress__:195/591-592` (Press),
`SheetTools__PointerDrag__:405/450-451/834/869` (Move, Release), `SheetTools__Keyboard__:246/431-437/481/564/650-655/732/848/854`
(ToolForAction, CommandForAction, RunCommand, situations InContainer / BooleanSelection / OuterShellSelection, StepBack,
TakesAxis, SwallowsArrows, IsDrawing), `SheetTools__ContextMenu__:206/303/401/522` (RightClick, MenuItems, SelectionMenuItems),
`SheetTools__:489-490/673-676` (Measurements context getVectorReading / typeVectorValue, SetSpeaker), `Measurements__` 1.9.0
(:413, :557-564, :615, :798-799 - the generic vector branch and TypingExtras `d`, `s`, `r`), `Toolbar__:207-208/446-447`
(Circle and Arc buttons after Rectangle, added in Toolbar 1.21.0; TV Toolbar is now 1.24.0 and S06a WP-10 ports it whole),
`ModeController__:339-340/546/1198` (register panel after Shapes;
`Na__LeVec__Initialize()` after History), `ShapeTool__:152` (AdoptIntoOpenGroup).

Holes awareness outside the folder (must ship with, or before, the Boolean tools - otherwise inserting or deleting a point on
a holed shape misaligns every later hole): `SheetRecords__` 1.38.0 NormaliseShapeHoles, `SheetModel__Shapes__` 1.6.0,
`ShapeGeometry__` 1.9.0, `SheetChrome__` 1.14.0 (PolylineD, PdfTrace, `fill-rule="evenodd"`, `f*` / `B*` / `W*`), `GradientTool__`
1.1.0, `HatchPatterns__` 1.4.0, `SheetTools__PointerPress__` 1.9.0 (Shift-click insert sends HolesAfterInsert),
`SheetTools__Keyboard__` 1.17.0 (Delete inside a vector -> RemoveVertices), `SheetTools__ContextMenu__` 1.7.0 (Insert point /
Open shape greyed), `SheetTools__HitResolution__` 1.11.0 (ShapeInsertHit -> EdgeEnd), `SelectionBox__` 1.7.0 (rings),
`ObjectSnap__Sources__` 1.2.0 (rings), FloorAreas refusal (TV-only feature).

### b6. Record schema (data)

Shape record (all additive, "kept only while it says something", so older records save byte-identical):
`Shape__Hatch` (v2.90 / v2.126), `Shape__Curve` (v2.130, SheetRecords 1.31.0), `Shape__Holes` (v2.150, SheetRecords 1.38.0;
forces `Shape__Closed = true`). VV's normaliser does NOT strip unknown keys (VV SheetRecords:518-534), so a TV-shaped record
round-trips through VV unchanged but is not rendered correctly (holes would draw a stray edge). Separate R2 stores make cross-app
exposure unlikely, but the published reader / web viewer path in another slice should know.

Dimension record (VV SheetModel__TextAndDimensions has none of these, VV:206 vs TV:209-222/:261-267):
`Dimension__AtScale` (VV's DrawingScale already READS it, VV DrawingScale:155-180, but nothing WRITES it: VV ToolState hardcodes
`atScale : true` with "no Dimensions panel toggle row here", VV ToolState:153/:162; and VV MarkupBridge `DimensionValueMm` ignores
DrawingScale, VV MarkupBridge:478-487, so a VV dimension off every viewport reads paper mm where TV's reads the sheet scale -
back-compatible, since records without the key read as before), `Dimension__StartExtensionMm / EndExtensionMm / ExtensionsLinked`
(v2.41), `Dimension__RoundUp` (v2.139), `Dimension__LinePt`, `Dimension__LineStyle` (v2.152). Eyedropper traits for all six plus
`Shape__Hatch` are missing in VV's trait table (TV Eyedropper:299-322).

Config (`LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json`; `work_S05b/cfg_slice_diff.txt`): VV lacks Dimensions
`DefaultAtScale`, `DefaultExtensionMm`, `ExtensionNote`, `DefaultRoundUp`, `RoundUpStepMm`, `RoundUpMarker`, `RoundUpNote`; Shapes
`DefaultAtScale`, `AtScaleNote`; labels `DimAtScale(+Title)`, `DimAtSheetScale`, `DimPaperMeasure`, `DimRoundUp(+Title)`,
`DimRoundedShown`, `ShapeAtScale(+Title)`, 15 `ShapeHatch*` labels (verifier recount: ShapeHatch, -Colour, -ColourTitle,
-Missing, -None, -Pattern, -Pt, -PtTitle, -Rotation, -RotationTitle, -Scale, -ScaleTitle, -Standard, -StandardTitle, -Title),
9 `Patterns*` labels; `Panels.AccordionSections` lacks
`patterns` (TV :282 `[text, dimensions, shapes, images, leaders, floor-areas, patterns]` vs VV :231
`[text, dimensions, shapes, leaders]`). Several labels fall back in code and are not in TV's JSON either (DimLinePt, DimDashed,
PatternsIntro, ...). `ConfigState__ToolSetup__` (TV 1.5.0 vs VV 1.0.0) must read `defaultRoundUp`, `roundUpStepMm`,
`roundUpMarker`, `defaultAtScale`, `defaultExtensionMm`.

TV config defect, do NOT copy: three Measurements labels sit INSIDE TV's `LayoutEditor__Selection__Config` block
(TV AppConfig:357-369: `MeasureOffsetAgain`, `MeasureNoOffsetSide`, `MeasureDimOffsetTitle`), so TV only ever shows the code
fallbacks. VV has them correctly under `LayoutEditor__Labels__Config`. Back-port the placement to TV.

### b7. Keys

TV `LE/03__Core__Config/Na__Hotkeys__DrawingTabs__.json` vs VV `LE/03__Core__Config/Na__LayoutEditor__KeyMappings__.json`
(`work_S05b/keys_compare.txt`): actions in TV and not VV that belong to this slice - `Tool__Trim` (T, `When: InContainer`),
`Tool__Extend` (Shift+T), `Tool__Join` (J), `Tool__Split` (U), `Tool__Offset` (F), `Tool__Fillet` (Shift+F), `Tool__Chamfer`
(Shift+C), `Tool__Circle` (C), `Tool__Arc` (Shift+A), `Edit__BooleanUnion` (Shift+U), `Edit__BooleanSubtract` (Shift+S),
`Edit__BooleanTrim` (Shift+T, `When: BooleanSelection`, must sit ABOVE Tool__Extend), `Edit__BooleanOuterShell` (Shift+O,
`When: OuterShellSelection`). **[Verifier]** Also checked against VV's app-wide 3D hotkeys
(`VVM/02__AppData/Na__ValeVision__HotkeysDictionary__.json`, matched in `03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js`
with exact Shift/Ctrl/Alt): it binds plain R, B, T, Y, V, D, O, digits, PageUp/Down, Backspace and Alt+Shift+F - none of the 13 new
rows collides; plain T (Trim in a container) only joins the PRE-EXISTING T overlap (Tool__Text vs walk mode), which is the keys
slice's (S05a KeyScope) problem. Clash check against VV's own rows: VV has exactly TV's pre-existing rows on these letters
(F ZoomFit disabled, Ctrl+S, Ctrl+C, T Text) - so TV's clash analysis (plan section 2, DEVLOG v2.151 "The clashes") holds for VV
unchanged. `Tool__FloorArea` (A) is another slice; Arc deliberately avoids A.
Engine: VV `ConfigState__KeyMap__` is 1.0.0 and has no `When` / context support; TV 1.8.0 added `MatchKeyBinding(key, held,
context)` with `When` (TV KeyMap:464-481) and 1.11.0 the Boolean rows in the built-in fallback (TV KeyMap:179-183). Every key row
must exist in the JSON AND the fallback (`Na__Test__DrawingTabKeys__` enforces it in TV). The key FILE NAME differs between the
apps (module-naming divergence owned by the config slice); TV's tests read `Na__Hotkeys__DrawingTabs__.json` by name.

### b8. Transport / persistence

None needed for this slice (see headline 5). Records ride in the existing `LayoutEditor__DrawingsData` through VV's own
`Na__AppUtils__R2SaveProjectJson__` / Flask path; the library and configs are static files. VV has no service worker, so TV's
"service worker token" bumps (v2.126 `2026-09-21-15`, v2.130 `2026-09-21-18`, v2.150 `2026-09-22-13`, v2.151 `2026-09-22-14`,
v2.152 `2026-09-23-02`) and TV's precache entry for `Styles__VectorTools__.css` (TV 62/ServiceWorker Logic:767) are n/a
(precedent: VV ledger:522, :542, :1189).
**[Verifier - live host checked]** VV production is GitHub Pages for the repo root (`D:/10_CoreLib__ValeCodebase/_config.yml`
2.0.0: "Every tracked file is published at its repo path unless excluded"; production URLs
`https://adam-noble-01.github.io/ValeCodebase/WebApps/ValeVision3D/...` in VV `63__Feature__AppNotificationEmail` and
`03__AppUtils/Na__AppUtils__ProjectLoader.js:93`). The exclude list names only markdown, tooling, tests, archives and email
templates, so a tracked `WebApps/ValeVision3D/52__LayoutEditor__HatchPatternLibrary/` publishes with no config change. The
two `OS_Symbol__Examples__*.png` (2.5 MB) WOULD publish too if copied - one more reason to leave them out.

### b9. Tests

| TV test | Checks | What it needs in VV | Adaptation |
|---|---|---|---|
| `Na__Test__VectorTools__.test.mjs` (428 lines) | 138 | 37 pure modules (copies them to a temp dir and rewrites `.js` -> `.mjs` imports, :66-73); `ConfigState__KeyMap__.js` (must have no imports other than the prefix, :396); the key JSON | key file name (:399 reads `Na__Hotkeys__DrawingTabs__.json`); header / console text |
| `Na__Test__VectorBooleans__.test.mjs` (726) | 148 | ShapeRings, Boolean (+Clipper2 path :66), SheetRecords SOURCE text (:313), SheetChrome, ShapeGeometry (QR stubs supplied by the test, :332-339), HatchPatterns, State, BooleanTool, adapter, SheetTools__State, SheetTools__Keyboard, KeyMap + key JSON (:614-615) | key file name; ShapeGeometry without QR imports is fine (stubs just go unused) |
| `Na__Test__HatchLineControls__.test.mjs` (409) | 47 | HatchPatterns, the library at `../52__LayoutEditor__HatchPatternLibrary` (:47), SheetChrome, ShapeGeometry, SheetRecords incl. the PRIVATE `Na__LeRec__NormaliseSitePlanHatches` (:402) | asserts both packs (:90) and uses Grassland / Ponds / Woodland (:109-111, :158-160, :353-354) - adapt per D-S05b-01/02 |
| `Na__Test__DimensionRoundUp__.test.mjs` (108) | 21 | the leaf only (copies it, :47-52) | none bar header text |
| `Na__Test__SitePlanComposites__.test.mjs` | 12 of 98 are vector-hatch rows (v2.90) | site plan system | extract the vector-hatch rows into a VV test only if site plans are not ported |
| `Na__Test__CrossSheetClipboard__.test.cjs`, `Na__Test__SetMoveLeaderTips__.test.cjs` | - | need stubs for `Na__LeVec__TOOLS`, `Na__LeScope__IsActive`, `AdoptIntoOpenGroup`, `Na__LeShapeGeo__Holes` | owned by sheet-tools slices; add stubs when this slice lands |
| `Na__Test__VectorQuality__.test.mjs` | 33 | `20__System__Viewports/Na__LayoutEditor__VectorQuality__.js` (the toolbar's Low / Medium / High linework hold) | **NOT this slice** despite the name - viewport rendering control (v2.136); route to the viewports slice |

**[Verifier] Other TV suites that load this slice's files** (owned by other slices, but they pass in VV only after this
slice's bodies land): `Na__Test__OrthoMode__.test.mjs` loads the SHIPPED `35/ShapeTool` (:225), `35/DimensionTool` (:272) and
`15/DimensionGeometry` (:270) with stubbed imports (S04b WP-07/WP-14 tests - needs WP-S05b-07 and the ShapeTool 1.10.0 body);
`Na__Test__ObjectSnap__.test.mjs` loads `37/VectorTools__Curves__` (:161) (needs WP-S05b-01); `Na__Test__ScrapbookProjectQr__`
loads ShapeGeometry (:374) (S07a). Test ownership also overlaps: `Na__Test__DimensionRoundUp__` is claimed by S03b WP-02 and S06a
WP-07, and `Na__Test__HatchLineControls__` by S03b WP-03/06 and S06a WP-07 - one owner each (section (h)).

VV already has `80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs` and `Na__Verify__ModuleGraph__.mjs` (the VV ledger
VV:44-49 still says it has no equivalent - stale). Both must pass after every WP.

### b10. Docs, ledgers and version numbering

- Version numbering diverged (Appendix A). The swarm must not compute "what VV lacks" from version numbers for: DimensionTool,
  DimensionGeometry, Panel__Shapes, Panel__Dimensions, PanelHost, LeaderTool.
- TV module logs have gaps: the v2.90 hatch hunks are unlogged in ShapeGeometry and Panel__Shapes (and SheetChrome 1.2.0's entry
  was widened to mention hatches); v2.152 is unlogged in DimensionTool. Use the TV DEVLOG entries (Appendix B) as the
  authoritative change list.
- Stale TV port notes: TV LineStyleTool:76-80 says "ValeVision: waiting on sign-off" (VV has had 1.0.0 since VV v2.40.0);
  TV DimensionTool:67-68 "Ahead: 1.2.0 ... waits" (VV has it since v2.29.0); TV DimensionGeometry:65-69 (extension lines
  "waits" - true). TV realign plan section 12 has no rows after AP (v2.70.0). VV ledger has no rows for 36 / 37 / 52, and its
  "skipped" rows (VV ledger:482, :504-508, :520-521) become closable as the WPs land; the subfolder table (VV ledger:1120-1136)
  needs 36 and 37 rows.
- Sign-off state in TV: v2.130, v2.139, v2.150, v2.151, v2.152 all say "NOT tried by Adam" in TV (v2.151 opens with Adam's "It
  works INCREDIBLE!" about v2.150); TV plan section 6 still asks Adam to confirm T / When and the Vector Tools panel placement
  (TV PLAN__VectorTools:197, :202, :336-337). Every 37 module, ShapeRings and DimensionRounding say "ValeVision: not yet ported -
  it waits for Adam's sign-off"; HatchPatterns, Panel__Patterns and PaintOrder carry NO PORT NOTE block at all (a TV header
  convention gap - the VV copies must gain one). The user's request ("align exactly") is the go-ahead, but see D-S05b-07.

---------------------------------------------------------------------------------------------------

## (c) Module-by-module table

Legend - state: identical | header-only | drifted | tv-only. "Lacks" lists TV module versions (TV DEVLOG release in brackets).
Actions use the schema vocabulary. "Deps" are what must exist in VV first.

### c1. `LE/35__System__DrawingTools`

| TV path | TV ver | VV path | VV ver | State | What VV lacks / does differently | Action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|---|---|
| LE/35/Na__LayoutEditor__DimensionTool__.js | 1.12.0 (+v2.152 unlogged) | same | 1.5.0 | drifted (16 hunks) | atScale on create (TV 1.3.0, v2.40); extension fields (1.4.0, v2.41); Ortho XOR Shift (1.8.0, v2.113); grid snap offset (1.9.0, v2.114); skip reference layers (1.10.0, v2.123); ObjectSnap + Perp `from` + targets, no orange tone (1.11.0, v2.129); roundUp (1.12.0, v2.139); linePt / dash (v2.152, :328-335) | port_verbatim (gated) | VV header; record a 1.13.0 entry for v2.152; ~~interim only: point the import at VV Snapping~~ **[Verifier: not possible - TV body imports `TARGET_DIMENSION`, absent from VV Snapping]** | ObjectSnap Search, DrawingGrid State, OrthoMode State, `IsLayerSelectable`, TextAndDimensions create keys, ToolState dim defaults |
| LE/35/Na__LayoutEditor__ShapeTool__.js | 1.10.0 | same | 1.6.0 | drifted (11) | Floor Areas pass-through (1.7.0, v2.104); Ortho (1.8.0, v2.113); ObjectSnap + Perp (1.9.0, v2.129); AdoptIntoOpenGroup (1.10.0, v2.130) | port_verbatim (gated; lands with the switch-on release, WP-S05b-V4) | VV header (no interim Snapping swap: TV body imports `TARGET_SHAPE`) | ObjectSnap Search, OrthoMode State, 37 adapter (importing the adapter loads the WHOLE 37 folder) |
| LE/35/Na__LayoutEditor__RectangleTool__.js | 1.4.0 | same | 1.2.0 | drifted (4) | area/layerId (1.3.0, v2.104); `land` hook (1.4.0, v2.143); ObjectSnap path (v2.129) | port_verbatim | VV header (hooks inert) | ObjectSnap Search |
| LE/35/Na__LayoutEditor__TextTool__.js | 1.4.0 | same | 1.3.0 | drifted (2; ref data says header-only) | grid snap on Place (1.4.0, v2.114) | port_verbatim | VV header | DrawingGrid State |
| LE/35/Na__LayoutEditor__LeaderTool__.js | 1.2.0 | same | 1.0.0 in header; code = 1.1.0 | drifted (3; ref data says header-only) | grid snap on head (1.2.0, v2.114); ObjectSnap path (v2.129) | port_verbatim + fix_ledger | VV log gains 1.1.0 (SpecLinks, already in code) | ObjectSnap Search, DrawingGrid State |
| LE/35/Na__LayoutEditor__GradientTool__.js | 1.1.0 | same | 1.0.0 | drifted (5) | holes even-odd PDF clip (1.1.0, v2.150) | port_verbatim | header + console `[ValeVision3D LayoutEditor]` | ShapeRings |
| LE/35/Na__LayoutEditor__LineStyleTool__.js | 1.1.0 | same | 1.0.0 | drifted (10) | `{prefix, dashedLabel, dashedTitle}` options (1.1.0, v2.152) | port_verbatim | header + console | none |
| LE/35/...GradientTool__Config__.json | - | same | - | identical | - | no_action | - | - |
| LE/35/...LineStyleTool__Config__.json | - | same | - | identical | - | no_action | - | - |

### c2. `LE/36__System__HatchPatternTools` (TV-only) and the library

| TV path | TV ver | VV | State | What it does | Action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|---|
| LE/36/Na__LayoutEditor__HatchPatterns__.js (997) | 1.5.0 | - | tv-only | `Na__LeHatch`: library loader, pattern parse, clamps, `Effective/Token` (site plan), `PatternDef` (SVG `<pattern>` with seam copies), `SvgPaint`, `DrawPdf` (tile stamper, even-odd holes), `TilePolylines/TileMarks`, `SwatchMarkup`. Leaf. 21 exports | port_adapted | console prefixes only | `52__LayoutEditor__HatchPatternLibrary` at app root |
| LE/36/Na__LayoutEditor__Panel__Patterns__.js (456) | 1.1.0 | - | tv-only | library tiles + per site plan layer hatch (pattern, Fill, scale, deg, line pt, colour, Standard) | port_adapted (or needs_decision) | per D-S05b-02: without site plans drop the SpStore import (:92) and the per-layer rows; keep tiles + intro note | HatchPatterns, PanelHost, ModeController register |
| LE/36/Na__LayoutEditor__Styles__Patterns__.css (27) | - | - | tv-only | tile grid | port_verbatim | header; optional Vale accent token for `--na-le-accent` fallback | self-injected by the panel |
| 52__LayoutEditor__HatchPatternLibrary/HatchLibrary__Index__.json | 1.1.0 | - | tv-only | pack list and ORDER | port_adapted | list only the packs VV ships (D-S05b-01); keep Construction first | - |
| 52__.../02__ConstructionMaterialHatches/ (index + 14) | 1.0.0 | - | tv-only | building hatches | port_verbatim | none | - |
| 52__.../05__SitePlanHatches/ (index + 5) | 1.2.0 | - | tv-only | OS-style land cover | needs_decision | ship only with site plans or if Adam wants them for hand-drawn landscape | D-S05b-01 |
| 52__.../OS_Symbol__Examples__*.png (2.5 MB) | - | - | tv-only | authoring reference only | no_action | do not copy (or only with the site pack) | - |

### c3. `LE/37__System__VectorTools` (TV-only, 18 files, 7,385 lines)

| TV path | TV ver | Lines | Role | Imports outside the folder | Action | VV adaptation |
|---|---|---|---|---|---|---|
| ...VectorTools__State__.js | 1.1.0 | 296 | LEAF: tool names, DRAW/EDIT/BOOLEAN sets, settings (localStorage), speaker, hint | none | port_verbatim | header |
| ...VectorTools__Setup__.js | 1.0.0 | 153 | reads Config once, never rejects | State | port_adapted | console prefix (:119) |
| ...VectorTools__Config__.json | 1.1.0 | 208 | behaviour, preview colours, 144 labels, Meta__Research | - | port_verbatim | none (labels mention pictures / QR / rooms; harmless) |
| ...VectorTools__Curves__.js | 1.0.0 | 389 | PURE: SegmentsFor, Circle/ArcPoints, ArcThrough/FromBulge/About, Describe | none | port_verbatim (FIRST) | header; name and exports frozen |
| ...VectorTools__Geometry__.js | 1.0.0 | 684 | PURE: crossings, Trim, Extend, SplitAt/All, Join, CloseEnds, JoinMany | none | port_verbatim | header |
| ...VectorTools__Offset__.js | 1.0.0 | 480 | PURE: Offset (mitres), SideOf, corner fillet / chamfer | Curves | port_verbatim | header |
| ...VectorTools__Boolean__.js | 1.0.0 | 549 | Clipper2 flat execute; Union, OuterShell, Intersect, Subtract, Divide, ToRecord | Clipper2 (vendored, same path in VV) | port_verbatim | header |
| ...VectorTools__Preview__.js | 1.0.0 | 218 | one SVG in the handles layer; red / blue / purple tones | SheetSurface | port_verbatim | header |
| ...VectorTools__Targets__.js | 1.2.0 | 504 | what may be edited (container rule), what cuts, write-back as one step | SheetModel (+IsLayerSelectable, AddGroupMember, AnnounceShapes), EditScope, Groups, Viewport2d, ViewportRotation, ShapeGeometry Rings | port_verbatim | header |
| ...VectorTools__CircleTool__.js | 1.0.0 | 353 | centre / radius / 6s / 3000d; retype | SheetModel, SheetSurface, ObjectSnap | port_verbatim | header |
| ...VectorTools__ArcTool__.js | 1.0.0 | 470 | LayOut's four arcs; typed chord / radius / bulge / angle | + AxisLock, OrthoMode State, ObjectSnap | port_verbatim | header |
| ...VectorTools__TrimTool__.js | 1.1.0 | 380 | Trim and Extend, hover preview, fence, Shift swap | ObjectSnap | port_verbatim | header |
| ...VectorTools__JoinTool__.js | 1.1.0 | 382 | Join (click chain, weld selection, bridge), Split | SheetModel, ObjectSnap | port_verbatim | header |
| ...VectorTools__OffsetTool__.js | 1.1.0 | 419 | Offset, Fillet, Chamfer to typed sizes | SheetModel, ObjectSnap | port_verbatim | header |
| ...VectorTools__BooleanTool__.js | 1.1.0 | 690 | six Booleans by clicks or on a selection; menus | SheetModel, PaintOrder, ShapeGeometry, ObjectSnap | port_verbatim | header |
| ...VectorTools__.js (adapter) | 1.2.0 | 709 | one door for six dispatch sites; container rule; adoption; typed values; menus; Boolean commands | SheetModel, DrawingScale, MeasureParse, Groups, EditScope | port_verbatim | header |
| ...Panel__VectorTools__.js | 1.1.0 | 424 | the Vector Tools section | SheetModel, DrawingScale, SheetTools, PanelHost | port_verbatim | header |
| ...Styles__VectorTools__.css | - | 77 | buttons, rule, hint | - | port_verbatim | header |

### c4. `LE/15__Core__Markup` and `LE/40__Ui__Panels` (context)

| TV path | TV ver | VV path | VV ver | State | What VV lacks | Action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|---|---|
| LE/15/Na__LayoutEditor__ShapeGeometry__.js | 1.9.0 | same | 1.5.0 | drifted (17; +183/-10) | hatch deck + hit (v2.90, unlogged); QR (1.6.0 v2.100, 1.8.0 v2.120); Image (1.7.0 v2.116); holes (1.9.0 v2.150); Area as fill in Hit | port_whole_reapply_vv (OWNER: S03b WP-06) | per D-S05b-03: if 53/54 not ported, keep two documented VV seams (no PushQr / ProjectQr / SheetImages import; their branches removed). Verbatim pulls 54 Source -> TV `80__CloudflareIntegration` ApiClient (DIV-4) | ShapeRings, SheetChrome (hatch, holes, PushQr), 53, 54 (+ VV transport adapter) |
| LE/15/Na__LayoutEditor__DimensionGeometry__.js | 1.6.0 | same | 1.2.0 (= TV 1.3.0-1.5.1) | drifted (13) | extension lines (TV 1.2.0, v2.41); dashArray (1.6.0, v2.152) | port_verbatim | header; log the VV-to-TV version mapping | none |
| LE/15/Na__LayoutEditor__ShapeRings__.js | 1.1.0 | - | - | tv-only | whole leaf | port_verbatim | header | none |
| LE/15/Na__LayoutEditor__DimensionRounding__.js | 1.0.0 | - | - | tv-only | whole leaf | port_verbatim | header | none |
| LE/15/Na__LayoutEditor__PaintOrder__.js (dependency) | 1.0.0 | - | - | tv-only | Plan / MarkupBackToFront | port (other slice) | - | SheetModel |
| LE/40/Na__LayoutEditor__Panel__Shapes__.js | 1.9.0 | same | 1.8.0 (VV 1.6.0 = TV 1.7.0) | drifted (14; +205/-4) | Draw at scale (TV 1.6.0, v2.40); hatch block (v2.90 unlogged); several-selected Edges-off fix (1.8.1, v2.106); pictures filter (1.8.2, v2.116); hatch pt / colour (1.9.0, v2.126) | port_verbatim | header (pictures filter inert) | HatchPatterns, ToolState defaults, config labels |
| LE/40/Na__LayoutEditor__Panel__Dimensions__.js | 1.7.0 | same | 1.4.0 (VV 1.2.0 = TV 1.4.0) | drifted (20; +207/-5) | Measure at scale (1.2.0, v2.40); Ext. lines (1.3.0, v2.41); Round up (1.6.0, v2.139); Line pt + Dashed (1.7.0, v2.152) | port_verbatim | header | MarkupBridge SheetDimensionPt, PanelHost LinkedPairRow / ShowLink, LineStyleTool 1.1.0, model patch keys, Eyedropper traits |

### c5. Tests

| TV path | Lines | VV | Action | Adaptation |
|---|---|---|---|---|
| 80__Testing__PrototypeEnvironment/Na__Test__VectorTools__.test.mjs | 428 | - | port_test | key JSON file name; header |
| 80__.../Na__Test__VectorBooleans__.test.mjs | 726 | - | port_test | key JSON file name; header |
| 80__.../Na__Test__HatchLineControls__.test.mjs | 409 | - | port_test (adapted) | drop / guard site plan pack and NormaliseSitePlanHatches checks per D-S05b-01/02 |
| 80__.../Na__Test__DimensionRoundUp__.test.mjs | 108 | - | port_test | header only |
| 80__.../Na__Test__SitePlanComposites__.test.mjs (12 vector-hatch rows) | 1,052 | - | port_test (extract) | only if site plans are not ported |

---------------------------------------------------------------------------------------------------

## (d) Wiring notes

### d1. Prerequisites outside this slice (VV-missing symbols, resolver-verified)

| VV module (path) | Missing | Needed by | Owner / note |
|---|---|---|---|
| LE/28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Search__.js (whole folder, 15 files) | Snap, ShowMarker, HideMarker, KIND_END, TARGET_SHAPE, TARGET_DIMENSION | 6 vector tools, DimensionTool, ShapeTool, RectangleTool, LeaderTool | ObjectSnap slice. **Its Sources unit imports 37 Curves** - Curves must exist first |
| LE/32__System__OrthoMode/Na__LayoutEditor__OrthoMode__State__.js | Resolve | DimensionTool, ShapeTool, ArcTool | leaf, no imports, default off; land early |
| LE/27__System__DrawingGrid/Na__LayoutEditor__DrawingGrid__State__.js | SnapPoint | DimensionTool, TextTool, LeaderTool (and ObjectSnap Search: IsSnapping, Nearest) | leaf, no imports, default off; land early |
| LE/20__System__Viewports/Na__LayoutEditor__ViewportRotation__.js | Bounds | VectorTools Targets (and ObjectSnap Search) | leaf, no imports; unrotated frame when nothing is turned |
| LE/15__Core__Markup/Na__LayoutEditor__PaintOrder__.js | MarkupBackToFront | BooleanTool | layers / paint-order slice (v2.106) |
| LE/07__Core__SheetData/Na__LayoutEditor__SheetModel__Layers__.js + facade | IsLayerSelectable | DimensionTool, Targets, BooleanTool | reference layers slice (v2.123); 4-line function, back-compatible (`Layer__Selectable !== false`) - land alone if that slice is late |
| LE/07/...SheetModel__Groups__.js + facade | AddGroupMember | adapter, Targets | this slice (WP-03) unless the groups slice lands it |
| LE/07/...SheetModel__Shapes__.js + facade | AnnounceShapes; InsertShape afterId; CreateShape curve / holes / hatch; UpdateShape patch.curve / holes / hatch (merge) | 37, Panel__Shapes | this slice (WP-03) |
| LE/07/...SheetModel__Viewports__.js + facade | IsSitePlanViewport | Panel__Patterns (verbatim form only) | site plan slice |
| LE/10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js | Hatch / HatchInk / Holes on the polyline primitive, HatchDef, PolylineD, PdfTrace, PushQr | ShapeGeometry, vector hatch on screen and in the PDF | this slice for hatch + holes (WP-04); PushQr with the QR slice |
| LE/15/Na__LayoutEditor__MarkupBridge__.js | SheetDimensionPt; DimensionStrokeMm(dim); FormatDimension round-up; DimensionValueMm via DrawingScale; DimensionExtension in Skeleton / Push; dash pattern | Panel__Dimensions, every sheet dimension | this slice's hunks (WP-04); the rest of MarkupBridge (Floor Areas, PaintOrder) elsewhere |
| LE/40/Na__LayoutEditor__PanelHost__.js | LinkedPairRow, ShowLink | Panel__Dimensions | TV PanelHost 1.2.0; + CSS `Linked Pair` region in Styles__Panels__.css |
| LE/53__Feature__ProjectQrCode/*, LE/54__Feature__SheetImages/* | Symbol, Paint | ShapeGeometry verbatim | other slices; D-S05b-03 |
| LE/03__Core__Config/Na__LayoutEditor__ConfigState__KeyMap__.js | MatchKeyBinding context + When | vector / Boolean keys | config / keys slice (TV KeyMap 1.8.0, 1.11.0) |
| LE/30/Na__LayoutEditor__EditScope__.js 1.4.0 | AdoptIntoOpenGroup window (Text / Leader / Dimension into an open group) | group parity for the non-vector tools | sheet-tools slice (v2.142) |
| 54__Feature__ColourPalette (top-level) | palette above colour fields | hatch colour, dimension colour fields (via PanelHost 1.6.0) | colour palette slice |
| LE/30/Na__LayoutEditor__ContextMenu__.js (TV 1.1.0) **[verifier]** | `submenu` flyouts and row `hint` (VV 1.0.0 has 0 `submenu`; it only renders `label` and calls `onSelect`) | the adapter's "Vector tools >" / "Boolean tools >" rows (TV VectorTools__:644, :652) and the Boolean row's key hints | S05a WP-03; without it the flyout rows are dead buttons |
| LE/30/Na__LayoutEditor__Measurements__.js `Na__LeMeasure__Say` (TV 1.6.0) **[verifier]** | Say (VV Measurements 1.4.0 lacks it) | `SheetTools__.js:488/676` `Na__LeVec__SetSpeaker((t) => Na__LeMeasure__Say(t))`; plus the 1.9.0 vector branch | S05a WP-07 (Measurements 1.10.0 whole) |
| LE/10/Na__LayoutEditor__SheetSurface__.js `GetSheetChrome` **[verifier]** | GetSheetChrome (SheetSurface 1.9.0) | ObjectSnap Sources:106 (not this slice, but on the Curves trap path) | S03b / S04b WP-02 |

### d2. Hot files this slice must EDIT (by feature)

- Hatch on vectors: `LE/07/...SheetRecords__.js` (NormaliseShapeHatch; and the site plan hatch normaliser imports HatchPatterns
  FIELD / CAT_FIELD at :396 - so HatchPatterns must land before SheetRecords is ported wholesale), `...SheetModel__Shapes__.js`
  (opts.hatch, patch.hatch merge), `LE/10/...SheetChrome__.js`, `LE/15/...ShapeGeometry__.js`, `LE/30/...Eyedropper__.js`
  (`hatch` trait), `LE/30/...SheetTools__ToolState__.js` (hatchOn / hatch defaults), `LE/05/...ModeController__.js` (Hatch Ready,
  register Patterns), `LE/03/...AppConfig__.json` (labels, AccordionSections).
- Holes / Booleans: SheetRecords (NormaliseShapeHoles), SheetModel__Shapes (holes), ShapeGeometry, SheetChrome, GradientTool,
  HatchPatterns, PointerPress, Keyboard, ContextMenu, HitResolution, SelectionBox, ObjectSnap Sources.
- Vector tools: SheetTools__State, ToolState, PointerPress, PointerDrag, Keyboard, ContextMenu, SheetTools, Measurements,
  Toolbar, ModeController, KeyMap, key JSON, SheetModel facade + Shapes + Groups, ShapeTool.
- Dimension style (at scale, extension lines, round up, line pt, dashes): SheetRecords (NormaliseDimension),
  SheetModel__TextAndDimensions, MarkupBridge, DimensionGeometry, ToolState (dimension defaults), ConfigState__ToolSetup,
  AppConfig JSON, Eyedropper, PanelHost, Styles__Panels.css, DimensionTool, Panel__Dimensions, LineStyleTool.

### d3. Load-order traps and guards

1. Curves before ObjectSnap (headline 3).
2. Every new import name must exist the moment a file lands: TV ShapeGeometry imports `Na__LeChrome__PushQr`; landing it before
   SheetChrome has PushQr is a blank editor. Run `node 80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs 51__System__LayoutEditor`
   after every file batch (exit 0 required) and `Na__Verify__ModuleGraph__.mjs`.
3. Key rows: a `When` row must sit ABOVE the plain row for the same key; `Edit__BooleanTrim` above `Tool__Extend`, `Tool__Trim`
   above `Tool__Text` - in the JSON AND the fallback (TV PLAN__VectorTools:260-266, :321-322).
4. Tests that load sheet-tools units with imports stripped need `Na__LeVec__TOOLS : []` and a `Na__LeScope__IsActive` stub
   (PLAN section 9).
5. Anything that adds or removes a vertex must send hole starts (`HolesAfterInsert`, `RemoveVertices`) - land WP-S05b-09 with
   the Booleans, never after.
6. `Na__LeHandles__Clear` must keep leaving the vector preview SVG alone (Preview owns its clearing). [Verifier: VV
   ViewportHandles:235-238 is identical to TV:371-374 - it only removes `.na-le-selection, .na-le-handle, .na-le-grip`.]
7. **[Verifier]** Register the Vector Tools panel and the toolbar's Circle / Arc only in the SAME release as the hub dispatch
   (S05a WP-08): VV `SheetTools__ToolState__.js:215` maps an unknown tool name to Select, so before dispatch every new button
   silently picks Select.
8. **[Verifier]** Landing ShapeTool 1.10.0 (or TV's ToolState / SheetTools hubs) loads the WHOLE 37 folder, because each
   imports the adapter `VectorTools__.js`, which imports every unit (Circle, Arc, Trim, Join, OffsetTool, BooleanTool, Targets,
   Preview, Setup, State). The 37 units must therefore exist, and resolve, before S05a WP-08.
9. **[Verifier]** `Na__Verify__Exports__` checks EVERY module under `02__Src__AppModules`, reachable or not (VV verifier
   header, "With no arguments it checks every module"). "Inert" landing is only possible once a file's imports resolve: the 37
   interactive units cannot land before ObjectSnap Search, OrthoMode State, ViewportRotation, PaintOrder and the SheetModel /
   ShapeGeometry exports they import. Baseline 01-Oct-2026: Exports PASS (415 files), ModuleGraph PASS (517 modules, 1 known
   vendor issue).

### d4. CSS loading

TV loads the panel CSS of 36 / 37 by `<link>` from the panels themselves (TV Panel__Patterns:361-366, Panel__VectorTools:376),
not from `TV/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css` (verified: neither file is in the index). VV's loader
links the editor CSS in `Na__LeLoad__STYLESHEETS` (VV/LE/01__Core__Loader/Na__LayoutEditor__Loader__.js:125-133). Self-injection
works unchanged in VV because the panels only register after the loader has imported the editor - **no change to the VV loader
or VV CSS index is needed**. The `Linked Pair` region goes into `LE/40/Na__LayoutEditor__Styles__Panels__.css`, which VV's loader
already links.

### d5. Ready chain

TV ModeController:1193 waits on `Na__LeHatch__Ready()` with the other configs; VV ModeController:828 waits on Cfg, Edge,
Composite, Grad, Dash, DrawCfg. Add Hatch Ready (and `Na__LeVec__Initialize()` after History, TV:1198). VectorTools Setup's
config fetch is not in TV's Promise.all (the units read fallbacks until it lands). The hatch library loads serially (1 + 1 + 14 =
16 requests for the construction pack); on VV's lazy first open this adds that many round trips behind the loading screen -
identical to TV's behaviour; optional improvement in both (parallel fetch per pack).

---------------------------------------------------------------------------------------------------

## (e) UI notes (identical Drawing Layout Editor experience)

- Toolbar: Circle and Arc buttons straight after Rectangle, tooltips from the VectorTools config (`ToolCircleTitle`,
  `ToolArcTitle`), TV Toolbar:446-447.
- Right column (TV ModeController:536-553; a section with no `spec.tab` lands on the column's first tab, TV PanelHost:288-293):
  PROPERTIES tab - Parametric properties, Viewport, Text, Leaders, Dimensions, **Vectors**, **Vector Tools** (new, not in the
  accordion), Images*, **Patterns** (new), Floor Areas*; SCRAPBOOK tab - Standard, Parametric, Custom. (*other slices.)
  VV today (VV ModeController:420-433): Properties - Parametric properties, Viewport, Text, Leaders, Dimensions, Vectors;
  Scrapbook - Standard, Parametric, Custom.
- Vectors panel: **Draw at scale (1:N)** first; Edges, Edge colour, Edge pt, opacity rows, Dashed edges block, fill rows, Closed,
  Gradient block, then **Hatch** block last (Pattern, Pattern scale, Pattern deg, Pattern line pt, Pattern colour, Standard
  line and colour, missing-pattern note).
- Dimensions panel (TV Panel__Dimensions:182-219): **Measure at scale (1:N)** first; Text mm; Colour; **Line pt**; **Dashed
  lines** block; Ends; Size mm; Offset mm; **Ext. lines** Start / padlock / End; Decimals; Units; **Round up to 5 mm**; Override;
  the Measures line with "(at the sheet's scale, 1:N)" / "- shown rounded up as 2,090* mm".
- Vector Tools section: rows Draw (Line, Rectangle, Circle, Arc), Edit (Trim, Extend, Join, Split, Offset, Fillet, Chamfer), a
  rule, Boolean (Union, Subtract, Trim, Intersect, Split, Outer Shell); the tool that is up is lit; one hint line (left border
  #336699); only the active tool's settings; Radius / Sides for a selected circle or arc.
- Context menu: a plain vector has **Vector tools >** (pick up a tool, Split here); a closed vector also **Boolean tools >**;
  several selected closed shapes get a **Boolean** row (keys shown); a holed shape greys out **Open shape**.
- Measurements box: Radius / Bulge / Angle / Distance readings while a vector tool is up; `d`, `s`, `r` accepted only for those
  tools; one-line "speaker" messages above the box ("Nothing crosses that line...").
- Previews: red dashed = goes, blue dashed = arrives, heavy blue = held, purple = fence (config `Preview__*`).
- Patterns panel: library tiles in two columns per pack, captioned, drawn in the pack's swatch ink.
- Colour fields open the Colour Palette above them in TV (54 slice); without it VV shows the browser picker only.
- VV identity: these panels use neutral `--na-le-*` fallbacks; VV CSS uses `--Vale_` tokens only in the shell (VV Styles__Main /
  Boot). Verbatim CSS is acceptable; optionally map `--na-le-accent` to a Vale token.

---------------------------------------------------------------------------------------------------

## (f) Decisions needed

| Id | Question | Options | Recommendation |
|---|---|---|---|
| D-S05b-01 | Which hatch packs ship in VV? | (a) Construction Materials only; (b) + the five OS-style Site Plan hatches (usable on any vector for hand-drawn landscape); (c) (a) now + a Vale-specific pack later (e.g. natural stone, render, lead, glazing) | (a) now - consistent with VV's precedent of not carrying NA site plan furniture (VV DEVLOG:360-366); keep the index order so Brickwork stays the default; revisit (b) if VV adopts site plans |
| D-S05b-02 | Patterns panel in VV without a site plan system | (a) adapted library-only panel (drop SpStore + per-layer rows; the same thing TV shows with no site plan viewport selected); (b) wait for the site plan slice and port verbatim; (c) omit the panel (hatch only via the Vectors panel) | (a), recorded as a VV seam in the PORT NOTE; becomes verbatim if VV ever takes site plans |
| D-S05b-03 | ShapeGeometry's QR (Project Portal) and Sheet Images branches | (a) port 53 ProjectQrCode and 54 SheetImages first (other slices) and take ShapeGeometry verbatim; (b) port ShapeGeometry with two documented seams (no QR / Image imports or branches) | follow the 53 / 54 decisions; if either is "not for Vale", (b). Do not block holes / hatch on it |
| D-S05b-04 | Keys in VV | (a) TV's thirteen rows verbatim incl. T = Trim only InContainer and the Shift Boolean keys; (b) different keys for Vale | (a) - same LayOut conventions; and align the key FILE NAME with TV (config slice) so tests port verbatim |
| D-S05b-05 | New shapes ignore the Vectors panel's Hatch setting in TV (tools never pass `hatch`) | (a) fix in TV (pass `hatch : d.hatchOn ? d.hatch : null` in ShapeTool, RectangleTool, CircleTool, ArcTool) and port the fix; (b) replicate TV exactly | (a), after Adam confirms the intended behaviour (the panel already says these are "settings for new shapes") |
| D-S05b-06 | Version numbers on full-body ports | (a) adopt TV's module version (VV log: "aligned to TrueVision 1.12.0 below the header"); (b) keep VV's own sequence | (a) - ends the renumbering that already makes version comparison misleading (Appendix A) |
| D-S05b-07 | TV features in this slice are marked "NOT tried by Adam" and TV still asks Adam to confirm T / When and the panel placement | (a) port now (user asked for exact alignment); (b) wait for TV sign-off | (a), but sequence the Vector Tools / Boolean WPs after WP-01..06 so a late TV change to keys or placement is a small follow-up |
| D-S05b-V01 **[verifier]** | One owner per shared hot file: S05b's hunk-level packages (old WP-03/04/05/06/08/09) touch SheetRecords, SheetModel units, SheetChrome, ShapeGeometry, DimensionGeometry, MarkupBridge, ToolState, the sheet-tools hub, Eyedropper, SelectionBox, KeyMap, Measurements, PanelHost, Styles__Panels, Panel__Shapes, Panel__Dimensions and Toolbar - every one of which another slice ports WHOLE | (a) whole-file owners win (map in section (h)); S05b keeps 35, 36, 37, the 52 library, its tests and the ModeController hatch / vector hunks, and its hunk lists become acceptance checks; (b) S05b lands its hunks first as declared bridges and the whole-file ports re-take the files later | (a). Two agents must never edit one file in parallel; a bridge is allowed only inside the owning WP's file lock and only when that WP is more than one release away |
| D-S05b-V02 **[verifier]** | Resolve D-S05b-01 (hatch packs) and D-S05b-02 (Patterns panel form) together with D-S04a-01 (site plans in VV) | (a) D-S04a-01 = dormant port: Panel__Patterns verbatim, Site Plan pack listed after Construction; (b) no site plans: D-S05b-01 (a) + D-S05b-02 (a) as written | Decide D-S04a-01 first; never ship the adapted panel and then re-port it verbatim a release later |

---------------------------------------------------------------------------------------------------

## (g) Proposed work packages

Each WP ends with: `node 80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs` exit 0, `Na__Verify__ModuleGraph__.mjs` pass,
a VV DEVLOG entry (`## ValeVision3D v2.N.0 - DD-Mon-YYYY - Title`, re-read the devlog top first), PORT NOTE blocks
(Ported from TrueVision3D <path> <version>, Parity, Divergences, Back-port) and ledger rows.

### WP-S05b-01 - Leaves and library content (no wiring)
Scope: add `LE/15/...ShapeRings__.js`, `LE/15/...DimensionRounding__.js`, `LE/36/...HatchPatterns__.js`,
`LE/36/...Styles__Patterns__.css`, `LE/37/...VectorTools__State__.js`, `__Setup__.js`, `__Config__.json`, `__Curves__.js`,
`__Geometry__.js`, `__Offset__.js`, `__Boolean__.js`; app-root `52__LayoutEditor__HatchPatternLibrary/` (root index adapted per
D-S05b-01, `02__ConstructionMaterialHatches/` verbatim). Headers and console prefixes only.
Size: L (about 4,300 lines, mechanical). Depends on: nothing. Hot files: none.
Acceptance: Verify__Exports passes; `Na__Test__DimensionRoundUp__` (ported here) 21/21; the pure-module part of
`Na__Test__VectorTools__` passes; in the browser console on the editor's first open nothing changes (modules unreferenced) and
`fetch('52__LayoutEditor__HatchPatternLibrary/HatchLibrary__Index__.json')` resolves on localhost (Flask) and live.

### WP-S05b-02 - Prerequisite leaves owned by other slices (coordination)
Scope: if not already landed by their owners, add verbatim `LE/32__System__OrthoMode/Na__LayoutEditor__OrthoMode__State__.js`,
`LE/27__System__DrawingGrid/Na__LayoutEditor__DrawingGrid__State__.js`, `LE/20__System__Viewports/Na__LayoutEditor__ViewportRotation__.js`,
`LE/15__Core__Markup/Na__LayoutEditor__PaintOrder__.js` and `Na__LeModel__IsLayerSelectable` (+ facade re-export). All inert.
Size: S. Depends on: nothing. Hot files: `LE/07/Na__LayoutEditor__SheetModel__.js`, `LE/07/...SheetModel__Layers__.js`.
Acceptance: Verify__Exports passes; Ortho and grid default off (no UI yet); no visible change.

### WP-S05b-03 - Record schema, model API, defaults and config
**REFUTED by verifier (as a standalone package):** every file is ported WHOLE elsewhere - SheetRecords, SheetModel__Shapes /
Groups / TextAndDimensions and the facade (S03b WP-03, WP-04), ToolState (S05a WP-08), ConfigState__ToolSetup and the AppConfig
dimension / shape keys (S05a WP-04), the Dim* / ShapeHatch* labels (S06a WP-07). Keep the scope list below as the ACCEPTANCE
checklist for those packages (D-S05b-V01).
Scope: SheetRecords NormaliseShapeHatch / ShapeCurve / ShapeHoles and NormaliseDimension (AtScale, RoundUp, LinePt, LineStyle,
Start/End extension, linked); SheetModel__Shapes (InsertShape afterId, CreateShape hatch / curve / holes, UpdateShape hatch merge /
curve / holes, AnnounceShapes); SheetModel__Groups AddGroupMember; SheetModel__TextAndDimensions create / patch keys; facade
re-exports; ToolState shape defaults (atScale from config, hatchOn, hatch) and dimension defaults (atScale, roundUp, linePt,
dashOn, dash, start/end extension, linked); ConfigState__ToolSetup readers; AppConfig JSON keys and labels (list in b6).
Size: M (about 400 lines of hunks). Depends on: WP-01. Hot files: `LE/07/...SheetRecords__.js`, `...SheetModel__.js`,
`...SheetModel__Shapes__.js`, `...SheetModel__Groups__.js`, `...SheetModel__TextAndDimensions__.js`,
`LE/30/...SheetTools__ToolState__.js`, `LE/03/...ConfigState__ToolSetup__.js`, `LE/03/...AppConfig__.json`.
Acceptance: a sheet saved before the change re-saves byte-identical (TV's "kept only while it says something" rule); a record
with each new key round-trips; `Na__Test__VectorBooleans__` normaliser checks pass.

### WP-S05b-04 - Painting: hatch deck, holes, dimension styles
**REFUTED by verifier (as a standalone package):** SheetChrome, ShapeGeometry and DimensionGeometry are S03b WP-06 whole-file
ports and MarkupBridge is S03b WP-07 (with the AtScale DimensionValueMm line also offered as S03b WP-01's bridge). The two
S05b-owned files (GradientTool 1.1.0, LineStyleTool 1.1.0) move to WP-S05b-V1. The acceptance lines below stay as checks on
S03b WP-06 / WP-07.
Scope: SheetChrome (Hatch / HatchInk / Holes on the polyline primitive, HatchDef colour order, PolylineD, PdfTrace, even-odd SVG
and PDF); ShapeGeometry 1.9.0 (hatch deck, holes; QR / Image per D-S05b-03); GradientTool 1.1.0; DimensionGeometry 1.6.0;
MarkupBridge hunks (DimensionValueMm via DrawingScale, DimensionExtension, round-up FormatDimension, DimensionStrokeMm(dim),
SheetDimensionPt, dash pattern); LineStyleTool 1.1.0.
Size: M (about 500 lines). Depends on: WP-01, WP-03. Hot files: `LE/10/...SheetChrome__.js`, `LE/15/...MarkupBridge__.js`.
Acceptance: a hatched rectangle paints fill -> hatch -> outline on screen and in the jsPDF output (tiles clipped); a holed record
paints `M..Z M..Z` with `fill-rule="evenodd"` and `B*` / `f*` in the PDF; a dimension with LinePt 1 and Dash-dot draws a 0.353 mm
stroke and `[8,2,2,2]` on the three rules with solid ticks; `Na__Test__HatchLineControls__` (adapted) passes.

### WP-S05b-05 - Dimensions experience
**REFUTED by verifier (as a standalone package):** Panel__Dimensions is S06a WP-07 (whole), PanelHost and Styles__Panels are
S06a WP-02 (whole), the Eyedropper traits come with S05a WP-06 (Eyedropper 1.9.0 + v2.152 whole), and DimensionTool's
create-time fields come with WP-S05b-07 (whole body). Sequencing note: if S06a WP-07 lands before WP-S05b-07, new dimensions
ignore the panel's new-dimension settings until WP-S05b-07 lands - either land WP-S05b-07 first or apply the create-options
hunk (TV DimensionTool create block, v2.40/v2.41/v2.139/v2.152) as WP-S05b-07's first step.
Scope: Panel__Dimensions 1.7.0; PanelHost LinkedPairRow / ShowLink; Styles__Panels `Linked Pair` region; Eyedropper dimension
traits (start/end extension, linked, roundUp, linePt, dash); DimensionTool record fields (atScale, roundUp, linePt, dash,
extensions) - the snap / grid / ortho hunks wait for WP-07.
Size: M. Depends on: WP-03, WP-04. Hot files: `LE/40/...PanelHost__.js`, `LE/40/...Styles__Panels__.css`,
`LE/30/...Eyedropper__.js`, `LE/35/...DimensionTool__.js`.
Acceptance (in VV, scratch A3 sheet, writes blocked): Measure at scale toggles and its label quotes the scale; Ext. lines padlock
links Start / End; Round up turns 2,089 into 2,090* with the Measures line saying so; Line pt / Dashed lines apply to one, several
and new dimensions; the eyedropper copies all of them; one undo step per change.

### WP-S05b-06 - Hatch experience
**REFUTED by verifier (as a standalone package):** Panel__Shapes 1.9.0 is S06a WP-07 (whole; its 1.8.1 fix is S06a WP-01),
the Eyedropper `hatch` trait is S05a WP-06, labels are S06a WP-07. The S05b-owned remainder (Panel__Patterns, the
ModeController Hatch Ready / Patterns registration / accordion hunks that S03a defers to "the Hatch port") is WP-S05b-V2.
Scope: Panel__Shapes 1.9.0 (Draw at scale, hatch block, 1.8.1 fix); Panel__Patterns (adapted per D-S05b-02) +
Styles__Patterns (already in WP-01); ModeController (Hatch Ready in the ready chain, register Patterns, AccordionSections
`patterns`); Eyedropper `hatch` trait; labels.
Size: M. Depends on: WP-03, WP-04. Hot files: `LE/05/...ModeController__.js`, `LE/30/...Eyedropper__.js`, `LE/03/...AppConfig__.json`.
Acceptance: tick Hatch on a closed shape -> Brickwork applies, scale / deg / line pt / colour / Standard behave as in TV v2.126;
PDF prints it; Patterns panel shows the Construction pack tiles; several selected + Edges off no longer repaints fills.

### WP-S05b-07 - Drawing tools onto Object Snap, grid and ortho (verbatim bodies)
**[Verifier]** Kept. Its dependency on the refuted WP-05 becomes S03b WP-03 (dimension record keys and create options) and
S05a WP-08 (ToolState new-dimension defaults); S04b WP-07 (same five files) becomes its verify-only twin. ShapeTool moves to
WP-S05b-V4. No interim swap to VV Snapping for DimensionTool (TARGET_DIMENSION) - see b1.
Scope: DimensionTool 1.12.0 (+v2.152), RectangleTool 1.4.0, TextTool 1.4.0, LeaderTool 1.2.0 (ShapeTool 1.10.0 needs the 37
adapter and lands in WP-08); retire their imports of VV `30__System__SheetTools/Na__LayoutEditor__Snapping__.js`.
Size: M. Depends on: ObjectSnap slice (28 landed), WP-01 (Curves), WP-02, WP-05 (DimensionTool fields). Hot files: the four
tool files only.
Acceptance: code-only diff of the four files vs TV is empty (header excepted); markers coloured by target; Perpendicular from the
first point works for a dimension; F7 / F8 behaviour once their UI lands.

### WP-S05b-08 - Vector Tools (interactive), Booleans, keys, toolbar
**REFUTED by verifier (as written):** it mixes S05b-owned files with anchored hunks into VV's OLD hubs (SheetTools__State,
ToolState, PointerPress, PointerDrag, Keyboard, ContextMenu, SheetTools, Measurements, KeyMap) that S05a WP-05 / WP-07 / WP-08
replace WHOLE with TV's files - which already contain this dispatch. Replaced by WP-S05b-V3 (37 units landed inert) and
WP-S05b-V4 (the cross-slice switch-on release). It also missed two prerequisites: ContextMenu 1.1.0 flyouts (S05a WP-03) and
Measurements `Say` (S05a WP-07).
Scope: 37 Preview, Targets, Circle, Arc, Trim, Join, OffsetTool, BooleanTool, adapter, Panel__VectorTools, Styles; dispatch
hunks in SheetTools__State, ToolState, PointerPress, PointerDrag, Keyboard (situations, commands), ContextMenu, SheetTools
(Measurements context, speaker), Measurements (vector branch, TypingExtras); KeyMap When support (if the keys slice has not) +
13 key rows in JSON and fallback; Toolbar Circle / Arc; ModeController register after Shapes + `Na__LeVec__Initialize()`;
ShapeTool 1.10.0 verbatim (ObjectSnap, Ortho, AdoptIntoOpenGroup).
Size: XL (about 4,600 lines verbatim + about 350 lines of hunks). Depends on: WP-01..04, WP-07 (ObjectSnap), WP-02, WP-09
(same release). Hot files: `LE/30/...SheetTools__State__.js`, `...SheetTools__ToolState__.js`, `...SheetTools__PointerPress__.js`,
`...SheetTools__PointerDrag__.js`, `...SheetTools__Keyboard__.js`, `...SheetTools__ContextMenu__.js`, `...SheetTools__.js`,
`...Measurements__.js`, `LE/40/...Toolbar__.js`, `LE/05/...ModeController__.js`, `LE/03/...ConfigState__KeyMap__.js`,
`LE/03/Na__LayoutEditor__KeyMappings__.json` (or its renamed successor), `LE/35/...ShapeTool__.js`.
Acceptance: the TV PLAN section 7 script, in VV, writes blocked: C + two clicks + 750 Enter; 6s hexagon; four arc modes; T on the
sheet is Text, inside a group Trim and the group stays open; Shift+T Extend; a three-line fence is one Ctrl+Z; J joins and keeps
the first line's style; U splits both lines at a crossing; F / Shift+F / Shift+C with typed sizes; three wall rectangles
Shift+U into one ten-corner outline; Subtract cuts a hole; Shift+O fills it; a capital U typed in a text box leaves shapes alone;
`Na__Test__VectorTools__` 138/138 and `Na__Test__VectorBooleans__` 148/148 against VV's files.

### WP-S05b-09 - Holes awareness in the sheet tools
**REFUTED by verifier (as a standalone package):** all five files are S05a whole-file ports (SelectionBox 1.7.0 in S05a WP-06;
PointerPress 1.10.0, Keyboard 1.18.0, ContextMenu 1.7.0, HitResolution 1.11.0 in S05a WP-08), each of which already carries
the v2.150 holes code. Its rule survives as a release gate: S05a WP-08 and the Boolean tools (WP-S05b-V4) ship in ONE release.
Scope: PointerPress 1.9.0 (Shift-click insert sends HolesAfterInsert), Keyboard 1.17.0 (Delete in a vector via RemoveVertices),
ContextMenu 1.7.0 (Insert point / Open shape on a holed shape), HitResolution 1.11.0 (EdgeEnd), SelectionBox 1.7.0 (rings);
ObjectSnap Sources 1.2.0 comes with the ObjectSnap slice.
Size: S. Depends on: WP-03, WP-04. Must ship in the same VV release as WP-08's BooleanTool. Hot files: `LE/30/...PointerPress__.js`,
`...Keyboard__.js`, `...ContextMenu__.js`, `...HitResolution__.js`, `LE/30/...SelectionBox__.js`.
Acceptance: insert a point on a holed shape's outline -> the hole stays intact and moves its start by one; delete two of a hole's
corners -> the hole goes; a click in a hole selects what is under it; the box selection reads each ring.

### WP-S05b-10 - Tests
**[Verifier]** Kept, with two changes: it depends on WP-S05b-V4 and S05a WP-05 / WP-08 (the VectorBooleans suite loads the
shipped SheetTools__State and __Keyboard and the renamed key file), and it is the single owner of DimensionRoundUp /
HatchLineControls only if S03b and S06a cite them as acceptance rather than porting them again.
Scope: port `Na__Test__VectorTools__`, `Na__Test__VectorBooleans__`, `Na__Test__HatchLineControls__` (adapted), `Na__Test__DimensionRoundUp__`
(if not in WP-01); add stubs to VV copies of `Na__Test__CrossSheetClipboard__` / `Na__Test__SetMoveLeaderTips__` when those exist.
Size: L. Depends on: the WPs each test covers. Hot files: none (tests only).
Acceptance: each suite passes under Node against VV's shipped files; each adaptation is listed at the top of the test.

### WP-S05b-11 - Ledgers, devlogs and TV doc back-ports
Scope: VV ledger - a "Return trip" section for 36 / 37 / 52 / dimension styles, close the skipped rows (VV ledger:482, :504-508,
:520-521), add 36 and 37 to the subfolders table (:1120-1136), correct the harness note (:44-49); VV LeaderTool log 1.1.0; TV
back-port notes for Adam: TV DimensionTool 1.13.0 log entry (v2.152), TV LineStyleTool / DimensionTool stale port notes, TV
AppConfig label misplacement (Selection block :357-369), TV realign plan section 12 rows for v2.90+, the hatch-default defect
(D-S05b-05).
Size: S. Depends on: the WPs above. Hot files: `VV/ValeVision__PARITY__TrueVisionLedger__.md`, `VV/ValeVision__DEVLOG__.md`.
Acceptance: every module pair in this slice has one ledger row with parity state and checked date.

Suggested order: 01 -> 02 -> 03 -> (04, then 05 and 06 in parallel) -> [ObjectSnap slice] -> 07 -> (08 + 09 together) -> 10 -> 11.
**[Verifier] Superseded by the cross-slice order in section (h).**

---------------------------------------------------------------------------------------------------

## (h) Verifier: cross-slice ownership, replacement work packages and the integrated order

Added by the S05b adversarial verifier, 01-Oct-2026, after reading the S03a, S03b, S04a, S04b, S05a, S06a and S07a slice
reports. This slice's hunk-level packages touched files that FIVE other slices port whole. The table below is the proposed
single owner per file (decision D-S05b-V01). "S05b keeps" means this slice's swarm agent edits the file; everything else is
edited only by its owner, and this slice's old WP text becomes that owner's acceptance checklist.

### h1. Owner per hot file

| File (LE/ unless stated) | Owner (whole-file port) | Also claimed by | What S05b needs from it |
|---|---|---|---|
| `35/` DimensionTool, ShapeTool, RectangleTool, TextTool, LeaderTool | **S05b WP-07 / V4** | S04b WP-07 (it says "or verify after the DrawingTools slice's whole-file ports" - make it verify-only) | - |
| `35/` GradientTool 1.1.0, LineStyleTool 1.1.0 | **S05b WP-V1** | S03b WP-06 lists GradientTool as a hot file | must precede S03b WP-06 (SheetChrome calls `DrawPdf(..., holes)`) and S06a WP-07 (Panel__Dimensions passes `{ prefix : 'dim' }` - VV LineStyleTool 1.0.0 ignores it and would build duplicate `shape-dash` controls) |
| `36/` HatchPatterns, Styles__Patterns | **S05b WP-01** | S04a WP-10 | must precede S03b WP-03 (TV SheetRecords:396 imports it) and S03b WP-06 (TV SheetChrome:191) |
| `36/` Panel__Patterns | **S05b WP-V2** | S04a WP-10 | form per D-S05b-V02 |
| `37/` all 18 files | **S05b WP-01 (leaves) + WP-V3 (units, panel, CSS)** | S04b WP-01 (Curves only) | units must precede S05a WP-08 (TV ToolState:133, PointerPress:195, PointerDrag:405, Keyboard:246, ContextMenu:206, SheetTools:489, State:121 import the adapter / State / Setup) and S06a WP-10 (Toolbar:207-208) |
| `52__LayoutEditor__HatchPatternLibrary/` (app root) | **S05b WP-01** | S04a WP-10 (site pack) | - |
| `15/` ShapeRings, DimensionRounding | S03b WP-02 | S05b WP-01, S04b WP-01 (ShapeRings) | whoever lands first; the others skip |
| `15/` PaintOrder | S03b WP-02 | S05b WP-02 | before WP-V3 (BooleanTool:99) |
| `07/` SheetRecords, SheetModel__Shapes / Groups / TextAndDimensions / Layers, facade | S03b WP-03, WP-04 | S05b old WP-03, S04b WP-02 (IsLayerSelectable) | AddGroupMember, AnnounceShapes, IsLayerSelectable, InsertShape afterId, opts/patch hatch / curve / holes, dimension keys - before WP-V3 |
| `10/` SheetChrome; `15/` ShapeGeometry, DimensionGeometry | S03b WP-06 | S05b old WP-04, S04b WP-02 (ShapeGeometry Holes / Rings / EdgePairs) | before WP-V3 and before the ObjectSnap folder |
| `15/` MarkupBridge | S03b WP-07 (S03b WP-01 = optional AtScale bridge) | S05b old WP-04 | before S06a WP-07 (SheetDimensionPt) |
| `30/` SheetTools hub (State, ToolState, HitResolution, PointerPress, PointerDrag, Keyboard, SheetTools, SheetTools__ContextMenu) | S05a WP-08 | S05b old WP-08 / WP-09 / WP-03 (ToolState) | switch-on of the vector tools |
| `30/` Eyedropper, SelectionBox, EditScope | S05a WP-06 | S05b old WP-05 / WP-06 / WP-09 | hatch + six dimension traits; ring-aware box select |
| `30/` ContextMenu (flyouts) | S05a WP-03 | - (missed by the survey) | "Vector tools >" / "Boolean tools >" rows |
| `30/` Measurements | S05a WP-07 | S05b old WP-08 | `Say`, vector readings, TypingExtras d / s / r |
| `03/` ConfigState__KeyMap, key JSON (rename to `Na__Hotkeys__DrawingTabs__.json`) | S05a WP-05 | S05b old WP-08, D-S05b-04 | 13 vector / Boolean rows with `When` |
| `03/` ConfigState__ToolSetup, AppConfig sheet-tool keys | S05a WP-04 | S05b old WP-03 | defaultAtScale x2, defaultRoundUp, defaultExtensionMm, RoundUpStepMm / Marker |
| `40/` PanelHost, Styles__Panels | S06a WP-02 | S05b old WP-05 | LinkedPairRow / ShowLink, Linked Pair CSS |
| `40/` Panel__Shapes, Panel__Dimensions (+ Dim* / ShapeHatch* labels) | S06a WP-07 (1.8.1 fix in S06a WP-01) | S05b old WP-05 / WP-06 | - |
| `40/` Toolbar | S06a WP-10 (whole, 1.24.0) | S05b old WP-08 (Circle / Arc hunk) | if S06a WP-10 is later than WP-V4, WP-V4 applies only the Circle / Arc hunk |
| `05/` ModeController | S03a (it defers the hatch / vector hunks to their feature ports - S03a report lines 503 and 506) | - | Hatch Ready + Patterns registration (WP-V2); Vector Tools registration + `Na__LeVec__Initialize` (WP-V4) |

### h2. Replacement work packages (S05b-owned only)

- **WP-S05b-V1 - GradientTool 1.1.0 and LineStyleTool 1.1.0 (S).** Verbatim bodies below VV headers (console prefix in
  GradientTool). Depends: ShapeRings (S03b WP-02 or S05b WP-01). Before S03b WP-06 and S06a WP-07. Acceptance: Verify__Exports
  exit 0; Vectors panel dashed rows unchanged (prefix defaults to `shape`); a gradient PDF of a plain shape is unchanged.
- **WP-S05b-V2 - Patterns panel and the hatch ready chain (S).** Panel__Patterns (verbatim if D-S04a-01 = dormant site plans,
  else the library-only adaptation of D-S05b-02); ModeController: `Na__LeHatch__Ready()` in the ready `Promise.all` (VV :828),
  `Na__LePanelPatterns__Register()` after the Scrapbook registrations, `patterns` in `LayoutEditor__Panels__AccordionSections`.
  Depends: WP-01; lands no later than S06a WP-07 (the Vectors hatch block). Acceptance: Patterns section on the Properties tab,
  hidden until the library loads, Construction tiles in `#333333`.
- **WP-S05b-V3 - The 37 interactive units landed inert (L).** Preview, Targets, CircleTool, ArcTool, TrimTool, JoinTool,
  OffsetTool, BooleanTool, the adapter `VectorTools__.js`, Panel__VectorTools and Styles__VectorTools, verbatim below VV headers.
  Nothing imports them yet (no registration, no hub dispatch, ShapeTool unchanged). Depends: WP-01, WP-02, S04b ObjectSnap folder
  (Search), S03b WP-03 / WP-04 (model API), S03b WP-06 (ShapeGeometry Rings, holes). Acceptance: Verify__Exports exit 0 (it checks
  unreachable files too); ModuleGraph unchanged; editor behaviour unchanged.
- **WP-S05b-V4 - Vector tools and Booleans switched on (M, ONE release with S05a WP-03, WP-05, WP-07 and WP-08).** ShapeTool
  1.10.0 verbatim; ModeController `Na__LePanelVec__Register()` straight after `Na__LePanelShapes__Register()` and
  `Na__LeVec__Initialize()` after `Na__LeHist__Initialize()`; Toolbar Circle / Arc hunk unless S06a WP-10 ships in the same
  release. Acceptance: TV PLAN__VectorTools section 7 script in VV with writes blocked; `Na__Test__VectorTools__` 138/138 and
  `Na__Test__VectorBooleans__` 148/148 against VV files; the holes rules (insert keeps a hole, deleting two corners removes it, a
  click in a hole selects what is under it).

Kept as written: WP-S05b-01 (skip ShapeRings / DimensionRounding if S03b WP-02 or S04b WP-01 landed them), WP-S05b-02 (already
conditional), WP-S05b-07 (S04b WP-07 becomes its verification), WP-S05b-10 (now also depends on WP-V4 and S05a WP-08; one owner
per test, see b9), WP-S05b-11.

### h3. Integrated order

1. S04b WP-01 / S05b WP-01 / S03b WP-02 leaves (Curves, ShapeRings, ViewportRotation, DimensionRounding, PaintOrder,
   HatchPatterns, 37 leaves, the 52 library) - whichever lands first, the others skip.
2. S05b WP-02 (Ortho / Grid State, IsLayerSelectable if still missing) and S05b WP-V1.
3. S03b WP-03 / WP-04 (records and model), then S03b WP-06 (chrome and geometry) and WP-07 (MarkupBridge).
4. S06a WP-02 (PanelHost), S05a WP-06 (Eyedropper 1.9.0 + v2.152 traits, SelectionBox, EditScope), S05b WP-V2 (Patterns +
   Hatch Ready), then S06a WP-07 (Dimensions and Vectors panels; several-selected edits go through the Eyedropper traits).
5. S04b ObjectSnap folder, then S05b WP-07 (drawing tools; S04b WP-07 verifies).
6. S05b WP-V3 (37 units, inert).
7. ONE release: S05a WP-03 (flyouts), WP-05 (KeyMap + rows), WP-07 (Measurements), WP-08 (hub, incl. the v2.150 holes code)
   + S05b WP-V4 (+ S06a WP-10 if ready).
8. S05b WP-10 (tests), WP-11 (ledgers).


## Appendix A - Version equivalence (content, not numbers)

| File | VV version -> TV equivalent | TV content VV lacks |
|---|---|---|
| DimensionTool | VV 1.1=TV 1.1; 1.2=1.2; 1.3=TV 1.5 (tick size); 1.4=TV 1.3 minus atScale; 1.5=TV 1.6+1.7 | 1.3 atScale, 1.4, 1.8-1.12, v2.152 |
| DimensionGeometry | VV 1.1=TV 1.1; VV 1.2=TV 1.3-1.5.1 | 1.2, 1.6 |
| ShapeGeometry | VV 1.1-1.5 = TV 1.1-1.5 | v2.90 hatch (unlogged), 1.6-1.9 |
| ShapeTool | VV 1.0-1.6 = TV 1.0-1.6 | 1.7-1.10 |
| RectangleTool | VV 1.0-1.2 = TV 1.0-1.2 | 1.3, 1.4 |
| TextTool | VV 1.3 = TV 1.3 | 1.4 |
| LeaderTool | VV header 1.0; code = TV 1.1 | 1.2 |
| GradientTool / LineStyleTool | VV 1.0 = TV 1.0 | 1.1 |
| Panel__Shapes | VV 1.3-1.5 = TV 1.3-1.5; VV 1.6 = TV 1.7; VV 1.8 = TV 1.8 | TV 1.6, v2.90 hatch block (unlogged), 1.8.1, 1.8.2, 1.9 |
| Panel__Dimensions | VV 1.1=TV 1.1; VV 1.2=TV 1.4; VV 1.4=TV 1.5 | TV 1.2, 1.3, 1.6, 1.7 |
| PanelHost | VV 1.1 = AdvancedToggle (present in TV, exported at TV PanelHost:863, but unlogged there); VV 1.2 = TV 1.1 (SliderRow); VV 1.3 = TV 1.3; VV 1.4 = TV 1.4 | TV 1.2 LinkedPairRow / ShowLink, 1.5, 1.6 |

## Appendix B - TV DEVLOG entries for this slice (line in TV/TrueVision__DEVLOG__.md)

| Release | Line | Title (short) | Touches in this slice |
|---|---|---|---|
| v2.40.0 | 12632 | Measurements box and drawing at scale | Panel__Shapes 1.6.0, Panel__Dimensions 1.2.0, DimensionTool 1.3.0 atScale (VV skipped) |
| v2.41.0 | 12545 | Fixed length extension lines | DimensionGeometry 1.2.0, DimensionTool 1.4.0, Panel__Dimensions 1.3.0, PanelHost 1.2.0, MarkupBridge 1.8.0 (VV skipped) |
| v2.90.0 | 7464 | A hatch on any vector | HatchPatterns, ShapeGeometry, Panel__Shapes, SheetChrome, SheetRecords |
| v2.101.0 | 6251 | Pattern keeps its own ink | HatchPatterns 1.2.0, site plan pack |
| v2.106.0 | 5787 | Layers list = paint order (+ Edges-off fix) | PaintOrder (dependency), Panel__Shapes 1.8.1 |
| v2.113.0 / v2.114.0 | 5206 / 5072 | Ortho mode / Drawing grid | tool hooks (DimensionTool 1.8 / 1.9, ShapeTool 1.8, TextTool 1.4, LeaderTool 1.2) |
| v2.123.0 | 4231 | Reference layers | DimensionTool 1.10.0 |
| v2.126.0 | 3982 | Colour palette; hatch line weight and colour; Construction pack | HatchPatterns 1.3.0, Panel__Shapes 1.9.0, Panel__Patterns 1.1.0, library |
| v2.129.0 | 3651 | Object Snap folder | tool imports (DimensionTool 1.11.0, ShapeTool 1.9.0, Rectangle, Leader) |
| v2.130.0 | 3544 | Vector editor tools | 37 folder, ShapeTool 1.10.0, keys, container rule |
| v2.136.0 | 3013 | Vector quality control (Low / Medium / High) | NOT this slice (VectorQuality in 20) |
| v2.139.0 | 2720 | Round up to 5 mm | DimensionRounding, MarkupBridge 1.18.0, Panel__Dimensions 1.6.0, DimensionTool 1.12.0 |
| v2.142.0 | 2384 | Placed inside an open group joins it | EditScope / ToolState (other slice); DrawInsideOpenGroup note in the 37 config |
| v2.150.0 | 1552 | Booleans and holes | ShapeRings, Boolean, BooleanTool, ShapeGeometry 1.9.0, GradientTool 1.1.0, HatchPatterns 1.4.0, SheetChrome 1.14.0, sheet tools |
| v2.151.0 | 1481 | Boolean keys | keys, KeyMap 1.11.0, Keyboard 1.18.0, adapter 1.2.0, BooleanTool 1.1.0 |
| v2.152.0 | 1428 | Dimension line weight and style | LineStyleTool 1.1.0, Panel__Dimensions 1.7.0, DimensionGeometry 1.6.0, MarkupBridge 1.20.0, DimensionTool (unlogged) |
| v2.160.0 / v2.164.0 | 967 / 620 | Site plan holes in PDF / site legend | site plan only (ShapeRings 1.1.0 FacesFromRings, HatchPatterns 1.5.0 TileMarks) |

## Appendix C - Reproducibility

Scripts in `scratchpad/parity/work_S05b/`: `resolve.py` (TV import names vs VV exports), `graph.py tv|vv <needle>` (importers),
`codediff.py [-v] <LE relpath>` (header-stripped code diff), `devlog_entries.py <file> <regex> [--all|--full]`, `cfgdiff.py <regex>`,
`keys.py`. Raw outputs: `import_resolution.txt`, `tv_importers_vectortools_full.txt`, `cfg_slice_diff.txt`, `keys_compare.txt`,
`diff__*.txt`.

---------------------------------------------------------------------------------------------------

## Verification

Adversarial verification of this slice, 01-Oct-2026, read-only on both apps (TV HEAD b2aa9151, VV HEAD 7b4e593a). Working
files: `scratchpad/parity/verify_s05b/` (`revexp.py` reverse-export check, `vvlines.py` VV-side code lines, `keys_vv.py`,
`cfgcheck.py`, `patch_report.py`, and a copy of this report as it was before the edits, `S05b__backup_before_verify.md`).

### What was checked (and found right)

- **Coverage.** Every in-scope file in `drift_all.tsv` / `tree_tv.tsv` / `tree_vv.tsv` is accounted for: LE/35 9 + 9 files
  (7 drifted JS, 2 identical JSON), LE/36 3 TV-only (1,480 lines), LE/37 18 TV-only (7,385 lines - summed), the app-root
  library 24 files (root index + 2 PNG + 15 + 6), LE/15 ShapeGeometry, DimensionGeometry, ShapeRings, DimensionRounding,
  PaintOrder, LE/40 Panel__Shapes, Panel__Dimensions, VV-only Snapping, and the 4 + 4 tests. Added: three more TV suites that
  load this slice's files (b9).
- **"VV lacks" claims.** Grepped all of `VVM` (not only LE): zero `Shape__Holes`, `Shape__Curve`, `Na__LeVec`, `Na__LeRings`,
  `Clipper2`/`clipper2` (source), `Dimension__RoundUp / LinePt / LineStyle / StartExtensionMm`, `AddGroupMember`, `AnnounceShapes`,
  `IsLayerSelectable`, `LinkedPairRow`, `ShowLink`, `MarkupBackToFront`, `Na__LeOrtho`, `Na__LeGrid`, `ViewportRotation`, `Fillet`,
  `Chamfer`; the only "hatch" in VV is the phrase "escape hatch" in `46__System__ElevationViews`. No equivalent exists under another
  name or namespace (VV's `Na__LeOsnap` hits are the VV-only `Snapping__.js` and its 10 importers).
- **VV seams.** Re-ran the header-stripped code diff for all 11 shared JS files and read every VV-side line: each is older TV
  code (the Snapping import, `TONE_DIMENSION`, old `DrawPdf`, old `CONTROLS`, `DimPaperOnly` - which TV still uses at
  Panel__Dimensions:250). The VV ledger's "DimensionTool BeginTextEdit stays ValeVision's" (ledger :507) is stale: both files use
  `Na__LeMarkup__DimensionTextLayout`.
- **Verbatim safety.** Reverse-export check (VV exports that a TV body would drop, with their VV importers): none for the seven
  tools, ShapeGeometry, DimensionGeometry, both panels, SheetChrome, MarkupBridge, PanelHost, SheetModel, Eyedropper, ToolState,
  KeyMap, Toolbar; only `SheetRecords` (`Na__LeRec__SheetShortCode`, S03b's seam) and `HitResolution`
  (`Na__LeTools__SnapShapeTranslation`, S04b / S05a) - both outside this slice. Brand check: the 36 / 37 / 15 leaves and the
  Construction pack carry NA only in AUTHOR lines, "Authored in TrueVision3D first" port notes and 6 console prefixes.
- **Versions and devlog lines.** Every Appendix B line number matches `tv_devlog_index.txt`; TV module versions confirmed by
  header for DimensionTool 1.12.0, ShapeGeometry 1.9.0, SheetChrome 1.14.0, MarkupBridge 1.20.0, Panel__Shapes 1.9.0,
  Panel__Dimensions 1.7.0, PanelHost 1.6.0, KeyMap 1.11.0, EditScope 1.4.0, Measurements 1.10.0, SheetModel__Shapes 1.6.0; VV
  1.5.0 / 1.5.0 / 1.5.0 / 1.10.0 / 1.8.0 / 1.4.0 / 1.4.0 / 1.0.0 / 1.1.0 / 1.4.0 / 1.0.0. Appendix A's renumbering map checked for
  DimensionTool, Panel__Dimensions, PanelHost (AdvancedToggle at TV PanelHost:603/:863, unlogged) and LeaderTool (VV log 1.0.0,
  SpecLinks code at VV :80/:140/:304/:306). v2.152's DimensionTool hunk is unlogged in the module (TV DEVLOG:1428-1478 lists it).
- **Live bug.** VV Panel__Shapes:358-363 has no `ApplyToSelection(..., { stroked : false })` early return (TV :546), and VV's
  `Apply` (:304-311) sends `{ stroked : false, fillColour }` to every selected vector - the v2.106 "every room the same blue" bug
  is live in VV. `ApplyToSelection` exists in VV PanelHost:542, so the one-line fix can land alone (S06a WP-01 plans it).
- **Probable TV defect (D-S05b-05).** `hatchOn` is read only in ToolState:235 and Panel__Shapes; ShapeTool, RectangleTool,
  CircleTool and ArcTool contain no "hatch"; `CreateShape` accepts `opts.hatch` (Shapes:239); nothing else applies `d.hatch` to a
  new shape. Confirmed as written.
- **TV config defect.** JSON parse: the three `LayoutEditor__Labels__Measure*` keys sit in `LayoutEditor__Selection__Config` in
  TV and in `LayoutEditor__Labels__Config` in VV; `Na__LeCfg__GetLabel` reads only the Labels block (TV ConfigState:372-375).
- **Transport.** No route, worker or R2 key is involved: library and configs resolve from `import.meta.url` (TV
  HatchPatterns:108-111; VV ScrapbookCustom__Transport__:81 does the same); Flask `/ValeVision3D/<path:filename>` at
  WCP/server.py:871-888; live host is GitHub Pages and publishes the new folder unchanged (b8).
- **Keys.** TV vs VV key rows on C, J, U, F, S, T, A, O compared from the JSON files; VV's global 3D hotkey dictionary checked
  too (b7). No new clash.
- **Baseline.** `node 80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs` in VV: PASS, 415 files.
  `Na__Verify__ModuleGraph__.mjs`: PASS, 517 modules from 1 entry (it follows dynamic `import()`), 1 known vendor issue
  (three-edge-projection worker). Both scripts write nothing.

### What was corrected (in place above)

1. Headline 3 / F08: Curves is one of four outside-folder imports of ObjectSnap Sources that VV lacks; ShapeGeometry
   `Rings`/`EdgePairs`, `IsLayerSelectable` and `GetSheetChrome` must also precede the ObjectSnap folder.
2. b1, c1, F13, F14, F38: the "interim swap to VV Snapping" cannot work for DimensionTool (`TARGET_DIMENSION`) or ShapeTool
   (`TARGET_SHAPE`) - VV Snapping exports neither; it works only for RectangleTool, LeaderTool and the six 37 tools.
3. b2, c4, F21: ShapeGeometry's Sheet Images branch reaches TV's worker client (`54/...SheetImages__Paint__` -> `__Source__` ->
   `80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js`), a DIV-4 transport dependency; verbatim needs a VV
   transport adapter (S07a) or the D-S05b-03 (b) seam.
4. b4, F05, F06: D-S05b-01 / D-S05b-02 depend on D-S04a-01 (S04a recommends a dormant verbatim site plan port, which makes
   Panel__Patterns verbatim and ships the Site Plan pack) - new decision D-S05b-V02.
5. b5, F34: TV Toolbar is 1.24.0 (Circle / Arc added in 1.21.0); S06a WP-10 owns the whole-file port.
6. b6, F36: 15 `ShapeHatch*` labels, not 13.
7. F30, F52, WP-08: two missed prerequisites - ContextMenu 1.1.0 `submenu` flyouts (VV 1.0.0 has none; the adapter's menus use
   them, TV VectorTools__:644/:652) and Measurements `Say` (VV 1.4.0 lacks it; TV SheetTools:488/676 import it).
8. F56: VV `CreateShape` does honour `opts.layerId` (VV Shapes:116-122); the Floor Areas pass-through is still inert because
   nothing in VV sets `d.layerId` / `d.area`.
9. Work packages: WP-03, WP-04, WP-05, WP-06, WP-08 and WP-09 are REFUTED as standalone packages - their files are whole-file
   ports in S03b, S05a and S06a (owner map, section (h)); replaced by WP-S05b-V1 to V4 and the integrated order (h3).

### What was added

- Section (h): owner per hot file, four replacement work packages, the integrated cross-slice order.
- d1 rows for ContextMenu flyouts, Measurements `Say`, SheetSurface `GetSheetChrome`; d3 traps 7-9 (switch-on only with the
  hub; ShapeTool / hubs load the whole 37 folder; Verify__Exports checks unreachable files too).
- b9: `Na__Test__OrthoMode__` (ShapeTool, DimensionTool, DimensionGeometry), `Na__Test__ObjectSnap__` (Curves) and
  `Na__Test__ScrapbookProjectQr__` (ShapeGeometry) load this slice's files; test ownership overlaps.
- Decisions D-S05b-V01 (one owner per hot file) and D-S05b-V02 (resolve hatch packs / Patterns panel with D-S04a-01).
- A low finding: the vendored Clipper2 index notes in both apps say no app module imports clipper2-js directly; after WP-01
  `VectorTools__Boolean__.js:81` does, and the coordinated-set upgrade rule now also gates the Boolean tools.

### What remains unverified

- No code was executed in either app's browser and no TV / VV Node test suite was run (only VV's two read-only verifiers).
- The nine interactive 37 units were checked at import / export level and by spot reads, not traced end to end.
- 21 of the 22 hatch pattern JSON bodies were not read (indexes, root index and one pattern were).
- Whether S03b, S04b, S05a, S06a, S07a and S03a accept the owner map in section (h) is a planning decision; their reports were
  read only for scope and dependencies.
- The test check counts (138, 148, 47, 21) are from the TV devlog and module headers, not from runs.
