// =============================================================================
// VALEVISION GALLERY - HEADER COMPONENT
// =============================================================================
//
// FILE       : Na__AppCore__Header.jsx
// NAMESPACE  : ValeVisionGallery
// MODULE     : Header Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Persistent header bar: Vale logo left, app title right
// CREATED    : 2025
//
// DESCRIPTION:
// - Vale Garden Houses logo on the left.
// - The app title on the right as text ("ValeVision Gallery", or
//   "ValeVision Gallery · Blockout" in blockout mode). The old title artwork
//   carried the retired name, so it is no longer used.
// - Leaves room at the far right for the signed-in user's initials avatar
//   (shared Vale sign-in).
// - Navigation is handled by the Breadcrumbs bar beneath the header.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 06-Oct-2026 - Version 1.0.0
// - Text title replaces the old title artwork; share links use the library
//   project id; room for the avatar.
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Header Component
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Title Text by Gallery Mode
    // ------------------------------------------------------------
    const HEADER_TITLE_CONFIG = {
        whitecard : { title: 'ValeVision Gallery', mode: '' },
        blockout  : { title: 'ValeVision Gallery', mode: 'Blockout' },
    };
    // ------------------------------------------------------------


    // COMPONENT | Application Header Bar
    // ------------------------------------------------------------
    function Header({ showShareButton = false, currentProject = null, galleryMode = 'whitecard' }) {
        const [showCopiedMessage, setShowCopiedMessage] = React.useState(false);
        const titleCfg = HEADER_TITLE_CONFIG[galleryMode] || HEADER_TITLE_CONFIG.whitecard;

        // SUB FUNCTION | Copy the Project's Share Link
        // ---------------------------------------------------------------
        const handleShareLink = async () => {
            if (!currentProject || !currentProject.folderId) return;
            const result = await copyShareLinkToClipboard(currentProject.folderId);
            if (result.success) {
                setShowCopiedMessage(true);
                setTimeout(() => setShowCopiedMessage(false), 3000);
            } else {
                alert(`Failed to copy link. URL: ${result.url}`);
            }
        };
        // ---------------------------------------------------------------

        return (
            <header className="app-header app-header--with-avatar">
                <div className="app-header__logo-container app-header__logo-container--left">
                    <img
                        src="/AppAssets__CommonApplicationAssets/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png"
                        alt="Vale Garden Houses"
                        className="app-header__logo-left"
                    />
                </div>

                {showShareButton && currentProject && (
                    <button className="app-header__share-button" onClick={handleShareLink} title="Copy sharing link to clipboard">
                        <img src="/AppAssets__CommonApplicationAssets/AppIcons/Icon__DownloadButtonSymbol__.svg" alt="Share" className="app-header__share-icon" />
                        Copy Share Link
                        {showCopiedMessage && <span className="app-header__copied-message">Copied!</span>}
                    </button>
                )}

                <div className="app-header__logo-container app-header__logo-container--right">
                    <span className="app-header__title-text">
                        {titleCfg.title}
                        {titleCfg.mode && <span className="app-header__title-mode">{titleCfg.mode}</span>}
                    </span>
                </div>
            </header>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
