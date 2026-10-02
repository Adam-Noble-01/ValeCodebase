# S04b - Layout Editor drafting aids: Draft Mode, Drawing Grid, Object Snap, Ortho, Drawing Axes

Parity slice report. TrueVision 3D (TV) is the source of truth; ValeVision 3D (VV) is the target.
Read-only analysis, 01-Oct-2026. All paths are relative to the app root unless written absolute.

- TV root `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode` (git HEAD b2aa9151, devlog top v2.172.0)
- VV root `D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D` (git HEAD 7b4e593a, devlog top v2.71.0)
- `LE/` = `02__Src__AppModules/51__System__LayoutEditor/` in either app.

---------------------------------------------------------------------------------------------------

## Headline

1. **None of the five drafting-aid systems exists in VV.** TV has 31 files in five folders (`LE/26__System__DraftMode`,
   `27__System__DrawingGrid`, `28__System__ObjectSnap`, `32__System__OrthoMode`, `33__System__DrawingAxes`, 8,752 lines),
   all written 21-22 Sep 2026 (TV v2.107.0 to v2.149.0). Every one carries the TV header line
   `ValeVision : not yet ported - it waits for Adam's sign-off.` The five folder numbers are free in VV's `LE/`.
2. **VV's `LE/30__System__SheetTools/Na__LayoutEditor__Snapping__.js` (1.2.0, 455 lines) is the ancestor of TV's object snap,
   not a different system.** TV's own Snapping 1.0.0 was a verbatim port FROM VV (10-Sep, v2.21.0). TV took it to 1.5.0 and
   then dissolved it into 11 units in `LE/28__System__ObjectSnap` at v2.129.0 (git `7ab70638`, 21-Sep-2026: the file was
   deleted after an hour as a re-export). Every VV function survives in TV under a unit of that folder; the one TV
   removed outright is the marker TONE (colour by tool), replaced by colour by TARGET (section b.5, function map).
3. **The port is wiring-heavy, not file-heavy.** The 31 new files mostly drop in verbatim, but they import nine names VV's
   hub files do not export yet (Measurements `Say`, SheetSurface `ZOOM_SETTLED_EVENT` and `GetSheetChrome`, SheetModel
   `IsLayerSelectable`, ShapeGeometry `Rings`/`EdgePairs`, and three TV-only leaf files), and they are switched on from
   about 20 hub files that VV holds at much older versions (PointerDrag VV 1.4.0 vs TV 1.19.0, Keyboard 1.3.0 vs 1.18.0,
   Toolbar 1.9.0 vs 1.24.0, PointerPress 1.1.0 vs 1.10.0, HitResolution 1.2.0 vs 1.11.0, KeyMap 1.0.0 vs 1.11.0).
4. **No transport work.** Nothing in this slice touches R2, the worker or the Flask server: every switch is per-browser
   `localStorage` or session-only. DIV-1 (VV renders drawings through its composer) does not block Draft mode, which only
   changes CSS and the viewport render schedulers.
5. **Three traps the swarm must not walk into:** (a) VV's old marker CSS in `Styles__Main__Paper__.css` must be deleted in
   the same change that lands TV's `Styles__ObjectSnap__.css`, or the midpoint glyph is clipped and every marker gets a
   bordered box; (b) any VV caller still importing `Na__LeOsnap__TONE_*` breaks the module graph once it is pointed at TV's
   `__Search__` (TV exports no TONE names); (c) the TV tests `Na__Test__DraftGuard__`, `__DraftRestore__` and
   `__DrawingDrafts__` are about the browser DRAFT of unsaved sheets (AutoSave, persistence), not Draft MODE - they belong
   to the persistence slice.
6. **[Verifier, 01-Oct-2026] VV DOES sit under a service worker - correction to (d).12 and finding F49.** On its live
   https origin ValeVision3D is served by the SHARED Whitecardopedia + ValeVision3D PWA worker (VV `index.html:44` loads
   `../Whitecardopedia/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Registrar__.js`;
   logic file `D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\02__Src__AppModules\62__Feature__AppInstallability\Whitecardopedia__Pwa__ServiceWorker__Logic__.js`,
   `PWA_SW_VERSION_TOKEN = '2026-09-18-1'` at `:229`, shell JS/CSS stale-while-revalidate away from localhost). This slice
   adds 31 modules and new exports on existing ones (five in the seam wave alone: Measurements, SheetSurface, SheetModel,
   SheetModel__Layers, ShapeGeometry; more in the wiring waves), so a warm client can fail to link the editor until the token
   moves. Bumping it evicts every Vale app's caches, so it is ADAM'S call (VV ledger `:135-175`; VV devlog v2.67-v2.71
   "THE SHARED SERVICE WORKER" notes). No WP edits Whitecardopedia; every WP's devlog entry must carry the note (new
   finding S04b-V01, decision D-S04b-V01, WP-S04b-16).
