# 02__AppData

**01-09 · The spine** · real code since v0.5.0

The application's own configuration - the first of the seven layers in §14, engine defaults.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `Na__Palette__Config.json` - Palette and Interface Tokens
- `PainterlyNPR__AppConfig__Main__.json` - Main Application Config
- `PainterlyNPR__AppData__Engine__.mjs` - The sheet, the engine's version and its limits: what every millimetre on the paper is measured against

**Belongs here**

- `PainterlyNPR__AppConfig__Main__.json` - AppVersion, engine version, folder registries, feature flags, quality tiers.
- `Na__Palette__Config.json` - the interface palette, the single source of truth that `03__Style__AppStylesheets` mirrors.
- Not the pigment palette: pigments belong to material recipes (`07__Data__MaterialRecipes`).
- Config keys are PascalCase, each with a sibling `<Key>Note` saying why the value is what it is.

**Takes** -. **Gives** configuration to every module, through `03__AppUtils` ConfigAccess.

**Manifest:** §14 Configuration-Driven Artistic System.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: region *Module Constants and Config* - its tables are the first draft of these files.

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
