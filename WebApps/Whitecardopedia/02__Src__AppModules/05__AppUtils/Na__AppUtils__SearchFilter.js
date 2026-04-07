// =============================================================================
// WHITECARDOPEDIA - SEARCH FILTER UTILITY
// =============================================================================
//
// FILE       : searchFilter.js
// NAMESPACE  : Whitecardopedia
// MODULE     : SearchFilter
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Project search filtering utility
// CREATED    : 2025
//
// DESCRIPTION:
// - Utility function for filtering projects by search term
// - Searches project name and project code (ID number)
// - Case-insensitive search for better user experience
// - Returns filtered array of projects matching search criteria
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Search Filtering Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Filter Projects by Search Term
    // ------------------------------------------------------------
    function filterProjects(projects, searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            return projects;                                                 // <-- Return all projects if no search term
        }
        
        const normalizedSearch = searchTerm.toLowerCase().trim();            // <-- Normalize search term for comparison
        
        return projects.filter(project => {
            const projectName = (project.projectName || '').toLowerCase();   // <-- Get project name in lowercase
            const projectCode = (project.projectCode || '').toLowerCase();   // <-- Get project code in lowercase
            
            return projectName.includes(normalizedSearch) ||                 // <-- Check if name matches
                   projectCode.includes(normalizedSearch);                   // <-- Check if code matches
        });
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

