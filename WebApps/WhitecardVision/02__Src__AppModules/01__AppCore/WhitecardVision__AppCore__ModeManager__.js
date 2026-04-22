/* =============================================================================
 WHITECARDVISION - MODE MANAGER (4 MODES)
=============================================================================
 FILE       : WhitecardVision__AppCore__ModeManager__.js
 NAMESPACE  : Wv
 MODULE     : AppCore - ModeManager
 PURPOSE    : Nav-tab highlight + panel show/hide for Render / Editor /
              FilterSuite / FinalPreview.
              Enforces project-load requirement: all tabs except Projects
              are disabled until a project is loaded.
============================================================================= */

// =============================================================================
// REGION | Mode Manager Module
// =============================================================================

(function () {
    'use strict';


    // FUNCTION | Install click handlers on every nav tab
    // ------------------------------------------------------------
    function Wv__ModeManager__InstallNavigationBar() {
        const navigationBarElement = document.getElementById('Wv__App__NavigationBar');
        if (!navigationBarElement) { console.warn('[ModeManager] nav bar not found'); return; }

        const tabElements = navigationBarElement.querySelectorAll('.Wv__App__NavTab');
        tabElements.forEach((tabElement) => {
            tabElement.addEventListener('click', (clickEvent) => {
                clickEvent.preventDefault();
                if (tabElement.classList.contains('Wv__App__NavTab--Disabled')) return;         //<-- JS guard: belt-and-braces alongside CSS pointer-events.
                const targetModeId = tabElement.getAttribute('data-wv-mode');
                if (targetModeId) Wv__ModeManager__SwitchToMode(targetModeId);
            });
        });

        window.Wv__AppCore__StateManager.Wv__StateManager__On(
            'activeProjectChanged',
            Wv__ModeManager__UpdateNavState
        );

        Wv__ModeManager__UpdateNavState(null);                                                   //<-- Set initial disabled state before any project is loaded.
    }
    // ------------------------------------------------------------


    // FUNCTION | Enable/disable tabs based on whether a project is active
    // ------------------------------------------------------------
    function Wv__ModeManager__UpdateNavState(projectTree) {
        const navigationBarElement = document.getElementById('Wv__App__NavigationBar');
        if (!navigationBarElement) return;

        const hasProject = !!projectTree;

        navigationBarElement.querySelectorAll('.Wv__App__NavTab').forEach((tabElement) => {
            const tabModeId = tabElement.getAttribute('data-wv-mode');
            if (tabModeId === 'ProjectManager') return;                                          //<-- Projects tab is always enabled.
            if (tabModeId === 'FinalPreview')   return;                                          //<-- FinalPreview manages its own state via FinalPreview__Controller.

            tabElement.classList.toggle('Wv__App__NavTab--Disabled', !hasProject);
        });

        if (!hasProject) {
            const finalPreviewTab = navigationBarElement.querySelector('[data-wv-mode="FinalPreview"]');
            if (finalPreviewTab) finalPreviewTab.classList.add('Wv__App__NavTab--Disabled');     //<-- Also disable FinalPreview when no project is loaded.
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Switch the UI to a given mode id
    // ------------------------------------------------------------
    function Wv__ModeManager__SwitchToMode(targetModeId) {
        const appConfig        = window.Wv__AppCore__StateManager.Wv__StateManager__GetAppConfig();
        const registeredModes  = ((appConfig || {}).Wv__AppConfig__Modes || {}).Wv__AppConfig__Modes__Registered || [];
        const matchingMode     = registeredModes.find(entry => entry.modeId === targetModeId);
        if (!matchingMode) { console.warn('[ModeManager] unknown mode id:', targetModeId); return; }

        for (const modeDescriptor of registeredModes) {
            const panelElement = document.getElementById(modeDescriptor.panelElementId);
            if (panelElement) panelElement.hidden = (modeDescriptor.modeId !== targetModeId);
        }

        const navigationBarElement = document.getElementById('Wv__App__NavigationBar');
        if (navigationBarElement) {
            navigationBarElement.querySelectorAll('.Wv__App__NavTab').forEach((tabElement) => {
                const tabModeId = tabElement.getAttribute('data-wv-mode');
                tabElement.classList.toggle('Wv__App__NavTab--Active', tabModeId === targetModeId);
            });
        }

        window.Wv__AppCore__StateManager.Wv__StateManager__SetActiveModeId(targetModeId);

        Wv__ModeManager__DispatchOnActivatedHook(targetModeId);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fire controller.__OnActivated() if the target mode's controller exposes it
    // ------------------------------------------------------------
    //  Every mode-owning controller may optionally expose an `Wv__<ModeId>__Controller__OnActivated`
    //  hook. We route by convention: modeId "ProjectManager" -> `Wv__ProjectManager__Controller`,
    //  "Render" -> `Wv__RenderMode__Controller`, etc.
    // ------------------------------------------------------------
    function Wv__ModeManager__DispatchOnActivatedHook(activatedModeId) {
        const controllerBindings = {
            'ProjectManager' : { globalKey: 'Wv__ProjectManager__Controller', hookKey: 'Wv__ProjectManager__Controller__OnActivated' },
            'Render'         : { globalKey: 'Wv__RenderMode__Controller',     hookKey: 'Wv__RenderMode__Controller__OnActivated'     },
            'Editor'         : { globalKey: 'Wv__EditMode__Controller',       hookKey: 'Wv__EditMode__Controller__OnActivated'       },
            'FilterSuite'    : { globalKey: 'Wv__FilterSuite__Controller',    hookKey: 'Wv__FilterSuite__Controller__OnActivated'    },
            'FinalPreview'   : { globalKey: 'Wv__FinalPreview__Controller',   hookKey: 'Wv__FinalPreview__Controller__OnActivated'   }
        };
        const binding = controllerBindings[activatedModeId];
        if (!binding) return;
        const controllerObject = window[binding.globalKey];
        if (controllerObject && typeof controllerObject[binding.hookKey] === 'function') {
            try { controllerObject[binding.hookKey](); }
            catch (hookError) { console.warn('[ModeManager] ' + binding.hookKey + ' threw:', hookError); }
        }
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    window.Wv__AppCore__ModeManager = {
        Wv__ModeManager__InstallNavigationBar,
        Wv__ModeManager__SwitchToMode
    };
    // ------------------------------------------------------------

})();

// endregion ===================================================================
