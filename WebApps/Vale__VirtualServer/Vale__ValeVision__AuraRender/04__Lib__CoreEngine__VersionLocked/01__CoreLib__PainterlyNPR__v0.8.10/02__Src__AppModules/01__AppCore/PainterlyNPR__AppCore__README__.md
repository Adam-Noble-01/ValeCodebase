# 01__AppCore

**01-09 · The spine** · real code since v0.5.0

Boot order and the few services every other module leans on.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `Na__AppState__Config.json` - The Starting State
- `PainterlyNPR__AppCore__Init__.mjs` - Start PainterlyNPR: a WebGL 2 context on the sheet's canvas, every program compiled, the scene's vertex arrays, the targets, the interface wired, and the first drawing requested
- `PainterlyNPR__AppCore__State__.mjs` - Everything a render depends on, in one flat object - the object the settings JSON serialises, a save records and a load puts back

**Belongs here**

- `PainterlyNPR__AppCore__EventBus__.mjs` - the one message bus between modes, passes and interface.
- `PainterlyNPR__AppCore__ConfigLoader__.mjs` - loads `02__AppData` and the shipped presets in `05` to `11`.
- `PainterlyNPR__AppCore__ModeManager__.mjs` - the five workspace modes: Scene, Style, Paper, Art Direction, Export.
- `PainterlyNPR__AppCore__Init__.mjs` - the single entry point. Its import order is the boot order; there is no second one.

**Takes** the HTML shell. **Gives** a booted application.

**Manifest:** §03 Modes and Workspace Philosophy; §13 Initial Implementation.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: region *Boot* (`PainterlyNPR__Boot__Start`).

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
