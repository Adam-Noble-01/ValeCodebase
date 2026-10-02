// =============================================================================
// VALEVISION3D - TEST - PROJECT LOADER - IDENTITY HELPERS AND LOCALHOST FALLBACK
// =============================================================================
//
// FILE       : Na__Test__ProjectLoaderIdentity__.test.mjs
// NAMESPACE  : Na__Test
// MODULE     : Project Loader Identity Test (W0-11 acceptance, scratch)
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Prove W0-11's acceptance: TrueVision's two identity names answer ValeVision's folder and 4-digit
//              year through the master index (or null), ResolveAssetUrl falls back to the Flask copy on localhost
//              only, and every pre-existing export and live-site result is unchanged against git HEAD.
// CREATED    : 01-Oct-2026
//
// DESCRIPTION:
// - Runs the module exactly as the app ships it: the file (and its one import,
//   ResilientLoad) is copied to a temporary folder with a package.json that
//   marks it as an ES module, and imported once per scenario (a query string
//   gives each scenario its own module instance, so "before the master index
//   settles" is a real state, not a mock).
// - window.location and fetch are stubbed. The master index the stub serves
//   is Whitecardopedia's local copy (read only), so every real project is
//   checked; nothing is written outside the OS temp folder.
// - The HEAD copy of the module comes from `git show HEAD:...` (read only)
//   and is the reference for "unchanged".
//
// USAGE:
//     node Na__Test__ProjectLoaderIdentity__.test.mjs [path to a ProjectLoader.js to test]
//
//   Default target: the live VV file. Exit 0 = every check passed. Exit 1 = at least one did not.
//
// =============================================================================

import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';


