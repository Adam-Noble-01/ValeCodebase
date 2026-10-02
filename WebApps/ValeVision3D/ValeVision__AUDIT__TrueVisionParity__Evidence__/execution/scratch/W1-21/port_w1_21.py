# -*- coding: utf-8 -*-
# W1-21 port script: the SheetModel facade 1.35.1, the Sheets unit 1.4.0 and History 1.7.0 taken whole from
# TrueVision at the pin (b2aa9151), TrueVision's Na__Test__SheetsNormaliseOnce__ 1.0.1 ported whole, and the
# loader's late start (Na__LeLoad__AnnounceProjectLoad deleted) - one change.
#
# Seams re-applied on the TrueVision files, and nothing else:
#   - the banner (K2 H1) on all four; the printed title on the test (as every ported test prints)
#   - the PORT NOTE (K2 H5) replacing TrueVision's own (the test, which has none, gains one)
#   - the Sheets unit's RenumberSheets: no drawing number written without a Drawing Register block
#     (vv_adaptations; DR-11; S03b-F08) - one inserted line
# The loader is this app's own file (no TrueVision twin): it is patched from its pre-image with anchored
# replace-once edits, CRLF kept.
#
#   python -B port_w1_21.py --stage <dir>   build all five candidates into <dir> (nothing in the repo is touched)
#   python -B port_w1_21.py --write         hash-guarded write of the five live files (pre-images kept in preimage/)
#   python -B port_w1_21.py --verify        rebuild and compare with the live files; prove each TrueVision file on
#                                           disk minus its seams is TrueVision's file byte for byte
#   python -B port_w1_21.py --restore       put the four pre-images back and remove the new test (only while the
#                                           live files are exactly as this script wrote them)
#
# Every replacement must match exactly once, or nothing is built. TrueVision's files are written as git show
# returns them (LF, the whole-file rule, F.1 P18); the three existing ones were CRLF. The loader keeps CRLF.

import hashlib
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
VV_APP = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
PREIMAGE_DIR = os.path.join(HERE, 'preimage')
WRITTEN_LOG = os.path.join(HERE, 'sha256__written.txt')

DATA = '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/'
FILES = {
    'facade':  DATA + 'Na__LayoutEditor__SheetModel__.js',
    'sheets':  DATA + 'Na__LayoutEditor__SheetModel__Sheets__.js',
    'history': DATA + 'Na__LayoutEditor__History__.js',
    'test':    '80__Testing__PrototypeEnvironment/Na__Test__SheetsNormaliseOnce__.test.mjs',
    'loader':  '02__Src__AppModules/51__System__LayoutEditor/01__Core__Loader/Na__LayoutEditor__Loader__.js',
}
ORDER = ['facade', 'sheets', 'history', 'test', 'loader']
TV_KEYS = ['facade', 'sheets', 'history', 'test']

# TrueVision's bytes at the pin, as this script was written against them
TV_SHA256 = {
    'facade':  '55ca27aac3340aa4a6b0461dfc14f210f7ea2f65ffe968df4a9d226615b0b332',
    'sheets':  'cecf5f1974a27d11801daadcd4c8eb4116f3740a86389ff2048457df5f20623d',
    'history': 'a3d0a35a4575db7dec9e2bd8982b7750b1974894ac2eabe8fa88e07d338d0065',
    'test':    '7892a7f221e0c17bcfd1905bcab1fe6bf335711658ae5e483654726f6e8386e5',
}

# ValeVision's live files as this package read them (W0-02's facade, W0-06's History, HEAD's Sheets unit,
# W1-99's loader after the W1 placeholders resolved); the test is new
VV_BEFORE_SHA256 = {
    'facade':  '9bcc81315a679fe45e82751c92c51d94e2ce81eca509ca25108e4ffbe1e0056c',
    'sheets':  '76653733a6c3e4971243dc71de4b8c37115407e62f507ad74829f29fccb4cf6e',
    'history': 'a6f16d9dd46428d14096017de55e5371eed90eb9b31db3d020069480106e9761',
    'test':    None,
    'loader':  '7fb6adb5cf2a4876f40c92b8fa4cf349252eb7c697b5147b48e7dafaf6b3424f',
}

