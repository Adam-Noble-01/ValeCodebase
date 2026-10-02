// =============================================================================
// WHITECARDOPEDIA - EDITOR API WORKER - TEST - PROJECT GET AND MERGE-KEYS
// =============================================================================
//
// FILE       : tests/Na__Test__EditorWorker__MergeKeys__.test.mjs
// NAMESPACE  : Na__Test
// MODULE     : Editor Worker Test - Project GET and merge-keys
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Prove worker 1.6.0's server-side merge of the editor-owned
//              project.json keys against an in-memory R2 bucket
// CREATED    : 01-Oct-2026
//
// DESCRIPTION:
// - GET .../project answers project.json byte for byte, no-store, and 404
//   { missing: true } without one.
// - merge-keys sets and removes top-level keys and leaves every other key, in
//   its order; refuses pipeline-owned keys; answers 409 on a stale drawingsBase
//   and on a missing project.json, writing nothing; writes the build manifest
//   only when bumpBuild is true.
// - BOTH DIRECTIONS AGAINST THE ONE LIST: every key in ValeVision's
//   ProjectData__EditorOwnedKeys passes merge-keys (set and remove), and a key
//   absent from it - inside a prefix family or not - is refused. A worker
//   built with a different list (a variant config through the test hooks)
//   follows that list with no change to its code, and a list that is missing,
//   or names a pipeline key, refuses every merge.
// - A write that lands between merge-keys' read and its write is kept: the
//   merge is made again on top of it.
//
// USAGE (from anywhere):
//     node tests/Na__Test__EditorWorker__MergeKeys__.test.mjs
//   Exit 0 = every check passed. Exit 1 = at least one did not.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.0
// - Initial implementation with worker 1.6.0.
//
// =============================================================================

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
    NA_MANIFEST_KEY,
    NA_INDEX_KEY,
    Na__TestEnv__R2Bucket,
    Na__TestEnv__Paths,
    Na__TestEnv__LoadWorker,
    Na__TestEnv__Env,
    Na__TestEnv__Call,
    Na__TestEnv__Checks
} from './Na__TestEnv__EditorWorker__R2Bucket__.mjs';

