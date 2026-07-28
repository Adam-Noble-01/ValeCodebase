// =============================================================================
// VALEVISION3D - BREADCRUMB NAVIGATION MENU CONTROLS
// =============================================================================
//
// FILE       : Na__Feature__BreadcrumbNav__Controls.js
// NAMESPACE  : Na__Feature
// MODULE     : Breadcrumb Navigation Menu
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Collapsed top-left breadcrumb trail back to Whitecardopedia
// CREATED    : 28-Jul-2026
//
// DESCRIPTION:
// - Compact chevron button fixed top-left; clicking it unfolds the breadcrumb
//   trail "Project Gallery / <Name> - <Code> / Model View".
// - "Project Gallery" links to the Whitecardopedia gallery; the project crumb
//   deep-links to that project's Whitecardopedia page (app.html?id=<code>).
// - Only shown when the app booted with a ?project= URL parameter; hidden
//   otherwise (dev boots with the default cube have nowhere to crumb back to).
// - Labels seed instantly from the ?project= value (e.g. "63403__Thrower"),
//   then refine from project.json once the memoised fetch resolves.
// - Trail stays open until the chevron is clicked again (no click-away).
// - Markup lives in index.html (#naBreadcrumbNav) following the established
//   stable-element-ID pattern; this module owns behaviour and link targets.
//
// INTEGRATION:
// - Call Na__Feature__BreadcrumbNav__Initialize() from index.html after the
//   loading sequence has been started (fetch is memoised so this never adds
//   a second network request for project.json).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 28-Jul-2026 - Version 1.0.0
// - Initial implementation: collapsed chevron menu, Whitecardopedia links.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Project Loader Utilities
    // ------------------------------------------------------------
    import {
        Na__AppUtils__GetProjectCodeFromUrl,
        Na__AppUtils__FetchProjectJson,
        Na__AppUtils__IsRunningOnLocalhost
    } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Element IDs
    // ------------------------------------------------------------
    const Na__BreadcrumbNav__NavId         = 'naBreadcrumbNav';          // <-- Fixed top-left container
    const Na__BreadcrumbNav__ToggleBtnId   = 'naBreadcrumbToggleBtn';    // <-- Chevron fold/unfold button
    const Na__BreadcrumbNav__GalleryLinkId = 'naBreadcrumbGalleryLink';  // <-- Whitecardopedia gallery anchor
    const Na__BreadcrumbNav__ProjectLinkId = 'naBreadcrumbProjectLink';  // <-- Whitecardopedia project page anchor
    const Na__BreadcrumbNav__ProjectNameId = 'naBreadcrumbProjectName';  // <-- Project display name span
    const Na__BreadcrumbNav__ProjectCodeId = 'naBreadcrumbProjectCode';  // <-- Project numeric code span
    // ------------------------------------------------------------

    // MODULE CONSTANTS | CSS Classes
    // ------------------------------------------------------------
    const Na__BreadcrumbNav__OpenClass = 'na-breadcrumb--open';          // <-- Trail-visible state class
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


    // HELPER FUNCTION | Build a Whitecardopedia URL (Gallery or Project Page)
    // ------------------------------------------------------------
    // Localhost: the Flask dev server hosts Whitecardopedia at the site root
    // and ValeVision under /ValeVision3D/, so the gallery is /app.html.
    // Production (GH Pages): both apps sit side by side under /WebApps/.
    function Na__BreadcrumbNav__BuildWhitecardopediaUrl(projectCode) {
        const base = Na__AppUtils__IsRunningOnLocalhost()
            ? '/app.html'                                                    // <-- Flask serves Whitecardopedia at root
            : '../Whitecardopedia/app.html';                                 // <-- Static sibling app route

        if (!projectCode) return base;                                       // <-- Gallery (no deep link)
        return `${base}?id=${encodeURIComponent(projectCode)}`;              // <-- Project page deep link
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
        if (linkEl) linkEl.href = Na__BreadcrumbNav__BuildWhitecardopediaUrl(projectCode);
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
        if (galleryEl) galleryEl.href = Na__BreadcrumbNav__BuildWhitecardopediaUrl(null);
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
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Breadcrumb Navigation API
    // ------------------------------------------------------------
    export {
        Na__Feature__BreadcrumbNav__Initialize
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
