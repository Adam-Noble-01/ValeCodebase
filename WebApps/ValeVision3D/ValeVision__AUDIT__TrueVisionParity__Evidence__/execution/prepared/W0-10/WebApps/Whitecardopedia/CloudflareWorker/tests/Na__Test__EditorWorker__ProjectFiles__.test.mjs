// =============================================================================
// WHITECARDOPEDIA - EDITOR API WORKER - TEST - ROUTING AND THE PROJECT FILES FAMILY
// =============================================================================
//
// FILE       : tests/Na__Test__EditorWorker__ProjectFiles__.test.mjs
// NAMESPACE  : Na__Test
// MODULE     : Editor Worker Test - Routing, folderId Check and Project Files
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Prove worker 1.6.0's routing and its guarded project-file families
//              against an in-memory R2 bucket, before anything is deployed
// CREATED    : 01-Oct-2026
//
// DESCRIPTION:
// - The worker's own fetch handler runs in Node over a Map-backed env.R2_BUCKET
//   (Na__TestEnv__EditorWorker__R2Bucket__.mjs): no Cloudflare account, no
//   network, no wrangler.
// - ROUTING: the health check reports 1.6.0 and its route list; every project
//   route answers 401 without the key; a path no route matches answers a JSON
//   404 with or without the key; the folderId is checked on every /projects/
//   route ("/2026/delete" and "/2026/rename" are refused, never read as the
//   whole year); every master-index folderId and every local project folder
//   passes, whole-encoded and per segment; the existing routes still work.
// - FAMILIES: each family accepts its own paths and refuses project.json,
//   00__Archive folders, "..", cross-family copies, deletes outside one
//   published document and unmanaged sheet-picture names; sheet pictures are
//   refused when their bytes do not hash to their name or are not the type
//   their extension says; size caps and Content-Length rules hold.
// - NO FILES ROUTE TOUCHES THE BUILD MANIFEST, and every key written sits under
//   VaApps/Projects/<folderId>/.
//
// USAGE (from anywhere):
//     node tests/Na__Test__EditorWorker__ProjectFiles__.test.mjs
//   Exit 0 = every check passed. Exit 1 = at least one did not.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.0
// - Initial implementation with worker 1.6.0.
//
// =============================================================================

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
    NA_MANIFEST_KEY,
    Na__TestEnv__R2Bucket,
    Na__TestEnv__LoadWorker,
    Na__TestEnv__Env,
    Na__TestEnv__Call,
    Na__TestEnv__Checks,
    Na__TestEnv__Picture,
    Na__TestEnv__Base64
} from './Na__TestEnv__EditorWorker__R2Bucket__.mjs';

// -----------------------------------------------------------------------------
// REGION | Set-Up
// -----------------------------------------------------------------------------

    const T       = Na__TestEnv__Checks('Whitecardopedia editor worker 1.6.0 - routing and the project files family');
    const loaded  = await Na__TestEnv__LoadWorker();
    const worker  = loaded.worker;
    const guards  = loaded.guards;

    const FOLDER  = '2026/3047__Doous';
    const PREFIX  = `VaApps/Projects/${FOLDER}/`;
    const BASE    = `/api/editor/projects/${encodeURIComponent(FOLDER)}`;
    const IMG     = '05__Layout__DrawingDocs__Images';
    const PUB     = '06__Layout__PublishedDocuments';
    const STMT    = '10__StatementDocs';
    const NO_CACHE  = 'no-cache, max-age=0';
    const IMMUTABLE = 'public, max-age=31536000, immutable';
    const MUTABLE   = 'public, max-age=60, must-revalidate';

    let bucket = new Na__TestEnv__R2Bucket();
    let env    = Na__TestEnv__Env(bucket);
    const call = (method, path, options) => Na__TestEnv__Call(worker, env, method, path, options);
    const files = (op, json, options) => call('POST', `${BASE}/files/${op}`, Object.assign({ json : json }, options || {}));
    const upload = (path, bytes, options) => call('POST', `${BASE}/files/upload?path=${encodeURIComponent(path)}`, Object.assign({ bytes : bytes }, options || {}));
    const fresh = () => { bucket = new Na__TestEnv__R2Bucket(); env = Na__TestEnv__Env(bucket); };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Health, Unknown Routes and the Key
