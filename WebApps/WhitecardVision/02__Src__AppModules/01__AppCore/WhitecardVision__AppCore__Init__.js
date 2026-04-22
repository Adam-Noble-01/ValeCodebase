/* =============================================================================
 WHITECARDVISION - APP INIT (BOOT SEQUENCE)
=============================================================================
 FILE       : WhitecardVision__AppCore__Init__.js
 NAMESPACE  : Wv
 MODULE     : AppCore - Init
 PURPOSE    : Orchestrate boot after DOMContentLoaded - load config, install
              UI subsystems, then switch to the default mode. LAST script
              in the entry HTML.
============================================================================= */

// =============================================================================
// REGION | App Init Module
// =============================================================================

(function () {
    'use strict';


    // FUNCTION | Top-level boot sequence
    // ------------------------------------------------------------
    async function Wv__AppCore__InitApp() {
        console.log('%c[WhitecardVision] Booting...', 'color:#4f8cff;font-weight:bold');

        try {
            await window.Wv__AppCore__ConfigLoader.Wv__ConfigLoader__LoadAllConfigs();
        } catch (configError) {
            console.error('[Init] Config load failed:', configError);
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Could not load AppConfig: ' + configError.message, 'error');
            return;
        }

        window.Wv__AppUtils__Clipboard.Wv__Clipboard__InstallFocusTracker();
        window.Wv__AppUtils__Hotkeys.Wv__Hotkeys__Install();
        window.Wv__AppUtils__AutoResize.Wv__AutoResize__Install();
        window.Wv__AppUtils__UiHelpers.Wv__UiHelpers__Install();

        window.Wv__AppCore__ModeManager.Wv__ModeManager__InstallNavigationBar();

        if (window.Wv__ProjectManager__Controller) { window.Wv__ProjectManager__Controller.Wv__ProjectManager__Controller__Init(); }
        if (window.Wv__RenderMode__Controller)     { window.Wv__RenderMode__Controller.Wv__RenderMode__Controller__Init();       }
        if (window.Wv__EditMode__Controller)       { window.Wv__EditMode__Controller.Wv__EditMode__Controller__Init();           }
        if (window.Wv__FilterSuite__Controller)    { window.Wv__FilterSuite__Controller.Wv__FilterSuite__Controller__Init();     }
        if (window.Wv__FinalPreview__Controller)   { window.Wv__FinalPreview__Controller.Wv__FinalPreview__Controller__Init();   }

        Wv__AppCore__InstallGlobalHotkeys();
        Wv__AppCore__WireHeaderStatusUpdaters();

        await window.Wv__AppCore__ConfigLoader.Wv__ConfigLoader__RefreshServerHealth();

        const appConfig       = window.Wv__AppCore__StateManager.Wv__StateManager__GetAppConfig();
        const defaultModeId   = ((appConfig || {}).Wv__AppConfig__Modes || {}).Wv__AppConfig__Modes__DefaultModeId || 'Render';
        window.Wv__AppCore__ModeManager.Wv__ModeManager__SwitchToMode(defaultModeId);

        window.Wv__AppUtils__Toast.Wv__Toast__Show('WhitecardVision ready.', 'success', 2200);
        console.log('%c[WhitecardVision] Ready', 'color:#2ea86f;font-weight:bold');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Register global hotkeys
    // ------------------------------------------------------------
    function Wv__AppCore__InstallGlobalHotkeys() {
        window.Wv__AppUtils__Hotkeys.Wv__Hotkeys__Register('ctrl+s', async () => {
            try {
                await window.Wv__AppData__ProjectFileManager.Wv__ProjectFileManager__SaveActiveProject();
                window.Wv__AppUtils__Toast.Wv__Toast__Show('Project saved.', 'success', 1800);
            } catch (saveError) {
                window.Wv__AppUtils__Toast.Wv__Toast__Show('Save failed: ' + saveError.message, 'error');
            }
        }, 'Save active project');

        window.Wv__AppUtils__Hotkeys.Wv__Hotkeys__Register('ctrl+1', () => window.Wv__AppCore__ModeManager.Wv__ModeManager__SwitchToMode('ProjectManager'));
        window.Wv__AppUtils__Hotkeys.Wv__Hotkeys__Register('ctrl+2', () => window.Wv__AppCore__ModeManager.Wv__ModeManager__SwitchToMode('Render'));
        window.Wv__AppUtils__Hotkeys.Wv__Hotkeys__Register('ctrl+3', () => window.Wv__AppCore__ModeManager.Wv__ModeManager__SwitchToMode('Editor'));
        window.Wv__AppUtils__Hotkeys.Wv__Hotkeys__Register('ctrl+4', () => window.Wv__AppCore__ModeManager.Wv__ModeManager__SwitchToMode('FilterSuite'));
        window.Wv__AppUtils__Hotkeys.Wv__Hotkeys__Register('ctrl+5', () => window.Wv__AppCore__ModeManager.Wv__ModeManager__SwitchToMode('FinalPreview'));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Bind header badges to state changes
    // ------------------------------------------------------------
    function Wv__AppCore__WireHeaderStatusUpdaters() {
        const projectBadgeElement = document.getElementById('Wv__App__Header__ProjectBadge');
        const serverBadgeElement  = document.getElementById('Wv__App__Header__ServerBadge');

        window.Wv__AppCore__StateManager.Wv__StateManager__On('activeProjectChanged', (projectTree) => {
            if (!projectBadgeElement) return;
            if (!projectTree) { projectBadgeElement.textContent = 'No project loaded'; return; }
            const metadataBlock = projectTree.Wv__ProjectFile__Metadata || {};
            projectBadgeElement.textContent =
                (metadataBlock.Wv__ProjectFile__Metadata__YearFolder || '') + '/' +
                (metadataBlock.Wv__ProjectFile__Metadata__ProjectName || '');
        });

        window.Wv__AppCore__StateManager.Wv__StateManager__On('serverHealthChanged', (healthObject) => {
            if (!serverBadgeElement) return;
            if (!healthObject) {
                serverBadgeElement.textContent = 'Server: DOWN';
                serverBadgeElement.className   = 'Wv__App__Header__ServerBadge Wv__App__Header__ServerBadge--Down';
                return;
            }
            if (!healthObject.geminiKeyPresent) {
                serverBadgeElement.textContent = 'Server: OK (key missing)';
                serverBadgeElement.className   = 'Wv__App__Header__ServerBadge Wv__App__Header__ServerBadge--Warn';
                return;
            }
            serverBadgeElement.textContent = 'Server: OK';
            serverBadgeElement.className   = 'Wv__App__Header__ServerBadge Wv__App__Header__ServerBadge--Healthy';
        });
    }
    // ------------------------------------------------------------


    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', Wv__AppCore__InitApp);
    } else {
        Wv__AppCore__InitApp();
    }

})();

// endregion ===================================================================
