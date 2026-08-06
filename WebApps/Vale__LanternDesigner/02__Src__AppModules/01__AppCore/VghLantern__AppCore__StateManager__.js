/* =============================================================================
   VGHLANTERN - STATE MANAGER
   =============================================================================

   FILE       : VghLantern__AppCore__StateManager__.js
   NAMESPACE  : VghLantern
   MODULE     : AppCore - StateManager
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Central application state with event emitter for reactive UI
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Holds all mutable application state (config, indexes, project, active lantern).
   - Provides getters and setters for state access. No direct DOM manipulation.
   - Event emitter pattern for reactive UI updates — UI modules subscribe.
   - Caches the last solved skeleton so both the 2D and 3D environments consume
     an identical geometry snapshot rather than each re-solving independently.

   EVENTS EMITTED:
   - appConfigLoaded          : app config JSON parsed
   - componentIndexLoaded     : component library index parsed
   - profileIndexLoaded       : profile library index parsed
   - userChanged              : a user signed in or out
   - projectChanged           : a project was loaded, created or cleared
   - lanternSelected          : active lantern index changed
   - lanternUpdated           : active lantern config mutated
   - geometrySolved           : SkeletonSolver produced a fresh solve
   - activeView2dChanged      : plan / front elevation / side elevation switch
   - viewport3dVisibilityChanged : in-editor 3D panel toggled
   - modeChanged              : nav mode switch
   - dirtyStateChanged        : unsaved-changes flag flipped

   ============================================================================= */

// =============================================================================
// REGION | State Manager Module
// =============================================================================

