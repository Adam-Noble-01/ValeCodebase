"""W3-03 port: the SheetTools hub sub-wave B, atomic.

Whole from TrueVision at b2aa9151 (LF, as git show returns it): HitResolution 1.11.0, PointerPress 1.10.0, PointerDrag
1.19.0, Keyboard 1.18.0, SheetTools 1.39.0, ContextMenu 1.7.0, CopyDrag 1.2.0 (new), AxisLock 1.0.0 and ContentEditing
1.0.0 (header syncs), ViewportHandles 1.5.0 (OC-02). Seams: banner line 2, the PORT NOTE block, and the four DR-40
gesture guards (items 7-10 held). MarginGrip: hunk replay of TrueVision's IsMoveAuto term (file's own line endings).
Six TrueVision tests (banner, printed title, PORT NOTE; CrossSheetClipboard has no header and lands byte for byte).

Usage:
  python port_w3_03.py --stage    build every file into scratch/W3-03/staged/ and print the diff of each vs TrueVision
  python port_w3_03.py --apply    assert every live target still equals its backup (or is absent), then write each whole
  python port_w3_03.py --check    compare live with staged
  python port_w3_03.py --restore  put the backups back and delete the files this package created (only if unchanged)
"""
import difflib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import notes_w3_03 as N  # noqa: E402

VV = r'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/'
ST = '02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/'
LE = '02__Src__AppModules/51__System__LayoutEditor/'
T = '80__Testing__PrototypeEnvironment/'
RULE = '// -----------------------------------------------------------------------------\n'
LOG_HEAD = RULE + '//\n// DEVELOPMENT LOG:\n'


def tv(name):
    with open(os.path.join(HERE, 'tv', name), 'rb') as f:
        b = f.read()
    assert b'\r' not in b, name + ': TrueVision text has CR'
    return b.decode('utf-8')


def once(text, old, new, what):
    n = text.count(old)
    assert n == 1, '%s: matched %d times' % (what, n)
    return text.replace(old, new)


def rebanner(text, name):
    lines = text.split('\n', 2)
    assert lines[1].startswith('// TRUEVISION3D - '), name + ': banner'
    lines[1] = '// VALEVISION3D - ' + lines[1][len('// TRUEVISION3D - '):]
    return '\n'.join(lines)


def renote(text, name, note):
    assert text.count('// PORT NOTE:\n') == 1, name + ': PORT NOTE count'
    start = text.index('// PORT NOTE:\n')
    end = text.index(RULE, start)
    return text[:start] + note + text[end:]


def whole(name, guards=None):
    text = tv(name)
    out = rebanner(text, name)
    out = renote(out, name, N.NOTES[name])
    if guards:
        out = guards(out)
    assert 'TRUEVISION3D' not in out, name
    return out


def guards_hit(t):
    name = 'HitResolution'
    t = once(t, RULE + '// REGION | Hit Tolerance and Vector Helpers\n',
             N.HIT_GUARD_REGION + RULE + '// REGION | Hit Tolerance and Vector Helpers\n', name + ' region')
    a = ("    function Na__LeTools__PicksUpMove(sheet, found, pointMm) {\n"
         "        if (!Na__LeTools__Editable || !sheet || !found) return false;\n")
    t = once(t, a, a + N.HIT_GUARD_PICKS, name + ' PicksUpMove')
    a = ("    function Na__LeTools__CarryTarget(sheet, found) {\n"
         "        if (!Na__LeTools__Editable || !found || found.kind !== 'viewport') return null;\n")
    t = once(t, a, a + N.HIT_GUARD_CARRY, name + ' CarryTarget')
    t = once(t, "        Na__LeTools__CarryTarget\n    };\n",
             "        Na__LeTools__CarryTarget,\n        Na__LeTools__VV_HOLD_AUTO_MOVE\n    };\n", name + ' export')
    return t


