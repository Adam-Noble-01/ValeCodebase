# ValeSpec Development Log
# =========================================================

# ---------------------------------------------------------
## ValeSpec v0.0.5 - 15-Apr-2026
### Assembly Editor Workflow Refactor + Save Pipeline Hardening

**Overview**
- Added `Save Assembly` final-step gate behavior so button visibility is controlled by wizard progression through steps `1-6` before reaching `Misc`.
- Added `Misc -> Other` option with conditional text input and persisted `Assembly__Miscellaneous__Config__OtherText` support.
- Refactored coupled `HooksAndMisc` implementation into two separate modules:
  - `ValeSpec__AssemblyEditor__DoorConfigurator__CabinHooks__.js`
  - `ValeSpec__AssemblyEditor__DoorConfigurator__Miscellaneous__.js`
- Rewired orchestrator/script loading so hooks and misc now initialise/refresh independently from `ValeSpec__AssemblyEditor__DoorConfigurator__Main__.js` and `ValeSpec__App__.html`.
- Added config-driven hooks/misc schema in `Na__AssemblyEditor__Config.json` to reduce hardcoded values (options, defaults, min/max, Other/NA behavior).
- Hardened save flow to flush step controls before save and perform explicit project persistence from Save action (not only event-chain autosave).
- Updated `ValeSpec__ProjectFileManager__ServerWrite(...)` to return deterministic success/failure results and updated autosave lifecycle for global finish/lever changes.
- Result: Assembly Editor section behavior is more modular, data-driven, and save reliability to project JSON is improved.

# ---------------------------------------------------------

# ---------------------------------------------------------
## ValeSpec v0.0.4 - 15-Apr-2026
### SVG Dimension Edit -> UI Panel Sync

**Overview**
- Fixed Assembly Editor sync gap where clicking SVG dimensions and entering values updated state/SVG but did not refresh right-side UI controls.
- Added `assemblyUpdated` observer routing in `ValeSpec__AssemblyEditor__Layout__.js` so assembly changes now propagate to Door Configurator UI refresh.
- Added non-destructive `ValeSpec__DoorConfigurator__SyncFromAssemblyUpdate(...)` in `ValeSpec__AssemblyEditor__DoorConfigurator__Main__.js`.
- Preserved existing full refresh path for `assemblySelected` / mode-entry while avoiding `Next`-progress reset during frequent live updates.
- Result: SVG inline width/height edits now keep Quantity & Dimensions panel values and sliders in sync immediately.

### Assembly Preview Adaptive Sizing + Layout Cleanup

**Overview**
- Fixed Assembly Editor layout config key wiring so `Na__AssemblyEditor__Config.json` values now apply correctly in `ValeSpec__AssemblyEditor__Layout__.js` (with backward-safe fallback support).
- Reworked preview card sizing in `ValeSpec__AssemblyEditor__SvgPreview__.js` to be data-driven from rendered SVG `viewBox` ratio instead of fixed geometry.
- Added adaptive fit behavior using preview-panel available space + resize handling (`ResizeObserver` and `window` resize fallback), improving behavior for both wide and tall assemblies.
- Removed fixed card sizing constraints from `ValeSpec__AssemblyEditor__Styles__Main__.css` and kept the required panel-side margin behavior.
- Extended SVG viewport config in `Na__SvgDrawing__Config.json` to support per-side render padding (`Top/Right/Bottom/Left`) and updated `ValeSpec__SvgDrawing__RenderPipeline__.js` viewBox calculation to use asymmetric padding.
- Reduced effective top render-space padding by 25% via viewport config (while keeping other sides unchanged) so top whitespace now responds as expected.

### Door Panel Defaults + Condition Rules (Config Driven)

**Overview**
- Added `AssemblyEditor__DoorPanelDefaults__Config` in `Na__AssemblyEditor__Config.json` with explicit door-type profile mapping and per-profile min/max/default dimensions.
- Wired new assembly creation in `ValeSpec__DocEditor__SectionManager__.js` so new panels now use config-driven defaults (Double `1800 x 2100`, Single `900 x 2100`) instead of hard-coded values.
- Updated `ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions__.js` to apply door-type defaults/min/max when changing door type, and to clamp entered values against profile limits.
- Updated dimension click-edit limits in `ValeSpec__AssemblyEditor__SvgPreview__.js` so inline SVG edits use the same configured min/max constraints (including 1600-3000 door height range).
- Added `AssemblyEditor__DoorConditionWarnings__Config` with rule thresholds/messages (3 hinges, tall-door 4 hinges, Double Top, Subject to Review) and wired condition state updates from dimension changes.
- Updated `ValeSpec__MathUtils__HingeCalculator__.js` thresholds to align with current rule intent (`949/1899` standard limits, `950+` wide condition, `2250` tall threshold), and aligned warning message key reading in `ValeSpec__AssemblyEditor__WarningSystem__.js`.

# ---------------------------------------------------------

# ---------------------------------------------------------
## ValeSpec v0.0.3 - 15-Apr-2026
### Full Codebase Naming Convention Refactor — ValeSpec Three-Part Namespace

**Overview**
- Applied the `ValeSpec__<FeatureOrSystem>__<FunctionPurpose>` three-part naming convention across the entire codebase.
- All module-level functions, private helpers, and public API keys now follow this convention consistently.
- The underscore prefix pattern (`_functionName`) has been fully replaced — the namespace itself establishes scope.
- All cross-module method calls updated throughout to use the new public API keys.
- A dedicated `.cursor/rules` MDC file created for ValeSpec to enforce the naming convention going forward.