RULE = '// -----------------------------------------------------------------------------\n'
LOG_TAIL = '//\n' + RULE + '//\n// DEVELOPMENT LOG:\n'
DR01 = ('//                   Ported under DR-01 (c): the Port Record names every TrueVision release it\n'
        '//                   carries that Adam has not confirmed in TrueVision itself.\n')
PORTED_ON = '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-21}}'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def live_path(key):
    return os.path.join(VV_APP, *FILES[key].split('/'))


# -----------------------------------------------------------------------------
# The PORT NOTE blocks (K2 H5)
# -----------------------------------------------------------------------------

PORT_NOTES = {
    'facade': (
        '// PORT NOTE:\n'
        '// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0 port Phase 5); TrueVision3D took it\n'
        '//                   for its v2.21.0 re-alignment and grew it to 1.35.1, while this app\'s copy grew to\n'
        '//                   its own 1.18.0 taking most of TrueVision\'s changes piecemeal (to 20-Sep-2026,\n'
        '//                   ValeVision3D v2.67.0 to v2.69.0); since ported back whole from TrueVision3D 1.35.1\n'
        '//                   (HEAD b2aa9151)\n'
        '// - Source version: 1.35.1 (TrueVision3D v2.147.0, 22-Sep-2026; read at b2aa9151), with the Drawing\n'
        '//                   Register\'s two hooks its log does not record, NotifyRegister and\n'
        '//                   FinishRegisterDeletion (19-Sep-2026, git b6baf301 and 32767407)\n'
        + PORTED_ON + ', in one change with the Sheets\n'
        '//                   unit 1.4.0, History 1.7.0 and the loader\'s late start\n'
        '// - Parity        : verbatim - TrueVision\'s file; the banner and this note are the only differences.\n'
        '//                   Initialize listens on the drawings change event alone and announces a load that\n'
        '//                   landed before it (1.35.0), so the loader no longer announces it again (the\n'
        '//                   loader\'s 1.1.4). Save hands the drawings save a report and says where the sheets\n'
        '//                   went (1.11.0, 1.29.0). AnnounceRestore lives here now, not in the Sheets unit.\n'
        '//                   NotifyRegister and FinishRegisterDeletion wait for the Drawing Register (DR-11).\n'
        + DR01 +
        '// - Divergences   :\n'
        '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
        '// - Back-port     : none.\n'
    ),
    'sheets': (
        '// PORT NOTE:\n'
        '// - Authored in   : ValeVision3D first (1.0.0, 15-Sep-2026, v2.47.0: split out of\n'
        '//                   Na__LayoutEditor__SheetModel__.js); TrueVision3D took the split for its v2.55.0 and\n'
        '//                   grew it to 1.4.0, while this app\'s copy took TrueVision\'s 1.1.0 as its own 1.1.0\n'
        '//                   (short tab names, 19-Sep-2026, ValeVision3D v2.61.0); since ported back whole from\n'
        '//                   TrueVision3D 1.4.0 (HEAD b2aa9151)\n'
        '// - Source version: 1.4.0 (TrueVision3D v2.147.0, 22-Sep-2026; read at b2aa9151)\n'
        + PORTED_ON + ', in one change with the facade\n'
        '//                   1.35.1\n'
        '// - Parity        : adapted - TrueVision\'s file with the one seam below and nothing else. The\n'
        '//                   DESCRIPTION\'s "TrueVision only" and the log\'s "not yet in ValeVision" are\n'
        '//                   TrueVision\'s words, kept as written: this app has the whole unit now, the site\n'
        '//                   plan tab groups dormant with site plans (DR-08 (B)). AnnounceRestore moved to the\n'
        '//                   facade, as in TrueVision. A tab\'s code is cut from the drawing number with its\n'
        '//                   default ("D01"), as TrueVision\'s tabs are (v2.71.0, DR-11).\n'
        + DR01 +
        '// - Divergences   :\n'
        '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
        '//   - RenumberSheets writes no drawing number while the project has no Drawing Register block\n'
        '//     (LayoutEditor__DrawingRegister, read through this app\'s transport facade at TrueVision\'s\n'
        '//     path): it numbers Sheet__Order 1..n down the tab order and leaves every stored\n'
        '//     Sheet__Fields__DrawingNumber as it was, typed numbers included (DR-11, S03b-F08).\n'
        '//     TrueVision falls back to its config\'s series and renumbers every sheet. With a register\n'
        '//     block it is TrueVision\'s numbering exactly.\n'
        '// - Back-port     : none (DR-42).\n'
    ),
    'history': (
        '// PORT NOTE:\n'
        '// - Authored in   : ValeVision3D first (1.0.0, 10-Sep-2026, v2.21.7 port Phase 5, after the plan\n'
        '//                   annotations\' history pattern); TrueVision3D took it for its v2.21.0 re-alignment\n'
        '//                   and grew it to 1.7.0, while this app\'s copy took TrueVision\'s changes as its own\n'
        '//                   1.1.0 to 1.4.1 (to 20-Sep-2026, ValeVision3D v2.65.0), with a records note 1.4.2\n'
        '//                   (v2.71.1); since ported back whole from TrueVision3D 1.7.0 (HEAD b2aa9151)\n'
        '// - Source version: 1.7.0 (TrueVision3D v2.104.0, 21-Sep-2026; read at b2aa9151)\n'
        + PORTED_ON + ', in one change with the facade\n'
        '//                   1.35.1\n'
        '// - Parity        : verbatim - TrueVision\'s file; the banner and this note are the only differences.\n'
        '//                   A notes margin change (\'margin\', 1.4.0) and a floor area change (\'areas\', 1.7.0)\n'
        '//                   are steps now (DR-40 item 4): this app\'s copy left both out, so a margin change\n'
        '//                   was no step and the next step swallowed it. The register-updated rewrite of kept\n'
        '//                   steps (1.6.0) waits for the Drawing Register (DR-11).\n'
        + DR01 +
        '// - Divergences   :\n'
        '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
        '// - Legacy        : TrueVision\'s DEVELOPMENT LOG, taken verbatim (DR-34 (a)), gives 1.3.0 twice -\n'
        '//                   14-Sep-2026 (the selection set) and 19-Sep-2026 (the common fields), the second\n'
        '//                   below the first - so its order and repeat findings print WARN until TrueVision\n'
        '//                   renumbers its own log (WT-08). This app\'s 1.4.2 had renumbered its copy (W0-06).\n'
        '// - Back-port     : none.\n'
    ),
    'test': (
        '// PORT NOTE:\n'
        '// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__SheetsNormaliseOnce__.test.mjs\n'
        '// - Source version: 1.0.1 (written with TrueVision3D v2.136.0, 21-Sep-2026; 1.0.1, the units read as LF,\n'
        '//                   landed 22-Sep-2026 in no release, git b1e0220f; read at b2aa9151)\n'
        + PORTED_ON + ', with the Sheets unit it proves\n'
        '// - Parity        : verbatim - every check is TrueVision\'s, run against this app\'s own Sheets and\n'
        '//                   State units\n'
        '// - Divergences   :\n'
        '//   - Banner and the printed title read ValeVision3D.\n'
        '// - Back-port     : none.\n'
    ),
}


