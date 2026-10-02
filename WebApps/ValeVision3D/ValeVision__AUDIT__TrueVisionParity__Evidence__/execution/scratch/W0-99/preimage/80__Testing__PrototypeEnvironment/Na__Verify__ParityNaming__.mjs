// =============================================================================
// VALEVISION3D - VERIFY - PARITY NAMING LINT
// =============================================================================
//
// FILE       : Na__Verify__ParityNaming__.mjs
// NAMESPACE  : Na__Verify
// MODULE     : Parity Naming Lint
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Prove that code taken from TrueVision carries this app's identity, that nothing of Noble Architecture's ships, and that every folder number and stylesheet has its registered home
// CREATED    : 01-Oct-2026
//
// DESCRIPTION:
// - IDENTITY. Code identity is TrueVision's; app identity is this app's
//   (K2 rulebook). So the shipped app - 02__Src__AppModules,
//   03__Style__AppStylesheets and the pages at the app root - never carries:
//   a TrueVision__ literal (K2 K3: every TrueVision__<Category> in a ported
//   file is a seam), a window.TrueVision__ read (K4), a TrueVision3D__
//   storage or database name (B2), a [TrueVision3D console prefix (C1), the
//   TRUEVISION3D banner token (H1), an /api/truevision route or an
//   X-TrueVision- header (R5), TrueVision's na-truevision-api worker client
//   or its na-projectvision-local-dev service name (G6, C.1 row 9).
// - NOBLE ARCHITECTURE. Nor any Noble Architecture marker (K2 V2, DR-43):
//   NaProjectPortal, 30__TrueVision__AppContent, an /na-apps/ path,
//   "Noble Architecture Ltd", the "TrueVision 3D Project Hub" section, or a
//   noble-architecture.com address other than the two this app already
//   uses for its own hosting - cdn.noble-architecture.com/VaApps/ and
//   www.noble-architecture.com/assets/ (the fonts). The QR /q/ and share /s/
//   resolvers are named when they are the address found.
// - HEADERS. Every module and stylesheet in the drawing system (folders
//   40-55, the Layout Editor included) opens with this app's banner -
//   "VALEVISION3D - " (H1), or for a stylesheet TrueVision's own
//   "REGION | ValeVision3D - " form - and a FILE line, where there is one,
//   names the file it sits in (F2; a JavaScript module must have one). Any
//   file anywhere, tests included, that still opens with TrueVision's banner
//   fails.
// - FOLDER NUMBERS. Every folder at the top of 02__Src__AppModules, and in
//   the Layout Editor, has its number registered for this app in
//   ValeVision__NOTES__FolderNumberRegistry__.md (K2 N1-N4, DR-03): its row
//   names this folder for ValeVision, or the number is shared and the row's
//   TrueVision folder is this one (a TrueVision system landing at
//   TrueVision's number). 08, 09, 12-14 and 16-19 are TrueVision's growth
//   (Q-REG), and 63 stays this app's while TrueVision's branch adding a 63
//   is unmerged (Q-63), as the registry records.
// - STYLESHEET HOMES. Every Layout Editor stylesheet has exactly one home
//   (K2 S5, R3 C.2 (b)): the loader's Na__LeLoad__STYLESHEETS list, the
//   CSS index, or a module that links it itself.
// - WHAT IS EXEMPT, AND NOTHING ELSE (F.8 C13). The whole PORT NOTE block of
//   a file (it names TrueVision on purpose, to record the seams) and the
//   DEVELOPMENT LOG (TrueVision's log is taken verbatim with a whole-file
//   port, DR-34, so it is history like the devlog); history documents
//   (devlog, ledger, __PLAN__, __NOTES__, Research__ and TASK__ files); and
//   one named file, the Statement Writer's TrueVisionHub section, kept at
//   TrueVision's path and never rendered (DR-43). The test folder is held
//   to the banner rule only: parity tests and these gates read TrueVision's
//   tree and name its tokens on purpose.
// - THE BASELINE. Na__Verify__ParityBaseline__.json, beside this file,
//   holds the hits that already stood when this lint landed on 01-Oct-2026
//   (F.8 C13). The plan foresaw one, the SpecPdf read of
//   window.TrueVision__Pwa__ProjectContext, which W0-12 removed that
//   evening; the lint also found TrueVision's banner left in the web viewer
//   stylesheet. A held hit prints WARN only while its file is as recorded;
//   the first package that writes the file takes it off the list, and the
//   file's own checks then apply in full. The part this lint reads must be
//   empty by the end of Wave 0.
//
// USAGE:
//     node 80__Testing__PrototypeEnvironment/Na__Verify__ParityNaming__.mjs [options]
//
//       --files <path> ...   check only these files (a package's own); the folder and stylesheet checks
//                            still run on the whole tree
//       --root <app root>    check another copy of the app (default: the app this script sits in)
//       --tv <TV app root>   also list, for information, files in folders 40-55 with no TrueVision twin
//       --pin <commit>       read TrueVision at this commit with git (recommended; b2aa9151 on 01-Oct-2026)
//       --verbose            also list the files each check read
//       --self-test          prove every check bites, and every allowance holds, on planted copies in memory
//       --print-baseline     print the baseline document with this lint's part taken from the tree as it
//                            stands (to stdout; the file is only ever replaced by hand)
//
//   Exit 0 = no failure (warnings allowed). Exit 1 = at least one failure. Exit 2 = it could not run.
//   Reads only; writes nothing. Runs in seconds.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : ValeVision3D first; no TrueVision twin (WP-S01-08R of the parity
//                   plan, landed by package W0-04)
// - Parity        : new
// - Back-port     : TrueVision could lint its own tree the other way round; offered
//                   with the TrueVision lane (DR-36), not done here.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.0 ({{VVREL:W0-04}})
// - Written for the TrueVision parity programme (gate G4): identity and Noble
//   Architecture markers, banners and FILE lines, registered folder numbers,
//   stylesheet homes, the 01-Oct-2026 baseline and the named exemptions.
//
// =============================================================================

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, relative, join, extname, basename, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';


