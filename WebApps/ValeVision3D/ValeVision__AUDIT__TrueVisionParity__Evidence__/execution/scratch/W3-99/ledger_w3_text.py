"""W3-99 - the prose blocks of Wave 3's pass over the parity ledger (ValeVision3D v2.71.5). ASCII only."""

REL = 'v2.71.5'


def W(text):
    return text.strip('\n').split('\n')


def note(text):
    return '**[02-Oct-2026 note (W3-99, %s): %s]**' % (REL, text)


S14_BULLET = W('''
- **Wave 3 (ValeVision3D v2.71.5, 02-Oct-2026; W3-99).** The wave adds 15 modules - the Sheet Images core, editing set,
  panel, store and publish units (LE/54, W3-02, W3-18), SheetTools__CopyDrag (W3-03), the Floor Areas panel, table and
  label grip (LE/59, W3-10), the note-region grips and the Regions panel (LE/50, W3-11) and the Area Schedule element
  (LE/57, W3-17) - with two stylesheets (Styles__SheetImages, loader-linked; Styles__FloorAreas, linked by its panel);
  it removes one (`LE/30__System__SheetTools/Na__LayoutEditor__Snapping__.js`, W3-08), and the app graph grows from 610
  to 659 modules (inert modules of earlier waves now linked: LayerMenu, the two tooltips, the Leaderless panel, the
  scrapbook elements, the vector tools' units). It adds exports to existing modules: State +8 and ToolState +3 (W3-01);
  HitResolution's PicksUpMove family, CarryTarget, DoorAt and the ValeVision-only Na__LeTools__VV_HOLD_AUTO_MOVE,
  PointerPress's SettleAutoMove, PointerDrag's retype, anchor and viewport reruns, Keyboard's CopyKey, SheetTools__ to
  TrueVision 1.39.0's 32 names, ViewportHandles' rotate grip names (W3-03); and it removes HitResolution's
  SnapShapeTranslation. A warm client holding a mix of old and new files can fail to link the editor (the old hub
  units with the new State or ToolState; an old HitResolution with the new PointerDrag or Sheet Images Insert, which
  import the guard constant; the new Dimensions and Shapes panels with pre-programme HatchPatterns, LineStyleTool or
  PanelHost leaves) or ask for the deleted Snapping shim (a 404 unless cached) for that one load. Bump needed: yes,
  once at deploy - the same consolidated bump as Waves 0 to 2 if the shared worker still fronts ValeVision then (W0-08
  is superseded by the move to the OVH server). W6-02's precache refresh (or its OVH successor) should add the LE/54
  and LE/59 folders whole, CopyDrag, the two LE/50 region modules, the Area Schedule element and drop the Snapping
  shim. Service worker token: shared Whitecardopedia worker - Adam's call; it was not bumped (`'2026-09-18-1'`).
''')

S23_NOTE = W('''
**02-Oct-2026 note (W3-99, ValeVision3D v2.71.5).** Wave 3 created no subfolder. Inside them: LE/30__System__SheetTools no
longer holds `Na__LayoutEditor__Snapping__.js` (deleted by W3-08; TrueVision retired its own shim), so snapping lives
only in LE/28__System__ObjectSnap in both apps, ViewportSnapMove and MoveAnchor with it; LE/54 SheetImages and LE/59
FloorAreas now hold every TrueVision file of theirs and are live (W3-02, W3-18, W3-09; W3-10). The Archive's
subfolder table (its rows for 20, 30 and the missing 28, 36 and 37) is superseded by this section and section 3; it
keeps its 15-Sep-2026 wording.
''')

S3_NOTE = W('''
**Refreshed 02-Oct-2026 by W3-99 (ValeVision3D v2.71.5).** "Blocked by" now comes from the same analysis re-run on the
end-of-Wave-3 working tree (`ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/scratch/W3-99/pom/port_order_map__endW3.json`;
Wave 2's values stay in its map). Wave 3 cleared the blockers of {cleared} more TrueVision modules (`none`
{none0} -> {none1}; lists {list0} -> {list1}); the three modules that left the map's closure in Wave 1 keep `none`. Rows
Wave 3 changed carry their new state with the old kept as "[was: ...]"; the {landed} TrueVision-only rows of 3.5 that
landed name their ValeVision path (every LE/54 and LE/59 file of TrueVision's is now in ValeVision); the deleted
Snapping shim's row says so; section 3.11 lists the changes by package.
''')

