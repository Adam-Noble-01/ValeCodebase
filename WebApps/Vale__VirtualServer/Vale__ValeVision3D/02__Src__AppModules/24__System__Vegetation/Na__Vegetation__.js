// =============================================================================
// VALEVISION3D - VEGETATION - THE ONE DOOR IN
// =============================================================================
//
// FILE       : Na__Vegetation__.js
// NAMESPACE  : Na__Vegetation
// MODULE     : System - Vegetation
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The only vegetation module on the start-up path: find out whether
//              this project has plants, and load the rest of the system only if so
// CREATED    : 04-Nov-2026
//
// DESCRIPTION:
// - ON FOR EVERY PROJECT, AND THE ADMIN'S SWITCH STAYS (Adam, 05-Nov-2026: "Any Project, make the
//   admin ticked on boxes on by default now, i gated it initially whilst testing but its ready
//   to roll out, keep those gates so i can disable though"). Only a saved Enabled false turns a
//   project off: its object is kept, but nothing loads and nothing draws. No key is on.
// - WHO GETS WHAT. Staff, on a computer or a tablet, get the menu on any project, to plant. Everyone
//   else gets it only when there is something to see: a client on a project with no plants
//   approved costs this file and one test, and fetches no plant engine. So this file imports
//   nothing statically, and everything else comes through import(), as the Layout Editor's loader does.
// - NOTHING IS BUILT UNTIL IT IS NEEDED. A layer holds about 13 MB of scratch, so with no plants
//   yet the menu shows and no layer is made. Na__Vegetation__EnsureStarted does that the first
//   time a panel or tool opens.
// - IT LISTENS, IT DOES NOT FETCH. The loading sequence already holds the record, and tells this
//   door with or without a key, so there is no second read of the record and no question of whose
//   resilience settings the shared fetch took. Those events fire once, after the first await in
//   the sequence, by when index.html has finished its Initialize calls (note 10, section 1.2):
//   armed there, it cannot miss. Staff then read what they work on, in the data module.
// - THE DEV SECTION IS ALSO BEHIND A DOOR. It is how a project is switched on, so it
//   must be offered on a project with no key at all, yet a client or an Employee never
//   fetches it: the gate is asked first, and only an author imports the section.
// - A FAILURE HERE NEVER REACHES THE MODEL. Plants are an extra: if they cannot start,
//   say so in the console and let the app carry on.
//
// INTEGRATION:
// - Initialized from index.html, beside the north system, with the scene and friends.
// - Dispatched to from Na__AppFlow__LoadingSequence.js, for every project.
// - @delegate: ./03__System__SceneLayer/Na__Vegetation__Runtime__.js
// - @delegate: ./02__Core__Data/Na__Vegetation__SceneData__.js
// - @delegate: ./10__Ui__Panels/Na__Vegetation__DevControls__.js
// - @delegate: ./10__Ui__Panels/Na__Vegetation__MenuSection__.js
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 05-Nov-2026 - Version 1.3.0 (ValeVision3D v2.89.0)
// - On by default, for staff on any project, and only a saved Enabled false turns it off. The layer is
//   made when first needed. After Remove All the project is as one with no key: on.
//
// 04-Nov-2026 - Version 1.2.0 (ValeVision3D v2.85.0)
// - The Vegetation section of Tools & Settings comes and goes with the switch, and what
//   this device last chose is where the plants start. Remove All.
//
// 04-Nov-2026 - Version 1.1.0 (ValeVision3D v2.84.0)
// - Goes on from opening the data to putting the plants in the scene (Stage 2), takes
//   the scene and friends from index.html, offers the Dev section to an author, and
//   can switch a project on or off from it.
//
// 04-Nov-2026 - Version 1.0.0 (ValeVision3D v2.83.0)
// - Initial build: Stage 1 of ValeVision__PLAN__VegetationSystem__.md.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Loading Sequence's Event for This Key
    // ------------------------------------------------------------
    const Na__Vegetation__LOADED_EVENT = 'na-vegetation-scenedata-loaded';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Variables
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Where the System Stands on This Page
    // ------------------------------------------------------------
    const Na__Vegetation__State = {
        armed   : false,
        active  : false,                                                       // <-- The menu is up
        started : false,                                                       // <-- The layer has been made and has the plants
        startPromise : null,
        raw     : null,                                                        // <-- The record's own object, kept even while switched off
        context : null,                                                        // <-- { scene, camera, renderer, modelRoot, lineColour, getPipeline, showToast }
        stamp   : '',                                                          // <-- What the plants on the page add up to, or nothing with none
        drawingHold  : 0,                                                      // <-- A sheet is rendering its picture: no plants in it, whatever the project says
        drawingLayer : null                                                    // <-- Draws the plants alone, for a sheet: set once they are running
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Door
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Load the Rest and Put the Plants in the Scene
    // ------------------------------------------------------------
    async function Na__Vegetation__StartFrom(raw) {
        const data = await import('./02__Core__Data/Na__Vegetation__SceneData__.js');
        const sceneData = data.Na__VegData__Current() || await data.Na__VegData__Open(raw);
        const menu = await import('./10__Ui__Panels/Na__Vegetation__MenuSection__.js');
        if (Na__Vegetation__HasPlants(sceneData)) await Na__Vegetation__EnsureStarted();
        Na__Vegetation__State.active = true;
        menu.Na__VegMenu__Show(Na__Vegetation__State.context, menu.Na__VegMenu__StartingState(sceneData));
        return sceneData;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Does This Object Hold Anything to Draw?
    // ------------------------------------------------------------
    function Na__Vegetation__HasPlants(sceneData) {
        const count = (list) => (Array.isArray(list) ? list.length : 0);
        return !!sceneData && (count(sceneData.Vegetation__SceneData__Plops) + count(sceneData.Vegetation__SceneData__Paths)) > 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | Make the Layer and Draw the Plants, If That Has Not Been Done
    // ------------------------------------------------------------
    // Asked by a menu row before it opens a panel or a tool. They need the layer, even with no plants yet.
    // ------------------------------------------------------------
    function Na__Vegetation__EnsureStarted() {
        const state = Na__Vegetation__State;
        if (state.started) return Promise.resolve();
        if (!state.startPromise) {
            state.startPromise = (async () => {
                const data = await import('./02__Core__Data/Na__Vegetation__SceneData__.js');
                const menu = await import('./10__Ui__Panels/Na__Vegetation__MenuSection__.js');
                const runtime = await import('./03__System__SceneLayer/Na__Vegetation__Runtime__.js');
                const sceneData = data.Na__VegData__Current();
                await runtime.Na__VegRun__Start(state.context, sceneData, menu.Na__VegMenu__StartingState(sceneData));
                state.started = true;
            })().finally(() => { state.startPromise = null; });
        }
        return state.startPromise;
    }
    // ------------------------------------------------------------


    // HANDLER | The Loading Sequence Has Read the Record
    // ------------------------------------------------------------
    // Told for every project: raw is null with no key.
    // ------------------------------------------------------------
    async function Na__Vegetation__OnDataLoaded(event) {
        const raw = event && event.detail ? event.detail.sceneData : null;
        Na__Vegetation__State.raw = raw;
        if (raw && raw.Vegetation__SceneData__Enabled === false) return;       // <-- The admin's switch: as if it were not there

        try {
            const gate = await import('../03__AppUtils/Na__AppUtils__DevGate__.js');
            if (!Na__Vegetation__HasPlants(raw) && !gate.Na__DevGate__IsStaff()) return;   // <-- Nothing to see, and no way of adding any
            if (gate.Na__DevGate__IsStaff()) {
                const data = await import('./02__Core__Data/Na__Vegetation__SceneData__.js');
                const working = await data.Na__VegData__Open(raw);
                if (!Na__Vegetation__HasPlants(working) && !gate.Na__DevGate__CanCreateAssets()) return;   // <-- Staff on a phone only look
            }
            await Na__Vegetation__StartFrom(raw);
        } catch (error) {
            console.warn('[ValeVision3D Vegetation] Could not start, and the model is unaffected:', error && error.message);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Offer the Dev Section to an Author, and Nobody Else
    // ------------------------------------------------------------
    async function Na__Vegetation__OfferDevSection() {
        try {
            const gate = await import('../03__AppUtils/Na__AppUtils__DevGate__.js');
            if (!gate.Na__DevGate__IsAuthoringEnabled()) return;
            const section = await import('./10__Ui__Panels/Na__Vegetation__DevControls__.js');
            await section.Na__VegDev__Initialize(Na__Vegetation__State.context);
        } catch (error) {
            console.warn('[ValeVision3D Vegetation] The Dev section could not start:', error && error.message);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Arm the Door
    // ------------------------------------------------------------
    // Called once from index.html, before any project event can fire.
    // ------------------------------------------------------------
    function Na__Vegetation__Initialize(context) {
        if (Na__Vegetation__State.armed) return;
        Na__Vegetation__State.armed   = true;
        Na__Vegetation__State.context = context || null;
        window.addEventListener(Na__Vegetation__LOADED_EVENT, Na__Vegetation__OnDataLoaded, { once : true });
        if (Na__Vegetation__State.context) Na__Vegetation__OfferDevSection();
    }
    // ------------------------------------------------------------


    // FUNCTION | What the Plants on the Page Add Up To
    // ------------------------------------------------------------
    // A sheet keeps a picture of a 3D view until the model changes, and plants are in that
    // picture. It asks here, not the plant engine, which most projects never fetch. Empty
    // with no plants, so a project without them has exactly the fingerprint it always had.
    // ------------------------------------------------------------
    function Na__Vegetation__GetContentStamp() {
        return Na__Vegetation__State.stamp;
    }
    function Na__Vegetation__SetContentStamp(stamp) {
        Na__Vegetation__State.stamp = stamp || '';
    }
    // ------------------------------------------------------------


    // FUNCTION | A Sheet Is Drawing Its Own Picture: Keep Plants Out of It
    // ------------------------------------------------------------
    // Plants on a sheet are a layer of their own, over the vectors, so they are never in
    // its picture or its fog, whatever the project does on its live drawings.
    // ------------------------------------------------------------
    function Na__Vegetation__HoldDrawings(held) {
        Na__Vegetation__State.drawingHold = Math.max(0, Na__Vegetation__State.drawingHold + (held ? 1 : -1));
    }
    function Na__Vegetation__AreDrawingsHeld() {
        return Na__Vegetation__State.drawingHold > 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw the Plants Alone for a Sheet, or an Empty Layer with None
    // ------------------------------------------------------------
    function Na__Vegetation__SetDrawingLayer(draw) {
        Na__Vegetation__State.drawingLayer = draw || null;
    }
    function Na__Vegetation__RenderDrawingLayer(camera) {
        return Na__Vegetation__State.drawingLayer ? Na__Vegetation__State.drawingLayer(camera) : false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is Vegetation Running on This Page?
    // ------------------------------------------------------------
    function Na__Vegetation__IsActive() {
        return Na__Vegetation__State.active;
    }
    // ------------------------------------------------------------


    // FUNCTION | Switch This Project On or Off, and Save That
    // ------------------------------------------------------------
    // The Dev section's one switch. Off keeps everything in the project's object and
    // takes the plants off the screen; on brings them straight back, or makes the
    // object with every parameter in it on a project that has never had one.
    // Resolves as Na__VegData__Save does, { ok, error, ... }.
    // ------------------------------------------------------------
    async function Na__Vegetation__SetEnabled(enabled) {
        const data = await import('./02__Core__Data/Na__Vegetation__SceneData__.js');
        const sceneData = data.Na__VegData__Current() || await data.Na__VegData__Open(Na__Vegetation__State.raw);
        sceneData.Vegetation__SceneData__Enabled = (enabled === true);

        if (enabled === true) {
            await Na__Vegetation__StartFrom(sceneData);
        } else if (Na__Vegetation__State.active) {
            await Na__Vegetation__TakeDown();
        }
        data.Na__VegData__SetDirty(true);
        return data.Na__VegData__Save();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Take the Plants, the Menu and Any Open Panel Away
    // ------------------------------------------------------------
    async function Na__Vegetation__TakeDown() {
        const menu = await import('./10__Ui__Panels/Na__Vegetation__MenuSection__.js');
        menu.Na__VegMenu__Hide();
        const runtime = await import('./03__System__SceneLayer/Na__Vegetation__Runtime__.js');
        runtime.Na__VegRun__Stop();
        Na__Vegetation__State.active  = false;
        Na__Vegetation__State.started = false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Delete Everything This Project Holds for Vegetation: Final
    // ------------------------------------------------------------
    // Resolves as Na__VegData__RemoveAll does, { ok, error, ... }. The plants stay until
    // the file has really lost them, so a failed save leaves things as they were. Then the
    // project is as one with no key: on, with nothing planted.
    // ------------------------------------------------------------
    async function Na__Vegetation__RemoveAll() {
        const data = await import('./02__Core__Data/Na__Vegetation__SceneData__.js');
        const result = await data.Na__VegData__RemoveAll();
        if (!result || !result.ok) return result;

        const runtime = await import('./03__System__SceneLayer/Na__Vegetation__Runtime__.js');
        const sceneData = runtime.Na__VegRun__GetSceneData();
        if (sceneData) {
            sceneData.Vegetation__SceneData__Plops = [];
            sceneData.Vegetation__SceneData__Paths = [];
            await runtime.Na__VegRun__SyncPlants();
        }
        if (Na__Vegetation__State.active) await Na__Vegetation__TakeDown();
        Na__Vegetation__State.raw = null;
        await Na__Vegetation__StartFrom(null);
        return result;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | The Door's API
    // ------------------------------------------------------------
    export {
        Na__Vegetation__LOADED_EVENT,
        Na__Vegetation__Initialize,
        Na__Vegetation__IsActive,
        Na__Vegetation__EnsureStarted,
        Na__Vegetation__SetEnabled,
        Na__Vegetation__RemoveAll,
        Na__Vegetation__GetContentStamp,
        Na__Vegetation__SetContentStamp,
        Na__Vegetation__HoldDrawings,
        Na__Vegetation__AreDrawingsHeld,
        Na__Vegetation__SetDrawingLayer,
        Na__Vegetation__RenderDrawingLayer
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
