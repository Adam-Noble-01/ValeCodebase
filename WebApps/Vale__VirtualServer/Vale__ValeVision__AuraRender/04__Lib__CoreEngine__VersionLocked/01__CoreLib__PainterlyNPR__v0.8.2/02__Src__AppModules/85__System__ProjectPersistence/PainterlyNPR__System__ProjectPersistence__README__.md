# 85__System__ProjectPersistence

**80-89 · Workspace, project and export** · real code since v0.5.0

Projects as schema-validated JSON, recalled deterministically.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `Na__ProjectPersistence__Config.json` - Saved Settings
- `PainterlyNPR__Interface__SettingsJson__.mjs` - The settings JSON: deterministic recall in one object - shown, copied and applied in the Export tab
- `PainterlyNPR__Persistence__Styles__Saves__.css` - Named set-ups, in this browser and in the saves folder
- `PainterlyNPR__Saves__SavedSettings__.mjs` - Named set-ups: saved in this browser and, through the local server, as files in 21__Generated__UserProjects - with a history and a bin

**Belongs here**

- Package version, engine version, style IDs, point seeds, object seeds, camera state, output settings and the important numbers.
- Migrations between schema versions; save/reload regression tests (`62`).
- The contract is stable aesthetic and geometry - not impossible cross-GPU bitwise identity.

**Takes** application state. **Gives** project files in `21__Generated__UserProjects`.

**Manifest:** §14 Deterministic Recall.

**Prototyped in** `80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup`: the settings JSON in the Export tab, which re-applies a render exactly, and (v0.4.1) **Saved settings** - named saves in the browser and, through the local server's `/api/projects`, as files in `21__Generated__UserProjects`, with a history and a bin.

The experiment stays in `80__Experiments__RenderPrototypes` as the reference: the app draws what it draws, pixel for pixel (`60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py`).
