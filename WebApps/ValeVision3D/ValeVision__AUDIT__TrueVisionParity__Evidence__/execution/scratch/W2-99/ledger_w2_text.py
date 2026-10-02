"""W2-99 - the prose blocks of Wave 2's pass over the parity ledger (ValeVision3D v2.71.4). ASCII only."""

REL = 'v2.71.4'


def W(text):
    return text.strip('\n').split('\n')


def note(text):
    return '**[02-Oct-2026 note (W2-99, %s): %s]**' % (REL, text)


S14_BULLET = W('''
- **Wave 2 (ValeVision3D v2.71.4, 02-Oct-2026; W2-99).** The wave adds 75 modules - folders 47, 48 and 55, LE/21,
  LE/28, LE/33 and LE/58 new, and new files in 49, 50, LE/20, LE/26, LE/27, LE/30, LE/32, LE/36, LE/37, LE/40, LE/50,
  LE/52 and LE/57 - with ten configuration files, ten stylesheets and a README; it removes one
  (`03__AppUtils/Na__AppUtils__R2DrawingNotes__.js`, W2-33), and the app graph grows from 554 to 610 modules. It adds
  exports to existing modules: the section adapter +6, Cross Sections' RenderDepthInto, LineworkSettings'
  ModifierRuleFor, folder 50's ConfigAccess +2 and StageSampler +1, ViewportTitleText +7, EditScope +5, ItemClipboard
  +2, Measurements' Say, Grips' RegisterShapeProvider, SpecMargin's PlanAll, the parametric engine and types +10, and
  the viewport units' and the specification units' new names (W2-16, W2-30); it removes the snapping unit's SetEnabled
  and Toggle, two elevation data setters and two tiled-renderer names. A warm client holding a mix of old and new
  files can fail to start (the old elevation editor with the new data module; the old Cross Sections logic with the
  new adapter; a pre-v2.71.2 Invalidation with the new loading sequence), fail to link the editor (an old keyboard,
  toolbar or context menu with the new snapping shim; an old EditScope with the new clipboard; old viewport units with
  the new Viewport2d; an old specification barrel with the new lockstep), or draw the grips wrong (the new Paper sheet
  with the old Grips), for that one load. Bump needed: yes, once at deploy - W0-08's prepared package is superseded by
  the move to the OVH server (02-Oct-2026), so if the shared worker still fronts ValeVision then, one consolidated
  token bump. W6-02's precache refresh (or its OVH successor) should add folders 47, 48 and 55, the whole of 49, the
  new 50 modules (DoorPose, FlushJoins, Storeys), LE/21, LE/26, LE/27, LE/28, LE/32, LE/33, LE/37 and LE/58, the new
  LE/20, LE/30, LE/36, LE/50, LE/52 and LE/57 files, and PhaseLibrary (now linked through the snapshot renderer).
  Service worker token: shared Whitecardopedia worker - Adam's call; it was not bumped (`'2026-09-18-1'`).
''')

S15_BULLET = W('''
- **02-Oct-2026 note (W2-99, ValeVision3D v2.71.4): the version-number convention** (the audit's WP-S02b-09). ValeVision's
  releases step the patch number, one per wave scribe pass (v2.71.1 Wave 0, v2.71.2 and v2.71.3 Wave 1, v2.71.4 Wave
  2; D85, Q-VER's default). Inside a file: a whole-file take carries TrueVision's module version and DEVELOPMENT LOG
  (DR-34 (a), D74), with the PORT NOTE's "Source version" line naming TrueVision's module version, release, date and
  the pin; a hunk replay steps ValeVision's own module number by a patch (the loading sequence 1.7.3, the mode
  controller 1.18.9); a TrueVision log that repeats or misorders a version is kept verbatim under a "- Legacy :" field.
  In this ledger a TrueVision release is "TrueVision3D vX" and a ValeVision release "ValeVision3D vX" or "VV vX".
''')

S21_NOTE = W('''
**02-Oct-2026 note (W2-99, ValeVision3D v2.71.4).** Wave 2 filled the drawing-folder row's gaps at TrueVision's numbers:
47 holds TrueVision's Drawing Planes (`47__System__DrawingPlanes`, nine files, W2-40 and W2-01; live, started from
index.html), 48 its Cross Sections placeholder (`48__System__CrossSectionViews`, 0.1.0, W2-05, after ValeVision renamed
its own tool's ids `naCrossSectionToolDev*`, DR-26), and 49 is whole (the render layer, Dev row and stylesheet, W2-03).
55 holds Spell Check (`55__Feature__SpellCheck`, W2-34). 50 gained DoorPose, FlushJoins and Storeys (W2-06, W2-43).
Inside 51 the Layout Editor gained five subfolders (section 2.3).
''')

S23_NOTE = W('''
**02-Oct-2026 note (W2-99, ValeVision3D v2.71.4).** Wave 2 created five more of TrueVision's Layout Editor subfolders at
TrueVision's numbers: LE/21 SitePlanData (dormant, W2-14), LE/28 ObjectSnap (W2-42, W2-19, W2-25), LE/33 DrawingAxes
(W2-18), LE/52 StatementWriter (its lockstep rules leaf, `01__Core__Data/`, W2-30) and LE/58 ScrapbookSpecification
(W2-35). ValeVision now has 33 (32 shared plus LE/01); 2 of TrueVision's 34 are still to come (65 DocumentPublishing and
66 DocumentSharing, Wave 4). The folder-number registry's ValeVision column was not touched in this pass: it is not a
scribe file (its LE/52 note still names Wave 4, although W2-30 created the folder).
''')

