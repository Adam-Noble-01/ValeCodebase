// =============================================================================
// VALEVISION3D - APP FLOW - LOADING SEQUENCE
// =============================================================================
//
// FILE       : Na__AppFlow__LoadingSequence.js
// NAMESPACE  : Na__AppFlow
// MODULE     : LoadingSequence
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Main scene loading sequence, render loop, and resize handler
// CREATED    : 24-Feb-2026
//
// DESCRIPTION:
// - Initialises scene lighting and the render pipeline composer.
// - Resolves model URLs from the URL query parameter or config defaults.
// - Loads the OrbitHelperCube GLB and sets the orbit target from its centre.
// - Re-applies any saved camera / orbit target values from project.json.
// - Loads all scene models via the multi-model loader.
// - Runs the PBR materials second-pass if the materials system is enabled.
// - Initialises door animations and walk-mode collision meshes.
// - Starts the RAF render loop (including walk mode, door proximity updates).
// - Attaches the window resize handler.
//
// Context Object (Na__AppFlow__StartLoadingSequence argument):
// - scene, camera, renderer, controls, modelRoot, lineResolution, showToast
// - updateNavigation  : orbit controls update function from nav bundle
// - pipelineRef       : { current: null } mutable ref - module writes pipeline state here
// - configs           : lightingConfig, groundPlane, profileLines, models,
//                       modelUrls, materialsSystem, doorAnimation,
//                       orbitHelperCubeDebugVisible
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 24-Feb-2026 - Version 1.0.0
// - Extracted from index.html inline script block (lines 604-849).
// - Na__UiFeature__UpdateStatus and Na__UiFeature__ShowScene moved to private
//   module functions; both now use document.getElementById directly.
// - Na__AppFlow__StartLoadingSequence refactored to accept a context object
//   instead of closing over index.html scope variables.
// - Na__RenderPipeline__State written back to context.pipelineRef.current
//   so the ImageExportControls lazy getter in index.html can read it.
//
// 09-Jun-2026 - Version 1.1.0
// - Added Fly Mode branch to RenderFrame (Na__FlyMode__Update + door proximity).
// - Reads Navmode__EnabledModes from project.json and forwards to
//   Na__NavigationModes__State for dynamic Tools menu and hotkey gating.
//
// 10-Jun-2026 - Version 1.2.0
// - Dual render engine support: PureEngine (default, unchanged) vs MaxEngine
//   (PBR + SSAO, per-model opt-in via project.json RenderEngine__Config).
// - Engine-aware composer builder with live runtime switching
//   (na-render-engine-switch event) and engine-aware materials application
//   (PureEngine local library vs MaxEngine DataLib SSOT from GitHub).
// - RenderFrame gains optional MaxEngine calls: updateAoUniforms,
//   monitorAoFrame, renderDepthPrePass, and distance culling update.
// - Door animation init order unchanged (materials swap -> door registry scan)
//   so doors work identically under both engines.
//
// 10-Jun-2026 - Version 1.2.1
// - Door animation init now uses token-based category collection (TrueVision
//   parity): matches CategoryNameTokens against loaded Map keys and resolves
//   mesh/linework roots from children via userData.Na__ModelType. The previous
//   includes('MeshModel') key check could never match v4 category keys and is
//   removed. Multiple door categories (e.g. per-storey) all register.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js GLTF Loader
    // ------------------------------------------------------------
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Pipeline Engines (PureEngine = default, MaxEngine = opt-in PBR)
    // ------------------------------------------------------------
    import { Na__RenderPipeline__PureEngine__SetupComposer } from '../05__RenderPipeline/01__Engine__PureEngine/Na__RenderPipeline__PureEngine__Setup.js';
    import { Na__RenderPipeline__MaxEngine__SetupComposer } from '../05__RenderPipeline/02__Engine__MaxEngine/Na__RenderPipeline__MaxEngine__Setup.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Model Loader
    // ------------------------------------------------------------
    import {
        Na__ModelLoader__LoadAllModels,
        Na__ModelLoader__SeparateOrbitCubeUrl,
        Na__ModelLoader__LoadOrbitHelperCube
    } from '../15__ModelLoader/Na__ModelLoader__MultiModel.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Scene Lighting and Environment
    // ------------------------------------------------------------
    import {
        Na__Scene__SetupDefaultSceneLighting,
        Na__Scene__ApplyEnvironmentMap
    } from '../06__Scene__LightingEffects/Na__Scene__DefaultSceneLighting.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Engine State (PureEngine / MaxEngine selection)
    // ------------------------------------------------------------
    import {
        Na__RenderEngine__PURE,
        Na__RenderEngine__MAX,
        Na__RenderEngine__SetConfiguredEngine,
        Na__RenderEngine__SetActiveEngine,
        Na__RenderEngine__GetConfiguredEngine,
        Na__RenderEngine__GetActiveEngine
    } from '../05__RenderPipeline/Na__RenderEngine__State.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | DataLib Loader (SSOT materials data — MaxEngine only)
    // ------------------------------------------------------------
    import {
        Na__DataLib__LoadAll,
        Na__DataLib__GetMaterials
    } from './AppCore__DataLib__Loader.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Distance Culling (MaxEngine only, config-gated)
    // ------------------------------------------------------------
    import {
        Na__DistanceCulling__Initialize,
        Na__DistanceCulling__RegisterModelGroups,
        Na__DistanceCulling__Update,
        Na__DistanceCulling__SetEnabled
    } from '../05__RenderPipeline/02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Math Utils
    // ------------------------------------------------------------
    import { Na__Math__ConvertMmToUnits } from '../04__MathUtils/Na__Math__Units.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Camera Controls
    // ------------------------------------------------------------
    import { Na__UiFeature__ApplyCameraConfig } from '../11__CameraUtils/Na__UiFeature__CameraPosition__Controls.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Materials System
    // ------------------------------------------------------------
    import { Na__MaterialsSystem__LoadLibrary, Na__MaterialsSystem__BuildLookup } from '../20__System__MaterialsSystem/Na__MaterialsSystem__LibraryLoader.js';
    import {
        Na__MaterialsSystem__ApplyMaterials,
        Na__MaterialsSystem__RestoreOriginalMaterials,
        Na__MaterialsSystem__ApplyMirrorEnvironmentOverrides,
        Na__MaterialsSystem__ApplyGlassEnvironmentOverrides
    } from '../20__System__MaterialsSystem/Na__MaterialsSystem__MaterialSwap.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Model Toggle Controls
    // ------------------------------------------------------------
    import { Na__UiFeature__InitializeModelToggleControls } from '../26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Door Animation System
    // ------------------------------------------------------------
    import {
        Na__DoorAnimation__Initialize,
        Na__DoorAnimation__Update,
        Na__DoorAnimation__HasActiveAnimations
    } from '../25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Walk Mode System
    // ------------------------------------------------------------
    import {
        Na__WalkMode__IsActive,
        Na__WalkMode__Update,
        Na__WalkMode__SetCollisionMeshes,
        Na__WalkMode__GetCapsulePosition
    } from '../10__NavigationAndCameras/Na__Navmode__WalkMode__SystemLogic.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Fly Mode System
    // ------------------------------------------------------------
    import {
        Na__FlyMode__IsActive,
        Na__FlyMode__Update,
        Na__FlyMode__GetCameraPosition
    } from '../10__NavigationAndCameras/Na__Navmode__FlyMode__SystemLogic.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Door Proximity System
    // ------------------------------------------------------------
    import { Na__DoorProximity__Update } from '../25__System__3dObject__InteractionSystem/3dObjectInteraction__Animation__WalkMode__ProximityToOpenDoors__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Navigation Modes State
    // ------------------------------------------------------------
    import { Na__NavigationModes__SetEnabledModes } from '../10__NavigationAndCameras/Na__NavigationModes__State.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Vertical Perspective Correction
    // ------------------------------------------------------------
    import { Na__VerticalCorrection__ApplyFrame } from '../11__CameraUtils/Na__UiFeature__Camera__VerticalCorrection__EffectLogic.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Project Loader Utilities
    // ------------------------------------------------------------
    import {
        Na__AppUtils__GetProjectCodeFromUrl,
        Na__AppUtils__FetchProjectJson,
        Na__AppUtils__ExtractModelUrls
    } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import {
        NA__REQUEST_RENDER_EVENT,
        NA__REQUEST_ACTIVE_RENDER_EVENT,
        NA__STOP_ACTIVE_RENDER_EVENT
    } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Fog Plane System
    // @delegate: ../29__System__FogPlaneSystem/Na__FogPlaneSystem__SystemLogic.js
    // ------------------------------------------------------------
    import {
        Na__FogPlaneSystem__Initialize,
        Na__FogPlaneSystem__UpdatePerFrame,
        Na__FogPlaneSystem__GetFogPass
    } from '../29__System__FogPlaneSystem/Na__FogPlaneSystem__SystemLogic.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Private UI Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Update Status Display
    // ------------------------------------------------------------
    function Na__UiFeature__UpdateStatus(message, isError = false) {
        const statusText      = document.getElementById('statusText');       // <-- Debug status element
        const loadingIndicator = document.getElementById('loadingIndicator'); // <-- Loading overlay text

        if (statusText) statusText.textContent = message;
        if (!loadingIndicator) return;
        loadingIndicator.textContent = message;

        if (isError) {
            loadingIndicator.style.color = '#d32f2f';                        // <-- Error color
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Show Scene When Ready
    // ------------------------------------------------------------
    function Na__UiFeature__ShowScene() {
        const statusText       = document.getElementById('statusText');      // <-- Debug status element
        const loadingOverlay   = document.getElementById('loadingOverlay');  // <-- Loading overlay container
        const canvas           = document.getElementById('renderCanvas');    // <-- Render canvas
        const loadingIndicator = document.getElementById('loadingIndicator'); // <-- Loading overlay text

        if (statusText) statusText.textContent = 'Complete - ValeVision3D Ready';

        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 500);
        }

        if (canvas) {
            canvas.classList.remove('canvas-hidden');
            canvas.classList.add('canvas-visible');
        }

        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Main Loading Sequence
// -----------------------------------------------------------------------------

    // FUNCTION | Main Loading Sequence
    // ------------------------------------------------------------
    async function Na__AppFlow__StartLoadingSequence(context) {

        // DESTRUCTURE CONTEXT | Scene Instances
        // ---------------------------------------------------------------
        const {
            scene      : Na__Scene__Main,
            camera     : Na__Camera__Main,
            renderer   : Na__Renderer__Main,
            controls   : Na__Controls__Orbit,
            modelRoot  : Na__ModelGroup__Root,
            lineResolution   : Na__LineResolution__Screen,
            updateNavigation : Na__Navmode__UpdateNavigation,
            pipelineRef,
            showToast        : Na__ShowToast__Callback,
            configs
        } = context;
        // ---------------------------------------------------------------

        // DESTRUCTURE CONTEXT | Config Values
        // ---------------------------------------------------------------
        const {
            lightingConfig              : Na__Config__LightingConfig,
            groundPlane                 : Na__Config__GroundPlane,
            profileLines                : Na__Config__ProfileLines,
            models                      : Na__Config__Models,
            modelUrls                   : Na__ModelDefaults__ModelUrls,
            materialsSystem             : Na__Config__MaterialsSystem,
            doorAnimation               : Na__Config__DoorAnimation,
            orbitHelperCubeDebugVisible : Na__OrbitHelperCube__Debug__Visible,
            ambientOcclusion            : Na__Config__AmbientOcclusion,
            sceneEnvironment            : Na__Config__SceneEnvironment,
            distanceCulling             : Na__Config__DistanceCulling
        } = configs;
        // ---------------------------------------------------------------

        Na__UiFeature__UpdateStatus('Creating scene...');
        Na__Scene__SetupDefaultSceneLighting(Na__Scene__Main, Na__Config__LightingConfig, Na__Config__GroundPlane);

        // RENDER PIPELINE | Engine-Aware Composer Builder
        // ---------------------------------------------------------------
        // PureEngine (default) is built immediately. If project.json selects
        // MaxEngine the pipeline is rebuilt before models load, and the user
        // can switch live at runtime via the na-render-engine-switch event.
        // ---------------------------------------------------------------
        let Na__RenderPipeline__State = null;                                // <-- Active pipeline state (mutable: engine switching)
        let Na__RenderComposer__Main  = null;                                // <-- Active composer (mutable: engine switching)

        // SUB FUNCTION | Build (or Rebuild) the Render Pipeline for an Engine
        // ---------------------------------------------------------------
        function Na__RenderEngine__BuildPipeline(engineName) {
            const previousState = Na__RenderPipeline__State;                 // <-- Held for best-effort disposal

            const newState = (engineName === Na__RenderEngine__MAX)
                ? Na__RenderPipeline__MaxEngine__SetupComposer(Na__Renderer__Main, Na__Scene__Main, Na__Camera__Main, Na__Config__ProfileLines, null, Na__Controls__Orbit.target, Na__Config__AmbientOcclusion)
                : Na__RenderPipeline__PureEngine__SetupComposer(Na__Renderer__Main, Na__Scene__Main, Na__Camera__Main, Na__Config__ProfileLines, null, Na__Controls__Orbit.target);

            Na__RenderPipeline__State = newState;                            // <-- Swap module references to the new engine
            Na__RenderComposer__Main  = newState.composer;
            pipelineRef.current       = newState;                            // <-- ImageExport / ElevationView / dev controls follow the ref

            const Na__FogPlane__ExistingPass = Na__FogPlaneSystem__GetFogPass();   // <-- Fog pass instance survives engine switches
            if (Na__FogPlane__ExistingPass && newState.insertFogPass) {
                newState.insertFogPass(Na__FogPlane__ExistingPass);          // <-- Rebinds tDepth to the new engine's depth texture
            }

            if (newState.invalidateProfileLinesCache) {
                newState.invalidateProfileLinesCache();                      // <-- New profile lines instance must rescan the scene
            }

            // DISPOSE PREVIOUS COMPOSER (best-effort GPU memory cleanup; passes are not shared except fog)
            if (previousState && previousState !== newState) {
                if (previousState.composer && typeof previousState.composer.dispose === 'function') {
                    previousState.composer.dispose();
                }
                if (previousState.profileNormalTarget && typeof previousState.profileNormalTarget.dispose === 'function') {
                    previousState.profileNormalTarget.dispose();
                }
                if (previousState.profileColorTarget && typeof previousState.profileColorTarget.dispose === 'function') {
                    previousState.profileColorTarget.dispose();
                }
            }

            Na__RenderEngine__SetActiveEngine(engineName);                   // <-- Record active engine in shared state
            console.log(`[ValeVision3D] Render pipeline built: ${engineName}`);
        }
        // ---------------------------------------------------------------

        Na__RenderEngine__BuildPipeline(Na__RenderEngine__PURE);             // <-- PureEngine is ALWAYS the startup default

        let modelUrls = [...Na__ModelDefaults__ModelUrls];                   // <-- Start with config defaults
        let Na__Saved__ProjectCameraConfig = null;                           // <-- Hoisted for post-OrbitCube re-apply
        let Na__Saved__ProjectOrbitTarget  = null;                           // <-- Hoisted for post-OrbitCube re-apply

        // RESOLVE PROJECT-SPECIFIC MODEL URLS
        const projectCode = Na__AppUtils__GetProjectCodeFromUrl();
        if (projectCode) {
            try {
                Na__UiFeature__UpdateStatus('Loading project data...');
                const projectData = await Na__AppUtils__FetchProjectJson(projectCode);

                // STORE CAMERA CONFIG FROM PROJECT (supports both key formats)
                Na__Saved__ProjectCameraConfig = projectData.Camera__DefaultPosition
                    || projectData.valeVision_Camera__DefaultPosition
                    || null;
                Na__Saved__ProjectOrbitTarget  = projectData.OrbitHelperCube__Position || null;

                // APPLY PER-PROJECT NAVIGATION MODE ENABLE FLAGS
                if (projectData.Navmode__EnabledModes) {
                    Na__NavigationModes__SetEnabledModes(projectData.Navmode__EnabledModes);
                    window.dispatchEvent(new CustomEvent('na-navigation-modes-loaded', {
                        detail: { enabledModes: projectData.Navmode__EnabledModes }
                    }));
                }

                // APPLY PER-PROJECT RENDER ENGINE SELECTION (PureEngine when key absent)
                if (projectData.RenderEngine__Config) {
                    Na__RenderEngine__SetConfiguredEngine(projectData.RenderEngine__Config.RenderEngine__Active);
                    window.dispatchEvent(new CustomEvent('na-render-engine-loaded', {
                        detail: { renderEngineConfig: projectData.RenderEngine__Config }
                    }));
                }

                // APPLY PER-PROJECT ORBIT MAX DISTANCE OVERRIDE
                // Single value overrides BOTH PC and iPad equally; iPad bonus does NOT stack on top.
                const Na__Saved__ProjectOrbitMaxDistanceMm = projectData.Navmode__OrbitMaxDistanceMm;
                if (Number.isFinite(Na__Saved__ProjectOrbitMaxDistanceMm) && Na__Saved__ProjectOrbitMaxDistanceMm > 0) {
                    Na__Controls__Orbit.maxDistance = Na__Math__ConvertMmToUnits(Na__Saved__ProjectOrbitMaxDistanceMm);
                    console.log(`[ValeVision3D] Project orbit max distance override applied: ${Na__Saved__ProjectOrbitMaxDistanceMm} mm`);
                }

                // EXTRACT MODEL URLS FROM PROJECT DATA
                const projectUrls = Na__AppUtils__ExtractModelUrls(projectData);
                if (projectUrls.length > 0) {
                    modelUrls = projectUrls;                                 // <-- Override defaults with project URLs
                }
            } catch (error) {
                console.warn('[ValeVision3D] Project data load failed, using defaults', error);
                window.dispatchEvent(new CustomEvent('na-show-toast', {
                    detail: { message: `Project data (project.json) failed to load — using defaults. (${error.message})`, isError: true }
                }));
            }
        }

        // REBUILD PIPELINE FOR CONFIGURED ENGINE (PureEngine already built above)
        if (Na__RenderEngine__GetConfiguredEngine() === Na__RenderEngine__MAX) {
            Na__RenderEngine__BuildPipeline(Na__RenderEngine__MAX);
        }

        // LOADED MODEL GROUPS | Hoisted to function scope so the engine-switch
        // materials helpers below can re-process groups after initial load.
        let Na__LoadedModelGroups = null;                                    // <-- Map of category -> THREE.Group

        // SCENE ENVIRONMENT | Lazy HDR + PMREM loader for MaxEngine reflections
        // ---------------------------------------------------------------
        let Na__Scene__EnvironmentTexture   = null;                          // <-- PMREM env texture (null when disabled / failed)
        let Na__Scene__EnvironmentAttempted = false;                         // <-- Single load attempt per session

        // SUB HELPER FUNCTION | Ensure the Environment Texture Is Loaded (MaxEngine)
        // ---------------------------------------------------------------
        async function Na__MaxEngine__EnsureEnvironmentTexture() {
            if (Na__Scene__EnvironmentAttempted) return Na__Scene__EnvironmentTexture;
            Na__Scene__EnvironmentAttempted = true;
            Na__Scene__EnvironmentTexture = await Na__Scene__ApplyEnvironmentMap(Na__Scene__Main, Na__Renderer__Main, Na__Config__SceneEnvironment);
            return Na__Scene__EnvironmentTexture;
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Apply PureEngine Local-Library Materials (Legacy Path — Unchanged Behaviour)
        // ---------------------------------------------------------------
        async function Na__PureEngine__ApplyLocalLibraryMaterials() {
            if (!Na__Config__MaterialsSystem.MaterialsSystem__Config__Enabled || !Na__LoadedModelGroups) return;

            const Na__MaterialsLibraryUrl  = Na__Config__MaterialsSystem.MaterialsSystem__Config__LibraryUrl;
            const Na__MaterialsLibraryData = await Na__MaterialsSystem__LoadLibrary(Na__MaterialsLibraryUrl);
            if (!Na__MaterialsLibraryData) return;

            const Na__MaterialsLookupMap = Na__MaterialsSystem__BuildLookup(Na__MaterialsLibraryData, true);  // <-- Force rebuild: cache may hold the DataLib map
            if (Na__MaterialsLookupMap.size === 0) return;

            for (const [, group] of Na__LoadedModelGroups) {
                await Na__MaterialsSystem__ApplyMaterials(group, Na__MaterialsLookupMap, Na__Config__MaterialsSystem);
            }
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Apply Engine-Appropriate Materials to Loaded Model Groups
        // ---------------------------------------------------------------
        // MaxEngine : DataLib SSOT (GitHub) PBR swap + AO exclusions + glass /
        //             mirror environment overrides. Falls back to PureEngine
        //             materials if the DataLib fetch fails.
        // PureEngine: restores pre-swap originals (on engine switch-back) then
        //             re-runs the unchanged local-library swap.
        // Door animations are unaffected in both directions: the door registry
        // holds Object3D references and transforms, never material references.
        // ---------------------------------------------------------------
        async function Na__RenderEngine__ApplyEngineMaterials(engineName) {
            if (!Na__LoadedModelGroups) return;

            if (engineName === Na__RenderEngine__MAX) {
                try {
                    await Na__DataLib__LoadAll();                            // <-- SSOT fetch (cached after first call)
                } catch (dataLibError) {
                    console.error('[ValeVision3D] DataLib load failed — MaxEngine materials unavailable, keeping current materials:', dataLibError);
                    return;
                }

                const Na__DataLibMaterialsData = Na__DataLib__GetMaterials();
                const Na__MaterialsLookupMap   = Na__MaterialsSystem__BuildLookup(Na__DataLibMaterialsData, true);  // <-- Force rebuild from SSOT source
                if (Na__MaterialsLookupMap.size === 0) {
                    window.dispatchEvent(new CustomEvent('na-show-toast', {
                        detail: { message: 'DataLib materials index is empty — MaxEngine PBR materials unavailable.', isError: true }
                    }));
                    return;
                }

                const Na__EnvTexture = await Na__MaxEngine__EnsureEnvironmentTexture();   // <-- Null when env disabled (glass stays transparent, no reflections)

                for (const [, group] of Na__LoadedModelGroups) {
                    await Na__MaterialsSystem__ApplyMaterials(group, Na__MaterialsLookupMap, Na__Config__MaterialsSystem);

                    if (Na__EnvTexture && Na__Config__SceneEnvironment) {
                        if (Na__Config__SceneEnvironment.Scene__Environment__MirrorOnly === true) {
                            Na__MaterialsSystem__ApplyMirrorEnvironmentOverrides(group, Na__EnvTexture, {
                                targetMaterialName : Na__Config__SceneEnvironment.Scene__Environment__MirrorMaterialName,
                                envMapIntensity    : Na__Config__SceneEnvironment.Scene__Environment__MirrorEnvMapIntensity,
                                brightnessBoost    : Na__Config__SceneEnvironment.Scene__Environment__MirrorBrightnessBoost,
                                roughnessOverride  : Na__Config__SceneEnvironment.Scene__Environment__MirrorRoughnessOverride
                            });
                        }
                        if (Na__Config__SceneEnvironment.Scene__Environment__GlassEnabled === true) {
                            Na__MaterialsSystem__ApplyGlassEnvironmentOverrides(group, Na__EnvTexture, {
                                targetMaterialName  : Na__Config__SceneEnvironment.Scene__Environment__GlassMaterialName,
                                envMapIntensity     : Na__Config__SceneEnvironment.Scene__Environment__GlassEnvMapIntensity,
                                brightnessMultiplier: Na__Config__SceneEnvironment.Scene__Environment__GlassBrightnessMultiplier,
                                roughnessOverride   : Na__Config__SceneEnvironment.Scene__Environment__GlassRoughnessOverride,
                                opacityOverride     : Na__Config__SceneEnvironment.Scene__Environment__GlassOpacityOverride
                            });
                        }
                    }
                }

                // DISTANCE CULLING | MaxEngine-only optional feature (config-gated, off by default)
                Na__DistanceCulling__Initialize(Na__Config__DistanceCulling);
                Na__DistanceCulling__RegisterModelGroups(Na__LoadedModelGroups);
            } else {
                for (const [, group] of Na__LoadedModelGroups) {
                    Na__MaterialsSystem__RestoreOriginalMaterials(group);    // <-- Back to pre-swap originals (also clears AO layer-1 tags)
                }
                await Na__PureEngine__ApplyLocalLibraryMaterials();          // <-- Recreate today's unchanged PureEngine appearance

                Na__DistanceCulling__SetEnabled(false);                      // <-- MaxEngine-only feature; restores any culled items
            }
        }
        // ---------------------------------------------------------------

        // SEPARATE ORBIT HELPER CUBE URL FROM MODEL URLS
        const { orbitCubeUrl, filteredUrls } = Na__ModelLoader__SeparateOrbitCubeUrl(modelUrls);
        modelUrls = filteredUrls;                                            // <-- Use filtered URLs (without orbit cube) for model loading
        if (!orbitCubeUrl) {
            console.warn('[ValeVision3D] OrbitHelperCube URL not found in model list. Orbit target will use saved project target if available.');
        }

        // LOAD ORBIT HELPER CUBE IF PRESENT
        let Na__OrbitHelperCube__Mesh = null;                                // <-- Store orbit cube mesh reference
        let Na__OrbitHelperCube__CenterPosition = null;                      // <-- Store orbit cube center for target precedence
        if (orbitCubeUrl) {
            try {
                Na__UiFeature__UpdateStatus('Loading orbit helper cube...');
                const loader = new GLTFLoader();
                const orbitCubeResult = await Na__ModelLoader__LoadOrbitHelperCube(orbitCubeUrl, loader);

                if (orbitCubeResult && orbitCubeResult.mesh && orbitCubeResult.centerPosition) {
                    Na__OrbitHelperCube__Mesh = orbitCubeResult.mesh;        // <-- Store mesh reference
                    Na__OrbitHelperCube__CenterPosition = orbitCubeResult.centerPosition.clone(); // <-- Store center position
                    Na__OrbitHelperCube__Mesh.name = 'OrbitHelperCube';      // <-- Name for debugging
                    Na__OrbitHelperCube__Mesh.visible = Na__OrbitHelperCube__Debug__Visible;  // <-- Hide unless debug enabled

                    Na__Scene__Main.add(Na__OrbitHelperCube__Mesh);          // <-- Add to scene
                    console.log('[ValeVision3D] OrbitHelperCube loaded. Center resolved:', orbitCubeResult.centerPosition);
                } else {
                    console.warn('[ValeVision3D] OrbitHelperCube loaded but center position could not be resolved.');
                }
            } catch (error) {
                console.warn('[ValeVision3D] OrbitHelperCube could not be loaded. Orbit will use saved project target if available.', error);
            }
        }

        // RESOLVE FINAL ORBIT TARGET (STRICT PRECEDENCE)
        // 1) Saved project OrbitHelperCube__Position (preserves user's panned view exactly as saved)
        // 2) Loaded OrbitHelperCube GLB center (fallback when no saved position exists)
        // 3) Keep current controls target (no Dev__DefaultCube fallback)
        let Na__FinalOrbitTargetApplied = false;
        if (Na__Saved__ProjectOrbitTarget) {
            Na__Controls__Orbit.target.set(
                Na__Math__ConvertMmToUnits(Na__Saved__ProjectOrbitTarget.OrbitHelperCube__Position__PosX),  // <-- Saved orbit X
                Na__Math__ConvertMmToUnits(Na__Saved__ProjectOrbitTarget.OrbitHelperCube__Position__PosY),  // <-- Saved orbit Y
                Na__Math__ConvertMmToUnits(Na__Saved__ProjectOrbitTarget.OrbitHelperCube__Position__PosZ)   // <-- Saved orbit Z
            );
            Na__FinalOrbitTargetApplied = true;
        } else if (Na__OrbitHelperCube__CenterPosition && Na__OrbitHelperCube__CenterPosition.isVector3) {
            Na__Controls__Orbit.target.copy(Na__OrbitHelperCube__CenterPosition);
            Na__FinalOrbitTargetApplied = true;
        } else {
            console.warn('[ValeVision3D] No saved orbit target and no OrbitHelperCube center resolved. Keeping current controls.target.');
        }

        // RE-APPLY SAVED CAMERA (without legacy Camera__DefaultTarget override)
        if (Na__Saved__ProjectCameraConfig) {
            const Na__CameraConfigWithoutLegacyTarget = { ...Na__Saved__ProjectCameraConfig };
            if (Na__CameraConfigWithoutLegacyTarget.Camera__DefaultTarget) {
                delete Na__CameraConfigWithoutLegacyTarget.Camera__DefaultTarget;
            }
            Na__UiFeature__ApplyCameraConfig(
                Na__Camera__Main,                                            // <-- Re-apply saved camera position + FOV
                Na__Controls__Orbit,                                         // <-- Re-apply with correct orbit target
                Na__CameraConfigWithoutLegacyTarget
            );
        }
        if (Na__FinalOrbitTargetApplied || Na__Saved__ProjectCameraConfig) {
            Na__Controls__Orbit.update();                                    // <-- Finalize controls with restored state
        }

        // LOAD ALL MODELS VIA MULTI-MODEL LOADER
        try {
            if (modelUrls.length > 0) {
                Na__LoadedModelGroups = await Na__ModelLoader__LoadAllModels(
                    modelUrls,                                               // <-- Array of CDN URLs (orbit cube already filtered out)
                    Na__ModelGroup__Root,                                    // <-- Scene root group
                    Na__Config__Models,                                      // <-- Material configs (baseMesh + linework)
                    Na__LineResolution__Screen,                              // <-- Screen resolution for line width
                    Na__UiFeature__UpdateStatus                              // <-- Status callback for loading overlay
                );
            }

            // APPLY MATERIALS | Engine-aware second pass (selective override)
            // PureEngine -> unchanged local-library swap; MaxEngine -> DataLib SSOT PBR swap.
            // Runs BEFORE door animation init so the door registry scans final node state.
            await Na__RenderEngine__ApplyEngineMaterials(Na__RenderEngine__GetActiveEngine());

            Na__UiFeature__ShowScene();                                      // <-- Reveal scene after all models loaded

            // INITIALIZE MODEL TOGGLE CONTROLS (dynamic per-category buttons)
            Na__UiFeature__InitializeModelToggleControls(Na__LoadedModelGroups);  // <-- Build toggle buttons from loaded groups

            // INITIALIZE DOOR ANIMATION (if enabled in config)
            // Token-based collection (TrueVision parity): door categories are matched
            // by name tokens against the loaded Map keys (covers both flat keys like
            // 'ValeVision__MainBuildingModel__ProposedDoors' AND storey keys like
            // 'Storey__GroundFloor__ProposedDoors'). Mesh/linework roots are resolved
            // from group children via userData.Na__ModelType — category keys never
            // contain 'MeshModel'/'LineworkModel' (those live on child root names).
            if (Na__Config__DoorAnimation['3dObject__Interaction__DoorAnimation__Enabled'] !== false) {

                // SUB HELPER FUNCTION | Resolve Door Category Name Tokens from Config
                // ---------------------------------------------------------------
                const Na__ResolveDoorCategoryNameTokens = (doorAnimationConfig) => {
                    const defaultTokens    = ['ProposedDoors', 'ExistingDoors'];     // <-- Fallback when config omits tokens
                    const configuredTokens = doorAnimationConfig
                        && doorAnimationConfig['3dObject__Interaction__DoorAnimation__CategoryNameTokens'];

                    const normalizedTokens = Array.isArray(configuredTokens)
                        ? configuredTokens
                            .filter((token) => typeof token === 'string')
                            .map((token) => token.trim())
                            .filter((token) => token.length > 0)
                        : [];

                    return normalizedTokens.length > 0 ? normalizedTokens : defaultTokens;
                };
                // ---------------------------------------------------------------

                // SUB HELPER FUNCTION | Collect Door Mesh + Linework Groups by Token
                // ---------------------------------------------------------------
                const Na__CollectDoorModelGroups = (loadedModelGroups) => {
                    const doorMeshGroups     = [];                           // <-- Mesh roots across all door categories
                    const doorLineworkGroups = [];                           // <-- Linework roots across all door categories
                    const doorCategoryTokens = Na__ResolveDoorCategoryNameTokens(Na__Config__DoorAnimation);

                    loadedModelGroups.forEach((categoryGroup, categoryKey) => {
                        const hasDoorCategoryToken = doorCategoryTokens.some((token) => categoryKey.includes(token));
                        if (!hasDoorCategoryToken) return;                   // <-- Not a door category

                        const children = categoryGroup.children || [];
                        for (const child of children) {
                            const modelType = child.userData && child.userData.Na__ModelType;
                            if (modelType === 'mesh')     doorMeshGroups.push(child);      // <-- Tagged mesh root
                            if (modelType === 'linework') doorLineworkGroups.push(child);  // <-- Tagged linework root
                        }
                    });

                    return { doorMeshGroups, doorLineworkGroups };
                };
                // ---------------------------------------------------------------

                const { doorMeshGroups, doorLineworkGroups } = Na__CollectDoorModelGroups(Na__LoadedModelGroups);

                if (doorMeshGroups.length > 0 || doorLineworkGroups.length > 0) {
                    Na__DoorAnimation__Initialize(
                        Na__Scene__Main,                                     // <-- Scene reference
                        Na__Camera__Main,                                    // <-- Camera reference
                        Na__Renderer__Main.domElement,                       // <-- Canvas DOM element
                        doorMeshGroups,                                      // <-- Mesh model groups (array)
                        doorLineworkGroups,                                  // <-- Linework model groups (array)
                        Na__Config__DoorAnimation                            // <-- Door animation config
                    );
                    console.log(`[ValeVision3D] Door animation initialized (${doorMeshGroups.length} mesh group(s), ${doorLineworkGroups.length} linework group(s))`);
                } else {
                    console.log('[ValeVision3D] Door animation enabled but no door model groups found');
                }
            }

            // SET WALK MODE COLLISION MESHES (from loaded model root)
            Na__WalkMode__SetCollisionMeshes(Na__ModelGroup__Root);

        } catch (error) {
            console.error('[ValeVision3D] Model load error:', error);
            Na__UiFeature__UpdateStatus('Model load error - check console', true);
            window.dispatchEvent(new CustomEvent('na-show-toast', {
                detail: { message: `Model load error — ${error.message}. Check console for details.`, isError: true }
            }));
        }

        // INVALIDATE PROFILE LINES CACHE (scene objects changed after model load)
        if (Na__RenderPipeline__State.invalidateProfileLinesCache) {
            Na__RenderPipeline__State.invalidateProfileLinesCache();
        }

        // INITIALIZE FOG PLANE SYSTEM (async: loads config, restores saved planes, creates shader pass)
        try {
            await Na__FogPlaneSystem__Initialize({
                scene      : Na__Scene__Main,
                camera     : Na__Camera__Main,
                renderer   : Na__Renderer__Main,
                controls   : Na__Controls__Orbit,
                modelRoot  : Na__ModelGroup__Root,
                showToast  : Na__ShowToast__Callback || null
            });

            const Na__FogPlane__Pass = Na__FogPlaneSystem__GetFogPass();
            if (Na__FogPlane__Pass && Na__RenderPipeline__State.insertFogPass) {
                Na__RenderPipeline__State.insertFogPass(Na__FogPlane__Pass);
            }
        } catch (fogError) {
            console.error('[ValeVision3D] Fog plane system init error:', fogError);
        }

        // RENDER LOOP | Invalidation-Based Rendering
        let Na__RenderLoop__PrevTimestamp = performance.now();               // <-- Previous frame timestamp for delta
        let Na__RenderLoop__FrameHandle = null;                              // <-- Active RAF handle (or null when idle)
        const Na__RenderLoop__ActiveReasons = new Set();                     // <-- Reasons that require continuous frames

        function Na__RenderLoop__ScheduleFrame() {
            if (Na__RenderLoop__FrameHandle !== null) return;
            Na__RenderLoop__FrameHandle = requestAnimationFrame(Na__RenderLoop__Tick);
        }

        function Na__RenderLoop__RequestRenderOnce() {
            if (document.hidden) return;
            Na__RenderLoop__ScheduleFrame();
        }

        function Na__RenderLoop__EnableActiveRendering(reason = 'general') {
            Na__RenderLoop__ActiveReasons.add(reason);
            Na__RenderLoop__RequestRenderOnce();
        }

        function Na__RenderLoop__DisableActiveRendering(reason = 'general') {
            Na__RenderLoop__ActiveReasons.delete(reason);
            Na__RenderLoop__RequestRenderOnce();
        }

        const NA__ORBIT_TRAILING_FRAMES = 3;                                   // <-- Extra frames after orbit 'end' to let controls.update() settle
        let Na__RenderLoop__OrbitTrailingFrames = 0;
        let Na__RenderLoop__ActiveCamera       = Na__Camera__Main;              // <-- Tracks which camera the render pipeline is using
        let Na__RenderLoop__ElevationActive    = false;                          // <-- True when ortho elevation camera is active
        let Na__RenderLoop__2dProfileNormals   = null;                           // <-- 2D profile lines render function (set via event)

        // AO PERFORMANCE MONITOR | Startup delay before FPS sampling begins (MaxEngine)
        const Na__AoPerformanceMonitorStartupDelayMs = (Na__Config__AmbientOcclusion && Number.isFinite(Na__Config__AmbientOcclusion.RenderEffect__AmbientOcclusion__PerformanceMonitorStartupDelayMs))
            ? Na__Config__AmbientOcclusion.RenderEffect__AmbientOcclusion__PerformanceMonitorStartupDelayMs
            : 3000;
        let Na__RenderLoop__CanMonitorAoPerformance = false;                     // <-- Suppresses FPS sampling during load spikes
        window.setTimeout(() => {
            Na__RenderLoop__CanMonitorAoPerformance = true;
        }, Math.max(0, Na__AoPerformanceMonitorStartupDelayMs));

        window.addEventListener('na-elevation-camera-changed', (event) => {
            if (event.detail && event.detail.camera) {
                Na__RenderLoop__ActiveCamera = event.detail.camera;             // <-- Swap active camera for effects
            }
            Na__RenderLoop__ElevationActive = !!(event.detail && event.detail.isOrtho); // <-- Track elevation mode
            if (event.detail && event.detail.render2dProfileNormals) {
                Na__RenderLoop__2dProfileNormals = event.detail.render2dProfileNormals; // <-- Store 2D profile lines renderer
            }
        });

        function Na__RenderLoop__RenderFrame(deltaMs) {
            if (Na__WalkMode__IsActive()) {
                Na__WalkMode__Update(deltaMs);                               // <-- Update walk mode physics and camera
                Na__DoorProximity__Update(Na__WalkMode__GetCapsulePosition()); // <-- Proximity door triggers (walk capsule position)
            } else if (Na__FlyMode__IsActive()) {
                Na__FlyMode__Update(deltaMs);                                // <-- Update fly mode camera movement
                Na__DoorProximity__Update(Na__FlyMode__GetCameraPosition()); // <-- Proximity door triggers (fly camera position)
            } else {
                Na__Navmode__UpdateNavigation();                             // <-- Update orbit controls
            }

            Na__VerticalCorrection__ApplyFrame();                            // <-- Apply vertical perspective correction (no-ops when disabled)

            Na__DoorAnimation__Update(deltaMs);                              // <-- Update door animations

            Na__FogPlaneSystem__UpdatePerFrame(Na__RenderLoop__ActiveCamera, Na__Controls__Orbit); // <-- Fog shader uniforms + camera constraint

            Na__DistanceCulling__Update(Na__Camera__Main.position);          // <-- MaxEngine distance culling (internal no-op when disabled)

            if (Na__RenderComposer__Main && Na__RenderPipeline__State) {
                // MAXENGINE EXTRAS | No-ops under PureEngine (keys absent from its pipeline state)
                if (Na__RenderPipeline__State.updateAoUniforms) {
                    Na__RenderPipeline__State.updateAoUniforms(Na__RenderLoop__ActiveCamera);  // <-- Sync SSAO camera matrices
                }
                if (Na__RenderPipeline__State.monitorAoFrame && Na__RenderLoop__CanMonitorAoPerformance) {
                    Na__RenderPipeline__State.monitorAoFrame(deltaMs);       // <-- FPS-based AO auto-disable sampling
                }
                if (Na__RenderPipeline__State.renderDepthPrePass) {
                    Na__RenderPipeline__State.renderDepthPrePass();          // <-- Depth capture for SSAO/fog (no-op when profile lines share depth)
                }

                if (Na__RenderLoop__ElevationActive && Na__RenderLoop__2dProfileNormals) {
                    Na__RenderLoop__2dProfileNormals(Na__RenderLoop__ActiveCamera); // <-- 2D profile lines with ortho camera
                } else {
                    Na__RenderPipeline__State.renderProfileNormals();         // <-- 3D profile lines with persp camera
                }
                Na__RenderComposer__Main.render();                           // <-- Render with post-processing
            }

            if (Na__RenderLoop__OrbitTrailingFrames > 0) {
                Na__RenderLoop__OrbitTrailingFrames--;
                return true;                                                 // <-- Keep rendering for trailing settle frames
            }

            return Na__WalkMode__IsActive()
                || Na__FlyMode__IsActive()
                || Na__DoorAnimation__HasActiveAnimations()
                || Na__RenderLoop__ActiveReasons.size > 0;
        }

        function Na__RenderLoop__Tick(timestamp) {
            Na__RenderLoop__FrameHandle = null;

            const now     = timestamp || performance.now();                  // <-- Current timestamp
            const deltaMs = now - Na__RenderLoop__PrevTimestamp;             // <-- Time since last frame
            Na__RenderLoop__PrevTimestamp = now;                             // <-- Update previous timestamp

            const keepRendering = Na__RenderLoop__RenderFrame(deltaMs);
            if (!document.hidden && keepRendering) {
                Na__RenderLoop__ScheduleFrame();
            }
        }

        window.addEventListener(NA__REQUEST_RENDER_EVENT, Na__RenderLoop__RequestRenderOnce);
        window.addEventListener(NA__REQUEST_ACTIVE_RENDER_EVENT, (event) => {
            Na__RenderLoop__EnableActiveRendering(event.detail && event.detail.reason ? event.detail.reason : 'general');
        });
        window.addEventListener(NA__STOP_ACTIVE_RENDER_EVENT, (event) => {
            Na__RenderLoop__DisableActiveRendering(event.detail && event.detail.reason ? event.detail.reason : 'general');
        });
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                Na__RenderLoop__RequestRenderOnce();
            }
        });

        Na__Controls__Orbit.addEventListener('start', () => {
            Na__RenderLoop__OrbitTrailingFrames = 0;                          // <-- Cancel any pending trail; user is actively interacting
            Na__RenderLoop__EnableActiveRendering('orbit');
        });
        Na__Controls__Orbit.addEventListener('end', () => {
            Na__RenderLoop__DisableActiveRendering('orbit');
            Na__RenderLoop__OrbitTrailingFrames = NA__ORBIT_TRAILING_FRAMES;  // <-- Render a few more frames to let controls.update() settle
            Na__RenderLoop__RequestRenderOnce();
        });
        Na__Controls__Orbit.addEventListener('change', Na__RenderLoop__RequestRenderOnce);

        // RENDER ENGINE SWITCH | Live PureEngine <-> MaxEngine swap (UI dispatched)
        // ---------------------------------------------------------------
        // Rebuilds the composer for the requested engine and re-applies the
        // engine-appropriate materials. Door animations, walk collision meshes,
        // and the door registry are untouched: they reference Object3D nodes,
        // which both the swap and the restore leave fully intact.
        // ---------------------------------------------------------------
        let Na__RenderEngine__SwitchInProgress = false;                      // <-- Re-entrancy guard for rapid toggling

        window.addEventListener('na-render-engine-switch', async (event) => {
            const requestedEngine = (event.detail && event.detail.engine === Na__RenderEngine__MAX)
                ? Na__RenderEngine__MAX
                : Na__RenderEngine__PURE;

            if (requestedEngine === Na__RenderEngine__GetActiveEngine()) return;   // <-- Already active
            if (Na__RenderEngine__SwitchInProgress) return;                        // <-- Ignore re-entrant requests mid-switch

            Na__RenderEngine__SwitchInProgress = true;
            try {
                Na__RenderEngine__BuildPipeline(requestedEngine);            // <-- Rebuild composer chain for the new engine
                await Na__RenderEngine__ApplyEngineMaterials(requestedEngine); // <-- Swap / restore materials to match
            } catch (switchError) {
                console.error('[ValeVision3D] Render engine switch failed:', switchError);
            } finally {
                Na__RenderEngine__SwitchInProgress = false;
            }

            Na__RenderLoop__RequestRenderOnce();                             // <-- Redraw with the new engine
            window.dispatchEvent(new CustomEvent('na-render-engine-changed', {
                detail: { engine: Na__RenderEngine__GetActiveEngine() }
            }));
        });
        // ---------------------------------------------------------------

        Na__RenderLoop__RequestRenderOnce();

        // RESIZE HANDLER
        window.addEventListener('resize', () => {
            const width  = window.innerWidth;
            const height = window.innerHeight;

            Na__Camera__Main.aspect = width / height;
            Na__Camera__Main.updateProjectionMatrix();
            Na__Renderer__Main.setSize(width, height);
            if (Na__RenderComposer__Main && Na__RenderPipeline__State) {
                Na__RenderComposer__Main.setSize(width, height);
                Na__RenderPipeline__State.setProfileLinesSize(width, height);
                Na__RenderPipeline__State.setFxaaSize(width, height);        // <-- Update FXAA resolution uniform
                if (Na__RenderPipeline__State.setDepthPrePassSize) {
                    Na__RenderPipeline__State.setDepthPrePassSize(width, height);  // <-- MaxEngine: resize depth pre-pass RT
                }
                if (Na__RenderPipeline__State.setAoSize) {
                    Na__RenderPipeline__State.setAoSize(width, height);      // <-- MaxEngine: update SSAO resolution uniforms
                }
            }

            Na__LineResolution__Screen.set(width, height);
            Na__RenderLoop__RequestRenderOnce();
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | App Flow API
    // ------------------------------------------------------------
    export {
        Na__AppFlow__StartLoadingSequence
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