# -----------------------------------------------------------------------------
# Reading and building
# -----------------------------------------------------------------------------

def read_tv(key):
    out = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + TV_APP + FILES[key]], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if out.returncode != 0:
        raise SystemExit('git show failed for %s: %s' % (key, out.stderr.decode('utf-8', 'replace')))
    data = out.stdout
    if sha(data) != TV_SHA256[key]:
        raise SystemExit('%s: TrueVision bytes at the pin are not the ones this script was written against' % key)
    if b'\r' in data:
        raise SystemExit('%s: unexpected CR in TrueVision text' % key)
    return data.decode('utf-8')


def once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit('%s: expected exactly one match, found %d' % (label, count))
    return text.replace(old, new)


def tv_port_note(text, key):
    start = text.find('// PORT NOTE:\n')
    if start == -1 or text.count('// PORT NOTE:\n') != 1:
        raise SystemExit('%s: TrueVision PORT NOTE heading not found exactly once' % key)
    end = text.find(LOG_TAIL, start)
    if end == -1:
        raise SystemExit('%s: TrueVision PORT NOTE has no DEVELOPMENT LOG after it' % key)
    return text[start:end]


RENUMBER_ANCHOR = (
    '        const data = Na__CfApi__GetLoadedProjectData() || {};\n'
    '        const block = data.LayoutEditor__DrawingRegister || {};\n'
)
RENUMBER_SEAM = (
    '        const data = Na__CfApi__GetLoadedProjectData() || {};\n'
    '        if (!data.LayoutEditor__DrawingRegister) { sheets.forEach((sheet, index) => { sheet.Sheet__Order = index + 1; }); return; }   // <-- ValeVision: no Drawing Register block, no drawing number written (DR-11); the tab order alone, 1..n\n'
    '        const block = data.LayoutEditor__DrawingRegister || {};\n'
)

