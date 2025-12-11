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
        
        // EFFECT | Check for URL Project ID on Mount
        // ---------------------------------------------------------------
        React.useEffect(() => {
            const projectIdFromUrl = getProjectIdFromUrl();              // <-- Extract project ID from URL
            
            if (projectIdFromUrl) {
                setUrlProjectId(projectIdFromUrl);                       // <-- Store URL project ID
                setIsLoadingUrlProject(true);                            // <-- Set loading state
                
                // Load all projects and find matching project
                loadAllProjects().then(projects => {
                    const matchingProject = projects.find(
                        p => p.projectCode === projectIdFromUrl         // <-- Find by project code
                    );
                    
                    if (matchingProject) {
                        setSelectedProject(matchingProject);             // <-- Set selected project
                        setCurrentView(APP_VIEWS.VIEWER);                // <-- Navigate to viewer
                    } else {
                        console.error(`Project not found: ${projectIdFromUrl}`);  // <-- Log error
                        alert(`Project "${projectIdFromUrl}" not found. Redirecting to gallery.`);  // <-- User feedback
                        setCurrentView(APP_VIEWS.GALLERY);               // <-- Navigate to gallery
                    }
                    
                    setIsLoadingUrlProject(false);                       // <-- Clear loading state
                });
            }
        }, []);                                                          // <-- Run only on mount
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
                {currentView === APP_VIEWS.HOME && (
                    <HomePage onEnter={handleEnterApp} />
                )}
                
                {currentView === APP_VIEWS.GALLERY && (
                    <ProjectGallery 
                        onSelectProject={handleSelectProject}
                        onOpenProjectEditor={handleOpenProjectEditor}
                        onOpenTimeAnalysis={handleOpenTimeAnalysis}
                    />
                )}
                
                {currentView === APP_VIEWS.VIEWER && (
                    <ProjectViewer 
                        project={selectedProject} 
                        onBack={handleBackToGallery}
                    />
                )}
                
                {currentView === APP_VIEWS.EDITOR && (
                    <ProjectEditor onBack={handleBackToGallery} />
                )}
                
                {currentView === APP_VIEWS.TIME_ANALYSIS && (
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

