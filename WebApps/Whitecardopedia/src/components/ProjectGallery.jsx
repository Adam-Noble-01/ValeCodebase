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

    // HELPER FUNCTION | Sort Projects by Selected Criteria
    // ---------------------------------------------------------------
    function sortProjects(projects, sortBy) {
        const sorted = [...projects];                                    // <-- Create copy to avoid mutation
        
        switch (sortBy) {
            case 'date-newest':
                return sorted.sort((a, b) => {
                    const dateA = parseProjectDate(a.projectDate);       // <-- Parse date A
                    const dateB = parseProjectDate(b.projectDate);       // <-- Parse date B
                    if (!dateA) return 1;                                // <-- Handle invalid dates
                    if (!dateB) return -1;                               // <-- Handle invalid dates
                    return dateB - dateA;                                // <-- Newest first (descending)
                });
                
            case 'date-oldest':
                return sorted.sort((a, b) => {
                    const dateA = parseProjectDate(a.projectDate);       // <-- Parse date A
                    const dateB = parseProjectDate(b.projectDate);       // <-- Parse date B
                    if (!dateA) return 1;                                // <-- Handle invalid dates
                    if (!dateB) return -1;                               // <-- Handle invalid dates
                    return dateA - dateB;                                // <-- Oldest first (ascending)
                });
                
            case 'name-asc':
                return sorted.sort((a, b) => {
                    const nameA = (a.projectName || '').toLowerCase();   // <-- Get name A lowercase
                    const nameB = (b.projectName || '').toLowerCase();   // <-- Get name B lowercase
                    return nameA.localeCompare(nameB);                   // <-- A to Z
                });
                
            case 'name-desc':
                return sorted.sort((a, b) => {
                    const nameA = (a.projectName || '').toLowerCase();   // <-- Get name A lowercase
                    const nameB = (b.projectName || '').toLowerCase();   // <-- Get name B lowercase
                    return nameB.localeCompare(nameA);                   // <-- Z to A
                });
                
            case 'code-asc':
                return sorted.sort((a, b) => {
                    const codeA = (a.projectCode || '').toLowerCase();   // <-- Get code A lowercase
                    const codeB = (b.projectCode || '').toLowerCase();   // <-- Get code B lowercase
                    return codeA.localeCompare(codeB);                   // <-- A to Z
                });
                
            case 'code-desc':
                return sorted.sort((a, b) => {
                    const codeA = (a.projectCode || '').toLowerCase();   // <-- Get code A lowercase
                    const codeB = (b.projectCode || '').toLowerCase();   // <-- Get code B lowercase
                    return codeB.localeCompare(codeA);                   // <-- Z to A
                });
                
            default:
                return sorted;                                           // <-- Return unsorted if unknown option
        }
    }
    // ---------------------------------------------------------------


    // COMPONENT | Project Gallery Grid View
    // ------------------------------------------------------------
    function ProjectGallery({ onSelectProject }) {
        const [projects, setProjects] = React.useState([]);              // <-- Projects array state
        const [loading, setLoading] = React.useState(true);              // <-- Loading state
        const [sortBy, setSortBy] = React.useState('date-newest');       // <-- Sort option state
        
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
        const handleSortChange = (event) => {
            setSortBy(event.target.value);                               // <-- Update sort option state
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
        
        return (
            <>
                <Header />
                
                <div className="project-gallery">
                    <div className="project-gallery__sort-control">
                        <label htmlFor="sort-select" className="project-gallery__sort-label">Sort by:</label>
                        <select 
                            id="sort-select"
                            className="project-gallery__sort-select"
                            value={sortBy}
                            onChange={handleSortChange}
                        >
                            <option value="date-newest">Date - Newest First</option>
                            <option value="date-oldest">Date - Oldest First</option>
                            <option value="name-asc">Name - A to Z</option>
                            <option value="name-desc">Name - Z to A</option>
                            <option value="code-asc">Project Code - A to Z</option>
                            <option value="code-desc">Project Code - Z to A</option>
                        </select>
                    </div>
                    
                    <div className="project-gallery__grid">
                        {sortedProjects.map((project) => (
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
                                    {project.projectDate && (
                                        <p className="project-card__date">{formatProjectDate(project.projectDate)}</p>
                                    )}
                                    
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
            </>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

