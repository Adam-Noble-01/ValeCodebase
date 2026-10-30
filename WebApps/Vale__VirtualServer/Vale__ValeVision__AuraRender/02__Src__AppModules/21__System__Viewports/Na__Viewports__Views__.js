// =============================================================================
// VALEVISION AURA - VIEWPORTS - VIEWS AND SCALES
// =============================================================================
//
// FILE       : Na__Viewports__Views__.js
// NAMESPACE  : Na__Views
// MODULE     : Viewports - Views
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : What a viewport looks at: the engine camera for an elevation, the
//              roof plan or a 3D view, how its scale becomes a frame of the world,
//              and how a drag on the sheet pans the world under it
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - TRUE SCALE: the engine draws on a 300 x 200 mm sheet. An orthographic camera
//   whose half-height is (200 mm x scale / 2000) metres puts the world on that
//   sheet at exactly 1:scale (1:100 is a 10 m half-height, the engine's own
//   measured elevation). The still is placed on the AURA sheet at its true 300 x
//   200 mm, centred in the frame, and the frame shows what lies inside it. A
//   scaled frame can therefore be no larger than the engine's sheet.
// - ELEVATIONS look square at a face: yaw 0 front (+Z), 90 right (+X), 180 rear,
//   -90 left; pitch 0. The ROOF PLAN looks straight down (pitch 89.9 so the
//   engine keeps world up), front of the building at the foot of the sheet.
// - CENTRE: a scaled view is centred on the building (its walls, roofs and
//   porch, not the garden) until the view inside it is panned (CentreM).
// - PROFILE: Measured caps the drawing discipline at the engine's measured
//   elevation ceiling (a Natural Pen at most); Concept follows the discipline.
// - ART DIRECTION POINTS are a view's: a 3D viewport of a saved view draws
//   with that view's points, the same set the 3D Environment edits (Adam,
//   30-Oct-2026); every other viewport keeps its own.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.1.0 (AURA 0.3.0)
// - PointsOwner, Points and SetPoints (whose points a viewport draws with),
//   and PictureRect (where the engine's whole sheet lies on the paper, for
//   the point handles over a viewport).
//
// 30-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__Format__Scale } from '../03__AppUtils/Na__AppUtils__Format__.js';
    import { Na__EngineHost__SheetMm, Na__EngineHost__BuildingBounds, Na__EngineHost__PresetCamera } from '../10__System__EngineHost/Na__EngineHost__PainterlyNpr__.js';
    import { Na__DrawingSet__SavedView } from '../40__Feature__DrawingSet/Na__DrawingSet__Model__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Kinds and Labels
