"""W0-03 scratch: reflow the three new DEVELOPMENT LOG entries (wording unchanged). Exact match, count 1, file EOL kept."""
import os, sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'

EDITS = {
    '02__Src__AppModules/03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js': (
        "// - The dictionary takes TrueVision's per-tab file name,\n"
        "//   02__AppData/Na__Hotkeys__3dModelTab__.json, so only the fetch path changes. Its\n"
        "//   content is untouched: the root key stays Na__ValeVision__HotkeysDictionary\n"
        "//   and every action keeps its ValeVision__ name.\n",
        "// - The dictionary takes TrueVision's per-tab file name,\n"
        "//   02__AppData/Na__Hotkeys__3dModelTab__.json, so only the fetch\n"
        "//   path changes. Its content is untouched: the root key stays\n"
        "//   Na__ValeVision__HotkeysDictionary and every action keeps its\n"
        "//   ValeVision__ name.\n"),
    '02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__NavigationHelpPanel__Controls.js': (
        "// - Reads the Keyboard Shortcuts rows from the 3D tab's hotkey file under\n"
        "//   TrueVision's per-tab name, 02__AppData/Na__Hotkeys__3dModelTab__.json. The\n"
        "//   dictionary's content, root key and rows are unchanged.\n",
        "// - Reads the Keyboard Shortcuts rows from the 3D tab's hotkey file under\n"
        "//   TrueVision's per-tab name, 02__AppData/Na__Hotkeys__3dModelTab__.json.\n"
        "//   The dictionary's content, root key and rows are unchanged.\n"),
    '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__KeyMap__.js': (
        "// - The key file takes TrueVision's per-tab name, Na__Hotkeys__DrawingTabs__.json,\n"
        "//   so only the fetch URL changes. Its content and its\n"
        "//   LayoutEditor__KeyMappings__* keys are untouched; TrueVision's drawing-tab\n"
        "//   key content comes only with this unit at TrueVision's 1.11.0, whose When\n"
        "//   matcher keeps T on the Text tool.\n",
        "// - The key file takes TrueVision's per-tab name,\n"
        "//   Na__Hotkeys__DrawingTabs__.json, so only the fetch URL changes. Its\n"
        "//   content and its LayoutEditor__KeyMappings__* keys are untouched;\n"
        "//   TrueVision's drawing-tab key content comes only with this unit at\n"
        "//   TrueVision's 1.11.0, whose When matcher keeps T on the Text tool.\n"),
}


def main():
    out = {}
    for rel, (old, new) in EDITS.items():
        p = os.path.join(VV, rel)
        b = open(p, 'rb').read()
        crlf = b.count(b'\r\n'); lf = b.count(b'\n') - crlf
        if crlf and lf:
            print('STOP mixed EOL', rel); sys.exit(2)
        eol = b'\r\n' if crlf else b'\n'
        ob = old.encode('utf-8').replace(b'\n', eol)
        nb = new.encode('utf-8').replace(b'\n', eol)
        if b.count(ob) != 1:
            print('STOP expected 1 match in', rel, 'found', b.count(ob)); sys.exit(2)
        out[p] = b.replace(ob, nb)
    for p, nb in out.items():
        with open(p, 'wb') as fh:
            fh.write(nb)
        print('reflowed', p)


if __name__ == '__main__':
    main()