def guards_press(t):
    name = 'PointerPress'
    t = once(t, RULE + '// REGION | The Press and the Double Click\n',
             N.PRESS_GUARD_REGION + RULE + '// REGION | The Press and the Double Click\n', name + ' region')
    a = "        const intent  = Na__LeCfg__MatchSelectionModifier({ Ctrl : !!event.ctrlKey, Shift : !!event.shiftKey, Alt : !!event.altKey, Meta : !!event.metaKey });\n"
    t = once(t, a, a + N.PRESS_GUARD_ANCHOR, name + ' intent')
    a = "        drag.copyable  = (Na__LeTools__IsMoveDrag(drag) || Na__LeTools__IsViewportMoveDrag(drag)) && !Na__LeScope__IsLeafOpen();\n"
    t = once(t, a, a + N.PRESS_GUARD_COPY, name + ' copyable')
    return t


def guards_drag(t):
    name = 'PointerDrag'
    t = once(t, "        Na__LeTools__CarryTarget\n    } from './Na__LayoutEditor__SheetTools__HitResolution__.js';\n",
             "        Na__LeTools__CarryTarget,\n        Na__LeTools__VV_HOLD_AUTO_MOVE\n    } from './Na__LayoutEditor__SheetTools__HitResolution__.js';\n",
             name + ' import')
    a = "        if (result.dragged && Na__LeTools__SelectionPicksUpMove(chosen)) Na__LeTools__PickUpMove();\n"
    t = once(t, a, N.DRAG_GUARD_BOX + a, name + ' box')
    return t


# -----------------------------------------------------------------------------
# MarginGrip: hunk replay on the live file (its own line endings)
# -----------------------------------------------------------------------------
MG_OLD_NOTE_TAIL = """// - Parity        : adapted (TrueVision 1.3.0's code less one held term, below)
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
//   - 1.1.0's Na__LeTools__IsMoveAuto is held: neither imported nor asked in Render, so the
//     grip shows under Select only. ValeVision's SheetTools does not export IsMoveAuto
//     until the SheetTools hub lands it (W3-03), and the automatic Move it answers for is
//     DR-40 item 7, held until Adam confirms it. W3-03 restores the import and the
//     '|| Na__LeTools__IsMoveAuto()' term; delete this bullet then.
// - Back-port     : none.
"""
MG_NEW_NOTE_TAIL = """//                   The import of Na__LeTools__IsMoveAuto and its '|| Na__LeTools__IsMoveAuto()'
//                   term (1.1.0, v2.78.0), held until the SheetTools hub exported it, restored on
//                   02-Oct-2026 for ValeVision3D {{VVREL:W3-03}} with that hub. While DR-40 item 7 (the
//                   automatic Move) is held, IsMoveAuto is always false, so the grip still shows
//                   under Select only.
// - Parity        : verbatim - TrueVision's file; the banner and this note are the only differences.
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
"""
MG_OLD_IMPORT = "    import { Na__LeTools__CHANGED_EVENT, Na__LeTools__TOOL_SELECT, Na__LeTools__GetTool } from '../30__System__SheetTools/Na__LayoutEditor__SheetTools__.js';   // <-- VV: IsMoveAuto held until the SheetTools hub (W3-03); see PORT NOTE\n"
MG_OLD_RENDER = "        grip.hidden = !(Na__LeMarginGrip__Editable && (Na__LeMarginGrip__Drag || Na__LeTools__GetTool() === Na__LeTools__TOOL_SELECT));   // <-- VV: TrueVision also keeps it up under an automatic Move (IsMoveAuto), held until W3-03; see PORT NOTE\n"


def margin_grip():
    name = 'Na__LayoutEditor__MarginGrip__.js'
    with open(os.path.join(HERE, 'backup', name), 'rb') as f:
        raw = f.read()
    crlf = b'\r\n' in raw
    text = raw.decode('utf-8').replace('\r\n', '\n')
    src = tv(name)
    tv_import = [l + '\n' for l in src.split('\n') if 'Na__LeTools__IsMoveAuto } from' in l]
    tv_render = [l + '\n' for l in src.split('\n') if 'grip.hidden = !(Na__LeMarginGrip__Editable' in l]
    assert len(tv_import) == 1 and len(tv_render) == 1
    text = once(text, MG_OLD_IMPORT, tv_import[0], 'MarginGrip import')
    text = once(text, MG_OLD_RENDER, tv_render[0], 'MarginGrip render')
    text = once(text, MG_OLD_NOTE_TAIL, MG_NEW_NOTE_TAIL, 'MarginGrip PORT NOTE')
    if crlf:
        text = text.replace('\n', '\r\n')
    return text


