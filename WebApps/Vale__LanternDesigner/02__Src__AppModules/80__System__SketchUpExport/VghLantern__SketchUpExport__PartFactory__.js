/* =============================================================================
   VGHLANTERN - SKETCHUP EXPORT | PART FACTORY
   =============================================================================

   FILE       : VghLantern__SketchUpExport__PartFactory__.js
   NAMESPACE  : VghLantern
   MODULE     : SketchUpExport - PartFactory
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Stamp one prism or one instance into a payload part record
   CREATED    : 11-Aug-2026

   DESCRIPTION:
   - Every encoder produces the same two record shapes and none of them writes
     one by hand. This module owns the field names, the coordinate rounding, the
     part naming templates and the tag and material lookups, so a schema change
     is one edit here rather than six edits spread across the encoders.
   - Also owns the config-declared tag and material tables, because the payload
     header carries them verbatim and the encoders reference them by key.

   ---------------------------------------------------------------------------

   THE TWO PART KINDS:

       prism     Two rings of millimetre points plus the ring spans. Ring zero
                 is the outer loop; any further ring is a hole. Covers every
                 solid in the lantern.

       instance  A placed copy of a definition in the payload's Definitions
                 table, given as an origin and three axis vectors. Covers the
                 finials and anything else that arrives as a mesh rather than
                 as a section.

   ---------------------------------------------------------------------------

   WHY COORDINATES ARE ROUNDED:

   A solved lantern carries coordinates to full double precision, and writing
   them out costs about seventeen characters per number for digits nobody can
   measure. Rounded to the configured decimals a payload drops to roughly a
   third of its size with the last kept digit still a thousandth of a
   millimetre, which is well inside SketchUp's own tolerance. The rounding is
   applied once, here, on the way into the record - never on the way out - so
   two parts that shared a vertex in the solve still share it in the file.

   ============================================================================= */

// =============================================================================
// REGION | SketchUp Export Part Factory Module
// =============================================================================

const VghLantern__SketchUpExport__PartFactory = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Config Section Keys
    // ------------------------------------------------------------
    const PAYLOAD_CONFIG_KEY   =  'VghLantern__SketchUpExport__Config__Payload';
    const TAGS_CONFIG_KEY      =  'VghLantern__SketchUpExport__Config__Tags';
    const MATERIALS_CONFIG_KEY =  'VghLantern__SketchUpExport__Config__Materials';
    const FINISH_CONFIG_KEY    =  'VghLantern__SketchUpExport__Config__FinishMaterials';
    const NAMING_CONFIG_KEY    =  'VghLantern__SketchUpExport__Config__PartNaming';
    const PBR_CONFIG_KEY       =  'VghLantern__PbrMaterials__Config';
    const PAYLOAD_LABEL        =  'Na__SketchUpExport__Config.json -> VghLantern__SketchUpExport__Config__Payload';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Part Kind Keys
    // ------------------------------------------------------------
    const KIND_PRISM     =  'prism';
    const KIND_INSTANCE  =  'instance';
    const KIND_LINEWORK  =  'linework';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Finish Name Sanitisation
    // ------------------------------------------------------------
    const NAME_SAFE_PATTERN  =  /[^A-Za-z0-9\-_]+/g;                         // <-- SketchUp accepts more, but a clean name survives a round trip through a filename
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read One Config Block by Key
    // ------------------------------------------------------------
    function VghLantern__PartFactory__ConfigBlock(blockKey) {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return null;

        var appConfig  =  StateManager.VghLantern__StateManager__GetAppConfig();
        if (!appConfig) return null;

        return appConfig[blockKey] || null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Coordinate Decimals from the Payload Config
    // ------------------------------------------------------------
    function VghLantern__PartFactory__Decimals() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        return ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            VghLantern__PartFactory__ConfigBlock(PAYLOAD_CONFIG_KEY) || {}, 'CoordinateDecimals', PAYLOAD_LABEL);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Tag and Material Tables
