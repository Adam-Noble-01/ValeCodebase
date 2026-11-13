# ValeVision 3D - Vegetation System: Linework Plants, Their Menu, Library and Placement Tools

**Status**: All nine stages built (v2.83.0, v2.84.0, v2.85.0, 04-Nov-2026), the last seven in one release at Adam's word: "go back and read my first message and dont stop until feature is complete". Stages 1 and 2 are live on the server since 15:19 UTC that day; v2.85.0 is on the PC until pushed. No real project holds the key yet. Still open: 100 plants at 30 fps on a real iPad, and Stage 9 has not touched a real SketchUp entity (section 8).
**Created**: 04-Nov-2026
**Owner**: Adam Noble
**Base**: ValeVision3D v2.82.0. Line numbers below are as of that version: use them to find the place, then read the code.
**Prototype**: `85__EarlyStage__VegetationLinework` (its README says how the lines are made). Live hand-off for agents: `ValeVision__WORKING_MEMORY__VegetationSystem__.md`.

## 0. Adam's Brief

Adam's words, 04-Nov-2026:

> "Need a way to crate linework bushes etc that are convincing"

> "Use a similar proxy / rendered asset system as to keep assets lightweight for working with and have the renderer doo the work when it loads a view to draw the randomness, there should be rules for shape etc but then radnomisation to create convincing vegetation effect thats not repetative."

