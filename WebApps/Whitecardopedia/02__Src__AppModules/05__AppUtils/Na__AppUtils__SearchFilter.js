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
// - Searches project display name (alias when set, else raw projectName),
//   the raw project name, and project code (ID number)
// - Case-insensitive search for better user experience
// - Returns filtered array of projects matching search criteria
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 2025 - Version 1.0.0
// - Initial implementation.
//
// 08-Jul-2026 - Version 1.1.0
// - Also matches against project.displayName (the alias, when set) so
//   searching by an alias finds the project even when it differs from the
//   raw projectName/folder name.
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
            const projectName  = (project.projectName || '').toLowerCase();  // <-- Get raw project name in lowercase
            const displayName  = (project.displayName || '').toLowerCase();  // <-- Get display name (alias-aware) in lowercase
            const projectCode  = (project.projectCode || '').toLowerCase();  // <-- Get project code in lowercase
            
            return projectName.includes(normalizedSearch) ||                 // <-- Check if raw name matches
                   displayName.includes(normalizedSearch) ||                 // <-- Check if display name/alias matches
                   projectCode.includes(normalizedSearch);                   // <-- Check if code matches
        });
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

