/* =============================================================================
   VGHLANTERN - SKETCHUP EXPORT | PAYLOAD BUILDER
   =============================================================================

   FILE       : VghLantern__SketchUpExport__PayloadBuilder__.js
   NAMESPACE  : VghLantern
   MODULE     : SketchUpExport - PayloadBuilder
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Assemble the complete SketchUp build payload for one lantern
   CREATED    : 11-Aug-2026

   DESCRIPTION:
   - The single public entry point into the SketchUp export. Gathers the solved
     geometry, runs the encoders, and returns one JSON-ready document describing
     the whole lantern in millimetres.
   - Computes no geometry and reads no files. The SkeletonSolver has already
     answered every geometric question by the time this runs; the encoders turn
     those answers into prisms; this file puts a header on them.

   ---------------------------------------------------------------------------

   WHY THE PAYLOAD IS A BUILD RECIPE RATHER THAN A CONFIGURATION:

   The obvious export would be the lantern's config block - width, depth, pitch,
   bar spacing - and a Ruby importer that solves it. That would be a second
   geometry brain, in a second language, that has to agree with the first one
   forever. It would not.

   So the payload carries fully resolved vertices instead. Every mitre, every
   plumb cut, every eaves extension is already applied by the time it reaches
   the file, and the importer's whole job is to turn point lists into faces. A
   change to how a hip meets a ridge lands in the solver, flows through the 3D
   viewport and the exported model together, and needs no plugin update at all.

   ---------------------------------------------------------------------------

   THE DOCUMENT:

   {
       Meta       : schema stamp, generator, units, coordinate space
       Project    : code, name, client, revision - for the SketchUp model info
       Lantern    : identity and the headline dimensions, for reference
       Model      : {
           RootGroupName,
           Tags        : [ { Key, Name, ColorRgb, Visible, ElementType } ],
           Materials   : [ { Key, Name, ColorRgb, Alpha } ],
           Definitions : [ { Key, Name, Vertices, Faces } ],
           Assemblies  : [ { Key, Name, SortOrder, Parts : [ ... ] } ]
       },
       Summary    : part counts and warnings, so a failed import can be read
                    against what the exporter thought it was sending
   }

   ============================================================================= */

// =============================================================================
// REGION | SketchUp Export Payload Builder Module
// =============================================================================

