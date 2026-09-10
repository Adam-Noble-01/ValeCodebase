// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - SHEET TOOLS
// =============================================================================
//
// FILE       : Na__LayoutEditor__SheetTools__.js
// NAMESPACE  : Na__LeTools
// MODULE     : Layout Editor - Sheet Tools
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Select, move, resize, place text and dimensions on the paper with the left button and the keyboard
// CREATED    : 09-Sep-2026
//
// DESCRIPTION:
// - One pointer state machine over the stage: a press resolves what is
//   under the cursor (sheet markup first, then the selected viewport's
//   handles and border, then any viewport), a drag past a small threshold
//   moves or resizes it through the model in silent updates, and the
//   release announces the change once.
// - Tools: Select, Text (click places a text item and opens the inline
//   editor), Dimension (two clicks; Shift constrains to an axis; the
//   dimension joins the frontmost 2D viewport under it so it measures the
//   model at that scale).
// - Keys: Delete removes the selection (a viewport asks first), Escape
//   backs out, arrows nudge by a millimetre (ten with Shift), V T D pick a
//   tool. Nothing fires while typing in a field.
// - Read-only sessions (the web build) still select and inspect; every
//   mutation is gated on the editable flag.
//
// INTEGRATION:
// - Attached by the mode controller while the editor is on screen.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : ValeVision3D 35__System__PageLayoutSystem/Na__PageLayoutSystem__Controls__Pc__.js (pointer conventions)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5)
// - Parity        : new
// - Divergences   : n/a
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 10-Sep-2026 - Version 1.3.0
// - A drag moves a viewport at once; every handle crops or extends; double-click enters the content (drag repositions the drawing).
// - Locked viewports cannot be entered, moved, resized, nudged or deleted.
// - Right-click opens the context menu (edit content, recentre, lock, delete, undo, redo, zoom, snapping).
// - Ctrl+Z and Ctrl+Y through Na__LayoutEditor__History__.
//
// 10-Sep-2026 - Version 1.2.0
// - Dimension placement and endpoint drags snap to the linework through Na__LayoutEditor__Snapping__; F3 toggles it.
//
// 09-Sep-2026 - Version 1.0.0
// - Initial implementation for port Phase 5.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Config, Model, Surface, Handles, Markup, Viewports
    // ------------------------------------------------------------
    import {
        Na__LeCfg__GetTextSetup,
        Na__LeCfg__GetDimensionSetup,
        Na__LeCfg__GetLabel,
        Na__LeCfg__GetKeyboardSetup,
        Na__LeCfg__MatchKeyBinding,
        Na__LeCfg__GetGuards
    } from './Na__LayoutEditor__ConfigState__.js';
    import {
        Na__LeModel__KIND_2D,
        Na__LeModel__GetActiveSheet,
        Na__LeModel__GetLayers,
        Na__LeModel__GetViewportById,
        Na__LeModel__IsLayerVisible,
        Na__LeModel__IsLayerLocked,
        Na__LeModel__UpdateViewport,
        Na__LeModel__DeleteViewport,
        Na__LeModel__CreateAnnotation,
        Na__LeModel__UpdateAnnotation,
        Na__LeModel__DeleteAnnotation,
        Na__LeModel__CreateDimension,
        Na__LeModel__UpdateDimension,
        Na__LeModel__DeleteDimension,
        Na__LeModel__SetSelection,
        Na__LeModel__GetSelection
    } from './Na__LayoutEditor__SheetModel__.js';
    import {
        Na__LeSurface__ClientToPaperMm,
        Na__LeSurface__GetElements,
        Na__LeSurface__GetPixelsPerMm,
        Na__LeSurface__GetZoom,
        Na__LeSurface__Refresh,
        Na__LeSurface__GetEditingViewport,
        Na__LeSurface__SetEditingViewport
    } from './Na__LayoutEditor__SheetSurface__.js';
    import {
        Na__LeHandles__HitTest,
        Na__LeHandles__Contains,
        Na__LeHandles__CursorFor,
        Na__LeHandles__CaptureStart,
        Na__LeHandles__DragPatch
    } from './Na__LayoutEditor__ViewportHandles__.js';
    import { Na__LeMarkup__HitTest, Na__LeMarkup__AnnotationBounds, Na__LeMarkup__DimensionSkeleton } from './Na__LayoutEditor__MarkupBridge__.js';
    import { Na__LeVp2d__SetInteracting, Na__LeVp2d__CentreOnDrawing } from './Na__LayoutEditor__Viewport2d__.js';
    import { Na__LeVp3d__SetInteracting } from './Na__LayoutEditor__Viewport3d__.js';
    import { Na__LeOsnap__Snap, Na__LeOsnap__HideMarker, Na__LeOsnap__Toggle, Na__LeOsnap__IsEnabled } from './Na__LayoutEditor__Snapping__.js';
    import { Na__LeNav__Fit } from './Na__LayoutEditor__Navigation__.js';
    import { Na__LeHist__CanUndo, Na__LeHist__CanRedo, Na__LeHist__Undo, Na__LeHist__Redo } from './Na__LayoutEditor__History__.js';
    import { Na__LeMenu__Open, Na__LeMenu__Close } from './Na__LayoutEditor__ContextMenu__.js';
    import { Na__AppUtils__ConfirmDialog__Show } from '../03__AppUtils/Na__AppUtils__ConfirmDialog.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Tools, Events and Thresholds
    // ------------------------------------------------------------
    const Na__LeTools__TOOL_SELECT    = 'select';
    const Na__LeTools__TOOL_TEXT      = 'text';
    const Na__LeTools__TOOL_DIMENSION = 'dimension';
    const Na__LeTools__CHANGED_EVENT  = 'na-layouteditor-tool-changed';
    const Na__LeTools__DRAG_THRESHOLD_MM = 0.5;
    const Na__LeTools__HIT_TOLERANCE_MM  = 1.5;
    const Na__LeTools__MENU_SLOP_PX      = 4;      // <-- A right button that travelled further than this panned, so no menu
    // ------------------------------------------------------------

    // MODULE VARIABLES | Attachment and Interaction State
    // ------------------------------------------------------------
    let Na__LeTools__Stage     = null;
    let Na__LeTools__Handlers  = null;
    let Na__LeTools__Editable  = false;
    let Na__LeTools__Tool      = Na__LeTools__TOOL_SELECT;
    let Na__LeTools__Drag      = null;    // <-- { kind, id, hit, start, startMm, moved, pointerId, mode }
    let Na__LeTools__Suppressed = false;  // <-- Raised by the control modules while a navigation gesture owns the pointer
    let Na__LeTools__Placement = null;    // <-- { startMm } while a dimension waits for its second click
    let Na__LeTools__Preview   = null;    // <-- Rubber-band element for the dimension tool
    let Na__LeTools__Editor    = null;    // <-- { input, itemId }
    let Na__LeTools__RightPress = null;   // <-- { x, y } of the last right-button press
    let Na__LeTools__TextDefaults = null;
    let Na__LeTools__DimDefaults  = null;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Defaults and Tool State