const VghLantern__AppCore__StateManager = (function() {

// -----------------------------------------------------------------------------
// REGION | Module State and Listener Registry
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Internal State Object
    // ------------------------------------------------------------
    let VghLantern__StateManager__State  =  {
        appConfig               : null,                                      // <-- Parsed VghLantern__AppConfig__Main__.json
        componentIndex          : null,                                      // <-- Parsed VghLantern__ComponentDataIndex__.json
        profileIndex            : null,                                      // <-- Parsed VghLantern__ProfileDataIndex__.json
        currentUser             : null,                                      // <-- Signed in user { UserId, UserName, Role } or null
        currentProject          : null,                                      // <-- Currently loaded project data
        currentLanternIndex     : -1,                                        // <-- Index of lantern being edited (-1 = none)
        solvedSkeleton          : null,                                      // <-- Last SkeletonSolver result (mm space)
        solvedBarSet            : null,                                      // <-- Last GlazeBarLayout result (mm space)
        activeView2d            : 'plan',                                    // <-- plan | frontElevation | sideElevation
        is3dViewportVisible     : true,                                      // <-- In-editor 3D panel toggle
        isDirty                 : false,                                     // <-- Unsaved changes flag
        currentMode             : 'DocManagement'                            // <-- Active UI mode
    };
    // ------------------------------------------------------------


    // MODULE VARIABLES | Event Listeners Registry
    // ------------------------------------------------------------
    let VghLantern__StateManager__Listeners  =  {};
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Event Emitter
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Emit Event to All Subscribers
    // ------------------------------------------------------------
    function VghLantern__StateManager__Emit(eventName, data) {
        if (!VghLantern__StateManager__Listeners[eventName]) return;
        VghLantern__StateManager__Listeners[eventName].forEach(function(callback) {
            try { callback(data); }
            catch (e) { console.error('[VghLantern__StateManager] Listener error on ' + eventName + ':', e); }
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Subscribe to State Change Event
    // ------------------------------------------------------------
    function VghLantern__StateManager__On(eventName, callback) {
        if (!VghLantern__StateManager__Listeners[eventName]) VghLantern__StateManager__Listeners[eventName] = [];
        VghLantern__StateManager__Listeners[eventName].push(callback);
    }
    // ------------------------------------------------------------


    // FUNCTION | Unsubscribe from State Change Event
    // ------------------------------------------------------------
    function VghLantern__StateManager__Off(eventName, callback) {
        if (!VghLantern__StateManager__Listeners[eventName]) return;
        VghLantern__StateManager__Listeners[eventName] = VghLantern__StateManager__Listeners[eventName].filter(function(cb) { return cb !== callback; });
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Full State (read-only snapshot)
    // ------------------------------------------------------------
    function VghLantern__StateManager__GetState() {
        return Object.assign({}, VghLantern__StateManager__State);
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Merged App Config (SSOT accessor for every module)
    // ------------------------------------------------------------
    function VghLantern__StateManager__GetAppConfig() {
        return VghLantern__StateManager__State.appConfig;                    // <-- Live reference, never mutate from consumers
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Current Project (read-only reference)
    // ------------------------------------------------------------
    function VghLantern__StateManager__GetCurrentProject() {
        return VghLantern__StateManager__State.currentProject;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config and Data Index Setters
// -----------------------------------------------------------------------------

    // FUNCTION | Set App Configuration
    // ------------------------------------------------------------
    function VghLantern__StateManager__SetAppConfig(config) {
        VghLantern__StateManager__State.appConfig  =  config;
        VghLantern__StateManager__Emit('appConfigLoaded', config);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Component Library Index
    // ------------------------------------------------------------
    function VghLantern__StateManager__SetComponentIndex(index) {
        VghLantern__StateManager__State.componentIndex  =  index;
        VghLantern__StateManager__Emit('componentIndexLoaded', index);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Profile Library Index
    // ------------------------------------------------------------
    function VghLantern__StateManager__SetProfileIndex(index) {
        VghLantern__StateManager__State.profileIndex  =  index;
        VghLantern__StateManager__Emit('profileIndexLoaded', index);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | User Session State
// -----------------------------------------------------------------------------

    // FUNCTION | Set Current Signed In User
    // ------------------------------------------------------------
    // Written by the UserLogin SessionManager only; everything else reads.
    function VghLantern__StateManager__SetCurrentUser(userData) {
        VghLantern__StateManager__State.currentUser  =  userData;
        VghLantern__StateManager__Emit('userChanged', userData);
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Current Signed In User
    // ------------------------------------------------------------
    function VghLantern__StateManager__GetCurrentUser() {
        return VghLantern__StateManager__State.currentUser;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Project and Lantern State
// -----------------------------------------------------------------------------

    // FUNCTION | Set Current Project
    // ------------------------------------------------------------
    function VghLantern__StateManager__SetCurrentProject(projectData) {
        VghLantern__StateManager__State.currentProject       =  projectData;
        VghLantern__StateManager__State.currentLanternIndex  =  -1;
        VghLantern__StateManager__State.solvedSkeleton       =  null;
        VghLantern__StateManager__State.solvedBarSet         =  null;
        VghLantern__StateManager__State.isDirty              =  false;
        VghLantern__StateManager__Emit('projectChanged', projectData);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Current Lantern Index for Editing
    // ------------------------------------------------------------
    function VghLantern__StateManager__SetCurrentLanternIndex(index) {
        VghLantern__StateManager__State.currentLanternIndex  =  index;
        VghLantern__StateManager__State.solvedSkeleton       =  null;        // <-- Force a fresh solve for the newly selected lantern
        VghLantern__StateManager__State.solvedBarSet         =  null;
        VghLantern__StateManager__Emit('lanternSelected', index);
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Current Lantern Data
    // ------------------------------------------------------------
    function VghLantern__StateManager__GetCurrentLantern() {
        if (!VghLantern__StateManager__State.currentProject || VghLantern__StateManager__State.currentLanternIndex < 0) return null;
        var lanterns  =  VghLantern__StateManager__State.currentProject['VghLantern__ProjectFile__Lanterns'];
        if (!lanterns || VghLantern__StateManager__State.currentLanternIndex >= lanterns.length) return null;
        return lanterns[VghLantern__StateManager__State.currentLanternIndex];
    }
    // ------------------------------------------------------------


    // FUNCTION | Update Current Lantern Data
    // ------------------------------------------------------------
    function VghLantern__StateManager__UpdateCurrentLantern(lanternData) {
        if (!VghLantern__StateManager__State.currentProject || VghLantern__StateManager__State.currentLanternIndex < 0) return;
        var lanterns  =  VghLantern__StateManager__State.currentProject['VghLantern__ProjectFile__Lanterns'];
        if (!lanterns || VghLantern__StateManager__State.currentLanternIndex >= lanterns.length) return;
        lanterns[VghLantern__StateManager__State.currentLanternIndex]  =  lanternData;
        VghLantern__StateManager__State.isDirty  =  true;
        VghLantern__StateManager__Emit('lanternUpdated', lanternData);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Solved Geometry Cache
// -----------------------------------------------------------------------------

    // FUNCTION | Store the Latest Solved Geometry
    // ------------------------------------------------------------
    // Both environments read this rather than solving independently, so the 2D
    // views and the 3D model can never drift out of agreement. Skeleton and bar
    // set are published together in one event so no consumer ever renders a
    // skeleton against a stale bar layout.
    function VghLantern__StateManager__SetSolvedGeometry(skeletonData, barSetData) {
        VghLantern__StateManager__State.solvedSkeleton  =  skeletonData;
        VghLantern__StateManager__State.solvedBarSet    =  barSetData || null;
        VghLantern__StateManager__Emit('geometrySolved', {
            Skeleton : skeletonData,
            BarSet   : VghLantern__StateManager__State.solvedBarSet
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Latest Solved Skeleton
    // ------------------------------------------------------------
    function VghLantern__StateManager__GetSolvedSkeleton() {
        return VghLantern__StateManager__State.solvedSkeleton;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Latest Solved Glazing Bar Set
    // ------------------------------------------------------------
    function VghLantern__StateManager__GetSolvedBarSet() {
        return VghLantern__StateManager__State.solvedBarSet;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Viewport State
// -----------------------------------------------------------------------------

    // FUNCTION | Set Active 2D View
    // ------------------------------------------------------------
    function VghLantern__StateManager__SetActiveView2d(viewKey) {
        VghLantern__StateManager__State.activeView2d  =  viewKey;
        VghLantern__StateManager__Emit('activeView2dChanged', viewKey);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set In-Editor 3D Viewport Visibility
    // ------------------------------------------------------------
    function VghLantern__StateManager__Set3dViewportVisible(isVisible) {
        VghLantern__StateManager__State.is3dViewportVisible  =  !!isVisible;
        VghLantern__StateManager__Emit('viewport3dVisibilityChanged', !!isVisible);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mode and Dirty State
// -----------------------------------------------------------------------------

    // FUNCTION | Set Current Mode
    // ------------------------------------------------------------
    function VghLantern__StateManager__SetCurrentMode(mode) {
        VghLantern__StateManager__State.currentMode  =  mode;
        VghLantern__StateManager__Emit('modeChanged', mode);
    }
    // ------------------------------------------------------------


    // FUNCTION | Mark State as Dirty
    // ------------------------------------------------------------
    function VghLantern__StateManager__MarkDirty() {
        VghLantern__StateManager__State.isDirty  =  true;
        VghLantern__StateManager__Emit('dirtyStateChanged', true);
    }
    // ------------------------------------------------------------


    // FUNCTION | Mark State as Clean
    // ------------------------------------------------------------
    function VghLantern__StateManager__MarkClean() {
        VghLantern__StateManager__State.isDirty  =  false;
        VghLantern__StateManager__Emit('dirtyStateChanged', false);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__StateManager__On                        : VghLantern__StateManager__On,
        VghLantern__StateManager__Off                       : VghLantern__StateManager__Off,
        VghLantern__StateManager__GetState                  : VghLantern__StateManager__GetState,
        VghLantern__StateManager__GetAppConfig              : VghLantern__StateManager__GetAppConfig,
        VghLantern__StateManager__GetCurrentProject         : VghLantern__StateManager__GetCurrentProject,

        VghLantern__StateManager__SetAppConfig              : VghLantern__StateManager__SetAppConfig,
        VghLantern__StateManager__SetComponentIndex         : VghLantern__StateManager__SetComponentIndex,
        VghLantern__StateManager__SetProfileIndex           : VghLantern__StateManager__SetProfileIndex,

        VghLantern__StateManager__SetCurrentUser            : VghLantern__StateManager__SetCurrentUser,
        VghLantern__StateManager__GetCurrentUser            : VghLantern__StateManager__GetCurrentUser,

        VghLantern__StateManager__SetCurrentProject         : VghLantern__StateManager__SetCurrentProject,
        VghLantern__StateManager__SetCurrentLanternIndex    : VghLantern__StateManager__SetCurrentLanternIndex,
        VghLantern__StateManager__GetCurrentLantern         : VghLantern__StateManager__GetCurrentLantern,
        VghLantern__StateManager__UpdateCurrentLantern      : VghLantern__StateManager__UpdateCurrentLantern,

        VghLantern__StateManager__SetSolvedGeometry         : VghLantern__StateManager__SetSolvedGeometry,
        VghLantern__StateManager__GetSolvedSkeleton         : VghLantern__StateManager__GetSolvedSkeleton,
        VghLantern__StateManager__GetSolvedBarSet           : VghLantern__StateManager__GetSolvedBarSet,

        VghLantern__StateManager__SetActiveView2d           : VghLantern__StateManager__SetActiveView2d,
        VghLantern__StateManager__Set3dViewportVisible      : VghLantern__StateManager__Set3dViewportVisible,

        VghLantern__StateManager__SetCurrentMode            : VghLantern__StateManager__SetCurrentMode,
        VghLantern__StateManager__MarkDirty                 : VghLantern__StateManager__MarkDirty,
        VghLantern__StateManager__MarkClean                 : VghLantern__StateManager__MarkClean
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__AppCore__StateManager  =  VghLantern__AppCore__StateManager;