7. **[Verifier] Three more traps.** (d) a `Snapping__.js` shim that re-exports the CONTROLLER closes the cycle
   tools -> Snapping -> controller -> Measurements -> tools that TV's `ObjectSnap__.js:33-37` forbids (VV
   `Measurements__.js:118-120` imports ShapeTool, RectangleTool and DimensionTool): the shim must re-export Search/State
   names only, and Keyboard, Toolbar and ContextMenu are repointed to the controller in the same commit (S04b-V02,
   WP-S04b-06R); (e) the ShapeGeometry seam is a HUNK, never a whole-file port - TV `ShapeGeometry__.js` 1.9.0 also imports
   `53__Feature__ProjectQrCode` (NA's Project Portal QR), `54__Feature__SheetImages` and SheetChrome `PushQr`, none of which
   VV has (S04b-V03); (f) the viewport carry needs `Na__LeTools__CarryTarget`, TV-only code in TV `HitResolution__.js:760`,
   and the carry reader keys are mandatory, not optional (S04b-V04, WP-S04b-11R).

---------------------------------------------------------------------------------------------------

## (a) Scope

| Item | TV | VV |
|---|---|---|
| `LE/26__System__DraftMode` | 4 files, 649 lines (DraftMode 1.1.0, State 1.0.0, Config, CSS) | absent |
| `LE/27__System__DrawingGrid` | 5 files, 1,451 lines (DrawingGrid 1.0.0, State 1.0.0, Panel 1.0.0, Config, CSS) | absent |
| `LE/28__System__ObjectSnap` | 16 files, 5,534 lines (11 snap units, controller, Menu, Config, CSS, ViewportSnapMove 1.6.0, MoveAnchor 1.0.0 + Config) | absent |
| `LE/32__System__OrthoMode` | 3 files, 438 lines (OrthoMode 1.0.0, State 1.0.0, Config) | absent |
| `LE/33__System__DrawingAxes` | 3 files, 680 lines (DrawingAxes 1.0.0, Config, CSS) | absent |
| `LE/30__System__SheetTools/Na__LayoutEditor__AxisLock__.js` | 205 lines, 1.0.0 | 201 lines, 1.0.0 (code identical; header only) |
| `LE/30__System__SheetTools/Na__LayoutEditor__Snapping__.js` | deleted 21-Sep-2026 (last copy 1.5.0, 672 lines, read from `git show 7ab70638^:...`) | 455 lines, 1.2.0 (VV-only) |
| Prerequisite leaves imported by the snap folder | `LE/20__System__Viewports/Na__LayoutEditor__ViewportRotation__.js` 1.0.0 (313), `LE/37__System__VectorTools/Na__LayoutEditor__VectorTools__Curves__.js` 1.0.0 (389), `LE/15__Core__Markup/Na__LayoutEditor__ShapeRings__.js` 1.1.0 (385) - all three import nothing | absent |
| Hub files read for wiring (both apps) | ModeController, SheetTools__, __Keyboard, __State, __PointerDrag, __PointerPress, __HitResolution, __ToolState, __ContextMenu, __CopyDrag (TV only), Grips, Measurements, SheetSurface, SheetChrome, Styles__Main / Main__Paper, ConfigState / __KeyMap / __ToolSetup / __EditorSetup, AppConfig JSON, key file JSON, Viewport2d / __Frame / Viewport3d, DimensionTool, ShapeTool, RectangleTool, LeaderTool, TextTool, Toolbar, VV Loader, both CSS indexes | |
| Tests | 14 relevant: `Na__TestEnv__ObjectSnapBundle__.cjs` + `Na__Test__ObjectSnap__`, `__OrthoMode__`, `__DrawingGrid__`, `__DrawingAxes__`, `__MoveAnchor__`, `__GroupMoveSnapping__`, `__PaintedOnThePoint__`, `__LayerMenu__`, `__MoveRetype__`, `__CopyDrag__`, `__SetMoveLeaderTips__`, `__ViewportRotation__`, `__DrawingTabKeys__`; plus the three mis-scoped browser-draft suites | none for these systems (VV has `Na__Verify__Exports__.mjs` and `Na__Verify__ModuleGraph__.mjs`) |
| Docs | `TrueVision__PLAN__DraftMode__.md` (302 lines, all read); `TrueVision__PLAN__VectorTools__.md` sections 5, 9, 10 (snap traps); devlog v2.107, v2.111, v2.113, v2.114, v2.123 (via Snapping 1.5.0 log), v2.129, v2.131, v2.136 (part), v2.137, v2.138 (part), v2.149 | `ValeVision__PARITY__TrueVisionLedger__.md` rows 497-523, 703-725, 1113-1140, 1160-1170; `ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md` (no drafting-aid decisions) |

Method: drift rows for the folders; the import list of every TV in-scope file resolved against VV's exports by a script
(`scratchpad/parity/work_s04b/imports.py`); a reverse-import map of both apps (`revdeps.py`); every TV file's DEVELOPMENT LOG;
`git diff --no-index -w` on shared files; the TV devlog entries listed above.

---------------------------------------------------------------------------------------------------

## (b) Narrative findings by sub-system

### b.1 Draft mode (K) - `LE/26__System__DraftMode` (TV v2.107.0, refined v2.111.0)

What it is: SketchUp LayOut's Draft Mode on LayOut's key K. While on, every line on the paper is a one-device-pixel
hairline in its own colour (`vector-effect: non-scaling-stroke`, width `HairlineDevicePx / (zoom x devicePixelRatio)`),
no dashes, no fills (a fill-only shape is outlined in `Lines__FillOnlyInk` #7a8591), no raster picture drawn
(`display:none` on `.na-le-frame__underlay`, `__fog`, `__snapshot`, images) and none RENDERED. A raster-only 2D viewport and
every 3D viewport show a dashed outline and a note. Session only: never written to a sheet, the browser draft or
localStorage; off on every load (`DraftMode__State__.js:22-24`, `DraftMode__.js:45-47`).

Files (TV):
- `Na__LayoutEditor__DraftMode__State__.js` 1.0.0 - a LEAF (no imports). Exports `Na__LeDraft__CHANGED_EVENT`
  ('na-layouteditor-draft-changed'), `Na__LeDraft__IsOn`, `Na__LeDraft__AssignOn`. A leaf on purpose, so the viewport
  modules can ask "is Draft on?" without an import cycle through the sheet surface (`State__.js:17-21`).
- `Na__LayoutEditor__DraftMode__.js` 1.1.0 - controller. Imports the State and SheetSurface `ZOOM_SETTLED_EVENT`,
  `GetZoom`, `Refresh` (`:92-93`). Exports `CHANGED_EVENT, IsOn, Set, Toggle, Label, Ready` (`:301-308`). `Set` (`:269`)
  toggles `body.na-le-draft` (+ `na-le-draft--crisp`), writes five custom properties, listens for ZOOM_SETTLED only while
  on, dispatches CHANGED, and calls `Na__LeSurface__Refresh('frames')`. 1.1.0 (v2.111) removed Draft's private zoom hold:
  it now re-solves the hairline width on the sheet surface's ZOOM_SETTLED_EVENT.
- `Na__LayoutEditor__DraftMode__Config__.json` - Lines (HairlineDevicePx 1, Smooth true, FillOnlyInk), a NavigationNote
  pointing at the AppConfig navigation block, Labels (Toggle "Draft", ToggleTitle, RasterNote, Picture3dNote, console lines).
- `Na__LayoutEditor__Styles__DraftMode__.css` - the whole look, every rule keyed on `body.na-le-draft`.

Call sites in TV (all absent in VV):
- `LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__Keyboard__.js:256` import; `:809-813` case `View__DraftToggle`
  (preventDefault, ignore `event.repeat`, Toggle). Keyboard 1.7.0.
- `LE/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js:218` import; button `:485` (after the Snap split); sync `:308-314`;
  listener in the CHANGED list `:587`. Toolbar 1.13.0.
- `LE/20__System__Viewports/Na__LayoutEditor__Viewport2d__.js:217` import; `:308` marks the body
  `na-le-frame__body--raster-only`; `:400`, `:423` drop debounced underlay/fog timers in Draft (Viewport2d 1.13.0).
- `LE/20__System__Viewports/Na__LayoutEditor__Viewport2d__Frame__.js:111` import; `:309`, `:424`, `:432` (schedulers and the
  render queue's `stillWanted`) (Frame 1.3.0).
- `LE/20__System__Viewports/Na__LayoutEditor__Viewport3d__.js:148` import; `:470`, `:501`, `:526` (Viewport3d 1.8.0).
- Key map: `View__DraftToggle` on `k`/`K`, Exact modifiers, in the key file, the actions catalogue and the KeyMap fallback
  (`ConfigState__KeyMap__.js:194`, KeyMap 1.1.0).
- CSS: TV `03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css:164`.

VV facts that matter:
- VV has the same frame class scheme (`na-le-frame--3d` is composed in VV `SheetSurface__.js:526`), the same underlay /
  snapshot / linework classes and the same scheduler shape (`Viewport2d__Frame__.js:181` `ScheduleUnderlay` with
  `state.timer`; `Viewport3d__.js:386` `RenderNow(..., stillWanted)`), so the TV hunks map one for one. VV has no depth fog,
  so the fog lines are dropped (harmless if kept).
- VV lacks `na-le-frame__body--raster-only` (set only by TV Viewport2d 1.13.0) and `.na-le-paper__highlights` (TV
  SheetSurface 1.7.0 splits the markup into slots with the highlights last). Without the latter, VV's Draft would also
  hairline the selection highlights - cosmetic until SheetSurface 1.7.0 is ported.
- VV lacks `Na__LeSurface__ZOOM_SETTLED_EVENT` (b.2).
- DIV-1 does not affect Draft: Draft never calls a renderer, it only refuses to BOOK renders, so VV's composer route
  (`42__System__DrawingViewCore/Na__DrawView__ComposerPreset__.js`) is untouched.
- K is free in VV (no binding in `LE/03__Core__Config/Na__LayoutEditor__KeyMappings__.json`; VV's global
  `02__AppData/Na__ValeVision__HotkeysDictionary__.json` binds 1-9, B, D, F, O, R, T, V, Y and others, not K or F3/F6-F9).
- "Draft" collides as a WORD with VV's browser draft (AutoSave key `Na__LayoutEditor__Draft__<code>`), but not as a
  namespace: no VV module uses `Na__LeDraft__`.

### b.2 The zoom settle (TV v2.111.0) - a prerequisite, not part of this slice's folders

Draft 1.1.0, the Drawing Grid, the Drawing Axes and the snap Marker 1.1.0 all listen for
`Na__LeSurface__ZOOM_SETTLED_EVENT` ('na-layouteditor-zoom-settled', TV `SheetSurface__.js:235`). It arrived with TV's
"zoom now, redraw when it rests" package: `SheetSurface__.js` 1.8.0 (`NoteZoomGesture` `:631`, `SettleZoom`,
`na-le-paper--zooming`), `Navigation__.js` 1.2.0, `Controls__Pc__.js` 1.2.0, `Controls__TouchScreen__.js` 1.1.0,
`Styles__Main__Paper__.css` (the hold rule), `SheetTools__.js` 1.32.0, `PointerDrag` 1.8.0 (pan skip), `Measurements` 1.5.1,
`MarginGrip` 1.2.0, `Toolbar` 1.14.0, `ConfigState__EditorSetup__.js` 1.2.0 and AppConfig `LayoutEditor__Navigation__Config`
`ZoomSettleMs` 350 / `HoldPaperWhileZooming` true (both absent in VV's AppConfig). VV `SheetSurface__.js` is 1.6.0 and has
none of it. [Verifier: confirmed against the devlog's own Files list, `TrueVision__DEVLOG__.md:5481-5490`. Note the full
package also touches `50__Feature__Specification/Na__LayoutEditor__MarginGrip__.js` (VV 1.0.0, TV 1.3.0), so a whole
v2.111 port puts MarginGrip, `SheetTools__.js`, `SheetTools__PointerDrag__.js` and `Toolbar__.js` on the hot-file list
as well - see WP-S04b-02R.] Owned by the SheetSurface slice; this slice depends on it. If that slice lands later, the minimum seam is an
exported `ZOOM_SETTLED_EVENT` that VV fires after every applied zoom (listeners then run per step, as they did in TV before
v2.111) - functionally correct, not identical in feel.

### b.3 Drawing grid (F6 show, F7 snap) - `LE/27__System__DrawingGrid` (TV v2.114.0)

What it is: SketchUp LayOut's Document Setup > Grid, one control for one (Points or Lines, Major spacing and colour, Minor
subdivisions and colour, Clip grid to page margins, Draw grid on top; Print Grid deliberately left out), on Adam's own
LayOut keys F6 (View > Show Grid) and F7 (Arrange > Grid Snap). Defaults are Adam's NA A2 LayOut template: 10 mm major in
10, #969696 over #d6d5c9, on top, not clipped, Points (`DrawingGrid__State__.js:86-98`). Remembered per browser
(`na-layouteditor-drawing-grid`). Never printed (a canvas, not a primitive). Grid snap has no radius: the nearest grid
point at any distance, each axis rounded alone (LayOut's `Grid::SnapX/SnapY`).

Files (TV):
- `Na__LayoutEditor__DrawingGrid__State__.js` 1.0.0 - LEAF. Exports `CHANGED_EVENT` ('na-layouteditor-grid-changed'),
  `TYPE_POINTS/LINES, Get, GetLimits, AssignDefaults, Assign, Reset, IsShowing, IsSnapping, MinorMm, StepMm, Nearest
  (:335), SnapPoint (:350)`. Imported by the controller, `ObjectSnap__Search__:102`, `ObjectSnap__GridMoves__:90`,
  `ViewportSnapMove__:161`, `DimensionTool__:180`, `LeaderTool__:90`, `TextTool__:90` and TV-only
  `NoteRegions__Grips__:82`.
- `Na__LayoutEditor__DrawingGrid__.js` 1.0.0 - controller and overlay: one canvas on the paper sized to the view (+160 px
  overdraw), backing store in device pixels, rows drawn from a pre-drawn strip (~1 ms a redraw). Imports State,
  SheetSurface `ZOOM_EVENT, ZOOM_SETTLED_EVENT, GetElements, GetLayout, GetZoom, GetPixelsPerMm`, SheetModel
  `CHANGED_EVENT`, Measurements `Say` (`:83-104`). Exports `SetShow/ToggleShow (:257)`, `SetSnap/ToggleSnap (:273)`,
  `Update, ResetSettings, DrawNow (:497), Attach (:591), Detach (:617), Label, MarkerScale, Ready` etc.
- `Na__LayoutEditor__Panel__DrawingGrid__.js` 1.0.0 - Document Preferences > Drawing Grid, registered straight after
  Panel__Sheet. Uses PanelHost `RegisterSection, OnControl, Refresh, Row, Input, Select, Button, Note` (all exported by VV's
  PanelHost 1.4.0) and the classes `na-le-subheading`, `na-le-row--toggle` (both present in VV).
- `Na__LayoutEditor__DrawingGrid__Config__.json`, `Na__LayoutEditor__Styles__DrawingGrid__.css` (canvas z-index 3 "on top",
  0 "under"; the grid snap ring itself now lives in the ObjectSnap stylesheet).

Call sites (TV): ModeController `:327-328` imports, `:529` Register after Sheet, `:574` Attach / `:585` Detach inside
Attach/DetachSheetInput (ModeController 1.24.0); Keyboard `:257`, `:822-832` (F7 also calls `RedrawHeld`) (1.9.0);
SheetTools__State `SHEET_CHORDS` (1.4.0); Toolbar `:219`, buttons `:489-490`, sync `:321-330` (1.16.0); KeyMap fallback F6/F7
(1.4.0); grid consumers listed above. In TV the panel lands on the left column's "Document Preferences" tab (ModeController
1.20.0); VV's left column has no tabs yet, so in VV it simply lands under Sheet - the tab structure belongs to the panels slice.

VV adaptation: the canvas z-index assumes TV's SheetSurface 1.7.0 stack (`.na-le-paper__stack` z1, focus z4, handles z5).
In VV 1.6.0 chrome is z2 and markup z3 (VV `Styles__Main__Paper__.css:55-58`); the grid canvas at z3 is inserted before the
handles, after the markup in DOM order, so "on top" still draws over the drawings; "under" (z0) should be checked against
VV's viewport layer. Verify both in the app.

### b.4 Ortho mode (F8) - `LE/32__System__OrthoMode` (TV v2.113.0)

What it is: AutoCAD's ORTHOMODE on F8 as a LATCHED Shift. The rule is `Ortho XOR Shift` (`OrthoMode__State__.js:154`
`Na__LeOrtho__Resolve(shiftKey)`); Shift is the temporary override (config `Behaviour__ShiftTemporaryOverride`). Reaches the
Draw tool's next vertex (and the Area tool), a new dimension's orientation and span, a dragged vertex or dimension end, and
every whole-object move; leaves Rectangle, the text rotate grip, viewport corners, Shift-click insert and new leaders alone.
Echo `<Ortho on>` / `<Ortho off>` above the Measurements box. Remembered per browser (`na-layouteditor-ortho`). Ctrl+L
ships as a disabled alternate binding.

Files: `Na__LayoutEditor__OrthoMode__State__.js` 1.0.0 (LEAF: `CHANGED_EVENT` 'na-layouteditor-ortho-changed', `IsOn,
AssignOn, Store, AssignShiftOverride, Resolve`); `Na__LayoutEditor__OrthoMode__.js` 1.0.0 (controller: imports the State and
Measurements `Say`; exports `CHANGED_EVENT, IsOn, Set (:188), Toggle, Label, Ready`); `__Config__.json`.

Call sites (TV): `Resolve` in `ShapeTool__.js:151` (SnapOrConstrain, ShapeTool 1.8.0), `DimensionTool__.js:183`
(OrientationFor and Span, 1.8.0), `SheetTools__PointerDrag__.js:348` (ApplyDrag works `ortho` out once at `:617`, 1.9.0),
TV-only `VectorTools__ArcTool__.js:67`, `NoteRegions__Grips__.js:83`, `FloorAreas__LabelGrip__.js:82`; controller in
Keyboard `:255`, case `:797-802` with `Na__LeTools__RedrawHeld()` (`:469`, Keyboard 1.8.0) and Toolbar `:213`, `:494`,
listener `:588` (1.15.0); `SHEET_CHORDS` (State 1.4.0); KeyMap fallback F8 (1.3.0).

VV gaps beyond the folder: no `Na__LeMeasure__Say` (b.11), no `Na__LeTools__RedrawHeld` (VV Keyboard has `ShiftRedraw :299`
and `Rerun :319`, and PointerDrag has `RerunDimEndDrag/RerunVertexDrag/RerunMoveDrag` but not `RerunViewportDrag` or
`RerunAnchorDrag`); VV's ApplyDrag uses raw `shift` (`PointerDrag__.js:226-241`). F8 is free in VV.

Not to be confused with `45__System__PlanDimensions` (VV) / `44__` (TV) `Na__PlanDimAxis__ToggleOrthoMode` - the 3D plan
dimension tool's own ortho on 'O', a different subsystem, header-only drift, out of scope.

### b.5 Object snap (F3) - `LE/28__System__ObjectSnap` (TV v2.129.0, v2.137.0, v2.138.0) vs VV `Snapping__.js`

What it is: AutoCAD's running object snaps. Six modes (Endpoint, Midpoint, Intersection, Perpendicular, Centre, Nearest -
Nearest ships off), five targets (viewport linework, vectors, text, dimensions, the sheet's paper), the drawing grid as the
fallback, an SVG marker whose SHAPE is the kind and whose COLOUR is the target, an optional name tag, a snap options menu on
an arrow beside the Snap button, the "<Osnap on>" echo, and `OnLinework` for the grips' green/blue state.

Lineage of VV's file (evidence: VV `Snapping__.js:41-66`; TV last copy `git show 7ab70638^:.../Snapping__.js` header):
VV 1.0.0 (10-Sep) -> TV 1.0.0 verbatim port of VV (10-Sep, v2.21.0) -> TV 1.1.0 sheet objects (ported back as VV 1.1.0)
-> TV 1.2.0 `FindOnViewport` + viewport exclusion (v2.28, never ported) -> TV 1.3.0 marker tones (ported as VV 1.2.0,
ledger row 715) -> TV 1.4.0 title block chrome points + grid fallback (v2.114) -> TV 1.5.0 reference layers offer nothing
(v2.123) -> dissolved into the folder at v2.129 (git `7ab70638`).
[Verifier: so VV 1.2.0 is TV 1.1.0 plus TV 1.3.0's tones, WITHOUT TV 1.2.0's `FindOnViewport`/viewport exclusion - it is
not "equal to TV 1.3.0". VV's own header still says the tone colours live in `Styles__Main__.css`; they are actually in
`Styles__Main__Paper__.css:306-337` (stale VV comment, no action beyond the CSS deletion).]

**Function map, VV `Snapping__.js` 1.2.0 -> TV `28__System__ObjectSnap` (all TV paths in that folder):**

| VV symbol (line) | TV home (line) | What changed |
|---|---|---|
| `KIND_END`, `KIND_MID` (:93-94) | `__State__` (:71-72), re-exported by `__Search__` | same values; new `KIND_INT, PERP, CEN, NEAR, GRID, INFER` |
| `TONE_VERTEX / TONE_DIMENSION / TONE_VIEWPORT / TONES` (:104-107) | **removed** (`__Search__` 1.0.0: "Snap's tone argument is gone") | colour is now the target: `TARGET_VIEWPORT/SHAPE/TEXT/DIMENSION/PAPER/GRID` (`__State__:84-90`), CSS `na-le-osnap--to-<target>` |
| `CHANGED_EVENT` 'na-layouteditor-snap-changed' (:95) | `__State__` (:95), same string | detail grows from `{enabled}` to `{enabled, names, modes, targets}` |
| `STORE_KEY` 'na-layouteditor-osnap' (:96) | `__State__` (:96), same key ("so nobody's F3 choice is lost") | + `-modes`, `-targets`, `-names` keys |
| `CELL_MM` 4 (:97), `CLASSES` (:99) | `__Index__` (:85, :89) | same |
| `MID_PENALTY` 1.25 (:98) | `__Search__` `WEIGHTS` (:164) | `{ end 1, int 1.05, mid 1.25, cen 1.25, perp 1.4 }` |
| `IsEnabled` (:126) | `__State__` (:158) | default now `Defaults.enabled` (true) rather than AppConfig `Snapping Enabled` (also true) |
| `SetEnabled` (:134), `Toggle` (:141) | controller `Na__LayoutEditor__ObjectSnap__.js` (:219, :235) | + console line, + `<Osnap on>` echo through Measurements `Say`, + snapshot event |
| `Cell` (:153) | `__Index__` `CellOf/CellKey` (:111-114) | renamed |
| `Build` (:165), `IndexFor` (:201) | `__Index__` (:152, :212) | files SEGMENTS as well as points, clips them to the frame (Liang-Barsky), files turned frames (ToFrame/FrameToPaper, with an identity fallback when the window has none), always files both kinds; key adds the HiddenLines flag |
| `Clear` (:216) | `__Search__` (:524) | same behaviour (ClearIndexes + HideMarker) |
| `FindOnSheet` (:252) | `__Search__` (:329) + `__Sources__` `EachSheetPoint` (:403) / `EachSheetSegment` (:498) | + text boxes, closed-vector centre, circle/arc centre and quadrants (VectorTools Curves), holed rings, paper chrome, note regions, reference layers excluded (`Offers` :270), array exclusions, bounding-box culling |
| `Find` (:327) | `__Search__` (:410) | modes, targets, `options.from` (Perpendicular), crossings between the sheet's lines and the drawing's, "the drawing outranks a vector's copy of it" within 0.05 mm (VV: on a tie the sheet's markup wins), Nearest only as a last resort, `{kind:'viewport'}` exclusion |
| `Snap(sheet, p, exclude, tone)` (:376) | `__Search__` `Snap(sheet, p, exclude, options, legacyOptions)` (:511) | a string 4th argument is ignored (legacy-safe); grid fallback (`FindGrid` :480); returns `target` |
| `ShowMarker(hit, tone)` (:398) | `__Marker__` `ShowMarker(hit)` (:188) | SVG glyph per kind, colour per target, placed by one transform (`PlaceMarker` :160, Marker 1.1.0), re-placed on ZOOM_SETTLED, optional name |
| `HideMarker` (:423) | `__Marker__` (:230) | also clears the marker point |
| - | `__Search__` `FindOnViewport` (:462), `FindGrid` (:480), `OnLinework` (:553), `SegmentsInBox` (:599), `RadiusMm` (:182); `__Sources__` `ChromeFrom/ChromePoints/Exclusions`; `__Marker__` `GetMarkerPoint` (:244); `__Moves__`; `__GridMoves__`; `__Menu__`; `__Glyphs__`; `__Geometry__` | new |

VV's `Na__LeTools__SnapShapeTranslation` (`LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__HitResolution__.js:311`) is
TV's `Na__LeOsnap__ShapeTranslation` (`__Moves__:83`), moved verbatim at HitResolution 1.7.0 and since extended: a held axis
survives a snap (HitResolution 1.5.0) and the grid answers when no object snap is in reach (1.4.0, `GridTranslation`). TV's
`GroupTranslation` (`__Moves__:111`; group move snapping, git `32767407`, 19-Sep-2026) has no VV counterpart: VV's group
moves do not snap.

The 16 TV files (versions from each file's log; drift_all shows Marker as 1.0.0 because its log lists 1.0.0 first - the
newest is 1.1.0):
- `__State__` 1.0.0 (leaf), `__Geometry__` 1.0.0 (leaf, `Na__LeOsnapGeo` namespace), `__Glyphs__` 1.0.0 (leaf).
- `__Index__` 1.1.0 - imports ConfigState `GetSnappingSetup`, Viewport2d `GetSnapSource` (VV's has the same contract,
  `Viewport2d__.js:289`), Geometry.
- `__Sources__` 1.2.0 - imports SheetModel `IsLayerVisible, IsLayerSelectable` (VV lacks the second), SheetSurface
  `GetSheet, GetLayout, GetSheetChrome` (VV lacks the last), SheetLayout `MarginRect`, ShapeGeometry `Points, Rings,
  EdgePairs` (VV lacks the last two), MarkupBridge `AnnotationCorners`, **VectorTools Curves `KIND_CIRCLE, Describe`** (VV lacks
  the folder), Geometry, State. Note regions are read off `Sheet__MarginNotes.Regions` with no import (VV simply has none).
- `__Search__` 1.1.0 - THE file a tool imports. Imports ConfigState, SheetModel `KIND_2D, GetLayers`, SheetSurface,
  DrawingGrid State `IsSnapping, Nearest`, **ViewportRotation `Bounds`** (VV lacks), and the folder's units.
- `__Marker__` 1.1.0 - imports ConfigState, SheetSurface `ZOOM_SETTLED_EVENT` (VV lacks), State, Glyphs.
- `__Moves__` 1.0.0, `__GridMoves__` 1.2.0 (imports AxisLock `Get`, DrawingGrid State, **ViewportRotation `TurnVector`**).
- controller `Na__LayoutEditor__ObjectSnap__.js` 1.0.0 (imports State, Marker, Measurements `Say`), `__Menu__` 1.0.0,
  `__Config__.json`, `Styles__ObjectSnap__.css` (marker, the Snap button's split and caret, the menu, the Move Anchor cross).
- `Na__LayoutEditor__ViewportSnapMove__.js` 1.6.0 (b.8) and `Na__LayoutEditor__MoveAnchor__.js` 1.0.0 + `__Config__.json` (b.9).

Why tools import `__Search__` and not the controller: the controller talks to the Measurements box, which imports the
tools that snap; a tool importing the controller would close a cycle (`ObjectSnap__.js:33-37`). VV's Measurements imports the
same three tools (`Measurements__.js` imports ShapeTool, RectangleTool, DimensionTool), so the same rule holds in VV.

Every TV importer of the folder (reverse map, `revdeps.py`):
- `__Search__` <- ModeController (Clear), MoveAnchor, Moves, ViewportSnapMove, Grips (`OnLinework`), HitResolution (Find,
  Show/HideMarker), PointerDrag (Snap, HideMarker), DimensionTool, LeaderTool, RectangleTool, ShapeTool, and TV-only
  VectorTools (Arc, Boolean, Circle, Join, Offset, Trim), NoteRegions__Grips, SheetImages__Crop/__Handles,
  Scrapbook__TileDrag, ScrapbookParametric__Grips.
- controller <- Menu, SheetTools__ContextMenu (Toggle, IsEnabled), Keyboard (Toggle), Toolbar (CHANGED_EVENT, IsEnabled,
  Toggle, Label).
- `__Menu__` <- Toolbar (ToggleMenu, CloseMenu). `__Moves__` <- PointerDrag. `__GridMoves__` <- Moves, PointerDrag
  (GridDragDelta). `__Marker__` <- DrawingAxes (GetMarkerPoint).

Every VV importer of `Snapping__.js` (10 files; each must be repointed before the file is deleted):

| VV importer (line) | Imports today | TV target after the port |
|---|---|---|
| `LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js:228` | Clear | `../28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Search__.js` |
| `LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__ContextMenu__.js:100` | Toggle, IsEnabled | `../28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__.js` |
| `LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__HitResolution__.js:112` | Find, ShowMarker, HideMarker | `__Search__`; SnapShapeTranslation leaves for `__Moves__` |
| `LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__Keyboard__.js:123` | Toggle | controller |
| `LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__PointerDrag__.js:137` | **TONE_DIMENSION**, Snap, HideMarker | `__Search__` (drop TONE) + `__Moves__`, `__GridMoves__` |
| `LE/35__System__DrawingTools/Na__LayoutEditor__DimensionTool__.js:129` | **TONE_DIMENSION**, Snap, ShowMarker, HideMarker | `__Search__` with `TARGET_DIMENSION` |
| `LE/35__System__DrawingTools/Na__LayoutEditor__LeaderTool__.js:77` | Snap, HideMarker | `__Search__` |
| `LE/35__System__DrawingTools/Na__LayoutEditor__RectangleTool__.js:98` | Snap, HideMarker | `__Search__` |
| `LE/35__System__DrawingTools/Na__LayoutEditor__ShapeTool__.js:121` | Snap, ShowMarker, HideMarker | `__Search__` (+ `KIND_END`, `TARGET_SHAPE`) |
| `LE/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js:110` | CHANGED_EVENT, IsEnabled, Toggle | controller (+ Label) and `__Menu__` |

**CSS trap.** VV keeps the old marker rules in `LE/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css`
(region "Snap Marker and Linework Progress", `.na-le-osnap` with a 1.5 px border and a tinted background, the three tone
classes, `[hidden]`, and `.na-le-osnap--mid` with a triangle `clip-path`, about lines 296-337; and `.na-le-osnap--infer`
at about 577-581). TV deleted them (TV `Styles__Main__Paper__.css:413-416` says they moved). TV's new `.na-le-osnap` rule
sets no border, background or clip-path, so if VV keeps the old rules the new SVG marker draws inside a bordered tinted box
and the midpoint glyph is clipped. Delete them in the same commit; keep `.na-le-frame__progress` which shares the region.

**API trap.** TV's `__Search__` exports no `Na__LeOsnap__TONE_*`. A VV caller repointed without dropping the TONE import
fails at module link time and takes the whole editor's module graph down. Either repoint and drop the TONE names in one
edit, or (recommended for a staged landing) turn VV's `Snapping__.js` into a temporary re-export of the new units that also
exports the three TONE names as plain strings - TV did exactly this for an hour (`ObjectSnap__.js:60-63`).

**[Verifier] The shim must NOT re-export the controller.** `Na__LayoutEditor__ObjectSnap__.js` imports Measurements (for
`Say`), and VV `Measurements__.js:118-120` imports ShapeTool, RectangleTool and DimensionTool - which import the shim. A shim
re-exporting `Toggle`/`SetEnabled` from the controller therefore creates the cycle tools -> Snapping -> controller ->
Measurements -> tools, the one TV's `ObjectSnap__.js:33-37` exists to prevent. Read of VV Measurements: every tool call is
inside a function body, so it would most likely not throw today, but it is a latent TDZ trap for no gain, and
`Na__Verify__ModuleGraph__.mjs` checks resolution only, never cycles. Cycle-free shim: re-export `Find, Snap, ShowMarker,
HideMarker, Clear, IsEnabled, KIND_END, KIND_MID` from `__Search__` and `CHANGED_EVENT` from `__State__`, plus the three TONE
strings as local constants; in the SAME commit repoint the only importers of `Toggle` - `Keyboard__.js:123`,
`Toolbar__.js:110`, `SheetTools__ContextMenu__.js:100` - straight to the controller (one import line each). Verified
compatible: TV `Search.Snap` ignores a string 4th argument (`Search__.js:506-512`), `Marker.ShowMarker(hit)` ignores a 2nd,
and `Marker.TargetOf` (`Marker__.js:141-146`) colours VV's tone-less calls correctly (infer -> dimension red, anything else
-> shape blue); TV's exclusion shapes (`{kind:'shape'|'dimension'|'leader', id, index}`) are VV's (`Sources__.js:414-457`).

### b.6 The marker painted on its point (TV v2.137.0)

Measured in TV at 32x on a 150% display: the marker painted 8.8 device px right of the vertex and the drawing 8.3 px left of
it, because `left/top` are rounded to a device pixel BEFORE the paper's `scale(zoom)`. Fixed in three places:
`__Marker__` 1.1.0 (`PlaceMarker`: translate, scale 1/zoom, translate -50%), `SheetSurface__.js` 1.11.0 (frames placed by a
translate) and `Grips__.js` 1.11.0 (`Place`, `PlaceBand`). Only the first is in this slice; the other two belong to the
SheetSurface and Grips slices but are needed for `Na__Test__PaintedOnThePoint__` (116 checks) to pass in VV. VV's
`Grips__.js` is 1.8.0 and also lacks 1.10.0 (grips laid out at real size and counter-scaled; `Na__LeOsnap__OnLinework` drives
the green "on the drawing" state).

### b.7 Drawing Axes Overlay (F9) - `LE/33__System__DrawingAxes` (TV v2.131.0)

A red horizontal and a green (#00a000) vertical line through the cursor, out to the edges of the sheet; they cross at the
snap marker whenever one shows (`Na__LeOsnap__GetMarkerPoint`), else at the cursor, never at the marker during a pan
(`na-le-stage--panning`, which VV's `Controls__Pc__.js:107` and `Controls__TouchScreen__.js:83` already set). Whole device
pixels at any zoom, compositor layers only, hidden over panels and for a finger, never printed. Remembered per browser
(`na-layouteditor-drawing-axes`). Echo `<Drawing axes on/off>`.

Files: `Na__LayoutEditor__DrawingAxes__.js` 1.0.0 (imports SheetSurface `ZOOM_EVENT, ZOOM_SETTLED_EVENT, GetElements,
GetLayout, GetZoom, GetPixelsPerMm, ClientToPaperMm` - VV lacks only ZOOM_SETTLED_EVENT; SheetModel `CHANGED_EVENT`;
Measurements `Say`; ObjectSnap `__Marker__` `GetMarkerPoint`), `__Config__.json`, `Styles__DrawingAxes__.css` (layer at the
handles' z5, inserted before them).

Call sites (TV): ModeController `:329`, `:575`, `:586` (1.28.0); Keyboard `:258`, `:840-844` (1.13.0); `SHEET_CHORDS` (State
1.7.0); Toolbar `:220`, `:501`, `:589` (1.22.0, button word "Axes"); KeyMap fallback F9 (1.9.0); key row `View__AxesToggle`
with its catalogue row. F9 is free in VV.

### b.8 Viewport snap move (carry a viewport by a point) - `LE/28__System__ObjectSnap/Na__LayoutEditor__ViewportSnapMove__.js`

TV 1.6.0. Authored TV v2.28.0 (13-Sep) in `20__System__Viewports`, moved into the snap folder at 1.5.0 (v2.129) with its
namespace and exports unchanged. Never ported: VV ledger row 720 "not ported - comes with the carry", ledger row 446 and 504
"Left out: ViewportSnapMove", and the subfolder table (row 1128) lists it as TV-only under 20. It carries a viewport by a
point of its own linework, snaps that point to other drawings, acquires tracking points (AutoCAD object snap tracking,
`AcquireDwellMs` 400, `AcquireMax` 3) with level/plumb guides, takes the arrow-key axis lock (1.2.0, v2.98), the grid
(1.3.0), a Ctrl-drag copy (`Retarget`, 1.4.0, needs TV-only `SheetTools__CopyDrag__.js`), and a turned frame (1.6.0).

Wiring it needs in VV (none present): PointerPress `GrabAt` (TV `:354`), PointerDrag `OnMove` hover with `CarryTarget`
(`:463-464`) and ApplyDrag `Solve` (`:676`) and FinishDrag `Finish` (`:1003`), Keyboard Escape `Clear` (`:692`), ToolState
`Clear` (`:273`), SheetTools `Refresh` after a model change (`:609`), CopyDrag `Retarget`, `RerunViewportDrag` (PointerDrag
1.7.0), ConfigState__ToolSetup carry keys and AppConfig `ViewportCarry/ViewportTracking/AcquireDwellMs/AcquireMax/
TrackMarkerSizePx`, and the carry CSS block, which TV keeps in `Styles__Main__Paper__.css:814-887` (`.na-le-frame--carried`,
`.na-le-carry-base`, `.na-le-track-point`, `.na-le-track-guide`) - inconsistent with TV moving all other snap CSS into the
folder; mirror TV, and offer TV a back-port to move it.

[Verifier] Two items missing from the list above. (1) `Na__LeTools__CarryTarget` - "the viewport a press may carry by a
point" - is NOT in PointerDrag: it is TV-only code in TV `SheetTools__HitResolution__.js:760` (exported `:797`; that file's
port note lists it as a TrueVision divergence), called by PointerPress `:353` and the PointerDrag hover. VV recorded leaving
it out (`SheetTools__.js:257-258`, "this tree has no viewport carry yet"), so the carry WP must add it to VV HitResolution.
(2) The carry reader keys are MANDATORY, not optional: `ViewportSnapMove__.js` reads `setup.viewportCarry` (`:406`),
`viewportTracking` (`:368`, `:516`), `acquireDwellMs` (`:375`), `acquireMax` (`:347`) and `trackMarkerSizePx` (`:254`,
`:317`) with no fallback, so with VV's ToolSetup 1.0.0 `!setup.viewportCarry` turns the whole carry into a silent no-op.
TV's plan already had this as phase L, "Clipboard and snap move back-port to ValeVision - Pending Adam's sign-off"
(`TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md:807`); the clipboard half was ported (VV 2.35.0), the snap move
was not.

### b.9 Move anchor (Ctrl+click, then move from this point to that point) - `Na__LayoutEditor__MoveAnchor__.js` (TV v2.149.0)

TV 1.0.0 + `__Config__.json` (Enabled, SnapToOwnBox, SayWhatToDo, CrossSizePx 26, GrabRadiusPx 10, three labels). Ctrl+click
ONE item or group puts a red cross in the middle of its box and picks up Move; drag the cross onto any snap point to
re-place it; drag the item and it is carried by the cross alone. Imports SheetModel `GetSelectionItems`, SheetSurface,
Groups `ItemsBounds`, `__Search__`, `__State__`, AxisLock, Grips `ShowBand/HideBand`, EditScope `Path`, Measurements `Say` -
in VV only `Say` is missing. Exports 18 functions.

Its wiring is the heaviest in the slice and all of it sits in hubs VV holds far behind TV: PointerPress 1.8.0 (`Arm :525`,
`Grab :633`, `ForDrag :822`, `Recentre :864`, `Anchorable`), PointerDrag 1.19.0 (`Hover :462`, `Holds :463`, `IsDrag :587`,
`Relocate :588`, `Carry :599`, `ShowAt :684`, `Finish :1011`, `IsAnchorDrag :1563`, `RerunAnchorDrag :1575`), Keyboard
1.16.0, HitResolution 1.10.0 (`Holds/HoldsItems` keep Move up), ToolState 1.7.0 (`:307`), SheetTools__ 1.39.0 (`Ready :677`,
`Refresh :609`, `Clear :693`), KeyMap 1.10.0 (`MatchSelectionModifier` answers `anchor`; `GetMoveAnchorModifier :532`),
ConfigState 1.29.0 (re-export) and the key file's `SelectionBindings__MoveAnchorModifier: "Ctrl"` beside
`CopyDragModifier: "Ctrl"` (TV v2.117). VV's `MatchSelectionModifier` returns only `{combine, anywhere}` (VV
`ConfigState__KeyMap__.js:348`). Ctrl's meaning is shared with Ctrl-drag copy (v2.117), so the anchor should land after the
copy gesture to keep Ctrl identical to TV.

### b.10 Axis lock (shared) - `LE/30__System__SheetTools/Na__LayoutEditor__AxisLock__.js`

Code identical in both apps (`git diff --no-index -w`: header lines only). VV authored it (TV's port note says "Ported from
ValeVision3D ... verbatim"). TV's header carries one extra INTEGRATION paragraph naming `ViewportSnapMove` as the reason this
module is the single source of the axis names; VV's header lacks it because VV has no carry yet. Importers in TV add
`MoveAnchor`, `ObjectSnap__GridMoves__`, `ViewportSnapMove`, `VectorTools__ArcTool__`; VV's importers are the TV list minus
those four. No code action; copy the header paragraph when ViewportSnapMove lands.

### b.11 What the new folders import that VV does not export (the seams)

Resolved by script against VV's exports (`work_s04b/imports.py`):

| Needed by | Name | Where it lives in TV | VV today |
|---|---|---|---|
| Draft, Grid, Axes, Marker | `Na__LeSurface__ZOOM_SETTLED_EVENT` | `SheetSurface__.js:235` (1.8.0, v2.111) | missing (VV 1.6.0) |
| Sources | `Na__LeSurface__GetSheetChrome` | `SheetSurface__.js:708` (1.9.0, v2.114), reads the chrome cache of 1.7.0 | missing; VV `RefreshChrome` builds primitives into a local (`SheetSurface__.js:576`) - same primitive shape (`Kind 'rect'/'line'`, `StrokeColour`, `StrokeMm`, VV `SheetChrome__.js:228-242`) |
| Grid, Ortho, Axes, controller, MoveAnchor | `Na__LeMeasure__Say` | `Measurements__.js:1176` (1.6.0, v2.113) | missing (VV 1.4.0); VV has `ShowHint(text, isError, timed)` (`:492`) and `IsTyping`, so it is an 8-line addition |
| Sources | `Na__LeModel__IsLayerSelectable` | `SheetModel__Layers__.js:374`, re-exported by `SheetModel__.js` (v2.123) | missing; `return !layer \|\| layer.Layer__Selectable !== false` is true for every VV layer |
| Sources | `Na__LeShapeGeo__Rings`, `Na__LeShapeGeo__EdgePairs` | `ShapeGeometry__.js:172, :202` (with `Holes`), import `ShapeRings__.js` (v2.150) | missing (VV ShapeGeometry 1.5.0) |
| Sources | `Na__LeVecCurve__KIND_CIRCLE`, `Na__LeVecCurve__Describe` | `37__System__VectorTools/Na__LayoutEditor__VectorTools__Curves__.js` (leaf, 1.0.0) | folder missing |
| Search, GridMoves, Index (soft) | `Na__LeVpRot__Bounds`, `Na__LeVpRot__TurnVector` | `20__System__Viewports/Na__LayoutEditor__ViewportRotation__.js` (leaf, 1.0.0, v2.138) | missing; a record with no `Viewport__RotationDeg` reads as level, so the leaf is inert in VV |
| Index, Marker, Search, ViewportSnapMove | `GetSnappingSetup().sheetChrome`, `.viewportCarry`, `.viewportTracking`, `.acquireDwellMs`, `.acquireMax`, `.trackMarkerSizePx` | `ConfigState__ToolSetup__.js:337-357` (1.2.0 + carry keys) | VV `:286-296` returns only enabled, radiusPx, endpoints, midpoints, hiddenLines, sheetObjects, markerSizePx |

TV's own trap note: "`28__System__ObjectSnap` statically imports `37__System__VectorTools/...Curves__.js`. Rename that file
or either export and the whole editor stops loading" (`TrueVision__PLAN__VectorTools__.md` section 9). All three leaves
import nothing, so they can be ported verbatim ahead of their own features with no behaviour change.

**[Verifier] The ShapeGeometry seam is a hunk, never a whole-file port.** TV `ShapeGeometry__.js` 1.9.0 imports, besides
ShapeRings, `../10__Core__SheetSurface/...SheetChrome__.js` `Na__LeChrome__PushQr` (VV lacks it),
`../53__Feature__ProjectQrCode/Na__ProjectQr__Symbol__.js` (NA's "Project Portal" QR block - TV-only, NA identity) and
`../54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Paint__.js` (TV-only; per S03b its source chain reaches
`80__CloudflareIntegration`) - `ShapeGeometry__.js:119-127`, versions 1.6.0-1.8.0. A verbatim copy would not link in VV and
would bring the NA QR block with it. The seam is: `import { Na__LeRings__Of, Na__LeRings__Edges, Na__LeRings__Split } from
'./Na__LayoutEditor__ShapeRings__.js'`, the three functions `Holes` (`:164`), `Rings` (`:172`) and `EdgePairs` (`:202`), and
their exports - inert in VV, which has no `Shape__Holes`. S03b owns the file and proposes a whole-file 1.9.0 port with its
53/54 dependencies; if that lands first, skip this seam.

### b.12 Cross-cutting observations

- **Tooling: port signals missed.** The TV header marker used by these files is `ValeVision    : not yet ported - it waits for
  Adam's sign-off.` - not the `Ported from / Parity / Back-port` triple that `ref/tv_portnote_markers.txt` indexes. 126 TV
  files app-wide carry it (`grep -E "ValeVision +: not yet ported"`), 20 of them in this slice's folders (26: 2, 27: 3,
  28: 12, 32: 2, 33: 1; the JSON and CSS files carry no port note); ViewportSnapMove uses a third form,
  `Ported to : ValeVision3D ... (pending)`. [Verifier: the five folders hold 21 JS files - 20 carry the marker and
  ViewportSnapMove has `Ported to : ValeVision3D 51__System__LayoutEditor (pending)` (`:75`). App-wide I count 124 files
  under `02__Src__AppModules` (122 JS + 2 CSS) and none in `03__Style__AppStylesheets`, `80__Testing__PrototypeEnvironment`
  or `80__CloudflareIntegration`; the survey's 126 could not be reproduced. The index has exactly one line for these
  folders (ViewportSnapMove's Parity line).]
- **Tooling: "header-only" under-reports.** Of 107 `header-only` rows in `drift_all.tsv`, 39 differ in non-comment code. In
  this slice `TextTool__.js` (TV 1.4.0 vs VV 1.3.0) and `LeaderTool__.js` (1.2.0 vs 1.0.0) are classed header-only yet carry
  the Grid Snap code (`Na__LeGrid__SnapPoint` calls) and the snap import repoint; their real change sits inside the first 120
  lines' import block plus 1-2 body lines. Some of the 39 are only folder-number import paths (expected divergence).
- **Tooling: version extraction.** drift_all takes the first version in a log: `ObjectSnap__Marker__.js` shows 1.0.0 (newest
  is 1.1.0), and ViewportSnapMove (1.6.0), MoveAnchor (1.0.0) and the Ortho controller (1.0.0) show blank.
- **Verification order.** VV's `Na__Verify__Exports__.mjs` checks every module under `02__Src__AppModules` whether or not
  anything imports it, so a new folder whose imports are not yet exported fails the verifier even though the browser would
  never load it. Land the seams before (or with) the folders.
- **Mis-scoped tests.** `Na__Test__DraftGuard__.test.cjs` (AutoSave + DrawView ProjectData, v2.146), `__DraftRestore__`
  (browser draft restore, v2.145) and `__DrawingDrafts__` are browser-draft persistence suites. Move them to the persistence /
  AutoSave slice.
- **Stale TV test header.** `Na__Test__DrawingGrid__.test.mjs` still describes "the real Na__LayoutEditor__Snapping__" and
  "SheetTools__GridDrag__" although it now imports the ObjectSnap bundle - a TV doc fix, not a VV blocker.

---------------------------------------------------------------------------------------------------

## (c) Module-by-module table

State: `tv-only` = VV lacks it; `vv-only`; `header-only`; `drifted`. Action keywords follow the swarm vocabulary.

### c.1 The five folders and the two shared/VV-only files

| TV path (LE/) | TV ver | VV path | VV ver | State | What VV lacks (TV devlog) | Action | VV adaptation | Depends on |
|---|---|---|---|---|---|---|---|---|
| 26__System__DraftMode/Na__LayoutEditor__DraftMode__State__.js | 1.0.0 | same path | - | tv-only | the Draft flag leaf (v2.107) | port_verbatim | header, port note | - |
| 26__System__DraftMode/Na__LayoutEditor__DraftMode__.js | 1.1.0 | same | - | tv-only | Draft controller (v2.107; zoom hold removed v2.111) | port_verbatim | header; console prefix `[ValeVision3D LayoutEditor]` | ZOOM_SETTLED_EVENT; SheetSurface `Refresh('frames')` (VV has it) |
| 26__System__DraftMode/Na__LayoutEditor__DraftMode__Config__.json | 1.0.0 (Meta) | same | - | tv-only | config and labels | port_adapted | `Meta__Research` says "TrueVision's Draft..." and cites `TrueVision__PLAN__DraftMode__.md`: reword to "this editor's" and cite the TV plan path; labels are brand-neutral | - |
| 26__System__DraftMode/Na__LayoutEditor__Styles__DraftMode__.css | - | same | - | tv-only | the Draft look | port_adapted | header; note text font -> `var(--Vale_FontFamily, 'Open Sans', Helvetica, Arial, sans-serif)` (VV's chrome convention) or keep literal as VV's on-paper CSS does; `.na-le-paper__highlights` selector inert until SheetSurface 1.7.0 | loader STYLESHEETS |
| 27__System__DrawingGrid/Na__LayoutEditor__DrawingGrid__State__.js | 1.0.0 | same | - | tv-only | grid settings leaf, `Nearest`, `SnapPoint` (v2.114) | port_verbatim | header | - |
| 27__System__DrawingGrid/Na__LayoutEditor__DrawingGrid__.js | 1.0.0 | same | - | tv-only | grid controller and canvas overlay (v2.114) | port_verbatim | header, console prefix | ZOOM_SETTLED_EVENT, Measurements `Say` |
| 27__System__DrawingGrid/Na__LayoutEditor__Panel__DrawingGrid__.js | 1.0.0 | same | - | tv-only | Document Preferences > Drawing Grid section (v2.114) | port_verbatim | header | ModeController registration |
| 27__System__DrawingGrid/Na__LayoutEditor__DrawingGrid__Config__.json | 1.0.0 | same | - | tv-only | defaults (NA A2 template), limits, display, labels | port_verbatim (pending D-S04b-06) | Meta research cites Adam's NA template: keep or retune for Vale | - |
| 27__System__DrawingGrid/Na__LayoutEditor__Styles__DrawingGrid__.css | - | same | - | tv-only | canvas stacking | port_verbatim | header; verify z-index vs VV paper (b.3) | loader STYLESHEETS |
| 28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__State__.js | 1.0.0 | same | - | tv-only | switches, modes, targets (v2.129); keeps VV's F3 storage key | port_verbatim | header | - |
| 28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Geometry__.js | 1.0.0 | same | - | tv-only | Foot, Nearest, Cross, Centroid, CellsOfSegment (v2.129) | port_verbatim | header | - |
| 28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Glyphs__.js | 1.0.0 | same | - | tv-only | eight AutoCAD glyphs, six menu pictures (v2.129) | port_verbatim | header | - |
| 28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Index__.js | 1.1.0 | (VV `Snapping__.js` Build/IndexFor) | (1.2.0) | tv-only | segments filed, frame clip (v2.129); turned frames (v2.138) | port_verbatim | header | Viewport2d `GetSnapSource` (present) |
| 28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Sources__.js | 1.2.0 | (VV `Snapping__.js` FindOnSheet) | (1.2.0) | tv-only | text, centres, curves, paper chrome (v2.114/v2.129), note regions (1.1.0), holed rings (1.2.0, v2.150), reference layers (v2.123) | port_verbatim | header | IsLayerSelectable, GetSheetChrome, ShapeGeo Rings/EdgePairs, VectorTools Curves leaf |
| 28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Search__.js | 1.1.0 | (VV `Snapping__.js` Find/Snap/Clear) | (1.2.0) | tv-only | six modes, targets, grid fallback, OnLinework, SegmentsInBox (v2.129); turned frames (v2.138) | port_verbatim | header | ViewportRotation leaf; DrawingGrid State |
| 28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Marker__.js | 1.1.0 | (VV `Snapping__.js` Show/HideMarker) | (1.2.0) | tv-only | SVG glyph, target colour (v2.129); painted on the point, settle re-place (v2.137) | port_verbatim | header | ZOOM_SETTLED_EVENT; delete VV old marker CSS |
| 28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Moves__.js | 1.0.0 | VV `SheetTools__HitResolution__.js:311` SnapShapeTranslation | (HitRes 1.2.0) | tv-only | held axis through a snap (HitRes 1.5.0), grid fallback (1.4.0), GroupTranslation (19-Sep) | port_verbatim + retire_vv (HitResolution copy) | header | GridMoves |
| 28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__GridMoves__.js | 1.2.0 | - | - | tv-only | LayOut grab-point grid moves (v2.114 as SheetTools__GridDrag__, moved v2.129, turned v2.138) | port_verbatim | header | DrawingGrid State, AxisLock, ViewportRotation leaf |
| 28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__.js | 1.0.0 | (VV `Snapping__.js` Set/Toggle) | (1.2.0) | tv-only | controller: echo, config, labels (v2.129) | port_verbatim | header, console prefix | Measurements `Say` |
| 28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Menu__.js | 1.0.0 | - | - | tv-only | snap options dropdown (v2.129, Toolbar 1.20.0) | port_verbatim | header | Toolbar split + caret |
| 28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Config__.json | 1.0.0 | - | - | tv-only | modes, targets, labels, research | port_verbatim | - | - |
| 28__System__ObjectSnap/Na__LayoutEditor__Styles__ObjectSnap__.css | - | VV `Styles__Main__Paper__.css` marker rules | - | tv-only / drifted | marker, Snap split and caret, menu, move anchor cross | port_adapted | header; menu and name-tag font -> Vale token (VV chrome convention); colours stay (VV's LE already uses TV's literal palette, e.g. `#1a7fc4` in `Styles__Main__.css:313-317`) | delete VV old `.na-le-osnap*` rules; loader STYLESHEETS |
| 28__System__ObjectSnap/Na__LayoutEditor__ViewportSnapMove__.js | 1.6.0 | - | - | tv-only | viewport carry and tracking (v2.28 ... v2.138) | port_verbatim (late) | header | Search, AxisLock, Grid State; PointerPress/PointerDrag/Keyboard/ToolState/SheetTools hub ports; CopyDrag (Retarget); carry CSS; config keys |
| 28__System__ObjectSnap/Na__LayoutEditor__MoveAnchor__.js | 1.0.0 | - | - | tv-only | Ctrl+click move anchor (v2.149) | port_verbatim (late) | header | Search, State, Grips band, EditScope, Measurements `Say`; PointerPress 1.8.0, PointerDrag 1.19.0, Keyboard 1.16.0, HitRes 1.10.0, ToolState 1.7.0, SheetTools 1.39.0, KeyMap 1.10.0; CopyDrag v2.117 |
| 28__System__ObjectSnap/Na__LayoutEditor__MoveAnchor__Config__.json | 1.0.0 | - | - | tv-only | anchor settings and labels | port_verbatim | - | - |
| 32__System__OrthoMode/Na__LayoutEditor__OrthoMode__State__.js | 1.0.0 | - | - | tv-only | Ortho XOR Shift leaf (v2.113) | port_verbatim | header | - |
| 32__System__OrthoMode/Na__LayoutEditor__OrthoMode__.js | 1.0.0 | - | - | tv-only | Ortho controller (v2.113) | port_verbatim | header, console prefix | Measurements `Say` |
| 32__System__OrthoMode/Na__LayoutEditor__OrthoMode__Config__.json | 1.0.0 | - | - | tv-only | behaviour, labels, AutoCAD research | port_verbatim | - | - |
| 33__System__DrawingAxes/Na__LayoutEditor__DrawingAxes__.js | 1.0.0 | - | - | tv-only | F9 overlay (v2.131) | port_verbatim | header, console prefix | ZOOM_SETTLED_EVENT, Say, Marker `GetMarkerPoint` |
| 33__System__DrawingAxes/Na__LayoutEditor__DrawingAxes__Config__.json | 1.0.0 | - | - | tv-only | colours, behaviour, labels | port_verbatim | - | - |
| 33__System__DrawingAxes/Na__LayoutEditor__Styles__DrawingAxes__.css | - | - | - | tv-only | axes layer | port_verbatim | header | loader STYLESHEETS |
| 30__System__SheetTools/Na__LayoutEditor__AxisLock__.js | 1.0.0 | same | 1.0.0 | header-only | TV header's ViewportSnapMove integration paragraph | no_action now; header copy with ViewportSnapMove | - | ViewportSnapMove |
| (none - dissolved into 28) | (Snapping 1.5.0, deleted v2.129) | 30__System__SheetTools/Na__LayoutEditor__Snapping__.js | 1.2.0 | vv-only | superseded by the folder (map in b.5) | retire_vv (via a one-wave re-export shim) | shim exports the new names + TONE strings, then delete | all 10 importers repointed |

### c.2 Prerequisite leaves from other subsystems (imported by the snap folder)

| TV path (LE/) | TV ver | VV | State | Action | Why now |
|---|---|---|---|---|---|
| 20__System__Viewports/Na__LayoutEditor__ViewportRotation__.js | 1.0.0 | absent | tv-only | port_verbatim (early, coordinate with the viewports slice) | Search 1.1.0 and GridMoves 1.2.0 import `Bounds`/`TurnVector`; no imports of its own; inert without `Viewport__RotationDeg` |
| 37__System__VectorTools/Na__LayoutEditor__VectorTools__Curves__.js | 1.0.0 | absent | tv-only | port_verbatim (early, coordinate with the vector tools slice) | Sources imports `KIND_CIRCLE`, `Describe`; pure; only asked of a vector carrying `Shape__Curve`, which VV has none of; TV calls its API frozen |
| 15__Core__Markup/Na__LayoutEditor__ShapeRings__.js | 1.1.0 | absent | tv-only | port_verbatim (early, coordinate with the booleans slice) | ShapeGeometry `Rings/EdgePairs/Holes` import it; pure; only asked of a vector carrying `Shape__Holes` |

### c.3 Hub files the drafting aids are wired through (all owned by other slices; listed for serialisation)

| Hub (LE/ unless noted) | TV ver | VV ver | Drafting-aid content VV lacks (TV version) |
|---|---|---|---|
| 01__Core__Loader/Na__LayoutEditor__Loader__.js (VV only) | - | 1.1.0 | `Na__LeLoad__STYLESHEETS` (`:125-134`) must list DraftMode, DrawingGrid, ObjectSnap, DrawingAxes CSS after `Main__Paper` and before `Panels`, in TV's index order (TV `Na__CoreUi__Styles__Index__.css:164-167`) |
| 03__Core__Config/Na__LayoutEditor__KeyMappings__.json (VV) / Na__Hotkeys__DrawingTabs__.json (TV) | - | - | rows `Ortho__Toggle` F8, `Ortho__ToggleCtrlL` (off), `View__DraftToggle` k/K, `View__GridToggle` F6, `Snap__GridToggle` F7, `View__AxesToggle` F9 (TV `:277-350`); 5 catalogue rows (`:1156-1177`); `SelectionBindings__MoveAnchorModifier` (and `CopyDragModifier`) (`:910-911`) |
| 03__Core__Config/Na__LayoutEditor__ConfigState__KeyMap__.js | 1.11.0 | 1.0.0 | fallback rows K (1.1.0), F8 (1.3.0), F6/F7 (1.4.0), F9 (1.9.0) (TV `:192-197`); `anchor` in `MatchSelectionModifier` and `GetMoveAnchorModifier` (1.10.0) |
| 03__Core__Config/Na__LayoutEditor__ConfigState__.js | 1.29.0 | 1.17.0 | re-export `GetMoveAnchorModifier` (1.29.0) |
| 03__Core__Config/Na__LayoutEditor__ConfigState__ToolSetup__.js | 1.5.0 | 1.0.0 | `sheetChrome` (1.2.0) and the five carry keys in `GetSnappingSetup` |
| 03__Core__Config/Na__LayoutEditor__ConfigState__EditorSetup__.js | 1.6.0 | 1.0.0 | `zoomSettleMs`, `holdPaperWhileZooming` (1.2.0) |
| 03__Core__Config/Na__LayoutEditor__AppConfig__.json | - | - | Snapping `SheetChrome(+Note)`, `ViewportCarry(+Note)`, `ViewportTracking`, `AcquireDwellMs`, `AcquireMax`, `TrackMarkerSizePx` (TV `:322-330`); Navigation `ZoomSettleMs`, `HoldPaperWhileZooming` (+Notes) |
| 05__Core__ModeController/Na__LayoutEditor__ModeController__.js | 1.32.0 | 1.18.0 | imports `:327-329`, `:349`; `Na__LePanelGrid__Register()` after Sheet `:529` (1.24.0); `Na__LeGrid__Attach/Detach` `:574/:585` (1.24.0); `Na__LeAxes__Attach/Detach` `:575/:586` (1.28.0); `Na__LeOsnap__Clear` from `__Search__` `:774` |
| 07__Core__SheetData/Na__LayoutEditor__SheetModel__.js + __SheetModel__Layers__.js | - / 1.4.0 | - / 1.0.0 | `IsLayerSelectable` (v2.123) |
| 10__Core__SheetSurface/Na__LayoutEditor__SheetSurface__.js | 1.13.0 | 1.6.0 | chrome cache (1.7.0), zoom settle (1.8.0), `GetSheetChrome` (1.9.0), frames by translate (1.11.0) |
| 10__Core__SheetSurface/Navigation__, Controls__Pc__, Controls__TouchScreen__ | 1.3.0 / 1.4.0 / 1.1.0 | 1.1.0 / 1.1.0 / 1.0.0 | the zoom gesture (v2.111) |
| 10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css | - | - | delete old `.na-le-osnap*` rules; add `.na-le-paper--zooming` (v2.111) and the viewport carry block (v2.28) |
| 15__Core__Markup/Na__LayoutEditor__ShapeGeometry__.js | 1.9.0 | 1.5.0 | `Holes`, `Rings`, `EdgePairs` (v2.150) - [Verifier] as a HUNK only: the whole TV file imports 53 ProjectQr, 54 SheetImages and SheetChrome `PushQr` |
| 50__Feature__Specification/Na__LayoutEditor__MarginGrip__.js | 1.3.0 | 1.0.0 | [Verifier, added] the margin re-plan moved onto the zoom settle (1.2.0, v2.111) - only if the full v2.111 package is taken |
| 20__System__Viewports/Na__LayoutEditor__Viewport2d__.js | 1.16.0 | 1.8.0 | Draft guards + raster-only class (1.13.0); turn in the snap source key (1.14.0) |
| 20__System__Viewports/Na__LayoutEditor__Viewport2d__Frame__.js | 1.4.0 | 1.1.0 | Draft guards (1.3.0) |
| 20__System__Viewports/Na__LayoutEditor__Viewport3d__.js | 1.8.1 | 1.6.1 | Draft guards (1.8.0) |
| 30__System__SheetTools/Na__LayoutEditor__Measurements__.js | 1.10.0 | 1.4.0 | `Say` (1.6.0); placed on settle (1.5.1) |
| 30__System__SheetTools/Na__LayoutEditor__SheetTools__State__.js | 1.8.0 | 1.1.0 | `SHEET_CHORDS` + `Ortho__Toggle, View__GridToggle, Snap__GridToggle` (1.4.0), `View__AxesToggle` (1.7.0) (TV `:149` vs VV `:84`) |
| 30__System__SheetTools/Na__LayoutEditor__SheetTools__Keyboard__.js | 1.18.0 | 1.3.0 | controller import repoint; K (1.7.0), F8 + `RedrawHeld` (1.8.0), F6/F7 (1.9.0), F9 (1.13.0), anchor axis lock (1.16.0), Esc `VpMove__Clear` |
| 30__System__SheetTools/Na__LayoutEditor__SheetTools__PointerDrag__.js | 1.19.0 | 1.4.0 | VpMove axis lock + `RerunViewportDrag` (1.7.0), pan skip (1.8.0), ortho (1.9.0), grid (1.10.0), Moves/Search repoint + `VertexNeighbours` + `from` (1.14.0), anchor (1.19.0) |
| 30__System__SheetTools/Na__LayoutEditor__SheetTools__PointerPress__.js | 1.10.0 | 1.1.0 | VpMove `GrabAt`; anchor (1.8.0) |
| 30__System__SheetTools/Na__LayoutEditor__SheetTools__HitResolution__.js | 1.11.0 | 1.2.0 | snap moves left (1.7.0); anchor keeps Move up (1.10.0); [Verifier] `Na__LeTools__CarryTarget` (TV-only, `:760`, exported `:797`) for the viewport carry |
| 30__System__SheetTools/Na__LayoutEditor__SheetTools__ToolState__.js | 1.7.0 | 1.1.0 | `VpMove__Clear`; `Anchor__Clear` (1.7.0) |
| 30__System__SheetTools/Na__LayoutEditor__SheetTools__.js | 1.39.0 | 1.25.0 | settle listeners (1.32.0); `VpMove__Refresh`; anchor Ready/Refresh/Clear (1.39.0) |
| 30__System__SheetTools/Na__LayoutEditor__SheetTools__ContextMenu__.js | 1.7.0 | 1.2.0 | Snapping on/off row imports from the controller (TV `:163`, `:319-322`) |
| 30__System__SheetTools/Na__LayoutEditor__SheetTools__CopyDrag__.js | 1.2.0 | absent | `VpMove__Retarget` (v2.117) |
| 30__System__SheetTools/Na__LayoutEditor__Grips__.js | 1.12.0 | 1.8.0 | `OnLinework` state colours (1.10.0); `Place/PlaceBand` (1.11.0) |
| 35__System__DrawingTools/Na__LayoutEditor__DimensionTool__.js | 1.12.0 | 1.5.0 | Ortho (1.8.0), grid offset (1.9.0), ref-layer inference (1.10.0), folder + `from` + `TARGET_DIMENSION` (1.11.0) |
| 35__System__DrawingTools/Na__LayoutEditor__ShapeTool__.js | 1.10.0 | 1.6.0 | Ortho (1.8.0), folder + `from` + `KIND_END/TARGET_SHAPE` marker (1.9.0) |
| 35__System__DrawingTools/Na__LayoutEditor__TextTool__.js | 1.4.0 | 1.3.0 | grid placement (1.4.0) |
| 35__System__DrawingTools/Na__LayoutEditor__LeaderTool__.js | 1.2.0 | 1.0.0 | grid head + repoint (1.2.0) |
| 35__System__DrawingTools/Na__LayoutEditor__RectangleTool__.js | 1.4.0 | 1.2.0 | repoint only |
| 40__Ui__Panels/Na__LayoutEditor__Toolbar__.js | 1.24.0 | 1.9.0 | Draft (1.13.0), settle sync (1.14.0), Ortho (1.15.0), Grid + Grid Snap (1.16.0), Snap split + menu (1.20.0), Axes (1.22.0) |

---------------------------------------------------------------------------------------------------

## (d) Wiring notes

1. **Order of edits that keeps every commit green.** Seams (b.11) and the three leaves first; then the folders (they import
   the seams; nothing imports them yet, so the app is unchanged but `Na__Verify__Exports__.mjs` now covers them); then the
   switch-over (the `Snapping__.js` shim or the 10 repoints, plus the CSS swap); then the toggles and keys; then the carry
   and the anchor. Run `node 80__Testing__PrototypeEnvironment/Na__Verify__Exports__.mjs` and
   `node 80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs` (VV) after each step.
2. **If an owning slice ports a hub whole** (`port_whole_reapply_vv`, e.g. PointerDrag 1.19.0, Keyboard 1.18.0, Toolbar
   1.24.0, ModeController 1.32.0), that hub imports the drafting-aid folders, so the folders and seams must already be in VV
   when the hub lands. In that case this slice's wiring WPs shrink to verification. If the hub ports are not scheduled in
   the same wave, apply the targeted hunks listed in c.3 instead and let the later whole-file port overwrite them.
3. **Key map.** Add each row in three places in VV (the JSON row, the JSON actions catalogue and the KeyMap fallback) - TV's
   `Na__Test__DrawingTabKeys__` enforces "JSON and fallback resolve every key the same". Add the four function-key actions
   to `SHEET_CHORDS` so a focused panel checkbox or select cannot swallow them. VV's key file is still
   `Na__LayoutEditor__KeyMappings__.json`; TV renamed its own to `Na__Hotkeys__DrawingTabs__.json` at v2.110 - follow the
   config slice's decision (D-S04b-07).
4. **Keyboard cases** (TV `Keyboard__.js:790-844`): `Snap__Toggle` (controller import), `Ortho__Toggle` (repeat-guarded,
   then `RedrawHeld`), `View__DraftToggle`, `View__GridToggle`, `Snap__GridToggle` (then `RedrawHeld`), `View__AxesToggle`.
   VV adaptation of `RedrawHeld` (`:469-485`): drop the `Na__LeVec__IsTool` branch until 37__System__VectorTools is ported,
   and drop `RerunViewportDrag` / `RerunAnchorDrag` until the carry and the anchor land. [Verifier] Also drop
   `Na__LeTools__TOOL_AREA` from the Draw branch (`tool === TOOL_DRAW || tool === TOOL_AREA`, `:479`): it is the Floor Areas
   tool (59__Feature__FloorAreas, TV-only) and VV's `SheetTools__State__.js` defines no TOOL_AREA.
5. **Toolbar** (TV `:473-501`): after the tool buttons, `<span class="na-le-toolbar__split">` holding Snap and its caret
   (`snap-menu`, `aria-haspopup="menu"`), then Draft, Grid, Grid Snap, Ortho, Axes - each lit by
   `na-le-toolbar__btn--active` and `aria-pressed`, words from each system's config (re-read on every sync because configs
   land after the toolbar is built). Listen on `Na__LeOsnap__/Draft/Grid__CHANGED_EVENT` in the shared list, and on
   `Ortho` and `Axes` CHANGED events on their own lines (`:587-589`); close the snap menu on unmount (`:600`). VV's AppConfig
   `SnapToggleTitle` becomes unread, as in TV.
6. **ModeController**: register `Na__LePanelGrid__Register()` right after `Na__LePanelSheet__Register()` (VV `:416`); add
   `Na__LeGrid__Attach(); Na__LeAxes__Attach();` after `Na__LeTools__Attach` in `Na__LeMode__AttachSheetInput` (VV `:448-454`)
   and the matching Detach calls before `Na__LeTools__Detach` (VV `:455-461`); repoint `Na__LeOsnap__Clear` (VV `:228`,
   `:558`).
7. **Pointer drag sequence** (TV `ApplyDrag :583`): anchor relocate (`:587`) or anchor carry (`:599`); `GridDragDelta` unless
   exact (`:609`); `ortho = !exact && Na__LeOrtho__Resolve(shift)` (`:617`) handed to every nearer-axis line, `VpMove__Solve`
   and `ShapeTranslation`; `GroupTranslation` for selection moves (`:648`); vertex snap with
   `{ from : Na__LeTools__VertexNeighbours(sheet, drag) }` (`:709`, helper `:565`); dimension end snap with the other end as
   `from` (`:779`); raw `shift` still goes to `DragPatch` and `RotateTo`. FinishDrag hides the marker and finishes the carry
   and the anchor (`:1001-1011`). OnMove skips work while panning (1.8.0, `:434`).
8. **Drawing tools**: DimensionTool `Snap(sheet, point, null, start ? { from : start } : null)` and inferred marker
   `{ ..., kind : INFER_KIND, target : Na__LeOsnap__TARGET_DIMENSION }`; `OrientationFor`/`Span` ask `Na__LeOrtho__Resolve`;
   `OffsetFor` uses `Na__LeGrid__SnapPoint`. ShapeTool `SnapOrConstrain` passes `{ from : last vertex }` and holds by
   `Resolve`; its closing marker is `{ kind : KIND_END, target : TARGET_SHAPE }`. TextTool and LeaderTool call
   `Na__LeGrid__SnapPoint`. RectangleTool is a repoint only.
9. **Draft guards** in the three viewport modules: import `Na__LeDraft__IsOn` from the STATE leaf only (never the controller,
   which imports SheetSurface, which imports the viewports - the cycle the leaf exists to avoid).
10. **Grid consumers outside VV's current feature set** (TV-only for now): `NoteRegions__Grips`, `FloorAreas__LabelGrip`,
    `SheetImages__Crop/__Handles`, `Scrapbook__TileDrag`, `ScrapbookParametric__Grips` (which must pass `{ grid : false }` so
    a scale bar keeps its 50 mm steps), VectorTools. VV has `55/56/57` scrapbook folders whose TileDrag and parametric grips
    do not snap at all today; their snap wiring belongs to the scrapbook slice and must use `__Search__` with
    `{ grid : false }` for parametric slides.
11. **No transport, no R2, no server.** New localStorage keys: `na-layouteditor-drawing-grid`, `-ortho`, `-drawing-axes`,
    `-osnap-modes`, `-osnap-targets`, `-osnap-names` (F3 keeps `na-layouteditor-osnap`). New window events:
    `na-layouteditor-draft-changed`, `-grid-changed`, `-ortho-changed`, `-drawing-axes-changed`, `-zoom-settled`. None
    collide with anything in VV (grep of `VVM/`).
12. ~~**No service worker in VV.** TV's devlog entries bump the PWA token (e.g. v2.113 `2026-09-21-05`); VV has none, so the
    equivalent VV step is the loader's STYLESHEETS list and nothing else.~~ **REFUTED by verifier:** VV runs under the
    shared Whitecardopedia + ValeVision3D PWA worker on its live origin (`index.html:44`; token `PWA_SW_VERSION_TOKEN =
    '2026-09-18-1'` at `Whitecardopedia\02__Src__AppModules\62__Feature__AppInstallability\Whitecardopedia__Pwa__ServiceWorker__Logic__.js:229`,
    shell JS stale-while-revalidate off localhost; that file's own log records a mixed old/new module graph failing to link,
    v1.0.7). The ledger rows saying "n/a - this tree has no PWA worker" were corrected by the ledger itself (`:135-175`).
    The equivalent VV step is: the loader's STYLESHEETS list, PLUS a "THE SHARED SERVICE WORKER" note in each VV devlog
    entry naming the new exports, PLUS Adam's decision on a token bump before deploying (WP-S04b-16, D-S04b-V01). No WP
    edits the Whitecardopedia worker. The worker's "best-effort" precache lists only VV start-up modules, none in
    `51__System__LayoutEditor`, so deleting `Snapping__.js` cannot break its install.

---------------------------------------------------------------------------------------------------

## (e) UI notes

- **Marker meaning changes for VV users.** VV colours the marker by the TOOL snapping (blue Draw/Rectangle/vertex grips,
  orange Dimension, purple viewport carry - VV `Snapping__.js:27-32`). TV colours it by what was snapped TO: purple viewport
  linework, blue vector, orange text, red dimension, slate paper and grid (TV `Styles__ObjectSnap__.css:62-67`). Orange
  therefore changes meaning in VV. The shapes become AutoCAD's SVG glyphs (square, triangle, cross, boxed right angle,
  circle, hourglass, ring with dot for the grid, dashed circle for an inferred line) at 18 px over a white casing.
- **Toolbar** gains, after the tools: [Snap|v] split button with the snap options menu (z-index 1200, the same as VV's
  `.na-le-menu`), Draft, Grid, Grid Snap, Ortho, Axes - all plain toggles lit while on.
- **Measurements box echo line**: "<Osnap on>", "<Ortho on>", "<Grid on>", "<Grid snap on>", "<Drawing axes on>" and the
  anchor's three sentences, shown on the line above the box unless a value is being typed.
- **Left column**: a "Drawing Grid" section under Sheet. TV puts both under a "Document Preferences" tab; VV's left column
  has no tabs (panels slice).
- **Paper overlays**: the grid canvas, the red/green axes, the red move anchor cross, the carry ring/crosses/guides, the
  hairline Draft look with its "Raster only - not drawn in Draft (K)" notes.
- **Vale identity**: VV's LE stylesheets already use TV's literal palette (`#1a7fc4` active state, `rgba(23,43,58,...)`
  greys), so colours port as they are. Fonts: VV writes chrome text as
  `var(--Vale_FontFamily, 'Open Sans', sans-serif)` (`Styles__Main__.css:73`, `Styles__Boot__.css:45`) and on-paper text as
  literal `'Open Sans'` (`Styles__Main__Paper__.css:276, :399`). Apply the token to the snap menu (`Styles__ObjectSnap__.css`
  `.na-le-osnap-menu`) and keep the on-paper literals (marker name tag, Draft notes) - a two-line adaptation.
- None of these aids touch the top-bar animation work; they appear only inside a drawing tab with the sheet tools attached
  and never in the web viewer.

---------------------------------------------------------------------------------------------------

## (f) Decisions needed

| Id | Question | Options | Recommendation |
|---|---|---|---|
| D-S04b-01 | TV's headers say every drafting aid "waits for Adam's sign-off" before reaching ValeVision. Is the parity brief that sign-off? | (a) yes, all seven; (b) yes for Draft, Grid, Ortho, Object Snap, Axes, and confirm separately for the two that change mouse gestures (viewport carry: a press on linework carries the viewport; move anchor: Ctrl+click arms a cross) | (b): port the five now; confirm the carry and the anchor, then port them as the last wave |
| D-S04b-02 | The snap marker's colour: by tool (VV today) or by target (TV)? | keep VV tones; adopt TV targets | Adopt TV targets (identical experience); say so in the VV devlog because orange changes meaning |
| D-S04b-03 | Wire the aids by targeted hunks into VV's old hubs now, or wait for whole-file hub ports by the SheetTools/DrawingTools/Toolbar slices? | hunks now; wait; mixed | Mixed: folders + seams + the `Snapping__.js` shim first (no hub rewrite needed for the snap behaviour to switch), toggles/keys/toolbar as small hunks if the hub ports are not in the same wave; carry and anchor only after the hub ports |
| D-S04b-04 | Port TV's v2.111 zoom-settle package, or add only an interim `ZOOM_SETTLED_EVENT` fired after every zoom? | full package (SheetSurface slice); interim event | Full package; the interim event only if the SheetSurface slice is scheduled after this one |
| D-S04b-05 | Port three pure leaves from other subsystems early (ViewportRotation, VectorTools Curves, ShapeRings), creating a one-file `37__System__VectorTools`, or adapt the snap units' imports? | early leaves; adapted imports (a VV divergence) | Early leaves, verbatim - zero behaviour change, keeps the snap units byte-identical |
| D-S04b-06 | Drawing grid defaults are Adam's NA A2 LayOut template (10 mm in 10, #969696/#d6d5c9, Points). Same for Vale? | identical; Vale template values | Identical now (the config is per app, so Vale can retune later without code) |
| D-S04b-07 | Key file name in VV: keep `Na__LayoutEditor__KeyMappings__.json` or follow TV's `Na__Hotkeys__DrawingTabs__.json` (v2.110)? Ported tests read TV's name | keep; rename | Follow the config slice; until it renames, add rows to KeyMappings and point the ported tests at it |
| D-S04b-08 | Land the move anchor before VV has Ctrl-drag copy (TV v2.117 `SheetTools__CopyDrag__`)? | before (copy path dormant); after | After, so Ctrl click and Ctrl drag mean exactly what they mean in TV |
| D-S04b-09 | Retire `Snapping__.js` in one commit (10 repoints), or via a one-wave re-export shim that also exports the old TONE names? | one commit; shim | Shim for one wave, then delete with a grep gate (TV's own route, `ObjectSnap__.js:60-63`). **[Verifier] The shim re-exports `__Search__` and `__State__` names only, never the controller (cycle via Measurements), and the three `Toggle` importers (Keyboard, Toolbar, ContextMenu) are repointed to the controller in the same commit - see WP-S04b-06R.** |
| D-S04b-V01 | [Verifier, added] ValeVision3D sits under the SHARED Whitecardopedia + ValeVision3D service worker (`PWA_SW_VERSION_TOKEN = '2026-09-18-1'`, stale-while-revalidate off localhost). This slice adds 31 modules and new exports on existing ones (five in the seam wave: Measurements, SheetSurface, SheetModel, SheetModel__Layers, ShapeGeometry). Bump the shared token when these land? | (a) one bump per deployed wave of this slice; (b) one bump after the whole slice; (c) no bump (accept that warm clients may fail to link the editor until a second visit) | Adam's call - the token evicts every Vale app's caches, models included (VV ledger `:135-175`). Recommend (a): this is exactly the mixed-graph failure the worker's own log records. Swarm agents never edit the Whitecardopedia worker; they write the note |

---------------------------------------------------------------------------------------------------

## (g) Proposed work packages

Every WP: header on each ported file `VALEVISION3D - LAYOUT EDITOR - ...`, console prefix `[ValeVision3D LayoutEditor]`,
PORT NOTE in VV's form (`Ported from : TrueVision3D <LE path>, its <ver> (TrueVision v2.N.0)` / `Ported on : <date> for
ValeVision3D v2.N.0` / `Parity : verbatim|adapted` / `Divergences` / `Back-port : n/a`), a VV devlog entry
`## ValeVision3D v2.N.0 - DD-Mon-YYYY - Title` taken from a fresh read of the devlog top, and the ledger rows (WP-S04b-15).
Acceptance always includes both VV verifiers exiting 0 and `git diff --no-index -w <TV file> <VV file>` showing only header,
port note and console-prefix lines for `verbatim` files. Hand Adam an in-app checklist rather than driving the app.
[Verifier] Every WP's devlog entry also carries VV's "THE SHARED SERVICE WORKER" note (WP-S04b-16): VV is served by the
shared Whitecardopedia worker, whose token is Adam's call. WP-S04b-02, -06 and -11 are superseded by -02R, -06R and -11R.

| Id | Title | Scope | Size | Depends on | Hot files (VV, outside its own new files) | Acceptance | Tests to port |
|---|---|---|---|---|---|---|---|
| WP-S04b-01 | Pure leaves the snap folder imports | Port verbatim `LE/20__System__Viewports/Na__LayoutEditor__ViewportRotation__.js` 1.0.0, `LE/37__System__VectorTools/Na__LayoutEditor__VectorTools__Curves__.js` 1.0.0, `LE/15__Core__Markup/Na__LayoutEditor__ShapeRings__.js` 1.1.0. Skip any a sibling slice has already landed | S | - | none | the three files exist, import nothing, export TV's names; verifiers pass | (with WP-14) the leaves are loaded real by `Na__Test__ObjectSnap__` |
| WP-S04b-02 | **REFUTED by verifier (incomplete hot files; ShapeGeometry must be a hunk) - use WP-S04b-02R below.** Seams the drafting aids import | Additive exports, each verbatim from TV: Measurements `Say` (1.6.0); SheetSurface `ZOOM_SETTLED_EVENT` (full v2.111 package if D-S04b-04 = full) + chrome cache + `GetSheetChrome` (1.7.0/1.9.0); SheetModel__Layers `IsLayerSelectable` + SheetModel re-export; ShapeGeometry `Holes/Rings/EdgePairs`; ConfigState__ToolSetup `sheetChrome` + carry keys; AppConfig Snapping keys (+ Navigation keys with v2.111). Skip each one an owning slice has landed | M | WP-S04b-01 (ShapeRings) | `LE/30__System__SheetTools/Na__LayoutEditor__Measurements__.js`; `LE/10__Core__SheetSurface/Na__LayoutEditor__SheetSurface__.js`; `LE/07__Core__SheetData/Na__LayoutEditor__SheetModel__.js`; `LE/07__Core__SheetData/Na__LayoutEditor__SheetModel__Layers__.js`; `LE/15__Core__Markup/Na__LayoutEditor__ShapeGeometry__.js`; `LE/03__Core__Config/Na__LayoutEditor__ConfigState__ToolSetup__.js`; `LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json` (+ v2.111: Navigation, Controls__Pc, Controls__TouchScreen, ConfigState__EditorSetup, Styles__Main__Paper.css) | every name in b.11 resolves; nothing visible changes in the app except (if v2.111) the soft-then-sharp zoom | - |
| WP-S04b-03 | Ortho mode folder | Port `LE/32__System__OrthoMode/` (State, controller, Config) | S | WP-S04b-02 (`Say`) | none | three files present; verifiers pass | `Na__Test__OrthoMode__` rule + controller sections now; tool/drag/keyboard sections after WP-07/08/09 |
| WP-S04b-04 | Draft mode folder and its render guards | Port `LE/26__System__DraftMode/` (4 files); Draft hunks in Viewport2d (1.13.0, without fog lines), Viewport2d__Frame (1.3.0), Viewport3d (1.8.0); link the CSS | M | WP-S04b-02 (ZOOM_SETTLED_EVENT) | `LE/20__System__Viewports/Na__LayoutEditor__Viewport2d__.js`; `LE/20__System__Viewports/Na__LayoutEditor__Viewport2d__Frame__.js`; `LE/20__System__Viewports/Na__LayoutEditor__Viewport3d__.js`; `LE/01__Core__Loader/Na__LayoutEditor__Loader__.js` (STYLESHEETS) | K (after WP-09): hairlines one device pixel, rasters hidden, raster level change in Draft books 0 renders, K off restores at once then one render; PDF unchanged | none in TV (proved in-app); add a VV smoke check of the hairline maths if wanted |
| WP-S04b-05 | Drawing grid folder | Port `LE/27__System__DrawingGrid/` (5 files); link the CSS | M | WP-S04b-02 (ZOOM_SETTLED_EVENT, `Say`) | `LE/01__Core__Loader/Na__LayoutEditor__Loader__.js` | files present; verifiers pass; with WP-09: F6 draws 1 mm points crisp at any zoom, F7 snaps, panel controls redraw at once, never printed | `Na__Test__DrawingGrid__` state section now; snap/move sections after WP-06; key section after WP-09 |
| WP-S04b-06 | **REFUTED by verifier (shim re-exporting the controller closes a module cycle; three switch importers must be repointed in the same commit) - use WP-S04b-06R below.** Object snap folder core and the switch-over | Port 13 files of `LE/28__System__ObjectSnap/` (all but ViewportSnapMove, MoveAnchor, MoveAnchor Config); link `Styles__ObjectSnap__.css`; delete VV's old `.na-le-osnap*` rules from `Styles__Main__Paper__.css`; turn VV `Snapping__.js` into a re-export shim (new names + TONE strings) | L | WP-S04b-01, WP-S04b-02, WP-S04b-05 | `LE/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css`; `LE/30__System__SheetTools/Na__LayoutEditor__Snapping__.js` (shim); `LE/01__Core__Loader/Na__LayoutEditor__Loader__.js` | every VV importer still links; markers show TV glyphs coloured by target; title block corners and text corners snap; Intersection/Perpendicular/Centre work; no bordered box or clipped triangle | `Na__TestEnv__ObjectSnapBundle__.cjs`, `Na__Test__ObjectSnap__`, `Na__Test__PaintedOnThePoint__` (marker part; full suite after WP-13) |
| WP-S04b-07 | Drawing tools on the new snap | DimensionTool, ShapeTool, RectangleTool, LeaderTool, TextTool: repoint to `__Search__`, drop TONE, add targets, `from`, `Na__LeOrtho__Resolve`, `Na__LeGrid__SnapPoint` (c.3 versions) - or verify after the DrawingTools slice's whole-file ports | M | WP-S04b-03, WP-S04b-05, WP-S04b-06 | `LE/35__System__DrawingTools/Na__LayoutEditor__DimensionTool__.js`; `LE/35__System__DrawingTools/Na__LayoutEditor__ShapeTool__.js`; `LE/35__System__DrawingTools/Na__LayoutEditor__RectangleTool__.js`; `LE/35__System__DrawingTools/Na__LayoutEditor__LeaderTool__.js`; `LE/35__System__DrawingTools/Na__LayoutEditor__TextTool__.js` | no TONE import left in 35; Perpendicular found from the previous vertex; Ortho holds the Draw band and makes dimensions ortho; text and leader heads land on the grid with F7 | `Na__Test__OrthoMode__` tool sections |
| WP-S04b-08 | Sheet tools pointer wiring | PointerDrag (ortho, grid delta, Moves Shape/Group translation, `VertexNeighbours`, `from`), HitResolution (remove `SnapShapeTranslation`, keep the insert diamond's Find), ContextMenu repoint - or verify after the SheetTools slice's whole-file ports | L | WP-S04b-03, WP-S04b-05, WP-S04b-06 | `LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__PointerDrag__.js`; `LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__HitResolution__.js`; `LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__ContextMenu__.js` | a vector moved whole keeps a held axis through a snap; a group move snaps a member's point; F7 moves text by its grab point in whole grid steps; arrow lock beats Ortho; typed lengths exact | `Na__Test__GroupMoveSnapping__`, `Na__Test__MoveRetype__`, `Na__Test__OrthoMode__` drag section |
| WP-S04b-09 | Keys, toolbar, mode controller; delete Snapping | Key rows (JSON + catalogue + KeyMap fallback), `SHEET_CHORDS`, Keyboard cases + adapted `RedrawHeld` [Verifier: also without the `TOOL_AREA` branch, TV `:479`; the Snap import repoints of Keyboard/Toolbar/ContextMenu/ModeController already happened in WP-S04b-06R], Toolbar split + menu + five toggles, ModeController registration/attach/detach/Clear repoint; then delete `Snapping__.js` | L | WP-S04b-03..08, WP-S04b-10 | `LE/03__Core__Config/Na__LayoutEditor__KeyMappings__.json`; `LE/03__Core__Config/Na__LayoutEditor__ConfigState__KeyMap__.js`; `LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__State__.js`; `LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__Keyboard__.js`; `LE/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js`; `LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js`; `LE/30__System__SheetTools/Na__LayoutEditor__Snapping__.js` (delete) | `grep -r "Snapping__" 02__Src__AppModules` returns nothing; F3/F6/F7/F8/F9/K each switch once per press, not on repeat, not from a text box, yes from a focused checkbox; buttons light; echo shows; snap menu opens under its caret and Escape closes only it | `Na__Test__DrawingTabKeys__` (needs VV's KeyScope first - see the tests note below), keyboard sections of OrthoMode, DrawingGrid, DrawingAxes |
| WP-S04b-10 | Drawing axes folder | Port `LE/33__System__DrawingAxes/` (3 files); link the CSS | S | WP-S04b-02, WP-S04b-06 (Marker) | `LE/01__Core__Loader/Na__LayoutEditor__Loader__.js` | files present; with WP-09: lines edge to edge, whole device pixels, cross at the marker, hidden over panels | `Na__Test__DrawingAxes__` module sections now; key/toolbar sections after WP-09 |
| WP-S04b-11 | **REFUTED by verifier (misses HitResolution `CarryTarget` and treats the reader keys as optional) - use WP-S04b-11R below.** Viewport snap move (carry) | Port `ViewportSnapMove__.js` 1.6.0; PointerPress `GrabAt`, PointerDrag hover/`CarryTarget`/`Solve`/`Finish`/`RerunViewportDrag`, Keyboard Esc `Clear`, ToolState `Clear`, SheetTools `Refresh`, CopyDrag `Retarget` (when present); carry CSS in `Styles__Main__Paper__.css`; AxisLock header paragraph | L | WP-S04b-06, WP-S04b-08, WP-S04b-09, D-S04b-01; the SheetTools hub ports (PointerDrag >= 1.7.0) | `LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__PointerPress__.js`; `..._PointerDrag__.js`; `..._Keyboard__.js`; `..._ToolState__.js`; `LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__.js`; `LE/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css`; `LE/30__System__SheetTools/Na__LayoutEditor__AxisLock__.js` (header) | hover a 2D viewport's linework shows the purple marker; the carry lands the point exactly; resting acquires tracking points; F3 off restores the plain frame move | (TV has no dedicated suite; GroupMoveSnapping covers viewport members; ledger row 720 closes) |
| WP-S04b-12 | Move anchor | Port `MoveAnchor__.js` + Config; PointerPress 1.8.0, PointerDrag 1.19.0, Keyboard 1.16.0, HitResolution 1.10.0, ToolState 1.7.0, SheetTools 1.39.0 anchor hunks; KeyMap 1.10.0 + ConfigState 1.29.0 + `SelectionBindings__MoveAnchorModifier` | L | WP-S04b-06, WP-S04b-08, WP-S04b-09, WP-S04b-11, CopyDrag (v2.117) port, D-S04b-01, D-S04b-08 | `..._PointerPress__.js`; `..._PointerDrag__.js`; `..._Keyboard__.js`; `..._HitResolution__.js`; `..._ToolState__.js`; `LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__.js`; `LE/03__Core__Config/Na__LayoutEditor__ConfigState__KeyMap__.js`; `LE/03__Core__Config/Na__LayoutEditor__ConfigState__.js`; `LE/03__Core__Config/Na__LayoutEditor__KeyMappings__.json` | Ctrl+click one item arms the cross and Move; dragging the cross snaps; the item lands by the cross; one undo step; nothing written by arming | `Na__Test__MoveAnchor__` (70 checks); `Na__Test__CopyDrag__` / `__SetMoveLeaderTips__` stubs |
| WP-S04b-13 | Grips and frames painted on the point (cross-slice) | Grips 1.10.0/1.11.0 (`OnLinework` state, `Place`, `PlaceBand`), SheetSurface 1.11.0 frames by translate - owned by the Grips and SheetSurface slices; this WP is the acceptance gate for the marker | M | WP-S04b-06 | `LE/30__System__SheetTools/Na__LayoutEditor__Grips__.js`; `LE/10__Core__SheetSurface/Na__LayoutEditor__SheetSurface__.js` | at 32x the marker's middle on the vertex; open-vector grips green on drawing points, blue elsewhere | `Na__Test__PaintedOnThePoint__` (116 checks) |
| WP-S04b-14 | Test harness port | Port `Na__TestEnv__ObjectSnapBundle__.cjs` (path-generic, verbatim) and the suites staged with WP-03..13; adapt headers, the key file path (D-S04b-07) and stubs for hubs VV has not reached | M | the WP each suite covers | `80__Testing__PrototypeEnvironment/` only | each suite exits 0 in VV with node | ObjectSnap, OrthoMode, DrawingGrid, DrawingAxes, MoveAnchor, GroupMoveSnapping, MoveRetype, PaintedOnThePoint (+ LayerMenu, CopyDrag, SetMoveLeaderTips, ViewportRotation with their slices) |
| WP-S04b-15 | Ledger, devlog, port notes | VV ledger: a return-trip section for TV v2.107-v2.149 drafting aids; fix the subfolder table (row 1130 "Snapping" in 30 for both apps; row 1128 ViewportSnapMove "TrueVision-only" in 20) and row 720; VV devlog entries per landed WP | S | each WP | `ValeVision__PARITY__TrueVisionLedger__.md`; `ValeVision__DEVLOG__.md` | ledger rows match the landed files; devlog numbers taken from a fresh read | - |
| WP-S04b-02R | [Verifier] Seams the drafting aids import (corrected) | Additive, from TV: Measurements `Na__LeMeasure__Say` (1.6.0, 8 lines on VV's existing `ShowHint`/`IsTyping`/`Root`) + export; SheetSurface `ZOOM_SETTLED_EVENT` (per D-S04b-04: full v2.111 package, or the interim event fired after every applied zoom), the chrome cache keyed by sheet id in `RefreshChrome` and `GetSheetChrome` (1.7.0/1.9.0); SheetModel__Layers `IsLayerSelectable` + SheetModel re-export; ShapeGeometry as a HUNK ONLY: `import { Na__LeRings__Of, Na__LeRings__Edges, Na__LeRings__Split } from './Na__LayoutEditor__ShapeRings__.js'`, `Holes`/`Rings`/`EdgePairs` and their exports - never TV's whole 1.9.0 file (it imports 53 ProjectQr, 54 SheetImages and SheetChrome `PushQr`); ToolSetup `GetSnappingSetup` `sheetChrome` + the five carry keys; AppConfig Snapping keys (+ Navigation `ZoomSettleMs`/`HoldPaperWhileZooming` with v2.111). Skip any seam its owning slice (S03b SheetSurface/ShapeGeometry/SheetModel, S05a Measurements, S03a config) has landed | M | WP-S04b-01 | `LE/30__System__SheetTools/Na__LayoutEditor__Measurements__.js`; `LE/10__Core__SheetSurface/Na__LayoutEditor__SheetSurface__.js`; `LE/07__Core__SheetData/Na__LayoutEditor__SheetModel__.js`; `LE/07__Core__SheetData/Na__LayoutEditor__SheetModel__Layers__.js`; `LE/15__Core__Markup/Na__LayoutEditor__ShapeGeometry__.js`; `LE/03__Core__Config/Na__LayoutEditor__ConfigState__ToolSetup__.js`; `LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json`; with the full v2.111 package also `LE/10__Core__SheetSurface/Na__LayoutEditor__Navigation__.js`, `..._Controls__Pc__.js`, `..._Controls__TouchScreen__.js`, `..._Styles__Main__Paper__.css`, `LE/03__Core__Config/Na__LayoutEditor__ConfigState__EditorSetup__.js`, `LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__.js` (1.32.0), `..._SheetTools__PointerDrag__.js` (1.8.0), `LE/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js` (1.14.0), `LE/50__Feature__Specification/Na__LayoutEditor__MarginGrip__.js` (1.2.0) | every name in b.11 resolves; both verifiers exit 0; ShapeGeometry imports nothing from 53/54 and SheetChrome is untouched; nothing visible changes except (full v2.111) the soft-then-sharp zoom; the devlog entry has a SHARED SERVICE WORKER note naming the new exports | - |
| WP-S04b-06R | [Verifier] Object snap core and a cycle-free switch-over (replaces WP-S04b-06) | Port the 13 core files of `LE/28__System__ObjectSnap/` (State, Geometry, Glyphs, Index, Sources, Search, Marker, Moves, GridMoves, controller, Menu, Config, `Styles__ObjectSnap__.css`); link the CSS in the loader STYLESHEETS after Main__Paper. In the SAME commit: (1) delete VV's old `.na-le-osnap`, tone, `[hidden]` and `--mid` rules (`Styles__Main__Paper__.css:296-337`, keep `.na-le-frame__progress`) and `.na-le-osnap--infer` (`:577-581`); (2) replace `Snapping__.js` with a shim that imports ONLY from `__Search__` (`Find, Snap, ShowMarker, HideMarker, Clear, IsEnabled, KIND_END, KIND_MID`) and `__State__` (`CHANGED_EVENT`) and declares `TONE_VERTEX/DIMENSION/VIEWPORT` as local strings - it must not import the controller; (3) repoint `Keyboard__.js:123`, `Toolbar__.js:110` and `SheetTools__ContextMenu__.js:100` to `../28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__.js` and `ModeController__.js:228` to `__Search__` | L | WP-S04b-01, WP-S04b-02R, WP-S04b-05 | `LE/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css`; `LE/30__System__SheetTools/Na__LayoutEditor__Snapping__.js`; `LE/01__Core__Loader/Na__LayoutEditor__Loader__.js`; `LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__Keyboard__.js`; `LE/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js`; `LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__ContextMenu__.js`; `LE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js` | remaining `Snapping__` importers (HitResolution, PointerDrag, the four tools) link; the shim imports nothing from `Na__LayoutEditor__ObjectSnap__.js`; both verifiers exit 0; markers are SVG glyphs coloured by target with no box and no clipped triangle; F3, the Snap button and the context-menu row still switch snapping and now echo `<Osnap on/off>`; text corners, the Modern title block and the notes margin snap; at 32x the marker's middle is on the vertex; devlog SHARED SERVICE WORKER note | `Na__TestEnv__ObjectSnapBundle__.cjs`, `Na__Test__ObjectSnap__`, `Na__Test__PaintedOnThePoint__` (marker part) |
| WP-S04b-11R | [Verifier] Viewport snap move (carry), corrected (replaces WP-S04b-11) | Port `ViewportSnapMove__.js` 1.6.0. Add TV's `Na__LeTools__CarryTarget` to VV `SheetTools__HitResolution__.js` (TV `:753-768`, exported `:797`; add `Na__LeModel__GetSelectionItems` and `Na__LeModel__IsSelected` to its SheetModel import - VV SheetModel already exports both); PointerPress `GrabAt` (TV `:353-354`); PointerDrag hover with `CarryTarget`, ApplyDrag `Solve` (`:676`), FinishDrag `Finish` (`:1003`), `RerunViewportDrag` (PointerDrag 1.7.0); Keyboard Escape `Na__LeVpMove__Clear` (`:692`); ToolState `Clear`; SheetTools `Refresh` after a model change; CopyDrag `Retarget` only once CopyDrag exists; the carry CSS (TV `Styles__Main__Paper__.css:824-887`); the ToolSetup reader keys and AppConfig keys `ViewportCarry`, `ViewportTracking`, `AcquireDwellMs`, `AcquireMax`, `TrackMarkerSizePx` are REQUIRED (read with no fallback); AxisLock header paragraph | L | WP-S04b-06R, WP-S04b-08, WP-S04b-09, D-S04b-01; the SheetTools hub ports (PointerDrag >= 1.7.0) | `LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__HitResolution__.js`; `..._PointerPress__.js`; `..._PointerDrag__.js`; `..._Keyboard__.js`; `..._ToolState__.js`; `LE/30__System__SheetTools/Na__LayoutEditor__SheetTools__.js`; `LE/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css`; `LE/03__Core__Config/Na__LayoutEditor__ConfigState__ToolSetup__.js`; `LE/03__Core__Config/Na__LayoutEditor__AppConfig__.json`; `LE/30__System__SheetTools/Na__LayoutEditor__AxisLock__.js` (header) | as WP-S04b-11, plus: with `LayoutEditor__Snapping__ViewportCarry` false the plain frame move returns (proves the key is read); a press on a crop handle, the rotate grip, a locked viewport or one member of a multi-selection never carries | (ledger row 720 closes) |
| WP-S04b-16 | [Verifier, added] The shared service worker for every wave of this slice | Per D-S04b-V01. No WP edits `D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\02__Src__AppModules\62__Feature__AppInstallability\Whitecardopedia__Pwa__ServiceWorker__Logic__.js`. Each VV devlog entry of this slice ends with a "THE SHARED SERVICE WORKER" note in VV's own form (VV devlog v2.67-v2.71): which modules are new, which existing modules gained exports, and whether the token (`PWA_SW_VERSION_TOKEN`, `:229`, `2026-09-18-1` on 01-Oct-2026) needs bumping; the swarm hands Adam one consolidated bump request per deployed wave. The ledger return-trip rows record "Service worker token: shared Whitecardopedia worker - Adam's call", never "n/a" | S | each deploying WP | `ValeVision__DEVLOG__.md`; `ValeVision__PARITY__TrueVisionLedger__.md` | every devlog entry of this slice carries the note; no file outside `D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D` is touched; Adam has answered D-S04b-V01 before any wave deploys | - |

Notes on tests in VV: TV's suites cut code out of the SHIPPED hub files (for example `Na__Test__OrthoMode__` loads ShapeTool,
DimensionTool, PointerDrag, Keyboard, SheetTools__State, KeyMap and the key JSON with their imports stubbed), so a suite only
passes once VV's hub files carry the matching hunks - they are the acceptance gates for WP-07/08/09/12, not just for the
folders. `Na__Test__DrawingTabKeys__` also needs `03__AppUtils/Na__AppUtils__KeyScope__.js`, which VV lacks (KeyScope
slice). The three browser-draft suites (DraftGuard, DraftRestore, DrawingDrafts) belong to the persistence slice.

---------------------------------------------------------------------------------------------------

## Verification

Adversarial verifier pass, 01-Oct-2026. Read-only on both apps and on Whitecardopedia. Working files:
`scratchpad/parity/verify_s04b/` (`versions.py` - highest logged version of 43 hub files in both apps; `hdronly.py` -
code-line recount of the `header-only` rows; a copy of this report as it stood before the pass).

### What was checked

- **Coverage.** All 31 TV files of the five folders (drift_all: 31 `tv-only`, 8,752 lines - recomputed), `AxisLock__`
  (shared) and VV-only `Snapping__.js`: every one maps to a finding. 21 JS files, 6 JSON, 4 CSS. Swept VV
  `02__Src__AppModules` for an equivalent under other names (draft, hairline, grid snap, ortho, axes, crosshair, zoom
  settle, echo, anchor, carry, group translation, RedrawHeld): none; VV's top-level `28__System__GridLineSystem` is a
  Three.js ground grid, not a drawing grid. Every TV file OUTSIDE the five folders that references them was listed (35
  files) and each is covered by c.3, (d).10 or another slice, plus TV's own PWA worker (log comments only).
- **"VV lacks" claims.** Re-ran `work_s04b/imports.py` over all 21 TV JS files: exactly the nine missing names reported
  (ZOOM_SETTLED_EVENT, GetSheetChrome, Say, IsLayerSelectable, Rings, EdgePairs, and the three leaves' files). Each was
  then grepped in VV under any name: absent. VV's `ShowHint`/`IsTyping`/`Root` (for `Say`), `RefreshChrome` (`:573-579`),
  the chrome primitive shape (`SheetChrome__.js:123-124, :228-242`), `Refresh('frames')`, `GetSnapSource`, Window
  `ToPaper`, PanelHost `RegisterSection('left', ...)`, `na-le-stage--panning` and `na-le-frame--3d` (composed at
  `SheetSurface__.js:526`) all exist as claimed.
- **Versions and devlog.** Every in-scope file's log read (none changed after 22-Sep); 43 hub-file versions in both apps
  recomputed - every TV/VV pair in c.3 matches. Devlog entries v2.107, v2.111 (its Files list), v2.113, v2.114, v2.129,
  v2.131, v2.137, v2.149 read, with their ValeVision lines: "NOT tried by Adam; NOT in ValeVision" or "Adam has not tried
  it" at 2906 (v2.138), 3010 (v2.137), 3532 (v2.131), 3782 (v2.129), 5200 (v2.114), 5321 (v2.113); "Not ported ... on
  Adam's sign-off" at 5493 (v2.111) and 5785 (v2.107); v2.149 (MoveAnchor) says nothing about ValeVision. Git: `7ab70638` deleted `Snapping__.js` on 21-Sep; `git log -S SnapGroupTranslation` confirms `32767407` (19-Sep)
  introduced group-move snapping.
- **Line references.** Checked against the files: Search (`:164`, `:410`, `:462`, `:480`, `:506-518`, exports `:627-654`),
  Marker (`:73/:79`, `:160`, `:188`, `:244`), controller (`:33-37`, `:60-63`, `:219`, `:235`), State (`:71-99`,
  `:121-126`), PointerDrag (`:343-357`, `:565`, `:583-617`, `:648`, `:676`, `:709`, `:779`, `:1000-1011`), PointerPress
  (`:202-203`, `:353-354`, `:525`, `:633`, `:822`, `:864`), Keyboard (`:254-259`, `:469-505`, `:790-844`), Toolbar
  (`:211-220`, `:473-501`, `:587-605`), ModeController (`:327-329`, `:349`, `:529`, `:574-587`, `:774` vs VV `:228`,
  `:416`, `:448-461`, `:558`), key JSON (`:266-350`, `:910-911`, `:1151-1177`), KeyMap fallback, SHEET_CHORDS, viewport
  Draft guards (all twelve), VV old marker CSS (`:306-337`, `:577-581`), loader STYLESHEETS (`:125-134`), TV CSS index
  (`:161-174`), ledger rows 446, 504, 715, 720, 1128, 1130.
- **Actions.** Screened all 31 files for TV-only systems (site plan, Model Source, PlanDoors, floor areas, sheet images,
  Cloudflare, R2, Project QR): only `Sources__.js:238` reads `Sheet__MarginNotes.Regions` (inert in VV). Config `Meta__Author`
  "Adam Noble - Noble Architecture" is VV's own convention too (VV configs carry it). Drawing-grid Show and Snap default
  OFF, so adopting TV Search does not silently snap VV to a grid. Storage keys and events: no clash in VV; production
  origins differ (TV www.noble-architecture.com, VV adam-noble-01.github.io), so identical keys never meet.
- **Tests.** All named TV suites exist (CopyDrag and SetMoveLeaderTips are `.test.cjs`); DraftGuard, DraftRestore and
  DrawingDrafts load no `26__System__DraftMode` file; GroupMoveSnapping 1.2.2 loads the real ViewportRotation leaf; VV has
  no KeyScope. `Na__Test__SheetsNormaliseOnce__` and `Na__Test__VectorQuality__` mention the bundle in comments only.

### Verdicts by finding

| Verdict | Findings |
|---|---|
| Confirmed as written | F01, F03, F04, F05, F07, F08, F09, F10, F11, F12, F13, F14, F16, F17, F18, F19, F20, F21, F22, F23, F25, F26, F27, F28, F30, F31, F32, F34, F35, F36, F37, F38, F39, F41, F42, F43, F44, F45, F47, F48, F50, F51, F52, F53, F54, F55, F56, F58 (recount 38, method-dependent), F59, F60, F62, F63, F64, F65 |
| Confirmed with a correction | F02 (lineage nuance; shim must not import the controller), F06 (v2.111 file list incomplete), F15 (GetSnapSource key differs by `'|' + win.RotationDeg`), F24 (CarryTarget lives in HitResolution; reader keys mandatory), F29 (DimensionTool also needs IsLayerSelectable), F33 (drop TOOL_AREA too), F40 (ShapeGeometry hunk only), F57 (124 not 126), F61 (20 of 21 JS files, not "all 23"), D-S04b-09 |
| Refuted | F49 - VV is NOT without a service worker (see Headline 6 and (d).12) |
| Not separately re-verified | F46 (UI summary; its parts are verified under F22/F35/F37/F09), the per-suite check counts in F50-F55 |

### Added

- **S04b-V01** (decision, high) - the shared Whitecardopedia + ValeVision3D service worker; D-S04b-V01; WP-S04b-16.
- **S04b-V02** (wiring, medium) - the `Snapping__` shim must not re-export the controller (module cycle through
  Measurements); WP-S04b-06R.
- **S04b-V03** (wiring, high) - the ShapeGeometry seam is a hunk; a whole-file port of TV 1.9.0 fails to link in VV and
  drags in NA's Project Portal QR (53) and Sheet Images (54).
- **S04b-V04** (wiring, medium) - the carry needs TV-only `Na__LeTools__CarryTarget` added to VV HitResolution, and its
  config keys are mandatory; WP-S04b-11R.
- Work packages: WP-S04b-02, -06 and -11 refuted and replaced by -02R, -06R and -11R; WP-S04b-16 added.

### Still unverified

- Nothing was run in either app or under Node: the TV suites were not executed (S05a reports several passing at TV
  HEAD), and the cycle in S04b-V02 was judged by reading VV Measurements (every tool call inside a function body), not by
  loading the graph.
- Logic bodies of Menu, Glyphs, Geometry, the middle of GridMoves, ViewportSnapMove `:175-638` and MoveAnchor `:200-707`
  were not line-reviewed (imports, exports and call sites were).
- Whether the Modern title block's chrome in VV yields the same stroked rect/line primitives as TV's (shape verified;
  content not compared - S03b's area).
- The exact visual result of "Draw grid on top" off against VV's pre-1.7.0 paper stack (z-index reasoning only).
