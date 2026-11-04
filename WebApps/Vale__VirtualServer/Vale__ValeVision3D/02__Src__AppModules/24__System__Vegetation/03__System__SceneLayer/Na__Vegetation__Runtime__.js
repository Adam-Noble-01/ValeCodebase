// =============================================================================
// VALEVISION3D - VEGETATION - RUNTIME
// =============================================================================
//
// FILE       : Na__Vegetation__Runtime__.js
// NAMESPACE  : Na__VegRun
// MODULE     : System - Vegetation
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Join the scene layer to the app: give it what it needs from the render
//              loop, the line weights and the section cuts, and keep its plants the
//              same as the project's object
// CREATED    : 04-Nov-2026
//
// DESCRIPTION:
// - THE ONLY VEGETATION MODULE THAT IMPORTS THE APP'S RENDERING. The scene layer takes
//   these as a small host object, so the test bench can draw through it with none of
//   them. Everything here is already on the start-up path, so loading this adds only
//   the vegetation modules themselves, and only on an enabled project.
// - THE GROUP SITS IN THE SCENE, NOT UNDER Na__ModelGroup__Root. Walk collision, layer
//   toggles, bounds and the phase library never see a plant.
// - A SAVED PLANT THAT CANNOT BE DRAWN IS LEFT OUT AND SAID SO. Its record is untouched,
//   and everything else still draws.
// - BUILT A SLICE AT A TIME. A plant takes about 2.3 ms to build from its rules and seed,
//   so a thousand would stop the page for over two seconds. The page keeps going, and
//   the plants arrive over a few frames.
//
// INTEGRATION:
// - Started by Na__Vegetation__.js when a project is enabled, or switched on.
// - Called by ../10__Ui__Panels/Na__Vegetation__DevControls__.js.
// - @delegate: ./Na__Vegetation__SceneLayer__.js
// - @delegate: ../02__Core__Data/Na__Vegetation__SceneData__.js
// - @delegate: ../02__Core__Data/Na__Vegetation__Library__.js
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 04-Nov-2026 - Version 1.0.0 (ValeVision3D v2.84.0)
// - Initial build: Stage 2 of ValeVision__PLAN__VegetationSystem__.md.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The App's Rendering
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    import {
        Na__InteractiveOverlays__Register,
        Na__InteractiveOverlays__SetWanted,
        Na__InteractiveOverlays__GetLiveFrameNumber
    } from '../../05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js';
    import {
        Na__LineworkSettings__GetLineworkExportScale,
        Na__LineworkSettings__GetLineworkFactor,
        Na__LineworkSettings__SetLineworkFactor
    } from '../../05__RenderPipeline/Na__RenderEffect__LineworkSettings__State.js';
    import { Na__SectionClipping__GetClipList } from '../../05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Vegetation
    // ------------------------------------------------------------
    import { Na__VegLayer__Create } from './Na__Vegetation__SceneLayer__.js';
    import { Na__VegData__LoadConfig, Na__VegData__PlopToBuild } from '../02__Core__Data/Na__Vegetation__SceneData__.js';
    import { Na__VegLib__ResolveRecipe, Na__VegLib__PinAsset } from '../02__Core__Data/Na__Vegetation__Library__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Variables
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | How Long Building May Hold the Page at a Time
    // ------------------------------------------------------------
    const Na__VegRun__BUILD_SLICE_MS = 12;
    // ------------------------------------------------------------

    // MODULE VARIABLES | What Is Running on This Page
    // ------------------------------------------------------------
    const Na__VegRun__State = {
        context   : null,
        layer     : null,
        sceneData : null,
        recipes   : new Map(),
        syncRun   : 0                                                          // <-- A newer sync stops an older one still building
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Keeping the Plants the Same as the Project's Object
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Make Sure Every Asset These Plops Use Has Its Recipe Read
    // ------------------------------------------------------------
    // A project's own copy first, else the library. One that neither holds is said
    // once, and its plants are left out by the layer, which finds no recipe for them.
    // ------------------------------------------------------------
    async function Na__VegRun__ReadRecipes(plops) {
        const ids = new Set();
        plops.forEach((plop) => { ids.add(plop.Vegetation__Plop__AssetId); });
        for (const id of ids) {
            if (Na__VegRun__State.recipes.has(id)) continue;
            try {
                Na__VegRun__State.recipes.set(id, await Na__VegLib__ResolveRecipe(Na__VegRun__State.sceneData, id));
            } catch (error) {
                Na__VegRun__State.recipes.set(id, null);
                console.warn('[ValeVision3D Vegetation] ' + id + ' cannot be drawn, so its plants are left out:', error && error.message);
            }
        }
        Na__VegRun__State.layer.setRecipes(Array.from(Na__VegRun__State.recipes.values()).filter(Boolean));
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw Exactly What the Project's Object Holds
    // ------------------------------------------------------------
    async function Na__VegRun__SyncPlants() {
        if (!Na__VegRun__State.layer) return;
        const run   = ++Na__VegRun__State.syncRun;
        const plops = Na__VegRun__State.sceneData.Vegetation__SceneData__Plops;
        await Na__VegRun__ReadRecipes(plops);
        if (run !== Na__VegRun__State.syncRun) return;

        const layer = Na__VegRun__State.layer;
        layer.setPlops([]);
        let sliceStartedAt = performance.now();
        for (let p = 0; p < plops.length; p++) {
            layer.addPlops([Na__VegData__PlopToBuild(plops[p])]);
            if (performance.now() - sliceStartedAt >= Na__VegRun__BUILD_SLICE_MS) {
                Na__RenderLoop__RequestRender();
                await new Promise((resolve) => { setTimeout(resolve, 0); });
                if (run !== Na__VegRun__State.syncRun) return;
                sliceStartedAt = performance.now();
            }
        }
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // FUNCTION | Add Plants to the Project's Object and to the Picture
    // ------------------------------------------------------------
    // Each asset is pinned first, so the project keeps its own copy from now on. The
    // plants already drawn are left alone. Saving is the caller's.
    // ------------------------------------------------------------
    async function Na__VegRun__AddPlops(savedPlops) {
        const sceneData = Na__VegRun__State.sceneData;
        for (const plop of savedPlops) {
            await Na__VegLib__PinAsset(sceneData, plop.Vegetation__Plop__AssetId);
        }
        await Na__VegRun__ReadRecipes(savedPlops);
        sceneData.Vegetation__SceneData__Plops.push(...savedPlops);
        Na__VegRun__State.layer.addPlops(savedPlops.map(Na__VegData__PlopToBuild));
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Starting and Stopping
// -----------------------------------------------------------------------------

    // FUNCTION | Put the Project's Plants in the Scene
    // ------------------------------------------------------------
    // context: { scene, camera, renderer, modelRoot, lineColour, getPipeline, showToast }
    // ------------------------------------------------------------
    async function Na__VegRun__Start(context, sceneData) {
        Na__VegRun__State.context   = context;
        Na__VegRun__State.sceneData = sceneData;

        if (!Na__VegRun__State.layer) {
            const config = await Na__VegData__LoadConfig();
            Na__VegRun__State.layer = Na__VegLayer__Create({
                scene       : context.scene,
                recipes     : [],
                lineRules   : sceneData.Vegetation__SceneData__LineRules,
                lineColour  : context.lineColour,
                resolution  : new THREE.Vector2(window.innerWidth, window.innerHeight),
                frameBudget : config.Vegetation__FrameBudget__Config,
                host        : {
                    getLiveFrame     : Na__InteractiveOverlays__GetLiveFrameNumber,
                    getExportScale   : Na__LineworkSettings__GetLineworkExportScale,
                    getClipList      : Na__SectionClipping__GetClipList,
                    requestFrame     : Na__RenderLoop__RequestRender,
                    isAoRunning      : () => {
                        const pipeline = context.getPipeline ? context.getPipeline() : null;
                        return !!(pipeline && pipeline.aoPassRef && pipeline.aoPassRef.enabled);
                    },
                    registerOverlay  : Na__InteractiveOverlays__Register,
                    setOverlayWanted : Na__InteractiveOverlays__SetWanted
                }
            });
            Na__VegRun__State.layer.installRenderHook();

            // TWO THINGS THAT ALREADY RAN WITHOUT US | The user's line weight, which the
            // lines have just missed, and the profile pass's list of the scene's objects.
            Na__LineworkSettings__SetLineworkFactor(Na__LineworkSettings__GetLineworkFactor());
            const pipeline = context.getPipeline ? context.getPipeline() : null;
            if (pipeline && pipeline.invalidateProfileLinesCache) pipeline.invalidateProfileLinesCache();
        }

        Na__VegRun__State.layer.setVisible(sceneData.Vegetation__SceneData__ShowByDefault !== false);
        await Na__VegRun__SyncPlants();
    }
    // ------------------------------------------------------------


    // FUNCTION | Take the Plants Off the Screen
    // ------------------------------------------------------------
    function Na__VegRun__Stop() {
        if (Na__VegRun__State.layer) Na__VegRun__State.layer.setVisible(false);
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // FUNCTION | What the Layer Is Doing, for the Panel and for Checks
    // ------------------------------------------------------------
    function Na__VegRun__GetStats() {
        return Na__VegRun__State.layer ? Na__VegRun__State.layer.stats : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Layer Itself, for a Later Panel and for Checks
    // ------------------------------------------------------------
    function Na__VegRun__GetLayer() {
        return Na__VegRun__State.layer;
    }
    // ------------------------------------------------------------


    // FUNCTION | What the Door Was Given, for a Later Panel and for Checks
    // ------------------------------------------------------------
    function Na__VegRun__GetContext() {
        return Na__VegRun__State.context;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Runtime API
    // ------------------------------------------------------------
    export {
        Na__VegRun__Start,
        Na__VegRun__Stop,
        Na__VegRun__SyncPlants,
        Na__VegRun__AddPlops,
        Na__VegRun__GetStats,
        Na__VegRun__GetLayer,
        Na__VegRun__GetContext
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
