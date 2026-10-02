// =============================================================================
// VALEVISION3D - TEST - LAYOUT EDITOR CONFIG PARITY WITH TRUEVISION
// =============================================================================
//
// FILE       : Na__Test__AppConfigParity__.test.mjs
// NAMESPACE  : Na__Test
// MODULE     : Layout Editor Config Parity Test
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Prove the Layout Editor's config differs from TrueVision's only where a listed seam says it may
// CREATED    : 01-Oct-2026
//
// DESCRIPTION:
// - THE KEY TREE. Na__LayoutEditor__AppConfig__.json is walked key by key
//   against TrueVision's at the pinned commit (objects are walked, arrays
//   and values compared whole). Every difference - a key only one app has,
//   or a value that differs - has to be on the allow-list below, with its
//   kind, why it differs and who changes it next. Anything else FAILS: a
//   key TrueVision added that this app has not taken, a value drifted by
//   hand, a key lost in an edit.
// - THE ALLOW-LIST. Seven kinds of seam, the ones the parity plan names:
//   brand (Vale's own logo, names and author), na-path (a TrueVision or
//   Noble Architecture path given this app's), identity (wording that named
//   TrueVision's files, server or a client), decision (a value set by a
//   decision of the plan's register while it is unanswered), withheld (a
//   value, and the note describing it, held at this app's until the feature
//   that changes it lands - the package named switches it), vv-only (keys
//   only this app has) and tv-defect (TrueVision keys not copied because
//   they are a fault there). An entry whose value has since come level with
//   TrueVision's is reported as STALE so it can be taken off the list (a
//   failure only with --strict).
// - IDENTITY. Whatever TrueVision has, this app's config never carries a
//   TrueVision__ literal, a TRUEVISION3D banner or [TrueVision3D prefix,
//   NaProjectPortal, 30__TrueVision__AppContent, an /na-apps/ path, the
//   Noble Architecture Ltd author or any noble-architecture.com address but
//   the two this app already uses (cdn.noble-architecture.com/VaApps/ and
//   www.noble-architecture.com/assets/), nor TrueVision's four job stages
//   in the Drawing Register. Duplicate keys fail too (JSON.parse would keep
//   the last one silently).
//
// USAGE:
//     node 80__Testing__PrototypeEnvironment/Na__Test__AppConfigParity__.test.mjs
//          [--tv-file <TrueVision AppConfig JSON>] [--tv-repo <NaWeb git root>] [--pin <commit>]
//          [--vv-file <a candidate config to check instead of the shipped one>] [--strict]
//
//   TrueVision's file is read with git show at the pin (default b2aa9151 in
//   D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb, or the
//   VV_PARITY_TV_REPO / VV_PARITY_TV_PIN environment values), never from its
//   working tree, which moves. Without it the key-tree section is SKIPPED and
//   the identity section still runs. Writes nothing.
//
//   Exit 0 = every check passed (or skipped). Exit 1 = at least one did not.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.0 ({{VVREL:W0-15}})
// - Written with the Layout Editor config foundation: TrueVision's every key,
//   block, note and label taken in one additive pass, and the seams listed.
//
// =============================================================================

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';


