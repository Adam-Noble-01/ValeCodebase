/* =============================================================================
   VGHLANTERN - SPECIFICATION | DOCUMENT MODEL
   =============================================================================

   FILE       : VghLantern__Specification__DocumentModel__.js
   NAMESPACE  : VghLantern
   MODULE     : System - Specification - DocumentModel
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Derive the specification document data from the project geometry
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Builds the specification document model: one takeoff per lantern on the project,
     plus an aggregated works-order summary when there is more than one.
   - Every number in the document comes from Geometry__QuantityTakeoff. Nothing here
     is hand-entered and nothing is recalculated locally.
   - Returns pure data. Renderers turn it into tables; this module never touches the
     DOM and makes no formatting decisions beyond label lookup.

   -----------------------------------------------------------------------------

   WHY THIS SOLVES EVERY LANTERN RATHER THAN READING THE SOLVED STATE:
   StateManager publishes the geometry for the ACTIVE lantern only, because that is
   all the editor and the two viewports ever need. A specification covers the whole
   project, so this module re-solves each lantern through the same solver. The solver
   is pure, so a second solve is guaranteed to agree with the published one.

   WHY THE MODEL IS REBUILT RATHER THAN PATCHED:
   Takeoff is cheap - a few hundred arithmetic operations per lantern. Tracking which
   sections a given edit invalidates would cost more in bugs than it saves in cycles.

   ============================================================================= */

// =============================================================================
// REGION | Specification Document Model Module
// =============================================================================

