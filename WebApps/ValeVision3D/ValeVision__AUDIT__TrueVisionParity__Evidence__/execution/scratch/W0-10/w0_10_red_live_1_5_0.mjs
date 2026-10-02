// W0-10 scratch: red check of the LIVE worker 1.5.0 source (read only) against
// an in-memory R2 bucket. Shows the behaviours 1.6.0's acceptance targets, as
// they are in the deployed source today. Nothing is deployed or contacted.
import { pathToFileURL } from 'node:url';

const LIVE  = 'D:/10_CoreLib__ValeCodebase/WebApps/Whitecardopedia/CloudflareWorker/src/index.js';
const KIT   = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/ValeVision__AUDIT__TrueVisionParity__Evidence__/execution/prepared/W0-10/WebApps/Whitecardopedia/CloudflareWorker/tests/Na__TestEnv__EditorWorker__R2Bucket__.mjs';

const kit    = await import(pathToFileURL(KIT).href);
const worker = (await import(pathToFileURL(LIVE).href)).default;
const lines  = [];
const note   = (text) => { lines.push(text); console.log(text); };

// 1. "/2026/delete" on 1.5.0
{
    const bucket = new kit.Na__TestEnv__R2Bucket();
    const env    = kit.Na__TestEnv__Env(bucket);
    bucket.seed('VaApps/Projects/2026/1111__Alpha/project.json', '{"projectCode":"1111"}');
    bucket.seed('VaApps/Projects/2026/1111__Alpha/Alpha__Main.glb', 'glb');
    bucket.seed('VaApps/Projects/2026/2222__Beta/project.json', '{"projectCode":"2222"}');
    bucket.seed('VaApps/Projects/2025/3333__Gamma/project.json', '{"projectCode":"3333"}');
    const answer = await kit.Na__TestEnv__Call(worker, env, 'POST', '/api/editor/projects/2026/delete', { json : {} });
    note(`1.5.0 POST /api/editor/projects/2026/delete -> ${answer.status} ${answer.text.slice(0, 160)}`);
    note(`   keys left: ${JSON.stringify(Array.from(bucket.objects.keys()))}`);
}

// 2. "/2026/rename" on 1.5.0
{
    const bucket = new kit.Na__TestEnv__R2Bucket();
    const env    = kit.Na__TestEnv__Env(bucket);
    bucket.seed('VaApps/Projects/2026/1111__Alpha/project.json', '{"projectCode":"1111"}');
    bucket.seed('VaApps/Projects/2026/2222__Beta/project.json', '{"projectCode":"2222"}');
    const answer = await kit.Na__TestEnv__Call(worker, env, 'POST', '/api/editor/projects/2026/rename', { json : { newFolderId : '2027/Moved', updatedProjectData : { projectCode : 'x' } } });
    note(`1.5.0 POST /api/editor/projects/2026/rename -> ${answer.status} ${answer.text.slice(0, 160)}`);
    note(`   keys now: ${JSON.stringify(Array.from(bucket.objects.keys()))}`);
}

// 3. A 1.6.0 route sent to 1.5.0 with a projectCode in the body
{
    const bucket = new kit.Na__TestEnv__R2Bucket();
    const env    = kit.Na__TestEnv__Env(bucket);
    const answer = await kit.Na__TestEnv__Call(worker, env, 'POST', `/api/editor/projects/${encodeURIComponent('2026/3047__Doous')}/files/write`, { json : { path : 'x', data : {}, projectCode : '3047' } });
    note(`1.5.0 POST .../2026%2F3047__Doous/files/write (body with projectCode) -> ${answer.status}; keys written: ${JSON.stringify(Array.from(bucket.objects.keys()))}`);
}

// 4. Health and an unknown route without the key
{
    const bucket = new kit.Na__TestEnv__R2Bucket();
    const env    = kit.Na__TestEnv__Env(bucket);
    const health = await kit.Na__TestEnv__Call(worker, env, 'GET', '/api/editor/health', { key : null });
    note(`1.5.0 GET /api/editor/health -> ${health.status} ${health.text}`);
    const unknown = await kit.Na__TestEnv__Call(worker, env, 'GET', '/api/editor/unknown', { key : null });
    note(`1.5.0 GET /api/editor/unknown without the key -> ${unknown.status} ${unknown.text}`);
}

// 5. A stray % in the folderId
{
    const bucket = new kit.Na__TestEnv__R2Bucket();
    const env    = kit.Na__TestEnv__Env(bucket);
    try {
        const answer = await kit.Na__TestEnv__Call(worker, env, 'POST', '/api/editor/projects/2026%2F3047%E0%A4%A/assets', { json : {} });
        note(`1.5.0 stray % in the folderId -> ${answer.status} ${answer.text.slice(0, 120)}`);
    } catch (error) {
        note(`1.5.0 stray % in the folderId -> uncaught ${error.name}: ${error.message} (the runtime would answer a non-JSON 500 without CORS headers)`);
    }
}