// -----------------------------------------------------------------------------
// REGION | Inputs
// -----------------------------------------------------------------------------

    const SCRIPT_DIR  = dirname(fileURLToPath(import.meta.url));
    const TV_REL      = 'na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__AppConfig__.json';

    const argv   = process.argv.slice(2);
    const option = (name) => { const at = argv.indexOf(name); return at !== -1 && at + 1 < argv.length ? argv[at + 1] : null; };
    const VV_CONFIG = option('--vv-file') || resolve(SCRIPT_DIR, '..', '02__Src__AppModules', '51__System__LayoutEditor', '03__Core__Config', 'Na__LayoutEditor__AppConfig__.json');   // <-- A candidate file can be checked before it lands
    const STRICT = argv.indexOf('--strict') !== -1;
    const TV_REPO = option('--tv-repo') || process.env.VV_PARITY_TV_REPO || 'D:\\11_RefLib__StudioRepository__RemoteSystem\\NaWeb';
    const TV_PIN  = option('--pin') || process.env.VV_PARITY_TV_PIN || 'b2aa9151';
    const TV_FILE = option('--tv-file') || process.env.VV_PARITY_TV_APPCONFIG || null;

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Allow-List: Every Way This Config May Differ From TrueVision's
// -----------------------------------------------------------------------------
//
// [ kind, path, seam, who changes it next, why ]. kind is value (both have
// the key, the values differ), vv-only or tv-only. path is Block/Key[/sub]:
// 'Style/FontFamily' is LayoutEditor__Style__Config/LayoutEditor__Style__FontFamily;
// a Key that already starts LayoutEditor__ is used as written.
//

    const ALLOW = [
        // STYLE | Open Sans first comes with the embedded PDF fonts
        [ 'value',   'Style/Description',                      'withheld',  'W1-25', 'describes the Helvetica-first face kept until the PDF embeds Open Sans' ],
        [ 'value',   'Style/FontFamily',                       'withheld',  'W1-25', 'Helvetica first until PdfFonts embeds Open Sans (DR-21)' ],
        [ 'value',   'Style/TitleValueWeightNote',             'withheld',  'W1-25', 'describes the jsPDF Helvetica weights kept until then' ],

        // TITLE BLOCK
        [ 'value',   'TitleBlock/LogoAssetPath',               'brand',     'permanent', 'the Vale logo' ],
        [ 'value',   'TitleBlock/LogoCellWidthMm',             'brand',     'permanent', 'the Vale logo cell' ],
        [ 'tv-only', 'TitleBlock/LogoCellWidthMmNote',         'brand',     'permanent', "TrueVision's own logo cell history (40 mm); the Vale cell is 34" ],
        [ 'value',   'TitleBlock/LogoMaxHeightMm',             'brand',     'permanent', 'the Vale logo cell' ],
        [ 'value',   'TitleBlock/LogoAspectWidthOverHeight',   'brand',     'permanent', 'the Vale asset is 2000 x 444 (4.5)' ],
        [ 'value',   'TitleBlock/LogoAspectWidthOverHeightNote', 'brand',   'permanent', 'measured for the Vale asset' ],
        [ 'value',   'TitleBlock/LogoPaddingVMm',              'brand',     'permanent', 'the Vale logo cell' ],
        [ 'value',   'TitleBlock/LogoPaddingHMm',              'brand',     'permanent', 'the Vale logo cell' ],
        [ 'value',   'TitleBlock/DrawnByDefault',              'brand',     'permanent', 'Vale Garden Houses' ],
        [ 'value',   'TitleBlock/DocumentIdNote',              'identity',  'permanent', "names TrueVision's numbering NOTES without a TrueVision__ literal" ],
        [ 'value',   'TitleBlock/RowsNote',                    'withheld',  'W1-22', "describes this app's Drawing No. row, measured in Helvetica" ],
        [ 'value',   'TitleBlock/Rows',                        'withheld',  'W1-22', 'DrawingNumber "Drawing No." and no Revision prefix until the Document ID switch' ],
        [ 'value',   'TitleBlock/RowWidthFactorByPaperNote',   'identity',  'permanent', "a client's postal address left out" ],
        [ 'value',   'TitleBlock/QrCellEnabled',               'decision',  'W5-05', 'Project QR cell switched off (DR-12) until a Vale resolver exists' ],
        [ 'value',   'TitleBlock/ClassicScanAssets/A3',        'brand',     'W0-16', "Vale's own scan; on the 35 copy until W0-16 copies it under 01__AppAssets__ValeVision" ],
        [ 'value',   'TitleBlock/ClassicScanAssets/A4',        'brand',     'W0-16', "Vale's own scan, as A3" ],
        [ 'value',   'TitleBlock/ClassicScanAssets/A2',        'brand',     'W0-16', "Vale's own scan, as A3" ],
        [ 'value',   'TitleBlock/ClassicScanAssets/A1',        'brand',     'W0-16', "Vale's own scan, as A3" ],
        [ 'vv-only', 'TitleBlock/ClassicFieldAnchors/A3/DrawingNumber', 'withheld', 'W1-22', 'retired with the Document ID switch' ],

        // SCALES | 1:200 (DR-17) with the sheet identity package
        [ 'value',   'Scales/Description',                     'withheld',  'W1-22', 'describes the 1:20-1:100 list kept until 1:200 is added' ],
        [ 'value',   'Scales/AvailableScaleDenominators',      'withheld',  'W1-22', '1:200 added with the SheetSetup fallback (DR-17)' ],

        // PANELS | the fold group's new sections come with their features
        [ 'value',   'Panels/FocusNote',                       'withheld',  'W1-32', "TV's viewport sentence first (W1-32), each feature's clause with it" ],
        [ 'value',   'Panels/AccordionSections',               'withheld',  'W2-29, W3-07, W3-09, W3-10', 'patterns, vector-tools, images and floor-areas join with their features' ],

        // PLAN DOORS
        [ 'value',   'PlanDoors/SwingCategoryKeys',            'identity',  'permanent', 'ValeVision__Linetype__DoorSwings: this app\'s category keys carry its token (K2 K3)' ],

        // SELECTION | TrueVision keeps three labels in the wrong block, where GetLabel never reads them
        [ 'tv-only', 'Selection/LayoutEditor__Labels__MeasureOffsetAgain',    'tv-defect', 'WT-08', 'kept in Labels here (vv-only below)' ],
        [ 'tv-only', 'Selection/LayoutEditor__Labels__MeasureNoOffsetSide',   'tv-defect', 'WT-08', 'kept in Labels here (vv-only below)' ],
        [ 'tv-only', 'Selection/LayoutEditor__Labels__MeasureDimOffsetTitle', 'tv-defect', 'WT-08', 'kept in Labels here (vv-only below)' ],

        // PDF
        [ 'value',   'Pdf/Description',                        'withheld',  'W1-25', 'describes the Helvetica PDF until Open Sans is embedded' ],
        [ 'value',   'Pdf/Author',                             'brand',     'permanent', 'Vale Garden Houses Limited' ],
        [ 'value',   'Pdf/Creator',                            'brand',     'permanent', 'ValeVision3D Layout Editor' ],
        [ 'value',   'Pdf/JsPdfScriptPath',                    'na-path',   'W0-16', 'the 35 copy until W0-16 vendors 05__Vendor__JsPdf__v4.1.0 (then equal to TrueVision)' ],
        [ 'value',   'Pdf/FontBasePath',                       'decision',  'permanent', 'DR-21 default: the AD04 cuts the screen @font-face loads' ],
        [ 'value',   'Pdf/FontCdnBase',                        'decision',  'permanent', 'DR-21 default: the AD04 cuts the screen @font-face loads' ],
        [ 'value',   'Pdf/FontsNote',                          'decision',  'permanent', 'says where this app fetches the cuts' ],
        [ 'value',   'Pdf/Fonts',                              'decision',  'permanent', 'DR-21 default: the AD04 file names' ],

        // SPECIFICATION
        [ 'value',   'Specification/Description',              'identity',  'permanent', 'beside project.json, not TrueVision\'s project file' ],
        [ 'value',   'Specification/FileName',                 'brand',     'permanent', 'ValeVision__DrawingNotes__.json' ],
        [ 'value',   'Specification/LegacyFileName',           'identity',  'permanent', 'this app never had another name' ],
        [ 'value',   'Specification/RevisionNote',             'decision',  'permanent', 'no job stages in a document number until Vale\'s are supplied (DR-11)' ],

        // MARGIN NOTES
        [ 'value',   'MarginNotes/Description',                'withheld',  'W1-35', "reworded when the toolbar's Notes button goes" ],

        // LABELS | rewordings that come with their features
        [ 'value',   'Labels/TabLabelFormatNote',              'withheld',  'the Drawing Register', "names the register's code" ],
        [ 'value',   'Labels/StatusTitle',                     'withheld',  'the Drawing Register', 'names the register' ],
        [ 'value',   'Labels/SheetNameCodeTitle',              'withheld',  'the Drawing Register', 'names the register' ],
        [ 'value',   'Labels/SitePlanNoData',                  'identity',  'permanent', "the project folder, not TrueVision's content folder" ],
        [ 'value',   'Labels/NoSheets',                        'withheld',  'W1-34', 'tab strip 2.0.0' ],
        [ 'value',   'Labels/TabsPreviousTitle',               'withheld',  'W1-34', 'tab strip 2.0.0' ],
        [ 'value',   'Labels/TabsNextTitle',                   'withheld',  'W1-34', 'tab strip 2.0.0' ],
        [ 'value',   'Labels/ToolMoveTitle',                   'withheld',  'W5-01', 'auto-Move wording only once the gesture is confirmed (DR-40)' ],
        [ 'value',   'Labels/ToolSelectTitle',                 'withheld',  'W5-01', 'auto-Move wording only once the gesture is confirmed (DR-40)' ],
        [ 'value',   'Labels/SpecificationTab',                'withheld',  'W1-34', 'tab strip 2.0.0' ],
        [ 'value',   'Labels/PdfMarginOverflow',               'withheld',  'the note regions', 'names note regions' ],
        [ 'value',   'Labels/MeasureIdleTitle',                'withheld',  'the Measurements box', 'move and type' ],
        [ 'value',   'Labels/MeasurePaperTitle',               'withheld',  'the Measurements box', 'Draw at scale and Measure at scale' ],
        [ 'value',   'Labels/MeasureViewportTitle',            'withheld',  'the Measurements box', 'retyping a move' ],
        [ 'vv-only', 'Labels/LayoutModeLabel',                 'vv-only',   'permanent', 'the per-project Layout Mode switch (DR-25)' ],
        [ 'vv-only', 'Labels/LayoutModeHint',                  'vv-only',   'permanent', 'the per-project Layout Mode switch (DR-25)' ],
        [ 'vv-only', 'Labels/LayoutModeOffNote',               'vv-only',   'permanent', 'the per-project Layout Mode switch (DR-25)' ],
        [ 'vv-only', 'Labels/MarginToggle',                    'vv-only',   'W1-35', "the toolbar's Notes button, removed by W1-35" ],
        [ 'vv-only', 'Labels/MarginToggleTitle',               'vv-only',   'W1-35', "the toolbar's Notes button, removed by W1-35" ],
        [ 'vv-only', 'Labels/MeasureOffsetAgain',              'vv-only',   'WT-08', 'where GetLabel reads it (TrueVision keeps it in Selection)' ],
        [ 'vv-only', 'Labels/MeasureNoOffsetSide',             'vv-only',   'WT-08', 'where GetLabel reads it (TrueVision keeps it in Selection)' ],
        [ 'vv-only', 'Labels/MeasureDimOffsetTitle',           'vv-only',   'WT-08', 'where GetLabel reads it (TrueVision keeps it in Selection)' ],

        // DRAWING REGISTER
        [ 'value',   'DrawingRegister/PdfJsScriptPath',        'na-path',   'permanent', "this app's vendor copy, 07__Vendor__PdfJs__v3.11.174 (W0-16), not PlanVision's" ],
        [ 'value',   'DrawingRegister/PdfJsWorkerPath',        'na-path',   'permanent', "this app's vendor copy, 07__Vendor__PdfJs__v3.11.174 (W0-16), not PlanVision's" ],
        [ 'value',   'DrawingRegister/ColumnsSchemaNote',      'identity',  'permanent', "names TrueVision's numbering NOTES without a TrueVision__ literal" ],
        [ 'value',   'DrawingRegister/Phases',                 'decision',  'Adam (DR-11)', "empty until Vale's own stages are supplied" ],
        [ 'value',   'DrawingRegister/DefaultPhaseNote',       'decision',  'Adam (DR-11)', 'describes the empty phase' ],
        [ 'value',   'DrawingRegister/DefaultPhase',           'decision',  'Adam (DR-11)', 'no phase' ],
        [ 'value',   'DrawingRegister/DocumentCodeFormat',     'decision',  'Adam (DR-11)', '{project}_{drawing} until Vale phases exist' ],
        [ 'value',   'DrawingRegister/LetterheadLogoAspect',   'brand',     'permanent', 'the Vale logo, 4.5' ],

        // STATEMENT WRITER
        [ 'value',   'Statement/Description',                  'identity',  'permanent', "the project's folder, not TrueVision's content folder" ],
        [ 'value',   'Statement/IndexFileName',                'identity',  'permanent', 'ValeVision__StatementDocs__.json (DR-29)' ],
        [ 'value',   'Statement/NamingNote',                   'identity',  'permanent', "a client's project name left out of the example" ],
        [ 'value',   'Statement/AutoSaveLocalNote',            'identity',  'permanent', "this app's local server" ],
        [ 'value',   'Statement/StylesheetUrl',                'na-path',   'permanent', "this app's public origin" ],
        [ 'vv-only', 'Statement/Enabled',                      'decision',  'Adam (DR-10)', 'the Design Statements tab is built only when this is true' ],
        [ 'vv-only', 'Statement/EnabledNote',                  'decision',  'Adam (DR-10)', 'says what the switch does' ]
    ];

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | A JSON Reader That Reports Duplicate Keys
// -----------------------------------------------------------------------------

    function parseStrict(text) {
        let at = 0;
        const dups = [];
        const fail = (why) => { throw new Error(why + ' at character ' + at); };
        const ws = () => { while (at < text.length && ' \t\r\n\uFEFF'.indexOf(text[at]) !== -1) at++; };
        function str() {
            const start = at;
            at++;
            while (at < text.length && text[at] !== '"') at += (text[at] === '\\') ? 2 : 1;
            if (at >= text.length) fail('unterminated string');
            at++;
            return JSON.parse(text.slice(start, at));
        }
        function val(path) {
            ws();
            const c = text[at];
            if (c === '{') {
                at++; const obj = {}; ws();
                if (text[at] === '}') { at++; return obj; }
                for (;;) {
                    ws(); if (text[at] !== '"') fail('expected a key');
                    const key = str(); ws();
                    if (text[at] !== ':') fail('expected :'); at++;
                    if (Object.prototype.hasOwnProperty.call(obj, key)) dups.push(path + '/' + key);
                    obj[key] = val(path + '/' + key); ws();
                    if (text[at] === ',') { at++; continue; }
                    if (text[at] === '}') { at++; return obj; }
                    fail('expected , or }');
                }
            }
            if (c === '[') {
                at++; const arr = []; ws();
                if (text[at] === ']') { at++; return arr; }
                for (;;) {
                    arr.push(val(path + '[' + arr.length + ']')); ws();
                    if (text[at] === ',') { at++; continue; }
                    if (text[at] === ']') { at++; return arr; }
                    fail('expected , or ]');
                }
            }
            if (c === '"') return str();
            const m = /^(?:-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(text.slice(at, at + 40));
            if (!m) fail('unexpected token');
            at += m[0].length;
            return JSON.parse(m[0]);
        }
        const value = val('');
        ws();
        if (at !== text.length) fail('trailing text');
        return { value, dups };
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Key-Tree Walk
// -----------------------------------------------------------------------------

    const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

    function walk(tv, vv, path, out) {
        const keys = Object.keys(tv).concat(Object.keys(vv).filter((k) => !Object.prototype.hasOwnProperty.call(tv, k)));
        keys.forEach((key) => {
            const p = path + '/' + key;
            const inTv = Object.prototype.hasOwnProperty.call(tv, key), inVv = Object.prototype.hasOwnProperty.call(vv, key);
            if (!inVv) out.push({ kind : 'tv-only', path : p });
            else if (!inTv) out.push({ kind : 'vv-only', path : p });
            else if (isObject(tv[key]) && isObject(vv[key])) walk(tv[key], vv[key], p, out);
            else if (JSON.stringify(tv[key]) !== JSON.stringify(vv[key])) out.push({ kind : 'value', path : p });
        });
        return out;
    }

    // 'Style/FontFamily' -> '/LayoutEditor__Style__Config/LayoutEditor__Style__FontFamily'
    function fullPath(short) {
        const parts = short.split('/');
        const block = parts[0];
        const key   = parts[1].indexOf('LayoutEditor__') === 0 ? parts[1] : 'LayoutEditor__' + block + '__' + parts[1];
        return ['', 'LayoutEditor__' + block + '__Config', key].concat(parts.slice(2)).join('/');
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Checks
// -----------------------------------------------------------------------------

    let failures = 0, warnings = 0;
    function check(name, passed, detail) {
        if (!passed) failures++;
        console.log((passed ? '  PASS  ' : '  FAIL  ') + name);
        if (!passed && detail) console.log('        ' + detail.split('\n').join('\n        '));
    }

    console.log('ValeVision3D - the Layout Editor config against TrueVision\'s');

    const vvText = readFileSync(VV_CONFIG, 'utf8');
    const vvParsed = parseStrict(vvText);
    const VV = vvParsed.value;
    check('this app\'s config parses with no duplicate key', vvParsed.dups.length === 0, vvParsed.dups.join('\n'));

    // THE KEY TREE AGAINST TRUEVISION'S
    // ------------------------------------------------------------
    let tvText = null;
    try {
        tvText = TV_FILE ? readFileSync(TV_FILE, 'utf8')
                         : execFileSync('git', [ '-C', TV_REPO, 'show', TV_PIN + ':' + TV_REL ], { encoding : 'utf8', stdio : [ 'ignore', 'pipe', 'ignore' ], maxBuffer : 16 * 1024 * 1024 });
    } catch (readError) {
        tvText = null;
    }

    if (tvText === null) {
        console.log('\n  SKIPPED  the key tree against TrueVision\'s: ' + (TV_FILE || (TV_REPO + ' @ ' + TV_PIN)) + ' could not be read');
    } else {
        console.log('\n  The key tree against TrueVision\'s (' + (TV_FILE || ('git show ' + TV_PIN)) + ')');
        const TV = parseStrict(tvText).value;
        const diffs = walk(TV, VV, '', []);
        const allowed = new Map();
        const seen = new Set();
        ALLOW.forEach(([ kind, short, seam, owner, why ]) => {
            const id = kind + ' ' + fullPath(short);
            if (seen.has(id)) { failures++; console.log('  FAIL  the allow-list names ' + id + ' twice'); }
            seen.add(id);
            allowed.set(id, { seam, owner, why });
        });
        const unlisted = diffs.filter((d) => !allowed.has(d.kind + ' ' + d.path));
        const counts = {};
        diffs.forEach((d) => { const a = allowed.get(d.kind + ' ' + d.path); if (a) counts[a.seam] = (counts[a.seam] || 0) + 1; });
        check(diffs.length + ' differences, every one a listed seam (' + Object.keys(counts).sort().map((k) => k + ' ' + counts[k]).join(', ') + ')',
              unlisted.length === 0,
              unlisted.map((d) => d.kind + '  ' + d.path).join('\n'));
        const present = new Set(diffs.map((d) => d.kind + ' ' + d.path));
        const stale = Array.from(allowed.keys()).filter((id) => !present.has(id));
        if (stale.length) {
            if (STRICT) failures++; else warnings++;
            console.log((STRICT ? '  FAIL  ' : '  WARN  ') + stale.length + ' allow-list entr' + (stale.length === 1 ? 'y no longer differs' : 'ies no longer differ') + ' (STALE: take ' + (stale.length === 1 ? 'it' : 'them') + ' off the list):');
            stale.forEach((id) => console.log('        ' + id + '  (' + allowed.get(id).seam + ', ' + allowed.get(id).owner + ')'));
        } else {
            console.log('  PASS  no stale allow-list entry');
        }
        const tvBlocks = Object.keys(TV).filter((k) => /__Config$/.test(k));
        check('every TrueVision config block is here (' + tvBlocks.length + ')', tvBlocks.every((k) => isObject(VV[k])), tvBlocks.filter((k) => !isObject(VV[k])).join(', '));
    }

    // IDENTITY
    // ------------------------------------------------------------
    console.log('\n  Identity: nothing of TrueVision\'s or Noble Architecture\'s');
    const strings = [];
    (function collect(value, path) {
        if (typeof value === 'string') strings.push({ path, text : value });
        else if (Array.isArray(value)) value.forEach((v, i) => collect(v, path + '[' + i + ']'));
        else if (isObject(value)) Object.keys(value).forEach((k) => { strings.push({ path : path + '/' + k + ' (key)', text : k }); collect(value[k], path + '/' + k); });
    })(VV, '');
    const MARKERS = [ /TrueVision__/, /TRUEVISION3D/, /\[TrueVision3D/, /NaProjectPortal/, /30__TrueVision__AppContent/, /\/na-apps\//, /Noble Architecture Ltd/, /\/api\/truevision/i ];
    const markerHits = strings.filter((s) => MARKERS.some((re) => re.test(s.text)));
    check('no TrueVision__ literal, TRUEVISION3D, [TrueVision3D, NaProjectPortal, 30__TrueVision__AppContent, /na-apps/, Noble Architecture Ltd or /api/truevision',
          markerHits.length === 0, markerHits.map((s) => s.path).join('\n'));
    const hostHits = [];
    strings.forEach((s) => {
        const re = /noble-architecture\.com[^\s"']*/g;
        let m;
        while ((m = re.exec(s.text)) !== null) {
            const before = s.text.slice(Math.max(0, m.index - 12), m.index);
            const ok = (/www\.$/.test(before) && m[0].indexOf('noble-architecture.com/assets/') === 0) || (/cdn\.$/.test(before) && m[0].indexOf('noble-architecture.com/VaApps/') === 0);
            if (!ok) hostHits.push(s.path + '  ' + before + m[0]);
        }
    });
    check('noble-architecture.com only as cdn.../VaApps/ or www.../assets/ (this app\'s own hosting)', hostHits.length === 0, hostHits.join('\n'));
    const register = VV.LayoutEditor__DrawingRegister__Config || {};
    const NA_STAGES = { T01 : 'Concept', T02 : 'Planning', T03 : 'Building Regs', T04 : 'Site & Remedial' };
    const phases = Array.isArray(register.LayoutEditor__DrawingRegister__Phases) ? register.LayoutEditor__DrawingRegister__Phases : [];
    const naPhases = phases.filter((p) => p && NA_STAGES[p.Code] === p.Name);
    check('the Drawing Register offers none of TrueVision\'s four job stages', naPhases.length === 0 && !/^T0[1-4]$/.test(String(register.LayoutEditor__DrawingRegister__DefaultPhase || '')),
          naPhases.map((p) => p.Code + ' ' + p.Name).join(', '));
    const statement = VV.LayoutEditor__Statement__Config || {};
    check('the Statement Writer has its switch (LayoutEditor__Statement__Enabled, now ' + statement.LayoutEditor__Statement__Enabled + ')', typeof statement.LayoutEditor__Statement__Enabled === 'boolean');

// endregion -------------------------------------------------------------------


    console.log('\n' + (failures === 0 ? '  Every check passed' + (warnings ? ' (' + warnings + ' warning)' : '') + '.' : '  ' + failures + ' FAILED'));
    process.exit(failures === 0 ? 0 : 1);
