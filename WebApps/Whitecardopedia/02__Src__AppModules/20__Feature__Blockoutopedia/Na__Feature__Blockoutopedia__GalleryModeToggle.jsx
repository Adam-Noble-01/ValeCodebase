// =============================================================================
// WHITECARDOPEDIA - GALLERY MODE TOGGLE COMPONENT
// =============================================================================
//
// FILE       : Na__Feature__Blockoutopedia__GalleryModeToggle.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : GalleryModeToggle Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Toggle buttons to switch between Whitecard and Blockout gallery modes
// CREATED    : 07-Apr-2026
//
// DESCRIPTION:
// - Renders two toggle buttons: "Whitecard Models" and "Blockout Models"
// - Active mode button has a darker background to indicate current selection
// - Accepts galleryMode and onModeChange props from parent
// - Positioned in the gallery controls bar between hamburger menu and search
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | GalleryModeToggle Component
// -----------------------------------------------------------------------------

    // COMPONENT | Gallery Mode Toggle Buttons
    // ------------------------------------------------------------
    function GalleryModeToggle({ galleryMode, onModeChange }) {
        return (
            <div className="gallery-mode-toggle">
                <button
                    className={`gallery-mode-toggle__button ${galleryMode === 'whitecard' ? 'gallery-mode-toggle__button--active' : ''}`}
                    onClick={() => onModeChange('whitecard')}
                >
                    Whitecard Models
                </button>
                <button
                    className={`gallery-mode-toggle__button ${galleryMode === 'blockout' ? 'gallery-mode-toggle__button--active' : ''}`}
                    onClick={() => onModeChange('blockout')}
                >
                    Blockout Models
                </button>
            </div>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
