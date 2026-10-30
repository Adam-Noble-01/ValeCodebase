// =============================================================================
// VALEVISION AURA - DRAWING SET - THE MODEL
// =============================================================================
//
// FILE       : Na__DrawingSet__Model__.js
// NAMESPACE  : Na__DrawingSet
// MODULE     : Drawing Set - Model
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : A project's AURA drawing set as one JSON document: the engine's
//              settings, saved 3D views, and the sheets with their viewports and
//              annotations. New records, defaults, and a tidy-up on load
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - ONE DOCUMENT PER PROJECT, saved by the AURA API into the Projects Master
//   Library: <project>/ValeVision__AuraRender/UserData__AuraDrawings/
//   <project>__AuraDrawingSet__.json (user data: written on the server,
//   collected to the PC, never pushed, never web-served).
// - KEYS ARE THREE-STAGE (AuraDrawingSet__Sheets, Sheet__PaperSize,
//   Viewport__FrameMm) and carry their unit (Mm on the sheet, M in the world).
// - SHEET MILLIMETRES run from the paper's top left corner, x right, y down,
//   in the sheet's own orientation.
// - A NEW PROJECT starts with one A1 demo sheet: the four elevations at 1:50,
//   the roof plan at 1:100 and the engine's three-quarter view, so the whole
//   chain (engine, viewports, title block) shows at once.
// - ART DIRECTION POINTS are kept a set a view, as PainterlyNPR makes them
//   (its point objects, as plain data): View__Points on a saved view (shared
//   by every sheet viewport that shows it), Viewport__Points on any other
//   viewport, and AuraDrawingSet__Engine.WorkingPoints for the 3D
//   Environment's view while it is not a saved one (inside Engine, beside the
//   settings: the AURA API takes only the four root keys it knows).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.1.0 (AURA 0.3.0)
// - Art Direction Points: View__Points, Viewport__Points and
//   AuraDrawingSet__Engine.WorkingPoints; NewSavedView takes the points,
//   Normalise keeps only point records it can read (Na__DrawingSet__CleanPoints).
//
// 30-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__Format__Id, Na__Format__Date, Na__Format__Seed, Na__Format__Clamp } from '../03__AppUtils/Na__AppUtils__Format__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    const Na__DrawingSet__SCHEMA_VERSION  = '1.0.0';
    const Na__DrawingSet__VIEWPORT_KINDS  = ['Perspective', 'Elevation', 'Plan'];
    const Na__DrawingSet__ANNOTATION_KINDS = ['Note', 'Leader'];
    const Na__DrawingSet__FIELD_KEYS      = ['Client', 'Address', 'Title', 'Scale', 'Date', 'DrawnBy', 'CheckedBy', 'DrawingNo'];

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | New Records
// -----------------------------------------------------------------------------

    // FUNCTION | A New Sheet: paper, orientation, name and the title block's fields
    // ------------------------------------------------------------
    function Na__DrawingSet__NewSheet(options) {
        const o = options || {};
        const sizes = Na__AppConfig__Get('Sheet__PaperSizes', {});
        const paper = sizes[o.paperSize] ? o.paperSize : Na__AppConfig__Get('Sheet__DefaultPaperSize', 'A3');
        return {
            Sheet__Id          : Na__Format__Id('Sheet'),
            Sheet__Name        : String(o.name || 'New sheet').slice(0, 80),
            Sheet__PaperSize   : paper,
            Sheet__Orientation : o.orientation === 'portrait' ? 'portrait' : 'landscape',
            Sheet__Fields      : Object.assign({
                Client     : '',
                Address    : '',
                Title      : String(o.name || ''),
                Scale      : '',                                                 // <-- Empty: written from the viewports' scales
                Date       : Na__Format__Date(),
                DrawnBy    : '',
                CheckedBy  : '',
                DrawingNo  : '',
                Revisions  : []
            }, o.fields || {}),
            Sheet__Viewports   : [],
            Sheet__Annotations : []
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | A New Viewport: { kind, frame, scale, side, preset, savedViewId }
    // ------------------------------------------------------------
    // Elevations and plans are scaled views: their frame is at most the engine's
    // own sheet (300 x 200 mm), which the viewport module enforces. A perspective
    // is a picture, scaled to its frame.
    // ------------------------------------------------------------
    function Na__DrawingSet__NewViewport(options) {
        const o = options || {};
        const kind = Na__DrawingSet__VIEWPORT_KINDS.includes(o.kind) ? o.kind : 'Perspective';
        const frame = Object.assign({ X: 30, Y: 30 }, Na__AppConfig__Get('Viewport__DefaultFrameMm', { WidthMm: 180, HeightMm: 120 }), o.frame || {});
        const defaultScale = kind === 'Plan' ? Na__AppConfig__Get('Viewport__DefaultPlanScale', 100) : Na__AppConfig__Get('Viewport__DefaultScale', 50);
        return {
            Viewport__Id               : Na__Format__Id('Viewport'),
            Viewport__Kind             : kind,
            Viewport__FrameMm          : { X: frame.X, Y: frame.Y, WidthMm: frame.WidthMm, HeightMm: frame.HeightMm },
            Viewport__ScaleDenominator : kind === 'Perspective' ? null : Number(o.scale || defaultScale),
            Viewport__Side             : kind === 'Elevation' ? (o.side || 'Front') : null,
            Viewport__PlanKind         : kind === 'Plan' ? 'RoofPlan' : null,
            Viewport__CentreM          : null,                                   // <-- null: centred on the building; [x, y, z] once panned
            Viewport__CameraSource     : kind === 'Perspective' ? (o.savedViewId ? { SavedViewId: o.savedViewId } : { Preset: o.preset || 'ThreeQuarter' }) : null,
            Viewport__Profile          : kind === 'Perspective' ? 'Concept' : (o.profile || 'Measured'),
            Viewport__Title            : String(o.title || ''),
            Viewport__ShowTitle        : o.showTitle !== false,
            Viewport__Points           : Na__DrawingSet__CleanPoints(o.points)     // <-- Its own Art Direction Points (a saved view's viewport draws with the view's)
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | A New Annotation: a handwritten Note, or a Leader note with an arrow to a tip
    // ------------------------------------------------------------
    function Na__DrawingSet__NewAnnotation(options) {
        const o = options || {};
        const kind = Na__DrawingSet__ANNOTATION_KINDS.includes(o.kind) ? o.kind : 'Note';
        const at = o.at || { X: 40, Y: 40 };
        return {
            Annotation__Id       : Na__Format__Id('Note'),
            Annotation__Kind     : kind,
            Annotation__Text     : String(o.text || '').slice(0, Na__AppConfig__Get('Handwriting__MaxChars', 600)),
            Annotation__AtMm     : { X: at.X, Y: at.Y },
            Annotation__WidthMm  : Number(o.width || Na__AppConfig__Get('Annotation__DefaultWidthMm', 70)),
            Annotation__TipMm    : kind === 'Leader' ? Object.assign({ X: at.X - 25, Y: at.Y + 25 }, o.tip || {}) : null,
            Annotation__SizeMm   : Number(o.size || Na__AppConfig__Get('Annotation__DefaultSizeMm', 4.5)),
            Annotation__InkKey   : o.ink || Na__AppConfig__Get('Annotation__DefaultInk', 'Forest'),
            Annotation__HandKey  : o.hand || Na__AppConfig__Get('Handwriting__DefaultHand', 'Steady'),
            Annotation__Seed     : Number.isFinite(o.seed) ? o.seed : Na__Format__Seed(),
            Annotation__Written  : null                                          // <-- The engine's strokes once written: { Key, Paths, HeightMm, InkWidthMm, Lines, Warnings }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | A Saved 3D View: a name, the engine's camera and its Art Direction Points
    // ------------------------------------------------------------
    function Na__DrawingSet__NewSavedView(name, camera, points) {
        return {
            View__Id     : Na__Format__Id('View'),
            View__Name   : String(name || 'Saved view').slice(0, 60),
            View__Camera : JSON.parse(JSON.stringify(camera)),
            View__Points : Na__DrawingSet__CleanPoints(points)
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | A Set of Art Direction Points as Plain Data (only records the engine can read)
    // ------------------------------------------------------------
    // The engine checks each type again when it takes them (its MakePoint),
    // so a type a later engine drops is left out there, never here.
    // ------------------------------------------------------------
    function Na__DrawingSet__CleanPoints(points) {
        return (Array.isArray(points) ? points : [])
            .filter((p) => p && typeof p === 'object' && typeof p.Type === 'string' && Array.isArray(p.PaperMm) && p.PaperMm.length === 2)
            .map((p) => JSON.parse(JSON.stringify(p)));
    }

    // The 3D Environment's unsaved view's points, and keeping them (inside Engine, beside the settings)
    function Na__DrawingSet__WorkingPoints(doc) {
        return (doc && doc.AuraDrawingSet__Engine && doc.AuraDrawingSet__Engine.WorkingPoints) || [];
    }

    function Na__DrawingSet__SetWorkingPoints(doc, points) {
        if (!doc) return;
        doc.AuraDrawingSet__Engine = doc.AuraDrawingSet__Engine || { Settings: null };
        doc.AuraDrawingSet__Engine.WorkingPoints = Na__DrawingSet__CleanPoints(points);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Document
// -----------------------------------------------------------------------------

    // FUNCTION | A New Drawing Set for a Project, With the Demo Sheet
    // ------------------------------------------------------------
    function Na__DrawingSet__New(project, user) {
        const now = new Date().toISOString();
        const doc = {
            AuraDrawingSet__Meta       : {
                SchemaVersion : Na__DrawingSet__SCHEMA_VERSION,
                ProjectId     : project ? project.id : '',
                CreatedIso    : now,
                UpdatedIso    : now,
                CreatedBy     : user ? user.code : ''
            },
            AuraDrawingSet__Engine     : { Settings: null, WorkingPoints: [] },  // <-- Settings null: the engine's own starting state. WorkingPoints: the 3D Environment's while its view is not a saved one
            AuraDrawingSet__SavedViews : [],
            AuraDrawingSet__Sheets     : []
        };
        doc.AuraDrawingSet__Sheets.push(Na__DrawingSet__DemoSheet(project, user));
        return doc;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The A1 Demo Sheet: four elevations, the roof plan and a view
    // ------------------------------------------------------------
    function Na__DrawingSet__DemoSheet(project, user) {
        const p = project || {};
        const sheet = Na__DrawingSet__NewSheet({
            name        : 'Elevations, roof plan and view',
            paperSize   : 'A1',
            orientation : 'landscape',
            fields      : {
                Client    : p.title || '',
                Address   : p.address || '',
                Title     : 'Elevations, roof plan and view (demo scene)',
                DrawnBy   : user ? (user.name || '') : '',
                DrawingNo : `${p.code ? p.code + '-' : ''}AURA-01`
            }
        });
        const add = (o) => sheet.Sheet__Viewports.push(Na__DrawingSet__NewViewport(o));
        add({ kind: 'Elevation', side: 'Front', scale: 50,  frame: { X: 30,  Y: 30,  WidthMm: 250, HeightMm: 200 }, title: 'Front Elevation' });
        add({ kind: 'Elevation', side: 'Right', scale: 50,  frame: { X: 300, Y: 30,  WidthMm: 200, HeightMm: 200 }, title: 'Right Side Elevation' });
        add({ kind: 'Plan',                     scale: 100, frame: { X: 520, Y: 30,  WidthMm: 230, HeightMm: 200 }, title: 'Roof Plan' });
        add({ kind: 'Elevation', side: 'Rear',  scale: 50,  frame: { X: 30,  Y: 290, WidthMm: 250, HeightMm: 200 }, title: 'Rear Elevation' });
        add({ kind: 'Elevation', side: 'Left',  scale: 50,  frame: { X: 300, Y: 290, WidthMm: 200, HeightMm: 200 }, title: 'Left Side Elevation' });
        add({ kind: 'Perspective', preset: 'ThreeQuarter', frame: { X: 520, Y: 290, WidthMm: 230, HeightMm: 153 }, title: 'View From the Garden' });
        sheet.Sheet__Annotations.push(Na__DrawingSet__NewAnnotation({
            kind : 'Leader', text: 'Handmade clay plain tiles', at: { X: 175, Y: 246 }, tip: { X: 205, Y: 108 }, width: 70   // <-- Below the front elevation, its arrow on the roof slope
        }));
        return sheet;
    }
    // ------------------------------------------------------------


    // FUNCTION | Tidy a Loaded Document: every key there, every value in range
    // ------------------------------------------------------------
    // A document written by an older AURA, or edited by hand, loads into the
    // shape this version expects; unknown kinds are dropped, never guessed.
    // ------------------------------------------------------------
    function Na__DrawingSet__Normalise(doc, project) {
        const d = (doc && typeof doc === 'object') ? doc : {};
        d.AuraDrawingSet__Meta = Object.assign({ SchemaVersion: Na__DrawingSet__SCHEMA_VERSION, ProjectId: project ? project.id : '' }, d.AuraDrawingSet__Meta || {});
        d.AuraDrawingSet__Engine = Object.assign({ Settings: null }, d.AuraDrawingSet__Engine || {});
        d.AuraDrawingSet__SavedViews = Array.isArray(d.AuraDrawingSet__SavedViews) ? d.AuraDrawingSet__SavedViews.filter((v) => v && v.View__Id && v.View__Camera) : [];
        d.AuraDrawingSet__SavedViews.forEach((v) => { v.View__Points = Na__DrawingSet__CleanPoints(v.View__Points); });
        d.AuraDrawingSet__Engine.WorkingPoints = Na__DrawingSet__CleanPoints(d.AuraDrawingSet__Engine.WorkingPoints);
        const sizes = Na__AppConfig__Get('Sheet__PaperSizes', {});
        const minFrame = Na__AppConfig__Get('Viewport__MinFrameMm', 20);
        d.AuraDrawingSet__Sheets = (Array.isArray(d.AuraDrawingSet__Sheets) ? d.AuraDrawingSet__Sheets : []).filter((s) => s && s.Sheet__Id).map((s) => {
            const sheet = Object.assign(Na__DrawingSet__NewSheet({ name: s.Sheet__Name }), s);
            if (!sizes[sheet.Sheet__PaperSize]) sheet.Sheet__PaperSize = Na__AppConfig__Get('Sheet__DefaultPaperSize', 'A3');
            sheet.Sheet__Orientation = sheet.Sheet__Orientation === 'portrait' ? 'portrait' : 'landscape';
            sheet.Sheet__Fields = Object.assign(Na__DrawingSet__NewSheet({}).Sheet__Fields, s.Sheet__Fields || {});
            Na__DrawingSet__FIELD_KEYS.forEach((k) => { sheet.Sheet__Fields[k] = String(sheet.Sheet__Fields[k] || ''); });
            if (!Array.isArray(sheet.Sheet__Fields.Revisions)) sheet.Sheet__Fields.Revisions = [];
            sheet.Sheet__Viewports = (Array.isArray(s.Sheet__Viewports) ? s.Sheet__Viewports : [])
                .filter((v) => v && v.Viewport__Id && Na__DrawingSet__VIEWPORT_KINDS.includes(v.Viewport__Kind))
                .map((v) => {
                    const f = v.Viewport__FrameMm || {};
                    v.Viewport__FrameMm = {
                        X        : Number(f.X) || 0,
                        Y        : Number(f.Y) || 0,
                        WidthMm  : Math.max(minFrame, Number(f.WidthMm) || minFrame),
                        HeightMm : Math.max(minFrame, Number(f.HeightMm) || minFrame)
                    };
                    if (v.Viewport__Kind !== 'Perspective') v.Viewport__ScaleDenominator = Na__Format__Clamp(Number(v.Viewport__ScaleDenominator) || 50, 1, 5000);
                    v.Viewport__Points = Na__DrawingSet__CleanPoints(v.Viewport__Points);
                    return v;
                });
            sheet.Sheet__Annotations = (Array.isArray(s.Sheet__Annotations) ? s.Sheet__Annotations : [])
                .filter((a) => a && a.Annotation__Id && Na__DrawingSet__ANNOTATION_KINDS.includes(a.Annotation__Kind))
                .map((a) => Object.assign(Na__DrawingSet__NewAnnotation({ kind: a.Annotation__Kind }), a));
            return sheet;
        });
        return d;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Finding Records
// -----------------------------------------------------------------------------

    // FUNCTION | Find a Sheet, a Viewport, an Annotation or a Saved View by Id
    // ------------------------------------------------------------
    function Na__DrawingSet__Sheet(doc, id) {
        return (doc && doc.AuraDrawingSet__Sheets || []).find((s) => s.Sheet__Id === id) || null;
    }

    function Na__DrawingSet__Viewport(sheet, id) {
        return (sheet && sheet.Sheet__Viewports || []).find((v) => v.Viewport__Id === id) || null;
    }

    function Na__DrawingSet__Annotation(sheet, id) {
        return (sheet && sheet.Sheet__Annotations || []).find((a) => a.Annotation__Id === id) || null;
    }

    function Na__DrawingSet__SavedView(doc, id) {
        return (doc && doc.AuraDrawingSet__SavedViews || []).find((v) => v.View__Id === id) || null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__DrawingSet__SCHEMA_VERSION,
        Na__DrawingSet__VIEWPORT_KINDS,
        Na__DrawingSet__FIELD_KEYS,
        Na__DrawingSet__New,
        Na__DrawingSet__NewSheet,
        Na__DrawingSet__NewViewport,
        Na__DrawingSet__NewAnnotation,
        Na__DrawingSet__NewSavedView,
        Na__DrawingSet__CleanPoints,
        Na__DrawingSet__WorkingPoints,
        Na__DrawingSet__SetWorkingPoints,
        Na__DrawingSet__Normalise,
        Na__DrawingSet__Sheet,
        Na__DrawingSet__Viewport,
        Na__DrawingSet__Annotation,
        Na__DrawingSet__SavedView
    };

// endregion -------------------------------------------------------------------
