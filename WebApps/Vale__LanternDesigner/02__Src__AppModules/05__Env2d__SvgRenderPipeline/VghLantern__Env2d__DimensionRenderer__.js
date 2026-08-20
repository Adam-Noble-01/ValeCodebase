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

   ---------------------------------------------------------------------------

   THE SECOND TIER - GLAZE BAR SETTING OUT

   Plan only, and outside the key list above, because it is not one dimension per
   key: it is a CHAIN whose segment count changes with the set-out. It reads the
   station lists the GlazeBarLayout published on the bar set rather than deriving
   bar positions of its own, so the chain and the bars it measures can never
   disagree - there is only one set of numbers.

   Two chains: bar centreline to bar centreline along the long eaves, and the same
   along the short eaves. Each closes out to the eaves datum corner at both ends,
   so the flexible end pane is stated rather than left to be inferred.

   It is drawn subordinate on purpose - smaller text, a desaturated red, and
   nearest the lantern with the overall chains stepped out past it. A fitter reads
   the overall size first and the set-out second, and the drawing should say so.

   A segment that measures the resolved set-out pitch is typed-editable through
   the existing paneWidth constraint, so a spacing can be changed on the drawing
   as well as on the slider. The end panes never are: they are what the division
   leaves over, not a value anybody sets.

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
    const CSS_DIM_GROUP_SECOND =  'VghLantern__Env2d__Dimension--secondary';      // <-- Wraps a second rank dimension; the stylesheet steps its colour and weight back from this one class
    const CSS_DIM_GROUP_SETOUT =  'VghLantern__Env2d__Dimension--setOut';         // <-- Wraps the glaze bar setting out chain; the stylesheet mutes every line and value inside it from this one class

    const ATTR_KEY             =  'data-vgh-dimension-key';                       // <-- Editor binding hook
    const ATTR_VALUE           =  'data-vgh-dimension-value';                      // <-- Current numeric value
    const ATTR_UNIT            =  'data-vgh-dimension-unit';                       // <-- 'mm' or 'deg'
    const ATTR_EDITABLE        =  'data-vgh-dimension-editable';                    // <-- 'true' when resolver-backed

    // THREE RANKS OF DIMENSION, and a run says which one it belongs to. Rank is
    // not decoration: it is the drawing telling the reader what governs. The
    // overall external size is what the lantern is ordered as; the opening through
    // the upstand is derived from it; the glaze bar set-out is derived from that.
    // Each rank steps down one size and one step in colour saturation, and they
    // all keep the same tick, font and witness convention so they read as one
    // drawing rather than three.
    const STYLE_SECONDARY      =  'secondary';                                    // <-- Internal upstand and the thicknesses chained with it
    const STYLE_SETOUT         =  'setOut';                                       // <-- Glaze bar setting out, the quietest rank

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
            ExternalUpstandTextSuffix    : str('ExternalUpstandTextSuffix'),
            InternalUpstandTextSuffix    : str('InternalUpstandTextSuffix'),
            AngleShowBaselineLeg         : bool('AngleShowBaselineLeg'),
            AngleBaselineOverrunFactor   : num('AngleBaselineOverrunFactor'),
            EditHintTooltip              : str('EditHintTooltip')
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Second Rank Dimension Config
    // ------------------------------------------------------------
    // Same shape as the main dimension config, differing only in the three values
    // that set its rank: glyph size, tick length and the gap the value sits off
    // its line. Everything else is inherited, because a second rank dimension must
    // read as the SAME drawing convention one step quieter, not as a second one.
    function VghLantern__Env2d__DimensionRenderer__ReadSecondaryConfig(mainConfig) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var env2d         =  ConfigLoader ? ConfigLoader.VghLantern__ConfigLoader__GetSection('Env2d') : null;
        var tierCfg       =  (env2d && env2d['VghLantern__Env2d__Config__SecondaryDimensions']) || {};
        var LABEL         =  'Na__Env2d__Config.json -> VghLantern__Env2d__Config__SecondaryDimensions';

        function num(key)  { return ConfigLoader.VghLantern__ConfigLoader__RequireNumber(tierCfg, key, LABEL); }

        return {
            OffsetFromGeometryMm    : mainConfig.OffsetFromGeometryMm,
            ChainOffsetStepMm       : mainConfig.ChainOffsetStepMm,
            ExtensionLineOverrunMm  : mainConfig.ExtensionLineOverrunMm,
            ExtensionLineGapMm      : mainConfig.ExtensionLineGapMm,
            TerminatorLengthMm      : num('TerminatorLengthMm'),
            TerminatorStyle         : mainConfig.TerminatorStyle,
            TextFontSizeMm          : num('TextFontSizeMm'),
            TextOffsetFromLineMm    : num('TextOffsetFromLineMm'),
            EditHintTooltip         : mainConfig.EditHintTooltip
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Glaze Bar Setting Out Tier Config
    // ------------------------------------------------------------
    // Returned in the same shape the main dimension config uses, so the shared
    // witness, terminator and value-text helpers can be handed either one and
    // neither has to know which tier it is drawing. ChainOffsetStepMm is borrowed
    // from the main tier because the two chains must step outward together.
    function VghLantern__Env2d__DimensionRenderer__ReadSetOutConfig(mainConfig) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var env2d         =  ConfigLoader ? ConfigLoader.VghLantern__ConfigLoader__GetSection('Env2d') : null;
        var tierCfg       =  (env2d && env2d['VghLantern__Env2d__Config__GlazeBarSetOutDimensions']) || {};
        var LABEL         =  'Na__Env2d__Config.json -> VghLantern__Env2d__Config__GlazeBarSetOutDimensions';

        function num(key)  { return ConfigLoader.VghLantern__ConfigLoader__RequireNumber(tierCfg, key, LABEL); }
        function bool(key) { return ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(tierCfg, key, LABEL); }

        return {
            Enabled                 : bool('Enabled'),
            OffsetFromGeometryMm    : num('OffsetFromGeometryMm'),
            ChainOffsetStepMm       : mainConfig.ChainOffsetStepMm,
            ExtensionLineOverrunMm  : mainConfig.ExtensionLineOverrunMm,
            ExtensionLineGapMm      : mainConfig.ExtensionLineGapMm,
            TerminatorLengthMm      : num('TerminatorLengthMm'),
            TerminatorStyle         : mainConfig.TerminatorStyle,
            TextFontSizeMm          : num('TextFontSizeMm'),
            TextOffsetFromLineMm    : num('TextOffsetFromLineMm'),
            ShowEndPaneDimensions   : bool('ShowEndPaneDimensions'),
            MinSegmentToLabelMm     : num('MinSegmentToLabelMm'),
            OverallChainStepsPushed : num('OverallChainStepsPushed'),
            EditHintTooltip         : mainConfig.EditHintTooltip
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
    // chainBase shifts every run one step outward when the glaze bar setting out
    // tier is drawn beneath them. Passed in rather than baked into the numbers
    // below so that turning the tier off in config closes the gap it left rather
    // than leaving the overall chain floating one step out from nothing.
    function VghLantern__Env2d__DimensionRenderer__PlanRuns(skeleton, chainBase, config) {
        var meta        =  skeleton.Meta;
        var base        =  skeleton.Base || {};
        var halfWidth   =  meta.WidthMm / 2;
        var halfDepth   =  meta.DepthMm / 2;
        var Pt          =  VghLantern__Env2d__DimensionRenderer__Pt;
        var chainFrom   =  Number(chainBase) || 0;

        // No eavesProjection run any more: the roof springs from the eaves
        // datum ring INSIDE the envelope (head beam inner face), so there is no
        // oversailing projection left to dimension in plan.
        //
        // The overall size is the EXTERNAL upstand, and it is named as such,
        // because the plan now states the opening through the upstand beside it
        // and the two must never be read for one another. One is what the lantern
        // measures; the other is the hole the builder cuts.
        var externalSuffix  =  config ? config.ExternalUpstandTextSuffix : '';
        var internalSuffix  =  config ? config.InternalUpstandTextSuffix : '';

        var runs  =  {
            'width' : {
                Start      : Pt(-halfWidth, -halfDepth, 0),
                End        : Pt( halfWidth, -halfDepth, 0),
                Side       : SIDE_BELOW,
                Chain      : chainFrom,
                TextSuffix : externalSuffix
            },
            'depth' : {
                Start      : Pt(halfWidth, -halfDepth, 0),
                End        : Pt(halfWidth,  halfDepth, 0),
                Side       : SIDE_RIGHT,
                Chain      : chainFrom,
                TextSuffix : externalSuffix
            }
        };

        // The opening through the upstand, inboard of the overall size on both
        // axes. Read only: it is the overall size less two upstand thicknesses,
        // so it is a consequence of two values that are each already editable
        // rather than a third input that could contradict them.
        //
        // SECOND RANK, AND ON THE OPPOSITE EDGE TO THE SIZE IT DERIVES FROM.
        //
        // Rank first: between the two the EXTERNAL size governs. It is what the
        // lantern is ordered as and what every other drawing on the job repeats;
        // the opening is derived from it. Two dimensions of equal weight sitting
        // one above the other invite the reader to work out which of them leads.
        //
        // Side second: stacked under the external size they were two long numbers
        // one above the other, competing for the same strip of paper as a setting
        // out chain already in it. Sent to the far edge each has a clear side of
        // the drawing to itself, and the pair reads ACROSS the lantern rather than
        // down one crowded margin. Points are built on the edge the dimension
        // sits against, so no witness line crosses the lantern to reach its own
        // dimension line.
        if (base.HasReveal && base.RevealWidthMm > 0 && base.RevealDepthMm > 0) {
            runs['internalUpstand']  =  [
                {
                    Start      : Pt(-base.InnerHalfWidthMm, halfDepth, 0),
                    End        : Pt( base.InnerHalfWidthMm, halfDepth, 0),
                    Side       : SIDE_ABOVE,
                    Chain      : chainFrom + 1,
                    Style      : STYLE_SECONDARY,
                    ValueMm    : Math.round(base.RevealWidthMm),
                    TextSuffix : internalSuffix,
                    Label      : 'Internal Upstand Width'
                },
                {
                    Start      : Pt(-halfWidth, -base.InnerHalfDepthMm, 0),
                    End        : Pt(-halfWidth,  base.InnerHalfDepthMm, 0),
                    Side       : SIDE_LEFT,
                    Chain      : chainFrom,
                    Style      : STYLE_SECONDARY,
                    ValueMm    : Math.round(base.RevealDepthMm),
                    TextSuffix : internalSuffix,
                    Label      : 'Internal Upstand Depth'
                }
            ];
        }

        // Builders Upstand thickness, at BOTH ends of the FAR edge and on the SAME
        // line as the internal upstand it brackets. That makes one chained
        // dimension across that edge - 110, the opening, 110 - and the external
        // size on the opposite edge is what it sums to. A chain is how a
        // draughtsman states a set of parts that make a whole, and it is the sum
        // the reader was going to do anyway.
        //
        // Second rank like the opening it brackets, so the line they share is one
        // line throughout rather than changing weight and colour partway along
        // itself. It travels with that chain, which is why it left the near edge
        // when the opening did.
        //
        // The upstand is the same thickness all the way round, so one corner
        // stating it and the other left blank would read as though the two might
        // differ.
        if (base.HasReveal) {
            runs['upstandThickness']  =  [
                {
                    Start : Pt(-halfWidth,             halfDepth, 0),
                    End   : Pt(-base.InnerHalfWidthMm, halfDepth, 0),
                    Side  : SIDE_ABOVE,
                    Chain : chainFrom + 1,
                    Style : STYLE_SECONDARY
                },
                {
                    Start : Pt(base.InnerHalfWidthMm,  halfDepth, 0),
                    End   : Pt(halfWidth,              halfDepth, 0),
                    Side  : SIDE_ABOVE,
                    Chain : chainFrom + 1,
                    Style : STYLE_SECONDARY
                }
            ];
        }

        // The ridge only exists as a run when it has length - a pyramid has none.
        var ridgeMembers  =  window.VghLantern__Geometry__SkeletonSolver
            .VghLantern__SkeletonSolver__MembersByRole(skeleton, 'ridge');

        if (ridgeMembers.length) {
            var ridgeStart  =  ridgeMembers[0].Start;
            var ridgeEnd    =  ridgeMembers[0].End;

            // SECOND RANK, and one step nearer the lantern than the rest of the
            // ladder. The ridge and the two hip end runs are a BREAKDOWN of the
            // width - the same relationship to it that the opening has - so they
            // belong at the opening's rank rather than shouting at the volume of
            // the overall size they add up to.
            //
            // A value always sits on the far side of its own dimension line, which
            // on this edge means it grows towards whatever is outboard of it.
            // Dropping this chain a step gives its text somewhere to go that is
            // not the internal upstand chain above it.
            var setOutChain  =  Math.max(0, chainFrom - 1);

            runs['ridgeLength']  =  {
                Start : ridgeStart,
                End   : ridgeEnd,
                Side  : SIDE_ABOVE,
                Chain : setOutChain,
                Style : STYLE_SECONDARY
            };

            // The two hip end runs that close the top chain: eaves corner to ridge
            // end, either side of the ridge length. Without them the top chain
            // states the middle of the lantern and leaves the reader to subtract
            // it from the width themselves, which is the arithmetic a setting out
            // drawing exists to have already done.
            //
            // The inner witness point IS the ridge end point, so each run shares a
            // witness line with the ridge dimension rather than drawing a second
            // one beside it. The outer one is taken off the FAR eaves corner, the
            // one this edge's dimension line actually sits against - off the near
            // corner it drew a witness the full height of the lantern to reach a
            // line on the other side of it. The value is carried on the run: the hip end run is a
            // consequence of the width, the depth and the pitch rather than an
            // input, so it has no constraint descriptor and is read only.
            var ridgeHalfMm  =  Math.max(Math.abs(ridgeStart.x), Math.abs(ridgeEnd.x));
            var hipRunMm     =  Math.round(halfWidth - ridgeHalfMm);

            if (hipRunMm > 0) {
                runs['hipEndRun']  =  [
                    {
                        Start   : Pt(-halfWidth, halfDepth, 0),
                        End     : { x: -ridgeHalfMm, y: ridgeStart.y, z: ridgeStart.z },
                        Side    : SIDE_ABOVE,
                        Chain   : setOutChain,
                        Style   : STYLE_SECONDARY,
                        ValueMm : hipRunMm,
                        Label   : 'Hip End Run'
                    },
                    {
                        Start   : { x: ridgeHalfMm, y: ridgeEnd.y, z: ridgeEnd.z },
                        End     : Pt(halfWidth, halfDepth, 0),
                        Side    : SIDE_ABOVE,
                        Chain   : setOutChain,
                        Style   : STYLE_SECONDARY,
                        ValueMm : hipRunMm,
                        Label   : 'Hip End Run'
                    }
                ];
            }
        }

        return runs;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Derive Witness Point Pairs for an Elevation View
    // ------------------------------------------------------------
    // isFront selects which world axis lies across the page: front elevation
    // reads along X (width), side elevation reads along Y (depth).
    function VghLantern__Env2d__DimensionRenderer__ElevationRuns(skeleton, isFront, config) {
        var meta        =  skeleton.Meta;
        var base        =  skeleton.Base || {};
        var Pt          =  VghLantern__Env2d__DimensionRenderer__Pt;

        var acrossHalf  =  isFront ? (meta.WidthMm / 2)      : (meta.DepthMm / 2);
        var depthKey    =  isFront ? 'width'                 : 'depth';

        var innerHalf   =  isFront ? base.InnerHalfWidthMm   : base.InnerHalfDepthMm;
        var openingMm   =  isFront ? base.RevealWidthMm      : base.RevealDepthMm;

        var externalSuffix  =  config ? config.ExternalUpstandTextSuffix : '';
        var internalSuffix  =  config ? config.InternalUpstandTextSuffix : '';

        // Build points on the near face so the projection is unambiguous.
        function acrossPt(acrossValue, zValue) {
            return isFront
                ? Pt(acrossValue, -(meta.DepthMm / 2), zValue)
                : Pt(-(meta.WidthMm / 2), acrossValue, zValue);
        }

        var runs  =  {};

        // The same pair the plan states, and named the same way, so the two views
        // cannot be read as describing different things. They stack here rather
        // than crossing to opposite edges as they do in plan: the opposite edge of
        // an elevation is the sky above the ridge, and there is nothing under this
        // one to crowd them.
        //
        // TWO chain steps between them, not one. A chain step is sized for a
        // dimension line and its ticks; the value that hangs off each line takes
        // most of the step on its own, so two stacked dimensions one step apart
        // end up with their ticks and the next value's glyphs almost touching.
        // Skipping a step is what gives the pair room to read as a pair.
        var hasOpening    =  base.HasReveal && innerHalf > 0 && openingMm > 0;
        var externalChain =  hasOpening ? 2 : 0;

        runs[depthKey]  =  {
            Start      : acrossPt(-acrossHalf, 0),
            End        : acrossPt( acrossHalf, 0),
            Side       : SIDE_BELOW,
            Chain      : externalChain,
            TextSuffix : externalSuffix
        };

        if (hasOpening) {
            runs['internalUpstand']  =  {
                Start      : acrossPt(-innerHalf, 0),
                End        : acrossPt( innerHalf, 0),
                Side       : SIDE_BELOW,
                Chain      : 0,
                Style      : STYLE_SECONDARY,
                ValueMm    : Math.round(openingMm),
                TextSuffix : internalSuffix,
                Label      : 'Internal Upstand'
            };
        }

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
    function VghLantern__Env2d__DimensionRenderer__BuildRuns(skeleton, viewKey, chainBase, config) {
        if (viewKey === 'plan')           return VghLantern__Env2d__DimensionRenderer__PlanRuns(skeleton, chainBase, config);
        if (viewKey === 'frontElevation') return VghLantern__Env2d__DimensionRenderer__ElevationRuns(skeleton, true,  config);
        if (viewKey === 'sideElevation')  return VghLantern__Env2d__DimensionRenderer__ElevationRuns(skeleton, false, config);
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


    // HELPER FUNCTION | Resolve Which Rank a Run Is Drawn At
    // ------------------------------------------------------------
    // A run says which of the three ranks it belongs to and this picks up that
    // rank's sizes and its group class. Chain POSITION always comes from the main
    // config, so every rank stacks in the same ladder rather than each measuring
    // itself from a different origin.
    function VghLantern__Env2d__DimensionRenderer__RankFor(run, ranks) {
        if (run.Style === STYLE_SECONDARY && ranks.Secondary) {
            return { Config : ranks.Secondary, GroupClass : ' ' + CSS_DIM_GROUP_SECOND };
        }
        if (run.Style === STYLE_SETOUT && ranks.SetOut) {
            return { Config : ranks.SetOut, GroupClass : ' ' + CSS_DIM_GROUP_SETOUT };
        }
        return { Config : ranks.Main, GroupClass : '' };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Draw One Complete Linear Dimension
    // ------------------------------------------------------------
    function VghLantern__Env2d__DimensionRenderer__DrawLinear(targetLayer, run, dimensionKey, label, numericValue, unitLabel, isEditable, extents, viewKey, ranks) {
        var SvgHelpers    =  window.VghLantern__Env2d__SvgHelpers;
        var CoordHelpers  =  window.VghLantern__Env2d__CoordHelpers;

        var config  =  ranks.Main;
        var rank    =  VghLantern__Env2d__DimensionRenderer__RankFor(run, ranks);
        var style   =  rank.Config;

        var p1  =  CoordHelpers.VghLantern__Env2d__CoordHelpers__ProjectPoint(run.Start, viewKey);
        var p2  =  CoordHelpers.VghLantern__Env2d__CoordHelpers__ProjectPoint(run.End,   viewKey);

        var isHorizontalRun  =  (run.Side === SIDE_BELOW || run.Side === SIDE_ABOVE);
        var base             =  VghLantern__Env2d__DimensionRenderer__BaseForSide(extents, run.Side, run.Chain, config);

        var d1  =  isHorizontalRun ? { x: p1.x, y: base } : { x: base, y: p1.y };
        var d2  =  isHorizontalRun ? { x: p2.x, y: base } : { x: base, y: p2.y };

        // A degenerate run would draw a dot and a meaningless value.
        var runLength  =  isHorizontalRun ? Math.abs(d2.x - d1.x) : Math.abs(d2.y - d1.y);
        if (runLength < 1) return;

        var group  =  SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateGroup(
            CSS_DIM_GROUP + rank.GroupClass, {
                'data-vgh-dimension-group' : dimensionKey
            });

        VghLantern__Env2d__DimensionRenderer__DrawWitness(group, p1, base, isHorizontalRun, style);
        VghLantern__Env2d__DimensionRenderer__DrawWitness(group, p2, base, isHorizontalRun, style);

        group.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateLine(d1, d2, CSS_DIM_LINE));

        VghLantern__Env2d__DimensionRenderer__DrawTerminator(group, d1, isHorizontalRun, style);
        VghLantern__Env2d__DimensionRenderer__DrawTerminator(group, d2, isHorizontalRun, style);

        var midPt  =  { x: (d1.x + d2.x) / 2, y: (d1.y + d2.y) / 2 };
        var display  =  VghLantern__Env2d__DimensionRenderer__FormatValue(numericValue, unitLabel);
        if (run.TextSuffix) display  +=  run.TextSuffix;                       // <-- Naming stays out of the numeric value, so a named dimension is still typed-editable from the number alone

        VghLantern__Env2d__DimensionRenderer__DrawValueText(
            group, midPt, isHorizontalRun, display, numericValue, unitLabel, dimensionKey, isEditable, style);

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
// REGION | Glaze Bar Setting Out Chain
// -----------------------------------------------------------------------------
// The second dimension tier. A chain rather than a run table, because its segment
// count is whatever the set-out resolved to. Every number in it comes off the
// station lists GlazeBarLayout published, so nothing here re-derives a bar
// position and nothing here can disagree with the bars that are drawn.
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Two Setting Out Chains for the Plan View
    // ------------------------------------------------------------
    // Returns one chain per plan axis, each carrying the ordered offsets along
    // that axis closed out to the eaves datum corner at both ends. Which station
    // list lands on which axis follows LongAxis, so a lantern deeper than it is
    // wide annotates correctly without a second code path.
    //
    // Sides match the overall chain the tier sits under: the horizontal axis is
    // dimensioned below the lantern, the vertical axis to its right.
    function VghLantern__Env2d__DimensionRenderer__SetOutChains(skeleton, barSet) {
        var setOut  =  barSet && barSet.SetOut;
        if (!setOut) return [];

        var meta       =  skeleton.Meta;
        var halfWidth  =  meta.WidthMm / 2;
        var halfDepth  =  meta.DepthMm / 2;
        var longIsX    =  setOut.LongAxis !== 'y';

        var xStations   =  longIsX ? setOut.LongAxisStationsMm  : setOut.ShortAxisStationsMm;
        var yStations   =  longIsX ? setOut.ShortAxisStationsMm : setOut.LongAxisStationsMm;
        var xHalfSpan   =  longIsX ? setOut.LongAxisHalfSpanMm  : setOut.ShortAxisHalfSpanMm;
        var yHalfSpan   =  longIsX ? setOut.ShortAxisHalfSpanMm : setOut.LongAxisHalfSpanMm;

        // The chain runs corner to corner along the EAVES DATUM, which is where
        // the bars actually spring from, while the witness lines start at the
        // outer envelope edge so they clear the lantern outline the way the
        // overall dimensions do.
        return [
            {
                Key       : 'glazeBarSpacingX',
                Values    : VghLantern__Env2d__DimensionRenderer__CloseChain(xStations, xHalfSpan),
                Side      : SIDE_BELOW,
                FixedFrom : -halfDepth,
                IsAlongX  : true
            },
            {
                Key       : 'glazeBarSpacingY',
                Values    : VghLantern__Env2d__DimensionRenderer__CloseChain(yStations, yHalfSpan),
                Side      : SIDE_RIGHT,
                FixedFrom : halfWidth,
                IsAlongX  : false
            }
        ];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Close a Station List Out to Both Eaves Corners
    // ------------------------------------------------------------
    // A station list describes bars only. Adding the two eaves datum corners turns
    // it into a chain that accounts for the whole span, which is what makes the
    // flexible end pane visible instead of implied.
    function VghLantern__Env2d__DimensionRenderer__CloseChain(stations, halfSpanMm) {
        if (!Array.isArray(stations) || stations.length === 0) return [];
        if (!(halfSpanMm > 0)) return [];

        var values  =  [-halfSpanMm];
        var i;

        for (i = 0; i < stations.length; i++) {
            if (Math.abs(stations[i]) >= halfSpanMm) continue;                 // <-- A station on the corner would make a zero length segment
            values.push(stations[i]);
        }

        values.push(halfSpanMm);
        return values;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Draw One Complete Setting Out Chain
    // ------------------------------------------------------------
    // One witness line per station, ONE dimension line across the whole chain, a
    // terminator at every station and a value between each adjacent pair. That is
    // a chained dimension as a draughtsman draws it, rather than a stack of
    // individual dimensions that would repeat every witness line.
    function VghLantern__Env2d__DimensionRenderer__DrawSetOutChain(targetLayer, chain, spacingMm, extents, viewKey, config) {
        var SvgHelpers    =  window.VghLantern__Env2d__SvgHelpers;
        var CoordHelpers  =  window.VghLantern__Env2d__CoordHelpers;
        var Pt            =  VghLantern__Env2d__DimensionRenderer__Pt;

        if (chain.Values.length < 2) return;

        var isHorizontalRun  =  (chain.Side === SIDE_BELOW || chain.Side === SIDE_ABOVE);
        var base             =  VghLantern__Env2d__DimensionRenderer__BaseForSide(extents, chain.Side, 0, config);

        var group  =  SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateGroup(
            CSS_DIM_GROUP + ' ' + CSS_DIM_GROUP_SETOUT, {
                'data-vgh-dimension-group' : chain.Key
            });

        // Project every station once. The plan projection is rigid, so a segment
        // measures the same on the page as it does in the model, but the values
        // are read from the model list rather than off the projected points so a
        // label can never disagree with the set-out by a rounding step.
        var projected  =  [];
        var i, modelPt, linePt;

        for (i = 0; i < chain.Values.length; i++) {
            modelPt  =  chain.IsAlongX
                ? Pt(chain.Values[i], chain.FixedFrom, 0)
                : Pt(chain.FixedFrom, chain.Values[i], 0);

            projected.push(CoordHelpers.VghLantern__Env2d__CoordHelpers__ProjectPoint(modelPt, viewKey));
        }

        for (i = 0; i < projected.length; i++) {
            VghLantern__Env2d__DimensionRenderer__DrawWitness(group, projected[i], base, isHorizontalRun, config);
        }

        var linePts  =  [];
        for (i = 0; i < projected.length; i++) {
            linePt  =  isHorizontalRun ? { x: projected[i].x, y: base } : { x: base, y: projected[i].y };
            linePts.push(linePt);
        }

        group.appendChild(SvgHelpers.VghLantern__Env2d__SvgHelpers__CreateLine(
            linePts[0], linePts[linePts.length - 1], CSS_DIM_LINE));

        for (i = 0; i < linePts.length; i++) {
            VghLantern__Env2d__DimensionRenderer__DrawTerminator(group, linePts[i], isHorizontalRun, config);
        }

        VghLantern__Env2d__DimensionRenderer__DrawSetOutValues(group, chain, linePts, spacingMm, isHorizontalRun, config);

        group.setAttribute('data-vgh-dimension-label', 'Glaze bar setting out');
        targetLayer.appendChild(group);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Label Every Segment of a Setting Out Chain
    // ------------------------------------------------------------
    // A segment that measures the resolved set-out pitch is tagged with the
    // paneWidth dimension key, which makes it typed-editable through the existing
    // constraint. Anything else - the two flexible end panes, and the hip end legs
    // on a plan whose hips are not at 45 degrees - is drawn read only, because it
    // is a consequence of the set-out rather than an input to it.
    function VghLantern__Env2d__DimensionRenderer__DrawSetOutValues(group, chain, linePts, spacingMm, isHorizontalRun, config) {
        var lastIndex  =  chain.Values.length - 2;                            // <-- Index of the final segment
        var i, segmentMm, isEndPane, isPitch, midPt, display;

        for (i = 0; i < chain.Values.length - 1; i++) {
            segmentMm  =  Math.abs(chain.Values[i + 1] - chain.Values[i]);
            if (segmentMm < config.MinSegmentToLabelMm) continue;

            isEndPane  =  (i === 0 || i === lastIndex);
            if (isEndPane && !config.ShowEndPaneDimensions) continue;

            isPitch  =  !isEndPane && spacingMm > 0 && Math.abs(segmentMm - spacingMm) < 1;

            midPt  =  {
                x : (linePts[i].x + linePts[i + 1].x) / 2,
                y : (linePts[i].y + linePts[i + 1].y) / 2
            };

            display  =  VghLantern__Env2d__DimensionRenderer__FormatValue(segmentMm, 'mm');

            // Read-only segments still carry a descriptive key so the DOM says
            // what each number is. The editor binds on the editable flag, not on
            // the presence of a key, so naming them costs nothing.
            VghLantern__Env2d__DimensionRenderer__DrawValueText(
                group, midPt, isHorizontalRun, display,
                Math.round(segmentMm), 'mm',
                isPitch ? 'paneWidth' : (isEndPane ? 'glazeBarEndPane' : 'glazeBarSpacing'),
                isPitch, config);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw the Whole Setting Out Tier for a View
    // ------------------------------------------------------------
    // Plan only. Returns how many chain steps the overall dimensions must move
    // outward to clear what was drawn, which is zero when nothing was, so a tier
    // switched off in config leaves no gap behind it.
    function VghLantern__Env2d__DimensionRenderer__DrawSetOutTier(targetLayer, skeleton, barSet, viewKey, extents, mainConfig) {
        if (viewKey !== 'plan') return 0;
        if (!barSet || !barSet.SetOut) return 0;

        var config  =  VghLantern__Env2d__DimensionRenderer__ReadSetOutConfig(mainConfig);
        if (!config.Enabled) return 0;

        var chains  =  VghLantern__Env2d__DimensionRenderer__SetOutChains(skeleton, barSet);
        var drewAny =  false;
        var i;

        for (i = 0; i < chains.length; i++) {
            if (chains[i].Values.length < 2) continue;
            VghLantern__Env2d__DimensionRenderer__DrawSetOutChain(
                targetLayer, chains[i], barSet.SetOut.SpacingMm, extents, viewKey, config);
            drewAny  =  true;
        }

        return drewAny ? config.OverallChainStepsPushed : 0;
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
    function VghLantern__Env2d__DimensionRenderer__Render(instance, skeleton, lantern, barSet) {
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

        // The setting out tier is drawn FIRST, and whether it drew decides where
        // the overall chains start. Asking it afterwards would mean either laying
        // the overall chains out twice or leaving a permanent gap for a tier that
        // may be switched off in config.
        var chainBase  =  VghLantern__Env2d__DimensionRenderer__DrawSetOutTier(
            targetLayer, skeleton, barSet, viewKey, extents, config);

        var runs  =  VghLantern__Env2d__DimensionRenderer__BuildRuns(skeleton, viewKey, chainBase, config);
        var keys  =  VghLantern__Env2d__DimensionRenderer__KeysForView(viewKey);

        // All three ranks are built whether or not the setting out tier drew, because
        // a run borrows a rank's look without belonging to that tier.
        var ranks  =  {
            Main      : config,
            Secondary : VghLantern__Env2d__DimensionRenderer__ReadSecondaryConfig(config),
            SetOut    : VghLantern__Env2d__DimensionRenderer__ReadSetOutConfig(config)
        };

        var i, j, dimensionKey, descriptor, resolvedValue, keyRuns, run, numericValue;

        for (i = 0; i < keys.length; i++) {
            dimensionKey  =  keys[i];
            descriptor    =  Resolver ? Resolver.VghLantern__ConstraintResolver__GetDescriptor(dimensionKey) : null;

            resolvedValue  =  (Resolver && lantern)
                ? Resolver.VghLantern__ConstraintResolver__ReadCurrentValue(dimensionKey, lantern, skeleton)
                : null;

            if (dimensionKey === 'pitch') {
                if (resolvedValue === null || isNaN(resolvedValue)) continue;
                VghLantern__Env2d__DimensionRenderer__DrawAngular(
                    targetLayer, skeleton, viewKey, resolvedValue, !!descriptor, config);
                continue;
            }

            // A key may carry more than one run - the upstand thickness states the
            // same number at both ends of the near edge, and the hip end run states
            // it either side of the ridge. One key, several places it is true.
            keyRuns  =  runs[dimensionKey];
            if (!keyRuns) continue;
            if (!Array.isArray(keyRuns)) keyRuns  =  [keyRuns];

            for (j = 0; j < keyRuns.length; j++) {
                run  =  keyRuns[j];

                // The constraint resolver is asked first, because a dimension the
                // user can type into must read back exactly what typing would set.
                // A run may instead carry its own value, which is how a derived
                // annotation with no constraint behind it still draws rather than
                // silently disappearing.
                numericValue  =  (resolvedValue === null || isNaN(resolvedValue))
                    ? (typeof run.ValueMm === 'number' ? run.ValueMm : null)
                    : resolvedValue;

                if (numericValue === null || isNaN(numericValue)) continue;

                VghLantern__Env2d__DimensionRenderer__DrawLinear(
                    targetLayer, run, dimensionKey,
                    run.Label || (descriptor ? descriptor.Label : dimensionKey),
                    numericValue,
                    descriptor ? descriptor.Unit : 'mm',
                    !!descriptor,
                    extents, viewKey, ranks
                );
            }
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
