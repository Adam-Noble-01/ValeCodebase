# =============================================================================
# W0-17 - index.html start-up order aligned with TrueVision (apply script)
# =============================================================================
#
# Moves Na__DevGate__Initialize, Na__DrawView__ProjectData__Initialize, a direct
# Na__SectSceneData__Initialize and Na__DrawCfg__SetAppConfig / Load above
# Na__AppFlow__StartLoadingSequence in VV/index.html, mirroring TrueVision
# Index.html:1536-1573 at pin b2aa9151 (comments included). Nothing else.
#
# Modes:
#   python apply_w0_17.py --dry-run      compute, verify, write nothing
#   python apply_w0_17.py                apply (refuses if index.html drifted)
#   python apply_w0_17.py --check-live   recompute from the pre-image and compare with the live file
#   python apply_w0_17.py --restore      write the pre-image back (only if live == our after-image or pre-image)
#
# The file is CRLF; every edit is made on an LF view and written back as CRLF,
# so the file keeps its own line ending. Every anchor must match exactly once.
# =============================================================================

import hashlib
import pathlib
import sys

VV_ROOT   = pathlib.Path(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D')
TARGET    = VV_ROOT / 'index.html'
SCRATCH   = VV_ROOT / r'ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W0-17'
PREIMAGE  = SCRATCH / 'preimage' / 'index.html'
TV_COPY   = SCRATCH / 'tv_Index_at_b2aa9151.html'
AFTER_OUT = SCRATCH / 'after_index.html'

EXPECTED_PRE_SHA1 = '6515d4d6bc21f17f19e6ae02abec9a79a9fa2db2'   # == W0-03 final_sha1.txt


def sha1(data):
    return hashlib.sha1(data).hexdigest()


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'ANCHOR FAIL [{label}]: expected exactly 1 match, found {count}')
    return text.replace(old, new, 1)


# -----------------------------------------------------------------------------
# TV block (Index.html 1536-1573 at b2aa9151) with the two VV adaptations
# -----------------------------------------------------------------------------
def build_block():
    tv_lines = TV_COPY.read_bytes().decode('utf-8').split('\n')
    first = tv_lines[1535]                       # line 1536
    after = tv_lines[1573]                       # line 1574
    if first != '    // RESOLVE THE AUTHORING GATE (must precede every dev surface)':
        raise SystemExit('TV copy: line 1536 is not the authoring gate block: ' + repr(first))
    if after != '    // INITIALIZE LOADING SEQUENCE':
        raise SystemExit('TV copy: line 1574 is not INITIALIZE LOADING SEQUENCE: ' + repr(after))
    tv_block = '\n'.join(tv_lines[1535:1573]) + '\n'      # 1536..1573 inclusive (ends with two blank lines)

    block = tv_block
    # SEAM 1 (DIV-2, listed in the package goal): VV's own 41 CrossSectionView scene data
    # module instead of TV's 41 SectionCutEngine SceneData (never ported, K2 K2 / DR-41).
    # VV's loading sequence dispatches the ValeVision bindings just BEFORE the drawings
    # block and the SketchUp sections just AFTER it, so TV's "right after" becomes
    # "either side of". The trailing comment keeps TV's column.
    block = replace_once(
        block,
        '    Na__SectionCut__SceneData__Initialize();   // <-- Same reason: the section bindings are dispatched once, right after the drawings block\n',
        '    Na__SectSceneData__Initialize();           // <-- Same reason: the section bindings are dispatched once, either side of the drawings block\n',
        'TV block: SectionCut SceneData line')
    # SEAM 2 (DIV-2): VV's SectionAdapter also reads its section setup through
    # DrawCfg's getters (VV 40 SectionAdapter:138, :194, :251); TV's adapter does not.
    # VV's line already said so - keep that fact on TV's line.
    block = replace_once(
        block,
        '    void Na__DrawCfg__Load();                                                   // <-- Once; the presets read through its getters\n',
        '    void Na__DrawCfg__Load();                                                   // <-- Once; the presets and the adapter read through its getters\n',
        'TV block: DrawCfg Load line')
    return tv_block, block


