// -----------------------------------------------------------------------------
// REGION | CadGenerator - Dynamic UI Module
// -----------------------------------------------------------------------------
// Provides JSON-config driven UI generation for CAD generator tools
// Supports real-time slider updates with double-click text input
// No dependencies required
// -----------------------------------------------------------------------------
//
// UI_CONFIG INDEX - Each generator defines which elements to build:
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ FIELD          │ TYPE     │ DESCRIPTION                                 │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ containerId    │ string   │ ID of the controls container element        │
// │ statusBarId    │ string   │ ID of the status bar element                │
// │ canvasWrapperId│ string   │ ID of the canvas wrapper element            │
// │ loadingText    │ string   │ Text shown while loading                    │
// │ inputs         │ array    │ Input field definitions (sliders)           │
// │ buttons        │ array    │ Button definitions                          │
// │ styles         │ object   │ Custom style overrides                      │
// └─────────────────────────────────────────────────────────────────────────┘
//
// INPUT DEFINITION (Slider with double-click text entry):
// { id, label, default, min, max, step?, hint?, width?, onChange?, unit? }
//
// BUTTON DEFINITION:
// { id, label, action, style: 'primary'|'success'|'danger'|'secondary' }
//
// -----------------------------------------------------------------------------

(function() {
    'use strict';

    // -------------------------------------------------------------------------
    // REGION | Default Styles
    // -------------------------------------------------------------------------
    const DEFAULT_STYLES = `
        /* CadGenerator Dynamic UI Styles */
        .cad-controls { 
            background: white; 
            padding: 20px; 
            border-radius: 12px; 
            display: flex; 
            gap: 15px; 
            flex-wrap: wrap; 
            margin-bottom: 20px; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.08); 
            z-index: 10;
            justify-content: center;
            max-width: 1200px;
        }

        .cad-input-group { 
            display: flex; 
            flex-direction: column; 
            min-width: 120px; 
        }
        
        .cad-input-group label { 
            font-size: 0.75rem; 
            font-weight: 700; 
            color: #666; 
            text-transform: uppercase; 
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }

        /* Slider Container */
        .cad-slider-container {
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .cad-slider-row {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .cad-slider-container input[type="range"] {
            flex: 1;
            height: 6px;
            -webkit-appearance: none;
            appearance: none;
            background: #ddd;
            border-radius: 3px;
            outline: none;
            cursor: pointer;
        }

        .cad-slider-container input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            background: #007bff;
            border-radius: 50%;
            cursor: grab;
            transition: transform 0.1s, background 0.2s;
        }

        .cad-slider-container input[type="range"]::-webkit-slider-thumb:hover {
            background: #0056b3;
            transform: scale(1.1);
        }

        .cad-slider-container input[type="range"]::-webkit-slider-thumb:active {
            cursor: grabbing;
            transform: scale(1.15);
        }

        .cad-slider-container input[type="range"]::-moz-range-thumb {
            width: 16px;
            height: 16px;
            background: #007bff;
            border: none;
            border-radius: 50%;
            cursor: grab;
        }

        /* Value Display (double-click to edit) */
        .cad-value-display {
            min-width: 60px;
            padding: 4px 8px;
            background: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 0.85rem;
            font-weight: 600;
            color: #333;
            text-align: center;
            cursor: pointer;
            user-select: none;
            transition: background 0.2s, border-color 0.2s;
        }

        .cad-value-display:hover {
            background: #e8e8e8;
            border-color: #007bff;
        }

        .cad-value-display .cad-unit {
            font-size: 0.7rem;
            color: #888;
            margin-left: 2px;
        }

        /* Text Input (shown on double-click) */
        .cad-value-input {
            min-width: 60px;
            width: 70px;
            padding: 4px 8px;
            border: 2px solid #007bff;
            border-radius: 4px;
            font-size: 0.85rem;
            font-weight: 600;
            text-align: center;
            outline: none;
        }

        .cad-value-input:focus {
            box-shadow: 0 0 0 3px rgba(0,123,255,0.25);
        }
        
        .cad-input-group input[type="number"],
        .cad-input-group input[type="text"],
        .cad-input-group select { 
            padding: 8px; 
            border: 1px solid #ddd; 
            border-radius: 6px; 
            font-size: 0.95rem;
        }

        .cad-input-group .cad-hint { 
            font-size: 0.7rem; 
            color: #999; 
            margin-top: 2px; 
        }

        .cad-btn { 
            padding: 0 20px; 
            color: white; 
            border: none; 
            border-radius: 6px; 
            cursor: pointer; 
            font-weight: 600; 
            font-size: 0.9rem;
            height: 38px;
            align-self: flex-end;
            transition: background 0.2s, transform 0.1s;
            white-space: nowrap;
        }

        .cad-btn:hover { 
            transform: translateY(-1px);
        }

        .cad-btn:active {
            transform: translateY(0);
        }

        .cad-btn--primary { background: #007bff; }
        .cad-btn--primary:hover { background: #0056b3; }
        
        .cad-btn--success { background: #28a745; }
        .cad-btn--success:hover { background: #1e7e34; }
        
        .cad-btn--danger { background: #dc3545; }
        .cad-btn--danger:hover { background: #c82333; }
        
        .cad-btn--secondary { background: #6c757d; }
        .cad-btn--secondary:hover { background: #545b62; }

        .cad-canvas-wrapper { 
            background: white; 
            border: 1px solid #ddd; 
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            flex-grow: 1; 
            width: 100%; 
            max-width: 1400px;
            height: 60vh;
            overflow: hidden; 
            position: relative; 
            cursor: grab;
            user-select: none;
        }

        .cad-canvas-wrapper:active {
            cursor: grabbing;
        }
        
        .cad-canvas-wrapper svg { 
            width: 100%; 
            height: 100%; 
            display: block; 
        }

        .cad-loading-text {
            position: absolute;
            top: 50%; 
            left: 50%;
            transform: translate(-50%, -50%);
            color: #ccc;
            font-size: 1rem;
        }
        
        .cad-status-bar { 
            margin-top: 10px; 
            font-size: 0.85rem; 
            color: #777; 
            height: 20px; 
        }
    `;
    // endregion ---------------------------------------------------------------

    // -------------------------------------------------------------------------
    // REGION | Private State
    // -------------------------------------------------------------------------
    let _config             = null;
    let _handlers           = {};
    let _stylesInjected     = false;
    let _containerEl        = null;
    let _statusBarEl        = null;
    let _canvasWrapperEl    = null;
    let _inputElements      = {};                                                // <-- Store references to inputs
    // endregion ---------------------------------------------------------------

    // -------------------------------------------------------------------------
    // REGION | Style Injection
    // -------------------------------------------------------------------------

    // FUNCTION | Inject default styles into document head
    // ------------------------------------------------------------
    function injectStyles(customStyles = '') {
        if (_stylesInjected) return;

        const styleEl       = document.createElement('style');
        styleEl.id          = 'cad-generator-dynamic-ui-styles';
        styleEl.textContent = DEFAULT_STYLES + '\n' + customStyles;
        document.head.appendChild(styleEl);

        _stylesInjected = true;
    }
    // ---------------------------------------------------------------
    // endregion ---------------------------------------------------------------

    // -------------------------------------------------------------------------
    // REGION | UI Building
    // -------------------------------------------------------------------------

    // FUNCTION | Build UI from configuration
    // ------------------------------------------------------------
    function build(config, handlers = {}) {
        _config        = config;
        _handlers      = handlers;
        _inputElements = {};

        // Inject styles
        injectStyles(config.styles?.custom || '');

        // Build controls container
        if (config.containerId) {
            _containerEl = document.getElementById(config.containerId);
            if (_containerEl) {
                _containerEl.classList.add('cad-controls');
                _containerEl.innerHTML = '';

                // Build inputs (all as sliders now)
                if (config.inputs && Array.isArray(config.inputs)) {
                    for (const inputDef of config.inputs) {
                        const inputGroup = buildSliderInput(inputDef);
                        _containerEl.appendChild(inputGroup);
                    }
                }

                // Build buttons
                if (config.buttons && Array.isArray(config.buttons)) {
                    for (const btnDef of config.buttons) {
                        const btnGroup = buildButton(btnDef);
                        _containerEl.appendChild(btnGroup);
                    }
                }
            }
        }

        // Setup status bar
        if (config.statusBarId) {
            _statusBarEl = document.getElementById(config.statusBarId);
            if (_statusBarEl) {
                _statusBarEl.classList.add('cad-status-bar');
            }
        }

        // Setup canvas wrapper
        if (config.canvasWrapperId) {
            _canvasWrapperEl = document.getElementById(config.canvasWrapperId);
            if (_canvasWrapperEl) {
                _canvasWrapperEl.classList.add('cad-canvas-wrapper');
                
                // Add loading text if specified
                if (config.loadingText) {
                    _canvasWrapperEl.innerHTML = `<span class="cad-loading-text">${config.loadingText}</span>`;
                }
            }
        }

        return true;
    }
    // ---------------------------------------------------------------

    // FUNCTION | Build slider input with double-click text entry
    // ------------------------------------------------------------
    function buildSliderInput(def) {
        const group = document.createElement('div');
        group.classList.add('cad-input-group');
        
        if (def.width) {
            group.style.minWidth = def.width;
        }

        // Label
        const label       = document.createElement('label');
        label.htmlFor     = def.id;
        label.textContent = def.label || def.id;
        group.appendChild(label);

        // Slider container
        const sliderContainer = document.createElement('div');
        sliderContainer.classList.add('cad-slider-container');

        // Row with slider + value display
        const sliderRow = document.createElement('div');
        sliderRow.classList.add('cad-slider-row');

        // Slider element
        const slider      = document.createElement('input');
        slider.type       = 'range';
        slider.id         = def.id;
        slider.min        = def.min !== undefined ? def.min : 0;
        slider.max        = def.max !== undefined ? def.max : 100;
        slider.step       = def.step !== undefined ? def.step : 1;
        slider.value      = def.default !== undefined ? def.default : 50;

        // Value display (double-click to edit)
        const valueDisplay = document.createElement('div');
        valueDisplay.classList.add('cad-value-display');
        valueDisplay.dataset.inputId = def.id;
        updateValueDisplay(valueDisplay, slider.value, def.unit);

        // Store reference
        _inputElements[def.id] = {
            slider:       slider,
            valueDisplay: valueDisplay,
            def:          def
        };

        // --- EVENT: Slider input (real-time updates) ---
        slider.addEventListener('input', () => {
            updateValueDisplay(valueDisplay, slider.value, def.unit);
            
            // Call onChange handler if defined
            if (def.onChange && _handlers[def.onChange]) {
                _handlers[def.onChange](def.id, parseFloat(slider.value));
            }
        });

        // --- EVENT: Double-click to show text input ---
        valueDisplay.addEventListener('dblclick', () => {
            showTextInput(def, slider, valueDisplay);
        });

        sliderRow.appendChild(slider);
        sliderRow.appendChild(valueDisplay);
        sliderContainer.appendChild(sliderRow);

        // Hint text
        if (def.hint) {
            const hint       = document.createElement('span');
            hint.classList.add('cad-hint');
            hint.textContent = def.hint;
            sliderContainer.appendChild(hint);
        }

        group.appendChild(sliderContainer);
        return group;
    }
    // ---------------------------------------------------------------

    // FUNCTION | Update value display text
    // ------------------------------------------------------------
    function updateValueDisplay(displayEl, value, unit) {
        const numValue = parseFloat(value);
        const formatted = Number.isInteger(numValue) ? numValue : numValue.toFixed(1);
        
        if (unit) {
            displayEl.innerHTML = `${formatted}<span class="cad-unit">${unit}</span>`;
        } else {
            displayEl.textContent = formatted;
        }
    }
    // ---------------------------------------------------------------

    // FUNCTION | Show text input for exact value entry
    // ------------------------------------------------------------
    function showTextInput(def, slider, valueDisplay) {
        // Create text input
        const textInput   = document.createElement('input');
        textInput.type    = 'number';
        textInput.classList.add('cad-value-input');
        textInput.min     = def.min !== undefined ? def.min : '';
        textInput.max     = def.max !== undefined ? def.max : '';
        textInput.step    = def.step !== undefined ? def.step : 'any';
        textInput.value   = slider.value;

        // Replace display with input
        valueDisplay.style.display = 'none';
        valueDisplay.parentNode.insertBefore(textInput, valueDisplay.nextSibling);
        textInput.focus();
        textInput.select();

        // --- EVENT: Commit value on blur or Enter ---
        const commitValue = () => {
            let newValue = parseFloat(textInput.value);
            
            // Clamp to min/max
            if (def.min !== undefined && newValue < def.min) newValue = def.min;
            if (def.max !== undefined && newValue > def.max) newValue = def.max;
            
            // Handle NaN
            if (isNaN(newValue)) {
                newValue = def.default !== undefined ? def.default : def.min || 0;
            }

            // Update slider and display
            slider.value = newValue;
            updateValueDisplay(valueDisplay, newValue, def.unit);

            // Remove text input, show display
            textInput.remove();
            valueDisplay.style.display = '';

            // Trigger onChange
            if (def.onChange && _handlers[def.onChange]) {
                _handlers[def.onChange](def.id, newValue);
            }
        };

        textInput.addEventListener('blur', commitValue);
        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                textInput.blur();
            }
            if (e.key === 'Escape') {
                textInput.value = slider.value; // Revert
                textInput.blur();
            }
        });
    }
    // ---------------------------------------------------------------

    // FUNCTION | Build button
    // ------------------------------------------------------------
    function buildButton(def) {
        const group = document.createElement('div');
        group.classList.add('cad-input-group');

        const btn       = document.createElement('button');
        btn.id          = def.id;
        btn.textContent = def.label || 'Button';
        btn.classList.add('cad-btn');

        // Style variant
        const styleClass = `cad-btn--${def.style || 'primary'}`;
        btn.classList.add(styleClass);

        // Click handler
        if (def.action && _handlers[def.action]) {
            btn.addEventListener('click', _handlers[def.action]);
        } else if (def.action) {
            btn.addEventListener('click', () => {
                console.warn(`[DynamicUI] Handler "${def.action}" not found.`);
            });
        }

        group.appendChild(btn);
        return group;
    }
    // ---------------------------------------------------------------
    // endregion ---------------------------------------------------------------

    // -------------------------------------------------------------------------
    // REGION | Value Accessors
    // -------------------------------------------------------------------------

    // FUNCTION | Get value from input by ID
    // ------------------------------------------------------------
    function getValue(inputId) {
        // Check slider elements first
        if (_inputElements[inputId]) {
            return parseFloat(_inputElements[inputId].slider.value);
        }

        // Fallback to direct DOM lookup
        const el = document.getElementById(inputId);
        if (!el) return null;

        if (el.type === 'number' || el.type === 'range') {
            return parseFloat(el.value);
        }
        if (el.type === 'checkbox') {
            return el.checked;
        }
        return el.value;
    }
    // ---------------------------------------------------------------

    // FUNCTION | Set value for input by ID
    // ------------------------------------------------------------
    function setValue(inputId, value) {
        if (_inputElements[inputId]) {
            const { slider, valueDisplay, def } = _inputElements[inputId];
            slider.value = value;
            updateValueDisplay(valueDisplay, value, def.unit);
            return true;
        }

        const el = document.getElementById(inputId);
        if (!el) return false;

        if (el.type === 'checkbox') {
            el.checked = !!value;
        } else {
            el.value = value;
        }
        return true;
    }
    // ---------------------------------------------------------------

    // FUNCTION | Get all input values as object
    // ------------------------------------------------------------
    function getAllValues() {
        if (!_config || !_config.inputs) return {};

        const values = {};
        for (const inputDef of _config.inputs) {
            values[inputDef.id] = getValue(inputDef.id);
        }
        return values;
    }
    // ---------------------------------------------------------------
    // endregion ---------------------------------------------------------------

    // -------------------------------------------------------------------------
    // REGION | Status Management
    // -------------------------------------------------------------------------

    // FUNCTION | Update status bar text
    // ------------------------------------------------------------
    function setStatus(message) {
        if (_statusBarEl) {
            _statusBarEl.textContent = message;
        }
    }
    // ---------------------------------------------------------------

    // FUNCTION | Show/hide loading state
    // ------------------------------------------------------------
    function showLoading(show, message = 'Loading...') {
        if (!_canvasWrapperEl) return;

        if (show) {
            let loadingEl = _canvasWrapperEl.querySelector('.cad-loading-text');
            if (!loadingEl) {
                loadingEl = document.createElement('span');
                loadingEl.classList.add('cad-loading-text');
                _canvasWrapperEl.appendChild(loadingEl);
            }
            loadingEl.textContent = message;
            loadingEl.style.display = 'block';
        } else {
            const loadingEl = _canvasWrapperEl.querySelector('.cad-loading-text');
            if (loadingEl) {
                loadingEl.style.display = 'none';
            }
        }
    }
    // ---------------------------------------------------------------
    // endregion ---------------------------------------------------------------

    // -------------------------------------------------------------------------
    // REGION | Utility Functions
    // -------------------------------------------------------------------------

    // FUNCTION | Get config reference
    // ------------------------------------------------------------
    function getConfig() {
        return _config;
    }
    // ---------------------------------------------------------------

    // FUNCTION | Get container element
    // ------------------------------------------------------------
    function getContainer() {
        return _containerEl;
    }
    // ---------------------------------------------------------------

    // FUNCTION | Get canvas wrapper element
    // ------------------------------------------------------------
    function getCanvasWrapper() {
        return _canvasWrapperEl;
    }
    // ---------------------------------------------------------------

    // FUNCTION | Register additional handler
    // ------------------------------------------------------------
    function registerHandler(name, fn) {
        _handlers[name] = fn;
    }
    // ---------------------------------------------------------------
    // endregion ---------------------------------------------------------------

    // -------------------------------------------------------------------------
    // REGION | Module Export
    // -------------------------------------------------------------------------
    window.CadGenerator = window.CadGenerator || {};
    window.CadGenerator.DynamicUI = {
        build,
        getValue,
        setValue,
        getAllValues,
        setStatus,
        showLoading,
        getConfig,
        getContainer,
        getCanvasWrapper,
        registerHandler
    };
    // endregion ---------------------------------------------------------------

})();
