// =============================================================================
// WHITECARDOPEDIA - SORT CONTROLS COMPONENT
// =============================================================================
//
// FILE       : SortControls.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : SortControls Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Sort dropdown component for project ordering
// CREATED    : 2025
//
// DESCRIPTION:
// - Dropdown select for choosing project sort order
// - Options: date (newest/oldest), name (A-Z/Z-A), code (A-Z/Z-A)
// - Callback to parent component with selected sort option
// - Maintains consistent Vale design system styling
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | SortControls Component
// -----------------------------------------------------------------------------

    // COMPONENT | Sort Dropdown Control
    // ------------------------------------------------------------
    function SortControls({ sortBy, onSortChange }) {
        
        // SUB FUNCTION | Handle Sort Option Change
        // ---------------------------------------------------------------
        const handleSortChange = (event) => {
            onSortChange(event.target.value);                                // <-- Pass sort option to parent
        };
        // ---------------------------------------------------------------
        
        
        return (
            <div className="project-gallery__sort-control">
                <label 
                    htmlFor="sort-select" 
                    className="project-gallery__sort-label"
                >
                    Sort by:
                </label>
                <select 
                    id="sort-select"
                    className="project-gallery__sort-select"
                    value={sortBy}
                    onChange={handleSortChange}
                    aria-label="Sort projects by"
                >
                    <option value="date-newest">Date - Newest First</option>
                    <option value="date-oldest">Date - Oldest First</option>
                    <option value="name-asc">Name - A to Z</option>
                    <option value="name-desc">Name - Z to A</option>
                    <option value="code-asc">Project Code - A to Z</option>
                    <option value="code-desc">Project Code - Z to A</option>
                </select>
            </div>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

