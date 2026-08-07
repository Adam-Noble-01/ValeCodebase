/* =============================================================================
   VGHLANTERN - 2D ENVIRONMENT | DIMENSION RENDERER
   =============================================================================

   FILE       : VghLantern__Env2d__DimensionRenderer__.js
   NAMESPACE  : VghLantern
   MODULE     : Env2d - DimensionRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Draw the dimension annotation layer over a 2D lantern view
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Draws witness lines, dimension lines, terminators and value text for every
     dimension the active view exposes, plus a mid-hip pitch arc and label on
     elevations.
   - Dimension lines are placed OUTSIDE the projected extents of the geometry and
     chained outward, so annotation never crosses the lantern.
   - Each value text node is tagged with data-vgh-dimension-key. That tag is the
     entire contract with VghLantern__Env2d__DimensionEditor__: this module draws,
     the editor binds. Neither knows how the other works.

   ---------------------------------------------------------------------------

   WHICH DIMENSIONS APPEAR:
   The dimension key list comes from the intersection of two sources of truth:
     - Na__Env2d__Config.json -> Views[viewKey].DimensionKeys  (what to show)
     - Geometry__ConstraintResolver descriptors                (what is editable)
   A key present in the view list but absent from the resolver draws as a
   read-only annotation rather than silently disappearing.

   ============================================================================= */

// =============================================================================
// REGION | Dimension Renderer Module
// =============================================================================