// -----------------------------------------------------------------------------
// REGION | The Module Under Test and the Reference
// -----------------------------------------------------------------------------

    const VCB        = 'D:\\10_CoreLib__ValeCodebase';
    const VV_UTILS   = join(VCB, 'WebApps', 'ValeVision3D', '02__Src__AppModules', '03__AppUtils');
    const TARGET     = process.argv[2] ? resolve(process.argv[2]) : join(VV_UTILS, 'Na__AppUtils__ProjectLoader.js');
    const INDEX_FILE = join(VCB, 'WebApps', 'Whitecardopedia', '02__Src__AppModules', '03__AppData', 'Na__MasterIndex__ProjectLocations__.json');

    const SCRATCH  = mkdtempSync(join(tmpdir(), 'na-w0-11-'));
    const NEW_DIR  = join(SCRATCH, 'new');
    const HEAD_DIR = join(SCRATCH, 'head');
    for (const dir of [ NEW_DIR, HEAD_DIR ]) {
        mkdirSync(dir);
        writeFileSync(join(dir, 'package.json'), '{ "type": "module" }\n');
        copyFileSync(join(VV_UTILS, 'Na__AppUtils__ResilientLoad__.js'), join(dir, 'Na__AppUtils__ResilientLoad__.js'));
    }
    copyFileSync(TARGET, join(NEW_DIR, 'Na__AppUtils__ProjectLoader.js'));
    writeFileSync(join(HEAD_DIR, 'Na__AppUtils__ProjectLoader.js'), execFileSync('git', [ '-C', VCB, 'show',
        'HEAD:WebApps/ValeVision3D/02__Src__AppModules/03__AppUtils/Na__AppUtils__ProjectLoader.js' ]));

    let instanceCount = 0;
    async function Load(dir) {
        instanceCount++;
        return import(pathToFileURL(join(dir, 'Na__AppUtils__ProjectLoader.js')).href + '?instance=' + instanceCount);
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Stubs: the Page, the Network and the Console
// -----------------------------------------------------------------------------

    function SetPage(href) {
        const url = new URL(href);
        globalThis.window = {
            location      : { href : url.href, search : url.search, hostname : url.hostname, port : url.port, origin : url.origin },
            dispatchEvent : () => true
        };
    }

    const INDEX = JSON.parse(readFileSync(INDEX_FILE, 'utf8'));
    let networkUp = true;
    globalThis.fetch = async (url) => {
        if (!networkUp) throw new TypeError('Failed to fetch (stubbed offline)');
        if (String(url).includes('Na__MasterIndex__ProjectLocations__')) {
            return { ok : true, status : 200, json : async () => JSON.parse(JSON.stringify(INDEX)) };
        }
        return { ok : false, status : 404, json : async () => ({}) };
    };

    const warnings = [];
    const consoleWarn = console.warn;
    console.warn = (...parts) => { warnings.push(parts.join(' ')); };

    const LOCAL = 'http://localhost:8000/ValeVision3D/index.html';
    const LIVE  = 'https://adam-noble-01.github.io/ValeCodebase/WebApps/ValeVision3D/index.html';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Checks
// -----------------------------------------------------------------------------

    let failures = 0;
    let passes   = 0;
    function check(name, passed, detail) {
        if (passed) passes++; else failures++;
        if (!passed || process.env.NA_TEST_VERBOSE) {
            console.log((passed ? '  PASS  ' : '  FAIL  ') + name + ((!passed && detail !== undefined) ? '  -> ' + JSON.stringify(detail) : ''));
        }
    }
    function section(title) { console.log(title); }
    function Identity(loader, query) {
        SetPage(LOCAL + query);
        return { folder : loader.Na__AppUtils__GetProjectFolderFromUrl(), year : loader.Na__AppUtils__GetYearFromUrl() };
    }
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

    console.log('ValeVision3D - W0-11 ProjectLoader identity helpers and localhost fallback');
    console.log('  target : ' + TARGET);
    console.log('  index  : ' + INDEX.projects.length + ' master-index entries (Whitecardopedia local copy)');

    // ---------------------------------------------------------------------
    section('1. Before the master index settles');
    // ---------------------------------------------------------------------
    {
        const loader = await Load(NEW_DIR);
        check('exports both TrueVision names', typeof loader.Na__AppUtils__GetProjectFolderFromUrl === 'function' && typeof loader.Na__AppUtils__GetYearFromUrl === 'function');
        let id = Identity(loader, '?project=2026/3047__Doous');
        check('?project=2026/3047__Doous before the index settles -> null / null', id.folder === null && id.year === null, id);
        id = Identity(loader, '?project=3047');
        check('?project=3047 before the index settles -> null / null (no legacy 2026/<code> guess)', id.folder === null && id.year === null, id);
        id = Identity(loader, '?project-folder=X&year=2026');
        check('?project-folder=X&year=2026 is honoured before the index settles', id.folder === 'X' && id.year === '2026', id);
    }

    // ---------------------------------------------------------------------
    section('2. After the master index settles (acceptance item 1)');
    // ---------------------------------------------------------------------
    const loader = await Load(NEW_DIR);
    const head   = await Load(HEAD_DIR);
    await loader.Na__AppUtils__InitMasterIndex();
    await head.Na__AppUtils__InitMasterIndex();
    {
        let id = Identity(loader, '?project=3047');
        check('?project=3047 -> "3047__Doous" / "2026"', id.folder === '3047__Doous' && id.year === '2026', id);
        id = Identity(loader, '?project=2026/3047__Doous');
        check('?project=2026/3047__Doous -> the same', id.folder === '3047__Doous' && id.year === '2026', id);
        id = Identity(loader, '?project-folder=X&year=2026');
        check('?project-folder=X&year=2026 is honoured', id.folder === 'X' && id.year === '2026', id);
        id = Identity(loader, '?project=9999');
        check('an unknown code gives folder null (and year null)', id.folder === null && id.year === null, id);
        id = Identity(loader, '?project=12345678');
        check('an unknown code never answers the legacy guess (HEAD NormalizeProjectFolderId says 2026/12345678)',
            id.folder === null && id.year === null && head.Na__AppUtils__NormalizeProjectFolderId('12345678') === '2026/12345678', id);
        id = Identity(loader, '?project=2026/9999__Nobody');
        check('a year-prefixed token the index does not know -> null / null', id.folder === null && id.year === null, id);
        id = Identity(loader, '?project=2025/59494__Weeks');
        check('?project=2025/59494__Weeks -> "59494__Weeks" / "2025" (its project.json folderId is stale)', id.folder === '59494__Weeks' && id.year === '2025', id);
        id = Identity(loader, '?project=2025%2FFN-62104__Fenner%20Scheme-01');
        check('a folder with a space resolves ("FN-62104__Fenner Scheme-01" / "2025")', id.folder === 'FN-62104__Fenner Scheme-01' && id.year === '2025', id);
        id = Identity(loader, '?project-folder=3047__Doous');
        check('?project-folder=3047__Doous alone -> its own master-index year "2026"', id.folder === '3047__Doous' && id.year === '2026', id);
        id = Identity(loader, '?project-folder=Unknown__Folder');
        check('?project-folder= with no year and no index entry -> null / null (never "null/<folder>")', id.folder === null && id.year === null, id);
        id = Identity(loader, '?project=3047&year=26');
        check('TrueVision-style ?year=26 reads as "2026"', id.folder === '3047__Doous' && id.year === '2026', id);
        id = Identity(loader, '?year=2025');
        check('?year=2025 alone is honoured (no folder)', id.folder === null && id.year === '2025', id);
        id = Identity(loader, '');
        check('no query -> null / null', id.folder === null && id.year === null, id);
        id = Identity(loader, '?project=');
        check('an empty ?project= -> null / null', id.folder === null && id.year === null, id);
        id = Identity(loader, '?project=%20%2F2026%2F3047__Doous%2F%20');
        check('slashes and spaces around the token are ignored', id.folder === '3047__Doous' && id.year === '2026', id);

        warnings.length = 0;
        id = Identity(loader, '?project=3047&year=abc');
        const again = Identity(loader, '?project=3047&year=abc');
        check('a malformed ?year= gives null / null', id.folder === null && id.year === null && again.folder === null, id);
        check('... and warns once, naming the fix, with the [ValeVision3D] prefix', warnings.length === 1 && /^\[ValeVision3D\] \?year=abc is not a year: use four digits, e\.g\. \?year=2026/.test(warnings[0]), warnings);
    }

    // EVERY INDEXED PROJECT | the folderId form and the bare code agree with the loader's own resolution
    {
        let wrongFolderId = [], wrongCode = [], incoherent = [];
        for (const entry of INDEX.projects) {
            const byFolderId = Identity(loader, '?project=' + encodeURIComponent(entry.folderId));
            if (byFolderId.year + '/' + byFolderId.folder !== entry.folderId) wrongFolderId.push([ entry.folderId, byFolderId ]);

            const byCode   = Identity(loader, '?project=' + encodeURIComponent(entry.projectCode));
            const expected = head.Na__AppUtils__NormalizeProjectFolderId(entry.projectCode);   // <-- HEAD's own index resolution
            if (byCode.year + '/' + byCode.folder !== expected) wrongCode.push([ entry.projectCode, byCode, expected ]);

            for (const one of [ byFolderId, byCode ]) {
                if ((one.folder === null) !== (one.year === null) || (one.year !== null && !/^\d{4}$/.test(one.year))) incoherent.push(one);
            }
        }
        check('every one of the ' + INDEX.projects.length + ' index folderIds: year + "/" + folder is the folderId', wrongFolderId.length === 0, wrongFolderId.slice(0, 5));
        check('every bare code resolves to the folderId HEAD\'s NormalizeProjectFolderId picks (newest year wins)', wrongCode.length === 0, wrongCode.slice(0, 5));
        check('a folder never comes without a 4-digit year', incoherent.length === 0, incoherent.slice(0, 5));
    }

    // ---------------------------------------------------------------------
    section('3. The master index failed to load (settled, empty)');
    // ---------------------------------------------------------------------
    {
        networkUp = false;
        const offline = await Load(NEW_DIR);
        await offline.Na__AppUtils__InitMasterIndex();
        networkUp = true;
        let id = Identity(offline, '?project=2026/3047__Doous');
        check('no index: ?project=2026/3047__Doous -> null / null (writes would be refused, not guessed)', id.folder === null && id.year === null, id);
        id = Identity(offline, '?project-folder=X&year=2026');
        check('no index: ?project-folder=X&year=2026 still honoured', id.folder === 'X' && id.year === '2026', id);
    }

    // ---------------------------------------------------------------------
    section('4. ResolveAssetUrl (acceptance item 2)');
    // ---------------------------------------------------------------------
    {
        const R2 = 'https://cdn.noble-architecture.com/VaApps/Projects';
        const GH = 'https://adam-noble-01.github.io/ValeCodebase/WebApps/Whitecardopedia/Projects';
        const rel = 'LayoutEditor/Snapshots/abc123.webp';

        SetPage(LOCAL + '?project=2026/3047__Doous');
        let got = loader.Na__AppUtils__ResolveAssetUrl('2026/3047__Doous', rel);
        check('localhost: primary is still R2', got.primary === R2 + '/2026/3047__Doous/' + rel, got);
        check('localhost: fallback is the Flask copy http://localhost:8000/Whitecardopedia/Projects/<folderId>/<rel>', got.fallback === 'http://localhost:8000/Whitecardopedia/Projects/2026/3047__Doous/' + rel, got);

        SetPage('http://127.0.0.1:8000/ValeVision3D/index.html?project=3047');
        got = loader.Na__AppUtils__ResolveAssetUrl('2026/3047__Doous', rel);
        check('127.0.0.1:8000: fallback on this origin', got.fallback === 'http://127.0.0.1:8000/Whitecardopedia/Projects/2026/3047__Doous/' + rel, got);

        SetPage('http://192.168.1.20:8000/ValeVision3D/index.html?project=3047');
        got = loader.Na__AppUtils__ResolveAssetUrl('2026/3047__Doous', rel);
        check('a LAN device on :8000 (counts as localhost): fallback on that origin', got.fallback === 'http://192.168.1.20:8000/Whitecardopedia/Projects/2026/3047__Doous/' + rel, got);

        const ghOnly = INDEX.projects.find((e) => e.hasImages_R2 === false);
        SetPage(LOCAL + '?project=' + ghOnly.folderId);
        got = loader.Na__AppUtils__ResolveAssetUrl(ghOnly.folderId, rel);
        check('localhost, a hasImages_R2:false project (' + ghOnly.folderId + '): primary GH Pages as before, fallback the Flask copy',
            got.primary === GH + '/' + ghOnly.folderId + '/' + rel && got.fallback === 'http://localhost:8000/Whitecardopedia/Projects/' + ghOnly.folderId + '/' + rel, got);

        // THE LIVE SITE IS UNCHANGED | every index project, unknown ids and odd inputs, against HEAD
        const ids  = INDEX.projects.map((e) => e.folderId).concat([ '2026/9999__Nobody', '3047', 'X', '', undefined, null ]);
        const rels = [ rel, 'PresentationMode/Thumbnails/scene-1.webp', 'LayoutEditor/Linework/a.json', '06__Layout__PublishedDocuments/D01/index.json', undefined ];
        let liveDiff = [], primaryDiff = [];
        for (const id of ids) {
            for (const r of rels) {
                SetPage(LIVE + '?project=2026/3047__Doous');
                const now = loader.Na__AppUtils__ResolveAssetUrl(id, r), before = head.Na__AppUtils__ResolveAssetUrl(id, r);
                if (!same(now, before)) liveDiff.push([ id, r, now, before ]);
                SetPage(LOCAL + '?project=2026/3047__Doous');
                const nowLocal = loader.Na__AppUtils__ResolveAssetUrl(id, r), beforeLocal = head.Na__AppUtils__ResolveAssetUrl(id, r);
                if (nowLocal.primary !== beforeLocal.primary) primaryDiff.push([ id, r, nowLocal, beforeLocal ]);
            }
        }
        check('live site: ResolveAssetUrl equals HEAD for ' + (ids.length * rels.length) + ' inputs', liveDiff.length === 0, liveDiff.slice(0, 3));
        check('localhost: the primary URL equals HEAD for every input', primaryDiff.length === 0, primaryDiff.slice(0, 3));
    }

    // ---------------------------------------------------------------------
    section('5. Additive only (acceptance item 3)');
    // ---------------------------------------------------------------------
    {
        const before = Object.keys(head).sort(), after = Object.keys(loader).sort();
        const removed = before.filter((n) => !after.includes(n)), added = after.filter((n) => !before.includes(n));
        check('no export removed or renamed', removed.length === 0, removed);
        check('exactly two exports added: Na__AppUtils__GetProjectFolderFromUrl, Na__AppUtils__GetYearFromUrl',
            same(added, [ 'Na__AppUtils__GetProjectFolderFromUrl', 'Na__AppUtils__GetYearFromUrl' ]), added);
        check('constant exports unchanged', loader.Na__AppUtils__R2BaseUrl_Fallback === head.Na__AppUtils__R2BaseUrl_Fallback && loader.Na__AppUtils__GhBaseUrl_Fallback === head.Na__AppUtils__GhBaseUrl_Fallback);

        const tokens = [ '3047', '2026/3047__Doous', '/2026/3047__Doous/', '63592', '12345678', 'Doous', '3047__Doous', '2025/59494__Weeks', '', null ];
        let normDiff = [];
        for (const t of tokens) {
            if (loader.Na__AppUtils__NormalizeProjectFolderId(t) !== head.Na__AppUtils__NormalizeProjectFolderId(t)) normDiff.push(t);
        }
        check('NormalizeProjectFolderId unchanged (settled index)', normDiff.length === 0, normDiff);

        let pageDiff = [];
        for (const href of [ LOCAL + '?project=3047', LIVE + '?project=2026/3047__Doous', 'http://127.0.0.1:5500/x.html', 'https://example.org:8000/a?project=b' ]) {
            SetPage(href);
            if (loader.Na__AppUtils__IsRunningOnLocalhost() !== head.Na__AppUtils__IsRunningOnLocalhost()
                || loader.Na__AppUtils__GetProjectCodeFromUrl() !== head.Na__AppUtils__GetProjectCodeFromUrl()) pageDiff.push(href);
        }
        check('IsRunningOnLocalhost and GetProjectCodeFromUrl unchanged', pageDiff.length === 0, pageDiff);

        const projectData = { valeVision_ModelUrls : [ 'https://cdn.example/a.glb', 'https://cdn.example/b.glb' ] };
        check('ExtractModelUrls unchanged', same(loader.Na__AppUtils__ExtractModelUrls(projectData), head.Na__AppUtils__ExtractModelUrls(projectData)));
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Result
// -----------------------------------------------------------------------------

    console.warn = consoleWarn;
    try { rmSync(SCRATCH, { recursive : true, force : true }); } catch (_) {}
    console.log('');
    console.log(failures === 0 ? `  PASS - ${passes} checks` : `  FAIL - ${failures} of ${passes + failures} checks failed`);
    process.exit(failures === 0 ? 0 : 1);

// endregion -------------------------------------------------------------------
