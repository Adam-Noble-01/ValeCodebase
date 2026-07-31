/* =============================================================================
   VGHLANTERN - PROJECT SCHEMA VALIDATOR
   =============================================================================

   FILE       : VghLantern__AppUtils__ProjectSchemaValidator__.js
   NAMESPACE  : VghLantern
   MODULE     : AppUtils - ProjectSchemaValidator
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Normalise loaded project JSON into a stable VghLantern schema
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Normalises project metadata / global settings keys and supplies defaults.
   - Normalises the drawing layout block so a reopened project comes back on the
     sheet size, orientation, scale, grid split and 3D viewpoint it was left on.
   - Normalises every lantern block to the current Lantern Editor expectations.
   - Canonicalises roof form strings.
   - Migrates lanterns saved under the retired ridge rise drive onto the pitch
     angle that reproduces their height, then strips the two retired fields.
   - Strips the retired glazing bar division mode and bar count fields, leaving
     target spacing as the only bar set-out driver.
   - Repairs missing objects so UI hydration never falls back to placeholders.
   - Returns a result payload with ProjectData, DidMutate and Notes.
   - IMPORTANT: single source of truth for project schema compatibility.
   - IMPORTANT: intended call paths are ProjectFileManager create/load/save/sync.

   - ALL dimensional values in the project file are millimetres. No exceptions.
     Conversion to SVG or Three.js space happens only in AppUtils__UnitConverter.

   ============================================================================= */

// =============================================================================
// REGION | Project Schema Validator Module
// =============================================================================

