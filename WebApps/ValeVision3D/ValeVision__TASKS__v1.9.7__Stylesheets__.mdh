# ValeVision3D v1.9.7 Tasks

## MAIN OBJECTIVE:
Better more descriptive naming and structure of stylesheets.

## Stylesheets

### IMPORTANT BACKGROUND
- Project uses a descriptive naming structure typical of all other files.

### INTRODUCTION 
- Several Stylesheets exist but are poorly named, located in the incorrect locations and structured in an ad hoc manner.

### THE ISSUE
- Stylesheets are not named consistently and are not structured in a way that is easy to understand and maintain.

### TASKS
- locate all of the style sheets throughout the project 
- they are currently named with all kinds of ad hoc naming. 
- we need to create a new unified naming structure with the correct name spacing and the correct naming style and convention like used on the rest of the project so map out all of the project names to build an idea of how I name things. 
- certain modules in their own folders such as the drawing layout tool Etc should have all of their styles separated and put in a style sheet in that respective modules subfolder rather than in the broad style sheets folder, though we only need to move if they pertain to a highly specific sub feature most of the style sheets should stay in this folder but just be renamed. 
- you will need to do an extensive search of all of the modules and see where the style sheets are loaded and update the loading links to point back to this new locations
- take your time with this task because it will affect loads of parts of the app and needs to be done very carefully. 
- building out a full picture is critical before doing anything

### AIMS OF THE UPDATES
- To align Stylesheet naming with the rest of the project and to be more descriptive and consistent.

### IMPORTANT CODING RULES
- Separate concerns as much as possible within new files. 
- Use the established three-stage name spacing system. 
- Carefully check all of the systems and build out a mental picture of the structures of dependencies between scripts. 
- Strictly use the existing units and Mass helper scripts already set up don't reinvent the wheel. 
- Use the app config file as much as possible for defaults driving downstream variables and constants in the modules. 

### MAP THE PROJECT FIRST BEFORE CODING
- The project is HIGHLY modular thus you need to build a picture of the existing systems to see how to wire up the new system to the existing systems.
- Utilise the tree diagram in the final section below to build a picture of the project and how the stylesheets are loaded and wired up to the correct systems and modules.

# -------------------------------------------------------------
## CONCLUSION
Once completed we should have a robust set of Stylesheets that are properly named and structured and loaded in the correct locations and wired up to the correct systems and modules.

