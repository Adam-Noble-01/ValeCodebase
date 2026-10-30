// =============================================================================
// VALEVISION AURA - 3D ENVIRONMENT - THE SCENE'S SUN
// =============================================================================
//
// FILE       : Na__Environment3d__SceneSun__.js
// NAMESPACE  : Na__SceneSun3d
// MODULE     : 3D Environment - The Scene's Sun
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : One sun a scene: the open scene's sun in the engine, and the
//              Light sliders saved into that scene, so each elevation and view
//              keeps the light that suits it
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - ASKED BY ADAM (30-Oct-2026): "Every single scene in the JSON file needs to
//   have its sun position savable and a robust pathway that saves per scene,
//   per project. Then each viewport loads that data per scene, per project, so
//   you can set several different sun positions on elevations, for example,
//   that complement each shot." Before, the sun was one of the engine's
//   settings, one for the whole drawing set, so some elevations drew dark and
//   some light.
// - THE SUN IS A SCENE'S (View__Sun in the drawing set), as its camera and its
//   Art Direction Points are, and follows the same owner: open a scene's tab
//   and its sun is set in the engine (the Light sliders show it); move a sun
//   slider and it is saved into that scene, so every viewport showing it draws
//   with it (Na__Viewports__RenderQueue__ hands it to the still). With no scene
//   open the sun is the drawing set's WorkingSun, and + Add Scene takes it.
// - THE OWNER IS THE ART DIRECTION SECTION'S (Na__Environment3d__ArtDirection__
//   opens, adopts and leaves scenes, and calls Use, Keep and Retake here); this
//   module is given the open scene as a function, so it imports nothing of it.
// - A SCENE WITH NO SUN (a new drawing set, or one from before 0.5.9 that
//   never had the engine's settings saved) is given the engine's own when the
//   3D Environment is mounted (Fill), before the history takes its first
//   picture, so every scene has its own from then on.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0 (AURA 0.5.9)
// - Initial build, at Adam's word (above).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppState__Data, Na__AppState__Touch } from '../01__AppCore/Na__AppCore__AppState__.js';
    import { Na__Dom__El } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__EngineHost__Sun, Na__EngineHost__SetSun, Na__EngineHost__OnChange, Na__EngineHost__Borrowed } from '../10__System__EngineHost/Na__EngineHost__PainterlyNpr__.js';
    import {
        Na__DrawingSet__CleanSun, Na__DrawingSet__SunToEngine, Na__DrawingSet__WorkingSun, Na__DrawingSet__SetWorkingSun
    } from '../40__Feature__DrawingSet/Na__DrawingSet__Model__.js';
    import { Na__Parameters__Sync } from './Na__Environment3d__Parameters__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__SceneSun3d__State = {
        line      : null,                        // <-- Whose sun the Light sliders set, at the head of the Parameters section
        openScene : () => null                   // <-- The scene open in the 3D Environment, or null (the Stage's)
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | One Sun a Scene
// -----------------------------------------------------------------------------

    // FUNCTION | Give Every Scene Without a Sun (and the Working Sun) the Engine's Own
    // ------------------------------------------------------------
    // Not an edit: nothing drawn changes (those scenes drew with this sun), so
    // nothing is touched; the next save writes them.
    // ------------------------------------------------------------
    function Na__SceneSun3d__Fill(doc) {
        const live = Na__DrawingSet__CleanSun(Na__EngineHost__Sun());
        if (!doc || !live) return;
        if (!Na__DrawingSet__WorkingSun(doc)) Na__DrawingSet__SetWorkingSun(doc, live);
        (doc.AuraDrawingSet__SavedViews || []).forEach((scene) => {
            scene.View__Sun = Na__DrawingSet__CleanSun(scene.View__Sun) || Na__DrawingSet__WorkingSun(doc);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Set a Scene's Sun in the Engine (null: the working sun), the Sliders Following
    // ------------------------------------------------------------
    // quiet: the engine is dirtied but not asked to draw (the 3D Environment is
    // not on view). A scene with no sun yet takes the engine's as it is.
    // ------------------------------------------------------------
    function Na__SceneSun3d__Use(scene, quiet) {
        const doc = Na__AppState__Data.doc;
        if (!doc || Na__EngineHost__Borrowed()) return;
        const sun = scene ? scene.View__Sun : Na__DrawingSet__WorkingSun(doc);
        if (sun) Na__EngineHost__SetSun(Na__DrawingSet__SunToEngine(sun), !!quiet);
        else Na__SceneSun3d__Keep(scene, false);
        Na__Parameters__Sync();
        Na__SceneSun3d__ShowOwner(scene);
    }
    // ------------------------------------------------------------


    // FUNCTION | Keep the Engine's Sun in a Scene (null: the working sun), if It Changed
    // ------------------------------------------------------------
    // touch: told to the drawing set (saved, one step in its history); false
    // when the scene is only being given the sun it already draws with.
    // ------------------------------------------------------------
    function Na__SceneSun3d__Keep(scene, touch) {
        const doc = Na__AppState__Data.doc;
        if (!doc || Na__EngineHost__Borrowed()) return false;
        const live = Na__DrawingSet__CleanSun(Na__EngineHost__Sun());
        if (!live) return false;
        const before = scene ? Na__DrawingSet__CleanSun(scene.View__Sun) : Na__DrawingSet__WorkingSun(doc);
        if (JSON.stringify(before) === JSON.stringify(live)) return false;
        if (scene) scene.View__Sun = live;
        else Na__DrawingSet__SetWorkingSun(doc, live);
        if (touch !== false) Na__AppState__Touch('sun');
        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Say Whose Sun the Light Sliders Set
    // ------------------------------------------------------------
    function Na__SceneSun3d__ShowOwner(scene) {
        const line = Na__SceneSun3d__State.line;
        if (!line) return;
        line.textContent = scene
            ? `Light: the sun of the scene "${scene.View__Name}". Each scene keeps its own, and every viewport showing it draws with it.`
            : 'Light: no scene is open. This sun goes with the camera when you Add Scene.';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mount
// -----------------------------------------------------------------------------

    // FUNCTION | Put the Owner Line at the Head of the Parameters, and Keep Each Sun Slider's Move
    // ------------------------------------------------------------
    // body: the Parameters section's body; openScene: () => the open scene or
    // null. Mounted before the Art Direction section, which sets the first sun.
    // ------------------------------------------------------------
    function Na__SceneSun3d__Mount(body, openScene) {
        const S = Na__SceneSun3d__State;
        S.openScene = typeof openScene === 'function' ? openScene : () => null;
        S.line = Na__Dom__El('p', 'aura-points__owner aura-sun__owner');
        if (body) body.insertBefore(S.line, body.firstChild);
        Na__SceneSun3d__Fill(Na__AppState__Data.doc);
        Na__EngineHost__OnChange((reason) => {
            if (reason !== 'sun') return;
            const scene = S.openScene();
            Na__SceneSun3d__Keep(scene);
            Na__SceneSun3d__ShowOwner(scene);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__SceneSun3d__Mount,
        Na__SceneSun3d__Fill,
        Na__SceneSun3d__Use,
        Na__SceneSun3d__Keep
    };

// endregion -------------------------------------------------------------------
