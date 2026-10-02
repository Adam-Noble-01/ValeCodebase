# -*- coding: utf-8 -*-
# W1-20 port script: the sheet model's units taken whole from TrueVision at the pin (b2aa9151) - State 1.2.0,
# Layers 1.4.0, Shapes 1.6.0, Viewports 1.4.0, TextAndDimensions 1.2.0, Leaders 1.2.0, Groups 1.3.0, the new
# AreaGroups 1.0.0, and DrawOrder 1.0.0 and Common 1.0.0 (code already identical: their headers re-synced) -
# with ValeVision's seams re-applied: the banner (K2 H1), the console prefix (K2 C1) and the PORT NOTE (K2 H5).
# Nothing else differs from TrueVision's bytes.
#
#   python -B port_w1_20.py --stage <dir>   build all ten candidates into <dir> (nothing in the repo is touched)
#   python -B port_w1_20.py --write         hash-guarded write of the ten live files (pre-images kept in preimage/)
#   python -B port_w1_20.py --verify        rebuild from the pin and compare with the live files; also prove each
#                                           live file minus its seams is TrueVision's file byte for byte
#   python -B port_w1_20.py --restore       put the nine pre-images back and remove AreaGroups (only while the
#                                           live files are exactly as this script wrote them)
#
# Every replacement must match exactly once, or nothing is built. The files are written as git show returns
# TrueVision's text (LF), the whole-file rule (F.1 P18); the nine existing files were CRLF.

import hashlib
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
TV_DIR = 'na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/'
VV_DATA = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\07__Core__SheetData'
PREIMAGE_DIR = os.path.join(HERE, 'preimage')
WRITTEN_LOG = os.path.join(HERE, 'sha256__written.txt')

UNITS = ['State', 'Layers', 'Shapes', 'Viewports', 'TextAndDimensions', 'Leaders', 'Groups', 'AreaGroups', 'DrawOrder', 'Common']

# TrueVision's bytes at the pin, as this script was written against them
TV_SHA256 = {
    'State':             'f54c99edeab8cc8310c21c96a1d4529bb5082343f0bbbf9406b2cd78874dce7c',
    'Layers':            '948c3d9c1b42aac4c635a8c4b3ee056a8601dd3226a757cb56a8344cc4cfc94c',
    'Shapes':            'a5a5ae96c59d07d11996bb270603ee87fe79af0d6191ecc8ff1fb3766efe7975',
    'Viewports':         'b466ea05481d43654a5979557df2921b5e0ace747f5264fe0681e59d1e23719d',
    'TextAndDimensions': '1027110762a16a32420e96d660640c40146ba79ef2ede37b79bdb33a48166e62',
    'Leaders':           'cb566a7cb131a6c001dfcbc3cd7b1f9969fceea5c5cc54c0d772f205b17418c9',
    'Groups':            '3b90718ce96ce72b56cf9bdb36c5cf09df9dd9c05ea07007779a86e1a037d285',
    'AreaGroups':        'b9baff222dabe6ad5a1eee411eb102c3b5deccc5c076ade045622b085d685a68',
    'DrawOrder':         '44ac11af762ed0b727576c736b9365e6ce6130386ce0acce65aabe342064d4a4',
    'Common':            '1c5f004b370ea08a2c735e66f93c48d80a9deb1612fe3f28d0c8b61d05b595af',
}

