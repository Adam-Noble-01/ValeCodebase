// =============================================================================
// WHITECARDOPEDIA - PROJECT GALLERY COMPONENT
// =============================================================================
//
// FILE       : ProjectGallery.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : ProjectGallery Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Grid view of all available projects
// CREATED    : 2025
//
// DESCRIPTION:
// - Displays grid of project cards with thumbnails
// - Shows project name, code, and star ratings
// - Handles project selection and navigation to project viewer
// - Loads all projects dynamically from configuration
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | ProjectGallery Component
// -----------------------------------------------------------------------------

    // COMPONENT | Project Gallery Grid View
    // ------------------------------------------------------------
    function ProjectGallery({ onSelectProject, onOpenProjectEditor, onOpenTimeAnalysis }) {
        const [projects, setProjects] = React.useState([]);              // <-- Projects array state
        const [loading, setLoading] = React.useState(true);              // <-- Loading state
        const [sortBy, setSortBy] = React.useState('date-newest');       // <-- Sort option state
        const [searchTerm, setSearchTerm] = React.useState('');          // <-- Search term state
        
        // EFFECT | Load Projects on Mount
        // ---------------------------------------------------------------
        React.useEffect(() => {
            async function fetchProjects() {
                const loadedProjects = await loadAllProjects();          // <-- Load all projects
                setProjects(loadedProjects);                             // <-- Update projects state
                setLoading(false);                                       // <-- Set loading to false
            }
            
            fetchProjects();                                             // <-- Execute fetch function
        }, []);
        // ---------------------------------------------------------------
        
        
        // SUB FUNCTION | Handle Sort Option Change
        // ---------------------------------------------------------------
        const handleSortChange = (newSortBy) => {
            setSortBy(newSortBy);                                        // <-- Update sort option state
        };
        // ---------------------------------------------------------------
        
        
        // SUB FUNCTION | Handle Search Term Change
        // ---------------------------------------------------------------
        const handleSearchChange = (newSearchTerm) => {
            setSearchTerm(newSearchTerm);                                // <-- Update search term state
        };
        // ---------------------------------------------------------------
        
        if (loading) {
            return (
                <div className="project-gallery">
                    <p style={{ textAlign: 'center', fontSize: '18px' }}>Loading projects...</p>
                </div>
            );
        }
        
        if (projects.length === 0) {
            return (
                <div className="project-gallery">
                    <p style={{ textAlign: 'center', fontSize: '18px' }}>No projects available</p>
                </div>
            );
        }
        
        const sortedProjects = sortProjects(projects, sortBy);           // <-- Apply sorting to projects
        const filteredProjects = filterProjects(sortedProjects, searchTerm);  // <-- Apply search filtering
        
        return (
            <>
                <Header />
                
                <div className="project-gallery">
                    <div className="project-gallery__controls">
                        <div className="project-gallery__controls-left">
                            <HamburgerMenu 
                                onProjectEditorClick={onOpenProjectEditor}
                                onTimeAnalysisClick={onOpenTimeAnalysis}
                            />
                            <SearchBox 
                                searchTerm={searchTerm}
                                onSearchChange={handleSearchChange}
                            />
                        </div>
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
                                onClick={() => onSelectProject(project)}
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
                                    {project.scheduleData?.dateFulfilled && (
                                        <p className="project-card__date">{formatProjectDate(project.scheduleData.dateFulfilled)}</p>
                                    )}
                                </div>
                            </div>
                        ))
                        )}
                    </div>
                </div>
            </>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

