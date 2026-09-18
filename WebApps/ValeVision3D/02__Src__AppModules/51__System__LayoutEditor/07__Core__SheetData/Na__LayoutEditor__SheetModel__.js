// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - SHEET MODEL
// =============================================================================
//
// FILE       : Na__LayoutEditor__SheetModel__.js
// NAMESPACE  : Na__LeModel
// MODULE     : Layout Editor - Sheet Model
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Own the sheet records, their layers, viewports, text and dimensions
// CREATED    : 09-Sep-2026
//
// DESCRIPTION:
// - The single owner of LayoutEditor__DrawingsData.__Sheets. Every other
//   Layout Editor module reads and writes sheets through here, and every
//   change is announced on one event so the surface and the panels redraw
//   from the records rather than from each other.
//
// - RECORDS (three-stage keys, plan section 5)
//     Sheet       Sheet__Id, Name, Order, PaperSize, Orientation,
//                 TitleBlockStyle, Fields {...}, Layers [], Viewports [],
//                 Annotations [], Dimensions [], Shapes [], Groups [],
//                 Lineweights {ViewportPt, DimensionPt}
//     Layer       Layer__Id, Name, Type, Visible, Locked, Order
//     Viewport    Viewport__Id, LayerId, Name, Kind ('2d' | '3d'), SceneId,
//                 DrawingId, FrameMm {X, Y, WidthMm, HeightMm},
//                 ScaleDenominator, PanMm {X, Y}, ImageMm {WidthMm, HeightMm},
//                 ImageOffsetMm {X, Y}, Styles {...}, ProjectedEdges {...} and
//                 CompositeWeights {...} (each null when none set), MarkupMode,
//                 Locked,
//                 SnapshotAsset {Asset__Path, Asset__Fingerprint, Asset__PixelWidth}
//     Annotation  Annotation__Id, LayerId, Text, PosXMm, PosYMm, SizeMm,
//                 FontWeight, Colour, Align, LeaderXMm, LeaderYMm,
//                 RotationDeg (degrees clockwise about PosXMm, PosYMm, wrapped
//                 into (-180, 180]; no key is level, and a turn back to level
//                 removes it)
//     Dimension   Dimension__Id, LayerId, ViewportId, StartXMm, StartYMm,
//                 EndXMm, EndYMm, OffsetMm, TextSizeMm, Colour, Terminator,
//                 TickLengthMm (how large the ticks, arrows or dots at each
//                 end are; no key draws at the config TickLengthMm),
//                 Precision, UnitsSuffix, OverrideText,
//                 Orientation ('aligned' | 'horizontal' | 'vertical')
//     Shape       Shape__Id, LayerId, Points [[x, y], ...], Closed, Stroked, StrokeColour,
//                 StrokePt, FillColour (null for none), Gradient (null for none;
//                 the shape is Na__LayoutEditor__GradientTool__'s), FillOpacity,
//                 StrokeOpacity (0 to 1)
//     Leader      Leader__Id, LayerId, Type ('text' | 'bubble'), TipXMm, TipYMm,
//                 AnchorXMm, AnchorYMm, Text, TextSizeMm, FontWeight, TextColour,
//                 LineColour, LinePt, LineStyle ('solid' | 'dashed'), LineOpacity,
//                 EndpointFilled, EndpointPt, EndpointSizeMm, BubbleSizeMm,
//                 BubbleEdgePt, FillColour (null for none), FillOpacity
//                 (drawn by Na__LayoutEditor__LeaderGeometry__)
//   Paper coordinates are millimetres from the sheet's top-left, y down.
//
// - The active sheet and the selection are session state, held in the State
//   unit so the panels and the surface agree on them. The selection is a
//   set of { kind, id } - one item, or several from a selection box or Shift
//   and Ctrl clicks; GetSelection reads it as the one item when there is
//   exactly one, which is all a properties panel can edit.
//
// - THE MODEL IS SPLIT INTO UNITS in this folder (line budget). This file
//   keeps the selection, the dirty flag, the browser draft restore, Save and
//   Initialize, and re-exports the rest from its units:
//   - Na__LayoutEditor__SheetModel__State__: the constants, the session state
//     (active sheet, selection, dirty flag), Dispatch, Touch, Array, Unselect
//     and the Assign accessors every other unit writes the state through.
//   - Na__LayoutEditor__SheetModel__Sheets__: sheets, title block fields and
//     the notes margin.
//   - Na__LayoutEditor__SheetModel__Layers__: layers.
//   - Na__LayoutEditor__SheetModel__DrawOrder__: item draw order (Arrange).
//   - Na__LayoutEditor__SheetModel__Viewports__: viewports and what they show.
//   - Na__LayoutEditor__SheetModel__TextAndDimensions__: text items and
//     dimensions.
//   - Na__LayoutEditor__SheetModel__Shapes__: vector shapes.
//   - Na__LayoutEditor__SheetModel__Leaders__: leaders and annotation bubbles.
//   - Na__LayoutEditor__SheetModel__Groups__: groups, the prune after a
//     delete, and DeleteItems (the multi-item delete).
//
// INTEGRATION:
// - Loads from Na__DrawView__ProjectData__ on its events; Save goes through
//   Na__DrawData__Save (D08).
// - Callers keep importing this file, which still exports every name it
//   always has; no other module imports a unit. The units never import this
//   file: they share the State unit and otherwise import downward only
//   (Layers and Groups sit below the item units), so the module graph has
//   no cycle.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : none (ValeVision original; Lantern Designer keeps one implicit sheet per lantern)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5)
// - Parity        : new
// - Divergences   : n/a
// - Back-port     : candidate.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 15-Sep-2026 - Version 1.16.0
// - Split into Na__LayoutEditor__SheetModel__State__.js,
//   Na__LayoutEditor__SheetModel__Sheets__.js,
//   Na__LayoutEditor__SheetModel__Layers__.js,
//   Na__LayoutEditor__SheetModel__DrawOrder__.js,
//   Na__LayoutEditor__SheetModel__Viewports__.js,
//   Na__LayoutEditor__SheetModel__TextAndDimensions__.js,
//   Na__LayoutEditor__SheetModel__Shapes__.js,
//   Na__LayoutEditor__SheetModel__Leaders__.js and
//   Na__LayoutEditor__SheetModel__Groups__.js to stay under the line budget.
//   No behaviour change: the code moved verbatim and every export is
//   unchanged.
// - An imported let cannot be assigned, so a moved line that set the active
//   sheet, the selection or the dirty flag now calls the State unit's
//   AssignActiveSheetId, AssignSelectionItems or AssignDirty instead.
//
// 15-Sep-2026 - Version 1.15.0
// - Rotated text: CreateAnnotation and UpdateAnnotation take rotationDeg,
//   stored as Annotation__RotationDeg - degrees clockwise about the anchor,
//   wrapped into (-180, 180] and kept to a thousandth of a degree. Level text
//   carries no key, so every record from before draws and saves exactly as
//   it did.
// - Ported from TrueVision3D v2.52.0 (SheetModel 1.24.0).
//
// 14-Sep-2026 - Version 1.14.0
// - UpdateViewport takes imageZoom: a 3D viewport's picture zoom
//   (Viewport__ImageZoom), which the normaliser clamps.
// - Ported from TrueVision3D (SheetModel 1.23.0, v2.50.0).
//
// 14-Sep-2026 - Version 1.13.0
// - CreateShape and UpdateShape carry Shape__LineStyle (the dash key: an
//   object or null). Null is a solid edge; the normaliser copies a fresh
//   object so the caller's is never shared.
// - Ported from TrueVision3D (SheetModel dashed edges).
//
// 14-Sep-2026 - Version 1.12.0
// - Arrange: CanArrange and Arrange move a vector, a text item, a dimension
//   or a leader one step (forward / backward) or to the end of its layer
//   (front / back) in its collection. Later in the array draws on top, so
//   later hit-tests first. Same-kind, same-layer peers only; a locked layer
//   refuses. Viewports stack by layer, not here. One announcement, so one
//   undo step.
// - Ported from TrueVision3D (SheetModel 1.22.0).
//
// 14-Sep-2026 - Version 1.11.0
// - Groups: GetGroupById, InsertGroup, DeleteGroup, GetGroups. A group is a
//   list of member { kind, id } (vectors, text, nested groups). InsertShape
//   and InsertAnnotation take silent so a paste of several items announces
//   once. DeleteItems also removes groups and drops deleted members from any
//   group that held them. Announced as 'groups'.
// - Ported from TrueVision3D (SheetModel 1.18.0).
//
// 14-Sep-2026 - Version 1.10.0
// - CreateDimension and UpdateDimension carry textDXMm and textDYMm:
//   Dimension__TextDXMm and Dimension__TextDYMm, the value's paper offset
//   from its un-dragged place. The normaliser keeps them only while they
//   shift the value, so a record that never had them is unchanged and the
//   value sits on the line as it always did.
// - Ported from TrueVision3D (SheetModel 1.17.0).
//
// 14-Sep-2026 - Version 1.9.0
// - GetShapeById, InsertShape and InsertViewport: a complete viewport or
//   vector record lands with a fresh id and one announcement, so a paste
//   or a duplicate is one undo step.
// - Ported from TrueVision3D v2.44.0.
//
// 14-Sep-2026 - Version 1.8.0
// - CreateDimension and UpdateDimension carry tickLengthMm:
//   Dimension__TickLengthMm, how large the ticks, arrows or dots at each end
//   are (the Dimensions panel's Size mm). The normaliser keeps a length only
//   when there is one, so a record that never had it is unchanged and draws
//   at the config TickLengthMm.
// - Ported from TrueVision3D v2.43.0.
//
// 14-Sep-2026 - Version 1.7.0
// - Box select: the selection is a set - SetSelectionItems, GetSelectionItems,
//   IsSelected, and Unselect for the deletes. GetSelection still answers
//   { kind, id } for exactly one item and null for none or several, so every
//   single-item reader is unchanged; SetSelection sets a set of one.
// - DeleteItems removes any mix of viewports, text, dimensions, shapes and
//   leaders in one pass, with one announcement per collection touched: one
//   undo step for a multi-selection delete (Na__LayoutEditor__SelectionSet__).
// - Ported from TrueVision3D v2.34.0.
//
// 14-Sep-2026 - Version 1.6.0
// - Leaders & Annotation Bubbles: GetLeaders, CreateLeader, UpdateLeader and
//   DeleteLeader, announced as 'leaders' (the collection) and 'leader' (one
//   item). New sheets carry Sheet__Leaders; deleting a layer moves its leaders
//   to the default text layer.
// - CreateShape and UpdateShape carry Shape__FillOpacity and
//   Shape__StrokeOpacity (the fillOpacity and strokeOpacity keys, 0 to 1).
// - Ported from TrueVision3D v2.35.0.
//
// 13-Sep-2026 - Version 1.5.0
// - UpdateViewport takes projectedEdges: merged one category at a time, a null
//   value clears that category, and the change is stamped in Edges__UpdatedIso.
//   Ported from TrueVision3D (Edge Styles).
//
// 13-Sep-2026 - Version 1.4.0
// - CreateDimension and UpdateDimension carry Dimension__Orientation (the
//   orientation key: 'aligned', 'horizontal' or 'vertical') for the Dimension
//   tool's Shift ortho. The normaliser makes anything else aligned. Ported from
//   TrueVision3D v2.31.0.
//
// 13-Sep-2026 - Version 1.3.0
// - UpdateViewport takes compositeWeights: merged one weight at a time, clamped
//   to the Render Composites config, and a null value clears that weight.
//   Ported from TrueVision.
//
// 13-Sep-2026 - Version 1.2.2
// - CreateShape and UpdateShape carry Shape__Gradient (the gradient key: an
//   object, or null to clear it). The normaliser copies it, so no two shapes
//   ever share one. Ported from TrueVision.
//
// 10-Sep-2026 - Version 1.2.1
// - CreateShape and UpdateShape carry Shape__Stroked (the edges toggle).
//
// 10-Sep-2026 - Version 1.2.0
// - Vector shapes: CreateShape, UpdateShape, DeleteShape ('shapes' and 'shape' reasons). CreateDimension takes silent. UpdateSheet takes lineweights.
//
// 10-Sep-2026 - Version 1.1.0
// - Viewport__Locked patch key. A save announces 'saved' instead of 'loaded', so the selection and the undo history survive it.
// - RestoreSheets puts the browser draft back after a load.
//
// 10-Sep-2026 - Version 1.0.1
// - Record helpers, normalisers and the title block fields moved to Na__LayoutEditor__SheetRecords__.js (line budget).
// 09-Sep-2026 - Version 1.0.0
// - Initial implementation for port Phase 5.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Drawings Block: Save and the Load Events
    // ------------------------------------------------------------
    import {
        Na__DrawData__Save,
        Na__DrawData__LOADED_EVENT,
        Na__DrawData__CHANGED_EVENT
    } from '../../42__System__DrawingViewCore/Na__DrawView__ProjectData__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Constants (re-exported below), Session State and Helpers
    // ------------------------------------------------------------
    import {
        Na__LeModel__CHANGED_EVENT,
        Na__LeModel__KIND_2D,
        Na__LeModel__KIND_3D,
        Na__LeModel__LAYER_TYPES,
        Na__LeModel__ActiveSheetId,
        Na__LeModel__SelectionItems,
        Na__LeModel__Dirty,
        Na__LeModel__Dispatch,
        Na__LeModel__Array,
        Na__LeModel__AssignActiveSheetId,
        Na__LeModel__AssignSelectionItems,
        Na__LeModel__AssignDirty
    } from './Na__LayoutEditor__SheetModel__State__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Sheets, Layers, Draw Order and Viewports (re-exported below)
    // ------------------------------------------------------------
    import {
        Na__LeModel__GetSheets,
        Na__LeModel__GetSheetById,
        Na__LeModel__GetActiveSheet,
        Na__LeModel__SetActiveSheetId,
        Na__LeModel__CreateSheet,
        Na__LeModel__DuplicateSheet,
        Na__LeModel__DeleteSheet,
        Na__LeModel__UpdateSheet,
        Na__LeModel__ReorderSheet,
        Na__LeModel__GetFields,
        Na__LeModel__UpdateMarginNotes,
        Na__LeModel__SetField
    } from './Na__LayoutEditor__SheetModel__Sheets__.js';
    import {
        Na__LeModel__GetLayers,
        Na__LeModel__GetLayerById,
        Na__LeModel__DefaultLayerId,
        Na__LeModel__CreateLayer,
        Na__LeModel__DeleteLayer,
        Na__LeModel__UpdateLayer,
        Na__LeModel__ReorderLayer,
        Na__LeModel__IsLayerVisible,
        Na__LeModel__IsLayerLocked
    } from './Na__LayoutEditor__SheetModel__Layers__.js';
    import { Na__LeModel__CanArrange, Na__LeModel__Arrange } from './Na__LayoutEditor__SheetModel__DrawOrder__.js';
    import {
        Na__LeModel__GetViewports,
        Na__LeModel__GetViewportById,
        Na__LeModel__CreateViewport,
        Na__LeModel__InsertViewport,
        Na__LeModel__DeleteViewport,
        Na__LeModel__UpdateViewport,
        Na__LeModel__ResolveViewportSource
    } from './Na__LayoutEditor__SheetModel__Viewports__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Text, Dimensions, Shapes, Leaders and Groups (re-exported below)
    // ------------------------------------------------------------
    import {
        Na__LeModel__GetAnnotations,
        Na__LeModel__GetAnnotationById,
        Na__LeModel__GetDimensions,
        Na__LeModel__CreateAnnotation,
        Na__LeModel__InsertAnnotation,
        Na__LeModel__UpdateAnnotation,
        Na__LeModel__DeleteAnnotation,
        Na__LeModel__CreateDimension,
        Na__LeModel__UpdateDimension,
        Na__LeModel__DeleteDimension
    } from './Na__LayoutEditor__SheetModel__TextAndDimensions__.js';
    import {
        Na__LeModel__GetShapeById,
        Na__LeModel__CreateShape,
        Na__LeModel__InsertShape,
        Na__LeModel__UpdateShape,
        Na__LeModel__DeleteShape
    } from './Na__LayoutEditor__SheetModel__Shapes__.js';
    import {
        Na__LeModel__GetLeaders,
        Na__LeModel__GetLeaderById,
        Na__LeModel__CreateLeader,
        Na__LeModel__InsertLeader,
        Na__LeModel__UpdateLeader,
        Na__LeModel__DeleteLeader
    } from './Na__LayoutEditor__SheetModel__Leaders__.js';
    import {
        Na__LeModel__GetGroups,
        Na__LeModel__GetGroupById,
        Na__LeModel__InsertGroup,
        Na__LeModel__DeleteGroup,
        Na__LeModel__DeleteItems
    } from './Na__LayoutEditor__SheetModel__Groups__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Initialization Guard (the session state is the State unit's)
    // ------------------------------------------------------------
    let Na__LeModel__Initialized   = false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Selection, Persistence and Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Select One Item on the Sheet (null clears)
    // ------------------------------------------------------------
    function Na__LeModel__SetSelection(selection) {
        const items = Na__LeModel__SetSelectionItems((selection && selection.kind && selection.id) ? [ selection ] : []);
        return items.length === 1 ? items[0] : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The One Selected Item (null when nothing is selected, or several are)
    // ------------------------------------------------------------
    // A properties panel edits one record, so it asks this. With several items
    // selected it sees none and shows its settings for new objects, rather than
    // quietly editing whichever item happened to be picked last.
    // ------------------------------------------------------------
    function Na__LeModel__GetSelection() {
        return Na__LeModel__SelectionItems.length === 1 ? Na__LeModel__SelectionItems[0] : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Select Any Number of Items (an empty list clears)
    // ------------------------------------------------------------
    // items: [{ kind, id }]. Duplicates are dropped and the order is kept. One
    // 'selection' announcement, and none when the set is the same as before.
    // ------------------------------------------------------------
    function Na__LeModel__SetSelectionItems(items) {
        const seen = new Set();
        const next = [];
        (Array.isArray(items) ? items : []).forEach((item) => {
            if (!item || !item.kind || !item.id || seen.has(item.kind + ':' + item.id)) return;
            seen.add(item.kind + ':' + item.id);
            next.push({ kind : item.kind, id : item.id });
        });
        const same = next.length === Na__LeModel__SelectionItems.length && Na__LeModel__SelectionItems.every((item) => seen.has(item.kind + ':' + item.id));
        Na__LeModel__AssignSelectionItems(next);
        if (!same) Na__LeModel__Dispatch('selection', Na__LeModel__ActiveSheetId, next.length === 1 ? next[0].id : null);
        return next.slice();
    }
    // ------------------------------------------------------------


    // FUNCTION | Every Selected Item, and Whether an Item Is One of Them
    // ------------------------------------------------------------
    function Na__LeModel__GetSelectionItems() { return Na__LeModel__SelectionItems.slice(); }
    function Na__LeModel__IsSelected(kind, id) { return Na__LeModel__SelectionItems.some((item) => item.kind === kind && item.id === id); }
    // ------------------------------------------------------------


    // FUNCTION | The Selected Viewport Record (null when the selection is something else, or several items)
    // ------------------------------------------------------------
    function Na__LeModel__GetSelectedViewport() {
        const sheet     = Na__LeModel__GetActiveSheet();
        const selection = Na__LeModel__GetSelection();
        if (!sheet || !selection || selection.kind !== 'viewport') return null;
        return Na__LeModel__GetViewportById(sheet, selection.id);
    }
    // ------------------------------------------------------------


    // FUNCTION | Unsaved Changes?
    // ------------------------------------------------------------
    function Na__LeModel__IsDirty() { return Na__LeModel__Dirty; }
    function Na__LeModel__MarkDirty() { Na__LeModel__AssignDirty(true); }
    // ------------------------------------------------------------


    // FUNCTION | Put a Whole Sheet List Back (the browser draft after a load)
    // ------------------------------------------------------------
    // Replaces the live array's contents in place so the drawings block
    // still owns it, normalises every record, keeps the active sheet when
    // it survives, marks the model dirty and announces a load.
    // ------------------------------------------------------------
    function Na__LeModel__RestoreSheets(records) {
        if (!Array.isArray(records)) return false;
        const live = Na__LeModel__Array();
        live.length = 0;
        records.forEach((record) => { if (record && typeof record === 'object') live.push(JSON.parse(JSON.stringify(record))); });
        Na__LeModel__GetSheets();                                                // <-- Normalises what arrived
        if (Na__LeModel__ActiveSheetId && !Na__LeModel__GetSheetById(Na__LeModel__ActiveSheetId)) Na__LeModel__AssignActiveSheetId(null);
        Na__LeModel__AssignSelectionItems([]);
        Na__LeModel__AssignDirty(true);
        Na__LeModel__Dispatch('loaded', Na__LeModel__ActiveSheetId);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Save the Drawings Block (sheets ride with plans and elevations)
    // ------------------------------------------------------------
    async function Na__LeModel__Save(showToast) {
        const saved = await Na__DrawData__Save(showToast);
        if (saved) Na__LeModel__AssignDirty(false);
        return saved;
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize: Follow the Drawings Block Across Project Loads
    // ------------------------------------------------------------
    function Na__LeModel__Initialize() {
        if (Na__LeModel__Initialized) return true;
        Na__LeModel__Initialized = true;
        const reload = (event) => {
            const saved = !!(event && event.detail && event.detail.reason === 'saved');
            Na__LeModel__AssignDirty(false);
            if (Na__LeModel__ActiveSheetId && !Na__LeModel__GetSheetById(Na__LeModel__ActiveSheetId)) Na__LeModel__AssignActiveSheetId(null);
            if (saved) { Na__LeModel__Dispatch('saved', Na__LeModel__ActiveSheetId); return; }   // <-- The same records, now on disk: selection and undo history stay
            Na__LeModel__AssignSelectionItems([]);
            Na__LeModel__Dispatch('loaded', Na__LeModel__ActiveSheetId);
        };
        window.addEventListener(Na__DrawData__LOADED_EVENT,  reload);
        window.addEventListener(Na__DrawData__CHANGED_EVENT, reload);
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor Sheet Model API
    // ------------------------------------------------------------
    export {
        Na__LeModel__CHANGED_EVENT,
        Na__LeModel__KIND_2D,
        Na__LeModel__KIND_3D,
        Na__LeModel__LAYER_TYPES,
        Na__LeModel__Initialize,
        Na__LeModel__GetSheets,
        Na__LeModel__GetSheetById,
        Na__LeModel__GetActiveSheet,
        Na__LeModel__SetActiveSheetId,
        Na__LeModel__CreateSheet,
        Na__LeModel__DuplicateSheet,
        Na__LeModel__DeleteSheet,
        Na__LeModel__UpdateSheet,
        Na__LeModel__ReorderSheet,
        Na__LeModel__GetFields,
        Na__LeModel__UpdateMarginNotes,
        Na__LeModel__SetField,
        Na__LeModel__GetLayers,
        Na__LeModel__GetLayerById,
        Na__LeModel__DefaultLayerId,
        Na__LeModel__CreateLayer,
        Na__LeModel__DeleteLayer,
        Na__LeModel__UpdateLayer,
        Na__LeModel__ReorderLayer,
        Na__LeModel__IsLayerVisible,
        Na__LeModel__IsLayerLocked,
        Na__LeModel__CanArrange,
        Na__LeModel__Arrange,
        Na__LeModel__GetViewports,
        Na__LeModel__GetViewportById,
        Na__LeModel__CreateViewport,
        Na__LeModel__InsertViewport,
        Na__LeModel__DeleteViewport,
        Na__LeModel__UpdateViewport,
        Na__LeModel__ResolveViewportSource,
        Na__LeModel__GetAnnotations,
        Na__LeModel__GetAnnotationById,
        Na__LeModel__GetDimensions,
        Na__LeModel__CreateAnnotation,
        Na__LeModel__InsertAnnotation,
        Na__LeModel__UpdateAnnotation,
        Na__LeModel__DeleteAnnotation,
        Na__LeModel__CreateDimension,
        Na__LeModel__UpdateDimension,
        Na__LeModel__DeleteDimension,
        Na__LeModel__GetShapeById,
        Na__LeModel__CreateShape,
        Na__LeModel__InsertShape,
        Na__LeModel__UpdateShape,
        Na__LeModel__DeleteShape,
        Na__LeModel__GetLeaders,
        Na__LeModel__GetLeaderById,
        Na__LeModel__CreateLeader,
        Na__LeModel__InsertLeader,
        Na__LeModel__UpdateLeader,
        Na__LeModel__DeleteLeader,
        Na__LeModel__GetGroups,
        Na__LeModel__GetGroupById,
        Na__LeModel__InsertGroup,
        Na__LeModel__DeleteGroup,
        Na__LeModel__SetSelection,
        Na__LeModel__GetSelection,
        Na__LeModel__SetSelectionItems,
        Na__LeModel__GetSelectionItems,
        Na__LeModel__IsSelected,
        Na__LeModel__DeleteItems,
        Na__LeModel__GetSelectedViewport,
        Na__LeModel__IsDirty,
        Na__LeModel__MarkDirty,
        Na__LeModel__RestoreSheets,
        Na__LeModel__Save
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
