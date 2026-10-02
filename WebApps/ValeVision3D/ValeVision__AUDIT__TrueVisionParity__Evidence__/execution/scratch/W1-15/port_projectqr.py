"""W1-15 port script: TrueVision's LE/53 Project QR Code into ValeVision, switched off.

Every TrueVision file is read with `git show` at the pin b2aa9151 (bytes, LF, exactly
as git returns them). The package's seams are applied as ASSERTED edits: a line range
must start and end on the expected text, a substitution must match exactly once. The
README is the one file rewritten whole (candidates/README__ProjectQrCode__.md).

Every result is checked before anything is written:
  - LF only, UTF-8, and none of the Noble Architecture / TrueVision identity markers
    (noble-architecture.com, /na-apps/, NaProjectPortal, TRUEVISION3D, [TrueVision3D,
    TrueVision__, window.TrueVision, PS01, the ProjectVision build script ...);
  - the banner, FILE line and one {{VVREL:W1-15}} placeholder in every JS/test file;
  - Encoder and Painter: everything below the header is TrueVision's byte for byte
    apart from the console prefix;
  - the config: every key of TrueVision's (plus ProjectQr__PortedFrom), no duplicate
    key, the switched-off values, and TrueVision's symbol and note values.

Targets are NEW files. A target is written only when it is absent, or when it still
holds exactly what this script wrote last time (written__sha256.json) - so a re-run is
safe and a file someone else changed is never overwritten.

    python -B port_projectqr.py --dry-run     build and check, write to <OS temp>/W1-15__port_out only
    python -B port_projectqr.py               write the eight ValeVision files
"""
import difflib
import hashlib
import json
import os
import subprocess
import sys
import tempfile

PIN    = 'b2aa9151'
NAWEB  = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
VV_APP = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE   = os.path.dirname(os.path.abspath(__file__))
OUT    = os.path.join(tempfile.gettempdir(), 'W1-15__port_out')   # <-- Outside the repository: the diffs quote TrueVision's lines
LEDGER = os.path.join(HERE, 'written__sha256.json')

QR  = '02__Src__AppModules/51__System__LayoutEditor/53__Feature__ProjectQrCode/'
TST = '80__Testing__PrototypeEnvironment/'

PORT_DATE = '02-Oct-2026'
VVREL     = '{{VVREL:W1-15}}'
RULE79    = '// -----------------------------------------------------------------------------'

FORBIDDEN = [
    'noble-architecture.com', '/na-apps/', 'NaProjectPortal', '30__TrueVision__AppContent', 'na-project-portal',
    'TRUEVISION3D', '[TrueVision3D', 'TrueVision__', 'TrueVision3D__', 'window.TrueVision', '/api/truevision',
    'na-truevision-api', 'ProjectVision__BuildScript', 'localhost:8090',
]
# Noble Architecture's project examples: gone from every ADAPTED file. Encoder and Painter
# are verbatim below their headers (one Encoder code comment names TrueVision's PS01
# symbol, kept as W1-16 kept TrueVision's examples in comments), so they are held to
# TrueVision's bytes instead (check_verbatim_body).
FORBIDDEN_ADAPTED = ['PS01', 'ps01Sym', 'MustersRoad']


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

def tv_text(rel):
    res = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + TV_APP + rel], capture_output=True)
    if res.returncode != 0:
        raise SystemExit('git show failed for ' + rel + ': ' + res.stderr.decode('utf-8', 'replace'))
    raw = res.stdout
    assert b'\r' not in raw, rel + ' is not LF at the pin'
    return raw.decode('utf-8')


def block(text):
    """A raw multi-line string as a list of lines (one leading and one trailing newline dropped)."""
    if text.startswith('\n'):
        text = text[1:]
    if text.endswith('\n'):
        text = text[:-1]
    return text.split('\n')


class Edits:
    """Asserted edits against the 1-based line numbers of TrueVision's text."""

    def __init__(self, name, text):
        self.name  = name
        self.lines = text.split('\n')
        self.ops   = []

    def _expect(self, n, expect):
        actual = self.lines[n - 1]
        if isinstance(expect, tuple):
            ok = actual.startswith(expect[1])
        else:
            ok = actual == expect
        if not ok:
            raise SystemExit('%s line %d: expected %r, found %r' % (self.name, n, expect, actual))

    def range(self, start, end, expect_start, expect_end, new_lines):
        self._expect(start, expect_start)
        self._expect(end, expect_end)
        self.ops.append((start, end, list(new_lines)))

    def sub(self, n, old, new):
        line = self.lines[n - 1]
        if line.count(old) != 1:
            raise SystemExit('%s line %d: %r occurs %d times in %r' % (self.name, n, old, line.count(old), line))
        self.ops.append((n, n, [line.replace(old, new)]))

    def apply(self):
        ops = sorted(self.ops, key=lambda op: op[0], reverse=True)
        for a, b in zip(ops, ops[1:]):
            if b[1] >= a[0]:
                raise SystemExit('%s: overlapping edits at lines %d-%d and %d-%d' % (self.name, b[0], b[1], a[0], a[1]))
        lines = list(self.lines)
        for start, end, new in ops:
            lines[start - 1:end] = new
        return '\n'.join(lines)


def aligned(prefix, column, comment):
    """prefix padded to the comment column TrueVision's neighbouring line uses."""
    return prefix.ljust(column) + comment


# -----------------------------------------------------------------------------
# 1. Encoder (verbatim code)
# -----------------------------------------------------------------------------