TEST_TITLE = ("    console.log('TrueVision3D - sheets are normalised once per announcement');\n",
              "    console.log('ValeVision3D - sheets are normalised once per announcement');\n")
TEST_NOTE_ANCHOR = '//   Exit 0 = every check passed. Exit 1 = at least one did not.\n' + LOG_TAIL


def tv_seams(key, tv_text):
    """The (label, old, new) replacements for one TrueVision file, in order."""
    banner_tv = tv_text.split('\n')[1] + '\n'
    if not banner_tv.startswith('// TRUEVISION3D - '):
        raise SystemExit('%s: unexpected banner %r' % (key, banner_tv))
    out = [('banner (K2 H1)', banner_tv, banner_tv.replace('// TRUEVISION3D - ', '// VALEVISION3D - ', 1))]
    if key == 'test':
        out.append(('printed title', TEST_TITLE[0], TEST_TITLE[1]))
        out.append(('PORT NOTE inserted (K2 H5; TrueVision\'s test has none)', TEST_NOTE_ANCHOR,
                    '//   Exit 0 = every check passed. Exit 1 = at least one did not.\n//\n' + RULE + '//\n'
                    + PORT_NOTES['test'] + LOG_TAIL))
    else:
        out.append(('PORT NOTE (K2 H5)', tv_port_note(tv_text, key), PORT_NOTES[key]))
    if key == 'sheets':
        out.append(('RenumberSheets: no drawing number without a register block (vv_adaptations, DR-11)', RENUMBER_ANCHOR, RENUMBER_SEAM))
    return out


def build_tv(key):
    tv_text = read_tv(key)
    text = tv_text
    for label, old, new in tv_seams(key, tv_text):
        text = once(text, old, new, '%s: %s' % (key, label))
    if '\r' in text:
        raise SystemExit('%s: built text holds a CR' % key)
    return text.encode('utf-8')


def reverse_tv(key, live_bytes):
    tv_text = read_tv(key)
    text = live_bytes.decode('utf-8')
    for label, old, new in reversed(tv_seams(key, tv_text)):
        text = once(text, new, old, '%s: reverse %s' % (key, label))
    return text.encode('utf-8')


# -----------------------------------------------------------------------------
# The loader (this app's own file, CRLF): anchored edits on its pre-image
# -----------------------------------------------------------------------------