S3_NOTE = W('''
**Refreshed 02-Oct-2026 by W2-99 (ValeVision3D v2.71.4).** "Blocked by" now comes from the same analysis re-run on the
end-of-Wave-2 working tree (`ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/scratch/W2-99/pom/port_order_map__endW2.json`;
the continuation's values stay in its map). Wave 2 cleared the blockers of {cleared} more TrueVision modules (`none`
{none0} -> {none1}; lists {list0} -> {list1}); the three modules that left the map's closure in Wave 1 keep `none`. Rows
Wave 2 changed carry their new state with the old kept as "[was: ...]"; the {landed} TrueVision-only rows of 3.5 that
landed name their ValeVision path (every LE/20, LE/21 and LE/25 file of TrueVision's is now in ValeVision); section 3.10
lists the changes by package.
''')

PKG = [
    ('W2-01', "Drawing Planes switched on: the overlay 1.1.0, grip, Dev controls and their stylesheet whole, index.html's "
              "three imports and inits and the CSS index line at TrueVision's places; Na__Test__DrawingPlanes__",
     "3.5 Overlay, Grip, DevMenu Controls, Styles__DevMenu (landed)", "2.1"),
    ('W2-02', "The section adapter's six calls of F.8 C25 (Serialize, Apply, the outline width, SetModelRoot, "
              "RenderDepthInto) over the live Cross Sections tool; Cross Sections' RenderDepthInto (DIV-2)",
     "3.1 SectionAdapter; 3.6 the Cross Sections logic", None),
    ('W2-03', "The elevation depth fog's render layer, Dev row and stylesheet; the elevation mode controller's "
              "fog-source hook (1.1.3), the render preset's fog call (1.4.0), the tiled renderer's per-tile fog (1.5.0); "
              "index.html and the CSS index", "3.5 the three 49 files (landed); 3.1 the elevation mode controller, the "
              "tiled renderer; 3.3 RenderPreset", "2.1"),
    ('W2-04', "The Floor Plans Dev menu 2.0.0 (editor and row builders whole) with ValeVision's seams; the config's "
              "labels; the Dev sheet's two regions; ThumbnailBake's comments", "3.1 the editor, the row builders, the Dev "
              "sheet; 3.2 the floor plan config; 3.6 ThumbnailBake", "6 (the ground-floor and style rows)"),
    ('W2-05', "The Elevations Dev menu 2.1.0 with the Fog block and ValeVision's seams; TrueVision's 48 placeholder with "
              "its Dev Tools item; Cross Sections' gate ids renamed; the data module's two setters retired (D89) and the "
              "exclusion trim (OC-11); the config, the Dev sheet, ThumbnailBake", "3.1 the editor, row builders, data "
              "module, Dev sheet; 3.2 the elevation config; 3.5 the 48 editor (landed); 3.6 ThumbnailBake, the Cross "
              "Sections Dev controls", "2.1; 5.2 (D16); 6"),
    ('W2-06', "Folder 50 to TrueVision's head: twelve modules whole and DoorPose 1.3.0 new, the config with ValeVision's "
              "BuildToken (DR-31 (4)); Na__Test__StoreyBand__", "3.1 the twelve 50 modules; 3.2 the 50 config; 3.5 "
              "DoorPose (landed)", None),
    ('W2-07', "ProgressiveRefine 1.0.3 whole and the render loop's guards in the loading sequence (1.7.3)",
     "3.1 LoadingSequence; 3.4 ProgressiveRefine", None),
    ('W2-08', "The main config's Drawing2d keys aligned (Drawing2dEdgeWidth removed with its moved-note)",
     "3.2 the main config", None),
    ('W2-09', "Enhance 1.1.0 and Render Composites 1.3.0 whole; the composites config's percent Enhance Whitecard row "
              "(Meta 1.3.0); Na__Test__EnhanceWhitecardStrength__", "3.1 Enhance, RenderComposites; 3.2 the composites "
              "config", None),
    ('W2-10', "ViewportTitleText 1.1.0 and its test whole; the identity config byte-identical to TrueVision's (the Phase "
              "block, dormant)", "3.1 ViewportTitleText; 3.2 the identity config", None),
    ('W2-11', "PlanDoors 1.3.0 (inert until W2-16)", "3.5 PlanDoors (landed)", None),
    ('W2-12', "Viewport2d__DepthFog 1.0.0; the composites config's depthFog row (Meta 1.4.0); the tiled renderer's "
              "renderFrame route for the fog image (1.6.0)", "3.5 Viewport2d__DepthFog (landed); 3.2 the composites "
              "config; 3.1 the tiled renderer", None),
    ('W2-13', "The nested LineworkModifier rules in LineworkSettings (1.2.0, ModifierRuleFor); the Model Layers config's "
              "linework-modifiers group (Meta 1.2.0); Na__Test__LineworkModifiers__", "3.6 LineworkSettings; 3.2 the "
              "Model Layers config", None),
    ('W2-14', "PARTIAL at its return (its open item green since W2-16): GlbParse and the site plan store over the facade "
              "(dormant), the composites panel; the AppConfig's SitePlanDrawingsEnabled gate; three tests and the proof "
              "page; two allow-list rows outside its list (gate item 4.3)", "3.5 GlbParse, Store, "
              "Panel__SitePlanComposites (landed); 3.2 the Layout Editor config", "8.1"),
    ('W2-15', "SnapshotRenderer 1.8.0: every TrueVision hunk from 1.6.0 to 1.13.0 under DIV-1", "3.1 SnapshotRenderer",
     None),
    ('W2-16', "The viewport units, EdgeStyles, ModelLayers and the Model Layers panel whole; ModelSource and the site "
              "plan painter new (one import cycle); the EdgeStyles config; the mode controller's hunks (1.18.9); "
              "Na__Test__HideSwings__ and Na__Test__SitePlanFaces__", "3.1 Viewport2d, Frame, Linework, Window, "
              "Viewport3d, ViewportIdentity, EdgeStyles, ModelLayers, Panel__ModelLayers, the mode controller; 3.2 the "
              "EdgeStyles config; 3.5 ModelSource, Viewport2d__SitePlan (landed)", None),
    ('W2-17', "The Dev menu's live-phase bake filter (1.4.2); the loader binds modelSource (1.1.7); the loader test's "
              "seventh part (outside its list, gate item 4.3)", "3.1 the Dev menu; 3.6 Loader", None),
    ('W2-18', "The drafting aids, inert: Draft mode, the Drawing Grid and its panel, Ortho mode and Drawing Axes with "
              "their configs and stylesheets; the loader's three sheets (1.1.6)", "3.5 the twelve files of LE/26, 27, "
              "32 and 33 (landed); 3.6 Loader", "2.3"),
    ('W2-19', "The object snap switch-over: Search, Moves, GridMoves, the controller, Menu and the stylesheet; the "
              "Snapping shim (2.0.0); the keyboard, toolbar, context menu and mode controller repointed; the Paper "
              "sheet's marker rules out; the loader's stylesheet line (1.1.5); the object snap test and bundle",
     "3.5 the six LE/28 files (landed); 3.6 Snapping, Loader; 3.1 Keyboard, Toolbar, SheetTools ContextMenu, the mode "
     "controller, the Paper sheet", "2.3"),
    ('W2-20', "ContextMenu 1.1.0 whole (flyouts, hints); the hover tooltip (inert); the Paper sheet's menu and tooltip "
              "rules", "3.1 ContextMenu, the Paper sheet; 3.5 HoverTooltip (landed)", None),
    ('W2-21', "EditScope 1.4.0, ItemClipboard 1.7.0 (DR-40 item 1), SelectionSet 1.2.0, SelectionBox 1.7.0 and "
              "Eyedropper 1.9.0 whole; LayerMenu and NoteTooltip (inert); Na__Test__LayerMenu__", "3.1 the five units; "
              "3.5 LayerMenu, NoteTooltip (landed)", None),
    ('W2-22', "The note-regions tool 1.0.0 (inert)", "3.5 NoteRegions__Tool (landed)", None),
    ('W2-23', "Measurements 1.10.0 whole, with Say", "3.1 Measurements", None),
    ('W2-24', "Grips 1.12.0 whole and the Paper sheet's grip, band and box rules; Na__Test__PaintedOnThePoint__",
     "3.1 Grips, the Paper sheet", None),
    ('W2-25', "MoveAnchor with its config and ViewportSnapMove 1.6.0 (inert; DR-40 items 9 and 10 held); the Paper "
              "sheet's carry region; AxisLock's INTEGRATION", "3.5 the three LE/28 files (landed); 3.1 the Paper sheet, "
              "AxisLock", None),
    ('W2-26', "DimensionTool 1.12.0 (+ v2.152.0, logged 1.13.0), RectangleTool 1.4.0, TextTool 1.4.0 and LeaderTool 1.2.0 "
              "whole", "3.1 the four tools", None),
    ('W2-27', "The vector tools' pure leaves (State, Setup, Geometry, Offset, Boolean) and config, inert",
     "3.5 the six LE/37 files (landed)", None),
    ('W2-28', "The vector tools' interactive units, part 1 (Preview, Targets, Circle, Arc, Trim, Join), inert",
     "3.5 the six LE/37 files (landed)", None),
    ('W2-29', "The Patterns panel 1.1.0 and its stylesheet (OC-07); the mode controller's hatch Ready and registration "
              "(1.18.6); 'patterns' in the accordion", "3.5 Panel__Patterns, Styles__Patterns (landed); 3.1 the mode "
              "controller; 3.2 the Layout Editor config", None),
    ('W2-30', "The specification's data units whole over the facade (State, Document, Draft, Editing, Transport, the "
              "barrel, SpecLinks 1.2.0) and Lockstep new; the Statement Writer's lockstep rules leaf; two tests",
     "3.1 the seven units; 3.5 SpecData__Lockstep, Statement__Lockstep (landed)", "2.3; 8.1"),
    ('W2-31', "SpecLockstep 1.0.0 (the question card); the bar 1.3.0 with the document code (OC-09); the stylesheet's "
              "Lockstep Question region; the mode controller's lockstep lines (1.18.7)", "3.5 SpecLockstep (landed); "
              "3.1 the bar, Styles__Specification, the mode controller", None),
    ('W2-32', "SpecMargin 1.5.0, MarginGrip 1.3.0 (less 1.1.0's held term), SpecMargin__Column, NoteRegions, the "
              "Leaderless panel (inert) and the notes stylesheet whole; two tests", "3.1 SpecMargin, MarginGrip, "
              "Styles__Specification__Notes; 3.5 Column, NoteRegions, Panel__MarginNotes__Leaderless (landed)", None),
    ('W2-33', "Na__AppUtils__R2DrawingNotes__ retired (deleted; K2 FR-18)", "3.6 R2DrawingNotes", "8.1"),
    ('W2-34', "Spell Check (folder 55) with the Vale dictionary route; the CSS index line; two tests",
     "3.5 the seven 55 files (landed)", "2.1; 8.1"),
    ('W2-35', "The Specification Scrapbook (LE/58): the module, panel, row editor, config and stylesheet; the mode "
              "controller's left-column tabs (1.18.8); Na__Test__SpecInlineEdit__", "3.5 the five LE/58 files "
              "(landed); 3.1 the mode controller", "2.3"),
    ('W2-36', "Panel__Text 1.4.0, Panel__Styles 1.7.0, Panel__Leaders 1.2.0 and ScrapbookCustom whole; Panel__Shapes "
              "and Panel__Layers hunks; three config notes; three allow-list rows outside its list (gate item 4.3)",
     "3.1 the six files; 3.2 the Layout Editor config", "6"),
    ('W2-37', "The parametric scrapbook engine 1.7.0, ScaleBar, DrawingTitle, Grips, LinkNoodle, ViewportLink 1.4.0, "
              "the stylesheet and TileDrag whole; the config's Meta 1.8.0; two tests updated", "3.1 the eight files; "
              "3.2 the parametric config", None),
    ('W2-38', "CabinetInfill 1.2.0 and the Project QR element 1.3.0 (off), inert; two tests (red until W3-14)",
     "3.5 the two element files (landed)", None),
    ('W2-39', "SiteLegend and SiteLegendLink (dormant), inert; the legend test (red until W3-14)",
     "3.5 the two files (landed)", None),
    ('W2-40', "Drawing Planes' five core leaves and config, inert until W2-01", "3.5 the five 47 files (landed)", "2.1"),
    ('W2-41', "The vector tools part 2 (OffsetTool, BooleanTool, the adapter, the panel and stylesheet), inert",
     "3.5 the five LE/37 files (landed)", None),
    ('W2-42', "Object snap's leaves (State, Geometry, Glyphs, Index, Sources, Marker) and config, inert until W2-19",
     "3.5 the seven LE/28 files (landed)", "2.3"),
    ('W2-43', "FlushJoins 1.1.0 and Storeys 1.0.0 (inert until W2-06); Na__Test__FlushJoins__",
     "3.5 FlushJoins, Storeys (landed)", None),
]