const VghLantern__SketchUpExport__PayloadBuilder = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Config Section Keys
    // ------------------------------------------------------------
    const PAYLOAD_CONFIG_KEY     =  'VghLantern__SketchUpExport__Config__Payload';
    const BUILD_CONFIG_KEY       =  'VghLantern__SketchUpExport__Config__Build';
    const ASSEMBLIES_CONFIG_KEY  =  'VghLantern__SketchUpExport__Config__Assemblies';
    const APPLICATION_CONFIG_KEY =  'VghLantern__Application__Config';
    const PAYLOAD_LABEL          =  'Na__SketchUpExport__Config.json -> VghLantern__SketchUpExport__Config__Payload';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Project and Lantern Field Names
    // ------------------------------------------------------------
    const PROJECT_METADATA_BLOCK  =  'VghLantern__ProjectFile__Metadata';
    const LANTERN_IDENTITY_BLOCK  =  'Lantern__Identity__Config';
    const LANTERN_FORM_BLOCK      =  'Lantern__Form__Config';
    const LANTERN_FINISH_BLOCK    =  'Lantern__FinishAndGlazing__Config';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Assembly Keys
    // ------------------------------------------------------------
    const ASSEMBLY_BASE       =  'baseAssembly';
    const ASSEMBLY_ROOF       =  'roofFrame';
    const ASSEMBLY_BARS       =  'glazeBars';
    const ASSEMBLY_GLAZING    =  'glazing';
    const ASSEMBLY_JOINERY    =  'interiorJoinery';
    const ASSEMBLY_COMPONENTS =  'components';
    const ASSEMBLY_SETTING_OUT =  'settingOut';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read One Config Block by Key
    // ------------------------------------------------------------
    function VghLantern__PayloadBuilder__ConfigBlock(blockKey) {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return null;

        var appConfig  =  StateManager.VghLantern__StateManager__GetAppConfig();
        if (!appConfig) return null;

        return appConfig[blockKey] || null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read One Payload Config String
    // ------------------------------------------------------------
    function VghLantern__PayloadBuilder__PayloadString(key) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        return ConfigLoader.VghLantern__ConfigLoader__RequireString(
            VghLantern__PayloadBuilder__ConfigBlock(PAYLOAD_CONFIG_KEY) || {}, key, PAYLOAD_LABEL);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether One Build Switch Is On
    // ------------------------------------------------------------
    // Absent reads as on. A switch that has to be present to enable an assembly
    // would mean a config file predating this feature silently exports an empty
    // lantern, which is a worse failure than one extra assembly nobody wanted.
    function VghLantern__PayloadBuilder__BuildSwitch(key) {
        var build  =  VghLantern__PayloadBuilder__ConfigBlock(BUILD_CONFIG_KEY) || {};
        return build[key] !== false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Payload Assembly
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Complete SketchUp Payload for the Current Lantern
    // ------------------------------------------------------------
    // Reads its inputs from the StateManager rather than taking them as
    // arguments, because the exported lantern is by definition the one on
    // screen and passing it in would open the door to exporting a different one.
    //
    // @return  Promise resolving to { Ok, Payload, Filename, Message }
    async function VghLantern__SketchUpExport__PayloadBuilder__Build() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return VghLantern__PayloadBuilder__Failure('The application state manager is not available.');

        var project   =  StateManager.VghLantern__StateManager__GetCurrentProject();
        var lantern   =  StateManager.VghLantern__StateManager__GetCurrentLantern();
        var skeleton  =  StateManager.VghLantern__StateManager__GetSolvedSkeleton();
        var barSet    =  StateManager.VghLantern__StateManager__GetSolvedBarSet();

        if (!lantern)  return VghLantern__PayloadBuilder__Failure('No lantern is open.');
        if (!skeleton) return VghLantern__PayloadBuilder__Failure('The lantern has not solved yet.');

        var Factory    =  window.VghLantern__SketchUpExport__PartFactory;
        var BaseRoof   =  window.VghLantern__SketchUpExport__Encoders__BaseAndRoof;
        var Bars       =  window.VghLantern__SketchUpExport__Encoders__GlazeBars;
        var Fittings   =  window.VghLantern__SketchUpExport__Encoders__JoineryAndComponents;
        var SettingOut =  window.VghLantern__SketchUpExport__Encoders__SettingOut;
        var RidgeHips  =  window.VghLantern__SketchUpExport__Encoders__RidgeAndHips;
        if (!Factory || !BaseRoof || !Bars || !Fittings || !SettingOut || !RidgeHips) {
            return VghLantern__PayloadBuilder__Failure('One or more SketchUp export modules failed to load.');
        }

        var warnings    =  [];
        var assemblies  =  [];
        var definitions =  [];
        var extraTags   =  [];
        var parts;

        // BASE ASSEMBLY | Builders upstand then the three part base frame
        parts  =  [];
        if (VghLantern__PayloadBuilder__BuildSwitch('IncludeBuildersUpstand')) {
            parts  =  parts.concat(BaseRoof.VghLantern__SketchUpExport__Encoders__BuildersUpstand(skeleton));
        }
        if (VghLantern__PayloadBuilder__BuildSwitch('IncludeBaseFrame')) {
            parts  =  parts.concat(await BaseRoof.VghLantern__SketchUpExport__Encoders__BaseFrame(skeleton, lantern));
        }
        VghLantern__PayloadBuilder__PushAssembly(assemblies, ASSEMBLY_BASE, parts, warnings);

        // ROOF FRAME | The multi part ridge and hips, the block they die into,
        // and the vergeboard the old single section encoder still owns.
        //
        // The ridge and hip encoder answers { Definitions, Parts } rather than a
        // bare list, because the octagonal block is a placed mesh and travels
        // with its own definition - the same shape the components encoder uses,
        // merged into the same table.
        parts  =  [];
        if (VghLantern__PayloadBuilder__BuildSwitch('IncludeRoofFrame')) {
            var roofResult  =  await RidgeHips.VghLantern__SketchUpExport__Encoders__RidgeAndHips(skeleton, lantern, warnings);
            definitions     =  definitions.concat(roofResult.Definitions);
            parts           =  parts.concat(roofResult.Parts);
            parts           =  parts.concat(await BaseRoof.VghLantern__SketchUpExport__Encoders__RoofFrame(skeleton, lantern));
        }
        VghLantern__PayloadBuilder__PushAssembly(assemblies, ASSEMBLY_ROOF, parts, warnings);

        // GLAZE BARS | Cap, core and trim on every solved bar datum
        parts  =  (VghLantern__PayloadBuilder__BuildSwitch('IncludeGlazeBars') && barSet)
            ? await Bars.VghLantern__SketchUpExport__Encoders__GlazeBars(barSet, lantern)
            : [];
        VghLantern__PayloadBuilder__PushAssembly(assemblies, ASSEMBLY_BARS, parts, warnings);

        // GLAZING | One sealed unit slab per solved slope
        parts  =  VghLantern__PayloadBuilder__BuildSwitch('IncludeGlazing')
            ? BaseRoof.VghLantern__SketchUpExport__Encoders__Glazing(skeleton)
            : [];
        VghLantern__PayloadBuilder__PushAssembly(assemblies, ASSEMBLY_GLAZING, parts, warnings);

        // INTERIOR JOINERY | Packer, cornice and eaves trim around the datum ring
        parts  =  VghLantern__PayloadBuilder__BuildSwitch('IncludeInteriorJoinery')
            ? await Fittings.VghLantern__SketchUpExport__Encoders__InteriorJoinery(skeleton, lantern)
            : [];
        VghLantern__PayloadBuilder__PushAssembly(assemblies, ASSEMBLY_JOINERY, parts, warnings);

        // COMPONENTS | Finial definitions and their placed instances
        if (VghLantern__PayloadBuilder__BuildSwitch('IncludeComponents')) {
            var componentResult  =  await Fittings.VghLantern__SketchUpExport__Encoders__Components(skeleton, lantern);
            definitions          =  definitions.concat(componentResult.Definitions);   // <-- Concat, not assign: the ridge block already put one here
            VghLantern__PayloadBuilder__PushAssembly(assemblies, ASSEMBLY_COMPONENTS, componentResult.Parts, warnings);
        } else {
            VghLantern__PayloadBuilder__PushAssembly(assemblies, ASSEMBLY_COMPONENTS, [], warnings);
        }

        // SETTING OUT | Datums, derivation triangles and member centrelines
        // Encoded unconditionally: the importer chooses whether to build it, so
        // one exported file serves a modeller who wants the metal and a checker
        // who wants the construction geometry over an existing model.
        var setOutResult  =  SettingOut.VghLantern__SketchUpExport__Encoders__SettingOut(skeleton, barSet, lantern);
        extraTags         =  setOutResult.Tags;
        warnings          =  warnings.concat(setOutResult.Warnings);
        VghLantern__PayloadBuilder__PushAssembly(
            assemblies, ASSEMBLY_SETTING_OUT, setOutResult.Parts, warnings, setOutResult.Checks);

        if (Array.isArray(skeleton.Meta && skeleton.Meta.Warnings)) {
            warnings  =  warnings.concat(skeleton.Meta.Warnings);             // <-- The solver's own reservations travel with the file
        }
        if (barSet && Array.isArray(barSet.Warnings)) {
            warnings  =  warnings.concat(barSet.Warnings);
        }

        var payload  =  {
            Meta    : VghLantern__PayloadBuilder__MetaBlock(),
            Project : VghLantern__PayloadBuilder__ProjectBlock(project),
            Lantern : VghLantern__PayloadBuilder__LanternBlock(lantern, skeleton, barSet),
            Model   : {
                RootGroupName : VghLantern__PayloadBuilder__RootGroupName(project, lantern),
                Options       : VghLantern__PayloadBuilder__OptionsBlock(),
                Tags          : Factory.VghLantern__SketchUpExport__PartFactory__TagTable().concat(extraTags),
                Materials     : VghLantern__PayloadBuilder__MaterialTable(lantern, Factory, Fittings, Bars, RidgeHips),
                Definitions   : definitions,
                Assemblies    : assemblies
            },
            Summary : VghLantern__PayloadBuilder__SummaryBlock(assemblies, definitions, warnings)
        };

        return {
            Ok       : true,
            Payload  : payload,
            Filename : VghLantern__PayloadBuilder__Filename(project, lantern),
            Message  : ''
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Append One Assembly, Carrying Its Config Presentation
    // ------------------------------------------------------------
    // An assembly with no parts is still emitted. An empty group in the
    // outliner is a visible statement that the lantern has no interior joinery;
    // an absent one is indistinguishable from an exporter that forgot.
    //
    // Role travels from the config onto the assembly because the importer reads
    // it: an assembly whose Role is settingOut is construction linework, and is
    // built or skipped by a different choice from the metal.
    //
    // @param attributes  Optional block stamped onto the assembly group
    function VghLantern__PayloadBuilder__PushAssembly(assemblies, assemblyKey, parts, warnings, attributes) {
        var declared  =  VghLantern__PayloadBuilder__ConfigBlock(ASSEMBLIES_CONFIG_KEY) || [];
        var Factory   =  window.VghLantern__SketchUpExport__PartFactory;
        var entry     =  null;
        var i;

        for (i = 0; i < declared.length; i++) {
            if (declared[i].Key === assemblyKey) { entry = declared[i]; break; }
        }

        if (!entry) {
            warnings.push('Assembly "' + assemblyKey + '" is not declared in the export config; its parts were dropped.');
            return;
        }

        var assembly  =  Factory.VghLantern__SketchUpExport__PartFactory__Assembly(
            entry.Key, entry.Name, entry.SortOrder);

        assembly.Role   =  entry.Role || 'model';
        assembly.Parts  =  Array.isArray(parts) ? parts : [];
        if (attributes) assembly.Attributes = attributes;

        assemblies.push(assembly);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Header Blocks
// -----------------------------------------------------------------------------

    // SUB FUNCTION | The Schema and Provenance Stamp
    // ------------------------------------------------------------
    function VghLantern__PayloadBuilder__MetaBlock() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        var application   =  VghLantern__PayloadBuilder__ConfigBlock(APPLICATION_CONFIG_KEY) || {};
        var currentUser   =  StateManager.VghLantern__StateManager__GetCurrentUser
            ? StateManager.VghLantern__StateManager__GetCurrentUser()
            : null;
        var now           =  new Date();

        return {
            Schema            : VghLantern__PayloadBuilder__PayloadString('SchemaName'),
            SchemaVersion     : VghLantern__PayloadBuilder__PayloadString('SchemaVersion'),
            Generator         : 'VghLantern__SketchUpExport__PayloadBuilder',
            AppVersion        : application['VghLantern__Application__Config__AppVersion'] || 'unknown',
            ExportedBy        : (currentUser && currentUser.UserName) || '',
            ExportedAtIso     : now.toISOString(),
            ExportedAtLocal   : now.toString(),
            Units             : VghLantern__PayloadBuilder__PayloadString('Units'),
            CoordinateSpace   : VghLantern__PayloadBuilder__PayloadString('CoordinateSpace'),
            CoordinateOrder   : 'x, y, z',
            ImporterNote      : 'Load with the Vale Lantern Importer in SketchUp. Coordinates are millimetres and are converted to SketchUp inches on import; nothing in this file is in inches.'
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Import Options the Payload Asks For
    // ------------------------------------------------------------
    // Carried in the file rather than configured in the plugin, so a decision
    // about how a model should be built travels with the model it applies to
    // and one SketchUp install can take files from two different app versions
    // without either one being wrong.
    function VghLantern__PayloadBuilder__OptionsBlock() {
        var build  =  VghLantern__PayloadBuilder__ConfigBlock(BUILD_CONFIG_KEY) || {};

        return {
            OrientSolidsOutward        : build.OrientSolidsOutward !== false,
            MergeCoplanarFaces         : build.MergeCoplanarFaces !== false,
            SetModelUnitsToMillimetres : build.SetModelUnitsToMillimetres === true,
            PurgeUnusedBeforeImport    : build.PurgeUnusedBeforeImport === true
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Project Identity Block
    // ------------------------------------------------------------
    function VghLantern__PayloadBuilder__ProjectBlock(project) {
        var metadata  =  (project && project[PROJECT_METADATA_BLOCK]) || {};

        return {
            Code         : metadata['VghLantern__ProjectFile__Metadata__ProjectCode']   || '',
            Name         : metadata['VghLantern__ProjectFile__Metadata__ProjectName']   || '',
            DocumentName : metadata['VghLantern__ProjectFile__Metadata__DocumentName']  || '',
            ClientName   : metadata['VghLantern__ProjectFile__Metadata__ClientName']    || '',
            SiteAddress  : metadata['VghLantern__ProjectFile__Metadata__SiteAddress']   || '',
            RevisionCode : metadata['VghLantern__ProjectFile__Metadata__RevisionCode']  || ''
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Lantern Identity and Headline Geometry Block
    // ------------------------------------------------------------
    // Reported rather than used: the importer builds from the vertex lists and
    // never from these numbers. They are here so a file found on its own can be
    // identified without opening SketchUp.
    function VghLantern__PayloadBuilder__LanternBlock(lantern, skeleton, barSet) {
        var identity  =  lantern[LANTERN_IDENTITY_BLOCK] || {};
        var form      =  lantern[LANTERN_FORM_BLOCK]     || {};
        var finish    =  lantern[LANTERN_FINISH_BLOCK]   || {};
        var meta      =  skeleton.Meta || {};

        return {
            Id                : identity['Lantern__Identity__Config__Id']        || '',
            Title             : identity['Lantern__Identity__Config__Title']     || '',
            Reference         : identity['Lantern__Identity__Config__Reference'] || '',
            Quantity          : identity['Lantern__Identity__Config__Quantity']  || 1,
            RoofForm          : form['Lantern__Form__Config__RoofForm']          || meta.RoofForm || '',
            FrameFinish       : finish['Lantern__FinishAndGlazing__Config__FrameFinish']  || '',
            GlazingSpec       : finish['Lantern__FinishAndGlazing__Config__GlazingSpec']  || '',
            WidthMm           : meta.WidthMm,
            DepthMm           : meta.DepthMm,
            PitchDegrees      : meta.PitchDegrees,
            OverallHeightMm   : meta.OverallHeightMm,
            UpstandTopLevelMm : meta.UpstandTopLevelMm,
            EavesLevelMm      : meta.EavesLevelMm,
            RidgeLevelMm      : meta.RidgeLevelMm,
            LongAxis          : meta.LongAxis,
            IsValid           : meta.IsValid !== false,
            GlazeBarCount     : (barSet && Array.isArray(barSet.Bars)) ? barSet.Bars.length : 0
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Material Table With This Lantern's Two Finishes Added
    // ------------------------------------------------------------
    function VghLantern__PayloadBuilder__MaterialTable(lantern, Factory, Fittings, Bars, RidgeHips) {
        var materials  =  Factory.VghLantern__SketchUpExport__PartFactory__MaterialTable();
        var barFinish  =  Bars.VghLantern__SketchUpExport__Encoders__GlazeBars__Finishes(lantern);
        var joinery    =  Fittings.VghLantern__SketchUpExport__Encoders__JoineryFinish(lantern);

        var frameSwatch    =  Factory.VghLantern__SketchUpExport__PartFactory__FinishMaterial('frame', barFinish.Cap);
        var joinerySwatch  =  Factory.VghLantern__SketchUpExport__PartFactory__FinishMaterial('joinery', joinery || barFinish.Trim);

        if (frameSwatch)   materials.push(frameSwatch);
        if (joinerySwatch) materials.push(joinerySwatch);

        // THE RIDGE CAPPING | Its own material KEY, sharing the frame finish's
        // naming. Where the two agree both keys resolve to one SketchUp material
        // name and the importer reuses a single swatch; where a lantern has
        // diverged the capping the names differ and two are created. Neither case
        // needs anybody to test whether they match.
        if (RidgeHips) {
            var ridgeFinish   =  RidgeHips.VghLantern__SketchUpExport__Encoders__RidgeAndHips__Finishes(lantern);
            var cappingSwatch =  Factory.VghLantern__SketchUpExport__PartFactory__FinishMaterial(
                'frame', ridgeFinish.Capping, VghLantern__PayloadBuilder__RidgeCappingKey());
            if (cappingSwatch) materials.push(cappingSwatch);
        }

        return materials;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Material Key the Ridge Capping Is Written Against
    // ------------------------------------------------------------
    function VghLantern__PayloadBuilder__RidgeCappingKey() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        var config        =  StateManager ? StateManager.VghLantern__StateManager__GetAppConfig() : null;
        var block         =  config ? config['VghLantern__SketchUpExport__Config__FinishMaterials'] : null;

        return (block && block.RidgeCappingFinishKey) ? block.RidgeCappingFinishKey : 'ridgeCappingFinish';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Part Counts and Warnings for the Foot of the File
    // ------------------------------------------------------------
    function VghLantern__PayloadBuilder__SummaryBlock(assemblies, definitions, warnings) {
        var counts  =  {};
        var total   =  0;
        var i;

        for (i = 0; i < assemblies.length; i++) {
            counts[assemblies[i].Key]  =  assemblies[i].Parts.length;
            total  +=  assemblies[i].Parts.length;
        }

        return {
            PartCountsByAssembly : counts,
            TotalPartCount       : total,
            DefinitionCount      : definitions.length,
            Warnings             : warnings
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Naming
// -----------------------------------------------------------------------------

    // SUB FUNCTION | The Name of the Single Top Level Group
    // ------------------------------------------------------------
    function VghLantern__PayloadBuilder__RootGroupName(project, lantern) {
        var build     =  VghLantern__PayloadBuilder__ConfigBlock(BUILD_CONFIG_KEY) || {};
        var template  =  build.RootGroupNameTemplate || 'ValeLantern';

        return VghLantern__PayloadBuilder__Substitute(template, project, lantern);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Download Filename for This Lantern
    // ------------------------------------------------------------
    function VghLantern__PayloadBuilder__Filename(project, lantern) {
        return VghLantern__PayloadBuilder__Substitute(
            VghLantern__PayloadBuilder__PayloadString('FilenameTemplate'), project, lantern);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Substitute the Naming Tokens Into a Template
    // ------------------------------------------------------------
    function VghLantern__PayloadBuilder__Substitute(template, project, lantern) {
        var Factory     =  window.VghLantern__SketchUpExport__PartFactory;
        var DateHelper  =  window.VghLantern__AppUtils__DateFormatter;
        var metadata    =  (project && project[PROJECT_METADATA_BLOCK]) || {};
        var identity    =  lantern[LANTERN_IDENTITY_BLOCK] || {};

        var dateStamp   =  (DateHelper && DateHelper.VghLantern__DateFormatter__FormatIso)
            ? DateHelper.VghLantern__DateFormatter__FormatIso(new Date())
            : new Date().toISOString().substring(0, 10);

        var tokens  =  {
            ProjectCode      : metadata['VghLantern__ProjectFile__Metadata__ProjectCode'] || 'NoCode',
            ProjectName      : metadata['VghLantern__ProjectFile__Metadata__ProjectName'] || 'Untitled',
            LanternTitle     : identity['Lantern__Identity__Config__Title']     || 'Lantern',
            LanternReference : identity['Lantern__Identity__Config__Reference'] || '',
            DateStamp        : dateStamp
        };

        var key  =  '';
        for (key in tokens) {
            if (!Object.prototype.hasOwnProperty.call(tokens, key)) continue;
            template  =  template.split('{' + key + '}').join(
                Factory.VghLantern__SketchUpExport__PartFactory__SafeName(tokens[key]));
        }
        return template;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Failure Result the Caller Can Report Verbatim
    // ------------------------------------------------------------
    function VghLantern__PayloadBuilder__Failure(message) {
        console.warn('[VghLantern SketchUpExport] ' + message);
        return { Ok: false, Payload: null, Filename: '', Message: message };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__SketchUpExport__PayloadBuilder__Build : VghLantern__SketchUpExport__PayloadBuilder__Build
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__SketchUpExport__PayloadBuilder  =  VghLantern__SketchUpExport__PayloadBuilder;
