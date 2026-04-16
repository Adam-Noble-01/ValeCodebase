/* =============================================================================
   VALESPEC - DOCUMENT ISSUE DATA HANDLER
   =============================================================================

   FILE       : ValeSpec__DocPreview__DocIssueHandler__.js
   NAMESPACE  : ValeSpec
   MODULE     : DocPreview - DocIssueHandler
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Track and persist the "Issued" date when a document is finalised
   CREATED    : 16-Apr-2026

   DESCRIPTION:
   - Stamps the current date onto project metadata when a document is issued
   - Issued date is written when a PDF is successfully exported
   - Provides a placeholder hook for future email-based issue stamping
   - Reads the current issued date for display in the Document Control header
   - Persists via ProjectFileManager.SaveProject for disk + cache parity

   ============================================================================= */

// =============================================================================
// REGION | Document Issue Handler Module
// =============================================================================

const ValeSpec__DocPreview__DocIssueHandler = (function() {

    // MODULE CONSTANTS | Metadata Key
    // ------------------------------------------------------------
    const METADATA_SECTION_KEY  =  'ValeSpec__ProjectFile__Metadata';
    const DATE_ISSUED_KEY       =  'ValeSpec__ProjectFile__Metadata__DateIssued';
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Active Project Data from State
    // ------------------------------------------------------------
    function ValeSpec__DocIssueHandler__GetActiveProjectData() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return null;
        var state  =  StateManager.ValeSpec__StateManager__GetState();
        if (state && state.currentProject) return state.currentProject;
        return (state && state.projectData) ? state.projectData : null; // <-- Backward-compat fallback
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Today as YYYY-MM-DD
    // ------------------------------------------------------------
    function ValeSpec__DocIssueHandler__GetTodayIso() {
        return new Date().toISOString().split('T')[0];
    }
    // ------------------------------------------------------------


    // FUNCTION | Read Current Issued Date from Active Project
    // ------------------------------------------------------------
    function ValeSpec__DocIssueHandler__GetIssuedDate() {
        var projectData  =  ValeSpec__DocIssueHandler__GetActiveProjectData();
        if (!projectData) return '';
        var metadata  =  projectData[METADATA_SECTION_KEY];
        if (!metadata) return '';
        return metadata[DATE_ISSUED_KEY] || '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Stamp Issued Date via PDF Export
    // ------------------------------------------------------------
    function ValeSpec__DocIssueHandler__StampIssuedDate() {
        var projectData  =  ValeSpec__DocIssueHandler__GetActiveProjectData();
        if (!projectData) {
            console.warn('[ValeSpec__DocIssueHandler] No active project data — cannot stamp issued date.');
            return false;
        }

        var metadata  =  projectData[METADATA_SECTION_KEY];
        if (!metadata) {
            console.warn('[ValeSpec__DocIssueHandler] No metadata section — cannot stamp issued date.');
            return false;
        }

        var todayIso  =  ValeSpec__DocIssueHandler__GetTodayIso();
        metadata[DATE_ISSUED_KEY]  =  todayIso;

        var ProjectFileManager  =  window.ValeSpec__AppData__ProjectFileManager;
        if (ProjectFileManager && ProjectFileManager.ValeSpec__ProjectFileManager__SaveProject) {
            ProjectFileManager.ValeSpec__ProjectFileManager__SaveProject(projectData, 'docIssue:pdfExport');
        }

        console.log('[ValeSpec__DocIssueHandler] Issued date stamped: ' + todayIso + ' (via PDF export)');
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Stamp Issued Date via Email (Placeholder)
    // ------------------------------------------------------------
    function ValeSpec__DocIssueHandler__StampIssuedViaEmail() {
        console.log('[ValeSpec__DocIssueHandler] Email issue handler placeholder — Microsoft Graph integration pending.');
        return false;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__DocIssueHandler__GetIssuedDate        : ValeSpec__DocIssueHandler__GetIssuedDate,
        ValeSpec__DocIssueHandler__StampIssuedDate       : ValeSpec__DocIssueHandler__StampIssuedDate,
        ValeSpec__DocIssueHandler__StampIssuedViaEmail   : ValeSpec__DocIssueHandler__StampIssuedViaEmail
    };
    // ------------------------------------------------------------

})();

// endregion ===================================================================

window.ValeSpec__DocPreview__DocIssueHandler  =  ValeSpec__DocPreview__DocIssueHandler;
