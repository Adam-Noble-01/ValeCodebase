"""W1-38 scratch: build the three candidates from TrueVision's bytes at the pin (git show, LF), re-applying only the
named seams (banner, PORT NOTE). Every replacement is exact and asserted to its count. Writes scratch/W1-38/candidates/.

Usage: python -B build_w1_38.py
"""
import os
import re
import subprocess

NAWEB = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN = 'b2aa9151'
APP = 'na-apps/30__TrueVision__CoreAppCode/'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'candidates')
os.makedirs(OUT, exist_ok=True)

PANELHOST = '02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__PanelHost__.js'
PANELCSS = '02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Styles__Panels__.css'
TEST = '80__Testing__PrototypeEnvironment/Na__Test__ColourPalette__.test.mjs'


def tv(rel):
    data = subprocess.run(['git', '-C', NAWEB, 'show', f'{PIN}:{APP}{rel}'], capture_output=True, check=True).stdout
    assert b'\r' not in data, rel + ': TrueVision text at the pin carries CR'
    return data.decode('utf-8')


def swap(text, old, new, label, count=1):
    found = text.count(old)
    assert found == count, f'{label}: expected {count} occurrence(s), found {found}'
    return text.replace(old, new)


def write(name, text):
    path = os.path.join(OUT, name)
    with open(path, 'wb') as fh:
        fh.write(text.encode('utf-8'))                                  # <-- LF, exactly as built
    print(f'  wrote {name}: {len(text.splitlines())} lines')


# -----------------------------------------------------------------------------
# PanelHost 1.6.0
# -----------------------------------------------------------------------------
src = tv(PANELHOST)
src = swap(src, '// TRUEVISION3D - LAYOUT EDITOR - PANEL HOST\n', '// VALEVISION3D - LAYOUT EDITOR - PANEL HOST\n', 'PanelHost banner')
TV_NOTE_JS = (
    '// PORT NOTE:\n'
    '// - Ported from   : ValeVision3D 51__System__LayoutEditor/Na__LayoutEditor__PanelHost__.js\n'
    '// - Ported on     : 10-Sep-2026 for TrueVision3D v2.21.0 (re-alignment)\n'
    '// - Parity        : verbatim\n'
    '// - Divergences   : Console prefix, header and folder numbers; column tabs (1.4.0), TrueVision first on 19-Sep-2026.\n'
    '// - Back-port     : n/a (this IS the back-port)\n'
)
VV_NOTE_JS = (
    '// PORT NOTE:\n'
    '// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0, port Phase 5, after Lantern Designer\n'
    "//                   30__System__DrawingEditorMode's panel columns); TrueVision3D took it for v2.21.0\n"
    '//                   (10-Sep-2026); since ported back whole from TrueVision3D 1.6.0 (HEAD b2aa9151)\n'
    '// - Source version: 1.6.0 (TrueVision3D v2.126.0, 21-Sep-2026; read at b2aa9151)\n'
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-38}} - whole, with TrueVision's log. This\n"
    "//                   app's own 1.0.0-1.4.0 (09-Sep-2026 to 20-Sep-2026) had taken AdvancedToggle (its\n"
    '//                   1.1.0), SliderRow (its 1.2.0), SetFolded, FocusSection and the selection helpers\n'
    '//                   (1.3.0) and the column tabs (1.4.0) from TrueVision, and lacked LinkedPairRow and\n'
    '//                   ShowLink (TrueVision 1.2.0), the tab hover text (1.5.0), the Colour Palette attach\n'
    "//                   (1.6.0) and the slider's number box.\n"
    "// - Parity        : verbatim (the code is TrueVision 1.6.0's; the banner and this note are the only\n"
    '//                   differences)\n'
    '// - Divergences   :\n'
    '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
    "// - Back-port     : none. TrueVision's log has no entry for the slider's number box (SliderRow and\n"
    "//                   ShowSlider, in its commit d76d7638 of 21-Sep-2026, with v2.123.0): a records note\n"
    '//                   for the TrueVision lane (WT-04), not made here.\n'
)
src = swap(src, TV_NOTE_JS, VV_NOTE_JS, 'PanelHost PORT NOTE')
write('Na__LayoutEditor__PanelHost__.js', src)

# -----------------------------------------------------------------------------
# Styles__Panels (TrueVision's sheet as v2.154.0 left it)
# -----------------------------------------------------------------------------
css = tv(PANELCSS)
css = swap(css, '/* REGION  |  TrueVision3D - Layout Editor Styles (panels)            */\n',
                '/* REGION  |  ValeVision3D - Layout Editor Styles (panels)            */\n', 'Styles__Panels banner')
