/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | WARNING SYSTEM
   =============================================================================

   FILE       : VghLantern__LanternEditor__WarningSystem__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - WarningSystem
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Evaluate manufacturability rules and surface them in the editor
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Evaluates the declarative rule table in Na__LanternEditor__Warnings__.json
     against the current lantern and its solved geometry.
   - Measures a small fixed set of METRICS; every threshold lives in config, so a
     manufacturing limit change never means a code change.
   - Also republishes the warnings the SkeletonSolver and GlazeBarLayout produced,
     so the user sees one list rather than hunting the console.
   - Renders that list into the editor and answers one question the downstream
     modes need: is this configuration safe to issue.

   -----------------------------------------------------------------------------

   WHY A DECLARATIVE TABLE RATHER THAN CODED CHECKS:
   Vale's manufacturing limits change with supplier and glazing spec. Encoding
   them as thirteen `if` statements would mean a code review every time the shop
   floor revises a span. A metric plus an operator plus a config-sourced limit
   moves that revision into JSON where a technician can make it.

   SEVERITY AND ISSUE GATING:
   Severities carry a BlocksIssue flag. The drawing editor and specification mode
   call HasBlockingWarnings() before allowing an issue, which is the single place
   that decision is made.

   ============================================================================= */

// =============================================================================
// REGION | Warning System Module
// =============================================================================