const VghLantern__Specification__DocumentModel = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Project and Lantern Data Keys
    // ------------------------------------------------------------
    const PROJECT_LANTERNS  =  'VghLantern__ProjectFile__Lanterns';
    const PROJECT_METADATA  =  'VghLantern__ProjectFile__Metadata';
    const PROJECT_GLOBALS   =  'VghLantern__ProjectFile__GlobalSettings';

    const BLOCK_IDENTITY    =  'Lantern__Identity__Config';
    const BLOCK_FORM        =  'Lantern__Form__Config';
    const BLOCK_FINISH      =  'Lantern__FinishAndGlazing__Config';
    const BLOCK_NOTES       =  'Lantern__Notes__Config';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Specification Config Root
    // ------------------------------------------------------------
    function VghLantern__DocumentModel__SpecConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};
        return ConfigLoader.VghLantern__ConfigLoader__GetSection('Specification') || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve a Human Readable Roof Form Label
    // ------------------------------------------------------------
    function VghLantern__DocumentModel__RoofFormLabel(roofFormKey) {
        var labels  =  VghLantern__DocumentModel__SpecConfig()['VghLantern__Specification__Config__RoofFormLabels'] || {};
        return labels[roofFormKey] || roofFormKey || '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Per Lantern Derivation
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Read a Lantern Config Field with a Fallback
    // ------------------------------------------------------------
    function VghLantern__DocumentModel__Read(lantern, blockKey, fieldKey, fallbackValue) {
        var block  =  lantern ? lantern[blockKey] : null;
        if (!block) return fallbackValue;

        var value  =  block[fieldKey];
        return (value === undefined || value === null || value === '') ? fallbackValue : value;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Solve One Lantern and Build Its Takeoff
    // ------------------------------------------------------------
    // Returns null for a lantern the solver rejects, so a single unbuildable lantern
    // cannot take the whole document down with it.
    function VghLantern__DocumentModel__BuildLanternEntry(lantern, lanternIndex) {
        var SkeletonSolver  =  window.VghLantern__Geometry__SkeletonSolver;
        var GlazeBarLayout  =  window.VghLantern__Geometry__GlazeBarLayout;
        var QuantityTakeoff =  window.VghLantern__Geometry__QuantityTakeoff;
        if (!SkeletonSolver || !QuantityTakeoff || !lantern) return null;

        var skeleton  =  SkeletonSolver.VghLantern__SkeletonSolver__Solve(lantern);
        if (!skeleton) return null;

        var barSet   =  GlazeBarLayout ? GlazeBarLayout.VghLantern__GlazeBarLayout__Layout(skeleton, lantern) : null;
        var takeoff  =  QuantityTakeoff.VghLantern__QuantityTakeoff__BuildForLantern(skeleton, barSet, lantern);
        if (!takeoff) return null;

        return {
            LanternIndex  : lanternIndex,
            Reference     : VghLantern__DocumentModel__Read(lantern, BLOCK_IDENTITY, 'Lantern__Identity__Config__Reference', ''),
            Title         : VghLantern__DocumentModel__Read(lantern, BLOCK_IDENTITY, 'Lantern__Identity__Config__Title', 'Lantern ' + (lanternIndex + 1)),
            RoofFormKey   : VghLantern__DocumentModel__Read(lantern, BLOCK_FORM, 'Lantern__Form__Config__RoofForm', ''),
            RoofFormLabel : VghLantern__DocumentModel__RoofFormLabel(
                                VghLantern__DocumentModel__Read(lantern, BLOCK_FORM, 'Lantern__Form__Config__RoofForm', '')
                            ),
            FrameFinish   : VghLantern__DocumentModel__Read(lantern, BLOCK_FINISH, 'Lantern__FinishAndGlazing__Config__FrameFinish', ''),
            ColourRef     : VghLantern__DocumentModel__Read(lantern, BLOCK_FINISH, 'Lantern__FinishAndGlazing__Config__FrameColourRef', ''),
            GlazingSpec   : VghLantern__DocumentModel__Read(lantern, BLOCK_FINISH, 'Lantern__FinishAndGlazing__Config__GlazingSpec', ''),
            GlazingTint   : VghLantern__DocumentModel__Read(lantern, BLOCK_FINISH, 'Lantern__FinishAndGlazing__Config__GlazingTint', ''),
            DocumentWarning : String(VghLantern__DocumentModel__Read(lantern, BLOCK_NOTES, 'Lantern__Notes__Config__DocumentWarning', '')).trim(),
            Takeoff       : takeoff
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Document Assembly
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Schedule Rows from Every Lantern Entry
    // ------------------------------------------------------------
    // Flattened for the schedule table, which quotes the headline figures per
    // lantern rather than the full takeoff.
    function VghLantern__DocumentModel__BuildScheduleRows(entries) {
        var rows  =  [];
        var i, entry;

        for (i = 0; i < entries.length; i++) {
            entry  =  entries[i];
            rows.push({
                Reference     : entry.Reference,
                Title         : entry.Title,
                RoofFormLabel : entry.RoofFormLabel,
                WidthMm       : entry.Takeoff.Meta.WidthMm,
                DepthMm       : entry.Takeoff.Meta.DepthMm,
                PitchDegrees  : entry.Takeoff.Meta.PitchDegrees,
                Quantity      : entry.Takeoff.Meta.Quantity
            });
        }

        return rows;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Collect the Document Level Warnings
    // ------------------------------------------------------------
    // Warnings are prefixed with the lantern they came from, because "geometry is
    // invalid" on a four-lantern project is useless without knowing which one.
    function VghLantern__DocumentModel__CollectWarnings(entries, lanternCount) {
        var warnings  =  [];
        var i, j, entry;

        if (lanternCount > 0 && entries.length < lanternCount) {
            warnings.push((lanternCount - entries.length) + ' lantern(s) could not be solved and are omitted from this schedule.');
        }

        for (i = 0; i < entries.length; i++) {
            entry  =  entries[i];
            for (j = 0; j < entry.Takeoff.Warnings.length; j++) {
                warnings.push(entry.Title + ': ' + entry.Takeoff.Warnings[j]);
            }
        }

        return warnings;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Collect the Staff-Authored Document Warnings
    // ------------------------------------------------------------
    // DocumentWarning is free text from the Warnings and Comments section of the
    // editor - unlike CollectWarnings above, this is never generated by a rule, so
    // it is kept in its own list rather than merged into the rule-based warnings.
    function VghLantern__DocumentModel__CollectUserWarnings(entries) {
        var warnings  =  [];
        var i, entry;

        for (i = 0; i < entries.length; i++) {
            entry  =  entries[i];
            if (entry.DocumentWarning) warnings.push(entry.Title + ': ' + entry.DocumentWarning);
        }

        return warnings;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Full Specification Document Model
    // ------------------------------------------------------------
    // Returns null when there is no project or no solvable lantern, which the
    // section manager reports as the mode's empty state.
    function VghLantern__Specification__DocumentModel__Build(project) {
        if (!project) return null;

        var lanterns  =  Array.isArray(project[PROJECT_LANTERNS]) ? project[PROJECT_LANTERNS] : [];
        var metadata  =  project[PROJECT_METADATA] || {};
        var globals   =  project[PROJECT_GLOBALS]  || {};

        var entries  =  [];
        var i, entry;
        for (i = 0; i < lanterns.length; i++) {
            entry  =  VghLantern__DocumentModel__BuildLanternEntry(lanterns[i], i);
            if (entry) entries.push(entry);
        }

        if (!entries.length) return null;

        var ConfigLoader     =  window.VghLantern__AppCore__ConfigLoader;
        var DOC_LABEL        =  'Na__Specification__Config.json -> VghLantern__Specification__Config__Document';
        var QuantityTakeoff  =  window.VghLantern__Geometry__QuantityTakeoff;
        var docConfig        =  VghLantern__DocumentModel__SpecConfig()['VghLantern__Specification__Config__Document'] || {};

        var wantsAggregate   =  ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(docConfig, 'AggregateWhenMultiLantern', DOC_LABEL) && entries.length > 1;
        var takeoffList      =  [];
        for (i = 0; i < entries.length; i++) takeoffList.push(entries[i].Takeoff);

        return {
            Meta : {
                DocumentTitle : ConfigLoader.VghLantern__ConfigLoader__RequireString(docConfig, 'DocumentTitle', DOC_LABEL),
                ProjectCode   : metadata['VghLantern__ProjectFile__Metadata__ProjectCode'] || '',
                ProjectName   : metadata['VghLantern__ProjectFile__Metadata__ProjectName'] || '',
                ClientName    : metadata['VghLantern__ProjectFile__Metadata__ClientName']  || '',
                SiteAddress   : metadata['VghLantern__ProjectFile__Metadata__SiteAddress'] || '',
                RevisionCode  : metadata['VghLantern__ProjectFile__Metadata__RevisionCode'] || '',
                LanternCount  : entries.length,
                GeneratedAt   : new Date()
            },
            Lanterns      : entries,
            ScheduleRows  : VghLantern__DocumentModel__BuildScheduleRows(entries),
            Aggregate     : (wantsAggregate && QuantityTakeoff)
                                ? QuantityTakeoff.VghLantern__QuantityTakeoff__AggregateProject(takeoffList)
                                : null,
            JobNotes      : globals['VghLantern__ProjectFile__GlobalSettings__JobNotes'] || '',
            Warnings      : VghLantern__DocumentModel__CollectWarnings(entries, lanterns.length),
            UserWarnings  : VghLantern__DocumentModel__CollectUserWarnings(entries)
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Document Model from the Current Project State
    // ------------------------------------------------------------
    function VghLantern__Specification__DocumentModel__BuildFromState() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return null;

        return VghLantern__Specification__DocumentModel__Build(
            StateManager.VghLantern__StateManager__GetCurrentProject()
        );
    }
    // ------------------------------------------------------------


    // FUNCTION | List the Enabled Document Sections in Order
    // ------------------------------------------------------------
    function VghLantern__Specification__DocumentModel__ListSections() {
        var sections  =  VghLantern__DocumentModel__SpecConfig()['VghLantern__Specification__Config__Sections'];
        if (!Array.isArray(sections)) return [];

        var enabled  =  [];
        var i;
        for (i = 0; i < sections.length; i++) {
            if (sections[i].Enabled !== false) enabled.push(sections[i]);
        }

        return enabled;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Specification__DocumentModel__Build           : VghLantern__Specification__DocumentModel__Build,
        VghLantern__Specification__DocumentModel__BuildFromState  : VghLantern__Specification__DocumentModel__BuildFromState,
        VghLantern__Specification__DocumentModel__ListSections    : VghLantern__Specification__DocumentModel__ListSections
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Specification__DocumentModel  =  VghLantern__Specification__DocumentModel;
