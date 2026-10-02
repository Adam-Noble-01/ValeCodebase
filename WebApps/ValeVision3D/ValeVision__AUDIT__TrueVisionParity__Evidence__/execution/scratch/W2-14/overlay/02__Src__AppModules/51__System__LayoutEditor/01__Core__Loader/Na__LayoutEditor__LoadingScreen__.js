// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - LOADING SCREEN
// =============================================================================
//
// FILE       : Na__LayoutEditor__LoadingScreen__.js
// NAMESPACE  : Na__LeLoadScreen
// MODULE     : Layout Editor - Loading Screen
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The cover over the wait while the Layout Editor loads on first use, sitting where the editor will
// CREATED    : 15-Sep-2026
//
// DESCRIPTION:
// - TRUEVISION'S VEIL, AT THE LOADER'S END. The loading state wears the
//   first-open veil's own classes - .na-le-veil, with the app's spinner, the
//   headline and the status line under it (Na__UiFeature__Styles__
//   LoadingOverlays__.css) - and this app's --boot modifier
//   (Na__LayoutEditor__Styles__Boot__.css): fixed where the editor host
//   will be, below the tab strip, and opaque, because the 3D view is still
//   drawn underneath until the editor hides it. The header and the tab
//   strip stay above it, so the bar's hold and fold are watched over it
//   exactly as TrueVision's are watched over its editor.
// - Shown the moment a sheet tab or a Dev action asks for the editor, whole
//   and at once, so the click answers in the same frame. The loader drops
//   it as soon as its action has run: by then the editor's own first-open
//   veil is up over the same rectangle at full opacity, and the drawing is
//   that veil's to wait for. It fades out as the veil does.
// - IS IT UP? Na__LeLoadScreen__IsShown answers for the mode controller,
//   which hands it to the first-open veil as its immediate option: true only
//   while the loading state is up and not fading, never for the error
//   state, so the editor's veil takes over without a frame of bare stage
//   between the two.
// - A load that fails turns the screen into its error state, which keeps
//   the start-up screen's full-screen look: what went wrong, Reload Page (a
//   module that failed to load stays failed until the page is reloaded) and
//   Back to 3D Model.
// - TRUEVISION'S WORDS. The headline is the first-open veil's, "Your
//   Drawings Are Loading" (its label VeilDrawingsHeadline), so the reader is
//   told the same thing whichever cover is up. The status lines under it
//   are the loader's own two steps, in Title Case.
//
// INTEGRATION:
// - Driven by Na__LayoutEditor__Loader__. Na__LayoutEditor__ModeController__
//   asks Na__LeLoadScreen__IsShown when it calls the first-open veil. Its
//   extra rules live in Na__LayoutEditor__Styles__Boot__.css, which loads
//   with the page.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 15-Sep-2026, v2.45.0), with the loader. No TrueVision
//                   twin: TrueVision's editor loads with the page, behind its own start-up screen.
// - Mirrors       : TrueVision3D's first-open veil (Na__LayoutEditor__LoadingVeil__ 1.1.0, TrueVision3D
//                   v2.83.0, 20-Sep-2026; read at b2aa9151): its headline "Your Drawings Are Loading"
//                   (label VeilDrawingsHeadline), and its look - the .na-le-veil classes, the spinner,
//                   the headline and the status line
// - Ported on     : 01-Oct-2026 for ValeVision3D v2.71.2 (the wording); 02-Oct-2026 for
//                   ValeVision3D v2.71.2 (the veil's look and IsShown)
// - Parity        : new - a permanent ValeVision seam with the loader (DR-24 (a))
// - Divergences   :
//   - The whole module: TrueVision has no loader, so nothing there covers an editor import.
//   - The --boot modifier (Styles__Boot): fixed below the tab strip, opaque, at the editor host's
//     z-index, where TrueVision's going-in veil sits inside the host.
//   - Na__LeLoadScreen__IsShown, read by the mode controller for the first-open veil's immediate
//     option (R6 F.8 C22; Q-COVER part 2).
//   - The error state (Reload Page, Back to 3D Model) keeps the start-up screen's full-screen look.
// - Back-port     : none - with the loader, a permanent ValeVision divergence, not a back-port candidate
//                   (DR-24 (a), D64).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.0.2 (TrueVision's veil look and the hand-over, v2.71.2)
// - THE LOADING STATE IS TRUEVISION'S VEIL. It wears the first-open veil's
//   classes with this app's --boot modifier: fixed below the tab strip where
//   the editor host will be, opaque, under the header and the strip, so the
//   bar's hold and fold are seen over it. Shown whole at the click; faded
//   out as the veil is (320ms).
// - Na__LeLoadScreen__IsShown: true while the loading state is up and not
//   fading, never for the error state. The mode controller hands it to the
//   first-open veil as its immediate option (R6 F.8 C22), so the editor's
//   own veil takes over from this one in the same frame.
// - The error state keeps the start-up screen's full-screen look.
//
// 01-Oct-2026 - Version 1.0.1 (TrueVision's veil wording, v2.71.2)
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

    // MODULE CONSTANTS | Element Id, the Two Looks, Timing and Wording
    // ------------------------------------------------------------
    // The wording cannot come from the editor's config: the screen is up
    // precisely because that config has not loaded yet. So the headline is
    // the veil label's own fallback, word for word; the status lines are the
    // loader's.
    // ------------------------------------------------------------
    const Na__LeLoadScreen__ID           = 'naLayoutEditorLoading';
    const Na__LeLoadScreen__VEIL         = 'na-le-veil na-le-veil--boot';      // <-- The loading state: the first-open veil's look, fixed below the strip (Styles__Boot)
    const Na__LeLoadScreen__VISIBLE      = 'na-le-veil--visible';               // <-- The veil's display class
    const Na__LeLoadScreen__SHOWN        = 'na-le-veil--shown';                 // <-- The veil's opacity class: on means up, and not fading
    const Na__LeLoadScreen__OVERLAY      = 'loading-overlay na-le-loading';     // <-- The error state: the start-up screen's look, plus this screen's own additions
    const Na__LeLoadScreen__HIDDEN       = 'hidden';                            // <-- The start-up screen's fade-out class
    const Na__LeLoadScreen__ERROR        = 'loading-overlay--error';            // <-- The start-up screen's error class (hides the spinner)
    const Na__LeLoadScreen__VEIL_FADE_MS = 320;                                 // <-- .na-le-veil's opacity transition (LoadingOverlays)
    const Na__LeLoadScreen__FADE_MS      = 500;                                 // <-- .loading-overlay's opacity transition
    const Na__LeLoadScreen__TITLE        = 'Your Drawings Are Loading';         // <-- The first-open veil's headline (label VeilDrawingsHeadline; TrueVision's wording, DR-39)
    const Na__LeLoadScreen__ERROR_TITLE  = 'The Layout Editor could not load.';
    const Na__LeLoadScreen__RELOAD       = 'Reload Page';
    const Na__LeLoadScreen__BACK         = 'Back to 3D Model';
    // ------------------------------------------------------------

    // MODULE VARIABLES | The Screen and Its Pending Hide
    // ------------------------------------------------------------
    let Na__LeLoadScreen__Root      = null;
    let Na__LeLoadScreen__HideFrame = 0;       // <-- requestAnimationFrame id of a hide waiting for what is underneath to paint
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
        root.className = Na__LeLoadScreen__VEIL;                                // <-- Each state sets its own look as it is built
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
        root.className = isError ? Na__LeLoadScreen__OVERLAY + ' ' + Na__LeLoadScreen__ERROR : Na__LeLoadScreen__VEIL;   // <-- The veil's look while loading, the start-up screen's for the error
        root.innerHTML = '';

        if (!isError) {
            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner';                              // <-- The app's own spinner, as the veil's is
            const title = document.createElement('p');
            title.className   = 'na-le-veil__text';
            title.textContent = Na__LeLoadScreen__TITLE;
            const status = document.createElement('p');
            status.className = 'na-le-veil__status';
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

    // FUNCTION | Is the Loading State Up? (the mode controller asks, for the first-open veil)
    // ------------------------------------------------------------
    // True while the loading state is on screen and not fading out - the
    // test Na__LeLoadScreen__Show makes before it builds anything - and never
    // for the error state. The mode controller passes it to
    // Na__LeVeil__FirstOpen as its immediate option: the editor's own veil
    // then goes up whole in the same frame, over the same rectangle, and
    // this cover is dropped behind it (R6 F.8 C22).
    // ------------------------------------------------------------
    function Na__LeLoadScreen__IsShown() {
        const root = Na__LeLoadScreen__Root;
        return !!root && root.style.display !== 'none'
            && root.classList.contains(Na__LeLoadScreen__SHOWN)
            && !root.classList.contains(Na__LeLoadScreen__ERROR);
    }
    // ------------------------------------------------------------


    // FUNCTION | Show the Loading State (a second request keeps the screen already up)
    // ------------------------------------------------------------
    // Whole and at once: the click is answered in the same frame, and a
    // cover that faded in would let the 3D view show through it after the
    // 3D furniture has already gone.
    // ------------------------------------------------------------
    function Na__LeLoadScreen__Show() {
        const root    = Na__LeLoadScreen__Ensure();
        const showing = Na__LeLoadScreen__IsShown();
        Na__LeLoadScreen__CancelHide();
        if (showing) return;
        Na__LeLoadScreen__Build(false);
        root.style.display = '';
        root.classList.add(Na__LeLoadScreen__VISIBLE, Na__LeLoadScreen__SHOWN);   // <-- Display and opacity in one frame: no fade in
    }
    // ------------------------------------------------------------


    // FUNCTION | Say Which Step the Load Is On
    // ------------------------------------------------------------
    function Na__LeLoadScreen__SetStatus(text) {
        const root = Na__LeLoadScreen__Root;
        if (!root || root.classList.contains(Na__LeLoadScreen__ERROR)) return;
        const status = root.querySelector('.na-le-veil__status');
        if (status) status.textContent = text || '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Hide Once What Is Underneath Has Painted, Then Fade Out
    // ------------------------------------------------------------
    // immediate: fade now, without waiting for a paint (Back to 3D Model).
    // The loading state fades as the veil does, the error state as the
    // start-up screen does.
    // ------------------------------------------------------------
    function Na__LeLoadScreen__Hide(immediate) {
        const root = Na__LeLoadScreen__Root;
        if (!root || root.style.display === 'none') return;
        Na__LeLoadScreen__CancelHide();
        const isError = root.classList.contains(Na__LeLoadScreen__ERROR);
        const fade = () => {
            Na__LeLoadScreen__HideFrame = 0;
            if (isError) root.classList.add(Na__LeLoadScreen__HIDDEN);
            else root.classList.remove(Na__LeLoadScreen__SHOWN);
            Na__LeLoadScreen__HideTimer = window.setTimeout(() => {
                Na__LeLoadScreen__HideTimer = null;
                root.style.display = 'none';
                root.classList.remove(Na__LeLoadScreen__VISIBLE, Na__LeLoadScreen__HIDDEN, Na__LeLoadScreen__ERROR);
            }, isError ? Na__LeLoadScreen__FADE_MS : Na__LeLoadScreen__VEIL_FADE_MS);
        };
        if (immediate === true) { fade(); return; }
        Na__LeLoadScreen__HideFrame = window.requestAnimationFrame(() => {
            Na__LeLoadScreen__HideFrame = window.requestAnimationFrame(fade);   // <-- Two frames: what is underneath lays out, then paints
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Show the Error State
    // ------------------------------------------------------------
    function Na__LeLoadScreen__ShowError(detail) {
        const root = Na__LeLoadScreen__Ensure();
        Na__LeLoadScreen__CancelHide();
        Na__LeLoadScreen__Build(true, detail);                                  // <-- The start-up screen's full-screen look, appearing at once
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
        Na__LeLoadScreen__IsShown,
        Na__LeLoadScreen__SetStatus,
        Na__LeLoadScreen__Hide,
        Na__LeLoadScreen__ShowError
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
