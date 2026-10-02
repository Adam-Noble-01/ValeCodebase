# -*- coding: utf-8 -*-
# W1-20 scratch: lift, VERBATIM, the MODEL part of TrueVision's Na__Test__LayerMenu__.test.mjs at the pin
# (b2aa9151) into a runnable scratch copy, pointed at a source tree given at run time (env W1_20_SRC, an
# absolute path to a 02__Src__AppModules tree). The copy carries TrueVision's text, so it is written OUTSIDE
# the repository (the session scratchpad) and deleted afterwards; this script re-creates it.
#
#   python -B make_layermenu_test.py <out_dir>
#
#   The model part (wp_canonical test_ownership: porter W2-21, "sections_run_earlier_by": W1-20):
#     TV lines   1-345  the loader, checks, the RB05 sheet, THE RECORD (SheetRecords NormaliseLayer), THE MODEL
#                       (Layers: reach, the selection trim, ItemLayerId, MoveToLayer, IsItemPickable) and LAYERS
#                       BY NAME (GetLayerByName, LayerIndexLike, silent CreateLayer / UpdateLayer);
#     TV lines 420-443  THE COPIES' model half: InsertShape keeps a layer the sheet has, and a dead id falls back
#                       by kind with the fallback written (Shapes 1.4.0);
#     TV lines 750-758  the Result block.
#   Left out (other packages' modules, not yet in ValeVision at TrueVision's level): the Layer menu
#   (LE/30 LayerMenu, W2-21), the clipboard (ItemClipboard 1.6.0, W2-21), object snap (W2-19 / W2-42), the
#   markup hit test (MarkupBridge, W1-28) and the selection box (W2-21).
#   Only the SRC line changes; one "// endregion" line closes the cut Copies region.

import os
import subprocess
import sys

NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
TEST = 'na-apps/30__TrueVision__CoreAppCode/80__Testing__PrototypeEnvironment/Na__Test__LayerMenu__.test.mjs'


def show():
    out = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + TEST], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if out.returncode != 0:
        raise SystemExit('git show failed: ' + out.stderr.decode('utf-8', 'replace'))
    return out.stdout.decode('utf-8')


def lines(rows, first, last):
    """1-based inclusive line range, newline-terminated."""
    return '\n'.join(rows[first - 1:last]) + '\n'


def main(argv):
    out_dir = argv[0]
    os.makedirs(out_dir, exist_ok=True)
    text = show()
    rows = text.split('\n')
    assert rows[74].startswith("    const SRC        = resolve(SCRIPT_DIR, '..', '02__Src__AppModules');"), rows[74]
    assert rows[344].startswith('// endregion'), rows[344]
    assert rows[419].startswith('// -------'), rows[419]
    assert rows[420].startswith('// REGION | The Copies: InsertShape and the Clipboard'), rows[420]
    assert rows[423].startswith("    const SH = await load('51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__Shapes__.js'"), rows[423]
    assert rows[442].strip().endswith("[ 'Layer_004', 'Layer_005', 'Layer_004' ]);"), rows[442]
    assert rows[444].startswith("    const C = await load('51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__ItemClipboard__.js'"), rows[444]
    assert rows[749].startswith('// -------'), rows[749]
    assert rows[750].startswith('// REGION | Result'), rows[750]
    head = lines(rows, 1, 345)
    old = "    const SRC        = resolve(SCRIPT_DIR, '..', '02__Src__AppModules');\n"
    if head.count(old) != 1:
        raise SystemExit('SRC line not found exactly once')
    head = head.replace(old, "    const SRC        = process.env.W1_20_SRC;                                   // <-- W1-20 scratch: the tree under test\n")
    body = (head + '\n\n' + lines(rows, 420, 443)
            + '\n// endregion -------------------------------------------------------------------\n\n\n'
            + lines(rows, 750, 758))
    dest = os.path.join(out_dir, 'LayerMenu__model__w1_20.test.mjs')
    with open(dest, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(body)
    print('wrote ' + dest + ' (' + str(body.count('\n')) + ' lines)')


if __name__ == '__main__':
    main(sys.argv[1:])
