/* =============================================================================
   VGHLANTERN - SPECIFICATION | GLAZING SCHEDULE
   =============================================================================

   FILE       : VghLantern__Specification__GlazingSchedule__.js
   NAMESPACE  : VghLantern
   MODULE     : System - Specification - GlazingSchedule
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build each lantern's glazing schedule - the coded plan and the cut drawings - on demand
   CREATED    : 20-Oct-2026

   DESCRIPTION:
   - The glazing department's sheet for one lantern, as data: a simplified top-down
     plan with a circular GZ bubble on every panel, and one row per panel type with
     its straight-on cut drawing, code, quantity, cut sizes and glass build-up.
   - Every panel comes from VghLantern__Geometry__GlazingPanelLayout, the one place
     the glass is cut. Nothing here measures or re-derives a panel: it lays the
     layout's answer out on paper and rounds it for the glazier.
   - The two diagrams are described ONCE, as paper-millimetre primitives (Polygon,
     Polyline, Circle, Text), and VghLantern__Specification__GlazingScheduleRenderer
     draws that one description twice: SVG on screen and in the preview, native
     vector in the PDF. The drawing sheet's titleblock works the same way and for the
     same reason - a thing described in one place cannot drift.

   ---------------------------------------------------------------------------

   BUILT ON DEMAND, AND ONLY THERE

   Adam (20-Oct-2026): "Ensure these arent generated until that tab is entered though
   as to not waste compute so only compute the glass panel drawings diagram and table
   when the specf section opens and as a failsafe when the end pack is compiled".

   So nothing here runs at boot, on a lantern edit, or inside the shared
   specification document model (Preview and Send rebuilds that model once per page).
   The only callers are the Specification tab's Glazing Panels section and the pack's
   Glazing Schedule page, in the preview and in the export, and each asks for a
   lantern's schedule at the moment it draws it. A schedule is cached against the
   lantern blocks it depends on, so an unchanged lantern is never cut or drawn twice,
   and a pack compiled after the tab was opened reuses what the tab built.

   ---------------------------------------------------------------------------

   ROUNDING AND BUILD-UPS

   Cut sizes and edge lengths are rounded DOWN to the whole millimetre (Adam,
   20-Oct-2026), so a pane is never listed bigger than it was designed and the 3mm
   clearance stays at least 3mm; angles print to 0.1 degree. Both rules are config.

   Glass type, thickness and cavity come from the lantern's glazing spec and tint and
   that spec's build-up in VghLantern__Glazing__Options__Config__BuildUps. Those
   build-ups are PROVISIONAL typical values until Vale's glazing panel design gives
   the real ones (Adam chose that over leaving the columns blank), and every
   provisional value prints with a marker and a note saying so.

   ---------------------------------------------------------------------------

   OUTPUT CONTRACT - GlazingSchedule (one lantern):

   {
       Key, IsValid, Message,
       PanelCount, TypeCount,
       GlassType, GlassPanes, ThicknessText, CavityText, IsProvisional, HasBuildUp,
       Plan  : { WidthMm, HeightMm, Primitives },
       Rows  : [ { Code, Quantity, LengthText, UnitLengthText, WidthText, UnitWidthText,
                   Drawing : { WidthMm, HeightMm, Primitives } } ],
       Warnings : []
   }

   Primitives are in paper millimetres, origin top left, y down the page:
       { Kind:'Polygon',  Points:[[x,y]...], Fill|null, Stroke|null, StrokeMm, Dash|null, Ref }
       { Kind:'Polyline', Points:[[x,y]...], Stroke, StrokeMm, Dash|null }
       { Kind:'Circle',   Cx, Cy, R, Fill|null, Stroke|null, StrokeMm, Ref }
       { Kind:'Text',     X, BaselineY, Text, FontMm, Weight, Colour, Align }
   Ref names the panel a plan polygon or bubble belongs to, for checks; renderers
   ignore it. The schedule is shared from the cache: treat it as read only.

   ============================================================================= */

// =============================================================================
// REGION | Glazing Schedule Module
// =============================================================================

