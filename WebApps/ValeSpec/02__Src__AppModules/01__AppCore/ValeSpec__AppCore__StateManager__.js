/* =============================================================================
   VALESPEC - STATE MANAGER
   =============================================================================

   FILE       : ValeSpec__AppCore__StateManager__.js
   NAMESPACE  : ValeSpec
   MODULE     : AppCore - StateManager
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Central application state with event emitter for reactive UI
   CREATED    : 2026

   DESCRIPTION:
   - Holds all mutable application state (current project, assembly, config)
   - Provides getters and setters for state access
   - Event emitter pattern for reactive UI updates
   - No direct DOM manipulation — UI modules subscribe to state changes

   ============================================================================= */

// =============================================================================
// REGION | State Manager Module
// =============================================================================

const ValeSpec__AppCore__StateManager = (function() {

    // MODULE VARIABLES | Internal State Object
    // ------------------------------------------------------------
    let ValeSpec__StateManager__State  =  {
        appConfig              : null,                    // <-- Parsed ValeSpec__AppConfig__Main__.json
        hardwareIndex          : null,                    // <-- Parsed ValeSpec__HardwareDataIndex__.json
        currentProject         : null,                    // <-- Currently loaded project data
        currentAssemblyIndex   : -1,                      // <-- Index of assembly being edited (-1 = none)
        globalIronmongeryFinish: 'Unlacquered Brass',     // <-- Cascading finish selection
        globalLeverType        : 'Scroll',                // <-- Cascading lever type selection
        isDirty                : false,                   // <-- Unsaved changes flag
        currentMode            : 'DocManagement'          // <-- Active UI mode
    };
    // ------------------------------------------------------------


    // MODULE VARIABLES | Event Listeners Registry
    // ------------------------------------------------------------
    let ValeSpec__StateManager__Listeners  =  {};
    // ------------------------------------------------------------


    // HELPER FUNCTION | Emit Event to All Subscribers
    // ------------------------------------------------------------
    function ValeSpec__StateManager__Emit(eventName, data) {
        if (!ValeSpec__StateManager__Listeners[eventName]) return;
        ValeSpec__StateManager__Listeners[eventName].forEach(function(callback) {
            try { callback(data); }
            catch (e) { console.error('[ValeSpec__StateManager] Listener error on ' + eventName + ':', e); }
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Subscribe to State Change Event
    // ------------------------------------------------------------
    function ValeSpec__StateManager__On(eventName, callback) {
        if (!ValeSpec__StateManager__Listeners[eventName]) ValeSpec__StateManager__Listeners[eventName] = [];
        ValeSpec__StateManager__Listeners[eventName].push(callback);
    }
    // ------------------------------------------------------------


    // FUNCTION | Unsubscribe from State Change Event
    // ------------------------------------------------------------
    function ValeSpec__StateManager__Off(eventName, callback) {
        if (!ValeSpec__StateManager__Listeners[eventName]) return;
        ValeSpec__StateManager__Listeners[eventName] = ValeSpec__StateManager__Listeners[eventName].filter(function(cb) { return cb !== callback; });
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Full State (read-only snapshot)
    // ------------------------------------------------------------
    function ValeSpec__StateManager__GetState() {
        return Object.assign({}, ValeSpec__StateManager__State);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set App Configuration
    // ------------------------------------------------------------
    function ValeSpec__StateManager__SetAppConfig(config) {
        ValeSpec__StateManager__State.appConfig  =  config;
        ValeSpec__StateManager__Emit('appConfigLoaded', config);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Hardware Index
    // ------------------------------------------------------------
    function ValeSpec__StateManager__SetHardwareIndex(index) {
        ValeSpec__StateManager__State.hardwareIndex  =  index;
        ValeSpec__StateManager__Emit('hardwareIndexLoaded', index);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Current Project
    // ------------------------------------------------------------
    function ValeSpec__StateManager__SetCurrentProject(projectData) {
        ValeSpec__StateManager__State.currentProject  =  projectData;
        ValeSpec__StateManager__State.isDirty         =  false;
        if (projectData) {
            var globalSettings  =  projectData['ValeSpec__ProjectFile__GlobalSettings'];
            if (globalSettings) {
                ValeSpec__StateManager__State.globalIronmongeryFinish  =  globalSettings['ValeSpec__ProjectFile__GlobalSettings__IronmongeryFinish'] || 'Unlacquered Brass';
                ValeSpec__StateManager__State.globalLeverType          =  globalSettings['ValeSpec__ProjectFile__GlobalSettings__LeverType'] || 'Scroll';
            }
        }
        ValeSpec__StateManager__Emit('projectChanged', projectData);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Current Assembly Index for Editing
    // ------------------------------------------------------------
    function ValeSpec__StateManager__SetCurrentAssemblyIndex(index) {
        ValeSpec__StateManager__State.currentAssemblyIndex  =  index;
        ValeSpec__StateManager__Emit('assemblySelected', index);
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Current Assembly Data
    // ------------------------------------------------------------
    function ValeSpec__StateManager__GetCurrentAssembly() {
        if (!ValeSpec__StateManager__State.currentProject || ValeSpec__StateManager__State.currentAssemblyIndex < 0) return null;
        var assemblies  =  ValeSpec__StateManager__State.currentProject['ValeSpec__ProjectFile__Assemblies'];
        if (!assemblies || ValeSpec__StateManager__State.currentAssemblyIndex >= assemblies.length) return null;
        return assemblies[ValeSpec__StateManager__State.currentAssemblyIndex];
    }
    // ------------------------------------------------------------


    // FUNCTION | Update Current Assembly Data
    // ------------------------------------------------------------
    function ValeSpec__StateManager__UpdateCurrentAssembly(assemblyData) {
        if (!ValeSpec__StateManager__State.currentProject || ValeSpec__StateManager__State.currentAssemblyIndex < 0) return;
        var assemblies  =  ValeSpec__StateManager__State.currentProject['ValeSpec__ProjectFile__Assemblies'];
        if (!assemblies || ValeSpec__StateManager__State.currentAssemblyIndex >= assemblies.length) return;
        assemblies[ValeSpec__StateManager__State.currentAssemblyIndex]  =  assemblyData;
        ValeSpec__StateManager__State.isDirty  =  true;
        ValeSpec__StateManager__Emit('assemblyUpdated', assemblyData);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Global Ironmongery Finish
    // ------------------------------------------------------------
    function ValeSpec__StateManager__SetGlobalFinish(finish) {
        ValeSpec__StateManager__State.globalIronmongeryFinish  =  finish;
        if (ValeSpec__StateManager__State.currentProject && ValeSpec__StateManager__State.currentProject['ValeSpec__ProjectFile__GlobalSettings']) {
            ValeSpec__StateManager__State.currentProject['ValeSpec__ProjectFile__GlobalSettings']['ValeSpec__ProjectFile__GlobalSettings__IronmongeryFinish']  =  finish;
        }
        ValeSpec__StateManager__State.isDirty  =  true;
        ValeSpec__StateManager__Emit('globalFinishChanged', finish);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Global Lever Type
    // ------------------------------------------------------------
    function ValeSpec__StateManager__SetGlobalLeverType(leverType) {
        ValeSpec__StateManager__State.globalLeverType  =  leverType;
        if (ValeSpec__StateManager__State.currentProject && ValeSpec__StateManager__State.currentProject['ValeSpec__ProjectFile__GlobalSettings']) {
            ValeSpec__StateManager__State.currentProject['ValeSpec__ProjectFile__GlobalSettings']['ValeSpec__ProjectFile__GlobalSettings__LeverType']  =  leverType;
        }
        ValeSpec__StateManager__State.isDirty  =  true;
        ValeSpec__StateManager__Emit('globalLeverTypeChanged', leverType);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Current Mode
    // ------------------------------------------------------------
    function ValeSpec__StateManager__SetCurrentMode(mode) {
        ValeSpec__StateManager__State.currentMode  =  mode;
        ValeSpec__StateManager__Emit('modeChanged', mode);
    }
    // ------------------------------------------------------------


    // FUNCTION | Mark State as Dirty
    // ------------------------------------------------------------
    function ValeSpec__StateManager__MarkDirty() {
        ValeSpec__StateManager__State.isDirty  =  true;
        ValeSpec__StateManager__Emit('dirtyStateChanged', true);
    }
    // ------------------------------------------------------------


    // FUNCTION | Mark State as Clean
    // ------------------------------------------------------------
    function ValeSpec__StateManager__MarkClean() {
        ValeSpec__StateManager__State.isDirty  =  false;
        ValeSpec__StateManager__Emit('dirtyStateChanged', false);
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__StateManager__On                       : ValeSpec__StateManager__On,
        ValeSpec__StateManager__Off                      : ValeSpec__StateManager__Off,
        ValeSpec__StateManager__GetState                 : ValeSpec__StateManager__GetState,
        ValeSpec__StateManager__SetAppConfig             : ValeSpec__StateManager__SetAppConfig,
        ValeSpec__StateManager__SetHardwareIndex         : ValeSpec__StateManager__SetHardwareIndex,
        ValeSpec__StateManager__SetCurrentProject        : ValeSpec__StateManager__SetCurrentProject,
        ValeSpec__StateManager__SetCurrentAssemblyIndex  : ValeSpec__StateManager__SetCurrentAssemblyIndex,
        ValeSpec__StateManager__GetCurrentAssembly       : ValeSpec__StateManager__GetCurrentAssembly,
        ValeSpec__StateManager__UpdateCurrentAssembly    : ValeSpec__StateManager__UpdateCurrentAssembly,
        ValeSpec__StateManager__SetGlobalFinish          : ValeSpec__StateManager__SetGlobalFinish,
        ValeSpec__StateManager__SetGlobalLeverType       : ValeSpec__StateManager__SetGlobalLeverType,
        ValeSpec__StateManager__SetCurrentMode           : ValeSpec__StateManager__SetCurrentMode,
        ValeSpec__StateManager__MarkDirty                : ValeSpec__StateManager__MarkDirty,
        ValeSpec__StateManager__MarkClean                : ValeSpec__StateManager__MarkClean
    };

})();

// endregion ===================================================================

window.ValeSpec__AppCore__StateManager  =  ValeSpec__AppCore__StateManager;
