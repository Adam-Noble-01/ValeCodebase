"""W2-25: MoveAnchor 1.0.0 (+ Config), ViewportSnapMove 1.6.0, the carry CSS and the AxisLock header paragraph.

    python port_w2_25.py --stage     build every output in staged/ (nothing live touched)
    python port_w2_25.py --apply     back up the live files to before/, then write each output in one write
    python port_w2_25.py --restore   put the two edited live files back and delete the three new files
"""
import os, sys, shutil, hashlib

HERE   = os.path.dirname(os.path.abspath(__file__))
TV     = os.path.join(HERE, 'tv')
STAGED = os.path.join(HERE, 'staged')
BEFORE = os.path.join(HERE, 'before')
LE     = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor'

T_ANCHOR = os.path.join(LE, '28__System__ObjectSnap', 'Na__LayoutEditor__MoveAnchor__.js')
T_ACFG   = os.path.join(LE, '28__System__ObjectSnap', 'Na__LayoutEditor__MoveAnchor__Config__.json')
T_VPMOVE = os.path.join(LE, '28__System__ObjectSnap', 'Na__LayoutEditor__ViewportSnapMove__.js')
T_PAPER  = os.path.join(LE, '10__Core__SheetSurface', 'Na__LayoutEditor__Styles__Main__Paper__.css')
T_AXIS   = os.path.join(LE, '30__System__SheetTools', 'Na__LayoutEditor__AxisLock__.js')
NEW      = [T_ANCHOR, T_ACFG, T_VPMOVE]
EDITED   = [T_PAPER, T_AXIS]

def rd(p):
    with open(p, 'rb') as fh:
        return fh.read()

def sha(b):
    return hashlib.sha256(b).hexdigest()

def once(text, old, new, what):
    n = text.count(old)
    assert n == 1, '%s: expected 1 match, found %d' % (what, n)
    return text.replace(old, new)

PORT_SEP = '//\n// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:'

def swap_port_note(text, new_block, what):
    start = text.index('// PORT NOTE:\n')
    end   = text.index(PORT_SEP, start)
    assert text.count('// PORT NOTE:\n') == 1, what
    return text[:start] + new_block + text[end:]

# ---------------------------------------------------------------- MoveAnchor
def build_anchor():
    t = rd(os.path.join(TV, 'Na__LayoutEditor__MoveAnchor__.js')).decode('utf-8')
    assert '\r' not in t
    t = once(t, '// TRUEVISION3D - LAYOUT EDITOR - MOVE ANCHOR\n', '// VALEVISION3D - LAYOUT EDITOR - MOVE ANCHOR\n', 'anchor banner')
    t = swap_port_note(t, (
        '// PORT NOTE:\n'
        '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/28__System__ObjectSnap/Na__LayoutEditor__MoveAnchor__.js\n'
        '// - Source version: 1.0.0 (TrueVision3D v2.149.0, 22-Sep-2026; read at b2aa9151)\n'
        '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-25}}, landed inert: nothing imports\n'
        '//                   it until the W3 SheetTools hub (PointerPress, PointerDrag, HitResolution,\n'
        '//                   ToolState, SheetTools), and the Ctrl+click gesture stays behind that hub\'s\n'
        '//                   guards until Adam confirms DR-40 item 10 (W3-04). TrueVision\'s own note\n'
        '//                   said "not yet ported - it waits for Adam\'s sign-off"; v2.149.0 records no\n'
        '//                   try by Adam. It comes across under DR-01 (c) and is named as not yet\n'
        '//                   confirmed by Adam.\n'
        '// - Parity        : verbatim\n'
        '// - Divergences   :\n'
        '//   - Banner reads ValeVision3D; console prefix [ValeVision3D LayoutEditor].\n'
        '// - Back-port     : none.\n'
    ), 'anchor port note')
    t = once(t, "console.warn('[TrueVision3D LayoutEditor] Move anchor config unavailable",
                "console.warn('[ValeVision3D LayoutEditor] Move anchor config unavailable", 'anchor console')
    return t.encode('utf-8')

