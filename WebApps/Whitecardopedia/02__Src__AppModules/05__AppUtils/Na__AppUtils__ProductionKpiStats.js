// =============================================================================
// WHITECARDOPEDIA - PRODUCTION KPI STATISTICS ENGINE
// =============================================================================
//
// FILE       : Na__AppUtils__ProductionKpiStats.js
// NAMESPACE  : Whitecardopedia
// MODULE     : ProductionKpiStats
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Single source of truth for every ValeVision3D production KPI
//              figure: job records, headline metrics, breakdowns, monthly
//              throughput, asset totals, feature adoption and data quality.
// CREATED    : 18-Aug-2026
//
// DESCRIPTION:
// - Extracted verbatim from Na__Feature__TimeAnalysis__Main.jsx so the
//   in-app Time Analysis Tool and the standalone external KPI page compute
//   identical numbers from identical code. Two copies would drift.
// - Pure functions only: no DOM, no React, no fetching. Callers supply an
//   array of loaded project.json objects and receive plain data back.
// - Depends on Na__AppUtils__TimeAdjustments.js for the absolute / offset /
//   net hour split, so load that first.
//
// PRIMARY ENTRY POINT:
//   na_build_production_kpi_stats(loadedProjects) -> {
//       generatedFrom, headline, typeRows, yearRows, inputRows, designerRows,
//       monthly, assets, adoption, offsets, artistNetRows, dataQuality
//   }
//
// TURNAROUND:
// - Measured in WORKING days. countBusinessDays() reports days elapsed minus
//   any Saturday or Sunday, so a job that never crosses a weekend is
//   unchanged. Public holidays are not deducted.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 18-Aug-2026 - Version 1.0.0
// - Extracted from the Time Analysis Tool so the external KPI page can reuse
//   the identical engine.
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Date Utility Functions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Parse Date String (DD-MMM-YYYY format)
    // ---------------------------------------------------------------
    function parseDate(dateStr) {
        if (!dateStr) return new Date();                                    // <-- Return current date if invalid
        
        const months = {                                                    // <-- Month abbreviation mapping
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        
        const parts = dateStr.split('-');                                   // <-- Split date string
        const day = parseInt(parts[0]);                                      // <-- Extract day
        const month = months[parts[1]];                                    // <-- Extract month
        const year = parseInt(parts[2]);                                    // <-- Extract year
        
        return new Date(year, month, day);                                  // <-- Return Date object
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Count Working Days Elapsed Between Two Dates
    // ---------------------------------------------------------------
    // Turnaround measures elapsed time, so weekends must not inflate
    // it. A job received Friday and delivered Monday took one working
    // day, not three calendar days.
    //
    // This counts days ELAPSED (the gap), matching the calendar-day
    // behaviour it replaces, minus any Saturday or Sunday in the span.
    // A job that never crosses a weekend is therefore unchanged:
    //
    //   Tue -> Wed   1 working day   (was 1 calendar day)
    //   Mon -> Fri   4 working days  (was 4 calendar days)
    //   Fri -> Mon   1 working day   (was 3 calendar days)  <-- the fix
    //   Fri -> Tue   2 working days  (was 4 calendar days)  <-- the fix
    //
    // - Dates are normalised to UTC midnight so British Summer Time
    //   transitions cannot shift a day boundary.
    // - Floored at 1: same-day delivery, and any span falling wholly on
    //   a weekend, still represents work done.
    //
    // NOTE: public holidays are not deducted. That would need a holiday
    // calendar in the app data; weekends alone remove the bulk of the
    // distortion.
    // ---------------------------------------------------------------
    function countBusinessDays(startDate, endDate) {
        if (!startDate || !endDate) return null;                              // <-- Cannot measure without both ends

        let start = startDate;                                                // <-- Earlier end of the span
        let end   = endDate;                                                  // <-- Later end of the span
        if (start > end) { start = endDate; end = startDate; }                // <-- Tolerate reversed dates

        const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()); // <-- DST safe day index
        const endUtc   = Date.UTC(end.getFullYear(),   end.getMonth(),   end.getDate());

        const totalDays = Math.round((endUtc - startUtc) / 86400000) + 1;     // <-- Calendar days spanned, endpoints included
        const startDow  = new Date(startUtc).getUTCDay();                     // <-- 0 = Sunday, 6 = Saturday

        const fullWeeks = Math.floor(totalDays / 7);                          // <-- Every whole week holds exactly 5
        let   business  = fullWeeks * 5;

        const remainder = totalDays % 7;                                      // <-- Walk only the leftover days
        for (let i = 0; i < remainder; i++) {
            const dayOfWeek = (startDow + i) % 7;
            if (dayOfWeek !== 0 && dayOfWeek !== 6) business++;               // <-- Skip Saturday and Sunday
        }

        return Math.max(1, business - 1);                                     // <-- Elapsed, not inclusive; never zero
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Format Date for Display
    // ---------------------------------------------------------------
    function formatDate(date) {
        if (!date) return 'N/A';                                            // <-- Return N/A if no date
        return date.toLocaleDateString('en-GB', {                          // <-- Format as DD MMM YYYY
            day: '2-digit', month: 'short', year: 'numeric'
        });
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Library Overview Statistics Calculation
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Library Overview Configuration
    // ------------------------------------------------------------
    const JOB_TYPE_ORDER    = ['Whitecard', 'Blockout', 'MaxModel'];         // <-- Canonical job type display order
    const JOB_TYPE_COLORS   = {                                              // <-- Bar colour per job type
        'Whitecard'     : '#5b7c99',
        'Blockout'      : '#b0846a',
        'MaxModel'      : '#7d6b8f',
        'Unclassified'  : '#c3c8cc'
    };
    const PLACEHOLDER_VALUES = [                                             // <-- Sentinel values treated as "not set"
        'not yet reviewed', 'default input type', 'default concept artist',
        'nil', 'n/a', 'na', 'tbc', 'unknown', 'placeholder', ''
    ];
    const MONTHS_ON_CHART   = 18;                                            // <-- Trailing months shown on throughput chart
    // The efficiency trend chart starts here. The 3D pipeline only became
    // routine in February 2026 and reached every job from March; before that
    // the department was delivering image-only work against a different
    // process, so earlier months are not comparable. This trims THAT CHART
    // ONLY: every other figure in the dashboard still spans the whole library.
    const EFFICIENCY_TREND_START  = '2026-03';                               // <-- YYYY-MM, compared lexically

    const TIMELINE_DOMAIN_PADDING = 0.02;                                    // <-- Pad the timeline axis by 2% of its span each side
    const TIMELINE_MIN_PAD_MS     = 3 * 86400000;                            // <-- ...but never less than three days
    const WORKING_WEEK_DAYS   = 5;                                           // <-- Mon-Fri: the "delivered in a week" threshold
    const CHART_SAFETY_GUTTER = 8;                                           // <-- Breathing room at the chart edges
    const AXIS_LABEL_PADDING  = 16;                                          // <-- Gap between an axis label and its tick
    // ------------------------------------------------------------

    // HELPER FUNCTION | Test Whether a Field Value is a Real Entry
    // ---------------------------------------------------------------
    function isRealValue(value) {
        if (value === null || value === undefined) return false;             // <-- Missing values are never real
        const cleaned = String(value).trim().toLowerCase();                  // <-- Normalise for sentinel comparison
        if (PLACEHOLDER_VALUES.includes(cleaned)) return false;              // <-- Reject known placeholder sentinels
        return cleaned.indexOf('placeholder') === -1;                        // <-- Reject any embedded placeholder text
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Normalise a Raw ProjectType Into a Display Label
    // ---------------------------------------------------------------
    function normaliseJobType(rawType) {
        if (!isRealValue(rawType)) return 'Unclassified';                    // <-- Missing type falls into its own bucket
        const cleaned = String(rawType).trim().toLowerCase();                // <-- Case insensitive match
        const match = JOB_TYPE_ORDER.find(t => t.toLowerCase() === cleaned); // <-- Map onto a canonical label
        return match || String(rawType).trim();                              // <-- Preserve any unexpected value verbatim
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Parse Date String Strictly (returns null when invalid)
    // ---------------------------------------------------------------
    function parseDateStrict(dateStr) {
        if (!isRealValue(dateStr)) return null;                              // <-- Reject placeholders and blanks
        const parsed = parseDate(dateStr);                                   // <-- Reuse shared DD-MMM-YYYY parser
        return isNaN(parsed?.getTime()) ? null : parsed;                     // <-- Only return genuine dates
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Build a Flat Job Record From a Project File
    // ---------------------------------------------------------------
    function buildJobRecord(project) {
        const schedule  = project.scheduleData   || {};                      // <-- Schedule block with safe fallback
        const prod      = project.productionData || {};                      // <-- Production block with safe fallback
        const images    = project.allImages || project.images || [];         // <-- Prefer the resolved image list
        const models    = project.valeVision_ModelUrls                       // <-- Multi model array where present
            || (project.valeVision_ModelUrl ? [project.valeVision_ModelUrl] : []); // <-- Legacy single model url

        const received  = parseDateStrict(schedule.dateReceived);            // <-- Job start date
        const fulfilled = parseDateStrict(schedule.dateFulfilled);           // <-- Job delivery date
        const allocated = typeof schedule.timeAllocated === 'number' ? schedule.timeAllocated : null; // <-- Quoted hours
        const taken     = typeof schedule.timeTaken === 'number' ? schedule.timeTaken : null;         // <-- Actual hours
        const timing    = na_calculate_net_time(schedule);                   // <-- Absolute / offset / net hour split

        return {
            name        : (project.projectNameAlias || '').trim() || project.projectName || 'Unnamed', // <-- Alias aware display name
            code        : project.projectCode || '',                          // <-- Vale job number
            year        : deriveJobYear(project, fulfilled),                  // <-- Delivery year for grouping
            type        : normaliseJobType(project.ProjectType),              // <-- Whitecard / Blockout / MaxModel
            artist      : isRealValue(prod.conceptArtist) ? String(prod.conceptArtist).trim() : null, // <-- Concept artist
            designer    : isRealValue(prod.designer) ? String(prod.designer).trim() : 'Not Recorded', // <-- Requesting designer
            input       : isRealValue(prod.input) ? String(prod.input).trim() : 'Not Recorded',       // <-- Incoming source material
            notes       : isRealValue(prod.additionalNotes) ? String(prod.additionalNotes).trim() : '', // <-- Job notes
            received    : received,                                           // <-- Parsed received date
            fulfilled   : fulfilled,                                          // <-- Parsed fulfilled date
            allocated   : allocated,                                          // <-- Numeric allocated hours or null
            taken       : taken,                                              // <-- Absolute time card hours or null
            net         : timing.hasAbsolute ? timing.net : null,             // <-- In-scope hours after offsets
            offsets     : timing.offsets,                                     // <-- Total out-of-scope hours
            offsetsByKey: timing.offsetsByKey,                                // <-- Out-of-scope hours per category
            hasOffsets  : timing.hasAdjustments,                              // <-- Whether this job records offsets
            reviewed    : allocated !== null && taken !== null,               // <-- Job has complete time data
            turnaround  : countBusinessDays(received, fulfilled),             // <-- Working days start to delivery (weekends excluded)
            imageCount  : images.length,                                      // <-- Images published for this job
            modelCount  : models.length,                                      // <-- GLB assets published for this job
            hasWatercolour : images.some(i => String(i).includes('_ART20__')), // <-- Watercolour artwork present
            isVariant   : /Scheme-\d+/i.test(project.__folderPath || project.folderId || '') // <-- Alternative scheme of a base job
        };
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Derive Delivery Year From Folder Path or Dates
    // ---------------------------------------------------------------
    function deriveJobYear(project, fulfilled) {
        const path = project.__folderPath || project.folderId || project.basePath || ''; // <-- Best available path hint
        const match = String(path).match(/(^|\/)(20\d{2})(\/|$)/);            // <-- Extract the year folder segment
        if (match) return match[2];                                           // <-- Folder year wins (matches library layout)
        if (fulfilled) return String(fulfilled.getFullYear());                // <-- Fall back to delivery date year
        return 'Unknown';                                                     // <-- Nothing usable available
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Format a Day Count With Correct Pluralisation
    // ---------------------------------------------------------------
    function formatDays(value) {
        return `${value} ${value === 1 ? 'day' : 'days'}`;                     // <-- "1 day" not "1 days"; always working days
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Round a Number to One Decimal Place for Display
    // ---------------------------------------------------------------
    function round1(value) {
        return Math.round((value || 0) * 10) / 10;                            // <-- Keeps float sums readable in tables
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Calculate the Median of a Numeric Array
    // ---------------------------------------------------------------
    function calculateMedian(values) {
        if (!values.length) return 0;                                         // <-- Guard empty input
        const sorted = [...values].sort((a, b) => a - b);                     // <-- Sort ascending without mutating
        const mid = Math.floor(sorted.length / 2);                            // <-- Midpoint index
        return sorted.length % 2                                              // <-- Odd length takes middle value
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2;                            // <-- Even length averages the pair
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Build Headline KPI Metrics
    // ---------------------------------------------------------------
    function buildHeadlineMetrics(jobs) {
        const reviewed      = jobs.filter(j => j.reviewed);                   // <-- Jobs with complete time data
        const delivered     = jobs.filter(j => j.fulfilled);                  // <-- Jobs with a delivery date
        const turnarounds   = jobs.map(j => j.turnaround).filter(t => t !== null); // <-- Valid turnaround durations
        const hoursTaken    = reviewed.reduce((sum, j) => sum + j.taken, 0);  // <-- Absolute time card hours
        const hoursNet      = reviewed.reduce((sum, j) => sum + j.net, 0);    // <-- In-scope hours after offsets
        const hoursOffset   = reviewed.reduce((sum, j) => sum + j.offsets, 0); // <-- Out-of-scope hours deducted
        const hoursAlloc    = reviewed.reduce((sum, j) => sum + j.allocated, 0); // <-- Total hours quoted
        const offsetJobs    = jobs.filter(j => j.hasOffsets);                 // <-- Jobs that record any offset
        const artists       = new Set(jobs.map(j => j.artist).filter(Boolean)); // <-- Distinct concept artists
        const designers     = new Set(jobs.map(j => j.designer).filter(d => d !== 'Not Recorded')); // <-- Distinct designers
        const dates         = delivered.map(j => j.fulfilled).sort((a, b) => a - b); // <-- Delivery dates in order
        const currentYear   = String(new Date().getFullYear());               // <-- Current calendar year key
        const spanMonths    = dates.length                                     // <-- Months of operation covered
            ? Math.max(1, Math.round((dates[dates.length - 1] - dates[0]) / 2629800000))
            : 1;

        return {
            totalJobs       : jobs.length,                                    // <-- Every job in the library
            jobsThisYear    : jobs.filter(j => j.year === currentYear).length, // <-- Jobs logged in the current year
            reviewedJobs    : reviewed.length,                                // <-- Jobs with signed off time data
            awaitingReview  : jobs.length - reviewed.length,                  // <-- Jobs still missing time data
            hoursTaken      : Math.round(hoursTaken * 10) / 10,               // <-- Absolute delivered hours
            hoursNet        : Math.round(hoursNet * 10) / 10,                 // <-- In-scope delivered hours
            hoursOffset     : Math.round(hoursOffset * 10) / 10,              // <-- Hours deducted as out of scope
            offsetJobCount  : offsetJobs.length,                              // <-- Jobs recording an offset
            usesOffsets     : hoursOffset > 0,                                // <-- Whether offsets are in play anywhere
            hoursAllocated  : Math.round(hoursAlloc * 10) / 10,               // <-- Total quoted hours
            hoursVariance   : Math.round((hoursNet - hoursAlloc) * 10) / 10,  // <-- Net over or under the quote
            absoluteVariance: Math.round((hoursTaken - hoursAlloc) * 10) / 10, // <-- Absolute over or under the quote
            efficiencyPct   : hoursNet > 0 ? Math.round((hoursAlloc / hoursNet) * 100) : 100, // <-- Quote vs net in-scope
            absoluteEffPct  : hoursTaken > 0 ? Math.round((hoursAlloc / hoursTaken) * 100) : 100, // <-- Quote vs absolute time card
            avgHoursPerJob  : reviewed.length ? Math.round((hoursNet / reviewed.length) * 10) / 10 : 0, // <-- Mean in-scope job size
            avgAbsPerJob    : reviewed.length ? Math.round((hoursTaken / reviewed.length) * 10) / 10 : 0, // <-- Mean absolute job size
            avgTurnaround   : turnarounds.length ? Math.round((turnarounds.reduce((s, t) => s + t, 0) / turnarounds.length) * 10) / 10 : 0, // <-- Mean days
            medianTurnaround: calculateMedian(turnarounds),                    // <-- Typical days start to delivery
            sameWeekPct     : turnarounds.length ? Math.round((turnarounds.filter(t => t <= WORKING_WEEK_DAYS).length / turnarounds.length) * 100) : 0, // <-- Delivered inside one working week
            artistCount     : artists.size,                                    // <-- Concept artists contributing
            designerCount   : designers.size,                                  // <-- Designers requesting work
            jobsPerMonth    : Math.round((delivered.length / spanMonths) * 10) / 10, // <-- Average monthly throughput
            firstDelivery   : dates.length ? dates[0] : null,                  // <-- Earliest recorded delivery
            lastDelivery    : dates.length ? dates[dates.length - 1] : null    // <-- Most recent recorded delivery
        };
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Group Jobs by an Arbitrary Key and Summarise
    // ---------------------------------------------------------------
    function buildBreakdownRows(jobs, keyFn) {
        const groups = {};                                                     // <-- Accumulator keyed by group label

        jobs.forEach(job => {                                                  // <-- Fold every job into its group
            const key = keyFn(job) || 'Unclassified';                         // <-- Resolve the group label
            if (!groups[key]) {                                                // <-- Seed a fresh group entry
                groups[key] = { key: key, count: 0, hours: 0, netHours: 0, offsetHours: 0, allocHours: 0, hoursJobs: 0, turnarounds: [], images: 0, models: 0 };
            }
            const g = groups[key];                                             // <-- Group reference
            g.count++;                                                         // <-- Count the job
            g.images += job.imageCount;                                        // <-- Accumulate published images
            g.models += job.modelCount;                                        // <-- Accumulate published 3D assets
            if (job.reviewed) {                                                // <-- Only reviewed jobs carry hours
                g.hours       += job.taken;                                    // <-- Absolute time card hours
                g.netHours    += job.net;                                      // <-- In-scope hours after offsets
                g.offsetHours += job.offsets;                                  // <-- Out-of-scope hours deducted
                g.allocHours  += job.allocated;                                // <-- Hours quoted
                g.hoursJobs++;
            }
            if (job.turnaround !== null) g.turnarounds.push(job.turnaround);   // <-- Collect turnaround samples
        });

        const total = jobs.length || 1;                                        // <-- Denominator for share calculation

        return Object.values(groups)
            .map(g => ({
                key         : g.key,                                           // <-- Group label
                count       : g.count,                                         // <-- Jobs in this group
                share       : Math.round((g.count / total) * 1000) / 10,       // <-- Percentage of the library
                hours       : Math.round(g.hours * 10) / 10,                   // <-- Absolute hours delivered by this group
                netHours    : Math.round(g.netHours * 10) / 10,               // <-- In-scope hours after offsets
                offsetHours : Math.round(g.offsetHours * 10) / 10,            // <-- Out-of-scope hours deducted
                allocHours  : Math.round(g.allocHours * 10) / 10,             // <-- Hours quoted for this group
                efficiency  : g.netHours > 0 ? Math.round((g.allocHours / g.netHours) * 100) : 0, // <-- Quote vs net in-scope
                avgHours    : g.hoursJobs ? Math.round((g.netHours / g.hoursJobs) * 10) / 10 : 0, // <-- Mean in-scope job size
                avgAbsHours : g.hoursJobs ? Math.round((g.hours / g.hoursJobs) * 10) / 10 : 0, // <-- Mean absolute job size
                avgTurnaround : g.turnarounds.length ? Math.round((g.turnarounds.reduce((s, t) => s + t, 0) / g.turnarounds.length) * 10) / 10 : 0, // <-- Mean days
                images      : g.images,                                        // <-- Images published
                models      : g.models                                         // <-- 3D assets published
            }))
            .sort((a, b) => b.count - a.count);                                // <-- Busiest group first
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Build Monthly Delivery Throughput Series
    // ---------------------------------------------------------------
    function buildMonthlyThroughput(jobs) {
        const buckets = {};                                                    // <-- Accumulator keyed by YYYY-MM

        jobs.filter(j => j.fulfilled).forEach(job => {                          // <-- Only delivered jobs land on the chart
            const d   = job.fulfilled;                                          // <-- Delivery date
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // <-- Sortable month key
            if (!buckets[key]) {                                                // <-- Seed a fresh month bucket
                buckets[key] = { key: key, date: new Date(d.getFullYear(), d.getMonth(), 1), count: 0, hours: 0, netHours: 0, offsetHours: 0, allocHours: 0 };
            }
            buckets[key].count++;                                               // <-- Count the delivery
            if (job.reviewed) {                                                 // <-- Accumulate hours for reviewed jobs
                buckets[key].hours       += job.taken;                          // <-- Absolute time card hours
                buckets[key].netHours    += job.net;                            // <-- In-scope hours
                buckets[key].offsetHours += job.offsets;                        // <-- Out-of-scope hours
                buckets[key].allocHours  += job.allocated;                      // <-- Hours quoted, for the efficiency trend
            }
        });

        return Object.values(buckets)
            .sort((a, b) => a.date - b.date)                                    // <-- Chronological order
            .slice(-MONTHS_ON_CHART)                                            // <-- Trim to the trailing window
            .map(b => ({
                key     : b.key,                                                // <-- YYYY-MM key
                date    : b.date,                                               // <-- First of month date object
                label   : b.date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), // <-- Axis label
                count       : b.count,                                          // <-- Jobs delivered
                hours       : Math.round(b.hours * 10) / 10,                    // <-- Absolute hours delivered
                netHours    : Math.round(b.netHours * 10) / 10,                 // <-- In-scope hours delivered
                offsetHours : Math.round(b.offsetHours * 10) / 10,              // <-- Out-of-scope hours deducted
                allocHours  : Math.round(b.allocHours * 10) / 10,               // <-- Hours quoted this month
                efficiency  : b.netHours > 0                                    // <-- Quote vs net in-scope, this month
                    ? Math.round((b.allocHours / b.netHours) * 100)
                    : null
            }));
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Build Asset Library Metrics
    // ---------------------------------------------------------------
    function buildAssetMetrics(jobs) {
        const totalImages   = jobs.reduce((sum, j) => sum + j.imageCount, 0);  // <-- Every published image
        const totalModels   = jobs.reduce((sum, j) => sum + j.modelCount, 0);  // <-- Every published GLB asset
        const with3d        = jobs.filter(j => j.modelCount > 0).length;       // <-- Jobs viewable in ValeVision3D
        const withImages    = jobs.filter(j => j.imageCount > 0).length;       // <-- Jobs with at least one image

        return {
            totalImages     : totalImages,                                      // <-- Library image count
            avgImages       : jobs.length ? Math.round((totalImages / jobs.length) * 10) / 10 : 0, // <-- Mean per job
            richestJob      : jobs.slice().sort((a, b) => b.imageCount - a.imageCount)[0] || null, // <-- Largest image set
            totalModels     : totalModels,                                      // <-- Library GLB count
            jobsWith3d      : with3d,                                           // <-- Jobs with a 3D model
            pctWith3d       : jobs.length ? Math.round((with3d / jobs.length) * 100) : 0, // <-- 3D coverage
            jobsWithImages  : withImages,                                       // <-- Jobs with imagery
            missingImages   : jobs.length - withImages,                          // <-- Jobs with no imagery at all
            watercolourJobs : jobs.filter(j => j.hasWatercolour).length,        // <-- Jobs with ART20 watercolour work
            variantJobs     : jobs.filter(j => j.isVariant).length              // <-- Alternative scheme entries
        };
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Build ValeVision3D Feature Adoption Coverage
    // ---------------------------------------------------------------
    function buildFeatureAdoption(loadedProjects) {
        const total = loadedProjects.length || 1;                              // <-- Denominator for coverage percentages

        const checks = [                                                        // <-- Feature key and friendly label pairs
            { label: '3D Models Published',      test: p => (p.valeVision_ModelUrls || []).length > 0 || !!p.valeVision_ModelUrl },
            { label: 'Default Camera Set',       test: p => !!(p.Camera__DefaultPosition || p.valeVision_Camera__DefaultPosition) },
            { label: 'Orbit Target Set',         test: p => !!p.OrbitHelperCube__Position },
            { label: 'Fog Plane Configured',     test: p => !!p.FogPlane__Config },
            { label: 'Walk / Fly Modes Enabled', test: p => !!p.Navmode__EnabledModes },
            { label: 'SketchUp Scenes Imported', test: p => !!p.ValeVison3D__SketchUpCameraData },
            { label: 'Cross Section Configured', test: p => !!p.CrossSection__Config },
            { label: 'Presentation Scenes Saved', test: p => !!p.PresentationMode__SavedCameraScenes },
            { label: 'Render Engine Overridden', test: p => !!p.RenderEngine__Config },
            { label: 'Video Studio Content',     test: p => !!p.VideoStudio__Config }
        ];

        return checks.map(c => {                                                // <-- Evaluate each feature across the library
            const count = loadedProjects.filter(c.test).length;                 // <-- Jobs carrying this feature
            return {
                label   : c.label,                                              // <-- Feature name
                count   : count,                                                // <-- Jobs with the feature
                share   : Math.round((count / total) * 1000) / 10               // <-- Coverage percentage
            };
        });
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Build Per Artist Absolute vs Net Productivity Rows
    // ---------------------------------------------------------------
    // Drives the productivity charts. Unlike the legacy artist stats
    // this is built from the same job records as the rest of the
    // overview, so the two never disagree on which jobs are counted.
    // ---------------------------------------------------------------
    function buildArtistNetRows(jobs) {
        const groups = {};                                                      // <-- Accumulator keyed by artist name

        jobs.filter(j => j.reviewed && j.artist).forEach(job => {                // <-- Only reviewed jobs with an artist
            if (!groups[job.artist]) {                                           // <-- Seed a fresh artist entry
                groups[job.artist] = { key: job.artist, jobs: 0, absolute: 0, net: 0, offsets: 0, allocated: 0 };
            }
            const g = groups[job.artist];
            g.jobs++;
            g.absolute  += job.taken;                                            // <-- Absolute time card hours
            g.net       += job.net;                                              // <-- In-scope hours
            g.offsets   += job.offsets;                                          // <-- Out-of-scope hours
            g.allocated += job.allocated;                                        // <-- Hours quoted
        });

        return Object.values(groups)
            .map(g => ({
                key             : g.key,                                         // <-- Artist name
                jobs            : g.jobs,                                        // <-- Reviewed jobs completed
                absolute        : Math.round(g.absolute * 10) / 10,              // <-- Absolute time card hours
                net             : Math.round(g.net * 10) / 10,                   // <-- In-scope hours
                offsets         : Math.round(g.offsets * 10) / 10,               // <-- Out-of-scope hours
                allocated       : Math.round(g.allocated * 10) / 10,             // <-- Hours quoted
                scopeEfficiency : g.net > 0 ? Math.round((g.allocated / g.net) * 100) : 0, // <-- Quote vs net in-scope
                absEfficiency   : g.absolute > 0 ? Math.round((g.allocated / g.absolute) * 100) : 0, // <-- Quote vs absolute
                jobsPerDay      : g.net > 0 ? Math.round((g.jobs / (g.net / 7.5)) * 100) / 100 : 0, // <-- Jobs per 7.5h working day of in-scope time
                avgNetPerJob    : g.jobs ? Math.round((g.net / g.jobs) * 10) / 10 : 0 // <-- Mean in-scope hours per job
            }))
            .sort((a, b) => b.jobs - a.jobs);                                    // <-- Most productive first
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Build Data Quality and Backlog Metrics
    // ---------------------------------------------------------------
    function buildDataQualityMetrics(jobs) {
        return [                                                                // <-- Each row is an actionable backlog item
            { label: 'Awaiting Time Review',      count: jobs.filter(j => !j.reviewed).length },
            { label: 'No Job Type Set',           count: jobs.filter(j => j.type === 'Unclassified').length },
            { label: 'No Concept Artist Set',     count: jobs.filter(j => !j.artist).length },
            { label: 'No Designer Recorded',      count: jobs.filter(j => j.designer === 'Not Recorded').length },
            { label: 'No Input Source Recorded',  count: jobs.filter(j => j.input === 'Not Recorded').length },
            { label: 'No Images Published',       count: jobs.filter(j => j.imageCount === 0).length },
            { label: 'No Job Notes Written',      count: jobs.filter(j => !j.notes).length },
            { label: 'Missing Delivery Date',     count: jobs.filter(j => !j.fulfilled).length },
            { label: 'Missing Received Date',     count: jobs.filter(j => !j.received).length }
        ].filter(r => r.count > 0)                                              // <-- Only surface rows needing attention
         .sort((a, b) => b.count - a.count);                                    // <-- Largest backlog first
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Primary Entry Point
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Complete Production KPI Statistics Bundle
    // ------------------------------------------------------------
    // `loadedProjects` is an array of parsed project.json objects. Each may
    // carry a `__folderPath` ("2026/3005__Marten") to pin its delivery year;
    // without one the year falls back to basePath, folderId, then the
    // delivery date.
    // ------------------------------------------------------------
    function na_build_production_kpi_stats(loadedProjects) {
        const projects = Array.isArray(loadedProjects) ? loadedProjects : [];  // <-- Guard bad input
        const jobs     = projects.map(buildJobRecord);                         // <-- Normalise every project

        return {
            generatedFrom   : jobs.length,                                     // <-- Job records analysed
            headline        : buildHeadlineMetrics(jobs),                      // <-- Top level KPI tile values
            typeRows        : buildBreakdownRows(jobs, j => j.type),           // <-- Jobs grouped by project type
            yearRows        : buildBreakdownRows(jobs, j => j.year),           // <-- Jobs grouped by delivery year
            inputRows       : buildBreakdownRows(jobs, j => j.input),          // <-- Jobs grouped by source material
            designerRows    : buildBreakdownRows(jobs, j => j.designer),       // <-- Jobs grouped by requesting designer
            monthly         : buildMonthlyThroughput(jobs),                    // <-- Jobs delivered per calendar month
            assets          : buildAssetMetrics(jobs),                         // <-- Image and 3D asset library totals
            adoption        : buildFeatureAdoption(projects),                  // <-- ValeVision3D feature rollout coverage
            offsets         : na_aggregate_time_adjustments(projects),         // <-- Out-of-scope hour composition
            artistNetRows   : buildArtistNetRows(jobs),                        // <-- Per artist absolute vs net productivity
            dataQuality     : buildDataQualityMetrics(jobs)                    // <-- Records needing attention
        };
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
