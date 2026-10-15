/* =============================================================================
   VGHLANTERN - SKETCHUP EXPORT | ENCODERS - SETTING OUT
   =============================================================================

   FILE       : VghLantern__SketchUpExport__Encoders__SettingOut__.js
   NAMESPACE  : VghLantern
   MODULE     : SketchUpExport - Encoders SettingOut
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Encode the datums, construction triangles and centrelines
   CREATED    : 11-Aug-2026

   DESCRIPTION:
   - The fourth consumer of VghLantern__Geometry__SettingOutModel, alongside the
     3D setting out view and its legend. Draws nothing and derives nothing: the
     model publishes real solved vertices and this file writes them out.
   - Everything the SETTING OUT display mode shows in the 3D viewport travels
     into the payload here, so the construction linework in SketchUp is the same
     linework the reviewer approved on screen.

   ---------------------------------------------------------------------------

   THE THREE CLASSES, AND WHAT EACH BECOMES

       Datum         A named LEVEL or PLANE the factory cuts and sets to.
                     Outlines become closed rings, RunLines open segments and
                     Planes closed sloped rings. Top of builders upstand, top of
                     head beam, eaves, ridge, roof deck, glazing plane.

       Construction  The DERIVATION triangles - run, rise and hypotenuse. These
                     are not manufactured. They are how a datum's position is
                     arrived at, and the thing to look at when a datum is wrong,
                     so each one becomes a closed triangle carrying its own
                     measured run, rise, hypotenuse and pitch as attributes.

       Centreline    A member AXIS, exactly as the solver placed it. Construction
                     geometry positions a centreline and a swept profile then
                     registers to it, so a bar sitting off its centreline in
                     SketchUp is visible without measuring anything.

   ---------------------------------------------------------------------------

   WHERE THE COLOURS AND DASHES COME FROM

   Not from this module and not from the export config. Each entity's style key
   is its own Class__Family - Datum__Ridge, Construction__Hip - and that key is
   looked up in VghLantern__Env3d__Config__SetOut.LineStyles, which is the block
   the 3D setting out view already draws from and the legend already labels from.

   So the tag colours in SketchUp, the line colours in the viewport and the swatches
   in the legend are one decision in one file. Recolour the eaves datum there and
   all three move together; there is no second palette to forget.

   ---------------------------------------------------------------------------

   WHY THE CHECKS TRAVEL TOO

   The setting out model publishes its own datum checks - measured against what
   the solver reported, with a delta and a tolerance. Those are stamped onto the
   setting out group, so a SketchUp file found six months later still says whether
   the sixteen checks agreed at the moment it was exported. A model that cannot
   answer that is a model somebody has to re-derive to trust.

   ============================================================================= */

// =============================================================================
// REGION | SketchUp Export Setting Out Encoders Module
// =============================================================================