# -----------------------------------------------------------------------------
# The four edits to VV/index.html (LF view)
# -----------------------------------------------------------------------------
def transform(vv_lf):
    tv_block, block = build_block()
    text = vv_lf

    # EDIT 1 | Import: TV imports its SceneData Initialize straight after MaterialPreset (TV :895-896)
    text = replace_once(
        text,
        "    import { Na__DrawView__MaterialPreset__Initialize } from './02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__MaterialPreset__.js';\n",
        "    import { Na__DrawView__MaterialPreset__Initialize } from './02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__MaterialPreset__.js';\n"
        "    import { Na__SectSceneData__Initialize } from './02__Src__AppModules/41__System__CrossSectionView/Na__CrossSectionView__SceneData.js';\n",
        'import after MaterialPreset')

    # EDIT 2 | The three TV blocks directly above INITIALIZE LOADING SEQUENCE (TV :1536-1573)
    anchor = ('    // INITIALIZE LOADING SEQUENCE\n'
              '    // ------------------------------------------------------------\n'
              '    Na__AppFlow__StartLoadingSequence({\n')
    text = replace_once(text, anchor, block + anchor, 'insert above the loading sequence')

    # EDIT 3 | Drop the late DrawCfg / ProjectData calls from the drawing systems block
    old_drawing = (
        '    // DRAWING SYSTEMS | Drawings data, drawing view core presets, floor plans, elevations (port Phases 2 and 3)\n'
        '    // @delegate: ./02__Src__AppModules/40__System__DrawingViewCore/\n'
        '    // @delegate: ./02__Src__AppModules/42__System__FloorPlanViews/\n'
        '    // @delegate: ./02__Src__AppModules/45__System__ElevationViews/\n'
        '    // ------------------------------------------------------------\n'
        '    Na__DrawCfg__SetAppConfig(Na__AppConfig__Data);                             // <-- Main config overrides the system JSON\n'
        '    Na__DrawCfg__Load();                                                        // <-- Once; the presets and the adapter read through it\n'
        '    Na__DrawView__ProjectData__Initialize();                                    // <-- Listens for the drawings block from the loading sequence\n'
        '    Na__DrawView__Transitions__Initialize({ camera : Na__Camera__Main, controls : Na__Controls__Orbit });\n')
    new_drawing = (
        '    // DRAWING SYSTEMS | Drawing view core transitions and presets, floor plans, elevations (port Phases 2 and 3)\n'
        '    // @delegate: ./02__Src__AppModules/40__System__DrawingViewCore/\n'
        '    // @delegate: ./02__Src__AppModules/42__System__FloorPlanViews/\n'
        '    // @delegate: ./02__Src__AppModules/45__System__ElevationViews/\n'
        '    // The drawings data listener, the section bindings and the drawing view\n'
        '    // config are armed above the loading sequence (REGION | Engine Entry Points).\n'
        '    // ------------------------------------------------------------\n'
        '    Na__DrawView__Transitions__Initialize({ camera : Na__Camera__Main, controls : Na__Controls__Orbit });\n')
    text = replace_once(text, old_drawing, new_drawing, 'late drawing-systems calls')

    # EDIT 4 | Drop the late authoring gate from the projected linework block (TV :1709-1711 shape)
    old_gate = (
        '    // PROJECTED LINEWORK | Config, overlay, pipeline and Dev section (port Phase 4)\n'
        '    // @delegate: ./02__Src__AppModules/50__System__ProjectedLinework/\n'
        '    // AUTHORING GATE | Resolved once, before any dev surface asks.\n'
        '    // @delegate: ./02__Src__AppModules/03__AppUtils/Na__AppUtils__DevGate__.js\n'
        '    // An ?authoring=on parameter must be honoured before the first panel is\n'
        '    // built; a gate that changed answer halfway would leave some dev surfaces\n'
        '    // built and some not.\n'
        '    Na__DevGate__Initialize();\n'
        '\n'
        '    Na__PlCfg__SetAppConfig(Na__AppConfig__Data);                               // <-- Main config overrides the exclusion tokens\n')
    new_gate = (
        '    // PROJECTED LINEWORK | Config, overlay, pipeline and Dev section (port Phase 4)\n'
        '    // @delegate: ./02__Src__AppModules/50__System__ProjectedLinework/\n'
        '    Na__PlCfg__SetAppConfig(Na__AppConfig__Data);                               // <-- Main config overrides the exclusion tokens\n')
    text = replace_once(text, old_gate, new_gate, 'late authoring gate')

    return tv_block, block, text


