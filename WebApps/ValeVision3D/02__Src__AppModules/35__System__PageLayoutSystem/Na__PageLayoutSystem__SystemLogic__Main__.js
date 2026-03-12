// =============================================================================
// VALEVISION3D - PAGE LAYOUT SYSTEM - MAIN SYSTEM LOGIC
// =============================================================================
//
// FILE       : Na__PageLayoutSystem__SystemLogic__Main__.js
// NAMESPACE  : Na__PageLayout
// MODULE     : SystemLogic Main
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Main orchestrator for the Page Layout System
// CREATED    : 11-Feb-2026
//
// DESCRIPTION:
// - Entry point for the Page Layout System (standalone new-tab page).
// - Fetches Na__PageLayoutSystem__Config.json at boot and attaches the full
//   config object to state.config so all sub-modules can consume their sections.
// - Reads rendered viewport image from window.opener global property.
// - Loads the A3 title block PNG as a locked background layer.
// - Manages shared state object consumed by all sub-modules.
// - Handles canvas sizing with DPR-aware resolution for sharp rendering.
// - Provides the requestRedraw() hook for sub-modules to trigger re-renders.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants (Hard-Coded Fallback Defaults)
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fallback Defaults for Document Config
    // ------------------------------------------------------------
    const Na__PageLayout__FALLBACK_WIDTH_MM           = 420;                               // <-- Default A3 landscape width in millimeters
    const Na__PageLayout__FALLBACK_HEIGHT_MM          = 297;                               // <-- Default A3 landscape height in millimeters
    const Na__PageLayout__FALLBACK_TITLE_BLOCK_PATH   = 'PageLayoutSystem__TitleBlock__A3__.png'; // <-- Default title block PNG
    const Na__PageLayout__FALLBACK_FIT_PADDING_PX     = 40;                                // <-- Default fit-to-page padding in CSS pixels
    const Na__PageLayout__FALLBACK_IMAGE_PLACEMENT    = 0.80;                              // <-- Default initial image placement fraction
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config File Path
    // ------------------------------------------------------------
    const Na__PageLayout__CONFIG_PATH = 'Na__PageLayoutSystem__Config.json'; // <-- Config JSON relative to layout HTML
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Image Data Transfer Key
    // ------------------------------------------------------------
    const Na__PageLayout__OPENER_KEY = '__Na__PageLayout__PendingImage'; // <-- Property name on window.opener
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Loader
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch Page Layout Config JSON
    // ------------------------------------------------------------
    // Attempts to load the standalone config file. Returns the parsed
    // JSON object on success, or null on failure (caller uses fallbacks).
    // ------------------------------------------------------------
    async function Na__PageLayout__FetchConfig() {
        try {
            const response = await fetch(Na__PageLayout__CONFIG_PATH); // <-- Fetch config JSON
            if (!response.ok) {
                console.warn(`[PageLayout] Config fetch returned ${response.status}, using fallback defaults`);
                return null;
            }
            return await response.json(); // <-- Parse and return config object
        } catch (err) {
            console.warn('[PageLayout] Failed to load config, using fallback defaults:', err);
            return null;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Document Config Values from JSON
    // ------------------------------------------------------------
    function Na__PageLayout__ResolveDocumentConfig(config) {
        const section = config ? config['PageLayout__Document__Config'] : null; // <-- Get document section

        return {
            widthMm        : (section && typeof section['PageLayout__Document__Config__WidthMm'] === 'number')
                                ? section['PageLayout__Document__Config__WidthMm']
                                : Na__PageLayout__FALLBACK_WIDTH_MM,
            heightMm       : (section && typeof section['PageLayout__Document__Config__HeightMm'] === 'number')
                                ? section['PageLayout__Document__Config__HeightMm']
                                : Na__PageLayout__FALLBACK_HEIGHT_MM,
            titleBlockPath : (section && typeof section['PageLayout__Document__Config__TitleBlockPath'] === 'string')
                                ? section['PageLayout__Document__Config__TitleBlockPath']
                                : Na__PageLayout__FALLBACK_TITLE_BLOCK_PATH,
            fitPaddingPx   : (section && typeof section['PageLayout__Document__Config__FitToPagePaddingPx'] === 'number')
                                ? section['PageLayout__Document__Config__FitToPagePaddingPx']
                                : Na__PageLayout__FALLBACK_FIT_PADDING_PX,
            imagePlacement : (section && typeof section['PageLayout__Document__Config__InitialImagePlacement'] === 'number')
                                ? section['PageLayout__Document__Config__InitialImagePlacement']
                                : Na__PageLayout__FALLBACK_IMAGE_PLACEMENT
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helper Functions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Load Image from URL as Promise
    // ------------------------------------------------------------
    function Na__PageLayout__LoadImage(src) {
        return new Promise((resolve, reject) => {
            const img    = new Image(); // <-- Create new image element
            img.onload   = () => resolve(img); // <-- Resolve on successful load
            img.onerror  = (err) => reject(err); // <-- Reject on error
            img.src      = src; // <-- Set source to trigger load
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Calculate Fit-To-Page Zoom and Offset
    // ------------------------------------------------------------
    function Na__PageLayout__CalculateFitToPage(canvasWidth, canvasHeight, dpr, docWidthMm, docHeightMm, paddingPx) {
        const logicalWidth   = canvasWidth / dpr; // <-- CSS pixel width
        const logicalHeight  = canvasHeight / dpr; // <-- CSS pixel height

        const availableWidth  = logicalWidth - (paddingPx * 2); // <-- Available width after padding
        const availableHeight = logicalHeight - (paddingPx * 2); // <-- Available height after padding

        const scaleX = availableWidth / docWidthMm; // <-- Scale to fit width
        const scaleY = availableHeight / docHeightMm; // <-- Scale to fit height
        const zoom   = Math.min(scaleX, scaleY); // <-- Use smallest scale to fit both dimensions

        const offsetX = (logicalWidth - (docWidthMm * zoom)) / 2; // <-- Center horizontally
        const offsetY = (logicalHeight - (docHeightMm * zoom)) / 2; // <-- Center vertically

        return { zoom, offsetX, offsetY }; // <-- Return fit parameters
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Calculate Initial Image Transform
    // ------------------------------------------------------------
    function Na__PageLayout__CalculateInitialImageTransform(imageWidth, imageHeight, docWidthMm, docHeightMm, placementFraction) {
        const imageAspect    = imageWidth / imageHeight; // <-- Source image aspect ratio
        const maxWidthMm     = docWidthMm * placementFraction; // <-- Fraction of document width
        const maxHeightMm    = docHeightMm * placementFraction; // <-- Fraction of document height

        let fitWidthMm, fitHeightMm; // <-- Final image dimensions in mm

        if (imageAspect > (maxWidthMm / maxHeightMm)) { // <-- Image is wider than available space
            fitWidthMm  = maxWidthMm; // <-- Constrain by width
            fitHeightMm = maxWidthMm / imageAspect; // <-- Calculate height from width
        } else { // <-- Image is taller than available space
            fitHeightMm = maxHeightMm; // <-- Constrain by height
            fitWidthMm  = maxHeightMm * imageAspect; // <-- Calculate width from height
        }

        const x = (docWidthMm - fitWidthMm) / 2; // <-- Center horizontally on document
        const y = (docHeightMm - fitHeightMm) / 2; // <-- Center vertically on document

        return {
            x      : x,             // <-- X position in mm from document left edge
            y      : y,             // <-- Y position in mm from document top edge
            width  : fitWidthMm,    // <-- Width in mm on document
            height : fitHeightMm    // <-- Height in mm on document
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Setup DPR-Aware Canvas Sizing
    // ------------------------------------------------------------
    function Na__PageLayout__SetupCanvasSize(canvas, container) {
        const dpr    = window.devicePixelRatio || 1; // <-- Device pixel ratio
        const width  = container.clientWidth; // <-- Container CSS width
        const height = container.clientHeight; // <-- Container CSS height

        canvas.width           = width * dpr; // <-- Set internal resolution
        canvas.height          = height * dpr; // <-- Set internal resolution
        canvas.style.width     = width + 'px'; // <-- Set display size
        canvas.style.height    = height + 'px'; // <-- Set display size

        return { width: canvas.width, height: canvas.height, dpr }; // <-- Return actual dimensions
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | System Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Page Layout System
    // ------------------------------------------------------------
    async function Na__PageLayout__Initialize(canvas, canvasContainer, errorOverlay) {

        // Fetch config JSON (falls back to hard-coded defaults on failure)
        // ------------------------------------------------------------
        const rawConfig = await Na__PageLayout__FetchConfig(); // <-- Load config or null
        const docConfig = Na__PageLayout__ResolveDocumentConfig(rawConfig); // <-- Resolve document settings

        // Read image data from opener window
        // ------------------------------------------------------------
        let imageData = null; // <-- Will hold { dataUrl, width, height, aspectRatio }

        if (window.opener && window.opener[Na__PageLayout__OPENER_KEY]) {
            imageData = window.opener[Na__PageLayout__OPENER_KEY]; // <-- Read from opener
            window.opener[Na__PageLayout__OPENER_KEY] = null; // <-- Clear to free memory on opener
        }

        if (!imageData || !imageData.dataUrl) {
            if (errorOverlay) {
                errorOverlay.style.display = 'flex'; // <-- Show error overlay
            }
            console.warn('[PageLayout] No image data found on window.opener');
            return null;
        }

        // Load viewport image from data URL
        // ------------------------------------------------------------
        let viewportImage = null; // <-- Will hold loaded Image element
        try {
            viewportImage = await Na__PageLayout__LoadImage(imageData.dataUrl); // <-- Load image from dataUrl
        } catch (err) {
            console.error('[PageLayout] Failed to load viewport image:', err);
            if (errorOverlay) {
                errorOverlay.style.display = 'flex'; // <-- Show error overlay
            }
            return null;
        }

        // Load title block PNG
        // ------------------------------------------------------------
        let titleBlockImage = null; // <-- Will hold loaded Image element
        try {
            titleBlockImage = await Na__PageLayout__LoadImage(docConfig.titleBlockPath); // <-- Load title block from config
        } catch (err) {
            console.error('[PageLayout] Failed to load title block:', err);
        }

        // Setup canvas dimensions
        // ------------------------------------------------------------
        const canvasSize = Na__PageLayout__SetupCanvasSize(canvas, canvasContainer); // <-- Size canvas to container

        // Calculate initial canvas transform (fit document page to viewport)
        // ------------------------------------------------------------
        const fitParams = Na__PageLayout__CalculateFitToPage(
            canvasSize.width, canvasSize.height, canvasSize.dpr,
            docConfig.widthMm, docConfig.heightMm, docConfig.fitPaddingPx
        );

        // Calculate initial image placement (centered at configured fraction)
        // ------------------------------------------------------------
        const initialTransform = Na__PageLayout__CalculateInitialImageTransform(
            imageData.width, imageData.height,
            docConfig.widthMm, docConfig.heightMm, docConfig.imagePlacement
        );

        // Build shared state object
        // ------------------------------------------------------------
        const state = {
            // Full config object (sub-modules read their own sections)
            config : rawConfig || {},

            // Document Constants (resolved from config with fallbacks)
            a3 : {
                widthMm  : docConfig.widthMm,                            // <-- Document width in mm
                heightMm : docConfig.heightMm                            // <-- Document height in mm
            },

            // Title Block Image (locked background layer)
            titleBlockImage : titleBlockImage,                            // <-- Image element or null

            // Viewport Image (user-positionable foreground layer)
            viewportImage   : viewportImage,                              // <-- Image element

            // Image Transform (position and size in mm on document)
            imageTransform : {
                x      : initialTransform.x,                              // <-- X position in mm
                y      : initialTransform.y,                              // <-- Y position in mm
                width  : initialTransform.width,                          // <-- Width in mm
                height : initialTransform.height,                         // <-- Height in mm
                clipTop    : 0,                                           // <-- Clipping from top edge in mm
                clipRight  : 0,                                           // <-- Clipping from right edge in mm
                clipBottom : 0,                                           // <-- Clipping from bottom edge in mm
                clipLeft   : 0                                            // <-- Clipping from left edge in mm
            },

            // Canvas Transform (2D pan/zoom of the entire canvas view)
            canvasTransform : {
                offsetX : fitParams.offsetX,                              // <-- Pan offset X in CSS pixels
                offsetY : fitParams.offsetY,                              // <-- Pan offset Y in CSS pixels
                zoom    : fitParams.zoom                                  // <-- Zoom level (pixels per mm)
            },

            // Canvas Metadata
            dpr             : canvasSize.dpr,                             // <-- Device pixel ratio
            isImageSelected : true,                                       // <-- Image starts selected (handles visible)

            // Source Image Metadata
            sourceImageMeta : {
                width       : imageData.width,                            // <-- Original image width in pixels
                height      : imageData.height,                           // <-- Original image height in pixels
                aspectRatio : imageData.aspectRatio                       // <-- Original aspect ratio string or null
            },

            // Redraw hook (set by boot script after initialization)
            requestRedraw : null                                          // <-- Will be set to the render function
        };

        // Handle window resize
        // ------------------------------------------------------------
        let resizeTimeout = null; // <-- Debounce timer
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout); // <-- Clear previous timer
            resizeTimeout = setTimeout(() => {
                const newSize = Na__PageLayout__SetupCanvasSize(canvas, canvasContainer); // <-- Recalculate canvas size
                state.dpr     = newSize.dpr; // <-- Update DPR

                const newFit  = Na__PageLayout__CalculateFitToPage(
                    newSize.width, newSize.height, newSize.dpr,
                    state.a3.widthMm, state.a3.heightMm, docConfig.fitPaddingPx
                );
                state.canvasTransform.offsetX = newFit.offsetX; // <-- Update offset
                state.canvasTransform.offsetY = newFit.offsetY; // <-- Update offset
                state.canvasTransform.zoom    = newFit.zoom; // <-- Update zoom

                if (state.requestRedraw) {
                    state.requestRedraw(); // <-- Trigger redraw
                }
            }, 150); // <-- 150ms debounce
        });

        // Handle close button
        // ------------------------------------------------------------
        const closeButton = document.getElementById('naLayoutClose'); // <-- Close button
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                window.close(); // <-- Close the tab
            });
        }

        // Notify opener tab that layout page loaded successfully
        // ------------------------------------------------------------
        if (window.opener) {
            window.opener.postMessage({ type: 'Na__PageLayout__Ready' }, '*'); // <-- Signal parent tab
        }

        return state; // <-- Return initialized state
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | System Logic API
    // ------------------------------------------------------------
    export {
        Na__PageLayout__Initialize
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