const VghLantern__SketchUpExport__Encoders__SettingOut = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Config Section Keys
    // ------------------------------------------------------------
    const SETOUT_CONFIG_KEY   =  'VghLantern__SketchUpExport__Config__SettingOut';
    const ENV3D_CONFIG_KEY    =  'VghLantern__Env3d__Config';
    const ENV3D_SETOUT_KEY    =  'VghLantern__Env3d__Config__SetOut';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Fallback Style for an Unstyled Class
    // ------------------------------------------------------------
    // Matches the 3D builder's own missing-style behaviour: a loud magenta that
    // belongs to nothing, so an entity family added to the model without a style
    // is visible as an omission rather than passing as a datum.
    const MISSING_STYLE_COLOUR   =  '#ff00ff';
    const MISSING_STYLE_PATTERN  =  'solid';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read One Config Block by Key
    // ------------------------------------------------------------
    function VghLantern__EncodersSettingOut__ConfigBlock(blockKey) {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return null;

        var appConfig  =  StateManager.VghLantern__StateManager__GetAppConfig();
        if (!appConfig) return null;

        return appConfig[blockKey] || null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Setting Out Export Settings
    // ------------------------------------------------------------
    function VghLantern__EncodersSettingOut__Settings() {
        return VghLantern__EncodersSettingOut__ConfigBlock(SETOUT_CONFIG_KEY) || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The 3D Line Style Table, Keyed by Class__Family
    // ------------------------------------------------------------
    // The SSOT for setting out appearance. Read live rather than mirrored, so a
    // style added to the 3D config needs no edit here at all.
    function VghLantern__EncodersSettingOut__LineStyles() {
        var env3dRoot  =  VghLantern__EncodersSettingOut__ConfigBlock(ENV3D_CONFIG_KEY) || {};
        var setOut     =  env3dRoot[ENV3D_SETOUT_KEY] || {};
        return setOut.LineStyles || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Style Record for One Entity
    // ------------------------------------------------------------
    function VghLantern__EncodersSettingOut__StyleFor(styleKey) {
        var styles  =  VghLantern__EncodersSettingOut__LineStyles();
        var style   =  styles[styleKey];

        if (!style) {
            console.warn('[VghLantern SketchUpExport] No setting out line style for "' + styleKey +
                '". Add it to Na__Env3d__Config.json -> VghLantern__Env3d__Config__SetOut -> LineStyles.');
            return { Colour: MISSING_STYLE_COLOUR, Pattern: MISSING_STYLE_PATTERN, Label: styleKey };
        }
        return style;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Style Key an Entity Belongs To
    // ------------------------------------------------------------
    // Class__Family, exactly as VghLantern__Env3d__SetOut__LineFactory resolves
    // it. Two modules asking the same question the same way is what keeps the
    // SketchUp tags and the viewport colours in step.
    function VghLantern__EncodersSettingOut__StyleKey(entity) {
        if (!entity) return '';
        return String(entity.Class) + '__' + String(entity.Family);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Setting Out Encoder
// -----------------------------------------------------------------------------

    // FUNCTION | Encode the Whole Setting Out Model as Tagged Linework
    // ------------------------------------------------------------
    // Returns the parts AND the tags they need, because a setting out tag exists
    // only because an entity of that class was found. Declaring the fourteen
    // possible tags up front would leave a lantern with no transoms carrying an
    // empty transom tag, which is a tag list nobody can read.
    //
    // @param skeleton  SolvedSkeleton
    // @param barSet    GlazeBarSet
    // @param lantern   The lantern config block
    // @return          { Parts, Tags, Checks, Warnings }
    function VghLantern__SketchUpExport__Encoders__SettingOut(skeleton, barSet, lantern) {
        var Model    =  window.VghLantern__Geometry__SettingOutModel;
        var Factory  =  window.VghLantern__SketchUpExport__PartFactory;
        var empty    =  { Parts: [], Tags: [], Checks: [], Warnings: [] };
        if (!skeleton || !Model || !Factory) return empty;

        var settings  =  VghLantern__EncodersSettingOut__Settings();
        var setOut;

        try {
            setOut  =  Model.VghLantern__SettingOutModel__Build(skeleton, barSet, lantern);
        } catch (buildError) {
            console.warn('[VghLantern SketchUpExport] Setting out model could not be built:', buildError);
            return empty;
        }
        if (!setOut) return empty;

        var parts     =  [];
        var tagsSeen  =  {};

        if (settings.IncludeDatums !== false) {
            VghLantern__EncodersSettingOut__EncodeDatums(setOut.Datums, parts, tagsSeen);
        }
        if (settings.IncludeTriangles !== false) {
            VghLantern__EncodersSettingOut__EncodeTriangles(setOut.Triangles, parts, tagsSeen);
        }
        if (settings.IncludeCentrelines !== false) {
            VghLantern__EncodersSettingOut__EncodeCentrelines(setOut.Centrelines, parts, tagsSeen);
        }

        return {
            Parts    : parts,
            Tags     : VghLantern__EncodersSettingOut__TagTable(tagsSeen),
            Checks   : (settings.IncludeChecks !== false) ? VghLantern__EncodersSettingOut__CheckBlock(setOut) : null,
            Warnings : Array.isArray(setOut.Warnings) ? setOut.Warnings : []
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Class Encoders
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Encode Every Datum's Outlines, Runs and Planes
    // ------------------------------------------------------------
    // A datum carries three kinds of geometry and may carry any combination of
    // them: the upstand has a ring, the ridge has a run line, the glazing has one
    // sloped plane per slope. All three land in one entity group, because they
    // are one datum however many pieces describe it.
    function VghLantern__EncodersSettingOut__EncodeDatums(datums, parts, tagsSeen) {
        if (!Array.isArray(datums)) return;

        var i, j, datum, polylines, record;

        for (i = 0; i < datums.length; i++) {
            datum      =  datums[i];
            if (!datum) continue;

            polylines  =  [];

            if (Array.isArray(datum.Outlines)) {
                for (j = 0; j < datum.Outlines.length; j++) {
                    VghLantern__EncodersSettingOut__PushPolyline(polylines, datum.Outlines[j], true);
                }
            }
            if (Array.isArray(datum.RunLines)) {
                for (j = 0; j < datum.RunLines.length; j++) {
                    VghLantern__EncodersSettingOut__PushPolyline(polylines, datum.RunLines[j], false);
                }
            }
            if (Array.isArray(datum.Planes)) {
                for (j = 0; j < datum.Planes.length; j++) {
                    VghLantern__EncodersSettingOut__PushPolyline(polylines, datum.Planes[j].Points, true);
                }
            }
            if (polylines.length === 0) continue;

            record  =  VghLantern__EncodersSettingOut__Record(datum, polylines, tagsSeen, {
                Label           : datum.Label || '',
                LevelMm         : datum.LevelMm,
                RelativeLevelMm : datum.RelativeLevelMm,
                RelativeMinMm   : datum.RelativeRangeMm ? datum.RelativeRangeMm.MinMm : null,
                RelativeMaxMm   : datum.RelativeRangeMm ? datum.RelativeRangeMm.MaxMm : null,
                ReportedFrom    : Array.isArray(datum.ReportedFrom) ? datum.ReportedFrom.join(', ') : ''
            });

            if (record) parts.push(record);
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Encode Every Construction Triangle as a Closed Leg Set
    // ------------------------------------------------------------
    // Foot to Corner is the plan RUN, Corner to Head is the vertical RISE, and
    // Head back to Foot is the HYPOTENUSE - the real member. Emitted as one
    // closed three point ring rather than three separate lines, because the
    // three legs are one derivation and selecting one leg of a triangle is never
    // what anybody wants.
    function VghLantern__EncodersSettingOut__EncodeTriangles(triangles, parts, tagsSeen) {
        if (!Array.isArray(triangles)) return;

        var i, triangle, corners, measured, reported, record;

        for (i = 0; i < triangles.length; i++) {
            triangle  =  triangles[i];
            if (!triangle || !triangle.Corners) continue;

            corners  =  triangle.Corners;
            if (!corners.Foot || !corners.Corner || !corners.Head) continue;

            measured  =  triangle.Measured || {};
            reported  =  triangle.Reported || {};

            record  =  VghLantern__EncodersSettingOut__Record(
                triangle,
                [ { Closed: true, Points: [ corners.Foot, corners.Corner, corners.Head ] } ],
                tagsSeen,
                {
                    Label              : triangle.Label || '',
                    MeasuredRunMm      : measured.RunMm,
                    MeasuredRiseMm     : measured.RiseMm,
                    MeasuredHypotMm    : measured.HypotenuseMm,
                    MeasuredPitchDeg   : measured.PitchDegrees,
                    ReportedRunMm      : reported.RunMm,
                    ReportedRiseMm     : reported.RiseMm,
                    ReportedHypotMm    : reported.HypotenuseMm,
                    ReportedPitchDeg   : reported.PitchDegrees
                });

            if (record) parts.push(record);
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Encode Every Centreline Set as Open Segments
    // ------------------------------------------------------------
    // One entity carries every segment of its family - forty glaze bar axes are
    // one Centreline__GlazeBar entity - so the forty segments land in one group
    // rather than forty, which is the granularity somebody switching centrelines
    // on and off actually wants.
    function VghLantern__EncodersSettingOut__EncodeCentrelines(centrelines, parts, tagsSeen) {
        if (!Array.isArray(centrelines)) return;

        var i, j, centreline, polylines, record;

        for (i = 0; i < centrelines.length; i++) {
            centreline  =  centrelines[i];
            if (!centreline || !Array.isArray(centreline.Segments)) continue;

            polylines  =  [];
            for (j = 0; j < centreline.Segments.length; j++) {
                VghLantern__EncodersSettingOut__PushPolyline(polylines, centreline.Segments[j], false);
            }
            if (polylines.length === 0) continue;

            record  =  VghLantern__EncodersSettingOut__Record(centreline, polylines, tagsSeen, {
                Label        : centreline.Label || '',
                MemberRole   : centreline.Role || '',
                SegmentCount : polylines.length
            });

            if (record) parts.push(record);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Record Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Append One Polyline, Rejecting Degenerate Runs
    // ------------------------------------------------------------
    function VghLantern__EncodersSettingOut__PushPolyline(polylines, points, isClosed) {
        if (!Array.isArray(points) || points.length < 2) return;
        polylines.push({ Closed: isClosed === true, Points: points });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build One Linework Part Record for an Entity
    // ------------------------------------------------------------
    // GroupKey nests the entity inside a group named for its style, so the
    // outliner reads as one group per line class with the individual datums and
    // triangles inside it. The importer creates those intermediate groups from
    // the data rather than from a list it carries.
    function VghLantern__EncodersSettingOut__Record(entity, polylines, tagsSeen, attributes) {
        var Factory   =  window.VghLantern__SketchUpExport__PartFactory;
        var settings  =  VghLantern__EncodersSettingOut__Settings();
        var styleKey  =  VghLantern__EncodersSettingOut__StyleKey(entity);
        var tagKey    =  (settings.TagKeyPrefix || 'setOut__') + styleKey;

        tagsSeen[styleKey]  =  true;

        attributes.SetOutClass   =  entity.Class  || '';
        attributes.SetOutFamily  =  entity.Family || '';
        attributes.SetOutKey     =  entity.Key    || '';

        return Factory.VghLantern__SketchUpExport__PartFactory__Linework(polylines, {
            Name        : entity.Key || styleKey,
            GroupKey    : (settings.GroupPerEntity === false) ? null : styleKey,
            GroupName   : styleKey,
            TagKey      : tagKey,
            StyleKey    : styleKey,                                           // <-- The importer's key into the Na__DataLib construction linework standard
            Attributes  : attributes
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Tag Table and Checks
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Tag Rows for the Styles Actually Used
    // ------------------------------------------------------------
    // Colour and dash come straight from the 3D setting out styles, so the tag
    // in SketchUp carries the same appearance as the line in the viewport and
    // the swatch in the legend.
    function VghLantern__EncodersSettingOut__TagTable(tagsSeen) {
        var Factory   =  window.VghLantern__SketchUpExport__PartFactory;
        var settings  =  VghLantern__EncodersSettingOut__Settings();
        var patterns  =  settings.PatternToLineStyle || {};
        var keyPrefix =  settings.TagKeyPrefix  || 'setOut__';
        var namePrefix=  settings.TagNamePrefix || 'VGH__SO__';
        var out       =  [];
        var styleKey, style;

        for (styleKey in tagsSeen) {
            if (!Object.prototype.hasOwnProperty.call(tagsSeen, styleKey)) continue;

            style  =  VghLantern__EncodersSettingOut__StyleFor(styleKey);

            out.push({
                Key         : keyPrefix + styleKey,
                StyleKey    : styleKey,                                       // <-- Looked up in the Na__DataLib standard, which wins where it answers
                Name        : namePrefix + styleKey,
                ColorRgb    : Factory.VghLantern__SketchUpExport__PartFactory__HexToRgb(style.Colour),
                Visible     : true,
                LineStyle   : patterns[style.Pattern] || '',
                ElementType : 'Setting Out',
                Label       : style.Label || styleKey
            });
        }

        out.sort(function(a, b) { return a.Name < b.Name ? -1 : (a.Name > b.Name ? 1 : 0); });
        return out;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Flatten the Datum Checks Into Stampable Attributes
    // ------------------------------------------------------------
    // A summary line plus one attribute per check. SketchUp attributes are flat,
    // so each check becomes "Check__<Key>" carrying its measured, reported and
    // delta in one readable string rather than three keys each.
    function VghLantern__EncodersSettingOut__CheckBlock(setOut) {
        var Model     =  window.VghLantern__Geometry__SettingOutModel;
        var checks    =  Array.isArray(setOut.Checks) ? setOut.Checks : [];
        var block     =  {};
        var summary   =  null;
        var i, check;

        if (Model && Model.VghLantern__SettingOutModel__CheckSummary) {
            summary  =  Model.VghLantern__SettingOutModel__CheckSummary(setOut);
        }

        var toleranceMm  =  (setOut.Meta && setOut.Meta.ToleranceMm) || 0;

        block.CheckCount      =  checks.length;
        block.CheckSummary    =  summary
            ? (summary.Passed + ' of ' + summary.Total + ' agree, within ' + toleranceMm + ' mm')
            : '';
        block.ChecksFailed    =  summary ? summary.Failed      : null;
        block.ChecksUnpublished = summary ? summary.Unpublished : null;
        block.AllChecksAgree  =  summary ? (summary.Failed === 0) : null;

        for (i = 0; i < checks.length; i++) {
            check  =  checks[i];
            if (!check || !check.Key) continue;

            block['Check__' + check.Key]  =  check.Status + ': measured '
                + VghLantern__EncodersSettingOut__Round(check.MeasuredMm) + ' mm, reported '
                + VghLantern__EncodersSettingOut__Round(check.ReportedMm) + ' mm, delta '
                + VghLantern__EncodersSettingOut__Round(check.DeltaMm) + ' mm';
        }

        return block;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Two Decimal Millimetres, or a Dash for Nothing
    // ------------------------------------------------------------
    function VghLantern__EncodersSettingOut__Round(value) {
        if (typeof value !== 'number' || isNaN(value)) return '-';
        return (Math.round(value * 100) / 100).toString();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__SketchUpExport__Encoders__SettingOut : VghLantern__SketchUpExport__Encoders__SettingOut
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__SketchUpExport__Encoders__SettingOut  =  VghLantern__SketchUpExport__Encoders__SettingOut;