# ValeVision's live files as this package read them (W0-02's landed bytes; HEAD's for the six W0-02 left alone)
VV_BEFORE_SHA256 = {
    'State':             'ddbb356a5e6d67b5a7b47312ea52c1170aecc2c9a15b5a1bc5446cfaade4dc7e',
    'Layers':            'fc39b74cfa285324017c8c46502d70dcec9426c82aa3c1b570de3379156c6960',
    'Shapes':            '135cdb112ecc4c655c823c46e0037b25d2185a36f00cada98887b7a1118ed718',
    'Viewports':         '8deea4477bc2e86975bb16f58e45a3d6799d4630477720ab2ab030649c013f95',
    'TextAndDimensions': 'b101323169923e4cdb7b44dc257efab0bc7ac9e1260866f31f01d247e32e5d0f',
    'Leaders':           'b0fac95fe51e5df27a2c5e1c77c1ce6ef1f5ce8708a1ec14a3c2f91757449671',
    'Groups':            '416d49179d5437ef1215daf07b19491ba370719928e9b4b23dcd2ac121bad908',
    'AreaGroups':        None,                                                   # <-- new: must not exist yet
    'DrawOrder':         'dd176298268da6a49b0a328e86ecdd21a02a8571583535a6afa5a5605e969671',
    'Common':            '49d8b5b57bb908d41b58df03c1f8840ef8f1b9ceb502594341bd6bd98ee373f2',
}

RULE = '// -----------------------------------------------------------------------------\n'
LOG_TAIL = '//\n' + RULE + '//\n// DEVELOPMENT LOG:\n'


def fname(unit):
    return 'Na__LayoutEditor__SheetModel__' + unit + '__.js'


def sha(data):
    return hashlib.sha256(data).hexdigest()


# -----------------------------------------------------------------------------
# The PORT NOTE blocks (K2 H5) - one per file
# -----------------------------------------------------------------------------

SPLIT = ('ValeVision3D first (1.0.0, 15-Sep-2026, v2.47.0: split out of\n'
         '//                   Na__LayoutEditor__SheetModel__.js); TrueVision3D took the split for its v2.55.0')
PORTED_ON = '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-20}}\n'
DR01 = ('//                   Ported under DR-01 (c): the Port Record names every TrueVision release it\n'
        '//                   carries that Adam has not confirmed in TrueVision itself.\n')

