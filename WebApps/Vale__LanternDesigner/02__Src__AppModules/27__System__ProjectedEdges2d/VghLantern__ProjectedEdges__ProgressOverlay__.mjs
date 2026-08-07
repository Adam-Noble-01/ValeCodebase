/* =============================================================================
   VGHLANTERN - PROJECTED EDGES | PROGRESS OVERLAY
   =============================================================================

   FILE       : VghLantern__ProjectedEdges__ProgressOverlay__.mjs
   NAMESPACE  : VghLantern
   MODULE     : ProjectedEdges - ProgressOverlay
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Show what a running projection is doing, and how far through it is
   CREATED    : 06-Aug-2026

   DESCRIPTION:
   - A render takes several seconds per view and covers three views, so it needs to
     account for itself. Silence would read as a hung application.
   - Modelled on the ValeVision3D layout export overlay, which is the pattern staff
     already recognise as "something is rendering": a semi-transparent white sheet
     with a light blur, a Vale blue ring turning on a pale track, and a status line
     underneath. Success and error states change the status colour rather than the
     shape, so the overlay never jumps.

   ---------------------------------------------------------------------------

   WHY THE OVERLAY COVERS THE WHOLE WINDOW

   The projection runs on the main thread. It yields often enough to keep the
   interface painting, which is exactly what makes a full cover necessary rather
   than optional: without it the sheet looks usable, and a user who edits a
   dimension mid-render invalidates the work they are waiting for.

   ============================================================================= */

import { VghLantern__ProjectedEdges__ConfigAccess__Section } from './VghLantern__ProjectedEdges__ConfigAccess__.mjs';

