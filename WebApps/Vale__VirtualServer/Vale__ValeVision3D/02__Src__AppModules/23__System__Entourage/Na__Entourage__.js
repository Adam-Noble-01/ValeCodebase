// =============================================================================
// VALEVISION3D - ENTOURAGE - THE ONE DOOR IN
// =============================================================================
//
// FILE       : Na__Entourage__.js
// NAMESPACE  : Na__Entourage
// MODULE     : System - Entourage
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The only entourage module on the start-up path: find out whether this
//              project has figures, and load the rest of the system only if so
// CREATED    : 05-Nov-2026
//
// DESCRIPTION:
// - THE PLANTS' ROUTE (Na__Vegetation__.js). Adam, 05-Nov-2026: "Have the same route for enabling
//   i.e. dev menu toggle on/off entourage assets, the relevant menu section then appears".
// - ON FOR EVERY PROJECT, AND THE ADMIN'S SWITCH STAYS (Adam, 05-Nov-2026: "Any Project, make the
//   admin ticked on boxes on by default now ... keep those gates so i can disable though"). Only a
//   saved Enabled false turns a project off. No key is on, and absent Enabled is on.
// - WHO GETS WHAT. Staff, on a computer or a tablet, get the menu on any project, to place people.
//   Everyone else gets it only when there is somebody to see: a client on a project with nobody
//   approved costs this file and one test, and imports nothing.
// - NOTHING IS BUILT UNTIL IT IS NEEDED. With nobody placed yet the menu shows and no layer is made.
//   Na__Entourage__EnsureStarted does that the first time a panel opens.
// - IT LISTENS, IT DOES NOT FETCH. The loading sequence already holds the record, and tells this
//   door with or without a key. Armed from index.html, it cannot miss. Staff then read what they work
//   on, in the data module.
// - THE DEV SECTION IS ALSO BEHIND A DOOR, so a client or an Employee never fetches it.
// - A FAILURE HERE NEVER REACHES THE MODEL. Figures are an extra.
// - A DRAWING SAVES THEM FIRST (v2.96.0). Unsaved people are saved as the Drawing Editor or the
//   Layout Editor opens (Adam, 11-Nov-2026: "to stop people losing their entorage and vegetation
//   when they make drawings").
//
// INTEGRATION:
// - Initialized from index.html, beside the vegetation door, with the scene and friends.
// - Dispatched to from Na__AppFlow__LoadingSequence.js, for every project.
// - @delegate: ./03__System__SceneLayer/Na__Entourage__Runtime__.js
// - @delegate: ./02__Core__Data/Na__Entourage__SceneData__.js
// - @delegate: ./10__Ui__Panels/Na__Entourage__DevControls__.js
// - @delegate: ./10__Ui__Panels/Na__Entourage__MenuSection__.js
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Nov-2026 - Version 1.2.0 (ValeVision3D v2.96.0)
// - SaveForDrawing: unsaved people are saved as the Drawing Editor or the Layout Editor opens.
//
// 05-Nov-2026 - Version 1.1.0 (ValeVision3D v2.89.0)
// - On by default, for staff on any project, and only a saved Enabled false turns it off. The layer is
//   made when first needed. After Remove All the project is as one with no key: on.
//
// 05-Nov-2026 - Version 1.0.0 (ValeVision3D v2.88.0)
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants and Variables
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Loading Sequence's Event for This Key
    // ------------------------------------------------------------
    const Na__Entourage__LOADED_EVENT = 'na-entourage-scenedata-loaded';
    // ------------------------------------------------------------

    // MODULE CONSTANTS | The Drawing Pages' Events: Unsaved Work Is Saved as They Open
    // ------------------------------------------------------------
    const Na__Entourage__PAGE_EVENT   = 'na-app-page-changed';                 // <-- Na__AppPages__Navigation__: { page, previous }
    const Na__Entourage__MODEL_PAGE   = 'model';                               // <-- Its Na__AppPages__MODEL
    const Na__Entourage__LAYOUT_EVENT = 'na-layouteditor-mode-changed';        // <-- Na__LayoutEditor__ModeController__: { isActive, sheetId, view }
    // ------------------------------------------------------------

    // MODULE VARIABLES | Where the System Stands on This Page
    // ------------------------------------------------------------
    const Na__Entourage__State = {
        armed        : false,
        active       : false,                                                  // <-- The menu is up
        started      : false,                                                  // <-- The layer has been made and has the figures
        startPromise : null,
        raw          : null,                                                   // <-- The record's own object, kept even while switched off
        context      : null,                                                   // <-- { scene, camera, renderer, controls, modelRoot, lineColour, wallColour, getPipeline, showToast }
        stamp        : '',                                                     // <-- What the figures on the page add up to, or nothing with none
        drawingHold  : 0,                                                      // <-- A sheet is rendering its picture: no figures in it, whatever the project says
        drawingLayer : null                                                    // <-- Draws the figures alone, for a sheet: set once they are running
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Door
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Load the Rest and Put the Figures in the Scene
    // ------------------------------------------------------------
    async function Na__Entourage__StartFrom(raw) {
        const data = await import('./02__Core__Data/Na__Entourage__SceneData__.js');
        const sceneData = data.Na__EntData__Current() || await data.Na__EntData__Open(raw);
        const menu = await import('./10__Ui__Panels/Na__Entourage__MenuSection__.js');
        if (sceneData.Entourage__SceneData__Figures.length > 0) await Na__Entourage__EnsureStarted();
        Na__Entourage__State.active = true;
        menu.Na__EntMenu__Show(Na__Entourage__State.context, menu.Na__EntMenu__StartingState(sceneData));
        return sceneData;
    }
    // ------------------------------------------------------------


    // FUNCTION | Make the Layer and Draw the Figures, If That Has Not Been Done
    // ------------------------------------------------------------
    // Asked by a menu row before it opens a panel. A panel needs the layer, even with nobody placed.
    // ------------------------------------------------------------
    function Na__Entourage__EnsureStarted() {
        const state = Na__Entourage__State;
        if (state.started) return Promise.resolve();
        if (!state.startPromise) {
            state.startPromise = (async () => {
                const data = await import('./02__Core__Data/Na__Entourage__SceneData__.js');
                const menu = await import('./10__Ui__Panels/Na__Entourage__MenuSection__.js');
                const runtime = await import('./03__System__SceneLayer/Na__Entourage__Runtime__.js');
                const sceneData = data.Na__EntData__Current();
                await runtime.Na__EntRun__Start(state.context, sceneData, menu.Na__EntMenu__StartingState(sceneData));
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
    async function Na__Entourage__OnDataLoaded(event) {
        const raw = event && event.detail ? event.detail.sceneData : null;
        Na__Entourage__State.raw = raw;
        if (raw && raw.Entourage__SceneData__Enabled === false) return;        // <-- The admin's switch: as if it were not there

        try {
            const gate = await import('../03__AppUtils/Na__AppUtils__DevGate__.js');
            const someone = !!(raw && Array.isArray(raw.Entourage__SceneData__Figures) && raw.Entourage__SceneData__Figures.length > 0);
            if (!someone && !gate.Na__DevGate__IsStaff()) return;              // <-- Nobody to see, and no way of adding one
            if (gate.Na__DevGate__IsStaff()) {
                const data = await import('./02__Core__Data/Na__Entourage__SceneData__.js');
                const working = await data.Na__EntData__Open(raw);
                if (working.Entourage__SceneData__Figures.length === 0 && !gate.Na__DevGate__CanCreateAssets()) return;   // <-- Staff on a phone only look
            }
            await Na__Entourage__StartFrom(raw);
        } catch (error) {
            console.warn('[ValeVision3D Entourage] Could not start, and the model is unaffected:', error && error.message);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Offer the Dev Section to an Author, and Nobody Else
    // ------------------------------------------------------------
    async function Na__Entourage__OfferDevSection() {
        try {
            const gate = await import('../03__AppUtils/Na__AppUtils__DevGate__.js');
            if (!gate.Na__DevGate__IsAuthoringEnabled()) return;
            const section = await import('./10__Ui__Panels/Na__Entourage__DevControls__.js');
            await section.Na__EntDev__Initialize(Na__Entourage__State.context);
        } catch (error) {
            console.warn('[ValeVision3D Entourage] The Dev section could not start:', error && error.message);
        }
    }
    // ------------------------------------------------------------


    // HANDLER | A Drawing Is Being Made: Save Unsaved People First
    // ------------------------------------------------------------
    // Adam, 11-Nov-2026: "also saved when the drawing tool is used to stop people losing their
    // entorage and vegetation when they make drawings". The Drawing Editor's page opening
    // (na-app-page-changed, any page but the Model View) and the Layout Editor opening
    // (na-layouteditor-mode-changed, isActive) each save what is unsaved, through Save Entourage
    // itself, so the button, the undo steps and anyone else's work coming back all behave as a
    // press would. Nothing unsaved, or nobody who can save (a client), costs one test.
    // ------------------------------------------------------------
    async function Na__Entourage__SaveForDrawing(event) {
        const detail = (event && event.detail) || {};
        const drawing = event.type === Na__Entourage__LAYOUT_EVENT ? detail.isActive === true : (detail.page && detail.page !== Na__Entourage__MODEL_PAGE);
        if (!drawing || !Na__Entourage__State.active) return;
        try {
            const data = await import('./02__Core__Data/Na__Entourage__SceneData__.js');
            if (!data.Na__EntData__IsDirty()) return;
            const shell = await import('./10__Ui__Panels/Na__Entourage__PanelShell__.js');
            await shell.Na__EntShell__Save();
        } catch (error) {
            console.warn('[ValeVision3D Entourage] Not saved before the drawing opened:', error && error.message);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Arm the Door
    // ------------------------------------------------------------
    // Called once from index.html, before any project event can fire.
    // ------------------------------------------------------------
    function Na__Entourage__Initialize(context) {
        if (Na__Entourage__State.armed) return;
        Na__Entourage__State.armed   = true;
        Na__Entourage__State.context = context || null;
        window.addEventListener(Na__Entourage__LOADED_EVENT, Na__Entourage__OnDataLoaded, { once : true });
        window.addEventListener(Na__Entourage__PAGE_EVENT, Na__Entourage__SaveForDrawing);
        window.addEventListener(Na__Entourage__LAYOUT_EVENT, Na__Entourage__SaveForDrawing);
        if (Na__Entourage__State.context) Na__Entourage__OfferDevSection();
    }
    // ------------------------------------------------------------


    // FUNCTION | What the Figures on the Page Add Up To
    // ------------------------------------------------------------
    // A sheet keeps a picture of a 3D view until the model changes, and figures are in that
    // picture. It asks here, not the runtime, which most projects never fetch. Empty with no
    // figures, so a project without them has exactly the fingerprint it always had.
    // ------------------------------------------------------------
    function Na__Entourage__GetContentStamp() {
        return Na__Entourage__State.stamp;
    }
    function Na__Entourage__SetContentStamp(stamp) {
        Na__Entourage__State.stamp = stamp || '';
    }
    // ------------------------------------------------------------


    // FUNCTION | A Sheet Is Drawing Its Own Picture: Keep Figures Out of It
    // ------------------------------------------------------------
    function Na__Entourage__HoldDrawings(held) {
        Na__Entourage__State.drawingHold = Math.max(0, Na__Entourage__State.drawingHold + (held ? 1 : -1));
    }
    function Na__Entourage__AreDrawingsHeld() {
        return Na__Entourage__State.drawingHold > 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw the Figures Alone for a Sheet, or an Empty Layer with None
    // ------------------------------------------------------------
    function Na__Entourage__SetDrawingLayer(draw) {
        Na__Entourage__State.drawingLayer = draw || null;
    }
    function Na__Entourage__RenderDrawingLayer(camera, overOther) {
        return Na__Entourage__State.drawingLayer ? Na__Entourage__State.drawingLayer(camera, overOther === true) : false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is Entourage Running on This Page?
    // ------------------------------------------------------------
    function Na__Entourage__IsActive() {
        return Na__Entourage__State.active;
    }
    // ------------------------------------------------------------


    // FUNCTION | Switch This Project On or Off, and Save That
    // ------------------------------------------------------------
    // The Dev section's one switch. Off keeps everything in the project's object and takes the
    // figures off the screen; on brings them straight back, or makes the object with every
    // parameter in it on a project that has never had one.
    // Resolves as Na__EntData__Save does, { ok, error, ... }.
    // ------------------------------------------------------------
    async function Na__Entourage__SetEnabled(enabled) {
        const data = await import('./02__Core__Data/Na__Entourage__SceneData__.js');
        const sceneData = data.Na__EntData__Current() || await data.Na__EntData__Open(Na__Entourage__State.raw);
        sceneData.Entourage__SceneData__Enabled = (enabled === true);

        if (enabled === true) {
            await Na__Entourage__StartFrom(sceneData);
        } else if (Na__Entourage__State.active) {
            await Na__Entourage__TakeDown();
        }
        data.Na__EntData__SetDirty(true);
        return data.Na__EntData__Save();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Take the Figures, the Menu and Any Open Panel Away
    // ------------------------------------------------------------
    async function Na__Entourage__TakeDown() {
        const menu = await import('./10__Ui__Panels/Na__Entourage__MenuSection__.js');
        menu.Na__EntMenu__Hide();
        const runtime = await import('./03__System__SceneLayer/Na__Entourage__Runtime__.js');
        runtime.Na__EntRun__Stop();
        Na__Entourage__State.active  = false;
        Na__Entourage__State.started = false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Delete Everything This Project Holds for Entourage: Final
    // ------------------------------------------------------------
    // The figures stay until the file has really lost them, so a failed save leaves things as they
    // were. Then the project is as one with no key: on, with nobody placed.
    // ------------------------------------------------------------
    async function Na__Entourage__RemoveAll() {
        const data = await import('./02__Core__Data/Na__Entourage__SceneData__.js');
        const result = await data.Na__EntData__RemoveAll();
        if (!result || !result.ok) return result;

        const runtime = await import('./03__System__SceneLayer/Na__Entourage__Runtime__.js');
        const sceneData = runtime.Na__EntRun__GetSceneData();
        if (sceneData) {
            sceneData.Entourage__SceneData__Figures = [];
            await runtime.Na__EntRun__SyncFigures();
        }
        if (Na__Entourage__State.active) await Na__Entourage__TakeDown();
        Na__Entourage__State.raw = null;
        await Na__Entourage__StartFrom(null);
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
        Na__Entourage__LOADED_EVENT,
        Na__Entourage__Initialize,
        Na__Entourage__IsActive,
        Na__Entourage__EnsureStarted,
        Na__Entourage__SetEnabled,
        Na__Entourage__RemoveAll,
        Na__Entourage__GetContentStamp,
        Na__Entourage__SetContentStamp,
        Na__Entourage__HoldDrawings,
        Na__Entourage__AreDrawingsHeld,
        Na__Entourage__SetDrawingLayer,
        Na__Entourage__RenderDrawingLayer
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
