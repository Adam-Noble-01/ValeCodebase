# =============================================================================
# W2-09 PORT SCRIPT - Enhance 1.1.0, Render Composites 1.3.0, the config's percent
# Enhance Whitecard row, and Na__Test__EnhanceWhitecardStrength__ (TrueVision at b2aa9151)
# =============================================================================
#
# Modes:
#   python -B port_w2_09.py --dry-run [--out <dir>]   build the four files into <dir> (default scratch/W2-09/rehearsal)
#   python -B port_w2_09.py --apply                   write them into the live ValeVision tree (hash-guarded)
#   python -B port_w2_09.py --verify                  prove live = TV + the seams, and seams reversed = TV byte for byte
#   python -B port_w2_09.py --restore                 put the pre-port bytes back from scratch/W2-09/vv_before/
#
# Rules followed (execution policy 7, R6 F.1 P3/P18):
# - Whole-file takes (Enhance, RenderComposites, the test) start from TrueVision's bytes exactly as
#   git show returns them (LF) and change only the named seams: banner token, console prefix, the
#   PORT NOTE block, the test's printed title.
# - The config is an existing file edited as a hunk replay of TrueVision's Meta 1.3.0 (the Enhance
#   Whitecard percent weight) on this app's bytes, keeping the file's own CRLF line endings. The
#   depthFog row and Meta 1.4.0 are package W2-12's.
# - Every existing target must still hold the bytes snapshotted before the port (vv_before/), or the
#   script refuses to write (a file changed under the package).
# =============================================================================

import argparse
import hashlib
import json
import os
import subprocess
import sys

PIN      = 'b2aa9151'
NAWEB    = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TV_APP   = 'na-apps/30__TrueVision__CoreAppCode/'
VV_APP   = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE     = os.path.dirname(os.path.abspath(__file__))
BEFORE   = os.path.join(HERE, 'vv_before')
VVREL    = '{{VVREL:W2-09}}'
PORTDATE = '02-Oct-2026'

REL_ENHANCE = '02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__Enhance__.js'
REL_COMP    = '02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__RenderComposites__.js'
REL_CONFIG  = '02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__RenderComposites__Config__.json'
REL_TEST    = '80__Testing__PrototypeEnvironment/Na__Test__EnhanceWhitecardStrength__.test.mjs'

# sha1 of the live files when the package started (fetch_tv.py printed them); the test is new.
EXPECTED_BEFORE = {
    REL_ENHANCE : '35f9f625dd641055a502483ae24bddde9da829ad',
    REL_COMP    : 'eb708ba6f31d57276341d6eb9e7613e18ad1df64',
    REL_CONFIG  : 'cc33dcc4f3c067239abadddeb56beeb4656dcbd4',
}
EXPECTED_TV = {
    REL_ENHANCE : 'ad89e292def26c9cbbf26603afd08db570b0cb5b',
    REL_COMP    : '30b79c7eb6555dca66d5b36f590704ff7a3ea94e',
    REL_CONFIG  : '45def981d9d685b2ebce13283f6f7228c398275b',
    REL_TEST    : '5687eb254cb751c055cc0146a13923b0506bda93',
}


# -----------------------------------------------------------------------------
# REGION | Helpers
# -----------------------------------------------------------------------------

def sha1(b):
    return hashlib.sha1(b).hexdigest()


def sha256(b):
    return hashlib.sha256(b).hexdigest()


def tv_bytes(rel):
    out = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + TV_APP + rel], capture_output=True, check=True).stdout
    if sha1(out) != EXPECTED_TV[rel]:
        sys.exit('TV bytes for %s are not the ones this script was written against (%s)' % (rel, sha1(out)))
    if b'\r\n' in out:
        sys.exit('TV bytes for %s carry CR LF - git show was expected to return LF' % rel)
    return out


def live_path(rel):
    return os.path.join(VV_APP, rel.replace('/', os.sep))


def read(path):
    with open(path, 'rb') as f:
        return f.read()


def replace_once(text, old, new, what):
    count = text.count(old)
    if count != 1:
        sys.exit('seam "%s": expected exactly one occurrence, found %d' % (what, count))
    return text.replace(old, new)

# endregion --------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | The Seams - TrueVision's text and this app's text, side by side
# -----------------------------------------------------------------------------

ENHANCE_BANNER = ('// TRUEVISION3D - LAYOUT EDITOR - ENHANCE WHITECARD\n',
                  '// VALEVISION3D - LAYOUT EDITOR - ENHANCE WHITECARD\n')