// =============================================================================
// REGION | Projected Edges Progress Overlay Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Class Names
    // ------------------------------------------------------------
    const CSS_OVERLAY       =  'VghLantern__ProjectedEdges__Overlay';
    const CSS_OVERLAY_OPEN  =  'VghLantern__ProjectedEdges__Overlay--visible';
    const CSS_SPINNER       =  'VghLantern__ProjectedEdges__Overlay__Spinner';
    const CSS_TITLE         =  'VghLantern__ProjectedEdges__Overlay__Title';
    const CSS_STATUS        =  'VghLantern__ProjectedEdges__Overlay__Status';
    const CSS_STATUS_OK     =  'VghLantern__ProjectedEdges__Overlay__Status--success';
    const CSS_STATUS_ERROR  =  'VghLantern__ProjectedEdges__Overlay__Status--error';
    const CSS_COUNT         =  'VghLantern__ProjectedEdges__Overlay__Count';
    // ------------------------------------------------------------


    // MODULE VARIABLES | The One Overlay and Its Parts
    // ------------------------------------------------------------
    let VghLantern__ProjectedEdges__ProgressOverlay__Root        =  null;
    let VghLantern__ProjectedEdges__ProgressOverlay__StatusEl    =  null;
    let VghLantern__ProjectedEdges__ProgressOverlay__CountEl     =  null;
    let VghLantern__ProjectedEdges__ProgressOverlay__CloseTimer  =  0;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Construction
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Overlay Once and Keep It
    // ------------------------------------------------------------
    // Built hidden and left in the document between renders. Rebuilding it each time
    // would restart the CSS transition from a fresh element and make the fade in
    // stutter on the first frame.
    function VghLantern__ProjectedEdges__ProgressOverlay__Ensure() {
        if (VghLantern__ProjectedEdges__ProgressOverlay__Root &&
            VghLantern__ProjectedEdges__ProgressOverlay__Root.isConnected) {
            return VghLantern__ProjectedEdges__ProgressOverlay__Root;
        }

        const progress  =  VghLantern__ProjectedEdges__ConfigAccess__Section('Progress');

        const root  =  document.createElement('div');
        root.className  =  CSS_OVERLAY;
        root.setAttribute('role', 'status');
        root.setAttribute('aria-live', 'polite');

        const spinner  =  document.createElement('div');
        spinner.className  =  CSS_SPINNER;

        const title  =  document.createElement('p');
        title.className    =  CSS_TITLE;
        title.textContent  =  progress.TitleText || 'Projecting 3D linework';

        const status  =  document.createElement('p');
        status.className  =  CSS_STATUS;

        const count  =  document.createElement('p');
        count.className  =  CSS_COUNT;

        root.appendChild(spinner);
        root.appendChild(title);
        root.appendChild(status);
        root.appendChild(count);
        document.body.appendChild(root);

        VghLantern__ProjectedEdges__ProgressOverlay__Root      =  root;
        VghLantern__ProjectedEdges__ProgressOverlay__StatusEl  =  status;
        VghLantern__ProjectedEdges__ProgressOverlay__CountEl   =  count;

        return root;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Reset the Status Line to Its Neutral Style
    // ------------------------------------------------------------
    function VghLantern__ProjectedEdges__ProgressOverlay__NeutralStatus() {
        const status  =  VghLantern__ProjectedEdges__ProgressOverlay__StatusEl;
        if (!status) return null;

        status.classList.remove(CSS_STATUS_OK, CSS_STATUS_ERROR);
        return status;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Lifecycle
// -----------------------------------------------------------------------------

    // FUNCTION | Show the Overlay at the Start of a Render
    // ------------------------------------------------------------
    export function VghLantern__ProjectedEdges__ProgressOverlay__Open() {
        if (VghLantern__ProjectedEdges__ConfigAccess__Section('Progress').ShowOverlay !== true) return;

        window.clearTimeout(VghLantern__ProjectedEdges__ProgressOverlay__CloseTimer);

        const root  =  VghLantern__ProjectedEdges__ProgressOverlay__Ensure();
        VghLantern__ProjectedEdges__ProgressOverlay__NeutralStatus();

        if (VghLantern__ProjectedEdges__ProgressOverlay__StatusEl) VghLantern__ProjectedEdges__ProgressOverlay__StatusEl.textContent = '';
        if (VghLantern__ProjectedEdges__ProgressOverlay__CountEl)  VghLantern__ProjectedEdges__ProgressOverlay__CountEl.textContent  = '';

        // Read back a layout value between adding the element and adding the class,
        // so the browser has a painted "hidden" state to transition away from.
        void root.offsetWidth;
        root.classList.add(CSS_OVERLAY_OPEN);
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Which View and Phase Is Running
    // ------------------------------------------------------------
    // The phase strings come from three-edge-projection itself. They are shown as
    // received rather than translated, because when a render feels stuck the exact
    // library phase is the useful thing to be looking at.
    export function VghLantern__ProjectedEdges__ProgressOverlay__Update(progress) {
        const status  =  VghLantern__ProjectedEdges__ProgressOverlay__NeutralStatus();
        if (!status || !progress) return;

        status.textContent  =  progress.Phase
            ? (progress.ViewLabel + ' - ' + progress.Phase.toLowerCase())
            : progress.ViewLabel;

        if (VghLantern__ProjectedEdges__ProgressOverlay__CountEl) {
            VghLantern__ProjectedEdges__ProgressOverlay__CountEl.textContent  =
                'View ' + progress.Index + ' of ' + progress.Total;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Close the Overlay, Holding a Result Message Briefly
    // ------------------------------------------------------------
    // The hold exists so a fast render - every view already cached - still reads as
    // having done something, rather than flashing an overlay for two frames.
    export function VghLantern__ProjectedEdges__ProgressOverlay__Close(outcome) {
        const root  =  VghLantern__ProjectedEdges__ProgressOverlay__Root;
        if (!root) return;

        const progress  =  VghLantern__ProjectedEdges__ConfigAccess__Section('Progress');
        const status    =  VghLantern__ProjectedEdges__ProgressOverlay__NeutralStatus();
        const isError   =  outcome && outcome.IsError === true;

        if (status) {
            status.textContent  =  isError
                ? (progress.ErrorText   || 'Projection failed - see the console for details')
                : (progress.SuccessText || 'Linework ready');
            status.classList.add(isError ? CSS_STATUS_ERROR : CSS_STATUS_OK);
        }
        if (VghLantern__ProjectedEdges__ProgressOverlay__CountEl) {
            VghLantern__ProjectedEdges__ProgressOverlay__CountEl.textContent  =  '';
        }

        const holdMs  =  isError
            ? Math.max(2200, progress.SuccessHoldMs || 0)                     // <-- An error is worth reading
            : ((typeof progress.SuccessHoldMs === 'number') ? progress.SuccessHoldMs : 900);

        window.clearTimeout(VghLantern__ProjectedEdges__ProgressOverlay__CloseTimer);
        VghLantern__ProjectedEdges__ProgressOverlay__CloseTimer  =  window.setTimeout(function() {
            root.classList.remove(CSS_OVERLAY_OPEN);
        }, holdMs);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