def port_encoder():
    rel = QR + 'Na__ProjectQr__Encoder__.js'
    tv  = tv_text(rel)
    e   = Edits('Encoder', tv)
    e.range(2, 2, '// TRUEVISION3D - PROJECT QR CODE - ENCODER', '// TRUEVISION3D - PROJECT QR CODE - ENCODER',
            ['// VALEVISION3D - PROJECT QR CODE - ENCODER'])
    e.range(17, 18, ("prefix", "//   213 bytes. A project's code carries 42 ("), '//   which is exactly what version 3 holds: 29 modules across.', block(r"""
//   213 bytes. A project's code carries a short resolver address: TrueVision's
//   is 42 bytes, which is exactly what version 3 holds: 29 modules across.
"""))
    e.range(54, 61, '// PORT NOTE:', '// - ValeVision    : not yet ported.', block(r"""
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/53__Feature__ProjectQrCode/Na__ProjectQr__Encoder__.js
// - Source version: 1.0.0 (TrueVision3D v2.81.0, 20-Sep-2026; read at HEAD b2aa9151)
// - Ported on     : PORT_DATE for ValeVision3D VVREL
// - Parity        : verbatim - the code is TrueVision's line for line
// - Divergences   :
//   - Banner and console prefix read ValeVision3D ([ValeVision3D ProjectQr]).
//   - DESCRIPTION: TrueVision's example address - its own resolver on its own website - is
//     not carried; the byte count it illustrates is.
// - Lineage       : TrueVision ported it on 19-Sep-2026 from the Vale Lantern Designer's
//                   03__AppUtils/VghLantern__AppUtils__QrEncoder__.js: the algorithm verbatim,
//                   an ES module with named exports rather than a window global, and Encode
//                   returning the merged runs with the matrix, so a symbol is merged once
//                   rather than on every repaint.
// - Back-port     : none.
""".replace('PORT_DATE', PORT_DATE).replace('VVREL', VVREL)))
    e.sub(797, "'[TrueVision3D ProjectQr] A payload of '", "'[ValeVision3D ProjectQr] A payload of '")
    return rel, tv, e.apply()


# -----------------------------------------------------------------------------
# 2. Painter (verbatim)
# -----------------------------------------------------------------------------

def port_painter():
    rel = QR + 'Na__ProjectQr__Painter__.js'
    tv  = tv_text(rel)
    e   = Edits('Painter', tv)
    e.range(2, 2, '// TRUEVISION3D - PROJECT QR CODE - PAINTER', '// TRUEVISION3D - PROJECT QR CODE - PAINTER',
            ['// VALEVISION3D - PROJECT QR CODE - PAINTER'])
    e.range(37, 41, '// PORT NOTE:', '// - ValeVision    : not yet ported.', block(r"""
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/53__Feature__ProjectQrCode/Na__ProjectQr__Painter__.js
// - Source version: 1.0.0 (TrueVision3D v2.81.0, 20-Sep-2026; read at HEAD b2aa9151)
// - Ported on     : PORT_DATE for ValeVision3D VVREL
// - Parity        : verbatim
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Lineage       : authored in TrueVision3D first (19-Sep-2026). The Lantern Designer paints
//                   its symbol inside its own SheetChrome, one rectangle per run; the single
//                   path is TrueVision's.
// - Back-port     : none.
""".replace('PORT_DATE', PORT_DATE).replace('VVREL', VVREL)))
    return rel, tv, e.apply()


# -----------------------------------------------------------------------------
# 3. Symbol (adapted: fails closed, no Noble Architecture address)
# -----------------------------------------------------------------------------

