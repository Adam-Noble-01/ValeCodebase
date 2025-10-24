// =============================================================================
// WHITECARDOPEDIA - HAMBURGER MENU COMPONENT
// =============================================================================
//
// FILE       : HamburgerMenu.jsx
// NAMESPACE  : Whitecardopedia
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
    function HamburgerMenu({ onProjectEditorClick }) {
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
                        <button 
                            className="hamburger-menu__item"
                            onClick={handleProjectEditorClick}
                        >
                            Project Editor
                        </button>
                        {/* FUTURE TOOLS: Additional menu items will be added here */}
                    </div>
                )}
            </div>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

