/* =============================================================================
   VGHLANTERN - DOCUMENT PREVIEW | PROGRESS OVERLAY
   =============================================================================

   FILE       : VghLantern__DocPreview__ProgressOverlay__.js
   NAMESPACE  : VghLantern
   MODULE     : DocPreview - ProgressOverlay
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Show that a multi-lantern document pack is being composed
   CREATED    : 12-Aug-2026

   DESCRIPTION:
   - Covers the window while the pack's drawings are baked, naming the lantern being
     composed and how far through the schedule the pass is.
   - Modelled on the ValeVision3D layout export overlay, which is the pattern staff
     already read as "something is rendering": a semi-transparent white sheet with a
     light blur, a Vale blue ring turning on a pale track, and a status line under it.
   - Every string and every timing is config, so the wording of a wait can be changed
     without touching this file.

   -----------------------------------------------------------------------------

   WHY THIS IS NOT THE PROJECTED EDGES OVERLAY REUSED:
   That one is an ES module importing the ProjectedEdges config section, and it is
   dormant behind a flag of its own that must stay independently switchable. Preview
   and Send is classic-script territory and needs its own copy in its own config. What
   is genuinely shared is the LOOK, and that lives in the stylesheet rules, which are a
   deliberate restatement of the same pattern for the same reason the ProjectedEdges
   rules restate ValeVision3D's.

   WHY IT COVERS THE WINDOW RATHER THAN THE STAGE:
   The bake borrows the Drawing Editor's session sheet setup and hands it back when it
   finishes. A toolbar toggle flicked mid-bake re-renders the preview and queues work
   against a setup that is currently on loan, so the cover is what makes "wait" the
   only available action rather than merely the advisable one.

   WHY A MINIMUM LANTERN COUNT:
   A single lantern composes fast enough that a full-screen sheet would appear and
   vanish inside a few frames, which reads as a glitch rather than as progress. The
   overlay is for the wait a person actually sits through.

   ============================================================================= */

// =============================================================================
// REGION | Document Preview Progress Overlay Module
// =============================================================================

