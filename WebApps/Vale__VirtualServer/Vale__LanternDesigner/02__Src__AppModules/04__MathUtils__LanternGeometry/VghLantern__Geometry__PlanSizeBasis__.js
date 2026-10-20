/* =============================================================================
   VGHLANTERN - PLAN SIZE BASIS
   =============================================================================

   FILE       : VghLantern__Geometry__PlanSizeBasis__.js
   NAMESPACE  : VghLantern
   MODULE     : Geometry - PlanSizeBasis
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The three places a lantern's length and width can be set out to,
                and the one exterior size every output is built from
   CREATED    : 20-Oct-2026

   DESCRIPTION:
   - A lantern's plan size can be stated to one of three places:

       externalUpstand  The FINISHED EXTERIOR of the builders upstand, including
                        the roof covering the builder dresses over it (GRP, EPDM,
                        felt). The standard, and the size the lantern is ordered as.
       eavesDatum       The EAVES DATUM. Vale's common reference point, where the
                        glaze bar datum meets the eaves plate: the head beam inner
                        face, 100mm above its underside. The measurement the
                        factory, the metal shop and the joinery shop work to.
       internalUpstand  The FINISHED INTERIOR of the builders upstand: the solid
                        kerb the builder builds on site. No plasterboard.

   - The basis is ONE stored value, Lantern__Dimensions__Config__SizeBasis,
     chosen from three diagram cards in Form and Size. A design saved before it
     reads as the exterior, which governs exactly as it always has.
     (20-Oct-2026: the first build had a switch plus a basis field, shown as an
     Advanced Lantern Sizes group nesting two cards. Adam saw it and asked for
     the three cards in one row instead; the validator folds those two draft
     fields into SizeBasis, so a design saved while testing keeps its choice.)
   - Whichever governs, the stored EXTERIOR size (Lantern__Dimensions__Config__
     WidthMm / DepthMm) stays the one number every consumer reads: the solver,
     the drawings, the takeoff, the specification, the warnings and the SketchUp
     payload. This module keeps it in step with the governing size, which is why
     not one of those consumers had to change.
   - Pure. No DOM, no config reads, no state. It reads and writes lantern blocks
     and nothing else, the same contract the ConstraintResolver works to.

   ---------------------------------------------------------------------------

   THE AXIS TRAP

   The keys follow the schema's axes, not the words on screen. ...WidthMm is
   model +X, the LONG axis; ...DepthMm is model +Y, the SHORT axis. The editor
   calls those Length and Width, as the Creation Wizard always has, so the
   control labelled "Eaves Datum Width" writes EavesDatumDepthMm. That is the
   same mapping the two exterior sliders have always had, kept so a reader can
   pair EavesDatumWidthMm with WidthMm without a lookup table.

   ---------------------------------------------------------------------------

   THE INSETS (per side, measured in from the finished exterior)

       eavesDatum       the head beam width, 125mm, from the base frame system
                        through VghLantern__Geometry__BaseFrameAssembly. The same
                        number the SkeletonSolver insets the datum ring by, so
                        an eaves datum typed here IS the ring the roof springs
                        from. The eaves detail configurator planned for later
                        will move this datum; when it does, InsetMm below is the
                        one place it has to be read.
       internalUpstand  the builders upstand thickness.

   Generally the eaves datum sits a little inboard of the internal upstand (125
   against a 110mm upstand) but not always: a 150mm upstand puts the kerb's face
   25mm inboard of the datum. Nothing here assumes which way round they fall.

   ---------------------------------------------------------------------------

   THE SYNC RULE

   1. The governing pair sets the exterior: exterior = governing + 2 x inset.
   2. The exterior sets every other pair: pair = exterior - 2 x inset.

   So all three pairs on the lantern always describe the same lantern, and
   switching basis never moves it: a switch first refreshes every pair from the
   basis that governed BEFORE it (AfterFieldWrite), so the basis taking over
   starts from the size the lantern already is.

   Holding the governing pair is what "set out to" means. With the internal
   upstand governing, a thicker builders upstand grows the lantern, because
   the hole is the fixed thing. With the eaves datum governing, the same change
   only narrows the opening: the head beam's outer face stays flush with the
   finished exterior, so the datum does not move.

   ---------------------------------------------------------------------------

   THE DRAWING LOCK

   With an advanced basis governing, the click-to-type dimensions that would
   write the exterior directly - the overall length and width, and the ridge
   length, which writes the width - are locked. Typing one would quietly take
   the lantern off the size it was set out to, which is the mistake the lock
   exists to stop. Every other typed dimension stays live: pitch, the heights,
   the upstand thickness and the pane width do not fight the plan size basis.

   ============================================================================= */

