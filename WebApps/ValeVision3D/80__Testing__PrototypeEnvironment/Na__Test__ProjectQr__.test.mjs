// =============================================================================
// VALEVISION3D - TEST - PROJECT QR CODE
// =============================================================================
//
// FILE       : Na__Test__ProjectQr__.test.mjs
// NAMESPACE  : Na__Test
// MODULE     : Project QR Code Test
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Prove the QR encoder against a decoder written separately from it, and prove that the shipped config prints a code a phone can read and that every project's code resolves
// CREATED    : 20-Sep-2026
//
// DESCRIPTION:
// - THE ENCODER IS READ BACK BY A DECODER THAT SHARES NO CODE WITH IT. This file
//   carries its own: it rebuilds the function pattern map from ISO/IEC 18004,
//   checks the format information's BCH codeword, unmasks, walks the zigzag,
//   de-interleaves the blocks, requires every Reed-Solomon syndrome to be zero
//   (the codeword evaluated at each root - not the encoder's long division run
//   again) and parses the byte mode payload. Every version from 1 to 10 has to
//   come back as the exact string that went in, at the longest and the
//   shortest payload the version takes.
// - THE SHIPPED CONFIG IS HELD TO ITS OWN FLOOR. The title block's code is the
//   strip's height less the quiet zone, so the module a drawing prints is
//   decided by three numbers in two config files. They are read here as
//   shipped: a version 3 code - the size TrueVision prints - must clear
//   MinModuleMm, and the longer addresses ValeVision could print (the
//   candidate resolver DR-12 names, the address bar's token) are shown under
//   it - which is the guard the config says it is.
// - NO PROJECT'S CODE CAN RESOLVE YET, SO NONE IS PRINTED. ValeVision ships
//   the system switched off with no address and no resolver index (DR-12);
//   section 4 holds both switches off and checks that no master-index entry
//   has a key yet. Package W5-05 builds the resolver and rewrites that
//   section to hold its index to the project folders, as TrueVision's does.
// - VALEVISION'S SEAMS (section 7): with the config unreadable - missing, or
//   answered by the app's page - the system is off and GetSymbol answers no
//   symbol (it fails closed), and the link reads the project from the master
//   index - its folder, its four-digit year and its permanent key - never
//   from the address bar's ?project= token.
// - The encoder, the painter and the link builder import nothing the app
//   boots, so they run here exactly as the app runs them. Node 20 reads the
//   app's .js modules as CommonJS, so they are copied to temporary .mjs files.
//   ValeVision's project loader imports its resilient fetch helper, so that
//   goes across too.
//
// USAGE:
//     node 80__Testing__PrototypeEnvironment/Na__Test__ProjectQr__.test.mjs
//     node 80__Testing__PrototypeEnvironment/Na__Test__ProjectQr__.test.mjs --dump <file.json>
//
//   Exit 0 = every check passed. Exit 1 = at least one did not.
//   --dump writes every encoded case (text and modules) for
//   Na__Test__ProjectQr__Decode__.py, which reads them back with OpenCV.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__ProjectQr__.test.mjs
// - Source version: 1.1.0 (TrueVision3D v2.120.0, 21-Sep-2026; its staging made depth-proof by v2.155.0,
//                   23-Sep-2026; read at HEAD b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D v2.71.2 (package W5-05 rewrites section 4 once the
//                   Vale resolver exists)
// - Parity        : adapted - sections 1, 5 and 6 are TrueVision's checks; 2 to 4 were built on
//                   TrueVision's own printed address and resolver, which ValeVision does not ship;
//                   7 is ValeVision's
// - Divergences   :
//   - Banner reads ValeVision3D.
//   - Section 2: the shipped config builds no address (switched off, empty base: DR-12 (A)).
//     TrueVision's address rules are proved on the address DR-12 names as Vale's candidate (a q/
//     page on ValeCodebase's GitHub Pages; shipped nowhere, nothing resolves it yet): 52 bytes,
//     version 4. The address bar's ?project= token as the key is shown to be version 5. A 42 byte
//     address (version 3, TrueVision's printed size) is the reference symbol sections 3 and 5 use.
//   - Section 3: the floor holds the version 3 reference; the Vale candidate and the token form
//     are shown under it.
//   - Section 4: TrueVision's q/index.json against its project portal is not run - ValeVision has
//     no resolver index. Both switches, the empty addresses and the master index's (absent) keys
//     are held instead, and the index check prints skip until W5-05.
//   - Section 5 paints the reference symbol, where TrueVision paints its own project's code.
//   - Section 7 is new: the fail-closed seam and ValeVision's project identity (S07a-V02, DR-12).
//   - The project loader is staged with its resilient fetch helper (ValeVision's imports it,
//     S07a-F52); the master index's path and the config's IndexUrl are read beside the others.
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 21-Sep-2026 - Version 1.1.0
// - Section 6, the colours: the title block's code is black and the Project
//   Portal block's hsl(0, 0%, 35%), both held to 70 per cent symbol contrast
//   against the light colour, and the Symbol module's built-in fallbacks held
//   to the file by loading it once with the config and once without.
//
// 20-Sep-2026 - Version 1.0.0
// - Written with the Project QR Code system.
//
// =============================================================================

