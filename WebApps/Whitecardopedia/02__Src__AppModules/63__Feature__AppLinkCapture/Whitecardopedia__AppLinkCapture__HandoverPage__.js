// =============================================================================
// WHITECARDOPEDIA - APP LINK CAPTURE - HANDOVER PAGE LOGIC
// =============================================================================
//
// FILE       : Whitecardopedia__AppLinkCapture__HandoverPage__.js
// NAMESPACE  : Whitecardopedia
// MODULE     : Whitecardopedia__AppLinkCapture__HandoverPage
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Drive ShareLink__OpenInApp__.html three-state forward / open / install flow
// CREATED    : 2026
//
// DESCRIPTION:
// - Drives the small handover page that share-link emails route through.
// - Three states:
//     A. Already running standalone -> instantly forward to the matching
//        ValeVision3D project view via in-app navigation.
//     B. In browser, PWA installed (or recent standalone visit recorded) ->
//        attempt the web+valevision protocol redirect, then after a short
//        timeout reveal "Open in App" / "Continue in browser" buttons plus
//        the Chromium-desktop opt-in tooltip.
//     C. In browser, PWA not installed -> render install prompt invitation
//        plus "Continue in browser" button.
// - Marks the visiting browser as "saw standalone" the first time we see
//   display-mode standalone so subsequent visits in plain browser tabs can
//   make a stronger guess about installation state when
//   navigator.getInstalledRelatedApps() is unavailable (Safari, Firefox).
//
// =============================================================================

