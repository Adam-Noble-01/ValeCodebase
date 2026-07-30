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
               (width, depth, eaves projection, kerb height, pitch).
   - Derived : the typed value is a consequence of other fields, so the resolver
               back-solves which field to move. Examples:
                 overall height -> ridge rise, holding kerb height
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
    const BLOCK_ROOF_PITCH   =  'Lantern__RoofPitch__Config';                // <-- Pitch angle, ridge rise, drive mode
    const BLOCK_KERB         =  'Lantern__KerbAndBase__Config';              // <-- Kerb height and section ids
    const BLOCK_GLAZING_BARS =  'Lantern__GlazingBars__Config';              // <-- Division mode, counts, spacing

    const PITCH_MODE_ANGLE   =  'angle';                                     // <-- Pitch is driven by the angle field
    const PITCH_MODE_RISE    =  'rise';                                      // <-- Pitch is driven by the rise field
    const DIVISION_SPACING   =  'spacing';                                   // <-- Bar division driven by target spacing
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

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Derived Dimension Appliers
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Apply an Overall Height Edit by Moving the Ridge Rise
    // ------------------------------------------------------------
    // Holds kerb height constant, because the kerb is usually a site-fixed
    // dimension while the ridge rise is the designer's free variable.
    function VghLantern__ConstraintResolver__ApplyOverallHeight(result, lantern, descriptor, typedValue) {
        var kerbHeight  =  VghLantern__ConstraintResolver__ReadNumber(lantern, BLOCK_KERB, 'Lantern__KerbAndBase__Config__KerbHeightMm');
        var nextRise    =  Math.round(typedValue - kerbHeight);

        if (nextRise <= 0) {
            result.Warnings.push('Overall height must exceed the kerb height of ' + kerbHeight + ' mm.');
            return;
        }

        nextRise  =  VghLantern__ConstraintResolver__Clamp(result, nextRise, 0, 6000, 'mm');

        VghLantern__ConstraintResolver__WriteField(result, lantern, BLOCK_ROOF_PITCH, 'Lantern__RoofPitch__Config__RidgeRiseMm', nextRise);
        VghLantern__ConstraintResolver__WriteField(result, lantern, BLOCK_ROOF_PITCH, 'Lantern__RoofPitch__Config__DriveMode', PITCH_MODE_RISE);
        result.Notes.push('Kerb height held at ' + kerbHeight + ' mm; ridge rise resolved to ' + nextRise + ' mm.');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Apply a Ridge Length Edit by Moving the Depth
    // ------------------------------------------------------------
    // For an equal-pitch hipped roof the ridge length equals width minus depth,
    // because the eaves projection cancels on both axes. Width is held constant
    // as it is normally the opening dimension the lantern must match.
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


    // SUB FUNCTION | Apply a Pane Width Edit by Switching to Spacing Division
    // ------------------------------------------------------------
    function VghLantern__ConstraintResolver__ApplyPaneWidth(result, lantern, descriptor, typedValue) {
        var nextSpacing  =  VghLantern__ConstraintResolver__Clamp(result, Math.round(typedValue), descriptor.MinMm, descriptor.MaxMm, 'mm');

        VghLantern__ConstraintResolver__WriteField(result, lantern, BLOCK_GLAZING_BARS, 'Lantern__GlazingBars__Config__TargetSpacingMm', nextSpacing);
        VghLantern__ConstraintResolver__WriteField(result, lantern, BLOCK_GLAZING_BARS, 'Lantern__GlazingBars__Config__DivisionMode', DIVISION_SPACING);
        result.Notes.push('Bar division switched to target spacing.');
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
        'eavesProjection' : {
            Label      : 'Eaves Projection',
            Block      : BLOCK_DIMENSIONS,
            Field      : 'Lantern__Dimensions__Config__EavesProjectionMm',
            Unit       : 'mm',
            MinMm      : 0,
            MaxMm      : 600,
            Views      : ['plan', 'frontElevation', 'sideElevation']
        },
        'kerbHeight' : {
            Label      : 'Kerb Height',
            Block      : BLOCK_KERB,
            Field      : 'Lantern__KerbAndBase__Config__KerbHeightMm',
            Unit       : 'mm',
            MinMm      : 0,
            MaxMm      : 1200,
            Views      : ['frontElevation', 'sideElevation']
        },
        'pitch' : {
            Label      : 'Roof Pitch',
            Block      : BLOCK_ROOF_PITCH,
            Field      : 'Lantern__RoofPitch__Config__PitchDegrees',
            Unit       : 'deg',
            MinMm      : 5,
            MaxMm      : 70,
            Views      : ['frontElevation', 'sideElevation'],
            SideEffect : { Block: BLOCK_ROOF_PITCH, Field: 'Lantern__RoofPitch__Config__DriveMode', Value: PITCH_MODE_ANGLE }
        },
        'ridgeRise' : {
            Label      : 'Ridge Rise',
            Block      : BLOCK_ROOF_PITCH,
            Field      : 'Lantern__RoofPitch__Config__RidgeRiseMm',
            Unit       : 'mm',
            MinMm      : 0,
            MaxMm      : 6000,
            Views      : ['frontElevation', 'sideElevation'],
            SideEffect : { Block: BLOCK_ROOF_PITCH, Field: 'Lantern__RoofPitch__Config__DriveMode', Value: PITCH_MODE_RISE }
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

        if (descriptor.SideEffect) {
            VghLantern__ConstraintResolver__WriteField(result, lantern, descriptor.SideEffect.Block, descriptor.SideEffect.Field, descriptor.SideEffect.Value);
        }

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