# -------------------------------------------------------------
## PROJECT TREE STRUCTURE
ValeVision3D/
├── .cursor/
│   ├── rules/
│   │   ├──── 00-AgentRole-Global-.mdc
│   │   ├──── 01-NamingConvention-Global-.mdc
│   │   ├──── 02-Description-Global-.mdc
│   │   ├──── 03-dependency-Traversal-Protocol-.mdc
│   │   ├──── 04-AppConfig-Global-Critical-.mdc
│   │   ├──── 05-CodingConventions-Global-.mdc
│   │   └──── 06-World-Units-And-Conversions-Required-Global-.mdc
│   │
│   └──── debug.log
│
├── 10__DistributionEmails/
│   └──── Distro__InviteEmailEmbedCard__ValeVision3d.html
│
├── 80__Testing__PrototypeEnvironment/
│   ├── TestEnv__CompletedFeaturesDocs/
│   │   └──── Test__ModelInteraction__Animation__ClickToOpenDoors__.md
│   │
│   ├── TestEnv__CurrentFeatureTestScripts/
│   │   ├──── Test__TopLevelContainer__BuildingModelsByStorey__.js
│   │   └──── Test__TopLevelContainer__BuildingModelsByStorey__.md
│   │
│   ├──── TestEnv__FlaskLocalServer.bat
│   ├──── TestEnv__FlaskLocalServer.py
│   ├──── TestEnv__PrototypeTestingSandbox__DomAndLayout.html
│   ├──── TestEnv__PrototypeTestingSandbox__Main__.js
│   ├──── TestEnv__PrototypeTestingSandbox__Stylesheet.css
│   ├──── TestEnv__README__.md
│   └──── TestEnv__SubAppData__Config.json
│
├── assets__Skydomes/
│   └──── HdriSkydome__RuralLandscape__AutumnField__SunnyDay__4k__.hdr
│
├── rubyScript__SketchUpSisterTools__ToolsAndUtils/
│   ├──── Na__TrueVision__GlbBuilder__Version-1.3.0__10-Feb-2026__.zip
│   ├──── Na__TrueVision__GlbBuilder__Version-1.4.0__10-Feb-2026__.zip
│   ├──── Na__TrueVision__GlbBuilderUtility__Version-1.7.0__23-Feb-2026__.zip
│   ├──── Na__TrueVision__GlbBuilderUtility__Version-1.7.1__23-Feb-2026.zip
│   └──── Na__TrueVision__WhitecardModel__GlbBuilderUtility__Modules__LocalShortcut__.lnk
│
├── src__3dObject__InteractionsSystem/
│   ├──── 3dObjectIInteraction__Animation__ClickToOpenDoors__.js
│   ├──── 3dObjectIInteraction__Animation__ClickToOpenDoors__README__.md
│   └──── 3dObjectInteraction__Animation__WalkMode__ProximityToOpenDoors__.js
│
├── src__3dObject__ViewBuildingStoreysSystem/
│   ├──── 3dObject__ViewBuildingStoreys__README__.md
│   └──── 3dObject__ViewBuildingStoreys__SystemLogic__.js
│
├── src__AppConfig/
│   ├──── Na__AppConfig__Loader.js
│   ├──── Na__AppConfig__Main.json
│   └──── Na__AppConfig__MaterialsLibrary.json
│
├── src__AppFlow/
│   └──── Na__AppFlow__LoadingSequence.js
│
├── src__AppUtils/
│   └──── Na__AppUtils__ProjectLoader.js
│
├── src__CameraModes/
│
├── src__CameraUtils/
│   ├──── Na__UiFeature__CameraLens__Controls.js
│   ├──── Na__UiFeature__CameraPosition__Controls.js
│   └──── Na__UiFeature__SaveCameraSettings.js
│
├── src__GenerateObjects/
│   ├──── GenerateObject__AnimatedBallCloud.js
│   ├──── GenerateObject__AnimatedRGBBoxes.js
│   └──── GenerateObject__AnimatedWhiteStars.js
│
├── src__ImageExport/
│   ├──── Na__ImageExport__PostProcessEffects__HighPassSharpen.js
│   ├──── Na__ImageExport__PostProcessEffects__Levels.js
│   ├──── Na__ImageExport__PostProcessEffects__Pipeline.js
│   ├──── Na__UiFeature__ImageExport__Controls.js
│   └──── Na__UiFeature__ImageExport__ViewportOverlays.js
│
├── src__MaterialsSystem/
│   ├──── Na__MaterialsSystem__LibraryLoader.js
│   └──── Na__MaterialsSystem__MaterialSwap.js
│
├── src__MathUtils/
│   └──── Na__Math__Units.js
│
├── src__ModelLoader/
│   └──── Na__ModelLoader__MultiModel.js
│
├── src__ModelToggle/
│   └──── Na__UiFeature__ModelToggle__Controls.js
│
├── src__NavigationAndCameras/
│   ├──── Na__DefaultNavmode__IpadControls.js
│   ├──── Na__DefaultNavmode__MouseControls.js
│   ├──── Na__Navmode__OrbitControls__Damping.js
│   ├──── Na__Navmode__OrbitMode__SystemLogic.js
│   ├──── Na__Navmode__WalkMode__DesktopControls.js
│   ├──── Na__Navmode__WalkMode__SystemLogic.js
│   ├──── Na__Navmode__WalkMode__TouchScreenControls.js
│   ├──── Na__UiFeature__WalkModeControls.js
│   └──── Na__UiFeature__WalkModeEventListeners.js
│
├── src__PageLayoutSystem/
│   ├── 01__Dependencies__VersionLocked/
│   │   └──── jspdf.umd.js
│   │
│   ├── 02__VizDpt__TitleBlock__Pdf__/
│   │   ├──── PageLayoutSystem__TitleBlock__A3__.pdf
│   │   └──── PageLayoutSystem__TitleBlock__A3__.png
│   │
│   ├── 03__TitleBlock__LayoutPdfs__RecConcept__Feb-2026__/
│   │   ├──── A1 landscape layout.pdf
│   │   ├──── A1 landscape layout_-_Converted_From_PDF.png
│   │   ├──── A1 portrait layout.pdf
│   │   ├──── A1 portrait layout_-_Converted_From_PDF.png
│   │   ├──── A2 landscape layout.pdf
│   │   ├──── A2 landscape layout_-_Converted_From_PDF.png
│   │   ├──── A2 portrait layout.pdf
│   │   ├──── A2 portrait layout_-_Converted_From_PDF.png
│   │   ├──── A3 landscape layout.pdf
│   │   ├──── A3 landscape layout_-_Converted_From_PDF.png
│   │   ├──── A3 portrait layout.pdf
│   │   └──── A3 portrait layout_-_Converted_From_PDF.png
│   │
│   ├──── Na__PageLayoutSystem__2dNavigationControls__.js
│   ├──── Na__PageLayoutSystem__CanvasRenderPipeline__.js
│   ├──── Na__PageLayoutSystem__Controls__Pc__.js
│   ├──── Na__PageLayoutSystem__Controls__TouchScreen__.js
│   ├──── Na__PageLayoutSystem__Layout__.html
│   ├──── Na__PageLayoutSystem__PdfExport__A3__.js
│   ├──── Na__PageLayoutSystem__Stylesheet__.css
│   ├──── Na__PageLayoutSystem__SystemLogic__Main__.js
│   └──── PageLayoutSystem__TitleBlock__A3__.png
│
├── src__RenderPipeline/
│   ├──── Na__RenderEffect__ProfileLines__.js
│   └──── Na__RenderPipeline__PostProcessing__Setup.js
│
├── src__Scene__EnvironmentEffects/
│   └──── Na__Scene__DefaultFogEffect.js
│
├── src__Scene__LightingEffects/
│   └──── Na__Scene__DefaultSceneLighting.js
│
├── src__Styles/
    ├──── base.css
    ├──── canvas.css
    ├──── controls-instructions-panel.css
    ├──── fonts.css
    ├──── header.css
    ├──── image-export-overlays.css
    ├──── index.css
    ├──── loading-overlay.css
    └──── ui-components.css