// -----------------------------------------------------------------------------

    // FUNCTION | Is This a Scaled (Orthographic) View?
    // ------------------------------------------------------------
    function Na__Views__IsScaled(viewport) {
        return viewport && (viewport.Viewport__Kind === 'Elevation' || viewport.Viewport__Kind === 'Plan');
    }
    // ------------------------------------------------------------


    // FUNCTION | An Elevation's Definition by Side ({ Key, Label, YawDeg })
    // ------------------------------------------------------------
    function Na__Views__Elevation(side) {
        const all = Na__AppConfig__Get('Viewport__Elevations', []);
        return all.find((e) => e.Key === side) || all[0] || { Key: 'Front', Label: 'Front Elevation', YawDeg: 0 };
    }
    // ------------------------------------------------------------


    // FUNCTION | A Viewport's Own Title, Else Its Natural One
    // ------------------------------------------------------------
    function Na__Views__Title(viewport, doc) {
        if (viewport.Viewport__Title) return viewport.Viewport__Title;
        if (viewport.Viewport__Kind === 'Elevation') return Na__Views__Elevation(viewport.Viewport__Side).Label;
        if (viewport.Viewport__Kind === 'Plan') return 'Roof Plan';
        const source = viewport.Viewport__CameraSource || {};
        const saved = source.SavedViewId ? Na__DrawingSet__SavedView(doc, source.SavedViewId) : null;
        return saved ? saved.View__Name : '3D View';
    }

    function Na__Views__ScaleLabel(viewport) {
        return Na__Views__IsScaled(viewport) ? Na__Format__Scale(viewport.Viewport__ScaleDenominator) : '';
    }
    // ------------------------------------------------------------


    // FUNCTION | The Largest Frame a Scaled View Can Have (the engine's sheet)
    // ------------------------------------------------------------
    function Na__Views__MaxScaledFrame() {
        const s = Na__EngineHost__SheetMm();
        return { WidthMm: s.WidthMm, HeightMm: s.HeightMm };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Cameras
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Point a Scaled View Is Centred On (world metres)
    // ------------------------------------------------------------
    function Na__Views__Centre(viewport) {
        if (Array.isArray(viewport.Viewport__CentreM) && viewport.Viewport__CentreM.length === 3) return viewport.Viewport__CentreM.slice();
        const b = Na__EngineHost__BuildingBounds();
        const c = b ? b.Centre.slice() : [0, 4, 0];
        if (viewport.Viewport__Kind === 'Plan') c[1] = 0;                        // <-- Looking down at the ground: the roofs sit just above it
        return c;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Engine Camera for a Viewport (null when its saved view is gone)
    // ------------------------------------------------------------
    function Na__Views__Camera(viewport, doc) {
        const sheetH = Na__EngineHost__SheetMm().HeightMm;
        const measured = viewport.Viewport__Profile !== 'Concept';
        const ceiling = measured ? Na__AppConfig__Get('Viewport__MeasuredCeiling', 0.33) : 1;
        const distance = Na__AppConfig__Get('Viewport__OrthoDistanceM', 60);
        const halfHeight = (sheetH * (Number(viewport.Viewport__ScaleDenominator) || 50)) / 2000;   // <-- 200 mm at 1:50 is 10 m: a 5 m half-height

        if (viewport.Viewport__Kind === 'Elevation') {
            return { Mode: 'Ortho', Yaw: Na__Views__Elevation(viewport.Viewport__Side).YawDeg, Pitch: 0, Distance: distance,
                     Target: Na__Views__Centre(viewport), FovY: 30, HalfHeight: halfHeight, Ceiling: ceiling };
        }
        if (viewport.Viewport__Kind === 'Plan') {
            return { Mode: 'Ortho', Yaw: 0, Pitch: Na__AppConfig__Get('Viewport__PlanPitchDeg', 89.9), Distance: distance,
                     Target: Na__Views__Centre(viewport), FovY: 30, HalfHeight: halfHeight, Ceiling: ceiling };
        }
        const source = viewport.Viewport__CameraSource || {};
        if (source.SavedViewId) {
            const saved = Na__DrawingSet__SavedView(doc, source.SavedViewId);
            if (saved) return JSON.parse(JSON.stringify(saved.View__Camera));
        }
        return Na__EngineHost__PresetCamera(source.Preset || 'ThreeQuarter') || Na__EngineHost__PresetCamera('ThreeQuarter');
    }
    // ------------------------------------------------------------


    // FUNCTION | Pan a Scaled View: a drag of (dx, dy) mm on the sheet moves the world under the frame
    // ------------------------------------------------------------
    // Dragging the picture right shows what lay to its left, so the centre moves
    // against the drag along the view's right; dragging it down shows what lay
    // above, so the centre moves up the view. A plan's "up" on the sheet is -Z.
    // ------------------------------------------------------------
    function Na__Views__Pan(viewport, dxMm, dyMm) {
        const k = (Number(viewport.Viewport__ScaleDenominator) || 50) / 1000;    // <-- Metres in the world per millimetre on the sheet
        const c = Na__Views__Centre(viewport);
        if (viewport.Viewport__Kind === 'Plan') {
            c[0] -= dxMm * k;
            c[2] -= dyMm * k;
        } else {
            const yaw = Na__Views__Elevation(viewport.Viewport__Side).YawDeg * Math.PI / 180;
            const right = [Math.cos(yaw), 0, -Math.sin(yaw)];
            c[0] -= right[0] * dxMm * k;
            c[2] -= right[2] * dxMm * k;
            c[1] += dyMm * k;
        }
        viewport.Viewport__CentreM = c.map((v) => Math.round(v * 1000) / 1000);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Art Direction Points
// -----------------------------------------------------------------------------

    // FUNCTION | Whose Points a Viewport Draws With: { Kind: 'view' | 'viewport', View, Points }
    // ------------------------------------------------------------
    // One set a view (Adam, 30-Oct-2026): a 3D viewport of a saved view draws
    // with the view's own points, edited in the 3D Environment or on any sheet
    // that shows it; elevations, the roof plan and preset views keep their own.
    // ------------------------------------------------------------
    function Na__Views__PointsOwner(viewport, doc) {
        const source = viewport.Viewport__CameraSource || {};
        const saved = viewport.Viewport__Kind === 'Perspective' && source.SavedViewId ? Na__DrawingSet__SavedView(doc, source.SavedViewId) : null;
        if (saved) return { Kind: 'view', View: saved, Points: saved.View__Points || [] };
        return { Kind: 'viewport', View: null, Points: viewport.Viewport__Points || [] };
    }

    function Na__Views__Points(viewport, doc) {
        return Na__Views__PointsOwner(viewport, doc).Points;
    }

    // Write a viewport's points to whoever owns them: 'view' or 'viewport'
    function Na__Views__SetPoints(viewport, doc, points) {
        const owner = Na__Views__PointsOwner(viewport, doc);
        if (owner.View) owner.View.View__Points = points;
        else viewport.Viewport__Points = points;
        return owner.Kind;
    }
    // ------------------------------------------------------------


    // FUNCTION | Where the Engine's Whole Sheet Lies on the Paper for a Viewport: { X, Y, WidthMm, HeightMm }
    // ------------------------------------------------------------
    // As the viewport draws its picture: a scaled view's still at its true 300 x
    // 200 mm centred in the frame (the frame shows what lies inside it); a 3D
    // view's scaled to cover its frame, centred (xMidYMid slice). The point
    // handles lie over this, in the engine's own sheet millimetres.
    // ------------------------------------------------------------
    function Na__Views__PictureRect(viewport) {
        const f = viewport.Viewport__FrameMm;
        const s = Na__EngineHost__SheetMm();
        const cx = f.X + f.WidthMm / 2, cy = f.Y + f.HeightMm / 2;
        const k = Na__Views__IsScaled(viewport) ? 1 : Math.max(f.WidthMm / s.WidthMm, f.HeightMm / s.HeightMm);
        return { X: cx - (s.WidthMm * k) / 2, Y: cy - (s.HeightMm * k) / 2, WidthMm: s.WidthMm * k, HeightMm: s.HeightMm * k };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Views__IsScaled,
        Na__Views__Elevation,
        Na__Views__Title,
        Na__Views__ScaleLabel,
        Na__Views__MaxScaledFrame,
        Na__Views__Camera,
        Na__Views__Pan,
        Na__Views__PointsOwner,
        Na__Views__Points,
        Na__Views__SetPoints,
        Na__Views__PictureRect
    };

// endregion -------------------------------------------------------------------
