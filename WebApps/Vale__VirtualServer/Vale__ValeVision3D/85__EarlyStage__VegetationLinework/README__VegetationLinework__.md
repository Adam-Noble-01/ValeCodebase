# Vegetation Linework Prototype

An isolated demo of rule-based linework shrubs for ValeVision 3D, built to agree the look before any asset system is built. Nothing in the app imports this folder, and `85__EarlyStage*` folders never push to the server.

Adam, 04-Nov-2026: "First build an isolated demo to show me how they could look, once i'm happy with the aaethetic we will build out a new assets system and tools for placement in / saving ValeVision 3D like with the NPR Renderer as we will need to establish conventions and a schema etc etc".

**The look was agreed on 04-Nov-2026, and the system is planned in `../ValeVision__PLAN__VegetationSystem__.md`.** This folder stays as the test bench: from that plan's Stage 1 it imports the real modules rather than holding its own copies.

## Run It

Double click `Start__VegetationLinework__Localhost__8037__.bat`, or:

```bash
python Na__VegLine__LocalServer__.py 8037 --open
```

Then `http://127.0.0.1:8037/Vale__ValeVision3D/85__EarlyStage__VegetationLinework/`. The address can name a view and a mode: `?view=lineup|elevation|closeup|perspective|birdseye`, `&mode=rendered|proxy|both`, `&clean=1` for no panels.

## How It Works

| Stage | When | File | What |
|---|---|---|---|
| Rules | Written once per asset | `53__Vegetation__AssetLibrary` | Sizes, ranges and chances: no geometry anywhere |
| Plop | Saved with a project (later) | One small record | Asset id, seed, position, turn, size: about 160 bytes |
| Build | When a project loads | `Na__Vegetation__BushBuilder__.js` | Rules + seed = balls in 3D, at three scales: masses, clumps, nubs |
| Draw | Whenever the camera moves | `Na__Vegetation__Contour__.js` | The outline of those balls from this camera, as vector lines |
| Show | Every frame | `02__Src__AppModules/24__System__Vegetation/03__System__SceneLayer/Na__Vegetation__SceneLayer__.js` (moved in at Stage 2) | The app's own fat lines at the model's own weight, over a white fill |

- **The lines are worked out per view,** because a bush has no edges: what is drawn is where its surface turns away from the eye. Nothing is saved but the plop.
- **T-junctions come free.** Where two balls meet, the front one carries on and the one behind stops against it, which is most of what makes it look drawn.
- **Most inner lines are dropped on purpose.** All of them looks like a bunch of grapes. The outline stays, with hooks at some of its cusps and a few inner arcs.
- **Lines say less as they shrink.** Arcs, hooks and curls drop out by screen size, so a far bush is a clean outline and not a smudge.
- **The real renderer.** The demo imports the app's PureEngine composer and progressive refiner and reads its config, so line colour, weight, lights, profile lines and the 16 sample settle are the app's. The fill's normal is turned to the eye so the profile lines' Sobel draws nothing on a bush, with no change to PureEngine.

## The Numbers (04-Nov-2026, this PC, in headless Edge)

| | |
|---|---|
| A plop's proxy | 108 triangles |
| Draw calls for any number of bushes | 3 (outlines, inner lines, fill), plus the proxies |
| Build, all 29 plops | about 70 ms |
| Lines while the camera moves, 14 bushes in view | median 13 ms a frame |
| Lines while the camera moves, 56 bushes in view | median 53 ms a frame |
| Lines while the camera is still | nothing: they are only worked out when the view changes |

**This is the one thing to fix before it goes in the app.** At about 1 ms a bush on one thread, some 15 bushes in view use up a 60 fps frame, and 56 orbit at under 20 fps. A big planting scheme needs a coarser draw while the camera moves, or a worker: the engine's modules import nothing from three.js, so they can move to one. These figures are the lines alone, measured in Node over a full orbit, and leave out the upload and the GPU.

## Provisional

- Ids (`VVL_07_1001`), keys and the plop's record are placeholders until the schema stage. `VVL_` follows the PainterlyNPR form so it can sit beside `NPR_`.
- The house, terrace and planters are made up, so that no client's design is in a public repo.
- Dropping a plop is a stand-in for real placement tools. It only works on a surface facing up, so not from the front-on views.

## Not Built Yet

The asset folder and schema, placing and saving in the app, SketchUp proxies through Cloud Sync, other render paths (drawings, still and video export, Layout Editor, projected linework), true orthographic cameras in the app (the code handles them and the drawer cards use one, but the demo's scene views use a long lens), phones, and sun shadows from a bush.
