# -*- coding: utf-8 -*-
# W1-19 port script: SheetRecords 1.39.0 taken whole from TrueVision at the pin, with ValeVision's
# seams re-applied, and the DrawingCode leaf's comments / PORT NOTE brought up to date (comment-only).
#
#   python -B port_w1_19.py --stage <dir>   build both candidates into <dir> (nothing in the repo is touched)
#   python -B port_w1_19.py --write         hash-guarded write of both live files (pre-images kept in preimage/)
#   python -B port_w1_19.py --verify        rebuild from the pin and compare with the live files; also prove the
#                                           live SheetRecords minus its seams is TrueVision's file byte for byte
#   python -B port_w1_19.py --restore       put both pre-images back (only while the live files are as written)
#
# Every replacement must match exactly once, or nothing is written. SheetRecords is written as git show
# returns TrueVision's text (LF); the DrawingCode leaf keeps its own line ending (CRLF).

import hashlib
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
TV_REL = 'na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js'
TV_SHA256 = '152205f6f02f0e9ee776418166b0915a111799a8519171b1af021212b05c450a'

VV_APP = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
DATA = os.path.join(VV_APP, '02__Src__AppModules', '51__System__LayoutEditor', '07__Core__SheetData')
REC_PATH = os.path.join(DATA, 'Na__LayoutEditor__SheetRecords__.js')
LEAF_PATH = os.path.join(DATA, 'Na__LayoutEditor__DrawingCode__.js')
REC_BEFORE_SHA256 = '6cfc54e1785ec6325c68e5a162135db631e732b8da8737ea69be4f647a31b535'   # W0-02's landed file (1.15.0)
LEAF_BEFORE_SHA256 = '9c206edcba428281082132776c69849f2459946b812e1379837d25b25cd5cc1b'  # HEAD 7b4e593a (1.0.0)

PREIMAGE_DIR = os.path.join(HERE, 'preimage')
WRITTEN_LOG = os.path.join(HERE, 'sha256__written.txt')


def sha(data):
    return hashlib.sha256(data).hexdigest()


# -----------------------------------------------------------------------------
# SheetRecords: TrueVision's text and the seams
# -----------------------------------------------------------------------------

TV_PORT_NOTE = (
    "// PORT NOTE:\n"
    "// - Ported from   : ValeVision3D 51__System__LayoutEditor/Na__LayoutEditor__SheetRecords__.js\n"
    "// - Ported on     : 10-Sep-2026 for TrueVision3D v2.21.0 (re-alignment)\n"
    "// - Parity        : verbatim\n"
    "// - Divergences   : Console prefix, header and folder numbers; site plan drawings (Sheet__DrawingType), TrueVision first on 14-Sep-2026; Shape__Holes (holed vectors), TrueVision first on 22-Sep-2026.\n"
    "// - Back-port     : n/a (this IS the back-port)\n"
)

VV_PORT_NOTE = (
    "// PORT NOTE:\n"
    "// - Authored in   : ValeVision3D first (1.0.0, 10-Sep-2026, v2.21.0 port Phase 5: split from\n"
    "//                   Na__LayoutEditor__SheetModel__.js 1.0.0); TrueVision3D took it the same day (its\n"
    "//                   v2.21.0 re-alignment) and grew it to 1.39.0, while this app's copy took TrueVision's\n"
    "//                   records piecemeal as its own 1.2.0 to 1.15.0 (to ValeVision3D v2.66.0: TrueVision's\n"
    "//                   fields to its 1.22.0, and v2.74.0's Common fields); since ported back whole from\n"
    "//                   TrueVision3D 1.39.0 (HEAD b2aa9151)\n"
    "// - Source version: 1.39.0 (TrueVision3D v2.152.0, 23-Sep-2026; read at b2aa9151), with the two edits\n"
    "//                   TrueVision's log for this file does not record: Asset__Samples (v2.58.2, 17-Sep-2026,\n"
    "//                   git 5665508c) and the projected edges' Category__LineTypeScale and Category__FillHex\n"
    "//                   (git 55014c6a, 29-Sep-2026, named in no release)\n"
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-19}}\n"
    "// - Parity        : adapted - TrueVision's file with the four seams below and nothing else. Ported\n"
    "//                   under DR-01 (c): Adam has confirmed none of the TrueVision releases it carries in\n"
    "//                   TrueVision itself; the Port Record names them.\n"
    "// - Divergences   :\n"
    "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
    "//   - SITEPLAN_CATEGORY_PREFIX holds ValeVision__SitePlan__ (DR-08 (B), K2 K3): this app's site plan\n"
    "//     store names the categories with its own token. No viewport here draws a site plan yet.\n"
    "//   - DocumentId composes its {project} from Na__DrawData__GetDocumentCode() - the loaded project's\n"
    "//     own code (3047) - never Na__DrawData__GetProjectCode(), this app's ?project= token\n"
    "//     (2026/3047__Doous), which only the transport reads (DR-11, R0 PD-20).\n"
    "//   - ShortCode and StripSheetCode answer from Na__LayoutEditor__DrawingCode__, the leaf the loader\n"
    "//     reads before the editor exists (DR-24, R0 PD-05): the same two rules, held once.\n"
    "//     Na__LeRec__SheetShortCode (this app only, K2 X2) cuts the code from the STORED number for\n"
    "//     the tab strip, until the Sheets unit takes TrueVision's reading.\n"
    "// - Back-port     : none (DR-42). TrueVision taking the DrawingCode leaf (DR-42 item 4, WT-10) and a\n"
    "//                   document-code accessor would retire the last two seams.\n"
)

