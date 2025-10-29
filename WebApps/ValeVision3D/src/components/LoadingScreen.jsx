// =============================================================================
// VALEVISION3D - LOADING SCREEN COMPONENT
// =============================================================================
//
// FILE       : LoadingScreen.jsx
// NAMESPACE  : ValeVision3D.Components
// MODULE     : Loading Screen Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Full-screen loading overlay with progress tracking
// CREATED    : 2025
//
// DESCRIPTION:
// - Full-screen loading overlay during model/environment loading
// - Progress bar with percentage display
// - Multi-stage loading messages
// - File size estimation display
// - Spinner animation during initialization
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Loading Screen Component
// -----------------------------------------------------------------------------

    // COMPONENT | Loading Screen with Progress Tracking
    // ------------------------------------------------------------
    const LoadingScreen = ({ 
        isLoading, 
        loadingMessage, 
        progress, 
        loadedBytes, 
        totalBytes 
    }) => {
        
        if (!isLoading) {                                                // <-- Don't render if not loading
            return null;
        }
        
        // HELPER FUNCTION | Format Bytes to Human Readable
        // ---------------------------------------------------------------
        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 Bytes';
            
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        };
        // ---------------------------------------------------------------
        
        
        return (
            <div className="vale-loading">
                <div className="vale-loading__content">
                    
                    {/* LOADING SPINNER */}
                    <div className="vale-loading__spinner"></div>
                    
                    {/* APPLICATION TITLE */}
                    <h1 className="vale-loading__title">ValeVision3D</h1>
                    
                    {/* LOADING MESSAGE */}
                    <p className="vale-loading__message">
                        {loadingMessage || 'Loading application...'}
                    </p>
                    
                    {/* PROGRESS BAR */}
                    {progress > 0 && (
                        <div className="vale-loading__progress">
                            <div 
                                className="vale-loading__progress-bar"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    )}
                    
                    {/* PERCENTAGE DISPLAY */}
                    {progress > 0 && (
                        <div className="vale-loading__percentage">
                            {Math.round(progress)}%
                        </div>
                    )}
                    
                    {/* FILE SIZE DISPLAY */}
                    {loadedBytes > 0 && totalBytes > 0 && (
                        <p className="vale-loading__message">
                            {formatBytes(loadedBytes)} / {formatBytes(totalBytes)}
                        </p>
                    )}
                    
                </div>
            </div>
        );
    };
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

