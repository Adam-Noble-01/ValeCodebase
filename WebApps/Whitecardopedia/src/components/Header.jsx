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
// - Features Whitecardopedia title logo on right
// - Optional back button for navigation
// - White background with subtle shadow and Vale blue bottom border
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Header Component
// -----------------------------------------------------------------------------

    // COMPONENT | Application Header Bar with Dual Logo Layout
    // ------------------------------------------------------------
    function Header({ showBackButton = false, onBack = null }) {
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
                
                <div className="app-header__logo-container app-header__logo-container--right">
                    <img 
                        src="../assets__CommonApplicationAssets/AppLogo__Whitecardopedia__TopBar__TitleText__.png"
                        alt="Whitecardopedia"
                        className="app-header__logo-right"
                    />
                </div>
            </header>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

