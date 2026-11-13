# ValeVision 3D - Entourage System: People in the Plants' Line Language, Their Menu, Library and Moving Them About

**Status**: Built in one release, v2.88.0, 05-Nov-2026, with Cloud Sync 0.7.0. Staff placing and on by default, v2.89.0: section 1, the second table. Nothing committed or pushed until Adam says.
**Created**: 05-Nov-2026
**Owner**: Adam Noble
**Base**: ValeVision3D v2.87.0. The plants' plan, `ValeVision__PLAN__VegetationSystem__.md`, is the pattern. Live hand-off for agents: `ValeVision__WORKING_MEMORY__EntourageSystem__.md`.

## 0. Adam's Brief

Adam's words, 05-Nov-2026:

> "TASK 01 - Get Existing entourage assets into ValeVision. 1. Look at how entourage assets have been handled before, these use a camera follow system. 2. Port these assets to ValeVisions Web App (Convert to ValeVisions Format) D:\06_CoreLib__Web3D\SketchUp__SourceFiles\10__SketchUp__CoreComponentLib\Na__CoreLib__3dAssets\60__Scene__Entourage__2D. 3. Utilise MCP Tools, and write new ones if needed"

> "TASK 02 - Create a Entourage Asset system. 1. Use a asset browser and drag and drop system similar to the new plant system. 2. Add a system that draws the linework similar to the plant system. 3. Default face transparency should be 60%. 4. Take a took at the laterst project we added to ValeVision, the plants on that look amazing, so human entourage needs to be in the same flavour and vibe as to not distract from the architecture. 5. Add a felxible drag drop and move around system like used on my NPR Renderer system and Project AURA, so show a ring under the asset when its being interacted with and ensure right click allows for delete / replace and shows previews of the other caracters who you can swap for. 6. on my developer version add all the same exposed parameters so i can tweak if needed. 7. Have the same route for enabling i.e. dev menu toggle on/off entourage assets, the relevant menu section then appears. in the dev menu nest vegetation in a new "Assets" section and have entourage, vegetation and furnishings as sub sections (funiture assets to come) then each has a toggle and nicely nested otherwise the menuy will get too large. 8. on the new eentorage menu basically do what we did with the vegetation menu with the same access controls for different users."

## 1. Decisions

### Adam's answers (05-Nov-2026), from a look test on Garnett's sandbox copy

| # | Question | Answer | What it means |
|---|---|---|---|
| E01 | How are people drawn? | "C: all fades, pen lifts" | Line and face fade together to 60%, as Garnett's plants do, with small breaks in the line and short hooks at notches. Not a solid line, and not the old grey silhouette |
| E02 | When do placed people react to the mouse? | "Assets panel open" | Ring on hover, drag, right-click only while Entourage Assets is open, as NPR's drawer. Closed, the model behaves as normal |
| E03 | SketchUp? | "Yes, both ways now" | Cloud Sync 0.7.0, Sync Entourage, following Sync Vegetation |
| E04 | Elevations and sheets? | "As plants, off unless ticked" | 3D views, stills, video and a sheet's 3D pictures show them. Elevations only by a viewport's tick or Show on Live Elevations. Plans never: a flat figure is edge on |

### Adam's answers on Employees (05-Nov-2026), which supersede what follows where they differ

| # | Question | Answer | What it means |
|---|---|---|---|
| E14 | Whose items may an Employee change? | "Anything, all tracked" | Move or delete anything, every change recorded by name, and Remove My Changes puts it back exactly as it was |
| E15 | On which projects? | "Any Project, make the admin ticked on boxes on by default now, i gated it initially whilst testing but its ready to roll out, keep those gates so i can disable though" | On unless a saved `Enabled` is false. The Dev tick stays as the off switch, for everyone. This overrides section 2's "creates the object" and the plants' plan, D02 |
| E16 | What does a client see? | "After an admin approves" | Staff see at once. The record holds what is approved and is all a client reads. What waits sits beside it: `22__System__SceneAssets` and the API's Logic file |

### Defaults taken (each cheap to change)

| # | Default | Why |
|---|---|---|
| E05 | Holt's grey silhouettes, baked into its GLB by tags 60 and 61, stay as they are | The old billboard route still works, and that project is a client's. The two routes do not meet |
| E06 | Folder `23__System__Entourage`, library `54__Entourage__AssetLibrary` | Beside the plants, in the band for systems that put objects in the scene (registry, rule 1) |
| E07 | Ids keep Adam's numbers: `60_0301` is `VVL_60_0301`. The Labrador `60_0500` is `VVL_60_0501` | An Id ending in 0 is a family's base and never an asset |
| E08 | One JSON file per asset, its points as a string | The API rewrites a record with `json.dumps(indent=4)`, which would spread a list of points over thousands of lines. A string keeps a pinned person about 3 KB |
| E09 | A project pins its own copy of each asset it uses; Update to Latest is a click | As plants: improving the library never changes a finished project |
| E10 | Save is an explicit Save Entourage button, with undo and redo | As plants |
| E11 | Viewers' Show and Transparency are remembered per device | As plants. **Superseded 13-Nov-2026 (v2.98.4), as D19:** every viewer opens at the record's values, and any staff save captures them |
| E12 | Scale runs 0.50 to 1.50, Bigger and Smaller by 10% | A person scaled to 3 is not a person. NPR's clamp is 0.5 to 2 |
| E13 | Plants and people share one layer on a sheet, each with its own tick | One image over the linework, so a person stands among the planting, and far less new code in the Layout Editor |

## 2. What People See