> "These look good, yes plan out the system and ensure a vegetation add a menu section called vegetation which can be toggled on if required via dev menu for the main menu that contains
> Vegetation toggle on/of - All users if the menu is active
> Vegetation transparency slider - All users if the menu is active
> Vegetation Assets (Opens a new asset browser panel) - For Dev Only
> Vegetation Placement Tools - Linear placement tool (a quick array tool allowing for drawing and editing paths thaty create vegetation like your demo, ensure each asset gets a sligtly random rot and scale (but add advanced parameters dropdown for use rto be able to configure ths feature too.
> Vegetation Bush tool, creates a pallette and you can assign proibability for the items in the selection so you can mix and match and brush the vegetation."

> "also add that lvegetation linework panel from the demo into a section for devs too and save all parameters to a new json object with nested keys eetc in my style per file that we enable the vegeation on"

---

## 1. Decisions

### Adam's answers (04-Nov-2026)

| # | Question | Answer | What it means |
|---|---|---|---|
| D01 | Is the look right? | "These look good" | The demo's line language is the target. Tuning continues through the Linework panel, not by rewriting the method |
| D02 | Dev switch off: do plants still draw? | One switch. **Since v2.89.0 on by default** (Adam: "make the admin ticked on boxes on by default now ... keep those gates so i can disable though"): the entourage plan, E15 | Dev Tools has one switch per project. Off: no menu, no plants, no cost, for everyone. On: the menu for staff on any project, for others when there are plants |
| D03 | What does transparency fade? | Whole plant | Lines and fill fade together, evenly, with the building showing through |
| D04 | How far beyond live 3D? | 3D pictures, drawings later | Stills, video and thumbnails show plants from the start. Plans and elevations get their own Show Vegetation tick as a late stage |
| D05 | SketchUp? | Both ways, like Sync Aura | Proxies appear in SketchUp and sync back, by a three-way merge. Stage 9 |
| D06 | Where do the settings live? | In each project's file | A new nested object in `ProjectData__<id>__.json`, only on projects where vegetation is enabled, holding every parameter |
| D07 | Who gets what? | As in Adam's list | On/off and Transparency for all users when enabled, clients and phones included. Assets and the Linework panel for devs |

### Defaults taken (say if any is wrong: each is cheap to change now)

| # | Default | Why |
|---|---|---|
| D08 | Placement Tools are dev only, like Assets | Only Assets was marked in the brief, but only AppAdmins can save to a project anyway |
| D09 | "Dev" means `Na__DevGate__IsAuthoringEnabled()` | The app's one test: AppAdmin, not a client link, not under `?authoring=off` |
| D10 | Module folder `24__System__Vegetation` | The 20s are the systems that put objects in the 3D scene (25 Interactions, 28 Grid, 29 Fog), and 24 is free. **Revised 04-Nov-2026 at Stage 1:** this said 94, the lowest free in the VV band, until Adam's rule of the same day replaced that one: "a free number in the band for what it is" (registry, rule 1) |
| D11 | Library at the app root, `53__Vegetation__AssetLibrary` | Sits with `52__LayoutEditor__HatchPatternLibrary`, same lane: pushed as code, no `Content` or `UserData` in the name |
| D12 | Asset Ids `VVL_CC_TTFI` | Adam's NPR numbering with its own namespacer: `VVL_07_1001` sits beside `NPR_07_1001` and its collection numbers mean the same |
| D13 | One JSON file per asset, no picture files, no SKP slot | Cards are drawn live by the same code as the scene, in a few milliseconds each. No factory to run, nothing to go stale |
| D14 | A project pins its own copy of each asset it uses | As NPR's plops carry their recipe: improving the library never changes a finished project. "Update to latest" is a deliberate click, per asset |
| D15 | Generators are versioned and never edited | A saved seed must draw the same bush for ever, so a change of look is a new generator, as NPR's rule "never change its draws" |
| D16 | A path saves its rules, not its plants | It is the rules-and-seed idea again: a path of any length costs about 1.6 KB (measured, four points) and stays editable |
| D17 | A brush stroke saves its plants | They depend on the surface under the pointer at that moment, and can then be edited one by one |
| D18 | Save is an explicit Save Vegetation button | As Save Drawing: red when changed, syncing, green. Closing with unsaved changes asks first. Undo and redo for the session |
| D19 | Viewers' on/off and transparency are remembered per device | `localStorage`, per project. Devs set the project's starting values in the record. **Superseded 13-Nov-2026 (v2.98.4):** every viewer opens at the record's values, and any staff save captures Show and Transparency (Adam: "captured at save ... the value for each indifivauaL project model is loaded with") |
| D20 | Plants belong to ValeVision only | Adam asked for this system "for ValeVision 3D". No TrueVision parity, recorded as VV-only in the registry |
| D21 | No sun shadows from plants at first | The sketch has none, and they need their own shadow-only geometry. Revisit once seen on a real project |
| D22 | Palettes are saved per project | Simple and self-contained. Starter palettes can ship in the library later |

---

## 2. What People See

```
Dev Tools                                              AppAdmin
└─ Vegetation
   ├─ Enable Vegetation on This Project   [switch]     creates the JSON object, shows the menu, draws the plants
   ├─ Start with plants showing           [switch]     the project's starting state for viewers
   ├─ Starting transparency               [slider]
   └─ Remove All Vegetation...                         type "delete" to confirm: it is final

Tools & Settings                                       the whole section hidden unless enabled
└─ Vegetation
   ├─ Show Vegetation                     [switch]     everyone, clients and phones included
   ├─ Transparency                        [slider]     everyone
   ├─ Vegetation Assets                   [opens panel] dev: the asset browser
   ├─ Placement Tools                                  dev
   │  ├─ Linear Tool                      [opens panel]
   │  └─ Bush Tool                        [opens panel]
   └─ Vegetation Linework                 [opens panel] dev: the demo's Line Rules panel
```

- **Enabling never deletes.** Switching off keeps the object with `Enabled` false, so switching back on restores everything. Only Remove All deletes (Adam, v2.76.2: "Delete should mean delete").
- **Clients get exactly two rows.** The `<li>` carries `data-na-client-menu`, and the dev rows are removed for anyone failing D09, so they are never in a client's page.
- **The dev panels follow the Layout Editor's look,** the one Adam calls the gold standard (v2.60.0), and float over the model as the demo's do.
- **Phones:** the two public rows work there. Dev panels are computer only.

### The Asset Browser (after NPR's Assets drawer)

A pull-out panel on the left. Search, categories by collection then type, filter chips behind a funnel, a **Rendered | Proxy** picture toggle, and a **Rendered | Proxy | Both** switch for the model itself, dev only.

- **Click a card, then click the model** to place one (NPR's gesture; Escape stops). Dragging a card on is a later nicety.
- **A + on each card** adds it to the Bush Tool's palette or the Linear Tool's mix.
- **A second tab, In This Project:** every path, stroke and single plop, to select, focus, move, turn, or take out. Selecting one shows its record, as the demo does.
- **Update to latest** on a pinned asset that the library has since improved (D14).

### The Vegetation Linework Panel

The demo's panel: Line weight, Inner weight, Inner arcs, Hooks, Curls, Pen lifts, Scallop size, Small bumps, with Reset, plus an **Advanced** dropdown holding the rest (segment size, the detail thresholds, fill tone, depth bias). Every value saves in the project's object (D06). The numbers under the demo's panel stay: plants in view, line segments, milliseconds.

### The Linear Tool

Draws paths that make vegetation, like the demo's planters.

- **Draw:** pick an asset or a mix, click along the planter, Enter or double click to finish, Escape to cancel. Plants appear as you go.
- **Edit:** select a path and its points get grips. Drag a grip, click a segment to add a point, Delete to remove one. The plants regenerate from the rules and seed, so editing never loses the arrangement it can keep.
- **Main parameters:** Spacing, Straight or Curved, Mix, New Seed.
- **Advanced dropdown, all per path, each starting from the asset's own defaults:**

| Parameter | Default | Note |
|---|---|---|
| Rotation variation | +/- 12 deg | Adam: "sligtly random rot" |
| Scale variation | +/- 10% | Adam: "and scale". Changes the plant's size, never the scallop's, so the line language holds |
| Height variation | +/- 8% | Apart from scale, so a run undulates |
| Spacing variation | +/- 15% | Or it reads as a colonnade |
| Side offset | +/- 60 mm | Off the line, so a row is not ruled |
| Depth across | Asset's own | Fits a plant to a narrow bed: the demo's beds needed 620 mm |
| Align to path | On | A long plant keeps its long side along the path. Round plants take free rotation |
| Fit last plant | On | Ends land on the path's ends |

- **Long plants:** Low Border Drift is laid as stretched runs along the path, not as a row of blobs.
- **Bake to plants** turns a path into single plops for hand editing (one way, with undo).

### The Bush Tool

Brushes plants on from a palette.

- **Palette:** a list of assets, each with a probability slider, the percentages shown live. Add from the browser with +. Named, several per project (D22).
- **Brush:** Radius, Density (plants per square metre), the same Rotation and Scale variation, Max slope, and a Minimum spacing so plants never stack.
- **Paint** by dragging; each plant is drawn from the palette by its probability, evenly but not regularly spaced, and set on the surface under it. An **Erase** toggle, or hold Alt, takes plants away. A ring on the surface shows the brush.
- **Orbit while armed:** the left button paints, so the middle button orbits, as in SketchUp, and the wheel still zooms. The Linear Tool takes plain clicks, so a left drag still orbits there, as the North pick does.
- **While painting** new plants show as proxies, and draw as lines on release, so the stroke stays smooth.
- **Undo** is per stroke. The tool's overlays are registered, so no export ever prints them.

---

## 3. How It Works

The prototype's method, moved in unchanged:

```
RULES (library JSON) + SEED + SIZE  ->  balls in 3D: masses, clumps, nubs            at load, once per plant
CAMERA + balls                      ->  outline, T-junctions, hooks, a few arcs      whenever the view changes
lines and fill                      ->  the app's own fat lines over a flat fill     every frame
```

### The module tree

`02__Src__AppModules/24__System__Vegetation/`, split so that everything heavy stays off the start-up path.

| Folder | File | Token | What |
|---|---|---|---|
| | `Na__Vegetation__.js` | `Na__Vegetation` | The one door in. Reads the record; loads the rest by dynamic import **only if this project is enabled**. A project without the key costs this file and nothing else |
| | `Na__Vegetation__AppConfig__.json` | | Tunables: defaults, budgets, limits, generator list |
| `01__Core__Engine` | `...__Random__`, `...__BushBuilder__`, `...__Contour__` | `Na__VegRand`, `Na__VegBuild`, `Na__VegContour` | From the prototype. No three.js, so they can move to a worker |
| | `...__PathModel__`, `...__BrushModel__` | `Na__VegPath`, `Na__VegBrush` | A path and seed to plants; palette draws and spacing. No three.js, so testable in Node |
| `02__Core__Data` | `...__SceneData__` | `Na__VegData` | The record's object: read, defaults, dirty state, save through `Na__LocalMirror__MergeKeys` |
| | `...__Library__` | `Na__VegLib` | The asset index and files, pinning |
| | `...__History__` | `Na__VegHist` | Undo and redo |
| `03__System__SceneLayer` | `...__SceneLayer__`, `...__FrameBudget__` | `Na__VegLayer`, `Na__VegBudget` | The objects in the scene, and what may be redrawn this frame |
| `10__Ui__Panels` | `...__MenuSection__`, `...__DevControls__`, `...__LineworkPanel__`, `...__AssetBrowser__` | `Na__VegMenu`, `Na__VegDev`, `Na__VegLine`, `Na__VegCards` | Rows and panels |
| `20__System__Tools` | `...__SurfacePick__`, `...__ToolOverlay__`, `...__LinearTool__`, `...__BushTool__` | `Na__VegPick`, `Na__VegOverlay`, `Na__VegLinear`, `Na__VegBushTool` | Loaded on first use, dev only |

The prototype stays where it is as the test bench, importing the real modules once they move, so nothing is duplicated and its pictures remain a regression check.

### Plugging into the app

**One render hook, not six.** Note 10's trap T4: the effect chain has five full copies and two partial ones, and anything that depends on the camera must be added to each. Plants need their lines for whichever camera is about to draw, so the layer uses three.js's `scene.onBeforeRender` (`three.module.js:17582`), which fires inside every `renderer.render(scene, camera)` and is used by nothing in the app today. The live loop, stills, tiles, thumbnails, video frames and Layout Editor snapshots are all caught, including paths nobody has written yet. A signature of the camera's pose makes repeat calls free. Proven at Stage 2 on the live loop, tiled stills, thumbnails, video frames, a Layout Editor 3D picture and a drawing preset, so the fallback of an explicit sync call beside the fog sync was never needed.

| Question (note 11) | Answer |
|---|---|
| Picture or aid? | Lines and fill are picture elements. Proxies, paths, grips and the brush ring are aids, registered with `Na__InteractiveOverlays__Register`, so they print nowhere |
| Where in the scene? | A group in the scene, **not** under `Na__ModelGroup__Root`: walk collision, layer toggles, bounds and the phase library never see it |
| What moves it? | Only the camera. The layer redraws when the pose changes, and `Na__RenderLoop__RequestRender()` on a change of plants or rules |
| Both engines? | Yes, since Stage 2. In the AO's depth the discs came out as a bunch of grapes, and out of it (layer 1, as this plan first said) the walls' edges ran through the plants. So under MaxEngine the fill stays in the depth and writes alpha 0 while AO runs, and the AO shader leaves those pixels unshaded |
| Depth? | Log depth, with its own small bias (0.00003), because the model's 0.00015 is 15 cm at 150 m |
| Profile lines? | The fill's normals face the camera, so the Sobel draws nothing on a bush. Proven in the demo through the real composer. Since Stage 2 the whole fill shares one instanced normal, pixel-identical to one per vertex, so a camera move costs 3 numbers |
| Sections? | Materials read `Na__SectionClipping__GetClipList()`: a section cuts plants as it cuts the model |
| Fog? | The fill writes depth, so fog planes fall on it unchanged. **Not from the see-through share (v2.85.0):** the fill then leaves the normal pass, whose depth the fog reads, and a hedge against the sky was fogged as the sky. Since v2.98.1 the fog draws plants and people alone and fogs them by their own distance (`29__System__FogPlaneSystem/Na__FogPlaneSystem__OwnLayers__.js`) |
| Line weight in exports? | `SetExportScales` only reaches lines under a linework root (T14), so the plants' lines sit under a group marked `Na__ModelType: 'linework'`, with their base widths on userData |
| Detail in exports? | Detail thresholds are measured against the line weight, not raw pixels, so a 6000 px still shows the same picture as the screen, only sharper |
| Boot timing? | The door listens before the sequence starts (T8), and reads state rather than relying on a one-shot event |
| Clicks? | Copy `Na__North__PickTool__.js` with note 10's truthful hit filter. Add a hold so a click on a door behind a plant does not swing it (T19) |
| Keys? | Through `Na__AppUtils__KeyScope__`, with rows in `Na__Hotkeys__3dModelTab__.json` so the help panel lists them |
| Picking speed? | Picks are brute force today. The tools build a BVH with vendored `three-mesh-bvh` on first use, with `indirect: true` so it does not reorder indices that Projected Linework reads |
| Reporting? | `vegetation.toggle` and `vegetation.transparency` join the activity list, as Adam asked of client actions in v2.78.0 |

### Transparency (D03)

- **At 0% nothing changes:** the same opaque path, so no cost.
- **Above 0%:** two passes share one geometry: depth only, then colour with `LessEqual`. Only the front layer of overlapping discs blends, so a bush fades as one sheet and not as a stack of overlapping circles.
- Lines fade by the same amount. The profile line mask lets go once a bush is mostly see-through, so the wall's edges behind it show.

### Performance: the one real engineering risk

Measured on the prototype, in Node over a full orbit, lines alone:

| Plants in view | Median per frame | While orbiting |
|---|---|---|
| 14 | 13 ms | About 60 fps, with nothing to spare |
| 56 | 53 ms | Under 20 fps |

The tools will make hundreds easy to place, so this is fixed in Stage 2, before them.

1. **Each plant owns a slot** in the shared buffers, so one plant can redraw without rewriting the rest.
2. **While the camera moves, a time budget** (5 ms, config value), most wrong plants first, with a cheaper drawing: the smallest balls dropped, fewer samples, T-junctions found less exactly. The first idea, the exact drawing on the same budget, kept 60 fps and left far plants up to 36 px wrong: at a steady orbit the worst error settles at (turn per frame) x (the plants' radii added up) / (plants redrawn per frame), so the drawing itself has to get cheaper.
3. **Far plants simplify** through 2: under the moving drawing's limit a clump or nub drops out, and the walk with it.
4. **When the camera stops,** the exact drawing comes back a frame's worth at a time (12 ms, config value), not all at once, or one still frame in a slow drag would cost a long one. Each of these frames asks for the next, which keeps the refiner waiting until they finish, so the settled picture is always exact.
5. **Only the live loop gets a budget.** Every other path draws in full by default, so a path nobody has thought of gets full quality.
6. **A worker is the reserve:** `Contour` and `BushBuilder` import nothing, so they already obey the worker rule. 1 to 5 have met the PC's target. A worker would be how a moving frame keeps the exact drawing.

**Targets:** 300 plants orbiting at 60 fps on Adam's PC, and 100 at 30 fps on an iPad. **Measured at Stage 2:** the PC's is met (60 fps, a 6 ms tick, 60 degrees a second; the table is in the DEVLOG for v2.84.0). The iPad's has only been estimated, with this PC's CPU slowed 4x (60 fps, a 10 ms tick), and is open until tried on one.

---

## 4. The Data

### In the project's file (D06)

`ProjectData__<id>__.json` gains one top-level object, only when vegetation is enabled. Written in the Record dialect (`System__Record__Field`: every key stands alone and greppable, lists take the singular), integer mm in three.js axes, as every saved value is.

```json
"Vegetation__SceneData": {
    "Vegetation__SceneData__SchemaVersion"              : 1,
    "Vegetation__SceneData__Enabled"                    : true,
    "Vegetation__SceneData__ShowByDefault"              : true,
    "Vegetation__SceneData__DefaultTransparencyPercent" : 0,

    "Vegetation__SceneData__LineRules": {
        "Vegetation__LineRules__LineWeightPx"      : 0.80,
        "Vegetation__LineRules__InnerWeightShare"  : 0.80,
        "Vegetation__LineRules__InnerArcsFactor"   : 1.00,
        "Vegetation__LineRules__HooksFactor"       : 1.00,
        "Vegetation__LineRules__CurlsFactor"       : 1.00,
        "Vegetation__LineRules__PenLiftsFactor"    : 1.00,
        "Vegetation__LineRules__ScallopSizeFactor" : 1.00,
        "Vegetation__LineRules__SmallBumpsFactor"  : 1.00,
        "Vegetation__LineRules__Advanced": {
            "Vegetation__LineRulesAdvanced__SegmentPx"      : 4.0,
            "Vegetation__LineRulesAdvanced__LodSkipPx"      : 1.0,
            "Vegetation__LineRulesAdvanced__LodInnerArcsPx" : 6.0,
            "Vegetation__LineRulesAdvanced__LodHooksPx"     : 3.0,
            "Vegetation__LineRulesAdvanced__LodCurlsPx"     : 5.0,
            "Vegetation__LineRulesAdvanced__LodBladesPx"    : 7.0,
            "Vegetation__LineRulesAdvanced__FillTone"       : 0.975,
            "Vegetation__LineRulesAdvanced__DepthBias"      : 0.00003
        }
    },

    "Vegetation__SceneData__Assets": {
        "VVL_07_1001": { "...the asset's whole recipe, pinned on first use (D14)..." : null }
    },

    "Vegetation__SceneData__Palettes": [
        {
            "Vegetation__Palette__Uid"   : "PAL0001",
            "Vegetation__Palette__Name"  : "Terrace Planters",
            "Vegetation__Palette__Items" : [
                { "Vegetation__PaletteItem__AssetId": "VVL_07_1001", "Vegetation__PaletteItem__Weight": 55 },
                { "Vegetation__PaletteItem__AssetId": "VVL_07_1011", "Vegetation__PaletteItem__Weight": 25 },
                { "Vegetation__PaletteItem__AssetId": "VVL_07_1021", "Vegetation__PaletteItem__Weight": 20 }
            ]
        }
    ],

    "Vegetation__SceneData__Paths": [
        {
            "Vegetation__Path__Uid"        : "P0001",
            "Vegetation__Path__Name"       : "Front Planter Left",
            "Vegetation__Path__PointsMm"   : [[-7400, 1120, 2510], [-1900, 1120, 2510]],
            "Vegetation__Path__Curved"     : false,
            "Vegetation__Path__PaletteUid" : "PAL0001",
            "Vegetation__Path__SpacingMm"  : 1150,
            "Vegetation__Path__Seed"       : 41027,
            "Vegetation__Path__Advanced": {
                "Vegetation__PathAdvanced__RotationVariationDeg"    : 12,
                "Vegetation__PathAdvanced__ScaleVariationPercent"   : 10,
                "Vegetation__PathAdvanced__HeightVariationPercent"  : 8,
                "Vegetation__PathAdvanced__SpacingVariationPercent" : 15,
                "Vegetation__PathAdvanced__SideOffsetMm"            : 60,
                "Vegetation__PathAdvanced__DepthAcrossMm"           : 620,
                "Vegetation__PathAdvanced__AlignToPath"             : true,
                "Vegetation__PathAdvanced__FitLastPlant"            : true
            }
        }
    ],

    "Vegetation__SceneData__Plops": [
        {
            "Vegetation__Plop__Uid"        : "A0001",
            "Vegetation__Plop__AssetId"    : "VVL_07_1001",
            "Vegetation__Plop__Seed"       : 41027,
            "Vegetation__Plop__PositionMm" : [-6950, 1120, 2510],
            "Vegetation__Plop__YawDeg"     : 6,
            "Vegetation__Plop__SizeMm"     : [1400, 620, 1020],
            "Vegetation__Plop__StrokeUid"  : "S0001"
        }
    ]
}
```

- **Every parameter is written,** as Adam asked, not only what differs from a default.
- **The key names are Adam's style. The alignment shown is for reading.** The record is machine-written: the API rewrites the whole file with `json.dumps(indent=4)` on every save, so colon alignment cannot survive there (note 02, rule 3).
- **It joins `ProjectData__EditorOwnedKeys__Keys`** (`Na__AppConfig__Main.json:366`), so a SketchUp sync keeps it.
- **It saves by `Na__LocalMirror__MergeKeys`**, merged under the server's lock, never a whole-record POST. No new endpoint: AppAdmin only, already enforced, and revisions come free (`ProjectData__Revisions`, last 50).
- **A row in `NA__VV3D__KEYS`** (`ValeVision3D__Api__Activity__.py:91`) makes the ledger say "Saved vegetation". That is the one API change, so that push needs a service restart (rule 16).
- **Clients can read it,** as they can the whole record (note 14). It holds nothing private.

**Size, measured.** The 160 bytes the demo shows is compact JSON. As the API writes it, indented with long keys, a plop is 580 bytes. Records today: median 2 KB, largest 132 KB, across 182 projects. Measured with `json.dumps(indent=4)`, with three pinned assets (9 KB of it):

| Planting | In the record | Gzipped |
|---|---|---|
| 10 paths (any number of plants) | 24 KB | 2 KB |
| 300 brushed plants | 179 KB | 9 KB |
| 1,000 brushed plants | 575 KB | 27 KB |

Whether nginx gzips the API's JSON is not checked; Stage 4 reads that from the server. The Gallery and other apps also read this file, so Dev Tools warns above 1,000 plops. If real projects pass that, the plops move to a sidecar file with its own read route. That is a contained change behind `Na__VegData`, and is not built unless needed.

### The library

```
53__Vegetation__AssetLibrary/
├── VegetationLibrary__Register__.json     numbering, naming, collections: the one place a number is decided
├── VegetationLibrary__Index__.json        generated: what the browser reads
├── Na__Vegetation__BuildUtil__Library__.py  validate, index (--check), next CC Type   (.py never pushes)
└── 07__VegetationElements/
    ├── VVL_07_1001__Shrubs__RoundedShrub__Var-01__.json
    ├── VVL_07_1011__Shrubs__UprightShrub__Var-01__.json
    └── VVL_07_1021__Shrubs__LowBorderDrift__Var-01__.json
```

`VVL_CC_TTFI`, exactly as NPR's register: CC collection, TT the type's block, F family, I item, an Id ending in 0 never an asset, a retired Id never reused, `next` gives the number. Each file is the demo's recipe in sidecar dialect (`Asset__Size`, `Asset__Masses`, `Asset__Clumps`, `Asset__Nubs`, `Asset__Line`, `Asset__Tufts`), plus:

| Block | Keys | For |
|---|---|---|
| `Asset__Generator` | `Generator__Name`, `Generator__Version` | D15: a saved plant redraws by the generator it was made with |
| `Asset__Placement` | `Placement__RotationVariationDeg`, `__ScaleVariationPercent`, `__AlignToPath`, `__MinSpacingMm`, `__DefaultWeight` | What the tools start from: a round shrub turns freely, a drift stays along its path |
| `Asset__Proxy` | `Proxy__Shape`, `Proxy__RingCount`, `Proxy__SectorCount` | The dome, in the app and in SketchUp alike |
| `Asset__Catalogue` | `Catalogue__Keywords`, `__Season`, `__BotanicalName` | Search and filters |
| `Asset__Meta` | `Meta__Version`, `__Created`, `__Author`, `__Status` | Active, Draft, Retired |

A JSON schema contract sits beside the register, and `validate` checks every asset against it, as NPR's does. The three demo assets are the starter set, and growth is new files only.

---

## 5. SketchUp, Both Ways (D05)

Sync Aura already does this, and Adam's phrase for it was "keeping both in lockstep". This follows it closely, in Cloud Sync (`%APPDATA%\SketchUp\SketchUp 2027\SketchUp\Plugins`, the 2027 repo), as a **Sync Vegetation** tab with its own feature folder beside `09__AuraSync`.

| Part | Rule |
|---|---|
| A proxy | A root-level `ComponentInstance` whose definition is stamped with `AssetId` matching `^VVL_\d{2}_\d{4}$`. Inside a group it is not seen, as with Aura |
| Its tag | `05__ValeVision__VegetationProxies`, in the GLB builder's skip range (0, 2, 4, 5, 6), so a proxy never goes into the model GLBs: the app draws the plant itself |
| Its shape | The same dome, built by the plugin from `Asset__Proxy` and the size. No SKP slot to keep |
| Its identity | The plop's `Uid`, stamped on the instance once synced |
| Placing one | A small asset list in the tab, through SketchUp's own ComponentTool |
| The sync | Read the object over the API, three-way merge against a base kept in the model's `ValeVision__CloudExport` dictionary, PATCH the result, then apply to SketchUp in one undoable operation **with the base inside it**, so an Undo puts both back together |
| A clash | Changed on both sides: **ValeVision wins**, and the report names it. As Sync Aura |
| Frames | `three = (su.x, su.z, -su.y)` x 25.4 to integer mm; a turn about SketchUp +Z is the same turn about three +Y; size from the instance's axis lengths. Ruby reads raw poses only, and every conversion is in the Python, in one place |
| Open groups | Refused, as Aura does. Proxies live in `model.entities`, whose transforms are world whatever is open, but a sync must not run mid-edit (Adam's coordinate rule) |
| Sign-in | The Vale sign-in over stdin, the session in `91__UserConfig__LocalOnly`, never in a log |
| Rewriting the object | Only `Plops` and any pinned `Assets` a new proxy needs. Line rules, paths and palettes are never touched from SketchUp |

**Paths and strokes.** Brushed plants are ordinary plops, so they sync fully. **A path's plants come over as read-only proxies,** stamped with the path's Uid: if an artist moves one, the sync leaves the path alone and the report says which. To change a path, edit it in the app or bake it first. A stale read-only proxy is replaced by the next sync.

**A trap to design for.** Sync Aura's proxies show in the `IMG##` scene pictures until hidden in those scenes (its DEVLOG, provisional). The same applies here, so the sync hides this tag in the `IMG##` scenes.

**A real limitation.** Moving a planter in SketchUp does not move its path in the app, because a path's points live in the app. Say so in the report whenever proxies are found on surfaces that moved, if that can be detected cheaply. Otherwise it is a known limit.

The Sync's merge needs a safe write: ValeVision's PATCH does not check `_rev` ("not used by this app yet"), so this stage adds a per-key guard following the Drawings one (`X-ValeVision-Drawings-Base`), which also protects two admins from overwriting each other.

---

## 6. Stages

Each stage leaves the app running, gets its own DEVLOG entry and version, and is committed and pushed only on Adam's word. **A project without the key is untouched throughout:** that is checked at every stage, by `vv3d_check.py graph` and a project without vegetation drawing the same pixels.

| Stage | What | Adam can see | Done means |
|---|---|---|---|
| **1. Foundations** | Engine modules into `24__System__Vegetation`; the door; the library with its register, schema and three assets; `Na__VegData`; the key joins the editor-owned list; registry row; the demo imports the real modules | Nothing in the app. The demo draws the same | Demo pixels identical; `validate` clean; door costs one module on a project without the key |
| **2. Plants in the model** | Scene layer, render hook, sections, both engines; the performance work; Dev Tools Enable switch; a Dev-only "add a test row" | Enable on the pilot project and test plants appear in 3D, in stills and video | Every render path proven; 300 and 100 plant targets measured |
| **3. The menu** | Tools & Settings section; Show Vegetation; Transparency; device memory; activity events; client and phone checks; Vegetation Linework panel saving every parameter | The section as specified; a client link with its two rows | A client link shows two rows and no dev markup; values round trip through the file |
| **4. Asset browser** | The panel, cards drawn live, search, categories, Rendered / Proxy / Both, click to place, In This Project tab, move, turn, remove, pinning, undo, Save Vegetation | Place single plants by hand and save | Save, reload and identical plants; save with the record changed elsewhere; close guard |
| **5. Linear Tool** | Surface pick with BVH, overlays, draw and edit paths, Advanced dropdown, runs, Bake | Draw the demo's planters on a real model | Same path and seed draw identically; a 60 m path stays smooth |
| **6. Bush Tool** | Palette with probabilities, brush, erase, stroke undo, proxies while painting | Brush a border from a mix | Weights hold over 1,000 draws; spacing holds; undo per stroke |
| **7. Pictures finished** | Export line weights and detail; video; thumbnails; Layout Editor 3D views, with a plant change counting as a model change so cached viewports redraw | Stills, Theia video and 3D sheet views all match the viewer | A tiled still and a video match the viewport; a sheet updates after a plant moves |
| **8. Drawings** | Show Vegetation tick per plan and elevation (off by default, so no existing sheet moves); live views through the orthographic camera; raster viewports; vector linework last | Plants on an elevation, as the first sketch | Off by default proven; vector output hides what plants cover |
| **9. SketchUp both ways** | Cloud Sync tab and release, frames, three-way merge, the per-key write guard | Place a proxy in SketchUp, sync, see it drawn; move a plant in the app, sync, see the proxy move | Round trip by numbers off the origin, in a moved and rotated setting; Undo restores both |

- **Stage 8 is the one that can change an existing output,** and so comes late and defaults to off. Stage 9 stands apart from 7 and 8, and can be brought forward if SketchUp matters sooner.
- **The Layout Editor rule:** nothing outside folder 51 statically imports it, and plants reach it only through the hook.
- **The API and service:** a restart of `vale@ValeVision3D` at Stage 2's push (the ledger row) and at Stage 9's (the guard).

### Tested at each stage

Pure and Max; orbit, walk and fly; a section on; an engine switch; a window resize; a tiled still; a video export; a Layout Editor snapshot; a client link; `?authoring=off`; a phone; a hidden and shown tab. API checks through `vv3d_api_sandbox.py`. Browser checks are Adam's by standing rule, except where a look or a frame rate must be measured.

---

## 7. Needed from Adam, and Open Risks

**The pilot project is `63403__Thrower`** (Adam: "Use Thrower"). Its real record has not been written: switching it on is Adam's, and the local server writes the real mirror, which later syncs.

| Risk | Where | Handling |
|---|---|---|
| The hook misses a path | Closed at Stage 2 | Proven per path, with a log of every render |
| The targets are not met | PC met at Stage 2; iPad open | Worker is the reserve. If still short, the budget lowers the far plants' detail further |
| AO on the fill under MaxEngine | Closed at Stage 2 | The smudges were real, and layer 1 was no answer. The fill marks itself with alpha 0 while AO runs. Tried on Thrower through the live switch; not yet on one of the 9 Max projects |
| Stale lines visible while orbiting | Measured at Stage 2 | The worst plant is tens of pixels out at 60 degrees a second, in step with the speed. A captured moving frame reads as plants; how it feels in the hand is Adam's call. All config, and on a settled frame they are always exact |
| Record growth | Stages 5, 6 | Warning at 1,000 plops; sidecar behind `Na__VegData` if needed |
| Two admins saving at once | Closed at v2.85.0, as a comparison | A save compares with the server first and refuses if the object has changed. Not a lock: section 8 |
| Sheets caching old pictures | Stage 7 | A plant change must bump what `Na__ContentStamp` says, or Adam's rule "ANY NEW MODEL UPDATES... must force re render" breaks. Traced at that stage |
| A real model is not a neat planter | Stage 5 | The pick surface may be a soffit or a coping. Max slope and a "this surface only" option are the first answers |
| Is the look right at a real project's scale? | Stage 2 | The test bed is made up. The Linework panel saved per project is the answer if not |

---

## 8. What Was Built Differently

Written at v2.85.0. Where this and the sections above disagree, this is what is there.

| Plan said | Built | Why |
|---|---|---|
| The tools' aids as registered overlays (section 3) | A 2D canvas over the model, `.na-veg-overlay`, pointer events off | Not being scene objects, they cannot reach any picture, whatever render path comes next. Painting shows proxies on it and builds real plants on release |
| A per-key guard in the API, following the Drawings one (section 5) | A comparison just before the write, from both sides: `Na__VegData__Save` and the sync | The API file holds other sessions' open work, and it needs no restart. A save landing in the moment between the read and the write could still be overwritten; its revision is kept. Moving it into the API later changes nothing else |
| `Na__VegData__RemoveAll` writing a null | It takes the key out with the PATCH's `_unset` | "Delete should mean delete", and `_unset` was already there |
| Activity events of their own | `settings.change` from the two controls for everyone | The ledger's own word for it |
| Show Vegetation tick per plan and elevation | A viewport's Vegetation tick on a sheet (a composite row beside Depth Fog), and a project's Show on Live Drawings for its live views | A sheet's plants are a layer over the vectors, a twin of the fog, so the picture under them never moves. Vector linework does not hide what plants cover: they sit over it, opaque |
| A path's plants as read-only proxies | The same, and locked in SketchUp | Read-only means it. Unlocked and moved anyway, the next sync puts it back and names it |
| Moving a planter in SketchUp noted in the report if cheap | A known limit, not detected | A path's points live in the app |
| The fill one unlit tone (section 3) | Unlit, its colour worked out for each render from the scene's lights (v2.86.0) | Adam: "It should be the same brightness as the building walls and change as you move". The one tone stays for a sheet |
| Size variation only | A whole-plant scale besides, on plops, paths, the brush, the next dropped plant and palette items (v2.86.0) | Adam: "I would set a scale of 0.5". It changes no draw, so a slider never reshuffles a plant |
| One generator to start | `ClippedForm` version 1 beside `BallCluster` (v2.86.0) | Adam: "a more managed hedge-looking plant". Asset__Form, Placement__Clipped and a Box proxy are additions to the schema, all optional |

**Stage 9, as far as it has been run.** The merge, the frames and the path port by numbers; the Python live against a sandbox of the real API; the Ruby in SketchUp's own interpreter with its real `Geom` maths against stand-in entities; the tab's page in a browser with a stand-in bridge. Real entities (faces, tags, locks, scene visibility, the component tool, the observer, Undo) have not been run: no empty SketchUp window could be reached. Cloud Sync's DEVLOG 0.6.0 lists what to try.