# -------------------------------------------------------------
# PROPOSED NEW NAMING CONVENTION
- **Canonical stylesheet file pattern**
  - `Na__<DomainOrModule>__Styles__<FeatureOrScope>__.css`
  - Keep `Na__` prefix for all first-party files.
  - Keep `Styles` as the third namespace slot for consistency.
  - Use descriptive final scope names (avoid generic names like `base`, `index`, `main` unless intentionally acting as aggregator files).

- **Folder placement rules**
  - Shared/global app CSS remains in `src__Styles/`.
  - Module-specific CSS remains inside its module folder (example: `src__PageLayoutSystem/`).
  - Prototype/TestEnv-specific CSS stays in `80__Testing__PrototypeEnvironment/`.
  - Only move a stylesheet if it is tightly scoped to one feature/module and not reused globally.

- **Phase 01 | Build dependency map (NO renaming yet)**
  - Locate every `.css` file in the repo.
  - Locate every `link rel="stylesheet"` and every CSS `@import`.
  - Build a reference map: `stylesheet file -> all loader/import locations`.
  - Confirm import order dependencies for aggregator/index stylesheets before any rename.

- **Phase 02 | Apply naming convention to current known stylesheets**
  - `src__Styles/index.css` -> `src__Styles/Na__CoreUi__Styles__Index__.css`
  - `src__Styles/fonts.css` -> `src__Styles/Na__CoreUi__Styles__Fonts__.css`
  - `src__Styles/base.css` -> `src__Styles/Na__CoreUi__Styles__BaseLayout__.css`
  - `src__Styles/canvas.css` -> `src__Styles/Na__CoreUi__Styles__RenderCanvas__.css`
  - `src__Styles/ui-components.css` -> `src__Styles/Na__UiFeature__Styles__DropdownAndToast__.css`
  - `src__Styles/header.css` -> `src__Styles/Na__UiFeature__Styles__AppHeader__.css`
  - `src__Styles/controls-instructions-panel.css` -> `src__Styles/Na__UiFeature__Styles__ControlsHelpPanel__.css`
  - `src__Styles/loading-overlay.css` -> `src__Styles/Na__UiFeature__Styles__LoadingOverlays__.css`
  - `src__Styles/image-export-overlays.css` -> `src__Styles/Na__ImageExport__Styles__ViewportOverlays__.css`
  - `src__PageLayoutSystem/Na__PageLayoutSystem__Stylesheet__.css` -> `src__PageLayoutSystem/Na__PageLayoutSystem__Styles__Main__.css`
  - `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__Stylesheet.css` -> `80__Testing__PrototypeEnvironment/Na__TestEnv__Styles__PrototypeSandbox__.css`

- **Phase 03 | Update all links/imports immediately after rename**
  - Update `index.html` stylesheet link to new `src__Styles/Na__CoreUi__Styles__Index__.css`.
  - Update `80__Testing__PrototypeEnvironment/TestEnv__PrototypeTestingSandbox__DomAndLayout.html` links to:
    - `src__Styles/Na__CoreUi__Styles__Index__.css`
    - `Na__TestEnv__Styles__PrototypeSandbox__.css`
  - Update `src__PageLayoutSystem/Na__PageLayoutSystem__Layout__.html` link to `Na__PageLayoutSystem__Styles__Main__.css`.
  - Update all `@import` paths inside `Na__CoreUi__Styles__Index__.css` to new filenames.

- **Phase 04 | Validation checklist**
  - Run a full-text search for old stylesheet names; result must be zero references.
  - Open main app and verify:
    - Header, overlays, dropdowns, loading states, and canvas visuals.
    - Export overlay UI visibility and styling.
  - Open Page Layout System and verify layout UI styles.
  - Open Test Environment and verify both shared + test-specific styles.
  - Confirm no 404 stylesheet network errors in browser dev tools.

- **Phase 05 | Risk controls**
  - Rename and reference-update in one small batch per file to avoid broken intermediate states.
  - Preserve existing stylesheet import order to prevent visual regressions.
  - Do not change CSS selector behavior in this task; naming/placement refactor only.
  - Keep a rollback list of old->new names for quick recovery if needed.

- **Definition of done**
  - All stylesheet files follow the canonical naming convention.
  - All loaders/imports point to new names and paths.
  - No stale references remain in repo.
  - Main app, Page Layout System, and TestEnv render correctly with no missing styles.



# -------------------------------------------------------------
*END OF FILE*