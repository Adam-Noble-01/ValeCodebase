// =============================================================================
// VALEVISION AURA - BUILD UTIL | THE HANDWRITING ENGINE'S WEBASSEMBLY
// =============================================================================
//
// FILE       : AuraRender__BuildUtil__HandwritingWasm__.mjs
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Build the handwriting network (AssemblyScript) into the two
//              WebAssembly modules AURA serves, and record what built them
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - SOURCE: 02__Src__AppModules/31__System__Handwriting/02__Engine__Wasm/
//   Na__HandwritingEngine__Network__.ts
// - OUTPUT, beside it (served by nginx with the app, kept on the device by the
//   service worker):
//     Na__HandwritingEngine__Network__Simd__.wasm     --enable simd
//     Na__HandwritingEngine__Network__Scalar__.wasm   for a browser without SIMD
//     Na__HandwritingEngine__Build__.json             the compiler, options and SHA-256s
// - BOTH AT -O3 AND SHRINK LEVEL 0: AssemblyScript's expf and its other maths
//   change with the shrink level, so the two builds share it, and they write
//   the same strokes (the parity check proves it).
// - THE COMPILER is pinned in package-lock.json (assemblyscript 0.28.20 and its
//   binaryen); install it once with "npm ci" in this folder. This folder never
//   syncs to the server.
//
// USAGE:
//   node AuraRender__BuildUtil__HandwritingWasm__.mjs        (or: npm run build:handwriting)
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0
// - Initial build (AURA 0.2.1).
//
// =============================================================================

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';


// -----------------------------------------------------------------------------
// REGION | Constants
// -----------------------------------------------------------------------------

const NA__WASM__HERE        = path.dirname(fileURLToPath(import.meta.url));
const NA__WASM__ENGINE_DIR  = path.resolve(NA__WASM__HERE, '..', '02__Src__AppModules', '31__System__Handwriting', '02__Engine__Wasm');
const NA__WASM__SOURCE      = 'Na__HandwritingEngine__Network__.ts';
const NA__WASM__RECORD      = 'Na__HandwritingEngine__Build__.json';
const NA__WASM__COMMON      = ['--optimizeLevel', '3', '--shrinkLevel', '0', '--converge', '--noAssert', '--runtime', 'stub'];
const NA__WASM__BUILDS      = [
    { Key: 'Simd',   File: 'Na__HandwritingEngine__Network__Simd__.wasm',   Options: ['--enable', 'simd'] },
    { Key: 'Scalar', File: 'Na__HandwritingEngine__Network__Scalar__.wasm', Options: [] }
];

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Build
// -----------------------------------------------------------------------------

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function Na__Wasm__Main() {
    const require = createRequire(import.meta.url);
    const ascVersion = require('assemblyscript/package.json').version;
    const binaryenVersion = require('binaryen/package.json').version;
    const asc = (await import('assemblyscript/asc')).default;

    const sourcePath = path.join(NA__WASM__ENGINE_DIR, NA__WASM__SOURCE);
    const source = await readFile(sourcePath);
    const record = {
        HandwritingEngineBuild__Built        : new Date().toISOString(),
        HandwritingEngineBuild__Compiler     : `assemblyscript ${ascVersion} (binaryen ${binaryenVersion})`,
        HandwritingEngineBuild__Source       : NA__WASM__SOURCE,
        HandwritingEngineBuild__SourceSha256 : sha256(source),
        HandwritingEngineBuild__Options      : NA__WASM__COMMON.join(' '),
        HandwritingEngineBuild__Modules      : {}
    };

    for (const build of NA__WASM__BUILDS) {
        const outPath = path.join(NA__WASM__ENGINE_DIR, build.File);
        const { error, stderr } = await asc.main([sourcePath, '--outFile', outPath, ...NA__WASM__COMMON, ...build.Options]);
        if (error) {
            process.stderr.write(stderr.toString());
            throw new Error(`${build.Key}: ${error.message}`);
        }
        const bytes = await readFile(outPath);
        if (!WebAssembly.validate(bytes)) throw new Error(`${build.Key}: the module does not validate`);
        const module = await WebAssembly.compile(bytes);
        const exports = WebAssembly.Module.exports(module).map((e) => e.name);
        const imports = WebAssembly.Module.imports(module).map((i) => `${i.module}.${i.name}`);
        record.HandwritingEngineBuild__Modules[build.Key] = {
            File    : build.File,
            Options : build.Options.join(' '),
            Bytes   : bytes.length,
            Sha256  : sha256(bytes),
            Imports : imports
        };
        console.log(`${build.Key.padEnd(6)} ${build.File}  ${bytes.length.toLocaleString('en-GB')} bytes  ${exports.length} exports  imports: ${imports.join(', ') || 'none'}`);
    }

    await writeFile(path.join(NA__WASM__ENGINE_DIR, NA__WASM__RECORD), JSON.stringify(record, null, 4) + '\n', 'utf8');
    console.log(`wrote ${NA__WASM__RECORD}`);
}

Na__Wasm__Main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});

// endregion -------------------------------------------------------------------
