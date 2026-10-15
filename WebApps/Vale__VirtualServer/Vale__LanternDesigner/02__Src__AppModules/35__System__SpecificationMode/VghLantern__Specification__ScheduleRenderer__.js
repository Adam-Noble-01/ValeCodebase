/* =============================================================================
   VGHLANTERN - SPECIFICATION | SCHEDULE RENDERER
   =============================================================================

   FILE       : VghLantern__Specification__ScheduleRenderer__.js
   NAMESPACE  : VghLantern
   MODULE     : System - Specification - ScheduleRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Render the lantern schedule, finish schedule and document header
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Renders the parts of the specification that describe the lanterns rather than
     count them: the project header, the lantern schedule table and the finish and
     glazing schedule.
   - Quantity tables are the TakeoffTableRenderer's job; this module handles the
     descriptive sections and delegates table markup to it for consistency.

   -----------------------------------------------------------------------------

   WHY FINISH IS SCHEDULED PER LANTERN RATHER THAN PER PROJECT:
   Most jobs use one finish across every lantern, but a job with a different colour
   inside and out, or a mixed pair of lanterns, is common enough that a single
   project-level finish field would be quietly wrong. Scheduling it per lantern makes
   a mixed job explicit on the document.

   ============================================================================= */

// =============================================================================
// REGION | Specification Schedule Renderer Module
// =============================================================================

