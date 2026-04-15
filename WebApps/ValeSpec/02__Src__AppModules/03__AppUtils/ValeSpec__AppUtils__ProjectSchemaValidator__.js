/* =============================================================================
   VALESPEC - PROJECT SCHEMA VALIDATOR
   =============================================================================

   FILE       : ValeSpec__AppUtils__ProjectSchemaValidator__.js
   NAMESPACE  : ValeSpec
   MODULE     : AppUtils - ProjectSchemaValidator
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Normalise loaded project JSON into a stable ValeSpec schema
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Normalises project-level metadata/global settings keys and defaults
   - Aligns assembly-level keys to current Door Configurator expectations
   - Converts legacy door type/opening/handing string variants to canonical values
   - Repairs missing objects so UI hydration does not fall back to placeholders
   - Returns a result payload with ProjectData and DidMutate status
   - IMPORTANT: single source of truth for project schema compatibility + legacy migration
   - IMPORTANT: intended call paths are ProjectFileManager create/load/save/sync

   ============================================================================= */

// =============================================================================
// REGION | Project Schema Validator Module
// =============================================================================

const ValeSpec__AppUtils__ProjectSchemaValidator = (function() {

    // MODULE CONSTANTS | Canonical Door Type Labels
    // ------------------------------------------------------------
    const VALESPEC__SCHEMA__DOOR_TYPE_NONE     =  'None';
    const VALESPEC__SCHEMA__DOOR_TYPE_DOUBLE   =  'Double Doors';
    const VALESPEC__SCHEMA__DOOR_TYPE_BIFOLD   =  'Bifold Doors';
    const VALESPEC__SCHEMA__DOOR_TYPE_SINGLE   =  'Single Door';
    const VALESPEC__SCHEMA__DOOR_TYPE_WINDOW   =  'Window Panel';
    // ------------------------------------------------------------


    // HELPER FUNCTION | Deep Clone Data for Safe Normalisation
    // ------------------------------------------------------------
    function ValeSpec__SchemaValidator__Clone(data) {
        if (!data || typeof data !== 'object') return {};
        try {
            return JSON.parse(JSON.stringify(data));
        } catch (e) {
            return {};
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Ensure Object Path Exists
    // ------------------------------------------------------------
    function ValeSpec__SchemaValidator__EnsureObject(parentObj, key) {
        if (!parentObj[key] || typeof parentObj[key] !== 'object' || Array.isArray(parentObj[key])) {
            parentObj[key]  =  {};
            return true;
        }
        return false;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Parse Integer with Fallback
    // ------------------------------------------------------------
    function ValeSpec__SchemaValidator__ToInt(rawValue, fallbackValue) {
        var parsed  =  parseInt(rawValue, 10);
        return isNaN(parsed) ? fallbackValue : parsed;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Canonicalise Door Type Label
    // ------------------------------------------------------------
    function ValeSpec__SchemaValidator__NormaliseDoorType(rawDoorType, legacyQuantity) {
        if (rawDoorType === null || rawDoorType === undefined || rawDoorType === '') {
            if (legacyQuantity !== null && legacyQuantity !== undefined) {
                return ValeSpec__SchemaValidator__ToInt(legacyQuantity, 2) >= 2
                    ? VALESPEC__SCHEMA__DOOR_TYPE_DOUBLE
                    : VALESPEC__SCHEMA__DOOR_TYPE_SINGLE;
            }
            return VALESPEC__SCHEMA__DOOR_TYPE_NONE;
        }

        var cleaned  =  String(rawDoorType)
            .toLowerCase()
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (cleaned === 'none' || cleaned === 'not selected' || cleaned === 'unconfigured') return VALESPEC__SCHEMA__DOOR_TYPE_NONE;
        if (cleaned.indexOf('bifold') !== -1 || cleaned.indexOf('bi fold') !== -1) return VALESPEC__SCHEMA__DOOR_TYPE_BIFOLD;
        if (cleaned.indexOf('double') !== -1 || cleaned.indexOf('pair') !== -1 || cleaned.indexOf('leaf pair') !== -1) return VALESPEC__SCHEMA__DOOR_TYPE_DOUBLE;
        if (cleaned.indexOf('single') !== -1) return VALESPEC__SCHEMA__DOOR_TYPE_SINGLE;
        if (cleaned.indexOf('window') !== -1) return VALESPEC__SCHEMA__DOOR_TYPE_WINDOW;

        return VALESPEC__SCHEMA__DOOR_TYPE_NONE;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Canonicalise Opening Direction
    // ------------------------------------------------------------
    function ValeSpec__SchemaValidator__NormaliseOpeningDirection(rawDirection) {
        var cleaned  =  String(rawDirection || '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();

        if (cleaned.indexOf('in') !== -1) return 'Inward';
        return 'Outward';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Canonicalise Handing
    // ------------------------------------------------------------
    function ValeSpec__SchemaValidator__NormaliseHanding(rawHanding) {
        var cleaned  =  String(rawHanding || '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();

        if (cleaned === 'right' || cleaned.indexOf('right') === 0) return 'Right';
        return 'Left';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Canonicalise Fixed Panel Value
    // ------------------------------------------------------------
    function ValeSpec__SchemaValidator__NormaliseFixedPanel(rawFixedPanel) {
        var cleaned  =  String(rawFixedPanel || '')
            .toLowerCase()
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (cleaned.indexOf('left') !== -1) return 'left';
        if (cleaned.indexOf('right') !== -1) return 'right';
        return 'none';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Canonicalise Global Lever Type
    // ------------------------------------------------------------
    function ValeSpec__SchemaValidator__NormaliseLeverType(rawLeverType) {
        var cleaned  =  String(rawLeverType || '')
            .toLowerCase()
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleaned) return 'Scroll Lever Handle';
        if (cleaned === 'scroll') return 'Scroll Lever Handle';
        if (cleaned === 'plain') return 'Plain Lever Handle';
        if (cleaned === 'newton') return 'Newton Lever Handle';
        return String(rawLeverType);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Normalise Single Assembly Block
    // ------------------------------------------------------------
    function ValeSpec__SchemaValidator__NormaliseAssembly(assembly, index) {
        var didMutate  =  false;
        if (!assembly || typeof assembly !== 'object' || Array.isArray(assembly)) {
            assembly   =  {};
            didMutate  =  true;
        }

        if (ValeSpec__SchemaValidator__EnsureObject(assembly, 'Assembly__Identity__Config')) didMutate  =  true;
        if (ValeSpec__SchemaValidator__EnsureObject(assembly, 'Assembly__DoorType__Config')) didMutate  =  true;
        if (ValeSpec__SchemaValidator__EnsureObject(assembly, 'Assembly__Dimensions__Config')) didMutate =  true;
        if (ValeSpec__SchemaValidator__EnsureObject(assembly, 'Assembly__Opening__Config')) didMutate    =  true;
        if (ValeSpec__SchemaValidator__EnsureObject(assembly, 'Assembly__Lever__Config')) didMutate      =  true;

        var identityCfg  =  assembly['Assembly__Identity__Config'];
        if (!identityCfg['Assembly__Identity__Config__Id']) {
            identityCfg['Assembly__Identity__Config__Id']  =  'asm_' + String(Date.now()).slice(-6) + '_' + index;
            didMutate  =  true;
        }
        if (identityCfg['Assembly__Identity__Config__Title'] === undefined) {
            identityCfg['Assembly__Identity__Config__Title']  =  '';
            didMutate  =  true;
        }
        var nextSortOrder  =  ValeSpec__SchemaValidator__ToInt(identityCfg['Assembly__Identity__Config__SortOrder'], index);
        if (identityCfg['Assembly__Identity__Config__SortOrder'] !== nextSortOrder) {
            identityCfg['Assembly__Identity__Config__SortOrder']  =  nextSortOrder;
            didMutate  =  true;
        }

        var doorTypeCfg      =  assembly['Assembly__DoorType__Config'];
        var legacyQuantity   =  doorTypeCfg['Assembly__DoorType__Config__Quantity'];
        var nextDoorType     =  ValeSpec__SchemaValidator__NormaliseDoorType(doorTypeCfg['Assembly__DoorType__Config__Type'], legacyQuantity);
        var nextDirection    =  ValeSpec__SchemaValidator__NormaliseOpeningDirection(doorTypeCfg['Assembly__DoorType__Config__OpeningDirection']);
        if (doorTypeCfg['Assembly__DoorType__Config__Type'] !== nextDoorType) {
            doorTypeCfg['Assembly__DoorType__Config__Type']  =  nextDoorType;
            didMutate  =  true;
        }
        if (doorTypeCfg['Assembly__DoorType__Config__OpeningDirection'] !== nextDirection) {
            doorTypeCfg['Assembly__DoorType__Config__OpeningDirection']  =  nextDirection;
            didMutate  =  true;
        }
        if (Object.prototype.hasOwnProperty.call(doorTypeCfg, 'Assembly__DoorType__Config__Quantity')) {
            delete doorTypeCfg['Assembly__DoorType__Config__Quantity'];                   // <-- Legacy key retired; type string is source of truth
            didMutate  =  true;
        }

        var dimsCfg          =  assembly['Assembly__Dimensions__Config'];
        var defaultWidthMm   =  (nextDoorType === VALESPEC__SCHEMA__DOOR_TYPE_SINGLE || nextDoorType === VALESPEC__SCHEMA__DOOR_TYPE_WINDOW) ? 900 : 1800;
        var defaultHeightMm  =  2100;
        var nextWidthMm      =  Math.max(1, ValeSpec__SchemaValidator__ToInt(dimsCfg['Assembly__Dimensions__Config__WidthMm'], defaultWidthMm));
        var nextHeightMm     =  Math.max(1, ValeSpec__SchemaValidator__ToInt(dimsCfg['Assembly__Dimensions__Config__HeightMm'], defaultHeightMm));
        if (dimsCfg['Assembly__Dimensions__Config__WidthMm'] !== nextWidthMm) {
            dimsCfg['Assembly__Dimensions__Config__WidthMm']  =  nextWidthMm;
            didMutate  =  true;
        }
        if (dimsCfg['Assembly__Dimensions__Config__HeightMm'] !== nextHeightMm) {
            dimsCfg['Assembly__Dimensions__Config__HeightMm']  =  nextHeightMm;
            didMutate  =  true;
        }

        var openingCfg      =  assembly['Assembly__Opening__Config'];
        var nextFixedPanel  =  ValeSpec__SchemaValidator__NormaliseFixedPanel(openingCfg['Assembly__Opening__Config__FixedPanel']);
        if (openingCfg['Assembly__Opening__Config__FixedPanel'] !== nextFixedPanel) {
            openingCfg['Assembly__Opening__Config__FixedPanel']  =  nextFixedPanel;
            didMutate  =  true;
        }

        var leverCfg  =  assembly['Assembly__Lever__Config'];
        if (!leverCfg['Assembly__Lever__Config__Type']) {
            leverCfg['Assembly__Lever__Config__Type']  =  'Scroll Lever Handle';
            didMutate  =  true;
        }
        var leverHeight  =  Math.max(1, ValeSpec__SchemaValidator__ToInt(leverCfg['Assembly__Lever__Config__HeightMm'], 1000));
        if (leverCfg['Assembly__Lever__Config__HeightMm'] !== leverHeight) {
            leverCfg['Assembly__Lever__Config__HeightMm']  =  leverHeight;
            didMutate  =  true;
        }

        var rootHanding  =  assembly['Handing'];
        if ((rootHanding === undefined || rootHanding === null || rootHanding === '') && leverCfg['Assembly__Lever__Config__Handing']) {
            rootHanding  =  leverCfg['Assembly__Lever__Config__Handing'];                // <-- Migrate legacy location into current root-level key
        }
        var nextHanding  =  ValeSpec__SchemaValidator__NormaliseHanding(rootHanding);
        if (assembly['Handing'] !== nextHanding) {
            assembly['Handing']  =  nextHanding;
            didMutate  =  true;
        }

        return { AssemblyData: assembly, DidMutate: didMutate };
    }
    // ------------------------------------------------------------


    // FUNCTION | Validate and Normalise Full Project Data
    // ------------------------------------------------------------
    function ValeSpec__SchemaValidator__ValidateAndNormaliseProject(projectData, sourceLabel) {
        var clonedProject  =  ValeSpec__SchemaValidator__Clone(projectData);
        var didMutate      =  false;
        var notes          =  [];

        if (ValeSpec__SchemaValidator__EnsureObject(clonedProject, 'ValeSpec__ProjectFile__Metadata')) {
            didMutate  =  true;
            notes.push('Created missing project metadata object.');
        }
        if (ValeSpec__SchemaValidator__EnsureObject(clonedProject, 'ValeSpec__ProjectFile__GlobalSettings')) {
            didMutate  =  true;
            notes.push('Created missing project global settings object.');
        }
        if (!Array.isArray(clonedProject['ValeSpec__ProjectFile__Assemblies'])) {
            clonedProject['ValeSpec__ProjectFile__Assemblies']  =  [];
            didMutate  =  true;
            notes.push('Created missing assemblies array.');
        }

        var metadataCfg  =  clonedProject['ValeSpec__ProjectFile__Metadata'];
        if (metadataCfg['ValeSpec__ProjectFile__Metadata__DocumentStatus'] === undefined || metadataCfg['ValeSpec__ProjectFile__Metadata__DocumentStatus'] === '') {
            metadataCfg['ValeSpec__ProjectFile__Metadata__DocumentStatus']  =  'Draft';
            didMutate  =  true;
        }
        if (metadataCfg['ValeSpec__ProjectFile__Metadata__RevisionCode'] === undefined || metadataCfg['ValeSpec__ProjectFile__Metadata__RevisionCode'] === '') {
            metadataCfg['ValeSpec__ProjectFile__Metadata__RevisionCode']  =  'A';
            didMutate  =  true;
        }

        var globalCfg       =  clonedProject['ValeSpec__ProjectFile__GlobalSettings'];
        var normalLeverType =  ValeSpec__SchemaValidator__NormaliseLeverType(globalCfg['ValeSpec__ProjectFile__GlobalSettings__LeverType']);
        if (globalCfg['ValeSpec__ProjectFile__GlobalSettings__LeverType'] !== normalLeverType) {
            globalCfg['ValeSpec__ProjectFile__GlobalSettings__LeverType']  =  normalLeverType;
            didMutate  =  true;
        }
        if (!globalCfg['ValeSpec__ProjectFile__GlobalSettings__IronmongeryFinish']) {
            globalCfg['ValeSpec__ProjectFile__GlobalSettings__IronmongeryFinish']  =  'Unlacquered Brass';
            didMutate  =  true;
        }
        if (globalCfg['ValeSpec__ProjectFile__GlobalSettings__JobNotes'] === undefined || globalCfg['ValeSpec__ProjectFile__GlobalSettings__JobNotes'] === null) {
            globalCfg['ValeSpec__ProjectFile__GlobalSettings__JobNotes']  =  '';
            didMutate  =  true;
        }

        var assemblies  =  clonedProject['ValeSpec__ProjectFile__Assemblies'];
        var i;
        for (i = 0; i < assemblies.length; i++) {
            var normalisedAssembly  =  ValeSpec__SchemaValidator__NormaliseAssembly(assemblies[i], i);
            assemblies[i]  =  normalisedAssembly.AssemblyData;
            if (normalisedAssembly.DidMutate) didMutate  =  true;
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


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__SchemaValidator__ValidateAndNormaliseProject  : ValeSpec__SchemaValidator__ValidateAndNormaliseProject
    };

})();

// endregion ===================================================================

window.ValeSpec__AppUtils__ProjectSchemaValidator  =  ValeSpec__AppUtils__ProjectSchemaValidator;
