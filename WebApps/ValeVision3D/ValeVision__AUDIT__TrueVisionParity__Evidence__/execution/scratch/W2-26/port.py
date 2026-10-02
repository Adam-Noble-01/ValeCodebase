# W2-26 port: take the four TrueVision drawing tools whole (pin b2aa9151) and re-apply the VV seams:
# banner (K2 H1), PORT NOTE (K2 H5) in place of TrueVision's, and - DimensionTool only - a 1.13.0 log
# entry for the v2.152.0 create hunk TrueVision's module log does not record (package vv_adaptations).
# Writes LF, TrueVision's text as git show returns it (policy 7).
import pathlib, re, sys

HERE = pathlib.Path(__file__).parent
VV = pathlib.Path(r'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools')
TOKEN = '{' + '{VVREL:W2-26}' + '}'

NOTES = {
'DimensionTool': [
"// PORT NOTE:",
"// - Authored in   : ValeVision3D first (1.0.0, 10-Sep-2026, v2.21.8, port Phase 5: the two-click placement",
"//                   split out of Na__LayoutEditor__SheetTools__ 1.3.0); TrueVision3D took it whole on",
"//                   10-Sep-2026 (its v2.21.0) and grew it to 1.12.0; since ported back whole from",
"//                   TrueVision3D 1.12.0 (HEAD b2aa9151)",
"// - Source version: 1.12.0 (TrueVision3D v2.139.0, 21-Sep-2026; read at b2aa9151), with the create hunk of",
"//                   TrueVision3D v2.152.0 (23-Sep-2026) that TrueVision's module log does not record",
"// - Ported on     : 02-Oct-2026 for ValeVision3D " + TOKEN + " - whole, with TrueVision's log. This app's",
"//                   copy was its 1.5.0 (14-Sep-2026): TrueVision 1.1.0, 1.2.0 and 1.5.0-1.7.0, with 1.3.0's",
"//                   typed distances but not its atScale. It now takes atScale on create (1.3.0, v2.40.0),",
"//                   the extension-line fields (1.4.0, v2.41.0), Ortho XOR Shift (1.8.0, v2.113.0), the",
"//                   line on the drawing grid (1.9.0, v2.114.0), no inference onto a reference layer",
"//                   (1.10.0, v2.123.0), Object Snap with targets and options.from (1.11.0, v2.129.0), Round",
"//                   up (1.12.0, v2.139.0) and Line pt / Dashed lines on create (v2.152.0, logged below as",
"//                   1.13.0). None of those TrueVision releases is confirmed by Adam in TrueVision; they come",
"//                   across under DR-01 (c) and are named so.",
"// - Parity        : verbatim",
"// - Divergences   :",
"//   - Banner reads ValeVision3D. (No console output in this file.)",
"//   - The DEVELOPMENT LOG has a 1.13.0 entry TrueVision's has not: its v2.152.0 hunk (linePt and dash",
"//     on a new dimension) is in TrueVision's code but not in its module log. The code is TrueVision's.",
"// - Back-port     : offered, not made (DR-36): TrueVision's log could take the same 1.13.0 entry, and its",
"//                   DESCRIPTION still calls the markers orange, the dimension tone, which 1.11.0 retired.",
"//",
],
'RectangleTool': [
"// PORT NOTE:",
"// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools/Na__LayoutEditor__RectangleTool__.js",
"// - Source version: 1.4.0 (TrueVision3D v2.143.0, 22-Sep-2026; read at b2aa9151)",
"// - Ported on     : 02-Oct-2026 for ValeVision3D " + TOKEN + " - whole, with TrueVision's log. This app's",
"//                   copy was its 1.2.0 (14-Sep-2026; 1.0.0 ported 13-Sep-2026 for ValeVision3D v2.25.0,",
"//                   then TrueVision's 1.0.1-1.2.0). It now takes Object Snap (the 28 folder, in place of",
"//                   this app's 30 Snapping, TrueVision3D v2.129.0, unlogged in this module), area and",
"//                   layerId through the defaults (1.3.0, v2.104.0) and the land hook (1.4.0, v2.143.0).",
"//                   None of those TrueVision releases is confirmed by Adam in TrueVision; they come across",
"//                   under DR-01 (c) and are named so.",
"// - Parity        : verbatim",
"// - Divergences   :",
"//   - Banner reads ValeVision3D. (No console output in this file.)",
"// - Back-port     : none. A new rectangle takes no Hatch default, exactly as in TrueVision: left as it",
"//                   is there until Adam confirms the intent (DR-37 (3)).",
"//",
],
'TextTool': [
"// PORT NOTE:",
"// - Authored in   : ValeVision3D first (1.0.0, 10-Sep-2026, v2.21.8, port Phase 5: placement and inline",
"//                   editing split out of Na__LayoutEditor__SheetTools__ 1.3.0); TrueVision3D took it whole",
"//                   on 10-Sep-2026 (its v2.21.0) and grew it to 1.4.0; since ported back whole from",
"//                   TrueVision3D 1.4.0 (HEAD b2aa9151)",
"// - Source version: 1.4.0 (TrueVision3D v2.114.0, 21-Sep-2026; read at b2aa9151)",
"// - Ported on     : 02-Oct-2026 for ValeVision3D " + TOKEN + " - whole, with TrueVision's log. This app's",
"//                   copy was its 1.3.0 (15-Sep-2026), TrueVision 1.3.0's content. It now takes 1.4.0: a",
"//                   new text item lands on the drawing grid while Grid Snap is on (v2.114.0). That",
"//                   TrueVision release is not confirmed by Adam in TrueVision; it comes across under",
"//                   DR-01 (c) and is named so.",
"// - Parity        : verbatim",
"// - Divergences   :",
"//   - Banner reads ValeVision3D. (No console output in this file.)",
"// - Back-port     : none.",
"//",
],
'LeaderTool': [
"// PORT NOTE:",
"// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/35__System__DrawingTools/Na__LayoutEditor__LeaderTool__.js",
"// - Source version: 1.2.0 (TrueVision3D v2.114.0, 21-Sep-2026; read at b2aa9151)",
"// - Ported on     : 02-Oct-2026 for ValeVision3D " + TOKEN + " - whole, with TrueVision's log. This app's",
"//                   copy was its 1.0.0 (14-Sep-2026, ValeVision3D v2.32.0), which already carried 1.1.0's",
"//                   Project Specification links (TrueVision3D v2.36.0) in code without logging them. It",
"//                   now takes Object Snap (the 28 folder, in place of this app's 30 Snapping, TrueVision3D",
"//                   v2.129.0, unlogged in this module) and 1.2.0: the head follows the drawing grid while",
"//                   Grid Snap is on (v2.114.0). Neither TrueVision release is confirmed by Adam in",
"//                   TrueVision; they come across under DR-01 (c) and are named so.",
"// - Parity        : verbatim",
"// - Divergences   :",
"//   - Banner reads ValeVision3D. (No console output in this file.)",
"// - Back-port     : none.",
"//",
],
}