# ---------------------------------------------------------------- ViewportSnapMove
def build_vpmove():
    t = rd(os.path.join(TV, 'Na__LayoutEditor__ViewportSnapMove__.js')).decode('utf-8')
    assert '\r' not in t
    t = once(t, '// TRUEVISION3D - LAYOUT EDITOR - VIEWPORT SNAP MOVE\n', '// VALEVISION3D - LAYOUT EDITOR - VIEWPORT SNAP MOVE\n', 'vpmove banner')
    t = swap_port_note(t, (
        '// PORT NOTE:\n'
        '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/28__System__ObjectSnap/Na__LayoutEditor__ViewportSnapMove__.js\n'
        '// - Source version: 1.6.0 (TrueVision3D v2.138.0, 21-Sep-2026; read at b2aa9151)\n'
        '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-25}}, landed inert: nothing imports\n'
        '//                   it until the W3 SheetTools hub (HitResolution CarryTarget, PointerPress\n'
        '//                   GrabAt, PointerDrag Hover / Solve / Finish, Keyboard and ToolState Clear,\n'
        '//                   SheetTools Refresh, CopyDrag Retarget), and the carry stays behind that\n'
        '//                   hub\'s guards until Adam confirms DR-40 item 9 (W3-04). Its carry rules are\n'
        '//                   in Na__LayoutEditor__Styles__Main__Paper__.css, as in TrueVision. It never\n'
        '//                   reached this app before (TrueVision\'s note: "Ported to : ValeVision3D ...\n'
        '//                   (pending)"); it takes 1.0.0 (v2.28.0), 1.1.0 (v2.31.0), 1.2.0 (v2.98.0),\n'
        '//                   1.3.0 (v2.114.0), 1.4.0 (v2.117.0), 1.5.0 (v2.129.0) and 1.6.0 (v2.138.0).\n'
        '//                   None is confirmed by Adam in TrueVision (v2.98.0 "NOT YET CONFIRMED BY\n'
        '//                   ADAM", v2.114.0 "Adam has not tried it", v2.117.0, v2.129.0 and v2.138.0\n'
        '//                   "NOT tried by Adam", v2.28.0 and v2.31.0 record no try); they come across\n'
        '//                   under DR-01 (c) and are named so.\n'
        '// - Parity        : verbatim\n'
        '// - Divergences   :\n'
        '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
        '// - Back-port     : none (TrueVision may want its carry rules moved into\n'
        '//                   Na__LayoutEditor__Styles__ObjectSnap__.css with the rest of the snapping).\n'
    ), 'vpmove port note')
    assert 'TrueVision3D LayoutEditor' not in t and 'console.' not in t
    return t.encode('utf-8')

# ---------------------------------------------------------------- Config (verbatim)
def build_acfg():
    return rd(os.path.join(TV, 'Na__LayoutEditor__MoveAnchor__Config__.json'))

# ---------------------------------------------------------------- Paper CSS (CRLF kept)
def build_paper():
    live = rd(T_PAPER)
    assert live.count(b'\r\n') == live.count(b'\n'), 'paper: not uniformly CRLF'
    t = live.decode('utf-8').replace('\r\n', '\n')
    tvl = rd(os.path.join(TV, 'Na__LayoutEditor__Styles__Main__Paper__.css')).decode('utf-8').split('\n')
    # TV lines 814-887 (1-based): the VIEWPORT CARRY note through the [hidden] rule
    assert tvl[813].startswith('/* VIEWPORT CARRY | '), tvl[813]
    assert tvl[886] == '}' and tvl[885].strip() == 'display                            : none;'.strip() and tvl[888].startswith('/* endregion'), tvl[886:889]
    block = '\n'.join(tvl[813:887]) + '\n'
    assert 'na-le-frame--carried' not in t
    anchor = '@keyframes na-le-dropper-flash {\n    0%   { opacity : 1; }\n    100% { opacity : 0; }\n}\n\n/* endregion ------------------------------------------------------- */'
    t = once(t, anchor,
             '@keyframes na-le-dropper-flash {\n    0%   { opacity : 1; }\n    100% { opacity : 0; }\n}\n\n' + block + '\n/* endregion ------------------------------------------------------- */',
             'paper carry insert')
    t = once(t,
        ' *                 with Grips 1.12.0 in the same change (read at b2aa9151: v2.129.0, v2.137.0, a2e0a836).\n */\n',
        ' *                 with Grips 1.12.0 in the same change (read at b2aa9151: v2.129.0, v2.137.0, a2e0a836).\n'
        ' * - Carry       : 02-Oct-2026 for ValeVision3D {{VVREL:W2-25}}: TrueVision3D\'s VIEWPORT CARRY rules\n'
        ' *                 (.na-le-frame--carried, .na-le-carry-base, .na-le-track-point with its two strokes,\n'
        ' *                 .na-le-track-guide --x / --y and the [hidden] rule), verbatim at TrueVision\'s position,\n'
        ' *                 the end of "Grips and Inference" (read at b2aa9151: ViewportSnapMove 1.6.0, v2.28.0 -\n'
        ' *                 v2.138.0). Nothing puts those classes on the page until the W3 hub carries a viewport.\n'
        ' */\n', 'paper port note')
    return t.replace('\n', '\r\n').encode('utf-8')

