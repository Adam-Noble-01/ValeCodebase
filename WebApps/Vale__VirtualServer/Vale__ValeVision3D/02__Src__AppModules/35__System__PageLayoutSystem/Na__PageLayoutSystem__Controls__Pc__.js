// =============================================================================
// VALEVISION3D - PAGE LAYOUT SYSTEM - PC MOUSE CONTROLS
// =============================================================================
//
// FILE       : Na__PageLayoutSystem__Controls__Pc__.js
// NAMESPACE  : Na__PageLayout
// MODULE     : PC Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Mouse drag/resize interaction for positioning the viewport image
// CREATED    : 11-Feb-2026
//
// DESCRIPTION:
// - What is under the pointer, and what a drag does to the picture, come from
//   Na__PageLayoutSystem__ImageHandles__ (shared with touch and the screen):
//   - Left-click drag on the picture: move it on the sheet.
//   - Left-click drag on a corner disc: scale it, crop and all, about the
//     opposite corner.
//   - Left-click drag on an edge tab: trim that edge in or out.
// - Left-click drag on the composition guide: move that margin in or out
//   (Shift, or the menu's Move Opposite Edges Together, moves the opposite one too).
// - Cursor feedback changes based on hover state; the picture handle under the
//   pointer is named in state.imageHandleHover (it grows and is labelled), the
//   one dragged in state.imageHandleDrag (its numbers are shown).
// - All coordinates transformed through canvasTransform for accurate interaction.
// - Hit-test radius and minimum image dimensions read from state.config
//   (PageLayout__Navigation__Config section) with hard-coded fallbacks.
// - Every finished drag that changed something tells the page ('changed'), so
//   the Drawing Layout section can show the layout has unsaved changes.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Nov-2026 - Version 1.2.0 (ValeVision3D v2.94.1)
// - The hit test and the drag maths move to Na__PageLayoutSystem__ImageHandles__:
//   handles on the visible (trimmed) picture, a corner scales the trims with
//   the picture, edges show a trim cursor. Hover and drag are written to the
//   state for the labels; leaving the canvas clears the hover.
//
// 09-Oct-2026 - Version 1.1.0 (ValeVision3D v2.75.0)
// - The composition guide: its grips and edges drag (Na__PageLayoutSystem__CompositionGuide__).
//   Order under the pointer: the picture's handles (while it is selected), the guide,
//   the picture's body.
// - The picture's eight handles answer only while the picture is selected (they
//   are only drawn then), so an unselected picture never hides a guide grip.
// - A sheet with no picture (opened on the saved list) takes only guide drags.
// - Finished drags emit 'changed' (image or guide).
//
// 11-Feb-2026 - Version 1.0.0
// - Initial implementation.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The Composition Guide, the Picture's Handles, Page Events
    // ------------------------------------------------------------
    import {
        Na__PageLayout__Guide__ResolveConfig,
        Na__PageLayout__Guide__HitTest,
        Na__PageLayout__Guide__IsHandle,
        Na__PageLayout__Guide__CursorFor,
        Na__PageLayout__Guide__Drag
    } from './Na__PageLayoutSystem__CompositionGuide__.js';
    import {
        Na__PageLayout__Handles__HitTest,
        Na__PageLayout__Handles__IsHandle,
        Na__PageLayout__Handles__CursorClass,
        Na__PageLayout__Handles__CursorClasses,
        Na__PageLayout__Handles__StartDrag,
        Na__PageLayout__Handles__Drag
    } from './Na__PageLayoutSystem__ImageHandles__.js';
    import { Na__PageLayout__Emit } from './Na__PageLayoutSystem__UiNotify__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants (Hard-Coded Fallback Defaults)
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fallback Handle Hit-Test Radius
    // ------------------------------------------------------------
    const Na__PageLayout__FALLBACK_HIT_RADIUS_PX  = 10;                          // <-- Default hit radius in CSS pixels for handle detection
    const Na__PageLayout__FALLBACK_MIN_IMAGE_MM   = 10;                          // <-- Default minimum image size in mm
    const Na__PageLayout__FALLBACK_MIN_VISIBLE_MM = 10;                          // <-- Default minimum visible content when clipping in mm
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Pointer Targets Without a Handle
    // ------------------------------------------------------------
    const HANDLE_NONE    = 'none';                                       // <-- Nothing under the pointer
    const HANDLE_BODY    = 'body';                                       // <-- The picture itself (move)
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Every Cursor Class the Canvas Can Carry From Here (Picture and Guide)
    // ------------------------------------------------------------
    const Na__PageLayout__CURSOR_CLASSES = Array.from(new Set(Na__PageLayout__Handles__CursorClasses().concat([
        'na-layout-canvas--resize-n',  'na-layout-canvas--resize-s',  'na-layout-canvas--resize-e',  'na-layout-canvas--resize-w',
        'na-layout-canvas--resize-nw', 'na-layout-canvas--resize-ne', 'na-layout-canvas--resize-sw', 'na-layout-canvas--resize-se',
        'na-layout-canvas--grabbing'
    ])));
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve PC Interaction Config from State
    // ------------------------------------------------------------
    function Na__PageLayout__ResolvePcConfig(state) {
        const section = (state && state.config) ? state.config['PageLayout__Navigation__Config'] : null;

        return {
            hitRadiusPx  : (section && typeof section['PageLayout__Navigation__Config__HandleHitRadiusPx'] === 'number')
                                ? section['PageLayout__Navigation__Config__HandleHitRadiusPx']
                                : Na__PageLayout__FALLBACK_HIT_RADIUS_PX,
            minImageMm   : (section && typeof section['PageLayout__Navigation__Config__MinImageSizeMm'] === 'number')
                                ? section['PageLayout__Navigation__Config__MinImageSizeMm']
                                : Na__PageLayout__FALLBACK_MIN_IMAGE_MM,
            minVisibleMm : (section && typeof section['PageLayout__Navigation__Config__MinVisibleMm'] === 'number')
                                ? section['PageLayout__Navigation__Config__MinVisibleMm']
                                : Na__PageLayout__FALLBACK_MIN_VISIBLE_MM
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helper Functions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Convert Screen Coordinates to Document mm
    // ------------------------------------------------------------
    function Na__PageLayout__ScreenToDocMm(screenX, screenY, canvasTransform) {
        const mmX = (screenX - canvasTransform.offsetX) / canvasTransform.zoom; // <-- Convert to mm
        const mmY = (screenY - canvasTransform.offsetY) / canvasTransform.zoom; // <-- Convert to mm
        return { x: mmX, y: mmY }; // <-- Return mm coordinates
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | What Is Under the Pointer: Picture Handle, Then Guide, Then Picture Body
    // ------------------------------------------------------------
    function Na__PageLayout__PointerTarget(screenX, screenY, state, pcConfig, guideRadiusPx) {
        const imageHit = Na__PageLayout__Handles__HitTest(screenX, screenY, state, pcConfig.hitRadiusPx);
        if (imageHit !== HANDLE_NONE && imageHit !== HANDLE_BODY) return imageHit; // <-- A picture handle wins

        const guideHit = Na__PageLayout__Guide__HitTest(screenX, screenY, state, guideRadiusPx, imageHit === HANDLE_BODY);
        if (guideHit) return guideHit;                                     // <-- Over the picture: grips only

        return imageHit;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Cursor Class for Any Handle
    // ------------------------------------------------------------
    function Na__PageLayout__CursorClassFor(handle) {
        return Na__PageLayout__Guide__IsHandle(handle)
            ? Na__PageLayout__Guide__CursorFor(handle)
            : Na__PageLayout__Handles__CursorClass(handle);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clear All Cursor Classes from Canvas
    // ------------------------------------------------------------
    function Na__PageLayout__ClearCursorClasses(canvas) {
        Na__PageLayout__CURSOR_CLASSES.forEach((cls) => canvas.classList.remove(cls));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Name the Picture Handle Under the Mouse; Redraw Only When It Changes
    // ------------------------------------------------------------
    function Na__PageLayout__SetHover(state, target, requestRedraw) {
        const next = Na__PageLayout__Handles__IsHandle(target) ? target : null;
        if (state.imageHandleHover === next) return;
        state.imageHandleHover = next;
        requestRedraw();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | PC Controls Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize PC Mouse Controls
    // ------------------------------------------------------------
    function Na__PageLayout__InitPcControls(canvas, state, requestRedraw) {
        if (!canvas || !state) return; // <-- Guard against missing canvas or state

        const pcConfig    = Na__PageLayout__ResolvePcConfig(state); // <-- Resolve once at init
        const guideConfig = Na__PageLayout__Guide__ResolveConfig(state);
        let activeHandle  = HANDLE_NONE; // <-- Currently active drag handle
        let isDragging    = false; // <-- Drag active flag
        let dragStartMm   = { x: 0, y: 0 }; // <-- Mouse position at drag start (mm)
        let dragStartTransform = Na__PageLayout__Handles__StartDrag({ x: 0, y: 0, width: 0, height: 0 }); // <-- Image transform at drag start
        let dragStartMargins   = null; // <-- Guide margins at drag start


        // SUB FUNCTION | Handle Mouse Down (Start Drag)
        // ------------------------------------------------------------
        const onMouseDown = (event) => {
            if (event.button !== 0) return; // <-- Only left-click

            const rect    = canvas.getBoundingClientRect(); // <-- Canvas bounding rect
            const screenX = event.clientX - rect.left; // <-- Mouse X in CSS pixels
            const screenY = event.clientY - rect.top; // <-- Mouse Y in CSS pixels

            const hitResult = Na__PageLayout__PointerTarget(screenX, screenY, state, pcConfig, guideConfig.gripHitRadiusPx);

            if (hitResult === HANDLE_NONE) {
                state.isImageSelected  = false; // <-- Deselect image
                state.imageHandleHover = null;
                Na__PageLayout__ClearCursorClasses(canvas); // <-- Reset cursor
                requestRedraw(); // <-- Redraw to hide handles
                return;
            }

            const mmPos = Na__PageLayout__ScreenToDocMm(screenX, screenY, state.canvasTransform);
            dragStartMm = { x: mmPos.x, y: mmPos.y }; // <-- Store start position
            isDragging   = true; // <-- Set drag active
            activeHandle = hitResult; // <-- Store active handle

            // Start a guide drag (the picture keeps its own selection)
            // ------------------------------------------------------------
            if (Na__PageLayout__Guide__IsHandle(hitResult)) {
                dragStartMargins       = { ...state.guide.margins };
                state.guide.dragHandle = hitResult;
                state.guide.dragPaired = event.shiftKey === true || state.guide.pairEdges === true;
                Na__PageLayout__ClearCursorClasses(canvas);
                const cursorClass = Na__PageLayout__Guide__CursorFor(hitResult);
                if (cursorClass) canvas.classList.add(cursorClass);
                requestRedraw(); // <-- Show the margin labels
                event.preventDefault();
                return;
            }

            // Start a picture drag operation
            // ------------------------------------------------------------
            state.isImageSelected  = true; // <-- Ensure image is selected
            state.imageHandleDrag  = Na__PageLayout__Handles__IsHandle(hitResult) ? hitResult : null; // <-- Its numbers are shown while it moves
            state.imageHandleHover = null;
            dragStartTransform     = Na__PageLayout__Handles__StartDrag(state.imageTransform);

            // Set appropriate cursor
            // ------------------------------------------------------------
            Na__PageLayout__ClearCursorClasses(canvas); // <-- Clear previous cursor
            const cursorClass = hitResult === HANDLE_BODY ? 'na-layout-canvas--grabbing' : Na__PageLayout__Handles__CursorClass(hitResult);
            if (cursorClass) canvas.classList.add(cursorClass); // <-- Apply cursor

            requestRedraw(); // <-- Show the handles at once
            event.preventDefault(); // <-- Prevent text selection
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Handle Mouse Move (Drag Update)
        // ------------------------------------------------------------
        const onMouseMove = (event) => {
            const rect    = canvas.getBoundingClientRect(); // <-- Canvas bounding rect
            const screenX = event.clientX - rect.left; // <-- Mouse X in CSS pixels
            const screenY = event.clientY - rect.top; // <-- Mouse Y in CSS pixels

            if (!isDragging) {
                // Hover cursor and handle label (no drag active), only over the canvas itself
                // ------------------------------------------------------------
                if (event.target !== canvas) {
                    Na__PageLayout__SetHover(state, null, requestRedraw); // <-- Off the canvas: no handle is pointed at
                    return;
                }
                const hoverResult = Na__PageLayout__PointerTarget(screenX, screenY, state, pcConfig, guideConfig.gripHitRadiusPx);
                Na__PageLayout__ClearCursorClasses(canvas); // <-- Clear previous cursor
                const showBody    = hoverResult !== HANDLE_BODY || state.isImageSelected; // <-- The grab hand only on a selected picture, as before
                const cursorClass = showBody ? Na__PageLayout__CursorClassFor(hoverResult) : '';
                if (cursorClass) canvas.classList.add(cursorClass); // <-- Apply cursor
                Na__PageLayout__SetHover(state, hoverResult, requestRedraw);
                return;
            }

            const mmPos = Na__PageLayout__ScreenToDocMm(screenX, screenY, state.canvasTransform);
            const dx    = mmPos.x - dragStartMm.x; // <-- Delta X in mm
            const dy    = mmPos.y - dragStartMm.y; // <-- Delta Y in mm

            // Active guide drag - move its margins
            // ------------------------------------------------------------
            if (Na__PageLayout__Guide__IsHandle(activeHandle)) {
                const paired = event.shiftKey === true || state.guide.pairEdges === true; // <-- Shift can be pressed mid-drag
                state.guide.dragPaired = paired;
                Na__PageLayout__Guide__Drag(state, activeHandle, dragStartMargins, dx, dy, paired);
                Na__PageLayout__Emit('guide', { dragging : true });
                requestRedraw();
                return;
            }

            // Active drag - move, scale or trim the picture
            // ------------------------------------------------------------
            Na__PageLayout__Handles__Drag(state, activeHandle, dragStartTransform, dx, dy, pcConfig);
            requestRedraw(); // <-- Trigger canvas redraw
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Handle Mouse Up (End Drag)
        // ------------------------------------------------------------
        const onMouseUp = (event) => {
            if (event.button !== 0) return; // <-- Only left-click

            if (isDragging) {
                const wasGuide = Na__PageLayout__Guide__IsHandle(activeHandle);
                isDragging   = false; // <-- Clear drag flag
                activeHandle = HANDLE_NONE; // <-- Clear active handle

                // Tell the page what changed
                // ------------------------------------------------------------
                if (wasGuide) {
                    const m     = state.guide.margins;
                    const moved = !dragStartMargins || ['top', 'right', 'bottom', 'left'].some((side) => m[side] !== dragStartMargins[side]);
                    state.guide.dragHandle = null;
                    state.guide.dragPaired = false;
                    Na__PageLayout__Emit('guide', { dragging : false });
                    if (moved) Na__PageLayout__Emit('changed', { what : 'guide' });
                } else {
                    const it    = state.imageTransform;
                    const keys  = ['x', 'y', 'width', 'height', 'clipTop', 'clipRight', 'clipBottom', 'clipLeft'];
                    const moved = keys.some((key) => (it[key] || 0) !== (dragStartTransform[key] || 0));
                    state.imageHandleDrag = null; // <-- The drag's numbers and the trim ghost go
                    if (moved) Na__PageLayout__Emit('changed', { what : 'image' });
                }

                // Reset cursor and label to the hover state
                // ------------------------------------------------------------
                Na__PageLayout__ClearCursorClasses(canvas); // <-- Clear drag cursor
                const rect    = canvas.getBoundingClientRect(); // <-- Canvas bounding rect
                const screenX = event.clientX - rect.left; // <-- Mouse position
                const screenY = event.clientY - rect.top; // <-- Mouse position
                const hoverResult = Na__PageLayout__PointerTarget(screenX, screenY, state, pcConfig, guideConfig.gripHitRadiusPx);
                const cursorClass = Na__PageLayout__CursorClassFor(hoverResult); // <-- Get cursor
                if (cursorClass) canvas.classList.add(cursorClass); // <-- Apply hover cursor
                state.imageHandleHover = event.target === canvas && Na__PageLayout__Handles__IsHandle(hoverResult) ? hoverResult : null;
                requestRedraw(); // <-- Hide the margin labels, or the drag's numbers
            }
        };
        // ------------------------------------------------------------


        // Bind event listeners
        // ------------------------------------------------------------
        canvas.addEventListener('mousedown', onMouseDown); // <-- Drag start
        window.addEventListener('mousemove', onMouseMove); // <-- Drag update (window for out-of-bounds)
        window.addEventListener('mouseup', onMouseUp); // <-- Drag end (window for out-of-bounds)
        canvas.addEventListener('mouseleave', () => {                       // <-- Off the canvas with no drag: no label left behind
            if (!isDragging) Na__PageLayout__SetHover(state, null, requestRedraw);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | PC Controls API
    // ------------------------------------------------------------
    export {
        Na__PageLayout__InitPcControls
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
