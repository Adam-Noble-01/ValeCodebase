// =============================================================================
// VALEVISION GALLERY - KPI PROJECT SOURCE LOADER
// =============================================================================
//
// FILE       : Na__AppUtils__KpiProjectSource.js
// NAMESPACE  : ValeVisionGallery
// MODULE     : KpiProjectSource
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Every project record for the 3D Production KPI Report
// CREATED    : 18-Aug-2026
//
// DESCRIPTION:
// - One call to the Gallery API (api/projects?all=1, Management permission)
//   returns every project in the Projects Master Library, hidden ones too,
//   exactly as the old discovery scan counted them.
// - Each project carries __folderPath ("2026/3005__Marten") so the stats
//   engine can pin its delivery year, as before.
//
// PRIMARY ENTRY POINT:
//   na_kpi_load_all_projects(onStatus) -> Promise<Array<project>>
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 06-Oct-2026 - Version 2.0.0
// - App server: the Gallery API replaces the dev-server discovery, the R2 /
//   GitHub Pages master index and the per-project fetches.
//
// 18-Aug-2026 - Version 1.0.0
// - Initial release: discovery API with master index fallback, parallel fetch.
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | KPI Project Source
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Never-Real Jobs
    // ------------------------------------------------------------
    const NA_KPI_SOURCE_EXCLUDED = ['__BACKUP__', '01__TemplateProject', '00__ExampleProject', '12345__ExampleProject'];
    // ------------------------------------------------------------


    // FUNCTION | Load Every Project for the KPI Report
    // ------------------------------------------------------------
    async function na_kpi_load_all_projects(onStatus) {
        const report = typeof onStatus === 'function' ? onStatus : function () {};
        report('Loading projects from the library…');
        const projects = (await loadAllProjectsIncludingDisabled())
            .filter(p => !NA_KPI_SOURCE_EXCLUDED.some(token => String(p.folderId).includes(token)))
            .map(p => Object.assign(p, { __folderPath: `${p.year}/${p.folderId}` }));
        report(`${projects.length} projects loaded.`);
        return projects;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
