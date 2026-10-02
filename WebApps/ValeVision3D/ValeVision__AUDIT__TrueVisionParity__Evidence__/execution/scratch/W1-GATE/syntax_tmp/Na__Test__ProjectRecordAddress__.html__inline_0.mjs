

    // -------------------------------------------------------------------------
    // REGION | The Modules Under Test, Loaded As the App Loads Them
    // -------------------------------------------------------------------------
    // The two modules under test come fresh (a cache-busting query). What they
    // import resolves to the same copies this page imports by their plain
    // addresses, so the project data registered below is the data they read.
    // -------------------------------------------------------------------------

    const SRC      = '../02__Src__AppModules/';
    const FRESH    = '?cachebust=' + Date.now();
    const loader   = await import(SRC + '03__AppUtils/Na__AppUtils__ProjectLoader.js');
    const facade   = await import(SRC + '80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js');
    const scenes   = await import(SRC + '21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js');
    const record   = await import(SRC + '51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__ProjectRecord__.js' + FRESH);
    const drawings = await import(SRC + '40__System__DrawingViewCore/Na__DrawView__ProjectData__.js' + FRESH);

    // -------------------------------------------------------------------------
    // REGION | The Fixture: 2026/3047__Doous As the App Loads It, and the Master Index
    // -------------------------------------------------------------------------

    const FOLDER_ID = '2026/3047__Doous';
    const CODE      = '3047';
    const TOKENS    = [ FOLDER_ID, CODE, '3047__Doous' ];                        // <-- The three ways ValeVision is opened
    const UNKNOWN   = '2099/0000__NoSuchProject';
    const DECOY     = 'PRESENTATION BLOCK - must never print';
    const INDEX_URL = '/Whitecardopedia/02__Src__AppModules/03__AppData/Na__MasterIndex__ProjectLocations__.json';
    const PAGE_PATH = location.pathname;

    const clone = (value) => JSON.parse(JSON.stringify(value));
    const tick  = () => new Promise((done) => setTimeout(done, 0));
    const esc   = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const shown = (value) => (value === null) ? 'null' : (value === '') ? '(empty)' : String(value);

    // OPEN A CASE | the URL chooses the project, as it does in the app; the
    // project data and the presentation block are registered where the
    // loading sequence registers them.
    function Open(token, projectData, presentationExtra) {
        history.replaceState(null, '', PAGE_PATH + (token ? '?project=' + token : ''));
        facade.Na__CfApi__SetLoadedProjectData(projectData || null);
        const block = projectData ? clone(projectData.PresentationMode__SavedCameraScenes || {}) : null;
        if (block && presentationExtra) Object.assign(block, presentationExtra);
        scenes.Na__PresentationMode__ProjectJson__SetActiveConfig(block, token || null);
        record.Na__LeRecord__Reset();
    }

    // -------------------------------------------------------------------------
    // REGION | Run
    // -------------------------------------------------------------------------

    const out   = document.getElementById('out');
    const cases = [];
    out.innerHTML = '';

    function Heading(text) {
        const h2 = document.createElement('h2');
        h2.textContent = text;
        out.appendChild(h2);
    }

    // A row is { label, actual, expected, ok? }; ok defaults to actual === expected.
    function Report(name, rows) {
        const checked = rows.map((row) => Object.assign({}, row, { ok : ('ok' in row) ? row.ok : row.actual === row.expected }));
        const ok      = checked.every((row) => row.ok);
        cases.push({ name, ok, rows : checked.map((row) => ({ label : row.label, actual : shown(row.actual), expected : shown(row.expected), ok : row.ok })) });
        const block = document.createElement('div');
        block.className = 'case';
        block.innerHTML =
              `<div class="name">${esc(name)}</div>`
            + checked.map((row) =>
                  `<div class="row"><span class="k">${esc(row.label)}</span>${esc(shown(row.actual))}`
                + (row.ok ? '' : ` &nbsp;<span class="fail">expected ${esc(shown(row.expected))}</span>`) + '</div>').join('')
            + `<div class="row"><span class="k">result</span><span class="${ok ? 'pass' : 'fail'}">${ok ? 'PASS' : 'FAIL'}</span></div>`;
        out.appendChild(block);
        console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}`);
    }

    try {
        const DOOUS = await (await fetch('/api/projects/' + FOLDER_ID, { cache : 'no-store' })).json();
        const INDEX = await (await fetch(INDEX_URL, { cache : 'no-store' })).json();
        loader.Na__AppUtils__InitFromConfig({ ProjectData__AssetUrls : {
            ProjectData__AssetUrls__IndexUrl         : INDEX_URL,
            ProjectData__AssetUrls__IndexFallbackUrl : INDEX_URL
        } });
        await loader.Na__AppUtils__InitMasterIndex();

        // ---------------------------------------------------------------------
        // A. Where the title block's client and site address come from
        // ---------------------------------------------------------------------
        Heading('A. The client and the site address (Na__LeRecord__Fetch)');

        {
            const project = clone(DOOUS);
            project.siteAddress       = '  1 Test Lane, Testville, TE1 1ST  ';
            project.clientDrawingName = { salutation : 'Mr', initial : 'J.', surname : 'Doous' };
            Open(FOLDER_ID, project, { siteAddress : DECOY, clientDrawingName : DECOY });
            const got = await record.Na__LeRecord__Fetch();
            Report('A1 Root siteAddress and clientDrawingName (in parts) seed the Common fields; the presentation block\'s are ignored', [
                { label : 'site address', actual : got.SiteAddress, expected : '1 Test Lane, Testville, TE1 1ST' },
                { label : 'client',       actual : got.Client,      expected : 'Mr J. Doous' }
            ]);
        }
        {
            const project = clone(DOOUS);
            project.siteAddress       = 'Unit 2, Example Park, Testville';
            project.clientDrawingName = '  The Doous Family  ';
            Open(CODE, project, { siteAddress : DECOY, clientDrawingName : DECOY });
            const got = await record.Na__LeRecord__Fetch();
            Report('A2 A client written as one string is printed as written, trimmed', [
                { label : 'site address', actual : got.SiteAddress, expected : 'Unit 2, Example Park, Testville' },
                { label : 'client',       actual : got.Client,      expected : 'The Doous Family' }
            ]);
        }
        {
            Open(FOLDER_ID, clone(DOOUS), { siteAddress : DECOY, clientDrawingName : DECOY });
            const got = await record.Na__LeRecord__Fetch();
            Report('A3 Only the presentation block carries them: nothing seeds (the presentation block is never read)', [
                { label : 'site address', actual : got.SiteAddress, expected : '' },
                { label : 'client',       actual : got.Client,      expected : '' }
            ]);
        }
        {
            Open(FOLDER_ID, clone(DOOUS));
            const got = await record.Na__LeRecord__Fetch();
            Report('A4 2026/3047__Doous as it stands: neither key anywhere, so the pack seeds from its own sheets', [
                { label : 'site address', actual : got.SiteAddress, expected : '' },
                { label : 'client',       actual : got.Client,      expected : '' }
            ]);
        }
        {
            Open(FOLDER_ID, null);
            const got = await record.Na__LeRecord__Fetch();
            Report('A5 No project data registered: empty strings, and the promise still resolves', [
                { label : 'site address', actual : got.SiteAddress, expected : '' },
                { label : 'client',       actual : got.Client,      expected : '' }
            ]);
        }

        // ---------------------------------------------------------------------
        // B. The document code, and the save token beside it
        // ---------------------------------------------------------------------
        Heading('B. The document code (Na__DrawData__GetDocumentCode) and the save token (Na__DrawData__GetProjectCode)');

        for (const token of TOKENS) {
            Open(token, clone(DOOUS));
            Report(`B1 ?project=${token} - from the loaded project.json`, [
                { label : 'GetDocumentCode()',             actual : drawings.Na__DrawData__GetDocumentCode(), expected : CODE },
                { label : 'GetProjectCode() - the token',  actual : drawings.Na__DrawData__GetProjectCode(),  expected : token }
            ]);
        }
        for (const token of TOKENS) {
            Open(token, null);
            const first = drawings.Na__DrawData__GetDocumentCode();               // <-- The first ask hands the settled index over; it may still be null
            await tick();
            Report(`B2 ?project=${token} - no project data: the master-index entry answers`, [
                { label : 'first call (null or the code, never the folder)', actual : first, expected : 'null or ' + CODE, ok : first === null || first === CODE },
                { label : 'GetDocumentCode()',             actual : drawings.Na__DrawData__GetDocumentCode(), expected : CODE },
                { label : 'GetProjectCode() - the token',  actual : drawings.Na__DrawData__GetProjectCode(),  expected : token }
            ]);
        }
        {
            const prefixed = (Array.isArray(INDEX.projects) ? INDEX.projects : []).find((entry) => entry && entry.folderId && entry.projectCode
                && String(entry.folderId.split('/')[1] || '').split('__')[0] !== String(entry.projectCode));
            if (prefixed) {
                Open(prefixed.folderId, null);
                drawings.Na__DrawData__GetDocumentCode();
                await tick();
                Report(`B3 ?project=${prefixed.folderId} - a folder whose name carries a prefix: the index's code, not the folder's`, [
                    { label : 'GetDocumentCode()',            actual : drawings.Na__DrawData__GetDocumentCode(), expected : String(prefixed.projectCode) },
                    { label : 'GetProjectCode() - the token', actual : drawings.Na__DrawData__GetProjectCode(),  expected : prefixed.folderId }
                ]);
            }
        }
        {
            Open(UNKNOWN, null);
            drawings.Na__DrawData__GetDocumentCode();
            await tick();
            Report(`B4 ?project=${UNKNOWN} - a token nothing knows: null, never the token`, [
                { label : 'GetDocumentCode()',            actual : drawings.Na__DrawData__GetDocumentCode(), expected : null },
                { label : 'GetProjectCode() - the token', actual : drawings.Na__DrawData__GetProjectCode(),  expected : UNKNOWN }
            ]);
        }
        {
            const numeric = clone(DOOUS);  numeric.projectCode = 9047;                // <-- Test values the index cannot answer for
            const padded  = clone(DOOUS);  padded.projectCode  = '  9047  ';
            const blank   = clone(DOOUS);  blank.projectCode   = '';
            Open(FOLDER_ID, numeric);
            const fromNumber = drawings.Na__DrawData__GetDocumentCode();
            Open(FOLDER_ID, padded);
            const fromPadded = drawings.Na__DrawData__GetDocumentCode();
            Open(CODE, blank);
            const fromBlank  = drawings.Na__DrawData__GetDocumentCode();
            Report('B5 The code as written in project.json: a number, padding, or blank (the index answers)', [
                { label : 'projectCode 9047 (a number)',     actual : fromNumber, expected : '9047' },
                { label : 'projectCode "  9047  "',          actual : fromPadded, expected : '9047' },
                { label : 'projectCode "" at ?project=3047', actual : fromBlank,  expected : CODE }
            ]);
        }
        {
            const own = clone(DOOUS);  own.projectCode = 'TEST-3047';
            Open(CODE, own);
            Report('B6 The loaded project.json\'s own code comes first; the index is only the fallback', [
                { label : 'GetDocumentCode() with projectCode "TEST-3047"', actual : drawings.Na__DrawData__GetDocumentCode(), expected : 'TEST-3047' },
                { label : 'GetProjectCode() - the token',                   actual : drawings.Na__DrawData__GetProjectCode(),  expected : CODE }
            ]);
        }

    } catch (error) {
        cases.push({ name : 'the harness ran to its end', ok : false, rows : [ { label : 'error', actual : String(error && error.stack || error), expected : 'none', ok : false } ] });
        const block = document.createElement('div');
        block.className = 'case fail';
        block.textContent = 'ERROR: ' + (error && error.stack ? error.stack : error);
        out.appendChild(block);
        console.log('HARNESS: ERROR ' + (error && error.message ? error.message : error));
    } finally {
        Open(null, null);                                                        // <-- Leave the page as it was opened
    }

    const fails   = cases.filter((one) => !one.ok).length;
    const summary = document.createElement('div');
    summary.className   = 'sum ' + (fails === 0 ? 'pass' : 'fail');
    summary.textContent = (fails === 0) ? `ALL ${cases.length} CASES PASS` : `${fails} OF ${cases.length} CASES FAILED`;
    summary.id          = 'summary';
    out.appendChild(summary);

    window.__TEST_RESULT = { pass : cases.length - fails, fail : fails, cases };
    console.log(fails === 0 ? 'HARNESS: ALL PASS' : `HARNESS: ${fails} FAILED`);