// -----------------------------------------------------------------------------
// REGION | Configuration
// -----------------------------------------------------------------------------

    const Na__Verify__ScriptDir    = dirname(fileURLToPath(import.meta.url));                    // <-- 80__Testing__PrototypeEnvironment
    const Na__Verify__BaselinePath = join(Na__Verify__ScriptDir, 'Na__Verify__ParityBaseline__.json');
    const Na__Verify__Registry     = 'ValeVision__NOTES__FolderNumberRegistry__.md';
    const Na__Verify__Src          = '02__Src__AppModules';
    const Na__Verify__Le           = '02__Src__AppModules/51__System__LayoutEditor';
    const Na__Verify__Loader       = '02__Src__AppModules/51__System__LayoutEditor/01__Core__Loader/Na__LayoutEditor__Loader__.js';
    const Na__Verify__CssIndex     = '03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css';

    // EXEMPTIONS | The named file and the history documents (F.8 C13)
    // ------------------------------------------------------------
    const Na__Verify__NamedExempt  = Na__Verify__Le + '/52__Feature__StatementWriter/09__Standard__Sections/Na__LayoutEditor__Statement__Standard__TrueVisionHub__.js';   // <-- Lands with W4-12
    const Na__Verify__History      = /(DEVLOG|PARITY__TrueVisionLedger|__PLAN__|__NOTES__|Research__|TASK__)/;
    // ------------------------------------------------------------

    // SCOPE | What ships, and the test folder
    // ------------------------------------------------------------
    const Na__Verify__Shipped = [
        { dir : '02__Src__AppModules',       ext : [ '.js', '.mjs', '.cjs', '.css', '.html', '.json' ] },
        { dir : '03__Style__AppStylesheets', ext : [ '.css' ] }
    ];
    const Na__Verify__Tests   = { dir : '80__Testing__PrototypeEnvironment', ext : [ '.js', '.mjs', '.cjs', '.css', '.py', '.html' ] };
    const Na__Verify__SkipDirs = new Set([ 'node_modules', 'dist', '.wrangler', '.git', '.claude', '__pycache__',
                                           '00__Archive', '00__ArchivedVersions', 'TestEnv__GlbFiles' ]);
    // ------------------------------------------------------------

    // MARKERS | Identity and Noble Architecture (most specific first)
    // ------------------------------------------------------------
    // Each is [ code, pattern, rule, what to do instead ]. Patterns are
    // assembled from pieces so this file's own text stays clear of them.
    const Na__Verify__T  = 'True' + 'Vision';
    const Na__Verify__Markers = [
        [ 'window-global',  new RegExp('window\\.' + Na__Verify__T + '__', 'g'),              'K2 K4', 'read a module accessor or a neutral window.Na__* global' ],
        [ 'na-marker',      new RegExp('30__' + Na__Verify__T + '__AppContent', 'g'),         'K2 V2', 'a Vale value in config, or the feature off (DR-43)' ],
        [ 'storage-key',    new RegExp(Na__Verify__T + '3D__', 'g'),                           'K2 B2', 'the app token ValeVision3D__ in storage and database names' ],
        [ 'identity-literal', new RegExp(Na__Verify__T + '__', 'g'),                           'K2 K3', 'the app token ValeVision__ (a ported file\'s TrueVision__ literal is a seam)' ],
        [ 'console-prefix', new RegExp('\\[' + Na__Verify__T + '3D', 'g'),                     'K2 C1', '[ValeVision3D <System>]' ],
        [ 'banner-token',   new RegExp(Na__Verify__T.toUpperCase() + '3D', 'g'),               'K2 H1', 'VALEVISION3D' ],
        [ 'na-route',       new RegExp('/api/' + Na__Verify__T.toLowerCase(), 'gi'),           'K2 R5', '/api/valevision/<feature>' ],
        [ 'na-header',      new RegExp('X-' + Na__Verify__T + '-', 'g'),                       'K2 R5', 'X-ValeVision-*' ],
        [ 'na-transport',   new RegExp('na-' + Na__Verify__T.toLowerCase() + '-api', 'g'),     'G6',    'the VV facade at TrueVision\'s paths (W0-12)' ],
        [ 'na-transport',   new RegExp('na-' + 'projectvision-local-dev', 'g'),                'R3 C.1 row 9', 'whitecardopedia-local-dev' ],
        [ 'na-marker',      new RegExp('Na' + 'ProjectPortal', 'g'),                           'K2 V2, R1', 'VaApps/Projects/<folderId>/ keys' ],
        [ 'na-marker',      new RegExp('/na-' + 'apps/', 'g'),                                 'K2 V2', 'a path in this app' ],
        [ 'na-marker',      new RegExp('Noble Architecture ' + 'Ltd', 'g'),                    'K2 V2', 'Vale\'s own wording in config' ],
        [ 'na-marker',      new RegExp(Na__Verify__T + ' 3D Project ' + 'Hub', 'g'),          'K2 V2, DR-43', 'the section stays in its one named file, never rendered' ]
    ];
    const Na__Verify__NaHost = /noble-architecture\.com/gi;
    // ------------------------------------------------------------

    // BANNERS | This app's and TrueVision's, in both header styles
    // ------------------------------------------------------------
    const Na__Verify__BannerVv = /^\s*(?:\/\/+|#+|\*|\/\*+|<!--)?\s*(?:VALEVISION3D\s+-\s|REGION\s*\|\s*ValeVision3D\s+-\s)/;
    const Na__Verify__BannerTv = new RegExp('^\\s*(?:\\/\\/+|#+|\\*|\\/\\*+|<!--)?\\s*(?:' + Na__Verify__T.toUpperCase() + '3D\\s+-\\s|REGION\\s*\\|\\s*' + Na__Verify__T + '3D\\s+-\\s)');
    const Na__Verify__FileLine = /^\s*(?:\/\/+|#+|\*|\/\*+|<!--)?\s*FILE\s*:\s*(\S+)/;
    // ------------------------------------------------------------

    // HEADER BLOCKS | Shared with Na__Verify__PortNotes__ (same rules)
    // ------------------------------------------------------------
    const Na__Verify__Marker       = '(?:\\/\\/+|#+|\\*|\\/\\*+|<!--)?';
    const Na__Verify__PortNoteHead = new RegExp('^\\s*' + Na__Verify__Marker + '\\s*PORT NOTE\\b[^:\\n]{0,40}:');
    const Na__Verify__LogHead      = new RegExp('^\\s*' + Na__Verify__Marker + '\\s*DEVELOPMENT LOG\\b');
    const Na__Verify__RuleLine     = new RegExp('^\\s*' + Na__Verify__Marker + '\\s*[-=]{4,}');
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Command Line
// -----------------------------------------------------------------------------

    // FUNCTION | Read the Options
    // ------------------------------------------------------------
    function Na__Verify__ReadOptions(argv) {
        const options = { files : [], root : null, tv : null, pin : null, verbose : false, selfTest : false, printBaseline : false };
        for (let index = 0; index < argv.length; index++) {
            const arg = argv[index];
            if (arg === '--files') {
                while (index + 1 < argv.length && !argv[index + 1].startsWith('--')) options.files.push(argv[++index]);
            }
            else if (arg === '--root')           options.root = argv[++index];
            else if (arg === '--tv')             options.tv = argv[++index];
            else if (arg === '--pin')            options.pin = argv[++index];
            else if (arg === '--verbose')        options.verbose = true;
            else if (arg === '--self-test')      options.selfTest = true;
            else if (arg === '--print-baseline') options.printBaseline = true;
            else throw new Error('Unknown option "' + arg + '" (see the USAGE block at the top of this file)');
        }
        if (options.pin && !options.tv) throw new Error('--pin needs --tv <TrueVision app root>');
        if (options.printBaseline && options.files.length) throw new Error('--print-baseline records the whole tree; it cannot take --files');
        return options;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Text Helpers
// -----------------------------------------------------------------------------

    // FUNCTION | Read a File as Text (BOM dropped)
    // ------------------------------------------------------------
    function Na__Verify__ReadText(path) {
        return readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
    }
    // ------------------------------------------------------------


    // FUNCTION | Fingerprint a File for the Baseline (same rule as Na__Verify__PortNotes__)
    // ------------------------------------------------------------
    function Na__Verify__Fingerprint(text) {
        const normal = text.replace(/^\uFEFF/, '')
                           .replace(/\r\n?/g, '\n')
                           .replace(/\{\{VVREL[^}\n]*\}\}/g, '#')
                           .replace(/\bv?\d+\.\d+\.\d+\b/g, '#');
        return createHash('sha1').update(normal, 'utf8').digest('hex').slice(0, 16);
    }
    // ------------------------------------------------------------


    // FUNCTION | Mark Which Lines Are Comment Lines (same rule as Na__Verify__PortNotes__)
    // ------------------------------------------------------------
    function Na__Verify__CommentLines(lines, ext) {
        const flags  = new Array(lines.length).fill(false);
        let   closer = null;
        for (let index = 0; index < lines.length; index++) {
            const text = lines[index].trim();
            if (closer) {
                flags[index] = true;
                const at = text.indexOf(closer);
                if (at !== -1) {
                    const after = text.slice(at + closer.length).trim();
                    closer = null;
                    if (after.length && !after.startsWith('//')) flags[index] = false;
                }
                continue;
            }
            if (text === '') continue;
            if (text.startsWith('//') || (ext === '.py' && text.startsWith('#'))) { flags[index] = true; continue; }
            if (text.startsWith('/*') || text.startsWith('<!--')) {
                const open  = text.startsWith('/*') ? '/*' : '<!--';
                const close = open === '/*' ? '*/' : '-->';
                const at    = text.indexOf(close, open.length);
                flags[index] = true;
                if (at === -1) closer = close;
                else if (text.slice(at + close.length).trim().length) flags[index] = false;
            }
        }
        return flags;
    }
    // ------------------------------------------------------------


    // FUNCTION | Mark the Lines Inside PORT NOTE and DEVELOPMENT LOG Blocks
    // ------------------------------------------------------------
    // A block runs from its heading line to the next rule line, the next
    // heading, the end of a /* */ block, or the first line that is not a
    // comment - so code can never sit inside one.
    // ------------------------------------------------------------
    function Na__Verify__ExemptLines(lines, ext) {
        const flags  = Na__Verify__CommentLines(lines, ext);
        const exempt = new Array(lines.length).fill(false);
        for (let index = 0; index < lines.length; index++) {
            if (!flags[index]) continue;
            if (!Na__Verify__PortNoteHead.test(lines[index]) && !Na__Verify__LogHead.test(lines[index])) continue;
            exempt[index] = true;
            let end = index + 1;
            while (end < lines.length && flags[end]
                   && !Na__Verify__RuleLine.test(lines[end])
                   && !Na__Verify__PortNoteHead.test(lines[end])
                   && !Na__Verify__LogHead.test(lines[end])) {
                exempt[end] = true;
                const text = lines[end].trim();
                end += 1;
                if (!text.startsWith('//') && (text.indexOf('*/') !== -1 || text.indexOf('-->') !== -1)) break;
            }
            index = end - 1;
        }
        return exempt;
    }
    // ------------------------------------------------------------


    // FUNCTION | The App-Root Relative Path, With Forward Slashes
    // ------------------------------------------------------------
    function Na__Verify__Rel(appRoot, path) {
        return relative(appRoot, path).split('\\').join('/');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | File Checks
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Is This File in the Drawing System (folders 40-55)?
    // ------------------------------------------------------------
    function Na__Verify__InDrawingSystem(rel) {
        const match = rel.match(/^02__Src__AppModules\/(\d\d)__/);
        return !!match && Number(match[1]) >= 40 && Number(match[1]) <= 55;
    }
    // ------------------------------------------------------------


    // FUNCTION | Find the Identity and Noble Architecture Hits on One Line
    // ------------------------------------------------------------
    // One finding per occurrence, with the most specific code: a
    // window.TrueVision__ read is reported as that, not also as a literal.
    // ------------------------------------------------------------
    function Na__Verify__LineHits(line) {
        const hits  = [];
        const taken = [];                                                                        // <-- [start, end) spans already reported
        const free  = (start, end) => !taken.some(([a, b]) => start < b && end > a);
        Na__Verify__Markers.forEach(([ code, pattern, rule, instead ]) => {
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(line)) !== null) {
                const start = match.index;
                const end   = start + match[0].length;
                if (free(start, end)) {
                    taken.push([ start, end ]);
                    hits.push({ code, rule, message : '"' + match[0] + '" - instead: ' + instead });
                }
            }
        });
        Na__Verify__NaHost.lastIndex = 0;
        let match;
        while ((match = Na__Verify__NaHost.exec(line)) !== null) {
            const before = line.slice(Math.max(0, match.index - 4), match.index).toLowerCase();
            const after  = line.slice(match.index + match[0].length);
            if ((before.endsWith('cdn.') && after.startsWith('/VaApps/')) || (before.endsWith('www.') && after.startsWith('/assets/'))) continue;
            const path = (after.match(/^[^\s'"`)]*/) || [ '' ])[0];
            const kind = /^\/q\//.test(path) ? ' (the project QR resolver)' : /^\/s\//.test(path) ? ' (the share-link resolver)' : '';
            hits.push({ code : 'na-url', rule : 'K2 V2, DR-43',
                        message : '"' + line.slice(Math.max(0, match.index - 4), match.index + match[0].length) + path.slice(0, 40) + '"' + kind
                                + ' - only cdn.noble-architecture.com/VaApps/ and www.noble-architecture.com/assets/ are this app\'s own' });
        }
        return hits;
    }
    // ------------------------------------------------------------


    // FUNCTION | Check One File
    // ------------------------------------------------------------
    // kind is 'shipped' or 'test'. Returns [{ code, line, text, rule, message }].
    // ------------------------------------------------------------
    function Na__Verify__CheckFile(rel, text, kind) {
        const findings = [];
        if (rel === Na__Verify__NamedExempt || Na__Verify__History.test(basename(rel))) return findings;
        const ext   = extname(rel).toLowerCase();
        const lines = text.split(/\r?\n/);

        // BANNER | TrueVision's banner fails anywhere; the drawing system needs this app's
        // ------------------------------------------------------------
        const top = lines.slice(0, 6);
        const tvBannerAt = top.findIndex((l) => Na__Verify__BannerTv.test(l));
        if (tvBannerAt !== -1) {
            findings.push({ code : 'banner-tv', line : tvBannerAt + 1, text : lines[tvBannerAt].trim(), rule : 'K2 H1',
                            message : 'TrueVision\'s banner: the banner reads VALEVISION3D (or REGION | ValeVision3D) followed by TrueVision\'s text' });
        }
        if (kind === 'shipped' && Na__Verify__InDrawingSystem(rel) && [ '.js', '.mjs', '.css' ].includes(ext)) {
            if (tvBannerAt === -1 && !top.some((l) => Na__Verify__BannerVv.test(l))) {
                findings.push({ code : 'banner-missing', line : 1, text : (lines[0] || '').trim(), rule : 'K2 H1',
                                message : 'no ValeVision3D banner in the first lines ("VALEVISION3D - " or a stylesheet\'s "REGION | ValeVision3D - ")' });
            }
            const fileAt = lines.slice(0, 40).findIndex((l) => Na__Verify__FileLine.test(l));
            if (fileAt === -1 && ext !== '.css') {
                findings.push({ code : 'file-line', line : 1, text : (lines[0] || '').trim(), rule : 'K2 F2',
                                message : 'no FILE line in the header' });
            } else if (fileAt !== -1) {
                const named = lines[fileAt].match(Na__Verify__FileLine)[1];
                if (named !== basename(rel)) {
                    findings.push({ code : 'file-line', line : fileAt + 1, text : lines[fileAt].trim(), rule : 'K2 F2',
                                    message : 'FILE line names "' + named + '", not this file (' + basename(rel) + ')' });
                }
            }
        }
        if (kind !== 'shipped') return findings;

        // IDENTITY AND NOBLE ARCHITECTURE | every line outside the exempt blocks
        // ------------------------------------------------------------
        const exempt = ext === '.json' ? new Array(lines.length).fill(false) : Na__Verify__ExemptLines(lines, ext);
        lines.forEach((line, index) => {
            if (exempt[index]) return;
            Na__Verify__LineHits(line).forEach((hit) => {
                if (index === tvBannerAt && (hit.code === 'banner-token' || hit.code === 'identity-literal')) return;   // <-- Already the banner finding
                findings.push({ code : hit.code, line : index + 1, text : line.trim(), rule : hit.rule, message : hit.message });
            });
        });
        return findings;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Tree Checks: Folder Numbers and Stylesheet Homes
// -----------------------------------------------------------------------------

    // FUNCTION | Read the Folder Number Registry
    // ------------------------------------------------------------
    // Section 2.1: one row per number, "| NN | TrueVision | ValeVision |
    // Whitecardopedia | class | rule |". Section 3: "| LE/NN | TrueVision |
    // ValeVision | class | rule |". Folder cells hold `name` or -.
    // ------------------------------------------------------------
    function Na__Verify__ReadRegistry(text) {
        const cell = (c) => { const m = c.trim().match(/^`([^`]+)`$/); return m ? m[1] : null; };
        const top = new Map();
        const le  = new Map();
        text.split(/\r?\n/).forEach((line) => {
            const row = line.match(/^\|\s*(LE\/)?(\d\d)\s*\|(.*)\|\s*$/);
            if (!row) return;
            const cells = row[3].split('|');
            if (row[1]) le.set(row[2],  { tv : cell(cells[0]), vv : cell(cells[1]), cls : (cells[2] || '').trim() });
            else        top.set(row[2], { tv : cell(cells[0]), vv : cell(cells[1]), cls : (cells[3] || '').trim() });
        });
        return { top, le };
    }
    // ------------------------------------------------------------


    // FUNCTION | Check Folder Names Against the Registry
    // ------------------------------------------------------------
    // folders: [{ level : 'top' | 'le', name }]. Returns findings.
    // ------------------------------------------------------------
    function Na__Verify__CheckFolders(folders, registry) {
        const findings = [];
        folders.forEach(({ level, name }) => {
            const where = level === 'top' ? Na__Verify__Src + '/' + name : Na__Verify__Le + '/' + name;
            const match = name.match(/^(\d\d)__/);
            const rows  = level === 'top' ? registry.top : registry.le;
            const row   = match ? rows.get(match[1]) : null;
            const ok    = !!row && (row.vv === name || (row.cls === 'shared' && row.tv === name));
            if (!ok) {
                findings.push({ file : where, code : 'folder-unregistered', line : 0, text : name, rule : 'K2 N1-N4, DR-03',
                                message : !match ? 'not a numbered NN__ folder'
                                        : !row  ? 'number ' + match[1] + ' has no row in the registry'
                                        : 'number ' + match[1] + ' is registered as ' + (row.cls || '?') + (row.vv ? ' for ' + row.vv : '')
                                          + (row.tv ? ' (TrueVision: ' + row.tv + ')' : '') + ', not for this folder' });
            }
        });
        return findings;
    }
    // ------------------------------------------------------------


    // FUNCTION | List the Folders the Registry Governs
    // ------------------------------------------------------------
    function Na__Verify__ListFolders(appRoot) {
        const dirs = (path) => existsSync(path) ? readdirSync(path).filter((n) => statSync(join(path, n)).isDirectory()) : [];
        return [ ...dirs(join(appRoot, Na__Verify__Src)).map((name) => ({ level : 'top', name })),
                 ...dirs(join(appRoot, Na__Verify__Le)).map((name) => ({ level : 'le', name })) ];
    }
    // ------------------------------------------------------------


    // FUNCTION | Find Every Home a Layout Editor Stylesheet Has
    // ------------------------------------------------------------
    // Homes: the loader's Na__LeLoad__STYLESHEETS, an @import in the CSS
    // index, a module's own new URL('...css', import.meta.url), a <link> in
    // index.html. Returns Map(app-root relative css path -> [home, ...]).
    // ------------------------------------------------------------
    function Na__Verify__StylesheetHomes(appRoot, sources) {
        const homes  = new Map();
        const add    = (path, home) => { const rel = Na__Verify__Rel(appRoot, path); if (!homes.has(rel)) homes.set(rel, []); homes.get(rel).push(home); };
        const loader = sources.get(Na__Verify__Loader);
        if (loader) {
            const list = loader.match(/Na__LeLoad__STYLESHEETS\s*=\s*\[([\s\S]*?)\];/);
            if (list) {
                for (const m of list[1].matchAll(/new\s+URL\(\s*['"]([^'"]+\.css)['"]\s*,\s*import\.meta\.url\s*\)/g)) {
                    add(resolve(dirname(join(appRoot, Na__Verify__Loader)), m[1]), 'Na__LeLoad__STYLESHEETS');
                }
            }
        }
        const index = sources.get(Na__Verify__CssIndex);
        if (index) {
            const code = index.replace(/\/\*[\s\S]*?\*\//g, ' ');
            for (const m of code.matchAll(/@import\s+url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
                add(resolve(dirname(join(appRoot, Na__Verify__CssIndex)), m[1]), 'the CSS index');
            }
        }
        sources.forEach((text, rel) => {
            if (rel === Na__Verify__Loader || !/\.m?js$/.test(rel) || !rel.startsWith(Na__Verify__Src + '/')) return;
            for (const m of text.matchAll(/new\s+URL\(\s*['"](\.{1,2}\/[^'"]+\.css)['"]\s*,\s*import\.meta\.url\s*\)/g)) {
                add(resolve(dirname(join(appRoot, rel)), m[1]), 'linked by ' + basename(rel));
            }
        });
        const page = sources.get('index.html');
        if (page) {
            for (const m of page.matchAll(/<link[^>]+href=['"]([^'"]+\.css)['"]/g)) add(resolve(appRoot, m[1]), 'index.html <link>');
        }
        return homes;
    }
    // ------------------------------------------------------------


    // FUNCTION | Check Every Layout Editor Stylesheet Has Exactly One Home
    // ------------------------------------------------------------
    function Na__Verify__CheckStylesheetHomes(cssFiles, homes) {
        const findings = [];
        cssFiles.forEach((rel) => {
            const found = homes.get(rel) || [];
            if (found.length === 1) return;
            findings.push({ file : rel, code : 'stylesheet-home', line : 0, text : basename(rel), rule : 'K2 S5, R3 C.2 (b)',
                            message : found.length === 0
                                ? 'no home: add it to Na__LeLoad__STYLESHEETS in TrueVision\'s CSS-index order, or have its module link it'
                                : 'two homes (' + found.join(', ') + '): a stylesheet has exactly one' });
        });
        return findings;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | TrueVision (only for the --tv information listing)
// -----------------------------------------------------------------------------

    // FUNCTION | List TrueVision's Files, at a Pin or in Its Working Tree
    // ------------------------------------------------------------
    function Na__Verify__TrueVisionFiles(tvRoot, pin) {
        const root = resolve(tvRoot);
        if (!existsSync(root)) throw new Error('TrueVision root not found: ' + root);
        if (pin) {
            const top    = execFileSync('git', [ '-C', root, 'rev-parse', '--show-toplevel' ]).toString('utf8').trim();
            const prefix = execFileSync('git', [ '-C', root, 'rev-parse', '--show-prefix' ]).toString('utf8').trim();
            const names  = execFileSync('git', [ '-C', top, 'ls-tree', '-r', '--name-only', pin, '--', prefix || '.' ], { maxBuffer : 256 * 1024 * 1024 })
                .toString('utf8').split('\n').filter(Boolean).map((p) => p.slice(prefix.length));
            return { label : root + ' at ' + pin + ' (git)', files : new Set(names) };
        }
        const files = new Set();
        const walk  = (dir) => {
            for (const name of readdirSync(dir)) {
                if (Na__Verify__SkipDirs.has(name)) continue;
                const full = join(dir, name);
                if (statSync(full).isDirectory()) walk(full); else files.add(Na__Verify__Rel(root, full));
            }
        };
        walk(join(root, Na__Verify__Src));
        return { label : root + ' (working tree - pass --pin <commit> to read the pinned state)', files };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Collect, Judge Against the Baseline, Report
// -----------------------------------------------------------------------------

    // FUNCTION | List Every File in Scope With Its Kind
    // ------------------------------------------------------------
    function Na__Verify__ListFiles(appRoot) {
        const files = [];
        const walk  = (dir, exts, kind) => {
            if (!existsSync(dir)) return;
            for (const name of readdirSync(dir)) {
                if (Na__Verify__SkipDirs.has(name)) continue;
                const full = join(dir, name);
                if (statSync(full).isDirectory()) walk(full, exts, kind);
                else if (exts.includes(extname(name).toLowerCase())) files.push({ path : full, kind });
            }
        };
        Na__Verify__Shipped.forEach((scope) => walk(join(appRoot, scope.dir), scope.ext, 'shipped'));
        walk(join(appRoot, Na__Verify__Tests.dir), Na__Verify__Tests.ext, 'test');
        readdirSync(appRoot).filter((n) => /\.html?$/i.test(n) && statSync(join(appRoot, n)).isFile())
            .forEach((n) => files.push({ path : join(appRoot, n), kind : 'shipped' }));
        return files;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Baseline Document
    // ------------------------------------------------------------
    function Na__Verify__ReadBaseline() {
        if (!existsSync(Na__Verify__BaselinePath)) return { document : null, entries : new Map() };
        const document = JSON.parse(Na__Verify__ReadText(Na__Verify__BaselinePath));
        const entries  = new Map();
        ((document.parityNaming || {}).files || []).forEach((entry) => entries.set(entry.file.replace(/^VV\//, ''), entry));
        return { document, entries };
    }
    // ------------------------------------------------------------


    // FUNCTION | Main
    // ------------------------------------------------------------
    function Na__Verify__Main() {
        const options = Na__Verify__ReadOptions(process.argv.slice(2));
        if (options.selfTest) return Na__Verify__SelfTest() ? 0 : 1;

        const appRoot  = resolve(options.root || resolve(Na__Verify__ScriptDir, '..'));
        const baseline = Na__Verify__ReadBaseline();
        const listed   = Na__Verify__ListFiles(appRoot);
        const sources  = new Map();
        listed.forEach(({ path }) => { if (/\.(m?js|css|html?)$/i.test(path)) sources.set(Na__Verify__Rel(appRoot, path), null); });

        // FILES | the named set (a package's own) or the whole tree
        // ------------------------------------------------------------
        let targets = listed;
        if (options.files.length) {
            const kinds = new Map(listed.map((f) => [ resolve(f.path), f.kind ]));
            targets = options.files.map((p) => {
                const path = resolve(isAbsolute(p) ? p : join(appRoot, p));
                return { path, kind : kinds.get(path) || (Na__Verify__Rel(appRoot, path).startsWith(Na__Verify__Tests.dir + '/') ? 'test' : 'shipped') };
            });
        }

        const results = [];
        targets.forEach(({ path, kind }) => {
            const rel = Na__Verify__Rel(appRoot, path);
            if (!existsSync(path)) { results.push({ rel, findings : [ { code : 'missing', line : 0, text : '', rule : '-', message : 'file not found' } ] }); return; }
            const text = Na__Verify__ReadText(path);
            results.push({ rel, text, fingerprint : Na__Verify__Fingerprint(text), findings : Na__Verify__CheckFile(rel, text, kind) });
        });

        // TREE | folder numbers and stylesheet homes, always on the whole tree
        // ------------------------------------------------------------
        const treeFindings = [];
        const registryPath = join(appRoot, Na__Verify__Registry);
        let registry = null;
        if (!existsSync(registryPath)) {
            treeFindings.push({ file : Na__Verify__Registry, code : 'registry', line : 0, text : '', rule : 'DR-03', message : 'the folder number registry is missing, so no folder can be checked' });
        } else {
            registry = Na__Verify__ReadRegistry(Na__Verify__ReadText(registryPath));
            if (registry.top.size !== 99) treeFindings.push({ file : Na__Verify__Registry, code : 'registry', line : 0, text : '', rule : 'DR-03',
                                                             message : 'section 2.1 should have one row per number 01-99; it has ' + registry.top.size });
            treeFindings.push(...Na__Verify__CheckFolders(Na__Verify__ListFolders(appRoot), registry));
        }
        [ Na__Verify__Loader, Na__Verify__CssIndex, 'index.html' ].forEach((rel) => { if (existsSync(join(appRoot, rel))) sources.set(rel, null); });
        sources.forEach((value, rel) => sources.set(rel, Na__Verify__ReadText(join(appRoot, rel))));
        const leCss = Array.from(sources.keys()).filter((rel) => rel.startsWith(Na__Verify__Le + '/') && rel.endsWith('.css'));
        treeFindings.push(...Na__Verify__CheckStylesheetHomes(leCss, Na__Verify__StylesheetHomes(appRoot, sources)));

        // PRINT BASELINE
        // ------------------------------------------------------------
        if (options.printBaseline) {
            const document = baseline.document || {};
            document.parityNaming = {
                recorded : new Date().toISOString().slice(0, 10),
                rule     : 'Na__Verify__ParityNaming__.mjs --print-baseline: every per-line finding on the tree as it stood (folder and stylesheet findings are never held)',
                files    : results.filter((r) => r.text !== undefined && r.findings.length)
                    .map((r) => ({ file : 'VV/' + r.rel, fingerprint : r.fingerprint, findings : r.findings.map((f) => ({ code : f.code, text : f.text })) }))
            };
            process.stdout.write(JSON.stringify(document, null, 1) + '\n');
            return 0;
        }

        // JUDGE | a held finding prints WARN while its file is as recorded
        // ------------------------------------------------------------
        const report = [];
        results.forEach((r) => {
            const entry = baseline.entries.get(r.rel);
            const holds = entry && entry.fingerprint === r.fingerprint ? entry.findings : [];
            r.findings.forEach((f) => {
                const held = holds.some((h) => h.code === f.code && h.text === f.text);
                report.push({ severity : held ? 'WARN' : 'FAIL', file : r.rel, ...f, why : held ? 'baseline 01-Oct-2026' : null });
            });
        });
        treeFindings.forEach((f) => report.push({ severity : 'FAIL', ...f }));

        const fails = report.filter((f) => f.severity === 'FAIL');
        const warns = report.filter((f) => f.severity === 'WARN');
        const lapsed = results.filter((r) => baseline.entries.has(r.rel) && baseline.entries.get(r.rel).fingerprint !== r.fingerprint);

        console.log('ValeVision3D - parity naming lint (identity, Noble Architecture markers, headers, folder numbers, stylesheet homes)');
        console.log('  app root : ' + appRoot);
        console.log('  checked  : ' + (options.files.length ? options.files.length + ' named file(s)'
                    : results.filter((r) => !r.rel.startsWith(Na__Verify__Tests.dir + '/')).length + ' shipped files (02__Src__AppModules, 03__Style__AppStylesheets, the root pages) and '
                      + results.filter((r) => r.rel.startsWith(Na__Verify__Tests.dir + '/')).length + ' test-folder files (banner only)')
                    + '; ' + (registry ? Na__Verify__ListFolders(appRoot).length + ' folders against the registry' : 'no registry') + '; ' + leCss.length + ' Layout Editor stylesheets');
        console.log('  exempt   : PORT NOTE and DEVELOPMENT LOG blocks; history documents; ' + Na__Verify__NamedExempt);
        console.log('  baseline : ' + (baseline.document ? 'Na__Verify__ParityBaseline__.json - ' + baseline.entries.size + ' file(s) recorded '
                    + ((baseline.document.parityNaming || {}).recorded || '') + (lapsed.length ? '; ' + lapsed.length + ' since rewritten (their full checks apply)' : '') : 'none found (every finding fails)'));
        console.log('');
        [ ...fails, ...warns ].forEach((f) => {
            console.log('  ' + f.severity + '  ' + f.file + (f.line ? ':' + f.line : '') + '  ' + f.code + '  (' + f.rule + ')');
            console.log('        ' + f.message + (f.why ? '   [' + f.why + ']' : ''));
            if (f.text && f.line) console.log('        > ' + f.text.slice(0, 150));
        });
        if (report.length) console.log('');

        if (options.tv) {
            const tv = Na__Verify__TrueVisionFiles(options.tv, options.pin);
            const own = Array.from(sources.keys()).concat(results.map((r) => r.rel))
                .filter((rel, at, all) => all.indexOf(rel) === at && Na__Verify__InDrawingSystem(rel) && !tv.files.has(rel)).sort();
            console.log('  INFO  files in folders 40-55 with no TrueVision twin at the same path (TrueVision ' + tv.label + '): ' + own.length);
            own.forEach((rel) => console.log('        ' + rel));
            console.log('');
        }
        if (options.verbose && lapsed.length) {
            console.log('  Baseline entries that no longer apply (the file was written since 01-Oct-2026):');
            lapsed.forEach((r) => console.log('        ' + r.rel));
            console.log('');
        }

        const summary = fails.length + ' fail, ' + warns.length + ' warn';
        console.log(fails.length === 0 ? '  RESULT: PASS (' + summary + ')' : '  RESULT: FAIL (' + summary + ')');
        return fails.length === 0 ? 0 : 1;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Self-Test (planted copies in memory; nothing is written)
// -----------------------------------------------------------------------------

    // FUNCTION | Prove Every Check Bites and Every Allowance Holds
    // ------------------------------------------------------------
    // The real AutoSave module and the real registry are read from this tree;
    // TrueVision's TrueVisionHub file is read at the pin when TrueVision is on
    // this machine (otherwise a stand-in with the same markers is used).
    // ------------------------------------------------------------
    function Na__Verify__SelfTest() {
        const appRoot = resolve(Na__Verify__ScriptDir, '..');
        const T       = Na__Verify__T;
        const module  = (body) => [
            '// =============================================================================',
            '// VALEVISION3D - SELF TEST - PLANTED',
            '// =============================================================================',
            '//',
            '// FILE       : Na__Planted__.js',
            '//',
            '// DESCRIPTION:',
            '// - A planted module.',
            '//',
            '// =============================================================================',
            '',
            ...body,
            ''
        ].join('\n');
        const rel   = [ Na__Verify__Le, '07__Core__SheetData', 'Na__Planted__.js' ].join('/');
        const codes = (text, path) => Na__Verify__CheckFile(path || rel, text, 'shipped').map((f) => f.code);

        let autoSave = null, autoSaveLine = 0;
        const autoSaveRel  = [ Na__Verify__Le, '07__Core__SheetData', 'Na__LayoutEditor__AutoSave__.js' ].join('/');
        const autoSavePath = join(appRoot, autoSaveRel);
        if (existsSync(autoSavePath)) {
            autoSave = Na__Verify__ReadText(autoSavePath);
            autoSaveLine = autoSave.split(/\r?\n/).findIndex((l) => l.indexOf('window.' + T + '__') !== -1) + 1;
        }
        let hub = null, hubFrom = 'a stand-in';
        try {
            hub = execFileSync('git', [ '-C', 'D:\\11_RefLib__StudioRepository__RemoteSystem\\NaWeb', 'show',
                'b2aa9151:na-apps/30__' + T + '__CoreAppCode/' + Na__Verify__NamedExempt ], { stdio : [ 'ignore', 'pipe', 'ignore' ] }).toString('utf8');
            hubFrom = 'TrueVision\'s file at b2aa9151';
        } catch (error) {
            hub = '// ' + T.toUpperCase() + '3D - STATEMENT - STANDARD - HUB\nconst ID = \'' + T + 'Hub\';\nconst TITLE = \'' + T + ' 3D Project Hub\';\nconst K = \'' + T + '__Hub\';\n';
        }
        const registry = existsSync(join(appRoot, Na__Verify__Registry)) ? Na__Verify__ReadRegistry(Na__Verify__ReadText(join(appRoot, Na__Verify__Registry))) : null;
        const planted  = (level, number, name) => ({ level, name : [ number, ...name ].join('__') });

        const cases = [
            [ 'a clean planted module passes',
              codes(module([ 'export function Na__Planted__Run() { return 1; }' ])).length === 0 ],
            [ 'FAILS on a planted ' + T + '__ literal',
              codes(module([ 'const Na__Planted__Key = \'' + T + '__Vegetation\';' ])).includes('identity-literal') ],
            [ 'FAILS on a planted window.' + T + '__ read',
              codes(module([ 'const Na__Planted__Ctx = window.' + T + '__Pwa__ProjectContext;' ])).includes('window-global') ],
            [ 'FAILS on a planted Na' + 'ProjectPortal string',
              codes(module([ 'const Na__Planted__Key = \'Na' + 'ProjectPortal/2026/RB05/project.json\';' ])).includes('na-marker') ],
            [ 'FAILS on the QR /q/ and share /s/ resolvers',
              codes(module([ 'const a = \'https://www.noble-architecture.com/q/RB05\';', 'const b = \'https://noble-architecture.com/s/abc\';' ]))
                  .filter((c) => c === 'na-url').length === 2 ],
            [ 'FAILS on a [' + T + '3D console prefix, a ' + T + '3D__ storage key and an X-' + T + '- header',
              [ 'console-prefix', 'storage-key', 'na-header' ].every((c) => codes(module([ 'console.warn(\'[' + T + '3D LayoutEditor] x\');',
                  'localStorage.getItem(\'' + T + '3D__AuthoringUnlocked\');', 'headers[\'X-' + T + '-Drawings-Base\'] = 1;' ])).includes(c)) ],
            [ 'FAILS on TrueVision\'s banner, in either header style',
              codes(module([]).replace('VALEVISION3D - SELF', T.toUpperCase() + '3D - SELF')).includes('banner-tv')
              && codes('/* ============ */\n/* REGION  |  ' + T + '3D - Layout Editor Web Viewer Styles */\n', rel.replace(/\.js$/, '.css')).includes('banner-tv') ],
            [ 'FAILS on a drawing-system module with no banner, or a FILE line naming another file',
              codes('export const Na__Planted__X = 1;\n').includes('banner-missing')
              && codes(module([]).replace('FILE       : Na__Planted__.js', 'FILE       : Na__Other__.js')).includes('file-line') ],
            [ 'FAILS on a ' + T + '__ literal in a DESCRIPTION comment (only PORT NOTE and DEVELOPMENT LOG blocks are exempt)',
              codes(module([]).replace('// - A planted module.', '// - Reads ' + T + '__Linetype__DoorSwings.')).includes('identity-literal') ],
            [ 'PASSES this app\'s cdn.noble-architecture.com/VaApps and font URLs',
              codes(module([ 'const a = \'https://cdn.noble-architecture.com/VaApps/Projects\';',
                             'const f = \'https://www.noble-architecture.com/assets/AD04_-_LIBR_-_Common_-_Front-Files/AD04_01_-_Standard-Font_-_Open-Sans-Regular.ttf\';' ])).length === 0 ],
            [ 'PASSES a ' + T + ' string inside a PORT NOTE block (the real AutoSave__.js:' + autoSaveLine + ')',
              autoSave !== null && autoSaveLine > 0
              && Na__Verify__CheckFile(autoSaveRel, autoSave, 'shipped').length === 0 ],
            [ '...and the same line FAILS once it is moved out of the PORT NOTE into code',
              codes(module([ autoSave ? autoSave.split(/\r?\n/)[autoSaveLine - 1].replace(/^\s*\/\/\s*/, 'const Na__Planted__Note = "') + '";' : '' ])).length > 0 ],
            [ 'PASSES a ' + T + '__ literal inside a DEVELOPMENT LOG block (TrueVision\'s log taken verbatim, DR-34)',
              codes(module([]).replace('// =============================================================================\n\n',
                  '// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:\n// 21-Sep-2026 - Version 1.0.0\n// - FileName is '
                  + T + '__DrawingNotes__.json.\n//\n// =============================================================================\n\n')).length === 0 ],
            [ 'PASSES the named TrueVisionHub file (' + hubFrom + ')',
              Na__Verify__CheckFile(Na__Verify__NamedExempt, hub, 'shipped').length === 0 ],
            [ '...and FAILS the same content at any other path',
              Na__Verify__CheckFile(Na__Verify__NamedExempt.replace('TrueVisionHub__', 'Planted__'), hub, 'shipped').length > 0 ],
            [ 'FAILS an unregistered folder number (08 is TrueVision growth, 00 has no row, 28 is registered for another folder)',
              registry !== null && Na__Verify__CheckFolders([ planted('top', '08', [ 'System', 'PlantedForSelfTest' ]),
                                                              planted('top', '00', [ 'PlantedForSelfTest' ]),
                                                              planted('top', '28', [ 'System', 'PlantedForSelfTest' ]),
                                                              planted('le',  '99', [ 'Feature', 'PlantedForSelfTest' ]) ], registry).length === 4 ],
            [ 'PASSES every folder the registry names for this app, and a TrueVision folder landing at its shared number',
              registry !== null && Na__Verify__CheckFolders([ ...Na__Verify__ListFolders(appRoot),
                  planted('top', '47', [ 'System', 'DrawingPlanes' ]), planted('le', '28', [ 'System', 'ObjectSnap' ]) ], registry).length === 0 ],
            [ 'FAILS a Layout Editor stylesheet with no home, and one with two',
              Na__Verify__CheckStylesheetHomes([ 'a.css', 'b.css', 'c.css' ], new Map([ [ 'b.css', [ 'x' ] ], [ 'c.css', [ 'x', 'y' ] ] ])).length === 2 ],
            [ 'the fingerprint ignores line endings, so a checkout does not take a file off the baseline',
              Na__Verify__Fingerprint(module([ 'a' ])) === Na__Verify__Fingerprint(module([ 'a' ]).replace(/\n/g, '\r\n')) ]
        ];
        console.log('ValeVision3D - parity naming lint self-test (planted copies in memory)');
        let failed = 0;
        cases.forEach(([ name, ok ]) => { if (!ok) failed++; console.log((ok ? '  PASS  ' : '  FAIL  ') + name); });
        console.log(failed === 0 ? '\n  Every self-test case passed (' + cases.length + ').' : '\n  ' + failed + ' self-test case(s) FAILED.');
        return failed === 0;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Run
// -----------------------------------------------------------------------------

    try {
        process.exitCode = Na__Verify__Main();
    } catch (error) {
        console.error('Na__Verify__ParityNaming__: ' + (error && error.message ? error.message : error));
        process.exitCode = 2;
    }

// endregion -------------------------------------------------------------------