const VghLantern__LanternEditor__WarningSystem = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Class Names
    // ------------------------------------------------------------
    const CSS_LIST      =  'VghLantern__Warnings__List';
    const CSS_ITEM      =  'VghLantern__Warnings__Item';
    const CSS_BADGE     =  'VghLantern__Warnings__Badge';
    const CSS_MESSAGE   =  'VghLantern__Warnings__Message';
    const CSS_EMPTY     =  'VghLantern__Warnings__Empty';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Severity Keys and Fallbacks
    // ------------------------------------------------------------
    const SEVERITY_ERROR    =  'error';
    const SEVERITY_WARNING  =  'warning';
    const SEVERITY_INFO     =  'info';

    const FALLBACK_SEVERITY_RANK  =  2;                                      // <-- Unknown severity sorts with warnings
    const SOLVER_SEVERITY         =  SEVERITY_WARNING;                       // <-- Solver notes are advisory, not blocking
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Lantern Block Names
    // ------------------------------------------------------------
    const BLOCK_DIMENSIONS  =  'Lantern__Dimensions__Config';
    const BLOCK_KERB        =  'Lantern__KerbAndBase__Config';
    const BLOCK_BARS        =  'Lantern__GlazingBars__Config';
    const BLOCK_FINIALS     =  'Lantern__Finials__Config';
    const BLOCK_VENTS       =  'Lantern__Ventilation__Config';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Last Evaluation Result
    // ------------------------------------------------------------
    // Cached so HasBlockingWarnings can answer without re-measuring, and so the
    // drawing editor reads exactly what the user was shown in the editor.
    let VghLantern__WarningSystem__LastEntries  =  [];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Warnings Rule Config Block
    // ------------------------------------------------------------
    function VghLantern__WarningSystem__RuleConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};
        return ConfigLoader.VghLantern__ConfigLoader__GetSection('EditorWarnings') || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the Validation Limit Config Block
    // ------------------------------------------------------------
    function VghLantern__WarningSystem__ValidationConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};
        return ConfigLoader.VghLantern__ConfigLoader__GetSection('Validation') || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Look Up a Severity Definition
    // ------------------------------------------------------------
    function VghLantern__WarningSystem__Severity(severityKey) {
        var ruleCfg     =  VghLantern__WarningSystem__RuleConfig();
        var severities  =  ruleCfg['VghLantern__LanternEditor__Warnings__Config__Severities'] || {};
        return severities[severityKey] || { Label : severityKey, Rank : FALLBACK_SEVERITY_RANK, BlocksIssue : false };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Metric Measurement
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read a Numeric Field from a Lantern Block
    // ------------------------------------------------------------
    function VghLantern__WarningSystem__ReadNumber(lantern, blockKey, fieldKey) {
        var block  =  lantern && lantern[blockKey];
        if (!block) return 0;
        return Number(block[fieldKey]) || 0;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read a Text Field from a Lantern Block
    // ------------------------------------------------------------
    function VghLantern__WarningSystem__ReadText(lantern, blockKey, fieldKey) {
        var block  =  lantern && lantern[blockKey];
        if (!block) return '';
        return String(block[fieldKey] || '');
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Measure the Widest and Narrowest Pane Spacing
    // ------------------------------------------------------------
    // Both slopes are considered together because the shop floor cares about the
    // worst pane on the lantern, not the worst pane per slope.
    function VghLantern__WarningSystem__SpacingRange(barSet) {
        var meta  =  barSet && barSet.Meta;
        if (!meta) return { Min : 0, Max : 0 };

        var candidates  =  [meta.ResolvedLongSpacingMm, meta.ResolvedShortSpacingMm].filter(function(value) {
            return typeof value === 'number' && value > 0;
        });

        if (candidates.length === 0) return { Min : 0, Max : 0 };

        return {
            Min : Math.min.apply(null, candidates),
            Max : Math.max.apply(null, candidates)
        };
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Measure the Largest Single Glazing Pane Area
    // ------------------------------------------------------------
    // Pane area is approximated as the largest slope face divided by its pane
    // count. That is exact for a rectangular slope and slightly conservative on
    // a triangular hip, which is the right direction to err in.
    function VghLantern__WarningSystem__MaxPaneAreaSqM(skeleton, barSet) {
        if (!skeleton || !Array.isArray(skeleton.Faces) || skeleton.Faces.length === 0) return 0;

        var meta       =  (barSet && barSet.Meta) || {};
        var longBars   =  Number(meta.LongSlopeBarCount)  || 0;
        var shortBars  =  Number(meta.ShortSlopeBarCount) || 0;
        var largest    =  0;
        var i, face, isLongSlope, paneCount, paneArea;

        for (i = 0; i < skeleton.Faces.length; i++) {
            face         =  skeleton.Faces[i];
            isLongSlope  =  String(face.SlopeKey || '').indexOf('long') === 0;
            paneCount    =  (isLongSlope ? longBars : shortBars) + 1;
            paneArea     =  (Number(face.AreaSqMm) || 0) / paneCount / 1000000;
            if (paneArea > largest) largest  =  paneArea;
        }

        return largest;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Count the Total Glazing Panes on the Lantern
    // ------------------------------------------------------------
    function VghLantern__WarningSystem__PaneCount(skeleton, barSet) {
        if (!skeleton || !Array.isArray(skeleton.Faces)) return 0;

        var meta       =  (barSet && barSet.Meta) || {};
        var longBars   =  Number(meta.LongSlopeBarCount)  || 0;
        var shortBars  =  Number(meta.ShortSlopeBarCount) || 0;
        var transomFactor  =  meta.TransomEnabled === true ? 2 : 1;
        var total      =  0;
        var i, isLongSlope;

        for (i = 0; i < skeleton.Faces.length; i++) {
            isLongSlope  =  String(skeleton.Faces[i].SlopeKey || '').indexOf('long') === 0;
            total       +=  ((isLongSlope ? longBars : shortBars) + 1) * transomFactor;
        }

        return total;
    }
    // ------------------------------------------------------------


    // FUNCTION | Measure Every Metric the Rule Table Can Reference
    // ------------------------------------------------------------
    // One measurement pass per evaluation, so a rule table with a dozen entries
    // does not walk the face list a dozen times.
    function VghLantern__WarningSystem__MeasureMetrics(lantern, skeleton, barSet) {
        var meta     =  (skeleton && skeleton.Meta) || {};
        var spacing  =  VghLantern__WarningSystem__SpacingRange(barSet);

        var barCountTotal  =  Number(((barSet && barSet.Meta) || {}).LongSlopeBarCount || 0)
                           +  Number(((barSet && barSet.Meta) || {}).ShortSlopeBarCount || 0);

        var finialsOn      =  (lantern && lantern[BLOCK_FINIALS]) ? lantern[BLOCK_FINIALS]['Lantern__Finials__Config__Enabled'] === true : false;
        var finialChosen   =  VghLantern__WarningSystem__ReadText(lantern, BLOCK_FINIALS, 'Lantern__Finials__Config__FinialComponentId') !== '';
        var barProfileSet  =  VghLantern__WarningSystem__ReadText(lantern, BLOCK_BARS, 'Lantern__GlazingBars__Config__BarProfileId') !== '';

        var ventsOn        =  (lantern && lantern[BLOCK_VENTS]) ? lantern[BLOCK_VENTS]['Lantern__Ventilation__Config__Enabled'] === true : false;
        var ventCount      =  ventsOn ? VghLantern__WarningSystem__ReadNumber(lantern, BLOCK_VENTS, 'Lantern__Ventilation__Config__VentCount') : 0;
        var paneCount      =  VghLantern__WarningSystem__PaneCount(skeleton, barSet);

        return {
            widthMm                        : VghLantern__WarningSystem__ReadNumber(lantern, BLOCK_DIMENSIONS, 'Lantern__Dimensions__Config__WidthMm'),
            depthMm                        : VghLantern__WarningSystem__ReadNumber(lantern, BLOCK_DIMENSIONS, 'Lantern__Dimensions__Config__DepthMm'),
            kerbHeightMm                   : VghLantern__WarningSystem__ReadNumber(lantern, BLOCK_KERB, 'Lantern__KerbAndBase__Config__KerbHeightMm'),
            pitchDegrees                   : Number(meta.PitchDegrees) || 0,
            overallHeightMm                : Number(meta.OverallHeightMm) || 0,
            minBarSpacingMm                : spacing.Min,
            maxBarSpacingMm                : spacing.Max,
            maxPaneAreaSqM                 : VghLantern__WarningSystem__MaxPaneAreaSqM(skeleton, barSet),
            paneCount                      : paneCount,
            ventCountOverPaneCount         : Math.max(0, ventCount - paneCount),
            finialsEnabledWithoutComponent : (finialsOn && !finialChosen) ? 1 : 0,
            glazingBarsWithoutProfile      : (barCountTotal > 0 && !barProfileSet) ? 1 : 0
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rule Evaluation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve a Rule's Limit Value
    // ------------------------------------------------------------
    function VghLantern__WarningSystem__ResolveLimit(rule) {
        if (typeof rule.LimitValue === 'number') return rule.LimitValue;

        if (rule.LimitField) {
            var validation  =  VghLantern__WarningSystem__ValidationConfig();
            var limit       =  validation[rule.LimitField];
            if (typeof limit === 'number') return limit;
        }

        return null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Compare a Metric Against a Limit
    // ------------------------------------------------------------
    function VghLantern__WarningSystem__Compare(operator, value, limit) {
        if (operator === 'lt')  return value <  limit;
        if (operator === 'lte') return value <= limit;
        if (operator === 'gt')  return value >  limit;
        if (operator === 'gte') return value >= limit;
        if (operator === 'eq')  return value === limit;
        if (operator === 'neq') return value !== limit;
        return false;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format a Number for a Warning Message
    // ------------------------------------------------------------
    // Areas need decimals to be meaningful; millimetres never do.
    function VghLantern__WarningSystem__FormatValue(value) {
        if (Math.abs(value) < 10 && value !== Math.round(value)) return value.toFixed(2);
        return String(Math.round(value * 10) / 10);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Interpolate the Value and Limit Tokens in a Message
    // ------------------------------------------------------------
    function VghLantern__WarningSystem__BuildMessage(rule, value, limit) {
        var template  =  rule.Message || rule.Key;
        return template
            .replace('{value}', VghLantern__WarningSystem__FormatValue(value))
            .replace('{limit}', VghLantern__WarningSystem__FormatValue(limit));
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Collect the Warnings the Geometry Modules Already Raised
    // ------------------------------------------------------------
    // The solver and the bar layout both know things the rule table cannot, such
    // as an unsupported roof form. Folding their notes into the same list means
    // the editor has one place to look.
    function VghLantern__WarningSystem__CollectGeometryNotes(skeleton, barSet) {
        var entries  =  [];
        var sources  =  [
            { List : (skeleton && skeleton.Meta && skeleton.Meta.Warnings) || [], Origin : 'solver' },
            { List : (barSet && barSet.Warnings) || [],                            Origin : 'barLayout' }
        ];
        var i, j, source;

        for (i = 0; i < sources.length; i++) {
            source  =  sources[i];
            for (j = 0; j < source.List.length; j++) {
                entries.push({
                    Key      : source.Origin + ':' + j,
                    Severity : SOLVER_SEVERITY,
                    Message  : source.List[j],
                    Origin   : source.Origin
                });
            }
        }

        return entries;
    }
    // ------------------------------------------------------------


    // FUNCTION | Evaluate the Rule Table Against a Lantern
    // ------------------------------------------------------------
    // Returns a severity-sorted entry list and caches it for HasBlockingWarnings.
    function VghLantern__WarningSystem__Evaluate(lantern, skeleton, barSet) {
        if (!lantern) {
            VghLantern__WarningSystem__LastEntries  =  [];
            return [];
        }

        var ruleCfg  =  VghLantern__WarningSystem__RuleConfig();
        var rules    =  ruleCfg['VghLantern__LanternEditor__Warnings__Config__Rules'] || [];
        var metrics  =  VghLantern__WarningSystem__MeasureMetrics(lantern, skeleton, barSet);
        var entries  =  [];
        var i, rule, value, limit;

        for (i = 0; i < rules.length; i++) {
            rule   =  rules[i];
            value  =  metrics[rule.Metric];
            limit  =  VghLantern__WarningSystem__ResolveLimit(rule);

            if (typeof value !== 'number' || limit === null) continue;        // <-- Unknown metric or unresolvable limit: skip, never guess
            if (!VghLantern__WarningSystem__Compare(rule.Operator, value, limit)) continue;

            entries.push({
                Key      : rule.Key,
                Severity : rule.Severity || SEVERITY_WARNING,
                Message  : VghLantern__WarningSystem__BuildMessage(rule, value, limit),
                Origin   : 'rule'
            });
        }

        entries  =  entries.concat(VghLantern__WarningSystem__CollectGeometryNotes(skeleton, barSet));

        entries.sort(function(a, b) {
            return VghLantern__WarningSystem__Severity(b.Severity).Rank - VghLantern__WarningSystem__Severity(a.Severity).Rank;
        });

        VghLantern__WarningSystem__LastEntries  =  entries;
        return entries;
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether Any Cached Warning Blocks Document Issue
    // ------------------------------------------------------------
    function VghLantern__WarningSystem__HasBlockingWarnings() {
        for (var i = 0; i < VghLantern__WarningSystem__LastEntries.length; i++) {
            if (VghLantern__WarningSystem__Severity(VghLantern__WarningSystem__LastEntries[i].Severity).BlocksIssue === true) return true;
        }
        return false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Return the Cached Entry List
    // ------------------------------------------------------------
    function VghLantern__WarningSystem__GetEntries() {
        return VghLantern__WarningSystem__LastEntries.slice();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rendering
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Escape Text for Safe HTML Interpolation
    // ------------------------------------------------------------
    function VghLantern__WarningSystem__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // FUNCTION | Render the Warning List into a Host Element
    // ------------------------------------------------------------
    // Solves and evaluates nothing itself; the caller supplies the geometry it
    // already has, so the warnings can never describe a stale solve.
    function VghLantern__WarningSystem__Render(hostElement, lantern, skeleton, barSet) {
        if (!hostElement) return;

        var entries  =  VghLantern__WarningSystem__Evaluate(lantern, skeleton, barSet);

        if (entries.length === 0) {
            hostElement.innerHTML  =  '<p class="' + CSS_EMPTY + '">No issues - this configuration is manufacturable.</p>';
            return;
        }

        var html  =  '<ul class="' + CSS_LIST + '">';
        var i, entry, severity;

        for (i = 0; i < entries.length; i++) {
            entry     =  entries[i];
            severity  =  VghLantern__WarningSystem__Severity(entry.Severity);

            html  +=  '<li class="' + CSS_ITEM + ' ' + CSS_ITEM + '--' + VghLantern__WarningSystem__Escape(entry.Severity) + '">';
            html  +=      '<span class="' + CSS_BADGE + '">' + VghLantern__WarningSystem__Escape(severity.Label) + '</span>';
            html  +=      '<span class="' + CSS_MESSAGE + '">' + VghLantern__WarningSystem__Escape(entry.Message) + '</span>';
            html  +=  '</li>';
        }

        html  +=  '</ul>';
        hostElement.innerHTML  =  html;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__WarningSystem__Render               : VghLantern__WarningSystem__Render,
        VghLantern__WarningSystem__Evaluate             : VghLantern__WarningSystem__Evaluate,
        VghLantern__WarningSystem__GetEntries           : VghLantern__WarningSystem__GetEntries,
        VghLantern__WarningSystem__HasBlockingWarnings  : VghLantern__WarningSystem__HasBlockingWarnings,
        VghLantern__WarningSystem__SeverityError        : SEVERITY_ERROR,
        VghLantern__WarningSystem__SeverityWarning      : SEVERITY_WARNING,
        VghLantern__WarningSystem__SeverityInfo         : SEVERITY_INFO
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__LanternEditor__WarningSystem  =  VghLantern__LanternEditor__WarningSystem;
