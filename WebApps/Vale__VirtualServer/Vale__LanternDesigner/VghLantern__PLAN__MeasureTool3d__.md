# Vale Lantern Designer - 3D View Measure Tool (Vertex to Vertex, Face to Face)

Plan for Adam's review, 21-Oct-2026. Decisions answered the same day (section 2) and built as v0.10.1; see the
DEVLOG for what was built and checked.

Adam: "Add a dimension tool section to the 3D Tab menu - Vertex to vertex measurement tool - Face to face measurement
tool. Measure in 1mm but have the ability to also change to 0.00mm default is whole mm, the smaller is for more
foresnic work. I need this to aduit the test models to ensure dimensions are correct." Polycam's dimension tool is the
reference for the interaction (the axis system and the straight-line nudge), SketchUp's axis colours for the axes
(three.js X red, Z green, Y blue up), an AutoCAD box round each target vertex, and TrueVision's measure tool for the
graphics.

---

## 1. What I Found

### 1.1 The 3D View and its menu

- `25__System__Viewport3dMode`: `Controls` builds the floating "3D View Tools" card as four collapsible sections
  (Model Display, Camera, Cross Section, Lantern) from lists the pipeline publishes; `Layout` owns the surface and
  turns the menu's intents into pipeline calls; `MenuDataHandler` persists which sections are open per user
  (`VghLantern__UserMenu__ModeViewport3d__Config__MenuSection*Open`).
- A fifth section slots in the same way: a section key, a persisted open flag, an icon, and a callback map entry.

### 1.2 Picking, the render loop and snapshots

- Every solid part is one merged mesh with a pick table; `PickIndex` names the part under a ray, skips hidden meshes
  (element view, display mode) and `CrossSection__IsPointClipped` skips the cut-away half. The hover inspector raycasts
  once per frame with a plain `Raycaster` (no BVH).
- The draw loop is on demand: one rAF per surface, `OnBeforeDraw` (camera damping), then a render only when something
  invalidated it. There is no after-draw hook yet.
- The Drawing Editor photographs the LIVE 3D View surface for its sheet 3D views (`BeginCapture`). Anything a measure
  tool draws must therefore never be in the three.js scene, or it would land on an issued drawing.
- `three-mesh-bvh` 0.9.9 is already vendored and in the import map (the projection system uses it). Built with
  `indirect: true` it never touches the geometry's index, so the pick tables' triangle spans stay valid.

### 1.3 TrueVision's measure graphics

- Five SVG menu icons in `01__AppAssets__TrueVision\UiIcons__MenuIcons__MeasureTools`: Tape Measure, Linear,
  Rectangular, Area, Clear Measurements (1024 artboard, Vale blue `#172b3a`, 34 stroke, round caps).
- The snap glyphs (`28__System__ObjectSnap\Na__LayoutEditor__ObjectSnap__Glyphs__.js`): AutoCAD's shapes, Endpoint a
  square, drawn in currentColor over a white casing, 27 px on screen, in the snap purple `rgb(147, 51, 234)`.
- The dimension style (`Na__LayoutEditor__WebViewer__Measure__Overlay__.js` and its CSS): a 2.2 px line with ticks at
  each end, the value as semibold tabular text with a white edge along the line, white grips and a red delete chip on
  the selected one; a dark name tag beside the snap glyph; the tool bar ("Click the first point", Undo, Done); Clear
  All asks twice; Alt measures free, Shift squares off, Escape cancels, Delete removes the selected one.

### 1.4 Polycam's measuring

From Adam's six screenshots (the online research was stopped at his word, "Research taking too long"): a reticle ring
lying in the surface under the cursor with red, green and blue ticks at its centre; after the first point, dashed axis
guides through it and a solid magenta free ray to the cursor, which turns solid in an axis colour when it snaps (green
for a vertical); a finished measurement is a purple line with round end dots and a lavender label; a bottom bar with
the total, Rescale and Delete.

### 1.5 Constraints I will respect

- One geometry brain: the tool measures the built mesh; it computes no lantern geometry and changes nothing in the
  design, the drawings, the takeoff, the PDF or the SketchUp export.