DIM_LOG_1130 = [
"// 23-Sep-2026 - Version 1.13.0",
"// - A new dimension carries the Dimensions panel's Line pt (linePt) and, when",
"//   its Dashed lines toggle is on, its dash (TrueVision3D v2.152.0). Logged",
"//   here by ValeVision3D: TrueVision's code has it, its module log does not.",
"//",
]

def build(name):
    tv = (HERE / f'tv_{name}.js').read_bytes()
    assert b'\r' not in tv
    lines = tv.decode('utf-8').split('\n')
    assert lines[1].startswith('// TRUEVISION3D - '), lines[1]
    lines[1] = '// VALEVISION3D - ' + lines[1][len('// TRUEVISION3D - '):]
    start = lines.index('// PORT NOTE:')
    log = lines.index('// DEVELOPMENT LOG:')
    # TrueVision's block ends with: '//', rule, '//', 'DEVELOPMENT LOG:'
    rule = log - 2
    assert re.match(r'^// -{20,}$', lines[rule]) and lines[rule - 1] == '//' and lines[log - 1] == '//', name
    new = lines[:start] + NOTES[name] + lines[rule:]
    if name == 'DimensionTool':
        log = new.index('// DEVELOPMENT LOG:')
        assert new[log + 1] == '// 21-Sep-2026 - Version 1.12.0', new[log + 1]
        new = new[:log + 1] + DIM_LOG_1130 + new[log + 1:]
    return '\n'.join(new).encode('utf-8')

def main():
    for name in NOTES:
        live = (VV / f'Na__LayoutEditor__{name}__.js').read_bytes()
        before = (HERE / f'vv_before_{name}.js').read_bytes()
        if live != before:
            print('CHANGED UNDER ME:', name); sys.exit(2)
    out = {name: build(name) for name in NOTES}
    if '--write' in sys.argv:
        for name, data in out.items():
            (VV / f'Na__LayoutEditor__{name}__.js').write_bytes(data)
            (HERE / f'vv_after_{name}.js').write_bytes(data)
            print('wrote', name, len(data))
    else:
        for name, data in out.items():
            (HERE / f'preview_{name}.js').write_bytes(data)
            print('preview', name, len(data))

main()