def port_symbol():
    rel = QR + 'Na__ProjectQr__Symbol__.js'
    tv  = tv_text(rel)
    e   = Edits('Symbol', tv)
    e.range(2, 2, '// TRUEVISION3D - PROJECT QR CODE - SYMBOL', '// TRUEVISION3D - PROJECT QR CODE - SYMBOL',
            ['// VALEVISION3D - PROJECT QR CODE - SYMBOL'])
    e.range(24, 32, '// - THE CODE CARRIES A SHORT ADDRESS, /q/?PS01, which a page at the website',
            '//   na-projectqr-ready goes out when it lands, for a sheet already on screen.', block(r"""
// - THE CODE CARRIES A SHORT ADDRESS, which a page outside the app resolves
//   through an index (TrueVision's: /q/?<code> at its website root). The
//   project's code is its permanent resolver key (Na__ProjectQr__ProjectLink__).
//   ValeVision has no resolver and no index yet (DR-12; package W5-05), so
//   the config ships the system switched off with both addresses empty. Once
//   they are set, on the authoring machine the index is read once per
//   project, and a project missing from it - or listed under another folder
//   or year - is reported, because a drawing exported then would carry a
//   code that opens nothing.
// - Owns Na__ProjectQr__Config__.json. The fallbacks mirror the shipped file -
//   switched off, no address - and a file that cannot be read switches the
//   system OFF: a failed fetch draws no code at all rather than one to an
//   address nobody chose (it fails closed; TrueVision's degrades to a working
//   code). The fetch starts when this module is first imported and never
//   rejects; na-projectqr-ready goes out when it lands, for a sheet already on
//   screen.
"""))
    e.range(44, 46, '// PORT NOTE:', '// - ValeVision    : not yet ported.', block(r"""
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/53__Feature__ProjectQrCode/Na__ProjectQr__Symbol__.js
// - Source version: 1.2.0 (TrueVision3D v2.120.0, 21-Sep-2026; moved into the Layout Editor by v2.155.0,
//                   23-Sep-2026; read at HEAD b2aa9151)
// - Ported on     : PORT_DATE for ValeVision3D VVREL
// - Parity        : adapted - it fails closed, and it carries no Noble Architecture address
// - Divergences   :
//   - FAILS CLOSED (S07a-V02): Na__ProjectQr__IsEnabled is true only when the config was read and
//     says ProjectQr__Enabled true. TrueVision's is true when the file could not be read, because its
//     fallbacks carry a working address; a Vale drawing must never get a code because a fetch failed
//     (offline, a stale cached copy, a server answering a missing file with the app's page).
//   - FALLBACKS mirror ValeVision's shipped config: baseUrl and indexUrl are '' (no resolver yet,
//     DR-12), where TrueVision's carry its resolver and its index. They stay '' once the resolver
//     exists: Text() reads an empty BaseUrl in the file as absent, so this fallback is what an empty
//     BaseUrl actually gives, and the system must go on failing closed.
//   - The index check's console line points at this folder's README for the resolver index, where
//     TrueVision's names its ProjectVision build script.
//   - The comments on Ready and IsEnabled, and the DESCRIPTION's address and fallback bullets, say
//     what ValeVision does.
//   - Banner and console prefix read ValeVision3D ([ValeVision3D ProjectQr]).
// - Lineage       : authored in TrueVision3D first (19-Sep-2026).
// - Back-port     : none - TrueVision's fail-open is deliberate there: its resolver exists.
""".replace('PORT_DATE', PORT_DATE).replace('VVREL', VVREL)))
    # FALLBACKS: the comment column is the one TrueVision's queryPattern line uses
    query_line = e.lines[102 - 1]
    column     = query_line.index('// <--')
    e.range(101, 103, ("prefix", "        baseUrl             : 'https://"), ("prefix", "        indexUrl            : '../../../../../q/index.json',"), [
        aligned("        baseUrl             : '',", column, "// <-- No resolver yet (DR-12): an empty base builds no address, so no code. Never the address bar: drawings are made on localhost"),
        aligned("        queryPattern        : '?{projectCode}',", column, "// <-- The bare key is the whole query, as TrueVision prints its own"),
        aligned("        indexUrl            : '',", column, "// <-- No resolver index yet: empty switches the check off"),
    ])
    e.range(153, 154, '    // Never rejects: a missing or broken file is the built-in defaults, not a',
            '    // drawing without its code. Resolves true when the file was read.', block(r"""
    // Never rejects: a missing or broken file is the built-in defaults, and
    // those draw no code (IsEnabled). Resolves true when the file was read.
"""))
    e.sub(166, "'[TrueVision3D ProjectQr] Config unreadable", "'[ValeVision3D ProjectQr] Config unreadable")
    e.range(169, 171, '                // A sheet painted before this landed drew the defaults. They',
            '                // file has been edited - which is exactly when it matters.', block(r"""
                // A sheet painted before this landed drew no code: until the
                // file is read the system is off. This repaint brings the
                // code in when the file switches it on.
"""))
    e.range(183, 187, '    // FUNCTION | Whether Codes Are Drawn at All', '    }', block(r"""
    // FUNCTION | Whether Codes Are Drawn at All
    // ------------------------------------------------------------
    // Only when the config was read and says so. A file that could not be
    // read leaves the system OFF - TrueVision's turns it on, because its
    // fallbacks carry a working address (see the PORT NOTE).
    // ------------------------------------------------------------
    function Na__ProjectQr__IsEnabled() {
        return !!Na__ProjectQr__Config && Na__ProjectQr__Config[Na__ProjectQr__PREFIX + 'Enabled'] === true;
    }
"""))
    e.range(246, 247, ("prefix", "                console.warn('[TrueVision3D ProjectQr] ' + code + ': ' + reason"),
            "                             'Run ProjectVision__BuildScript__.py (or with --qr-index-only) and publish the q folder.');", block(r"""
                console.warn('[ValeVision3D ProjectQr] ' + code + ': ' + reason + ' The QR code on this project\'s drawings will not open its model. ' +
                             'Rebuild the resolver index (README__ProjectQrCode__.md) and publish it.');
"""))
    e.sub(357, "'[TrueVision3D ProjectQr] '", "'[ValeVision3D ProjectQr] '")
    return rel, tv, e.apply()


# -----------------------------------------------------------------------------
# 4. ProjectLink (adapted: ValeVision's project identity)
# -----------------------------------------------------------------------------