- The overlay is a DOM SVG over the canvas, never scene geometry, so it can never reach a sheet snapshot.
- JSON trumps JS: every size, angle and tolerance in a new `Na__Measure3d__Config.json`; colours as `--VghLantern_*`
  tokens. House style throughout, no new dependency, no localStorage, nothing saved to the design.
- The hover inspector stays exactly as it is when the tool is off, and is suspended (no hover, no pin) while a measure
  tool is on.

---

## 2. Decisions (Adam's Answers, 21-Oct-2026)

1. **Square to Face: yes.** Face to Face also snaps square to the first face (SketchUp's magenta), so sloped bars,
   hips and the glass measure straight; the Down arrow locks it.
2. **The TrueVision look.** A finished dimension keeps the axis colour it snapped to (purple if free), ticked ends
   (a vertex's dotted), the value along the line in Vale blue with a white edge. Not Polycam's purple pill.
3. **Cut faces measure too.** With a cross section on, the member profiles where the cut passes snap like the model.
4. **Whole millimetres every visit.** 0.01 mm lasts the session and is never saved.

---

## 3. A New System Folder: `28__System__MeasureTool3d` (Area `Measure3d`)

Built like `26__System__CrossSectionView`: its own folder, its own JSON, reached by the classic world only through the
render pipeline.

| File | Role |
|---|---|
| `Na__Measure3d__Config.json` | Feature switch, the two tools, snap angle, vertex aperture, precision options, overlay sizes |
| `VghLantern__Measure3d__ConfigAccess__.mjs` | The one read point for that block (mirrors CrossSection's) |
| `VghLantern__Measure3d__SystemLogic__.mjs` | The public face: tool on or off, the measurements, pointer and keys, model rebuilds |
| `VghLantern__Measure3d__SnapSolver__.mjs` | BVH per mesh (cached by geometry), the face hit and its normal, the vertex under the cursor, axis and square snapping |
| `VghLantern__Measure3d__Overlay__.mjs` | The SVG drawn over the canvas every frame the model is drawn |
| `VghLantern__Measure3d__Glyphs__.mjs` | TrueVision's AutoCAD glyphs, ported |
| `VghLantern__Measure3d__Styles__Main__.css` | Overlay, tool bar and the menu list |

Plus `01__AppAssets__VghLantern\06__UiIcons__MenuIcons__MeasureTools\`: the five TrueVision SVGs copied as they are,
and one new icon in the same style, `Icon__MeasureTools__VertexToVertex__.svg` (two endpoint boxes joined), because
none of the five shows two vertices. Face to Face uses Linear (two faces seen edge on, the arrows between them).

---

## 4. Feature Design

### 4.1 The Measure section (fifth in the 3D View Tools card, tape measure icon, closed by default)

- **Tools:** Vertex to Vertex, Face to Face (icon and name; a second press turns the tool off).
- **Precision:** 1 mm (default) | 0.01 mm.
- **Measurements:** one row each: number, value, axis chip (Red X, Green Y, Blue Z, Square, Free), the X Y Z parts
  for a free one, the two parts it runs between (from the inspector's own names), a delete cross. Clear All asks twice.
- The explanation (snapping, the keys) sits behind the Vale "i", not as text in the panel.
- **The bar** while a tool is on, bottom centre: the tool's icon, "Click the first face" / "Click the second vertex",
  the live value and its state ("On Red Axis (X)", "Square to Face", "Free, 3.4 deg off Green (Y)"), Undo and Done.

### 4.2 Face to Face

- Hover: Polycam's reticle, a ring lying in the plane of the face under the cursor (an ellipse in perspective), with
  short red, green and blue ticks along the axes at its centre.
- First click fixes point A and its face normal. From A run the axis guides: red, green and blue dashed lines through
  A across the view, and the free ray (purple) from A to the cursor.
- When the ray is within the snap angle of an axis it turns solid in that axis's colour and the end point becomes the
  point where that axis line through A meets the plane of the face under the cursor. So between two glaze bar faces
  the dimension is exactly the clear gap wherever on the second face you click.

### 4.3 Vertex to Vertex

- Hover: the vertex nearest the cursor within the aperture (14 px), found with the BVH and checked visible (a ray from
  the eye must not meet anything first; glass is see-through, as in the drawings), boxed with the AutoCAD endpoint
  square in the snap purple, its name tag beside it ("Vertex, Glaze Bar Core").
- First click boxes A and keeps the box; the second vertex is boxed the same way. Same guides and ray as 4.2. Snapped,
  the dimension is the axis part of A to B (as AutoCAD's linear dimension), drawn along the axis with a faint dashed
  witness line to B so it is plain which vertex it refers to. Free, it is the true 3D distance.

### 4.4 The straight line nudge, and locks

- Snap angle 6 degrees (provisional, in config). Locks as SketchUp: Right arrow red, Left green, Up blue, Down square
  to face; press again to release. As TrueVision: Shift holds the nearest axis whatever the angle, Alt measures free.
- Escape: cancel the point in progress, then deselect, then the tool off. Delete or Backspace removes the selected one.

### 4.5 The graphics

TrueVision's sizes (line 2.2 px, ticks, 14.4 px semibold value with a white edge, grips, the red delete chip, the 27 px
glyph) over SketchUp's axis colours: red `#dc2626`, green `#16a34a` (TrueVision's two), blue `#2563eb`, square to face
magenta `#db2777`, free and snap purple `#9333ea` (TrueVision's snap colour). Drawn on top of the model, never hidden by
it. Vertex dimensions end in small boxes, face dimensions in dots.

### 4.6 Precision and the numbers

Distances from the built mesh in world metres, shown in millimetres to 0 or 2 decimal places (rounded to nearest).
The mesh stores float32 metres, good to about 0.001 mm at lantern sizes, so 0.01 mm is honest.

### 4.7 Life of a measurement

Kept on the 3D View surface for the session: through orbits, presets, element views, display modes, cuts and leaving
the tab and coming back. Cleared when the lantern itself changes (an edit or another lantern selected), so a dimension
never describes a model that is no longer on screen. Never saved, never printed, never exported.

---

## 5. Work List

New: the seven files in section 3, `VghLantern__Viewport3d__MeasurePanel__.js` (the list and the bar, classic), the
six icons.

Modified: `Viewport3d__Controls` (the section), `Viewport3d__Layout` (callbacks, attach, mode exit),
`Viewport3d__MenuDataHandler` (one section flag), `Viewport3d__Styles__Main` (the section's buttons),
`Env3d__RenderPipeline` (the measure API, rebuild and dispose hooks), `Env3d__HoverInspector` (suspend),
`Env3d__SceneManager` (an `OnAfterDraw` hook), `AppCore__ConfigLoader` (the overlay), `UserMenuConfig__Defaults`
(`MenuSectionMeasureOpen`), `Na__InfoTooltip__Config.json` (the "i"), the CSS hub, the Variables sheet (seven
tokens), `index.html` (one script tag), the main config's AppVersion, the service worker token, the DEVLOG and README.

No change to the geometry, the drawings, `MODEL_BUILD_TOKEN`, the takeoff, the PDF or the SketchUp payload.

---

## 6. Build Order (Each Stage Leaves the App Running)

1. Icons, config, ConfigAccess, glyphs, tokens; the Measure section with its buttons wired to a tool that only shows
   the bar.
2. Face to Face end to end (BVH, reticle, guides, snapping, finished dimensions).
3. Vertex to Vertex (vertex search, visibility, the boxes).
4. The list, selection, delete, Clear All, precision, keys, the "i".
5. Checks (syntax, JSON, a headless test of the snap maths in moved and rotated meshes, the pre-ship smoke), version,
   DEVLOG, README; hand over.

---

## 7. Not in This Build

Area, angle and polyline totals; edge midpoints; snapping to setting-out linework; measuring in the editor's 3D panel
or on drawing sheets; saving or exporting measurements; Polycam's Rescale.
