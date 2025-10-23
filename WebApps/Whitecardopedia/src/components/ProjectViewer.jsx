// =============================================================================
// WHITECARDOPEDIA - PROJECT VIEWER COMPONENT
// =============================================================================
//
// FILE       : ProjectViewer.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : ProjectViewer Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Individual project image viewer with efficiency scale
// CREATED    : 2025
//
// DESCRIPTION:
// - Displays full project details with image carousel
// - Shows project metadata (name, code, description)
// - Displays time efficiency scale for schedule performance
// - Provides back navigation to project gallery
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Helper Functions
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

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Art Overlay Feature
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Download All Project Images as ZIP (Including ART Images)
    // ---------------------------------------------------------------
    const downloadProjectImages = async (project, setIsDownloading) => {
        setIsDownloading(true);                                          // <-- Enable loading state
        
        try {
            // FIX PATH CONSTRUCTION | Ensure trailing slash
            const basePath = project.basePath || `Projects/2025/${project.folderId}`;  // <-- Use existing basePath or construct from folderId
            const basePathWithSlash = basePath.endsWith('/') ? basePath : `${basePath}/`;  // <-- Ensure trailing slash
            
            // FETCH ALL IMAGES FROM JSON | Both base and ART are already in the array
            const imagesToDownload = project.allImages || project.images;  // <-- Use allImages if available
            const allImagePromises = imagesToDownload.map(async (imageName) => {
                const imagePath = basePathWithSlash + imageName;         // <-- Full image path
                const response = await fetch(imagePath);                 // <-- Fetch image file
                if (!response.ok) throw new Error(`Failed to fetch ${imageName}`);  // <-- Verify fetch success
                return {
                    name: imageName,                                     // <-- File name in ZIP
                    input: response                                      // <-- Response for client-zip
                };
            });
            
            const allFiles = await Promise.all(allImagePromises);        // <-- Wait for all images
            
            console.log(`[Download] Total files: ${allFiles.length}`);   // <-- Debug log
            
            // GENERATE ZIP | Use client-zip to create ZIP file
            if (!window.downloadZip) {
                throw new Error('ZIP library not loaded. Please refresh the page.');  // <-- Check library availability
            }
            const blob = await window.downloadZip(allFiles).blob();      // <-- Generate ZIP blob using client-zip
            
            // CREATE FILENAME | Format with date and folder name
            const today = new Date();                                    // <-- Get current date
            const dateStr = `${String(today.getDate()).padStart(2, '0')}-${today.toLocaleString('en-US', { month: 'short' })}-${today.getFullYear()}`;  // <-- Format date DD-MMM-YYYY
            const folderName = project.folderId || `${project.projectCode}__${project.projectName.replace(/\s+/g, '')}`;  // <-- Use folderId if available
            const filename = `${folderName}_Images_${dateStr}.zip`;      // <-- Create filename with correct folder name
            
            // DOWNLOAD FILE | Trigger browser download
            const link = document.createElement('a');                    // <-- Create download link
            link.href = URL.createObjectURL(blob);                       // <-- Create object URL
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

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Main Project Viewer Elements
// -----------------------------------------------------------------------------

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
                                images={project.displayImages || project.images}  // <-- Use pre-filtered base images
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
                                    
                                    {project.scheduleData?.timeTaken && (
                                        <div className="project-viewer__data-field">
                                            <span className="project-viewer__data-label">Time Taken</span>
                                            <span className="project-viewer__data-value">{project.scheduleData.timeTaken} Hours</span>
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
                                    <hr className="project-viewer__divider" />
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
                            
                            {project.scheduleData && (
                                <>
                                    <hr className="project-viewer__divider" />
                                    <h3 className="project-viewer__production-title">Efficiency Scale</h3>
                                    <EfficiencyScale scheduleData={project.scheduleData} compact={false} />
                                </>
                            )}
                            
                            <h3 className="project-viewer__actions-title">Project Actions</h3>
                            
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
                                                src="assets/AppIcons/Icon__DownloadButtonSymbol__.svg" 
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

