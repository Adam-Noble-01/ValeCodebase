// =============================================================================
// WHITECARDOPEDIA - APP LINK CAPTURE - CHROMIUM OPT-IN TOOLTIP
// =============================================================================
//
// FILE       : Whitecardopedia__AppLinkCapture__OptInTooltip__.js
// NAMESPACE  : Whitecardopedia
// MODULE     : Whitecardopedia__AppLinkCapture__OptInTooltip
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Teach Chromium-desktop users how to enable Always-Open-In-App
// CREATED    : 2026
//
// DESCRIPTION:
// - Shows a small, dismissible tooltip card that points the user at the
//   Chrome / Edge address-bar "Open in app" toggle when they land on the
//   handover page in a regular browser tab AFTER having installed the PWA.
// - Only renders on Chromium desktop platforms (where the toggle exists).
// - Persists a "shown" flag through Whitecardopedia__Pwa__SessionState so
//   the user only sees it once per snooze cycle.
// - Self-contained: builds its own DOM nodes and listens for its own
//   dismiss click; no React or framework dependency.
//
// =============================================================================

(function () {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Storage Keys and CSS Classes
    // ------------------------------------------------------------
    const OPTIN_TOOLTIP_PLATFORM_TOKEN  = 'app-link-capture-optin';                                                                 // <-- SessionState platform token
    const OPTIN_TOOLTIP_ROOT_ID         = 'Whitecardopedia__AppLinkCapture__OptInTooltip__Root';                                    // <-- DOM id of tooltip root
    const OPTIN_TOOLTIP_CLASS_ROOT      = 'walc-optin';                                                                             // <-- Root container class
    const OPTIN_TOOLTIP_CLASS_VISIBLE   = 'walc-optin--visible';                                                                    // <-- Visible state modifier
    const OPTIN_TOOLTIP_CLASS_BODY      = 'walc-optin__body';                                                                       // <-- Body block class
    const OPTIN_TOOLTIP_CLASS_TITLE     = 'walc-optin__title';                                                                      // <-- Title text class
    const OPTIN_TOOLTIP_CLASS_TEXT      = 'walc-optin__text';                                                                       // <-- Body text class
    const OPTIN_TOOLTIP_CLASS_ACTIONS   = 'walc-optin__actions';                                                                    // <-- Actions container class
    const OPTIN_TOOLTIP_CLASS_DISMISS   = 'walc-optin__dismiss';                                                                    // <-- Dismiss button class
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve Active Platform Descriptor
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__OptInTooltip__GetPlatformDescriptor() {
        const detector          = (typeof window !== 'undefined') ? window.Whitecardopedia__Pwa__PlatformDetector : null;           // <-- Resolve platform detector
        if (!detector || typeof detector.getPlatformDescriptor !== 'function') return null;                                         // <-- Detector not loaded
        return detector.getPlatformDescriptor();                                                                                    // <-- Build descriptor snapshot
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Determine Whether Tooltip Should Render
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__OptInTooltip__ShouldShow(descriptor) {
        if (!descriptor) return false;                                                                                              // <-- No descriptor -> bail
        if (descriptor.isStandalone) return false;                                                                                  // <-- Already in PWA -> nothing to teach

        const platformDetector  = (typeof window !== 'undefined') ? window.Whitecardopedia__Pwa__PlatformDetector : null;           // <-- Resolve detector
        const PlatformIds       = (platformDetector && platformDetector.PlatformIds) || {};                                         // <-- Token map

        const eligiblePlatforms = [                                                                                                 // <-- Only desktop Chromium has the toggle
            PlatformIds.ChromiumDesktopWindows,
            PlatformIds.ChromiumDesktopMac,
            PlatformIds.ChromiumDesktopLinux
        ];

        return eligiblePlatforms.indexOf(descriptor.platformId) !== -1;                                                             // <-- Restrict to desktop Chromium
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Check Suppression State Through SessionState
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__OptInTooltip__IsSuppressed() {
        const sessionState      = (typeof window !== 'undefined') ? window.Whitecardopedia__Pwa__SessionState : null;               // <-- Resolve session state helper
        if (!sessionState || typeof sessionState.isSuppressed !== 'function') return false;                                         // <-- No tracking available
        return Boolean(sessionState.isSuppressed(OPTIN_TOOLTIP_PLATFORM_TOKEN));                                                    // <-- Snooze ladder check
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Record Tooltip Dismissal
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__OptInTooltip__RecordDismissal() {
        const sessionState      = (typeof window !== 'undefined') ? window.Whitecardopedia__Pwa__SessionState : null;               // <-- Resolve session state helper
        if (!sessionState || typeof sessionState.recordDismissal !== 'function') return;                                            // <-- Nothing to persist
        sessionState.recordDismissal(OPTIN_TOOLTIP_PLATFORM_TOKEN);                                                                 // <-- Advance snooze ladder
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Create DOM Element with Class and Text
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__OptInTooltip__CreateElement(tagName, className, textContent) {
        const elementInstance   = document.createElement(tagName);                                                                  // <-- Create element
        if (className) elementInstance.className = className;                                                                       // <-- Apply class names
        if (textContent !== undefined && textContent !== null) elementInstance.textContent = textContent;                           // <-- Apply text
        return elementInstance;                                                                                                     // <-- Return element
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Render Opt-In Tooltip Inside Container
    // ------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__OptInTooltip__Render(containerElement) {
        if (typeof document === 'undefined' || !containerElement) return false;                                                     // <-- Guard non-DOM contexts
        if (Whitecardopedia__AppLinkCapture__OptInTooltip__IsSuppressed()) return false;                                            // <-- Snooze still active

        const descriptor        = Whitecardopedia__AppLinkCapture__OptInTooltip__GetPlatformDescriptor();                           // <-- Active platform descriptor
        if (!Whitecardopedia__AppLinkCapture__OptInTooltip__ShouldShow(descriptor)) return false;                                   // <-- Not eligible

        const existingRoot      = document.getElementById(OPTIN_TOOLTIP_ROOT_ID);                                                   // <-- Avoid duplicates
        if (existingRoot) return true;                                                                                              // <-- Already rendered

        const rootElement       = Whitecardopedia__AppLinkCapture__OptInTooltip__CreateElement('aside', OPTIN_TOOLTIP_CLASS_ROOT);  // <-- Root wrapper
        rootElement.id          = OPTIN_TOOLTIP_ROOT_ID;                                                                            // <-- Stable id

        const bodyBlock         = Whitecardopedia__AppLinkCapture__OptInTooltip__CreateElement('div', OPTIN_TOOLTIP_CLASS_BODY);    // <-- Body block

        bodyBlock.appendChild(Whitecardopedia__AppLinkCapture__OptInTooltip__CreateElement(
            'p',
            OPTIN_TOOLTIP_CLASS_TITLE,
            'Open these links straight in the app next time'
        ));

        bodyBlock.appendChild(Whitecardopedia__AppLinkCapture__OptInTooltip__CreateElement(
            'p',
            OPTIN_TOOLTIP_CLASS_TEXT,
            "Click the small 'Open in app' icon at the right of the address bar, then choose 'Always open in app'. Future ValeVision 3D links will then launch the app directly."
        ));

        const actionsBlock      = Whitecardopedia__AppLinkCapture__OptInTooltip__CreateElement('div', OPTIN_TOOLTIP_CLASS_ACTIONS); // <-- Actions row
        const dismissButton     = Whitecardopedia__AppLinkCapture__OptInTooltip__CreateElement('button', OPTIN_TOOLTIP_CLASS_DISMISS, 'Got it');  // <-- Dismiss button
        dismissButton.setAttribute('type', 'button');                                                                               // <-- Prevent form submit

        dismissButton.addEventListener('click', function Whitecardopedia__AppLinkCapture__OptInTooltip__OnDismissClick() {
            Whitecardopedia__AppLinkCapture__OptInTooltip__RecordDismissal();                                                       // <-- Snooze advance
            if (rootElement.parentNode) rootElement.parentNode.removeChild(rootElement);                                            // <-- Remove from DOM
        });
        actionsBlock.appendChild(dismissButton);                                                                                    // <-- Mount button

        rootElement.appendChild(bodyBlock);                                                                                         // <-- Mount body
        rootElement.appendChild(actionsBlock);                                                                                      // <-- Mount actions

        containerElement.appendChild(rootElement);                                                                                  // <-- Mount in supplied container

        requestAnimationFrame(() => rootElement.classList.add(OPTIN_TOOLTIP_CLASS_VISIBLE));                                        // <-- Trigger visible transition
        return true;                                                                                                                // <-- Indicate rendered
    }
    // ---------------------------------------------------------------


    // FUNCTION | Force-Reset Suppression (Diagnostic)
    // ------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__OptInTooltip__Reset() {
        const sessionState      = (typeof window !== 'undefined') ? window.Whitecardopedia__Pwa__SessionState : null;               // <-- Resolve session state helper
        if (sessionState && typeof sessionState.resetPlatform === 'function') {
            sessionState.resetPlatform(OPTIN_TOOLTIP_PLATFORM_TOKEN);                                                               // <-- Wipe stored snooze
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Exposure
// -----------------------------------------------------------------------------

    if (typeof window !== 'undefined') {
        window.Whitecardopedia__AppLinkCapture__OptInTooltip = {                                                                    // <-- Public API surface
            render : Whitecardopedia__AppLinkCapture__OptInTooltip__Render,
            reset  : Whitecardopedia__AppLinkCapture__OptInTooltip__Reset
        };
    }

// endregion -------------------------------------------------------------------

})();
