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
    let _state  =  {
        appConfig              : null,       // <-- Parsed ValeSpec__AppConfig__Main__.json
        hardwareIndex          : null,       // <-- Parsed ValeSpec__HardwareDataIndex__.json
        currentProject         : null,       // <-- Currently loaded project data
        currentAssemblyIndex   : -1,         // <-- Index of assembly being edited (-1 = none)
        globalIronmongeryFinish: 'Unlacquered Brass',  // <-- Cascading finish selection
        globalLeverType        : 'Scroll',   // <-- Cascading lever type selection
        isDirty                : false,      // <-- Unsaved changes flag
        currentMode            : 'DocManagement'       // <-- Active UI mode
    };
    // ------------------------------------------------------------


    // MODULE VARIABLES | Event Listeners Registry
    // ------------------------------------------------------------
    let _listeners  =  {};
    // ------------------------------------------------------------


    // HELPER FUNCTION | Emit Event to All Subscribers
    // ------------------------------------------------------------
    function _emit(eventName, data) {
        if (!_listeners[eventName]) return;
        _listeners[eventName].forEach(function(callback) {
            try { callback(data); }
            catch (e) { console.error('[ValeSpec__StateManager] Listener error on ' + eventName + ':', e); }
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Subscribe to State Change Event
    // ------------------------------------------------------------
    function on(eventName, callback) {
        if (!_listeners[eventName]) _listeners[eventName] = [];
        _listeners[eventName].push(callback);
    }
    // ------------------------------------------------------------


    // FUNCTION | Unsubscribe from State Change Event
    // ------------------------------------------------------------
    function off(eventName, callback) {
        if (!_listeners[eventName]) return;
        _listeners[eventName] = _listeners[eventName].filter(function(cb) { return cb !== callback; });
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Full State (read-only snapshot)
    // ------------------------------------------------------------
    function getState() {
        return Object.assign({}, _state);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set App Configuration
    // ------------------------------------------------------------
    function setAppConfig(config) {
        _state.appConfig  =  config;
        _emit('appConfigLoaded', config);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Hardware Index
    // ------------------------------------------------------------
    function setHardwareIndex(index) {
        _state.hardwareIndex  =  index;
        _emit('hardwareIndexLoaded', index);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Current Project
    // ------------------------------------------------------------
    function setCurrentProject(projectData) {
        _state.currentProject  =  projectData;
        _state.isDirty         =  false;
        if (projectData) {
            var globalSettings  =  projectData['ValeSpec__ProjectFile__GlobalSettings'];
            if (globalSettings) {
                _state.globalIronmongeryFinish  =  globalSettings['ValeSpec__ProjectFile__GlobalSettings__IronmongeryFinish'] || 'Unlacquered Brass';
                _state.globalLeverType          =  globalSettings['ValeSpec__ProjectFile__GlobalSettings__LeverType'] || 'Scroll';
            }
        }
        _emit('projectChanged', projectData);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Current Assembly Index for Editing
    // ------------------------------------------------------------
    function setCurrentAssemblyIndex(index) {
        _state.currentAssemblyIndex  =  index;
        _emit('assemblySelected', index);
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Current Assembly Data
    // ------------------------------------------------------------
    function getCurrentAssembly() {
        if (!_state.currentProject || _state.currentAssemblyIndex < 0) return null;
        var assemblies  =  _state.currentProject['ValeSpec__ProjectFile__Assemblies'];
        if (!assemblies || _state.currentAssemblyIndex >= assemblies.length) return null;
        return assemblies[_state.currentAssemblyIndex];
    }
    // ------------------------------------------------------------


    // FUNCTION | Update Current Assembly Data
    // ------------------------------------------------------------
    function updateCurrentAssembly(assemblyData) {
        if (!_state.currentProject || _state.currentAssemblyIndex < 0) return;
        var assemblies  =  _state.currentProject['ValeSpec__ProjectFile__Assemblies'];
        if (!assemblies || _state.currentAssemblyIndex >= assemblies.length) return;
        assemblies[_state.currentAssemblyIndex]  =  assemblyData;
        _state.isDirty  =  true;
        _emit('assemblyUpdated', assemblyData);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Global Ironmongery Finish
    // ------------------------------------------------------------
    function setGlobalFinish(finish) {
        _state.globalIronmongeryFinish  =  finish;
        if (_state.currentProject && _state.currentProject['ValeSpec__ProjectFile__GlobalSettings']) {
            _state.currentProject['ValeSpec__ProjectFile__GlobalSettings']['ValeSpec__ProjectFile__GlobalSettings__IronmongeryFinish']  =  finish;
        }
        _state.isDirty  =  true;
        _emit('globalFinishChanged', finish);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Global Lever Type
    // ------------------------------------------------------------
    function setGlobalLeverType(leverType) {
        _state.globalLeverType  =  leverType;
        if (_state.currentProject && _state.currentProject['ValeSpec__ProjectFile__GlobalSettings']) {
            _state.currentProject['ValeSpec__ProjectFile__GlobalSettings']['ValeSpec__ProjectFile__GlobalSettings__LeverType']  =  leverType;
        }
        _state.isDirty  =  true;
        _emit('globalLeverTypeChanged', leverType);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Current Mode
    // ------------------------------------------------------------
    function setCurrentMode(mode) {
        _state.currentMode  =  mode;
        _emit('modeChanged', mode);
    }
    // ------------------------------------------------------------


    // FUNCTION | Mark State as Dirty
    // ------------------------------------------------------------
    function markDirty() {
        _state.isDirty  =  true;
        _emit('dirtyStateChanged', true);
    }
    // ------------------------------------------------------------


    // FUNCTION | Mark State as Clean
    // ------------------------------------------------------------
    function markClean() {
        _state.isDirty  =  false;
        _emit('dirtyStateChanged', false);
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        on                       : on,
        off                      : off,
        getState                 : getState,
        setAppConfig             : setAppConfig,
        setHardwareIndex         : setHardwareIndex,
        setCurrentProject        : setCurrentProject,
        setCurrentAssemblyIndex  : setCurrentAssemblyIndex,
        getCurrentAssembly       : getCurrentAssembly,
        updateCurrentAssembly    : updateCurrentAssembly,
        setGlobalFinish          : setGlobalFinish,
        setGlobalLeverType       : setGlobalLeverType,
        setCurrentMode           : setCurrentMode,
        markDirty                : markDirty,
        markClean                : markClean
    };

})();

// endregion ===================================================================

window.ValeSpec__AppCore__StateManager  =  ValeSpec__AppCore__StateManager;