def port_projectlink():
    rel = QR + 'Na__ProjectQr__ProjectLink__.js'
    tv  = tv_text(rel)
    e   = Edits('ProjectLink', tv)
    e.range(2, 2, '// TRUEVISION3D - PROJECT QR CODE - PROJECT LINK', '// TRUEVISION3D - PROJECT QR CODE - PROJECT LINK',
            ['// VALEVISION3D - PROJECT QR CODE - PROJECT LINK'])
    e.range(16, 18, '// - The project is whichever one the application is showing, read off the',
            '//   code on a drawing cannot name a different project from the one drawn.', block(r"""
// - The project is whichever one the application is showing, as the project
//   loader resolves it from the address bar: its folder and four-digit year
//   are those of the master-index entry the address bar names, read by the
//   loader's own two functions, and its code is that same entry's permanent
//   resolver key, so the code on a drawing cannot name a different project
//   from the one drawn.
"""))
    e.range(25, 53, '// THE ADDRESS IS A SHORT ONE, AND A PAGE AT THE WEBSITE ROOT RESOLVES IT:',
            '// page, and changing it there re-points every code ever printed.', block(r"""
// THE ADDRESS IS A SHORT ONE, AND A PAGE OUTSIDE THE APP RESOLVES IT:
// TrueVision prints its resolver's short address, /q/?<code>, and a flat page
// looks the code up in an index and sends the phone on to the project's full
// app address. The long address is what the app answers; the short one is
// what is printed. ValeVision has no resolver yet: until Adam picks one
// (DR-12; package W5-05) the config's base address is empty and this file
// builds no address at all.
//
// WHY: the symbol's module count is decided by the address's length, and the
// printed module's size is what decides whether a phone reads it. The long
// address is 135 bytes - a 49 module symbol, which needed a 20 mm title block
// to print a readable module, and Adam judged that strip "too tall, too
// portrait-feeling, and stretched" (20-Sep-2026). The short one is 42 bytes,
// which is EXACTLY what a 29 module symbol holds: a readable 0.30 mm module in
// the 10 mm strip the drawings already had. There is not a character to spare,
// which is why the folder is one letter and the query is the bare code.
//
// THE CODE IS THE PROJECT'S PERMANENT KEY, NEVER THE ADDRESS BAR'S TOKEN:
// Whitecardopedia opens ValeVision with the whole folder id
// (?project=2026/3047__Doous), a project can be renamed live, which rewrites
// its folder and can rewrite its code, and thirteen Vale project codes are
// shared with a sibling scheme. A key carried on paper must outlive all of
// that, so it is the master-index entry's qrKey: written once by the index
// writer and kept through a rename (DR-12). The token would be long as well:
// keyed by 2026/57994__Harris__Scheme-02 the address is 79 bytes, a version 5
// symbol printing a 0.244 mm module in the same strip.
//
// THE ADDRESS IS THE LIVE ONE, NEVER THE ONE IN THE ADDRESS BAR:
// Drawings are authored and exported on localhost - the editor is read-only on
// the web - so window.location is exactly the address a printed code must NOT
// carry. A code reading http://localhost:8000/... works on the authoring
// machine and on no phone in the world. The host and path are therefore a
// config value, and only the project's identity is read off the address bar.
//
// A PRINTED CODE OUTLIVES EVERYTHING IN THIS REPOSITORY:
// A code on an issued drawing sits in a site bag or a planning file for years
// and has no idea anything moved on. So the q folder must never be moved,
// renamed or removed, and if the pattern printed here ever changes, the
// resolver must go on answering the old one. The resolver is also what keeps
// old paper alive when the APP moves: the ValeVision address lives in that one
// page, and changing it there re-points every code ever printed.
"""))
    e.range(57, 63, '// PORT NOTE:', '// - ValeVision    : not yet ported.', block(r"""
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/53__Feature__ProjectQrCode/Na__ProjectQr__ProjectLink__.js
// - Source version: 1.1.0 (TrueVision3D v2.81.0, 20-Sep-2026; moved into the Layout Editor by v2.155.0,
//                   23-Sep-2026; read at HEAD b2aa9151)
// - Ported on     : PORT_DATE for ValeVision3D VVREL
// - Parity        : adapted - ValeVision's project identity; BuildUrl and CurrentUrl are TrueVision's line for line
// - Divergences   :
//   - Na__QrLink__CurrentProject reads ValeVision's identity, never the address bar's ?project= token:
//     projectFolder and year through Na__AppUtils__GetProjectFolderFromUrl and Na__AppUtils__GetYearFromUrl
//     (package W0-11: the master-index entry the token names, the year in four digits), and projectCode
//     is that entry's permanent resolver key, qrKey (DR-12's recommendation; package W5-05 writes the
//     keys), read once from the loader's memoised index (Na__AppUtils__InitMasterIndex) by the new
//     helper Na__QrLink__ResolverKey. No entry has a key yet, so no project has a code: with the
//     config's empty BaseUrl, a second guard keeping every code off a Vale drawing.
//   - Imports Na__AppUtils__InitMasterIndex in place of Na__AppUtils__GetProjectCodeFromUrl; the
//     constants region also holds the index the helper keeps.
//   - Module Start (new): a page already showing a project the loader has found reads the index as
//     the module loads, so the first sheet painted carries its code. With no page (a test) or no
//     project nothing is asked for.
//   - The header's address sections describe ValeVision (no resolver yet; the key, never the token);
//     the authoring port reads 8000 (ValeVision's Flask server) and the app the resolver opens is
//     ValeVision. CurrentProject's and CurrentUrl's comments say where the identity comes from.
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Lineage       : authored in TrueVision3D first (19-Sep-2026), after the Lantern Designer's
//                   VghLantern__Terms__QrLink__.js, which learned both lessons first: the scanned
//                   address must open on a phone that has never seen this system, and its length
//                   is what decides whether the code can be read at all.
// - Back-port     : none - the two identity functions are the seam; TrueVision keeps its URL parameters.
""".replace('PORT_DATE', PORT_DATE).replace('VVREL', VVREL)))
    e.range(85, 106, '    import {', '// endregion -------------------------------------------------------------------', block(r"""
    import {
        Na__AppUtils__GetProjectFolderFromUrl,
        Na__AppUtils__GetYearFromUrl,
        Na__AppUtils__InitMasterIndex
    } from '../../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Pattern Tokens
    // ------------------------------------------------------------
    const Na__QrLink__TOKEN_CODE   = '{projectCode}';
    const Na__QrLink__TOKEN_FOLDER = '{projectFolder}';
    const Na__QrLink__TOKEN_YEAR   = '{year}';
    // ------------------------------------------------------------

    // MODULE VARIABLES | The Project Loader's Master Index, Once It Has Settled
    // ------------------------------------------------------------
    let   Na__QrLink__IndexByFolderId = null;                                   // <-- Map of folderId to its master-index entry; null until it has been read
    let   Na__QrLink__IndexAsked      = false;                                  // <-- The loader's memoised index has been asked for
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
"""))
    e.range(109, 127, RULE79, '    // ------------------------------------------------------------', block(r"""
// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Resolver Key of a Project ('' when it has none)
    // ------------------------------------------------------------
    // The permanent qrKey of the project's master-index entry: written once by
    // the index writer and kept through a rename, so a printed code goes on
    // opening its project (DR-12; package W5-05 writes the keys). Never the
    // address bar's ?project= token and never the bare project code - see the
    // header.
    //
    // The index is the one the project loader loaded at start-up and holds as
    // a memoised promise (Na__AppUtils__InitMasterIndex). The folder and year
    // asked about come from that same index, so by the time there is a folder
    // the promise has settled: it is read once, a moment later, and kept. Until
    // then, and for an entry with no key - every entry until the resolver
    // exists - the answer is '', and a code needs its key, so none is drawn.
    // ------------------------------------------------------------
    function Na__QrLink__ResolverKey(year, projectFolder) {
        if (year === '' || projectFolder === '') return '';
        if (!Na__QrLink__IndexAsked) {
            Na__QrLink__IndexAsked = true;
            Promise.resolve(Na__AppUtils__InitMasterIndex()).then(
                (byFolderId) => { Na__QrLink__IndexByFolderId = (byFolderId instanceof Map) ? byFolderId : new Map(); },
                ()           => { Na__QrLink__IndexByFolderId = new Map(); });
        }
        const entry = Na__QrLink__IndexByFolderId ? Na__QrLink__IndexByFolderId.get(year + '/' + projectFolder) : null;
        const key   = entry ? entry.qrKey : null;
        return (typeof key === 'string' || typeof key === 'number') ? String(key).trim() : '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | The Identity of the Project the Application Is Showing
    // ------------------------------------------------------------
    // { projectCode, projectFolder, year }, each a trimmed string, empty when
    // it is not known. projectFolder and year are those of the master-index
    // entry the address bar names ("3047__Doous", "2026"), as the project
    // loader answers them: both empty until its index has settled and for a
    // project it does not list - the loader never guesses a year. projectCode
    // is that entry's resolver key (Na__QrLink__ResolverKey).
    // ------------------------------------------------------------
    function Na__QrLink__CurrentProject() {
        const text   = (value) => String(value === undefined || value === null ? '' : value).trim();
        const folder = text(Na__AppUtils__GetProjectFolderFromUrl());
        const year   = text(Na__AppUtils__GetYearFromUrl());
        return {
            projectCode   : Na__QrLink__ResolverKey(year, folder),
            projectFolder : folder,
            year          : year
        };
    }
    // ------------------------------------------------------------
"""))
    e.range(168, 171, '    // A project is only on screen when the loader has BOTH its code and its',
            '    // bar with half a project on it.', block(r"""
    // A project is only on screen when the loader has BOTH its code and its
    // folder (here: the master-index entry's resolver key and its folder), so
    // a short pattern that names the code alone still draws nothing for an
    // address bar with half a project on it.
"""))
    e.range(180, 182, '// endregion -------------------------------------------------------------------', '', block(r"""
// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Start
// -----------------------------------------------------------------------------

    // A page already showing a project the loader has found reads the index
    // now, rather than at its first paint, so the first sheet painted carries
    // its code. With no page or no project (a test, a page with no project on
    // its address bar) nothing is asked for.
    if (typeof window !== 'undefined' && window.location) void Na__QrLink__CurrentProject();

// endregion -------------------------------------------------------------------


"""))
    return rel, tv, e.apply()