**Files Updated — AppCore**
- `ValeSpec__AppCore__ConfigLoader__.js` — all functions renamed to `ValeSpec__ConfigLoader__*`
- `ValeSpec__AppCore__ModeManager__.js` — all functions renamed to `ValeSpec__ModeManager__*`
- `ValeSpec__AppCore__StateManager__.js` — all functions renamed to `ValeSpec__StateManager__*`
- `ValeSpec__AppCore__Init__.js` — all functions renamed to `ValeSpec__AppCore__*`, all cross-module calls updated

**Files Updated — AppData**
- `ValeSpec__AppData__HardwareIndexLoader__.js` — all functions renamed to `ValeSpec__HardwareIndexLoader__*`
- `ValeSpec__AppData__ProjectFileManager__.js` — all functions renamed to `ValeSpec__ProjectFileManager__*`

**Files Updated — AppUtils & MathUtils**
- `ValeSpec__AppUtils__DateFormatter__.js` — all functions renamed to `ValeSpec__DateFormatter__*`
- `ValeSpec__MathUtils__HingeCalculator__.js` — renamed to `ValeSpec__HingeCalculator__CalculateHingesPerLeaf`
- `ValeSpec__MathUtils__LockingCalculator__.js` — renamed to `ValeSpec__LockingCalculator__CalculateLocking`

**Files Updated — SvgDrawing Render Pipeline**
- `ValeSpec__SvgDrawing__CoordHelpers__.js` — all functions renamed to `ValeSpec__CoordHelpers__*`
- `ValeSpec__SvgDrawing__DimensionRenderer__.js` — renamed to `ValeSpec__DimensionRenderer__*`
- `ValeSpec__SvgDrawing__DoorFrameRenderer__.js` — renamed to `ValeSpec__DoorFrameRenderer__*`
- `ValeSpec__SvgDrawing__DoorPanelRenderer__.js` — renamed to `ValeSpec__DoorPanelRenderer__*`
- `ValeSpec__SvgDrawing__IronmongeryRenderer__.js` — renamed to `ValeSpec__IronmongeryRenderer__*`
- `ValeSpec__SvgDrawing__RenderPipeline__.js` — renamed to `ValeSpec__RenderPipeline__*`, all sub-renderer calls updated

**Files Updated — Document Management Mode**
- `ValeSpec__DocManagement__ProjectList__.js` — renamed to `ValeSpec__ProjectList__*`
- `ValeSpec__DocManagement__ProjectActions__.js` — renamed to `ValeSpec__ProjectActions__*`

**Files Updated — Assembly Editor Mode**
- `ValeSpec__AssemblyEditor__GlobalSettings__.js` — renamed to `ValeSpec__GlobalSettings__*`
- `ValeSpec__AssemblyEditor__WarningSystem__.js` — renamed to `ValeSpec__WarningSystem__*`
- `ValeSpec__AssemblyEditor__StepManager__.js` — renamed to `ValeSpec__StepManager__*`
- `ValeSpec__AssemblyEditor__SvgPreview__.js` — renamed to `ValeSpec__SvgPreview__*`
- `ValeSpec__AssemblyEditor__Layout__.js` — renamed to `ValeSpec__Layout__*`
- `ValeSpec__AssemblyEditor__DoorConfigurator__Main__.js` — renamed to `ValeSpec__DoorConfigurator__*`
- `ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions__.js` — renamed to `ValeSpec__DoorTypeAndDimensions__*`
- `ValeSpec__AssemblyEditor__DoorConfigurator__HingesAndLevers__.js` — renamed to `ValeSpec__HingesAndLevers__*`
- `ValeSpec__AssemblyEditor__DoorConfigurator__HooksAndMisc__.js` — renamed to `ValeSpec__HooksAndMisc__*`

**Files Updated — Document Editor Mode**
- `ValeSpec__DocEditor__DocumentHeader__.js` — renamed to `ValeSpec__DocumentHeader__*`
- `ValeSpec__DocEditor__JobNotes__.js` — renamed to `ValeSpec__JobNotes__*`
- `ValeSpec__DocEditor__SectionManager__.js` — renamed to `ValeSpec__SectionManager__*`

**Files Updated — Document Preview Mode**
- `ValeSpec__DocPreview__PageRenderer__.js` — renamed to `ValeSpec__PageRenderer__*`
- `ValeSpec__DocPreview__SpecTableRenderer__.js` — renamed to `ValeSpec__SpecTableRenderer__*`

**Tooling Added**
- `.cursor/rules/01-NamingConvention-ValeSpec-Functions-And-Variables.mdc` — enforces the three-part convention for all future AI-assisted development on this project

# ---------------------------------------------------------

# ---------------------------------------------------------
## ValeSpec v0.0.2 - 15-Apr-2026
### First GitHub Push

**Overview**
- First pushed to GitHub 15-Apr-2026
- Still a extremely early stage project.

# ---------------------------------------------------------

# ---------------------------------------------------------
## ValeSpec v0.0.1 - 15-Apr-2026
### Initial WireFrame Release

**Overview**
-Initial wireframe release of the ValeSpec project.
- Built basic hardware data index loader.
- Built supporting tooling such as the hardware data index loader and the hardware data viewer.
  - This is a CAD style viewer which is used to view the hardware data index.
- Built out the SketchUp Ruby Script to produce the Json files for the hardware data index.


# ---------------------------------------------------------
