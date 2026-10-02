// =============================================================================
// VALEVISION3D - W1-10 NODE CHECK - ELEVATION AUTO NAME AND DATA MODULE 1.1.0
// =============================================================================
//
// Scratch check for package W1-10 (never shipped). Copies the modules the elevation data module, the
// auto namer and the north data module need into a staging tree in the OS temp folder - the W1-10
// candidates over this app's files, or with --live this app's live files only - and loads them in
// Node, beside TrueVision's own data module 1.1.0 read at the pin (git show), staged next to them so
// both share one drawings block. fetch is a stub that reads only file:// URLs from the staging tree;
// nothing reaches the network or the repository. Fixture: 2026/3047__Doous's project.json, read only.
//
// USAGE:  node w1_10_check.mjs [--live] [--mutant M1|M2|M3|M4] [--keep]
//
// =============================================================================

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';


// -----------------------------------------------------------------------------
// REGION | Paths and Staging
// -----------------------------------------------------------------------------

    const ARGS    = process.argv.slice(2);
    const LIVE    = ARGS.includes('--live');
    const KEEP    = ARGS.includes('--keep');
    const MUTANT  = ARGS.includes('--mutant') ? ARGS[ARGS.indexOf('--mutant') + 1] : null;
    const HERE    = dirname(fileURLToPath(import.meta.url));
    const APP     = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
    const SRC     = join(APP, '02__Src__AppModules');
    const NAWEB   = 'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb';
    const PIN     = 'b2aa9151';
    const TVAPP   = 'na-apps/30__TrueVision__CoreAppCode/';
    const DOOUS   = 'D:/10_CoreLib__ValeCodebase/WebApps/Whitecardopedia/Projects/2026/3047__Doous/project.json';
    const ELEV    = '45__System__ElevationViews/';
    const FOLDERS = [ '02__AppData', '03__AppUtils', '04__MathUtils', '21__System__PresentationMode', '40__System__DrawingViewCore',
                      '45__System__ElevationViews', '46__System__NorthDirection', '49__System__ElevationDepthFog', '80__CloudflareIntegration' ];
    const TARGETS = [ ELEV + 'Na__Elevation__AutoNameText__.js', ELEV + 'Na__Elevation__AutoName__.js',
                      ELEV + 'Na__Elevation__ProjectJson__Data__.js', ELEV + 'Na__Elevation__AppConfig__.json' ];

    const STAGE     = mkdtempSync(join(tmpdir(), 'na-w1-10-check-'));
    const STAGE_SRC = join(STAGE, '02__Src__AppModules');
    writeFileSync(join(STAGE, 'package.json'), '{ "type": "module" }\n');

    const sha = (bytes) => createHash('sha256').update(bytes).digest('hex').slice(0, 16);
    const tvText = (rel) => execFileSync('git', [ '-C', NAWEB, 'show', PIN + ':' + TVAPP + rel ], { encoding : 'utf8', maxBuffer : 1 << 26 });

    for (const folder of FOLDERS) {
        mkdirSync(join(STAGE_SRC, folder), { recursive : true });
        for (const name of readdirSync(join(SRC, folder))) {
            const from = join(SRC, folder, name);
            if (statSync(from).isFile() && /\.(js|json)$/.test(name)) copyFileSync(from, join(STAGE_SRC, folder, name));
        }
    }
    const staged = {};
    for (const rel of TARGETS) {
        const from = LIVE ? join(SRC, rel) : join(HERE, 'candidates', '02__Src__AppModules', rel);
        const bytes = readFileSync(from);
        writeFileSync(join(STAGE_SRC, rel), bytes);
        staged[rel] = sha(bytes);
    }
    writeFileSync(join(STAGE_SRC, ELEV + 'Na__Elevation__ProjectJson__Data__TV__.js'), tvText('02__Src__AppModules/' + ELEV + 'Na__Elevation__ProjectJson__Data__.js'));

    // MUTANTS | planted faults the checks must catch (scratch only)
    const MUTANTS = {
        M1 : [ '        Na__ElevFogData__Ensure(elevation, Na__ElevFogData__KEY_ELEVATION);\n        return elevation;\n',
               '        Na__ElevFogData__Ensure(elevation, Na__ElevFogData__KEY_ELEVATION);\n        if (elevation.Elevation__SeededFrom === undefined) elevation.Elevation__SeededFrom = \'manual\';\n        return elevation;\n' ],
        M2 : [ '    function Na__ElevData__EnsureArray(sceneConfig) {\n',
               '    function Na__ElevData__EnsureArray(sceneConfig) {\n        if (sceneConfig && typeof sceneConfig === \'object\') { if (!Array.isArray(sceneConfig.LayoutEditor__DrawingsData__Elevations)) sceneConfig.LayoutEditor__DrawingsData__Elevations = []; return sceneConfig.LayoutEditor__DrawingsData__Elevations; }\n' ],
        M3 : [ '        Na__ElevFogData__Ensure(elevation, Na__ElevFogData__KEY_ELEVATION);\n        return elevation;\n',
               '        return elevation;\n' ],
        M4 : [ '        Na__ElevData__STYLE_KEYS,                                            // <-- ValeVision only (DR-32 D33, K2 X2)\n', '' ]
    };
    if (MUTANT) {
        const path = join(STAGE_SRC, ELEV + 'Na__Elevation__ProjectJson__Data__.js');
        const text = readFileSync(path, 'utf8');
        const [ from, to ] = MUTANTS[MUTANT];
        if (text.split(from).length !== 2) throw new Error('mutant ' + MUTANT + ' anchor not found once');
        writeFileSync(path, text.replace(from, to));
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Globals: a Browser Window Without a Browser
// -----------------------------------------------------------------------------

    const events = new EventTarget();
    const dispatched = [];
    globalThis.window = {
        location         : new URL('https://adam-noble-01.github.io/ValeCodebase/WebApps/ValeVision3D/index.html?project=2026/3047__Doous'),
        addEventListener : (...a) => events.addEventListener(...a),
        removeEventListener : (...a) => events.removeEventListener(...a),
        dispatchEvent    : (event) => { dispatched.push(event.type); return events.dispatchEvent(event); },
        setTimeout, clearTimeout, setInterval, clearInterval
    };
    globalThis.location = globalThis.window.location;
    const store = new Map();
    globalThis.localStorage = { getItem : (k) => store.has(k) ? store.get(k) : null, setItem : (k, v) => store.set(k, String(v)), removeItem : (k) => store.delete(k) };
    globalThis.sessionStorage = globalThis.localStorage;
    const fetched = [];
    globalThis.fetch = async (input) => {
        const url = String((input && input.url) ? input.url : input);
        fetched.push(url);
        if (url.startsWith('file:')) {
            const path = fileURLToPath(url);
            if (!path.startsWith(STAGE)) return new Response('outside the staging tree', { status : 403 });
            if (!existsSync(path)) return new Response('not found', { status : 404 });
            return new Response(readFileSync(path), { status : 200, headers : { 'Content-Type' : 'application/json' } });
        }
        return new Response('{"error":"offline check"}', { status : 503, headers : { 'Content-Type' : 'application/json' } });
    };
    const consoleKept = [];
    const realLog = console.log;
    console.warn = (...p) => consoleKept.push('warn ' + p.map(String).join(' '));
    console.info = (...p) => consoleKept.push('info ' + p.map(String).join(' '));
    console.error = (...p) => consoleKept.push('error ' + p.map(String).join(' '));

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Checks
// -----------------------------------------------------------------------------

    let passes = 0, failures = 0;
    function check(name, ok, detail) {
        if (ok) passes++; else failures++;
        let line = (ok ? '  PASS  ' : '  FAIL  ') + name;
        if (!ok && detail !== undefined) { let s; try { s = JSON.stringify(detail); } catch (e) { s = String(detail); } line += '  -> ' + String(s).slice(0, 700); }
        realLog(line);
    }
    function section(title) { realLog('\n' + title); }
    async function run(title, body) {
        section(title);
        try { await body(); } catch (error) { check('the section ran to its end', false, (error && error.stack) ? error.stack.split('\n').slice(0, 4).join(' | ') : String(error)); }
    }
    const clone = (v) => JSON.parse(JSON.stringify(v));
    const same  = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const exportNames = (text) => {
        const block = text.slice(text.lastIndexOf('export {'));
        return block.slice(block.indexOf('{') + 1, block.indexOf('}')).split('\n')
            .map((line) => line.replace(/\/\/.*$/, '').replace(/,/g, '').trim()).filter(Boolean).sort();
    };

    const U = (rel) => pathToFileURL(join(STAGE_SRC, rel)).href;
    const PD   = await import(U('40__System__DrawingViewCore/Na__DrawView__ProjectData__.js'));
    const ED   = await import(U(ELEV + 'Na__Elevation__ProjectJson__Data__.js'));
    const EDTV = await import(U(ELEV + 'Na__Elevation__ProjectJson__Data__TV__.js'));
    const AN   = await import(U(ELEV + 'Na__Elevation__AutoName__.js'));
    const ANT  = await import(U(ELEV + 'Na__Elevation__AutoNameText__.js'));
    const CFG  = await import(U(ELEV + 'Na__Elevation__ConfigState__.js'));
    const ND   = await import(U('46__System__NorthDirection/Na__North__ProjectJson__Data__.js'));
    const FOG  = await import(U('49__System__ElevationDepthFog/Na__ElevationDepthFog__RecordData__.js'));

    const DOC   = JSON.parse(readFileSync(DOOUS, 'utf8'));
    const DOC_SHA = sha(readFileSync(DOOUS));
    const PRES  = DOC.PresentationMode__SavedCameraScenes;
    const BLOCK = DOC.LayoutEditor__DrawingsData;
    const EL_KEY = 'LayoutEditor__DrawingsData__Elevations';
    const load = (elevations, extra) => {
        const block = clone(BLOCK);
        block[EL_KEY] = clone(elevations);
        Object.assign(block, extra || {});
        PD.Na__DrawData__Load(block, '2026/3047__Doous', clone(PRES));
        return PD.Na__DrawData__GetBlock();
    };
    const FOG_KEY = 'Elevation__DepthFog';

    realLog('W1-10 node check - ' + (LIVE ? 'LIVE files' : 'CANDIDATES') + (MUTANT ? ' with mutant ' + MUTANT : '') + '; staging ' + STAGE);
    realLog('staged: ' + JSON.stringify(staged));

    await run('1. Export lists (TrueVision\'s names, plus this app\'s three on the data module)', async () => {
        const tvData = exportNames(tvText('02__Src__AppModules/' + ELEV + 'Na__Elevation__ProjectJson__Data__.js'));
        const vvData = Object.keys(ED).sort();
        const want   = tvData.concat([ 'Na__ElevData__STYLE_KEYS', 'Na__ElevData__SetAzimuthDeg', 'Na__ElevData__SetSeededFrom' ]).sort();
        check('the data module exports TrueVision 1.1.0\'s ' + tvData.length + ' names and this app\'s 3, nothing else', same(vvData, want), { extra : vvData.filter((n) => !want.includes(n)), missing : want.filter((n) => !vvData.includes(n)) });
        check('TrueVision\'s copy at the pin exports exactly its own list', same(Object.keys(EDTV).sort(), tvData));
        check('AutoName exports exactly TrueVision\'s list', same(Object.keys(AN).sort(), exportNames(tvText('02__Src__AppModules/' + ELEV + 'Na__Elevation__AutoName__.js'))));
        check('AutoNameText exports exactly TrueVision\'s list', same(Object.keys(ANT).sort(), exportNames(tvText('02__Src__AppModules/' + ELEV + 'Na__Elevation__AutoNameText__.js'))));
        check('Na__ElevData__STYLE_KEYS is the five style keys, frozen', Object.isFrozen(ED.Na__ElevData__STYLE_KEYS) && same(ED.Na__ElevData__STYLE_KEYS,
            { projectedLinework : 'Styles__ProjectedLinework', profileLinework : 'Styles__ProfileLinework', glassOpaque : 'Styles__GlassOpaque', whitecard : 'Styles__Whitecard', hiddenLines : 'Styles__HiddenLines' }), ED.Na__ElevData__STYLE_KEYS);
        // Every name this app's modules import from the data module still resolves (the pre-2.1.0 editor's included)
        const importers = [];
        const walk = (dir) => { for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) { if (!/node_modules|\.claude/.test(n)) walk(p); } else if (p.endsWith('.js')) importers.push(p); } };
        walk(SRC);
        const wanted = new Set();
        for (const file of importers) {
            const text = readFileSync(file, 'utf8');
            const re = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]*Na__Elevation__ProjectJson__Data__\.js)['"]/g;
            let m; while ((m = re.exec(text))) m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean).forEach((n) => wanted.add(n));
        }
        const missing = [ ...wanted ].filter((n) => !(n in ED));
        check('every name this app imports from the data module is exported (' + wanted.size + ' names, SetAzimuthDeg and SetSeededFrom among them)', missing.length === 0 && wanted.has('Na__ElevData__SetAzimuthDeg') && wanted.has('Na__ElevData__SetSeededFrom'), missing);
    });

    await run('2. TrueVision\'s first-argument convention: records in the drawings block, never in the presentation block', async () => {
        load(BLOCK[EL_KEY]);
        const pres   = clone(PRES);
        const before = JSON.stringify(pres);
        const record = ED.Na__ElevData__CreateElevation(pres, {});
        check('CreateElevation(presentationConfig, {}) returns a record', !!record && typeof record === 'object');
        check('...and leaves the presentation object exactly as it was (no new key, nothing changed)', JSON.stringify(pres) === before);
        check('...the record is in LayoutEditor__DrawingsData__Elevations (by identity)', PD.Na__DrawData__GetBlock()[EL_KEY].includes(record) && PD.Na__DrawData__GetElevationsArray().includes(record));
        check('...and nowhere else: no __Elevations key on the presentation block', !('PresentationMode__SavedCameraScenes__Elevations' in pres));
        check('...named by the config format, Elevation 2 (the block held one)', record.Elevation__Name === 'Elevation 2', record.Elevation__Name);
        check('...with Elevation__DepthFog off from birth', record[FOG_KEY] && record[FOG_KEY].DepthFog__Enabled === false, record[FOG_KEY]);
        check('...and no Elevation__SeededFrom written (DR-32)', !('Elevation__SeededFrom' in record));
        const seeded = ED.Na__ElevData__CreateElevation(pres, { azimuthDeg : 90, seededFrom : 'facepick' });
        check('a seededFrom option is not written either (TrueVision\'s creator does not know it)', !('Elevation__SeededFrom' in seeded));
        check('GetElevations(presentationConfig), GetElevations(null) and GetElevations() read the same records', same(ED.Na__ElevData__GetElevations(pres), ED.Na__ElevData__GetElevations(null)) && same(ED.Na__ElevData__GetElevations(), ED.Na__ElevData__GetElevations(null)) && ED.Na__ElevData__GetElevations(null).length === 3);
        const orphan = ED.Na__ElevData__DeleteElevation(pres, 'Elevation_002');
        check('DeleteElevation(presentationConfig, id) removes it from the drawings block and hands back its scene id', orphan === 'Scene_008' && !PD.Na__DrawData__GetElevationsArray().some((e) => e.Elevation__Id === 'Elevation_002'), orphan);
        check('...the presentation object is still untouched', JSON.stringify(pres) === before);
        check('...and the order is 1..n again', same(ED.Na__ElevData__GetElevations(null).map((e) => e.Elevation__Order), [ 1, 2 ]));
    });

    await run('3. Depth fog: every record gains Elevation__DepthFog, switched off, on its first read', async () => {
        const settled = clone(BLOCK[EL_KEY][0]);
        settled.Elevation__Id = 'Elevation_009'; settled.Elevation__Name = 'Settled'; settled.Elevation__Order = 2;
        settled[FOG_KEY] = { DepthFog__Enabled : true, DepthFog__StartDepthMm : 2000, DepthFog__EndDepthMm : 9000, DepthFog__FalloffPercent : 30 };
        const block = load([ BLOCK[EL_KEY][0], settled ]);
        const raw   = block[EL_KEY];
        check('before any read the Doous record has no fog block', !(FOG_KEY in raw[0]));
        const list  = ED.Na__ElevData__GetElevations(null);
        const fresh = FOG.Na__ElevFogData__Read({}, FOG.Na__ElevFogData__KEY_ELEVATION);
        check('after the first read it has one, off, with the configured three numbers', list[0][FOG_KEY] && list[0][FOG_KEY].DepthFog__Enabled === false
            && same(ED.Na__ElevData__GetDepthFog(list[0]), Object.assign({}, fresh, { enabled : false })), list[0][FOG_KEY]);
        check('...the numbers are the fog system\'s defaults (1000 / 15000 / 50)', same(ED.Na__ElevData__GetDepthFog(list[0]), { enabled : false, startDepthMm : 1000, endDepthMm : 15000, falloffPercent : 50 }), ED.Na__ElevData__GetDepthFog(list[0]));
        const held = list[0][FOG_KEY];
        ED.Na__ElevData__GetElevations(null);
        check('a second read leaves the block alone (the same object)', raw[0][FOG_KEY] === held);
        const settledBlock = raw[1][FOG_KEY];
        check('a settled block is left exactly as it was', same(settledBlock, { DepthFog__Enabled : true, DepthFog__StartDepthMm : 2000, DepthFog__EndDepthMm : 9000, DepthFog__FalloffPercent : 30 }), settledBlock);
        const stored = ED.Na__ElevData__SetDepthFog(list[0], { enabled : true, startDepthMm : 500, endDepthMm : 3000 });
        check('SetDepthFog writes through the fog system and answers what is stored', same(stored, ED.Na__ElevData__GetDepthFog(list[0])) && stored.enabled === true && stored.startDepthMm === 500, stored);
        const plane = ED.Na__ElevData__GetDepthFogPlane(list[0]);
        const axes  = ED.Na__ElevData__GetAxes(list[0]);
        check('GetDepthFogPlane is the drawing plane: GetAxes\' normal, Y 0, GetPlaneDistanceMm', plane.normalX === axes.normalX && plane.normalY === 0 && plane.normalZ === axes.normalZ && plane.distanceMm === ED.Na__ElevData__GetPlaneDistanceMm(list[0]), plane);
        // What a save writes: Na__DrawData__Save deep-copies the block
        const written = clone(PD.Na__DrawData__GetBlock())[EL_KEY];
        check('a save\'s copy carries every record\'s fog block', written.every((e) => e[FOG_KEY] && typeof e[FOG_KEY].DepthFog__Enabled === 'boolean'));
        // Static: nothing outside folder 49 and this data module reads an elevation's fog yet, so no picture can
        // change. (A viewport's own depthFog style flag, LE ConfigState SheetSetup's DefaultStyles, reads no
        // record: it says whether a viewport would follow its drawing's fog, which nothing draws before W2-12.)
        const FOG_READER = /Elevation__DepthFog|Na__ElevData__(Get|Set)DepthFog|GetDepthFogPlane|Na__ElevFog(Data|Cfg|Math|Shader)?__|49__System__ElevationDepthFog/;
        const readers = [];
        const walk = (dir) => { for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) { if (!/node_modules|\.claude/.test(n)) walk(p); } else if (/\.(js|mjs)$/.test(p) && FOG_READER.test(readFileSync(p, 'utf8'))) readers.push(p.slice(SRC.length + 1).replace(/\\/g, '/')); } };
        walk(SRC);
        const outside = readers.filter((p) => !p.startsWith('49__System__ElevationDepthFog/') && p !== ELEV + 'Na__Elevation__ProjectJson__Data__.js');
        check('no render path reads an elevation\'s fog yet (only folder 49 and this data module touch it in 02__Src__AppModules)', outside.length === 0, outside);
    });

    await run('4. Elevation__SeededFrom (DR-32): kept where it is, never written by read or create, and the setter still works', async () => {
        const a = clone(BLOCK[EL_KEY][0]);                                                   // <-- Doous: 'manual'
        const b = clone(a); b.Elevation__Id = 'Elevation_010'; b.Elevation__Name = 'Picked'; b.Elevation__Order = 2; b.Elevation__SeededFrom = 'facepick';
        const c = clone(a); c.Elevation__Id = 'Elevation_011'; c.Elevation__Name = 'Unknown'; c.Elevation__Order = 3; delete c.Elevation__SeededFrom;
        const d = clone(a); d.Elevation__Id = 'Elevation_012'; d.Elevation__Name = 'Odd'; d.Elevation__Order = 4; d.Elevation__SeededFrom = 'xyz';
        load([ a, b, c, d ]);
        const list = ED.Na__ElevData__GetElevations(null);
        check('read keeps \'manual\' and \'facepick\' as they were', list[0].Elevation__SeededFrom === 'manual' && list[1].Elevation__SeededFrom === 'facepick');
        check('read does not add the key to a record without it', !('Elevation__SeededFrom' in list[2]));
        check('read does not rewrite an unknown value (it is preserved, not coerced)', list[3].Elevation__SeededFrom === 'xyz');
        const written = clone(PD.Na__DrawData__GetBlock())[EL_KEY];
        check('a save\'s copy keeps every value it had', same(written.map((e) => e.Elevation__SeededFrom), [ 'manual', 'facepick', undefined, 'xyz' ].map((v) => v)) || same(written.map((e) => e.Elevation__SeededFrom === undefined ? null : e.Elevation__SeededFrom), [ 'manual', 'facepick', null, 'xyz' ]));
        check('SetSeededFrom(record, \'preset\') writes it', ED.Na__ElevData__SetSeededFrom(list[2], 'preset') === true && list[2].Elevation__SeededFrom === 'preset');
        check('SetSeededFrom with an unknown source writes \'manual\'', ED.Na__ElevData__SetSeededFrom(list[3], 'bogus') === true && list[3].Elevation__SeededFrom === 'manual');
        check('SetSeededFrom(null) is false', ED.Na__ElevData__SetSeededFrom(null, 'facepick') === false);
    });

    await run('5. SetAzimuthDeg (this app\'s, until W2-05): whole degrees, wrapped', async () => {
        const r = { Elevation__AzimuthDeg : 10 };
        check('361.6 -> 2', ED.Na__ElevData__SetAzimuthDeg(r, 361.6) === true && r.Elevation__AzimuthDeg === 2, r);
        check('-90.4 -> 270', ED.Na__ElevData__SetAzimuthDeg(r, -90.4) === true && r.Elevation__AzimuthDeg === 270, r);
        check('NaN is refused and nothing changes', ED.Na__ElevData__SetAzimuthDeg(r, NaN) === false && r.Elevation__AzimuthDeg === 270);
        check('no record is refused', ED.Na__ElevData__SetAzimuthDeg(null, 90) === false);
    });

    await run('6. Every TrueVision function answers exactly as TrueVision\'s own module at the pin', async () => {
        const fixtures = [];
        const base = clone(BLOCK[EL_KEY][0]); delete base.Elevation__SeededFrom;
        const mk = (over) => Object.assign(clone(base), over);
        fixtures.push(clone(BLOCK[EL_KEY][0]));
        fixtures.push(mk({ Elevation__Id : 'Elevation_003', Elevation__Name : 'Cut', Elevation__Order : 2, Elevation__Mode : 'section', Elevation__AzimuthDeg : -90, Elevation__ViewDepthMm : 4200, Elevation__PlaneOriginMm : { PosX : 1500, PosZ : -3200 } }));
        fixtures.push(mk({ Elevation__Id : 'Elevation_004', Elevation__Name : 'Odd', Elevation__Order : 'x', Elevation__Mode : 'weird', Elevation__AzimuthDeg : 725.5, Elevation__ViewDepthMm : 'deep', Elevation__PlaneOriginMm : null, Elevation__Styles : { Styles__Whitecard : 'yes' }, Elevation__ExcludeCategoryTokens : [ 'Trees', ' Hedges' ], Elevation__LineworkAsset : { Asset__Path : 'a.json' }, Elevation__Annotations : null, Elevation__Dimensions : 7, Elevation__Enabled : 'no' }));
        fixtures.push(mk({ Elevation__Id : 'Elevation_005', Elevation__Name : 'Off', Elevation__Order : 4, Elevation__Enabled : false, [FOG_KEY] : { DepthFog__Enabled : 'yes', DepthFog__StartDepthMm : -5 } }));
        fixtures.push({ Elevation__Id : 'Elevation_006', Elevation__AzimuthDeg : 10 });                         // <-- No name: filtered out
        fixtures.push({ Elevation__Id : 'Elevation_007', Elevation__Name : 'NoAz' });                           // <-- No azimuth: filtered out
        const pres = clone(PRES);
        const scene = pres.PresentationMode__SavedCameraScenes__Scenes.find((s) => s.PresentationMode__Scene__ElevationId);
        const runBoth = (label, fn) => {
            load(fixtures); const a = fn(ED, clone(pres)); const sa = JSON.stringify(PD.Na__DrawData__GetBlock()[EL_KEY]);
            load(fixtures); const b = fn(EDTV, clone(pres)); const sb = JSON.stringify(PD.Na__DrawData__GetBlock()[EL_KEY]);
            check(label, JSON.stringify(a) === JSON.stringify(b) && sa === sb, { vv : a, tv : b, blocksEqual : sa === sb });
        };
        const keys = [ 'Na__ElevData__ELEVATIONS_KEY', 'Na__ElevData__SCENE_ELEV_ID', 'Na__ElevData__MODE_ELEVATION', 'Na__ElevData__MODE_SECTION' ];
        check('the four constants are TrueVision\'s values', keys.every((k) => ED[k] === EDTV[k]), keys.map((k) => [ ED[k], EDTV[k] ]));
        runBoth('GetElevations (filtering, normalising, ordering)', (M, p) => M.Na__ElevData__GetElevations(p));
        runBoth('GetEnabledElevations', (M, p) => M.Na__ElevData__GetEnabledElevations(null));
        runBoth('GetElevationById', (M, p) => [ M.Na__ElevData__GetElevationById(p, 'Elevation_003'), M.Na__ElevData__GetElevationById(null, 'none'), M.Na__ElevData__GetElevationById(null, '') ]);
        runBoth('GetElevationForScene / IsElevationScene / FindSceneFor', (M, p) => {
            const s = p.PresentationMode__SavedCameraScenes__Scenes.find((x) => x.PresentationMode__Scene__ElevationId);
            const e = M.Na__ElevData__GetElevationForScene(p, s);
            return [ e && e.Elevation__Id, M.Na__ElevData__IsElevationScene(s), M.Na__ElevData__IsElevationScene({}), M.Na__ElevData__FindSceneFor(p, e) && M.Na__ElevData__FindSceneFor(p, e).PresentationMode__Scene__Id, M.Na__ElevData__FindSceneFor(null, e) ];
        });
        runBoth('geometry: GetAxes, plane origin and distance, run <-> world, section and depth', (M) => M.Na__ElevData__GetElevations(null).map((e) => {
            const w = M.Na__ElevData__RunToWorldMm(e, 4250);
            return [ M.Na__ElevData__GetAxes(e), M.Na__ElevData__GetPlaneOriginMm(e), M.Na__ElevData__GetPlaneDistanceMm(e), M.Na__ElevData__WorldToRunMm(e, 3000, -1000), w, M.Na__ElevData__IsSection(e), M.Na__ElevData__GetViewDepthMm(e) ];
        }).concat([ M.Na__ElevData__GetAxes(null), M.Na__ElevData__GetPlaneOriginMm(null), M.Na__ElevData__IsSection(null), M.Na__ElevData__GetViewDepthMm(null) ]));
        runBoth('setters: SetPlaneOriginMm, SetSavedView / GetSavedView', (M) => M.Na__ElevData__GetElevations(null).map((e) => [
            M.Na__ElevData__SetPlaneOriginMm(e, 1000.4, NaN), M.Na__ElevData__SetSavedView(e, 2.5, 120.6, -40.2), M.Na__ElevData__GetSavedView(e), M.Na__ElevData__SetPlaneOriginMm(null, 1, 2), M.Na__ElevData__GetSavedView(null) ]));
        runBoth('depth fog: GetDepthFog, SetDepthFog (End gives way), GetDepthFogPlane', (M) => M.Na__ElevData__GetElevations(null).map((e) => [
            M.Na__ElevData__GetDepthFog(e), M.Na__ElevData__SetDepthFog(e, { enabled : true, startDepthMm : 6000, endDepthMm : 5000, falloffPercent : 120 }), M.Na__ElevData__GetDepthFogPlane(e) ]).concat([ M.Na__ElevData__GetDepthFog(null) ]));
        runBoth('styles, exclusions and the linework asset', (M) => M.Na__ElevData__GetElevations(null).map((e) => [
            M.Na__ElevData__GetStyles(e), M.Na__ElevData__SetStyle(e, 'hiddenLines', true), M.Na__ElevData__SetStyle(e, 'nope', true), M.Na__ElevData__GetStyles(e),
            M.Na__ElevData__GetExcludeTokens(e), M.Na__ElevData__SetExcludeTokens(e, 'Trees, Hedges'.split(',')), M.Na__ElevData__GetExcludeTokens(e), M.Na__ElevData__SetExcludeTokens(e, null),
            M.Na__ElevData__GetLineworkAsset(e), M.Na__ElevData__SetLineworkAsset(e, { Asset__Path : 'x.json' }), M.Na__ElevData__GetLineworkAsset(e), M.Na__ElevData__SetLineworkAsset(e, 'bad') ])
            .concat([ M.Na__ElevData__GetStyles(null), M.Na__ElevData__GetExcludeTokens(null), M.Na__ElevData__GetLineworkAsset(null) ]));
        runBoth('markup arrays (live references)', (M) => M.Na__ElevData__GetElevations(null).map((e) => [ M.Na__ElevData__GetAnnotations(e), M.Na__ElevData__GetDimensions(e) ]).concat([ M.Na__ElevData__GetAnnotations(null) ]));
        runBoth('NextElevationId, CreateElevation, LinkToScene, DeleteElevation, RenumberOrder', (M, p) => {
            const id = M.Na__ElevData__NextElevationId(p);
            const made = M.Na__ElevData__CreateElevation(p, { name : '  Rear  ', azimuthDeg : 451.7, mode : 'section', originXMm : 12.6, originZMm : -7.4, viewDepthMm : 3000 });
            const made2 = M.Na__ElevData__CreateElevation(p, { azimuthDeg : 'x', viewDepthMm : -1 });
            const linked = M.Na__ElevData__LinkToScene(made, { PresentationMode__Scene__Id : 'Scene_099' });
            const gone = M.Na__ElevData__DeleteElevation(p, 'Elevation_003');
            M.Na__ElevData__RenumberOrder(p);
            return [ id, made, made2, linked, gone, M.Na__ElevData__LinkToScene(null, null), JSON.stringify(p) === JSON.stringify(pres) ];
        });
        const nums = [];
        for (let i = 0; i < 400; i++) { const a = (i * 0.9) * Math.PI / 180; nums.push([ Math.sin(a) * (i % 7 + 1), -Math.cos(a) * (i % 5 + 1) ]); }
        nums.push([ NaN, 1 ], [ 0, 0 ], [ 1e-12, -1 ]);
        check('AzimuthFromNormal over 403 normals', nums.every(([ x, z ]) => Object.is(ED.Na__ElevData__AzimuthFromNormal(x, z), EDTV.Na__ElevData__AzimuthFromNormal(x, z))));
    });

    await run('7. Auto names from north (acceptance 1): "<Word> Elevation", then "<Word> Elevation 2"; a typed name stays when turned', async () => {
        load([]);
        const pres = clone(PRES);
        check('north not set: no compass word', ND.Na__NorthData__IsSet() === false && ND.Na__NorthData__FacingWordForAzimuth(180) === '');
        const pre = ED.Na__ElevData__CreateElevation(pres, { azimuthDeg : 180 });
        AN.Na__ElevName__SetAuto(pre, true);
        check('north not set: Derive is \'\' and Sync names nothing', AN.Na__ElevName__Derive(pre) === '' && AN.Na__ElevName__Sync(pre) === false && pre.Elevation__Name === 'Elevation 1');
        const told = AN.Na__ElevName__Statement(pre);
        check('north not set: the statement says so and claims nothing', told.known === false && told.facing === '' && told.trueBearingDeg === null && /Direction not known yet/.test(told.text), told);
        ED.Na__ElevData__DeleteElevation(pres, pre.Elevation__Id);
        ND.Na__NorthData__Set(90, { x : 0, y : 0, z : 0 });                                // <-- North lies along model azimuth 90
        check('north set (90): an elevation at model azimuth 180 faces East', ND.Na__NorthData__FacingWordForAzimuth(180) === 'East', ND.Na__NorthData__FacingWordForAzimuth(180));
        const one = ED.Na__ElevData__CreateElevation(pres, { azimuthDeg : 180 });
        AN.Na__ElevName__SetAuto(one, true);
        check('a new automatic elevation is named "East Elevation"', AN.Na__ElevName__Sync(one) === true && one.Elevation__Name === 'East Elevation', one.Elevation__Name);
        const two = ED.Na__ElevData__CreateElevation(pres, { azimuthDeg : 180 });
        AN.Na__ElevName__SetAuto(two, true);
        check('a second facing the same way is "East Elevation 2"', AN.Na__ElevName__Sync(two) === true && two.Elevation__Name === 'East Elevation 2', two.Elevation__Name);
        const typed = AN.Na__ElevName__ApplyTyped(two, 'Coach House East Elevation');
        check('a typed name sets Elevation__NameIsAuto false', two.Elevation__NameIsAuto === false && typed.isAuto === false && typed.changed === true && two.Elevation__Name === 'Coach House East Elevation', typed);
        two.Elevation__AzimuthDeg = 270; one.Elevation__AzimuthDeg = 270;                 // <-- Both turned: now they face South
        check('turned, the typed name survives', AN.Na__ElevName__Sync(two) === false && two.Elevation__Name === 'Coach House East Elevation');
        check('turned, the automatic one follows: "South Elevation"', AN.Na__ElevName__Sync(one) === true && one.Elevation__Name === 'South Elevation', one.Elevation__Name);
        const back = AN.Na__ElevName__ApplyTyped(two, '   ');
        check('clearing the box makes it automatic again: "South Elevation 2"', back.isAuto === true && two.Elevation__NameIsAuto === true && two.Elevation__Name === 'South Elevation 2', back);
        AN.Na__ElevName__ApplyTyped(two, 'Garden Room');
        const again = AN.Na__ElevName__ApplyTyped(two, 'south elevation 2');
        check('typing the automatic name by hand is the automatic name', again.isAuto === true && two.Elevation__Name === 'South Elevation 2', again);
        const sec = ED.Na__ElevData__CreateElevation(pres, { azimuthDeg : 0, mode : 'section' });
        AN.Na__ElevName__SetAuto(sec, true); AN.Na__ElevName__Sync(sec);
        check('a section is "<Word> Section": West Section', sec.Elevation__Name === 'West Section', sec.Elevation__Name);
        const st = AN.Na__ElevName__Statement(one);
        check('the statement: "South elevation - the side of the building that faces south, seen looking north."', st.known === true && st.text === 'South elevation - the side of the building that faces south, seen looking north.' && st.trueBearingDeg === 180, st);
        const old1 = ED.Na__ElevData__CreateElevation(pres, { azimuthDeg : 90, name : 'North Elevation' });
        const old2 = ED.Na__ElevData__CreateElevation(pres, { azimuthDeg : 90, name : 'Elevation 7' });
        check('a record from before the flag, named exactly the automatic way, is adopted', AN.Na__ElevName__Adopt(old1) === true && old1.Elevation__NameIsAuto === true);
        check('one named otherwise is left alone, its flag absent', AN.Na__ElevName__Adopt(old2) === false && !('Elevation__NameIsAuto' in old2));
        check('a chosen name is never adopted', AN.Na__ElevName__Adopt(two) === false);
        check('the presentation object never changed', JSON.stringify(pres) === JSON.stringify(PRES));
        check('Elevation__NameIsAuto lives on the records in the drawings block only (one, two, the section, the adopted one)',
            PD.Na__DrawData__GetElevationsArray().filter((e) => 'Elevation__NameIsAuto' in e).length === 4 && !JSON.stringify(pres).includes('NameIsAuto'),
            PD.Na__DrawData__GetElevationsArray().map((e) => [ e.Elevation__Name, e.Elevation__NameIsAuto ]));
        // The config's labels (W1-10's union) word it the same way
        const loaded = await CFG.Na__ElevCfg__Load();
        check('the elevation config loads (enabled)', loaded === true, fetched.filter((u) => u.startsWith('file:')).map((u) => u.split('/').pop()));
        check('with the config loaded the names and the statement read the same', AN.Na__ElevName__Derive(sec) === 'West Section' && AN.Na__ElevName__Statement(one).text === st.text);
        ND.Na__NorthData__Clear();
        check('north cleared: names stay, nothing is renamed', AN.Na__ElevName__Sync(one) === false && one.Elevation__Name === 'South Elevation');
    });

    await run('8. The twelve TrueVision labels and this app\'s own, through the config reader', async () => {
        await CFG.Na__ElevCfg__Load();
        const tv = JSON.parse(tvText('02__Src__AppModules/' + ELEV + 'Na__Elevation__AppConfig__.json')).ElevationViews__Labels__Config;
        const twelve = [ 'AutoNameElevationFormat', 'AutoNameSectionFormat', 'FacingStatementElevationFormat', 'FacingStatementSectionFormat', 'FacingStatementNorthNotSet', 'PlaneControlsCaption', 'PlanePositionCaption', 'ModelBearingFieldLabel', 'ModelBearingNote', 'UpdateLabel', 'RevertLabel', 'DeleteLabel' ];
        check('each of the twelve reads TrueVision\'s wording', twelve.every((k) => CFG.Na__ElevCfg__GetLabel(k, '<missing>') === tv['ElevationViews__Labels__' + k]), twelve.filter((k) => CFG.Na__ElevCfg__GetLabel(k, '<missing>') !== tv['ElevationViews__Labels__' + k]));
        const own = { PickFaceLabel : 'Pick Face', DirectionFieldLabel : 'Viewed from', PresetNameFormat : '{preset} Elevation', SaveLabel : 'Save Elevations', ExclusionsPlaceholder : 'Default list' };
        check('this app\'s labels are still there', Object.keys(own).every((k) => CFG.Na__ElevCfg__GetLabel(k, '<missing>') === own[k]));
        check('the section target group is still this app\'s (D28)', JSON.stringify(CFG.Na__ElevCfg__GetSectionGroupTarget()).includes('Cross Sections'), CFG.Na__ElevCfg__GetSectionGroupTarget());
    });

    await run('9. This app\'s pre-2.1.0 editor calls still do what they did', async () => {
        load(BLOCK[EL_KEY]);
        const pres = clone(PRES);
        const made = ED.Na__ElevData__CreateElevation(null, { azimuthDeg : 37, originXMm : 1200, originZMm : -800, seededFrom : 'facepick' });   // <-- AddElevation from a pick
        check('Add from a pick: a record at the picked bearing and plane, in the drawings block', made && made.Elevation__AzimuthDeg === 37 && same(made.Elevation__PlaneOriginMm, { PosX : 1200, PosZ : -800 }) && PD.Na__DrawData__GetElevationsArray().includes(made));
        const target = ED.Na__ElevData__GetElevationById(null, 'Elevation_002');
        ED.Na__ElevData__SetAzimuthDeg(target, 123.4); ED.Na__ElevData__SetPlaneOriginMm(target, 1000.4, -2000.6); ED.Na__ElevData__SetSeededFrom(target, 'facepick');
        check('Re-pick: bearing, plane and provenance written as before', target.Elevation__AzimuthDeg === 123 && same(target.Elevation__PlaneOriginMm, { PosX : 1000, PosZ : -2001 }) && target.Elevation__SeededFrom === 'facepick');
        ED.Na__ElevData__SetSeededFrom(target, 'manual');
        check('a change of direction marks it manual, as before', target.Elevation__SeededFrom === 'manual');
        check('FindSceneFor(config, record) still finds its card', ED.Na__ElevData__FindSceneFor(pres, target).PresentationMode__Scene__Id === 'Scene_008');
        check('Delete(null, id) still hands back the orphaned scene', ED.Na__ElevData__DeleteElevation(null, 'Elevation_002') === 'Scene_008');
    });

    await run('10. Nothing left behind', async () => {
        check('the Doous project.json was only read', sha(readFileSync(DOOUS)) === DOC_SHA);
        check('no request left the machine (fetch saw file: URLs only, or none)', fetched.every((u) => u.startsWith('file:')), fetched.filter((u) => !u.startsWith('file:')));
        check('no module printed a TrueVision prefix', !consoleKept.some((l) => l.includes('[TrueVision3D')), consoleKept.filter((l) => l.includes('[TrueVision3D')));
    });

    realLog('\n' + passes + ' passed, ' + failures + ' failed' + (consoleKept.length ? '; the modules logged ' + consoleKept.length + ' line(s): ' + JSON.stringify(consoleKept).slice(0, 500) : ''));
    if (!KEEP) rmSync(STAGE, { recursive : true, force : true });
    process.exit(failures ? 1 : 0);

// endregion -------------------------------------------------------------------
