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
// - Provides breadcrumb navigation back to project gallery
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 2025 - Version 1.0.0
// - Initial project detail viewer with carousel and efficiency scale.
//
// 25-Jun-2026 - Version 1.1.0
// - Added Designer field to Production Data panel (productionData.designer).
// - Time Taken displays sentinel text without "Hours" suffix when non-numeric.
// - Efficiency Scale hidden until scheduleData has numeric timeAllocated + timeTaken.
//
// 01-Jul-2026 - Version 1.2.0
// - Replaced standalone "Back to Gallery" button with top-left breadcrumb nav
//   ("‹ Project Gallery / <Project Title>"), matching the page title's position.
// - Project Actions sidebar panel now holds only Copy Share Link.
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
            // FIX PATH CONSTRUCTION | Ensure trailing slash (folderId includes year)
            const basePath = project.basePath || `Projects/${project.folderId}`;  // <-- Use existing basePath or construct from year-aware folderId
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
        const [showCopiedMessage, setShowCopiedMessage] = React.useState(false);  // <-- Track copied message state

        // SUB FUNCTION | Handle Share Link Copy Action
        // ---------------------------------------------------------------
        const handleShareLink = async () => {
            if (!project || !project.projectCode) {
                console.error('No project available for sharing');      // <-- Log error
                return;                                                  // <-- Exit if no project
            }

            const result = await copyShareLinkToClipboard(project.projectCode);  // <-- Copy share URL
            if (result.success) {
                setShowCopiedMessage(true);                             // <-- Show copied confirmation
                setTimeout(() => setShowCopiedMessage(false), 3000);    // <-- Auto-hide confirmation
            } else {
                alert(`Failed to copy link. URL: ${result.url}`);       // <-- Show fallback URL
            }
        };
        // ---------------------------------------------------------------

        if (!project) {
            return (
                <div className="project-viewer">
                    <p>No project selected</p>
                </div>
            );
        }

        // DERIVE CAROUSEL IMAGES | 3D projects show IMG01 only — nudges user to ValeVision3D.
        // Uses hasGlb_R2 from the master index (forwarded by ProjectLoader) rather than
        // reading valeVision_ModelUrls from project.json, keeping detection simple and consistent.
        const baseImages     = project.displayImages || project.images || [];  // <-- Pre-filtered base scenes
        const carouselImages = project.hasGlb_R2
            ? baseImages.slice(0, 1)                                 // <-- 3D model: IMG01 only, nav hidden by carousel
            : baseImages;                                            // <-- No 3D model: full whitecard carousel

        return (
            <>
                <Header />
                
                <div className="project-viewer">
                    {project.description && isValidTextContent(project.description) && (
                        <div className="project-viewer__header">
                            <p className="project-viewer__description">{project.description}</p>
                        </div>
                    )}

                    <div className="project-viewer__content">
                        <div className="project-viewer__carousel-container">
                            <nav className="project-viewer__breadcrumb project-viewer__breadcrumb--overlay" aria-label="Breadcrumb">
                                <ol className="project-viewer__breadcrumb-list">
                                    <li className="project-viewer__breadcrumb-item">
                                        <button
                                            type="button"
                                            className="project-viewer__breadcrumb-link"
                                            onClick={onBack}
                                        >
                                            <span className="project-viewer__breadcrumb-chevron" aria-hidden="true">‹</span>
                                            Project Gallery
                                        </button>
                                        <span className="project-viewer__breadcrumb-separator" aria-hidden="true">/</span>
                                    </li>
                                    <li
                                        className="project-viewer__breadcrumb-item project-viewer__breadcrumb-item--current"
                                        aria-current="page"
                                    >
                                        <h1 className="project-viewer__breadcrumb-current">
                                            {project.projectName} <span className="project-viewer__code-inline">- {project.projectCode}</span>
                                        </h1>
                                    </li>
                                </ol>
                            </nav>
                            <ImageCarousel
                                images={carouselImages}  // <-- IMG01-only when ValeVision model present
                                projectData={project}
                            />
                        </div>
                        
                        <div className="project-viewer__ratings-panel">
                            <div className="project-viewer__panel-section project-viewer__panel-section--data">
                            <h2 className="project-viewer__data-title">Production Data</h2>
                            
                            {project.productionData && (
                                <>
                                    {project.scheduleData?.dateReceived && (
                                        <div className="project-viewer__data-field">
                                            <span className="project-viewer__data-label">Date Received</span>
                                            <span className="project-viewer__data-value">{formatProjectDate(project.scheduleData.dateReceived)}</span>
                                        </div>
                                    )}
                                    
                                    {project.scheduleData?.dateFulfilled && (
                                        <div className="project-viewer__data-field">
                                            <span className="project-viewer__data-label">Date Fulfilled</span>
                                            <span className="project-viewer__data-value">{formatProjectDate(project.scheduleData.dateFulfilled)}</span>
                                        </div>
                                    )}
                                    
                                    {project.scheduleData?.timeTaken && (
                                        <div className="project-viewer__data-field">
                                            <span className="project-viewer__data-label">Time Taken</span>
                                            <span className="project-viewer__data-value">
                                                {typeof project.scheduleData.timeTaken === 'number' ? `${project.scheduleData.timeTaken} Hours` : project.scheduleData.timeTaken}
                                            </span>
                                        </div>
                                    )}
                                    
                                    {project.productionData.conceptArtist && (
                                        <div className="project-viewer__data-field">
                                            <span className="project-viewer__data-label">Concept Artist</span>
                                            <span className="project-viewer__data-value">{project.productionData.conceptArtist}</span>
                                        </div>
                                    )}
                                    
                                    {project.productionData.designer && (
                                        <div className="project-viewer__data-field">
                                            <span className="project-viewer__data-label">Designer</span>
                                            <span className="project-viewer__data-value">{project.productionData.designer}</span>
                                        </div>
                                    )}
                                    
                                    {project.productionData.input && (
                                        <div className="project-viewer__data-field">
                                            <span className="project-viewer__data-label">Input Type</span>
                                            <span className="project-viewer__data-value">{project.productionData.input}</span>
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
                            </div>
                            
                            {!checkValeVisionModelUrl(project) && (
                                <div className="project-viewer__panel-section project-viewer__panel-section--download">
                                    <h3 className="project-viewer__actions-title">Project Actions</h3>
                                    
                                    {project.sketchUpModel && isValidSketchUpUrl(project.sketchUpModel.url) && (
                                        <div className="project-viewer__download-section">
                                            <a 
                                                href={project.sketchUpModel.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="project-viewer__download-button"
                                            >
                                                <img 
                                                    src="../assets__CommonApplicationAssets/AppIcons/Icon__SketchUpLogo__WhiteFillVersion.svg" 
                                                    alt="SketchUp" 
                                                    className="project-viewer__download-icon"
                                                />
                                                View SketchUp Model
                                            </a>
                                        </div>
                                    )}
                                    
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
                                                        src="../assets__CommonApplicationAssets/AppIcons/Icon__DownloadButtonSymbol__.svg" 
                                                        alt="Download" 
                                                        className="project-viewer__download-icon"
                                                    />
                                                    Download Image Files
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="project-viewer__panel-section project-viewer__panel-section--viewer-actions">
                            <hr className="project-viewer__divider project-viewer__divider--viewer-actions" />
                            <h3 className="project-viewer__actions-title project-viewer__actions-title--viewer-actions">Project Actions</h3>

                            <div className="project-viewer__viewer-actions">
                                <button
                                    className="project-viewer__viewer-action-button project-viewer__viewer-action-button--share"
                                    onClick={handleShareLink}
                                    title="Copy sharing link to clipboard"
                                >
                                    <img
                                        src="../assets__CommonApplicationAssets/AppIcons/Icon__DownloadButtonSymbol__.svg"
                                        alt="Share"
                                        className="project-viewer__viewer-action-icon"
                                    />
                                    Copy Share Link
                                    {showCopiedMessage && (
                                        <span className="project-viewer__viewer-action-copied-message">Copied!</span>
                                    )}
                                </button>
                            </div>
                            </div>

                            {project.scheduleData &&
                             typeof project.scheduleData.timeAllocated === 'number' &&
                             typeof project.scheduleData.timeTaken === 'number' && (
                                <div className="project-viewer__panel-section project-viewer__panel-section--efficiency">
                                    <hr className="project-viewer__divider" />
                                    <h3 className="project-viewer__production-title">Efficiency Scale</h3>
                                    <EfficiencyScale scheduleData={project.scheduleData} compact={false} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

