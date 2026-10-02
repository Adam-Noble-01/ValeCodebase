"""W2-18 - Na__LeLoad__STYLESHEETS gains Styles__DraftMode, Styles__DrawingGrid (before ObjectSnap) and
Styles__DrawingAxes (after it), TrueVision's CSS-index order (:164-167 at b2aa9151); log 1.1.6.

The file is CRLF: every replacement is asserted exactly once, CRLF is asserted before and after, and the
file is only written when the bytes still match the backup in scratch/W2-18/before/ (nobody changed it
under us).

    python edit_loader.py          write
    python edit_loader.py --dry    build in memory and report
"""
import os, sys, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
PATH = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\01__Core__Loader\Na__LayoutEditor__Loader__.js'
BACKUP = os.path.join(HERE, 'before', 'Na__LayoutEditor__Loader__.js')
NL = b'\r\n'


def L(*lines):
    return NL.join(l.encode('utf-8') for l in lines) + NL


OBJ = "        new URL('../28__System__ObjectSnap/Na__LayoutEditor__Styles__ObjectSnap__.css', import.meta.url).href,   // <-- Object snap (F3): the snap marker (coloured by what it snapped to), the Snap button's arrow and the snap options menu"
OLD_LIST = L(
    "        new URL('../10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css', import.meta.url).href,",
    OBJ,
)
NEW_LIST = L(
    "        new URL('../10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css', import.meta.url).href,",
    "        new URL('../26__System__DraftMode/Na__LayoutEditor__Styles__DraftMode__.css', import.meta.url).href,   // <-- Draft mode (K): every rule keyed on body.na-le-draft, so it is inert until Draft is on",
    "        new URL('../27__System__DrawingGrid/Na__LayoutEditor__Styles__DrawingGrid__.css', import.meta.url).href,   // <-- Drawing grid (F6 / F7): the grid's canvas on the paper and the grid snap ring",
    OBJ,
    "        new URL('../33__System__DrawingAxes/Na__LayoutEditor__Styles__DrawingAxes__.css', import.meta.url).href,   // <-- Drawing axes overlay (F9): SketchUp's red and green axes on the cursor, out to the edges of the sheet",
)

OLD_LOG = L(
    "// DEVELOPMENT LOG:",
    "// 02-Oct-2026 - Version 1.1.5 ({{VVREL:W2-19}})",
)
NEW_LOG = L(
    "// DEVELOPMENT LOG:",
    "// 02-Oct-2026 - Version 1.1.6 ({{VVREL:W2-18}})",
    "// - THE DRAFTING AIDS' STYLESHEETS LOAD WITH THE EDITOR. Draft mode's",
    "//   (26__System__DraftMode/Na__LayoutEditor__Styles__DraftMode__.css, every",
    "//   rule keyed on body.na-le-draft), the drawing grid's",
    "//   (27__System__DrawingGrid/Na__LayoutEditor__Styles__DrawingGrid__.css,",
    "//   the grid's canvas on the paper) and the drawing axes'",
    "//   (33__System__DrawingAxes/Na__LayoutEditor__Styles__DrawingAxes__.css,",
    "//   the axes layer) join Na__LeLoad__STYLESHEETS in TrueVision's CSS-index",
    "//   order (rule 5 above): Draft and Grid between Styles__Main__Paper and",
    "//   Styles__ObjectSnap, Axes straight after it. Their modules landed in the",
    "//   same change and stay inert until the drafting aids are switched on, so",
    "//   none of the three styles anything yet.",
    "//",
    "// 02-Oct-2026 - Version 1.1.5 ({{VVREL:W2-19}})",
)


def main():
    dry = '--dry' in sys.argv
    data = open(PATH, 'rb').read()
    assert data == open(BACKUP, 'rb').read(), 'the loader changed since the backup was taken - STOP'
    assert data.count(b'\n') == data.count(b'\r\n'), 'not pure CRLF'
    for old, new, what in ((OLD_LIST, NEW_LIST, 'stylesheet list'), (OLD_LOG, NEW_LOG, 'log')):
        n = data.count(old)
        assert n == 1, '%s: expected 1, found %d' % (what, n)
        data = data.replace(old, new)
    assert data.count(b'\n') == data.count(b'\r\n'), 'not pure CRLF after'
    print('built', len(data), 'B', hashlib.md5(data).hexdigest())
    if not dry:
        with open(PATH, 'wb') as fh:
            fh.write(data)
        print('WROTE', PATH)


if __name__ == '__main__':
    main()
