// =============================================================================
// VALEVISION3D - APP UTILS - LOADING OVERLAY CONTROLLER
// =============================================================================
//
// FILE       : Na__AppUtils__LoadingOverlay__.js
// NAMESPACE  : Na__AppUtils
// MODULE     : LoadingOverlay
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Shared controller for the full-screen spinner overlay used while
//              a long render runs
// CREATED    : 13-Aug-2026
//
// DESCRIPTION:
// - Drives #naLayoutLoadingOverlay: shows the spinner, updates the status line
//   underneath it as work progresses, and dismisses with a success or error
//   message after a hold.
// - Extracted verbatim from Na__UiFeature__ImageExport__Controls.js, which had
//   it as a private sub-function.  Image export and Video Studio now share one
//   implementation, so a long render looks and behaves the same whichever
//   produced it.
//
// OPAQUE MODE:
// - The overlay is normally 92% white with a backdrop blur, which is fine over
//   a static viewport.  A video export resizes the live renderer to the export
//   resolution and paints hundreds of frames through it, and the remaining 8%
//   shows that as a flicker.  Opaque mode drops the transparency and the blur
//   so nothing of the working canvas is visible at all.
//
// INTEGRATION:
// - The markup lives in index.html and is not created here.
// - actionButton is optional; when given it gets the is-loading class for the
//   duration so the button that started the work reads as busy.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 13-Aug-2026 - Version 1.0.0
// - Initial extraction so Video Studio can reuse the image export overlay.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Overlay DOM Ids and Class Names
    // ------------------------------------------------------------
    const Na__LoadOverlay__ContainerId = 'naLayoutLoadingOverlay';
    const Na__LoadOverlay__StatusId    = 'naLayoutLoadingStatus';

    const Na__LoadOverlay__ClassVisible = 'na-layout-loading-overlay--visible';
    const Na__LoadOverlay__ClassFadeOut = 'na-layout-loading-overlay--fade-out';
    const Na__LoadOverlay__ClassOpaque  = 'na-layout-loading-overlay--opaque';
    const Na__LoadOverlay__ClassSuccess = 'na-layout-loading-overlay__status--success';
    const Na__LoadOverlay__ClassError   = 'na-layout-loading-overlay__status--error';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Timing
    // ------------------------------------------------------------
    const Na__LoadOverlay__FadeMs = 400;   // <-- Must match the CSS opacity transition
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Create a Loading Overlay Controller
    // ------------------------------------------------------------
    // options:
    //   actionButton {HTMLElement|null}  Gets is-loading while work runs
    //   opaque       {boolean}           Hide everything behind the overlay
    //
    // Returns { show, setStatus, dismiss, hideImmediately }.
    // ------------------------------------------------------------
    function Na__AppUtils__LoadingOverlay__Create(options = {}) {
        const { actionButton = null, opaque = false } = options;

        const loadingOverlay = document.getElementById(Na__LoadOverlay__ContainerId);
        const loadingStatus  = document.getElementById(Na__LoadOverlay__StatusId);

        return {

            // FUNCTION | Show the Overlay with an Initial Message
            // ------------------------------------------------------------
            show(text) {
                if (actionButton) actionButton.classList.add('is-loading');           // <-- Dim the button

                if (loadingOverlay && loadingStatus) {
                    loadingStatus.textContent = text;                                 // <-- Initial message
                    loadingStatus.classList.remove(Na__LoadOverlay__ClassSuccess);    // <-- Reset success state
                    loadingStatus.classList.remove(Na__LoadOverlay__ClassError);      // <-- Reset error state
                    loadingOverlay.classList.remove(Na__LoadOverlay__ClassFadeOut);   // <-- Reset fade-out
                    loadingOverlay.classList.toggle(Na__LoadOverlay__ClassOpaque, !!opaque);
                    loadingOverlay.classList.add(Na__LoadOverlay__ClassVisible);      // <-- Show overlay
                }
            },
            // ------------------------------------------------------------


            // FUNCTION | Update the Status Line Under the Spinner
            // ------------------------------------------------------------
            setStatus(text) {
                if (loadingStatus) loadingStatus.textContent = text;                  // <-- Live progress message
            },
            // ------------------------------------------------------------


            // FUNCTION | Show a Final Message, Then Fade Out
            // ------------------------------------------------------------
            dismiss(text, isError, holdMs, onDone) {
                if (loadingStatus) {
                    loadingStatus.textContent = text;                                 // <-- Final message
                    loadingStatus.classList.add(isError
                        ? Na__LoadOverlay__ClassError                                 // <-- Red text on failure
                        : Na__LoadOverlay__ClassSuccess);                             // <-- Green text on success
                }

                setTimeout(() => {
                    if (loadingOverlay) {
                        loadingOverlay.classList.add(Na__LoadOverlay__ClassFadeOut);   // <-- Start fade-out
                        setTimeout(() => {
                            loadingOverlay.classList.remove(Na__LoadOverlay__ClassVisible);
                            loadingOverlay.classList.remove(Na__LoadOverlay__ClassFadeOut);
                            loadingOverlay.classList.remove(Na__LoadOverlay__ClassOpaque);
                        }, Na__LoadOverlay__FadeMs);
                    }
                    if (actionButton) actionButton.classList.remove('is-loading');     // <-- Re-enable button
                    if (typeof onDone === 'function') onDone();                        // <-- Unlock caller state
                }, holdMs);
            },
            // ------------------------------------------------------------


            // FUNCTION | Drop the Overlay at Once, With No Message or Fade
            // ------------------------------------------------------------
            // For teardown paths that must not leave the overlay stuck on.
            // ------------------------------------------------------------
            hideImmediately() {
                if (loadingOverlay) {
                    loadingOverlay.classList.remove(Na__LoadOverlay__ClassVisible);
                    loadingOverlay.classList.remove(Na__LoadOverlay__ClassFadeOut);
                    loadingOverlay.classList.remove(Na__LoadOverlay__ClassOpaque);
                }
                if (actionButton) actionButton.classList.remove('is-loading');
            }
            // ------------------------------------------------------------
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Loading Overlay API
    // ------------------------------------------------------------
    export {
        Na__AppUtils__LoadingOverlay__Create
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
