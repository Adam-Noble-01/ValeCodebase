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
// - A PROJECT WITHOUT THE KEY COSTS THIS FILE AND ONE LISTENER, by design: most
//   projects will never have plants, and a client on a phone should not fetch a
//   plant engine to look at a house. So this file imports nothing statically, and
//   everything else comes through import(), as the Layout Editor's loader does.
// - ONE SWITCH (Adam, 04-Nov-2026). Enabled false keeps the project's object, but
//   nothing loads and nothing draws, exactly as if it had none.
// - IT LISTENS, IT DOES NOT FETCH. The loading sequence already holds the record, and
//   dispatches this key as it does its other per-project blocks, so there is no second
//   read and no question of whose resilience settings the shared fetch took. Those
//   events fire once, after the first await in the sequence, by when index.html has
//   finished its Initialize calls (note 10, section 1.2): armed there, it cannot miss.
// - THE DEV SECTION IS ALSO BEHIND A DOOR. It is how a project is switched on, so it
//   must be offered on a project with no key at all, yet a client or an Employee never
//   fetches it: the gate is asked first, and only an author imports the section.
// - A FAILURE HERE NEVER REACHES THE MODEL. Plants are an extra: if they cannot start,
//   say so in the console and let the app carry on.
//
// INTEGRATION:
// - Initialized from index.html, beside the north system, with the scene and friends.
// - Dispatched to from Na__AppFlow__LoadingSequence.js, when the record holds the key.
// - @delegate: ./03__System__SceneLayer/Na__Vegetation__Runtime__.js
// - @delegate: ./02__Core__Data/Na__Vegetation__SceneData__.js
// - @delegate: ./10__Ui__Panels/Na__Vegetation__DevControls__.js
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
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
        active  : false,
        raw     : null,                                                        // <-- The record's own object, kept even while switched off
        context : null                                                         // <-- { scene, camera, renderer, modelRoot, lineColour, getPipeline, showToast }
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
        const runtime = await import('./03__System__SceneLayer/Na__Vegetation__Runtime__.js');
        await runtime.Na__VegRun__Start(Na__Vegetation__State.context, sceneData);
        Na__Vegetation__State.active = true;
        return sceneData;
    }
    // ------------------------------------------------------------


    // HANDLER | The Record Holds a Vegetation Key
    // ------------------------------------------------------------
    async function Na__Vegetation__OnDataLoaded(event) {
        const raw = event && event.detail ? event.detail.sceneData : null;
        Na__Vegetation__State.raw = raw;
        if (!raw || raw.Vegetation__SceneData__Enabled !== true) return;       // <-- Switched off: as if it were not there

        try {
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
        const sceneData = data.Na__VegData__Current() || await data.Na__VegData__Open(Na__Vegetation__State.raw || {});
        sceneData.Vegetation__SceneData__Enabled = (enabled === true);

        if (enabled === true) {
            await Na__Vegetation__StartFrom(sceneData);
        } else if (Na__Vegetation__State.active) {
            const runtime = await import('./03__System__SceneLayer/Na__Vegetation__Runtime__.js');
            runtime.Na__VegRun__Stop();
            Na__Vegetation__State.active = false;
        }
        data.Na__VegData__SetDirty(true);
        return data.Na__VegData__Save();
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
        Na__Vegetation__SetEnabled
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
