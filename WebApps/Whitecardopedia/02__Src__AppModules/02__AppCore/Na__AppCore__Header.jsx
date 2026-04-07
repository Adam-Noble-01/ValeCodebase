// =============================================================================
// WHITECARDOPEDIA - HEADER COMPONENT
// =============================================================================
//
// FILE       : Header.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : Header Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Persistent header bar with dual logo layout
// CREATED    : 2025
//
// DESCRIPTION:
// - Persistent header component displayed across all pages
// - Features Vale Garden Houses logo on left
// - Features Whitecardopedia or Blockoutopedia title logo on right
// - Optional back button for navigation
// - White background with subtle shadow and Vale blue bottom border
// - Swaps right logo based on galleryMode prop (whitecard/blockout)
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Header Component
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Header Logo URLs by Gallery Mode
    // ------------------------------------------------------------
    const HEADER_LOGO_CONFIG = {
        whitecard : {
            src : 'https://adam-noble-01.github.io/ValeCodebase/WebApps/assets__CommonApplicationAssets/AppLogo__Whitecardopedia__TopBar__TitleText__.png',
            alt : 'Whitecardopedia',
        },
        blockout  : {
            src : 'https://adam-noble-01.github.io/ValeCodebase/WebApps/assets__CommonApplicationAssets/AppLogo__Whitecardopedia__TopBar__TitleText__Blockoutopedia__.png',
            alt : 'Blockoutopedia',
        },
    };
    // ------------------------------------------------------------

    // COMPONENT | Application Header Bar with Dual Logo Layout
    // ------------------------------------------------------------
    function Header({ showBackButton = false, onBack = null, showShareButton = false, currentProject = null, galleryMode = 'whitecard' }) {
        const [showCopiedMessage, setShowCopiedMessage] = React.useState(false);  // <-- Copied confirmation state
        
        // SUB FUNCTION | Handle Share Link Generation
        // ---------------------------------------------------------------
        const handleShareLink = async () => {
            if (!currentProject || !currentProject.projectCode) {
                console.error('No project available for sharing');      // <-- Log error
                return;                                                  // <-- Exit if no project
            }
            
            const result = await copyShareLinkToClipboard(currentProject.projectCode);  // <-- Copy to clipboard
            
            if (result.success) {
                setShowCopiedMessage(true);                             // <-- Show confirmation
                setTimeout(() => setShowCopiedMessage(false), 3000);    // <-- Hide after 3 seconds
            } else {
                alert(`Failed to copy link. URL: ${result.url}`);       // <-- Show error with URL
            }
        };
        // ---------------------------------------------------------------
        
        return (
            <header className="app-header">
                <div className="app-header__logo-container app-header__logo-container--left">
                    <img 
                        src="../assets__CommonApplicationAssets/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png"
                        alt="Vale Garden Houses"
                        className="app-header__logo-left"
                    />
                </div>
                
                {showBackButton && onBack && (
                    <button 
                        className="app-header__back-button"
                        onClick={onBack}
                    >
                        <img 
                            src="../assets__CommonApplicationAssets/AppIcons/Icon__BackSymbol__WhiteVersion.svg" 
                            alt="Back" 
                            className="app-header__back-icon"
                        />
                        Back to Gallery
                    </button>
                )}
                
                {showShareButton && currentProject && (
                    <button 
                        className="app-header__share-button"
                        onClick={handleShareLink}
                        title="Copy sharing link to clipboard"
                    >
                        <img 
                            src="../assets__CommonApplicationAssets/AppIcons/Icon__DownloadButtonSymbol__.svg" 
                            alt="Share" 
                            className="app-header__share-icon"
                        />
                        Copy Share Link
                        {showCopiedMessage && (
                            <span className="app-header__copied-message">Copied!</span>
                        )}
                    </button>
                )}
                
                <div className="app-header__logo-container app-header__logo-container--right">
                    <img 
                        src={HEADER_LOGO_CONFIG[galleryMode]?.src || HEADER_LOGO_CONFIG.whitecard.src}
                        alt={HEADER_LOGO_CONFIG[galleryMode]?.alt || HEADER_LOGO_CONFIG.whitecard.alt}
                        className="app-header__logo-right"
                    />
                </div>
            </header>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

