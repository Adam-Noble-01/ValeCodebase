// =============================================================================
// WHITECARDOPEDIA - IMAGE CAROUSEL COMPONENT
// =============================================================================
//
// FILE       : ImageCarousel.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : ImageCarousel Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Image navigation and display component
// CREATED    : 2025
//
// DESCRIPTION:
// - Displays project images with navigation controls
// - Supports previous/next navigation
// - Shows thumbnail strip for quick image selection
// - Displays current image counter
// - Implements drag-to-reveal comparison for ART image pairs
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Helper Functions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Calculate Slider Position from Mouse/Touch Event
    // ---------------------------------------------------------------
    const calculateSliderPosition = (clientX, containerRef) => {
        if (!containerRef.current) return;                               // <-- Exit if no container reference
        
        const rect = containerRef.current.getBoundingClientRect();       // <-- Get container dimensions
        const x = clientX - rect.left;                                   // <-- Calculate relative X position
        const percentage = (x / rect.width) * 100;                       // <-- Convert to percentage
        
        return Math.max(0, Math.min(100, percentage));                   // <-- Clamp between 0-100
    };
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Check if Project has ValeVision Model URL
    // ---------------------------------------------------------------
    // Checks multiple project.json formats in priority order:
    // v4: valeVision_ModelUrls (array) - preferred new format
    // v3: valeVision_ModelUrl_BaseMesh / _Linework (separate fields)
    // v2: valeVision_ModelUrl (array) - legacy array format
    // v1: valeVision_ModelUrl (string) - legacy single URL format
    // ---------------------------------------------------------------
    const hasValeVisionModel = (projectData) => {
        if (!projectData) return false;                                  // <-- Check if project data exists
        
        // V4 FORMAT | New multi-model array (preferred)
        // ---------------------------------------------------------------
        if (Array.isArray(projectData.valeVision_ModelUrls) && projectData.valeVision_ModelUrls.length > 0) {
            return true;                                                // <-- Return true if v4 array has items
        }
        // ---------------------------------------------------------------
        
        // V3 FORMAT | Layered BaseMesh + Linework pair
        // ---------------------------------------------------------------
        const baseUrl = projectData.valeVision_ModelUrl_BaseMesh;        // <-- Get base mesh URL
        const lineworkUrl = projectData.valeVision_ModelUrl_Linework;    // <-- Get linework URL
        const hasBase = typeof baseUrl === 'string' && baseUrl.length > 0;  // <-- Check base mesh URL
        const hasLinework = typeof lineworkUrl === 'string' && lineworkUrl.length > 0;  // <-- Check linework URL
        if (hasBase || hasLinework) {
            return true;                                                // <-- Return true if any v3 URL exists
        }
        // ---------------------------------------------------------------
        
        // V2/V1 FORMAT | Legacy single URL (array or string)
        // ---------------------------------------------------------------
        const url = projectData.valeVision_ModelUrl;                     // <-- Get legacy ValeVision model URL
        if (!url) return false;                                          // <-- Return false if no URL
        
        if (Array.isArray(url)) {
            return url.length > 0;                                       // <-- Check v2 array has items
        }
        
        return typeof url === 'string' && url.length > 0;                // <-- Check v1 string is not empty
        // ---------------------------------------------------------------
    };
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Detect if Running on Localhost
    // ---------------------------------------------------------------
    const isRunningOnLocalhost = () => {
        const hostname = window.location.hostname;                       // <-- Get current hostname
        const port = window.location.port;                               // <-- Get current port
        return hostname === 'localhost' || hostname === '127.0.0.1' || port === '8000';  // <-- Check localhost indicators
    };
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Generate ValeVision3D URL with Project Parameter
    // ---------------------------------------------------------------
    const getValeVisionUrl = (projectCode) => {
        if (isRunningOnLocalhost()) {
            // LOCALHOST MODE - Use Flask server route
            return `/ValeVision3D/index.html?project=${projectCode}`;    // <-- Server-relative path
        } else {
            // STATIC MODE - Use relative file path
            return `../ValeVision3D/index.html?project=${projectCode}`;  // <-- File-relative path
        }
    };
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Handle ValeVision Button Click
    // ---------------------------------------------------------------
    const handleValeVisionClick = (projectData) => {
        const projectCode = projectData.folderId;                        // <-- Get project folder ID
        const valeVisionUrl = getValeVisionUrl(projectCode);             // <-- Generate ValeVision URL
        window.open(valeVisionUrl, '_blank');                            // <-- Open in new tab
    };
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Art Image Detection & Loading
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get ART Image Data for Current Image
    // ---------------------------------------------------------------
    const getArtImageForCurrent = (currentIndex, images, projectData, setArtImageData, setShowHint, setSliderPosition, hintShownFor, setHintShownFor) => {
        const currentImage = images[currentIndex];                       // <-- Get current image
        const artPair = getArtPairForImage(projectData, currentImage);   // <-- Direct lookup (no async)
        
        if (artPair) {
            setArtImageData(artPair);                                    // <-- Set ART data
            setSliderPosition(50);                                       // <-- Reset slider to center
            
            if (!hintShownFor.has(currentIndex)) {
                setShowHint(true);                                       // <-- Show hint for new ART image
                setHintShownFor(prev => new Set([...prev, currentIndex]));
                
                setTimeout(() => {
                    setShowHint(false);                                  // <-- Auto-hide hint
                }, 3000);
            }
        } else {
            setArtImageData(null);                                       // <-- No ART pair
            setShowHint(false);                                          // <-- Hide hint
        }
    };
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Navigation Controls
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Navigate to Previous Image
    // ---------------------------------------------------------------
    const handlePrevious = (currentIndex, imagesLength, setCurrentIndex) => {
        setCurrentIndex((prevIndex) => 
            prevIndex === 0 ? imagesLength - 1 : prevIndex - 1           // <-- Wrap to last image if at start
        );
    };
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Navigate to Next Image
    // ---------------------------------------------------------------
    const handleNext = (currentIndex, imagesLength, setCurrentIndex) => {
        setCurrentIndex((prevIndex) => 
            prevIndex === imagesLength - 1 ? 0 : prevIndex + 1           // <-- Wrap to first image if at end
        );
    };
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Navigate to Specific Image via Thumbnail
    // ---------------------------------------------------------------
    const handleThumbnailClick = (index, setCurrentIndex) => {
        setCurrentIndex(index);                                          // <-- Set current index to clicked thumbnail
    };
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Drag-to-Reveal Interaction Handlers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Handle Mouse Down on Comparison Slider
    // ---------------------------------------------------------------
    const handleMouseDown = (e, containerRef, setIsDragging, setShowHint, setSliderPosition) => {
        e.preventDefault();                                              // <-- Prevent default behavior
        setIsDragging(true);                                             // <-- Set dragging state
        setShowHint(false);                                              // <-- Hide hint on interaction
        
        const position = calculateSliderPosition(e.clientX, containerRef);  // <-- Calculate initial position
        if (position !== undefined) {
            setSliderPosition(position);                                 // <-- Update slider position
        }
    };
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Handle Mouse Move During Drag
    // ---------------------------------------------------------------
    const handleMouseMove = (e, isDragging, containerRef, setSliderPosition) => {
        if (!isDragging) return;                                         // <-- Exit if not dragging
        
        const position = calculateSliderPosition(e.clientX, containerRef);  // <-- Calculate current position
        if (position !== undefined) {
            setSliderPosition(position);                                 // <-- Update slider position
        }
    };
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Handle Mouse Up to End Drag
    // ---------------------------------------------------------------
    const handleMouseUp = (setIsDragging) => {
        setIsDragging(false);                                            // <-- Clear dragging state
    };
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Handle Touch Start on Comparison Slider
    // ---------------------------------------------------------------
    const handleTouchStart = (e, containerRef, setIsDragging, setShowHint, setSliderPosition) => {
        setIsDragging(true);                                             // <-- Set dragging state
        setShowHint(false);                                              // <-- Hide hint on interaction
        
        const touch = e.touches[0];                                      // <-- Get first touch point
        const position = calculateSliderPosition(touch.clientX, containerRef);  // <-- Calculate position
        if (position !== undefined) {
            setSliderPosition(position);                                 // <-- Update slider position
        }
    };
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Handle Touch Move During Drag
    // ---------------------------------------------------------------
    const handleTouchMove = (e, isDragging, containerRef, setSliderPosition) => {
        if (!isDragging) return;                                         // <-- Exit if not dragging
        
        const touch = e.touches[0];                                      // <-- Get first touch point
        const position = calculateSliderPosition(touch.clientX, containerRef);  // <-- Calculate position
        if (position !== undefined) {
            setSliderPosition(position);                                 // <-- Update slider position
        }
    };
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Handle Touch End to End Drag
    // ---------------------------------------------------------------
    const handleTouchEnd = (setIsDragging) => {
        setIsDragging(false);                                            // <-- Clear dragging state
    };
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Main Carousel Component
// -----------------------------------------------------------------------------

    // COMPONENT | Image Carousel with Navigation and ART Comparison
    // ------------------------------------------------------------
    function ImageCarousel({ images, projectData }) {
        const [currentIndex, setCurrentIndex] = React.useState(0);       // <-- Current image index state
        const [sliderPosition, setSliderPosition] = React.useState(50);  // <-- Slider position percentage (0-100)
        const [isDragging, setIsDragging] = React.useState(false);       // <-- Dragging state
        const [artImageData, setArtImageData] = React.useState(null);    // <-- ART image data for current image
        const [showHint, setShowHint] = React.useState(true);            // <-- Show hint overlay state
        const [hintShownFor, setHintShownFor] = React.useState(new Set()); // <-- Track which images showed hint
        const containerRef = React.useRef(null);                         // <-- Reference to comparison container
        
        // EFFECT | Get ART Image When Index Changes
        // ---------------------------------------------------------------
        React.useEffect(() => {
            getArtImageForCurrent(currentIndex, images, projectData, setArtImageData, setShowHint, setSliderPosition, hintShownFor, setHintShownFor);
        }, [currentIndex, projectData, images]);
        // ---------------------------------------------------------------
        
        // EFFECT | Add Global Mouse/Touch Event Listeners During Drag
        // ---------------------------------------------------------------
        React.useEffect(() => {
            const onMouseMove = (e) => handleMouseMove(e, isDragging, containerRef, setSliderPosition);
            const onMouseUp = () => handleMouseUp(setIsDragging);
            const onTouchMove = (e) => handleTouchMove(e, isDragging, containerRef, setSliderPosition);
            const onTouchEnd = () => handleTouchEnd(setIsDragging);
            
            if (isDragging) {
                document.addEventListener('mousemove', onMouseMove);     // <-- Add mouse move listener
                document.addEventListener('mouseup', onMouseUp);         // <-- Add mouse up listener
                document.addEventListener('touchmove', onTouchMove);     // <-- Add touch move listener
                document.addEventListener('touchend', onTouchEnd);       // <-- Add touch end listener
            }
            
            return () => {
                document.removeEventListener('mousemove', onMouseMove);  // <-- Remove mouse move listener
                document.removeEventListener('mouseup', onMouseUp);      // <-- Remove mouse up listener
                document.removeEventListener('touchmove', onTouchMove);  // <-- Remove touch move listener
                document.removeEventListener('touchend', onTouchEnd);    // <-- Remove touch end listener
            };
        }, [isDragging]);
        // ---------------------------------------------------------------
        
        if (!images || images.length === 0) {
            return (
                <div className="image-carousel">
                    <div className="image-carousel__main">
                        <p>No images available</p>
                    </div>
                </div>
            );
        }
        
        const currentImageUrl = getImageUrl(projectData, images[currentIndex]);  // <-- Get current image URL
        const hasArtPair = artImageData !== null;                        // <-- Check if ART pair exists
        
        return (
            <div className="image-carousel">
                <div className="image-carousel__main">
                    {!hasArtPair ? (
                        // NORMAL IMAGE DISPLAY (NO ART PAIR)
                        <div className="image-carousel__image-wrapper">
                            <img 
                                src={currentImageUrl} 
                                alt={`Project image ${currentIndex + 1}`}
                                className="image-carousel__image"
                            />
                            {hasValeVisionModel(projectData) && (
                                <img 
                                    src="../assets__CommonApplicationAssets/Logo__ValeVision3d/FeatureLogo__ValeVision3d__ClickHereVersion__1.0.0__.png"
                                    alt="Load in ValeVision3D"
                                    className="image-carousel__valevision-overlay"
                                    onClick={() => handleValeVisionClick(projectData)}
                                    title="Load 3D Model in ValeVision3D"
                                />
                            )}
                        </div>
                    ) : (
                        // COMPARISON DISPLAY (WITH ART PAIR)
                        <div 
                            ref={containerRef}
                            className="image-carousel__comparison-container"
                            onMouseDown={(e) => handleMouseDown(e, containerRef, setIsDragging, setShowHint, setSliderPosition)}
                            onTouchStart={(e) => handleTouchStart(e, containerRef, setIsDragging, setShowHint, setSliderPosition)}
                        >
                            {/* BASE LAYER - WHITECARD IMAGE */}
                            <img 
                                src={currentImageUrl} 
                                alt={`Project image ${currentIndex + 1}`}
                                className="image-carousel__image image-carousel__image--base"
                            />
                            
                            {/* TOP LAYER - ART IMAGE (CLIPPED) */}
                            <div 
                                className="image-carousel__comparison-layer"
                                style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
                            >
                                <img 
                                    src={artImageData.url} 
                                    alt={`${artImageData.label} version`}
                                    className="image-carousel__image image-carousel__image--art"
                                />
                            </div>
                            
                            {/* VERTICAL DIVIDER BAR */}
                            <div 
                                className="image-carousel__comparison-divider"
                                style={{ left: `${sliderPosition}%` }}
                            >
                                <div className="image-carousel__comparison-handle">
                                    <svg width="40" height="40" viewBox="0 0 40 40">
                                        <circle cx="20" cy="20" r="18" fill="white" stroke="#172b3a" strokeWidth="2"/>
                                        <path d="M15 20 L18 17 L18 23 Z" fill="#172b3a"/>
                                        <path d="M25 20 L22 17 L22 23 Z" fill="#172b3a"/>
                                    </svg>
                                </div>
                            </div>
                            
                            {/* ART TYPE LABEL */}
                            <div className="image-carousel__art-label">
                                {artImageData.label}
                            </div>
                            
                            {/* HINT OVERLAY */}
                            {showHint && (
                                <div className="image-carousel__comparison-hint">
                                    <div className="image-carousel__comparison-hint-icon">
                                        <svg width="48" height="48" viewBox="0 0 48 48">
                                            <g fill="#ffffff" stroke="#172b3a" strokeWidth="1.5">
                                                <path d="M24 8 L20 12 L22 12 L22 20 L18 20 L24 28 L30 20 L26 20 L26 12 L28 12 Z"/>
                                                <circle cx="12" cy="24" r="3"/>
                                                <circle cx="36" cy="24" r="3"/>
                                            </g>
                                        </svg>
                                    </div>
                                    <div className="image-carousel__comparison-hint-text">
                                        Drag to reveal {artImageData.label.toLowerCase()}
                                    </div>
                                </div>
                            )}
                            
                            {/* VALEVISION OVERLAY */}
                            {hasValeVisionModel(projectData) && (
                                <img 
                                    src="../assets__CommonApplicationAssets/Logo__ValeVision3d/FeatureLogo__ValeVision3d__ClickHereVersion__50%-Opacity__1.0.0__.png"
                                    alt="Load in ValeVision3D"
                                    className="image-carousel__valevision-overlay"
                                    onClick={() => handleValeVisionClick(projectData)}
                                    title="Load 3D Model in ValeVision3D"
                                />
                            )}
                        </div>
                    )}
                    
                    {images.length > 1 && (
                        <>
                            <button 
                                className="image-carousel__button image-carousel__button--prev"
                                onClick={() => handlePrevious(currentIndex, images.length, setCurrentIndex)}
                                aria-label="Previous image"
                            >
                                ‹
                            </button>
                            
                            <button 
                                className="image-carousel__button image-carousel__button--next"
                                onClick={() => handleNext(currentIndex, images.length, setCurrentIndex)}
                                aria-label="Next image"
                            >
                                ›
                            </button>
                            
                            <div className="image-carousel__counter">
                                {currentIndex + 1} / {images.length}
                            </div>
                        </>
                    )}
                </div>
                
                {images.length > 1 && (
                    <div className="image-carousel__thumbnails">
                        {images.map((image, index) => (
                            <img
                                key={index}
                                src={getImageUrl(projectData, image)}
                                alt={`Thumbnail ${index + 1}`}
                                className={`image-carousel__thumbnail ${index === currentIndex ? 'image-carousel__thumbnail--active' : ''}`}
                                onClick={() => handleThumbnailClick(index, setCurrentIndex)}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

