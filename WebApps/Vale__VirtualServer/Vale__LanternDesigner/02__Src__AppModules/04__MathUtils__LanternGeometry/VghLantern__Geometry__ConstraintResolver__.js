/* =============================================================================
   VGHLANTERN - CONSTRAINT RESOLVER
   =============================================================================

   FILE       : VghLantern__Geometry__ConstraintResolver__.js
   NAMESPACE  : VghLantern
   MODULE     : Geometry - ConstraintResolver
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Apply a user-edited dimension back onto the lantern config
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - This module is the write path for the primary interaction of the app: the
     user clicks a dimension on the plan or elevation view, types a value, and
     the lantern updates.
   - It owns the DIMENSION DESCRIPTOR TABLE - the single source of truth for
     which dimensions are editable, their limits, their units, and how an edit
     propagates to dependent fields.
   - It performs no rendering and never touches the DOM. The 2D DimensionEditor
     collects the typed value; this module decides what it means.

   ---------------------------------------------------------------------------

   DIRECT vs DERIVED DIMENSIONS:
   - Direct  : the typed value maps straight onto one config field
               (width, depth, eaves projection, builders upstand height, pitch).
   - Derived : the typed value is a consequence of other fields, so the resolver
               back-solves which field to move. Examples:
                 overall height -> pitch angle, holding the base assembly
                 ridge length   -> depth, holding width
               Every derived case documents which field it holds constant.

   RETURN CONTRACT - ResolveResult:

   {
       Applied        : boolean,
       DimensionKey   : string,
       ChangedFields  : [ { Block, Field, PreviousValue, NextValue } ],
       Notes          : [ string ],   // what was held constant / co-resolved
       Warnings       : [ string ],   // clamped, rejected, or risky values
       ClampedFrom    : number | null
   }

   The caller mutates nothing itself: pass the live lantern object, and on
   Applied === true mark the project dirty and re-solve the skeleton.

   ============================================================================= */

// =============================================================================
// REGION | Constraint Resolver Module
// =============================================================================

