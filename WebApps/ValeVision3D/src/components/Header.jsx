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
// - Persistent header component displayed across all pages
// - Features Vale Garden Houses logo on left
// - Features ValeVision3D title text on right
// - White background with subtle shadow and Vale blue bottom border
// - Responsive design for tablet and mobile
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Header Component
// -----------------------------------------------------------------------------

    // COMPONENT | Application Header Bar with Dual Logo Layout
    // ------------------------------------------------------------
    const Header = ({ config }) => {
        
        const appName = config?.applicationName || 'ValeVision3D';       // <-- Get app name from config
        const version = config?.version || '1.0.0';                      // <-- Get version from config
        
        return (
            <header className="vale-header">
                <div className="vale-header__logo-container vale-header__logo-container--left">
                    <img 
                        src="assets/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png"
                        alt="Vale Garden Houses"
                        className="vale-header__logo-left"
                    />
                </div>
                
                <div className="vale-header__logo-container vale-header__logo-container--right">
                    <div className="vale-header__title">
                        {appName}
                        <span className="vale-header__version"> v{version}</span>
                    </div>
                </div>
            </header>
        );
    };
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

