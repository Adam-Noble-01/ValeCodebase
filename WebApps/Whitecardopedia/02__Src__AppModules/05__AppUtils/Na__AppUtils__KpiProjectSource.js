// =============================================================================
// WHITECARDOPEDIA - KPI PROJECT SOURCE LOADER
// =============================================================================
//
// FILE       : Na__AppUtils__KpiProjectSource.js
// NAMESPACE  : Whitecardopedia
// MODULE     : KpiProjectSource
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Load every published project.json for the Time Analysis Tool,
//              working both on the localhost dev server and on the public
//              GitHub Pages build.
// CREATED    : 18-Aug-2026
//
// DESCRIPTION:
// - The Time Analysis Tool originally discovered projects through the Flask
//   dev server's /api/projects/discover endpoint and fetched each project.json
//   with a relative path. Neither exists on GitHub Pages, so the tool could
//   only ever run locally.
// - This module tries the discovery API first (fastest when it exists), then
//   falls back to the master index, which lists every project's folder and is
//   published to both R2 and GitHub Pages. The same component therefore runs
//   unchanged in the app and on the external KPI page.
// - Fetches run in parallel. The previous serial loop issued 144 round trips
//   one after another; on a CDN that is the difference between a moment and
//   the better part of a minute.
//
// PRIMARY ENTRY POINT:
//   na_kpi_load_all_projects(onStatus) -> Promise<Array<project>>
//     onStatus(message) is optional and receives human readable progress.
//     Each returned project carries __folderPath ("2026/3005__Marten") so the
//     stats engine can pin its delivery year.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 18-Aug-2026 - Version 1.0.0
// - Initial release: discovery API with master index fallback, parallel fetch.
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Sources and Exclusions
    // ------------------------------------------------------------
    // Production URLs are absolute: the external KPI page is opened from an
    // emailed link and must resolve identically wherever it is served from.
    // ------------------------------------------------------------
    const NA_KPI_SOURCE_DISCOVER_API   = '/api/projects/discover';                // <-- Localhost dev server only
    const NA_KPI_SOURCE_LOCAL_BASE     = 'Projects';                              // <-- Relative path, localhost only

    const NA_KPI_SOURCE_R2_BASE        = 'https://cdn.noble-architecture.com/VaApps/Projects';
    const NA_KPI_SOURCE_GH_BASE        = 'https://adam-noble-01.github.io/ValeCodebase/WebApps/Whitecardopedia/Projects';
    const NA_KPI_SOURCE_INDEX_R2       = 'https://cdn.noble-architecture.com/VaApps/Index/Na__MasterIndex__ProjectLocations__.json';  // <-- Note /Index/: matches AssetUrls__IndexUrl in masterConfig
    const NA_KPI_SOURCE_INDEX_GH       = 'https://adam-noble-01.github.io/ValeCodebase/WebApps/Whitecardopedia/02__Src__AppModules/03__AppData/Na__MasterIndex__ProjectLocations__.json';

    const NA_KPI_SOURCE_EXCLUDED       = ['__BACKUP__', '01__TemplateProject', '00__ExampleProject'];  // <-- Scaffolding, never real jobs
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Fetch Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch JSON From the First Source That Answers
    // ------------------------------------------------------------
    async function na_kpi_source_fetch_first(urls) {
        for (const url of urls) {                                                 // <-- Try each source in priority order
            try {
                const response = await fetch(url, { cache: 'no-store' });          // <-- Never serve a stale copy
                if (response.ok) return await response.json();
            } catch (_) { /* fall through to the next source */ }
        }
        return null;                                                              // <-- Every source exhausted
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Should This Folder Be Skipped
    // ------------------------------------------------------------
    function na_kpi_source_should_skip(folderId) {
        return NA_KPI_SOURCE_EXCLUDED.some(token => String(folderId).includes(token));
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Discovery Strategies
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Discover Folders via the Localhost Dev Server
    // ------------------------------------------------------------
    // Resolves to null (not an error) when the endpoint is absent, which is
    // the normal case on GitHub Pages.
    // ------------------------------------------------------------
    async function na_kpi_source_discover_local() {
        try {
            const response = await fetch(NA_KPI_SOURCE_DISCOVER_API);
            if (!response.ok) return null;

            const data = await response.json();
            if (data.error || !Array.isArray(data.folders)) return null;

            return data.folders.filter(folder => !na_kpi_source_should_skip(folder));
        } catch (_) {
            return null;                                                          // <-- No dev server: use the published index
        }
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Discover Folders via the Published Master Index
    // ------------------------------------------------------------
    async function na_kpi_source_discover_published() {
        const bust  = `?t=${Date.now()}`;                                         // <-- Index changes whenever a project syncs
        const index = await na_kpi_source_fetch_first([
            NA_KPI_SOURCE_INDEX_R2 + bust,
            NA_KPI_SOURCE_INDEX_GH + bust
        ]);

        if (!index || !Array.isArray(index.projects)) return null;

        return index.projects
            .filter(entry => entry && entry.folderId && entry.enabled !== false)   // <-- Hidden projects stay hidden
            .map(entry => entry.folderId)
            .filter(folderId => !na_kpi_source_should_skip(folderId));
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Primary Entry Point
// -----------------------------------------------------------------------------

    // FUNCTION | Load Every Published Project
    // ------------------------------------------------------------
    // Returns an array of parsed project.json objects, each stamped with
    // __folderPath. Unreachable records are dropped rather than failing the
    // whole load: one missing project should not blank the dashboard.
    // ------------------------------------------------------------
    async function na_kpi_load_all_projects(onStatus) {
        const report = typeof onStatus === 'function' ? onStatus : function () {}; // <-- Optional progress callback

        report('Locating project library...');

        let folders = await na_kpi_source_discover_local();                        // <-- Dev server first
        let isLocal = folders !== null;

        if (!isLocal) {
            folders = await na_kpi_source_discover_published();                    // <-- Published index fallback
        }

        if (!folders || !folders.length) {
            throw new Error('No project library could be reached.');
        }

        report(`Loading ${folders.length} projects...`);

        const bust = `?t=${Date.now()}`;                                           // <-- Match the index cache-bust

        const loads = folders.map(async folderId => {                              // <-- All fetches in flight together
            const sources = isLocal
                ? [`${NA_KPI_SOURCE_LOCAL_BASE}/${folderId}/project.json`]
                : [
                    `${NA_KPI_SOURCE_R2_BASE}/${folderId}/project.json${bust}`,
                    `${NA_KPI_SOURCE_GH_BASE}/${folderId}/project.json${bust}`
                  ];

            const project = await na_kpi_source_fetch_first(sources);
            if (!project) {
                console.warn(`KPI source: could not load ${folderId}`);            // <-- Visible, but not fatal
                return null;
            }

            project.__folderPath = folderId;                                       // <-- Pin the delivery year
            return project;
        });

        const projects = (await Promise.all(loads)).filter(Boolean);

        if (!projects.length) {
            throw new Error('The project library was reached but no records loaded.');
        }

        return projects;
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
