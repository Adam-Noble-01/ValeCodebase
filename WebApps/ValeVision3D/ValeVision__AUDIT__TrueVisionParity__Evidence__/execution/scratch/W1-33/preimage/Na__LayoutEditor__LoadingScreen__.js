// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - LOADING SCREEN
// =============================================================================
//
// FILE       : Na__LayoutEditor__LoadingScreen__.js
// NAMESPACE  : Na__LeLoadScreen
// MODULE     : Layout Editor - Loading Screen
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The full-screen wait while the Layout Editor loads on first use
// CREATED    : 15-Sep-2026
//
// DESCRIPTION:
// - The ValeVision start-up screen again: the same white overlay, the same
//   Vale blue spinner and the same title type, built from the start-up
//   screen's own classes (Na__UiFeature__Styles__LoadingOverlays__.css) so
//   the two cannot drift apart. A status line under the title says which
//   step the load is on.
// - Shown the moment a sheet tab or a Dev action asks for the editor, so the
//   click answers at once. Hidden two frames after the caller has opened the
//   sheet, so the fade reveals a painted sheet rather than an empty stage,
//   and it fades out exactly as the start-up screen does.
// - A load that fails turns the screen into its error state: what went
//   wrong, Reload Page (a module that failed to load stays failed until the
//   page is reloaded) and Back to 3D Model.
// - TRUEVISION'S WORDS. The title is the headline of TrueVision's first-open
//   veil, "Your Drawings Are Loading" (its label VeilDrawingsHeadline), so the
//   reader is told the same thing whichever cover is up. The status lines
//   under it are the loader's.
//
// INTEGRATION:
// - Driven by Na__LayoutEditor__Loader__ only. Its extra rules live in
//   Na__LayoutEditor__Styles__Boot__.css, which loads with the page.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 15-Sep-2026, v2.45.0), with the loader. No TrueVision
//                   twin: TrueVision's editor loads with the page, behind its own start-up screen.
// - Mirrors       : the headline of TrueVision3D's first-open veil, "Your Drawings Are Loading"
//                   (Na__LayoutEditor__LoadingVeil__ 1.1.0, label VeilDrawingsHeadline, TrueVision3D
//                   v2.83.0, 20-Sep-2026; read at b2aa9151)
// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-31}} (the wording)
// - Parity        : new - a permanent ValeVision seam with the loader (DR-24 (a))
// - Divergences   : n/a (no TrueVision twin)
// - Back-port     : none - with the loader, a permanent ValeVision divergence, not a back-port candidate
//                   (DR-24 (a), D64).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.1 (TrueVision's veil wording, {{VVREL:W1-31}})
// - THE TITLE IS TRUEVISION'S. "Loading Layout Editor..." becomes "Your
//   Drawings Are Loading", the headline of TrueVision's first-open veil (its
//   label VeilDrawingsHeadline), as DR-39 asks. The screen's look, its status
//   lines and its error state are unchanged.
//
// 15-Sep-2026 - Version 1.0.0
// - Initial implementation.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Element Id, Start-Up Screen Classes, Timing and Wording
    // ------------------------------------------------------------
    // The wording cannot come from the editor's config: the screen is up
    // precisely because that config has not loaded yet. So the title is the
    // veil label's own fallback, word for word, and the loader reads the
    // drawing count's label from the config once it is there.
    // ------------------------------------------------------------
    const Na__LeLoadScreen__ID          = 'naLayoutEditorLoading';
    const Na__LeLoadScreen__HIDDEN      = 'hidden';                           // <-- The start-up screen's fade-out class
    const Na__LeLoadScreen__ERROR       = 'loading-overlay--error';           // <-- The start-up screen's error class (hides the spinner)
    const Na__LeLoadScreen__FADE_MS     = 500;                                // <-- .loading-overlay's opacity transition
    const Na__LeLoadScreen__TITLE       = 'Your Drawings Are Loading';        // <-- The first-open veil's headline (label VeilDrawingsHeadline; TrueVision's wording, DR-39)
    const Na__LeLoadScreen__ERROR_TITLE = 'The Layout Editor could not load.';
    const Na__LeLoadScreen__RELOAD      = 'Reload Page';
    const Na__LeLoadScreen__BACK        = 'Back to 3D Model';
    // ------------------------------------------------------------

    // MODULE VARIABLES | The Screen and Its Pending Hide
    // ------------------------------------------------------------
    let Na__LeLoadScreen__Root      = null;
    let Na__LeLoadScreen__HideFrame = 0;       // <-- requestAnimationFrame id of a hide waiting for the sheet's first paint
    let Na__LeLoadScreen__HideTimer = null;    // <-- The fade, before display none
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Building
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Screen Element, Created on First Use
    // ------------------------------------------------------------
    function Na__LeLoadScreen__Ensure() {
        if (Na__LeLoadScreen__Root && document.body.contains(Na__LeLoadScreen__Root)) return Na__LeLoadScreen__Root;
        const root = document.createElement('div');
        root.id        = Na__LeLoadScreen__ID;
        root.className = 'loading-overlay na-le-loading';                       // <-- The start-up screen's look, plus this screen's own additions
        root.setAttribute('role', 'status');
        root.setAttribute('aria-live', 'polite');
        root.style.display = 'none';
        document.body.appendChild(root);
        Na__LeLoadScreen__Root = root;
        return root;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Button of the Error State
    // ------------------------------------------------------------
    function Na__LeLoadScreen__Button(text, modifierClass, onClick) {
        const button = document.createElement('button');
        button.type        = 'button';
        button.className   = 'loading-error-retry-btn' + (modifierClass ? ' ' + modifierClass : '');
        button.textContent = text;
        button.addEventListener('click', onClick);
        return button;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fill the Screen for the Loading State or the Error State
    // ------------------------------------------------------------
    function Na__LeLoadScreen__Build(isError, detail) {
        const root = Na__LeLoadScreen__Root;
        root.classList.toggle(Na__LeLoadScreen__ERROR, isError);
        root.innerHTML = '';

        if (!isError) {
            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner';
            const title = document.createElement('p');
            title.className   = 'loading-text';
            title.textContent = Na__LeLoadScreen__TITLE;
            const status = document.createElement('p');
            status.className = 'na-le-loading__status';
            root.append(spinner, title, status);
            return;
        }

        const message = document.createElement('p');
        message.className   = 'loading-error-message';
        message.textContent = Na__LeLoadScreen__ERROR_TITLE;
        const reason = document.createElement('p');
        reason.className   = 'na-le-loading__detail';
        reason.textContent = detail || '';
        const actions = document.createElement('div');
        actions.className = 'na-le-loading__actions';
        actions.append(
            Na__LeLoadScreen__Button(Na__LeLoadScreen__RELOAD, '', () => window.location.reload()),
            Na__LeLoadScreen__Button(Na__LeLoadScreen__BACK, 'na-le-loading__button--secondary', () => Na__LeLoadScreen__Hide(true))
        );
        root.append(message, reason, actions);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Cancel a Hide Still Waiting for Its Frames or Fading
    // ------------------------------------------------------------
    function Na__LeLoadScreen__CancelHide() {
        if (Na__LeLoadScreen__HideFrame) { window.cancelAnimationFrame(Na__LeLoadScreen__HideFrame); Na__LeLoadScreen__HideFrame = 0; }
        if (Na__LeLoadScreen__HideTimer) { window.clearTimeout(Na__LeLoadScreen__HideTimer); Na__LeLoadScreen__HideTimer = null; }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Show the Loading State (a second request keeps the screen already up)
    // ------------------------------------------------------------
    function Na__LeLoadScreen__Show() {
        const root    = Na__LeLoadScreen__Ensure();
        const showing = root.style.display !== 'none' && !root.classList.contains(Na__LeLoadScreen__HIDDEN);
        Na__LeLoadScreen__CancelHide();
        if (showing && !root.classList.contains(Na__LeLoadScreen__ERROR)) return;
        Na__LeLoadScreen__Build(false);
        root.classList.remove(Na__LeLoadScreen__HIDDEN);
        root.style.display = '';                                                // <-- Back to the stylesheet's flex
    }
    // ------------------------------------------------------------


    // FUNCTION | Say Which Step the Load Is On
    // ------------------------------------------------------------
    function Na__LeLoadScreen__SetStatus(text) {
        const root = Na__LeLoadScreen__Root;
        if (!root || root.classList.contains(Na__LeLoadScreen__ERROR)) return;
        const status = root.querySelector('.na-le-loading__status');
        if (status) status.textContent = text || '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Hide Once What Is Underneath Has Painted, Then Fade Out
    // ------------------------------------------------------------
    // immediate: fade now, without waiting for a paint (Back to 3D Model).
    // ------------------------------------------------------------
    function Na__LeLoadScreen__Hide(immediate) {
        const root = Na__LeLoadScreen__Root;
        if (!root || root.style.display === 'none') return;
        Na__LeLoadScreen__CancelHide();
        const fade = () => {
            Na__LeLoadScreen__HideFrame = 0;
            root.classList.add(Na__LeLoadScreen__HIDDEN);
            Na__LeLoadScreen__HideTimer = window.setTimeout(() => {
                Na__LeLoadScreen__HideTimer = null;
                root.style.display = 'none';
                root.classList.remove(Na__LeLoadScreen__ERROR);
            }, Na__LeLoadScreen__FADE_MS);
        };
        if (immediate === true) { fade(); return; }
        Na__LeLoadScreen__HideFrame = window.requestAnimationFrame(() => {
            Na__LeLoadScreen__HideFrame = window.requestAnimationFrame(fade);   // <-- Two frames: the sheet's layout, then its first paint
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Show the Error State
    // ------------------------------------------------------------
    function Na__LeLoadScreen__ShowError(detail) {
        const root = Na__LeLoadScreen__Ensure();
        Na__LeLoadScreen__CancelHide();
        Na__LeLoadScreen__Build(true, detail);
        root.classList.remove(Na__LeLoadScreen__HIDDEN);
        root.style.display = '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor Loading Screen API
    // ------------------------------------------------------------
    export {
        Na__LeLoadScreen__Show,
        Na__LeLoadScreen__SetStatus,
        Na__LeLoadScreen__Hide,
        Na__LeLoadScreen__ShowError
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
