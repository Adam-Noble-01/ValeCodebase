# SketchUp Export

Writes the lantern on screen as a millimetre **build payload** that the Vale Lantern
Importer reconstructs in SketchUp as a tagged, grouped, solid model.

---

## The shape of the thing

```
Lantern Editor  ->  SkeletonSolver          the single geometry brain
                    GlazeBarLayout
                    BaseFrameAssembly
                    InteriorJoineryAssembly
                          |
                          |  solved millimetre answers
                          v
                    80__System__SketchUpExport      <- this module
                          |
                          |  VghLantern__SketchUpExport__Payload  (JSON, mm)
                          v
                    Vale Lantern Importer            <- SketchUp plugin
                          |
                          v
                    Grouped, tagged solids in SketchUp
```

The exporter is a **third pure consumer** of the solved geometry, sitting alongside
the two render environments. It computes no geometry of its own.

---

## Why the payload is a recipe, not a configuration

The obvious export would be the lantern's config block (width, depth, pitch, bar
spacing) plus a Ruby importer that solves it. That would be a second geometry brain,
in a second language, that has to agree with the first one forever. It would not.

So the payload carries **fully resolved vertices**. Every mitre, plumb cut and eaves
extension is applied before the file is written, and the importer's whole job is to
turn point lists into faces. A change to how a hip meets a ridge lands in the solver,
flows through the 3D viewport and the exported model together, and needs no plugin
update at all.

---

## Files

| File | Does |
|---|---|
| `Na__SketchUpExport__Config.json` | SSOT for the schema stamp, tag and material vocabulary, part naming and build switches. Merged by the ConfigLoader. |
| `VghLantern__SketchUpExport__SweepGeometry__.js` | The **only** file that builds vertices. Section plus member in, two vertex rings out. |
| `VghLantern__SketchUpExport__PartFactory__.js` | Stamps one prism or instance into a payload record. Owns naming, rounding, tag and material lookup. |
| `VghLantern__SketchUpExport__Encoders__BaseAndRoof__.js` | Builders upstand, three part base frame, vergeboards, glazing. |
| `VghLantern__SketchUpExport__Encoders__RidgeAndHips__.js` | The six part ridge, the four part hip on every hip, and the octagonal block they die into. |
| `VghLantern__SketchUpExport__Encoders__GlazeBars__.js` | The three part glaze bar on every solved bar datum. |
| `VghLantern__SketchUpExport__Encoders__JoineryAndComponents__.js` | Interior joinery ring, finial definitions and instances. |
| `VghLantern__SketchUpExport__Encoders__SettingOut__.js` | Datums, construction triangles and centrelines. |
| `VghLantern__SketchUpExport__PayloadBuilder__.js` | Assembles the document. The single public entry point. |
| `VghLantern__SketchUpExport__FileWriter__.js` | Serialises and downloads. |

---

## Two primitives, and that is all

Every solid in a Vale lantern is the same shape, so the payload speaks one:

**`prism`** — two rings of millimetre points plus the ring spans saying which run of
each is an outer loop and which is a hole. A glaze bar, a mitred head beam, a hollow
builders upstand and a pane of glass are all that shape.

```json
{
  "Kind": "prism",
  "Name": "GlazeBarCap__long+__03",
  "TagKey": "glazeBarCap",
  "MaterialKey": "frameFinish",
  "Rings":   [ { "Start": 0, "Count": 14 } ],
  "PointsA": [ [-1420.5, -1500.0, 100.0], ... ],
  "PointsB": [ [-1420.5, 0.0, 799.6], ... ],
  "Attributes": { "PartCode": "45_1021", "BarId": "...", "DatumLengthMm": 1655.2 }
}
```

**`instance`** — a placed copy of a mesh definition, given as an origin and three axis
vectors. Covers the finials.

**`linework`** — a set of open or closed polylines, built as edges with no faces and
no material. Covers the setting out. An optional `GroupKey` nests the part one level
deeper, which is what turns 22 glaze bar centrelines into one collapsible outliner
entry rather than 22 siblings.

---

## Setting out

Everything the 3D view's **Setting Out** display mode draws travels into the payload
as its own assembly, and the importer builds it or skips it as a separate choice from
the metal.

