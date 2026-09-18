# ValeVision3D Development Log

# ---------------------------------------------------------
## ValeVision3D v2.56.0 - 17-Sep-2026 - The Specification Is a Document: Revision, Number and Download
### Ported from TrueVision3D v2.63.0, authored there the same day

**Overview**
- Adam, on TrueVision: "there's no way to version this. I need this to be a revision B, so I
  need a way of being able to assign revisions to the specification and also keep the same kind
  of naming when it downloads. Add an actual download button rather than just a print button."

**What came across**
- `ProjectSpecification__Revision` and `ProjectSpecification__DocumentNumber` on the
  specification document, typed into two fields on the Project Specification bar, in both views.
- They take the ordinary edit route (CanEdit, then Changed), so they undo, draft and announce -
  and they are counted by `ContentJson`, so changing the revision marks the document unsynced
  and lights Sync. Left out of that hash the revision would never reach the cloud copy.
- The number defaults to the project code plus `DocumentNumberSuffix` (3047 gives `3047_SPEC`);
  clearing the field goes back to following the code. `Rev B` typed in full stores `B`.
- Shown on the reading page's title block and in the running head of every page.
- `Na__LayoutEditor__SpecPdf__`: a Download button that builds a real PDF of A4 pages, set from
  the same chrome primitives the sheets are drawn with and wrapped by the sheet margin's own
  `Na__LeMargin__Wrap`. Allowed in a read-only session - it reads a document, not changes one.

**Divergence from TrueVision**
- ValeVision3D has no `Na__LayoutEditor__PdfFonts__`, so the pages are set in the face its own
  measurer uses (Helvetica) rather than in an embedded Open Sans. Measurement and painting agree
  either way, which is what the layout depends on. If the Open Sans embedding is ever ported,
  this module needs no change beyond installing the cuts into its document.

**Proved**
- Against project 3047 (Doous)'s real drawing notes, with the transport bypassed so no R2 read
  and no R2 write: fresh revision A; `SetRevision("B")` gives
  `3047_SPEC__ProjectSpecification__A4__RevB__17-Sep-2026__.pdf` with `IsDirty` true;
  `"Rev C"` stored as `C`; a typed number giving `3047_T02_SPEC__...`; cleared, back to `3047_SPEC`.
- The built document: 1 page, 2,293 bytes, `%PDF-1.3`. Its content stream inflates to 21 text
  runs and ZERO image operators - the words in the file are words, not a picture of them.

# ---------------------------------------------------------
## ValeVision3D v2.55.0 - 17-Sep-2026 - A Downloaded Sheet Is Named After the Drawing
### Ported from TrueVision3D v2.62.0, authored there the same day

**Overview**
- Sheets downloaded as `Na__<project>__<sheet name>__A2.pdf` - the app's name first, the
  drawing's number nowhere, and no revision or date, so two issues of the same sheet landed in
  a folder as the same file name. They now read:
      3047_T02_D01__FloorPlans__A2__RevB__17-Sep-2026__.pdf

**How**
- New `Na__LayoutEditor__PdfFilename__`, a leaf that fills the configured `Pdf FilenamePattern`
  from `{drawingCode} {drawingName} {paperSize} {revision} {date}`. Every token but the date is
  read through `Na__LeModel__GetFields`, so the file name and the drawing inside it cannot
  disagree about the number, the revision or the paper.
- `{drawingName}` comes from the sheet's tab name: the leading sheet number comes off (it is
  already in the code) and the words run together in PascalCase, each keeping its first
  character with the rest lower-cased - which is what makes `3D Images` read `3dImages`.
- `{projectCode}` and `{sheetName}` still answer, so a pattern configured before these tokens
  existed keeps working rather than emitting its braces into the file name.

# ---------------------------------------------------------
## ValeVision3D v2.54.1 - 17-Sep-2026 - Viewport Captions Stop Eating Their Own Scale
### Ported from TrueVision3D v2.61.1, authored there the same day

**Overview**
- Adam, on a TrueVision site plan: `LOCATION PLAN   1:12...`, with a clear centimetre of white
  paper after the ellipsis. Not a layout problem - the box was the right size and the text was
  truncated inside it.

**The bug**
- `BuildFrame` measured the caption, sized the box as `textMm + pad * 2`, then asked `FitText`
  whether the caption fitted `boxW - (pad * 2)`. In binary floating point
  `(textMm + 3.8) - 3.8` does not always give `textMm` back - it can land femtometres under -
  and `FitText`'s `<=` failed by that hair and chopped characters off the end.
- So whether a caption clipped had nothing to do with its length or the frame width. Sweeping
  the 420 captions this app can build for a plan, elevation, section or detail at every scale,
  **22 clipped** under ValeVision's own measurer, and every one of them lost the SCALE, because
  the scale is at the end of the string. `1:...` is worse than nothing: it still reads as a number.
- The fix stops rebuilding the width: the box was sized FOR this text, so `FitText` is handed
  `textMm` itself, making the test `textMm <= textMm`, which is exact. 22 -> 0.

**And a frame genuinely too narrow now sets smaller rather than truncating**
- The caption is an inset label and cannot grow past its frame, so `Na__LeChrome__FitCaptionFont`
  sets the type down to `Style FrameLabelMinFontMm` (1.6 mm) instead. The size solves in one
  step, then is verified by measurement rather than trusted.

# ---------------------------------------------------------
## ValeVision3D v2.54.0 - 17-Sep-2026 - The Title Block Says What Paper It Is, and Names Every Scale
### Ported from TrueVision3D v2.61.0, authored there the same day

**Overview**
- Adam: "there should be an awareness in the title block of the current page size, and this
  should say the scale at the page size" - `1:50 {{& other scales}} @ISO A2`.
- The cell said `1:50` and nothing about the paper, and where the viewports on a sheet disagreed
  it said `As shown`, which names none of them.

**Why the paper belongs in that cell**
- A scale is a statement about paper. `1:50` on A2 and `1:50` on A4 are different drawings, and
  the number alone is only true of the sheet it was plotted on. The cell now reads
  `1:50 @ ISO A2`, with the paper taken from the sheet's RESOLVED size, so a sheet with no size
  set names the default paper it will actually print on.
- A mix lists itself, finest first - `1:50 & 1:100 @ ISO A2` - so a reader is told which scales
  to look for. `As shown` is kept only past `Scales SheetLabelMaxScales` (3), where the list
  would be longer than the cell. A 3D-only sheet still reads `NTS @ ISO A3`.

**The cell was measured, not guessed**
- The Scale share of the strip went 20 -> 30, taken off Site Address, Drawing Title and Client.
  Measured with this app's own jsPDF and its measuring face: at 20 the longest label overran A4;
  at 30 the longest label the app can produce fits A4 through A1, and no other cell was pushed
  to where a realistic value truncates.

**Divergence from TrueVision**
- TrueVision's site plan scale list (1:500, 1:1250) has never been ported here, so this port
  keeps ValeVision's single scale list and its `Coerce`-only behaviour. `SheetLabel` is shaped to
  that: no `IsListed`, and an off-list denominator still coerces the way it always did.


# ---------------------------------------------------------
## ValeVision3D v2.54.0 - 17-Sep-2026 - The Progressive Renderer Stall, and the Scale Cell's Paper Size
### Ported from TrueVision3D v2.58.2 and v2.61.0

**The progressive renderer was rebuilding its buffer on every chunk**
- TrueVision's v2.58.2 said outright that "ValeVision carries exactly this bug", and it did:
  `Na__Refine__EnsureBuffer` compared the composer's raw buffer size against the
  supersampler's rounded one.
- `EffectComposer` sizes its buffers as `cssSize x pixelRatio` and stores the product
  unrounded, so on a display at 125% or 150% scaling - the normal case on a good monitor -
  the buffer comes out at something like 2498.75 x 1406.25. The supersampler rounds what it
  is given and reports the rounded size, so the two never matched: on EVERY chunk the
  accumulation buffer was torn down, the running total discarded with it, and the chunk drawn
  again from zero. It landed on the first chunk size every frame, for ever - the "stuck at 6
  out of 16" Adam hit in TrueVision, at a full chunk of GPU work per frame.
- `EnsureBuffer` now floors the buffer size before comparing and before creating. Floor, not
  round: WebGL takes texture sizes as integers and truncates, so the floor is the buffer that
  actually exists on the GPU, which makes the equality test exact AND the accumulation target
  the same pixel size as the frame it accumulates.
- It never reproduced in a harness because a harness runs at an integer buffer size.

**The title block's Scale cell names the paper, and lists a mix**
- `1:50` on A2 and `1:50` on A4 are different drawings, so the cell reads `1:50 @ ISO A2`.
  Where the viewports disagree it lists them finest first - `1:50 & 1:100 @ ISO A2` - instead
  of the old `As shown`, which named none of them; past `SheetLabelMaxScales` (3) the list is
  longer than the cell and the mixed label is quoted after all.
- The paper comes from the sheet's RESOLVED size (`Na__LeLayout__PaperSizeMm`), not the raw
  field, so a sheet with no size set names the paper it will actually print on.
- The Scale cell's share of the title block strip went 20 -> 30, taken off Site Address,
  Drawing Title and Client, matching TrueVision exactly.

**PORT NOTE - one deliberate divergence**
- TrueVision's `Na__LeScale__IsListed` consults its site plan scale list as well as the main
  one. ValeVision has no site plan scales, so its copy asks the one list. Everything else in
  `Na__LeScale__SheetLabel` and `Na__LeScale__PaperSuffix` is verbatim.

**Files**
- `05__RenderPipeline/Na__RenderEffect__ProgressiveRefine__.js` - `EnsureBuffer` floors the
  buffer size.
- `51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__ScaleManager__.js` -
  `IsListed` (adapted), `PaperSuffix`, `SheetLabel(denominators, paperLabel)`.
- `51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js` - resolves
  the paper and passes its Label.
- `51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__SheetSetup__.js`
  and `Na__LayoutEditor__AppConfig__.json` - the six `SheetLabel*` settings and the row widths.
- `51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__KeyMappings__.json` - the space
  bar's `Tool__SelectToggle` binding, re-applied after a regeneration dropped it.

**Verified** - every ValeVision module parses, every named import resolves, both config files
are valid JSON, and the space bar resolves to `Tool__SelectToggle` again.

# ---------------------------------------------------------
## ValeVision3D v2.53.0 - 17-Sep-2026 - Dimensions You Can Grab, Constrain, Type Into and Slide
### Ported from TrueVision3D v2.60.0, authored there the same day

**Overview**
- Adam, on the vertex work that landed in v2.58.0: "add the same behaviour to dragging a
  dimension end so you can constrain it" - then, on trying it: "clicking here to try and
  move the dimension points just doesn't work."
- He was right twice over. The grips were drawn and `DimensionGrabFor` answered `'end'`
  correctly for a press on one - but `Na__LeTools__Resolve` never got that far.

**Why a dimension's points could not be grabbed**
- `Resolve` asks the markup hit test what is under the pointer, and for a dimension that
  means its LINE and its VALUE. The measured points are at the far end of the extension
  lines - on PS01's D01, some 45 mm of paper away, because putting the line clear of what
  it measures is the entire purpose of an offset. So a press on a measured point found
  nothing at all, and with a container open, finding nothing means "the press landed
  outside, step back out". Clicking a grip closed the dimension instead of taking hold.
- `Na__LeTools__OpenDimensionGripAt` now looks for the open dimension's grips first, the
  way the rotate grip above it already did: both stand off the object they belong to, and
  neither can be found by asking what lies under the pointer. Only while that dimension is
  open, and never for `'whole'`, so a press on the line itself still resolves as before.

**A measured point constrains like a vertex**
- The arrow keys hold a dimension end to an axis, Shift holds it to the nearer one, and a
  snap supplies the coordinate ALONG the held axis rather than cancelling it. The band
  takes the locked axis's colour. Nothing new was invented: `Na__LayoutEditor__AxisLock__`
  has done this for the placing tools since v2.21.0 and now reaches three more drags.
- The same rule fixed Shift for a run of vertices. It was not that several points broke the
  constraint - it was that the snapped point used to win outright, and a run of vertices is
  dragged across far more geometry than one, so something was nearly always snapping and
  the axis was nearly always lost. `Na__LeAxis__Hold` is what that rule is called.

**Typing what the dimension should READ**
- Adam chose this over "how far the end moves", and the geometry rewards it: a horizontal
  dimension measures the x between its points and a vertical one the y, so a typed value
  sets that coordinate alone and leaves the other where the drag put it. Locking X on a
  horizontal dimension therefore holds the very coordinate the value sets, instead of
  fighting it. An aligned dimension runs its end along the line between the two points.
- Type 2500, see it should have been 2000, type that: every value is measured from the
  fixed end rather than from the last answer, and the run lasts until the tool changes.
  The measured points and the line stay exactly where they are.

**The line has a grip at each end now, and slides**
- Adam: "users will expect points here on the dimensions as well... this stretches the
  dimension line and the dimension text and slides it to a new position."
- All three grips on the line - both ends and the middle - change the OFFSET, carrying the
  line and the value across while the two measured points stay put. Reaching for the end of
  a dimension line to push it clear of something is the natural gesture, and the middle grip
  alone is often buried under the value.
- The Measurements box reads `Offset` while one is dragged and a typed distance sets it, at
  the scale the dimension reads at, keeping whichever side the drag chose. It retypes like
  everything else.

**Selection points you can actually see**
- Adam: "when you zoom in, the red vertices that show the selection are too small... they
  just disappear." They did, and the arithmetic says so exactly.
- Everything in the handles layer sits inside the paper's `scale(zoom)`, so one screen pixel
  is `1 / zoom`. The edge width read `Math.max(1, 1 / zoom)`, which put the floor in the
  WRONG UNITS: zoomed in, the clamp pinned the edge at one PAPER pixel, which is `zoom`
  pixels on screen. At 4x a 9 px grip carried a 4 px border on each side and a picked vertex
  was a white ring with no red left in it; at 8x the measured red width was **minus seven
  pixels**. The clamp only ever bit while zoomed in, which is exactly where grips are needed.
- `Na__LeGrips__EdgePx` replaces it, and the same mistake is fixed in the stem, the rubber
  box, the insert diamond, the viewport handles and the selection box. A picked grip is now
  drawn larger than a plain one as well (`GripSizePickedPx`, 13 against 9), since it marks
  the points the next drag will carry.
- Proved at five zooms: a picked grip is a constant 13 px box with a 1 px edge and 11 px of
  red, from 0.5x to 8x.

**Less white while a container is open**
- `EditScope FadeOpacity` 0.25 -> 0.45. Adam: "make the fade of everything else less
  extreme... it goes a bit too white currently."

**Fixed on the way past**
- `GetDimEndRetype` returned an OFFSET record to the span path, so the second value typed
  after sliding a line moved the dimension's end instead. Caught by a retype landing 1.8 mm
  off; it now ignores a record that is not a moved end.
- The dimension branch of `ApplyDrag` never called `Na__LeMeasure__Refresh`, so the box
  stayed asleep through a dimension drag however well the rest of it worked.

**Files**
- `Na__LayoutEditor__SheetTools__HitResolution__.js` - `OpenDimensionGripAt`, and `Resolve`
  asks it before the markup hit test.
- `Na__LayoutEditor__SheetTools__PointerDrag__.js` - the constraint on both dimension
  drags, `DimEndAtSpan`, `TypeDimensionSpan`, `TypeDimensionOffset`, their readings and
  retype records, `RerunDimEndDrag`.
- `Na__LayoutEditor__Grips__.js` - `EdgePx`, larger picked grips, a grip at each end of the
  dimension line and the grab to match.
- `Na__LayoutEditor__Measurements__.js` - `Length` for a dimension end, `Offset` for a line
  being slid, both retypable.
- `Na__LayoutEditor__SheetTools__State__.js`, `__ToolState__.js`, `__Keyboard__.js`,
  `__.js` - the shared retype records, the keys and the wiring.
- `Na__LayoutEditor__ViewportHandles__.js`, `Na__LayoutEditor__SelectionBox__.js` - the same
  edge-width mistake.
- `Na__LayoutEditor__AppConfig__.json` - `GripSizePickedPx`, `FadeOpacity`, the new labels.

**Verified** on PS01 D01 through the real pointer and key path, with every R2 write
blocked and nothing attempted: the grab, both axis locks, typed spans of 2500 / 1200 / 3000
landing exactly and the line staying put, typed offsets of 1500 / 800 / 2200 / 1250 with the
measured points never moving, Shift holding a two-vertex run to one axis, and the grip
arithmetic at five zooms. Every record restored to its original coordinates afterwards.

# ---------------------------------------------------------
## ValeVision3D v2.52.0 - 17-Sep-2026 - Container Editing, the Move Tool, and Editable Dimensions

### Changed
- **Ported from TrueVision3D v2.59.0**, authored there the same day out of Adam's two
  complaints: editing a vector was dangerous, because the vertex dots sat on every
  selected vector and a drag meant for a point moved the drawing behind it; and
  dimensions could not be edited at all, only deleted and redrawn.
- **New unit `51/30__System__SheetTools/Na__LayoutEditor__EditScope__.js`** - the
  context stack SketchUp has: a group, a vector or a dimension open for editing, and
  the points picked inside it. Double-click or Enter steps in, a click outside steps
  out, Escape closes everything.
- **While a container is open the rest of the sheet fades to 25 percent and stops
  answering presses**, and the contents of the container are redrawn at full strength
  in a new focus layer above the faded ones (`na-le-paper__focus`,
  `Na__LeMarkup__BuildItemPrimitives`).
- **Grips are a container's insides.** A vector's vertex dots and a dimension's four
  grips are drawn, and draggable, only while that object is open - and inside it they
  read at twice the tolerance, which is what makes a dimension's measured points
  grabbable rather than a game of pixels. A picked grip draws solid red.
- **A box drawn inside a vector takes its vertices**, not sheet items, and dragging one
  picked point carries them all.
- **The Move tool (M)** is now the only thing that translates a whole object. Select
  picks; grips, crop handles and viewport content editing are unchanged.
- **Escape is one key with one meaning: stop, and go back to Select.** It abandons what
  is half done, closes every container, drops the selection and arms Select.
- **Select is the resting state and there is no other.** A tool-less state was built
  first and taken out the same day: with nothing armed a press did nothing, so the
  browser took the click and offered its own copy and search menus over the paper.
- **The space bar picks Select, beside V** (from TrueVision3D v2.58.0, where it was a
  toggle; it now only arms). Both keys are always taken from the browser, which would
  otherwise scroll the sheet out from under the cursor, and every press the select path
  handles is taken from it too.
- The right-click menu belongs to the open container: a vector's points, a dimension's
  value, and the way out. Where the cut, extend, trim and join tools will sit.

### Fixed with it
- **Inside a container the arrow keys move nothing.** They are the axis lock in there;
  with no drag in flight they used to fall through to the nudge and walk the whole open
  vector or dimension, which also made the lock read as broken.
- **A typed length carries every picked point.** It took only the grabbed index, so a
  value typed over a boxed run of corners moved one and wrote the rest back to where
  they started. The retype record now keeps the original run of points, so a correction
  measures from where they began rather than stacking on the value before it.
- **A press near a corner grabs it rather than drawing a box.** Resolve asked the markup
  hit test first, which answers for the line only, so a press a couple of pixels off the
  line but dead on a corner found nothing, read as "outside", and started a selection box
  where the hand was trying to grab. `ScopeGrabAt` answers first, measured against the
  grips at `EditScope GrabRadiusPx` (14) - a fixed reach on screen at any zoom.
- **The top level keeps its move constraints.** A whole-object move - one item by its
  body, or a whole multi-item selection - locks to X or Y on the arrow keys and takes a
  typed distance in the Measurements box, the same pair a viewport frame already had.

### Divergence from TrueVision
- ValeVision's dimensions have no fixed-length extension lines, so the extracted
  `Na__LeMarkup__PushDimension` keeps ValeVision's own option shape (no `extension`).
  Everything else is verbatim.

### Files
- New: `51/30__System__SheetTools/Na__LayoutEditor__EditScope__.js`
- `51/30__System__SheetTools/`: `SheetTools__State__` 1.1.0, `SheetTools__ToolState__`
  1.1.0, `Grips__` 1.7.0, `SheetTools__HitResolution__` 1.1.0, `SelectionBox__` 1.4.0,
  `SheetTools__PointerPress__` 1.1.0, `SheetTools__PointerDrag__` 1.1.0,
  `SheetTools__Keyboard__` 1.1.0, `SheetTools__ContextMenu__` 1.1.0, `SheetTools__` 1.25.0
- `51/10__Core__SheetSurface/`: `SheetSurface__` 1.5.0, `Styles__Main__Paper__.css`
- `51/15__Core__Markup/Na__LayoutEditor__MarkupBridge__.js` 1.10.0
- `51/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js` 1.8.0
- `51/03__Core__Config/`: `AppConfig__.json` (EditScope block, wording),
  `KeyMappings__.json` (space picks Select, M is Move), `ConfigState__ToolSetup__`,
  `ConfigState__`

# ---------------------------------------------------------
## ValeVision3D v2.51.0 - 17-Sep-2026 - Match Properties to a Whole Selection, and One Markup Panel Open at a Time

### Changed
- **Ported from TrueVision3D v2.57.0**, which came out of Adam reporting that
  leaders could not be match-propertied. The eyedropper turned out to be doing
  its job; what was wrong was that Text, Leaders, Dimensions and Vectors all
  sat open at once, each with its own size box, colour picker and weight. Four
  "Text mm"-shaped fields in one column, and only one of them belonging to the
  selected item - the other three quietly setting the defaults for new objects.
- **One markup panel at a time.** Selecting anything on the sheet opens that
  kind's section and folds the other three; picking a style with the eyedropper
  does the same, so what is on show is always what is being matched. A mixed
  selection opens nothing, because there is no single answer to what would be
  edited; groups are opened up first, so windowing a grouped block of notes
  still lands on the right panel. Several can still be opened by hand to compare
  one kind's text size against another's, and the next selection tidies them
  away.
- **Paste properties to N selected**, on the context menu of a multi-selection
  and of a group. The count is what will actually change: the items are expanded
  past any group, then the source itself, the other kinds and the locked drop
  out, and the item does not appear when the answer is none. A group whose
  members are all one kind hands out a style as well as taking one.
- **The panels write the whole selection.** Select nine dimensions, change the
  text size, and all nine change - one undo step - where before the panel showed
  the settings for new objects and wrote nothing. It goes through the
  eyedropper's trait table, so a panel field travels by exactly the declaration
  the eyedropper copies by, and content cannot travel with style: a text item's
  words, a dimension's override and a leader's specification link stay where
  they are, and a leader's type is palette-only so a note never becomes a bubble.
- `LayoutEditor__Panels__CollapseOthersOnOpen`, declared in the first panel host
  and never wired to anything in either tree, now folds the others when one
  section is opened by hand.

### Divergences from the TrueVision change
- This tree's eyedropper has no `absent` trait flag and no extension-line or
  `Viewport__ShowFrame` traits, so its dimension style is seven keys where
  TrueVision's is ten. Nothing in this port depends on those, and the module
  numbering stays one behind (1.7.0 here is TrueVision's 1.8.0).
- The Vectors panel has no Draw at Scale row and the Dimensions panel no
  extension-line pair, so those two edits were dropped.

### Files
- `51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__Eyedropper__.js` 1.7.0
  - `ApplyMany`, `PaintMany`, `PaintableIn`, `StyleKeys`, `StyleOnly`.
- `51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__ContextMenu__.js` 1.1.0
- `51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__PanelHost__.js` 1.3.0
  - `SetFolded`, `FocusSection`, `SelectedOfKind`, `ApplyToSelection`.
- `51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js` 1.16.0
  - `SectionForKind`, `FocusPanelFor`, `FocusPanelForSelection`.
- `51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__Text__.js` 1.4.0
- `51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__Dimensions__.js` 1.4.0
- `51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__Shapes__.js` 1.8.0
- `51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__Leaders__.js` 1.2.0
- `51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__EditorSetup__.js`
  - `accordion` and `focusOnSelect` on the panel setup.
- `51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json`
  - `AccordionSections`, `FocusSectionOnSelect` and the note describing both.

### Testing
- Every file syntax-checked, and the app booted with the new API present and the
  panel setup reading `accordion` and `focusOnSelect` correctly.
- **The behaviour itself has not been exercised in this tree.** It was proved end
  to end in TrueVision on PS01's D01 sheet - the accordion on selection, four
  bubbles pasted in one click with one undo, three leaders restyled from the
  panel, and the single-selection and defaults paths unchanged. Adam is testing
  this side.

# ---------------------------------------------------------
## ValeVision3D v2.50.1 - 16-Sep-2026 - Carousel Holds Opaque Longer on First Reveal

### Changed
- **The carousel's first reveal after the loading screen now holds fully
  opaque for 4 seconds** (`InitialRevealHoldMs`) instead of the usual 2.6s
  wake hold used for ordinary interactions. A user arriving straight off the
  loading screen gets a clear, unmissable look at the carousel before it
  settles into its 50% idle translucency. Every other wake (clicks, taps,
  scrolling, the scene camera flight) still uses the shorter 2.6s hold.
- Ported identically to TrueVision3D.

### Files
- `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__UI__SceneCarousel.js`
  - `FlashCarouselWake` and `ToggleSceneCarousel` take an optional hold
    override; the `na-presentation-mode-scenes-loaded` handler passes the
    new 4000ms constant.

# ---------------------------------------------------------
## ValeVision3D v2.50.0 - 16-Sep-2026 - Views Button Retired, Carousel Always Shows With Idle Fade

### Changed
- **Removed the Views button from the navigation toolbar.** It only toggled
  the saved-scene carousel and shared the Reset View icon (no icon of its own
  existed). Every project writer already set
  `PresentationMode__SavedCameraScenes__ShowCarouselByDefault: true`
  regardless, so the button was never actually needed to reveal the carousel
  for real project data - it was one more thing that could go stale.
- **The carousel now always shows itself whenever the loaded project has
  valid saved scenes**, ignoring that flag entirely (matching TrueVision3D,
  which has never had a toggle). It still hides when scenes are cleared, and
  Video Studio can still hide/restore it while its timeline owns the bottom
  of the screen.
- **Ported TrueVision3D's carousel idle-fade and wake-flash verbatim.** The
  carousel now rests at 50% opacity like the toolbar and Tools & Settings
  menu, waking on hover, keyboard focus, or a JS flash (`na-pm-carousel--wake`)
  that covers taps, swipes and the scene camera flight before fading back out.
  Previously the carousel had no idle-fade at all and stayed permanently
  opaque.
- **Tightened the mobile-swap `max-aspect-ratio` breakpoint from ~1.03:1 to
  19/20 (0.95:1)** in both the toolbar and Tools & Settings dropdown CSS
  (v2.49.1's fix). Removing the Views button narrows the centred pill enough
  that the toolbar/dropdown collision now only shows up on genuinely
  portrait-leaning windows, not merely square ones. Mirrored the same value
  into TrueVision3D so both apps share one threshold.

### Removed
- Dead references to `naNavToolbarViewsBtn`: the Video Studio timeline's
  disable/restore-title code and the `body.na-video-studio-timeline-active
  #naNavToolbarViewsBtn` CSS rule (`Na__VideoStudio__Timeline__Controls.js`,
  `Na__VideoStudio__Timeline__Stylesheet__.css`).
- The orphaned `na-presentation-carousel-toggle` / `na-presentation-views-btn-state`
  custom events (no producer/consumer once the button was gone).

### Files
- `index.html` - Views button markup and its wiring block removed.
- `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__UI__SceneCarousel.js`
  - always-show logic, wake-flash (`FlashCarouselWake`), interaction listeners.
- `02__Src__AppModules/31__System__VideoStudio/Na__VideoStudio__Timeline__Controls.js`
  and its stylesheet - dead Views-button code removed.
- `03__Style__AppStylesheets/Na__PresentationMode__Styles__SceneCarousel__.css`
  - idle-fade region added for `.na-pm-carousel`.
- `03__Style__AppStylesheets/Na__UiFeature__Styles__NavigationToolbar__.css`,
  `Na__UiFeature__Styles__DropdownAndToast__.css` - breakpoint tightened.

# ---------------------------------------------------------
## ValeVision3D v2.49.1 - 16-Sep-2026 - Mobile Nav Swap: Also Trigger on Near-Square/Portrait Windows

### Fixed
- **The v2.49.0 swap only fired under 768px wide, but the toolbar/dropdown
  collision also shows up on windows well over that width once they get short
  or square** - e.g. a resized desktop browser or the SketchUp webview at
  ~1345x1309 (~1.03:1). The centred nav pill (especially with the Views button
  showing) can reach far enough across at that width to run into the
  top-right Tools & Settings dropdown, which max-width alone never catches.

### Changed
- **The mobile menu swap in both `Na__UiFeature__Styles__NavigationToolbar__.css`
  and `Na__UiFeature__Styles__DropdownAndToast__.css` now triggers on
  `(max-width: 768px), (max-aspect-ratio: 103/100)`** - an OR of the original
  width rule and a new aspect-ratio rule (~1.03:1, rounded from the 1345x1309
  reference case). Either condition alone is enough to swap the toolbar for
  the Tools & Settings menu, so a window that is wide but short/square gets
  the same treatment as a narrow phone.
- **Ported the identical breakpoint change to TrueVision3D**, since it shares
  the exact same swap mechanism and was ported from there originally.

# ---------------------------------------------------------
## ValeVision3D v2.49.0 - 16-Sep-2026 - Mobile Nav: Toolbar and Tools Menu Swap Instead of Overlap

### Fixed
- **The bottom navigation pill and the top-right Tools & Settings dropdown had
  no coordination on a narrow phone screen.** The dropdown carried no mobile
  treatment at all, so on portrait viewports the two menus were simply two
  independent floating widgets competing for a screen too narrow for both.

### Changed
- **Ported TrueVision3D's mobile menu swap verbatim (v2.9.0, 29-Aug-2026).** At
  <=768px the standalone Tools & Settings trigger is hidden and the bottom nav
  toolbar gains a vertical divider + hamburger button instead. Pressing it adds
  `body.na-mobile-tools-open`, which hides the toolbar and drops the Tools &
  Settings menu into the same top-right area; folding the menu back up (by any
  path - its own summary, the boot teaser, or a menu item closing it) restores
  the toolbar via a single `toggle` listener on `#naToolsMenu`. Because only one
  of the two is ever visible, the old overlap cannot occur.
- **The boot "teaser" auto-open of the Tools menu is skipped while the menu is
  swapped out behind the hamburger** (checks `getComputedStyle(...).display`),
  matching TrueVision's guard.

### Files
- `index.html` - hamburger + divider markup on `#naNavToolbar`; teaser guard.
- `02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__NavigationToolbar__Controls.js`
  - swap wiring (`Na__NavToolbar__HandleMenuClick`, toggle listener).
- `03__Style__AppStylesheets/Na__UiFeature__Styles__NavigationToolbar__.css`
  - divider/hamburger styling, `<=768px` reveal + toolbar hide.
- `03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css`
  - `<=768px` hide/swap-in rule for the dropdown (Dev Tools menu excluded).

# ---------------------------------------------------------
## ValeVision3D v2.48.1 - 16-Sep-2026 - Progressive Renderer: Zoom and Scene Changes Refine Too

### Fixed
- **Zooming left the viewport stuck on "Waiting" and never sharpened.** The wheel
  moves the camera and asks for a single frame. The settle test needed to see two
  still frames in a row before it would start, so on that one frame it saw the
  camera had moved, stood down, and the render loop stopped with nothing
  scheduled to bring a second frame. The viewport sat unrefined until something
  else happened to ask for a redraw.
- **Changing animation scenes did the same thing**, for the same reason: a scene
  transition ends by asking for "one final clean frame", and one frame was never
  enough for a test that needed two.
- **Panning worked throughout only by accident.** It fires three trailing settle
  frames after the mouse is released, which happened to hand the old test the
  second look it needed. Nothing else in the app does that.

### Changed
- **The settle test now remembers when the camera last MOVED, rather than how
  long it has been still.** A timestamp can be compared after a gap of any
  length, so the frame that wakes at the end of the debounce compares the camera
  against a snapshot taken before the silence, finds it unmoved, and refines on
  that same frame. Zoom, scene changes, a jump to a saved view, a lens change and
  anything else that redraws once now all settle into a refinement.
- **The refiner asks for the frame it needs**, since the loop would otherwise
  stop. It answers no whenever the frame was never its to refine: a 2D sheet
  owning the viewport, the engine held by another system, the tab in the
  background. Without that guard a resting app would be woken every debounce for
  ever, which would be a considerably worse bug than the one being fixed.
- **A couple of milliseconds of slack on the debounce comparison.** The wake is a
  timer for the remaining debounce and the frame arrives at the next animation
  frame after it; both round and jitter, so a wake armed for 149ms could produce
  a frame measuring 149ms elapsed and miss a 150ms threshold by a hair, costing a
  whole extra wake-up to gain one millisecond.

### Notes
- Nothing about the sample count, the chunk sizing, the milestones or the cost
  while moving has changed. This is the trigger only.
- Walk and Fly were never affected: they hold the loop open, so their frames kept
  arriving and the old test always got its second look.

### Files
- `05__RenderPipeline/Na__RenderEffect__ProgressiveRefine__.js` 1.0.1: the
  timestamp test, the blocked state and `suspend()`.
- `01__AppCore/Na__AppFlow__LoadingSequence.js`: the three stand-down points (2D
  sheet, engine pause, tab hidden) call `suspend()` rather than `reset()`.
- `Whitecardopedia__Pwa__ServiceWorker__Logic__.js` 1.0.10: token bumped
  (2026-09-16-2).

# ---------------------------------------------------------
## ValeVision3D v2.48.0 - 16-Sep-2026 - Progressive Renderer: the Viewport Sharpens Itself to 16x Once the Camera Stops

### Added
- **Progressive refinement of the live 3D viewport, on both engines.** While the
  camera moves, nothing changes: the render loop draws exactly the frame it drew
  before, FXAA included, at exactly the same frame rate. Once the camera has held
  still for 150ms the loop keeps going instead of idling and redraws the same
  frame with sub-pixel jitter, averaging the results, until the viewport holds a
  full 16-sample supersampled image. The same maths the video exporter has used
  since v2.21.19, spent in the time the viewport was previously doing nothing.
- **What it fixes.** A glazing bar thinner than a pixel is a coin toss between
  full black and full white, so it draws as a dashed line rather than a thin one,
  and the dentils under a cornice read as speckle. That is not stair-stepping, it
  is the pixel having no way to say "a third covered". Sixteen samples give it
  one. The lower the screen resolution the worse the breakup, so a colleague on a
  1080p screen gains far more from this than a 4K machine does.
- **Visual Effects section** in Tools and Settings, under App Settings, folded by
  default: Progressive Renderer, Profile Lines and Ambient Occlusion (SSAO) as
  indicator rows, plus a frame rate readout and a refinement readout showing how
  far the settled picture has got. The rows read the passes themselves rather
  than remembering what was last clicked, so the Dev Tools profile-lines toggle
  and the SSAO performance monitor cannot leave a badge lying. A pass the active
  engine does not have reads as a dimmed N/A row (SSAO under PureEngine).

### Changed
- **`Na__RenderEffect__Supersampler__.js` 1.1.0: `present()` takes an optional
  scale.** Samples accumulate at 1/N, so a part-finished total needs multiplying
  by N/k to show correctly rather than appearing as a dim frame filling up. The
  argument defaults to 1, so the video and image exporters are byte-for-byte
  unchanged. This one needs porting to TrueVision's copy of the file.
- **`Na__RenderPipeline__MaxEngine__Setup.js` 1.0.2** exposes `aoPassRef` so a
  readout can show whether SSAO is actually on. The performance monitor disables
  it without telling anyone.
- **The render loop's per-frame work is now two named functions** rather than one
  inline block: the effect chain (AO uniforms, depth pre-pass, profile normals,
  composer) and the section overlay. A refinement sample runs the first through a
  nudged projection and the second through the settled one.

### Notes
- **Samples are spread over frames, in chunks, and every frame presents.** Sixteen
  renders inside one frame would block the main thread for a third of a second on
  a laptop with SSAO at 4K and swallow the first click after the camera stops.
  The chunk is sized from the measured frame time against a 100ms budget and
  always stops on a milestone (8, then 16), so a fast machine does 8 and then 8
  as two visible steps and a slow one takes smaller steps and still lands exactly
  on eight and sixteen.
- **Why every frame must draw.** `preserveDrawingBuffer` is off on the live
  renderer, so a frame that runs and draws nothing composites an empty buffer and
  the viewport flashes. A chunk therefore always ends with a present, and a
  converged frame in walk or fly (where the loop is held open to poll the
  keyboard) re-presents the finished average rather than skipping: one full
  screen quad in place of the whole effect chain, so standing still in walk mode
  is now cheaper than it was, not dearer.
- **Stillness is measured, not announced.** The obvious hook would be "the loop
  wants to stop", but walk and fly never stop, so standing still in walk mode
  would never refine. The camera's position, orientation and projection are
  compared frame to frame instead, which covers orbit, pan, zoom, walk, fly, a
  lens change, the vertical correction shear and a jump to a saved view. Geometry
  moving while the camera is still (a door swinging, the video timeline playing)
  is invisible to that test and is passed in separately.
- **The composer is borrowed one frame at a time.** Supersampling needs the
  composer to stop drawing to the canvas and FXAA to stand aside. Both are set at
  the top of a chunk and put back at the bottom of the same frame, never held
  across frames, so a still export, a video export or a Layout Editor snapshot
  starting between frames always finds the pipeline in its ordinary state.
- **Shadow maps are drawn by the first sample and frozen for the rest of a
  burst.** The jitter moves the view camera; the lights and the geometry are not
  moving at all.
- **Memory.** One half-float RGBA buffer at the composer's size: about 66MB at
  3840x2160, about 17MB at 1920x1080. Allocated the first time the camera sits
  still, rebuilt automatically when the size stops matching (a window resize, a
  live engine switch), and handed straight back if the feature is switched off.
- **Scope.** The 3D viewport only. The 2D drawing views run through their own
  composer preset and are excluded, as is the legacy 2D elevation camera. Image
  and video export are untouched: they supersample in one synchronous block and
  always did.
- **TrueVision takes this next**, once tested here.

### Files
- `05__RenderPipeline/Na__RenderEffect__ProgressiveRefine__.js` 1.0.0 (new): the
  accumulator, the stillness test, the debounce and the chunk planner.
- `05__RenderPipeline/Na__UiFeature__VisualEffects__Controls.js` 1.0.0 (new): the
  settings section and its readouts.
- `05__RenderPipeline/Na__RenderEffect__Supersampler__.js` 1.1.0: `present` scale.
- `05__RenderPipeline/02__Engine__MaxEngine/Na__RenderPipeline__MaxEngine__Setup.js` 1.0.2: `aoPassRef`.
- `01__AppCore/Na__AppFlow__LoadingSequence.js`: the render loop branch, the two
  extracted per-frame functions, the settle wake-up and the reset hooks.
- `70__System__DevTools/Na__UiFeature__ProfileLines__Controls.js` 1.2.0: the two
  profile-lines rows follow each other on `na-profile-lines-changed`.
- `02__AppData/Na__AppConfig__Main.json`: `RenderEffect__ProgressiveRefine`.
- `index.html`: the config read, the Visual Effects markup and the init call.
- `03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css`: the
  unavailable row state and the readout rows.
- `Whitecardopedia__Pwa__ServiceWorker__Logic__.js` 1.0.9: token bumped
  (2026-09-16-1) for the two new modules and the changed shell files.

# ---------------------------------------------------------
## ValeVision3D v2.47.1 - 15-Sep-2026 - Console Tidy-Ups: Shadow Map Type and Sharpen Readbacks

### Fixed
- **"PCFSoftShadowMap has been deprecated" on every load.** index.html asked the
  renderer for `PCFSoftShadowMap`, which three r184 deprecates: it drew
  `PCFShadowMap` in its place and said so in the console. It now asks for
  `PCFShadowMap`, so the shadows are exactly what they were.
- **Fewer "Multiple readback operations using getImageData" hints.** The High
  Pass Sharpen effect reads its source and blurred buffers back on every strip.
  Both buffers are now created with `willReadFrequently`, so each read is a copy
  in memory rather than a readback from the graphics card. TrueVision's sharpen
  already created its blur canvas that way.

### Notes
- **One hint can remain per 3D viewport picture** with Enhance Whitecard on. The
  tiled renderer draws the picture, checks one pixel of its canvas and hands it
  on; Levels and Sharpen then read that canvas again. It stays GPU-backed on
  purpose: the tiler composites every tile into it, image exports use the same
  path, and flagging it would slow every render to silence a hint.
- For those two buffers the blur now runs on the processor rather than the
  graphics card. A strip is at most about 4 MP and the radius is small; a pixel
  may round one level differently from before, which a sharpened picture hides.
- TrueVision takes the shadow map line in v2.55.0; its readbacks need nothing.

### Files
- `index.html` (the shadow map type).
- `30__System__ImageExport/Na__ImageExport__PostProcessEffects__HighPassSharpen.js` (the two buffers).
- `Whitecardopedia__Pwa__ServiceWorker__Logic__.js` 1.0.8: the note only; the token bumped for v2.47.0 covers this.

# ---------------------------------------------------------
## ValeVision3D v2.47.0 - 15-Sep-2026 - Layout Editor Sorted Into Numbered Subfolders

### Changed
- **Folder 51 is sorted into numbered subfolders.** `51__System__LayoutEditor`
  had grown to 126 files in one folder. Each file now sits in a subfolder
  numbered the way `02__Src__AppModules` is: what the editor cannot start
  without comes first, then its systems, then the panels, the features and
  the Dev tools, with gaps left between the numbers for later.

| Folder | Holds |
|---|---|
| `01__Core__Loader` | Loader, LoadingScreen, Styles__Boot |
| `03__Core__Config` | ConfigState and its units, the AppConfig and KeyMappings JSON |
| `05__Core__ModeController` | ModeController, TabStrip |
| `07__Core__SheetData` | SheetModel and its units, SheetRecords, SheetLayout, ScaleManager, DrawingScale, History, AutoSave, Assets |
| `10__Core__SheetSurface` | SheetSurface, SheetChrome, TitleBlock__Classic, TitleBlock__Modern, Navigation, Controls__Pc, Controls__TouchScreen, Styles__Main |
| `15__Core__Markup` | MarkupBridge, DimensionGeometry, LeaderGeometry, ShapeGeometry, Groups, MeasureParse |
| `20__System__Viewports` | Viewport2d and its units, Viewport3d, Viewport3dZoom, ViewportHandles, ViewportClipboard, ForceRender, RasterQuality |
| `25__System__RenderStyles` | SnapshotRenderer, Enhance, EdgeStyles, RenderComposites, ModelLayers, and their config JSON |
| `30__System__SheetTools` | SheetTools and its units, SelectionBox, SelectionSet, Grips, Snapping, AxisLock, ContextMenu, ItemClipboard, Eyedropper, Measurements |
| `35__System__DrawingTools` | TextTool, DimensionTool, LeaderTool, ShapeTool, RectangleTool, GradientTool, LineStyleTool, and their config JSON |
| `40__Ui__Panels` | PanelHost, Toolbar, the nine Panel__ modules, Styles__Panels |
| `50__Feature__Specification` | SpecData and SpecEditor and their units, SpecDocument, SpecLinks, SpecMargin, MarginGrip, Panel__MarginNotes, Styles__Specification |
| `55__Feature__Scrapbook` | TrueVision only (Scrapbook); not created here |
| `60__Feature__PdfExport` | PdfExporter |
| `70__DevTools__DevMenu` | DevMenu__Controls |

- **Nothing is renamed.** Every file keeps its name, namespace and exports;
  only its folder changed, and every relative path that reaches it changed
  with it: 464 inside the folder (imports, dynamic imports, `@delegate` notes
  and the loader's stylesheet addresses) and three files outside it
  (index.html, the CSS index and `Na__DrawView__RenameDrawing__`). Each config
  JSON sits beside the module that fetches it, so those addresses read the
  same.
- **Eight files over 1000 lines are split into units** (over 1000 in either
  app; TrueVision gets the same splits, so a port still copies file for
  file). The original keeps its name and every export and re-exports its
  units, so no caller changed. A unit that writes shared state does it
  through accessor functions in its State unit, because an imported binding
  cannot be assigned. Nothing in the folder is over 1000 lines now; the
  longest is Eyedropper at 924.

| Original, lines before (ValeVision / TrueVision) | Now | Units, lines |
|---|---|---|
| `SheetTools` 1.24.0 (2005 / 2138) | 529 | State 153, ToolState 347, HitResolution 320, ContentEditing 129, PointerPress 388, PointerDrag 554, Keyboard 375, ContextMenu 289 |
| `SheetModel` 1.16.0 (1580 / 1801) | 555 | State 184, Sheets 284, Layers 196, DrawOrder 153, Viewports 296, TextAndDimensions 268, Shapes 191, Leaders 168, Groups 228 |
| `SpecData` 1.2.0 (1271 / 1318) | 283 | State 285, Document 395, Editing 393, Draft 194, Transport 461 |
| `SpecEditor` 1.2.0 (1231 / 1230) | 321 | State 170, Builders 183, Bar 253, Notes 253, Render 256, NoteDrag 210, Actions 358 |
| `ConfigState` 1.15.0 (1222 / 1348) | 367 | Readers 143, KeyMap 416, SheetSetup 331, ToolSetup 302, EditorSetup 192 |
| `Styles__Specification.css` (1024 / 1023) | 424 | Notes 352, Read 270 |
| `Styles__Main.css` (943 / 1116) | 362 | Paper 593 |
| `Viewport2d` 1.7.0 (835 / 1141) | 399 | Window 135, Frame 265, Linework 376 |

### Fixed
- **A selected leader got no selection box.** Every other selected item gets
  a dashed box round it, but the leader's line in MarkupBridge still expected
  a single selected item and wrote to a variable that no longer exists, so
  the box was never drawn (its grips still showed). It had been that way
  since box select arrived (MarkupBridge 1.5.0, 14-Sep-2026) and was found by
  the lint run over the whole folder for this change. The line now matches
  TrueVision's.

### Notes
- **Start-up is unchanged:** 346 JS modules (7,663 KB), of which the Layout
  Editor's are still only the loader and its loading screen (2 files,
  49 KB), and 28 stylesheets, of which Styles__Boot is the editor's only one.
- **Service worker token** bumped to 2026-09-15-2 (logic 1.0.8). Module URLs
  changed, and a deployed origin could otherwise answer index.html, the CSS
  index or RenameDrawing from its old cache. The bump also covers v2.45.1 and
  v2.46.0, which did not make one.
- **Git:** plain file moves; nothing was staged. git status shows the 83
  files git tracked in the folder as deleted and all 126 in the subfolders as
  untracked, so `git add` the folder before committing (`git commit -a` alone
  would record only the deletions).
- **TrueVision is next** (Task 04): the same folders and the same splits in
  its folder 51, still flat at 90 files. Its extra files already have a
  place: ModelSource, PlanDoors and ViewportSnapMove in `20__`, Scrapbook and
  its panel in `55__`, PdfFonts in `60__`.
- **Verified statically:** ESLint (no-undef, no-import-assign,
  no-unused-vars) over all 112 modules reports what it did before the move,
  less the leader fix (three old unused-variable warnings remain); the
  module graph walk (477 modules) and the named-export check (375 files)
  pass; every `new URL` target, CSS index import and dynamic import
  resolves; the static import cycles are the same two groups as before the
  splits; each split was checked unit by unit for code moved verbatim and
  every export kept. Not run in a browser: Adam tests.

### Files
- 126 files moved into 14 subfolders of `51__System__LayoutEditor`, among
  them 40 new units: `ConfigState__*` (5), `SheetModel__*` (9),
  `SheetTools__*` (8), `SpecData__*` (5), `SpecEditor__*` (7),
  `Viewport2d__*` (3), `Styles__Main__Paper__.css`,
  `Styles__Specification__Notes__.css` and `Styles__Specification__Read__.css`.
- `Na__LayoutEditor__MarkupBridge__.js` 1.9.1.
- Paths only: `index.html`, `03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css`,
  `42__System__DrawingViewCore/Na__DrawView__RenameDrawing__.js`.
- `Whitecardopedia/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js` 1.0.8.

# ---------------------------------------------------------
## ValeVision3D v2.46.0 - 15-Sep-2026 - Plan and Elevation Thumbnails Bake Themselves

### Fixed
- **Seeded and added drawings showed broken carousel pictures.** A plan or
  elevation card is created with the conventional thumbnail path
  (PresentationMode/Thumbnails/<scene id>.webp), but nothing rendered that
  picture unless someone previewed the drawing and pressed Save Thumbnail.
  Seed N / E / S / W on Harris Scheme-02 left Scene_005 to Scene_008 pointing
  at four files that were never written, so the carousel showed four broken
  images.

### Added
- **New drawings bake their own thumbnails.** Seed N / E / S / W, Pick Face,
  + Add Elevation, Seed From Model Storeys, + Add Ground Floor Plan, + Add
  Floor Plan, and creating a card for a row that has none, all queue the new
  cards for a bake. For each drawing the bake opens it as Preview does,
  records its framing (the thumbnail is the framing), captures the viewport
  and uploads it R2-first with the local mirror. A seed's drawings share one
  run: the first flies in, the rest flip in a frame.
- **Bake Missing Thumbnails**, in the Floor Plans and Elevations sections,
  bakes every card whose picture does not load, and leaves a thumbnail framed
  by hand with Save Thumbnail alone.
- **During a run** the full-screen overlay reads "Baking thumbnail 2 of 4" with
  the drawing's name, then how many baked and whether the save worked.
  Afterwards the view goes back where it was: the drawing that was
  previewing, or the 3D camera and its orbit target exactly. Save Elevations
  or Save Floor Plans runs once, and the carousel reloads every card.

### Notes
- New shared module `Na__DrawView__ThumbnailBake__` (folder 42). It knows
  neither mode controller: each editor hands it an adapter (open, showing,
  active, leave, record framing).
- The carousel still shows a broken image when a picture is missing, by
  choice: it makes a missing picture obvious while authoring.
- A single + Add bakes straight away too, so a drawing re-aimed afterwards
  keeps its first picture until Save Thumbnail replaces it.
- If a drawing of the other kind was previewing when a run starts, the run
  ends in 3D at that drawing's approach pose rather than back on it.
- After Pick Face the bake hides the plane gizmo; moving the plane or
  re-picking shows it again.
- **Verified statically:** ESLint no-undef and no-unused-vars are clean on the
  three modules, both label configs parse, and the module graph walk and the
  named-export check pass (338 files). Not run in a browser: Adam tests.

### Files
- New: `42__System__DrawingViewCore/Na__DrawView__ThumbnailBake__.js` 1.0.0.
- `Na__Elevation__DevMenu__Editor__.js` 1.2.0,
  `Na__FloorPlan__DevMenu__Editor__.js` 1.2.0, and `BakeThumbnailsLabel` in
  `Na__Elevation__AppConfig__.json` and `Na__FloorPlan__AppConfig__.json`.

# ---------------------------------------------------------
## ValeVision3D v2.45.1 - 15-Sep-2026 - Fix: New Plans and Elevations Missing From Add Viewport

### Fixed
- **Plans, elevations and scenes added after a sheet was first opened never
  appeared in the Viewport panel's Scene list** (the one above Add Viewport).
  The list was filled when the sheet's panels were built and only refilled
  while it held a single option, so once a project's first scenes were in it
  the list stayed as it was until the page reloaded. On Harris Scheme-02 it
  kept the four Exterior 3D Views and never showed the four elevations
  (Scene_005 to Scene_008, Elevations group), although their records and
  scene cards were saved. The list is now rebuilt on every panel refresh,
  keeping the scene already chosen, and left alone while it has focus.
- **The Viewport panel follows scene changes while a sheet is open.** A scene
  broadcast (a card added, renamed, regrouped or removed) refreshes it.

### Notes
- Not caused by v2.45.0: the one-time fill dates from the panel's first
  version (v2.21.0). TrueVision's panel has the same line; recorded in the
  parity ledger as a pending back-port.
- Plans and elevations filed in a scene group that is switched off still
  appear, at the end of the list without a group name, as before.

### Files
- `Na__LayoutEditor__Panel__ViewportSettings__.js` 1.4.1,
  `Na__LayoutEditor__ModeController__.js` 1.15.1.

# ---------------------------------------------------------
## ValeVision3D v2.45.0 - 15-Sep-2026 - Layout Editor Loads on First Use, Behind a Loading Screen

### Changed
- **The Layout Editor is off the start-up path.** index.html imported the mode
  controller, the tab strip and the Dev section, and through them the whole
  editor, for every project, drawings or not. Start-up now imports only the
  new loader and its loading screen:
  - JS modules at start-up: 417 files (9.5 MB) before, 345 files (7.6 MB) now.
    The Layout Editor's share: 73 files (1.9 MB) before, 2 files (48 KB) now.
  - Stylesheets at start-up: 30 (442 KB) before, 28 (345 KB) now. The Layout
    Editor's share: 104 KB before, 7 KB now.
- **When it loads.** The tab strip module arrives only when the project's
  Layout Mode switch is on AND the project has a sheet. The editor itself (its
  modules, its three stylesheets and its configs) arrives the first time
  something needs it: a sheet tab, the + tab, a tab rename or drag, or a Dev
  section action. The Dev section module arrives the first time its toggle is
  clicked.
- **One availability rule, everywhere.** Tabs show only while Layout Mode is
  on and the project has at least one sheet, on localhost and on the live
  site. The live site used to show tabs whenever a project had sheets; it now
  needs the switch as well. Localhost used to show the strip (3D Model and +)
  with no sheets; a project's first sheet now comes from New Sheet in Dev
  Tools > Layout Editor.
- **Dev Tools > Layout Editor looks and works as before.** The switch and Save
  Sheets never load the editor; Open, New Sheet, Duplicate, Delete and Bake
  load it first. Delete asks before it loads, so a cancelled delete loads
  nothing. The Layout Mode wording follows the new rule.

### Added
- **Loading screen.** The ValeVision start-up screen again, full screen: the
  same white overlay, Vale blue spinner and fade, built from the start-up
  screen's own classes. It reads "Loading Layout Editor..." with a status line
  (Fetching the drawing tools, then Reading the drawing settings) and hides
  once the sheet has painted. If a file fails to load it shows the reason with
  Reload Page and Back to 3D Model.

### Notes
- **The drawing system is unchanged**, only how it loads. The tab strip and
  the Dev section reach the editor through the loader (`Na__LeLoad__*`), which
  answers from the raw drawings block until the editor has loaded and calls
  the real modules after.
- **A late start is caught up.** Once the editor has initialised, the loader
  announces the sheet model's project load once more, so an unsaved browser
  draft is still put back (its toast now appears when the editor first opens,
  not when the page loads), history takes its baseline and bubble codes
  propagate.
- **Drawing renames.** `Na__DrawView__RenameDrawing__` imported Viewport3d
  directly, and that one import put the whole editor into start-up. The
  re-stamp now goes through the loader: renaming a scene that a sheet viewport
  holds a baked snapshot of loads the editor quietly (no screen) before
  anything is written; any other rename loads nothing.
- **Stylesheets** are linked at the end of the head when the editor loads.
  Every selector in them is the editor's own, so the new position changes no
  other rule. `Styles__Main` gave the tab strip, the Dev section and the
  published tab height to the new `Styles__Boot` (Main is now 943 lines).
- **Before the editor loads**, the tab and Dev wording uses the code
  fallbacks, which match the config. `LayoutEditor__Enabled` can only be read
  once the config loads; if it is ever false, the first click says so and the
  tabs go.
- **Verified statically:** the module graph walk and the named-export check
  pass (337 files); all 35 calls the loader, tab strip and Dev section make on
  loaded modules name real exports; ESLint no-undef and no-unused-vars are
  clean on the six changed modules; the start-up graph was measured before
  and after. Not run in a browser: Adam tests.
- **Also seen:** `Na__LayoutEditor__AppConfig__.json` was reformatted (aligned
  colons) by another writer at 09:21 while this change was being made. This
  change only rewords three labels in it.

### Files
- New: `Na__LayoutEditor__Loader__.js` 1.0.0, `Na__LayoutEditor__LoadingScreen__.js`
  1.0.0, `Na__LayoutEditor__Styles__Boot__.css`.
- `Na__LayoutEditor__TabStrip__.js` 1.3.0, `Na__LayoutEditor__DevMenu__Controls__.js`
  1.3.0, `Na__LayoutEditor__ModeController__.js` 1.15.0,
  `Na__LayoutEditor__Styles__Main__.css`, `Na__LayoutEditor__AppConfig__.json`
  (three labels), `Na__DrawView__RenameDrawing__.js` 1.1.0, `index.html`,
  `Na__CoreUi__Styles__Index__.css`.

# ---------------------------------------------------------
## ValeVision3D v2.44.1 - 15-Sep-2026 - Fix: "does not provide an export named Na__ModelToggle__GetCategoryKeys" on Load

### Fixed
- **The page could die on load with a SyntaxError from the Layout Editor's
  Model Layers module**, then load normally after a refresh or two. The code
  was never wrong: `Na__UiFeature__ModelToggle__Controls.js` has exported
  `Na__ModelToggle__GetCategoryKeys` since 12-Sep. The shared PWA service
  worker served shell JS stale-while-revalidate, so the page got the cached
  copy of the Model Toggle module (from before that export existed) while
  `Na__LayoutEditor__ModelLayers__.js`, which the cache had never seen, came
  fresh from disk. A module graph that mixes versions fails to link. Each load
  refreshed the cache in the background, which is why a reload cleared it and
  why it looked like a timing error.
- **Localhost is now network-first for shell JS and CSS.** Every module is
  revalidated against the local server (`cache: 'no-cache'`, a 304 when
  unchanged), so a load can never mix old and new files, and a module edited
  in place is live on the next reload with no cache purge. The cached copy is
  still served when the server is down.
- **Service worker token bumped** to `2026-09-15-1`. It had not moved since
  11-Sep while Layout Editor modules changed, so deployed origins, which keep
  stale-while-revalidate, could hit the same fault once per changed module.

### Notes
- ValeVision3D does register this service worker: index.html loads
  `Whitecardopedia__Pwa__ServiceWorker__Registrar__.js`.
- The first load after pulling installs the new worker, which reloads the page
  once by itself (the registrar's controllerchange bridge).

### Files
- `Whitecardopedia/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js` 1.0.7.

# ---------------------------------------------------------
## ValeVision3D v2.44.0 - 15-Sep-2026 - Layout Editor: Margin Notes Spread Out When the Column Has Room

### Added
- **Stretching gaps between margin notes.** The gap between two notes has a
  least (NoteGapMm, 2.5 mm) and a most (NoteGapMaxMm, 5 mm). What fits is
  decided at the least. When every note fits and the column has room left at
  the foot, every gap opens by the same amount up to the most, with the rule
  centred in it. A column whose notes did not all fit keeps the least.
- **The margin reads as TrueVision's does.** A note's code, a pipe and its
  title share one line, and the body runs the full width (the code column is
  gone). A faint rule sits between notes, 6 mm clear of the right border, and
  body text is 2 mm. A margin stored at the old 2.2 mm (or about 9 pt) moves
  to 2 mm.

### Fixed
- **The Layout Editor could not load.** The Project Specification port copied
  SpecMargin, which imports Na__LeLayout__MarginRect, but SheetLayout never
  had it, so the editor's module graph could not link. SheetLayout 1.2.0 adds
  MarginRect, returns the margin from Solve as Margin, and stops the drawing
  area a block gap short of it, so a new viewport lands clear of the notes.

### Notes
- **Ported from TrueVision3D v2.54.0** (SpecMargin 1.3.0, with 1.1.0 and 1.2.0
  under it; SheetLayout 1.2.0) at Adam's request, after he signed the
  TrueVision change off.
- **Already on disk when this port began.** SpecMargin 1.3.0, ConfigState
  1.12.0's margin fields, SheetRecords 1.11.0's size migration and the
  MarginNotes config keys landed between 23:02 and 23:04 on 14-Sep, from a
  writer that left no entry in this log. They match TrueVision code for code,
  so this entry records them. SheetLayout is the only file this port changed.
- The Project Specification and Margin Notes port underneath (SpecData,
  SpecLinks, SpecEditor, SpecMargin 1.0.0, MarginGrip, Panel__MarginNotes,
  R2DrawingNotes; in checkpoint commit 66937440) has no entry of its own.
- **Verified here, in the running app** (margin.localhost, Doous 3047, every
  non-GET refused and none attempted), on Sheet_001 with the margin switched
  on and general notes added in memory:
  - 6 notes, 180 mm to spare: gaps open to 5 mm; the last note 12.5 mm lower.
  - 19 notes, one not fitting: gaps held at 2.5 mm.
  - 18 notes, 6.39 mm to spare: gaps open to 2.88 mm and the last note ends
    on the foot padding.
  - Each time, every rule is centred in its gap to 0 mm, the text and left
    edges are those laid out at the least gap, and the rules on screen sit at
    the planned positions (17 of 17).
  - Titles read "GN01 | Test note 1" at 2.2 mm bold over 2 mm body text, and
    the drawing area stops 3 mm short of the margin.
- **Verified statically:** SheetLayout, SpecMargin and GetMarginNotesSetup
  are code-identical to TrueVision; so are the MarginNotes config block and
  NormaliseMarginNotes. Every named import across 333 modules and index.html
  resolves.

### Files
- `Na__LayoutEditor__SheetLayout__.js` 1.2.0.
- Recorded here, changed before this port: `Na__LayoutEditor__SpecMargin__.js`
  1.3.0, `Na__LayoutEditor__ConfigState__.js` 1.12.0,
  `Na__LayoutEditor__SheetRecords__.js` 1.11.0, `Na__LayoutEditor__AppConfig__.json`.

# ---------------------------------------------------------
## ValeVision3D v2.43.0 - 15-Sep-2026 - Project Specification: Read - the Notes as A4 Pages, to Print or Read Aloud

### Added
- **Edit and Read.** The Project Specification tab has two tabs inside it,
  beside its title. Edit is the page of fields it always was. Read renders the
  specification as an A4 document: the preview of the PDF it prints as.
- **The pages.** A4 portrait at full size on a grey desk. Along every page's
  head, the Vale Garden Houses logo and "Project Specification · 3047 Doous";
  along its foot, the company and "Page 1 of 3". The first page opens with the
  title, the project's name, its code, the date and what it holds. The groups
  follow, each over a rule, with each note's code in a hanging column.
- **Real pages, nothing cut off.** Blocks are measured where they land. A
  group's heading stays with its first note, and a note's heading with its
  first paragraph. A note that does not fit moves to the next page whole,
  unless it is taller than a third of a page: then it breaks where it starts,
  between words, never leaving one line alone on either side.
- **Print.** Print in the bar, or Ctrl+P while the tab is showing, prints
  exactly these pages, one to a sheet of A4 with no margins added. Nothing else
  in the app reaches the paper. Save as PDF in the print dialog makes the PDF.
- **Read aloud.** The pages are real headings and paragraphs, so Edge's Read
  aloud (right-click, or Ctrl+Shift+U) reads the specification. The running
  head, company and page number print but are not read out, and the sheet
  beneath the tab is hidden while it is up.
- **The bar, and what is remembered.** Read shows the sync state, Sync, the
  page count and Print; the editing tools belong to Edit, and Ctrl+Z does
  nothing in Read. The view is remembered in this browser, each view keeps its
  scroll, Open in specification on a bubble opens Edit, and a read-only session
  starts in Read. The pages shrink to fit a window narrower than A4.

### Notes
- **Ported from TrueVision3D v2.51.0** (commit 66d69d0: SpecEditor 1.1.0 and
  the new SpecDocument 1.0.0) at Adam's request the next morning. The code is
  TrueVision's line for line.
- **Adapted:** the project's name comes from the folder id (2026/3047__Doous
  reads Doous), where TrueVision reads its PWA project context; the DrawView
  path is 42__. The logo and the company come from this app's own config.
- **Left out:** service worker token (n/a).
- **Verified here:** the module graph walk (437 modules, 0 failures) and the
  named-export check (333 files) pass. In the app on Doous
  (specread.localhost:8571, every write refused), Read renders A4 pages with the
  Vale logo, "3047 Doous" and Vale Garden Houses Limited. Nine notes laid in for
  the test gave 3 pages, every code and word matching the data, with a
  6,500-character note breaking across a page. The print hooks, the hidden
  sheet, the right-click menu and Ctrl+Z behave as in TrueVision. The test notes
  were removed and never synced. The real module in headless Chrome, with the
  real stylesheet, printed 4 A4 pages (and a 7-page stress document) with no app
  UI and no blank page.
- **Not exercised:** Edge's speech itself, and the print dialog.

### Files
- New `Na__LayoutEditor__SpecDocument__.js` 1.0.0,
  `Na__LayoutEditor__SpecEditor__.js` 1.1.0,
  `Na__LayoutEditor__Styles__Specification__.css`,
  `Na__LayoutEditor__AppConfig__.json` (17 labels).

# ---------------------------------------------------------
## ValeVision3D v2.42.0 - 15-Sep-2026 - Layout Editor: Zoom Inside a 3D Viewport

### Added
- **The wheel.** Double-click a 3D viewport (or Edit viewport content on its
  right-click menu) and scroll over it: the picture zooms about the cursor, and
  Shift+scroll zooms in fine steps. Dragging still slides the picture. Enter
  finishes (so do Esc and a click elsewhere), and the picture keeps the zoom it
  was left at. The note over the frame reads the zoom as it changes. A run of
  notches is one undo step; a key or a click straight after scrolling commits
  it first. Off the frame the wheel still zooms the sheet.
- **Zoom % box** on 3D viewports, under Window mm: any percentage to a decimal
  place, zoomed about the middle of the frame; Reset gives 100 percent, centred.
  Limits 25 to 1000 percent. Greyed out while the viewport or its layer is
  locked.
- **Zoomed out, the frame fills with scene.** A frame that is not the whole
  picture renders as a window onto the scene camera's picture at the frame's
  own resolution: sharp when zoomed in, and the scene carries on past the
  camera's framing when zoomed out or slid. The camera never moves, and the
  vertical perspective correction still applies.
- **Copy and paste** carry the zoom with everything else, so a framed view can
  be pasted and pointed at another scene.
- **Enter** now finishes a 2D viewport's content editing too, and **Recentre
  content** centres a 3D picture at its zoom.
- **Existing sheets.** A 3D viewport whose picture fills its frame renders and
  keys exactly as before. One whose picture had been slid or cropped renders
  its frame as a window - its white strips fill with scene - under a new key,
  once.

### Notes
- **Ported from TrueVision3D v2.50.0** at Adam's request, after he signed it
  off. The new `Na__LayoutEditor__Viewport3dZoom__.js` is verbatim.
- **Adapted:** ValeVision has no model groups, so Viewport3d and Render3d carry
  no design phase lines. ValeVision's own tiled renderer takes the view window
  with its vertical correction shear still applied per tile, offsets the Silly
  Lines phase into the window, applies the window in 3D only (a 2D ortho
  export frames its own), and keeps its line width compensation on the output
  height, so paper lineweights stay the same at any zoom.
- Left out: the TrueVision service worker token (n/a here).
- **Verified here:** every touched module parses as an ES module; AppConfig
  and KeyMappings JSON parse; module graph 437 modules, 0 failures; named
  exports pass (333 files). In the running app on Doous (3047), with every
  write refused and none attempted, on a temporary 3D viewport that was then
  deleted:
  - Five wheel notches gave exactly e^0.8 (222.6 percent) with the point under
    the cursor fixed. Nothing was announced during the run and one change
    after it; the note and the Zoom % box read 222.6; Enter ended the editing
    with the zoom kept; the sheet's own zoom did not move.
  - The sharp render landed as a frame-sized window (3240 x 2160).
  - Through this tree's tiled renderer, a window render matched the same crop
    of a whole render: mean difference 0.003 (centred), 0.004 (off centre)
    and 0.003 (a wider view reaching past the picture, whose extra strip
    carries scene), against 7.7 to 9.1 for a crop shifted 5 percent. A window
    on both axes matched to 1.2 against 24.6; that residual is this
    renderer's line widths following the output height, not placement.
  - An untouched viewport keeps its old key. Doous's own 3D viewport re-keys,
    but its stored snapshot was already stale by the old formula.

### Files
- `Na__LayoutEditor__Viewport3dZoom__.js` 1.0.0 (new),
  `Na__LayoutEditor__Viewport3d__.js` 1.5.0,
  `Na__LayoutEditor__SnapshotRenderer__.js` 1.5.0,
  `Na__LayoutEditor__PdfExporter__.js` 1.2.0,
  `Na__LayoutEditor__Panel__ViewportSettings__.js` 1.4.0,
  `Na__LayoutEditor__SheetTools__.js` 1.22.0,
  `Na__LayoutEditor__Controls__Pc__.js` 1.1.0,
  `Na__LayoutEditor__ViewportHandles__.js` 1.4.0,
  `Na__LayoutEditor__SheetRecords__.js` 1.12.0,
  `Na__LayoutEditor__SheetModel__.js` 1.14.0,
  `Na__LayoutEditor__ConfigState__.js` 1.13.0,
  `Na__LayoutEditor__AppConfig__.json`, `Na__LayoutEditor__KeyMappings__.json`.
- `30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js` 1.4.0.

# ---------------------------------------------------------
## ValeVision3D v2.41.0 - 15-Sep-2026 - Layout Editor: Rotate Text With a Round Grip

### Added
- **Rotate grip.** A selected text item shows a round grip on a short stem off the top of its outline. Over it, the
  pointer becomes a curved arrow. Drag it and the text turns about the middle of its box, so it spins in place.
  - **Shift** holds the angle to 15 degree steps.
  - Without Shift, a drag settles on a right angle once within 2 degrees of one.
- **Text panel Rotation row**, in degrees clockwise. It turns the selected text about its middle, or, with nothing
  selected, sets the angle new text is placed at.
- **Reset rotation** on the right-click menu of turned text.
- **Everything follows the turn:** every line of multi-line text, the leader (it meets the turned box), the dashed
  selection outline, the inline editor, hit testing (the turned box itself, not the square round it), box select,
  copy, paste, undo, and the PDF.
- **Record key** `Annotation__RotationDeg`: degrees clockwise about the anchor, wrapped into (-180, 180] and written
  only while the text is turned. Level text, and every record from before, draws and saves exactly as it did. It is
  the same shape TrueVision writes.

### Fixed
- **Turned text in the PDF.** jsPDF shifts a centred or right-aligned run along the page, then turns it about that
  shifted start. A turned centred run printed half its width from where the screen draws it, and so did the value of
  a vertical or aligned dimension. Such a run is now placed by its own left end. Level text is unchanged.

### Notes
- **Ported from TrueVision3D v2.52.0** at Adam's request, after he signed it off. The TrueVision hunks replayed as
  they were. Only the module log heads, one Grips region comment and one SheetTools header bullet took ValeVision's
  own anchors.
- Left out: service worker token (n/a).
- **Verified here:**
  - In the app at localhost:8567 on a scratch sheet, every write refused (none was attempted), and the sheet deleted
    afterwards.
  - The grip drew where its geometry puts it (within 0.01 px), with the rotate cursor over it.
  - Drags landed on 90 (from 90.86 degrees, the middle unmoved), on 135 with Shift (105 part way through), and on
    101.7 free.
  - At 135, a point inside the square extent but off the turned box hit nothing; a point along the text hit it.
  - At 45, a crossing box in the empty corner of the square extent took nothing; one across the text took it.
  - The panel turned the text to 45 about its middle. Reset rotation was on the menu and removed the key. Undo and
    redo stepped 45, level, 45. The inline editor opened turned 45 degrees.
  - New text with the panel at 90 put the top of its first line on the press. Two lines at -90 stepped 4.8 mm along
    the turned block, and the leader ended 0.6 mm off the turned box.
  - The PDF text operator put the turned run's anchor on the SVG's (0 mm).
  - All nine touched modules parse, the module graph passes, named exports pass (333 files, after e4's MarginRect
    fix), and the AppConfig JSON parses.

### Files
- `Na__LayoutEditor__MarkupBridge__.js` 1.9.0, `Na__LayoutEditor__Grips__.js` 1.7.0, `Na__LayoutEditor__TextTool__.js`
  1.3.0, `Na__LayoutEditor__Panel__Text__.js` 1.3.0, `Na__LayoutEditor__SelectionBox__.js` 1.3.0.
- `Na__LayoutEditor__SheetTools__.js` 1.23.0, `Na__LayoutEditor__SheetModel__.js` 1.15.0,
  `Na__LayoutEditor__ConfigState__.js` 1.14.0, `Na__LayoutEditor__SheetChrome__.js` 1.5.0.
- `Na__LayoutEditor__AppConfig__.json`; `Na__LayoutEditor__Styles__Main__.css` (`.na-le-grip--rotate`,
  `.na-le-grip--stem`).

# ---------------------------------------------------------
## ValeVision3D v2.40.0 - 14-Sep-2026 - Layout Editor: Dashed Edges on Vectors

### Added
- **Dashed edges.** A toggle on the Vectors panel (right column), off by
  default. Ticking it opens a block for dashed / dotted / dash-dot (centre)
  / hidden, with a scale slider and paper-millimetre section lengths. Draw
  (L) and Rectangle (R) place the pattern; a two-point line can take a
  centre line. Hidden while Edges are off.
- **Shape__LineStyle** on the shape record: null is a solid edge (every
  shape from before this toggle). Otherwise kind, scale, dash, gap and mark
  in paper millimetres. The screen (SVG stroke-dasharray) and the PDF
  (jsPDF dash pattern) paint the same array.
- Eyedropper B and Shift+B copy the style with the other vector traits.

### Notes
- **Ported from TrueVision3D** (LineStyleTool 1.0.0 and the same wiring) at
  Adam's request the same day, to keep the drawing editors in tandem.
- Left out: TrueVision's Draw-at-scale Vectors panel row (this tree has no
  such control). Config JSON is identical, so either app reads the other's
  line styles.
- **Verified here, statically:** LineStyleTool config and AppConfig JSON
  parse. Not exercised in the running app in this session.

### Files
- New: `Na__LayoutEditor__LineStyleTool__.js`,
  `Na__LayoutEditor__LineStyleTool__Config__.json`.
- `Na__LayoutEditor__Panel__Shapes__.js` 1.6.0,
  `Na__LayoutEditor__SheetChrome__.js` 1.4.0,
  `Na__LayoutEditor__ShapeGeometry__.js` 1.5.0,
  `Na__LayoutEditor__SheetRecords__.js` 1.10.0,
  `Na__LayoutEditor__SheetModel__.js` 1.13.0,
  `Na__LayoutEditor__SheetTools__.js` 1.21.0,
  `Na__LayoutEditor__ShapeTool__.js` 1.6.0,
  `Na__LayoutEditor__RectangleTool__.js` 1.2.0,
  `Na__LayoutEditor__Eyedropper__.js` 1.6.0,
  `Na__LayoutEditor__ModeController__.js` 1.14.0,
  `Na__LayoutEditor__AppConfig__.json`,
  `Na__LayoutEditor__Styles__Panels__.css`.

# ---------------------------------------------------------
## ValeVision3D v2.39.0 - 14-Sep-2026 - Layout Editor: Type a Length While Dragging a Viewport

### Added
- **Typed viewport move.** While a viewport's frame is being dragged (the
  move cursor, not a crop handle and not a pan of the drawing inside), the
  Measurements box wakes and reads the drag's length. Type a value and press
  Enter: the frame moves that far along the inferred direction. A minus sign
  runs the other way. The landing is exact - no snap - and the drag finishes
  so the still-down pointer cannot pull the frame back to the cursor. One
  undo step.
- The length is a real size at the viewport's scale, or the sheet's scale for
  a 3D viewport, so 1000 or 1m at 1:50 is 20 mm on the paper.

### Notes
- **Ported from TrueVision3D v2.47.0** (SheetTools 1.24.0, Measurements 1.2.0)
  at Adam's request the same day.
- Left out: TrueVision's ViewportSnapMove carry (this tree has no viewport
  carry yet); service worker token (n/a).
- **Verified here, statically:** AppConfig and KeyMappings JSON parse. Not
  exercised in the running app in this session.

### Files
- `Na__LayoutEditor__SheetTools__.js` 1.19.0, `Na__LayoutEditor__Measurements__.js`
  1.2.0, `Na__LayoutEditor__AppConfig__.json`, `Na__LayoutEditor__KeyMappings__.json`.

# ---------------------------------------------------------
## ValeVision3D v2.38.0 - 14-Sep-2026 - Layout Editor: Group / Ungroup and Multi-Item Copy

### Added
- **Group and ungroup.** Ctrl+G groups selected vectors and text (and nested
  groups); Ctrl+Shift+G ungroups one level. Mixed selections group. A click
  on a member selects the outermost group. A selected group shows a blue
  bounding box with a "Group" overlay. Groups move, nudge, delete, copy and
  paste as one.
- **Multi-item copy/paste.** Ctrl+C / Ctrl+V / Ctrl+D and the right-click
  menu copy text, groups, and a multi-selection of vectors or text. Nested
  group members remap to fresh ids. One paste is one undo step.

### Notes
- **Ported from TrueVision3D** (Groups 1.0.0, ItemClipboard 1.0.0, SheetModel
  1.18.0, SheetRecords 1.13.0, SheetTools 1.23.0) at Adam's request the same
  day, after grouping was signed off in TrueVision.
- Left out: TrueVision's undo-restore / AnnounceRestore change (still pending
  sign-off on the parity ledger). SelectionExists here now also keeps a
  selected vector and a selected group through an undo that leaves them on
  the sheet.
- **Verified here, statically:** AppConfig and KeyMappings JSON parse. Not
  exercised in the running app in this session.

### Files
- `Na__LayoutEditor__Groups__.js` 1.0.0 (new), `Na__LayoutEditor__ItemClipboard__.js`
  1.0.0 (new), `Na__LayoutEditor__SheetRecords__.js` 1.9.0,
  `Na__LayoutEditor__SheetModel__.js` 1.11.0, `Na__LayoutEditor__History__.js`
  1.3.0, `Na__LayoutEditor__Grips__.js` 1.6.0, `Na__LayoutEditor__SheetTools__.js`
  1.18.0, `Na__LayoutEditor__ModeController__.js` 1.12.0,
  `Na__LayoutEditor__ConfigState__.js` 1.10.0, `Na__LayoutEditor__KeyMappings__.json`,
  `Na__LayoutEditor__AppConfig__.json`, `Na__LayoutEditor__Styles__Main__.css`.

# ---------------------------------------------------------
## ValeVision3D v2.37.0 - 14-Sep-2026 - Dimension Text Leader: Drag the Value Off the Line

### Added
- **Drag a dimension value off the line.** With the Select tool, click the
  figure (not the line) and drag it. A circular arc runs from the justified
  side of the value back to the centre of the dimension line, bulging away
  from the line so the hook bends outwards. A paper-white patch sits behind
  the moved text. Drag it close to home and it snaps; the arc goes. Right-click
  **Reset text position** while the value is offset.
- **Handing.** Dragged to the right of the centre (along the way the value
  reads) the text is left-justified and the arc meets its left, at the middle
  of the row; dragged to the left, right-justified, the arc on the right.
  Straight above or below reads as to the right.

### Notes
- **Ported from TrueVision3D** (DimensionGeometry 1.3.0 to 1.5.1, MarkupBridge
  1.10.0, Grips 1.4.0, SheetTools 1.19.0, DimensionTool BeginTextEdit, SelectionBox
  1.2.0, SheetModel 1.17.0, SheetRecords 1.12.0, ConfigState text-leader keys)
  at Adam's request the same day, after the outward-hook shape was signed off.
- Left out: TrueVision's fixed-length extension lines (panel rows and record
  keys). A record without TextDXMm / TextDYMm draws exactly as it did.
- **Verified here, statically:** AppConfig JSON parses. Not exercised in the
  running app in this session.

### Files
- `Na__LayoutEditor__DimensionGeometry__.js` 1.2.0, `Na__LayoutEditor__MarkupBridge__.js`
  1.7.0, `Na__LayoutEditor__Grips__.js` 1.5.0, `Na__LayoutEditor__SheetTools__.js`
  1.17.0, `Na__LayoutEditor__DimensionTool__.js` 1.5.0, `Na__LayoutEditor__SelectionBox__.js`
  1.2.0, `Na__LayoutEditor__SheetModel__.js` 1.10.0, `Na__LayoutEditor__SheetRecords__.js`
  1.8.0, `Na__LayoutEditor__ConfigState__.js` 1.9.0, `Na__LayoutEditor__AppConfig__.json`
  (TextLeaderMinMm, TextLeaderGapMm, MenuResetDimText).

# ---------------------------------------------------------
## ValeVision3D v2.36.0 - 14-Sep-2026 - Eyedropper: Match Unlocked Viewports, Skip Locked Ones

### Added
- **Unlocked viewports match properties.** The eyedropper (B) copies render
  composites, caption and scale from one unlocked viewport onto another. Scene,
  drawing, frame geometry, pan, name, layer and lock stay on that viewport.
- **Locked viewports are invisible to the dropper.** A viewport lock (its own
  flag or its layer) is not a source and not a target. Hit-testing skips the
  locked frame, so the pointer reaches markup and other unlocked viewports
  through it instead of the dropper sticking to the viewport over everything
  else. Copy / Paste properties on the right-click menu only appear when the
  viewport is unlocked.

### Notes
- **Ported from TrueVision3D** (eyedropper 1.6.0, SheetTools 1.22.0) at Adam's
  request the same day. ValeVision does not store `Viewport__ShowFrame` yet
  (TrueVision's Frame toggle, plan item W), so that trait stays there.
- Viewports do not load the palette: new viewports are added from the panel,
  not drawn with a tool.
- **Verified here, statically:** AppConfig JSON parses. `EXCLUDED_KINDS` is
  gone; locked-viewport skip is in Resolve. Not exercised in the running app
  in this session.

### Files
- `Na__LayoutEditor__Eyedropper__.js` 1.5.0, `Na__LayoutEditor__SheetTools__.js`
  1.16.0, `Na__LayoutEditor__AppConfig__.json` (description, ViewportNote,
  labels).

# ---------------------------------------------------------
## ValeVision3D v2.35.0 - 14-Sep-2026 - Layout Editor Clipboard, Whole-Shape Snap, Measurements Box

### Added
- **Vector and viewport clipboard (Ctrl+C / Ctrl+V / Ctrl+D).** Copy, paste and duplicate
  a selected viewport or vector from the keyboard or the right-click menu. A paste is a
  new item with a fresh id; a viewport also gets a copy name. ValeVision had no viewport
  clipboard yet, so that slice came with the vector clipboard.
- **Draw-vertex undo.** While a polyline is being placed, Ctrl+Z / Ctrl+Y take the last
  point off and put it back instead of stepping the sheet.
- **Whole-shape snap.** A dragged vector offers the grab point and every vertex; the
  nearest snap moves the whole shape. Vertex grips already snapped.
- **Shift-click insert vertex.** Hold Shift over an edge of the selected vector and click
  to insert a vertex there (diamond marker); the same press can drag it.
- **Measurements box (VCB)** at the bottom right of the sheet. Typed lengths for Draw,
  Rectangle and Dimension, and a typed length while a vertex is being dragged
  (`GetVertexDrag` / `TypeVertexLength`). DrawingScale reads `atScale: true` on the
  shape and dimension defaults.

### Notes
- **Ported from TrueVision3D v2.44.0 (clipboard + draw-vertex undo), v2.45.0 (whole-shape
  snap + Shift-click insert) and v2.46.0 (VCB including vertex-drag typed length),**
  which itself sits on v2.40. Left out: PlanDoors, ViewportSnapMove, ModelSource, SpecEd,
  measure-at-scale / extension-line **panel rows**, and the service worker token (no PWA
  worker here). `atScale` is hardcoded true so DrawingScale works without those panel
  rows. DimensionTool `BeginTextEdit` is still ValeVision's. CreateDimension does not
  store `Dimension__AtScale` or extension-line fields.
- **MarkupBridge is not wired to DrawingScale.** Dimension values painted on the sheet
  still use ValeVision's existing length path; the Measurements box is the at-scale
  reader/writer.
- **KeyMappings Copy/Paste/Duplicate labels still say "viewport"** as in TrueVision;
  AppConfig menu labels cover vectors as well.

### Files
- **New:** `Na__LayoutEditor__ViewportClipboard__.js`, `Na__LayoutEditor__Measurements__.js`,
  `Na__LayoutEditor__MeasureParse__.js`, `Na__LayoutEditor__DrawingScale__.js`.
- **Layout Editor modules:** SheetModel, ConfigState, ShapeGeometry, Grips, ShapeTool,
  RectangleTool, DimensionTool, SheetTools, ModeController, Panel__ViewportSettings.
- **Config and styles:** AppConfig clipboard/measurements/labels; KeyMappings Copy/Paste/
  Duplicate and MeasurementsBox; Styles VCB and insert-grip.

- **Verified here, statically:** named-export and module-graph harnesses should be
  run on the Layout Editor folder after this port (62 files with the four new
  modules). AppConfig and KeyMappings JSON must parse. Not exercised in the
  running app in this session.

# ---------------------------------------------------------
## ValeVision3D v2.34.0 - 14-Sep-2026 - Dimension End Size: Resize Ticks, Arrows and Dots

### Added
- **Size mm under Ends in the Dimensions panel.** How large the ticks, arrows or dots
  at each end of a dimension are, in paper millimetres. With a dimension selected it
  edits that one; with nothing selected it sets what the Dimension tool places next.
- **The record is `Dimension__TickLengthMm`.** Stored only as a number above zero,
  clamped between 0.5 and 12. A record from before it has no key and draws at the
  config `TickLengthMm` (1.5 mm), so every existing dimension is unchanged until
  Size mm is used. New dimensions take the panel setting. The eyedropper and Shift+B
  copy it.

### Notes
- **Ported from TrueVision3D v2.43.0** at Adam's request in the same breath as the
  TrueVision change. The Size mm field, the record key, the draw path, the
  eyedropper, the selection box, the defaults and the config - without TrueVision's
  Measure at scale or extension-line rows, which this tree has not taken yet.
- **Same data point.** Either app now writes `Dimension__TickLengthMm` in the same
  shape, so a later reader can take it from either.
- **Verified here, statically:** `Na__Verify__Exports__` passes on the Layout Editor
  folder (58 files). `Na__Verify__ModuleGraph__` passes (421 reachable modules, the
  one known vendor issue unchanged). AppConfig JSON parses. Not exercised in the
  running app in this session.

# ---------------------------------------------------------
## ValeVision3D v2.33.0 - 14-Sep-2026 - Box Select: a Window to the Right, a Crossing to the Left

### Added
- **Box select in the Layout Editor, as AutoCAD and SketchUp draw it.** A drag with the
  Select tool that starts on bare paper draws a selection box.
  - Dragged to the RIGHT it is a WINDOW: transparent blue with a solid edge. It takes only
    what lies wholly inside it.
  - Dragged to the LEFT it is a CROSSING: transparent green with a dashed edge. It takes
    anything it touches as well.
  - Only the horizontal direction decides. While the box is dragged, everything it would
    take is outlined in its colour.
- **What a box takes.**
  - A viewport by its frame edge. A crossing drawn inside a viewport does not pick the
    viewport up, so the markup laid over a drawing boxes on its own.
  - A vector by its edges, the closing edge of a fill included. A box inside a filled
    shape does not take it.
  - Text by its text box or its leader; a dimension by its extension lines, dimension
    line, terminators or value; a leader by its line, its endpoint, or its bubble or note.
  - Hidden layers, locked layers and locked viewports are never taken.
- **Where a box can start:** bare paper or the grey stage, a locked viewport, or anywhere
  with Alt held. A press on anything that can move still moves it.
- **Modifiers, as SketchUp holds them:** Ctrl adds, Shift toggles, Ctrl+Shift removes, for
  a box and a click alike. They live in the key map's new SelectionBindings block.
- **Working with several.**
  - Drag any one of them and they all move, as one undo step.
  - A click on one that does not move narrows the selection to it.
  - The arrow keys nudge them all. Delete removes them all, asking once if a viewport is
    among them, and the right-click menu offers Delete N selected items. Each is one undo
    step.
  - A locked item can be selected, but every move, nudge and delete leaves it out.
  - A leader tip follows a moving viewport, not its text: notes moved on their own keep
    pointing where they point.
  - The Text, Dimensions and Vectors panels say how many are selected, and show the
    settings for new objects until one item is selected on its own.

### The Record
- **Nothing new is saved.** The selection is session state; the sheet records are the
  same in both apps.
- `Na__LeModel__GetSelection` keeps its meaning: `{ kind, id }` for exactly one item, null
  for none or several. New: `GetSelectionItems`, `SetSelectionItems`, `IsSelected` and
  `DeleteItems` (a batch delete, one undo step).

### Files
- **New:** `51__System__LayoutEditor/Na__LayoutEditor__SelectionBox__.js` and
  `Na__LayoutEditor__SelectionSet__.js`, both 1.0.0.
- **Layout Editor modules:** `SheetModel__` 1.7.0, `SheetTools__` 1.11.0,
  `SheetSurface__` 1.4.0, `ViewportHandles__` 1.3.0, `MarkupBridge__` 1.5.0, `History__`
  1.2.0, `ConfigState__` 1.6.0, `Panel__Text__` 1.1.0, `Panel__Dimensions__` 1.1.0,
  `Panel__Shapes__` 1.5.0.
- **Config and styles:**
  - `AppConfig__.json`: BoxStartPx, BoxBorderPx, BoxPreview and BoxPreviewPadMm in the
    Selection block, and six labels.
  - `KeyMappings__.json`: the SelectionBindings block and three Select actions.
  - `Styles__Main__.css`: the box and preview colours.

### Notes
- **Ported from TrueVision3D v2.34.0** the day Adam signed it off, on top of Leaders
  (v2.32.0), which was built beside it in the same files.
  - The two new modules are verbatim below the header, leader rows included.
  - Box Select's own 79 hunks were replayed across 13 shared files. Nothing was written
    until every anchor was unique.
  - 10 were development-log heads, rewritten to this tree's module versions.
  - 6 were re-anchored where this tree lacks TrueVision's viewport snap-move and viewport
    clipboard, or words its History header differently.
- **Not ported: CarryTarget's guard.** This tree has no viewport carry yet.
- **Still open: a restore drops selected vectors.** History's selection test has no shape
  row here (see v2.32.0), so an undo or redo also takes every vector out of a
  multi-selection. It returns with the pending undo-writes return trip.
- **No service worker token:** this tree has no PWA worker.
- **Verified here:**
  - all 12 edited and new modules parse as ES modules, and both JSON files parse;
  - `Na__Verify__ModuleGraph__` passes, with the one known vendor issue unchanged;
  - `Na__Verify__Exports__` passes on 317 files;
  - the TrueVision box select harness, run against this tree's real modules, passes 86 of
    87. The one failure is the shape row above: a redo that removes a selected text item
    drops the selected vector with it.
- **Not exercised in the running app:** testing was kept light at Adam's request.

# ---------------------------------------------------------
## ValeVision3D v2.32.0 - 14-Sep-2026 - Leaders & Annotation Bubbles: a Note or a Specification Code on a Sweeping Leader

### Added
- **Leaders, a new kind of sheet object.** A leader runs from a point on the drawing to
  its head. The head is a multi-line Note, or a Specification bubble: a code centred in a
  circle (EE02, DV01), the key drawing-specific notes will later be pulled in by.
  - The Leader tool is E, beside Text on the toolbar.
  - The Leaders panel sits under Text in the right column.
- **Placing one.** Click the point, then where the head goes; or press on the point and
  drag to the head. The leader is drawn live, exactly as it will land.
  - The text field opens at once: one line for a bubble's code, several for a note.
    Ctrl+Enter or a click away finishes a note.
  - A new bubble offers the code after the newest bubble on the sheet, so EE07 is
    followed by EE08.
  - Nothing reaches the undo history until the head lands.
- **Never a straight rule.** The line leaves the endpoint level and runs a short stub.
  It sweeps through an S with level tangents, then runs a second stub into the head.
  - The side of the point the head sits on sets the handing. A note placed to the right
    is left-justified; to the left, right-justified.
  - A bubble takes its leader on the side that faces the point.
  - A code too wide for the bubble grows the bubble.
- **The Leaders panel** edits the selected leader, or sets up the next one:
  - type;
  - text size, weight and colour;
  - dashed or solid line, with its weight and colour;
  - bubble diameter and edge weight;
  - fill on or off, with its colour and a Fill opacity slider;
  - Transparent lines, off by default, with a Line opacity slider;
  - an Endpoint fold: filled or a ring, its ring weight, and its size.
  - A slider drag is one undo step.
- **Editing.** With the Select tool:
  - the square tip grip re-points the leader, snapping;
  - the head or the round anchor grip moves the head alone;
  - the curve moves the whole leader;
  - the arrows nudge it and Delete removes it;
  - double-click or the right-click menu reopens the text, and emptying the text deletes
    the leader.
  - The eyedropper matches leaders. Their type travels only to the palette (Shift+B),
    never in a paint.
- **Vector transparency.** The Vectors panel gains Fill opacity, and Transparent edges
  (off by default) with Edge opacity. New shapes and rectangles take both from the panel,
  and the eyedropper carries them.

### The Record
- **`Sheet__Leaders`** is on every sheet, and each leader sits on the text layer. Fields:
  - identity and place: `Leader__Id`, `LayerId`, `Type` ('text' | 'bubble'), `TipXMm`,
    `TipYMm`, `AnchorXMm`, `AnchorYMm`;
  - text: `Text`, `TextSizeMm`, `FontWeight`, `TextColour`;
  - line: `LineColour`, `LinePt`, `LineStyle` ('solid' | 'dashed'), `LineOpacity`;
  - endpoint: `EndpointFilled`, `EndpointPt`, `EndpointSizeMm`;
  - bubble and fill: `BubbleSizeMm`, `BubbleEdgePt`, `FillColour` (null for no fill),
    `FillOpacity`.
  - The names and defaults are TrueVision's, so either app reads the other's leaders.
- **`Shape__FillOpacity` and `Shape__StrokeOpacity`**, 0 to 1. Every existing shape reads
  1 and draws as it did.
- **Leader changes announce as 'leader' and 'leaders'.** They are content edits: the
  browser draft keeps them, and they never trigger the structural auto save.

### Files
- **New:** `51__System__LayoutEditor/Na__LayoutEditor__LeaderGeometry__.js`,
  `Na__LayoutEditor__LeaderTool__.js` and `Na__LayoutEditor__Panel__Leaders__.js`, all
  1.0.0.
- **Layout Editor modules:** `SheetModel__` 1.6.0, `SheetRecords__` 1.6.0,
  `SheetChrome__` 1.3.0, `MarkupBridge__` 1.4.0, `Grips__` 1.3.0, `TextTool__` 1.1.0,
  `SheetTools__` 1.10.0, `Eyedropper__` 1.3.0, `History__` 1.1.0, `ModeController__`
  1.10.0, `Toolbar__` 1.9.0, `PanelHost__` 1.2.0, `ConfigState__` 1.5.0,
  `ShapeGeometry__` 1.3.0, `Panel__Shapes__` 1.4.0, `ShapeTool__` 1.3.2,
  `RectangleTool__` 1.0.2.
- **Config and styles:**
  - `AppConfig__.json`: the Leader block, the Shapes opacity keys and the labels.
  - `KeyMappings__.json`: `Tool__Leader` on E.
  - `Styles__Main__.css`: the multi-line field and the anchor grip.
  - `Styles__Panels__.css`: the sub-fold.

### Notes
- **Ported from TrueVision3D v2.35.0** the day Adam signed it off.
  - The source was a snapshot of the signed-off files, not TrueVision's working copies.
    Those already carried unsigned Project Specification hunks.
  - Box Select, built beside it in TrueVision (v2.34.0), crosses next as its own port.
- **How the hunks crossed.** They are the authoring session's own edits, replayed in
  order: 123 across 21 files.
  - 112 matched verbatim.
  - 8 were development-log heads, rewritten to this tree's module versions.
  - 3 were re-anchored to context this tree words differently: the History selection
    test, the SheetTools header, and the last label in the config.
  - The three new modules are verbatim below the header.
- **Not ported: the shape row of the History selection test.** An undo here still drops
  a selected vector, as before. That row belongs to the pending undo-writes return trip
  in the parity ledger.
- **No service worker token:** this tree has no PWA worker.
- **Verified here:**
  - all 20 edited and new modules pass `node --check`, and both JSON files parse;
  - `Na__Verify__ModuleGraph__` passes, with the one known vendor issue unchanged;
  - `Na__Verify__Exports__` passes on 315 files;
  - the TrueVision leader harness, run against this tree's real modules, passes 83 of 83,
    old-style primitives painting byte-identically to this repo's HEAD among them.
- **Not exercised in the running app:** testing was kept light at Adam's request.

# ---------------------------------------------------------
## ValeVision3D v2.31.1 - 13-Sep-2026 - A Refused Snapshot Upload Is Never Counted as Baked

### Fixed
- **The Dev bake no longer counts a refused 3D snapshot upload as baked.**
  `Na__LeVp3d__Bake` used to decide by reading the viewport record after the render:
  if the record named this view, the bake had worked. A record that already named the
  same view passed that test whether or not the new picture reached R2 - a forced bake,
  or a stored picture too narrow for export (every record written before
  `Asset__PixelWidth` existed reads as too narrow). It now counts the render's own
  upload.
- **The record is stamped only when the upload says R2 took the file.**
  `Na__LeVp3d__RenderNow` requires `r2Success === true` before it writes
  `Viewport__SnapshotAsset`, and returns whether it did.

### Notes
- **Ported from TrueVision3D v2.32.1** the day it was fixed, at Adam's request, as
  `Na__LayoutEditor__Viewport3d__` 1.4.1. The RenderNow and Bake hunks are TrueVision's
  1.5.1 line for line; the module still lacks TrueVision's Model Source (1.5.0), which
  has no model groups to act on here.
- **TrueVision had the worse half.** Its upload utility returns a result with
  `r2Success : false` where this tree's throws, and a result object is truthy, so a
  refused upload there wrote a path R2 had never received onto the record - the web
  build then asked R2 for a missing file and drew an empty frame, and the Dev bake
  called the viewport up to date. Here `Na__AppUtils__R2AssetUpload` throws and
  `Na__LeAssets__Upload` returns null, so no refusal ever stamped a record; the new
  check keeps the two modules identical and holds if the transport ever changes.
- Verified here: the module parses, the module graph resolves and the named imports of
  312 files resolve. A Node harness runs the real module of each app against stubbed
  imports through 10 cases - an upload refused as a result object, refused as null, and
  accepted, through Bake, Force Render and the PDF render. Before the port this copy
  failed 5, one of them with its own null refusal (a forced bake over a same-key record
  read as baked); after it, all 10 pass.
- In the running app on Doous (`vvstamp.localhost:8441`), every write refused by a guard
  and none attempted, and the running `Bake` proven to be the ported one by its source:
  Sheet_001's 3D viewport rendered (3240 px), and Force Render, a forced bake and an
  unforced bake each left its record untouched, both bakes `failed`. A `*.localhost` host
  cannot upload in this app, so the upload branch itself rests on the harness. The stored
  snapshot's fingerprint (`1od0ttx`) no longer matches the view's key (`5ski8l`), so the
  old code would also have said `failed` here: the same-key miscount is shown by the
  harness alone.

# ---------------------------------------------------------
## ValeVision3D v2.31.0 - 13-Sep-2026 - Drawing Layers: Drag the Grip, Lock and Unlock

### Changed
- **A grip replaces the Up and Down buttons.** Each row in the Layout Editor's
  Drawing Layers panel now ends in a six-square grip. Press it, drag the layer up
  or down and let go.
  - The row follows the pointer, and the rows it passes slide aside to show where
    it will land. Nothing reaches the model until release, so a drag is one
    reorder and one undo step.
  - A row takes a place once its leading edge passes the middle of the row there,
    so the first and last places can both be reached.
  - Escape, or a cancelled pointer, drops the drag and leaves the order alone.
  - A panel refresh that arrives mid-drag waits for the drop rather than pulling
    the rows out from under the pointer.
  - With the grip focused, the up and down arrow keys move the layer one row, so
    the order can still be changed without a mouse. Those arrows do not reach the
    sheet.
  - Only the grip drags. The whole row is no longer an HTML drag source, so a
    double-click rename or the type select cannot start a drag by accident.
- **The lock button reads Lock, or Unlock while the layer is locked** (it read Open
  and Locked). A locked layer's button carries a faint red tint, and both words
  share one width so the layer names do not shift.

### Notes
- **Ported from TrueVision3D** (`Na__LayoutEditor__Panel__Layers__` 1.1.0), authored
  there first and signed off by Adam on 13-Sep-2026. No record field changed: the
  order is still `Layer__Order` and the lock `Layer__Locked`, so both apps write the
  same data.
- **How it came across.** A script confirmed that this tree's Layers module body and
  the Layer Rows region of `Na__LayoutEditor__Styles__Panels__.css` were still
  byte-identical to TrueVision's committed originals before replacing them, then
  checked them again after writing.
  - The Layers module is TrueVision's line for line below the header.
  - Nothing outside the Layer Rows region of the stylesheet moved.
  - Each file kept its own line endings (the module LF, the stylesheet CRLF).
- **Verified here, statically:** the module parses; `Na__Verify__ModuleGraph` passes
  with its one known vendor issue unchanged; `Na__Verify__Exports` passes on 312 files.
- **Verified in the running app** on a scratch sheet at `127.0.0.1:8441`, with every
  network write refused (none was attempted). Nine checks passed:
  - A 2 px press is not a drag.
  - Lock turns to Unlock and back, with the same tint and the same 48 px width as
    TrueVision.
  - A drag down one row, a drag to the very bottom and a drag to the very top.
  - Escape and a cancelled pointer both leave the order alone.
  - The arrow keys move one row and keep focus on the moved layer.
  - A refresh mid-drag is held until the drop, which still lands.

# ---------------------------------------------------------
## ValeVision3D v2.30.0 - 13-Sep-2026 - Edge Styles: Structure Black, Doors Grey, Furniture Faint

### Added
- **Each model category draws its own linework.** In a 2D Layout Editor viewport
  every projected line now knows which category of the model it came from. That
  lets structure stay black at full weight while the proposal's doors step back
  to dark grey and furniture and planting sit at mid and light grey. The drawing
  gets that depth cue without anyone setting it up.
- **An Advanced fold in Model Layers** shows each category's edge colour, line
  type and weight inline in its row, between the name and the checkbox. There is a
  reset per row and one for the whole viewport.
  - A change restyles that category in the selected viewport only, and repaints
    without re-projecting.
  - Folded, the panel is exactly the panel it was.
  - It appears on 2D viewports only.
- **Defaults per category**, in `Na__LayoutEditor__ModelLayers__Config__.json` 1.1.0,
  the same as TrueVision's:
  - Walls, floors, roofs and the building itself: black, 1.0.
  - Windows and doors: dark grey, 0.80.
  - Staircases: soft black, 0.90. Fixtures: dark grey, 0.75.
  - Furniture: mid grey, 0.50. Decor: light grey, 0.50.
  - Landscape: mid grey, 0.60.
  - Site boundaries: soft black, dashed, 0.75.
  - Planting and people: 0.50.
  - A category no config names draws black, solid, at full weight: plainly
    unstyled rather than invisible.
- **A weight is a factor, never a width.** 1.0 is the sheet's master viewport
  lineweight, so raising the master thickens the whole drawing and keeps the
  hierarchy. The Projected Linework and Hidden Lines composite weights (v2.28.0)
  multiply on top.
- **Line types in paper millimetres** (`Na__LayoutEditor__EdgeStyles__Config__.json`):
  solid, dashed, dashed fine, centre (steelwork and setting out), centre fine,
  phantom and dotted. A dash measures the same on paper at 1:50 and at 1:200.
- **Colours are the SketchUp SSOT edge greys**, stored by alias: black, soft
  black, dark grey, medium dark grey, mid grey and light grey. Each alias carries
  its SSOT material key.
- **The record is `Viewport__ProjectedEdges`.** It holds only the categories
  someone restyled, each written out in full with its label, plus the time of the
  last change.
  - An entry that returns to its default is pruned, and the record is null when
    nothing is left.
  - The shape is TrueVision's, so either app reads the other's sheets.
- **The PDF prints the same bands** the sheet paints.

### Changed
- **Every linework render that is kept runs on the CPU backend.** That covers the
  drawing on screen, every Layout Editor viewport, the browser cache and the R2
  bake, because only the CPU backend tags each line with its category.
  - `auto` used to send plain elevations to the GPU on a capable machine, where
    the edge styles would have done nothing. That was TrueVision's first failed
    test of this feature.
  - The GPU and legacy backends remain for the Dev menu's Run Diff, which keeps
    nothing, and the menu now says so.
  - A large elevation computes more slowly on a machine that used to hand it to
    the GPU.
- **Linework asset schema 2** stores the category tags as `[ id, count ]` runs per
  class.
  - Schema 1 assets and browser copies are refused and rendered again once, because
    a drawing restored from one could not be styled.
  - Until a project is saved again on localhost, which re-bakes its drawings, the
    web build computes that linework in the browser instead of loading the old
    asset.
- **The Layout Editor also waits for the edge style config and the drawing view
  config** before it builds. Neither fetch rejects.
- **The side panel drags to 680 px** (was 520), to make room for the inline controls.

### Notes
- **Ported from TrueVision3D v2.27.0** (Edge Styles), which Adam signed off on
  13-Sep-2026. The Render Composites half of that version came across separately
  as v2.28.0. Nothing was copied wholesale.
  - **Projection files (folder 50).** They matched TrueVision's pre-feature code
    apart from ValeVision's own comments and gates.
    - A replayer applied TrueVision's committed diff hunk by hunk: 64 hunks across
      10 files, with every anchor required to match exactly once.
    - The two it could not place went in by hand and were then confirmed present:
      the Owners import, because ValeVision's import block differs, and
      WorkerPool's JoinOwners.
    - Every body was then compared with TrueVision's committed code. What differs
      is ValeVision's localhost authoring gate, its comments and the Dev menu's
      formatting.
  - **New modules.** `Na__ProjectedLinework__Owners__`, `Na__LayoutEditor__EdgeStyles__`
    and its config are verbatim below their headers. ModelLayers (6 hunks) and
    Panel__ModelLayers (11) were replayed the same way.
  - **Shared files.** SheetRecords, SheetModel, Viewport2d, PdfExporter and
    ModeController already carried today's Render Composites weights, ortho
    dimensions and gradient fills.
    - They took 22 anchored patch steps, each new block cut from TrueVision's
      committed code between marker lines.
    - PdfExporter and Panel__ModelLayers now match TrueVision line for line below
      the header.
- **The model layer config carries two sets of rows.** ValeVision names a category
  after the GLB it came from.
  - A project exported with the building split by tag, such as Doous (3047), loads
    `ValeVision__MainBuildingModel__ProposedWalls`, `...Roofs`, `...Windows` and the
    rest. Those are TrueVision's keys under the ValeVision prefix, and they carry
    TrueVision's rows and styles.
  - An older export arrives coarse: the existing building as one category, the
    proposal as one plus its doors. Those rows stay too, styled as structure, so
    there the windows draw at the building's weight until the project is exported
    again with the split.
  - A row whose category a project did not load never shows.
  - Found in the app: the config inherited from the Model Layers port listed only
    the coarse rows, so Doous's walls, roofs and windows fell under "Other" and its
    windows drew black at full weight.
- **Verified here, statically:**
  - The 19 changed modules parse.
  - 980 named imports across the 76 modules in folders 50 and 51 resolve.
  - `Na__Verify__Exports` passes on 312 files, with every `Na__` name declared or
    imported.
  - `Na__Verify__ModuleGraph` passes, with its one known vendor issue unchanged.
  - The owner-tag harness passes 9 of 9 against this copy of the clip kernel and
    owners module.
- **Verified in the running app**, read-only, on Doous (3047) at a fresh
  `edges.localhost:8441` origin with every network write refused (none was attempted):
  - Elevation_002's viewport rendered in 14.9 s with every segment tagged by its model
    category: 10,073 visible, 300,384 hidden and 10,254 authored, none unknown.
  - The bands matched the width maths exactly, on a 0.3 pt master at 1:50. Walls,
    roofs and floors drew black at 0.1058 mm; windows and doors dark grey at 0.80;
    site boundaries soft black at 0.75, dashed 2.5/1.5; landscape mid grey at 0.60.
    Hidden lines in solid categories kept the class dash. The SVG painted exactly
    those bands.
  - In the Model Layers Advanced fold, Walls set to mid grey wrote one
    `Viewport__ProjectedEdges` entry and split the visible black band into 4,278
    walls and 4,332 roofs and floors. Centre at 0.5 then drew a 0.0529 mm line
    dashed 8/2/2/2. The projected result stayed the same object throughout: the
    drawing repainted and was never re-projected. The row's reset pruned the
    record back to null and the original 11 paths.
  - Not exercised here: the PDF export (PdfExporter is TrueVision's line for line,
    and its bands were checked against the screen there) and the GPU route, which
    the verification pane has no adapter for.

# ---------------------------------------------------------
## ValeVision3D v2.29.0 - 13-Sep-2026 - Ortho Dimensions: Hold Shift for Horizontal or Vertical

### Added
- **Shift makes a dimension ortho.** Hold Shift while the dimension's line follows
  the cursor (after the second click) and it runs horizontal or vertical, whatever
  its two points are: drag the line above or below them for a horizontal dimension,
  which measures the x distance, or beside them for a vertical one, which measures
  the y. Let go of Shift and it is aligned again; pressing or releasing Shift redraws
  at once. Two points at different heights - the eaves of one wall and the foot of
  the next - no longer need a sloping dimension.
- **The CAD box rule picks the direction.** Above or below the box the two points
  span gives horizontal, to either side vertical, off a corner whichever side is
  further out; inside the box the choice holds. Two level points can only take a
  horizontal dimension, two plumb ones only a vertical.
- **Each point runs its own extension line** to the dimension line, and a vertical
  value reads up the sheet. Inference still lines an ortho line up with any parallel
  dimension nearby.
- **Snap markers are coloured by the tool that is snapping**: blue for vertices (the
  Draw and Rectangle tools and vertex grips), orange for dimensions (the tool, its
  grips and its line inference). Purple is the viewport tone - defined and styled,
  ready for the viewport snap move, which has not come across yet.

### Changed
- **Shift no longer bends the span** to the nearer axis while the end point is
  picked. The end lands on the point that was picked; the arrow keys still lock the
  span to an axis.
- **An ortho line stays where it was put** while a grip re-picks either point, even
  when the end is dragged past the start.

### Notes
- **Ported from TrueVision3D v2.31.0** the day Adam signed it off there ("works
  great"). `Na__LayoutEditor__DimensionGeometry__` 1.1.0 and
  `Na__LayoutEditor__DimensionTool__` 1.2.0 are verbatim below their headers. The
  edits to Snapping (1.2.0), SheetRecords and SheetModel (1.4.0), MarkupBridge
  (1.3.0), SheetTools (1.9.0), Toolbar (1.8.0), the main stylesheet and the app
  config were replayed by a script that required every anchor to match exactly once
  before it wrote anything - all 32 did. The purple carry styling stays behind with
  the viewport snap move it belongs to.
- **New record field, shared with TrueVision**: `Dimension__Orientation` -
  `'aligned'`, `'horizontal'` or `'vertical'`. Every existing record normalises to
  aligned and draws exactly as before, so either app reads the other's dimensions.
- Verified here: the 8 changed modules parse, 812 named imports resolve and every
  `Na__` name is declared or imported; the 30-check geometry harness passes against
  this copy, with the aligned skeleton bit-identical to the old module across 80,000
  cases. In the running app, on a scratch A3 sheet with every write blocked (none was
  attempted): 23 checks with pointer and key events - the Shift placement, live Shift
  release and press, the 40 / 45 / 60.208 values, inference onto the first line, both
  grips with the line held, two undos, the blue and orange markers and the purple
  tone, and an aligned placement with no Shift. A 24th check, a scan of
  `document.styleSheets` for the tone rules, came back empty while the markers'
  computed colours were the new tones - the scan missed where the sheet is attached,
  not the rules.

# ---------------------------------------------------------
## ValeVision3D v2.28.0 - 13-Sep-2026 - Render Composites Weights: How Thick Each Layer Draws

### Added
- **An Advanced fold in Render Composites.** Open it and every composite that
  draws a line gets a weight beside its checkbox, for the selected viewport only:
  Projected Linework and Hidden Lines as multipliers (x) of the sheet's viewport
  lineweight; Profile Linework Effect, Section Outline and Base Image in render
  pixels (px). Folded, the panel is the panel it was.
- **Base Image has a thickness.** Its weight is how thick the model's own
  SketchUp edges draw inside the rendered picture, on 2D and 3D viewports alike.
  The default, 0.80, is the width those edges already use everywhere.
- **Section Outline is a weight-only row** - a drawing either has a cut or it has
  not - and it keeps an empty checkbox slot, so its box lines up with the rest.
- **A changed weight turns its row blue and shows a reset arrow**, which clears
  it again. Only weights someone set are stored, in `Viewport__CompositeWeights`,
  so a project nobody has curated saves exactly as it did.
- **The panel is built from `Na__LayoutEditor__RenderComposites__Config__.json`**
  rather than a list in its source, so a new composite is a config edit.
- **The PDF prints what the sheet shows.** Its stroke rules now take the viewport,
  so the Projected Linework and Hidden Lines factors reach the paper.

### Notes
- **Ported from TrueVision3D** - its v2.27.0 Render Composites weights, plus the
  Base Image weight and the Section Outline row alignment added on 13-Sep - after
  Adam signed them off there. This tree had no Advanced fold, no weights and no
  Section Outline row, so the whole feature came across. The composites module,
  the Styles panel below its header and the Advanced Fold stylesheet region are
  verbatim; the config's layers are verbatim, with two notes reworded for this app.
- **What consumes the pixel weights differs (DIV-1).** The profile width goes in
  through a new `edgeWidthPx` on the composer preset, the section outline through
  the Cross Sections tool (and back out after the live tool is released), and the
  model's edges through a new base-width override in `Na__LineworkSettings`. The
  session linework factors and the export line-width compensation still multiply
  all three, so a viewport nobody has touched renders exactly as it did.
- **3D snapshots keep their keys.** A weight joins the fingerprint only once it is
  set, and only one a scene render can show - the Base Image weight.
- Verified here: the 12 changed modules parse, the named-export harness passes
  (310 files) and the module graph resolves. In the running app, on Doous (3047)
  with every write blocked: the weight boxes and checkboxes measure into one
  column, exactly as in TrueVision; Base Image 3 px drew the edges at 3 times the
  export compensation and took the underlay from 3.66% to 6.25% dark pixels, every
  edge material back to 0.8 afterwards; Profile 4 px took it on to 9.18%; Section
  Outline 5 px was set for the render and the live width came back to 2; Projected
  Linework x2 doubled the vector stroke without re-rendering the raster; a 3D render
  at Base Image 3 px drew the edges at 3 and put them back; an untouched 3D
  fingerprint matches the old algorithm. Not exercised: Hidden Lines on a drawing
  with hidden linework (Doous has none), and a PDF export.

# ---------------------------------------------------------
## ValeVision3D v2.27.0 - 13-Sep-2026 - The Palette: Shift+B Sets What You Draw Next

### Added
- **Shift+B loads the palette.** B still paints one object's style onto others.
  Shift+B instead makes the clicked object's style the setting that new objects
  of its kind are created with - the same Text, Dimensions and Vectors settings
  the panels show when nothing is selected. The selection clears so the panel
  visibly changes to match, the item pulses, and the drawing tool for that kind
  takes over: Text, Dimension, or whichever of Draw and Rectangle drew last.
  Setting the palette and drawing with it is Shift+B and one click.
- **Shift+B with something already selected loads it at once.** Also on
  Shift+click of the Eyedropper button, and as Use for new dimensions / text /
  vectors on the right-click menu. `PaletteSwitchesTool` turns the hand-over off.
- **A scrapbook is the point.** Keep one of each house style beside the paper,
  where it shows on screen and never prints, and a dimension type or a line
  type stops being a panel's worth of fields set again by hand.

### Fixed
- **The eyedropper could not read a locked layer**, although its own header said
  a locked item was a valid source: the hit test skipped locked layers, so a
  click on one found nothing. `HitTest` takes `includeLocked` and only the
  eyedropper passes it. A locked scrapbook now hands out its style, and a locked
  target is refused with a reason instead of being missed. Every other tool is
  unchanged.

### Notes
- **The same traits as B.** The palette reads the eyedropper's trait table. The
  one translation - a record's null fill or gradient becomes an off switch beside
  the last value in the settings - is declared on those two traits, and a
  gradient is copied rather than shared.
- **Ported from TrueVision3D v2.30.0 the same day, after Adam signed it off**, by
  replaying the edits. Every anchor matched this tree, which already carried the
  eyedropper, the rectangle tool and gradient fills.
- Verified here: 51 modules parse, every named import resolves, no undeclared
  names in the six changed files, and the palette harness passes 53 checks and
  the eyedropper harness 52 against this copy. In the running app, read-only: the
  modules load, the live key map sends Shift+B to the palette and B to the
  eyedropper, and the live config supplies the wording and both settings.

# ---------------------------------------------------------
## ValeVision3D v2.26.0 - 13-Sep-2026 - Gradient Fills

### Added
- **A Gradient toggle in the Vectors panel**, last in the list after Fill and
  Closed. Switch it on and the shape is filled with a linear gradient: a start
  colour and an end colour, either of which can be Alpha, a Blend slider and a
  Direction from 0 to 360 degrees with a preview swatch beside it. Alpha to
  white is the default.
- **What it is for:** draw a closed polygon on a vector layer over a drawing,
  switch its edges off and run alpha to white, and the drawing fades out into
  the page. Colour to colour works the same way.
- **Direction** reads like a protractor and like Adobe's gradient tools: 0 left
  to right, 90 bottom to top, 180 right to left, 270 top to bottom. **Blend** is
  where the two ends meet half and half - Illustrator's midpoint - so 50% is an
  even fade. Only one end can be alpha at a time.
- **The gradient is fitted to the shape.** The start and end colours land on
  the outline's furthest points back and forward along the direction, so the
  fade spans the whole polygon at any angle.
- **A gradient is the fill.** It replaces a solid fill, and it counts as the
  fill for the either-or rule: edges off with a gradient on leaves the fade
  alone instead of bringing a grey solid fill back.
- **The PDF carries it.** A PDF shading cannot hold transparency, so the
  gradient prints as a PNG strip with an alpha soft mask, rotated to the
  direction and clipped to the vector outline. Screen and paper are painted
  from one colour function.
- **One drag is one undo step.** Blend and Direction redraw the shape silently
  while they move and announce once on release.
- The eyedropper carries a vector's gradient with its other traits; a missing
  gradient clears the target's, the way a missing fill does.

### Fixed
- **A rectangle ignored the gradient default.** The Rectangle tool built its
  shape from the Vectors panel defaults but never passed the gradient, so a
  rectangle drawn with Gradient switched on came out with no fill at all. Found
  while porting, and fixed in both apps.

### Notes
- **Ported from TrueVision3D v2.29.0** (commit `50d46de`, signed off by Adam the
  same morning) by replaying the edits against this tree, not by copying files.
  Every hunk's anchor was found exactly once here, and every body hunk's new code
  was found exactly once in that commit - so what landed is the code that was
  tested, not a transcription of it. 35 hunks across 12 files, line endings kept,
  plus the config JSON copied verbatim.
- `Na__LayoutEditor__GradientTool__.js` and its `__Config__.json` are verbatim
  apart from the module header and the console prefix, and below its header the
  Vectors panel is now TrueVision's line for line. The record key
  `Shape__Gradient` and its six `Gradient__` fields are shared, so either app
  reads the other's gradients.
- **One adaptation:** the mode controller waits on the editor config and the
  gradient config together. TrueVision's also waits on its edge style and render
  composite configs, which ValeVision has no modules for.
- **Not carried:** TrueVision's working copies already layer an unsigned palette
  mode (Shift+B) and an undo-restore announcement on top of the gradient. Neither
  is signed off, so neither is here.
- The eyedropper's gradient trait line was already in this tree - it arrived
  inside v2.24.0's copy of the module, ahead of the feature - and is live now.
- Verified: every edited module parses, and the module graph walk and the named
  export check (309 files) pass. In the app on a scratch A3 sheet with every
  write blocked: the row order, the defaults toggle, a press-drag-release
  rectangle taking the gradient, direction, edges off, no history step mid-drag
  and one on release, alpha on one end only, and the SVG. A test PDF through this
  tree's jsPDF path, rendered back with pdf.js, matched the screen SVG within 2
  levels in 255 at eleven sampled points, with the soft masks, the outline clips
  and the rotated strip present.

# ---------------------------------------------------------
## ValeVision3D v2.25.0 - 13-Sep-2026 - The Rectangle Tool

### Added
- **A rectangle tool on the R key**, beside Draw on the toolbar. Two corners
  instead of four sides: click one corner and then the opposite one, or press
  on one corner and drag to the other. Shift keeps it square. Both corners snap
  to the linework and to the sheet's own vectors, exactly as Draw's points do.
- **What it draws is an ordinary vector.** The moment the second corner lands
  the rectangle is a closed four-point shape, written through the same
  `CreateShape` call the Draw tool uses with the same Vectors panel defaults.
  From then on it is a polygon: the Select tool drags its corners one at a time,
  the Vectors panel restyles it, the eyedropper matches it and the PDF prints
  it. There is no rectangle flag on the record, so TrueVision and ValeVision
  write exactly the same data.
- **Nothing is written until the second corner lands.** The preview is a dashed
  rubber box on the handles layer, solid while Shift holds it square. An
  abandoned rectangle leaves nothing to delete or undo, the browser draft never
  catches a half-drawn one, and the preview can never snap to its own corners.
  One call is one undo step, and the new rectangle is selected as it lands.
- Escape, Space, a right click, a second finger or another tool abandons a
  half-drawn rectangle; the arrow keys are swallowed while one is being drawn
  rather than nudging whatever was selected before it. A second corner with no
  width or no height is ignored, so a double click cannot leave a sliver.

### Notes
- Ported from TrueVision3D v2.27.0, where it was authored, tested and signed off
  the same day. `Na__LayoutEditor__RectangleTool__.js` is verbatim apart from its
  header; the wiring was replayed edit by edit - sheet tools (tool slot, press,
  move, release, cancel, arrows, the R case), the toolbar button, `ShowBox` /
  `HideBox` in the grips, the rubber box stylesheet rule, the key map and its
  fallback, and three labels.
- It landed on top of v2.24.0's eyedropper port, which had just brought these
  same files level with TrueVision, so every anchor matched.
- Verified: the logic harness (41 checks) against this copy of the module, and 20
  checks in the app with real pointer and key events on a scratch A3 sheet - both
  drawing modes, the Shift square, Escape and right click, arrows mid-draw, one
  undo step per rectangle, and a single corner dragged with the Select tool. Every
  write was blocked for the run and nothing was saved.

# ---------------------------------------------------------
## ValeVision3D v2.24.0 - 13-Sep-2026 - The Eyedropper, and Vectors That Redraw and Snap

### Added
- **The eyedropper, on the B key.** Click the object that already looks right,
  then click every object that should match it. The picked style stays on the
  dropper, so the second, third and fourth target each cost one click. With
  something already selected, B arms it loaded from that selection. Alt+click
  picks a new source, Escape empties the dropper and then puts the tool down,
  and Copy / Paste properties on the right-click menu drive the same dropper.
  Violet marks what is held, green what would take it, red what cannot.
- **Style travels; content, geometry and the layer do not.** Text carries size,
  weight, colour and alignment. A dimension carries text size, colour,
  terminator, precision and unit suffix - not its offset, which is where its
  line sits, so copying it would move the target rather than restyle it (a
  config switch copies it for anyone who wants that). A vector carries edge
  colour, weight, edges on or off and fill, where a missing fill is a real value
  that clears the target's. Kinds do not mix: a refusal that says why is worth
  more than a silent partial paste.
- **Vectors snap to vectors.** Every vertex and edge midpoint of the sheet's own
  vectors, and both measured points of every dimension, are snap candidates
  beside the viewport linework. A polygon closes exactly on its first point, a
  rectangle's last corner can borrow the first corner's coordinate on bare
  paper, and whatever is being dragged never snaps to itself. Hidden layers
  offer nothing; locked ones still do. `SheetObjects` in the snapping config.

### Fixed
- **Vectors never redrew.** The mode controller turned text and dimension
  changes into a markup redraw and had no line for shapes, so a restyled or
  deleted vector kept its old picture until some unrelated edit repainted the
  sheet. It read as a slow editor, not a missing route - and it made the
  eyedropper look broken on vectors at its first test in TrueVision, which had
  the same gap.
- **Every edit waited on the disk.** The browser draft - every sheet in the
  project, stringified - was written to localStorage inside each change, which
  is a synchronous disk write on the main thread. It now waits 600 ms for the
  editing to pause and is flushed when the tab is hidden or closed. A write
  still queued when another project loads is dropped rather than written over
  that project's own draft.
- **A drag rebuilt the sheet hundreds of times a second.** Surface refreshes are
  booked onto the next animation frame and merged, so a pointer that reports
  faster than the screen draws costs one rebuild a frame. The drawing tabs
  rebuild only when a tab would look different, and a text, dimension or vector
  change refreshes only its own panel.

### Notes
- **Ported from TrueVision3D v2.26.0 and v2.26.1 by replaying the edits, not by
  copying files.** TrueVision's working tree carries other unfinished work in
  the same modules - a rectangle tool, clipboard chords, viewport snap-move -
  and copying its files would have brought those imports across broken. Every
  anchor matched here, because in each touched file this code is identical to
  TrueVision's last commit.
- **One deliberate divergence.** The tab strip's change signature carries
  `Na__LeMode__IsAvailable`, the Layout Mode gate, where TrueVision's carries the
  config enable flag, so switching Layout Mode always rebuilds the strip.
- **Undo is unchanged:** one step per announced change, so painting five vectors
  is still five undos.
- Verified on this tree: all 49 Layout Editor modules parse, every named import
  resolves, the eyedropper harness passes 52 checks and the snapping harness 29,
  including 0.09 ms per pointer move against 4,000 vertices.
- Viewports are deliberately not matched yet. The hook, and what it will need,
  is written up in the eyedropper module's header.

# ---------------------------------------------------------
## ValeVision3D v2.23.0 - 12-Sep-2026 - Supersampling Comes Back From the Still Exporter

### Added
- **The still image exporter is supersampled.** Each tile is now rendered 16
  times with sub-pixel camera jitter and the results averaged, so a pixel
  records how much of it a line actually covers instead of answering yes or no.
  This is the same treatment the video exporter got yesterday, and the same
  argument applies: a two-degree eaves line answers "row 100" for thirty pixels
  and then jumps, and the shallower the line the longer the step. Buildings are
  made of shallow lines.
- **Exporting bigger was never going to fix it.** More resolution gives a
  staircase smaller steps, not fewer. And FXAA cannot reach it either - it
  searches about twenty pixels along an edge for where the step ends, gives up,
  and smears what it could not solve. That is why exports came back blurry AND
  still aliased. FXAA now stands aside entirely while supersampling, which is
  why the result is sharper and smoother at the same time.
- **The Layout Editor viewport pictures are supersampled too**, both the 2D
  underlay and the 3D snapshot, at a count that follows the working quality
  level: Low 1 sample for fast drafting, Medium 4, High 16. High is also the
  level the PDF and the Dev bakes always use, so anything that reaches paper
  gets all sixteen. Every number is config, per level.
- **The supersampler moved into the render pipeline.** It was the video
  studio's; three systems need it now, and a jitter table that exists twice is
  one that will eventually disagree with itself.
  `31__System__VideoStudio/Na__VideoStudio__Export__Supersampler.js` is a
  re-export of `05__RenderPipeline/Na__RenderEffect__Supersampler__.js`, aliased
  rather than wrapped, so the frame renderer's import is untouched and the two
  names are provably the same function.

### Notes
- **The cost is linear and paid per tile, not per image.** The accumulation
  buffer is one tile, so a 6144 x 4096 export gains about one 2112 px square
  half-float buffer - a few tens of megabytes - whatever the output size. That
  matters: this exporter exists because a full-resolution render demanded
  gigabytes and killed the tab. Time is the price instead. A 25 megapixel
  export across six tiles at 16 samples is 96 composer renders and lands in
  about eight seconds.
- **Shadow maps are drawn once per tile and reused by the remaining samples.**
  The lights and geometry are frozen and only the view camera is nudged, so
  every later shadow pass would redraw identical maps at full cost.
- **The vertical correction shear is applied per tile and never inside the
  sample loop.** `ApplyFrame` starts by rebuilding the projection from the
  camera, which would wipe the jitter. The base projection is captured after
  the shear has settled, so the jitter shifts the corrected sub-frustum rather
  than replacing it.
- **Fog and SSAO are re-synced per sample, not per tile.** Both rebuild world
  positions from the inverse projection. Syncing once and jittering underneath
  would land the fog in sixteen slightly different places and then average them.
- **Export Render Layers is deliberately left alone.** Those are structural
  conditioning maps - depth, normals, edges - and averaging a normal or a depth
  across an edge produces a value that describes no surface at all. Beauty
  wants coverage; a conditioning map wants the truth at the sample point.
- Ported back from TrueVision3D, which generalised the video studio's
  supersampler for the still exporter and the sheet viewport bakes.

# ---------------------------------------------------------
## ValeVision3D v2.22.1 - 12-Sep-2026 - The Dev Menu Moves Into the Top Bar

### Changed
- **The Dev Tools menu is no longer parked over the model.** It used to sit
  fixed at the top-left of the viewport, permanently, whether or not anyone had
  opened it - which is exactly where the building is. The trigger is now a small
  pill in the top bar beside the Vale Garden Houses logo, and only the flyout
  drops down the left edge once it is pressed. The canvas is clear until you ask
  for the menu. Ported from TrueVision3D, where this was done first.
- **The flyout clears the drawing tab strip.** Its top is header height plus the
  published `--Vale_LayoutTabStripHeight`, so it lands below the tabs when a
  drawing tab is open and below the header when none is.
- **The drag-resize corner sizes the panel, not the container.** The container is
  a flex item in the header now; widening it would stretch the top bar and leave
  the flyout the width it was. The handle also moved INSIDE the list, because it
  is `position: absolute` and the container no longer establishes a positioned
  containing block for it.

### Fixed
- **The Render Composites panel registered into the right-hand column.** It was
  moved to the left in TrueVision on 12-Sep-2026, under Drawing Layers, and the
  move never came back across - so the file's own header said left and the code
  said right. Three panels say what a viewport's picture is made of and they
  belong together.
- **Video Studio's dev-menu height clamp pointed at the wrong element.** It
  clamped `.na-dropdown-menu__details`, which since the move is the pill button
  in the header; it now clamps the flyout list, which is the thing that could
  run over the timeline strip.

### Removed
- **The legacy `--dev-localhost` positioning block** in
  `Na__UiFeature__Styles__DropdownAndToast__.css`, plus the Scene Inspector's
  `min-width: 290px` on the details element - the first fought the header mount,
  the second re-inflated the header pill. Both live in the new
  `Na__UiFeature__Styles__DevToolsMenu__.css` in the form the new layout needs.

### Notes
- Verified in the browser at 1600x950: trigger 108x27 at x=233 in the top bar,
  flyout fixed at x=20 / y=70 (header 60px + 10px), drag grows 300 -> 420 CSS px
  and clamps at the 640px ceiling, container never given an inline width.
- **Divergence from TrueVision**: the trigger's details element also resets
  `max-height` and `overflow`, because ValeVision's base dropdown sheet clamps
  and scrolls the details and TrueVision's does not.

# ---------------------------------------------------------
# ---------------------------------------------------------
## ValeVision3D v2.22.0 - 12-Sep-2026 - The Return Trip: Fixes and Hardware From TrueVision

### Fixed
- **Glass Transparency Off did nothing to real glazing.** The detector asked
  only whether a material was `transparent` or had `opacity` below 1. Glazing
  exported through KHR_materials_transmission is neither: it arrives as a
  MeshPhysicalMaterial with `transparent: false` and `opacity: 1`, see-through
  because light passes THROUGH it rather than because the slot is blended. So
  the toggle declared that glass opaque already, skipped it, and reported
  success - the sliding doors kept showing the room behind them. `transmission`
  above zero now counts. The substitute was always a flat opaque white, so the
  glass goes white the moment it is actually caught.
- **A viewport's Render Composites toggles did not reach its linework.** The
  projection took its flags from the drawing record alone, so switching Hidden
  Lines or Glass Transparency Off on a sheet viewport changed the raster picture
  and not the vectors drawn over it. `FromPlan` and `FromElevation` take a styles
  override and the viewport passes its own. A toggle that half works is harder to
  trust than one that does nothing, because the half that works suggests the rest
  should be believed.

### Changed
- **Context Layer is now the toggle that turns the backing render off**, and it
  sits last in Render Composites because it is the layer furthest back -
  everything else draws over it. Switching it off leaves the projected linework
  alone on the paper, which is the vector drawing a technical sheet wants. Its
  key is still `baseImage`, so nothing already saved changes meaning.
- **The old Context Layer toggle is gone from the panel.** It hid the existing
  building and the landscape, which on a renovation is most of the drawing -
  switching it off emptied the sheet. Two controls both claiming to be the
  context, one of which blanked the drawing, was worse than one that does the
  obvious thing. The mechanism stays in the record layer under its own key.

### Added
- **The projection picks its backend from the hardware.** `auto` is the new
  default and chooses the fastest backend that is CORRECT for each view, which is
  not the same as the fastest backend. The GPU has no cut handling at all - hand
  it a floor plan and it projects the whole building, roof included, instead of
  the storey below the cut. Every plan carries a cut by definition, and so does a
  section-mode elevation; a plain elevation does not, and that is where the card
  is both correct and worth having.
- **A real hardware probe**, because `navigator.gpu` existing is not a capability
  test - it is true in every current Chromium, including where the adapter
  request then fails or returns a software rasteriser. The probe awaits
  `requestAdapter` once, caches it, and REJECTS A FALLBACK ADAPTER: software
  WebGPU passes every API check and is slower than the CPU backend it would
  displace, so accepting it would choose the slow path while reporting the fast
  one. `powerPreference: high-performance` is asked for but is currently ignored
  on Windows (crbug 369219127).
- **The Dev menu says which backend each drawing will use** - per drawing,
  because auto is one answer per view rather than one per session - and the Diff
  harness holds the CPU against the card where there is one, printing which is
  faster.
- **`Na__AppUtils__DevGate__`**: authoring gated on a persisted flag or
  `?authoring=on` rather than on the hostname alone. Routed NARROWLY: ValeVision's
  hostname test also picks the local Flask server over GitHub Pages and writes the
  Flask mirror beside the R2 write, and those data-path uses keep the raw test.
  Unlocking authoring must not send the loader hunting for a server that is not
  there.
- **Two verification harnesses**, `Na__Verify__ModuleGraph__` and
  `Na__Verify__Exports__`. One proves every FILE a page loads resolves, the other
  that every imported NAME exists and that no `Na__` identifier is used without
  being imported or declared. Different faults, same symptom - a blank page - and
  between them they caught several during the work that produced this entry.
  405 modules and 302 files pass.

### Notes
- These came back from TrueVision, where they were written during the drawing
  re-alignment. Three TrueVision fixes were deliberately NOT ported, each checked
  rather than assumed: the 2D viewport camera (ValeVision passes the main camera
  there and is right to, because its composer swaps the RenderPass camera), the
  dual style-key read (ValeVision is internally consistent on one spelling), and
  the MaterialPreset initialisation (ValeVision has always called it). The parity
  ledger records the reasoning.
- **NOT verified here**: the glass fix has not been seen against a ValeVision
  project with real glazing - the logic is identical to the one proven in
  TrueVision, but that is an argument, not a test.

# =========================================================

# ---------------------------------------------------------
## ValeVision3D v2.21.21 - 11-Sep-2026 - Video Studio: 16x anti-aliasing by default

### Changed
- **MP4 exports anti-alias at 16x by default** (was 8x). In side by side
  exports 16x was clearly the best: the smoothest shallow lines and the
  least shimmer in motion. It takes about twice as long as 8x, and the
  export confirmation still states the multiple.

### Notes
- Paths with a sample count already saved keep it; only an absent key reads
  as the new default. Of the local projects, only 57079 Mordaunt has one
  saved, and it is already 16x.
- 4x and 8x stay on the switch for quicker drafts, and unticking Enabled
  still gives the single FXAA pass.

### Files
- `31__System__VideoStudio/Na__VideoStudio__ProjectJson__VideoData.js`
  1.4.1: `Na__VideoStudio__DEFAULT_ANTIALIAS_SAMPLES` is 16.
- Shared PWA service worker token bumped to `2026-09-11-5`.

# ---------------------------------------------------------
## ValeVision3D v2.21.20 - 11-Sep-2026 - Layout Editor: tabs only where a project uses them

### Added
- **Enable Layout Mode switch at the top of the Layout Editor Dev section**
  (localhost), off by default. While it is off the project shows no drawing
  tabs on localhost, even if it has sheets, and the section holds only the
  switch: the sheet list, New Sheet, Save Sheets, Bake and Export appear
  once it is on. Switched on, the tab strip appears (3D Model, a tab per
  sheet, and +).

- **Saved per project the moment it changes.** The switch is
  `LayoutEditor__DrawingsData__LayoutModeEnabled` in the drawings block,
  written through the usual drawings save (R2 first, then the Flask
  mirror), so each project opens the way it was left. An absent key reads
  as off.

### Changed
- **Live site: no tab strip for a project without sheets.** The web build
  shows the strip only when the project's data file has at least one sheet,
  even if Main.json makes the web build editable. Projects with sheets are
  unchanged there (3D Model plus a read-only tab per sheet). The live site
  never reads the switch.
- A sheet can no longer be opened while the editor is not offered, so the
  3D view is never left with no tabs to get back to it. Switching Layout
  Mode off with a sheet open leaves it first, and loading a project that
  has it off hands the 3D view back.

### Notes
- Existing projects, Doous included, open on localhost without tabs until
  Enable Layout Mode is ticked for them once.
- Ticking the switch saves the project, so drawing or scene edits still
  held in memory are saved with it, as with any other drawings save.

### Files
- `42__System__DrawingViewCore/Na__DrawView__ProjectData__.js` 1.1.0: the
  `LayoutModeEnabled` key (skeleton, normalise, getter and setter).
- `51__System__LayoutEditor/`: `ModeController__.js` 1.6.0 (`IsAvailable`,
  `IsLayoutModeOn`, `SetLayoutMode`; Enter and project loads obey it),
  `TabStrip__.js` 1.1.0 (visibility from `IsAvailable`),
  `DevMenu__Controls__.js` 1.2.0 (the switch), `AppConfig__.json` (three
  labels).
- Plan doc: the drawings block schema carries the key and the open item on
  tabs for projects without sheets is settled.
- Shared PWA service worker token bumped to `2026-09-11-4`.

# ---------------------------------------------------------
## ValeVision3D v2.21.19 - 11-Sep-2026 - Video Studio: anti-aliased MP4 exports

### Added
- **Anti-Aliasing section in each video's panel**, between Model Layers and
  Export: an **Enabled** tick and, while it is on, a **4x | 8x | 16x**
  Samples switch, 8x by default. Saved per path in the export block
  (`VideoStudio__Export__AntiAliasEnabled`,
  `VideoStudio__Export__AntiAliasSamples`).

- **Each exported frame is rendered that many times with the camera shifted
  by a fraction of a pixel, and the results are averaged.** FXAA, the only
  anti-aliasing the pipeline had, searches along an edge for about 20px, so a
  long shallow line (eaves, ridges, glazing bars a degree or two off
  horizontal) kept hard steps in a 4K frame, and in a video those steps crawl
  along the line as the camera moves. Averaged samples record how much of
  each pixel a line really covers, so the steps become smooth gradients and
  stay put in motion.

- **The whole effect chain is anti-aliased, not just the scene.** The shift
  goes into the camera's projection, so the fat linework, the profile lines,
  fog and SSAO all see it. FXAA is switched off for the export while it
  supersamples, since it would only soften the samples. The sample positions
  are the standard hardware MSAA patterns, all inside the pixel, so lines
  stay as crisp as multisampling draws them.

### Changed
- An export takes roughly the sample count times as long (8x: about eight
  times). The confirmation dialog says so and the progress overlay names the
  sample count; its time estimate is measured, so it already allows for it.
- Shadow maps are drawn once per exported frame rather than once per sample.

### Notes
- On by default, including paths saved before this build (an absent key
  reads as on at 8x). Untick it for quick draft exports: off renders a single
  FXAA pass, exactly as before.
- Exports only. The viewport, the preview and still image exports are
  unchanged.
- Cross-section caps and outlines are still drawn once over the finished
  frame, and take the canvas's own multisampling.

### Files
- `31__System__VideoStudio/Na__VideoStudio__Export__Supersampler.js` (new)
  1.0.0: sample patterns, projection jitter, half-float accumulation and the
  copy to the canvas.
- `31__System__VideoStudio/`: `Export__FrameRenderer.js` 1.1.0 (per-sample
  loop, FXAA bypass, shadow map reuse), `Export__VideoEncoder.js` 1.3.0,
  `ProjectJson__VideoData.js` 1.4.0, `DevMenu__Controls.js` 1.3.0,
  `Stylesheet__.css` 1.3.0 (segmented switch).
- `05__RenderPipeline/`: PureEngine and MaxEngine `Setup.js` 1.0.1 expose
  `fxaaPassRef`, now part of the pipeline state contract in
  `.cursor/rules/07-RenderEngine-Architecture-.mdc`.
- Shared PWA service worker token bumped to `2026-09-11-3`.

# ---------------------------------------------------------
## ValeVision3D v2.21.18 - 11-Sep-2026 - Video Studio: door animation per keyframe

### Added
- **Advanced Object Animation in the keyframe right-click menu**, a fold
  under Advanced Camera Settings holding a **Door Animation** tick, saved on
  the keyframe (`VideoStudio__Keyframe__DoorAnimation`).

- **A tick covers that keyframe and the travel on to the next one**, the
  same way Travel Time belongs to the keyframe it leaves from. Ticked, doors
  open as the camera passes them. Unticked, they are held shut however close
  the camera comes, and a door left open swings shut as the clip arrives at
  an unticked keyframe. To walk through a door, tick the keyframe before it;
  the next unticked keyframe shuts it behind you.

- **Off until ticked.** Moving through an interior no longer flaps every
  door on the way. Existing videos stop opening doors until keyframes are
  ticked. The video's Animations switch in the panel is still the master:
  off, Video Studio leaves the doors alone altogether, in the clip and while
  editing, and the ticks do nothing (the menu says so).

- **Editing matches the video.** Landing on an unticked keyframe (Go To, a
  tile double click, a live menu edit) swings nearby doors shut and stops
  Walk and Fly proximity opening them until the camera moves about a metre
  across the floor. A ticked keyframe leaves Walk and Fly to open them as
  normal. Closing the panel or opening another path hands the doors back.

- **Every run starts with the doors shut.** An export, and a preview played
  from the top, snap every door closed before the first frame, so a clip
  never opens on a door that editing left swinging.

### Changed
- Waypoints inserted on the path (Ctrl+click) inherit the Door Animation
  tick of the waypoint before them, so splitting a door traversal does not
  shut the door halfway through it.
- Ticking or unticking is one Ctrl+Z step, like the other menu fields.
- The Animations section in the panel explains that doors now only open on
  ticked keyframes.

### Notes
- Scrubbing the timeline does not animate doors (it never did); Play and
  export do.
- Timeline stills show the doors as they are at render time, not per
  keyframe.

### Files
- `25__System__3dObject__InteractionSystem/3dObjectInteraction__Animation__WalkMode__ProximityToOpenDoors__.js`
  1.3.0: hold-closed state (`SetHoldClosed`, `HoldClosedAt`) and
  `CloseAllDoors`. While held, every door reads as out of range, so open
  doors close through the ordinary path and none open.
- `25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js`
  1.7.1: `SnapAllClosed`.
- `31__System__VideoStudio/`: `Playback__SceneAnimations.js` 1.1.0 (per-frame
  doors, start reset, landing hold), `Camera__PathSampler.js` 1.2.0 (sampled
  state carries `keyIndex`), `ProjectJson__VideoData.js` 1.3.0,
  `Edit__UndoHistory.js` 1.1.0, `Playback__PreviewController.js` 1.3.0,
  `Export__VideoEncoder.js` 1.2.0, `Timeline__ContextMenu.js` 1.2.0,
  `Timeline__Stylesheet__.css` 1.3.0, `Viewport__KeyframeDragger.js` 1.0.2,
  `DevMenu__Controls.js` 1.2.2.
- Shared PWA service worker token bumped to `2026-09-11-2`.

# ---------------------------------------------------------
## ValeVision3D v2.21.17 - 11-Sep-2026 - Scenes and video keyframes keep their Orbit, Fly or Walk mode

### Fixed
- **Video keyframes land in the mode they were framed in.** Every keyframe
  already recorded the mode it was captured in, but nothing read it back:
  Go To, a tile double click and every live preview from the keyframe menu
  forced the camera into Orbit. Picking up a Fly shot to adjust it and
  pressing Update therefore quietly turned it into an Orbit shot. The camera
  now lands in the keyframe's own mode, exactly on the shot, lens included.

- **Presentation scenes remember their mode.** Update Camera and Add Scene
  From Camera store the mode the camera is in
  (`PresentationMode__Scene__NavigationMode`, the TrueVision key: `walk` or
  `fly`, absent means Orbit). Picking the scene in the Views bar flies there
  and switches into that mode on arrival. Scenes without one land in Orbit,
  so nobody is left in Walk just because the previous scene was walked.

- **Scene flights work when started in Walk or Fly.** A flight started in
  Walk went nowhere, because Walk rebuilds the camera from its capsule every
  frame, and one started in Fly arrived facing the wrong way. Walk and Fly
  now let go in place first, so the flight starts from exactly what is on
  screen.

- **Fly scenes frame correctly.** A scene captured in Fly stored Orbit's
  leftover target, a point the camera was never looking at, so showing the
  scene swung the view round to face it. Captures in Walk or Fly now store a
  target along the camera's own axis, and Walk and Fly scenes are framed
  along their own look direction in the flight, the page load snap and the
  Layout Editor 3D snapshots.

- **Scrubbing the timeline in Walk or Fly.** Seek never released the
  camera, so the mode fought every scrubbed frame. It now lets go in place,
  as Play does.

- **Timeline stills and MP4 exports leave a Walk or Fly view alone.** Both
  put the camera back after borrowing it and then resynced the orbit
  controls, which re-aims the view at orbit's leftover target and can pull
  it inside orbit's distance limits. They now resync only in Orbit. This was
  rarely hit before, because Go To always forced Orbit.

### Added
- **Orbit | Fly | Walk switch in the timeline keyframe menu** (right click a
  tile), at the top of Camera Settings. It shows the keyframe's mode and
  changes it, and the viewport follows straight away, as Height and Tilt do.
  Ctrl+Z undoes it. Modes switched off for the model show disabled.

- **The same switch on every Presentation Scenes row** (Nav Mode, under
  Group). It edits the row like FOV and Easing do, so Save Scene keeps it.
  Floor plan and elevation cards do not get one.

- **Stop puts back the mode as well as the view.** Play still hands the
  camera to the timeline in Orbit, but Stop now returns you to the mode you
  pressed Play from, at the same spot.

### Changed
- Entering Walk or Fly for a saved shot keeps the saved pose and lens. The
  toolbar's entry nudges (FOV compensation, Walk's 1 m step and 30 degree
  pitch clamp) and the modes' own 50 degree lens are for walking in from an
  Orbit view, not for a chosen shot. A Walk shot still settles at eye height
  above the floor under it, which is what walking there means.

- Waypoints inserted on the path (Ctrl+click) take the mode of the waypoint
  before them, instead of an "Inserted" marker that always landed in Orbit.

- Capture Keyframe, Update and the keyframe menu read the live mode from the
  Walk and Fly systems themselves rather than from the toolbar highlight.

### Notes
- Page load still opens in Orbit when the default scene is a Fly or Walk
  scene (decided 11-Sep-2026); the mode switches the first time a scene is
  picked from the Views bar.
- Scenes updated in Fly before this build carry no mode and read as Orbit.
  Set their switch to Fly and press Save Scene, or Update Camera again while
  flying; either also fixes their framing. Video keyframes need nothing:
  their recorded mode is used as it is.
- Space (play and pause) still only works in Orbit, because Fly uses Space
  to rise. After jumping to a Fly keyframe, use the Play button.
- Height edits on a Walk keyframe show in playback, not in the live view,
  because Walk keeps the camera at eye height.

### Files
- `10__NavigationAndCameras/Na__NavigationModes__Switcher.js` (new, port of
  the TrueVision module, adapted): mode names and availability, the mode
  that actually owns the camera, pose-preserving `ReleaseToOrbit` and
  `EnterModeAtPose`, and the look-ahead target.
- `Na__Navmode__WalkMode__SystemLogic.js` 1.1.0 and
  `Na__Navmode__FlyMode__SystemLogic.js` 1.1.0: `SyncFromCamera`.
- `21__System__PresentationMode/`: `Camera__SceneTransition.js` 1.4.0,
  `DevMenu__SceneEditor.js` 1.3.2, `DevMenu__SceneRowBuilders__.js` 1.1.0,
  `UI__SceneCarousel.js` (port note only); switch styles in
  `03__Style__AppStylesheets/Na__PresentationMode__Styles__SceneCarousel__.css`.
- `31__System__VideoStudio/`: `Playback__PreviewController.js` 1.2.0,
  `Timeline__ContextMenu.js` 1.1.0, `Timeline__Stylesheet__.css` 1.2.0,
  `DevMenu__Controls.js` 1.2.1, `Viewport__KeyframeDragger.js` 1.0.1,
  `ProjectJson__VideoData.js` 1.2.1, `Timeline__Thumbnails.js` 1.0.1,
  `Export__FrameRenderer.js` 1.0.1.
- Parity ledger (new section "Per-Scene Navigation Modes") and a note in
  plan section 7.2. Shared PWA service worker token bumped to `2026-09-11-1`.

# ---------------------------------------------------------
## ValeVision3D v2.21.16 - 11-Sep-2026 - Camera-follow billboards really face the camera

### Fixed
- **Billboards face the camera, not a fixed angle off it.** People,
  pets, silhouettes and 2D trees turned as the camera moved but kept
  whatever angle they had to the camera when the model loaded, so a
  figure could stay edge-on no matter where you stood. The turn was
  measured from the camera's direction at load, which only works if every
  billboard happened to be exported already facing the launch camera. In
  practice SketchUp exports them facing wherever they were placed (the
  Mordaunt silhouettes all came out at yaw -179 deg, the Gordon bushes at
  38 deg), so each one carried its own fixed error.

- **The turn is now measured from the billboard's own front.** The front
  is local +Z: the face drawn towards SketchUp's -green axis, which is the
  side you see in SketchUp's Front view and the side SketchUp's own
  "Always face camera" turns to you. Every exported billboard checked
  (4 Mordaunt silhouettes, 34 Gordon bushes) has its faces on that axis.
  Replaying the edited module against their real exported matrices from
  five camera positions, including one looking down, gave 0 deg off the
  camera for every one, where the old maths was 145-161 deg off
  throughout.

- **Nothing to re-export.** The fix reads the billboards' existing GLB
  transforms, so current projects are corrected on reload. 2D trees are
  fixed along with the entourage, so they will sit slightly differently
  from before.

### Files
- `25__System__3dObject__InteractionSystem/3dObjectInteraction__Animation__CameraFollowBillboards__.js` 1.0.1 - front yaw captured per billboard at scan; the per-frame yaw is camera yaw minus front yaw. The launch-camera reference (`CaptureInitialReferenceYaw`) is gone; `Na__CameraFollow__Initialize` still accepts the camera, so callers are unchanged.

# ---------------------------------------------------------
## ValeVision3D v2.21.15 - 11-Sep-2026 - Entourage silhouettes switch on and off on their own

### Added
- **Entourage silhouettes are their own model layer.** The fill-only grey
  camera-follow silhouettes now sit on their own SketchUp tag
  (`61__Scene__Entourage__Silhouette`, Na__DataLib Tags SSOT v2.2.2) and
  export to their own GLB, so the Tools toggle list shows
  **Scene Entourage Silhouettes** as a separate button from
  **Scene Entourage 2D** (the detailed linework entourage, tag 60).

- **Scenes and videos can show one without the other.** Presentation Mode
  scene visibility (captured per SketchUp scene by Cloud Sync) and Video
  Studio layer overrides are both keyed by category, so they pick up the
  new layer with no new logic: hide tag 61 in a SketchUp scene and that
  scene hides the silhouettes here.

- **Silhouettes are context in the Layout Editor.** Context Layer off takes
  them out of a viewport's picture along with the rest of the context.

### Changed
- Scene Context is tags 62-70 now that 61 is carved out (comments only).

### Files
- `26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js` 1.2.1 - display name for `ValeVision__SceneEntourageSilhouette`.
- `51__System__LayoutEditor/Na__LayoutEditor__SnapshotRenderer__.js` 1.3.1 - joins `Na__LeSnap__CONTEXT_CATEGORIES`.
- `15__ModelLoader/Na__ModelLoader__MultiModel.js` - load-order comment only; the category loads unordered after the priority list, like Scene Entourage 2D.
- Upstream (SketchUp Plugins repo): Tags SSOT v2.2.2, Components SSOT v1.4.5, TrueVision GLB Builder 2.6.1. The exporter reads the Tags SSOT from GitHub, so the SSOT must be pushed before a sync produces the new GLB.

# ---------------------------------------------------------
## ValeVision3D v2.21.14 - 10-Sep-2026 - Dev menu: drawing rows fold, one open at a time

### Changed
- **Every floor plan and elevation row folds down to its name.** Click the
  name to open that drawing's controls; click it again to fold it. A
  panel with six drawings in it is now six lines rather than six screens
  of near-identical sliders.

- **Only one drawing is open at a time, across both panels.** Opening a
  floor plan folds whichever elevation was open, and the other way
  round, because only one drawing can be previewed at a time and the
  open row is meant to be that drawing. This is the point of the change
  rather than a side effect of it: a row you have scrolled to and the
  drawing on screen are different things, and once they drift apart a
  slider drag edits the wrong drawing silently. The viewport does not
  move, because the drawing being edited is not the one being shown, so
  nothing tells you until the sheet comes out wrong.

- **The open row follows what you are working on.** Opening the panel
  unfolds whichever drawing is previewed, and nothing at all if none is.
  Pressing Preview on a row opens it. Creating a drawing, including one
  made by picking a wall, opens the new one. Seeding a whole set at once
  folds everything, since no one of four is the one you meant. Deleting
  the open drawing folds the panel.

- **Opening a row does not preview it.** Unfolding shows the controls
  and nothing else, so glancing at a drawing's settings never triggers a
  rebuild of the view.

### Files
- `02__Src__AppModules/42__System__DrawingViewCore/Na__DrawView__RowAccordion__.js` (new) holds the single open slot and wraps a built row card behind its header.
- `Na__DrawView__Styles__DevMenu__.css` gains the header, arrow and folded body rules.
- `Na__FloorPlan__DevMenu__Editor__.js` and `Na__Elevation__DevMenu__Editor__.js` wrap their rows and move the open slot on create, preview, seed and delete. The row builders are unchanged.

# ---------------------------------------------------------
## ValeVision3D v2.21.13 - 10-Sep-2026 - Layout Editor: a vector can be a fill, and the arrow keys lock the axis

### Added
- **Edges, a Vectors panel toggle.** Switching it off leaves the shape as
  its fill alone, which gives a drawing the three states it wants: an
  outline, a filled outline, or a solid (a mask, a block of tone, a
  hatched area yet to come). Edges and fill are either-or at the least:
  switching one off switches the other on, in the panel and in the
  record's normaliser, so no shape can be made invisible. Everything else
  about a shape is unchanged, which is the point: a fill-only shape still
  selects, still drags, and still takes its vertices by the grips.
- **The arrow keys lock the drawing axis**, as in SketchUp LayOut. Left or
  right holds the next edge across the page, up or down holds it down the
  page, and the same key again releases it. The lock belongs to the
  segment being drawn: the moment its point lands, the next segment starts
  free. The rubber band turns red for X and green for Y while it holds.
  It works on the Draw tool and on the span of the Dimension tool, and the
  arrows go back to nudging the selection whenever no tool is placing.
- **A lock and a snap work together.** The lock takes the locked
  coordinate from the point it started at and the free one from whatever
  the cursor snapped to, so locking an axis and then hovering a vertex
  somewhere else on the drawing lines the new edge up with that vertex.
  That pairing is the reason the lock is worth having.
- `Na__LayoutEditor__AxisLock__.js`, which holds the lock and the axis
  maths Shift used to carry, so the Draw and Dimension tools constrain
  through one place.

### Changed
- **A fill no longer needs the shape to be closed.** The fill treats the
  run of points as if the last joined the first, which is what SVG and
  PDF both do anyway, so Closed now only decides whether the closing edge
  is drawn. An open shape that already had Fill ticked showed nothing
  before; it shows its fill now.
- `Shape__Stroked` on the shape record, defaulting on, so drawings made
  before this release open exactly as they were.

### Notes
- **Service worker token** 2026-09-10-7.

# ---------------------------------------------------------
## ValeVision3D v2.21.12 - 10-Sep-2026 - Layout Editor: Render Composites (Base Image, Context Layer)

### Added
- **Base Image**, a viewport style, on by default. Off, the rendered
  picture behind the viewport is not shown, not rendered and not
  exported. On a 2D viewport that leaves the projected linework alone on
  the paper, which is the vector drawing a technical sheet wants, and the
  costly render never runs. On a 3D viewport it leaves an empty frame.
  Switching it back on shows the picture the frame already had, with no
  new render.

- **Context Layer**, last in the list, on by default. Off, the existing
  building, the site boundaries, the landscape, the vegetation and the
  entourage are taken out of that viewport's render, leaving the design
  proposal on its own. The visibility is put back the moment the picture
  is made, so the 3D model is untouched.
- **The Styles section is now called Render Composites**, since that is
  what the toggles decide: which layers and effects go into the picture a
  viewport shows.

### Note on Whitecard
- The Whitecard style swaps every opaque material to flat white, but only
  under MaxEngine. This project, and the shipped default, run PureEngine,
  which already renders that look, so the toggle does nothing here. It is
  left in place for MaxEngine projects.

# ---------------------------------------------------------
## ValeVision3D v2.21.11 - 10-Sep-2026 - Layout Editor: 3D snapshots really do follow the raster level

### Fixed
- **A 3D viewport stayed low resolution whatever the raster level.** The
  stored snapshot is keyed by what the picture shows (scene, styles,
  model) and said nothing about how big it was rendered, so a picture
  baked at the old six pixels per millimetre (1080 x 720 for a 180 mm
  viewport) matched the key forever and was loaded back on every visit in
  place of a fresh render. The record now carries Asset__PixelWidth: a
  stored picture is used only when it was rendered at least as wide as
  the working level asks for, and a record written before that key
  existed counts as too small. Every render uploads with its width, so
  the file and the record always agree, and the PDF reuses a stored
  picture only when it is wide enough.

### Changed
- **The levels are print resolutions now**, because the old ones were
  soft once the page was zoomed in: Low 6 pixels per millimetre (152
  dpi), Medium 12 (305 dpi, print quality at paper size) and High 20 (508
  dpi), with longest-side caps of 3072, 5120 and 8192. The PDF still
  exports at High.
- **The raster level is in the Viewport panel too**, above the viewport
  settings where it was looked for, marked as global and paired with the
  toolbar control.

# ---------------------------------------------------------
## ValeVision3D v2.21.10 - 10-Sep-2026 - Layout Editor: the modern title block set like a Lantern drawing

### Changed
- **The title block strip is 10 mm, not 16 mm.** No arrangement of a
  label and a value fills 16 mm of band, so the strip read as an empty
  box with writing in its corners. 10 mm is the height a Lantern
  Designer drawing prints.
- **One pair of baselines across the strip.** The label hangs from the
  top of the band and the value is optically centred in what is left
  below it, on Lantern's paddings (2.4 mm top, 0.8 mm bottom, 1.4 mm
  sides, label 1.5 mm from the top). The value used to be pinned to the
  foot of the band, about 10 mm below its own label.
- **Labels 1.6 mm over values 2.2 mm**, down from 1.7 over 2.4, with
  0.05 mm of letter spacing on the uppercase labels.
- **The Vale logo prints at its own size.** 33 mm wide, capped at 5.5 mm
  high, in a 34 mm cell, rather than being blown up to fill a 40 mm one.
- **The logo is no longer squashed.** Its aspect was hardcoded at 4.2:1
  against an asset that is 4.5:1, so the mark printed 7 percent too tall
  on every sheet and every PDF. It is a config value now
  (TitleBlock.LogoAspectWidthOverHeight); re-measure it if the file is
  ever replaced.
- **Sheet margin 5 mm, not 10 mm**, and the drawing area stops 3 mm short
  of the title block (Sheet.BlockGapMm) instead of running into it.
  Placed viewports keep their own positions; only where a new one lands
  changes.
- **Viewport captions** are bold uppercase with 0.16 mm of letter
  spacing, from the style config rather than a hardcoded weight, so the
  sheet reads as one piece of typesetting.

### Added
- **Letter spacing on a chrome text primitive** (TrackingMm), in paper
  millimetres because a PDF content stream sets character spacing in the
  page unit. The SVG painter writes letter-spacing, the PDF painter
  jsPDF's charSpace, and the measurer counts it, so a tracked caption
  truncates at the same character on screen as on paper.
- Style config keys FrameLabelWeight / FrameLabelTrackingMm /
  FrameLabelUppercase and TitleLabelWeight / TitleLabelTrackingMm /
  TitleLabelUppercase / TitleValueWeight.

### Removed
- TitleBlock config keys LogoPaddingMm, LabelOffsetTopMm and
  ValueOffsetBottomMm, replaced by LogoPaddingVMm / LogoPaddingHMm,
  FieldLabelOffsetTopMm and FieldPaddingTopMm / FieldPaddingBottomMm.

### Notes
- Two Lantern touches were deliberately left out: the scale value does
  not carry the paper size ("1:50 @ A3") and the date has no small
  raised ordinal suffix.
- **Service worker token** 2026-09-10-6.

# ---------------------------------------------------------
## ValeVision3D v2.21.9 - 10-Sep-2026 - Layout Editor raster quality: Low, Medium, High

### Added
- **Raster select on the sheet toolbar.** One global working resolution
  for the viewport pictures (the 2D underlay and the 3D snapshot),
  remembered per browser, starting at Medium: Low 4, Medium 8, High 12
  pixels per paper millimetre with longest-side caps of 2048, 4096 and
  6144, scaled by the screen density up to 2x. Changing it re-renders the
  frames (Na__LayoutEditor__RasterQuality__, the Raster config block).
- **The PDF always exports at High**, whatever the working level, and so
  do the Dev bakes. Only export-level renders are uploaded, so a stored
  snapshot asset is always the export picture; an asset loaded from
  storage is treated as size unknown and the PDF renders afresh.

### Changed
- The Viewport keys SnapshotPixelsPerMm, UnderlayPixelsPerMm and
  MaxSnapshotPixels and the Pdf key RasterPixelsPerMm are gone; the Raster
  block replaces them.
- **Service worker token** 2026-09-10-5 (stylesheet changed).

# ---------------------------------------------------------
## ValeVision3D v2.21.8 - 10-Sep-2026 - Layout Editor: dimensions you can edit, lineweights in points, Enhance Whitecard, a Draw tool

### Added
- **Three-click dimensions.** Start, end, then a third click for where
  the line sits, as in CAD. The dimension appears after the second click
  and its line follows the cursor; a parallel dimension nearby pulls it
  onto its own line (an open circle marks the inference), so a run of
  dimensions lines up. The same inference works when the round grip of an
  existing dimension is dragged (Na__LayoutEditor__DimensionTool__).
- **Dimension grips and inline values.** A selected dimension shows a
  square grip at each measured point (they re-pick and snap) and a round
  grip on the line. Double-click a dimension, or use the menu, to type an
  override; typing the measured value back clears it. The value text now
  counts as part of the dimension for selection (Na__LayoutEditor__Grips__).
- **Draw tool (L).** Lines, polylines and polygons: click points (snapping
  to the linework, Shift for an axis), click the first point to close a
  polygon, Enter, a double-click or a right click to finish, Esc to
  abandon. Shapes select, move, nudge, delete, drag by the vertex, and
  open or close from the menu. A Vectors panel sets edge colour, edge
  weight in points (0.20 by default), fill and closure, for the selection
  or for new shapes. New sheets get a Vectors layer; older sheets get one
  the first time a shape lands. Shapes print as vectors in the PDF
  (Na__LayoutEditor__ShapeTool__, __ShapeGeometry__, __Panel__Shapes__).
- **Lineweights in points.** The Sheet panel carries the sheet's viewport
  line weight (0.30 pt by default, the visible projected linework; the
  hidden, authored and section classes keep their ratios) and its
  dimension line weight (0.35 pt), on screen and in the PDF.
- **Enhance Whitecard.** A viewport style, on by default for new
  viewports, that runs the image export's levels and high-pass sharpen on
  the viewport's render so the shaded whitecard faces print white
  (Na__LayoutEditor__Enhance__, parameters in the Layout Editor config).
- **Space** clears the selection and abandons any placement.

### Changed
- **Selection order** is dimensions first, then text, then shapes, then
  viewports, for a click and for the right-click menu alike; dimension
  lines take a wider tolerance.
- **Sheet tools split.** Text placement and inline editing moved to
  Na__LayoutEditor__TextTool__; dimension placement to the dimension
  tool; the sheet tools keep selection, dragging, keys and the menu.
- **Service worker token** 2026-09-10-4 (shell HTML and stylesheet changed).

# ---------------------------------------------------------
## ValeVision3D v2.21.7 - 10-Sep-2026 - Layout Editor: undo, locks, context menu, roaming page, sheets that survive a reload

### Fixed
- **Blank sheet after a reload.** The editor shell is a CSS grid and its
  centre column had no minimum height, so the stage grew to the height of
  its own scroll content instead of scrolling. Once the page had more room
  around it the paper sat thousands of pixels below the visible area. The
  grid row is now pinned to the host and every column has min-height 0;
  the room maths also measures the visible stage, never grown content.
- **"Drawings save failed: Failed to fetch".** That toast meant nothing was
  listening on the local server: the service worker keeps serving the app
  from its cache, so the page looks alive while Flask is down. The toast
  now says the local server is not running and names start_server.bat.

### Added
- **Undo and redo.** Ctrl+Z, Ctrl+Y (and Ctrl+Shift+Z), toolbar buttons and
  the context menu step through the last fifty announced changes on the
  active sheet (Na__LayoutEditor__History__). A drag is one step however
  long it lasts. A save no longer wipes the history or the selection: the
  model announces 'saved' instead of 'loaded' for it.
- **Locked viewports.** Right-click, Lock viewport (or the Viewport panel
  checkbox). A locked viewport cannot be entered, moved, resized, nudged
  or deleted; the outline turns grey and carries a Locked tag.
- **Context menu.** A right click that did not pan opens a menu in the
  house style for what is under the cursor: edit or finish editing the
  content, recentre the content, lock or unlock, delete; edit or delete
  text; delete a dimension; on empty paper, zoom to fit and snapping;
  undo and redo everywhere (Na__LayoutEditor__ContextMenu__).
- **Sheets that survive a reload.** Every announced change is written to a
  browser draft under the project code; a project load that differs from
  the draft puts the draft back, marks the sheets unsaved and says so. A
  sheet created, renamed, reordered or deleted (or its paper or title
  block changed) saves the project of its own accord a moment later, on
  localhost; content edits still wait for Save Sheets, so a drag session
  never writes the project mid-move (Na__LayoutEditor__AutoSave__).

### Changed
- **Drag moves, double-click enters.** Dragging anywhere on a viewport
  moves it, selected or not. Double-click enters the content: the outline
  goes amber with a note, and a drag then repositions the drawing inside
  the frame (2D pans the window, 3D slides the picture). Esc, a click
  elsewhere, or the menu finishes it.
- **Corners crop.** Every handle crops or extends the frame in the axes it
  names; a corner does both, on 2D and 3D viewports alike. Shift on a 3D
  corner scales the picture proportionally as before (plan D29 and D30
  revised).
- **Snap markers** are larger (18 px, heavier line) with a wider catch
  radius.
- **Room to roam.** The paper sits a full stage in from every edge of an
  explicitly sized room, so it can be pushed clear of the window in any
  direction the way a LayOut page can; Fit centres it in that room.
- **Service worker token** 2026-09-10-3 (shell HTML and stylesheet changed).

# ---------------------------------------------------------
## ValeVision3D v2.21.6 - 10-Sep-2026 - Drawings project only when asked

### Changed
- **Record default.** A new floor plan, elevation or section starts with
  Projected Linework off. The scene overlay already stayed idle for a
  record with the toggle off; now nothing else computes for it either.
- **Baking only what asks.** Save Floor Plans, Save Elevations and the two
  Bake actions used to project every drawing in the project, which is
  where a save could disappear for minutes on a house. Bake All and Bake
  Before Save now skip any drawing whose record toggle is off unless a
  caller names it (the Layout Editor names the drawings behind its
  viewports that have Projected Linework on) or forces. The Dev counts
  report how many were left off.

# ---------------------------------------------------------
## ValeVision3D v2.21.5 - 10-Sep-2026 - Renaming a drawing

### Fixed
- **Renaming a drawing broke its sheet viewports.** The 3D snapshot
  fingerprint in `Na__LayoutEditor__Viewport3d__.js` included
  `PresentationMode__Scene__Name`. A name has no effect on the picture, but
  it was part of the key that guards it, so a pure rename made every stored
  snapshot read as stale: the web build refused the R2 asset and drew an
  empty frame, the PDF export lost the image, and localhost quietly
  re-rendered and uploaded under a new path, orphaning a perfectly good
  object. `Na__LeVp3d__RestampForScene` now re-stamps the reference across
  every sheet with the fingerprint the renamed scene produces and leaves
  `Asset__Path` alone, so the picture that was already correct stays in use.
- **Renaming a drawing was never saved.** The name field wrote
  `Elevation__Name` / `FloorPlan__Name` in memory, pushed the name to the
  scene card, and stopped. Nothing persisted it. The Presentation Scenes
  editor auto-saves on add, delete and Save All, and its save writes the
  presentation block but not `LayoutEditor__DrawingsData` - so renaming a
  drawing and then touching the Scenes editor persisted the new name on the
  card and reverted the record on reload. The two then disagreed for good,
  and every later rename synced from a record that was already wrong.
- **A section drawing lost its cut when renamed.** `CrossSection__SceneData
  __Scenes` is a map keyed by scene NAME. A rename left the entry filed
  under a name nothing asks for, so the drawing opened with no section and
  the stale entry sat unreachable. The entry now moves with the rename, and
  `Na__SectSceneData__FindEntryKey` matches on scene id before scene name,
  which also finds bindings orphaned by renames made before this existed.
- **Renaming a drawing's card in the Scenes editor did not reach the
  drawing.** That name input wrote `PresentationMode__Scene__Name` directly
  with no write-back, the desync from the other direction, and it auto-saved.
  A drawing card now commits through the rename path; an ordinary 3D card
  keeps the live in-place edit it always had.

### Added
- **`42/Na__DrawView__RenameDrawing__.js`.** One rename path for every
  surface that offers one. It writes the record and the scene card, re-keys
  the section binding, re-stamps the sheet viewports, saves the whole
  document once through `Na__DrawData__Save`, and confirms what it touched:
  `Renamed to "West Elevation", saved to R2 with its scene card, 2 sheet
  viewports and its section binding.` A rename is atomic - if the save
  fails, every in-memory change is put back and the drawing keeps its old
  name - and one at a time, because two in flight would race the project
  document. The name fields now ASK for a name rather than setting it and
  hoping the rest catches up, and are held until the save answers.
- **`Na__DrawData__Save` carries `CrossSection__SceneData`.** A section
  drawing's cut is drawing data, and the block has to ride with the same
  save or a rename lands everywhere except the cut. `GetProjectBlock`
  returns null until something loads or captures one, so an untouched
  project never gains the key.

### Removed
- **`Na__FpLink__SyncSceneName` and `Na__ElevLink__SyncSceneName`.** Pushing
  the name to the card is a quarter of a rename with none of the save. A
  helper that does the easy quarter is how the record and the card came to
  drift apart, so both are gone rather than left for someone to call.

### Testing notes
- Rename an elevation from the Elevations panel: the toast should name the
  scene card, the viewport count and the section binding, and project.json
  should show the new name in `Elevation__Name`, in the scene, and as the
  `CrossSection__SceneData__Scenes` key, in one save.
- A sheet with a 3D viewport on that scene should keep its picture, and
  `Viewport__SnapshotAsset.Asset__Path` should be unchanged with a new
  `Asset__Fingerprint`. The published build should still paint that frame.
- Rename the same drawing's card from the Presentation Scenes editor and
  check `Elevation__Name` follows it.
- Duplicate names still share one section binding entry, as they always
  have; a rename into an existing name leaves both entries where they are
  and reports it in the console, and the id-first lookup keeps each scene on
  its own cut.

# ---------------------------------------------------------
## ValeVision3D v2.21.4 - 10-Sep-2026 - Raster viewports by default, help panel

### Changed
- **New viewport defaults.** A new viewport starts as a raster viewport:
  Projected Linework off, Profile Linework Effect off, Glass Transparency
  Off on, Whitecard on, Hidden Lines off, from the new
  `LayoutEditor__Viewport__DefaultStyles` block. Nothing projects while a
  sheet is being laid out; switching Projected Linework on for a viewport
  is what asks for the vector linework, the way a raster viewport becomes
  a vector one in SketchUp LayOut. A viewport with the toggle off keeps no
  linework, offers no snap points and shows no progress badge. Stored
  viewports keep the flags they were saved with.

### Added
- **Help panel.** A Drawing Markup subsection under Keyboard Shortcuts
  lists the contextual keys for drawings and sheets (the last open item
  from the plan's integration list).

### Plan audit
- Every file and feature in the plan's Phase 2 to 5 tables, the
  cross-cutting list and Appendix C is present, with two notes: the
  projection fingerprint is read from the live model root on every use,
  so no separate invalidation hook was needed on a model group switch;
  and per-size Classic title block scans (A4, A2, A1) still fall back to
  the A3 scan, as the plan allowed.

# ---------------------------------------------------------
## ValeVision3D v2.21.3 - 10-Sep-2026 - Linework projection budget and object snaps

### Fixed
- **Minutes to project an elevation.** The Lantern Designer runs the same
  engine on lantern-scale models with a few hundred instances; a house
  scale SketchUp export has thousands, and the mesh-against-mesh
  intersection pass (BVH pairs, square in the overlapping pair count) was
  where the time went, with the bounds trees it needs built first. The
  pass now has a budget: skipped when the model has more than
  `IntersectionMaxInstances` (400) instances or more than
  `IntersectionMaxPairs` (20000) overlapping pairs, no self-test on a
  geometry over `IntersectionSelfMaxTriangles` (60000), the bounds trees
  only built when the pass will run, and the report says what was
  skipped. Junction lines on a large model come from the authored
  SketchUp linework instead. All three limits live in
  `ProjectedLinework__Projection__Config`.
- **Recomputing after a reload.** A finished render is now written to the
  browser store (IndexedDB) as well as held in memory, for the scene
  overlay and for sheet viewports alike, so the next load of the drawing
  paints from the store. Bake All to R2 remains the way to give the web
  build a drawing without any computation.
- **Nothing to look at while it computes.** A sheet viewport shows a
  progress badge with the current phase and elapsed seconds while its
  linework is projected, and the console logs the timing report (collect,
  intersections, triangles, edges, segments, phases) when it lands.

### Added
- **Object snaps on the linework.** `Na__LayoutEditor__Snapping__.js`:
  dimension placement and endpoint drags snap to the endpoints and
  midpoints of the projected linework inside 2D viewports, AutoCAD
  style, with a square marker for an endpoint and a triangle for a
  midpoint. Points are indexed per viewport in a paper millimetre grid
  hash from the painted segments and rebuilt automatically when the
  linework, pan, crop or scale changes. A snap beats the Shift axis
  constraint. Toolbar Snap button and F3 toggle it (remembered per
  browser); `LayoutEditor__Snapping__Config` holds the radius, the point
  kinds and the marker size.

# ---------------------------------------------------------
## ValeVision3D v2.21.2 - 10-Sep-2026 - Engine pause on drawing tabs

### Fixed
- **GPU load with a sheet open, and a slow 3D view afterwards.** The 3D
  render loop kept running behind the hidden canvas while a drawing tab
  was open, and the sheet viewports could re-key themselves. The render
  loop bus gains `Na__RenderLoop__Pause` and `Na__RenderLoop__Resume`
  (reasons stack): the loading sequence's loop paints nothing while any
  hold is in place, remembers that a frame was asked for, and paints once
  on resume with a fresh timestamp so walk, fly and door physics see no
  giant delta. The Layout Editor holds the loop for the whole time a sheet
  is open and suspends 3D navigation and distance culling the way a
  drawing does; leaving resumes both and paints one frame. Snapshot and
  underlay renders go through the tiled renderer directly, so the hold
  never blocks them.
- **Viewport render triggers.** A 2D underlay or 3D snapshot is rendered
  only when its key changes (scene, drawing, pan, frame or crop, scale,
  style toggles), never during a drag, and 320 ms (2D) or 400 ms (3D)
  after the last change. The model fingerprint behind those keys is now
  computed once per editor session instead of walking every mesh on
  every refresh, and the 3D key ignores layer visibility so applying a
  scene's layer map for a snapshot cannot re-key the picture. Projection
  pipeline events refresh the frames only when a render has finished.
- **Profile lines pass.** A 2D underlay render left the profile lines
  pass forced on (the composer preset's exit does that for the drawing
  modes); the pass state is now restored after the render.

# ---------------------------------------------------------
## ValeVision3D v2.21.1 - 10-Sep-2026 - clipper2-js vendored (app failed to load)

### Fixed
- **Module graph.** The app stopped at `Failed to resolve module specifier
  "clipper2-js"`. The Phase 0 vendoring left folder 03 out on the reading
  that no ValeVision3D module needs it, but three-edge-projection's
  SilhouetteGenerator imports clipper2-js at module load and the Phase 4
  projection modules import three-edge-projection, so the bare specifier
  broke every module on the page. `03__Vendor__Clipper2Js__v0.9.0` is now a
  byte-identical copy of the Lantern Designer's vendor folder (22 files,
  checksums matched) under `04__Lib__ThirdParty__VersionLocked/`, the
  import map in `index.html` and the JSON index map `clipper2-js` to
  `fesm2020/clipper2-js.mjs`, and the README, plan and ledger notes are
  corrected. The vendor set is now the full coordinated four (01 to 04).
- **Service workers** bumped to `2026-09-10-2` so cached shells refetch the
  import map.
- **2D viewport fill.** `ReferenceError: win is not defined` on adding a
  viewport: the local-name rename in `Na__LayoutEditor__Viewport2d__.js`
  missed an aligned declaration, so the fill read a variable it never
  declared and the frame stayed empty. Declared. The same pass dropped two
  unused imports in the PDF exporter and one in the sheet model.

### Verification
- A static walk of the browser module graph from `index.html` (relative
  imports and import map keys, including the vendor internals) resolves
  every specifier to a file on disk; this walk joins the port's verify
  scripts so a bare specifier cannot pass again.
- A scope-aware lint (ESLint no-undef, no-redeclare, no-dupe-keys,
  no-unreachable) over folders 42 to 46, 50 and 51 reports no undefined
  identifier; `node --check` alone cannot see that class of fault.

# ---------------------------------------------------------
## ValeVision3D v2.21.0 - 10-Sep-2026 - Layout Editor (Port Phase 5)

### Overview
Drawing sheets. A tab strip under the header lists the 3D model and one
tab per sheet; a sheet is paper on screen (A4 to A1, landscape or portrait)
with a title block in the Modern vector style or the Classic scanned style,
free viewports onto any saved scene, and the sheet's own text and
dimensions. A 2D viewport is a window onto a plan, elevation or section at
1:20, 1:50 or 1:100: the composer render of the drawing sits underneath, the
projected linework of Phase 4 lies over it as true vector SVG, and the
drawing's own markup is shown at scale. A 3D viewport is a snapshot of the
scene rendered through the live pipeline with the viewport's style
toggles. Download PDF writes the sheet at true paper size with vector
linework, dimensions, text and chrome (D22 to D35). Authoring is
localhost-only; the web build reads, pans, zooms and downloads.

### Added
- **51__System__LayoutEditor**, thirty-three files, all new (patterns from
  the Lantern Designer's DrawingEditorMode and the Page Layout System):
  config and config state; scale manager (D27) and paper layout solver;
  sheet model and sheet records (sheets, layers, viewports, annotations,
  dimensions in `LayoutEditor__DrawingsData__Sheets`, ids, defaults, title
  block fields from the project); sheet chrome (one primitive list drawn to
  SVG and to jsPDF, text measured through jsPDF metrics) with the Modern
  and Classic title blocks (D26); sheet surface (paper at
  ScreenPixelsPerMm, CSS-transform zoom, frames, chrome, markup and
  selection layers); navigation (wheel zoom about the cursor, middle or
  right drag, pinch, fit); viewport handles (2D edges crop or extend while
  the drawing stays put and the inside pans, corners inert, D29; 3D corners
  scale proportionally, edges crop, inside moves the picture, D30); the 2D
  viewport (window maths, underlay cache with a slide-while-dragging
  picture, linework from cache, baked asset or on-device render, paper
  stroke widths from the new `LayoutEditor__Linework__Config`); the 3D
  viewport (fingerprinted snapshot, uploaded to
  `LayoutEditor/Snapshots/` on localhost and referenced on the record,
  D36); snapshot renderer (offscreen 2D through the section adapter and
  presets on a private ortho camera, offscreen 3D from the scene pose with
  visibility, sections and camera restored); assets; markup bridge (scene
  markup at scale, Import From Scene, sheet markup with leaders and
  measured sheet dimensions, hit testing, D34); dimension geometry; sheet
  tools (select, move, resize, text placement with an inline editor,
  two-click dimensions, keyboard); panel host (foldable sections, height
  and width grips, delegated controls, D32) with the Sheet, Layers (D31),
  Viewport, Text, Dimensions and Styles (D33 plus Hidden Lines) panels;
  toolbar; PDF exporter (D35); tab strip (D22 to D24); mode controller;
  Dev menu section (sheets, New, Duplicate, Delete, Save, Bake Snapshots
  and Linework, Export PDF, Leave); two stylesheets.
- **Shell.** index.html gains the Layout Editor Dev item, imports and
  initialisation; the CSS index imports the two sheets; every rule anchored
  to the header height now adds `--Vale_LayoutTabStripHeight`, which the
  tab strip publishes, so the canvas, breadcrumb, carousel, menus and help
  panel shift down together while sheets exist.

### Changed
- **Whitecardopedia service worker** token bumped to `2026-09-10-1` for the
  shell edits.

### Notes
- Scene markup in a viewport is drawn statically; editing it is done in
  the drawing (Edit In Drawing), which keeps one editor per record. Sheet
  mode holds the sheet's own layers; Import From Scene copies across.
- A sheet dimension attached to a 2D viewport reports paper length times
  the scale denominator, so it measures the model.
- Hand-over test list: plan document section 11.6. Purge the localhost
  service worker and caches before testing.

# ---------------------------------------------------------
## ValeVision3D v2.20.0 - 09-Sep-2026 - Projected Linework on Drawings (Port Phase 4)

### Overview
Exact vector linework over every plan, elevation and section. The live model
is read out into plain numbers, cut at the drawing's plane, turned to face
the drawing and clipped for occlusion by the Lantern Designer's projection
engine, off the main thread where workers are available. The result is
painted in an SVG layer over the composer render, registered to the drawing
camera with one transform per frame, drawn into exported images, baked to R2
on localhost so the web build never computes it, and kept in the browser so
a reload does not refetch. Ported from the Lantern Designer's
27__System__ProjectedEdges2d with the kernel set verbatim.

### Added
- **50__System__ProjectedLinework**, twenty-three files. Verbatim (headers
  restyled, identifiers renamed): the clip kernel, the flat BVH, the clip
  worker and worker pool (both now carry hidden line segments back), the
  scheduler, the Diff harness, the raster preview and the WebGPU backend.
  Adapted: the soup builder (signed permutation fast path or a 3x3 rotation
  for free bearings, D40), the edge extractor (instances rather than
  meshes, a viewer vector for the silhouette test, edges split at the cut),
  the stage sampler (samples the live model root, honours visibility and
  helper flags, expands InstancedMesh, applies the exclusion tokens D19,
  treats transparent material as non-occluding unless Glass Transparency
  Off is set, clips triangles at the cut and the view depth, collects the
  section outline), the model stage (fingerprint and bounds tree priming),
  the projector (three backends behind one entry point), the CPU backend
  (four line classes), the pipeline (one drawing at a time, realtime
  debounce, cache, asset before compute, triangle ceiling), persistence
  (R2 asset per drawing with a reference in the record, IndexedDB copy,
  bake before save D20), the SVG overlay and config access. New: the view
  definition (record to basis, cut and fingerprint), authored edges from
  the SketchUp linework GLBs (D18), the export compositor and the Dev menu
  section (enabled, backend, Force Render, Bake All, Clear Cache, Diff,
  timings, per-drawing asset status).
- **Line classes.** visible, hidden (dashed: what the occluders cover plus
  everything between the viewer and the cut, only with the record's Hidden
  Lines toggle, D21), authored, and section (the outline of cut material,
  Doous dark grey). Widths are true drawing millimetres and scale with the
  drawing.
- **Config.** `Na__ProjectedLinework__AppConfig__.json` with render,
  projection, performance, preview, persistence, appearance, exclusions,
  model and label blocks; the Main.json exclusion tokens override.

### Changed
- **Section adapter.** FIX: a vertical drawing plane kept the viewer's side
  of the model, so a section showed the near facade instead of the cut. The
  tool's normal now points away from the viewer and live distance updates
  carry the same sign. `GetPlaneDefinition` added.
- **Composer preset** offers image export overrides for drawings (ortho
  camera, 2D profile pre-pass, frustum widened to the export aspect keeping
  the visible height); **index.html** chains them after the legacy
  Elevation View's.
- **Image export** draws the projected linework over the finished image
  when a drawing is on screen.
- **Floor plan and elevation controllers** announce a style change; the
  **editors** bake linework assets before the drawings save; **Toggle
  Model Elements** announces a visibility change; the **loading sequence**
  registers the overlay every frame in the drawing branch. **index.html**
  gains the Projected Linework dev section, imports and initialisation;
  the **CSS index** imports the sheet.

### Before testing
- Purge the shared service worker on localhost (token 2026-09-09-4).
- Workers load `Na__ProjectedLinework__ClipWorker__.js` by relative URL;
  Flask serves it as a module like any other file. If the pool cannot
  start the kernel runs inline on the main thread and says so.
- The hand-over test list is section 10.4 of the plan document.

### Note
- Not run in a browser. Every module passes a syntax check and every import
  resolves to an export. The kernel files are diff-able against the Lantern
  Designer originals apart from the header block and the identifier rename.

# ---------------------------------------------------------
## ValeVision3D v2.19.0 - 09-Sep-2026 - Elevations and Sections (Port Phase 3)

### Overview
Elevations and sections as drawing pages. An elevation is the building seen
head-on through an orthographic camera from a chosen compass bearing; a section
is the same drawing with a vertical cut applied through the existing Cross
Sections tool. Both are authored from a new Elevations panel in the Dev menu,
filed into the Elevations or Cross Sections scene group by drawing type (D28),
and carry the same annotations, dimensions and style toggles as the floor
plans. Ported from TrueVision's elevation folder onto the Phase 2 seams, with
face picking and a draggable plane gizmo added as the plan decided (D16). Every
plan cut and section drawing now uses the Doous section look, dark grey poche
and profile, in place of the tool's light default.

### Added
- **46__System__ElevationViews.** Config, ortho camera, framing and plane
  gizmo ported verbatim (the config gains the section group, face pick and
  grip setups; the gizmo an additive face mesh export). The data module
  reads the drawings block and carries styles, exclusions, the linework slot
  and where a record was seeded from. Scene link files a section into Cross
  Sections and an elevation into Elevations, and moves the card when the
  type changes. The mode controller and Dev panel are adapted to the
  section adapter, presets and shared transitions. New: **Pick Face** (a new
  elevation aimed at a clicked wall) and **Re-pick** (an existing row) using
  the legacy elevation tool's raycast rules, and the **gizmo grip**, a drag
  along the plane's normal with a throttled recut in section mode and an
  exact recut on release; the sliders remain the precise path and show
  where a drag landed. Seed N / E / S / W and Save Thumbnail as in
  TrueVision; the row also carries the shared style toggles and the
  exclusion field.
- **Na__DrawView__ConfigState__.js** (42). One reader for the drawing
  config: main config over system JSON over built-in fallbacks. Carries the
  section appearance the adapter applies, the Doous dark grey fill and line
  at 2 px (`DrawingView__Config__Section*` in Na__AppConfig__Main.json
  overrides it).
- **Na__DrawView__StyleRows__.js** (42). The four style toggles and the
  exclusion field, built once for plans and elevations from record
  accessors.

### Changed
- **Section adapter.** Applies the drawing colours while the live tool is
  parked (the tool's own colours come back with its sections); new
  SuspendLiveTool holds the tool parked with or without a plane, so a plain
  elevation shows the building whole with the author's sections out of the
  way and a flip between a section and a plain elevation does not rebuild
  them in between; new Release hands the tool back. Plane name prefix read
  from config.
- **Composer and material presets** read through the config state instead
  of fetching or receiving config themselves.
- **Floor plan row builders** use the shared style rows; the **floor plan
  mode controller** holds the tool on entry and releases it on exit,
  matching the elevation controller.
- **index.html** gains the Elevations dev section, the config state
  bootstrap and the elevation initialisation block (gizmo, face pick, grip,
  mode controller, Dev panel). **Loading sequence** hands resize to the
  elevation controller. **CSS index** imports the elevation sheet.
  **Na__DrawView__AppConfig__.json** and **Na__AppConfig__Main.json** carry
  the section colour keys.

### Before testing
- Purge the shared service worker on localhost (token 2026-09-09-3).
- The Phase 2 worker deploy and Flask restart still apply if not yet done
  (Save Thumbnail uses the asset route).
- The hand-over test list is section 9.3 of the plan document.

### Note
- Not run in a browser. Every module passes a syntax check, every import
  resolves to an export, and the verbatim ports are line-for-line against
  TrueVision.

# ---------------------------------------------------------
## ValeVision3D v2.18.0 - 09-Sep-2026 - Drawing Substrate, Floor Plans, Annotations, Dimensions, Client Measuring (Port Phase 2)

### Overview
The first 2D drawings. A floor plan is a section cut at a chosen height seen
through a top-down orthographic camera, authored from a new Floor Plans panel in
the Dev menu, filed into the Floor Plans scene group as a carousel card, and
carried into the drawing with its own annotations and dimensions. Ported from
TrueVision v2.19.0 across four new module folders, with the drawing render and
cut engine seams re-plumbed onto ValeVision's own composer and Cross Sections
tool as the plan decided (D07, D12).

### Added
- **42__System__DrawingViewCore.** The seam every 2D drawing shares.
  Ported: the active view broker (ActiveView), the shared pan and zoom
  (Navigation), the markup mount order (MarkupMount), the focus arbiter
  (MarkupFocus, relocated here from the TrueVision floor plan folder) and the
  scene link row. New: the section adapter driving the existing Cross
  Sections tool as the cut engine, the composer preset (RenderPass camera
  swap, fog and AO off, paper background, ortho-aware profile pre-pass at a
  fixed width), the reversible material preset (Glass Transparency Off,
  Whitecard under MaxEngine), the drawings project data owner and the shared
  transitions (suspend 3D, fly, register with the carousel).
- **43__System__FloorPlanViews.** Config, ortho camera, framing and scene
  link ported verbatim; the data module reads the drawings block and carries
  the four style toggles, the exclusion list and the linework asset slot; the
  mode controller and Dev panel adapted to the seams. Add Ground Floor Plan
  is the one-click start; Seed From Model Storeys degrades to its message.
- **44__System__PlanAnnotations** and **45__System__PlanDimensions.** Ported
  near-verbatim, twenty-one files. The dimension data module is split into a
  record layer and a config layer, and the dimension editor's rubber-band
  preview moved to its own module, so every file stays inside the line
  budget. Client measuring (red, ephemeral, behind the disclaimer) ships with
  them, gated by the Let clients measure toggle on the Floor Plans panel.
- **Na__AppUtils__R2AssetUpload__.js** and **Na__AppUtils__SnapshotHistory__.js.**
  The binary asset twin of the R2 save utility (worker first, Flask mirror),
  and the ported undo snapshot stack.
- **Worker asset route.** `POST /api/editor/projects/{folderId}/assets` in
  `CloudflareHandler__ProjectAsset__.js`, path-guarded to thumbnails, baked
  linework and snapshots; bumps the build manifest like a project save. Flask
  mirror at `/api/projects/<folder_id>/assets`.
- **Data.** New top-level project.json block `LayoutEditor__DrawingsData`
  (floor plans, elevations, sheets, the client measuring grant). Scene links
  stay on the scene inside the presentation block.

### Changed
- **Cross Sections tool.** Three additive exports (GetSectionById,
  SetSectionPositionMm, ReapplyClipping) and the scene data listener skips
  the synthetic approach scene a drawing flies to, so the drawing cut is not
  cleared mid-flight.
- **Scene transition** forwards isDrawingApproach on na-pm-scene-activated.
- **Thumbnail renderer** takes a frame renderer from the composer preset so a
  captured card is the drawing as shown; the 3D path now draws the section
  overlay into the frame; CaptureAndUpload writes through the asset route.
- **Loading sequence** dispatches na-layouteditor-drawingsdata-loaded, runs a
  2D drawing branch ahead of the 3D per-frame work, and hands resize to the
  floor plan controller. **index.html** gains the Floor Plans dev section and
  the drawing initialisation block. **Na__AppConfig__Main.json** gains the
  Drawing2d profile keys, DrawingView__Config, ProjectedLinework__Config and
  LayoutEditor__Config. The hotkey dictionary documents the contextual markup
  keys in the advanced fold. The navigation pill hides while a drawing is up.
  Add Scene From Camera refuses while a drawing owns the viewport and
  drawing scenes lose their Update Camera button.

### Before testing
- Deploy the worker (`CloudflareWorker/Deploy__Worker.bat`) for the asset
  route and restart Flask for the mirror endpoint; without them Save
  Thumbnail fails with a red toast and everything else still works.
- Purge the shared service worker on localhost (token 2026-09-09-2).
- The hand-over test list is section 8.8 of the plan document.

### Note
- Not run in a browser. Every module passes a syntax check, every import
  resolves to an export, and the ports are line-for-line against TrueVision.

# ---------------------------------------------------------
## ValeVision3D v2.17.0 - 09-Sep-2026 - Presentation Mode Scene Groups (Port Phase 1)

### Overview
Saved scenes can now be split into named groups (Exterior 3D Views, Interior
3D Views, Dollhouse View, Floor Plans, Elevations, Cross Sections, or whatever
a job needs). The carousel shows one group at a time and a small pill above its
top-left corner names the group, counts its views and opens the list. Ported
from TrueVision v2.11.0 with the router hook from v2.18.0, so the floor plan
and elevation systems that follow in the next phases can take over a scene
card the moment they register. Naming stays Na__ throughout: ported files keep
their TrueVision names so the two trees diff cleanly (plan decision D04 as
corrected on 09-Sep-2026).

### Added
- **Na__PresentationMode__SceneGroups__Data__.js v1.0.0.** Pure data layer:
  reads and validates the groups array, resolves every scene to exactly one
  enabled group (fallback to the first enabled group, so nothing can vanish),
  sorts into (Group Order, Scene Order) playback order, renumbers Scene Order
  1..N inside each group, and steps across group boundaries. Verbatim port.
- **Na__PresentationMode__SceneGroups__AppConfig__.json.** Behaviour flags,
  labels, Dev menu wording and the default group set. Six groups, only the
  first enabled: the five TrueVision defaults plus Cross Sections.
- **Na__PresentationMode__UI__SceneGroupSelector__.js v1.0.0.** The pill and
  its upward-opening list. Mounts inside #naPresentationCarousel so it shows
  and hides with the strip; choosing a group re-aims the strip without moving
  the camera. Verbatim port.
- **Na__PresentationMode__DevMenu__GroupEditor__.js v1.0.0.** Collapsible
  Scene Groups section at the top of the Presentation Scenes panel: enable,
  rename, count, reorder, delete, Add Group. Seeds the default set in memory
  only; never saves for itself, it raises na-presentation-groups-changed and
  the scene editor writes. Prompts use the ValeVision confirm dialog.
- **Na__PresentationMode__DevMenu__SceneRowBuilders__.js v1.0.0.** The scene
  row moved out of the editor: drag handle, position title, move arrows, Name,
  Group dropdown (enabled groups only), FOV, Move Speed, Easing, Position and
  the four action buttons.
- **Na__PresentationMode__DevMenu__SceneReorder__.js v1.0.0.** Per-group
  array moves (slice bounds, clamped move, drop index) and the native drag and
  drop wiring, taking the scenes array and config as arguments.
- **Na__PresentationMode__DevMenu__ScenePersistence__.js v1.0.0.** The
  editor's two writes moved out unchanged: the GET-merge plus R2-first
  project.json save and the Flask thumbnail upload.
- **Na__PresentationMode__Styles__SceneGroupSelector__.css.** Pill, list,
  empty-group message, Dev group section, group headings and the row controls
  the port brought across (drag handle, reorder buttons, drop indicators).

### Changed
- **Na__PresentationMode__ProjectJson__SceneData.js v1.2.0.** GetSortedScenes
  and GetDefaultScene use the group-aware playback order; an ungrouped project
  sorts exactly as before. New GetActiveProjectCode and BroadcastScenesChanged.
- **Na__PresentationMode__UI__SceneCarousel.js v1.2.0.** Shows the active
  group only, keeps the bar standing when it rebuilds, shows a message for an
  empty group, steps across groups with the chevrons (three documented cases,
  including entering a group at its edge after a dropdown re-aim), and routes
  every navigation through one path that first offers the scene to any
  registered router (Na__PresentationMode__UI__AddSceneNavigationRouter).
- **Na__PresentationMode__DevMenu__SceneEditor.js v1.3.0.** Rows clustered
  under fold-down group headings (folded by default, open state remembered
  across rebuilds), reordering confined to a scene's own group by arrows, drag
  handle or Position field, the Group dropdown as the only way between
  groups, new scenes filed into the group the carousel shows, and one
  mutation tail (renumber, commit, save, rebuild) for every row action.
- **index.html.** Imports the selector and initialises it directly after the
  carousel. **Na__CoreUi__Styles__Index__.css** imports the new sheet after
  the carousel sheet.

### Where the data lives
- Groups nest inside PresentationMode__SavedCameraScenes under __Groups, with
  a per-scene PresentationMode__Scene__GroupId (plan decision D08). The
  Whitecardopedia sync only patches its own keys inside that block, so groups
  survive a SketchUp re-sync, and the existing Save All path already writes
  the whole block. A project whose scenes were auto-built from SketchUp camera
  data gets its explicit scenes block materialised on the first group save.
- Scene Order restarts at 1 inside each group. A project with no __Groups
  array reads as ungrouped: no bar, flat order, byte-identical behaviour.

### Note
- Not run in a browser. Every new module passes a syntax check and the port is
  line-for-line against TrueVision, but the pill, the dropdown, the reorder
  paths and the save round trip have not been exercised on a live project.
  Purge the shared service worker on localhost before testing.
- ValeVision__PARITY__TrueVisionLedger__.md created in the ValeVision root and
  seeded with the Phase 0 and Phase 1 module pairs.

# ---------------------------------------------------------
## ValeVision3D v2.16.0 - 09-Sep-2026 - Three r184 Version-Locked Library Set (Port Phase 0)

### Overview
First step of the TrueVision drawing systems port and the Layout Editor, planned in
ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md (decisions D01 to D40). The
projected linework engine that the plans, elevations and sheets will draw with was
built in the Lantern Designer against three r184 with three-mesh-bvh and
three-edge-projection as one locked set, so ValeVision moves to that same set
first. Every later phase is then built and tested on the final libraries rather
than on a build that would have to change under it.

### Added
- **04__Lib__ThirdParty__VersionLocked/.** Byte-identical copies of the Lantern
  Designer vendor folders 01 (three 0.184.0, full build and addons tree), 02
  (three-mesh-bvh 0.9.9) and 04 (three-edge-projection 0.0.10 at f794481), plus
  Vale__Dependencies__ImportMap__Index__.json as the path SSOT and a README. The
  folder numbering is kept so the two apps read as one set; 03 (clipper2-js) is
  not needed here and is not copied. jsPDF stays where it was.
- **ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md.** The plan for the whole
  port: scope, decisions, source maps, naming discipline, the project.json data
  model, six phases with hand-over test lists, the risk register and the file
  map that seeds the parity ledger.

### Changed
- **index.html.** The import map now targets the version-locked set and carries
  the same keys as the Lantern Designer (three, three/addons/, three/webgpu,
  three/tsl, three-mesh-bvh and three-edge-projection, with their worker and
  webgpu variants), so the projected linework modules port without edits.
- **Shared PWA service worker** (Whitecardopedia__Pwa__ServiceWorker__Logic__.js
  v1.0.4 and the live_sw.js copy). Shell precache paths repointed to the new
  folder, three.core.js added because the r184 module build imports it, and
  PWA_SW_VERSION_TOKEN bumped to 2026-09-09-1 so warm caches do not serve the
  old module graph beside the new import map.

### What was checked against the r184 sources
- Logarithmic depth is unchanged in behaviour: the fragment chunk still writes
  gl_FragDepth = log2(1 + w) / log2(far + 1), so the fog and SSAO inversion
  pow(far + 1, depth) - 1 still holds and the fat-line depth bias patch still
  finds #include <logdepthbuf_fragment> in LineMaterial. The chunks moved from
  three.core.js into three.module.js and the internal define was renamed to
  USE_LOGARITHMIC_DEPTH_BUFFER, which no ValeVision shader references.
- WebGLMultipleRenderTargets no longer exists; ValeVision never used it. The
  synchronous readRenderTargetPixels the Export Render Layers passes rely on
  still exists.
- OrbitControls now extends the Controls base class and connects itself to the
  element passed to its constructor; enabled, target, update, dispose and
  listenToKeyEvents are unchanged, so the orbit, walk and fly hand-offs need no
  edit.
- FXAAShader keeps the resolution uniform as one over the pixel size, so both
  engine setups are untouched, but the filter itself was rewritten upstream
  after r160 and edge softness may read slightly differently.
- EffectComposer, RenderPass, ShaderPass, Pass and FullScreenQuad, MaskPass,
  CopyShader, GLTFLoader, RGBELoader, BufferGeometryUtils and the fat-line
  modules are all present at the same addon paths.

### Note
- 04__Lib__ThirdParty__Three is retained, unused, until the Phase 0 checklist in
  the plan (section 6.3) has been run on a live project. Delete it after that.
- On localhost purge the shared service worker before testing; the token bump
  evicts warm caches on the live site by itself.
- Nothing here has been run in a browser. The checks above were made against the
  vendored sources, not against a rendered frame.

# ---------------------------------------------------------
## ValeVision3D v2.15.0 - 02-Sep-2026 - Video Studio: Keyframe Timeline Replaces the Transport Slider

### Overview
Composing a walkthrough meant reading an unlabelled range slider and a scrolling
column of near-identical keyframe rows. Neither told you what any shot actually
looked like or when it happened. The Video Studio panel's Play / Stop / scrubber
row is gone, and in its place is a timeline across the bottom of the screen
showing every keyframe as the shot it is, at the moment it happens, with a ruler
under it. Right-clicking a shot opens a context menu that edits it in place.

Only one thing is ever at the bottom of the screen: opening a video path hides
the Presentation Mode scene carousel and closing it puts the carousel back
exactly as it was. Two strips both calling themselves scenes was the confusion
this replaces.

### Added
- **Na__VideoStudio__Timeline__Controls.js v1.0.0.** The strip itself: transport,
  keyframe tiles, ruler, playhead and scrubbing. Tiles are positioned by
  percentage of the total duration inside an inset lane, so the shot at time zero
  and the shot at the end both sit inside the strip rather than half off it. A
  stem drops from each tile to its tick, which keeps the ruler truthful where two
  shots sit close enough for their tiles to overlap. Single click selects a
  waypoint and lights its viewport marker; double click flies the camera to it,
  the same call `Go To` makes; right click opens the context menu.
- **Na__VideoStudio__Timeline__Thumbnails.js v1.0.0.** Renders and caches the
  still for each waypoint by placing the camera there and rendering one frame
  through the live pipeline. Every render in a burst happens inside one
  synchronous task and the live view is redrawn before the task ends, so the
  browser only ever composites the correct frame and the whole thing is invisible
  on screen. Cached against a signature of the waypoint's camera block, lens and
  the path's model layer state, so a dragged waypoint costs one frame rather than
  a rebuild. Bursts are capped at eight frames and suspended while an MP4 export
  owns the renderer.
- **Na__VideoStudio__Timeline__ContextMenu.js v1.0.0.** Right-click editor for one
  keyframe: Travel Time, Hold Time, Match Current Camera, Camera Lens, and a
  collapsed Advanced Camera Settings section holding Camera Height in millimetres
  and Camera Tilt in degrees from the horizon. Every field commits through the
  data layer and records an undo entry, so Ctrl+Z steps back through menu edits
  as it does through a waypoint drag. A Delete Keyframe action sits at the foot
  behind a destructive confirmation.
- **Na__VideoStudio__Timeline__Stylesheet__.css v1.1.0.** Strip and context menu,
  scoped to `.na-vs-tl__*` and `.na-vs-menu__*`.

### Changed
- **Na__VideoStudio__Camera__PathSampler.js v1.1.0.** New
  `GetKeyframeTimes(timeline)` reports the clock time the camera reaches each
  waypoint. It lives here because a leg's easing ramp stretches the travel either
  side of its cruise, so the authored travel times alone put every mid-leg
  waypoint in the wrong place on a ruler. A new `InvertLegWarp` bisects the ramp
  to answer the question exactly, twenty-four halvings resolving a sixty-second
  leg to far finer than one pixel.
- **Na__VideoStudio__ProjectJson__VideoData.js v1.2.0.** `SetActiveKeyframeId`
  now dispatches `na-video-studio-keyframe-selected`. Selection reaches this
  module from the panel's Go To, a click on a viewport marker, a drag, an
  insertion and the timeline's tiles; announcing it from the single place that
  records it is what lets a viewport click highlight a tile and a tile click
  highlight a marker with neither module knowing the other exists.
- **Na__VideoStudio__DevMenu__Controls.js v1.2.0.** The in-panel transport is
  removed. `SyncTransportButtons` forwards to the timeline so the spacebar hotkey
  and the strip cannot disagree. A new `SyncTimeline` decides from the panel's own
  state whether the strip is up, called from `RenderPanel` and the fold toggle, so
  no individual call site can leave it behind after a delete or a fold. The panel
  also registers the thumbnail render context and hands the context menu the one
  refresh routine that knows what a keyframe edit has to update.
- **Na__VideoStudio__Stylesheet__.css v1.2.0.** Preview Transport block deleted.
- **index.html.** Timeline container added beside the carousel, and
  `Na__VideoStudio__Timeline__Initialize` runs before the Dev menu that drives it.

### Note
Deleting a waypoint from the context menu is recorded as a structural undo entry
before the removal, exactly as the Delete hotkey already was, so Ctrl+Z puts it
back in its place in the running order. The confirm dialog says so and states the
real limit alongside it: the history is cleared when the Video Studio panel closes
or another path is opened, so it is a safety net for the editing session and not
beyond it.

# ---------------------------------------------------------
## ValeVision3D v2.14.7 - 21-Aug-2026 - Walk and Fly Enabled by Default

### Overview
Walk and Fly were opt-in: a model only got them once someone ticked the boxes
in the dev menu Navigation Modes panel and saved the block into project.json.
Every new job therefore shipped orbit-only until it was remembered. That is now
inverted — all three modes are on for every model, and a job opts a mode out by
unticking it and saving, which writes an explicit false.

### Changed
- **Na__NavigationModes__State.js v1.1.0.** Walk and Fly module flags default to
  true. New `ResolveModeFlag` helper gives the opt-out reading: only a literal
  `false` (or legacy `"false"`) disables a mode, so an absent key, an absent
  block and a project.json written before the key existed all resolve to
  enabled. `SetEnabledModes` no longer early-returns on a missing block, and a
  new `GetEnabledModes` reads the resolved pair back in project.json shape.
- **Na__AppFlow__LoadingSequence.js.** The `Navmode__EnabledModes` guard is gone:
  the setter runs and `na-navigation-modes-loaded` fires on every project load.
  The event now carries the *resolved* flags from `GetEnabledModes` rather than
  the raw block, so listeners always receive real booleans. Without this, a
  project.json with no nav block never fired the event and the Walk/Fly UI stayed
  hidden regardless of the new defaults.
- **Toolbar, help panel and dev menu.** All three listeners switched from
  `Boolean(key)` to `key !== false` to match the opt-out semantics. The help
  panel now takes `walkEnabled` / `flyEnabled` at init and reveals its Walk/Fly
  instruction sections immediately, which also covers a session opened with no
  `?project=` code. The dev menu checkboxes are ticked in markup and seeded from
  the state getters instead of hardcoded false.
- **Na__AppConfig__Main.json.** Global `Navmode__EnabledModes` defaults flipped
  to true with the description rewritten to state the opt-out rule.

### Note
Orbit is unchanged: it is always available and is never stored in the block.
Existing project.json files that explicitly hold `false` keep their setting, so
any model deliberately locked to orbit stays that way.

# ---------------------------------------------------------
## ValeVision3D v2.14.6 - 21-Aug-2026 - MAT000E__ Glazing: SketchUp Opacity Reaches PureEngine

### Overview
A balcony balustrade painted `MAT000E__Glass__Balcony` at 30% opacity in
SketchUp arrived in ValeVision as a solid white panel, blocking the elevation
behind it. Three separate places were flattening it, and all three are fixed so
the SketchUp Materials tray Opacity slider is now the single control for exempt
glazing — no new SSOT entry, no MAT###__ index required.

The `E` in `MAT000E__` was already an exemption from *material stripping* and
from *whitecard replacement*; it now also carries opacity. Indexed `MAT###__`
materials are untouched — their alpha still comes from the materials library,
and they still whitecard opaque under PureEngine as before.

### Fixed
- **Exporter wrote alpha 1.0 regardless.** `Na__MaterialEngine__EnsureMaterialRegistered`
  in the GLB Builder built `baseColorFactor` with a hardcoded `1.0` alpha and only
  ever set `alphaMode` from a materials-library `Opacity` key, which exempt
  materials by definition do not have. Non-indexed materials now read
  `Sketchup::Material#alpha` and write it as `baseColorFactor[3]` plus
  `alphaMode: "BLEND"` and `doubleSided: true`. See GLB Builder MaterialHandling
  v3.1.1.
- **The model loader threw the material away.** `Na__ModelLoader__LoadSingleMesh`
  routed every untextured non-indexed material to the shared opaque whitecard, so
  an untextured glazing material lost its name and its alpha before any materials
  pass could see it. Transparent `MAT000E__` materials are now preserved (clone +
  `transparent` + `depthWrite: false`), textured or not.
- **The PureEngine lift would have made glass glow.** `ApplyExemptTextureBrightness`
  wires the diffuse map into `emissiveMap` to pull fake-detail textures up to
  whitecard luminance. Transparent exempt slots are glazing rather than fake
  detail, so they are now skipped.

### Also
- Exempt glazing meshes opt out of `castShadow`. Shadow maps ignore opacity, so
  glass would otherwise drop a solid silhouette onto the geometry behind it.
- MaxEngine needed no change: its swap pass only touches indexed names, so exempt
  glazing carries through both engines and survives engine switching.
- Catalogued as a reusable material: `MAT105__GenericGlass__WhitecardTranslucent`
  in the DataLib SSOT (`Na__DataLib__CoreIndex__Materials__.json` v1.4.1), whose
  `SketchUpName` is `MAT000E__Glass__WhitecardTranslucent`. The library key/name
  split means every plugin reading the DataLib can discover and create it, while
  the SketchUp-side name keeps the `MAT000E__` prefix that all of the above
  plumbing already keys off — so no further viewer or exporter code was needed.
  The entry is a reference recipe, not a render-time override: exempt materials
  take their colour and opacity from the SketchUp material itself.

# ---------------------------------------------------------
## ValeVision3D v2.14.5 - 21-Aug-2026 - Fix: Views Bar Thumbnails Survive an Image Re-Sync

### Overview
Cloud Sync exports a fresh date-stamped image edition on every run and purges
the one before it, but the PresentationMode__Scene__ThumbnailUrl baked into
project.json was never re-pointed, so every Views bar thumbnail 404'd after an
image re-sync on both the R2 primary and the GH Pages fallback. Found on
2026/3047__Doous, whose six scenes still named 13-Aug-2026 files after the
21-Aug-2026 sync. ResolveThumbnailUrlPair in
Na__PresentationMode__ProjectJson__SceneData.js now checks the stored filename
against the live project.json "images" array and re-derives the current name
from the matching IMG## slot when it has gone stale, warning to console with
the substitution. A valid stored name, an absolute URL, an unregistered image
list and a slot no longer exported all pass through untouched, and IMG01__
never resolves to IMG01_ART20__. Na__AppFlow__LoadingSequence.js registers the
live array through the new SetActiveImageList. The auto-built scene path was
never affected because it already derives filenames at load; this gives the
explicit-scene path the same guarantee. Sync-side counterpart in
Whitecardopedia v0.6.17.

# ---------------------------------------------------------
## ValeVision3D v2.14.4 - 19-Aug-2026 - Export Render Layers: Approximations Removed

### Overview
Five passes deleted, and the code they justified deleted with them. Every one
was an engine-generated approximation of something a learned detector produces,
and every one was worse than a map ValeVision can derive exactly. Keeping them
meant maintaining a shader family, a config surface and a segment-chaining
algorithm to produce output nobody should choose.

### Removed
- **MLSD Lines.** The geometric filter over the CAD linework worked in the sense
  that it selected segments, but it exported a blank frame in the last two
  batches and was never root-caused. The condition it was meant to supply
  (long straight architectural lines) is already carried better by Line Art and
  by the inverted Canny, both of which come from the same linework without a
  filtering step that can silently select nothing.
- **Exact Linework Buffer.** Its purpose was diagnosing which edges the SketchUp
  export delivered. Line Art answers that question directly and is a deliverable
  as well, so a second raw view of the same data earned nothing.
- **HED-compatible Map.** It was labelled an approximation from the first
  commit because it was one: smooth structural gradients plus a luminance term,
  shaped to suit an HED input rather than produced by a learned HED network.
- **Scribble Map.** Deliberately coarse by design, and for an orangery that
  meant deliberately discarding the glazing bars that make the building read.
- **Soft Edge Map.** The antialiased sibling of a Canny that is now derived from
  exact linework instead, which leaves nothing for a softened version of a
  guess to add.

### Cleaned up
- Deleted `Na__ExportRenderLayers__Pass__MlsdLines__.js` outright, including the
  collinear chain-merging algorithm and its endpoint quantisation.
- `Na__ExportRenderLayers__Pass__LineArt__.js` lost its last pass and is now
  `Na__ExportRenderLayers__ExportLineMaterial__.js`, holding only the shared
  fat-line material and the beauty-exporter width-compensation convention that
  Gray Control still needs. That convention is easy to get wrong, so it keeps
  its own file rather than being inlined.
- The full screen shader lost four derivation modes (Soft Edge, HED, Scribble
  and the Profile Edge overlay the old Line Art composite used), the six
  uniforms that fed only those branches, and their entries in the manifest's
  threshold record. The remaining modes are renumbered compactly. Every
  declared uniform is now read by something; the edge section is one branch.
- Ten AppConfig keys removed. The config had grown tuning knobs for detectors
  that no longer exist.

### Result
- 16 passes, 6 essential: Beauty, Clay, Depth, Normal, Canny and Line Art.
- Every remaining structural pass is derived exactly rather than inferred, with
  the single deliberate exception of True Canny, which is kept off by default
  for comparison against the inverted linework.

# ---------------------------------------------------------
## ValeVision3D v2.14.3 - 19-Aug-2026 - Canny From Linework, and Two Real Bugs

### Changed
- **Canny Edges is now the Line Art render inverted**, not a derived edge
  detection. ValeVision already knows exactly where every edge is, so running a
  detector over a raster to rediscover them can only lose accuracy. The inverted
  linework is sharper, complete and correctly hidden-line removed. Inversion is
  a single composited fillRect using the difference operator against white, so
  it costs nothing at 6144x4096 and never touches a pixel array.
- **The derived detector survives as True Canny**, off by default, so the two
  can be compared and a workflow that genuinely wants detector output has one.

### Fixed
- **The sRGB output target was a regression and is reverted.** Making the target
  sRGB was meant to round-trip authored ID colours, but Three then gamma-encoded
  the raw bytes this system's own shader writes. Measured on a real export: the
  Normal map's sky should be 128,128,255 and the shader wrote linear 0.789, but
  the file contained byte 230 rather than 201 - an exact sRGB encode of the
  intended value. Every data pass was lifted the same way. The target is back to
  NoColorSpace, and the authored-colour problem is fixed at its actual source
  instead: the ID mask materials now set their hex in the working colour space,
  so Three skips the conversion and the byte written is the byte the manifest
  promises.

### Found, and now controllable
- **A mesh is covering the sky in the Doous model.** Every structural pass reads
  the sky as geometry: the Silhouette mask comes out solid white, the Normal
  buffer never shows its background, and Depth only looks right by coincidence
  because the far clamp is also black. It is invisible in a Beauty render
  because it is white. `ExportRenderLayers__Config__ExcludeNameTokens` now
  excludes matching objects from the structural set by name, defaulting to
  Sky, Backdrop, Dome and Horizon, and the classifier logs what it dropped.

### Still open
- **Four passes exported pure white and byte-identical**: Linework Buffer,
  MLSD Lines, Shadow Mask and Silhouette Mask. Silhouette is explained by the
  sky mesh above. The other three are not yet root-caused; MLSD reports 45,469
  segments kept from 252,875, so its geometry filter is working and the failure
  is downstream of it. MLSD is the one remaining broken essential.

# ---------------------------------------------------------
## ValeVision3D v2.14.2 - 19-Aug-2026 - Export Render Layers: Line Art on the Real Renderer

### Changed
- **Line Art now renders through ValeVision's own profile-line pipeline**
  rather than a hand-rolled edge composite. Structural surfaces go flat white
  and unlit, ambient occlusion is switched off for the duration, and what is
  left on the page is the profile-line pass plus the exact CAD linework. That
  renderer has been tuned against real Vale models for years; the composite was
  never going to beat it. Line Art is now a COMPOSED pass alongside Beauty and
  Clay, so it also inherits vertical correction and the beauty tile path for
  free.
- **Whitecard Render is renamed Clay Render** throughout: row label, filename
  suffix `__ClayRender__`, config keys, and the preset itself. It is now in the
  essential set and ticked by default.
- **Pose Map is removed from the registry.** It was registered as a permanently
  unavailable row to document the capability gap, which turned out to be noise
  in a panel people actually use. The base-model note in the help text carries
  the useful part of that information instead.

### Fixed
- **Line weights in the structural line passes were roughly three times too
  thin.** LineMaterial resolves its pixel width against its own resolution
  uniform, and the export was setting that uniform to the tile framebuffer
  size, so a line came out one tile-pixel wide instead of scaling with the
  image. The beauty exporter solves it the other way round: it leaves every
  material's load-time resolution alone and multiplies the width by
  outputHeight / tileFramebufferHeight. MLSD, the Linework Buffer and Gray
  Control now follow exactly that convention, so a line carries the same weight
  in a structural map as it does in Beauty.
- **Pixel registration can no longer diverge silently.** The tile interior and
  gutter are configurable for the render layers but hard-coded for Beauty, so
  overriding them would quietly stop the two aligning. The planner now exports
  its defaults and the tiled pass renderer warns when the config differs.
- The capability note read "unavailable, unavailable" on an unavailable row.

### Notes
- **Clay Render and Gray Control are both clay, and they are not the same
  thing.** Clay is the flat neutral edit reference with exact linework, composed
  through the live engine. Gray Control is the lit mid-grey control image the
  Fun Union adapter names. Keeping both is deliberate.

# ---------------------------------------------------------
## ValeVision3D v2.14.1 - 19-Aug-2026 - Export Render Layers: First Export Review

### Overview
Findings from the first real export set (Doous orangery, MaxEngine, 5461x4096)
plus the two selection controls that set was missing. Two of the three fixes are
correctness bugs found by reading the exported manifest against the exported
pixels, not by looking at the images.

### Added
- **Select All, Select None and Essential Only** above the pass list. All three
  are registry-driven. A bulk action never ticks a layer that is unavailable in
  the current scene or still waiting on a category selection, so it cannot queue
  something the export would then reject.
- **`isEssential` on every registry entry**, and the rows carry an "essential"
  note so the Qwen working set is readable without pressing anything. The set is
  Beauty, Depth, Normal, Canny, Line Art and MLSD: the composed edit image plus
  the structural conditions the cited adapter model cards actually list.

### Fixed
- **ID mask colours did not match their own manifest dictionary.** Three converts
  every authored material colour from sRGB into its linear working space on
  assignment, and the export target was `NoColorSpace`, so nothing converted it
  back. `#ef52a7` was landing in the PNG as `(220, 22, 99)` and `#294bb3` as
  `(6, 18, 115)`. Selecting a category by its documented colour was impossible.
  The output target is now sRGB encoded, so Three's own colorspace chunk undoes
  the conversion and the byte written is the byte authored. Passes that write raw
  data through the system's own shader are unaffected, because a ShaderMaterial
  never includes that chunk; their colour uniforms are now set explicitly without
  conversion, which also fixes the `#8080ff` normal background that was landing
  as `(55, 55, 255)`.
- **The depth map was too flat to condition anything.** The range came from
  bounding boxes, and the landscape plane's box straddles the camera, so the near
  end collapsed onto the camera near plane and the far end reached the site
  boundary: 0.1 m to 99.9 m, leaving the whole orangery inside bytes 102 to 191.
  The range is now MEASURED. The G-buffer renders once at 256px, the normalised
  depth of every covered pixel is histogrammed, and robust percentiles give the
  range the image actually occupies. Percentiles rather than min and max, because
  one blade of grass at the camera should not spend half the range.

### Verified against the model cards (19-Aug-2026)
Every essential output was checked against its adapter's own documentation
rather than against memory. All six are accepted, and the check turned up a
base-model split that had been glossed over:

| Pass | Route | Required base |
|---|---|---|
| Beauty | Qwen-Image-Edit-2511, multi-image reference | Qwen-Image-Edit-2511 |
| Depth | Fun Union / InstantX / DiffSynth patch / DiffSynth Union LoRA | either |
| Canny | Fun Union / InstantX / DiffSynth patch / DiffSynth Union LoRA | either |
| Normal | DiffSynth In-Context Control Union LoRA only | Qwen-Image |
| Line Art | DiffSynth In-Context Control Union LoRA only | Qwen-Image |
| MLSD | Fun ControlNet Union only | Qwen-Image-2512 |

- **MLSD and Normal cannot share one graph.** MLSD exists only on the Fun
  Union, which needs Qwen-Image-2512; Normal and Line Art exist only on the
  DiffSynth In-Context Control Union, which needs Qwen-Image. Depth and Canny
  are the only conditions every family carries, which is what makes them the
  safest first test whichever base is loaded. The registry now records the
  required base model per adapter family and the manifest publishes it.
- **Two attributions were overstated and are corrected.** Line Art no longer
  claims Qwen-Image-Edit-2511 as an adapter family, because that card documents
  no ControlNet compatibility at all: a structural map handed to the edit model
  is a reference image, not a constraint. The single `DiffSynth` family is split
  into the Blockwise ControlNet (canny, depth, inpaint, loaded in ComfyUI as a
  model patch) and the In-Context Control Union LoRA (canny, depth, pose,
  lineart, softedge, normal, openpose), because ComfyUI treats them as two
  different artefacts loaded in two different ways.
- The Fun Union's own card lists Canny, HED, Depth, Pose, MLSD, Scribble and
  Gray plus inpainting, and does NOT list Normal or Line Art. The registry never
  claimed it did.

### Notes
- **The depth percentiles are the contrast lever, and they are a real trade.**
  Default 2% to 98%. Tighter gives the building more of the range and clips the
  nearest ground to white and the horizon to black, which is normal for a depth
  map. Wider keeps the whole site gradient. A view with a ground plane running to
  the horizon will always spend range on that ground; hiding the landscape
  category before exporting Depth is the other lever.

# ---------------------------------------------------------
## ValeVision3D v2.14.0 - 19-Aug-2026 - Export Render Layers

### Overview
A new localhost-only developer system that turns a framed ValeVision view into a
folder of pixel-aligned structural maps for Qwen image workflows, plus a
manifest that says honestly what each image is. The point is spatial fidelity:
ValeVision already owns the geometry, so a depth map derived from it beats
running a depth estimator over a whitecard render, and exact SketchUp linework
beats inferring edges from a raster.

Every pass renders at the same camera, crop, dimensions and pixel registration
as the ordinary Beauty export, because both now consume one shared tile planner.

### Added
- **Export Render Layers panel** in the Dev Tools menu
  (`02__Src__AppModules/71__System__ExportRenderLayers/`). Every row is generated
  from the pass registry: an export checkbox, the pass name, a capability note
  derived from registry data, and its own Preview button. Adding a registry entry
  adds a row, a filename and a manifest record with no other edit anywhere.
- **Twenty registered passes** across five groups. Beauty and Whitecard as edit
  images; Depth, Normal, Canny, Soft Edge, HED-compatible and Scribble as
  structural conditions; Line Art, MLSD and the raw Linework Buffer as line
  conditions; Gray, Inpaint, Silhouette and the Category, Object and Material ID
  masks; Ambient Occlusion, Albedo and Shadow as supporting buffers.
- **Structural G-buffer** (`Na__ExportRenderLayers__GBufferPass__.js`): one
  RGBA16F target carrying view-space normals in rgb and globally normalised
  linear view depth in alpha. Coverage rides on the normal's length rather than
  a sentinel alpha, which leaves the whole alpha range for depth. It uses Three's
  logarithmic depth chunks so occlusion matches the live renderer, but the
  exported depth is computed from view space, never read back from the
  logarithmic hardware sample.
- **One global depth range per export** (`Na__ExportRenderLayers__DepthRange__.js`),
  derived from the visible structural bounds rather than the camera's broad near
  and far planes. Per-tile normalisation would reset contrast at every tile
  boundary; a facade spanning four tiles now has one continuous gradient.
- **MLSD collinear chain merging** (`Na__ExportRenderLayers__Pass__MlsdLines__.js`).
  Dropping every segment shorter than N pixels destroys exactly the lines that
  matter, because SketchUp exports one glazing bar as a run of short collinear
  segments. Segments are chained through shared endpoints within an angle
  tolerance, the length test applies to the whole chain, and the survivors are
  baked into a private scene so the live scene graph is never touched.
- **Viewport preview overlay**: a canvas above the WebGL canvas with pointer
  events disabled. The live composer is never put into a debug mode, so
  switching from a Normal preview back to MaxEngine beauty cannot leave ambient
  occlusion or profile lines in a debug configuration. Previews clear themselves
  when the camera moves, an engine switch begins, a scene changes or an export
  starts, so a stale structural snapshot can never read as a live view.
- **Manifest** written last, after every selected image has landed, so a manifest
  on disk means the set beside it is complete. It records the engine, camera
  matrices, the depth range in metres and millimetres, visible categories, edge
  tuning, and per pass the polarity, colour space, background, Qwen adapter
  families and approximation status. HED-compatible and MLSD say plainly that
  they are engine-generated approximations rather than learned detectors.
- **Folder writing** through the File System Access API, with a paced download
  fallback that retains completed Blobs so anything the browser refused can
  still be saved by hand from the panel.
- **`ExportRenderLayers__Config`** in `Na__AppConfig__Main.json`. Thresholds,
  weights, tile sizes, background colours, default selection and the enable flag
  all live there. Aspect ratios and resolutions are reused from
  `ImageExport__Config` rather than duplicated, so a structural map always drops
  beside a normal export without resizing.

### Changed
- **Tile mathematics extracted** from `Na__ImageExport__StaticExport__TiledRenderer.js`
  into `Na__ImageExport__StaticExport__TilePlan__.js`. The beauty exporter's
  behaviour and public exports are unchanged; it simply consumes the planner now.
  This is what makes Beauty and Depth align to the pixel rather than nearly.
- **PWA_SW_VERSION_TOKEN** bumped to 2026-08-19-1.

### Notes on scope
- **Pose is registered as permanently unavailable, not omitted.** Qwen adapters
  accept pose maps, but ValeVision architecture has no semantic human skeleton,
  and a blank pose image is not a useful condition. The row states this.
- **Shadow Mask is off by default and checks availability at runtime**, reporting
  in the row when the renderer has shadows disabled or the scene has no visible
  shadow-casting light, rather than exporting a uniformly white image.
- **Engine neutral by design.** The structural passes never read MaxEngine's
  ambient occlusion or depth pre-pass targets. Those are optional on-screen
  capabilities, and the live AO pre-pass excludes layer-one geometry, which would
  silently drop visible content from an image claiming to describe the scene.
  Depth, Normal, IDs, Silhouette, Line Art and MLSD are therefore equivalent
  under PureEngine and MaxEngine; only Beauty differs, as it should.
- **Isolation is by camera layer, not by hiding objects.** The classifier tags
  the loaded model onto two spare layers and leaves layer 0 enabled, so the live
  viewport is unaffected even mid-export and the default cube, orbit helper,
  grid, ground plane, fog planes and section gizmos are excluded by construction
  rather than by a blocklist.
- **Pass-major memory use.** One layer is rendered, encoded, written and its
  full-size canvas released before the next starts. Ten selected layers allocate
  the same GPU memory as one.

# ---------------------------------------------------------
## ValeVision3D v2.13.1 - 14-Aug-2026 - Video Studio Editing Pass

### Overview
Everything in this entry came out of actually using v2.13.0 to build a
walkthrough. The system worked; editing it did not. Waypoints could only be
placed by re-flying to the spot, nothing could be undone, and the mouse fought
you the whole time. This pass makes the path editable in the viewport, gives it
a history, and fixes two genuine bugs found along the way.

### Added
- **Waypoint editing in the viewport** (`Na__VideoStudio__Viewport__KeyframeDragger.js`):
  drag a numbered marker to move it. Shift drags vertically, Ctrl locks to a
  single world axis chosen from the first real travel, Ctrl+Shift turns the shot
  about world up. Escape cancels. Picking is screen-space rather than by
  raycast, because the markers are non-attenuated sprites whose raycast hit area
  would otherwise shrink with distance; a waypoint 70m away is exactly as
  grabbable as one 3m away.
- **Guide lines during a constrained drag**, coloured to SketchUp's convention
  rather than the Three.js one: blue vertical, red and green for the two ground
  axes, so the axis in play is readable at a glance by anyone who reads SketchUp
  axes all day. A Ctrl+Shift turn has no axis to show, so it draws a purple ray
  along the shot's own view direction instead; purple sits outside the axis set
  deliberately, being a direction rather than an axis.
- **Undo and redo** (`Na__VideoStudio__Edit__UndoHistory.js`): Ctrl+Z and Ctrl+Y,
  fifty steps. Two entry shapes. A drag stores that one keyframe's camera block,
  so undoing a move reverts the move and nothing else; a deletion or an
  insertion stores the whole keyframes array, because putting a waypoint back
  means restoring its place in the running order too. An array snapshot is
  deliberately NOT used for drags: it would quietly revert any lens or travel
  value typed after the drag. Purged when the panel closes, the active video
  changes, or preview starts. Ctrl+Z inside a text field stays the browser's own
  text undo.
- **Click a waypoint and press Delete** to remove it, recorded so Ctrl+Z puts it
  back. Backspace works too.
- **Ctrl+click the path to insert a waypoint there.** Position comes from the
  point on the curve itself so the trajectory does not shift; aim and lens are
  interpolated from the two waypoints it falls between. The leg's travel time
  splits at the same fraction, so total clip duration and the pacing either side
  are both unchanged. Appears in the list as "Inserted Frame 1", 2, 3.
- **Update button** per keyframe row: overwrite that shot with the current camera
  view, including its lens. Pairs with Go To for in-camera tuning.
- **Per-shot lens** as an editable field, 14 to 200mm. Writes through to the
  keyframe's stored FOV, which is what the sampler interpolates, so two
  keyframes with different lenses give a dolly zoom.
- **Aspect ratio**: 3:2 (default), 4:3, 16:9, 1:1, against height standards of
  720p to 4320p. Height and aspect are the source of truth and the width is
  derived, so the pair cannot drift. Because a Three.js camera's fov is the
  VERTICAL field of view and it is left untouched, every ratio renders the same
  vertical extent and simply shows more or less to the sides. Nothing is
  stretched to fit.
- **Safe frame and rule of thirds**, both on by default, reusing the Image Export
  viewport overlay rather than drawing a second one.
- **Advanced Animation Settings**: door swing time in seconds (default 1.2s
  against the 0.6s the app authors) and a detection distance that defaults to
  the same threshold Walk and Fly use.
- **Spacebar plays and pauses** the preview, in Orbit only. Fly binds Space to
  Ascend, and flying with the panel open to stamp waypoints is the core
  workflow, so stealing it there would break the main use of the tool.

### Changed
- **Drag look is now the app-wide default for Walk and Fly**, not just a Video
  Studio mode (`Na__Navmode__*Mode__DesktopControls.js`). Pointer lock made the
  cursor vanish and turned the camera on every scrap of mouse movement, which
  fights any panel sharing the screen: reaching for the Image Export controls
  dragged the view on the way there and the shot was gone before the pointer
  arrived. Marked as a temporary rollout with the original line commented
  directly above the live one; reverting is a one-line swap in each file. Ported
  to TrueVision, which shares this navigation system.
- **Video export renders behind the Image Export spinner** in a new opaque mode,
  with the canvas hidden for the duration and each step reported under the
  spinner (frame N of M, encoded size, a measured estimate of time remaining).
  The overlay controller moved to `Na__AppUtils__LoadingOverlay__.js` so both
  exporters share one implementation.
- Default travel time raised from 3s to 5s. Arrow keys on the Travel fields step
  whole seconds and snap to the grid, while typing still accepts tenths.
- Travel, Hold and Lens moved onto one row, halving the height of a keyframe
  entry. Panel capped at 340px so a wide drag of the Dev Tools shell no longer
  makes it enormous.

### Fixed
- **The Camera Focal Length readout was lying.** It was written in exactly two
  places, at init and when its own slider moved, while nine other modules also
  write camera.fov (Reset View, Walk and Fly entry and exit, saved camera
  configs, Presentation Mode transitions, Video Studio preview and Go To). The
  moment any of them ran, the panel reported a focal length the camera no longer
  had. It now re-reads the live camera on a na-camera-fov-changed event, which
  every one of those paths dispatches. The label shows the true focal length
  even when it falls outside the slider's 24 to 75mm range; showing the clamped
  number would be the very lie this exists to stop.
- **Keyframe capture recorded the wrong lens in Walk and Fly.** It read the
  pre-mode FOV those modes stash on entry, on the reasoning that their wide
  navigation lens was a travelling convenience rather than a chosen shot. Wrong
  in practice: the viewport genuinely renders at the mode's lens, so the
  composition being judged is that lens. Capture now reads the live camera.
- **Doors never opened in a video.** Proximity triggers are owned by the Walk and
  Fly controllers and their enabled flag starts false, so a clip rendered from
  Orbit left every door shut. A reference-counted session
  (`Na__VideoStudio__Playback__SceneAnimations.js`) switches them on for the
  length of a preview or export and guarantees they go off again.
- **The safe frame and thirds toggles read on with nothing drawn.** The overlay
  was pushed from two of the ten paths that rebuild the panel, so unfolding the
  menu or loading a saved video left the viewport disagreeing with its own
  checkboxes. Applying the overlay is now a consequence of rendering the panel
  rather than something each call site has to remember.
- The path overlay ballooned over the viewport during preview, because playback
  flies the camera THROUGH the waypoints. Suppression is now reason-based, so
  export and preview can both hide it without either switching it back on early.

# ---------------------------------------------------------
## ValeVision3D v2.13.0 - 14-Aug-2026 - Video Studio

### Overview
New localhost-only Video Studio in the Dev Tools menu, sitting directly after
Visual Settings. Fly or walk the model, stamp waypoints as you go, and render
the interpolated camera path out as an MP4. Waypoints can be dragged in the
viewport, re-aimed, and given their own lens. Doors open as the camera passes
through them. Everything is stored per project under a new VideoStudio__Config
block and saved through the existing R2-first two-phase save.

Nothing here touches the WebGL render pipeline. Encoding runs on the platform's
H.264 hardware encoder through WebCodecs, which is the GPU path for video in a
browser, so the exported frames carry profile lines, SSAO, fog planes and the
cross section overlay exactly as the viewport shows them.

### Added
- **Video Studio system** (`31__System__VideoStudio`, 10 modules): data layer
  owning the VideoStudio__Config JSON block, camera path sampler, viewport path
  overlay, waypoint dragger, real-time preview player, deterministic frame
  renderer, self-contained MP4 muxer, WebCodecs encoder, scene animation
  session, and the Dev menu panel. Stylesheet @imported into
  Na__CoreUi__Styles__Index__.css.
- **Camera path authoring**: Create New Video Path, then Capture Keyframe (K or
  Shift+K) records the live camera wherever you are, in Orbit, Walk or Fly.
  Per-keyframe travel time, hold time and lens; per-video travel speed, easing,
  closed loop and animation settings.
- **Viewport path overlay**: fat extruded Line2 through the same centripetal
  CatmullRom curve the exporter samples, with a start-to-end colour gradient,
  direction cones along the route, and a numbered camera frustum marker per
  waypoint showing where each shot aims. Toggled from the panel.
- **Waypoint dragging**: grab a numbered marker to slide it across the
  horizontal plane it sits on. Shift moves it vertically, Ctrl locks it to a
  single world axis with a coloured guide line, Ctrl+Shift turns it about world
  up to re-aim the shot. Escape cancels. Picking is screen-space rather than by
  raycast, because the markers are non-attenuated sprites whose raycast hit area
  would otherwise shrink with distance.
- **Preview playback**: Play flies the live camera along the path at wall-clock
  speed with a scrub bar. Spacebar toggles play and pause (Orbit only; Fly binds
  Space to Ascend). Preview takes ownership of the camera the same way Walk and
  Fly do, via a new branch in the render loop.
- **MP4 export**: deterministic frame-by-frame render at the export resolution
  through the live effect chain, hardware H.264 via WebCodecs, wrapped by a
  dependency-free ISO-BMFF muxer written for the purpose. Downloads as
  ValeVision3D__{VideoName}__{DD-Mmm-YYYY}__.mp4. Progress, cancel, and a clear
  failure message when a machine cannot encode the requested format.
- **Aspect ratio and resolution**: 3:2 (default), 4:3, 16:9 and 1:1, against
  height standards of 720p through 4320p. Height and aspect are the source of
  truth and the width is derived from them, so the pair can never drift in the
  saved file. Because a Three.js camera's fov is the vertical field of view and
  it is left untouched, every ratio renders the same vertical extent and simply
  shows more or less to the sides. Nothing is stretched to fit.
- **Safe frame and rule of thirds**, both on by default, reusing the Image
  Export viewport overlay rather than drawing a second one. The overlay follows
  the video's aspect and updates as it changes.
- **Advanced Animation Settings**: collapsible sub-section holding the two door
  controls. **Door time** is the seconds a single-leaf door takes to swing,
  defaulting to 1.2s against the 0.6s the app authors for clicking one open by
  hand; double and bifold doors scale proportionally. **Detection** is how close
  the camera comes before a door starts opening, defaulting to whatever
  DoorProximityThresholdMm the app config gives Walk and Fly, so a project that
  never touches it follows the app.
- **Door animation speed scale** (`Na__DoorAnimation__SetSpeedScale`): scales
  the animation clock rather than any individual duration, so every door slows
  together and a bifold keeps its three-to-one relationship with a single leaf.
  A requested swing time converts to a scale against
  `Na__DoorAnimation__GetBaseDurationMs`, the live config value, rather than the
  shipped 600ms, so changing the config carries through. Video Studio sets both
  the scale and the detection threshold for the length of a preview or export
  and restores both afterwards; interactive Walk and Fly are unaffected.

### Changed
- `Na__AppFlow__LoadingSequence.js`: render loop gained a Video Studio preview
  branch ahead of the Walk and Fly branches, so the timeline owns the camera
  while a preview runs and OrbitControls never overwrites the sampled
  orientation with its own lookAt.
- **Loading overlay extracted to `Na__AppUtils__LoadingOverlay__.js`**. It was a
  private sub-function inside the image export controls; image export and Video
  Studio now share one implementation. A video export runs behind it in a new
  opaque mode, because the export resizes the live renderer and paints hundreds
  of frames through a canvas whose CSS box is still viewport-sized, and the
  default 92% white let that flicker through. The canvas is hidden outright for
  the duration as well, and each step is reported under the spinner: preparing,
  starting the encoder, frame N of M with encoded size and a measured estimate
  of the time left, draining the encoder, writing the container.
- Video Studio panel caps its own width. The Dev Tools shell is drag-resizable
  to 640px inside a transform: scale(1.2), so a wide drag was making the panel
  enormous on screen; it now stays a tidy column however wide the shell is
  dragged, with the internal control metrics tightened to suit.
- `Na__UiFeature__ImageExport__ViewportOverlays.js`: new
  Na__UiFeature__SetViewportOverlayThirds so the safe frame can be shown with
  the grid as a separate toggle. The modifier is cleared on every overlay
  update, so a caller that hides the grid cannot leave it hidden for the next
  one. Still export behaviour is unchanged.
- Proximity doors are owned by the Walk and Fly controllers and their enabled
  flag starts false, so a video rendered from Orbit left every door shut. A
  reference-counted animation session now switches them on for the length of a
  preview or export, reusing the same DoorProximityThresholdMm those modes use,
  and guarantees they go off again afterwards.

### Notes
- MP4 export needs WebCodecs, so Chrome or Edge. Authoring and preview work
  everywhere; the Export button disables itself with an explanation elsewhere.
- Lens conversion reads cameraLens.sensorHeightMM from Na__AppConfig__Main.json
  rather than carrying its own copy, so the focal lengths shown in Video Studio
  and in the Tools menu lens slider can never disagree for one camera. Note that
  Walk and Fly force camera.fov to their own HorizontalFovDeg, so a keyframe
  captured while flying records that lens rather than the Orbit one; the
  per-keyframe lens control is how you correct it after the fact.
- Above 4K the composer's render targets get large and not every machine has an
  H.264 encoder that goes beyond 4K. The export confirmation says so.

# ---------------------------------------------------------
## ValeVision3D v2.12.9 - 30-Jul-2026 - Alt+Shift+F Fog + Forcefield Toggle

### Overview
Alt+Shift+F now toggles the Fog Plane visual fog and the camera forcefield
barrier together as one master switch. Turning fog off also disables the
camera constraint; turning it on re-enables the barrier only when plane(s)
are active. The Dev Tools “Enable Fog” checkbox shares the same coupled
behaviour. Hotkey registered in Na__ValeVision__HotkeysDictionary__.json
and wired through the global HotkeyHandler (help panel lists it automatically).
Whitecardopedia PWA_SW_VERSION_TOKEN bumped to 2026-07-30-1 so shell cache
picks up the SystemLogic coupling change.

# ---------------------------------------------------------
## ValeVision3D v2.12.8 - 28-Jul-2026 - Nav Toolbar Idle Fade

### Overview
The bottom navigation toolbar (Orbit / Walk / Fly / Reset View / Help) now
idles at 50% opacity and wakes with the exact same pure-CSS hover/focus
response as the Tools & Settings menu — instant reaction both in and out,
0.3s fade, no JS timer lag. Idle menus also shed their drop shadows:
box-shadow fades in and out with the opacity as one 0.3s animation across
the toolbar, Tools & Settings, and breadcrumb. The only scripted piece is
a 1s wake flash in Na__UiFeature__NavigationToolbar__Controls.js for
hotkey-driven mode changes (which CSS hover cannot see) so the moved
highlight still registers; boot stays faded with no opaque flash.

# ---------------------------------------------------------
## ValeVision3D v2.12.7 - 28-Jul-2026 - Menu Style and Small-Screen Usability Pass

### Overview
Single consolidated styling pass over the floating menus: breadcrumb trail
spacing opened up (14px around separators) with a horizontal scroll clamp on
narrow screens; Tools & Settings dropdown and controls help panel now clamp
to the viewport and scroll instead of cutting off on small screens; closed
menus (Tools & Settings, breadcrumb) idle at 50% opacity to reduce visual
distraction, restoring to fully opaque on hover, focus, or while open. The
localhost dev Tools menu moved below the breadcrumb row so the two no
longer overlap top-left. Dropdown cards restyled to match the breadcrumb
card (12px radius, soft border, 0 4px 16px shadow); the scroll clamp moved
from the menu container onto the card itself so the drop shadow is never
clipped by the scrolling container.

# ---------------------------------------------------------
## ValeVision3D v2.12.6 - 28-Jul-2026 - Whitecardopedia Breadcrumb Menu + Alt+Backspace Back

### Overview
New top-left breadcrumb menu linking back to Whitecardopedia, plus an
Alt+Backspace shortcut for browser-style back navigation (the orbit arrow
key capture in v2.12.5 swallowed Alt+Left, which was the old route back;
Ctrl cannot be used as a movement modifier because browsers reserve
Ctrl+W and it would close the app while nudging forward with W).

### Added
- **Breadcrumb navigation menu** (`64__Feature__BreadcrumbNav`): collapsed
  chevron card fixed top-left, below the header. Clicking unfolds
  "Project Gallery / <Name> - <Code> / Model View"; the trail stays open
  until toggled again. Gallery crumb links to the Whitecardopedia gallery,
  the project crumb deep-links to that project's page (app.html?id=<code>).
  Localhost routes via the Flask root, production via the sibling
  ../Whitecardopedia/ path. Shown only when the app booted with ?project=;
  labels seed from the URL param instantly and refine from the memoised
  project.json fetch. Markup in index.html, styles @imported into
  Na__CoreUi__Styles__Index__.css.
- **Alt+Backspace back navigation** (hotkey dictionary +
  `ValeVision__App__NavigateBack` callback): window.history.back(),
  replacing the lost Alt+Left route back to Whitecardopedia. Auto-listed
  in the help panel's Keyboard Shortcuts section via the dictionary.

# ---------------------------------------------------------
## ValeVision3D v2.12.5 - 28-Jul-2026 - Orbit Keyboard Nudges + Device-Aware Help Panel

### Overview
Orbit mode WASD / arrow key movement now works without holding the left
mouse button. The invalidation-based render loop only ticked during pointer
interaction, so held keys did nothing until a drag was in progress (the
accidental "hold left click to enable the keys" behaviour). Held movement
keys now register an 'orbit-keys' active-render reason so the loop keeps
ticking on its own. New Shift / Alt modifiers refine the movement, and the
navigation help panel instructions are now split per input device.

### Added
- **Movement modifiers** (`Na__DefaultNavmode__MouseControls.js`): Alt
  scales steps to 20% for extra-fine nudges; Shift dollies the rig (camera
  and orbit target translate together so the framing direction holds
  instead of re-aiming at the orbit pivot).
- **Help panel device sub-dropdowns** (index.html,
  `Na__UiFeature__NavigationHelpPanel__Controls.js`, navigation toolbar
  CSS): Orbit / Walk / Fly sections split into "PC Controls (Mouse &
  Keyboard)" and "Touchscreen Controls (iPad & Tablet)" collapsibles; the
  one matching `Na__Device__UseTouchControls` unfolds on load. Touch users
  now get real walk / fly gesture rows (1-finger move, 2-finger look,
  pinch) instead of keyboard-only text.

### Fixed
- **`Na__DefaultNavmode__MouseControls.js`** - WASD / arrows / Q-E request
  the 'orbit-keys' active-render reason on keydown and release it when the
  last key lifts, so keyboard movement no longer depends on a mouse drag
  keeping the render loop awake. Keys are ignored while typing in inputs;
  arrows preventDefault (also blocks Alt+arrow browser history); window
  blur releases all held keys so the loop can never stay pinned.

# ---------------------------------------------------------
## ValeVision3D v2.12.4 - 16-Jul-2026 - PureEngine MAT000E__ Texture Brightness Match

### Overview
`MAT000E__` exempt textures (e.g. `MAT000E__CorbelLeafFake`) embedded in
Whitecard GLBs were loading correctly but read dark grey under PureEngine —
same scene lights as whitecard, but grey albedo + `emissiveIntensity: 0`.
PureEngine now lifts those slots toward whitecard luminance via a config-
driven emissive pass (MaxEngine unchanged).

### Added
- **`Na__MaterialsSystem__ApplyExemptTextureBrightness`** — clones `MAT000E__`
  materials, white base colour, map→emissiveMap, intensity from AppConfig.
- **`Na__MaterialsSystem__IsExemptName`** — `/^MAT000E__/` helper.
- AppConfig `models.baseMesh.material.exemptTextureEmissiveIntensity` (0.4)
  and `exemptTextureEmissiveColor` (white). Set intensity to `0` to disable.

### Changed
- PureEngine materials path runs brightness match after whitecard-indexed pass.

# ---------------------------------------------------------
## ValeVision3D v2.12.3 - 15-Jul-2026 - Capture Styles On Save Scene / Save All

### Overview
Per-scene cross section style capture was wired correctly, but Save Scene /
Save All did not call capture — only Update Camera / Add Scene did. Saving
after changing Advanced Section Style therefore re-wrote the stale
`CrossSection__SceneData` block to R2 with no FillColor/LineColor fields,
so web loads kept the project default light-grey fill.

### Fixed
- **`Na__PresentationMode__DevMenu__SceneEditor.js`** — when the Capture
  Cross Sections toggle is ON, Save Scene captures that row's scene and
  Save All captures the active carousel scene (geometry + style) before
  the R2-first save.

# ---------------------------------------------------------
## ValeVision3D v2.12.2 - 15-Jul-2026 - Per-Scene Cross Section Style Capture

### Overview
Localhost Presentation Mode scene setup can now capture section fill colour,
line colour, and line width alongside geometry. Styles persist into
`CrossSection__SceneData` via the existing R2-first save, and restore on
web (and localhost) when that animation scene activates — so a red cut set
on localhost plays back red for anyone opening the project online.

### Changed
- **`Na__CrossSectionView__SystemLogic.js`** — `SerializeSections` includes
  `fillColor` / `lineColor` / `lineWidthPx`; `ApplySerializedSections`
  applies them when present (omitted = leave current appearance).
- **`Na__CrossSectionView__SceneData.js`** — capture writes
  `CrossSection__SceneBinding__FillColor` / `LineColor` / `LineWidthPx`;
  restore maps them into the applied snapshot. Older bindings without
  these fields remain backward-compatible.

# ---------------------------------------------------------
## ValeVision3D v2.12.1 - 15-Jul-2026 - Fix: Unbound Scenes Now Clear Cross Sections

### Overview
Fixed a bug in the per-scene cross section restore added in v2.11.0/v2.12.0:
cycling the Presentation Mode carousel to a scene with no SketchUp or
ValeVision section binding left the PREVIOUS scene's cut active instead of
clearing it. Restore priority is unchanged (SketchUp-native section wins,
then the ValeVision per-scene binding); only the "neither" case changed —
it now clears every live section instead of leaving them untouched.

### Fixed
- **`Na__CrossSectionView__SceneData.js`** — `Na__SectSceneData__RestoreForScene`
  now calls a new `Na__SectSceneData__ClearSections()` helper (applies an
  empty snapshot) whenever a scene has neither a SketchUp map entry nor a
  `CrossSection__SceneData` binding, instead of returning early and leaving
  the live sections untouched.

# ---------------------------------------------------------
## ValeVision3D v2.12.0 - 15-Jul-2026 - SketchUp-Native Section Planes Auto-Port Per Scene

### Overview
SketchUp section planes now port automatically into ValeVision. The cloud
sync plugin (v0.4.0) captures each IMG## scene's active section plane(s)
into the existing `ValeVison3D__SketchUpCameraData` block (`section_planes`
per scene, Z-up mm). On load, ValeVision converts them (standard
`Three = (x, z, -y)` axis swap; position-along-normal is rotation-invariant;
SketchUp keeps the normal side — same as three.js clipping, so no sign
flip), builds a read-only scene-name → snapshot map, and AUTO-ENABLES the
cross section feature when any exist. When a scene activates, priority is:
SketchUp-native section (wins) → ValeVision per-scene binding → untouched.
Ported cuts get the full treatment: boolean cap fills, clean outer profile
lines, live dragging, and image-export rendering. The map is never
persisted by ValeVision — the plugin re-captures on every sync, and the
ValeVision-owned `CrossSection__SceneData` block stays untouched.

### Changed
- **`Na__CrossSectionView__SceneData.js`** — SketchUp map builder (axis swap,
  PLAN/UPRIGHT mode derivation, plugin plane → snapshot), priority restore,
  feature auto-enable on import.
- **`Na__AppFlow__LoadingSequence.js`** — dispatches
  `na-crosssection-sketchup-sections-loaded` when project.json carries
  `ValeVison3D__SketchUpCameraData`.

### Notes
- SketchUp sections have no slice depth → ported cuts are infinite
  (SketchUp-style) half-space cuts.
- Nested (group/component) section planes are skipped by the plugin in v1.
- Scenes whose "Active Section Planes" property is unticked in SketchUp emit
  nothing — ValeVision bindings still apply for those scenes.

# ---------------------------------------------------------
## ValeVision3D v2.11.0 - 15-Jul-2026 - Per-Scene Cross Section Bindings + Image Export Support

### Overview
Two additions to the cross section tool. (1) Section states can now be saved
against individual Presentation Mode animation scenes and are restored live
when a scene is applied (carousel click, prev/next, boot default). The data
lives in a NEW separate top-level project.json object (`CrossSection__SceneData`)
keyed by scene NAME — SketchUp scene names are stable across cloud re-syncs,
and the SketchUp cloud sync plugin never writes this key, so a full re-sync
of scenes leaves saved sections intact. (2) Cross sections (cap fills +
profile outlines) now render in tiled image exports; gizmo plane widgets are
always excluded from exports.

### Per-Scene Bindings (Task 1)
- **`Na__CrossSectionView__SceneData.js` (new, `41__System__CrossSectionView`)**
  — owns the `CrossSection__SceneData` block; capture toggle state; restore
  listener. Restore rule: scenes WITH a saved entry apply it exactly (an
  entry captured with zero sections clears every cut); scenes WITHOUT an
  entry leave the live sections untouched. Restore is gated on the feature
  being enabled for the project. Falls back to scene-id lookup for entries
  captured before a scene was renamed.
- **Scene editor toggle** — "Capture Cross Sections On Scene Update" in the
  Presentation Mode Scenes dev panel (localhost), default OFF every session.
  While ON, "Update Camera" and "+ Add Scene From Camera" capture the live
  section state (positions mm, normals, slice depth, enabled/gizmo flags,
  global gizmo visibility) against that scene; the editor's existing R2-first
  save persists the block. Save never writes the key when nothing was
  loaded/captured, and preserves other scenes' entries verbatim.
- **`na-pm-scene-activated` event** — dispatched by
  `Na__PresentationMode__Camera__SceneTransition.js` from both the instant
  snap and the animated transition (at the same point model-layer visibility
  applies; instant cut). SceneData listens; no cross-module import needed.
- **SystemLogic** — new `Na__CrossSection__SerializeSections()` /
  `Na__CrossSection__ApplySerializedSections()` (exact-swap rebuild via the
  face-hit creation path; restores names, per-section enabled + gizmo flags,
  global slice depth and gizmo visibility).
- **Loading sequence** — dispatches `na-crosssection-scenedata-loaded` when
  project.json contains the block.
- SketchUp plugin capture of native section planes deliberately postponed;
  nothing in the plugin was touched.

### Image Export Support (Task 2)
- **TiledRenderer** — after each tile's `composer.render()`, the section
  overlay (registered via `Na__RenderEffect__SectionClipping__State`) draws
  caps + outlines onto the tile with the tile's sub-frustum camera, so
  exports match the viewport in both engines and in 2D elevation exports.
- **Export mode** — `Na__CrossSection__SetExportMode(active, lineScale)`
  (registered as a handler in the same 05 state module, so ImageExport only
  imports from 05__RenderPipeline): gizmo widgets ALWAYS hidden in exports;
  outline fat-line widths get the standard linework compensation
  (outputH / tile framebuffer height) and restore on completion.

### Files Changed
- `02__Src__AppModules/41__System__CrossSectionView/Na__CrossSectionView__SceneData.js` (new)
- `02__Src__AppModules/41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js`
- `02__Src__AppModules/41__System__CrossSectionView/Na__UiFeature__CrossSectionView__Controls.js`
- `02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js`
- `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__Camera__SceneTransition.js`
- `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__SceneEditor.js`
- `02__Src__AppModules/30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js`
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js`

# ---------------------------------------------------------
## ValeVision3D v2.10.3 - 14-Jul-2026 - Cross Section Per-Section On/Off Toggle

### Overview
Added an eye-icon toggle to each row in the Active Sections list, letting a
section's cutting effect be switched off independently of its gizmo
visibility (Show/Hide) — the plane stays in place, just stops clipping the
model, and can be switched back on at any time.

### Added
- `Na__CrossSectionView__SystemLogic.js` — `section.enabled` state;
  `Na__CrossSection__SetSectionEnabled()`; `Na__Sect__SyncActivePlanes()` and
  `Na__Sect__RebuildSectionClipArrays()` now skip disabled sections' planes
  entirely (model + other sections' caps); `Na__Sect__RecomputeSectionCaps()`
  no-ops while a section is off so drag/flip cannot silently re-reveal its cap.
- `Na__UiFeature__CrossSectionView__Controls.js` — 👁 / 🚫 row button, dims
  the whole row while a section is off.

# ---------------------------------------------------------
## ValeVision3D v2.10.2 - 14-Jul-2026 - Cross Section Overlay Composite Fix

### Overview
Fixed two Cross Section regressions: the keep-side was being derived from the
camera position (cut direction changed while orbiting) and the post-composer
overlay pass was re-rendering the whole main scene, which wiped the clipped
model out of the colour buffer so only the cap fill/gizmo were visible.

### Fixed
- `Na__CrossSectionView__SystemLogic.js` — `Na__Sect__ProcessFaceSelection`
  reverted to derive the keep side from the clicked face's own normal only
  (Upright: XZ-projected face normal, negated so exterior clicks cut inward;
  Plan: fixed `(0,-1,0)`). Orbiting the camera no longer changes the cut.
- Caps / outlines / gizmos now live in a dedicated `Na__Sect__OverlayScene`
  (a separate `THREE.Scene`, never added to the main model scene) instead of
  being tagged onto camera render layer 2. `Na__Sect__RenderOverlay` renders
  that scene directly onto the already-composited colour buffer (`autoClear`
  off, `clearDepth()` only) with no `camera.layers` mutation — the clipped
  model from the composer pass now stays visible underneath the section fill.

# ---------------------------------------------------------
## ValeVision3D v2.10.1 - 14-Jul-2026 - Cross Section Face-Click + Slice Depth

### Overview
Cross Section UX update: placement now matches Elevation View (click a face),
with an Upright/Plan mode toggle replacing the Plan/X/Z spawn buttons. Optional
slice depth (metres) adds a second parallel clip plane for SketchUp-style
section depth; blank/0 keeps the default infinite half-space cut.

### Changed
- `Na__CrossSectionView__SystemLogic.js` — face-pick placement, slice back-plane,
  Upright/Plan modes; drag/flip keep depth locked.
- `Na__UiFeature__CrossSectionView__Controls.js` + `index.html` — new panel UI.
- `Na__UiFeature__Styles__DropdownAndToast__.css` — crosshair while selecting.
- `Na__CrossSectionView__Config.json` — `CrossSectionView__Slice__Config`.

# ---------------------------------------------------------
## ValeVision3D v2.10.0 - 14-Jul-2026 - SketchUp-Style Live Cross Section Tool

### Overview
New per-project Cross Section system (`41__System__CrossSectionView`) delivering
SketchUp-style live section cuts with two key visual upgrades over SketchUp:
cut-through areas are filled with REAL triangulated cap geometry (boolean-style
solid "islands", default RGB 240,240,240) and the profile is drawn ONLY around
the outer loops of each island with fat lines (default RGB 50,50,50) — all
interior clutter lines are removed. Multiple simultaneous draggable section
planes are supported and compose like SketchUp (each cap is clipped by every
other active plane). The feature is gated per project: a Dev Tools section
enables/disables it live and saves `CrossSection__Config` to project.json via
the R2-first two-phase save; when enabled a "Cross Sections" dropdown appears
in the Tools menu directly after Elevation View.

### Technique
- Cutting: per-material THREE clipping planes (`renderer.localClippingEnabled`)
  on every model material (meshes + linework fat lines), with `clipShadows` so
  shadows follow the cut. Zero per-frame cost; drag updates mutate the shared
  plane array in place.
- Cap fills + profiles: CPU mesh/plane contour extraction (signed distances
  evaluated in each mesh's local space; only crossing triangles transformed),
  ORIENTED segments so coincident contact faces between touching solids cancel
  (this is what removes interior lines), endpoint weld + loop chaining, even-odd
  nesting classification (holes preserved), earcut triangulation via
  THREE.ShapeUtils, LineSegments2 fat-line outlines. Live drag recomputes on a
  90 ms throttle plus a final exact pass on release. Measured ~7 ms per full
  recompute on the default model.
- Engine safety: profile-lines normal/colour override passes read the plane
  list from a new shared state module (`Na__RenderEffect__SectionClipping__State`)
  in BOTH PureEngine and MaxEngine plus the 2D elevation pass; materials are
  re-applied after `na-render-engine-changed` material swaps.

### Added
- `02__Src__AppModules/41__System__CrossSectionView/Na__CrossSectionView__Config.json`
- `02__Src__AppModules/41__System__CrossSectionView/Na__CrossSectionView__CapGeometry.js`
- `02__Src__AppModules/41__System__CrossSectionView/Na__CrossSectionView__PlaneGizmo.js`
- `02__Src__AppModules/41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js`
- `02__Src__AppModules/41__System__CrossSectionView/Na__UiFeature__CrossSectionView__Controls.js`
- `02__Src__AppModules/41__System__CrossSectionView/Na__UiFeature__CrossSectionView__DevControls.js`
- `02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js`
- Tools menu "Cross Sections" section (insert Plan/X/Z planes, per-section
  Flip / Hide / Delete rows, Show Section Planes toggle, Advanced style panel:
  fill colour, profile line colour + thickness, reset).
- Dev Tools "Cross Section Tool" section (enable live + save to project.json).

### Changed
- `Na__RenderEffect__ProfileLines__.js` + `Na__RenderEffect__2dProfileLines__.js`
  — override materials now carry the active section clipping planes.
- `Na__AppFlow__LoadingSequence.js` — dispatches `na-crosssection-config-loaded`
  when project.json contains `CrossSection__Config`.
- `index.html` — menu markup, module imports, init wiring.

# ---------------------------------------------------------
## ValeVision3D v2.9.14 - 10-Jul-2026 - SketchUp Scene Framing vs OrbitHelperCube Pivot Split

### Overview
The v2.9.10 single/zero-scene orbit fix (and its follow-ups) resolved the orbit
PIVOT for lone-scene projects, but multi-scene SketchUp carousels then framed the
wrong thing on initialisation and on scene clicks: instead of showing each shot
exactly as it was set up in SketchUp, the camera pointed AT the OrbitHelperCube.
Confirmed on the Bia project (`2026/63853__Bia`), a 6-shot animation carousel — the
first card in particular loaded aimed at the cube, and cycling through a couple of
scenes was needed before the view "settled". Other cards only looked correct by
coincidence, where that shot's look-at point happened to sit near the cube.

Root cause: `OrbitControls.update()` runs `camera.lookAt(controls.target)` on EVERY
frame — `controls.target` is not merely the orbit pivot, it is also the point the
camera is forced to look at. The earlier fixes left `controls.target` on the cube at
rest, so `update()` re-aimed the camera at the cube each frame and discarded the
SketchUp look direction. A single OrbitControls target cannot be both the resting
look-at point and a different orbit pivot, so the two concepts had to be split in
time rather than collapsed onto one value.

### Fixed
- The resting view now ALWAYS frames the scene's own `camera.target` (the exact
  SketchUp shot). The OrbitHelperCube is applied as the orbit PIVOT only, and only
  on the first rotation after a scene is framed — "the cube kicks in" exactly as
  intended: SketchUp framing at rest, cube-centred orbit once you start to rotate.
- Applies uniformly at boot, on carousel card clicks, and on prev/next navigation.
  Previously only the boot path had been (partially, incorrectly) handled, so
  clicking the first card reproduced the bug.

### Added
- **`Na__Navmode__OrbitPivot__InteractionSwap.js` (new, `10__NavigationAndCameras`)**
  — holds the resolved cube / saved orbit pivot and, on the first genuine rotation
  after a scene is framed, swaps `controls.target` from the scene's look-at point to
  the cube. Gated on a real `'change'` during an active `'start'`→`'end'` gesture, so
  a bare click never re-frames the view. Public API: `Init`, `SetPivot`, `Arm`,
  `Disarm`, `HasPivot`.
- **`Na__PresentationMode__ProjectJson__ShouldTrustSceneOrbitTarget(config)`** (new
  export, `Na__PresentationMode__ProjectJson__SceneData.js`) — true only for
  deliberately human-authored scene configs (Source ≠ `SketchUpCameraData`); those
  keep their placed orbit target as the pivot and do NOT arm the cube swap.

### Changed
- **`Na__AppFlow__LoadingSequence.js`** — boot now registers the pivot swap
  (`Init` + `SetPivot` with the resolved cube/saved target), frames the launch scene
  to its own `camera.target` unconditionally, then `Arm`s the swap for
  SketchUp-derived scenes (`Disarm`s for explicit authored scenes).
- **`Na__PresentationMode__UI__SceneCarousel.js`** — card click / prev / next /
  default-scene apply now frame the scene to its own target and re-arm the swap on
  transition completion.
- **`Na__PresentationMode__Camera__SceneTransition.js`** — `AnimateToScene` always
  animates to the scene's own orbit target again (a short-lived `applyOrbitTarget`
  flag that suppressed it — and thus mis-framed the shot — was reverted).
- **`Na__SketchUp__AnimationScene__DataBridge__.js`** — `ShouldUseSceneOrbitTarget`
  now returns true only for explicit authored scenes (dropped the ">=2 SketchUp
  scenes" heuristic); it gates whether the launch scene's own target stays the pivot
  or the cube swap arms.

### Files Changed
- `02__Src__AppModules/10__NavigationAndCameras/Na__Navmode__OrbitPivot__InteractionSwap.js` (new)
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js`
- `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__UI__SceneCarousel.js`
- `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__Camera__SceneTransition.js`
- `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js`
- `02__Src__AppModules/69__System__SketchUpToValeVision__Utilities/Na__SketchUp__AnimationScene__DataBridge__.js`

# ---------------------------------------------------------
## ValeVision3D v2.9.13 - 10-Jul-2026 - Glass Darkening Compounding Fix + Unified Dark Mirror Glass

### Overview
Max Mode door glass and window glass were rendering with visibly different
tones despite sharing the byte-identical `MAT101__Glass__ClearDefault`
material out of the GLB exporter (confirmed by direct comparison of the
exported Doors/Windows GLBs — geometry and material JSON were exonerated).
Root cause: `Na__MaterialsSystem__ApplyGlassEnvironmentOverrides` darkened
glass with `material.color.multiplyScalar(brightnessMultiplier)` once per
**mesh node** rather than once per **material instance**. The Windows GLB
merges all glazing into a single mesh (darkened once, as intended), but the
Doors GLB exports one mesh per door leaf, all sharing one cached material
instance from `Na__MaterialsSystem__ApplyMaterials` — so the same instance
was darkened 6 times in a row (0.25^6 ≈ ×0.00024), collapsing door glass to
near-black and making it read as almost fully clear/undimmed next to the
correctly-darkened (×0.25) window glass.

### Fixed
- **`Na__MaterialsSystem__MaterialSwap.js`** — `Na__MaterialsSystem__ApplyGlassEnvironmentOverrides`
  and the sibling `Na__MaterialsSystem__ApplyMirrorEnvironmentOverrides` now
  track already-processed materials in a `Set` and skip repeat hits, so a
  shared material instance is only darkened once no matter how many mesh
  nodes reference it. The mirror function had the identical latent bug,
  previously inert only because `MirrorBrightnessBoost` is `1.0`.

### Changed
- **`Na__AppConfig__Main.json`** — with the compounding bug fixed, the old
  single-multiply `GlassBrightnessMultiplier: 0.25` read as too flat/matte
  compared to the near-black, reflection-dominated look the (buggy) 6x
  compounding had been producing on doors — which was the preferred look.
  Rather than keep that as an accidental side-effect, `GlassBrightnessMultiplier`
  is now explicitly set to `0.000244140625` (`0.25^6`) so every glass mesh
  gets that same near-black diffuse tone uniformly: with almost no diffuse
  colour left, the glossy env-map reflection (`RoughnessOverride: 0.03`,
  `GlassEnvMapIntensity: 1.0`) dominates, giving the "dark mirror glass"
  appearance across doors and windows alike.

### Files Changed
- `02__Src__AppModules/20__System__MaterialsSystem/Na__MaterialsSystem__MaterialSwap.js`
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json`

# ---------------------------------------------------------
## ValeVision3D v2.9.12 - 10-Jul-2026 - Multi-Panel Doors and Independent Exterior Double Leaves

### Overview
Backported the current TrueVision multi-panel door runtime into ValeVision
without replacing ValeVision's loader, namespaces, bootstrap, category discovery,
or Walk/Fly proximity thresholds. Added the config-gated independent
ExteriorDoubleDoor behavior after restoring full legacy product parity.

### Added
- `ROT_ONLY`, `ROT_MVE`, `MVE_ONLY`, and `FIXED` MOD classification and
  all-panel descriptors.
- Deterministic rotating-MOD to ROT-sibling pairing, signed degree/MVE parsing,
  mirrored-instance sign correction, config-gated interior sign inversion, and
  bifold-specific duration scaling.
- Explicit `ExteriorDoubleDoor` independent coupling, MOD-level hit resolution,
  per-leaf state/timing/easing/reversal, and coupled-pair Walk/Fly proximity
  when neither leaf is FIXED. Orbit clicks remain independent.
- `Na__DoorAnimation__RebindModelGroups` for the prototype Refresh Models flow.
- Production and sandbox config keys for multi-panel, bifold, interior sign,
  independent-panel enablement, and ADR token allow-list.
- ValeVision-specific documentation and a legacy/bifold/sliding/exterior-double
  test matrix.

### Compatibility
- Interior Double Doors, bifolds, sliding doors, and unknown ADRs remain
  whole-door lockstep. Two `ROT_ONLY` panels never imply independence.
- ValeVision production Walk/Fly door thresholds remain 6500 mm.
- Existing token-based model-category discovery and app loading sequence are
  unchanged.

### Files Changed
- `02__Src__AppModules/25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js`
- `02__Src__AppModules/25__System__3dObject__InteractionSystem/3dObjectInteraction__Animation__WalkMode__ProximityToOpenDoors__.js`
- `02__Src__AppModules/25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__README__.md`
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json`
- `80__Testing__PrototypeEnvironment/TestEnv__SubAppData__Config.json`
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__Main__.js`
- `80__Testing__PrototypeEnvironment/TestEnv__README__.md`
- `ValeVision__README__.md`

# ---------------------------------------------------------
## ValeVision3D v2.9.11 - 09-Jul-2026 - WYSIWYG Line Widths in Exports (Resolution Compensation)

### Overview
Exports now render line weights that match the live viewport exactly. The distance-based dynamic profile width was already applied per export tile (same camera distance = same computed width), but all line widths are expressed in PIXELS — and an export pixel is 2.5-4x smaller relative to the image than a viewport pixel, so 4K/8K exports came out relatively thinner. Worse, profile lines and fat linework thinned by DIFFERENT ratios (profile widths resolve against the true tile resolution; LineMaterial widths resolve against each material's load-time resolution uniform), shifting the weight balance between the two line systems and making exports feel inconsistent with the realtime view.

### Changed
- **`Na__RenderEffect__LineworkSettings__State.js`** — new export compensation scales (`Na__LineworkSettings__SetExportScales(profileScale, lineworkScale)` + `GetProfileExportScale`), both defaulting to 1.0 outside exports. Linework width application refactored into a single shared applier so the user slider factor and the export scale always compose off the stashed base width and never compound.
- **`Na__RenderEffect__ProfileLines__.js`** — per-frame `u_edgeWidth` now multiplies the profile export scale on top of the user factor; live viewport is untouched (scale is 1.0 there). The dynamic near/far distance lerp behaves identically at any export size.
- **`Na__ImageExport__StaticExport__TiledRenderer.js`** — computes both scales at export start (profile: `outputH / physical viewport height`; linework: `outputH / tile framebuffer height` — the LineMaterial load-time resolution uniform is identical in live and tile renders, so it cancels exactly, even after window resizes). Applies them for the duration of the export and resets in the existing `finally`. Elevation (2D ortho) exports snapshot-scale `u_edgeWidth` directly since the 2D profile renderer never recomputes it. Silly Lines amplitude + wavelength px are scaled by the same factor so waves keep their relative size at 8K.
- The Advanced Linework Settings sliders act on top of the compensation as deliberate overrides: 1.00x now means "exactly what the viewport shows" at every export resolution.

### Files Changed
- `02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__LineworkSettings__State.js`
- `02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__ProfileLines__.js`
- `02__Src__AppModules/30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js`

### Cross-reference
- **Whitecardopedia** — shared PWA SW cache token bumped to `2026-07-09-1`.

# ---------------------------------------------------------
## ValeVision3D v2.9.10 - 09-Jul-2026 - Single/Zero-Scene Orbit Pivot Fix

### Overview
Projects synced with only one `IMG##` SketchUp scene (no Presentation Mode carousel) were orbiting around that scene's `camera.target` look-at point instead of the `OrbitHelperCube` — the cube GLB loaded and its bounding-box centre resolved correctly, but the boot-camera apply then silently overwrote `controls.target` with the single scene's SketchUp target. Confirmed on the Ingle project (`2026/63918__Ingle`): the cube is present in `valeVision_ModelUrls` and the Scene Inspector, but its resolved centre was discarded the moment the single-scene boot camera applied.

### Fixed
- **`Na__AppFlow__LoadingSequence.js`** — boot camera apply now only lets the launch scene's `camera.target` own `controls.target` when Presentation Mode is actually carousel-eligible (two or more SketchUp scenes, or explicit `PresentationMode__SavedCameraScenes`). Single (or zero) -scene SketchUp projects keep whichever orbit target was already resolved (saved `OrbitHelperCube__Position`, else the `OrbitHelperCube` GLB centre, else the existing fallback) — camera position/rotation/FOV still snap to the scene exactly as before.

### Added
- **`Na__SketchUp__AnimationScene__ShouldUseSceneOrbitTarget(projectData)`** (new export, `Na__SketchUp__AnimationScene__DataBridge__.js`) — mirrors the `ConvertBlock` carousel gate (`>=2` scenes) plus the explicit-scenes check, so the "is this scene target trustworthy as an orbit pivot" rule lives in one place.
- **`Na__PresentationMode__Camera__ApplySceneCameraState(camera, controls, scene, options)`** — new optional `options.applyOrbitTarget` flag (default `true`, every existing caller unaffected). When `false`, camera position/rotation/FOV still snap but `controls.target` is left untouched; `controls.update()` still runs to resync internal state against the new camera position.

### Cross-reference
- No ValeVision Cloud Sync or Whitecardopedia Python pipeline changes — Cloud Sync still only ever exports `camera.target` inside per-scene data, never a root `OrbitHelperCube__Position`. This fix keeps orbit authority entirely inside ValeVision3D's load sequence, where the cube's GLB centre is already resolved.

### Files Changed
- `02__Src__AppModules/69__System__SketchUpToValeVision__Utilities/Na__SketchUp__AnimationScene__DataBridge__.js`
- `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__Camera__SceneTransition.js`
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js`

# ---------------------------------------------------------
## ValeVision3D v2.9.9 - 08-Jul-2026 - Tiled Static Export Renderer (4K Fixed, 8K Added) + Advanced Linework Settings

### Overview
Complete rebuild of the custom-resolution image export path. The old implementation resized the LIVE renderer + composer to the full export resolution — at 4K (30MP) the PureEngine 4x-MSAA HalfFloat ping-pong buffers demanded 3GB+ of GPU framebuffer memory, losing the WebGL context and silently delivering a blank PNG (worse on iPad). Exports now render as a grid of viewport-sized tiles through the SAME live composer (identical quality, realtime engine untouched), so GPU memory stays flat at any output size. 8K added to the resolution slider; default remains 4K. New "Advanced Linework Settings" dropdown (Linework Thickness / Profile Line Thickness / Silly Lines) gives session-scoped runtime control over line weights in both the viewport and exports.

### Added
- **`Na__ImageExport__StaticExport__TiledRenderer.js` (new)** — dedicated static export renderer. Tiles via `camera.setViewOffset` sub-frusta with a 32px gutter cropped on composite (no FXAA/profile-line/SSAO seams); vertical perspective correction re-applied per tile (shear maths are exact on sub-projections); MaxEngine depth pre-pass + SSAO uniforms refreshed per tile; per-platform 2D canvas limits enforced up front (iOS ~16.7MP area cap) with proportional clamping + a 1px paint probe so oversized canvases fail loudly instead of encoding an empty PNG; WebGL context loss detected between tiles and surfaced as a real error; every mutated renderer/composer/camera state restored in `finally`.
- **`Na__ImageExport__AsyncYield__.js` (new)** — hidden-tab-safe yield helpers. rAF-based yields deadlock exports if the tab is backgrounded mid-render; these race double-rAF (paint when visible) against a MessageChannel macrotask (not timer-throttled when hidden), so long 8K exports survive the user switching tabs/apps.
- **`Na__RenderEffect__LineworkSettings__State.js` (new)** — session-scoped runtime state (no persistence by design; every session boots at 1.00x / Straight). Linework factor multiplies `LineMaterial.linewidth` on fat lines inside `userData.Na__ModelType === 'linework'` roots (grid lines excluded; base widths stashed on `material.userData` so factors never compound). Profile factor is read per-frame by the profile lines effect. Silly Lines amplitude pushes sine-wave uniforms to the profile lines pass; re-applied automatically on `na-render-engine-changed`.
- **`Na__UiFeature__LineworkSettings__Controls.js` (new)** — wires the "Advanced Linework Settings" `<details>` dropdown (closed by default) under the export Resolution slider: Linework Thickness + Profile Line Thickness (0.50x / 0.75x / 1.00x / 1.25x / 1.50x / 2.00x / 3.00x snap stops, default 1.00x) and Silly Lines (Straight → Absurd named stops mapping to 0-9px sine amplitude).
- **8K resolution stop** — `ImageExport__Config__Resolutions` now `[1024, 2048, 4096, 8192]`; default index unchanged (4K). 8K/16:9 = 12288x8192 verified at ~30s / 24 tiles on desktop.

### Fixed
- **4K exports crashing / delivering empty PNGs** — root causes: GPU memory cliff (above), plus a composer pixel-ratio bug — `EffectComposer` captures its own `_pixelRatio` at construction and the old export only reset the renderer's ratio, silently inflating every export render target by dpr² (2.25x extra at 150% Windows scaling). The tiled renderer forces `composer.setPixelRatio(1)` during export and restores after.
- **Fog plane banding in exports** — the planar fog pass reconstructs world positions from `uInverseProjectionMatrix` / `uCameraWorldMatrix`, synced per-frame by the live loop only. The old export changed the camera aspect (and the new one changes the sub-frustum per tile) without refreshing them, so fog planes landed in a different place per frame/tile — the white gradient bands over geometry. The tiled renderer now calls `Na__FogPlane__UpdateFogPassPerFrame` with the active camera for every tile.
- **Silent failure modes** — export flows are now async try/catch/finally: failures show a red "Export Failed" status (new `--error` overlay class) and always unlock the button; a null `toBlob` result is an error instead of "Download Ready!" with no file; post-clamp sizes are reported in the success message.
- **Enhance Whitecard memory spikes** — Levels and High Pass Sharpen previously allocated full-frame ImageData (3 canvases + 3 buffers ≈ 1GB+ transient at 8K, killing iPad tabs). Both now process in ~4MP horizontal strips (sharpen uses a padded strip + carry canvas so the Gaussian always reads original pixels — output pixel-identical); Levels collapsed to a 256-entry LUT; `ctx.filter` support is feature-detected. Pipeline mutates the capture canvas in place instead of cloning it (was a 100-480MB copy).
- **Layout View at high resolutions** — the drawing-layout tab is pre-opened synchronously inside the click gesture (multi-second tiled renders would otherwise trip the popup blocker) and receives the image as a Blob instead of a 40-90MB base64 `toDataURL` string; `Na__PageLayoutSystem__SystemLogic__Main__.js` accepts `blob` (object URL, revoked after decode) with `dataUrl` fallback.

### Changed
- **`Na__UiFeature__ImageExport__Controls.js`** — custom exports delegate to the tiled renderer; viewport-native capture unchanged. Live overlay progress ("Rendering Your Image... (part 3 of 24)", "Enhancing Image... (Sharpen)", "Encoding Image...").
- **`Na__RenderEffect__ProfileLines__.js`** — dynamic edge width multiplied by the runtime profile factor (static fallback width added for the no-orbit-target case); shader gains `u_sillyAmplitudePx` / `u_sillyWavelengthPx` / `u_sillyPxOffset` uniforms — edge sampling UV perturbed by a pixel-space sine (scene colour sampled unperturbed, only edges wobble); wave phase runs in full-image px space and the tiled renderer sets the per-tile offset so waves cross tile boundaries seamlessly.
- **`index.html`** — Advanced Linework Settings markup in the Export Image panel; linework settings state + controls initialisation.

### Cross-reference
- **Whitecardopedia** — shared PWA SW cache token bumped to `2026-07-08-2` so installed apps evict the stale export modules.

### Files Changed
- `02__Src__AppModules/30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js` (new)
- `02__Src__AppModules/30__System__ImageExport/Na__ImageExport__AsyncYield__.js` (new)
- `02__Src__AppModules/30__System__ImageExport/Na__UiFeature__LineworkSettings__Controls.js` (new)
- `02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__LineworkSettings__State.js` (new)
- `02__Src__AppModules/30__System__ImageExport/Na__UiFeature__ImageExport__Controls.js`
- `02__Src__AppModules/30__System__ImageExport/Na__ImageExport__PostProcessEffects__Pipeline.js`
- `02__Src__AppModules/30__System__ImageExport/Na__ImageExport__PostProcessEffects__Levels.js`
- `02__Src__AppModules/30__System__ImageExport/Na__ImageExport__PostProcessEffects__HighPassSharpen.js`
- `02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__ProfileLines__.js`
- `02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__SystemLogic__Main__.js`
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json`
- `03__Style__AppStylesheets/Na__UiFeature__Styles__LoadingOverlays__.css`
- `03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css`
- `index.html`

# ---------------------------------------------------------
## ValeVision3D v2.9.8 - 02-Jul-2026 - Generate & Download Email Type Chooser

### Overview
"Generate & download email" now asks which email type to produce — **Link email (legacy)** or **App notification email** — via a small inline chooser card that appears inside the existing overlay (no new permanent buttons). Purpose: a zero-send test path for the new notification email; the download is the exact HTML the "Send app notification" button would email.

### Changes
- **`Na__Feature__EmailWorkers__FormOverlay__.js`** — new hidden `generateChooser` block (label + Link email / App notification / Cancel compact buttons) between the notes field and the actions row; `showGenerateChooser()` / `hideGenerateChooser()` exposed on the form API; `hide()` always resets the chooser so it never re-opens stale.
- **`Na__Feature__EmailWorkers__UiInteractionLogic__.js`** — Generate button now toggles the chooser (second press dismisses). Legacy generation logic extracted unchanged into `generateAndDownloadLinkEmail`; new `generateAndDownloadNotificationEmail` mirrors it using the 63-module payload builder (same greeting-names validation, same `DownloadHtmlFile` helper, filename `ValeVision3D_AppNotification_<id>_<date>.html`). Distinct toasts per type.
- **`Na__Feature__EmailWorkers__FormOverlay__Stylesheet__.css`** — `__generate-chooser` region (navy-left-border card, `is-visible` toggle) + `__btn--compact` modifier.

### Files Changed
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__FormOverlay__.js`
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__UiInteractionLogic__.js`
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__FormOverlay__Stylesheet__.css`

# ---------------------------------------------------------
## ValeVision3D v2.9.7 - 02-Jul-2026 - App Notification Email System + Install Guide Page

### Overview
Second-generation email pipeline that works *with* the platform limitations on PWA link-capture instead of against them. Direct share links can never reliably open the installed app (impossible on iOS/iPadOS; opt-in per machine on Windows), so the new **"Send app notification"** email deliberately contains **no project link** — it tells recipients the project has been added to the **ValeVision 3D App** (project code + name) and steers them to open the installed app. The legacy link-share email is kept fully intact as a separate option in the same overlay.

### Added
- **`63__Feature__AppNotificationEmail/` (new module folder)** — self-contained second emailer, no imports from the legacy 61 generator so either system can be retired independently:
  - `Na__Feature__AppNotificationEmail__NotificationEmail__Template__.html` — landscape card (640px, logo column left / content right, stacks on phones), new `FeatureLogo__ValeVision3d__EmailLogo__NoCTA__NoBorder__1.1.0__.png` GH-Pages logo, footer link "Need Help Installing The ValeVision App?" → install guide page. Same dark-mode safety overrides as the legacy template (`vv3dn-` class prefix).
  - `Na__Feature__AppNotificationEmail__GenerateEmail__Logic__.js` — token replacement (`__RECIPIENT_NAMES_HTML__`, `__PROJECT_META_HTML__`, `__SPECIAL_NOTES_BLOCK__`, `__INSTALL_GUIDE_URL__`), subject `ValeVision3D App | New Project Added | <Name> - <Code>`, install-guide URL **hardcoded to the production GitHub Pages URL** (same rule as the template logo: URLs inside emails must never be derived from `window.location`, otherwise localhost send sessions would mail out dead localhost links).
  - `Na__Feature__AppNotificationEmail__PayloadBuilder__.js` — mirrors the legacy payload shape (`{ to, subject, htmlBody }`) so the existing Cloudflare Worker `/api/email/send` endpoint handles both systems with **zero server-side changes**. Reuses only `Na__Feature__ShareProjectLink__GetShareContext` for the `?project=` context.
- **`install-guide.html` (new page, ValeVision3D root)** — beginner-friendly graphical install guide in the Vale Design Suite style. Asks "Which device do you need help with?" first (Windows 11 / iPhone & iPad / Android), then reveals only that device's numbered steps with inline SVG illustrations (address-bar install icon, Safari share sheet, Chrome menu). Loads the shared PWA head stack (manifest + SW registrar) so the page itself is installable; a one-click "Install ValeVision 3D Now" button appears automatically on Chromium via `beforeinstallprompt`. iOS section carries the honest warning that email links can never auto-open the app on Apple devices — always launch from the home-screen icon. Carries the standard ValeVision3D app header (links the shared `Na__UiFeature__Styles__AppHeader__.css` SSOT + VGH horizontal logo, "ValeVision 3D" title right) with the navy guide-title hero banner beneath, offset via `--Vale_HeaderHeight` so the ≤600px responsive header scaling cascades automatically. **Every asset, script, stylesheet and link on the page uses the absolute production GH Pages URL** (no relative paths) — this page is opened from email links in arbitrary contexts, so it must render correctly regardless of how it is reached.

### Changed
- **`Na__Feature__EmailWorkers__FormOverlay__.js`** — new `btnSendNotification` ("Send app notification", primary style) between Generate & download and Send email; actions row already flex-wraps.
- **`Na__Feature__EmailWorkers__UiInteractionLogic__.js`** — wires the new button: same auth flow (`EnsureAuthorized`), same API client, new payload builder. Legacy Send email handler untouched by design.

### Cross-reference
- **Whitecardopedia v0.6.10** — PWA manifest gains `"handle_links": "preferred"` (Edge auto-routes in-scope links into the installed app at install time) and an explicit `"id": "/"` (identity pin, resolves identically to the previous relative id so existing installs are NOT orphaned). SW cache token bumped to `2026-07-02-1`.

### Files Changed
- `02__Src__AppModules/63__Feature__AppNotificationEmail/Na__Feature__AppNotificationEmail__NotificationEmail__Template__.html` (new)
- `02__Src__AppModules/63__Feature__AppNotificationEmail/Na__Feature__AppNotificationEmail__GenerateEmail__Logic__.js` (new)
- `02__Src__AppModules/63__Feature__AppNotificationEmail/Na__Feature__AppNotificationEmail__PayloadBuilder__.js` (new)
- `install-guide.html` (new)
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__FormOverlay__.js`
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__UiInteractionLogic__.js`

# ---------------------------------------------------------
## ValeVision3D v2.9.6 - 01-Jul-2026 - Per-Scene Tag-Driven Model Toggles

### Overview
The four "Model Parts List" toggles (Existing Building, Design Proposal, Site Boundaries, Landscape) now switch automatically per tour scene, driven by SketchUp tag on/off state captured by the ValeVision Cloud Sync plugin — e.g. Site Boundaries can be hidden for a shot framed inside a hedge, then restored on the next scene.

### Added
- **`Na__ModelToggle__ApplySceneLayerVisibility(layerVisibilityMap)`** (new export, `Na__UiFeature__ModelToggle__Controls.js`) — applies a per-category visibility map to the existing toggle state/buttons; unmentioned or unloaded categories are left untouched.
- **`PresentationMode__Scene__ModelLayerVisibility`** — new field on converted SketchUp scenes (`Na__SketchUp__ConvertSceneData__ConvertScene`), sourced from the plugin's new `model_layer_visibility` per-scene field inside `ValeVison3D__SketchUpCameraData`. Also usable on hand-authored explicit `PresentationMode__SavedCameraScenes` scenes.

### Changed
- **`Na__PresentationMode__Camera__ApplySceneCameraState`** and **`Na__PresentationMode__Camera__AnimateToScene`** (`Na__PresentationMode__Camera__SceneTransition.js`) both now call `Na__ModelToggle__ApplySceneLayerVisibility` with the active scene's layer map — this is the single choke-point for boot camera, carousel card clicks, and prev/next, so no other UI code needed touching. Applied instantly (not animated) at transition start.
- **`Na__AppFlow__LoadingSequence.js`** — re-applies the launch scene's layer visibility immediately after `InitializeModelToggleControls`, since the toggle state map does not exist yet at the earlier boot-time `ApplySceneCameraState` call.

### Cross-reference
- **ValeVision Cloud Sync v0.3.0** — captures `model_layer_visibility` per scene via the new `Na__TagVisibilityCapture` module, keyed off the shared `Na__DataLib__CoreIndex__Tags__.json` SSOT so category keys match `Na__ModelToggle__StateMap` 1:1. No Whitecardopedia/Python pipeline changes were required — it rides inside the existing `ValeVison3D__SketchUpCameraData` merge.

### Files Changed
- `02__Src__AppModules/26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js`
- `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__Camera__SceneTransition.js`
- `02__Src__AppModules/69__System__SketchUpToValeVision__Utilities/Na__SketchUp__ConvertSceneData__.js`
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js`

# ---------------------------------------------------------
## ValeVision3D v2.9.5 - 26-Jun-2026 - Pipeline Fix: valeVision_ModelUrls Now Always Populated

### Overview
ValeVision3D itself is unchanged. This entry documents the upstream pipeline fix (Whitecardopedia v0.6.7) that resolves the root cause of 3D models failing to load for projects synced before today.

### Root Cause
`valeVision_ModelUrls` in `project.json` was only written once — during the very first Whitecardopedia project scaffold. Every subsequent sync uploaded GLBs to R2 and set `hasGlb_R2: true` in the master index (making the badge visible) but never refreshed the model URL array. ValeVision3D had no URLs to hand to the GLB loader, so the viewer opened to an empty scene.

A second bug meant the master index was fetched once per browser session with no cache-busting, so `hasGlb_R2` changes made by a mid-session sync were invisible until a hard refresh — masking the problem further.

### What Changed (upstream — Whitecardopedia v0.6.7)
- **`AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py` (v1.2.0)** — after every GLB upload (`na_sync_all`, `na_sync_glb`), the model URL array is now rebuilt from the local GLB sync folder and patched into both the local and R2 `project.json`, exactly mirroring the camera-data merge pattern.
- **`Na__AppData__ProjectLoader.js` (v0.2.5)** — master index fetch is now cache-busted (`?t=<timestamp>` + `cache: 'no-store'`), so `hasGlb_R2` changes appear in the same session without a hard refresh.

### Action for Existing Projects
Any project that has GLBs on R2 but was last synced before this fix (i.e. `valeVision_ModelUrls` is absent from `project.json`) will start loading correctly after a single re-sync from the ValeVision Cloud Sync plugin (any action — all, glb, or cameras).

### Cross-reference
- **Whitecardopedia v0.6.7** — full fix details and file changes.
- **ValeVision Cloud Sync v0.2.2** — auto-init of `00__ProjectData/` for old projects (prerequisite for camera capture on legacy models).

# ---------------------------------------------------------
## ValeVision3D v2.9.4 - 26-Jun-2026 - Purge App Cache Button (Tools & Settings → App Settings)

### Overview
Added a **Purge App Cache** button to the Tools & Settings menu, nested inside a new **App Settings** submenu section at the bottom. Uses the same brutal full-reset logic as Whitecardopedia (shared PWA registrar) — clears all Cache Storage, unregisters the service worker, wipes localStorage/sessionStorage/IndexedDB — while preserving the user's email auth token. No more hunting through DevTools to manually clear stale assets.

### Changes
- **App Settings submenu** — `index.html`: new `<li>` at the bottom of `#naToolsMenu` using the standard `na-dropdown-menu__button--has-submenu` pattern with `Icon__ToolsMenu__MainMenuIcon__540p__.png`. Expand/collapse follows the existing `is-open` CSS class convention. Contains a dark-red "Purge App Cache" action button (`#naPurgeAppCacheAction`).
- **Wiring module** — `Na__UiFeature__PurgeAppCache__Button.js` (new, `70__System__DevTools/`): `Na__UiFeature__InitializePurgeAppCacheButton()` wires both the App Settings toggle and the Purge action. Click → `confirm()` guard → `window.Whitecardopedia__Pwa__ServiceWorker__Registrar.purgeAppCache()`. Imported and initialised in `index.html` alongside `Na__Feature__FullScreenMode__Initialize`.
- **Styles** — `Na__UiFeature__Styles__DropdownAndToast__.css`: `.na-dropdown-menu__action--danger` modifier (muted dark red background).

### Cross-reference
- **Whitecardopedia v0.6.5** — shared `PurgeAppCacheAndReload()` function lives in the PWA Registrar (SSOT); `PWA_PRESERVE_LOCALSTORAGE_KEYS` preserves both WCP and VV3D auth tokens.

### Files Changed
- `index.html`
- `02__Src__AppModules/70__System__DevTools/Na__UiFeature__PurgeAppCache__Button.js` (new)
- `03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css`

# ---------------------------------------------------------
## ValeVision3D v2.9.3 - 26-Jun-2026 - R2-First Dev Menu Saves + Fog Dev UI Sync Fix

### Overview
All localhost Dev menu functions that write to `project.json` now use the same **R2-first, Flask-mirror-second** contract as the Whitecardopedia Project Editor. Saves go live on R2 immediately (no GitHub push required for nav modes, fog, camera, orbit max distance, render engine, grid lines, or presentation mode scene data). Toast feedback confirms R2 success (green) or failure (red). Fog Effect Dev menu falloff distance no longer sticks at 1 m when `project.json` holds a different saved value.

### Changes

**R2-first two-phase save (shared utility)**
- `Na__AppUtils__R2SaveProjectJson__.js` (v1.1.0) — resolves full `folderId` via master index, lazy-fetches Worker config from Flask `GET /api/editor-config`, Phase 1 POST to `whitecardopedia-editor-api`, Phase 2 POST to Flask `/api/projects/{projectCode}`. Phase 1 failure throws; Phase 2 failure is non-fatal with red toast.
- Replaced prior GET-merge-POST-to-Flask-only pattern in:
  - `Na__UiFeature__NavigationModes__DevControls.js`
  - `Na__FogPlaneSystem__SaveSettings.js`
  - `Na__UiFeature__SaveCameraSettings.js`
  - `Na__UiFeature__OrbitMaxDistance__DevControls.js`
  - `Na__UiFeature__RenderEngine__DevControls.js`
  - `Na__GridLineSystem__UiElement.js`
  - `Na__PresentationMode__DevMenu__SceneEditor.js`

**Save feedback toasts**
- Green toast `"Saved to R2 ✓"` after successful Phase 1 write.
- Red toast on R2 failure (surfaced by each caller's existing `showToast(..., true)` catch path).
- Red toast on Phase 2 local mirror failure (previously showed as neutral/green).

**Fog Effect Dev menu — falloff slider sync (v1.1.0)**
- **Root cause:** `Na__UiFeature__InitializeFogPlaneControls()` runs in `index.html` immediately after `StartLoadingSequence()` (fire-and-forget). `Na__FogPlaneSystem__Initialize()` loads `FogPlane__Config` from `project.json` asynchronously *after* model load; UI `ApplyDefaults` read `GetFalloffMm()` while it was still the hardcoded 1000 mm (1 m) default.
- **Fix:** `Na__FogPlaneSystem__SystemLogic.js` dispatches `na-fogplane-settings-loaded` when saved settings are applied. `Na__FogPlaneSystem__UiControls.js` listens and calls `Na__FogUi__SyncControlsFromSystem()` to refresh slider position, "N m" label, and Enable Fog checkbox from authoritative system state.

### Cross-reference
- **Whitecardopedia v0.7.0** — Editor API Worker, Flask `/api/editor-config`, CORS fix for `127.0.0.1:8000`, Project Editor toasts.
- **Agent rule** — `WebApps/.cursor/rules/15-R2First-LocalhostSave--DevTools-SSOT-.mdc`.

### Files Changed
- `02__Src__AppModules/03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js` (new)
- `02__Src__AppModules/70__System__DevTools/Na__UiFeature__NavigationModes__DevControls.js`
- `02__Src__AppModules/29__System__FogPlaneSystem/Na__FogPlaneSystem__SaveSettings.js`
- `02__Src__AppModules/29__System__FogPlaneSystem/Na__FogPlaneSystem__SystemLogic.js`
- `02__Src__AppModules/29__System__FogPlaneSystem/Na__FogPlaneSystem__UiControls.js`
- `02__Src__AppModules/11__CameraUtils/Na__UiFeature__SaveCameraSettings.js`
- `02__Src__AppModules/11__CameraUtils/Na__UiFeature__OrbitMaxDistance__DevControls.js`
- `02__Src__AppModules/70__System__DevTools/Na__UiFeature__RenderEngine__DevControls.js`
- `02__Src__AppModules/28__System__GridLineSystem/Na__GridLineSystem__UiElement.js`
- `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__SceneEditor.js`

# ---------------------------------------------------------
## ValeVision3D v2.9.2 - 26-Jun-2026 - Match SketchUp Scene-First Default Camera Position (Scene 1 First Camera Position)

### Overview
ValeVision3D now sets the boot camera from SketchUp scene data rather than the manually-saved `Camera__DefaultPosition` block. When a project's `project.json` contains `ValeVison3D__SketchUpCameraData.scenes` or explicit `PresentationMode__SavedCameraScenes`, the first scene in the list becomes the authoritative launch camera — position, rotation, FOV, and orbit target are all taken from the SketchUp export, with no manual dev-tool override required.

### Changes

**SketchUp-first boot camera**
- `Na__SketchUp__AnimationScene__DataBridge__` v1.1.0 — new `Na__SketchUp__AnimationScene__ResolveDefaultLaunchScene(projectData)` export. Returns `{ scene, source }` for the first applicable scene (explicit PresentationMode default → SketchUp `scenes[0]`), or `null` when no scene data exists. Supports single-scene projects: the `ConvertBlock` ≥2 carousel gate is unchanged; `ConvertScene(block.scenes[0])` is called directly for 1-scene projects so the launch camera is always set from SketchUp.

**Deferred carousel camera apply**
- Both `na-presentation-mode-scenes-loaded` dispatch sites now include `skipCameraApply: true`. The carousel listener's existing guard (`detail.skipCameraApply === true`) means the UI registers scene state (card list, active-scene highlight) without jumping the camera prematurely.
- Camera apply moved to a single authoritative point in `Na__AppFlow__LoadingSequence` after the orbit cube resolves.

**Loading sequence camera block**
- `Na__AppFlow__LoadingSequence` — `Na__Saved__ProjectData` hoisted alongside the existing `Na__Saved__ProjectCameraConfig`. Post-orbit-cube camera block replaced with a scene-first branch:
  - If `ResolveDefaultLaunchScene` returns a scene → `ApplySceneCameraState` snap + `CaptureStartState(…, null)` (Reset View restores snapshot only; no `Camera__DefaultPosition` re-apply).
  - Else → existing `Camera__DefaultPosition` / `ApplyCameraConfig` path unchanged.

**Contract change — SaveCameraSettings**
- `Na__UiFeature__SaveCameraSettings` still writes `Camera__DefaultPosition` to Flask for backward-compatible fallback. On projects with SketchUp scene data, that key is superseded on load. To change the launch camera, update the SketchUp scene and re-sync rather than using the Save Camera dev tool.

### Verification
- **Warwick** (`2026/63770__Warwick`, 4 SketchUp scenes): launch camera matches `IMG01__3dView__ViewOption-01__MainView__`; carousel shows 4 scenes; Reset View returns to IMG01.
- **Single-scene project**: correct launch camera; no carousel.
- **No SketchUp scenes project**: `Camera__DefaultPosition` path unchanged.
- ElevationView, ImageExport, Walk/Fly modes unaffected (confirmed clean audit).

### Files Changed
- `02__Src__AppModules/69__System__SketchUpToValeVision__Utilities/Na__SketchUp__AnimationScene__DataBridge__.js`
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js`

# ---------------------------------------------------------
## ValeVision3D v2.9.1 - 25-Jun-2026 - Orbit Helper Cube Visibility Regression Fix

### Overview
Patch release fixing a regression introduced in v2.9.0: the shared build-version cache-bust token (`?v=<buildVersion>`) appended to GLB URLs caused the Orbit Helper Cube to render as a visible grey mesh instead of being filtered out for orbit-centre calculation only.

### Root Cause
`Na__ModelLoader__SeparateOrbitCubeUrl` identifies orbit-cube URLs with a `$`-anchored regex (`OrbitHelperCube__MeshModel__\.glb$`). After v2.9.0, model URLs arrive as `...__OrbitHelperCube__MeshModel__.glb?v=1782400744`, so the regex no longer matches, the cube is not separated from `filteredUrls`, and it loads and renders like any other MeshModel GLB.

### Changes
- **Filename parsing (MultiModel v1.2.1)** — strip any `?query` suffix before filename-based matching so cache-bust tokens cannot defeat `$`-anchored patterns.
- **`Na__ModelLoader__SeparateOrbitCubeUrl`** — `url.split('/').pop().split('?')[0]` before the OrbitHelperCube regex test (restores hide-from-scene / use-for-orbit-centre behaviour).
- **`Na__ModelLoader__ParseModelUrl`** — same query-strip applied defensively so category/storey/legacy classification stays robust to cache-bust or signed-URL query strings.
- **Cache-bust preserved** — the full URL (including `?v=`) is still passed to the GLTF loader; only filename interpretation strips the query.

### Verification
- Load a project with an orbit cube (e.g. `63592__Bressard-Kayode`): grey helper cube should not render; console should still log `OrbitHelperCube loaded. Center: ...`; orbit controls should centre correctly.
- Normal MeshModel/LineworkModel GLBs should still request with `?v=` on the network URL.

### Files Changed
- `02__Src__AppModules/15__ModelLoader/Na__ModelLoader__MultiModel.js`

# ---------------------------------------------------------
## ValeVision3D v2.9.0 - 25-Jun-2026 - Build-Version Cache-Bust (Real-Time R2 Assets)

### Overview
ValeVision3D now consumes the shared R2 build-version manifest (written by the Whitecardopedia sync pipeline, see Whitecardopedia v0.6.0). As it has no Service Worker, freshness is achieved with a cache-bust token rather than cache eviction: the manifest `buildVersion` is appended as `?v=<buildVersion>` to `project.json` and GLB model URLs. A sync makes re-synced camera data and models visible immediately, while assets stay edge/browser-cacheable between builds so large GLB downloads remain cheap.

### Changes
- **Build manifest (ProjectLoader v1.4.0)** — `Na__AppUtils__InitBuildManifest` fetches the shared manifest (cache-busted, memoised, non-throwing) and stores the `buildVersion` token.
- **Cache-bust token** — `Na__AppUtils__WithBuildToken` appends `?v=<buildVersion>`; applied to `project.json` URLs in `FetchProjectJson` and to all GLB URL formats in `ExtractModelUrls`.
- **Loading sequence** — `InitBuildManifest()` kicked off early alongside `InitMasterIndex()`.
- **Config SSOT** — `ProjectData__AssetUrls__BuildManifestUrl` added to `Na__AppConfig__Main.json`.

### Files Changed
- `02__Src__AppModules/03__AppUtils/Na__AppUtils__ProjectLoader.js`
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js`
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json`

# ---------------------------------------------------------
## ValeVision3D v2.8.0 - 25-Jun-2026 - SketchUp Camera Auto-Animation + R2 Master Index

### Overview
ValeVision3D now auto-builds Presentation Mode scenes from SketchUp-exported camera data (`ValeVison3D__SketchUpCameraData`), shows the scene carousel by default when two or more cameras exist, and uses human-readable card titles from the SketchUp scene description. All project assets resolve via the shared R2 master index (eliminating the 404 flood and the code-only folderId race that previously halted loading). See Whitecardopedia v0.5.0 for index generation/sync tooling and ValeVision Cloud Sync v0.2.0 for the SketchUp export pipeline.

### Changes
- **NEW `69__System__SketchUpToValeVision__Utilities/`** — three modules:
  - `Na__SketchUp__LoadSceneData__.js` — reads camera block; matches IMG## images/thumbnails from `project.json.images`.
  - `Na__SketchUp__ConvertSceneData__.js` — Z-up mm → Y-up PresentationMode schema; axis swap; vertical FOV; orbit target; `ShowCarouselByDefault: true`; >=2 scene gate; description-as-card-title.
  - `Na__SketchUp__AnimationScene__DataBridge__.js` — auto-build when no explicit PresentationMode block; dispatches `na-presentation-mode-scenes-loaded`.
- **R2-first assets (ProjectLoader v1.2.0)** — `FetchProjectJson` and `ResolveAssetUrl` try CDN then GH Pages; fallback toast.
- **Master index (ProjectLoader v1.3.0)** — `Na__AppUtils__InitMasterIndex`; resolves real `year/folderId` from numeric project code; honours `assetHome`.
- **Race fix (ProjectLoader v1.3.1)** — `FetchProjectJson` awaits index before building URLs; prevents memoised wrong `2026/63592` 404 that halted load and suppressed Presentation Mode.
- **Loading sequence (v1.5.0)** — early `InitMasterIndex`; SketchUp bridge after project.json load when no manual PresentationMode scenes.
- **Config SSOT** — `ProjectData__AssetUrls__IndexUrl` + fallback in `Na__AppConfig__Main.json`.
- **Reference doc** — `Research__RubySceneData__RIPDOWN__.md` (SketchUp Page/Camera API fields).

### Files Changed
- `02__Src__AppModules/69__System__SketchUpToValeVision__Utilities/Na__SketchUp__LoadSceneData__.js` (new)
- `02__Src__AppModules/69__System__SketchUpToValeVision__Utilities/Na__SketchUp__ConvertSceneData__.js` (new)
- `02__Src__AppModules/69__System__SketchUpToValeVision__Utilities/Na__SketchUp__AnimationScene__DataBridge__.js` (new)
- `02__Src__AppModules/03__AppUtils/Na__AppUtils__ProjectLoader.js`
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js`
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json`
- `Research__RubySceneData__RIPDOWN__.md` (new)

# ---------------------------------------------------------
## ValeVision3D v2.7.2 - 16-Jun-2026 - Carousel UI Cleanup: Remove Play Button and Pagination Dots

### Overview
Removed the play/pause slideshow button and pagination dot indicators from the Presentation Mode scene carousel. The slideshow auto-advance feature and all related state management were removed entirely; the dots were deemed redundant as thumbnails make the scene count self-evident.

### Changes
- **`Na__PresentationMode__UI__SceneCarousel.js`** — removed `DWELL_MS` constant; removed `IsPlaying` and `PlayTimer` state; removed `BuildDots`, `SlideshowAdvance`, `StartPlayback`, `StopPlayback`, `UpdatePlayButton`, `HandlePlayPauseClick` functions; removed `CancelCurrentTransition` import (now unused); removed dot-update logic from `SetActiveScene`; removed `StopPlayback` call-sites from `HandleCardClick`, `HandlePrevClick`, `HandleNextClick`, and `ToggleSceneCarousel`; removed auto-play startup block from `na-presentation-mode-scenes-loaded` handler; removed `StartPlayback`/`StopPlayback` from module exports.
- **`Na__PresentationMode__Styles__SceneCarousel__.css`** — removed Pagination Dots region (`.na-pm-carousel__dots`, `.na-pm-carousel__dot`, `.na-pm-carousel__dot--active`) and Play/Pause Button region (`.na-pm-carousel__play`, hover, `--playing` states).

### Files Changed
- `02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__UI__SceneCarousel.js`
- `03__Style__AppStylesheets/Na__PresentationMode__Styles__SceneCarousel__.css`

# ---------------------------------------------------------
## ValeVision3D v2.7.1 - 11-Jun-2026 - Presentation Mode Saved Camera Scenes

### Overview
Full Presentation Mode system for per-project saved camera scenes. Each project stores its own scene data inside its `project.json` under `PresentationMode__SavedCameraScenes`. Projects without this section are completely unaffected.

### Changes
- **New module folder:** `02__Src__AppModules/21__System__PresentationMode/`
- **`Na__PresentationMode__ProjectJson__SceneData.js`** — reads, validates, sorts and exposes saved scenes; thumbnail URL resolution; active scene id state.
- **`Na__PresentationMode__Camera__SceneTransition.js`** — captures/builds/applies/animates camera between scenes using quaternion slerp + position/target/FOV lerp with `easeInOutCubic`, `easeInOutQuad`, `linear` easing; uses `RequestActiveRender` during transitions.
- **`Na__PresentationMode__UI__SceneCarousel.js`** — bottom carousel (thumbnail cards, prev/next, pagination dots, play/pause); adaptive layout (adds `na-presentation-mode-active` to `<body>` → top toolbar); listens for `na-presentation-mode-scenes-loaded`.
- **`Na__PresentationMode__DevMenu__SceneEditor.js`** — localhost-only scene editor (add/update/rename/delete/reorder, FOV slider with live lens-mm readout, transition time slider, easing dropdown, WebP thumbnail regeneration, Save to Flask, Export JSON, Clear All).
- **`Na__PresentationMode__Thumbnail__Renderer.js`** — renders current WebGL framebuffer to a 480px WebP blob via offscreen 2D canvas downscale.
- **`Na__PresentationMode__DevTools__CameraPathVisualizer.js`** — CatmullRomCurve3 spline tube through scene camera positions + per-scene camera frustum markers + orbit target sphere markers; toggled from dev menu.
- **`Na__AppFlow__LoadingSequence.js`** (v1.4.0) — detects `PresentationMode__SavedCameraScenes` and dispatches `na-presentation-mode-scenes-loaded` with `sceneConfig` + `projectCode`.
- **`index.html`** — Views button added (hidden until scenes load), `#naPresentationCarousel` container, `#naPmDevEditorItem` dev section, all Presentation Mode init calls in Engine Entry Points.
- **`Na__PresentationMode__Styles__SceneCarousel__.css`** (new) — carousel layout, card styles, adaptive top-toolbar positioning, inactive-fade for toolbar and Tools menu.
- **`Na__UiFeature__Styles__DropdownAndToast__.css`** — collapsed Tools/Dev menu inactive opacity fade (0.78 → 1 on hover/focus/open).
- **`Na__CoreUi__Styles__Index__.css`** — added `@import` for the new carousel stylesheet.
- **`Whitecardopedia/server.py`** — new `POST /api/projects/<folder_id>/presentation-thumbnail/<scene_id>` endpoint to save WebP thumbnails into `PresentationMode/Thumbnails/`.

### Files Changed
- `02__Src__AppModules/21__System__PresentationMode/` (new folder, 6 new modules)
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js`
- `index.html`
- `03__Style__AppStylesheets/Na__PresentationMode__Styles__SceneCarousel__.css` (new)
- `03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css`
- `03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css`
- `../Whitecardopedia/server.py`

# ---------------------------------------------------------
## ValeVision3D v2.7.0 - 11-Jun-2026 - MaxModel Load Speed + Model/HDRI/DataLib Caching Strategy

### Overview
MaxModel projects hung longer on load than whitecard models despite simpler geometry. The hang was a fixed MaxEngine overhead, not the GLB: 24.5 MB 4K HDRI fetch (uncached, awaited inside the materials swap), DataLib SSOT fetches from GitHub raw (uncached, cross-origin), and PMREM pre-filtering. Model GLBs from the R2 CDN were never service-worker cached at all (cross-origin → ignored), so offline sessions had no models.

### Changes
- **HDRI swapped to optimised 1024p version** (`HdriSkydome__...__OptimisedVersion__1024p__.hdr`, 1.46 MB vs 24.5 MB). `Scene__Environment__HdriUrl` updated; reflections-only use (glass/mirror env maps) is visually identical. RGBE decode + PMREM generation also drop sharply with the smaller source.
- **Caching strategy (implemented in the shared Whitecardopedia SW — see Whitecardopedia DEVLOG v0.4.0)**:
  - Model GLBs: network-first with 4 s slow-network grace fallback to cache + background refresh; offline fallback; 36-entry LRU.
  - HDRI: cache-first (immutable) + precached at SW install.
  - DataLib SSOT JSONs: network-first with offline fallback.
  - R2 CDN + GitHub raw origins now SW-managed (CORS-enabled allowlist).

### Files Changed
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json`
- `../Whitecardopedia/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js`

# ---------------------------------------------------------
## ValeVision3D v2.6.1 - 11-Jun-2026 - HOTFIX - Vendored Three.js Broken Module Graph (No Models Loading)

### Overview
v2.6.0's local Three.js vendoring (fix M3) shipped an incomplete dependency graph — four transitive imports inside the vendored addons were never copied across, so every `three/addons/` import chain 404'd and the entire ES module graph failed to evaluate. **No model could load on any fresh client** (first observed on iPad).

### Root Cause
Vendored addons import relative files that were missing from `04__Lib__ThirdParty__Three/examples/jsm/`:
- `RenderPass.js` / `ShaderPass.js` → `postprocessing/Pass.js` (MISSING)
- `EffectComposer.js` → `postprocessing/MaskPass.js` + `shaders/CopyShader.js` (MISSING)
- `GLTFLoader.js` → `utils/BufferGeometryUtils.js` (MISSING)

### Fix
- Vendored the four missing files from `three@0.160.0` (exact match for the vendored core's `REVISION '160'`). Verified no further unresolved relative imports remain anywhere under `04__Lib__ThirdParty__Three/`.
- Whitecardopedia SW: version token bumped to `2026-06-11-2` (cache purge on all clients) and the vendored Three.js files added to the shell precache list (v2.6.0 claimed this but the entries were absent).

### New Files
- `04__Lib__ThirdParty__Three/examples/jsm/postprocessing/Pass.js`
- `04__Lib__ThirdParty__Three/examples/jsm/postprocessing/MaskPass.js`
- `04__Lib__ThirdParty__Three/examples/jsm/shaders/CopyShader.js`
- `04__Lib__ThirdParty__Three/examples/jsm/utils/BufferGeometryUtils.js`

# ---------------------------------------------------------
## ValeVision3D v2.6.0 - 11-Jun-2026 - PWA Stability Fix

### Overview
Comprehensive PWA stability pass addressing first-load hangs on iOS (especially from Whitecardopedia gallery → viewer handoff), progressive degradation after repeated loads, and service-worker version coherence.

### Critical Fixes
- **C1 — Unbounded load pipeline**: All `fetch` and `GLTFLoader.loadAsync` calls now go through `Na__AppUtils__ResilientLoad__` helpers (timeout + exponential-backoff retry). The loading overlay now transitions to an error state with a Retry button on any failure path — the overlay can no longer hang in a silent spinner state indefinitely.
- **C2 — GPU/memory leaks**: `Na__AppCore__GpuLifecycle__.js` wires `webglcontextlost`/`webglcontextrestored` handlers immediately after renderer creation, and registers a `pagehide` listener that disposes scene geometry, materials, textures, composer render targets, and the WebGLRenderer before the iOS WebContent process boots the next page.
- **C3 — Top-level config await**: The `await Na__AppConfig__LoadConfig()` call in `index.html` is now guarded by a `Promise.race` with a 10 s timeout and a visible error UI (error message + Retry button) rather than hanging silently.
- **C4 — SW version skew**: HTML responses now use network-first (not stale-while-revalidate) so deploys cannot pair stale HTML with freshly-revalidated modules. `controllerchange` bridge implemented in the SW Registrar (idle-only, single-session guard).

### Moderate Fixes
- **M1 — project.json timeout**: `Na__AppUtils__FetchProjectJson` uses `Na__ResilientLoad__FetchWithTimeout` (configurable via `LoadResilience__Config`). Promise-memoised per project code so duplicate calls (loading sequence + fog system) share one in-flight request.
- **M2 — Silent project fallback**: When `?project=` is present and `project.json` fails after retries, `Na__UiFeature__ShowLoadError` is shown instead of silently loading the legacy Clough default model.
- **M3 — Three.js CDN eliminated**: three@0.160.0 vendored locally under `04__Lib__ThirdParty__Three/`. Import map updated to local paths. All Three.js module files now ride the SW shell cache; no esm.sh cold-start cost on navigation.
- **M4 — Whitecardopedia memory**: React production builds + pinned Babel @7.29.7 in `app.html` (removes React dev overhead from shared iOS process memory budget).
- **M5 — Sequential GLB loads**: `Na__ModelLoader__LoadAllModels` now runs categories via a concurrency-capped pool (default 3 simultaneous, configurable). Mesh+linework within each category remain sequential.
- **M6 — No stall recovery**: `Na__AppCore__LoadWatchdog__.js` provides a total-budget timer (default 120 s) and a `visibilitychange` stall detector (default 30 s silence threshold) — iOS recovery hook so backgrounded mid-load sessions surface a Retry overlay rather than a frozen spinner.

### Low Fixes
- **L1 — SW controllerchange bridge**: Implemented (was documented but missing). Reloads exactly once per session, only when no load is in flight.
- **L2 — Duplicate project.json fetch**: Fixed via promise memoisation in `Na__AppUtils__ProjectLoader.js`.
- **L3 — Thumbnail LRU trim**: Now runs only after a successful cache `put` rather than on every thumbnail request.
- **L4 — Legacy manifest**: `Na__AppInstallability__Manifest.webmanifest` deleted (was unreferenced; could cause stale PWA identity for legacy installs).
- **L5 — Import map guard**: Inline script in `index.html` surfaces a readable unsupported-browser message when `HTMLScriptElement.supports('importmap')` returns false.
- **L6 — SW precache gap**: Expanded precache to include all `02__Src__AppModules/` entry-point JS files, both stylesheets, and `Na__AppConfig__Main.json` so the viewer boots from cache on poor connections.

### New Files
- `02__Src__AppModules/03__AppUtils/Na__AppUtils__ResilientLoad__.js`
- `02__Src__AppModules/01__AppCore/Na__AppCore__LoadWatchdog__.js`
- `02__Src__AppModules/01__AppCore/Na__AppCore__GpuLifecycle__.js`
- `04__Lib__ThirdParty__Three/three.module.js` (+ all required jsm addons)

### Modified Files
- `index.html` — config await guard, import map local paths, GPU lifecycle wiring, import-map guard, `resilienceConfig` in loading sequence context
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json` — `LoadResilience__Config` block added
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js` — watchdog, resilient helpers, error overlay, project failure surfacing
- `02__Src__AppModules/03__AppUtils/Na__AppUtils__ProjectLoader.js` — resilient fetch, memoization
- `02__Src__AppModules/15__ModelLoader/Na__ModelLoader__MultiModel.js` — resilient GLTF loads, concurrency-capped pool
- `03__Style__AppStylesheets/Na__UiFeature__Styles__LoadingOverlays__.css` — error state styles

# ---------------------------------------------------------
## ValeVision3D v2.5.0 - 10-Jun-2026
### Floating Navigation Toolbar + Project-JSON Reset View + Navigation Help Panel

**Overview**
Navigation is the primary way users interact with the model, so the user-facing navigation controls have moved out of the right-hand Tools & Settings menu (where "Navigation Mode" was buried in a submenu) into a new always-visible floating pill toolbar fixed to the bottom centre of the viewer: Orbit | Walk | Fly | Reset View | Help. The Tools menu stays focused on technical/configuration tools (camera, export, grid, layers, elevation, render engine, sharing, fullscreen).

**New — Floating Navigation Toolbar (`Na__UiFeature__NavigationToolbar__Controls.js`)**
- White rounded pill with subtle shadow, bottom-centre, using the prepared `UiIcons__MenuIcons__NavigationMenu` PNG icons with text labels (icons-only below 560px width).
- Active mode highlighted with a soft pale blue background. `Na__NavToolbar__SetActiveMode` is the single UI entry point for mode highlighting — toolbar buttons, Alt+Shift+W/F hotkeys, and the walk/fly toggle wrappers all route through it, so the highlight stays correct no matter where the mode change originates. Dispatches `na-navigation-mode-changed` for future consumers.
- Same gating as before: Orbit always visible; Walk/Fly buttons revealed by `na-navigation-modes-loaded` (project.json `Navmode__EnabledModes`) and by the Dev menu save callback. Mutual exclusivity preserved via the existing 'silent-off' / 'return-to-orbit' toggle hints.
- The old Tools-menu "Navigation Mode" section and its module (`Na__UiFeature__NavigationModes__Controls.js`) are RETIRED — markup removed from index.html, module deleted. Underlying navigation mode logic (SystemLogic, ModeTransition, hotkeys, state) is untouched.

**New — Reset View from Project JSON (`Na__Camera__ProjectStartState.js`)**
- The loading sequence now captures the canonical start state immediately after applying the project.json camera config + resolved orbit target: raw `Camera__DefaultPosition` block (authoritative) plus an applied snapshot of position/rotation/FOV/orbit target (fallback when no project.json — e.g. app-config boot camera).
- Reset View exits Walk/Fly first (return-to-orbit), restores the snapshot, re-applies the raw project config via `Na__UiFeature__ApplyCameraConfig` (legacy `Camera__DefaultTarget` stripped — orbit target is owned by `OrbitHelperCube__Position`), then `controls.update()` + render invalidation. No hard-coded reset location anywhere.

**New — Navigation Help Panel (`Na__UiFeature__NavigationHelpPanel__Controls.js`)**
- Modal help card triggered by the toolbar Help button: Orbit (rotate/pan/zoom), Walk (WASD, mouse look, sprint, Esc), Fly (WASD + Q/E, boost, Esc), Reset View, fullscreen pointer, Escape behaviour.
- Walk/Fly instruction sections show only when those modes are enabled for the current model.
- Closes via the X button, clicking the backdrop, or pressing Escape.

**Files Changed**
- NEW `02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__NavigationToolbar__Controls.js`
- NEW `02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__NavigationHelpPanel__Controls.js`
- NEW `02__Src__AppModules/10__NavigationAndCameras/Na__Camera__ProjectStartState.js`
- NEW `03__Style__AppStylesheets/Na__UiFeature__Styles__NavigationToolbar__.css` (+ registered in `Na__CoreUi__Styles__Index__.css`)
- `index.html` — toolbar + help panel markup, old Navigation Mode menu removed, hotkey/toggle wrappers rewired to `Na__NavToolbar__SetActiveMode`
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js` — canonical start state capture after saved camera re-apply
- DELETED `02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__NavigationModes__Controls.js` (superseded by the toolbar)

# ---------------------------------------------------------
## ValeVision3D v2.4.3 - 10-Jun-2026
### Negative Door Swing Angles + PureEngine Whitecard Enforcement

**Overview**
Two follow-up fixes from Bagot MaxModel testing: doors named with negative degrees opened the wrong way, and PureEngine was showing glass opacity/face colours (a regression introduced by the v2.4.1 indexed-material preservation).

**Fix 1 — Negative Door Rotation Degrees (`3dObjectIInteraction__Animation__ClickToOpenDoors__.js`)**
- The MOD name degree parser did NOT support negative values (neither does TrueVision's original — this was a faithful port of the same gap). Worse, for `MOD001__ROT__-110-Deg__DoorPanel` the regex `/(\d+)-Deg/i` silently matched `110` (skipping the minus), so the door opened +110° — the wrong direction — with no warning.
- FIX: regex now `/(-?\d+)-Deg/i` and the validity guard accepts any non-zero signed integer. The pivot rotation already applies the angle directly via `setFromAxisAngle`, so a negative value naturally reverses the swing. Duration scaling already used `Math.abs` and needed no change. Walk/fly proximity opening inherits the fix (shared registry + ToggleDoor).
- Convention: `110-Deg` = standard swing, `-110-Deg` = reversed swing. Header docs updated.
- NOTE: TrueVision has the same bug — flag for a future TrueVision patch.

**Fix 2 — PureEngine Showing Opacity / Face Colours (regression from v2.4.1)**
- v2.4.1 made the loader preserve indexed MAT###__ materials (required for MaxEngine's swap). Side effect: under PureEngine the preserved glass material (exporter-enriched, transparent) rendered with opacity, and the legacy local-library swap — previously a silent no-op because load destroyed the names — suddenly started matching MAT101 and applying PBR glass.
- FIX: New `Na__MaterialsSystem__ApplyWhitecardToIndexedMaterials(group, baseMeshMaterialConfig)` — replaces every indexed-named material with the shared whitecard material (same params the loader uses), capturing originals first. The engine materials flow is now strictly:
  - PureEngine : restore loaded originals → whitecard ALL indexed materials (classic appearance, zero face colours/opacity)
  - MaxEngine  : restore loaded originals (indexed names back after any Pure whitecarding) → DataLib SSOT swap → glass/mirror env overrides
- The dead PureEngine local-library swap path was removed from the loading sequence (`Na__PureEngine__ApplyLocalLibraryMaterials` + the `Na__MaterialsSystem__LoadLibrary` import) — it had never matched anything before v2.4.1 because load-time whitecarding destroyed the names, so removal restores exact pre-v2.4.1 PureEngine visuals. Engine switching cycles Pure→Max→Pure verified consistent via the capture/restore contract.

**Files Changed**
- `02__Src__AppModules/25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js` — signed degree regex + guard + docs
- `02__Src__AppModules/20__System__MaterialsSystem/Na__MaterialsSystem__MaterialSwap.js` — new `ApplyWhitecardToIndexedMaterials` export
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js` — engine materials flow rework (restore-first in Max branch, whitecard pass in Pure branch, legacy local-library path removed)

# ---------------------------------------------------------
## ValeVision3D v2.4.2 - 10-Jun-2026
### Glass Realism Upgrade + Red Failure Toast Diagnostics

**Overview**
Two MaxEngine refinements following the first successful Bagot MaxModel render. The glass looked pale and cartoonish compared to TrueVision's dark reflective glass — root cause was config values, not the materials pipeline. Separately, data-file load failures (DataLib, HDR, materials library, GLBs, project.json) were only logged to console; they now surface as red toast notifications for instant diagnosis.

**Glass Realism — Root Cause Was Config Drift, Not Materials Code**
Both apps use the SAME DataLib glass entry (`MAT101__Glass__ClearDefault`: pale blue rgb(230,240,255), Opacity 0.2). TrueVision's darker, more realistic look comes from its `Scene__Environment` config:
- `GlassBrightnessMultiplier: 0.25` — darkens the glass colour to 25% at override time (the "more black" look)
- `GlassEnvMapIntensity: 1.0` — full HDR reflection strength
ValeVision's config (written during the v2.4.0 port) had `1.0` brightness (no darkening) and `0.8` intensity — hence the washed-out cartoon glass.

**Changes**
- `Na__AppConfig__Main.json` — `Scene__Environment` updated to TrueVision parity: `GlassBrightnessMultiplier: 0.25`, `GlassEnvMapIntensity: 1.0`, `MirrorEnvMapIntensity: 1.0`, `MirrorBrightnessBoost: 1.0`, plus `MirrorRoughnessOverride: 0.14` (TrueVision value, previously missing). NEW realism knobs beyond TrueVision: `GlassRoughnessOverride: 0.03` (sharper reflections than the DataLib 0.05) and `GlassOpacityOverride: null` (set a number to raise glass presence; null = DataLib value).
- `Na__MaterialsSystem__MaterialSwap.js` — `ApplyGlassEnvironmentOverrides` extended with `roughnessOverride` + `opacityOverride` options; console log now reports all applied values. Safe across engine switches: each MaxEngine activation builds fresh materials from the DataLib config, so the darkening multiplier never compounds.
- `Na__AppFlow__LoadingSequence.js` — passes the new glass/mirror override options from config.

**Red Failure Toasts — The Missing Event Bridge**
Sub-systems were already dispatching `na-show-toast` CustomEvents (DataLib loader, AO performance monitor) but NOTHING in ValeVision listened — failures were silently dropped. TrueVision has this bridge in its Index.html; ValeVision never received it during earlier ports.
- `index.html` — added the `na-show-toast` window listener bridging events to `Na__UiFeature__ShowToast` (red styling via existing `na-toast--error` class).
- NEW red-toast dispatch points:
  - `Na__Scene__DefaultSceneLighting.js` — HDR env URL missing or HDR load failure ("glass/mirror reflections disabled")
  - `Na__MaterialsSystem__LibraryLoader.js` — local materials library HTTP failure or fetch exception
  - `Na__AppFlow__LoadingSequence.js` — empty DataLib materials index (MaxEngine), project.json load failure, top-level model load error
  - `Na__ModelLoader__MultiModel.js` — per-GLB mesh/linework load failures (all four catch paths, named per category)
  - DataLib JSON fetch failures (already dispatched by `AppCore__DataLib__Loader.js`) now actually display via the new bridge

# ---------------------------------------------------------
## ValeVision3D v2.4.1 - 10-Jun-2026
### MaxModel Loading Fixes — Storey GLB Parsing, Indexed Material Preservation, Token-Based Door Collection

**Overview**
First MaxModel project (62609__Bagot) exposed three loading-path bugs that broke storey-based GLB sets exported by the TrueVision GLB Builder. Confirmed via DevTools network capture (only 5 of 13 GLBs requested), runtime scene report (storey files collapsed into `ValeVision__LegacyModel`), and the GLB export log (which proved `MAT101__Glass__ClearDefault` was correctly exported but never rendered). All three fixes are TrueVision-parity ports and are fully backwards compatible — existing whitecard/blockout projects behave identically.

**Bug 1 — Storey GLBs collapsed into one legacy bucket (5 of 13 files loaded)**
- `Na__ModelLoader__ParseModelUrl` had no storey branch. Filenames like `Bagot__Storey__GroundFloor__ProposedDoors__MeshModel__.glb` failed the primary `(ValeVision|NaModel|TrueVision)__` regex and fell into the legacy fallback, which assigns ALL matches to the single key `ValeVision__LegacyModel`. Each storey file overwrote the previous — only the last mesh+linework pair (ProposedWindows) survived classification.
- FIX: Added `Na__ModelUrl__StoreyParseRegex` (`/(?:.*?__)?Storey__([A-Za-z]+)__([A-Za-z]+)__(MeshModel|LineworkModel)__\.glb/i`) and a storey branch in `ParseModelUrl` — checked AFTER the primary regex, BEFORE the legacy fallback — producing distinct keys like `Storey__GroundFloor__ProposedWindows`. Storey categories load via the existing unordered second pass (same as TrueVision). The legacy fallback remains for genuinely old projects.

**Bug 2 — Glass never transparent (indexed materials whitecard-replaced at load)**
- `Na__ModelLoader__LoadSingleMesh` unconditionally replaced every untextured material with the shared whitecard material — destroying the `MAT101__Glass__ClearDefault` name before the MaxEngine DataLib swap could ever match it. The glass mesh was in the scene but rendered as opaque whitecard.
- FIX: New `Na__ModelLoader__PrepareMeshMaterial` resolver — materials matching `/^MAT\d{3}__/` are PRESERVED (cloned + DoubleSide + polygon offset only), exactly mirroring TrueVision's `CloneAndPrepareMaterial`. Non-indexed materials keep the exact previous treatment (textured → emissive prep, untextured → whitecard). Multi-material arrays now handled. Old whitecard GLBs contain zero indexed materials (export logs show "0 materials exported"), so PureEngine projects are unaffected.
- Diagnostic: logs `preserved N indexed material(s) for swap pass` per GLB when indexed materials are found.

**Bug 3 — Door animations dead (category key matching could never succeed)**
- LoadingSequence door init checked `categoryKey.includes('ProposedDoors') && categoryKey.includes('MeshModel')` — but Map category keys NEVER contain `MeshModel`/`LineworkModel` (those live on child root names via `userData.Na__ModelType`). This was silently broken for v4 flat projects too, not just storey sets.
- FIX: Ported TrueVision's token-based pattern: `Na__ResolveDoorCategoryNameTokens` (config-driven, defaults `['ProposedDoors', 'ExistingDoors']`) + `Na__CollectDoorModelGroups` which matches tokens against category keys (`Storey__GroundFloor__ProposedDoors` ✓) and pulls mesh/linework roots from group children via `userData.Na__ModelType`. Collected ARRAYS are passed to `Na__DoorAnimation__Initialize` (already array-capable since its original port) so multiple door categories — e.g. one per storey — all register.

**Files Changed**
- `02__Src__AppModules/15__ModelLoader/Na__ModelLoader__MultiModel.js` — storey regex + parse branch; `Na__ModelLoader__PrepareMeshMaterial` with indexed preservation + array handling; header devlog
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js` — token-based door collection (v1.2.1)
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json` — added `3dObject__Interaction__DoorAnimation__CategoryNameTokens: ["ProposedDoors", "ExistingDoors"]`

**Expected Results (Bagot MaxModel)**
- All 13 GLBs request and render: walls, roofs, doors, existing walls, windows, landscape
- MaxEngine glass: `MAT101__Glass__ClearDefault` survives load → DataLib swap applies Opacity 0.2 / Transparent / DoubleSide / HDR env reflections
- Door click + walk/fly proximity animations work (ADR/MOD hierarchy preserved by exporter's DoorHandler)
- Model toggle menu lists each storey element category automatically

**Deliberately Out of Scope**
- TrueVision's Storey View / Storey Isolate UI controls (per-floor visibility UX — optional follow-up)
- `Na__ModelLoader__ConsolidateInstances` performance port

# ---------------------------------------------------------
## ValeVision3D v2.4.0 - 10-Jun-2026
### Dual Render Engine — PureEngine (Default) + MaxEngine (TrueVision PBR/SSAO Port)

**Overview**
ValeVision now has two render engines, selectable per model. **PureEngine** is the original super-simplified whitecard pipeline — unchanged, always the default; every existing project behaves identically. **MaxEngine** is the full TrueVision-equivalent pipeline (SSAO + AO blur, DataLib-driven PBR materials hot-swap, glass/mirror env overrides) for the rare projects that want full PBR. A new Dev-menu "Render Engine" section selects + saves the engine to `project.json` (standard GET-merge-POST). When MaxEngine is saved for a model, a "Render Engine" section appears in the user-facing Tools & Settings menu allowing live switching between both engines; PureEngine-only models show no trace of the feature. Door click + proximity animations work identically under both engines.

**Engine Architecture (Critical — see new .cursor rule)**
- `05__RenderPipeline/01__Engine__PureEngine/Na__RenderPipeline__PureEngine__Setup.js` — the original `Na__RenderPipeline__PostProcessing__Setup.js` relocated verbatim (function renamed `Na__RenderPipeline__PureEngine__SetupComposer`). Zero behavioural change.
- `05__RenderPipeline/02__Engine__MaxEngine/Na__RenderPipeline__MaxEngine__Setup.js` — ported from TrueVision: RenderPass → ProfileLines → Fog → SSAO → AO Blur → FXAA, separate depth pre-pass RT (no composer-RT DepthTexture = no WebGL feedback loop), AO layer-1 exclusion, `camera.layers.enable(1)`. Exposes ValeVision's full pipeline-state contract (insertFogPass, depthTexture, profileNormal/ColorTarget, profileLinesPassRef) PLUS Max extras (renderDepthPrePass, setDepthPrePassSize, updateAoUniforms, setAoSize, monitorAoFrame, toggleAo) — so ImageExport / ElevationView / GridLines / 2D profile lines keep working under both engines.
- No cross-imports between engine folders. Shared infra (ProfileLines, RenderLoop Invalidation, RenderEngine state, user controls) lives in the parent `05__RenderPipeline/` folder.
- New rule file `.cursor/rules/07-RenderEngine-Architecture-.mdc` (alwaysApply) documents the separation so future agents cannot couple the engines.

**SSOT Materials — No Duplicate Data Files**
- New `01__AppCore/AppCore__DataLib__Loader.js` (ported from TrueVision) fetches the four `Na__DataLib__CoreIndex__*.json` files from the SAME GitHub raw URLs TrueVision uses (`Adam-Noble-01/Plugins/.../Na__Common__DataLib__CoreSuEntityStandards/`). MaxEngine material properties therefore come from the single source of truth — no locally-maintained copy was created.
- `Na__MaterialsSystem__LibraryLoader.js` — `BuildLookup` now resolves either root key (`Na__AppConfig__MaterialsLibrary` local / `Na__DataLib__CoreIndex__Materials` SSOT) + `forceRebuild` param for engine switches. PureEngine continues to use the unchanged local library path.
- `Na__MaterialsSystem__MaterialSwap.js` — upgraded to TrueVision parity: multi-material array handling, AoExclude layer-1 assignment (material flag + DataLib name tokens), mirror/glass environment override functions. NEW: original materials captured in `userData.na_originalMaterial` on first swap + `Na__MaterialsSystem__RestoreOriginalMaterials()` so switching back to PureEngine restores the exact pre-swap appearance (and clears AO layer tags). TrueVision's hardcoded MAT140 mirror debug counters were deliberately not ported.

**Loading Sequence (`Na__AppFlow__LoadingSequence.js` v1.2.0)**
- Engine-aware composer builder `Na__RenderEngine__BuildPipeline()`: PureEngine built at startup (always); rebuilt as MaxEngine after `project.json` read when configured; live runtime switching via `na-render-engine-switch` event (re-entrancy guarded, old composer/RTs disposed best-effort, fog pass re-inserted + tDepth rebound).
- Engine-aware materials: MaxEngine → `Na__DataLib__LoadAll()` → DataLib lookup → swap + glass/mirror env overrides + distance culling registration. PureEngine → restore originals → re-run unchanged local-library swap. DataLib fetch failure falls back gracefully (keeps current materials, toast shown).
- RenderFrame additions (no-ops under PureEngine): `updateAoUniforms`, `monitorAoFrame` (3 s startup-delay gated), `renderDepthPrePass`, `Na__DistanceCulling__Update`.
- Resize additions: `setDepthPrePassSize` / `setAoSize` (optional calls).
- **Door animations verified under MaxEngine**: startup order unchanged (materials swap → door registry scan), and the door system holds Object3D refs + transforms — never material refs — so swap/restore in either direction cannot break click-to-open or walk/fly proximity opening.

**New Files**
- `05__RenderPipeline/01__Engine__PureEngine/Na__RenderPipeline__PureEngine__Setup.js` (relocated original; old file deleted)
- `05__RenderPipeline/02__Engine__MaxEngine/Na__RenderPipeline__MaxEngine__Setup.js`
- `05__RenderPipeline/02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__.js` (config-gated, off by default)
- `05__RenderPipeline/Na__RenderEngine__State.js` — configured vs active engine accessors
- `05__RenderPipeline/Na__UiFeature__RenderEngine__Controls.js` — user-facing Tools section (dynamic visibility)
- `07__Scene__EnvironmentEffects/Na__RenderEffect__AmbientOcclusion__.js` + `__Shader.js` — custom log-depth SSAO (Three's SSAOPass cannot work with logarithmicDepthBuffer)
- `01__AppCore/AppCore__DataLib__Loader.js` — SSOT DataLib fetch
- `70__System__DevTools/Na__UiFeature__RenderEngine__DevControls.js` — dev radios + Save (live preview on radio change)
- `.cursor/rules/07-RenderEngine-Architecture-.mdc`

**Files Modified**
- `Na__AppFlow__LoadingSequence.js` — engine wiring (see above)
- `Na__MaterialsSystem__MaterialSwap.js` / `Na__MaterialsSystem__LibraryLoader.js` — TrueVision parity + restore support
- `Na__Scene__DefaultSceneLighting.js` — added `Na__Scene__ApplyEnvironmentMap` (HDR + PMREM, MaxEngine only)
- `Na__AppConfig__Main.json` — `RenderEngine__Config` default, `RenderEffect__AmbientOcclusion`, `Scene__Environment` (disabled until an HDR asset is added), `RenderEffect__DistanceCulling` (disabled)
- `index.html` — Tools + Dev menu HTML sections, config extraction, init calls, event listeners
- `TestEnv__PrototypeTestingSandbox__Main__.js` — import path updated to PureEngine setup

**project.json Schema Addition (per model, optional)**
```json
"RenderEngine__Config": { "RenderEngine__Active": "MaxEngine" }
```
Key absent or `"PureEngine"` → default behaviour, no visible change.

**Known Limits / Honest Notes**
- `Scene__Environment` is enabled and points at `./01__AppAssets__ValeVision/05__AppAssets__SkyDomes/HdriSkydome__RuralLandscape__AutumnField__SunnyDay__4k__.hdr` — a byte-identical copy of TrueVision's HDRI (MD5 verified), relocated into the proper app-assets tree mirroring TrueVision's `05__AppAssets__SkyDomes` convention. It is loaded lazily, only when MaxEngine activates, so PureEngine sessions never fetch the 4k HDR.
- AO `setSize` receives CSS pixels while the depth pre-pass RT is pixel-ratio scaled — ported as-is from TrueVision for visual parity (subtle SSAO sampling offset at DPR > 1).
- SSAO kernel is unseeded `Math.random()` (per TrueVision) — AO noise pattern varies per page load.

# ---------------------------------------------------------
## ValeVision3D v2.3.7 - 09-Jun-2026
### Navigation Modes — Walk and Fly Mode Port from TrueVision3D

**Overview**
Full port of Walk and Fly navigation modes from TrueVision3D into ValeVision3D. Both modes are gated by a per-model enable flag stored in `project.json` so legacy models are unaffected — Orbit remains the only mode unless a developer explicitly enables others. A new Dev-menu section lets the developer toggle Walk/Fly availability per model and save it to `project.json`. A new dynamic Tools menu section (hidden unless more than one mode is available) lets users switch between the enabled modes at runtime with a tri-state status indicator showing which mode is currently active. Doors open by proximity in both Walk and Fly modes, reusing ValeVision's existing door-proximity system unchanged.

**Files Added**
- `02__Src__AppModules/10__NavigationAndCameras/Na__Navmode__FlyMode__SystemLogic.js` — Free-fly camera: smoothed velocity, yaw/pitch from Euler, no gravity or collision. Ported from TrueVision3D.
- `02__Src__AppModules/10__NavigationAndCameras/Na__Navmode__FlyMode__DesktopControls.js` — WASD/QE/Space keyboard + pointer-lock mouse look for fly mode. Ported from TrueVision3D.
- `02__Src__AppModules/10__NavigationAndCameras/Na__Navmode__FlyMode__TouchScreenControls.js` — Single-finger move, two-finger look, pinch vertical for fly mode on touch devices. Ported from TrueVision3D.
- `02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__FlyModeControls.js` — Fly mode orchestration layer: init, toggle, door proximity wiring, render loop requests. Ported from TrueVision3D.
- `02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__FlyModeEventListeners.js` — Alt+Shift+F hotkey and button wiring for fly mode. Ported from TrueVision3D.
- `02__Src__AppModules/10__NavigationAndCameras/Na__Navmode__ModeTransition.js` — Smooth camera handoff between Orbit↔Walk and Orbit↔Fly; preserves orbit distance/elevation on return. Ported from TrueVision3D.
- `02__Src__AppModules/10__NavigationAndCameras/Na__NavigationModes__State.js` — Shared state accessor: stores Walk/Fly enabled flags read from project.json; drives hotkey gating and Tools menu visibility.
- `02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__NavigationModes__Controls.js` — User-facing Tools menu section: dynamically revealed when >1 mode is enabled; tri-state status badges; mutual exclusivity enforcement.
- `02__Src__AppModules/70__System__DevTools/Na__UiFeature__NavigationModes__DevControls.js` — Localhost-only dev section: Walk/Fly checkboxes + Save button (GET-merge-POST to `/api/projects/{code}`).

**Files Modified**
- `02__Src__AppModules/10__NavigationAndCameras/Na__Navmode__WalkMode__SystemLogic.js` — Added `Na__WalkMode__GetSavedOrbitState`, `Na__WalkMode__ClampEntryPitch`, `Na__WalkMode__NudgeCapsuleForward` (required by ModeTransition); updated `Na__WalkMode__Deactivate` to accept `overrideCameraPosition` parameter.
- `02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__WalkModeControls.js` — Routed activate/deactivate through `Na__Navmode__ModeTransition` for spatial continuity; stores camera ref for transition.
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js` — Added Fly Mode imports; reads `Navmode__EnabledModes` from project.json and sets state accessor; dispatches `na-navigation-modes-loaded` event; added Fly branch to `RenderFrame` with door-proximity update using fly camera position.
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json` — Added `Navmode__Settings.Navmode__FlyMode` block (all fly defaults), `Global__Hotkeys__ToggleFlyMode: Alt+Shift+F`, and `Navmode__EnabledModes` global default block (`Walk: false, Fly: false`).
- `03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css` — Added `.na-navmode__btn`, `.na-navmode__btn--active`, `.na-navmode__status` tri-state button styles.
- `index.html` — Added Navigation Modes Tools menu HTML section (hidden by default); added Navigation Modes Dev menu HTML section; added Fly system imports; added FlyMode init; gated Walk/Fly hotkeys on per-model enable flags; added both new UI module init calls in Engine Entry Points.

**Architecture**
- Orbit is always on. Walk and Fly default to disabled in both AppConfig and project.json.
- `project.json` now supports an optional `Navmode__EnabledModes` key: `{ Navmode__EnabledModes__Walk: bool, Navmode__EnabledModes__Fly: bool }`.
- The loading sequence reads this key and broadcasts `na-navigation-modes-loaded` so the Tools menu and dev checkboxes update asynchronously without polling.
- The dev save writes the key back via the standard Flask GET-merge-POST to `/api/projects/{code}`; published to CDN via the normal git/GH Pages deployment flow.
- Door proximity is unchanged — fly mode reuses `3dObjectInteraction__Animation__WalkMode__ProximityToOpenDoors__.js` as-is; the render loop calls `Na__DoorProximity__Update(Na__FlyMode__GetCameraPosition())` while fly is active.

# ---------------------------------------------------------
## ValeVision3D v2.3.6 - 24-May-2026
### Profile Lines — Architectural Alignment with TrueVision (Mesh/Linework Discrimination Tags)

**Overview**
- Forward-looking, low-risk architectural port from TrueVision. ValeVision was already running fast and already had the basic `LineSegments2` filter in `collectMeshObjects`, but it was missing the explicit `userData.Na__ModelType` discrimination tags that TrueVision now uses. This port adds those tags + a defensive parent-chain guard so any future render effect (or collision/raycast/picking system) can cleanly filter "operate only on mesh roots" or "operate only on linework roots" without relying on `obj.isMesh` heuristics — which is unsafe because `LineSegments2` sets `isMesh = true` internally.
- No behaviour change in the current effect output. This is purely an architectural alignment so the two cousin codebases share the same discrimination contract.

**Why This Was Worth Doing Even Though ValeVision Is Already Fast**
- ValeVision currently uses `obj.isMesh && !obj.isLine2 && !obj.isLineSegments2` as the only filter in `collectMeshObjects`. That works for the current `LineSegments2` shape, but the moment any future loader produces a `Mesh` node nested inside a linework GLB tree (e.g. a hidden bounding mesh for frustum culling, or a debug placeholder), it would silently slip into the profile-colour material-swap pass and corrupt the linework's `LineMaterial`. The new third-line `Na__IsInsideLineworkGroup` guard prevents that class of bug from ever appearing.
- TrueVision now uses the same three-stage filter. Aligning ValeVision now means any future visual effect ported between the two apps will Just Work.

**Model Loader — Tagged Mesh and Linework Roots**
- `02__Src__AppModules/15__ModelLoader/Na__ModelLoader__MultiModel.js` — both the priority-order loop AND the unordered-fallback loop now set:
    - `meshRoot.userData.Na__ModelType = 'mesh';` immediately after `Na__ModelLoader__LoadSingleMesh(...)` returns.
    - `lineworkRoot.userData.Na__ModelType = 'linework';` immediately after `Na__ModelLoader__LoadSingleLinework(...)` returns.
- These tags propagate to every descendant via the parent chain — they are read by walking `current.parent` upwards, so individual mesh nodes do NOT need to be tagged individually. One tag per GLB root is enough.
- Existing `Na__ProfileLineColorDominant` / `Na__ProfileLineColorByName` / `Na__ProfileLineColor` userData was left untouched — those are separate concerns (per-mesh dominant colour for the profile prepass) and continue to work as before.

**Profile Lines — Defensive Parent-Chain Guard**
- `02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__ProfileLines__.js` — added new helper `Na__IsInsideLineworkGroup(object)` that walks the ancestor chain testing for `userData.Na__ModelType === 'linework'`.
- `collectMeshObjects` now filters in three stages, each a defensive backstop for the next:
    1. `obj.isMesh` must be true (only real meshes considered).
    2. `obj.isLine2 / obj.isLineSegments2` must be false (fat-line shells set `isMesh = true` internally and must NEVER have their `LineMaterial` swapped).
    3. Ancestor chain must not be a linework GLB root (defensive: ignores any stray Mesh nodes nested inside a linework tree).
- The behaviour for the current scene graph is identical to before (the existing fat-line filter already caught everything that mattered). The architectural value is in stage 3 being there as a safety net for future scene graphs.

**Diagnostic Console Log (One-Shot Per Cache Rebuild)**
- `rebuildSceneCache` now logs `[ProfileLines] Scene cache rebuilt: N meshes (swap), M lines (hide)` after each rebuild. Fires once per scene-dirty event (typically once at startup, again on a model reload). Makes it trivial to confirm the mesh-vs-linework split is clean if you ever suspect something is being processed twice. Matches the same diagnostic added to TrueVision in its v2.2.5 port.

**Files Changed**
- `02__Src__AppModules/15__ModelLoader/Na__ModelLoader__MultiModel.js` — added 4 `userData.Na__ModelType` tag assignments (2 in priority-order loop, 2 in unordered-fallback loop).
- `02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__ProfileLines__.js` — added `Na__IsInsideLineworkGroup` helper; expanded `collectMeshObjects` from a one-line `if` into a three-stage filter using the new helper; added one-shot diagnostic console log to `rebuildSceneCache`.

**Verification**
- No linter errors in either file.
- No behaviour change expected for current scenes; the existing `LineSegments2` filter already handled the only real-world case. New guard is a safety net.

**Known Future Opportunity (Not Done In This Pass)**
- `02__Src__AppModules/10__NavigationAndCameras/Na__Navmode__WalkMode__SystemLogic.js` `Na__WalkMode__SetCollisionMeshes` uses the same bare `if (!child.isMesh) return;` pattern (line ~280) and currently pushes every `LineSegments2` fat-line shell into the collision raycast set. ValeVision's collision counts are smaller than TrueVision's so this hasn't manifested as a felt slowdown, but it is the same architectural issue. Could be cleaned up in a future pass using the now-available `userData.Na__ModelType === 'linework'` tag.

# ---------------------------------------------------------
## ValeVision3D v2.3.5 - 21-May-2026
### Site Boundaries Toggle — Conditional Layer Support

**Overview**
- Added `Site Boundaries` as a first-class toggleable model layer, driven by the new `08__Site__Boundaries` SketchUp tag. When a project has boundary GLBs uploaded, a "Site Boundaries" toggle button appears automatically in the Model Parts List panel between "Doors" and "Landscape". Projects without boundary geometry are unaffected.

**Model Loader — Load Order**
- `"ValeVision__SiteBoundaries"` inserted into `Na__ModelCategories__LoadOrder` in `Na__ModelLoader__MultiModel.js` between `ProposedDoors` (tag 25) and `LandscapeEnvironment` (tags 07, 09), matching the tag-08 numeric position in the SSOT.
- The loader's URL parse regex already accepted `ValeVision__SiteBoundaries` filenames; no regex changes required.

**Toggle UI — Display Name**
- `"ValeVision__SiteBoundaries": "Site Boundaries"` added to `Na__ModelToggle__DisplayNames` in `Na__UiFeature__ModelToggle__Controls.js` at the correct position between ProposedDoors and Landscape.
- Button only appears when `TrueVision__SiteBoundaries__*` GLBs are present in the project's `valeVision_ModelUrls` array.

**Cloudflare Bucket Builder — Automatic project.json Sync**
- `AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__Main__.py` extended with a new `REGION | Project JSON Sync` containing four functions: `find_whitecardopedia_project_json`, `build_all_cdn_urls_for_project`, `refresh_project_json_model_urls`, `refresh_all_project_json_urls`.
- New **STEP 8** added to `main()` — runs after every execution (including when all R2 files are already up to date) to refresh `valeVision_ModelUrls` in every Whitecardopedia `project.json` from the current local GLB sync folder. Eliminates the previous requirement to manually run `AutomationUtil__FetchLocalProjects` after each new GLB export.
- `--dry-run-only` flag still suppresses all writes including STEP 8.
- Added `import json` to the script's imports.

**Files Changed**
- `02__Src__AppModules/15__ModelLoader/Na__ModelLoader__MultiModel.js` — added `ValeVision__SiteBoundaries` to load order
- `02__Src__AppModules/26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js` — added display name
- `Whitecardopedia/Tools__DevUtils/AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__Main__.py` — STEP 8 JSON sync

# ---------------------------------------------------------
## ValeVision3D v2.3.4 - 29-Apr-2026
### Dev Tools — Confirm Modals + Camera Configurations Grouping

**Overview**
- Added a shared in-app confirmation dialog that gates the four destructive Dev Tools writes to `project.json` so a stray click can no longer overwrite saved camera positions, fog settings, grid offsets, or orbit-max overrides.
- Reorganised the Dev Tools dropdown so "Save Camera Settings" and "Project Max Zoom Radius" no longer float as bare items at the top — both now live inside a single "Camera Configurations" submenu with proper section titles.

**Shared Confirm Dialog**
- New module `02__Src__AppModules/03__AppUtils/Na__AppUtils__ConfirmDialog.js` exposing `Na__AppUtils__ConfirmDialog__Show({ title, message, confirmLabel, cancelLabel, isDestructive })` which returns a `Promise<boolean>`.
- Cancel / backdrop click / Escape resolve `false`; Confirm / Enter resolve `true`. Auto-cancels any prior open dialog so re-entry cannot leak listeners or promises. Falls back to `window.confirm()` if the modal markup is missing.
- Single `<div id="naConfirmDialog">` element added to `index.html` next to the toast notification, with backdrop, title, message, Cancel and Confirm buttons. Uses `aria-modal="true"` and `aria-hidden` toggling for accessibility.
- New CSS region appended to `03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css` covering `.na-confirm-dialog`, `.na-confirm-dialog__backdrop`, `.na-confirm-dialog__panel`, `.na-confirm-dialog__title|message|actions`, plus a destructive warm-red accent (`#b3382c`) via `.na-confirm-dialog__confirm--destructive`. No new stylesheet file — buttons reuse existing `na-dropdown-menu__action*` classes for visual consistency.

**Confirm-Gated Save Actions (project.json writes only)**
- Save Camera Settings — title "Overwrite Saved Camera?", message includes the project code.
- Save to Project (orbit max distance) — title "Save Orbit Max Override?", message includes the mm value and project code.
- Save Fog Settings — title "Overwrite Saved Fog Settings?".
- Save Grid Position — title "Overwrite Saved Grid Position?", message includes the project code.
- Apply Live, Clear from Project, Remove Plane A/B, and Place Fog Plane A/B were intentionally NOT gated (non-persistent or trivially redoable).

**Camera Configurations Submenu**
- Replaced the two floating items `naSaveCameraSettingsItem` and `naOrbitMaxDistanceItem` with one new submenu `Camera Configurations` (`naCameraConfigItem` / `naCameraConfigToggle` / `naCameraConfigPanel`).
- Inside the panel: a "Saved Camera + Orbit Target" heading with the Save Camera Settings action button, divider, then a "Project Max Zoom Radius" heading with the Effective display, Override input, and the Apply Live / Save to Project / Clear from Project buttons (flattened inline — no nested submenu).
- All inner control IDs preserved (`naSaveCameraSettingsButton`, `naOrbitMaxDistanceCurrent`, `naOrbitMaxDistanceInput`, `naOrbitMaxDistanceApply`, `naOrbitMaxDistanceSave`, `naOrbitMaxDistanceClear`) so existing JS bindings continue to work.
- `Na__UiFeature__SaveCameraSettings.js` now owns the wrapper visibility and the new submenu open/close toggle; lookup retargeted from `naSaveCameraSettingsItem` to `naCameraConfigItem`.
- `Na__UiFeature__OrbitMaxDistance__DevControls.js` had its now-redundant wrapper-reveal and submenu-toggle wiring trimmed (the parent submenu owns those concerns); only the inline orbit-max controls remain.

**Files Added**
- `02__Src__AppModules/03__AppUtils/Na__AppUtils__ConfirmDialog.js`

**Files Changed**
- `index.html` — added `#naConfirmDialog` markup; replaced floating Save Camera + Project Max Zoom Radius items with a single `Camera Configurations` submenu containing both
- `03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css` — appended `Confirm Dialog (Shared Destructive-Action Modal)` region with backdrop, panel, typography, and destructive-button styles
- `02__Src__AppModules/11__CameraUtils/Na__UiFeature__SaveCameraSettings.js` — confirm-gated save; retargeted wrapper id to `naCameraConfigItem`; wired submenu toggle
- `02__Src__AppModules/11__CameraUtils/Na__UiFeature__OrbitMaxDistance__DevControls.js` — confirm-gated save; removed redundant wrapper/submenu-toggle wiring
- `02__Src__AppModules/29__System__FogPlaneSystem/Na__FogPlaneSystem__UiControls.js` — confirm-gated `Save Fog Settings` click handler
- `02__Src__AppModules/28__System__GridLineSystem/Na__GridLineSystem__UiElement.js` — confirm-gated `Save Position` write inside `Na__GridUi__SavePositionToProject`

# ---------------------------------------------------------
## ValeVision3D v2.3.3 - 29-Apr-2026
### Orbit Max Zoom Distance — iPad +50% Bonus + Per-Project Override

**Overview**
- iPad / touch devices were noticeably more restricted than PC when zooming out from the helper cube. Added a config-driven multiplier so touch devices get +50% extra orbit-out distance by default while PC behaviour stays unchanged.
- Added a per-project override (`Navmode__OrbitMaxDistanceMm` in `project.json`) that replaces the per-device default for both PC and iPad equally — useful on the ~10% of projects with unusually large or small site footprints. iPad bonus does NOT stack on top of the project override.
- New "Project Max Zoom Radius" controls inside Dev Tools allow viewing the live effective cap, applying a value live for testing, saving it to `project.json` via the Flask API, or clearing it back to the per-device default.

**Default Config**
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json` — added `Navmode__IpadControls__OrbitMaxDistanceMultiplier: 1.5` inside the existing `Navmode__IpadControls` block. iPad effective max becomes `50 m * 1.5 = 75 m` out of the box; PC stays at 60 m.

**Navigation Modules — Multiplier + Runtime-Mutable Cap**
- `02__Src__AppModules/10__NavigationAndCameras/Na__DefaultNavmode__IpadControls.js` — multiplies `config.maxDistanceMm` by `config.maxDistanceMultiplier` (defaults to 1.0 when missing, so existing callers like Whitecardopedia / TestEnv are unaffected). Bundle now exposes `setMaxDistanceMm(mm)` for runtime mutation.
- `02__Src__AppModules/10__NavigationAndCameras/Na__DefaultNavmode__MouseControls.js` — wheel-zoom clamp now reads `controls.maxDistance` live (instead of the closure-captured value) so post-init mutations affect both wheel and orbit equally. Same `setMaxDistanceMm(mm)` setter exposed.

**Per-Project Override Read in App Flow**
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js` — alongside the existing `Camera__DefaultPosition` and `OrbitHelperCube__Position` reads, captures `projectData.Navmode__OrbitMaxDistanceMm` and applies it to `Na__Controls__Orbit.maxDistance` post-fetch and pre-render-loop. iPad multiplier is intentionally NOT re-applied on top.

**index.html Wiring**
- Added `maxDistanceMultiplier` to the iPad branch of `Na__Navmode__ConfigPayload` so the iPad nav module receives the bonus from JSON.
- Initial Dev Tools dropdown markup added a top-level "Project Max Zoom Radius" submenu (subsequently flattened into the `Camera Configurations` submenu in v2.3.4).
- New init call `Na__UiFeature__InitializeOrbitMaxDistanceDevControls(...)` registered alongside `Na__UiFeature__InitializeSaveCameraButton(...)`.

**Dev Tools — New Module**
- New module `02__Src__AppModules/11__CameraUtils/Na__UiFeature__OrbitMaxDistance__DevControls.js`. Mirrors the `Na__UiFeature__SaveCameraSettings.js` Flask round-trip pattern.
  - **Apply Live** — sets `controls.maxDistance` instantly via the nav-bundle setter, no persistence.
  - **Save to Project** — writes `Navmode__OrbitMaxDistanceMm` into `project.json`.
  - **Clear from Project** — deletes the key and restores the per-device default (PC: 60 m; iPad: 50 m × 1.5 = 75 m) by recomputing from the in-memory `Na__Navmode__ActiveConfig`.
- Live "Effective Max" display refreshed on every `OrbitControls 'change'` event, so panning/zooming reflects the cap immediately.
- All controls are localhost-gated via `Na__AppUtils__IsRunningOnLocalhost()` — production users never see them.

**Files Added**
- `02__Src__AppModules/11__CameraUtils/Na__UiFeature__OrbitMaxDistance__DevControls.js`

**Files Changed**
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json` — added `Navmode__IpadControls__OrbitMaxDistanceMultiplier: 1.5`
- `02__Src__AppModules/10__NavigationAndCameras/Na__DefaultNavmode__IpadControls.js` — applied multiplier to effective max distance; exposed `setMaxDistanceMm`
- `02__Src__AppModules/10__NavigationAndCameras/Na__DefaultNavmode__MouseControls.js` — wheel-zoom reads live `controls.maxDistance`; exposed `setMaxDistanceMm`
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js` — applied `Navmode__OrbitMaxDistanceMm` from `project.json` post-fetch
- `index.html` — wired `maxDistanceMultiplier` into iPad payload; added initial `Project Max Zoom Radius` Dev Tools markup; imported and called the new dev-controls initializer

# ---------------------------------------------------------
## ValeVision3D v2.3.2 - 09-Apr-2026
### Email Workers — R2 CDN Contacts, BCC Admin Copy, Deployment Tooling

**Overview**
- Moved encrypted address book from Cloudflare Worker bundle to Cloudflare R2 CDN, enabling contact list updates without Worker redeployment.
- Frontend now fetches and decrypts the address book client-side using Web Crypto API (AES-256-GCM).
- Python encryption tool updated to upload directly to R2 via boto3 and auto-patch the decryption key into both `.dev.vars` and the frontend config JSON.
- Every outbound email is now BCC'd to the first contact in the encrypted address book (admin record-keeping). The BCC address is resolved at send time by the Worker fetching and decrypting the R2 address book — no email addresses are hardcoded or visible in committed code.
- Worker simplified to send-only (`/send` + `/verify-auth` + `/health`); contacts route removed.
- Added one-click deployment and local dev batch scripts.

**R2 CDN Contacts (replaces Worker /contacts route)**
- Encrypted address book uploaded to `cdn.noble-architecture.com/VaApps/ValeVision3D/data/Na__Email__AddressBook__Encrypted__.json`.
- New `Na__Feature__EmailWorkers__AddressBook__Decryptor__.js` — fetches encrypted JSON from CDN, decrypts with AES-256-GCM using key from config, returns normalised contact list.
- Config JSON now includes `ContactsCdnUrl` and `ContactsDecryptKeyB64` fields.
- Python encryption tool (`Na__Email__AddressBook__EncryptionTool__.py.--HIDDEN`) now: encrypts → writes local copy → uploads to R2 → patches `.dev.vars` → patches config JSON. Single-command workflow.

**BCC Admin Copy**
- Worker reads `CONTACTS_CDN_URL` and `EMAIL_ADDRESSBOOK_KEY_B64` at send time, decrypts the address book, and uses the first entry's email as `bccRecipients` in the Microsoft Graph payload.
- BCC always fires, even when the admin is in the To list (enables self-test sends).
- If decryption fails, BCC is silently skipped — send still proceeds.

**Deployment Tooling**
- `CloudflareWorker/Deploy__Worker.bat` — loads API token from shared env file, deploys Worker, sets all Wrangler secrets.
- `CloudflareWorker/Dev__Worker.bat` — starts local dev server on port 8787 with `.dev.vars` secrets.
- Worker deployed to `https://valevision3d-email-worker.adam-fb3.workers.dev`.
- New `CLOUDFLARE_WORKERS_API_TOKEN` added to `Token__CloudflareAPI.env` (separate from R2 token, with Workers Scripts/KV/R2/Routes/D1 permissions).

**Security Fixes**
- Scrubbed leaked credentials from `.env.template` (all values replaced with `{{REDACTED}}`).
- Encryption tool no longer patches `.env.template` (only `.dev.vars` and config JSON).
- Removed hardcoded `BCC_ADMIN_EMAIL` from `wrangler.jsonc` — BCC address now derived from encrypted address book at runtime.
- Added `.wrangler/` to `.gitignore` to prevent build artifact commits.
- Force-pushed to erase intermediate commits containing leaked values from git history.

**Files Added**
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__AddressBook__Decryptor__.js`
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/Deploy__Worker.bat`
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/Dev__Worker.bat`

**Files Changed**
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Email__AddressBook__EncryptionTool__.py.--HIDDEN` — added boto3 R2 upload, config JSON patching, removed `.env.template` patching
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__Config.json` — added CDN URL, decrypt key, verify-auth endpoint; changed API base URL to deployed Worker
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__UiInteractionLogic__.js` — contacts load via client-side decryptor instead of Worker API
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/src/index.js` — removed /contacts route and bundled JSON import; added BCC from R2 decrypt; simplified to send-only
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/wrangler.jsonc` — added account_id, CONTACTS_CDN_URL; removed BCC_ADMIN_EMAIL, ALLOWED_ORIGIN (moved to secret)
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/.env.template` — all values replaced with `{{REDACTED}}`
- `.gitignore` — added `.wrangler/`, `.dev.vars`

# ---------------------------------------------------------
## ValeVision3D v2.3.1 - 09-Apr-2026
### Email Auth Overlay — Password-Gated Email Send Authorization

**Overview**
- Added a password authentication gate to the email send flow, preventing unauthorized use of the email system from publicly shared project links.
- When "Send email" is clicked, a password overlay appears requesting a shared internal password before the email is dispatched.
- Password is verified server-side by the Cloudflare Worker using timing-safe comparison against a Wrangler secret, returning an HMAC-SHA256 signed token valid for 30 days.
- The signed token is stored in `localStorage` and automatically included with subsequent send requests, so the password only needs to be entered once per month.

**New Frontend Modules**
- `Na__Feature__EmailWorkers__AuthOverlay__.js` — vanilla JS modal DOM builder with password input, show/hide toggle (eye icon), error display with shake animation, Submit/Cancel buttons, Enter/Escape keyboard support, and loading state during verification.
- `Na__Feature__EmailWorkers__AuthManager__.js` — `localStorage` token persistence (`valevision3d_email_auth_token` + `valevision3d_email_auth_expiry`) with `hasValidAuthToken()`, `saveAuthToken()`, `clearAuthToken()`, and `ensureAuthorized()` orchestrator that creates the overlay, calls the verify endpoint, and resolves with the token on success.

**Cloudflare Worker Changes (`src/index.js`)**
- New `POST /api/email/verify-auth` route — rate-limited to 5 password attempts per hour per IP (separate bucket from send), compares submitted password to `EMAIL_AUTH_PASSWORD` Wrangler secret using `crypto.subtle.timingSafeEqual`, returns an HMAC-SHA256 signed token with 30-day expiry on success.
- HMAC token utilities — `Na__EmailApi__CreateHmacToken` creates `base64url(payload).base64url(signature)` tokens, `Na__EmailApi__VerifyHmacToken` verifies signature and expiry.
- `POST /api/email/send` now requires `Authorization: Bearer <token>` header — validates the HMAC token signature and expiry before processing.
- CORS `Access-Control-Allow-Headers` updated to include `Authorization`.
- `ALLOWED_ORIGIN` moved from `wrangler.jsonc` `vars` to a Wrangler secret, eliminating `.dev.vars` override conflicts during local development.

**New Wrangler Secrets**
- `EMAIL_AUTH_PASSWORD` — the shared password for email send authorization.
- `EMAIL_AUTH_TOKEN_SECRET` — random 32+ character HMAC-SHA256 signing key for auth tokens.
- `ALLOWED_ORIGIN` — moved from plaintext vars to encrypted secret.

**Deployment Tooling**
- `CloudflareWorker/Deploy__Worker.bat` — one-click deploy script that loads the Cloudflare API token from `Token__CloudflareAPI.env`, deploys the Worker, and sets all Wrangler secrets.
- `CloudflareWorker/Dev__Worker.bat` — one-click local dev server launcher (`wrangler dev` on port 8787).

**Files Modified**
- `Na__Feature__EmailWorkers__ApiClient__.js` — added `verifyAuth(password)` method and `Authorization: Bearer` header on `sendEmail()`.
- `Na__Feature__EmailWorkers__UiInteractionLogic__.js` — `btnSend` handler now calls `ensureAuthorized()` before building payload; aborts silently on cancel.
- `Na__Feature__EmailWorkers__Config.json` — added `EmailWorkers__Config__VerifyAuthEndpoint: "/verify-auth"`.
- `Na__Feature__EmailWorkers__FormOverlay__Stylesheet__.css` — added auth overlay CSS region (z-index 3200, fade/slide-up animations, error shake animation).
- `CloudflareWorker/wrangler.jsonc` — removed `ALLOWED_ORIGIN` from vars, documented new secrets in comments.
- `CloudflareWorker/.dev.vars` — added `ALLOWED_ORIGIN`, `EMAIL_AUTH_PASSWORD`, and `EMAIL_AUTH_TOKEN_SECRET` for local dev.

**Files Added**
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__AuthOverlay__.js`
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__AuthManager__.js`
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/Deploy__Worker.bat`
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/Dev__Worker.bat`

# ---------------------------------------------------------
## ValeVision3D v2.3.0 - 09-Apr-2026
### Email Workers — Internal Send-Email System via Microsoft Graph

**Overview**
- New "Send project email" feature in the Tools menu allowing users to send the ValeVision3D project share email directly to colleagues from within the app, without leaving the browser or using an external mail client.
- Uses a Cloudflare Worker backend that authenticates via Cloudflare Access JWT, decrypts an AES-256-GCM-encrypted internal address book, and sends HTML email through Microsoft Graph (client-credentials OAuth2 flow).
- Autocomplete recipient input with chip-based selection (Outlook-style) driven by the encrypted address book.
- Per-IP rate limiting (10 emails per hour, configurable).

**New Module: `62__Feature__EmailWorkers`**
- `Na__Feature__EmailWorkers__Config.json` — API routing config with localhost override for local dev.
- `Na__Feature__EmailWorkers__ApiClient__.js` — fetch wrapper with AbortController timeout, config-driven endpoint resolution, contacts and send methods.
- `Na__Feature__EmailWorkers__FormOverlay__.js` — programmatic modal DOM builder with recipients chip container, greeting names input, notes textarea, Cancel / Generate & download / Send email buttons.
- `Na__Feature__EmailWorkers__FormOverlay__Stylesheet__.css` — modal overlay CSS with chip, suggestion dropdown, and button styles matching the Vale Design Suite palette.
- `Na__Feature__EmailWorkers__AddressBook__Autocomplete__.js` — chip-input controller with address-book filtering, freeform email entry, keyboard shortcuts (Enter, comma, semicolon), and click-to-remove chips.
- `Na__Feature__EmailWorkers__PayloadBuilder__.js` — assembles send payload by combining selected recipients with the existing Share Project Link email template (reuses `BuildEmailHtml` from `61__Feature__ShareProjectLink`).
- `Na__Feature__EmailWorkers__UiInteractionLogic__.js` — wires Tools menu button, overlay show/hide with chevron sync, non-blocking background contacts load, generate-download flow, and send-email flow with loading state and toast feedback.

**Cloudflare Worker: `62__Feature__EmailWorkers/CloudflareWorker`**
- `src/index.js` — Worker entry with CORS preflight, Cloudflare Access JWT verification (auto-bypassed in dev when team domain is unconfigured), AES-GCM address book decryption, Microsoft Graph `sendMail` via client-credentials token, per-IP sliding-window rate limiter, and health endpoint.
- `wrangler.jsonc` — Worker config with non-secret env vars (tenant ID, client ID, sender user, allowed origin, rate limit).
- `package.json` — dependencies: `jose` for JWT verification, `wrangler` for dev/deploy.
- `assets/Na__Email__AddressBook__Encrypted__.json` — AES-256-GCM encrypted address book (committed to git, safe to be public).
- `.env.template` — reference file listing all required env vars with placeholder values.
- `.dev.vars` — local dev secrets loaded automatically by `wrangler dev` (gitignored).

**Address Book Encryption Tooling**
- `Na__Email__AddressBook__Source__.json.--HIDDEN` — plaintext contact list (14 contacts, gitignored via `*.--HIDDEN` pattern).
- `Na__Email__AddressBook__EncryptionTool__.py.--HIDDEN` — Python script using `cryptography` library for AES-256-GCM encryption. Generates a random 256-bit key, encrypts the contacts, writes the encrypted JSON to the Worker assets folder, and auto-patches the key into `.dev.vars` and `.env.template`. Single-command workflow for adding new contacts.

**Tools Menu Integration**
- New "Send project email" menu item added between "Share project link" and "Enter Full Screen" in the Tools & Settings dropdown.
- Reuses the Share Link icon asset.

**`.gitignore` Updates**
- Added `*.--HIDDEN` pattern to hide plaintext address book source and encryption tooling from git.
- Added `.dev.vars` pattern to hide wrangler local dev secrets.

**Files Added**
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__Config.json`
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__ApiClient__.js`
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__FormOverlay__.js`
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__FormOverlay__Stylesheet__.css`
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__AddressBook__Autocomplete__.js`
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__PayloadBuilder__.js`
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Feature__EmailWorkers__UiInteractionLogic__.js`
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Email__AddressBook__Source__.json.--HIDDEN`
- `02__Src__AppModules/62__Feature__EmailWorkers/Na__Email__AddressBook__EncryptionTool__.py.--HIDDEN`
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/src/index.js`
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/wrangler.jsonc`
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/package.json`
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/assets/Na__Email__AddressBook__Encrypted__.json`
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/.env.template`
- `02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/.dev.vars`

**Files Changed**
- `index.html` — added Send Email menu item HTML, module import, and initialisation call
- `03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css` — added CSS import for email overlay stylesheet
- `.gitignore` — added `*.--HIDDEN` and `.dev.vars` patterns

# ---------------------------------------------------------
## ValeVision3D v2.2.0 - 07-Apr-2026
### Fog Plane System — Planar Fog with Camera Force Field

**Overview**
- Complete replacement of the old orbit-anchored radial fog system (which never rendered correctly) with a new planar fog system that lets users place up to two configurable fog planes to mask off sections of a building model.
- Each fog plane acts as both a visual fog boundary and a camera force field, preventing navigation into the fogged zone.

**New System: `29__System__FogPlaneSystem`**
- `Na__FogPlaneSystem__Config.json` — default fall-off distance, slider step values (250mm–20000mm), plane visual style (blue semi-transparent), camera constraint padding, fog colour.
- `Na__FogPlaneSystem__FogShaderEffect.js` — custom post-processing `ShaderPass` with GLSL fragment shader that reconstructs world position from the logarithmic depth buffer and computes signed distance from up to two world-space planes. Fall-off uses `smoothstep` between the plane surface and the configured distance. Background pixels are projected to `cameraFar` so linework and profile-line edges at geometry silhouettes are fogged correctly.
- `Na__FogPlaneSystem__PlaneCreation.js` — click-to-place system modelled on the Elevation View tool. Raycasts against model meshes, snaps the face normal to the nearest cardinal axis (X or Z), builds a blue semi-transparent `PlaneGeometry` group with a draggable inner handle. Drag moves the plane along its normal via screen-Y delta.
- `Na__FogPlaneSystem__CameraConstraint.js` — per-frame camera position clamping with configurable padding. Pushes camera and orbit target back to the plane surface if they cross to the fog side. Active even when planes are visually hidden.
- `Na__FogPlaneSystem__SaveSettings.js` — per-project save/load using the same GET-merge-POST pattern as the camera and grid save systems. Data stored under `FogPlane__Config` in `project.json`.
- `Na__FogPlaneSystem__SystemLogic.js` — main orchestrator: async config load, sub-module initialisation, fog pass creation, saved-state restoration, per-frame update dispatch, clipping-plane helpers.
- `Na__FogPlaneSystem__UiControls.js` — Dev Tools panel wiring: fog enable toggle (off by default), plane visibility toggle, discrete-step fall-off slider, Place Plane A/B buttons, Remove buttons, Save button.

**Dev Tools UI**
- New "Fog Effect" dropdown added to the Dev Tools menu with: Enable Fog toggle, Show Planes toggle, Fall-off Distance slider (250mm, 500mm, 1m, 2m, 2.5m, 5m, 10m, 20m), Place Fog Plane A/B buttons, Remove Plane buttons (appear after placement), Save Fog Settings button.

**Render Pipeline Changes**
- Fog `ShaderPass` is late-inserted into the `EffectComposer` chain (after Profile Lines, before FXAA) via a new `insertFogPass` method on the pipeline state object. This handles the async system initialisation that completes after the composer is already built.
- Fog shader correctly covers profile-line Sobel edges and linework at geometry silhouettes by projecting background-depth pixels (depth = 1.0) to `cameraFar` distance instead of skipping them. The normal prepass hides `LineSegments2` so the depth buffer has no linework data; the far-distance projection ensures those pixels still go through the fog calculation.

**Old System Removed**
- Deleted `Na__Scene__DefaultFogEffect.js` (orbit-anchored radial fog shader that never worked).
- Removed `Scene__Default__FogConfig` from `Na__AppConfig__Main.json`.
- Stripped all old fog imports, calls, state caching, and elevation-mode fog toggling from `index.html` and `Na__AppFlow__LoadingSequence.js`.
- Scene background set directly to white (`0xffffff`) instead of via the old fog helper.

**Files Added**
- `02__Src__AppModules/29__System__FogPlaneSystem/Na__FogPlaneSystem__Config.json`
- `02__Src__AppModules/29__System__FogPlaneSystem/Na__FogPlaneSystem__FogShaderEffect.js`
- `02__Src__AppModules/29__System__FogPlaneSystem/Na__FogPlaneSystem__PlaneCreation.js`
- `02__Src__AppModules/29__System__FogPlaneSystem/Na__FogPlaneSystem__CameraConstraint.js`
- `02__Src__AppModules/29__System__FogPlaneSystem/Na__FogPlaneSystem__SaveSettings.js`
- `02__Src__AppModules/29__System__FogPlaneSystem/Na__FogPlaneSystem__SystemLogic.js`
- `02__Src__AppModules/29__System__FogPlaneSystem/Na__FogPlaneSystem__UiControls.js`

**Files Deleted**
- `02__Src__AppModules/07__Scene__EnvironmentEffects/Na__Scene__DefaultFogEffect.js`

**Files Changed**
- `index.html` — removed old fog imports/config/setup; added white background; added fog UI HTML to Dev Tools; added fog UI import and init call; added `showToast` passthrough to loading sequence context
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js` — removed old fog imports/state/per-frame update/elevation fog toggle; added fog system import and async init after model load; added fog pass pipeline insertion; added fog per-frame update in render loop
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json` — removed `Scene__Default__FogConfig` block
- `02__Src__AppModules/05__RenderPipeline/Na__RenderPipeline__PostProcessing__Setup.js` — added `insertFogPass` method for late fog pass insertion into the composer chain; exposed in return object

# ---------------------------------------------------------
## ValeVision3D v2.1.5 - 07-Apr-2026
### Scene Inspector — Copy Tree to Clipboard

**Overview**
- Added a Copy Tree button to the Scene Inspector toolbar that serialises the last scanned node tree to plain text and writes it to the clipboard in two report formats.

**Feature Details**
- Copy Tree button added to the Scene Inspector toolbar row alongside Hide All, Restore All, and Isolate Pair.
- Button provides inline visual feedback: label changes briefly to `Copied!`, `Failed`, or `No scan yet` before restoring.
- Output contains two sections separated by dividers:
  1. **Concise Report** — type and node name only, indented with 4 spaces per level offset by 1 (Scene's direct children start flush; indentation begins at depth 2).
  2. **Full Report With States & Statistics** — pipe-separated fields: `Type Name  |  N triangles  |  Visible = True/False`. Triangle count segment only shown for Mesh nodes.
- Last scanned tree is cached in module state (`Na__SceneInspector__LastScannedTree`) after each Rescan so the copy operation does not require re-traversal.

**Files Changed**
- `02__Src__AppModules/70__System__DevTools/Na__UiFeature__SceneInspector__Controls.js` — new `REGION | Copy Tree to Clipboard` with `BuildNodeTextLineConcise`, `BuildNodeTextLineFull`, updated `WalkTreeToText` (lineBuilder callback), `CopyTreeToClipboard`; new DOM ID constant; new state variable; tree cache in scan handler; copy button wired in init
- `index.html` — Copy Tree button added to Scene Inspector toolbar

# ---------------------------------------------------------
## ValeVision3D v2.1.4 - 20-Mar-2026
### Tools Menu — Share Link + Full Screen Icon Update

**Overview**
- Updated the Tools menu icon wiring so the new dedicated Share Link and Full Screen icon assets are now used by their matching feature rows.

**UI Changes**
- Share project link row now uses `Icon__ToolsMenu__ShareLink__540p__.png`.
- Full screen row now uses `Icon__ToolsMenu__FullScreen__540p__.png`.
- Removed temporary text-based fullscreen icon styling now that the image icon is active.

**Files Changed**
- `index.html` — swapped icon source paths for Share Link and Full Screen rows.
- `02__Src__AppModules/60__Feature__FullScreenMode/Na__Feature__FullScreenMode__Stylesheet__.css` — removed `.na-dropdown-menu__btn-icon--text` styling block.

# ---------------------------------------------------------
## ValeVision3D v2.1.3 - 13-Mar-2026
### Tools Menu — Icon Set Added

**Overview**
- Added custom icon set to the Tools dropdown menu to improve visual clarity and reduce reliance on text-only labels.

**Icons Added**
- Five 540p PNG icons added to `01__AppAssets__ValeVision/UiIcons__MenuIcons__ToolsMenu/`:
  - `Icon__ToolsMenu__CameraSettings__540p__.png`
  - `Icon__ToolsMenu__ExportImage__540p__.png`
  - `Icon__ToolsMenu__GridSystem__540p__.png`
  - `Icon__ToolsMenu__ViewModelLayers__540p__.png`
  - `Icon__ToolsMenu__ElevationView__540p__.png`

**UI Changes**
- Each Tools menu button now displays its icon to the left of the label at 24px (1.2× base size).
- Icon uses `opacity: 0.75` to sit subordinate to the text label.
- `.na-dropdown-menu__btn-icon` and `.na-dropdown-menu__btn-label` CSS classes added to `Na__UiFeature__Styles__DropdownAndToast__.css`.
- Menu item order updated: Grid Lines moved to third position (above Toggle Model Layers).

**Files Changed**
- `index.html` — icon `<img>` elements and `<span>` label wrappers added to all 5 Tools menu buttons; Grid Lines item reordered to position 3
- `03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css` — `.na-dropdown-menu__btn-icon` and `.na-dropdown-menu__btn-label` classes added

# ---------------------------------------------------------
## ValeVision3D v2.1.2 - 13-Mar-2026
### Elevation View — Grid Origin Plane Anchor

**Overview**
- Elevation planes are now anchored to the project's saved grid origin (the red X marker) rather than the raw raycast hit point. This aligns the elevation coordinate system to the project UCS so orthographic views are centred on the correct site reference point.

**New Module**
- `Na__ElevationView__OffsetPlane__ToProjectGridOrigin.js` — fetches the project's persisted `GridLine__Grid__Offset__Config` from the Flask API, converts `OffsetXMm`/`OffsetZMm` to Three.js units (Z negated to match the grid convention), and caches the result as a `THREE.Vector3`. Exports `Na__ElevOffsetPlane__LoadGridOrigin()` (async, called at init) and `Na__ElevOffsetPlane__GetGridOriginPoint()` (synchronous getter).

**Anchor Logic**
- A new `Na__Elev__GridAnchorPoint` state variable holds the resolved anchor: XZ from the grid origin, Y from the raycast hit point. This replaces `Na__Elev__HitPoint` as the positional anchor in both `Na__Elev__UpdatePlaneTransform` and `Na__Elev__UpdateOrthoCameraTransform`.
- If no grid origin is loaded (no project code, or project has no saved grid offset), the anchor falls back to the hit point — preserving the original behaviour.

**Freeform Nudge Config**
- Added `ElevationView__Plane__Config__AnchorOffsetXMm` and `ElevationView__Plane__Config__AnchorOffsetZMm` to `Na__ElevationView__Config.json` (both default `0`). These allow the anchor to be nudged away from the grid origin in world XZ without changing the saved grid UCS.

**Files Added**
- `02__Src__AppModules/40__System__2dElevationsView/Na__ElevationView__OffsetPlane__ToProjectGridOrigin.js`

**Files Changed**
- `02__Src__AppModules/40__System__2dElevationsView/Na__ElevationView__SystemLogic.js` — import, state variable, init call, anchor computation, plane and camera transform updates, cleanup reset
- `02__Src__AppModules/40__System__2dElevationsView/Na__ElevationView__Config.json` — two new anchor offset keys

# ---------------------------------------------------------
## ValeVision3D v2.1.1 - 13-Mar-2026
### Grid Lines System — Configurable Scene Grid Overlay

**Overview**
- New Grid Lines system allowing users to overlay a configurable grid on the XZ plane. The grid is disabled by default and must be enabled via the "Show Grid" toggle in the toolbar. All parameters are driven by a dedicated JSON configuration file.

**Grid Controls**
- Grid Size: discrete steps (100mm, 250mm, 500mm, 1000mm, 2000mm, 2500mm, 5000mm) controlling cell spacing.
- Grid Height: linear slider (-1000mm to 1000mm, 100mm step) to raise or lower the grid plane along Y.
- Grid Style collapsible section containing:
  - Line Width: discrete pixel steps (0.10, 0.25, 0.50, 1.00, 1.50, 3.00 px) using Three.js addons fat lines (`LineMaterial` / `LineSegments2`) for accurate GPU-rendered width control — standard `LineBasicMaterial` linewidth is capped at 1px on most hardware.
  - Line Type: Solid, Dashed, or Dotted via `LineMaterial` dashing properties.
  - Line Colour: predefined palette dropdown (Grey, Red, Black, Mid Grey, Vale Blue).
  - Line Opacity: slider (20%–100%, default 50%) with transparent material blending.
  - Line Gap Size: scalar slider (0.2x–5.0x) visible only for Dashed/Dotted types.
- Localhost-only Grid Position section: X and Z axis offset sliders with a "Save Position" button that persists the current offsets and height to the project JSON via the Flask API (same pattern as Save Camera Settings). On next load, persisted offsets are read back from the project JSON and applied as initial slider values.

**Technical Approach — Fat Lines**
- Replaced `THREE.LineBasicMaterial` / `THREE.LineSegments` with `LineMaterial` / `LineSegments2` / `LineSegmentsGeometry` from `three/addons/lines` for robust line width rendering across all hardware.
- `LineMaterial.resolution` is updated on window resize to maintain correct pixel-width rendering.
- Z-axis offset is negated internally in the creation logic so the config and UI use intuitive positive values while correctly mapping to Three.js right-handed coordinates.

**Origin Marker (Localhost Dev Aid)**
- A red X marker renders at the grid origin on localhost, moving with X/Z position offsets to help align the grid to the model during development.

**Default State**
- Grid is disabled on startup. The user must check the "Show Grid" toggle to display it. No grid geometry is created until the user enables the toggle.

**Files Added**
- `02__Src__AppModules/28__System__GridLineSystem/Na__GridLineSysem__Config.json`
- `02__Src__AppModules/28__System__GridLineSystem/Na__GridLineSysem__GridCreationLogic.js`
- `02__Src__AppModules/28__System__GridLineSystem/Na__GridLineSystem__UiElement.js`

**Files Changed**
- `index.html` — Grid Lines menu HTML, import, and initialization call with toast callback and pipeline ref

**Bug Fixes**
- Fixed a spurious white rectangle appearing near the origin when the grid was enabled. Root cause: the profile lines system caches scene objects once on init and never re-checks when new objects are added. Each call to `Na__GridLine__Update` disposes and recreates `LineSegments2` objects, leaving the cache pointing to stale references. The new objects were not hidden before the normal prepass, so `scene.overrideMaterial = MeshNormalMaterial` rendered their internal template quad as a white filled plane with profile edges. Fix: `invalidateProfileLinesCache()` is now called via the pipeline ref on every grid geometry rebuild (`Na__GridUi__ApplyUpdate`) and on every enable/disable toggle, forcing the cache to rebuild before the next render pass.

**Elevation View Config — MM Units**
- Elevation plane config values (Width, Height, Offset, LiftY, HandleWidth, HandleHeight) now use millimeters in `Na__ElevationView__Config.json` and are converted to scene units via `Na__Math__ConvertMmToUnits()` in `Na__ElevationView__SystemLogic.js`, aligning with AppConfig conventions.

# ---------------------------------------------------------
## ValeVision3D v2.1.0 - 13-Mar-2026
### Vertical Perspective Correction — Architectural Line Straightening

**Overview**
- New feature that corrects the perspective distortion of vertical lines when the camera is tilted up or down, a critical requirement for architectural imagery. When enabled, vertical world lines render as true pixel-aligned verticals in both the live viewport and all image exports.

**Technical Approach — Projection Matrix Shear**
- Applied a shift-lens correction directly to `camera.projectionMatrix` rather than a post-process shader, eliminating resampling artifacts.
- Each rendered frame: `camera.updateProjectionMatrix()` resets to a clean symmetric frustum, then `elements[9] += tan(pitch) * elements[5]` shifts the frustum asymmetrically to cancel vertical convergence. `projectionMatrixInverse` is kept in sync for correct raycasting.
- The pitch angle is derived from `camera.getWorldDirection()` each frame, so the correction tracks any camera movement in real time.
- `camera.updateProjectionMatrix()` is called at the start of `ApplyFrame` every frame to prevent the shear from compounding across frames — ensuring the horizon stays level.

**Navigation Lock**
- When vertical correction is active, orbit controls are disabled to prevent the jarring camera drift loop that occurs when navigating with the shear applied.
- A centred overlay notification ("Navigation locked — Vertical Correction is active") appears and fades automatically after 3 seconds.
- Any attempted navigation input (mouse, wheel, touch) while locked re-shows the notification so the user is clearly informed.

**Export Pipeline Integration**
- The correction is applied in both the "Download Image" (PNG) and "Create Drawing" (Layout View) export paths.
- In custom-resolution export mode, `camera.updateProjectionMatrix()` is called internally to apply the export aspect ratio, which previously wiped the shear. `Na__VerticalCorrection__ApplyFrame()` is now called immediately after to re-apply the correction before `composer.render()` fires.
- After the export restore block, `ApplyFrame()` is called again so the live viewport remains corrected immediately without waiting for the next render-loop frame.
- All calls are no-ops when the feature is disabled, with zero impact on users not using the toggle.
- Elevation view exports are unaffected (guarded by existing `isElevationMode` checks).

**UI**
- "Vertical Correction" toggle checkbox added inside the "Adjust Field of View" panel, below the Camera Lens Width slider, separated by an HR divider.
- Inherits the existing fold/collapse behaviour — the panel opens automatically when Export Image is clicked.
- HR divider also added in the Export Image panel between the Resolution slider and the Enhance Whitecard toggle for improved visual breathing room.

**Files Added**
- `02__Src__AppModules/11__CameraUtils/Na__UiFeature__Camera__VerticalCorrection__EffectLogic.js`
- `02__Src__AppModules/11__CameraUtils/Na__UiFeature__Camera__VerticalCorrection__Controls.js`
- `02__Src__AppModules/11__CameraUtils/Na__UiFeature__Camera__VerticalCorrection__NavLockNotification.js`

**Files Changed**
- `index.html` — toggle HTML, import, and initialization call with orbit controls reference
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js` — `Na__VerticalCorrection__ApplyFrame()` called in render loop after navigation updates
- `02__Src__AppModules/11__CameraUtils/Na__UiFeature__CameraLens__Controls.js` — `ApplyFrame()` called after `updateProjectionMatrix()` in `applyLens()` so FOV changes preserve the correction
- `02__Src__AppModules/30__System__ImageExport/Na__UiFeature__ImageExport__Controls.js` — import + two `ApplyFrame()` insertions in custom export path
- `03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css` — `.na-dropdown-menu__panel-divider` HR style + `.na-navlock-notification` overlay styles

# ---------------------------------------------------------

# ---------------------------------------------------------
##  ValeVision3D v2.0.8 - 12-Mar-2026
### Image Export Fix — Download Image Black Output + Elevation-Aware 2D Pipeline

**Overview**
- Fixed "Download Image" producing black PNGs, main-thread hang, and memory leak. Create Drawing (Layout View) already worked; root cause was synchronous render capture outside `requestAnimationFrame` plus blocking `toDataURL()` at 4K.
- Added elevation-aware export so Download Image and Create Drawing correctly render the 2D orthographic elevation view when the user is in Elevation View mode, instead of the 3D perspective pipeline.

**Download Image — Black Image + Hang Fix**
- Extracted `Na__UiFeature__RenderToCanvas` from `Na__UiFeature__RenderToDataUrl`; always copies WebGL framebuffer to a 2D offscreen canvas immediately after `render()` for reliable pixel readback regardless of `preserveDrawingBuffer`.
- Wrapped export handler in double `requestAnimationFrame` (same pattern as Create Drawing) so render and capture occur within a proper animation frame lifecycle.
- Replaced synchronous `canvas.toDataURL('image/png')` with async `canvas.toBlob()` + `URL.createObjectURL()` + `URL.revokeObjectURL()` to avoid blocking the main thread and large base64 string retention at 4K–6K resolution.
- Added loading overlay (phases: "Rendering Your Image...", "Encoding Image...", "Download Ready!") reusing the existing Layout View overlay system for visual feedback on slower devices.

**Elevation-Aware Export**
- Created `Na__ElevationView__ExportOverrides.js` in `40__System__2dElevationsView`. Listens for `na-elevation-camera-changed` to capture the ortho camera and 2D profile normals renderer.
- `Na__ElevationView__GetExportOverrides()` returns `null` in 3D mode, or an overrides object with `camera`, `renderProfileNormals`, `resizeFrustum`, `restoreFrustum` when in `VIEWING_ELEVATION`.
- `Na__UiFeature__RenderToCanvas` now accepts optional `getElevationOverrides`; when non-null, uses 2D profile normals and ortho camera instead of 3D pipeline, and updates ortho frustum for custom-resolution exports while preserving zoom level.
- Zero impact on real-time renderer; no `preserveDrawingBuffer` change; export logic branches only at export time.

**Files Added**
- `02__Src__AppModules/40__System__2dElevationsView/Na__ElevationView__ExportOverrides.js`

**Files Changed**
- `02__Src__AppModules/30__System__ImageExport/Na__UiFeature__ImageExport__Controls.js`
- `index.html`

# ---------------------------------------------------------
## ValeVision3D v2.0.8  -  12-Mar-2026
### Elevation View System — 2D Elevation Tool

**Overview**
- New Elevation View tool allowing users to click a building face, place a configurable plane, and switch to a true orthographic 2D elevation view with independent profile lines rendering and 2D navigation controls.

**Elevation View — Core System (`Na__ElevationView__SystemLogic.js`)**
- Click any building face to define the elevation direction via raycasting and XZ-projected normals.
- Semi-transparent red-tinted plane spawns offset from the selected face with directional corner arrows indicating the camera look direction.
- Inner drag-handle rectangle with "Click and drag to set plane" label — only clicking this smaller region initiates constrained plane dragging along the face normal axis.
- Orthographic camera created and aligned to the horizontal face normal for perfect parallel projection.
- View switching between perspective orbit (3D) and orthographic elevation (2D) with automatic plane hide/show.
- Left-click-only drag restriction with orbit controls suppressed during drag and restored on release.

**2D Profile Lines Renderer (`Na__RenderEffect__2dProfileLines__.js`)**
- Independent 2D profile lines module sharing the 3D system's normal and colour render targets.
- Renders with the ortho camera instead of the captured perspective camera, fixing stale/misaligned profile line artifacts.
- Fixed edge width (no distance-based scaling) set once on activation from config, simplifying the 2D render pipeline.
- Render loop dynamically switches between 3D and 2D profile lines based on elevation mode state.

**2D Navigation Controls**
- `Na__ElevationNav__DesktopControls.js` — middle mouse + drag or right-click + drag for pan; scroll wheel for zoom; directly manipulates ortho camera position and frustum.
- `Na__ElevationNav__TouchScreenControls.js` — single finger drag for pan; two-finger pinch for zoom with simultaneous pan; prevents default touch behaviour.
- Controls activate on entering elevation view and deactivate on return to 3D.
- Zoom step, min, and max driven by config JSON with fallback defaults.

**Elevation View Config (`Na__ElevationView__Config.json`)**
- Four config sections: Plane, Camera, 2dProfileLines, Navigation.
- Plane section drives outer plane dimensions/appearance, inner drag handle size/opacity, label text, and directional arrow length/colour.
- Camera section covers ortho frustum half-height, camera distance, click threshold, and drag sensitivity.
- Async `fetch()` at init with per-key fallback defaults for graceful degradation.

**3D Fog Disabled in Elevation Mode**
- `uFogEnabled` uniform toggled to 0.0 when entering ortho view, restored when returning to 3D.
- Placeholder for future 2D fog plane system.

**UI Controls (`Na__UiFeature__ElevationView__Controls.js`)**
- Elevation View dropdown menu with "View Elevation", "Back To 3D", "Toggle Elevation Plane", and "Reselect Elevation Plane" actions.
- State-driven button visibility reacting to custom `na-elevation-state-changed` events.

# ---------------------------------------------------------


# ---------------------------------------------------------
## ValeVision3D v2.0.7  -  12-Mar-2026
### Page Layout System — Config Externalisation

**Overview**
- Created a standalone `Na__PageLayoutSystem__Config.json` that externalises every hard-coded parameter from the six Page Layout System JS modules.
- All sub-modules now read their settings from `state.config` (attached at boot) with typed fallback defaults for graceful degradation if the config fetch fails.
- Follows the project double-underscore naming convention (`PageLayout__Document__Config__WidthMm`, etc.) matching `Na__AppConfig__Main.json`.

**Config File — `Na__PageLayoutSystem__Config.json`**
- Four config sections covering the entire layout system:
  - `PageLayout__Document__Config` — A3 dimensions, title block path, fit-to-page padding, initial image placement fraction.
  - `PageLayout__PdfExport__Config` — PDF orientation, format, DPI, JPEG quality, compression, float precision, export filenames.
  - `PageLayout__CanvasAppearance__Config` — background colour, paper shadow, selection handle appearance, image border styling.
  - `PageLayout__Navigation__Config` — zoom min/max/factor, mouse hit radius, touch hit radius, minimum image size, minimum visible clipping.

**Loading Strategy**
- `Na__PageLayout__FetchConfig()` added to `SystemLogic__Main__` — fetches the JSON at boot with `try/catch` fallback.
- `Na__PageLayout__ResolveDocumentConfig()` extracts document settings with per-key type checks and fallback values.
- The full raw config object is attached to `state.config` so every sub-module reads its own section independently.
- Helper functions (`CalculateFitToPage`, `CalculateInitialImageTransform`) refactored to accept their previously hard-coded values as parameters from the resolved config.

**Sub-Module Config Resolution**
- `PdfExport__A3__` — `Na__PageLayout__ResolvePdfConfig(state)` reads all export parameters; `CreateDocument` and `FlattenSheetToDataUrl` now use the resolved config.
- `CanvasRenderPipeline__` — `Na__PageLayout__ResolveAppearanceConfig(state)` reads all visual styling; appearance object threaded through all draw functions.
- `2dNavigationControls__` — `Na__PageLayout__ResolveNavConfig(state)` reads zoom limits and step; resolved once at init.
- `Controls__Pc__` — `Na__PageLayout__ResolvePcConfig(state)` reads hit radius and minimum dimensions; removed obsolete render pipeline import.
- `Controls__TouchScreen__` — `Na__PageLayout__ResolveTouchConfig(state)` reads touch hit radius, zoom limits, and minimum dimensions.

**Files Added**
- `02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__Config.json`

**Files Changed**
- `02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__SystemLogic__Main__.js`
- `02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__PdfExport__A3__.js`
- `02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__CanvasRenderPipeline__.js`
- `02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__2dNavigationControls__.js`
- `02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__Controls__Pc__.js`
- `02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__Controls__TouchScreen__.js`

# ---------------------------------------------------------
## ValeVision3D v2.0.6  -  12-Mar-2026
### PDF Export — Canvas Corruption Fix, JPEG Pipeline & Data Validation

**Overview**
- Diagnosed and fixed vertical-stripe corruption in exported PDFs caused by browsers silently capping the 600 dpi offscreen canvas (`9921 × 7016 px`, ~70 M pixels).
- Switched the flattened sheet from PNG to JPEG (0.92 quality) for a 5-10× reduction in data URL size and memory pressure.
- Added three layers of validation to prevent corrupt PDFs from being saved.

**Root Cause — Canvas Dimension Capping**
- At 600 dpi the A3 offscreen canvas requests 9921 × 7016 px (~278 MB RGBA buffer).
- Some browser/GPU combinations silently allocate a smaller backing store while still reporting the requested `canvas.width`/`canvas.height`.
- `toDataURL` then serializes pixel data with the wrong row stride, producing the characteristic vertical-stripe corruption visible in the PDF.

**Canvas Allocation Validation**
- After setting `canvas.width` and `canvas.height`, a new guard checks the actual allocation matches the request; returns `null` with a descriptive console error if capped.
- Added a `getContext('2d')` null-check for total allocation failure.

**PNG → JPEG Switch**
- `FlattenSheetToDataUrl` now serializes as `image/jpeg` at `Na__PageLayout__JPEG_QUALITY` (0.92) instead of `image/png`.
- `addImage` format parameter changed from `'PNG'` to `'JPEG'` in both export functions.
- New constants: `Na__PageLayout__JPEG_QUALITY`, `Na__PageLayout__MIN_DATAURL_LEN`.

**Data URL Validation**
- The returned data URL is checked for null, empty, or suspiciously short length (< 1000 chars) before being passed to jsPDF.
- Both `ExportFullLayout` and `ExportImageOnly` now check for a `null` return from the flatten function and abort cleanly — no corrupt PDF is saved.

**Files Changed**
- `02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__PdfExport__A3__.js`

# ---------------------------------------------------------
## ValeVision3D v2.0.5  -  12-Mar-2026
### Viewport Refresh — Camera Lens Slider & Post-Export Repaint

**Overview**
- Fixed two missing render-invalidation calls that prevented the viewport from updating after camera lens adjustments and after an image export completed.
- The app uses an invalidation-based render loop (`Na__RenderLoop__RequestRender`); these two systems were never wired into it.

**Camera Lens Slider — Real-Time FOV Feedback**
- `Na__UiFeature__CameraLens__Controls.js` — added `Na__RenderLoop__RequestRender` import from `../05__RenderPipeline/Na__RenderLoop__Invalidation.js`.
- Added `Na__RenderLoop__RequestRender()` as the last line of `applyLens()`, so every slider `input` event (and the initial load call) schedules a render frame immediately after `camera.updateProjectionMatrix()`.
- Previously the FOV was updated internally but no frame was scheduled, requiring a manual pan to trigger a repaint.

**Post-Export Viewport Repaint**
- `Na__UiFeature__ImageExport__Controls.js` — added same `Na__RenderLoop__RequestRender` import.
- Added `Na__RenderLoop__RequestRender()` after `Na__UiFeature__DownloadImage()` in the export button click handler, so the viewport repaints once the renderer, camera, and composer have been fully restored to viewport dimensions.
- The high-res render path (`Na__UiFeature__RenderToDataUrl`) and the restore block are untouched — ability to render above viewport resolution is preserved.

# ---------------------------------------------------------


# ---------------------------------------------------------
## ValeVision3D v2.0.4  -  11-Mar-2026
### Scene Inspector — Visibility Controls, Filter, Isolate Pair, Viewport Height

**Overview**
- Extended the Scene Inspector tool (introduced in v2.0.3) with a full set of interactive visibility controls for live scene debugging.
- All changes are self-contained within `Na__UiFeature__SceneInspector__Controls.js` and its companion HTML/CSS.

**Per-Node Visibility Dot Toggle**
- Visibility dots in the node tree are now interactive — click any dot to toggle `node.visible` on the live Three.js object and immediately invalidate the render loop.
- Dot colour syncs to the new state (green = visible, muted = hidden); tooltip updates to "Click to hide" / "Click to show".
- `e.stopPropagation()` prevents the dot click from also triggering the row expand/collapse.

**Node Registry and Visibility Snapshot**
- A flat `Na__SceneInspector__NodeRegistry` is built during tree rendering, storing `{ uuid, nodeRef, dotEl, wrapperEl, name }` for every node.
- On each scan, `Na__SceneInspector__VisibilitySnapshot` records the `node.visible` state of every registered node as the scan-time baseline.

**Hide All / Restore All**
- "Hide All" sets every registered node to `visible = false` and syncs all dot colours in one pass.
- "Restore All" reinstates the scan-time snapshot state so the scene returns to exactly how it looked at last scan.
- Both buttons added to a compact toolbar row below the filter input.

**Filter Input**
- Text input filters the displayed node tree by name fragment on every keystroke.
- On a non-empty query, all wrappers are hidden first; matching nodes and all their DOM ancestors (`.na-scene-inspector__node`, `.na-scene-inspector__children`) are then revealed, so parent groups always display when a child matches.
- Filter is cleared automatically on each Rescan.

**Isolate Pair Mode**
- "Isolate Pair" toggle button added to the same toolbar row as Hide All and Restore All (compact three-button layout).
- When active, toggling any node's dot also toggles the paired sibling model under the same ValeVision category group — i.e. the mesh model and its corresponding linework model are always switched together.
- Pairing algorithm: walks `nodeRef.parent` chain until a node matching `/^ValeVision__\w+__\w+/` is found (the category group), then toggles all other direct children of that group and syncs their dot elements from the registry.
- Button uses the existing `na-scene-inspector__toolbar-btn--active` CSS state for ON/OFF visual feedback.

**Viewport Height and Scrollability**
- Scene Inspector tree `max-height` changed from the fixed `360px` to `calc((100vh - var(--Vale_HeaderHeight) - 10px) / 1.2 - 280px)` to dynamically fill the available viewport.
- Outer Dev Tools panel given a matching `max-height` and `overflow-y: auto` so it scrolls when content exceeds the viewport.
- Both values divide by `1.2` to account for the inherited `transform: scale(1.2)` on the base `.na-dropdown-menu` class — without this correction the layout height is 1.2× the visual height, causing the bottom to overflow off-screen and the scrollbar to clip inside a region never visible to the user.

**Files Changed**
- `02__Src__AppModules/26__System__DevTools/Na__UiFeature__SceneInspector__Controls.js`
- `index.html`
- `03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css`

# ---------------------------------------------------------
## ValeVision3D v2.0.3  -  11-Mar-2026
### Dev Tools Panel — Localhost-Only Developer Menu System

**Overview**
- Introduced a dedicated `Dev Tools` dropdown menu that appears exclusively on localhost and is hidden on all live deployments.
- Extracted two developer-only actions (`Save Camera Settings`, `Profile Lines`) from the public `Tools` menu into the new panel, keeping the user-facing Tools menu clean.
- Added a Scene Inspector tool for on-demand Three.js scene graph traversal and reporting.
- Added a drag-resize handle so the Dev Tools panel width can be adjusted at runtime.
- All new modules follow the existing Noble Architecture clean-code conventions and sit in a dedicated `70__System__DevTools` folder.

**Dev Tools Menu**
- New HTML shell added to `index.html` as a second `na-dropdown-menu--dev-localhost` container, pinned to the top-left of the viewport.
- New `Na__UiFeature__DevMenu__LocalhostOnly.js` gates the container via `Na__AppUtils__IsRunningOnLocalhost()` — mirrors the TrueVision cousin project pattern.
- `Save Camera Settings` and `Profile Lines` markup moved from the public `Tools` list into the new `Dev Tools` list with a section divider between them.

**Profile Lines — Extracted Module**
- New `Na__UiFeature__ProfileLines__Controls.js` owns Profile Lines button state, `aria-pressed` sync, status text, click handling, and render invalidation.
- Removes all inline Profile Lines wiring from `index.html`; replaced with a single `Na__UiFeature__InitializeProfileLinesControls(pipelineRef, profileLinesConfig)` call.
- Button restyled using new `na-dev-toggle` / `na-dev-toggle--active` classes, matching the TrueVision green active-dot indicator pattern.

**Scene Inspector**
- New `Na__UiFeature__SceneInspector__Controls.js` provides on-demand scene graph reporting.
- Scan button traverses the live `THREE.Scene` using `Object3D.traverse()`, building a plain data tree (no DOM interaction during traversal).
- Reports per-node: type badge (Mesh / Group / Light / Line / Camera), visibility dot (green / muted), name, and triangle/vertex counts for mesh nodes.
- Summary header shows total nodes, meshes, triangle count, line objects, and lights after each scan.
- Collapsible tree defaults to 3 levels expanded; click any parent row to expand/collapse its children.
- Works on-demand because `Na__AppFlow__StartLoadingSequence` is not awaited — models may load after boot.

**Drag-Resize Handle**
- Resize grip element added to the bottom-right corner of the Dev Tools container.
- Drag logic in `Na__UiFeature__DevMenu__LocalhostOnly.js` listens for `mousedown → mousemove → mouseup` on `document`, clamping new width between 220px and 640px.
- Grip rendered as a 3×3 dot grid via `radial-gradient` background — no image assets required.

**Styling**
- New CSS classes: `na-dev-toggle`, `na-dev-toggle--active`, `na-dev-toggle__label`, `na-dev-toggle__status`.
- New CSS classes: `na-scene-inspector__*` — tree rows, type badges (colour-coded by family), visibility dot, scrollable container, stats bar, scan button, resize handle.
- `na-dropdown-menu--dev-localhost` modifier positions the panel top-left, overrides `right`, and sets `transform-origin: top left`.

**Files Added**
- `02__Src__AppModules/70__System__DevTools/Na__UiFeature__DevMenu__LocalhostOnly.js`
- `02__Src__AppModules/70__System__DevTools/Na__UiFeature__ProfileLines__Controls.js`
- `02__Src__AppModules/70__System__DevTools/Na__UiFeature__SceneInspector__Controls.js`

**Files Changed**
- `index.html`
- `03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css`
- `02__Src__AppModules/11__CameraUtils/Na__UiFeature__SaveCameraSettings.js`

# ---------------------------------------------------------
## ValeVision3D v2.0.2  -  11-Mar-2026
### PDF Export — Flattened 600 dpi Pipeline & Config Naming Convention

**Overview**
- Replaced the multi-image PDF composition pipeline with a single flattened PNG export at 600 dpi.
- Both export modes (Full Layout and Image Only) now render the entire A3 sheet to one offscreen canvas before embedding, eliminating file-size blowout caused by embedding separate full-page PNGs per layer.
- Applied project naming conventions to the `imageExport` config block and its downstream consumers.

**PDF Export Rewrite**
- Added `Na__PageLayout__PDF_EXPORT_DPI = 600` and derived `Na__PageLayout__PIXELS_PER_MM` constants.
- Added `Na__PageLayout__FlattenSheetToDataUrl(state, includeTitleBlock)` — composites title block and viewport image onto a single `9921 × 7016 px` offscreen canvas at 600 dpi, applying all `clipTop/Right/Bottom/Left` values with the same clip-mask approach used in the live canvas preview.
- `Na__PageLayout__CreateA3Document` now passes `compress: true` and `floatPrecision: 'smart'` to jsPDF.
- Both export functions reduced to: flatten sheet → single `addImage` call → `doc.save`.

**Config Naming Convention**
- `imageExport` block renamed to `ImageExport__Config` with fully-qualified double-underscore key names throughout, matching the project convention.
- New `PageLayout__PdfExport__Config` block added documenting `TargetDpi`, `Compress`, and `FloatPrecision` settings.
- `Na__UiFeature__ExportConfigKeys` string values updated to new JSON key names.
- New `Na__UiFeature__NormalizeExportConfig` helper added — maps long JSON keys to short internal names so all downstream dot-property accesses remain unchanged.

**Files Changed**
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json`
- `index.html`
- `02__Src__AppModules/30__System__ImageExport/Na__UiFeature__ImageExport__Controls.js`
- `02__Src__AppModules/35__System__PageLayoutSystem/Na__PageLayoutSystem__PdfExport__A3__.js`

# ---------------------------------------------------------
## ValeVision3D v2.0.1  -  11-Mar-2026
### Multi-Model Loader — TrueVision Namespace Support (Ribbins 62854)

**Overview**
- Fixed loader not recognising `TrueVision` namespace in project model URLs.
- Projects using SketchUp GLB Builder (TrueVision plugin) export naming (e.g. `Ribbins__TrueVision__MainBuildingModel__Existing__MeshModel__.glb`) were incorrectly classified as legacy, collapsing all four building models (Existing + Proposed, Mesh + Linework) into a single `ValeVision__LegacyModel` category.
- Only the last pair (Proposed) was loaded; Existing models were overwritten and never displayed.

**Root Cause**
- Primary URL parse regex accepted only `ValeVision` or `NaModel`; `TrueVision` fell through to legacy path.
- Legacy path assigns one mesh + one linework per category; multiple pairs overwrote each other.

**Fix**
- Added `TrueVision` to primary regex namespace alternation in `Na__ModelLoader__ParseModelUrl`.
- URLs now parse as `ValeVision__MainBuildingModel__Existing` and `ValeVision__MainBuildingModel__Proposed` (both already in load-order priority).
- All four GLBs load with separate model toggle controls.

**Files Changed**
- `02__Src__AppModules/15__ModelLoader/Na__ModelLoader__MultiModel.js`

# ---------------------------------------------------------
## ValeVision3D v2.0.0  -  10-Mar-2026
### GPU Performance Overhaul — Profile Lines Pipeline Optimisation

**Overview**
- Ported all TrueVision3D v2.2.4 GPU performance optimisations to ValeVision3D.
- Diagnosed and resolved sustained 100% GPU usage introduced by the profile lines system.
- Root cause: the profile lines effect added two extra full-scene `renderer.render()` calls per frame (normal pass + profile colour pass), and the continuous RAF loop never idled.
- Implemented six targeted optimisations that reduce per-frame scene renders, cut profile colour pass cost by ~75%, eliminate per-frame allocations, fix a render loop spin issue, and add a user-facing toggle.

**Depth Pre-Pass Elimination**
- Attached a `DepthTexture` to the normal render target so the normal pass writes depth as a side-effect.
- Fog now reads depth from the normal pass instead of the render target's built-in depth texture.
- Falls back to the original depth texture when profile lines are disabled.

**Half-Resolution Profile Colour Buffer**
- Profile colour render target now created at 50% viewport dimensions (quarter the pixel count).
- The profile colour buffer only carries edge tint information; full resolution is unnecessary.
- `setSize()` updated to maintain half-res on window resize.

**Pre-Allocated Material Swap Cache**
- `cachedOriginalMaterials` is now a pre-allocated `Array` sized during `rebuildSceneCache()`.
- Per-frame material swap uses index-based `for` loops writing into fixed array slots instead of creating `{ object, material }` pairs every frame.
- Eliminates all per-frame heap allocations in the profile lines hot path.

**Scene Object Caching**
- Replaced per-frame `scene.traverseVisible()` calls with `scene.traverse()` and cached results.
- Added `cachedLineObjects`, `cachedMeshObjects`, `sceneCacheDirty` flag, `rebuildSceneCache()`, and `invalidateSceneCache()` methods.
- Cache is rebuilt only when models are loaded or scene structure changes.

**Invalidation-Based Render Loop**
- Replaced the unconditional `requestAnimationFrame` loop with an invalidation-based system.
- Frames are only scheduled when user interaction, animations, or explicit invalidation events require a redraw.
- Added `Na__RenderLoop__Invalidation.js` as a centralised event dispatcher for render requests.
- All UI controls (model toggles, walk mode, door animations) now dispatch render requests through the invalidation system.

**Orbit Controls Render Loop Fix**
- Added a 3-frame trailing budget after the orbit `end` event.
- Previously, `controls.update()` could return `true` after the user stopped interacting, keeping the render loop spinning indefinitely.
- The loop now renders the trailing frames then stops, dropping GPU usage to near-zero when idle.

**Profile Lines Toggle**
- Added "Profile Lines" ON/OFF button to the Tools dropdown menu.
- `toggleProfileLines()` disables both the shader pass and the pre-pass renders.
- Users can instantly halve per-frame GPU load by toggling profile lines off.

**Additional Optimisations**
- Directional light shadow map resolution reduced from 2048 to 1024.
- Renderer pixel ratio cap reduced from 2.0 to 1.5.
- Fat line segments re-enabled frustum culling with computed bounding geometry.
- Navigation controls (`updateMovement`/`updateNavigation`) now return booleans indicating change.

**Files Added**
- `02__Src__AppModules/05__RenderPipeline/Na__RenderLoop__Invalidation.js`

**Files Changed**
- `index.html`
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js`
- `02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__ProfileLines__.js`
- `02__Src__AppModules/05__RenderPipeline/Na__RenderPipeline__PostProcessing__Setup.js`
- `02__Src__AppModules/06__Scene__LightingEffects/Na__Scene__DefaultSceneLighting.js`
- `02__Src__AppModules/10__NavigationAndCameras/Na__DefaultNavmode__MouseControls.js`
- `02__Src__AppModules/10__NavigationAndCameras/Na__DefaultNavmode__IpadControls.js`
- `02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__WalkModeControls.js`
- `02__Src__AppModules/15__ModelLoader/Na__ModelLoader__MultiModel.js`
- `02__Src__AppModules/25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js`
- `02__Src__AppModules/26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js`
- `02__Src__AppModules/30__System__ImageExport/Na__UiFeature__ImageExport__Controls.js`

# ---------------------------------------------------------
## ValeVision3D v1.9.9  -  10-Mar-2026
### Profile Lines — Dynamic Edge Width, Smooth Threshold, Config Alignment

**Overview**
- Profile line edge width now scales dynamically with camera distance to the orbit target: thicker when zoomed in, thinner when zoomed out (reduces clustering on detailed items).
- Replaced hard threshold cutoff with `smoothstep` blending so transitions are gradual instead of abrupt.
- Aligned main app `Na__AppConfig__Main.json` profile lines with the tuned test environment values.

**Dynamic Edge Width**
- Added four config keys: `EdgeWidthMin`, `EdgeWidthMax`, `EdgeWidthDistanceNear`, `EdgeWidthDistanceFar`.
- `u_edgeWidth` uniform updated per-frame inside `renderProfileNormals()` using `camera.position.distanceTo(orbitTarget)`.
- Lerp: far distance = min width (thin), near distance = max width (thick).
- `orbitTarget` passed from `Na__AppFlow__LoadingSequence` via `Na__RenderPipeline__SetupComposer` into `Na__RenderEffect__ProfileLines__Create`.

**Smooth Threshold**
- Fragment shader now uses `smoothstep` instead of `if (edge > threshold)` for profile-line blending.
- Softness zone = half the threshold value on each side; transitions are smoother.

**Config Alignment**
- `Na__AppConfig__Main.json` profile lines: `EdgeWidth` 0.4→0.25, `EdgeWidthMin` 0.25→0.20, `EdgeWidthMax` 1.5→0.60, `DistanceNear` 2.0→1.0, `DistanceFar` 40.0→80.0.

**Key Files**
- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json`
- `02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__ProfileLines__.js`
- `02__Src__AppModules/05__RenderPipeline/Na__RenderPipeline__PostProcessing__Setup.js`
- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js`
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__Main__.js`
- `80__Testing__PrototypeEnvironment/TestEnv__SubAppData__Config.json`

# ---------------------------------------------------------
## ValeVision3D v1.9.8  -  10-Mar-2026
### Project Structure Alignment — TrueVision3D Numbered Layout

**Overview**
- Restructured ValeVision3D source folder layout to match TrueVision3D numbered band taxonomy for consistency across ValeDesignSuite projects.
- Moved flat `src__*` folders into `02__Src__AppModules/` with numbered bands; styles, distribution, and testing helpers relocated to their designated bands.
- Updated imports, config fetch paths, and cross-file references throughout the codebase.
- Browser-tested via Whitecardopedia localhost with random project; viewer boot, model loading, navigation, export, and Layout View handoff all verified.

**Folder Mapping (Numbered Bands)**
- `01__AppCore`, `02__AppData`, `03__AppUtils`, `04__MathUtils`, `05__RenderPipeline`
- `06__Scene__LightingEffects`, `07__Scene__EnvironmentEffects`
- `10__NavigationAndCameras`, `11__CameraUtils`
- `15__ModelLoader`
- `20__System__MaterialsSystem`, `25__System__3dObject__InteractionSystem`, `26__System__ToggleModelElements`
- `30__System__ImageExport`, `35__System__PageLayoutSystem`
- `03__Style__AppStylesheets`, `60__DistributionEmails`
- `79__Testing__GenerateObjects`, `80__Testing__PrototypeEnvironment`

**Key Files Updated**
- `index.html` — script/style import paths
- `Na__AppConfig__Loader.js` — config fetch path
- `Na__AppFlow__LoadingSequence.js` and runtime modules — module import paths
- `Na__UiFeature__ImageExport__Controls.js` — layout page path
- Page layout subtree and prototype sandbox HTML/JS/config — relative paths

# ---------------------------------------------------------
## ValeVision3D v1.9.7  -  27-Feb-2026
### Stylesheet Naming Standardization 

**Overview**
- Standardized stylesheet naming to the project namespace pattern (`Na__<DomainOrModule>__Styles__<FeatureOrScope>__.css`) for improved maintainability and clearer ownership by module.
- Updated stylesheet link/import wiring across main app, Page Layout System, and Test Environment to match renamed files.
- Removed all remaining Babylon/BABYLON engine references from ValeVision3D runtime/docs.
- Ported legacy `src__GenerateObjects` helper modules from Babylon APIs to Three.js-compatible utility modules.

**Stylesheet Refactor**
- Renamed `src__Styles` files to namespaced equivalents (Core UI, UiFeature, ImageExport scopes).
- Renamed Page Layout stylesheet to `Na__PageLayoutSystem__Styles__Main__.css`.
- Renamed Test Environment stylesheet to `Na__TestEnv__Styles__PrototypeSandbox__.css`.
- Updated `index.html`, Page Layout HTML, and TestEnv HTML to point at new stylesheet names.
- Updated `Na__CoreUi__Styles__Index__.css` import list to new filenames while preserving import order.


# ---------------------------------------------------------
## ValeVision3D v1.9.6  -  26-Feb-2026
### Orbit Anchor Hardening + Nav Damping Delegation

**Overview**
- Fixed an orbit regression where camera interaction could feel like head-look/first-person instead of stable orbit around the helper cube anchor.
- Orbit target resolution is now deterministic and robust across project reloads and saved camera data.
- Removed Dev__DefaultCube as an orbit/fog fallback anchor to avoid conflicting reference points.
- Added explicit warning logs for missing/unloadable helper cube paths so failures are immediately visible in console output.

**Orbit Target Precedence (Hardened)**
- `Na__AppFlow__LoadingSequence.js` now resolves orbit target in strict order:
  1. Loaded OrbitHelperCube GLB center (**authoritative**)
  2. Saved `OrbitHelperCube__Position` from `project.json` (only if helper cube center is unavailable)
  3. Keep current controls target (no implicit dev-cube override)
- If both helper center and saved orbit target exist, saved target is ignored and a warning is emitted to prevent hidden drift from stale values.

**Helper Cube Diagnostics**
- Added warning when no OrbitHelperCube URL is found in the model URL list.
- Added warning when OrbitHelperCube fails to load.
- Added warning when helper file loads but center cannot be resolved.
- Added warning when neither helper center nor saved orbit target can be applied.

**Legacy Camera Target Conflict Guard**
- During load, `Camera__DefaultTarget` is stripped from the applied camera payload so legacy target keys cannot overwrite helper-cube anchoring.
- Save Camera Settings now removes legacy `valeVision_Camera__DefaultPosition` and deprecated `Camera__DefaultTarget` before writing updated project data.

**Startup Fallback Update (No Dev Cube Anchor)**
- `index.html` no longer sets initial orbit target to `Dev__DefaultCube`.
- Initial target now derives from camera forward direction (temporary pre-load target only).
- Initial fog anchor now follows current orbit target reference rather than dev cube position.

**Key Files**
- `src__AppFlow/Na__AppFlow__LoadingSequence.js` — strict helper-first target precedence, warnings, and legacy target guard.
- `src__CameraUtils/Na__UiFeature__SaveCameraSettings.js` — legacy camera payload cleanup before save.
- `index.html` — removed dev-cube pivot fallback and aligned initial fog anchor with orbit target.

**Nav Damping Delegation — Config-Driven OrbitControls Damping (Mouse + iPad)**

**Overview**
- Refactored orbit-controls damping into a dedicated delegated module so damping behavior is no longer hardcoded inside device nav initializers.
- Added a new top-level AppConfig group (`Navmode__Damping`) as the single source of truth for damping enable flags and damping factor values.
- Updated both desktop mouse controls and iPad/touch controls to consume the new damping payload shape.
- Removed legacy `EnableDamping` keys from `Navmode__MouseControls` and `Navmode__IpadControls` active read path.

**New Delegated Module**
- New file: `src__NavigationAndCameras/Na__Navmode__OrbitControls__Damping.js`.
- Exposes `Na__Navmode__ApplyOrbitControlsDamping(controls, dampingConfig)`.
- Applies:
  - `controls.enableDamping` from `dampingConfig.enabled`
  - `controls.dampingFactor` from `dampingConfig.factor`
- Includes internal clamp helper for damping factor bounds (`0.0` to `1.0`) and finite-value guard with safe default (`0.08`).

**AppConfig Schema Addition**
- Added new top-level `Navmode__Damping` group in `src__AppConfig/Na__AppConfig__Main.json`:
  - `Navmode__Damping__Description`
  - `Navmode__Damping__Mouse`
    - `Navmode__Damping__Mouse__Enabled`
    - `Navmode__Damping__Mouse__Factor`
  - `Navmode__Damping__Ipad`
    - `Navmode__Damping__Ipad__Enabled`
    - `Navmode__Damping__Ipad__Factor`
- Clarified in description that damping factor is **unitless** (not millimeters).

**Wiring Changes**
- `index.html` now extracts `Navmode__Damping` from AppConfig and builds a `damping` payload block for both device paths.
- Mouse/iPad nav modules now call the delegated damping module instead of setting damping directly.
- Added required `@delegate` breadcrumbs at both offload call sites:
  - `src__NavigationAndCameras/Na__DefaultNavmode__MouseControls.js`
  - `src__NavigationAndCameras/Na__DefaultNavmode__IpadControls.js`

**Units Compliance**
- Confirmed against world-units rule: damping factor remains dimensionless and is intentionally **not** passed through mm→units conversion.
- Existing mm-based navigation values (movement/elevation/min-max distance/zoom step) continue to use `Na__Math__ConvertMmToUnits`.

**Key Files**
- `src__NavigationAndCameras/Na__Navmode__OrbitControls__Damping.js` — new delegated damping module.
- `src__NavigationAndCameras/Na__DefaultNavmode__MouseControls.js` — damping call delegated.
- `src__NavigationAndCameras/Na__DefaultNavmode__IpadControls.js` — damping call delegated.
- `src__AppConfig/Na__AppConfig__Main.json` — new `Navmode__Damping` group + legacy damping key removal from device groups.
- `index.html` — new damping config extraction and payload wiring.

# ---------------------------------------------------------
## ValeVision3D v1.9.5  -  24-Feb-2026
### Layout View Loading Overlay — Spinner Feedback, Button State Fix, postMessage Handshake

**Overview**
- Added a full-screen loading overlay with 3-phase status messages when the "Layout View" button is clicked, providing clear visual feedback during image rendering, data transfer, and new-tab loading.
- Fixed the Layout View button remaining visually stuck in its pressed state after click.
- Added white hover text and `:active` press-in effect to the secondary action button for consistent interactive feel.
- Established a `postMessage` handshake between the parent tab and the layout tab so the overlay knows when the Drawing Document has finished loading.

**Loading Overlay (3-Phase Status Messages)**
- Phase 1: "Rendering Your Image..." — shown immediately on button click while the high-resolution render executes.
- Phase 2: "Sending To Drawing Document..." — shown after render completes and before the new tab confirms receipt.
- Phase 3: "Success! See new tab for your Drawing Layout" — shown in green when the layout tab sends back its `Na__PageLayout__Ready` postMessage.
- Overlay auto-dismisses 2.5 seconds after the success message with a smooth fade-out transition.
- 8-second timeout fallback dismisses the overlay if the postMessage is never received (cross-origin restrictions or popup blockers).

**Button State and Double-Click Guard**
- `layoutViewInProgress` flag prevents re-entry while the overlay is active.
- Button receives `.is-loading` class during the process (dimmed, `pointer-events: none`).
- `.is-loading` class removed on overlay dismiss, restoring the button to its default state.
- Render deferred via double `requestAnimationFrame` so the overlay paints to screen before the blocking render call.

**Button Hover and Active CSS**
- `.na-dropdown-menu__action--secondary:hover` now sets `color: #ffffff` for white text on hover.
- `.na-dropdown-menu__action--secondary:active` added with darker background and `scale(0.97)` press-in effect.
- `.na-dropdown-menu__action--secondary.is-loading` added for disabled appearance during loading.

**postMessage Handshake (Layout Tab → Parent Tab)**
- `Na__PageLayoutSystem__SystemLogic__Main__.js` now calls `window.opener.postMessage({ type: 'Na__PageLayout__Ready' }, '*')` at the end of `Na__PageLayout__Initialize()` after the image and title block are loaded and state is built.
- Parent tab listens for this message to transition from Phase 2 to Phase 3 (success).
- Listener is cleaned up after receipt; timeout fallback also cleans up the listener.

**Loading Overlay Styles**
- Reuses the existing `.loading-spinner` and `@keyframes spinner-rotate` from the app initialization overlay.
- Semi-transparent white background (`rgba(255,255,255,0.92)`) with `backdrop-filter: blur(4px)`.
- `z-index: 10000` ensures visibility above all other UI elements including the dropdown menu.
- `.na-layout-loading-overlay--visible` / `--fade-out` classes control display and opacity transitions.
- `.na-layout-loading-overlay__status--success` turns the status text green (`#2a7d4f`) with bold weight.

**Key Files**
- `index.html` — added `#naLayoutLoadingOverlay` element with spinner and status text inside `#root`.
- `src__Styles/loading-overlay.css` — added Layout View Loading Overlay region (container, visible, fade-out, status text, success variant).
- `src__Styles/ui-components.css` — added `:hover` white text, `:active` press effect, `.is-loading` disabled state for secondary action button.
- `src__ImageExport/Na__UiFeature__ImageExport__Controls.js` — refactored Layout View click handler with overlay management, double-rAF render deferral, postMessage listener, timeout fallback, dismiss sequence.
- `src__PageLayoutSystem/Na__PageLayoutSystem__SystemLogic__Main__.js` — added `postMessage` call to opener on successful initialization.

# ---------------------------------------------------------
## ValeVision3D v1.9.4  -  24-Feb-2026
### `index.html` Modularisation Pass — 5 New Modules, Walk Mode Controls, Region Structure

**Overview**
- Systematic extraction of all inline JavaScript logic from `index.html` into dedicated ES modules.
- `index.html` reduced from **1,075 lines → 691 lines** (~360 lines of inline JS removed).
- All extractions follow the `@delegate:` breadcrumb protocol (`03-dependency-Traversal-Protocol-.mdc`) so future agents can trace offloaded logic.
- Walk mode orchestration unified into shared modules consumed by both `index.html` and `TestEnv__PrototypeTestingSandbox__Main__.js`.
- Inline JS section restructured with 10 named region blocks for future navigation.

**New Module — `src__AppUtils/Na__AppUtils__ProjectLoader.js`**
- Extracted 5 pure utility functions from `index.html` (lines 617–721): `Na__AppUtils__IsRunningOnLocalhost`, `Na__AppUtils__GetProjectCodeFromUrl`, `Na__AppUtils__NormalizeProjectFolderId`, `Na__AppUtils__FetchProjectJson`, `Na__AppUtils__ExtractModelUrls`.
- Also extracts the `WebProjectsBaseUrl` and `DefaultProjectYear` constants.
- Zero dependencies — pure browser APIs (`window`, `fetch`, `URLSearchParams`) only.
- Housed in the new `src__AppUtils/` folder created for shared utility modules.

**New Module — `src__CameraUtils/Na__UiFeature__SaveCameraSettings.js`**
- Extracted `Na__UiFeature__SaveCameraSettings` and `Na__UiFeature__InitializeSaveCameraButton` from `index.html` (lines 992–1053).
- Refactored both functions from closures over parent scope to explicit parameters: `(camera, controls, showToast)`.
- Imports `Na__UiFeature__BuildCameraJson` from the existing `Na__UiFeature__CameraPosition__Controls.js` and auth utilities from `Na__AppUtils__ProjectLoader.js`.

**New Module — `src__AppFlow/Na__AppFlow__LoadingSequence.js`**
- Extracted `Na__UiFeature__UpdateStatus` (private), `Na__UiFeature__ShowScene` (private), and `Na__AppFlow__StartLoadingSequence` (exported) from `index.html` — including the embedded RAF render loop and window resize handler.
- Refactored to accept a **context object** instead of closing over `index.html` scope variables; all Three.js instances and config values passed explicitly.
- `Na__RenderPipeline__State` is written back to a mutable `Na__AppFlow__PipelineRef = { current: null }` ref held in `index.html` so the `ImageExportControls` lazy getter `() => Na__AppFlow__PipelineRef.current` continues to work across the module boundary.
- `Na__LoadedModelGroups` and `Na__RenderComposer__Main` are now fully local to the function — removed from `index.html` outer scope.
- Module imports 14 source modules (GLTFLoader, RenderPipeline, ModelLoader, SceneLighting, FogEffect, MathUtils, CameraUtils, MaterialsSystem, ModelToggle, DoorAnimation, WalkMode, DoorProximity, AppUtils).
- Private DOM helpers (`UpdateStatus`, `ShowScene`) use `document.getElementById` directly, consistent with the `Na__UiFeature__ModelToggle__Controls.js` pattern.

**New Module — `src__NavigationAndCameras/Na__UiFeature__WalkModeControls.js`**
- Extracted walk mode init and toggle orchestration from both `index.html` and `TestEnv__PrototypeTestingSandbox__Main__.js`.
- Stores `controls`, `renderer`, and `useTouchControls` in module-level state at init time; callers pass them once only.
- `Na__UiFeature__ToggleWalkMode(onActivate, onDeactivate)` accepts optional callbacks for caller-side UI reactions (used by the test environment to update its walk mode status indicator and save button).
- Imports `Na__Navmode__WalkMode__SystemLogic`, `Na__Navmode__WalkMode__DesktopControls`, `Na__Navmode__WalkMode__TouchScreenControls`, and `Na__DoorProximity`.

**New Module — `src__NavigationAndCameras/Na__UiFeature__WalkModeEventListeners.js`**
- Pure event binding module — no Three.js dependencies, no state.
- `Na__UiFeature__InitializeWalkModeHotkey(toggleFn)` — registers the `Alt+Shift+W` keydown listener.
- `Na__UiFeature__InitializeWalkModeToggleButton(buttonId, toggleFn)` — wires a DOM button by ID; guards gracefully if the element doesn't exist (production has no such button; test env does).

**`index.html` Import Block Simplification**
- Removed 10 individual named imports across 4 import blocks (SystemLogic walk mode exports, DesktopControls, TouchControls, DoorProximity, RenderPipeline, GLTFLoader, ModelLoader, SceneLighting, ModelToggle, MaterialsSystem, CameraPosition, ApplyCameraConfig/BuildCameraJson).
- Added 5 new targeted imports (AppFlow, WalkModeControls, WalkModeEventListeners, AppUtils was added to dependent modules only, SaveCameraSettings).

**`TestEnv__PrototypeTestingSandbox__Main__.js` Updates**
- Trimmed `Na__Navmode__WalkMode__SystemLogic.js` import to the 4 still-needed exports: `SetCollisionMeshes`, `Update`, `IsActive`, `GetCapsulePosition` (render loop + save guard).
- Removed `Na__WalkModeDesktop__`, `Na__WalkModeTouch__`, `Na__DoorProximity__Initialize`, `Na__DoorProximity__SetEnabled` import lines entirely.
- Replaced 82 lines of walk mode setup with the new shared modules + test-env-specific `onActivate`/`onDeactivate` UI callbacks.

**`index.html` JavaScript Region Structure (10 Regions)**
- Added 10 named `// REGION |` / `// endregion` blocks to the inline script for future navigation and code-folding:
  1. Module Imports
  2. DOM References
  3. App Config Loading and Destructuring
  4. Dev Mode Config Extraction
  5. Device Detection
  6. Scene, Camera, Renderer and Navigation Setup
  7. Walk Mode System Initialization
  8. Dev Default Cube, Orbit Pivot and Fog Setup
  9. Camera UI Controls Initialization
  10. UI Notification Helpers
  11. Engine Entry Points

**Key Files**
- `src__AppUtils/Na__AppUtils__ProjectLoader.js` — new
- `src__CameraUtils/Na__UiFeature__SaveCameraSettings.js` — new
- `src__AppFlow/Na__AppFlow__LoadingSequence.js` — new (new `src__AppFlow/` folder)
- `src__NavigationAndCameras/Na__UiFeature__WalkModeControls.js` — new
- `src__NavigationAndCameras/Na__UiFeature__WalkModeEventListeners.js` — new
- `index.html` — major inline JS reduction (1,075 → 691 lines)
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__Main__.js` — walk mode imports and setup updated

# ---------------------------------------------------------
## ValeVision3D v1.9.3  -  24-Feb-2026
### AppConfig Key Wiring Fix — `Camera__DefaultMisc__Fov` Key Name Regression

**Bug Fixed — Broken Key Reference in `index.html` (2 locations)**
- Corrected two occurrences of the wrong key name `Camera__DefaultFov` → `Camera__DefaultMisc__Fov` in `index.html`.
- Both errors were in the `Camera__DefaultPosition` reading block; every other module in the codebase already used the correct key name.

**Location 1 — Initial FOV Application (line 492)**
- Block reads `Camera__DefaultMisc__Fov` from `Na__Config__CameraDefault` and applies it to `Na__Camera__Main.fov`.
- Previously the key was never found (`Camera__DefaultFov` does not exist), so the camera's initial FOV from AppConfig was silently never applied.

**Location 2 — Camera Lens Slider Guard (line 586)**
- Block sets `Na__CameraLens__Config.defaultFocalLengthMM = null` when a saved FOV is present in AppConfig, preventing the lens slider from overriding the camera's pre-set FOV on initialization.
- Previously the guard condition always evaluated to `false` (wrong key), meaning `Na__UiFeature__InitializeCameraLensControls` always used the hardcoded `defaultFocalLengthMM: 45` from `cameraLens` config and called `applyLens(45)` immediately, overriding the camera's starting FOV.
- Guard now fires correctly — `defaultFocalLengthMM` is set to `null`, and the lens slider initialises from the camera's current FOV state rather than the 45mm default.

**Full AppConfig Wiring Audit Performed**
- All 19 AppConfig sections traced end-to-end against their downstream consumer files.
- All other sections confirmed correct. Three dead-config items identified (not bugs, no behaviour change):
  - `Scene__Default__ControlsConfig` — extracted but superseded by `Navmode__Settings`; never consumed.
  - `Global__Hotkeys__ToggleWalkMode` — extracted but walk mode hotkey handler hardcodes `Alt+Shift+W` directly.
  - `MaterialsSystem__Config__FallbackToWhitecard` — defined in AppConfig but whitecard fallback is always implicit in the materials swap code.

**Key Files**
- `index.html` — two key name corrections in camera config reading block.

# ---------------------------------------------------------
## ValeVision3D v1.9.2  -  23-Feb-2026
### PBR Materials Swap System — Indexed Material Library, WebApp Renderer, SketchUp Export Modes

**Overview**
- Implemented a full programmatic PBR materials swapping pipeline spanning the SketchUp GLB exporter and the ValeVision3D WebApp renderer.
- Central single source of truth: `src__AppConfig/Na__AppConfig__MaterialsLibrary.json` defines all indexed materials, their PBR settings, and optional texture URL overrides.
- Materials are identified by a strict naming convention (`MAT{NNN}__Category__Variant`) matched against SketchUp `display_name` at export time and against `material.name` in the Three.js scene graph at load time.
- Whitecard fallback guaranteed: any mesh whose material name is not found in the library renders exactly as before, preserving full schematic massing functionality.
- System deployed to both the main production render pipeline (`index.html`) and the test environment (`TestEnv__PrototypeTestingSandbox__Main__.js`), with shared module code and independent config files.

**Materials Library JSON Schema (v2.1.0)**
- `src__AppConfig/Na__AppConfig__MaterialsLibrary.json` expanded to full PBR template structure.
- `MAT001__Default` is the complete reference template showing every possible key with default values; all other materials only specify keys that differ from these defaults.
- Per-material fields: `SketchUpName`, `Description`, `BaseColor` (rgb string), `Opacity`, `Transparent`, `IsDoubleSided`, `PbrRoughness`, `PbrMetallic`, `EmissiveFactor`, `EmissiveIntensity`, `NormalScale`, `OcclusionStrength`, `AlphaTest`, `DepthWrite`, `EnvMapIntensity`, and a `TextureMaps` section with 7 URL slots (`BaseColorUrl`, `NormalUrl`, `RoughnessUrl`, `MetallicUrl`, `EmissiveUrl`, `OcclusionUrl`, `AlphaUrl`).
- `null` texture URLs mean use scalar PBR values only; a non-null URL hot-swaps that texture channel at runtime.
- Sparse authoring: paint materials store 3 keys (SketchUpName, BaseColor, PbrRoughness); glass stores 8; only what diverges from defaults is written.
- `IsDoubleSided` is an explicit opt-in (`true` only for glass and mirror). Omitting it defaults to single-sided rendering, which is more performant for opaque surfaces.
- Initial series: MAT000 (default), MAT100 (glass, timber, mirror), MAT300 (Farrow & Ball paint range), MAT500 (hardwood timbers).

**WebApp — Library Loader Module (New)**
- New file: `src__MaterialsSystem/Na__MaterialsSystem__LibraryLoader.js`.
- `Na__MaterialsSystem__LoadLibrary(url, forceReload)` — async fetch with module-scope cache; returns null on failure rather than throwing.
- `Na__MaterialsSystem__BuildLookup(libraryData)` — flattens the nested series structure into a `Map<SketchUpName, MaterialConfig>` for O(1) lookups; cached after first build.
- `Na__MaterialsSystem__IsIndexedName(name)` — regex test `/^MAT\d{3}__/` to identify indexed material names without requiring a loaded library.

**WebApp — Material Swap Module (New)**
- New file: `src__MaterialsSystem/Na__MaterialsSystem__MaterialSwap.js`.
- `Na__MaterialsSystem__ApplyMaterials(modelGroup, lookupMap, materialsConfig)` — traverses a THREE.Group scene graph, identifies meshes with indexed material names, creates `THREE.MeshStandardMaterial` from library config, and replaces the existing material.
- Unmatched meshes are not touched; their whitecard material is preserved exactly as-is.
- Applies `IsDoubleSided` → `THREE.DoubleSide` / `THREE.FrontSide`, `Transparent`, `DepthWrite`, `EnvMapIntensity`, `AlphaTest`, and polygon offset.
- Material instances are cached by `SketchUpName` within a single traversal pass — multiple meshes sharing a material share the same instance.
- Texture URL loading is async and parallel via `Promise.all`; `material.needsUpdate = true` called after all textures resolve.
- Correct colour space set per texture type: sRGB for base colour/emissive, linear for normal/roughness/metallic/AO/alpha maps.

**WebApp — Main App Integration**
- `index.html`: added imports for both materials modules; added `Na__Config__MaterialsSystem` extraction from AppConfig.
- After `Na__ModelLoader__LoadAllModels` completes, performs a second pass: fetch library → build lookup → `for...of` with `await` over all loaded model groups, calling `Na__MaterialsSystem__ApplyMaterials` on each.
- Second pass is gated on `MaterialsSystem__Config__Enabled`; disabled flag bypasses entirely with no overhead.

**WebApp — Test Environment Integration**
- `TestEnv__PrototypeTestingSandbox__Main__.js`: imports both materials modules from `../src__MaterialsSystem/` (no code duplication).
- Material swap called after `TestEnv__LoadAllGlbFiles()` on initial load and again inside the model refresh path (after `TestEnv__LoadAllGlbFiles()` in the node explorer refresh sequence).

**AppConfig Schema Additions**
- New `MaterialsSystem__Config` section added to `src__AppConfig/Na__AppConfig__Main.json`:
  - `MaterialsSystem__Config__Enabled` — master on/off switch.
  - `MaterialsSystem__Config__LibraryUrl` — path to the library JSON (`./src__AppConfig/Na__AppConfig__MaterialsLibrary.json`).
  - `MaterialsSystem__Config__FallbackToWhitecard` — documents intent; whitecard fallback is always active.
  - `MaterialsSystem__Config__PolygonOffsetFactor` / `PolygonOffsetUnits` — passed to all created PBR materials to avoid Z-fighting with linework.
- Identical section added to `80__Testing__PrototypeEnvironment/TestEnv__SubAppData__Config.json` with library URL `../src__AppConfig/Na__AppConfig__MaterialsLibrary.json`.

**SketchUp Plugin — Material Lookup System (New)**
- New file: `Na__TrueVision__GlbBuilder__EngineCore__MaterialLookupSystem__.rb`.
- `Na__MaterialLookup__FetchLibrary` — HTTPS GET to the GitHub Pages URL with 10s connect / 15s read timeout; caches result in module state; returns nil on failure.
- `Na__MaterialLookup__BuildIndex` — parses fetched JSON, flattens all series into `{ SketchUpName => config_hash }` for O(1) lookups; skips `IsDefault` entries.
- `Na__MaterialLookup__IsIndexedMaterial?(name)` — regex `/^MAT\d{3}__/` check without requiring the library to be loaded.
- `Na__MaterialLookup__InLibrary?(name)` — exact key check against the built index.
- `Na__MaterialLookup__GetConfig(name)` — returns full config hash or nil.
- `Na__MaterialLookup__EnrichGltfMaterial(gltf_material, config)` — patches a glTF material hash in-place using `config.key?()` guards (sparse-safe): sets `metallicFactor`, `roughnessFactor`, `baseColorFactor` (with alpha from `Opacity`), `alphaMode: "BLEND"` when opacity < 1, `doubleSided` from `IsDoubleSided`, and `emissiveFactor`.
- `Na__MaterialLookup__ParseRgbString` — `"rgb(R, G, B)"` → `[r, g, b]` normalised 0–1.
- Added `require_relative` for new module in `Na__TrueVision__GlbBuilder__Main__.rb` after `MaterialHandling`.

**SketchUp Plugin — Material Handling (Updated)**
- `Na__TrueVision__GlbBuilder__EngineCore__MaterialHandling__.rb` rewritten to support three export modes.
- `Na__MaterialEngine__SetExportMode(mode)` / `GetExportMode` — sets `:no_materials`, `:all_materials`, or `:indexed_only`.
- `:no_materials` — only the default whitecard material (index 0) is emitted; all mesh primitives reference it. Fastest export, sanitised output.
- `:all_materials` — all unique SketchUp materials exported with their colours; indexed materials additionally enriched with PBR via `Na__MaterialLookup__EnrichGltfMaterial`.
- `:indexed_only` — only materials matching `/^MAT\d{3}__/` and found in the library index are exported; non-indexed materials fall back to index 0 (whitecard). Avoids bloated GLB files with custom or unnamed materials.
- `Na__MaterialEngine__ResolveMaterialIndexForGroup` returns 0 in `:no_materials` mode regardless of material.

**SketchUp Plugin — UI (Updated)**
- `Na__TrueVision__GlbBuilder__UserInterface__.rb`: two new toggles added before the existing "Optimize Large Textures" option.
- **Toggle 1 — "Export Materials"**: unchecked by default. When unchecked, export mode is `:no_materials`.
- **Toggle 2 — "Export Standard Indexed Materials Only"**: greyed out (`opacity: 0.4`, `pointer-events: none`) when Toggle 1 is unchecked; enabled when Toggle 1 is checked; checked by default. Determines `:indexed_only` vs `:all_materials`.
- `Na__TrueVision__GlbBuilder__ToggleMaterials()` JS function enables/disables Toggle 2 group based on Toggle 1 state.
- Export callback reads `materialExportMode` string from JSON params, converts to symbol, calls `self.Na__MaterialEngine__SetExportMode(mode_sym)` before export proceeds.
- Safe fallback in the rescue block sets `:no_materials` on parse error.

**IsDoubleSided — Glass & Transparent Material Correctness**
- SketchUp glass panes are single-polygon faces; without double-sided rendering the backface is culled and the transparent surface either disappears from one side or a white backface bleeds through the opacity.
- `IsDoubleSided: true` in the library simultaneously triggers: `"doubleSided": true` in the exported glTF material entry (plugin side), and `side: THREE.DoubleSide` in the created `THREE.MeshStandardMaterial` (WebApp side).
- Opt-in only — opaque materials (paint, timber) omit `IsDoubleSided` entirely; the renderer defaults to `THREE.FrontSide` for better performance.

**Key Files**
- `src__MaterialsSystem/Na__MaterialsSystem__LibraryLoader.js` — new: library fetch, cache, index.
- `src__MaterialsSystem/Na__MaterialsSystem__MaterialSwap.js` — new: traverse, match, apply PBR.
- `src__AppConfig/Na__AppConfig__MaterialsLibrary.json` — v2.1.0: full PBR schema, sparse authoring.
- `src__AppConfig/Na__AppConfig__Main.json` — added `MaterialsSystem__Config` section.
- `80__Testing__PrototypeEnvironment/TestEnv__SubAppData__Config.json` — added `MaterialsSystem__Config` section.
- `index.html` — materials module imports, config extraction, second-pass material swap after model load.
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__Main__.js` — materials imports, swap on initial load and on refresh.
- `Na__TrueVision__GlbBuilder__EngineCore__MaterialLookupSystem__.rb` — new: URL fetch, index, enrich.
- `Na__TrueVision__GlbBuilder__EngineCore__MaterialHandling__.rb` — rewritten: 3 export modes, PBR enrichment.
- `Na__TrueVision__GlbBuilder__UserInterface__.rb` — 2 new material export toggles, mode resolution in callback.
- `Na__TrueVision__GlbBuilder__Main__.rb` — added require_relative for MaterialLookupSystem.

# ---------------------------------------------------------
## ValeVision3D v1.9.1  -  23-Feb-2026
### Walk Mode Navigation System — First-Person Capsule Physics, Proximity Doors, Test Environment UI & Collision Exemptions

**Walk Mode Navigation System (First-Person)**
- Implemented a complete first-person walk mode navigation system as a fully self-contained module, separate from the existing orbit mode.
- New file: `src__NavigationAndCameras/Na__Navmode__WalkMode__SystemLogic.js` — core capsule physics, gravity, stair-stepping, ground detection, camera yaw/pitch, activate/deactivate state management, and saved orbit state restore.
- Invisible character capsule: eye height 1620mm, capsule height 1800mm, capsule radius 280mm (all config-driven, integer mm in AppConfig, converted to Three.js units at runtime).
- Gravity (9810 mm/s²), terminal velocity cap, ground snapping via multi-point cross-pattern downward raycasting.
- Stair-stepping: capsule climbs steps up to 350mm by ankle-level raycast detection and vertical snap.
- Horizontal wall collision: 8 directional rays at 3 heights (ankle, waist, head); sliding response using hit face normal projection.
- Camera uses Horizontal FOV of 75 degrees; orbit mode FOV and camera state fully restored on deactivate.
- All config values stored as integer mm in `Na__AppConfig__Main.json` and `TestEnv__SubAppData__Config.json` under `Navmode__WalkMode` section.

**Desktop Controls Module**
- New file: `src__NavigationAndCameras/Na__Navmode__WalkMode__DesktopControls.js`.
- WASD + Arrow keys for movement, Shift for sprint (1.8× multiplier), mouse for camera look via Pointer Lock API.
- On activate: requests pointer lock on the renderer canvas; on deactivate: exits pointer lock and removes all listeners.

**Touch Screen Controls Module**
- New file: `src__NavigationAndCameras/Na__Navmode__WalkMode__TouchScreenControls.js`.
- Single finger joystick for directional movement, two-finger drag for head look/rotation, pinch gesture for strafe movement.
- Acceleration and smoothing applied to all touch inputs.

**Proximity Door Trigger System**
- New file: `src__3dObject__InteractionsSystem/3dObjectInteraction__Animation__WalkMode__ProximityToOpenDoors__.js`.
- Detects capsule proximity to door assemblies (2000mm threshold, config-driven) and triggers existing door animations.
- Reuses `Na__DoorAnimation__DoorRegistry` and `Na__DoorAnimation__ToggleDoor` exported from the click-to-open doors module.
- Modified `src__3dObject__InteractionsSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js` to export internal registry and toggle function.

**Global Hotkey — Toggle Walk Mode**
- Alt + Shift + W toggles walk mode in both `index.html` (production) and the test environment.
- Hotkey string defined in new `Global__Hotkeys` section of AppConfig, parsed and evaluated in keydown handlers.

**AppConfig Schema Additions**
- Added `Global__Hotkeys` section to `Na__AppConfig__Main.json` and `TestEnv__SubAppData__Config.json`.
- Added `Navmode__WalkMode` section under `Navmode__Settings` with all walk mode parameters as integer mm values.

**Test Environment — Walk Mode UI Panel**
- Added walk mode toggle panel to `TestEnv__PrototypeTestingSandbox__DomAndLayout.html`: pedestrian icon, toggle button, active mode status indicator, and Alt+Shift+W hotkey hint.
- Panel positioned at `left: 300px` to avoid overlapping the existing storey visibility panel.
- Styles added to `TestEnv__PrototypeTestingSandbox__Stylesheet.css`.

**Test Environment — Save Default View Feature**
- Added "Save View" button to the walk mode panel in the test environment.
- Captures current orbit camera position (mm), rotation quaternion, FOV, and orbit target (mm) and POSTs to a new Flask endpoint `POST /api/save-default-view`.
- Flask server (`TestEnv__FlaskLocalServer.py`) reads `TestEnv__SubAppData__Config.json`, updates the `TestEnv__DefaultView` section, and writes it back to disk.
- On next page load, if `TestEnv__DefaultView` exists in config, the saved camera state is restored automatically — bypassing the default auto-center.
- Save button is disabled whilst in walk mode (must be in orbit mode); button title and state update dynamically on mode toggle.

**Collision Exemption System**
- `Na__WalkMode__SetCollisionMeshes` now filters out helper/dev objects that must always be ghostable.
- Implemented `Na__WalkMode__IsCollisionExempt(object)` which walks the full ancestor chain of each mesh and tests every node name against a keyword list using substring matching.
- Substring matching (not exact) is required because GLB files exported with a project prefix produce names like `NP03__01__OrbitHelperCube__MeshModel__` — exact matching silently fails for all project-prefixed variants.
- Exempt keywords: `'Dev__DefaultCube'` (programmatic pivot reference cube) and `'OrbitHelperCube'` (GLB orbit target cube, catches both root group and child mesh names).

**Key Files**
- `src__NavigationAndCameras/Na__Navmode__WalkMode__SystemLogic.js` — new: capsule physics, collision, gravity, stair stepping, activate/deactivate.
- `src__NavigationAndCameras/Na__Navmode__WalkMode__DesktopControls.js` — new: WASD + mouse Pointer Lock controls.
- `src__NavigationAndCameras/Na__Navmode__WalkMode__TouchScreenControls.js` — new: touch joystick, look, pinch controls.
- `src__3dObject__InteractionsSystem/3dObjectInteraction__Animation__WalkMode__ProximityToOpenDoors__.js` — new: proximity door trigger.
- `src__3dObject__InteractionsSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js` — modified: exports `Na__DoorAnimation__DoorRegistry` and `Na__DoorAnimation__ToggleDoor`.
- `src__AppConfig/Na__AppConfig__Main.json` — added `Global__Hotkeys` and `Navmode__WalkMode` sections.
- `80__Testing__PrototypeEnvironment/TestEnv__SubAppData__Config.json` — mirrored AppConfig additions, stores `TestEnv__DefaultView`.
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__Main__.js` — walk mode integration, save view logic, toggle UI wiring.
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__DomAndLayout.html` — walk mode panel HTML.
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__Stylesheet.css` — walk mode panel styles.
- `80__Testing__PrototypeEnvironment/TestEnv__FlaskLocalServer.py` — added `/api/save-default-view` POST endpoint.
- `index.html` — walk mode imports, initialization, collision mesh wiring, render loop integration, hotkey listener.

# ---------------------------------------------------------
## ValeVision3D v1.9.0  -  18-Feb-2026
### Save Camera Settings — Localhost-Only Button & Full State Restore

**Save Camera Settings Feature**
- Added "Save Camera Settings" button to Tools menu, visible only when running on localhost (Flask server).
- Button saves current camera position, rotation, FOV, and orbit target directly to the job-specific `project.json` via existing Whitecardopedia Flask API (`POST /api/projects/<folder_id>`).
- Replaced old "Download Position Data" panel (textarea, import JSON, download JSON) to simplify UI for end users.
- Added toast notification for success/error feedback (green success, red error, auto-dismiss ~3.5s).
- Exported `Na__UiFeature__BuildCameraJson` from `Na__UiFeature__CameraPosition__Controls.js` for use by save handler.
- New functions: `Na__UiFeature__ShowToast`, `Na__UiFeature__SaveCameraSettings`, `Na__UiFeature__InitializeSaveCameraButton`.
- Removed `Na__UiFeature__InitializeCameraPositionControls` import and call; left `@delegate` breadcrumb per dependency traversal protocol.

**Loading Fix: Restore Full Camera State**
- Fixed issue where rotation and FOV were not restored on reload; only position appeared to persist.
- Root cause: OrbitHelperCube GLB load overwrote orbit target with GLB center, then `controls.update()` recalculated rotation and wiped saved state. Saved `OrbitHelperCube__Position` from `project.json` was never applied during load.
- Hoisted `Na__Saved__ProjectCameraConfig` and `Na__Saved__ProjectOrbitTarget` so they survive into post-OrbitCube block.
- After OrbitHelperCube loads, re-apply saved `OrbitHelperCube__Position` to `controls.target` (mm → units via `Na__Math__ConvertMmToUnits`).
- Re-apply `Na__UiFeature__ApplyCameraConfig` and call `controls.update()` to finalize.
- Ensures position, orbit target, FOV, and rotation all restore correctly on reload.

**Key Files**
- `index.html` — save button HTML, toast div, save handler, conditional visibility, loading-sequence re-apply block.
- `src__CameraUtils/Na__UiFeature__CameraPosition__Controls.js` — export `Na__UiFeature__BuildCameraJson`.
- `src__Styles/ui-components.css` — `.na-toast`, `.na-toast--visible`, `.na-toast--error` styles.

# ---------------------------------------------------------
## ValeVision3D v0.1.8  -  18-Feb-2026
### Scene Effects Delegation & Post-Processing Orbit-Anchored Fog

**Scene Effects Delegation**
- Moved default lighting and ground plane setup from inline `index.html` into dedicated module `src__Scene__LightingEffects/Na__Scene__DefaultSceneLighting.js`.
- Moved fog/environment setup into dedicated module `src__Scene__EnvironmentEffects/Na__Scene__DefaultFogEffect.js`.
- Architecture: AppConfig (JSON) → dedicated default-condition scripts → wider engine (render loop, main app).
- Added `@delegate:` breadcrumbs at extraction points per dependency traversal protocol.

**Fog Config Schema Migration**
- Replaced density-based fog fields with orbit-anchored envelope model in `Scene__Default__FogConfig`:
  - `Scene__Default__FogConfig__Description` — documents mm units and conversion requirement.
  - `Scene__Default__FogConfig__Enabled` — true/false flag.
  - `Scene__Default__FogConfig__Color` — integer RGB (e.g. 16777215 for white).
  - `Scene__Default__FogConfig__StartDistanceMm` — fog begins at this distance from orbit cube (default 30000 mm).
  - `Scene__Default__FogConfig__EndDistanceMm` — fog fully obscures beyond this distance (default 50000 mm).
- All distance values are integer millimeters; converted to Three.js scene units via `Na__Math__ConvertMmToUnits` in code.

**Post-Processing Fog Pass (Rewrite)**
- Replaced broken per-material opacity approach with screen-space post-processing ShaderPass.
- Fog now runs as final visual effect in the render pipeline: RenderPass → ProfileLines → **Fog Pass** → FXAA.
- Depth-based implementation: reads depth texture from render target, reconstructs world position from logarithmic depth buffer, computes distance from orbit anchor per pixel, blends fog color via `smoothstep(fogStart, fogEnd, dist)`.
- Covers all geometry types uniformly: meshes, linework (LineSegments2), and profile lines — no per-node traversal.
- Orbit cube sets fog zero point; when OrbitHelperCube loads, fog anchor switches from Dev__DefaultCube to orbit cube center.
- MM-to-units conversion applied in `Na__Scene__CreateFogPass` via `Na__Math__ConvertMmToUnits` for start/end distances.

**Render Pipeline Changes**
- Added `DepthTexture` to EffectComposer render target for fog pass depth reads.
- `Na__RenderPipeline__SetupComposer` now accepts optional `fogPass` parameter; inserts fog pass after profile lines, before FXAA.
- Fog pass receives depth texture uniform and per-frame camera matrices for world position reconstruction.

**Key Files**
- `src__Scene__LightingEffects/Na__Scene__DefaultSceneLighting.js` — ambient + directional light, conditional ground plane.
- `src__Scene__EnvironmentEffects/Na__Scene__DefaultFogEffect.js` — fog ShaderPass, CreateFogPass, UpdateFogPassUniforms, SetFogOrbitReference, ApplyFogBackground.
- `src__RenderPipeline/Na__RenderPipeline__PostProcessing__Setup.js` — DepthTexture, fog pass insertion.
- `src__AppConfig/Na__AppConfig__Main.json` — Scene__Default__FogConfig schema.
- `index.html` — imports, fog pass creation, composer wiring, render loop uniform updates, orbit cube reference wiring.

# ---------------------------------------------------------
## ValeVision3D v0.1.7  -  18-Feb-2026
### Configuration Architecture Refactor — Scene Config Separation & Ground Plane Control

**Scene Configuration Restructure**
- Refactored monolithic `sceneConfig` object into four dedicated configuration objects following `Scene__GroundPlane` naming convention.
- New config sections: `Scene__Default__CameraConfig`, `Scene__Default__LightingConfig`, `Scene__Default__FogConfig`, `Scene__Default__ControlsConfig`.
- All property names follow double-underscore pattern: `Section__Subsection__PropertyName` for consistency and discoverability.
- Improved organization: camera, lighting, fog, and controls settings now logically separated.

**Ground Plane Configuration**
- Extracted ground plane settings from `sceneConfig` into dedicated `Scene__GroundPlane` section.
- Added `Scene__GroundPlane__Enabled` flag (default: `false`) to conditionally create ground plane.
- Prevents Z-fighting artifacts when landscape meshes are present in GLB models.
- Ground plane only renders when explicitly enabled, eliminating secondary line rendering issues.

**Property Mapping**
- **CameraConfig**: `Scene__Default__CameraConfig__Fov`, `Scene__Default__CameraConfig__Near`, `Scene__Default__CameraConfig__Far`.
- **LightingConfig**: `Scene__Default__LightingConfig__AmbientIntensity`, `Scene__Default__LightingConfig__DirectionalIntensity`.
- **FogConfig**: `Scene__Default__FogConfig__Density`, `Scene__Default__FogConfig__Color` (used for both background and fog).
- **ControlsConfig**: `Scene__Default__ControlsConfig__MovementSpeed`, `Scene__Default__ControlsConfig__ElevationSpeed`, `Scene__Default__ControlsConfig__EnableWASD`, `Scene__Default__ControlsConfig__EnableDamping`, `Scene__Default__ControlsConfig__StatusHideDelay`.
- **GroundPlane**: `Scene__GroundPlane__Enabled`, `Scene__GroundPlane__Size`, `Scene__GroundPlane__yAxisOffset`, `Scene__GroundPlane__ShadowOpacity`.

**Code Updates**
- Updated `index.html`: replaced `Na__Config__SceneConfig` with four new config constants.
- Updated scene background/fog initialization to use `Na__Config__FogConfig`.
- Updated camera constructor to use `Na__Config__CameraConfig`.
- Updated lighting setup function to use `Na__Config__LightingConfig`.
- Added conditional ground plane creation based on `Scene__GroundPlane__Enabled` flag.

**Test Environment Synchronization**
- Applied identical structural changes to `TestEnv__SubAppData__Config.json`.
- Updated `TestEnv__PrototypeTestingSandbox__Main__.js` with matching config constant refactoring.
- Test environment now uses same separated config structure as main application.

**Benefits**
- **Eliminates Z-fighting**: Ground plane can be disabled when landscape meshes are present.
- **Improved maintainability**: Related settings grouped logically by function.
- **Consistent naming**: All config properties follow established double-underscore convention.
- **Better discoverability**: Clear separation makes configuration easier to understand and modify.
- **Backward compatible**: All existing functionality preserved with improved structure.

**Key Files Modified**
- `src__AppConfig/Na__AppConfig__Main.json` — refactored config structure.
- `80__Testing__PrototypeEnvironment/TestEnv__SubAppData__Config.json` — matching test config structure.
- `index.html` — updated config constants and all property references.
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__Main__.js` — updated test environment config usage.

# ---------------------------------------------------------
## ValeVision3D v0.1.6  -  15-Feb-2026
### Building Storey Visibility System — Dolls House View & Per-Storey Toggle
*Note: Developed in Test Environment, Migrated to Production Module*

**Feature Overview**
- Per-storey visibility control for multi-storey building models enabling interior exploration.
- "Dolls house view" cut-away mode: hides topmost visible storey's roof to reveal interior spaces.
- Intelligent roof management: lower storey roofs remain visible as ceilings for spatial context.
- Individual storey toggle: show/hide specific floors independently.
- Roof mode toggle: switch between solid building (all roofs) and dolls house (topmost roof hidden).
- Automatic detection from GLB filenames: no manual configuration required.

**SketchUp GLB Builder v1.6.0 Integration**
- Storey-based export system: detects top-level storey containers tagged 90-93 at model root.
- Per-storey per-element export: children organized by element tags (walls 21, floors 22, roofs 23, etc.).
- World-space transform baking: storey container's transformation pre-multiplied into export root.
- Filename pattern: `{Prefix}Storey__{StoreyName}__{ElementType}__{Suffix}.glb` (e.g., "Storey__GroundFloor__ProposedWalls__MeshModel__.glb").
- Element tag granularity: split tag 10 (Existing) and tag 20 (Proposed) into individual element ranges for finer control.
- Parent transform parameter: `Na__GlbEngine__ExportEntitiesToGlb` and `Na__LineworkEngine__ExportLineworkToGlb` accept optional parent transform.
- Transform chain: `Z_UP_TO_Y_UP * storey.transformation * child.transformation` ensures correct vertical positioning.
- MAX_NESTING_DEPTH increased from 3 to 4 to support storey container nesting level.
- Backward compatible: non-storey models export identically using flat TAG_RANGES system.

**Module Architecture**
- Permanent module: `src__3dObject__ViewBuildingStoreysSystem/3dObject__ViewBuildingStoreys__SystemLogic__.js`.
- Stateful design: maintains internal storey map, visibility state, roof map, and roof visibility flag.
- Clean separation: pure logic in module, DOM manipulation in caller.
- Public API: Initialize, DetectStoreys, SetStoreyVisibility, ShowOnlyBelow, ShowAll, ToggleStorey, ToggleRoof, GetState, GetStoreyDisplayName.
- Configuration support: accepts storey order and default roof visibility mode.
- Zero DOM dependencies: no HTML/CSS coupling, works with any UI framework.

**Storey Detection System**
- Pattern matching: scans loaded GLB model names for `Storey__{StoreyName}__` pattern.
- Supported storey names: GroundFloor, FirstFloor, SecondFloor, ThirdFloor (configurable order).
- Automatic grouping: models with matching storey names grouped together for batch visibility control.
- Roof detection: filters models with "Roof" substring (ProposedRoofs, ExistingRoofs) per storey.
- Custom storey support: detected storeys not in predefined order automatically appended.

**Intelligent Roof Visibility Logic**
- **Solid building mode** (default): All roofs visible for complete exterior view.
- **Dolls house mode**: Topmost visible storey's roof hidden (reveals interior), lower roofs shown as ceilings.
- Dynamic adaptation: roof logic recalculates when storey visibility changes.
- Example flow: GF + FF visible → GF roof shown (ceiling), FF roof hidden (see inside FF).
- Manual override: Roof toggle button switches between modes independent of storey state.

**User Interaction Modes**
- **Individual toggle**: Click storey button to show/hide that floor.
- **Dolls house cut**: Right-click storey button to show only that storey and below (architectural section).
- **Entire building**: "Show Entire Building" button restores all storeys with current roof mode.
- **Roof control**: Dedicated roof button toggles between solid building and dolls house view.

**Test Environment Integration**
- Storey panel UI: bottom-left panel with roof button (top) and storey buttons (ordered top to bottom).
- Visual feedback: green tint for visible storeys, red tint for hidden, blue tint for roof button.
- Icon system: eye (visible), no-entry (hidden), house (solid building), no-entry (dolls house).
- Separator line between roof and storey buttons for clear visual hierarchy.
- State synchronization: UI buttons reflect module state via `GetState()` API.

**Benefits**
- **Interior exploration**: Remove upper floors to see room layouts and spatial relationships.
- **Loft conversions**: Hide final roof to expose top floor interior design.
- **Construction phasing**: Show building progress by revealing storeys sequentially.
- **Client presentations**: Dynamic cut-away views without pre-rendered sections.
- **Accessibility**: Understand multi-storey layouts for wheelchair access planning.

**Technical Details**
- Module state: `{ map, order, hasStoreys, visibleState, roofMap, roofVisible }`.
- Detection complexity: O(n) where n = loaded models (single scan on load/refresh).
- Visibility updates: O(k) where k = models per storey (small filtered sets).
- Roof logic: O(m) where m = roof models per storey (typically 1-2).
- Three.js integration: sets `.visible` property on Object3D nodes (no geometry modification).

**Key Files**
- `src__3dObject__ViewBuildingStoreysSystem/3dObject__ViewBuildingStoreys__SystemLogic__.js` — Core storey visibility module.
- `src__3dObject__ViewBuildingStoreysSystem/3dObject__ViewBuildingStoreys__README__.md` — Integration documentation.
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__Main__.js` — Test environment integration (wrapper functions).
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__DomAndLayout.html` — Storey panel HTML structure.
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__Stylesheet.css` — Storey panel styling (bottom-left positioning).
- `80__Testing__PrototypeEnvironment/TestEnv__SubAppData__Config.json` — StoreyVisibility configuration section.

# ---------------------------------------------------------
## ValeVision3D v0.1.5  -  15-Feb-2026
### 3D Object Interactions System — Click-to-Open Door Animation 
*Note: Migrated From Test Environment*

**Feature Migration to Main Application**
- Door animation feature promoted from test environment to production ValeVision3D application.
- New module system: `src__3dObject__InteractionsSystem/` for interactive 3D object behaviors.
- Dual model animation: synchronized rotation of mesh (solid geometry) and linework (edges) door models.
- Y-up coordinate space integration: proper vertical rotation axis `(0, 1, 0)` via transform conjugation in GLB export.
- Config-driven architecture: nested configuration under `3dObject__InteractionsSystem` → `3dObject__Interaction__DoorAnimation`.
- Fully qualified property names: `3dObject__Interaction__DoorAnimation__Enabled`, `AnimationDurationMs`, `DefaultRotationDeg`, `ClickThresholdPx`.

**SketchUp GLB Builder v1.5.0 Integration**
- Hierarchy-preserving GLB export for door assemblies (ADR-prefixed entities).
- Door Handler module (`Na__TrueVision__GlbBuilder__SpecialObject__DoorObjectHandling__.rb`) exports ADR > MOD/ROT/OuterShell node structures.
- Transform conjugation: `Z_UP * M_su * inv(Z_UP)` converts SketchUp Z-up local spaces to glTF Y-up.
- Inline detection during scene graph traversal: zero overhead when no doors present.
- Tag 25 mapping: `25__ProposedBuilding__Doors` exports as `*__ProposedDoors__MeshModel/LineworkModel__.glb`.
- Both mesh and linework exporters preserve identical hierarchy with matching node names.

**Main Application Integration**
- Module location: `src__3dObject__InteractionsSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js`.
- Auto-initialization after model loading if config enabled and door model groups found.
- Delta time tracking added to render loop for frame-rate-independent animation.
- Model loader category support: `ValeVision__MainBuildingModel__ProposedDoors` added to load order.
- Model toggle controls: "Doors" display name for visibility toggles.
- Configuration: `src__AppConfig/Na__AppConfig__Main.json` under `3dObject__InteractionsSystem`.

**Animation System Features**
- Click detection with orbit drag filtering (4px threshold).
- Raycasting against door meshes (both mesh and linework) with ADR ancestor lookup.
- Smooth easeInOutCubic animation (600ms default duration).
- Mid-animation reversal: click during animation to reverse direction with proportional duration scaling.
- Toggle behavior: CLOSED → OPENING → OPEN → CLOSING → CLOSED state machine.
- Pivot rotation around ROT hinge point using quaternion transforms.
- Per-door configuration: rotation angle parsed from MOD name (e.g., `MOD001__ROT__90-Deg__DoorPanel`).

**Test Environment Cleanup**
- Test scripts migrated to main app; test environment now imports from production module.
- Removed duplicate code: test feature scripts deleted, replaced with migration notes.
- Test config inherits door animation settings with proper nested structure.
- Clean separation: test environment validates production code, ready for next feature prototype.

**Naming Convention (SketchUp → glTF)**
- **ADR** = Door Assembly (e.g., `ADR002__InternalDoor__GroundFloor__PorchToLounge`)
- **MOD** = Modifier Object (e.g., `MOD001__ROT__90-Deg__DoorPanel`) — contains rotating geometry
- **ROT** = Rotation Point (e.g., `ROT001__RotationPoint__DoorHingeCentre`) — hinge pivot position

**Key Files**
- `src__3dObject__InteractionsSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js` — Production door animation module.
- `src__3dObject__InteractionsSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__README__.md` — Technical documentation.
- `src__AppConfig/Na__AppConfig__Main.json` — Door animation configuration.
- `index.html` — Import, initialization, delta time tracking, render loop integration.
- `src__ModelLoader/Na__ModelLoader__MultiModel.js` — ProposedDoors category support.
- `src__ModelToggle/Na__UiFeature__ModelToggle__Controls.js` — Doors visibility toggle.

# ---------------------------------------------------------
## ValeVision3D v0.1.4  -  14-Feb-2026
### Testing Environment — Prototype Sandbox & Click-to-Open Doors Feature (Initial Prototype)

**Test Environment Infrastructure**
- Created self-contained prototype testing sandbox (`80__Testing__PrototypeEnvironment/`) for rapid feature development before main integration.
- Standalone Flask server (`TestEnv__FlaskLocalServer.py`) on port 5500 serving test environment + parent ValeVision3D engine modules.
- Separate HTML/JS/CSS bootstrap reusing core engine (navigation, render pipeline, math utils) from parent project.
- Local GLB file loading from `TestEnv__GlbFiles/` folder with automatic discovery via Flask API endpoint.
- Live statistics overlay (FPS, mesh count, vertex count, GLB file count) for performance monitoring.
- Full node graph explorer panel (resizable, collapsible) with per-node visibility toggles for scene inspection.
- Tree view export to clipboard with visual hierarchy (emoji icons, indentation, visibility status).
- Testing mode banner and header modifications to clearly distinguish sandbox from production environment.

**Door Animation System (First Feature Test)**
- Click-to-open/close door animation system using scene graph naming conventions.
- Scans loaded GLB models for door assemblies (`ADR` prefix), modifier objects (`MOD__ROT__XX-Deg`), and rotation points (`ROT` prefix).
- Parses rotation angle from modifier name (e.g., `MOD001__ROT__90-Deg__DoorPanel` extracts 90 degrees).
- Raycasting with pointer movement threshold (4px) to distinguish clicks from orbit camera drags.
- Smooth animation with easeInOutCubic easing, configurable duration (600ms default).
- Pivot rotation around hinge point (Y-axis) using quaternion math for proper door swing.
- Toggle behavior: click closed door to open, click open door to close, click during animation to reverse from current position.
- Mid-animation reversal scales duration proportionally to remaining travel distance.
- Config-driven feature flag (`DoorAnimation__Enabled`) and parameters (duration, default rotation, click threshold).

**Architecture & Integration**
- Feature module pattern: standalone ES6 module (`Test__ModelInteraction__Animation__ClickToOpenDoors__.js`) with exported init and update functions.
- Config-driven feature system: test environment config JSON (`TestEnv__SubAppData__Config.json`) controls feature flags and parameters.
- Clean integration points: import in module region, initialize after GLB loading, update in render loop with delta time.
- Delta time tracking added to render loop for frame-rate-independent animation.
- Module structure follows ValeDesignSuite conventions: regions, 4-space indentation, inline comments, `Na__` namespace prefix.

**Development Workflow Benefits**
- Isolated feature prototyping without affecting production ValeVision3D environment.
- Live reloading and debugging with dedicated dev server and file structure.
- Node explorer provides immediate scene graph inspection for understanding model hierarchies.
- Performance overlay monitors frame rate impact of new features during development.
- Clean migration path: stable features copy from test scripts to main engine with minimal refactoring.

**Key Files Created**
- `80__Testing__PrototypeEnvironment/TestEnv__FlaskLocalServer.py` — Flask dev server with GLB file API.
- `80__Testing__PrototypeEnvironment/TestEnv__FlaskLocalServer.bat` — Server launch script.
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__Main__.js` — Test environment bootstrap and render loop.
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__DomAndLayout.html` — Test environment HTML layout.
- `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__Stylesheet.css` — Test environment UI styles.
- `80__Testing__PrototypeEnvironment/TestEnv__SubAppData__Config.json` — Test environment configuration.
- `80__Testing__PrototypeEnvironment/TestEnv__README__.md` — Test environment documentation.
- `80__Testing__PrototypeEnvironment/TestEnv__CurrentFeatureTestScripts/Test__ModelInteraction__Animation__ClickToOpenDoors__.js` — Door animation feature module.

# ---------------------------------------------------------
## ValeVision3D v0.1.3c  -  13-Feb-2026
### Page Layout Touch Controls — Edge Handle Clipping Parity (iOS / Touchscreen)

**Issue Fixed**
- On touch devices (including iOS), image clipping via edge handles was not available in Layout View.
- Mouse controls supported edge clipping (`tc`, `bc`, `lc`, `rc`), but touch controls only supported body move + corner proportional resize.

**Touch Control Update**
- Added edge midpoint hit-testing in touch controls:
  - top-center (`tc`)
  - bottom-center (`bc`)
  - left-center (`lc`)
  - right-center (`rc`)
- Added one-finger edge-drag clipping logic matching PC behavior:
  - `rc` -> updates `clipRight`
  - `lc` -> updates `clipLeft`
  - `bc` -> updates `clipBottom`
  - `tc` -> updates `clipTop`
- Clip limits now enforce minimum visible content and max-clip bounds equivalent to PC constraints.

**Behavior Preserved**
- One-finger body drag still moves image.
- One-finger corner drag still performs proportional resize.
- Two-finger pinch/pan navigation path remains unchanged and still takes precedence for canvas navigation.

**Key File Modified**
- `src__PageLayoutSystem/Na__PageLayoutSystem__Controls__TouchScreen__.js`
  - Added edge hit-test branches.
  - Added clip state persistence in drag start transform.
  - Added edge clipping branches in touch move handler.
  - Updated module header comments to reflect clipping support.

# ---------------------------------------------------------
## ValeVision3D v0.1.3b  -  13-Feb-2026
### Layout View Export Fix — Profile Lines / Camera Projection Synchronization

**Issue Fixed**
- Layout View images could show profile lines at a slightly different perspective/FOV than the base render, creating a "layered perspective" look.
- Root cause was capture-time desynchronization between color pass (`composer.render()`) and profile-line normal pass (`renderProfileNormals()`), especially during custom export resize/aspect changes.

**Pipeline Synchronization Update**
- Export pipeline now resolves a full render pipeline state bundle instead of composer-only access.
- Capture order now enforces synchronized projection and buffer state:
  - camera aspect/projection update
  - composer resize
  - profile lines normal render target resize
  - profile normals re-render
  - composer render
- Restore order now also re-syncs profile lines after returning renderer/composer to live viewport size.

**3-Stage Naming / API Wiring**
- Naming convention preserved with `Na__...__...__...` style throughout new helper and state plumbing.
- Added `Na__UiFeature__ResolveRenderPipelineState(...)` helper in export controls.
- `Na__UiFeature__InitializeImageExportControls(...)` now accepts render-pipeline-state getter (composer + helpers), backward compatible with legacy composer getter shape.

**Key Files Modified**
- `src__ImageExport/Na__UiFeature__ImageExport__Controls.js`
  - Added render-pipeline-state resolver helper.
  - Updated export render path to call `setProfileLinesSize(...)` and `renderProfileNormals()` at capture and restore boundaries.
- `index.html`
  - Added shared `Na__RenderPipeline__State` module variable.
  - Updated image export initializer wiring to pass render-pipeline-state getter.
  - Updated render loop and resize code paths to use shared pipeline state consistently.

# ---------------------------------------------------------
## ValeVision3D v0.1.3  -  12-Feb-2026
### Render Effect — Profile Lines (SketchUp-Style Silhouette Edges)

**Profile Lines Feature**
- SketchUp-style "Profile Lines" effect: extra visible edges around rounded/cylindrical geometry (finials, chimney pots, turned details) so they read clearly in the whitecard view.
- Implemented as a post-processing pass: scene normals rendered to a separate buffer; Sobel edge detection on the normal buffer; dark profile lines composited over the scene before FXAA.
- Line geometry (LineSegments2) is hidden during the normal pass to avoid artifacts.
- Enable/disable and parameters (edge color, normal threshold, edge width) driven by AppConfig `RenderEffect__ProfileLines`.

**Config & Integration**
- New AppConfig block `RenderEffect__ProfileLines`: `Enabled`, `EdgeColor`, `EdgeThresholdNormal`, `EdgeThresholdDepth`, `EdgeWidth`.
- Composer setup returns `{ composer, renderProfileNormals, setProfileLinesSize }`; render loop calls `renderProfileNormals()` each frame before `composer.render()`; resize handler calls `setProfileLinesSize(width, height)`.

**Key Files**
- `src__RenderPipeline/Na__RenderEffect__ProfileLines__.js` — normal buffer render, Sobel shader, pass creation.
- `src__RenderPipeline/Na__RenderPipeline__PostProcessing__Setup.js` — optional ProfileLines pass insertion, config wiring.
- `src__AppConfig/Na__AppConfig__Main.json` — `RenderEffect__ProfileLines` block.
- `index.html` — config destructuring, composer result handling, loop and resize wiring.

# ---------------------------------------------------------
## ValeVision3D v0.1.2  -  12-Feb-2026
### 3D Render Pipeline — Ground Line Visibility & RenderConfig__Linework Naming

**Ground Line Visibility Fix**
- Ground line (building base meeting ground plane) was invisible in viewport due to depth fighting with mesh surfaces.
- Root cause: renderer uses `logarithmicDepthBuffer: true`; depth is written in fragment shader via `gl_FragDepth`, so WebGL polygon offset has no effect (hardware offset does not modify `gl_FragDepth`).
- Solution: fragment shader depth bias via `LineMaterial.onBeforeCompile` — after `#include <logdepthbuf_fragment>`, subtract a small configurable value from `gl_FragDepth` so line fragments win the depth test against coplanar mesh.
- Depth bias value configurable in AppConfig; default `0.00015` balances visibility of ground line without causing distant lines to pop in front of surfaces.

**RenderConfig__Linework Config & 3-Stage Naming**
- Linework config block renamed from `"linework"` to `"RenderConfig__Linework"` for consistency with 3-stage naming.
- All linework properties use `RenderConfig__Linework__*` keys: `EdgeColor`, `LineWidth`, `PolygonOffsetFactor`, `PolygonOffsetUnits`, `RenderOrder`, `DepthBias`.
- Downstream code in `Na__ModelLoader__MultiModel.js` updated to read `config.RenderConfig__Linework` and `lineworkConfig.RenderConfig__Linework__*` properties.
- Single source of truth for line appearance and depth behaviour; no other files reference these keys.

**Key Files Modified**
- `src__AppConfig/Na__AppConfig__Main.json` — `RenderConfig__Linework` block and property names.
- `src__ModelLoader/Na__ModelLoader__MultiModel.js` — depth bias hook on LineMaterial, config key references.

# ---------------------------------------------------------
## ValeVision3D v0.1.1  -  12-Feb-2026
### Page Layout System — Image Clipping with Edge Handles

**Edge Handle Clipping Feature**
- Edge handles (top, bottom, left, right) now clip/trim images instead of free resizing.
- Dragging edge handles inward crops the image from that edge while maintaining container size.
- Corner handles continue to scale the image proportionally (behavior unchanged).
- Clipping is non-destructive: image container maintains full dimensions; only visible portion changes.
- Minimum 10mm visible content enforced to prevent complete clipping.

**Technical Implementation**
- Added clip properties to `imageTransform` state: `clipTop`, `clipRight`, `clipBottom`, `clipLeft` (all in mm).
- Canvas rendering applies clipping via `ctx.clip()` with calculated visible region rectangle.
- Source image draw uses 9-parameter `drawImage()` to map clipped source region to full container bounds.
- PC controls updated: edge handle drag calculates clip values based on drag delta and enforces maximum clip constraints.
- Touch controls description clarified: only corner handles used on touch devices (edge handles PC-only).

**Code Organization**
- Created new "Selection Handle Rendering System" region in `Na__PageLayoutSystem__CanvasRenderPipeline__.js`.
- Extracted handle drawing logic into specialized functions:
  - `Na__PageLayout__DrawHandle()` — draws single handle square
  - `Na__PageLayout__DrawSelectionHandles()` — draws all 8 handles
  - `Na__PageLayout__DrawSelectionBorder()` — draws dashed selection border
- Improved code maintainability by grouping all handle rendering logic in dedicated region block.

**User Experience**
- Intuitive trimming workflow: drag edge handles inward to crop unwanted portions of image.
- Visual feedback: handles always show full container bounds for clear reference.
- Selection border indicates full container area; clipped image visible within that boundary.
- Allows precise image composition without affecting layout positioning.

**Key Files Modified**
- `src__PageLayoutSystem/Na__PageLayoutSystem__SystemLogic__Main__.js` — added clip properties to state initialization.
- `src__PageLayoutSystem/Na__PageLayoutSystem__CanvasRenderPipeline__.js` — clipping render logic, reorganized handle system.
- `src__PageLayoutSystem/Na__PageLayoutSystem__Controls__Pc__.js` — edge handle clipping behavior, clip value constraints.
- `src__PageLayoutSystem/Na__PageLayoutSystem__Controls__TouchScreen__.js` — updated description (no edge handles on touch).

# ---------------------------------------------------------
## ValeVision3D v0.1.0  -  12-Feb-2026
### OrbitHelperCube GLB Integration — Automatic Orbit Target Positioning

**Automatic Orbit Target from SketchUp Exported Cube**
- OrbitHelperCube GLB files exported from SketchUp now automatically define the camera orbit focus point.
- Cube GLB files follow naming pattern: `{ProjectName}__NN__OrbitHelperCube__MeshModel__.glb`.
- System detects OrbitHelperCube URLs in project model arrays and separates them from regular models.
- Cube center position (bounding box) becomes the orbit target, eliminating manual JSON configuration per project.
- Cube is hidden by default; visible only when `OrbitHelperCube__Debug__Visible` flag is enabled in AppConfig.

**Implementation**
- New functions in `Na__ModelLoader__MultiModel.js`:
  - `Na__ModelLoader__SeparateOrbitCubeUrl()` — filters OrbitHelperCube URL from model array.
  - `Na__ModelLoader__LoadOrbitHelperCube()` — loads cube GLB and extracts center position.
- OrbitHelperCube URL filtered before model loading, ensuring it never appears as a category or toggle button.
- Loading sequence: separate cube URL → load cube → set orbit target → load remaining models.
- Falls back to `Dev__DefaultCube` position when no OrbitHelperCube found (backward compatible).

**Configuration Changes**
- Removed `Camera__DefaultTarget` from `Camera__DefaultPosition` in AppConfig (orbit target now from cube or Dev__DefaultCube).
- Added `OrbitHelperCube__Debug__Visible: false` flag in `Dev__DeveloperMode` config.
- Project JSON files can remove `Camera__DefaultTarget` when OrbitHelperCube GLB is present.
- Camera UI JSON output split into two sections: `Camera__DefaultPosition` (Pos/Rotation/FOV) and `OrbitHelperCube__Position` (target) for easier copy/paste.

**Benefits**
- No manual orbit target configuration required per project — set in SketchUp instead.
- Consistent orbit positioning across projects using exported cube geometry.
- Debug visibility toggle allows inspection of orbit cube position when needed.
- Backward compatible: projects without OrbitHelperCube use Dev__DefaultCube fallback.

**Key Files**
- `src__ModelLoader/Na__ModelLoader__MultiModel.js` — cube detection, separation, and loading functions.
- `index.html` — loading sequence integration, orbit target application, debug flag parsing.
- `src__AppConfig/Na__AppConfig__Main.json` — removed Camera__DefaultTarget, added debug flag.
- `src__CameraUtils/Na__UiFeature__CameraPosition__Controls.js` — split JSON output format.

# ---------------------------------------------------------
## ValeVision3D v0.0.9  -  11-Feb-2026
### Page Layout View System (LayoutVision 2D)

**2D Page Layout System for A3 Document Composition**
- Standalone browser tab opens when user clicks "Layout View" button in Export Image panel.
- Rendered 3D viewport image positioned on A3 title block template (landscape 420x297mm).
- Full 2D canvas interaction: drag to reposition, corner/edge handles to resize image.
- Mouse wheel zoom toward cursor, middle/right-click pan, two-finger pinch/pan on touch.
- Exports exact A3-scale PDFs: "Export Full Layout" (title block + image) or "Export Image Only".
- Uses jsPDF v4.1.0 (version-locked, CDN independent, self-contained UMD build).

**Architecture**
- Data transfer via `window.opener` global property (avoids localStorage 5-10 MB size limit).
- All positioning stored in mm coordinates relative to A3 origin; maps directly to jsPDF units.
- DPR-aware canvas rendering for sharp display on retina screens.
- Image initially centered at 80% of A3 printable area with source aspect ratio preserved.
- PC controls: proportional corner resize, free edge resize, body drag.
- Touch controls: single-finger drag/resize, two-finger pinch zoom + pan.

**Key Modules**
- `Na__PageLayoutSystem__Layout__.html` — standalone page with Vale-branded header matching main app.
- `Na__PageLayoutSystem__SystemLogic__Main__.js` — orchestrator; loads image from opener, manages state.
- `Na__PageLayoutSystem__CanvasRenderPipeline__.js` — 2D rendering: A3 paper, title block, image, handles.
- `Na__PageLayoutSystem__2dNavigationControls__.js` — zoom toward cursor, pan on middle/right-click.
- `Na__PageLayoutSystem__Controls__Pc__.js` — left-click hit-test, drag/resize with cursor feedback.
- `Na__PageLayoutSystem__Controls__TouchScreen__.js` — touch drag/resize/pinch with gesture disambiguation.
- `Na__PageLayoutSystem__PdfExport__A3__.js` — jsPDF integration for exact A3-scale PDF export.
- `01__Dependencies__VersionLocked/jspdf.umd.js` — jsPDF v4.1.0 vendored dependency (1.2 MB).

**Integration**
- Shared render helper `Na__UiFeature__RenderToDataUrl()` in Export Controls module.
- Both "Export Now" and "Layout View" use same render pipeline (custom or viewport mode).
- Layout View button added to Export Image panel below "Export Now" button.
- Export controls refactored to eliminate code duplication between export paths.

**UI**
- Header matches main ValeVision app (white background, Vale logo, blue border); title "LayoutVision 2D".
- Secondary actions bar below header with Export Full Layout, Export Image Only, Close buttons.

# ---------------------------------------------------------
## ValeVision3D v0.0.8  -  11-Feb-2026
### Image Export Safe Frame & Rule of Thirds Grid Overlay

**Safe Frame Overlay**
- Transparent grey overlay bars (top, bottom, left, right) showing export crop area.
- Dynamically updates based on selected aspect ratio (3:2, 4:3, 16:9).
- Appears when Image Export panel is opened; hides when panel is closed.
- Automatically recalculates on window resize with debounced updates.
- Uses aspect ratio fitting algorithm for pillarbox (wider viewport) or letterbox (taller viewport) display.

**Rule of Thirds Grid Overlay**
- Composition guide lines dividing safe frame into 9 equal parts (3x3 grid).
- Vale blue (#182c3b) at 50% opacity for brand consistency.
- Line thickness 1.5px for improved visibility.
- Updates dynamically with aspect ratio changes.
- Positioned within safe frame area for accurate composition guidance.

**Implementation**
- New module `Na__UiFeature__ImageExport__ViewportOverlays.js` handles overlay creation, positioning, and updates.
- CSS module `image-export-overlays.css` provides styling with z-index 500 (between viewport and menu).
- Overlays use `pointer-events: none` to allow continued 3D interaction through overlay.
- Integrated into export controls with show/hide on panel toggle and aspect ratio slider changes.
- Overlay automatically hides when custom export is disabled.

**Key Files**
- `src__ImageExport/Na__UiFeature__ImageExport__ViewportOverlays.js` — overlay logic and positioning calculations.
- `src__Styles/image-export-overlays.css` — overlay styles and animations.
- `src__ImageExport/Na__UiFeature__ImageExport__Controls.js` — integration with export panel controls.
- `index.html` — overlay DOM elements added to root container.

# ---------------------------------------------------------
## 11-Feb-2026 - ValeVision3D v0.0.7
### Enhance Whitecard Post-Process Pipeline

**Image Export Post-Processing**
- Added "Enhance Whitecard" toggle to Export Image panel (default: on).
- Post-processing runs at export time only; viewport render pipeline unchanged.
- Canvas 2D pixel manipulation pipeline applied after Three.js render, before download.
- Config-driven effect order and parameters via `Na__AppConfig__Main.json` → `ImageExport__PostProcessEffects`.

**Levels Effect** (`Na__ImageExport__PostProcessEffects__Levels.js`)
- Pixel-level black/white/gamma remapping via ImageData.
- White point set to 230 clips light grays to pure white; dark lines preserved.
- Removes subtle face shading from render for clean whitecard line art.

**High Pass Sharpen Effect** (`Na__ImageExport__PostProcessEffects__HighPassSharpen.js`)
- CSS `blur()` filter for GPU-accelerated blur; high-pass layer = (original - blurred) / 2 + 128.
- Overlay blend mode sharpens black lines against white background.
- Configurable radius, blend mode, opacity.

**Pipeline Orchestrator** (`Na__ImageExport__PostProcessEffects__Pipeline.js`)
- Sorts effects by `Order` field; applies enabled effects sequentially.
- Each effect is a standalone module; pipeline reads config and invokes them.

**Key Files**
- `src__AppConfig/Na__AppConfig__Main.json` — `ImageExport__PostProcessEffects` config block.
- `src__ImageExport/Na__UiFeature__ImageExport__Controls.js` — enhance toggle, pipeline integration.
- `src__ImageExport/Na__ImageExport__PostProcessEffects__*.js` — Levels, HighPassSharpen, Pipeline.

# ---------------------------------------------------------
## 10-Feb-2026 - ValeVision3D v0.0.6
### Dynamic Model Toggle System & Build Pipeline Integration

**Model Toggle Controls**
- Created `src__ModelToggle/Na__UiFeature__ModelToggle__Controls.js` module for per-category visibility toggling.
- Dynamic button generation from loaded model groups Map (category -> THREE.Group).
- User-friendly display names: "Existing Building", "Design Proposal", "Landscape".
- Pairs Mesh + Linework models per category into single toggle button.
- Active/inactive visual states with green dot indicator and line-through styling.
- Future-proof: automatically generates buttons for new categories (furniture, vegetation, context).
- Integrated as expandable dropdown menu item "Toggle Model Layers" positioned between "Export Image" and "Download Position Data".
- Panel title: "Model Parts List" displays category toggle buttons.
- Uses standard dropdown panel pattern with toggle button for consistent UI behavior.
- Panel expands/collapses dynamically matching other menu items (Adjust Camera Lens, Export Image, Download Position Data).

**Project.json Format v4**
- Introduced `valeVision_ModelUrls` array format to support multiple model URLs per project.
- Deprecated `valeVision_ModelUrl_BaseMesh` / `_Linework` (v3) format.
- Maintains backward compatibility in `Na__AppUtils__ExtractModelUrls` for all legacy formats (v1-v4).
- Cleans legacy keys when writing/updating project.json files.

**Build Automation Pipeline Updates**
- Updated `AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py`:
  - Removed version-based GLB selection (parse_glb_version, select_latest_glb_by_layer).
  - Added `__NaModel__` to `__ValeVision__` namespace rebranding in CDN URL generation.
  - Now discovers all root-level GLBs (skips `01__Archive/` subfolder).
  - **Critical fix**: Always updates model URLs in existing projects instead of skipping entirely.
  - Writes v4 `valeVision_ModelUrls` array format for all new and refreshed projects.
  - Added "Model URLs refreshed" counter and status messages to console output.
  - Fixed Unicode encoding errors in Windows console (replaced arrow and em-dash characters).
- Verified `AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__Main__.py` consistency with new naming.

**Validation & Testing**
- Successfully tested full pipeline on `2026/61721__Payne` project.
- Confirmed 6 GLB models discovered (Landscape, Existing Building, Proposed Building × 2 types each).
- Verified project.json updated with v4 format and `__ValeVision__` rebranded CDN URLs.
- Confirmed models load and render correctly in ValeVision3D viewer with new toggle controls.

# ---------------------------------------------------------


# ---------------------------------------------------------
## 10-Feb-2026 - ValeVision3D v0.0.5 
### Multi-Model Category Loading System
- New `Na__ModelLoader__MultiModel.js` module for loading multiple GLB model pairs.
- Models are now classified by ValeVision category (e.g. MainBuildingModel__Existing, LandscapeEnvironment).
- Priority-based sequential loading order matches GLB Builder tag range definitions.
- Each category gets its own THREE.Group enabling future per-category visibility toggling.
- URL parser accepts both `__ValeVision__` (preferred CDN) and `__NaModel__` (backstop) namespaces.
- Mesh and linework loading logic extracted from index.html into dedicated module.
- AppConfig modelDefaults now uses `modelUrls` array instead of separate base/linework URLs.
- Backwards-compatible project.json extraction supporting all four legacy URL formats (v1-v4).
- Cloudflare R2 sync script updated to rename `__NaModel__` to `__ValeVision__` in CDN filenames.
- R2 sync script now skips `01__Archive/` subfolder and pushes all root-level GLBs without version logic.
# ---------------------------------------------------------


# ---------------------------------------------------------
## 05-Feb-2026 - ValeVision3D v0.0.4 
### Web Project Path Fixes
- Added absolute GitHub Pages base URL for project.json fetching.
- Added year-aware and legacy project ID normalization for web loading.
- Removed hard-coded 2025 web path to prevent 404 on new year projects.
# ---------------------------------------------------------


# ---------------------------------------------------------
## 05-Feb-2026 - ValeVision3D v0.0.3 
### Normalized Navigation Controls
- Added normalized mouse wheel zoom with fixed step per tick.
- Added touch-first navigation module for iPad/mobile detection.
- Routed nav initialization through device-aware control selection.
- Added AppConfig-based navmode settings for mouse and iPad controls.
- Inverted mouse wheel zoom direction for expected scroll behavior.
- Added arrow key movement alongside WASD navigation.
- Added mouse wheel acceleration after 3 consecutive ticks for faster long-range zoom.
# ---------------------------------------------------------


# ---------------------------------------------------------
## 05-Feb-2026 - ValeVision3D v0.0.2 
### Navigation, Units, and Camera Tools Updates
- Added Dev__DeveloperMode default cube for fixed scale + pivot reference.
- Standardized config units as integer millimeters with mm-to-units helpers.
- Updated camera defaults schema and live JSON export/import panel.
- Removed bounding-box recentering logic and added orbit limits by scale.
# ---------------------------------------------------------


# ---------------------------------------------------------
## 04-Feb-2026 - ValeVision3D v0.1.0 
### Total Engine Rebuild and New Features
- Switched to a new engine architecture.
  - Previously used Babylon.js as the legacy engine for the 3D runtime.
  - Now using **Three.js** for the 3D engine.
- Refactored the old codebase to be more modular and maintainable.
# ---------------------------------------------------------