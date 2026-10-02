// =============================================================================
// VALEVISION3D - VERIFY - PORT NOTES, MODULE LOGS AND RELEASE PLACEHOLDERS
// =============================================================================
//
// FILE       : Na__Verify__PortNotes__.mjs
// NAMESPACE  : Na__Verify
// MODULE     : Port Note and Watermark Verifier
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Prove every port names the TrueVision version it came from, every module log reads in order, and no release placeholder is left where it should not be
// CREATED    : 01-Oct-2026
//
// DESCRIPTION:
// - SOURCE VERSION. A PORT NOTE whose "Ported from" names TrueVision3D must
//   carry a "Source version" line, and that line must give both numbers:
//   TrueVision's module version and the TrueVision3D app version it shipped
//   in, as K2 rule H5 writes it -
//       // - Source version: 1.0.0 (TrueVision3D v2.113.0, 21-Sep-2026; read at b2aa9151)
//   The older form with a date and no app version ("1.0.0 (21-Sep-2026)", the
//   72 Phase 0-5 headers) is still read, and reported as needing the app
//   version (S11 B8). Without both numbers nobody can tell which TrueVision
//   state the file holds, because the two apps' module versions are not
//   comparable (DR-34).
// - LOG ORDER. A DEVELOPMENT LOG reads in one direction and never repeats a
//   version. In the drawing system (folders 40-55, the Layout Editor
//   included) and in every file ported from TrueVision the direction is
//   TrueVision's, newest first, because a whole-file port takes TrueVision's
//   log verbatim. Elsewhere a log may run oldest first, as many of this
//   app's older 3D-tab logs do, as long as it keeps to it. An entry out of
//   step misleads every tool that reads the top of a log (S11 B7: History
//   carried two 1.3.0 entries, Toolbar two 1.8.0 and two 1.9.0).
// - RELEASE PLACEHOLDERS. A package does not know which ValeVision release
//   its work ships in, so it writes the VVREL placeholder - two braces,
//   VVREL, a colon, its package id, two braces - and the wave's Parity
//   Scribe replaces every one (F.5.5). This verifier lists them as PENDING,
//   fails a malformed one (an id that is not a package id such as W0-04),
//   fails one outside a comment (it would reach the page), and with --scribe
//   fails every one left, which is the scribe's own check after the pass.
// - THE WATERMARK (--tv). For each module both apps have at the same path,
//   the TrueVision DEVELOPMENT LOG entries dated after this app's newest log
//   entry: what this app's copy cannot contain. This is the S11 report's c.1
//   rule exactly - same-day entries are not flagged, and an entry that names
//   a TrueVision3D release carries it in brackets - so a package can prove
//   it left nothing behind. Read it beside the PORT NOTE's Source version:
//   an entry this app writes for itself after a port (a records note, a
//   seam) moves its newest date on and hides older TrueVision entries, the
//   limit S11 itself recorded.
// - THE BASELINE. Na__Verify__ParityBaseline__.json, beside this file,
//   records the headers and logs that were already short of the rules on
//   01-Oct-2026, when this verifier landed (F.8 C13: 257 files carried a
//   PORT NOTE and only 72 a Source version line). A finding the baseline
//   holds for a file prints WARN, not FAIL - but only while the file is as
//   it was recorded. The first package that writes the file takes it off the
//   list without editing anything: the file's fingerprint no longer matches,
//   and its own checks apply in full. The fingerprint ignores line endings,
//   placeholders and x.y.z numbers, so a checkout or the scribe resolving a
//   placeholder is not a write.
// - THE LEGACY MARKER. A file that genuinely cannot meet a rule says so in
//   its PORT NOTE, in the open, with a "- Legacy : <reason>" field. Its
//   source-version and log findings then print WARN with the reason. The
//   marker never covers a placeholder.
//
// USAGE:
//     node 80__Testing__PrototypeEnvironment/Na__Verify__PortNotes__.mjs [options]
//
//       --files <path> ...   check only these files (a package's own); paths from the app root or absolute
//       --scribe             every release placeholder left fails (the Parity Scribe, after its pass)
//       --tv <TV app root>   also print the watermark against TrueVision at that root
//       --pin <commit>       read TrueVision at this commit with git (the programme reads TrueVision only at
//                            its pin, b2aa9151 on 01-Oct-2026); without it the working tree is read and the
//                            report says so
//       --under <folder>     limit the watermark to one folder, e.g.
//                            02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData
//       --root <app root>    check another copy of the app (default: the app this script sits in)
//       --fails-only         list failures only (warnings and pending are still counted)
//       --verbose            also list every pending placeholder and every baseline entry that no longer applies
//       --self-test          prove the checks bite, on planted copies held in memory
//       --print-baseline     print the baseline document with this verifier's part taken from the tree as it
//                            stands (to stdout; the file is only ever replaced by hand)
//
//   Exit 0 = no failure (warnings and pending placeholders allowed). Exit 1 = at least one failure.
//   Exit 2 = it could not run. Reads only; writes nothing. Runs in seconds.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : ValeVision3D first; no TrueVision twin (WP-S11-03 of the parity
//                   plan, landed by package W0-04)
// - Parity        : new
// - Back-port     : TrueVision could run the same checks on its own tree; offered
//                   with the TrueVision lane (DR-36), not done here.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.0 ({{VVREL:W0-04}})
// - Written for the TrueVision parity programme (gate G4): source versions,
//   log order, release placeholders, the c.1 watermark, the 01-Oct-2026
//   baseline and the legacy marker.
//
// =============================================================================

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, relative, join, extname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';