# -----------------------------------------------------------------------------
# 5. Config (adapted: switched off, no address, notes for ValeVision)
# -----------------------------------------------------------------------------

CONFIG_VALUES = {
    'ProjectQr__Description':
        "Project QR Code: one QR symbol per project, carrying a short address that opens the project's live ValeVision model, "
        "printed automatically on every document in the pack so anybody holding a drawing can scan straight into 3D. The symbol "
        "is the same on every sheet of a project and different for every project. SWITCHED OFF IN VALEVISION until Adam picks a "
        "Vale resolver (DR-12): Enabled is false and BaseUrl and IndexUrl are empty, so no document draws a code. Every value here "
        "is a built-in default mirrored in Na__ProjectQr__Symbol__.js, and a file that cannot be read switches the system off: a "
        "failed fetch draws no code rather than a code nobody chose. WHERE a document puts the code is that document's business: "
        "the drawing title block's cell is sized in Na__LayoutEditor__AppConfig__.json under LayoutEditor__TitleBlock__Config "
        "(QrCell...), whose LayoutEditor__TitleBlock__QrCellEnabled is false as well.",
    'ProjectQr__PortedFrom':
        "TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/53__Feature__ProjectQrCode/Na__ProjectQr__Config__.json as "
        "TrueVision3D v2.120.0 shipped it (21-Sep-2026; read at HEAD b2aa9151), ported " + PORT_DATE + " (parity package W1-15). "
        "Every other key is TrueVision's. ValeVision's values: Enabled false, BaseUrl and IndexUrl empty (DR-12 (A): no Vale "
        "resolver yet), and the notes on the address, the key and the index. The symbol's colours, quiet zone and print floor and "
        "the note's words are TrueVision's (DR-43: the note names no app).",
    'ProjectQr__EnabledNote':
        "False draws no code anywhere: every document asks this system for the symbol and draws nothing when it is given none. "
        "The title block then gives the cell's room back to the fields. VALEVISION SHIPS IT FALSE (DR-12 (A)) until a Vale "
        "resolver exists. Switching it on is package W5-05, together with Link BaseUrl and IndexUrl, a permanent qrKey on every "
        "master-index entry, and LayoutEditor__TitleBlock__QrCellEnabled in the title block's config.",
    'ProjectQr__Link__BaseUrlNote':
        "EMPTY: VALEVISION HAS NO RESOLVER YET (DR-12). An empty base builds no address, so no code is drawn even with Enabled "
        "true - and Na__ProjectQr__Symbol__.js reads an empty value here as absent and falls back to its own built-in base, which "
        "is empty too. When Adam picks the resolver (package W5-05; the candidate is a q/ page on ValeCodebase's GitHub Pages, "
        "beside the Lantern Designer's t/ terms resolver) this is its address. THE RESOLVER, NOT THE APP, AND ALWAYS THE LIVE "
        "SITE: a flat page that looks the project's key up in its index and sends the phone on to the project's full ValeVision "
        "address. It is never window.location: drawings are authored and exported on localhost (the editor is read-only on the "
        "web), and a code reading http://localhost:8000/... opens on the authoring machine and on no phone in the world. Once a "
        "code is printed, the resolver's folder must never be moved, renamed or removed.",
    'ProjectQr__Link__QueryPatternNote':
        "Tokens: projectCode, projectFolder, year, each URL-encoded. In ValeVision projectCode is the project's RESOLVER KEY: "
        "the permanent qrKey of its master-index entry, written once by the index writer and kept through a rename (DR-12; "
        "package W5-05 writes them) - never the ?project= token on the address bar, which is usually a whole folderId and changes "
        "on a rename, and never the bare project code, which thirteen Vale projects share with a sibling scheme. projectFolder "
        "and year are the folder and four-digit year of the same master-index entry (Na__ProjectQr__ProjectLink__.js). A token "
        "the pattern asks for that the project cannot supply draws NO code, because a code that scans to a broken address is "
        "worse than none - so until the keys exist, no project has a code. The bare key is the whole query: no key name, no "
        "equals sign. If this pattern is ever changed once codes are printed, the resolver must go on answering the old form, "
        "because it is already on paper.",
    'ProjectQr__Link__LengthNote':
        "WHY THE ADDRESS HAS TO BE SHORT. Encoded length is the only thing deciding how many modules the symbol has, and module "
        "count against printed size is the only thing deciding whether a phone reads it - in the 10 mm title block the code is "
        "the strip's height less two modules of quiet zone above and below. TrueVision's printed address is 42 bytes, EXACTLY "
        "what a version 3 symbol holds at error correction M: 29 modules, 0.303 mm each; its full app address was 135 bytes, "
        "version 8, 49 modules, 0.19 mm, which no phone reads. FOR VALE: the candidate DR-12 names, a q/ page on ValeCodebase's "
        "GitHub Pages with a four or five character key, is 52 or 53 bytes - version 4, 33 modules, 0.270 mm, under the 0.28 mm "
        "floor (DR-12 pairs that address with a 0.265 mm floor); keyed by the address bar's token instead "
        "(2026/57994__Harris__Scheme-02) it would be 79 bytes, version 5, 0.244 mm; a short domain of Vale's own, about 21 bytes, "
        "would be version 2, 25 modules, 0.345 mm. Na__Test__ProjectQr__.test.mjs measures the candidate, the token form and the "
        "floor with the encoder itself.",
    'ProjectQr__Link__IndexUrlNote':
        "EMPTY: no resolver index yet, so the check is off (an empty string is an answer: no index, no check). Once the resolver "
        "exists (package W5-05) this is its index, relative to this system's folder, so it is found on the live site and on the "
        "local Flask server alike. On the authoring machine this system reads it once per project and says so on the console if "
        "the project on screen is missing from it, or is listed under a different folder or year - because a drawing exported "
        "then would carry a code that opens nothing. It lists each key under projects as { projectFolder, projectYear }, the "
        "year in four digits as ValeVision's project loader answers it ('2026'), and it is written by the index writer, never "
        "by hand.",
}

