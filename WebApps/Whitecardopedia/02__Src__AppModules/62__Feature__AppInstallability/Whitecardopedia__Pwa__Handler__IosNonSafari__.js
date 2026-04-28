// =============================================================================
// WHITECARDOPEDIA - PWA HANDLER (IOS NON-SAFARI BROWSERS)
// =============================================================================
//
// FILE       : Whitecardopedia__Pwa__Handler__IosNonSafari__.js
// NAMESPACE  : Whitecardopedia
// MODULE     : Whitecardopedia__Pwa__Handler__IosNonSafari
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Redirect iOS Chrome / Edge / Firefox users to Safari for install
// CREATED    : 2026
//
// DESCRIPTION:
// - Every browser on iOS / iPadOS is forced to use WebKit, but only Safari
//   exposes the Add to Home Screen entry. This handler informs the user
//   that they must reopen the page in Safari and offers a "Copy link"
//   action since iOS does not provide an x-safari-https deep link that
//   third-party browsers are guaranteed to honour.
//
// =============================================================================

(function () {

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Active Platform Context
    // ------------------------------------------------------------
    let Whitecardopedia__Pwa__Handler__IosNonSafari__PlatformIdContext  = '';                                                       // <-- Active platform identifier
    let Whitecardopedia__Pwa__Handler__IosNonSafari__SuppressShow       = false;                                                    // <-- Suppress flag from controller
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build Prompt Configuration
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__IosNonSafari__BuildPromptConfig() {
        const urlHelper         = window.Whitecardopedia__Pwa__Url || null;                                                         // <-- Resolve URL helper
        const iconUrl           = urlHelper && urlHelper.buildPwaModuleUrl                                                          // <-- Use 192 PNG as visual cue
            ? urlHelper.buildPwaModuleUrl('Na__AppInstallability__Icon__192x192.png')
            : null;

        const stepEntries       = [                                                                                                 // <-- Two-step browser swap
            'Copy this page link using the button below.',
            'Open Safari, paste the link in the address bar and load the page.',
            'In Safari, tap Share and choose "Add to Home Screen".'
        ];

        return {
            variant              : 'sheet',                                                                                         // <-- Centred sheet
            iconUrl              : iconUrl,
            title                : 'Use Safari to install',
            body                 : 'Only Safari can install web apps on iPhone and iPad. Copy the link below and open it in Safari to install ValeVision 3D.',
            steps                : stepEntries,
            primaryActionLabel   : 'Copy link',
            secondaryActionLabel : 'Got it',
            onPrimary            : Whitecardopedia__Pwa__Handler__IosNonSafari__CopyPageLink,
            onDismiss            : Whitecardopedia__Pwa__Handler__IosNonSafari__OnDismiss
        };
    }
    // ---------------------------------------------------------------


    // FUNCTION | Copy Page Link to Clipboard
    // ------------------------------------------------------------
    async function Whitecardopedia__Pwa__Handler__IosNonSafari__CopyPageLink() {
        const linkValue         = window.location.href;                                                                             // <-- Current page URL

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(linkValue);                                                                     // <-- Modern Clipboard API
            } else {
                Whitecardopedia__Pwa__Handler__IosNonSafari__CopyLinkLegacyFallback(linkValue);                                     // <-- Legacy textarea fallback
            }
        } catch (error) {
            Whitecardopedia__Pwa__Handler__IosNonSafari__CopyLinkLegacyFallback(linkValue);                                         // <-- Fallback when permission denied
        }
    }
    // ---------------------------------------------------------------


    // SUB FUNCTION | Legacy Copy Link Fallback (execCommand)
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__IosNonSafari__CopyLinkLegacyFallback(linkValue) {
        try {
            const tempInput     = document.createElement('textarea');                                                               // <-- Create offscreen textarea
            tempInput.value     = linkValue;                                                                                        // <-- Seed value
            tempInput.setAttribute('readonly', '');                                                                                 // <-- Prevent virtual keyboard
            tempInput.style.position = 'fixed';                                                                                     // <-- Keep offscreen
            tempInput.style.opacity = '0';
            tempInput.style.pointerEvents = 'none';
            document.body.appendChild(tempInput);                                                                                   // <-- Mount
            tempInput.select();                                                                                                     // <-- Select content
            tempInput.setSelectionRange(0, linkValue.length);                                                                       // <-- iOS-specific selection
            document.execCommand('copy');                                                                                           // <-- Legacy copy command
            document.body.removeChild(tempInput);                                                                                   // <-- Clean up
        } catch (error) {
            console.warn('Whitecardopedia PWA iOS non-Safari clipboard fallback failed:', error);                                   // <-- Log non-blocking
        }
    }
    // ---------------------------------------------------------------


    // SUB FUNCTION | Handle User Dismissal of Sheet
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__IosNonSafari__OnDismiss() {
        if (window.Whitecardopedia__Pwa__SessionState && window.Whitecardopedia__Pwa__SessionState.recordDismissal) {
            window.Whitecardopedia__Pwa__SessionState.recordDismissal(Whitecardopedia__Pwa__Handler__IosNonSafari__PlatformIdContext); // <-- Snooze ladder advance
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Activate Handler for Platform Descriptor
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__IosNonSafari__Activate(platformDescriptor) {
        Whitecardopedia__Pwa__Handler__IosNonSafari__PlatformIdContext = (platformDescriptor && platformDescriptor.platformId) || 'ios-non-safari';   // <-- Persist platform id
    }
    // ---------------------------------------------------------------


    // FUNCTION | Request Sheet Display
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__IosNonSafari__RequestShow() {
        if (Whitecardopedia__Pwa__Handler__IosNonSafari__SuppressShow) return;                                                      // <-- Suppressed by controller
        if (!window.Whitecardopedia__Pwa__PromptUi || !window.Whitecardopedia__Pwa__PromptUi.show) return;                          // <-- UI not loaded yet

        if (window.Whitecardopedia__Pwa__SessionState && window.Whitecardopedia__Pwa__SessionState.isSuppressed) {
            if (window.Whitecardopedia__Pwa__SessionState.isSuppressed(Whitecardopedia__Pwa__Handler__IosNonSafari__PlatformIdContext)) {
                return;                                                                                                             // <-- Snooze still active
            }
        }

        window.Whitecardopedia__Pwa__PromptUi.show(Whitecardopedia__Pwa__Handler__IosNonSafari__BuildPromptConfig());                // <-- Render redirect sheet
    }
    // ---------------------------------------------------------------


    // FUNCTION | Set Suppress Flag (e.g. running standalone)
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__IosNonSafari__SetSuppressed(shouldSuppress) {
        Whitecardopedia__Pwa__Handler__IosNonSafari__SuppressShow = Boolean(shouldSuppress);                                        // <-- Update suppress flag
        if (Whitecardopedia__Pwa__Handler__IosNonSafari__SuppressShow && window.Whitecardopedia__Pwa__PromptUi && window.Whitecardopedia__Pwa__PromptUi.hide) {
            window.Whitecardopedia__Pwa__PromptUi.hide();                                                                           // <-- Hide if showing
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Exposure
// -----------------------------------------------------------------------------

    if (typeof window !== 'undefined') {
        window.Whitecardopedia__Pwa__Handler__IosNonSafari = {                                                                      // <-- Expose handler API
            activate      : Whitecardopedia__Pwa__Handler__IosNonSafari__Activate,
            requestShow   : Whitecardopedia__Pwa__Handler__IosNonSafari__RequestShow,
            setSuppressed : Whitecardopedia__Pwa__Handler__IosNonSafari__SetSuppressed
        };
    }

// endregion -------------------------------------------------------------------

})();