def S310(rows4):
    out = W('''
### 3.10 Wave 2 (ValeVision3D v2.71.4): what each package changed

Written 02-Oct-2026 by the Wave 2 Parity Scribe (W2-99) from the forty-three Port Records of the wave
(`ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/port_records/`) and the integrator's gate
(`.../execution/gate_reports/W2.md`, PASS_WITH_NOTES). It is also the return-trip section the audit's WP-S02a-13,
WP-S02b-09 and WP-S04a-12 ask for. "Rows" are the rows above that the package changed; work that is not a module of
this register (tests, index.html, `03__Style__AppStylesheets/`) is named in the second column.

| Package | What it changed | Rows | Elsewhere in this ledger |
|---|---|---|---|
''')
    for p, what, rows, else_ in PKG:
        r4 = rows4(p)
        tail = '; '.join(x for x in (else_, r4) if x) or '-'
        out.append('| %s | %s | %s | %s |' % (p, what, rows, tail))
    out += W('''
| Gate | No fix: every importer resolves, no re-export is missing; the three red scrapbook tests are a planned ordering gap (W3-14) | none | - |
| W2-99 | 228 release placeholders resolved to v2.71.4 in 202 files; two dated notes in the PLAN (D16, section 9.2); this pass | none | this pass |
''')
    out += [''] + W(RECORDS_ITEMS)
    return out


