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
   - Normalises every lantern block to the current Lantern Editor expectations.
   - Canonicalises roof form, pitch mode, and glazing bar division mode strings.
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


    // MODULE CONSTANTS | Canonical Mode Labels
    // ------------------------------------------------------------
    const SCHEMA__PITCH_MODE_ANGLE        =  'angle';                        // <-- Pitch driven by degrees
    const SCHEMA__PITCH_MODE_RISE         =  'rise';                         // <-- Pitch driven by ridge rise in mm
    const SCHEMA__DIVISION_MODE_COUNT     =  'count';                        // <-- Bar count fixed, spacing derived
    const SCHEMA__DIVISION_MODE_SPACING   =  'spacing';                      // <-- Target spacing fixed, count derived
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Default Lantern Dimensions
    // ------------------------------------------------------------
    const SCHEMA__DEFAULT_WIDTH_MM        =  2400;                           // <-- Default lantern width  (long axis)
    const SCHEMA__DEFAULT_DEPTH_MM        =  1400;                           // <-- Default lantern depth  (short axis)
    const SCHEMA__DEFAULT_KERB_HEIGHT_MM  =  150;                            // <-- Default upstand kerb height
    const SCHEMA__DEFAULT_PITCH_DEGREES   =  25;                             // <-- Default roof pitch
    const SCHEMA__DEFAULT_EAVES_PROJ_MM   =  50;                             // <-- Default eaves projection past kerb
    const SCHEMA__DEFAULT_BAR_SPACING_MM  =  500;                            // <-- Default target glazing bar spacing
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


    // HELPER FUNCTION | Canonicalise Roof Pitch Drive Mode
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__NormalisePitchMode(rawPitchMode) {
        var cleaned  =  VghLantern__SchemaValidator__CleanToken(rawPitchMode);
        if (cleaned.indexOf('rise') !== -1 || cleaned.indexOf('height') !== -1) return SCHEMA__PITCH_MODE_RISE;
        return SCHEMA__PITCH_MODE_ANGLE;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Canonicalise Glazing Bar Division Mode
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__NormaliseDivisionMode(rawDivisionMode) {
        var cleaned  =  VghLantern__SchemaValidator__CleanToken(rawDivisionMode);
        if (cleaned.indexOf('spacing') !== -1 || cleaned.indexOf('pitch') !== -1) return SCHEMA__DIVISION_MODE_SPACING;
        return SCHEMA__DIVISION_MODE_COUNT;
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


    // SUB HELPER FUNCTION | Normalise Lantern Roof Pitch Block
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__NormaliseRoofPitch(lantern) {
        var didMutate  =  false;
        var pitchCfg   =  lantern['Lantern__RoofPitch__Config'];

        var nextMode  =  VghLantern__SchemaValidator__NormalisePitchMode(pitchCfg['Lantern__RoofPitch__Config__DriveMode']);
        if (pitchCfg['Lantern__RoofPitch__Config__DriveMode'] !== nextMode) {
            pitchCfg['Lantern__RoofPitch__Config__DriveMode']  =  nextMode;
            didMutate  =  true;
        }
        if (VghLantern__SchemaValidator__ApplyFloatField(pitchCfg, 'Lantern__RoofPitch__Config__PitchDegrees', SCHEMA__DEFAULT_PITCH_DEGREES, 5, 70)) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyIntField(pitchCfg, 'Lantern__RoofPitch__Config__RidgeRiseMm', 0, 0, 6000)) didMutate  =  true;

        return didMutate;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Normalise Lantern Glazing Bars Block
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__NormaliseGlazingBars(lantern) {
        var didMutate  =  false;
        var barsCfg    =  lantern['Lantern__GlazingBars__Config'];

        var nextMode  =  VghLantern__SchemaValidator__NormaliseDivisionMode(barsCfg['Lantern__GlazingBars__Config__DivisionMode']);
        if (barsCfg['Lantern__GlazingBars__Config__DivisionMode'] !== nextMode) {
            barsCfg['Lantern__GlazingBars__Config__DivisionMode']  =  nextMode;
            didMutate  =  true;
        }
        if (VghLantern__SchemaValidator__ApplyIntField(barsCfg, 'Lantern__GlazingBars__Config__BarCountLongSlope', 3, 0, 40)) didMutate  =  true;
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


    // SUB HELPER FUNCTION | Normalise Lantern Kerb and Base Block
    // ------------------------------------------------------------
    function VghLantern__SchemaValidator__NormaliseKerbAndBase(lantern) {
        var didMutate  =  false;
        var kerbCfg    =  lantern['Lantern__KerbAndBase__Config'];

        if (VghLantern__SchemaValidator__ApplyIntField(kerbCfg, 'Lantern__KerbAndBase__Config__KerbHeightMm', SCHEMA__DEFAULT_KERB_HEIGHT_MM, 0, 1200)) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(kerbCfg, 'Lantern__KerbAndBase__Config__KerbProfileId', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(kerbCfg, 'Lantern__KerbAndBase__Config__EavesProfileId', '')) didMutate  =  true;
        if (VghLantern__SchemaValidator__ApplyStringField(kerbCfg, 'Lantern__KerbAndBase__Config__ClosingProfileId', '')) didMutate  =  true;

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
            'Lantern__KerbAndBase__Config',
            'Lantern__Ventilation__Config',
            'Lantern__FinishAndGlazing__Config'
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
        if (VghLantern__SchemaValidator__NormaliseKerbAndBase(lantern)) didMutate  =  true;
        if (VghLantern__SchemaValidator__NormaliseVentilation(lantern)) didMutate  =  true;
        if (VghLantern__SchemaValidator__NormaliseFinishAndGlazing(lantern)) didMutate  =  true;

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
        if (!Array.isArray(clonedProject['VghLantern__ProjectFile__Lanterns'])) {
            clonedProject['VghLantern__ProjectFile__Lanterns']  =  [];
            didMutate  =  true;
            notes.push('Created missing lanterns array.');
        }

        if (VghLantern__SchemaValidator__NormaliseMetadata(clonedProject['VghLantern__ProjectFile__Metadata'])) didMutate  =  true;
        if (VghLantern__SchemaValidator__NormaliseGlobalSettings(clonedProject['VghLantern__ProjectFile__GlobalSettings'])) didMutate  =  true;

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