# ---------------------------------------------------------------- AxisLock header (CRLF kept)
def build_axis():
    live = rd(T_AXIS)
    assert live.count(b'\r\n') == live.count(b'\n'), 'axis: not uniformly CRLF'
    t = live.decode('utf-8').replace('\r\n', '\n')
    tvl = rd(os.path.join(TV, 'Na__LayoutEditor__AxisLock__.js')).decode('utf-8').split('\n')
    para = '\n'.join(tvl[31:35]) + '\n'
    assert para.startswith('// - Na__LayoutEditor__ViewportSnapMove__ reads Get()'), para
    t = once(t, '//   rubber band by the locked axis.\n//\n',
                '//   rubber band by the locked axis.\n' + para + '//\n', 'axis paragraph')
    t = once(t, '// - Ported on     : 10-Sep-2026 for ValeVision3D v2.21.13 (port Phase 5)\n',
                '// - Ported on     : 10-Sep-2026 for ValeVision3D v2.21.13 (port Phase 5); the INTEGRATION\n'
                '//                   paragraph naming ViewportSnapMove taken from TrueVision3D\'s copy (read\n'
                '//                   at b2aa9151) on 02-Oct-2026 for ValeVision3D {{VVREL:W2-25}}, with the\n'
                '//                   module it describes. Code unchanged.\n', 'axis port note')
    return t.replace('\n', '\r\n').encode('utf-8')

BUILD = [(T_ANCHOR, build_anchor), (T_ACFG, build_acfg), (T_VPMOVE, build_vpmove), (T_PAPER, build_paper), (T_AXIS, build_axis)]

def stage():
    os.makedirs(STAGED, exist_ok=True)
    out = {}
    for target, fn in BUILD:
        b = fn()
        p = os.path.join(STAGED, os.path.basename(target))
        with open(p, 'wb') as fh:
            fh.write(b)
        out[target] = b
        print('staged', os.path.basename(target), len(b), sha(b)[:12])
    return out

def apply():
    for p in NEW:
        assert not os.path.exists(p), 'new file already exists: ' + p
    os.makedirs(BEFORE, exist_ok=True)
    for p in EDITED:
        bk = os.path.join(BEFORE, os.path.basename(p))
        if os.path.exists(bk):
            assert rd(bk) == rd(p), 'live file changed since backup: ' + p
        else:
            shutil.copyfile(p, bk)
    out = stage()
    for target, b in out.items():
        with open(target, 'wb') as fh:
            fh.write(b)
        assert rd(target) == b
        print('wrote', target)

def restore():
    for p in EDITED:
        bk = os.path.join(BEFORE, os.path.basename(p))
        shutil.copyfile(bk, p)
        print('restored', p)
    for p in NEW:
        if os.path.exists(p):
            os.remove(p)
            print('removed', p)

if __name__ == '__main__':
    arg = sys.argv[1] if len(sys.argv) > 1 else '--stage'
    {'--stage': stage, '--apply': apply, '--restore': restore}[arg]()