LEAF_IMPORT = (
    "    import {\n"
    "        Na__LeCode__StoredNumber,\n"
    "        Na__LeCode__ShortCode,\n"
    "        Na__LeCode__StripSheetCode\n"
    "    } from './Na__LayoutEditor__DrawingCode__.js';                               // <-- ValeVision: the tab code rules, in a leaf the loader can import before the editor exists (DR-24)\n"
)

COMMON_IMPORT = "    import { Na__LeCommon__Get, Na__LeCommon__Uses, Na__LeCommon__KEYS } from './Na__LayoutEditor__SheetModel__Common__.js';   // <-- A leaf: it reaches the drawings block and the admin record, never back here\n"

TV_SHORTCODE_BODY = (
    "    function Na__LeRec__ShortCode(drawingNumber) {\n"
    "        const text  = String(drawingNumber === undefined || drawingNumber === null ? '' : drawingNumber).trim();\n"
    "        const match = /[A-Za-z]+[-_ ]?\\d+$/.exec(text);\n"
    "        return match ? match[0] : '';\n"
    "    }\n"
    "    // ------------------------------------------------------------\n"
)

VV_SHORTCODE_BODY = (
    "    function Na__LeRec__ShortCode(drawingNumber) {\n"
    "        return Na__LeCode__ShortCode(drawingNumber);                             // <-- ValeVision: the rule itself lives in Na__LayoutEditor__DrawingCode__ (DR-24)\n"
    "    }\n"
    "    // ------------------------------------------------------------\n"
    "\n"
    "\n"
    "    // FUNCTION | The Short Code a Tab Carries Today, Cut From the STORED Number (ValeVision only)\n"
    "    // ------------------------------------------------------------\n"
    "    // This app's tab strip reads it until the sheet model's Sheets unit takes\n"
    "    // TrueVision's reading, which cuts the code from DrawingNumber, default\n"
    "    // included. A sheet with no stored number answers '' and its tab shows\n"
    "    // its name, as every tab here has until now.\n"
    "    // ------------------------------------------------------------\n"
    "    function Na__LeRec__SheetShortCode(sheet) {\n"
    "        return Na__LeCode__ShortCode(Na__LeCode__StoredNumber(sheet));\n"
    "    }\n"
    "    // ------------------------------------------------------------\n"
)

TV_STRIP_BODY = (
    "    function Na__LeRec__StripSheetCode(name, drawingNumber) {\n"
    "        const text = String(name === undefined || name === null ? '' : name);\n"
    "        if (!/^\\s*[A-Za-z]+[-_ ]?\\d/.test(text)) return text;                    // <-- The common case, settled without building a pattern\n"
    "        const letters = (/^[A-Za-z]+/.exec(Na__LeRec__ShortCode(drawingNumber)) || [ '' ])[0];\n"
    "        if (!letters) return text;                                              // <-- A pack the register has never numbered has no series to match: nothing comes off\n"
    "        const bare = text.replace(new RegExp('^\\\\s*' + letters + '[-_ ]?\\\\d+\\\\s*[-\\\\u2013\\\\u2014\\\\u00b7:|]\\\\s*', 'i'), '').trim();\n"
    "        return bare ? bare : text;\n"
    "    }\n"
)