import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';


// -----------------------------------------------------------------------------
// REGION | The Modules Under Test and Their Config
// -----------------------------------------------------------------------------

    const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
    const APP        = resolve(SCRIPT_DIR, '..');
    const MODULES    = join(APP, '02__Src__AppModules');
    const QR_DIR     = join(MODULES, '51__System__LayoutEditor', '53__Feature__ProjectQrCode');
    const REPO_ROOT  = resolve(APP, '..', '..');
    const SCRATCH    = mkdtempSync(join(tmpdir(), 'na-projectqr-'));

    // The link builder imports the project loader, so both go across with the
    // specifier between them rewritten; nothing either does at import time
    // touches a browser.
    const copyAs = (sourcePath, name, rewrite) => {
        let source = readFileSync(sourcePath, 'utf8');
        if (rewrite) source = rewrite(source);
        writeFileSync(join(SCRATCH, name), source, 'utf8');
        return pathToFileURL(join(SCRATCH, name)).href;
    };
    const encoder = await import(copyAs(join(QR_DIR, 'Na__ProjectQr__Encoder__.js'), 'Encoder.mjs'));
    const painter = await import(copyAs(join(QR_DIR, 'Na__ProjectQr__Painter__.js'), 'Painter.mjs'));
    // ValeVision's project loader imports its resilient fetch helper, which
    // goes across with it the same way (the helper imports nothing).
    copyAs(join(MODULES, '03__AppUtils', 'Na__AppUtils__ResilientLoad__.js'), 'ResilientLoad.mjs');
    copyAs(join(MODULES, '03__AppUtils', 'Na__AppUtils__ProjectLoader.js'), 'ProjectLoader.mjs',
        (source) => source.replace(/'\.\/Na__AppUtils__ResilientLoad__\.js'/, "'./ResilientLoad.mjs'"));
    const linker  = await import(copyAs(join(QR_DIR, 'Na__ProjectQr__ProjectLink__.js'), 'ProjectLink.mjs',
        // MATCHED WITHOUT ITS DEPTH, deliberately. This was an exact string once -
        // '../03__AppUtils/...' - and moving the QR system one folder deeper
        // (23-Sep-2026) turned it into '../../03__AppUtils/...', so the rewrite
        // silently stopped matching and the staged copy reached out of the temp
        // directory for a file that was never there. Any number of leading ../
        // now matches, so the next move cannot break this.
        (source) => source.replace(/'(?:\.\.\/)+03__AppUtils\/Na__AppUtils__ProjectLoader\.js'/, "'./ProjectLoader.mjs'")));

    const qrConfig    = JSON.parse(readFileSync(join(QR_DIR, 'Na__ProjectQr__Config__.json'), 'utf8'));
    const titleConfig = JSON.parse(readFileSync(join(MODULES, '51__System__LayoutEditor', '03__Core__Config', 'Na__LayoutEditor__AppConfig__.json'), 'utf8'))['LayoutEditor__TitleBlock__Config'];
    const LINK        = { baseUrl : qrConfig['ProjectQr__Link__Config']['ProjectQr__Link__BaseUrl'], queryPattern : qrConfig['ProjectQr__Link__Config']['ProjectQr__Link__QueryPattern'] };
    const QUIET       = qrConfig['ProjectQr__Symbol__Config']['ProjectQr__Symbol__QuietZoneModules'];
    const MIN_MODULE  = qrConfig['ProjectQr__Symbol__Config']['ProjectQr__Symbol__MinModuleMm'];
    const STRIP_MM    = titleConfig['LayoutEditor__TitleBlock__HeightMm'];
    const INDEX_URL   = qrConfig['ProjectQr__Link__Config']['ProjectQr__Link__IndexUrl'];
    const MASTER_INDEX = join(REPO_ROOT, 'WebApps', 'Whitecardopedia', '02__Src__AppModules', '03__AppData', 'Na__MasterIndex__ProjectLocations__.json');

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Check Harness
// -----------------------------------------------------------------------------

    let passed = 0;
    let failed = 0;
    function check(name, condition, detail) {
        if (condition) { passed++; console.log('  ok    ' + name); return; }
        failed++;
        console.log('  FAIL  ' + name + (detail !== undefined ? '\n        ' + detail : ''));
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | A Decoder That Shares Nothing With the Encoder
// -----------------------------------------------------------------------------

    // ISO/IEC 18004, level M, versions 1 to 10: [ ecPerBlock, blocks1, data1, blocks2, data2 ]
    const SPEC_BLOCKS = [ null, [ 10, 1, 16, 0, 0 ], [ 16, 1, 28, 0, 0 ], [ 26, 1, 44, 0, 0 ], [ 18, 2, 32, 0, 0 ], [ 24, 2, 43, 0, 0 ],
                          [ 16, 4, 27, 0, 0 ], [ 18, 4, 31, 0, 0 ], [ 22, 2, 38, 2, 39 ], [ 22, 3, 36, 2, 37 ], [ 26, 4, 43, 1, 44 ] ];
    const SPEC_ALIGN  = [ null, [], [ 6, 18 ], [ 6, 22 ], [ 6, 26 ], [ 6, 30 ], [ 6, 34 ], [ 6, 22, 38 ], [ 6, 24, 42 ], [ 6, 26, 46 ], [ 6, 28, 50 ] ];

    // GF(256) over x^8 + x^4 + x^3 + x^2 + 1, built here rather than borrowed
    const GF_EXP = new Array(512), GF_LOG = new Array(256);
    for (let i = 0, x = 1; i < 255; i++) { GF_EXP[i] = x; GF_LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11D; }
    for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
    const gfMul = (a, b) => (a === 0 || b === 0) ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]];

    // Which modules carry no data, straight from the specification's geometry
    function functionMap(version) {
        const size = 17 + (4 * version);
        const map  = Array.from({ length : size }, () => new Array(size).fill(false));
        const fill = (r0, c0, rows, cols) => { for (let r = r0; r < r0 + rows; r++) for (let c = c0; c < c0 + cols; c++) if (r >= 0 && c >= 0 && r < size && c < size) map[r][c] = true; };
        fill(0, 0, 9, 9); fill(0, size - 8, 9, 8); fill(size - 8, 0, 8, 9);           // finders, separators and the format information beside them
        fill(6, 0, 1, size); fill(0, 6, size, 1);                                     // timing
        const centres = SPEC_ALIGN[version], last = centres.length - 1;
        centres.forEach((rowCentre, i) => centres.forEach((colCentre, j) => {
            if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
            fill(rowCentre - 2, colCentre - 2, 5, 5);
        }));
        if (version >= 7) { fill(0, size - 11, 6, 3); fill(size - 11, 0, 3, 6); }     // version information
        return map;
    }

    const MASKS = [ (r, c) => (r + c) % 2 === 0, (r) => r % 2 === 0, (r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0,
                    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
                    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0, (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0 ];

    // Returns { text, mask } or throws with the reason the symbol does not read
    function decode(modules, version) {
        const size = 17 + (4 * version);
        if (modules.length !== size) throw new Error('matrix is ' + modules.length + ' across, version ' + version + ' is ' + size);

        // FORMAT INFORMATION | fifteen bits, a BCH(15,5) codeword under a fixed mask
        let format = 0;
        for (let i = 0; i < 15; i++) {
            const bit = i < 6 ? modules[i][8] : i < 8 ? modules[i + 1][8] : i === 8 ? modules[8][7] : modules[8][14 - i];
            if (bit) format |= (1 << i);
        }
        let second = 0;
        for (let i = 0; i < 15; i++) { const bit = i < 8 ? modules[8][size - 1 - i] : modules[size - 15 + i][8]; if (bit) second |= (1 << i); }
        if (second !== format) throw new Error('the two copies of the format information differ');
        format ^= 0x5412;
        let remainder = format;
        for (let bit = 14; bit >= 10; bit--) if (remainder & (1 << bit)) remainder ^= (0x537 << (bit - 10));
        if (remainder !== 0) throw new Error('the format information is not a BCH codeword');
        if (((format >> 13) & 3) !== 0) throw new Error('the format information does not say level M');
        const mask = (format >> 10) & 7;

        // VERSION INFORMATION | eighteen bits, a BCH(18,6) codeword, from version 7
        if (version >= 7) {
            let info = 0;
            for (let i = 0; i < 18; i++) if (modules[Math.floor(i / 3)][size - 11 + (i % 3)]) info |= (1 << i);
            let other = 0;
            for (let i = 0; i < 18; i++) if (modules[size - 11 + (i % 3)][Math.floor(i / 3)]) other |= (1 << i);
            if (other !== info) throw new Error('the two copies of the version information differ');
            let rest = info;
            for (let bit = 17; bit >= 12; bit--) if (rest & (1 << bit)) rest ^= (0x1F25 << (bit - 12));
            if (rest !== 0) throw new Error('the version information is not a BCH codeword');
            if ((info >> 12) !== version) throw new Error('the version information says ' + (info >> 12));
        }
        if (!modules[(4 * version) + 9][8]) throw new Error('the dark module is light');

        // THE ZIGZAG | unmasked as it is read
        const isFunction = functionMap(version);
        const bits = [];
        let upward = true;
        for (let col = size - 1; col > 0; col -= 2) {
            if (col === 6) col--;
            for (let step = 0; step < size; step++) {
                const r = upward ? size - 1 - step : step;
                for (let pair = 0; pair < 2; pair++) {
                    const c = col - pair;
                    if (isFunction[r][c]) continue;
                    bits.push((modules[r][c] !== MASKS[mask](r, c)) ? 1 : 0);
                }
            }
            upward = !upward;
        }

        // BLOCKS | de-interleaved, and every Reed-Solomon syndrome must be zero
        const [ ecPerBlock, n1, d1, n2, d2 ] = SPEC_BLOCKS[version];
        const total = (n1 * (d1 + ecPerBlock)) + (n2 * (d2 + ecPerBlock));
        if (bits.length < total * 8) throw new Error('only ' + bits.length + ' data modules for ' + (total * 8) + ' bits');
        const codewords = [];
        for (let i = 0; i < total; i++) { let value = 0; for (let b = 0; b < 8; b++) value = (value << 1) | bits[(i * 8) + b]; codewords.push(value); }

        const sizes  = [ ...new Array(n1).fill(d1), ...new Array(n2).fill(d2) ];
        const blocks = sizes.map(() => []);
        let cursor = 0;
        for (let i = 0; i < Math.max(d1, d2); i++) sizes.forEach((dataSize, b) => { if (i < dataSize) blocks[b].push(codewords[cursor++]); });
        for (let i = 0; i < ecPerBlock; i++) blocks.forEach((block) => block.push(codewords[cursor++]));

        blocks.forEach((block, index) => {
            for (let root = 0; root < ecPerBlock; root++) {
                let syndrome = 0;
                for (let j = 0; j < block.length; j++) syndrome = gfMul(syndrome, GF_EXP[root]) ^ block[j];
                if (syndrome !== 0) throw new Error('block ' + index + ' fails Reed-Solomon at root ' + root);
            }
        });

        // THE PAYLOAD | byte mode
        const data = [];
        blocks.forEach((block, b) => block.slice(0, sizes[b]).forEach((value) => data.push(value)));
        const stream = [];
        data.forEach((value) => { for (let b = 7; b >= 0; b--) stream.push((value >> b) & 1); });
        const take = (count) => { let value = 0; for (let i = 0; i < count; i++) value = (value << 1) | stream.shift(); return value; };
        if (take(4) !== 4) throw new Error('the payload is not byte mode');
        const length = take(version >= 10 ? 16 : 8);
        const bytes  = [];
        for (let i = 0; i < length; i++) bytes.push(take(8));
        return { text : Buffer.from(bytes).toString('utf8'), mask : mask };
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | 1. Every Version Reads Back
// -----------------------------------------------------------------------------

    console.log('\n1. Every version from 1 to 10 reads back through the separate decoder');

    const CAPACITY = [ 0, 14, 26, 42, 62, 84, 106, 122, 152, 180, 213 ];
    const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_./?=&';
    const payload  = (length, seed) => { let text = 'https://x.io/', k = seed; while (text.length < length) { k = ((k * 1103515245) + 12345) >>> 0; text += ALPHABET[k % ALPHABET.length]; } return text.slice(0, length); };
    const dump     = [];
    const masksHit = new Set();

    for (let version = 1; version <= 10; version++) {
        [ [ 'longest', CAPACITY[version], 7 * version ], [ 'shortest', CAPACITY[version - 1] + 1, 13 * version ] ].forEach(([ label, length, seed ]) => {
            const text   = payload(length, seed);
            const symbol = encoder.Na__QrEnc__Encode(text);
            let result = null, why = '';
            try { result = decode(symbol.Modules, symbol.Version); } catch (error) { why = error.message; }
            if (result) masksHit.add(result.mask);
            const rebuilt = symbol.Modules.map((row) => row.map(() => false));
            symbol.Runs.forEach((run) => { for (let i = 0; i < run.Length; i++) rebuilt[run.Row][run.Col + i] = true; });
            check('version ' + version + ', ' + label + ' payload (' + length + ' bytes)',
                  symbol.Version === version && symbol.Size === 17 + (4 * version) && !!result && result.text === text &&
                  JSON.stringify(rebuilt) === JSON.stringify(symbol.Modules),
                  why || ('version ' + symbol.Version + ', read back "' + (result ? result.text.slice(0, 40) : '') + '"'));
            dump.push({ name : 'v' + version + '-' + label, text : text, version : symbol.Version, size : symbol.Size, modules : symbol.Modules.map((row) => row.map((m) => (m ? 1 : 0)).join('')) });
        });
    }
    check('the cases between them exercise more than one mask (' + [ ...masksHit ].sort().join(', ') + ')', masksHit.size >= 3);

    const accented = 'https://example.com/café/€/🏠?q=1';
    const accentedSymbol = encoder.Na__QrEnc__Encode(accented);
    check('accents, a euro sign and an emoji go through as UTF-8', decode(accentedSymbol.Modules, accentedSymbol.Version).text === accented);

    const quiet = console.error; console.error = () => {};
    const tooLong = encoder.Na__QrEnc__Encode(payload(214, 3));
    console.error = quiet;
    check('214 bytes is refused rather than truncated', tooLong === null);
    check('an empty string is refused', encoder.Na__QrEnc__Encode('') === null);

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | 2. The Address a Drawing Carries
// -----------------------------------------------------------------------------

    console.log('\n2. The address a drawing carries: none from the shipped config, and the rules a Vale address will follow');

    const shippedUrl = linker.Na__QrLink__BuildUrl(LINK, { projectCode : 'any-key', projectFolder : '3047__Doous', year : '2026' });
    check('the shipped config builds no address, even for a project with every token: there is no Vale resolver yet (BaseUrl empty, DR-12 (A))',
          LINK.baseUrl === '' && shippedUrl === '');

    // TrueVision proves the rules below on the address it prints. ValeVision
    // prints none yet, so they are proved on the address DR-12 names as the
    // Vale candidate: a q/ page on ValeCodebase's GitHub Pages, beside the
    // Lantern Designer's t/ terms resolver. Nothing resolves it yet and it is
    // shipped nowhere; 3047 stands in for the permanent key W5-05 is to write.
    const CANDIDATE = { baseUrl : 'https://adam-noble-01.github.io/ValeCodebase/q/', queryPattern : LINK.queryPattern };
    const vale      = linker.Na__QrLink__BuildUrl(CANDIDATE, { projectCode : '3047', projectFolder : '3047__Doous', year : '2026' });
    const valeSym   = encoder.Na__QrEnc__Encode(vale);
    check('a Vale key 3047 at the candidate is ' + vale, vale === 'https://adam-noble-01.github.io/ValeCodebase/q/?3047');
    check('which is 52 bytes, ten over the 42 a version 3 symbol holds: version 4, 33 modules', Buffer.byteLength(vale) === 52 && valeSym.Version === 4 && valeSym.Size === 33);
    check('and reads back through the decoder', decode(valeSym.Modules, 4).text === vale);
    check('it is never the address bar: no localhost in it', !/localhost|127\.0\.0\.1/.test(vale));
    check('a project with no code draws no address', linker.Na__QrLink__BuildUrl(CANDIDATE, { projectCode : '', projectFolder : 'X', year : '2026' }) === '');
    check('a code is URL-encoded, not pasted', linker.Na__QrLink__BuildUrl(CANDIDATE, { projectCode : 'A B&', projectFolder : 'X', year : '2026' }).endsWith('?A%20B%26'));

    // THE KEY IS NEVER THE ADDRESS BAR'S TOKEN. Whitecardopedia opens a project
    // with its whole folder id, which a rename changes.
    const tokenUrl = linker.Na__QrLink__BuildUrl(CANDIDATE, { projectCode : '2026/57994__Harris__Scheme-02', projectFolder : '57994__Harris__Scheme-02', year : '2026' });
    const tokenSym = encoder.Na__QrEnc__Encode(tokenUrl);
    check('keyed by the address bar\'s ?project= token it would be ' + Buffer.byteLength(tokenUrl) + ' bytes: version 5, 37 modules', tokenSym.Version === 5 && tokenSym.Size === 37);

    // THE REFERENCE SYMBOL. A 42 byte address - the size TrueVision prints,
    // exactly what version 3 holds - built the way section 1 builds its cases.
    // Section 3 measures it and section 5 paints it.
    const refText = payload(CAPACITY[3], 42);
    const refSym  = encoder.Na__QrEnc__Encode(refText);
    check('a 42 byte address is a version 3 symbol, 29 modules, and reads back', refSym.Version === 3 && refSym.Size === 29 && decode(refSym.Modules, 3).text === refText);
    dump.push({ name : 'Vale-candidate', text : vale, version : valeSym.Version, size : valeSym.Size, modules : valeSym.Modules.map((row) => row.map((m) => (m ? 1 : 0)).join('')) });
    dump.push({ name : 'Ref-42-bytes', text : refText, version : refSym.Version, size : refSym.Size, modules : refSym.Modules.map((row) => row.map((m) => (m ? 1 : 0)).join('')) });

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | 3. The Title Block Against the Floor
// -----------------------------------------------------------------------------

    console.log('\n3. The shipped title block against the shipped floor');

    // The title block's rule (Na__LayoutEditor__TitleBlock__QrCell__): N + 2q modules share the strip's height
    const printed = (modules) => STRIP_MM / (modules + (QUIET * 2));
    const moduleMm = printed(refSym.Size);
    check('strip ' + STRIP_MM + ' mm, quiet zone ' + QUIET + ' modules: a version 3 code is ' + (moduleMm * refSym.Size).toFixed(2) + ' mm at ' + moduleMm.toFixed(3) + ' mm a module',
          Math.abs((moduleMm * refSym.Size) - 8.79) < 0.01 && Math.abs(moduleMm - 0.303) < 0.001);
    check('which clears the ' + MIN_MODULE + ' mm floor', moduleMm >= MIN_MODULE);

    check('the Vale candidate is version 4 at ' + printed(valeSym.Size).toFixed(3) + ' mm, which does NOT - so the guard would say so (DR-12 pairs that address with a 0.265 mm floor)',
          valeSym.Version === 4 && printed(valeSym.Size) < MIN_MODULE);
    check('keyed by the token it would print ' + printed(tokenSym.Size).toFixed(3) + ' mm, under it too', printed(tokenSym.Size) < MIN_MODULE);
    check('TrueVision\'s full app address in the same strip would have printed ' + printed(49).toFixed(3) + ' mm, far under it', printed(49) < MIN_MODULE);

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | 4. No Project's Code Can Resolve Yet, So None Is Printed
// -----------------------------------------------------------------------------

    console.log('\n4. ValeVision ships the code switched off: no resolver, no index, no keys');

    check('ProjectQr__Enabled is false as shipped (DR-12 (A))', qrConfig['ProjectQr__Enabled'] === false);
    check('and the title block\'s own switch, LayoutEditor__TitleBlock__QrCellEnabled, is false as well', titleConfig['LayoutEditor__TitleBlock__QrCellEnabled'] === false);
    check('there is no resolver to point at: the base address and the index address are both empty', LINK.baseUrl === '' && INDEX_URL === '');

    if (existsSync(MASTER_INDEX)) {
        const entries = JSON.parse(readFileSync(MASTER_INDEX, 'utf8').replace(/^\uFEFF/, '')).projects || [];
        const keyed   = entries.filter((entry) => entry && entry.qrKey !== undefined && entry.qrKey !== null && String(entry.qrKey).trim() !== '');
        check(entries.length + ' master-index entries, none with a resolver key yet, so no project has a code to print',
              entries.length > 0 && keyed.length === 0, 'keyed already: ' + keyed.map((entry) => entry.folderId).join(', ') + ' - package W5-05 owns this section once the keys exist');
    } else {
        console.log('  skip  the Whitecardopedia master index is not beside this repository copy');
    }
    console.log('  skip  the resolver\'s index against the project folders: ValeVision has no QR resolver yet (DR-12); package W5-05 builds it and rewrites this section');

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | 5. The Painter
// -----------------------------------------------------------------------------

    console.log('\n5. One path on every surface');

    const group = painter.Na__QrPaint__SvgGroup(refSym, 100, 200, 8.7879, '#000000', '#ffffff');
    check('SVG: one path holding every run (' + refSym.Runs.length + '), crisp edged, light square first',
          (group.match(/<path /g) || []).length === 1 && (group.match(/M\d/g) || []).length === refSym.Runs.length &&
          /shape-rendering="crispEdges"/.test(group) && group.indexOf('<rect') < group.indexOf('<path'));
    check('SVG: a colour that is not a colour cannot get through', /fill="#000000"/.test(painter.Na__QrPaint__SvgGroup(refSym, 0, 0, 10, 'url(#x)', null)));

    const page = painter.Na__QrPaint__SvgDocument(refSym, { title : 'Scan' });
    check('HTML: the viewBox carries four modules of quiet zone on every side', page.indexOf('viewBox="0 0 37 37"') !== -1);

    const calls = [];
    const fakeDoc = { setFillColor : (...a) => calls.push([ 'colour', ...a ]), rect : (...a) => calls.push([ 'rect', ...a ]), fill : () => calls.push([ 'fill' ]) };
    painter.Na__QrPaint__DrawPdf(fakeDoc, refSym, 10, 20, 8.7879, '#000000', '#ffffff');
    const rects = calls.filter((c) => c[0] === 'rect');
    check('PDF: the light square is painted, every run joins ONE path, and fill() paints it once',
          rects.length === refSym.Runs.length + 1 && rects[0][5] === 'F' && rects.slice(1).every((c) => c[5] === null) &&
          calls.filter((c) => c[0] === 'fill').length === 1 && calls[calls.length - 1][0] === 'fill');

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | 6. The Colours a Code Is Painted In
// -----------------------------------------------------------------------------

    console.log('\n6. Black for a document\'s own code, a softer grey for the Portal block\'s');

    // SYMBOL CONTRAST, ISO/IEC 15415: the light reflectance less the dark, with
    // each colour's relative luminance standing in for what the paper and the
    // ink send back. 70 per cent and over is grade A. A phone reads far less
    // than that; the floor is here so that nobody softens a code by eye until
    // it quietly stops reading.
    const SYMBOL_CONFIG = qrConfig['ProjectQr__Symbol__Config'];
    const luminance = (hex) => {
        const channel = (at) => {
            const value = parseInt(hex.substring(at, at + 2), 16) / 255;
            return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
        };
        return (0.2126 * channel(1)) + (0.7152 * channel(3)) + (0.0722 * channel(5));
    };
    const LIGHT_HEX  = SYMBOL_CONFIG['ProjectQr__Symbol__LightColour'];
    const DARK_HEX   = SYMBOL_CONFIG['ProjectQr__Symbol__DarkColour'];
    const PORTAL_HEX = SYMBOL_CONFIG['ProjectQr__Symbol__PortalDarkColour'];
    const contrastOf = (hex) => luminance(LIGHT_HEX) - luminance(hex);
    const GREY_35    = '#' + Math.round(0.35 * 255).toString(16).padStart(2, '0').repeat(3);   // <-- hsl(0, 0%, 35%): no saturation, so every channel is the lightness
    check('a document\'s own code - the title block\'s - is still black', DARK_HEX === '#000000');
    check('the Portal block\'s code is hsl(0, 0%, 35%), which is ' + GREY_35 + ' (Adam, 21-Sep-2026)', PORTAL_HEX === GREY_35 && GREY_35 === '#595959');
    [ [ 'the black', DARK_HEX ], [ 'the Portal grey', PORTAL_HEX ] ].forEach(([ label, hex ]) => {
        const valid = /^#[0-9a-fA-F]{6}$/.test(String(hex)) && /^#[0-9a-fA-F]{6}$/.test(String(LIGHT_HEX));
        check(label + ' against the light colour is ' + (valid ? Math.round(contrastOf(hex) * 100) : '?') + ' per cent symbol contrast, over the 70 of grade A',
              valid && contrastOf(hex) >= 0.70);
    });

    // THE BUILT-IN FALLBACKS ARE THE FILE'S. The Symbol module is loaded twice:
    // once with the config unreadable, once with it served. A fallback that had
    // drifted from the file would bring the black back to the Portal block on
    // any page whose config fetch failed.
    const qrSource   = readFileSync(join(QR_DIR, 'Na__ProjectQr__Symbol__.js'), 'utf8')
        .replace("'./Na__ProjectQr__Encoder__.js'", "'./Encoder.mjs'")
        .replace("'./Na__ProjectQr__ProjectLink__.js'", "'./ProjectLink.mjs'")
        .replace(/'(?:\.\.\/)+03__AppUtils\/Na__AppUtils__ProjectLoader\.js'/, "'./ProjectLoader.mjs'");   // <-- Depth-proof: see the note at the first staging site
    writeFileSync(join(SCRATCH, 'Symbol.mjs'), qrSource, 'utf8');
    const realFetch = globalThis.fetch;
    const realWarn  = console.warn;
    const setupWith = async (served, tag) => {
        globalThis.fetch = async () => served ? { ok : true, status : 200, json : async () => qrConfig } : { ok : false, status : 404 };
        console.warn = () => {};                                                // <-- The unreadable load says so on the console, which is its job, not this run's
        const module = await import(pathToFileURL(join(SCRATCH, 'Symbol.mjs')).href + '?' + tag);
        const landed = await module.Na__ProjectQr__Ready();
        console.warn = realWarn;
        return { landed : landed, symbol : module.Na__ProjectQr__GetSetup().symbol };
    };
    const fromFile     = await setupWith(true,  'file');
    const fromFallback = await setupWith(false, 'fallback');
    globalThis.fetch = realFetch;
    check('GetSetup hands the Portal grey out as symbol.portalDarkColour, and the black as symbol.darkColour',
          fromFile.landed === true && fromFile.symbol.portalDarkColour === PORTAL_HEX && fromFile.symbol.darkColour === DARK_HEX, fromFile.symbol);
    check('with the config unreadable, the built-in fallbacks give the same two colours',
          fromFallback.landed === false && fromFallback.symbol.portalDarkColour === PORTAL_HEX && fromFallback.symbol.darkColour === DARK_HEX &&
          fromFallback.symbol.lightColour === LIGHT_HEX, fromFallback.symbol);

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | 7. ValeVision's Seams: No Config, No Code; the Project Is the Master Index's
// -----------------------------------------------------------------------------

    console.log('\n7. ValeVision\'s seams: a config that cannot be read draws no code, and the project comes from the master index');

    // THE PAGE AND THE INDEX. The authoring machine showing 2026/3047__Doous,
    // and the master index the project loader reads, its Doous entry given a
    // stand-in for the permanent key W5-05 is to write (no real entry has one
    // yet) and its Gill entry left without. The loader is the staged copy the
    // link and the Symbol modules import, so all three share one index.
    const VALE_KEY    = 'test-key-3047';
    const MASTER      = { projects : [
        { folderId : '2026/3047__Doous', year : '2026', projectCode : '3047',  name : 'Doous', enabled : true, qrKey : VALE_KEY },
        { folderId : '2026/44371__Gill', year : '2026', projectCode : '44371', name : 'Gill',  enabled : true }
    ] };
    const SWITCHED_ON = JSON.parse(JSON.stringify(qrConfig));
    SWITCHED_ON['ProjectQr__Enabled'] = true;
    SWITCHED_ON['ProjectQr__Link__Config']['ProjectQr__Link__BaseUrl'] = 'https://qr.example.test/q/';   // <-- A test resolver: .test is reserved and names no host anywhere
    let   configAnswer = null;                                                  // <-- What the config fetch is answered with: a config, 'missing' or 'page'
    const answer = (status, body) => ({ ok : status === 200, status : status, json : async () => {
        if (body === undefined) throw new SyntaxError('Unexpected token \'<\', "<!DOCTYPE "... is not valid JSON');
        return JSON.parse(JSON.stringify(body));
    } });
    globalThis.fetch = async (url) => {
        const href = String(url);
        if (href.indexOf('Na__MasterIndex__ProjectLocations__') !== -1) return answer(200, MASTER);
        if (href.indexOf('Na__ProjectQr__Config__.json') !== -1) {
            if (configAnswer === 'missing') return answer(404, null);
            if (configAnswer === 'page')    return answer(200, undefined);      // <-- A server answering a missing file with the app's page: 200, and not JSON
            return answer(200, configAnswer);
        }
        return answer(404, null);
    };
    const showing    = (search) => { globalThis.window = { location : { search : search, hostname : 'localhost', port : '8000', origin : 'http://localhost:8000' } }; };
    const settle     = () => new Promise((done) => setTimeout(done, 0));
    const symbolWith = async (config, tag) => {
        configAnswer = config;
        console.warn = () => {};                                                // <-- An unreadable load says so on the console, which is its job, not this run's
        const module = await import(pathToFileURL(join(SCRATCH, 'Symbol.mjs')).href + '?' + tag);
        const landed = await module.Na__ProjectQr__Ready();
        console.warn = realWarn;
        return { module : module, landed : landed };
    };
    const loader = await import(pathToFileURL(join(SCRATCH, 'ProjectLoader.mjs')).href);

    showing('?project=2026/3047__Doous');
    const unsettled = linker.Na__QrLink__CurrentProject();
    check('before the loader\'s master index has settled nothing is known - no folder, no year, no key: never a guess',
          unsettled.projectCode === '' && unsettled.projectFolder === '' && unsettled.year === '', unsettled);

    await loader.Na__AppUtils__InitMasterIndex();
    const pageLink = await import(pathToFileURL(join(SCRATCH, 'ProjectLink.mjs')).href + '?page');   // <-- The link as a page loads it, with the project already found
    await settle();
    const doous = pageLink.Na__QrLink__CurrentProject();
    check('on ?project=2026/3047__Doous the link reads folder 3047__Doous and year 2026 from the master index, and the entry\'s permanent key as the code - not the token',
          doous.projectFolder === '3047__Doous' && doous.year === '2026' && doous.projectCode === VALE_KEY, doous);

    void linker.Na__QrLink__CurrentProject();                                  // <-- The copy the Symbol module shares was loaded before there was a page: it reads the index on its first call
    await settle();

    const missing      = await symbolWith('missing', 'missing');
    const missingSetup = missing.module.Na__ProjectQr__GetSetup();
    check('config missing (404): nothing landed and the system is OFF - no address and no symbol, though the project on screen has a key',
          missing.landed === false && missing.module.Na__ProjectQr__IsEnabled() === false && missingSetup.enabled === false &&
          missing.module.Na__ProjectQr__GetUrl() === '' && missing.module.Na__ProjectQr__GetSymbol() === null);
    check('...and the built-in fallbacks name no resolver and no index', missingSetup.link.baseUrl === '' && missingSetup.link.indexUrl === '', missingSetup.link);

    const servedPage = await symbolWith('page', 'page');
    check('config answered by the app\'s page (200, not JSON): OFF, no symbol',
          servedPage.landed === false && servedPage.module.Na__ProjectQr__IsEnabled() === false && servedPage.module.Na__ProjectQr__GetSymbol() === null);

    const shipped = await symbolWith(qrConfig, 'shipped');
    check('config read as shipped: it landed, and it is OFF - no symbol',
          shipped.landed === true && shipped.module.Na__ProjectQr__IsEnabled() === false && shipped.module.Na__ProjectQr__GetSymbol() === null);

    const on    = await symbolWith(SWITCHED_ON, 'on');
    const onUrl = on.module.Na__ProjectQr__GetUrl();
    const onSym = on.module.Na__ProjectQr__GetSymbol();
    check('switched on with a test resolver, the code carries that resolver and the project\'s key: ' + onUrl,
          on.module.Na__ProjectQr__IsEnabled() === true && onUrl === 'https://qr.example.test/q/?' + VALE_KEY &&
          !!onSym && decode(onSym.Modules, onSym.Version).text === onUrl);
    check('...and the same symbol object comes back until the address changes', on.module.Na__ProjectQr__GetSymbol() === onSym);

    showing('?project=2026/44371__Gill');
    check('a project whose master-index entry has no key draws no code, even switched on',
          linker.Na__QrLink__CurrentProject().projectFolder === '44371__Gill' && on.module.Na__ProjectQr__GetUrl() === '' && on.module.Na__ProjectQr__GetSymbol() === null);
    showing('?project=2026/9999__Nowhere');
    check('nor does a project the master index does not list',
          linker.Na__QrLink__CurrentProject().projectFolder === '' && on.module.Na__ProjectQr__GetSymbol() === null);

    globalThis.fetch = realFetch;
    delete globalThis.window;

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Result
// -----------------------------------------------------------------------------

    const dumpFlag = process.argv.indexOf('--dump');
    if (dumpFlag !== -1 && process.argv[dumpFlag + 1]) {
        writeFileSync(process.argv[dumpFlag + 1], JSON.stringify(dump), 'utf8');
        console.log('\n  wrote ' + dump.length + ' cases to ' + process.argv[dumpFlag + 1]);
    }

    rmSync(SCRATCH, { recursive : true, force : true });
    console.log('\n' + passed + ' passed, ' + failed + ' failed\n');
    process.exit(failed === 0 ? 0 : 1);

// endregion -------------------------------------------------------------------
