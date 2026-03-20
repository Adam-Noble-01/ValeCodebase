// =============================================================================
// VALEVISION3D - FEATURE - FULL SCREEN MODE - UI INTERACTION
// =============================================================================
//
// FILE       : Na__Feature__FullScreenMode__UiInteractionLogic__.js
// NAMESPACE  : Na__Feature__FullScreenMode
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Capture UI events and pass fullscreen state into app callbacks
// CREATED    : 20-Mar-2026
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import {
        Na__Feature__FullScreenMode__IsBrowserSupported,
        Na__Feature__FullScreenMode__IsFullScreenActive,
        Na__Feature__FullScreenMode__EnterFullScreen,
        Na__Feature__FullScreenMode__ExitFullScreen,
        Na__Feature__FullScreenMode__AddChangeListener
    } from './Na__Feature__FullScreenMode__BrowserSupportLogic__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | UI State Synchronisation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Apply Fullscreen Button Visual State
    // ------------------------------------------------------------
    function Na__Feature__FullScreenMode__ApplyButtonState(menuItem, menuButton, menuLabel, isFullScreenActive) {
        if (!menuButton || !menuLabel) return;

        const isActive = Boolean(isFullScreenActive);
        menuLabel.textContent = isActive ? 'Exit Full Screen' : 'Enter Full Screen';
        menuButton.setAttribute('aria-pressed', isActive ? 'true' : 'false');

        if (menuItem) {
            menuItem.classList.toggle('is-full-screen-active', isActive);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialise Feature
// -----------------------------------------------------------------------------

    // FUNCTION | Initialise Full Screen Menu Interaction
    // ------------------------------------------------------------
    function Na__Feature__FullScreenMode__Initialize(options = {}) {
        const showToast = typeof options.showToast === 'function' ? options.showToast : () => {};
        const onToggleRequested = typeof options.onToggleRequested === 'function' ? options.onToggleRequested : () => {};
        const onStateChanged = typeof options.onStateChanged === 'function' ? options.onStateChanged : () => {};
        const targetElement = options.targetElement || document.documentElement;

        const menuItem = document.getElementById('naFullScreenMenuItem');
        const menuButton = document.getElementById('naFullScreenMenuButton');
        const menuLabel = document.getElementById('naFullScreenMenuLabel');

        if (!menuButton || !menuLabel) {
            console.warn('[ValeVision3D] Full screen: menu button not found');
            return;
        }

        if (!Na__Feature__FullScreenMode__IsBrowserSupported()) {
            menuButton.disabled = true;
            menuButton.setAttribute('aria-disabled', 'true');
            menuLabel.textContent = 'Full Screen Unsupported';
            if (menuItem) {
                menuItem.classList.add('is-full-screen-unsupported');
            }
            return;
        }

        Na__Feature__FullScreenMode__ApplyButtonState(
            menuItem,
            menuButton,
            menuLabel,
            Na__Feature__FullScreenMode__IsFullScreenActive()
        );

        const Na__FullScreenMode__HandleBrowserChange = () => {
            const isActive = Na__Feature__FullScreenMode__IsFullScreenActive();
            Na__Feature__FullScreenMode__ApplyButtonState(menuItem, menuButton, menuLabel, isActive);
            onStateChanged(isActive);
        };

        Na__Feature__FullScreenMode__AddChangeListener(Na__FullScreenMode__HandleBrowserChange);

        menuButton.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();

            const isCurrentlyActive = Na__Feature__FullScreenMode__IsFullScreenActive();
            const requestedState = !isCurrentlyActive;
            onToggleRequested(requestedState);

            try {
                if (requestedState) {
                    await Na__Feature__FullScreenMode__EnterFullScreen(targetElement);
                } else {
                    await Na__Feature__FullScreenMode__ExitFullScreen();
                }
            } catch (error) {
                console.warn('[ValeVision3D] Full screen action failed', error);
                showToast('Unable to toggle full screen mode in this browser.', true);
                Na__Feature__FullScreenMode__ApplyButtonState(
                    menuItem,
                    menuButton,
                    menuLabel,
                    Na__Feature__FullScreenMode__IsFullScreenActive()
                );
            }
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Feature__FullScreenMode__Initialize
    };

// endregion -------------------------------------------------------------------