PKG = [
    ('W3-01', "SheetTools__State 1.8.0 and ToolState 1.7.0 whole (the hub's sub-wave A): new tools, chords and the move "
              "retype state; new dimensions and vectors read DefaultAtScale (ValeVision's hard-coded true dropped); text, "
              "leaders and dimensions placed in an open group join it", '3.1 State, ToolState', None),
    ('W3-02', "Sheet Images' editing set whole and inert: the core, Crop, Menu, Insert 1.2.0, Handles and the Images panel",
              '3.5 the six LE/54 files (landed)', None),
    ('W3-03', "The SheetTools hub's sub-wave B in one change: HitResolution 1.11.0, PointerPress 1.10.0, PointerDrag "
              "1.19.0 with four VV GUARD constants holding DR-40 items 7-10, Keyboard 1.18.0, SheetTools 1.39.0, "
              "ContextMenu 1.7.0, CopyDrag 1.2.0 new, ViewportHandles 1.5.0 (OC-02), MarginGrip's held term restored, "
              "AxisLock's and ContentEditing's PORT NOTEs; six TrueVision tests and the held DrawingTabKeys test (OC-12)",
              '3.1 the seven hub files, ViewportHandles, AxisLock, ContentEditing, MarginGrip; 3.5 CopyDrag (landed)', '5.1'),
    ('W3-05', "The drafting aids switched on: the Drawing Grid panel and Grid / Axes attach in the mode controller "
              "(1.18.10); Na__Test__OrthoMode__, __DrawingGrid__ and __DrawingAxes__ (PARTIAL: DrawingAxes 50 / 51 "
              "waits on W5-01's toolbar)", '3.1 the mode controller', None),
    ('W3-06', "Viewport3dZoom 1.1.0 and ViewportClipboard 1.4.0 whole; Na__Test__ViewportRotation__ completed (52 checks)",
              '3.1 Viewport3dZoom, ViewportClipboard', None),
    ('W3-07', "ShapeTool 1.10.0 whole; the Vector Tools panel and the adapter's Initialize in the mode controller "
              "(1.18.11); two vector suites; the AppConfig left as TrueVision's (no vector-tools accordion entry)",
              '3.1 ShapeTool, the mode controller', None),
    ('W3-08', "ValeVision's Snapping shim retired (deleted; K2 FR-15)", '3.6 Snapping', '2.3'),
    ('W3-09', "Sheet Images switched on: the mode controller's hunks (1.18.12), the loader's stylesheet line (1.1.8), "
              "'images' in the accordion, W3-18's held stylesheet landed, Insert's item-7 guard (outside its list); "
              "Na__Test__SheetImages__ with the project folder as the store of record",
              '3.1 the mode controller; 3.2 the Layout Editor config; 3.5 Insert, Styles__SheetImages; 3.6 Loader', '8.1'),
    ('W3-10', "Floor Areas switched on: the panel 1.2.1, table 1.1.0, label grip and stylesheet; the mode controller's "
              "hunks (1.18.13); 'floor-areas' in the accordion and the FocusNote room clause",
              '3.5 the four LE/59 files (landed); 3.1 the mode controller; 3.2 the Layout Editor config', None),
    ('W3-11', "The note-region grips and the Regions panel new; Panel__MarginNotes 1.2.0 whole; the grips beside the "
              "margin grip in the mode controller (1.18.14)",
              '3.5 Grips, Panel__MarginNotes__Regions (landed); 3.1 Panel__MarginNotes, the mode controller', None),
    ('W3-12', "Panel__Dimensions 1.7.0 and Panel__Shapes 1.9.0 whole; Na__Test__HatchLineControls__",
              '3.1 Panel__Dimensions, Panel__Shapes', None),
    ('W3-13', "Panel__Layers 1.3.0 (the Ref switch) and ViewportLink 1.5.1 whole", '3.1 Panel__Layers, ViewportLink', None),
    ('W3-14', "The parametric scrapbook panel 1.8.0 (one seam: the display name) and its config at Meta 1.8.0 with "
              "ValeVision's values; every element type registered; OC-15's three tests green",
              '3.1 Panel__ScrapbookParametric; 3.2 the parametric config', '6'),
    ('W3-15', "Panel__ViewportSettings 1.10.0 whole with ValeVision's 1.4.1 add-list rebuild re-applied (Frame, Rotation, "
              "Doors, Hide swings, adoption)", '3.1 Panel__ViewportSettings', '6'),
    ('W3-16', "PdfExporter 1.12.0 whole with the document-code file name (OC-13; logged 1.12.1)", '3.1 PdfExporter', '7'),
    ('W3-17', "The Area Schedule element 1.1.0 and its test (inert until W3-14)",
              '3.5 ScrapbookParametric__AreaSchedule (landed)', None),
    ('W3-18', "Sheet Images' Store and Publish (the project folder as the store of record, TODO(OVH-MIGRATION) on the R2 "
              "halves) and the stylesheet, held for W3-09 (PARTIAL at its return; closed by W3-09)",
              '3.5 Store, Publish, Styles__SheetImages (landed)', '8.1'),
]


