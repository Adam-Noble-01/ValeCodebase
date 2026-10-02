// =============================================================================
// VALEVISION3D - TEST - LAYOUT EDITOR LOADER STYLESHEETS IN TRUEVISION'S ORDER
// =============================================================================
//
// FILE       : Na__Test__LoaderStylesheets__.test.mjs
// NAMESPACE  : Na__Test
// MODULE     : Loader Stylesheet Order Test
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Prove the lazy loader links the editor's stylesheets in exactly TrueVision's CSS-index order, for the sheets this app has
// CREATED    : 01-Oct-2026
//
// DESCRIPTION:
// - TWO LOADING MODELS, ONE CASCADE. TrueVision imports every Layout Editor
//   stylesheet from its CSS index at start-up (fourteen @imports, Surfaces
//   first, WebViewer last). This app loads the editor lazily, so its
//   loader links them instead, from Na__LeLoad__STYLESHEETS, when the editor
//   first opens (DR-24 keeps the loader). The cascade is the same only if
//   the order is: a later rule wins, and WebViewer deliberately reshapes
//   what the sheets before it set (K2 S5, R3 C.2 (b)).
// - WHAT IS ASSERTED. The loader's list is TrueVision's Layout Editor
//   sequence restricted to the files this app has - nothing missing,
//   nothing extra, nothing out of order; Surfaces first and WebViewer last;
//   every listed file is on disk (a sheet is never pre-registered: a
//   missing file only warns in the browser, so it would hide a broken
//   port); and no listed sheet also has a second home in the CSS index.
// - RE-RUN AFTER EVERY FEATURE LANDING. Each package that ports an indexed
//   stylesheet (DraftMode, DrawingGrid, ObjectSnap, DrawingAxes, SheetImages,
//   Share) adds its loader line in TrueVision's position; this test then
//   expects it there, because the file now exists (WP-S03a-07; W5-02
//   re-runs it).
//
// USAGE:
//     node 80__Testing__PrototypeEnvironment/Na__Test__LoaderStylesheets__.test.mjs
//          [--tv-repo <NaWeb git root>] [--pin <commit>] [--tv-file <TrueVision CSS index>]
//
//   TrueVision's CSS index is read with git show at the pin (default b2aa9151 in
//   D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb, or the VV_PARITY_TV_REPO /
//   VV_PARITY_TV_PIN environment values), never from its working tree. If that
//   repository is not on this machine, the Layout Editor sequence recorded from
//   b2aa9151 below is used instead, and the run says so. Writes nothing.
//
//   Exit 0 = every check passed. Exit 1 = at least one did not.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : ValeVision3D first; no TrueVision twin (WP-S03a-07 of the parity
//                   plan, landed by package W0-04; TrueVision has no loader, DR-24)
// - Parity        : new
// - Back-port     : none (TrueVision loads its editor sheets from the CSS index).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.0 (v2.71.1)
// - Written for the TrueVision parity programme: the loader's stylesheet list
//   against TrueVision's CSS index at the pin.
//
// =============================================================================

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';