// =============================================================================
// REGION | Plan Size Basis Module
// =============================================================================

const VghLantern__Geometry__PlanSizeBasis = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Basis Keys
    // ------------------------------------------------------------
    // Stored values. The labels, explanations and diagrams that go with them
    // belong to VghLantern__AppData__PlanSizeBasisDiagrams, so a reworded card can
    // never change what a saved project means.
    const BASIS_EXTERNAL_UPSTAND  =  'externalUpstand';                       // <-- Finished exterior, the standard
    const BASIS_EAVES_DATUM       =  'eavesDatum';                            // <-- Glaze bar datum meets the eaves plate
    const BASIS_INTERNAL_UPSTAND  =  'internalUpstand';                       // <-- Finished interior of the solid kerb
    const ALL_BASES               =  [BASIS_EXTERNAL_UPSTAND, BASIS_EAVES_DATUM, BASIS_INTERNAL_UPSTAND];
    const ADVANCED_BASES          =  [BASIS_EAVES_DATUM, BASIS_INTERNAL_UPSTAND];   // <-- The two whose size is not the exterior
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Block and Field Keys
    // ------------------------------------------------------------
    const BLOCK_DIMENSIONS         =  'Lantern__Dimensions__Config';
    const BLOCK_UPSTAND            =  'Lantern__BuildersUpstandAndBase__Config';

    const FIELD_EXTERNAL_WIDTH     =  'Lantern__Dimensions__Config__WidthMm';             // <-- +X, the long axis, shown as Length
    const FIELD_EXTERNAL_DEPTH     =  'Lantern__Dimensions__Config__DepthMm';             // <-- +Y, the short axis, shown as Width
    const FIELD_SIZE_BASIS         =  'Lantern__Dimensions__Config__SizeBasis';
    const FIELD_EAVES_WIDTH        =  'Lantern__Dimensions__Config__EavesDatumWidthMm';
    const FIELD_EAVES_DEPTH        =  'Lantern__Dimensions__Config__EavesDatumDepthMm';
    const FIELD_INTERNAL_WIDTH     =  'Lantern__Dimensions__Config__InternalUpstandWidthMm';
    const FIELD_INTERNAL_DEPTH     =  'Lantern__Dimensions__Config__InternalUpstandDepthMm';
    const FIELD_UPSTAND_THICKNESS  =  'Lantern__BuildersUpstandAndBase__Config__UpstandThicknessMm';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Two Fields Each Basis Stores Its Size In
    // ------------------------------------------------------------
    // Keyed by the basis values above, written out rather than computed, because
    // a computed key would hide the one table a reader comes here to find.
    const PAIR_FIELDS  =  {
        'externalUpstand' : { Width : FIELD_EXTERNAL_WIDTH, Depth : FIELD_EXTERNAL_DEPTH },
        'eavesDatum'      : { Width : FIELD_EAVES_WIDTH,    Depth : FIELD_EAVES_DEPTH    },
        'internalUpstand' : { Width : FIELD_INTERNAL_WIDTH, Depth : FIELD_INTERNAL_DEPTH }
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Fields Whose Change Can Move the Plan Size
    // ------------------------------------------------------------
    // The thickness is here because it is the internal upstand's inset: with the
    // internal upstand governing, a thicker upstand is a bigger lantern.
    const PLAN_SIZE_FIELDS  =  [
        FIELD_EXTERNAL_WIDTH,
        FIELD_EXTERNAL_DEPTH,
        FIELD_SIZE_BASIS,
        FIELD_EAVES_WIDTH,
        FIELD_EAVES_DEPTH,
        FIELD_INTERNAL_WIDTH,
        FIELD_INTERNAL_DEPTH,
        FIELD_UPSTAND_THICKNESS
    ];
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Drawing Dimensions an Advanced Basis Locks
    // ------------------------------------------------------------
    // ConstraintResolver descriptor keys. Each one writes the exterior size: the
    // overall length (width key), the overall width (depth key), and the ridge
    // length, which is resolved by moving the width.
    const LOCKED_DIMENSION_KEYS  =  ['width', 'depth', 'ridgeLength'];
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Fallbacks and the Absolute Plan Envelope
    // ------------------------------------------------------------
    // The fallbacks mirror the base frame system index and the validator default,
    // and are reached only if those modules are missing, which a correctly ordered
    // load never allows. The envelope mirrors the validator's clamp and the
    // ConstraintResolver's width and depth limits: a governing size can never
    // push the exterior somewhere the schema would refuse to load.
    const FALLBACK_HEAD_BEAM_WIDTH_MM    =  125;
    const FALLBACK_UPSTAND_THICKNESS_MM  =  110;
    const ABSOLUTE_MIN_PLAN_MM           =  300;
    const ABSOLUTE_MAX_PLAN_MM           =  20000;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read a Stored Number, NaN When It Is Missing
    // ------------------------------------------------------------
    // Number(null) and Number('') are both 0, which would read a field that was
    // never written as a real zero-length lantern. Missing must stay missing.
    function VghLantern__PlanSizeBasis__ReadNumber(block, key) {
        if (!block) return NaN;

        var raw  =  block[key];
        if (typeof raw === 'number') return raw;
        if (typeof raw === 'string' && raw.trim() !== '') return Number(raw);
        return NaN;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clamp an Exterior Size to the Absolute Envelope
    // ------------------------------------------------------------
    function VghLantern__PlanSizeBasis__ClampExterior(valueMm) {
        return Math.min(ABSOLUTE_MAX_PLAN_MM, Math.max(ABSOLUTE_MIN_PLAN_MM, valueMm));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write a Field and Record the Change
    // ------------------------------------------------------------
    // Same change record the ConstraintResolver keeps, so a resolver edit can
    // carry the sync's knock-on changes in its own result.
    function VghLantern__PlanSizeBasis__WriteField(result, block, fieldKey, nextValue) {
        var previousValue  =  block[fieldKey];
        if (previousValue === nextValue) return;

        block[fieldKey]  =  nextValue;
        result.DidChange  =  true;
        result.ChangedFields.push({
            Block         : BLOCK_DIMENSIONS,
            Field         : fieldKey,
            PreviousValue : previousValue,
            NextValue     : nextValue
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build an Empty Sync Result
    // ------------------------------------------------------------
    function VghLantern__PlanSizeBasis__NewResult() {
        return { DidChange : false, ChangedFields : [] };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Which Basis Governs
// -----------------------------------------------------------------------------

    // FUNCTION | Resolve a Stored Basis Value to a Canonical Key
    // ------------------------------------------------------------
    // Anything unrecognised reads as the exterior, the standard every lantern was
    // before the choice existed. The validator calls this rather than restating
    // the allowed keys, the same arrangement the glaze bar set-out modes have
    // with GlazeBarLayout.
    function VghLantern__PlanSizeBasis__ResolveBasisKey(rawValue) {
        return ALL_BASES.indexOf(rawValue) !== -1 ? rawValue : BASIS_EXTERNAL_UPSTAND;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Basis Governing a Lantern's Plan Size
    // ------------------------------------------------------------
    function VghLantern__PlanSizeBasis__GoverningBasis(lantern) {
        var dims  =  lantern && lantern[BLOCK_DIMENSIONS];
        if (!dims) return BASIS_EXTERNAL_UPSTAND;

        return VghLantern__PlanSizeBasis__ResolveBasisKey(dims[FIELD_SIZE_BASIS]);
    }
    // ------------------------------------------------------------


    // FUNCTION | True When an Advanced Basis Governs the Plan Size
    // ------------------------------------------------------------
    function VghLantern__PlanSizeBasis__IsAdvanced(lantern) {
        return VghLantern__PlanSizeBasis__GoverningBasis(lantern) !== BASIS_EXTERNAL_UPSTAND;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Insets and Pairs
// -----------------------------------------------------------------------------

    // FUNCTION | How Far In From the Finished Exterior a Basis Sits, Per Side
    // ------------------------------------------------------------
    // The eaves datum inset is asked of the base frame rather than written here,
    // so this module and the SkeletonSolver can never disagree about where the
    // datum ring is.
    function VghLantern__PlanSizeBasis__InsetMm(lantern, basisKey) {
        if (basisKey === BASIS_EAVES_DATUM) {
            var Assembly  =  window.VghLantern__Geometry__BaseFrameAssembly;
            return Assembly
                ? Assembly.VghLantern__BaseFrameAssembly__DatumGeometry().HeadBeamWidthMm
                : FALLBACK_HEAD_BEAM_WIDTH_MM;
        }

        if (basisKey === BASIS_INTERNAL_UPSTAND) {
            var upstand    =  lantern && lantern[BLOCK_UPSTAND];
            var thickness  =  VghLantern__PlanSizeBasis__ReadNumber(upstand, FIELD_UPSTAND_THICKNESS);
            return isFinite(thickness) ? Math.max(0, thickness) : FALLBACK_UPSTAND_THICKNESS_MM;  // <-- Same reading as the SkeletonSolver
        }

        return 0;                                                             // <-- The exterior is the reference itself
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Stored Size Pair of a Basis
    // ------------------------------------------------------------
    // { WidthMm, DepthMm } on the schema's axes (Width = long, +X). NaN where a
    // field has never been written.
    function VghLantern__PlanSizeBasis__ReadPair(lantern, basisKey) {
        var dims    =  lantern && lantern[BLOCK_DIMENSIONS];
        var fields  =  PAIR_FIELDS[basisKey] || PAIR_FIELDS[BASIS_EXTERNAL_UPSTAND];

        return {
            WidthMm : VghLantern__PlanSizeBasis__ReadNumber(dims, fields.Width),
            DepthMm : VghLantern__PlanSizeBasis__ReadNumber(dims, fields.Depth)
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Slider Bounds Shift for a Basis
    // ------------------------------------------------------------
    // A governing size is the exterior less two insets, so its slider runs over
    // the exterior's own bounds shifted by the same amount. Expressed as a shift
    // rather than as numbers of its own, so the exterior bounds in config stay
    // the only limits there are, and a governing size can never propose an
    // exterior the editor's sliders would refuse.
    function VghLantern__PlanSizeBasis__BoundsOffsetMm(lantern, basisKey) {
        return -2 * VghLantern__PlanSizeBasis__InsetMm(lantern, basisKey);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Sync
// -----------------------------------------------------------------------------

    // FUNCTION | Bring the Exterior and Every Pair Into Step With the Governing Size
    // ------------------------------------------------------------
    // governingBasis is optional and defaults to the lantern's own. Passing the
    // basis that governed before a switch is how a switch keeps the lantern still.
    //
    // A governing pair that has never been written - a file saved before advanced
    // sizes existed, or a basis chosen for the first time - is not a reason
    // to move the lantern. It is filled from the exterior instead, exactly as an
    // inactive pair is.
    //
    // Returns { DidChange, ChangedFields }. Mutates the lantern in place.
    function VghLantern__PlanSizeBasis__Sync(lantern, governingBasis) {
        var result  =  VghLantern__PlanSizeBasis__NewResult();
        var dims    =  lantern && lantern[BLOCK_DIMENSIONS];
        if (!dims) return result;

        var basis           =  governingBasis || VghLantern__PlanSizeBasis__GoverningBasis(lantern);
        var exterior        =  VghLantern__PlanSizeBasis__ReadPair(lantern, BASIS_EXTERNAL_UPSTAND);
        var governingHolds  =  false;                                        // <-- True when the governing pair stands as typed
        var wasClamped      =  false;

        // 1. THE GOVERNING PAIR SETS THE EXTERIOR.
        if (basis !== BASIS_EXTERNAL_UPSTAND) {
            var governing  =  VghLantern__PlanSizeBasis__ReadPair(lantern, basis);
            var inset      =  VghLantern__PlanSizeBasis__InsetMm(lantern, basis);

            if (isFinite(governing.WidthMm) && isFinite(governing.DepthMm)) {
                var rawWidth   =  Math.round(governing.WidthMm + (2 * inset));
                var rawDepth   =  Math.round(governing.DepthMm + (2 * inset));

                exterior  =  {
                    WidthMm : VghLantern__PlanSizeBasis__ClampExterior(rawWidth),
                    DepthMm : VghLantern__PlanSizeBasis__ClampExterior(rawDepth)
                };
                wasClamped      =  (exterior.WidthMm !== rawWidth) || (exterior.DepthMm !== rawDepth);
                governingHolds  =  !wasClamped;

                VghLantern__PlanSizeBasis__WriteField(result, dims, FIELD_EXTERNAL_WIDTH, exterior.WidthMm);
                VghLantern__PlanSizeBasis__WriteField(result, dims, FIELD_EXTERNAL_DEPTH, exterior.DepthMm);
            }
        }

        if (!isFinite(exterior.WidthMm) || !isFinite(exterior.DepthMm)) return result;

        // 2. THE EXTERIOR SETS EVERY OTHER PAIR. The governing pair is rewritten
        //    only when the exterior had to be clamped, so the number on screen
        //    always agrees with the lantern that will actually be built. Left alone
        //    otherwise, so a typed size is never nudged by a rounding step.
        for (var i = 0; i < ADVANCED_BASES.length; i++) {
            var pairBasis  =  ADVANCED_BASES[i];
            if (pairBasis === basis && governingHolds) continue;

            var pairInset   =  VghLantern__PlanSizeBasis__InsetMm(lantern, pairBasis);
            var pairFields  =  PAIR_FIELDS[pairBasis];

            VghLantern__PlanSizeBasis__WriteField(result, dims, pairFields.Width, Math.round(exterior.WidthMm - (2 * pairInset)));
            VghLantern__PlanSizeBasis__WriteField(result, dims, pairFields.Depth, Math.round(exterior.DepthMm - (2 * pairInset)));
        }

        return result;
    }
    // ------------------------------------------------------------


    // FUNCTION | Test Whether a Field Can Move the Plan Size
    // ------------------------------------------------------------
    function VghLantern__PlanSizeBasis__IsPlanSizeField(fieldKey) {
        return PLAN_SIZE_FIELDS.indexOf(fieldKey) !== -1;
    }
    // ------------------------------------------------------------


    // FUNCTION | Respond to One Field the Editor Has Just Written
    // ------------------------------------------------------------
    // previousValue is what the field held before the write. It matters only for
    // the basis itself: the sync then runs as the OLD basis, which refreshes
    // every pair from the size the lantern already is, so the basis taking over
    // starts from that size and nothing moves.
    //
    // Every other plan size field syncs as the basis now governing. A field that
    // cannot move the plan size is a no-op.
    function VghLantern__PlanSizeBasis__AfterFieldWrite(lantern, fieldKey, previousValue) {
        var dims  =  lantern && lantern[BLOCK_DIMENSIONS];
        if (!dims || !VghLantern__PlanSizeBasis__IsPlanSizeField(fieldKey)) {
            return VghLantern__PlanSizeBasis__NewResult();
        }

        if (fieldKey === FIELD_SIZE_BASIS) {
            return VghLantern__PlanSizeBasis__Sync(lantern, VghLantern__PlanSizeBasis__ResolveBasisKey(previousValue));
        }

        return VghLantern__PlanSizeBasis__Sync(lantern);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Drawing Lock
// -----------------------------------------------------------------------------

    // FUNCTION | Test Whether a Typed Drawing Dimension Is Locked for a Lantern
    // ------------------------------------------------------------
    // Asked by the 2D DimensionEditor before it opens an input, and again by the
    // ConstraintResolver before it writes anything, so no route round the
    // editor can type the exterior of a lantern set out somewhere else.
    function VghLantern__PlanSizeBasis__IsDimensionLocked(lantern, dimensionKey) {
        if (!VghLantern__PlanSizeBasis__IsAdvanced(lantern)) return false;
        return LOCKED_DIMENSION_KEYS.indexOf(dimensionKey) !== -1;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VGHLANTERN__PLANSIZE__BASIS_EXTERNAL_UPSTAND       : BASIS_EXTERNAL_UPSTAND,
        VGHLANTERN__PLANSIZE__BASIS_EAVES_DATUM            : BASIS_EAVES_DATUM,
        VGHLANTERN__PLANSIZE__BASIS_INTERNAL_UPSTAND       : BASIS_INTERNAL_UPSTAND,

        VghLantern__PlanSizeBasis__ResolveBasisKey         : VghLantern__PlanSizeBasis__ResolveBasisKey,
        VghLantern__PlanSizeBasis__GoverningBasis          : VghLantern__PlanSizeBasis__GoverningBasis,
        VghLantern__PlanSizeBasis__IsAdvanced              : VghLantern__PlanSizeBasis__IsAdvanced,
        VghLantern__PlanSizeBasis__InsetMm                 : VghLantern__PlanSizeBasis__InsetMm,
        VghLantern__PlanSizeBasis__ReadPair                : VghLantern__PlanSizeBasis__ReadPair,
        VghLantern__PlanSizeBasis__BoundsOffsetMm          : VghLantern__PlanSizeBasis__BoundsOffsetMm,
        VghLantern__PlanSizeBasis__Sync                    : VghLantern__PlanSizeBasis__Sync,
        VghLantern__PlanSizeBasis__IsPlanSizeField         : VghLantern__PlanSizeBasis__IsPlanSizeField,
        VghLantern__PlanSizeBasis__AfterFieldWrite         : VghLantern__PlanSizeBasis__AfterFieldWrite,
        VghLantern__PlanSizeBasis__IsDimensionLocked       : VghLantern__PlanSizeBasis__IsDimensionLocked
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Geometry__PlanSizeBasis  =  VghLantern__Geometry__PlanSizeBasis;
