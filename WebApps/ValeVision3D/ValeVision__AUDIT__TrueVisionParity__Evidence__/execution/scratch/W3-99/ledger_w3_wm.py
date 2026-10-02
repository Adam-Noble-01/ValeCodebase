"""W3-99 - the Release Watermark data for Wave 3 (ValeVision3D v2.71.5): one entry per TrueVision release the wave
carried. Keys: cls (the new class, when it flips), vv (the VV release cell, when it was '-'), vv_app (appended to it),
pk (packages added to the Packages cell), note (the dated note's text). Every fact is from the Port Records of W3-01 ..
W3-18 (W3-04 held, no record) and the W3 gate report; Adam's confirmation from TrueVision's devlog at b2aa9151 as the
records quote it."""

WM = {
    'v2.28.0': dict(pk=['W3-03'], note=(
        "v2.71.5 lands the hub that would carry a viewport by a point - HitResolution 1.11.0's CarryTarget, PointerPress "
        "1.10.0's GrabAt, PointerDrag 1.19.0's hover and dwell (W3-03) - with the carry held behind "
        "Na__LeTools__VV_HOLD_VIEWPORT_CARRY (DR-40 item 9); ViewportClipboard 1.4.0 whole (W3-06). Waiting: W3-04 "
        "(with Adam's answer). No try recorded in TrueVision")),
    'v2.32.0': dict(pk=['W3-03', 'W3-15', 'W3-16'], note=(
        "v2.71.5 carries the rest, still dormant (DR-09 (a)): the viewport menu's Model rows (ContextMenu 1.7.0, W3-03; "
        "empty on a one-model project), the Viewport panel's Model Source selects (1.10.0, hidden while "
        "Na__LeSource__HasChoices is false, W3-15) and the PDF exporter's Model Source linework call (1.12.0, W3-16). No "
        "confirmation line either way in TrueVision")),
    'v2.38.0': dict(cls='PORTED', vv_app="VV v2.71.5 (the Viewport panel's Frame switch, W3-15)", pk=[], note=(
        "PORTED in v2.71.5: the Viewport panel 1.10.0's Frame checkbox, Caption greyed while the frame is hidden (W3-15), "
        "over the record key, the model and the chrome's hidden frame (v2.71.3); the PDF draws frames only through the "
        "chrome, so an unticked frame is off the PDF too. 'Waits for Adam's sign-off' in TrueVision")),
    'v2.40.0': dict(cls='PORTED', vv_app="VV v2.71.5 (Measure at scale and Draw at scale in the panels, W3-12; the "
                                         "hard-coded atScale dropped, W3-01)", pk=['W3-01'], note=(
        "PORTED in v2.71.5: Panel__Dimensions 1.7.0's Measure at scale and Panel__Shapes 1.9.0's Draw at scale (W3-12), "
        "and ToolState 1.7.0 reads the configs' DefaultAtScale (both true) instead of ValeVision's hard-coded true "
        "(W3-01). 'Waits for Adam's sign-off' in TrueVision")),
    'v2.41.0': dict(cls='PORTED', vv_app="VV v2.71.5 (the Dimensions panel's Ext. lines pair, W3-12)", pk=[], note=(
        "PORTED in v2.71.5: Panel__Dimensions 1.7.0's Ext. lines Start, padlock and End (W3-12) over the record keys, "
        "the model and DimensionGeometry's fixed-length lines (v2.71.3). 'Waits for Adam's sign-off' in TrueVision")),
    'v2.42.0': dict(cls='PORTED', vv_app="VV v2.71.5 (the Doors row, W3-15; a click on a door, W3-03)", pk=['W3-03'], note=(
        "PORTED in v2.71.5: the Viewport panel's Doors row with Open all and the closed count (W3-15) and the hub's "
        "door click, one undo step (HitResolution DoorAt, W3-03). Doors toggle only where a model carries door data "
        "(DR-16). 'Waits for Adam's sign-off' in TrueVision")),
    'v2.49.0': dict(pk=['W3-15', 'W3-16'], note=(
        "v2.71.5 carries the Viewport panel's site plan rows (W3-15) and the PDF exporter's site plan fills (1.2.0, "
        "W3-16), both dormant (DR-08 (B): IsSitePlanSheet and IsSitePlanViewport are false for every ValeVision sheet)")),
    'v2.55.0': dict(pk=['W3-03'], note=(
        "v2.71.5: SheetTools__ContentEditing's PORT NOTE now names its Source version (TrueVision 1.0.0, v2.55.0) and "
        "drops the stale 'the same split applies' line (W3-03, header only)")),
    'v2.65.0': dict(cls='PORTED', vv_app="VV v2.71.5 (the broken-bubble tooltip live, PointerDrag 1.19.0, W3-03)",
                    pk=[], note=(
        "PORTED in v2.71.5: PointerDrag 1.5.0's broken-bubble tooltip (commit 4f6bb9ef) arrives inside 1.19.0 and the "
        "hover tooltip W2-20 landed is now live through the hub (W3-03). No confirmation recorded in TrueVision")),
    'v2.75.0': dict(pk=['W3-01', 'W3-03', 'W3-16'], note=(
        "v2.71.5 carries the batch commit 32767407's editor lines: Ctrl+X in State's SHEET_CHORDS and the Keyboard's "
        "Edit__Cut (W3-01, W3-03; Na__Test__CrossSheetClipboard__ 8/8) and the PDF file name on fields.DocumentId with "
        "ValeVision's document code (W3-16, OC-13; logged as PdfExporter 1.12.1). Waiting: only the shared "
        "service-worker part (W0-08, superseded by the move to the OVH server). No confirmation recorded in TrueVision")),
    'v2.78.0': dict(cls='PARTIAL', vv="VV v2.71.5 (part, held: State 1.3.0's LastPress and PressTravelled, ToolState "
                                      "1.2.0's PickUpMove family W3-01; the hub's PicksUpMove and MarginGrip's IsMoveAuto "
                                      "term W3-03 - behind Na__LeTools__VV_HOLD_AUTO_MOVE, with Sheet Images' drop W3-09)",
                    pk=['W3-09'], note=(
        "landed in v2.71.5, held: Select picking Move up is DR-40 item 7. The code is TrueVision's (W3-01, W3-03) with "
        "VV GUARD lines at the top of PicksUpMove, before the box release's PickUpMove (W3-03) and over Sheet Images' "
        "drop (W3-09); MarginGrip 1.3.0 is whole again (W3-03). Select picks, M moves, as before. Waiting: W3-04 (with "
        "Adam's answer) and the toolbar's hover words (W5-01). No confirmation recorded in TrueVision")),
    'v2.87.0': dict(cls='PORTED', vv_app="VV v2.71.5 (the parametric panel 1.3.0's storey hint, W3-14)", pk=['W3-14'],
                    note=(
        "PORTED in v2.71.5: the parametric scrapbook panel 1.8.0 carries 1.3.0's storey hint in a title's why-sentence "
        "(W3-14), after the storey level, the identity config and the Dev menu row (v2.71.2, v2.71.4). No sign-off "
        "recorded in TrueVision")),
    'v2.90.0': dict(cls='PORTED', vv_app="VV v2.71.5 (the Vectors panel's hatch block, W3-12; new shapes' hatch "
                                         "defaults, W3-01)", pk=['W3-01'], note=(
        "PORTED in v2.71.5: Panel__Shapes 1.9.0's hatch block (toggle, Pattern, scale, angle; W3-12) and ToolState's "
        "unlogged new-shape hatch defaults (hatchOn false; W3-01). New shapes still ignore the panel's Hatch default, "
        "as in TrueVision (DR-37 (3)). No confirmation recorded in TrueVision")),
    'v2.94.0': dict(cls='PORTED', vv_app="VV v2.71.5 (the fog in the sheet PDF, PdfExporter 1.12.0, W3-16)",
                    pk=['W3-16'], note=(
        "PORTED in v2.71.5: the PDF exporter prints an elevation's fog as a PNG between the vectors and the markup "
        "(1.6.0 inside 1.12.0, W3-16), after the fog on screen, in image exports and on sheets (v2.71.4). 'Waiting "
        "Adam's test' in TrueVision's fog plan")),
    'v2.98.0': dict(pk=[], note=(
        "v2.71.5 carries the viewport frame's arrow-key lock and AxisLock's integration through the hub (PointerDrag "
        "1.19.0, W3-03; AxisLock's PORT NOTE synced). Waiting: the carry (W3-04, DR-40 item 9). 'NOT YET CONFIRMED BY "
        "ADAM' in TrueVision")),
    'v2.100.0': dict(cls='PORTED', vv_app="VV v2.71.5 (the Project Portal block registered, its config block and tiles, "
                                          "switched off; panel 1.4.0, W3-14)", pk=['W5-05'], note=(
        "PORTED in v2.71.5, switched off (DR-12 (A)): the panel registers the Project Portal element and 1.4.0 places a "
        "title's bar; the config's ProjectQr block, Meta__Portal and both Portal tiles are TrueVision's, the tiles hidden "
        "by an empty Element__DrawingTypes (W3-14); Na__Test__ScrapbookProjectQr__ 73/73. W5-05 deletes the two keys "
        "with a Vale resolver; the block's words wait for Adam's Vale wording (DR-43). 'NOT YET TRIED BY ADAM' in "
        "TrueVision")),
    'v2.104.0': dict(vv_app="VV v2.71.5 (part: the Floor Areas panel, table, label grip and stylesheet and the mode "
                            "controller's wiring W3-10; the Area Schedule element W3-17 and its registration and config "
                            "W3-14; ToolState's TOOL_AREA W3-01; ShapeTool's pass-through W3-07; the hub's area tool "
                            "W3-03)", pk=['W3-01', 'W3-03', 'W3-07', 'W3-14', 'W5-01'], note=(
        "landed in v2.71.5: Floor Areas is switched on (W3-10), the A key arms it, rooms report at the drawing's scale, "
        "and the Area Schedule element registers with its tiles (W3-17, W3-14; Na__Test__AreaSchedule__ 69/69, "
        "Na__Test__FloorAreas__ PASS). Waiting: the toolbar's Floor Area button (W5-01, Toolbar 1.24.0). No sign-off "
        "recorded in TrueVision; Adam used it in part (W2-99's reading)")),
    'v2.106.0': dict(pk=['W3-10'], note=(
        "v2.71.5 adds the Floor Areas panel 1.1.0's Outline switch and the room folding with the group (W3-10); the PDF "
        "exporter's paint order 1.7.0 was already in (W3-16 kept it)")),
    'v2.107.0': dict(vv_app="VV v2.71.5 (part: K switches Draft through the hub's Keyboard 1.18.0, W3-03)",
                     pk=['W3-03', 'W5-01'], note=(
        "landed in v2.71.5: K switches Draft mode once per press (Keyboard 1.18.0, W3-03; W3-05's tests). Waiting: the "
        "toolbar's Draft button (W5-01). 'Waits for Adam's sign-off' in TrueVision")),
    'v2.111.0': dict(cls='PORTED', vv_app="VV v2.71.5 (the hub on ZOOM_SETTLED_EVENT, SheetTools 1.39.0, W3-03; Draft "
                                          "live, W3-03, W3-05)", pk=['W3-03'], note=(
        "PORTED in v2.71.5: the hub's listeners move to the zoom-settled event (SheetTools 1.32.0 inside 1.39.0, W3-03) "
        "and Draft mode is live (K, W3-03), after the surface, the margin grip and the Measurements box (v2.71.3, "
        "v2.71.4). 'On Adam's sign-off' in TrueVision")),
    'v2.113.0': dict(vv_app="VV v2.71.5 (part: F8 through the hub, W3-03; ShapeTool 1.8.0's Ortho, W3-07; "
                            "Na__Test__OrthoMode__ 55/55, W3-05)", pk=['W3-01', 'W3-03', 'W3-07', 'W5-01'], note=(
        "landed in v2.71.5: F8 latches Ortho (State 1.4.0, W3-01; Keyboard 1.8.0 and PointerDrag 1.9.0 inside the hub, "
        "W3-03) and the Draw tool holds it (ShapeTool 1.10.0, W3-07); Na__Test__OrthoMode__ passes 55 of 55. Waiting: "
        "the toolbar's Ortho button (W5-01). 'NOT tried by Adam' in TrueVision")),
    'v2.114.0': dict(vv_app="VV v2.71.5 (part: the grid attached and its panel registered, W3-05; F6 and F7 through the "
                            "hub, W3-03)", pk=['W3-01', 'W3-03', 'W5-01'], note=(
        "landed in v2.71.5: the Drawing Grid panel registers after Sheet and the grid attaches with the sheet tools "
        "(ModeController 1.18.10, W3-05); F6 and F7 reach it through the hub (W3-01, W3-03); Na__Test__DrawingGrid__ "
        "54/54. Waiting: the toolbar's Grid and Grid Snap buttons (W5-01). No confirmation recorded in TrueVision")),
    'v2.115.0': dict(cls='PORTED', vv_app="VV v2.71.5 (Keyboard 1.10.0 inside 1.18.0, W3-03)", pk=['W3-03'], note=(
        "PORTED in v2.71.5: SheetTools__Keyboard 1.18.0 carries 1.10.0 - M is never stuck and Enter leaves a field "
        "(W3-03; Na__Test__DrawingTabKeys__ 53/53, OC-12), after the key files, KeyMap 1.11.0, KeyScope and DocumentKeys "
        "(v2.71.1 to v2.71.3). No confirmation recorded in TrueVision")),
    'v2.116.0': dict(vv_app="VV v2.71.5 (part: the editing set W3-02, Store and Publish W3-18, the switch-on, the Images "
                            "panel and the stylesheet W3-09; the hub's picture rows and crop W3-03; the PDF's pictures "
                            "W3-16)", pk=['W3-03', 'W3-16', 'W5-01'], note=(
        "landed in v2.71.5: Sheet Images is switched on (W3-09) with TrueVision's editing set (W3-02), storage and "
        "publish units (W3-18) and its stylesheet; Na__Test__SheetImages__ 97/97. The project folder is the store of "
        "record through the W0-18 Flask routes; TrueVision's R2 halves are TODO(OVH-MIGRATION) placeholders (policy 13). "
        "A dropped picture does not bring Move up (DR-40 item 7, held at Insert by W3-09). Waiting: the toolbar's Image "
        "button (W5-01). Adam ran it on his own server in TrueVision but did not sign it off")),
    'v2.117.0': dict(vv_app="VV v2.71.5 (part, held: CopyDrag 1.0.0 inside 1.2.0 and the hub's copy drag, W3-03, behind "
                            "Na__LeTools__VV_HOLD_COPY_DRAG)", pk=[], note=(
        "landed in v2.71.5, held: CopyDrag and the hub's Ctrl-drag copy are TrueVision's (W3-03; Na__Test__CopyDrag__ "
        "18/18), but PointerPress makes no drag copyable while DR-40 item 8 is held. Waiting: W3-04 (with Adam's "
        "answer). Signed off by Adam in TrueVision (v2.119.0: 'after signing off Ctrl-drag copy'); DR-40's default "
        "still holds it for Vale")),
    'v2.118.0': dict(vv_app="VV v2.71.5 (part: the move retype - State 1.5.0, ToolState 1.3.0 W3-01; PointerDrag 1.12.0, "
                            "HitResolution 1.5.0 and SheetTools 1.34.0 W3-03)", pk=[], note=(
        "landed in v2.71.5: the live move readout and a typed length after the mouse lets go (W3-01, W3-03; "
        "Na__Test__MoveRetype__ 41/41). Waiting: W3-04's share (its move-anchor test, with Adam's answer to DR-40 items "
        "7-10). 'Adam has not tried it' in TrueVision")),
    'v2.119.0': dict(vv_app="VV v2.71.5 (part, held: CopyDrag 1.1.0's 3x and /3 inside 1.2.0, W3-03)", pk=[], note=(
        "landed in v2.71.5, held with the copy drag (DR-40 item 8): the arrays are TrueVision's code (CopyDrag 1.1.0, "
        "PointerDrag 1.13.0, SheetTools 1.35.0; W3-03) and unreachable until W3-04. 'Adam has not tried it' in "
        "TrueVision")),
    'v2.120.0': dict(cls='PORTED', vv_app="VV v2.71.5 (the Portal block's grey in the config, W3-14; switched off)",
                     pk=[], note=(
        "PORTED in v2.71.5, switched off (DR-12 (A)): the parametric config's ProjectQr block carries the soft grey code "
        "(W3-14), after the symbol and the title-block cell (v2.71.2, v2.71.3). 'NOT tried by Adam' in TrueVision")),
    'v2.121.0': dict(cls='PORTED', vv_app="VV v2.71.5 (Publish 1.1.0, Panel 1.1.0, Insert 1.1.0 and the stylesheet "
                                          "1.1.0; W3-18, W3-02, W3-09)", pk=['W3-02'], note=(
        "PORTED in v2.71.5: a dropped picture is held and cut to its print size at Save Sheets, nothing written at the "
        "drop (Publish 1.1.0, Insert 1.1.0, Panel 1.1.0, the stylesheet's info note; W3-18, W3-02, W3-09; "
        "Na__Test__SheetImages__ scenario 9). The R2 half is superseded by the move to the OVH server (policy 13): the "
        "project folder is the store. 'NOT signed off by Adam' in TrueVision")),
    'v2.122.0': dict(cls='PORTED', vv_app="VV v2.71.5 (the panel 1.5.0's metricsReady, W3-14)", pk=[], note=(
        "PORTED in v2.71.5: the parametric panel 1.8.0 refits every title once jsPDF and Open Sans load (1.5.0's "
        "metricsReady with PdfFonts; W3-14), after the engine, DrawingTitle and ViewportLink (v2.71.4). 'NOT tried by "
        "Adam' in TrueVision")),
    'v2.123.0': dict(cls='PORTED', vv_app="VV v2.71.5 (the Ref switch, W3-13; ViewportLink 1.5.0, W3-13; "
                                          "ViewportClipboard 1.3.0, W3-06; the hub's Layer row, W3-03)",
                     pk=['W3-06'], note=(
        "PORTED in v2.71.5: the Layers panel's Ref switch (1.3.0, W3-13), Nearest skipping a viewport on a reference "
        "layer (ViewportLink 1.5.0, W3-13), paste refusing a reference layer (ViewportClipboard 1.3.0, W3-06) and the "
        "hub's Layer row and frame pass-through (W3-03); Na__Test__LayerMenu__ 75/75. 'NOT tried by Adam' in "
        "TrueVision")),
    'v2.125.0': dict(cls='PORTED', vv_app="VV v2.71.5 (the label grip and Panel 1.2.0, W3-10)", pk=[], note=(
        "PORTED in v2.71.5: Floor Areas' LabelGrip 1.0.0, Panel 1.2.0 and the stylesheet's dashed box (W3-10), over "
        "Geometry, Paint and the label config (v2.71.3). 'NOT tried by Adam' in TrueVision")),
    'v2.126.0': dict(cls='PORTED', vv_app="VV v2.71.5 (Panel__Shapes 1.9.0's pattern rows and "
                                          "Na__Test__HatchLineControls__, W3-12; the PDF's hatch colour, W3-16)",
                     pk=['W3-16'], note=(
        "PORTED in v2.71.5: the Vectors panel's Pattern line pt, Pattern colour and Standard (Panel__Shapes 1.9.0, "
        "W3-12; Na__Test__HatchLineControls__ 47/47) and the PDF exporter's hatch drawing (W3-16), after the palette, "
        "the hatch library and the Patterns panel. 'NOT tried by Adam' in TrueVision")),
    'v2.128.0': dict(cls='PORTED', vv_app="VV v2.71.5 (the Cabinet Infill registered, its config block and tile; panel "
                                          "1.6.0, W3-14)", pk=[], note=(
        "PORTED in v2.71.5: the parametric panel registers the Cabinet Infill (1.6.0's block, RealSizeMm and "
        "lineSpacing) and the config carries its block and tile (W3-14); Na__Test__ScrapbookCabinetInfill__ 74/74 (OC-15 "
        "closed). 'NOT tried by Adam' in TrueVision")),
    'v2.129.0': dict(vv_app="VV v2.71.5 (part: the hub's Moves through ObjectSnap, W3-03; ShapeTool 1.9.0's "
                            "Perpendicular, W3-07; the Snapping shim retired, W3-08)", pk=['W3-07', 'W3-08', 'W5-01'],
                     note=(
        "landed in v2.71.5: HitResolution and PointerDrag snap through ObjectSnap's Moves (W3-03), the Draw tool takes "
        "Perpendicular from its edge's start (W3-07), and ValeVision's one-wave Snapping shim is gone (W3-08), as "
        "TrueVision's is. Waiting: the toolbar's Snap split button and menu (W5-01). 'NOT tried by Adam' in TrueVision")),
    'v2.130.0': dict(vv_app="VV v2.71.5 (part: the vector tools switched on - the panel and the adapter's Initialize, "
                            "W3-07; ShapeTool 1.10.0, W3-07; the hub's dispatch and keys, W3-01, W3-03)",
                     pk=['W3-01', 'W3-03', 'W5-01'], note=(
        "landed in v2.71.5: the Vector Tools panel registers after Vectors and the adapter initialises after the history "
        "(ModeController 1.18.11, W3-07); a line started in an open group joins it; Na__Test__VectorTools__ 138/138. "
        "Waiting: the toolbar's Circle and Arc buttons (W5-01). 'NOT tried by Adam; NOT in ValeVision' in TrueVision")),
    'v2.131.0': dict(vv_app="VV v2.71.5 (part: the axes attached, W3-05; F9 through the hub, W3-01, W3-03)",
                     pk=['W3-01', 'W3-03', 'W5-01'], note=(
        "landed in v2.71.5: Drawing Axes attach with the sheet tools (W3-05) and F9 switches them (State 1.7.0, Keyboard "
        "1.13.0; W3-01, W3-03). Na__Test__DrawingAxes__ passes 50 of 51 - its one red check reads the toolbar's Axes "
        "button, W5-01's (gate item 4.1). Waiting: W5-01. 'NOT tried by Adam' in TrueVision")),
    'v2.134.0': dict(cls='PORTED', vv_app="VV v2.71.5 (panel 1.7.0's base-point drop, W3-14)", pk=[], note=(
        "PORTED in v2.71.5: the parametric panel 1.7.0 hangs a base-point tile from its point and drops it there "
        "(W3-14), after the Cabinet Infill 1.1.0, the engine's base point, Grips and TileDrag (v2.71.4). 'NOT tried by "
        "Adam' in TrueVision")),
    'v2.138.0': dict(cls='PORTED', vv_app="VV v2.71.5 (ViewportHandles 1.5.0 and the hub, W3-03; Viewport3dZoom 1.1.0, "
                                          "ViewportClipboard 1.4.0 and the full test, W3-06; ViewportLink 1.5.1, W3-13; "
                                          "Rotation deg, W3-15; the PDF's turned viewports, W3-16)",
                     pk=['W3-13', 'W3-15', 'W3-16'], note=(
        "PORTED in v2.71.5: a viewport turns on the page - the rotate grip, Shift's quarter turns and the 2-degree detent "
        "(W3-03), zoom about the cursor in a turned 3D picture and a copy that keeps its turn (W3-06; "
        "Na__Test__ViewportRotation__ 52/52), links by its turned frame (W3-13), Rotation deg in the panel (W3-15) and "
        "turned in the PDF (W3-16). 'NOT tried by Adam; NOT in ValeVision' in TrueVision")),
    'v2.139.0': dict(cls='PORTED', vv_app="VV v2.71.5 (Round up in the Dimensions panel, W3-12; ToolState's roundUp "
                                          "default, W3-01)", pk=['W3-01'], note=(
        "PORTED in v2.71.5: Panel__Dimensions 1.6.0's Round up to 5 mm (inside 1.7.0, W3-12) and new dimensions' roundUp "
        "default (ToolState 1.5.0, W3-01); Na__Test__DimensionRoundUp__ 21/21. 'NOT tried by Adam; NOT in ValeVision' in "
        "TrueVision")),
    'v2.140.0': dict(cls='PORTED', vv_app="VV v2.71.5 (Hide swings in the Viewport panel 1.9.0, W3-15)", pk=[], note=(
        "PORTED in v2.71.5: the Viewport panel's Hide swings (a roof plan reads ticked; W3-15), after the plan doors and "
        "1:200 (v2.71.3, v2.71.4); Na__Test__HideSwings__ PASS. 'NOT tried by Adam; NOT in ValeVision' in TrueVision")),
    'v2.141.0': dict(vv_app="VV v2.71.5 (part: a leader travels with what it is moved with, through the hub, W3-03; "
                            "CopyDrag 1.2.0's leader tips, held)", pk=['W3-04'], note=(
        "landed in v2.71.5: the hub moves a leader's tips with what it points at (W3-03; Na__Test__SetMoveLeaderTips__ "
        "28/28); CopyDrag 1.2.0, a copy carrying its leader tips, is in but unreachable while DR-40 item 8 is held. "
        "Waiting: W3-04. 'NOT tried by Adam' in TrueVision")),
    'v2.142.0': dict(cls='PORTED', vv_app="VV v2.71.5 (text, leaders and dimensions placed in an open group join it, "
                                          "W3-01; viewports in groups, W3-03; a picture, W3-02; a viewport added, W3-15)",
                     pk=['W3-01', 'W3-02', 'W3-15'], note=(
        "PORTED in v2.71.5: whatever is placed while a group is open joins it - text, leaders and dimensions (ToolState "
        "1.6.0, W3-01), a picture (Insert 1.2.0, W3-02), a vector (ShapeTool 1.10.0, W3-07) and a viewport (the panel's "
        "WithAdoption, W3-15) - and a press on a grouped viewport's frame selects the group (HitResolution 1.9.0, "
        "W3-03). 'NOT tried by Adam; NOT in ValeVision' in TrueVision")),
    'v2.143.0': dict(cls='PORTED', vv_app="VV v2.71.5 (the region grips, the Regions panel and Margin Notes 1.1.0, "
                                          "W3-11; the hub's region tool, W3-01, W3-03; the PDF toast, W3-16)",
                     pk=['W3-01', 'W3-16'], note=(
        "PORTED in v2.71.5: Overspill Note Regions in full - the grips, the Regions panel and the mode controller's "
        "attach (W3-11), the tool's dispatch (W3-01, W3-03) and the PDF toast counting every lost note (W3-16); "
        "Na__Test__ObjectSnap__'s eight region checks PASS. The toast's configured words still speak only of the margin "
        "(W0-15 follow-up). 'NOT tried by Adam' in TrueVision")),
    'v2.144.0': dict(cls='PORTED', vv_app="VV v2.71.5 (the bubble note tooltip and Show in Specification, W3-03)",
                     pk=[], note=(
        "PORTED in v2.71.5: resting on a linked bubble names its note after 0.5 s and the bubble's menu offers Show in "
        "Specification (PointerDrag 1.18.0, SheetTools 1.38.0, ContextMenu 1.6.0; W3-03; Na__Test__BubbleNoteTooltip__ "
        "PASS), after the spell check, the Specification Scrapbook and the tooltips (v2.71.4). 'NOT tried by Adam' in "
        "TrueVision")),
    'v2.147.0': dict(cls='PORTED', vv_app="VV v2.71.5 (Margin Notes panel 1.2.0, W3-11)", pk=[], note=(
        "PORTED in v2.71.5: Panel__MarginNotes 1.2.0 builds, refreshes and registers the Leaderless Notes part (W3-11), "
        "after the records, the margin and the inert panel (v2.71.2 to v2.71.4); Na__Test__LeaderlessNotes__ PASS. "
        "'NOT tried by Adam' in TrueVision")),
    'v2.148.0': dict(cls='PORTED', vv="VV v2.71.5 (AreaSchedule 1.1.0 and its test, W3-17; FloorAreas Table 1.1.0, "
                                      "W3-10; the AreaScheduleProject tile and TitleSuffix, W3-14)", pk=['W3-14'], note=(
        "PORTED in v2.71.5: the Project Floor Areas form - AreaSchedule 1.1.0 (W3-17), the table's project form "
        "(Table 1.1.0, W3-10) and the tile with its suffix control (W3-14); Na__Test__AreaSchedule__ 69/69. No sign-off "
        "recorded in TrueVision")),
    'v2.149.0': dict(vv_app="VV v2.71.5 (part, held: the hub's move anchor - PointerDrag 1.19.0, PointerPress 1.8.0, "
                            "HitResolution 1.10.0, Keyboard 1.16.0, SheetTools 1.39.0 W3-03; ToolState 1.7.0 W3-01)",
                     pk=['W3-01'], note=(
        "landed in v2.71.5, held: the move anchor's code is TrueVision's (W3-01, W3-03), but Ctrl+click never arms the "
        "cross while Na__LeTools__VV_HOLD_MOVE_ANCHOR holds DR-40 item 10. Waiting: W3-04 (with Adam's answer). No "
        "confirmation recorded in TrueVision")),
    'v2.150.0': dict(cls='PORTED', vv_app="VV v2.71.5 (the Booleans switched on with the panel, W3-07; the hub's holes, "
                                          "W3-03; the Floor Areas panel 1.2.1, W3-10)", pk=['W3-10'], note=(
        "PORTED in v2.71.5: Union, Subtract, Trim, Intersect, Split and Outer Shell reach Vale authors with the Vector "
        "Tools panel (W3-07; Na__Test__VectorBooleans__ 148/148), the hub's holes-aware edits (W3-03) and the Floor "
        "Areas panel hiding Measure for a holed vector (W3-10). Its status line says 'NOT tried by Adam'; v2.151.0 "
        "quotes him trying it ('It works INCREDIBLE!')")),
    'v2.151.0': dict(cls='PORTED', vv_app="VV v2.71.5 (Shift+U/S/T/O through Keyboard 1.18.0, W3-03; switched on, W3-07)",
                     pk=[], note=(
        "PORTED in v2.71.5: the Boolean keys reach their handlers (Keyboard 1.18.0, W3-03) and the tools are switched on "
        "(W3-07); bare U is still Split and T still Text on the sheet. 'NOT tried by Adam' in TrueVision")),
    'v2.152.0': dict(cls='PORTED', vv_app="VV v2.71.5 (Line pt and Dashed lines in the Dimensions panel 1.7.0, W3-12; "
                                          "ToolState's new-dimension defaults, W3-01)", pk=['W3-01'], note=(
        "PORTED in v2.71.5: Panel__Dimensions 1.7.0's Line pt and Dashed lines (W3-12) and the new-dimension linePt, "
        "dashOn and dash defaults ToolState carries unlogged (W3-01). 'NOT tried by Adam' in TrueVision")),
    'v2.153.0': dict(cls='PORTED', vv_app="VV v2.71.5 (PointerPress 1.10.0, W3-03)", pk=[], note=(
        "PORTED in v2.71.5: a box started over an unlocked viewport takes the vectors drawn on it (PointerPress 1.10.0, "
        "W3-03), after SelectionBox's description (v2.71.4). CONFIRMED by Adam in TrueVision on 23-Sep-2026")),
    'v2.154.0': dict(cls='PORTED', vv_app="VV v2.71.5 (Panel__Layers 1.3.0's Ref share of the one red, W3-13)", pk=[],
                     note=(
        "PORTED in v2.71.5: the Layers panel 1.3.0 whole - Off, Unlock and Ref in the one faint red (W3-13), after the "
        "panels sheet's rule and the Off half (v2.71.3, v2.71.4). No confirmation recorded in TrueVision (the entry "
        "quotes Adam's request)")),
    'v2.155.0': dict(pk=['W3-16'], note=(
        "v2.71.5: the PDF exporter, now TrueVision's 1.12.0 whole (W3-16), keeps 1.11.0's FAST packing and options, the "
        "part Adam confirmed in Chrome on 23-Sep-2026 (in since v2.71.2). Waiting: the publishing wave (W4)")),
    'v2.160.0': dict(vv_app="VV v2.71.5 (part: the PDF's site plan holes even-odd, PdfExporter 1.12.0, W3-16; dormant)",
                     pk=[], note=(
        "landed in v2.71.5, dormant (DR-08 (B)): the PDF exporter fills a site plan's faces with their holes even-odd "
        "(1.12.0, W3-16). Waiting: the publisher (W4-03). No confirmation line in TrueVision")),
    'v2.164.0': dict(cls='PORTED', vv_app="VV v2.71.5 (panel and config 1.8.0's Site Plan Legend, W3-14; dormant)",
                     pk=[], note=(
        "PORTED in v2.71.5, dormant (DR-08 (B)): the parametric panel registers the Site Plan Legend and its link, and "
        "the config carries its block and tile with ValeVision__SitePlan__ stems (W3-14); the tile is never offered "
        "while every sheet is architectural; Na__Test__ScrapbookSiteLegend__ 56/56 (OC-15 closed). 'NOT tried by Adam' "
        "in TrueVision")),
}

EXPECT_FLIP_COUNTS = {('PARTIAL', 'PORTED'): 32, ('NOT-CONSIDERED', 'PORTED'): 1, ('NOT-CONSIDERED', 'PARTIAL'): 1}