def S310(rows4):
    out = W('''
### 3.11 Wave 3 (ValeVision3D v2.71.5): what each package changed

Written 02-Oct-2026 by the Wave 3 Parity Scribe (W3-99) from the seventeen Port Records of the wave
(`ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/port_records/`) and the integrator's gate
(`.../execution/gate_reports/W3.md`, PASS_WITH_NOTES). W3-04 (the four held gestures) did not run: it waits for Adam's
answer to DR-40 items 7-10. It is also the return-trip section the audit's WP-S04b-15, WP-S05a-11, WP-S05b-11,
WP-S06a-12 and WP-S06b-13 ask for. "Rows" are the rows above that the package changed; work that is not a module of
this register (tests) is named in the second column.

| Package | What it changed | Rows | Elsewhere in this ledger |
|---|---|---|---|
''')
    for p, what, rows, else_ in PKG:
        r4 = rows4(p)
        tail = '; '.join(x for x in (else_, r4) if x) or '-'
        out.append('| %s | %s | %s | %s |' % (p, what, rows, tail))
    out += W('''
| W3-04 | Held: deletes the VV GUARD lines and ports Na__Test__MoveAnchor__ once Adam answers DR-40 items 7-10 | none | 5.1; 4 (v2.28.0, v2.78.0, v2.98.0, v2.117.0, v2.118.0, v2.119.0, v2.141.0, v2.149.0) |
| Gate | FIX-1: the AppConfig parity test's stale AccordionSections allow-list row removed | none (a test) | - |
| W3-99 | 68 release placeholders resolved to v2.71.5 in 57 files; this pass | none | this pass |
''')
    out += [''] + W(RECORDS_ITEMS)
    return out