# -----------------------------------------------------------------------------
# Post-conditions
# -----------------------------------------------------------------------------
def verify(text, block, tv_block):
    calls = [
        '    Na__DevGate__Initialize();\n',
        '    Na__DrawView__ProjectData__Initialize();\n',
        '    Na__SectSceneData__Initialize();',
        '    Na__DrawCfg__SetAppConfig(Na__AppConfig__Data);',
        '    void Na__DrawCfg__Load();',
        '    Na__AppFlow__StartLoadingSequence({\n',
    ]
    positions = []
    for c in calls:
        n = text.count(c)
        if n != 1:
            raise SystemExit(f'POST FAIL: {c.strip()!r} occurs {n} times (want 1)')
        positions.append(text.index(c))
    if positions != sorted(positions):
        raise SystemExit('POST FAIL: start-up order is not DevGate < ProjectData < SectSceneData < SetAppConfig < Load < StartLoadingSequence')
    # No call to the bare (un-voided) Load or a second SetAppConfig anywhere
    if text.count('Na__DrawCfg__Load();') != 1:
        raise SystemExit('POST FAIL: Na__DrawCfg__Load(); occurs more than once')
    if text.count('Na__DrawCfg__SetAppConfig(') != 1:
        raise SystemExit('POST FAIL: Na__DrawCfg__SetAppConfig( occurs more than once')
    # The inserted block differs from TV's only on the two adapted lines
    diff = [(a, b) for a, b in zip(tv_block.split('\n'), block.split('\n')) if a != b]
    if len(diff) != 2 or len(tv_block.split('\n')) != len(block.split('\n')):
        raise SystemExit(f'POST FAIL: inserted block differs from TV on {len(diff)} lines (want 2)')
    # Import present exactly once
    imp = "import { Na__SectSceneData__Initialize } from './02__Src__AppModules/41__System__CrossSectionView/Na__CrossSectionView__SceneData.js';"
    if text.count(imp) != 1:
        raise SystemExit('POST FAIL: SectSceneData import not present exactly once')
    return diff


def to_crlf(lf_text):
    return lf_text.replace('\n', '\r\n').encode('utf-8')


def from_crlf(data):
    text = data.decode('utf-8')
    if text.count('\r\n') != text.count('\n') or text.count('\r') != text.count('\r\n'):
        raise SystemExit('EOL FAIL: file is not uniformly CRLF')
    return text.replace('\r\n', '\n')


def main(argv):
    mode = argv[1] if len(argv) > 1 else '--apply'
    pre = PREIMAGE.read_bytes()
    if sha1(pre) != EXPECTED_PRE_SHA1:
        raise SystemExit('PRE-IMAGE FAIL: scratch pre-image SHA-1 changed')

    tv_block, block, new_lf = transform(from_crlf(pre))
    diff = verify(new_lf, block, tv_block)
    after = to_crlf(new_lf)

    if mode == '--dry-run':
        print('DRY RUN OK')
        print(f'  pre   : {sha1(pre)}  lines {pre.count(b"\n")}')
        print(f'  after : {sha1(after)}  lines {after.count(b"\n")}  (delta {after.count(b"\n") - pre.count(b"\n")})')
        for a, b in diff:
            print('  TV  : ' + a)
            print('  VV  : ' + b)
        return 0

    if mode == '--check-live':
        live = TARGET.read_bytes()
        print('LIVE == script(pre-image): ' + ('SAME' if live == after else 'DIFFERENT'))
        print(f'  live  : {sha1(live)}')
        print(f'  after : {sha1(after)}')
        return 0 if live == after else 1

    if mode == '--restore':
        live = TARGET.read_bytes()
        if live == pre:
            print('RESTORE: live already equals the pre-image')
            return 0
        if live != after:
            raise SystemExit('RESTORE REFUSED: live file is neither the pre-image nor this script\'s after-image (someone else changed it)')
        TARGET.write_bytes(pre)
        print('RESTORED pre-image: ' + sha1(TARGET.read_bytes()))
        return 0

    # APPLY
    live = TARGET.read_bytes()
    if sha1(live) != EXPECTED_PRE_SHA1:
        raise SystemExit(f'DRIFT: live index.html SHA-1 {sha1(live)} != expected {EXPECTED_PRE_SHA1}; nothing written')
    TARGET.write_bytes(after)
    AFTER_OUT.write_bytes(after)
    check = TARGET.read_bytes()
    print('APPLIED: ' + sha1(check) + ('  (matches computed after-image)' if check == after else '  MISMATCH'))
    return 0 if check == after else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv))
