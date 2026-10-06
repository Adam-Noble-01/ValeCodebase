// =============================================================================
// VALEVISION GALLERY - HAMBURGER MENU COMPONENT
// =============================================================================
//
// FILE       : HamburgerMenu.jsx
// NAMESPACE  : ValeVision Gallery
// MODULE     : HamburgerMenu Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Navigation menu for utility tools and features
// CREATED    : 2025
//
// DESCRIPTION:
// - Hamburger menu button with dropdown for tool navigation
// - Provides access to Project Editor and future utility tools
// - Toggles visibility on button click
// - Closes when clicking outside menu
// - Styled with Vale Design Suite standards
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | HamburgerMenu Component
// -----------------------------------------------------------------------------

    // COMPONENT | Hamburger Menu Navigation
    // ------------------------------------------------------------
    function HamburgerMenu({ onProjectEditorClick, onTimeAnalysisClick, onPurgeCacheClick }) {
        const [isOpen, setIsOpen] = React.useState(false);                   // <-- Menu open state
        const menuRef = React.useRef(null);                                  // <-- Menu DOM reference
        
        // SUB FUNCTION | Toggle Menu Open/Close State
        // ---------------------------------------------------------------
        const toggleMenu = () => {
            setIsOpen(!isOpen);                                              // <-- Toggle menu state
        };
        // ---------------------------------------------------------------
        
        
        // SUB FUNCTION | Handle Project Editor Click
        // ---------------------------------------------------------------
        const handleProjectEditorClick = () => {
            setIsOpen(false);                                                // <-- Close menu
            onProjectEditorClick();                                          // <-- Call parent handler
        };
        // ---------------------------------------------------------------
        
        // SUB FUNCTION | Handle 3D Production KPI Report Click
        // ---------------------------------------------------------------
        const handleTimeAnalysisClick = () => {
            setIsOpen(false);                                                // <-- Close menu
            onTimeAnalysisClick();                                           // <-- Call parent handler
        };
        // ---------------------------------------------------------------

        // SUB FUNCTION | Handle Purge App Cache Click
        // ---------------------------------------------------------------
        const handlePurgeCacheClick = () => {
            setIsOpen(false);                                                // <-- Close menu before dialog
            onPurgeCacheClick();                                             // <-- Call parent handler
        };
        // ---------------------------------------------------------------
        
        
        // EFFECT | Close Menu When Clicking Outside
        // ---------------------------------------------------------------
        React.useEffect(() => {
            const handleClickOutside = (event) => {
                if (menuRef.current && !menuRef.current.contains(event.target)) {
                    setIsOpen(false);                                        // <-- Close menu
                }
            };
            
            if (isOpen) {
                document.addEventListener('mousedown', handleClickOutside);  // <-- Add event listener
            }
            
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);  // <-- Cleanup listener
            };
        }, [isOpen]);
        // ---------------------------------------------------------------
        
        
        const canManage = !!(window.ValeUserLogin && window.ValeUserLogin.HasLevel('Management'));   // <-- Editor and KPI report
        const isAppAdmin = !!(window.ValeUserLogin && window.ValeUserLogin.IsAppAdmin());           // <-- Developer tools
        if (!canManage && !isAppAdmin) return null;                                                  // <-- Nothing to offer: no menu

        return (
            <div className="hamburger-menu" ref={menuRef}>
                <button 
                    className="hamburger-menu__button"
                    onClick={toggleMenu}
                    aria-label="Open tools menu"
                >
                    <span className="hamburger-menu__line"></span>
                    <span className="hamburger-menu__line"></span>
                    <span className="hamburger-menu__line"></span>
                </button>
                
                {isOpen && (
                    <div className="hamburger-menu__dropdown">
                        {canManage && (
                            <button className="hamburger-menu__item" onClick={handleProjectEditorClick}>
                                Project Editor
                            </button>
                        )}
                        {canManage && (
                            <button className="hamburger-menu__item" onClick={handleTimeAnalysisClick}>
                                3D Production KPI Report
                            </button>
                        )}
                        {isAppAdmin && (
                            <button className="hamburger-menu__item hamburger-menu__item--danger" onClick={handlePurgeCacheClick}>
                                Purge App Cache (developer)
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

