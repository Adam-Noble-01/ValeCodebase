// =============================================================================
// VALEVISION3D - BREADCRUMB NAVIGATION MENU CONTROLS
// =============================================================================
//
// FILE       : Na__Feature__BreadcrumbNav__Controls.js
// NAMESPACE  : Na__Feature
// MODULE     : Breadcrumb Navigation Menu
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Collapsed top-left breadcrumb trail back to ValeVision Gallery
// CREATED    : 28-Jul-2026
//
// DESCRIPTION:
// - Compact chevron button fixed top-left; clicking it unfolds the breadcrumb
//   trail "Project Gallery / <Name> - <Code> / Model View".
// - "Project Gallery" links to the ValeVision Gallery gallery; the project crumb
//   deep-links to that project's ValeVision Gallery page (app.html?id=<code>).
// - Only shown when the app booted with a ?project= URL parameter; hidden
//   otherwise (dev boots with the default cube have nowhere to crumb back to).
// - Labels seed instantly from the ?project= value (e.g. "63403__Thrower"),
//   then refine from project.json once the memoised fetch resolves.
// - Trail stays open until the chevron is clicked again (no click-away).
// - Markup lives in index.html (#naBreadcrumbNav) following the established
//   stable-element-ID pattern; this module owns behaviour and link targets.
// - A PAGE OF THE APP (ValeVision3D v2.76.0): while a page is up over the 3D view
//   the trail reads "Project Gallery / <Name> - <Code> / Model View / <Page>",
//   with Model View a link back to the 3D model (SetPage). The app pages'
//   navigation (Na__AppPages__Navigation__) says which page is up and what the
//   link does; a Ctrl / Shift / middle click is still the browser's own.
//
// INTEGRATION:
// - Call Na__Feature__BreadcrumbNav__Initialize() from index.html after the
//   loading sequence has been started (fetch is memoised so this never adds
//   a second network request for project.json).
// - Na__Feature__BreadcrumbNav__SetPage(page | null) from the app pages'
//   navigation on every change of page.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Oct-2026 - Version 1.1.0 (ValeVision3D v2.76.0)
// - SetPage: Model View becomes a link back from a page, and the page is named
//   after it (the Drawing Editor).
//
// 28-Jul-2026 - Version 1.0.0
// - Initial implementation: collapsed chevron menu, ValeVision Gallery links.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Project Loader Utilities
    // ------------------------------------------------------------
    import {
        Na__AppUtils__GetProjectCodeFromUrl,
        Na__AppUtils__GetProjectFolderFromUrl,
        Na__AppUtils__FetchProjectJson
    } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Element IDs
    // ------------------------------------------------------------
    const Na__BreadcrumbNav__NavId           = 'naBreadcrumbNav';            // <-- Fixed top-left container
    const Na__BreadcrumbNav__ToggleBtnId     = 'naBreadcrumbToggleBtn';      // <-- Chevron fold/unfold button
    const Na__BreadcrumbNav__GalleryLinkId   = 'naBreadcrumbGalleryLink';    // <-- ValeVision Gallery gallery anchor
    const Na__BreadcrumbNav__ProjectLinkId   = 'naBreadcrumbProjectLink';    // <-- ValeVision Gallery project page anchor
    const Na__BreadcrumbNav__ProjectNameId   = 'naBreadcrumbProjectName';    // <-- Project display name span
    const Na__BreadcrumbNav__ProjectCodeId   = 'naBreadcrumbProjectCode';    // <-- Project numeric code span
    const Na__BreadcrumbNav__ModelCurrentId  = 'naBreadcrumbModelCurrent';   // <-- "Model View" as the page you are on
    const Na__BreadcrumbNav__ModelLinkId     = 'naBreadcrumbModelLink';      // <-- "Model View" as the way back from a page
    const Na__BreadcrumbNav__PageSeparatorId = 'naBreadcrumbPageSeparator';  // <-- The "/" before the page's name
    const Na__BreadcrumbNav__PageCurrentId   = 'naBreadcrumbPageCurrent';    // <-- The page's own name (Drawing Editor)
    // ------------------------------------------------------------

    // MODULE CONSTANTS | CSS Classes
    // ------------------------------------------------------------
    const Na__BreadcrumbNav__OpenClass = 'na-breadcrumb--open';          // <-- Trail-visible state class
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | What the Model View Link Does on a Page
    // ------------------------------------------------------------
    let Na__BreadcrumbNav__OnModel   = null;                              // <-- The app pages' Back, while a page is up
    let Na__BreadcrumbNav__LinkWired = false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helper Functions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Parse Name and Code Out of the ?project= Value
    // ------------------------------------------------------------
    // Accepts "63403", "63403__Thrower", or "2026/63403__Thrower" and returns
    // { code, name } with name null when the value carries no folder name.
    function Na__BreadcrumbNav__ParseProjectParam(projectParam) {
        const folder = String(projectParam || '').trim().split('/').pop();   // <-- Strip any year prefix
        const match  = folder.match(/^(\d+)__(.+)$/);                        // <-- "63403__Thrower" form

        if (match) {
            return { code: match[1], name: match[2].replace(/_/g, ' ').trim() };
        }
        return { code: folder, name: null };                                 // <-- Bare code (or unknown format)
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a ValeVision Gallery URL (Gallery or Project Page)
    // ------------------------------------------------------------
    // The Gallery is its own app on the same server, at /project-gallery/
    // (the URL Configurator's route); its project page is ?id=<library id>
    // ("64135__Washington"), the id ValeVision 3D is opened with.
    // ------------------------------------------------------------
    const Na__BreadcrumbNav__GalleryRoute = '/project-gallery/';
    function Na__BreadcrumbNav__BuildGalleryUrl(projectId) {
        if (!projectId) return Na__BreadcrumbNav__GalleryRoute;               // <-- Gallery (no deep link)
        return `${Na__BreadcrumbNav__GalleryRoute}?id=${encodeURIComponent(projectId)}`;   // <-- Project page deep link
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write the Project Crumb Label and Deep Link
    // ------------------------------------------------------------
    function Na__BreadcrumbNav__SetProjectCrumb(displayName, projectCode) {
        const nameEl = document.getElementById(Na__BreadcrumbNav__ProjectNameId);
        const codeEl = document.getElementById(Na__BreadcrumbNav__ProjectCodeId);
        const linkEl = document.getElementById(Na__BreadcrumbNav__ProjectLinkId);

        if (nameEl) nameEl.textContent = displayName || 'Project';
        if (codeEl) codeEl.textContent = projectCode ? `- ${projectCode}` : '';
        if (linkEl) linkEl.href = Na__BreadcrumbNav__BuildGalleryUrl(Na__AppUtils__GetProjectFolderFromUrl() || Na__AppUtils__GetProjectCodeFromUrl() || projectCode);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize the Breadcrumb Navigation Menu
    // ------------------------------------------------------------
    function Na__Feature__BreadcrumbNav__Initialize() {
        const nav       = document.getElementById(Na__BreadcrumbNav__NavId);
        const toggleBtn = document.getElementById(Na__BreadcrumbNav__ToggleBtnId);
        if (!nav || !toggleBtn) return;                                      // <-- Guard: markup not in DOM

        const projectParam = Na__AppUtils__GetProjectCodeFromUrl();
        if (!projectParam) return;                                           // <-- No project loaded: stay hidden

        // SEED CRUMBS FROM THE URL PARAM | Instant labels, no fetch needed
        const parsed     = Na__BreadcrumbNav__ParseProjectParam(projectParam);
        const galleryEl  = document.getElementById(Na__BreadcrumbNav__GalleryLinkId);
        if (galleryEl) galleryEl.href = Na__BreadcrumbNav__BuildGalleryUrl(null);
        Na__BreadcrumbNav__SetProjectCrumb(parsed.name, parsed.code);

        nav.hidden = false;                                                  // <-- Reveal the collapsed chevron

        // TOGGLE | Trail stays open until the chevron is clicked again
        toggleBtn.addEventListener('click', () => {
            const isOpen = nav.classList.toggle(Na__BreadcrumbNav__OpenClass);
            toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        // REFINE FROM PROJECT JSON | Memoised fetch: reuses the boot request
        Na__AppUtils__FetchProjectJson(projectParam)
            .then((projectJson) => {
                if (!projectJson) return;
                const alias = String(projectJson.projectNameAlias || '').trim();
                const name  = alias || projectJson.projectName || parsed.name;
                const code  = projectJson.projectCode || parsed.code;
                Na__BreadcrumbNav__SetProjectCrumb(name, code);
            })
            .catch(() => {});                                                // <-- Keep URL-derived labels on failure
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Page Crumb
// -----------------------------------------------------------------------------

    // FUNCTION | Name the Page That Is Up (null: the 3D Model View)
    // ------------------------------------------------------------
    // page: { label, modelHref, onModel } - the page's name, the Model View's
    // address (a real link, so it can still be opened deliberately elsewhere)
    // and what a plain click on Model View does (the app pages' Back).
    // ------------------------------------------------------------
    function Na__Feature__BreadcrumbNav__SetPage(page) {
        const onPage       = !!(page && page.label);
        const modelCurrent = document.getElementById(Na__BreadcrumbNav__ModelCurrentId);
        const modelLink    = document.getElementById(Na__BreadcrumbNav__ModelLinkId);
        const separator    = document.getElementById(Na__BreadcrumbNav__PageSeparatorId);
        const pageCurrent  = document.getElementById(Na__BreadcrumbNav__PageCurrentId);

        if (modelCurrent) modelCurrent.hidden = onPage;
        if (separator)    separator.hidden    = !onPage;
        if (pageCurrent) {
            pageCurrent.hidden      = !onPage;
            pageCurrent.textContent = onPage ? String(page.label) : '';
        }
        if (modelLink) {
            modelLink.hidden = !onPage;
            if (onPage && page.modelHref) modelLink.href = page.modelHref;
        }
        Na__BreadcrumbNav__OnModel = (onPage && typeof page.onModel === 'function') ? page.onModel : null;

        // WIRE ONCE | A plain click goes back in this window; a Ctrl, Shift or middle click stays the browser's
        if (modelLink && !Na__BreadcrumbNav__LinkWired) {
            Na__BreadcrumbNav__LinkWired = true;
            modelLink.addEventListener('click', (event) => {
                if (!Na__BreadcrumbNav__OnModel) return;
                if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                Na__BreadcrumbNav__OnModel();
            });
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Breadcrumb Navigation API
    // ------------------------------------------------------------
    export {
        Na__Feature__BreadcrumbNav__Initialize,
        Na__Feature__BreadcrumbNav__SetPage
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
