# ValeVision 3D - Entourage System - Working Memory (for agents)

> **Live hand-off file.** Read this first if you are an agent picking up the entourage system, then the plan: `ValeVision__PLAN__EntourageSystem__.md`. Update it in the same change. **Last updated: 05-Nov-2026.**

## Where It Stands

| What | State | Version |
|---|---|---|
| 13 assets converted, library, build util | **Built** | v2.88.0 |
| Engine, data, scene layer, door, render hook shared with plants | **Built** | v2.88.0 |
| Tools & Settings > Entourage, Dev Tools > Assets nesting all three | **Built** | v2.88.0 |
| Asset browser, drag from a card, ring, move, right-click replace and delete, Linework panel | **Built** | v2.88.0 |
| Sheets (tick, PDF), Show on Live Elevations | **Built** | v2.88.0 |
| Cloud Sync, Sync Entourage | **Built** | Cloud Sync 0.7.0 |
| MCP tools | **Built** | server 1.2.0 |
| Employees place and swap, tracked by name, waiting for an admin; Remove My Changes; on by default | **Built** | v2.89.0 |

## Decisions in Force

Adam's answers E01 to E04 and the defaults E05 to E13 are in the plan, section 1. The ones most easily got wrong:

- **The record is what is approved, and all a client reads** (E16). Staff's changes wait in the changes file. A save goes through the placed-assets routes, never the whole key: `Na__LocalMirror__MergeKeys` of this key would overwrite other people's work.
- **On by default** (E15). Only a saved `Enabled` false is off, and with nobody placed no layer is made until a panel opens: `Na__Entourage__EnsureStarted`. The runtime's `GetSceneData` is null until then, so read `Na__EntData__Current`.
- **Line and face fade together** (E01). His words were "Default face transparency should be 60%", and on the look test he chose all fading, with pen lifts and hooks, over a solid line.
- **Only while the panel is open** (E02). With Entourage Assets closed, no ring, no drag, no menu.
- **Save is a button.** Dev Tools' switch and its two start rows save at once; everything else waits for Save Entourage.
- **A figure has no turn.** Nothing about rotation is saved or synced.
- **Holt's silhouettes stay** (E05): tags 60 and 61 and `CameraFollowBillboards` still work for what is baked in a GLB.

## What Is Left

- **Adam's verdict** on Employee placing and the Changes tab.
- **A real SketchUp window for Cloud Sync's real-entity test,** ready in its report: Adam to open a fresh untitled one.
- **Real elevations through a real sheet:** the drawing layer is proven through an orthographic camera at the function, alone and over plants. A real viewport's tick has not been pressed in a browser.
- **A phone and a real iPad.**
- **Furnishings:** a greyed row. When it comes, move the shared tool host, overlay and pick out of `24__System__Vegetation` into a folder of their own, as three systems will then share them.

## How to Prove Nothing Moved

- **The figure builder:** same seed, same figure; a Hooks slider never moves a pen lift and a Pen lifts slider never moves a hook. Node, on the real asset files, no page: the DEVLOG has the method.
- **A client on a project with nobody approved costs the door and one test:** the boot graph is 314 modules, through `vv3d_check.py graph`, and `vv3d_level_walk` says what each level fetched.
- **The plants are untouched:** their engine hash and prototype pixels in `ValeVision__WORKING_MEMORY__VegetationSystem__.md` still hold. Their render hook only went through `Na__SceneHooks__Add`, and the test bench has no host, so it writes the slot as it did.

## Traps

- **A fat line is never hidden with `.visible`,** as the plants': empty the count.
- **`scene.onBeforeRender` is one slot.** Add to it only through `Na__SceneHooks__Add`, or whoever came first is silently switched off.
- **A figure's normal must point at the eye for the Sobel,** and that needs world space: turning a node would turn its normal away. So figures are written into shared buffers, not moved as objects.
- **A person carried is out of the scene:** `setHiddenUid`, and one render. A drag then costs no render of the model. If it stays hidden after a gesture, `Na__EntTool__EndCarry` was skipped.
- **A record is rewritten with `indent=4`,** so points are strings in an asset. Never a list.
- **`Na__VegTools__SetFallback` is one slot.** Only one asset browser is open at a time, because both are on the left and both shells close each other's panels on a side. A right-side panel from the other system stays up.
- **Synthetic pointer events reach OrbitControls,** whose `setPointerCapture` throws for a pointer that is not real. A script error from that in a headless check is the check's, not the app's.
- **Dropping over the app's own panels or the scene carousel cancels,** by `elementFromPoint`, which needs the overlay canvas's `pointer-events: none`.

## Checks and How to Run Them

```bash
python 54__Entourage__AssetLibrary/Na__Entourage__BuildUtil__Library__.py validate
```

```bash
python 54__Entourage__AssetLibrary/Na__Entourage__BuildUtil__Library__.py index --check
```

The real app on fake data: `Start__ValeVision__TestServer__8032__.bat`, then Dev Tools > Assets > Entourage. For an agent, the `valevision3d` MCP tools, as the plants.