const VghLantern__Geometry__ConstraintResolver = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Config Block Keys
    // ------------------------------------------------------------
    const BLOCK_DIMENSIONS   =  'Lantern__Dimensions__Config';               // <-- Width, depth, eaves projection
    const BLOCK_ROOF_PITCH   =  'Lantern__RoofPitch__Config';                // <-- Pitch angle, the sole driver of roof height
    const BLOCK_UPSTAND         =  'Lantern__BuildersUpstandAndBase__Config';              // <-- Builders Upstand height and thickness
    const BLOCK_GLAZING_BARS =  'Lantern__GlazingBars__Config';              // <-- Bar profile and target spacing

    const PITCH_MIN_DEGREES  =  5;                                           // <-- Mirrors the schema validator's pitch bounds
    const PITCH_MAX_DEGREES  =  70;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Result Assembly Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build an Empty Resolve Result
    // ------------------------------------------------------------
    function VghLantern__ConstraintResolver__NewResult(dimensionKey) {
        return {
            Applied       : false,
            DimensionKey  : dimensionKey,
            ChangedFields : [],
            Notes         : [],
            Warnings      : [],
            ClampedFrom   : null
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clamp a Value and Record the Clamp on the Result
    // ------------------------------------------------------------
    function VghLantern__ConstraintResolver__Clamp(result, rawValue, minValue, maxValue, unitLabel) {
        var value  =  rawValue;

        if (typeof minValue === 'number' && value < minValue) {
            result.ClampedFrom  =  rawValue;
            result.Warnings.push('Value raised to the minimum of ' + minValue + ' ' + unitLabel + '.');
            value  =  minValue;
        }
        if (typeof maxValue === 'number' && value > maxValue) {
            result.ClampedFrom  =  rawValue;
            result.Warnings.push('Value reduced to the maximum of ' + maxValue + ' ' + unitLabel + '.');
            value  =  maxValue;
        }

        return value;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write a Field and Record the Change on the Result
    // ------------------------------------------------------------
    function VghLantern__ConstraintResolver__WriteField(result, lantern, blockKey, fieldKey, nextValue) {
        var block  =  lantern[blockKey];
        if (!block) return false;

        var previousValue  =  block[fieldKey];
        if (previousValue === nextValue) return false;

        block[fieldKey]  =  nextValue;
        result.ChangedFields.push({
            Block         : blockKey,
            Field         : fieldKey,
            PreviousValue : previousValue,
            NextValue     : nextValue
        });
        result.Applied  =  true;
        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read a Numeric Config Field
    // ------------------------------------------------------------
    function VghLantern__ConstraintResolver__ReadNumber(lantern, blockKey, fieldKey) {
        var block  =  lantern[blockKey];
        if (!block) return 0;
        return Number(block[fieldKey]) || 0;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Head Beam and Datum Numbers (synchronous)
    // ------------------------------------------------------------
    // Mirrors the SkeletonSolver's source: the base frame system through the
    // BaseFrameAssembly geometry module, with matching fallbacks.
    function VghLantern__ConstraintResolver__DatumGeometry() {
        var Assembly  =  window.VghLantern__Geometry__BaseFrameAssembly;
        if (Assembly) return Assembly.VghLantern__BaseFrameAssembly__DatumGeometry();
        return { HeadBeamWidthMm: 125, HeadBeamHeightMm: 96, EavesDatumRiseAboveSeatMm: 100 };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Horizontal Run of the Short Axis Slope, Datum to Ridge
    // ------------------------------------------------------------
    // Mirrors the SkeletonSolver: the roof springs from the eaves datum ring,
    // inset one head beam width from each stated face, so the datum half-extent
    // of the SHORT axis is the run a full-height slope covers. Every
    // rise-to-pitch conversion works from this number, so the two modules must
    // agree on it exactly.
    function VghLantern__ConstraintResolver__ShortSlopeRun(lantern) {
        var widthMm     =  VghLantern__ConstraintResolver__ReadNumber(lantern, BLOCK_DIMENSIONS, 'Lantern__Dimensions__Config__WidthMm');
        var depthMm     =  VghLantern__ConstraintResolver__ReadNumber(lantern, BLOCK_DIMENSIONS, 'Lantern__Dimensions__Config__DepthMm');
        var headBeamMm  =  VghLantern__ConstraintResolver__DatumGeometry().HeadBeamWidthMm;

        return (Math.min(widthMm, depthMm) / 2) - headBeamMm;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Derived Dimension Appliers
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Apply an Overall Height Edit by Moving the Roof Pitch
    // ------------------------------------------------------------
    // Holds the whole base assembly and the plan size constant: the builders
    // upstand is site-fixed, the head beam is a fixed product section, and
    // width and depth are the opening the lantern has to match. That leaves the
    // pitch as the only free variable. Overall height is measured from the
    // builders upstand base; the roof springs from the EAVES DATUM, which sits
    // a fixed product rise (100mm) above the upstand top, so the rise the pitch
    // has to produce is what is left above upstand plus datum rise.
    function VghLantern__ConstraintResolver__ApplyOverallHeight(result, lantern, descriptor, typedValue) {
        var upstandHeight  =  VghLantern__ConstraintResolver__ReadNumber(lantern, BLOCK_UPSTAND, 'Lantern__BuildersUpstandAndBase__Config__UpstandHeightMm');
        var datumRise      =  VghLantern__ConstraintResolver__DatumGeometry().EavesDatumRiseAboveSeatMm;
        var baseHeight     =  upstandHeight + datumRise;
        var targetRise     =  typedValue - baseHeight;

        if (targetRise <= 0) {
            result.Warnings.push('Overall height must exceed the ' + baseHeight + ' mm of builders upstand and eaves datum rise below the roof.');
            return;
        }

        var runMm  =  VghLantern__ConstraintResolver__ShortSlopeRun(lantern);
        if (runMm <= 0) {
            result.Warnings.push('Set a width and depth before typing an overall height.');
            return;
        }

        var PitchCalculator  =  window.VghLantern__Geometry__RoofPitchCalculator;
        var nextPitch        =  PitchCalculator
            ? PitchCalculator.VghLantern__RoofPitch__PitchFromRise(runMm, targetRise)
            : Math.atan(targetRise / runMm) * (180 / Math.PI);

        nextPitch  =  Math.round(nextPitch * 10) / 10;                        // <-- One decimal, matching the pitch control
        nextPitch  =  VghLantern__ConstraintResolver__Clamp(result, nextPitch, PITCH_MIN_DEGREES, PITCH_MAX_DEGREES, 'deg');

        VghLantern__ConstraintResolver__WriteField(result, lantern, BLOCK_ROOF_PITCH, 'Lantern__RoofPitch__Config__PitchDegrees', nextPitch);
        result.Notes.push('Builders Upstand held at ' + upstandHeight + ' mm with the eaves datum ' + datumRise + ' mm above it; pitch resolved to ' + nextPitch + ' deg.');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Apply a Ridge Length Edit by Moving the Depth
    // ------------------------------------------------------------
    // For an equal-pitch hipped roof the ridge length equals width minus depth,
    // because the head beam datum inset cancels on both axes. Width is held
    // constant as it is normally the opening dimension the lantern must match.
    function VghLantern__ConstraintResolver__ApplyRidgeLength(result, lantern, descriptor, typedValue) {
        var widthMm  =  VghLantern__ConstraintResolver__ReadNumber(lantern, BLOCK_DIMENSIONS, 'Lantern__Dimensions__Config__WidthMm');
        var nextDepth  =  Math.round(widthMm - typedValue);

        if (nextDepth < descriptor.DependentMinMm) {
            result.Warnings.push('That ridge length would reduce the depth below ' + descriptor.DependentMinMm + ' mm.');
            return;
        }

        nextDepth  =  VghLantern__ConstraintResolver__Clamp(result, nextDepth, descriptor.DependentMinMm, descriptor.DependentMaxMm, 'mm');

        VghLantern__ConstraintResolver__WriteField(result, lantern, BLOCK_DIMENSIONS, 'Lantern__Dimensions__Config__DepthMm', nextDepth);
        result.Notes.push('Width held at ' + widthMm + ' mm; depth resolved to ' + nextDepth + ' mm.');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Apply a Pane Width Edit by Moving the Target Spacing
    // ------------------------------------------------------------
    function VghLantern__ConstraintResolver__ApplyPaneWidth(result, lantern, descriptor, typedValue) {
        var nextSpacing  =  VghLantern__ConstraintResolver__Clamp(result, Math.round(typedValue), descriptor.MinMm, descriptor.MaxMm, 'mm');

        VghLantern__ConstraintResolver__WriteField(result, lantern, BLOCK_GLAZING_BARS, 'Lantern__GlazingBars__Config__TargetSpacingMm', nextSpacing);
        result.Notes.push('Target bar spacing set to ' + nextSpacing + ' mm; rounded to whole panes on set-out.');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Dimension Descriptor Table
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Editable Dimension Descriptors - SSOT
    // ------------------------------------------------------------
    // Every dimension the 2D views may expose for typed editing lives here.
    // Limits mirror VghLantern__AppUtils__ProjectSchemaValidator so a typed
    // value can never take a project outside its own schema.
    //
    // Views  : which 2D views may surface this dimension.
    // Apply  : omitted for direct fields; present for derived back-solves.
    const VGHLANTERN__CONSTRAINT_RESOLVER__DESCRIPTORS  =  {
        'width' : {
            Label      : 'Overall Width',
            Block      : BLOCK_DIMENSIONS,
            Field      : 'Lantern__Dimensions__Config__WidthMm',
            Unit       : 'mm',
            MinMm      : 300,
            MaxMm      : 20000,
            Views      : ['plan', 'frontElevation']
        },
        'depth' : {
            Label      : 'Overall Depth',
            Block      : BLOCK_DIMENSIONS,
            Field      : 'Lantern__Dimensions__Config__DepthMm',
            Unit       : 'mm',
            MinMm      : 300,
            MaxMm      : 20000,
            Views      : ['plan', 'sideElevation']
        },
        // 'eavesProjection' and 'frameHeight' are RETIRED. The roof springs
        // from the eaves datum (head beam inner face plane, fixed product
        // inset) rather than a projected rectangle, and the base frame is the
        // fixed 125 x 96 head beam rather than a slider-driven prism. The
        // schema fields remain for old project files but drive nothing.
        'upstandHeight' : {
            Label      : 'Builders Upstand Height',
            Block      : BLOCK_UPSTAND,
            Field      : 'Lantern__BuildersUpstandAndBase__Config__UpstandHeightMm',
            Unit       : 'mm',
            MinMm      : 100,
            MaxMm      : 400,
            Views      : ['frontElevation', 'sideElevation']
        },
        'upstandThickness' : {
            Label      : 'Builders Upstand Thickness',
            Block      : BLOCK_UPSTAND,
            Field      : 'Lantern__BuildersUpstandAndBase__Config__UpstandThicknessMm',
            Unit       : 'mm',
            MinMm      : 90,
            MaxMm      : 150,
            Views      : ['plan']
        },
        'pitch' : {
            Label      : 'Roof Pitch',
            Block      : BLOCK_ROOF_PITCH,
            Field      : 'Lantern__RoofPitch__Config__PitchDegrees',
            Unit       : 'deg',
            MinMm      : PITCH_MIN_DEGREES,
            MaxMm      : PITCH_MAX_DEGREES,
            Views      : ['frontElevation', 'sideElevation']
        },
        'overallHeight' : {
            Label      : 'Overall Height',
            Unit       : 'mm',
            MinMm      : 100,
            MaxMm      : 7200,
            Views      : ['frontElevation', 'sideElevation'],
            Apply      : VghLantern__ConstraintResolver__ApplyOverallHeight
        },
        'ridgeLength' : {
            Label             : 'Ridge Length',
            Unit              : 'mm',
            MinMm             : 0,
            MaxMm             : 20000,
            DependentMinMm    : 300,
            DependentMaxMm    : 20000,
            Views             : ['plan'],
            Apply             : VghLantern__ConstraintResolver__ApplyRidgeLength
        },
        'paneWidth' : {
            Label      : 'Pane Width',
            Unit       : 'mm',
            MinMm      : 100,
            MaxMm      : 3000,
            Views      : ['plan', 'frontElevation'],
            Apply      : VghLantern__ConstraintResolver__ApplyPaneWidth
        }
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Resolve Entry Points
// -----------------------------------------------------------------------------

    // FUNCTION | Look Up a Dimension Descriptor
    // ------------------------------------------------------------
    function VghLantern__ConstraintResolver__GetDescriptor(dimensionKey) {
        return VGHLANTERN__CONSTRAINT_RESOLVER__DESCRIPTORS[dimensionKey] || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | List Dimension Keys Editable in a Given 2D View
    // ------------------------------------------------------------
    function VghLantern__ConstraintResolver__ListForView(viewKey) {
        var keys  =  [];
        var key, descriptor;

        for (key in VGHLANTERN__CONSTRAINT_RESOLVER__DESCRIPTORS) {
            if (!Object.prototype.hasOwnProperty.call(VGHLANTERN__CONSTRAINT_RESOLVER__DESCRIPTORS, key)) continue;
            descriptor  =  VGHLANTERN__CONSTRAINT_RESOLVER__DESCRIPTORS[key];
            if (descriptor.Views && descriptor.Views.indexOf(viewKey) !== -1) keys.push(key);
        }

        return keys;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Current Value of a Dimension from a Solved Skeleton
    // ------------------------------------------------------------
    // Used to seed the inline edit field, so the user always starts from the
    // value they can see annotated on the drawing.
    function VghLantern__ConstraintResolver__ReadCurrentValue(dimensionKey, lantern, skeleton) {
        var descriptor  =  VghLantern__ConstraintResolver__GetDescriptor(dimensionKey);
        if (!descriptor) return null;

        if (descriptor.Block && descriptor.Field) {
            return VghLantern__ConstraintResolver__ReadNumber(lantern, descriptor.Block, descriptor.Field);
        }

        if (!skeleton || !skeleton.Meta) return null;

        if (dimensionKey === 'overallHeight') return Math.round(skeleton.Meta.OverallHeightMm);
        if (dimensionKey === 'ridgeLength')   return Math.round(skeleton.Meta.RidgeLengthMm);
        if (dimensionKey === 'paneWidth')     return Math.round(VghLantern__ConstraintResolver__ReadNumber(lantern, BLOCK_GLAZING_BARS, 'Lantern__GlazingBars__Config__TargetSpacingMm'));

        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply a Typed Dimension Value to a Lantern Config
    // ------------------------------------------------------------
    // Mutates the supplied lantern block in place. The caller is responsible for
    // marking the project dirty and requesting a fresh skeleton solve when the
    // returned result reports Applied === true.
    function VghLantern__ConstraintResolver__ApplyDimension(dimensionKey, rawTypedValue, lantern, skeleton) {
        var result      =  VghLantern__ConstraintResolver__NewResult(dimensionKey);
        var descriptor  =  VghLantern__ConstraintResolver__GetDescriptor(dimensionKey);

        if (!descriptor) {
            result.Warnings.push('Unknown dimension "' + dimensionKey + '".');
            return result;
        }
        if (!lantern || typeof lantern !== 'object') {
            result.Warnings.push('No lantern is selected.');
            return result;
        }

        var UnitConverter  =  window.VghLantern__AppUtils__UnitConverter;
        var typedValue     =  UnitConverter
            ? UnitConverter.VghLantern__UnitConverter__ParseDimensionInput(rawTypedValue)
            : Number(rawTypedValue);

        if (typedValue === null || isNaN(typedValue)) {
            result.Warnings.push('Enter a number.');
            return result;
        }

        if (typeof descriptor.Apply === 'function') {
            descriptor.Apply(result, lantern, descriptor, typedValue, skeleton);
            return result;
        }

        var nextValue  =  VghLantern__ConstraintResolver__Clamp(result, typedValue, descriptor.MinMm, descriptor.MaxMm, descriptor.Unit);
        if (descriptor.Unit === 'mm') nextValue  =  Math.round(nextValue);

        VghLantern__ConstraintResolver__WriteField(result, lantern, descriptor.Block, descriptor.Field, nextValue);

        return result;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ConstraintResolver__ApplyDimension    : VghLantern__ConstraintResolver__ApplyDimension,
        VghLantern__ConstraintResolver__GetDescriptor     : VghLantern__ConstraintResolver__GetDescriptor,
        VghLantern__ConstraintResolver__ListForView       : VghLantern__ConstraintResolver__ListForView,
        VghLantern__ConstraintResolver__ReadCurrentValue  : VghLantern__ConstraintResolver__ReadCurrentValue
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Geometry__ConstraintResolver  =  VghLantern__Geometry__ConstraintResolver;