RECORDS_ITEMS = '''
**The audit's records items for this wave (WP-S02a-13, WP-S02b-09 and WP-S04a-12, ValeVision's half; W2-99).** Checked
against the ledger, the PLAN and the files on 02-Oct-2026:

- Every file the S02a, S02b and S04a packages created or changed has its row with its parity state and divergences
  (3.1 to 3.6 above; WP-S02a-13 and WP-S02b-09's acceptance) - CLOSED. The rows of folders 44 (untouched in Wave 2),
  45, 49 and 50 match the code: 45's editor, rows, data, config, Dev sheet and mode controller, 49 whole, and every
  module of 50 at TrueVision's pin with its seams named.
- The superseded back-port rows (WP-S02a-13): Pick Face and the gizmo grip - CLOSED in both apps (Drawing Planes since
  v2.71.4; section 6's row carries the note); the scene editor splits - WITHDRAWN (W0-06); the style rows and config
  state - OPEN (WT-09); the dimension splits - recorded as "ValeVision split; TrueVision copied, not wired" (section
  6); the confirm dialog - OPEN (WT-05); the R2 asset upload and the whole Layout Editor - CLOSED (W0-06). The back-port
  memo for TrueVision is in section 6, each item with its TrueVision path and line.
- Stale ValeVision PORT NOTEs (WP-S02a-13): `45__System__ElevationViews/Na__Elevation__FacePick__.js` (:41, :43) and
  `Na__Elevation__GizmoGrip__.js` (:38, :40) still read "TrueVision has no face pick by design" / "keeps its gizmo
  read-only" and "Back-port : candidate"; both modules are now unused in ValeVision too (W2-05), as in TrueVision since
  its v2.82.0. OPEN: neither file is in a Wave 2 package's list; the comment fix, or their retirement in lockstep with
  TrueVision (W2-05's follow-up), is W6-01's or W6-03's.
- The Phase 2 and Phase 4 rows of the Archive (WP-S02b-09): Phase 2's rows are still true for ValeVision but miss that
  TrueVision copied the plan-dimension split without wiring it (section 6) and TrueVision's Toolbar 1.1.0; Phase 4's
  rows compare folder 50 with the Lantern Designer as on 09-Sep-2026 and track none of TrueVision's later changes -
  folder 50 is now TrueVision's at the pin (W2-06, W2-43), so the live rows of 3.1 and 3.5 supersede both. The Archive
  is unchanged.
- The Lantern Designer rows (WP-S02b-09): moved out of section 6's table into its own list below it (they are
  ValeVision-to-Lantern-Designer items; both apps hold both).
- The version-number convention (WP-S02b-09): section 1.5.
- `44__System__PlanDimensions/Na__PlanDimensions__Styles__.css`'s TRUEVISION3D title line (WP-S02b-09) - CLOSED by
  W0-03 (no TRUEVISION3D left in the file).
- ValeVision's header lines (WP-S04a-12): Viewport2d's Frame, Linework and Window "the same split applies to
  TrueVision's copy" - CLOSED (taken whole by W2-16); Viewport3d's "TrueVision has no per-scene lighting" - CLOSED
  (W2-16); SnapshotRenderer's (:135) - OPEN: W2-15 replayed hunks and kept that header line, and no later package
  edits the file (W6-01's sweep).
- The TrueVision-only bases of LE/20, LE/21 and LE/25 (WP-S04a-12): none is left - ModelSource, PlanDoors,
  Viewport2d__DepthFog, Viewport2d__SitePlan, GlbParse and Store landed in Wave 2 (3.5); VectorQuality, ViewportRotation
  and SitePlanComposites in Wave 1; ViewportSnapMove lives at TrueVision's LE/28 since its v2.129.0 and landed there
  (W2-25). The Archive's subfolder table keeps its 15-Sep-2026 wording.
- TrueVision's halves of all three packages (the stale TrueVision PORT NOTEs, its module logs for commits 6076ec10 and
  55014c6a, the composites plan's folder name, its devlog's v2.159.0 FlushJoins claim) are queued for WT-08 in section 7.
'''