MIN_MODULE_NOTE_TAIL = (
    " IN VALEVISION, where no code is printed yet, the floor is TrueVision's: the Vale candidate address (a q/ page on "
    "ValeCodebase's GitHub Pages, version 4, 0.270 mm in this strip) would be reported by this guard, and DR-12 pairs that "
    "address with a 0.265 mm floor - a change for package W5-05 if that address is chosen."
)


def json_line(indent, key, value, comma=True):
    return ' ' * indent + json.dumps(key) + ': ' + json.dumps(value, ensure_ascii=False) + (',' if comma else '')


def port_config():
    rel = QR + 'Na__ProjectQr__Config__.json'
    tv  = tv_text(rel)
    tvj = json.loads(tv)
    e   = Edits('Config', tv)
    V   = CONFIG_VALUES
    e.range(2, 2, ('prefix', '    "ProjectQr__Description": "'), ('prefix', '    "ProjectQr__Description": "'), [
        json_line(4, 'ProjectQr__Description', V['ProjectQr__Description']),
        json_line(4, 'ProjectQr__PortedFrom', V['ProjectQr__PortedFrom']),
    ])
    e.range(4, 5, '    "ProjectQr__Enabled": true,', ('prefix', '    "ProjectQr__EnabledNote": "'), [
        json_line(4, 'ProjectQr__Enabled', False),
        json_line(4, 'ProjectQr__EnabledNote', V['ProjectQr__EnabledNote']),
    ])
    e.range(10, 11, ('prefix', '        "ProjectQr__Link__BaseUrl": "https://'), ('prefix', '        "ProjectQr__Link__BaseUrlNote": "'), [
        json_line(8, 'ProjectQr__Link__BaseUrl', ''),
        json_line(8, 'ProjectQr__Link__BaseUrlNote', V['ProjectQr__Link__BaseUrlNote']),
    ])
    e.range(14, 14, ('prefix', '        "ProjectQr__Link__QueryPatternNote": "'), ('prefix', '        "ProjectQr__Link__QueryPatternNote": "'), [
        json_line(8, 'ProjectQr__Link__QueryPatternNote', V['ProjectQr__Link__QueryPatternNote']),
    ])
    e.range(16, 16, ('prefix', '        "ProjectQr__Link__LengthNote": "'), ('prefix', '        "ProjectQr__Link__LengthNote": "'), [
        json_line(8, 'ProjectQr__Link__LengthNote', V['ProjectQr__Link__LengthNote']),
    ])
    e.range(18, 19, '        "ProjectQr__Link__IndexUrl": "../../../../../q/index.json",', ('prefix', '        "ProjectQr__Link__IndexUrlNote": "'), [
        json_line(8, 'ProjectQr__Link__IndexUrl', ''),
        json_line(8, 'ProjectQr__Link__IndexUrlNote', V['ProjectQr__Link__IndexUrlNote'], comma=False),
    ])
    e.range(35, 35, ('prefix', '        "ProjectQr__Symbol__MinModuleMmNote": "'), ('prefix', '        "ProjectQr__Symbol__MinModuleMmNote": "'), [
        json_line(8, 'ProjectQr__Symbol__MinModuleMmNote',
                  tvj['ProjectQr__Symbol__Config']['ProjectQr__Symbol__MinModuleMmNote'] + MIN_MODULE_NOTE_TAIL, comma=False),
    ])
    return rel, tv, e.apply()


# -----------------------------------------------------------------------------
# 6. README (rewritten whole for ValeVision)
# -----------------------------------------------------------------------------

def port_readme():
    rel = QR + 'README__ProjectQrCode__.md'
    tv  = tv_text(rel)
    with open(os.path.join(HERE, 'candidates', 'README__ProjectQrCode__.md'), 'rb') as fh:
        raw = fh.read()
    assert b'\r' not in raw, 'README candidate is not LF'
    return rel, tv, raw.decode('utf-8')


# -----------------------------------------------------------------------------
# 7. Decode test (verbatim)
# -----------------------------------------------------------------------------

