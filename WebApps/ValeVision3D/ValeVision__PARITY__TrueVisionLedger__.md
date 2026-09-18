# ValeVision 3D - TrueVision Parity Ledger

Tracks every module pair between ValeVision 3D and TrueVision 3D for the systems ported under
`ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md`. One row per pair. Update the row whenever either
side changes; log fixes made here that TrueVision still needs in the Pending back-port table at the foot.

Parity states: `verbatim` (logic identical, headers and console prefix differ), `adapted` (deliberate
divergences listed in the file's PORT NOTE), `diverged` (same purpose, different implementation),
`new` (no TrueVision counterpart yet, back-port candidate).

TrueVision root: `D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb\na-apps\30__TrueVision__CoreAppCode`
(working copy for the re-alignment: `D:\WE10_--_Public-Repo_--_Live-Website\na-apps\30__TrueVision__CoreAppCode`).
ValeVision root: `WebApps/ValeVision3D`.

**Direction of travel reversed, 10-Sep-2026.** The back-port is now under way and is
planned in `TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md` in the TrueVision
root. Rows below are closed from the TrueVision side as each phase lands. Five
structural divergences are deliberate and permanent - the drawing render path, the
section engine, the drawings-block location, the persistence transport and (until now)
the library baseline; see section 2.2 of that plan before assuming a file copies.

### Back-port progress

| Phase | Scope | State |
|---|---|---|
| A | Version-locked libraries (r184 set) | **done** - TrueVision v2.20.0, live |
| B | Drawing core, drawings-block migration | **done** - v2.21.0 |
| TD06 | Section data in ValeVision's schema | **done** - v2.21.0 |
| C | Floor plan / elevation feature parity | **mostly done** - v2.21.0. Pick Face, gizmo grip, scene editor splits, styles, exclusions, dimension splits and the confirm dialog all landed. Ground Floor Plan quick action and sections-filed-by-type still outstanding |
| D | Projected linework | **done** - v2.22.0, all 24 files |
| E | Layout Editor | **done** - v2.23.0, all 49 files |
| F | Authoring gate (TrueVision-only, TD01) | **done** - v2.24.0 |

**Closed from the Pending back-port table below**: scene row builders and reorder
splits; per-drawing style toggles; dimension config and preview splits; the R2 asset
upload utility; the async confirm dialog; Pick Face and the gizmo grip; shared drawing
style rows and config state; the whole Layout Editor.

**Still outstanding**: the Ground Floor Plan quick action, sections filed by drawing
type, and the two Lantern Designer items (the rotation path in the soup builder, hidden
segments through the worker pool) which are ValeVision-to-ValeVision rather than
back-ports.

**New in TrueVision, not in ValeVision** - candidates for the return trip:
`Na__AppUtils__DevGate__` (authoring unlocked by flag rather than hostname, so an
installed app can author), and the two verification harnesses
`Na__Verify__ModuleGraph__` and `Na__Verify__Exports__`, which between them prove that
every file resolves and every imported NAME exists. The second caught faults in this
port repeatedly and ValeVision has no equivalent.

### Pending return trip - fixed in TrueVision, awaiting Adam's sign-off

| Item | Why | State |
|---|---|---|
| Undo and redo stop writing the project (TrueVision v2.30.1) | The same fault is here: `Na__LeHist__Apply` restores through `Na__LeModel__UpdateSheet(sheet, {})`, announced as `sheet-updated`, which `Na__LeAuto__STRUCTURAL` treats as a sheet-settings change - so every Ctrl+Z and Ctrl+Y saves the whole project. TrueVision's fix is three modules: `Na__LeModel__AnnounceRestore` and a `restore : { direction, stepReason }` field on the change event, step reasons kept by History (plus the missing shape case in its selection test), and `Na__LeAuto__CallsForSave` judging a restore by its step. Content undo becomes draft-only; structural undo still saves | **pending** |

### Return trip - TrueVision to ValeVision (15-Sep-2026, margin notes spacing)

Authored in TrueVision (SpecMargin 1.3.0, ConfigState 1.22.0, v2.54.0) and ported
at Adam's request as ValeVision v2.44.0. The SpecMargin, ConfigState, SheetRecords
and config halves were already on disk from an unrecorded writer (14-Sep, 23:02 to
23:04) and match TrueVision code for code; this port added SheetLayout's MarginRect.

**Left out:** service worker token (n/a).

| Item | Why | State |
|---|---|---|
| Stretching note gaps (NoteGapMm the least, NoteGapMaxMm the most) | Room at the foot opens every gap evenly up to the most; a column whose notes did not all fit keeps the least; each rule centred in its gap | **ported** (VV 2.44.0, from TV 2.54.0; SpecMargin 1.3.0 verbatim) |
| Code, pipe and title on one line; rules between notes; PaddingRightMm; 2 mm body | TV SpecMargin 1.1.0 and 1.2.0, ConfigState's margin fields, SheetRecords' 2.2 mm migration | **ported** (on disk before this port; code-identical) |
| SheetLayout MarginRect, Solve's Margin, the drawing area short of it | SpecMargin imports MarginRect; without it the Layout Editor's module graph could not link | **fixed** (SheetLayout 1.2.0, verbatim) |
| Service worker token | TrueVision PWA cache bust `2026-09-14-23` | **n/a** - this tree has no PWA worker |

### Return trip - TrueVision to ValeVision (15-Sep-2026, specification reading mode)

Authored in TrueVision (SpecEditor 1.1.0, new SpecDocument 1.0.0, v2.51.0) and
ported the next morning at Adam's request as ValeVision v2.43.0.

**Adapted:** the project's name on the pages comes from the folder id, where
TrueVision reads its PWA project context; the DrawView path is 42__.

**Left out:** service worker token (n/a).

| Item | Why | State |
|---|---|---|
| Edit and Read tabs in the Project Specification tab | Read shows the specification as the A4 pages it prints as | **ported** (VV 2.43.0, from TV 2.51.0) |
| SpecDocument pagination | Measured blocks; headings kept with what follows; only chunks taller than a third of a page break, two lines each side; every block 2 px clear of the foot | **ported** (code identical) |
| Print | A body-level paper container shown alone under `@media print`; `@page` A4 with no margins only between beforeprint and afterprint | **ported** |
| Read aloud | Real headings and paragraphs; page furniture painted from attributes; the sheet hidden while the tab is up | **ported** |
| Project name on the pages | TrueVision reads `window.TrueVision__Pwa__ProjectContext`, which this tree lacks | **adapted** - the name part of the folder id, as the share-link emails use |
| 17 labels | SpecView*, SpecReaderLabel, SpecPages*, SpecPrint*, SpecDoc* | **ported** |
| Service worker token | TrueVision PWA cache bust `2026-09-14-20` | **n/a** - this tree has no PWA worker |

### Return trip - TrueVision to ValeVision (15-Sep-2026, 3D viewport zoom)

Authored in TrueVision (Viewport3dZoom 1.0.0, Viewport3d 1.6.0, TiledRenderer
2.1.0, v2.50.0) and ported at Adam's request after he signed it off, as
ValeVision v2.42.0.

**Left out:** the design phase lines (no model groups here); service worker token (n/a).

| Item | Why | State |
|---|---|---|
| Wheel zoom inside an edited 3D viewport, Enter to finish | `Na__LayoutEditor__Viewport3dZoom__` (new); the PC controls offer it the wheel; SheetTools Edit__Finish ends content editing | **ported** (VV 2.42.0, from TV 2.50.0) |
| Zoom % box and Reset | Panel__ViewportSettings zoom row, greyed when locked | **ported** |
| Frame as a window onto the picture | Viewport3d Window / Place / ExportRectMm; Render3d and the tiled renderer's viewWindow | **adapted** - VV's renderer keeps its per-tile shear, offsets the Silly Lines phase, 3D only |
| `Viewport__ImageZoom` record field | SheetRecords clamp, SheetModel patch, ConfigState limits, AppConfig keys and labels, KeyMappings labels | **ported** |
| Service worker token | TrueVision PWA cache bust | **n/a** - this tree has no PWA worker |

### Return trip - TrueVision to ValeVision (15-Sep-2026, text rotation)

Authored in TrueVision (v2.52.0) and ported the next morning at Adam's request, after he signed it off, as
ValeVision v2.41.0. The TrueVision hunks replayed as they were: this tree already had multi-line sheet text and
the rest of the text code they sit on. Only the module log heads, one Grips region comment and one SheetTools
header bullet needed ValeVision's own anchors.

**Left out:** service worker token (n/a - this tree has no PWA worker). Nothing else.

| Item | Why | State |
|---|---|---|
| Rotate grip on a selected text item | Round grip on a stem off the top of the outline; drag turns the text about the middle of its box; Shift steps 15 degrees; a free drag settles on a right angle within 2 degrees | **ported** (VV 2.41.0, from TV 2.52.0) |
| Record key `Annotation__RotationDeg` | Degrees clockwise about the anchor, wrapped into (-180, 180], written only while turned; same record shape in both apps | **ported** |
| Text panel Rotation row; Reset rotation | Turns the selection about its middle, or sets the angle for new text; the menu levels turned text | **ported** |
| Turned text everywhere | Lines, leader, selection outline, hit test, box select, inline editor and new-text placement follow the turn | **ported** |
| PDF placement of turned centred or right-aligned runs | jsPDF turns such a run about its shifted start; the run is now placed by its own left end. Also moves vertical and aligned dimension values onto the spot the screen draws | **ported** |
| Config and labels | Text `RotateStepDeg`, `RotateDetentDeg`, `RotateGripOffsetPx`; `TextRotation`, `MenuResetTextRotation`, `TextSelectedNote` | **ported** |
| Service worker token | TrueVision PWA cache bust `2026-09-14-21` | **n/a** - this tree has no PWA worker |

### Return trip - TrueVision to ValeVision (14-Sep-2026, VCB viewport move)

Authored in TrueVision (SheetTools 1.24.0, Measurements 1.2.0, v2.47.0) and
ported the same day at Adam's request as ValeVision v2.39.0.

**Left out:** ViewportSnapMove carry (this tree has none); service worker token (n/a).

| Item | Why | State |
|---|---|---|
| Typed length while dragging a viewport frame | GetViewportDrag / TypeViewportLength; exact mm; drag finished; at the viewport's scale | **ported** (VV 2.39.0, from TV 2.47.0) |
| Handle crop / content pan | Do not wake the Measurements box | **ported** (same gate: `hit.mode === 'border'`) |
| Service worker token | TrueVision PWA cache bust `2026-09-14-13` | **n/a** - this tree has no PWA worker |

### Return trip - TrueVision to ValeVision (14-Sep-2026, groups and multi-item clipboard)

Authored in TrueVision (Groups 1.0.0, ItemClipboard 1.0.0, SheetModel 1.18.0,
SheetRecords 1.13.0, SheetTools 1.23.0) and ported the same day at Adam's
request as ValeVision v2.38.0.

**Left out:** TrueVision's undo-restore / `AnnounceRestore` change (still
pending sign-off).

| Item | Why | State |
|---|---|---|
| Group / ungroup (Ctrl+G / Ctrl+Shift+G) | Sheet__Groups records; mixed vectors and text; nested groups; blue box + "Group" overlay | **ported** (VV 2.38.0) |
| Multi-item / text / group copy-paste | ItemClipboard wraps ViewportClipboard; silent inserts, one undo step | **ported** |
| History `'groups'` step | SelectionExists keeps a selected group and a selected vector | **ported** (shape case included; restore field still pending) |

### Return trip - TrueVision to ValeVision (14-Sep-2026, dimension text leader)

Authored in TrueVision (DimensionGeometry 1.3.0 to 1.5.1: drag the value off the
line, justified-side landing, outward hook, softer bow) and ported the same day
at Adam's request as ValeVision v2.37.0.

**Left out:** fixed-length extension lines (panel rows and record keys).

