# ValeVision 3D - Vegetation System - Working Memory (for agents)

> **Live hand-off file.** Read this first if you are an agent picking up the vegetation system, then the plan: `ValeVision__PLAN__VegetationSystem__.md`. Update it at the end of every stage, in the same change. **Last updated: 04-Nov-2026.**

## Where It Stands

| Stage | State | Version | Note |
|---|---|---|---|
| Prototype | Done, look agreed by Adam ("These look good") | none: `85__EarlyStage__VegetationLinework`, never pushes | |
| Plan | Written, and Adam said start | | `ValeVision__PLAN__VegetationSystem__.md` |
| 1. Foundations | **Done** | v2.83.0 | Engine, library, the record's key and the door are in. Nothing draws. `24__System__Vegetation`, not the 94 the plan first said |
| 2. Plants in the model | **Done, live since 04-Nov-2026 15:19 UTC** | v2.84.0 | Pilot: `63403__Thrower` (its real record not yet written: Adam switches it on, which on the live server writes the real record). PC target met. **Open: 100 plants at 30 fps on a real iPad.** The API's ledger row is live: `vale@ValeVision3D` restarted at that push |
| 3. The menu | **Built** | v2.85.0 | Tools & Settings > Vegetation; Show and Transparency for everyone, device memory; an author's rows are built for an author only |
| 4. Asset browser | **Built** | v2.85.0 | Cards drawn live, Rendered, Proxy or Both, click then model, In This Project, move, turn, remove, pinning, undo, Save |
| 5. Linear Tool | **Built** | v2.85.0 | BVH pick, a 2D canvas for its aids, grips, curved, Advanced, Bake |
| 6. Bush Tool | **Built** | v2.85.0 | Palette with shares, paint and erase, stroke undo, proxies while painting |
| 7. Pictures finished | **Built** | v2.85.0 | The plants' stamp in a sheet's fingerprint; a preview frame takes the live budget; inner lines stay lighter under a sheet's edge width |
| 8. Drawings | **Built** | v2.85.0 | A viewport's Vegetation tick (off by default) and a project's Show on Live Drawings. On screen and in the PDF, opaque over the vectors |
| 9. SketchUp both ways | **Built, not run on real entities** | v2.85.0, Cloud Sync 0.6.0 | Its DEVLOG lists what to try. No empty window could be reached: the listing's untitled pid 97292 holds an unsaved model |
| Adam's look after trying it | **Live since 04-Nov-2026 21:19 UTC** | v2.86.0, Cloud Sync 0.6.1 | The fill at the walls' brightness; Plant scale and sizes everywhere; Clipped Hedge, Box Ball, Standard Bay, Yew Cone, Mophead Hydrangea; `ClippedForm`; a box proxy |

## Decisions in Force

Adam's answers D01 to D07 and the defaults D08 to D22 are in the plan, section 1. The ones most easily got wrong:

- **One switch** (D02). Dev Tools Enable off: no menu, no plants, no cost. There is no "plants without a menu".
- **All parameters save in the project's file** (D06), as `Vegetation__SceneData` in `ProjectData__<id>__.json`, in the Record dialect. Every parameter is written, not only what differs. Save with `Na__LocalMirror__MergeKeys`, never a whole-record POST.
- **Paths save rules, strokes save plants** (D16, D17). A path's plants are never written to the record.
- **A project pins its own asset copies** (D14), and **generators are never edited** (D15): a saved seed draws the same bush for ever.
- **Transparency fades lines and fill together** (D03). At 0% the opaque path runs unchanged.
- **ValeVision wins a clash** with SketchUp (section 5), as AURA does.

## What Is Left

- **Run Stage 9 on real SketchUp entities,** in an empty window or a throwaway copy of a model: Cloud Sync's DEVLOG 0.6.0 and 0.6.1 have the list. `na_build_box` has not run at all.
- **Adam's verdict on the new plants and the fill:** Adam has seen pictures, and has not yet tried the panels.
- **100 plants at 30 fps on a real iPad,** and a real phone generally. Only estimated so far.
- **Export Render Layers has no plants,** and default export anti-aliasing at 1 sample makes 0.6 px inner lines look dotted: both noted at Stage 2 and not touched.
- **A real Video Studio preview** has not been played with plants: a preview frame is numbered and takes the live budget, checked at the function.
- **`Na__VegRun__GetLayer` and `GetContext`** are how a panel, and a check, reach the layer.