TV_NOTE_CSS = (
    '/*\n'
    ' * PORT NOTE:\n'
    ' * - Ported from : Lantern Designer 30__System__DrawingEditorMode stylesheet (panel column rules)\n'
    ' * - Ported on   : 09-Sep-2026 for TrueVision3D v2.21.0 (port Phase 5)\n'
    ' * - Parity      : adapted (foldable sections with height grips, delegated controls, layer rows)\n'
    ' */\n'
)
VV_NOTE_CSS = (
    '/*\n'
    ' * PORT NOTE:\n'
    ' * - Authored in   : ValeVision3D first (09-Sep-2026, v2.21.0, port Phase 5: Lantern Designer\'s\n'
    ' *                   30__System__DrawingEditorMode panel column rules, adapted for foldable sections with\n'
    ' *                   height grips, delegated controls and layer rows); TrueVision3D took it for v2.21.0\n'
    ' *                   (10-Sep-2026); since ported back whole from TrueVision3D (HEAD b2aa9151)\n'
    ' * - Source version: none of its own - the sheet as TrueVision3D v2.154.0 left it (23-Sep-2026, commit\n'
    ' *                   b24f33a9; read at b2aa9151)\n'
    ' * - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-38}} - whole. This app\'s copy was last\n'
    ' *                   brought level in its v2.68.0 (20-Sep-2026: the Scrapbook and Column Tabs regions);\n'
    ' *                   it lacked the Linked Pair region, the slider\'s number box and suffix, the wrapping\n'
    ' *                   Scale buttons and their tight variant, the inline check, the Ref button and one red\n'
    ' *                   for Off, Unlock and Ref.\n'
    ' * - Parity        : verbatim (every rule and comment is TrueVision\'s; the banner and this note are the\n'
    ' *                   only differences). Two comments speak for TrueVision: the sheet name field\'s code\n'
    ' *                   is "the Drawing Register\'s" (here the sheet\'s Drawing No. until the register lands)\n'
    ' *                   and the offer is "the project admin record" (here the project record).\n'
    ' * - Divergences   :\n'
    ' *   - Banner reads ValeVision3D.\n'
    ' * - Back-port     : none.\n'
    ' */\n'
)
css = swap(css, TV_NOTE_CSS, VV_NOTE_CSS, 'Styles__Panels PORT NOTE')
write('Na__LayoutEditor__Styles__Panels__.css', css)

# -----------------------------------------------------------------------------
# Na__Test__ColourPalette__ 1.1.0
# -----------------------------------------------------------------------------
test = tv(TEST)
test = swap(test, '// TRUEVISION3D - TEST - COLOUR PALETTE\n', '// VALEVISION3D - TEST - COLOUR PALETTE\n', 'test banner')
USAGE_END = (
    '// USAGE:\n'
    '//     node 80__Testing__PrototypeEnvironment/Na__Test__ColourPalette__.test.mjs\n'
    '//\n'
    '// -----------------------------------------------------------------------------\n'
    '//\n'
    '// DEVELOPMENT LOG:\n'
)
USAGE_END_VV = (
    '// USAGE:\n'
    '//     node 80__Testing__PrototypeEnvironment/Na__Test__ColourPalette__.test.mjs\n'
    '//\n'
    '// -----------------------------------------------------------------------------\n'
    '//\n'
    '// PORT NOTE:\n'
    '// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__ColourPalette__.test.mjs\n'
    '// - Source version: 1.1.0 (TrueVision3D v2.133.0, 21-Sep-2026; read at b2aa9151)\n'
    '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-38}}\n'
    "// - Parity        : verbatim (every check is TrueVision's; the banner and this note are the only\n"
    "//                   differences). It reads this app's own files: the palette package W1-37 landed,\n"
    '//                   named Vale Garden Houses Standard (DR-20) - the test finds the palette by its key,\n'
    "//                   never its name - this app's panel host and its CSS index. The greys are checked\n"
    '//                   against the Edge Materials SSOT where this machine has it, as in TrueVision; where\n'
    '//                   it has not, that one check says SKIP.\n'
    '// - Divergences   :\n'
    '//   - Banner reads ValeVision3D.\n'
    '// - Back-port     : none.\n'
    '//\n'
    '// -----------------------------------------------------------------------------\n'
    '//\n'
    '// DEVELOPMENT LOG:\n'
)
test = swap(test, USAGE_END, USAGE_END_VV, 'test PORT NOTE')
write('Na__Test__ColourPalette__.test.mjs', test)

# -----------------------------------------------------------------------------
# Identity scan: TrueVision / NA wording outside the PORT NOTE and DEVELOPMENT LOG blocks
# -----------------------------------------------------------------------------
MARK = re.compile(r'TrueVision|TRUEVISION|noble-architecture|NaProjectPortal|/na-apps/|Noble Architecture Ltd|ProjectVision', re.I)


def outside_blocks(text):
    lines = text.split('\n')
    inblock = False
    for n, line in enumerate(lines, 1):
        s = line.strip()
        if re.match(r'^(//|\*|/\*)\s*(PORT NOTE|DEVELOPMENT LOG)\b', s):
            inblock = True
            continue
        if inblock and (re.match(r'^(//|/\*|\*)\s*[-=]{4,}', s) or s == '*/' or s == '' or not (s.startswith('//') or s.startswith('*'))):
            inblock = False
        if not inblock and MARK.search(line):
            yield n, line.strip()


for name in ('Na__LayoutEditor__PanelHost__.js', 'Na__LayoutEditor__Styles__Panels__.css', 'Na__Test__ColourPalette__.test.mjs'):
    text = open(os.path.join(OUT, name), 'rb').read().decode('utf-8')
    hits = list(outside_blocks(text))
    print(f'  identity scan {name}: {len(hits)} hit(s) outside PORT NOTE / DEVELOPMENT LOG')
    for n, l in hits:
        print(f'      :{n}  {l[:140]}')
