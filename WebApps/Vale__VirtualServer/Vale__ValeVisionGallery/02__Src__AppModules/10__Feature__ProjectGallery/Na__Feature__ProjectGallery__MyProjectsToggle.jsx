// =============================================================================
// VALEVISION GALLERY - MY PROJECTS TOGGLE COMPONENT
// =============================================================================
//
// FILE       : Na__Feature__ProjectGallery__MyProjectsToggle.jsx
// NAMESPACE  : ValeVision Gallery
// MODULE     : MyProjectsToggle Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The My Projects / All Projects button, and the empty My Projects message
// CREATED    : 13-Oct-2026
//
// DESCRIPTION:
// - One button showing the current view: "My Projects" (one person, on a
//   dark Vale blue fill, so it is clear a filter is on) or "All Projects"
//   (two people, on white like Project Filters). A click flicks to the other.
//   Only Designers and Concept Artists get it (Na__Feature__ProjectGallery__MyProjects.js).
// - Sits between the search box and Project Filters; on phones it takes the
//   old Blockout Models tab's place on the first row, beside the mode tabs.
// - Icons are SVG files (04__Assets__AppGraphics) drawn at the funnel icon's
//   weight; on the dark fill a CSS filter turns them white.
// - MyProjectsEmptyState: when My Projects shows nothing, it says why and
//   offers View All Projects with the number that would show there.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 13-Oct-2026 - Version 1.0.0
// - Initial release.
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | MyProjectsToggle Component
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Label and Icon for Each View
    // ------------------------------------------------------------
    const MY_PROJECTS_TOGGLE_VIEWS = {
        mine : { label: 'My Projects',  icon: '04__Assets__AppGraphics/Na__Icon__MyProjects__.svg',  next: 'all'  },
        all  : { label: 'All Projects', icon: '04__Assets__AppGraphics/Na__Icon__AllProjects__.svg', next: 'mine' },
    };
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whose Projects, in Words ("your", or the previewed person's)
    // ------------------------------------------------------------
    function myProjectsOwnerWords(viewer) {
        return viewer.isPreview ? `${viewer.galleryName}'s` : 'your';
    }
    // ---------------------------------------------------------------


    // COMPONENT | My Projects / All Projects Toggle Button
    // ------------------------------------------------------------
    function MyProjectsToggle({ viewer, projectScope, onScopeChange }) {
        if (!viewer) return null;                                            // <-- Not a Designer or Concept Artist: no button

        const isMine  = projectScope === 'mine';
        const view    = MY_PROJECTS_TOGGLE_VIEWS[isMine ? 'mine' : 'all'];
        const whose   = myProjectsOwnerWords(viewer);
        const preview = viewer.isPreview ? ` (previewing ${viewer.galleryName}, App Admin)` : '';
        const tip     = isMine
            ? `${view.label}${preview}: showing ${whose} projects only. Click to view all projects.`
            : `${view.label}${preview}: showing every project. Click to show ${whose} projects only.`;

        return (
            <button
                type="button"
                className={`my-projects-toggle${isMine ? ' my-projects-toggle--mine' : ''}`}
                onClick={() => onScopeChange(view.next)}
                title={tip}
                aria-label={tip}
            >
                <img
                    src={view.icon}
                    alt=""
                    className="my-projects-toggle__icon"
                    aria-hidden="true"
                    width="14"
                    height="14"
                />
                <span className="my-projects-toggle__text">{view.label}</span>
            </button>
        );
    }
    // ---------------------------------------------------------------


    // COMPONENT | Nothing in My Projects (offers View All Projects)
    // ------------------------------------------------------------
    function MyProjectsEmptyState({ viewer, galleryMode, isSearching, isFiltering, allMatchCount, onViewAll }) {
        const whose = myProjectsOwnerWords(viewer);
        let message = `None of ${whose} projects are in the gallery yet.`;
        if (galleryMode === 'maxmodel') message = `None of ${whose} projects are Max Models.`;
        if (galleryMode === 'blockout') message = `None of ${whose} projects have blockout models.`;
        if (isFiltering)                message = `None of ${whose} projects match these filters.`;
        if (isSearching)                message = `None of ${whose} projects match your search.`;

        return (
            <div className="my-projects-empty">
                <p className="my-projects-empty__text">{message}</p>
                {allMatchCount > 0 && (
                    <button type="button" className="my-projects-empty__button" onClick={onViewAll}>
                        <img
                            src={MY_PROJECTS_TOGGLE_VIEWS.all.icon}
                            alt=""
                            className="my-projects-toggle__icon"
                            aria-hidden="true"
                            width="14"
                            height="14"
                        />
                        View All Projects ({allMatchCount})
                    </button>
                )}
            </div>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