// -----------------------------------------------------------------------------
// REGION | Inputs
// -----------------------------------------------------------------------------

    const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
    const APP_ROOT   = resolve(SCRIPT_DIR, '..');
    const LE_ROOT    = join(APP_ROOT, '02__Src__AppModules', '51__System__LayoutEditor');
    const LOADER     = join(LE_ROOT, '01__Core__Loader', 'Na__LayoutEditor__Loader__.js');
    const CSS_INDEX  = join(APP_ROOT, '03__Style__AppStylesheets', 'Na__CoreUi__Styles__Index__.css');
    const LE_MARK    = '51__System__LayoutEditor/';

    const argv    = process.argv.slice(2);
    const option  = (name) => { const at = argv.indexOf(name); return at !== -1 && at + 1 < argv.length ? argv[at + 1] : null; };
    const TV_REPO = option('--tv-repo') || process.env.VV_PARITY_TV_REPO || 'D:\\11_RefLib__StudioRepository__RemoteSystem\\NaWeb';
    const TV_PIN  = option('--pin') || process.env.VV_PARITY_TV_PIN || 'b2aa9151';
    const TV_FILE = option('--tv-file');
    const TV_REL  = 'na-apps/30__' + 'True' + 'Vision__CoreAppCode/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css';

    // RECORDED | TrueVision's Layout Editor @imports at b2aa9151 (CSS index lines 161-174)
    // ------------------------------------------------------------
    // Used only when TrueVision's repository cannot be read. Layout Editor
    // relative, in TrueVision's order.
    const RECORDED_PIN = 'b2aa9151';
    const RECORDED = [
        '10__Core__SheetSurface/Na__LayoutEditor__Styles__Surfaces__.css',
        '10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css',
        '10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css',
        '26__System__DraftMode/Na__LayoutEditor__Styles__DraftMode__.css',
        '27__System__DrawingGrid/Na__LayoutEditor__Styles__DrawingGrid__.css',
        '28__System__ObjectSnap/Na__LayoutEditor__Styles__ObjectSnap__.css',
        '33__System__DrawingAxes/Na__LayoutEditor__Styles__DrawingAxes__.css',
        '40__Ui__Panels/Na__LayoutEditor__Styles__Panels__.css',
        '50__Feature__Specification/Na__LayoutEditor__Styles__Specification__.css',
        '50__Feature__Specification/Na__LayoutEditor__Styles__Specification__Notes__.css',
        '50__Feature__Specification/Na__LayoutEditor__Styles__Specification__Read__.css',
        '54__Feature__SheetImages/Na__LayoutEditor__Styles__SheetImages__.css',
        '66__Feature__DocumentSharing/Na__LayoutEditor__Styles__Share__.css',
        '80__Feature__WebViewer/Na__LayoutEditor__Styles__WebViewer__.css'
    ];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Reading Both Lists
