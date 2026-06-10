// =============================================================================
// WHITECARDOPEDIA - GALLERY MODE TOGGLE COMPONENT
// =============================================================================
//
// FILE       : Na__Feature__Blockoutopedia__GalleryModeToggle.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : GalleryModeToggle Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Toggle buttons to switch between Whitecard, Blockout, and Max Models gallery modes
// CREATED    : 07-Apr-2026
//
// DESCRIPTION:
// - Renders three toggle buttons: "Whitecard Models", "Blockout Models", "Max Models"
// - Active mode button has a darker background to indicate current selection
// - Accepts galleryMode and onModeChange props from parent
// - Positioned in the gallery controls bar between hamburger menu and search
// - Max Models tab filters by ProjectType === "MaxModel" (set by WCP builder
//   for source folders with the __MaxModel suffix)
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Apr-2026 - Version 1.0.0
// - Initial implementation with Whitecard / Blockout toggle.
//
// 10-Jun-2026 - Version 1.1.0
// - Added "Max Models" third tab for projects tagged ProjectType: MaxModel.
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
                <button
                    className={`gallery-mode-toggle__button ${galleryMode === 'maxmodel' ? 'gallery-mode-toggle__button--active' : ''}`}
                    onClick={() => onModeChange('maxmodel')}
                >
                    Max Models
                </button>
            </div>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
