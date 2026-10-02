# W3-12 build: take TrueVision's Panel__Dimensions 1.7.0, Panel__Shapes 1.9.0 and
# Na__Test__HatchLineControls__ 1.0.0 whole at the pin, re-apply the banner and the
# PORT NOTE (K2 H1, H5), and write them into ValeVision (LF, as git show returns them).
#
#   python build_w3_12.py            build into scratch only (out__*.js) and print a summary
#   python build_w3_12.py --land     also write the three VV targets
#   python build_w3_12.py --restore  put the two panels back from the .bak copies and delete the new test
import os, subprocess, sys, hashlib

HERE  = os.path.dirname(os.path.abspath(__file__))
NAWEB = r'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb'
PIN   = 'b2aa9151'
TVAPP = 'na-apps/30__TrueVision__CoreAppCode/'
VV    = r'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/'
LE    = '02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/'
TEST  = '80__Testing__PrototypeEnvironment/'


def tv(rel):
    return subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + TVAPP + rel], capture_output=True, check=True).stdout


def banner(text, old, new):
    first = text.index(old)
    assert first < 200, 'banner not on line 2'
    return text.replace(old, new, 1)


def replace_port_note(text, note):
    start = text.index(b'// PORT NOTE:\n')
    end   = text.index(b'\n//\n// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:', start)
    return text[:start] + note.encode('ascii') + text[end:]


DIMS_NOTE = """// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0, port Phase 5); TrueVision3D took
//                   it for its v2.21.0 (10-Sep-2026) and grew it to 1.7.0, while this app's copy took
//                   TrueVision's 1.1.0, 1.4.0 and 1.5.0 as its own 1.1.0, 1.2.0 and 1.4.0; since
//                   ported back whole from TrueVision3D 1.7.0 (HEAD b2aa9151)
// - Source version: 1.7.0 (TrueVision3D v2.152.0, 23-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-12}} - whole: Measure at scale (1.2.0,
//                   v2.40.0) and Ext. lines (1.3.0, v2.41.0), both once recorded as skipped in this
//                   app's ledger, Round up to 5 mm (1.6.0, v2.139.0) and Line pt
//                   with Dashed lines (1.7.0, v2.152.0). Releases Adam has not confirmed in
//                   TrueVision are named in the Port Record (DR-01 (c)).
// - Parity        : verbatim - TrueVision's file; the banner and this note are the only differences.
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none."""

SHAPES_NOTE = """// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 10-Sep-2026, v2.21.8, port Phase 5, on this app's
//                   Na__LayoutEditor__Panel__Dimensions__ pattern); TrueVision3D took it for its
//                   v2.21.0 (10-Sep-2026) and grew it to 1.9.0, while this app's copy came back hunk by
//                   hunk to its 1.8.2 (TrueVision's 1.8.1 and 1.8.2 in v2.71.4, without Draw at scale
//                   or the hatch block); since ported back whole from TrueVision3D 1.9.0 (HEAD b2aa9151)
// - Source version: 1.9.0 (TrueVision3D v2.126.0, 21-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-12}} - whole: Draw at scale (1.6.0,
//                   v2.40.0, once recorded as skipped in this app's ledger), the hatch
//                   block (v2.90.0, unversioned in this log) and its Pattern line pt, Pattern colour
//                   and Standard (1.9.0, v2.126.0). Releases Adam has not confirmed in TrueVision are
//                   named in the Port Record (DR-01 (c)).
// - Parity        : verbatim - TrueVision's file; the banner and this note are the only differences.
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none."""

TEST_NOTE = """//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__HatchLineControls__.test.mjs
// - Source version: 1.0.0 (TrueVision3D v2.126.0, 21-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-12}}, with the Vectors panel's hatch line
//                   controls
// - Parity        : verbatim - every check is TrueVision's, run against this app's own hatch module,
//                   library, sheet chrome, shape geometry and record layer
// - Divergences   :
//   - Banner reads ValeVision3D. (The printed lines carry no app name.)
// - Back-port     : none.
"""


def build():
    dims = tv('02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__Dimensions__.js')
    shp  = tv('02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__Shapes__.js')
    tst  = tv('80__Testing__PrototypeEnvironment/Na__Test__HatchLineControls__.test.mjs')
    for b in (dims, shp, tst):
        assert b'\r' not in b
    dims = replace_port_note(banner(dims, b'// TRUEVISION3D - LAYOUT EDITOR - PANEL: DIMENSIONS', b'// VALEVISION3D - LAYOUT EDITOR - PANEL: DIMENSIONS'), DIMS_NOTE)
    shp  = replace_port_note(banner(shp, b'// TRUEVISION3D - LAYOUT EDITOR - VECTORS PANEL', b'// VALEVISION3D - LAYOUT EDITOR - VECTORS PANEL'), SHAPES_NOTE)
    tst  = banner(tst, b'// TRUEVISION3D - TEST - HATCH LINE CONTROLS', b'// VALEVISION3D - TEST - HATCH LINE CONTROLS')
    anchor = b'//     node 80__Testing__PrototypeEnvironment/Na__Test__HatchLineControls__.test.mjs\n'
    at = tst.index(anchor) + len(anchor)
    tst = tst[:at] + TEST_NOTE.encode('ascii') + tst[at:]
    # The test's old "//\n// ----...\n//\n// DEVELOPMENT LOG" follows; check the header shape stays one rule per gap
    for name, b in (('dims', dims), ('shapes', shp), ('test', tst)):
        assert b'TRUEVISION3D' not in b, name
        assert b.count(b'// PORT NOTE:') == 1, name
    return dims, shp, tst


def main():
    dims, shp, tst = build()
    outs = {'out__Dimensions.js': dims, 'out__Shapes.js': shp, 'out__HatchLineControls.test.mjs': tst}
    for n, b in outs.items():
        open(os.path.join(HERE, n), 'wb').write(b)
        print(n, len(b), hashlib.sha256(b).hexdigest()[:12])
    if '--land' in sys.argv:
        targets = {VV + LE + 'Na__LayoutEditor__Panel__Dimensions__.js': dims,
                   VV + LE + 'Na__LayoutEditor__Panel__Shapes__.js': shp,
                   VV + TEST + 'Na__Test__HatchLineControls__.test.mjs': tst}
        bak = {VV + LE + 'Na__LayoutEditor__Panel__Dimensions__.js': 'orig__Dimensions.js.bak',
               VV + LE + 'Na__LayoutEditor__Panel__Shapes__.js': 'orig__Shapes.js.bak'}
        for p, b in bak.items():   # a file I own must not have changed since I backed it up
            assert open(p, 'rb').read() == open(os.path.join(HERE, b), 'rb').read(), 'changed under me: ' + p
        assert not os.path.exists(VV + TEST + 'Na__Test__HatchLineControls__.test.mjs'), 'test already exists'
        for p, b in targets.items():
            open(p, 'wb').write(b)
            print('landed', p)


if __name__ == '__main__':
    if '--restore' in sys.argv:
        for p, b in ((VV + LE + 'Na__LayoutEditor__Panel__Dimensions__.js', 'orig__Dimensions.js.bak'),
                     (VV + LE + 'Na__LayoutEditor__Panel__Shapes__.js', 'orig__Shapes.js.bak')):
            open(p, 'wb').write(open(os.path.join(HERE, b), 'rb').read())
        t = VV + TEST + 'Na__Test__HatchLineControls__.test.mjs'
        if os.path.exists(t):
            os.remove(t)
        print('restored')
    else:
        main()
