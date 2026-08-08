/* =============================================================================
   NAAUDIO - APP UTILS | CONFIG ACCESS
   =============================================================================

   FILE       : NaAudio__AppUtils__ConfigAccess__.mjs
   NAMESPACE  : NaAudio
   MODULE     : AppUtils - ConfigAccess
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Single read point for every configuration value in the application
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Every module reads its numbers through this file. Nothing anywhere else in
     AudioSPACE is allowed to hold a tuning value as a literal.
   - NaAudio__AppCore__ConfigLoader registers each resolved config document here
     once, under a short name - 'palette', 'env3d', 'audioEngine',
     'spatialModules'. From then on the whole application asks this module.
   - The Require* readers are LOUD. A missing key is a typo in a JSON file or a
     typo at the call site, and both are bugs that must surface immediately. A
     silent fallback in a 3D audio environment produces a scene that renders but
     is subtly wrong in a way that takes hours to trace.

   ---------------------------------------------------------------------------

   WHY THERE ARE NO FALLBACK TABLES HERE

   The sibling Lantern Designer keeps a FALLBACK_SECTIONS table because its 3D
   panel can legitimately mount before config resolution finishes - its AppCore
   is a classic script and the render stack is ESM, so the two race.

   AudioSPACE has no such race. It is ESM end to end and
   NaAudio__AppCore__Init awaits every config document before a single scene
   object exists. That means a missing key here can only ever be a mistake, so
   this module throws rather than papering over it. Do not add a fallback table:
   it would turn a five-second fix into a silent behavioural drift.

   ============================================================================= */