// -----------------------------------------------------------------------------
// REGION | Configuration
// -----------------------------------------------------------------------------

    const Na__Verify__ScriptDir    = dirname(fileURLToPath(import.meta.url));                    // <-- 80__Testing__PrototypeEnvironment
    const Na__Verify__BaselinePath = join(Na__Verify__ScriptDir, 'Na__Verify__ParityBaseline__.json');

    // SCOPE | Where port notes and module logs live
    // ------------------------------------------------------------
    const Na__Verify__Scopes = [
        { dir : '02__Src__AppModules',               ext : [ '.js', '.mjs', '.cjs', '.css', '.json' ] },
        { dir : '03__Style__AppStylesheets',         ext : [ '.css' ] },
        { dir : '80__Testing__PrototypeEnvironment', ext : [ '.js', '.mjs', '.cjs', '.css', '.py', '.html' ] }
    ];
    const Na__Verify__RootFiles = [ 'index.html' ];                                              // <-- Shipped page: placeholders only
    const Na__Verify__SkipDirs  = new Set([ 'node_modules', 'dist', '.wrangler', '.git', '.claude', '__pycache__',
                                            '00__Archive', '00__ArchivedVersions', 'TestEnv__GlbFiles' ]);
    // ------------------------------------------------------------

    // PATTERNS | Header lines
    // ------------------------------------------------------------
    // The comment marker in front of a header line: // in JavaScript, * or /*
    // in a stylesheet block, # in Python, <!-- in a page.
    const Na__Verify__Marker        = '(?:\\/\\/+|#+|\\*|\\/\\*+|<!--)?';
    const Na__Verify__PortNoteHead  = new RegExp('^\\s*' + Na__Verify__Marker + '\\s*PORT NOTE\\b[^:\\n]{0,40}:');
    const Na__Verify__LogHead       = new RegExp('^\\s*' + Na__Verify__Marker + '\\s*DEVELOPMENT LOG\\b');
    const Na__Verify__RuleLine      = new RegExp('^\\s*' + Na__Verify__Marker + '\\s*[-=]{4,}');
    const Na__Verify__FieldLine     = new RegExp('^(\\s*' + Na__Verify__Marker + '\\s*)-\\s+([A-Z][A-Za-z][A-Za-z -]*?)\\s*:\\s?(.*)$');
    const Na__Verify__EntryLine     = new RegExp('^(\\s*' + Na__Verify__Marker + '\\s*)(\\d{1,2})-([A-Za-z]{3})-(\\d{4})\\b\\s*(.*)$');
    const Na__Verify__EntryVersion  = /\bVersion\s+(\d+\.\d+\.\d+)\b/i;
    const Na__Verify__Months        = { jan : 1, feb : 2, mar : 3, apr : 4, may : 5, jun : 6, jul : 7, aug : 8, sep : 9, oct : 10, nov : 11, dec : 12 };
    // ------------------------------------------------------------

    // PATTERNS | The release placeholder
    // ------------------------------------------------------------
    // Built from pieces so this file never carries a placeholder of its own
    // outside its DEVELOPMENT LOG.
    const Na__Verify__TokenOpen     = '{' + '{' + 'VVREL';
    const Na__Verify__TokenWhole    = new RegExp('^\\{\\{VVREL:([^}\\s]*)\\}\\}');
    const Na__Verify__PackageId     = /^W[0-6T]-\d{2}$/;                                          // <-- W0-04, W1-33, W0-99, WT-08
    // ------------------------------------------------------------

    // CODES | What a finding is, and whether a baseline or legacy marker may hold it
    // ------------------------------------------------------------
    const Na__Verify__Codes = {
        'source-version'      : { holdable : true,  rule : 'K2 H5, DR-34' },
        'source-version-form' : { holdable : true,  rule : 'K2 H5, S11 B8' },
        'log-order'           : { holdable : true,  rule : 'S11 B7, WP-S11-03' },
        'log-duplicate'       : { holdable : true,  rule : 'S11 B7, WP-S11-03' },
        'placeholder-bad'     : { holdable : false, rule : 'F.5.5' },
        'placeholder-code'    : { holdable : false, rule : 'F.5.5' },
        'placeholder-left'    : { holdable : false, rule : 'F.5.5 scribe step (b)' }
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Command Line
// -----------------------------------------------------------------------------

    // FUNCTION | Read the Options
    // ------------------------------------------------------------
    function Na__Verify__ReadOptions(argv) {
        const options = { files : [], scribe : false, tv : null, pin : null, under : null, root : null,
                          failsOnly : false, verbose : false, selfTest : false, printBaseline : false };
        for (let index = 0; index < argv.length; index++) {
            const arg = argv[index];
            if (arg === '--files') {
                while (index + 1 < argv.length && !argv[index + 1].startsWith('--')) options.files.push(argv[++index]);
            }
            else if (arg === '--scribe')         options.scribe = true;
            else if (arg === '--tv')             options.tv = argv[++index];
            else if (arg === '--pin')            options.pin = argv[++index];
            else if (arg === '--under')          options.under = (argv[++index] || '').split('\\').join('/').replace(/\/+$/, '');
            else if (arg === '--root')           options.root = argv[++index];
            else if (arg === '--fails-only')     options.failsOnly = true;
            else if (arg === '--verbose')        options.verbose = true;
            else if (arg === '--self-test')      options.selfTest = true;
            else if (arg === '--print-baseline') options.printBaseline = true;
            else throw new Error('Unknown option "' + arg + '" (see the USAGE block at the top of this file)');
        }
        if (options.pin && !options.tv) throw new Error('--pin needs --tv <TrueVision app root>');
        return options;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Text Helpers
// -----------------------------------------------------------------------------

    // FUNCTION | Read a File as Text Lines (BOM dropped, either line ending)
    // ------------------------------------------------------------
    function Na__Verify__ReadText(path) {
        return readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
    }
    // ------------------------------------------------------------


    // FUNCTION | Fingerprint a File for the Baseline
    // ------------------------------------------------------------
    // Line endings, release placeholders and x.y.z numbers are blanked first:
    // a checkout that turns LF into CRLF, or the scribe writing v2.72.1 where
    // a placeholder stood, is not a package writing the file. Anything else
    // that changes is.
    // ------------------------------------------------------------
    function Na__Verify__Fingerprint(text) {
        const normal = text.replace(/^\uFEFF/, '')
                           .replace(/\r\n?/g, '\n')
                           .replace(/\{\{VVREL[^}\n]*\}\}/g, '#')
                           .replace(/\bv?\d+\.\d+\.\d+\b/g, '#');
        return createHash('sha1').update(normal, 'utf8').digest('hex').slice(0, 16);
    }
    // ------------------------------------------------------------


    // FUNCTION | Mark Which Lines Are Comment Lines
    // ------------------------------------------------------------
    // A header is a run of comment lines. This needs no full parser: a line
    // is a comment line when it starts with // (or # in Python), or sits in a
    // /* */ or <!-- --> block. A blank line outside a block ends a run.
    // ------------------------------------------------------------
    function Na__Verify__CommentLines(lines, ext) {
        const flags   = new Array(lines.length).fill(false);
        let   closer  = null;                                                                    // <-- '*/' or '-->' while inside a block
        for (let index = 0; index < lines.length; index++) {
            const text = lines[index].trim();
            if (closer) {
                flags[index] = true;
                const at = text.indexOf(closer);
                if (at !== -1) {
                    const after = text.slice(at + closer.length).trim();
                    closer = null;
                    if (after.length && !after.startsWith('//')) flags[index] = false;          // <-- Code after the block on the same line
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


    // FUNCTION | Find the PORT NOTE and DEVELOPMENT LOG Blocks
    // ------------------------------------------------------------
    // A block runs from its heading line to the next rule line (// ----,
    // * ====), the next heading, the end of a /* */ block, or the first line
    // that is not a comment. Returned as { kind, start, end } with end
    // exclusive, 0-based.
    // ------------------------------------------------------------
    function Na__Verify__FindBlocks(lines, flags) {
        const blocks = [];
        for (let index = 0; index < lines.length; index++) {
            if (!flags[index]) continue;
            const kind = Na__Verify__PortNoteHead.test(lines[index]) ? 'portnote'
                       : Na__Verify__LogHead.test(lines[index])      ? 'log' : null;
            if (!kind) continue;
            let end = index + 1;
            while (end < lines.length && flags[end]
                   && !Na__Verify__RuleLine.test(lines[end])
                   && !Na__Verify__PortNoteHead.test(lines[end])
                   && !Na__Verify__LogHead.test(lines[end])) {
                const text = lines[end].trim();
                end += 1;
                if (!text.startsWith('//') && (text.indexOf('*/') !== -1 || text.indexOf('-->') !== -1)) break;
            }
            blocks.push({ kind, start : index, end });
            index = end - 1;
        }
        return blocks;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Text of a Comment Line Without Its Marker
    // ------------------------------------------------------------
    function Na__Verify__Unmark(line) {
        return line.replace(/^\s*(?:\/\/+|#+|\*\/|\/\*+|\*|<!--)?\s?/, '').replace(/\s*(?:\*\/|-->)\s*$/, '');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Compare Two x.y.z Versions
    // ------------------------------------------------------------
    function Na__Verify__CompareVersions(a, b) {
        const pa = a.split('.').map(Number);
        const pb = b.split('.').map(Number);
        for (let index = 0; index < 3; index++) {
            if (pa[index] !== pb[index]) return pa[index] < pb[index] ? -1 : 1;
        }
        return 0;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Parsing a Header
// -----------------------------------------------------------------------------

    // FUNCTION | Read a PORT NOTE Block Into Its Fields
    // ------------------------------------------------------------
    // Fields are the "- Name : value" lines at the block's first bullet
    // column; deeper lines (sub-bullets, wrapped text) continue the field
    // above them.
    // ------------------------------------------------------------
    function Na__Verify__ParsePortNote(lines, block) {
        const fields = new Map();
        let column  = null;
        let current = null;
        for (let index = block.start + 1; index < block.end; index++) {
            const match = lines[index].match(Na__Verify__FieldLine);
            if (match && (column === null || match[1].length === column)) {
                if (column === null) column = match[1].length;
                current = { name : match[2].trim(), line : index + 1, value : match[3].trim() };
                if (!fields.has(current.name)) fields.set(current.name, current);
                continue;
            }
            if (current) {
                const more = Na__Verify__Unmark(lines[index]).trim();
                if (more) current.value += ' ' + more;
            }
        }
        return { line : block.start + 1, fields };
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a DEVELOPMENT LOG Block Into Its Entries
    // ------------------------------------------------------------
    // An entry starts with a date at the column of the log's first date:
    // "21-Sep-2026 - Version 1.0.0". Entries without a module version (this
    // app's "09-Sep-2026 - ValeVision3D v2.18.0" style) keep their date.
    // ------------------------------------------------------------
    function Na__Verify__ParseLog(lines, block) {
        const entries = [];
        let column = null;
        for (let index = block.start + 1; index < block.end; index++) {
            const match = lines[index].match(Na__Verify__EntryLine);
            if (match && (column === null || match[1].length === column)) {
                const month = Na__Verify__Months[match[3].toLowerCase()];
                if (month) {
                    if (column === null) column = match[1].length;
                    const version = (match[5].match(Na__Verify__EntryVersion) || [])[1] || null;
                    entries.push({ line : index + 1, day : Number(match[2]), month, year : Number(match[4]),
                                   date : match[2].padStart(2, '0') + '-' + match[3] + '-' + match[4],
                                   stamp : Number(match[4]) * 10000 + month * 100 + Number(match[2]),
                                   version, text : match[5] });
                    continue;
                }
            }
            if (entries.length) entries[entries.length - 1].text += ' ' + Na__Verify__Unmark(lines[index]).trim();
        }
        return { line : block.start + 1, entries };
    }
    // ------------------------------------------------------------


    // FUNCTION | Read Everything This Verifier Needs From One File
    // ------------------------------------------------------------
    function Na__Verify__ReadHeader(text, ext) {
        const lines  = text.split(/\r?\n/);
        const flags  = Na__Verify__CommentLines(lines, ext);
        const blocks = Na__Verify__FindBlocks(lines, flags);
        const notes  = blocks.filter((b) => b.kind === 'portnote').map((b) => Na__Verify__ParsePortNote(lines, b));
        const logs   = blocks.filter((b) => b.kind === 'log').map((b) => Na__Verify__ParseLog(lines, b));
        return { lines, flags, blocks, notes, logs };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Checks
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Is This File in the Drawing System (folders 40-55)?
    // ------------------------------------------------------------
    function Na__Verify__InDrawingSystem(rel) {
        const match = rel.match(/^02__Src__AppModules\/(\d\d)__/);
        return !!match && Number(match[1]) >= 40 && Number(match[1]) <= 55;
    }
    // ------------------------------------------------------------


    // FUNCTION | Check the PORT NOTE's Source Version
    // ------------------------------------------------------------
    function Na__Verify__CheckSourceVersion(note, findings) {
        const from = note.fields.get('Ported from');
        if (!from || !/^TrueVision3D\b/.test(from.value)) return false;
        const source = note.fields.get('Source version');
        if (!source) {
            findings.push({ code : 'source-version', line : from.line,
                            message : 'PORT NOTE says "Ported from : TrueVision3D" and has no "Source version" line '
                                    + '(K2 H5: "- Source version: <x.y.z> (TrueVision3D v2.N.0, DD-Mon-YYYY; read at <pin>)")' });
            return true;
        }
        const moduleVersion = source.value.match(/(?:^|[^v\d.])(\d+\.\d+\.\d+)\b/);
        const appVersion    = source.value.match(/\bv2\.\d+\.\d+\b/);
        if (!moduleVersion || !appVersion) {
            findings.push({ code : 'source-version-form', line : source.line,
                            message : 'Source version "' + source.value.slice(0, 90) + '" lacks '
                                    + (!moduleVersion ? 'the TrueVision module version' : 'the TrueVision3D app version')
                                    + ' (K2 H5: "<x.y.z> (TrueVision3D v2.N.0, DD-Mon-YYYY; read at <pin>)")' });
        }
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Check One DEVELOPMENT LOG's Order
    // ------------------------------------------------------------
    // Newest first is required where TrueVision's convention applies (see
    // DESCRIPTION); elsewhere the log's own majority direction is the rule.
    // A repeated version is a fault in either direction.
    // ------------------------------------------------------------
    function Na__Verify__CheckLogOrder(log, newestFirstRequired, findings) {
        const entries   = log.entries;
        const versioned = entries.filter((e) => e.version);
        const seen      = new Map();
        versioned.forEach((entry) => {
            if (seen.has(entry.version)) {
                findings.push({ code : 'log-duplicate', line : entry.line,
                                message : 'version ' + entry.version + ' appears twice in the DEVELOPMENT LOG (also line ' + seen.get(entry.version) + ')' });
            } else {
                seen.set(entry.version, entry.line);
            }
        });

        let direction = 'newest first';
        if (!newestFirstRequired) {
            let up = 0, down = 0;
            for (let index = 0; index + 1 < versioned.length; index++) {
                const step = Na__Verify__CompareVersions(versioned[index].version, versioned[index + 1].version);
                if (step > 0) down++; else if (step < 0) up++;
            }
            if (versioned.length < 2) {
                for (let index = 0; index + 1 < entries.length; index++) {
                    if (entries[index].stamp > entries[index + 1].stamp) down++; else if (entries[index].stamp < entries[index + 1].stamp) up++;
                }
            }
            if (up > down) direction = 'oldest first';
        }
        const wrong = direction === 'newest first' ? 1 : -1;                                      // <-- The sign of a step against the direction

        const reported = new Set();
        for (let index = 0; index + 1 < entries.length; index++) {
            const above = entries[index];
            const below = entries[index + 1];
            if (Math.sign(below.stamp - above.stamp) === wrong) {
                reported.add(above.line);
                findings.push({ code : 'log-order', line : above.line,
                                message : above.date + (above.version ? ' ' + above.version : '') + ' sits above '
                                        + below.date + (below.version ? ' ' + below.version : '')
                                        + ' (this log runs ' + direction + (newestFirstRequired ? ', as TrueVision\'s do' : '') + ')' });
            }
        }
        for (let index = 0; index + 1 < versioned.length; index++) {
            const above = versioned[index];
            const below = versioned[index + 1];
            if (reported.has(above.line)) continue;
            if (Math.sign(Na__Verify__CompareVersions(below.version, above.version)) === wrong) {
                findings.push({ code : 'log-order', line : above.line,
                                message : 'version ' + above.version + ' sits above ' + below.version
                                        + ' (this log runs ' + direction + (newestFirstRequired ? ', as TrueVision\'s do' : '') + ')' });
            }
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Find Every Release Placeholder in a File
    // ------------------------------------------------------------
    // Returned as { line, id, wellFormed, inComment }.
    // ------------------------------------------------------------
    function Na__Verify__FindPlaceholders(header, ext) {
        const found = [];
        header.lines.forEach((line, index) => {
            let at = line.indexOf(Na__Verify__TokenOpen);
            while (at !== -1) {
                const whole = line.slice(at).match(Na__Verify__TokenWhole);
                const id    = whole ? whole[1] : null;
                found.push({ line : index + 1, id, text : whole ? whole[0] : line.slice(at, at + 24),
                             wellFormed : !!id && Na__Verify__PackageId.test(id),
                             inComment : ext !== '.json' && header.flags[index] === true });
                at = line.indexOf(Na__Verify__TokenOpen, at + Na__Verify__TokenOpen.length);
            }
        });
        return found;
    }
    // ------------------------------------------------------------


    // FUNCTION | Check One File
    // ------------------------------------------------------------
    // Returns { findings, placeholders, legacy, notes, logs }; a finding is
    // { code, line, message }. Severity is decided later, against the
    // baseline, the legacy marker and --scribe.
    // ------------------------------------------------------------
    function Na__Verify__CheckFile(rel, text, options) {
        const ext      = extname(rel).toLowerCase();
        const header   = Na__Verify__ReadHeader(text, ext);
        const findings = [];
        let   claimsTv = false;
        let   legacy   = null;

        if (ext !== '.json' && rel !== 'index.html') {
            header.notes.forEach((note) => {
                if (Na__Verify__CheckSourceVersion(note, findings)) claimsTv = true;
                const marker = note.fields.get('Legacy');
                if (marker && marker.value) legacy = marker.value;
                const authored = note.fields.get('Authored in');
                if (authored && /ported back[^.;]*TrueVision3D/i.test(authored.value)) claimsTv = true;
            });
            const newestFirst = claimsTv || Na__Verify__InDrawingSystem(rel);
            header.logs.forEach((log) => Na__Verify__CheckLogOrder(log, newestFirst, findings));
        }

        const placeholders = Na__Verify__FindPlaceholders(header, ext);
        placeholders.forEach((p) => {
            if (!p.wellFormed) {
                findings.push({ code : 'placeholder-bad', line : p.line,
                                message : 'malformed release placeholder "' + p.text + '": it must be the VVREL placeholder with a package id such as W0-04' });
            } else if (!p.inComment) {
                findings.push({ code : 'placeholder-code', line : p.line,
                                message : 'release placeholder "' + p.text + '" outside a comment: it would reach the running app; it belongs in the PORT NOTE or the DEVELOPMENT LOG' });
            } else if (options.scribe) {
                findings.push({ code : 'placeholder-left', line : p.line,
                                message : 'release placeholder "' + p.text + '" left after the Parity Scribe\'s pass' });
            }
        });

        return { findings, placeholders, legacy, notes : header.notes.length, logs : header.logs.length };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Files and the Baseline
// -----------------------------------------------------------------------------

    // FUNCTION | List Every File in Scope
    // ------------------------------------------------------------
    function Na__Verify__ListFiles(appRoot) {
        const files = [];
        const walk  = (dir, exts) => {
            if (!existsSync(dir)) return;
            for (const name of readdirSync(dir)) {
                if (Na__Verify__SkipDirs.has(name)) continue;
                const full = join(dir, name);
                const info = statSync(full);
                if (info.isDirectory()) walk(full, exts);
                else if (exts.includes(extname(name).toLowerCase())) files.push(full);
            }
        };
        Na__Verify__Scopes.forEach((scope) => walk(join(appRoot, scope.dir), scope.ext));
        Na__Verify__RootFiles.forEach((name) => { if (existsSync(join(appRoot, name))) files.push(join(appRoot, name)); });
        return files;
    }
    // ------------------------------------------------------------


    // FUNCTION | The App-Root Relative Path, With Forward Slashes
    // ------------------------------------------------------------
    function Na__Verify__Rel(appRoot, path) {
        return relative(appRoot, path).split('\\').join('/');
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Baseline Document
    // ------------------------------------------------------------
    function Na__Verify__ReadBaseline() {
        if (!existsSync(Na__Verify__BaselinePath)) return { document : null, entries : new Map() };
        const document = JSON.parse(Na__Verify__ReadText(Na__Verify__BaselinePath));
        const entries  = new Map();
        (document.portNotes && document.portNotes.files || []).forEach((entry) => entries.set(entry.file.replace(/^VV\//, ''), entry));
        return { document, entries };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Watermark (TrueVision at a root, at the pin or in its working tree)
// -----------------------------------------------------------------------------

    // FUNCTION | Open TrueVision for Reading
    // ------------------------------------------------------------
    // With a pin, every file is read from git (one cat-file process for the
    // lot); without one, from the working tree at the root given.
    // ------------------------------------------------------------
    function Na__Verify__OpenTrueVision(tvRoot, pin) {
        const root = resolve(tvRoot);
        if (!existsSync(root)) throw new Error('TrueVision root not found: ' + root);
        if (!pin) {
            return {
                label : root + ' (working tree - pass --pin <commit> to read the pinned state)',
                has   : (rel) => existsSync(join(root, rel)),
                readMany : (rels) => new Map(rels.map((rel) => [ rel, existsSync(join(root, rel)) ? Na__Verify__ReadText(join(root, rel)) : null ]))
            };
        }
        const git    = (args, input) => execFileSync('git', [ '-C', root, ...args ], { input, maxBuffer : 1024 * 1024 * 1024, stdio : [ 'pipe', 'pipe', 'pipe' ] });
        const top    = git([ 'rev-parse', '--show-toplevel' ]).toString('utf8').trim();
        const prefix = git([ 'rev-parse', '--show-prefix' ]).toString('utf8').trim();
        git([ 'cat-file', '-e', pin + '^{commit}' ]);
        const listed = new Set(execFileSync('git', [ '-C', top, 'ls-tree', '-r', '--name-only', pin, '--', prefix || '.' ], { maxBuffer : 256 * 1024 * 1024 })
            .toString('utf8').split('\n').filter(Boolean).map((p) => p.slice(prefix.length)));
        return {
            label : root + ' at ' + pin + ' (git)',
            has   : (rel) => listed.has(rel),
            readMany : (rels) => {
                const wanted = rels.filter((rel) => listed.has(rel));
                const result = new Map(rels.map((rel) => [ rel, null ]));
                if (!wanted.length) return result;
                const buffer = execFileSync('git', [ '-C', top, 'cat-file', '--batch' ],
                    { input : wanted.map((rel) => pin + ':' + prefix + rel).join('\n') + '\n', maxBuffer : 1024 * 1024 * 1024 });
                let at = 0;
                for (const rel of wanted) {
                    const newline = buffer.indexOf(0x0a, at);
                    const head    = buffer.slice(at, newline).toString('utf8');
                    at = newline + 1;
                    if (/ missing$/.test(head)) continue;
                    const size = Number(head.split(' ')[2]);
                    result.set(rel, buffer.slice(at, at + size).toString('utf8').replace(/^\uFEFF/, ''));
                    at += size + 1;
                }
                return result;
            }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Watermark of One Module
    // ------------------------------------------------------------
    // This app's newest dated log entry, and every TrueVision entry dated
    // after it - oldest day first, each day in the order TrueVision's log
    // lists it - as "21-Sep 1.33.0", with "[2.147.0]" where the entry names a
    // TrueVision3D release (the S11 report's c.1 column).
    // ------------------------------------------------------------
    function Na__Verify__Watermark(vvText, tvText, ext) {
        const vvLogs  = Na__Verify__ReadHeader(vvText, ext).logs;
        const tvLogs  = Na__Verify__ReadHeader(tvText, ext).logs;
        const vvDated = vvLogs.length ? vvLogs[0].entries : [];
        const tvDated = tvLogs.length ? tvLogs[0].entries : [];
        const newest  = vvDated.reduce((best, e) => (!best || e.stamp > best.stamp ? e : best), null);
        const tvTop   = tvDated.find((e) => e.version);
        if (!newest) return { newest : null, tvTop : tvTop ? tvTop.version : null, after : null };
        const after = tvDated
            .map((entry, order) => ({ entry, order }))
            .filter(({ entry }) => entry.version && entry.stamp > newest.stamp)
            .sort((a, b) => (a.entry.stamp - b.entry.stamp) || (a.order - b.order))
            .map(({ entry }) => {
                const release = (entry.text.match(/\bv(2\.\d+\.\d+)\b/) || [])[1];
                return entry.date.slice(0, 6) + ' ' + entry.version + (release ? ' [' + release + ']' : '');
            });
        return { newest, tvTop : tvTop ? tvTop.version : null, after };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Self-Test (planted copies in memory; nothing is written)
// -----------------------------------------------------------------------------

    // FUNCTION | Prove Every Check Bites and Every Allowance Holds
    // ------------------------------------------------------------
    function Na__Verify__SelfTest() {
        const token = (id) => '{' + '{VVREL:' + id + '}' + '}';
        const header = (portNote, log) => [
            '// =============================================================================',
            '// VALEVISION3D - SELF TEST',
            '// =============================================================================',
            '//',
            '// FILE       : Na__Planted__.js',
            '//',
            '// -----------------------------------------------------------------------------',
            '//',
            ...portNote,
            '//',
            '// -----------------------------------------------------------------------------',
            '//',
            '// DEVELOPMENT LOG:',
            ...log,
            '//',
            '// ============================================================================='
        ].join('\n') + '\nexport function Na__Planted__Run() { return 1; }\n';
        const goodNote = [
            '// PORT NOTE:',
            '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/32__System__OrthoMode/Na__LayoutEditor__OrthoMode__State__.js',
            '// - Source version: 1.0.0 (TrueVision3D v2.113.0, 21-Sep-2026; read at HEAD b2aa9151)',
            '// - Ported on     : 01-Oct-2026 for ValeVision3D ' + token('W1-99'),
            '// - Parity        : verbatim',
            '// - Divergences   :',
            '//   - Banner reads ValeVision3D. (No console output in this file.)',
            '// - Back-port     : none.'
        ];
        const goodLog = [
            '// 22-Sep-2026 - Version 1.1.0',
            '// - Second.',
            '//',
            '// 21-Sep-2026 - Version 1.0.0',
            '// - Initial implementation.'
        ];
        const rel   = [ '02__Src__AppModules', '51__System__LayoutEditor', '99__Planted__SelfTest', 'Na__Planted__.js' ].join('/');
        const out   = [ '02__Src__AppModules', '10__NavigationAndCameras', 'Na__Planted__.js' ].join('/');      // <-- Outside the drawing system
        const codes = (text, opts) => Na__Verify__CheckFile(rel, text, opts || {}).findings.map((f) => f.code);
        const cases = [
            [ 'a clean K2 H5 header passes',
              codes(header(goodNote, goodLog)).length === 0 ],
            [ 'its well-formed placeholder is pending, not a failure',
              Na__Verify__CheckFile(rel, header(goodNote, goodLog), {}).placeholders.length === 1 ],
            [ 'with --scribe the same placeholder fails',
              codes(header(goodNote, goodLog), { scribe : true }).includes('placeholder-left') ],
            [ 'a planted malformed placeholder fails (' + token('x') + ')',
              codes(header(goodNote, [ '// 22-Sep-2026 - Version 1.1.0 (' + token('x') + ')', ...goodLog.slice(1) ])).includes('placeholder-bad') ],
            [ 'a placeholder in code fails',
              codes(header(goodNote, goodLog) + 'const Na__Planted__Release = \'' + token('W0-04') + '\';\n').includes('placeholder-code') ],
            [ 'a planted out-of-order entry fails (older entry above a newer one)',
              codes(header(goodNote, [ '// 20-Sep-2026 - Version 0.9.0', '// - Planted.', '//', ...goodLog ])).includes('log-order') ],
            [ 'a version written above a higher one on the same day fails',
              codes(header(goodNote, [ '// 22-Sep-2026 - Version 1.0.5', '// - Planted.', '//', ...goodLog ])).includes('log-order') ],
            [ 'a repeated version fails',
              codes(header(goodNote, [ '// 23-Sep-2026 - Version 1.1.0', '// - Planted.', '//', ...goodLog ])).includes('log-duplicate') ],
            [ 'a TrueVision port with no Source version fails',
              codes(header(goodNote.filter((l) => l.indexOf('Source version') === -1), goodLog)).includes('source-version') ],
            [ 'a Source version without the TrueVision3D app version fails',
              codes(header(goodNote.map((l) => l.replace(/\(TrueVision3D v2\.113\.0, /, '(')), goodLog)).includes('source-version-form') ],
            [ 'a legacy marker is read (findings then print WARN with its reason)',
              Na__Verify__CheckFile(rel, header([ ...goodNote.filter((l) => l.indexOf('Source version') === -1), '// - Legacy        : self-test reason' ], goodLog), {}).legacy === 'self-test reason' ],
            [ 'an oldest-first log outside the drawing system passes',
              Na__Verify__CheckFile(out,
                  header([ '// PORT NOTE:', '// - Ported from   : none' ], [ '// 21-Sep-2026 - Version 1.0.0', '// - A.', '//', '// 22-Sep-2026 - Version 1.1.0', '// - B.' ]), {}).findings.length === 0 ],
            [ '...but one entry out of its step there still fails',
              Na__Verify__CheckFile(out,
                  header([ '// PORT NOTE:', '// - Ported from   : none' ], [ '// 23-Sep-2026 - Version 1.2.0', '// - C.', '//', '// 21-Sep-2026 - Version 1.0.0', '// - A.', '//', '// 22-Sep-2026 - Version 1.1.0', '// - B.' ]), {})
                  .findings.some((f) => f.code === 'log-order') ],
            [ 'the watermark lists TrueVision entries dated after this app\'s newest, oldest day first, with the release',
              Na__Verify__Watermark(header(goodNote, goodLog),
                  header(goodNote, [ '// 24-Sep-2026 - Version 1.3.0', '// - C.', '//', '// 23-Sep-2026 - Version 1.2.1', '// - B (Leaderless Notes, v2.147.0).', '//',
                                     '// 23-Sep-2026 - Version 1.2.0', '// - A.', '//', ...goodLog ]), '.js').after.join('; ')
                  === '23-Sep 1.2.1 [2.147.0]; 23-Sep 1.2.0; 24-Sep 1.3.0' ],
            [ 'the fingerprint ignores line endings and a resolved placeholder',
              Na__Verify__Fingerprint(header(goodNote, goodLog)) === Na__Verify__Fingerprint(header(goodNote, goodLog).replace(token('W1-99'), 'v2.72.1').replace(/\n/g, '\r\n')) ],
            [ '...and changes when anything else changes',
              Na__Verify__Fingerprint(header(goodNote, goodLog)) !== Na__Verify__Fingerprint(header(goodNote, goodLog).replace('Second.', 'Second!')) ]
        ];
        console.log('ValeVision3D - port-note verifier self-test (planted copies in memory)');
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

    // FUNCTION | Main
    // ------------------------------------------------------------
    function Na__Verify__Main() {
        const options = Na__Verify__ReadOptions(process.argv.slice(2));
        if (options.selfTest) return Na__Verify__SelfTest() ? 0 : 1;

        const appRoot  = resolve(options.root || resolve(Na__Verify__ScriptDir, '..'));
        const baseline = Na__Verify__ReadBaseline();
        const inScope  = Na__Verify__ListFiles(appRoot);
        const files    = options.files.length
            ? options.files.map((p) => resolve(isAbsolute(p) ? p : join(appRoot, p)))
            : inScope;

        const results = [];
        let notes = 0, logs = 0;
        for (const path of files) {
            if (!existsSync(path)) { results.push({ rel : Na__Verify__Rel(appRoot, path), missing : true, findings : [], placeholders : [] }); continue; }
            const rel    = Na__Verify__Rel(appRoot, path);
            const text   = Na__Verify__ReadText(path);
            const result = Na__Verify__CheckFile(rel, text, options);
            notes += result.notes;
            logs  += result.logs;
            const entry   = baseline.entries.get(rel);
            const print   = Na__Verify__Fingerprint(text);
            const holds   = entry && entry.fingerprint === print ? new Set(entry.codes) : new Set();
            result.findings.forEach((finding) => {
                const holdable = Na__Verify__Codes[finding.code].holdable;
                if (holdable && holds.has(finding.code))      { finding.severity = 'WARN'; finding.why = 'baseline 01-Oct-2026'; }
                else if (holdable && result.legacy)           { finding.severity = 'WARN'; finding.why = 'legacy: ' + result.legacy; }
                else                                          { finding.severity = 'FAIL'; }
            });
            results.push({ rel, text, fingerprint : print, baselined : !!entry, baselineApplies : !!entry && entry.fingerprint === print, ...result });
        }

        // PRINT BASELINE | the document with this verifier's part recorded from the tree
        // ------------------------------------------------------------
        if (options.printBaseline) {
            const document = baseline.document || { about : null };
            document.about = document.about || 'Baseline allow-list of the parity gates (W0-04, F.8 C13): findings that already stood on the tree W0-04 landed on. '
                + 'A finding listed for a file prints WARN only while the file still has the fingerprint recorded here; the first package that writes the file '
                + 'takes it off the list, and its own checks then apply in full. Paths are written VV/<app-root relative path> (the plan\'s shorthand, which the path '
                + 'gate does not read as a live path). Recorded by the two verifiers\' --print-baseline; nothing here is ever added by hand.';
            document.portNotes = {
                recorded : new Date().toISOString().slice(0, 10),
                rule     : 'Na__Verify__PortNotes__.mjs --print-baseline: every holdable finding (source-version, source-version-form, log-order, log-duplicate) on the tree as it stood',
                files    : results.filter((r) => !r.missing && r.findings.some((f) => Na__Verify__Codes[f.code].holdable))
                    .map((r) => ({ file : 'VV/' + r.rel, fingerprint : r.fingerprint,
                                   codes : Array.from(new Set(r.findings.filter((f) => Na__Verify__Codes[f.code].holdable).map((f) => f.code))).sort() }))
            };
            process.stdout.write(JSON.stringify(document, null, 1) + '\n');
            return 0;
        }

        // REPORT
        // ------------------------------------------------------------
        const fails   = [];
        const warns   = [];
        const pending = [];
        results.forEach((r) => {
            r.findings.forEach((f) => (f.severity === 'FAIL' ? fails : warns).push({ rel : r.rel, ...f }));
            r.placeholders.filter((p) => p.wellFormed && p.inComment && !options.scribe).forEach((p) => pending.push({ rel : r.rel, ...p }));
        });

        console.log('ValeVision3D - port notes, module logs and release placeholders');
        console.log('  app root : ' + appRoot);
        console.log('  checked  : ' + (options.files.length ? options.files.length + ' named file(s)' : results.length + ' files in ' + Na__Verify__Scopes.map((s) => s.dir).join(', ') + ' and index.html')
                    + ' - ' + notes + ' PORT NOTE(s), ' + logs + ' DEVELOPMENT LOG(s)');
        const recorded = baseline.entries.size;
        const applying = results.filter((r) => r.baselineApplies).length;
        const lapsed   = results.filter((r) => r.baselined && !r.baselineApplies);
        console.log('  baseline : ' + (baseline.document ? 'Na__Verify__ParityBaseline__.json - ' + recorded + ' file(s) recorded '
                    + ((baseline.document.portNotes || {}).recorded || '') + '; ' + applying + ' still as recorded'
                    + (lapsed.length ? ', ' + lapsed.length + ' since rewritten (their full checks apply)' : '') : 'none found (every finding fails)'));
        if (options.scribe) console.log('  mode     : --scribe (every release placeholder left fails)');
        console.log('');

        results.filter((r) => r.missing).forEach((r) => fails.push({ rel : r.rel, line : 0, code : 'missing', message : 'file not found' }));

        const byFile = new Map();
        [ ...fails, ...(options.failsOnly ? [] : warns) ].forEach((f) => {
            if (!byFile.has(f.rel)) byFile.set(f.rel, []);
            byFile.get(f.rel).push(f);
        });
        const order = Array.from(byFile.keys()).sort((a, b) => {
            const fa = byFile.get(a).some((f) => f.severity !== 'WARN') ? 0 : 1;
            const fb = byFile.get(b).some((f) => f.severity !== 'WARN') ? 0 : 1;
            return fa - fb || a.localeCompare(b);
        });
        order.forEach((rel) => {
            console.log('  ' + rel);
            byFile.get(rel).sort((a, b) => a.line - b.line).forEach((f) => {
                console.log('      ' + (f.severity === 'WARN' ? 'WARN' : 'FAIL') + '  :' + String(f.line).padEnd(5) + ' ' + f.code.padEnd(20) + ' ' + f.message
                            + (f.why ? '   [' + f.why + ']' : ''));
            });
        });
        if (order.length) console.log('');

        if (pending.length) {
            const perPackage = {};
            pending.forEach((p) => { perPackage[p.id] = (perPackage[p.id] || 0) + 1; });
            console.log('  PENDING  ' + pending.length + ' release placeholder(s) in ' + new Set(pending.map((p) => p.rel)).size
                        + ' file(s), for the wave\'s Parity Scribe: ' + Object.keys(perPackage).sort().map((k) => k + ' x' + perPackage[k]).join(', '));
            if (options.verbose) pending.forEach((p) => console.log('      ' + p.rel + ':' + p.line + '  ' + p.text));
            console.log('');
        }
        if (options.verbose && lapsed.length) {
            console.log('  Baseline entries that no longer apply (the file was written since 01-Oct-2026):');
            lapsed.forEach((r) => console.log('      ' + r.rel));
            console.log('');
        }

        // WATERMARK
        // ------------------------------------------------------------
        if (options.tv) {
            const tv      = Na__Verify__OpenTrueVision(options.tv, options.pin);
            const shared  = results.filter((r) => !r.missing && r.logs > 0 && r.rel.startsWith('02__Src__AppModules/')
                                                  && (!options.under || r.rel.startsWith(options.under + '/')) && tv.has(r.rel));
            const tvTexts = tv.readMany(shared.map((r) => r.rel));
            console.log('  WATERMARK  TrueVision ' + tv.label);
            console.log('  The TrueVision DEVELOPMENT LOG entries dated after this app\'s newest log entry (the S11 c.1 rule; same-day entries are not flagged)'
                        + (options.under ? ', under ' + options.under : '') + ':');
            shared.forEach((r) => {
                const tvText = tvTexts.get(r.rel);
                if (tvText === null || tvText === undefined) return;
                const mark = Na__Verify__Watermark(r.text, tvText, extname(r.rel).toLowerCase());
                console.log('    ' + r.rel);
                console.log('        this app ' + (mark.newest ? mark.newest.date : '(no dated entry)') + ' | TrueVision ' + (mark.tvTop || '-')
                            + ' | after: ' + (mark.after === null ? '(no dated entry here to compare)' : (mark.after.length ? mark.after.join('; ') : '-')));
            });
            console.log('');
        }

        const summary = fails.length + ' fail, ' + warns.length + ' warn, ' + pending.length + ' pending';
        console.log(fails.length === 0 ? '  RESULT: PASS (' + summary + ')' : '  RESULT: FAIL (' + summary + ')');
        return fails.length === 0 ? 0 : 1;
    }
    // ------------------------------------------------------------

    try {
        process.exitCode = Na__Verify__Main();
    } catch (error) {
        console.error('Na__Verify__PortNotes__: ' + (error && error.message ? error.message : error));
        process.exitCode = 2;
    }

// endregion -------------------------------------------------------------------