| Item | Why | State |
|---|---|---|
| Drag dimension value + curved leader | TextDXMm / TextDYMm, outward-bulging arc to MID | **ported** (VV 2.37.0) |
| Justified handing | Left/right of centre, arc on the justified side | **ported** |
| Reset text position | Context menu; snap home within TextLeaderMinMm | **ported** |
| Extension-line lengths | Geometry 1.2.0 and panel rows in TrueVision | **skipped** - still a separate pending port |

### Return trip - TrueVision to ValeVision (14-Sep-2026, eyedropper viewports)

Authored in TrueVision (eyedropper 1.6.0 / SheetTools 1.22.0) and ported the same
day as ValeVision v2.36.0.

**Left out:** `Viewport__ShowFrame` (TrueVision Frame toggle, plan item W) - this
tree does not store the key yet.

| Item | Why | State |
|---|---|---|
| Eyedropper matches unlocked viewports | Composites, caption, scale; locked frames skipped in Resolve | **ported** (VV 2.36.0) |
| `Viewport__ShowFrame` trait | Frame on/off copied with the rest | **skipped** - Frame toggle not in this tree |

### Return trip - TrueVision to ValeVision (14-Sep-2026, clipboard / snap / VCB)

Authored in TrueVision (v2.44.0 clipboard + draw-vertex undo, v2.45.0 whole-shape snap +
Shift-click insert, v2.46.0 VCB vertex-drag typed length on top of v2.40) and ported the
same day as ValeVision v2.35.0. Viewport clipboard is included because ValeVision had
none yet.

**Left out:** PlanDoors, ViewportSnapMove, ModelSource, SpecEd, measure-at-scale /
extension-line **panel rows**, service worker token (n/a). `atScale` is hardcoded true
in GetShapeDefaults / GetDimensionDefaults so DrawingScale works. DimensionTool
BeginTextEdit stays ValeVision's (`Na__LeDimGeo__TextPlacement`). CreateDimension does
not store `Dimension__AtScale` or extension-line fields.

Every new log entry ends with the TrueVision version of that slice (2.44.0 / 2.45.0 /
2.46.0).

| Item | Why | State |
|---|---|---|
| `51/Na__LayoutEditor__ViewportClipboard__` | Copy/paste/duplicate viewport and vector; Ctrl+C/V/D | **ported** (from TV 2.44.0) |
| Draw-vertex undo | Ctrl+Z / Ctrl+Y while placing a polyline | **ported** (from TV 2.44.0) |
| Whole-shape snap + Shift-click insert | SnapShapeTranslation, insert diamond | **ported** (from TV 2.45.0) |
| Measurements box (VCB) | Typed lengths for Draw/Rectangle/Dimension and vertex drag | **ported** (from TV 2.40 / 2.46.0) |
| DrawingScale / MeasureParse | Scale conversion for the box | **ported** (from TV 2.46.0) |
| Vectors/Dimensions panel `atScale` rows | Measure-at-scale / Draw-at-scale toggles | **skipped** - hardcoded `atScale: true` |
| Extension-line panel rows | Dimensions panel UI | **skipped** |
| Service worker token | TrueVision PWA cache bust | **n/a** - this tree has no PWA worker |

### Return trip - TrueVision to ValeVision (14-Sep-2026, dimension end size)

Authored in TrueVision (v2.43.0) and ported the same day at Adam's request ("update the
ValeVision counterpart as well") as ValeVision v2.34.0. The Size mm field, the record
key `Dimension__TickLengthMm`, the draw path, the eyedropper, the selection box, the
defaults and the config. TrueVision's Measure at scale and extension-line rows were
left out: this tree has not taken them yet, and they are separate pending ports.

Every new log entry ends "Ported from TrueVision3D v2.43.0". No service worker token
here.

| Item | Why | State |
|---|---|---|
| `51/Na__LayoutEditor__Panel__Dimensions__` 1.2.0 | Size mm under Ends | **ported** |
| Record and model | `Dimension__TickLengthMm` (SheetRecords 1.7.0, SheetModel 1.8.0). Same field name as TrueVision | **ported** |
| Painting and boxing | MarkupBridge 1.6.0 (`DimensionTickMm`); SelectionBox 1.1.0 boxes the terminator at that size | **ported** |
| Tools and eyedropper | SheetTools 1.12.0 and DimensionTool 1.3.0 take `tickLengthMm` for new dimensions; Eyedropper 1.4.0 copies it | **ported** |
| Config | ConfigState 1.7.0: `minTickLengthMm` / `maxTickLengthMm`. `MinTickLengthMm`, `MaxTickLengthMm` and labels `DimEndSize`, `DimEndSizeTitle` | **ported** |
| Service worker token | TrueVision bumped `2026-09-14-9` | **n/a** - this tree has no PWA worker |

### Return trip - TrueVision to ValeVision (14-Sep-2026, box select)

Authored in TrueVision (v2.34.0), in the same files and at the same time as Leaders. Tested there and signed off
("It seems to be working to me"), then ported the same day as ValeVision v2.33.0. It went on top of the Leaders port
(v2.32.0), by agreement between the two sessions.

The hunks are Box Select's own, from the patch files that landed it in TrueVision: 79 across 13 shared files, plus
the two new modules. On the dry run against this tree after Leaders:

- 10 were development-log heads, rewritten to this tree's module versions.
- 6 were re-anchored where this tree lacks TrueVision's viewport snap-move and viewport clipboard, or words things
  differently: the new-module imports, CancelPlacement, Escape, the zoom redraw (`dropperdraw`), the context menu call
  and the History header.
- 1 was left out: CarryTarget's multi-selection guard, as this tree has no viewport carry.
- The rest matched verbatim, including the conversions of Leaders' original hunks (DeleteLeader, the leader highlight).

Nothing was written until every anchor was unique. Every new log entry ends "Ported from TrueVision3D v2.34.0".

| Item | Why | State |
|---|---|---|
| `51/Na__LayoutEditor__SelectionBox__.js`, `__SelectionSet__.js` 1.0.0 | The window and crossing rules for each kind, leaders included; the box and its live preview; the Add / Toggle / Remove combine. Group capture, move and commit, nudge and delete, one undo step each; locked items left out; the leader tip rule | **ported**, verbatim (header only) |
| Model and history | The selection is a set: `SetSelectionItems`, `GetSelectionItems`, `IsSelected`, `Unselect` in every delete, and `DeleteItems` (SheetModel 1.7.0). `GetSelection` still means exactly one item. History 1.2.0 prunes the set on a restore | **ported** - see the shape row below |
| Tools | SheetTools 1.11.0: `StartsBox`, `PressSelection`, `BoxUp`, the group drag, multi nudge, delete and menu, Escape mid-box, and `FinishDrag(pointerId, released)` | **ported**, less CarryTarget's guard |
| Surface and markup | SheetSurface 1.4.0 and ViewportHandles 1.3.0 (`RenderOutlines`: outlines and no grips for several); MarkupBridge 1.5.0 (a highlight round every selected item) | **ported** |
| Config, keys, panels and styles | ConfigState 1.6.0 (box setup, `MatchSelectionModifier`). The SelectionBindings block and three Select actions; the Selection box keys and six labels. The several-selected note in Panel__Text 1.1.0, Panel__Dimensions 1.1.0 and Panel__Shapes 1.5.0. The box and preview colours | **ported** |
| Service worker token | TrueVision's one token bump covered both features | **n/a** - this tree has no PWA worker |

**The History shape row is still missing here** (see the Leaders section below). With Box Select it matters to a
multi-selection too: an undo or redo takes every selected vector out of the set. It returns with the undo-writes
return trip in the Pending table.

Verified here:

- All 12 edited and new modules parse as ES modules, and both JSON files parse.
- `Na__Verify__ModuleGraph__` passes, with the one known vendor issue unchanged.
- `Na__Verify__Exports__` passes on 317 files, with every `Na__` name imported or declared.
- The TrueVision box select harness, pointed at this tree's real modules, passes 86 of 87. The one failure is the
  shape row above: a redo that removes a selected text item drops the selected vector with it.

Not exercised in the running app: testing was kept light at Adam's request after his sign-off in TrueVision.

### Return trip - TrueVision to ValeVision (14-Sep-2026, leaders and annotation bubbles)

Authored in TrueVision (v2.35.0). Tested there and signed off ("It seems to be working to me"), then ported the same
day as ValeVision v2.32.0.

The port was replayed from a snapshot of the signed-off files, NOT from TrueVision's working copies. Within the hour
those had grown Project Specification hunks that are not signed off: a code resolver in the leader geometry,
`Leader__SpecNoteId` and margin notes.

Box Select (TrueVision v2.34.0) was built beside it in the same files. It crosses next as its own port, on top of
this one, and none of its hunks are here.

The hunks are the authoring session's own edits, lifted from its transcript in order: 123 across 21 files. On the
first dry run:

- 112 matched verbatim.
- 8 were development-log heads, where this tree's module versions differ.
- 3 were context this tree words differently: the History selection test, the SheetTools header, and the last label
  in the config.

Nothing was written until every anchor was unique. Every new log entry ends "Ported from TrueVision3D v2.35.0".

| Item | Why | State |
|---|---|---|
| `51/Na__LayoutEditor__LeaderGeometry__.js`, `__LeaderTool__.js`, `__Panel__Leaders__.js` 1.0.0 | The leader itself: the sweeping S between level stubs, handing by the side of the point, bubble growth, circle facets, bounds and hit parts; two-click or drag placement with the inline note and bubble fields and the next bubble code; the Leaders panel and its Endpoint fold | **ported**, verbatim (header only) |
| Record and model | `Sheet__Leaders` and `Na__LeRec__NormaliseLeader` (SheetRecords 1.6.0); `GetLeaders`, `CreateLeader`, `UpdateLeader` and `DeleteLeader`, announced as 'leaders' / 'leader' (SheetModel 1.6.0); `Shape__FillOpacity` and `Shape__StrokeOpacity`. Same field names and defaults as TrueVision, so either app reads the other's leaders | **ported** |
| Painting | SheetChrome 1.3.0's polyline carries `DashMm`, `FillOpacity` and `StrokeOpacity` (SVG attributes; PDF dash and jsPDF `GState` inside a saved state). MarkupBridge 1.4.0 draws leaders last and hit-tests them first. ShapeGeometry 1.3.0 passes the shape opacities | **ported** |
| Tools and editing | SheetTools 1.10.0: the E tool; press, move and release; grips through `LeaderGrab`; drags, nudge and delete; the context menu; double-click. Grips 1.3.0. TextTool 1.1.0 (the multi-line field). Eyedropper 1.3.0 (leader traits, `paletteOnly`). ShapeTool 1.3.2 and RectangleTool 1.0.2 take the panel opacities | **ported** |
| Panels, toolbar and history | ModeController 1.10.0 registers the Leaders panel after Text. Toolbar 1.9.0 gains the Leader button. PanelHost 1.2.0 gains `SliderRow` / `ShowSlider`. Panel__Shapes 1.4.0 gains Fill opacity, Transparent edges and Edge opacity. History 1.1.0 gains the step reasons and the leader row of its selection test | **ported** - History takes the leader row only (see below) |
| Config, keys and styles | ConfigState 1.5.0: `GetLeaderSetup` and the shape opacity keys. The `LayoutEditor__Leader__Config` block, the Shapes opacity keys and the labels. `Tool__Leader` on E. The multi-line field, anchor grip and Endpoint sub-fold rules | **ported** |
| Service worker token | TrueVision bumped its PWA token for the new exports | **n/a** - this tree has no PWA worker |

**The History selection test takes the leader row only.** TrueVision's test also has a shape row, so an undo there
keeps a selected vector selected. Here every undo still drops it. That row belongs to the undo-writes return trip in
the Pending table above, which awaits sign-off, so it waits with it.

Verified here:

