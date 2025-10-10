// =============================================================================
// WHITECARDOPEDIA - PROJECT VIEWER COMPONENT
// =============================================================================
//
// FILE       : ProjectViewer.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : ProjectViewer Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Individual project image viewer with ratings
// CREATED    : 2025
//
// DESCRIPTION:
// - Displays full project details with image carousel
// - Shows project metadata (name, code, description)
// - Displays star ratings for Quality, Prestige, Value
// - Provides back navigation to project gallery
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | ProjectViewer Component
// -----------------------------------------------------------------------------

    // COMPONENT | Project Detail Viewer
    // ------------------------------------------------------------
    function ProjectViewer({ project, onBack }) {
        if (!project) {
            return (
                <div className="project-viewer">
                    <p>No project selected</p>
                </div>
            );
        }
        
        return (
            <>
                <header className="app-header">
                    <button 
                        className="app-header__back-button"
                        onClick={onBack}
                    >
                        ← Back to Gallery
                    </button>
                    <h1 className="app-header__title">Whitecardopedia</h1>
                    <div style={{ width: '120px' }}></div>
                </header>
                
                <div className="project-viewer">
                    <div className="project-viewer__header">
                        <h1 className="project-viewer__title">{project.projectName}</h1>
                        <p className="project-viewer__code">{project.projectCode}</p>
                        {project.description && (
                            <p className="project-viewer__description">{project.description}</p>
                        )}
                    </div>
                    
                    <div className="project-viewer__content">
                        <div className="project-viewer__carousel-container">
                            <ImageCarousel 
                                images={project.images} 
                                projectData={project}
                            />
                        </div>
                        
                        <div className="project-viewer__ratings-panel">
                            <h2 className="project-viewer__ratings-title">Project Ratings</h2>
                            
                            <div className="project-viewer__rating-item">
                                <span className="project-viewer__rating-label">Quality</span>
                                <StarRating rating={project.quality} />
                            </div>
                            
                            <div className="project-viewer__rating-item">
                                <span className="project-viewer__rating-label">Prestige</span>
                                <StarRating rating={project.prestige} />
                            </div>
                            
                            <div className="project-viewer__rating-item">
                                <span className="project-viewer__rating-label">Value</span>
                                <StarRating rating={project.value} />
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

