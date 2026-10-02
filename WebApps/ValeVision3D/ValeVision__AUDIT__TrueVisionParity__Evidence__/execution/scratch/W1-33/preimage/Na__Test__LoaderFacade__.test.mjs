// =============================================================================
// VALEVISION3D - TEST - LAYOUT EDITOR LOADER FACADE
// =============================================================================
//
// FILE       : Na__Test__LoaderFacade__.test.mjs
// NAMESPACE  : Na__Test
// MODULE     : Layout Editor Loader Facade Test
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Prove the lazy loader's facade copies the editor's names exactly, answers the same before and after the editor loads, and keeps every editor module off the start-up path
// CREATED    : 01-Oct-2026
//
// DESCRIPTION:
// - ONE FACADE, TWO SIDES OF A LOAD. The Layout Editor loads on first use
//   (DR-24 keeps the loader), so the tab strip and the Dev section talk to
//   Na__LayoutEditor__Loader__ instead of the editor: before the load it
//   answers from the raw drawings block, after it from the editor. A copy of
//   a name that drifts from the editor's, or an answer that changes when the
//   bundle lands, renames or hides something under the reader. This test
//   holds the facade to both.
// - THE STATIC HALF (reads files; TrueVision only at its pin):
//   - the start-up graph: walking every STATIC import from index.html - the
//     same reading as Na__Verify__ModuleGraph__, without following import()
//     - reaches no Layout Editor module but the loader, its loading screen
//     and the dependency-free drawing-code leaf; the loader's own static
//     imports are those four, and every import() it makes is literal and
//     on disk;
//   - every name the loader copies (event names, view names, the site plan
//     type) equals the editor's own constant wherever this app's editor
//     declares it, and TrueVision's at the pin otherwise; every copy whose
//     constant the editor declares has its Na__LeLoad__CheckNames row;
//   - the feature map: a view it marks absent has an entry point that never
//     reaches the editor, one it marks present is forwarded to an export
//     the mode controller has;
//   - the loading screen's title and the drawing-count label are
//     TrueVision's first-open veil wording (VeilDrawingsHeadline,
//     VeilDrawingViews).
// - THE RUNNING HALF: the real loader, its real loading screen and the real
//   leaf are run under Node with module hooks, at a pretend browser address,
//   fresh for every case. The drawings block and the authoring gate are
//   stand-ins; the editor's modules are stand-ins built from this app's real
//   export lists and constant values, which record every call and say when
//   they were fetched. Cases: a project with no sheets, Layout Mode off,
//   the questions before the load, the load itself, the questions after it,
//   a planted name mismatch, the editor switched off in its config, and a
//   load that fails.
//
// USAGE:
//     node 80__Testing__PrototypeEnvironment/Na__Test__LoaderFacade__.test.mjs
//          [--tv-repo <NaWeb git root>] [--pin <commit>]
//
//   TrueVision is read with git show at the pin (default b2aa9151 in
//   D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb, or the VV_PARITY_TV_REPO /
//   VV_PARITY_TV_PIN environment values), never from its working tree. If that
//   repository is not on this machine, the values recorded from b2aa9151 below
//   are used instead, and the run says so. Writes only to the OS temp folder.
//
//   Exit 0 = every check passed. Exit 1 = at least one did not.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : ValeVision3D first; no TrueVision twin (TrueVision has no loader, DR-24;
//                   written with the loader's TrueVision entry points, WP-S03a-05 / WP-S09-03)
// - Parity        : new
// - Back-port     : none (TrueVision loads its editor with the page).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.0 ({{VVREL:W1-31}})
// - Written with the loader's TrueVision entry points: the start-up graph,
//   the name copies against both editors, CheckNames coverage, the feature
//   map, the veil wording, and the facade run before, during and after a
//   load.
//
// =============================================================================