LOADER_EDITS = [
    ('DESCRIPTION: the late start is the sheet model\'s',
     '// - A LATE START. The drawings block arrived while the page started; the\n'
     '//   editor arrives later. Once it has initialised, the sheet model\'s project\n'
     '//   load is announced once more, so auto save, history and the spec links\n'
     '//   take the start they would have had.\n',
     '// - A LATE START. The drawings block arrived while the page started; the\n'
     '//   editor arrives later. The sheet model announces that load itself, once,\n'
     '//   as TrueVision\'s does (its late start, SheetModel 1.35.0): it finds the\n'
     '//   drawings already loaded when it initialises and says so on a microtask,\n'
     '//   after the mode controller\'s start-up pass has attached auto save,\n'
     '//   history and the spec links. Nothing here announces it again.\n'),

    ('DESCRIPTION: the same answer either side of the load',
     '//   is asked only for what the block cannot say: what is open, what is\n'
     '//   unsaved, the configured wording.\n',
     '//   is asked only for what the block cannot say: what is open, what is\n'
     '//   unsaved, the configured wording and the register\'s numbering series.\n'),

    ('INTEGRATION: the drawing number rule is mirrored too',
     '//   view names, OpenRegister, OpenStatements and Ready, and the sheet\n'
     '//   records\' site plan rule. The body class it puts on at a press is the\n'
     '//   mode controller\'s (na-layout-editor--active), which the header\'s fold,\n'
     '//   the 3D furniture\'s hiding block and the loading screen all key on.\n',
     '//   view names, OpenRegister, OpenStatements and Ready, and the sheet\n'
     '//   records\' site plan and drawing number rules. The body class it puts on\n'
     '//   at a press is the mode controller\'s (na-layout-editor--active), which\n'
     '//   the header\'s fold, the 3D furniture\'s hiding block and the loading\n'
     '//   screen all key on.\n'),

    ('PORT NOTE Mirrors: the drawing number rule',
     '//                   rule (Na__LeRec__IsSitePlanSheet, \'siteplan\', TrueVision3D v2.48.0); and the first\n',
     '//                   rule (Na__LeRec__IsSitePlanSheet, \'siteplan\', TrueVision3D v2.48.0) and drawing\n'
     '//                   number (Na__LeRec__DrawingNumber: the stored number, else the register\'s series\n'
     '//                   and the sheet\'s place, TrueVision3D v2.71.0); and the first\n'),

    ('PORT NOTE Ported on: this change',
     '//                   the editor through this facade alone)\n',
     '//                   the editor through this facade alone); 02-Oct-2026 for ValeVision3D\n'
     '//                   {{VVREL:W1-21}} (the sheet model\'s own late start; the drawing number\'s default)\n'),

    ('DEVELOPMENT LOG: 1.1.4',
     '// DEVELOPMENT LOG:\n'
     '// 02-Oct-2026 - Version 1.1.3 (TrueVision\'s tab strip 2.0.0, v2.71.2)\n',
     '// DEVELOPMENT LOG:\n'
     '// 02-Oct-2026 - Version 1.1.4 ({{VVREL:W1-21}})\n'
     '// - THE SHEET MODEL ANNOUNCES ITS OWN LATE START. The sheet model is\n'
     '//   TrueVision\'s 1.35.1 now, and its Initialize announces a project load\n'
     '//   that landed before the editor did - once, on a microtask, after the\n'
     '//   mode controller\'s start-up pass has attached auto save, history and\n'
     '//   the spec links - and runs the common field seed, which the loader\'s\n'
     '//   re-announcement had skipped. Na__LeLoad__AnnounceProjectLoad and its\n'
     '//   call are gone: kept, the load would be announced twice.\n'
     '// - CheckNames checks the site plan drawing type, now that the sheet model\n'
     '//   declares DRAWING_SITEPLAN.\n'
     '// - A TAB\'S CODE FOLLOWS THE SHEET RECORDS\' DRAWING NUMBER. GetDrawingNumber,\n'
     '//   GetShortCode and GetTabLabel read TrueVision\'s rule\n'
     '//   (Na__LeRec__DrawingNumber): the stored number, else the register\'s\n'
     '//   series and the sheet\'s place ("D01"), the series read from the\n'
     '//   editor\'s config once it has loaded. The sheet model reads the same\n'
     '//   rule now that its Sheets unit is TrueVision\'s, so the Drawings menu,\n'
     '//   its hover and the Dev list name a drawing as the toolbar and the Sheet\n'
     '//   panel do, before the load and after it.\n'
     '//\n'
     '// 02-Oct-2026 - Version 1.1.3 (TrueVision\'s tab strip 2.0.0, v2.71.2)\n'),

    ('imports: the leaf\'s stored-number reader is no longer read here',
     '    import { Na__LeCode__StoredNumber, Na__LeCode__ShortCode, Na__LeCode__Compose } from \'../07__Core__SheetData/Na__LayoutEditor__DrawingCode__.js\';',
     '    import { Na__LeCode__ShortCode, Na__LeCode__Compose } from \'../07__Core__SheetData/Na__LayoutEditor__DrawingCode__.js\';'),

    ('the drawing number by the sheet records\' rule (new helpers)',
     '    // HELPER FUNCTION | The Web Read-Only Flag, Read as the Config Module Reads It\n',
     '    // HELPER FUNCTION | The Drawing Register\'s Numbering Series: the Editor\'s Config Once Loaded\n'
     '    // ------------------------------------------------------------\n'
     '    // { prefix, digits, ... } from the editor\'s own reader once it has loaded;\n'
     '    // before that an empty setup, and the rule below falls back to the\n'
     '    // defaults the sheet records fall back to (D, two digits).\n'
     '    // ------------------------------------------------------------\n'
     '    function Na__LeLoad__RegisterSetup() {\n'
     '        const read  = Na__LeLoad__Editor ? Na__LeLoad__Editor.config.Na__LeCfg__GetDrawingRegisterSetup : null;\n'
     '        const setup = (typeof read === \'function\') ? read() : null;\n'
     '        return (setup && typeof setup === \'object\') ? setup : {};\n'
     '    }\n'
     '    // ------------------------------------------------------------\n'
     '\n'
     '\n'
     '    // HELPER FUNCTION | A Sheet\'s Drawing Number, by the Sheet Records\' Rule (TrueVision\'s Na__LeRec__DrawingNumber)\n'
     '    // ------------------------------------------------------------\n'
     '    // The number a sheet stores, else the register\'s series and the sheet\'s\n'
     '    // place in the order ("D01") - TrueVision\'s rule line for line, which\n'
     '    // the sheet model reads too. The pre-load views carry Sheet__Order with\n'
     '    // the sheet model\'s own fallback, so a sheet reads the same number\n'
     '    // either side of the load.\n'
     '    // ------------------------------------------------------------\n'
     '    function Na__LeLoad__DrawingNumber(sheet) {\n'
     '        const stored = (sheet && sheet.Sheet__Fields) ? sheet.Sheet__Fields.Sheet__Fields__DrawingNumber : undefined;\n'
     '        if (typeof stored === \'string\') return stored;\n'
     '        const setup  = Na__LeLoad__RegisterSetup();\n'
     '        const digits = Math.max(1, Math.min(6, Math.round(Number(setup.digits) || 2)));\n'
     '        return String(setup.prefix || \'D\') + String(sheet ? sheet.Sheet__Order : 1).padStart(digits, \'0\');\n'
     '    }\n'
     '    // ------------------------------------------------------------\n'
     '\n'
     '\n'
     '    // HELPER FUNCTION | The Web Read-Only Flag, Read as the Config Module Reads It\n'),

    ('CheckNames comment: no copy left waiting',
     '    // One row per copy the editor declares. A copy whose constant the editor\n'
     '    // does not declare yet - the site plan type until the sheet model takes\n'
     '    // DRAWING_SITEPLAN - gets its row in the change that declares it: a row\n'
     '    // reading a name the editor does not export fails the export harness,\n'
     '    // which is what that harness is for.\n',
     '    // One row per copy the editor declares. A copy whose constant the editor\n'
     '    // does not declare yet gets its row in the change that declares it: a\n'
     '    // row reading a name the editor does not export fails the export\n'
     '    // harness, which is what that harness is for.\n'),

    ('CheckNames: the site plan drawing type row',
     '            [ Na__LeLoad__VIEW_STATEMENT, editor.mode.Na__LeMode__VIEW_STATEMENT, \'the statements view name\' ]\n',
     '            [ Na__LeLoad__VIEW_STATEMENT, editor.mode.Na__LeMode__VIEW_STATEMENT, \'the statements view name\' ],\n'
     '            [ Na__LeLoad__DRAWING_SITEPLAN, editor.model.Na__LeModel__DRAWING_SITEPLAN, \'the site plan drawing type\' ]\n'),

    ('Na__LeLoad__AnnounceProjectLoad deleted (the sheet model\'s late start replaces it)',
     '    // HELPER FUNCTION | Announce the Project Load the Editor Started Too Late to Hear\n'
     '    // ------------------------------------------------------------\n'
     '    // The sheet model announces a project load as \'loaded\', and three modules\n'
     '    // act on it: auto save puts an unsaved browser draft back, history takes\n'
     '    // its baseline, and the spec links carry bubble codes across. The mode\n'
     '    // controller ignores it while no sheet is open. Announced once, in the\n'
     '    // model\'s own shape, after all of them are listening.\n'
     '    // ------------------------------------------------------------\n'
     '    function Na__LeLoad__AnnounceProjectLoad(editor) {\n'
     '        window.dispatchEvent(new CustomEvent(editor.model.Na__LeModel__CHANGED_EVENT, {\n'
     '            detail : { reason : \'loaded\', sheetId : null, itemId : null }\n'
     '        }));\n'
     '    }\n'
     '    // ------------------------------------------------------------\n'
     '\n'
     '\n',
     ''),

    ('Run: the header says who announces the load',
     '    // Resolves to the editor, or to null when its config has it off. Rejects\n'
     '    // when a file cannot be fetched or linked, or the editor fails to start.\n',
     '    // Resolves to the editor, or to null when its config has it off. Rejects\n'
     '    // when a file cannot be fetched or linked, or the editor fails to start.\n'
     '    // The project load is announced by the sheet model itself while the mode\n'
     '    // controller starts (its late start), so nothing is announced here.\n'),

    ('Run: the re-announcement call deleted',
     '        Na__LeLoad__AnnounceProjectLoad(editor);\n',
     ''),

    ('tab labels: the comment names the shared rule',
     '    // Na__LeModel__GetTabLabel composes the same two parts through the same\n'
     '    // configured format.\n',
     '    // Na__LeModel__GetTabLabel composes the same two parts through the same\n'
     '    // configured format, from the same drawing number (Na__LeLoad__DrawingNumber).\n'),

    ('GetTabLabel reads the drawing number with its default',
     '        return Na__LeCode__Compose(Na__LeCode__ShortCode(Na__LeCode__StoredNumber(sheet)), words, Na__LeLoad__GetLabel(\'TabLabelFormat\', \'{code} - {name}\'));\n',
     '        return Na__LeCode__Compose(Na__LeCode__ShortCode(Na__LeLoad__DrawingNumber(sheet)), words, Na__LeLoad__GetLabel(\'TabLabelFormat\', \'{code} - {name}\'));\n'),

    ('GetShortCode and GetDrawingNumber read it too',
     '    function Na__LeLoad__GetShortCode(sheet) { return Na__LeCode__ShortCode(Na__LeCode__StoredNumber(sheet)); }\n'
     '    function Na__LeLoad__GetDrawingNumber(sheet) { return Na__LeCode__StoredNumber(sheet); }\n',
     '    function Na__LeLoad__GetShortCode(sheet) { return Na__LeCode__ShortCode(Na__LeLoad__DrawingNumber(sheet)); }\n'
     '    function Na__LeLoad__GetDrawingNumber(sheet) { return Na__LeLoad__DrawingNumber(sheet); }\n'),
]