WM_INTRO = W('''
- **After Wave 2 (ValeVision3D v2.71.4, 02-Oct-2026; W2-99).** Twenty releases became PORTED: v2.30.2, v2.32.0 (design
  phases, dormant), v2.37.0 (the flush-join rules), v2.48.1 (doors shut on elevations), v2.49.0 (site plan viewports,
  dormant), v2.57.0, v2.58.2, v2.82.0 and v2.84.0 (Drawing Planes), v2.86.0 (the Dev menus 2.x), v2.89.0 and v2.101.0
  (site plans, dormant), v2.91.0 (the Specification tab), v2.93.0 (Enhance strength), v2.96.0, v2.105.0 (one storey per
  plan), v2.106.0, v2.132.0, v2.137.0 and v2.159.0. Sixteen more are now PARTIAL, each row saying what landed and what
  waits, all from NOT-CONSIDERED: v2.75.0, v2.98.0, v2.102.0, v2.108.0, v2.117.0, v2.118.0, v2.122.0, v2.128.0,
  v2.129.0, v2.131.0, v2.134.0, v2.149.0, v2.151.0, v2.153.0, v2.157.0 and v2.163.0.
  {more} rows already PARTIAL gained more, and dated notes on {notes} more name the logs, configs or designs the
  wave took with no change of class. The newest fully ported release is now v2.159.0; the low-water stays
  v2.28.0 (its viewport carry is DR-40 item 9, held).
  TrueVision releases Adam has confirmed that Wave 2 carried: v2.27.0 (the main config's keys), v2.37.0 (whole) and
  v2.153.0 (a description only); every other release it carried is named as unconfirmed in the v2.71.4 devlog entry
  (DR-01 (c)).
''')

S51_NOTE = W('''
- **02-Oct-2026 note (W2-99, ValeVision3D v2.71.4).** Wave 2 also ran on every default: no answer to DR-01..DR-44 or the
  seven questions arrived. DR-40 items 7-10 stay held (the move anchor and the viewport carry land with nothing
  importing them, W2-25; MarginGrip's automatic-Move term is out until W3-03, W2-32); items 1 (paste at the original
  place, W2-21), 2 (snap markers coloured by target, W2-19) and 5 (TrueVision's grid defaults, W2-18) came in on their
  defaults. The OVH move Adam decided on 02-Oct-2026 (R2, the workers and GitHub Pages to be eliminated) reached Wave 2
  mid-run: the site plan store marks its remote candidates TODO(OVH-MIGRATION) (W2-14), and DR-31's re-bake writes
  wherever the live store is then (W2-06). Choices made inside packages, for Adam's eye: W2-04 and W2-05 leave an
  off-screen drawing's thumbnail alone on Update, as TrueVision does, and dropped 13 labels of the old elevation menu;
  W2-08 kept ValeVision's 2D outline colour and threshold; W2-13's modifier rules ride LineworkSettings (DR-31 (3));
  W2-16 took Linework 1.2.0's StyleBands as TrueVision has it (a whole class painted when one style is left - a
  TrueVision-lane fix); W2-29 kept TrueVision's empty-library message; W2-30's lockstep writes the notes file 4 s after
  typing on localhost (LockstepEnabled true); W2-34's WordBar fallbacks name the ValeVision dictionary; W2-36 left out
  the three NoneOfKindNote keys; W2-38's Project Portal words wait for Adam's Vale wording (DR-43, W3-14); W2-41 kept
  Shift+T as Trim, as TrueVision read Adam's note.
''')

D16_NOTE = ' ' + note("done in v2.71.4: Drawing Planes landed whole (W2-40, W2-01) and TrueVision's 2.1.0 elevation "
                      "editor replaced Pick Face, Re-pick and the gizmo drag (W2-05); FacePick, GizmoGrip and PlaneGizmo "
                      "are unused in both apps, retired in lockstep later")