```
Dev Tools                                                  AppAdmin
└─ Assets
   ├─ Entourage                              [tick]        creates the object, shows the menu, draws the figures
   │  ├─ Start with people showing           [switch]
   │  ├─ Starting transparency               [slider]      60% to start
   │  └─ Remove All Entourage...                           type "delete" to confirm: it is final
   ├─ Vegetation                             [tick]        as it was, moved here
   └─ Furnishings                            [greyed]      to come

Tools & Settings                                           the whole section hidden unless enabled
└─ Entourage
   ├─ Show Entourage                         [switch]      everyone, clients and phones included
   ├─ Transparency                           [slider]      everyone
   ├─ Entourage Assets                       [opens panel] dev: the asset browser, and the tool on the model
   ├─ Entourage Linework                     [opens panel] dev: every line rule
   ├─ Show on live elevations                [tick]        dev
   └─ Save Entourage                                       dev
```

### While Entourage Assets Is Open

| Gesture | What it does |
|---|---|
| Drag a card onto the model | A figure and its ring follow the pointer, and land on release, on what faces up |
| Click a card, click the model | NPR's gesture. Drops one each click; Escape or the card stops |
| Hover a figure | A soft ring under it, and a grab cursor |
| Press a figure and drag | Moves it. A press and release selects it. A press anywhere else orbits, as ever |
| `M` on the selected figure | It follows the pointer with no press, until a click. Escape puts it back |
| `Ctrl+D`, `Delete` | Copy beside it, delete it |
| Right-click a figure | Move, Bigger, Smaller, Copy beside it, a grid of pictures to replace it with, Delete. Resting on a picture shows that character standing there |

NPR and AURA have less than Adam remembered, so this is built to his brief rather than copied: their ring shows only while carrying, a drag on a plop still orbits, their swap menu is words, and their web drop lands on height 0 rather than the model.

## 3. How It Works

```
ASSET (outline, mm) + SEED + LINE RULES -> smoothed outline, pen lifts, hooks      once, per asset and seed
CAMERA + all of those                   -> flat lines and fill, turned to the eye   when the eye moves
lines and fill                          -> the app's own fat lines over a flat fill every frame
```

| Question (note 11) | Answer |
|---|---|
| Picture or aid? | Lines and fill are picture elements. The ring and a carried figure are on the plants' 2D canvas over the model, so they print nowhere |
| Where in the scene? | A group in the scene, not under `Na__ModelGroup__Root`: walk collision, layer toggles, bounds and the phase library never see it |
| What moves it? | The camera, through `scene.onBeforeRender`, shared with the plants through `Na__SceneHooks__Add` |
| Both engines? | Yes, the plants' way, AO mark included |
| Depth? | Log depth, with the plants' small bias |
| Profile lines? | One fill normal, pointing at the eye, so writing in world space rather than turning a node. At 60% the fill is out of the normal pass altogether |
| Sections? | The materials read the section system's clip list |
| Line weight in exports? | Lines under a group tagged `linework` |
| Clicks? | The plants' tool host, so only one tool has the clicks and doors hold; its BVH pick |

Everything else is in the folder's README: `02__Src__AppModules/23__System__Entourage/README__Entourage__.md`.

## 4. The Data

`ProjectData__<id>__.json` gains one top-level object, only when entourage is enabled, in the Record dialect, integer mm in three.js axes.

```json
"Entourage__SceneData": {
    "Entourage__SceneData__SchemaVersion"              : 1,
    "Entourage__SceneData__Enabled"                    : true,
    "Entourage__SceneData__ShowByDefault"              : true,
    "Entourage__SceneData__DefaultTransparencyPercent" : 60,
    "Entourage__SceneData__ShowOnLiveDrawings"         : false,
    "Entourage__SceneData__LineRules": {
        "Entourage__LineRules__LineWeightPx"     : 0.60,
        "Entourage__LineRules__InnerWeightShare" : 0.55,
        "Entourage__LineRules__HooksFactor"      : 1.00,
        "Entourage__LineRules__PenLiftsFactor"   : 1.00,
        "Entourage__LineRules__SmoothingPasses"  : 2,
        "Entourage__LineRules__Advanced"         : { "...": "corner, pen lift and hook sums, fill, depth bias" }
    },
    "Entourage__SceneData__Tools"   : { "Entourage__Tools__Place": { "Entourage__Place__Scale": 1 } },
    "Entourage__SceneData__Assets"  : { "VVL_60_0301": { "...the asset's whole file, pinned on first use...": null } },
    "Entourage__SceneData__Figures" : [
        {
            "Entourage__Figure__Uid"        : "E0001",
            "Entourage__Figure__AssetId"    : "VVL_60_0301",
            "Entourage__Figure__Seed"       : 41027,
            "Entourage__Figure__PositionMm" : [10200, 235, -8600],
            "Entourage__Figure__Scale"      : 1.1
        }
    ]
}
```

A figure has no turn: it always faces the camera. `Scale` is absent at 1. The key joins `ProjectData__EditorOwnedKeys__Keys`, saves by `Na__LocalMirror__MergeKeys`, and has a row in `NA__VV3D__KEYS`, so **that push needs `vale@ValeVision3D` restarted** for the ledger to say "Saved entourage".

## 5. SketchUp, Both Ways

Cloud Sync's `11__EntourageSync`, following `10__VegetationSync`. Its DEVLOG, 0.7.0, has the detail and what was run on real entities.

## 6. MCP Tools

`vv3d_entourage_library`, `vv3d_entourage_import_skp`, `vv3d_entourage_get`, `vv3d_entourage_edit`, `vv3d_entourage_preview`. A new figure is a `.skp` in the core library's folder and one call of the import tool.