- All 20 edited and new modules pass `node --check`, and both JSON files parse.
- `Na__Verify__ModuleGraph__` passes, with the one known vendor issue unchanged.
- `Na__Verify__Exports__` passes on 315 files, with every `Na__` name imported or declared.
- The TrueVision leader harness, pointed at this tree's real modules, passes 83 of 83. It covers the geometry, the
  normalisers, the next code, the eyedropper's palette-only type, and old-style primitives painting byte-identically
  to this repo's HEAD.

Not exercised in the running app: testing was kept light at Adam's request after his sign-off in TrueVision.

### Return trip - TrueVision to ValeVision (13-Sep-2026, snapshot upload stamp)

Fixed in TrueVision (v2.32.1, `Na__LayoutEditor__Viewport3d__` 1.5.1) and ported the same
day at Adam's request as ValeVision v2.31.1. Both hunks - RenderNow's stamp and return, and
Bake's count - are TrueVision's line for line. The module's remaining difference is still
TrueVision's Model Source (1.5.0), which has no model groups to act on here.

| Item | Why | State |
|---|---|---|
| `51/Na__LayoutEditor__Viewport3d__.js` 1.4.1 | RenderNow stamps `Viewport__SnapshotAsset` only when the upload came back with `r2Success === true`, and returns whether it did; Bake counts that return instead of reading the record. In TrueVision a refused upload stamped a path R2 never received, because its upload returns `r2Success : false` where this tree's throws. Here a refusal already came back null, but a forced bake, or a same-key record too narrow for export, still read as baked | **ported**, both hunks verbatim |
| `03/Na__AppUtils__R2AssetUpload__.js` | TrueVision's 1.0.1 corrects its PORT NOTE, which said shared callers need no branch: failure is `r2Success : false` there and a throw here, so a shared caller must test `r2Success` | **no change here** - the comment is on TrueVision's side |

Verified here: the module parses, the module graph resolves and 312 files' named imports
resolve. A Node harness loads the real module of each app against stubbed imports and
drives 10 cases (refused as a result object, refused as null, accepted; through Bake, Force
Render and the PDF render). This copy failed 5 before the port - one live with its own null
refusal, a forced bake over a same-key record read as baked - and passes all 10 after.
In the running app on Doous, every write refused and none attempted: Sheet_001's 3D viewport
rendered, and Force Render and both bakes left its record untouched, the bakes `failed`.
That host cannot upload, and the stored snapshot's fingerprint no longer matches the view,
so the upload branch and the same-key miscount rest on the harness.

### Return trip - TrueVision to ValeVision (13-Sep-2026, drawing layers grip and lock)

Authored in TrueVision (`Na__LayoutEditor__Panel__Layers__` 1.1.0), tested there and
signed off ("It works"), and ported the same day as ValeVision v2.31.0. Before anything
was written, a script confirmed that this tree's Layers body and Layer Rows stylesheet
region were byte-identical to TrueVision's committed originals. It then took
TrueVision's tested body and region, and checked both again after writing. No record
field changed, so both apps write the same data.

| Item | Why | State |
|---|---|---|
| `51/Na__LayoutEditor__Panel__Layers__.js` 1.1.0 | A grip replaces Up and Down: a pointer drag in which the passed rows slide aside, one reorder on release, Escape to cancel, the arrow keys on a focused grip, and refreshes held until the drop. The lock button reads Lock / Unlock, faint red while locked | **ported**, verbatim below the header |
| Layer Rows stylesheet region | The lock button's shared width and tint, the grip, the sorting states and the grabbing cursor | **ported**, verbatim |

Verified here: the module parses, and `Na__Verify__ModuleGraph` and `Na__Verify__Exports`
(312 files) both pass. Nine in-app checks passed on a scratch sheet with every write
blocked (none was attempted), with the same computed tint and 48 px button width as
TrueVision.

### Return trip - TrueVision to ValeVision (13-Sep-2026, edge styles and owner tags)

Authored in TrueVision (v2.27.0) and signed off by Adam on 13-Sep-2026 with the request
to port. It came across as ValeVision v2.30.0. The Render Composites weights from the same
TrueVision version came first, as v2.28.0 (its section is below). Every hunk was replayed
against this tree with its anchor required to match exactly once. Nothing was copied
wholesale except the two new modules and the edge style config.

| Item | Why | State |
|---|---|---|
| `50/Na__ProjectedLinework__Owners__.js` 1.0.0 | The category id table, and the non-enumerable `Owners` and `OwnerKeys` on a classes object; id 0 is unknown | **ported**, verbatim below the header |
| Owner tags through the projection: EdgeExtractor 1.2.0, ClipKernel 1.1.0, ClipWorker 1.1.0, WorkerPool 1.1.0, CpuBackend 1.2.0, StageSampler 1.1.0, AuthoredEdges 1.1.0 | One category id per edge, then per segment, through the cut, the view transform, the clip, the worker protocol and the pool's join | **ported** - bodies are TrueVision's apart from ValeVision's comments |
| Projector 1.1.0: kept renders on the CPU | `auto` sent plain elevations to the GPU, which cannot tag. Only Run Diff may use it now | **ported** |
| Persistence 1.2.0: asset schema 2 | Owner runs per class; untagged blocks are refused, never written and never baked | **ported, adapted** - the localhost authoring gate stays ValeVision's |
| DevMenu Controls 1.1.0 | The backend picker and the hardware line say kept renders use the CPU | **ported** |
| `51/Na__LayoutEditor__EdgeStyles__.js` 1.0.0 and its config | The colour, line type and weight vocabulary, and per-viewport `Viewport__ProjectedEdges` resolution, patching and pruning | **ported**, verbatim below the header |
| ModelLayers 1.1.0 and its config 1.1.0 | Per-category edge defaults (`EdgeDefault`) | **ported, adapted** - TrueVision's rows and styles under the ValeVision__ prefix (what a split export such as Doous loads), plus the coarse Existing, Proposed and legacy rows older exports load, styled as structure |
| Panel__ModelLayers 1.1.0 | The Advanced fold's inline colour, type and weight per row | **ported**, verbatim below the header |
| SheetRecords 1.5.0, SheetModel 1.5.0 | `Viewport__ProjectedEdges` normalised and pruned; `UpdateViewport` takes `projectedEdges` | **ported** |
| Viewport2d 1.6.0, PdfExporter 1.1.0 | Style bands per class. One style token (edge styles and composite weights) keys the repaint, and an untagged cached result is a miss. The PDF draws the same bands | **ported** - PdfExporter verbatim below the header |
| ModeController 1.9.0 and the Layout Editor config | Waits for the edge style and drawing view configs; the panels drag to 680 px | **ported** |
| Projected linework config | The performance description (kept renders on the CPU) and the schema 2 note | **ported** |

Verified here: all 19 modules parse, and the 980 named imports in folders 50 and 51
resolve. Both `Na__Verify__` harnesses pass, and the owner-tag harness passes 9 of 9
against this copy. In the running app, read-only on Doous: every segment tagged, bands
exact to the width maths, a Walls restyle repainted without re-projecting, and its
reset pruned the record to null. The PDF export and the GPU route were not exercised
in ValeVision.

### Return trip - TrueVision to ValeVision (13-Sep-2026, ortho dimensions and snap tones)

Authored in TrueVision (v2.31.0), tested there and signed off ("works great"), and
ported the same day as ValeVision v2.29.0. The edits were replayed by an anchor-checked
script: all 32 anchors across the 10 files matched exactly once before anything was
written. The record field `Dimension__Orientation` and its three values are shared, so
either app reads the other's dimensions.

| Item | Why | State |
|---|---|---|
| `51/Na__LayoutEditor__DimensionGeometry__.js` 1.1.0 | `Frame`, an orientation-aware `Skeleton` and `TextPlacement`, `SpanMm`, `OrthoToward` (the CAD box rule), `OffsetKeepingLine` | **ported**, verbatim below the header |
| `51/Na__LayoutEditor__DimensionTool__.js` 1.2.0 | Shift makes the dimension ortho while its line is placed; Shift no longer bends the span; orange markers; `IsPlacingLine` | **ported**, verbatim below the header |
| `51/Na__LayoutEditor__Snapping__.js` 1.2.0 | Marker tones: `Snap` and `ShowMarker` take `TONE_VERTEX`, `TONE_DIMENSION` or `TONE_VIEWPORT` | **ported** |
| Record and model | `Dimension__Orientation` normalised (anything unknown is aligned); `CreateDimension` and `UpdateDimension` carry it | **ported** |
| `51/Na__LayoutEditor__MarkupBridge__.js` 1.3.0 | The orientation reaches the skeleton, the drawing and the value | **ported** |
| `51/Na__LayoutEditor__SheetTools__.js` 1.9.0 | Shift keydown and keyup redraw a line being placed; dimension grips hold an ortho line still and snap in orange | **ported** |
| Toolbar, main stylesheet, app config | The `ToolDimensionTitle` tooltip label; one RGB custom property per tone; the dimension and snapping descriptions | **ported** |
| Purple on the viewport carry (TrueVision `ViewportSnapMove__` 1.1.0; the carry ring, tracking crosses and carried frame outline) | ValeVision has no viewport snap move yet | **not ported** - comes with the carry |

Verified here: 8 modules parse, 812 named imports resolve, the name scan is clean, the
geometry harness (30) passes against this copy, and 23 in-app checks passed on a scratch
A3 sheet with every write blocked (none was attempted).

### Return trip - TrueVision to ValeVision (13-Sep-2026, render composite weights)

Authored in TrueVision (v2.27.0, plus the Base Image weight and the Section Outline row
alignment on 13-Sep), tested there and signed off ("This works great"), and ported the
same day as ValeVision v2.28.0. This tree had none of it - no Advanced fold, no weights,
no Section Outline row - so the whole weights feature came across, not only the two
13-Sep fixes. The record key `Viewport__CompositeWeights` and its shape are shared, so
either app reads the other's weights.

| Item | Why | State |
|---|---|---|
| `51/Na__LayoutEditor__RenderComposites__.js` 1.1.0 and its `__Config__.json` 1.1.0 | The inventory of composites and their weights; the per-viewport record (overrides only); `RasterToken(viewport, forThreeD)` | **ported**, module verbatim (header and console prefix); config layers verbatim, two Meta notes reworded for this app |
| `51/Na__LayoutEditor__Panel__Styles__.js` 1.6.0 and 1.6.1 | Panel built from the config; the Advanced fold with a weight per line-drawing composite and a reset per weight; the Section Outline row keeps an empty checkbox slot | **ported**, verbatim below the header |
| `51/Na__LayoutEditor__PanelHost__.js` 1.1.0 | `AdvancedToggle` and `IsAdvanced` | **ported** |
| Advanced Fold stylesheet region | Toggle, inline cluster, weight, unit, reset, override marker and the check slot. It brings the edge-style rules with it (colour, type, swatch, no-edges, column heads), unused until Edge Styles lands | **ported**, verbatim |
| Record and model | `Na__LeRec__NormaliseCompositeWeights`; `UpdateViewport` merges `compositeWeights` one key at a time and a null clears it; the mode controller waits for the composites config | **ported** |
| `51/Na__LayoutEditor__Viewport2d__.js` 1.5.0 | Stroke rules take the Projected Linework and Hidden Lines factors; the raster weights go to the snapshot renderer; a set pixel weight joins the raster key; the composite token joins the linework paint keys | **ported, adapted** - no `StyleToken` here yet, so the token is appended directly; the Edge Styles port folds it into `StyleToken` |
| `51/Na__LayoutEditor__Viewport3d__.js` 1.4.0 | The Base Image weight reaches the scene render; a set 3D weight joins the fingerprint, so stored snapshots keep their keys | **ported** |
| `51/Na__LayoutEditor__PdfExporter__.js` 1.0.3 | Stroke rules per viewport, so the factors print | **adapted** - TrueVision prints through `StyleBands` |
| `51/Na__LayoutEditor__SnapshotRenderer__.js` 1.4.0 | Profile, section and model-edge widths set for one render and put back | **diverged (DIV-1)** - see below |
| `42/Na__DrawView__ComposerPreset__.js` 1.3.0 | `Enter({ edgeWidthPx })` stands in for the configured drawing edge width while the preset is active | **new here** - the profile weight's consumer |
| `05/Na__RenderEffect__LineworkSettings__State.js` 1.1.0 | `SetLineworkBaseOverride(widthPx)`: one width in place of each material's stashed base for a render, still multiplied by the session factor and the export scale | **new here** - the Base Image weight's consumer |

