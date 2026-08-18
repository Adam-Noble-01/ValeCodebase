// =============================================================================
// WHITECARDOPEDIA - ADVANCED TIME DATA (OFFSETTABLE TIME) UTILITIES
// =============================================================================
//
// FILE       : Na__AppUtils__TimeAdjustments.js
// NAMESPACE  : Whitecardopedia
// MODULE     : TimeAdjustments
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Single source of truth for offsettable time categories, the
//              scheduleData.timeAdjustments JSON block, and the absolute /
//              offset / net hour arithmetic used across the whole app.
// CREATED    : 18-Aug-2026
//
// DESCRIPTION:
// - A job's recorded `timeTaken` is the ABSOLUTE time card: every hour spent.
// - Some of those hours fall outside the original job scope. A whitecard that
//   reads as 6 hours might be 3 hours of drawing, 2 hours building reusable
//   assets and 1 hour of out-of-scope amendments.
// - `scheduleData.timeAdjustments` records those out-of-scope hours by
//   category. Subtracting them from `timeTaken` gives the NET SCOPE HOURS,
//   which is what KPI reporting should compare against `timeAllocated`.
// - Every consumer (Project Editor, Project Viewer, Time Analysis Tool) reads
//   the block through this module so the arithmetic can never drift.
//
// JSON SHAPE (all keys optional, block itself optional):
//   "scheduleData": {
//       "timeAllocated"   : 6,
//       "timeTaken"       : 6,
//       "timeAdjustments" : {
//           "timeAdjustments__Description"        : "...",
//           "timeAdjustments__ReusableAssets"     : 3,
//           "timeAdjustments__ScopeAmendments"    : 1,
//           "timeAdjustments__DesignDevelopment"  : 0,
//           "timeAdjustments__AdditionalContext"  : 0,
//           "timeAdjustments__HealthImpact"       : 0
//       }
//   }
//
// BACKWARDS COMPATIBILITY:
// - A record with no `timeAdjustments` block behaves exactly as before:
//   offsets are zero and net hours equal absolute hours.
// - The block is only written when at least one category is non zero, so
//   untouched project.json files are never bloated with empty blocks.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 18-Aug-2026 - Version 1.0.0
// - Initial release: category registry, read / write helpers, net time maths.
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Category Registry
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Offsettable Time Category Definitions
    // ------------------------------------------------------------
    // Order here drives the editor field order, the chart stack order and the
    // legend order everywhere in the app. Add new categories at the end so
    // existing colour associations stay stable for the user.
    // ------------------------------------------------------------
    const NA_TIME_ADJUSTMENT_CATEGORIES = [
        {
            key         : 'reusableAssets',                                      // <-- Internal form state key
            jsonKey     : 'timeAdjustments__ReusableAssets',                     // <-- Key written into project.json
            label       : 'Modelled Reusable Assets',                            // <-- Full label for editor and tables
            shortLabel  : 'Reusable Assets',                                     // <-- Compact label for charts and legends
            color       : '#5f8a8b',                                             // <-- Chart colour (muted teal)
            help        : 'Hours spent building assets that can be reused on future jobs.'
        },
        {
            key         : 'scopeAmendments',
            jsonKey     : 'timeAdjustments__ScopeAmendments',
            label       : 'Amendments Outside Original Scope',
            shortLabel  : 'Scope Amendments',
            color       : '#b0846a',                                             // <-- Chart colour (clay)
            help        : 'Hours spent on changes requested after the original brief was agreed.'
        },
        {
            key         : 'designDevelopment',
            jsonKey     : 'timeAdjustments__DesignDevelopment',
            label       : 'Additional Design Development Outside Original Scope',
            shortLabel  : 'Design Development',
            color       : '#7d6b8f',                                             // <-- Chart colour (dusty plum)
            help        : 'Hours spent developing the design beyond what the brief asked for.'
        },
        {
            key         : 'additionalContext',
            jsonKey     : 'timeAdjustments__AdditionalContext',
            label       : 'Additional Context Required Outside Original Scope',
            shortLabel  : 'Additional Context',
            color       : '#5b7c99',                                             // <-- Chart colour (steel blue)
            help        : 'Hours spent modelling surrounding context that the brief did not require.'
        },
        {
            key         : 'healthImpact',
            jsonKey     : 'timeAdjustments__HealthImpact',
            label       : 'Additional Time Due To User Health',
            shortLabel  : 'Health Impact',
            color       : '#a3707a',                                             // <-- Chart colour (muted rose)
            help        : 'Hours lost to health factors such as migraines, recorded so they do not distort scope metrics.'
        }
    ];
    // ------------------------------------------------------------

    // MODULE CONSTANTS | JSON Block Keys
    // ------------------------------------------------------------
    const NA_TIME_ADJUSTMENTS_BLOCK_KEY  = 'timeAdjustments';                    // <-- Block name inside scheduleData
    const NA_TIME_ADJUSTMENTS_DESC_KEY   = 'timeAdjustments__Description';       // <-- Self documenting description key
    const NA_TIME_ADJUSTMENTS_DESC_TEXT  =                                       // <-- Description written into every block
        'Hours inside timeTaken that fall outside the original job scope. '
        + 'Subtracted from timeTaken to give the net in-scope hours used for KPI reporting. '
        + 'All values are hours and support decimals.';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Read Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Coerce a Stored Value Into a Safe Non Negative Number
    // ---------------------------------------------------------------
    function na_coerce_adjustment_hours(rawValue) {
        if (rawValue === null || rawValue === undefined || rawValue === '') return 0;  // <-- Absent means zero
        const parsed = typeof rawValue === 'number' ? rawValue : parseFloat(rawValue); // <-- Accept numbers and numeric strings
        if (isNaN(parsed) || parsed < 0) return 0;                               // <-- Reject junk and negatives
        return parsed;                                                           // <-- Return usable hours
    }
    // ---------------------------------------------------------------

    // FUNCTION | Read the Adjustment Block From a scheduleData Object
    // ------------------------------------------------------------
    // Returns a stable shape whether or not the block exists, so callers never
    // need their own null guards.
    // ------------------------------------------------------------
    function na_read_time_adjustments(scheduleData) {
        const block  = (scheduleData || {})[NA_TIME_ADJUSTMENTS_BLOCK_KEY] || {};  // <-- Block with safe fallback
        const byKey  = {};                                                        // <-- Hours keyed by category key
        let   total  = 0;                                                         // <-- Running total of all offsets

        NA_TIME_ADJUSTMENT_CATEGORIES.forEach(category => {                        // <-- Read each known category
            const hours = na_coerce_adjustment_hours(block[category.jsonKey]);     // <-- Safe numeric value
            byKey[category.key] = hours;                                           // <-- Store against the form key
            total += hours;                                                        // <-- Accumulate the total
        });

        return {
            byKey   : byKey,                                                       // <-- Per category hours
            total   : Math.round(total * 100) / 100,                               // <-- Total offset hours
            hasAny  : total > 0                                                    // <-- Whether this job uses offsets at all
        };
    }
    // ---------------------------------------------------------------

    // FUNCTION | Calculate Absolute, Offset and Net Hours For a Job
    // ------------------------------------------------------------
    // absolute : every hour recorded on the job (the time card figure)
    // offsets  : hours that fall outside the original scope
    // net      : the in-scope hours KPI reporting should use
    //
    // `net` is floored at zero and can never exceed `absolute`, so a
    // mis-keyed offset larger than the recorded time cannot produce a
    // negative or inflated KPI. `overRecorded` flags that situation for the
    // editor to warn about.
    // ------------------------------------------------------------
    function na_calculate_net_time(scheduleData) {
        const schedule    = scheduleData || {};                                    // <-- Safe fallback
        const hasAbsolute = typeof schedule.timeTaken === 'number';                // <-- Only numeric time cards count
        const absolute    = hasAbsolute ? schedule.timeTaken : null;               // <-- Recorded time card hours
        const adjustments = na_read_time_adjustments(schedule);                     // <-- Offsets for this job

        if (!hasAbsolute) {                                                        // <-- Unreviewed job: no arithmetic possible
            return {
                hasAbsolute     : false,
                absolute        : null,
                offsets         : adjustments.total,
                offsetsByKey    : adjustments.byKey,
                net             : null,
                hasAdjustments  : adjustments.hasAny,
                overRecorded    : false
            };
        }

        const cappedOffsets = Math.min(adjustments.total, absolute);               // <-- Never subtract more than was recorded
        const net           = Math.round((absolute - cappedOffsets) * 100) / 100;  // <-- Net in-scope hours

        return {
            hasAbsolute     : true,
            absolute        : absolute,                                            // <-- Time card hours
            offsets         : cappedOffsets,                                       // <-- Offset hours actually applied
            offsetsByKey    : adjustments.byKey,                                   // <-- Per category breakdown
            net             : net,                                                 // <-- In-scope hours for KPIs
            hasAdjustments  : adjustments.hasAny,                                  // <-- Whether offsets are in play
            overRecorded    : adjustments.total > absolute                         // <-- Offsets exceed the time card
        };
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Write Helpers
// -----------------------------------------------------------------------------

    // FUNCTION | Build the timeAdjustments JSON Block From Editor Field Values
    // ------------------------------------------------------------
    // Accepts an object keyed by category key holding strings or numbers.
    // Returns null when every category is zero or blank, so the block is only
    // written to project.json when it carries real information.
    // ------------------------------------------------------------
    function na_build_time_adjustments_block(fieldValues) {
        const values = fieldValues || {};                                          // <-- Safe fallback
        const block  = {};                                                         // <-- Accumulated JSON block
        let   total  = 0;                                                          // <-- Running total to test emptiness

        NA_TIME_ADJUSTMENT_CATEGORIES.forEach(category => {                        // <-- Write each populated category
            const hours = na_coerce_adjustment_hours(values[category.key]);        // <-- Safe numeric value
            if (hours > 0) {                                                       // <-- Only persist non zero entries
                block[category.jsonKey] = hours;
                total += hours;
            }
        });

        if (total <= 0) return null;                                               // <-- Nothing worth writing

        return Object.assign(
            { [NA_TIME_ADJUSTMENTS_DESC_KEY]: NA_TIME_ADJUSTMENTS_DESC_TEXT },     // <-- Description first for readability
            block
        );
    }
    // ---------------------------------------------------------------

    // FUNCTION | Seed Editor Field Values From an Existing scheduleData Object
    // ------------------------------------------------------------
    // Returns strings (not numbers) because the editor uses text inputs, and
    // blank rather than '0' so untouched fields read as empty.
    // ------------------------------------------------------------
    function na_seed_time_adjustment_fields(scheduleData) {
        const adjustments = na_read_time_adjustments(scheduleData);                // <-- Existing values
        const fields      = {};                                                    // <-- Editor field state

        NA_TIME_ADJUSTMENT_CATEGORIES.forEach(category => {                        // <-- Seed each category field
            const hours = adjustments.byKey[category.key];
            fields[category.key] = hours > 0 ? String(hours) : '';                 // <-- Blank when unused
        });

        return fields;
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Aggregation Helpers
// -----------------------------------------------------------------------------

    // FUNCTION | Sum Offset Hours Across a Collection of Projects
    // ------------------------------------------------------------
    // Used by the Time Analysis Tool to build offset composition charts
    // without every caller repeating the same fold.
    // ------------------------------------------------------------
    function na_aggregate_time_adjustments(projects) {
        const byKey  = {};                                                         // <-- Total hours per category
        let   total  = 0;                                                          // <-- Grand total offset hours
        let   jobs   = 0;                                                          // <-- Jobs carrying any offset

        NA_TIME_ADJUSTMENT_CATEGORIES.forEach(c => { byKey[c.key] = 0; });          // <-- Seed every category at zero

        (projects || []).forEach(project => {                                       // <-- Fold every project
            const schedule = project.scheduleData || project;                       // <-- Accept project or scheduleData
            const timing   = na_calculate_net_time(schedule);
            if (!timing.hasAdjustments) return;                                     // <-- Skip jobs with no offsets
            jobs++;
            NA_TIME_ADJUSTMENT_CATEGORIES.forEach(c => {
                byKey[c.key] += timing.offsetsByKey[c.key];
                total        += timing.offsetsByKey[c.key];
            });
        });

        return {
            byKey   : byKey,                                                        // <-- Hours per category
            total   : Math.round(total * 100) / 100,                                // <-- Grand total
            jobs    : jobs,                                                         // <-- Jobs using offsets
            rows    : NA_TIME_ADJUSTMENT_CATEGORIES                                 // <-- Chart ready rows, largest first
                .map(c => ({
                    key         : c.key,
                    label       : c.label,
                    shortLabel  : c.shortLabel,
                    color       : c.color,
                    hours       : Math.round(byKey[c.key] * 100) / 100,
                    share       : total > 0 ? Math.round((byKey[c.key] / total) * 1000) / 10 : 0
                }))
                .filter(r => r.hours > 0)
                .sort((a, b) => b.hours - a.hours)
        };
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
