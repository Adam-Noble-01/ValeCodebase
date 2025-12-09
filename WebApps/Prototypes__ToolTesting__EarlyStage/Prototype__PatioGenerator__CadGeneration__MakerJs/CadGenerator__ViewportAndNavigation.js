// -----------------------------------------------------------------------------
// REGION | CadGenerator - Viewport and Navigation Module
// -----------------------------------------------------------------------------
// Provides pan/zoom/render functionality for CAD visualization
// Supports real-time updates with camera preservation
// Dependencies: MakerJS library must be loaded before this module
// -----------------------------------------------------------------------------

(function() {
    'use strict';

    // -------------------------------------------------------------------------
    // REGION | Module Configuration
    // -------------------------------------------------------------------------
    const DEFAULT_CONFIG = {
        zoomIntensity:        0.001,                                             // <-- Zoom speed multiplier
        minScale:             0.01,                                              // <-- Minimum zoom level
        maxScale:             50,                                                // <-- Maximum zoom level
        fitPadding:           0.8,                                               // <-- Padding when fitting to view
        strokeColor:          '#2c3e50',                                         // <-- Default stroke color
        strokeWidth:          2,                                                 // <-- Default stroke width
        fillColor:            '#e8f5e9',                                         // <-- Default fill color
        groundLineColor:      '#ff4444',                                         // <-- Ground reference line
        axisLineColor:        '#00cc00',                                         // <-- Vertical axis line
        showGroundLine:       true,                                              // <-- Show Y=0 ground line
        showAxisLine:         true                                               // <-- Show X=0 axis line
    };
    // endregion ---------------------------------------------------------------

    // -------------------------------------------------------------------------
    // REGION | Private State
    // -------------------------------------------------------------------------
    let _wrapperId        = null;
    let _wrapperEl        = null;
    let _svgEl            = null;
    let _currentModel     = null;
    let _config           = { ...DEFAULT_CONFIG };
    let _camState         = { x: 0, y: 0, scale: 1 };
    let _isDragging       = false;
    let _lastMouse        = { x: 0, y: 0 };
    let _modelBounds      = null;
    let _onRenderCallback = null;
    let _isInitialized    = false;                                               // <-- Track if first render done
    // endregion ---------------------------------------------------------------

    // -------------------------------------------------------------------------
    // REGION | MakerJS Accessor
    // -------------------------------------------------------------------------

    // FUNCTION | Get MakerJS library reference safely
    // ------------------------------------------------------------
    function getMakerJS() {
        if (window.makerjs) return window.makerjs;
        if (window.require) {
            try { return window.require('makerjs'); } catch(e) {}
        }
        return null;
    }
    // ---------------------------------------------------------------
    // endregion ---------------------------------------------------------------

    // -------------------------------------------------------------------------
    // REGION | Initialization
    // -------------------------------------------------------------------------

    // FUNCTION | Initialize viewport on a wrapper element
    // ------------------------------------------------------------
    function init(wrapperId, options = {}) {
        _wrapperId = wrapperId;
        _wrapperEl = document.getElementById(wrapperId);
        
        if (!_wrapperEl) {
            console.error(`[Viewport] Element with id "${wrapperId}" not found.`);
            return false;
        }

        // Merge user options with defaults
        _config = { ...DEFAULT_CONFIG, ...options };

        // Apply viewport styles
        _wrapperEl.style.overflow   = 'hidden';
        _wrapperEl.style.position   = 'relative';
        _wrapperEl.style.cursor     = 'grab';
        _wrapperEl.style.userSelect = 'none';

        // Reset state
        _camState      = { x: 0, y: 0, scale: 1 };
        _isDragging    = false;
        _isInitialized = false;

        return true;
    }
    // ---------------------------------------------------------------
    // endregion ---------------------------------------------------------------

    // -------------------------------------------------------------------------
    // REGION | Rendering
    // -------------------------------------------------------------------------

    // FUNCTION | Render MakerJS model to viewport
    // ------------------------------------------------------------
    // Options:
    //   preserveCamera: boolean - if true, maintain current pan/zoom state
    // ------------------------------------------------------------
    function render(makerModel, guides = {}, options = {}) {
        const M = getMakerJS();
        if (!M) {
            console.error('[Viewport] MakerJS library not loaded.');
            return false;
        }

        if (!_wrapperEl) {
            console.error('[Viewport] Viewport not initialized. Call init() first.');
            return false;
        }

        // Store camera state if preserving
        const preserveCamera = options.preserveCamera === true;
        const savedCamState  = preserveCamera ? { ..._camState } : null;

        _currentModel = makerModel;

        // Get model bounds for guides
        const measure = M.measure.modelExtents(makerModel);
        _modelBounds  = measure;

        const modelH = measure.height || 1000;

        // Get raw SVG path data
        const modelSVG = M.exporter.toSVG(makerModel, { useSvgPathOnly: true });

        // Build guide lines
        let guidesHTML = '';
        
        if (_config.showGroundLine && guides.showGround !== false) {
            // Ground line: Horizontal crosshair at GLOBAL_ORIGIN Y=0
            // Drawn outside flip-group so it's always at visual Y=0
            // References global coordinate system origin
            guidesHTML += `<line x1="-20000" y1="0" x2="20000" y2="0" 
                stroke="${_config.groundLineColor}" stroke-width="2" 
                vector-effect="non-scaling-stroke" />`;
        }

        if (_config.showAxisLine && guides.showAxis !== false) {
            // Vertical axis: Crosshair at GLOBAL_ORIGIN X=0
            // Drawn outside flip-group so it's always at visual X=0
            // Extends both up and down from global origin
            // References global coordinate system origin
            const axisExtent = guides.axisHeight || 20000;                       // <-- Long line for crosshair
            guidesHTML += `<line x1="0" y1="-${axisExtent}" x2="0" y2="${axisExtent}" 
                stroke="${_config.axisLineColor}" stroke-width="2" 
                stroke-dasharray="10,5" vector-effect="non-scaling-stroke" />`;
        }

        // Custom guides
        if (guides.custom && Array.isArray(guides.custom)) {
            for (const g of guides.custom) {
                guidesHTML += g;
            }
        }

        // Get style overrides
        const stroke  = guides.strokeColor || _config.strokeColor;
        const strokeW = guides.strokeWidth || _config.strokeWidth;
        const fill    = guides.fillColor || _config.fillColor;

        // SVG Structure:
        // camera-group: handles Pan/Zoom (Translate/Scale)
        // guides-group: Crosshair guides at global 0,0 (NOT flipped, always visible)
        // flip-group: handles Coordinate Flip (Scale 1, -1) so CAD Y+ is Up
        const svgHTML = `
        <svg id="cad-viewport-svg" width="100%" height="100%" style="display:block;">
            <g id="camera-group">
                <!-- Guides drawn separately at global 0,0 (crosshair) -->
                <g id="guides-group">
                    ${guidesHTML}
                </g>
                
                <!-- Geometry (flipped for CAD coordinates) -->
                <g id="flip-group" transform="scale(1, -1)">
                    <g stroke="${stroke}" stroke-width="${strokeW}" fill="${fill}">
                        ${modelSVG}
                    </g>
                </g>
            </g>
        </svg>`;

        _wrapperEl.innerHTML = svgHTML;
        
        _svgEl = document.getElementById('cad-viewport-svg');
        setupInteraction(_svgEl);

        // Restore or reset camera state
        if (preserveCamera && savedCamState) {
            _camState = savedCamState;
        } else if (!_isInitialized) {
            // First render - will need zoomExtents called
            _camState = { x: 0, y: 0, scale: 1 };
        }

        updateCameraTransform();
        _isInitialized = true;

        if (_onRenderCallback) {
            _onRenderCallback(_currentModel, _modelBounds);
        }

        return true;
    }
    // ---------------------------------------------------------------

    // FUNCTION | Render with simple viewBox (no pan/zoom)
    // ------------------------------------------------------------
    function renderSimple(makerModel, options = {}) {
        const M = getMakerJS();
        if (!M || !_wrapperEl) return false;

        _currentModel = makerModel;
        _modelBounds  = M.measure.modelExtents(makerModel);

        const renderOptions = {
            svgAttrs:    options.svgAttrs || {},
            stroke:      options.stroke || _config.strokeColor,
            strokeWidth: options.strokeWidth || `${_config.strokeWidth}px`,
            fill:        options.fill || _config.fillColor
        };

        const svg = M.exporter.toSVG(makerModel, renderOptions);
        _wrapperEl.innerHTML = svg;

        return true;
    }
    // ---------------------------------------------------------------
    // endregion ---------------------------------------------------------------

    // -------------------------------------------------------------------------
    // REGION | Camera Controls
    // -------------------------------------------------------------------------

    // FUNCTION | Setup mouse/wheel interaction handlers
    // ------------------------------------------------------------
    function setupInteraction(svgEl) {
        if (!svgEl) return;

        // Wheel Zoom
        svgEl.addEventListener('wheel', handleWheel, { passive: false });

        // Pan Events
        svgEl.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }
    // ---------------------------------------------------------------

    // FUNCTION | Handle mouse wheel zoom
    // ------------------------------------------------------------
    function handleWheel(e) {
        e.preventDefault();
        
        const delta       = e.deltaY;
        const scaleFactor = 1 - delta * _config.zoomIntensity;

        const rect   = _wrapperEl.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // World point before zoom
        const worldX = (mouseX - _camState.x) / _camState.scale;
        const worldY = (mouseY - _camState.y) / _camState.scale;

        // Update scale
        _camState.scale *= scaleFactor;
        _camState.scale = Math.max(_config.minScale, Math.min(_config.maxScale, _camState.scale));

        // Recalculate pan to keep world point under mouse
        _camState.x = mouseX - worldX * _camState.scale;
        _camState.y = mouseY - worldY * _camState.scale;

        updateCameraTransform();
    }
    // ---------------------------------------------------------------

    // FUNCTION | Handle mouse down for panning
    // ------------------------------------------------------------
    function handleMouseDown(e) {
        if (e.button === 0 || e.button === 1) { // Left or Middle
            _isDragging = true;
            _lastMouse  = { x: e.clientX, y: e.clientY };
            document.body.style.cursor = 'grabbing';
        }
    }
    // ---------------------------------------------------------------

    // FUNCTION | Handle mouse move for panning
    // ------------------------------------------------------------
    function handleMouseMove(e) {
        if (!_isDragging) return;

        const dx = e.clientX - _lastMouse.x;
        const dy = e.clientY - _lastMouse.y;
        _lastMouse = { x: e.clientX, y: e.clientY };

        _camState.x += dx;
        _camState.y += dy;
        updateCameraTransform();
    }
    // ---------------------------------------------------------------

    // FUNCTION | Handle mouse up to stop panning
    // ------------------------------------------------------------
    function handleMouseUp() {
        _isDragging = false;
        document.body.style.cursor = '';
    }
    // ---------------------------------------------------------------

    // FUNCTION | Update camera transform on SVG
    // ------------------------------------------------------------
    function updateCameraTransform() {
        const g = document.getElementById('camera-group');
        if (g) {
            g.setAttribute('transform', `translate(${_camState.x}, ${_camState.y}) scale(${_camState.scale})`);
        }
    }
    // ---------------------------------------------------------------

    // FUNCTION | Zoom to fit model in viewport
    // ------------------------------------------------------------
    function zoomExtents() {
        const M = getMakerJS();
        if (!_wrapperEl || !_currentModel || !M) return;

        const rect   = _wrapperEl.getBoundingClientRect();
        const width  = rect.width;
        const height = rect.height;

        // Get Model Bounds
        const measure      = _modelBounds || M.measure.modelExtents(_currentModel);
        const modelW       = measure.width || 1000;
        const modelH       = measure.height || 1000;
        const modelCenterY = measure.center[1];
        const modelCenterX = measure.center[0];

        // Calculate scale to fit
        const scaleX = width / modelW;
        const scaleY = height / modelH;
        let scale    = Math.min(scaleX, scaleY) * _config.fitPadding;

        // Center logic
        // CAD Y+ is Up, SVG Y+ is Down
        // Inner group flips Y, so CAD (0, 500) becomes World (0, -500)
        const worldCY = -modelCenterY;
        const worldCX = modelCenterX;

        const panY = height / 2 - (worldCY * scale);
        const panX = width / 2 - (worldCX * scale);

        _camState = { x: panX, y: panY, scale: scale };
        updateCameraTransform();
    }
    // ---------------------------------------------------------------
    // endregion ---------------------------------------------------------------

    // -------------------------------------------------------------------------
    // REGION | State Management
    // -------------------------------------------------------------------------

    // FUNCTION | Get current camera state
    // ------------------------------------------------------------
    function getState() {
        return { ..._camState };
    }
    // ---------------------------------------------------------------

    // FUNCTION | Set camera state
    // ------------------------------------------------------------
    function setState(newState) {
        _camState = { ..._camState, ...newState };
        updateCameraTransform();
    }
    // ---------------------------------------------------------------

    // FUNCTION | Get current model
    // ------------------------------------------------------------
    function getModel() {
        return _currentModel;
    }
    // ---------------------------------------------------------------

    // FUNCTION | Get model bounds
    // ------------------------------------------------------------
    function getBounds() {
        return _modelBounds;
    }
    // ---------------------------------------------------------------

    // FUNCTION | Set render callback
    // ------------------------------------------------------------
    function onRender(callback) {
        _onRenderCallback = callback;
    }
    // ---------------------------------------------------------------

    // FUNCTION | Get configuration
    // ------------------------------------------------------------
    function getConfig() {
        return { ..._config };
    }
    // ---------------------------------------------------------------

    // FUNCTION | Update configuration
    // ------------------------------------------------------------
    function setConfig(newConfig) {
        _config = { ..._config, ...newConfig };
    }
    // ---------------------------------------------------------------

    // FUNCTION | Check if viewport has been initialized with content
    // ------------------------------------------------------------
    function isInitialized() {
        return _isInitialized;
    }
    // ---------------------------------------------------------------
    // endregion ---------------------------------------------------------------

    // -------------------------------------------------------------------------
    // REGION | Module Export
    // -------------------------------------------------------------------------
    window.CadGenerator = window.CadGenerator || {};
    window.CadGenerator.Viewport = {
        init,
        render,
        renderSimple,
        zoomExtents,
        getState,
        setState,
        getModel,
        getBounds,
        getConfig,
        setConfig,
        onRender,
        getMakerJS,
        isInitialized
    };
    // endregion ---------------------------------------------------------------

})();
