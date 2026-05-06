// Na__OnnxRuntime__SessionLoader
// Loads onnxruntime-web from CDN, configures wasm path, and creates inference
// sessions on demand. Sessions are cached by model id so we don't re-load the
// same multi-hundred-MB ONNX file twice.
//
// Public API:
//   await Na__OnnxRuntime__EnsureRuntimeLoaded(externalLibrariesConfig)
//   await Na__OnnxRuntime__GetSession(modelId, modelConfig, inferenceConfig, onProgress)
//   Na__OnnxRuntime__GetOrt()  -> returns the loaded `ort` global

let Na__OnnxRuntime__OrtLib                  = null;
let Na__OnnxRuntime__RuntimeLoadingPromise   = null;
const Na__OnnxRuntime__SessionCacheById      = new Map();

export function Na__OnnxRuntime__GetOrt() {
    if (!Na__OnnxRuntime__OrtLib) {
        throw new Error('onnxruntime-web has not been loaded yet; call Na__OnnxRuntime__EnsureRuntimeLoaded first.');
    }
    return Na__OnnxRuntime__OrtLib;
}

export async function Na__OnnxRuntime__EnsureRuntimeLoaded(externalLibrariesConfig) {
    if (Na__OnnxRuntime__OrtLib)              return Na__OnnxRuntime__OrtLib;
    if (Na__OnnxRuntime__RuntimeLoadingPromise) return Na__OnnxRuntime__RuntimeLoadingPromise;

    Na__OnnxRuntime__RuntimeLoadingPromise = (async () => {
        const cfg = externalLibrariesConfig.onnxRuntimeWeb;
        await Na__OnnxRuntime__InjectScriptTag(cfg.scriptUrl);

        if (!globalThis.ort) {
            throw new Error('Failed to load onnxruntime-web (window.ort is undefined).');
        }
        const ort = globalThis.ort;

        // ORT 1.17+ dynamically `import()`s its threaded JSEP worker as an ES
        // module. The browser's ESM loader rejects bare-looking specifiers such
        // as `01__External.../foo.mjs`, so we must hand ORT a per-file map of
        // fully-resolved absolute URLs. Keeping the prefix in AppConfig as the
        // single source of truth - we just resolve it here.
        ort.env.wasm.wasmPaths    = Na__OnnxRuntime__BuildWasmPathMap(cfg.wasmPathPrefix);
        // Use multi-threaded WASM if cross-origin isolation is on (the dev server
        // sets COOP/COEP); fall back to single-threaded otherwise.
        const isolated            = !!self.crossOriginIsolated;
        const desiredThreads      = isolated ? Math.max(2, Math.min(8, navigator.hardwareConcurrency || 4)) : 1;
        ort.env.wasm.numThreads   = desiredThreads;
        ort.env.wasm.simd         = true;
        ort.env.wasm.proxy        = false;
        ort.env.logLevel          = 'warning';
        console.info(`[Na__OnnxRuntime] crossOriginIsolated=${isolated}, wasm.numThreads=${desiredThreads}`);

        Na__OnnxRuntime__OrtLib = ort;
        return ort;
    })();

    return Na__OnnxRuntime__RuntimeLoadingPromise;
}

