// =============================================================================
// VALEVISION3D - PAGE LAYOUT SYSTEM - EXPORT NAMING (THE PDF'S FILE NAME)
// =============================================================================
//
// FILE       : Na__PageLayoutSystem__ExportNaming__.js
// NAMESPACE  : Na__PageLayout
// MODULE     : Export Naming
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Name a Drawing Editor PDF from the job, the scheme name or
//              reference the person typed, and the date, and give the address
//              that opens a saved drawing's version again
// CREATED    : 11-Nov-2026
//
// DESCRIPTION:
// - THE FILE NAME (Adam, 11-Nov-2026): {ProjectNo}__{ProjectName}__{UsersNaming}__
//   ValeVisionLayout__11-Nov-2026__.pdf, e.g.
//     60795__Brown__Scheme-2a__Rear-Garden-View__ValeVisionLayout__11-Nov-2026__.pdf
//   The pattern is the config's (PageLayout__PdfExport__Config__FilenamePattern*),
//   with the tokens {ProjectNo} {ProjectName} {Reference} {Date}; the older
//   {project} (the whole library id) and {layout} (the reference) still work.
// - THE JOB comes from its library id, which is the name everybody sees
//   ("60795__Brown__Scheme-2a"): the number is the digits of the first part
//   (VB-60009 gives 60009, as the record's projectCode does), the name is the rest,
//   scheme suffix and all, so two schemes of one job never share a file name.
// - THE REFERENCE keeps its words and its case; anything that is not a letter or
//   a digit becomes one dash ("Rear View (Option A)" gives Rear-View-Option-A).
// - A part with nothing in it is left out, never left as an empty "____".
// - A LEAF: no imports and no state, so Node can test it and any page can use it.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Nov-2026 - Version 1.0.0 (ValeVision3D v2.94.0)
// - Initial build: the export dialog's file name and the version address.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Dates as the Practice Writes Them (11-Nov-2026)
    // ------------------------------------------------------------
    const Na__PageLayout__Naming__MONTHS = Object.freeze(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Patterns When the Config Has None
    // ------------------------------------------------------------
    const Na__PageLayout__Naming__PATTERN_FULL  = '{ProjectNo}__{ProjectName}__{Reference}__ValeVisionLayout__{Date}__.pdf';
    const Na__PageLayout__Naming__PATTERN_IMAGE = '{ProjectNo}__{ProjectName}__{Reference}__ValeVisionLayout__ImageOnly__{Date}__.pdf';
    const Na__PageLayout__Naming__SEPARATOR     = '__';                         // <-- Between the parts of a file name
    const Na__PageLayout__Naming__MAX_REFERENCE = 60;                           // <-- Characters of the reference in a file name
    const Na__PageLayout__Naming__MAX_LENGTH    = 180;                          // <-- The whole file name (the server keeps 200)
    // ------------------------------------------------------------

    // MODULE CONSTANTS | The Two PDFs (the Server's Export__Kind Words)
    // ------------------------------------------------------------
    const Na__PageLayout__Naming__KIND = Object.freeze({
        full  : 'Full layout',
        image : 'Image only'
    });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Words as One File Name Part: Letters, Digits, Single Dashes ('' When None Are Left)
    // ------------------------------------------------------------
    function Na__PageLayout__Naming__Slug(text, maxLength) {
        const limit = Number.isFinite(maxLength) && maxLength > 0 ? maxLength : Na__PageLayout__Naming__MAX_REFERENCE;
        return String(text || '')
            .normalize('NFKD').replace(/[̀-ͯ]/g, '')                  // <-- Accents dropped: Cafe for Café
            .replace(/[^A-Za-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, limit)
            .replace(/-+$/g, '');
    }
    // ------------------------------------------------------------


    // FUNCTION | The Job's Number and Name From Its Library Id ('60795__Brown__Scheme-2a')
    // ------------------------------------------------------------
    // { number : '60795', name : 'Brown__Scheme-2a' }. A path (<year>/<id>)
    // gives its last part. An id with no digits in its first part keeps that
    // part as its number.
    // ------------------------------------------------------------
    function Na__PageLayout__Naming__ProjectParts(projectId) {
        const id    = String(projectId || '').split('/').pop().trim();
        if (!id) return { number : '', name : '' };
        const parts = id.split(Na__PageLayout__Naming__SEPARATOR).filter(Boolean);
        const first = parts.shift() || '';
        const digits = (first.match(/\d+/g) || []).join('');
        const name  = parts.map((part) => part.replace(/[^A-Za-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')).filter(Boolean).join(Na__PageLayout__Naming__SEPARATOR);
        return { number : digits || Na__PageLayout__Naming__Slug(first, 40), name : name };
    }
    // ------------------------------------------------------------


    // FUNCTION | A Date as the Practice Writes It (11-Nov-2026), Local Time
    // ------------------------------------------------------------
    function Na__PageLayout__Naming__Date(date) {
        const when = (date instanceof Date && !Number.isNaN(date.getTime())) ? date : new Date();
        return `${String(when.getDate()).padStart(2, '0')}-${Na__PageLayout__Naming__MONTHS[when.getMonth()]}-${when.getFullYear()}`;
    }
    // ------------------------------------------------------------


    // FUNCTION | The PDF's File Name
    // ------------------------------------------------------------
    // options: { pattern, projectId, reference, date, isFullLayout }. The
    // pattern defaults to the house one for the kind. Empty parts are left out.
    // ------------------------------------------------------------
    function Na__PageLayout__Naming__FileName(options = {}) {
        const isFull  = options.isFullLayout !== false;
        const pattern = (typeof options.pattern === 'string' && options.pattern.trim())
            ? options.pattern.trim()
            : (isFull ? Na__PageLayout__Naming__PATTERN_FULL : Na__PageLayout__Naming__PATTERN_IMAGE);
        const job       = Na__PageLayout__Naming__ProjectParts(options.projectId);
        const reference = Na__PageLayout__Naming__Slug(options.reference) || 'Drawing';
        const values    = {
            '{ProjectNo}'   : job.number,
            '{ProjectName}' : job.name,
            '{Reference}'   : reference,
            '{Date}'        : Na__PageLayout__Naming__Date(options.date),
            '{project}'     : [job.number, job.name].filter(Boolean).join(Na__PageLayout__Naming__SEPARATOR),
            '{layout}'      : reference
        };
        let name = pattern.replace(/\{ProjectNo\}|\{ProjectName\}|\{Reference\}|\{Date\}|\{project\}|\{layout\}/g, (token) => values[token] || '');

        // PARTS | Empty ones go; the extension stays the last
        // ------------------------------------------------------------
        const parts = name.split(Na__PageLayout__Naming__SEPARATOR);
        const last  = parts.pop();
        name = parts.filter((part) => part.replace(/[\s_-]+/g, '') !== '').concat([last]).join(Na__PageLayout__Naming__SEPARATOR);
        name = name.replace(/^_+/, '');
        if (!/\.pdf$/i.test(name)) name += '.pdf';
        if (name.length > Na__PageLayout__Naming__MAX_LENGTH) name = name.slice(0, Na__PageLayout__Naming__MAX_LENGTH - 4) + '.pdf';
        return name;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Same Name Split for Show: [{ text, isReference }] (the Reference Marked)
    // ------------------------------------------------------------
    function Na__PageLayout__Naming__Parts(fileName, reference) {
        const slug  = Na__PageLayout__Naming__Slug(reference) || 'Drawing';
        const out   = [];
        String(fileName || '').split(Na__PageLayout__Naming__SEPARATOR).forEach((part, index) => {
            if (index > 0) out.push({ text : Na__PageLayout__Naming__SEPARATOR, isSeparator : true });
            out.push({ text : part, isReference : part === slug });
        });
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is This the Name Every New Drawing Starts With (So Not Yet a Real Reference)?
    // ------------------------------------------------------------
    function Na__PageLayout__Naming__IsPlaceholder(name, defaultName) {
        const text = String(name || '').trim().toLowerCase();
        return !text || text === String(defaultName || '').trim().toLowerCase();
    }
    // ------------------------------------------------------------


    // FUNCTION | The App's Address That Opens a Saved Drawing (and a Version of It) Again
    // ------------------------------------------------------------
    // appPath: the app's path ('/valevision/'). Answers '' without a project.
    // '/valevision/?project=60795__Brown__Scheme-2a&page=drawing&layout=PL-...&version=3'
    // ------------------------------------------------------------
    function Na__PageLayout__Naming__DrawingPath(appPath, projectId, layoutId, versionNumber) {
        const project = String(projectId || '').split('/').pop();
        if (!project) return '';
        const params = new URLSearchParams();
        params.set('project', project);
        params.set('page', 'drawing');
        if (layoutId) params.set('layout', String(layoutId));
        if (layoutId && Number.isInteger(versionNumber) && versionNumber > 0) params.set('version', String(versionNumber));
        return `${String(appPath || '/').replace(/\/?$/, '/')}?${params.toString()}`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Export Naming API
    // ------------------------------------------------------------
    export {
        Na__PageLayout__Naming__KIND,
        Na__PageLayout__Naming__Slug,
        Na__PageLayout__Naming__ProjectParts,
        Na__PageLayout__Naming__Date,
        Na__PageLayout__Naming__FileName,
        Na__PageLayout__Naming__Parts,
        Na__PageLayout__Naming__IsPlaceholder,
        Na__PageLayout__Naming__DrawingPath
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