def port_decode():
    rel = TST + 'Na__Test__ProjectQr__Decode__.py'
    tv  = tv_text(rel)
    e   = Edits('Decode', tv)
    e.range(3, 3, '# TRUEVISION3D - TEST - PROJECT QR CODE, READ BACK BY OPENCV', '# TRUEVISION3D - TEST - PROJECT QR CODE, READ BACK BY OPENCV',
            ['# VALEVISION3D - TEST - PROJECT QR CODE, READ BACK BY OPENCV'])
    e.range(37, 38, '#', '# =============================================================================', block(r"""
#
# -----------------------------------------------------------------------------
#
# PORT NOTE:
# - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__ProjectQr__Decode__.py
# - Source version: 1.1.0 (TrueVision3D v2.120.0, 21-Sep-2026, which read every case in both inks;
#                   the version is that of the suite it belongs to, Na__Test__ProjectQr__.test.mjs -
#                   this file carries none of its own; read at HEAD b2aa9151)
# - Ported on     : PORT_DATE for ValeVision3D VVREL
# - Parity        : verbatim
# - Divergences   :
#   - Banner reads ValeVision3D. The cases it reads are ValeVision's test's: the twenty version
#     cases, the Vale candidate address and the 42 byte reference, where TrueVision's include its
#     own printed address.
# - Back-port     : none.
#
# =============================================================================
""".replace('PORT_DATE', PORT_DATE).replace('VVREL', VVREL)))
    return rel, tv, e.apply()


# -----------------------------------------------------------------------------
# 8. The Node test (sections 1, 5, 6 TrueVision's; 2-4 adapted; 7 new)
# -----------------------------------------------------------------------------

TEST_SECTIONS_2_TO_4 = r"""
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
"""

TEST_SECTION_7 = r"""
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
"""


def port_test():
    rel = TST + 'Na__Test__ProjectQr__.test.mjs'
    tv  = tv_text(rel)
    e   = Edits('Test', tv)
    e.range(2, 2, '// TRUEVISION3D - TEST - PROJECT QR CODE', '// TRUEVISION3D - TEST - PROJECT QR CODE',
            ['// VALEVISION3D - TEST - PROJECT QR CODE'])
    e.range(21, 33, "// - THE SHIPPED CONFIG IS HELD TO ITS OWN FLOOR. The title block's code is the",
            "//   app's .js modules as CommonJS, so they are copied to temporary .mjs files.", block(r"""
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
"""))
    e.range(43, 44, RULE79, '//', block(r"""
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__ProjectQr__.test.mjs
// - Source version: 1.1.0 (TrueVision3D v2.120.0, 21-Sep-2026; its staging made depth-proof by v2.155.0,
//                   23-Sep-2026; read at HEAD b2aa9151)
// - Ported on     : PORT_DATE for ValeVision3D VVREL (package W5-05 rewrites section 4 once the
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
""".replace('PORT_DATE', PORT_DATE).replace('VVREL', VVREL)))
    e.range(85, 85, "    copyAs(join(MODULES, '03__AppUtils', 'Na__AppUtils__ProjectLoader.js'), 'ProjectLoader.mjs');",
            "    copyAs(join(MODULES, '03__AppUtils', 'Na__AppUtils__ProjectLoader.js'), 'ProjectLoader.mjs');", block(r"""
    // ValeVision's project loader imports its resilient fetch helper, which
    // goes across with it the same way (the helper imports nothing).
    copyAs(join(MODULES, '03__AppUtils', 'Na__AppUtils__ResilientLoad__.js'), 'ResilientLoad.mjs');
    copyAs(join(MODULES, '03__AppUtils', 'Na__AppUtils__ProjectLoader.js'), 'ProjectLoader.mjs',
        (source) => source.replace(/'\.\/Na__AppUtils__ResilientLoad__\.js'/, "'./ResilientLoad.mjs'"));
"""))
    e.range(100, 100, "    const STRIP_MM    = titleConfig['LayoutEditor__TitleBlock__HeightMm'];",
            "    const STRIP_MM    = titleConfig['LayoutEditor__TitleBlock__HeightMm'];", block(r"""
    const STRIP_MM    = titleConfig['LayoutEditor__TitleBlock__HeightMm'];
    const INDEX_URL   = qrConfig['ProjectQr__Link__Config']['ProjectQr__Link__IndexUrl'];
    const MASTER_INDEX = join(REPO_ROOT, 'WebApps', 'Whitecardopedia', '02__Src__AppModules', '03__AppData', 'Na__MasterIndex__ProjectLocations__.json');
"""))
    e.range(287, 363, RULE79, '// endregion -------------------------------------------------------------------', block(TEST_SECTIONS_2_TO_4))
    for n in (372, 373, 376, 378, 383, 386):
        e.sub(n, 'ps01Sym', 'refSym')
    line374 = e.lines[374 - 1]
    assert line374.count('ps01Sym') == 1, line374
    e.sub(374, 'ps01Sym', 'refSym')
    e.range(453, 454, '', '', [''] + [''] + block(TEST_SECTION_7) + [''] + [''])
    return rel, tv, e.apply()


# -----------------------------------------------------------------------------
# Checks, diff, write
# -----------------------------------------------------------------------------

def check_common(rel, text):
    problems = []
    if '\r' in text:
        problems.append('CR found')
    verbatim = rel.endswith(('Encoder__.js', 'Painter__.js'))
    for marker in FORBIDDEN + ([] if verbatim else FORBIDDEN_ADAPTED):
        if marker in text:
            problems.append('forbidden marker %r' % marker)
    name = rel.rsplit('/', 1)[1]
    if rel.endswith(('.js', '.mjs')):
        lines = text.split('\n')
        if not lines[1].startswith('// VALEVISION3D - '):
            problems.append('banner line 2 is %r' % lines[1])
        if ('// FILE       : ' + name) not in text:
            problems.append('FILE line does not name ' + name)
        if text.count(VVREL) != 1:
            problems.append('%d VVREL placeholders' % text.count(VVREL))
    if rel.endswith('.py'):
        if not text.split('\n')[2].startswith('# VALEVISION3D - '):
            problems.append('banner line 3')
        if text.count(VVREL) != 1:
            problems.append('%d VVREL placeholders' % text.count(VVREL))
    if rel.endswith(('.json', '.md')) and '{{VVREL' in text:
        problems.append('placeholder in a json/md file')
    return problems


