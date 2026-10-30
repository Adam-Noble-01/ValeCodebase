# ValeVision AURA: DEVLOG

## Version 0.1.1, 30-Oct-2026: Paper First, Typed Values

**Asked by Adam:** "Next in both Aura and the NPR viewer move the paper and finish first 1. Paper & Finish 2. Lighting
3. Pen 4. Wash 5. Sky ... Make all parameters on both apps typable too so you can type values or use sliders"

**Built:**
- **Group order** (`AuraConfig__Engine__ParameterGroups`): Paper and finish, Light, Pen, Wash, Sky. The first two open
  by default for anyone with no folds remembered.
- **Typed values** (`11__System__Environment3d/Na__Environment3d__Parameters__.js`, `Na__Parameters__TypeIn`): click a
  readout (or Tab to it, Enter), type the value as it shows (`60%`, `1.2`, `off`), Enter; Escape puts it back. The value
  goes in through the slider and its input event, so it acts exactly as a drag would.
- **Reading a typed value:** the engine host's `Na__EngineHost__Control` gains `Parse`. It uses the engine's own
  (`.Parse` on a readout, PainterlyNPR v0.5.2) when the pinned engine has it, and until then
  `Na__Format__ParseReadout` (`03__AppUtils`), a mirror of PainterlyNPR's `ParseFrom`, read from the same format data.
  Drop the mirror after the v0.5.2 sync.
- The worker's version `2026-10-30-2`.

**Not yet:** not checked in the browser here (Adam tests it); not pushed to the server.

## Version 0.1.0, 30-Oct-2026: The Foundations

**Asked by Adam:** "We need to build out the structure in my style for a new Project AURA which is a wrapper using my
new NPR Render, it will extend ValeVision 3D Models into a new third Engine separate from Whitecard, MaxModels etc but
a Whitecard / MaxModel can be transported to AURA and rendered using the AURA Library as Noble Architecture will also
be building a wrapper using the same core engine code from the library ... so that repo can serve two codebases."
And: a 3D Environment that loads the NPR renderer's demo scene (the cottage); tabs for drawings with fixed 3D and 2D
viewports on Vale's drawing page set up for A1, A2, A3 and A4, landscape and portrait; elevation scales 1:50 and
1:100 and a top-down roof plan; a full annotation system using the humanised handwriting demo, brought into a system
subfolder of the app's modules; Managers and App Admins only from the Gallery ("employees must not see Project Aura
yet"); "a version up and running on the server that Managers and Devs can view" at `/aura`.

**Adam's calls (30-Oct-2026):** the engine seam lives in AURA for now (PainterlyNPR untouched); the Gallery shortcut
on cards with a 3D model plus a button on every project page; push to the server after his local test. Then: "the NPR
renderer will be Web GPU and Web Assembly but all that work will be done locally on the user machine. Long term ...
rewrite [the text renderer] in WASM ... serve the binaries and cache them in the PWA ... the server is resource
constrained." So the handwriting runs on the user's PC (never torch on the VPS), its ink is saved with each note,
and AURA ships with a service worker that keeps the pinned engine on the device.

**Built:**
- **The app** in the Vale apps' house style (Theia's page, header, spinner, shared sign-in, activity ledger, deploy
  stamp), its modules in numbered folders, its config in one JSON read by the page and the API.
- **The core library, pinned:** PainterlyNPR v0.5.0 at 29bbcf1, 185 files, copied byte for byte by
  `60__Dev__WebBuildUtils/AuraRender__BuildUtil__SyncCoreEngine__.py` with a SHA-256 lock (`--check` proves it).
- **The engine host** (`10__System__EngineHost`): PainterlyNPR's boot without its panel; camera presets, orbit and
  zoom; the engine's own controls; settings saved with the drawing set; stills for the sheets (the PNG export, in
  memory). The engine's interface modules still in its graph are given somewhere to write (status line, a detached
  point layer, hidden view-badge stand-ins).
- **3D Environment:** the engine's live drawing of the cottage, presets, saved views, a new seed, and the parameters
  (light, pen, wash, sky, paper and finish) built from the engine's own controls config.
- **Drawing sheets:** A1 to A4, landscape and portrait, on Vale's drawing page: the RecConcept layouts' 60 x 280.5 mm
  title column (bottom right; turned along the foot at bottom left in portrait; scaled only on A4), its fixed cells
  cut at 300 dpi from Vale's A3 layout, its field cells drawn as vectors, the scale written from the views.
- **Viewports:** the four elevations and the roof plan to scale (1:20, 1:50, 1:100, 1:200), each an orthographic
  engine still at a half-height of 200 mm x scale / 2000 metres (the engine's own 1:100 elevation is 10 m), placed at
  its true 300 x 200 mm, so the pen widths are true on the paper; 3D views from presets or saved views. Move, resize
  (a scaled view's drawing stays put), Alt-drag to pan, a properties panel, and a render queue drawing one still at
  a time, cached by what made it.
- **Annotations:** notes and leader notes; leaders are the studio's seeded hand-drawn arrows; the ink is the studio's
  Graves model through the AURA API's worker (PC only), saved with the note; a typed stand-in until written.
- **The handwriting engine** brought in from the Vale Handwriting Studio (`Experiment__HandwritingTest`, 02-Oct-2026):
  its `engine.py` with only its toolkit path changed, the pinned toolkit (899e9432, MIT) and the Epoch 46 model
  (git-ignored: IAM-OnDB rights; excluded from the server push).
- **The API** (`Api__ValeVision__AuraRender`, port 8006): config, project, drawing sets (a whole-document save with
  `_rev`, a kept revision at most every five minutes), handwriting status and write. Management and AppAdmin only.
- **The Gallery** (1.6.0): the AURA shortcut for Managers and App Admins only.
- **Server registration:** sync mapping `aura` (excluding `*.pt`), route `/aura/` with its API on 8006, `aura` in the
  activity ledger's app list, the library schema's `ValeVision__AuraRender` folders.

**Checked here (no browser):** every JavaScript module parses; all 252 named imports resolve to an export, the
engine's included; the API imports as the dev server imports it and answers health and config, and 401 to every
project route signed out; the handwriting worker wrote "Handmade clay plain tiles" (12.7 s cold, torch and the model
loading) and "Oak porch 2400 mm x 1200 mm" (0.2 s) through the API's own path.

**Not checked:** anything in a browser (Adam tests): the engine booting on AURA's canvas, the stills, the roof plan
(the engine's first top-down view), the sheets, the Gallery shortcut.

**Not yet:** see the README's Not Yet list.

**Live (Adam: "Tested, push it live"):** pushed 30-Oct-2026 11:59 UTC (`aura`, `server-api`, `valevisiongallery`,
`commonassets`; nothing deleted); `vale@ValeVision__AuraRender` enabled on 8006 (Flask only); Adam applied nginx at
12:03 UTC (hash `760db8942de3`). Checked through Cloudflare signed out: `/aura/` 200, `api/health` and `api/config` 200,
the project and handwriting routes 401, the manifest and the Gallery icon 200.

**PainterlyNPR v0.6.0 (another session, same day):** an asset library is being built into the engine, uncommitted. That
session confirmed it keeps what AURA's host relies on: `Load()` with no arguments, Rendered as the default work mode, no
new DOM lookups in the render path, `State.Assets` additive, no export renamed, and the scene buffer kept working for a
host that does not set `Gpu.Buffers.Scene`. Its DEVLOG "Wrappers" line lists what the next sync needs.

(Uncommitted in git, waiting on Adam.)
