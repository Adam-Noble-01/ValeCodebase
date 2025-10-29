// =============================================================================
// VALEVISION3D - INFO PANEL COMPONENT
// =============================================================================
//
// FILE       : InfoPanel.jsx
// NAMESPACE  : ValeVision3D.Components
// MODULE     : Model Information Panel Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Display current model information and metadata
// CREATED    : 2025
//
// DESCRIPTION:
// - Floating panel displaying current model information
// - Shows model name, description, and metadata
// - Positioned at bottom-left of viewport
// - Responsive design for tablet and mobile
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Info Panel Component
// -----------------------------------------------------------------------------

    // COMPONENT | Model Information Display Panel
    // ------------------------------------------------------------
    const InfoPanel = ({ currentModel, visible }) => {
        
        if (!visible || !currentModel) {                                 // <-- Don't render if not visible
            return null;
        }
        
        const metadata = currentModel.metadata || {};                    // <-- Get model metadata
        
        return (
            <div className="vale-info-panel">
                
                {/* MODEL NAME */}
                <h3 className="vale-info-panel__title">
                    {currentModel.name}
                </h3>
                
                {/* MODEL DESCRIPTION */}
                {currentModel.description && (
                    <p className="vale-info-panel__detail">
                        {currentModel.description}
                    </p>
                )}
                
                {/* LOCATION */}
                {metadata.location && (
                    <p className="vale-info-panel__detail">
                        <strong>Location:</strong> {metadata.location}
                    </p>
                )}
                
                {/* CAPTURE DATE */}
                {metadata.captureDate && (
                    <p className="vale-info-panel__detail">
                        <strong>Captured:</strong> {metadata.captureDate}
                    </p>
                )}
                
                {/* FILE SIZE */}
                {metadata.fileSize && (
                    <p className="vale-info-panel__detail">
                        <strong>Size:</strong> {metadata.fileSize}
                    </p>
                )}
                
            </div>
        );
    };
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

