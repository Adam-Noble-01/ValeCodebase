"""W2-19 - the switch-over edits to existing files (all CRLF; each keeps its own line ending).

    python edit_w2_19.py --backup    copy the seven live files to scratch/W2-19/before/ (refuses if a backup exists)
    python edit_w2_19.py             apply (each live file must still equal its backup; every replacement asserted once)
    python edit_w2_19.py --restore   put the backups back (stop condition: land nothing partial)
"""
import os, sys, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
LE = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor'
BEFORE = os.path.join(HERE, 'before')
TV = os.path.join(HERE, 'tv')

FILES = {
    'snapping': r'30__System__SheetTools\Na__LayoutEditor__Snapping__.js',
    'paper': r'10__Core__SheetSurface\Na__LayoutEditor__Styles__Main__Paper__.css',
    'loader': r'01__Core__Loader\Na__LayoutEditor__Loader__.js',
    'keyboard': r'30__System__SheetTools\Na__LayoutEditor__SheetTools__Keyboard__.js',
    'toolbar': r'40__Ui__Panels\Na__LayoutEditor__Toolbar__.js',
    'ctxmenu': r'30__System__SheetTools\Na__LayoutEditor__SheetTools__ContextMenu__.js',
    'modectl': r'05__Core__ModeController\Na__LayoutEditor__ModeController__.js',
}


def crlf(text):
    return text.replace('\r\n', '\n').replace('\n', '\r\n').encode('utf-8')


def once(data, old, new, what):
    if isinstance(old, str):
        old = crlf(old)
    if isinstance(new, str):
        new = crlf(new)
    n = data.count(old)
    assert n == 1, '%s: expected 1 occurrence, found %d' % (what, n)
    return data.replace(old, new)


# -----------------------------------------------------------------------------
# The edits
# -----------------------------------------------------------------------------

def edit_snapping(data):
    body = open(os.path.join(HERE, 'shim_body.js'), 'r', encoding='utf-8').read()
    return crlf(body)


def edit_paper(data):
    # 1. Header PORT NOTE: the snap marker no longer stays; record this package's region change.
    data = once(data,
        " *                 rule (the viewports box, the chrome and the markup at once) went with them. The snap marker\n"
        " *                 and grip rules stay this app's until W2-19 and W2-24 take TrueVision's.\n",
        " *                 rule (the viewports box, the chrome and the markup at once) went with them. The grip\n"
        " *                 rules stay this app's until W2-24 takes TrueVision's.\n", 'paper header regions line')
    data = once(data,
        " *                 SheetTools__HoverTooltip 1.1.0, v2.144.0).\n */\n",
        " *                 SheetTools__HoverTooltip 1.1.0, v2.144.0).\n"
        " * - Object snap : 02-Oct-2026 for ValeVision3D {{VVREL:W2-19}}: the snap marker's rules (.na-le-osnap with its\n"
        " *                 bordered, tinted box, the vertex, dimension and viewport tones, [hidden], the clipped --mid\n"
        " *                 triangle and the --infer ring) are gone from this sheet, as TrueVision's went at v2.129.0:\n"
        " *                 the marker is styled by 28__System__ObjectSnap/Na__LayoutEditor__Styles__ObjectSnap__.css,\n"
        " *                 linked straight after this sheet. The region they shared is TrueVision3D's \"Linework\n"
        " *                 Progress and the Hover Tooltip\", its title and note verbatim (read at b2aa9151).\n"
        " */\n", 'paper header object snap line')

    # 2. The region: TrueVision's title and note in place of the old marker rules.
    tv = open(os.path.join(TV, 'Na__LayoutEditor__Styles__Main__Paper__.css'), 'r', encoding='utf-8').read()
    start = tv.index('/* REGION  |  Linework Progress and the Hover Tooltip')
    end = tv.index('.na-le-frame__progress {', start)
    tv_head = tv[start:end]
    assert tv_head.count('THE SNAP MARKER\'S RULES HAVE MOVED') == 1
    live = data.decode('utf-8')
    a = live.index('/* REGION  |  Snap Marker and Linework Progress')
    b = live.index('.na-le-frame__progress {\r\n', a)
    old_block = live[a:b]
    assert old_block.count('.na-le-osnap') == 6 and '.na-le-frame__progress' not in old_block, old_block
    live = live[:a] + tv_head.replace('\n', '\r\n') + live[b:]
    data = live.encode('utf-8')

    # 3. The inference ring rule (the marker's --infer is the dimension target's now).
    data = once(data,
        ".na-le-osnap--infer {\n"
        "    border-radius                      : 50%;\n"
        "    border-style                       : solid;\n"
        "    background                         : transparent;\n"
        "}\n"
        "\n", "", 'paper infer rule')
    assert b'\n.na-le-osnap' not in data and b'osnap-rgb' not in data   # no marker rule left (the header note names them)
    return data