// -----------------------------------------------------------------------------

    // FUNCTION | The Declared Tag Table, Ready for the Payload Header
    // ------------------------------------------------------------
    function VghLantern__SketchUpExport__PartFactory__TagTable() {
        var declared  =  VghLantern__PartFactory__ConfigBlock(TAGS_CONFIG_KEY);
        var out       =  [];
        var i, tag;

        if (!Array.isArray(declared)) {
            console.error('[VghLantern SketchUpExport] Tag table missing from ' + TAGS_CONFIG_KEY + '.');
            return out;
        }

        for (i = 0; i < declared.length; i++) {
            tag  =  declared[i];
            out.push({
                Key         : tag.Key,
                Name        : tag.Name,
                ColorRgb    : tag.ColorRgb,
                Visible     : tag.Visible !== false,
                ElementType : tag.ElementType || ''
            });
        }
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Element Type Declared Against One Tag Key
    // ------------------------------------------------------------
    // Stamped onto every group as an attribute so a downstream report can
    // filter on it without parsing tag names back apart.
    function VghLantern__SketchUpExport__PartFactory__ElementTypeFor(tagKey) {
        var declared  =  VghLantern__PartFactory__ConfigBlock(TAGS_CONFIG_KEY);
        var i;

        if (!Array.isArray(declared)) return '';

        for (i = 0; i < declared.length; i++) {
            if (declared[i].Key === tagKey) return declared[i].ElementType || '';
        }
        return '';
    }
    // ------------------------------------------------------------


    // FUNCTION | The Declared Material Table With Colours Resolved
    // ------------------------------------------------------------
    // Colour comes from the PBR role palette wherever that palette carries one,
    // so an imported lantern opens in the colours the 3D viewport shows. The
    // roles whose 3D appearance is a texture rather than a flat colour carry no
    // HexColor, and those fall back to the swatch declared alongside them.
    function VghLantern__SketchUpExport__PartFactory__MaterialTable() {
        var declared  =  VghLantern__PartFactory__ConfigBlock(MATERIALS_CONFIG_KEY);
        var palette   =  VghLantern__PartFactory__ConfigBlock(PBR_CONFIG_KEY);
        var roles     =  (palette && palette.VghLantern__PbrMaterials__Config__RoleMaterials) || {};
        var out       =  [];
        var i, entry, role, hex;

        if (!Array.isArray(declared)) {
            console.error('[VghLantern SketchUpExport] Material table missing from ' + MATERIALS_CONFIG_KEY + '.');
            return out;
        }

        for (i = 0; i < declared.length; i++) {
            entry  =  declared[i];
            role   =  roles[entry.PbrRole] || {};
            hex    =  (typeof role.HexColor === 'string' && role.HexColor.length > 0)
                ? role.HexColor
                : entry.FallbackHex;

            out.push({
                Key            : entry.Key,
                Name           : entry.Name,
                SsotMaterialId : entry.SsotMaterialId || null,                // <-- Importer swaps to the SSOT swatch where this is set
                ColorRgb       : VghLantern__SketchUpExport__PartFactory__HexToRgb(hex),
                Alpha          : (typeof role.Opacity === 'number') ? role.Opacity : entry.Alpha
            });
        }
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Per Lantern Finish Material, Appended to the Table
    // ------------------------------------------------------------
    // The powder coated cap finish and the joinery paint finish are decisions
    // the lantern carries rather than fixed role materials, so each one gets its
    // own named swatch. Naming it after the finish is what stops two lanterns
    // exported into one SketchUp model quietly sharing a colour.
    //
    // keyOverride names a THIRD consumer of the same palette. The ridge capping
    // follows the exterior finish exactly as the glaze bar cap does and may be
    // diverged from it, so it needs its own key while keeping the frame finish's
    // naming: where the two agree both keys land on one SketchUp material name
    // and the importer reuses a single swatch, and where they diverge the names
    // differ and two are created. That falls out of naming the material after the
    // finish, so no caller has to test whether they match.
    //
    // @param kind         'frame' or 'joinery' - which palette to resolve against
    // @param finishName   The finish as the lantern names it
    // @param keyOverride  Optional payload material key, defaulting to the kind's
    // @return             { Key, Name, ColorRgb, Alpha } or null
    function VghLantern__SketchUpExport__PartFactory__FinishMaterial(kind, finishName, keyOverride) {
        var settings  =  VghLantern__PartFactory__ConfigBlock(FINISH_CONFIG_KEY);
        if (!settings) return null;

        var palette   =  VghLantern__PartFactory__ConfigBlock(PBR_CONFIG_KEY) || {};
        var listKey   =  (kind === 'joinery')
            ? 'VghLantern__PbrMaterials__Config__JoineryFinishes'
            : 'VghLantern__PbrMaterials__Config__CapFinishes';
        var list      =  palette[listKey] || [];

        var prefix    =  (kind === 'joinery') ? settings.JoineryFinishPrefix : settings.FrameFinishPrefix;
        var keyBase   =  (kind === 'joinery') ? settings.JoineryFinishKey    : settings.FrameFinishKey;
        var resolved  =  settings.FallbackHex;
        var i;

        for (i = 0; i < list.length; i++) {
            if (list[i] && list[i].Name === finishName && list[i].HexColor) {
                resolved  =  list[i].HexColor;
                break;
            }
        }

        return {
            Key      : keyOverride || keyBase,
            Name     : prefix + VghLantern__SketchUpExport__PartFactory__SafeName(finishName || keyBase),
            ColorRgb : VghLantern__SketchUpExport__PartFactory__HexToRgb(resolved),
            Alpha    : 1.0,
            Finish   : finishName || ''
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert a Hex Colour String to an RGB Triple
    // ------------------------------------------------------------
    function VghLantern__SketchUpExport__PartFactory__HexToRgb(hexValue) {
        var hex  =  String(hexValue || '').replace('#', '');
        if (hex.length !== 6) return [128, 128, 128];

        return [
            parseInt(hex.substring(0, 2), 16),
            parseInt(hex.substring(2, 4), 16),
            parseInt(hex.substring(4, 6), 16)
        ];
    }
    // ------------------------------------------------------------


    // FUNCTION | Strip a String Down to Characters Safe in a Name
    // ------------------------------------------------------------
    function VghLantern__SketchUpExport__PartFactory__SafeName(value) {
        return String(value == null ? '' : value).trim().replace(NAME_SAFE_PATTERN, '_');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Part Naming
// -----------------------------------------------------------------------------

    // FUNCTION | Resolve a Part Name From Its Template and Tokens
    // ------------------------------------------------------------
    // Templates live in the config so the names in a SketchUp outliner can be
    // changed without touching an encoder. An unfilled token is left visible
    // rather than blanked, because a name reading HeadBeam__{Side} in the
    // outliner is a reported bug and a name reading HeadBeam__ is not.
    function VghLantern__SketchUpExport__PartFactory__Name(templateKey, tokens) {
        var naming    =  VghLantern__PartFactory__ConfigBlock(NAMING_CONFIG_KEY) || {};
        var template  =  naming[templateKey];
        var key;

        if (typeof template !== 'string' || template.length === 0) {
            console.error('[VghLantern SketchUpExport] Part name template "' + templateKey + '" missing from ' + NAMING_CONFIG_KEY + '.');
            return templateKey;
        }

        for (key in tokens) {
            if (!Object.prototype.hasOwnProperty.call(tokens, key)) continue;
            template  =  template.split('{' + key + '}').join(
                VghLantern__SketchUpExport__PartFactory__SafeName(tokens[key]));
        }
        return template;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Configured Datum Ring Side Names
    // ------------------------------------------------------------
    function VghLantern__SketchUpExport__PartFactory__SideNames() {
        var naming  =  VghLantern__PartFactory__ConfigBlock(NAMING_CONFIG_KEY) || {};
        var names   =  naming.SideNames;
        return Array.isArray(names) ? names : ['Side1', 'Side2', 'Side3', 'Side4'];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Record Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Round One Millimetre Value to the Payload Precision
    // ------------------------------------------------------------
    function VghLantern__PartFactory__Round(value, factor) {
        return Math.round((Number(value) || 0) * factor) / factor;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Flatten a Point List to Rounded Triples
    // ------------------------------------------------------------
    function VghLantern__PartFactory__Triples(points, factor) {
        var out  =  [];
        var i, p;

        for (i = 0; i < points.length; i++) {
            p  =  points[i];
            out.push([
                VghLantern__PartFactory__Round(p.x, factor),
                VghLantern__PartFactory__Round(p.y, factor),
                VghLantern__PartFactory__Round(p.z, factor)
            ]);
        }
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Prism Part Record From a Sweep Result
    // ------------------------------------------------------------
    // @param prism     Sweep result - Rings, PointsA, PointsB, LengthMm
    // @param options   { Name, TagKey, MaterialKey, Attributes }
    // @return          Part record, or null if the prism is unusable
    function VghLantern__SketchUpExport__PartFactory__Prism(prism, options) {
        if (!prism || !Array.isArray(prism.PointsA) || prism.PointsA.length < 3) return null;
        if (prism.PointsA.length !== prism.PointsB.length) {
            console.error('[VghLantern SketchUpExport] Prism ring lengths disagree for "' + options.Name + '".');
            return null;
        }

        var factor      =  Math.pow(10, VghLantern__PartFactory__Decimals());
        var attributes  =  options.Attributes || {};

        attributes.ElementType  =  attributes.ElementType
            || VghLantern__SketchUpExport__PartFactory__ElementTypeFor(options.TagKey);
        attributes.LengthMm     =  VghLantern__PartFactory__Round(prism.LengthMm, factor);

        return {
            Kind        : KIND_PRISM,
            Name        : options.Name,
            TagKey      : options.TagKey,
            MaterialKey : options.MaterialKey,
            Rings       : prism.Rings,
            PointsA     : VghLantern__PartFactory__Triples(prism.PointsA, factor),
            PointsB     : VghLantern__PartFactory__Triples(prism.PointsB, factor),
            Attributes  : attributes
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Component Instance Part Record
    // ------------------------------------------------------------
    // The transform is given as an origin plus three axis vectors rather than a
    // rotation angle, because a finial standing on a hip has no single angle
    // that describes it and SketchUp builds a transformation from axes directly.
    //
    // @param definitionKey  Key into the payload Definitions table
    // @param transform      { Origin, XAxis, YAxis, ZAxis, ScaleFactor }
    // @param options        { Name, TagKey, MaterialKey, Attributes }
    function VghLantern__SketchUpExport__PartFactory__Instance(definitionKey, transform, options) {
        if (!definitionKey || !transform || !transform.Origin) return null;

        var factor      =  Math.pow(10, VghLantern__PartFactory__Decimals());
        var attributes  =  options.Attributes || {};

        attributes.ElementType  =  attributes.ElementType
            || VghLantern__SketchUpExport__PartFactory__ElementTypeFor(options.TagKey);

        return {
            Kind          : KIND_INSTANCE,
            Name          : options.Name,
            TagKey        : options.TagKey,
            MaterialKey   : options.MaterialKey,
            DefinitionKey : definitionKey,
            Transform     : {
                Origin      : VghLantern__PartFactory__Triples([transform.Origin], factor)[0],
                XAxis       : VghLantern__PartFactory__Triples([transform.XAxis], factor)[0],
                YAxis       : VghLantern__PartFactory__Triples([transform.YAxis], factor)[0],
                ZAxis       : VghLantern__PartFactory__Triples([transform.ZAxis], factor)[0],
                ScaleFactor : (typeof transform.ScaleFactor === 'number') ? transform.ScaleFactor : 1.0
            },
            Attributes    : attributes
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Linework Part Record From a Set of Polylines
    // ------------------------------------------------------------
    // Construction geometry rather than a solid: edges, no faces, no material.
    // A material key is deliberately absent because an edge takes its colour
    // from its tag, which is where the setting out palette already lives.
    //
    // GroupKey is optional. Where it is present the importer nests this part
    // inside a lazily created group of that name, which is what turns forty
    // glaze bar centrelines into one collapsible entry in the outliner rather
    // than forty siblings.
    //
    // @param polylines  [ { Closed, Points : [ {x,y,z} ] } ]
    // @param options    { Name, GroupKey, GroupName, TagKey, Attributes }
    // @return           Part record, or null if nothing survived
    function VghLantern__SketchUpExport__PartFactory__Linework(polylines, options) {
        if (!Array.isArray(polylines) || polylines.length === 0) return null;

        var factor      =  Math.pow(10, VghLantern__PartFactory__Decimals());
        var attributes  =  options.Attributes || {};
        var encoded     =  [];
        var i, polyline;

        for (i = 0; i < polylines.length; i++) {
            polyline  =  polylines[i];
            if (!polyline || !Array.isArray(polyline.Points) || polyline.Points.length < 2) continue;

            encoded.push({
                Closed : polyline.Closed === true,
                Points : VghLantern__PartFactory__Triples(polyline.Points, factor)
            });
        }

        if (encoded.length === 0) return null;

        attributes.ElementType  =  attributes.ElementType
            || VghLantern__SketchUpExport__PartFactory__ElementTypeFor(options.TagKey)
            || 'Setting Out';

        return {
            Kind       : KIND_LINEWORK,
            Name       : options.Name,
            GroupKey   : options.GroupKey  || null,
            GroupName  : options.GroupName || options.GroupKey || null,
            TagKey     : options.TagKey,
            StyleKey   : options.StyleKey  || null,
            Polylines  : encoded,
            Attributes : attributes
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build an Assembly Shell Ready for Parts
    // ------------------------------------------------------------
    function VghLantern__SketchUpExport__PartFactory__Assembly(key, name, sortOrder) {
        return { Key: key, Name: name, SortOrder: sortOrder, Parts: [] };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__SketchUpExport__PartFactory__TagTable       : VghLantern__SketchUpExport__PartFactory__TagTable,
        VghLantern__SketchUpExport__PartFactory__MaterialTable  : VghLantern__SketchUpExport__PartFactory__MaterialTable,
        VghLantern__SketchUpExport__PartFactory__FinishMaterial : VghLantern__SketchUpExport__PartFactory__FinishMaterial,
        VghLantern__SketchUpExport__PartFactory__ElementTypeFor : VghLantern__SketchUpExport__PartFactory__ElementTypeFor,
        VghLantern__SketchUpExport__PartFactory__HexToRgb       : VghLantern__SketchUpExport__PartFactory__HexToRgb,
        VghLantern__SketchUpExport__PartFactory__SafeName       : VghLantern__SketchUpExport__PartFactory__SafeName,
        VghLantern__SketchUpExport__PartFactory__Name           : VghLantern__SketchUpExport__PartFactory__Name,
        VghLantern__SketchUpExport__PartFactory__SideNames      : VghLantern__SketchUpExport__PartFactory__SideNames,
        VghLantern__SketchUpExport__PartFactory__Prism          : VghLantern__SketchUpExport__PartFactory__Prism,
        VghLantern__SketchUpExport__PartFactory__Instance       : VghLantern__SketchUpExport__PartFactory__Instance,
        VghLantern__SketchUpExport__PartFactory__Linework       : VghLantern__SketchUpExport__PartFactory__Linework,
        VghLantern__SketchUpExport__PartFactory__Assembly       : VghLantern__SketchUpExport__PartFactory__Assembly
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__SketchUpExport__PartFactory  =  VghLantern__SketchUpExport__PartFactory;