| | |
|---|---|
| **Datum** | A named level or plane the factory cuts to. Rings, run lines and sloped planes. Upstand, head beam, eaves, ridge, roof deck, glazing. |
| **Construction** | The derivation triangles. Emitted as one closed three-point ring — foot, corner, head — carrying its own measured run, rise, hypotenuse and pitch as attributes. |
| **Centreline** | Member axes exactly as the solver placed them. One entity per family, so all the glaze bar axes are one group. |

**Colours and dashes are not configured here.** Each entity's style key is its own
`Class__Family` — `Datum__Ridge`, `Construction__Hip` — looked up live in
`VghLantern__Env3d__Config__SetOut.LineStyles`, which is the block the 3D view already
draws from and the legend already labels from. Recolour the eaves datum there and the
viewport line and the legend swatch move together.

## Materials must be named from the SSOT, or they die on the way out

`Na__TrueVision__GlbBuilder` enriches a SketchUp material only when its name matches
`/^MAT\d{3}__/` **and** appears in `Na__DataLib__CoreIndex__Materials__.json`. A material
failing either test reaches the GLB with no `alphaMode`, no opacity and no double-sided
flag.

The model looks correct in SketchUp either way, which is what makes this invisible until
someone opens ValeVision3D and finds a roof full of glass rendering as opaque white.

So material rows carry `SsotMaterialId`, and the importer creates them under the index's
own name:

| Role | Imports as | Enriched |
|---|---|---|
| glazing | `MAT101__Glass__ClearDefault` — the exact swatch Element Studio Pro uses | yes |
| sapele | `MAT541__Timber__Sapele` | yes |
| timber | `MAT120__Wood__TimberDefault` | yes |
| buildersUpstand, millAluminium, leadFlashing, plywood | `VGH__…` | **no** |

The four unmapped roles have no honest equivalent in the index (`MAT616` is *ironmongery*
brushed steel, not mill-finish extrusion). Frame and joinery finishes are unmapped for a
sharper reason: `MAT300__PaintSeries__` carries four Farrow and Ball colours against the
lantern's seven, and a partial mapping would render two finishes enriched and five not.

Add MAT entries and fill in `SsotMaterialId` if any of them need to match.

```bash
node 60__Dev__WebBuildUtils/VghLantern__DevCheck__SketchUpExport__MaterialSsot__.cjs
```

Reads `INDEXED_MATERIAL_REGEX` out of the GLB builder's own source rather than retyping it,
and asserts the glazing passes both tests and matches what Element Studio Pro builds with.

---

### The SketchUp side is governed by Na__DataLib

Those same 14 colours are transposed into the Noble Architecture standard at
`Na__Common__DataLib__CoreSuEntityStandards/Na__DataLib__CoreIndex__EdgeMaterials__.json`
→ `Na__DataLib__CoreIndex__ConstructionLinework` → `MTE300__ConstructionLineSeries__`.

Each entry carries the **colour and the line type together**, because a construction
line is only readable when the two agree, plus the MTE edge material name, the tag name
and `SourceStyleKey` — the web app's own key, which is how the importer looks it up
without either side knowing the other's naming.

The importer loads it through `Na__DataLib__CacheData.Na__Cache__LoadData(:edge_materials)`,
the same web → cache → local-fallback path `Na__EdgeUtil__PaintDeepNestedEdges` uses.
**DataLib wins where it can answer; the payload's own colours are the fallback** for a
class the standard has not caught up with. That ordering makes the standard authoritative
without a new setting-out class ever failing to import.

Edges are painted **per edge** with the MTE material (`edge.material=`, the same call the
Edge Painter makes), so imported datums are legible to the rest of the toolchain. Tags
are created with `Layer#line_style=` from a `Sketchup::LineStyle` fetched by name.

> **The line style names are case sensitive and fixed by the running SketchUp.**
> `Dash dot` is legal. `Dash Dot` is not — and it fails by silently leaving the tag
> solid rather than by raising. The authoritative list is
> `Na__DataLib__CoreIndex__Tags__.json` → `LineStyleReference.AvailableLineStyles`.
> Do not guess these, and do not use the Styles-panel names (`Dotted Basic`,
> `Short Dashes Basic`) — those are a different subsystem and are not valid here.

