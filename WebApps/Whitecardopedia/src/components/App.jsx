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
    };
    // ------------------------------------------------------------


    // COMPONENT | Main Application Root
    // ------------------------------------------------------------
    function App() {
        const [currentView, setCurrentView] = React.useState(APP_VIEWS.HOME);  // <-- Current view state
        const [selectedProject, setSelectedProject] = React.useState(null);    // <-- Selected project state
        
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
        };
        // ---------------------------------------------------------------
        
        // SUB FUNCTION | Handle Back to Gallery
        // ---------------------------------------------------------------
        const handleBackToGallery = () => {
            setSelectedProject(null);                                    // <-- Clear selected project
            setCurrentView(APP_VIEWS.GALLERY);                           // <-- Navigate to gallery
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
                    <ProjectGallery onSelectProject={handleSelectProject} />
                )}
                
                {currentView === APP_VIEWS.VIEWER && (
                    <ProjectViewer 
                        project={selectedProject} 
                        onBack={handleBackToGallery}
                    />
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