S6_ROW_NOTES = {
    '| Ground Floor Plan quick action (D11) |': (4, note("kept as a seam in TrueVision's 2.0.0 editor, '+ Ground Floor' "
                                                         "beside the + (W2-04); still OPEN in TrueVision (WT-06)")),
    '| Per-drawing style toggles (D33) |': (4, note("re-applied in both 2.x Dev menus under each row's Advanced fold "
                                                    "(W2-04, W2-05); still OPEN in TrueVision (WT-09)")),
    '| Dimension config and preview splits |': (4, note("recorded as 'ValeVision split; TrueVision copied, not wired' "
                                                        "(WP-S02b-09): ValeVision single-sources its config and preview "
                                                        "through 44's ConfigState__ and EditorPreview__; TrueVision has "
                                                        "both files and no importer of either")),
    '| Pick Face, Re-pick and the gizmo grip |': (4, note("CLOSED in ValeVision too: TrueVision's 2.1.0 elevation editor "
                                                          "(W2-05) and Drawing Planes (W2-40, W2-01) replaced them; the "
                                                          "three modules are unused in both apps")),
    '| Sections filed by drawing type (D28) |': (4, note("kept in TrueVision's 2.1.0 editor - Update files the card "
                                                         "when it keeps the Section type (W2-05); TrueVision's 48 "
                                                         "placeholder is in ValeVision too")),
    '| Drawing thumbnail bake and Bake Missing Thumbnails |': (4, note("kept as a seam in both 2.x Dev menus (W2-04, "
                                                                     "W2-05); still OPEN in TrueVision (WT-06)")),
}

LD_ROW_START = '| Rotation path and hidden segments (Lantern Designer) |'

S6_MOVED = W('''

**Moved out of this table (02-Oct-2026, W2-99; the audit's WP-S02b-09).** Not ValeVision-to-TrueVision items: both apps
hold both. They were ValeVision-to-Lantern-Designer items; the Lantern Designer
(`WebApps/Vale__LanternDesigner/02__Src__AppModules/27__System__ProjectedEdges2d/`) still lacks the rotation path and
carries hidden segments only in its clip kernel (audit slice S02b b.6). The row is kept as written.

| Item | ValeVision source | Status in TrueVision (01-Oct-2026) | Evidence | Next |
|---|---|---|---|---|
''')

S6_MEMO = W('''

**Back-port memo for TrueVision (02-Oct-2026, W2-99; the audit's WP-S02a-13).** What the drawing core's port found that
TrueVision may want, each with its evidence at `b2aa9151`. None happens on DR-36's default (a); each is for the
TrueVision lane with Adam's approval. TrueVision paths are app-relative.

| Item | TrueVision evidence (b2aa9151) | ValeVision | Status | Next |
|---|---|---|---|---|
| The section record's `positionMm` sign | `02__Src__AppModules/41__System__SectionCutEngine/Na__SectionCut__Serialize__.js:194` writes `+record.plane.constant` (its comment at :186 rests on a premise that does not hold) and restores at :246 the same way; its own realign plan maps `-record.plane.constant` | `41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js:1540` writes `-plane.constant` (TD06: ValeVision's schema is the reference) | OPEN - each app round-trips its own data; TD06 is not met | WT-02 (held; a migration for TrueVision's saved bindings; D81) |
| The per-scene section restore listens for an event nobody sends | `41__System__SectionCutEngine/Na__SectionCut__SceneData__.js:104` listens for `na-pm-scene-activated`; TrueVision's carousel raises `na-presentation-mode-scene-activated` (`21__System__PresentationMode/Na__PresentationMode__UI__SceneCarousel.js:148`) | ValeVision's scene transition dispatches it (`21__System__PresentationMode/Na__PresentationMode__Camera__SceneTransition.js:451`) | OPEN | WT-12 (held) |
| The drawing-approach flag | `42__System__FloorPlanViews/Na__FloorPlan__Framing__.js` and `45__System__ElevationViews/Na__Elevation__Framing__.js` never set `PresentationMode__Scene__IsDrawingApproach`, while `41/...SceneData__.js:308` checks it | set at `42/Na__FloorPlan__Framing__.js:208` and `45/Na__Elevation__Framing__.js:286` | OPEN - ValeVision ahead | WT-12 (held) |
| StyleRows has no importer | `40__System__DrawingViewCore/Na__DrawView__StyleRows__.js` (only a comment names it); no caller of `Na__FpData__SetStyle` or `Na__ElevData__SetStyle` | its rows sit in both 2.x Dev menus' Advanced folds (W2-04, W2-05; D33) | OPEN - the row above | WT-09 (held) |
| Bake-before-save | `50__System__ProjectedLinework/Na__ProjectedLinework__Persistence__.js:616` defines `Na__PlStore__BakeBeforeSave`; TrueVision's editors never called it (git history), and its publishing plan (v2.155.0) bakes at publish time | both 2.x editors call it before Update's save (D20, W2-04, W2-05) | NOT a back-port: ValeVision keeps it until it adopts publish-time baking (Wave 4) | none |
| The Ground Floor Plan quick action | `42__System__FloorPlanViews/Na__FloorPlan__DevMenu__Editor__.js` has none | "+ Ground Floor" beside the + (D11, W2-04) | OPEN - the row above | WT-06 (held) |
| The drawing thumbnail bake | no thumbnail bake in TrueVision | `40__System__DrawingViewCore/Na__DrawView__ThumbnailBake__.js` 1.0.3 | OPEN - the row above | WT-06 (held) |
| Section filing (SyncSceneGroup) | `45__System__ElevationViews/Na__Elevation__SceneLink__.js` has SyncSceneName (:315) and SyncSceneCamera, no SyncSceneGroup; its editor's onModeChange is :883 | `Na__ElevLink__SyncSceneGroup` on Update when the type is kept (D28, W2-05) | OPEN, a decision (D66) | until TrueVision's 48 passes 0.1.0 |
| The realign plan's "FacePick + GizmoGrip - not yet ported" | `TrueVision__PLAN__ValeVisionRealign__DrawingSystems__.md` section 12, row C | both apps hold both, unused since Drawing Planes | records only | WT-08 (section 7's row) |
''')

