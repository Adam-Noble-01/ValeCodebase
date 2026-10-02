// =============================================================================
// VALEVISION3D - VERIFY - BROWSER MODULE GRAPH RESOLUTION
// =============================================================================
//
// FILE       : Na__Verify__ModuleGraph__.mjs
// NAMESPACE  : Na__Verify
// MODULE     : Module Graph Resolution Walk
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Prove every import specifier on the page resolves to a file on
//              disk, exactly as the browser would resolve it
// CREATED    : 10-Sep-2026
//
// DESCRIPTION:
// - Reads the import map out of index.html, then walks the module graph from
//   every entry point the page loads, following relative imports and import-map
//   bare specifiers, INCLUDING the internals of the vendored libraries.
// - `node --check` cannot see this class of fault: each file parses perfectly
//   while the graph as a whole is broken. ValeVision shipped exactly that and
//   the app died on `Failed to resolve module specifier "clipper2-js"`, thrown
//   by a vendor file that no app module imports directly.
// - STRINGS ARE NOT CODE. The specifier scan reads a copy of each file in
//   which the contents of every string literal are blanked - the quotes
//   kept and every offset unchanged - and takes each specifier back from
//   the real text at the same place. Before this, prose inside a string
//   read as an import: TrueVision's scene editor builds the message
//   'No 3D scenes in "' + groupName + '" to export', and the word export
//   followed by a quote was taken for a re-export of whatever text ran to
//   the next quote (S09 B13). A quoted string that reaches the end of its
//   line is closed there, as JavaScript requires, so one misread quote
//   cannot blank the code below it.
//
// USAGE:
//     node 80__Testing__PrototypeEnvironment/Na__Verify__ModuleGraph__.mjs
//
//   Exit 0 = every specifier resolves. Exit 1 = at least one does not.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 10-Sep-2026, v2.20.0); TrueVision3D
//                   carries the twin at the same path (1.0.0 at b2aa9151,
//                   identical apart from the app names)
// - Parity        : diverged (from 1.1.0)
// - Divergences   :
//   - String literal contents are blanked before the specifier scan, so
//     prose in a string is never read as an import or export (1.1.0).
// - Back-port     : TrueVision wants the same fix: its own walk stops on the
//                   scene-editor string (21, its standing baseline since
//                   v2.166.0). Recorded for the TrueVision lane (WP-S09-14,
//                   DR-36); not done here.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.1.0 ({{VVREL:W0-04}})
// - String literal contents are blanked before the specifier scan, and each
//   specifier is read back from the real text at the same offsets, so a
//   string such as '" to export' is no longer read as a specifier (S09
//   B13). With a copy of TrueVision's scene-editor string in the graph the
//   walk exits 0; on this tree it walks exactly the modules 1.0.0 walked.
//
// 10-Sep-2026 - Version 1.0.0
// - Written for the Phase A r184 vendoring (v2.20.0).
//
// =============================================================================