ENHANCE_PORT_TV = (
    '// PORT NOTE:\n'
    '// - Ported from   : ValeVision3D 51__System__LayoutEditor/Na__LayoutEditor__Enhance__.js\n'
    '// - Ported on     : 10-Sep-2026 for TrueVision3D v2.21.0 (re-alignment)\n'
    '// - Parity        : verbatim\n'
    '// - Divergences   : Console prefix, header and folder numbers only.\n'
    '// - Back-port     : n/a (this IS the back-port)\n'
)
ENHANCE_PORT_VV = (
    '// PORT NOTE:\n'
    '// - Authored in   : ValeVision3D first (1.0.0, 10-Sep-2026, v2.21.8, port Phase 5: the image export\'s\n'
    '//                   levels and high-pass sharpen stack from 30__System__ImageExport/\n'
    '//                   Na__ImageExport__PostProcessEffects__Pipeline.js, in a fixed two-effect order with the\n'
    '//                   Layout Editor config\'s parameters); TrueVision3D took it verbatim as its 1.0.0 for its\n'
    '//                   v2.21.0 re-alignment (10-Sep-2026) and authored 1.1.0 there; since ported back whole\n'
    '//                   from TrueVision3D 1.1.0 (HEAD b2aa9151)\n'
    '// - Source version: 1.1.0 (TrueVision3D v2.93.0, 20-Sep-2026; read at b2aa9151)\n'
    '// - Ported on     : ' + PORTDATE + ' for ValeVision3D ' + VVREL + ', the whole file. This app\'s copy\n'
    '//                   before it was its own 1.0.0. TrueVision\'s v2.93.0 entry says NOT signed off by\n'
    '//                   Adam; it comes across under DR-01 (c) and is named so.\n'
    '// - Parity        : verbatim (the code is TrueVision 1.1.0\'s; the banner, the console prefix and this\n'
    '//                   note are the only differences)\n'
    '// - Divergences   :\n'
    '//   - Banner and console prefix read ValeVision3D.\n'
    '// - Back-port     : none.\n'
)

ENHANCE_CONSOLE = ("console.warn('[TrueVision3D LayoutEditor] Enhance Whitecard pass failed",
                   "console.warn('[ValeVision3D LayoutEditor] Enhance Whitecard pass failed")

COMP_BANNER = ('// TRUEVISION3D - LAYOUT EDITOR - RENDER COMPOSITES\n',
               '// VALEVISION3D - LAYOUT EDITOR - RENDER COMPOSITES\n')

COMP_PORT_TV = (
    '// PORT NOTE:\n'
    '// - Ported from   : n/a - authored in TrueVision3D\n'
    '// - Back-port     : ported 13-Sep-2026 as ValeVision3D v2.28.0. Module verbatim,\n'
    '//                   config layers verbatim; ValeVision\'s composer owns the profile\n'
    '//                   pass differently (DIV-1), so only the consumers of the pixel\n'
    '//                   weights differ there.\n'
)
COMP_PORT_VV = (
    '// PORT NOTE:\n'
    '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__RenderComposites__.js\n'
    '// - Source version: 1.3.0 (TrueVision3D v2.94.0, 20-Sep-2026; read at b2aa9151) - 1.2.0, the percent\n'
    '//                   kind, is TrueVision3D v2.93.0 of the same day\n'
    '// - Ported on     : ' + PORTDATE + ' for ValeVision3D ' + VVREL + ', the whole file. This app\'s copy\n'
    '//                   before it was 1.1.0, ported from TrueVision3D on 13-Sep-2026 (ValeVision3D v2.28.0;\n'
    '//                   the 2.00 Context Layer default followed in v2.59.0, as in TrueVision).\n'
    '//                   TrueVision\'s v2.93.0 entry says NOT signed off by Adam and neither release is\n'
    '//                   recorded as tried by him; both come across under DR-01 (c) and are named so.\n'
    '// - Parity        : verbatim (the code is TrueVision 1.3.0\'s; the banner, the console prefix and this\n'
    '//                   note are the only differences)\n'
    '// - Divergences   :\n'
    '//   - Banner and console prefix read ValeVision3D.\n'
    '//   - Not in this file, but worth knowing beside it: what CONSUMES the pixel weights differs (DIV-1).\n'
    '//     The profile width reaches the composer\'s pass through Na__DrawView__RenderPreset__, the section\n'
    '//     outline goes through the Cross Sections tool and the model\'s own edges through\n'
    '//     Na__LineworkSettings - and this app\'s export line-width compensation still multiplies all three.\n'
    '//   - WHERE THE 2D OUTLINE WIDTH WENT, above, is TrueVision\'s own history (its v2.27.0). ValeVision3D\n'
    '//     made the same move in its v2.28.0, from the 1.0 its Na__AppConfig__Main.json carried in\n'
    '//     RenderEffect__ProfileLines__Drawing2dEdgeWidth; the config\'s Meta__WhyWeightsHere keeps that\n'
    '//     wording.\n'
    '// - Back-port     : none.\n'
)