VV_STRIP_BODY = (
    "    function Na__LeRec__StripSheetCode(name, drawingNumber) {\n"
    "        return Na__LeCode__StripSheetCode(name, drawingNumber);                  // <-- ValeVision: likewise, held in the leaf (DR-24)\n"
    "    }\n"
)

REC_SEAMS = [
    ('banner (K2 H1)',
     "// TRUEVISION3D - LAYOUT EDITOR - SHEET RECORDS\n",
     "// VALEVISION3D - LAYOUT EDITOR - SHEET RECORDS\n"),
    ('PORT NOTE (K2 H5)', TV_PORT_NOTE, VV_PORT_NOTE),
    ('site plan category prefix (DR-08 (B), K2 K3)',
     "    const Na__LeRec__SITEPLAN_CATEGORY_PREFIX = 'TrueVision__SitePlan__';       // <-- Category keys of site plan layers (the export's stems)\n",
     "    const Na__LeRec__SITEPLAN_CATEGORY_PREFIX = 'ValeVision__SitePlan__';       // <-- Category keys of site plan layers (the export's stems)\n"),
    ('document code import (DR-11, PD-20)',
     "    import { Na__DrawData__GetProjectCode } from '../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js';\n",
     "    import { Na__DrawData__GetDocumentCode } from '../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js';   // <-- ValeVision: the document code, not the ?project= token (DR-11)\n"),
    ('DrawingCode leaf import (DR-24, PD-05)', COMMON_IMPORT, COMMON_IMPORT + LEAF_IMPORT),
    ('document code call (DR-11, PD-20)',
     "        return Na__LeRec__ComposeDocumentId(Na__DrawData__GetProjectCode(), Na__LeRec__Phase(sheet), Na__LeRec__DrawingNumber(sheet));\n",
     "        return Na__LeRec__ComposeDocumentId(Na__DrawData__GetDocumentCode(), Na__LeRec__Phase(sheet), Na__LeRec__DrawingNumber(sheet));   // <-- ValeVision: the project's own code (3047), never the folder token (DR-11)\n"),
    ('ShortCode through the leaf + SheetShortCode (DR-24, K2 X2)', TV_SHORTCODE_BODY, VV_SHORTCODE_BODY),
    ('StripSheetCode through the leaf (DR-24)', TV_STRIP_BODY, VV_STRIP_BODY),
    ('SheetShortCode export (K2 X2)',
     "        Na__LeRec__ShortCode,\n        Na__LeRec__StripSheetCode,\n        Na__LeRec__BuildFields\n",
     "        Na__LeRec__ShortCode,\n"
     "        Na__LeRec__SheetShortCode,                                              // <-- ValeVision only (K2 X2): the tab strip's stored-number code\n"
     "        Na__LeRec__StripSheetCode,\n        Na__LeRec__BuildFields\n"),
]


# -----------------------------------------------------------------------------
# DrawingCode leaf: comment-only edits (its own CRLF kept)
# -----------------------------------------------------------------------------

