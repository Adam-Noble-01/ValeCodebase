"""W2-21 port: seven SheetTools leaves and the LayerMenu test, whole from TrueVision at b2aa9151.

  python port_w2_21.py --stage     write the ported files to scratch/W2-21/staged/<VV app-relative path>
  python port_w2_21.py --apply     back up the live files (once) and write the staged bytes over them
  python port_w2_21.py --restore   put the backed-up live bytes back (new files are removed)
  python port_w2_21.py --verify    compare live files with the staged bytes

Seams re-applied (and nothing else): banner token on line 2, TrueVision's PORT NOTE block replaced
by this app's (K2 H5), and in the test the printed title's app name plus an added PORT NOTE.
"""
import hashlib, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV_ROOT = r'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D'
TV_GIT = r'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb'
PIN = 'b2aa9151'
TV_APP = 'na-apps/30__TrueVision__CoreAppCode/'
ST = '02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/'
TEST = '80__Testing__PrototypeEnvironment/Na__Test__LayerMenu__.test.mjs'
SEP = '// -----------------------------------------------------------------------------'

NOTES = {
'Na__LayoutEditor__EditScope__.js': """\
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__EditScope__.js
// - Source version: 1.4.0 (TrueVision3D v2.142.0, 22-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-21}} - whole. TrueVision authored it
//                   (17-Sep-2026, v2.59.0); this app's copy was its 1.1.0 (17-Sep-2026, ValeVision3D
//                   v2.52.0), TrueVision's 1.1.0. Taken up to 1.4.0: a picture is not a container
//                   (1.1.1, v2.116.0), Prune on hidden and reference layers (1.2.0, v2.123.0), an open
//                   group's leaders, dimensions and viewports (1.3.0, v2.141.0) and adoption into an
//                   open group (1.4.0, v2.142.0). TrueVision's entries for those releases say "NOT tried
//                   by Adam"; ported under DR-01 (c) and named in the Port Record.
// - Parity        : verbatim
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
""",
'Na__LayoutEditor__ItemClipboard__.js': """\
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__ItemClipboard__.js
// - Source version: 1.7.0 (TrueVision3D v2.142.0, 22-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-21}} - whole. TrueVision authored it
//                   (14-Sep-2026); this app's copy was its 1.2.0 (20-Sep-2026; first ValeVision3D v2.38.0,
//                   14-Sep-2026), adapted: PasteSet(sheet, atMm, fanOut), a set always landing through
//                   PlaceSet so it was kept on the paper even when pasted in place, a dimension landing
//                   but not copyable, no viewport leaf, no CutItems, per-kind menu rows. TrueVision's
//                   1.3.0 (commit 32767407 with v2.75.0, not named in that devlog entry) supersedes every
//                   one of them, and this app's "kept on the paper" paste rule is dropped (DR-40 item 1):
//                   a paste lands at its original paper coordinates, on this sheet or another, even off
//                   the page. Then 1.4.0 CloneInPlace (v2.117.0), 1.5.0 copies keep their layer
//                   (v2.123.0), 1.6.0 layers by name across sheets (v2.127.0), 1.7.0 a paste in an open
//                   group joins it (v2.142.0) - "NOT tried by Adam" in TrueVision; ported under DR-01 (c).
//                   Ctrl+X reaches CutItems once the sheet tools' keyboard maps Edit__Cut (W3-03); the
//                   Cut selection row works at once.
// - Parity        : verbatim
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
""",
'Na__LayoutEditor__SelectionSet__.js': """\
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SelectionSet__.js
// - Source version: 1.2.0 (TrueVision3D v2.141.0, 22-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-21}} - whole. TrueVision authored it
//                   (14-Sep-2026); this app's copy was its 1.0.0 (14-Sep-2026, ValeVision3D v2.33.0).
//                   Taken up to 1.2.0: a turned frame (1.1.0, v2.138.0), a leader tip that follows what
//                   it points at, a group as one piece and Capture's rigid option (1.2.0, v2.141.0) -
//                   "NOT tried by Adam" in TrueVision; ported under DR-01 (c). The rigid option serves
//                   the Ctrl-drag copy, a gesture held for Adam (DR-40 item 8): nothing here calls it yet.
// - Parity        : verbatim
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
""",
'Na__LayoutEditor__SelectionBox__.js': """\
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SelectionBox__.js
// - Source version: 1.7.0 (TrueVision3D v2.150.0, 22-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-21}} - whole. TrueVision authored it
//                   (14-Sep-2026); this app's copy was its 1.4.0 (17-Sep-2026), TrueVision's 1.4.0.
//                   Taken up to 1.7.0: nothing on a reference layer is a candidate (1.5.0, v2.123.0), a
//                   turned viewport is its turned outline (1.6.0, v2.138.0), a holed vector is each of
//                   its rings (1.7.0, v2.150.0), a measured room counts as its inside; the description
//                   as of v2.153.0 (box select, confirmed by Adam in TrueVision 23-Sep-2026; its
//                   behaviour change is in PointerPress, W3-03). The others say "NOT tried by Adam";
//                   ported under DR-01 (c).
// - Parity        : verbatim
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
""",
'Na__LayoutEditor__Eyedropper__.js': """\
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__Eyedropper__.js
// - Source version: 1.9.0 (TrueVision3D v2.139.0, 21-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-21}} - whole. TrueVision authored it
//                   (12-Sep-2026); this app's copy was its 1.7.0 (17-Sep-2026; first ValeVision3D v2.24.0,
//                   13-Sep-2026), TrueVision's 1.8.0, adapted without the Viewport__ShowFrame trait. The
//                   viewport record carries Viewport__ShowFrame since SheetRecords 1.39.0, so the trait
//                   is taken as TrueVision has it. Also taken: the dimension extension-line traits
//                   (1.4.0), pictures left out (1.8.1, v2.116.0), a turned viewport's box (1.8.2,
//                   v2.138.0), Dimension__RoundUp (1.9.0, v2.139.0), and two changes TrueVision made
//                   without a version step - the Shape__Hatch trait (v2.90.0, commit 62dade1c) and the
//                   dimension linePt and dash traits (v2.152.0); a trait whose field a record lacks
//                   copies its absent value. The hint-line comment reads TrueVision's v2.124.0 text (the
//                   toolbar has no undo, fit or zoom buttons since W1-35). "NOT tried by Adam" in
//                   TrueVision; ported under DR-01 (c).
// - Parity        : verbatim
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
""",
'Na__LayoutEditor__LayerMenu__.js': """\
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__LayerMenu__.js
// - Source version: 1.0.0 (TrueVision3D v2.123.0, 21-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-21}} - new here. TrueVision's v2.123.0
//                   entry says "NOT tried by Adam"; ported under DR-01 (c) and named in the Port Record.
//                   Inert until the sheet tools' context menu offers the Layer row (W3-03); the card's
//                   flyouts it opens arrived with ContextMenu 1.1.0 (W2-20).
// - Parity        : verbatim
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
""",
'Na__LayoutEditor__SheetTools__NoteTooltip__.js': """\
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__NoteTooltip__.js
// - Source version: 1.0.0 (TrueVision3D v2.144.0, 22-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-21}} - new here. TrueVision's v2.144.0
//                   entry says "NOT tried by Adam"; ported under DR-01 (c) and named in the Port Record.
//                   Inert until the sheet tools attach it and the pointer's hover pass calls it (W3-03);
//                   a note's title shows once the specification registers its note resolver.
// - Parity        : verbatim
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
""",
}