import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// -----------------------------------------------------------------------------
// REGION | Configuration
// -----------------------------------------------------------------------------

    const Na__Verify__ScriptDir = dirname(fileURLToPath(import.meta.url));                       // <-- 80__Testing__PrototypeEnvironment
    const Na__Verify__AppRoot   = resolve(Na__Verify__ScriptDir, '..');                          // <-- ValeVision app root
    const Na__Verify__IndexPath = resolve(Na__Verify__AppRoot, 'index.html');                    // <-- The page that declares the import map

    // KNOWN ISSUES | Unresolvable specifiers that are real but not live
    // ------------------------------------------------------------
    // Each entry is a genuine defect in a VENDORED file that no reachable code
    // path imports. They are printed on every run and never silently dropped,
    // but they do not fail the build, because failing on a fault we have
    // deliberately decided not to fix trains people to ignore the harness.
    //
    // Removing an entry from here must mean the defect is gone, never that it
    // became inconvenient.
    // ------------------------------------------------------------
    const Na__Verify__KnownIssues = [
        {
            file      : '04__Vendor__ThreeEdgeProjection__v0.0.10/src/worker/SilhouetteGeneratorWorker.js',
            specifier : '../SilhouetteGenerator',
            reason    : 'Upstream bug in three-edge-projection 0.0.10: an extensionless relative specifier, which no browser can resolve. '
                      + 'Reachable ONLY through the "three-edge-projection/worker" import map entry. Neither ValeVision nor TrueVision '
                      + 'imports that entry - both use the main entry plus a dynamic "three-edge-projection/webgpu", and the projection '
                      + 'system brings its own worker pool. Left unpatched to keep the vendor folder byte-identical across the three apps. '
                      + 'IF PHASE D EVER IMPORTS three-edge-projection/worker, THIS BREAKS THE PAGE - add the .js extension in all three '
                      + 'vendored copies at that point, or drop the map entry.'
        }
    ];
    // ------------------------------------------------------------

    // Static import + dynamic import + re-export, all forms. Run over the
    // string-blanked copy; the d flag gives each specifier's offsets, which
    // are read back from the real text.
    const Na__Verify__SpecifierPattern = /(?:^|[\s;}])(?:import|export)\s*(?:[\s\S]*?\sfrom\s*)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/gd;

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Source Preparation
// -----------------------------------------------------------------------------

    // FUNCTION | Strip Comments Before Scanning for Import Specifiers
    // ------------------------------------------------------------
    // Without this the walk reports phantom imports out of prose. three-mesh-bvh
    // heads its generated files with:
    //     /* This file is generated from "raycast.template.js". */
    // which the specifier pattern reads as `from "raycast.template.js"` and
    // reports as a missing module. A harness that cries wolf twice gets ignored
    // the third time, when it is right.
    //
    // Quotes are tracked so a // or /* inside a string literal is left alone.
    // ------------------------------------------------------------
    function Na__Verify__StripComments(source) {
        let output      = '';
        let index       = 0;
        let quoteChar   = null;                                                                  // <-- Currently open string delimiter, if any

        while (index < source.length) {
            const char = source[index];
            const next = source[index + 1];

            if (quoteChar) {                                                                     // <-- Inside a string literal
                output += char;
                if (char === '\\')      { output += next ?? ''; index += 2; continue; }          // <-- Escape: consume the pair
                if (char === quoteChar) { quoteChar = null; }
                index += 1;
                continue;
            }

            if (char === '"' || char === "'" || char === '`') {                                  // <-- String opens
                quoteChar = char;
                output   += char;
                index    += 1;
                continue;
            }

            if (char === '/' && next === '/') {                                                  // <-- Line comment
                while (index < source.length && source[index] !== '\n') index += 1;
                continue;
            }

            if (char === '/' && next === '*') {                                                  // <-- Block comment
                index += 2;
                while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) index += 1;
                index += 2;
                output += ' ';                                                                   // <-- Keep tokens either side apart
                continue;
            }

            output += char;
            index  += 1;
        }

        return output;
    }
    // ------------------------------------------------------------


    // FUNCTION | Blank the Contents of Every String Literal
    // ------------------------------------------------------------
    // Same length as the input, quotes kept, every character inside a
    // string (and inside a template literal, its ${} parts included)
    // replaced by a space, newlines kept. The specifier pattern then sees
    // only code: the words import and export inside prose are gone, and
    // each real specifier keeps its quotes, with blanks between them whose
    // offsets point back at its text.
    //
    // A ' or " string that reaches the end of its line is closed there:
    // JavaScript allows no line break in one, so a quote misread out of a
    // regular expression literal costs one line, never the file below it.
    // Regular expression literals themselves are recognised by the usual
    // rule (a / where an expression may start) and blanked too.
    // ------------------------------------------------------------
    function Na__Verify__MaskStrings(source) {
        const output = source.split('');
        const length = source.length;
        const blank  = (at) => { if (output[at] !== '\n' && output[at] !== '\r') output[at] = ' '; };
        let index    = 0;
        let previous = '';                                                                       // <-- Last code character that was not white space
        let word     = '';                                                                       // <-- Last identifier or keyword read

        const regexMayStart = () => previous === '' || '(,=:[!&|?{};+-*%<>~^'.indexOf(previous) !== -1
            || /^(?:return|typeof|instanceof|case|do|else|in|of|new|delete|void|throw|yield|await)$/.test(word);

        const skipQuoted = (quote) => {                                                          // <-- index sits on the opening quote
            index += 1;
            while (index < length) {
                const char = source[index];
                if (char === '\\') { blank(index); if (index + 1 < length) blank(index + 1); index += 2; continue; }
                if (char === quote) { index += 1; return; }
                if (char === '\n' && quote !== '`') return;                                    // <-- Unterminated: closed at the line end
                if (quote === '`' && char === '$' && source[index + 1] === '{') {
                    blank(index); blank(index + 1); index += 2;
                    let depth = 1;
                    while (index < length && depth > 0) {
                        const inner = source[index];
                        if (inner === '"' || inner === "'" || inner === '`') {
                            const from = index;
                            skipQuoted(inner);
                            for (let at = from; at < index; at++) blank(at);
                            continue;
                        }
                        if (inner === '{') depth += 1;
                        else if (inner === '}') depth -= 1;
                        blank(index);
                        index += 1;
                    }
                    continue;
                }
                blank(index);
                index += 1;
            }
        };

        while (index < length) {
            const char = source[index];
            if (char === '"' || char === "'" || char === '`') {
                skipQuoted(char);
                previous = char;
                word     = '';
                continue;
            }
            if (char === '/' && regexMayStart()) {                                               // <-- A regular expression literal
                let at = index + 1;
                let inClass = false;
                while (at < length && source[at] !== '\n') {
                    const inner = source[at];
                    if (inner === '\\') { at += 2; continue; }
                    if (inner === '[') inClass = true;
                    else if (inner === ']') inClass = false;
                    else if (inner === '/' && !inClass) break;
                    at += 1;
                }
                if (at < length && source[at] === '/') {                                          // <-- Closed on its own line: blank its body
                    for (let k = index + 1; k < at; k++) blank(k);
                    index = at + 1;
                    while (index < length && /[a-z]/i.test(source[index])) index += 1;           // <-- Flags
                    previous = ')';                                                              // <-- A regex is a value
                    word     = '';
                    continue;
                }
            }
            if (/[A-Za-z0-9_$]/.test(char)) {
                let end = index;
                while (end < length && /[A-Za-z0-9_$]/.test(source[end])) end += 1;
                word     = source.slice(index, end);
                previous = source[end - 1];
                index    = end;
                continue;
            }
            if (!/\s/.test(char)) { previous = char; word = ''; }
            index += 1;
        }
        return output.join('');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Import Map
// -----------------------------------------------------------------------------

    // FUNCTION | Read the Import Map Declared Inline in index.html
    // ------------------------------------------------------------
    function Na__Verify__ReadImportMap() {
        const html  = readFileSync(Na__Verify__IndexPath, 'utf8');                               // <-- Read the page
        const match = html.match(/<script[^>]+type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i); // <-- Find the map block
        if (!match) throw new Error('No <script type="importmap"> found in index.html');

        const parsed = JSON.parse(match[1]);                                                     // <-- Parse it as the browser would
        return parsed.imports || {};
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve a Bare Specifier Through the Import Map
    // ------------------------------------------------------------
    // Mirrors the browser's two rules: exact key match, then longest
    // trailing-slash prefix match.
    // ------------------------------------------------------------
    function Na__Verify__ResolveBare(specifier, importMap) {
        if (Object.prototype.hasOwnProperty.call(importMap, specifier)) {
            return resolve(Na__Verify__AppRoot, importMap[specifier]);                           // <-- Exact key
        }

        const prefixKeys = Object.keys(importMap)
            .filter(key => key.endsWith('/') && specifier.startsWith(key))
            .sort((a, b) => b.length - a.length);                                                // <-- Longest prefix wins

        if (prefixKeys.length === 0) return null;

        const key  = prefixKeys[0];
        const tail = specifier.slice(key.length);
        return resolve(Na__Verify__AppRoot, importMap[key] + tail);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Graph Walk
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve a Relative Specifier With Extension Guessing
    // ------------------------------------------------------------
    // A browser does NOT guess extensions. It is done here only to report a
    // near-miss ("meant .js?") as a distinct, more useful failure than a plain
    // not-found, because that is the shape the mistake usually takes.
    // ------------------------------------------------------------
    function Na__Verify__ResolveRelative(specifier, fromFile) {
        const direct = resolve(dirname(fromFile), specifier);                                    // <-- Exactly what the browser does
        if (existsSync(direct) && statSync(direct).isFile()) return { path: direct, exact: true };

        for (const suffix of ['.js', '.mjs', '/index.js', '/index.mjs']) {                       // <-- Diagnostic only
            const guess = `${direct}${suffix}`;
            if (existsSync(guess) && statSync(guess).isFile()) return { path: guess, exact: false };
        }
        return { path: direct, missing: true };
    }
    // ------------------------------------------------------------


    // FUNCTION | Walk the Module Graph From a Set of Entry Points
    // ------------------------------------------------------------
    function Na__Verify__WalkGraph(entryPoints, importMap) {
        const visited  = new Set();                                                              // <-- Files already walked
        const failures = [];                                                                     // <-- Unresolved specifiers
        const queue    = [...entryPoints];

        while (queue.length > 0) {
            const currentFile = queue.pop();
            if (visited.has(currentFile)) continue;
            visited.add(currentFile);

            if (!existsSync(currentFile)) continue;                                              // <-- Reported by whoever queued it

            let source;
            try { source = Na__Verify__StripComments(readFileSync(currentFile, 'utf8')); } catch { continue; }
            const masked = Na__Verify__MaskStrings(source);                                      // <-- Strings blanked; offsets unchanged

            Na__Verify__SpecifierPattern.lastIndex = 0;
            let match;
            while ((match = Na__Verify__SpecifierPattern.exec(masked)) !== null) {
                const span      = match.indices[1] || match.indices[2];
                const specifier = span ? source.slice(span[0], span[1]) : null;                 // <-- Read back from the real text
                if (!specifier) continue;
                if (specifier.startsWith('data:') || specifier.startsWith('http')) continue;      // <-- Not a disk file
                // A TEMPLATE LITERAL IS NOT A PATH. `import(`./${name}.js`)` is a
                // specifier computed at runtime; there is no file on disk to check
                // and the text between the braces is an expression, not a module.
                if (specifier.indexOf('${') !== -1) continue;

                let resolvedPath = null;

                if (specifier.startsWith('.') || specifier.startsWith('/')) {
                    const outcome = Na__Verify__ResolveRelative(specifier, currentFile);
                    if (outcome.missing) {
                        failures.push({ from: currentFile, specifier, reason: 'relative path not found' });
                        continue;
                    }
                    if (!outcome.exact) {
                        failures.push({ from: currentFile, specifier, reason: `needs an explicit extension (found ${relative(Na__Verify__AppRoot, outcome.path)})` });
                        continue;
                    }
                    resolvedPath = outcome.path;
                } else {
                    resolvedPath = Na__Verify__ResolveBare(specifier, importMap);                 // <-- Bare specifier: import map only
                    if (!resolvedPath) {
                        failures.push({ from: currentFile, specifier, reason: 'bare specifier has no import map entry' });
                        continue;
                    }
                    if (!existsSync(resolvedPath)) {
                        failures.push({ from: currentFile, specifier, reason: `import map target missing on disk (${relative(Na__Verify__AppRoot, resolvedPath)})` });
                        continue;
                    }
                }

                queue.push(resolvedPath);
            }
        }

        return { visited, failures };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Entry Points
// -----------------------------------------------------------------------------

    // FUNCTION | Collect Every Module index.html Loads Directly
    // ------------------------------------------------------------
    function Na__Verify__CollectEntryPoints() {
        const html      = readFileSync(Na__Verify__IndexPath, 'utf8');
        const entries   = new Set();

        const srcPattern = /<script[^>]+type=["']module["'][^>]*src=["']([^"']+)["']/gi;          // <-- <script type="module" src="...">
        let match;
        while ((match = srcPattern.exec(html)) !== null) {
            entries.add(resolve(Na__Verify__AppRoot, match[1]));
        }

        // Inline module blocks import the real entry points; treat index.html
        // itself as a pseudo-module so its own import statements are walked.
        entries.add(Na__Verify__IndexPath);

        return [...entries];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Run
// -----------------------------------------------------------------------------

    const importMap   = Na__Verify__ReadImportMap();
    const appEntries  = Na__Verify__CollectEntryPoints();

    console.log('ValeVision3D - module graph resolution walk');
    console.log(`  app root   : ${Na__Verify__AppRoot}`);
    console.log(`  import map : ${Object.keys(importMap).length} entries`);
    console.log('');

    // ---------------------------------------------------------------
    // PASS 1 | The live app graph - what the browser actually loads today
    // ---------------------------------------------------------------
    const appWalk = Na__Verify__WalkGraph(appEntries, importMap);
    console.log(`  [1] app graph      : ${appWalk.visited.size} modules from ${appEntries.length} entry point(s), ${appWalk.failures.length} failure(s)`);

    // ---------------------------------------------------------------
    // PASS 2 | Every import-map target, walked on its own
    // ---------------------------------------------------------------
    // Pass 1 alone has a blind spot, and it is precisely the one that took
    // ValeVision down. A vendor entry point that nothing imports YET is never
    // reached, so its own broken specifier stays invisible until the phase that
    // first imports it - at which point it breaks every module on the page, not
    // just the new one. three-edge-projection importing clipper2-js is exactly
    // this shape. Walking each map target independently finds it now.
    const mapTargets = [];
    for (const [key, target] of Object.entries(importMap)) {
        if (key.endsWith('/')) continue;                                                         // <-- Prefix entry, not a module
        const targetPath = resolve(Na__Verify__AppRoot, target);
        if (!existsSync(targetPath)) {
            appWalk.failures.push({ from: Na__Verify__IndexPath, specifier: key, reason: `import map target missing on disk (${target})` });
            continue;
        }
        mapTargets.push(targetPath);
    }

    const vendorWalk = Na__Verify__WalkGraph(mapTargets, importMap);
    console.log(`  [2] import targets : ${vendorWalk.visited.size} modules from ${mapTargets.length} map target(s), ${vendorWalk.failures.length} failure(s)`);
    console.log('');

    const allFailures = [...appWalk.failures, ...vendorWalk.failures];

    // ---------------------------------------------------------------
    // Split the findings against the known-issue list
    // ---------------------------------------------------------------
    const known = [];
    const fresh = [];
    for (const failure of allFailures) {
        const fromPath = relative(Na__Verify__AppRoot, failure.from).split('\\').join('/');
        const entry    = Na__Verify__KnownIssues.find(issue =>
            fromPath.endsWith(issue.file) && failure.specifier === issue.specifier);
        if (entry) known.push({ failure, entry }); else fresh.push(failure);
    }

    if (known.length > 0) {
        console.log(`  KNOWN ISSUES (${known.length}) - real, documented, not on any reachable path:`);
        console.log('');
        for (const { failure, entry } of known) {
            console.log(`    ${relative(Na__Verify__AppRoot, failure.from)}`);
            console.log(`        "${failure.specifier}"  ->  ${failure.reason}`);
            console.log(`        WHY ALLOWED: ${entry.reason}`);
            console.log('');
        }
    }

    if (fresh.length === 0) {
        console.log('  PASS - every reachable import specifier resolves to a file on disk,');
        console.log('         in the live app graph and in every import map target.');
        if (known.length > 0) console.log(`         (${known.length} known issue(s) listed above, unchanged.)`);
        process.exit(0);
    }

    console.log(`  FAIL - ${fresh.length} unresolved specifier(s):`);
    console.log('');
    for (const failure of fresh) {
        console.log(`    ${relative(Na__Verify__AppRoot, failure.from)}`);
        console.log(`        "${failure.specifier}"  ->  ${failure.reason}`);
    }
    process.exit(1);

// endregion -------------------------------------------------------------------