def edit_loader(data):
    data = once(data,
        "        new URL('../10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css', import.meta.url).href,\n",
        "        new URL('../10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css', import.meta.url).href,\n"
        "        new URL('../28__System__ObjectSnap/Na__LayoutEditor__Styles__ObjectSnap__.css', import.meta.url).href,   // <-- Object snap (F3): the snap marker (coloured by what it snapped to), the Snap button's arrow and the snap options menu\n",
        'loader stylesheet line')
    data = once(data,
        "// DEVELOPMENT LOG:\n// 02-Oct-2026 - Version 1.1.4 (v2.71.3)\n",
        "// DEVELOPMENT LOG:\n"
        "// 02-Oct-2026 - Version 1.1.5 ({{VVREL:W2-19}})\n"
        "// - OBJECT SNAP'S STYLESHEET LOADS WITH THE EDITOR.\n"
        "//   28__System__ObjectSnap/Na__LayoutEditor__Styles__ObjectSnap__.css (the\n"
        "//   snap marker coloured by what it snapped to, the Snap button's arrow, the\n"
        "//   snap options menu and the Move Anchor's cross) joins\n"
        "//   Na__LeLoad__STYLESHEETS straight after Styles__Main__Paper, its place in\n"
        "//   TrueVision's CSS index (rule 5 above). The marker's old rules left\n"
        "//   Styles__Main__Paper in the same change.\n"
        "//\n"
        "// 02-Oct-2026 - Version 1.1.4 (v2.71.3)\n", 'loader log')
    return data


def edit_keyboard(data):
    data = once(data,
        "    import { Na__LeOsnap__Toggle } from './Na__LayoutEditor__Snapping__.js';\n",
        "    import { Na__LeOsnap__Toggle } from '../28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__.js';   // <-- F3: object snap's own folder now (the controller - the switch and its echo)\n",
        'keyboard import')
    data = once(data,
        "// DEVELOPMENT LOG:\n// 17-Sep-2026 - Version 1.3.0\n",
        "// DEVELOPMENT LOG:\n"
        "// 02-Oct-2026 - Version 1.3.1 ({{VVREL:W2-19}})\n"
        "// - F3 SWITCHES OBJECT SNAP THROUGH ITS OWN FOLDER. Toggle comes from\n"
        "//   28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__.js (the controller),\n"
        "//   TrueVision's import line, so the switch says \"<Osnap on>\" / \"<Osnap off>\"\n"
        "//   above the Measurements box as AutoCAD does. One import line; no other\n"
        "//   change.\n"
        "//\n"
        "// 17-Sep-2026 - Version 1.3.0\n", 'keyboard log')
    return data


def edit_toolbar(data):
    data = once(data,
        "    import { Na__LeOsnap__CHANGED_EVENT, Na__LeOsnap__IsEnabled, Na__LeOsnap__Toggle } from '../30__System__SheetTools/Na__LayoutEditor__Snapping__.js';\n",
        "    import { Na__LeOsnap__CHANGED_EVENT, Na__LeOsnap__IsEnabled, Na__LeOsnap__Toggle } from '../28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__.js';\n",
        'toolbar import')
    data = once(data,
        "//   - Snap is a plain toggle over this app's\n"
        "//     30__System__SheetTools/Na__LayoutEditor__Snapping__.js. TrueVision's is a split\n"
        "//     button with a snap modes menu over 28__System__ObjectSnap (its 1.20.0; W2-19).\n",
        "//   - Snap is a plain toggle over 28__System__ObjectSnap's controller\n"
        "//     (Na__LayoutEditor__ObjectSnap__.js) with this app's words. TrueVision's is a split\n"
        "//     button whose arrow opens Na__LayoutEditor__ObjectSnap__Menu__, worded by the\n"
        "//     controller's Label (its 1.20.0); the menu is landed and waits for W5-01.\n",
        'toolbar divergence')
    data = once(data,
        "// DEVELOPMENT LOG:\n// 02-Oct-2026 - Version 1.9.4 (the strip slimmed as TrueVision's, v2.71.2)\n",
        "// DEVELOPMENT LOG:\n"
        "// 02-Oct-2026 - Version 1.9.5 (object snap's own folder, {{VVREL:W2-19}})\n"
        "// - THE SNAP BUTTON SWITCHES THROUGH 28__System__ObjectSnap. CHANGED_EVENT,\n"
        "//   IsEnabled and Toggle come from its controller,\n"
        "//   Na__LayoutEditor__ObjectSnap__.js, so a click echoes \"<Osnap on>\" /\n"
        "//   \"<Osnap off>\" as F3 does, and the button follows the same event and\n"
        "//   the same remembered switch. One import line. The arrow and the snap\n"
        "//   options menu are TrueVision's 1.20.0 and come with W5-01.\n"
        "//\n"
        "// 02-Oct-2026 - Version 1.9.4 (the strip slimmed as TrueVision's, v2.71.2)\n", 'toolbar log')
    return data