PORT_NOTES = {
    'State': (
        '// PORT NOTE:\n'
        '// - Authored in   : ' + SPLIT + ' and\n'
        '//                   grew it to 1.2.0, while this app\'s copy took TrueVision\'s 1.1.0 as its own 1.1.0\n'
        '//                   (RegisterBeforeAnnounce, 20-Sep-2026, ValeVision3D v2.68.0); since ported back whole\n'
        '//                   from TrueVision3D 1.2.0 (HEAD b2aa9151)\n'
        '// - Source version: 1.2.0 (TrueVision3D v2.136.0, 21-Sep-2026; read at b2aa9151)\n'
        + PORTED_ON +
        '// - Parity        : verbatim - TrueVision\'s file; the banner, the console prefix and this note are\n'
        '//                   the only differences. The DESCRIPTION\'s "TrueVision only" and the log\'s "not yet\n'
        '//                   in ValeVision" are TrueVision\'s words, kept as written: this app has the drawing\n'
        '//                   types and Revision now (the drawing types are dormant with site plans, DR-08 (B)).\n'
        + DR01 +
        '// - Divergences   :\n'
        '//   - Banner and console prefix read ValeVision3D.\n'
        '// - Back-port     : none.\n'
    ),
    'Layers': (
        '// PORT NOTE:\n'
        '// - Authored in   : ' + SPLIT + ' and\n'
        '//                   grew it to 1.4.0, while this app\'s copy stayed at 1.0.0; since ported back whole\n'
        '//                   from TrueVision3D 1.4.0 (HEAD b2aa9151)\n'
        '// - Source version: 1.4.0 (TrueVision3D v2.127.0, 21-Sep-2026; read at b2aa9151)\n'
        + PORTED_ON +
        '// - Parity        : verbatim - TrueVision\'s file; the banner and this note are the only differences.\n'
        '//                   TrueVision\'s own note held 1.3.0 and 1.4.0 for Adam\'s sign-off, not given yet.\n'
        '//                   DeleteLayer now re-homes the vectors of a deleted layer (1.1.0); this app\'s 1.0.0\n'
        '//                   left them naming a layer that was gone.\n'
        + DR01 +
        '// - Divergences   :\n'
        '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
        '// - Back-port     : none.\n'
    ),
    'Shapes': (
        '// PORT NOTE:\n'
        '// - Authored in   : ' + SPLIT + ' and\n'
        '//                   grew it to 1.6.0, while this app\'s copy stayed at 1.0.0; since ported back whole\n'
        '//                   from TrueVision3D 1.6.0 (HEAD b2aa9151)\n'
        '// - Source version: 1.6.0 (TrueVision3D v2.150.0, 22-Sep-2026; read at b2aa9151), with the edit\n'
        '//                   TrueVision\'s log for this file does not record: the hatch on CreateShape and\n'
        '//                   UpdateShape (v2.90.0, 20-Sep-2026, git 62dade1c)\n'
        + PORTED_ON +
        '// - Parity        : verbatim - TrueVision\'s file; the banner and this note are the only differences.\n'
        '//                   InsertShape now writes the layer it falls back to (1.4.0): this app\'s 1.0.0 kept\n'
        '//                   a record\'s id for a layer the sheet did not have.\n'
        + DR01 +
        '// - Divergences   :\n'
        '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
        '// - Back-port     : none.\n'
    ),
    'Viewports': (
        '// PORT NOTE:\n'
        '// - Authored in   : ' + SPLIT + ' -\n'
        '//                   the site plan viewports, the model source and the frame and door keys already in\n'
        '//                   it - and grew it to 1.4.0, while this app\'s copy took TrueVision\'s 1.1.0 as its own\n'
        '//                   1.1.0 (the viewport namer, 20-Sep-2026, ValeVision3D v2.67.0); since ported back\n'
        '//                   whole from TrueVision3D 1.4.0 (HEAD b2aa9151)\n'
        '// - Source version: 1.4.0 (TrueVision3D v2.142.0, 22-Sep-2026; read at b2aa9151), with the site plan\n'
        '//                   patch keys TrueVision\'s log for this file does not record: sitePlanStoreId (git\n'
        '//                   bef15277, 20-Sep-2026) and sitePlanPlanType, sitePlanComposites and sitePlanHatch\n'
        '//                   (v2.89.0, 20-Sep-2026, git 62dade1c)\n'
        + PORTED_ON +
        '// - Parity        : verbatim - TrueVision\'s file; the banner, the console prefix and this note are\n'
        '//                   the only differences. The site plan paths are dormant here: no viewport of this\n'
        '//                   app is a site plan until a Vale pipeline exists (DR-08 (B)). "TrueVision only" in\n'
        '//                   the DESCRIPTION is TrueVision\'s word for IsSitePlanViewport, kept as written.\n'
        + DR01 +
        '// - Divergences   :\n'
        '//   - Banner and console prefix read ValeVision3D.\n'
        '// - Back-port     : none.\n'
    ),
    'TextAndDimensions': (
        '// PORT NOTE:\n'
        '// - Authored in   : ' + SPLIT + ' -\n'
        '//                   Measure at scale and the fixed length extension lines already in it - and grew it\n'
        '//                   to 1.2.0, while this app\'s copy took TrueVision\'s InsertDimension as its own 1.1.0\n'
        '//                   (20-Sep-2026, ValeVision3D v2.69.0); since ported back whole from TrueVision3D\n'
        '//                   1.2.0 (HEAD b2aa9151)\n'
        '// - Source version: 1.2.0 (TrueVision3D v2.142.0, 22-Sep-2026; read at b2aa9151), with the edit\n'
        '//                   TrueVision\'s log for this file does not record: linePt and dash on\n'
        '//                   CreateDimension and UpdateDimension (v2.152.0, 23-Sep-2026, git b24f33a9)\n'
        + PORTED_ON +
        '// - Parity        : verbatim - TrueVision\'s file; the banner and this note are the only differences.\n'
        + DR01 +
        '// - Divergences   :\n'
        '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
        '// - Back-port     : none.\n'
    ),
    'Leaders': (
        '// PORT NOTE:\n'
        '// - Authored in   : ' + SPLIT + ' and\n'
        '//                   grew it to 1.2.0, while this app\'s copy took TrueVision\'s 1.1.0 as its own 1.1.0\n'
        '//                   (GetLeaderById and InsertLeader, 18-Sep-2026); since ported back whole from\n'
        '//                   TrueVision3D 1.2.0 (HEAD b2aa9151)\n'
        '// - Source version: 1.2.0 (TrueVision3D v2.142.0, 22-Sep-2026; read at b2aa9151)\n'
        + PORTED_ON +
        '// - Parity        : verbatim - TrueVision\'s file; the banner and this note are the only differences.\n'
        + DR01 +
        '// - Divergences   :\n'
        '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
        '// - Back-port     : none.\n'
    ),
    'Groups': (
        '// PORT NOTE:\n'
        '// - Authored in   : ' + SPLIT + ' and\n'
        '//                   grew it to 1.3.0, while this app\'s copy took TrueVision\'s 1.1.0 as its own 1.1.0\n'
        '//                   (DeleteItems\' silent flag, 20-Sep-2026, ValeVision3D v2.68.0); since ported back\n'
        '//                   whole from TrueVision3D 1.3.0 (HEAD b2aa9151)\n'
        '// - Source version: 1.3.0 (TrueVision3D v2.142.0, 22-Sep-2026; read at b2aa9151): PruneGroups learned\n'
        '//                   leaders and dimensions in v2.141.0 and viewports in v2.142.0\n'
        + PORTED_ON +
        '// - Parity        : verbatim - TrueVision\'s file; the banner and this note are the only differences.\n'
        '//                   PruneGroups knows the viewport, leader and dimension members the sheet records\n'
        '//                   keep since SheetRecords 1.39.0 (GROUP_KINDS): the two land in one release, or\n'
        '//                   the first delete anywhere on a sheet would strip them from every group.\n'
        + DR01 +
        '// - Divergences   :\n'
        '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
        '// - Back-port     : none.\n'
    ),
    'AreaGroups': (
        '// PORT NOTE:\n'
        '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__AreaGroups__.js\n'
        '// - Source version: 1.0.0 (TrueVision3D v2.104.0, 21-Sep-2026; read at b2aa9151)\n'
        + PORTED_ON +
        '// - Parity        : verbatim, and inert until Floor Areas: nothing in this app imports it yet. The\n'
        '//                   sheet model\'s facade re-exports it from TrueVision\'s 1.35.1 on, and Floor Areas,\n'
        '//                   its only caller, switches on later (DR-14 (A)). TrueVision\'s floor area plan\n'
        '//                   still waits for Adam\'s sign-off.\n'
        + DR01 +
        '// - Divergences   :\n'
        '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
        '// - Back-port     : none.\n'
    ),
    'DrawOrder': (
        '// PORT NOTE:\n'
        '// - Authored in   : ' + SPLIT + ',\n'
        '//                   and neither app has changed its code since; ported back whole from\n'
        '//                   TrueVision3D 1.0.0 (HEAD b2aa9151), its header included\n'
        '// - Source version: 1.0.0 (TrueVision3D v2.55.0, 15-Sep-2026; read at b2aa9151)\n'
        + PORTED_ON +
        '// - Parity        : verbatim - TrueVision\'s file; the banner and this note are the only differences.\n'
        '// - Divergences   :\n'
        '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
        '// - Back-port     : none.\n'
    ),
    'Common': (
        '// PORT NOTE:\n'
        '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__Common__.js\n'
        '// - Source version: 1.0.0 (TrueVision3D v2.74.0, 19-Sep-2026; read at b2aa9151)\n'
        '// - Ported on     : 20-Sep-2026 for ValeVision3D v2.65.0 (the Common title block fields); header\n'
        '//                   taken whole from TrueVision on 02-Oct-2026 for ValeVision3D {{VVREL:W1-20}}\n'
        '// - Parity        : verbatim - TrueVision\'s file; the banner and this note are the only differences.\n'
        '//                   The DESCRIPTION, MIGRATION and INTEGRATION are TrueVision\'s words, "TrueVision\n'
        '//                   used to store them per sheet" included: so did this app, until v2.65.0.\n'
        '// - Divergences   :\n'
        '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
        '// - Back-port     : none.\n'
    ),
}

