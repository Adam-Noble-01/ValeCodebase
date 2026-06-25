// =============================================================================
// WHITECARDOPEDIA - FILTER CONTROLS COMPONENT
// =============================================================================
//
// FILE       : Na__Feature__ProjectGallery__FilterControls.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : FilterControls Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Artist and designer filter dropdowns for the project gallery
// CREATED    : 25-Jun-2026
//
// DESCRIPTION:
// - Two dropdown selects for filtering projects by concept artist and designer
// - Options sourced from vale__ConceptArtist__OptionsList / vale__Designer__OptionsList
// - Each dropdown has an "All" first option to show all projects unfiltered
// - Callbacks to parent component with selected filter values
// - Reuses existing .project-gallery__sort-control CSS classes for consistent styling
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 25-Jun-2026 - Version 1.0.0
// - Initial Release
// - Artist and designer filter dropdowns wired to ProductionData fields
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | FilterControls Component
// -----------------------------------------------------------------------------

    // COMPONENT | Artist and Designer Filter Dropdown Controls
    // ------------------------------------------------------------
    function FilterControls({ filterArtist, filterDesigner, artistOptions, designerOptions, onArtistChange, onDesignerChange }) {

        // SUB FUNCTION | Handle Artist Filter Change
        // ---------------------------------------------------------------
        const handleArtistChange = (event) => {
            onArtistChange(event.target.value);                              // <-- Pass artist filter value to parent
        };
        // ---------------------------------------------------------------


        // SUB FUNCTION | Handle Designer Filter Change
        // ---------------------------------------------------------------
        const handleDesignerChange = (event) => {
            onDesignerChange(event.target.value);                            // <-- Pass designer filter value to parent
        };
        // ---------------------------------------------------------------


        return (
            <>
                <div className="project-gallery__sort-control">
                    <label
                        htmlFor="filter-artist-select"
                        className="project-gallery__sort-label"
                    >
                        Artist:
                    </label>
                    <select
                        id="filter-artist-select"
                        className="project-gallery__sort-select"
                        value={filterArtist}
                        onChange={handleArtistChange}
                        aria-label="Filter projects by concept artist"
                    >
                        <option value="all">All Artists</option>
                        {artistOptions.map(artist => (
                            <option key={artist} value={artist}>{artist}</option>
                        ))}
                    </select>
                </div>

                <div className="project-gallery__sort-control">
                    <label
                        htmlFor="filter-designer-select"
                        className="project-gallery__sort-label"
                    >
                        Designer:
                    </label>
                    <select
                        id="filter-designer-select"
                        className="project-gallery__sort-select"
                        value={filterDesigner}
                        onChange={handleDesignerChange}
                        aria-label="Filter projects by designer"
                    >
                        <option value="all">All Designers</option>
                        {designerOptions.map(designer => (
                            <option key={designer} value={designer}>{designer}</option>
                        ))}
                    </select>
                </div>
            </>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
