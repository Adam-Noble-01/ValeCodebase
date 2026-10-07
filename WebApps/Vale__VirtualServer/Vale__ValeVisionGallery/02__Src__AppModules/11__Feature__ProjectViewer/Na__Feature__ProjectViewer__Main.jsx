// =============================================================================
// VALEVISION GALLERY - PROJECT VIEWER COMPONENT
// =============================================================================
//
// FILE       : ProjectViewer.jsx
// NAMESPACE  : ValeVision Gallery
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
// - 18-Aug-2026: out-of-scope offset hours and Net In Scope Time shown when
//   a job records them; Efficiency Scale scores against net time.
// - 18-Aug-2026: legacy "View SketchUp Model" button removed (superseded by
//   ValeVision3D). See DEVLOG v0.6.15.
//
// 01-Jul-2026 - Version 1.2.0
// - Replaced standalone "Back to Gallery" button with top-left breadcrumb nav
//   ("‹ Project Gallery / <Project Title>"), matching the page title's position.
// - Project Actions sidebar panel now holds only Copy Share Link.
//
// 07-Oct-2026 - Version 1.3.0 (ValeVision Theia)
// - A Project Videos section in the right panel when the project has videos in
//   ValeVision Theia: each video (thumbnail, title, length, quality) opens it in
//   Theia, and "Watch in ValeVision Theia" opens the project's list. Theia's
//   breadcrumbs lead back here. The Gallery is signed-in staff only, so only
//   employees, managers and developers ever see it.
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Helper Functions
// -----------------------------------------------------------------------------

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
            // FETCH ALL IMAGES FROM JSON | Both base and ART are already in the array
            const imagesToDownload = project.allImages || project.images;  // <-- Use allImages if available
            const allImagePromises = imagesToDownload.map(async (imageName) => {
                const imagePath = getImageUrl(project, imageName);       // <-- Library URL (full quality)
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
// REGION | Project Videos (ValeVision Theia)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Video's Length, as Theia Shows It (0:25, 1:02:03)
    // ---------------------------------------------------------------
    const formatVideoLength = (ms) => {
        const total = Math.max(0, Math.floor((Number(ms) || 0) / 1000));    // <-- Whole seconds, rounded down as Theia's player shows them
        const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
        return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
    };
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Where a Project (or One Video) Opens in Theia
    // ---------------------------------------------------------------
    const theiaVideoUrl = (folderId, videoId) =>
        `/theia/?project=${encodeURIComponent(folderId)}${videoId ? `&video=${encodeURIComponent(videoId)}` : ''}`;
    // ---------------------------------------------------------------


    // COMPONENT | Project Videos Panel Section
    // ------------------------------------------------------------
    // The list record carries videoCount; the videos themselves (theiaVideos)
    // come with the full record, fetched here when there are any.
    // ------------------------------------------------------------
    function ProjectVideosPanel({ project }) {
        const count = Number(project.videoCount) || 0;
        const [videos, setVideos] = React.useState(project.theiaVideos || null);

        React.useEffect(() => {
            let live = true;
            if (project.theiaVideos) { setVideos(project.theiaVideos); return undefined; }
            if (!count) { setVideos([]); return undefined; }
            setVideos(null);
            loadProjectData(project.folderId)
                .then((full) => { if (live) setVideos((full && full.theiaVideos) || []); })
                .catch(() => { if (live) setVideos([]); });
            return () => { live = false; };
        }, [project.folderId]);

        if (!count && !(videos && videos.length)) return null;              // <-- No videos: no section

        return (
            <div className="project-viewer__panel-section project-viewer__panel-section--videos">
                <hr className="project-viewer__divider project-viewer__divider--viewer-actions" />
                <h3 className="project-viewer__actions-title project-viewer__actions-title--viewer-actions">Project Videos</h3>

                {videos === null ? (
                    <p className="project-viewer__videos-note">Loading videos...</p>
                ) : (
                    <ul className="project-viewer__videos-list">
                        {videos.map((video) => (
                            <li key={video.id} className="project-viewer__videos-item">
                                <a className="project-viewer__video-link" href={theiaVideoUrl(project.folderId, video.id)} title={`Watch "${video.title}" in ValeVision Theia`}>
                                    <span
                                        className="project-viewer__video-thumb"
                                        style={video.thumbUrl ? { backgroundImage: `url("${video.thumbUrl}")` } : undefined}
                                    >
                                        <span className="project-viewer__video-play" aria-hidden="true"></span>
                                    </span>
                                    <span className="project-viewer__video-text">
                                        <span className="project-viewer__video-title">{video.title}</span>
                                        <span className="project-viewer__video-meta">
                                            {formatVideoLength(video.durationMs)}
                                            {video.quality && <span className="project-viewer__video-quality">{video.quality}</span>}
                                        </span>
                                    </span>
                                </a>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="project-viewer__viewer-actions">
                    <a
                        className="project-viewer__viewer-action-button project-viewer__viewer-action-button--videos"
                        href={theiaVideoUrl(project.folderId, null)}
                        title="Open this project's videos in ValeVision Theia"
                    >
                        <img src="/AppAssets__CommonApplicationAssets/Icons__ProjectGallery__ContentIndicatorIcons/Icon__ProjectGallery__ContentIndicatorIcon__TheiaVideo__512px__.png" alt="" className="project-viewer__viewer-action-video-icon" />
                        Watch in ValeVision Theia
                    </a>
                </div>
            </div>
        );
    }
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

        const projectTiming = na_calculate_net_time(project?.scheduleData);  // <-- Absolute / offset / net hours for this job

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
                                            {project.displayName || project.projectName} <span className="project-viewer__code-inline">- {project.projectCode}</span>
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

                                    {/* OFFSET HOURS | Only rendered when this job records out-of-scope time */}
                                    {projectTiming.hasAdjustments && (
                                        <>
                                            {NA_TIME_ADJUSTMENT_CATEGORIES
                                                .filter(category => projectTiming.offsetsByKey[category.key] > 0)
                                                .map(category => (
                                                    <div className="project-viewer__data-field" key={category.key}>
                                                        <span className="project-viewer__data-label">{category.label}</span>
                                                        <span className="project-viewer__data-value">
                                                            {projectTiming.offsetsByKey[category.key]} Hours
                                                        </span>
                                                    </div>
                                                ))}

                                            {projectTiming.hasAbsolute && (
                                                <div className="project-viewer__data-field project-viewer__data-field--emphasis">
                                                    <span className="project-viewer__data-label">Net In Scope Time</span>
                                                    <span className="project-viewer__data-value">{projectTiming.net} Hours</span>
                                                </div>
                                            )}
                                        </>
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
                            
                            <ProjectVideosPanel project={project} />

                            {!checkValeVisionModelUrl(project) && (
                                <div className="project-viewer__panel-section project-viewer__panel-section--download">
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
                                                        src="/AppAssets__CommonApplicationAssets/AppIcons/Icon__DownloadButtonSymbol__.svg" 
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
                                        src="/AppAssets__CommonApplicationAssets/AppIcons/Icon__DownloadButtonSymbol__.svg"
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