**The consumers are the divergence, and it is deliberate.** TrueVision writes its Sobel
quad width, its section config and the model's line materials directly. Here the tiled
exporter rewrites every linework width from `Na__LineworkSettings` when a render starts
and scales the section outline and the profile width for the export, so a direct write
would be overwritten mid-render. Each weight therefore goes in through the system that
owns it and the export compensation still applies on top - which also means one stored
weight makes the same relative change in both apps, not byte-identical pixels.

Verified here: the 12 changed modules parse; `Na__Verify__Exports__` passes (310 files)
and `Na__Verify__ModuleGraph__` passes. In the running app on Doous (3047), every write
blocked: the panel columns measured identical to TrueVision's (weights 96.7-148.7 px,
checkboxes and the slot 202-218); Base Image 3 px drew the edges at 2.901 (3 times the
tile's compensation) and took the underlay from 3.66% to 6.25% dark pixels, every
material back to 0.8 afterwards; Profile 4 px took it on to 9.18%; Section Outline 5 px
was set for the render and the live width came back to 2; Projected Linework x2 doubled
the stroke with no raster re-render; a 3D render at 3 px drew the edges at 3 (2.586
under compensation), mean luminance 244.4 to 229.0, widths back to 0.8; an untouched 3D
fingerprint equals the old algorithm, 2D-only weights leave it alone, and the Base Image
weight re-keys it. Not exercised: Hidden Lines on a drawing with hidden linework (Doous
has none), and a PDF export.

### Return trip - TrueVision to ValeVision (13-Sep-2026, eyedropper palette)

Authored in TrueVision (v2.30.0), tested there and signed off ("works perfectly"), and
ported the same day as ValeVision v2.27.0 by replaying the edits. This tree already
carried the eyedropper, the rectangle tool and gradient fills, so every anchor matched
across all nine files on the first dry run.

| Item | Why | State |
|---|---|---|
| Eyedropper palette mode, `51/Na__LayoutEditor__Eyedropper__.js` 1.2.0 | Shift+B: an object's style becomes the settings for new objects of its kind. `ToPalette` (fill and gradient carry `palette` switch names in the trait table), `SyncPalette` with a writer the sheet tools own, `SetMode` / `GetMode`, the pulse | **ported**, verbatim (header only) |
| Palette wiring | Sheet tools (`ArmPalette`, `SyncPaletteFrom`, `AdoptStyle`, `DEFAULTS_EVENT`, the hand-over to the drawing tool, Use for new ... on the context menu, the Shift+B case), mode controller (the panel refreshes on `DEFAULTS_EVENT`), toolbar (Shift+click), key map and its fallback, config setup and labels, the pulse stylesheet rule | **ported** |
| Locked layers readable by the eyedropper | `Na__LeMarkup__HitTest` gains `includeLocked`; only the eyedropper passes it | **ported** |

Verified here: both harnesses against this copy (53 palette, 52 eyedropper), the module
and undeclared-name scans, and a read-only load in the running app. The pointer flow was
not exercised in ValeVision; Adam's sign-off was given on TrueVision.

### Return trip - TrueVision to ValeVision (13-Sep-2026, gradient fill)

Authored in TrueVision (v2.29.0), tested there and signed off - with the gradient rows moved
last in the Vectors panel - then ported the same morning as ValeVision v2.26.0. Replayed from
TrueVision's commit `50d46de`, NOT from its working copies: within the hour those copies had
grown an unsigned palette mode on top of the gradient. Every body hunk was checked to exist
verbatim in that commit before anything here was written.

| Item | Why | State |
|---|---|---|
| `51/Na__LayoutEditor__GradientTool__.js` 1.0.0 and `__Config__.json` 1.0.0 | Linear gradient fill: start and end colour, either end alpha, a blend (the midpoint), a direction 0-360 fitted to the shape. Owns `Shape__Gradient` (null, or six `Gradient__` fields), both painters (SVG gradient; PDF PNG strip with a soft mask, rotated and clipped), the panel preview and the Vectors panel rows | **ported**, verbatim (header and console prefix only) |
| `51/Na__LayoutEditor__Panel__Shapes__.js` 1.3.0 | The Gradient toggle last in the list. A gradient replaces the solid fill and counts as the fill for the either-or rule; sliders redraw silently and announce once on release | **ported** - body verbatim |
| Gradient wiring | Sheet chrome (`PushPolyline` and both polyline painters), shape geometry (`Push`, `Hit`), the shape normaliser, `CreateShape` / `UpdateShape`, the shape defaults, the Draw tool, the eyedropper header, the gradient region of the panel stylesheet | **ported** |
| Mode controller Ready | Waits on the gradient config alongside the editor's own | **ported, adapted** - TrueVision's `Promise.all` also carries its edge style and composite configs, which ValeVision has no modules for |
| Rectangle takes the gradient default | `Na__LayoutEditor__RectangleTool__.js` passed the Vectors panel's fill but not its gradient, in both apps | **fixed in both** (1.0.1) |
| Eyedropper gradient trait | Already in this tree: it came across inside v2.24.0's copy of the module, ahead of the feature | **live** with this port |

Verified here: every edited module parses; module graph and named exports (309 files) pass. In
the app on a scratch A3 sheet with every write blocked: row order, the defaults toggle, a
dragged rectangle taking the gradient, direction, edges off, one history step per slider drag,
one alpha end, the SVG; and a test PDF rendered with pdf.js within 2/255 of the screen at 11
points.

**Deliberately NOT ported:** TrueVision's palette mode (Shift+B, `Na__LeTools__DEFAULTS_EVENT`)
and its undo-restore announcement (`Na__LeModel__AnnounceRestore`). Both sit in the same modules
there and neither is signed off.

### Return trip - TrueVision to ValeVision (13-Sep-2026, rectangle tool)

Authored in TrueVision (v2.27.0), tested there, signed off and ported the same day as
ValeVision v2.25.0 - on top of the v2.24.0 eyedropper port below, which had just brought
the shared wiring files level with TrueVision, so every anchor landed.

| Item | Why | State |
|---|---|---|
| `51/Na__LayoutEditor__RectangleTool__.js` 1.0.0 | Rectangle (R): click then click, or press, drag and release; Shift keeps it square; both corners snap. A rubber box previews it and nothing reaches the model until the second corner lands; the result is a plain closed four-point `Sheet__Shapes` record through `CreateShape`, one undo step, selected on landing. No new record field, so both apps write identical data | **ported**, verbatim (header only) |
| Rectangle wiring | Sheet tools (tool slot, press, move, release, cancel, swallowed arrows, the R case), toolbar button, `Na__LeGrips__ShowBox` / `HideBox`, the rubber box stylesheet rule, key map and its fallback, labels | **ported** |

Verified here: the logic harness (41 checks) against this copy, and 20 in-app checks with
real pointer and key events on a scratch A3 sheet, every write blocked.

### Return trip - TrueVision to ValeVision (13-Sep-2026)

Authored in TrueVision (v2.26.0 and v2.26.1), tested there, signed off and ported the
same day as ValeVision v2.24.0. Replayed edit by edit against this tree rather than
copied, because TrueVision's working copies of the same modules carry other unfinished
work. In every touched file this code matched TrueVision's last commit, so every anchor
landed; the port was written only after all of them had.

| Item | Why | State |
|---|---|---|
| `51/Na__LayoutEditor__Eyedropper__.js` 1.0.0 | Match properties between two items (B). One trait table holds every field name; kinds do not mix; the layer never travels; viewports excluded until the new viewport system settles | **ported**, verbatim (header only) |
| Eyedropper wiring | Sheet tools (tool slot, B, staged Escape, Copy / Paste properties on the context menu), toolbar button and hint line, key map and its fallback, config block and getter, labels, stylesheet | **ported** |
| Vector redraw route | `shape` and `shapes` were missing from the mode controller's markup route in BOTH apps, so a painted or deleted vector kept its old picture until an unrelated repaint | **fixed** |
| Browser draft debounce | The draft was a synchronous localStorage write of every sheet inside each change. Now `DraftDebounceMs` (600) after the editing pauses; flushed on hide and close; dropped when a new project loads | **ported** |
| Frame-coalesced surface refresh | One rebuild per animation frame, merged across callers. `RefreshNow` for anything that needs the DOM before its next statement; nothing does today | **ported** |
| Tab strip gate | Rebuilds only when a tab would look different | **ported, adapted** - the signature carries `Na__LeMode__IsAvailable` (Layout Mode) where TrueVision's carries `Na__LeCfg__IsEnabled` |
| Panel narrowing | Text, dimension and vector changes refresh only their own panel. Viewport changes still refresh every section, because Viewport, Render Composites and Model Layers all read the selected viewport | **ported** |
| Sheet-object snapping | Vertices, edge midpoints and dimension ends as candidates. A moving item excludes its own points; the shape being drawn excludes only its newest vertex. `SheetObjects` switch | **ported** |

**Deliberately NOT ported:**

- *TrueVision's PWA cache token bump.* ValeVision has no service worker to evict.
- *Anything else in TrueVision's copies of those files.* Clipboard chords and viewport
  snap-move share the same modules there but are not signed off, and ValeVision has
  none of the modules they import. The rectangle tool was on this list too until it was
  signed off later the same day; it is ported - see the section above.

### Return trip - TrueVision to ValeVision (12-Sep-2026)

The first batch under the new direction of travel. Everything below was authored in
TrueVision during the re-alignment and has now been ported back.

| Item | Why | State |
|---|---|---|
| Glass transmission detected | `IsTransparent` asked only about `transparent`/`opacity`. Glazing exported through KHR_materials_transmission has `transparent:false` and `opacity:1` - see-through because light passes through it, not because the slot is blended. Glass Transparency Off silently did nothing to it in BOTH apps | **ported** |
| Viewport styles reach the linework | `FromPlan`/`FromElevation` gain a styles override and Viewport2d passes the viewport's own. Without it a Render Composites toggle changed the raster and not the vectors drawn over it | **ported** |
| Context Layer renamed and moved last | `baseImage` is the toggle that turns the backing render off; it is now labelled Context Layer and sits last, and the old `contextLayer` toggle (which hid the existing building and landscape, emptying a renovation drawing) is gone from the panel. Key unchanged, so nothing saved changes meaning | **ported** |
| Backend `auto` + hardware probe | Picks the fastest backend that is CORRECT per view. The GPU cannot apply a drawing cut, so plans and section elevations always take the CPU; plain elevations take the card. Probe rejects software fallback adapters, which pass every API check and are slower than the CPU backend | **ported** |
| Dev menu shows the resolved backend | Per drawing, because auto is one answer per view, not one per session | **ported** |
| `Na__AppUtils__DevGate__` | Authoring gated on a flag rather than a hostname | **ported**, routed conservatively - see below |
| `Na__Verify__ModuleGraph__`, `Na__Verify__Exports__` | One proves every FILE resolves, the other every NAME. Both found real faults during the re-alignment | **ported** |
| Dev Tools menu in the top bar | The menu sat fixed over the top-left of the viewport, permanently, whether or not it was open - which is where the model is. The trigger is now a pill beside the logo and only the flyout drops down, clearing the drawing tab strip. The drag handle sizes the panel (the container is a header flex item) and moved inside the list, since the container no longer establishes a positioned containing block | **ported** |
| Render Composites panel in the LEFT column | TrueVision moved it under Drawing Layers on 12-Sep-2026 and the move never came back; ValeVision's file header said left while its code said right | **fixed** |
| Supersampler promoted to the render pipeline | `05/Na__RenderEffect__Supersampler__.js`. This file was ours - the video studio wrote it on 11-Sep - and TrueVision generalised it for two frame routes and two consumers. It comes back as the shared module and `31/Na__VideoStudio__Export__Supersampler.js` is now an ALIAS re-export of it, so the video studio and the still exporter cannot end up with different jitter tables. Verified in the browser: the two exported names are the same function object | **ported** |
| Supersampled static exports | `30/Na__ImageExport__StaticExport__TiledRenderer.js` gains `antiAliasSamples`, per tile. Resolution was never the fix - a bigger export gets SMALLER steps, not fewer - and FXAA searches about 20 px along an edge, so a step on a two-degree line outruns it and comes back smeared as well as stepped. FXAA now stands aside during accumulation. Measured identically in both trees: 1 sample gives 2 grey levels on a shallow line, 4 gives 5, 16 gives 17 | **ported** |
| Layout Editor sample count per quality level | `AntiAliasSamples` on each raster level (Low 1, Medium 4, High 16) carried through `Na__LeRaster__Fit` beside the pixel size, so a picture can never be rendered at one level's resolution and another's anti-aliasing. High is also the PDF and Dev bake level | **ported** |

**Deliberately NOT ported, each checked rather than assumed:**

- *Supersampling in Export Render Layers.* Those are structural conditioning maps -
  depth, normals, edges - and the average of two normals across an edge describes no
  surface, nor does the average of two depths describe any point in space. Beauty wants
  coverage; a conditioning map wants the truth at the sample point. The shared tile plan
  still keeps the two registered pixel for pixel.
- *TrueVision's TARGET ROUTE and its sRGB present transfer.* Kept in the shared file so
  both trees hold one identical module, but ValeVision has no caller: every picture here
  goes through the composer, which leaves its frame in a read buffer ready to average.
  TrueVision needs it because DIV-1 means a drawing draws straight to the bound
  framebuffer and has no read buffer to hand.
- *TrueVision's profile-buffer resize fix.* It resized the renderer per tile and never
  the Sobel buffers, so its drawing outlines were computed at viewport resolution and
  stretched across the sheet. Checked here: `setProfileLinesSize(fbW, fbH)` has been in
  this tiled renderer since v1.1.0. Nothing to fix.
- *TrueVision's composer-route fix for the 3D snapshot.* Its tiled renderer accepted a
  pipeline getter and ignored it, so sheet 3D viewports were a bare `renderer.render`.
  Checked here: every tile has always gone through the composer. Nothing to fix.

- *The 2D viewport camera fix.* TrueVision passed the main perspective camera where the
  framed ortho belonged. ValeVision passes the main camera at that same line and is RIGHT
  to: its ComposerPreset swaps the composer's RenderPass camera to the ortho, so the ortho
  draws regardless. This is DIV-1, working as designed.
- *TrueVision's dual key-convention read.* TrueVision needed to read both
  `Styles__GlassOpaque` and `glassOpaque` because its ported modules disagreed. ValeVision
  is internally consistent on the plain spelling, so adding the dual read would be
  cargo-culting a fix for a bug it does not have.
- *The MaterialPreset init.* TrueVision never called it, so Whitecard and Glass Transparency
  Off swapped zero materials. ValeVision has always called it.
- *The drawings-block migration.* ValeVision never nested drawings inside the presentation
  block, so there is nothing to migrate.
- *SectionAdapter and RenderPreset.* TrueVision-specific by construction (DIV-1, DIV-2).

**The dev menu port carries one deliberate divergence.** The trigger's `<details>`
also resets `max-height` and `overflow`, because ValeVision's base dropdown sheet clamps
and scrolls the details element and TrueVision's does not - without the reset the header
pill inherits a viewport-height scroll box. Two ValeVision-only rules were repointed
rather than copied: Video Studio's timeline clamp now targets the flyout list (it was
clamping what is now the pill), and the Scene Inspector's `min-width: 290px` on the
details was dropped, the panel's own width having replaced it.

