// =============================================================================
// VALEVISION3D - HEADER COMPONENT
// =============================================================================
//
// FILE       : Header.jsx
// NAMESPACE  : ValeVision3D.Components
// MODULE     : Application Header Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Top navigation bar with branding and info
// CREATED    : 2025
//
// DESCRIPTION:
// - Application header with Vale branding
// - Displays application name and version
// - Responsive design for tablet and mobile
// - Fixed position at top of viewport
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Header Component
// -----------------------------------------------------------------------------

    // COMPONENT | Application Header Bar
    // ------------------------------------------------------------
    const Header = ({ config }) => {
        
        const appName = config?.applicationName || 'ValeVision3D';       // <-- Get app name from config
        const version = config?.version || '1.0.0';                      // <-- Get version from config
        
        return (
            <header className="vale-header">
                
                {/* APPLICATION TITLE */}
                <div className="vale-header__title">
                    {appName}
                </div>
                
                {/* HEADER INFO */}
                <div className="vale-header__info">
                    <span className="vale-header__version">v{version}</span>
                </div>
                
            </header>
        );
    };
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