COMP_CONSOLE = [
    ("console.warn('[TrueVision3D LayoutEditor] Render composite config fetch failed (",
     "console.warn('[ValeVision3D LayoutEditor] Render composite config fetch failed ("),
    ("console.warn('[TrueVision3D LayoutEditor] Render composite config unavailable",
     "console.warn('[ValeVision3D LayoutEditor] Render composite config unavailable"),
]

TEST_BANNER = ('// TRUEVISION3D - TEST - ENHANCE WHITECARD STRENGTH\n',
               '// VALEVISION3D - TEST - ENHANCE WHITECARD STRENGTH\n')
TEST_TITLE  = ("console.log('TrueVision3D - Enhance Whitecard strength');",
               "console.log('ValeVision3D - Enhance Whitecard strength');")
TEST_LOG_HEAD = '//\n// DEVELOPMENT LOG:\n'
TEST_PORT_VV = (
    '//\n'
    '// PORT NOTE:\n'
    '// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__EnhanceWhitecardStrength__.test.mjs\n'
    '// - Source version: 1.0.0 (TrueVision3D v2.93.0, 20-Sep-2026, 23 checks; read at b2aa9151)\n'
    '// - Ported on     : ' + PORTDATE + ' for ValeVision3D ' + VVREL + ', with Enhance 1.1.0, Render\n'
    '//                   Composites 1.3.0 and the config\'s percent Enhance Whitecard row it checks\n'
    '// - Parity        : verbatim - every check is TrueVision\'s, run against this app\'s own Enhance\n'
    '//                   module, Render Composites module and configs\n'
    '// - Divergences   :\n'
    '//   - Banner and the printed title read ValeVision3D.\n'
    '// - Back-port     : none.\n'
    '//\n'
    '// -----------------------------------------------------------------------------\n'
)

# THE CONFIG: TrueVision's Meta 1.3.0 lines, and this app's provenance line (CRLF file).
CFG_VERSION_OLD = '        "Meta__Version"         : "1.2.0",'
CFG_VERSION_NEW = '        "Meta__Version"         : "1.3.0",'
CFG_AUTHOR      = '        "Meta__Author"          : "Adam Noble - Noble Architecture",'
CFG_PORTED_FROM = ('        "Meta__PortedFrom"      : "TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/'
                   'Na__LayoutEditor__RenderComposites__Config__.json, read at HEAD b2aa9151. First taken with the module on '
                   '13-Sep-2026 (ValeVision3D v2.28.0); Meta 1.3.0 - the Enhance Whitecard percent weight, TrueVision3D v2.93.0, '
                   '20-Sep-2026 - ported ' + PORTDATE + ' (parity package W2-09). Every layer row, weight and number is '
                   'TrueVision\'s. This app\'s own wording: Meta__WhyWeightsHere (its own v2.28.0 history) and '
                   'Meta__BaseImageWeight (its snapshot renderer hands the width to Na__LineworkSettings, DIV-1).",')
CFG_KINDS_OLD   = ('        "Meta__WeightKinds"     : "factor = a multiplier on the sheet\'s master viewport lineweight '
                   '(Sheet__Lineweights.ViewportPt), so the drawing keeps its hierarchy when the master moves. pixels = a real '
                   'pixel count in the render buffer, which is what a screen-space effect actually consumes. none = this '
                   'composite draws no line and gets no control; the row is still listed so the file is a complete inventory '
                   'rather than a selective one.",')
CFG_BASEIMAGE_PREFIX = '        "Meta__BaseImageWeight" : "'
CFG_ENHANCE_NOTE_OLD   = ('            "Composite__Note"     : "Levels and sharpen over the finished raster so whitecard greys reach '
                          'paper white. A post pass on pixels; it has no line to weight.",')
CFG_ENHANCE_WEIGHT_OLD = '            "Composite__Weight"   : { "Weight__Kind": "none" }'
CFG_ENHANCE_KEY        = '            "Composite__Key"      : "enhanceWhitecard",'


