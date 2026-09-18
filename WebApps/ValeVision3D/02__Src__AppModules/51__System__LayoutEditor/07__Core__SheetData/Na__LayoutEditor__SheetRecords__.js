// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - SHEET RECORDS
// =============================================================================
//
// FILE       : Na__LayoutEditor__SheetRecords__.js
// NAMESPACE  : Na__LeRec
// MODULE     : Layout Editor - Sheet Records
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The shape of every sheet record: kinds, ids, defaults, normalisation and the title block fields
// CREATED    : 10-Sep-2026
//
// DESCRIPTION:
// - Pure record arithmetic split out of the sheet model so the model keeps
//   to the house line budget: id generation, number coercion, the
//   normalisers that fill a sheet, layer, viewport, annotation or
//   dimension record with its defaults, the default layer of a kind, and
//   the title block fields with the project defaults filled in.
// - Nothing here dispatches, touches session state or knows the DOM.
//
// INTEGRATION:
// - Imported by Na__LayoutEditor__SheetModel__.js, which re-exports the
//   kind and type constants under its own names.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : none (split of Na__LayoutEditor__SheetModel__.js 1.0.0)
// - Ported on     : 10-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5)
// - Parity        : new
// - Divergences   : n/a
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 14-Sep-2026 - Version 1.12.0
// - Viewport__ImageZoom on the viewport record: how large a 3D viewport's
//   picture is drawn, as a multiple of Viewport__ImageMm. Held inside the
//   Viewport setup's ImageZoomMin and ImageZoomMax, and stored only when it is
//   not 1, so every record from before it is exactly what it was.
// - Ported from TrueVision3D (SheetRecords 1.19.0, v2.50.0).
//
// 14-Sep-2026 - Version 1.11.0
// - NormaliseMarginNotes migrates a stored body of 2.2 mm (the old default)
//   or about 9 pt to the config TextSizeMm (2 mm).
// - Ported from TrueVision3D (SheetRecords margin notes size).
//
// 14-Sep-2026 - Version 1.10.0
// - Shape__LineStyle on the shape record: null for a solid edge, otherwise
//   kind, scale and paper-millimetre sections. Normalise always returns a
//   fresh object or null, so a record from before the toggle stays solid
//   and two shapes never share a line style.
// - Ported from TrueVision3D (SheetRecords dashed edges).
//
// 14-Sep-2026 - Version 1.9.0
// - Sheet__Groups on every sheet, and NormaliseGroup: a group is an id and a
//   list of { kind, id } members (vectors, text, nested groups). Older sheets
//   get an empty list. Ported from TrueVision3D (SheetRecords 1.13.0).
//
// 14-Sep-2026 - Version 1.8.0
// - Dimension__TextDXMm and Dimension__TextDYMm on the dimension record: the
//   value's paper offset from where it would have sat on the line. Kept only
//   as a finite pair that actually shifts the value; the normaliser removes
//   both when they are missing, not numbers, or both zero, so a record from
//   before them stays exactly what it was and the value sits on the line.
// - Ported from TrueVision3D (SheetRecords 1.12.0).
//
// 14-Sep-2026 - Version 1.7.0
// - Dimension__TickLengthMm on the dimension record: how large the ticks,
//   arrows or dots at each end are, in paper millimetres. Kept only as a
//   number above zero, clamped to the config min and max; the normaliser
//   removes anything else and never adds the key, so a record from before it
//   stays exactly what it was and draws at TickLengthMm from the config.
// - Ported from TrueVision3D v2.43.0.
//
// 14-Sep-2026 - Version 1.6.0
// - Leaders & Annotation Bubbles: Sheet__Leaders on every sheet, and
//   NormaliseLeader, which fills a leader with the Leader setup's defaults
//   (Na__LayoutEditor__LeaderGeometry__ draws it). A stored null fill is kept
//   as "no fill"; only a fill that was never written takes the default.
// - Shape__FillOpacity and Shape__StrokeOpacity on the shape record, 0 to 1.
//   Every record from before them is solid.
// - Ported from TrueVision3D v2.35.0.
//
// 13-Sep-2026 - Version 1.5.0
// - Viewport__ProjectedEdges on the viewport record: only the categories whose
//   projected linework a person restyled, each written out in full, pruned
//   back to nothing once an entry returns to its default - and the prune waits
//   for the configs, so a deliberate choice is never dropped against a built-in
//   fallback. Null when there is nothing to keep. Ported from TrueVision3D (Edge Styles).
//
// 13-Sep-2026 - Version 1.4.0
// - Dimension__Orientation on the dimension record: 'aligned', 'horizontal' or
//   'vertical' (Na__LayoutEditor__DimensionGeometry__). Anything else - every
//   record from before ortho dimensions - is aligned, which is how it was drawn.
//   Ported from TrueVision3D v2.31.0; the field is shared with TrueVision.
//
// 13-Sep-2026 - Version 1.3.0
// - Viewport__CompositeWeights on the viewport record: only the Render Composites
//   weights a viewport has been given, clamped to the config's bounds, null when
//   there are none. Ported from TrueVision.
//
// 13-Sep-2026 - Version 1.2.0
// - Shape__Gradient on the shape record: null for none, otherwise made whole by
//   Na__LayoutEditor__GradientTool__ as a fresh object on every normalise. A
//   gradient counts as the fill in the guard that keeps a shape visible. Ported
//   from TrueVision.
//
// 10-Sep-2026 - Version 1.1.4
// - Shape__Stroked on the shape record, defaulting on, with the guard that
//   a shape with no fill keeps its edges.
//
// 10-Sep-2026 - Version 1.1.3
// - The contextLayer style (the existing building and its surroundings in a viewport's render).
//
// 10-Sep-2026 - Version 1.1.2
// - The baseImage style (the rendered picture behind a viewport).
//
// 10-Sep-2026 - Version 1.1.1
// - The snapshot asset carries Asset__PixelWidth (null when unknown).
//
// 10-Sep-2026 - Version 1.1.0
// - Vector shapes (Sheet__Shapes, layer type 'vector', a Vectors layer on new sheets), Sheet__Lineweights in points, the enhanceWhitecard style.
//
// 10-Sep-2026 - Version 1.0.1
// - New viewport style toggles come from LayoutEditor__Viewport__DefaultStyles (projected linework off until asked for).
//
// 10-Sep-2026 - Version 1.0.0
// - Split from the sheet model (record helpers, normalisers, fields).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Config, Scale, Project Code and Scenes
    // ------------------------------------------------------------
    import {
        Na__LeCfg__GetSheetSetup,
        Na__LeCfg__GetTitleBlockSetup,
        Na__LeCfg__GetViewportSetup,
        Na__LeCfg__GetTextSetup,
        Na__LeCfg__GetDimensionSetup,
        Na__LeCfg__FormatLabel,
        Na__LeCfg__GetLineweightSetup,
        Na__LeCfg__GetShapeSetup,
        Na__LeCfg__GetLeaderSetup,
        Na__LeCfg__GetMarginNotesSetup
    } from '../03__Core__Config/Na__LayoutEditor__ConfigState__.js';
    import { Na__LeScale__Coerce, Na__LeScale__SheetLabel } from './Na__LayoutEditor__ScaleManager__.js';
    import { Na__LeLayout__PaperSizeMm } from './Na__LayoutEditor__SheetLayout__.js';               // <-- A leaf: it reads the sheet config and nothing else, so it cannot cycle back here
    import { Na__LeGrad__Normalise } from '../35__System__DrawingTools/Na__LayoutEditor__GradientTool__.js';   // <-- A leaf: it reaches only the panel host, which reaches only the config
    import { Na__LeDash__Normalise } from '../35__System__DrawingTools/Na__LayoutEditor__LineStyleTool__.js';   // @delegate: ../35__System__DrawingTools/Na__LayoutEditor__LineStyleTool__.js
    import {
        Na__LeEdge__FIELD,
        Na__LeEdge__CAT_FIELD,
        Na__LeEdge__IsLoaded,
        Na__LeEdge__IsColour,
        Na__LeEdge__IsLineType,
        Na__LeEdge__ClampWeight,
        Na__LeEdge__Default
    } from '../25__System__RenderStyles/Na__LayoutEditor__EdgeStyles__.js';
    import { Na__LeComposite__FIELD, Na__LeComposite__Row, Na__LeComposite__Clamp } from '../25__System__RenderStyles/Na__LayoutEditor__RenderComposites__.js';   // <-- A leaf too: it imports nothing
    import { Na__DrawData__GetProjectCode } from '../../42__System__DrawingViewCore/Na__DrawView__ProjectData__.js';
    import { Na__PresentationMode__ProjectJson__GetActiveConfig } from '../../21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Kinds, Layer Types, Style Keys and Id Padding
    // ------------------------------------------------------------
    const Na__LeRec__KIND_2D     = '2d';
    const Na__LeRec__KIND_3D     = '3d';
    const Na__LeRec__LAYER_TYPES = [ 'viewport', 'annotation', 'dimension', 'vector', 'mixed' ];
    const Na__LeRec__STYLE_KEYS  = [ 'baseImage', 'projectedLinework', 'profileLinework', 'glassOpaque', 'whitecard', 'hiddenLines', 'enhanceWhitecard', 'contextLayer' ];
    const Na__LeRec__ID_PAD      = 3;
    const Na__LeRec__LEADER_TYPES       = [ 'text', 'bubble' ];             // <-- A note with a leader, or a specification bubble
    const Na__LeRec__LEADER_LINE_STYLES = [ 'solid', 'dashed' ];
    const Na__LeRec__GROUP_KINDS        = [ 'shape', 'annotation', 'group' ];   // <-- What a group may hold: vectors, text, and nested groups
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Next Id With a Prefix, Unique in a List
    // ------------------------------------------------------------
    function Na__LeRec__NextId(list, prefix, idKey) {
        let highest = 0;
        for (let i = 0; i < list.length; i++) {
            const value = list[i] && list[i][idKey];
            const match = (typeof value === 'string') ? value.match(/(\d+)$/) : null;
            if (match) highest = Math.max(highest, parseInt(match[1], 10));
        }
        return prefix + String(highest + 1).padStart(Na__LeRec__ID_PAD, '0');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Coerce a Number, or Fall Back
    // ------------------------------------------------------------
    function Na__LeRec__Num(value, fallback) {
        return (typeof value === 'number' && Number.isFinite(value)) ? value : fallback;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Coerce an Opacity (0 clear to 1 solid), or Fall Back
    // ------------------------------------------------------------
    function Na__LeRec__Unit(value, fallback) {
        return (typeof value === 'number' && Number.isFinite(value)) ? Math.max(0, Math.min(1, value)) : fallback;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Find a Record by Id in a List
    // ------------------------------------------------------------
    function Na__LeRec__Find(list, idKey, id) {
        for (let i = 0; i < list.length; i++) if (list[i] && list[i][idKey] === id) return list[i];
        return null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Normalisation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fill a Layer Record's Defaults
    // ------------------------------------------------------------
    function Na__LeRec__NormaliseLayer(layer, index) {
        if (typeof layer.Layer__Name !== 'string') layer.Layer__Name = 'Layer ' + (index + 1);
        if (Na__LeRec__LAYER_TYPES.indexOf(layer.Layer__Type) === -1) layer.Layer__Type = 'mixed';
        if (layer.Layer__Visible === undefined) layer.Layer__Visible = true;
        if (layer.Layer__Locked  === undefined) layer.Layer__Locked  = false;
        layer.Layer__Order = Na__LeRec__Num(layer.Layer__Order, index + 1);
        return layer;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Keep Only the Edge Styles Someone Actually Chose
    // ------------------------------------------------------------
    // A stored entry is written out in full - label and all three values - so a
    // project file can be read without cross-referencing the config. In exchange
    // it is pruned hard: every value is coerced into something the palette
    // actually contains, and an entry that has come back round to the config
    // default is deleted, so the file only ever holds real decisions.
    //
    // THE PRUNE WAITS FOR THE CONFIG. Before the fetch lands the "default" is a
    // built-in black solid line, and deleting against that would throw away a
    // deliberate choice of black solid. Until it lands, entries are cleaned but
    // never dropped.
    // ------------------------------------------------------------
    function Na__LeRec__NormaliseProjectedEdges(block) {
        if (!block || typeof block !== 'object') return null;
        const source = block[Na__LeEdge__CAT_FIELD];
        if (!source || typeof source !== 'object') return null;

        const canPrune = Na__LeEdge__IsLoaded();
        const kept     = {};

        Object.keys(source).forEach((key) => {
            const entry = source[key];
            if (!entry || typeof entry !== 'object') return;

            const fallback = Na__LeEdge__Default(key);
            const weight   = Na__LeEdge__ClampWeight(entry['Category__EdgeWeightFactor']);
            const colour   = Na__LeEdge__IsColour(entry['Category__EdgeColour'])     ? entry['Category__EdgeColour']   : fallback.colour;
            const lineType = Na__LeEdge__IsLineType(entry['Category__EdgeLineType']) ? entry['Category__EdgeLineType'] : fallback.lineType;

            if (canPrune && weight === Na__LeEdge__ClampWeight(fallback.weight) && colour === fallback.colour && lineType === fallback.lineType) {
                return;                                                            // <-- Back to the default: the record says nothing
            }

            kept[key] = {
                'Category__Label'            : typeof entry['Category__Label'] === 'string' && entry['Category__Label'] ? entry['Category__Label'] : key,
                'Category__EdgeWeightFactor' : weight,
                'Category__EdgeColour'       : colour,
                'Category__EdgeLineType'     : lineType
            };
        });

        if (Object.keys(kept).length === 0) return null;

        const out = {};
        out['Edges__Description'] = 'Projected linework style for this viewport only, per SketchUp model category. Weight is a multiplier on the sheet master viewport lineweight; the colour and line type are aliases from Na__LayoutEditor__EdgeStyles__Config__.json. A category absent from this list draws at the default in Na__LayoutEditor__ModelLayers__Config__.json. Visibility is NOT here - that is Viewport__ModelLayers.';
        if (typeof block['Edges__UpdatedIso'] === 'string') out['Edges__UpdatedIso'] = block['Edges__UpdatedIso'];
        out[Na__LeEdge__CAT_FIELD] = kept;
        return out;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Keep Only the Composite Weights Someone Actually Set
    // ------------------------------------------------------------
    // A flat map of key to number, because a composite weight is one number with
    // no wording worth repeating. A key the config has never heard of, or one
    // whose composite has no weight at all, is dropped rather than carried.
    // ------------------------------------------------------------
    function Na__LeRec__NormaliseCompositeWeights(block) {
        if (!block || typeof block !== 'object') return null;
        const kept = {};
        Object.keys(block).forEach((key) => {
            const row = Na__LeComposite__Row(key);
            if (!row || row.weight.kind === 'none') return;
            const value = Na__LeComposite__Clamp(key, block[key]);
            if (Number.isFinite(value)) kept[key] = value;
        });
        return Object.keys(kept).length > 0 ? kept : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fill a Viewport Record's Defaults
    // ------------------------------------------------------------
    function Na__LeRec__NormaliseViewport(viewport, defaultLayerId) {
        const setup = Na__LeCfg__GetViewportSetup();
        if (viewport.Viewport__Kind !== Na__LeRec__KIND_3D) viewport.Viewport__Kind = Na__LeRec__KIND_2D;
        if (typeof viewport.Viewport__Name !== 'string') viewport.Viewport__Name = '';
        if (!viewport.Viewport__LayerId) viewport.Viewport__LayerId = defaultLayerId;
        if (viewport.Viewport__SceneId   === undefined) viewport.Viewport__SceneId   = null;
        if (viewport.Viewport__DrawingId === undefined) viewport.Viewport__DrawingId = null;

        const frame = viewport.Viewport__FrameMm || {};
        viewport.Viewport__FrameMm = {
            X        : Na__LeRec__Num(frame.X, 20),
            Y        : Na__LeRec__Num(frame.Y, 20),
            WidthMm  : Math.max(setup.minSizeMm, Na__LeRec__Num(frame.WidthMm,  setup.defaultWidthMm)),
            HeightMm : Math.max(setup.minSizeMm, Na__LeRec__Num(frame.HeightMm, setup.defaultHeightMm))
        };
        viewport.Viewport__ScaleDenominator = Na__LeScale__Coerce(viewport.Viewport__ScaleDenominator);

        const pan = viewport.Viewport__PanMm || {};
        viewport.Viewport__PanMm = { X : Na__LeRec__Num(pan.X, 0), Y : Na__LeRec__Num(pan.Y, 0) };

        const image = viewport.Viewport__ImageMm || {};
        viewport.Viewport__ImageMm = {
            WidthMm  : Na__LeRec__Num(image.WidthMm,  viewport.Viewport__FrameMm.WidthMm),
            HeightMm : Na__LeRec__Num(image.HeightMm, viewport.Viewport__FrameMm.HeightMm)
        };
        const offset = viewport.Viewport__ImageOffsetMm || {};
        viewport.Viewport__ImageOffsetMm = { X : Na__LeRec__Num(offset.X, 0), Y : Na__LeRec__Num(offset.Y, 0) };
        // IMAGE ZOOM | How large a 3D viewport's picture is drawn, as a multiple
        // of Viewport__ImageMm (Na__LayoutEditor__Viewport3dZoom__). Held inside
        // the configured limits and stored only when it is not 1, so a record
        // from before the zoom - and a browser draft of one - is exactly what it was.
        const imageZoom = viewport.Viewport__ImageZoom;
        const zoomKept  = (typeof imageZoom === 'number' && Number.isFinite(imageZoom) && imageZoom > 0) ? Math.min(setup.imageZoomMax, Math.max(setup.imageZoomMin, imageZoom)) : 1;
        if (zoomKept !== 1) viewport.Viewport__ImageZoom = zoomKept;
        else delete viewport.Viewport__ImageZoom;

        // MODEL LAYERS | Only the categories switched OFF are kept
        // A viewport records dissent, not consent: an absent key is on. That
        // way a model that gains a category later shows it in every viewport
        // instead of inheriting a silence nobody meant, and a viewport nobody
        // has touched carries no field at all.
        const modelLayers = viewport.Viewport__ModelLayers;
        if (modelLayers && typeof modelLayers === 'object') {
            const kept = {};
            Object.keys(modelLayers).forEach((key) => { if (modelLayers[key] === false) kept[key] = false; });
            viewport.Viewport__ModelLayers = Object.keys(kept).length > 0 ? kept : null;
        } else {
            viewport.Viewport__ModelLayers = null;
        }

        // STYLES | A stored flag stands; anything unset takes the configured default
        const styles   = viewport.Viewport__Styles || {};
        const defaults = setup.defaultStyles;
        const pick     = (key) => (typeof styles[key] === 'boolean' ? styles[key] : defaults[key]);
        viewport.Viewport__Styles = {
            baseImage         : pick('baseImage'),
            projectedLinework : pick('projectedLinework'),
            profileLinework   : pick('profileLinework'),
            glassOpaque       : pick('glassOpaque'),
            whitecard         : pick('whitecard'),
            hiddenLines       : pick('hiddenLines'),
            enhanceWhitecard  : pick('enhanceWhitecard'),
            contextLayer      : pick('contextLayer')
        };
        // PROJECTED EDGE STYLES and COMPOSITE WEIGHTS | Curation, stored only
        // where it happened. Both are null on a viewport nobody has curated,
        // which is the overwhelming majority, so the ordinary project file is
        // exactly the size it was before the feature existed.
        viewport[Na__LeEdge__FIELD]      = Na__LeRec__NormaliseProjectedEdges(viewport[Na__LeEdge__FIELD]);
        viewport[Na__LeComposite__FIELD] = Na__LeRec__NormaliseCompositeWeights(viewport[Na__LeComposite__FIELD]);
        if (viewport.Viewport__MarkupMode !== 'sheet') viewport.Viewport__MarkupMode = 'scene';
        if (viewport.Viewport__ShowScaleLabel === undefined) viewport.Viewport__ShowScaleLabel = setup.showScaleLabel;
        // SNAPSHOT ASSET | { Asset__Path, Asset__Fingerprint, Asset__PixelWidth }.
        // The width says how big the stored picture is, so a stored picture
        // that is too small for the working level is re-rendered instead of
        // being shown blurred. An asset written before this key existed reads
        // as unknown and is treated as too small.
        const slot = viewport.Viewport__SnapshotAsset;
        if (!slot || typeof slot !== 'object' || typeof slot.Asset__Path !== 'string') viewport.Viewport__SnapshotAsset = null;
        else if (!Number.isFinite(slot.Asset__PixelWidth)) slot.Asset__PixelWidth = null;
        if (typeof viewport.Viewport__Locked !== 'boolean') viewport.Viewport__Locked = false;   // <-- A locked viewport cannot be entered, moved or resized
        return viewport;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fill an Annotation Record's Defaults
    // ------------------------------------------------------------
    function Na__LeRec__NormaliseAnnotation(item, defaultLayerId) {
        const setup = Na__LeCfg__GetTextSetup();
        if (!item.Annotation__LayerId) item.Annotation__LayerId = defaultLayerId;
        if (typeof item.Annotation__Text !== 'string') item.Annotation__Text = setup.defaultText;
        item.Annotation__PosXMm  = Na__LeRec__Num(item.Annotation__PosXMm, 20);
        item.Annotation__PosYMm  = Na__LeRec__Num(item.Annotation__PosYMm, 20);
        item.Annotation__SizeMm  = Na__LeRec__Num(item.Annotation__SizeMm, setup.defaultSizeMm);
        item.Annotation__FontWeight = Na__LeRec__Num(item.Annotation__FontWeight, setup.defaultWeight);
        if (typeof item.Annotation__Colour !== 'string') item.Annotation__Colour = setup.defaultColour;
        if ([ 'left', 'center', 'right' ].indexOf(item.Annotation__Align) === -1) item.Annotation__Align = 'left';
        if (item.Annotation__LeaderXMm === undefined) item.Annotation__LeaderXMm = null;
        if (item.Annotation__LeaderYMm === undefined) item.Annotation__LeaderYMm = null;
        return item;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fill a Dimension Record's Defaults
    // ------------------------------------------------------------
    function Na__LeRec__NormaliseDimension(item, defaultLayerId) {
        const setup = Na__LeCfg__GetDimensionSetup();
        if (!item.Dimension__LayerId) item.Dimension__LayerId = defaultLayerId;
        if (item.Dimension__ViewportId === undefined) item.Dimension__ViewportId = null;
        item.Dimension__StartXMm   = Na__LeRec__Num(item.Dimension__StartXMm, 20);
        item.Dimension__StartYMm   = Na__LeRec__Num(item.Dimension__StartYMm, 20);
        item.Dimension__EndXMm     = Na__LeRec__Num(item.Dimension__EndXMm, 60);
        item.Dimension__EndYMm     = Na__LeRec__Num(item.Dimension__EndYMm, 20);
        item.Dimension__OffsetMm   = Na__LeRec__Num(item.Dimension__OffsetMm, setup.defaultOffsetMm);
        item.Dimension__TextSizeMm = Na__LeRec__Num(item.Dimension__TextSizeMm, setup.defaultTextSizeMm);
        if (typeof item.Dimension__Colour !== 'string') item.Dimension__Colour = setup.defaultColour;
        if (setup.terminators.indexOf(item.Dimension__Terminator) === -1) item.Dimension__Terminator = setup.defaultTerminator;
        // TERMINATOR SIZE | A length is a number above zero, clamped; anything
        // else is no key, which draws at the config TickLengthMm, as a record
        // from before this field did.
        if (item.Dimension__TickLengthMm !== undefined) {
            const mm = item.Dimension__TickLengthMm;
            if (!(typeof mm === 'number' && Number.isFinite(mm) && mm > 0)) delete item.Dimension__TickLengthMm;
            else item.Dimension__TickLengthMm = Math.min(setup.maxTickLengthMm, Math.max(setup.minTickLengthMm, mm));
        }
        item.Dimension__Precision = Na__LeRec__Num(item.Dimension__Precision, setup.defaultPrecision);
        if (typeof item.Dimension__UnitsSuffix !== 'string') item.Dimension__UnitsSuffix = setup.defaultUnits;
        if (item.Dimension__OverrideText === undefined) item.Dimension__OverrideText = null;
        if ([ 'aligned', 'horizontal', 'vertical' ].indexOf(item.Dimension__Orientation) === -1) item.Dimension__Orientation = 'aligned';   // <-- A record from before ortho dimensions was aligned
        // TEXT OFFSET | Kept only as a finite pair that actually moves the
        // value; anything else - and both keys at zero - is no key, which
        // sits the value on the line as a record from before this did.
        const textDx = item.Dimension__TextDXMm, textDy = item.Dimension__TextDYMm;
        const hasDx  = typeof textDx === 'number' && Number.isFinite(textDx);
        const hasDy  = typeof textDy === 'number' && Number.isFinite(textDy);
        if (!hasDx && !hasDy) {
            delete item.Dimension__TextDXMm;
            delete item.Dimension__TextDYMm;
        } else {
            const dx = hasDx ? textDx : 0, dy = hasDy ? textDy : 0;
            if (Math.hypot(dx, dy) < 1e-6) {
                delete item.Dimension__TextDXMm;
                delete item.Dimension__TextDYMm;
            } else {
                item.Dimension__TextDXMm = dx;
                item.Dimension__TextDYMm = dy;
            }
        }
        return item;
    }
    // ------------------------------------------------------------


    // FUNCTION | Fill In a Vector Shape (points [[x, y], ...] paper mm, weight in points)
    // ------------------------------------------------------------
    function Na__LeRec__NormaliseShape(item, defaultLayerId) {
        const setup = Na__LeCfg__GetShapeSetup();
        if (!item.Shape__LayerId) item.Shape__LayerId = defaultLayerId;
        const raw = Array.isArray(item.Shape__Points) ? item.Shape__Points : [];
        item.Shape__Points = raw.filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])).map((p) => [ p[0], p[1] ]);
        item.Shape__Closed = item.Shape__Closed === true;
        if (typeof item.Shape__StrokeColour !== 'string') item.Shape__StrokeColour = setup.defaultStrokeColour;
        item.Shape__StrokePt = Na__LeRec__Num(item.Shape__StrokePt, setup.defaultStrokePt);
        if (typeof item.Shape__FillColour !== 'string') item.Shape__FillColour = null;
        item.Shape__FillOpacity   = Na__LeRec__Unit(item.Shape__FillOpacity, 1);         // <-- A record from before opacity was solid
        item.Shape__StrokeOpacity = Na__LeRec__Unit(item.Shape__StrokeOpacity, 1);
        item.Shape__Gradient = Na__LeGrad__Normalise(item.Shape__Gradient);              // <-- A fresh object or null: no two shapes ever hold the same gradient
        item.Shape__LineStyle = Na__LeDash__Normalise(item.Shape__LineStyle);            // <-- Likewise: null is a solid edge, and a record from before the toggle stays one
        item.Shape__Stroked = item.Shape__Stroked !== false;                             // <-- A record written before the flag existed drew its edges
        const filled  = item.Shape__FillColour !== null || item.Shape__Gradient !== null;   // <-- A gradient is a fill as far as visibility goes
        const canFill = filled && item.Shape__Points.length > 2;                            // <-- Two points enclose nothing, so they cannot be a fill
        if (!item.Shape__Stroked && !canFill) item.Shape__Stroked = true;                   // <-- Edges or fill, never neither: an invisible shape is a lost shape
        return item;
    }
    // ------------------------------------------------------------


    // FUNCTION | Fill In a Leader (tip and anchor in paper mm, weights in points, opacities 0 to 1)
    // ------------------------------------------------------------
    // Every style field that is missing takes the Leader setup's default. A
    // null fill is a real choice - no fill - and is kept; only a fill that was
    // never written takes the default. A tip or an anchor that is not a number
    // puts the head a little up and to the right of the tip.
    // ------------------------------------------------------------
    function Na__LeRec__NormaliseLeader(item, defaultLayerId) {
        const setup = Na__LeCfg__GetLeaderSetup();
        if (!item.Leader__LayerId) item.Leader__LayerId = defaultLayerId;
        if (Na__LeRec__LEADER_TYPES.indexOf(item.Leader__Type) === -1) item.Leader__Type = setup.defaultType;
        item.Leader__TipXMm    = Na__LeRec__Num(item.Leader__TipXMm, 20);
        item.Leader__TipYMm    = Na__LeRec__Num(item.Leader__TipYMm, 20);
        item.Leader__AnchorXMm = Na__LeRec__Num(item.Leader__AnchorXMm, item.Leader__TipXMm + 15);
        item.Leader__AnchorYMm = Na__LeRec__Num(item.Leader__AnchorYMm, item.Leader__TipYMm - 10);
        if (typeof item.Leader__Text !== 'string') item.Leader__Text = item.Leader__Type === 'bubble' ? setup.defaultBubbleText : setup.defaultText;
        item.Leader__TextSizeMm = Math.max(0.5, Na__LeRec__Num(item.Leader__TextSizeMm, setup.textSizeMm));
        item.Leader__FontWeight = Na__LeRec__Num(item.Leader__FontWeight, setup.fontWeight);
        if (typeof item.Leader__TextColour !== 'string') item.Leader__TextColour = setup.textColour;
        if (typeof item.Leader__LineColour !== 'string') item.Leader__LineColour = setup.lineColour;
        item.Leader__LinePt = Math.max(0, Na__LeRec__Num(item.Leader__LinePt, setup.linePt));
        if (Na__LeRec__LEADER_LINE_STYLES.indexOf(item.Leader__LineStyle) === -1) item.Leader__LineStyle = setup.lineStyle;
        item.Leader__LineOpacity = Na__LeRec__Unit(item.Leader__LineOpacity, setup.lineOpacity);
        if (typeof item.Leader__EndpointFilled !== 'boolean') item.Leader__EndpointFilled = setup.endpointFilled;
        item.Leader__EndpointPt     = Math.max(0, Na__LeRec__Num(item.Leader__EndpointPt, setup.endpointPt));
        item.Leader__EndpointSizeMm = Math.max(0, Na__LeRec__Num(item.Leader__EndpointSizeMm, setup.endpointSizeMm));
        item.Leader__BubbleSizeMm   = Math.max(1, Na__LeRec__Num(item.Leader__BubbleSizeMm, setup.bubbleSizeMm));
        item.Leader__BubbleEdgePt   = Math.max(0, Na__LeRec__Num(item.Leader__BubbleEdgePt, setup.bubbleEdgePt));
        if (item.Leader__FillColour === undefined) item.Leader__FillColour = setup.filled ? setup.fillColour : null;   // <-- Never written: the default
        else if (typeof item.Leader__FillColour !== 'string') item.Leader__FillColour = null;                        // <-- Null is "no fill", and stays
        item.Leader__FillOpacity = Na__LeRec__Unit(item.Leader__FillOpacity, setup.fillOpacity);
        // SPECIFICATION LINK | Only where the key exists: the id of the project
        // specification note a bubble shows the code of (Na__LayoutEditor__SpecLinks__).
        if ('Leader__SpecNoteId' in item) {
            const noteId = item.Leader__SpecNoteId;
            if (typeof noteId === 'string' && noteId.trim() !== '') item.Leader__SpecNoteId = noteId.trim();
            else delete item.Leader__SpecNoteId;
        }
        return item;
    }
    // ------------------------------------------------------------


    // FUNCTION | Fill In a Sheet's Notes Margin (only on a sheet that has one)
    // ------------------------------------------------------------
    function Na__LeRec__NormaliseMarginNotes(sheet) {
        if (!sheet || !('Sheet__MarginNotes' in sheet)) return null;
        const raw = sheet.Sheet__MarginNotes;
        if (!raw || typeof raw !== 'object') { delete sheet.Sheet__MarginNotes; return null; }
        const setup = Na__LeCfg__GetMarginNotesSetup();
        const storedSize = Na__LeRec__Num(raw.TextSizeMm, setup.textSizeMm);
        const ninePtMm   = 9 * 25.4 / 72;
        const wasDefault = raw.TextSizeMm === 2.2 || (typeof raw.TextSizeMm === 'number' && Math.abs(raw.TextSizeMm - ninePtMm) < 0.05);
        const bodyMm     = wasDefault ? setup.textSizeMm : storedSize;           // <-- 2.2 mm and the brief 9 pt size give way to 2 mm
        sheet.Sheet__MarginNotes = {
            Enabled        : raw.Enabled === true,
            WidthMm        : Math.max(setup.minWidthMm, Na__LeRec__Num(raw.WidthMm, setup.defaultWidthMm)),
            Heading        : (typeof raw.Heading === 'string' && raw.Heading.trim() !== '') ? raw.Heading : null,
            TextSizeMm     : Math.min(setup.maxTextSizeMm, Math.max(setup.minTextSizeMm, bodyMm)),
            IncludeGeneral : typeof raw.IncludeGeneral === 'boolean' ? raw.IncludeGeneral : setup.includeGeneral,
            GroupHeadings  : typeof raw.GroupHeadings === 'boolean' ? raw.GroupHeadings : setup.groupHeadings
        };
        return sheet.Sheet__MarginNotes;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Sheet's Margin Settings, With the Defaults Where It Has None (never writes)
    // ------------------------------------------------------------
    function Na__LeRec__MarginNotes(sheet) {
        const stored = (sheet && sheet.Sheet__MarginNotes && typeof sheet.Sheet__MarginNotes === 'object') ? sheet.Sheet__MarginNotes : null;
        if (stored) return stored;
        const setup = Na__LeCfg__GetMarginNotesSetup();
        return { Enabled : false, WidthMm : setup.defaultWidthMm, Heading : null, TextSizeMm : setup.textSizeMm, IncludeGeneral : setup.includeGeneral, GroupHeadings : setup.groupHeadings };
    }
    // ------------------------------------------------------------


    // FUNCTION | Fill In a Group (members are { kind, id } of a vector, text or group)
    // ------------------------------------------------------------
    // Kind and id are the only fields. Duplicates and anything else drop out,
    // so a draft or a record from before a kind existed stays a list of live
    // members. The id of the group itself is the sheet model's to assign.
    // ------------------------------------------------------------
    function Na__LeRec__NormaliseGroup(item) {
        if (!item || typeof item !== 'object') return item;
        const raw  = Array.isArray(item.Group__Members) ? item.Group__Members : [];
        const seen = new Set();
        item.Group__Members = raw.filter((member) => {
            if (!member || typeof member !== 'object') return false;
            if (Na__LeRec__GROUP_KINDS.indexOf(member.kind) === -1) return false;
            if (typeof member.id !== 'string' || !member.id) return false;
            const key = member.kind + ':' + member.id;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).map((member) => ({ kind : member.kind, id : member.id }));
        return item;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fill a Sheet Record's Defaults (mutates in place)
    // ------------------------------------------------------------
    function Na__LeRec__NormaliseSheet(sheet, index) {
        const sheetSetup = Na__LeCfg__GetSheetSetup();
        const titleSetup = Na__LeCfg__GetTitleBlockSetup();

        if (typeof sheet.Sheet__Name !== 'string' || !sheet.Sheet__Name) {
            sheet.Sheet__Name = Na__LeCfg__FormatLabel('SheetNameFormat', sheetSetup.defaultNameFormat, { index : index + 1 });
        }
        sheet.Sheet__Order = Na__LeRec__Num(sheet.Sheet__Order, index + 1);
        if (!sheet.Sheet__PaperSize || !sheetSetup.paperSizes[sheet.Sheet__PaperSize]) sheet.Sheet__PaperSize = sheetSetup.defaultPaperSize;
        if (sheet.Sheet__Orientation !== 'portrait') sheet.Sheet__Orientation = 'landscape';
        if (sheet.Sheet__TitleBlockStyle !== 'classic' && sheet.Sheet__TitleBlockStyle !== 'modern') sheet.Sheet__TitleBlockStyle = titleSetup.defaultStyle;
        if (!sheet.Sheet__Fields || typeof sheet.Sheet__Fields !== 'object') sheet.Sheet__Fields = {};

        if (!Array.isArray(sheet.Sheet__Layers) || sheet.Sheet__Layers.length === 0) {
            sheet.Sheet__Layers = [
                { Layer__Id : 'Layer_001', Layer__Name : 'Viewports',  Layer__Type : 'viewport',   Layer__Visible : true, Layer__Locked : false, Layer__Order : 1 },
                { Layer__Id : 'Layer_002', Layer__Name : 'Text',       Layer__Type : 'annotation', Layer__Visible : true, Layer__Locked : false, Layer__Order : 2 },
                { Layer__Id : 'Layer_003', Layer__Name : 'Dimensions', Layer__Type : 'dimension',  Layer__Visible : true, Layer__Locked : false, Layer__Order : 3 },
                { Layer__Id : 'Layer_004', Layer__Name : 'Vectors',    Layer__Type : 'vector',     Layer__Visible : true, Layer__Locked : false, Layer__Order : 4 }
            ];
        }
        sheet.Sheet__Layers.forEach(Na__LeRec__NormaliseLayer);
        sheet.Sheet__Layers.sort((a, b) => a.Layer__Order - b.Layer__Order);

        if (!Array.isArray(sheet.Sheet__Viewports))   sheet.Sheet__Viewports   = [];
        if (!Array.isArray(sheet.Sheet__Annotations)) sheet.Sheet__Annotations = [];
        if (!Array.isArray(sheet.Sheet__Dimensions))  sheet.Sheet__Dimensions  = [];
        if (!Array.isArray(sheet.Sheet__Shapes))      sheet.Sheet__Shapes      = [];
        if (!Array.isArray(sheet.Sheet__Leaders))     sheet.Sheet__Leaders     = [];
        if (!Array.isArray(sheet.Sheet__Groups))      sheet.Sheet__Groups      = [];   // <-- A record from before groups: empty, and older sheets stay as they were

        // LINEWEIGHTS | Printed points per sheet, seeded from the config
        const lwSetup = Na__LeCfg__GetLineweightSetup();
        const lw = (sheet.Sheet__Lineweights && typeof sheet.Sheet__Lineweights === 'object') ? sheet.Sheet__Lineweights : {};
        sheet.Sheet__Lineweights = { ViewportPt : Na__LeRec__Num(lw.ViewportPt, lwSetup.viewportPt), DimensionPt : Na__LeRec__Num(lw.DimensionPt, lwSetup.dimensionPt) };
        Na__LeRec__NormaliseMarginNotes(sheet);                                  // <-- Only a sheet that has a notes margin

        sheet.Sheet__Viewports.forEach((v)   => Na__LeRec__NormaliseViewport(v,   Na__LeRec__DefaultLayerId(sheet, 'viewport')));
        sheet.Sheet__Annotations.forEach((a) => Na__LeRec__NormaliseAnnotation(a, Na__LeRec__DefaultLayerId(sheet, 'annotation')));
        sheet.Sheet__Dimensions.forEach((d)  => Na__LeRec__NormaliseDimension(d,  Na__LeRec__DefaultLayerId(sheet, 'dimension')));
        sheet.Sheet__Shapes.forEach((sh)     => Na__LeRec__NormaliseShape(sh,     Na__LeRec__DefaultLayerId(sheet, 'vector')));
        sheet.Sheet__Leaders.forEach((l)     => Na__LeRec__NormaliseLeader(l,     Na__LeRec__DefaultLayerId(sheet, 'annotation')));   // <-- Leaders live with the text
        sheet.Sheet__Groups = sheet.Sheet__Groups.filter((g) => g && typeof g === 'object');
        sheet.Sheet__Groups.forEach((g) => {
            if (typeof g.Group__Id !== 'string' || !g.Group__Id) g.Group__Id = Na__LeRec__NextId(sheet.Sheet__Groups, 'Group_', 'Group__Id');
            Na__LeRec__NormaliseGroup(g);
        });
        return sheet;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Layers and Fields
// -----------------------------------------------------------------------------

    // FUNCTION | The Layer New Items of a Type Land On
    // ------------------------------------------------------------
    function Na__LeRec__DefaultLayerId(sheet, type) {
        const layers = sheet ? sheet.Sheet__Layers : [];
        for (let i = 0; i < layers.length; i++) if (layers[i].Layer__Type === type) return layers[i].Layer__Id;
        for (let i = 0; i < layers.length; i++) if (layers[i].Layer__Type === 'mixed') return layers[i].Layer__Id;
        return layers.length ? layers[0].Layer__Id : 'Layer_001';
    }
    // ------------------------------------------------------------


    // FUNCTION | The Title Block Fields With Project Defaults Filled In
    // ------------------------------------------------------------
    function Na__LeRec__BuildFields(sheet) {
        const setup   = Na__LeCfg__GetTitleBlockSetup();
        const stored  = (sheet && sheet.Sheet__Fields) || {};
        const config  = Na__PresentationMode__ProjectJson__GetActiveConfig();
        const project = (config && (config.projectName || config.displayName)) || '';
        const code    = Na__DrawData__GetProjectCode() || '';
        const index   = sheet ? sheet.Sheet__Order : 1;
        const scales  = (sheet ? sheet.Sheet__Viewports : []).filter((v) => v.Viewport__Kind === Na__LeRec__KIND_2D).map((v) => v.Viewport__ScaleDenominator);
        const paper   = Na__LeLayout__PaperSizeMm(sheet ? sheet.Sheet__PaperSize : null, sheet ? sheet.Sheet__Orientation : null);   // <-- Resolved, not read raw: an unset or unknown size falls back to the default paper the sheet actually prints on
        const today   = new Date();
        const dateText = String(today.getDate()).padStart(2, '0') + ' ' +
            [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ][today.getMonth()] + ' ' + today.getFullYear();

        const defaults = {
            Client        : project,
            SiteAddress   : '',
            Title         : sheet ? sheet.Sheet__Name : '',
            DrawingNumber : (code ? code + '-' : '') + String(index).padStart(2, '0'),
            Revision      : 'A',
            Scale         : Na__LeScale__SheetLabel(scales, paper.Label),
            Date          : dateText,
            DrawnBy       : setup.drawnByDefault
        };
        const fields = {};
        Object.keys(defaults).forEach((key) => {
            const value = stored['Sheet__Fields__' + key];
            fields[key] = (typeof value === 'string') ? value : defaults[key];
        });
        return fields;
    }
    // ------------------------------------------------------------


// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor Sheet Records API
    // ------------------------------------------------------------
    export {
        Na__LeRec__KIND_2D,
        Na__LeRec__KIND_3D,
        Na__LeRec__LAYER_TYPES,
        Na__LeRec__STYLE_KEYS,
        Na__LeRec__NormaliseShape,
        Na__LeRec__NormaliseLeader,
        Na__LeRec__NormaliseMarginNotes,
        Na__LeRec__MarginNotes,
        Na__LeRec__NextId,
        Na__LeRec__Num,
        Na__LeRec__Find,
        Na__LeRec__NormaliseLayer,
        Na__LeRec__NormaliseViewport,
        Na__LeRec__NormaliseAnnotation,
        Na__LeRec__NormaliseDimension,
        Na__LeRec__NormaliseGroup,
        Na__LeRec__NormaliseSheet,
        Na__LeRec__DefaultLayerId,
        Na__LeRec__BuildFields
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