## How to Prove Nothing Moved

Keep these green at every stage, from the scratch scripts' method (their logic is in the DEVLOG entry for v2.83.0):

- **Engine hash:** every lobe, table and buffer over 3 assets, 12 seeds and 3 views: `7f585d5fddf5f48e2650cc3d75903051`. A change means a saved plant has changed, which D15 forbids.
- **Prototype pixels, `?clean=1` at 1400 x 800:** closeup `0ef2e4c8`, elevation `da745e1d`, perspective `a1ac3204`, birdseye `c1dafc00`, lineup `424c6d1f`.
- **Boot graph:** 313 modules, through `vv3d_check.py graph`. It should not grow: everything but the door loads by `import()`.
- **On the real app (v2.84.0, and again at v2.85.0: `45759d6bafcf` at 1400 x 800 on software rendering):** no key, switched off, and on with no plants are one and the same picture. A settled view after an orbit is identical to the view before it and to a clean rebuild. A drawing is identical with plants and with them hidden. Under Max, a project without plants has the same pixels with and without the AO line, but only with `Math.random` seeded first: the AO kernel is random per load, so two loads never match otherwise.
- **Python and JavaScript agree:** the sync's `na_plants_for` against `Na__VegPath__PlantsFor` in Node, 121 plants of 9 paths identical. Any change to the path model or the generator is a change to both.

## Traps Already Hit

- **Fit moves centres, not radii.** In a narrow bed the clumps were pulled in but the masses kept their radius, so the masses buried the whole face of the bush and every inner arc vanished. That is why `IsHidden` never lets a mass hide a clump or nub (`Na__VegLine__Contour__.js`). Do not "fix" it back.
- **Inner arcs pinned to the top of a ball almost never drew:** a neighbour usually covers that spot. They slide along the visible part instead.
- **A hook set out in polar terms is a straight tick.** A curl needs a heading that keeps turning. An arc reaches its cusp already heading inward, so a hook turns back under the arc it came from.
- **A lit fill facing the eye goes grey** whenever the camera comes round away from the sun, and looks dirty against the walls. The fill is unlit, tone 0.975, set in working space because the composer's route is raw.
- **A fat line is never hidden with `.visible`:** the profile pre-pass forces it back on. Empty the count or use `material.visible`.
- **The model's depth bias is about 15 cm at 150 m.** Plants use 0.00003, or one bush's lines show through the bush in front.
- **A long lens is not orthographic.** The demo's scene views use a 150 m perspective camera, because the composer is built with one camera. Real elevations use a true orthographic one: the contour code handles it and the drawer cards use it, but no scene has been drawn through one yet (Stage 8).
- **On a card there is no depth test.** A blade behind the bush must be left out, and one in front must paint its own fill first.
- **A screenshot hash includes any live number in a panel.** Use `?clean=1` to prove identical pixels.
- **Many of the app's working copies are CRLF** (`core.autocrlf`), though not all: index.html is LF. A patch anchor spanning lines fails on a CRLF file, or worse, inserts a mixed ending. Check with Python's byte counts: Git Bash's `grep -c` said 0 on a file with 1,925.
- **A patch script that stops half way cannot simply be run again:** the parts it finished would insert twice. Write each file once, then finish the rest in a new script.
- **The Curls slider does nothing where curls have dropped out by size:** thresholds are in pixels, so a slider test belongs in the Close-Up view.
- **A slot's room must be a whole number of primitives.** Fill vertices are read in threes from the start of the buffer, so a slot with spare room of 8 vertices shifts every plant after it into confetti. Line segments are one item each, so only the fill shows it.
- **A frame renders the scene three times.** A later render with the same view is not the camera having stopped: only a later frame is, so the budget works from a frame number. Get this wrong and every moving frame draws everything on its second pass.
- **Frame rate hides stale plants.** 60 fps with 4 plants redrawn a frame left far plants 36 px out. Read `stats.worstErrorPx` as well as the frame time.
- **`three` caches a geometry's instance limit** (`_maxInstanceCount`), so a line buffer that grows needs a new geometry, not just new attributes.
- **A material with alpha 0 is opaque only with `NoBlending`:** with `NormalBlending` and not transparent, three defines OPAQUE and writes 1. Alpha 0 must never reach the page: only write it while the AO blur is there to set it back.
- **`pg.evaluate` calls a function it is handed:** a script string ending in a function assignment gets run. End it with `true;`.
- **`wait_for_function` twice hung for 240 s** with the page perfectly well: poll with `evaluate` in a loop. `ERR_NO_BUFFER_SPACE` after many runs is Windows sockets running out: wait two minutes.
- **An install card sits over the model on a first visit,** and swallows a test click.
- **The window listing's empty title does not mean an empty window.** `sketchup_status` showed pid 97292 with no title, and selecting it reported `MCP__FancyFascia__`, modified. Read the `model` block after selecting, before running anything that changes a model. Pure maths (`Geom`, compiling a file) touches no model.
- **A stand-in harness can run in SketchUp's own Ruby without touching a model:** `load(path, true)` wraps it in an anonymous module, and `BOX.module_eval(File.read(target))` loads a plugin file under it without disturbing the loaded plugin. Real `Geom`, fake entities, no undo step (`transaction: false`).
- **`wait_loaded` that treats no overlay as loaded** looks too early: the overlay is not there at the very start. Wait for its `hidden` class.
- **On Max, the AO mark at the see-through share cut the wall's shadow out behind every plant,** leaving dashes in the gaps. From that share the fill is in neither AO pass, so the mark stops.