const VghLantern__DocPreview__ProgressOverlay = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Class Names
    // ------------------------------------------------------------
    const CSS_OVERLAY       =  'VghLantern__DocPreview__Overlay';
    const CSS_OVERLAY_OPEN  =  'VghLantern__DocPreview__Overlay--visible';
    const CSS_SPINNER       =  'VghLantern__DocPreview__Overlay__Spinner';
    const CSS_TITLE         =  'VghLantern__DocPreview__Overlay__Title';
    const CSS_STATUS        =  'VghLantern__DocPreview__Overlay__Status';
    const CSS_STATUS_OK     =  'VghLantern__DocPreview__Overlay__Status--success';
    const CSS_STATUS_ERROR  =  'VghLantern__DocPreview__Overlay__Status--error';
    const CSS_COUNT         =  'VghLantern__DocPreview__Overlay__Count';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Context Label
    // ------------------------------------------------------------
    const PROGRESS_LABEL    =  'Na__DocPreview__Config.json -> VghLantern__DocPreview__Config__Progress';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Project Data Keys
    // ------------------------------------------------------------
    const PROJECT_LANTERNS  =  'VghLantern__ProjectFile__Lanterns';
    // ------------------------------------------------------------


    // MODULE VARIABLES | The One Overlay and Its Parts
    // ------------------------------------------------------------
    let VghLantern__ProgressOverlay__Root       =  null;
    let VghLantern__ProgressOverlay__StatusEl   =  null;
    let VghLantern__ProgressOverlay__CountEl    =  null;
    let VghLantern__ProgressOverlay__CloseTimer =  0;
    let VghLantern__ProgressOverlay__IsOpen     =  false;                      // <-- Guards Close against a caller that never opened one
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Progress Config Block
    // ------------------------------------------------------------
    function VghLantern__ProgressOverlay__Config() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var docCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('DocPreview') || {};
        return docCfg['VghLantern__DocPreview__Config__Progress'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read One Configured String
    // ------------------------------------------------------------
    function VghLantern__ProgressOverlay__Text(key) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        return ConfigLoader.VghLantern__ConfigLoader__RequireString(
            VghLantern__ProgressOverlay__Config(), key, PROGRESS_LABEL);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Configured Fade Duration
    // ------------------------------------------------------------
    function VghLantern__ProgressOverlay__FadeInMs() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        return ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            VghLantern__ProgressOverlay__Config(), 'FadeInMs', PROGRESS_LABEL);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Count the Lanterns on the Current Project
    // ------------------------------------------------------------
    function VghLantern__ProgressOverlay__LanternCount() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return 0;

        var project  =  StateManager.VghLantern__StateManager__GetCurrentProject();
        return (project && Array.isArray(project[PROJECT_LANTERNS])) ? project[PROJECT_LANTERNS].length : 0;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Construction
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Overlay Once and Keep It
    // ------------------------------------------------------------
    // Built hidden and left in the document between packs. Rebuilding it each time
    // would restart the CSS transition from a fresh element, which makes the fade in
    // stutter on its first frame.
    function VghLantern__ProgressOverlay__Ensure() {
        if (VghLantern__ProgressOverlay__Root && VghLantern__ProgressOverlay__Root.isConnected) {
            return VghLantern__ProgressOverlay__Root;
        }

        var root  =  document.createElement('div');
        root.className  =  CSS_OVERLAY;
        root.setAttribute('role', 'status');
        root.setAttribute('aria-live', 'polite');

        var spinner  =  document.createElement('div');
        spinner.className  =  CSS_SPINNER;

        var title  =  document.createElement('p');
        title.className    =  CSS_TITLE;
        title.textContent  =  VghLantern__ProgressOverlay__Text('TitleText');

        var status  =  document.createElement('p');
        status.className  =  CSS_STATUS;

        var count  =  document.createElement('p');
        count.className  =  CSS_COUNT;

        root.appendChild(spinner);
        root.appendChild(title);
        root.appendChild(status);
        root.appendChild(count);
        document.body.appendChild(root);

        VghLantern__ProgressOverlay__Root      =  root;
        VghLantern__ProgressOverlay__StatusEl  =  status;
        VghLantern__ProgressOverlay__CountEl   =  count;

        return root;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Reset the Status Line to Its Neutral Style
    // ------------------------------------------------------------
    function VghLantern__ProgressOverlay__NeutralStatus() {
        var status  =  VghLantern__ProgressOverlay__StatusEl;
        if (!status) return null;

        status.classList.remove(CSS_STATUS_OK, CSS_STATUS_ERROR);
        return status;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Report Whether There Is a Pack Worth Covering
    // ------------------------------------------------------------
    // Every pack, whatever its size. This deliberately does NOT judge the wait by the
    // number of lanterns: how long a sheet takes to compose is a property of the
    // machine composing it, and a single lantern on a modest one is a wait worth
    // explaining just as much as four on a fast one.
    //
    // The one exclusion is a project with no lanterns, which has no pack to prepare and
    // is refused by the issue banner before any of this matters.
    function VghLantern__DocPreview__ProgressOverlay__IsWarranted() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var config        =  VghLantern__ProgressOverlay__Config();

        if (!ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(config, 'ShowOverlay', PROGRESS_LABEL)) return false;

        return VghLantern__ProgressOverlay__LanternCount() > 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | Show the Overlay at the Start of a Bake
    // ------------------------------------------------------------
    // Returns whether the caller now OWNS the overlay, which is also its licence to
    // close it. There is one overlay element, and Preview and Send can legitimately
    // start a second wait while the first is running - entering the mode queues a bake,
    // and Export pressed a moment later joins that same pass. The second caller gets
    // false, leaves the text alone, and lets the first caller close it when its own
    // work is done.
    function VghLantern__DocPreview__ProgressOverlay__Open() {
        if (VghLantern__ProgressOverlay__IsOpen) return false;
        if (!VghLantern__DocPreview__ProgressOverlay__IsWarranted()) return false;

        window.clearTimeout(VghLantern__ProgressOverlay__CloseTimer);

        var root  =  VghLantern__ProgressOverlay__Ensure();
        VghLantern__ProgressOverlay__NeutralStatus();

        if (VghLantern__ProgressOverlay__StatusEl) VghLantern__ProgressOverlay__StatusEl.textContent  =  '';
        if (VghLantern__ProgressOverlay__CountEl)  VghLantern__ProgressOverlay__CountEl.textContent   =  '';

        // The fade duration is set from config rather than left to the stylesheet, so
        // the time WaitUntilVisible waits and the time the overlay takes to arrive are
        // one number rather than two that have to be kept in agreement by hand.
        root.style.transitionDuration  =  VghLantern__ProgressOverlay__FadeInMs() + 'ms';

        // Read back a layout value between adding the element and adding the class, so
        // the browser has a painted "hidden" state to transition away from.
        void root.offsetWidth;
        root.classList.add(CSS_OVERLAY_OPEN);

        VghLantern__ProgressOverlay__IsOpen  =  true;
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Wait Until the Overlay Has Actually Been Painted
    // ------------------------------------------------------------
    // The whole point of the overlay, and the one thing that is easy to get wrong.
    // Adding a class does not put anything on screen: the browser cannot paint until
    // the current task yields, so an overlay opened immediately before several seconds
    // of synchronous work appears only once that work is already finished - which is
    // exactly as useful as not opening it at all.
    //
    // Two animation frames guarantee a paint has happened between the class landing and
    // this resolving. The fade then has to be waited out on top, or the curtain freezes
    // part-drawn at whatever opacity it reached when the main thread seized up.
    //
    // A hidden tab never fires an animation frame, so there it resolves immediately -
    // there is no paint to wait for and no user waiting on it.
    function VghLantern__DocPreview__ProgressOverlay__WaitUntilVisible() {
        if (!VghLantern__ProgressOverlay__IsOpen) return Promise.resolve();
        if (document.hidden) return Promise.resolve();

        return new Promise(function(resolve) {
            window.requestAnimationFrame(function() {
                window.requestAnimationFrame(function() {
                    window.setTimeout(resolve, VghLantern__ProgressOverlay__FadeInMs());
                });
            });
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Which Lantern Is Being Composed
    // ------------------------------------------------------------
    // Shaped to take a SheetBaker progress report directly, so the two do not need a
    // translation step between them.
    function VghLantern__DocPreview__ProgressOverlay__Update(progress) {
        if (!VghLantern__ProgressOverlay__IsOpen || !progress) return;

        var status  =  VghLantern__ProgressOverlay__NeutralStatus();
        if (status) {
            status.textContent  =  VghLantern__ProgressOverlay__Text('StatusPattern')
                .replace('{lantern}', progress.Label || VghLantern__ProgressOverlay__Text('StatusFallbackLabel'));
        }

        if (VghLantern__ProgressOverlay__CountEl) {
            VghLantern__ProgressOverlay__CountEl.textContent  =  VghLantern__ProgressOverlay__Text('CountPattern')
                .replace('{index}', String(progress.Index))
                .replace('{total}', String(progress.Total));
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Close the Overlay, Holding a Result Message Briefly
    // ------------------------------------------------------------
    // The hold exists so a bake that turns out to be quick - every sheet already
    // cached - still reads as having completed, rather than flashing a sheet for two
    // frames and leaving the user wondering what they just saw.
    //
    // Callable by anyone and harmless when nothing is open. A pack is opened by whoever
    // starts the wait - usually mode entry - and closed by whoever finishes it, which is
    // the drawing bake and therefore a different module. Requiring the two to be the
    // same would mean the overlay could not span the whole wait, which is the only
    // shape of it worth having.
    function VghLantern__DocPreview__ProgressOverlay__Close(outcome) {
        if (!VghLantern__ProgressOverlay__IsOpen) return;
        VghLantern__ProgressOverlay__IsOpen  =  false;

        var root  =  VghLantern__ProgressOverlay__Root;
        if (!root) return;

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var status        =  VghLantern__ProgressOverlay__NeutralStatus();
        var isError       =  !!(outcome && outcome.IsError);

        if (status) {
            status.textContent  =  VghLantern__ProgressOverlay__Text(isError ? 'ErrorText' : 'SuccessText');
            status.classList.add(isError ? CSS_STATUS_ERROR : CSS_STATUS_OK);
        }
        if (VghLantern__ProgressOverlay__CountEl) VghLantern__ProgressOverlay__CountEl.textContent  =  '';

        var holdMs  =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            VghLantern__ProgressOverlay__Config(), 'SuccessHoldMs', PROGRESS_LABEL);

        // An error is worth reading, so it is held longer than a success whatever the
        // configured hold is - the config value tunes the happy path, which is the one
        // that runs every time.
        if (isError) holdMs  =  Math.max(2200, holdMs);

        window.clearTimeout(VghLantern__ProgressOverlay__CloseTimer);
        VghLantern__ProgressOverlay__CloseTimer  =  window.setTimeout(function() {
            root.classList.remove(CSS_OVERLAY_OPEN);
        }, holdMs);
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DocPreview__ProgressOverlay__IsWarranted     : VghLantern__DocPreview__ProgressOverlay__IsWarranted,
        VghLantern__DocPreview__ProgressOverlay__Open            : VghLantern__DocPreview__ProgressOverlay__Open,
        VghLantern__DocPreview__ProgressOverlay__WaitUntilVisible : VghLantern__DocPreview__ProgressOverlay__WaitUntilVisible,
        VghLantern__DocPreview__ProgressOverlay__Update          : VghLantern__DocPreview__ProgressOverlay__Update,
        VghLantern__DocPreview__ProgressOverlay__Close           : VghLantern__DocPreview__ProgressOverlay__Close
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DocPreview__ProgressOverlay  =  VghLantern__DocPreview__ProgressOverlay;