def build_loader(pre_bytes):
    text = pre_bytes.decode('utf-8')
    crlf = text.count('\r\n')
    bare = text.count('\n') - crlf
    if bare != 0 or crlf == 0:
        raise SystemExit('loader: expected a pure CRLF file (crlf %d, bare LF %d)' % (crlf, bare))
    text = text.replace('\r\n', '\n')
    for label, old, new in LOADER_EDITS:
        text = once(text, old, new, 'loader: ' + label)
    if 'AnnounceProjectLoad' in text.replace('Na__LeLoad__AnnounceProjectLoad and its\n', ''):
        # the only mention left is the log line naming the deletion
        rest = [line for line in text.split('\n') if 'AnnounceProjectLoad' in line]
        if any(not line.lstrip().startswith('//') for line in rest):
            raise SystemExit('loader: AnnounceProjectLoad survives in code')
    if 'Na__LeCode__StoredNumber' in text:
        raise SystemExit('loader: the stored-number reader is still referenced')
    return text.replace('\n', '\r\n').encode('utf-8')


def build(key, live_pre=None):
    if key in TV_KEYS:
        return build_tv(key)
    if live_pre is None:
        live_pre = open(live_path('loader'), 'rb').read()
    return build_loader(live_pre)


# -----------------------------------------------------------------------------
# Modes
# -----------------------------------------------------------------------------