LEAF_EDITS = [
    ('PORT NOTE to the K2 H5 form',
     "// PORT NOTE:\n"
     "// - Ported from   : TrueVision3D v2.70.0 (short sheet tabs), where these three\n"
     "//                   functions sit inside Na__LayoutEditor__SheetRecords__ as\n"
     "//                   Na__LeRec__ShortCode, StripSheetCode and the label format.\n"
     "// - Parity        : behaviour verbatim; the split into a leaf is ValeVision's\n"
     "//                   own, because TrueVision's tab strip imports the sheet model\n"
     "//                   directly and has no loader facade to serve.\n"
     "// - Back-port     : offer to TrueVision3D only if its tab strip is ever made\n"
     "//                   lazy; until then the split would buy it nothing.\n",
     "// PORT NOTE:\n"
     "// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js\n"
     "//                   (short sheet tabs), where these functions sit inside the sheet\n"
     "//                   records as Na__LeRec__ShortCode and StripSheetCode, beside the\n"
     "//                   Sheets unit's tab label format.\n"
     "// - Source version: 1.21.0 (TrueVision3D v2.70.0, 19-Sep-2026; read at b2aa9151); both\n"
     "//                   rules are unchanged there to SheetRecords 1.39.0\n"
     "// - Ported on     : 19-Sep-2026 for ValeVision3D v2.61.0; header brought to the K2 H5\n"
     "//                   form on 02-Oct-2026 for ValeVision3D {{VVREL:W1-19}}\n"
     "// - Parity        : adapted - behaviour verbatim; the split into a leaf is\n"
     "//                   ValeVision's own, because TrueVision's tab strip imports the\n"
     "//                   sheet model directly and has no loader facade to serve.\n"
     "// - Divergences   :\n"
     "//   - A file of its own: the sheet records import it, and so does the loader,\n"
     "//     before the editor exists (DR-24, R0 PD-05).\n"
     "// - Back-port     : offer to TrueVision3D only if its tab strip is ever made\n"
     "//                   lazy (DR-42 item 4, WT-10); until then the split would buy\n"
     "//                   it nothing.\n"),
    ('DEVELOPMENT LOG 1.0.1 (newest first)',
     "// DEVELOPMENT LOG:\n"
     "// 19-Sep-2026 - Version 1.0.0\n",
     "// DEVELOPMENT LOG:\n"
     "// 02-Oct-2026 - Version 1.0.1 ({{VVREL:W1-19}})\n"
     "// - Comments only, with the sheet records taken whole at TrueVision's 1.39.0:\n"
     "//   StoredNumber's note names the title block's default as it now is - the\n"
     "//   register's own series, \"D04\" - in place of the old project-code default;\n"
     "//   the PORT NOTE in the K2 H5 form. No code changed.\n"
     "//\n"
     "// 19-Sep-2026 - Version 1.0.0\n"),
    ('StoredNumber note: the default the title block falls back to now',
     "    // ONLY WHAT WAS STORED, never the project default the title block falls\n"
     "    // back to. That default is the project code and the sheet's place in the\n"
     "    // order (\"CL01-01\"), which is not a drawing code and must never become one\n"
     "    // on a tab. It also works on the loader's lightweight pre-load sheet views,\n"
     "    // which carry the same field object.\n",
     "    // ONLY WHAT WAS STORED, never the default the title block falls back to\n"
     "    // (Na__LeRec__DrawingNumber: the register's own series and the sheet's\n"
     "    // place in the order, \"D04\", since the sheet records took TrueVision's\n"
     "    // v2.71.0 numbering). The loader reads a sheet before the editor exists,\n"
     "    // from the raw record, so a stored number is all it can know. It also\n"
     "    // works on the loader's lightweight pre-load sheet views, which carry\n"
     "    // the same field object.\n"),
]


# -----------------------------------------------------------------------------
# Building
# -----------------------------------------------------------------------------

def read_tv():
    out = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + TV_REL], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if out.returncode != 0:
        raise SystemExit('git show failed: ' + out.stderr.decode('utf-8', 'replace'))
    data = out.stdout
    if sha(data) != TV_SHA256:
        raise SystemExit('TrueVision bytes at the pin are not the ones this script was written against')
    if b'\r' in data:
        raise SystemExit('unexpected CR in TrueVision text')
    return data.decode('utf-8')


def apply(text, seams, label):
    for name, old, new in seams:
        count = text.count(old)
        if count != 1:
            raise SystemExit('%s: seam "%s" matches %d time(s), expected exactly 1' % (label, name, count))
        text = text.replace(old, new)
    return text


def build_records():
    text = apply(read_tv(), REC_SEAMS, 'SheetRecords')
    return text.encode('utf-8')


def build_leaf(leaf_bytes):
    if sha(leaf_bytes) != LEAF_BEFORE_SHA256:
        raise SystemExit('the DrawingCode leaf is not the file this script was written against')
    text = leaf_bytes.decode('utf-8')
    crlf = '\r\n' in text
    if crlf and text.replace('\r\n', '').find('\n') != -1:
        raise SystemExit('mixed line endings in the DrawingCode leaf')
    work = text.replace('\r\n', '\n') if crlf else text
    work = apply(work, LEAF_EDITS, 'DrawingCode')
    if crlf:
        work = work.replace('\n', '\r\n')
    return work.encode('utf-8')


def reverse_records(live_bytes):
    """Undo every seam on the live text: must give TrueVision's bytes exactly."""
    text = live_bytes.decode('utf-8')
    for name, old, new in reversed(REC_SEAMS):
        count = text.count(new)
        if count != 1:
            raise SystemExit('reverse: seam "%s" matches %d time(s) in the live file' % (name, count))
        text = text.replace(new, old)
    return text.encode('utf-8')