const VghLantern__Specification__ScheduleRenderer = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Class Names
    // ------------------------------------------------------------
    const CSS_HEADER        =  'VghLantern__Spec__Header';
    const CSS_HEADER_TITLE  =  'VghLantern__Spec__HeaderTitle';
    const CSS_HEADER_GRID   =  'VghLantern__Spec__HeaderGrid';
    const CSS_HEADER_FIELD  =  'VghLantern__Spec__HeaderField';
    const CSS_HEADER_LABEL  =  'VghLantern__Spec__HeaderLabel';
    const CSS_HEADER_VALUE  =  'VghLantern__Spec__HeaderValue';
    const CSS_TIMESTAMP     =  'VghLantern__Spec__HeaderTimestamp';

    const CSS_SUBHEADING    =  'VghLantern__Spec__SubHeading';
    const CSS_WARNING_LIST  =  'VghLantern__Spec__WarningList';
    const CSS_WARNING_ITEM  =  'VghLantern__Spec__WarningItem';

    const CSS_USER_WARNING_LIST  =  'VghLantern__Spec__UserWarningList';
    const CSS_USER_WARNING_ITEM  =  'VghLantern__Spec__UserWarningItem';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Finish Schedule Columns
    // ------------------------------------------------------------
    // Not config-driven, unlike the quantity tables: these fields ARE the finish
    // schedule, and a variable column set here would just be a way to omit one of
    // them by accident.
    //
    // The three finishes are three columns because they are three separate
    // decisions on the job sheet: the frame is painted joinery, the glaze bar cap
    // is powder coated and sits outside under the lead flashing, and the glaze bar
    // trim is what the room sees. A single "Finish" column would have to pick one
    // of them to print and silently drop the other two.
    //
    // The retired Colour Ref column was a free-standing RAL or BS reference the
    // user typed alongside the finish, which meant it could contradict it. Every
    // palette entry now carries its own reference, so the finish name is the
    // reference and there is nothing left for a separate column to say.
    const FINISH_COLUMNS  =  [
        { Key: 'Title',       Label: 'Lantern',      Align: 'left' },
        { Key: 'FrameFinish', Label: 'Frame Finish', Align: 'left' },
        { Key: 'CapFinish',   Label: 'Bar Cap',      Align: 'left' },
        { Key: 'TrimFinish',  Label: 'Bar Trim',     Align: 'left' },
        { Key: 'GlazingSpec', Label: 'Glazing',      Align: 'left' },
        { Key: 'GlazingTint', Label: 'Tint',         Align: 'left' }
    ];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Specification Config Root
    // ------------------------------------------------------------
    function VghLantern__ScheduleRenderer__SpecConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};
        return ConfigLoader.VghLantern__ConfigLoader__GetSection('Specification') || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape Text for Safe Markup Insertion
    // ------------------------------------------------------------
    function VghLantern__ScheduleRenderer__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build One Header Field Cell
    // ------------------------------------------------------------
    function VghLantern__ScheduleRenderer__HeaderField(label, value) {
        return '<div class="' + CSS_HEADER_FIELD + '">' +
               '<span class="' + CSS_HEADER_LABEL + '">' + VghLantern__ScheduleRenderer__Escape(label) + '</span>' +
               '<span class="' + CSS_HEADER_VALUE + '">' + VghLantern__ScheduleRenderer__Escape(value || '-') + '</span>' +
               '</div>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Document Header
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Specification Document Header
    // ------------------------------------------------------------
    function VghLantern__Specification__ScheduleRenderer__BuildHeader(documentModel) {
        if (!documentModel) return '';

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var DOC_LABEL  =  'Na__Specification__Config.json -> VghLantern__Specification__Config__Document';
        var docCfg  =  VghLantern__ScheduleRenderer__SpecConfig()['VghLantern__Specification__Config__Document'] || {};
        if (!ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(docCfg, 'ShowProjectHeader', DOC_LABEL)) return '';

        var meta  =  documentModel.Meta;
        var html  =  '<header class="' + CSS_HEADER + '">' +
                     '<h2 class="' + CSS_HEADER_TITLE + '">' + VghLantern__ScheduleRenderer__Escape(meta.DocumentTitle) + '</h2>' +
                     '<div class="' + CSS_HEADER_GRID + '">' +
                     VghLantern__ScheduleRenderer__HeaderField('Project',   meta.ProjectName) +
                     VghLantern__ScheduleRenderer__HeaderField('Code',      meta.ProjectCode) +
                     VghLantern__ScheduleRenderer__HeaderField('Client',    meta.ClientName) +
                     VghLantern__ScheduleRenderer__HeaderField('Site',      meta.SiteAddress) +
                     VghLantern__ScheduleRenderer__HeaderField('Revision',  meta.RevisionCode) +
                     VghLantern__ScheduleRenderer__HeaderField('Lanterns',  String(meta.LanternCount)) +
                     '</div>';

        if (ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(docCfg, 'ShowGeneratedTimestamp', DOC_LABEL)) {
            var DateFormatter  =  window.VghLantern__AppUtils__DateFormatter;
            var stamp          =  DateFormatter
                ? DateFormatter.VghLantern__DateFormatter__FormatShort(meta.GeneratedAt)
                : '';
            html  +=  '<p class="' + CSS_TIMESTAMP + '">Derived from model geometry on ' +
                      VghLantern__ScheduleRenderer__Escape(stamp) + '</p>';
        }

        return html + '</header>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Document Warning List
    // ------------------------------------------------------------
    function VghLantern__Specification__ScheduleRenderer__BuildWarnings(documentModel) {
        if (!documentModel || !documentModel.Warnings.length) return '';

        var html  =  '<ul class="' + CSS_WARNING_LIST + '">';
        var i;

        for (i = 0; i < documentModel.Warnings.length; i++) {
            html  +=  '<li class="' + CSS_WARNING_ITEM + '">' +
                      VghLantern__ScheduleRenderer__Escape(documentModel.Warnings[i]) + '</li>';
        }

        return html + '</ul>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Staff-Authored Document Warning List
    // ------------------------------------------------------------
    // Separate list and styling from BuildWarnings above: these are free text a
    // person wrote, not a rule the app evaluated, so they are shown in red ahead
    // of the rule-based (orange) warnings rather than merged into that list.
    function VghLantern__Specification__ScheduleRenderer__BuildUserWarnings(documentModel) {
        if (!documentModel || !documentModel.UserWarnings.length) return '';

        var html  =  '<ul class="' + CSS_USER_WARNING_LIST + '">';
        var i;

        for (i = 0; i < documentModel.UserWarnings.length; i++) {
            html  +=  '<li class="' + CSS_USER_WARNING_ITEM + '">' +
                      VghLantern__ScheduleRenderer__Escape(documentModel.UserWarnings[i]) + '</li>';
        }

        return html + '</ul>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Schedules
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Lantern Schedule Table
    // ------------------------------------------------------------
    function VghLantern__Specification__ScheduleRenderer__BuildLanternSchedule(documentModel) {
        var TableRenderer  =  window.VghLantern__Specification__TakeoffTableRenderer;
        if (!documentModel || !TableRenderer) return '';

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var tablesCfg     =  VghLantern__ScheduleRenderer__SpecConfig()['VghLantern__Specification__Config__Tables'] || {};
        var columns       =  ConfigLoader.VghLantern__ConfigLoader__RequireArray(
            tablesCfg, 'ScheduleColumns', 'Na__Specification__Config.json -> VghLantern__Specification__Config__Tables');

        return TableRenderer.VghLantern__Specification__TakeoffTableRenderer__BuildTable(
            columns, documentModel.ScheduleRows, null, null
        );
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Finish and Glazing Schedule Table
    // ------------------------------------------------------------
    function VghLantern__Specification__ScheduleRenderer__BuildFinishSchedule(documentModel) {
        var TableRenderer  =  window.VghLantern__Specification__TakeoffTableRenderer;
        if (!documentModel || !TableRenderer) return '';

        var rows  =  [];
        var i, entry;

        for (i = 0; i < documentModel.Lanterns.length; i++) {
            entry  =  documentModel.Lanterns[i];
            rows.push({
                Title       : entry.Title,
                FrameFinish : entry.FrameFinish,
                CapFinish   : entry.CapFinish,
                TrimFinish  : entry.TrimFinish,
                GlazingSpec : entry.GlazingSpec,
                GlazingTint : entry.GlazingTint
            });
        }

        return TableRenderer.VghLantern__Specification__TakeoffTableRenderer__BuildTable(
            FINISH_COLUMNS, rows, null, null
        );
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Per Lantern Quantity Breakdown
    // ------------------------------------------------------------
    // tableKind selects which of the three quantity tables to print, so the
    // "Section Lengths", "Glazing Areas" and "Components" sections each get a
    // per-lantern breakdown from one builder.
    function VghLantern__Specification__ScheduleRenderer__BuildPerLantern(documentModel, tableKind) {
        var TableRenderer  =  window.VghLantern__Specification__TakeoffTableRenderer;
        if (!documentModel || !TableRenderer) return '';

        var builders  =  {
            linear      : TableRenderer.VghLantern__Specification__TakeoffTableRenderer__BuildLinearTable,
            cuttingList : TableRenderer.VghLantern__Specification__TakeoffTableRenderer__BuildCuttingListTable,
            areas       : TableRenderer.VghLantern__Specification__TakeoffTableRenderer__BuildAreaTable,
            components  : TableRenderer.VghLantern__Specification__TakeoffTableRenderer__BuildComponentTable
        };

        var buildFn  =  builders[tableKind];
        if (!buildFn) {
            console.warn('[VghLantern__Specification__ScheduleRenderer] Unknown table kind "' + tableKind + '".');
            return '';
        }

        var isMulti  =  documentModel.Lanterns.length > 1;
        var html     =  '';
        var i, entry;

        for (i = 0; i < documentModel.Lanterns.length; i++) {
            entry  =  documentModel.Lanterns[i];

            // The lantern subheading is noise on a single-lantern job.
            if (isMulti) {
                html  +=  '<h4 class="' + CSS_SUBHEADING + '">' +
                          VghLantern__ScheduleRenderer__Escape(entry.Title) +
                          (entry.Takeoff.Meta.Quantity > 1 ? ' (x' + entry.Takeoff.Meta.Quantity + ')' : '') +
                          '</h4>';
            }

            html  +=  buildFn(entry.Takeoff);
        }

        return html;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Aggregated Works Order Summary
    // ------------------------------------------------------------
    function VghLantern__Specification__ScheduleRenderer__BuildAggregate(documentModel) {
        var TableRenderer  =  window.VghLantern__Specification__TakeoffTableRenderer;
        if (!documentModel || !documentModel.Aggregate || !TableRenderer) return '';

        return '<h4 class="' + CSS_SUBHEADING + '">Project Total - All Lanterns</h4>' +
               TableRenderer.VghLantern__Specification__TakeoffTableRenderer__BuildAggregateTable(documentModel.Aggregate);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Specification__ScheduleRenderer__BuildHeader          : VghLantern__Specification__ScheduleRenderer__BuildHeader,
        VghLantern__Specification__ScheduleRenderer__BuildWarnings        : VghLantern__Specification__ScheduleRenderer__BuildWarnings,
        VghLantern__Specification__ScheduleRenderer__BuildUserWarnings    : VghLantern__Specification__ScheduleRenderer__BuildUserWarnings,
        VghLantern__Specification__ScheduleRenderer__BuildLanternSchedule : VghLantern__Specification__ScheduleRenderer__BuildLanternSchedule,
        VghLantern__Specification__ScheduleRenderer__BuildFinishSchedule  : VghLantern__Specification__ScheduleRenderer__BuildFinishSchedule,
        VghLantern__Specification__ScheduleRenderer__BuildPerLantern      : VghLantern__Specification__ScheduleRenderer__BuildPerLantern,
        VghLantern__Specification__ScheduleRenderer__BuildAggregate       : VghLantern__Specification__ScheduleRenderer__BuildAggregate
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Specification__ScheduleRenderer  =  VghLantern__Specification__ScheduleRenderer;