S6_OFFERS = W('''

**Offers raised by Wave 2 (02-Oct-2026, ValeVision3D v2.71.4; W2-99).** None happens on DR-42's default and TrueVision is
not edited (DR-36 (a)); each is recorded so the TrueVision lane can take it with Adam's approval.

| Item | ValeVision source | Status in TrueVision (02-Oct-2026) | Evidence | Next |
|---|---|---|---|---|
| The section adapter's six calls as thin pass-throughs in TrueVision's twin | `40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js` 1.3.0 (W2-02; F.8 C25 fixed the names for both apps) | OPEN - TrueVision's twin has the 13 names only; its snapshot renderer and fog layer call its engine directly | W2-02 Port Record (F4) | WT-02 (held) |
| The modifier material keeps the loader's depth-bias hook | `05__RenderPipeline/Na__RenderEffect__LineworkSettings__State.js` 1.2.0 (W2-13) | OPEN - TrueVision's `Na__LeSnap__ModifierMaterial` clones the fat-line material without its onBeforeCompile hook, so modifier edges lose the ortho depth bias in its base image | W2-13 Port Record (F4) | WT-08 note; the fix is code (WT-04) |
| Keep a class's indices whenever a segment was skipped | Linework 1.2.0's StyleBands (taken as TrueVision has it, W2-16) | OPEN - a class left with one style is painted whole, so switched-off modifier segments still draw | W2-16 Port Record (item 3) | a TrueVision-lane package (code) |
| The config's ManyNote wording | `51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json` TextManyNote, DimManyNote, ShapeManyNote (W2-36) | OPEN - TrueVision's config still tells the user to click one item on its own over panels that edit all | W2-36 Port Record (F5) | WT-04 (held) |
| The site plan exporter's stem prefix as config | `51__System__LayoutEditor/21__System__SitePlanData/Na__SitePlan__Store__.js` (W2-14; renames TrueVision__SitePlan__ stems on read) | OPEN | W2-14 Port Record | no package yet (DR-42) |
| The spell-check server name from config | `55__Feature__SpellCheck/Na__SpellCheck__Dictionary__.js` (W2-34; SERVER_SERVICE seam) | OPEN | W2-34 Port Record | no package yet (DR-42) |
| The carry rules in the object snap stylesheet | `51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css`'s VIEWPORT CARRY region (W2-25, mirroring TrueVision) | OPEN - every other snap rule moved to Styles__ObjectSnap in TrueVision's v2.129.0 | W2-25 Port Record | no package yet (DR-42) |
''')

S7_ROW_NOTES = {
    '| TV devlog v2.159.0 (L1067) |': (2, note("W2-43 brought FlushJoins 1.1.0 and W2-06 the rest of folder 50, so "
                                              "ValeVision now has the module the line said it had - at TrueVision's "
                                              "1.1.0, not 1.0.0; the records note still applies")),
    '| The 124 TV files with "ValeVision : not yet ported" lines (row above) |': (
        2, note("Wave 2 ported about a hundred and fifty more whole or by hunks (section 3.10)")),
}