const VghLantern__Env2d__DimensionRenderer = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Classes and Data Attribute Names
    // ------------------------------------------------------------
    const CSS_DIM_GROUP        =  'VghLantern__Env2d__Dimension';                 // <-- Wrapper group per dimension
    const CSS_DIM_WITNESS      =  'VghLantern__Env2d__Dimension__Witness';        // <-- Extension / witness line
    const CSS_DIM_LINE         =  'VghLantern__Env2d__Dimension__Line';           // <-- Dimension line itself
    const CSS_DIM_TERMINATOR   =  'VghLantern__Env2d__Dimension__Terminator';     // <-- Tick or arrow at each end
    const CSS_DIM_TEXT         =  'VghLantern__Env2d__Dimension__Text';           // <-- Value text
    const CSS_DIM_TEXT_EDIT    =  'VghLantern__Env2d__Dimension__Text--editable'; // <-- Editable variant
    const CSS_DIM_TEXT_ANGLE   =  'VghLantern__Env2d__Dimension__Text--angle';    // <-- Pitch label centred on the hip
    const CSS_DIM_ARC          =  'VghLantern__Env2d__Dimension__Arc';            // <-- Pitch angle arc

    const ATTR_KEY             =  'data-vgh-dimension-key';                       // <-- Editor binding hook
    const ATTR_VALUE           =  'data-vgh-dimension-value';                      // <-- Current numeric value
    const ATTR_UNIT            =  'data-vgh-dimension-unit';                       // <-- 'mm' or 'deg'
    const ATTR_EDITABLE        =  'data-vgh-dimension-editable';                    // <-- 'true' when resolver-backed

    const SIDE_BELOW           =  'below';
    const SIDE_ABOVE           =  'above';
    const SIDE_LEFT            =  'left';
    const SIDE_RIGHT           =  'right';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Reading
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Dimension Section of the 2D Config
    // ------------------------------------------------------------
    // No numeric or string literal here may mirror a config value - every
    // fallback used to be a hardcoded guess that silently drifted out of
    // sync with Na__Env2d__Config.json. Values now come exclusively from
    // JSON via ConfigLoader's Require* helpers, which log loudly instead of
    // inventing a plausible-looking wrong number.
    function VghLantern__Env2d__DimensionRenderer__ReadConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var env2d         =  ConfigLoader ? ConfigLoader.VghLantern__ConfigLoader__GetSection('Env2d') : null;
        var dimCfg        =  (env2d && env2d['VghLantern__Env2d__Config__Dimensions']) || {};
        var LABEL         =  'Na__Env2d__Config.json -> VghLantern__Env2d__Config__Dimensions';

        function num(key)    { return ConfigLoader.VghLantern__ConfigLoader__RequireNumber(dimCfg, key, LABEL); }
        function str(key)    { return ConfigLoader.VghLantern__ConfigLoader__RequireString(dimCfg, key, LABEL); }
        function bool(key)   { return ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(dimCfg, key, LABEL); }

        return {
            Enabled                   : bool('Enabled'),
            OffsetFromGeometryMm      : num('OffsetFromGeometryMm'),
            ChainOffsetStepMm         : num('ChainOffsetStepMm'),
            ExtensionLineOverrunMm    : num('ExtensionLineOverrunMm'),
            ExtensionLineGapMm        : num('ExtensionLineGapMm'),
            TerminatorLengthMm        : num('TerminatorLengthMm'),
            TerminatorStyle           : str('TerminatorStyle'),
            TextFontSizeMm            : num('TextFontSizeMm'),
            TextOffsetFromLineMm      : num('TextOffsetFromLineMm'),
            AngleArcRadiusFactorOfHip    : num('AngleArcRadiusFactorOfHip'),
            AngleArcRadiusMinMm          : num('AngleArcRadiusMinMm'),
            AngleArcRadiusMaxMm          : num('AngleArcRadiusMaxMm'),
            AngleTextSizeFactorOfDimensionText    : num('AngleTextSizeFactorOfDimensionText'),
            AngleTextSizeMinFactorOfDimensionText : num('AngleTextSizeMinFactorOfDimensionText'),
            AngleTextHeightFactorOfWedge : num('AngleTextHeightFactorOfWedge'),
            AngleTextOffsetFactorOfRadius: num('AngleTextOffsetFactorOfRadius'),
            AngleTextMaxStationFactorOfHip: num('AngleTextMaxStationFactorOfHip'),
            AngleTickLengthFactorOfTerminator: num('AngleTickLengthFactorOfTerminator'),
            AngleShowBaselineLeg         : bool('AngleShowBaselineLeg'),
            AngleBaselineOverrunFactor   : num('AngleBaselineOverrunFactor'),
            EditHintTooltip              : str('EditHintTooltip')
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Dimension Key List for a View
    // ------------------------------------------------------------
    function VghLantern__Env2d__DimensionRenderer__KeysForView(viewKey) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var env2d         =  ConfigLoader ? ConfigLoader.VghLantern__ConfigLoader__GetSection('Env2d') : null;
        var views         =  (env2d && env2d['VghLantern__Env2d__Config__Views']) || {};
        var viewCfg       =  views[viewKey];

        if (viewCfg && Array.isArray(viewCfg.DimensionKeys)) return viewCfg.DimensionKeys;

        // No config yet - fall back to whatever the resolver says is editable here.
        var Resolver  =  window.VghLantern__Geometry__ConstraintResolver;
        return Resolver ? Resolver.VghLantern__ConstraintResolver__ListForView(viewKey) : [];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Witness Point Derivation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build a Model Space Point Honouring the Long Axis Swap
    // ------------------------------------------------------------
    // The SkeletonSolver maps its internal long/short axes onto world X/Y, so
    // dimension witness points must be built in world space directly from Meta
    // rather than reusing the solver's internal mapper.
    function VghLantern__Env2d__DimensionRenderer__Pt(x, y, z) {
        return { x: x, y: y, z: z };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Derive Witness Point Pairs for the Plan View
    // ------------------------------------------------------------
    function VghLantern__Env2d__DimensionRenderer__PlanRuns(skeleton) {
        var meta        =  skeleton.Meta;
        var base        =  skeleton.Base || {};
        var halfWidth   =  meta.WidthMm / 2;
        var halfDepth   =  meta.DepthMm / 2;
        var Pt          =  VghLantern__Env2d__DimensionRenderer__Pt;

        // No eavesProjection run any more: the roof springs from the eaves
        // datum ring INSIDE the envelope (head beam inner face), so there is no
        // oversailing projection left to dimension in plan.
        var runs  =  {
            'width' : {
                Start : Pt(-halfWidth, -halfDepth, 0),
                End   : Pt( halfWidth, -halfDepth, 0),
                Side  : SIDE_BELOW,
                Chain : 0
            },
            'depth' : {
                Start : Pt(halfWidth, -halfDepth, 0),
                End   : Pt(halfWidth,  halfDepth, 0),
                Side  : SIDE_RIGHT,
                Chain : 0
            }
        };

        // Builders Upstand thickness is dimensioned off the near edge, so the reveal offset
        // reads against the same line the width is measured from.
        if (base.HasReveal) {
            runs['upstandThickness']  =  {
                Start : Pt(-halfWidth,                       -halfDepth, 0),
                End   : Pt(-base.InnerHalfWidthMm,           -halfDepth, 0),
                Side  : SIDE_BELOW,
                Chain : 1
            };
        }

        // The ridge only exists as a run when it has length - a pyramid has none.
        var ridgeMembers  =  window.VghLantern__Geometry__SkeletonSolver
            .VghLantern__SkeletonSolver__MembersByRole(skeleton, 'ridge');

        if (ridgeMembers.length) {
            runs['ridgeLength']  =  {
                Start : ridgeMembers[0].Start,
                End   : ridgeMembers[0].End,
                Side  : SIDE_ABOVE,
                Chain : 0
            };
        }

        return runs;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Derive Witness Point Pairs for an Elevation View
    // ------------------------------------------------------------
    // isFront selects which world axis lies across the page: front elevation
    // reads along X (width), side elevation reads along Y (depth).
    function VghLantern__Env2d__DimensionRenderer__ElevationRuns(skeleton, isFront) {
        var meta        =  skeleton.Meta;
        var Pt          =  VghLantern__Env2d__DimensionRenderer__Pt;

        var acrossHalf  =  isFront ? (meta.WidthMm / 2)      : (meta.DepthMm / 2);
        var depthKey    =  isFront ? 'width'                 : 'depth';

        // Build points on the near face so the projection is unambiguous.
        function acrossPt(acrossValue, zValue) {
            return isFront
                ? Pt(acrossValue, -(meta.DepthMm / 2), zValue)
                : Pt(-(meta.WidthMm / 2), acrossValue, zValue);
        }

        var runs  =  {};

        runs[depthKey]  =  {
            Start : acrossPt(-acrossHalf, 0),
            End   : acrossPt( acrossHalf, 0),
            Side  : SIDE_BELOW,
            Chain : 0
        };

        // The base reads bottom-up on the same side: builders upstand, then the
        // overall height chained outside it. The retired frameHeight and
        // eavesProjection runs are gone: the head beam is a fixed product
        // section and the roof springs from the inboard eaves datum.
        runs['upstandHeight']  =  {
            Start : acrossPt(acrossHalf, 0),
            End   : acrossPt(acrossHalf, meta.UpstandTopLevelMm),
            Side  : SIDE_RIGHT,
            Chain : 0
        };

        runs['overallHeight']  =  {
            Start : acrossPt(acrossHalf, 0),
            End   : acrossPt(acrossHalf, meta.OverallHeightMm),
            Side  : SIDE_RIGHT,
            Chain : 1
        };

        if (meta.UpstandHeightMm  <= 0) delete runs['upstandHeight'];

        return runs;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Run Table for the Active View
    // ------------------------------------------------------------
    function VghLantern__Env2d__DimensionRenderer__BuildRuns(skeleton, viewKey) {
        if (viewKey === 'plan')           return VghLantern__Env2d__DimensionRenderer__PlanRuns(skeleton);
        if (viewKey === 'frontElevation') return VghLantern__Env2d__DimensionRenderer__ElevationRuns(skeleton, true);
        if (viewKey === 'sideElevation')  return VghLantern__Env2d__DimensionRenderer__ElevationRuns(skeleton, false);
        return {};
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Linear Dimension Drawing
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve the Dimension Line Base Coordinate for a Side
    // ------------------------------------------------------------
    // Returns the fixed coordinate the dimension line sits on, measured outward
    // from the projected extents so annotation clears the geometry.
    function VghLantern__Env2d__DimensionRenderer__BaseForSide(extents, side, chainIndex, config) {
        var out  =  config.OffsetFromGeometryMm + (chainIndex * config.ChainOffsetStepMm);

        if (side === SIDE_BELOW) return extents.MaxY + out;
        if (side === SIDE_ABOVE) return extents.MinY - out;
        if (side === SIDE_RIGHT) return extents.MaxX + out;
        return extents.MinX - out;                                            // <-- SIDE_LEFT
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Draw Witness Lines from Geometry Out to the Dimension Line
    // ------------------------------------------------------------
    function VghLantern__Env2d__DimensionRenderer__DrawWitness(group, projectedPt, base, isHorizontalRun, config) {
        var SvgHelpers  =  window.VghLantern__Env2d__SvgHelpers;

        var fromValue  =  isHorizontalRun ? projectedPt.y : projectedPt.x;
        var direction  =  (base >= fromValue) ? 1 : -1;

        var startValue  =  fromValue + (direction * config.ExtensionLineGapMm);
        var endValue    =  base      + (direction * config.ExtensionLineOverrunMm);

        var startPt  =  isHorizontalRun ? { x: projectedPt.x, y: startValue } : { x: startValue, y: projectedPt.y };
        var endPt    =  isHorizontalRun ? { x: projectedPt.x, y: endValue   } : { x: endValue,   y: projectedPt.y };

        group.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateLine(startPt, endPt, CSS_DIM_WITNESS));
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Draw a Terminator Tick at a Dimension Line End
    // ------------------------------------------------------------
    // A 45 degree tick is the Vale drawing convention; the arrow style is kept
    // available through config for sheets that need it.
    function VghLantern__Env2d__DimensionRenderer__DrawTerminator(group, atPt, isHorizontalRun, config) {
        var SvgHelpers  =  window.VghLantern__Env2d__SvgHelpers;
        var half        =  config.TerminatorLengthMm / 2;

        if (config.TerminatorStyle === 'arrow') {
            var back   =  isHorizontalRun ? { x: atPt.x - half, y: atPt.y } : { x: atPt.x, y: atPt.y - half };
            var wing1  =  isHorizontalRun ? { x: atPt.x - half, y: atPt.y - (half / 3) } : { x: atPt.x - (half / 3), y: atPt.y - half };
            var wing2  =  isHorizontalRun ? { x: atPt.x - half, y: atPt.y + (half / 3) } : { x: atPt.x + (half / 3), y: atPt.y - half };
            group.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreatePolyShape(
                [wing1, atPt, wing2, back], CSS_DIM_TERMINATOR, true));
            return;
        }

        // Tick: a short 45 degree stroke straddling the dimension line.
        var tickStart  =  { x: atPt.x - half, y: atPt.y + half };
        var tickEnd    =  { x: atPt.x + half, y: atPt.y - half };
        group.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateLine(tickStart, tickEnd, CSS_DIM_TERMINATOR));
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Draw the Value Text and Tag It for the Dimension Editor
    // ------------------------------------------------------------
    // extraCssClass is optional - the pitch annotation appends the --angle modifier
    // so the paper halo and heavier weight apply only to that label.
    function VghLantern__Env2d__DimensionRenderer__DrawValueText(group, midPt, isHorizontalRun, displayValue, numericValue, unitLabel, dimensionKey, isEditable, config, extraCssClass) {
        var SvgHelpers  =  window.VghLantern__Env2d__SvgHelpers;

        var textPt  =  isHorizontalRun
            ? { x: midPt.x, y: midPt.y - config.TextOffsetFromLineMm }
            : { x: midPt.x, y: midPt.y };

        // Zero line-offset (pitch mid-slope label) centres the glyph on the point;
        // linear dimensions keep the alphabetic baseline so the value sits above the line.
        var baseline  =  (!isHorizontalRun || config.TextOffsetFromLineMm === 0) ? 'middle' : 'auto';

        var attrs  =  {
            'font-size'         : config.TextFontSizeMm,
            'text-anchor'       : 'middle',
            'dominant-baseline' : baseline
        };
        attrs[ATTR_KEY]       =  dimensionKey;
        attrs[ATTR_VALUE]     =  numericValue;
        attrs[ATTR_UNIT]      =  unitLabel;
        attrs[ATTR_EDITABLE]  =  isEditable ? 'true' : 'false';

        // A vertical dimension reads along its own line, matching drawing practice.
        if (!isHorizontalRun) {
            attrs['transform']  =  'rotate(-90 ' + midPt.x + ' ' + midPt.y + ')';
            attrs['dy']         =  -config.TextOffsetFromLineMm;
        }

        var cssClass  =  isEditable ? (CSS_DIM_TEXT + ' ' + CSS_DIM_TEXT_EDIT) : CSS_DIM_TEXT;
        if (extraCssClass) cssClass  +=  ' ' + extraCssClass;
        var textEl    =  SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateText(textPt, displayValue, cssClass, attrs);

        if (isEditable) {
            var titleEl  =  SvgHelpers.VghLantern__Env2d__SvgHelpers__Create('title', {});
            titleEl.textContent  =  config.EditHintTooltip;
            textEl.appendChild(titleEl);
        }

        group.appendChild(textEl);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Draw One Complete Linear Dimension
    // ------------------------------------------------------------
    function VghLantern__Env2d__DimensionRenderer__DrawLinear(targetLayer, run, dimensionKey, label, numericValue, unitLabel, isEditable, extents, viewKey, config) {
        var SvgHelpers    =  window.VghLantern__Env2d__SvgHelpers;
        var CoordHelpers  =  window.VghLantern__Env2d__CoordHelpers;

        var p1  =  CoordHelpers.VghLantern__Env2d__CoordHelpers__ProjectPoint(run.Start, viewKey);
        var p2  =  CoordHelpers.VghLantern__Env2d__CoordHelpers__ProjectPoint(run.End,   viewKey);

        var isHorizontalRun  =  (run.Side === SIDE_BELOW || run.Side === SIDE_ABOVE);
        var base             =  VghLantern__Env2d__DimensionRenderer__BaseForSide(extents, run.Side, run.Chain, config);

        var d1  =  isHorizontalRun ? { x: p1.x, y: base } : { x: base, y: p1.y };
        var d2  =  isHorizontalRun ? { x: p2.x, y: base } : { x: base, y: p2.y };

        // A degenerate run would draw a dot and a meaningless value.
        var runLength  =  isHorizontalRun ? Math.abs(d2.x - d1.x) : Math.abs(d2.y - d1.y);
        if (runLength < 1) return;

        var group  =  SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateGroup(CSS_DIM_GROUP, {
            'data-vgh-dimension-group' : dimensionKey
        });

        VghLantern__Env2d__DimensionRenderer__DrawWitness(group, p1, base, isHorizontalRun, config);
        VghLantern__Env2d__DimensionRenderer__DrawWitness(group, p2, base, isHorizontalRun, config);

        group.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateLine(d1, d2, CSS_DIM_LINE));

        VghLantern__Env2d__DimensionRenderer__DrawTerminator(group, d1, isHorizontalRun, config);
        VghLantern__Env2d__DimensionRenderer__DrawTerminator(group, d2, isHorizontalRun, config);

        var midPt  =  { x: (d1.x + d2.x) / 2, y: (d1.y + d2.y) / 2 };
        var display  =  VghLantern__Env2d__DimensionRenderer__FormatValue(numericValue, unitLabel);

        VghLantern__Env2d__DimensionRenderer__DrawValueText(
            group, midPt, isHorizontalRun, display, numericValue, unitLabel, dimensionKey, isEditable, config);

        group.setAttribute('data-vgh-dimension-label', label || dimensionKey);
        targetLayer.appendChild(group);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format a Numeric Dimension for Display
    // ------------------------------------------------------------
    function VghLantern__Env2d__DimensionRenderer__FormatValue(numericValue, unitLabel) {
        var UnitConverter  =  window.VghLantern__AppUtils__UnitConverter;

        if (unitLabel === 'deg') return (Math.round(numericValue * 10) / 10) + '\u00B0';

        if (UnitConverter) return UnitConverter.VghLantern__UnitConverter__FormatMmLabel(numericValue);
        return Math.round(numericValue) + ' mm';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Angular Dimension Drawing
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Find the Silhouette Slope Edge in the Active View
    // ------------------------------------------------------------
    // The hip whose projection spans the greatest horizontal distance forms the
    // silhouette in an elevation, so its apparent angle is the slope the viewer
    // actually sees. Anchoring the annotation to real drawn geometry keeps the
    // label truthful for every roof form the solver supports.
    function VghLantern__Env2d__DimensionRenderer__FindSlopeEdge(skeleton, viewKey) {
        var CoordHelpers  =  window.VghLantern__Env2d__CoordHelpers;
        var Solver        =  window.VghLantern__Geometry__SkeletonSolver;
        if (!Solver) return null;

        var hips  =  Solver.VghLantern__SkeletonSolver__MembersByRole(skeleton, 'hip');
        if (!hips.length) return null;

        var best      =  null;
        var bestSpan  =  -1;
        var i, a, b, span, low, high;

        for (i = 0; i < hips.length; i++) {
            a  =  CoordHelpers.VghLantern__Env2d__CoordHelpers__ProjectPoint(hips[i].Start, viewKey);
            b  =  CoordHelpers.VghLantern__Env2d__CoordHelpers__ProjectPoint(hips[i].End,   viewKey);

            span  =  Math.abs(b.x - a.x);
            if (span <= bestSpan) continue;

            // Anchor at the lower end - larger SVG y is further down the page.
            low   =  (a.y >= b.y) ? a : b;
            high  =  (a.y >= b.y) ? b : a;

            // Prefer the left-hand silhouette so the arc opens into the roof.
            if (high.x > low.x) {
                bestSpan  =  span;
                best      =  { Anchor: low, Toward: high };
            } else if (best === null) {
                bestSpan  =  span;
                best      =  { Anchor: low, Toward: high };
            }
        }

        return best;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Draw the Oblique Terminator Tick at an Arc Endpoint
    // ------------------------------------------------------------
    // The Vale terminator is a 45 degree slash ACROSS the dimension line, and an
    // angular dimension line is the arc. The tick therefore sits at 45 degrees to
    // the arc's tangent, which is the same glyph a linear dimension gets, rotated
    // to suit. Drawing it along the tangent instead - as this did - just extends
    // the arc by the tick length and reads as no terminator at all.
    function VghLantern__Env2d__DimensionRenderer__DrawAngleTick(group, pivot, atPt, tickLengthMm) {
        var SvgHelpers  =  window.VghLantern__Env2d__SvgHelpers;
        var dx   =  atPt.x - pivot.x;
        var dy   =  atPt.y - pivot.y;
        var len  =  Math.sqrt((dx * dx) + (dy * dy));
        if (len < 1) return;

        var rx  =  dx / len;                                                 // <-- Radial unit, pivot out to the endpoint
        var ry  =  dy / len;
        var tx  =  -ry;                                                      // <-- Tangent unit, along the arc
        var ty  =   rx;

        // Bisecting tangent and radius puts the slash at 45 degrees to both, so
        // it crosses the arc rather than continuing it.
        var sx    =  tx - rx;
        var sy    =  ty - ry;
        var sLen  =  Math.sqrt((sx * sx) + (sy * sy));
        if (sLen < 1e-6) return;

        var half  =  tickLengthMm / 2;
        sx  =  (sx / sLen) * half;
        sy  =  (sy / sLen) * half;

        group.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateLine(
            { x: atPt.x - sx, y: atPt.y - sy },
            { x: atPt.x + sx, y: atPt.y + sy },
            CSS_DIM_TERMINATOR
        ));
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Clamp a Value Between Two JSON-Owned Rails
    // ------------------------------------------------------------
    function VghLantern__Env2d__DimensionRenderer__Clamp(value, minValue, maxValue) {
        if (!isFinite(value))   return minValue;
        if (value < minValue)   return minValue;
        if (value > maxValue)   return maxValue;
        return value;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Draw the Pitch Angle Arc and Label at the Foot of the Hip
    // ------------------------------------------------------------
    // The vertex sits on the eaves corner where the hip actually springs, which
    // is where a draughtsman measures a pitch from - the angle exists at the
    // corner, not halfway up the slope. Every length in the symbol is then
    // derived from the drawn hip and from the wedge of space the hip triangle
    // actually offers, so the annotation fills the same share of a 1200mm hip
    // as it does of a 4000mm one instead of sprawling out of small triangles.
    function VghLantern__Env2d__DimensionRenderer__DrawAngular(targetLayer, skeleton, viewKey, numericValue, isEditable, config) {
        var SvgHelpers  =  window.VghLantern__Env2d__SvgHelpers;
        var edge        =  VghLantern__Env2d__DimensionRenderer__FindSlopeEdge(skeleton, viewKey);
        if (!edge) return;

        var dx   =  edge.Toward.x - edge.Anchor.x;
        var dy   =  edge.Toward.y - edge.Anchor.y;
        var len  =  Math.sqrt((dx * dx) + (dy * dy));
        if (len < 1) return;

        // Vertex at the eaves end of the hip - FindSlopeEdge already returns the
        // lower end as Anchor, so this is the springing point in every view.
        var pivot  =  { x: edge.Anchor.x, y: edge.Anchor.y };

        var signX   =  (dx >= 0) ? 1 : -1;
        var ux      =  dx / len;
        var uy      =  dy / len;

        // Baseline is the horizontal leg of the angle, kept on the same turn as
        // the slope so the bisector below cannot fold the label under the eaves.
        var baselineAngle  =  (signX > 0) ? 0 : -Math.PI;
        var slopeAngle     =  Math.atan2(uy, ux);
        var includedAngle  =  Math.abs(slopeAngle - baselineAngle);          // <-- Apparent pitch of the drawn hip
        if (includedAngle < 0.01) return;                                     // <-- Degenerate: no wedge to annotate

        // Radius is a fraction of the DRAWN hip, so the symbol scales with the
        // triangle it sits in. This is deliberate hip-relative sizing, not the
        // old silent clamp: JSON owns the factor and both legibility rails, so
        // the rendered radius is always traceable back to a stated number.
        var radius  =  VghLantern__Env2d__DimensionRenderer__Clamp(
            len * config.AngleArcRadiusFactorOfHip,
            config.AngleArcRadiusMinMm,
            config.AngleArcRadiusMaxMm);
        if (radius < 1) return;

        // Arc runs from the horizontal baseline round to the slope edge.
        var startPt  =  { x: pivot.x + (Math.cos(baselineAngle) * radius), y: pivot.y + (Math.sin(baselineAngle) * radius) };
        var endPt    =  { x: pivot.x + (ux * radius),                      y: pivot.y + (uy * radius) };

        // Slope edges rise up the page, so the sweep is always the short way.
        var sweepFlag  =  (signX > 0) ? 0 : 1;
        var pathData   =  'M ' + startPt.x + ' ' + startPt.y +
                         ' A ' + radius + ' ' + radius + ' 0 0 ' + sweepFlag + ' ' + endPt.x + ' ' + endPt.y;

        var group  =  SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateGroup(CSS_DIM_GROUP, {
            'data-vgh-dimension-group' : 'pitch'
        });

        // The horizontal leg of the angle is the eaves line, and with the vertex
        // now sitting on the eaves that line is already drawn - a witness stroke
        // along it would only paint red over black. Kept as a JSON toggle for
        // sheets that want the leg stated explicitly.
        // Overrun factor is JSON-owned (AngleBaselineOverrunFactor) - never hardcode it.
        if (config.AngleShowBaselineLeg) {
            var baselineRun  =  radius * config.AngleBaselineOverrunFactor;
            group.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateLine(
                pivot,
                { x: pivot.x + (Math.cos(baselineAngle) * baselineRun), y: pivot.y + (Math.sin(baselineAngle) * baselineRun) },
                CSS_DIM_WITNESS));
        }

        group.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreatePath(pathData, CSS_DIM_ARC));

        // Terminators match the linear dimensions - one tick size across the whole
        // sheet, so the angular dimension reads as part of the same drawing.
        var tickLengthMm  =  config.TerminatorLengthMm * config.AngleTickLengthFactorOfTerminator;
        VghLantern__Env2d__DimensionRenderer__DrawAngleTick(group, pivot, startPt, tickLengthMm);
        VghLantern__Env2d__DimensionRenderer__DrawAngleTick(group, pivot, endPt,   tickLengthMm);

        // Text sits just outside the arc on the bisector of the two legs.
        var midAngle   =  (baselineAngle + slopeAngle) / 2;
        var cosMid     =  Math.abs(Math.cos(midAngle));

        // The label is a drawing annotation, so it takes the sheet's dimension
        // text size. It must NEVER grow to fill the wedge - a value that sizes
        // itself off the geometry ends up shouting on a big lantern and whispering
        // on a small one, when every other number on the sheet is one height.
        var baseFontMm  =  config.TextFontSizeMm * config.AngleTextSizeFactorOfDimensionText;
        var minFontMm   =  config.TextFontSizeMm * config.AngleTextSizeMinFactorOfDimensionText;

        // Space is found by moving, not by shrinking. The wedge widens with
        // distance from the corner, so slide out along the bisector until it
        // clears the label - capped inside the triangle so it cannot drift past
        // the ridge. Only if the capped station still cannot hold the label does
        // the text shrink, and never below the legibility floor.
        var naturalRun  =  radius * (1 + config.AngleTextOffsetFactorOfRadius) * cosMid;
        var neededRun   =  baseFontMm / (Math.tan(includedAngle) * config.AngleTextHeightFactorOfWedge);
        var maxRun      =  Math.abs(dx) * config.AngleTextMaxStationFactorOfHip;
        var textRun     =  Math.max(naturalRun, Math.min(neededRun, maxRun));

        var wedgeHeightMm  =  textRun * Math.tan(includedAngle);
        var fontSizeMm     =  Math.min(baseFontMm, Math.max(minFontMm,
            wedgeHeightMm * config.AngleTextHeightFactorOfWedge));

        var textRadius  =  textRun / cosMid;
        var textPt      =  {
            x : pivot.x + (Math.cos(midAngle) * textRadius),
            y : pivot.y + (Math.sin(midAngle) * textRadius)
        };

        var angleConfig  =  Object.assign({}, config, {
            TextFontSizeMm       : fontSizeMm,
            TextOffsetFromLineMm : 0
        });

        VghLantern__Env2d__DimensionRenderer__DrawValueText(
            group, textPt, true,
            VghLantern__Env2d__DimensionRenderer__FormatValue(numericValue, 'deg'),
            numericValue, 'deg', 'pitch', isEditable, angleConfig, CSS_DIM_TEXT_ANGLE);

        targetLayer.appendChild(group);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Render Entry Point
// -----------------------------------------------------------------------------

    // FUNCTION | Render the Dimension Layer for a Viewport
    // ------------------------------------------------------------
    function VghLantern__Env2d__DimensionRenderer__Render(instance, skeleton, lantern) {
        if (!instance || !skeleton || !skeleton.Meta) return;

        var config  =  VghLantern__Env2d__DimensionRenderer__ReadConfig();
        if (!config.Enabled) return;

        var targetLayer  =  instance.GetLayer('dimensions');
        if (!targetLayer) return;

        var viewKey   =  instance.ViewKey;
        var Resolver  =  window.VghLantern__Geometry__ConstraintResolver;
        var CoordHelpers  =  window.VghLantern__Env2d__CoordHelpers;

        var extents  =  CoordHelpers.VghLantern__Env2d__CoordHelpers__ExtentsOfSkeleton(skeleton, viewKey);
        if (!extents) return;

        var runs  =  VghLantern__Env2d__DimensionRenderer__BuildRuns(skeleton, viewKey);
        var keys  =  VghLantern__Env2d__DimensionRenderer__KeysForView(viewKey);

        var i, dimensionKey, descriptor, numericValue, run;

        for (i = 0; i < keys.length; i++) {
            dimensionKey  =  keys[i];
            descriptor    =  Resolver ? Resolver.VghLantern__ConstraintResolver__GetDescriptor(dimensionKey) : null;

            numericValue  =  (Resolver && lantern)
                ? Resolver.VghLantern__ConstraintResolver__ReadCurrentValue(dimensionKey, lantern, skeleton)
                : null;

            if (numericValue === null || isNaN(numericValue)) continue;

            if (dimensionKey === 'pitch') {
                VghLantern__Env2d__DimensionRenderer__DrawAngular(
                    targetLayer, skeleton, viewKey, numericValue, !!descriptor, config);
                continue;
            }

            run  =  runs[dimensionKey];
            if (!run) continue;

            VghLantern__Env2d__DimensionRenderer__DrawLinear(
                targetLayer, run, dimensionKey,
                descriptor ? descriptor.Label : dimensionKey,
                numericValue,
                descriptor ? descriptor.Unit : 'mm',
                !!descriptor,
                extents, viewKey, config
            );
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Env2d__DimensionRenderer__Render       : VghLantern__Env2d__DimensionRenderer__Render,
        VghLantern__Env2d__DimensionRenderer__KeysForView  : VghLantern__Env2d__DimensionRenderer__KeysForView,
        VghLantern__Env2d__DimensionRenderer__FormatValue   : VghLantern__Env2d__DimensionRenderer__FormatValue,

        VGHLANTERN__ENV2D__DIM_ATTR_KEY   : ATTR_KEY,
        VGHLANTERN__ENV2D__DIM_ATTR_VALUE : ATTR_VALUE,
        VGHLANTERN__ENV2D__DIM_ATTR_UNIT  : ATTR_UNIT
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Env2d__DimensionRenderer  =  VghLantern__Env2d__DimensionRenderer;
