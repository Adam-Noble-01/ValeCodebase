# 02__Src__AppModules

Every source module, one folder per system, numbered in bands that run in the order of the render graph:

**Scene Package -> Geometry / Camera -> Scene Data Buffers -> Semantic Line Candidates -> Paint / Stroke Synthesis -> Art Direction Fields -> Paper Compositor -> Export** (manifest §05).

A folder's number says where its work happens. Each folder's README says what belongs in it, what it takes and what it gives, and where the experiment already proved part of it.

| Band | Kinds | What lives there | Manifest | Taken | Free |
|---|---|---|---|---|---|
| 01-09 | AppCore, AppData, AppUtils, System, Env3d | The spine: boot, configuration, utilities, the PWA shell, the Scene-mode viewport, configuration resolution | §13, §14 | 01-06 | 07-09 |
| 10-19 | Import, Scene | The portable package contract, held in memory; the asset library's plops built into it (16); material classes given to objects and faces (17) | §04 | 10-17 | 18-19: re-import and the live bridge (Phase 5), adapters beyond SketchUp |
| 20-29 | System, Pass | The render graph, GPU resources, truth buffers, derived fields | §05, §12 | 20-24 | 25-29 |
| 30-39 | Line, Stroke | Pen and ink (38: stroke-built lettering, v0.8.0) | §06 | 30-38 | 39: a measurement layer (§11) |
| 40-49 | Organic | Plants and furniture by stroke grammar, never by mesh edges | §07 | 40-48 | 49 |
| 50-59 | Wash, Paper | Watercolour and paper; the Kuwahara filter (57, shared by the wash and the sky) | §08 | 50-57 | 58-59: other media, deferred (§16) |
| 60-64 | Atmos | Sky, distant landscape, aerial perspective | §09 | 60-63 | 64 |
| 65-69 | ArtDirection | Influence points and smart fields | §10 | 65-66 | 67-69 |
| 70-79 | Camera, Paper | Views, elevation planes, navigation, sheets; a view's ground cut on a wrapper's sheet (72, v0.8.13) | §11 | 70-72, 74 | 73: sections; 75-79 |
| 80-89 | System, Hud, Export | Workspace modes, pass viewer, the Assets drawer and its Materials tab, selection and the right-click menu (83), undo and redo (84), project files, output, the asset factory | §03, §12, §14 | 80-88 | 89 |
| 90-99 | Gpu, Wasm, Dev | Compute back ends and developer tools | §13 | 90, 95 | 91: `91__Wasm__RustModules`, *create only when justified*; 92-94, 96-99 |

## The application (v0.5.0)

Experiment 01's engine lives here now, module by module, in the bands above. How they hold together:

- **One entry.** The page loads `01__AppCore/PainterlyNPR__AppCore__Init__.mjs`; it imports what it starts, and they import the rest. Every module is reached from Init (the module test checks), or is a library entry the test lists: a module only wrappers import (72's ground cut, v0.8.13).
- **Exports at the foot**, in one `export { }` block, each under its three-stage name: `PainterlyNPR__<Area>__<Verb>` for functions, `PainterlyNPR__<Area>__<NAME>` for a value (`PainterlyNPR__Engine__SHEET_WIDTH_MM`, `PainterlyNPR__AppCore__State`). An importer may take a short local name with `as`, which is how the ported code kept every name it had.
- **Configs beside their readers.** A module reads its JSON documents through JSON imports (`with { type: 'json' }`) and `03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs`: a section is a copy, every key checked, a missing one a loud failure that names the file and key. Every document is in `02__AppData/PainterlyNPR__AppConfig__Main__.json`'s ConfigRegistry.
- **Load order.** A module may read another's const, let or class while it loads only if that module has already loaded - so the constants modules import nothing but JSON and ConfigAccess. Functions can be read at any time. `60__Dev__WebBuildUtils/PainterlyNPR__Test__AppModules__.py` walks the ES evaluation order from Init and fails on a read too early.
- **State** lives in the module that owns it - `PainterlyNPR__AppCore__State` (everything a render depends on), the GPU's `Gpu` and `Cpu` (21), the graph (20), the camera (70), each pass's output - and only its owner assigns it.
- **Stylesheets** beside the modules they dress, imported by `03__Style__AppStylesheets/PainterlyNPR__CoreUi__Styles__Index__.css` in a fixed order.
- **Readouts** are formats held as data, written by `80__System__HudOverlay/PainterlyNPR__Interface__Formats__.mjs`.
- **The panel** is built from `80__System__HudOverlay/Na__Interface__Panel__Config.json` by `PainterlyNPR__Interface__BuildPanel` before the interface is wired: a new control is an item there - for a slider, with an entry in `Na__Interface__Controls__Config.json` - never markup in the page.

A change that should not change the drawing is checked by `60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py` against Experiment 01.

## Taking a number

- The next free number in the right band - in the folder name and, once one exists, in the app config's registry. Look in both before taking it.
- A kind of work with no band gets one proposed to Adam first.
- A part that belongs to one module and is big enough for a file of its own lives in that module's folder.
- Folder names are `NN__Kind__Name`; files `PainterlyNPR__<Area>__<Name>__.mjs`; exports `PainterlyNPR__<Name>__<Verb>`. GLSL uses single underscores only: GLSL ES reserves `__`.

## Rules carried from the manifest (§15, §19)

- No giant modules and no hidden two-way dependencies. Every pass declares its inputs and outputs.
- Geometry truth stays separate from artistic stroke and wash representations.
- Measure before replacing JavaScript with Rust/Wasm or GPU compute; a migration preserves the output contract.