S7_ROWS = W('''

**Added 02-Oct-2026 by the Wave 2 Parity Scribe (W2-99, ValeVision3D v2.71.4)**: TrueVision's halves of the audit's
WP-S02a-13, WP-S02b-09 and WP-S04a-12, and the TrueVision-side notes in Wave 2's Port Records. Items marked "code"
change what TrueVision does and need a TrueVision-lane package beyond WT-08's comment-only remit, each with Adam's
approval.

| TrueVision record | What it says | What is true on 02-Oct-2026 | Draft wording for WT-08 |
|---|---|---|---|
| PORT NOTEs of `LE/20/Na__LayoutEditor__ForceRender__.js:42`, `__Viewport3dZoom__.js:55`, `__ViewportClipboard__.js:93-94`, `__Viewport3d__.js:49` and `LE/25/Na__LayoutEditor__SnapshotRenderer__.js:41-42` | ValeVision's port pending or older | ValeVision carries Viewport3d 1.8.1 whole and the snapshot renderer's every hunk to 1.13.0 (W2-15, W2-16); ForceRender, Viewport3dZoom and ViewportClipboard as the earlier rows say | "Back-port : done - ValeVision v2.71.4" where the module came across; the door-pose half of SnapshotRenderer's note is now done too (WP-S04a-12) |
| `LE/20/Na__LayoutEditor__ModelSource__.js`, `LE/21/Na__SitePlan__GlbParse__.js`, `LE/21/Na__SitePlan__Store__.js` | no PORT NOTE block | ValeVision's copies carry one (W2-14, W2-16) | "Add a PORT NOTE: authored in TrueVision3D first; ported to ValeVision v2.71.4 (dormant)." (WP-S04a-12) |
| Module logs for commits 6076ec10 (21-Sep-2026) and 55014c6a (29-Sep-2026) | no entries: the nested LineworkModifier rules in SnapshotRenderer, StageSampler 1.2.0, AuthoredEdges' per-node owners and ConfigAccess' GetLineworkModifiers; EdgeStyles' line scale on any dashed category, FillHex and the Model Layers panel's columns | In TrueVision's code; ValeVision takes them (W2-06, W2-13, W2-15, W2-16) | "Log each under its date; name both commits in the TV devlog records note." (WP-S04a-12) |
| The site plan composites plan, section 3.5 | names `52__System__SitePlanData` | The folder is LE/21__System__SitePlanData in both apps | "21__System__SitePlanData." (WP-S04a-12) |
| `50/` the thirteen folder-50 PORT NOTEs and the FlushJoins and Storeys notes | "PENDING to ValeVision3D" | ValeVision carries every module of folder 50 at the pin since v2.71.4 (W2-06, W2-43) | "Back-port : done - ValeVision v2.71.4." (WP-S02b-10R) |
| `50/Na__ProjectedLinework__ConfigAccess__.js` | its fallback build token `2026-09-21-storey-swings` differs from its config's `2026-09-23-flush-tolerance` (TrueVision's StoreyBand test fails 1 of 53); the heading "Get the Model Sampling Setup" sits above GetAnnotationSetup | ValeVision's fallback equals its own token (W2-06) | "Set the fallback to the config's token; retitle the heading." (code, WP-S02b-10R) |
| `05/Na__RenderEffect__ProgressiveRefine__.js` | its log lists 1.0.1 above 1.0.3 and 1.0.2; EnsureBuffer's comment says "ROUNDED" while the code floors | ValeVision carries the log verbatim under a Legacy marker (W2-07) | "Reorder the log; say floored." (W2-07) |
| `40/Na__DrawView__SectionAdapter__.js` (TrueVision's twin) | 13 names | ValeVision's has 19 (W2-02) | "Add the six pass-throughs." (code, WT-02) |
| `47/Na__DrawingPlanes__Bounds__.js` PORT NOTE (:49-51) and TV devlog v2.82.0 (:8310-8311) | ValeVision's category keys are "shorter" and the token lists must change for the port | Stale: 90 of ValeVision's 91 model lists match the tokens (W2-40) | "Drop the line." (W2-40) |
| `LE/28/Na__LayoutEditor__ObjectSnap__Marker__.js` and `LE/57/...ViewportLink__.js` DEVELOPMENT LOGs | 1.0.0 above 1.1.0; two 1.3.0 entries | ValeVision carries both verbatim under Legacy markers (W2-42, W2-37) | "Order and renumber them." (W2-37, W2-42) |
| `LE/30/Na__LayoutEditor__ContextMenu__.js`, `__HoverTooltip__.js`, `__NoteTooltip__.js`, `__LayerMenu__.js`, the SheetTools leaves of W2-21, the four drawing tools, Grips, Measurements, the 28 object snap modules, the 37 vector tools, the 26, 27, 32 and 33 drafting aids, the LE/50 specification units, LE/57 and LE/58, the 55 spell check | "ValeVision : not yet ported - it waits for Adam's sign-off" (or "PENDING") | Ported in v2.71.4 (section 3.10) | "Back-port : done - ValeVision v2.71.4", file by file from the Port Records |
| `LE/35/Na__LayoutEditor__DimensionTool__.js` | no log entry for v2.152.0's linePt and dash on create; its DESCRIPTION calls the marker orange, the dimension tone, which 1.11.0 retired; RectangleTool and LeaderTool do not log their move onto ObjectSnap Search (v2.129.0) | ValeVision logs the hunk as 1.13.0 (W2-26) | "Log 1.13.0; reword the marker line; log the moves." (W2-26) |
| `LE/25/Na__LayoutEditor__Enhance__.js` and `__RenderComposites__.js` PORT NOTEs; TV devlog v2.93.0 | Enhance names ValeVision's pre-subfolder path; RenderComposites says ValeVision took it at v2.28.0; v2.93.0 ends "not in ValeVision" | ValeVision carries Enhance 1.1.0 and Render Composites 1.3.0 whole (W2-09) | "Back-port : done - ValeVision v2.71.4." (W2-09) |
| `30/Na__ImageExport__StaticExport__TiledRenderer.js` PORT NOTE | the renderFrame route "is not" worth carrying back | ValeVision carries it since 1.6.0, opt-in (W2-12) | "Back-port : the route is in ValeVision 1.6.0 (fog images only)." (W2-12) |
| `LE/25/Na__LayoutEditor__SnapshotRenderer__.js` CONTEXT_CATEGORIES (code) | no `TrueVision__SceneEntourageSilhouette` | ValeVision's keeps its silhouette row (W2-15) | the category, for WT-04 (code) |
| `LE/50/Na__LayoutEditor__Styles__Specification__.css` header | "v2.162.0" for the Lockstep Question region | the devlog and commit 55014c6a say v2.163.0 | "v2.163.0." (W2-31) |
| `LE/37/` the vector tools' status lines; TV devlog v2.150.0 | "NOT tried by Adam" | v2.151.0 quotes Adam after trying v2.150.0 ("It works INCREDIBLE!") | Adam's call: update the status line if that is his sign-off. (W2-27, W2-41) |
''')

S81_NOTE = W('''

**02-Oct-2026 note (W2-99, ValeVision3D v2.71.4).** Wave 2 added three callers and retired one client. The
specification's units reach storage only through the facade, verbatim: Transport asks `Na__CfApi__IsConfigured`,
`ProjectFileLocation`, `ReadProjectFile` and `WriteProjectFile`, and Lockstep `Na__LocalMirror__WriteSiblingFile` for
the localhost copy of `ValeVision__DrawingNotes__.json` (W2-30); ValeVision's own notes client,
`Na__AppUtils__R2DrawingNotes__`, had no importer left and was deleted (W2-33; the local server's drawing-notes route
stays). The site plan store, dormant, reads `Na__CfApi__BuildContentCdnUrl` and `GetLoadedProjectData` and
ProjectLoader's master index, with its remote candidates marked TODO(OVH-MIGRATION) (W2-14). Spell Check writes the
Vale dictionary through the local server's `/api/valevision/user-config/spellings` (W0-18's blueprint) and reads it as
a static file elsewhere (W2-34). No TrueVision transport was copied (gate G6: no `na-truevision-api`, `NaProjectPortal/`
or `/r2/` route in ValeVision's code); Wave 2 changed neither the local server, nor the worker, nor the editor-owned key
list, and deployed nothing. The facade's localhost test needs a Flask-origin check once the OVH server is live (working
memory, 02-Oct-2026).
''')