# -----------------------------------------------------------------------------
# Tests
# -----------------------------------------------------------------------------
def test_port(name, source, title=None, extra=None):
    text = tv(name)
    out = rebanner(text, name)
    if title:
        out = once(out, title[0], title[1], name + ' printed title')
    div = ['//   - Banner' + (' and the printed title read' if title else ' reads') + ' ValeVision3D.']
    if extra:
        div.extend(extra)
    note = ('// PORT NOTE:\n'
            '// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/' + name + '\n'
            '// - Source version: ' + source + '\n'
            '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-03}}, with the SheetTools hub\n'
            '// - Parity        : verbatim\n'
            '// - Divergences   :\n' + '\n'.join(div) + '\n'
            '// - Back-port     : none.\n'
            '//\n')
    out = once(out, LOG_HEAD, RULE + '//\n' + note + LOG_HEAD, name + ' PORT NOTE')
    assert 'TRUEVISION3D' not in out
    return out


TESTS = {
    'Na__Test__MoveRetype__.test.mjs': lambda: test_port('Na__Test__MoveRetype__.test.mjs',
        '1.0.0 (TrueVision3D v2.118.0, 21-Sep-2026; read at b2aa9151)',
        ("    console.log('TrueVision3D - the Measurements box during a move, and the retype');\n",
         "    console.log('ValeVision3D - the Measurements box during a move, and the retype');\n")),
    'Na__Test__CopyDrag__.test.cjs': lambda: test_port('Na__Test__CopyDrag__.test.cjs',
        '1.1.1 (TrueVision3D v2.149.0, 22-Sep-2026; read at b2aa9151)', None,
        ['//   - Runs the Copy Drag unit itself, so every check runs: the gesture that reaches it is',
         '//     held (DR-40 item 8, PointerPress makes no drag copyable) until package W3-04.']),
    'Na__Test__GroupMoveSnapping__.test.cjs': lambda: test_port('Na__Test__GroupMoveSnapping__.test.cjs',
        '1.2.2 (TrueVision3D v2.149.0, 22-Sep-2026; read at b2aa9151)'),
    'Na__Test__SetMoveLeaderTips__.test.cjs': lambda: test_port('Na__Test__SetMoveLeaderTips__.test.cjs',
        '1.1.2 (TrueVision3D v2.150.0, 22-Sep-2026; read at b2aa9151)', None,
        ['//   - SelectionPicksUpMove is read as TrueVision answers it: the automatic Move it feeds is',
         '//     held at its callers (DR-40 item 7) until package W3-04.']),
    'Na__Test__BubbleNoteTooltip__.test.mjs': lambda: test_port('Na__Test__BubbleNoteTooltip__.test.mjs',
        '1.0.0 (TrueVision3D v2.144.0, 22-Sep-2026; read at b2aa9151)',
        ("console.log('\\nTrueVision3D - a bubble names its note, and finds it\\n\\n  The note resolver (the shipped LeaderGeometry and SpecLinks)');\n",
         "console.log('\\nValeVision3D - a bubble names its note, and finds it\\n\\n  The note resolver (the shipped LeaderGeometry and SpecLinks)');\n")),
    'Na__Test__CrossSheetClipboard__.test.cjs': lambda: tv('Na__Test__CrossSheetClipboard__.test.cjs'),
}

