// =============================================================================
// VALEVISION3D - MAIN APPLICATION COMPONENT
// =============================================================================
//
// FILE       : App.jsx
// NAMESPACE  : ValeVision3D.Components
// MODULE     : Main Application Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Root application component orchestrating all functionality
// CREATED    : 2025
//
// DESCRIPTION:
// - Root React component for ValeVision3D application
// - Orchestrates all child components and state management
// - Handles configuration loading and initialization
// - Loads default model from configuration (uiSettings.defaultView)
// - Coordinates between Babylon.js scene and UI controls
// - Tablet-first responsive design implementation
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Main Application Component
// -----------------------------------------------------------------------------

    // COMPONENT | ValeVision3D Main Application
    // ------------------------------------------------------------
    const App = () => {
        
        // STATE MANAGEMENT | Application State Variables
        // ---------------------------------------------------------------
        const [config, setConfig] = React.useState(null);                // <-- Master configuration
        const [isLoading, setIsLoading] = React.useState(true);          // <-- Loading state
        const [loadingMessage, setLoadingMessage] = React.useState('Initializing...');
        const [loadingProgress, setLoadingProgress] = React.useState(0); // <-- Loading progress percentage
        const [loadedBytes, setLoadedBytes] = React.useState(0);         // <-- Downloaded bytes
        const [totalBytes, setTotalBytes] = React.useState(0);           // <-- Total file size
        const [currentModelId, setCurrentModelId] = React.useState(null); // <-- Current model ID
        const [showInfo, setShowInfo] = React.useState(true);            // <-- Info panel visibility
        const [sceneReady, setSceneReady] = React.useState(false);       // <-- Scene initialization state
        
        const babylonSceneRef = React.useRef(null);                      // <-- Reference to BabylonScene component
        // ---------------------------------------------------------------
        
        
        // EFFECT | Load Configuration on Mount
        // ---------------------------------------------------------------
        React.useEffect(() => {
            loadConfiguration();                                         // <-- Load master config
        }, []);
        // ---------------------------------------------------------------
        
        
        // EFFECT | Load Default Model After Config Loads
        // ---------------------------------------------------------------
        React.useEffect(() => {
            if (config && !currentModelId) {                             // <-- Config loaded but no model selected
                loadDefaultModel();                                      // <-- Load default model
            }
        }, [config]);
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Load Master Configuration from JSON
        // ---------------------------------------------------------------
        const loadConfiguration = async () => {
            try {
                setLoadingMessage('Loading configuration...');           // <-- Update loading message
                
                const loadedConfig = await window.ValeVision3D.ConfigLoader.loadConfig();
                
                // VALIDATE CONFIGURATION
                const isValid = window.ValeVision3D.ConfigLoader.validateConfig(loadedConfig);
                
                if (!isValid) {                                          // <-- Configuration invalid
                    throw new Error('Invalid configuration structure');
                }
                
                setConfig(loadedConfig);                                 // <-- Store configuration
                console.log('Configuration loaded successfully');        // <-- Log success
                
            } catch (error) {
                console.error('Failed to load configuration:', error);   // <-- Log error
                setLoadingMessage(`Error loading configuration: ${error.message}`);
                setIsLoading(false);                                     // <-- Stop loading
            }
        };
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Load Default Model from Configuration
        // ---------------------------------------------------------------
        const loadDefaultModel = () => {
            if (!config) return;                                         // <-- Wait for config
            
            // GET DEFAULT MODEL FROM UI SETTINGS OR FIRST ENABLED MODEL
            let defaultModelId = config.uiSettings?.defaultView;         // <-- Check UI settings
            
            // VALIDATE DEFAULT MODEL EXISTS
            if (defaultModelId) {                                        // <-- Default specified
                const modelExists = window.ValeVision3D.ConfigLoader.getModelById(config, defaultModelId);
                
                if (!modelExists) {                                      // <-- Model doesn't exist
                    console.warn(`Default model "${defaultModelId}" not found, using first enabled model`);
                    defaultModelId = null;                               // <-- Reset to use fallback
                }
            }
            
            // FALLBACK TO FIRST ENABLED MODEL IF NO DEFAULT OR DEFAULT INVALID
            if (!defaultModelId) {                                       // <-- No default specified or invalid
                const enabledModels = window.ValeVision3D.ConfigLoader.getEnabledModels(config);
                
                if (enabledModels.length > 0) {                          // <-- Use first enabled model
                    defaultModelId = enabledModels[0].id;
                }
            }
            
            if (defaultModelId) {                                        // <-- Model ID found
                setCurrentModelId(defaultModelId);                       // <-- Set current model
                console.log(`Loading default model: ${defaultModelId}`); // <-- Log selection
            } else {
                console.warn('No models available to load');             // <-- No models found
                setIsLoading(false);
            }
        };
        // ---------------------------------------------------------------
        
        
        
        
        // FUNCTION | Handle Loading Progress Updates
        // ---------------------------------------------------------------
        const handleLoadingProgress = (progress, loaded, total, message) => {
            setLoadingProgress(progress);                                // <-- Update progress
            setLoadedBytes(loaded);                                      // <-- Update loaded bytes
            setTotalBytes(total);                                        // <-- Update total bytes
            
            if (message) {                                               // <-- Update message if provided
                setLoadingMessage(message);
            }
            
            if (progress >= 100) {                                       // <-- Loading complete
                setTimeout(() => {
                    setIsLoading(false);                                 // <-- Hide loading screen
                }, 500);                                                 // <-- Delay for smooth transition
            }
        };
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Handle Scene Ready Callback
        // ---------------------------------------------------------------
        const handleSceneReady = (scene, camera) => {
            setSceneReady(true);                                         // <-- Mark scene as ready
            console.log('Scene ready for rendering');                    // <-- Log ready state
        };
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Reset Camera to Default View
        // ---------------------------------------------------------------
        const handleResetCamera = () => {
            if (!babylonSceneRef.current) return;                        // <-- Check scene reference
            
            // CALL RESET CAMERA ON BABYLON SCENE
            if (window.ValeVision3D.CameraManager.currentCamera) {
                const model = window.ValeVision3D.ConfigLoader.getModelById(config, currentModelId);
                
                if (model && model.defaultCamera) {
                    window.ValeVision3D.CameraManager.resetCamera(model.defaultCamera);
                } else {
                    window.ValeVision3D.CameraManager.resetCamera();
                }
            }
            
            console.log('Camera reset to default view');                 // <-- Log reset
        };
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Toggle Info Panel Visibility
        // ---------------------------------------------------------------
        const handleToggleInfo = () => {
            setShowInfo(!showInfo);                                      // <-- Toggle visibility
        };
        // ---------------------------------------------------------------
        
        
        // GET CURRENT MODEL DATA
        const currentModel = currentModelId && config 
            ? window.ValeVision3D.ConfigLoader.getModelById(config, currentModelId)
            : null;
        
        
        return (
            <div className="vale-app">
                
                {/* LOADING SCREEN */}
                <LoadingScreen 
                    isLoading={isLoading}
                    loadingMessage={loadingMessage}
                    progress={loadingProgress}
                    loadedBytes={loadedBytes}
                    totalBytes={totalBytes}
                />
                
                {/* APPLICATION HEADER */}
                <Header config={config} />
                
                {/* BABYLON.JS 3D SCENE */}
                {config && currentModelId && (
                    <BabylonScene 
                        ref={babylonSceneRef}
                        config={config}
                        currentModelId={currentModelId}
                        onLoadingProgress={handleLoadingProgress}
                        onSceneReady={handleSceneReady}
                    />
                )}
                
                {/* CAMERA CONTROLS PANEL */}
                {sceneReady && config && (
                    <CameraControls 
                        onResetCamera={handleResetCamera}
                        onToggleInfo={handleToggleInfo}
                        showInfo={showInfo}
                    />
                )}
                
                {/* INFO PANEL */}
                {sceneReady && currentModel && (
                    <InfoPanel 
                        currentModel={currentModel}
                        visible={showInfo}
                    />
                )}
                
            </div>
        );
    };
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Application Initialization
// -----------------------------------------------------------------------------

    // INITIALIZE | Render Application to DOM
    // ------------------------------------------------------------
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

