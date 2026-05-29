/* =============================================================================
   NOBLEIMAGETOOLS - APP CORE - INIT (BOOT SEQUENCE)
   =============================================================================

   FILE       : NobleImageTools__AppCore__Init__.js
   NAMESPACE  : NobleImageTools
   MODULE     : AppCore - Init
   PURPOSE    : Orchestrate app boot after DOMContentLoaded. Loads config JSON,
                initialises all subsystems in dependency order, wires toolbar
                and header DOM events, and exposes Toast + StatusBar utilities.
                This is the LAST script loaded in the entry HTML.

   ============================================================================= */

(function () {
    'use strict';

// =============================================================================
// REGION | Global App State
// =============================================================================

    // MODULE VARIABLES | Central application state object
    // ------------------------------------------------------------
    window.NobleImageTools__State = {
        config          : {},                                        // <-- Loaded from AppConfig JSON
        image           : {
            path        : '',
            filename    : '',
            width       : 0,
            height      : 0,
            base64      : ''
        },
        tool            : {
            positivePoints  : [],                                    // <-- [{x,y}] in image coords
            negativePoints  : [],                                    // <-- [{x,y}] in image coords
            box             : null                                   // <-- {x1,y1,x2,y2} or null
        },
        mode            : 'click',                                   // <-- Active interaction mode
        layers          : [],                                        // <-- [{id,name,color,visible,maskData}]
        selectedLayerId : null,                                      // <-- Currently selected layer id
        pendingMask     : null,                                      // <-- Mask data awaiting acceptance
        cursor          : { x: 0, y: 0 },                          // <-- Last image-space cursor position
        inferring       : false,                                     // <-- True while SAM2 is running
        exportDir       : ''                                         // <-- User-chosen export output path
    };
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Toast Notification Utility
// =============================================================================

    // FUNCTION | Show a toast notification
    // ------------------------------------------------------------
    function NobleImageTools__Toast__Show(message, type, duration) {
        const container = document.getElementById('Nit__Toast__Container');
        if (!container) return;

        const toast         = document.createElement('div');
        toast.className     = 'Nit__Toast Nit__Toast--' + (type || 'info');
        toast.textContent   = message;
        container.appendChild(toast);

        const ms = duration || (type === 'error' ? 4500 : 2800);
        setTimeout(function () {
            toast.style.animation = 'none';
            toast.style.opacity   = '0';
            toast.style.transition = 'opacity 300ms ease';
            setTimeout(function () {
                if (toast.parentElement) toast.parentElement.removeChild(toast);
            }, 350);
        }, ms);
    }
    // ------------------------------------------------------------

    window.NobleImageTools__AppCore__Toast = {
        NobleImageTools__Toast__Show : NobleImageTools__Toast__Show
    };

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Status Bar Utility
// =============================================================================

    // FUNCTION | Update the canvas status bar with current cursor / zoom info
    // ------------------------------------------------------------
    function NobleImageTools__StatusBar__Update() {
        const state     = window.NobleImageTools__State;
        const transform = window.NobleImageTools__Canvas__PanZoom
            ? window.NobleImageTools__Canvas__PanZoom.NobleImageTools__PanZoom__GetTransform()
            : { scale: 1 };

        const zoomEl    = document.getElementById('Nit__StatusBar__Zoom');
        const cursorEl  = document.getElementById('Nit__StatusBar__Cursor');
        const layersEl  = document.getElementById('Nit__StatusBar__Layers');

        if (zoomEl)   zoomEl.textContent   = 'Zoom: ' + Math.round(transform.scale * 100) + '%';
        if (cursorEl) cursorEl.textContent  = 'x: ' + Math.round(state.cursor.x) + '  y: ' + Math.round(state.cursor.y);
        if (layersEl) layersEl.textContent  = state.layers.length + ' layer' + (state.layers.length !== 1 ? 's' : '');
    }
    // ------------------------------------------------------------

    window.NobleImageTools__AppCore__StatusBar = {
        NobleImageTools__StatusBar__Update : NobleImageTools__StatusBar__Update
    };

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Config Loader
// =============================================================================

    // FUNCTION | Load the app config JSON from the server
    // ------------------------------------------------------------
    async function NobleImageTools__Init__LoadConfig() {
        const configPath    = '02__Src__AppModules/02__AppData/NobleImageTools__AppData__Config__Main__.json';
        const res           = await fetch(configPath);
        if (!res.ok) throw new Error('Config not found at ' + configPath);

        const config        = await res.json();
        window.NobleImageTools__State.config = config;
        return config;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Toolbar & Header DOM Wiring
// =============================================================================

    // MODULE VARIABLES | Mode hint strings for the status bar
    // ------------------------------------------------------------
    const MODE_HINTS = {
        'click'     : 'Click = positive  ·  Right-click = negative  ·  Enter = commit  ·  Esc = clear  ·  W = paint brush  ·  B = box  ·  F = fit',
        'box'       : 'Drag = bounding box  ·  Enter = commit  ·  Esc = clear  ·  C = click  ·  W = paint  ·  F = fit',
        'pan'       : 'Drag to pan  ·  Scroll = zoom  ·  C = click  ·  B = box  ·  W = paint',
        'paint-add' : 'Paint ADD — draw on mask  ·  [ ] = size  ·  Shift+[ ] = hardness  ·  0–9 = hardness  ·  X = switch to Erase  ·  C = click mode',
        'paint-sub' : 'Paint ERASE — remove from mask  ·  [ ] = size  ·  Shift+[ ] = hardness  ·  0–9 = hardness  ·  X = switch to Add  ·  C = click mode'
    };
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Set the active mode and update toolbar button states
    // ------------------------------------------------------------
    function NobleImageTools__Init__SetMode(mode) {
        const state     = window.NobleImageTools__State;
        state.mode      = mode;

        const canvas    = document.getElementById('Nit__Canvas__Main');
        if (canvas) {
            canvas.classList.toggle('Nit__Canvas--Pan', mode === 'pan');
            canvas.classList.toggle('Nit__Canvas--Box', mode === 'box');
        }

        const buttons   = document.querySelectorAll('[data-nit-mode]');
        for (const btn of buttons) {
            btn.classList.toggle('Nit__ModeBtn--active', btn.dataset.nitMode === mode);
        }

        const hintEl    = document.getElementById('Nit__StatusBar__Hints');
        if (hintEl) hintEl.textContent = MODE_HINTS[mode] || '';

        if (window.NobleImageTools__MaskingTools__BrushEditor) {
            window.NobleImageTools__MaskingTools__BrushEditor.NobleImageTools__Brush__OnModeChange(mode);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Wire all toolbar and sidebar button events
    // ------------------------------------------------------------
    function NobleImageTools__Init__WireToolbar() {

        const modeButtons = document.querySelectorAll('[data-nit-mode]');
        for (const btn of modeButtons) {
            btn.addEventListener('click', function () {
                NobleImageTools__Init__SetMode(btn.dataset.nitMode);
            });
        }

        const acceptBtn = document.getElementById('Nit__Toolbar__AcceptMask');
        if (acceptBtn) {
            acceptBtn.disabled = true;
            acceptBtn.addEventListener('click', function () {
                window.NobleImageTools__MaskingTools__PromptController
                    .NobleImageTools__Prompt__AcceptMask();
            });
        }

        const clearPromptBtn = document.getElementById('Nit__Toolbar__ClearPrompt');
        if (clearPromptBtn) {
            clearPromptBtn.addEventListener('click', function () {
                window.NobleImageTools__MaskingTools__PromptController
                    .NobleImageTools__Prompt__ClearPrompt();
            });
        }

        const autoBtn = document.getElementById('Nit__Toolbar__AutoSegment');
        if (autoBtn) {
            autoBtn.addEventListener('click', function () {
                window.NobleImageTools__MaskingTools__PromptController
                    .NobleImageTools__Prompt__RunAutoSegment();
            });
        }

        const zoomFitBtn = document.getElementById('Nit__Zoom__Fit');
        if (zoomFitBtn) {
            zoomFitBtn.addEventListener('click', function () {
                const state = window.NobleImageTools__State;
                window.NobleImageTools__Canvas__PanZoom.NobleImageTools__PanZoom__FitToCanvas(
                    state.image.width, state.image.height
                );
                window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__RequestRedraw();
            });
        }

        const zoomResetBtn = document.getElementById('Nit__Zoom__Reset');
        if (zoomResetBtn) {
            zoomResetBtn.addEventListener('click', function () {
                const state = window.NobleImageTools__State;
                window.NobleImageTools__Canvas__PanZoom.NobleImageTools__PanZoom__ResetZoom(
                    state.image.width, state.image.height
                );
                window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__RequestRedraw();
            });
        }

        const exportBwBtn   = document.getElementById('Nit__Export__BW');
        const exportRgbaBtn = document.getElementById('Nit__Export__RGBA');
        const exportColorId = document.getElementById('Nit__Export__ColorId');
        const exportAllBtn  = document.getElementById('Nit__Export__All');

        if (exportBwBtn)   exportBwBtn.addEventListener('click',   function () { window.NobleImageTools__MaskExport__BW.NobleImageTools__ExportBW__ExportSelectedBW();   });
        if (exportRgbaBtn) exportRgbaBtn.addEventListener('click', function () { window.NobleImageTools__MaskExport__BW.NobleImageTools__ExportBW__ExportSelectedRGBA(); });
        if (exportColorId) exportColorId.addEventListener('click', function () { window.NobleImageTools__MaskExport__ColorId.NobleImageTools__ColorId__ExportColorId(); });
        if (exportAllBtn)  exportAllBtn.addEventListener('click',  function () { window.NobleImageTools__MaskExport__BW.NobleImageTools__ExportBW__ExportAllBW();       });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Single health ping — returns true if SAM2 ready
    // ------------------------------------------------------------
    async function NobleImageTools__Init__PingHealth() {
        const config    = window.NobleImageTools__State.config;
        const badge     = document.getElementById('Nit__Header__ServerBadge');

        try {
            const res   = await fetch(config.NobleImageTools__Server__BaseUrl + '/api/health', { signal: AbortSignal.timeout(4000) });
            const json  = await res.json();

            if (badge) {
                const sam2Ok        = json.sam2_ready;
                const florenceOk    = json.florence2_ready;
                const sam2Err       = json.sam2_error;
                const florenceErr   = json.florence2_error;

                if (sam2Err) {
                    badge.textContent   = 'SAM2 Error';
                    badge.className     = 'Nit__App__Header__StatusBadge Nit__App__Header__StatusBadge--error';
                    NobleImageTools__Toast__Show('SAM2: ' + sam2Err.slice(0, 100), 'error', 8000);
                } else if (florenceErr) {
                    badge.textContent   = 'Florence-2 Error';
                    badge.className     = 'Nit__App__Header__StatusBadge Nit__App__Header__StatusBadge--error';
                } else if (sam2Ok && florenceOk) {
                    badge.textContent   = 'SAM2 + Florence-2 Ready ✓';
                    badge.className     = 'Nit__App__Header__StatusBadge Nit__App__Header__StatusBadge--ok';
                } else if (sam2Ok) {
                    badge.textContent   = 'SAM2 Ready · Florence-2 Loading…';
                    badge.className     = 'Nit__App__Header__StatusBadge Nit__App__Header__StatusBadge--loading';
                } else {
                    badge.textContent   = 'Models Loading…';
                    badge.className     = 'Nit__App__Header__StatusBadge Nit__App__Header__StatusBadge--loading';
                }
            }
            return json.sam2_ready;
        } catch {
            if (badge) {
                badge.textContent   = 'Server Offline';
                badge.className     = 'Nit__App__Header__StatusBadge Nit__App__Header__StatusBadge--error';
            }
            return false;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Poll health until SAM2 is ready or an error occurs
    // ------------------------------------------------------------
    async function NobleImageTools__Init__CheckServerHealth() {
        const ready = await NobleImageTools__Init__PingHealth();

        if (!ready) {
            let pollCount   = 0;
            const maxPolls  = 24;                                    // <-- Poll for up to ~2 minutes

            const intervalId = setInterval(async function () {
                pollCount++;
                const isReady = await NobleImageTools__Init__PingHealth();

                if (isReady) {
                    clearInterval(intervalId);
                    NobleImageTools__Toast__Show('SAM2 model ready.', 'success', 2500);
                } else if (pollCount >= maxPolls) {
                    clearInterval(intervalId);
                }
            }, 5000);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Global Keyboard Shortcuts
// =============================================================================

    // FUNCTION | Install app-wide keyboard shortcuts
    // ------------------------------------------------------------
    function NobleImageTools__Init__InstallGlobalHotkeys() {
        window.addEventListener('keydown', function (e) {
            const active = document.activeElement;
            const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');

            if (isInput) return;                                     // <-- Don't fire when typing

            // ENTER — Accept / commit the current preview mask
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
                e.preventDefault();
                const state = window.NobleImageTools__State;
                if (state.pendingMask) {
                    window.NobleImageTools__MaskingTools__PromptController
                        .NobleImageTools__Prompt__AcceptMask();
                }
                return;
            }

            // ESCAPE — Clear current prompt points and preview
            if (e.key === 'Escape') {
                e.preventDefault();
                window.NobleImageTools__MaskingTools__PromptController
                    .NobleImageTools__Prompt__ClearPrompt();
                return;
            }

            const mode = window.NobleImageTools__State.mode;
            const inPaintMode = (mode === 'paint-add' || mode === 'paint-sub');

            // [ / ] — Brush size (also Shift+[ Shift+] for hardness in paint modes)
            if (e.key === '[' || e.key === ']') {
                if (inPaintMode) {
                    const brush = window.NobleImageTools__MaskingTools__BrushEditor;
                    if (e.shiftKey) {
                        brush.NobleImageTools__Brush__AdjustHardness(e.key === ']' ? 0.05 : -0.05);
                    } else {
                        const delta = e.key === ']' ? Math.max(1, Math.round(window.NobleImageTools__Brush.radiusPx * 0.12)) : -Math.max(1, Math.round(window.NobleImageTools__Brush.radiusPx * 0.12));
                        brush.NobleImageTools__Brush__AdjustRadius(delta);
                    }
                    return;
                }
            }

            // 0–9 — Set brush hardness in paint mode
            if (inPaintMode && e.code >= 'Digit0' && e.code <= 'Digit9') {
                const digit = parseInt(e.code.replace('Digit', ''), 10);
                window.NobleImageTools__MaskingTools__BrushEditor.NobleImageTools__Brush__SetHardnessFromKey(digit);
                return;
            }

            // C — Switch to Click mode
            if (e.key === 'c' || e.key === 'C') {
                NobleImageTools__Init__SetMode('click');
                return;
            }

            // B — Switch to Box mode (only if not in paint mode — [ ] should not conflict)
            if ((e.key === 'b' || e.key === 'B') && !inPaintMode) {
                NobleImageTools__Init__SetMode('box');
                return;
            }

            // W — Paint Add brush
            if (e.key === 'w' || e.key === 'W') {
                NobleImageTools__Init__SetMode('paint-add');
                return;
            }

            // X — Paint Subtract / Erase brush (like Photoshop's X to swap foreground/background)
            if (e.key === 'x' || e.key === 'X') {
                NobleImageTools__Init__SetMode(mode === 'paint-add' ? 'paint-sub' : 'paint-add');
                return;
            }

            // P — Switch to Pan
            if (e.key === 'p' || e.key === 'P') {
                NobleImageTools__Init__SetMode('pan');
                return;
            }

            // F — Fit image to canvas
            if (e.key === 'f' || e.key === 'F') {
                const state = window.NobleImageTools__State;
                window.NobleImageTools__Canvas__PanZoom.NobleImageTools__PanZoom__FitToCanvas(
                    state.image.width, state.image.height
                );
                window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__RequestRedraw();
                return;
            }
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Boot Sequence
// =============================================================================

    // FUNCTION | Main boot sequence
    // ------------------------------------------------------------
    async function NobleImageTools__Init__Boot() {
        console.log('%c[NobleImageTools] Booting...', 'color:#4f8cff;font-weight:bold');

        try {
            await NobleImageTools__Init__LoadConfig();
        } catch (configErr) {
            console.error('[NobleImageTools] Config load failed:', configErr);
            NobleImageTools__Toast__Show('Config failed to load: ' + configErr.message, 'error', 6000);
            return;
        }

        const canvasEl = document.getElementById('Nit__Canvas__Main');

        window.NobleImageTools__Canvas__PanZoom.NobleImageTools__PanZoom__Init(
            canvasEl,
            window.NobleImageTools__State.config,
            function () {
                window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__RequestRedraw();
                NobleImageTools__StatusBar__Update();
            },
            null
        );

        window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__Init(canvasEl);
        window.NobleImageTools__Canvas__InteractionHandler.NobleImageTools__Interaction__Init(canvasEl);
        window.NobleImageTools__MaskingTools__BrushEditor.NobleImageTools__Brush__Init(canvasEl);
        window.NobleImageTools__FileManager__Loader.NobleImageTools__Loader__Init();
        window.NobleImageTools__MaskingTools__TextPrompt.NobleImageTools__TextPrompt__Init();
        window.NobleImageTools__MaskingTools__LayerManager.NobleImageTools__LayerManager__RenderLayersList();

        NobleImageTools__Init__WireToolbar();
        NobleImageTools__Init__InstallGlobalHotkeys();
        NobleImageTools__Init__SetMode('click');
        NobleImageTools__StatusBar__Update();
        await NobleImageTools__Init__CheckServerHealth();

        window.addEventListener('resize', function () {
            window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__RequestRedraw();
            NobleImageTools__StatusBar__Update();
        });

        NobleImageTools__Toast__Show('NobleImageTools ready.', 'success', 2200);
        console.log('%c[NobleImageTools] Ready', 'color:#2db87a;font-weight:bold');
    }
    // ------------------------------------------------------------

    document.addEventListener('DOMContentLoaded', NobleImageTools__Init__Boot);

// endregion -------------------------------------------------------------------

}());
