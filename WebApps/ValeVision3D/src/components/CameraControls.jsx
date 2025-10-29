// =============================================================================
// VALEVISION3D - CAMERA CONTROLS COMPONENT
// =============================================================================
//
// FILE       : CameraControls.jsx
// NAMESPACE  : ValeVision3D.Components
// MODULE     : Camera Control Panel Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Floating UI panel for camera control and view presets
// CREATED    : 2025
//
// DESCRIPTION:
// - Floating control panel for camera management
// - Reset camera to default view
// - Save and load camera presets
// - Toggle info panel visibility
// - Positioned at top-right of viewport
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Camera Controls Component
// -----------------------------------------------------------------------------

    // COMPONENT | Camera Control Panel
    // ------------------------------------------------------------
    const CameraControls = ({ 
        onResetCamera, 
        onToggleInfo, 
        showInfo 
    }) => {
        
        const [isExpanded, setIsExpanded] = React.useState(false);       // <-- Control panel expansion state
        
        // FUNCTION | Toggle Control Panel Expansion
        // ---------------------------------------------------------------
        const toggleExpansion = () => {
            setIsExpanded(!isExpanded);                                  // <-- Toggle expansion
        };
        // ---------------------------------------------------------------
        
        
        return (
            <div className="vale-controls">
                
                {/* CONTROLS TITLE */}
                <div className="vale-controls__section">
                    <h3 className="vale-controls__title">Camera Controls</h3>
                </div>
                
                {/* RESET CAMERA BUTTON */}
                <div className="vale-controls__section">
                    <button 
                        className="vale-controls__button"
                        onClick={onResetCamera}
                    >
                        Reset View
                    </button>
                </div>
                
                {/* TOGGLE INFO PANEL BUTTON */}
                <div className="vale-controls__section">
                    <button 
                        className="vale-controls__button vale-controls__button--secondary"
                        onClick={onToggleInfo}
                    >
                        {showInfo ? 'Hide Info' : 'Show Info'}
                    </button>
                </div>
                
                {/* NAVIGATION TIPS */}
                <div className="vale-controls__section">
                    <p style={{ 
                        fontSize: 'var(--Vale_FontSize_Small)', 
                        color: 'var(--Vale_TextSecondary)',
                        margin: 0,
                        lineHeight: 1.5
                    }}>
                        <strong>Touch Controls:</strong><br/>
                        • Single finger: Rotate<br/>
                        • Two fingers: Pan<br/>
                        • Pinch: Zoom<br/>
                        • Double-tap: Focus
                    </p>
                </div>
                
            </div>
        );
    };
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

