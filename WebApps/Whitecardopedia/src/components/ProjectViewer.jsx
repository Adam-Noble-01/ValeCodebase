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

    // HELPER FUNCTION | Validate SketchUp Model URL
    // ---------------------------------------------------------------
    const isValidSketchUpUrl = (url) => {
        if (!url || typeof url !== 'string') return false;              // <-- Check if URL exists and is string
        const invalidValues = ['nil', 'none', 'false'];                 // <-- Invalid placeholder values
        return !invalidValues.includes(url.toLowerCase().trim());       // <-- Exclude invalid values
    };
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Validate Text Field Content
    // ---------------------------------------------------------------
    const isValidTextContent = (text) => {
        if (!text || typeof text !== 'string') return false;            // <-- Check if text exists and is string
        const invalidValues = ['nil', 'none', 'false', 'n/a'];          // <-- Invalid placeholder values
        return !invalidValues.includes(text.toLowerCase().trim());       // <-- Exclude invalid values
    };
    // ---------------------------------------------------------------


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
                <Header showBackButton={true} onBack={onBack} />
                
                <div className="project-viewer">
                    <div className="project-viewer__header">
                        <h1 className="project-viewer__title">
                            {project.projectName} <span className="project-viewer__code-inline">- {project.projectCode}</span>
                        </h1>
                        {project.description && isValidTextContent(project.description) && (
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
                            <h2 className="project-viewer__data-title">Production Data</h2>
                            
                            {project.projectDate && (
                                <div className="project-viewer__data-field">
                                    <span className="project-viewer__data-label">Project Date</span>
                                    <span className="project-viewer__data-value">{formatProjectDate(project.projectDate)}</span>
                                </div>
                            )}
                            
                            {project.productionData && (
                                <>
                                    {project.productionData.input && (
                                        <div className="project-viewer__data-field">
                                            <span className="project-viewer__data-label">Input</span>
                                            <span className="project-viewer__data-value">{project.productionData.input}</span>
                                        </div>
                                    )}
                                    
                                    {project.productionData.duration && (
                                        <div className="project-viewer__data-field">
                                            <span className="project-viewer__data-label">Duration</span>
                                            <span className="project-viewer__data-value">{project.productionData.duration} Hours</span>
                                        </div>
                                    )}
                                    
                                    {project.productionData.additionalNotes && isValidTextContent(project.productionData.additionalNotes) && (
                                        <div className="project-viewer__data-field project-viewer__data-field--notes">
                                            <span className="project-viewer__data-label">Additional Notes</span>
                                            <span className="project-viewer__data-value">{project.productionData.additionalNotes}</span>
                                        </div>
                                    )}
                                </>
                            )}
                            
                            {project.sketchUpModel && isValidSketchUpUrl(project.sketchUpModel.url) && (
                                <>
                                    <h3 className="project-viewer__production-title">SketchUp Model</h3>
                                    
                                    <a 
                                        href={project.sketchUpModel.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="project-viewer__model-button"
                                    >
                                        View SketchUp Model
                                    </a>
                                </>
                            )}
                            
                            <h3 className="project-viewer__production-title">Stats</h3>
                            
                            <div className="project-viewer__rating-item">
                                <span className="project-viewer__rating-label">Output Quality</span>
                                <StarRating rating={project.ratings?.quality || project.quality || 0} />
                            </div>
                            
                            <div className="project-viewer__rating-item">
                                <span className="project-viewer__rating-label">Job Prestige</span>
                                <StarRating rating={project.ratings?.prestige || project.prestige || 0} />
                            </div>
                            
                            <div className="project-viewer__rating-item">
                                <span className="project-viewer__rating-label">Project Value</span>
                                <StarRating rating={project.ratings?.value || project.value || 0} />
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