// =============================================================================
// REGION | Configuration Registry and Readers
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Registered Config Documents
    // ------------------------------------------------------------
    const REGISTERED_DOCUMENTS  =  new Map();                                // <-- Short name -> resolved root object
    const SECTION_PREFIXES      =  new Map();                                // <-- Short name -> subsection key prefix
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Registration
// -----------------------------------------------------------------------------

    // FUNCTION | Register a Resolved Config Document Under a Short Name
    // ------------------------------------------------------------
    // rootObject is the value of the document's single top-level key, e.g. the
    // object under 'NaAudio__Env3d__Config'. sectionPrefix is what every
    // subsection key inside it shares, e.g. 'NaAudio__Env3d__Config__', so a
    // caller asks for the section 'Camera' rather than spelling the full key.
    export function NaAudio__ConfigAccess__Register(shortName, rootObject, sectionPrefix) {
        if (!shortName || !rootObject) {
            throw new Error('[NaAudio ConfigAccess] Register called with an empty name or document: "' + shortName + '"');
        }

        REGISTERED_DOCUMENTS.set(shortName, rootObject);
        SECTION_PREFIXES.set(shortName, sectionPrefix || '');
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether a Named Document Has Been Registered
    // ------------------------------------------------------------
    export function NaAudio__ConfigAccess__IsRegistered(shortName) {
        return REGISTERED_DOCUMENTS.has(shortName);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Section and Value Reads
// -----------------------------------------------------------------------------

    // FUNCTION | Read a Whole Named Section
    // ------------------------------------------------------------
    export function NaAudio__ConfigAccess__Section(shortName, sectionName) {
        const document  =  REGISTERED_DOCUMENTS.get(shortName);
        if (!document) {
            throw new Error('[NaAudio ConfigAccess] Config document "' + shortName + '" was never registered. Check NaAudio__AppConfig__Main__ConfigRegistry and the boot order in NaAudio__AppCore__Init.');
        }

        const prefix   =  SECTION_PREFIXES.get(shortName) || '';
        const section  =  document[prefix + sectionName];

        if (!section) {
            throw new Error('[NaAudio ConfigAccess] Missing config section "' + prefix + sectionName + '" in document "' + shortName + '".');
        }
        return section;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read a Raw Value, Undefined If Absent
    // ------------------------------------------------------------
    function NaAudio__ConfigAccess__Raw(shortName, sectionName, fieldName) {
        const section  =  NaAudio__ConfigAccess__Section(shortName, sectionName);
        return section[fieldName];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Throw a Consistent Missing-Key Error
    // ------------------------------------------------------------
    function NaAudio__ConfigAccess__Fail(shortName, sectionName, fieldName, expected, actual) {
        const prefix  =  SECTION_PREFIXES.get(shortName) || '';
        throw new Error('[NaAudio ConfigAccess] Expected ' + expected + ' at "' + prefix + sectionName + '.' + fieldName + '" in document "' + shortName + '" but found ' + JSON.stringify(actual) + '.');
    }
    // ------------------------------------------------------------


    // FUNCTION | Require a Number
    // ------------------------------------------------------------
    export function NaAudio__ConfigAccess__RequireNumber(shortName, sectionName, fieldName) {
        const value  =  NaAudio__ConfigAccess__Raw(shortName, sectionName, fieldName);
        if (typeof value !== 'number' || Number.isNaN(value)) {
            NaAudio__ConfigAccess__Fail(shortName, sectionName, fieldName, 'a number', value);
        }
        return value;
    }
    // ------------------------------------------------------------


    // FUNCTION | Require a String
    // ------------------------------------------------------------
    export function NaAudio__ConfigAccess__RequireString(shortName, sectionName, fieldName) {
        const value  =  NaAudio__ConfigAccess__Raw(shortName, sectionName, fieldName);
        if (typeof value !== 'string' || value.length === 0) {
            NaAudio__ConfigAccess__Fail(shortName, sectionName, fieldName, 'a non-empty string', value);
        }
        return value;
    }
    // ------------------------------------------------------------


    // FUNCTION | Require a Boolean
    // ------------------------------------------------------------
    export function NaAudio__ConfigAccess__RequireBoolean(shortName, sectionName, fieldName) {
        const value  =  NaAudio__ConfigAccess__Raw(shortName, sectionName, fieldName);
        if (typeof value !== 'boolean') {
            NaAudio__ConfigAccess__Fail(shortName, sectionName, fieldName, 'a boolean', value);
        }
        return value;
    }
    // ------------------------------------------------------------


    // FUNCTION | Require an Object
    // ------------------------------------------------------------
    export function NaAudio__ConfigAccess__RequireObject(shortName, sectionName, fieldName) {
        const value  =  NaAudio__ConfigAccess__Raw(shortName, sectionName, fieldName);
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            NaAudio__ConfigAccess__Fail(shortName, sectionName, fieldName, 'an object', value);
        }
        return value;
    }
    // ------------------------------------------------------------


    // FUNCTION | Require an Array
    // ------------------------------------------------------------
    export function NaAudio__ConfigAccess__RequireArray(shortName, sectionName, fieldName) {
        const value  =  NaAudio__ConfigAccess__Raw(shortName, sectionName, fieldName);
        if (!Array.isArray(value)) {
            NaAudio__ConfigAccess__Fail(shortName, sectionName, fieldName, 'an array', value);
        }
        return value;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read an Optional Value With an Explicit Default
    // ------------------------------------------------------------
    // The only sanctioned way to read a key that is genuinely allowed to be
    // absent - a note field, an experimental switch. The default is passed at the
    // call site because there is exactly one caller who knows what absence means.
    export function NaAudio__ConfigAccess__Optional(shortName, sectionName, fieldName, defaultValue) {
        const value  =  NaAudio__ConfigAccess__Raw(shortName, sectionName, fieldName);
        return (value === undefined || value === null) ? defaultValue : value;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Convenience Readers For the Hot Documents
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Env3d Shorthands
    // ------------------------------------------------------------
    // The 3D pipeline reads its config on nearly every line of setup code, so it
    // gets named shorthands. Nothing here does anything the generic readers above
    // do not - it exists purely so a scene builder reads as scene building.
    export const Env3dNumber   =  (section, field) => NaAudio__ConfigAccess__RequireNumber('env3d', section, field);
    export const Env3dString   =  (section, field) => NaAudio__ConfigAccess__RequireString('env3d', section, field);
    export const Env3dBool     =  (section, field) => NaAudio__ConfigAccess__RequireBoolean('env3d', section, field);
    export const Env3dObject   =  (section, field) => NaAudio__ConfigAccess__RequireObject('env3d', section, field);
    export const Env3dArray    =  (section, field) => NaAudio__ConfigAccess__RequireArray('env3d', section, field);
    export const Env3dSection  =  (section)        => NaAudio__ConfigAccess__Section('env3d', section);
    // ------------------------------------------------------------


    // HELPER FUNCTION | Audio Engine Shorthands
    // ------------------------------------------------------------
    export const AudioNumber   =  (section, field) => NaAudio__ConfigAccess__RequireNumber('audioEngine', section, field);
    export const AudioString   =  (section, field) => NaAudio__ConfigAccess__RequireString('audioEngine', section, field);
    export const AudioBool     =  (section, field) => NaAudio__ConfigAccess__RequireBoolean('audioEngine', section, field);
    export const AudioObject   =  (section, field) => NaAudio__ConfigAccess__RequireObject('audioEngine', section, field);
    export const AudioSection  =  (section)        => NaAudio__ConfigAccess__Section('audioEngine', section);
    // ------------------------------------------------------------


    // HELPER FUNCTION | Spatial Module Shorthands
    // ------------------------------------------------------------
    export const SpatialSection  =  (section)        => NaAudio__ConfigAccess__Section('spatialModules', section);
    export const SpatialNumber   =  (section, field) => NaAudio__ConfigAccess__RequireNumber('spatialModules', section, field);
    export const SpatialBool     =  (section, field) => NaAudio__ConfigAccess__RequireBoolean('spatialModules', section, field);
    export const SpatialObject   =  (section, field) => NaAudio__ConfigAccess__RequireObject('spatialModules', section, field);
    // ------------------------------------------------------------


    // FUNCTION | Read the Defaults for One Spatial Module Type
    // ------------------------------------------------------------
    // Every module type calls this once on construction. Failing loudly on an
    // unregistered type is what stops a typo in a space file producing an empty
    // cage that is very hard to explain.
    export function NaAudio__ConfigAccess__ModuleTypeDefaults(typeName) {
        const defaults  =  NaAudio__ConfigAccess__Section('spatialModules', 'TypeDefaults');
        const entry     =  defaults[typeName];

        if (!entry) {
            const known  =  Object.keys(defaults).join(', ');
            throw new Error('[NaAudio ConfigAccess] No TypeDefaults entry for spatial module type "' + typeName + '". Known types: ' + known + '.');
        }
        return entry;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
