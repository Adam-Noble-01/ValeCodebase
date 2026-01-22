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
        const [urlProjectId, setUrlProjectId] = React.useState(null);          // <-- URL-based project ID state
        const [isLoadingUrlProject, setIsLoadingUrlProject] = React.useState(false);  // <-- URL project loading state
        const [isAuthenticated, setIsAuthenticated] = React.useState(false);    // <-- PIN authentication status
        const [pendingUrlProjectId, setPendingUrlProjectId] = React.useState(null);  // <-- Store project ID from URL until authenticated
        const [showPinEntry, setShowPinEntry] = React.useState(false);        // <-- Control PIN modal visibility
        
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
                
                if (pendingUrlProjectId) {
                    // User has valid token and URL project link - load project
                    setIsLoadingUrlProject(true);                        // <-- Set loading state
                    
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
                } else {
                    // User has valid token, no URL project - go to gallery
                    setCurrentView(APP_VIEWS.GALLERY);                   // <-- Navigate to gallery directly
                }
            }
        }, [pendingUrlProjectId]);                                       // <-- Re-run if pendingUrlProjectId changes
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
        
        // RENDER | Conditional View Rendering
        // ---------------------------------------------------------------
        return (
            <>
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

