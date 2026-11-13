// =============================================================================
// VALEVISION3D - ENTOURAGE - RUNTIME
// =============================================================================
//
// FILE       : Na__Entourage__Runtime__.js
// NAMESPACE  : Na__EntRun
// MODULE     : System - Entourage
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Join the scene layer to the app: give it what it needs from the render
//              loop, the line weights and the section cuts, and keep its figures the
//              same as the project's object
// CREATED    : 05-Nov-2026
//
// DESCRIPTION:
// - THE ONLY ENTOURAGE MODULE THAT IMPORTS THE APP'S RENDERING. The scene layer takes these as
//   a small host object. Everything here is already on the start-up path, so loading this adds
//   only the entourage modules themselves, and only on an enabled project.
// - THE GROUP SITS IN THE SCENE, NOT UNDER Na__ModelGroup__Root. Walk collision, layer toggles,
//   bounds and the phase library never see a figure.
// - A SAVED FIGURE THAT CANNOT BE DRAWN IS LEFT OUT AND SAID SO. Its record is untouched.
//
// INTEGRATION:
// - Started by ../Na__Entourage__.js when a project is enabled, or switched on.
// - Called by the panels in ../10__Ui__Panels and the tool in ../20__System__Tools.
// - @delegate: ./Na__Entourage__SceneLayer__.js
// - @delegate: ../02__Core__Data/Na__Entourage__SceneData__.js
// - @delegate: ../02__Core__Data/Na__Entourage__Library__.js
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 13-Nov-2026 - ValeVision3D v2.98.5
// - Line resolution starts at the 3D view's own size, which now stops under the top
//   bar, not at the window's bottom edge.
//
// 11-Nov-2026 - Version 1.1.0 (ValeVision3D v2.95.0)
// - SizeOf counts the height stretch (Jamesification).
//
// 05-Nov-2026 - Version 1.0.0 (ValeVision3D v2.88.0)
// - Initial build, after Na__Vegetation__Runtime__.js.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js
    // ------------------------------------------------------------
    import { Na__ViewportSize__Get } from '../../01__AppCore/Na__AppCore__ViewportSize__.js';
    import * as THREE from 'three';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The App's Rendering
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    import { Na__SceneHooks__Add } from '../../05__RenderPipeline/Na__RenderLoop__SceneRenderHooks__.js';
    import {
        Na__LineworkSettings__GetLineworkFactor,
        Na__LineworkSettings__SetLineworkFactor
    } from '../../05__RenderPipeline/Na__RenderEffect__LineworkSettings__State.js';
    import { Na__SectionClipping__GetClipList } from '../../05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Entourage
    // ------------------------------------------------------------
    import { Na__EntLayer__Create } from './Na__Entourage__SceneLayer__.js';
    import { Na__EntData__LoadConfig, Na__EntData__FigureToBuild } from '../02__Core__Data/Na__Entourage__SceneData__.js';
    import { Na__EntLib__ResolveAsset, Na__EntLib__PinAsset } from '../02__Core__Data/Na__Entourage__Library__.js';
    import {
        Na__Entourage__SetContentStamp,
        Na__Entourage__AreDrawingsHeld,
        Na__Entourage__SetDrawingLayer
    } from '../Na__Entourage__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Variables
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | What Is Running on This Page
    // ------------------------------------------------------------
    const Na__EntRun__State = {
        context      : null,
        layer        : null,
        sceneData    : null,
        recipes      : new Map(),
        syncRun      : 0,                                                      // <-- A newer sync stops an older one still reading
        shown        : true,
        transparency : 0
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Assets
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Make Sure These Assets Have Been Read
    // ------------------------------------------------------------
    // A project's own copy first, else the library. One that neither holds is said once, and
    // its figures are left out by the layer, which finds no asset for them.
    // ------------------------------------------------------------
    async function Na__EntRun__ReadAssets(ids) {
        const state = Na__EntRun__State;
        for (const id of ids) {
            if (state.recipes.has(id)) continue;
            try {
                state.recipes.set(id, await Na__EntLib__ResolveAsset(state.sceneData, id));
            } catch (error) {
                state.recipes.set(id, null);
                console.warn('[ValeVision3D Entourage] ' + id + ' cannot be drawn, so its figures are left out:', error && error.message);
            }
        }
        if (state.layer) state.layer.setRecipes(Array.from(state.recipes.values()).filter(Boolean));
    }
    // ------------------------------------------------------------


    // FUNCTION | An Asset, Once Read, or Null
    // ------------------------------------------------------------
    function Na__EntRun__RecipeFor(assetId) {
        return Na__EntRun__State.recipes.get(assetId) || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read an Asset If It Has Not Been, and Hand It Over
    // ------------------------------------------------------------
    async function Na__EntRun__EnsureRecipe(assetId) {
        await Na__EntRun__ReadAssets([assetId]);
        return Na__EntRun__RecipeFor(assetId);
    }
    // ------------------------------------------------------------


    // FUNCTION | Keep a Copy of Every Asset the Figures Now Use
    // ------------------------------------------------------------
    // Called by whatever has just placed or swapped a figure.
    // ------------------------------------------------------------
    async function Na__EntRun__PinInUse() {
        const sceneData = Na__EntRun__State.sceneData;
        for (const figure of sceneData.Entourage__SceneData__Figures) {
            await Na__EntLib__PinAsset(sceneData, figure.Entourage__Figure__AssetId);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | What a Figure Really Measures, in Mm: [width, height]
    // ------------------------------------------------------------
    function Na__EntRun__SizeOf(figure) {
        const recipe = Na__EntRun__RecipeFor(figure.Entourage__Figure__AssetId);
        const size = recipe ? recipe.Asset__Size : { Size__WidthMm : 600, Size__HeightMm : 1700 };
        const zoom = figure.Entourage__Figure__Scale > 0 ? figure.Entourage__Figure__Scale : 1;
        const tall = figure.Entourage__Figure__HeightStretch > 0 ? figure.Entourage__Figure__HeightStretch : 1;
        return [Math.round(size.Size__WidthMm * zoom), Math.round(size.Size__HeightMm * zoom * tall)];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Keeping the Figures the Same as the Project's Object
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Say What the Figures on the Page Add Up To
    // ------------------------------------------------------------
    // Kept by the door for a sheet to read. Nothing drawn is an empty stamp.
    // ------------------------------------------------------------
    function Na__EntRun__NoteContent() {
        const state = Na__EntRun__State;
        const layer = state.layer;
        const keys  = layer && state.shown ? layer.figures().map((figure) => figure.key).sort() : [];
        if (keys.length === 0) {
            Na__Entourage__SetContentStamp('');
            return;
        }
        const text = keys.join(';') + JSON.stringify(state.sceneData.Entourage__SceneData__LineRules) + state.transparency;
        let hash = 0x811c9dc5;
        for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
        Na__Entourage__SetContentStamp(keys.length + '-' + (hash >>> 0).toString(16));
    }
    // ------------------------------------------------------------


    // FUNCTION | Bring the Picture into Line with the Project's Object
    // ------------------------------------------------------------
    async function Na__EntRun__SyncFigures() {
        const state = Na__EntRun__State;
        if (!state.layer) return;
        const run = ++state.syncRun;
        const figures = state.sceneData.Entourage__SceneData__Figures;
        await Na__EntRun__ReadAssets(new Set(figures.map((figure) => figure.Entourage__Figure__AssetId)));
        if (run !== state.syncRun) return;
        state.layer.setFigures(state.sceneData.Entourage__SceneData__Figures.map(Na__EntData__FigureToBuild));
        Na__EntRun__NoteContent();
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // FUNCTION | An Asset's Copy Has Changed: Draw Its Figures Again
    // ------------------------------------------------------------
    async function Na__EntRun__RefreshAsset(assetId) {
        const layer = Na__EntRun__State.layer;
        if (!layer) return;
        Na__EntRun__State.recipes.delete(assetId);
        layer.forgetAsset(assetId);
        await Na__EntRun__SyncFigures();
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply the Object's Line Rules to What Is Drawn
    // ------------------------------------------------------------
    // Called as a Linework slider moves. A figure is a few hundred segments, so every slider is live.
    // ------------------------------------------------------------
    function Na__EntRun__ApplyLineRules() {
        const layer = Na__EntRun__State.layer;
        if (!layer) return;
        const rules    = Na__EntRun__State.sceneData.Entourage__SceneData__LineRules;
        const advanced = rules.Entourage__LineRules__Advanced;
        const weight   = rules.Entourage__LineRules__LineWeightPx;

        layer.setLineRules(rules);
        layer.setLineWeights(weight, weight * rules.Entourage__LineRules__InnerWeightShare);
        layer.setDepthBias(advanced.Entourage__LineRulesAdvanced__DepthBias);
        layer.setFillTone(advanced.Entourage__LineRulesAdvanced__FillTone);
        layer.setFillWallShare(advanced.Entourage__LineRulesAdvanced__FillWallShare);
        Na__LineworkSettings__SetLineworkFactor(Na__LineworkSettings__GetLineworkFactor());   // <-- The user's own line weight, on top of the new base
        Na__EntRun__NoteContent();
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Starting and Stopping
// -----------------------------------------------------------------------------

    // FUNCTION | Put the Project's Figures in the Scene
    // ------------------------------------------------------------
    // context : { scene, camera, renderer, controls, modelRoot, lineColour, wallColour, getPipeline, showToast }
    // starting: { shown, transparencyPercent }, what this device starts from
    // ------------------------------------------------------------
    async function Na__EntRun__Start(context, sceneData, starting) {
        const state = Na__EntRun__State;
        state.context   = context;
        state.sceneData = sceneData;

        if (!state.layer) {
            const config = await Na__EntData__LoadConfig();
            const viewSize = Na__ViewportSize__Get();                        // <-- The 3D view's box (under the top bar), not the window
            state.layer = Na__EntLayer__Create({
                scene             : context.scene,
                lineRules         : sceneData.Entourage__SceneData__LineRules,
                lineColour        : context.lineColour,
                wallColour        : context.wallColour,
                resolution        : new THREE.Vector2(viewSize.width, viewSize.height),
                seeThroughPercent : config.Entourage__Transparency__Config.Entourage__Transparency__SeeThroughFromPercent,
                host              : {
                    addRenderHook : (hook) => Na__SceneHooks__Add(context.scene, hook),
                    getClipList   : Na__SectionClipping__GetClipList,
                    requestFrame  : Na__RenderLoop__RequestRender,
                    isAoRunning   : () => {
                        const pipeline = context.getPipeline ? context.getPipeline() : null;
                        return !!(pipeline && pipeline.aoPassRef && pipeline.aoPassRef.enabled);
                    },
                    liveDrawingsWantFigures : () => !Na__Entourage__AreDrawingsHeld() && state.sceneData.Entourage__SceneData__ShowOnLiveDrawings === true
                }
            });
            state.layer.installRenderHook();
            Na__Entourage__SetDrawingLayer((camera, overOther) => state.layer.renderDrawingLayer(context.renderer, camera, overOther));

            // TWO THINGS THAT ALREADY RAN WITHOUT US | The user's line weight, which the lines
            // have just missed, and the profile pass's list of the scene's objects.
            Na__LineworkSettings__SetLineworkFactor(Na__LineworkSettings__GetLineworkFactor());
            const pipeline = context.getPipeline ? context.getPipeline() : null;
            if (pipeline && pipeline.invalidateProfileLinesCache) pipeline.invalidateProfileLinesCache();
        }

        const shown        = starting ? starting.shown !== false : sceneData.Entourage__SceneData__ShowByDefault !== false;
        const transparency = starting ? starting.transparencyPercent : sceneData.Entourage__SceneData__DefaultTransparencyPercent;
        Na__EntRun__SetShown(shown);
        Na__EntRun__SetTransparency(transparency);
        await Na__EntRun__SyncFigures();
    }
    // ------------------------------------------------------------


    // FUNCTION | Take the Figures Off the Screen
    // ------------------------------------------------------------
    function Na__EntRun__Stop() {
        if (Na__EntRun__State.layer) Na__EntRun__State.layer.setVisible(false);
        Na__Entourage__SetContentStamp('');
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // FUNCTION | Show or Hide the Figures, for This Device
    // ------------------------------------------------------------
    function Na__EntRun__SetShown(shown) {
        Na__EntRun__State.shown = (shown === true);
        if (Na__EntRun__State.layer) Na__EntRun__State.layer.setVisible(Na__EntRun__State.shown);
        Na__EntRun__NoteContent();
        Na__RenderLoop__RequestRender();
    }
    function Na__EntRun__IsShown() {
        return Na__EntRun__State.shown;
    }
    // ------------------------------------------------------------


    // FUNCTION | Fade the Figures, for This Device
    // ------------------------------------------------------------
    function Na__EntRun__SetTransparency(percent) {
        Na__EntRun__State.transparency = Number(percent) || 0;
        if (Na__EntRun__State.layer) Na__EntRun__State.layer.setTransparency(Na__EntRun__State.transparency);
        Na__EntRun__NoteContent();
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // FUNCTION | What the Layer Is Doing, for the Panel and for Checks
    // ------------------------------------------------------------
    function Na__EntRun__GetStats() {
        return Na__EntRun__State.layer ? Na__EntRun__State.layer.stats : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Layer, What the Door Was Given, and the Object Drawn From
    // ------------------------------------------------------------
    function Na__EntRun__GetLayer() {
        return Na__EntRun__State.layer;
    }
    function Na__EntRun__GetContext() {
        return Na__EntRun__State.context;
    }
    function Na__EntRun__GetSceneData() {
        return Na__EntRun__State.sceneData;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Runtime API
    // ------------------------------------------------------------
    export {
        Na__EntRun__Start,
        Na__EntRun__Stop,
        Na__EntRun__SyncFigures,
        Na__EntRun__RefreshAsset,
        Na__EntRun__ApplyLineRules,
        Na__EntRun__RecipeFor,
        Na__EntRun__EnsureRecipe,
        Na__EntRun__SizeOf,
        Na__EntRun__PinInUse,
        Na__EntRun__SetShown,
        Na__EntRun__IsShown,
        Na__EntRun__SetTransparency,
        Na__EntRun__GetStats,
        Na__EntRun__GetLayer,
        Na__EntRun__GetContext,
        Na__EntRun__GetSceneData
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