## Checks and How to Run Them

- **Demo:** `python 85__EarlyStage__VegetationLinework/Na__VegLine__LocalServer__.py 8037`, then `http://127.0.0.1:8037/Vale__ValeVision3D/85__EarlyStage__VegetationLinework/`. It has `?view=`, `?mode=`, `?clean=1`, and sets `document.documentElement.dataset.naVegReady` and `naVegSettled` for a scripted capture.
- **The real app, on fake data (since v2.84.1):** the testing server. Adam's is `Start__ValeVision__TestServer__8032__.bat`; an agent runs `scripts/vv3d_test_server.py start --port 8040 --hold` as a background command, then `smoke`, and `look --as Employee --shot x.png`. Note 19, section 7.7 of the skill. Thrower is in its sandbox.
- **Headless:** Playwright with `channel='msedge'` and `--use-angle=swiftshader --use-gl=angle --enable-unsafe-swiftshader --ignore-gpu-blocklist` draws the real PureEngine, about 5 s to a settled view. For a frame rate, `--use-angle=d3d11 --use-gl=angle --ignore-gpu-blocklist --enable-gpu` reaches the real graphics card, with a 60 Hz rAF.
- **Standing rule:** Adam tests the app. Browser checks here have been for judging a look or measuring, and are reported as such.

## Measured Baselines

| What | Figure |
|---|---|
| 300 plants orbiting, RTX 5080, 1600 x 900 (v2.84.0) | 60 fps, tick 6 ms; exact drawing back in under 450 ms; the DEVLOG has the table |
| One plant, exact, by radius on screen | 356 px 2.0 ms, 142 px 1.2 ms, 47 px 1.1 ms, 24 px 0.9 ms |
| One plant, moving drawing, by radius on screen | 356 px 1.3 ms, 142 px 0.7 ms, 47 px 0.4 ms, 24 px 0.03 ms |
| Exact lines while orbiting with no budget, 14 plants in view | Median 13 ms a frame, worst 30 ms |
| Exact lines while orbiting with no budget, 56 plants in view | Median 53 ms a frame, worst 74 ms |
| Build, 29 plops | About 70 ms |
| One plop in the record | 580 bytes as written; 160 compact |
| One path of 4 points in the record | 1.6 KB |
| Records today | Median 2 KB, largest 132 KB, 182 projects |

Stage 2's targets: 300 plants at 60 fps on Adam's PC (met), 100 at 30 fps on an iPad (open: only estimated, by slowing this PC's CPU).