RECORDS_ITEMS = '''
**The audit's records items for this wave (WP-S04b-15, WP-S05a-11, WP-S05b-11, WP-S06a-12 and WP-S06b-13, ValeVision's
half; W3-99).** Checked against the ledger and the files on 02-Oct-2026. "Archive :n" is the Archive's line today; the
slices cite the same lines of the old file, 1992 lower. The Archive itself is unchanged (section 9's rule).

- Every file the S04b, S05a, S05b, S06a and S06b packages of Waves 1 to 3 created or changed has its row with its parity
  state, its TrueVision module version at b2aa9151 and its divergences (3.1 to 3.6; the acceptance of all five) -
  CLOSED. Whole-file takes say verbatim only where the diff against TrueVision is the banner, the PORT NOTE and the
  console prefix (the W3 gate's comparison: 45 header-only, 13 with declared seams); the three hub files with VV GUARD
  lines, Insert, the Viewport panel, the parametric panel, Store and the PDF exporter say adapted, Publish diverged.
- Return trips per TrueVision release (WP-S04b-15: v2.107.0, v2.111.0, v2.113.0, v2.114.0, v2.129.0, v2.131.0, v2.137.0,
  v2.138.0, v2.149.0; WP-S05b-11: 36, 37, 52, the dimension styles and round-up) - CLOSED: section 4's rows carry each
  release's ValeVision version, and this table each package's. v2.137.0 PORTED in v2.71.4; v2.111.0 and v2.138.0
  PORTED now; v2.107.0, v2.113.0, v2.114.0, v2.129.0 and v2.131.0 wait only for the toolbar (W5-01); v2.149.0 waits
  for DR-40 item 10 (W3-04).
- The subfolder table (Archive :3112-3128; WP-S04b-15, WP-S05a-11, WP-S05b-11): row :3120 lists ViewportSnapMove as
  TrueVision-only under 20, row :3122 lists Snapping as a base of 30 in both apps, and 28, 31, 36 and 37 have no rows
  - SUPERSEDED by section 2.3 (every subfolder by number; 32 of TrueVision's 34 now in ValeVision, 65 and 66 to come) and the Register:
  ViewportSnapMove and MoveAnchor live in LE/28 in both apps (W2-25), the Snapping shim is deleted (W3-08), 31
  DocumentKeys landed in Wave 1 (W1-30) with `03__AppUtils/Na__AppUtils__KeyScope__` (W1-29), 36 and 37 in Waves 1
  and 2.
- Archive :2712, purple on the viewport carry (WP-S04b-15) - OPEN: ViewportSnapMove 1.6.0 and the carry rules are in
  (W2-25) and the hub's CarryTarget is TrueVision's (W3-03), but the carry is DR-40 item 9, held behind
  Na__LeTools__VV_HOLD_VIEWPORT_CARRY until W3-04.
- Archive :2067-2068, ItemClipboard adapted and the wider clipboard not ported (WP-S05a-11) - CLOSED: ItemClipboard
  1.7.0 whole (W2-21, DR-40 item 1) and the hub's cut and cross-sheet paste in place (W3-01, W3-03;
  Na__Test__CrossSheetClipboard__ 8/8).
- Archive :3157, the v2.52.0 container-editing set "verbatim" against TrueVision v2.59.0 (WP-S05a-11) - SUPERSEDED: the
  SheetTools units are TrueVision 1.39.0's set at the pin (W3-01, W3-03), SelectionBox, Grips and the toolbar's
  rows are in 3.1 with their own states.
- Archive :2036-2041, "ValeVision has no equivalent" of the two verification harnesses (WP-S05a-11, WP-S05b-11) -
  CLOSED by W0-06's dated correction beside it; every package runs both (gates G1 and G2).
- The skipped rows (WP-S05b-11): Archive :2474 extension-line lengths, :2512 the panels' atScale rows and :2513 the
  extension-line panel rows - CLOSED (DimensionGeometry's fixed-length lines W1-26; Panel__Dimensions 1.7.0 and
  Panel__Shapes 1.9.0, W3-12; v2.40.0 and v2.41.0 PORTED). Archive :2496-2500's "Left out" paragraph - PlanDoors
  (W2-11), ViewportSnapMove (W2-25, carry held), ModelSource (W2-16, dormant), measure at scale and the extension-line
  rows (W3-12), the service-worker token (W0-06's correction); "atScale is hardcoded true" - CLOSED (ToolState 1.7.0
  reads DefaultAtScale, W3-01); "DimensionTool BeginTextEdit stays ValeVision's" and "CreateDimension does not store
  Dimension__AtScale" - CLOSED (DimensionTool 1.12.0 whole with v2.152.0's create hunk, W2-26).
- ValeVision's LeaderTool log 1.1.0 (WP-S05b-11) - CLOSED: LeaderTool 1.2.0 whole with TrueVision's log (W2-26).
- Archive :3223, the Add Viewport rebuild (WP-S06a-12) - CLOSED for ValeVision: Panel__ViewportSettings 1.10.0 is
  TrueVision's with the 1.4.1 rebuild re-applied (W3-15) and the mode controller's scene refresh kept; the back-port
  to TrueVision stays OPEN (section 6, WT-04).
- The Phase 5 rows (Archive :3061-3064; WP-S06a-12), "new" against the Lantern Designer on 10-Sep-2026 - SUPERSEDED:
  PanelHost, Panel__Sheet, Panel__Text and Panel__Styles are TrueVision's (Waves 1 and 2), Panel__Layers 1.3.0,
  Panel__Dimensions 1.7.0 and Panel__ViewportSettings 1.10.0 too (W3-13, W3-12, W3-15); the toolbar, the tab strip,
  the mode controller and the Dev menu keep their 3.1 rows (the mode controller a hunk replay until W5-03); the PDF
  exporter is TrueVision 1.12.0 with the document code (W3-16); the two stylesheets are in 3.1.
- Permanent divergences (WP-S06a-12), each with its reason: the Model Layers config (a merge - ValeVision's own keys
  and coarse Existing and Proposed rows under TrueVision's linework-modifier group, because Vale models carry
  ValeVision__ category keys; W2-13); SitePlanComposites, SiteLegend and SiteLegendLink (TrueVision's code, dormant
  while site plans are off, with ValeVision__SitePlan__ stems; DR-08 (B)); the Standard Scrapbook's config (empty:
  TrueVision's two items are Noble Architecture site plan furniture with its OS licence; DR-43); the Custom
  Scrapbook's transport and server (ValeVision's Flask blueprint `Server__ValeVisionScrapbook__Api__.py` and
  `/api/valevision/scrapbook`, DIV-4). Each release since Wave 0 names whether the shared worker's token was bumped
  (section 1.4; never).
- The specification (WP-S06b-13): a retrospective entry for the 14-Sep-2026 base port - SpecData, SpecLinks,
  SpecEditor, SpecMargin 1.0.0, MarginGrip, Panel__MarginNotes and R2DrawingNotes came across in ValeVision's
  checkpoint commit 66937440 on 14-Sep-2026 with no devlog entry and no ledger section of their own; the reading mode
  (v2.43.0), the margin spacing (v2.44.0) and the revision set (v2.56.0) followed, each in the Archive. Since then the
  whole of LE/50 is TrueVision's at the pin: the data units and the lockstep (W2-30, W2-31), SpecMargin, MarginGrip and
  the notes stylesheet (W2-32, W3-03), the Margin Notes panel 1.2.0 and the regions (W3-11), SpecPdf and SpecDocument
  with the document code (W1-25, OC-09); R2DrawingNotes is retired (W2-33). Every LE/50 file has its 3.1 or 3.5 row -
  CLOSED.
- The 'margin' undo row (Archive :2211; WP-S06b-13) - CLOSED: History 1.7.0 counts 'margin' and 'areas' as steps since
  v2.71.3 (DR-40 item 4, W1-21), and a region's grip drag announces once on release (W3-11).
- The drift table (WP-S06b-13): `parity/ref/drift_all.tsv` called SpecData__Editing and SpecData__Draft header-only,
  though both carried real code (Editing's AfterEdit calls, Draft's ReadDraft and WriteDraft) - NOTED; both were taken
  whole (W2-30), so nothing was skipped.
- Permanent divergences of the specification (WP-S06b-13): DIV-4's file and route names (`ValeVision__DrawingNotes__.json`,
  `/api/valevision/...`); SpecDocument's project name through the facade's display-name accessor; SpecPdf's font -
  CLOSED as a divergence: PdfFonts landed (W1-25) and SpecPdf sets Open Sans as TrueVision does.
- The records outside the five packages' lists, for their owners (W3 gate 4.4): the eleven LE/28 PORT NOTEs that still
  say the Snapping shim "stays" (W3-08 follow-up); the parametric engine's PORT NOTE bullet that W3-14 made stale; Sheet
  Images' R2 labels and Meta notes (W1-16's config); the OrthoMode test's unused TONE stub; "RB05 T01" in a ported test
  label (TrueVision's text) - OPEN, W6-01's sweep or the OVH pass.
- TrueVision's halves of the five packages (stale PORT NOTEs and plan rows, the LineStyleTool and DimensionTool notes,
  the missing PORT NOTE blocks, the hatch-default question, the spec files' "not yet ported" lines) are queued for
  WT-08 in section 7.
'''

