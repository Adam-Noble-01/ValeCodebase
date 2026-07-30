/* =============================================================================
   VGHLANTERN - APPLICATION INITIALIZER
   =============================================================================

   FILE       : VghLantern__AppCore__Init__.js
   NAMESPACE  : VghLantern
   MODULE     : AppCore - Init
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Boot sequence for the VghLantern application
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Executes the application startup sequence.
   - Loads app configuration and both data library indexes.
   - Initialises navigation bar event listeners and global hotkeys.
   - Subscribes to mode changes to trigger each system's render lifecycle.
   - Owns the ONE place the geometry solve is triggered: whenever the active
     lantern is selected or edited, the SkeletonSolver runs and the result is
     published to StateManager for both environments to consume.
   - Switches to Projects as the default mode.
   - This file must be loaded LAST in the classic script order.

   ============================================================================= */

// =============================================================================
// REGION | Application Boot Sequence
// =============================================================================

(function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Autosave Debounce Fallback
    // ------------------------------------------------------------
    // Config supplies the real value; this is only used before config resolves.
    const VGHLANTERN__AUTOSAVE_DEBOUNCE_FALLBACK_MS  =  1200;
    // ------------------------------------------------------------


    // MODULE VARIABLES | Autosave Debounce State
    // ------------------------------------------------------------
    let VghLantern__AppCore__AutosaveTimerId     =  null;                    // <-- Pending autosave timeout handle
    let VghLantern__AppCore__LastAutosaveSource  =  'autosave:unknown';      // <-- Most recent update source label
    let VghLantern__AppCore__AutosaveDebounceMs  =  VGHLANTERN__AUTOSAVE_DEBOUNCE_FALLBACK_MS;
    // ------------------------------------------------------------


    // MODULE VARIABLES | Mode Transition State
    // ------------------------------------------------------------
    // ModeManager reports the mode being entered, not the one being left, so the
    // outgoing mode is tracked here to give heavyweight systems an exit hook.
    let VghLantern__AppCore__PreviousModeId  =  null;                        // <-- Mode active before the current one
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Boot Sequence
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Start the Optional Support Systems
    // ------------------------------------------------------------
    function VghLantern__AppCore__InitSupportSystems() {
        var ServerConnectionMonitor  =  window.VghLantern__AppNotifications__ServerConnectionMonitor;
        var ServerStatusBanner       =  window.VghLantern__AppNotifications__ServerConnectionBanner;
        var AppInstallability        =  window.VghLantern__Feature__AppInstallability;

        if (ServerConnectionMonitor) ServerConnectionMonitor.VghLantern__ServerConnection__InitializeMonitor();
        if (ServerStatusBanner)      ServerStatusBanner.VghLantern__ServerStatusBanner__Initialize();
        if (AppInstallability && AppInstallability.VghLantern__AppInstallability__RegisterServiceWorkerAsync) {
            void AppInstallability.VghLantern__AppInstallability__RegisterServiceWorkerAsync();
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Load Both Data Library Indexes
    // ------------------------------------------------------------
    async function VghLantern__AppCore__LoadDataLibraries() {
        var ComponentIndexLoader  =  window.VghLantern__AppData__ComponentIndexLoader;
        var ProfileIndexLoader    =  window.VghLantern__AppData__ProfileIndexLoader;

        var pending  =  [];
        if (ComponentIndexLoader) pending.push(ComponentIndexLoader.VghLantern__ComponentIndexLoader__LoadIndex());
        if (ProfileIndexLoader)   pending.push(ProfileIndexLoader.VghLantern__ProfileIndexLoader__LoadIndex());
        await Promise.all(pending);
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Application
    // ------------------------------------------------------------
    async function VghLantern__AppCore__InitApp() {
        console.log('[VghLantern__Init] Starting VghLantern Lantern Designer...');

        VghLantern__AppCore__InitSupportSystems();

        var ConfigLoader        =  window.VghLantern__AppCore__ConfigLoader;
        var ModeManager         =  window.VghLantern__AppCore__ModeManager;
        var ProjectFileManager  =  window.VghLantern__AppData__ProjectFileManager;

        var configData  =  await ConfigLoader.VghLantern__ConfigLoader__LoadConfig();
        if (!configData) {
            console.error('[VghLantern__Init] Fatal: could not load app configuration.');
            return;
        }

        var appSection  =  configData['VghLantern__Application__Config'] || {};
        var debounceMs  =  appSection['VghLantern__Application__Config__AutosaveDebounceMs'];
        if (typeof debounceMs === 'number' && debounceMs > 0) VghLantern__AppCore__AutosaveDebounceMs  =  debounceMs;

        await VghLantern__AppCore__LoadDataLibraries();

        if (ProjectFileManager && ProjectFileManager.VghLantern__ProjectFileManager__SyncFromServer) {
            await ProjectFileManager.VghLantern__ProjectFileManager__SyncFromServer();  // <-- Pull disk project files into cache before first render
        }

        VghLantern__AppCore__InitNavigationBar();
        VghLantern__AppCore__InitSystemModules();
        VghLantern__AppCore__InitModeLifecycle();
        VghLantern__AppCore__InitProjectLifecycle();
        VghLantern__AppCore__InitGeometryLifecycle();
        VghLantern__AppCore__InitHotkeys();

        var defaultMode  =  appSection['VghLantern__Application__Config__DefaultMode'] || ModeManager.MODE_DOC_MANAGEMENT;
        ModeManager.VghLantern__ModeManager__SwitchToMode(defaultMode, false);

        console.log('[VghLantern__Init] Application ready.');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Navigation and Hotkeys
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Navigation Bar Event Listeners
    // ------------------------------------------------------------
    function VghLantern__AppCore__InitNavigationBar() {
        var ModeManager  =  window.VghLantern__AppCore__ModeManager;

        var tabs  =  document.querySelectorAll('.VghLantern__App__NavTab');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].addEventListener('click', function(e) {
                var tab  =  e.currentTarget;
                if (tab.classList.contains('VghLantern__App__NavTab--disabled')) return;
                var mode  =  tab.dataset.mode;
                if (mode) ModeManager.VghLantern__ModeManager__SwitchToMode(mode);
            });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Bind One-Time System Module Listeners
    // ------------------------------------------------------------
    // These bindings attach delegated listeners to mode panel containers that
    // survive innerHTML redraws, so they must run exactly once at boot rather
    // than on every mode entry.
    function VghLantern__AppCore__InitSystemModules() {
        var ProjectActions  =  window.VghLantern__DocManagement__ProjectActions;
        if (ProjectActions && ProjectActions.VghLantern__ProjectActions__Init) {
            ProjectActions.VghLantern__ProjectActions__Init();                // <-- Buttons plus delegated table clicks
        }

        var ComponentIndex  =  window.VghLantern__System__ComponentIndex;
        if (ComponentIndex && ComponentIndex.VghLantern__ComponentIndex__Init) {
            ComponentIndex.VghLantern__ComponentIndex__Init();                // <-- Gallery filter and card delegation
        }

        var SheetManager  =  window.VghLantern__DrawingEditor__SheetManager;
        if (SheetManager && SheetManager.VghLantern__DrawingEditor__SheetManager__Init) {
            SheetManager.VghLantern__DrawingEditor__SheetManager__Init();      // <-- Subscribes the sheet to the geometry solve
        }

        var SpecSectionManager  =  window.VghLantern__Specification__SectionManager;
        if (SpecSectionManager && SpecSectionManager.VghLantern__Specification__SectionManager__Init) {
            SpecSectionManager.VghLantern__Specification__SectionManager__Init(); // <-- Subscribes the schedule to the takeoff
        }

        var PageRenderer  =  window.VghLantern__DocPreview__PageRenderer;
        if (PageRenderer && PageRenderer.VghLantern__DocPreview__PageRenderer__Init) {
            PageRenderer.VghLantern__DocPreview__PageRenderer__Init();         // <-- Delegated preview toolbar and export buttons
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Hotkey Action Callback Map
    // ------------------------------------------------------------
    function VghLantern__AppCore__BuildHotkeyActions() {
        var ModeManager   =  window.VghLantern__AppCore__ModeManager;
        var StateManager  =  window.VghLantern__AppCore__StateManager;

        return {
            'NAVIGATE_BACK': function() {
                if (ModeManager && ModeManager.VghLantern__ModeManager__CanGoBack()) {
                    ModeManager.VghLantern__ModeManager__NavigateBack();
                }
            },
            'NAVIGATE_FORWARD': function() {
                console.log('[VghLantern__Hotkeys] NAVIGATE_FORWARD triggered');      // <-- Mapped so the action never warns; forward stack not implemented yet
            },
            'VIEW_2D_PLAN': function() {
                if (StateManager) StateManager.VghLantern__StateManager__SetActiveView2d('plan');
            },
            'VIEW_2D_FRONT_ELEVATION': function() {
                if (StateManager) StateManager.VghLantern__StateManager__SetActiveView2d('frontElevation');
            },
            'VIEW_2D_SIDE_ELEVATION': function() {
                if (StateManager) StateManager.VghLantern__StateManager__SetActiveView2d('sideElevation');
            },
            'TOGGLE_3D_VIEWPORT': function() {
                if (!StateManager) return;
                var state  =  StateManager.VghLantern__StateManager__GetState();
                StateManager.VghLantern__StateManager__Set3dViewportVisible(!state.is3dViewportVisible);
            },
            'VIEWPORT_ZOOM_EXTENTS': function() {
                var ViewportControls  =  window.VghLantern__Env2d__ViewportControls;
                if (ViewportControls && ViewportControls.VghLantern__Env2d__ViewportControls__ZoomExtentsActive) {
                    ViewportControls.VghLantern__Env2d__ViewportControls__ZoomExtentsActive();
                }
            },
            'SAVE_PROJECT': function() {
                VghLantern__AppCore__AutosaveCurrentProject('manual:hotkeySave');
            }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Global Hotkeys
    // ------------------------------------------------------------
    function VghLantern__AppCore__InitHotkeys() {
        var HotkeyHandler  =  window.VghLantern__AppUtils__HotkeyHandler;
        if (!HotkeyHandler) return;
        HotkeyHandler.VghLantern__HotkeyHandler__Init(VghLantern__AppCore__BuildHotkeyActions());
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mode Lifecycle
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Mode Lifecycle Hooks
    // ------------------------------------------------------------
    function VghLantern__AppCore__InitModeLifecycle() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return;

        StateManager.VghLantern__StateManager__On('modeChanged', function(modeId) {
            void VghLantern__AppCore__OnModeEntered(modeId);
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle Mode Exit - Release Heavyweight Resources
    // ------------------------------------------------------------
    // Only systems that hold something expensive get an exit hook; everything else
    // is plain DOM and costs nothing to leave mounted.
    function VghLantern__AppCore__OnModeExited(modeId) {
        if (modeId === 'Viewport3d') {
            var Viewport3dLayout  =  window.VghLantern__Viewport3d__Layout;
            if (Viewport3dLayout && Viewport3dLayout.VghLantern__Viewport3d__Layout__OnModeExit) {
                Viewport3dLayout.VghLantern__Viewport3d__Layout__OnModeExit();  // <-- Config decides whether the GL context is torn down
            }
        }

        if (modeId === 'DrawingEditor') {
            var SheetManager  =  window.VghLantern__DrawingEditor__SheetManager;
            if (SheetManager && SheetManager.VghLantern__DrawingEditor__SheetManager__OnModeExit) {
                SheetManager.VghLantern__DrawingEditor__SheetManager__OnModeExit(); // <-- Releases four SVG surfaces and the snapshot GL context
            }
        }

        if (modeId === 'Specification') {
            var SpecSections  =  window.VghLantern__Specification__SectionManager;
            if (SpecSections && SpecSections.VghLantern__Specification__SectionManager__OnModeExit) {
                SpecSections.VghLantern__Specification__SectionManager__OnModeExit(); // <-- Flushes a part-typed job note before it is lost
            }
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle Mode Entry - Trigger System Renders
    // ------------------------------------------------------------
    async function VghLantern__AppCore__OnModeEntered(modeId) {
        if (VghLantern__AppCore__PreviousModeId && VghLantern__AppCore__PreviousModeId !== modeId) {
            VghLantern__AppCore__OnModeExited(VghLantern__AppCore__PreviousModeId);
        }
        VghLantern__AppCore__PreviousModeId  =  modeId;

        if (modeId === 'DocManagement')   await VghLantern__AppCore__RenderDocumentManagement();
        if (modeId === 'LanternEditor')   await VghLantern__AppCore__RenderLanternEditor();
        if (modeId === 'Viewport3d')      await VghLantern__AppCore__RenderViewport3d();
        if (modeId === 'DrawingEditor')   await VghLantern__AppCore__RenderDrawingEditor();
        if (modeId === 'Specification')   VghLantern__AppCore__RenderSpecification();
        if (modeId === 'DocumentPreview') await VghLantern__AppCore__RenderDocumentPreview();
        if (modeId === 'ComponentIndex')  VghLantern__AppCore__RenderComponentIndex();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render Document Management Mode
    // ------------------------------------------------------------
    async function VghLantern__AppCore__RenderDocumentManagement() {
        var ProjectActions      =  window.VghLantern__DocManagement__ProjectActions;
        var ProjectList         =  window.VghLantern__DocManagement__ProjectList;
        var ProjectFileManager  =  window.VghLantern__AppData__ProjectFileManager;

        if (ProjectActions && ProjectActions.VghLantern__ProjectActions__Render) {
            ProjectActions.VghLantern__ProjectActions__Render();              // <-- Rebuild action buttons if mode DOM was refreshed
        }

        if (ProjectFileManager && ProjectFileManager.VghLantern__ProjectFileManager__SyncFromServer) {
            await ProjectFileManager.VghLantern__ProjectFileManager__SyncFromServer(); // <-- Pull latest disk data before project table render
        }

        if (ProjectList && ProjectList.VghLantern__ProjectList__Render) {
            ProjectList.VghLantern__ProjectList__Render();
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render Lantern Editor Mode
    // ------------------------------------------------------------
    async function VghLantern__AppCore__RenderLanternEditor() {
        var Layout  =  window.VghLantern__LanternEditor__Layout;
        if (!Layout || !Layout.VghLantern__LanternEditor__Layout__Init) return;

        await Layout.VghLantern__LanternEditor__Layout__Init();               // <-- Await panel build on first visit
        if (Layout.VghLantern__LanternEditor__Layout__Refresh) Layout.VghLantern__LanternEditor__Layout__Refresh();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render Dedicated 3D Viewport Mode
    // ------------------------------------------------------------
    async function VghLantern__AppCore__RenderViewport3d() {
        var Layout  =  window.VghLantern__Viewport3d__Layout;
        if (!Layout || !Layout.VghLantern__Viewport3d__Layout__Init) return;
        await Layout.VghLantern__Viewport3d__Layout__Init();                  // <-- Lazily boots the Three.js runtime on first entry
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render Drawing Editor Mode
    // ------------------------------------------------------------
    async function VghLantern__AppCore__RenderDrawingEditor() {
        var SheetManager  =  window.VghLantern__DrawingEditor__SheetManager;
        if (SheetManager && SheetManager.VghLantern__DrawingEditor__SheetManager__Render) {
            await SheetManager.VghLantern__DrawingEditor__SheetManager__Render(); // <-- Awaited so the 3D snapshot lands before the panel settles
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render Specification Mode
    // ------------------------------------------------------------
    function VghLantern__AppCore__RenderSpecification() {
        var SectionManager  =  window.VghLantern__Specification__SectionManager;
        var JobNotes        =  window.VghLantern__Specification__JobNotes;

        if (SectionManager && SectionManager.VghLantern__Specification__SectionManager__Render) SectionManager.VghLantern__Specification__SectionManager__Render();
        if (JobNotes && JobNotes.VghLantern__Specification__JobNotes__Render) JobNotes.VghLantern__Specification__JobNotes__Render();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render Document Preview Mode
    // ------------------------------------------------------------
    // The preview composes drawing views from the Drawing Editor's cache. When the
    // Drawing Editor has not been visited this session, the sheet is composed
    // headlessly first - the sheet's scale maths never read on-screen layout, so
    // building it inside the hidden panel produces identical output.
    async function VghLantern__AppCore__RenderDocumentPreview() {
        var PageRenderer   =  window.VghLantern__DocPreview__PageRenderer;
        var SheetManager   =  window.VghLantern__DrawingEditor__SheetManager;
        var ViewPlacement  =  window.VghLantern__DrawingEditor__ViewPlacement;

        if (SheetManager && ViewPlacement &&
            !ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__HasComposedOutput()) {
            await SheetManager.VghLantern__DrawingEditor__SheetManager__Render();
            SheetManager.VghLantern__DrawingEditor__SheetManager__OnModeExit();   // <-- Caches are captured; release the hidden surfaces straight away
        }

        if (PageRenderer && PageRenderer.VghLantern__DocPreview__PageRenderer__Render) {
            PageRenderer.VghLantern__DocPreview__PageRenderer__Render();
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render Component Index Mode
    // ------------------------------------------------------------
    function VghLantern__AppCore__RenderComponentIndex() {
        var ComponentIndex  =  window.VghLantern__System__ComponentIndex;
        if (ComponentIndex && ComponentIndex.VghLantern__ComponentIndex__Render) {
            ComponentIndex.VghLantern__ComponentIndex__Render('VghLantern__ComponentIndex__RootContainer');
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Geometry Lifecycle - The Single Solve Trigger
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Solve the Active Lantern and Publish the Result
    // ------------------------------------------------------------
    // This is the ONLY place the solver is invoked in response to state change.
    // Both environments read the published result, so they can never disagree.
    function VghLantern__AppCore__SolveActiveLantern() {
        var StateManager    =  window.VghLantern__AppCore__StateManager;
        var SkeletonSolver  =  window.VghLantern__Geometry__SkeletonSolver;
        var GlazeBarLayout  =  window.VghLantern__Geometry__GlazeBarLayout;
        if (!StateManager || !SkeletonSolver) return;

        var lantern  =  StateManager.VghLantern__StateManager__GetCurrentLantern();
        if (!lantern) {
            StateManager.VghLantern__StateManager__SetSolvedGeometry(null, null);
            return;
        }

        var skeleton  =  SkeletonSolver.VghLantern__SkeletonSolver__Solve(lantern);
        var barSet    =  (skeleton && GlazeBarLayout)
            ? GlazeBarLayout.VghLantern__GlazeBarLayout__Layout(skeleton, lantern)
            : null;

        StateManager.VghLantern__StateManager__SetSolvedGeometry(skeleton, barSet);
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Geometry Lifecycle Hooks
    // ------------------------------------------------------------
    function VghLantern__AppCore__InitGeometryLifecycle() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return;

        StateManager.VghLantern__StateManager__On('lanternSelected', function() {
            VghLantern__AppCore__SolveActiveLantern();
        });

        StateManager.VghLantern__StateManager__On('lanternUpdated', function() {
            VghLantern__AppCore__SolveActiveLantern();
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Project Lifecycle and Autosave
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Persist Current Project to Disk
    // ------------------------------------------------------------
    function VghLantern__AppCore__AutosaveCurrentProject(updateSource) {
        var ProjectFileManager  =  window.VghLantern__AppData__ProjectFileManager;
        var StateManager        =  window.VghLantern__AppCore__StateManager;
        if (!ProjectFileManager || !StateManager) return;

        var state  =  StateManager.VghLantern__StateManager__GetState();
        if (state.currentProject) {
            ProjectFileManager.VghLantern__ProjectFileManager__SaveProject(state.currentProject, updateSource || 'autosave:unknown');
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Schedule Debounced Project Autosave
    // ------------------------------------------------------------
    function VghLantern__AppCore__ScheduleAutosaveCurrentProject(updateSource) {
        VghLantern__AppCore__LastAutosaveSource  =  updateSource || 'autosave:unknown';

        if (VghLantern__AppCore__AutosaveTimerId) {
            clearTimeout(VghLantern__AppCore__AutosaveTimerId);
        }

        VghLantern__AppCore__AutosaveTimerId  =  setTimeout(function() {
            var sourceToPersist  =  VghLantern__AppCore__LastAutosaveSource;
            VghLantern__AppCore__AutosaveTimerId  =  null;
            VghLantern__AppCore__AutosaveCurrentProject(sourceToPersist);
        }, VghLantern__AppCore__AutosaveDebounceMs);
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Project Lifecycle - Nav Tab Gating and Autosave Hooks
    // ------------------------------------------------------------
    function VghLantern__AppCore__InitProjectLifecycle() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return;

        StateManager.VghLantern__StateManager__On('projectChanged', function(projectData) {
            VghLantern__AppCore__UpdateNavTabStates(projectData);
        });

        StateManager.VghLantern__StateManager__On('lanternUpdated', function() {
            VghLantern__AppCore__ScheduleAutosaveCurrentProject('autosave:lanternUpdated'); // <-- Batch rapid slider edits into a single write
        });

        StateManager.VghLantern__StateManager__On('dirtyStateChanged', function(isDirty) {
            if (isDirty) {
                VghLantern__AppCore__ScheduleAutosaveCurrentProject('autosave:dirtyStateChanged'); // <-- Persist MarkDirty paths (job notes, spec sections)
            }
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Enable or Disable Navigation Tabs Based on Project State
    // ------------------------------------------------------------
    function VghLantern__AppCore__UpdateNavTabStates(projectData) {
        var hasProject  =  !!projectData;
        var tabs        =  document.querySelectorAll('.VghLantern__App__NavTab');

        for (var i = 0; i < tabs.length; i++) {
            var tab   =  tabs[i];
            var mode  =  tab.dataset.mode;

            if (mode === 'DocManagement' || mode === 'ComponentIndex') continue;  // <-- Always reachable, project or not

            if (hasProject) {
                tab.classList.remove('VghLantern__App__NavTab--disabled');
            } else {
                tab.classList.add('VghLantern__App__NavTab--disabled');
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Boot
// -----------------------------------------------------------------------------

    // BOOT | Run Init When DOM is Ready
    // ------------------------------------------------------------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', VghLantern__AppCore__InitApp);
    } else {
        void VghLantern__AppCore__InitApp();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================