def main(argv):
    if not argv:
        raise SystemExit(__doc__ if __doc__ else 'see the header of this file')
    mode = argv[0]
    rec = build_records()
    leaf_live = open(LEAF_PATH, 'rb').read()

    if mode == '--stage':
        out_dir = argv[1]
        os.makedirs(out_dir, exist_ok=True)
        leaf = build_leaf(leaf_live) if sha(leaf_live) == LEAF_BEFORE_SHA256 else None
        with open(os.path.join(out_dir, 'Na__LayoutEditor__SheetRecords__.js'), 'wb') as fh:
            fh.write(rec)
        print('staged SheetRecords  %d bytes  sha256 %s' % (len(rec), sha(rec)))
        if leaf is not None:
            with open(os.path.join(out_dir, 'Na__LayoutEditor__DrawingCode__.js'), 'wb') as fh:
                fh.write(leaf)
            print('staged DrawingCode   %d bytes  sha256 %s' % (len(leaf), sha(leaf)))
        return

    if mode == '--write':
        rec_live = open(REC_PATH, 'rb').read()
        if sha(rec_live) != REC_BEFORE_SHA256:
            raise SystemExit('REFUSED: the live SheetRecords is not the file this package read (sha256 %s)' % sha(rec_live))
        if sha(leaf_live) != LEAF_BEFORE_SHA256:
            raise SystemExit('REFUSED: the live DrawingCode leaf is not the file this package read (sha256 %s)' % sha(leaf_live))
        leaf = build_leaf(leaf_live)
        os.makedirs(PREIMAGE_DIR, exist_ok=True)
        with open(os.path.join(PREIMAGE_DIR, 'Na__LayoutEditor__SheetRecords__.js.before'), 'wb') as fh:
            fh.write(rec_live)
        with open(os.path.join(PREIMAGE_DIR, 'Na__LayoutEditor__DrawingCode__.js.before'), 'wb') as fh:
            fh.write(leaf_live)
        with open(REC_PATH, 'wb') as fh:
            fh.write(rec)
        with open(LEAF_PATH, 'wb') as fh:
            fh.write(leaf)
        with open(WRITTEN_LOG, 'w', encoding='utf-8') as fh:
            fh.write('%s  %s\n' % (sha(rec), 'Na__LayoutEditor__SheetRecords__.js'))
            fh.write('%s  %s\n' % (sha(leaf), 'Na__LayoutEditor__DrawingCode__.js'))
        print('written SheetRecords  %d bytes (LF)    sha256 %s' % (len(rec), sha(rec)))
        print('written DrawingCode   %d bytes (CRLF)  sha256 %s' % (len(leaf), sha(leaf)))
        return

    if mode == '--verify':
        rec_live = open(REC_PATH, 'rb').read()
        problems = 0
        if rec_live != rec:
            print('verify: the live SheetRecords differs from a fresh build from the pin'); problems += 1
        if reverse_records(rec_live) != read_tv().encode('utf-8'):
            print('verify: the live SheetRecords minus its seams is not TrueVision\'s file'); problems += 1
        pre_leaf = os.path.join(PREIMAGE_DIR, 'Na__LayoutEditor__DrawingCode__.js.before')
        if os.path.isfile(pre_leaf):
            if leaf_live != build_leaf(open(pre_leaf, 'rb').read()):
                print('verify: the live DrawingCode leaf differs from a fresh build from its pre-image'); problems += 1
        print('verify: %d problem(s)' % problems)
        sys.exit(1 if problems else 0)

    if mode == '--restore':
        rec_live = open(REC_PATH, 'rb').read()
        pre_rec = open(os.path.join(PREIMAGE_DIR, 'Na__LayoutEditor__SheetRecords__.js.before'), 'rb').read()
        pre_leaf = open(os.path.join(PREIMAGE_DIR, 'Na__LayoutEditor__DrawingCode__.js.before'), 'rb').read()
        if rec_live != rec or leaf_live != build_leaf(pre_leaf):
            raise SystemExit('REFUSED: a live file has changed since W1-19 wrote it; restore by hand from preimage/')
        with open(REC_PATH, 'wb') as fh:
            fh.write(pre_rec)
        with open(LEAF_PATH, 'wb') as fh:
            fh.write(pre_leaf)
        print('restored both pre-images')
        return

    raise SystemExit('unknown mode ' + mode)


if __name__ == '__main__':
    main(sys.argv[1:])