WM_INTRO = W('''
- **After Wave 3 (ValeVision3D v2.71.5, 02-Oct-2026; W3-99).** Thirty-three releases became PORTED: v2.38.0 (viewport
  frames off), v2.40.0 and v2.41.0 (at scale, extension lines), v2.42.0 (doors), v2.65.0, v2.87.0, v2.90.0 (a hatch on
  any vector), v2.94.0 (the fog in the PDF), v2.100.0 and v2.120.0 (the Project Portal block, switched off), v2.111.0,
  v2.115.0, v2.121.0 (print-size pictures), v2.122.0, v2.123.0 (reference layers), v2.125.0, v2.126.0, v2.128.0 and
  v2.134.0 (the Cabinet Infill), v2.138.0 (turned viewports), v2.139.0, v2.140.0, v2.142.0, v2.143.0 (note regions),
  v2.144.0, v2.147.0, v2.148.0 (Project Floor Areas, from NOT-CONSIDERED), v2.150.0 and v2.151.0 (the Booleans),
  v2.152.0, v2.153.0 (box select over a viewport, confirmed by Adam), v2.154.0 and v2.164.0 (the Site Plan Legend,
  dormant). v2.78.0 is now PARTIAL, held (Select picks Move up, DR-40 item 7). {more} rows already PARTIAL gained
  more - the four held gestures' releases wait for W3-04 and Adam's answer; the drafting aids', the vector tools',
  Floor Areas' and Sheet Images' wait only for the toolbar (W5-01) - and dated notes on {notes} more name what the
  wave added with no change of class. The newest fully ported release is now v2.164.0; the low-water stays v2.28.0
  (its viewport carry is DR-40 item 9, held). TrueVision releases Adam has confirmed that Wave 3 carried: v2.153.0
  (whole), v2.117.0 (signed off in TrueVision, held here by DR-40's default) and v2.155.0's confirmed part (kept, in
  since v2.71.2); every other release it carried is named as unconfirmed in the v2.71.5 devlog entry (DR-01 (c)).
''')