import { readFileSync, writeFileSync, existsSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, resolve, join, relative, sep, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { register } from 'node:module';
import { execFileSync } from 'node:child_process';


// -----------------------------------------------------------------------------
// REGION | Inputs
// -----------------------------------------------------------------------------

    const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
    const APP_ROOT   = resolve(SCRIPT_DIR, '..');
    const SRC        = '02__Src__AppModules';
    const LE         = SRC + '/51__System__LayoutEditor';

    // THE FILES | app-relative, forward slashes (TrueVision keeps the same paths)
    const P = {
        loader     : LE + '/01__Core__Loader/Na__LayoutEditor__Loader__.js',
        screen     : LE + '/01__Core__Loader/Na__LayoutEditor__LoadingScreen__.js',
        leaf       : LE + '/07__Core__SheetData/Na__LayoutEditor__DrawingCode__.js',
        drawData   : SRC + '/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js',
        devGate    : SRC + '/03__AppUtils/Na__AppUtils__DevGate__.js',
        mode       : LE + '/05__Core__ModeController/Na__LayoutEditor__ModeController__.js',
        model      : LE + '/07__Core__SheetData/Na__LayoutEditor__SheetModel__.js',
        records    : LE + '/07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js',
        spec       : LE + '/50__Feature__Specification/Na__LayoutEditor__SpecData__.js',
        config     : LE + '/03__Core__Config/Na__LayoutEditor__ConfigState__.js',
        viewport3d : LE + '/20__System__Viewports/Na__LayoutEditor__Viewport3d__.js',
        pdf        : LE + '/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js',
        tabs       : LE + '/05__Core__ModeController/Na__LayoutEditor__TabStrip__.js',
        dev        : LE + '/70__DevTools__DevMenu/Na__LayoutEditor__DevMenu__Controls__.js',
        veil       : LE + '/05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js',
        leConfig   : LE + '/03__Core__Config/Na__LayoutEditor__AppConfig__.json'
    };

    // THE LOADER'S ALLOWED START-UP IMPORTS | everything else it reaches through import()
    const LOADER_STATIC = [ P.drawData, P.devGate, P.leaf, P.screen ];

    // THE EDITOR PARTS | Na__LeLoad__ImportEditor binds them in this order
    const PARTS = [ 'mode', 'model', 'spec', 'config', 'viewport3d', 'pdf' ];

    // EVERY COPY THE LOADER KEEPS | the editor's constant it copies, and the module that exports it
    const COPIES = [
        { copy : 'Na__LeLoad__SHEETS_EVENT',     part : 'model', name : 'Na__LeModel__CHANGED_EVENT',    what : 'the sheet model change event' },
        { copy : 'Na__LeLoad__MODE_EVENT',       part : 'mode',  name : 'Na__LeMode__CHANGED_EVENT',     what : 'the mode change event' },
        { copy : 'Na__LeLoad__SPEC_EVENT',       part : 'spec',  name : 'Na__LeSpec__CHANGED_EVENT',     what : 'the specification change event' },
        { copy : 'Na__LeLoad__VIEW_SHEET',       part : 'mode',  name : 'Na__LeMode__VIEW_SHEET',        what : 'the sheet view name' },
        { copy : 'Na__LeLoad__VIEW_SPEC',        part : 'mode',  name : 'Na__LeMode__VIEW_SPEC',         what : 'the specification view name' },
        { copy : 'Na__LeLoad__VIEW_REGISTER',    part : 'mode',  name : 'Na__LeMode__VIEW_REGISTER',     what : 'the register view name' },
        { copy : 'Na__LeLoad__VIEW_STATEMENT',   part : 'mode',  name : 'Na__LeMode__VIEW_STATEMENT',    what : 'the statements view name' },
        { copy : 'Na__LeLoad__DRAWING_SITEPLAN', part : 'model', name : 'Na__LeModel__DRAWING_SITEPLAN', what : 'the site plan drawing type' }
    ];

    // THE DOCUMENT VIEWS THE FEATURE MAP GATES | view copy, facade entry point, the mode controller's own
    const DOCUMENT_VIEWS = [
        { view : 'Na__LeLoad__VIEW_REGISTER',  entry : 'Na__LeLoad__OpenRegister',   real : 'Na__LeMode__OpenRegister' },
        { view : 'Na__LeLoad__VIEW_STATEMENT', entry : 'Na__LeLoad__OpenStatements', real : 'Na__LeMode__OpenStatements' }
    ];

    // TRUEVISION AT ITS PIN
    const argv    = process.argv.slice(2);
    const option  = (name) => { const at = argv.indexOf(name); return at !== -1 && at + 1 < argv.length ? argv[at + 1] : null; };
    const TV_REPO = option('--tv-repo') || process.env.VV_PARITY_TV_REPO || 'D:\\11_RefLib__StudioRepository__RemoteSystem\\NaWeb';
    const TV_PIN  = option('--pin') || process.env.VV_PARITY_TV_PIN || 'b2aa9151';
    const TV_APP  = 'na-apps/30__TrueVision__CoreAppCode/';

    // RECORDED FROM b2aa9151 | used only when TrueVision's repository cannot be read
    const TV_RECORDED = {
        Na__LeModel__CHANGED_EVENT    : 'na-layouteditor-sheets-changed',
        Na__LeMode__CHANGED_EVENT     : 'na-layouteditor-mode-changed',
        Na__LeSpec__CHANGED_EVENT     : 'na-layouteditor-spec-changed',
        Na__LeMode__VIEW_SHEET        : 'sheet',
        Na__LeMode__VIEW_SPEC         : 'spec',
        Na__LeMode__VIEW_REGISTER     : 'register',
        Na__LeMode__VIEW_STATEMENT    : 'statement',
        Na__LeModel__DRAWING_SITEPLAN : 'siteplan',
        VeilDrawingsHeadline          : 'Your Drawings Are Loading',
        VeilDrawingViews              : 'Drawing the Views',
        ModeExports                   : [ 'Na__LeMode__OpenRegister', 'Na__LeMode__OpenStatements', 'Na__LeMode__Ready' ]
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Checks, Console and Helpers
// -----------------------------------------------------------------------------

    let failures = 0;
    let passes   = 0;
    function check(name, passed, detail) {
        if (passed) passes++; else failures++;
        let text = (passed ? '  PASS  ' : '  FAIL  ') + name;
        if (!passed && detail !== undefined) {
            let shown;
            try { shown = JSON.stringify(detail); } catch (error) { shown = String(detail); }
            text += '  -> ' + (shown && shown.length > 900 ? shown.slice(0, 900) + '...' : shown);
        }
        realConsole.log(text);
    }
    function note(text) { realConsole.log('  NOTE  ' + text); }
    function section(title) { realConsole.log('\n' + title); }

    // CONSOLE | the modules' own lines are kept on the case, not printed
    const realConsole = { log : console.log.bind(console), warn : console.warn.bind(console), error : console.error.bind(console), info : console.info.bind(console) };
    let consoleSink = null;
    const keep = (kind) => (...parts) => {
        const line = parts.map((part) => (part && part.message) ? part.message : String(part)).join(' ');
        if (consoleSink) consoleSink.push([ kind, line ]); else realConsole[kind === 'log' ? 'log' : kind](...parts);
    };
    console.warn  = keep('warn');
    console.error = keep('error');
    console.info  = keep('info');
    console.log   = (...parts) => { if (consoleSink && typeof parts[0] === 'string' && parts[0].startsWith('[ValeVision3D')) consoleSink.push([ 'log', parts.join(' ') ]); else realConsole.log(...parts); };

    const tick  = () => new Promise((done) => setTimeout(done, 0));
    const ticks = async (n) => { for (let i = 0; i < n; i++) await tick(); };
    async function Settles(promise, rounds) {                                   // <-- 'pending' when it has not settled within the rounds
        let state = 'pending', value;
        promise.then((v) => { state = 'resolved'; value = v; }, (e) => { state = 'rejected'; value = e; });
        await ticks(rounds || 6);
        return { state, value };
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Reading Modules (the same reading as Na__Verify__ModuleGraph__)
// -----------------------------------------------------------------------------

    // FUNCTION | Strip Comments, Leaving String Literals Alone
    // ------------------------------------------------------------
    function StripComments(source) {
        let out = '', i = 0, quote = null;
        while (i < source.length) {
            const c = source[i], n = source[i + 1];
            if (quote) {
                out += c;
                if (c === '\\') { out += n ?? ''; i += 2; continue; }
                if (c === quote) quote = null;
                i += 1; continue;
            }
            if (c === '"' || c === "'" || c === '`') { quote = c; out += c; i += 1; continue; }
            if (c === '/' && n === '/') { while (i < source.length && source[i] !== '\n') i += 1; continue; }
            if (c === '/' && n === '*') { i += 2; while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i += 1; i += 2; out += ' '; continue; }
            out += c; i += 1;
        }
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | Blank Every String Literal's Contents, Offsets Kept
    // ------------------------------------------------------------
    // The module graph verifier's own rule: the specifier pattern then sees
    // only code, and each specifier is read back from the real text.
    // ------------------------------------------------------------
    function MaskStrings(source) {
        const output = source.split('');
        const length = source.length;
        const blank  = (at) => { if (output[at] !== '\n' && output[at] !== '\r') output[at] = ' '; };
        let index = 0, previous = '', word = '';
        const regexMayStart = () => previous === '' || '(,=:[!&|?{};+-*%<>~^'.indexOf(previous) !== -1
            || /^(?:return|typeof|instanceof|case|do|else|in|of|new|delete|void|throw|yield|await)$/.test(word);
        const skipQuoted = (quote) => {
            index += 1;
            while (index < length) {
                const char = source[index];
                if (char === '\\') { blank(index); if (index + 1 < length) blank(index + 1); index += 2; continue; }
                if (char === quote) { index += 1; return; }
                if (char === '\n' && quote !== '`') return;
                if (quote === '`' && char === '$' && source[index + 1] === '{') {
                    blank(index); blank(index + 1); index += 2;
                    let depth = 1;
                    while (index < length && depth > 0) {
                        const inner = source[index];
                        if (inner === '"' || inner === "'" || inner === '`') { const from = index; skipQuoted(inner); for (let at = from; at < index; at++) blank(at); continue; }
                        if (inner === '{') depth += 1; else if (inner === '}') depth -= 1;
                        blank(index); index += 1;
                    }
                    continue;
                }
                blank(index); index += 1;
            }
        };
        while (index < length) {
            const char = source[index];
            if (char === '"' || char === "'" || char === '`') { skipQuoted(char); previous = char; word = ''; continue; }
            if (char === '/' && regexMayStart()) {
                let at = index + 1, inClass = false;
                while (at < length && source[at] !== '\n') {
                    const inner = source[at];
                    if (inner === '\\') { at += 2; continue; }
                    if (inner === '[') inClass = true; else if (inner === ']') inClass = false; else if (inner === '/' && !inClass) break;
                    at += 1;
                }
                if (at < length && source[at] === '/') {
                    for (let k = index + 1; k < at; k++) blank(k);
                    index = at + 1;
                    while (index < length && /[a-z]/i.test(source[index])) index += 1;
                    previous = ')'; word = '';
                    continue;
                }
            }
            if (/[A-Za-z0-9_$]/.test(char)) {
                let end = index;
                while (end < length && /[A-Za-z0-9_$]/.test(source[end])) end += 1;
                word = source.slice(index, end); previous = source[end - 1]; index = end;
                continue;
            }
            if (!/\s/.test(char)) { previous = char; word = ''; }
            index += 1;
        }
        return output.join('');
    }
    // ------------------------------------------------------------


    // FUNCTION | Every Specifier in a Module: { statics, dynamics, computed }
    // ------------------------------------------------------------
    const SPECIFIERS = /(?:^|[\s;}])(?:import|export)\s*(?:[\s\S]*?\sfrom\s*)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/gd;
    function Specifiers(text) {
        const code   = StripComments(text);
        const masked = MaskStrings(code);
        const statics = [], dynamics = [];
        SPECIFIERS.lastIndex = 0;
        let match;
        while ((match = SPECIFIERS.exec(masked)) !== null) {
            if (match.indices[2]) dynamics.push(code.slice(match.indices[2][0], match.indices[2][1]));
            else if (match.indices[1]) statics.push(code.slice(match.indices[1][0], match.indices[1][1]));
        }
        const allImportCalls = (masked.match(/\bimport\s*\(/g) || []).length;
        return { statics, dynamics, computed : allImportCalls - dynamics.length };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTIONS | Readers for this app and for TrueVision at its pin
    // ------------------------------------------------------------
    const vvCache = new Map();
    function ReadVv(rel) {
        if (vvCache.has(rel)) return vvCache.get(rel);
        const full = join(APP_ROOT, ...rel.split('/'));
        const text = (existsSync(full) && statSync(full).isFile()) ? readFileSync(full, 'utf8') : null;
        vvCache.set(rel, text);
        return text;
    }
    const tvCache = new Map();
    let tvReadable = null;
    function ReadTv(rel) {
        if (tvCache.has(rel)) return tvCache.get(rel);
        let text = null;
        if (tvReadable !== false) {
            try {
                text = execFileSync('git', [ '-C', TV_REPO, 'show', TV_PIN + ':' + TV_APP + rel ], { encoding : 'utf8', stdio : [ 'ignore', 'pipe', 'ignore' ], maxBuffer : 64 * 1024 * 1024 });
                tvReadable = true;
            } catch (error) {
                text = null;
                if (tvReadable === null) tvReadable = false;
            }
        }
        tvCache.set(rel, text);
        return text;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Names a Module Exports
    // ------------------------------------------------------------
    function ExportsOf(read, rel) {
        const text = read(rel);
        if (text === null) return null;
        const code  = StripComments(text);
        const names = new Set();
        for (const m of code.matchAll(/export\s*\{([^}]*)\}/g)) {
            m[1].split(',').map((p) => p.trim()).filter(Boolean).forEach((p) => { const pieces = p.split(/\s+as\s+/); names.add((pieces[1] || pieces[0]).trim()); });
        }
        for (const m of code.matchAll(/export\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z0-9_$]+)/g)) names.add(m[1]);
        return names;
    }
    // ------------------------------------------------------------


    // FUNCTION | A String Constant's Value, Followed Through Imports and Aliases
    // ------------------------------------------------------------
    // Returns { value, file } or null. Follows `import { X } from`, `export { X }
    // from` and `const X = Y;` (an alias of another constant), as TrueVision's
    // Na__LeModel__DRAWING_SITEPLAN = Na__LeRec__DRAWING_SITEPLAN does.
    // ------------------------------------------------------------
    function ConstantIn(read, rel, name, seen) {
        const visited = seen || new Set();
        const key = rel + '#' + name;
        if (visited.has(key)) return null;
        visited.add(key);
        const text = read(rel);
        if (text === null) return null;
        const code = StripComments(text);
        const literal = code.match(new RegExp('\\b(?:const|let|var)\\s+' + name + '\\s*=\\s*([\'"])([^\'"\\n]*)\\1'));
        if (literal) return { value : literal[2], file : rel };
        const alias = code.match(new RegExp('\\b(?:const|let|var)\\s+' + name + '\\s*=\\s*([A-Za-z_$][A-Za-z0-9_$]*)\\s*[;,\\n]'));
        if (alias) return ConstantIn(read, rel, alias[1], visited);
        for (const pattern of [ /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g, /export\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g ]) {
            for (const m of code.matchAll(pattern)) {
                for (const part of m[1].split(',').map((p) => p.trim()).filter(Boolean)) {
                    const pieces = part.split(/\s+as\s+/).map((p) => p.trim());
                    if ((pieces[1] || pieces[0]) === name) return ConstantIn(read, posix.normalize(posix.join(posix.dirname(rel), m[2])), pieces[0], visited);
                }
            }
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Editor's Real Constant: exported by the part's module, and its value
    // ------------------------------------------------------------
    function RealConstant(read, rel, name) {
        const names = ExportsOf(read, rel);
        if (!names) return { exported : false, value : null, unreadable : true };
        if (!names.has(name)) return { exported : false, value : null };
        const found = ConstantIn(read, rel, name);
        return { exported : true, value : found ? found.value : null, file : found ? found.file : null };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Body of a Named Function (comment-stripped, braces counted)
    // ------------------------------------------------------------
    function FunctionBody(code, name) {
        const start = code.search(new RegExp('function\\s+' + name + '\\s*\\('));
        if (start === -1) return null;
        const open = code.indexOf('{', start);
        let depth = 0;
        for (let at = open; at < code.length; at++) {
            if (code[at] === '{') depth++;
            else if (code[at] === '}') { depth--; if (depth === 0) return code.slice(open, at + 1); }
        }
        return null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Static Half
// -----------------------------------------------------------------------------

    realConsole.log('ValeVision3D - Layout Editor loader facade');
    const LOADER_TEXT = ReadVv(P.loader);
    const LOADER_CODE = StripComments(LOADER_TEXT || '');
    const SCREEN_TEXT = ReadVv(P.screen);
    if (!LOADER_TEXT || !SCREEN_TEXT) {
        realConsole.log('  FAIL  the loader and its loading screen are where this test expects them (' + P.loader + ')');
        process.exit(1);
    }
    ReadTv(P.mode);
    realConsole.log('  TrueVision : ' + (tvReadable ? 'read with git show ' + TV_PIN + ' in ' + TV_REPO : 'NOT readable at ' + TV_REPO + ' - using the values recorded from b2aa9151'));

    // ---------------------------------------------------------------
    // A | THE START-UP PATH
    // ---------------------------------------------------------------
    section('A. The start-up path: no editor module before the editor is used');

    // FUNCTION | The Loader's Imports, Read From Its Text
    // ------------------------------------------------------------
    function LoaderImports(text) {
        const specs    = Specifiers(text);
        const statics  = specs.statics.map((s) => posix.normalize(posix.join(posix.dirname(P.loader), s)));
        const dynamics = specs.dynamics.map((s) => posix.normalize(posix.join(posix.dirname(P.loader), s)));
        return {
            statics, dynamics, computed : specs.computed,
            staticOk : statics.length === LOADER_STATIC.length && LOADER_STATIC.every((p) => statics.includes(p)),
            literal  : specs.computed === 0 && dynamics.length > 0
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Walk Every STATIC Import From index.html (overrides: planted copies, by path)
    // ------------------------------------------------------------
    function StartUpGraph(overrides) {
        const read    = (rel) => (overrides && Object.prototype.hasOwnProperty.call(overrides, rel)) ? overrides[rel] : ReadVv(rel);
        const reached = new Set();
        const via     = new Map();
        const queue   = [ 'index.html' ];
        while (queue.length) {
            const rel = queue.pop();
            if (reached.has(rel)) continue;
            reached.add(rel);
            const text = read(rel);
            if (text === null) continue;
            for (const spec of Specifiers(text).statics) {
                if (!(spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('/'))) continue;   // <-- Bare specifiers are the import map's vendors
                const target = posix.normalize(spec.startsWith('/') ? spec.slice(1) : posix.join(posix.dirname(rel), spec));
                if (!via.has(target)) via.set(target, rel);
                if (read(target) !== null) queue.push(target);
            }
        }
        const allowed = [ P.loader, P.screen, P.leaf ];
        const extra   = [ ...reached ].filter((rel) => rel.startsWith(LE + '/') && !allowed.includes(rel)).sort();
        return { size : reached.size, extra, via, allLoaderParts : allowed.every((rel) => reached.has(rel)) };
    }
    // ------------------------------------------------------------

    const loaderImports = LoaderImports(LOADER_TEXT);
    check('the loader\'s static imports are the drawings block, the authoring gate, the drawing-code leaf and its loading screen - nothing of the editor', loaderImports.staticOk, loaderImports.statics);
    check('every module the loader imports statically is on disk', loaderImports.statics.every((p) => ReadVv(p) !== null), loaderImports.statics.filter((p) => ReadVv(p) === null));
    check('every import() in the loader has a literal specifier (the module graph harness walks the editor through them)', loaderImports.literal, loaderImports);
    check('every import() in the loader names a file on disk', loaderImports.dynamics.every((p) => ReadVv(p) !== null), loaderImports.dynamics.filter((p) => ReadVv(p) === null));
    check('the six editor entry modules, the tab strip and the Dev section are reached only through import()',
        [ P.mode, P.model, P.spec, P.config, P.viewport3d, P.pdf, P.tabs, P.dev ].every((p) => loaderImports.dynamics.includes(p) && !loaderImports.statics.includes(p)), loaderImports.dynamics);
    [ P.screen, P.leaf ].forEach((rel) => {
        const specs = Specifiers(ReadVv(rel) || '');
        check(rel.split('/').pop() + ' imports nothing (it sits on the start-up path)', specs.statics.length === 0 && specs.dynamics.length === 0, specs);
    });

    // THE STATIC GRAPH FROM index.html | what a project with no sheets loads
    const startUp = StartUpGraph();
    check('walking every static import from index.html reaches ' + startUp.size + ' modules, and of the Layout Editor only the loader, its screen and the leaf',
        startUp.extra.length === 0 && startUp.allLoaderParts, startUp.extra.map((rel) => rel + ' (imported by ' + startUp.via.get(rel) + ')'));

    // THE CHECKS BITE | planted copies, in memory only
    const plantedStatic = LOADER_TEXT.replace(/(import \{ Na__DevGate__IsAuthoringEnabled \}[^\n]*\n)/, "$1    import { Na__LeMode__Enter } from '../05__Core__ModeController/Na__LayoutEditor__ModeController__.js';\n");
    const plantedGraph  = StartUpGraph({ [P.loader] : plantedStatic });
    check('it bites: a static import of the mode controller planted in the loader fails the import check and drags the editor onto the start-up path (' + plantedGraph.extra.length + ' modules)',
        plantedStatic !== LOADER_TEXT && !LoaderImports(plantedStatic).staticOk && plantedGraph.extra.length > 20 && plantedGraph.extra.includes(P.mode));
    const plantedComputed = LOADER_TEXT.replace("import('../05__Core__ModeController/Na__LayoutEditor__TabStrip__.js')", "import(Na__LeLoad__TABS_PATH)");
    check('it bites: an import() with a computed specifier planted in the loader fails the literal check', plantedComputed !== LOADER_TEXT && !LoaderImports(plantedComputed).literal);

    // ---------------------------------------------------------------
    // B | THE NAME COPIES
    // ---------------------------------------------------------------
    section('B. Every name the loader copies equals the editor\'s own');

    const copies = new Map();
    for (const m of LOADER_CODE.matchAll(/\bconst\s+(Na__LeLoad__[A-Z_]+)\s*=\s*'([^']*)'/g)) copies.set(m[1], m[2]);
    const rows = [];
    const checkNamesBody = FunctionBody(LOADER_CODE, 'Na__LeLoad__CheckNames') || '';
    for (const m of checkNamesBody.matchAll(/\[\s*(Na__LeLoad__[A-Z_]+)\s*,\s*editor\.([A-Za-z0-9_$]+)\.(Na__[A-Za-z0-9_$]+)\s*,/g)) rows.push({ copy : m[1], part : m[2], name : m[3] });
    check('Na__LeLoad__CheckNames was read (' + rows.length + ' rows)', checkNamesBody !== '' && rows.length > 0);

    const awaitingEditor = [];
    COPIES.forEach((entry) => {
        const copy = copies.get(entry.copy);
        const vv   = RealConstant(ReadVv, P[entry.part], entry.name);
        const tv   = tvReadable ? RealConstant(ReadTv, P[entry.part], entry.name) : { exported : true, value : TV_RECORDED[entry.name] };
        check(entry.copy + ' is declared in the loader', typeof copy === 'string', [ ...copies.keys() ]);
        check(entry.copy + ' = "' + copy + '" is TrueVision\'s ' + entry.name + ' ("' + tv.value + '")', tv.exported && copy === tv.value, { copy, tv });
        if (vv.exported) {
            check(entry.copy + ' = this app\'s ' + entry.name + ' ("' + vv.value + '", ' + (vv.file || '?') + ')', copy === vv.value, { copy, vv });
            const row = rows.find((r) => r.copy === entry.copy);
            check(entry.copy + ' has its CheckNames row against editor.' + entry.part + '.' + entry.name + ' (the editor declares it, so the load must check it)',
                !!row && row.part === entry.part && row.name === entry.name, row || 'add [ ' + entry.copy + ', editor.' + entry.part + '.' + entry.name + ', \'' + entry.what + '\' ] to Na__LeLoad__CheckNames');
        } else {
            awaitingEditor.push(entry.copy + ' (' + entry.name + ')');
            check(entry.copy + ': this app\'s editor does not export ' + entry.name + ' yet, so CheckNames has no row for it (a row would fail the export harness)', !rows.some((r) => r.copy === entry.copy), rows);
        }
    });
    if (awaitingEditor.length) note('copies checked against TrueVision only, until this app\'s editor declares them: ' + awaitingEditor.join(', '));
    check('every CheckNames row compares a copy with the constant it copies', rows.every((r) => COPIES.some((c) => c.copy === r.copy && c.part === r.part && c.name === r.name)), rows);

    // THE COVERAGE CHECK BITES | a copy the editor declares, with its row taken out of a planted copy
    function MissingRows(text) {
        const body = FunctionBody(StripComments(text), 'Na__LeLoad__CheckNames') || '';
        const here = Array.from(body.matchAll(/\[\s*(Na__LeLoad__[A-Z_]+)\s*,\s*editor\.([A-Za-z0-9_$]+)\.(Na__[A-Za-z0-9_$]+)\s*,/g)).map((m) => m[1] + '|' + m[2] + '|' + m[3]);
        return COPIES.filter((c) => RealConstant(ReadVv, P[c.part], c.name).exported && !here.includes(c.copy + '|' + c.part + '|' + c.name)).map((c) => c.copy);
    }
    const plantedRowless = LOADER_TEXT.replace(/[ \t]*\[ Na__LeLoad__VIEW_SHEET,[^\n]*\n/, '');
    const realGaps       = MissingRows(LOADER_TEXT);
    const plantedGaps    = MissingRows(plantedRowless);
    check('it bites: with the sheet view\'s CheckNames row taken out of a planted copy, the coverage check names it',
        plantedRowless !== LOADER_TEXT && !realGaps.includes('Na__LeLoad__VIEW_SHEET') && plantedGaps.includes('Na__LeLoad__VIEW_SHEET') && plantedGaps.length === realGaps.length + 1, { realGaps, plantedGaps });

    // THE PARTS | the names Na__LeLoad__ImportEditor binds, in the order the modules are listed
    const importEditor = FunctionBody(LOADER_CODE, 'Na__LeLoad__ImportEditor') || '';
    const boundSpecs   = Array.from(importEditor.matchAll(/import\(\s*'([^']+)'\s*\)/g)).map((m) => posix.normalize(posix.join(posix.dirname(P.loader), m[1])));
    const boundNames   = ((importEditor.match(/\.then\(\s*\(\s*\[([^\]]*)\]\s*\)/) || [])[1] || '').split(',').map((p) => p.trim()).filter(Boolean);
    check('Na__LeLoad__ImportEditor binds mode, model, spec, config, viewport3d and pdf to the modules this test reads',
        boundNames.join() === PARTS.join() && PARTS.every((part, at) => boundSpecs[at] === P[part]), { boundNames, boundSpecs });

    // ---------------------------------------------------------------
    // C | THE FEATURE MAP AND THE DOCUMENT ENTRY POINTS
    // ---------------------------------------------------------------
    section('C. The feature map and TrueVision\'s document entry points');

    const mapBody = (LOADER_CODE.match(/const\s+Na__LeLoad__FEATURES\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\)/) || [])[1] || '';
    const featureMap = new Map();
    for (const m of mapBody.matchAll(/\[\s*(Na__LeLoad__VIEW_[A-Z_]+)\s*\]\s*:\s*(true|false)/g)) featureMap.set(m[1], m[2] === 'true');
    check('Na__LeLoad__FEATURES is a frozen literal map of the four views (no probe of the editor)',
        featureMap.size === 4 && [ 'Na__LeLoad__VIEW_SHEET', 'Na__LeLoad__VIEW_SPEC', 'Na__LeLoad__VIEW_REGISTER', 'Na__LeLoad__VIEW_STATEMENT' ].every((v) => featureMap.has(v)), [ ...featureMap ]);
    check('the drawing tabs and the specification are always there', featureMap.get('Na__LeLoad__VIEW_SHEET') === true && featureMap.get('Na__LeLoad__VIEW_SPEC') === true);
    const hasFeatureBody = FunctionBody(LOADER_CODE, 'Na__LeLoad__HasFeature') || '';
    check('Na__LeLoad__HasFeature reads the map and nothing else (no editor, no import)', hasFeatureBody.includes('Na__LeLoad__FEATURES') && !/editor|import\s*\(|Na__LeLoad__Editor/.test(hasFeatureBody), hasFeatureBody);

    const modeExports = ExportsOf(ReadVv, P.mode) || new Set();
    const tvModeExports = tvReadable ? (ExportsOf(ReadTv, P.mode) || new Set()) : new Set(TV_RECORDED.ModeExports);
    const REACHES_EDITOR = /editor\.|Na__LeLoad__WithEditor|Na__LeLoad__Require|Na__LeLoad__Load|import\s*\(/;
    DOCUMENT_VIEWS.forEach((doc) => {
        const present = featureMap.get(doc.view) === true;
        const body    = FunctionBody(LOADER_CODE, doc.entry) || '';
        check(doc.entry + ' exists, as TrueVision\'s ' + doc.real + ' does', body !== '' && tvModeExports.has(doc.real), { body : body.slice(0, 120), tv : tvModeExports.has(doc.real) });
        if (present) {
            check(doc.view + ' is marked present, so ' + doc.entry + ' forwards to the mode controller\'s ' + doc.real + ' and the mode controller exports it',
                body.includes('.mode.' + doc.real + '(') && body.includes('Na__LeLoad__WithEditor') && modeExports.has(doc.real), { body, exported : modeExports.has(doc.real) });
        } else {
            check(doc.view + ' is marked absent, so ' + doc.entry + ' refuses: it never reaches the editor, loads nothing and resolves false',
                !REACHES_EDITOR.test(body) && body.includes('Na__LeLoad__RefuseView'), body);
        }
    });
    const ABSENT_DOCS = DOCUMENT_VIEWS.filter((doc) => featureMap.get(doc.view) === false);   // <-- The running half's refusal cases
    const absentDoc   = ABSENT_DOCS[0];
    if (absentDoc) {
        const refusal     = 'return Na__LeLoad__RefuseView(' + absentDoc.view + ');';
        const plantedLeak = LOADER_CODE.replace(refusal, 'return Na__LeLoad__WithEditor((editor) => editor.mode.' + absentDoc.real + '(options), false);');
        check('it bites: a planted ' + absentDoc.entry + ' that reaches the editor while its view is marked absent is caught',
            plantedLeak !== LOADER_CODE && REACHES_EDITOR.test(FunctionBody(plantedLeak, absentDoc.entry) || ''));
    } else {
        note('every document view is marked present: no refusal left to plant a leak into');
    }
    // THE PRE-LOAD FALLBACKS | what the sheet model's normaliser and the editor's labels will say once it loads
    const LE_CONFIG = (() => { try { return JSON.parse(ReadVv(P.leConfig) || 'null'); } catch (error) { return null; } })();
    const configValues = {};
    (function collect(node) {
        if (!node || typeof node !== 'object') return;
        Object.keys(node).forEach((key) => { if (typeof node[key] === 'string') configValues[key] = node[key]; else collect(node[key]); });
    })(LE_CONFIG);
    const CONFIG_LABELS = {};
    Object.keys(configValues).filter((key) => key.startsWith('LayoutEditor__Labels__')).forEach((key) => { CONFIG_LABELS[key.slice('LayoutEditor__Labels__'.length)] = configValues[key]; });
    const DEFAULT_NAME  = configValues.LayoutEditor__Sheet__DefaultNameFormat;
    const DEFAULT_PAPER = configValues.LayoutEditor__Sheet__DefaultPaperSize;
    check('the editor\'s config was read (' + Object.keys(CONFIG_LABELS).length + ' labels)', !!LE_CONFIG && typeof DEFAULT_NAME === 'string' && typeof DEFAULT_PAPER === 'string');
    check('the pre-load name and paper fallbacks are the sheet model\'s config defaults ("' + DEFAULT_NAME + '", ' + DEFAULT_PAPER + ')',
        copies.get('Na__LeLoad__NAME_FORMAT') === DEFAULT_NAME && copies.get('Na__LeLoad__PAPER_SIZE') === DEFAULT_PAPER, { name : copies.get('Na__LeLoad__NAME_FORMAT'), paper : copies.get('Na__LeLoad__PAPER_SIZE') });
    const tabFormat = (FunctionBody(LOADER_CODE, 'Na__LeLoad__GetTabLabel') || '').match(/GetLabel\(\s*'TabLabelFormat'\s*,\s*'([^']*)'\s*\)/);
    check('the pre-load tab label format is the config\'s TabLabelFormat', !!tabFormat && (CONFIG_LABELS.TabLabelFormat === undefined || CONFIG_LABELS.TabLabelFormat === tabFormat[1]), { loader : tabFormat && tabFormat[1], config : CONFIG_LABELS.TabLabelFormat });

    const readyBody = FunctionBody(LOADER_CODE, 'Na__LeLoad__Ready') || '';
    check('Na__LeLoad__Ready forwards to the editor\'s own Ready once loaded and never loads it itself (TrueVision exports Na__LeMode__Ready)',
        readyBody.includes('.mode.Na__LeMode__Ready()') && !/Na__LeLoad__(?:WithEditor|Require|Load)\s*\(|import\s*\(/.test(readyBody) && tvModeExports.has('Na__LeMode__Ready'), readyBody);

    // THE SITE PLAN RULE | TrueVision's, word for word
    const tvRecords   = tvReadable ? ReadTv(P.records) : null;
    const tvRule      = tvRecords ? (FunctionBody(StripComments(tvRecords), 'Na__LeRec__IsSitePlanSheet') || '') : '{ return !!sheet && sheet.Sheet__DrawingType === Na__LeRec__DRAWING_SITEPLAN; }';
    const vvRule      = FunctionBody(LOADER_CODE, 'Na__LeLoad__IsSitePlanSheet') || '';
    const normaliseRule = (body) => body.replace(/\s+/g, ' ').replace(/Na__Le(?:Rec|Load)__DRAWING_SITEPLAN/g, 'SITEPLAN').trim();
    check('Na__LeLoad__IsSitePlanSheet is TrueVision\'s Na__LeRec__IsSitePlanSheet rule exactly', normaliseRule(vvRule) === normaliseRule(tvRule), { vv : normaliseRule(vvRule), tv : normaliseRule(tvRule) });
    check('the pre-load sheet views carry Sheet__DrawingType for a site plan', /Sheet__DrawingType\s*===\s*Na__LeLoad__DRAWING_SITEPLAN\)\s*view\.Sheet__DrawingType\s*=/.test(FunctionBody(LOADER_CODE, 'Na__LeLoad__SheetViews') || ''));

    // ---------------------------------------------------------------
    // D | THE WORDING
    // ---------------------------------------------------------------
    section('D. The loading wording is TrueVision\'s first-open veil wording');

    const tvVeil = tvReadable ? ReadTv(P.veil) : null;
    const veilFallback = (key) => {
        if (!tvVeil) return TV_RECORDED[key];
        const m = tvVeil.match(new RegExp('GetLabel\\(\\s*\'' + key + '\'\\s*,\\s*\'([^\']*)\'\\s*\\)'));
        return m ? m[1] : null;
    };
    const headline = veilFallback('VeilDrawingsHeadline');
    const drawing  = veilFallback('VeilDrawingViews');
    const screenTitle = (StripComments(SCREEN_TEXT).match(/const\s+Na__LeLoadScreen__TITLE\s*=\s*'([^']*)'/) || [])[1];
    check('the loading screen\'s title is TrueVision\'s first-open veil headline "' + headline + '" (VeilDrawingsHeadline)', !!headline && screenTitle === headline, { screenTitle, headline });
    check('the old "Loading Layout Editor..." title is gone from the code (the log may still name it)', StripComments(SCREEN_TEXT).indexOf('Loading Layout Editor...') === -1);
    check('the drawing-count line reads the veil label VeilDrawingViews, falling back to TrueVision\'s "' + drawing + '"',
        copies.get('Na__LeLoad__LABEL_DRAWING') === 'VeilDrawingViews' && copies.get('Na__LeLoad__STATUS_DRAWING') === drawing
        && /Na__LeLoad__GetLabel\(\s*Na__LeLoad__LABEL_DRAWING\s*,\s*Na__LeLoad__STATUS_DRAWING\s*\)/.test(FunctionBody(LOADER_CODE, 'Na__LeLoad__AwaitFirstDrawing') || ''),
        { label : copies.get('Na__LeLoad__LABEL_DRAWING'), fallback : copies.get('Na__LeLoad__STATUS_DRAWING'), tv : drawing });

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Running Half: Module Hooks and Stand-Ins
// -----------------------------------------------------------------------------

    section('Stand-ins for the running half');
    const BASE    = 'http://loader-facade.test/vv/';
    const SCRATCH = mkdtempSync(join(tmpdir(), 'na-loader-facade-'));

    // THE DRAWINGS BLOCK AND THE AUTHORING GATE | the names the loader imports, over the case's world
    const drawDataEvent = (ConstantIn(ReadVv, P.drawData, 'Na__DrawData__CHANGED_EVENT') || {}).value || 'na-layouteditor-drawingsdata-changed';
    const STUB_DRAWDATA = [
        'const W = globalThis.Na__TestWorld;',
        'W.Loaded.push(' + JSON.stringify(P.drawData) + ');',
        'const Na__DrawData__CHANGED_EVENT = ' + JSON.stringify(drawDataEvent) + ';',
        'function Na__DrawData__GetSheetsArray() { return W.Block.Sheets; }',
        'function Na__DrawData__GetLayoutModeEnabled() { return W.Block.LayoutMode === true; }',
        'function Na__DrawData__SetLayoutModeEnabled(enabled) { W.Block.LayoutMode = enabled === true; return W.Block.LayoutMode; }',
        'function Na__DrawData__Save(showToast) { W.Calls.push([ "drawData", "Na__DrawData__Save", [ showToast ] ]); return Promise.resolve(true); }',
        'export { Na__DrawData__CHANGED_EVENT, Na__DrawData__GetSheetsArray, Na__DrawData__GetLayoutModeEnabled, Na__DrawData__SetLayoutModeEnabled, Na__DrawData__Save };'
    ].join('\n');
    const STUB_DEVGATE = [
        'const W = globalThis.Na__TestWorld;',
        'W.Loaded.push(' + JSON.stringify(P.devGate) + ');',
        'function Na__DevGate__IsAuthoringEnabled() { return W.Authoring === true; }',
        'export { Na__DevGate__IsAuthoringEnabled };'
    ].join('\n');
    const loaderNamedImports = Array.from(LOADER_CODE.matchAll(/import\s*\{([^}]*)\}\s*from\s*'([^']+)'/g)).map((m) => ({ names : m[1].split(',').map((p) => p.trim()).filter(Boolean), from : posix.normalize(posix.join(posix.dirname(P.loader), m[2])) }));
    const stubbedNames = { [P.drawData] : ExportsOf(() => STUB_DRAWDATA, 'x'), [P.devGate] : ExportsOf(() => STUB_DEVGATE, 'x') };
    check('the stand-ins for the drawings block and the authoring gate export every name the loader imports from them',
        loaderNamedImports.filter((i) => stubbedNames[i.from]).every((i) => i.names.every((n) => stubbedNames[i.from].has(n))), loaderNamedImports);

    // THE EDITOR'S MODULES | this app's real export list and constant values; every function a recorded trampoline
    function EditorStandIn(part, rel) {
        const names = [ ...(ExportsOf(ReadVv, rel) || new Set()) ].sort();
        const lines = [
            'const W = globalThis.Na__TestWorld;',
            'W.Loaded.push(' + JSON.stringify(rel) + ');',
            'if (W.FailEvaluate === ' + JSON.stringify(part) + ') throw new Error("planted: the ' + part + ' module failed to load");'
        ];
        names.forEach((name) => {
            const constant = ConstantIn(ReadVv, rel, name);
            if (constant) lines.push('const ' + name + ' = W.Const(' + JSON.stringify(name) + ', ' + JSON.stringify(constant.value) + ');');
            else lines.push('function ' + name + '(...args) { return W.Act(' + JSON.stringify(part) + ', ' + JSON.stringify(name) + ', args); }');
        });
        lines.push('export { ' + names.join(', ') + ' };');
        return lines.join('\n');
    }
    const STUBS = {
        [P.drawData] : STUB_DRAWDATA,
        [P.devGate]  : STUB_DEVGATE
    };
    const EDITOR_STANDINS = { mode : P.mode, model : P.model, spec : P.spec, config : P.config, viewport3d : P.viewport3d, pdf : P.pdf, tabs : P.tabs, dev : P.dev };
    Object.keys(EDITOR_STANDINS).forEach((part) => { STUBS[EDITOR_STANDINS[part]] = EditorStandIn(part, EDITOR_STANDINS[part]); });

    const HOOKS_SOURCE = [
        "import { readFileSync } from 'node:fs';",
        "import { fileURLToPath } from 'node:url';",
        "let state = { base : '', appRootUrl : '', stubs : {}, real : [] };",
        "export async function initialize(data) { state = data; }",
        "function caseOf(url) { try { return new URL(url).searchParams.get('case'); } catch (error) { return null; } }",
        "export async function resolve(specifier, context, nextResolve) {",
        "    const parent = context.parentURL || '';",
        "    if (specifier.startsWith(state.base)) return { url : specifier, shortCircuit : true };",
        "    if (parent.startsWith(state.base) && (specifier.startsWith('./') || specifier.startsWith('../'))) {",
        "        const url = new URL(specifier, parent);",
        "        const parentCase = caseOf(parent);",
        "        if (parentCase && !url.searchParams.has('case')) url.searchParams.set('case', parentCase);",
        "        return { url : url.href, shortCircuit : true };",
        "    }",
        "    return nextResolve(specifier, context);",
        "}",
        "export async function load(url, context, nextLoad) {",
        "    if (!url.startsWith(state.base)) return nextLoad(url, context);",
        "    const rel = url.slice(state.base.length).split('?')[0];",
        "    if (Object.prototype.hasOwnProperty.call(state.stubs, rel)) return { format : 'module', source : state.stubs[rel], shortCircuit : true };",
        "    if (state.real.includes(rel)) return { format : 'module', source : readFileSync(fileURLToPath(state.appRootUrl + rel), 'utf8'), shortCircuit : true };",
        "    return { format : 'module', source : 'globalThis.Na__TestWorld.Unexpected.push(' + JSON.stringify(rel) + '); throw new Error(' + JSON.stringify('not expected here: ' + rel) + ');', shortCircuit : true };",
        "}"
    ].join('\n');
    const HOOKS_FILE = join(SCRATCH, 'hooks.mjs');
    writeFileSync(HOOKS_FILE, HOOKS_SOURCE);
    register(pathToFileURL(HOOKS_FILE).href, {
        parentURL : import.meta.url,
        data      : { base : BASE, appRootUrl : pathToFileURL(APP_ROOT + sep).href.replace(/\\/g, '/'), stubs : STUBS, real : [ P.loader, P.screen, P.leaf ] }
    });

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Running Half: a Page for Each Case
// -----------------------------------------------------------------------------

    // A PAGE | the little of the DOM the loader and its screen touch
    class FakeElement {
        constructor(tag) { this.tagName = String(tag).toUpperCase(); this.children = []; this.attributes = {}; this.style = {}; this.classes = new Set(); this.textContent = ''; this.listeners = {}; this.parent = null; this.id = ''; this.onAppend = null; }
        get className() { return [ ...this.classes ].join(' '); }
        set className(value) { this.classes = new Set(String(value).split(/\s+/).filter(Boolean)); }
        get classList() {
            const el = this;
            return {
                add    : (...names) => names.forEach((n) => el.classes.add(n)),
                remove : (...names) => names.forEach((n) => el.classes.delete(n)),
                toggle : (name, force) => { const on = force === undefined ? !el.classes.has(name) : !!force; if (on) el.classes.add(name); else el.classes.delete(name); return on; },
                contains : (name) => el.classes.has(name)
            };
        }
        set innerHTML(value) { this.children.forEach((c) => { c.parent = null; }); this.children = []; this.textContent = ''; }
        setAttribute(key, value) { this.attributes[key] = String(value); if (key === 'id') this.id = String(value); }
        getAttribute(key) { return Object.prototype.hasOwnProperty.call(this.attributes, key) ? this.attributes[key] : null; }
        appendChild(node) { node.parent = this; this.children.push(node); if (this.onAppend) this.onAppend(node); return node; }
        append(...nodes) { nodes.forEach((n) => this.appendChild(n)); }
        contains(node) { for (let at = node; at; at = at.parent) if (at === this) return true; return false; }
        querySelector(selector) {
            const wanted = selector.startsWith('.') ? selector.slice(1) : null;
            const walk = (el) => { for (const c of el.children) { if (wanted && c.classes.has(wanted)) return c; const deeper = walk(c); if (deeper) return deeper; } return null; };
            return walk(this);
        }
        addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
        removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] || []).filter((f) => f !== fn); }
        fire(type) { (this.listeners[type] || []).slice().forEach((fn) => fn({ type, target : this })); }
        text() { return this.textContent + this.children.map((c) => ' ' + c.text()).join(''); }
    }

    function NewPage(world) {
        const head = new FakeElement('head');
        const body = new FakeElement('body');
        head.onAppend = (node) => { if (node.tagName === 'LINK') setTimeout(() => node.fire(world.FailStylesheets ? 'error' : 'load'), 0); };
        const byId = (el, id) => { if (el.id === id) return el; for (const c of el.children) { const hit = byId(c, id); if (hit) return hit; } return null; };
        globalThis.document = {
            head, body,
            createElement  : (tag) => new FakeElement(tag),
            getElementById : (id) => byId(body, id),
            querySelector  : (selector) => {
                const m = selector.match(/^link\[data-na-le-stylesheet="(.*)"\]$/);
                return m ? (head.children.find((c) => c.getAttribute('data-na-le-stylesheet') === m[1]) || null) : null;
            }
        };
        const win = new EventTarget();
        win.requestAnimationFrame = (callback) => setTimeout(() => callback(performance.now()), 0);
        win.cancelAnimationFrame  = (id) => clearTimeout(id);
        win.setTimeout            = (fn, ms) => setTimeout(fn, ms);
        win.clearTimeout          = (id) => clearTimeout(id);
        win.location              = { hostname : 'localhost', reload() { world.Reloaded = true; } };
        globalThis.window = win;
        world.Events = [];
        [ 'na-layouteditor-loader-changed', 'na-layouteditor-sheets-changed' ].forEach((type) => win.addEventListener(type, (event) => world.Events.push([ type, event.detail ])));
        return { head, body, win };
    }

    // A WORLD | the case's drawings block, the editor stand-ins' behaviour and everything recorded
    function NewWorld(options) {
        const W = {
            Loaded : [], Calls : [], Unexpected : [], Toasts : [], Events : [], Overrides : {}, FailEvaluate : null, FailStylesheets : false,
            Block : { LayoutMode : true, Sheets : [] }, Authoring : false, Editable : false, Active : false, View : 'sheet', ActiveId : null,
            Started : false, InitResult : true, ConfigEnabled : true, Labels : Object.assign({}, CONFIG_LABELS), Progress : [],
            Const(name, value) { return Object.prototype.hasOwnProperty.call(W.Overrides, name) ? W.Overrides[name] : value; },
            Act(part, name, args) {
                W.Calls.push([ part, name, args ]);
                const behaviour = W.Behaviour[part] && W.Behaviour[part][name];
                return behaviour ? behaviour(...args) : undefined;
            },
            Called(part, name) { return W.Calls.filter((c) => c[0] === part && c[1] === name); },
            Editor() { return W.Loaded.filter((rel) => Object.values(EDITOR_STANDINS).includes(rel) && rel !== P.tabs && rel !== P.dev); }
        };
        // THE SHEET MODEL'S NORMALISER, for the fields the facade shows: in place, with the
        // config's defaults, as Na__LeRec__NormaliseSheet fills them (a stray key is left alone)
        const sorted = () => {
            W.Block.Sheets.forEach((sheet, index) => {
                if (typeof sheet.Sheet__Name !== 'string' || !sheet.Sheet__Name) sheet.Sheet__Name = DEFAULT_NAME.split('{index}').join(String(index + 1));
                if (typeof sheet.Sheet__Order !== 'number' || !Number.isFinite(sheet.Sheet__Order)) sheet.Sheet__Order = index + 1;
                if (typeof sheet.Sheet__PaperSize !== 'string' || !sheet.Sheet__PaperSize) sheet.Sheet__PaperSize = DEFAULT_PAPER;
                if (!sheet.Sheet__Fields || typeof sheet.Sheet__Fields !== 'object') sheet.Sheet__Fields = {};
                if (!Array.isArray(sheet.Sheet__Viewports)) sheet.Sheet__Viewports = [];
            });
            return W.Block.Sheets.slice().sort((a, b) => a.Sheet__Order - b.Sheet__Order);
        };
        W.Behaviour = {
            mode : {
                Na__LeMode__Initialize          : (context) => { W.Context = context; W.Started = true; return Promise.resolve(typeof W.InitResult === 'function' ? W.InitResult() : W.InitResult); },
                Na__LeMode__Ready               : () => Promise.resolve(W.Started && W.InitResult === true && W.ConfigEnabled),
                Na__LeMode__IsAvailable         : () => W.Block.LayoutMode === true && W.Block.Sheets.length > 0,
                Na__LeMode__IsEditable          : () => W.Editable,
                Na__LeMode__IsActive            : () => W.Active,
                Na__LeMode__GetView             : () => W.View,
                Na__LeMode__Enter               : (sheetId) => { W.Active = true; W.View = 'sheet'; W.ActiveId = sheetId || (sorted()[0] || {}).Sheet__Id || null; return true; },
                Na__LeMode__Leave               : () => { const was = W.Active; W.Active = false; return was; },
                Na__LeMode__OpenSpecification   : () => { W.Active = true; W.View = 'spec'; return true; },
                Na__LeMode__SetLayoutMode       : (enabled) => { W.Block.LayoutMode = enabled === true; return W.Block.LayoutMode; },
                Na__LeMode__WaitForFirstDrawing : (onProgress) => { W.Progress.forEach(([ drawn, total ]) => onProgress(drawn, total)); return Promise.resolve(true); }
            },
            model : {
                Na__LeModel__GetSheets      : () => sorted(),
                Na__LeModel__GetActiveSheet : () => (W.Active ? (W.Block.Sheets.find((s) => s.Sheet__Id === W.ActiveId) || null) : null),
                Na__LeModel__IsDirty        : () => false
            },
            spec   : { Na__LeSpec__IsDirty : () => false },
            config : {
                Na__LeCfg__IsEnabled   : () => W.ConfigEnabled,
                Na__LeCfg__GetLabel    : (key, fallback) => (Object.prototype.hasOwnProperty.call(W.Labels, key) ? W.Labels[key] : fallback),
                Na__LeCfg__FormatLabel : (key, fallback, tokens) => { let text = Object.prototype.hasOwnProperty.call(W.Labels, key) ? W.Labels[key] : fallback; Object.keys(tokens || {}).forEach((k) => { text = text.split('{' + k + '}').join(String(tokens[k])); }); return text; }
            },
            tabs : { Na__LeTabs__Initialize : () => { W.TabsUp = true; } }
        };
        Object.assign(W, options || {});
        return W;
    }

    // A CASE | a fresh world, page and loader instance; the console kept on the world
    let caseNumber = 0;
    async function OpenCase(options) {
        caseNumber += 1;
        const world = NewWorld(options);
        globalThis.Na__TestWorld = world;
        world.Console = [];
        consoleSink = world.Console;
        world.Page = NewPage(world);
        world.Loader = await import(BASE + P.loader + '?case=' + caseNumber);
        return world;
    }
    function Context(world) {
        return {
            renderer : {}, scene : {}, camera : {}, controls : {}, pipelineRef : {}, modelRoot : {},
            appConfig : { LayoutEditor__Config : { LayoutEditor__Config__ReadOnlyOnWeb : true } },
            showToast : (message, isError) => world.Toasts.push([ message, isError === true ])
        };
    }
    function ScreenRoot(world) { return world.Page.body.children.find((c) => c.id === 'naLayoutEditorLoading') || null; }
    const errorsOf = (world) => world.Console.filter((c) => c[0] === 'error').map((c) => c[1]);
    const warnsOf  = (world) => world.Console.filter((c) => c[0] === 'warn').map((c) => c[1]);

    // THE FIXTURE SHEETS | out of order, one site plan, one stray drawing type, one with a drawing number
    function Sheets() {
        return [
            { Sheet__Id : 'Sheet_003', Sheet__Name : 'Elevations', Sheet__Order : 3, Sheet__PaperSize : 'A3', Sheet__Fields : { Sheet__Fields__DrawingNumber : '3047_D03' }, Sheet__Viewports : [ {}, {} ] },
            { Sheet__Id : 'Sheet_001', Sheet__Name : 'Site Plan',  Sheet__Order : 1, Sheet__DrawingType : 'siteplan' },
            { Sheet__Id : 'Sheet_002', Sheet__Order : 2, Sheet__DrawingType : 'architectural' },
            { Sheet__Id : 'Sheet_004', Sheet__Name : 'Plans' }
        ];
    }

    // EVERY QUESTION THE FACADE ANSWERS, AS ONE COMPARABLE RECORD
    function Answers(L) {
        const sheets = L.Na__LeLoad__GetSheets();
        const byId = {};
        sheets.forEach((sheet) => {
            byId[sheet.Sheet__Id] = { site : L.Na__LeLoad__IsSitePlanSheet(sheet), tab : L.Na__LeLoad__GetTabLabel(sheet), code : L.Na__LeLoad__GetShortCode(sheet), number : L.Na__LeLoad__GetDrawingNumber(sheet) };
        });
        return {
            order    : sheets.map((s) => s.Sheet__Id),
            byId,
            features : [ L.Na__LeLoad__VIEW_SHEET, L.Na__LeLoad__VIEW_SPEC, L.Na__LeLoad__VIEW_REGISTER, L.Na__LeLoad__VIEW_STATEMENT, 'drawings', '' ].map((v) => L.Na__LeLoad__HasFeature(v)),
            views    : [ L.Na__LeLoad__VIEW_SHEET, L.Na__LeLoad__VIEW_SPEC, L.Na__LeLoad__VIEW_REGISTER, L.Na__LeLoad__VIEW_STATEMENT ],
            events   : [ L.Na__LeLoad__SHEETS_EVENT, L.Na__LeLoad__MODE_EVENT, L.Na__LeLoad__SPEC_EVENT, L.Na__LeLoad__STATE_EVENT ],
            offered  : L.Na__LeLoad__IsAvailable(),
            layout   : L.Na__LeLoad__IsLayoutModeOn(),
            editable : L.Na__LeLoad__IsEditable(),
            probes   : [ null, undefined, {}, 'siteplan', { Sheet__DrawingType : 'siteplan' }, { Sheet__DrawingType : 'SitePlan' }, { Sheet__DrawingType : 'architectural' } ].map((s) => L.Na__LeLoad__IsSitePlanSheet(s))
        };
    }
    const TV_RULE = (sheet) => !!sheet && sheet.Sheet__DrawingType === 'siteplan';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Running Half: Cases
// -----------------------------------------------------------------------------

    async function RunSection(title, body) {
        section(title);
        try { await body(); }
        catch (error) { check('the section ran to its end without throwing', false, (error && error.stack) ? error.stack.split('\n').slice(0, 5).join(' | ') : String(error)); }
    }

    // ---------------------------------------------------------------
    // E | NOTHING IS FETCHED UNTIL THE EDITOR IS NEEDED
    // ---------------------------------------------------------------
    await RunSection('E. Start-up: a project with no sheets, and Layout Mode off, fetch nothing of the editor', async () => {
        const empty = await OpenCase({ Block : { LayoutMode : true, Sheets : [] } });
        const L = empty.Loader;
        check('the loader starts', L.Na__LeLoad__Initialize(Context(empty)) === true);
        await ticks(8);
        check('no sheets: no editor module and no tab strip is fetched (only the drawings block and the authoring gate)', empty.Loaded.every((rel) => rel === P.drawData || rel === P.devGate) && empty.Unexpected.length === 0, empty.Loaded);
        check('no sheets: the editor is not offered, and says so once', L.Na__LeLoad__IsAvailable() === false && empty.Events.filter((e) => e[0] === 'na-layouteditor-loader-changed').length === 1 && empty.Events[0][1].offered === false, empty.Events);
        for (const doc of ABSENT_DOCS) {
            check('no sheets: ' + doc.entry + ' (its view not in this build) fetches nothing and resolves false', (await L[doc.entry]({})) === false && empty.Editor().length === 0, empty.Loaded);
        }
        const ready = await Settles(L.Na__LeLoad__Ready());
        check('no sheets: Ready waits for a load that has not happened, and asking it fetches nothing', ready.state === 'pending' && empty.Editor().length === 0, ready);

        const off = await OpenCase({ Block : { LayoutMode : false, Sheets : Sheets() } });
        off.Loader.Na__LeLoad__Initialize(Context(off));
        await ticks(8);
        check('Layout Mode off with sheets: nothing of the editor is fetched, and it is not offered', off.Editor().length === 0 && !off.Loaded.includes(P.tabs) && off.Loader.Na__LeLoad__IsAvailable() === false, off.Loaded);
    });

    // ---------------------------------------------------------------
    // F | BEFORE THE LOAD, THE LOAD, AND AFTER IT
    // ---------------------------------------------------------------
    await RunSection('F. The facade before the load, through it and after it: the same answers', async () => {
        const world = await OpenCase({ Block : { LayoutMode : true, Sheets : Sheets() }, Progress : [ [ 1, 2 ] ] });
        const L = world.Loader;
        L.Na__LeLoad__Initialize(Context(world));
        await ticks(8);
        check('offered: the tab strip is fetched and started, and no editor module', world.Loaded.includes(P.tabs) && world.TabsUp === true && world.Editor().length === 0, world.Loaded);

        // BEFORE | answered from the raw block
        const before = Answers(L);
        check('before: the sheets come in the sheet model\'s order, with its fallbacks', before.order.join() === 'Sheet_001,Sheet_002,Sheet_003,Sheet_004', before.order);
        check('before: the sheet with no name reads the default name', L.Na__LeLoad__GetSheets().find((s) => s.Sheet__Id === 'Sheet_002').Sheet__Name === 'New Drawing');
        check('before: only the record stored as a site plan is one (TrueVision\'s rule)', before.byId.Sheet_001.site === true && before.byId.Sheet_002.site === false && before.byId.Sheet_003.site === false && before.byId.Sheet_004.site === false, before.byId);
        check('before: a view carries Sheet__DrawingType only for a site plan, as TrueVision stores it', L.Na__LeLoad__GetSheets().filter((s) => 'Sheet__DrawingType' in s).map((s) => s.Sheet__Id).join() === 'Sheet_001');
        check('before: IsSitePlanSheet answers every probe as TrueVision\'s rule does', JSON.stringify(before.probes) === JSON.stringify([ null, undefined, {}, 'siteplan', { Sheet__DrawingType : 'siteplan' }, { Sheet__DrawingType : 'SitePlan' }, { Sheet__DrawingType : 'architectural' } ].map(TV_RULE)), before.probes);
        const expectedFeatures = [ 'Na__LeLoad__VIEW_SHEET', 'Na__LeLoad__VIEW_SPEC', 'Na__LeLoad__VIEW_REGISTER', 'Na__LeLoad__VIEW_STATEMENT' ].map((v) => featureMap.get(v) === true).concat([ false, false ]);
        check('before: HasFeature answers as the map says (' + expectedFeatures.slice(0, 4).join(', ') + ') and no for anything else', before.features.join() === expectedFeatures.join(), before.features);
        check('before: the view names are TrueVision\'s', before.views.join() === 'sheet,spec,register,statement', before.views);
        check('before: nothing open, nothing unsaved, the sheet view', L.Na__LeLoad__IsActive() === false && L.Na__LeLoad__GetActiveSheet() === null && L.Na__LeLoad__IsDirty() === false && L.Na__LeLoad__GetView() === 'sheet');
        check('before: the tab label of the drawing with a number is its short code and name', before.byId.Sheet_003.tab === 'D03 - Elevations', before.byId.Sheet_003);

        for (const doc of ABSENT_DOCS) {
            const warnsBefore = warnsOf(world).length;
            const opened      = await L[doc.entry]({ view : 'read' });
            await ticks(4);
            check('before: ' + doc.entry + ' (not in this build) resolves false, fetches nothing and puts no screen up', opened === false && world.Editor().length === 0 && !ScreenRoot(world), { opened, loaded : world.Loaded });
            check('before: its refusal says so in the console, once, as a warning', warnsOf(world).length - warnsBefore === 1 && /view yet, so nothing was opened/.test(warnsOf(world).slice(-1)[0] || ''), warnsOf(world));
        }
        if (!ABSENT_DOCS.length) note('every document view is in this build: the refusal cases have nothing to run');

        const earlyReady = L.Na__LeLoad__Ready();
        const early = await Settles(earlyReady);
        check('before: Ready is pending and asking it fetched nothing', early.state === 'pending' && world.Editor().length === 0, early);

        // THE LOAD | a drawing tab is pressed
        let titleDuringLoad = null;
        const entering = L.Na__LeLoad__Enter('Sheet_003');
        await tick();
        const rootDuring = ScreenRoot(world);
        if (rootDuring) titleDuringLoad = (rootDuring.querySelector('.loading-text') || { textContent : null }).textContent;
        const entered = await entering;
        check('the load: the drawing opens', entered === true && world.Called('mode', 'Na__LeMode__Enter').length === 1 && world.Called('mode', 'Na__LeMode__Enter')[0][2][0] === 'Sheet_003');
        check('the load: the six editor entry modules were fetched, nothing unexpected', [ P.mode, P.model, P.spec, P.config, P.viewport3d, P.pdf ].every((rel) => world.Loaded.includes(rel)) && world.Unexpected.length === 0, { loaded : world.Loaded, unexpected : world.Unexpected });
        check('the load: the screen said TrueVision\'s "' + headline + '" while it ran', titleDuringLoad === headline, titleDuringLoad);
        const status = rootDuring ? (rootDuring.querySelector('.na-le-loading__status') || { textContent : null }).textContent : null;
        check('the load: the drawing count reads the veil label\'s words, "Drawing the Views  -  1 of 2"', status === 'Drawing the Views  -  1 of 2', status);
        check('the load: the mode controller was started with the render context', !!world.Context && world.Context.appConfig && typeof world.Context.showToast === 'function');
        check('the load: CheckNames was silent - every copy equals the editor\'s constant', errorsOf(world).length === 0, errorsOf(world));
        check('the load: the stylesheets were linked', world.Page.head.children.filter((c) => c.tagName === 'LINK').length >= 8);
        const settled = await Settles(earlyReady);
        check('the load: the Ready asked before the load resolved true', settled.state === 'resolved' && settled.value === true, settled);
        const lateReady = await Settles(L.Na__LeLoad__Ready());
        check('after: Ready asked now resolves true too - the same answer either side of the load', lateReady.state === 'resolved' && lateReady.value === true, lateReady);
        check('after: the loader announced itself loaded', world.Events.some((e) => e[0] === 'na-layouteditor-loader-changed' && e[1].loaded === true));

        // AFTER | the same questions, answered through the editor where it holds the answer
        const after = Answers(L);
        [ 'order', 'byId', 'features', 'views', 'events', 'offered', 'layout', 'editable', 'probes' ].forEach((key) => {
            check('after: ' + key + ' answers exactly as before the load', JSON.stringify(after[key]) === JSON.stringify(before[key]), { before : before[key], after : after[key] });
        });
        check('after: the questions are now answered by the editor (live records, the open sheet)', world.Called('model', 'Na__LeModel__GetSheets').length > 0 && L.Na__LeLoad__IsActive() === true && L.Na__LeLoad__GetActiveSheet().Sheet__Id === 'Sheet_003');

        for (const doc of ABSENT_DOCS) {
            const callsBefore = world.Calls.length;
            const screenClassesBefore = ScreenRoot(world) ? ScreenRoot(world).className : '';
            const opened = await L[doc.entry]();
            check('after: ' + doc.entry + ' still refuses, the same answer as before the load, and never reaches the editor', opened === false
                && world.Calls.slice(callsBefore).length === 0 && world.Called('mode', doc.real).length === 0, world.Calls.slice(callsBefore));
            check('after: its refusal puts no screen up', (ScreenRoot(world) ? ScreenRoot(world).className : '') === screenClassesBefore);
        }
        check('after: no error on the console for the whole run', errorsOf(world).length === 0, errorsOf(world));
    });

    // ---------------------------------------------------------------
    // G | THE CHECK BITES, THE WORDS FOLLOW THE CONFIG, AND THE FAILURE PATHS
    // ---------------------------------------------------------------
    await RunSection('G. CheckNames bites, the label is the config\'s, and an editor switched off or failing answers Ready false', async () => {
        const planted = await OpenCase({ Block : { LayoutMode : true, Sheets : Sheets() }, Overrides : { Na__LeMode__VIEW_SHEET : 'sheets' } });
        planted.Loader.Na__LeLoad__Initialize(Context(planted));
        await planted.Loader.Na__LeLoad__Require({ quiet : true });
        const planErrors = errorsOf(planted);
        check('a planted mismatch (the editor\'s sheet view renamed "sheets") is reported once, naming the sheet view', planErrors.length === 1 && /the sheet view name is "sheets" but the loader holds "sheet"/.test(planErrors[0]), planErrors);

        const labelled = await OpenCase({ Block : { LayoutMode : true, Sheets : Sheets() }, Labels : Object.assign({}, CONFIG_LABELS, { VeilDrawingViews : 'Your Views Are Being Drawn' }), Progress : [ [ 2, 3 ] ] });
        labelled.Loader.Na__LeLoad__Initialize(Context(labelled));
        await labelled.Loader.Na__LeLoad__Enter('Sheet_001');
        const root = ScreenRoot(labelled);
        const line = root ? (root.querySelector('.na-le-loading__status') || { textContent : null }).textContent : null;
        check('the drawing count follows the editor\'s VeilDrawingViews label when the config sets one', line === 'Your Views Are Being Drawn  -  2 of 3', line);

        const off = await OpenCase({ Block : { LayoutMode : true, Sheets : Sheets() }, InitResult : false, ConfigEnabled : false });
        off.Loader.Na__LeLoad__Initialize(Context(off));
        const offEarly = off.Loader.Na__LeLoad__Ready();
        const offEntered = await off.Loader.Na__LeLoad__Enter('Sheet_001');
        const offEarlySettled = await Settles(offEarly);
        const offLate = await Settles(off.Loader.Na__LeLoad__Ready());
        check('editor off in its config: the drawing does not open and the reader is told', offEntered === false && off.Toasts.some((t) => /switched off/.test(t[0])), { offEntered, toasts : off.Toasts });
        check('editor off in its config: Ready resolves false, asked before the load or after', offEarlySettled.state === 'resolved' && offEarlySettled.value === false && offLate.state === 'resolved' && offLate.value === false, { offEarlySettled, offLate });
        check('editor off in its config: it is no longer offered', off.Loader.Na__LeLoad__IsAvailable() === false);

        const failing = await OpenCase({ Block : { LayoutMode : true, Sheets : Sheets() }, FailEvaluate : 'mode' });
        failing.Loader.Na__LeLoad__Initialize(Context(failing));
        const failEarly = failing.Loader.Na__LeLoad__Ready();
        const failEntered = await failing.Loader.Na__LeLoad__Enter('Sheet_001');
        const failSettled = await Settles(failEarly);
        const failRoot = ScreenRoot(failing);
        check('a load that fails: nothing opens and the screen shows its error state', failEntered === false && !!failRoot && failRoot.classList.contains('loading-overlay--error'), { failEntered, classes : failRoot && failRoot.className });
        check('a load that fails: the Ready asked before it resolves false', failSettled.state === 'resolved' && failSettled.value === false, failSettled);
        check('a load that fails: the reason is on the console', errorsOf(failing).some((e) => /failed to load/.test(e)), errorsOf(failing));
    });

    consoleSink = null;
    try { rmSync(SCRATCH, { recursive : true, force : true }); } catch (error) { /* the OS cleans its temp folder */ }
    realConsole.log(failures === 0 ? '\n  PASS - every check passed (' + passes + ').' : '\n  FAIL - ' + failures + ' check(s) failed, ' + passes + ' passed.');
    process.exit(failures === 0 ? 0 : 1);

// endregion -------------------------------------------------------------------