def main(argv):
    if not argv:
        raise SystemExit('usage: port_w1_21.py --stage <dir> | --write | --verify | --restore')
    mode = argv[0]

    if mode == '--stage':
        out_dir = argv[1]
        loader_pre = open(live_path('loader'), 'rb').read()
        if sha(loader_pre) != VV_BEFORE_SHA256['loader'] and not os.path.isfile(os.path.join(PREIMAGE_DIR, 'loader.before')):
            raise SystemExit('stage: the live loader is not the file this package read, and no pre-image is kept')
        if sha(loader_pre) != VV_BEFORE_SHA256['loader']:
            loader_pre = open(os.path.join(PREIMAGE_DIR, 'loader.before'), 'rb').read()
        for key in ORDER:
            data = build(key, loader_pre if key == 'loader' else None)
            dst = os.path.join(out_dir, *FILES[key].split('/'))
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            with open(dst, 'wb') as fh:
                fh.write(data)
            print('staged %-8s %6d bytes  %5d lines  crlf %4d  sha256 %s  %s' % (key, len(data), data.count(b'\n'), data.count(b'\r\n'), sha(data), FILES[key]))
        return

    if mode == '--write':
        problems = []
        for key in ORDER:
            p = live_path(key)
            want = VV_BEFORE_SHA256[key]
            if want is None:
                if os.path.exists(p):
                    problems.append('%s exists already' % FILES[key])
            else:
                have = sha(open(p, 'rb').read()) if os.path.isfile(p) else None
                if have != want:
                    problems.append('%s is not the file this package read (sha256 %s)' % (FILES[key], have))
        if problems:
            raise SystemExit('REFUSED: ' + '; '.join(problems))
        built = {key: build(key) for key in ORDER}
        os.makedirs(PREIMAGE_DIR, exist_ok=True)
        for key in ORDER:
            if VV_BEFORE_SHA256[key] is not None:
                with open(os.path.join(PREIMAGE_DIR, key + '.before'), 'wb') as fh:
                    fh.write(open(live_path(key), 'rb').read())
        for key in ORDER:
            with open(live_path(key), 'wb') as fh:
                fh.write(built[key])
        with open(WRITTEN_LOG, 'w', encoding='utf-8') as fh:
            for key in ORDER:
                fh.write('%s  %s\n' % (sha(built[key]), FILES[key]))
        for key in ORDER:
            print('written %-8s %6d bytes  crlf %4d  sha256 %s' % (key, len(built[key]), built[key].count(b'\r\n'), sha(built[key])))
        return

    if mode == '--verify':
        problems = 0
        loader_pre = open(os.path.join(PREIMAGE_DIR, 'loader.before'), 'rb').read()
        for key in ORDER:
            p = live_path(key)
            if not os.path.isfile(p):
                print('verify: %s is missing' % FILES[key]); problems += 1; continue
            live = open(p, 'rb').read()
            fresh = build(key, loader_pre if key == 'loader' else None)
            if live != fresh:
                print('verify: the live %s differs from a fresh build' % FILES[key]); problems += 1
            if key in TV_KEYS:
                if reverse_tv(key, live) != read_tv(key).encode('utf-8'):
                    print('verify: the live %s minus its seams is not TrueVision\'s file' % FILES[key]); problems += 1
                else:
                    print('verify: %-8s = TrueVision %s + %d seam(s)' % (key, TV_SHA256[key][:12], len(tv_seams(key, read_tv(key)))))
            else:
                print('verify: %-8s = pre-image %s + %d anchored edit(s), CRLF kept' % (key, VV_BEFORE_SHA256[key][:12], len(LOADER_EDITS)))
        print('verify: %d problem(s)' % problems)
        sys.exit(1 if problems else 0)

    if mode == '--restore':
        written = {}
        for line in open(WRITTEN_LOG, 'r', encoding='utf-8'):
            digest, rel = line.strip().split('  ', 1)
            written[rel] = digest
        for key in ORDER:
            if sha(open(live_path(key), 'rb').read()) != written[FILES[key]]:
                raise SystemExit('REFUSED: %s has changed since W1-21 wrote it; restore by hand from preimage/' % FILES[key])
        for key in ORDER:
            if VV_BEFORE_SHA256[key] is None:
                os.remove(live_path(key))
            else:
                with open(live_path(key), 'wb') as fh:
                    fh.write(open(os.path.join(PREIMAGE_DIR, key + '.before'), 'rb').read())
        print('restored four pre-images and removed the new test')
        return

    raise SystemExit('unknown mode ' + mode)


if __name__ == '__main__':
    main(sys.argv[1:])
