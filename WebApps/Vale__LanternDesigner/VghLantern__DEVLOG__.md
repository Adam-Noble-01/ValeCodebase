# VghLantern Development Log
# =========================================================


# ---------------------------------------------------------
## Vale__LanternDesigner v0.1.6 - 05-Aug-2026
### Per-asset 3js transform override for quick seating alignment

#### Added - `Na__Asset__3jsOveride__Transform` on component JSON
- Optional block at the end of a component asset: `X_mm` / `Y_mm` / `Z_mm`
  (Three.js world axes, Y = up). `+200` lifts 200 mm; `-200` lowers it.
- Missing block, missing keys, or zero values are ignored.
- Ball and Spire finials set to `Y_mm: 200` for initial seating nudge.

#### Added - `VghLantern__Env3d__ComponentTransformOverride__.mjs`
- Reads the override block and adds millimetre offsets after the component
  is seated on its anchor. Wired into `ComponentLoader__Glb__Build`.

# ---------------------------------------------------------
## Vale__LanternDesigner v0.1.5 - 05-Aug-2026
### The library speaks the SketchUp exporter's language, finials are chosen from pictures, and every material comes from one file

The component library now holds real exported geometry instead of hand-authored
placeholders. Two finials came out of SketchUp through the new Component Editor
Export tab - a ball and a spire - and everything downstream had to learn to read
that format.

#### Added - Unified component schema, read end to end
- The library carries `Na__Asset__Elevation2D__Front / __Right`, `Na__Asset__Plan2D__Top`,
  `Na__Asset__Mesh3D` and `Na__Asset__ObjectHierarchy3D`. The earlier
  `Na__Asset__Profile2D` format is still read, so a library part way through
  re-export keeps rendering rather than blanking out.
- **New `VghLantern__Env2d__ComponentPathRenderer__.js`** flattens a
  `Na__Geometry__Paths` list - Line, Arc, Circle, Polygon - into one SVG path
  string placed at an anchor. One path element per component, not one per
  primitive: a 157-segment spire at two ridge ends is two DOM nodes, not 314.
- **New `VghLantern__Env3d__ComponentLoader__MeshJson__.mjs`** builds a
  `THREE.BufferGeometry` from the inline mesh, with per-vertex normals and the
  Z-up to Y-up swap that matches `ConfigAccess__PointToWorld` exactly. Geometry
  is cached per asset and cloned per placement, so four identical finials cost
  one build.
- The 3D loader now prefers the inline mesh, falls back to a GLB, then to the
  placeholder. Mesh first because it arrives in the same file the 2D views come
  from, so the two environments cannot drift apart.

#### Fixed - 3D finials were never placed at all
The solver names an anchor by **where** it is (`ridgeEnd`, `apex`); the lantern
names a component by **what** goes there (`finial`). The 3D loader compared the
two directly, which silently matched nothing, so every ridge end stayed empty
while the 2D view drew finials perfectly. The two vocabularies are now joined by
an explicit map in the loader. `PlaceAtRidgeEnds` and `PlaceAtApex` are honoured
in both environments too - previously the solver's anchors were taken as final.

#### Added - The origin point is the insertion point
Every asset is authored about its `00__OriginPoint` group, so placing a
component is putting its local 0,0,0 on the anchor - in 2D and in 3D, with no
per-asset offset table. The ball finial reaches 30 mm below its origin as a
spigot that buries into the ridge, and that lands correctly with no special case.

#### Added - Finials are chosen from picture cards
- New `cards` control type in the editor: same value, same option source and the
  same "stored value is not in the current library" contract as a select, shown
  as selectable previews. Choosing a finial is a visual decision, and a list of
  product names asks the user to hold a shape in their head that the app already
  knows.
- **The previews cost nothing.** Fetching every asset to draw thumbnails would
  defeat on-demand loading entirely, so the build utility bakes each asset's
  front elevation into the index as one compact SVG path. The whole index
  including every preview is **13 kB against 3.9 MB of asset files.**

#### Added - On-demand loading with a session cache
- **New `VghLantern__AppData__ComponentAssetCache__.js`.** A unified export is
  one to three megabytes; the spire alone is 2.8 MB. Nothing is fetched until
  something asks for it, and an asset is then held for the life of the page, so
  toggling between two finials costs one fetch each, ever.
- The cache trims to a byte budget on a least-recently-used basis, with a floor
  of two entries so a single large asset cannot thrash it.
- **Memory only, deliberately.** Persisting would buy a faster second visit at
  the price of a cache-busting scheme to invalidate a re-exported asset, and
  during authoring that trade is the wrong way round. A new session re-fetches.
- The 2D renderer draws what is resident and requests what is not, then redraws
  when the asset lands. The user sees a placeholder for one frame instead of a
  stalled viewport.

#### Added - One PBR materials file
- **New `02__Src__AppModules/02__AppData/Na__PbrMaterials__Config.json`** is now
  the single source of truth for the palette and the surface response. The
  finish list migrated out of `VghLantern__AppConfig__Main__.json` and the role
  colours out of `Na__Env3d__Config.json`; both keep a migration note where the
  block used to be.
- Finishes are **Anthracite Grey (RAL 7016)**, **White Painted** and **Lead**.
  The white is a warm off white rather than a stark brilliant white, so it sits
  with painted joinery instead of fighting it.
- The first two are powder coated aluminium and carry a clear coat value, which
  promotes them to `MeshPhysicalMaterial` - a matt pigment layer under a thin
  lacquer. Lead is real metal instead: high metalness, rough broken reflection,
  no clear coat.
- The material cache is now keyed on the finish **name** rather than its colour.
  Two finishes can share a hex value and still differ in roughness or clear
  coat; keying on colour handed the second one the first one's surface.
- `AppCore__ConfigLoader` derives the old `FinishOptions` section from the new
  file at load time, so every existing consumer reads it without knowing it moved.

#### Fixed - Dark finishes read as black silhouettes
Anthracite grey came out looking almost black. The cause was that the renderer
had no environment map at all: a metalness / roughness material with nothing to
reflect gets all its brightness from direct lights, and a dark powder coat is
mostly specular response, so it collapsed to near black and read as a shape
rather than a surface. The materials were already carrying EnvMapIntensity
values with no environment to apply them to.
- **New `VghLantern__Env3d__EnvironmentMap__.mjs`** loads the same 1024p autumn
  field skydome ValeVision3D MaxEngine uses, copied into
  `01__AppAssets__VghLantern/05__AppAssets__SkyDomes/`. A lantern reviewed here
  and the same lantern dropped into a ValeVision scene are now lit by one sky.
  Decoded once through PMREMGenerator and shared by every surface.
- The studio rig is dimmed once the sky lands rather than left at full strength,
  or the two stack and every surface washes flat. The key light survives at
  reduced strength because it is what gives the glazing bars their edge.
- **The renderer had no tone mapping curve assigned**, so it was running
  NoToneMapping and clipping every specular highlight. Now set to the Khronos
  PBR Neutral curve, which rolls highlights off without the desaturation ACES
  applies - a powder coat on screen still reads as its RAL swatch.
- The base colour was left at the true RAL 7016 value. Lightening the swatch
  would have made the model look better while making the drawing, the schedule
  and the 2D preview all wrong. Brightness is controlled by the two documented
  dials instead: Environment Intensity and ToneMappingExposure, both at 1.15.
- Loading is not awaited. The viewport draws on the studio rig immediately and
  re-renders when the 1.5 MB sky arrives; a failed load warns and carries on.

#### Added - Glazing has real thickness, and every face of it is glass
The glass was a single plane. A plane has no edge to catch light where it meets
a bar and only one surface to reflect from, which is a large part of why flat
glass reads as a tinted sheet however carefully the material is tuned.
- Each glazed slope is now built as a **20 mm slab** (`GlazingThicknessMm`),
  which is about right for a sealed unit over its two panes, spacer and seals.
  It gives a visible edge at every eaves, bar and ridge junction and a second
  reflection off the back face.
- Extrusion runs **inward** from the inset plane, so the outer glass surface
  stays exactly where the old single plane sat. Changing the thickness never
  moves the visible face. Setting it to 0 falls back to the old plane.
- **Outer cap, inner cap and edge band are one buffer and all wear the glazing
  material.** An untextured reverse or edge face would read as flat grey
  wherever the frame does not cover it, which on a lantern is every eaves and
  ridge junction and the whole underside seen from indoors.
- A slab needs its winding to be right where a plane did not, because
  computeVertexNormals derives normals from winding and a reversed cap would
  light as though the sky were under the roof. The point ring is normalised to
  an outward winding once and every cap and wall is built consistently from it.
  Verified numerically rather than by eye: on a pitched quad all twelve
  triangles face outward, cap up the slope, inner cap down, four edges
  perpendicular.

#### Changed - Glass reflects harder
Opacity 0.2 to 0.3, roughness 0.03 to 0.02, EnvMapIntensity 1.0 to 1.8. Opacity
is doing more than it looks: it multiplies the whole shaded result including the
reflection, so on a near-black base it behaves as a reflection strength dial as
much as a transparency one. At 0.2 the pane read faint against bright sky.

#### Fixed - Glass read as tinted acrylic, and the drawing sheet was lit differently
Two related faults in one pass.
- **Glass is now ValeVision3D MaxEngine glass.** Ported the recipe rather than
  guessing at one: the shared DataLib entry MAT101__Glass__ClearDefault gives
  the near-white base, 0.2 opacity and double sided no-depth-write setup, and
  MaxEngine glass overrides give the rest. The move that matters is the
  brightness multiplier of 1/4096, which takes the base colour almost to black
  so the diffuse term contributes nothing and every visible thing about the pane
  is environment reflection. A pane painted flat translucent blue - which is
  what it was - reads as tinted acrylic at any opacity; a pane that is black
  plus a sharp 0.03-roughness reflection reads as glass.
- Glass carries its own envMap and envMapIntensity rather than inheriting
  scene.environment, exactly as MaxEngine does, so tuning the frame brightness
  down no longer drags the glass reflection down with it. The two are now
  independently tunable.
- **Lighting parity across all three 3D surfaces - the real cause.** The sheet
  and the 3D tab rendered markedly darker than the configurator viewport. Two
  faults, found in that order:
  1. A timing race. The sky loads asynchronously and the sheet viewport draws
     exactly once before being captured to a PNG, so it photographed itself
     before the sky arrived. Each surface now records its environment promise
     and RenderPipeline__Render awaits it before drawing.
  2. **The actual culprit: the radiance map was being shared across renderers.**
     PMREMGenerator is constructed around one WebGLRenderer and returns a render
     target living in that renderer's GL context. Every 3D surface here builds
     its own WebGLRenderer, so every surface after the first was handed a
     texture its context could not resolve - it rendered as though there were no
     environment, while its studio rig had already been dimmed on the assumption
     that there was one. Doubly dark, and only ever on the surfaces that did not
     happen to generate the map.
  Now split: the equirectangular HDR is CPU side and genuinely shareable, so it
  downloads and decodes once; the pre-filtered radiance map is built per
  renderer and held in a WeakMap so it is freed with its renderer. Filtering is
  a handful of GPU passes on an already resident image, which is the right price
  for every surface being lit.
- Glass consequently inherits scene.environment rather than carrying its own
  map, because one shared material cannot hold the right per-context texture for
  every surface. Its configured EnvMapIntensity is divided by the scene
  environment intensity when applied, so the number in config still means the
  effective reflection strength of the glass and the frame dial does not drag it
  around.
- **Anthracite lifted without touching the RAL swatch.** A finish may now declare
  an optional RenderAlbedoHex used only by the 3D material. RAL 7016 renders at
  #4A5157 while the specification and the 2D fill keep the true #383E42, because
  a swatch is a paint chip measured under studio light and a renderer wants
  diffuse albedo - the two genuinely differ, and the gap is widest on dark
  colours, which is why anthracite was the finish that looked wrong.

#### Added - GRP material for the builders kerb
The kerb was rendering as a flat tinted prism, which reads as CAD rather than as
the site work it represents. It now carries a proper GRP material - glass
reinforced plastic, the same thing that covers the kerb and any abutting flat
roof - with a light grey satin topcoat and a procedural bump so the surface is
not optically perfect.
- **New `VghLantern__Env3d__ProceduralTextures__.mjs`** generates seamless
  fractal value noise on a canvas and returns it as a THREE.CanvasTexture. No
  image file ships, so there is nothing to cache-bust when the grain is retuned.
- **Seamless by construction**: lattice lookups wrap, so the right edge
  interpolates back into the left. A tile seam repeating every few hundred
  millimetres along a kerb would read as a defect in the moulding.
- **Deterministic by construction**: the lattice is filled from a seeded
  generator rather than Math.random, so the same grain appears on every reload
  and in every exported snapshot. Two screenshots of one lantern must not differ.
- The bump repeat is expressed in tiles per world unit, and the kerb mesh is an
  ExtrudeGeometry whose UVs are already in metres, so the grain holds its true
  physical size on a 900 mm lantern and a 5 m one alike.
- The kerb declares `UsesMaterial: "Grp"` rather than carrying a colour, so
  refinishing it is one config key. `MaterialLibrary__Grp()` is exported in its
  own right for the flat roof areas that will want it later.

#### Changed - Environment lighting dialled back and fully exposed
First pass overlit the model. Every dial the environment responds to is now in
`VghLantern__Env3d__Config__Environment`, with the order of operations stated in
the block: Intensity scales the sky, four Dim factors scale the studio rig
underneath it, and ToneMappingExposure scales the final image after both.
- Environment Intensity 1.15 down to **0.55**, ToneMappingExposure 1.15 down to
  **0.95**.
- Fill and ground bounce gained their own dim factors instead of borrowing the
  ambient one, so the balance between sky and direct light is adjustable per
  light rather than in two lumps.
- Added `RotationDegrees` to spin the sun patch without touching the rig, plus
  `BackgroundIntensity` and `BackgroundBlurriness` for when the sky is used as
  the backdrop.

