// =============================================================================
// WHITECARDOPEDIA - PROJECT EDITOR COMPONENT
// =============================================================================
//
// FILE       : ProjectEditor.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : ProjectEditor Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Main view for Project Editor tool
// CREATED    : 2025
//
// DESCRIPTION:
// - Main view component for Project Editor tool
// - Gallery-style project selection interface
// - Includes search and filter controls for easy project selection
// - Displays editor form when project is selected
// - Back to Gallery navigation in header
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | ProjectEditor Component
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Editor View States
    // ------------------------------------------------------------
    const EDITOR_VIEWS = {
        SELECTION           : 'SELECTION',                                   // <-- Project selection view
        EDITING             : 'EDITING',                                     // <-- Project editing view
    };
    // ------------------------------------------------------------


    // COMPONENT | Project Editor Main View
    // ------------------------------------------------------------
    function ProjectEditor({ onBack }) {
        const [editorView, setEditorView] = React.useState(EDITOR_VIEWS.SELECTION);  // <-- Current editor view
        const [projects, setProjects] = React.useState([]);                  // <-- Projects array state
        const [loading, setLoading] = React.useState(true);                  // <-- Loading state
        const [sortBy, setSortBy] = React.useState('date-newest');           // <-- Sort option state
        const [searchTerm, setSearchTerm] = React.useState('');              // <-- Search term state
        const [selectedProject, setSelectedProject] = React.useState(null);  // <-- Selected project state
        
        
        // EFFECT | Load Projects on Mount
        // ---------------------------------------------------------------
        React.useEffect(() => {
            async function fetchProjects() {
                const loadedProjects = await loadAllProjects();              // <-- Load all projects
                setProjects(loadedProjects);                                 // <-- Update projects state
                setLoading(false);                                           // <-- Set loading to false
            }
            
            fetchProjects();                                                 // <-- Execute fetch function
        }, []);
        // ---------------------------------------------------------------
        
        
        // SUB FUNCTION | Handle Project Selection
        // ---------------------------------------------------------------
        const handleSelectProject = (project) => {
            setSelectedProject(project);                                     // <-- Set selected project
            setEditorView(EDITOR_VIEWS.EDITING);                             // <-- Switch to editing view
        };
        // ---------------------------------------------------------------
        
        
        // SUB FUNCTION | Handle Cancel Editing
        // ---------------------------------------------------------------
        const handleCancelEdit = () => {
            setSelectedProject(null);                                        // <-- Clear selected project
            setEditorView(EDITOR_VIEWS.SELECTION);                           // <-- Return to selection view
        };
        // ---------------------------------------------------------------
        
        
        // SUB FUNCTION | Handle Save Success
        // ---------------------------------------------------------------
        const handleSaveSuccess = (updatedProject) => {
            // UPDATE PROJECT IN LOCAL STATE
            setProjects(prevProjects => 
                prevProjects.map(p => 
                    p.folderId === updatedProject.folderId ? updatedProject : p
                )
            );                                                               // <-- Update projects array
            
            setSelectedProject(null);                                        // <-- Clear selected project
            setEditorView(EDITOR_VIEWS.SELECTION);                           // <-- Return to selection view
        };
        // ---------------------------------------------------------------
        
        
        // SUB FUNCTION | Handle Sort Option Change
        // ---------------------------------------------------------------
        const handleSortChange = (newSortBy) => {
            setSortBy(newSortBy);                                            // <-- Update sort option state
        };
        // ---------------------------------------------------------------
        
        
        // SUB FUNCTION | Handle Search Term Change
        // ---------------------------------------------------------------
        const handleSearchChange = (newSearchTerm) => {
            setSearchTerm(newSearchTerm);                                    // <-- Update search term state
        };
        // ---------------------------------------------------------------
        
        
        // RENDER | Loading State
        // ---------------------------------------------------------------
        if (loading) {
            return (
                <>
                    <Header showBackButton={true} onBack={onBack} />
                    <div className="project-editor">
                        <div className="project-editor__content">
                            <p style={{ textAlign: 'center', fontSize: '18px' }}>
                                Loading projects...
                            </p>
                        </div>
                    </div>
                </>
            );
        }
        // ---------------------------------------------------------------
        
        
        // RENDER | Editing View
        // ---------------------------------------------------------------
        if (editorView === EDITOR_VIEWS.EDITING && selectedProject) {
            return (
                <>
                    <Header showBackButton={true} onBack={handleCancelEdit} />
                    <div className="project-editor">
                        <div className="project-editor__content">
                            <ProjectEditorForm 
                                project={selectedProject}
                                onCancel={handleCancelEdit}
                                onSaveSuccess={handleSaveSuccess}
                            />
                        </div>
                    </div>
                </>
            );
        }
        // ---------------------------------------------------------------
        
        
        // RENDER | Selection View
        // ---------------------------------------------------------------
        const sortedProjects = sortProjects(projects, sortBy);              // <-- Apply sorting to projects
        const filteredProjects = filterProjects(sortedProjects, searchTerm);  // <-- Apply search filtering
        
        return (
            <>
                <Header showBackButton={true} onBack={onBack} />
                
                <div className="project-editor">
                    <div className="project-editor__content">
                        <h1 className="project-editor__title">
                            Select a Project to Edit
                        </h1>
                        
                        <div className="project-gallery__controls">
                            <SearchBox 
                                searchTerm={searchTerm}
                                onSearchChange={handleSearchChange}
                            />
                            <SortControls 
                                sortBy={sortBy}
                                onSortChange={handleSortChange}
                            />
                        </div>
                        
                        <div className="project-gallery__grid">
                            {filteredProjects.length === 0 ? (
                                <p style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: '18px', color: 'var(--Vale_TextSecondary)' }}>
                                    No projects match your search
                                </p>
                            ) : (
                                filteredProjects.map((project) => (
                                <div 
                                    key={project.folderId}
                                    className="project-card"
                                    onClick={() => handleSelectProject(project)}
                                >
                                    <div className={`project-card__image-container ${getImageEffectClass(project)}`}>
                                        <img 
                                            src={getThumbnailImage(project)} 
                                            alt={project.projectName}
                                            className="project-card__image"
                                        />
                                        {isHandDrawnProject(project) && (
                                            <div className="project-card__white-overlay"></div>
                                        )}
                                    </div>
                                    
                                    <div className="project-card__content">
                                        <h3 className="project-card__name">{project.projectName}</h3>
                                        <p className="project-card__code">{project.projectCode}</p>
                                        {project.projectDate && (
                                            <p className="project-card__date">{formatProjectDate(project.projectDate)}</p>
                                        )}
                                    </div>
                                </div>
                            ))
                            )}
                        </div>
                    </div>
                </div>
            </>
        );
        // ---------------------------------------------------------------
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

