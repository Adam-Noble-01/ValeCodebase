# ValeSpec Development Log
# =========================================================

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