**DevGate routing is narrower here on purpose.** ValeVision's hostname test does more work
than TrueVision's: the loader picks the local Flask server over GitHub Pages, and the save
path writes a Flask mirror beside the R2 write. Those are DATA-PATH uses and keep the raw
test - `Na__AppUtils__ProjectLoader`, `Na__PresentationMode__ProjectJson__SceneData`,
`Na__DrawView__ProjectData__`, `Na__ProjectedLinework__Persistence__`,
`Na__LayoutEditor__Assets__` and the breadcrumb nav. Only the authoring surfaces were
routed. Unlocking authoring on the live site must not send the loader hunting for a server
that is not there.

---

**One defect found in the shared vendor set, present in ValeVision too:**
`04__Vendor__ThreeEdgeProjection__v0.0.10/src/worker/SilhouetteGeneratorWorker.js`
imports `'../SilhouetteGenerator'` with no file extension, which no browser can resolve.
It is reachable only through the `three-edge-projection/worker` import map entry, which
neither app imports, so it is latent rather than live in both. Left unpatched to keep
the vendor folders byte-identical. If either app ever imports that entry, fix it in all
three copies or drop the map entry.

---

## Phase 0 - Libraries (v2.16.0, 09-Sep-2026)

| ValeVision | TrueVision | Parity | Notes | Checked |
|---|---|---|---|---|
| `04__Lib__ThirdParty__VersionLocked/` (three r184, three-mesh-bvh 0.9.9, clipper2-js 0.9.0, three-edge-projection 0.0.10) | `04__Lib__ThirdParty__VersionLocked/` (same four, byte-identical, 598 files) | **verbatim** | **CLOSED 10-Sep-2026** by TrueVision v2.20.0. Vendor folders copied byte-for-byte from ValeVision; import maps identical bar the eleven-vs-eleven key order. Index JSON and README renamed to the `TrueVision__` prefix. `THREE.REVISION` reads 184 at runtime in both apps | 10-Sep-2026 |

## Phase 1 - Scene Groups (v2.17.0, 09-Sep-2026)

| ValeVision | TrueVision | Parity | Notes | Checked |
|---|---|---|---|---|
| `21/Na__PresentationMode__SceneGroups__Data__.js` 1.0.0 | `21/Na__PresentationMode__SceneGroups__Data__.js` 1.0.0 | verbatim | Console prefix only | 09-Sep-2026 |
| `21/Na__PresentationMode__SceneGroups__AppConfig__.json` | `21/Na__PresentationMode__SceneGroups__AppConfig__.json` | adapted | Sixth default group Cross Sections (D09) | 09-Sep-2026 |
| `21/Na__PresentationMode__UI__SceneGroupSelector__.js` 1.0.0 | `21/Na__PresentationMode__UI__SceneGroupSelector__.js` 1.0.0 | verbatim | Console prefix only; the ValeVision carousel has no idle fade to inherit | 09-Sep-2026 |
| `21/Na__PresentationMode__DevMenu__GroupEditor__.js` 1.0.0 | `21/Na__PresentationMode__DevMenu__GroupEditor__.js` 1.0.0 | adapted | Async confirm dialog instead of window.confirm | 09-Sep-2026 |
| `21/Na__PresentationMode__DevMenu__SceneRowBuilders__.js` 1.1.0 | rows inside `21/Na__PresentationMode__DevMenu__SceneEditor.js` | adapted | Split out; no Advanced fold, no layer timing row, four action buttons; Nav Mode switch inline since v2.21.17, reading Orbit, Fly, Walk (TV: Orbit, Walk, Fly) | 11-Sep-2026 |
| `21/Na__PresentationMode__Styles__SceneGroupSelector__.css` | `21/Na__PresentationMode__Styles__SceneGroupSelector__.css` + dev row rules from the carousel sheet | adapted | Dev row controls carried in this sheet rather than the carousel sheet | 09-Sep-2026 |
| `21/Na__PresentationMode__ProjectJson__SceneData.js` 1.2.0 | `21/Na__PresentationMode__ProjectJson__SceneData.js` | adapted | ValeVision keeps projectCode context and the IMG-slot thumbnail self-heal; group-aware sort and BroadcastScenesChanged ported | 09-Sep-2026 |
| `21/Na__PresentationMode__UI__SceneCarousel.js` 1.2.0 | `21/Na__PresentationMode__UI__SceneCarousel.js` (v2.18.0 state) | adapted | Views toggle, ShowCarouselByDefault, thumbnail fallback and orbit pivot re-arm kept; idle fade and wake not ported | 09-Sep-2026 |
| `21/Na__PresentationMode__DevMenu__SceneReorder__.js` 1.0.0 | reorder regions inside `21/Na__PresentationMode__DevMenu__SceneEditor.js` | adapted | Split out; helpers take (scenes, config) instead of reading editor state | 09-Sep-2026 |
| `21/Na__PresentationMode__DevMenu__ScenePersistence__.js` 1.0.0 | none | new | ValeVision's own R2SaveProjectJson save and Flask thumbnail upload, split out of the editor | 09-Sep-2026 |
| `21/Na__PresentationMode__DevMenu__SceneEditor.js` 1.3.0 | `21/Na__PresentationMode__DevMenu__SceneEditor.js` (v2.19.0 state) | adapted | GET-merge + R2SaveProjectJson save path, Flask thumbnail endpoint, confirm dialog, no drawing-scene guard until Phase 2 | 09-Sep-2026 |

## Phase 2 - Drawing Substrate, Floor Plans, Annotations, Dimensions (v2.18.0, 09-Sep-2026)

