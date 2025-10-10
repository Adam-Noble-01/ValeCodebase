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
        const [showPinEntry, setShowPinEntry] = React.useState(false);   // <-- PIN modal visibility state
        
        // SUB FUNCTION | Handle Enter Button Click
        // ---------------------------------------------------------------
        const handleEnterClick = () => {
            setShowPinEntry(true);                                       // <-- Show PIN entry modal
        };
        // ---------------------------------------------------------------
        
        // SUB FUNCTION | Handle PIN Success
        // ---------------------------------------------------------------
        const handlePinSuccess = () => {
            setShowPinEntry(false);                                      // <-- Hide PIN modal
            onEnter();                                                   // <-- Proceed to application
        };
        // ---------------------------------------------------------------
        
        // SUB FUNCTION | Handle PIN Cancel
        // ---------------------------------------------------------------
        const handlePinCancel = () => {
            setShowPinEntry(false);                                      // <-- Hide PIN modal
        };
        // ---------------------------------------------------------------
        
        return (
            <>
                <Header />
                
                <div className="homepage">
                    <img 
                        src="assets/AppLogo__Whitecardopedia__.png" 
                        alt="Whitecardopedia Logo"
                        className="homepage__logo"
                    />
                    <button 
                        className="homepage__button"
                        onClick={handleEnterClick}
                    >
                        Enter Whitecardopedia
                    </button>
                    
                    {showPinEntry && (
                        <PinEntry 
                            onSuccess={handlePinSuccess}
                            onCancel={handlePinCancel}
                        />
                    )}
                </div>
            </>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

