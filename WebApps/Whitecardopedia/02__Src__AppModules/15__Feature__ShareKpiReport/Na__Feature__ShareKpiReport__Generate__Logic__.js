// =============================================================================
// WHITECARDOPEDIA - SHARE KPI REPORT - GENERATE AND DOWNLOAD EMAIL HTML
// =============================================================================
//
// FILE       : Na__Feature__ShareKpiReport__Generate__Logic__.js
// NAMESPACE  : Whitecardopedia
// MODULE     : ShareKpiReport
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Turn the live production KPI bundle into a self-contained HTML
//              email file the user can attach, forward or paste into Outlook.
// CREATED    : 18-Aug-2026
//
// DESCRIPTION:
// - Mirrors the ValeVision3D Share Project Link pattern: fetch a tokenised
//   template, substitute, hand the browser a Blob to download.
// - The generated file is a complete standalone .html document. Nothing is
//   sent anywhere by this module; the user chooses what to do with the file.
// - Every URL baked into the output is an absolute production URL. A mail
//   client has no origin to resolve a relative path against, so relative
//   paths would render as broken images and dead links.
//
// TOKENS SUBSTITUTED:
//   __REPORT_PERIOD__, __HEADLINE_TILES__,
//   __DASHBOARD_URL__, __ACCESS_PHRASE__, __GENERATED_ON__
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 18-Aug-2026 - Version 1.0.0
// - Initial release.
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Production Endpoints and Template Location
    // ------------------------------------------------------------
    const NA_KPI_EMAIL_TEMPLATE_URL =
        '02__Src__AppModules/15__Feature__ShareKpiReport/Na__Feature__ShareKpiReport__Email__Template__.html';

    const NA_KPI_DASHBOARD_URL =                                                 // <-- Where the email's button points
        'https://adam-noble-01.github.io/ValeCodebase/WebApps/Whitecardopedia/ValeVision3D__ProductionKpi__.html';

    const NA_KPI_ACCESS_PHRASE = 'VisDptKpi';                                    // <-- Must match the gate on that page
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Email Palette (inline styles only)
    // ------------------------------------------------------------
    const NA_KPI_EMAIL_COLOURS = {
        brand   : '#172b3a',                                                     // <-- Vale navy
        border  : '#cccccc',                                                     // <-- Light border
        muted   : '#656565',                                                     // <-- Secondary text
        wash    : '#f5f5f5',                                                     // <-- Tile background
        good    : '#7d9471',                                                     // <-- Sage accent
        warn    : '#b0846a',                                                     // <-- Clay accent
        red     : '#b03a2e'                                                      // <-- Access phrase emphasis
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Template Loading and Escaping
// -----------------------------------------------------------------------------

    let Na__KpiEmail__TemplatePromise = null;                                    // <-- Fetch the template at most once

    // HELPER FUNCTION | Load the Raw Template Text
    // ------------------------------------------------------------
    function na_kpi_email_load_template() {
        if (!Na__KpiEmail__TemplatePromise) {
            Na__KpiEmail__TemplatePromise = fetch(NA_KPI_EMAIL_TEMPLATE_URL)
                .then(response => {
                    if (!response.ok) throw new Error(`KPI email template fetch failed: ${response.status}`);
                    return response.text();
                });
        }
        return Na__KpiEmail__TemplatePromise;
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Escape Text for HTML Body Context
    // ------------------------------------------------------------
    function na_kpi_email_escape(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Fragment Builders
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build One KPI Tile Cell
    // ------------------------------------------------------------
    function na_kpi_email_tile(label, value, sub, accent) {
        const edge = accent || NA_KPI_EMAIL_COLOURS.brand;                       // <-- Left accent bar colour

        return ''
            + `<td width="33%" style="padding:4px; vertical-align:top;">`
            +   `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" `
            +          `style="background-color:${NA_KPI_EMAIL_COLOURS.wash}; border-left:4px solid ${edge}; border-radius:4px;">`
            +     `<tr><td style="padding:12px 14px;">`
            +       `<div style="font-size:20px; font-weight:600; color:${NA_KPI_EMAIL_COLOURS.brand}; line-height:1.2;">`
            +         na_kpi_email_escape(value)
            +       `</div>`
            +       `<div style="font-size:12px; font-weight:600; color:${NA_KPI_EMAIL_COLOURS.brand};">`
            +         na_kpi_email_escape(label)
            +       `</div>`
            +       (sub ? `<div style="font-size:11px; color:${NA_KPI_EMAIL_COLOURS.muted};">${na_kpi_email_escape(sub)}</div>` : '')
            +     `</td></tr>`
            +   `</table>`
            + `</td>`;
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Build the Headline Tile Grid, Three Per Row
    // ------------------------------------------------------------
    function na_kpi_email_build_tiles(stats) {
        const h = stats.headline;
        const a = stats.assets;

        const tiles = [
            na_kpi_email_tile('Jobs Complete', h.totalJobs, `${h.reviewedJobs} time reviewed`),
            na_kpi_email_tile('Jobs This Year', h.jobsThisYear, `${h.jobsPerMonth} per month average`),
            na_kpi_email_tile('Net Hours Delivered', `${h.hoursNet}h`, `${h.hoursAllocated}h quoted`),
            na_kpi_email_tile(
                '3D Production Efficiency', `${h.efficiencyPct}%`,
                `${h.hoursVariance >= 0 ? '+' : ''}${h.hoursVariance}h vs quote`,
                h.efficiencyPct >= 100 ? NA_KPI_EMAIL_COLOURS.good : NA_KPI_EMAIL_COLOURS.warn
            ),
            na_kpi_email_tile('Median Turnaround', formatDays(h.medianTurnaround), `${h.avgTurnaround} average, working days`),
            na_kpi_email_tile('Delivered In A Week', `${h.sameWeekPct}%`, 'within 5 working days'),
            na_kpi_email_tile('Average Job Size', `${h.avgHoursPerJob}h`, 'per reviewed job'),
            na_kpi_email_tile('3D Ready Jobs', `${a.pctWith3d}%`, `${a.jobsWith3d} of ${h.totalJobs} jobs`),
            na_kpi_email_tile('Images Published', a.totalImages, `${a.avgImages} per job average`)
        ];

        let rows = '';
        for (let i = 0; i < tiles.length; i += 3) {                               // <-- Three tiles to a table row
            rows += `<tr>${tiles.slice(i, i + 3).join('')}</tr>`;
        }
        return rows;
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Generation and Download
// -----------------------------------------------------------------------------

    // FUNCTION | Produce the Finished Email HTML From a KPI Bundle
    // ------------------------------------------------------------
    async function na_kpi_email_generate(stats) {
        const rawTemplate = await na_kpi_email_load_template();                  // <-- Tokenised source
        const h = stats.headline;

        // The template carries a documentation comment that lists the token
        // names. Left in place, a global replace substitutes into that comment
        // as well as the real slot, duplicating every fragment and risking a
        // broken comment if generated markup ever contained "-->". Strip the
        // internal documentation before substituting; it has no business being
        // shipped inside an email anyway.
        const template = rawTemplate.replace(/<!--[\s\S]*?-->/g, '');            // <-- Remove all template comments

        const period = (h.firstDelivery && h.lastDelivery)
            ? `${formatDate(h.firstDelivery)} to ${formatDate(h.lastDelivery)}`
            : 'Full project library';

        const generatedOn = new Date().toLocaleDateString('en-GB', {             // <-- Stamp when the file was made
            day: '2-digit', month: 'short', year: 'numeric'
        });

        const output = template
            .replace(/__REPORT_PERIOD__/g,  na_kpi_email_escape(period))
            .replace(/__HEADLINE_TILES__/g, na_kpi_email_build_tiles(stats))
            .replace(/__DASHBOARD_URL__/g,  NA_KPI_DASHBOARD_URL)
            .replace(/__ACCESS_PHRASE__/g,  na_kpi_email_escape(NA_KPI_ACCESS_PHRASE))
            .replace(/__GENERATED_ON__/g,   na_kpi_email_escape(generatedOn));

        const unsubstituted = output.match(/__[A-Z_]+__/g);                      // <-- Catch a renamed or missing token
        if (unsubstituted) {
            console.warn('KPI email: unsubstituted tokens remain:', unsubstituted);
        }

        return output;
    }
    // ---------------------------------------------------------------

    // FUNCTION | Download an HTML String as a File
    // ------------------------------------------------------------
    function na_kpi_email_download(filename, htmlString) {
        const blob   = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
        const url    = URL.createObjectURL(blob);
        const anchor = document.createElement('a');

        anchor.href = url;
        anchor.download = filename;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);                                                // <-- Release the object URL
    }
    // ---------------------------------------------------------------

    // FUNCTION | Generate and Download in One Step
    // ------------------------------------------------------------
    // Returns the filename written so the caller can confirm it to the user.
    // ------------------------------------------------------------
    async function na_kpi_email_generate_and_download(stats) {
        const html = await na_kpi_email_generate(stats);

        const stamp = new Date().toLocaleDateString('en-GB', {                   // <-- DD-MMM-YYYY, matching Vale file naming
            day: '2-digit', month: 'short', year: 'numeric'
        }).replace(/ /g, '-');

        const filename = `ValeVision3D__ProductionMetrics__${stamp}__.html`;
        na_kpi_email_download(filename, html);
        return filename;
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
