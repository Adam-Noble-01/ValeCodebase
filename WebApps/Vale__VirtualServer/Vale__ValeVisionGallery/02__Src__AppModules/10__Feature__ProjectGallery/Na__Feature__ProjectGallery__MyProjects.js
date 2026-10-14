// =============================================================================
// VALEVISION GALLERY - MY PROJECTS (WHO OPENS ON THEIR OWN PROJECTS)
// =============================================================================
//
// FILE       : Na__Feature__ProjectGallery__MyProjects.js
// NAMESPACE  : ValeVision Gallery
// MODULE     : MyProjects
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Open the gallery on a Designer's or Concept Artist's own projects
// CREATED    : 13-Oct-2026
//
// DESCRIPTION:
// - Designers and Concept Artists (the account's Role in the user register)
//   open the gallery on My Projects: the projects naming them as designer OR
//   concept artist (Dan also sees the Martin jobs he drew the concept for).
//   The My Projects / All Projects button flicks between the two. Everyone
//   else sees every project and has no button.
// - A person's name on the projects is their first name (Dan, Rachael). An
//   account whose projects carry another name is listed by USR code in the
//   master config, vale__MyProjects__GalleryNameByUserCode (Edward is Ted).
// - The choice lasts until the app is closed (sessionStorage): opening a
//   project and coming back keeps it; a fresh launch opens on My Projects.
// - App Admins preview a person's view with ?viewAs=<name> (?viewAs=Dan): the
//   gallery opens exactly as it does for Dan. Ignored for everyone else. The
//   parameter name works in any case (?ViewAs=Gary). Read once at start-up,
//   before the app tidies the URL, so it holds until the page is reloaded
//   without it.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 13-Oct-2026 - Version 1.0.0
// - Initial release.
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | My Projects Configuration
    // ------------------------------------------------------------
    const MY_PROJECTS_CONFIG = {
        roles               : ['designer', 'concept artist'],            // <-- Register roles that open on My Projects (compared in lower case)
        storageKeyPrefix    : 'vvg-project-scope__',                     // <-- sessionStorage key: + the USR code (or viewAs-<name>)
        viewAsParam         : 'viewas',                                  // <-- App Admin preview parameter, matched in any case
    };

    const MY_PROJECTS_VIEW_AS = readMyProjectsViewAs();                  // <-- App Admin preview name, read before the URL is tidied
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Who Opens on My Projects
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Compare Names (trimmed, any case)
    // ------------------------------------------------------------
    function normaliseMyProjectsName(value) {
        return String(value == null ? '' : value).trim().toLowerCase();
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | The ?viewAs= Name From the URL ('' when absent)
    // ------------------------------------------------------------
    // URL parameter names are case-sensitive, so ?ViewAs=Gary would be missed
    // by a plain get('viewAs'). Any case is accepted instead.
    // ------------------------------------------------------------
    function readMyProjectsViewAs() {
        let name = '';
        new URLSearchParams(window.location.search).forEach((value, key) => {
            if (!name && key.toLowerCase() === MY_PROJECTS_CONFIG.viewAsParam) name = value.trim();   // <-- ?viewAs=, ?ViewAs=, ?viewas=
        });
        return name;
    }
    // ---------------------------------------------------------------


    // FUNCTION | The Person My Projects Is For (null = all projects, no button)
    // ------------------------------------------------------------
    // Returns { galleryName, storageKey, isPreview }. galleryName is the name the
    // projects carry in productionData.designer / productionData.conceptArtist.
    // nameByUserCode comes from the master config (null while it loads).
    // ------------------------------------------------------------
    function getMyProjectsViewer(nameByUserCode) {
        const login = window.ValeUserLogin;
        const user  = login ? login.User() : null;
        if (!user) return null;                                              // <-- Not signed in: nothing to go by

        if (MY_PROJECTS_VIEW_AS && login.IsAppAdmin()) {                     // <-- App Admin preview: the gallery as that person gets it
            return {
                galleryName : MY_PROJECTS_VIEW_AS,
                storageKey  : 'viewAs-' + normaliseMyProjectsName(MY_PROJECTS_VIEW_AS),
                isPreview   : true,
            };
        }

        if (!MY_PROJECTS_CONFIG.roles.includes(normaliseMyProjectsName(user.role))) return null;   // <-- Everyone else: all projects

        const listedName  = nameByUserCode ? nameByUserCode[user.code] : '';
        const galleryName = String(listedName || user.first || '').trim();  // <-- First name, unless the master config lists another
        if (!galleryName) return null;
        return { galleryName, storageKey: user.code, isPreview: false };
    }
    // ---------------------------------------------------------------


    // FUNCTION | Is This One of Their Projects (designer or concept artist)
    // ------------------------------------------------------------
    function isMyProject(project, galleryName) {
        const wanted = normaliseMyProjectsName(galleryName);
        const data   = project.productionData || {};
        return !!wanted && (normaliseMyProjectsName(data.designer) === wanted || normaliseMyProjectsName(data.conceptArtist) === wanted);
    }
    // ---------------------------------------------------------------


    // FUNCTION | Filter Projects by Scope ('mine' or 'all')
    // ------------------------------------------------------------
    function filterProjectsByScope(projects, viewer, projectScope) {
        if (!viewer || projectScope !== 'mine') return projects;             // <-- All Projects, or nobody to filter for
        return projects.filter(p => isMyProject(p, viewer.galleryName));
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Choice, Kept Until the App Is Closed
// -----------------------------------------------------------------------------

    // FUNCTION | Read Their Choice (a fresh launch opens on My Projects)
    // ------------------------------------------------------------
    function loadProjectScope(viewer) {
        if (!viewer) return 'all';
        try {
            return window.sessionStorage.getItem(MY_PROJECTS_CONFIG.storageKeyPrefix + viewer.storageKey) === 'all' ? 'all' : 'mine';
        } catch (error) {
            return 'mine';                                                   // <-- Storage blocked: open on My Projects
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Keep Their Choice for This Session
    // ------------------------------------------------------------
    function saveProjectScope(viewer, projectScope) {
        if (!viewer) return;
        try {
            window.sessionStorage.setItem(MY_PROJECTS_CONFIG.storageKeyPrefix + viewer.storageKey, projectScope);
        } catch (error) {
            // Storage blocked (private window): the choice holds until a project is opened
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