def tv_line(tv_lines, startswith):
    hits = [line for line in tv_lines if line.startswith(startswith)]
    if len(hits) != 1:
        sys.exit('TV config: expected one line starting %r, found %d' % (startswith, len(hits)))
    return hits[0]

# endregion --------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Builders
# -----------------------------------------------------------------------------

def build_enhance(tv):
    text = tv.decode('utf-8')
    text = replace_once(text, ENHANCE_BANNER[0], ENHANCE_BANNER[1], 'Enhance banner')
    text = replace_once(text, ENHANCE_PORT_TV, ENHANCE_PORT_VV, 'Enhance PORT NOTE')
    text = replace_once(text, ENHANCE_CONSOLE[0], ENHANCE_CONSOLE[1], 'Enhance console prefix')
    return text.encode('utf-8')


def build_comp(tv):
    text = tv.decode('utf-8')
    text = replace_once(text, COMP_BANNER[0], COMP_BANNER[1], 'RenderComposites banner')
    text = replace_once(text, COMP_PORT_TV, COMP_PORT_VV, 'RenderComposites PORT NOTE')
    for old, new in COMP_CONSOLE:
        text = replace_once(text, old, new, 'RenderComposites console prefix')
    return text.encode('utf-8')


def build_test(tv):
    text = tv.decode('utf-8')
    text = replace_once(text, TEST_BANNER[0], TEST_BANNER[1], 'test banner')
    text = replace_once(text, TEST_TITLE[0], TEST_TITLE[1], 'test printed title')
    text = replace_once(text, TEST_LOG_HEAD, TEST_PORT_VV + TEST_LOG_HEAD, 'test PORT NOTE insertion point')
    return text.encode('utf-8')


def build_config(vv_before, tv):
    if b'\r\n' not in vv_before or vv_before.replace(b'\r\n', b'').count(b'\n') != 0:
        sys.exit('config: expected a CRLF-only file')
    trailing = vv_before.endswith(b'\r\n')
    lines = vv_before.decode('utf-8').split('\r\n')
    tv_lines = tv.decode('utf-8').split('\n')

    kinds_new     = tv_line(tv_lines, '        "Meta__WeightKinds"     : ')
    strength_new  = tv_line(tv_lines, '        "Meta__EnhanceStrength" : ')
    note_new      = tv_line(tv_lines, '            "Composite__Note"     : "Levels and sharpen over the finished raster')
    weight_new    = tv_line(tv_lines, '            "Composite__Weight"   : { "Weight__Kind": "percent"')

    def index_of(line, what):
        hits = [i for i, l in enumerate(lines) if l == line]
        if len(hits) != 1:
            sys.exit('config: expected one line for %s, found %d' % (what, len(hits)))
        return hits[0]

    lines[index_of(CFG_VERSION_OLD, 'Meta__Version')] = CFG_VERSION_NEW
    lines[index_of(CFG_KINDS_OLD, 'Meta__WeightKinds')] = kinds_new

    # The Enhance Whitecard row: its note and its weight, found inside that row only.
    key_at = index_of(CFG_ENHANCE_KEY, 'the enhanceWhitecard row')
    close_at = next(i for i in range(key_at, len(lines)) if lines[i].strip() in ('},', '}'))
    row = list(range(key_at, close_at))
    note_at = [i for i in row if lines[i] == CFG_ENHANCE_NOTE_OLD]
    weight_at = [i for i in row if lines[i] == CFG_ENHANCE_WEIGHT_OLD]
    if len(note_at) != 1 or len(weight_at) != 1:
        sys.exit('config: the enhanceWhitecard row is not the 1.2.0 row this script expects')
    lines[note_at[0]] = note_new
    lines[weight_at[0]] = weight_new

    # Meta__EnhanceStrength goes where TrueVision has it: straight after Meta__BaseImageWeight.
    base_at = [i for i, l in enumerate(lines) if l.startswith(CFG_BASEIMAGE_PREFIX)]
    if len(base_at) != 1:
        sys.exit('config: expected one Meta__BaseImageWeight line')
    lines.insert(base_at[0] + 1, strength_new)

    # This app's provenance line, after Meta__Author as in the W1 configs (SheetImages, ColourPalette).
    author_at = index_of(CFG_AUTHOR, 'Meta__Author')
    lines.insert(author_at + 1, CFG_PORTED_FROM)

    out = '\r\n'.join(lines)
    if trailing and not out.endswith('\r\n'):
        out += '\r\n'
    return out.encode('utf-8')


