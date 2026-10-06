// =============================================================================
// VALEVISION3D - SHARE PROJECT LINK — UI INTERACTION
// =============================================================================
//
// FILE       : Na__Feature__ShareProjectLink__UiInteractionLogic__.js
// NAMESPACE  : Na__Feature__ShareProjectLink
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Wire Tools menu, overlay, URL/email generation and download
// CREATED    : Mar-2026
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__Feature__ShareProjectLink__CreateFormOverlay } from './Na__Feature__ShareProjectLink__FormOverlay__.js';
    import { Na__Feature__ShareProjectLink__GetShareContext } from './Na__Feature__ShareProjectLink__UrlGeneratorLogic__.js';
    import { Na__Feature__ShareProjectLink__BuildEmailHtml } from './Na__Feature__ShareProjectLink__GenerateEmail__Logic__.js';
    import { Na__Feature__ShareProjectLink__DownloadHtmlFile } from './Na__Feature__ShareProjectLink__DownloadEmail__Logic__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Filename Helper
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Safe Filename Segment from Project Id
    // ------------------------------------------------------------
    function Na__Feature__ShareProjectLink__SanitizeFilenamePart(text) {
        return String(text || 'project')
            .replace(/[^\w\-]+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            .slice(0, 80) || 'project';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialise Feature
// -----------------------------------------------------------------------------

    // FUNCTION | Initialise Share Project Link UI
    // ------------------------------------------------------------
    function Na__Feature__ShareProjectLink__Initialize(options) {
        const showToast = typeof options.showToast === 'function'
            ? options.showToast
            : () => {};
        const rootElement = options.rootElement || document.getElementById('root');
        const menuButton = document.getElementById('naShareProjectLinkMenuButton');
        const menuItem = document.getElementById('naShareProjectLinkMenuItem');

        if (!menuButton) {
            console.warn('[ValeVision3D] Share project: menu button not found');
            return;
        }

        const form = Na__Feature__ShareProjectLink__CreateFormOverlay(rootElement);

        // SUB FUNCTION | Sync Tools Row Chevron with Overlay Open State
        // ------------------------------------------------------------
        const Na__ShareLink__SetMenuOpenVisual = (isOpen) => {
            if (menuItem) {
                menuItem.classList.toggle('is-share-overlay-open', Boolean(isOpen));
            }
            menuButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        };
        // ------------------------------------------------------------

        const Na__ShareLink__BaseShow = form.show.bind(form);
        const Na__ShareLink__BaseHide = form.hide.bind(form);
        form.show = () => {
            Na__ShareLink__SetMenuOpenVisual(true);
            Na__ShareLink__BaseShow();
        };
        form.hide = () => {
            Na__ShareLink__SetMenuOpenVisual(false);
            Na__ShareLink__BaseHide();
        };

        menuButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const visible = form.overlay.classList.contains('is-visible');
            if (visible) {
                form.hide();
            } else {
                form.show();
            }
        });

        form.backdrop.addEventListener('click', () => {
            form.hide();
        });

        form.btnCancel.addEventListener('click', () => {
            form.hide();
        });

        form.btnGenerate.addEventListener('click', async () => {
            const { recipientsRaw, specialNotesRaw } = form.getValues();
            const trimmedRecipients = String(recipientsRaw || '').trim();
            if (!trimmedRecipients) {
                showToast('Please enter at least one recipient name.', true);
                return;
            }

            const share = Na__Feature__ShareProjectLink__GetShareContext();
            if (!share.ok) {
                showToast('No project in the URL (?project=…). Open ValeVision3D from a project link before sharing.', true);
                return;
            }

            try {
                const html = await Na__Feature__ShareProjectLink__BuildEmailHtml({
                    recipientsRaw : trimmedRecipients,
                    specialNotesRaw,
                    displayProjectId : share.displayProjectId,
                    projectUrl       : share.projectUrl
                });
                const stamp = new Date().toISOString().slice(0, 10);
                const safeId = Na__Feature__ShareProjectLink__SanitizeFilenamePart(share.displayProjectId);
                const filename = `ValeVision3D_Share_${safeId}_${stamp}.html`;
                Na__Feature__ShareProjectLink__DownloadHtmlFile(filename, html);
                showToast('Email HTML downloaded.');
                form.hide();
            } catch (err) {
                console.error('[ValeVision3D] Share project email failed', err);
                showToast('Could not generate email file. Check the console for details.', true);
            }
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export { Na__Feature__ShareProjectLink__Initialize };

// endregion -------------------------------------------------------------------