CONSOLE = {
    'State': ("catch (error) { console.warn('[TrueVision3D LayoutEditor] A before-announce hook failed.', error); }",
              "catch (error) { console.warn('[ValeVision3D LayoutEditor] A before-announce hook failed.', error); }"),
    'Viewports': ("console.warn('[TrueVision3D LayoutEditor] The viewport namer failed; the drawing\\'s own name is used.', error);",
                  "console.warn('[ValeVision3D LayoutEditor] The viewport namer failed; the drawing\\'s own name is used.', error);"),
}

COMMON_ANCHOR = '// - Na__LayoutEditor__ProjectRecord__ supplies the admin record.\n' + LOG_TAIL


# -----------------------------------------------------------------------------
# Building
# -----------------------------------------------------------------------------

def read_tv(unit):
    out = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + TV_DIR + fname(unit)], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if out.returncode != 0:
        raise SystemExit('git show failed for %s: %s' % (unit, out.stderr.decode('utf-8', 'replace')))
    data = out.stdout
    if sha(data) != TV_SHA256[unit]:
        raise SystemExit('%s: TrueVision bytes at the pin are not the ones this script was written against' % unit)
    if b'\r' in data:
        raise SystemExit('%s: unexpected CR in TrueVision text' % unit)
    return data.decode('utf-8')