const VghLantern__AppUtils__ProjectSchemaValidator = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants - Canonical Value Sets and Defaults
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Canonical Roof Form Labels
    // ------------------------------------------------------------
    const SCHEMA__ROOF_FORM_HIPPED_RIDGE  =  'Hipped Ridge';                 // <-- Four slopes meeting a central ridge
    const SCHEMA__ROOF_FORM_PYRAMID       =  'Pyramid';                      // <-- Four hips converging on a single apex
    const SCHEMA__ROOF_FORM_GABLE         =  'Gable';                        // <-- Two slopes, vertical gable ends
    const SCHEMA__ROOF_FORM_MONO_PITCH    =  'Mono Pitch';                   // <-- Single slope
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Retired Glazing Bar Division Fields
    // ------------------------------------------------------------
    // Bar division used to be drivable either by an explicit bar count along the
    // long eaves or by a target spacing, selected by a division mode. Target
    // spacing is now the only driver, so both fields are stripped on load. The
    // count was never authoritative once a project was saved in spacing mode, so
    // there is nothing to migrate - the stored target spacing already describes
    // the set-out.
    const SCHEMA__RETIRED_GLAZING_FIELDS  =  [
        'Lantern__GlazingBars__Config__DivisionMode',
        'Lantern__GlazingBars__Config__BarCountLongSlope'
    ];
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Retired Roof Pitch Fields
    // ------------------------------------------------------------
    // Roof height used to be drivable either by pitch angle or by a stored ridge
    // rise, selected by a drive mode. Pitch is now the only driver, so both
    // fields are stripped on load. They are named here rather than inline so the
    // migration reads as a list of what went, not as two magic strings.
    const SCHEMA__RETIRED_PITCH_FIELDS    =  [
        'Lantern__RoofPitch__Config__DriveMode',
        'Lantern__RoofPitch__Config__RidgeRiseMm'
    ];
    const SCHEMA__LEGACY_RISE_DRIVE_MODE  =  'rise';                         // <-- Value that meant "rise is authoritative"
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Default Lantern Dimensions
    // ------------------------------------------------------------
    const SCHEMA__DEFAULT_WIDTH_MM        =  2400;                           // <-- Default lantern width  (long axis)
    const SCHEMA__DEFAULT_DEPTH_MM        =  1400;                           // <-- Default lantern depth  (short axis)
    const SCHEMA__DEFAULT_PITCH_DEGREES   =  25;                             // <-- Default roof pitch
    const SCHEMA__DEFAULT_EAVES_PROJ_MM   =  50;                             // <-- Default eaves projection past builders upstand
    const SCHEMA__DEFAULT_BAR_SPACING_MM  =  500;                            // <-- Default target glazing bar spacing
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Base Assembly Defaults and Bounds
    // ------------------------------------------------------------
    // Width and depth are measured to the OUTER face of the builders upstand, so the builders upstand
    // thickness only ever eats into the reveal, never into the stated size.
    // Bounds mirror VghLantern__Validation__Config and the editor ControlBounds;
    // all three must move together.
    const SCHEMA__DEFAULT_UPSTAND_HEIGHT_MM     =  150;                         // <-- Standard builders upstand height (site-built)
    const SCHEMA__MIN_UPSTAND_HEIGHT_MM         =  100;
    const SCHEMA__MAX_UPSTAND_HEIGHT_MM         =  400;

    const SCHEMA__DEFAULT_UPSTAND_THICKNESS_MM  =  110;                         // <-- Standard studwork upstand wall thickness
    const SCHEMA__MIN_UPSTAND_THICKNESS_MM      =  90;
    const SCHEMA__MAX_UPSTAND_THICKNESS_MM      =  150;

    const SCHEMA__DEFAULT_FRAME_HEIGHT_MM    =  50;                          // <-- Base frame sitting on the builders upstand
    const SCHEMA__MIN_FRAME_HEIGHT_MM        =  30;
    const SCHEMA__MAX_FRAME_HEIGHT_MM        =  100;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Schema Version
    // ------------------------------------------------------------
    const SCHEMA__CURRENT_VERSION         =  '1.0.0';                        // <-- Bump when a migration is introduced
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Generic Normalisation Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Deep Clone Data for Safe Normalisation
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__Clone(data) {
        if (!data || typeof data !== 'object') return {};
        try {
            return JSON.parse(JSON.stringify(data));
        } catch (e) {
            return {};
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Ensure a Child Object Exists on a Parent
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__EnsureObject(parentObj, key) {
        if (!parentObj[key] || typeof parentObj[key] !== 'object' || Array.isArray(parentObj[key])) {
            parentObj[key]  =  {};
            return true;
        }
        return false;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Parse Integer with Fallback
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__ToInt(rawValue, fallbackValue) {
        var parsed  =  parseInt(rawValue, 10);
        return isNaN(parsed) ? fallbackValue : parsed;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Parse Float with Fallback
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__ToFloat(rawValue, fallbackValue) {
        var parsed  =  parseFloat(rawValue);
        return isNaN(parsed) ? fallbackValue : parsed;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clean a String for Comparison
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__CleanToken(rawValue) {
        return String(rawValue === null || rawValue === undefined ? '' : rawValue)
            .toLowerCase()
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply an Integer Field with Clamping and Mutation Tracking
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__ApplyIntField(configObj, key, fallbackValue, minValue, maxValue) {
        var nextValue  =  VghLantern__SchemaValidator__ToInt(configObj[key], fallbackValue);
        if (typeof minValue === 'number') nextValue  =  Math.max(minValue, nextValue);
        if (typeof maxValue === 'number') nextValue  =  Math.min(maxValue, nextValue);
        if (configObj[key] !== nextValue) {
            configObj[key]  =  nextValue;
            return true;
        }
        return false;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply a Float Field with Clamping and Mutation Tracking
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__ApplyFloatField(configObj, key, fallbackValue, minValue, maxValue) {
        var nextValue  =  VghLantern__SchemaValidator__ToFloat(configObj[key], fallbackValue);
        if (typeof minValue === 'number') nextValue  =  Math.max(minValue, nextValue);
        if (typeof maxValue === 'number') nextValue  =  Math.min(maxValue, nextValue);
        if (configObj[key] !== nextValue) {
            configObj[key]  =  nextValue;
            return true;
        }
        return false;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply a String Field Defaulting to Empty
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__ApplyStringField(configObj, key, fallbackValue) {
        var currentValue  =  configObj[key];
        if (typeof currentValue === 'string') return false;
        configObj[key]  =  (fallbackValue === undefined ? '' : fallbackValue);
        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply a Boolean Field with Mutation Tracking
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__ApplyBoolField(configObj, key, fallbackValue) {
        var currentValue  =  configObj[key];
        if (typeof currentValue === 'boolean') return false;
        configObj[key]  =  (currentValue === undefined || currentValue === null) ? !!fallbackValue : !!currentValue;
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Domain Value Canonicalisers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Canonicalise Roof Form Label
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__NormaliseRoofForm(rawRoofForm) {
        var cleaned  =  VghLantern__SchemaValidator__CleanToken(rawRoofForm);
        if (!cleaned) return SCHEMA__ROOF_FORM_HIPPED_RIDGE;

        if (cleaned.indexOf('pyramid') !== -1) return SCHEMA__ROOF_FORM_PYRAMID;
        if (cleaned.indexOf('mono')    !== -1) return SCHEMA__ROOF_FORM_MONO_PITCH;
        if (cleaned.indexOf('gable')   !== -1) return SCHEMA__ROOF_FORM_GABLE;
        return SCHEMA__ROOF_FORM_HIPPED_RIDGE;
    }
    // ------------------------------------------------------------


// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Lantern Block Normalisation
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Normalise Lantern Identity Block
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__NormaliseIdentity(lantern, index) {
        var didMutate    =  false;
        var identityCfg  =  lantern['Lantern__Identity__Config'];

        if (!identityCfg['Lantern__Identity__Config__Id']) {
            identityCfg['Lantern__Identity__Config__Id']  =  'ltn_' + String(Date.now()).slice(-6) + '_' + index;
            didMutate  =  true;
        }
        if (VghLantern__SchemaValidator__ApplyStringField(identityCfg, 'Lantern__Identity__Config__Title', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(identityCfg, 'Lantern__Identity__Config__Reference', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyIntField(identityCfg, 'Lantern__Identity__Config__SortOrder', index, 0, null)) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyIntField(identityCfg, 'Lantern__Identity__Config__Quantity', 1, 1, 999)) didMutate  =  true;

        return didMutate;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Normalise Lantern Form Block
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__NormaliseForm(lantern) {
        var didMutate  =  false;
        var formCfg    =  lantern['Lantern__Form__Config'];

        var nextRoofForm  =  VghLantern__SchemaValidator__NormaliseRoofForm(formCfg['Lantern__Form__Config__RoofForm']);
        if (formCfg['Lantern__Form__Config__RoofForm'] !== nextRoofForm) {
            formCfg['Lantern__Form__Config__RoofForm']  =  nextRoofForm;
            didMutate  =  true;
        }
        if (VghLantern__SchemaValidator__ApplyIntField(formCfg, 'Lantern__Form__Config__PlanRotationDeg', 0, 0, 359)) didMutate  =  true;

        return didMutate;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Normalise Lantern Dimensions Block
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__NormaliseDimensions(lantern) {
        var didMutate  =  false;
        var dimsCfg    =  lantern['Lantern__Dimensions__Config'];

        if (VghLantern__SchemaValidator__ApplyIntField(dimsCfg, 'Lantern__Dimensions__Config__WidthMm', SCHEMA__DEFAULT_WIDTH_MM, 300, 20000)) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyIntField(dimsCfg, 'Lantern__Dimensions__Config__DepthMm', SCHEMA__DEFAULT_DEPTH_MM, 300, 20000)) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyIntField(dimsCfg, 'Lantern__Dimensions__Config__EavesProjectionMm', SCHEMA__DEFAULT_EAVES_PROJ_MM, 0, 600)) didMutate  =  true;

        return didMutate;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Migrate a Rise Driven Lantern onto Its Pitch Angle
    // ------------------------------------------------------------
    // A lantern saved in the retired rise drive mode carries a stored pitch that
    // was never authoritative and may be nothing like the shape on screen. Left
    // alone it would silently change pitch the first time it is reopened, so the
    // rise is converted back to the angle that reproduces it before the fields
    // are dropped. The run is the eaves half-extent of the SHORT axis, exactly as
    // the SkeletonSolver measures it, so the roof comes back the same height.
    function VghLantern__SchemaValidator__MigrateRiseDrivenPitch(lantern) {
        var pitchCfg   =  lantern['Lantern__RoofPitch__Config'];
        var driveMode  =  VghLantern__SchemaValidator__CleanToken(pitchCfg['Lantern__RoofPitch__Config__DriveMode']);
        var riseMm     =  Number(pitchCfg['Lantern__RoofPitch__Config__RidgeRiseMm']);

        if (driveMode.indexOf(SCHEMA__LEGACY_RISE_DRIVE_MODE) === -1) return false;
        if (!isFinite(riseMm) || riseMm <= 0) return false;

        var dimsCfg  =  lantern['Lantern__Dimensions__Config'] || {};
        var widthMm  =  Number(dimsCfg['Lantern__Dimensions__Config__WidthMm'])            || 0;
        var depthMm  =  Number(dimsCfg['Lantern__Dimensions__Config__DepthMm'])            || 0;
        var eavesMm  =  Number(dimsCfg['Lantern__Dimensions__Config__EavesProjectionMm'])  || 0;
        var runMm    =  Math.min((widthMm / 2) + eavesMm, (depthMm / 2) + eavesMm);

        if (runMm <= 0) return false;

        var derivedPitch  =  Math.atan(riseMm / runMm) * (180 / Math.PI);
        pitchCfg['Lantern__RoofPitch__Config__PitchDegrees']  =  Math.round(derivedPitch * 10) / 10;
        return true;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Normalise Lantern Roof Pitch Block
    // ------------------------------------------------------------
    // Runs after the dimensions block so the migration can read a width and depth
    // that have already been defaulted and clamped.
    function VghLantern__SchemaValidator__NormaliseRoofPitch(lantern) {
        var didMutate  =  false;
        var pitchCfg   =  lantern['Lantern__RoofPitch__Config'];

        if (VghLantern__SchemaValidator__MigrateRiseDrivenPitch(lantern)) didMutate  =  true;

        for (var i = 0; i < SCHEMA__RETIRED_PITCH_FIELDS.length; i++) {
            if (SCHEMA__RETIRED_PITCH_FIELDS[i] in pitchCfg) {
                delete pitchCfg[SCHEMA__RETIRED_PITCH_FIELDS[i]];
                didMutate  =  true;
            }
        }

        if (VghLantern__SchemaValidator__ApplyFloatField(pitchCfg, 'Lantern__RoofPitch__Config__PitchDegrees', SCHEMA__DEFAULT_PITCH_DEGREES, 5, 70)) didMutate  =  true;

        return didMutate;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Normalise Lantern Glazing Bars Block
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__NormaliseGlazingBars(lantern) {
        var didMutate  =  false;
        var barsCfg    =  lantern['Lantern__GlazingBars__Config'];

        for (var i = 0; i < SCHEMA__RETIRED_GLAZING_FIELDS.length; i++) {
            if (SCHEMA__RETIRED_GLAZING_FIELDS[i] in barsCfg) {
                delete barsCfg[SCHEMA__RETIRED_GLAZING_FIELDS[i]];
                didMutate  =  true;
            }
        }

        if (VghLantern__SchemaValidator__ApplyIntField(barsCfg, 'Lantern__GlazingBars__Config__TargetSpacingMm', SCHEMA__DEFAULT_BAR_SPACING_MM, 100, 3000)) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(barsCfg, 'Lantern__GlazingBars__Config__BarProfileId', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyBoolField(barsCfg, 'Lantern__GlazingBars__Config__HorizontalTransomEnabled', false)) didMutate  =  true;

        return didMutate;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Normalise Lantern Ridge and Hips Block
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__NormaliseRidgeAndHips(lantern) {
        var didMutate  =  false;
        var ridgeCfg   =  lantern['Lantern__RidgeAndHips__Config'];

        if (VghLantern__SchemaValidator__ApplyStringField(ridgeCfg, 'Lantern__RidgeAndHips__Config__RidgeProfileId', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(ridgeCfg, 'Lantern__RidgeAndHips__Config__HipProfileId', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(ridgeCfg, 'Lantern__RidgeAndHips__Config__CrestingComponentId', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyBoolField(ridgeCfg, 'Lantern__RidgeAndHips__Config__CrestingEnabled', false)) didMutate  =  true;

        return didMutate;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Normalise Lantern Finials Block
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__NormaliseFinials(lantern) {
        var didMutate   =  false;
        var finialsCfg  =  lantern['Lantern__Finials__Config'];

        if (VghLantern__SchemaValidator__ApplyBoolField(finialsCfg, 'Lantern__Finials__Config__Enabled', true)) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(finialsCfg, 'Lantern__Finials__Config__FinialComponentId', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(finialsCfg, 'Lantern__Finials__Config__FinialBaseComponentId', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyBoolField(finialsCfg, 'Lantern__Finials__Config__PlaceAtRidgeEnds', true)) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyBoolField(finialsCfg, 'Lantern__Finials__Config__PlaceAtApex', false)) didMutate  =  true;

        return didMutate;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Migrate Legacy KerbAndBase Block to BuildersUpstandAndBase
    // ------------------------------------------------------------
    // Older projects stored the base assembly under Lantern__KerbAndBase__Config.
    // On load we rewrite that block to Lantern__BuildersUpstandAndBase__Config so
    // saves persist the new naming. ClosingProfileId is dropped (removed feature).
    function VghLantern__SchemaValidator__MigrateLegacyKerbBlock(lantern) {
        var legacy  =  lantern['Lantern__KerbAndBase__Config'];
        if (!legacy || typeof legacy !== 'object') return false;

        var target  =  lantern['Lantern__BuildersUpstandAndBase__Config'];
        if (!target || typeof target !== 'object') {
            target  =  {};
            lantern['Lantern__BuildersUpstandAndBase__Config']  =  target;
        }

        var fieldMap  =  [
            ['Lantern__KerbAndBase__Config__KerbHeightMm',    'Lantern__BuildersUpstandAndBase__Config__UpstandHeightMm'],
            ['Lantern__KerbAndBase__Config__KerbThicknessMm', 'Lantern__BuildersUpstandAndBase__Config__UpstandThicknessMm'],
            ['Lantern__KerbAndBase__Config__KerbProfileId',   'Lantern__BuildersUpstandAndBase__Config__UpstandProfileId'],
            ['Lantern__KerbAndBase__Config__FrameHeightMm',   'Lantern__BuildersUpstandAndBase__Config__FrameHeightMm'],
            ['Lantern__KerbAndBase__Config__EavesProfileId',  'Lantern__BuildersUpstandAndBase__Config__EavesProfileId']
        ];

        for (var i = 0; i < fieldMap.length; i++) {
            var fromKey  =  fieldMap[i][0];
            var toKey    =  fieldMap[i][1];
            if (target[toKey] === undefined && legacy[fromKey] !== undefined) {
                target[toKey]  =  legacy[fromKey];
            }
        }

        delete lantern['Lantern__KerbAndBase__Config'];
        return true;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Normalise Lantern Builders Upstand and Base Block
    // ------------------------------------------------------------
    // UpstandThicknessMm and FrameHeightMm were introduced after the first release.
    // A project saved before them has neither field, and ApplyIntField writes the
    // default in on load, which is exactly the migration those projects need:
    // they were drawn against a 110 mm builders upstand and a 50 mm frame all along.
    // SCOPE: Vale supplies the lantern and base frame; the builders upstand is
    // site-prepared by others and shown here for context only.
    function VghLantern__SchemaValidator__NormaliseBuildersUpstandAndBase(lantern) {
        var didMutate  =  false;

        if (VghLantern__SchemaValidator__MigrateLegacyKerbBlock(lantern)) didMutate  =  true;

        var upstandCfg  =  lantern['Lantern__BuildersUpstandAndBase__Config'];

        if (VghLantern__SchemaValidator__ApplyIntField(upstandCfg, 'Lantern__BuildersUpstandAndBase__Config__UpstandHeightMm',    SCHEMA__DEFAULT_UPSTAND_HEIGHT_MM,    SCHEMA__MIN_UPSTAND_HEIGHT_MM,    SCHEMA__MAX_UPSTAND_HEIGHT_MM))    didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyIntField(upstandCfg, 'Lantern__BuildersUpstandAndBase__Config__UpstandThicknessMm', SCHEMA__DEFAULT_UPSTAND_THICKNESS_MM, SCHEMA__MIN_UPSTAND_THICKNESS_MM, SCHEMA__MAX_UPSTAND_THICKNESS_MM)) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyIntField(upstandCfg, 'Lantern__BuildersUpstandAndBase__Config__FrameHeightMm',   SCHEMA__DEFAULT_FRAME_HEIGHT_MM,   SCHEMA__MIN_FRAME_HEIGHT_MM,   SCHEMA__MAX_FRAME_HEIGHT_MM))   didMutate  =  true;

        if (VghLantern__SchemaValidator__ApplyStringField(upstandCfg, 'Lantern__BuildersUpstandAndBase__Config__UpstandProfileId', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(upstandCfg, 'Lantern__BuildersUpstandAndBase__Config__EavesProfileId', '')) didMutate  =  true;

        return didMutate;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Normalise Lantern Ventilation Block
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__NormaliseVentilation(lantern) {
        var didMutate  =  false;
        var ventCfg    =  lantern['Lantern__Ventilation__Config'];

        if (VghLantern__SchemaValidator__ApplyBoolField(ventCfg, 'Lantern__Ventilation__Config__Enabled', false)) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(ventCfg, 'Lantern__Ventilation__Config__VentComponentId', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyIntField(ventCfg, 'Lantern__Ventilation__Config__VentCount', 0, 0, 24)) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(ventCfg, 'Lantern__Ventilation__Config__OperationType', '')) didMutate  =  true;

        return didMutate;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Normalise Lantern Finish and Glazing Block
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__NormaliseFinishAndGlazing(lantern) {
        var didMutate  =  false;
        var finishCfg  =  lantern['Lantern__FinishAndGlazing__Config'];

        if (VghLantern__SchemaValidator__ApplyStringField(finishCfg, 'Lantern__FinishAndGlazing__Config__FrameFinish', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(finishCfg, 'Lantern__FinishAndGlazing__Config__FrameColourRef', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(finishCfg, 'Lantern__FinishAndGlazing__Config__GlazingSpec', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(finishCfg, 'Lantern__FinishAndGlazing__Config__GlazingTint', '')) didMutate  =  true;

        return didMutate;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Normalise Lantern Notes Block
    // ------------------------------------------------------------
    // DocumentWarning is user-authored and surfaces as a red warning on the
    // Specification document; InternalComments is staff-only and never printed.
    function VghLantern__SchemaValidator__NormaliseNotes(lantern) {
        var didMutate  =  false;
        var notesCfg   =  lantern['Lantern__Notes__Config'];

        if (VghLantern__SchemaValidator__ApplyStringField(notesCfg, 'Lantern__Notes__Config__DocumentWarning', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(notesCfg, 'Lantern__Notes__Config__InternalComments', '')) didMutate  =  true;

        return didMutate;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Normalise a Single Lantern Block
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__NormaliseLantern(lantern, index) {
        var didMutate  =  false;

        if (!lantern || typeof lantern !== 'object' || Array.isArray(lantern)) {
            lantern    =  {};
            didMutate  =  true;
        }

        var requiredBlocks  =  [
            'Lantern__Identity__Config',
            'Lantern__Form__Config',
            'Lantern__Dimensions__Config',
            'Lantern__RoofPitch__Config',
            'Lantern__GlazingBars__Config',
            'Lantern__RidgeAndHips__Config',
            'Lantern__Finials__Config',
            'Lantern__BuildersUpstandAndBase__Config',
            'Lantern__Ventilation__Config',
            'Lantern__FinishAndGlazing__Config',
            'Lantern__Notes__Config'
        ];
        for (var i = 0; i < requiredBlocks.length; i++) {
            if (VghLantern__SchemaValidator__EnsureObject(lantern, requiredBlocks[i])) didMutate  =  true;
        }

        if (VghLantern__SchemaValidator__NormaliseIdentity(lantern, index)) didMutate  =  true;
        if (VghLantern__SchemaValidator__NormaliseForm(lantern)) didMutate  =  true;
        if (VghLantern__SchemaValidator__NormaliseDimensions(lantern)) didMutate  =  true;
        if (VghLantern__SchemaValidator__NormaliseRoofPitch(lantern)) didMutate  =  true;
        if (VghLantern__SchemaValidator__NormaliseGlazingBars(lantern)) didMutate  =  true;
        if (VghLantern__SchemaValidator__NormaliseRidgeAndHips(lantern)) didMutate  =  true;
        if (VghLantern__SchemaValidator__NormaliseFinials(lantern)) didMutate  =  true;
        if (VghLantern__SchemaValidator__NormaliseBuildersUpstandAndBase(lantern)) didMutate  =  true;
        if (VghLantern__SchemaValidator__NormaliseVentilation(lantern)) didMutate  =  true;
        if (VghLantern__SchemaValidator__NormaliseFinishAndGlazing(lantern)) didMutate  =  true;
        if (VghLantern__SchemaValidator__NormaliseNotes(lantern)) didMutate  =  true;

        return { LanternData: lantern, DidMutate: didMutate };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Fresh Default Lantern Block
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__BuildDefaultLantern(index) {
        var result  =  VghLantern__SchemaValidator__NormaliseLantern({}, index || 0);
        return result.LanternData;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Project Level Normalisation
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Normalise Project Metadata Block
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__NormaliseMetadata(metadataCfg) {
        var didMutate  =  false;

        if (VghLantern__SchemaValidator__ApplyStringField(metadataCfg, 'VghLantern__ProjectFile__Metadata__ProjectCode', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(metadataCfg, 'VghLantern__ProjectFile__Metadata__ProjectName', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(metadataCfg, 'VghLantern__ProjectFile__Metadata__DocumentName', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(metadataCfg, 'VghLantern__ProjectFile__Metadata__ClientName', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(metadataCfg, 'VghLantern__ProjectFile__Metadata__SiteAddress', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(metadataCfg, 'VghLantern__ProjectFile__Metadata__Author', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(metadataCfg, 'VghLantern__ProjectFile__Metadata__DateCreated', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(metadataCfg, 'VghLantern__ProjectFile__Metadata__DateModified', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(metadataCfg, 'VghLantern__ProjectFile__Metadata__DateIssued', '')) didMutate  =  true;

        if (!metadataCfg['VghLantern__ProjectFile__Metadata__DocumentStatus']) {
            metadataCfg['VghLantern__ProjectFile__Metadata__DocumentStatus']  =  'Draft';
            didMutate  =  true;
        }
        if (!metadataCfg['VghLantern__ProjectFile__Metadata__RevisionCode']) {
            metadataCfg['VghLantern__ProjectFile__Metadata__RevisionCode']  =  'A';
            didMutate  =  true;
        }
        if (metadataCfg['VghLantern__ProjectFile__Metadata__SchemaVersion'] !== SCHEMA__CURRENT_VERSION) {
            metadataCfg['VghLantern__ProjectFile__Metadata__SchemaVersion']  =  SCHEMA__CURRENT_VERSION;
            didMutate  =  true;
        }

        return didMutate;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Normalise Project Global Settings Block
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__NormaliseGlobalSettings(globalCfg) {
        var didMutate  =  false;

        if (VghLantern__SchemaValidator__ApplyStringField(globalCfg, 'VghLantern__ProjectFile__GlobalSettings__FrameFinish', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(globalCfg, 'VghLantern__ProjectFile__GlobalSettings__GlazingSpec', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(globalCfg, 'VghLantern__ProjectFile__GlobalSettings__JobNotes', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(globalCfg, 'VghLantern__ProjectFile__GlobalSettings__DrawingScaleRef', '')) didMutate  =  true;

        return didMutate;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Normalise the Drawing Layout Block
    // ------------------------------------------------------------
    // Holds how the Drawing Editor sheet was last set up: paper, orientation, scale,
    // grid shares, zoom and the 3D viewpoint. Every field is allowed to be null and
    // null means "fall back to config", which is exactly what a project created
    // before this block existed needs to do. Nothing here is dimensional geometry, so
    // no value is clamped to a lantern range - the Drawing Editor validates a sheet
    // size against the size table and a scale against the denominator list itself.
    function VghLantern__SchemaValidator__NormaliseDrawingLayout(layoutCfg) {
        var didMutate  =  false;

        if (!('VghLantern__ProjectFile__DrawingLayout__SheetSizeKey' in layoutCfg)) {
            layoutCfg['VghLantern__ProjectFile__DrawingLayout__SheetSizeKey']  =  null;
            didMutate  =  true;
        }
        if (!('VghLantern__ProjectFile__DrawingLayout__Orientation' in layoutCfg)) {
            layoutCfg['VghLantern__ProjectFile__DrawingLayout__Orientation']  =  null;
            didMutate  =  true;
        }
        if (!('VghLantern__ProjectFile__DrawingLayout__ScaleDenominator' in layoutCfg)) {
            layoutCfg['VghLantern__ProjectFile__DrawingLayout__ScaleDenominator']  =  null;
            didMutate  =  true;
        }
        if (VghLantern__SchemaValidator__ApplyBoolField(layoutCfg, 'VghLantern__ProjectFile__DrawingLayout__ScaleIsManual', false)) didMutate  =  true;

        if (!Array.isArray(layoutCfg['VghLantern__ProjectFile__DrawingLayout__ColumnSharesPct'])) {
            layoutCfg['VghLantern__ProjectFile__DrawingLayout__ColumnSharesPct']  =  null;
            didMutate  =  true;
        }
        if (!Array.isArray(layoutCfg['VghLantern__ProjectFile__DrawingLayout__RowSharesPct'])) {
            layoutCfg['VghLantern__ProjectFile__DrawingLayout__RowSharesPct']  =  null;
            didMutate  =  true;
        }

        if (typeof layoutCfg['VghLantern__ProjectFile__DrawingLayout__SheetZoomFactor'] !== 'number') {
            layoutCfg['VghLantern__ProjectFile__DrawingLayout__SheetZoomFactor']  =  1;
            didMutate  =  true;
        }

        if (VghLantern__SchemaValidator__EnsureObject(layoutCfg, 'VghLantern__ProjectFile__DrawingLayout__ViewCameraStates')) didMutate  =  true;

        return didMutate;
    }
    // ------------------------------------------------------------


    // FUNCTION | Validate and Normalise Full Project Data
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__ValidateAndNormaliseProject(projectData, sourceLabel) {
        var clonedProject  =  VghLantern__SchemaValidator__Clone(projectData);
        var didMutate      =  false;
        var notes          =  [];

        if (VghLantern__SchemaValidator__EnsureObject(clonedProject, 'VghLantern__ProjectFile__Metadata')) {
            didMutate  =  true;
            notes.push('Created missing project metadata object.');
        }
        if (VghLantern__SchemaValidator__EnsureObject(clonedProject, 'VghLantern__ProjectFile__GlobalSettings')) {
            didMutate  =  true;
            notes.push('Created missing project global settings object.');
        }
        if (VghLantern__SchemaValidator__EnsureObject(clonedProject, 'VghLantern__ProjectFile__DrawingLayout')) {
            didMutate  =  true;
            notes.push('Created missing drawing layout object.');
        }
        if (!Array.isArray(clonedProject['VghLantern__ProjectFile__Lanterns'])) {
            clonedProject['VghLantern__ProjectFile__Lanterns']  =  [];
            didMutate  =  true;
            notes.push('Created missing lanterns array.');
        }

        if (VghLantern__SchemaValidator__NormaliseMetadata(clonedProject['VghLantern__ProjectFile__Metadata'])) didMutate  =  true;
        if (VghLantern__SchemaValidator__NormaliseGlobalSettings(clonedProject['VghLantern__ProjectFile__GlobalSettings'])) didMutate  =  true;
        if (VghLantern__SchemaValidator__NormaliseDrawingLayout(clonedProject['VghLantern__ProjectFile__DrawingLayout'])) didMutate  =  true;

        var lanterns  =  clonedProject['VghLantern__ProjectFile__Lanterns'];
        for (var i = 0; i < lanterns.length; i++) {
            var normalisedLantern  =  VghLantern__SchemaValidator__NormaliseLantern(lanterns[i], i);
            lanterns[i]  =  normalisedLantern.LanternData;
            if (normalisedLantern.DidMutate) didMutate  =  true;
        }

        if (didMutate) {
            notes.push('Project schema normalised from source: ' + (sourceLabel || 'unknown'));
        }

        return {
            ProjectData  : clonedProject,
            DidMutate    : didMutate,
            Notes        : notes
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__SchemaValidator__ValidateAndNormaliseProject  : VghLantern__SchemaValidator__ValidateAndNormaliseProject,
        VghLantern__SchemaValidator__BuildDefaultLantern          : VghLantern__SchemaValidator__BuildDefaultLantern,
        VghLantern__SchemaValidator__SchemaVersion                : SCHEMA__CURRENT_VERSION,
        VghLantern__SchemaValidator__RoofForms                    : [
            SCHEMA__ROOF_FORM_HIPPED_RIDGE,
            SCHEMA__ROOF_FORM_PYRAMID,
            SCHEMA__ROOF_FORM_GABLE,
            SCHEMA__ROOF_FORM_MONO_PITCH
        ]
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__AppUtils__ProjectSchemaValidator  =  VghLantern__AppUtils__ProjectSchemaValidator;
