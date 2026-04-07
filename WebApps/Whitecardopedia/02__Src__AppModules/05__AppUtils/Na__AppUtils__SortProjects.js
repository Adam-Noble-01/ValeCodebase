// =============================================================================
// WHITECARDOPEDIA - SORT PROJECTS UTILITY
// =============================================================================
//
// FILE       : sortProjects.js
// NAMESPACE  : Whitecardopedia
// MODULE     : SortProjects
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Project sorting utility
// CREATED    : 2025
//
// DESCRIPTION:
// - Utility function for sorting projects by various criteria
// - Supports sorting by date (newest/oldest)
// - Supports sorting by name (A-Z / Z-A)
// - Supports sorting by project code (A-Z / Z-A)
// - Returns sorted array without mutating original
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Project Sorting Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Sort Projects by Selected Criteria
    // ---------------------------------------------------------------
    function sortProjects(projects, sortBy) {
        const sorted = [...projects];                                        // <-- Create copy to avoid mutation
        
        switch (sortBy) {
            case 'date-newest':
                return sorted.sort((a, b) => {
                    const dateA = parseProjectDate(a.scheduleData?.dateFulfilled);  // <-- Parse dateFulfilled A
                    const dateB = parseProjectDate(b.scheduleData?.dateFulfilled);  // <-- Parse dateFulfilled B
                    if (!dateA) return 1;                                    // <-- Handle invalid dates
                    if (!dateB) return -1;                                   // <-- Handle invalid dates
                    return dateB - dateA;                                    // <-- Newest first (descending)
                });
                
            case 'date-oldest':
                return sorted.sort((a, b) => {
                    const dateA = parseProjectDate(a.scheduleData?.dateFulfilled);  // <-- Parse dateFulfilled A
                    const dateB = parseProjectDate(b.scheduleData?.dateFulfilled);  // <-- Parse dateFulfilled B
                    if (!dateA) return 1;                                    // <-- Handle invalid dates
                    if (!dateB) return -1;                                   // <-- Handle invalid dates
                    return dateA - dateB;                                    // <-- Oldest first (ascending)
                });
                
            case 'name-asc':
                return sorted.sort((a, b) => {
                    const nameA = (a.projectName || '').toLowerCase();       // <-- Get name A lowercase
                    const nameB = (b.projectName || '').toLowerCase();       // <-- Get name B lowercase
                    return nameA.localeCompare(nameB);                       // <-- A to Z
                });
                
            case 'name-desc':
                return sorted.sort((a, b) => {
                    const nameA = (a.projectName || '').toLowerCase();       // <-- Get name A lowercase
                    const nameB = (b.projectName || '').toLowerCase();       // <-- Get name B lowercase
                    return nameB.localeCompare(nameA);                       // <-- Z to A
                });
                
            case 'code-asc':
                return sorted.sort((a, b) => {
                    const codeA = (a.projectCode || '').toLowerCase();       // <-- Get code A lowercase
                    const codeB = (b.projectCode || '').toLowerCase();       // <-- Get code B lowercase
                    return codeA.localeCompare(codeB);                       // <-- A to Z
                });
                
            case 'code-desc':
                return sorted.sort((a, b) => {
                    const codeA = (a.projectCode || '').toLowerCase();       // <-- Get code A lowercase
                    const codeB = (b.projectCode || '').toLowerCase();       // <-- Get code B lowercase
                    return codeB.localeCompare(codeA);                       // <-- Z to A
                });
                
            default:
                return sorted;                                               // <-- Return unsorted if unknown option
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

