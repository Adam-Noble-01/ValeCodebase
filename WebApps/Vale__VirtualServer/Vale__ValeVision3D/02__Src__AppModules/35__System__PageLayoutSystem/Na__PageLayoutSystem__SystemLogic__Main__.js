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
// - Entry point for the Page Layout System: the Drawing Editor page of ValeVision
//   3D, in the app's own window since v2.76.0 (it was a new-tab page).
// - Fetches Na__PageLayoutSystem__Config.json at boot and attaches the full
//   config object to state.config so all sub-modules can consume their sections.
// - Reads the rendered picture ValeVision 3D hands over (through the host link,
//   Na__PageLayoutSystem__Host__: the app around the page, or the tab that
//   opened it), with the project it belongs to, the view it was rendered from
//   and the settings it was rendered at (Na__ImageExport__PageLayoutHandoff__). Opened from Saved
//   Drawings (?project=<id>&open=saved) there is no picture: the page opens on
//   the job's saved layouts instead of the old No Image Data card.
// - Loads the A3 title block PNG as a locked background layer.
// - The drawing frame (the space left of the title block) is document config; a
//   new picture lands centred in it, and the composition guide is measured from it.
// - Manages the shared state object consumed by all sub-modules.
// - Handles canvas sizing with DPR-aware resolution for sharp rendering, and
//   follows its container (the side menu folding resizes it).
// - Provides the requestRedraw() hook for sub-modules to trigger re-renders.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Oct-2026 - Version 2.3.0 (ValeVision3D v2.76.1)
// - ?layout=<id> (state.openLayoutId): the page opens on that saved layout, for
//   the app's Drawings menu.
//
// 09-Oct-2026 - Version 2.2.0 (ValeVision3D v2.76.0)
// - The picture is taken, and the page says it is ready, through the host link
//   (Na__PageLayoutSystem__Host__): window.parent when the page is the app's
//   Drawing Editor page, window.opener for a tab an older version opened.
// - Inside the app the sheet fits below a 24px strip (fitTopInsetPx), so the
//   app's breadcrumb card sits above the sheet rather than on it.
//
// 09-Oct-2026 - Version 2.1.0 (ValeVision3D v2.75.1)
// - ResizeCanvasToContainer exported: the side menu's width drag refits the sheet
//   frame by frame (the container watcher waits for a resize to settle).
//
// 09-Oct-2026 - Version 2.0.0 (ValeVision3D v2.75.0)
// - The state carries what the side menu's tools share: the project, the drawing
//   frame, the composition guide, the picture's PNG blob, the view it was rendered
//   from and the settings it was rendered at, and the saved layout open on the page.
// - No picture is not an error when the page knows its project (Saved Drawings).
// - A new picture lands centred in the drawing frame at InitialImagePlacement of
//   it, not on the whole sheet (where it covered the title block).
// - The canvas follows its container through a ResizeObserver.
// - SetImage, FitImageInDrawingArea and FitPageToView are exported for the menu.
// - The Close button moved to the side menu (Na__PageLayoutSystem__SideMenu__).
//
// 11-Feb-2026 - Version 1.0.0
// - Initial implementation.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The Composition Guide's Starting State
    // ------------------------------------------------------------
    import { Na__PageLayout__Guide__CreateState } from './Na__PageLayoutSystem__CompositionGuide__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The Host Link (the Picture, the Ready Signal)
    // ------------------------------------------------------------
    import {
        Na__PageLayout__Host__IsEmbedded,
        Na__PageLayout__Host__TakePendingImage,
        Na__PageLayout__Host__SignalReady
    } from './Na__PageLayoutSystem__Host__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants (Hard-Coded Fallback Defaults)
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fallback Defaults for Document Config
    // ------------------------------------------------------------
    const Na__PageLayout__FALLBACK_WIDTH_MM           = 420;                               // <-- Default A3 landscape width in millimeters
    const Na__PageLayout__FALLBACK_HEIGHT_MM          = 297;                               // <-- Default A3 landscape height in millimeters
    const Na__PageLayout__FALLBACK_FORMAT             = 'A3';                              // <-- Sheet name saved with a layout
    const Na__PageLayout__FALLBACK_TITLE_BLOCK_PATH   = 'PageLayoutSystem__TitleBlock__A3__.png'; // <-- Default title block PNG
    const Na__PageLayout__FALLBACK_FIT_PADDING_PX     = 40;                                // <-- Default fit-to-page padding in CSS pixels
    const Na__PageLayout__FALLBACK_IMAGE_PLACEMENT    = 0.92;                              // <-- Default first placement, fraction of the drawing frame
    const Na__PageLayout__FALLBACK_DRAWING_AREA       = Object.freeze({ x : 10.7, y : 8.3, width : 338.7, height : 280.4 }); // <-- The A3 title block's frame, measured from its PNG
    const Na__PageLayout__EMBEDDED_TOP_INSET_PX       = 24;                                // <-- Inside the app: the breadcrumb card (14px down, 40px tall) clears the sheet
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config File Path
    // ------------------------------------------------------------
    const Na__PageLayout__CONFIG_PATH = 'Na__PageLayoutSystem__Config.json'; // <-- Config JSON relative to layout HTML
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Canvas Follows Its Container
    // ------------------------------------------------------------
    const Na__PageLayout__RESIZE_DEBOUNCE_MS = 150;                       // <-- One refit after a resize settles
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


    // HELPER FUNCTION | A Number From a Config Section, or the Fallback
    // ------------------------------------------------------------
    function Na__PageLayout__ConfigNumber(section, key, fallback) {
        return (section && typeof section[key] === 'number' && Number.isFinite(section[key])) ? section[key] : fallback;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Document Config Values from JSON
    // ------------------------------------------------------------
    function Na__PageLayout__ResolveDocumentConfig(config) {
        const section = config ? config['PageLayout__Document__Config'] : null; // <-- Get document section
        const P       = 'PageLayout__Document__Config__';

        const widthMm  = Na__PageLayout__ConfigNumber(section, P + 'WidthMm',  Na__PageLayout__FALLBACK_WIDTH_MM);
        const heightMm = Na__PageLayout__ConfigNumber(section, P + 'HeightMm', Na__PageLayout__FALLBACK_HEIGHT_MM);

        // DRAWING FRAME | Must sit on the sheet; otherwise the measured A3 frame, or the whole sheet
        // ------------------------------------------------------------
        const isA3   = widthMm === Na__PageLayout__FALLBACK_WIDTH_MM && heightMm === Na__PageLayout__FALLBACK_HEIGHT_MM;
        const backup = isA3 ? Na__PageLayout__FALLBACK_DRAWING_AREA : { x : 0, y : 0, width : widthMm, height : heightMm };
        const area   = {
            x      : Na__PageLayout__ConfigNumber(section, P + 'DrawingAreaXMm',      backup.x),
            y      : Na__PageLayout__ConfigNumber(section, P + 'DrawingAreaYMm',      backup.y),
            width  : Na__PageLayout__ConfigNumber(section, P + 'DrawingAreaWidthMm',  backup.width),
            height : Na__PageLayout__ConfigNumber(section, P + 'DrawingAreaHeightMm', backup.height)
        };
        const fits = area.width > 0 && area.height > 0 && area.x >= 0 && area.y >= 0
                  && area.x + area.width <= widthMm && area.y + area.height <= heightMm;

        return {
            widthMm        : widthMm,
            heightMm       : heightMm,
            format         : (section && typeof section[P + 'Format'] === 'string') ? section[P + 'Format'] : Na__PageLayout__FALLBACK_FORMAT,
            titleBlockPath : (section && typeof section[P + 'TitleBlockPath'] === 'string')
                                ? section[P + 'TitleBlockPath']
                                : Na__PageLayout__FALLBACK_TITLE_BLOCK_PATH,
            fitPaddingPx   : Na__PageLayout__ConfigNumber(section, P + 'FitToPagePaddingPx', Na__PageLayout__FALLBACK_FIT_PADDING_PX),
            fitTopInsetPx  : Na__PageLayout__Host__IsEmbedded() ? Na__PageLayout__EMBEDDED_TOP_INSET_PX : 0,   // <-- Room for the app's breadcrumb card above the sheet
            imagePlacement : Na__PageLayout__ConfigNumber(section, P + 'InitialImagePlacement', Na__PageLayout__FALLBACK_IMAGE_PLACEMENT),
            drawingArea    : fits ? area : { ...backup }
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


    // FUNCTION | Load a Picture From a Blob (the Object URL Is Freed Once It Has Decoded)
    // ------------------------------------------------------------
    async function Na__PageLayout__LoadImageFromBlob(blob) {
        const url = URL.createObjectURL(blob);                              // <-- Object URL from the blob
        try {
            const image = await Na__PageLayout__LoadImage(url);
            if (typeof image.decode === 'function') {
                try { await image.decode(); } catch (decodeError) { /* drawn anyway */ }
            }
            return image;
        } finally {
            URL.revokeObjectURL(url);                                       // <-- Image is decoded; free the object URL
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Calculate Fit-To-Page Zoom and Offset
    // ------------------------------------------------------------
    // topInsetPx: a strip kept clear along the top (inside the app, the
    // breadcrumb card floats there); the sheet centres in what is left.
    // ------------------------------------------------------------
    function Na__PageLayout__CalculateFitToPage(canvasWidth, canvasHeight, dpr, docWidthMm, docHeightMm, paddingPx, topInsetPx = 0) {
        const logicalWidth   = canvasWidth / dpr; // <-- CSS pixel width
        const logicalHeight  = canvasHeight / dpr; // <-- CSS pixel height
        const insetTop       = Math.max(0, Math.min(topInsetPx || 0, logicalHeight / 4)); // <-- Never more than a quarter of a small window

        const availableWidth  = Math.max(1, logicalWidth - (paddingPx * 2)); // <-- Available width after padding
        const availableHeight = Math.max(1, logicalHeight - insetTop - (paddingPx * 2)); // <-- Available height after padding and the strip

        const scaleX = availableWidth / docWidthMm; // <-- Scale to fit width
        const scaleY = availableHeight / docHeightMm; // <-- Scale to fit height
        const zoom   = Math.min(scaleX, scaleY); // <-- Use smallest scale to fit both dimensions

        const offsetX = (logicalWidth - (docWidthMm * zoom)) / 2; // <-- Center horizontally
        const offsetY = insetTop + (logicalHeight - insetTop - (docHeightMm * zoom)) / 2; // <-- Center vertically below the strip

        return { zoom, offsetX, offsetY }; // <-- Return fit parameters
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fit a Picture Inside an Area at a Fraction of It, Centred
    // ------------------------------------------------------------
    function Na__PageLayout__CalculateImageInArea(imageWidth, imageHeight, area, placementFraction) {
        const imageAspect = imageWidth / imageHeight; // <-- Source image aspect ratio
        const maxWidthMm  = area.width * placementFraction; // <-- Fraction of the area's width
        const maxHeightMm = area.height * placementFraction; // <-- Fraction of the area's height

        let fitWidthMm, fitHeightMm; // <-- Final image dimensions in mm

        if (imageAspect > (maxWidthMm / maxHeightMm)) { // <-- Image is wider than available space
            fitWidthMm  = maxWidthMm; // <-- Constrain by width
            fitHeightMm = maxWidthMm / imageAspect; // <-- Calculate height from width
        } else { // <-- Image is taller than available space
            fitHeightMm = maxHeightMm; // <-- Constrain by height
            fitWidthMm  = maxHeightMm * imageAspect; // <-- Calculate width from height
        }

        return {
            x      : area.x + (area.width - fitWidthMm) / 2,   // <-- X position in mm from document left edge
            y      : area.y + (area.height - fitHeightMm) / 2, // <-- Y position in mm from document top edge
            width  : fitWidthMm,                               // <-- Width in mm on document
            height : fitHeightMm                               // <-- Height in mm on document
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Setup DPR-Aware Canvas Sizing
    // ------------------------------------------------------------
    function Na__PageLayout__SetupCanvasSize(canvas, container) {
        const dpr    = window.devicePixelRatio || 1; // <-- Device pixel ratio
        const width  = Math.max(1, container.clientWidth); // <-- Container CSS width
        const height = Math.max(1, container.clientHeight); // <-- Container CSS height

        canvas.width           = Math.round(width * dpr); // <-- Set internal resolution
        canvas.height          = Math.round(height * dpr); // <-- Set internal resolution
        canvas.style.width     = width + 'px'; // <-- Set display size
        canvas.style.height    = height + 'px'; // <-- Set display size

        return { width: canvas.width, height: canvas.height, dpr }; // <-- Return actual dimensions
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Page's Own Query (?project=<id>&open=saved&layout=<layout id>)
    // ------------------------------------------------------------
    function Na__PageLayout__ReadUrlParams() {
        try {
            const params = new URLSearchParams(window.location.search);
            return {
                project : (params.get('project') || '').trim(),
                open    : (params.get('open') || '').trim(),
                layout  : (params.get('layout') || '').trim()             // <-- A saved layout to open as the page starts (the app's Drawings menu)
            };
        } catch (error) {
            return { project : '', open : '', layout : '' };
        }
    }
    // ------------------------------------------------------------


// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Placement and View Tools (Used by the Side Menu)
// -----------------------------------------------------------------------------

    // FUNCTION | Fit the Whole Sheet in the Window Again
    // ------------------------------------------------------------
    function Na__PageLayout__FitPageToView(state) {
        if (!state || !state.canvas) return;
        const fit = Na__PageLayout__CalculateFitToPage(
            state.canvas.width, state.canvas.height, state.dpr,
            state.a3.widthMm, state.a3.heightMm, state.document.fitPaddingPx, state.document.fitTopInsetPx
        );
        state.canvasTransform.offsetX = fit.offsetX;
        state.canvasTransform.offsetY = fit.offsetY;
        state.canvasTransform.zoom    = fit.zoom;
    }
    // ------------------------------------------------------------


    // FUNCTION | Size the Canvas to Its Container Now, Refit the Sheet and Redraw
    // ------------------------------------------------------------
    function Na__PageLayout__ResizeCanvasToContainer(state) {
        if (!state || !state.canvas || !state.canvasContainer) return;
        const size = Na__PageLayout__SetupCanvasSize(state.canvas, state.canvasContainer); // <-- Recalculate canvas size
        state.dpr  = size.dpr; // <-- Update DPR
        Na__PageLayout__FitPageToView(state);
        if (state.requestRedraw) {
            state.requestRedraw(); // <-- Trigger redraw
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Put the Picture Back Centred in the Drawing Frame, Untrimmed
    // ------------------------------------------------------------
    function Na__PageLayout__FitImageInDrawingArea(state) {
        if (!state || !state.sourceImageMeta || !state.sourceImageMeta.width || !state.sourceImageMeta.height) return;
        const placed = Na__PageLayout__CalculateImageInArea(
            state.sourceImageMeta.width, state.sourceImageMeta.height,
            state.drawingArea, state.document.imagePlacement
        );
        Object.assign(state.imageTransform, placed, { clipTop : 0, clipRight : 0, clipBottom : 0, clipLeft : 0 });
    }
    // ------------------------------------------------------------


    // FUNCTION | Put a Picture on the Sheet
    // ------------------------------------------------------------
    // meta: { width, height, aspectRatio } in pixels.
    // options.keepPlacement: a re-render of the same view keeps the picture
    // where it is. Same aspect: nothing moves. A new aspect keeps the centre
    // and the width; the height follows, and the top and bottom trims scale
    // with it. Otherwise the picture lands centred in the drawing frame.
    // ------------------------------------------------------------
    function Na__PageLayout__SetImage(state, image, meta, options = {}) {
        const it   = state.imageTransform;
        const keep = options.keepPlacement === true && !!state.viewportImage && it.width > 0 && it.height > 0;

        state.viewportImage   = image;
        state.sourceImageMeta = {
            width       : meta.width,
            height      : meta.height,
            aspectRatio : meta.aspectRatio || null
        };

        if (keep) {
            const newAspect = meta.width / meta.height;
            const oldAspect = it.width / it.height;
            if (Math.abs(newAspect - oldAspect) > 0.001) {
                const centreY = it.y + it.height / 2;
                const height  = it.width / newAspect;
                const scale   = height / it.height;
                it.clipTop    = (it.clipTop    || 0) * scale;
                it.clipBottom = (it.clipBottom || 0) * scale;
                it.height     = height;
                it.y          = centreY - height / 2;
            }
        } else {
            Na__PageLayout__FitImageInDrawingArea(state);
        }
        state.isImageSelected = true;
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
        const params    = Na__PageLayout__ReadUrlParams();

        // Take the picture ValeVision 3D left (none when opened on the saved
        // list: a picture still waiting there belongs to a Create Drawing)
        // ------------------------------------------------------------
        let imageData = (params.open === 'saved') ? null : Na__PageLayout__Host__TakePendingImage(); // <-- { blob | dataUrl, width, height, aspectRatio, projectId, sourceView, renderSettings }
        if (imageData && !imageData.blob && !imageData.dataUrl) imageData = null;

        const projectId = params.project || (imageData && imageData.projectId) || '';
        if (!imageData && !projectId) {
            if (errorOverlay) {
                errorOverlay.style.display = 'flex'; // <-- Show error overlay
            }
            console.warn('[PageLayout] No picture from ValeVision 3D and no ?project=');
            return null;
        }

        // Load viewport image (Blob preferred - avoids a 40-90MB base64 string
        // at 4K/8K export sizes; dataUrl retained as a legacy fallback)
        // ------------------------------------------------------------
        let viewportImage = null; // <-- Will hold loaded Image element
        let imageBlob     = null; // <-- The PNG kept to save with the layout
        if (imageData) {
            try {
                if (imageData.blob) {
                    imageBlob     = new Blob([imageData.blob], { type : imageData.blob.type || 'image/png' }); // <-- This page's own Blob (the app's can go)
                    viewportImage = await Na__PageLayout__LoadImageFromBlob(imageBlob);
                } else {
                    viewportImage = await Na__PageLayout__LoadImage(imageData.dataUrl); // <-- Legacy data URL path
                    imageBlob     = await (await fetch(imageData.dataUrl)).blob();
                }
            } catch (err) {
                console.error('[PageLayout] Failed to load viewport image:', err);
                if (!projectId) {
                    if (errorOverlay) {
                        errorOverlay.style.display = 'flex'; // <-- Show error overlay
                    }
                    return null;
                }
                viewportImage = null;                                       // <-- The saved list still opens
                imageBlob     = null;
            }
        }

        // Load title block PNG
        // ------------------------------------------------------------
        let titleBlockImage = null; // <-- Will hold loaded Image element
        try {
            titleBlockImage = await Na__PageLayout__LoadImage(docConfig.titleBlockPath); // <-- Load title block from config
        } catch (err) {
            console.error('[PageLayout] Failed to load title block:', err);
        }

        // Setup canvas dimensions and fit the sheet in the window
        // ------------------------------------------------------------
        const canvasSize = Na__PageLayout__SetupCanvasSize(canvas, canvasContainer); // <-- Size canvas to container
        const fitParams  = Na__PageLayout__CalculateFitToPage(
            canvasSize.width, canvasSize.height, canvasSize.dpr,
            docConfig.widthMm, docConfig.heightMm, docConfig.fitPaddingPx, docConfig.fitTopInsetPx
        );

        // Build shared state object
        // ------------------------------------------------------------
        const state = {
            // Full config object (sub-modules read their own sections)
            config : rawConfig || {},
            document : docConfig,                                         // <-- Sheet, frame, title block, first placement

            // Document Constants (resolved from config with fallbacks)
            a3 : {
                widthMm  : docConfig.widthMm,                            // <-- Document width in mm
                heightMm : docConfig.heightMm                            // <-- Document height in mm
            },
            drawingArea : { ...docConfig.drawingArea },                   // <-- The frame left of the title block, mm

            // Title Block Image (locked background layer)
            titleBlockImage : titleBlockImage,                            // <-- Image element or null

            // Viewport Image (user-positionable foreground layer)
            viewportImage   : null,                                       // <-- Image element (set below), or null on the saved list
            imageBlob       : imageBlob,                                  // <-- The picture's PNG, uploaded with a save
            imageIsSaved    : false,                                      // <-- True while the picture is the one the open layout stores

            // Image Transform (position and size in mm on document)
            imageTransform : {
                x          : 0,                                           // <-- X position in mm
                y          : 0,                                           // <-- Y position in mm
                width      : 0,                                           // <-- Width in mm
                height     : 0,                                           // <-- Height in mm
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
            canvas          : canvas,                                     // <-- The live canvas (FitPageToView reads its size)
            canvasContainer : canvasContainer,                            // <-- What the canvas fills (ResizeCanvasToContainer)
            dpr             : canvasSize.dpr,                             // <-- Device pixel ratio
            isImageSelected : false,                                      // <-- Handles visible

            // Source Image Metadata
            sourceImageMeta : { width : 0, height : 0, aspectRatio : null },

            // Where the picture came from, and the job it is saved to
            sourceView      : imageData ? (imageData.sourceView || null) : null,          // <-- The view a re-render poses again
            renderSettings  : imageData ? (imageData.renderSettings || null) : null,      // <-- What the picture was rendered at
            project         : { id : projectId },                                         // <-- ?project= (or the picture's)
            openMode        : params.open,                                                // <-- 'saved': opened on the saved list
            openLayoutId    : params.layout,                                              // <-- Opened on one saved layout (taken by the Saved Layouts section)

            // The saved layout open on the page (record null: a new, unsaved layout).
            // dirty: differs from what is saved (leaving the page then asks first)
            layout          : { record : null, name : '', dirty : false },

            // The composition guide (off until switched on)
            guide           : Na__PageLayout__Guide__CreateState(),

            // Redraw hook (set by boot script after initialization)
            requestRedraw : null                                          // <-- Will be set to the render function
        };

        if (viewportImage) {
            Na__PageLayout__SetImage(state, viewportImage, {
                width       : imageData.width  || viewportImage.naturalWidth,
                height      : imageData.height || viewportImage.naturalHeight,
                aspectRatio : imageData.aspectRatio || null
            });
            state.layout.dirty = true;                                    // <-- A new picture is not saved yet
        }

        // Follow the container (window resizes and the side menu folding)
        // ------------------------------------------------------------
        let resizeTimeout = null; // <-- Debounce timer
        const onResize = () => {
            clearTimeout(resizeTimeout); // <-- Clear previous timer
            resizeTimeout = setTimeout(() => Na__PageLayout__ResizeCanvasToContainer(state), Na__PageLayout__RESIZE_DEBOUNCE_MS);
        };
        if (typeof ResizeObserver === 'function') {
            new ResizeObserver(onResize).observe(canvasContainer);
        } else {
            window.addEventListener('resize', onResize);
        }

        // Tell ValeVision 3D the page has its picture (its spinner goes)
        // ------------------------------------------------------------
        Na__PageLayout__Host__SignalReady();

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
        Na__PageLayout__Initialize,
        Na__PageLayout__LoadImage,
        Na__PageLayout__LoadImageFromBlob,
        Na__PageLayout__SetImage,
        Na__PageLayout__FitImageInDrawingArea,
        Na__PageLayout__FitPageToView,
        Na__PageLayout__ResizeCanvasToContainer
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