// -----------------------------------------------------------------------------

    // FUNCTION | Settings Applied to New Text and New Dimensions (panels edit these)
    // ------------------------------------------------------------
    function Na__LeTools__GetTextDefaults() {
        if (!Na__LeTools__TextDefaults) {
            const s = Na__LeCfg__GetTextSetup();
            Na__LeTools__TextDefaults = { text : s.defaultText, sizeMm : s.defaultSizeMm, fontWeight : s.defaultWeight, colour : s.defaultColour, align : 'left', leader : false };
        }
        return Na__LeTools__TextDefaults;
    }
    function Na__LeTools__SetTextDefaults(patch) { Object.assign(Na__LeTools__GetTextDefaults(), patch || {}); }
    function Na__LeTools__GetDimensionDefaults() {
        if (!Na__LeTools__DimDefaults) {
            const s = Na__LeCfg__GetDimensionSetup();
            Na__LeTools__DimDefaults = { textSizeMm : s.defaultTextSizeMm, colour : s.defaultColour, terminator : s.defaultTerminator, offsetMm : s.defaultOffsetMm, precision : s.defaultPrecision, unitsSuffix : s.defaultUnits };
        }
        return Na__LeTools__DimDefaults;
    }
    function Na__LeTools__SetDimensionDefaults(patch) { Object.assign(Na__LeTools__GetDimensionDefaults(), patch || {}); }
    // ------------------------------------------------------------


    // FUNCTION | The Active Tool
    // ------------------------------------------------------------
    function Na__LeTools__SetTool(tool) {
        const next = [ Na__LeTools__TOOL_SELECT, Na__LeTools__TOOL_TEXT, Na__LeTools__TOOL_DIMENSION ].indexOf(tool) === -1 ? Na__LeTools__TOOL_SELECT : tool;
        if (!Na__LeTools__Editable && next !== Na__LeTools__TOOL_SELECT) return Na__LeTools__Tool;
        Na__LeTools__CancelPlacement();
        Na__LeTools__Tool = next;
        if (Na__LeTools__Stage) Na__LeTools__Stage.style.cursor = next === Na__LeTools__TOOL_SELECT ? '' : 'crosshair';
        window.dispatchEvent(new CustomEvent(Na__LeTools__CHANGED_EVENT, { detail : { tool : next } }));
        return next;
    }
    function Na__LeTools__GetTool() { return Na__LeTools__Tool; }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Hit Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Viewports Front to Back (top of the layer list first)
    // ------------------------------------------------------------
    function Na__LeTools__ViewportsFrontToBack(sheet) {
        const layers = Na__LeModel__GetLayers(sheet).map((l) => l.Layer__Id);
        return sheet.Sheet__Viewports.map((v, i) => ({ v : v, rank : layers.indexOf(v.Viewport__LayerId), i : i }))
            .filter((e) => Na__LeModel__IsLayerVisible(sheet, e.v.Viewport__LayerId))
            .sort((a, b) => (a.rank - b.rank) || (b.i - a.i))
            .map((e) => e.v);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | What the Select Tool Finds Under a Point
    // ------------------------------------------------------------
    // Returns { kind : 'annotation'|'dimension'|'viewport', id, hit } or null.
    // ------------------------------------------------------------
    function Na__LeTools__Resolve(sheet, pointMm) {
        const markup = Na__LeMarkup__HitTest(sheet, pointMm, Na__LeTools__HIT_TOLERANCE_MM / Na__LeSurface__GetZoom());
        if (markup) return { kind : markup.kind, id : markup.id, hit : null };
        const ppm  = Na__LeSurface__GetPixelsPerMm();
        const zoom = Na__LeSurface__GetZoom();
        const selection = Na__LeModel__GetSelection();
        const selected  = (selection && selection.kind === 'viewport') ? Na__LeModel__GetViewportById(sheet, selection.id) : null;
        if (selected && Na__LeModel__IsLayerVisible(sheet, selected.Viewport__LayerId)) {
            const hit = Na__LeHandles__HitTest(selected, pointMm, ppm, zoom, true);
            if (hit) return { kind : 'viewport', id : selected.Viewport__Id, hit : hit };
        }
        const ordered = Na__LeTools__ViewportsFrontToBack(sheet);
        for (let i = 0; i < ordered.length; i++) {
            if (Na__LeHandles__Contains(ordered[i], pointMm)) return { kind : 'viewport', id : ordered[i].Viewport__Id, hit : null };
        }
        return null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Which Part of a Dimension a Press Grabs
    // ------------------------------------------------------------
    function Na__LeTools__DimensionGrab(dim, pointMm) {
        const tol = Na__LeTools__HIT_TOLERANCE_MM / Na__LeSurface__GetZoom();
        if (Math.hypot(pointMm.x - dim.Dimension__StartXMm, pointMm.y - dim.Dimension__StartYMm) <= tol * 2) return 'start';
        if (Math.hypot(pointMm.x - dim.Dimension__EndXMm,   pointMm.y - dim.Dimension__EndYMm)   <= tol * 2) return 'end';
        const sk = Na__LeMarkup__DimensionSkeleton(dim);
        if (sk) {
            const abx = sk.DE.x - sk.DS.x, aby = sk.DE.y - sk.DS.y, len2 = (abx * abx) + (aby * aby);
            const t = len2 > 0 ? (((pointMm.x - sk.DS.x) * abx) + ((pointMm.y - sk.DS.y) * aby)) / len2 : 0;
            const cx = sk.DS.x + (abx * Math.max(0, Math.min(1, t))), cy = sk.DS.y + (aby * Math.max(0, Math.min(1, t)));
            if (Math.hypot(pointMm.x - cx, pointMm.y - cy) <= tol) return 'offset';
        }
        return 'whole';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pointer Handling
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Is the Event a Left Press on the Paper Area
    // ------------------------------------------------------------
    function Na__LeTools__IsLeft(event) { return event.button === 0 || (event.pointerType === 'touch'); }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Pointer Down
    // ------------------------------------------------------------
    function Na__LeTools__OnDown(event) {
        Na__LeMenu__Close();
        if (event.button === 2) { Na__LeTools__RightPress = { x : event.clientX, y : event.clientY }; return; }   // <-- Remembered so a right click that did not pan opens the menu
        if (Na__LeTools__Suppressed) return;                                 // <-- A pan or a pinch owns this pointer
        if (!Na__LeTools__IsLeft(event)) return;
        const sheet = Na__LeModel__GetActiveSheet();
        const point = Na__LeSurface__ClientToPaperMm(event.clientX, event.clientY);
        if (!sheet || !point) return;
        if (Na__LeTools__Editor) Na__LeTools__CommitTextEdit();

        if (Na__LeTools__Tool === Na__LeTools__TOOL_TEXT && Na__LeTools__Editable) { Na__LeTools__PlaceText(sheet, point); return; }
        if (Na__LeTools__Tool === Na__LeTools__TOOL_DIMENSION && Na__LeTools__Editable) { Na__LeTools__PlaceDimension(sheet, point, event.shiftKey); return; }

        const found     = Na__LeTools__Resolve(sheet, point);
        const editingId = Na__LeSurface__GetEditingViewport();
        if (editingId && (!found || found.kind !== 'viewport' || found.id !== editingId)) Na__LeSurface__SetEditingViewport(null);   // <-- A press anywhere else finishes content editing
        if (!found) { Na__LeModel__SetSelection(null); return; }
        const selection   = Na__LeModel__GetSelection();
        const wasSelected = !!selection && selection.kind === found.kind && selection.id === found.id;
        if (!wasSelected) Na__LeModel__SetSelection({ kind : found.kind, id : found.id });
        if (!Na__LeTools__Editable) return;

        // DRAG | Markup moves at once. So does a viewport, selected or not,
        // unless it is locked: its handles crop or extend the frame, and while
        // its content is being edited (double-click) a drag inside it moves
        // the drawing instead of the frame.
        let drag = null;
        if (found.kind === 'annotation') {
            const item = sheet.Sheet__Annotations.find((a) => a.Annotation__Id === found.id);
            if (item && !Na__LeModel__IsLayerLocked(sheet, item.Annotation__LayerId)) drag = { kind : 'annotation', id : found.id, start : { x : item.Annotation__PosXMm, y : item.Annotation__PosYMm } };
        } else if (found.kind === 'dimension') {
            const dim = sheet.Sheet__Dimensions.find((d) => d.Dimension__Id === found.id);
            if (dim && !Na__LeModel__IsLayerLocked(sheet, dim.Dimension__LayerId)) {
                drag = { kind : 'dimension', id : found.id, mode : Na__LeTools__DimensionGrab(dim, point),
                         start : { sx : dim.Dimension__StartXMm, sy : dim.Dimension__StartYMm, ex : dim.Dimension__EndXMm, ey : dim.Dimension__EndYMm, offset : dim.Dimension__OffsetMm } };
            }
        } else if (found.kind === 'viewport') {
            const viewport = Na__LeModel__GetViewportById(sheet, found.id);
            if (viewport && !Na__LeTools__IsViewportLocked(sheet, viewport)) {
                const editing = Na__LeSurface__GetEditingViewport() === found.id;
                const hit     = editing ? { mode : 'body' } : ((found.hit && found.hit.mode === 'handle') ? found.hit : { mode : 'border' });
                drag = { kind : 'viewport', id : found.id, hit : hit, start : Na__LeHandles__CaptureStart(viewport) };
            }
        }
        if (!drag) return;
        drag.startMm   = point;
        drag.moved     = false;
        drag.pointerId = event.pointerId;
        Na__LeTools__Drag = drag;
        Na__LeTools__Stage.setPointerCapture(event.pointerId);
        event.preventDefault();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Pointer Move: Drag or Hover Cursor
    // ------------------------------------------------------------
    function Na__LeTools__OnMove(event) {
        const sheet = Na__LeModel__GetActiveSheet();
        const point = Na__LeSurface__ClientToPaperMm(event.clientX, event.clientY);
        if (!sheet || !point) return;

        if (Na__LeTools__Placement) { Na__LeTools__DrawPreview(Na__LeTools__Placement.startMm, Na__LeTools__SnapOrConstrain(sheet, Na__LeTools__Placement.startMm, point, event.shiftKey)); return; }

        const drag = Na__LeTools__Drag;
        if (!drag || event.pointerId !== drag.pointerId) {
            if (Na__LeTools__Tool === Na__LeTools__TOOL_DIMENSION) { Na__LeOsnap__Snap(sheet, point); return; }   // <-- Marker before the first click
            if (Na__LeTools__Tool !== Na__LeTools__TOOL_SELECT) return;
            Na__LeTools__Stage.style.cursor = Na__LeTools__HoverCursor(sheet, Na__LeTools__Resolve(sheet, point));
            return;
        }
        const dMm = { x : point.x - drag.startMm.x, y : point.y - drag.startMm.y };
        if (!drag.moved) {
            if (Math.hypot(dMm.x, dMm.y) < Na__LeTools__DRAG_THRESHOLD_MM / Na__LeSurface__GetZoom()) return;
            drag.moved = true;
            Na__LeVp2d__SetInteracting(true);
            Na__LeVp3d__SetInteracting(true);
            document.body.classList.add('na-le-dragging');
        }
        Na__LeTools__ApplyDrag(sheet, drag, dMm, event.shiftKey);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply a Drag Delta Through the Model (silent)
    // ------------------------------------------------------------
    function Na__LeTools__ApplyDrag(sheet, drag, dMm, shift) {
        if (drag.kind === 'viewport') {
            const viewport = Na__LeModel__GetViewportById(sheet, drag.id);
            if (!viewport) return;
            const patch = Na__LeHandles__DragPatch(viewport, drag.hit, drag.start, dMm, { shift : shift });
            if (!patch) return;
            Na__LeModel__UpdateViewport(sheet, drag.id, patch, true);
            Na__LeSurface__Refresh('frames');
            return;
        }
        if (drag.kind === 'annotation') {
            Na__LeModel__UpdateAnnotation(sheet, drag.id, { posXMm : drag.start.x + dMm.x, posYMm : drag.start.y + dMm.y }, true);
            Na__LeSurface__Refresh('markup');
            return;
        }
        const s = drag.start;
        const d = shift ? (Math.abs(dMm.x) >= Math.abs(dMm.y) ? { x : dMm.x, y : 0 } : { x : 0, y : dMm.y }) : dMm;
        let patch = null;
        if (drag.mode === 'start' || drag.mode === 'end') {
            const snap = Na__LeOsnap__Snap(sheet, { x : drag.startMm.x + dMm.x, y : drag.startMm.y + dMm.y });   // <-- The grip jumps to a corner or a midpoint
            const px = snap.snapped ? snap.x : (drag.mode === 'start' ? s.sx : s.ex) + d.x;
            const py = snap.snapped ? snap.y : (drag.mode === 'start' ? s.sy : s.ey) + d.y;
            patch = drag.mode === 'start' ? { startXMm : px, startYMm : py } : { endXMm : px, endYMm : py };
        }
        else if (drag.mode === 'offset') {
            const len = Math.hypot(s.ex - s.sx, s.ey - s.sy) || 1;
            const perpX = -(s.ey - s.sy) / len, perpY = (s.ex - s.sx) / len;
            patch = { offsetMm : s.offset + ((dMm.x * perpX) + (dMm.y * perpY)) };
        } else patch = { startXMm : s.sx + d.x, startYMm : s.sy + d.y, endXMm : s.ex + d.x, endYMm : s.ey + d.y };
        Na__LeModel__UpdateDimension(sheet, drag.id, patch, true);
        Na__LeSurface__Refresh('markup');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Pointer Up: Announce the Change Once
    // ------------------------------------------------------------
    function Na__LeTools__OnUp(event) {
        const drag = Na__LeTools__Drag;
        if (!drag || event.pointerId !== drag.pointerId) return;
        Na__LeTools__FinishDrag(event.pointerId);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Close a Drag Down and Commit What It Moved
    // ------------------------------------------------------------
    // Shared by the pointer release and by the suppression flag, so a
    // navigation gesture that interrupts a drag still leaves the record
    // committed rather than half moved.
    function Na__LeTools__FinishDrag(pointerId) {
        Na__LeOsnap__HideMarker();
        const drag = Na__LeTools__Drag;
        if (!drag) return;
        if (pointerId !== null && pointerId !== undefined && Na__LeTools__Stage) {
            try { Na__LeTools__Stage.releasePointerCapture(pointerId); } catch (e) { /* already released */ }
        }
        Na__LeTools__Drag = null;
        document.body.classList.remove('na-le-dragging');
        if (!drag.moved) return;
        Na__LeVp2d__SetInteracting(false);
        Na__LeVp3d__SetInteracting(false);
        const sheet = Na__LeModel__GetActiveSheet();
        if (!sheet) return;
        if (drag.kind === 'viewport')        Na__LeModel__UpdateViewport(sheet, drag.id, {}, false);
        else if (drag.kind === 'annotation') Na__LeModel__UpdateAnnotation(sheet, drag.id, {}, false);
        else                                 Na__LeModel__UpdateDimension(sheet, drag.id, {}, false);
    }
    // ------------------------------------------------------------


    // FUNCTION | Hand the Pointer Over to a Navigation Gesture
    // ------------------------------------------------------------
    // The PC and touchscreen control modules raise this while a pan or a
    // pinch owns the pointer. Any drag in flight is finished first, so a
    // second finger landing on the stage can never leave a viewport stranded
    // half way through a move.
    function Na__LeTools__SetSuppressed(flag) {
        const next = !!flag;
        if (Na__LeTools__Suppressed === next) return;
        Na__LeTools__Suppressed = next;
        if (next) {
            Na__LeTools__FinishDrag(Na__LeTools__Drag ? Na__LeTools__Drag.pointerId : null);
            Na__LeTools__CancelPlacement();
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Double Click: Edit a Text Item, or Enter a Viewport's Content
    // ------------------------------------------------------------
    function Na__LeTools__OnDoubleClick(event) {
        if (!Na__LeTools__Editable || event.button !== 0) return;
        const sheet = Na__LeModel__GetActiveSheet();
        const point = Na__LeSurface__ClientToPaperMm(event.clientX, event.clientY);
        if (!sheet || !point) return;
        const markup = Na__LeMarkup__HitTest(sheet, point, Na__LeTools__HIT_TOLERANCE_MM / Na__LeSurface__GetZoom());
        if (markup) { if (markup.kind === 'annotation') Na__LeTools__BeginTextEdit(markup.id); return; }
        const found = Na__LeTools__Resolve(sheet, point);
        if (!found || found.kind !== 'viewport') return;
        event.preventDefault();
        Na__LeTools__SetEditingViewport(Na__LeSurface__GetEditingViewport() === found.id ? null : found.id);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Locks, Content Editing and the Context Menu
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Viewport Is Locked by Its Own Flag or by Its Layer
    // ------------------------------------------------------------
    function Na__LeTools__IsViewportLocked(sheet, viewport) {
        return !!viewport && (viewport.Viewport__Locked === true || Na__LeModel__IsLayerLocked(sheet, viewport.Viewport__LayerId));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Cursor for What Is Under the Pointer
    // ------------------------------------------------------------
    function Na__LeTools__HoverCursor(sheet, found) {
        if (!found) return '';
        if (found.kind !== 'viewport') return 'move';
        const viewport = Na__LeModel__GetViewportById(sheet, found.id);
        if (!viewport || !Na__LeTools__Editable || Na__LeTools__IsViewportLocked(sheet, viewport)) return 'default';
        if (Na__LeSurface__GetEditingViewport() === found.id) return 'grab';
        if (found.hit && found.hit.mode === 'handle') return Na__LeHandles__CursorFor(found.hit);
        return 'move';
    }
    // ------------------------------------------------------------


    // FUNCTION | Enter or Leave Content Editing on a Viewport (double-click)
    // ------------------------------------------------------------
    // While a viewport's content is being edited a drag inside it moves the
    // drawing (2D: the window pans; 3D: the picture slides) and the frame
    // stays where it is. Null leaves the mode.
    // ------------------------------------------------------------
    function Na__LeTools__SetEditingViewport(viewportId) {
        const sheet    = Na__LeModel__GetActiveSheet();
        const viewport = (sheet && viewportId) ? Na__LeModel__GetViewportById(sheet, viewportId) : null;
        if (viewport && (!Na__LeTools__Editable || Na__LeTools__IsViewportLocked(sheet, viewport))) return false;
        if (viewport) {
            const selection = Na__LeModel__GetSelection();
            if (!selection || selection.kind !== 'viewport' || selection.id !== viewportId) Na__LeModel__SetSelection({ kind : 'viewport', id : viewportId });
        }
        Na__LeSurface__SetEditingViewport(viewport ? viewportId : null);
        if (Na__LeTools__Stage) Na__LeTools__Stage.style.cursor = viewport ? 'grab' : '';
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Put the Drawing Back in the Middle of Its Frame
    // ------------------------------------------------------------
    function Na__LeTools__RecentreViewport(sheet, viewportId) {
        const viewport = Na__LeModel__GetViewportById(sheet, viewportId);
        if (!viewport || Na__LeTools__IsViewportLocked(sheet, viewport)) return false;
        if (viewport.Viewport__Kind === Na__LeModel__KIND_2D) Na__LeVp2d__CentreOnDrawing(sheet, viewport);
        else Na__LeModel__UpdateViewport(sheet, viewportId, { imageOffset : { X : 0, Y : 0 } }, true);
        return Na__LeModel__UpdateViewport(sheet, viewportId, {}, false);      // <-- One announcement: one history step
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Menu for What Was Right-Clicked
    // ------------------------------------------------------------
    function Na__LeTools__MenuItems(sheet, found) {
        const label   = (key, fallback) => Na__LeCfg__GetLabel(key, fallback);
        const remove  = (key, fallback) => ({ label : label(key, fallback), danger : true, onSelect : () => { void Na__LeTools__DeleteSelection(); } });
        const history = [
            { label : label('Undo', 'Undo'), disabled : !Na__LeHist__CanUndo(), onSelect : () => Na__LeHist__Undo() },
            { label : label('Redo', 'Redo'), disabled : !Na__LeHist__CanRedo(), onSelect : () => Na__LeHist__Redo() }
        ];
        if (!Na__LeTools__Editable) return [ { label : label('MenuZoomFit', 'Zoom to fit'), onSelect : () => Na__LeNav__Fit() } ];
        if (!found) {
            const snapping = Na__LeOsnap__IsEnabled();
            return [
                { label : label('MenuZoomFit', 'Zoom to fit'), onSelect : () => Na__LeNav__Fit() },
                { label : snapping ? label('MenuSnapOff', 'Snapping off') : label('MenuSnapOn', 'Snapping on'), checked : snapping, onSelect : () => Na__LeOsnap__Toggle() },
                { separator : true }
            ].concat(history);
        }
        if (found.kind === 'annotation') {
            return [ { label : label('MenuEditText', 'Edit text'), onSelect : () => Na__LeTools__BeginTextEdit(found.id) },
                     remove('MenuDeleteText', 'Delete text'), { separator : true } ].concat(history);
        }
        if (found.kind === 'dimension') return [ remove('MenuDeleteDimension', 'Delete dimension'), { separator : true } ].concat(history);

        const viewport = Na__LeModel__GetViewportById(sheet, found.id);
        if (!viewport) return history;
        const layerLocked = Na__LeModel__IsLayerLocked(sheet, viewport.Viewport__LayerId);
        const locked      = layerLocked || viewport.Viewport__Locked === true;
        const editing     = Na__LeSurface__GetEditingViewport() === found.id;
        const del         = remove('MenuDeleteViewport', 'Delete viewport');
        del.disabled = locked;
        return [
            { label : editing ? label('MenuFinishView', 'Finish editing content') : label('MenuEditView', 'Edit viewport content'), disabled : locked, onSelect : () => Na__LeTools__SetEditingViewport(editing ? null : found.id) },
            { label : label('MenuCentre', 'Recentre content'), disabled : locked, onSelect : () => Na__LeTools__RecentreViewport(sheet, found.id) },
            { label : viewport.Viewport__Locked === true ? label('MenuUnlock', 'Unlock viewport') : label('MenuLock', 'Lock viewport'), disabled : layerLocked, checked : viewport.Viewport__Locked === true,
              onSelect : () => Na__LeModel__UpdateViewport(sheet, found.id, { locked : viewport.Viewport__Locked !== true }) },
            { separator : true }, del, { separator : true }
        ].concat(history);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Right Click: Select What Is There and Open the Menu
    // ------------------------------------------------------------
    // The PC controls pan on a right drag, so the menu only opens when the
    // button came up where it went down. A touch long-press arrives here
    // with no press recorded and opens the menu too.
    // ------------------------------------------------------------
    function Na__LeTools__OnContextMenu(event) {
        const target = event.target;
        if (target && typeof target.closest === 'function' && target.closest(Na__LeCfg__GetGuards().contextMenuKeepSelector)) return;   // <-- The inline text field keeps the browser menu
        event.preventDefault();
        const press = Na__LeTools__RightPress;
        Na__LeTools__RightPress = null;
        if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > Na__LeTools__MENU_SLOP_PX) return;   // <-- That right button panned
        const sheet = Na__LeModel__GetActiveSheet();
        const point = Na__LeSurface__ClientToPaperMm(event.clientX, event.clientY);
        if (!sheet || !point) return;
        Na__LeTools__CancelPlacement();
        if (Na__LeTools__Editor) Na__LeTools__CommitTextEdit();
        const found = Na__LeTools__Resolve(sheet, point);
        Na__LeModel__SetSelection(found ? { kind : found.kind, id : found.id } : null);
        Na__LeMenu__Open(event.clientX, event.clientY, Na__LeTools__MenuItems(sheet, found));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Placement Tools
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Constrain a Second Point to an Axis When Shift Is Down
    // ------------------------------------------------------------
    function Na__LeTools__Constrain(start, point, shift) {
        if (!shift) return point;
        return Math.abs(point.x - start.x) >= Math.abs(point.y - start.y) ? { x : point.x, y : start.y } : { x : start.x, y : point.y };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Snap Beats the Axis Constraint, as in AutoCAD
    // ------------------------------------------------------------
    function Na__LeTools__SnapOrConstrain(sheet, start, point, shift) {
        const snap = Na__LeOsnap__Snap(sheet, point);
        if (snap.snapped) return { x : snap.x, y : snap.y };
        return Na__LeTools__Constrain(start, point, shift);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Place a Text Item and Start Editing It
    // ------------------------------------------------------------
    function Na__LeTools__PlaceText(sheet, point) {
        const d = Na__LeTools__GetTextDefaults();
        const item = Na__LeModel__CreateAnnotation(sheet, point.x, point.y + (d.sizeMm * 0.72), {
            text : d.text, sizeMm : d.sizeMm, fontWeight : d.fontWeight, colour : d.colour, align : d.align,
            leaderXMm : d.leader ? point.x - 15 : null, leaderYMm : d.leader ? point.y + 10 : null
        });
        if (!item) return;
        Na__LeModel__SetSelection({ kind : 'annotation', id : item.Annotation__Id });
        Na__LeTools__BeginTextEdit(item.Annotation__Id);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Two-Click Dimension Placement
    // ------------------------------------------------------------
    function Na__LeTools__PlaceDimension(sheet, point, shift) {
        if (!Na__LeTools__Placement) {
            const first = Na__LeOsnap__Snap(sheet, point);
            Na__LeTools__Placement = { startMm : { x : first.x, y : first.y } };
            Na__LeTools__DrawPreview(Na__LeTools__Placement.startMm, Na__LeTools__Placement.startMm);
            return;
        }
        const start = Na__LeTools__Placement.startMm;
        const end   = Na__LeTools__SnapOrConstrain(sheet, start, point, shift);
        Na__LeTools__CancelPlacement();
        if (Math.hypot(end.x - start.x, end.y - start.y) < Na__LeTools__DRAG_THRESHOLD_MM) return;
        const mid = { x : (start.x + end.x) / 2, y : (start.y + end.y) / 2 };
        const host = Na__LeTools__ViewportsFrontToBack(sheet).find((v) => v.Viewport__Kind === Na__LeModel__KIND_2D && Na__LeHandles__Contains(v, mid)) || null;
        const d = Na__LeTools__GetDimensionDefaults();
        const item = Na__LeModel__CreateDimension(sheet, start, end, {
            viewportId : host ? host.Viewport__Id : null, offsetMm : d.offsetMm, textSizeMm : d.textSizeMm,
            colour : d.colour, terminator : d.terminator, precision : d.precision, unitsSuffix : d.unitsSuffix
        });
        if (item) Na__LeModel__SetSelection({ kind : 'dimension', id : item.Dimension__Id });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Rubber Band for the Dimension Tool
    // ------------------------------------------------------------
    function Na__LeTools__DrawPreview(start, end) {
        const layer = Na__LeSurface__GetElements().handles;
        if (!layer) return;
        if (!Na__LeTools__Preview) {
            Na__LeTools__Preview = document.createElement('div');
            Na__LeTools__Preview.className = 'na-le-rubber-band';
        }
        if (!Na__LeTools__Preview.parentNode) layer.appendChild(Na__LeTools__Preview);
        const ppm = Na__LeSurface__GetPixelsPerMm();
        const len = Math.hypot(end.x - start.x, end.y - start.y);
        const ang = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);
        Na__LeTools__Preview.style.left      = (start.x * ppm) + 'px';
        Na__LeTools__Preview.style.top       = (start.y * ppm) + 'px';
        Na__LeTools__Preview.style.width     = (len * ppm) + 'px';
        Na__LeTools__Preview.style.transform = 'rotate(' + ang + 'deg)';
    }
    // ------------------------------------------------------------


    // FUNCTION | Abandon a Half-Placed Dimension
    // ------------------------------------------------------------
    function Na__LeTools__CancelPlacement() {
        Na__LeTools__Placement = null;
        Na__LeOsnap__HideMarker();
        if (Na__LeTools__Preview && Na__LeTools__Preview.parentNode) Na__LeTools__Preview.parentNode.removeChild(Na__LeTools__Preview);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Inline Text Editing
// -----------------------------------------------------------------------------

    // FUNCTION | Open a Field Over a Text Item
    // ------------------------------------------------------------
    function Na__LeTools__BeginTextEdit(itemId) {
        const sheet = Na__LeModel__GetActiveSheet();
        const layer = Na__LeSurface__GetElements().handles;
        const item  = sheet ? sheet.Sheet__Annotations.find((a) => a.Annotation__Id === itemId) : null;
        if (!item || !layer || !Na__LeTools__Editable) return false;
        Na__LeTools__CommitTextEdit();
        const ppm    = Na__LeSurface__GetPixelsPerMm();
        const bounds = Na__LeMarkup__AnnotationBounds(item);
        const input  = document.createElement('input');
        input.type      = 'text';
        input.className = 'na-le-text-editor';
        input.value     = item.Annotation__Text;
        input.style.left       = (bounds.X * ppm) + 'px';
        input.style.top        = (bounds.Y * ppm) + 'px';
        input.style.width      = (Math.max(bounds.WidthMm + 4, 30) * ppm) + 'px';
        input.style.fontSize   = (item.Annotation__SizeMm * ppm) + 'px';
        input.style.fontWeight = String(item.Annotation__FontWeight);
        input.style.color      = item.Annotation__Colour;
        input.style.textAlign  = item.Annotation__Align;
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter')  { e.preventDefault(); Na__LeTools__CommitTextEdit(); }
            if (e.key === 'Escape') { e.preventDefault(); Na__LeTools__CancelTextEdit(); }
            e.stopPropagation();
        });
        input.addEventListener('blur', () => Na__LeTools__CommitTextEdit());
        layer.appendChild(input);
        Na__LeTools__Editor = { input : input, itemId : itemId };
        input.focus();
        input.select();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Commit or Cancel the Open Field
    // ------------------------------------------------------------
    function Na__LeTools__CommitTextEdit() {
        const editor = Na__LeTools__Editor;
        if (!editor) return;
        Na__LeTools__Editor = null;
        const sheet = Na__LeModel__GetActiveSheet();
        const text  = editor.input.value.trim();
        if (editor.input.parentNode) editor.input.parentNode.removeChild(editor.input);
        if (!sheet) return;
        if (text === '') Na__LeModel__DeleteAnnotation(sheet, editor.itemId);              // <-- An emptied label is a deleted label
        else Na__LeModel__UpdateAnnotation(sheet, editor.itemId, { text : text }, false);
    }
    function Na__LeTools__CancelTextEdit() {
        const editor = Na__LeTools__Editor;
        if (!editor) return;
        Na__LeTools__Editor = null;
        if (editor.input.parentNode) editor.input.parentNode.removeChild(editor.input);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Keyboard
// -----------------------------------------------------------------------------

    // FUNCTION | Delete Whatever Is Selected (a viewport asks first)
    // ------------------------------------------------------------
    async function Na__LeTools__DeleteSelection() {
        const sheet = Na__LeModel__GetActiveSheet();
        const selection = Na__LeModel__GetSelection();
        if (!sheet || !selection || !Na__LeTools__Editable) return false;
        if (selection.kind === 'annotation') return Na__LeModel__DeleteAnnotation(sheet, selection.id);
        if (selection.kind === 'dimension')  return Na__LeModel__DeleteDimension(sheet, selection.id);
        const viewport = Na__LeModel__GetViewportById(sheet, selection.id);
        if (!viewport || Na__LeTools__IsViewportLocked(sheet, viewport)) return false;   // <-- Unlock first
        const ok = await Na__AppUtils__ConfirmDialog__Show({
            title : Na__LeCfg__GetLabel('DeleteViewportTitle', 'Delete viewport'),
            message : Na__LeCfg__GetLabel('DeleteViewportPrompt', 'Remove this viewport from the sheet? Sheet dimensions attached to it keep their paper length.'),
            confirmLabel : Na__LeCfg__GetLabel('DeleteLabel', 'Delete'), isDestructive : true
        });
        return ok ? Na__LeModel__DeleteViewport(sheet, selection.id) : false;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Nudge the Selection by a Millimetre Step
    // ------------------------------------------------------------
    function Na__LeTools__Nudge(dx, dy) {
        const sheet = Na__LeModel__GetActiveSheet();
        const selection = Na__LeModel__GetSelection();
        if (!sheet || !selection) return false;
        if (selection.kind === 'viewport') {
            const v = Na__LeModel__GetViewportById(sheet, selection.id);
            if (!v || Na__LeTools__IsViewportLocked(sheet, v)) return false;
            return Na__LeModel__UpdateViewport(sheet, selection.id, { rect : { X : v.Viewport__FrameMm.X + dx, Y : v.Viewport__FrameMm.Y + dy } }, false);
        }
        if (selection.kind === 'annotation') {
            const a = sheet.Sheet__Annotations.find((i) => i.Annotation__Id === selection.id);
            if (!a || Na__LeModel__IsLayerLocked(sheet, a.Annotation__LayerId)) return false;
            return Na__LeModel__UpdateAnnotation(sheet, selection.id, { posXMm : a.Annotation__PosXMm + dx, posYMm : a.Annotation__PosYMm + dy }, false);
        }
        const d = sheet.Sheet__Dimensions.find((i) => i.Dimension__Id === selection.id);
        if (!d || Na__LeModel__IsLayerLocked(sheet, d.Dimension__LayerId)) return false;
        return Na__LeModel__UpdateDimension(sheet, selection.id, { startXMm : d.Dimension__StartXMm + dx, startYMm : d.Dimension__StartYMm + dy, endXMm : d.Dimension__EndXMm + dx, endYMm : d.Dimension__EndYMm + dy }, false);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Key Handling While the Editor Is on Screen
    // ------------------------------------------------------------
    function Na__LeTools__OnKey(event) {
        const target = event.target;
        const typing = !!(target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable));
        const keys   = Na__LeCfg__GetKeyboardSetup();
        if (typing && keys.ignoreWhenTyping) return;

        // The binding, not the key, decides what happens. Navigation actions
        // are left alone here: the PC controls module owns those.
        const match = Na__LeCfg__MatchKeyBinding(event.key, {
            Ctrl : !!event.ctrlKey, Shift : !!event.shiftKey, Alt : !!event.altKey, Meta : !!event.metaKey, Space : false
        });
        if (!match || !match.action) return;
        const step = match.coarse ? keys.nudgeCoarseStepMm : keys.nudgeStepMm;

        switch (match.action) {
            case 'Edit__Cancel':
                if (Na__LeTools__Placement) Na__LeTools__CancelPlacement();
                else if (Na__LeSurface__GetEditingViewport()) Na__LeTools__SetEditingViewport(null);
                else if (Na__LeModel__GetSelection()) Na__LeModel__SetSelection(null);
                else Na__LeTools__SetTool(Na__LeTools__TOOL_SELECT);
                event.preventDefault(); return;
            case 'Edit__Delete':
                if (Na__LeModel__GetSelection()) { event.preventDefault(); void Na__LeTools__DeleteSelection(); }
                return;
            case 'Edit__NudgeLeft':  if (Na__LeTools__Editable && Na__LeTools__Nudge(-step, 0)) event.preventDefault(); return;
            case 'Edit__NudgeRight': if (Na__LeTools__Editable && Na__LeTools__Nudge(step, 0))  event.preventDefault(); return;
            case 'Edit__NudgeUp':    if (Na__LeTools__Editable && Na__LeTools__Nudge(0, -step)) event.preventDefault(); return;
            case 'Edit__NudgeDown':  if (Na__LeTools__Editable && Na__LeTools__Nudge(0, step))  event.preventDefault(); return;
            case 'Tool__Select':     Na__LeTools__SetTool(Na__LeTools__TOOL_SELECT);    return;
            case 'Tool__Text':       Na__LeTools__SetTool(Na__LeTools__TOOL_TEXT);      return;
            case 'Tool__Dimension':  Na__LeTools__SetTool(Na__LeTools__TOOL_DIMENSION); return;
            case 'Snap__Toggle':     Na__LeOsnap__Toggle(); event.preventDefault(); return;
            case 'Edit__Undo':       if (Na__LeTools__Editable) { event.preventDefault(); Na__LeHist__Undo(); } return;
            case 'Edit__Redo':       if (Na__LeTools__Editable) { event.preventDefault(); Na__LeHist__Redo(); } return;
            default: return;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Attach and Detach
// -----------------------------------------------------------------------------

    // FUNCTION | Listen on the Stage and the Keyboard
    // ------------------------------------------------------------
    function Na__LeTools__Attach(options) {
        const els = Na__LeSurface__GetElements();
        if (!els.stage) return false;
        Na__LeTools__Detach();
        Na__LeTools__Stage    = els.stage;
        Na__LeTools__Editable = !!(options && options.editable);
        Na__LeTools__Handlers = {
            pointerdown   : (e) => Na__LeTools__OnDown(e),
            pointermove   : (e) => Na__LeTools__OnMove(e),
            pointerup     : (e) => Na__LeTools__OnUp(e),
            pointercancel : (e) => Na__LeTools__OnUp(e),
            dblclick      : (e) => Na__LeTools__OnDoubleClick(e),
            contextmenu   : (e) => Na__LeTools__OnContextMenu(e),
            keydown       : (e) => Na__LeTools__OnKey(e)
        };
        [ 'pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'dblclick', 'contextmenu' ].forEach((name) => Na__LeTools__Stage.addEventListener(name, Na__LeTools__Handlers[name]));
        window.addEventListener('keydown', Na__LeTools__Handlers.keydown);
        Na__LeTools__SetTool(Na__LeTools__TOOL_SELECT);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Stop Listening and Drop Any Interaction
    // ------------------------------------------------------------
    function Na__LeTools__Detach() {
        Na__LeMenu__Close();
        Na__LeTools__RightPress = null;
        Na__LeTools__CancelTextEdit();
        Na__LeTools__CancelPlacement();
        if (!Na__LeTools__Stage || !Na__LeTools__Handlers) return;
        [ 'pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'dblclick', 'contextmenu' ].forEach((name) => Na__LeTools__Stage.removeEventListener(name, Na__LeTools__Handlers[name]));
        window.removeEventListener('keydown', Na__LeTools__Handlers.keydown);
        Na__LeTools__Stage.style.cursor = '';
        Na__LeTools__Suppressed = false;                                     // <-- Never leave the tools deaf for the next mount
        Na__LeTools__Stage = Na__LeTools__Handlers = Na__LeTools__Drag = null;
        document.body.classList.remove('na-le-dragging');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor Sheet Tools API
    // ------------------------------------------------------------
    export {
        Na__LeTools__TOOL_SELECT,
        Na__LeTools__TOOL_TEXT,
        Na__LeTools__TOOL_DIMENSION,
        Na__LeTools__CHANGED_EVENT,
        Na__LeTools__Attach,
        Na__LeTools__Detach,
        Na__LeTools__SetTool,
        Na__LeTools__GetTool,
        Na__LeTools__GetTextDefaults,
        Na__LeTools__SetTextDefaults,
        Na__LeTools__GetDimensionDefaults,
        Na__LeTools__SetDimensionDefaults,
        Na__LeTools__BeginTextEdit,
        Na__LeTools__DeleteSelection,
        Na__LeTools__SetEditingViewport,
        Na__LeTools__RecentreViewport,
        Na__LeTools__SetSuppressed
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
