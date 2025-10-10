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


    // HELPER FUNCTION | Download All Project Images as ZIP
    // ---------------------------------------------------------------
    const downloadProjectImages = async (project, setIsDownloading) => {
        setIsDownloading(true);                                          // <-- Enable loading state
        
        try {
            const zip = new JSZip();                                     // <-- Create new ZIP instance
            const projectFolder = project.projectCode + '__' + project.projectName.replace(/\s+/g, '');  // <-- Format folder name
            const basePath = `Projects/2025/${projectFolder}/`;          // <-- Base path for images
            
            // LOAD IMAGES | Fetch and add each image to ZIP
            for (const imageName of project.images) {
                const imagePath = basePath + imageName;                  // <-- Full image path
                const response = await fetch(imagePath);                 // <-- Fetch image file
                const blob = await response.blob();                      // <-- Convert to blob
                const arrayBuffer = await blob.arrayBuffer();            // <-- Convert blob to ArrayBuffer for binary handling
                zip.file(imageName, arrayBuffer, { binary: true });      // <-- Add to ZIP archive with binary flag
            }
            
            // GENERATE ZIP | Create ZIP file and trigger download
            const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });  // <-- Generate ZIP blob with no compression (lossless)
            const today = new Date();                                    // <-- Get current date
            const dateStr = `${String(today.getDate()).padStart(2, '0')}-${today.toLocaleString('en-US', { month: 'short' })}-${today.getFullYear()}`;  // <-- Format date DD-MMM-YYYY
            const filename = `${project.projectCode}__${project.projectName.replace(/\s+/g, '')}_Images_${dateStr}.zip`;  // <-- Create filename
            
            const link = document.createElement('a');                    // <-- Create download link
            link.href = URL.createObjectURL(zipBlob);                    // <-- Create object URL
            link.download = filename;                                    // <-- Set download filename
            link.click();                                                // <-- Trigger download
            URL.revokeObjectURL(link.href);                              // <-- Clean up object URL
            
        } catch (error) {
            console.error('Error downloading images:', error);           // <-- Log errors
            alert('Failed to download images. Please try again.');       // <-- User feedback
        } finally {
            setIsDownloading(false);                                     // <-- Disable loading state
        }
    };
    // ---------------------------------------------------------------


    // COMPONENT | Project Detail Viewer
    // ------------------------------------------------------------
    function ProjectViewer({ project, onBack }) {
        const [isDownloading, setIsDownloading] = React.useState(false);  // <-- Track download state
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
                                    
                                    {(() => {
                                        const notes = project.productionData.additionalNotes;
                                        const isValid = isValidTextContent(notes);
                                        console.log('Additional Notes Debug:', {
                                            notes: notes,
                                            hasNotes: !!notes,
                                            isValid: isValid,
                                            shouldRender: notes && isValid
                                        });
                                        return notes && isValid ? (
                                            <div className="project-viewer__data-field project-viewer__data-field--notes">
                                                <span className="project-viewer__data-label">Additional Notes</span>
                                                <span className="project-viewer__data-value">{notes}</span>
                                            </div>
                                        ) : null;
                                    })()}
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
                            
                            <div className="project-viewer__download-section">
                                <button 
                                    className={`project-viewer__download-button ${isDownloading ? 'project-viewer__download-button--loading' : ''}`}
                                    onClick={() => downloadProjectImages(project, setIsDownloading)}
                                    disabled={isDownloading}
                                >
                                    {isDownloading ? (
                                        <>
                                            <span className="project-viewer__download-spinner"></span>
                                            Downloading...
                                        </>
                                    ) : (
                                        <>
                                            <img 
                                                src="assets/AppIcons/Tempt__Icon__DownloadButtonSymbol__.svg" 
                                                alt="Download" 
                                                className="project-viewer__download-icon"
                                            />
                                            Download Image Files
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

