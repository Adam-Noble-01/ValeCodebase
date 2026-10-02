// =============================================================================
// WHITECARDOPEDIA - EDITOR API WORKER - TEST ENVIRONMENT - R2 BUCKET AND KIT
// =============================================================================
//
// FILE       : tests/Na__TestEnv__EditorWorker__R2Bucket__.mjs
// NAMESPACE  : Na__TestEnv
// MODULE     : Editor Worker Test Environment - Map-Backed R2 Binding and Test Kit
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Run the worker's own fetch handler in Node against an in-memory
//              R2 bucket, with no Cloudflare account, network or wrangler
// CREATED    : 01-Oct-2026
//
// DESCRIPTION:
// - Na__TestEnv__R2Bucket IS env.R2_BUCKET. A Map of key -> { bytes, etag,
//   uploaded, httpMetadata, customMetadata } answering the parts of the R2
//   Workers binding the worker calls: get (R2ObjectBody: body, text, json,
//   arrayBuffer), head, put (string, bytes, Blob or a stream; onlyIf.etagMatches
//   and etagDoesNotMatch answer null when they fail, as R2 does), delete (one
//   key or up to 1,000) and list (prefix, limit 1..1000, an opaque cursor,
//   keys in order). The etag is the MD5 of the bytes, as R2's is for a
//   single-part upload.
// - EVERY WRITE IS LOGGED, so a test can prove which keys a route wrote - the
//   build manifest above all.
// - TWO FAULTS FOR THE MERGE TESTS. onBeforeConditionalPut runs once just before
//   a conditional put is judged (another writer landing between the read and
//   the write); conditionalsBroken makes every conditional put answer null (a
//   runtime that does not honour the condition).
// - Na__TestEnv__LoadWorker registers the module hooks and imports the worker
//   from ../src, finding ValeVision's app config and Whitecardopedia's master
//   index by walking up from this folder, so the same tests run beside the
//   live worker and beside a staged copy of it.
//
// INTEGRATION:
// - Imported by Na__Test__EditorWorker__ProjectFiles__.test.mjs and
//   Na__Test__EditorWorker__MergeKeys__.test.mjs.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.0
// - Initial implementation for the worker 1.6.0 node tests.
//
// =============================================================================

