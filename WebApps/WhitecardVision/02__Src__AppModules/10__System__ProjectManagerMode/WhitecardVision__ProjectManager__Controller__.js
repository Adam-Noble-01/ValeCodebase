/* =============================================================================
 WHITECARDVISION - PROJECT MANAGER - CONTROLLER
=============================================================================
 FILE       : WhitecardVision__ProjectManager__Controller__.js
 NAMESPACE  : Wv
 MODULE     : System - ProjectManagerMode - Controller
 PURPOSE    : Wire the toolbar (search, new, refresh), install the project
              list, and expose an OnActivated hook so the Mode Manager can
              refresh the table whenever the Projects tab is re-entered.
============================================================================= */

// =============================================================================
// REGION | Project Manager Controller
// =============================================================================

(function () {
    'use strict';


    // FUNCTION | One-off initialisation (called from AppCore Init)
    // ------------------------------------------------------------
    function Wv__ProjectManager__Controller__Init() {
        Wv__ProjectManager__Controller__InstallToolbar();
        if (window.Wv__ProjectManager__ProjectList) {
            window.Wv__ProjectManager__ProjectList.Wv__ProjectManager__ProjectList__Install();
        }

        window.Wv__AppCore__StateManager.Wv__StateManager__On('activeProjectChanged', () => {
            if (window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveModeId() === 'ProjectManager'
                && window.Wv__ProjectManager__ProjectList) {
                window.Wv__ProjectManager__ProjectList.Wv__ProjectManager__ProjectList__Refresh();
            }
        });

        Wv__ProjectManager__Controller__RefreshListIfVisible();
    }
    // ------------------------------------------------------------


    // FUNCTION | Mode Manager hook - refresh table on tab activation
    // ------------------------------------------------------------
    function Wv__ProjectManager__Controller__OnActivated() {
        if (window.Wv__ProjectManager__ProjectList) {
            window.Wv__ProjectManager__ProjectList.Wv__ProjectManager__ProjectList__Refresh();
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Public entry point - prompt for a name, create the project, refresh the list
    // ------------------------------------------------------------
    //  1. Switch UI to ProjectManager tab.
    //  2. Prompt the user for a project name via ProjectActions.
    //  3. Refresh the list so the newly-created row appears.
    // ------------------------------------------------------------
    async function Wv__ProjectManager__Controller__TriggerNewProject() {
        const modeManager    = window.Wv__AppCore__ModeManager;
        const projectActions = window.Wv__ProjectManager__ProjectActions;
        const projectList    = window.Wv__ProjectManager__ProjectList;
        if (modeManager) modeManager.Wv__ModeManager__SwitchToMode('ProjectManager');

        if (!projectActions || !projectList) return;
        try {
            const createdDescriptor = await projectActions.Wv__ProjectManager__ProjectActions__CreateProjectWithPrompt();
            if (!createdDescriptor) return;
            await projectList.Wv__ProjectManager__ProjectList__Refresh();
        } catch (createError) {
            console.warn('[ProjectManager] TriggerNewProject failed:', createError);
        }
    }
    // ------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internals
// -----------------------------------------------------------------------------

    function Wv__ProjectManager__Controller__InstallToolbar() {
        const newButtonEl     = document.getElementById('Wv__ProjectManager__Toolbar__NewBtn');
        const refreshButtonEl = document.getElementById('Wv__ProjectManager__Toolbar__RefreshBtn');

        if (newButtonEl) {
            newButtonEl.addEventListener('click', Wv__ProjectManager__Controller__TriggerNewProject);
        }
        if (refreshButtonEl) {
            refreshButtonEl.addEventListener('click', Wv__ProjectManager__Controller__OnActivated);
        }
    }


    function Wv__ProjectManager__Controller__RefreshListIfVisible() {
        const activeModeId = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveModeId();
        if (activeModeId === 'ProjectManager' && window.Wv__ProjectManager__ProjectList) {
            window.Wv__ProjectManager__ProjectList.Wv__ProjectManager__ProjectList__Refresh();
        }
    }

// endregion -------------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    window.Wv__ProjectManager__Controller = {
        Wv__ProjectManager__Controller__Init,
        Wv__ProjectManager__Controller__OnActivated,
        Wv__ProjectManager__Controller__TriggerNewProject
    };
    // ------------------------------------------------------------

})();

// endregion ===================================================================