FILES = [
    (ST + 'Na__LayoutEditor__SheetTools__HitResolution__.js', lambda: whole('Na__LayoutEditor__SheetTools__HitResolution__.js', guards_hit)),
    (ST + 'Na__LayoutEditor__SheetTools__PointerPress__.js', lambda: whole('Na__LayoutEditor__SheetTools__PointerPress__.js', guards_press)),
    (ST + 'Na__LayoutEditor__SheetTools__PointerDrag__.js', lambda: whole('Na__LayoutEditor__SheetTools__PointerDrag__.js', guards_drag)),
    (ST + 'Na__LayoutEditor__SheetTools__Keyboard__.js', lambda: whole('Na__LayoutEditor__SheetTools__Keyboard__.js')),
    (ST + 'Na__LayoutEditor__SheetTools__.js', lambda: whole('Na__LayoutEditor__SheetTools__.js')),
    (ST + 'Na__LayoutEditor__SheetTools__ContextMenu__.js', lambda: whole('Na__LayoutEditor__SheetTools__ContextMenu__.js')),
    (ST + 'Na__LayoutEditor__SheetTools__CopyDrag__.js', lambda: whole('Na__LayoutEditor__SheetTools__CopyDrag__.js')),
    (ST + 'Na__LayoutEditor__AxisLock__.js', lambda: whole('Na__LayoutEditor__AxisLock__.js')),
    (ST + 'Na__LayoutEditor__SheetTools__ContentEditing__.js', lambda: whole('Na__LayoutEditor__SheetTools__ContentEditing__.js')),
    (LE + '20__System__Viewports/Na__LayoutEditor__ViewportHandles__.js', lambda: whole('Na__LayoutEditor__ViewportHandles__.js')),
    (LE + '50__Feature__Specification/Na__LayoutEditor__MarginGrip__.js', margin_grip),
] + [(T + n, fn) for n, fn in TESTS.items()]


def staged_path(rel):
    return os.path.join(HERE, 'staged', os.path.basename(rel))


def backup_path(rel):
    return os.path.join(HERE, 'backup', os.path.basename(rel))


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--stage'
    os.makedirs(os.path.join(HERE, 'staged'), exist_ok=True)
    if mode == '--stage':
        for rel, fn in FILES:
            out = fn()
            with open(staged_path(rel), 'wb') as f:
                f.write(out.encode('utf-8'))
            name = os.path.basename(rel)
            if name == 'Na__LayoutEditor__MarginGrip__.js':
                base = open(backup_path(rel), 'rb').read().decode('utf-8').replace('\r\n', '\n')
                label = 'vv-before/'
            else:
                base = tv(name)
                label = 'tv/'
            d = list(difflib.unified_diff(base.split('\n'), out.replace('\r\n', '\n').split('\n'), label + name, 'staged/' + name, lineterm='', n=0))
            print('=== %s: %d diff lines' % (name, len(d)))
            if '--diff' in sys.argv:
                print('\n'.join(d))
    elif mode == '--apply':
        for rel, _ in FILES:
            live = os.path.join(VV, rel)
            b = backup_path(rel)
            if os.path.exists(b + '.ABSENT'):
                assert not os.path.exists(live), rel + ' appeared since the backup - stop'
            else:
                assert open(live, 'rb').read() == open(b, 'rb').read(), rel + ' changed since the backup - stop'
        for rel, _ in FILES:
            data = open(staged_path(rel), 'rb').read()
            with open(os.path.join(VV, rel), 'wb') as f:
                f.write(data)
            print('wrote', len(data), rel)
    elif mode == '--check':
        for rel, _ in FILES:
            live = os.path.join(VV, rel)
            same = os.path.exists(live) and open(live, 'rb').read() == open(staged_path(rel), 'rb').read()
            print(('SAME     ' if same else 'DIFFERS  ') + rel)
    elif mode == '--restore':
        for rel, _ in FILES:
            live = os.path.join(VV, rel)
            if os.path.exists(live) and open(live, 'rb').read() != open(staged_path(rel), 'rb').read():
                b = backup_path(rel)
                if not (os.path.exists(b) and open(live, 'rb').read() == open(b, 'rb').read()):
                    raise SystemExit('REFUSED: %s changed since this package wrote it' % rel)
        for rel, _ in FILES:
            live = os.path.join(VV, rel)
            b = backup_path(rel)
            if os.path.exists(b + '.ABSENT'):
                if os.path.exists(live):
                    os.remove(live)
                    print('removed', rel)
            else:
                with open(live, 'wb') as f:
                    f.write(open(b, 'rb').read())
                print('restored', rel)


if __name__ == '__main__':
    main()
