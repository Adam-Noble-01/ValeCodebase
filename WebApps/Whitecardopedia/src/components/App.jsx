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
        const [isLoadingDeepLink, setIsLoadingDeepLink] = React.useState(false);  // <-- Loading state for deep links
        
        // SUB FUNCTION | Handle Enter from Home Page
        // ---------------------------------------------------------------
        const handleEnterApp = () => {
            setCurrentView(APP_VIEWS.GALLERY);                           // <-- Navigate to gallery
            navigateToGallery();                                          // <-- Update browser URL
        };
        // ---------------------------------------------------------------
        
        // SUB FUNCTION | Handle Project Selection
        // ---------------------------------------------------------------
        const handleSelectProject = (project) => {
            setSelectedProject(project);                                 // <-- Set selected project
            setCurrentView(APP_VIEWS.VIEWER);                            // <-- Navigate to viewer
            
            // UPDATE BROWSER URL WITH PROJECT CODE
            if (project && project.projectCode) {
                updateBrowserUrl(project.projectCode, '2025', `${project.projectName} - Whitecardopedia`);  // <-- Update URL
            }
        };
        // ---------------------------------------------------------------
        
        // SUB FUNCTION | Handle Back to Gallery
        // ---------------------------------------------------------------
        const handleBackToGallery = () => {
            setSelectedProject(null);                                    // <-- Clear selected project
            setCurrentView(APP_VIEWS.GALLERY);                           // <-- Navigate to gallery
            navigateToGallery();                                          // <-- Update browser URL
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
        
        
        // SUB FUNCTION | Load Project from Deep Link URL
        // ---------------------------------------------------------------
        const loadProjectFromUrl = async () => {
            const urlData = parseProjectUrl();                            // <-- Parse current URL
            
            if (!urlData.isValid) {
                return false;                                             // <-- Not a valid project URL
            }
            
            setIsLoadingDeepLink(true);                                   // <-- Set loading state
            
            try {
                // LOAD PROJECT BY CODE FROM URL MANIFEST
                const project = await loadProjectByCode(urlData.projectCode, urlData.year);  // <-- Load project
                
                if (project) {
                    setSelectedProject(project);                          // <-- Set selected project
                    setCurrentView(APP_VIEWS.VIEWER);                     // <-- Navigate to viewer
                    return true;                                          // <-- Success
                } else {
                    console.error(`Project not found for code: ${urlData.projectCode}`);  // <-- Log error
                    setCurrentView(APP_VIEWS.GALLERY);                    // <-- Fallback to gallery
                    return false;                                         // <-- Failed to load
                }
            } catch (error) {
                console.error('Error loading project from URL:', error);  // <-- Log error
                setCurrentView(APP_VIEWS.GALLERY);                        // <-- Fallback to gallery
                return false;                                             // <-- Failed to load
            } finally {
                setIsLoadingDeepLink(false);                              // <-- Clear loading state
            }
        };
        // ---------------------------------------------------------------
        
        
        // EFFECT | Handle Deep Links on Mount
        // ---------------------------------------------------------------
        React.useEffect(() => {
            const initializeApp = async () => {
                const hasDeepLink = isProjectDeepLink();                  // <-- Check for deep link
                
                if (hasDeepLink) {
                    const loaded = await loadProjectFromUrl();            // <-- Load project from URL
                    
                    if (!loaded) {
                        setCurrentView(APP_VIEWS.HOME);                   // <-- Fallback to home if load failed
                    }
                } else {
                    // NO DEEP LINK - Start at home page
                    setCurrentView(APP_VIEWS.HOME);                       // <-- Normal flow starts at home
                }
            };
            
            initializeApp();                                              // <-- Run initialization
        }, []);                                                           // <-- Run once on mount
        // ---------------------------------------------------------------
        
        
        // EFFECT | Handle Browser Back/Forward Navigation
        // ---------------------------------------------------------------
        React.useEffect(() => {
            const handlePopState = async (event) => {
                const urlData = parseProjectUrl();                        // <-- Parse current URL
                
                if (urlData.isValid) {
                    // NAVIGATED TO PROJECT URL
                    await loadProjectFromUrl();                           // <-- Load project from URL
                } else {
                    // NAVIGATED AWAY FROM PROJECT
                    setSelectedProject(null);                             // <-- Clear selected project
                    setCurrentView(APP_VIEWS.GALLERY);                    // <-- Back to gallery
                }
            };
            
            window.addEventListener('popstate', handlePopState);          // <-- Listen for back/forward
            
            return () => {
                window.removeEventListener('popstate', handlePopState);   // <-- Cleanup listener
            };
        }, []);                                                           // <-- Run once on mount
        // ---------------------------------------------------------------
        
        // RENDER | Conditional View Rendering
        // ---------------------------------------------------------------
        return (
            <>
                {isLoadingDeepLink && (
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        height: '100vh',
                        fontSize: '1.2rem',
                        color: '#172b3a'
                    }}>
                        Loading project...
                    </div>
                )}
                
                {!isLoadingDeepLink && currentView === APP_VIEWS.HOME && (
                    <HomePage onEnter={handleEnterApp} />
                )}
                
                {!isLoadingDeepLink && currentView === APP_VIEWS.GALLERY && (
                    <ProjectGallery 
                        onSelectProject={handleSelectProject}
                        onOpenProjectEditor={handleOpenProjectEditor}
                        onOpenTimeAnalysis={handleOpenTimeAnalysis}
                    />
                )}
                
                {!isLoadingDeepLink && currentView === APP_VIEWS.VIEWER && (
                    <ProjectViewer 
                        project={selectedProject} 
                        onBack={handleBackToGallery}
                    />
                )}
                
                {!isLoadingDeepLink && currentView === APP_VIEWS.EDITOR && (
                    <ProjectEditor onBack={handleBackToGallery} />
                )}
                
                {!isLoadingDeepLink && currentView === APP_VIEWS.TIME_ANALYSIS && (
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

