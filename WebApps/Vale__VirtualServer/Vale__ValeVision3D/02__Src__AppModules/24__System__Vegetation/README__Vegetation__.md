# 24__System__Vegetation

Linework plants for ValeVision 3D: clean CAD shrubs drawn from rules and a seed, at the whitecard's own line weight. ValeVision only, with no TrueVision twin. Plan of record: `ValeVision__PLAN__VegetationSystem__.md` at the app's root. Live state: `ValeVision__WORKING_MEMORY__VegetationSystem__.md`.

Adam, 04-Nov-2026: "Use a similar proxy / rendered asset system as to keep assets lightweight for working with and have the renderer doo the work when it loads a view to draw the randomness, there should be rules for shape etc but then radnomisation to create convincing vegetation effect thats not repetative."

## Where It Stands

**Stage 2 of 9: plants draw in the model, in every picture and on both engines,** switched on per project from Dev Tools > Vegetation, with a test row to look at until the real tools arrive. There is no menu yet. Everything below `Na__Vegetation__.js` loads only on a project with `Vegetation__SceneData__Enabled` true, apart from the Dev section and what it needs, for an author alone.

## Files

| File | Token | What |
|---|---|---|
| `Na__Vegetation__.js` | `Na__Vegetation` | The one door in, and the only module on the start-up path |
| `Na__Vegetation__AppConfig__.json` | | Defaults, whose keys are the keys a project saves; the list of generators |
| `01__Core__Engine/Na__Vegetation__Random__.js` | `Na__VegRand` | A seeded generator: one seed, one bush, on every machine |
| `01__Core__Engine/Na__Vegetation__BushBuilder__.js` | `Na__VegBuild` | Recipe + seed + size = balls in 3D, in world metres |
| `01__Core__Engine/Na__Vegetation__Contour__.js` | `Na__VegContour` | Balls + camera = outline, T-junctions, hooks and a few arcs, as vector lines |
| `02__Core__Data/Na__Vegetation__SceneData__.js` | `Na__VegData` | The project's object: defaults, reading, saving |
| `02__Core__Data/Na__Vegetation__Library__.js` | `Na__VegLib` | The asset library: the catalogue, recipes, a project's pinned copies |
| `03__System__SceneLayer/Na__Vegetation__SceneLayer__.js` | `Na__VegLayer` | The objects in the scene, each plant's slot in the shared buffers, the render hook |
| `03__System__SceneLayer/Na__Vegetation__FrameBudget__.js` | `Na__VegBudget` | What may be redrawn this frame, and how: full, moving or settling. No three.js |
| `03__System__SceneLayer/Na__Vegetation__Runtime__.js` | `Na__VegRun` | Joins the layer to the app, and keeps its plants the same as the project's object |
| `10__Ui__Panels/Na__Vegetation__DevControls__.js` | `Na__VegDev` | The Dev section: the one switch, and the test row |

The library itself is `53__Vegetation__AssetLibrary` at the app's root.

## Rules That Bite

- **Nothing here imports three.js in `01__Core__Engine`,** so it can run in a worker, and in Node for checks.
- **Nothing outside this folder imports anything but `Na__Vegetation__.js`.** The one exception is the prototype, `85__EarlyStage__VegetationLinework`, which is the test bench and never ships.
- **A generator is never edited** once a project can hold its plants: a saved seed must draw the same bush for ever. `BallCluster` version 1 is `Na__VegBuild__Bush`. A new look is a new version beside it, listed in the config.
- **The order of random draws is part of that promise.** Adding, removing or reordering one `rng` call in a generator changes every plant it has ever made, without any error.
- **A change to what `Contour` draws changes the look of every project.** It is not versioned plant by plant, so such a change is Adam's call.
- **Fit moves centres, never radii,** so a stretched proxy never stretches a scallop. It also means a narrow bed can bury clumps inside a mass, which is why a mass never hides what grows on it (`Na__VegContour__IsHidden`).
- **Saved values are integer mm, Y up.** The builder converts to metres once, on the way in.
- **The scene layer imports nothing of the app's.** It takes a small host object from `Na__Vegetation__Runtime__.js`, so the test bench can draw through it. Without a host every draw is a full one.
- **A fat line is never hidden with `.visible`:** empty its count, or hide the root group.
- **Alpha 0 on the fill is only ever written while MaxEngine's AO runs,** and the AO blur sets it back to 1. It must never reach the page or a still.

## Checks

```bash
python 53__Vegetation__AssetLibrary/Na__Vegetation__BuildUtil__Library__.py validate
```

```bash
python 53__Vegetation__AssetLibrary/Na__Vegetation__BuildUtil__Library__.py index --check
```

The prototype draws through these modules with the real PureEngine: see its README for how to run it.