// -----------------------------------------------------------------------------
// REGION | Set-Up, Including Four Variant Configs
// -----------------------------------------------------------------------------

    const T = Na__TestEnv__Checks('Whitecardopedia editor worker 1.6.0 - project GET and merge-keys');

    // THE LIST | Read straight from ValeVision's app config, as the sync tools read it
    const SCRATCH    = mkdtempSync(join(tmpdir(), 'na-editor-worker-merge-'));
    const configText = readFileSync(Na__TestEnv__Paths().configPath, 'utf8');
    const config     = JSON.parse(configText);
    const LIST       = config.ProjectData__EditorOwnedKeys.ProjectData__EditorOwnedKeys__Keys;
    const ADDED_KEY  = 'LayoutEditor__TestOnlyAddedKey';
    const DROPPED    = 'VideoStudio__Config';

    const variant = (name, mutate) => {
        const copy = JSON.parse(configText);
        mutate(copy);
        const path = join(SCRATCH, `${name}.json`);
        writeFileSync(path, JSON.stringify(copy, null, 4));
        return path;
    };
    const variants = {
        changed  : variant('changed',  (c) => { c.ProjectData__EditorOwnedKeys.ProjectData__EditorOwnedKeys__Keys = LIST.filter((k) => k !== DROPPED).concat([ADDED_KEY]); }),
        pipeline : variant('pipeline', (c) => { c.ProjectData__EditorOwnedKeys.ProjectData__EditorOwnedKeys__Keys = LIST.concat(['images']); }),
        missing  : variant('missing',  (c) => { delete c.ProjectData__EditorOwnedKeys; }),
        empty    : variant('empty',    (c) => { c.ProjectData__EditorOwnedKeys.ProjectData__EditorOwnedKeys__Keys = []; })
    };

    const loaded = await Na__TestEnv__LoadWorker({ variants : variants });
    const worker = loaded.worker;
    const guards = loaded.guards;

    const FOLDER   = '2026/3047__Doous';
    const KEY      = `VaApps/Projects/${FOLDER}/project.json`;
    const BASE     = `/api/editor/projects/${encodeURIComponent(FOLDER)}`;
    const STAMP_A  = '2026-09-30T10:15:00.000Z';
    const STAMP_B  = '2026-10-01T08:00:00.000Z';

    const SEED = {
        projectCode : '3047',
        projectName : 'Doous',
        folderId    : '2026/3047__Doous',
        basePath    : 'Projects/2026/3047__Doous',
        images      : ['IMG01__Front.png'],
        valeVision_ModelUrls : ['https://cdn.noble-architecture.com/VaApps/Projects/2026/3047__Doous/Doous__Main.glb'],
        Camera__DefaultPosition : { x : 1, y : 2, z : 3 },
        valeVision_Camera__DefaultPosition : { x : 9, y : 9, z : 9 },
        Navmode__EnabledModes : ['orbit', 'walk'],
        LayoutEditor__DrawingsData : { LayoutEditor__DrawingsData__Sheets : [{ Sheet__Id : 'S1' }], LayoutEditor__DrawingsData__SavedIso : STAMP_A },
        ValeVison3D__SketchUpCameraData : { fov : 35 }
    };

    let bucket = new Na__TestEnv__R2Bucket();
    let env    = Na__TestEnv__Env(bucket);
    const fresh = (document) => {
        bucket = new Na__TestEnv__R2Bucket();
        env    = Na__TestEnv__Env(bucket);
        if (document !== undefined) bucket.seed(KEY, typeof document === 'string' ? document : JSON.stringify(document, null, 4), { contentType : 'application/json', cacheControl : 'no-cache, max-age=0' });
    };
    const merge = (body, options) => Na__TestEnv__Call(worker, env, 'POST', `${BASE}/merge-keys`, Object.assign({ json : body }, options || {}));
    const stored = () => JSON.parse(bucket.textOf(KEY));

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | GET project
// -----------------------------------------------------------------------------

    T.section('GET .../project');
    {
        const text = JSON.stringify(SEED, null, 4);
        fresh(text);
        const answer = await Na__TestEnv__Call(worker, env, 'GET', `${BASE}/project`);
        T.check('answers 200 with project.json byte for byte', answer.status === 200 && answer.text === text, answer.status);
        T.check('answers Cache-Control: no-store', answer.headers.get('Cache-Control') === 'no-store', answer.headers.get('Cache-Control'));
        T.check('answers application/json with the CORS headers', (answer.headers.get('Content-Type') || '').indexOf('application/json') === 0 && answer.headers.get('Access-Control-Allow-Origin') === 'http://localhost:8000');
        const perSegment = await Na__TestEnv__Call(worker, env, 'GET', '/api/editor/projects/2026/3047__Doous/project');
        T.check('the per-segment folderId reads the same document', perSegment.status === 200 && perSegment.text === text, perSegment.status);
        const noKey = await Na__TestEnv__Call(worker, env, 'GET', `${BASE}/project`, { key : null });
        T.check('answers 401 without X-Editor-Api-Key', noKey.status === 401, noKey.status);
        const badId = await Na__TestEnv__Call(worker, env, 'GET', '/api/editor/projects/2026/project');
        T.check('a bad folderId ("2026") answers 400', badId.status === 400, badId.status);
        fresh();
        const missing = await Na__TestEnv__Call(worker, env, 'GET', `${BASE}/project`);
        T.check('answers 404 { missing: true } when R2 holds no project.json', missing.status === 404 && missing.json && missing.json.missing === true, [missing.status, missing.json]);
        fresh('{ not json');
        const broken = await Na__TestEnv__Call(worker, env, 'GET', `${BASE}/project`);
        T.check('answers 500 for a project.json that is not JSON', broken.status === 500, broken.status);
        T.check('GET writes nothing', bucket.writes().length === 0, bucket.writes());
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | merge-keys: the Merge Itself
// -----------------------------------------------------------------------------

    T.section('MERGE-KEYS: SET, REMOVE, ORDER, FORMAT');
    {
        fresh(SEED);
        const drawings = { LayoutEditor__DrawingsData__Sheets : [{ Sheet__Id : 'S1' }, { Sheet__Id : 'S2' }], LayoutEditor__DrawingsData__SavedIso : STAMP_B };
        const answer = await merge({ set : { LayoutEditor__DrawingsData : drawings, LayoutEditor__DrawingRegister : { Register__Rows : [] } }, remove : ['Navmode__EnabledModes'] });
        T.check('answers 200 { success: true }', answer.status === 200 && answer.json && answer.json.success === true && answer.json.ok === true, [answer.status, answer.json]);
        T.check('answers drawings.savedIso as written', answer.json && answer.json.drawings && answer.json.drawings.savedIso === STAMP_B, answer.json && answer.json.drawings);
        T.check('answers the keys set and removed', answer.json && JSON.stringify(answer.json.set) === JSON.stringify(['LayoutEditor__DrawingsData', 'LayoutEditor__DrawingRegister']) && JSON.stringify(answer.json.removed) === JSON.stringify(['Navmode__EnabledModes']), answer.json);
        const after = stored();
        T.check('the set block is on R2', JSON.stringify(after.LayoutEditor__DrawingsData) === JSON.stringify(drawings));
        T.check('the removed key is gone', !Object.prototype.hasOwnProperty.call(after, 'Navmode__EnabledModes'));
        T.check('every pipeline key is untouched', ['projectCode', 'projectName', 'folderId', 'basePath', 'images', 'valeVision_ModelUrls', 'ValeVison3D__SketchUpCameraData'].every((k) => JSON.stringify(after[k]) === JSON.stringify(SEED[k])));
        T.check('every other key keeps its place; a new key is added at the end',
            JSON.stringify(Object.keys(after)) === JSON.stringify(Object.keys(SEED).filter((k) => k !== 'Navmode__EnabledModes').concat(['LayoutEditor__DrawingRegister'])), Object.keys(after));
        T.check('project.json is written as 4-space JSON', bucket.textOf(KEY) === JSON.stringify(after, null, 4));
        T.check('project.json is stored application/json, no-cache, max-age=0', JSON.stringify(bucket.metadataOf(KEY)) === JSON.stringify({ contentType : 'application/json', cacheControl : 'no-cache, max-age=0' }), bucket.metadataOf(KEY));
        T.check('the build manifest was not written (no bumpBuild)', bucket.writesTo(NA_MANIFEST_KEY) === 0 && !bucket.has(NA_MANIFEST_KEY));
        T.check('the master index was not touched', bucket.writesTo(NA_INDEX_KEY) === 0);
        T.check('the only write was project.json', bucket.writes().length === 1 && bucket.writes()[0].key === KEY, bucket.writes());

        const legacy = await merge({ remove : ['valeVision_Camera__DefaultPosition'] });
        T.check('remove may name the legacy valeVision_Camera__DefaultPosition', legacy.status === 200 && !Object.prototype.hasOwnProperty.call(stored(), 'valeVision_Camera__DefaultPosition'), [legacy.status, legacy.json]);
        const legacySet = await merge({ set : { valeVision_Camera__DefaultPosition : { x : 0 } } });
        T.check('set may NOT name the legacy key', legacySet.status === 400 && legacySet.json.refused && legacySet.json.refused[0].reason.indexOf('legacy') !== -1, [legacySet.status, legacySet.json]);
        const absent = await merge({ remove : ['OrbitHelperCube__Position'] });
        T.check('removing a listed key the document does not hold is a harmless no-op', absent.status === 200 && JSON.stringify(absent.json.removed) === '[]', [absent.status, absent.json]);
        const nullValue = await merge({ set : { FogPlane__Config : null } });
        T.check('a listed key may be set to null', nullValue.status === 200 && stored().FogPlane__Config === null, nullValue.status);
        const spaced = '2025/FN-62104__Fenner Scheme-01';
        bucket.seed(`VaApps/Projects/${spaced}/project.json`, '{"projectCode":"62104"}');
        const space = await Na__TestEnv__Call(worker, env, 'POST', '/api/editor/projects/2025/FN-62104__Fenner%20Scheme-01/merge-keys', { json : { set : { Camera__DefaultPosition : { x : 5 } } } });
        T.check('a folderId with a space merges into its own project.json', space.status === 200 && JSON.parse(bucket.textOf(`VaApps/Projects/${spaced}/project.json`)).Camera__DefaultPosition.x === 5, [space.status, space.json]);
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Both Directions Against ProjectData__EditorOwnedKeys
// -----------------------------------------------------------------------------

    T.section('BOTH DIRECTIONS AGAINST ProjectData__EditorOwnedKeys');
    {
        T.check(`the worker's key list is exactly the app config's list (${LIST.length} keys)`, JSON.stringify(Array.from(guards.na_editor_owned_keys())) === JSON.stringify(LIST), guards.na_editor_owned_keys());
        T.check('the bundled guard is usable', guards.na_editor_key_guard().ok === true, guards.na_editor_key_guard().error);

        const passed = [];
        const failedKeys = [];
        for (const key of LIST) {
            fresh(SEED);
            const set    = await merge({ set : { [key] : { Test__Value : key } } });
            const setOk  = set.status === 200 && JSON.stringify(stored()[key]) === JSON.stringify({ Test__Value : key });
            const remove = await merge({ remove : [key] });
            const remOk  = remove.status === 200 && !Object.prototype.hasOwnProperty.call(stored(), key);
            (setOk && remOk ? passed : failedKeys).push([key, set.status, remove.status]);
        }
        T.check(`every listed key passes merge-keys, set and remove (${passed.length}/${LIST.length})`, failedKeys.length === 0 && passed.length === LIST.length, failedKeys);

        const insideFamilies = [
            'LayoutEditor__Foo', 'LayoutEditor__DrawingsData__SavedIso', 'LayoutEditor__DrawingsDataX',
            'PresentationMode__Scenes', 'PresentationMode__SavedCameraScenes__Backup',
            'CrossSection__Other', 'Navmode__FovOverrides', 'Camera__Other', 'OrbitHelperCube__Other',
            'FogPlane__Other', 'RenderEngine__Other', 'VideoStudio__Other', 'GridLine__Other',
            'RenderEffect__AssetCullDistanceMm', 'SitePlan__DataStores'
        ];
        const outsideFamilies = [
            'projectCode', 'projectName', 'folderId', 'basePath', 'images', 'allImages', 'displayImages', 'thumbnailImage',
            'valeVision_ModelUrls', 'valeVision_ModelUrl', 'ValeVison3D__SketchUpCameraData',
            'foo', '__proto__', 'constructor', 'toString', 'hasOwnProperty', '', ' LayoutEditor__DrawingsData', 'layouteditor__drawingsdata'
        ];
        for (const [label, keys] of [['inside a listed prefix family', insideFamilies], ['outside every family', outsideFamilies]]) {
            const leaks = [];
            for (const key of keys) {
                fresh(SEED);
                const before = bucket.textOf(KEY);
                const set    = await merge({ set : JSON.parse(`{${JSON.stringify(key)}:1}`) });
                const remove = await merge({ remove : [key] });
                if (set.status !== 400 || remove.status !== 400 || bucket.textOf(KEY) !== before || bucket.writes().length !== 0) leaks.push([key, set.status, remove.status]);
            }
            T.check(`every unlisted key ${label} is refused, set and remove, with nothing written (${keys.length} keys)`, leaks.length === 0, leaks);
        }

        fresh(SEED);
        const pipeline = await merge({ set : { images : [] } });
        T.check('a pipeline key is refused as pipeline-owned', pipeline.status === 400 && pipeline.json.refused[0].reason.indexOf('pipeline') === 0, pipeline.json);
        const mixed = await merge({ set : { LayoutEditor__DrawingsData : {}, projectCode : 'X' } });
        T.check('a merge naming one listed and one unlisted key is refused whole, nothing written', mixed.status === 400 && bucket.writes().length === 0 && stored().projectCode === '3047', [mixed.status, mixed.json]);
        T.check('the refusal names each refused key', mixed.json && Array.isArray(mixed.json.refused) && mixed.json.refused.length === 1 && mixed.json.refused[0].key === 'projectCode', mixed.json);
    }

    T.section('THE LIST GOVERNS: A WORKER BUILT WITH ANOTHER LIST FOLLOWS IT');
    {
        const changed = await loaded.loadVariant('changed');
        const changedGuards = await loaded.loadVariantGuards('changed');
        T.check('the variant worker reads the changed list', JSON.stringify(Array.from(changedGuards.na_editor_owned_keys())) === JSON.stringify(LIST.filter((k) => k !== DROPPED).concat([ADDED_KEY])), changedGuards.na_editor_owned_keys());
        fresh(SEED);
        const call = (w, body) => Na__TestEnv__Call(w, env, 'POST', `${BASE}/merge-keys`, { json : body });
        const added = await call(changed, { set : { [ADDED_KEY] : true } });
        T.check(`a key added to the list (${ADDED_KEY}) passes, with no change to the worker's code`, added.status === 200 && stored()[ADDED_KEY] === true, [added.status, added.json]);
        const dropped = await call(changed, { set : { [DROPPED] : {} } });
        T.check(`a key taken off the list (${DROPPED}) is refused`, dropped.status === 400, [dropped.status, dropped.json]);
        const original = await call(worker, { set : { [ADDED_KEY] : true } });
        T.check(`the worker built with the real list still refuses ${ADDED_KEY}`, original.status === 400, original.status);

        for (const name of ['pipeline', 'missing', 'empty']) {
            const broken = await loaded.loadVariant(name);
            fresh(SEED);
            const answer = await call(broken, { set : { LayoutEditor__DrawingsData : {} } });
            T.check(`a list that is ${name === 'pipeline' ? 'naming a pipeline key' : name} refuses every merge (500, fails closed), nothing written`, answer.status === 500 && bucket.writes().length === 0, [answer.status, answer.json]);
        }

        const built = guards.na_build_editor_key_guard(['A__One', 'A__One']);
        T.check('the guard builder refuses a list naming a key twice', built.ok === false, built.error);
        T.check('the guard builder refuses a malformed name', guards.na_build_editor_key_guard(['ok__Key', 'bad key']).ok === false);
        T.check('the guard builder refuses the legacy remove-only key', guards.na_build_editor_key_guard(['valeVision_Camera__DefaultPosition']).ok === false);
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | 409s: Missing project.json and a Stale drawingsBase
// -----------------------------------------------------------------------------

    T.section('409: MISSING project.json');
    {
        fresh();
        const answer = await merge({ set : { LayoutEditor__DrawingsData : {} } });
        T.check('answers 409 { missing: true } when R2 holds no project.json', answer.status === 409 && answer.json && answer.json.missing === true, [answer.status, answer.json]);
        T.check('...and writes nothing (it never creates a project.json)', bucket.writes().length === 0 && !bucket.has(KEY));
        fresh('[1, 2, 3]');
        const notObject = await merge({ set : { LayoutEditor__DrawingsData : {} } });
        T.check('a project.json that is not a JSON object answers 500 and is left as it is', notObject.status === 500 && bucket.textOf(KEY) === '[1, 2, 3]', notObject.status);
    }

    T.section('409: A STALE drawingsBase');
    {
        const cases = [
            ['the window loaded another stamp',              SEED,                                   `iso:${STAMP_B}`, 409, STAMP_A],
            ['the window loaded no stamp, R2 has one',       SEED,                                   'none',           409, STAMP_A],
            ['the window loaded a stamp, R2 block has none', Object.assign({}, SEED, { LayoutEditor__DrawingsData : { LayoutEditor__DrawingsData__Sheets : [] } }), `iso:${STAMP_A}`, 409, null],
            ['the window loaded a stamp, R2 has no block',   { projectCode : '3047' },               `iso:${STAMP_A}`, 409, null],
            ['the stamps match',                             SEED,                                   `iso:${STAMP_A}`, 200, null],
            ['"none" and R2 block without a stamp',          Object.assign({}, SEED, { LayoutEditor__DrawingsData : { LayoutEditor__DrawingsData__Sheets : [] } }), 'none', 200, null],
            ['"none" and no block on R2',                    { projectCode : '3047' },               'none',           200, null],
            ['no drawingsBase (not judged)',                 SEED,                                   undefined,        200, null],
            ['drawingsBase null (not judged)',               SEED,                                   null,             200, null]
        ];
        for (const [label, document, base, status, conflictIso] of cases) {
            fresh(document);
            const before = bucket.textOf(KEY);
            const body   = { set : { LayoutEditor__DrawingsData : { LayoutEditor__DrawingsData__SavedIso : STAMP_B } } };
            if (base !== undefined) body.drawingsBase = base;
            const answer = await merge(body);
            if (status === 409) {
                T.check(`409 { conflict: true } when ${label}, nothing written`, answer.status === 409 && answer.json.conflict === true
                    && answer.json.drawings && answer.json.drawings.savedIso === conflictIso && bucket.textOf(KEY) === before && bucket.writes().length === 0, [answer.status, answer.json]);
            } else {
                T.check(`200 when ${label}`, answer.status === 200 && stored().LayoutEditor__DrawingsData.LayoutEditor__DrawingsData__SavedIso === STAMP_B, [answer.status, answer.json]);
            }
        }
        fresh(SEED);
        for (const bad of ['A', 'iso:', 'ISO:2026', 'iso:a\nb', 123, {}, true]) {
            const answer = await merge({ set : { LayoutEditor__DrawingsData : {} }, drawingsBase : bad });
            T.check(`a malformed drawingsBase (${JSON.stringify(bad)}) answers 400`, answer.status === 400, answer.status);
        }
        T.check('no malformed drawingsBase wrote anything', bucket.writes().length === 0);
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Build Manifest
// -----------------------------------------------------------------------------

    T.section('THE BUILD MANIFEST: ONLY WITH bumpBuild: true');
    {
        fresh(SEED);
        await merge({ set : { Camera__DefaultPosition : { x : 0 } } });
        await merge({ set : { Camera__DefaultPosition : { x : 1 } }, bumpBuild : false });
        T.check('no bump without bumpBuild, and none with bumpBuild: false', bucket.writesTo(NA_MANIFEST_KEY) === 0 && !bucket.has(NA_MANIFEST_KEY));
        const bumped = await merge({ set : { Camera__DefaultPosition : { x : 2 } }, bumpBuild : true });
        const manifest = bucket.has(NA_MANIFEST_KEY) ? JSON.parse(bucket.textOf(NA_MANIFEST_KEY)) : null;
        T.check('bumpBuild: true writes the manifest once', bumped.status === 200 && bucket.writesTo(NA_MANIFEST_KEY) === 1 && bumped.json.buildBumped === true, [bumped.status, bucket.writesTo(NA_MANIFEST_KEY)]);
        T.check('the manifest names this project and the answer\'s build version', manifest && manifest.lastProject === FOLDER && manifest.buildVersion === bumped.json.buildVersion && typeof manifest.buildDate === 'string', manifest);
        for (const bad of ['yes', 1, null, 'true']) {
            const answer = await merge({ set : { Camera__DefaultPosition : { x : 3 } }, bumpBuild : bad });
            T.check(`bumpBuild ${JSON.stringify(bad)} answers 400`, answer.status === 400, answer.status);
        }
        const refused = await merge({ set : { projectCode : 'X' }, bumpBuild : true });
        T.check('a refused merge never bumps, even when it asks to', refused.status === 400 && bucket.writesTo(NA_MANIFEST_KEY) === 1);
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Bodies
// -----------------------------------------------------------------------------

    T.section('BODIES');
    {
        fresh(SEED);
        for (const [label, body] of [
            ['a body that is not JSON',                 '{"set":'],
            ['a JSON array',                            '[]'],
            ['set as a list',                           { set : [['Camera__DefaultPosition', 1]] }],
            ['set null',                                { set : null }],
            ['remove as a string',                      { remove : 'Camera__DefaultPosition' }],
            ['remove holding a number',                 { remove : [1] }],
            ['both empty',                              { set : {}, remove : [] }],
            ['nothing at all',                          {}],
            ['a key both set and removed',              { set : { Camera__DefaultPosition : 1 }, remove : ['Camera__DefaultPosition'] }],
            ['a top-level projectCode (old-route shape)', { projectCode : '3047', set : { Camera__DefaultPosition : 1 } }],
            ['a flat body with no set',                 { LayoutEditor__DrawingsData : {} }],
            ['an unknown field',                        { set : { Camera__DefaultPosition : 1 }, force : true }]
        ]) {
            const answer = await merge(body);
            T.check(`refused: ${label} (400)`, answer.status === 400 && answer.json && typeof answer.json.error === 'string', [answer.status, answer.json]);
        }
        T.check('no refused body wrote anything', bucket.writes().length === 0);
        const noKey = await merge({ set : { Camera__DefaultPosition : 1 } }, { key : null });
        T.check('merge-keys without X-Editor-Api-Key answers 401', noKey.status === 401, noKey.status);
        const badId = await Na__TestEnv__Call(worker, env, 'POST', '/api/editor/projects/2026/merge-keys', { json : { set : { Camera__DefaultPosition : 1 } } });
        T.check('merge-keys with folderId "2026" answers 400', badId.status === 400, badId.status);
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | A Write Between the Read and the Write
// -----------------------------------------------------------------------------

    T.section('CONCURRENT WRITES');
    {
        // ANOTHER WRITER LANDS FIRST | e.g. the SketchUp sync adds a new edition's images
        fresh(SEED);
        bucket.onBeforeConditionalPut = (key, b) => {
            const doc = JSON.parse(b.textOf(key));
            doc.images = ['IMG01__Front__v2.png'];
            b.seed(key, JSON.stringify(doc, null, 4), { contentType : 'application/json' });
        };
        const answer = await merge({ set : { Navmode__OrbitMaxDistanceMm : 90000 } });
        const after  = stored();
        T.check('the merge succeeds', answer.status === 200, [answer.status, answer.json]);
        T.check('the other writer\'s change is kept', JSON.stringify(after.images) === JSON.stringify(['IMG01__Front__v2.png']), after.images);
        T.check('...and the merge is on top of it', after.Navmode__OrbitMaxDistanceMm === 90000);
        T.check('the first conditional write was refused and the merge made again', bucket.log.filter((e) => e.op === 'put-refused').length === 1 && bucket.log.filter((e) => e.op === 'get' && e.key === KEY).length === 2, bucket.log);

        // IT KEEPS CHANGING | three refusals: 503, and the merge itself writes nothing
        fresh(SEED);
        let changes = 0;
        const rearm = (key, b) => { changes++; const doc = JSON.parse(b.textOf(key)); doc.images = [`IMG0${changes}.png`]; b.seed(key, JSON.stringify(doc), {}); b.onBeforeConditionalPut = rearm; };
        bucket.onBeforeConditionalPut = rearm;
        const busy = await merge({ set : { Navmode__OrbitMaxDistanceMm : 1 } });
        bucket.onBeforeConditionalPut = null;
        T.check('answers 503 { retry: true } when project.json keeps changing', busy.status === 503 && busy.json.retry === true, [busy.status, busy.json]);
        T.check('...with nothing of the merge written', bucket.writes().length === 0 && !Object.prototype.hasOwnProperty.call(stored(), 'Navmode__OrbitMaxDistanceMm'), bucket.writes());

        // THE CONDITION IS NOT HONOURED | the etag has not moved, so the write goes ahead
        fresh(SEED);
        bucket.conditionalsBroken = true;
        const warned = [];
        const warn = console.warn;
        console.warn = (...args) => { warned.push(args.join(' ')); };
        const unconditional = await merge({ set : { Navmode__OrbitMaxDistanceMm : 2 } });
        console.warn = warn;
        T.check('when R2 refuses the condition with the etag unchanged, the merge still lands', unconditional.status === 200 && stored().Navmode__OrbitMaxDistanceMm === 2, [unconditional.status, unconditional.json]);
        T.check('...and says so in the log', warned.some((line) => line.indexOf('conditional write was refused with the etag unchanged') !== -1), warned);
    }

// endregion -------------------------------------------------------------------

    rmSync(SCRATCH, { recursive : true, force : true });
    T.finish();
