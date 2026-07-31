/* =============================================================================
   VGHLANTERN - WEB DEMO MODE | NOTICE MODAL AND BADGE
   =============================================================================

   FILE       : VghLantern__WebDemoMode__NoticeModal__.js
   NAMESPACE  : VghLantern
   MODULE     : VghLantern__WebDemoMode__NoticeModal
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Tell the user plainly when their work is not being saved to disk
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - Renders once per browser session when the environment detector reports demo
     mode, then leaves a persistent badge in the application header so the
     limitation stays visible after the modal is dismissed.
   - Clicking the badge reopens the modal, so the explanation is never more than
     one click away.
   - Offers a single-file export of every project held in browser storage. This is
     the only way a demo-mode user can take their work with them, so it is
     surfaced directly in the notice rather than buried in a menu.
   - Editing is deliberately left enabled. Locking the app down would make it
     useless for demonstrating the tool, and the warning plus the export route
     covers the real risk, which is silent data loss.
   - Vanilla DOM so it can mount before the rest of the app finishes booting.

   ============================================================================= */

(function () {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Element Identifiers
    // ------------------------------------------------------------
    var NOTICE_MODAL_ROOT_ID            = 'VghLantern__WebDemoMode__NoticeModal__Root';                           // <-- Modal root element id
    var NOTICE_BADGE_ROOT_ID            = 'VghLantern__WebDemoMode__Badge__Root';                                 // <-- Header badge element id
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Class Names Matching the Stylesheet
    // ------------------------------------------------------------
    var NOTICE_CLASS_ROOT               = 'vghdemo-notice';                                                       // <-- Modal root container
    var NOTICE_CLASS_ROOT_VISIBLE       = 'vghdemo-notice--visible';                                              // <-- Visible state modifier
    var NOTICE_CLASS_BACKDROP           = 'vghdemo-notice__backdrop';                                             // <-- Backdrop overlay
    var NOTICE_CLASS_PANEL              = 'vghdemo-notice__panel';                                                // <-- Panel container
    var NOTICE_CLASS_CLOSE              = 'vghdemo-notice__close';                                                // <-- Close control
    var NOTICE_CLASS_TITLE              = 'vghdemo-notice__title';                                                // <-- Panel title
    var NOTICE_CLASS_BODY               = 'vghdemo-notice__body';                                                 // <-- Body paragraph
    var NOTICE_CLASS_LIST               = 'vghdemo-notice__list';                                                 // <-- Capability list
    var NOTICE_CLASS_LIST_ITEM          = 'vghdemo-notice__list-item';                                            // <-- Capability list item
    var NOTICE_CLASS_LIST_ITEM_YES      = 'vghdemo-notice__list-item--yes';                                       // <-- Available capability
    var NOTICE_CLASS_LIST_ITEM_NO       = 'vghdemo-notice__list-item--no';                                        // <-- Unavailable capability
    var NOTICE_CLASS_ACTIONS            = 'vghdemo-notice__actions';                                              // <-- Action button row
    var NOTICE_CLASS_BUTTON_PRIMARY     = 'vghdemo-notice__button vghdemo-notice__button--primary';               // <-- Primary action
    var NOTICE_CLASS_BUTTON_SECONDARY   = 'vghdemo-notice__button vghdemo-notice__button--secondary';             // <-- Secondary action
    var NOTICE_CLASS_BADGE              = 'vghdemo-badge';                                                        // <-- Header badge
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Session Storage Key and Host Selectors
    // ------------------------------------------------------------
    var NOTICE_SESSION_SHOWN_KEY        = 'VghLantern__WebDemoMode__NoticeShown';                                 // <-- One automatic show per session
    var NOTICE_BADGE_HOST_SELECTOR      = '.app-header';                                                          // <-- Preferred badge mount point
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Export Bundle Configuration
    // ------------------------------------------------------------
    var NOTICE_EXPORT_BUNDLE_FILENAME   = 'VghLantern__ProjectBundle__BrowserStorage__.json';                     // <-- Single-file export name
    var NOTICE_EXPORT_BUNDLE_SCHEMA     = 'VghLantern__ProjectBundle__v1';                                        // <-- Bundle schema token
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | DOM Construction Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Create Element with Class Names
    // ---------------------------------------------------------------
    function VghLantern__WebDemoMode__NoticeModal__CreateElement(tagName, classNames, textContent) {
        var elementInstance = document.createElement(tagName);                                                    // <-- Create the element
        if (classNames) elementInstance.className = classNames;                                                   // <-- Apply class names
        if (textContent !== undefined && textContent !== null) elementInstance.textContent = textContent;         // <-- Apply text
        return elementInstance;                                                                                    // <-- Return the element
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Build the Capability List
    // ---------------------------------------------------------------
    function VghLantern__WebDemoMode__NoticeModal__BuildCapabilityList() {
        var listContainer   = VghLantern__WebDemoMode__NoticeModal__CreateElement('ul', NOTICE_CLASS_LIST);       // <-- List container

        var capabilityRows  = [
            { available: true,  text: 'Browse the component and profile libraries.' },
            { available: true,  text: 'Configure lanterns and view them in 2D and 3D.' },
            { available: true,  text: 'Produce drawings, specifications and PDF exports.' },
            { available: false, text: 'Projects are held in this browser only and are never written to disk.' },
            { available: false, text: 'Clearing browser data, or opening the app on another device, loses that work.' }
        ];

        capabilityRows.forEach(function (row) {
            var itemModifier = row.available ? NOTICE_CLASS_LIST_ITEM_YES : NOTICE_CLASS_LIST_ITEM_NO;            // <-- Pick the state modifier
            var itemElement  = VghLantern__WebDemoMode__NoticeModal__CreateElement(
                'li', NOTICE_CLASS_LIST_ITEM + ' ' + itemModifier, row.text);                                     // <-- Build the row
            listContainer.appendChild(itemElement);                                                               // <-- Append to the list
        });

        return listContainer;                                                                                      // <-- Return the list
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Count Projects Held in Browser Storage
    // ---------------------------------------------------------------
    function VghLantern__WebDemoMode__NoticeModal__CountStoredProjects() {
        var fileManager = window.VghLantern__AppData__ProjectFileManager || null;                                 // <-- Resolve the project file manager
        if (!fileManager || !fileManager.VghLantern__ProjectFileManager__ListProjects) return 0;                  // <-- Not loaded yet

        try {
            var projectList = fileManager.VghLantern__ProjectFileManager__ListProjects();                         // <-- Read the manifest
            return Array.isArray(projectList) ? projectList.length : 0;                                           // <-- Entry count
        } catch (listError) {
            return 0;                                                                                              // <-- Treat failures as empty
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Project Export
// -----------------------------------------------------------------------------

    // FUNCTION | Export Every Stored Project as a Single JSON Bundle
    // ------------------------------------------------------------
    // One file rather than one download per project: a loop of downloads trips
    // browser popup blocking, and a single bundle is easier to hand back to the
    // local build later.
    // ------------------------------------------------------------
    function VghLantern__WebDemoMode__NoticeModal__ExportAllProjects() {
        var fileManager = window.VghLantern__AppData__ProjectFileManager || null;                                 // <-- Resolve the project file manager
        if (!fileManager || !fileManager.VghLantern__ProjectFileManager__ListProjects) {
            console.warn('[VghLantern WebDemoMode] Project file manager unavailable, cannot export.');            // <-- Nothing to export from
            return false;
        }

        try {
            var projectList     = fileManager.VghLantern__ProjectFileManager__ListProjects() || [];               // <-- Read the manifest
            var exportedRecords = [];                                                                             // <-- Collected project payloads

            projectList.forEach(function (manifestEntry) {
                var projectCode = manifestEntry && manifestEntry.projectCode;                                     // <-- Manifest key
                if (!projectCode) return;                                                                          // <-- Skip malformed entries

                var projectData = fileManager.VghLantern__ProjectFileManager__LoadProject(projectCode);           // <-- Read from browser storage
                if (!projectData) return;                                                                          // <-- Skip anything unreadable

                exportedRecords.push({ projectCode: projectCode, projectData: projectData });                     // <-- Collect the payload
            });

            var bundlePayload = {
                schema        : NOTICE_EXPORT_BUNDLE_SCHEMA,
                exportedFrom  : window.location.href,
                projectCount  : exportedRecords.length,
                projects      : exportedRecords
            };

            var blobInstance  = new Blob([JSON.stringify(bundlePayload, null, 4)], { type: 'application/json' }); // <-- Serialise the bundle
            var objectUrl     = URL.createObjectURL(blobInstance);                                                // <-- Create a download handle
            var linkElement   = document.createElement('a');
            linkElement.href     = objectUrl;
            linkElement.download = NOTICE_EXPORT_BUNDLE_FILENAME;
            linkElement.click();                                                                                   // <-- Trigger the download
            URL.revokeObjectURL(objectUrl);                                                                        // <-- Release the handle

            console.log('[VghLantern WebDemoMode] Exported ' + exportedRecords.length + ' project(s) to a JSON bundle.');
            return true;
        } catch (exportError) {
            console.error('[VghLantern WebDemoMode] Project export failed:', exportError);                        // <-- Surface the failure
            return false;
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Header Badge
// -----------------------------------------------------------------------------

    // FUNCTION | Mount the Persistent Header Badge
    // ------------------------------------------------------------
    function VghLantern__WebDemoMode__NoticeModal__MountBadge() {
        if (typeof document === 'undefined') return;                                                              // <-- Guard non-DOM contexts
        if (document.getElementById(NOTICE_BADGE_ROOT_ID)) return;                                                // <-- Already mounted

        var badgeHost   = document.querySelector(NOTICE_BADGE_HOST_SELECTOR) || document.body;                    // <-- Prefer the app header
        if (!badgeHost) return;                                                                                    // <-- Nothing to mount into

        var badgeElement = VghLantern__WebDemoMode__NoticeModal__CreateElement('button', NOTICE_CLASS_BADGE, 'Demo mode, work not saved to disk');
        badgeElement.id  = NOTICE_BADGE_ROOT_ID;                                                                  // <-- Badge id for de-duplication
        badgeElement.setAttribute('type', 'button');                                                              // <-- Prevent form submission
        badgeElement.setAttribute('title', 'Read the demo mode notice again');                                    // <-- Hover hint
        badgeElement.addEventListener('click', function () {
            VghLantern__WebDemoMode__NoticeModal__Show();                                                          // <-- Reopen the explanation
        });

        badgeHost.appendChild(badgeElement);                                                                       // <-- Mount into the header
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Show the Demo Mode Notice
    // ------------------------------------------------------------
    function VghLantern__WebDemoMode__NoticeModal__Show() {
        if (typeof document === 'undefined') return;                                                              // <-- Guard non-DOM contexts
        VghLantern__WebDemoMode__NoticeModal__Hide();                                                              // <-- Tear down any existing notice

        var rootElement = VghLantern__WebDemoMode__NoticeModal__CreateElement('div', NOTICE_CLASS_ROOT);          // <-- Root wrapper
        rootElement.id  = NOTICE_MODAL_ROOT_ID;                                                                   // <-- Root id for de-duplication
        rootElement.setAttribute('role', 'dialog');                                                                // <-- Accessibility role
        rootElement.setAttribute('aria-modal', 'true');                                                            // <-- Modal semantics

        var dismissCallback = function VghLantern__WebDemoMode__NoticeModal__OnDismiss() {
            VghLantern__WebDemoMode__NoticeModal__Hide();                                                          // <-- Tear down the DOM
            VghLantern__WebDemoMode__NoticeModal__MountBadge();                                                    // <-- Leave the badge behind
        };

        var backdropElement = VghLantern__WebDemoMode__NoticeModal__CreateElement('div', NOTICE_CLASS_BACKDROP);  // <-- Backdrop overlay
        backdropElement.addEventListener('click', dismissCallback);                                                // <-- Click-out dismisses
        rootElement.appendChild(backdropElement);

        var panelElement = VghLantern__WebDemoMode__NoticeModal__CreateElement('div', NOTICE_CLASS_PANEL);        // <-- Panel container

        var closeButton  = VghLantern__WebDemoMode__NoticeModal__CreateElement('button', NOTICE_CLASS_CLOSE, 'X'); // <-- Close control
        closeButton.setAttribute('type', 'button');
        closeButton.setAttribute('aria-label', 'Close the demo mode notice');
        closeButton.addEventListener('click', dismissCallback);
        panelElement.appendChild(closeButton);

        panelElement.appendChild(VghLantern__WebDemoMode__NoticeModal__CreateElement(
            'div', NOTICE_CLASS_TITLE, 'Read-only demo version'));                                                // <-- Title

        panelElement.appendChild(VghLantern__WebDemoMode__NoticeModal__CreateElement(
            'p', NOTICE_CLASS_BODY,
            'This build runs without the Lantern Designer server, so nothing you do here is written to a project file. '
            + 'Everything works, but your work lives in this browser alone.'));                                    // <-- Lead paragraph

        panelElement.appendChild(VghLantern__WebDemoMode__NoticeModal__BuildCapabilityList());                    // <-- Capability list

        panelElement.appendChild(VghLantern__WebDemoMode__NoticeModal__CreateElement(
            'p', NOTICE_CLASS_BODY,
            'To edit and save properly, run the local Lantern Designer server and open the app on localhost. '
            + 'Server-backed saving for the web version is not available yet.'));                                  // <-- Route to the real thing

        var actionsContainer = VghLantern__WebDemoMode__NoticeModal__CreateElement('div', NOTICE_CLASS_ACTIONS);  // <-- Action row

        var continueButton   = VghLantern__WebDemoMode__NoticeModal__CreateElement('button', NOTICE_CLASS_BUTTON_PRIMARY, 'Continue');
        continueButton.setAttribute('type', 'button');
        continueButton.addEventListener('click', dismissCallback);
        actionsContainer.appendChild(continueButton);

        if (VghLantern__WebDemoMode__NoticeModal__CountStoredProjects() > 0) {                                    // <-- Only offer export when there is something to export
            var exportButton = VghLantern__WebDemoMode__NoticeModal__CreateElement('button', NOTICE_CLASS_BUTTON_SECONDARY, 'Export all projects');
            exportButton.setAttribute('type', 'button');
            exportButton.addEventListener('click', function () {
                VghLantern__WebDemoMode__NoticeModal__ExportAllProjects();                                        // <-- Download the bundle, keep the notice open
            });
            actionsContainer.appendChild(exportButton);
        }

        panelElement.appendChild(actionsContainer);
        rootElement.appendChild(panelElement);

        document.body.appendChild(rootElement);                                                                    // <-- Mount under body
        requestAnimationFrame(function () { rootElement.classList.add(NOTICE_CLASS_ROOT_VISIBLE); });             // <-- Trigger the visible transition
    }
    // ---------------------------------------------------------------


    // FUNCTION | Hide the Demo Mode Notice
    // ------------------------------------------------------------
    function VghLantern__WebDemoMode__NoticeModal__Hide() {
        if (typeof document === 'undefined') return;                                                              // <-- Guard non-DOM contexts
        var existingRoot = document.getElementById(NOTICE_MODAL_ROOT_ID);                                         // <-- Look up the live root
        if (existingRoot && existingRoot.parentNode) {
            existingRoot.parentNode.removeChild(existingRoot);                                                    // <-- Remove from the DOM
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Report Whether the Notice Is Currently Visible
    // ------------------------------------------------------------
    function VghLantern__WebDemoMode__NoticeModal__IsVisible() {
        if (typeof document === 'undefined') return false;                                                        // <-- Guard non-DOM contexts
        return Boolean(document.getElementById(NOTICE_MODAL_ROOT_ID));                                            // <-- Presence check
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Bootstrap
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Report Whether the Notice Already Showed This Session
    // ---------------------------------------------------------------
    function VghLantern__WebDemoMode__NoticeModal__HasShownThisSession() {
        try {
            return Boolean(sessionStorage.getItem(NOTICE_SESSION_SHOWN_KEY));                                     // <-- One automatic show per session
        } catch (storageError) {
            return false;                                                                                          // <-- Storage blocked, show it
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Mark the Notice as Shown for This Session
    // ---------------------------------------------------------------
    function VghLantern__WebDemoMode__NoticeModal__MarkShownThisSession() {
        try {
            sessionStorage.setItem(NOTICE_SESSION_SHOWN_KEY, '1');                                                // <-- Persist the session flag
        } catch (storageError) {
            // Silent: the flag is a courtesy, not a requirement
        }
    }
    // ---------------------------------------------------------------


    // SUB FUNCTION | React to the Resolved Runtime Mode
    // ---------------------------------------------------------------
    function VghLantern__WebDemoMode__NoticeModal__OnModeResolved(resolvedMode) {
        var detector = window.VghLantern__WebDemoMode__EnvironmentDetector || null;                               // <-- Resolve the detector
        var demoToken = (detector && detector.Modes) ? detector.Modes.Demo : 'demo';                              // <-- Demo mode token

        if (resolvedMode !== demoToken) return;                                                                   // <-- Full local mode, nothing to say

        if (VghLantern__WebDemoMode__NoticeModal__HasShownThisSession()) {
            VghLantern__WebDemoMode__NoticeModal__MountBadge();                                                   // <-- Already explained, keep the badge
            return;
        }

        VghLantern__WebDemoMode__NoticeModal__MarkShownThisSession();                                             // <-- Record the automatic show
        VghLantern__WebDemoMode__NoticeModal__Show();                                                              // <-- Explain the limitation
    }
    // ---------------------------------------------------------------


    // SUB FUNCTION | Bootstrap the Notice
    // ---------------------------------------------------------------
    function VghLantern__WebDemoMode__NoticeModal__Bootstrap() {
        if (typeof window === 'undefined') return;                                                                // <-- Guard non-window contexts

        window.VghLantern__WebDemoMode__NoticeModal = {                                                           // <-- Public API surface
            show             : VghLantern__WebDemoMode__NoticeModal__Show,
            hide             : VghLantern__WebDemoMode__NoticeModal__Hide,
            isVisible        : VghLantern__WebDemoMode__NoticeModal__IsVisible,
            mountBadge       : VghLantern__WebDemoMode__NoticeModal__MountBadge,
            exportAllProjects: VghLantern__WebDemoMode__NoticeModal__ExportAllProjects
        };

        var startWatch = function () {
            var detector = window.VghLantern__WebDemoMode__EnvironmentDetector || null;                           // <-- Resolve the detector
            if (!detector || !detector.whenResolved) return;                                                      // <-- Detector absent, stay silent
            detector.whenResolved(VghLantern__WebDemoMode__NoticeModal__OnModeResolved);                          // <-- React once the mode is final
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startWatch, { once: true });                            // <-- Defer until the header exists
            return;
        }
        startWatch();                                                                                              // <-- DOM already ready
    }
    // ---------------------------------------------------------------


    VghLantern__WebDemoMode__NoticeModal__Bootstrap();                                                            // <-- Kick off bootstrap

// endregion -------------------------------------------------------------------

})();
