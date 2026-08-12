# VghLantern Component Library

Discrete objects placed at a point on the lantern — finials and cresting.
Cross-sections swept along skeleton lines (glazing bars, ridge caps, builders
upstands) live in `06__Data__LanternProfileLibrary` instead.

---

## Folder structure

```
05__Data__LanternComponentLibrary/
├── VghLantern__ComponentDataIndex__.json   ← GENERATED — never hand-edit
├── VghLantern__ComponentLibrary__README__.md
├── 50__Roof__Finials/
└── 55__Roof__Crestings/
```

Folder names follow the main Noble Architecture component library standard:
`{NN}__{Zone}__{PluralCategory}`. The folder **is** the classification — the
build utility reads the placement role, display name and sort order from its
`CATEGORY_RULES` table keyed by folder name. Adding a category means adding a
folder and a rule, never editing the generated index.

File naming: `{ProductCode}__{Type}__{Descriptor}__.json`, e.g.
`50_1001__Finial__Ball__.json`. The product code is the leading digit block and
becomes the `AssetId`.

---

## Asset schema

Two schemas are supported side by side.

### Na__Asset__UnifiedComponentSchema (current)

Exported by the **Export tab** of Na Component Editor Tools in SketchUp. One
file carries every view of one physical component:

| Block | Purpose |
|---|---|
| `meta` | Schema version, generator, source model, export warnings |
| `Na__Asset__Metadata` | Id, name, revision, data status, material, tags |
| `Na__Asset__ValeSpecification` | Product code, supplier, finish, notes |
| `Na__Asset__Elevation2D__Front` | Front elevation drawing linework |
| `Na__Asset__Elevation2D__Right` | Right elevation drawing linework |
| `Na__Asset__Plan2D__Top` | Plan drawing linework |
| `Na__Asset__Mesh3D` | Vertices, faces, per-vertex normals, edges |
| `Na__Asset__ObjectHierarchy3D` | Nested group and component transforms |
| `Na__Asset__PlacementBehaviour` | Roles, anchor point, overall height |

Each 2D block holds `Na__Geometry__Paths` — a list of `Line`, `Arc`, `Circle`
and `Polygon` primitives in millimetres — plus a bounding box and counts. This
is drawing linework, not a single closed outline: a turned finial exports as its
real silhouette with its ring lines, exactly as it appears in SketchUp.

### The earlier hand-authored format

`Na__Asset__Profile2D` (one closed outline) with an optional
`Na__Asset__Glb3D__Url`. Still read, still rendered. Both the 2D renderer and
the 3D loader prefer the unified blocks and fall back to these, so a library
part way through re-export keeps working.

---

## The origin point is the insertion point

Every asset is authored about the `00__OriginPoint` group captured in SketchUp,
so local `0,0,0` is the seating point and **placing a component is putting its
local origin on the anchor** — in 2D and in 3D, with no per-asset offset table
to maintain.

An asset may reach below its origin. The ball finial extends 30 mm down as a
spigot that buries into the ridge; the index records this as
`DepthBelowOriginMm` so a renderer can reason about it without loading the
geometry.

Finial anchors are published by the SkeletonSolver at the two ridge ends, or at
the single apex on a pyramid roof.

---

## Loading is on demand, and cached per session

A unified export is **one to three megabytes** — the spire finial alone is
2.8 MB. Loading the library up front would cost tens of megabytes for a lantern
that uses two components, so:

- `VghLantern__AppData__ComponentIndexLoader__.js` loads only the index and
  resolves ids to URLs.
- `VghLantern__AppData__ComponentAssetCache__.js` fetches an asset the first
  time something asks for it and holds it for the life of the page, trimming to
  a byte budget on a least-recently-used basis. Switching between two finials
  repeatedly costs one fetch each, ever.
- The cache is memory only and deliberately not persisted. Persisting would buy
  a faster second visit at the price of a cache-busting scheme to invalidate a
  re-exported asset, and during authoring that trade is the wrong way round. A
  new session re-fetches.

### Card previews cost nothing

The editor shows finials as picture cards before the user has chosen any of
them. Fetching every asset just to draw thumbnails would defeat on-demand
loading entirely, so the build utility **bakes each asset's front elevation into
the index** as one compact SVG path (`Preview2d`). The whole index including
every preview is about 13 kB against 3.9 MB of asset files.

---

## The index is generated output

`VghLantern__ComponentDataIndex__.json` is rebuilt by
`60__Dev__WebBuildUtils/VghLantern__BuildUtil__ComponentDataIndex__.py`, which
walks the category folders and derives each entry from the asset's own content.
**Never edit it by hand** — the next build overwrites the change.

Add a component by dropping the JSON into its category folder and rerunning:

```
python 60__Dev__WebBuildUtils/VghLantern__BuildUtil__ComponentDataIndex__.py
```

`VghLantern__AppData__ComponentIndexLoader__.js` is the only consumer; it
fetches `/api/component-index` first (served `no-store`, so the index stays live
while authoring) and falls back to the static file.

---

## Applicable roles

Each asset declares the roles it may fill, and the build utility supplies the
role from the category folder when the exporter left it blank (SketchUp has no
concept of a lantern placement role). The editor builds its option lists from
these declarations, so no module hardcodes a category-to-role table.

| Role key | Assigned by |
|---|---|
| `finial` | `Lantern__Finials__Config__FinialComponentId` |
| `cresting` | `Lantern__RidgeAndHips__Config__CrestingComponentId` |
| `vent` | `Lantern__Ventilation__Config__VentComponentId` |

The `finialBase` role was retired 12-Aug-2026 with the `45__Roof__RidgeCaps`
folder. The block seating a finial onto the ridge is now the octagonal block
`RidgeAssembly` builds from the ridge system index, sized off the beam depth for
the pitch, rather than a component picked from a list.

Note that the solver names an anchor by **where** it is (`ridgeEnd`, `apex`)
while the lantern names a component by **what** goes there (`finial`). The two
vocabularies are joined in the renderers, not in the data.

---

## Data status

The SketchUp-exported assets carry
`Na__Asset__Metadata__DataStatus: "Draft - auto-captured …"`, and the older
worked examples carry `"Provisional …"`. Neither is verified Vale product data.
Fill in the `Na__Asset__ValeSpecification` block and revise the status before
these are used for production output.