const VghLantern__Specification__GlazingSchedule = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Project, Lantern and Config Keys
    // ------------------------------------------------------------
    const PROJECT_LANTERNS     =  'VghLantern__ProjectFile__Lanterns';
    const BLOCK_FINISH         =  'Lantern__FinishAndGlazing__Config';
    const FIELD_GLAZING_SPEC   =  'Lantern__FinishAndGlazing__Config__GlazingSpec';
    const FIELD_GLAZING_TINT   =  'Lantern__FinishAndGlazing__Config__GlazingTint';
    const SCHEDULE_CONFIG_KEY  =  'VghLantern__Specification__Config__GlazingSchedule';
    const GLAZING_OPTIONS_SECTION  =  'GlazingOptions';                        // <-- ConfigLoader's name for VghLantern__Glazing__Options__Config
    const BUILD_UPS_KEY        =  'VghLantern__Glazing__Options__Config__BuildUps';
    const CONFIG_LABEL         =  'Na__Specification__Config.json -> ' + SCHEDULE_CONFIG_KEY;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Lantern Blocks a Schedule Depends On
    // ------------------------------------------------------------
    // The cache key. Everything that moves a panel or changes what the table prints
    // is in one of these; drawing layout, notes and the stored projected linework are
    // not, so editing a note or re-projecting a drawing never rebuilds a schedule.
    const KEY_BLOCKS  =  [
        'Lantern__Form__Config',
        'Lantern__Dimensions__Config',
        'Lantern__RoofPitch__Config',
        'Lantern__GlazingBars__Config',
        'Lantern__BuildersUpstandAndBase__Config',
        'Lantern__FinishAndGlazing__Config'
    ];
    const CACHE_LIMIT  =  16;                                                  // <-- A few projects' worth of lanterns; each schedule is small
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Primitive Kinds
    // ------------------------------------------------------------
    const KIND_POLYGON   =  'Polygon';
    const KIND_POLYLINE  =  'Polyline';
    const KIND_CIRCLE    =  'Circle';
    const KIND_TEXT      =  'Text';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Typography and Geometry Guards
    // ------------------------------------------------------------
    const CAP_HEIGHT_RATIO   =  0.717;                                          // <-- Helvetica cap height as a fraction of type size, as SheetChrome centres type
    const AVERAGE_ADVANCE    =  0.56;                                           // <-- Average Helvetica advance per character, as a fraction of type size
    const ROUND_GUARD        =  1e-6;                                           // <-- So 1274.9999999 floors to 1275, not 1274
    const POLE_STEPS         =  6;                                              // <-- Grid refinements in the pole search; each one thirds the cell
    const POLE_GRID          =  4;                                              // <-- Cells either side of the current best per refinement
    const POLE_GAIN_MM       =  1e-6;                                           // <-- A pole move must gain more than this (model mm): rounding is not a gain
    const LABEL_CLEAR_MM     =  0.4;                                            // <-- Paper clearance between an angle label and the lines around it
    const LINE_ROOM_STEPS    =  32;                                             // <-- Halvings in the largest-bubble-on-a-line search: far finer than print
    const LINE_SPILL_ROOM    =  0.75;                                           // <-- Share of a minimum-size bubble's radius that must fit for it to stay on its line
    const ARC_SEGMENTS       =  10;                                             // <-- Chords in an angle mark's arc
    const RAD_TO_DEG         =  180 / Math.PI;
    const SQMM_PER_SQM       =  1e6;                                            // <-- A unit conversion, not a design value
    // ------------------------------------------------------------


    // MODULE VARIABLES | Schedule Cache
    // ------------------------------------------------------------
    // Most recently used last. BuildCount counts real builds, not cache hits, so a
    // check can prove the cache is doing its job and that nothing built one early.
    let VghLantern__GlazingSchedule__Cache       =  [];
    let VghLantern__GlazingSchedule__BuildCount  =  0;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Glazing Schedule Config Block
    // ------------------------------------------------------------
    function VghLantern__GlazingSchedule__Config() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};
        var spec  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('Specification') || {};
        return spec[SCHEDULE_CONFIG_KEY] || {};
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Resolve Every Value the Diagrams Use, Once Per Build
    // ------------------------------------------------------------
    // Read up front through the strict Require readers rather than per primitive, so
    // a missing key is reported once rather than once per panel.
    function VghLantern__GlazingSchedule__ResolveStyle() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var cfg     =  VghLantern__GlazingSchedule__Config();
        var plan    =  cfg.Plan    || {};
        var draw    =  cfg.Drawing || {};
        var Num     =  function(block, key) { return ConfigLoader.VghLantern__ConfigLoader__RequireNumber(block, key, CONFIG_LABEL); };
        var Str     =  function(block, key) { return ConfigLoader.VghLantern__ConfigLoader__RequireString(block, key, CONFIG_LABEL); };

        return {
            RoundDown          : ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(cfg, 'RoundSizesDown', CONFIG_LABEL),
            AngleDp            : Num(cfg, 'AngleDecimalPlaces'),
            SquareTolerance    : Num(cfg, 'SquareCornerToleranceDegrees'),
            Ink                : Str(cfg, 'InkColour'),
            GlassFill          : Str(cfg, 'GlassFillColour'),
            Upstand            : Str(cfg, 'UpstandColour'),
            Dimension          : Str(cfg, 'DimensionColour'),
            StepLine           : Str(cfg, 'StepLineColour'),
            BubbleFill         : Str(cfg, 'BubbleFillColour'),
            UnitPrefix         : String(cfg.UnitPrefix === undefined ? '' : cfg.UnitPrefix),
            AreaDp             : Num(cfg, 'AreaDecimalPlaces'),
            AreaSuffix         : String(cfg.AreaUnitSuffix === undefined ? '' : cfg.AreaUnitSuffix),
            TotalLabel         : Str(cfg, 'TotalLabel'),
            Marker             : Str(cfg, 'ProvisionalMarker'),
            NoBuildUp          : Str(cfg, 'NoBuildUpText'),
            EmptyMessage       : Str(cfg, 'EmptyMessage'),
            Plan : {
                MaxWidthMm       : Num(plan, 'MaxWidthMm'),
                MaxHeightMm      : Num(plan, 'MaxHeightMm'),
                PaddingMm        : Num(plan, 'PaddingMm'),
                UpstandLineMm    : Num(plan, 'UpstandLineMm'),
                PanelLineMm      : Num(plan, 'PanelLineMm'),
                BubbleLineMm     : Num(plan, 'BubbleLineMm'),
                BubbleMinMm      : Num(plan, 'BubbleMinRadiusMm'),
                BubbleMaxMm      : Num(plan, 'BubbleMaxRadiusMm'),
                BubbleFill       : Num(plan, 'BubbleFillFactor'),
                BubbleFont       : Num(plan, 'BubbleFontFactor'),
                BubbleLineOffset : Num(plan, 'BubbleLineOffsetFactor'),
                BubbleLineFit    : Num(plan, 'BubbleLineFitFactor'),
                FrontLabel       : Str(plan, 'FrontLabel'),
                FrontFontMm      : Num(plan, 'FrontLabelFontMm'),
                FrontGapMm       : Num(plan, 'FrontLabelGapMm')
            },
            Drawing : {
                CellWidthMm      : Num(draw, 'CellWidthMm'),
                CellHeightMm     : Num(draw, 'CellHeightMm'),
                MarginLeftMm     : Num(draw, 'MarginLeftMm'),
                MarginRightMm    : Num(draw, 'MarginRightMm'),
                MarginTopMm      : Num(draw, 'MarginTopMm'),
                MarginBottomMm   : Num(draw, 'MarginBottomMm'),
                OutlineMm        : Num(draw, 'OutlineMm'),
                StepLineMm       : Num(draw, 'StepLineMm'),
                StepDash         : ConfigLoader.VghLantern__ConfigLoader__RequireArray(draw, 'StepDashMm', CONFIG_LABEL),
                DimLineMm        : Num(draw, 'DimLineMm'),
                DimTickMm        : Num(draw, 'DimTickMm'),
                DimOffsetMm      : Num(draw, 'DimOffsetMm'),
                DimFontMm        : Num(draw, 'DimFontMm'),
                EdgeFontMm       : Num(draw, 'EdgeFontMm'),
                EdgeGapMm        : Num(draw, 'EdgeGapMm'),
                AngleFontMm      : Num(draw, 'AngleFontMm'),
                ArcRadiusMm      : Num(draw, 'AngleArcRadiusMm'),
                AngleTextMm      : Num(draw, 'AngleTextRadiusMm'),
                MinDrawnWidthMm  : Num(draw, 'MinDrawnWidthMm'),
                BreakGapMm       : Num(draw, 'BreakGapMm'),
                BreakKeepMm      : Num(draw, 'BreakKeepMm'),
                BreakZigMm       : Num(draw, 'BreakZigMm'),
                BreakOverrunMm   : Num(draw, 'BreakOverrunMm'),
                BreakLineMm      : Num(draw, 'BreakLineMm')
            }
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rounding and Text
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Cut Size as the Glazier Reads It
    // ------------------------------------------------------------
    function VghLantern__GlazingSchedule__Mm(value, style) {
        var number  =  Number(value) || 0;
        return String(style.RoundDown ? Math.floor(number + ROUND_GUARD) : Math.round(number));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | An Area in Square Metres, as the Schedule Prints It
    // ------------------------------------------------------------
    // Nearest, not floored: an area is a quantity to order and price, not a cut size.
    function VghLantern__GlazingSchedule__SqM(valueSqMm, style) {
        return ((Number(valueSqMm) || 0) / SQMM_PER_SQM).toFixed(style.AreaDp);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Cut Angle as the Glazier Reads It
    // ------------------------------------------------------------
    // The degree sign is in WinAnsi, which is what jsPDF's standard Helvetica encodes.
    // Written as an escape so the source stays ASCII like the rest of the app.
    function VghLantern__GlazingSchedule__Degrees(value, style) {
        return (Number(value) || 0).toFixed(style.AngleDp) + '\u00B0';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Estimate a Text Run's Width in Paper Millimetres
    // ------------------------------------------------------------
    // Used only to keep a label clear of the outline it names, never to truncate, so
    // the average Helvetica advance is close enough and needs no measuring document.
    function VghLantern__GlazingSchedule__TextWidthMm(text, fontMm) {
        return String(text).length * fontMm * AVERAGE_ADVANCE;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Push One Text Primitive at an Absolute Baseline
    // ------------------------------------------------------------
    function VghLantern__GlazingSchedule__PushText(list, x, baselineY, text, fontMm, colour, align, weight) {
        if (text === undefined || text === null || text === '') return;
        list.push({
            Kind      : KIND_TEXT,
            X         : x,
            BaselineY : baselineY,
            Text      : String(text),
            FontMm    : fontMm,
            Weight    : weight === 'bold' ? 'bold' : 'normal',
            Colour    : colour,
            Align     : align || 'left'
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Push Text Centred on a Point, Optically
    // ------------------------------------------------------------
    function VghLantern__GlazingSchedule__PushCentredText(list, x, y, text, fontMm, colour, weight) {
        VghLantern__GlazingSchedule__PushText(list, x, y + ((fontMm * CAP_HEIGHT_RATIO) / 2), text, fontMm, colour, 'center', weight);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Glass Build-Up
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Millimetre Figure Without a Trailing .0
    // ------------------------------------------------------------
    function VghLantern__GlazingSchedule__Figure(value) {
        var number  =  Number(value) || 0;
        return (Math.round(number * 10) / 10).toString();
    }
    // ------------------------------------------------------------


    // FUNCTION | Describe the Glass a Glazing Spec Is Built Up From
    // ------------------------------------------------------------
    // Returns { HasBuildUp, IsProvisional, Panes, ThicknessMm, ThicknessText,
    // CavityText } from the build-up table. A spec with no entry has no build-up:
    // the schedule prints the configured placeholder rather than a guess.
    function VghLantern__Specification__GlazingSchedule__DescribeBuildUp(glazingSpec) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var options       =  ConfigLoader ? (ConfigLoader.VghLantern__ConfigLoader__GetSection(GLAZING_OPTIONS_SECTION) || {}) : {};
        var table         =  options[BUILD_UPS_KEY] || {};
        var entry         =  glazingSpec ? table[glazingSpec] : null;

        if (!entry || !Array.isArray(entry.Layers) || entry.Layers.length === 0) {
            return { HasBuildUp : false, IsProvisional : false, Panes : '', ThicknessMm : 0, ThicknessText : '', CavityText : '' };
        }

        var panes     =  [];
        var cavities  =  [];
        var total     =  0;
        var i, layer;

        for (i = 0; i < entry.Layers.length; i++) {
            layer  =  entry.Layers[i] || {};
            if (layer.Kind === 'pane') {
                total  +=  Number(layer.ThicknessMm) || 0;
                panes.push(VghLantern__GlazingSchedule__Figure(layer.ThicknessMm) + ' ' + (layer.Glass || ''));
            } else if (layer.Kind === 'cavity') {
                total  +=  Number(layer.WidthMm) || 0;
                cavities.push({ WidthMm : Number(layer.WidthMm) || 0, Fill : layer.Fill || '' });
            }
        }

        // Two identical cavities read as "2 x 8 mm argon filled", the way a triple
        // unit is ordered; differing ones are listed outside to inside.
        var cavityText  =  '';
        if (cavities.length) {
            var allSame  =  cavities.every(function(c) { return c.WidthMm === cavities[0].WidthMm && c.Fill === cavities[0].Fill; });
            var one      =  function(c) { return VghLantern__GlazingSchedule__Figure(c.WidthMm) + ' mm ' + (c.Fill ? c.Fill + ' filled' : ''); };
            cavityText   =  (allSame && cavities.length > 1)
                ? cavities.length + ' x ' + one(cavities[0])
                : cavities.map(one).join(' / ');
        }

        return {
            HasBuildUp    : true,
            IsProvisional : entry.Provisional === true,
            Panes         : panes.join(' / '),
            ThicknessMm   : total,
            ThicknessText : VghLantern__GlazingSchedule__Figure(total) + ' mm',
            CavityText    : cavityText.trim()
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Planar Helpers (Paper or Model Millimetres)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Bounding Box of a Point List ({x, y})
    // ------------------------------------------------------------
    function VghLantern__GlazingSchedule__Bounds(points) {
        var box  =  { MinX : Infinity, MaxX : -Infinity, MinY : Infinity, MaxY : -Infinity };
        var i;
        for (i = 0; i < points.length; i++) {
            box.MinX  =  Math.min(box.MinX, points[i].x);
            box.MaxX  =  Math.max(box.MaxX, points[i].x);
            box.MinY  =  Math.min(box.MinY, points[i].y);
            box.MaxY  =  Math.max(box.MaxY, points[i].y);
        }
        return box;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Distance From a Point Inside a Convex Ring to Its Boundary
    // ------------------------------------------------------------
    // Returns a negative number for a point outside, so the pole search can tell the
    // two apart with one call. Works for either winding.
    function VghLantern__GlazingSchedule__InsetDistance(ring, x, y) {
        var area  =  0;
        var i, a, b;
        for (i = 0; i < ring.length; i++) {
            a  =  ring[i]; b  =  ring[(i + 1) % ring.length];
            area  +=  (a.x * b.y) - (b.x * a.y);
        }
        var sign  =  area >= 0 ? 1 : -1;
        var best  =  Infinity;
        var len, d;

        for (i = 0; i < ring.length; i++) {
            a    =  ring[i]; b  =  ring[(i + 1) % ring.length];
            len  =  Math.hypot(b.x - a.x, b.y - a.y);
            if (len <= 0) continue;
            d     =  sign * (((b.x - a.x) * (y - a.y)) - ((b.y - a.y) * (x - a.x))) / len;
            best  =  Math.min(best, d);
        }
        return best;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Area Centroid of a Ring ({x, y})
    // ------------------------------------------------------------
    // The centre of a rectangle whatever points its outline repeats, where a
    // vertex average would lean towards the end with more corners.
    function VghLantern__GlazingSchedule__Centroid(ring) {
        var area  =  0, cx  =  0, cy  =  0;
        var i, p, q, cross;

        for (i = 0; i < ring.length; i++) {
            p      =  ring[i];
            q      =  ring[(i + 1) % ring.length];
            cross  =  (p.x * q.y) - (q.x * p.y);
            area  +=  cross;
            cx    +=  (p.x + q.x) * cross;
            cy    +=  (p.y + q.y) * cross;
        }

        if (Math.abs(area) < 1e-9) {
            cx  =  0; cy  =  0;
            for (i = 0; i < ring.length; i++) { cx += ring[i].x; cy += ring[i].y; }
            return { x : cx / ring.length, y : cy / ring.length };
        }
        return { x : cx / (3 * area), y : cy / (3 * area) };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Point of a Convex Ring Furthest From Its Edges
    // ------------------------------------------------------------
    // How big a bubble a panel holds at its widest, and where a bubble goes in a
    // panel too small to hold it on its slope's line. For a triangle it is the
    // incentre, which is why the centroid alone is not used: it sits a third of the
    // way up a sliver. A refining grid around the best point so far, which a convex
    // ring makes safe, starting from the centroid.
    //
    // A move must GAIN, by more than rounding: along the middle of a rectangle every
    // point is as far from the long sides as the centre, and accepting rounding noise
    // as a gain once scattered identical panels' bubbles up and down the plan.
    function VghLantern__GlazingSchedule__Pole(ring) {
        var box    =  VghLantern__GlazingSchedule__Bounds(ring);
        var best   =  VghLantern__GlazingSchedule__Centroid(ring);
        var bestD  =  VghLantern__GlazingSchedule__InsetDistance(ring, best.x, best.y);
        var i, step, gx, gy, x, y, d;

        var cell  =  Math.max(box.MaxX - box.MinX, box.MaxY - box.MinY) / (POLE_GRID * 2);
        for (step = 0; step < POLE_STEPS; step++) {
            var centre  =  { x : best.x, y : best.y };
            for (gx = -POLE_GRID; gx <= POLE_GRID; gx++) {
                for (gy = -POLE_GRID; gy <= POLE_GRID; gy++) {
                    x  =  centre.x + (gx * cell);
                    y  =  centre.y + (gy * cell);
                    d  =  VghLantern__GlazingSchedule__InsetDistance(ring, x, y);
                    if (d > bestD + POLE_GAIN_MM) { bestD  =  d; best  =  { x : x, y : y }; }
                }
            }
            cell  /=  3;
        }

        return { Point : best, DistanceMm : Math.max(0, bestD) };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Plan Diagram
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Where a Line Across a Convex Ring Enters and Leaves It
    // ------------------------------------------------------------
    // The line is every plan point p with p.u = level. Returns the two crossing
    // points, or null where the line misses the ring or only touches a corner.
    function VghLantern__GlazingSchedule__ChordAt(ring, u, level) {
        var hits  =  [];
        var i, a, b, da, db, t;

        for (i = 0; i < ring.length; i++) {
            a   =  ring[i];
            b   =  ring[(i + 1) % ring.length];
            da  =  (a.x * u.x) + (a.y * u.y) - level;
            db  =  (b.x * u.x) + (b.y * u.y) - level;
            if ((da < 0 && db < 0) || (da > 0 && db > 0) || da === db) continue;
            t  =  da / (da - db);
            hits.push({ x : a.x + ((b.x - a.x) * t), y : a.y + ((b.y - a.y) * t) });
        }

        if (hits.length < 2) return null;
        hits.sort(function(p, q) { return (p.x - q.x) || (p.y - q.y); });
        var first  =  hits[0];
        var last   =  hits[hits.length - 1];
        return Math.hypot(last.x - first.x, last.y - first.y) > 1e-6 ? [first, last] : null;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Line Each Panel's Bubble Sits On
    // ------------------------------------------------------------
    // Adam, 20-Oct-2026: "Set all bubbles in consistent lines". Each slope's bubbles
    // sit on one line parallel to its eaves, a set number of bubble radii in from
    // the eaves edge, each centred along the line within its own panel, so round the
    // plan they read as one ring just inside the eaves. Panels above a transom are a
    // row of their own and line up a step above the transom in the same way.
    //
    // Returns, per panel, { U, Eaves }: the plan direction up its slope and where its
    // row's eaves edge lies along it (p.U = Eaves), or null for a slope with no "up"
    // in plan, which a lantern never has.
    function VghLantern__GlazingSchedule__BubbleLines(panelSet, rings) {
        var groups  =  {};
        var lines   =  [];

        panelSet.Panels.forEach(function(panel, i) {
            var key  =  panel.FaceId + '|' + panel.RowIndex;
            (groups[key]  =  groups[key] || []).push(i);
        });

        Object.keys(groups).forEach(function(key) {
            var members  =  groups[key];
            var axisY    =  panelSet.Panels[members[0]].Frame.AxisY;
            var length   =  Math.hypot(axisY.x, axisY.y);
            if (length < 1e-9) {
                members.forEach(function(i) { lines[i]  =  null; });
                return;
            }

            var u      =  { x : axisY.x / length, y : axisY.y / length };
            var eaves  =  Infinity;
            members.forEach(function(i) {
                rings[i].forEach(function(p) { eaves  =  Math.min(eaves, (p.x * u.x) + (p.y * u.y)); });
            });
            members.forEach(function(i) { lines[i]  =  { U : u, Eaves : eaves }; });
        });

        return lines;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Where a Bubble of a Given Radius Sits on Its Panel's Line
    // ------------------------------------------------------------
    // The middle of the panel's chord along the line offsetFactor radii in from the
    // eaves, or null where less than roomFraction of the radius fits inside the panel
    // there (1 asks for the whole bubble).
    function VghLantern__GlazingSchedule__LinePoint(ring, line, radiusModel, offsetFactor, roomFraction) {
        var chord  =  VghLantern__GlazingSchedule__ChordAt(ring, line.U, line.Eaves + (radiusModel * offsetFactor));
        if (!chord) return null;
        var centre  =  { x : (chord[0].x + chord[1].x) / 2, y : (chord[0].y + chord[1].y) / 2 };
        return VghLantern__GlazingSchedule__InsetDistance(ring, centre.x, centre.y) >= (radiusModel * roomFraction) - 1e-6 ? centre : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Largest Bubble a Panel Holds on Its Line
    // ------------------------------------------------------------
    // The line moves in from the eaves as the bubble grows, because it sits a set
    // number of radii in, so the answer is found by halving between nothing and
    // upperModel. In a corner triangle that is where the bubble meets the hip.
    function VghLantern__GlazingSchedule__LineRoom(ring, line, offsetFactor, upperModel) {
        var lo  =  0;
        var hi  =  upperModel;
        var k, r;

        for (k = 0; k < LINE_ROOM_STEPS; k++) {
            r  =  (lo + hi) / 2;
            if (VghLantern__GlazingSchedule__LinePoint(ring, line, r, offsetFactor, 1)) lo  =  r;
            else                                                                        hi  =  r;
        }
        return lo;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Coded Top-Down Plan
    // ------------------------------------------------------------
    // Model plan to paper: x to the right, model +Y UP the page, so the front (-Y)
    // is the bottom edge, as on the drawing's plan view. Fitted inside the configured
    // box rather than drawn to a scale: the plan identifies panels, the table sizes
    // them. Each panel is drawn as its top pane outline seen from above (the glass
    // a person standing over the roof sees), inside the outer upstand outline.
    function VghLantern__GlazingSchedule__BuildPlan(panelSet, skeleton, style) {
        var cfg       =  style.Plan;
        var meta      =  skeleton.Meta || {};
        var halfW     =  (Number(meta.WidthMm) || 0) / 2;
        var halfD     =  (Number(meta.DepthMm) || 0) / 2;
        var upstand   =  [{ x : -halfW, y : -halfD }, { x : halfW, y : -halfD }, { x : halfW, y : halfD }, { x : -halfW, y : halfD }];
        var rings     =  panelSet.Panels.map(function(panel) {
            return panel.OuterOutline3d.map(function(p) { return { x : p.x, y : p.y }; });
        });

        var all  =  upstand.slice();
        rings.forEach(function(ring) { all  =  all.concat(ring); });
        var box  =  VghLantern__GlazingSchedule__Bounds(all);

        var frontBandMm  =  cfg.FrontGapMm + (cfg.FrontFontMm * CAP_HEIGHT_RATIO);
        var spanX        =  Math.max(1, box.MaxX - box.MinX);
        var spanY        =  Math.max(1, box.MaxY - box.MinY);
        var scale        =  Math.min((cfg.MaxWidthMm  - (cfg.PaddingMm * 2)) / spanX,
                                     (cfg.MaxHeightMm - (cfg.PaddingMm * 2) - frontBandMm) / spanY);

        var widthMm   =  (spanX * scale) + (cfg.PaddingMm * 2);
        var heightMm  =  (spanY * scale) + (cfg.PaddingMm * 2) + frontBandMm;
        var toPaper   =  function(p) { return [cfg.PaddingMm + ((p.x - box.MinX) * scale), cfg.PaddingMm + ((box.MaxY - p.y) * scale)]; };

        var primitives  =  [];

        primitives.push({ Kind : KIND_POLYGON, Points : upstand.map(toPaper), Fill : null,
                          Stroke : style.Upstand, StrokeMm : cfg.UpstandLineMm, Dash : null, Ref : 'upstand' });

        // Every bubble is one size, so a big roof does not print bubbles of a dozen
        // sizes: the smallest of what the tightest panel holds at its widest point
        // and what the tightest panel holds on its line (a corner triangle, where the
        // line meets the hip), each with its clearance, held between the configured
        // radii. Held up at the minimum, a bubble may cross its panel's edge a little
        // to stay on its line (LINE_SPILL_ROOM of it inside): a row that steps for
        // one small corner piece is what Adam asked to be rid of. Only a panel that
        // cannot hold even that keeps its bubble at its widest point, off the line.
        var poles     =  rings.map(VghLantern__GlazingSchedule__Pole);
        var lines     =  VghLantern__GlazingSchedule__BubbleLines(panelSet, rings);
        var minInset  =  Infinity;
        var lineRoom  =  Infinity;
        poles.forEach(function(pole) { minInset  =  Math.min(minInset, pole.DistanceMm * scale); });
        rings.forEach(function(ring, i) {
            if (!lines[i]) return;
            var room  =  VghLantern__GlazingSchedule__LineRoom(ring, lines[i], cfg.BubbleLineOffset, cfg.BubbleMaxMm / scale);
            if (room > 0) lineRoom  =  Math.min(lineRoom, room * scale);
        });
        var radius  =  Math.max(cfg.BubbleMinMm, Math.min(cfg.BubbleMaxMm, minInset * cfg.BubbleFill, lineRoom * cfg.BubbleLineFit));
        var fontMm  =  radius * cfg.BubbleFont;
        var centres =  rings.map(function(ring, i) {
            var point  =  lines[i] ? VghLantern__GlazingSchedule__LinePoint(ring, lines[i], radius / scale, cfg.BubbleLineOffset, LINE_SPILL_ROOM) : null;
            return point || poles[i].Point;
        });

        panelSet.Panels.forEach(function(panel, i) {
            primitives.push({ Kind : KIND_POLYGON, Points : rings[i].map(toPaper), Fill : style.GlassFill,
                              Stroke : style.Ink, StrokeMm : cfg.PanelLineMm, Dash : null, Ref : panel.Id });
        });

        panelSet.Panels.forEach(function(panel, i) {
            var centre  =  toPaper(centres[i]);
            primitives.push({ Kind : KIND_CIRCLE, Cx : centre[0], Cy : centre[1], R : radius,
                              Fill : style.BubbleFill, Stroke : style.Ink, StrokeMm : cfg.BubbleLineMm, Ref : panel.Id });
            VghLantern__GlazingSchedule__PushCentredText(primitives, centre[0], centre[1], panel.Code, fontMm, style.Ink, 'bold');
        });

        // FRONT | Under the plan, in the band reserved for it: its baseline is the
        // bottom of that band, one padding up from the foot of the diagram.
        VghLantern__GlazingSchedule__PushText(primitives, widthMm / 2, heightMm - cfg.PaddingMm,
            cfg.FrontLabel, cfg.FrontFontMm, style.Upstand, 'center', 'bold');

        return { WidthMm : widthMm, HeightMm : heightMm, ScaleFactor : scale, BubbleRadiusMm : radius, Primitives : primitives };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Cut Drawing of One Panel Type
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Whether Any Edge of a Paper Ring Crosses a Box
    // ------------------------------------------------------------
    // Each edge clipped against the box (Liang-Barsky); a label box that no edge
    // enters sits clear of the outline.
    function VghLantern__GlazingSchedule__BoxCrossesRing(x0, y0, x1, y1, ring) {
        var i, k, a, b, dx, dy, t0, t1, p, q, r, hit;

        for (i = 0; i < ring.length; i++) {
            a   =  ring[i];
            b   =  ring[(i + 1) % ring.length];
            dx  =  b[0] - a[0];
            dy  =  b[1] - a[1];
            p   =  [-dx, dx, -dy, dy];
            q   =  [a[0] - x0, x1 - a[0], a[1] - y0, y1 - a[1]];
            t0  =  0;
            t1  =  1;
            hit =  true;

            for (k = 0; k < 4 && hit; k++) {
                if (p[k] === 0) {
                    if (q[k] < 0) hit  =  false;
                    continue;
                }
                r  =  q[k] / p[k];
                if (p[k] < 0) { if (r > t1) hit  =  false; else if (r > t0) t0  =  r; }
                else          { if (r < t0) hit  =  false; else if (r < t1) t1  =  r; }
            }
            if (hit) return true;
        }
        return false;
    }
    // ------------------------------------------------------------

    // SUB FUNCTION | A Dimension Line With the Vale 45 Degree Ticks
    // ------------------------------------------------------------
    // Drawn between two paper points, with its ticks slashed ACROSS the line the way
    // every Vale dimension is terminated.
    function VghLantern__GlazingSchedule__PushDimension(list, x1, y1, x2, y2, draw, colour) {
        var t  =  draw.DimTickMm / 2;
        list.push({ Kind : KIND_POLYLINE, Points : [[x1, y1], [x2, y2]], Stroke : colour, StrokeMm : draw.DimLineMm, Dash : null });
        list.push({ Kind : KIND_POLYLINE, Points : [[x1 - t, y1 + t], [x1 + t, y1 - t]], Stroke : colour, StrokeMm : draw.DimLineMm, Dash : null });
        list.push({ Kind : KIND_POLYLINE, Points : [[x2 - t, y2 + t], [x2 + t, y2 - t]], Stroke : colour, StrokeMm : draw.DimLineMm, Dash : null });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Label Every Cut Edge the Overall Dimensions Do Not Already Give
    // ------------------------------------------------------------
    // A square edge spanning the whole panel is already the overall width or length;
    // every other edge is a cut the glazier sets out, so it gets its own length, set
    // just outside its midpoint and anchored away from the glass. The one exception is
    // a part-length upright edge on the side the overall length is dimensioned on,
    // whose label would print across that dimension line: it goes inside instead.
    function VghLantern__GlazingSchedule__PushEdgeLabels(list, ring, edges, frame, draw, style) {
        var i, a, b, dx, dy, len, nx, ny, mx, my, align, x, baseline, text;

        for (i = 0; i < ring.length; i++) {
            a    =  ring[i];
            b    =  ring[(i + 1) % ring.length];
            dx   =  b[0] - a[0];
            dy   =  b[1] - a[1];
            len  =  Math.hypot(dx, dy);
            if (len <= 0) continue;

            var isHorizontal  =  Math.abs(dy) < 1e-6;
            var isVertical    =  Math.abs(dx) < 1e-6;
            var spansWidth    =  isHorizontal && Math.abs(Math.abs(dx) - frame.WidthPaper) < 1e-6;
            var spansLength   =  isVertical   && Math.abs(Math.abs(dy) - frame.LengthPaper) < 1e-6;
            if (spansWidth || spansLength) continue;

            // OUTWARD on paper. The panel ring winds anticlockwise in the glass plane
            // (y up the slope); turned onto the page (y down) the same corner order
            // winds the other way, which puts the outside at (-dy, dx) of each edge.
            // Worked: the eaves edge runs left to right along the bottom of the
            // drawing, so (-dy, dx) = (0, +1), straight down the page, away from the
            // glass. Getting this backwards sets every label inside the panel.
            nx  =  -dy / len;
            ny  =  dx / len;
            mx  =  (a[0] + b[0]) / 2;
            my  =  (a[1] + b[1]) / 2;

            if (isVertical && ((frame.CrowdedLeft  && Math.abs(a[0] - frame.LeftPaper)  < 1e-6) ||
                               (frame.CrowdedRight && Math.abs(a[0] - frame.RightPaper) < 1e-6))) {
                nx  =  -nx;
                ny  =  -ny;
            }

            // An upright edge running through a break is labelled on its longer drawn
            // piece, never in the gap where the break lines run past it.
            if (isVertical && frame.BreakTop !== null) {
                var y0  =  Math.min(a[1], b[1]);
                var y1  =  Math.max(a[1], b[1]);
                if (y0 < frame.BreakTop && y1 > frame.BreakBottom) {
                    my  =  ((frame.BreakTop - y0) >= (y1 - frame.BreakBottom))
                        ? (y0 + frame.BreakTop) / 2
                        : (frame.BreakBottom + y1) / 2;
                }
            }

            text   =  VghLantern__GlazingSchedule__Mm(edges[i] ? edges[i].LengthMm : (len / frame.Scale), style);
            align  =  nx > 0.35 ? 'left' : (nx < -0.35 ? 'right' : 'center');
            x      =  mx + (nx * draw.EdgeGapMm);
            baseline  =  my + (ny * draw.EdgeGapMm) + (draw.EdgeFontMm * CAP_HEIGHT_RATIO * (ny > 0.35 ? 1 : (ny < -0.35 ? 0 : 0.5)));

            VghLantern__GlazingSchedule__PushText(list, x, baseline, text, draw.EdgeFontMm, style.Ink, align, 'normal');
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Mark Every Corner That Is Not Square With Its Cut Angle
    // ------------------------------------------------------------
    // A short arc inside the corner and the angle on the corner's bisector, inside the
    // glass. Square corners are left clean: a drawing that marks every 90 degrees
    // hides the two that matter.
    function VghLantern__GlazingSchedule__PushAngleMarks(list, ring, angles, draw, style) {
        var n  =  ring.length;
        var i, k, prev, here, next, ux, uy, vx, vy, lu, lv, a0, a1, sweep, points, bx, by, bl, t;
        var text, halfW, halfH, sinHalf, reach;

        for (i = 0; i < n; i++) {
            if (Math.abs((angles[i] || 90) - 90) <= style.SquareTolerance) continue;

            prev  =  ring[(i + n - 1) % n];
            here  =  ring[i];
            next  =  ring[(i + 1) % n];
            ux  =  prev[0] - here[0]; uy  =  prev[1] - here[1]; lu  =  Math.hypot(ux, uy);
            vx  =  next[0] - here[0]; vy  =  next[1] - here[1]; lv  =  Math.hypot(vx, vy);
            if (lu <= 0 || lv <= 0) continue;
            ux /= lu; uy /= lu; vx /= lv; vy /= lv;

            // The arc runs from one edge to the other the short way round, which is
            // inside the glass because every panel is convex.
            a0     =  Math.atan2(uy, ux);
            a1     =  Math.atan2(vy, vx);
            sweep  =  a1 - a0;
            while (sweep >  Math.PI) sweep  -=  2 * Math.PI;
            while (sweep < -Math.PI) sweep  +=  2 * Math.PI;

            var r  =  Math.min(draw.ArcRadiusMm, lu * 0.4, lv * 0.4);
            points  =  [];
            for (k = 0; k <= ARC_SEGMENTS; k++) {
                t  =  a0 + (sweep * k / ARC_SEGMENTS);
                points.push([here[0] + (Math.cos(t) * r), here[1] + (Math.sin(t) * r)]);
            }
            list.push({ Kind : KIND_POLYLINE, Points : points, Stroke : style.Dimension, StrokeMm : draw.DimLineMm, Dash : null });

            bx  =  ux + vx; by  =  uy + vy; bl  =  Math.hypot(bx, by);
            if (bl <= 1e-9) continue;
            bx  /=  bl;
            by  /=  bl;

            // THE LABEL | Far enough along the bisector that its box clears both edges
            // and the arc. A point on the bisector is reach x sin(half the corner)
            // from either edge, so a sharp corner pushes its label further in; the
            // 42 degree corners of the hip cuts once printed their angle on the line.
            text     =  VghLantern__GlazingSchedule__Degrees(angles[i], style);
            halfW    =  VghLantern__GlazingSchedule__TextWidthMm(text, draw.AngleFontMm) / 2;
            halfH    =  (draw.AngleFontMm * CAP_HEIGHT_RATIO) / 2;
            sinHalf  =  Math.max(0.05, Math.abs((ux * by) - (uy * bx)));
            reach    =  Math.max(draw.AngleTextMm,
                                 r + LABEL_CLEAR_MM + (halfW * Math.abs(bx)) + (halfH * Math.abs(by)),
                                 ((halfW * Math.abs(uy)) + (halfH * Math.abs(ux)) + LABEL_CLEAR_MM) / sinHalf,
                                 ((halfW * Math.abs(vy)) + (halfH * Math.abs(vx)) + LABEL_CLEAR_MM) / sinHalf);
            reach    =  Math.min(reach, Math.max(lu, lv) * 0.9);

            // A corner too tight to hold its label inside (a sliver, or a short cut)
            // prints it just outside the corner instead, on the far side of the point,
            // where neither of the corner's own edges can reach it.
            var cx  =  here[0] + (bx * reach);
            var cy  =  here[1] + (by * reach);
            if (VghLantern__GlazingSchedule__BoxCrossesRing(cx - halfW, cy - halfH, cx + halfW, cy + halfH, ring)) {
                var out  =  (halfW * Math.abs(bx)) + (halfH * Math.abs(by)) + LABEL_CLEAR_MM;
                var ox   =  here[0] - (bx * out);
                var oy   =  here[1] - (by * out);
                if (!VghLantern__GlazingSchedule__BoxCrossesRing(ox - halfW, oy - halfH, ox + halfW, oy + halfH, ring)) {
                    cx  =  ox;
                    cy  =  oy;
                }
            }

            VghLantern__GlazingSchedule__PushCentredText(list, cx, cy, text, draw.AngleFontMm, style.Dimension, 'normal');
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Tallest Plain Run of a Panel Above Its Eaves Step
    // ------------------------------------------------------------
    // Heights above the panel's foot between which its outline is nothing but its two
    // upright sides: no corner and no cut, so it can be broken out of a drawing
    // without hiding anything. floorY keeps the eaves step below the run. Returns
    // { Lo, Hi } or null.
    function VghLantern__GlazingSchedule__PlainBand(outer, floorY) {
        var box     =  VghLantern__GlazingSchedule__Bounds(outer);
        var levels  =  outer.map(function(p) { return p.y - box.MinY; }).concat([floorY]);
        var best    =  null;
        var i, lo, hi, mid, sides, plain;

        levels.sort(function(a, b) { return a - b; });

        for (i = 0; i + 1 < levels.length; i++) {
            lo  =  Math.max(levels[i], floorY);
            hi  =  levels[i + 1];
            if (hi - lo < 1e-6) continue;

            mid    =  (lo + hi) / 2;
            sides  =  0;
            plain  =  true;
            outer.forEach(function(a, k) {
                var b  =  outer[(k + 1) % outer.length];
                if (((a.y - box.MinY) - mid) * ((b.y - box.MinY) - mid) >= 0) return;
                sides++;
                if (Math.abs(b.x - a.x) > 1e-4) plain  =  false;
            });

            if (plain && sides === 2 && (!best || (hi - lo) > (best.Hi - best.Lo))) best  =  { Lo : lo, Hi : hi };
        }
        return best;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Fit a Panel to the Cell, Breaking a Sliver's Plain Middle Out
    // ------------------------------------------------------------
    // Fitted whole, a long narrow pane comes out a few millimetres wide and its cut
    // ends cannot be read. A panel that would be drawn narrower than MinDrawnWidthMm
    // is drawn at that width instead, and the length it then has too much of comes
    // out of its plain middle, shown as a break, the way a long member is drawn: the
    // ends keep their true shape and angles, and every size printed is the full one.
    // Returns { Scale, Cut : { LoY, HiY } | null, DrawnLengthMm }, the cut in heights
    // above the panel's foot.
    function VghLantern__GlazingSchedule__FitDrawing(outer, widthMm, lengthMm, stepHeightMm, boxW, boxH, draw) {
        var scale  =  Math.min(boxW / widthMm, boxH / lengthMm);
        var whole  =  { Scale : scale, Cut : null, DrawnLengthMm : lengthMm * scale };
        if (widthMm * scale >= draw.MinDrawnWidthMm) return whole;

        var band  =  VghLantern__GlazingSchedule__PlainBand(outer, stepHeightMm);
        if (!band) return whole;

        var wanted  =  Math.min(boxW / widthMm, draw.MinDrawnWidthMm / widthMm);
        var usable  =  (band.Hi - band.Lo) - ((draw.BreakKeepMm / wanted) * 2);   // <-- Plain glass kept either side of the break
        var remove  =  lengthMm - ((boxH - draw.BreakGapMm) / wanted);
        var s       =  wanted;

        if (usable <= 0) return whole;
        if (usable < remove) {
            s       =  Math.min(boxW / widthMm, (boxH - draw.BreakGapMm) / (lengthMm - usable));
            remove  =  usable;
        }
        if (s <= scale || remove <= 0) return whole;

        var middle  =  (band.Lo + band.Hi) / 2;
        return {
            Scale         : s,
            Cut           : { LoY : middle - (remove / 2), HiY : middle + (remove / 2) },
            DrawnLengthMm : ((lengthMm - remove) * s) + draw.BreakGapMm
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Piece of a Broken Panel
    // ------------------------------------------------------------
    // The outline clipped to below (keepBelow) or above a level, as a closed ring to
    // fill and as an open path round every edge but the one along the cut, so the
    // break lines rather than an outline close the piece.
    function VghLantern__GlazingSchedule__ClipAtLevel(ring, level, keepBelow) {
        var points  =  [];
        var open    =  [];
        var start   =  0;
        var i, a, b, ina, inb, t;

        for (i = 0; i < ring.length; i++) {
            a    =  ring[i];
            b    =  ring[(i + 1) % ring.length];
            ina  =  keepBelow ? (a.y <= level) : (a.y >= level);
            inb  =  keepBelow ? (b.y <= level) : (b.y >= level);
            if (ina) points.push({ x : a.x, y : a.y });
            if (ina !== inb) {
                t  =  (level - a.y) / (b.y - a.y);
                points.push({ x : a.x + ((b.x - a.x) * t), y : level, OnCut : true });
            }
        }

        for (i = 0; i < points.length; i++) {
            if (points[i].OnCut && points[(i + 1) % points.length].OnCut) { start  =  (i + 1) % points.length; break; }
        }
        for (i = 0; i < points.length; i++) open.push(points[(start + i) % points.length]);

        return { Ring : points, Open : open };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | A Break Line Across a Broken Panel
    // ------------------------------------------------------------
    // The drafting break: run a little past both sides, with one zig-zag at its
    // middle, so it reads as glass that carries on rather than as an edge.
    function VghLantern__GlazingSchedule__PushBreakLine(list, left, right, y, draw, style) {
        var mid  =  (left + right) / 2;
        var z    =  Math.min(draw.BreakZigMm, (right - left) / 4);
        list.push({ Kind : KIND_POLYLINE, Points : [
            [left - draw.BreakOverrunMm, y], [mid - z, y], [mid - (z / 2), y - z],
            [mid + (z / 2), y + z], [mid + z, y], [right + draw.BreakOverrunMm, y]
        ], Stroke : style.Ink, StrokeMm : draw.BreakLineMm, Dash : null });
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Straight-On Cut Drawing of One Panel Type
    // ------------------------------------------------------------
    // The panel flat, as the glazier lays the sheet out: eaves at the bottom, seen
    // from outside. The top pane is the solid outline; the dashed line across it is
    // where the sealed unit stops short of the eaves upstand and only the top pane
    // runs on. Dimensioned: the overall width below, the top pane's length up one
    // side and the oversail up the other, every other cut edge on the edge itself and
    // every corner that is not square. Fitted to the cell, not to a scale, and broken
    // through its plain middle when fitting it whole would make it a sliver.
    function VghLantern__GlazingSchedule__BuildPanelDrawing(type, style) {
        var draw      =  style.Drawing;
        var outer     =  type.OuterOutline2d;
        var unit      =  type.Outline2d;
        var widthMm   =  Math.max(1, type.WidthMm);
        var lengthMm  =  Math.max(1, type.LengthMm);
        var outerBox  =  VghLantern__GlazingSchedule__Bounds(outer);
        var unitBox   =  VghLantern__GlazingSchedule__Bounds(unit);
        var oversail  =  unitBox.MinY - outerBox.MinY;

        var boxW    =  draw.CellWidthMm  - draw.MarginLeftMm - draw.MarginRightMm;
        var boxH    =  draw.CellHeightMm - draw.MarginTopMm  - draw.MarginBottomMm;
        var fit     =  VghLantern__GlazingSchedule__FitDrawing(outer, widthMm, lengthMm, Math.max(0, oversail), boxW, boxH, draw);
        var scale   =  fit.Scale;
        var cut     =  fit.Cut;
        var left    =  draw.MarginLeftMm + ((boxW - (widthMm * scale)) / 2);
        var top     =  draw.MarginTopMm  + ((boxH - fit.DrawnLengthMm) / 2);
        var right   =  left + (widthMm * scale);
        var bottom  =  top  + fit.DrawnLengthMm;

        // Panel to paper: x from the panel's left edge, y down the page from its top.
        // Below a break the lower piece is drawn up from the foot instead, which is
        // what closes the length taken out up into the break's gap.
        var toPaper  =  function(p) {
            var h  =  p.y - outerBox.MinY;
            return [left + ((p.x - outerBox.MinX) * scale),
                    (cut && h <= cut.LoY + 1e-9) ? bottom - (h * scale) : top + ((lengthMm - h) * scale)];
        };
        var ring  =  outer.map(toPaper);
        var list  =  [];

        if (!cut) {
            list.push({ Kind : KIND_POLYGON, Points : ring, Fill : style.GlassFill, Stroke : style.Ink,
                        StrokeMm : draw.OutlineMm, Dash : null, Ref : type.Code });
        } else {
            [VghLantern__GlazingSchedule__ClipAtLevel(outer, outerBox.MinY + cut.LoY, true),
             VghLantern__GlazingSchedule__ClipAtLevel(outer, outerBox.MinY + cut.HiY, false)].forEach(function(piece) {
                list.push({ Kind : KIND_POLYGON, Points : piece.Ring.map(toPaper), Fill : style.GlassFill, Stroke : null,
                            StrokeMm : 0, Dash : null, Ref : type.Code });
                list.push({ Kind : KIND_POLYLINE, Points : piece.Open.map(toPaper), Stroke : style.Ink,
                            StrokeMm : draw.OutlineMm, Dash : null });
            });
            VghLantern__GlazingSchedule__PushBreakLine(list, left, right, bottom - (cut.LoY * scale), draw, style);
            VghLantern__GlazingSchedule__PushBreakLine(list, left, right, top + ((lengthMm - cut.HiY) * scale), draw, style);
        }

        // THE SIDES | The overall length goes on the right, unless the right has an
        // upright edge cut short of the full length and the left does not (a mirrored
        // hip panel): that edge's own length would print across the dimension line,
        // so the length goes left. The oversail takes whichever side is left over. A
        // part-length edge still sharing the length's side is labelled inside.
        var lengthPaper  =  fit.DrawnLengthMm;
        var partLeft     =  false;
        var partRight    =  false;
        ring.forEach(function(a, i) {
            var b  =  ring[(i + 1) % ring.length];
            if (Math.abs(b[0] - a[0]) >= 1e-6 || Math.abs(Math.abs(b[1] - a[1]) - lengthPaper) < 1e-6) return;
            if (Math.abs(a[0] - left)  < 1e-6) partLeft   =  true;
            if (Math.abs(a[0] - right) < 1e-6) partRight  =  true;
        });
        var lengthOnLeft  =  partRight && !partLeft;

        // THE STEP | The unit's lowest edge, where it stops and the top pane runs on.
        if (oversail > 0.5) {
            var stepEdge  =  unit.filter(function(p) { return Math.abs(p.y - unitBox.MinY) < 0.05; });
            if (stepEdge.length >= 2) {
                var stepXs  =  stepEdge.map(function(p) { return p.x; });
                var stepY   =  toPaper({ x : outerBox.MinX, y : unitBox.MinY })[1];
                list.push({ Kind : KIND_POLYLINE,
                            Points : [[toPaper({ x : Math.min.apply(null, stepXs), y : unitBox.MinY })[0], stepY],
                                      [toPaper({ x : Math.max.apply(null, stepXs), y : unitBox.MinY })[0], stepY]],
                            Stroke : style.StepLine, StrokeMm : draw.StepLineMm, Dash : draw.StepDash });

                // The oversail, dimensioned up the side the length is not on, from the
                // top pane's foot to the step.
                var ox  =  lengthOnLeft ? right + draw.DimOffsetMm : left - draw.DimOffsetMm;
                VghLantern__GlazingSchedule__PushDimension(list, ox, bottom, ox, stepY, draw, style.Dimension);
                VghLantern__GlazingSchedule__PushText(list, ox + (draw.DimTickMm * (lengthOnLeft ? 0.6 : -0.6)),
                    ((bottom + stepY) / 2) + ((draw.EdgeFontMm * CAP_HEIGHT_RATIO) / 2),
                    VghLantern__GlazingSchedule__Mm(oversail, style), draw.EdgeFontMm, style.Dimension,
                    lengthOnLeft ? 'left' : 'right', 'normal');
            }
        }

        // OVERALL WIDTH | Below the panel, across its full extent.
        var wy  =  bottom + draw.DimOffsetMm;
        VghLantern__GlazingSchedule__PushDimension(list, left, wy, right, wy, draw, style.Dimension);
        VghLantern__GlazingSchedule__PushText(list, (left + right) / 2, wy + draw.DimTickMm + (draw.DimFontMm * CAP_HEIGHT_RATIO),
            VghLantern__GlazingSchedule__Mm(type.WidthMm, style), draw.DimFontMm, style.Dimension, 'center', 'normal');

        // OVERALL LENGTH | The top pane, up the slope, on the side chosen above, and
        // the full length even where the drawing is broken.
        var lx  =  lengthOnLeft ? left - draw.DimOffsetMm : right + draw.DimOffsetMm;
        VghLantern__GlazingSchedule__PushDimension(list, lx, bottom, lx, top, draw, style.Dimension);
        VghLantern__GlazingSchedule__PushText(list, lx + (draw.DimTickMm * (lengthOnLeft ? -0.7 : 0.7)),
            ((top + bottom) / 2) + ((draw.DimFontMm * CAP_HEIGHT_RATIO) / 2),
            VghLantern__GlazingSchedule__Mm(type.LengthMm, style), draw.DimFontMm, style.Dimension,
            lengthOnLeft ? 'right' : 'left', 'normal');

        VghLantern__GlazingSchedule__PushEdgeLabels(list, ring, type.Edges || [], {
            WidthPaper   : widthMm * scale,
            LengthPaper  : lengthPaper,
            Scale        : scale,
            LeftPaper    : left,
            RightPaper   : right,
            CrowdedLeft  : lengthOnLeft && partLeft,
            CrowdedRight : !lengthOnLeft && partRight,
            BreakTop     : cut ? top + ((lengthMm - cut.HiY) * scale) : null,
            BreakBottom  : cut ? bottom - (cut.LoY * scale) : null
        }, draw, style);
        VghLantern__GlazingSchedule__PushAngleMarks(list, ring, type.CornerAnglesDegrees || [], draw, style);

        return { WidthMm : draw.CellWidthMm, HeightMm : draw.CellHeightMm, ScaleFactor : scale, IsBroken : !!cut, Primitives : list };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Building a Schedule
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Cache Key for a Lantern
    // ------------------------------------------------------------
    function VghLantern__GlazingSchedule__KeyFor(lantern) {
        var parts  =  KEY_BLOCKS.map(function(block) { return lantern[block] || null; });
        try {
            return JSON.stringify(parts);
        } catch (e) {
            return null;                                                       // <-- Unserialisable: build, but never cache
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Cut the Lantern's Glass and Lay Its Schedule Out
    // ------------------------------------------------------------
    // The same solve every other output runs: the skeleton, the bar set, then the
    // panel cut. Pure, so this schedule agrees with the 3D view and the export.
    function VghLantern__GlazingSchedule__Build(lantern, key) {
        VghLantern__GlazingSchedule__BuildCount++;

        var style     =  VghLantern__GlazingSchedule__ResolveStyle();
        var Solver    =  window.VghLantern__Geometry__SkeletonSolver;
        var Bars      =  window.VghLantern__Geometry__GlazeBarLayout;
        var Layout    =  window.VghLantern__Geometry__GlazingPanelLayout;
        var finish    =  lantern[BLOCK_FINISH] || {};
        var spec      =  String(finish[FIELD_GLAZING_SPEC] || '');
        var tint      =  String(finish[FIELD_GLAZING_TINT] || '');
        var buildUp   =  VghLantern__Specification__GlazingSchedule__DescribeBuildUp(spec);

        var schedule  =  {
            Key           : key,
            IsValid       : false,
            Message       : style.EmptyMessage,
            PanelCount    : 0,
            TypeCount     : 0,
            GlassType     : [spec, tint].filter(function(part) { return !!part; }).join(', '),
            GlassPanes    : buildUp.Panes,
            ThicknessText : buildUp.HasBuildUp ? buildUp.ThicknessText + (buildUp.IsProvisional ? style.Marker : '') : style.NoBuildUp,
            CavityText    : buildUp.HasBuildUp ? (buildUp.CavityText || '-') + (buildUp.IsProvisional ? style.Marker : '') : style.NoBuildUp,
            IsProvisional : buildUp.IsProvisional,
            HasBuildUp    : buildUp.HasBuildUp,
            Plan          : null,
            Rows          : [],
            TotalAreaSqM  : 0,
            TotalAreaText : '',
            TotalLabel    : '',
            Warnings      : []
        };

        if (!Solver || !Bars || !Layout) {
            schedule.Warnings.push('The geometry modules are not loaded, so no glazing schedule could be built.');
            return schedule;
        }

        var skeleton  =  Solver.VghLantern__SkeletonSolver__Solve(lantern);
        if (!skeleton || !skeleton.Meta || skeleton.Meta.IsValid === false) return schedule;

        var barSet    =  Bars.VghLantern__GlazeBarLayout__Layout(skeleton, lantern);
        var panelSet  =  Layout.VghLantern__GlazingPanelLayout__Layout(skeleton, barSet, lantern);
        if (!panelSet || !panelSet.Panels.length) return schedule;

        schedule.IsValid     =  true;
        schedule.Message     =  '';
        schedule.PanelCount  =  panelSet.Panels.length;
        schedule.TypeCount   =  panelSet.Types.length;
        schedule.Warnings    =  panelSet.Warnings.slice();
        if (!buildUp.HasBuildUp) {
            schedule.Warnings.push('The glazing spec "' + (spec || 'none') + '" has no glass build-up, so its thickness and cavity print as ' + style.NoBuildUp + '.');
        }

        schedule.Plan  =  VghLantern__GlazingSchedule__BuildPlan(panelSet, skeleton, style);

        // THE GLASS AREA | Each unit's top pane, the sealed unit's beneath where it
        // differs, and the total glass of every unit on the lantern (Adam, 20-Oct-2026:
        // "per side is irrelevant its the total of all of the panels"). Summed from the
        // exact areas, so the total is not the sum of the rounded column.
        var totalSqMm  =  0;

        schedule.Rows  =  panelSet.Types.map(function(type) {
            var lengthText      =  VghLantern__GlazingSchedule__Mm(type.LengthMm, style);
            var unitLengthText  =  VghLantern__GlazingSchedule__Mm(type.UnitLengthMm, style);
            var widthText       =  VghLantern__GlazingSchedule__Mm(type.WidthMm, style);
            var unitWidthText   =  VghLantern__GlazingSchedule__Mm(type.UnitWidthMm, style);
            var areaText        =  VghLantern__GlazingSchedule__SqM(type.AreaSqMm, style);
            var unitAreaText    =  VghLantern__GlazingSchedule__SqM(type.UnitAreaSqMm, style);

            totalSqMm  +=  (Number(type.AreaSqMm) || 0) * (Number(type.Quantity) || 0);

            return {
                Code            : type.Code,
                Quantity        : type.Quantity,
                LengthText      : lengthText,
                UnitLengthText  : unitLengthText !== lengthText ? style.UnitPrefix + unitLengthText : '',
                WidthText       : widthText,
                UnitWidthText   : unitWidthText !== widthText ? style.UnitPrefix + unitWidthText : '',
                AreaText        : areaText,
                UnitAreaText    : unitAreaText !== areaText ? style.UnitPrefix + unitAreaText : '',
                Drawing         : VghLantern__GlazingSchedule__BuildPanelDrawing(type, style)
            };
        });

        schedule.TotalAreaSqM   =  totalSqMm / SQMM_PER_SQM;
        schedule.TotalAreaText  =  VghLantern__GlazingSchedule__SqM(totalSqMm, style) + style.AreaSuffix;
        schedule.TotalLabel     =  style.TotalLabel.replace('{count}', String(panelSet.Panels.length));

        return schedule;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Lantern's Glazing Schedule, Built Once Per Lantern State
    // ------------------------------------------------------------
    // The only entry point that builds. A hit moves the entry to the back of the
    // cache; a miss builds, stores and trims the oldest.
    function VghLantern__Specification__GlazingSchedule__ForLantern(lantern) {
        if (!lantern || typeof lantern !== 'object') return null;

        var key  =  VghLantern__GlazingSchedule__KeyFor(lantern);
        var i, hit;

        if (key !== null) {
            for (i = 0; i < VghLantern__GlazingSchedule__Cache.length; i++) {
                if (VghLantern__GlazingSchedule__Cache[i].Key === key) {
                    hit  =  VghLantern__GlazingSchedule__Cache.splice(i, 1)[0];
                    VghLantern__GlazingSchedule__Cache.push(hit);
                    return hit.Schedule;
                }
            }
        }

        var schedule  =  VghLantern__GlazingSchedule__Build(lantern, key);

        if (key !== null) {
            VghLantern__GlazingSchedule__Cache.push({ Key : key, Schedule : schedule });
            while (VghLantern__GlazingSchedule__Cache.length > CACHE_LIMIT) VghLantern__GlazingSchedule__Cache.shift();
        }
        return schedule;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Schedule of One Lantern on the Current Project
    // ------------------------------------------------------------
    // By schedule index, the index every page of the pack carries.
    function VghLantern__Specification__GlazingSchedule__ForLanternIndex(lanternIndex) {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        var project       =  StateManager ? StateManager.VghLantern__StateManager__GetCurrentProject() : null;
        var lanterns      =  (project && Array.isArray(project[PROJECT_LANTERNS])) ? project[PROJECT_LANTERNS] : [];
        return lanterns[lanternIndex] ? VghLantern__Specification__GlazingSchedule__ForLantern(lanterns[lanternIndex]) : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | How Many Schedules Have Really Been Built (for Checks)
    // ------------------------------------------------------------
    function VghLantern__Specification__GlazingSchedule__BuildCount() {
        return VghLantern__GlazingSchedule__BuildCount;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Specification__GlazingSchedule__ForLantern        : VghLantern__Specification__GlazingSchedule__ForLantern,
        VghLantern__Specification__GlazingSchedule__ForLanternIndex   : VghLantern__Specification__GlazingSchedule__ForLanternIndex,
        VghLantern__Specification__GlazingSchedule__DescribeBuildUp   : VghLantern__Specification__GlazingSchedule__DescribeBuildUp,
        VghLantern__Specification__GlazingSchedule__BuildCount        : VghLantern__Specification__GlazingSchedule__BuildCount,

        VGHLANTERN__GLAZINGSCHEDULE__KIND_POLYGON   : KIND_POLYGON,
        VGHLANTERN__GLAZINGSCHEDULE__KIND_POLYLINE  : KIND_POLYLINE,
        VGHLANTERN__GLAZINGSCHEDULE__KIND_CIRCLE    : KIND_CIRCLE,
        VGHLANTERN__GLAZINGSCHEDULE__KIND_TEXT      : KIND_TEXT
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Specification__GlazingSchedule  =  VghLantern__Specification__GlazingSchedule;