| ValeVision | TrueVision | Parity | Notes | Checked |
|---|---|---|---|---|
| `42/Na__DrawView__ActiveView__.js` 1.0.0 | `40/Na__DrawView__ActiveView__.js` 1.0.0 | verbatim | Console prefix, folder numbers | 09-Sep-2026 |
| `42/Na__DrawView__Navigation__.js` 1.0.0 | `40/Na__DrawView__Navigation__.js` | verbatim | | 09-Sep-2026 |
| `42/Na__DrawView__MarkupMount__.js` 1.0.0 | `40/Na__DrawView__MarkupMount__.js` 1.0.0 | verbatim | Dimension config getters imported from the split ConfigState module | 09-Sep-2026 |
| `42/Na__DrawView__MarkupFocus__.js` 1.1.0 | `42/Na__FloorPlan__MarkupFocus__.js` 1.1.0 | verbatim (relocated) | Namespace Na__DrawFocus__ | 09-Sep-2026 |
| `42/Na__DrawView__SceneLinkRow__.js` 1.0.0 | `40/Na__DrawView__SceneLinkRow__.js` 1.0.0 | verbatim | | 09-Sep-2026 |
| `42/Na__DrawView__SectionAdapter__.js` 1.2.0 | `41/Na__SectionCut__Engine__.js` (surface only) | diverged (D07) | Drives Na__CrossSectionView__SystemLogic; snapshots and restores the live tool; drawing colours, SuspendLiveTool and Release (Phase 3); vertical plane sign fix and GetPlaneDefinition (Phase 4) | 09-Sep-2026 |
| `42/Na__DrawView__ComposerPreset__.js` 1.2.0 | `40/Na__DrawView__ProfileLines__.js` (purpose only) | diverged (D12) | Composer route; reuses the legacy 2D profile pre-pass; config through ConfigState (Phase 3); export overrides (Phase 4) | 09-Sep-2026 |
| `42/Na__DrawView__MaterialPreset__.js` 1.1.0 | none | new | Self-contained stash and restore, not the MaterialsSystem whitecard pass; config through ConfigState (Phase 3) | 09-Sep-2026 |
| `42/Na__DrawView__ProjectData__.js` 1.0.0 | none | new (D08) | Owns LayoutEditor__DrawingsData and the one drawings save | 09-Sep-2026 |
| `42/Na__DrawView__Transitions__.js` 1.0.0 | mode controllers (shared parts) | adapted (split) | Walk and fly returned to orbit through the toolbar | 09-Sep-2026 |
| `42/Na__DrawView__AppConfig__.json`, `Na__DrawView__Styles__DevMenu__.css` | scene row rules in the TV elevation sheet | adapted | Config new; CSS relocated | 09-Sep-2026 |
| `43/Na__FloorPlan__ConfigState__.js`, `OrthoCamera__`, `SceneLink__` | `42/` same names 1.0.0 | verbatim | Console prefix only | 09-Sep-2026 |
| `43/Na__FloorPlan__Framing__.js` 1.0.0 | `42/Na__FloorPlan__Framing__.js` 1.0.0 | adapted | Approach scene carries IsDrawingApproach | 09-Sep-2026 |
| `43/Na__FloorPlan__ProjectJson__Data__.js` 1.1.0 | `42/` same 1.0.0 | adapted | Drawings block, styles, exclusions, asset slot | 09-Sep-2026 |
| `43/Na__FloorPlan__ModeController__.js` 1.2.1 | `42/` same 1.1.0 | adapted | Section adapter, presets, shared transitions; holds and releases the live tool (Phase 3) | 09-Sep-2026 |
| `43/Na__FloorPlan__DevMenu__Editor__.js` 1.1.0 | `42/` same 1.0.0 | adapted | Drawings save, asset thumbnails, Ground Floor Plan, confirm dialog | 09-Sep-2026 |
| `43/Na__FloorPlan__DevMenu__RowBuilders__.js` 1.2.0 | `42/` same 1.0.0 | adapted | Styles row and exclusion field through the shared StyleRows (Phase 3) | 09-Sep-2026 |
| `43/Na__FloorPlan__AppConfig__.json`, `Styles__DevMenu__.css` | `42/` same | adapted | Extra labels; style toggle rules | 09-Sep-2026 |
| `44/Na__PlanAnnotations__*` (6 js, json, css) | `43/` same | verbatim | Imports repointed; focus arbiter from 42 | 09-Sep-2026 |
| `45/Na__PlanDimensions__Data__.js` + `ConfigState__.js` | `44/Na__PlanDimensions__Data__.js` 1.0.0 | adapted (split) | Config layer split out | 09-Sep-2026 |
| `45/Na__PlanDimensions__Editor__.js` + `EditorPreview__.js` | `44/Na__PlanDimensions__Editor__.js` 1.0.0 | adapted (split) | Rubber-band preview split out | 09-Sep-2026 |
| `45/Na__PlanDimensions__*` (9 other js, json, css) | `44/` same | verbatim | Imports repointed | 09-Sep-2026 |
| `03/Na__AppUtils__SnapshotHistory__.js` | `03/Na__AppUtils__SnapshotHistory.js` | verbatim | File name suffix | 09-Sep-2026 |
| `03/Na__AppUtils__R2AssetUpload__.js` | `80/Na__CloudflareIntegration__ApiClient__.js` (thumbnail part) | new | Worker asset route plus Flask mirror | 09-Sep-2026 |
| `41/Na__CrossSectionView__SystemLogic.js`, `SceneData.js` (edited) | n/a | n/a | Additive exports; approach-scene skip | 09-Sep-2026 |
| `21/Na__PresentationMode__Camera__SceneTransition.js`, `Thumbnail__Renderer.js` (edited) | TV same | adapted | isDrawingApproach; frame hook and CaptureAndUpload | 09-Sep-2026 |

## Phase 3 - Elevations and Sections (v2.19.0, 09-Sep-2026)

| ValeVision | TrueVision | Parity | Notes | Checked |
|---|---|---|---|---|
| `42/Na__DrawView__ConfigState__.js` 1.0.0 | none (TV ConfigState pattern) | new | Main config over system JSON over fallbacks; carries the Doous section colours | 09-Sep-2026 |
| `42/Na__DrawView__StyleRows__.js` 1.0.0 | none | new | Style toggles and exclusion field shared by plans and elevations | 09-Sep-2026 |
| `46/Na__Elevation__ConfigState__.js` 1.0.0 | `45/` same 1.0.0 | adapted | Additive GetSectionGroupTarget (D28), GetFacePickSetup and GetGripSetup (D16) | 09-Sep-2026 |
| `46/Na__Elevation__OrthoCamera__.js` 1.0.0 | `45/` same 1.0.0 | verbatim | Console prefix only | 09-Sep-2026 |
| `46/Na__Elevation__Framing__.js` 1.0.0 | `45/` same 1.0.0 | adapted | Approach scene carries IsDrawingApproach | 09-Sep-2026 |
| `46/Na__Elevation__PlaneGizmo__.js` 1.0.0 | `45/` same 1.0.0 | adapted | Additive GetFaceMesh export; helpers also carry naCrossSectionHelper | 09-Sep-2026 |
| `46/Na__Elevation__ProjectJson__Data__.js` 1.1.0 | `45/` same 1.0.0 | adapted | Drawings block, styles, exclusions, asset slot, SeededFrom, AzimuthFromNormal | 09-Sep-2026 |
| `46/Na__Elevation__SceneLink__.js` 1.1.0 | `45/` same 1.0.0 | adapted | Target group by drawing type; SyncSceneGroup moves the card | 09-Sep-2026 |
| `46/Na__Elevation__ModeController__.js` 1.1.0 | `45/` same 1.0.0 | adapted | Section adapter (plain elevation holds the tool), presets, shared transitions, live styles | 09-Sep-2026 |
| `46/Na__Elevation__DevMenu__Editor__.js` 1.1.0 | `45/` same 1.0.0 | adapted | Drawings save, Pick Face and Re-pick, gizmo grip, mode-based groups, asset thumbnails, confirm dialog | 09-Sep-2026 |
| `46/Na__Elevation__DevMenu__RowBuilders__.js` 1.1.0 | `45/` same 1.0.0 | adapted | Re-pick button; shared styles row and exclusion field | 09-Sep-2026 |
| `46/Na__Elevation__FacePick__.js` 1.0.0 | none (rules from VV `40/Na__ElevationView__SystemLogic.js`) | new (D16) | Click threshold, first mesh hit, XZ normal, bearing from normal | 09-Sep-2026 |
| `46/Na__Elevation__GizmoGrip__.js` 1.0.0 | none | new (D16) | Drag along the plane normal against the gizmo face mesh only; orbit paused for the drag | 09-Sep-2026 |
| `46/Na__Elevation__AppConfig__.json`, `Styles__DevMenu__.css` | `45/` same | adapted | Section group, FacePick and Grip blocks, extra labels; scene row rules live in 42 | 09-Sep-2026 |
| `43/Na__FloorPlan__DevMenu__RowBuilders__.js`, `ModeController__.js` (edited) | `42/` same | adapted | Shared style rows; hold and release of the live tool | 09-Sep-2026 |

## Phase 4 - Projected Linework (v2.20.0, 09-Sep-2026)

Source root for this phase: `WebApps/Vale__LanternDesigner/02__Src__AppModules/27__System__ProjectedEdges2d` (Lantern Designer, LD).

| ValeVision | Lantern Designer | Parity | Notes | Checked |
|---|---|---|---|---|
| `50/Na__ProjectedLinework__ClipKernel__.js` | LD `ClipKernel__.mjs` | verbatim | Header restyled, identifiers renamed; zero imports kept | 09-Sep-2026 |
| `50/Na__ProjectedLinework__FlatBvh__.js` | LD `FlatBvh__.mjs` | verbatim | | 09-Sep-2026 |
| `50/Na__ProjectedLinework__ClipWorker__.js` | LD `ClipWorker__.mjs` | adapted | Done reply carries HiddenSegments | 09-Sep-2026 |
| `50/Na__ProjectedLinework__WorkerPool__.js` | LD `WorkerPool__.mjs` | adapted | Run resolves { Segments, HiddenSegments } | 09-Sep-2026 |
| `50/Na__ProjectedLinework__Scheduler__.js`, `DiffHarness__.js`, `RasterPreview__.js`, `WebGpuBackend__.js` | LD same | verbatim | Identifiers and console prefix | 09-Sep-2026 |
| `50/Na__ProjectedLinework__SoupBuilder__.js` | LD `SoupBuilder__.mjs` | adapted | ViewMapFromBasis: permutation or rotation (D40); TurnPoint shared | 09-Sep-2026 |
| `50/Na__ProjectedLinework__EdgeExtractor__.js` | LD `EdgeExtractor__.mjs` | adapted | Instances, viewer vector, SplitByCut, ToDrawingSegments; authored key Na__AuthoredEdges | 09-Sep-2026 |
| `50/Na__ProjectedLinework__StageSampler__.js` | LD `StageSampler__.mjs` | adapted | Live model root, helper flags, InstancedMesh, exclusions (D19), transparency rule, cut clipping, section outline | 09-Sep-2026 |
| `50/Na__ProjectedLinework__ModelStage__.js` | LD `ModelStage__.mjs` | adapted | Fingerprint and BVH priming only; clone group for the vendored backends | 09-Sep-2026 |
| `50/Na__ProjectedLinework__Projector__.js` | LD `Projector__.mjs` | adapted | Basis from the view definition; collection and sample split; hidden edges option | 09-Sep-2026 |
| `50/Na__ProjectedLinework__CpuBackend__.js` | LD `CpuBackend__.mjs` | adapted | Four classes; cut split; authored pass | 09-Sep-2026 |
| `50/Na__ProjectedLinework__Pipeline__.js` | LD `Pipeline__.mjs` | adapted (split) | One drawing; model fingerprint; asset before compute; triangle ceiling | 09-Sep-2026 |
| `50/Na__ProjectedLinework__Persistence__.js` | LD `LineworkStore__.mjs` | adapted | R2 asset per drawing, record reference, IndexedDB, bake before save (D20) | 09-Sep-2026 |
| `50/Na__ProjectedLinework__SvgOverlay__.js` | LD `SvgLayer__.mjs` | adapted | Standalone SVG over the canvas; per-frame transform; export markup | 09-Sep-2026 |
| `50/Na__ProjectedLinework__ConfigAccess__.js` | LD `ConfigAccess__.mjs` | adapted | Typed getters; Main.json override for exclusions | 09-Sep-2026 |
| `50/Na__ProjectedLinework__ViewDefinition__.js` | LD `Projector__.mjs` (basis table) | new | Record to basis, cut, fingerprint | 09-Sep-2026 |
| `50/Na__ProjectedLinework__AuthoredEdges__.js` | none | new (D18) | SketchUp linework GLBs as the authored class | 09-Sep-2026 |
| `50/Na__ProjectedLinework__ExportCompositor__.js` | none | new | Overlay onto exported images | 09-Sep-2026 |
| `50/Na__ProjectedLinework__DevMenu__Controls__.js` | LD `ToolbarButton__.mjs` (purpose) | new | Dev menu section with the console helpers as buttons | 09-Sep-2026 |
| `50/Na__ProjectedLinework__AppConfig__.json`, `Styles__Main__.css` | LD config and stylesheet | adapted | ValeVision keys and blocks; layer and dev rules only | 09-Sep-2026 |
| `43/Na__FloorPlan__ModeController__.js` 1.2.2, `46/Na__Elevation__ModeController__.js` 1.1.1 (edited) | TV same | adapted | ApplyStyles announces the change | 09-Sep-2026 |
| `43/Na__FloorPlan__DevMenu__Editor__.js`, `46/Na__Elevation__DevMenu__Editor__.js` (edited) | TV same | adapted | Bake before save | 09-Sep-2026 |
| `26/Na__UiFeature__ModelToggle__Controls.js`, `30/Na__UiFeature__ImageExport__Controls.js`, `01/Na__AppFlow__LoadingSequence.js` (edited) | n/a | n/a | Visibility event; export compositing; overlay sync | 09-Sep-2026 |

## Phase 5 - Layout Editor (v2.21.0, 10-Sep-2026)

