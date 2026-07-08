// =============================================================================
// WHITECARDOPEDIA - MAIN APPLICATION COMPONENT
// =============================================================================
//
// FILE       : App.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : App Root Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Root React component with routing and state management
// CREATED    : 2025
//
// DESCRIPTION:
// - Main application component handling routing between views
// - Manages application state (current view, selected project)
// - Coordinates HomePage, ProjectGallery, and ProjectViewer components
// - Implements simple client-side routing without external libraries
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 2025 - Version 1.0.0
// - Initial implementation.
//
// 08-Jul-2026 - Version 1.1.0
// - Auth-check boot effect now honours na_get_and_clear_reopen_editor_flag():
//   if set, navigates straight to APP_VIEWS.EDITOR instead of GALLERY, so the
//   Project Editor's auto clear-cache-and-reload (after a successful save)
//   lands the user back where they were rather than the main gallery.
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | App Component
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Application View States
    // ------------------------------------------------------------
    const APP_VIEWS = {
        HOME                : 'HOME',                                    // <-- Home page with logo
        GALLERY             : 'GALLERY',                                 // <-- Project gallery grid
        VIEWER              : 'VIEWER',                                  // <-- Individual project viewer
        EDITOR              : 'EDITOR',                                  // <-- Project editor tool
        TIME_ANALYSIS       : 'TIME_ANALYSIS',                            // <-- Time analysis visualization tool
    };
    // ------------------------------------------------------------


    // COMPONENT | Main Application Root
    // ------------------------------------------------------------
    function App() {
        const [currentView, setCurrentView] = React.useState(APP_VIEWS.HOME);  // <-- Current view state
        const [selectedProject, setSelectedProject] = React.useState(null);    // <-- Selected project state
        const [lastSelectedProject, setLastSelectedProject] = React.useState(null);  // <-- Last viewed project for forward navigation
        const [urlProjectId, setUrlProjectId] = React.useState(null);          // <-- URL-based project ID state
        const [isLoadingUrlProject, setIsLoadingUrlProject] = React.useState(false);  // <-- URL project loading state
        const [isAuthenticated, setIsAuthenticated] = React.useState(false);    // <-- PIN authentication status
        const [pendingUrlProjectId, setPendingUrlProjectId] = React.useState(null);  // <-- Store project ID from URL until authenticated
        const [showPinEntry, setShowPinEntry] = React.useState(false);        // <-- Control PIN modal visibility
        const [urlProjectHandled, setUrlProjectHandled] = React.useState(false);  // <-- Track if URL project has been processed
        const [assetFallbackToast, setAssetFallbackToast] = React.useState(null);  // <-- R2-to-GH fallback toast message
        
        // EFFECT | Check for URL Project ID on Mount
        // ---------------------------------------------------------------
        React.useEffect(() => {
            const projectIdFromUrl = getProjectIdFromUrl();              // <-- Extract project ID from URL
            
            if (projectIdFromUrl) {
                // Store project ID but don't load yet - require PIN authentication first
                setPendingUrlProjectId(projectIdFromUrl);                 // <-- Store pending project ID
                setShowPinEntry(true);                                    // <-- Show PIN entry immediately
            }
        }, []);                                                          // <-- Run only on mount
        // ---------------------------------------------------------------
        
        // EFFECT | Check for Valid Authentication Token on Mount
        // ---------------------------------------------------------------
        React.useEffect(() => {
            if (hasValidAuthToken()) {
                setIsAuthenticated(true);                                // <-- Auto-authenticate from valid token
                setShowPinEntry(false);                                  // <-- Hide PIN modal for auto-authenticated users
                
                if (pendingUrlProjectId && !urlProjectHandled) {
                    // User has valid token and URL project link - load project
                    setIsLoadingUrlProject(true);                        // <-- Set loading state
                    setUrlProjectHandled(true);                          // <-- Mark URL project as handled early to prevent race condition
                    
                    loadAllProjects().then(projects => {
                        const matchingProject = projects.find(
                            p => p.projectCode === pendingUrlProjectId   // <-- Find by project code
                        );
                        
                        if (matchingProject) {
                            setSelectedProject(matchingProject);         // <-- Set selected project
                            setCurrentView(APP_VIEWS.VIEWER);            // <-- Navigate to viewer
                        } else {
                            console.error(`Project not found: ${pendingUrlProjectId}`);  // <-- Log error
                            setCurrentView(APP_VIEWS.GALLERY);           // <-- Navigate to gallery
                        }
                        
                        setPendingUrlProjectId(null);                    // <-- Clear pending project ID
                        setIsLoadingUrlProject(false);                   // <-- Clear loading state
                    });
                } else if (!urlProjectHandled) {
                    // User has valid token, no URL project — check for a pending Editor
                    // reopen flag (set before an auto cache-purge reload) before defaulting
                    // to the gallery, since a full reload can't otherwise recall that the
                    // user was in the Project Editor when the reload was triggered.
                    if (na_get_and_clear_reopen_editor_flag()) {
                        setCurrentView(APP_VIEWS.EDITOR);                // <-- Land back in the editor after a post-save cache purge
                    } else {
                        setCurrentView(APP_VIEWS.GALLERY);               // <-- Navigate to gallery directly
                    }
                }
            }
        }, [pendingUrlProjectId, urlProjectHandled]);                    // <-- Re-run if pendingUrlProjectId or urlProjectHandled changes
        // ---------------------------------------------------------------
        
        // SUB FUNCTION | Handle Enter from Home Page
        // ---------------------------------------------------------------
        const handleEnterApp = () => {
            setCurrentView(APP_VIEWS.GALLERY);                           // <-- Navigate to gallery
        };
        // ---------------------------------------------------------------
        
        // SUB FUNCTION | Handle Project Selection
        // ---------------------------------------------------------------
        const handleSelectProject = (project) => {
            setSelectedProject(project);                                 // <-- Set selected project
            setLastSelectedProject(project);                             // <-- Track for forward navigation hotkey
            setCurrentView(APP_VIEWS.VIEWER);                            // <-- Navigate to viewer
            updateUrlWithProjectId(project.projectCode);                 // <-- Update URL with project ID
        };
        // ---------------------------------------------------------------
        
        // SUB FUNCTION | Handle Back to Gallery
        // ---------------------------------------------------------------
        const handleBackToGallery = () => {
            setSelectedProject(null);                                    // <-- Clear selected project
            setCurrentView(APP_VIEWS.GALLERY);                           // <-- Navigate to gallery
            clearProjectIdFromUrl();                                     // <-- Remove URL query parameter
        };
        // ---------------------------------------------------------------
        
        // SUB FUNCTION | Handle PIN Success
        // ---------------------------------------------------------------
        const handlePinSuccess = () => {
            setIsAuthenticated(true);                                    // <-- Set authentication status
            setShowPinEntry(false);                                      // <-- Hide PIN modal
            
            if (pendingUrlProjectId) {
                // Load project from shared link after authentication
                setIsLoadingUrlProject(true);                            // <-- Set loading state
                setUrlProjectHandled(true);                              // <-- Mark URL project as handled to prevent race condition
                
                loadAllProjects().then(projects => {
                    const matchingProject = projects.find(
                        p => p.projectCode === pendingUrlProjectId       // <-- Find by project code
                    );
                    
                    if (matchingProject) {
                        setSelectedProject(matchingProject);             // <-- Set selected project
                        setCurrentView(APP_VIEWS.VIEWER);                // <-- Navigate to viewer
                    } else {
                        console.error(`Project not found: ${pendingUrlProjectId}`);  // <-- Log error
                        alert(`Project "${pendingUrlProjectId}" not found. Redirecting to gallery.`);  // <-- User feedback
                        setCurrentView(APP_VIEWS.GALLERY);               // <-- Navigate to gallery
                    }
                    
                    setPendingUrlProjectId(null);                       // <-- Clear pending project ID
                    setIsLoadingUrlProject(false);                       // <-- Clear loading state
                });
            } else {
                // Normal flow - proceed to gallery
                handleEnterApp();                                        // <-- Navigate to gallery
            }
        };
        // ---------------------------------------------------------------
        
        // SUB FUNCTION | Handle PIN Cancel
        // ---------------------------------------------------------------
        const handlePinCancel = () => {
            setPendingUrlProjectId(null);                                // <-- Clear pending project ID
            clearProjectIdFromUrl();                                     // <-- Clear URL parameter
            setShowPinEntry(false);                                      // <-- Hide PIN modal
            setCurrentView(APP_VIEWS.HOME);                             // <-- Navigate to HOME view
        };
        // ---------------------------------------------------------------
        
        // SUB FUNCTION | Handle Project Editor Navigation
        // ---------------------------------------------------------------
        const handleOpenProjectEditor = async () => {
            const isLocal = await isLocalhost();                         // <-- Check localhost status
            
            if (!isLocal) {
                showLocalhostRequiredAlert();                            // <-- Show alert for web version
                return;                                                  // <-- Exit without navigating
            }
            
            setCurrentView(APP_VIEWS.EDITOR);                            // <-- Navigate to editor
        };
        // ---------------------------------------------------------------
        
        // SUB FUNCTION | Handle Time Analysis Tool Navigation
        // ---------------------------------------------------------------
        const handleOpenTimeAnalysis = async () => {
            const isLocal = await isLocalhost();                         // <-- Check localhost status
            
            if (!isLocal) {
                showLocalhostRequiredAlert();                            // <-- Show alert for web version
                return;                                                  // <-- Exit without navigating
            }
            
            setCurrentView(APP_VIEWS.TIME_ANALYSIS);                     // <-- Navigate to time analysis tool
        };
        // ---------------------------------------------------------------

        // SUB FUNCTION | Handle Purge App Cache
        // ---------------------------------------------------------------
        const handlePurgeCache = () => {
            const confirmed = window.confirm(                            // <-- Confirm before destructive action
                'Purge App Cache?\n\nThis will clear all cached data and reload the app from scratch.\nYour login will be preserved.'
            );
            if (!confirmed) return;                                      // <-- Bail if user cancels

            const registrar = window.Whitecardopedia__Pwa__ServiceWorker__Registrar;
            if (registrar && typeof registrar.purgeAppCache === 'function') {
                registrar.purgeAppCache();                               // <-- Brutal full purge via shared registrar
            } else {
                window.location.reload();                                // <-- Fallback: plain reload if registrar unavailable
            }
        };
        // ---------------------------------------------------------------
        
        // EFFECT | Listen for R2 Asset Fallback Toast Event (once per session)
        // ---------------------------------------------------------------
        React.useEffect(() => {
            const na_handle_fallback_toast = (evt) => {
                const msg = (evt.detail && evt.detail.message) || 'Using static assets — live assets unavailable.';
                setAssetFallbackToast(msg);                              // <-- Show toast
                setTimeout(() => setAssetFallbackToast(null), 6000);    // <-- Auto-dismiss after 6s
            };
            window.addEventListener('wcp-asset-fallback-toast', na_handle_fallback_toast, { once: true });
            return () => window.removeEventListener('wcp-asset-fallback-toast', na_handle_fallback_toast);
        }, []);                                                          // <-- Register once on mount
        // ---------------------------------------------------------------

        // EFFECT | Register Global Keyboard Hotkeys
        // ---------------------------------------------------------------
        React.useEffect(() => {
            initHotkeys({
                NAVIGATE_BACK: () => {
                    if (currentView !== APP_VIEWS.GALLERY && currentView !== APP_VIEWS.HOME) {
                        handleBackToGallery();                           // <-- Go back to gallery from any project view
                    }
                },
                NAVIGATE_FORWARD: () => {
                    if (currentView === APP_VIEWS.GALLERY && lastSelectedProject) {
                        handleSelectProject(lastSelectedProject);        // <-- Re-open last viewed project from gallery
                    }
                },
            });
            return () => destroyHotkeys();                               // <-- Remove listener on unmount or re-run
        }, [currentView, lastSelectedProject]);                          // <-- Re-register when view or last project changes
        // ---------------------------------------------------------------
        
        // RENDER | Conditional View Rendering
        // ---------------------------------------------------------------
        return (
            <>
                {/* R2 Asset Fallback Toast - Shown when CDN unavailable, loading from GH Pages */}
                {assetFallbackToast && (
                    <div style={{
                        position        : 'fixed',
                        bottom          : '1.5rem',
                        left            : '50%',
                        transform       : 'translateX(-50%)',
                        background      : 'rgba(23, 43, 58, 0.93)',
                        color           : '#e8e4df',
                        padding         : '0.6rem 1.2rem',
                        borderRadius    : '6px',
                        fontSize        : '0.82rem',
                        zIndex          : 9999,
                        pointerEvents   : 'none',
                        boxShadow       : '0 2px 8px rgba(0,0,0,0.35)',
                        whiteSpace      : 'nowrap',
                    }}>
                        {assetFallbackToast}
                    </div>
                )}

                {/* PIN Entry Modal - Shows when authentication required for shared links */}
                {showPinEntry && (
                    <PinEntry 
                        onSuccess={handlePinSuccess}
                        onCancel={handlePinCancel}
                    />
                )}
                
                {/* Normal Application Views - Only show when PIN entry is not active */}
                {!showPinEntry && currentView === APP_VIEWS.HOME && (
                    <HomePage onEnter={handleEnterApp} />
                )}
                
                {!showPinEntry && currentView === APP_VIEWS.GALLERY && (
                    <ProjectGallery 
                        onSelectProject={handleSelectProject}
                        onOpenProjectEditor={handleOpenProjectEditor}
                        onOpenTimeAnalysis={handleOpenTimeAnalysis}
                        onPurgeCacheClick={handlePurgeCache}
                    />
                )}
                
                {!showPinEntry && currentView === APP_VIEWS.VIEWER && (
                    <ProjectViewer 
                        project={selectedProject} 
                        onBack={handleBackToGallery}
                    />
                )}
                
                {!showPinEntry && currentView === APP_VIEWS.EDITOR && (
                    <ProjectEditor onBack={handleBackToGallery} />
                )}
                
                {!showPinEntry && currentView === APP_VIEWS.TIME_ANALYSIS && (
                    <TimeAnalysisTool onBack={handleBackToGallery} />
                )}
            </>
        );
        // ---------------------------------------------------------------
    }
    // ---------------------------------------------------------------


    // INITIALIZATION | Render Application to DOM
    // ------------------------------------------------------------
    const root = ReactDOM.createRoot(document.getElementById('root'));  // <-- Create React root
    root.render(<App />);                                                // <-- Render App component
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