def once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit('%s: expected exactly one match, found %d' % (label, count))
    return text.replace(old, new)


def tv_port_note(text, unit):
    """TrueVision's own PORT NOTE block: from '// PORT NOTE:' to the rule before its DEVELOPMENT LOG."""
    start = text.find('// PORT NOTE:\n')
    if start == -1 or text.count('// PORT NOTE:\n') != 1:
        raise SystemExit('%s: TrueVision PORT NOTE heading not found exactly once' % unit)
    end = text.find(LOG_TAIL, start)
    if end == -1:
        raise SystemExit('%s: TrueVision PORT NOTE has no DEVELOPMENT LOG after it' % unit)
    return text[start:end]


def seams(unit, tv_text):
    """The (label, old, new) replacements for one unit, in order."""
    banner_tv = tv_text.split('\n')[1] + '\n'
    if not banner_tv.startswith('// TRUEVISION3D - LAYOUT EDITOR - SHEET MODEL - '):
        raise SystemExit('%s: unexpected banner %r' % (unit, banner_tv))
    out = [('banner (K2 H1)', banner_tv, banner_tv.replace('// TRUEVISION3D - ', '// VALEVISION3D - ', 1))]
    if unit in CONSOLE:
        out.append(('console prefix (K2 C1)', CONSOLE[unit][0], CONSOLE[unit][1]))
    if unit == 'Common':
        out.append(('PORT NOTE inserted (K2 H5; TrueVision\'s file has none)', COMMON_ANCHOR,
                    '// - Na__LayoutEditor__ProjectRecord__ supplies the admin record.\n//\n' + RULE + '//\n'
                    + PORT_NOTES[unit] + LOG_TAIL))
    else:
        out.append(('PORT NOTE (K2 H5)', tv_port_note(tv_text, unit), PORT_NOTES[unit]))
    return out


def build(unit):
    tv_text = read_tv(unit)
    text = tv_text
    for label, old, new in seams(unit, tv_text):
        text = once(text, old, new, '%s: %s' % (unit, label))
    if '\r' in text:
        raise SystemExit('%s: built text holds a CR' % unit)
    return text.encode('utf-8')


