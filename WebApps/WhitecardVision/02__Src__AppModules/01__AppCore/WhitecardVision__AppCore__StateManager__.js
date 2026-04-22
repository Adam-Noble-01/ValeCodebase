/* =============================================================================
 WHITECARDVISION - STATE MANAGER (EVENT BUS + STORE)
=============================================================================
 FILE       : WhitecardVision__AppCore__StateManager__.js
 NAMESPACE  : Wv
 MODULE     : AppCore - StateManager
 PURPOSE    : Tiny pub/sub store holding AppConfig, per-System config blobs,
              the active project tree, and the current mode id. All modules
              read/write state through this hub - no direct cross-module
              reaching in.
============================================================================= */

// =============================================================================
// REGION | State Manager Module
// =============================================================================

(function () {
    'use strict';


// -----------------------------------------------------------------------------
// REGION | Internal Store
// -----------------------------------------------------------------------------

    const Wv__StateManager__Store = {
        appConfig            : null,                                                                                            //<-- WhitecardVision__AppData__Config__Main__.json (parsed)
        systemConfigsById    : {},                                                                                              //<-- { Render: {...}, Editor: {...}, ... }
        activeProject        : null,                                                                                            //<-- Normalised project tree (schema validator output)
        activeModeId         : 'ProjectManager',
        serverHealthSnapshot : null                                                                                             //<-- Last /api/system/health payload.
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Event Bus
// -----------------------------------------------------------------------------

    const Wv__StateManager__EventListeners = {};


    // FUNCTION | Subscribe to an event topic
    // ------------------------------------------------------------
    function Wv__StateManager__On(eventTopic, listenerFunction) {
        if (!Wv__StateManager__EventListeners[eventTopic]) Wv__StateManager__EventListeners[eventTopic] = [];
        Wv__StateManager__EventListeners[eventTopic].push(listenerFunction);
    }
    // ------------------------------------------------------------


    // FUNCTION | Publish an event topic
    // ------------------------------------------------------------
    function Wv__StateManager__Emit(eventTopic, eventPayload) {
        const listenerList = Wv__StateManager__EventListeners[eventTopic] || [];
        for (const listener of listenerList) {
            try { listener(eventPayload); }
            catch (listenerError) { console.error('[StateManager listener error]', eventTopic, listenerError); }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | AppConfig
// -----------------------------------------------------------------------------

    function Wv__StateManager__SetAppConfig(configObject) {
        Wv__StateManager__Store.appConfig = configObject;
        Wv__StateManager__Emit('appConfigChanged', configObject);
    }
    function Wv__StateManager__GetAppConfig() { return Wv__StateManager__Store.appConfig; }

    function Wv__StateManager__SetSystemConfig(systemId, systemConfigObject) {
        Wv__StateManager__Store.systemConfigsById[systemId] = systemConfigObject;
        Wv__StateManager__Emit('systemConfigChanged', { systemId: systemId, systemConfig: systemConfigObject });
    }
    function Wv__StateManager__GetSystemConfig(systemId) { return Wv__StateManager__Store.systemConfigsById[systemId] || null; }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Active Project
// -----------------------------------------------------------------------------

    function Wv__StateManager__SetActiveProject(projectTreeObject) {
        Wv__StateManager__Store.activeProject = projectTreeObject;
        Wv__StateManager__Emit('activeProjectChanged', projectTreeObject);
    }
    function Wv__StateManager__GetActiveProject() { return Wv__StateManager__Store.activeProject; }

    function Wv__StateManager__MarkProjectDirty() {
        const currentProjectTree = Wv__StateManager__Store.activeProject;
        if (!currentProjectTree) return;
        const metadataBlock = currentProjectTree.Wv__ProjectFile__Metadata || (currentProjectTree.Wv__ProjectFile__Metadata = {});
        metadataBlock.Wv__ProjectFile__Metadata__DateModifiedUtc = new Date().toISOString();
        Wv__StateManager__Emit('activeProjectMutated', currentProjectTree);
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Active Mode
// -----------------------------------------------------------------------------

    function Wv__StateManager__SetActiveModeId(modeIdToken) {
        Wv__StateManager__Store.activeModeId = modeIdToken;
        Wv__StateManager__Emit('activeModeChanged', modeIdToken);
    }
    function Wv__StateManager__GetActiveModeId() { return Wv__StateManager__Store.activeModeId; }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Server health
// -----------------------------------------------------------------------------

    function Wv__StateManager__SetServerHealth(healthObject) {
        Wv__StateManager__Store.serverHealthSnapshot = healthObject;
        Wv__StateManager__Emit('serverHealthChanged', healthObject);
    }
    function Wv__StateManager__GetServerHealth() { return Wv__StateManager__Store.serverHealthSnapshot; }

// endregion -------------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    window.Wv__AppCore__StateManager = {
        Wv__StateManager__On,
        Wv__StateManager__Emit,
        Wv__StateManager__SetAppConfig,
        Wv__StateManager__GetAppConfig,
        Wv__StateManager__SetSystemConfig,
        Wv__StateManager__GetSystemConfig,
        Wv__StateManager__SetActiveProject,
        Wv__StateManager__GetActiveProject,
        Wv__StateManager__MarkProjectDirty,
        Wv__StateManager__SetActiveModeId,
        Wv__StateManager__GetActiveModeId,
        Wv__StateManager__SetServerHealth,
        Wv__StateManager__GetServerHealth
    };
    // ------------------------------------------------------------

})();

// endregion ===================================================================