def build_all():
    tv = {rel: tv_bytes(rel) for rel in EXPECTED_TV}
    before_config = read(os.path.join(BEFORE, os.path.basename(REL_CONFIG)))
    if sha1(before_config) != EXPECTED_BEFORE[REL_CONFIG]:
        sys.exit('vv_before snapshot of the config is not the one taken at the start')
    return tv, {
        REL_ENHANCE : build_enhance(tv[REL_ENHANCE]),
        REL_COMP    : build_comp(tv[REL_COMP]),
        REL_CONFIG  : build_config(before_config, tv[REL_CONFIG]),
        REL_TEST    : build_test(tv[REL_TEST]),
    }

# endregion --------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Checks on What Was Built
# -----------------------------------------------------------------------------

def reverse_whole(built, pairs):
    text = built.decode('utf-8')
    for tv_text, vv_text in pairs:
        if text.count(vv_text) != 1:
            return None, 'seam text not found exactly once: %r' % vv_text[:60]
        text = text.replace(vv_text, tv_text)
    return text.encode('utf-8'), None


def check(tv, built):
    problems = []

    # Whole-file takes: reverse every seam and the result must be TrueVision's bytes exactly.
    rev, err = reverse_whole(built[REL_ENHANCE], [ENHANCE_BANNER, (ENHANCE_PORT_TV, ENHANCE_PORT_VV), ENHANCE_CONSOLE])
    if err or rev != tv[REL_ENHANCE]:
        problems.append('Enhance: seams reversed != TV (%s)' % (err or 'bytes differ'))
    rev, err = reverse_whole(built[REL_COMP], [COMP_BANNER, (COMP_PORT_TV, COMP_PORT_VV)] + COMP_CONSOLE)
    if err or rev != tv[REL_COMP]:
        problems.append('RenderComposites: seams reversed != TV (%s)' % (err or 'bytes differ'))
    rev, err = reverse_whole(built[REL_TEST], [TEST_BANNER, TEST_TITLE, (TEST_LOG_HEAD, TEST_PORT_VV + TEST_LOG_HEAD)])
    if err or rev != tv[REL_TEST]:
        problems.append('test: seams reversed != TV (%s)' % (err or 'bytes differ'))
    for rel in (REL_ENHANCE, REL_COMP, REL_TEST):
        if b'\r' in built[rel]:
            problems.append('%s: carries CR (a whole-file take is LF, as git show returns it)' % rel)
        text = built[rel].decode('utf-8')
        for token in ('TRUEVISION3D', '[TrueVision3D'):
            if token in text:
                problems.append('%s: still carries %s' % (rel, token))

    # The config: CRLF only, parses, and equals TrueVision's Meta 1.3.0 content with this app's wording.
    cfg = built[REL_CONFIG]
    if cfg.replace(b'\r\n', b'').count(b'\n') or cfg.replace(b'\r\n', b'').count(b'\r'):
        problems.append('config: line endings are not CRLF throughout')
    try:
        mine = json.loads(cfg.decode('utf-8'))
        theirs = json.loads(tv[REL_CONFIG].decode('utf-8'))
        before = json.loads(read(os.path.join(BEFORE, os.path.basename(REL_CONFIG))).decode('utf-8'))
    except Exception as error:
        problems.append('config: does not parse (%s)' % error)
        return problems
    mm, tm, bm = mine['LayoutEditor__RenderComposites__Meta'], theirs['LayoutEditor__RenderComposites__Meta'], before['LayoutEditor__RenderComposites__Meta']
    if list(mine.keys()) != list(theirs.keys()):
        problems.append('config: top-level blocks differ from TV')
    expected_meta_keys = [k for k in tm.keys() if k != 'Meta__DepthFog']
    expected_meta_keys.insert(expected_meta_keys.index('Meta__Author') + 1, 'Meta__PortedFrom')
    if list(mm.keys()) != expected_meta_keys:
        problems.append('config: Meta keys %s != expected %s' % (list(mm.keys()), expected_meta_keys))
    for key in mm:
        if key == 'Meta__Version':
            if mm[key] != '1.3.0':
                problems.append('config: Meta__Version is %r' % mm[key])
        elif key in ('Meta__WhyWeightsHere', 'Meta__BaseImageWeight'):
            if mm[key] != bm[key]:
                problems.append('config: %s is not this app\'s own wording' % key)
        elif key == 'Meta__PortedFrom':
            pass
        elif mm[key] != tm.get(key):
            problems.append('config: %s differs from TV' % key)
    tv_rows = [r for r in theirs['LayoutEditor__RenderComposites__Layers'] if r['Composite__Key'] != 'depthFog']
    if mine['LayoutEditor__RenderComposites__Layers'] != tv_rows:
        problems.append('config: the layer rows are not TV\'s (depthFog aside)')
    if mine['LayoutEditor__RenderComposites__Fallback'] != theirs['LayoutEditor__RenderComposites__Fallback']:
        problems.append('config: the Fallback block differs from TV')
    old_rows = {r['Composite__Key']: r for r in before['LayoutEditor__RenderComposites__Layers']}
    for r in mine['LayoutEditor__RenderComposites__Layers']:
        if r['Composite__Key'] != 'enhanceWhitecard' and r != old_rows.get(r['Composite__Key']):
            problems.append('config: row %s changed, and only enhanceWhitecard should' % r['Composite__Key'])
    if [r['Composite__Key'] for r in mine['LayoutEditor__RenderComposites__Layers']] != [r['Composite__Key'] for r in before['LayoutEditor__RenderComposites__Layers']]:
        problems.append('config: row order or membership changed')
    for token in ('TrueVision__', '[TrueVision3D', 'TRUEVISION3D', 'NaProjectPortal', '/na-apps/', 'TrueVision__AppContent'):
        if token in cfg.decode('utf-8'):
            problems.append('config: carries %s' % token)
    return problems

