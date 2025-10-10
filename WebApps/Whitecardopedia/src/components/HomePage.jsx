// =============================================================================
// WHITECARDOPEDIA - HOME PAGE COMPONENT
// =============================================================================
//
// FILE       : HomePage.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : HomePage Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Landing page with Whitecardopedia logo
// CREATED    : 2025
//
// DESCRIPTION:
// - Displays Whitecardopedia logo as landing page
// - Provides entry button to proceed to project gallery
// - First page users see when accessing application
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | HomePage Component
// -----------------------------------------------------------------------------

    // COMPONENT | Home Page Landing Screen
    // ------------------------------------------------------------
    function HomePage({ onEnter }) {
        return (
            <div className="homepage">
                <img 
                    src="assets/AppLogo__Whitecardopedia__.png" 
                    alt="Whitecardopedia Logo"
                    className="homepage__logo"
                />
                <button 
                    className="homepage__button"
                    onClick={onEnter}
                >
                    Enter Whitecardopedia
                </button>
            </div>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