TEST_NOTE = """\
//
// PORT NOTE:
// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__LayerMenu__.test.mjs
// - Source version: 1.1.0 (TrueVision3D v2.127.0, 21-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-21}}, with LayerMenu 1.0.0 and
//                   ItemClipboard 1.7.0 (its model part ran in W1-20)
// - Parity        : verbatim - TrueVision's checks against this app's files
// - Divergences   :
//   - Banner and the printed title read ValeVision3D.
// - Back-port     : none.
//
""" + SEP + "\n"


def tv_bytes(rel):
    r = subprocess.run(['git', '-C', TV_GIT, 'show', PIN + ':' + TV_APP + rel], capture_output=True)
    if r.returncode != 0:
        raise SystemExit('git show failed for ' + rel + ': ' + r.stderr.decode('utf-8', 'replace'))
    return r.stdout


def once(text, old, new, what):
    n = text.count(old)
    if n != 1:
        raise SystemExit('seam "' + what + '" matched ' + str(n) + ' times')
    return text.replace(old, new)


def port_module(name):
    text = tv_bytes(ST + name).decode('utf-8')
    assert '\r' not in text
    lines = text.split('\n')
    if not lines[1].startswith('// TRUEVISION3D - '):
        raise SystemExit('banner not on line 2 in ' + name)
    lines[1] = '// VALEVISION3D - ' + lines[1][len('// TRUEVISION3D - '):]
    start = lines.index('// PORT NOTE:')
    end = next(i for i in range(start + 1, len(lines)) if lines[i] == SEP)
    new_note = NOTES[name].rstrip('\n').split('\n')
    lines[start:end] = new_note + ['//']
    return '\n'.join(lines).encode('utf-8')


def port_test():
    text = tv_bytes(TEST).decode('utf-8')
    assert '\r' not in text
    text = once(text, '// TRUEVISION3D - TEST - ', '// VALEVISION3D - TEST - ', 'banner')
    text = once(text, "console.log('TrueVision3D - the Layer flyout", "console.log('ValeVision3D - the Layer flyout", 'title')
    text = once(text, '//   Exit 0 = every check passed. Exit 1 = at least one did not.\n//\n' + SEP + '\n',
                '//   Exit 0 = every check passed. Exit 1 = at least one did not.\n//\n' + SEP + '\n' + TEST_NOTE,
                'port note')
    return text.encode('utf-8')


def targets():
    out = {ST + n: (lambda n=n: port_module(n)) for n in NOTES}
    out[TEST] = port_test
    return out


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--stage'
    staged = os.path.join(HERE, 'staged')
    backup = os.path.join(HERE, 'backup')
    for rel, make in targets().items():
        sp = os.path.join(staged, rel)
        lp = os.path.join(VV_ROOT, rel)
        bp = os.path.join(backup, rel)
        if mode == '--stage':
            data = make()
            os.makedirs(os.path.dirname(sp), exist_ok=True)
            open(sp, 'wb').write(data)
            print('staged', rel, len(data), hashlib.sha256(data).hexdigest()[:12])
        elif mode == '--apply':
            data = open(sp, 'rb').read()
            if not os.path.exists(bp) and not os.path.exists(bp + '.absent'):
                os.makedirs(os.path.dirname(bp), exist_ok=True)
                if os.path.exists(lp):
                    open(bp, 'wb').write(open(lp, 'rb').read())
                else:
                    open(bp + '.absent', 'wb').write(b'')
            open(lp, 'wb').write(data)
            print('applied', rel)
        elif mode == '--restore':
            if os.path.exists(bp):
                open(lp, 'wb').write(open(bp, 'rb').read()); print('restored', rel)
            elif os.path.exists(bp + '.absent') and os.path.exists(lp):
                os.remove(lp); print('removed', rel)
        elif mode == '--verify':
            same = os.path.exists(lp) and open(lp, 'rb').read() == open(sp, 'rb').read()
            print('same' if same else 'DIFFERENT', rel)


if __name__ == '__main__':
    main()