# endregion --------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Main
# -----------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--dry-run', action='store_true')
    group.add_argument('--apply', action='store_true')
    group.add_argument('--verify', action='store_true')
    group.add_argument('--restore', action='store_true')
    parser.add_argument('--out', default=os.path.join(HERE, 'rehearsal'))
    args = parser.parse_args()

    if args.restore:
        for rel, digest in EXPECTED_BEFORE.items():
            saved = read(os.path.join(BEFORE, os.path.basename(rel)))
            if sha1(saved) != digest:
                sys.exit('snapshot of %s is not the pre-port bytes' % rel)
        tv, built = build_all()
        for rel in list(EXPECTED_BEFORE) + [REL_TEST]:
            path = live_path(rel)
            if os.path.exists(path) and read(path) not in (built[rel], read(os.path.join(BEFORE, os.path.basename(rel))) if rel in EXPECTED_BEFORE else built[rel]):
                sys.exit('refusing to restore %s: it was edited after this port' % rel)
        for rel in EXPECTED_BEFORE:
            with open(live_path(rel), 'wb') as f:
                f.write(read(os.path.join(BEFORE, os.path.basename(rel))))
            print('restored', rel)
        if os.path.exists(live_path(REL_TEST)):
            os.remove(live_path(REL_TEST))
            print('removed (new in this package)', REL_TEST)
        return

    tv, built = build_all()
    problems = check(tv, built)
    for p in problems:
        print('PROBLEM:', p)
    if problems:
        sys.exit(1)

    if args.dry_run:
        for rel, data in built.items():
            path = os.path.join(args.out, rel.replace('/', os.sep))
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'wb') as f:
                f.write(data)
            print('built', rel, len(data), 'bytes sha256', sha256(data)[:16])
        print('dry run: 0 problem(s); nothing written to the live tree')
        return

    if args.apply:
        for rel, digest in EXPECTED_BEFORE.items():
            current = read(live_path(rel))
            if current == built[rel]:
                continue
            if sha1(current) != digest:
                sys.exit('STOP: %s changed under the package (sha1 %s)' % (rel, sha1(current)))
        if os.path.exists(live_path(REL_TEST)) and read(live_path(REL_TEST)) != built[REL_TEST]:
            sys.exit('STOP: %s already exists with other content' % REL_TEST)
        for rel, data in built.items():
            with open(live_path(rel), 'wb') as f:          # <-- One whole write per file (P7)
                f.write(data)
            print('wrote', rel, len(data), 'bytes sha256', sha256(data)[:16])
        print('apply: 0 problem(s)')
        return

    if args.verify:
        bad = 0
        for rel, data in built.items():
            live = read(live_path(rel))
            same = live == data
            bad += 0 if same else 1
            print('%-6s %s  live sha256 %s' % ('OK' if same else 'DIFF', rel, sha256(live)[:16]))
        print('verify: %d problem(s)' % bad)
        sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()

# endregion --------------------------------------------------------------------