def reverse(unit, live_bytes):
    """Undo every seam on the live text: must give TrueVision's bytes exactly."""
    tv_text = read_tv(unit)
    text = live_bytes.decode('utf-8')
    for label, old, new in reversed(seams(unit, tv_text)):
        text = once(text, new, old, '%s: reverse %s' % (unit, label))
    return text.encode('utf-8')


def live_path(unit):
    return os.path.join(VV_DATA, fname(unit))


def main(argv):
    if not argv:
        raise SystemExit('usage: port_w1_20.py --stage <dir> | --write | --verify | --restore')
    mode = argv[0]
    built = {u: build(u) for u in UNITS}

    if mode == '--stage':
        out_dir = argv[1]
        os.makedirs(out_dir, exist_ok=True)
        for u in UNITS:
            with open(os.path.join(out_dir, fname(u)), 'wb') as fh:
                fh.write(built[u])
            print('staged %-18s %6d bytes  %4d lines  sha256 %s' % (u, len(built[u]), built[u].count(b'\n'), sha(built[u])))
        return

    if mode == '--write':
        problems = []
        for u in UNITS:
            p = live_path(u)
            want = VV_BEFORE_SHA256[u]
            if want is None:
                if os.path.exists(p):
                    problems.append('%s exists already' % fname(u))
            else:
                have = sha(open(p, 'rb').read()) if os.path.isfile(p) else None
                if have != want:
                    problems.append('%s is not the file this package read (sha256 %s)' % (fname(u), have))
        if problems:
            raise SystemExit('REFUSED: ' + '; '.join(problems))
        os.makedirs(PREIMAGE_DIR, exist_ok=True)
        for u in UNITS:
            if VV_BEFORE_SHA256[u] is not None:
                with open(os.path.join(PREIMAGE_DIR, fname(u) + '.before'), 'wb') as fh:
                    fh.write(open(live_path(u), 'rb').read())
        for u in UNITS:
            with open(live_path(u), 'wb') as fh:
                fh.write(built[u])
        with open(WRITTEN_LOG, 'w', encoding='utf-8') as fh:
            for u in UNITS:
                fh.write('%s  %s\n' % (sha(built[u]), fname(u)))
        for u in UNITS:
            print('written %-18s %6d bytes (LF)  sha256 %s' % (u, len(built[u]), sha(built[u])))
        return

    if mode == '--verify':
        problems = 0
        for u in UNITS:
            p = live_path(u)
            if not os.path.isfile(p):
                print('verify: %s is missing' % fname(u)); problems += 1; continue
            live = open(p, 'rb').read()
            if live != built[u]:
                print('verify: the live %s differs from a fresh build from the pin' % fname(u)); problems += 1
            if reverse(u, live) != read_tv(u).encode('utf-8'):
                print('verify: the live %s minus its seams is not TrueVision\'s file' % fname(u)); problems += 1
            else:
                print('verify: %-18s = TrueVision %s + %d seam(s)' % (u, TV_SHA256[u][:12], len(seams(u, read_tv(u)))))
        print('verify: %d problem(s)' % problems)
        sys.exit(1 if problems else 0)

    if mode == '--restore':
        for u in UNITS:
            if open(live_path(u), 'rb').read() != built[u]:
                raise SystemExit('REFUSED: %s has changed since W1-20 wrote it; restore by hand from preimage/' % fname(u))
        for u in UNITS:
            if VV_BEFORE_SHA256[u] is None:
                os.remove(live_path(u))
            else:
                with open(live_path(u), 'wb') as fh:
                    fh.write(open(os.path.join(PREIMAGE_DIR, fname(u) + '.before'), 'rb').read())
        print('restored nine pre-images and removed AreaGroups')
        return

    raise SystemExit('unknown mode ' + mode)


if __name__ == '__main__':
    main(sys.argv[1:])