Every setting-out tag is also listed in `ExportExclusions.AdvancedSwapOffTagNames`, so
the Edge Painter's Apply Line Thickness Tags leaves them alone. Without that it would
find an MTE colour with no entry in `03__LayoutDrawingLineworkTags__` and move the edge
to Untagged, stripping the setting out off an imported lantern.

**Why edges rather than SketchUp guides.** A guide cannot carry a colour, and the
whole value of this linework is that a ridge datum is red and a hip triangle green.
Guides are also wiped as a set by Edit > Delete Guides, which would take the user's own
guides with them. Tags carry dash patterns; guides do not.

**The datum checks travel too.** The solver's own 16 checks — measured against
reported, with delta, tolerance and pass/fail — are stamped onto the setting out group,
so a file found six months later still says whether it agreed with itself when it was
exported.

**If a count looks wrong**, it came from the model, not the exporter: one polyline is
emitted per solved segment. A lantern showing 22 glaze bar centrelines where you
expected 40 has had its target bar spacing changed.

---

## The winding contract

Sections arrive already normalised by `SectionLoopBuilder`: **outer rings counter
clockwise in the section frame, holes clockwise.** Every ring is emitted in that same
order.

That is what lets the importer raise one wall quad per section edge in the given order
and get an outward normal every time, on the holes as well as the outside. Get it
wrong and the solid imports inside in.

Two independent safety nets exist anyway, because a bad section is a silent failure:

1. The importer sums the **signed volume** of the finished shell and reverses every
   face if it came out negative. Exact for concave sections, unlike the usual
   centroid test.
2. A regression check exercises the real `SweepGeometry` module against a bar, a
   rafter, a hip, a hollow upstand, a mitred ring side and a glass slab, asserting a
   positive signed volume and outward wall normals on each:

   ```bash
   node 60__Dev__WebBuildUtils/VghLantern__DevCheck__SketchUpExport__Winding__.cjs
   ```

   It also asserts the plan mitre opens the outboard edge by exactly one head beam
   width at each end (250 mm over a side), and that the upstand's reveal ring is wound
   to subtract rather than add. Run it after any edit to `SweepGeometry`.

A second check runs the **real geometry brain** against a real project lantern and
reports the setting-out linework the payload would carry:

```bash
node 60__Dev__WebBuildUtils/VghLantern__DevCheck__SketchUpExport__SettingOut__.cjs
```

No browser and no fetches — the network-backed loaders are absent and the geometry
modules fall back to their documented constants, which is the path they are written
for. It asserts every part resolves to a declared tag, no coordinate is NaN, triangles
are closed three-point rings, centrelines are open, and — the one that matters — that
each triangle's **emitted corners** agree with the run, rise and hypotenuse stamped
beside them. Run it after any edit to `Encoders__SettingOut` or `SettingOutModel`.

---

## Coordinates

Millimetres throughout. Origin at the centre of the lantern footprint, at builders
upstand **base** level. `+X` width, `+Y` depth, `+Z` up.

That is the SkeletonSolver convention unchanged, and it maps straight onto SketchUp's
own Z-up axes with no swap — only a scale by 1/25.4. The Three.js environment's axis
swap does **not** appear anywhere in this module.

---

## The SketchUp side

The importer is a separate plugin, version controlled in the SketchUp Plugins repo
rather than here, because that is where the rest of the Noble Architecture SketchUp
tooling lives:

```
Plugins/Na__ValeLanternImporter__Loader.rb                       loads on SketchUp start
Plugins/Na__ValeTools__LanternImporter__Modules__/
    02__Src__AppModules/
        01__AppCore/           Main            entry, file picker, module chain
        02__AppData/           PayloadReader   read, validate, report
        03__AppUtils/          Units, DebugTools, TagManager, MaterialManager
        04__GeometryBuilders/  PrismBuilder, MeshBuilder
        05__Assembly/          ModelComposer   the group hierarchy
```

**To run an import:** Plugins > Vale Lantern Importer, or from the Ruby console:

```ruby
Na__ValeLantern.na_import                # the metal alone
Na__ValeLantern.na_import_with_setout    # metal plus construction linework
Na__ValeLantern.na_import_setout_only    # linework alone, to check an existing model
```

One exported file serves all three. The importer filters on each assembly's `Role`, so
the exporter can add a second class of linework later without the plugin learning its
name.

**The ridge and hip rework needed no plugin change at all**, which is the design paying
out rather than a corner cut. The importer carries no part vocabulary: tags come from the
payload's `Tags` table by key, materials from `Materials`, groups from `Assemblies`, and
the only part kinds are `prism`, `instance` and `linework` — all three already handled.
Eleven new tags, a third finish swatch, twenty-four new parts and a second mesh definition
all arrive as data. `Model.Definitions` is prepared once at the top level and instances
resolve by key, so the block's definition works from the roof frame assembly even though
the finials' come from components; and `Geom::Transformation.axes` takes the block's plan
rotation directly. The schema went to 1.1.0, which is a MINOR — `NA_SUPPORTED_MAJOR` stays
at 1.

**To reload after editing a module** without restarting SketchUp, paste one line:

```ruby
load "C:/Users/adamw/AppData/Roaming/SketchUp/SketchUp 2026/SketchUp/Plugins/Na__ValeLanternImporter__Loader.rb"
```

**When a part comes out wrong**, `Na__ValeLantern.na_import_verbose` names every prism
as it is built, every coplanar merge and every face the API refused.

---

## Schema versioning

`Meta.SchemaVersion` is `MAJOR.MINOR.PATCH`. The importer refuses a MAJOR it was not
written against and accepts any MINOR or PATCH.

- **MINOR** — a new part Kind or a new optional field. An older importer ignores what
  it does not recognise and still builds a correct, slightly less complete lantern.
  Better than refusing to open the file.
- **MAJOR** — a field changes meaning. An older importer would build something
  confidently wrong, so it must not try.

Bump `SchemaVersion` in `Na__SketchUpExport__Config.json`; bump `NA_SUPPORTED_MAJOR`
in the importer's `PayloadReader` only for a MAJOR.

---

## The eaves cap end extension

**Almost nothing physically stops on the eaves datum.** The solver puts the hips and the
glazing faces there, but the glaze bar cap runs **170 mm further down the pitch** past the
datum to cover the eaves junction. Anything left on the datum floats short of the roof
edge — a hip nose hanging in the air above the corner, a pane stopping short of the cap
ends with the eaves detail left open.

Two things are therefore extended, exactly as the 3D viewport extends them, both from the
same number in the base frame system index (`EavesInterface.GlazeBarCapExtensionAlongPitchMm`):

| | How |
|---|---|
| **Hips** | The lower end slides down the hip's **own axis** until it reaches the level of the cap ends (`datum − extension × sin(pitch)`), which by the roof plane geometry also lands it on the extended eaves line. Sliding along the hip axis rather than down the slope is what keeps the nose on the hip line, so the two roof planes still meet on it. |
| **Glazing** | Every eaves vertex slides along its **own upslope boundary edge**, extended — for a corner that edge is the hip, so the pane's mitred side stays collinear with the hip line rather than swinging sideways. The slide is scaled so its down-slope component is exactly the cap extension. |

On an equal-pitch hip the two adjacent panes extend along the **same 3D hip line by the
same amount**, so their extended corners coincide and no gap can open. That coincidence is
asserted by the check below.

**The solved geometry is never mutated.** Extended copies are swept, and `DatumLengthMm`
and `DatumAreaSqMm` still travel in each part's attributes alongside `EavesExtendedMm`, so
the setting-out centrelines, the cutting lengths and the area takeoff all keep the datum
numbers while the solid reads correctly.

```bash
node 60__Dev__WebBuildUtils/VghLantern__DevCheck__SketchUpExport__EavesExtension__.cjs
```

Asserts the exported hip noses and pane feet land on the same level as the real glaze bar
cap feet (queried from `BaseFrameAssembly`, not recomputed), that the extension is not a
no-op, and that adjacent panes share their extended hip corners exactly.

---

## The ridge and the hips

Both were a single placeholder profile swept along a centreline until 12-Aug-2026.
They are now the assemblies they are on the shop floor, and the payload says so:

| | Parts |
|---|---|
| **Ridge** | core, beam, blocking, lead flashing, capping block, capping — six on an Aluminium Capped Ridge, four on a Leaded Only Ridge |
| **Hip** | core, beam, blocking, lead flashing — four, on every hip |
| **Block** | the octagonal turned block at each ridge end, placed as an `instance` like a finial |

That is 24 selectable objects on a hipped lantern where there were five. The
granularity is the point: a cutting list needs the lead lengths apart from the
timber lengths, and they are not the same number.

**The encoder computes nothing.** Every millimetre comes from
`VghLantern__Geometry__RidgeAssembly` and `VghLantern__Geometry__HipAssembly`, the
same two modules the 3D viewport asks — the pitch adaptation, the timber depth
stretch, the plumb cut planes and the hip covering's oversail are all applied
before this module sees them.

**The ends all differ, and the differences are the detail:**

| | |
|---|---|
| ridge beam | plumb cut 67.5 mm short of each block centre, dying on the octagon's facet |
| ridge others | run the full ridge datum length and pass over the block |
| hip beam | plumb cut on the block facet at its head, 18 mm inboard of the eaves datum corner at its foot |
| hip core | 42.5 mm past the eaves datum onto the extrusion it welds to, the same number a glaze bar core takes |
| hip covering | **oversails** to the outer edge of the glass, level with the glaze bar cap ends — 231.4 mm along the hip at 22.5 degrees, and *longer* at a shallower pitch |

**The beam depth is pitch derived and can be overridden.** The depth pair comes
from `VghLantern__RidgeHipSystem__TimberDepthTable__.json`, snapped to the nearest
tabulated pitch, and each beam carries `BeamDepthMm`, `StandardDepthMm` and
`DepthStandardPitchDeg` so a file found later says which standard it was built to.
An override that hit its limit is pushed into the payload warnings.

**The block is stretched before it is encoded.** A ridge beam deeper than the
230 mm standard would push its moulded underside through the block's turning, so
the straight prism grows by the beam's own depth delta while the turning travels
rigid. One definition however many placements — both blocks are the same component
at the same depth.

```bash
node 60__Dev__WebBuildUtils/VghLantern__DevCheck__SketchUpExport__RidgeAndHips__.cjs
```

Runs the real geometry brain, the real system loaders (fetch backed by the
filesystem, so the loaders run their own code path rather than being stubbed into
agreement) and the real encoder against a project lantern. Asserts every part is
exported once per member, every tag and material key resolves, no coordinate is
NaN, **every prism is wound outward** by its own signed volume, both beams report
the same standards row, and a Leaded Only Ridge drops exactly the capping and its
block and nothing else.

### The tags were renumbered

One ridge tag and one hip tag became six and four, matching the real assemblies
the way the glaze bar's three already did, and everything after them shifted up:
14 tags became 24. A model carrying an import made before that date keeps its old
`VGH__05__RoofFrame__Ridge` alongside the new ones — the importer creates tags by
name and has no way to know the old one was the same thing.

### The ridge capping carries a third finish key

It follows the exterior finish exactly as the glaze bar cap does, and a lantern may
diverge it. So it gets its own material **key** while sharing the frame finish's
**naming**: where the two agree both keys resolve to one SketchUp material name and
the importer reuses a single swatch, and where they diverge the names differ and
two are created. No caller has to test whether they match.

---

## The one duplicated construction

`SweepGeometry__PrismAlongRingSide` repeats the mitre-slide from
`VghLantern__Env3d__MeshBuilder__BaseFrameAssembly` — about thirty lines.

That is deliberate, not an oversight. The Env3d version is welded to THREE.js buffer
construction and world-space axis swapping, neither of which belongs in an exporter
that speaks millimetres. Both consume the **same** upstream answers (`DatumRing` and
`SectionsForPitch` from `VghLantern__Geometry__BaseFrameAssembly`), so the sections
and the ring they are swept around can never disagree; only the vertex assembly is
written twice.

If a third consumer ever needs it, `SweepGeometry` is the copy to hoist into
`04__MathUtils__LanternGeometry`.