def edit_ctxmenu(data):
    data = once(data,
        "    import { Na__LeOsnap__Toggle, Na__LeOsnap__IsEnabled } from './Na__LayoutEditor__Snapping__.js';\n",
        "    import { Na__LeOsnap__Toggle, Na__LeOsnap__IsEnabled } from '../28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__.js';\n",
        'ctxmenu import')
    data = once(data,
        "// DEVELOPMENT LOG:\n// 18-Sep-2026 - Version 1.2.0\n",
        "// DEVELOPMENT LOG:\n"
        "// 02-Oct-2026 - Version 1.2.1 ({{VVREL:W2-19}})\n"
        "// - The Snapping on / off row switches through object snap's controller,\n"
        "//   28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__.js (TrueVision's\n"
        "//   import line), so it echoes \"<Osnap on>\" / \"<Osnap off>\" as F3 does.\n"
        "//   One import line; no other change.\n"
        "//\n"
        "// 18-Sep-2026 - Version 1.2.0\n", 'ctxmenu log')
    return data


def edit_modectl(data):
    data = once(data,
        "    import { Na__LeOsnap__Clear } from '../30__System__SheetTools/Na__LayoutEditor__Snapping__.js';\n",
        "    import { Na__LeOsnap__Clear } from '../28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Search__.js';\n",
        'modectl import')
    data = once(data,
        "//   - Na__LeOsnap__Clear comes from 30__System__SheetTools/Na__LayoutEditor__Snapping__.js until\n"
        "//     object snap moves to 28__System__ObjectSnap.\n", "", 'modectl divergence')
    data = once(data,
        "// DEVELOPMENT LOG:\n// 02-Oct-2026 - Version 1.18.4 (the drawing tabs' keyboard, v2.71.3)\n",
        "// DEVELOPMENT LOG:\n"
        "// 02-Oct-2026 - Version 1.18.5 (object snap's own folder, {{VVREL:W2-19}})\n"
        "// - Na__LeOsnap__Clear comes from\n"
        "//   28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Search__.js, TrueVision's\n"
        "//   import line: leaving the editor drops object snap's indexes and its\n"
        "//   marker, as before. The PORT NOTE's divergence for it is gone.\n"
        "//\n"
        "// 02-Oct-2026 - Version 1.18.4 (the drawing tabs' keyboard, v2.71.3)\n", 'modectl log')
    return data


EDITS = {'snapping': edit_snapping, 'paper': edit_paper, 'loader': edit_loader, 'keyboard': edit_keyboard,
         'toolbar': edit_toolbar, 'ctxmenu': edit_ctxmenu, 'modectl': edit_modectl}


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--apply'
    if mode == '--backup':
        assert not os.path.exists(BEFORE), 'backup exists already'
        os.makedirs(BEFORE)
        for key, rel in FILES.items():
            shutil.copyfile(os.path.join(LE, rel), os.path.join(BEFORE, os.path.basename(rel)))
            print('BACKUP', rel)
        return
    if mode == '--restore':
        for key, rel in FILES.items():
            shutil.copyfile(os.path.join(BEFORE, os.path.basename(rel)), os.path.join(LE, rel))
            print('RESTORED', rel)
        return
    # Build every file first; write only when all seven built (land nothing partial).
    out = {}
    for key, rel in FILES.items():
        live = open(os.path.join(LE, rel), 'rb').read()
        before = open(os.path.join(BEFORE, os.path.basename(rel)), 'rb').read()
        assert live == before, rel + ' changed since the backup'
        assert b'\r\n' in live and live.count(b'\n') == live.count(b'\r\n'), rel + ' is not pure CRLF'
        new = EDITS[key](live)
        assert new.count(b'\n') == new.count(b'\r\n'), rel + ' lost its CRLF'
        out[rel] = new
    if mode == '--dry':
        for rel, new in out.items():
            print('DRY', rel, len(new))
        return
    for rel, new in out.items():
        with open(os.path.join(LE, rel), 'wb') as fh:
            fh.write(new)
        print('WROTE', rel, len(new))


if __name__ == '__main__':
    main()
