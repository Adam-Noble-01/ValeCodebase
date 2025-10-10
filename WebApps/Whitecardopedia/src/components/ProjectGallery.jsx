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
    function ProjectGallery({ onSelectProject }) {
        const [projects, setProjects] = React.useState([]);              // <-- Projects array state
        const [loading, setLoading] = React.useState(true);              // <-- Loading state
        
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
        
        return (
            <div className="project-gallery">
                <h1 className="project-gallery__title">Vale Garden Houses - Whitecard Review</h1>
                
                <div className="project-gallery__grid">
                    {projects.map((project) => (
                        <div 
                            key={project.folderId}
                            className="project-card"
                            onClick={() => onSelectProject(project)}
                        >
                            <img 
                                src={getThumbnailImage(project)} 
                                alt={project.projectName}
                                className="project-card__image"
                            />
                            
                            <div className="project-card__content">
                                <h3 className="project-card__name">{project.projectName}</h3>
                                <p className="project-card__code">{project.projectCode}</p>
                                
                                <div className="project-card__ratings">
                                    <div className="project-card__rating-row">
                                        <span className="project-card__rating-label">Quality</span>
                                        <StarRating rating={project.ratings?.quality || project.quality || 0} />
                                    </div>
                                    
                                    <div className="project-card__rating-row">
                                        <span className="project-card__rating-label">Prestige</span>
                                        <StarRating rating={project.ratings?.prestige || project.prestige || 0} />
                                    </div>
                                    
                                    <div className="project-card__rating-row">
                                        <span className="project-card__rating-label">Value</span>
                                        <StarRating rating={project.ratings?.value || project.value || 0} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