S51_NOTE = W('''
- **02-Oct-2026 note (W3-99, ValeVision3D v2.71.5).** Wave 3 also ran on every default: no answer to DR-01..DR-44 or the
  seven questions arrived. DR-40 items 7-10 stay held - TrueVision's code is in, each gesture behind a ValeVision-only
  `VV GUARD` constant (`Na__LeTools__VV_HOLD_AUTO_MOVE` and `VV_HOLD_VIEWPORT_CARRY` in HitResolution,
  `VV_HOLD_COPY_DRAG` and `VV_HOLD_MOVE_ANCHOR` in PointerPress; W3-03) and one more guard over Sheet Images' drop
  (W3-09); W3-04 deletes every `VV GUARD` line once Adam confirms. Items 1-6 are all in. DR-01 (c): every release
  ported in dependency order and named. The OVH move (execution policy 13) shaped Sheet Images: the project folder is
  the store of record through the Flask routes, and the R2 halves are TODO(OVH-MIGRATION) placeholders (W3-18, W3-09).
  Choices made inside packages, for Adam's eye: W3-07 left the accordion without a vector-tools entry because
  TrueVision has none (the audit's R3 C.1 listed one in error); W3-09 guarded Sheet Images' drop outside its list
  (the W3 gate asks for ratification, OC-14 form) and landed W3-18's held stylesheet; W3-14 took TrueVision's
  four-scales note with ValeVision's site-plan clause (ValeVision's three-scales sentence was false since 1:200) and
  hid the two Project Portal tiles by config while the QR is off (DR-12 (A)); W3-16 names sheet PDFs
  `{project}_{drawing}__...` again (OC-13, DR-11); DR-37 (3) - new shapes ignore the Vectors panel's Hatch default in
  both apps - is ported as TrueVision has it until Adam says.
''')