function Na__OnnxRuntime__InjectScriptTag(url) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[data-na-src="${url}"]`);
        if (existing) {
            existing.addEventListener('load',  () => resolve());
            existing.addEventListener('error', () => reject(new Error(`Failed to load script ${url}`)));
            return;
        }
        const tag = document.createElement('script');
        tag.src   = url;
        tag.async = true;
        tag.dataset.naSrc = url;
        tag.addEventListener('load',  () => resolve());
        tag.addEventListener('error', () => reject(new Error(`Failed to load script ${url}`)));
        document.head.appendChild(tag);
    });
}

export async function Na__OnnxRuntime__GetSession(modelId, modelConfig, inferenceConfig, onProgress) {
    if (Na__OnnxRuntime__SessionCacheById.has(modelId)) {
        return Na__OnnxRuntime__SessionCacheById.get(modelId);
    }

    const ort = Na__OnnxRuntime__GetOrt();
    if (typeof onProgress === 'function') onProgress({ phase: 'fetch', modelId, status: 'starting' });

    const modelBuffer = await Na__OnnxRuntime__FetchAsArrayBuffer(modelConfig.modelPath, onProgress, modelId);

    if (typeof onProgress === 'function') onProgress({ phase: 'create-session', modelId, status: 'starting' });

    const sessionOptions = {
        executionProviders:     Na__OnnxRuntime__BuildExecutionProviderList(inferenceConfig),
        graphOptimizationLevel: inferenceConfig.graphOptimizationLevel || 'all',
        logSeverityLevel:       2
    };

    let session;
    try {
        session = await ort.InferenceSession.create(modelBuffer, sessionOptions);
    } catch (err) {
        if (sessionOptions.executionProviders[0] !== inferenceConfig.fallbackExecutionProvider) {
            console.warn('[Na__OnnxRuntime] Preferred EP failed, falling back to', inferenceConfig.fallbackExecutionProvider, err);
            sessionOptions.executionProviders = [inferenceConfig.fallbackExecutionProvider];
            session = await ort.InferenceSession.create(modelBuffer, sessionOptions);
        } else {
            throw err;
        }
    }

    Na__OnnxRuntime__SessionCacheById.set(modelId, session);
    if (typeof onProgress === 'function') onProgress({ phase: 'create-session', modelId, status: 'done' });
    return session;
}

function Na__OnnxRuntime__BuildExecutionProviderList(inferenceConfig) {
    const list = [];
    if (inferenceConfig.preferredExecutionProvider) list.push(inferenceConfig.preferredExecutionProvider);
    if (inferenceConfig.fallbackExecutionProvider &&
        inferenceConfig.fallbackExecutionProvider !== inferenceConfig.preferredExecutionProvider) {
        list.push(inferenceConfig.fallbackExecutionProvider);
    }
    return list.length ? list : ['wasm'];
}

// Resolves the local ORT runtime artefacts to fully-qualified absolute URLs.
// Required because ORT 1.17+ uses native `import()` for the JSEP worker, and the
// browser ESM loader only accepts ./, ../, /, or full URLs - never a bare prefix.
//
// IMPORTANT: ORT 1.17+ expects the wasmPaths object to use the keys `mjs` and
// `wasm` (NOT the literal filenames). Unknown keys are silently ignored and ORT
// falls back to its bundled CDN URL. With multi-threaded WASM + JSEP enabled
// (the default for the threaded ORT build) the runtime loads
// `ort-wasm-simd-threaded.jsep.{mjs,wasm}`, so we point the overrides at those.
const Na__OnnxRuntime__JsepMjsFilename  = 'ort-wasm-simd-threaded.jsep.mjs';
const Na__OnnxRuntime__JsepWasmFilename = 'ort-wasm-simd-threaded.jsep.wasm';

function Na__OnnxRuntime__BuildWasmPathMap(wasmPathPrefix) {
    const normalisedPrefix = wasmPathPrefix.endsWith('/') ? wasmPathPrefix : `${wasmPathPrefix}/`;
    return {
        mjs:  new URL(normalisedPrefix + Na__OnnxRuntime__JsepMjsFilename,  document.baseURI).href,
        wasm: new URL(normalisedPrefix + Na__OnnxRuntime__JsepWasmFilename, document.baseURI).href
    };
}

async function Na__OnnxRuntime__FetchAsArrayBuffer(url, onProgress, modelId) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch model ${url}: HTTP ${response.status}`);
    }

    const lengthHeader = response.headers.get('content-length');
    const total        = lengthHeader ? parseInt(lengthHeader, 10) : null;
    if (!response.body || !total) {
        const buf = await response.arrayBuffer();
        if (typeof onProgress === 'function') onProgress({ phase: 'fetch', modelId, status: 'done', loaded: buf.byteLength, total: buf.byteLength });
        return buf;
    }

    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    let lastReportTs = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.byteLength;

        const now = performance.now();
        if (typeof onProgress === 'function' && now - lastReportTs > 120) {
            onProgress({ phase: 'fetch', modelId, status: 'progress', loaded: received, total });
            lastReportTs = now;
        }
    }

    const combined = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.byteLength;
    }
    if (typeof onProgress === 'function') onProgress({ phase: 'fetch', modelId, status: 'done', loaded: received, total });
    return combined.buffer;
}