import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { register } from 'node:module';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// -----------------------------------------------------------------------------
// REGION | Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Test Key, Origin, Host and Well-Known R2 Keys
    // ------------------------------------------------------------
    const NA_TEST_API_KEY  = 'test-editor-api-key-0123456789abcdef';
    const NA_TEST_ORIGIN   = 'http://localhost:8000';
    const NA_TEST_HOST     = 'https://whitecardopedia-editor-api.test';
    const NA_MANIFEST_KEY  = 'VaApps/Index/Na__BuildVersion__Manifest__.json';
    const NA_INDEX_KEY     = 'VaApps/Index/Na__MasterIndex__ProjectLocations__.json';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Map-Backed R2 Binding
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Bytes of Anything put() Accepts
    // ------------------------------------------------------------
    async function na_bytes_of(value) {
        if (value === null || value === undefined) return new Uint8Array(0);
        if (typeof value === 'string') return new TextEncoder().encode(value);
        if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
        if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
        if (typeof Blob !== 'undefined' && value instanceof Blob) return new Uint8Array(await value.arrayBuffer());
        if (value && typeof value.getReader === 'function') {
            const reader = value.getReader();
            const parts  = [];
            let total    = 0;
            for (;;) {
                const step = await reader.read();
                if (step.done) break;
                const part = step.value instanceof Uint8Array ? step.value : new Uint8Array(step.value);
                parts.push(part);
                total += part.length;
            }
            const bytes = new Uint8Array(total);
            let offset  = 0;
            for (const part of parts) { bytes.set(part, offset); offset += part.length; }
            return bytes;
        }
        throw new TypeError('R2 test bucket: put() was given ' + Object.prototype.toString.call(value));
    }
    // ------------------------------------------------------------


    // CLASS | An R2Object (metadata only)
    // ------------------------------------------------------------
    class Na__TestEnv__R2Object {
        constructor(key, record) {
            this.key            = key;
            this.size           = record.bytes.length;
            this.etag           = record.etag;
            this.httpEtag       = `"${record.etag}"`;
            this.version        = record.version;
            this.uploaded       = new Date(record.uploaded.getTime());
            this.httpMetadata   = Object.assign({}, record.httpMetadata);
            this.customMetadata = Object.assign({}, record.customMetadata);
            this.checksums      = {};
        }
    }
    // ------------------------------------------------------------


    // CLASS | An R2ObjectBody (metadata and the bytes)
    // ------------------------------------------------------------
    class Na__TestEnv__R2ObjectBody extends Na__TestEnv__R2Object {
        constructor(key, record) {
            super(key, record);
            this.na_bytes = record.bytes;
        }
        get body() {
            const bytes = this.na_bytes.slice();
            return new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } });
        }
        async arrayBuffer() { return this.na_bytes.slice().buffer; }
        async text()        { return new TextDecoder().decode(this.na_bytes); }
        async json()        { return JSON.parse(await this.text()); }
    }
    // ------------------------------------------------------------


    // CLASS | The Bucket - env.R2_BUCKET
    // ------------------------------------------------------------
    class Na__TestEnv__R2Bucket {
        constructor() {
            this.objects                = new Map();
            this.log                    = [];
            this.conditionalsBroken     = false;
            this.onBeforeConditionalPut = null;
        }

        na_record(bytes, httpMetadata, customMetadata) {
            return {
                bytes          : bytes,
                etag           : createHash('md5').update(bytes).digest('hex'),
                uploaded       : new Date(),
                version        : randomUUID(),
                httpMetadata   : Object.assign({}, httpMetadata || {}),
                customMetadata : Object.assign({}, customMetadata || {})
            };
        }

        // TEST HELPER | Put an object in place without logging it as the worker's write
        seed(key, value, httpMetadata) {
            const bytes = (typeof value === 'string') ? new TextEncoder().encode(value) : new Uint8Array(value);
            this.objects.set(key, this.na_record(bytes, httpMetadata || {}, {}));
        }

        async head(key) {
            this.log.push({ op : 'head', key : key });
            const record = this.objects.get(key);
            return record ? new Na__TestEnv__R2Object(key, record) : null;
        }

        async get(key) {
            this.log.push({ op : 'get', key : key });
            const record = this.objects.get(key);
            return record ? new Na__TestEnv__R2ObjectBody(key, record) : null;
        }

        async put(key, value, options) {
            const opts = options || {};
            if (typeof key !== 'string' || key.length === 0) throw new TypeError('R2 test bucket: put() needs a key');
            const bytes = await na_bytes_of(value);

            if (opts.onlyIf) {
                if (typeof this.onBeforeConditionalPut === 'function') {
                    const hook = this.onBeforeConditionalPut;
                    this.onBeforeConditionalPut = null;
                    hook(key, this);
                }
                if (this.conditionalsBroken) {
                    this.log.push({ op : 'put-refused', key : key, why : 'conditionals broken' });
                    return null;
                }
                const existing = this.objects.get(key);
                const cond     = opts.onlyIf;
                if (cond.etagMatches !== undefined && (!existing || existing.etag !== cond.etagMatches)) {
                    this.log.push({ op : 'put-refused', key : key, why : 'etagMatches' });
                    return null;
                }
                if (cond.etagDoesNotMatch !== undefined && existing && existing.etag === cond.etagDoesNotMatch) {
                    this.log.push({ op : 'put-refused', key : key, why : 'etagDoesNotMatch' });
                    return null;
                }
            }

            const record = this.na_record(bytes, opts.httpMetadata, opts.customMetadata);
            this.objects.set(key, record);
            this.log.push({ op : 'put', key : key, size : bytes.length });
            return new Na__TestEnv__R2Object(key, record);
        }

        async delete(keys) {
            const list = Array.isArray(keys) ? keys : [keys];
            if (list.length > 1000) throw new RangeError('R2 test bucket: delete() takes at most 1000 keys');
            for (const key of list) {
                this.objects.delete(key);
                this.log.push({ op : 'delete', key : key });
            }
        }

        async list(options) {
            const opts   = options || {};
            const prefix = opts.prefix || '';
            const limit  = (opts.limit === undefined) ? 1000 : opts.limit;
            if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new RangeError('R2 test bucket: list() limit must be 1..1000');
            const keys = Array.from(this.objects.keys()).filter((key) => key.startsWith(prefix)).sort();
            let start  = 0;
            if (opts.cursor) {
                const after = Buffer.from(String(opts.cursor), 'base64url').toString('utf8');
                start = keys.findIndex((key) => key > after);
                if (start === -1) start = keys.length;
            }
            const page      = keys.slice(start, start + limit);
            const truncated = start + page.length < keys.length;
            this.log.push({ op : 'list', prefix : prefix, limit : limit });
            const answer = {
                objects           : page.map((key) => new Na__TestEnv__R2Object(key, this.objects.get(key))),
                truncated         : truncated,
                delimitedPrefixes : []
            };
            if (truncated) answer.cursor = Buffer.from(page[page.length - 1], 'utf8').toString('base64url');
            return answer;
        }

        // TEST HELPERS | What the worker wrote
        writes()             { return this.log.filter((entry) => entry.op === 'put' || entry.op === 'delete'); }
        writesTo(key)        { return this.writes().filter((entry) => entry.key === key).length; }
        clearLog()           { this.log = []; }
        has(key)             { return this.objects.has(key); }
        textOf(key)          { const record = this.objects.get(key); return record ? new TextDecoder().decode(record.bytes) : null; }
        bytesOf(key)         { const record = this.objects.get(key); return record ? record.bytes.slice() : null; }
        metadataOf(key)      { const record = this.objects.get(key); return record ? Object.assign({}, record.httpMetadata) : null; }
        snapshot()           { return new Map(Array.from(this.objects.entries()).map(([key, record]) => [key, record.etag])); }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Finding the Worker, the Config and the Master Index
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Walk Up From a Folder Until a Candidate Exists
    // ------------------------------------------------------------
    // Each candidate is { app, rel }: either <ancestor>/<app>/<rel>, or <rel>
    // directly when the ancestor's own name is <app>.
    // ------------------------------------------------------------
    function na_find_up(startDir, app, rel) {
        let dir = resolve(startDir);
        for (;;) {
            const nested = join(dir, app, ...rel);
            if (existsSync(nested)) return nested;
            if (basename(dir) === app) {
                const direct = join(dir, ...rel);
                if (existsSync(direct)) return direct;
            }
            const parent = dirname(dir);
            if (parent === dir) return null;
            dir = parent;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Live Worker's src Folder When These Tests Sit Beside a Staged Copy
    // ------------------------------------------------------------
    // A staged copy holds only the files a change touched; the hooks read the
    // rest from the first other Whitecardopedia/CloudflareWorker/src found
    // walking up. null beside the live worker (nothing to fall back to).
    // ------------------------------------------------------------
    function na_find_live_src(testsDir, ownSrcDir) {
        let dir = resolve(testsDir);
        for (;;) {
            for (const candidate of [join(dir, 'Whitecardopedia', 'CloudflareWorker', 'src'), join(dir, 'WebApps', 'Whitecardopedia', 'CloudflareWorker', 'src')]) {
                if (resolve(candidate) !== resolve(ownSrcDir) && existsSync(join(candidate, 'index.js'))) return candidate;
            }
            const parent = dirname(dir);
            if (parent === dir) return null;
            dir = parent;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Where the Worker, the App Config, the Master Index and the Projects Are
    // ------------------------------------------------------------
    // Environment overrides: NA_VV_APP_CONFIG, NA_WCP_MASTER_INDEX, NA_WCP_PROJECTS,
    // NA_WCP_WORKER_SRC (the live worker's src folder, for a staged copy).
    // ------------------------------------------------------------
    function Na__TestEnv__Paths() {
        const testsDir   = dirname(fileURLToPath(import.meta.url));
        const workerRoot = resolve(testsDir, '..');
        const srcDir     = join(workerRoot, 'src');
        const paths = {
            testsDir        : testsDir,
            workerRoot      : workerRoot,
            srcDir          : srcDir,
            liveSrcDir      : process.env.NA_WCP_WORKER_SRC || na_find_live_src(testsDir, srcDir),
            configPath      : process.env.NA_VV_APP_CONFIG
                || na_find_up(testsDir, 'ValeVision3D', ['02__Src__AppModules', '02__AppData', 'Na__AppConfig__Main.json']),
            masterIndexPath : process.env.NA_WCP_MASTER_INDEX
                || na_find_up(testsDir, 'Whitecardopedia', ['02__Src__AppModules', '03__AppData', 'Na__MasterIndex__ProjectLocations__.json']),
            projectsDir     : process.env.NA_WCP_PROJECTS
                || na_find_up(testsDir, 'Whitecardopedia', ['Projects'])
        };
        if (!paths.configPath) throw new Error('Could not find WebApps/ValeVision3D/02__Src__AppModules/02__AppData/Na__AppConfig__Main.json above ' + testsDir);
        return paths;
    }
    // ------------------------------------------------------------


    // FUNCTION | Register the Hooks and Import the Worker
    // ------------------------------------------------------------
    // variants: { name: path of a replacement app config } for loadVariant(name).
    // ------------------------------------------------------------
    async function Na__TestEnv__LoadWorker(options) {
        const opts  = options || {};
        const paths = Na__TestEnv__Paths();

        const srcUrl     = pathToFileURL(paths.srcDir).href.replace(/\/?$/, '/');
        const liveSrcUrl = paths.liveSrcDir ? pathToFileURL(paths.liveSrcDir).href.replace(/\/?$/, '/') : '';
        register('./Na__TestEnv__EditorWorker__Hooks__.mjs', import.meta.url, {
            data : { srcUrl : srcUrl, liveSrcUrl : liveSrcUrl, configPath : paths.configPath, variants : opts.variants || {} }
        });

        const indexUrl  = pathToFileURL(join(paths.srcDir, 'index.js')).href;
        const guardsUrl = pathToFileURL(join(paths.srcDir, 'CloudflareHelper__PathGuards__.js')).href;
        const worker    = (await import(indexUrl)).default;
        const guards    = await import(guardsUrl);

        return Object.assign({}, paths, {
            worker            : worker,
            guards            : guards,
            loadVariant       : async (name) => (await import(`${indexUrl}?na-variant=${encodeURIComponent(name)}`)).default,
            loadVariantGuards : async (name) => import(`${guardsUrl}?na-variant=${encodeURIComponent(name)}`)
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Requests, Checks and Fixtures
// -----------------------------------------------------------------------------

    // FUNCTION | The env the Worker Runs With
    // ------------------------------------------------------------
    function Na__TestEnv__Env(bucket) {
        return { R2_BUCKET : bucket, EDITOR_API_KEY : NA_TEST_API_KEY, ALLOWED_ORIGIN : NA_TEST_ORIGIN };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Request the Way the Browser Sends One
    // ------------------------------------------------------------
    // options: key (null = none, string = that key), json (body), bytes and
    // contentType (raw body), contentLength (null = no header), headers, origin.
    // ------------------------------------------------------------
    function Na__TestEnv__Request(method, path, options) {
        const opts    = options || {};
        const headers = new Headers();
        if (opts.key !== null) headers.set('X-Editor-Api-Key', opts.key === undefined ? NA_TEST_API_KEY : opts.key);
        headers.set('Origin', opts.origin || NA_TEST_ORIGIN);

        let body;
        if (opts.json !== undefined) {
            body = (typeof opts.json === 'string') ? opts.json : JSON.stringify(opts.json);
            headers.set('Content-Type', 'application/json');
            headers.set('Content-Length', String(Buffer.byteLength(body)));
        } else if (opts.bytes !== undefined) {
            body = opts.bytes;
            headers.set('Content-Type', opts.contentType || 'application/octet-stream');
            if (opts.contentLength !== null) headers.set('Content-Length', String(opts.contentLength === undefined ? body.byteLength : opts.contentLength));
        }
        for (const [name, value] of Object.entries(opts.headers || {})) headers.set(name, value);
        return new Request(NA_TEST_HOST + path, { method : method, headers : headers, body : body });
    }
    // ------------------------------------------------------------


    // FUNCTION | Call the Worker and Read Its Answer
    // ------------------------------------------------------------
    async function Na__TestEnv__Call(worker, env, method, path, options) {
        const response = await worker.fetch(Na__TestEnv__Request(method, path, options), env);
        const text     = await response.text();
        let json       = null;
        try { json = JSON.parse(text); } catch { json = null; }
        return { status : response.status, headers : response.headers, text : text, json : json };
    }
    // ------------------------------------------------------------


    // FUNCTION | A Check Counter That Prints PASS / FAIL Lines
    // ------------------------------------------------------------
    function Na__TestEnv__Checks(title) {
        let passed = 0;
        let failed = 0;
        console.log(title);
        return {
            section(name) { console.log('\n' + name); },
            check(name, ok, detail) {
                if (ok) passed++; else failed++;
                console.log((ok ? '  PASS  ' : '  FAIL  ') + name + ((!ok && detail !== undefined) ? '  -> ' + JSON.stringify(detail) : ''));
                return !!ok;
            },
            finish() {
                console.log(`\n${passed}/${passed + failed} checks passed`);
                if (failed > 0) {
                    console.log(`${failed} check(s) FAILED`);
                    process.exitCode = 1;
                }
                return { passed : passed, failed : failed };
            }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | A Tiny Picture of a Given Type, and Its Managed Name
    // ------------------------------------------------------------
    // The bytes start with the type's real signature (all the worker sniffs);
    // name(slug) ends in the first ten hex digits of their SHA-256.
    // ------------------------------------------------------------
    function Na__TestEnv__Picture(kind, seed) {
        const heads = {
            webp : [0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20],
            png  : [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D],
            jpg  : [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]
        };
        const tail  = new TextEncoder().encode(`picture-${kind}-${seed}`);
        const bytes = new Uint8Array(heads[kind].length + tail.length);
        bytes.set(heads[kind], 0);
        bytes.set(tail, heads[kind].length);
        const sha256 = createHash('sha256').update(bytes).digest('hex');
        return { bytes : bytes, sha256 : sha256, name : (slug) => `${slug}__${sha256.slice(0, 10)}.${kind}` };
    }
    // ------------------------------------------------------------


    // FUNCTION | Base64 of Bytes
    // ------------------------------------------------------------
    function Na__TestEnv__Base64(bytes) {
        return Buffer.from(bytes).toString('base64');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Test Environment API
    // ------------------------------------------------------------
    export {
        NA_TEST_API_KEY,
        NA_TEST_ORIGIN,
        NA_MANIFEST_KEY,
        NA_INDEX_KEY,
        Na__TestEnv__R2Bucket,
        Na__TestEnv__Paths,
        Na__TestEnv__LoadWorker,
        Na__TestEnv__Env,
        Na__TestEnv__Request,
        Na__TestEnv__Call,
        Na__TestEnv__Checks,
        Na__TestEnv__Picture,
        Na__TestEnv__Base64
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