S6_ROW_NOTES = {
    '| Add Viewport list rebuilt on every refresh; Viewport panel refreshed on scene broadcasts |': (4, note(
        "ValeVision took TrueVision's Panel__ViewportSettings 1.10.0 whole and re-applied the 1.4.1 rebuild over "
        "TrueVision's one-time fill (W3-15); the offer stands, with the panel's PORT NOTE Back-port line naming it")),
    '| A display-name accessor in place of the PWA project-context global |': (4, note(
        "the parametric scrapbook panel joins the list: ValeVision's 1.8.0 reads Na__CfApi__GetProjectDisplayName where "
        "TrueVision's reads window.TrueVision__Pwa__ProjectContext (:290-291; W3-14, K2 K4)")),
}

S6_OFFERS = W('''
**Offers raised by Wave 3 (02-Oct-2026, ValeVision3D v2.71.5; W3-99).** None new: Wave 3 took TrueVision's files and
re-applied ValeVision's seams. Two standing offers gained evidence (the Add Viewport rebuild, W3-15; the display-name
accessor, W3-14 - their rows carry the notes). The `VV GUARD` constants (W3-03, W3-09) are ValeVision's hold on DR-40
items 7-10, not an offer: they go when Adam confirms (W3-04). Sheet Images' Store without TrueVision's host test and
Publish with the project folder as the store of record (W3-18) follow ValeVision's move to the OVH server, not
TrueVision's.
''')

S7_ROW_NOTES = {
    '| The 124 TV files with "ValeVision : not yet ported" lines (row above) |': (2, note(
        "Wave 3 ported about forty more whole or with named seams (section 3.11): every LE/54 and LE/59 file, the region grips "
        "and Regions panel, CopyDrag, the Area Schedule element, the SheetTools hub and its two state units, "
        "ViewportHandles, Viewport3dZoom, ViewportClipboard, ShapeTool, MarginGrip, Panel__MarginNotes, the "
        "Dimensions, Shapes, Layers, Viewport and parametric scrapbook panels, ViewportLink and the PDF exporter")),
    '| `LE/60/Na__LayoutEditor__PdfExporter__.js` DEVELOPMENT LOG |': (2, note(
        "ValeVision now carries the line, with its document code, and logs it as its 1.12.1 (W3-16, OC-13)")),
    '| `LE/35/Na__LayoutEditor__DimensionTool__.js` |': (2, note(
        "also its PORT NOTE (:67-68) still says 'Ahead: 1.2.0 ... waits', though ValeVision has had it since v2.29.0 "
        "(audit slice S05b b10)")),
}