// -----------------------------------------------------------------------------

    T.section('HEALTH, UNKNOWN ROUTES, THE KEY');
    {
        const health = await call('GET', '/api/editor/health', { key : null });
        T.check('GET /api/editor/health answers 200 without a key', health.status === 200, health.status);
        T.check('health reports version 1.6.0', health.json && health.json.version === '1.6.0', health.json);
        T.check('health names the worker', health.json && health.json.worker === 'whitecardopedia-editor-api', health.json);
        T.check('health lists the routes save, assets, drawing-notes, project, merge-keys, files',
            health.json && JSON.stringify(health.json.routes) === JSON.stringify(['save', 'assets', 'drawing-notes', 'project', 'merge-keys', 'files']), health.json);
        T.check('health echoes the localhost origin (CORS unchanged)', health.headers.get('Access-Control-Allow-Origin') === 'http://localhost:8000', health.headers.get('Access-Control-Allow-Origin'));

        const preflight = await call('OPTIONS', `${BASE}/files/upload?path=x`, { key : null });
        T.check('OPTIONS preflight answers 204', preflight.status === 204, preflight.status);
        T.check('preflight allows GET, POST, OPTIONS and X-Editor-Api-Key (CORS helper unchanged)',
            preflight.headers.get('Access-Control-Allow-Methods') === 'GET, POST, OPTIONS'
            && preflight.headers.get('Access-Control-Allow-Headers') === 'Content-Type, X-Editor-Api-Key', [preflight.headers.get('Access-Control-Allow-Methods'), preflight.headers.get('Access-Control-Allow-Headers')]);

        for (const [method, path] of [
            ['GET',  '/api/editor/unknown'],
            ['POST', '/api/editor/unknown'],
            ['GET',  '/api/nothing-here'],
            ['GET',  '/'],
            ['POST', `${BASE}/files/unknown`],
            ['POST', `${BASE}/no-such-route`],
            ['GET',  `${BASE}/files/read`],
            ['GET',  `${BASE}/merge-keys`],
            ['POST', `${BASE}/project`],
            ['GET',  BASE],
            ['POST', '/api/editor/projects/'],
            ['POST', '/api/editor/health']
        ]) {
            for (const key of [undefined, null]) {
                const answer = await call(method, path, key === null ? { key : null } : {});
                T.check(`${method} ${path} ${key === null ? 'without' : 'with'} the key answers a JSON 404`,
                    answer.status === 404 && answer.json && typeof answer.json.error === 'string'
                    && (answer.headers.get('Content-Type') || '').indexOf('application/json') === 0, [answer.status, answer.text.slice(0, 120)]);
            }
        }

        for (const op of ['read', 'write', 'upload', 'list', 'copy', 'delete']) {
            const path   = op === 'upload' ? `${BASE}/files/upload?path=ValeVision__DrawingNotes__.json` : `${BASE}/files/${op}`;
            const none   = await call('POST', path, op === 'upload' ? { bytes : new Uint8Array([1]), key : null } : { json : {}, key : null });
            const wrong  = await call('POST', path, op === 'upload' ? { bytes : new Uint8Array([1]), key : 'not-the-key' } : { json : {}, key : 'not-the-key' });
            T.check(`files/${op} without X-Editor-Api-Key answers 401`, none.status === 401, none.status);
            T.check(`files/${op} with a wrong key answers 401`, wrong.status === 401, wrong.status);
        }
        for (const [method, suffix] of [['POST', ''], ['POST', '/visibility'], ['POST', '/rename'], ['POST', '/delete'], ['GET', '/drawing-notes'], ['POST', '/drawing-notes'], ['POST', '/assets']]) {
            const answer = await call(method, BASE + suffix, method === 'GET' ? { key : null } : { json : {}, key : null });
            T.check(`existing route ${method} {folderId}${suffix || ''} still answers 401 without the key`, answer.status === 401, answer.status);
        }
        T.check('no request in this section wrote anything', bucket.writes().length === 0, bucket.writes());
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | folderId Check on Every /projects/ Route
// -----------------------------------------------------------------------------

    T.section('FOLDERID CHECK');
    {
        fresh();
        bucket.seed('VaApps/Projects/2026/1111__Keep/project.json', '{"projectCode":"1111"}');
        bucket.seed('VaApps/Projects/2026/2222__Keep/PresentationMode/Thumbnails/Scene_001.webp', 'x');
        const before = bucket.snapshot();

        const refusedYear = await call('POST', '/api/editor/projects/2026/delete', { json : {} });
        T.check('POST /api/editor/projects/2026/delete is refused (400), never a delete of every 2026 project', refusedYear.status === 400, [refusedYear.status, refusedYear.json]);
        const refusedRename = await call('POST', '/api/editor/projects/2026/rename', { json : { newFolderId : '2027/X', updatedProjectData : {} } });
        T.check('POST /api/editor/projects/2026/rename is refused (400), never a move of every 2026 project', refusedRename.status === 400, [refusedRename.status, refusedRename.json]);
        const refusedVis = await call('POST', '/api/editor/projects/2026/visibility', { json : { enabled : false } });
        T.check('POST /api/editor/projects/2026/visibility is refused (400)', refusedVis.status === 400, refusedVis.status);
        T.check('...and every object under VaApps/Projects/2026/ is still there', JSON.stringify(Array.from(bucket.snapshot())) === JSON.stringify(Array.from(before)));

        for (const [label, raw] of [
            ['a year alone',               '2026'],
            ['no year',                    'abcd%2F3047__Doous'],
            ['a three-digit year',         '202%2F3047__Doous'],
            ['a pipe in the folder',       '2026%2F30%7C47'],
            ['a colon in the folder',      '2026%2F30%3A47'],
            ['a quote in the folder',      '2026%2F30%2247'],
            ['a backslash in the folder',  '2026%2F30%5C47'],
            ['a ".." folder',              '2026%2F..'],
            ['a "." folder',               '2026%2F.'],
            ['a trailing space',           '2026%2F3047__Doous%20'],
            ['a leading space',            '2026%2F%203047__Doous'],
            ['a trailing dot',             '2026%2F3047__Doous.'],
            ['a control character',        '2026%2F3047%0A__Doous'],
            ['a stray %',                  '2026%2F3047__Doous%E0%A4%A']
        ]) {
            const answer = await call('POST', `/api/editor/projects/${raw}/files/read`, { json : { path : 'ValeVision__DrawingNotes__.json' } });
            T.check(`files/read with ${label} in the folderId answers 400`, answer.status === 400 && answer.json && typeof answer.json.error === 'string', [answer.status, answer.json]);
        }
        const multi = await call('POST', '/api/editor/projects/2026/3047__Doous/extra', { json : { projectCode : '3047' } });
        T.check('a generic save whose "folderId" has three segments is a 404, never a save', multi.status === 404, multi.status);
        T.check('nothing in this section wrote anything', bucket.writes().length === 0, bucket.writes());
    }

    T.section('EVERY KNOWN FOLDERID PASSES');
    {
        fresh();
        const index = JSON.parse(readFileSync(loaded.masterIndexPath, 'utf8'));
        const ids   = (Array.isArray(index) ? index : index.projects).map((entry) => entry.folderId);
        const local = [];
        for (const year of readdirSync(loaded.projectsDir).filter((name) => /^\d{4}$/.test(name))) {
            for (const name of readdirSync(join(loaded.projectsDir, year))) {
                if (statSync(join(loaded.projectsDir, year, name)).isDirectory()) local.push(`${year}/${name}`);
            }
        }
        T.check(`the master index holds folderIds (${ids.length})`, ids.length > 100, ids.length);
        T.check(`the local Projects folder holds project folders (${local.length})`, local.length > 100, local.length);

        const failed = [];
        for (const folderId of Array.from(new Set(ids.concat(local)))) {
            if (!guards.na_validate_folder_id(folderId).ok) { failed.push(['validate', folderId]); continue; }
            const whole   = `/api/editor/projects/${encodeURIComponent(folderId)}/files/read`;
            const segment = `/api/editor/projects/${folderId.split('/').map(encodeURIComponent).join('/')}/files/read`;
            for (const path of [whole, segment]) {
                const answer = await call('POST', path, { json : { path : 'ValeVision__DrawingNotes__.json' } });
                if (answer.status !== 404 || !answer.json || answer.json.missing !== true) failed.push([path, answer.status]);
            }
        }
        T.check(`every master-index folderId (${ids.length}) and local project folder (${local.length}) passes the check and reaches the route, whole-encoded and per segment`, failed.length === 0, failed.slice(0, 10));
        const spaced = ids.filter((id) => id.indexOf(' ') !== -1);
        T.check(`the folderIds with spaces pass too (${spaced.join(', ')})`, spaced.length > 0 && spaced.every((id) => guards.na_validate_folder_id(id).ok), spaced);
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Existing Routes Still Answer (backward compatible)
// -----------------------------------------------------------------------------

    T.section('EXISTING ROUTES');
    {
        fresh();
        const save = await call('POST', BASE, { json : { projectCode : '3047', projectName : 'Doous' } });
        T.check('the generic save route still saves (whole-encoded folderId)', save.status === 200 && save.json && save.json.success === true, [save.status, save.json]);
        T.check('...to VaApps/Projects/2026/3047__Doous/project.json', bucket.has(`${PREFIX}project.json`));
        T.check('...and still bumps the build manifest, as before 1.6.0', bucket.writesTo(NA_MANIFEST_KEY) === 1, bucket.writesTo(NA_MANIFEST_KEY));
        const perSegment = await call('POST', '/api/editor/projects/2026/3047__Doous', { json : { projectCode : '3047' } });
        T.check('the generic save route still saves with a per-segment folderId', perSegment.status === 200, perSegment.status);
        const noCode = await call('POST', BASE, { json : { projectName : 'Doous' } });
        T.check('the generic save still refuses a body without projectCode', noCode.status === 400, noCode.status);

        const notesPost = await call('POST', `${BASE}/drawing-notes`, { json : { notes : [] } });
        const notesGet  = await call('GET', `${BASE}/drawing-notes`);
        T.check('drawing-notes POST and GET still work', notesPost.status === 200 && notesGet.status === 200 && notesGet.json && Array.isArray(notesGet.json.notes), [notesPost.status, notesGet.status]);
        const asset = await call('POST', `${BASE}/assets`, { json : { path : 'LayoutEditor/Snapshots/s1.webp', encoding : 'base64', data : Na__TestEnv__Base64(Na__TestEnv__Picture('webp', 'asset').bytes) } });
        T.check('the /assets route still works', asset.status === 200 && asset.json && asset.json.ok === true, [asset.status, asset.json]);
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Each Family Accepts Its Own Paths
// -----------------------------------------------------------------------------

    T.section('EACH FAMILY ACCEPTS ITS OWN PATHS');
    fresh();
    {
        // F-SIB | Both sibling documents, written whole and read back parsed
        const notes = { LayoutEditor__DrawingNotes__Version : 1, Notes : [{ Code : 'EX01', Text : 'Existing wall to be retained' }] };
        const w1 = await files('write', { path : 'ValeVision__DrawingNotes__.json', data : notes });
        const r1 = await files('read', { path : 'ValeVision__DrawingNotes__.json' });
        T.check('F-SIB write ValeVision__DrawingNotes__.json', w1.status === 200 && w1.json.ok === true, [w1.status, w1.json]);
        T.check('F-SIB read gives the document back parsed as data', r1.status === 200 && JSON.stringify(r1.json.data) === JSON.stringify(notes), r1.json);
        T.check('F-SIB read reports contentType and lastModified', r1.json && r1.json.contentType === 'application/json' && typeof r1.json.lastModified === 'string', r1.json);
        T.check('F-SIB is stored no-cache, max-age=0 as application/json', JSON.stringify(bucket.metadataOf(`${PREFIX}ValeVision__DrawingNotes__.json`)) === JSON.stringify({ contentType : 'application/json', cacheControl : NO_CACHE }), bucket.metadataOf(`${PREFIX}ValeVision__DrawingNotes__.json`));
        T.check('F-SIB is stored as 4-space JSON', bucket.textOf(`${PREFIX}ValeVision__DrawingNotes__.json`) === JSON.stringify(notes, null, 4));
        const w2 = await files('write', { path : 'ValeVision__StatementDocs__.json', data : { Statements : [] } });
        T.check('F-SIB write ValeVision__StatementDocs__.json', w2.status === 200, w2.status);
        const index = await files('read', { path : 'ValeVision__StatementDocs__.json' });
        T.check('F-SIB read of the statement index after its write', index.status === 200 && JSON.stringify(index.json.data) === JSON.stringify({ Statements : [] }), index.status);

        // F-THUMB | Raw upload and base64 write
        const thumb = Na__TestEnv__Picture('webp', 'thumb');
        const u1 = await upload('PresentationMode/Thumbnails/Scene_007.webp', thumb.bytes, { contentType : 'image/webp' });
        T.check('F-THUMB raw upload', u1.status === 200 && u1.json.ok === true && u1.json.size === thumb.bytes.length, [u1.status, u1.json]);
        const r2 = await files('read', { path : 'PresentationMode/Thumbnails/Scene_007.webp' });
        T.check('F-THUMB read gives the bytes back as base64', r2.status === 200 && r2.json.encoding === 'base64' && r2.json.data === Na__TestEnv__Base64(thumb.bytes), r2.json && r2.json.encoding);
        T.check('F-THUMB is stored no-cache, max-age=0 as image/webp', JSON.stringify(bucket.metadataOf(`${PREFIX}PresentationMode/Thumbnails/Scene_007.webp`)) === JSON.stringify({ contentType : 'image/webp', cacheControl : NO_CACHE }));
        const w3 = await files('write', { path : 'PresentationMode/Thumbnails/Scene_008.png', encoding : 'base64', data : Na__TestEnv__Base64(Na__TestEnv__Picture('png', 'thumb2').bytes) });
        T.check('F-THUMB base64 write', w3.status === 200, [w3.status, w3.json]);

        // F-ASSET | Linework JSON and a snapshot
        const linework = { Linework__Version : 3, Segments : [[0, 0, 1, 1]] };
        const w4 = await files('write', { path : 'LayoutEditor/Linework/Elevation__Front__a1b2c3.json', data : linework });
        T.check('F-ASSET write linework JSON', w4.status === 200, [w4.status, w4.json]);
        const r4 = await files('read', { path : 'LayoutEditor/Linework/Elevation__Front__a1b2c3.json' });
        T.check('F-ASSET read gives the linework back parsed', r4.status === 200 && JSON.stringify(r4.json.data) === JSON.stringify(linework));
        const u4 = await upload('LayoutEditor/Snapshots/Sheet__D01__ff00aa.webp', Na__TestEnv__Picture('webp', 'snap').bytes);
        T.check('F-ASSET raw upload of a snapshot', u4.status === 200, [u4.status, u4.json]);

        // F-IMG | Managed pictures: upload, base64 write, list, copy, delete
        const pic1 = Na__TestEnv__Picture('webp', 'front-cgi');
        const pic2 = Na__TestEnv__Picture('png', 'site-photo');
        const pic3 = Na__TestEnv__Picture('jpg', 'detail');
        const p1 = `${IMG}/RB05_D01/Front-CGI__${pic1.sha256.slice(0, 10)}.webp`;
        const p2 = `${IMG}/RB05_D01/Site-Photo__${pic2.sha256.slice(0, 10)}.png`;
        const p3 = `${IMG}/RB05_D02/Detail__${pic3.sha256.slice(0, 10)}.jpg`;
        const u5 = await upload(p1, pic1.bytes, { contentType : 'image/webp' });
        T.check('F-IMG raw upload of a managed WebP', u5.status === 200 && u5.json.cacheControl === IMMUTABLE && u5.json.contentType === 'image/webp', [u5.status, u5.json]);
        T.check('F-IMG is stored public, max-age=31536000, immutable', JSON.stringify(bucket.metadataOf(PREFIX + p1)) === JSON.stringify({ contentType : 'image/webp', cacheControl : IMMUTABLE }), bucket.metadataOf(PREFIX + p1));
        const w5 = await files('write', { path : p2, encoding : 'base64', data : Na__TestEnv__Base64(pic2.bytes) });
        T.check('F-IMG base64 write of a managed PNG', w5.status === 200, [w5.status, w5.json]);
        const u6 = await upload(p3, pic3.bytes, { contentType : 'image/jpeg' });
        T.check('F-IMG raw upload of a managed JPEG', u6.status === 200 && bucket.metadataOf(PREFIX + p3).contentType === 'image/jpeg', [u6.status, u6.json]);
        const r5 = await files('read', { path : p1 });
        T.check('F-IMG read gives the picture back', r5.status === 200 && r5.json.data === Na__TestEnv__Base64(pic1.bytes));
        const l1 = await files('list', { prefix : `${IMG}/` });
        T.check('F-IMG list of the pictures folder finds all three, paths relative to the project', l1.status === 200 && l1.json.objects.map((o) => o.path).sort().join('|') === [p1, p2, p3].sort().join('|'), l1.json);
        T.check('F-IMG list entries carry size, etag and uploaded', l1.json.objects.every((o) => typeof o.size === 'number' && typeof o.etag === 'string' && typeof o.uploaded === 'string'));
        const l2 = await files('list', { prefix : `${IMG}/RB05_D01/` });
        T.check('F-IMG list of one document folder', l2.status === 200 && l2.json.objects.length === 2, l2.json);
        const c1 = await files('copy', { from : p1, to : `${IMG}/RB05_D03/Front-CGI__${pic1.sha256.slice(0, 10)}.webp`, cacheControl : IMMUTABLE });
        T.check('F-IMG copy to another document folder, same name', c1.status === 200 && bucket.has(`${PREFIX}${IMG}/RB05_D03/Front-CGI__${pic1.sha256.slice(0, 10)}.webp`), [c1.status, c1.json]);
        T.check('F-IMG copy keeps the bytes and is stored immutable', Buffer.from(bucket.bytesOf(`${PREFIX}${IMG}/RB05_D03/Front-CGI__${pic1.sha256.slice(0, 10)}.webp`)).equals(Buffer.from(pic1.bytes))
            && bucket.metadataOf(`${PREFIX}${IMG}/RB05_D03/Front-CGI__${pic1.sha256.slice(0, 10)}.webp`).cacheControl === IMMUTABLE);
        const c2 = await files('copy', { from : `${IMG}/RB05_D09/Gone__${pic1.sha256.slice(0, 10)}.webp`, to : `${IMG}/RB05_D04/Gone__${pic1.sha256.slice(0, 10)}.webp` });
        T.check('F-IMG copy of a picture R2 does not hold answers 404 { missing: true }', c2.status === 404 && c2.json.missing === true, [c2.status, c2.json]);
        const d1 = await files('delete', { path : p3 });
        T.check('F-IMG delete of a managed picture', d1.status === 200 && d1.json.deleted === 1 && !bucket.has(PREFIX + p3), [d1.status, d1.json]);
        const d2 = await files('delete', { paths : [p1, `${IMG}/RB05_D03/Front-CGI__${pic1.sha256.slice(0, 10)}.webp`] });
        T.check('F-IMG delete of managed pictures across document folders', d2.status === 200 && d2.json.deleted === 2, [d2.status, d2.json]);
        bucket.seed(`${PREFIX}${IMG}/RB05_D01/legacy-scan.JPEG`, 'x');
        const r6 = await files('read', { path : `${IMG}/RB05_D01/legacy-scan.JPEG` });
        T.check('F-IMG read of an unmanaged name in the folder is allowed (read only)', r6.status === 200, r6.status);

        // F-PUB | Root files, document files, hashed and fixed names, streamed uploads, list pages, document-scoped delete
        const w6 = await files('write', { path : `${PUB}/PublishedDocuments__Index__.json`, data : { Documents : ['RB05_D01'] } });
        T.check('F-PUB write of the root index', w6.status === 200 && bucket.metadataOf(`${PREFIX}${PUB}/PublishedDocuments__Index__.json`).cacheControl === MUTABLE, [w6.status, w6.json]);
        const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>');
        const u7 = await upload(`${PUB}/RB05_D01/Viewport__V1__0123456789.svg`, svg, { contentType : 'image/svg+xml' });
        T.check('F-PUB streamed upload of a hashed vector', u7.status === 200 && u7.json.size === svg.length, [u7.status, u7.json]);
        T.check('F-PUB hashed names are stored immutable as image/svg+xml', JSON.stringify(bucket.metadataOf(`${PREFIX}${PUB}/RB05_D01/Viewport__V1__0123456789.svg`)) === JSON.stringify({ contentType : 'image/svg+xml', cacheControl : IMMUTABLE }));
        const pdf = new TextEncoder().encode('%PDF-1.7\n% a published drawing\n');
        const u8 = await upload(`${PUB}/RB05_D01/RB05_D01__Rev-A.pdf`, pdf, { contentType : 'application/pdf' });
        T.check('F-PUB streamed upload of a fixed-name PDF, stored public, max-age=60, must-revalidate', u8.status === 200 && bucket.metadataOf(`${PREFIX}${PUB}/RB05_D01/RB05_D01__Rev-A.pdf`).cacheControl === MUTABLE, [u8.status, u8.json]);
        const u9 = await upload(`${PUB}/RB05_D01/manifest.json`, new TextEncoder().encode('{"Sheets":[]}'), { contentType : 'application/json' });
        T.check('F-PUB upload of a document manifest (read whole, JSON checked)', u9.status === 200, [u9.status, u9.json]);
        const u10 = await upload(`${PUB}/RB05_D01/notes.md`, new TextEncoder().encode('# Notes'), {});
        T.check('F-PUB markdown is stored as text/markdown', u10.status === 200 && bucket.metadataOf(`${PREFIX}${PUB}/RB05_D01/notes.md`).contentType === 'text/markdown; charset=utf-8', bucket.metadataOf(`${PREFIX}${PUB}/RB05_D01/notes.md`));
        const deep = `${PUB}/RB05_D01/Sheets/A1/Tiles/T__0123456789.webp`;
        const u11 = await upload(deep, Na__TestEnv__Picture('webp', 'tile').bytes);
        T.check('F-PUB accepts six segments below the published folder', u11.status === 200, [u11.status, u11.json]);
        for (let i = 0; i < 23; i++) bucket.seed(`${PREFIX}${PUB}/RB05_D02/tile__${String(i).padStart(2, '0')}.json`, '{}');
        const pages = [];
        let cursor = null;
        for (let page = 0; page < 10; page++) {
            const answer = await files('list', cursor ? { prefix : `${PUB}/RB05_D02/`, limit : 10, cursor : cursor } : { prefix : `${PUB}/RB05_D02/`, limit : 10 });
            if (answer.status !== 200) { pages.push(answer.status); break; }
            pages.push(answer.json.objects.length);
            if (!answer.json.truncated) break;
            cursor = answer.json.cursor;
        }
        T.check('F-PUB list pages by cursor (23 files, pages of 10, 10, 3)', JSON.stringify(pages) === JSON.stringify([10, 10, 3]), pages);
        const l3 = await files('list', { prefix : `${PUB}/` });
        T.check('F-PUB list of the published root reaches every document', l3.status === 200 && l3.json.objects.length === 6 + 23, l3.json && l3.json.objects.length);
        const c3 = await files('copy', { from : `${PUB}/RB05_D01/manifest.json`, to : `${PUB}/RB05_D01/manifest__previous.json` });
        T.check('F-PUB copy inside the published family', c3.status === 200 && bucket.has(`${PREFIX}${PUB}/RB05_D01/manifest__previous.json`), [c3.status, c3.json]);
        const d3 = await files('delete', { paths : [`${PUB}/RB05_D01/RB05_D01__Rev-A.pdf`, `${PUB}/RB05_D01/manifest__previous.json`, deep] });
        T.check('F-PUB delete of files inside ONE document folder', d3.status === 200 && d3.json.deleted === 3 && !bucket.has(`${PREFIX}${deep}`), [d3.status, d3.json]);

        // F-STMT | Markdown, HTML, pictures, spaces and brackets, list
        const md = '# Design and Access Statement\n\nThe proposal...\n';
        const w7 = await files('write', { path : `${STMT}/01__PreApp__Statement/Statement.md`, data : md });
        const r7 = await files('read', { path : `${STMT}/01__PreApp__Statement/Statement.md` });
        T.check('F-STMT write and read a markdown statement as text', w7.status === 200 && r7.status === 200 && r7.json.text === md, [w7.status, r7.status, r7.json && r7.json.text]);
        T.check('F-STMT markdown is stored text/markdown, no-cache', JSON.stringify(bucket.metadataOf(`${PREFIX}${STMT}/01__PreApp__Statement/Statement.md`)) === JSON.stringify({ contentType : 'text/markdown; charset=utf-8', cacheControl : NO_CACHE }));
        const w8 = await files('write', { path : `${STMT}/01__PreApp__Statement/Statement.html`, data : '<h1>Statement</h1>', cacheControl : IMMUTABLE, contentType : 'text/plain' });
        T.check('F-STMT HTML write; a caller\'s cacheControl and contentType are advisory, never stored', w8.status === 200
            && JSON.stringify(bucket.metadataOf(`${PREFIX}${STMT}/01__PreApp__Statement/Statement.html`)) === JSON.stringify({ contentType : 'text/html; charset=utf-8', cacheControl : NO_CACHE }), [w8.status, bucket.metadataOf(`${PREFIX}${STMT}/01__PreApp__Statement/Statement.html`)]);
        const u12 = await upload(`${STMT}/01__PreApp__Statement/02_StatementDocs__Content__Images/02__Site__Location/Location__Far__.png`, Na__TestEnv__Picture('png', 'location').bytes);
        T.check('F-STMT upload of a picture four folders down (five segments)', u12.status === 200, [u12.status, u12.json]);
        const w9 = await files('write', { path : `${STMT}/02 Pre-App (Draft) [v2]/Statement & Notes.md`, data : 'draft' });
        T.check('F-STMT accepts spaces, & ( ) [ ] in names', w9.status === 200, [w9.status, w9.json]);
        const l4 = await files('list', { prefix : `${STMT}/01__PreApp__Statement/` });
        T.check('F-STMT list of a statement folder', l4.status === 200 && l4.json.objects.length === 3, l4.json && l4.json.objects);
        const l5 = await files('list', { prefix : `${STMT}/` });
        T.check('F-STMT list of the statements root', l5.status === 200 && l5.json.objects.length === 4, l5.json && l5.json.objects.length);
        const r8 = await files('read', { path : `${STMT}/01__PreApp__Statement/Nope.md` });
        T.check('a read of a file R2 does not hold answers 404 { missing: true }', r8.status === 404 && r8.json.missing === true, [r8.status, r8.json]);
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Refusals
// -----------------------------------------------------------------------------

    T.section('REFUSALS: project.json, ARCHIVES, "..", BAD PATHS');
    {
        const pic = Na__TestEnv__Picture('webp', 'refusals');
        const managed = (folder) => `${IMG}/${folder}/Pic__${pic.sha256.slice(0, 10)}.webp`;
        bucket.seed(`${PREFIX}project.json`, '{"projectCode":"3047"}');
        bucket.seed(`${PREFIX}${IMG}/00__Archive/Pic__${pic.sha256.slice(0, 10)}.webp`, pic.bytes);
        bucket.seed(`${PREFIX}${PUB}/00__Archive__Revisions/RB05_D01/manifest.json`, '{}');
        const before = bucket.snapshot();
        bucket.clearLog();

        const bad = [
            ['project.json', 'project.json'],
            ['project.json through its R2 key', `VaApps/Projects/${FOLDER}/project.json`],
            ['project.json behind "./"', './project.json'],
            ['a project file of another project', '../3048__Other/project.json'],
            ['TrueVision\'s prefix', 'NaProjectPortal/26-Projects/RB05/30__TrueVision__AppContent/TrueVision__ProjectData__.json'],
            ['the build manifest', '../../../Index/Na__BuildVersion__Manifest__.json'],
            ['a sheet picture in 00__Archive', `${IMG}/00__Archive/Pic__${pic.sha256.slice(0, 10)}.webp`],
            ['a published file in 00__Archive__Revisions', `${PUB}/00__Archive__Revisions/RB05_D01/manifest.json`],
            ['a statement in 00__Archive', `${STMT}/00__Archive/Statement.md`],
            ['a statement in the delete quarantine', `${STMT}/00__Deleted__Quarantine/Statement.md`],
            ['".." inside the pictures folder', `${IMG}/../project.json`],
            ['".." as a picture folder', `${IMG}/../Pic__${pic.sha256.slice(0, 10)}.webp`],
            ['".." inside a published path', `${PUB}/RB05_D01/../../project.json`],
            ['".." inside a statement path', `${STMT}/../project.json`],
            ['".." inside the thumbnails folder', 'PresentationMode/Thumbnails/../../project.json'],
            ['".." alone', '..'],
            ['a "." segment', `${STMT}/./Statement.md`],
            ['a leading slash', '/ValeVision__DrawingNotes__.json'],
            ['a backslash', `${STMT}\\01\\Statement.md`],
            ['an empty segment', `${STMT}//Statement.md`],
            ['a trailing slash', `${STMT}/01/`],
            ['a control character', `${STMT}/01/State\nment.md`],
            ['a sibling file not on the list', 'TrueVision__DrawingNotes__.json'],
            ['a thumbnail in a sub-folder', 'PresentationMode/Thumbnails/sub/Scene.webp'],
            ['a thumbnail with a JSON extension', 'PresentationMode/Thumbnails/Scene.json'],
            ['an asset outside Linework and Snapshots', 'LayoutEditor/SheetImages/x.webp'],
            ['a picture two folders down', `${IMG}/RB05/D01/Pic__${pic.sha256.slice(0, 10)}.webp`],
            ['a picture with a GIF extension', `${IMG}/RB05_D01/Pic.gif`],
            ['a picture folder starting with a dot', `${IMG}/.hidden/Pic__${pic.sha256.slice(0, 10)}.webp`],
            ['a published file with a ZIP extension', `${PUB}/RB05_D01/archive.zip`],
            ['a published path seven segments deep', `${PUB}/a/b/c/d/e/f/g.json`],
            ['a statement six segments deep', `${STMT}/a/b/c/d/e/f.md`],
            ['a statement with a .note suffix (local only)', `${STMT}/01/Statement.note`],
            ['a path in no family', 'Other/file.json']
        ];
        for (const [label, path] of bad) {
            const read  = await files('read', { path : path });
            const write = await files('write', { path : path, data : '{}' });
            const up    = await upload(path, new TextEncoder().encode('{}'));
            T.check(`refused: ${label} (read, write and upload all 400)`, read.status === 400 && write.status === 400 && up.status === 400, [read.status, write.status, up.status]);
        }
        for (const prefix of [`${IMG}/00__Archive/`, `${PUB}/00__Archive__Revisions/`, `${STMT}/00__Archive/`, `${STMT}/00__Deleted__Quarantine/`, `${IMG}/../`, 'project.json', `${IMG}`, '', 'PresentationMode/Thumbnails/', 'LayoutEditor/Linework/', `${IMG}/RB05_D01/Sub/`]) {
            const answer = await files('list', { prefix : prefix });
            T.check(`refused: list of "${prefix}"`, answer.status === 400, [answer.status, answer.json]);
        }
        T.check('no refused request read past its check or wrote anything', bucket.writes().length === 0 && JSON.stringify(Array.from(bucket.snapshot())) === JSON.stringify(Array.from(before)), bucket.writes());
    }

    T.section('REFUSALS: OPERATIONS A FAMILY DOES NOT ALLOW');
    {
        bucket.seed(`${PREFIX}ValeVision__DrawingNotes__.json`, '{}');
        bucket.seed(`${PREFIX}PresentationMode/Thumbnails/Scene_001.webp`, Na__TestEnv__Picture('webp', 't').bytes);
        bucket.seed(`${PREFIX}LayoutEditor/Snapshots/s.webp`, Na__TestEnv__Picture('webp', 's').bytes);
        bucket.seed(`${PREFIX}${STMT}/01/Statement.md`, '# x');
        bucket.clearLog();
        for (const [family, path] of [['F-SIB', 'ValeVision__DrawingNotes__.json'], ['F-THUMB', 'PresentationMode/Thumbnails/Scene_001.webp'], ['F-ASSET', 'LayoutEditor/Snapshots/s.webp'], ['F-STMT', `${STMT}/01/Statement.md`]]) {
            const del = await files('delete', { path : path });
            T.check(`refused: delete of ${family} (${path})`, del.status === 400 && bucket.has(PREFIX + path), [del.status, del.json]);
        }
        for (const [family, from, to] of [['F-SIB', 'ValeVision__DrawingNotes__.json', 'ValeVision__StatementDocs__.json'], ['F-THUMB', 'PresentationMode/Thumbnails/Scene_001.webp', 'PresentationMode/Thumbnails/Scene_002.webp'], ['F-ASSET', 'LayoutEditor/Snapshots/s.webp', 'LayoutEditor/Snapshots/t.webp'], ['F-STMT', `${STMT}/01/Statement.md`, `${STMT}/02/Statement.md`]]) {
            const copy = await files('copy', { from : from, to : to });
            T.check(`refused: copy inside ${family}`, copy.status === 400, [copy.status, copy.json]);
        }
        const upSib = await upload('ValeVision__DrawingNotes__.json', new TextEncoder().encode('{}'));
        T.check('refused: raw upload of a sibling document (F-SIB is read and write only)', upSib.status === 400, upSib.status);
        T.check('no refused operation wrote anything', bucket.writes().length === 0, bucket.writes());
    }

    T.section('REFUSALS: CROSS-FAMILY COPIES');
    {
        const pic = Na__TestEnv__Picture('webp', 'cross');
        const img = `${IMG}/RB05_D01/Pic__${pic.sha256.slice(0, 10)}.webp`;
        bucket.seed(PREFIX + img, pic.bytes);
        bucket.seed(`${PREFIX}${PUB}/RB05_D01/Viewport__V2__0123456789.webp`, pic.bytes);
        bucket.clearLog();
        for (const [label, from, to] of [
            ['sheet picture -> published', img, `${PUB}/RB05_D01/Pic__${pic.sha256.slice(0, 10)}.webp`],
            ['published -> sheet picture', `${PUB}/RB05_D01/Viewport__V2__0123456789.webp`, img.replace('RB05_D01', 'RB05_D02')],
            ['published -> statement', `${PUB}/RB05_D01/Viewport__V2__0123456789.webp`, `${STMT}/01/Viewport.webp`],
            ['thumbnail -> sheet picture', 'PresentationMode/Thumbnails/Scene_001.webp', img.replace('RB05_D01', 'RB05_D05')],
            ['asset -> thumbnail', 'LayoutEditor/Snapshots/s.webp', 'PresentationMode/Thumbnails/s.webp'],
            ['sheet picture -> project.json', img, 'project.json']
        ]) {
            const copy = await files('copy', { from : from, to : to });
            T.check(`refused: ${label}`, copy.status === 400, [copy.status, copy.json]);
        }
        const rename = await files('copy', { from : img, to : `${IMG}/RB05_D02/Other__${pic.sha256.slice(0, 10)}.webp` });
        T.check('refused: a sheet-picture copy that changes the name', rename.status === 400, [rename.status, rename.json]);
        const same = await files('copy', { from : img, to : img });
        T.check('refused: a copy onto itself', same.status === 400, same.status);
        T.check('no refused copy wrote anything', bucket.writes().length === 0, bucket.writes());
    }

    T.section('REFUSALS: DELETES OUTSIDE ONE PUBLISHED DOCUMENT');
    {
        for (const path of [`${PUB}/RB05_D01/a.json`, `${PUB}/RB05_D02/b.json`, `${PUB}/PublishedDocuments__Index__.json`, `${PUB}/01__Shared__Hatches/h__0123456789.png`]) bucket.seed(PREFIX + path, '{}');
        const pic = Na__TestEnv__Picture('png', 'mixed');
        bucket.seed(`${PREFIX}${IMG}/RB05_D01/Mixed__${pic.sha256.slice(0, 10)}.png`, pic.bytes);
        const before = bucket.snapshot();
        bucket.clearLog();
        for (const [label, body] of [
            ['two document folders in one call', { paths : [`${PUB}/RB05_D01/a.json`, `${PUB}/RB05_D02/b.json`] }],
            ['the published index at the root', { path : `${PUB}/PublishedDocuments__Index__.json` }],
            ['a document file and the root index', { paths : [`${PUB}/RB05_D01/a.json`, `${PUB}/PublishedDocuments__Index__.json`] }],
            ['a published file and a sheet picture', { paths : [`${PUB}/RB05_D01/a.json`, `${IMG}/RB05_D01/Mixed__${pic.sha256.slice(0, 10)}.png`] }],
            ['the revisions archive', { path : `${PUB}/00__Archive__Revisions/RB05_D01/manifest.json` }],
            ['both path and paths', { path : `${PUB}/RB05_D01/a.json`, paths : [`${PUB}/RB05_D01/a.json`] }],
            ['neither path nor paths', {}],
            ['an empty list', { paths : [] }],
            ['1,001 paths', { paths : Array.from({ length : 1001 }, (_, i) => `${PUB}/RB05_D01/f${i}.json`) }],
            ['an unknown field', { path : `${PUB}/RB05_D01/a.json`, recursive : true }]
        ]) {
            const del = await files('delete', body);
            T.check(`refused: delete of ${label}`, del.status === 400, [del.status, del.json]);
        }
        T.check('...and every file is still there', JSON.stringify(Array.from(bucket.snapshot())) === JSON.stringify(Array.from(before)) && bucket.writes().length === 0);
        const shared = await files('delete', { path : `${PUB}/01__Shared__Hatches/h__0123456789.png` });
        T.check('a delete inside one shared folder (01__Shared__*) is one folder, so it is allowed', shared.status === 200, [shared.status, shared.json]);
    }

    T.section('REFUSALS: UNMANAGED SHEET-PICTURE NAMES, WRONG BYTES');
    {
        const pic = Na__TestEnv__Picture('webp', 'managed');
        const png = Na__TestEnv__Picture('png', 'png-bytes');
        const hex = pic.sha256.slice(0, 10);
        bucket.seed(`${PREFIX}${IMG}/RB05_D01/photo.webp`, pic.bytes);
        bucket.seed(`${PREFIX}${IMG}/RB05_D01/Pic__${hex}.webp`, pic.bytes);
        const before = bucket.snapshot();
        bucket.clearLog();
        for (const name of ['photo.webp', 'photo__XYZXYZXYZX.webp', `photo__${hex.toUpperCase()}.webp`, `Photo__${hex}.WEBP`, `photo__${hex}.jpeg`, `photo__${hex.slice(0, 9)}.webp`, `__${hex}.webp`]) {
            const path  = `${IMG}/RB05_D01/${name}`;
            const write = await files('write', { path : path, encoding : 'base64', data : Na__TestEnv__Base64(pic.bytes) });
            const up    = await upload(path, pic.bytes);
            const del   = await files('delete', { path : path });
            const copy  = await files('copy', { from : path, to : `${IMG}/RB05_D02/${name}` });
            T.check(`refused: unmanaged name "${name}" (write, upload, delete and copy all 400)`, [write.status, up.status, del.status, copy.status].every((s) => s === 400), [write.status, up.status, del.status, copy.status]);
        }
        const wrongHash = await upload(`${IMG}/RB05_D01/Pic__0123456789.webp`, pic.bytes);
        T.check('refused: bytes that do not hash to the name', wrongHash.status === 400 && /hash/.test(wrongHash.json.error), [wrongHash.status, wrongHash.json]);
        const wrongType = await upload(`${IMG}/RB05_D01/Pic__${png.sha256.slice(0, 10)}.webp`, png.bytes);
        T.check('refused: PNG bytes named .webp', wrongType.status === 400 && /PNG/.test(wrongType.json.error), [wrongType.status, wrongType.json]);
        const text = new TextEncoder().encode('not a picture at all');
        const textHex = (await import('node:crypto')).createHash('sha256').update(text).digest('hex').slice(0, 10);
        const notPicture = await files('write', { path : `${IMG}/RB05_D01/Text__${textHex}.png`, encoding : 'base64', data : Na__TestEnv__Base64(text) });
        T.check('refused: bytes that are no picture at all', notPicture.status === 400 && /WebP, PNG or JPEG/.test(notPicture.json.error), [notPicture.status, notPicture.json]);
        const objectData = await files('write', { path : `${IMG}/RB05_D01/Pic__${hex}.webp`, data : { not : 'a picture' } });
        T.check('refused: a JSON object written to a picture path', objectData.status === 400, objectData.status);
        T.check('no refused picture wrote anything', bucket.writes().length === 0 && JSON.stringify(Array.from(bucket.snapshot())) === JSON.stringify(Array.from(before)), bucket.writes());
    }

    T.section('REFUSALS: BODIES, SIZES AND LENGTHS');
    {
        bucket.clearLog();
        const notJson = await files('write', { path : 'ValeVision__DrawingNotes__.json', data : '{ not json' });
        T.check('refused: invalid JSON text written to a .json file', notJson.status === 400, [notJson.status, notJson.json]);
        const primitive = await files('write', { path : 'ValeVision__DrawingNotes__.json', data : '"just a string"' });
        T.check('refused: a JSON string (not an object or array) written to a .json file', primitive.status === 400, primitive.status);
        const objectToMd = await files('write', { path : `${STMT}/01/Statement.md`, data : { a : 1 } });
        T.check('refused: a JSON object written to a .md path', objectToMd.status === 400, objectToMd.status);
        const nullData = await files('write', { path : `${STMT}/01/Statement.md`, data : null });
        T.check('refused: data null', nullData.status === 400, nullData.status);
        const noData = await files('write', { path : `${STMT}/01/Statement.md` });
        T.check('refused: no data', noData.status === 400, noData.status);
        const badB64 = await files('write', { path : 'PresentationMode/Thumbnails/S.webp', encoding : 'base64', data : '***not base64***' });
        T.check('refused: data that is not base64', badB64.status === 400, badB64.status);
        const badEncoding = await files('write', { path : `${STMT}/01/Statement.md`, data : 'x', encoding : 'hex' });
        T.check('refused: an encoding other than base64', badEncoding.status === 400, badEncoding.status);
        const emptyB64 = await files('write', { path : 'PresentationMode/Thumbnails/S.webp', encoding : 'base64', data : '' });
        T.check('refused: empty base64 data', emptyB64.status === 400, emptyB64.status);
        const unknownField = await files('write', { path : `${STMT}/01/Statement.md`, data : 'x', key : 'VaApps/Projects/2026/3047__Doous/project.json' });
        T.check('refused: an unknown field in a write (no raw keys accepted)', unknownField.status === 400, unknownField.status);
        const notObject = await call('POST', `${BASE}/files/read`, { json : '[1,2]' });
        T.check('refused: a body that is not a JSON object', notObject.status === 400, notObject.status);
        const brokenJson = await call('POST', `${BASE}/files/read`, { json : '{"path":' });
        T.check('refused: a body that is not JSON', brokenJson.status === 400, brokenJson.status);
        const badAdvisory = await files('write', { path : `${STMT}/01/Statement.md`, data : 'x', cacheControl : 5 });
        T.check('refused: a cacheControl that is not a string', badAdvisory.status === 400, badAdvisory.status);

        const big = 'x'.repeat(25 * 1024 * 1024 + 1);
        const tooBig = await files('write', { path : `${STMT}/01/Big.txt`, data : big });
        T.check('refused (413): a write over 25 MB', tooBig.status === 413, tooBig.status);
        const fits = await files('write', { path : `${STMT}/01/Fits.txt`, data : 'x'.repeat(1024 * 1024) });
        T.check('a 1 MB write fits', fits.status === 200, fits.status);
        const overRead = await files('read', { path : `${STMT}/01/Fits.txt` });
        T.check('a 1 MB read answers through the worker', overRead.status === 200 && overRead.json.text.length === 1024 * 1024, overRead.status);
        bucket.seed(`${PREFIX}${PUB}/RB05_D01/Large__0123456789.pdf`, new Uint8Array(11 * 1024 * 1024));
        const largeRead = await files('read', { path : `${PUB}/RB05_D01/Large__0123456789.pdf` });
        T.check('refused (413): a read over 10 MB is pointed at the CDN', largeRead.status === 413 && /CDN/.test(largeRead.json.error), [largeRead.status, largeRead.json]);

        const noLength = await upload(`${STMT}/01/a.md`, new TextEncoder().encode('# a'), { contentLength : null });
        T.check('refused (411): an upload without Content-Length', noLength.status === 411, noLength.status);
        const zero = await upload(`${STMT}/01/a.md`, new Uint8Array(0));
        T.check('refused: an upload of zero bytes', zero.status === 400, zero.status);
        const declaredBig = await upload(`${STMT}/01/a.md`, new TextEncoder().encode('# a'), { contentLength : 26 * 1024 * 1024 });
        T.check('refused (413): a read-whole upload declaring over 25 MB, before any byte is read', declaredBig.status === 413, declaredBig.status);
        const declaredHuge = await upload(`${PUB}/RB05_D01/Huge__0123456789.pdf`, new TextEncoder().encode('%PDF'), { contentLength : 96 * 1024 * 1024 });
        T.check('refused (413): a streamed published upload declaring over 95 MB', declaredHuge.status === 413, declaredHuge.status);
        const badLength = await upload(`${STMT}/01/a.md`, new TextEncoder().encode('# a'), { contentLength : 'abc' });
        T.check('refused: a Content-Length that is not a number', badLength.status === 400, badLength.status);
        const noPath = await call('POST', `${BASE}/files/upload`, { bytes : new TextEncoder().encode('x') });
        T.check('refused: an upload without ?path=', noPath.status === 400, noPath.status);
        const jsonUpload = await upload(`${PUB}/RB05_D01/manifest.json`, new TextEncoder().encode('{ broken'));
        T.check('refused: a published JSON upload that is not valid JSON', jsonUpload.status === 400, jsonUpload.status);

        for (const [label, body] of [['limit 0', { prefix : `${IMG}/`, limit : 0 }], ['limit 1001', { prefix : `${IMG}/`, limit : 1001 }], ['limit "10"', { prefix : `${IMG}/`, limit : '10' }], ['a numeric cursor', { prefix : `${IMG}/`, cursor : 5 }], ['an unknown field', { prefix : `${IMG}/`, delimiter : '/' }]]) {
            const answer = await files('list', body);
            T.check(`refused: list with ${label}`, answer.status === 400, answer.status);
        }
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Build Manifest and the Project Prefix
// -----------------------------------------------------------------------------

    T.section('NO FILES ROUTE TOUCHES THE BUILD MANIFEST; EVERY KEY UNDER VaApps/Projects/<folderId>/');
    {
        // Everything above ran against this bucket since the EACH FAMILY section began
        const writes = bucket.writes();
        T.check(`the files routes made writes in this run (${writes.length} since the last log clear)`, writes.length > 0, writes.length);
        T.check('the build manifest was never written by a files route', bucket.writesTo(NA_MANIFEST_KEY) === 0 && !bucket.has(NA_MANIFEST_KEY), bucket.writesTo(NA_MANIFEST_KEY));

        fresh();
        const pic = Na__TestEnv__Picture('webp', 'manifest');
        const img = `${IMG}/RB05_D01/M__${pic.sha256.slice(0, 10)}.webp`;
        await files('write', { path : 'ValeVision__DrawingNotes__.json', data : { a : 1 } });
        await files('read', { path : 'ValeVision__DrawingNotes__.json' });
        await upload(img, pic.bytes);
        await files('copy', { from : img, to : img.replace('RB05_D01', 'RB05_D02') });
        await files('list', { prefix : `${IMG}/` });
        await files('delete', { path : img });
        await upload(`${PUB}/RB05_D01/V__0123456789.svg`, new TextEncoder().encode('<svg/>'));
        await files('delete', { path : `${PUB}/RB05_D01/V__0123456789.svg` });
        await files('write', { path : `${STMT}/01/S.md`, data : '# s' });
        const all = bucket.writes();
        T.check('a clean run of every files operation never wrote VaApps/Index/', all.length === 7 && all.every((entry) => entry.key.indexOf('VaApps/Index/') !== 0), all);
        T.check('every key written sits under VaApps/Projects/2026/3047__Doous/', all.every((entry) => entry.key.indexOf(PREFIX) === 0), all.map((entry) => entry.key));
        T.check('no key anywhere starts NaProjectPortal/', Array.from(bucket.objects.keys()).every((key) => key.indexOf('NaProjectPortal/') !== 0));

        fresh();
        const spaced = '2025/FN-62104__Fenner Scheme-01';
        const answer = await call('POST', `/api/editor/projects/2025/FN-62104__Fenner%20Scheme-01/files/write`, { json : { path : 'ValeVision__DrawingNotes__.json', data : {} } });
        T.check('a folderId with a space writes under its own prefix', answer.status === 200 && bucket.has(`VaApps/Projects/${spaced}/ValeVision__DrawingNotes__.json`), [answer.status, Array.from(bucket.objects.keys())]);
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Path Guards Directly
// -----------------------------------------------------------------------------

    T.section('PATH GUARDS (UNIT)');
    {
        const families = guards.Na__PathGuards__FAMILIES;
        T.check('six families with the operations S12 b.5 gives them',
            JSON.stringify(Object.fromEntries(Object.entries(families).map(([id, family]) => [id, family.ops]))) === JSON.stringify({
                'F-SIB'   : ['read', 'write'],
                'F-THUMB' : ['read', 'write', 'upload'],
                'F-ASSET' : ['read', 'write', 'upload'],
                'F-IMG'   : ['read', 'write', 'upload', 'list', 'copy', 'delete'],
                'F-PUB'   : ['read', 'write', 'upload', 'list', 'copy', 'delete'],
                'F-STMT'  : ['read', 'write', 'upload', 'list']
            }), families);
        const sample = {
            'ValeVision__DrawingNotes__.json'                      : 'F-SIB',
            'PresentationMode/Thumbnails/Scene_1.png'              : 'F-THUMB',
            'LayoutEditor/Linework/x.json'                         : 'F-ASSET',
            [`${IMG}/D01/a__0123456789.webp`]                      : 'F-IMG',
            [`${PUB}/PublishedDocuments__ShareLinks__.json`]        : 'F-PUB',
            [`${STMT}/Statement.md`]                               : 'F-STMT'
        };
        for (const [path, family] of Object.entries(sample)) {
            const guard = guards.na_resolve_project_file(path);
            T.check(`${path} is ${family}`, guard.ok && guard.family === family, guard);
        }
        const hashed = guards.na_resolve_project_file(`${PUB}/D01/T__abcdef0123.png`);
        const fixed  = guards.na_resolve_project_file(`${PUB}/D01/Sheet.png`);
        T.check('a hash-named published picture is immutable, a fixed name 60 s', hashed.cacheControl === IMMUTABLE && fixed.cacheControl === MUTABLE, [hashed.cacheControl, fixed.cacheControl]);
        T.check('published pictures, vectors and PDFs stream; JSON and markdown do not', hashed.streamed && !guards.na_resolve_project_file(`${PUB}/D01/m.json`).streamed && !guards.na_resolve_project_file(`${PUB}/D01/m.md`).streamed);
        T.check('a root published file has no document folder; a document file has one', guards.na_resolve_project_file(`${PUB}/Index.json`).documentFolder === null && fixed.documentFolder === 'D01');
        T.check('the folderId rule refuses nothing the rename pattern lets through for existing projects, and refuses "2026"', guards.na_validate_folder_id('2026/3047__Doous').ok && !guards.na_validate_folder_id('2026').ok);
    }

// endregion -------------------------------------------------------------------

    T.finish();