No TrueVision counterpart exists for this phase. Sources are pattern-level: the Lantern Designer's `30__System__DrawingEditorMode` (LD) and ValeVision's own `35__System__PageLayoutSystem` (VV). Every module is a back-port candidate.

| ValeVision | Source | Parity | Notes | Checked |
|---|---|---|---|---|
| `51/Na__LayoutEditor__AppConfig__.json`, `ConfigState__.js` | LD config access | adapted | Sheet, style, title block, scales, viewport, text, dimensions, linework, panels, navigation, PDF, labels | 10-Sep-2026 |
| `51/Na__LayoutEditor__ScaleManager__.js` | LD `ScaleManager__` | adapted | 20, 50, 100 only (D27) | 10-Sep-2026 |
| `51/Na__LayoutEditor__SheetLayout__.js` | LD `SheetPdfLayout__` | adapted | Free viewports, no view grid | 10-Sep-2026 |
| `51/Na__LayoutEditor__SheetModel__.js` 1.0.1, `SheetRecords__.js` | none | new | Records in `LayoutEditor__DrawingsData__Sheets`; split for the line budget | 10-Sep-2026 |
| `51/Na__LayoutEditor__SheetChrome__.js` | LD `SheetChrome__` | adapted | Polyline, rotated text, clipped groups; title blocks split out | 10-Sep-2026 |
| `51/Na__LayoutEditor__TitleBlock__Modern__.js` | LD `SheetChrome__` (title block region) | adapted | ValeVision fields | 10-Sep-2026 |
| `51/Na__LayoutEditor__TitleBlock__Classic__.js` | VV title block scan | new | Scan stretched to the sheet, anchored fields (D26) | 10-Sep-2026 |
| `51/Na__LayoutEditor__SheetSurface__.js` | LD `SheetSurface__` | adapted | Frames, selection layer, per-frame content by the viewport modules | 10-Sep-2026 |
| `51/Na__LayoutEditor__Navigation__.js` | LD `SheetManager__` (navigation) | adapted | Scroll-based pan, pinch | 10-Sep-2026 |
| `51/Na__LayoutEditor__ViewportHandles__.js` 1.1.0 | VV `Controls__Pc__` | adapted | Millimetre space; every handle crops, corners both axes (D29, D30 revised) | 10-Sep-2026 |
| `51/Na__LayoutEditor__Viewport2d__.js`, `Viewport3d__.js`, `SnapshotRenderer__.js`, `Assets__.js` | none | new | Underlay and snapshot pipeline; R2 snapshots (D36) | 10-Sep-2026 |
| `51/Na__LayoutEditor__MarkupBridge__.js`, `DimensionGeometry__.js` | VV 44 and 45 (rules) | adapted | Static scene markup at scale; native sheet markup (D34) | 10-Sep-2026 |
| `51/Na__LayoutEditor__SheetTools__.js` 1.4.0 | VV `Controls__Pc__` (pointer conventions) | new | Select, move, crop, content editing, locks, context menu, text, dimension, keys | 10-Sep-2026 |
| `51/Na__LayoutEditor__History__.js` | VV 44 `PlanAnnotations__History__` (pattern) | adapted | Per-sheet undo and redo, fifty whole-sheet snapshots | 10-Sep-2026 |
| `51/Na__LayoutEditor__ContextMenu__.js` | none | new | Right-click menu in the house style | 10-Sep-2026 |
| `51/Na__LayoutEditor__AutoSave__.js` | none | new | Browser draft of every change; structural changes save the project | 10-Sep-2026 |
| `51/Na__LayoutEditor__TextTool__.js` | VV 51 `SheetTools__` 1.3.0 (split) | new | Text placement, the inline field for text and dimension values | 10-Sep-2026 |
| `51/Na__LayoutEditor__DimensionTool__.js` | VV 51 `SheetTools__` 1.3.0 (split) | new | Three-click placement, offset inference, inline value | 10-Sep-2026 |
| `51/Na__LayoutEditor__Grips__.js` | VV 51 `ViewportHandles__` (pattern) | new | Dimension and shape grips, rubber band | 10-Sep-2026 |
| `51/Na__LayoutEditor__ShapeGeometry__.js`, `ShapeTool__.js`, `Panel__Shapes__.js` | none | new | Vector lines, polylines and polygons; Vectors layer type; Vectors panel | 10-Sep-2026 |
| `51/Na__LayoutEditor__Enhance__.js` | VV 30 `ImageExport__PostProcessEffects__Pipeline` | adapted | Levels and sharpen on a viewport render (Enhance Whitecard style) | 10-Sep-2026 |
| `51/Na__LayoutEditor__RasterQuality__.js` | none | new | Global working raster level (Low, Medium, High); the PDF and bakes at the export level | 10-Sep-2026 |
| `51/Na__LayoutEditor__PanelHost__.js`, `Panel__Sheet__`, `Panel__Layers__`, `Panel__ViewportSettings__`, `Panel__Text__`, `Panel__Dimensions__`, `Panel__Styles__` | LD panel columns (purpose) | new | D31, D32, D33 | 10-Sep-2026 |
| `51/Na__LayoutEditor__Toolbar__.js`, `TabStrip__.js`, `ModeController__.js`, `DevMenu__Controls__.js` | LD mode tab, VV 43 mode pattern | new | D22 to D24 | 10-Sep-2026 |
| `51/Na__LayoutEditor__PdfExporter__.js` | VV `PdfExport__A3__`, LD `DrawToPdf` | adapted | Any paper size, vector content (D35) | 10-Sep-2026 |
| `51/Na__LayoutEditor__Styles__Main__.css`, `Styles__Panels__.css` | LD stylesheet | adapted | | 10-Sep-2026 |
| `index.html`, `03/Na__CoreUi__Styles__Index__.css`, seven header-anchored stylesheets (edited) | n/a | n/a | Dev item, imports, init; CSS imports; tab strip offset | 10-Sep-2026 |

## Per-Scene Navigation Modes (v2.21.17, 11-Sep-2026)

Ported after the plan marked it not applicable (plan section 7.2): Adam asked for scenes and Video Studio keyframes to keep their Orbit, Fly or Walk mode.