def check_verbatim_body(rel, tv, vv):
    """Encoder and Painter: below the header, TrueVision's bytes apart from the console prefix."""
    rule = '// ============================================================================='
    def body(t):
        idx = -1
        for _ in range(3):
            idx = t.index(rule, idx + 1)
        return t[idx:]
    tv_body = body(tv).replace('[TrueVision3D ProjectQr]', '[ValeVision3D ProjectQr]')
    return [] if body(vv) == tv_body else ['code below the header differs from TrueVision']


def check_config(tv, vv):
    problems = []
    def strict(pairs):
        keys = [k for k, _ in pairs]
        dup = [k for k in keys if keys.count(k) > 1]
        if dup:
            raise ValueError('duplicate keys ' + repr(sorted(set(dup))))
        return dict(pairs)
    t = json.loads(tv)
    try:
        v = json.loads(vv, object_pairs_hook=strict)
    except ValueError as error:
        return ['JSON: ' + str(error)]
    def flat(d, p=''):
        out = {}
        for k, val in d.items():
            if isinstance(val, dict):
                out.update(flat(val, p + k + '/'))
            else:
                out[p + k] = val
        return out
    ft, fv = flat(t), flat(v)
    if set(fv) != set(ft) | {'ProjectQr__PortedFrom'}:
        problems.append('key set differs: extra %r missing %r' % (sorted(set(fv) - set(ft)), sorted(set(ft) - set(fv))))
    expect_vv = {
        'ProjectQr__Enabled': False,
        'ProjectQr__Link__Config/ProjectQr__Link__BaseUrl': '',
        'ProjectQr__Link__Config/ProjectQr__Link__IndexUrl': '',
    }
    for k, val in expect_vv.items():
        if fv.get(k) != val:
            problems.append('%s is %r' % (k, fv.get(k)))
    changed_ok = set(expect_vv) | {
        'ProjectQr__Description', 'ProjectQr__EnabledNote',
        'ProjectQr__Link__Config/ProjectQr__Link__BaseUrlNote', 'ProjectQr__Link__Config/ProjectQr__Link__QueryPatternNote',
        'ProjectQr__Link__Config/ProjectQr__Link__LengthNote', 'ProjectQr__Link__Config/ProjectQr__Link__IndexUrlNote',
        'ProjectQr__Symbol__Config/ProjectQr__Symbol__MinModuleMmNote',
    }
    for k in ft:
        if k not in changed_ok and fv.get(k) != ft[k]:
            problems.append('value of %s differs from TrueVision' % k)
    if not fv['ProjectQr__Symbol__Config/ProjectQr__Symbol__MinModuleMmNote'].startswith(ft['ProjectQr__Symbol__Config/ProjectQr__Symbol__MinModuleMmNote']):
        problems.append('MinModuleMmNote does not start with TrueVision\'s text')
    return problems


def changed_tv_lines(tv, vv):
    sm = difflib.SequenceMatcher(a=tv.split('\n'), b=vv.split('\n'), autojunk=False)
    spans = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            continue
        spans.append('%s TV %d-%d -> VV %d-%d' % (tag, i1 + 1, i2, j1 + 1, j2))
    return spans


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    dry = '--dry-run' in sys.argv
    results = [port_encoder(), port_painter(), port_symbol(), port_projectlink(), port_config(), port_readme(), port_decode(), port_test()]

    problems = []
    for rel, tv, vv in results:
        found = check_common(rel, vv)
        if rel.endswith(('Encoder__.js', 'Painter__.js')):
            found += check_verbatim_body(rel, tv, vv)
        if rel.endswith('.json'):
            found += check_config(tv, vv)
        for p in found:
            problems.append(rel + ': ' + p)
    os.makedirs(OUT, exist_ok=True)
    for rel, tv, vv in results:
        name = rel.rsplit('/', 1)[1]
        diff = difflib.unified_diff(tv.split('\n'), vv.split('\n'), 'TV/' + rel + '@' + PIN, 'VV/' + rel, lineterm='', n=1)
        with open(os.path.join(OUT, 'diff__' + name + '.txt'), 'w', encoding='utf-8', newline='\n') as fh:
            fh.write('\n'.join(diff) + '\n')
        with open(os.path.join(OUT, name), 'wb') as fh:
            fh.write(vv.encode('utf-8'))
        print('%-48s TV %5d lines  VV %5d lines  %s' % (name, tv.count('\n'), vv.count('\n'), '; '.join(changed_tv_lines(tv, vv))[:400]))
    if problems:
        print('\nCHECKS FAILED - nothing written:')
        for p in problems:
            print('  ' + p)
        return 1
    print('\nall checks passed')
    if dry:
        print('dry run: built into ' + OUT + ', nothing written to the app')
        return 0

    ledger = {}
    if os.path.exists(LEDGER):
        with open(LEDGER, encoding='utf-8') as fh:
            ledger = json.load(fh)
    targets = []
    for rel, tv, vv in results:
        path = os.path.join(VV_APP, rel.replace('/', os.sep))
        data = vv.encode('utf-8')
        if os.path.exists(path):
            with open(path, 'rb') as fh:
                current = sha(fh.read())
            if current != ledger.get(rel) and current != sha(data):
                print('REFUSED: ' + rel + ' exists and is not what this script wrote (sha ' + current[:12] + ') - nothing written')
                return 1
        targets.append((rel, path, data))
    for rel, path, data in targets:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'wb') as fh:
            fh.write(data)
        ledger[rel] = sha(data)
        print('wrote %-90s %7d bytes  sha256 %s' % (rel, len(data), sha(data)[:16]))
    with open(LEDGER, 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(ledger, fh, indent=1, sort_keys=True)
        fh.write('\n')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
