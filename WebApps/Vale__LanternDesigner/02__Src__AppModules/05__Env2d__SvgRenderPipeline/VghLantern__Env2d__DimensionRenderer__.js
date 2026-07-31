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
     dimension the active view exposes, plus an angular dimension for the pitch.
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
    const CSS_DIM_ARC          =  'VghLantern__Env2d__Dimension__Arc';            // <-- Angular dimension arc

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
    function VghLantern__Env2d__DimensionRenderer__ReadConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var env2d         =  ConfigLoader ? ConfigLoader.VghLantern__ConfigLoader__GetSection('Env2d') : null;
        var dimCfg        =  (env2d && env2d['VghLantern__Env2d__Config__Dimensions']) || {};

        function num(key, fallback) {
            return (typeof dimCfg[key] === 'number') ? dimCfg[key] : fallback;
        }

        return {
            Enabled                : dimCfg.Enabled !== false,
            OffsetFromGeometryMm   : num('OffsetFromGeometryMm',   220),
            ChainOffsetStepMm      : num('ChainOffsetStepMm',      160),
            ExtensionLineOverrunMm : num('ExtensionLineOverrunMm',  40),
            ExtensionLineGapMm     : num('ExtensionLineGapMm',      30),
            TerminatorLengthMm     : num('TerminatorLengthMm',      60),
            TerminatorStyle        : dimCfg.TerminatorStyle || 'tick',
            TextFontSizeMm         : num('TextFontSizeMm',           90),
            TextOffsetFromLineMm   : num('TextOffsetFromLineMm',     34),
            AngleArcRadiusMm       : num('AngleArcRadiusMm',        400),
            EditHintTooltip        : dimCfg.EditHintTooltip || 'Click to type a new value'
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
        var eavesHalfW  =  meta.EavesHalfWidthMm;
        var eavesHalfD  =  meta.EavesHalfDepthMm;
        var Pt          =  VghLantern__Env2d__DimensionRenderer__Pt;

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
            },
            'eavesProjection' : {
                Start : Pt(-eavesHalfW, halfDepth, 0),
                End   : Pt(-halfWidth,  halfDepth, 0),
                Side  : SIDE_BELOW,
                Chain : 1
            }
        };

        // Kerb thickness is dimensioned off the near edge, so the reveal offset
        // reads against the same line the width is measured from.
        if (base.HasReveal) {
            runs['kerbThickness']  =  {
                Start : Pt(-halfWidth,                       -halfDepth, 0),
                End   : Pt(-base.InnerHalfWidthMm,           -halfDepth, 0),
                Side  : SIDE_BELOW,
                Chain : 2
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

        // Suppress a zero-length eaves dimension rather than drawing a stub.
        if (Math.abs(eavesHalfW - halfWidth) < 1 && Math.abs(eavesHalfD - halfDepth) < 1) {
            delete runs['eavesProjection'];
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
        var eavesHalf   =  isFront ? meta.EavesHalfWidthMm   : meta.EavesHalfDepthMm;
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

        // The base reads bottom-up on the same side: kerb, then the frame that
        // sits on it, then the overall height chained outside both.
        runs['kerbHeight']  =  {
            Start : acrossPt(acrossHalf, 0),
            End   : acrossPt(acrossHalf, meta.KerbTopLevelMm),
            Side  : SIDE_RIGHT,
            Chain : 0
        };

        runs['frameHeight']  =  {
            Start : acrossPt(acrossHalf, meta.KerbTopLevelMm),
            End   : acrossPt(acrossHalf, meta.EavesLevelMm),
            Side  : SIDE_RIGHT,
            Chain : 1
        };

        runs['overallHeight']  =  {
            Start : acrossPt(acrossHalf, 0),
            End   : acrossPt(acrossHalf, meta.OverallHeightMm),
            Side  : SIDE_RIGHT,
            Chain : 2
        };

        if (Math.abs(eavesHalf - acrossHalf) >= 1) {
            runs['eavesProjection']  =  {
                Start : acrossPt(-eavesHalf,  0),
                End   : acrossPt(-acrossHalf, 0),
                Side  : SIDE_BELOW,
                Chain : 1
            };
        }

        if (meta.KerbHeightMm  <= 0) delete runs['kerbHeight'];
        if (meta.FrameHeightMm <= 0) delete runs['frameHeight'];

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
    function VghLantern__Env2d__DimensionRenderer__DrawValueText(group, midPt, isHorizontalRun, displayValue, numericValue, unitLabel, dimensionKey, isEditable, config) {
        var SvgHelpers  =  window.VghLantern__Env2d__SvgHelpers;

        var textPt  =  isHorizontalRun
            ? { x: midPt.x, y: midPt.y - config.TextOffsetFromLineMm }
            : { x: midPt.x, y: midPt.y };

        var attrs  =  {
            'font-size'      : config.TextFontSizeMm,
            'text-anchor'    : 'middle',
            'dominant-baseline': isHorizontalRun ? 'auto' : 'middle'
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
    // actually sees. Anchoring the arc to real drawn geometry keeps the
    // annotation truthful for every roof form the solver supports.
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


    // SUB FUNCTION | Draw the Pitch Angle Arc and Value
    // ------------------------------------------------------------
    function VghLantern__Env2d__DimensionRenderer__DrawAngular(targetLayer, skeleton, viewKey, numericValue, isEditable, config) {
        var SvgHelpers  =  window.VghLantern__Env2d__SvgHelpers;
        var edge        =  VghLantern__Env2d__DimensionRenderer__FindSlopeEdge(skeleton, viewKey);
        if (!edge) return;

        var anchor  =  edge.Anchor;
        var toward  =  edge.Toward;

        var dx  =  toward.x - anchor.x;
        var dy  =  toward.y - anchor.y;
        var len =  Math.sqrt((dx * dx) + (dy * dy));
        if (len < 1) return;

        var radius  =  Math.min(config.AngleArcRadiusMm, len * 0.75);
        var signX   =  (dx >= 0) ? 1 : -1;

        // Arc runs from the horizontal baseline round to the slope edge.
        var startPt  =  { x: anchor.x + (signX * radius), y: anchor.y };
        var endPt    =  { x: anchor.x + ((dx / len) * radius), y: anchor.y + ((dy / len) * radius) };

        // Slope edges rise up the page, so the sweep is always the short way.
        var sweepFlag  =  (signX > 0) ? 0 : 1;
        var pathData   =  'M ' + startPt.x + ' ' + startPt.y +
                         ' A ' + radius + ' ' + radius + ' 0 0 ' + sweepFlag + ' ' + endPt.x + ' ' + endPt.y;

        var group  =  SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateGroup(CSS_DIM_GROUP, {
            'data-vgh-dimension-group' : 'pitch'
        });

        // A short baseline makes the angle legible when the eaves line is faint.
        group.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateLine(
            anchor, { x: anchor.x + (signX * radius * 1.15), y: anchor.y }, CSS_DIM_WITNESS));

        group.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreatePath(pathData, CSS_DIM_ARC));

        var midAngle  =  Math.atan2(dy, dx) / 2;
        var textPt    =  {
            x : anchor.x + (Math.cos(midAngle) * radius * 1.30),
            y : anchor.y + (Math.sin(midAngle) * radius * 1.30)
        };

        VghLantern__Env2d__DimensionRenderer__DrawValueText(
            group, textPt, true,
            VghLantern__Env2d__DimensionRenderer__FormatValue(numericValue, 'deg'),
            numericValue, 'deg', 'pitch', isEditable, config);

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