(function () {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Element Identifiers
    // ------------------------------------------------------------
    const HANDOVER_PAGE_ROOT_ID                 = 'WalcHandoverRoot';                                                               // <-- Root container id in HTML
    const HANDOVER_PAGE_SPINNER_ID              = 'WalcHandoverSpinner';                                                            // <-- Spinner element id
    const HANDOVER_PAGE_TITLE_ID                = 'WalcHandoverTitle';                                                              // <-- Headline element id
    const HANDOVER_PAGE_BODY_ID                 = 'WalcHandoverBody';                                                               // <-- Body text element id
    const HANDOVER_PAGE_PROJECT_ID              = 'WalcHandoverProjectCode';                                                        // <-- Project code chip element id
    const HANDOVER_PAGE_ACTIONS_ID              = 'WalcHandoverActions';                                                            // <-- Actions container id
    const HANDOVER_PAGE_TOOLTIP_SLOT_ID         = 'WalcHandoverTooltipSlot';                                                        // <-- Opt-in tooltip slot id
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Class Names
    // ------------------------------------------------------------
    const HANDOVER_PAGE_CLASS_BUTTON_PRIMARY    = 'walc-handover__button walc-handover__button--primary';                           // <-- Primary action class
    const HANDOVER_PAGE_CLASS_BUTTON_SECONDARY  = 'walc-handover__button walc-handover__button--secondary';                         // <-- Secondary action class
    const HANDOVER_PAGE_CLASS_PROJECT_CHIP      = 'walc-handover__chip';                                                            // <-- Project code chip class
    const HANDOVER_PAGE_CLASS_HIDDEN            = 'walc-handover--hidden';                                                          // <-- Hidden state modifier
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Storage Keys and Timing
    // ------------------------------------------------------------
    const HANDOVER_PAGE_SAW_STANDALONE_KEY      = 'Whitecardopedia__AppLinkCapture__HandoverPage__SawStandaloneFlag__v1';           // <-- Persisted "saw standalone" flag
    const HANDOVER_PAGE_PROTOCOL_TIMEOUT_MS     = 1800;                                                                             // <-- Wait this long after protocol attempt
    const HANDOVER_PAGE_AUTOFORWARD_DELAY_MS    = 200;                                                                              // <-- Delay before standalone auto-forward
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve Required Helper Modules
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__HandoverPage__GetHelpers() {
        return {
            urlBuilder       : window.Whitecardopedia__AppLinkCapture__UrlBuilder      || null,
            protocolHandler  : window.Whitecardopedia__AppLinkCapture__ProtocolHandler || null,
            optInTooltip     : window.Whitecardopedia__AppLinkCapture__OptInTooltip    || null,
            platformDetector : window.Whitecardopedia__Pwa__PlatformDetector            || null,
            installController: window.Whitecardopedia__Pwa__InstallController           || null,
            promptUi         : window.Whitecardopedia__Pwa__PromptUi                    || null,
            sessionState     : window.Whitecardopedia__Pwa__SessionState                || null,
            appScopeNav      : window.Na__Feature__PwaAppHelpers__AppScopeNavigation    || null
        };
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Detect Standalone Display Mode
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__HandoverPage__IsStandaloneNow() {
        const detector          = window.Whitecardopedia__Pwa__PlatformDetector;                                                    // <-- Resolve detector
        if (detector && typeof detector.isStandaloneDisplay === 'function') {
            return detector.isStandaloneDisplay();                                                                                  // <-- Delegate to detector
        }

        const isLegacyIos       = window.navigator && window.navigator.standalone === true;                                         // <-- iOS legacy signal
        const isModernStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;                    // <-- Modern API signal
        return Boolean(isLegacyIos || isModernStandalone);                                                                          // <-- Inclusive standalone detection
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Persist Saw Standalone Flag
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__HandoverPage__MarkSawStandalone() {
        try {
            if (typeof localStorage === 'undefined') return;                                                                        // <-- Storage unavailable
            localStorage.setItem(HANDOVER_PAGE_SAW_STANDALONE_KEY, String(Date.now()));                                             // <-- Stamp timestamp
        } catch (error) {
            /* Silent: persistence is best-effort */
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Read Saw Standalone Flag
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__HandoverPage__HasSawStandalone() {
        try {
            if (typeof localStorage === 'undefined') return false;                                                                  // <-- Storage unavailable
            return Boolean(localStorage.getItem(HANDOVER_PAGE_SAW_STANDALONE_KEY));                                                 // <-- Flag presence
        } catch (error) {
            return false;                                                                                                           // <-- Storage blocked
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Probe Related Installed Apps
    // ---------------------------------------------------------------
    async function Whitecardopedia__AppLinkCapture__HandoverPage__ProbeInstalled() {
        try {
            if (!navigator.getInstalledRelatedApps) return null;                                                                    // <-- API unavailable -> indeterminate
            const relatedApps   = await navigator.getInstalledRelatedApps();                                                        // <-- Query installed
            return Array.isArray(relatedApps) && relatedApps.length > 0;                                                            // <-- Boolean install verdict
        } catch (error) {
            return null;                                                                                                            // <-- Error -> indeterminate
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Read Project Code from Page URL
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__HandoverPage__ReadProjectCode() {
        const urlBuilder        = window.Whitecardopedia__AppLinkCapture__UrlBuilder;                                               // <-- Resolve URL builder
        if (urlBuilder && typeof urlBuilder.readProjectFromCurrentLocation === 'function') {
            return urlBuilder.readProjectFromCurrentLocation();                                                                     // <-- Delegate to builder
        }

        const params            = new URLSearchParams(window.location.search || '');                                                // <-- Fallback parsing
        return params.get('project');                                                                                               // <-- Read ?project=
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Format Project Code for Display
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__HandoverPage__FormatProjectDisplay(projectCode) {
        const trimmed           = String(projectCode || '').trim();                                                                 // <-- Sanitize value
        if (!trimmed) return '';                                                                                                    // <-- Empty -> empty
        const tail              = trimmed.includes('/') ? trimmed.split('/').pop() : trimmed;                                       // <-- Strip year prefix when present
        return tail || trimmed;                                                                                                     // <-- Return tail or full value
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Resolve DOM Targets
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__HandoverPage__GetDomTargets() {
        return {
            rootElement      : document.getElementById(HANDOVER_PAGE_ROOT_ID),
            spinnerElement   : document.getElementById(HANDOVER_PAGE_SPINNER_ID),
            titleElement     : document.getElementById(HANDOVER_PAGE_TITLE_ID),
            bodyElement      : document.getElementById(HANDOVER_PAGE_BODY_ID),
            projectElement   : document.getElementById(HANDOVER_PAGE_PROJECT_ID),
            actionsElement   : document.getElementById(HANDOVER_PAGE_ACTIONS_ID),
            tooltipSlot      : document.getElementById(HANDOVER_PAGE_TOOLTIP_SLOT_ID)
        };
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Replace Children with New Nodes
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__HandoverPage__ReplaceChildren(parentElement, newChildren) {
        if (!parentElement) return;                                                                                                 // <-- Guard missing parent
        parentElement.innerHTML = '';                                                                                               // <-- Wipe existing
        newChildren.forEach((childNode) => {
            if (childNode) parentElement.appendChild(childNode);                                                                    // <-- Append valid nodes only
        });
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Build Action Button
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__HandoverPage__BuildActionButton(label, className, onClick) {
        const button            = document.createElement('button');                                                                 // <-- Create button
        button.type             = 'button';                                                                                         // <-- Prevent form submit
        button.className        = className;                                                                                        // <-- Apply class
        button.textContent      = label;                                                                                            // <-- Apply label
        button.addEventListener('click', onClick);                                                                                  // <-- Wire click
        return button;                                                                                                              // <-- Return button
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | UI State Renderers
// -----------------------------------------------------------------------------

    // FUNCTION | Render Loading State (Spinner + Project Code)
    // ------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__HandoverPage__RenderLoadingState(projectCode) {
        const targets           = Whitecardopedia__AppLinkCapture__HandoverPage__GetDomTargets();                                   // <-- Resolve DOM nodes
        if (!targets.rootElement) return;                                                                                           // <-- Bail without root

        if (targets.titleElement)   targets.titleElement.textContent  = 'Opening ValeVision 3D...';                                  // <-- Loading headline
        if (targets.bodyElement)    targets.bodyElement.textContent   = 'Hand-off in progress.';                                     // <-- Helper text
        if (targets.spinnerElement) targets.spinnerElement.classList.remove(HANDOVER_PAGE_CLASS_HIDDEN);                             // <-- Show spinner
        if (targets.projectElement) targets.projectElement.textContent = Whitecardopedia__AppLinkCapture__HandoverPage__FormatProjectDisplay(projectCode);   // <-- Project chip
        if (targets.actionsElement) targets.actionsElement.classList.add(HANDOVER_PAGE_CLASS_HIDDEN);                                // <-- Hide actions during loading
    }
    // ---------------------------------------------------------------


    // FUNCTION | Render Installed-In-Browser State (State B)
    // ------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__HandoverPage__RenderInstalledState(projectCode) {
        const helpers           = Whitecardopedia__AppLinkCapture__HandoverPage__GetHelpers();                                      // <-- Resolve helpers
        const targets           = Whitecardopedia__AppLinkCapture__HandoverPage__GetDomTargets();                                   // <-- Resolve DOM nodes
        if (!targets.rootElement) return;                                                                                           // <-- Bail without root

        if (targets.titleElement)   targets.titleElement.textContent  = 'Open this in the ValeVision 3D app';                       // <-- Title
        if (targets.bodyElement)    targets.bodyElement.textContent   = 'It looks like you already have the app installed. Tap the button below to launch it, or continue here in your browser.';   // <-- Body
        if (targets.spinnerElement) targets.spinnerElement.classList.add(HANDOVER_PAGE_CLASS_HIDDEN);                                // <-- Hide spinner

        if (targets.actionsElement) {
            targets.actionsElement.classList.remove(HANDOVER_PAGE_CLASS_HIDDEN);                                                    // <-- Reveal actions
            const openInAppButton   = Whitecardopedia__AppLinkCapture__HandoverPage__BuildActionButton(
                'Open in ValeVision 3D',
                HANDOVER_PAGE_CLASS_BUTTON_PRIMARY,
                () => Whitecardopedia__AppLinkCapture__HandoverPage__AttemptProtocolLaunch(projectCode, false)
            );
            const continueButton    = Whitecardopedia__AppLinkCapture__HandoverPage__BuildActionButton(
                'Continue in this browser',
                HANDOVER_PAGE_CLASS_BUTTON_SECONDARY,
                () => Whitecardopedia__AppLinkCapture__HandoverPage__ForwardDirectToProject(projectCode)
            );
            Whitecardopedia__AppLinkCapture__HandoverPage__ReplaceChildren(targets.actionsElement, [openInAppButton, continueButton]);   // <-- Mount buttons
        }

        if (helpers.optInTooltip && targets.tooltipSlot) {
            helpers.optInTooltip.render(targets.tooltipSlot);                                                                       // <-- Render Chromium opt-in nudge
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Render Not-Installed State (State C)
    // ------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__HandoverPage__RenderNotInstalledState(projectCode) {
        const helpers           = Whitecardopedia__AppLinkCapture__HandoverPage__GetHelpers();                                      // <-- Resolve helpers
        const targets           = Whitecardopedia__AppLinkCapture__HandoverPage__GetDomTargets();                                   // <-- Resolve DOM nodes
        if (!targets.rootElement) return;                                                                                           // <-- Bail without root

        if (targets.titleElement)   targets.titleElement.textContent  = 'Open in the ValeVision 3D app';                            // <-- Title
        if (targets.bodyElement)    targets.bodyElement.textContent   = 'Install ValeVision 3D once for a one-tap experience on every future shared project, or continue here in your browser.';   // <-- Body
        if (targets.spinnerElement) targets.spinnerElement.classList.add(HANDOVER_PAGE_CLASS_HIDDEN);                                // <-- Hide spinner

        if (targets.actionsElement) {
            targets.actionsElement.classList.remove(HANDOVER_PAGE_CLASS_HIDDEN);                                                    // <-- Reveal actions
            const installButton     = Whitecardopedia__AppLinkCapture__HandoverPage__BuildActionButton(
                'Install ValeVision 3D',
                HANDOVER_PAGE_CLASS_BUTTON_PRIMARY,
                () => {
                    if (helpers.installController && typeof helpers.installController.requestShow === 'function') {
                        helpers.installController.requestShow();                                                                    // <-- Trigger install prompt
                    }
                }
            );
            const continueButton    = Whitecardopedia__AppLinkCapture__HandoverPage__BuildActionButton(
                'Continue in this browser',
                HANDOVER_PAGE_CLASS_BUTTON_SECONDARY,
                () => Whitecardopedia__AppLinkCapture__HandoverPage__ForwardDirectToProject(projectCode)
            );
            Whitecardopedia__AppLinkCapture__HandoverPage__ReplaceChildren(targets.actionsElement, [installButton, continueButton]);    // <-- Mount buttons
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Render Missing-Project Error State
    // ------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__HandoverPage__RenderMissingProjectState() {
        const targets           = Whitecardopedia__AppLinkCapture__HandoverPage__GetDomTargets();                                   // <-- Resolve DOM nodes
        if (!targets.rootElement) return;                                                                                           // <-- Bail without root

        if (targets.titleElement)   targets.titleElement.textContent  = 'No project specified';                                     // <-- Title
        if (targets.bodyElement)    targets.bodyElement.textContent   = 'This share link is missing a project reference. Please ask the sender for a fresh link.';   // <-- Body
        if (targets.spinnerElement) targets.spinnerElement.classList.add(HANDOVER_PAGE_CLASS_HIDDEN);                                // <-- Hide spinner
        if (targets.projectElement) targets.projectElement.textContent = '';                                                         // <-- No chip

        if (targets.actionsElement) {
            targets.actionsElement.classList.remove(HANDOVER_PAGE_CLASS_HIDDEN);                                                    // <-- Reveal actions
            const helpers       = Whitecardopedia__AppLinkCapture__HandoverPage__GetHelpers();                                      // <-- Resolve helpers
            const pwaUrlHelper  = window.Whitecardopedia__Pwa__Url || null;                                                         // <-- PWA URL helper
            const galleryUrl    = pwaUrlHelper && typeof pwaUrlHelper.getStartUrl === 'function'
                ? pwaUrlHelper.getStartUrl()
                : '../Whitecardopedia/app.html';                                                                                    // <-- Fallback start URL

            const galleryButton = Whitecardopedia__AppLinkCapture__HandoverPage__BuildActionButton(
                'Open Whitecardopedia gallery',
                HANDOVER_PAGE_CLASS_BUTTON_PRIMARY,
                () => { window.location.replace(galleryUrl); }
            );
            Whitecardopedia__AppLinkCapture__HandoverPage__ReplaceChildren(targets.actionsElement, [galleryButton]);                // <-- Mount fallback button
            void helpers;                                                                                                           // <-- Suppress unused-warning lints
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Navigation Actions
// -----------------------------------------------------------------------------

    // FUNCTION | Forward Direct to Matching ValeVision Project
    // ------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__HandoverPage__ForwardDirectToProject(projectCode) {
        const helpers           = Whitecardopedia__AppLinkCapture__HandoverPage__GetHelpers();                                      // <-- Resolve helpers
        if (!helpers.urlBuilder) return false;                                                                                      // <-- Bail without URL builder

        const directUrl         = helpers.urlBuilder.buildDirectProjectUrl(projectCode);                                            // <-- Build direct project URL
        if (!directUrl) return false;                                                                                               // <-- Bail when invalid

        if (helpers.appScopeNav && typeof helpers.appScopeNav.navigateCurrentClient === 'function') {
            helpers.appScopeNav.navigateCurrentClient(directUrl);                                                                   // <-- In-app navigation
            return true;
        }

        window.location.replace(directUrl);                                                                                         // <-- Hard navigation fallback
        return true;
    }
    // ---------------------------------------------------------------


    // FUNCTION | Attempt web+valevision Protocol Launch
    // ------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__HandoverPage__AttemptProtocolLaunch(projectCode, autoFallback) {
        const helpers           = Whitecardopedia__AppLinkCapture__HandoverPage__GetHelpers();                                      // <-- Resolve helpers
        if (!helpers.urlBuilder) return false;                                                                                      // <-- Bail without URL builder

        const protocolUrl       = helpers.urlBuilder.buildProtocolUrl(projectCode);                                                 // <-- Build protocol URL
        if (!protocolUrl) return false;                                                                                             // <-- Bail when invalid

        try {
            window.location.href = protocolUrl;                                                                                     // <-- Trigger protocol navigation
        } catch (error) {
            // Silent: not all browsers register the scheme; fall through to fallback
        }

        if (autoFallback) {
            window.setTimeout(() => {
                if (!document.hidden) {
                    Whitecardopedia__AppLinkCapture__HandoverPage__RenderInstalledState(projectCode);                               // <-- User stayed -> reveal actions
                }
            }, HANDOVER_PAGE_PROTOCOL_TIMEOUT_MS);
        }

        return true;                                                                                                                // <-- Indicate dispatched
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | State Resolver
// -----------------------------------------------------------------------------

    // FUNCTION | Resolve Display State From Probes
    // ------------------------------------------------------------
    async function Whitecardopedia__AppLinkCapture__HandoverPage__ResolveDisplayState() {
        const isStandaloneNow   = Whitecardopedia__AppLinkCapture__HandoverPage__IsStandaloneNow();                                 // <-- Standalone check
        if (isStandaloneNow) {
            Whitecardopedia__AppLinkCapture__HandoverPage__MarkSawStandalone();                                                     // <-- Persist for future runs
            return 'standalone';                                                                                                    // <-- State A
        }

        const installedProbe    = await Whitecardopedia__AppLinkCapture__HandoverPage__ProbeInstalled();                            // <-- Hard probe
        if (installedProbe === true) return 'installed';                                                                            // <-- State B (definitive)

        if (installedProbe === null) {
            const sawStandalone = Whitecardopedia__AppLinkCapture__HandoverPage__HasSawStandalone();                                // <-- Soft probe
            if (sawStandalone) return 'installed';                                                                                  // <-- State B (best-effort)
        }

        return 'not-installed';                                                                                                     // <-- State C
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Bootstrap
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Handover Page Lifecycle
    // ------------------------------------------------------------
    async function Whitecardopedia__AppLinkCapture__HandoverPage__Initialize() {
        if (typeof document === 'undefined') return;                                                                                // <-- Guard non-DOM contexts

        const protocolHandler   = window.Whitecardopedia__AppLinkCapture__ProtocolHandler;                                          // <-- Resolve protocol handler
        if (protocolHandler && typeof protocolHandler.autoConsume === 'function') {
            const consumed      = protocolHandler.autoConsume();                                                                    // <-- Forward incoming protocol launch
            if (consumed) return;                                                                                                   // <-- Stop further rendering after dispatch
        }

        const projectCode       = Whitecardopedia__AppLinkCapture__HandoverPage__ReadProjectCode();                                 // <-- Pull project code
        if (!projectCode) {
            Whitecardopedia__AppLinkCapture__HandoverPage__RenderMissingProjectState();                                             // <-- Missing -> error state
            return;
        }

        Whitecardopedia__AppLinkCapture__HandoverPage__RenderLoadingState(projectCode);                                             // <-- Loading state initially

        const displayState      = await Whitecardopedia__AppLinkCapture__HandoverPage__ResolveDisplayState();                       // <-- Resolve state

        if (displayState === 'standalone') {
            window.setTimeout(() => Whitecardopedia__AppLinkCapture__HandoverPage__ForwardDirectToProject(projectCode), HANDOVER_PAGE_AUTOFORWARD_DELAY_MS); // <-- Forward soon
            return;
        }

        if (displayState === 'installed') {
            Whitecardopedia__AppLinkCapture__HandoverPage__AttemptProtocolLaunch(projectCode, true);                                // <-- Try protocol then reveal actions on stall
            return;
        }

        Whitecardopedia__AppLinkCapture__HandoverPage__RenderNotInstalledState(projectCode);                                        // <-- Default to State C
    }
    // ---------------------------------------------------------------


    // FUNCTION | Initialize Global Handover Page Namespace
    // ------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__HandoverPage__InitializeGlobalNamespace() {
        if (typeof window === 'undefined') return;                                                                                  // <-- Guard non-window contexts

        window.Whitecardopedia__AppLinkCapture__HandoverPage = {                                                                    // <-- Public API surface
            initialize             : Whitecardopedia__AppLinkCapture__HandoverPage__Initialize,
            forwardDirectToProject : Whitecardopedia__AppLinkCapture__HandoverPage__ForwardDirectToProject,
            attemptProtocolLaunch  : Whitecardopedia__AppLinkCapture__HandoverPage__AttemptProtocolLaunch
        };
    }
    // ---------------------------------------------------------------


    // SUB FUNCTION | Bootstrap Initialization
    // ---------------------------------------------------------------
    function Whitecardopedia__AppLinkCapture__HandoverPage__Bootstrap() {
        Whitecardopedia__AppLinkCapture__HandoverPage__InitializeGlobalNamespace();                                                 // <-- Mount global API immediately

        if (typeof document === 'undefined') return;                                                                                // <-- Guard non-DOM contexts

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => Whitecardopedia__AppLinkCapture__HandoverPage__Initialize());      // <-- Defer until DOM ready
            return;
        }

        Whitecardopedia__AppLinkCapture__HandoverPage__Initialize();                                                                // <-- Init immediately when DOM ready
    }
    // ---------------------------------------------------------------


    Whitecardopedia__AppLinkCapture__HandoverPage__Bootstrap();                                                                     // <-- Kick off bootstrap

// endregion -------------------------------------------------------------------

})();