| ValeVision | TrueVision | Parity | Notes | Checked |
|---|---|---|---|---|
| `10/Na__NavigationModes__Switcher.js` 1.0.0 | `10/Na__NavigationModes__Switcher.js` 1.0.0 | adapted | No registration (the toolbar exposes index.html's wrappers); active mode read from the walk and fly systems; adds pose-preserving ReleaseToOrbit and EnterModeAtPose, the look-ahead target and label normalisation | 11-Sep-2026 |
| `10/Na__Navmode__WalkMode__SystemLogic.js` 1.1.0, `10/Na__Navmode__FlyMode__SystemLogic.js` 1.1.0 (edited) | TV same | adapted | SyncFromCamera re-seats the mode on a pose placed from outside | 11-Sep-2026 |
| `21/Na__PresentationMode__Camera__SceneTransition.js` 1.4.0 | TV same (31-Aug-2026 state) | adapted | Same key and orbit-on-arrival rule. The release keeps the live view with a look-ahead target (TV re-aims at the old target); arrival puts the pose back over the entry nudges and keeps the scene's lens; the instant snap frames free-look scenes but never switches mode (page load opens in orbit by decision); capture stores a look-ahead target in walk or fly | 11-Sep-2026 |
| `21/Na__PresentationMode__DevMenu__SceneEditor.js` 1.3.2 | TV `CaptureLiveNavigationMode` | adapted | Recorded on Update Camera and Add Scene From Camera; TV records it on its single Update Scene | 11-Sep-2026 |
| `31/Na__VideoStudio__*` (preview controller 1.2.0, timeline menu 1.1.0, dev menu 1.2.1, dragger 1.0.1, video data 1.2.1, thumbnails 1.0.1, frame renderer 1.0.1) | none | new | Video Studio is ValeVision only: Go To lands in the keyframe's mode, the menu switch sets it, Stop restores the pre-play mode; stills and exports resync orbit only in orbit | 11-Sep-2026 |

## Layout Editor Loads on First Use (v2.45.0, 15-Sep-2026)

ValeVision only, at Adam's request. index.html imported the mode controller, the tab strip and the Dev section, and
through them all 73 editor modules and three stylesheets, on every start-up. A loader facade now sits between the
page and the editor. The drawing system itself is unchanged; only how and when it loads, plus one availability rule.

| ValeVision | TrueVision | Parity | Notes | Checked |
|---|---|---|---|---|
| `51/Na__LayoutEditor__Loader__.js` 1.0.0, `LoadingScreen__.js` 1.0.0, `Styles__Boot__.css` | none | new | Offers the editor (Layout Mode on AND a sheet), imports the tab strip when offered and the Dev section when opened, loads the editor behind a full-screen loading screen on first use, and answers the strip and the Dev section from the raw block until then | 15-Sep-2026 |
| `51/Na__LayoutEditor__TabStrip__.js` 1.3.0, `DevMenu__Controls__.js` 1.3.0 | TV same | adapted | Every read and every action goes through the loader instead of static editor imports; rendering unchanged | 15-Sep-2026 |
| `51/Na__LayoutEditor__ModeController__.js` 1.15.0 | TV same | adapted | IsAvailable is Layout Mode on AND a sheet, on localhost and live; initialised by the loader, not index.html | 15-Sep-2026 |
| `51/Na__LayoutEditor__Styles__Main__.css` | TV same | adapted | The published tab height, the tab strip and the Dev section moved to `Styles__Boot__.css`; linked by the loader | 15-Sep-2026 |
| `42/Na__DrawView__RenameDrawing__.js` 1.1.0 | TV `40/` same | adapted | Re-stamp through the loader, which loads the editor quietly only when a baked snapshot shows the renamed scene | 15-Sep-2026 |
| `index.html`, `03/Na__CoreUi__Styles__Index__.css`, `51/Na__LayoutEditor__AppConfig__.json` (edited) | n/a | n/a | Loader import and initialisation; Styles__Boot import; Layout Mode wording | 15-Sep-2026 |

## Drawing Thumbnail Bake (v2.46.0, 15-Sep-2026)

ValeVision only, at Adam's request. Plan and elevation cards were created with a thumbnail path but no picture,
so seeded drawings showed broken images in the carousel until each was previewed and Save Thumbnail pressed.

| ValeVision | TrueVision | Parity | Notes | Checked |
|---|---|---|---|---|
| `42/Na__DrawView__ThumbnailBake__.js` 1.0.0 | none | new | Queues drawings, opens each through an editor-supplied adapter, records the framing, captures and uploads, puts the view back and saves once; FindMissing probes each card's picture | 15-Sep-2026 |
| `43/Na__FloorPlan__DevMenu__Editor__.js` 1.2.0, `46/Na__Elevation__DevMenu__Editor__.js` 1.2.0 | TV `42/`, `45/` same | adapted | Add, seed, Pick Face and card creation queue a bake; Bake Missing Thumbnails button | 15-Sep-2026 |
| `43/Na__FloorPlan__AppConfig__.json`, `46/Na__Elevation__AppConfig__.json` (edited) | TV same | adapted | `BakeThumbnailsLabel` | 15-Sep-2026 |

## Layout Editor Subfolders (v2.47.0, 15-Sep-2026)

Adam's Task 03. ValeVision first; TrueVision gets the same folders and the same splits in Task 04, so both apps hold
every Layout Editor file at the same path and a port copies file for file. File names, namespaces and exports are
unchanged. A file's folder follows its base name, and split units and `__Config__.json` files sit with their base.
Rows in the sections above keep the flat `51/` paths they were written with.

| Folder | Bases (both apps) | TrueVision-only bases |
|---|---|---|
| `01__Core__Loader` | Loader, LoadingScreen, Styles__Boot (ValeVision only until the loader is back-ported) | |
| `03__Core__Config` | ConfigState, AppConfig, KeyMappings | |
| `05__Core__ModeController` | ModeController, TabStrip | |
| `07__Core__SheetData` | SheetModel, SheetRecords, SheetLayout, ScaleManager, DrawingScale, History, AutoSave, Assets | |
| `10__Core__SheetSurface` | SheetSurface, SheetChrome, TitleBlock__Classic, TitleBlock__Modern, Navigation, Controls__Pc, Controls__TouchScreen, Styles__Main | |
| `15__Core__Markup` | MarkupBridge, DimensionGeometry, LeaderGeometry, ShapeGeometry, Groups, MeasureParse | |
| `20__System__Viewports` | Viewport2d, Viewport3d, Viewport3dZoom, ViewportHandles, ViewportClipboard, ForceRender, RasterQuality | ModelSource, PlanDoors, ViewportSnapMove |
| `25__System__RenderStyles` | SnapshotRenderer, Enhance, EdgeStyles, RenderComposites, ModelLayers | |
| `30__System__SheetTools` | SheetTools, SelectionBox, SelectionSet, Grips, Snapping, AxisLock, ContextMenu, ItemClipboard, Eyedropper, Measurements | |
| `35__System__DrawingTools` | TextTool, DimensionTool, LeaderTool, ShapeTool, RectangleTool, GradientTool, LineStyleTool | |
| `40__Ui__Panels` | PanelHost, Toolbar, Panel__Sheet, Panel__Layers, Panel__Styles, Panel__ModelLayers, Panel__ViewportSettings, Panel__Text, Panel__Leaders, Panel__Dimensions, Panel__Shapes, Styles__Panels | |
| `50__Feature__Specification` | SpecData, SpecEditor, SpecDocument, SpecLinks, SpecMargin, MarginGrip, Panel__MarginNotes, Styles__Specification | |
| `55__Feature__Scrapbook` | | Scrapbook (and its config JSON), Panel__Scrapbook |
| `60__Feature__PdfExport` | PdfExporter | PdfFonts |
| `70__DevTools__DevMenu` | DevMenu__Controls | |

Splits: every module over 1000 lines in either app, split the same way in both. The original keeps its name and every
export and re-exports its units; units that write shared state go through accessors in the State unit.

**TrueVision followed the same day in v2.55.0 (Task 04).** Its folder 51 now holds 131 files in the same subfolders
(no `01__Core__Loader` while it has no loader), with the units below; its CSS index imports the stylesheet parts that
ValeVision's loader links. A file in one app is at the same path in the other.

| Original | ValeVision before | TrueVision before | Units | TrueVision v2.55.0 |
|---|---|---|---|---|
| `SheetTools` 1.24.0 | 2005 | 2138 | State, ToolState, HitResolution, ContentEditing, PointerPress, PointerDrag, Keyboard, ContextMenu | 1.29.0, 586 lines. DoorAt and CarryTarget in HitResolution; 17 accessor writes, one more than here (the doors drag, through the existing WriteDrag) |
| `SheetModel` 1.16.0 | 1580 | 1801 | State, Sheets, Layers, DrawOrder, Viewports, TextAndDimensions, Shapes, Leaders, Groups | 1.25.0, 700 lines (322 of them header). Drawing type constants in State; IsSitePlanSheet, TabGroup, NextOrder and RenumberSheets in Sheets; IsSitePlanViewport in Viewports; AnnounceRestore stays in the original, since it needs SheetRecords |
| `SpecData` 1.2.0 | 1271 | 1318 | State, Document, Editing, Draft, Transport | 290 lines. FetchJson and UsesWorker in Transport; Document imports `Na__CfApi__IsConfigured` for GetState |
| `SpecEditor` 1.2.0 | 1231 | 1230 | State, Builders, Bar, Notes, Render, NoteDrag, Actions | 322 lines, each unit the same length as here; Bar imports TrueVision's `40__` drawing core |
| `ConfigState` 1.15.0 | 1222 | 1348 | Readers, KeyMap, SheetSetup, ToolSetup, EditorSetup | 1.24.0, 414 lines. GetPlanDoorsSetup, GetModelSourceSetup and the private PdfFontCuts in SheetSetup; no code line changed |
| `Styles__Specification.css` | 1024 | 1023 | Notes, Read | 425 lines, parts 352 and 270 |
| `Styles__Main.css` | 943 | 1116 | Paper | 463 lines, Paper 667. Main keeps the tab strip and the Dev section (TrueVision has no Styles__Boot) |
| `Viewport2d` 1.7.0 | 835 | 1141 | Window, Frame, Linework | 1.10.0, 499 lines. The eight site plan functions in a TrueVision-only `Viewport2d__SitePlan__` unit (319 lines, Adam's choice); Linework also exports BandPaths for it; no code line changed |

| ValeVision | TrueVision | Parity | Notes | Checked |
|---|---|---|---|---|
| `51/15__Core__Markup/Na__LayoutEditor__MarkupBridge__.js` 1.9.1 | TV same | adapted | A selected leader's box: the leader line now uses isChosen and highlights, as TrueVision's already did. Fixed here only; nothing to send back | 15-Sep-2026 |
| `index.html`, `03/Na__CoreUi__Styles__Index__.css`, `42/Na__DrawView__RenameDrawing__.js` (paths) | TV `Index.html`, TV CSS index, TV `40/` same | n/a | New Loader and Styles__Boot paths | 15-Sep-2026 |

| ValeVision | TrueVision | Parity | Notes | Checked |
|---|---|---|---|---|
| `51/30__System__SheetTools/Na__LayoutEditor__EditScope__.js` 1.1.0 | TV same, authored there | verbatim | The context stack: a group, a vector or a dimension open for editing, and the points picked inside it | 17-Sep-2026 |
| `51/15__Core__Markup/Na__LayoutEditor__MarkupBridge__.js` 1.10.0 | TV 1.12.0 | adapted | `PushDimension` keeps ValeVision's option shape: its dimensions have no fixed-length extension lines, so no `extension` key | 17-Sep-2026 |
| The v2.52.0 container-editing set (`SheetTools__*`, `Grips__`, `SelectionBox__`, `SheetSurface__`, `Toolbar__`, config, styles) | TV v2.59.0 same files | verbatim | Divergences are the ones already in these files: TrueVision's plan doors, viewport snap move, force render and model source have no ValeVision counterpart and are simply absent | 17-Sep-2026 |
| `51/07__Core__SheetData/Na__LayoutEditor__ScaleManager__.js` 1.2.0 | TV 1.2.0 | adapted | The title block Scale cell names its paper and lists a mix. ValeVision has no site plan scale list, so `SheetLabel` is shaped to its single list: no `IsListed`, and an off-list denominator still coerces | 17-Sep-2026 |
| `51/10__Core__SheetSurface/Na__LayoutEditor__SheetChrome__.js` 1.8.0 | TV 1.8.0 | verbatim | The caption measurement round-trip fix and `FitCaptionFont`. ValeVision's `BuildFrame` has no `Viewport__ShowFrame` guard, which is TrueVision-only and simply absent | 17-Sep-2026 |
| `51/60__Feature__PdfExport/Na__LayoutEditor__PdfFilename__.js` 1.0.0 | TV 1.0.0 | verbatim | New leaf; the app name in its header is the only divergence | 17-Sep-2026 |
| `51/50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js` 1.0.0 | TV 1.0.0 | adapted | ValeVision has no `Na__LayoutEditor__PdfFonts__`, so the pages are set in its own measuring face (Helvetica) rather than an embedded Open Sans; the drawing core is `42__System__DrawingViewCore` here | 17-Sep-2026 |
| The specification revision set (`SpecData__State__`, `SpecData__Document__`, `SpecData__Editing__`, `SpecData__`, `SpecEditor__Bar__`, `SpecEditor__Actions__`, `SpecDocument__`, both stylesheets, config) | TV v2.63.0 same files | verbatim | Revision and document number on the specification, and the Download button | 17-Sep-2026 |

---

## Pending back-port (ValeVision to TrueVision)

| Item | Where | Why TrueVision wants it |
|---|---|---|
| Scene row builders and reorder helpers split out of the scene editor | `21/Na__PresentationMode__DevMenu__SceneRowBuilders__.js`, `21/Na__PresentationMode__DevMenu__SceneReorder__.js` | The TrueVision editor is 1622 lines, over the house budget |
| Ground Floor Plan quick action and the per-drawing style toggles | `43/Na__FloorPlan__DevMenu__Editor__.js`, `43/Na__FloorPlan__DevMenu__RowBuilders__.js` | One-click start for most jobs; styles shared with sheet viewports |
| Dimension config and preview splits | `45/Na__PlanDimensions__ConfigState__.js`, `45/Na__PlanDimensions__EditorPreview__.js` | TrueVision's data and editor modules are 988 and 907 lines |
| R2 asset upload utility | `03/Na__AppUtils__R2AssetUpload__.js` | One path for every binary asset with a local mirror |
| Async confirm dialog for destructive dev actions | `21/Na__PresentationMode__DevMenu__GroupEditor__.js`, scene editor | Replaces window.confirm, which blocks the render loop and cannot be styled |
| Pick Face, Re-pick and the gizmo grip | `46/Na__Elevation__FacePick__.js`, `46/Na__Elevation__GizmoGrip__.js`, editor wiring | Loose editing of the drawing plane in the 3D view; the sliders stay the precise path |
| Sections filed by drawing type | `46/Na__Elevation__SceneLink__.js`, config section group keys | The Elevations and Cross Sections groups hold what their names say |
| Shared drawing style rows and config state | `42/Na__DrawView__StyleRows__.js`, `42/Na__DrawView__ConfigState__.js` | One row builder and one config reader for every drawing kind |
| Rotation path in the soup builder and edge extractor (Lantern Designer) | `50/Na__ProjectedLinework__SoupBuilder__.js`, `EdgeExtractor__.js` | A free-bearing view without a fourth basis table entry |
| Hidden segments through the worker pool (Lantern Designer) | `50/Na__ProjectedLinework__ClipWorker__.js`, `WorkerPool__.js` | The kernel already computes them; the pool now returns them |
| The whole Layout Editor (sheets, viewports at scale, PDF) | `51/Na__LayoutEditor__*` | TrueVision has no sheet output; the module set only depends on the drawing records and the projection pipeline |
| Pose-preserving mode release and entry, look-ahead capture target | `10/Na__NavigationModes__Switcher.js`, walk and fly `SyncFromCamera`, `21/Na__PresentationMode__Camera__SceneTransition.js` 1.4.0 | TrueVision arrives in walk or fly with the entry nudges and the mode's default lens still applied, and its free-look captures store orbit's leftover target, which only shows if the scene is later switched to orbit |
| Layout Editor loads on first use: loader facade, loading screen, boot stylesheet | `51/01__Core__Loader/Na__LayoutEditor__Loader__.js`, `LoadingScreen__.js`, `Styles__Boot__.css`; TabStrip, DevMenu, ModeController and RenameDrawing edits (v2.45.0) | TrueVision's Index.html imports the whole editor at start-up as well; the loader keeps it off every page load until a sheet is opened |
| Add Viewport scene list rebuilt on every refresh; the Viewport panel refreshed on scene broadcasts | `51/40__Ui__Panels/Na__LayoutEditor__Panel__ViewportSettings__.js` 1.4.1, `51/05__Core__ModeController/Na__LayoutEditor__ModeController__.js` 1.15.1 (v2.45.1) | TrueVision's panel has the same one-time fill (`addSelect.options.length <= 1`), so plans, elevations and scenes added after a sheet first opens never reach Add Viewport there either |
| Drawing thumbnail bake: new cards bake their picture, Bake Missing Thumbnails button | `42/Na__DrawView__ThumbnailBake__.js`, the floor plan and elevation Dev editors 1.2.0, two label keys (v2.46.0) | TrueVision's scene links also set the thumbnail path at creation with no picture behind it, so its seeded and added drawing cards show broken images until Save Thumbnail is pressed on each |
