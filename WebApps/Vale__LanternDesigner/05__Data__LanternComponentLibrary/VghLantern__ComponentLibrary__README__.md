# VghLantern Component Library

Discrete objects placed at a point on the lantern — finials, finial bases,
cresting and ventilation. Cross-sections swept along skeleton lines (glazing
bars, ridge caps, builders upstands) live in `06__Data__LanternProfileLibrary` instead.

---

## Folder structure

```
05__Data__LanternComponentLibrary/
├── VghLantern__ComponentDataIndex__.json   ← GENERATED — never hand-edit
├── VghLantern__ComponentLibrary__README__.md
├── VGH_FIN0000__Finials/
├── VGH_FIN0100__FinialBases/
├── VGH_CRS0000__Cresting/
├── VGH_VNT0000__Ventilation/
└── 3dAssets__Glb/                          ← heavier meshes referenced by URL
```

File naming: `VghLantern__Component__{AssetId}__{ShortName}__.json`

Asset id format: `VGH_{TYPE}{NNNN}` — `FIN`, `CRS`, `VNT`. The numeric block
matches the category folder prefix so an id sorts into its folder on sight.

---

## Asset schema

Identical unified schema to the profile library, so an asset exported from
SketchUp by `65__Dev__CadObjectBuilder` drops straight in.

| Block | Purpose |
|---|---|
| `meta` | Schema version, generator, source model |
| `Na__Asset__Metadata` | Id, name, category, description, revision, material, tags |
| `Na__Asset__Profile2D` | Closed outline in millimetres — gallery thumbnail and elevation linework |
| `Na__Asset__Mesh3D` | Optional inline mesh for light components |
| `Na__Asset__Glb3D__Url` | Optional GLB in `3dAssets__Glb/` for heavier meshes |
| `Na__Asset__Has2dProfile` / `Na__Asset__Has3d` | UI gating flags |
| `Na__Asset__PlacementBehaviour` | Applicable roles, anchor point, alignment, repeat pitch |

### The 2D / 3D split

A component may carry 2D linework, 3D geometry, or both. The two flags let the
UI gate cleanly without loading the asset:

- `Na__Asset__Has2dProfile: true` — the Component Index gallery can draw a
  thumbnail and `VghLantern__Env2d__FinialRenderer__.js` can draw the object in
  elevation.
- `Na__Asset__Has3d: true` — the 3D environment has geometry to place, either
  inline in `Na__Asset__Mesh3D` or fetched from `Na__Asset__Glb3D__Url`.

Prefer inline `Na__Asset__Mesh3D` for small components; use a GLB in
`3dAssets__Glb/` once a mesh becomes heavy enough that inlining bloats the JSON.
`VghLantern__Env3d__ComponentLoader__Glb__.mjs` renders a sized placeholder box
when a component has no 3D geometry yet, so the model still reads correctly.

### Outline point convention

Points are `{ "x": <mm>, "y": <mm> }` in millimetres, counter-clockwise, closed
(do not repeat the first point).

- **Finials and bases** — origin is the seating point where the object meets the
  surface below it. X is centred on the vertical axis, Y rises. Finials may set
  `Na__Asset__Profile2D__IsRevolveOutline: true` when the outline is a turned
  profile suitable for revolving about Y.
- **Cresting** — origin is the seating point at the centre of **one repeat**. X
  spans one full repeat (`RepeatPitchMm` wide), Y rises to the tip. Renderers
  tile the outline along the ridge run.
- **Vents** — origin is the centre of the pane the vent replaces. X runs across
  the slope, Y runs up the slope, so the outline is the frame extent seen square
  onto the slope.

`VghLantern__Env2d__FinialRenderer__.js` places these outlines by adding local X
to the anchor and subtracting local Y (SVG Y runs downward), so positive Y is
always up on screen.

---

## Applicable roles

Each asset declares the roles it may fill. The editor builds its dropdowns from
these declarations (`OptionsSource: 'components:<role>'`), so no module
hardcodes a category-to-role table.

| Role key | Assigned by |
|---|---|
| `finial` | `Lantern__Finials__Config__FinialComponentId` |
| `finialBase` | `Lantern__Finials__Config__FinialBaseComponentId` |
| `cresting` | `Lantern__RidgeAndHips__Config__CrestingComponentId` |
| `vent` | `Lantern__Ventilation__Config__VentComponentId` |

---

## The index is generated output

`VghLantern__ComponentDataIndex__.json` is rebuilt by
`60__Dev__WebBuildUtils/VghLantern__BuildUtil__ComponentDataIndex__.py`, which
walks the category folders and derives each index entry from the asset's own
metadata. **Never edit it by hand** — the next build overwrites the change.

Add a component by dropping the JSON into its category folder and rerunning the
builder. `VghLantern__AppData__ComponentIndexLoader__.js` is the only consumer;
it fetches `/api/component-index` first (served `no-store`, so the index stays
live while authoring) and falls back to the static file.

---

## Data status

Every example asset carries
`Na__Asset__Metadata__DataStatus: "Provisional …"`. The dimensions are
representative placeholders that let the pipeline render and schedule end to
end; they are **not** verified Vale product data. Replace them with measured
components before the tool is used for production output.
