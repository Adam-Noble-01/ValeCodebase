// =============================================================================
// WHITECARDOPEDIA - SEARCH BOX COMPONENT
// =============================================================================
//
// FILE       : SearchBox.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : SearchBox Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Search input component for filtering projects
// CREATED    : 2025
//
// DESCRIPTION:
// - Text input field for real-time project search
// - Searches by project name and project code (ID)
// - Clear button appears when search term exists
// - Callback to parent component with search term changes
// - Case-insensitive filtering for better UX
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | SearchBox Component
// -----------------------------------------------------------------------------

    // COMPONENT | Search Box with Clear Button
    // ------------------------------------------------------------
    function SearchBox({ searchTerm, onSearchChange }) {
        
        // SUB FUNCTION | Handle Search Input Change
        // ---------------------------------------------------------------
        const handleInputChange = (event) => {
            onSearchChange(event.target.value);                              // <-- Pass search term to parent
        };
        // ---------------------------------------------------------------
        
        
        // SUB FUNCTION | Clear Search Input
        // ---------------------------------------------------------------
        const handleClear = () => {
            onSearchChange('');                                              // <-- Clear search term in parent
        };
        // ---------------------------------------------------------------
        
        
        return (
            <div className="project-gallery__search-box">
                <input
                    type="text"
                    className="project-gallery__search-input"
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={handleInputChange}
                    aria-label="Search projects by name or code"
                />
                {searchTerm && (
                    <button
                        className="project-gallery__search-clear"
                        onClick={handleClear}
                        aria-label="Clear search"
                        type="button"
                    >
                        ×
                    </button>
                )}
            </div>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