S7_ROWS = W('''
**Added 02-Oct-2026 by the Wave 3 Parity Scribe (W3-99, ValeVision3D v2.71.5)**: TrueVision's halves of the audit's
WP-S04b-15, WP-S05a-11, WP-S05b-11, WP-S06a-12 and WP-S06b-13, and the TrueVision-side notes in Wave 3's Port Records.
Items marked "code" change what TrueVision does and need a TrueVision-lane package beyond WT-08's comment-only remit,
each with Adam's approval.

| TrueVision record | What it says | What is true on 02-Oct-2026 | Draft wording for WT-08 |
|---|---|---|---|
| `LE/60/Na__LayoutEditor__PdfExporter__.js` PORT NOTE | "Ported from: ValeVision3D ... Parity: verbatim" (the audit's WP-S08-13 flagged it) | TrueVision's exporter is the lead; ValeVision took 1.12.0 whole with two seams, the identity strings and the document code in the file name (W3-16) | "Parity : TrueVision leads; ValeVision v2.71.5 carries 1.12.0 whole (two seams)." (W3-16) |
| The spec files' PORT NOTEs: `LE/50/Na__LayoutEditor__MarginGrip__.js:32`, `Panel__MarginNotes__.js:36`, `SpecData__.js:99`, `SpecDocument__.js:54`, `SpecEditor__.js:72`, `SpecLinks__.js:45`, `SpecMargin__.js:50`, `Styles__Specification__.css:6` | "ValeVision : not yet ported" | ValeVision ported them on 14-15 Sep-2026 (checkpoint 66937440, v2.43.0, v2.44.0) and carries every one at the pin since v2.71.3 to v2.71.5 | "Back-port : done - ValeVision v2.71.5 (whole)." (WP-S06b-13) |
| `LE/30/Na__LayoutEditor__SheetTools__.js` DESCRIPTION (:465), `LE/35/Na__LayoutEditor__ShapeTool__.js` (:111), `LE/27/Na__LayoutEditor__DrawingGrid__.js` and the LE/28 ObjectSnap modules' DESCRIPTION lines | name `30__System__SheetTools/Na__LayoutEditor__Snapping__.js` | Both apps retired the shim (TrueVision "after an hour", ObjectSnap__ :60-63; ValeVision with W3-08); history lines may keep the name | "Name 28__System__ObjectSnap's Search and State." (W3-08) |
| `LE/30/Na__LayoutEditor__SheetTools__ContextMenu__.js` DEVELOPMENT LOG | two 17-Sep-2026 1.1.0 entries | ValeVision carries it verbatim under a '- Legacy :' field (W3-03) | "Renumber the second 1.1.0." (W3-03) |
| `LE/36/Na__LayoutEditor__Panel__Patterns__.js` | no PORT NOTE block (with HatchPatterns and PaintOrder, rows above) | ValeVision's copy carries one (W2-29) | "Add a PORT NOTE: authored in TrueVision3D first; ported to ValeVision v2.71.4." (WP-S05b-11) |
| `TrueVision__PLAN__VectorTools__.md` section 6 (:197, :202, :336-337) | asks Adam to confirm T and When, and where the Vector Tools panel sits | Both apps run T as Trim only inside an open group and the panel straight after Vectors, outside the accordion (W3-07) | Adam's call: close the questions or keep them open. (WP-S05b-11) |
| ShapeTool, RectangleTool, CircleTool and ArcTool (code) | a new shape takes hatchOn false whatever the Vectors panel's Hatch default says | The same in both apps; DR-37 (3) left it for Adam (D-S05b-05) | If it is a defect, read the setup's default hatch on create in all four tools, in both apps. (W3-07, W3-12) |
| TrueVision v2.143.0's "NOT done" list (code) | a picture or any markup laid over a region covers it; deleting a region renumbers the names after it | Carried into ValeVision verbatim (W3-11) | for the regions' owner in both apps (W3-11) |
| `LE/57/Na__LayoutEditor__Panel__ScrapbookParametric__.js:290-291` (code) | reads window.TrueVision__Pwa__ProjectContext for the project's name | ValeVision reads the facade's display-name accessor (W3-14) | the accessor, for the TrueVision lane (section 6's display-name row; DR-42) |
''')

S81_NOTE = W('''
**02-Oct-2026 note (W3-99, ValeVision3D v2.71.5).** Wave 3 added the Sheet Images transport and one more facade reader,
and built nothing on R2, a worker or a sync (execution policy 13). `LE/54/Na__LayoutEditor__SheetImages__Store__.js`
asks the page's own origin for W0-18's routes - `/api/valevision/sheet-images/upload`, `reconcile` and `list` - and
`/api/health`, whatever the host (TrueVision's localhost test removed: no hostname test assumes localhost means Flask);
`__Publish__.js` files each picture under its drawing's document id in the project folder, the store of record, and
imports only `Na__CfApi__SHEET_IMAGES_ARCHIVE` from the facade; TrueVision's R2 halves (list, upload, copy, delete)
are `TODO(OVH-MIGRATION)` placeholders with their call shape kept (7 seams in 3 files, the W3 gate's count). The
parametric scrapbook panel reads `Na__CfApi__GetLoadedProjectData` and `GetProjectDisplayName` (W3-14). No TrueVision
transport was copied (gate G6: no `na-truevision-api`, `NaProjectPortal/` or `/r2/` route in ValeVision's code);
Wave 3 changed neither the local server and its blueprints, nor the worker, nor the editor-owned key list, and
deployed nothing. Until the OVH server serves the project folder, a sheet picture exists only on the authoring PC
(hold any live deploy of Sheet Images until then; W3-09, W3-18).
''')