#### Added - Specification lists which component, not just what kind
The Components table gained a **Type** column: the Component column says what
the item is on the lantern ("Finial"), Type says which one was specified ("Ball
Finial"). No schema change was needed - the name resolves in priority order from
`Na__Asset__ValeSpec__ProductName` once the Vale spec audit fills it in, then a
hand-authored metadata name, then the file naming standard.

#### Added - The missing index builder
`60__Dev__WebBuildUtils/VghLantern__BuildUtil__ComponentDataIndex__.py` was
referenced by the library README but absent from the repo. Written and run. It
reads placement role, category and sort order from a folder-name table, because
the unified exporter leaves `ApplicableRoles` empty - SketchUp has no concept of
a lantern placement role, but the folder it lives in does.

#### Changed - Library reorganised and legacy asset retired
Folders renamed to the main component library standard
(`45__Roof__RidgeCaps`, `50__Roof__Finials`, `55__Roof__Crestings`). The legacy
hand-authored `VGH_FIN0001` ball-and-spike finial is removed, superseded by the
measured `50_1001` export; the two saved projects referencing it were migrated,
and the seed lantern now starts on the Ball Finial in Anthracite Grey.

#### Files
New: `Na__PbrMaterials__Config.json`, `VghLantern__AppData__ComponentAssetCache__.js`,
`VghLantern__Env3d__EnvironmentMap__.mjs`, `VghLantern__Env3d__ProceduralTextures__.mjs`,
`HdriSkydome__RuralLandscape__AutumnField__SunnyDay__OptimisedVersion__1024p__.hdr`
(copied from ValeVision3D),
`VghLantern__Env2d__ComponentPathRenderer__.js`,
`VghLantern__Env3d__ComponentLoader__MeshJson__.mjs`,
`VghLantern__BuildUtil__ComponentDataIndex__.py`.
Changed: `ComponentIndexLoader`, `Env2d__FinialRenderer`, `Env3d__ComponentLoader__Glb`,
`Env3d__MaterialLibrary`, `Env3d__ConfigAccess`, `AppCore__ConfigLoader`,
`LanternEditor__ControlPanel`, `LanternEditor__ControlDescriptors`,
`LanternEditor__Section__Finials`, `LanternEditor__Styles__Main.css`,
`Geometry__QuantityTakeoff`, `Na__Specification__Config.json`,
`VghLantern__AppConfig__Main__.json`, `Na__Env3d__Config.json`,
`VghLantern__App__.html`, component library README and index.


# ---------------------------------------------------------
## Vale__LanternDesigner v0.1.4 - 04-Aug-2026
### The letter is written in one box, the terms say once that they are unreviewed, and the drawing's terms cell reads properly

Review of v0.5.0 in the running app. Six changes, all of them things that only became
obvious once there was something to look at.

#### Changed - The welcome letter is one field, not six boxes
- **The paragraph cards are gone.** The letter was edited as one card per paragraph, which is writing into six little boxes rather than writing a letter: text could not be selected across a paragraph break, moving a sentence between paragraphs meant retyping it, and the shape of the thing on screen looked nothing like the shape of the thing being produced. The body is now a single field holding the whole letter.
- **It supports a small markdown subset**, and deliberately only this: `##` heading, `###` sub-heading, `---` divider, `**bold**`, `*italic*`, and a blank line for a new paragraph. Every one of those has to be drawn into a PDF by hand, so a feature that cannot be drawn on paper has no business in the editor. The grammar is printed as a legend under the box rather than hidden in a help panel.
- **New module `VghLantern__ClientDoc__MarkdownParser__.js`** is the single parse. The screen renderer wraps its runs in spans; the PDF painter draws the same runs with jsPDF. One parse, two renderers, no second interpretation to drift.
- Bold and italic in a PDF meant real work: jsPDF sets one font style per text call, so `WriteRunBlock` measures word by word in each run's own style and packs them into lines by hand. `splitTextToSize` cannot do this, because it takes one string in one style.
- **Migration.** A project already holding paragraph records has them joined with blank lines into the new body and the retired `LetterBlocks` field stripped, so a letter already written comes back word for word rather than being lost or re-seeded from the template.

#### Changed - The terms say it once
- **`{{Vale-Legal-Team-To-Confirm}}` is removed from all 44 clauses**, and the reserved-token machinery with it. Forty-four red markers made the document unreadable and buried the very point they were making.
- **One notice at the end instead**, printed in the critical red, saying the terms have not been reviewed or approved by Vale's legal advisers. It is `ReviewNoticeText` in `Na__Terms__Config.json`; setting `ReviewNoticeEnabled` to false removes both the notice and the Preview and Send warning that accompanies it. One flag, never two things to remember.
- The clauses themselves are unchanged: still 44 subject lines stating what each must cover, still awaiting Vale's wording.

#### Changed - The drawing's terms cell
- **It is a title block cell, not a box beside one.** v0.5.0 put a taller box above the strip; it now sits at the right-hand end of the strip itself, mirroring the logo cell, with the same dividing rule and the QR sized to the strip height. `SheetPdfLayout` no longer solves a rectangle for it at all - the title block keeps its full width and `SheetChrome` solves the cell inside it.
- **The copy reads properly.** Bold "Drawing Terms" over lighter, muted supporting text: "Scan the code or see your document pack for the full terms, limitations and omissions applying to this drawing." This inverts the caption-over-value rhythm of the other cells on purpose - those caption a value the reader is looking for, this one tells them to go and read something, so the instruction leads.
- The placeholder notice line under the code is gone. The placeholder status is recorded in the config note and here.

#### Fixed - The preview was not paginating
- **Flowing documents overflowed one page shell.** A 44-clause terms document ran off the bottom of the paper and kept going, so the preview showed neither where the pages break nor how many there are, which is most of what a preview is for. **This also affected the specification pages**; it had just never been long enough to notice.
- **New module `VghLantern__DocPreview__FlowPaginator__.js`** measures a flowing body and cuts it into real pages. It measures inside a copy of the actual page body, because that box is a flex column with a gap and a plain div measures differently. Blocks taller than a page are broken open recursively, so a 15-clause section splits at a clause boundary and keeps its heading and border on each page rather than overflowing.
- The on-screen footer now prints the same "Page 2 of 7" the file will, using the PDF writer's own `PageNumberFormat`. It can, because the preview finally knows how many pages there are. Pages are built first and stamped second, for the same reason the PDF writer stamps its footers last.

#### Added - The Client Doc columns are draggable
A pointer-driven splitter between the edit and preview columns, bounded to between a quarter and three quarters so neither column can be dragged to nothing. Arrow keys nudge it, because a separator that only answers a pointer is a control some people cannot reach. The position is a per-browser UI preference, so it goes to localStorage rather than onto the project file - nothing about a quotation depends on how wide someone likes their edit column.

#### Files
New: `VghLantern__ClientDoc__MarkdownParser__.js`, `VghLantern__DocPreview__FlowPaginator__.js`.
Changed: `VghLantern__ClientDoc__LetterModel__.js` (body is one string), `LetterEditor`, `LetterScreenRenderer`, `LetterPdfPainter` (run-based emphasis), `ClientDoc__Layout` (splitter), `ClientDoc__Styles`, `Na__ClientDocument__Config.json`, `DocumentTokens` (reserved token removed), `Terms__DocumentModel`, `Terms__ScreenRenderer`, `Terms__PdfPainter`, `Terms__Styles`, `Na__Terms__Config.json`, all four clause markdown files, `SheetChrome`, `SheetPdfLayout`, `Terms__QrLink`, `DocPreview__PageRenderer`, `DocIssueHandler`, `Na__DocPreview__Config.json`, `ProjectSchemaValidator` (LetterBlocks migration), `ProjectFileManager`.


# ---------------------------------------------------------
## Vale__LanternDesigner v0.1.3 - 04-Aug-2026
### Client Doc tab, a terms and conditions system with citable clause numbers, and a drawing that points at them

#### Added
- **A Client Doc tab**, between Specification and Preview and Send. Two columns: the welcome letter, the project's critical and special terms and the standard section switches on the left, a live document preview on the right. Every edit is a block card with a drag handle, a delete and, on a paragraph that came from the template, a reset. Writes are debounced and flow through `MarkDirty`, so it autosaves exactly like the job notes editor and there is no save button.
- **A welcome letter**, seeded from a template in JSON and then owned by the project. The template is materialised onto the project file the first time the tab opens it, so editing the template changes what the *next* project starts with and never rewrites a letter already sent. Per-block reset is what keeps the template useful after that.
- **A terms and conditions system** in its own `38__System__TermsAndConditions` folder: a markdown clause library, the numbering authority, a screen renderer, a PDF painter and the QR link builder.
- **`VghLantern__AppUtils__QrEncoder__.js`**, a first-party QR encoder. Byte mode, error correction M, versions 1 to 10. No new dependency, because `04__Src__Dependencies__VersionLocked` is a deliberate CDN-independent set and the app is an installable PWA that has to work offline. Verified against the published ISO/IEC 18004 format-information and version-information strings.
- **A flow paginator for the preview.** Flowing documents are now measured and cut into real pages on screen. A forty-clause terms document used to run off the bottom of one page shell and keep going, so the preview showed neither where the pages break nor how many there are.

#### Clause numbering
The rule that everything else follows: **the section number is fixed in config and never moves; the term number renumbers within its section.**

| | |
|---|---|
| Sections | 1 Critical, 2 Special, 3 General and Legal, 4 Payment, 5 Access to Site, 6 Builders Upstand |
| Format | `{section}.{term}`, term zero-padded to 2, giving `1.01`, `4.08`, `5.02` |
| Add a special term | Section 2 renumbers. Nothing else moves. |
| Switch Payment off | Document runs 1, 2, 3, 5, 6. Access is still `5.01`. |

A clause number is a citation. If Payment were section 4 on one document and section 3 on the next because Access happened to be switched off, then "clause 4.08" would mean two different things to two people holding two versions of the same quotation. That is why a switched-off section leaves a gap rather than closing one. `VghLantern__Terms__DocumentModel__.js` is the only place a number is assigned; the editor labels its cards from it, and both renderers print from it.

#### The clause library
Four markdown files under `Na__Terms__Library/`. One blank-line separated paragraph is one clause, lines starting with a chevron are editor notes, and nothing else is parsed. Adding a clause is adding a paragraph.

**The 44 clauses are subjects, not wording.** Each states what the clause must cover and ends with `{{Vale-Legal-Team-To-Confirm}}`. That token is reserved: it is never substituted, it prints in red on screen and on paper, and it raises a Preview and Send warning naming the clauses that still carry it. A warning rather than an error, so an internal draft is still previewable and exportable while the wording is written - `terms:pendingWording` moves into `BlockExportOnError` to make it blocking once the library is finished.

#### Document order
`PageOrder` is now `["welcomeLetter", "drawing", "specification", "terms"]`. **This reverses the previous default**, which put the specification before the drawing.

Toggles in Preview and Send are in two groups. The page-level switches are per-user preferences and persist to `08__LocalUserData` like every other toggle. The per-section terms switches are **document content**, so they live on the project file and are written by the Client Doc tab and this toolbar through the same call. One value, two surfaces, nothing to drift.

#### Changed - Drawing sheet
- **The notes block is gone.** It printed three standing sentences about millimetres, figured dimensions and glazing. Those are now clauses in the terms document, and a summary of three of them beside the views is worse than a pointer to all of them. `VghLantern__DrawingEditor__AnnotationLayer__.js` is deleted, along with the `Notes` rectangle in the layout solve, `BuildNotes` in the chrome, and the `Config__Annotations` block.
- **Job notes are unaffected.** They are stored on `GlobalSettings.JobNotes`, typed in the Specification tab and printed on the specification document under its existing `ShowJobNotes` toggle. Only the drawing sheet's copy of them went.
- **The titleblock gained a terms cell** at its right-hand end, mirroring the logo cell at the left. It is a titleblock cell and not a box parked beside one: same height, same label and value type sizes, same baselines, same dividing rule as every other cell. The field cells divide what is left between the two fixed cells, so they squeeze up as intended.
- The QR is drawn as a **new `Qr` chrome primitive**, not a raster. `SheetChrome` builds one primitive list and renders it to SVG and to jsPDF, so the code is vector on screen and vector in the file, and inherits that rule for free. Horizontal runs of dark modules are merged into single rectangles first, which takes a 37-module symbol from 688 marks to 375.

#### Config
- `Na__ClientDocument__Config.json` - letter template, editor limits, letter typography.
- `Na__Terms__Config.json` - the section table with its fixed numbers, the numbering format, the clause library path, terms typography, and the drawing QR block.
- `Na__DocPreview__Config.json` - new `PageOrder`, two new toggle defaults and labels, five new issue messages.
- `Na__DrawingEditor__Config.json` - `Config__Annotations` deleted whole; the four orphaned `SheetStyle` note keys replaced by a note explaining that the terms cell has no styling of its own.

**The QR address is a placeholder.** `TermsQrBaseUrl` is `http://localhost:8006/VghLantern__App__.html`, chosen so the printed code is scannable and testable today rather than dead until a client portal exists. Replacing it with the hosted Vale terms URL is the whole migration - no JS anywhere knows the address. The app reads `?doc=terms&project={code}` back at boot, opens the named project and lands on its terms, and `VghLantern__Terms__QrLink__.js` both builds that link and answers it so the two cannot drift.

**Size warning, recorded in config as `QrScanSizeNote`.** At the default 10 mm titleblock height the code prints about 8.8 mm square. The default localhost URL produces a version 5 symbol, giving a 0.24 mm module, which is below what most phone cameras resolve reliably from a printed A3 sheet. Two levers, neither of which needs code: raise `Sheet.TitleBlockHeightMm` from 10 to about 16, or shorten the base URL. The hosted address is expected to be far shorter, which on its own drops the symbol to version 2 or 3 and roughly doubles the module size.

#### Files
New: `VghLantern__AppUtils__QrEncoder__.js`, `VghLantern__AppUtils__DocumentTokens__.js`, the eight `37__System__ClientDocumentMode` modules, the seven `38__System__TermsAndConditions` modules plus four markdown clause files, `VghLantern__DocPreview__FlowPaginator__.js`.
Deleted: `VghLantern__DrawingEditor__AnnotationLayer__.js`.
Changed: `VghLantern__App__.html`, the CSS index, `ConfigLoader`, `ModeManager`, `Init`, `ProjectSchemaValidator` (new `VghLantern__ProjectFile__ClientDocument` block), `ProjectFileManager`, `SheetManager`, `SheetPdfLayout`, `SheetChrome`, `DocumentState`, `PageRenderer`, `PdfExporter`, `DocIssueHandler`, `MenuDataHandler`, the service worker (`.md` added to the network-first pattern).



# ---------------------------------------------------------
## Vale__LanternDesigner v0.1.1 - 04-Aug-2026
### One drawing renderer and one PDF writer: the Drawing Editor sheet is now the drawing everywhere

#### Fixed
- **Preview and Send drew its own version of the drawing.** It laid out its own view grid from raw config, drew its own frame boxes and caption strips at its own stroke widths and greys, and drew its own titleblock with no Vale logo and equal-width columns. That was a second description of a sheet that already had one, and the two had drifted: `VghLantern__PdfExporter__SlotRect` re-derived the grid straight from `Columns`, `Rows` and `GutterMm`, so it **ignored gutter share drags entirely and did not reserve the notes band**. Drag a gutter in the Drawing Editor and nothing moved on the Preview and Send page or in its export. The drawing page is now the composed Drawing Editor sheet, baked in whole.
- **The two surfaces baked the same views at different fidelities.** The Drawing Editor rasterised at PNG 12 px/mm; Preview and Send rasterised the identical SVG at JPEG 6 px/mm quality 0.92, which haloes thin dark linework into grey. One density and one format now, PNG at `DrawingEditor.PdfExport.RasterPixelsPerMm`.
- **`{lanternTitle}` had never resolved in a Preview and Send filename.** `PdfMetadataResolver` looked the identity block up under `VghLantern__Lantern__Identity__Config`; every project file on disk uses `Lantern__Identity__Config`. The token, and the lantern name in the PDF keywords, silently came out empty. Tokens now come from `TitleBlockRenderer__ResolveFields`, which is the resolver the titleblock printed on the drawing already uses, so a file is named from the values printed inside it.
- **A latent rotated-MediaBox bug.** jsPDF rewrites the format array when the orientation string disagrees with the dimensions: ask for landscape with `[210, 297]` and you get a 297 x 210 page. The old exporter passed a config orientation string alongside an explicit size, which happened to agree only because `DescribePage` pre-swapped the axes. The writer now derives orientation from `WidthMm >= HeightMm` for every page including overflow pages, so the two cannot contradict each other.

#### Changed
- **One PDF writer for the whole application.** `VghLantern__PdfWriter__Document__Write(pages, options)` takes an ordered list of page descriptors, each carrying its own paper size, and opens, foots and saves the file. Both routes are now descriptor lists: the Drawing Editor's Download PDF is `[drawingSheet]`, and Preview and Send is `[specification, ..., drawingSheet]`.
- **A Preview and Send document is a mixed-size PDF.** The drawing page takes the Drawing Editor's own paper, so a default project exports A4 portrait schedules followed by an A3 landscape drawing sheet in one file. Set the Drawing Editor to A1 and the drawing page is A1, with the schedules still A4. Per-page paper meta is a property of the descriptor, so a future Terms and Conditions page is a descriptor away.
- **One HTML sheet builder.** `SheetSurface__BuildHtml` builds the sheet for the Drawing Editor (empty frames it mounts live views into, gutter handles armed) and for Preview and Send (composed views baked in, inert). Same layout, same chrome overlay, same frame rectangles.
- **One view framing function.** `SheetSurface__FrameViewMarkup` rewrites a serialised view's viewBox to span exactly (body rectangle x denominator) of model space. The screen preview and the PDF rasteriser both call it, so a view shows the same model window on the sheet, in the preview and in the file. It also sizes the SVG explicitly, which detaches a static preview from the Env2d stylesheet that was still styling it as a live pannable viewport, grab cursor and all.
- **The four Preview and Send view toggles are now one Drawing Sheet toggle.** With the sheet baked whole, switching one view off would leave a hole in a fixed 2x2 grid rather than reflowing it. Which views appear is decided where the sheet is composed. A user file written before this still carries the four old keys; they are simply not read, and `ShowDrawingSheet` falls back to its config default, so an old file heals itself on the first toggle.
- **No footer on a drawing sheet page.** The titleblock is the sheet's identification, and a running footer printed against the drawing border reads as a defect. Numbering still counts every physical page, so "Page 3 of 5" on the document pages stays truthful. The on-screen preview reads the same footer block the writer stamps from, so what is previewed is what is written.
- The paper selector is labelled **Document Paper**, because it now sizes the specification pages only.

#### Removed
- `VghLantern__DrawingEditor__ViewportFrame__.js` - the frame markup moved into `SheetSurface` and the sheet size table into `SheetPdfLayout`, which is the module that solves every other paper rectangle. Nothing was left.
- `VghLantern__DocPreview__PdfMetadataResolver__.js` - merged into `VghLantern__PdfWriter__Metadata`, so there is one filename sanitiser rather than two with identical regexes.
- The drawing half of `DocPreview__PdfExporter` (`SlotRect`, `DrawViewSlot`, `DrawTitleBlock`, `RenderDrawingPage`, `RasteriseSvg`, `LoadSvgImage`, `StampFooters`) and the drawing half of `DocPreview__PageRenderer` (`ResolvePrintedSlots`, `BuildViewFrame`, `BuildDrawingBody`).
- `TitleBlockRenderer__BuildMarkup` / `__Render` / `__BuildLogoCell` / `__BuildFieldCell` and `AnnotationLayer__BuildMarkup` / `__Render` - the HTML titleblock and notes block that only Preview and Send used. Both modules keep the part that was always shared: what the values are.
- 170 lines of `DocPreview` CSS: the view grid, view frames, view labels, the titleblock host and every `.VghLantern__Sheet__TitleBlock*` and `.VghLantern__Sheet__Notes*` rule. The sheet arrives styled by the Drawing Editor stylesheet.
- Verified-dead exports: `ScaleManager__ModelMmToPaperMm`, `ScaleManager__PaperMmToModelMm`, `SheetPdfLayout__MeasureNotesBand`, `SheetPdfLayout__PageSize`, `DocumentState__ResetToDefaults`, `ViewportFrame__SlotAttribute`, and `SheetChrome__Build` / `__MeasureTextMm` / `__Style` demoted to internal.
- `SheetChrome__Style`'s fallback to a duplicate set of colours and stroke widths under `PdfExport`, and those five config keys. A colour could be changed in `SheetStyle`, the obvious place, and silently overridden from the other block.

#### Config
- **New** `02__Src__AppModules/45__System__PdfDocumentWriter/Na__PdfWriter__Config.json`, ConfigLoader section `PdfWriter`. Holds the document unit and compression, the footer (text, format, type size, insets, colour, and `SkipOnPageKinds` which is how a drawing sheet opts out), and the writer's failure messages.
- `Na__DocPreview__Config.json`: `DrawingSheetOrientation`, `JpegQuality` and `RasterPixelsPerMm` removed, along with `FooterText`, `ShowPageNumbers` and `PageNumberFormat` which now live in the writer config. The four `DefaultShow<view>` toggles collapse to `DefaultShowDrawingSheet`. Six values the old exporter hardcoded in JS are now keys: `LineSpacing`, `TableCellPaddingMm`, `SectionGapMm`, `FooterReserveMm`, `HeadingColour`, `BodyTextColour` and `UserWarningColour`. Added `DocumentAuthor` and `PaperSizeLabel`.
- `VghLantern__AppData__UserMenuConfig__Defaults__.json`: the four drawing-view keys replaced by `...__ShowDrawingSheet`.
- The export refusals now read `EmptySelectionMessage` and `NoDrawingSheetMessage` out of the existing `Config__Issues` block rather than carrying their own JS copies of that copy. The banner above the toolbar and the toast that refuses the export therefore say the same thing in the same words, and changing either is one JSON edit.

#### Files
- **New** `45__System__PdfDocumentWriter/` - `Na__PdfWriter__Config.json`, `VghLantern__PdfWriter__Document__.js`, `VghLantern__PdfWriter__Metadata__.js`
- **New** `VghLantern__DrawingEditor__SheetSurface__.js` - the one HTML sheet builder and the shared view framing
- **New** `VghLantern__DrawingEditor__SheetPdfPainter__.js` - the one drawing sheet PDF painter
- **New** `VghLantern__DocPreview__SpecificationPdfPainter__.js` - the flowing specification pages, moved out of the exporter
**Reshaped, with before and after:**

| File | Before | After |
|---|---:|---:|
| `VghLantern__DocPreview__PdfExporter__.js` | 722 | 198 |
| `VghLantern__DocPreview__PageRenderer__.js` | 536 | 500 |
| `VghLantern__DocPreview__Styles__Main__.css` | 555 | 385 |
| `VghLantern__DrawingEditor__SheetPdfExporter__.js` | 423 | 99 |
| `VghLantern__DrawingEditor__SheetManager__.js` | 1304 | 1172 |
| `VghLantern__DrawingEditor__TitleBlockRenderer__.js` | 257 | 143 |
| `VghLantern__DrawingEditor__AnnotationLayer__.js` | 197 | 144 |

`PageRenderer` barely moves on line count but changes character entirely: the drawing page went from ~110 lines of its own grid, frames and titleblock host to one call into `SheetSurface`, and the room went into the two page shells and the shared footer.

**Also touched:** `VghLantern__DrawingEditor__SheetPdfLayout__.js` (owns the sheet size table now), `VghLantern__DrawingEditor__SheetChrome__.js`, `VghLantern__DrawingEditor__ViewPlacement__.js`, `VghLantern__DrawingEditor__ScaleManager__.js`, `VghLantern__DocPreview__DocumentState__.js`, `VghLantern__DocPreview__MenuDataHandler__.js`, `VghLantern__AppCore__ConfigLoader__.js` (`PdfWriter` overlay and section accessor), `VghLantern__App__.html` (script manifest), `Na__ServiceWorker__VghLantern.js` (cache token to `2026-08-04-1`).

#### Verification
Static only - the app was not run as part of this change. Checked: every JS file parses, every JSON config parses, all 97 script tags in `VghLantern__App__.html` resolve to files on disk, every module in the three touched folders is loaded by the app, no dangling reference to any removed function survives anywhere in the tree, and no module still reads a config key this entry deleted.

#### Known limitations
- **Browser Print cannot honour mixed page sizes.** `window.print()` applies one paper size to the whole job, so a document whose drawing sheet is A3 while its schedules are A4 prints the drawing scaled to the chosen paper. This is pre-existing and unchanged. Export PDF is the route that keeps each page on its own paper at true size.
- **Three version numbers disagree** and this entry did not change any of them: the DEVLOG runs a `v0.0.x` series, `VghLantern__Application__Config__AppVersion` says `0.4.0`, and recent commit subjects say `v0.4.7`.


# ---------------------------------------------------------
## Vale__LanternDesigner v0.0.18 - 31-Jul-2026
### A new project is created with its first roof lantern already in it

#### Fixed
- **A brand new project opened on an empty configurator.** `BuildNewProjectData` created the project with an empty lantern schedule, and the editor only selects a lantern when the schedule holds one (`EnsureLanternSelected` returns early on a zero length array), so `currentLanternIndex` stayed at `-1` and the control panel rendered its "nothing selected" state. The project looked broken on the way in and only came good after a reload and a reopen. Creating a project now seeds Lantern 1 with it, so the configurator is populated the moment the New Project modal closes.

#### Changed
- The seed lantern is **3000 x 2000 mm**, and every other value on it matches the Glebe House lantern: Hipped Ridge at 22.5 degrees, 25 mm eaves projection, 390 mm target bar spacing on `PRF_GLB0001`, `PRF_RDG0001` ridge and `PRF_HIP0001` hips, `VGH_FIN0001` finials on `VGH_FIN0101` bases at the ridge ends, a 150 mm builders upstand at 110 mm wall with a 75 mm base frame, and Vale Painted Hardwood in RAL 7016 Anthracite Grey with Double Glazed Laminate Over, clear. A new project therefore starts on a real, buildable Vale lantern rather than on schema defaults.
- The seed is written in the **project file's own lantern schema** and merged block for block over `BuildDefaultLantern`, so it is always a fully formed lantern block, any key left out of the template keeps its schema default, and the identity Id stays generated per lantern rather than copied from config.

#### Config
`VghLantern__AppConfig__Main__.json` -> new `VghLantern__NewProject__SeedLantern__Config` block: `SeedLanternOnCreate` (true) switches seeding on, `LanternTemplate` holds the lantern itself. This is the only place the seed values exist; changing what a new project starts as is a JSON edit. Reachable as ConfigLoader section `NewProjectSeed`.

#### Files
- `VghLantern__AppConfig__Main__.json` - seed lantern block
- `VghLantern__AppData__ProjectFileManager__.js` - `BuildSeedLanterns` and `ApplySeedTemplate`, called from `BuildNewProjectData`
- `VghLantern__AppCore__ConfigLoader__.js` - `NewProjectSeed` section accessor


# ---------------------------------------------------------
## Vale__LanternDesigner v0.0.17 - 31-Jul-2026
### Pitch annotation measured from the eaves corner, with real terminators and sheet-consistent text

#### Fixed
- **The pitch angle was drawn from the middle of the hip.** The vertex sat at the hip midpoint, so the arc and the value floated halfway up the slope with the angle's horizontal leg hanging in mid-air over the glazing. A pitch is the angle between the eaves and the rafter, and it exists at the corner where the hip springs. The vertex now sits on that corner in every elevation.
- **The terminator ticks were invisible because they were drawn along the arc.** The tick direction was taken as perpendicular to the *radius*, which is the arc's own tangent - so each "tick" simply extended the arc by 60 mm and no terminator appeared at either crossing. The Vale terminator is a 45 degree slash **across** the dimension line, and on an angular dimension the dimension line is the arc, so the tick now sits at 45 degrees to the local tangent. Same glyph as a linear dimension, rotated to suit.
- **The arc was a fixed 960 mm regardless of the lantern.** One hardcoded radius had to serve a 1200 mm hip and a 4000 mm one, so it overwhelmed small hip triangles and looked lost on large ones. Radius is now a fraction of the hip's drawn length in the active view (`AngleArcRadiusFactorOfHip`, 0.42), between JSON-owned min and max rails that exist only for legibility at 1:50.
- **The bisector was computed as `atan2(slope) / 2`, which is only right when the slope rises to the right.** On a mirrored silhouette that put the label roughly beneath the vertex rather than inside the wedge. The bisector is now taken between the two legs properly, so both hands work.

#### Changed
- **The pitch value is sized from the sheet, not from the geometry.** It was a fixed 115 mm against 85 mm dimension text, so it already read as oversized; sizing it off the available wedge instead made that worse, pushing it to 160 mm on a 3000 mm elevation. A value that scales with the lantern shouts on a big one and whispers on a small one when every other number on the sheet is one height. It now takes `TextFontSizeMm` x 0.95 (81 mm) and is only ever allowed to **shrink** from there, never grow, and never below 0.70x.
- **Space for the label is found by moving it, not by resizing it.** The wedge widens with distance from the corner, so on a shallow pitch or a small lantern the value slides out along the bisector to where the room is, capped at `AngleTextMaxStationFactorOfHip` (0.82) of the hip run so it can never drift past the ridge. Only if the capped station still cannot clear it does the text shrink. In practice it holds full size down to about 12 degrees and down to a 1500 x 900 lantern.
- **Terminator ticks are the sheet's tick length**, off `TerminatorLengthMm` rather than a fraction of the arc, so angular and linear dimensions carry the same terminator at the same size.
- **The horizontal leg is no longer stroked by default.** With the vertex on the eaves, that leg *is* the eaves line, already drawn - the witness stroke only painted annotation red over black. `AngleShowBaselineLeg` (default `false`) restores it for any sheet that wants the leg restated.

#### Config
Replaces `AngleArcRadiusMm`, `AngleTextFontSizeMm`, `AngleTextOffsetFromSlopeMm` and `AngleTickLengthMm`, which were absolute millimetre values that could not scale. `Na__Env2d__Config.json` -> `AngleArcRadiusFactorOfHip` (0.42), `AngleArcRadiusMinMm` (160), `AngleArcRadiusMaxMm` (900), `AngleTextSizeFactorOfDimensionText` (0.95), `AngleTextSizeMinFactorOfDimensionText` (0.70), `AngleTextHeightFactorOfWedge` (0.55), `AngleTextOffsetFactorOfRadius` (0.12), `AngleTextMaxStationFactorOfHip` (0.82), `AngleTickLengthFactorOfTerminator` (1.0), `AngleShowBaselineLeg` (false). `AngleBaselineOverrunFactor` (1.15) is unchanged and now only applies when the leg is switched on.

#### Files
- `VghLantern__Env2d__DimensionRenderer__.js` - vertex at the springing point, oblique terminator ticks, sheet-sized label, slide-not-shrink placement, bisector fix
- `Na__Env2d__Config.json` - angle block replaced with factors tied to the sheet's own text and tick sizes


# ---------------------------------------------------------
## Vale__LanternDesigner v0.0.16 - 31-Jul-2026
### Working datum is now the top of the builders upstand, and the key reports levels

#### Changed
- **The setting-out datum is the top of the builders upstand, and it is zero.** Every reported level is now signed from it. On a 150 mm upstand with a 75 mm base frame:

| Level | From datum |
|---|---|
| Ridge | `+544.7 mm` |
| Top of framework at eaves | `+75 mm` |
| **Top of builders upstand** | **`0 mm`** |
| Top of roof deck | `-150 mm` |
| Glazing plane (sloped) | `+75 to +544.7 mm` |

  The solver keeps working in a model space whose zero is the roof deck, because that is where it builds upward from. That is an implementation origin, not a working one. On site the top of the upstand is the surface Vale's framework lands on - the last thing built by others, the first thing Vale touches - so it is the level a fitter measures from and a saw is set to.

- **Nothing moved.** Geometry keeps its solver coordinates exactly; only the reported levels changed frame. Every datum now carries **both** `LevelMm` (solver coordinates, so the checks still compare against what the solver actually publishes) and `RelativeLevelMm` (working coordinates, for reading). All 14 datum checks still pass unchanged.
- Datum rows in the key are **ordered highest first**, so the block reads as a level schedule rather than in build order. The zero row is weighted to read as the reference it is.
- A sloped datum has no single level, so the glazing plane reports the **range** it spans rather than nothing.
- `Deck Datum` relabelled **`Top of Roof Deck`**, matching how the level is described on site.

#### Fixed
- **The right-hand column of the key was reporting stamped dash segments, which is meaningless and looked like a measurement.** A dashed datum is cut into hundreds of dashes, so "Top of Builders Upstand Datum ... 743" was counting dashes. The column now reports what the row is actually about: a datum reports its level in mm, a construction triangle reports how many of that triangle exist, a centreline reports how many members it traces.

#### Files
- `VghLantern__Geometry__SettingOutModel__.js` - datum origin, relative levels and ranges, level ordering
- `VghLantern__Env3d__SetOut__Builder__.mjs` - manifest carries levels and instance counts instead of segment counts
- `VghLantern__Viewport3d__SetOutLegend__.js`, `VghLantern__Viewport3d__Styles__Main__.css`, `Na__Env3d__Config.json`


# ---------------------------------------------------------
## Vale__LanternDesigner v0.0.15 - 31-Jul-2026
### Setting Out key moved to the top right and enlarged for reading at distance

#### Changed
- **Setting Out key** repositioned from bottom left to **top right**, diagonally opposite the Display and Views controls. As well as separating the two panels, this keeps the key clear of the hover readout, which follows the cursor over the model and could previously land on top of it.
- Panel widened 320px to **400px**, capped at `34vw` so it never eats the viewport on a narrow window.
- Max height now runs the full viewport less the top and bottom margin rather than 55%, so all thirteen line classes plus the datum checks fit without scrolling on a normal screen.
- Body text raised from Small to **Standard** (12px to 14px at the 0.9 UI scale). Row padding and section gaps roughly doubled. The key is read while comparing a colour against linework several metres away in the model, not skimmed.
- Colour swatches widened 34px to **52px**, stroke 2.5 to 3.

#### Fixed
- The swatch `viewBox` was `0 0 34 8` and had to be re-proportioned to `0 0 52 10` alongside the CSS box. Widening the box alone would have letterboxed the line rather than filling the wider column, because the default `preserveAspectRatio` centres and fits. Dash arrays lengthened to suit; dash-dot in particular needed the extra room to still read as dash-dot rather than as two dashes.

#### Confirmed working
First run against a real lantern reports **14 of 14 datum checks agreeing within 0.5 mm**, with all thirteen line classes drawing and the hover readout still resolving individual glazing panels while in Setting Out mode.

#### Files
- `VghLantern__Viewport3d__Styles__Main__.css`, `VghLantern__Viewport3d__SetOutLegend__.js`


# ---------------------------------------------------------
## Vale__LanternDesigner v0.0.14 - 31-Jul-2026
### Setting Out mode: see the datums and construction triangles the factory cuts to

#### Added
- **Display toggle** in the 3D View overlay, three states: **Model** (as before), **Model + Setting Out** (the model ghosted with the linework over it), **Setting Out** (linework alone).
- **Construction and datum linework** drawn as screen-thick coloured lines, to the stated key:
  - Glaze bar centre lines - **purple, solid**
  - Roof and hip-end construction triangles - **yellow, dotted**
  - Hip construction triangles - **green, dotted**
  - Ridge datum - **red, dash-dot**
  - Top of builders upstand / top of framework at eaves / deck / glazing plane datums - own hues, dash-dot and dashed
- **Setting Out key** panel, bottom left, built from what was *actually drawn* rather than a hardcoded list, so a line class switched off in config leaves the key by itself.
- **Datum checks.** Every level and triangle is drawn from real solved member end points, then compared against the scalar the solver publishes for it. Disagreements are listed on screen with the delta. This is what makes the mode an audit of the engine rather than a picture of it.

#### The naming rationalisation
Three classes of geometry had all been called some variant of "line", "geometry" or "skeleton". They are now named apart and cannot be confused:

| Class | Means | Wrong means |
|---|---|---|
| `Solid3d` | mesh geometry the user sees and a snapshot captures | a bad-looking render |
| `Construction` | the derivation triangles - run, rise, hypotenuse | a datum lands in the wrong place |
| `Datum` | a named level or plane the factory sets to | wrong metal |
| `Centreline` | a member axis; where construction becomes solid | a profile registers to the wrong line |

Entity keys are three stage, same delimiter style as the config JSON: `<Class>__<Family>__<Item>` - `Datum__Upstand__TopLevel`, `Construction__Roof__PitchTriangle`, `Centreline__GlazeBar__Set`.

**The naming IS the styling.** A line's appearance is looked up by `<Class>__<Family>`, composed from the entity's own fields. There is no mapping table between geometry and appearance to drift, and adding a datum family plus a config style is the whole of adding a line class.

#### Scene groups renamed and centralised
`skeleton` / `glazing` / `components` / `highlight` became `solid3d__frame` / `solid3d__glazing` / `solid3d__components` / `overlay__highlight`, plus the new `setOut__lines`. The old name `skeleton` held **every solid mesh in the model** while reading as though it held setting-out linework - the exact confusion this release resolves.

The names and the meaningful *sets* of them are now exported from SceneManager. Four separate lists previously spelled these as literals (the stack, the rebuild clear, the hover picker's raycast roots, the highlight layer's ghosting sweep) and forgetting any one failed silently.

#### Why dash patterns are stamped into geometry
The vendored `LineMaterial` dash mode was rejected on four specific grounds: it cannot draw dash-dot at all (one dash length, one gap); dash phase accumulates across disjoint segments in one buffer; dashed lines lose their end caps; and the vendor source carries an unresolved defect note on its dash handling. Patterns are instead cut into discrete segments in real millimetres, so every line type is ordinary solid geometry with caps intact and no phase management. Lengths being in model mm means they scale with the lantern, as drawn linework does.

#### Files - new
- `04__MathUtils__LanternGeometry/VghLantern__Geometry__SettingOutModel__.js` - the published datums, triangles, centrelines and checks. **Additive**: renames nothing, changes no existing published number.
- `06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__SetOut__DashStamp__.mjs` - line types cut into segments
- `06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__SetOut__LineFactory__.mjs` - the only place the fat-line addon is touched
- `06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__SetOut__Builder__.mjs` - model to linework
- `06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__DisplayMode__.mjs` - the three-state mode
- `25__System__Viewport3dMode/VghLantern__Viewport3d__SetOutLegend__.js` - key and check results

#### Files - changed
- `VghLantern__Env3d__SceneManager__.mjs` - group vocabulary exported, `setOut__lines` group added
- `VghLantern__Env3d__RenderPipeline__.mjs` - builds setting out alongside the solid model; display mode API; snapshot guard
- `VghLantern__Env3d__PickIndex__.mjs`, `__HighlightLayer__.mjs` - consume the shared group sets
- `VghLantern__Viewport3d__Controls__.js`, `__Layout__.js`, `__Styles__Main__.css`, `VghLantern__App__.html`, `VghLantern__Env3d__ConfigAccess__.mjs`

#### Config
- `Na__Env3d__Config.json` → new `VghLantern__Env3d__Config__SetOut`: master switch, per-class gates, check tolerance, depth test, the four named dash patterns in mm, and all thirteen line styles.
- `DedicatedViewportMode` → `ShowDisplayModeToggle`.

#### Drawing safety
Setting out is **never** captured into a snapshot. `BeginCapture` forces the surface to Model mode and restores after, because the Drawing Editor prefers the live 3D View surface for its sheet viewports.

#### Two defects this surfaced, neither fixed here
1. **`Meta.HipLengthMm` and `HipAngleDegrees` are wrong on a rectangular Pyramid.** `RoofPitchCalculator` hardcodes the hip run as `HipRun(shortRun, shortRun)`, valid only when the hip's two plan components are equal. A Pyramid forces `ridgeHalfLength = 0`, so the true components are `(eavesHalfLong, eavesHalfShort)`. At 2400 x 1600, 25 degrees that is a **295.69 mm error**. Cut lists are safe because `QuantityTakeoff` sums real member lengths, but any annotation quoting `Meta.HipLengthMm` is wrong. **The new Hip length check catches this on screen.** Left unfixed because correcting it changes published numbers on drawings already issued.
2. **2D and 3D place a profile cross-section differently.** 3D lands outline `(0,0)` on the centreline with the section above it; 2D discards the outline entirely and draws a symmetric band of the section's *width* straddling the line. They agree only in plan and only for an x-symmetric outline. Masked today because `ProfileTrace.Enabled` is false. Relevant directly to adding real authored profiles - see the profile origin note below.

#### Note for authoring real profiles
The convention "y = 0 is the registration line, section lives in +Y" is asserted only in prose in each asset's `OriginNote` and demonstrated only by the fallback rectangle. **Nothing validates or normalises it.** A section authored with y centred (say -55 to +55) will sweep half its depth below the centreline silently, and will not change the 2D view at all. Also: `ProfileSweep` reads only lowercase `x`/`y`, while the Component Index preview accepts `X_mm`/`Y_mm` - a profile exported with the capitalised keys previews correctly and then sweeps to NaN.



# ---------------------------------------------------------
## Vale__LanternDesigner v0.0.13 - 31-Jul-2026
### Pitch arc size is JSON-owned, and local config fetches never cache

#### Fixed
- Pitch angle arc radius is controlled only by `Na__Env2d__Config.json` → `AngleArcRadiusMm` (960). The JS no longer invents a fallback radius and no longer clamps against hip length, so the JSON value is what you see.
- Baseline overrun factor moved out of JS (`1.15` magic number) into `AngleBaselineOverrunFactor` in the same JSON block.
- ConfigLoader now fetches every JSON file with `cache: 'no-store'`, and the local Flask/stdlib server sets `Cache-Control: no-store` on all responses. Stale browser-cached config was the main reason arc-size edits looked like they did nothing.

#### Philosophy (enforced)
- Tunable numbers live in JSON. JS reads via `ConfigLoader.RequireNumber` / `RequireString` / `RequireBoolean` and must not hardcode a parallel default for any key that belongs in config.

#### Config
- `Na__Env2d__Config.json` → `AngleArcRadiusMm` (960), `AngleTickLengthMm` (70), `AngleTextFontSizeMm` (115), `AngleTextOffsetFromSlopeMm` (80), `AngleBaselineOverrunFactor` (1.15).

#### Files
- `Na__Env2d__Config.json`, `VghLantern__Env2d__DimensionRenderer__.js`, `VghLantern__AppCore__ConfigLoader__.js`, `VghLantern__FlaskServer__Localhost__.py`


# ---------------------------------------------------------
## Vale__LanternDesigner v0.0.12 - 31-Jul-2026
### Lantern Info: naming + delete, and staff Warnings & Comments

#### Added
- **Lantern Info** section (new, open by default) on every lantern tab:
  - **Lantern Name** field overrides the sequential "Lantern 1" / "Lantern 2" label used on the tab strip, the Specification schedule and every downstream document. Leaving it blank restores the sequential label rather than printing an empty name.
  - **Delete Lantern** button under a "Danger Zone" heading. Only rendered when the project holds more than one lantern - a project must always keep at least one - and routes through a confirmation modal before Layout splices the lantern out and re-selects a neighbour.
- **Warnings and Comments** section with two free-text fields:
  - **Warning (appears on documents)** - printed in red on the Specification document (on-screen, Preview and Send, and the exported PDF) for anything the automatic manufacturability checks cannot catch, e.g. a site access or delivery constraint. Also surfaces as a red "Document Warning" badge in the live editor warnings strip, ranked above the automatic checks because a human flagged it - but it never blocks issue, since the app cannot judge free text.
  - **General Comments (internal only)** - staff coordination notes that are never printed on any document.
- Shared `VghLantern__AppCore__ConfirmModal__` module wrapping the existing `#VghLantern__Modal__Root` overlay behind a single `Show({ Title, Message, ConfirmLabel, Danger, OnConfirm })` call, so new destructive actions do not need to hand-roll modal wiring.
- Three new control-panel primitives so section builders are no longer limited to sliders/dropdowns: `text` (single-line, debounced commit), `textarea` (multi-line, debounced commit) and `button` (optional `VisibleWhen` + `Confirm`).

#### Why the text controls needed a debounced commit path
Every other control commits on `change` and lets ControlPanel do a full structural re-render, because a slider or dropdown only fires occasionally. A textarea firing that same re-render on every keystroke would drop focus mid-word. `CommitValue` now excludes `text`/`textarea` from its "structural" check, and input on those roles queues a debounced commit (`TextCommitDebounceMs` in `Na__LanternEditor__Config.json`) flushed early on `focusout`, matching the existing pattern in `VghLantern__Specification__JobNotes__.js`.

#### Changed
- `Na__LanternEditor__Warnings__.json` gains a `userWarning` severity (Rank 4, `BlocksIssue: false`, label "Document Warning") - ranked above the rule-based severities since a person wrote it, but never gates issue the way `error` does.
- Project schema now normalises a `Lantern__Notes__Config` block (`DocumentWarning`, `InternalComments`) on every lantern, old and new.
- Specification `DocumentModel` carries a `DocumentWarning` per lantern entry and a document-level `UserWarnings` list (`"Title: message"`, same shape as the existing rule-based `Warnings`). All three Specification surfaces - the on-screen ScheduleRenderer, the Preview/Send print-faithful renderer, and the PdfExporter - print `UserWarnings` in red immediately above the existing orange rule-based warnings, so the human-flagged note reads first.
- `PdfExporter__WriteHeading` / `WriteParagraph` take an optional `colorRgb` override (defaults unchanged) so the PDF's new "Document Warnings" block can print red without a parallel set of drawing helpers.

#### Files - new
- `VghLantern__AppCore__ConfirmModal__.js`
- `VghLantern__LanternEditor__Section__LanternInfo__.js`
- `VghLantern__LanternEditor__Section__WarningsAndComments__.js`

#### Files - changed
- `VghLantern__AppUtils__ProjectSchemaValidator__.js` - `Lantern__Notes__Config` normalisation
- `VghLantern__LanternEditor__ControlDescriptors__.js` - `text` / `textarea` / `button` types, new section registrations
- `VghLantern__LanternEditor__ControlPanel__.js` - text/textarea/button rendering, debounced commit, action button + Confirm wiring
- `Na__LanternEditor__Config.json` - `TextCommitDebounceMs`, `lanternInfo` and `warningsAndComments` sections
- `VghLantern__LanternEditor__Layout__.js` - `DeleteLantern`
- `Na__LanternEditor__Warnings__.json`, `VghLantern__LanternEditor__WarningSystem__.js` - `userWarning` severity and collector
- `VghLantern__LanternEditor__Styles__Main__.css` - text input / textarea / button (incl. danger variant) / user-warning badge styles
- `VghLantern__Specification__DocumentModel__.js` - `DocumentWarning` field, `CollectUserWarnings`, `UserWarnings`
- `VghLantern__Specification__ScheduleRenderer__.js`, `VghLantern__Specification__SectionManager__.js`, `VghLantern__Specification__Styles__Main__.css` - `BuildUserWarnings` and red on-screen styling
- `VghLantern__DocPreview__PrintDocumentRenderer__.js`, `VghLantern__DocPreview__Styles__Main__.css` - `BuildUserWarnings`, red heading modifier
- `VghLantern__DocPreview__PdfExporter__.js` - colour param on `WriteHeading` / `WriteParagraph`, Document Warnings block
- `VghLantern__App__.html` - new script tags


# ---------------------------------------------------------
## Vale__LanternDesigner v0.0.11 - 31-Jul-2026
### Local dev server: HTTP/1.1 keep-alive stops ERR_NO_BUFFER_SPACE on load

#### Fixed
- Chrome intermittently failed a random `<script>` request on startup with `net::ERR_NO_BUFFER_SPACE`. The app boots via ~90 individual `<script>` tags, and the dev server's request handler never set `protocol_version`, so it defaulted to HTTP/1.0 and opened + closed a brand-new TCP socket for every single file. That rapid socket churn exhausts Windows' socket buffer space; whichever request lost the race got reported as a network error even though the file itself was never missing or broken.
- `Na__Server__RequestHandler` now sets `protocol_version = "HTTP/1.1"`, so the browser reuses a handful of persistent connections for the whole page load instead of opening one per file. Every response path already sent `Content-Length` (required for safe keep-alive framing), so no other handler logic needed to change.
- `do_OPTIONS` now sends an explicit `Content-Length: 0` on its 204 response, removing any ambiguity for keep-alive clients.

#### Changed
- Listen backlog raised via a new `Na__Server__HttpServer(ThreadingHTTPServer)` subclass (`request_queue_size = 128`), giving the initial page-load burst of concurrent connections more headroom.

#### Verified
- Restarted the local server and fired all ~90 script/style requests from `VghLantern__App__.html` concurrently (`curl --parallel`) - all returned `200`. A sequential multi-request `curl` trace confirmed a single TCP connection now serves multiple files instead of one connection per file.

#### Files
- `VghLantern__FlaskServer__Localhost__.py`


# ---------------------------------------------------------
## Vale__LanternDesigner v0.0.10 - 31-Jul-2026
### 3D View: hover to isolate and inspect any object in the model

#### Added
- **Hover inspection** in the 3D View tab. Moving the cursor over the model picks out the single object beneath it and reads the rest of the lantern back, so the thing under the cursor is unmistakable while the model around it still reads as a lantern.
- Three shading tiers: the **instance** under the cursor in full accent, its **siblings** (every other member of the same role) in a mid accent, and **everything else** ghosted.
- A **cursor-following readout panel** naming the object and listing its figures: member id, length, slope, instances in the model, total length, profile name and id, section size, material and finish. Glazing panels report slope, gross area, pitch, panel count, total gross area, glazing spec and tint. The base assembly reports height, wall thickness, outer size, reveal and perimeter. Placed components report anchor, asset, overall height and whether what is drawn is the authored GLB or the placeholder.
- **Click to pin.** A pin locks both highlight and panel so the model can be orbited right around a member while its figures stay on screen. Click it again, click empty space, or press Escape to release. A press that travels past the click tolerance is an orbit drag and never pins.

#### Why it needed new plumbing
The mesh builders merge every member of a role into **one** mesh - that is what keeps a sixty bar lantern at one draw call - so a raycast against it reports *the glazing bars*, not *bar 7*. Each merged mesh now carries a table of which triangle span belongs to which solver record, binary searched at pick time. The instance highlight is sliced straight out of that same buffer rather than re-swept, so it matches what is on screen to the vertex and needs no async profile load.

#### Files - new
- `06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__PickIndex__.mjs` - span tables and hit resolution
- `06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__InspectStats__.mjs` - naming and figures, composed at hover time from live config
- `06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__HighlightLayer__.mjs` - the three shading tiers
- `06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__HoverInspector__.mjs` - pointer, raycast and pin controller
- `25__System__Viewport3dMode/VghLantern__Viewport3d__InspectorPanel__.js` - the DOM readout

#### Files - changed
- `VghLantern__Env3d__RenderPipeline__.mjs` - AttachInspector / DetachInspector / ClearInspector on the public surface; holds the last skeleton and lantern per surface
- `VghLantern__Env3d__SceneManager__.mjs` - new `highlight` group in the fixed stack, cleared with the model
- `VghLantern__Env3d__MeshBuilder__ProfileSweep__.mjs` - the merge now reports the triangle span each member occupies
- `VghLantern__Env3d__MeshBuilder__Skeleton__.mjs`, `__Glazing__.mjs`, `__BuildersUpstandBox__.mjs`, `VghLantern__Env3d__ComponentLoader__Glb__.mjs` - register pick tables
- `VghLantern__Env3d__MaterialLibrary__.mjs` - six cached inspector materials
- `VghLantern__Viewport3d__Layout__.js`, `VghLantern__Viewport3d__Styles__Main__.css`, `VghLantern__App__.html`

#### Config
- `Na__Env3d__Config.json` → new `VghLantern__Env3d__Config__HoverInspector` block: master switch, a per-category pick gate (members / glazing / base / components), pin behaviour and tolerances, cursor offset, and every tier colour.
- `VghLantern__Env3d__Config__DedicatedViewportMode` → `ShowHoverInspector`. The 3D View opts in; the editor's small 3D panel and the drawing sheet viewports deliberately do not.
- The ghost tier fades by **colour** rather than opacity by default. This scene has no order-independent transparency, so genuinely translucent ghosting makes members behind members flicker as the camera turns. `GhostOpacity` is exposed if that trade is ever wanted.

#### Drawing safety
Snapshot capture and 3D View mode exit both clear the inspector unconditionally. The Drawing Editor prefers this surface for its sheet 3D views, so a member left pinned in accent blue must never be captured into an issued drawing.

#### Noted, not changed
`ComponentLoader__Glb` matches anchor roles against `'finial'` / `'finialBase'` / `'cresting'`, but `SkeletonSolver` emits anchors with `Role` of `'ridgeEnd'` or `'apex'`. Nothing matches, so `ComponentIdForRole` always returns empty and **no finial, base or cresting is ever placed in 3D**. This predates the inspector and is left alone here because fixing it changes what the model renders, which is a separate decision. Component picking is wired and correct; the category is simply inert until components are actually placed.


# ---------------------------------------------------------
## Vale__LanternDesigner v0.0.8 - 31-Jul-2026
### Projects table: tighter Actions column and Client Name for drawings

#### Added
- **Client Name** column on the Projects table (sortable, searchable, inline-editable).
- Client Name field on the New Project modal.
- Value writes to `VghLantern__ProjectFile__Metadata__ClientName`, which already drives the Drawing Editor title block, Specification schedule, and Document Preview / PDF metadata.
- Seeded Client Name `"David Brent"` on project 6969.

#### Changed
- Actions column shrinks to content width so Open / Edit / Delete no longer leave a wide empty strip.
- Project list / manifest / server list responses now carry `clientName`.

#### Files
- `VghLantern__DocManagement__Styles__Main__.css`, `Na__DocManagement__Config.json`
- `VghLantern__DocManagement__ProjectList__.js`, `VghLantern__DocManagement__ProjectActions__.js`
- `VghLantern__AppData__ProjectFileManager__.js`, `VghLantern__FlaskServer__Localhost__.py`
- `07__LocalProjectData/VghLantern__ProjectFile__6969__David_Brent__.json`


# ---------------------------------------------------------
## Vale__LanternDesigner v0.0.9 - 31-Jul-2026
### Pitch annotation arc tripled in size

#### Changed
- `AngleArcRadiusMm` raised 3x (320 → 960) per direct request for a more prominent arc. The existing `len * 0.22` safety cap is left in place, so on shorter hips the rendered radius is still clamped below that ceiling rather than sprawling the whole symbol away from the hip midpoint.

#### Config
- `Na__Env2d__Config.json` → `AngleArcRadiusMm` (960).


# ---------------------------------------------------------
## Vale__LanternDesigner v0.0.7 - 31-Jul-2026
### Pitch annotation arc sized to stay compact and centred on the hip

#### Fixed
- The mid-hip pitch arc introduced in v0.0.5 used a radius small enough that a 22.5° sweep produced almost no visible curvature - it read as a flat, tick-ended line rather than an arc.
- A first attempt enlarged the radius to 900mm, but because a shallow 22.5° arc's bow is a fixed proportion of its own chord, this dragged the whole symbol (baseline, arc, ticks) a long way out from the pivot - the horizontal reference line ended up floating below the roofline and the text drifted off-centre toward the ridge.
- Settled on a modest radius (320mm) that keeps the whole assembly (baseline + arc + ticks + text) tight at the true hip midpoint, and tightened the radius safety cap (`len * 0.22`) so it only ever engages on genuinely small lanterns rather than routinely overriding the configured size.

#### Config
- `Na__Env2d__Config.json` → `AngleArcRadiusMm` (320), `AngleTickLengthMm` (55), `AngleTextOffsetFromSlopeMm` (60).

#### Files
- `VghLantern__Env2d__DimensionRenderer__.js`, `Na__Env2d__Config.json`


# ---------------------------------------------------------
## Vale__LanternDesigner v0.0.6 - 31-Jul-2026
### Inline project row edit and simplified status tracker

#### Added
- **Edit** action on each Projects table row. Pressing Edit turns Project Name and Document Name into text inputs and Status into a dropdown; the Edit button becomes **Save** (with Cancel alongside). Save writes via the existing `POST /api/projects/{code}` path through `ProjectFileManager.SaveProject`.

#### Changed
- Document status options simplified to three values with a clear traffic-light scheme:
  - **Draft** (red)
  - **For Approval** (yellow)
  - **Issued** (green)
- Status config, CSS tokens, badge classes, and sort order updated to match. Legacy five-status values (`In Progress`, `Pending Approval`, `Approved`, `Completed`) are no longer offered.

#### Files
- `Na__DocManagement__Config.json`, `VghLantern__CoreUi__Styles__Variables__.css`, `VghLantern__DocManagement__Styles__Main__.css`
- `VghLantern__DocManagement__ProjectList__.js`, `VghLantern__DocManagement__ProjectActions__.js`


# ---------------------------------------------------------
## Vale__LanternDesigner v0.0.5 - 31-Jul-2026
### Elevation pitch annotation centred on the hip

#### Changed
- Pitch angle annotation on front and side elevations sits at the **midpoint of the silhouette hip** instead of crowding the eaves corner.
- Restored the arched angle line: horizontal baseline, arc from horizontal to the slope, and tick marks at both arc ends - matching issued Vale drawing convention.
- Angle text uses a larger config-sized font (`AngleTextFontSizeMm`) and a paper-white halo (`--angle` modifier) so it stays readable at 1:50 sheet scale.
- `paint-order` is included in Env2d SVG style serialisation so the halo survives PDF export.

#### Config
- `Na__Env2d__Config.json` → `AngleTextFontSizeMm` (115), `AngleTextOffsetFromSlopeMm` (55, radial clearance past the arc), `AngleArcRadiusMm` (280), `AngleTickLengthMm` (50).


# ---------------------------------------------------------
## Vale__LanternDesigner v0.0.4 - 31-Jul-2026
### Full PWA support on Windows, iOS and Android, a real caching service worker, an honest read-only notice for the hosted build, and Component Index thumbnails at a consistent line weight and scale

**Status: the PWA and web demo work is written, not yet run.** Every file is syntax-checked, every path and precache entry is verified to resolve, and the URL resolver and service worker routing are unit-tested against all four deployment surfaces. None of it has been exercised in a browser. The Component Index work at the end of this entry is the exception - that is confirmed working in the running app.

#### The problem
- Installability was a copy of the ValeSpec scaffolding and had never worked. The manifest and the head both pointed at `01__AppAssets__VghLantern/Na__VghLanternApp__Icon__192x192.png` and its 512 sibling; the folder contained nothing but an empty `UiIcons__MenuIcons__ToolsMenu`. Six references, two files, zero of them present. Chromium will not offer an install for a manifest whose icons 404.
- The service worker was a no-op with **no fetch handler at all**. It existed purely to satisfy the "has a service worker" criterion. No offline, no caching, nothing.
- The manifest declared `"scope": "/"` and `"start_url": "/VghLantern__App__.html"`. Correct only where the app root is the origin root, which is true on localhost:8006 and false on any hosted sub-path. Under GitHub Pages both pointed at the wrong place.
- There was no iOS path. Safari has no `beforeinstallprompt` and no programmatic install, so a manifest alone gets an iPhone user nowhere.

#### Assets (`01__AppAssets__VghLantern`)
- **The 404 is fixed.** ValeSpec's 192 and 512 icons copied in under the VghLantern names, as agreed, pending a lantern-specific icon.
- The Vale header logo copied in as well. It previously resolved through `../assets__CommonApplicationAssets/`, which sits **above** the app folder and therefore outside any Lantern-scoped service worker, so it could never be cached for offline use.

#### PWA module set (`62__Feature__AppInstallability` - rebuilt)
Ported from the Whitecardopedia stack, which was by a wide margin the best of the three implementations in the codebase, with two of its decisions deliberately **not** carried over. Whitecardopedia puts its worker at the WebApps root and pulls the logic in via `importScripts()` purely so one worker can cover two apps; Lantern is a single app, so its worker belongs at its own root. Whitecardopedia also hand-maintains a ninety-entry precache list, which is why its version token needs bumping on nearly every commit.

- **`Url__Constructor`** resolves the app root three ways in order: a `<meta name="vale-pwa-base">` override, the `Vale__LanternDesigner` path segment, then the directory of the current document. The app is a single page served from its own folder root, so the last of those is always correct and the segment probe is belt-and-braces for a hosted sub-path. Everything else in the stack reads its paths from here, and the static manifest and apple-touch-icon hrefs are rewritten to absolute URLs at load so the manifest, the worker scope and the start URL can never resolve from three different bases.
- **`PlatformDetector`** produces twelve platform tokens. Handles the iPadOS-reports-as-MacIntel quirk through `maxTouchPoints`, the legacy `navigator.standalone` flag, and four display-mode queries including `window-controls-overlay` for the Windows app shell.
- **`SessionState`** holds a per-platform dismissal ladder of 1 minute, 1 hour, 1 day, 1 week, 1 month, in localStorage with an in-memory fallback so private browsing cannot throw.
- **`PromptUi`** renders two variants in vanilla DOM so it can mount before the app finishes booting: a compact bottom bar and a centred instruction sheet with an animated arrow.
- **Five handlers.** Chromium captures `beforeinstallprompt` and drives the native dialog; iOS Safari walks through the share sheet with the arrow pointing down on iPhone and up on iPad; iOS non-Safari explains that only Safari can install and offers to copy the link; macOS Safari covers File then Add to Dock; InstalledStandalone is a real handler rather than a null so the controller needs no special case.
- **The Chromium handler attaches its listener at module load, not at `activate()`.** Chromium can fire `beforeinstallprompt` before the controller has initialised and the event is never replayed. Whitecardopedia papers over this with a retry loop; capturing early removes the race instead.
- **`InstallController`** waits 4.5 s then retries up to six times at 1.5 s, probes `getInstalledRelatedApps()`, and subscribes to live standalone changes. It also **defers while the web demo notice is on screen**, so a first-time web visitor reads one panel at a time.
- **`ServiceWorker__Registrar`** gates on secure context, bridges `controllerchange` to a single guarded reload, and offers three escalating resets. `purgeAppCache()` preserves `VghLantern__Project__*` and `VghLantern__ProjectManifest` **by prefix** - on the hosted build that mirror is the only copy of a user's work, so a purge that took it would be destructive. It aborts rather than proceeding if it cannot snapshot those keys first. `ClearCache` typed into the console still works as it does elsewhere.

#### Service worker (`Na__ServiceWorker__VghLantern.js` - rewritten in place)
- **The filename is unchanged on purpose.** Registering a differently named worker would leave the old registration in place as an orphan rather than replacing it.
- Two buckets, `vghlantern-shell-vN` and `vghlantern-data-vN`. The superseded `na-vghlantern-cache-` prefix is still in the owned list so anything the stub left behind is cleaned up on first activate.
- **`/api/*` is bypassed entirely.** Those routes carry live project state and health checks; a cached answer there would be actively wrong. On GitHub Pages they fall outside the scope anyway, but on localhost the scope is the origin root and the explicit bypass is what makes it safe.
- HTML is network-first so a stale document cannot load against a newer module graph. **All JSON is network-first**, with `cache: 'no-store'` on the network leg so a "network-first" read cannot be quietly satisfied by the browser's own HTTP disk cache. Treating the whole extension this way is simpler than an allow-list and safer during development, where an edited config must never be shadowed. Everything else is stale-while-revalidate.
- **Precache is twelve entries**, not ninety: the document, the stylesheet index, the two vendor builds the app actually loads, the icons, and the boot-critical JSON. The rest enters the cache through stale-while-revalidate as it is first requested, so the app is fully offline after one visit with no file list to keep in step with the source tree.

#### Manifest (`VghLantern__Pwa__Manifest__.webmanifest` - new)
- `start_url` and `scope` are now **relative to the manifest**, so the same file is correct on localhost, on GitHub Pages and on any future custom domain.
- `id` is `vghlantern-designer`, resolved against the origin. This matters: every Vale app shares the `github.io` origin, so a path-based id risks colliding with another app's.
- Gains `display_override` led by `window-controls-overlay`, `handle_links`, `categories`, `lang`, and **`maskable` icon entries**, which were absent before and are why an installed Android icon would otherwise render badly.

#### Web demo mode (`63__Feature__WebDemoMode` - new)
The app runs perfectly well without the Flask server. Every loader already falls back to a static file, and `ProjectFileManager` already catches an unreachable server and falls back to localStorage. What it cannot do is **write to disk**, and that gap is invisible: a save succeeds into localStorage and the user has no way to know their work never reached a file. This exists to make it visible.

- **`EnvironmentDetector`** classifies hostname-first so the answer is available with no race against boot, then confirms with a health probe. Not localhost means demo, resolved immediately. Localhost with a live health route means full mode. **Localhost with a dead one also means demo**, which catches opening the app without starting the server. The probe only runs on localhost; probing the hosted build would add a guaranteed 404 for no information.
- **`NoticeModal`** shows once per browser session, then leaves a persistent badge in the header that reopens it. It states plainly that projects live in this browser alone and are lost if browser data is cleared, and points at the localhost build for real editing.
- **Editing stays enabled.** Locking the app down would make it useless for showing the tool to someone. The warning plus an escape hatch covers the real risk, which is silent data loss.
- That escape hatch is **Export all projects**, which writes every stored project into one JSON bundle. One file rather than a loop of downloads, because a loop trips popup blocking and a bundle is easier to hand back to the local build later.

#### Verification performed
- All fourteen new and rewritten JS files pass `node --check`.
- Manifest parses; `start_url`, `scope` and all four icon entries resolve to files that exist. An initial `../../../` was one level too deep and was caught here.
- All 95 local references in the app HTML and all 18 stylesheet imports resolve.
- All 12 precache entries resolve.
- The URL resolver was run against localhost, GitHub Pages, a custom-domain sub-path and a root-mounted custom domain. All four produce correct roots, scopes and start URLs.
- Service worker routing was tested against 14 representative URLs covering all five classifications. No misroutes.
- No global is read that is not defined, beyond `VghLantern__AppData__ProjectFileManager` and the opt-in `VghLantern__App__SuppressReload` flag, which nothing sets yet by design.

#### Known and accepted
- `ComponentIndexLoader` and `ProfileIndexLoader` request the origin-absolute `/api/component-index` and `/api/profile-index` first. On the hosted build those 404 before the static fallback succeeds, so the console shows two expected 404s on load. Harmless, and left alone rather than reworked as part of a PWA change.
- The install prompt covers Chromium, both iOS paths and macOS Safari. Desktop and Android Firefox get no handler, because neither offers a usable install route worth prompting for.

#### Component Index (`50__System__ComponentIndex`) - consistent thumbnails and an insertion origin marker
**Confirmed working in the browser**, unlike the PWA work above.

The gallery traced every profile with an inline `stroke-width` of `max(Width, Height) / 120 * 6` while the stylesheet also applied `vector-effect: non-scaling-stroke`. Those two together make the attribute a **screen-pixel** width that is then scaled by the size of the section, so the 120mm eaves drew at well over twice the line weight of the 50mm glazing bar. Nothing marked where a profile is inserted onto the skeleton, either.

- **The outline weight is a fixed `1.5` owned by the stylesheet** and no inline attribute is emitted at all. Paired with the non-scaling stroke that was already there, every section now reads at one weight whatever it measures. This is what `ProfilePathTracer` in the SketchUp plugin has always done, and this change brings the two galleries into line.
- **The viewBox is square and centred on the outline**, sized off the longer edge plus 12% either side, rather than padded per axis. Padding each axis independently left a wide eaves tight to the sides of its square well while a narrow glazing bar floated with slack all round. A square box frames every section to the same proportion of its well.
- **The insertion origin carries a red diagonal cross** at `(0, 0)`, which needs no transform because only Y is negated when the path is built. It is turned 45 degrees so it cannot be read as part of the section - an upright crosshair lies along the outline edges on most lantern profiles. Its arms are sized off the framed span, so like the stroke it is the same size on every card. `--VghLantern_SvgOriginLine` is the new token.
- **The cross is drawn after the path, not before.** `ProfilePathTracer` draws its marker first because its profile line has no fill; the Lantern preview path *is* filled, so a marker underneath is buried on any profile whose origin sits inside the section rather than on its boundary.
- **A small / medium / large thumbnail toggle** sits in the toolbar at 140 / 190 / 260px. Grid columns are a **fixed width per setting rather than a `1fr` stretch**, so a card is the same size whatever the viewport - which is the point of having the control at all. Below 600px the row falls back to a fluid fill so the large setting cannot overflow the panel. Changing size swaps classes on the live DOM instead of re-rendering, so the grid does not drop back to loading shims on every click.

The detail panel picks all of this up for free. It already called `BuildPreviewSvg` rather than tracing its own copy, so there was one place to change.


# ---------------------------------------------------------
## Vale__LanternDesigner v0.0.3 - 30-Jul-2026
### Drawing Editor: one layout and one chrome description shared by sheet and PDF, 3D snapshots framed at the frame's own aspect, and sheet setup persisted on the project file

**Status: tested and confirmed working.** Sheet and export are in parity, the 3D frame matches on both surfaces, and sheet setup survives a session.

#### The problem
- The sheet and its PDF were drawn by two independent authors. The screen was a CSS grid inside a flex column with the notes block and titleblock as DOM; the exporter re-solved the same rectangles in millimetres and re-drew the same furniture with jsPDF. Anything not expressed as a shared config number drifted: font stack, font weight, letter spacing, text baselines, rule colours, and the position of every caption.
- The 3D view was the worst of it. The snapshot was captured into a fixed **2000 x 1400** buffer whatever shape the frame was. On screen `object-fit: contain` letterboxed it; on paper `addImage` stretched it to fill. Same lantern, two different framings.
- Nothing about the sheet was saved. Sheet size, orientation, scale, gutter positions, zoom and the 3D viewpoint were session variables, so every reopen started from the config defaults.

#### One geometry source (`SheetPdfLayout__.js`, `SheetManager__.js`, `ViewportFrame__.js`)
- **The screen sheet is now positioned from the layout solve.** Each frame and its drawable body are placed at the solved paper rectangle divided by `ScreenPixelsPerMm` and nothing else. The CSS grid, the flex column and the per-surface layout maths are gone.
- `Solve()` returns the grid's **column and row tracks**, so the gutter handles sit on the solved gutter centre lines rather than on a second implementation of the same division. It also returns `LabelMm` and `ScreenPixelsPerMm`.
- `ViewportFrame__CellSizeMm()` and `SlotBodySizeMm()` are **removed**. They were a parallel copy of the layout arithmetic, including a second implementation of the notes-band reservation, which is exactly the kind of duplicate that drifts.
- `ViewPlacement__ApplyTrueScale()` takes the body rectangle from the solve instead of measuring the laid-out element, so screen rounding can no longer reach the drawn scale. `BuildFitRequests()` fits against the same rectangles.
- The paper's outline is an **outline, not a border**: a border comes out of the content box and would leave the chrome overlay scaled a couple of pixels smaller than the frames positioned inside it.

#### One chrome description (`SheetChrome__.js` - new)
- Everything printed on a sheet that is not a view - frame boxes, caption strips, captions, scale labels, the notes block, the titleblock - is built **once** as a flat list of paper-millimetre primitives (`Rect`, `Line`, `Text`, `Image`).
- That one list is rendered **two ways**: to an SVG overlay whose viewBox is the paper in millimetres for the Drawing Editor, and to jsPDF calls for the export. Same order, same coordinates, same face, same weights. The overlay is pointer-transparent, so clicking a dimension or double-clicking the 3D frame still reaches the view underneath.
- **Baselines are absolute and derived from cap height.** A baseline is the only vertical anchor SVG and PDF agree on exactly; line boxes, half-leading and flex baseline alignment have no equivalent in a PDF content stream.
- **Text is measured through jsPDF.** A throwaway document holds the Helvetica metrics the export will use, so a titleblock value truncated on paper is truncated at the same character on screen. The font stack leads with Helvetica for the same reason - Arial is metrically identical and is what Windows substitutes.
- New **`Config__SheetStyle`** block owns colours, strokes, weights, letter spacing and the font stack for both surfaces at once. `Config__PdfExport` keeps its colour values as fallbacks only.
- The Document Preview mode still renders `TitleBlockRenderer` and `AnnotationLayer` markup as DOM, so their CSS moved to the Document Preview stylesheet, with its one consumer.

#### 3D snapshot parity (`ViewPlacement__.js`)
- The snapshot is rendered at the frame's paper millimetres times `PdfExport.SnapshotPixelsPerMm`, so it has the **frame's exact aspect** and fills its rectangle on both surfaces with no fitting in between.
- The offscreen stage is sized to that aspect **before** the camera preset is fitted. The preset fits against whatever aspect the surface is at, and the capture then renders without refitting; if the two disagree the fit is wrong, and a frame taller than the stage had its model clipped at the sides.
- The snapshot cache fingerprint now includes the frame size, so changing sheet size or dragging a gutter re-shoots rather than reusing an image fitted to the previous frame.

#### Sheet setup persisted (`ProjectSchemaValidator__.js`, `ProjectFileManager__.js`, `SheetManager__.js`)
- New **`VghLantern__ProjectFile__DrawingLayout`** block on the project file: sheet size key, orientation, scale denominator, whether the scale was chosen by hand, column and row shares, sheet zoom, and the 3D view camera states.
- Restored on `projectChanged` **before** the redraw, so a project opens on the paper, scale and viewpoint it was saved with rather than on the defaults followed by a visible correction. Every field may be null, and null means fall back to config, which is what a project created before this block existed needs to do.
- Writes go through `MarkDirty()`, so the existing AppCore debounce turns a gutter drag or a run of zoom steps into a single disk write rather than one per event.
- A saved sheet size is checked against the size table and a saved scale against the denominator list before either is applied, so a stale value cannot put the sheet on an unreadable scale.

#### PDF export
- `SheetPdfExporter__.js` no longer draws anything of its own. It rasterises the views into the solved body rectangles, then hands the shared chrome primitives to the shared renderer. It **reuses the layout the editor laid the screen sheet out with** rather than re-solving, so an export cannot disagree with the sheet the user approved.
- Draw order is unchanged and still deliberate: views first, chrome over the top, because a view is an opaque raster that fills its body rectangle to the millimetre. The on-screen overlay stacks the same way.


# ---------------------------------------------------------
## Vale__LanternDesigner v0.0.2 - 30-Jul-2026
### Preview & Send and Drawing Editor: drawings last, compact title block, PDF-faithful preview, true scale sheet views, sheet navigation, live 3D camera, and true-size PDF export

#### Document Preview (`40__System__DocumentPreviewMode`)
- **Page order** is now config-driven (`Config__Page.PageOrder`: specification then drawing). Both on-screen preview and PDF export read the same `DocumentState.ListPageKinds()` path so they cannot diverge.
- **Drawing title block** is height-capped from `TitleBlockHeightMm` (reduced to **14 mm**, logo **28 mm**) so the four view frames reclaim page space. Preview wraps the title strip in `DocPreview__TitleHost`; PDF strip height uses the same config value and row Labels.
- **WYSIWYG specification pages** — new **`PrintDocumentRenderer`** builds print-faithful HTML from `DocumentModel` (same sequence as `PdfExporter`). Specification Mode keeps its interactive card UI; Preview & Send no longer dumps that abstraction into the paper preview.
- **Drawing Editor viewport gutters** — drag the space between the 2×2 frames to rebalance column/row shares. Hover shows a grab cursor and blue handle; scale stays fixed (larger frame shows more model at the same 1:N). Shares persist for the session and feed PDF layout via `GetGridShares`.
- **Env2d corner view titles** — in-viewport draftsman labels (not sheet frame captions) at **0.25×** size (`ViewLabelSizeFactor` 0.00875), with a text-width underline rule, and plan renamed **Plan View**. Labels anchor just under the drawn content (not the empty viewBox edge). Gutter resize handles idle as light dotted lines; hover/drag keeps the solid blue accent.
- **Sheet ↔ PDF WYSIWYG parity** — Drawing Editor and PDF export now share one millimetre SSOT (`Sheet.BlockGapMm`, titleblock paddings/logo caps, notes typography/columns, frame label font). Screen chrome is driven by CSS variables injected from config; PDF titleblock/notes/logo use the same numbers; `CellSizeMm` reserves the notes band like `SheetPdfLayout.Solve`.

#### Scale correctness (the headline fix)
- **Sheet views were never drawn at the quoted scale.** Every frame caption and the titleblock quoted the `ScaleManager` denominator, but nothing applied it: each view was independently fitted to its frame by `Env2d__RenderPipeline__FitIfNeeded`, so a 4000 mm side elevation drew larger than a 6000 mm front elevation on the same sheet at the same stated scale.
- **`ViewPlacement__ApplyTrueScale()`** now gives each orthographic frame a viewBox spanning exactly **(frame body millimetres x scale denominator)** of model space, centred on that view's projected extents. The quoted scale and the drawn scale are the same number.
- The body rectangle is **measured from the laid-out frame** rather than taken from the requested grid cell. The notes block takes its height off the grid, so the two differ, and a viewBox whose aspect does not match its box is letterboxed by `preserveAspectRatio` and quietly draws under scale.
- **A manually chosen scale now sticks.** Auto fit re-ran on every rebuild and silently overwrote the toolbar selection, which is why changing the Scale dropdown appeared to do nothing. Auto fit still picks the opening scale, then stands down for the session once the user chooses.
- Frame caption strips are pinned to their configured paper height, because the body maths subtracts `FrameLabelHeightMm` and a font-driven strip height put the drawn scale slightly off its quoted value.

#### PDF export (`SheetPdfLayout__.js`, `SheetPdfExporter__.js` - both new)
- **`SheetPdfLayout__.js`** solves the paper millimetre rectangle of every element on a sheet: view grid, each frame and its drawable body, notes block, titleblock strip. Pure arithmetic, no DOM and no jsPDF. Honours `ColumnSharesPct` / `RowSharesPct`, preferring the live session shares from `SheetManager__GetGridShares()` so an exported sheet matches frames the user has dragged.
- **`SheetPdfExporter__.js`** writes the sheet as a single-page PDF and is the owner of scale correctness in print. Three things have to agree and all three are forced: the page is created at the sheet's real millimetre size; each view's viewBox is **rewritten** to span exactly one scale window before rasterising; the raster is placed into that same rectangle so nothing is refitted between the maths and the paper.
- Verified end to end on an A3 landscape export: PDF MediaBox came out as **1190.55 x 841.89 pt**, which is exactly 420 x 297 mm, and a 10,000 mm lantern drew 100 mm wide at 1:100.
- Views are rasterised at **12 px/mm (about 305 dpi) as PNG**, because a drawing is thin dark lines on white that JPEG turns into grey haloes. Frame chrome, notes and the titleblock are drawn **natively**, so issued text stays selectable and searchable.
- **Draw order matters and is deliberate.** Views are laid down in one pass and every rule and caption drawn over them in a second. A view is an opaque raster filling its body rectangle to the millimetre, so chrome drawn first is painted over along every shared edge.
- Page size and drawn scale are written into the **document properties** as well as the page geometry, so a short print can be diagnosed from the file itself.
- New **`VghLantern__DrawingEditor__Config__PdfExport`** block: filename pattern and tokens, raster density, block gaps, stroke weights, print colours and metadata author strings.

#### Env2d export fidelity
- **`Env2d__RenderPipeline__ToSvgMarkup()` now bakes computed styles inline** before serialising. The live SVG is styled entirely through CSS classes and custom properties, none of which travel with a detached markup string, so serialised raw the views rasterised as black shapes with no strokes. This was a **latent bug affecting the existing Document Preview PDF export** as well, which is fixed by the same change. Only the eighteen properties that decide how a shape is painted are copied, so an exported sheet is not inflated by hundreds of irrelevant declarations.

#### Sheet navigation and direct editing
- **Wheel zooms about the cursor; right drag or middle drag pans.** Pan was originally on left click, whose pointer capture swallowed every click before it reached a dimension or the 3D frame. Left click is now completely free for editing. The browser context menu is suppressed inside the sheet stage and middle-button autoscroll is blocked.
- Zoom is a CSS transform on the sheet plus an explicit size on the scaler, so the sheet keeps its true paper-pixel dimensions for export while the host's own scrollbars provide the pan surface. Zoom survives sheet rebuilds within a session.
- **Dimensions are editable directly on the sheet**, through the same `ConstraintResolver` path as the Lantern Editor. The floating input is positioned through the sheet's zoom transform, so it lands centred on the text at any zoom rather than only at 100 percent.
- **Fit Views and Refresh are removed** along with their config flags. The sheet live-updates on every geometry solve and every toolbar change, so both were dead weight. Double-click zoom reset is removed too; the gesture belongs to the 3D frame.

#### Live 3D camera editing on the sheet
- **Double-click the 3D frame** to swap the snapshot for a live orbitable surface. The frame takes a blue border to show which viewport owns the keyboard, and **Escape** ends the session.
- On exit the snapshot is **re-captured from wherever the camera was left**, and that camera is remembered: later geometry edits and sheet rebuilds re-shoot the 3D view from the chosen angle instead of snapping back to the isometric preset.
- **`RenderPipeline__GetCameraState()` / `SetCameraState()`** expose camera position and orbit target as plain data, so classic scripts can hold and replay a camera without touching Three.js types.
- Sheet pan and wheel stand down over a live camera canvas so the two navigation systems never fight, and a sheet rebuild or mode exit mid-session tears the session down safely.

#### Drawing output no longer carries modelling aids
- The **Env2d construction grid** is cleared from each sheet frame after it renders. Cleared after the fact rather than suppressed inside the renderer, so the Lantern Editor viewport keeps its grid untouched. Config: `ViewGrid.ShowConstructionGrid`.
- The **Env3d ground grid is never built** into a sheet viewport. `SceneManager__Create()` and `RenderPipeline__Mount()` now take options, and the Drawing Editor mounts both of its 3D surfaces with `{ ShowGroundPlane : false }`.
- **Suppressed at build time, not hidden at capture time, and this matters:** the lighting rig attaches into the same `helpers` group as the grid, so hiding that group removes every light and renders the lantern as an unlit black silhouette.
- Sheet snapshots frame tighter than the live view via `Snapshot.FramePaddingFactor`, because the bounding-sphere fit plus the interactive padding left a wide flat lantern tiny in its frame.

#### Performance and resource fixes
- **The 3D snapshot is cached against a fingerprint** of the lantern config and camera preset. Every entry to the mode previously mounted a fresh WebGL context, rebuilt the scene, rendered a supersampled frame and PNG-encoded it on the main thread (about 1 s of a measured 1.3 s entry), then threw it all away on exit. Re-entry with unchanged geometry now does no WebGL work at all.
- **WebGL contexts are actually released.** `renderer.dispose()` does not free a context; that waits for garbage collection, so repeated tab switching stacked live contexts toward the browser's hard cap, at which point the browser starts killing the oldest context. `SceneManager__Destroy()` now calls `forceContextLoss()`.
- **Sheet redraws are no longer dropped.** A request arriving while a build was in flight was silently discarded, leaving the sheet showing stale geometry. Requests are latched and replayed when the build lands.
- **`THREE.Color: Unknown color role-fixed`** warning fixed: the material builder parsed a sentinel string as a colour on every glazing and line material build. The colour is now constructed only in the branch that uses it.
- Toolbar render order fixed so the Scale dropdown shows the settled denominator on first entry rather than a stale one.

#### Document Preview - visit requirement removed
- **The Drawing Editor visit requirement is gone** (open item from v0.0.1). Preview and Send previously showed empty drawing frames unless the Drawing Editor had been opened that session. Entering Preview now composes the sheet headlessly when nothing is cached, then releases the hidden surfaces immediately. This became safe because the true-scale viewBox maths never reads on-screen layout.

#### Files touched (Drawing Editor, PDF export and supporting environments)

| Area | Path |
|------|------|
| Drawing Editor (new) | `02__Src__AppModules/30__System__DrawingEditorMode/VghLantern__DrawingEditor__SheetPdfLayout__.js` |
| Drawing Editor (new) | `02__Src__AppModules/30__System__DrawingEditorMode/VghLantern__DrawingEditor__SheetPdfExporter__.js` |
| Drawing Editor | `VghLantern__DrawingEditor__SheetManager__.js`, `ViewPlacement__.js`, `ViewportFrame__.js`, `Na__DrawingEditor__Config.json`, `Styles__Main__.css` |
| 2D environment | `05__Env2d__SvgRenderPipeline/VghLantern__Env2d__RenderPipeline__.js`, `DimensionEditor__.js` |
| 3D environment | `06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__SceneManager__.mjs`, `RenderPipeline__.mjs`, `SnapshotExporter__.mjs`, `CameraRig__.mjs`, `MaterialLibrary__.mjs`, `Na__Env3d__Config.json` |
| App core | `01__AppCore/VghLantern__AppCore__Init__.js` |
| App shell | `VghLantern__App__.html` (two new Drawing Editor scripts) |

#### Open items

- **`ProfileTraceRenderer` full silhouette**, **provisional library dimensions**, **Gable and Mono Pitch roof forms** and **empty dev tooling folders** all stand as recorded in v0.0.1.
- **Vector PDF output** - jsPDF cannot place vector SVG, so orthographic views are rasterised at 12 px/mm. True vector linework in the PDF needs either a different writer or an SVG-to-PDF path drawer. Worth revisiting before drawings are issued to the workshop at A1.
- **A manually chosen scale can overflow its frame.** Picking too fine a scale for a large lantern clips the view at the frame edge, which is honest CAD behaviour but currently silent. A toolbar warning when the chosen scale does not fit would be kinder.
- **Notes are truncated to one line each** in the PDF, because the notes block height is measured on one line per note. A long project note is cut rather than wrapped.

# ---------------------------------------------------------
## Vale__LanternDesigner v0.0.1 - 30-Jul-2026
### Initial wireframe release — app shell, geometry solver, 2D/3D environments, drawing sheet, specification, PDF

First build of the **VghLantern Roof Lantern Designer**, a parametric roof lantern configurator for Vale Garden Houses. Structure, naming, interaction model, and project-file workflow are deliberately **modelled on ValeSpec** so the two apps read as one family. The app is a static HTML/CSS/JS shell with a **Flask localhost server on port 8006** for project read/write and per-user menu state. Where ValeSpec drives a single **SVG** pipeline, VghLantern runs **two render environments side by side** — a 2D SVG pipeline for plan/elevation linework and dimension editing, and a Three.js pipeline for the 3D rendition — both fed from one **geometry solver** so they can never disagree about the model.

#### App shell and core (`VghLantern__App__.html`, `01__AppCore`)
- **Seven modes** in `VghLantern__AppCore__ModeManager__.js`: **`DocManagement`**, **`LanternEditor`**, **`Viewport3d`**, **`DrawingEditor`**, **`Specification`**, **`DocumentPreview`**, **`ComponentIndex`**. Descriptor table maps each mode to its panel id plus an **`IsFullBleed`** flag so viewport modes lose panel padding.
- **`VghLantern__AppCore__StateManager__.js`** — event emitter holding `currentProject`, active lantern index, and the last solved geometry; emits **`appConfigLoaded`**, **`componentIndexLoaded`**, **`profileIndexLoaded`**, **`projectChanged`**, **`lanternSelected`**, **`lanternUpdated`**, **`geometrySolved`**, **`modeChanged`**, **`dirtyStateChanged`**.
- **`VghLantern__AppCore__Init__.js`** — boot order, delegated listener binding via **`VghLantern__AppCore__InitSystemModules()`** (bound once, not per render), debounced autosave, and **`VghLantern__AppCore__OnModeExited`** so heavyweight systems can release resources. The 3D viewport drops its GL context on exit; Drawing Editor and Specification flush pending edits.
- **`VghLantern__AppCore__ConfigLoader__.js`** — loads the app config SSOT then merges each system's local overlay (`Na__LanternEditor__Config.json`, `Na__Env2d__Config.json`, `Na__Env3d__Config.json`, `Na__DrawingEditor__Config.json`, `Na__Specification__Config.json`, `Na__DocPreview__Config.json`, `Na__DocManagement__Config.json`, `Na__LanternEditor__Warnings__.json`).

#### Configuration SSOT (`02__AppData/VghLantern__AppConfig__Main__.json`)
- App identity, port **8006**, data folder paths, autosave debounce, default mode.
- **`VghLantern__RoofForm__Options__Config`** — selectable forms **Hipped Ridge**, **Pyramid**, with **Gable** and **Mono Pitch** present but listed in `DisabledRoofForms` (visible, not yet selectable). Labels must match the canonical set in `ProjectSchemaValidator` because **`SkeletonSolver`** branches on them.
- **`VghLantern__Lantern__GlobalDefaults__Config`** — every new lantern seeds from here (2400 × 1400 mm, 150 mm builders upstand, 25° pitch, 500 mm target bar spacing).
- **`VghLantern__DataLibraries__Config`** — locations of the two generated library indexes and the GLB asset folder.

#### Geometry solver (`04__MathUtils__LanternGeometry`)
The single source of geometric truth; both render environments and the takeoff consume its output rather than deriving their own.
- **`VghLantern__Geometry__SkeletonSolver__.js`** — resolves a lantern config into a named member skeleton (eaves, ridge, hips, verges, closing sections) as 3D points in millimetres, branching on roof form.
- **`VghLantern__Geometry__RoofPitchCalculator__.js`** — pitch angle is the stored property and roof height derives from it; this is the one place angle ⇄ rise conversion happens (`DefaultPitchDegrees`).
- **`VghLantern__Geometry__GlazeBarLayout__.js`** — distributes glazing bars per slope by **target spacing**, rounded to whole panes, returning bar lines with their slope association.
- **`VghLantern__Geometry__ConstraintResolver__.js`** — clamps interdependent dimensions so the editor cannot produce an unbuildable lantern.
- **`VghLantern__Geometry__QuantityTakeoff__.js`** — pure function over solved skeleton + bar set returning linear metres per member role, glazing areas, and component counts. No DOM, no config reads.

#### 2D environment (`05__Env2d__SvgRenderPipeline`)
- **`VghLantern__Env2d__RenderPipeline__.js`** orchestrates layer renderers: **`PlanViewRenderer`**, **`ElevationViewRenderer`**, **`SkeletonRenderer`**, **`GlazeBarRenderer`**, **`ProfileTraceRenderer`**, **`FinialRenderer`**, **`DimensionRenderer`**.
- **`VghLantern__Env2d__DimensionEditor__.js`** — click a dimension, type a value, commit. Ported from the ValeSpec inline-dimension pattern so the interaction feels identical.
- **`VghLantern__Env2d__ViewportInstance__.js`** / **`ViewportControls__.js`** — pan/zoom per viewport instance, with **`ActiveController`** tracking so **zoom-extents** hotkeys hit the viewport the user is actually in.
- **`VghLantern__Env2d__ProfileTraceRenderer__.js`** — draws true section outlines from the profile library at member positions, resolving profile ids through `ProfileIndexLoader`.

#### 3D environment (`06__Env3d__ThreeRenderPipeline`)
- **ESM boundary:** Three.js is module-only, so **`VghLantern__Env3d__Bootstrap__.mjs`** is the single `<script type="module">` entry. It publishes the pipeline onto `window` and dispatches **`vghlantern-env3d-ready`**, with a `WhenReady` queue so classic scripts can call in before the module graph settles.
- **`SceneManager`**, **`CameraRig`** (OrbitControls + named view presets), **`LightingRig`**, **`MaterialLibrary`** (whitecard finish set).
- **Mesh builders:** **`MeshBuilder__ProfileSweep__.mjs`** sweeps a 2D library profile along a solved skeleton member (hand-rolled merge rather than `BufferGeometryUtils`, because every member needs its own material slot); **`MeshBuilder__Skeleton__.mjs`** builds the frame from solved members; **`MeshBuilder__Glazing__.mjs`** fills the panes.
- **`ComponentLoader__Glb__.mjs`** — loads finials, bases, cresting, and vents from GLB, falling back to a proportional placeholder when an asset is missing rather than dropping the component.
- **`SnapshotExporter__.mjs`** — offscreen render at a requested size for placement on drawing sheets.

#### Lantern Editor (`20__System__LanternAssembly__EditorMode`)
- **`ControlDescriptors__.js` is the SSOT for controls** — every slider, dropdown, and toggle is declared as data (bounds, step, options source, visibility predicate). **`ControlPanel__.js`** is a generic renderer over those descriptors, so a new control is a data edit, not new DOM code.
- **Seven section modules** supply descriptors: **`FormAndSize`**, **`GlazingBars`**, **`RidgeAndHips`**, **`Finials`**, **`BuildersUpstandAndBase`**, **`Ventilation`**, **`FinishAndGlazing`**. Dropdown options come from the library indexes filtered by **`ApplicableRoles`**, so no module hardcodes a category-to-role mapping.
- **`WarningSystem__.js`** + **`Na__LanternEditor__Warnings__.json`** — declarative rules evaluated against lantern metrics and solved geometry; renders inline warnings and errors in the editor.
- **`ViewportHost__2d__.js`** / **`ViewportHost__3d__.js`** — host the two environments inside the editor split layout, with view tabs (plan / front / side) and an optional live 3D preview.

#### 3D View mode (`25__System__Viewport3dMode`)
- Full-bleed dedicated 3D mode with a floating control overlay (**`Viewport3d__Controls__.js`**): lantern selector, view presets, zoom extents, skeleton-mode label.
- Reuses the same **`VghLantern__Env3d__RenderPipeline__`** API as the editor host — no second pipeline. Configured from a **`DedicatedViewportMode`** block inside `Na__Env3d__Config.json` rather than a new config file, keeping all 3D settings in one place.

#### Drawing Editor (`30__System__DrawingEditorMode`)
- **All layout maths in paper millimetres**, scaled to pixels only for screen, so print and preview share one geometry model.
- **`ScaleManager__.js`** — standard scale ladder, fit-to-frame selection, model ⇄ paper conversion.
- **`ViewportFrame__.js`** builds captioned frames from the config's view slots; **`ViewPlacement__.js`** fills them, taking 2D views as static SVG and the 3D view as a snapshot. Rendered output is **cached** (`CachedSvgMarkup`, `CachedSnapshots`) so Document Preview can compose a sheet after the Drawing Editor has been exited.
- **`TitleBlockRenderer__.js`** — Vale-branded title block resolving fields from project metadata; **`AnnotationLayer__.js`** — general plus project-specific notes block.
- **`SheetManager__.js`** — orchestrates sheet size/orientation, drives scale fitting, and renders. Redraws are **debounced** and gated on **`IsModeVisible()`**, and it subscribes only to `geometrySolved` and `projectChanged` (not `lanternUpdated`, which already triggers a solve) to avoid redundant passes.
- **`DescribeSheet()`** exposes sheet size, orientation, view snapshots, and an `IsComposed` flag as the contract for Document Preview.

#### Specification (`35__System__SpecificationMode`)
- **`DocumentModel__.js`** — solves each lantern in the project independently, runs the takeoff, then aggregates. Handles single- and multi-lantern projects and collects warnings alongside the numbers.
- **`TakeoffTableRenderer__.js`** — one generic table builder driven by configurable column definitions, unit suffixes, and decimal places; renders linear, area, and component tables without per-table code.
- **`ScheduleRenderer__.js`** — lantern schedule, finish schedule, document header.
- **`JobNotes__.js`** — editable job notes with debounced autosave via **`VghLantern__StateManager__MarkDirty()`**, which the core autosave listener picks up through `dirtyStateChanged`. **`BuildStatic()`** returns print-safe markup instead of a live editor.
- **`DescribeDocument()`** builds header and section markup **on demand** rather than scraping the DOM, so the preview and PDF work even if Specification mode was never opened.

#### Document Preview and PDF (`40__System__DocumentPreviewMode`)
- **`DocumentState__.js`** — view toggles and page geometry (paper size, orientation, margins). Toggle keys mirror `VghLantern__UserMenu__ModeDocumentPreview__Config` exactly so persistence needs no key translation.
- **`MenuDataHandler__.js`** — loads and debounce-saves per-user menu state through `GET`/`POST /api/user-menu-config/{slug}` into `08__LocalUserData`.
- **`DocIssueHandler__.js`** — classifies errors and warnings from project state, the geometry solve, and the specification model; **errors block PDF export**.
- **`PdfMetadataResolver__.js`** — filename pattern plus embedded document properties, with filename sanitisation.
- **`PageRenderer__.js`** — paginates the document from `DescribeSheet()` and `DescribeDocument()`; **`PdfExporter__.js`** writes it out via version-locked jsPDF. Drawing views are rasterised (jsPDF cannot place vector SVG), 3D snapshots pass through as images, and the title block, notes, and specification tables are drawn **natively from structured data** so body text stays selectable.

#### Component Index (`50__System__ComponentIndex`)
- Sortable, searchable gallery of every profile and component in the two libraries, with a detail view showing metadata, outline data, and bounding box — the same inspection workflow as the ValeSpec Product Index.

#### Data libraries (`05__Data__LanternComponentLibrary`, `06__Data__LanternProfileLibrary`)
- **Unified asset schema** shared by both libraries: metadata block, 2D profile points, optional 3D mesh (inline or GLB URL), and behaviour block (sweep or placement).
- **Profile coordinate convention:** origin sits on the skeleton line at the section's bottom-centre; **x** spans ±half-width, **y** rises into the member. Each asset carries its own origin note.
- **Component coordinate convention:** finials and bases use the seating point; cresting uses the centre of one repeat; vents use the centre of the pane they replace.
- **Worked examples** so the whole pipeline renders end to end: three profiles (**`PRF_GLB0001`** 50 mm capped glazing bar, **`PRF_RDG0001`** 90 mm capped ridge, **`PRF_HIP0001`** 75 mm hip) and four components (**`VGH_FIN0001`** ball-and-spike finial, **`VGH_FIN0101`** moulded finial base, **`VGH_CRS0001`** fleur cresting, **`VGH_VNT0001`** manual roof vent). Dimensions are provisional pending real Vale sections.
- **`VghLantern__ProfileDataIndex__.json`** / **`VghLantern__ComponentDataIndex__.json`** are **generated output** — marked `DoNotEditByHand`, served by the Flask server at `/api/profile-index` and `/api/component-index` with `no-store`, with the static files as a fallback.

#### Version-locked dependencies (`04__Src__Dependencies__VersionLocked`)
- Coordinated 3D / projection set **01–04**: **three 0.184.0**, **three-mesh-bvh 0.9.9**, **clipper2-js 0.9.0**, **three-edge-projection 0.0.10 @ f794481**. Upgraded together, never independently.
- **05**: **jsPDF 4.1.0**, independent of that set. UMD classic script, so it is loaded by a plain `<script src>` and reaches the app as `window.jspdf` — deliberately **not** in the import map.
- **`Vale__Dependencies__ImportMap__Index__.json`** is the SSOT for the path map. A browser cannot read an import map from JSON, so the inline `<script type="importmap">` in `VghLantern__App__.html` mirrors it by hand.
- `package.json` / `package-lock.json` pin the same versions exactly for `npm ci`; the browser loads the vendored copies, not `node_modules`.

#### Styles (`03__Style__AppStylesheets`)
- **`VghLantern__CoreUi__Styles__Index__.css`** is a hub that `@import`s the core sheets plus every system-local stylesheet, so each mode's CSS lives beside its modules.
- **`Variables__.css`** carries the Vale brand token block verbatim, then a **`VghLantern_`** extension block for viewport overlays, warning and error backgrounds, and sheet chrome. System sheets reference tokens only — no stray hex literals.

#### Server (`VghLantern__FlaskServer__Localhost__.py`)
- Port **8006**; project CRUD backed by `07__LocalProjectData/`; per-user menu config in `08__LocalUserData/`; generated library indexes served with `no-store`; `.webmanifest` MIME mapping for PWA install; health endpoint and console restart flags carried over from ValeSpec.

#### PWA (`62__Feature__AppInstallability`)
- Web app manifest and a minimal service worker (`skipWaiting` on install, legacy `na-vghlantern-cache-` eviction on activate, no `fetch` handler).

#### Housekeeping — folder numbering and vendor consolidation
- Root folder numbers were duplicated (`03__` used three times, `04__` twice). Renumbered so each root series entry is unique, with the data libraries starting after the dependency store: **`05__Data__LanternComponentLibrary`**, **`06__Data__LanternProfileLibrary`**, **`07__LocalProjectData`**, **`08__LocalUserData`**. All config paths, loader constants, server constants, `.gitignore`, and README references updated.
- A partial **r160** Three.js copy had been vendored into `02__Src__AppModules/08__Vendor__ThreeJs__VersionLocked`, shadowing the curated **0.184.0** locked set. Removed; the import map now points at `04__Src__Dependencies__VersionLocked`. jsPDF moved out of `02__Src__AppModules/41__SystemHelper__PdfExportLibrary__VersionLocked` into the same store. The 3D modules import only `three`, `three/addons/controls/OrbitControls.js`, and `three/addons/loaders/GLTFLoader.js`, and use none of the APIs removed between r160 and 0.184, so the version jump needed no code changes.

#### Files touched (representative)

| Area | Path |
|------|------|
| App shell | `VghLantern__App__.html` |
| Server | `VghLantern__FlaskServer__Localhost__.py` |
| Launchers | `Start__VghLantern__Localhost__8006__.bat`, `...__.ps1`, `Start__VghLantern__WindowsStartUp__Silent__8006__.bat` |
| Service worker | `Na__ServiceWorker__VghLantern.js` |
| App core | `02__Src__AppModules/01__AppCore/VghLantern__AppCore__Init__.js`, `ModeManager__.js`, `StateManager__.js`, `ConfigLoader__.js` |
| App config SSOT | `02__Src__AppModules/02__AppData/VghLantern__AppConfig__Main__.json` |
| Project IO | `02__Src__AppModules/02__AppData/VghLantern__AppData__ProjectFileManager__.js` |
| Library loaders | `02__Src__AppModules/02__AppData/VghLantern__AppData__ProfileIndexLoader__.js`, `ComponentIndexLoader__.js` |
| App utils | `02__Src__AppModules/03__AppUtils/VghLantern__AppUtils__UnitConverter__.js`, `ProjectSchemaValidator__.js`, `HotkeyHandler__.js`, `DateFormatter__.js`, `AutofillGuard__.js` |
| Geometry | `02__Src__AppModules/04__MathUtils__LanternGeometry/VghLantern__Geometry__SkeletonSolver__.js` + 4 siblings |
| 2D environment | `02__Src__AppModules/05__Env2d__SvgRenderPipeline/*` (13 modules + config + CSS) |
| 3D environment | `02__Src__AppModules/06__Env3d__ThreeRenderPipeline/*` (12 `.mjs` + config + CSS) |
| Notifications | `02__Src__AppModules/07__AppNotifications__UserAlerts/*` |
| Projects mode | `02__Src__AppModules/10__System__DocumentManagementMode/*` |
| Lantern Editor | `02__Src__AppModules/20__System__LanternAssembly__EditorMode/*` (17 files) |
| 3D View mode | `02__Src__AppModules/25__System__Viewport3dMode/*` |
| Drawing Editor | `02__Src__AppModules/30__System__DrawingEditorMode/*` (8 files) |
| Specification | `02__Src__AppModules/35__System__SpecificationMode/*` (7 files) |
| Document Preview | `02__Src__AppModules/40__System__DocumentPreviewMode/*` (8 files) |
| Component Index | `02__Src__AppModules/50__System__ComponentIndex/*` |
| PWA | `02__Src__AppModules/62__Feature__AppInstallability/*` |
| Stylesheets | `03__Style__AppStylesheets/*` (7 sheets) |
| Dependencies | `04__Src__Dependencies__VersionLocked/Vale__Dependencies__ImportMap__Index__.json`, `05__Vendor__JsPdf__v4.1.0/jspdf.umd.js` |
| Component library | `05__Data__LanternComponentLibrary/*` (4 assets + index + READMEs) |
| Profile library | `06__Data__LanternProfileLibrary/*` (5 assets + index + README) |
| npm pins | `package.json`, `package-lock.json` |

#### Open items

- **`ProfileTraceRenderer` full silhouette** — only the section-cut trace mode is implemented. The full-silhouette sweep (projecting every profile vertex along a member to build the outer outline) is the next pass.
- **Library dimensions are provisional** — all nine worked assets carry plausible but invented sections. They must be replaced with measured Vale profiles before any output goes to a client or the workshop.
- **Drawing Editor visit requirement** — Document Preview composes drawing views from `ViewPlacement`'s cache, so the Drawing Editor must be opened once per session for sheet views to appear in the preview and PDF. Worth removing by having `DescribeSheet()` compose headlessly.
- **Gable and Mono Pitch roof forms** are listed but disabled; `SkeletonSolver` does not branch for them yet.
- **Dev tooling folders** (`60__Dev__WebBuildUtils` index builders, `65__Dev__CadObjectBuilder`) are scaffolded but empty. Until the builders exist, both library indexes are maintained by hand despite being marked as generated output.




# ---------------------------------------------------------