// -----------------------------------------------------------------------------

    // FUNCTION | The Layout Editor @imports of a CSS Index, Layout Editor Relative
    // ------------------------------------------------------------
    function LeImports(css) {
        const code = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
        return Array.from(code.matchAll(/@import\s+url\(\s*['"]?([^'")]+)['"]?\s*\)/g))
            .map((m) => m[1])
            .filter((p) => p.indexOf('/' + LE_MARK) !== -1)
            .map((p) => p.slice(p.indexOf('/' + LE_MARK) + LE_MARK.length + 1));
    }
    // ------------------------------------------------------------


    // FUNCTION | The Loader's Na__LeLoad__STYLESHEETS, Layout Editor Relative
    // ------------------------------------------------------------
    // Returns { entries, odd } - odd holds any list item that is not a literal
    // new URL('../<path>.css', import.meta.url).href.
    // ------------------------------------------------------------
    function LoaderList(source) {
        const block = source.match(/Na__LeLoad__STYLESHEETS\s*=\s*\[([\s\S]*?)\];/);
        if (!block) return null;
        const items = block[1].replace(/\/\/[^\n]*/g, '').split(/,\s*(?=new\b|$)/).map((s) => s.trim()).filter(Boolean);
        const entries = [];
        const odd = [];
        items.forEach((item) => {
            const m = item.match(/^new\s+URL\(\s*['"]\.\.\/([^'"]+\.css)['"]\s*,\s*import\.meta\.url\s*\)\.href$/);
            if (m) entries.push(m[1]); else odd.push(item);
        });
        return { entries, odd };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Checks
// -----------------------------------------------------------------------------

    let failures = 0;
    function check(name, passed, detail) {
        if (!passed) failures++;
        console.log((passed ? '  PASS  ' : '  FAIL  ') + name);
        if (!passed && detail) console.log('        ' + String(detail).split('\n').join('\n        '));
    }

    console.log('ValeVision3D - the Layout Editor loader\'s stylesheets against TrueVision\'s CSS index');

    let tvCss = null;
    let source = '';
    try {
        tvCss = TV_FILE ? readFileSync(TV_FILE, 'utf8')
                        : execFileSync('git', [ '-C', TV_REPO, 'show', TV_PIN + ':' + TV_REL ], { encoding : 'utf8', stdio : [ 'ignore', 'pipe', 'ignore' ], maxBuffer : 16 * 1024 * 1024 });
        source = TV_FILE ? TV_FILE : 'git show ' + TV_PIN + ' (' + TV_REPO + ')';
    } catch (readError) {
        tvCss = null;
    }
    const tvSequence = tvCss !== null ? LeImports(tvCss) : RECORDED.slice();
    if (tvCss === null) source = 'the sequence recorded from ' + RECORDED_PIN + ' (TrueVision\'s repository could not be read here)';
    console.log('  TrueVision: ' + source);
    console.log('');

    check('TrueVision\'s CSS index names its Layout Editor stylesheets (' + tvSequence.length + '), Surfaces first and WebViewer last',
          tvSequence.length > 0 && /Styles__Surfaces__\.css$/.test(tvSequence[0]) && /Styles__WebViewer__\.css$/.test(tvSequence[tvSequence.length - 1]),
          tvSequence.join('\n'));
    if (tvCss !== null && TV_PIN === RECORDED_PIN) {
        check('...and at ' + RECORDED_PIN + ' it is the sequence recorded in this test', tvSequence.join('\n') === RECORDED.join('\n'),
              'read:     ' + tvSequence.join(', ') + '\nrecorded: ' + RECORDED.join(', '));
    }

    const loaderSource = existsSync(LOADER) ? readFileSync(LOADER, 'utf8') : '';
    const loader = LoaderList(loaderSource);
    check('Na__LeLoad__STYLESHEETS is in the loader and every entry is a literal new URL(\'../<sheet>.css\', import.meta.url).href',
          loader !== null && loader.entries.length > 0 && loader.odd.length === 0,
          loader === null ? 'not found in ' + LOADER : loader.odd.join('\n'));

    const entries  = loader ? loader.entries : [];
    const present  = (rel) => existsSync(join(LE_ROOT, rel));
    const missing  = entries.filter((rel) => !present(rel));
    check('every listed sheet is on disk (' + entries.length + '; a sheet is never registered before its file lands)', missing.length === 0, missing.join('\n'));

    const expected = tvSequence.filter((rel) => present(rel));
    check('the list is TrueVision\'s Layout Editor sequence for the ' + expected.length + ' of ' + tvSequence.length + ' sheets this app has, in TrueVision\'s order',
          entries.join('\n') === expected.join('\n'),
          'expected: ' + expected.join(', ') + '\nloader:   ' + entries.join(', ')
          + (expected.filter((rel) => !entries.includes(rel)).length ? '\nnot listed, though the file is here: ' + expected.filter((rel) => !entries.includes(rel)).join(', ') : '')
          + (entries.filter((rel) => !tvSequence.includes(rel)).length ? '\nlisted, but not one of TrueVision\'s: ' + entries.filter((rel) => !tvSequence.includes(rel)).join(', ') : ''));

    check('Surfaces is first and WebViewer last',
          entries.length > 0 && /Styles__Surfaces__\.css$/.test(entries[0]) && /Styles__WebViewer__\.css$/.test(entries[entries.length - 1]),
          'first: ' + entries[0] + '\nlast:  ' + entries[entries.length - 1]);

    const index    = existsSync(CSS_INDEX) ? LeImports(readFileSync(CSS_INDEX, 'utf8')) : [];
    const twoHomes = index.filter((rel) => entries.includes(rel));
    check('no listed sheet is also imported by the CSS index (one home each; the index keeps only Styles__Boot)', twoHomes.length === 0, twoHomes.join('\n'));

// endregion -------------------------------------------------------------------


    console.log('\n' + (failures === 0 ? '  Every check passed.' : '  ' + failures + ' FAILED'));
    process.exit(failures === 0 ? 0 : 1);
