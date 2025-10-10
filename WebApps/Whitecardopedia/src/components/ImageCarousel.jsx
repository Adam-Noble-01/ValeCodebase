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
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | ImageCarousel Component
// -----------------------------------------------------------------------------

    // COMPONENT | Image Carousel with Navigation
    // ------------------------------------------------------------
    function ImageCarousel({ images, projectData }) {
        const [currentIndex, setCurrentIndex] = React.useState(0);       // <-- Current image index state
        
        // SUB FUNCTION | Navigate to Previous Image
        // ---------------------------------------------------------------
        const handlePrevious = () => {
            setCurrentIndex((prevIndex) => 
                prevIndex === 0 ? images.length - 1 : prevIndex - 1      // <-- Wrap to last image if at start
            );
        };
        // ---------------------------------------------------------------
        
        // SUB FUNCTION | Navigate to Next Image
        // ---------------------------------------------------------------
        const handleNext = () => {
            setCurrentIndex((prevIndex) => 
                prevIndex === images.length - 1 ? 0 : prevIndex + 1      // <-- Wrap to first image if at end
            );
        };
        // ---------------------------------------------------------------
        
        // SUB FUNCTION | Navigate to Specific Image
        // ---------------------------------------------------------------
        const handleThumbnailClick = (index) => {
            setCurrentIndex(index);                                      // <-- Set current index to clicked thumbnail
        };
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
        
        return (
            <div className="image-carousel">
                <div className="image-carousel__main">
                    <img 
                        src={currentImageUrl} 
                        alt={`Project image ${currentIndex + 1}`}
                        className="image-carousel__image"
                    />
                    
                    {images.length > 1 && (
                        <>
                            <button 
                                className="image-carousel__button image-carousel__button--prev"
                                onClick={handlePrevious}
                                aria-label="Previous image"
                            >
                                ‹
                            </button>
                            
                            <button 
                                className="image-carousel__button image-carousel__button--next"
                                onClick={handleNext}
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
                                onClick={() => handleThumbnailClick(index)}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

