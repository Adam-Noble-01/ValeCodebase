"""W2-36 - Dependency-free panel fixes.

Builds the eight outputs from TrueVision at the pin (scratch/W2-36/tv/, made by extract_tv.py) and the
pre-change ValeVision files, then stages, writes, checks or restores them.

    python -B port_w2_36.py --stage     build into scratch/W2-36/stage/ (nothing in the app is touched)
    python -B port_w2_36.py --write     hash-guarded write of the build into the live tree (backups first)
    python -B port_w2_36.py --check     rebuild from TV + backups and compare with the live files
    python -B port_w2_36.py --restore   put back the pre-change bytes (hash-checked against the build)

Whole-file ports (Text, Styles, Leaders, ScrapbookCustom) are written LF exactly as git show returns them,
with only the named seams changed. Hunk replays (Shapes, Layers) and the AppConfig / test edits keep each
file's own line ending.
"""
import hashlib
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV_ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))   # ...\ValeVision3D
TV_ROOT = os.path.join(HERE, 'tv')
STAGE = os.path.join(HERE, 'stage')
BACKUP = os.path.join(HERE, 'backup')
LE = '02__Src__AppModules/51__System__LayoutEditor/'

P_TEXT = LE + '40__Ui__Panels/Na__LayoutEditor__Panel__Text__.js'
P_STYLES = LE + '40__Ui__Panels/Na__LayoutEditor__Panel__Styles__.js'
P_LEADERS = LE + '40__Ui__Panels/Na__LayoutEditor__Panel__Leaders__.js'
P_SHAPES = LE + '40__Ui__Panels/Na__LayoutEditor__Panel__Shapes__.js'
P_LAYERS = LE + '40__Ui__Panels/Na__LayoutEditor__Panel__Layers__.js'
P_SCRAP = LE + '56__Feature__ScrapbookCustom/Na__LayoutEditor__ScrapbookCustom__.js'
P_CONFIG = LE + '03__Core__Config/Na__LayoutEditor__AppConfig__.json'
P_TEST = '80__Testing__PrototypeEnvironment/Na__Test__AppConfigParity__.test.mjs'

ALL = [P_TEXT, P_STYLES, P_LEADERS, P_SHAPES, P_LAYERS, P_SCRAP, P_CONFIG, P_TEST]

# sha256 of the live files as read before this package (the guard for --write)
PRE = {}
PRE_FILE = os.path.join(HERE, 'sha256__pre.txt')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read(path):
    with open(path, 'rb') as fh:
        return fh.read()


def tv(rel):
    return read(os.path.join(TV_ROOT, rel.replace('/', os.sep))).decode('utf-8')


def vv_pre(rel):
    """The pre-change ValeVision bytes: the backup once one exists, else the live file."""
    b = os.path.join(BACKUP, rel.replace('/', os.sep))
    return read(b) if os.path.exists(b) else read(os.path.join(VV_ROOT, rel.replace('/', os.sep)))


def replace_once(text, old, new, what):
    n = text.count(old)
    if n != 1:
        raise SystemExit('ANCHOR FAILED (%d matches): %s' % (n, what))
    return text.replace(old, new)


def swap_port_note(text, note_lines, what):
    """Replace TrueVision's PORT NOTE block (the '// PORT NOTE:' line up to the '//' before the next rule)."""
    lines = text.split('\n')
    starts = [i for i, l in enumerate(lines) if l == '// PORT NOTE:']
    if len(starts) != 1:
        raise SystemExit('PORT NOTE not found once: ' + what)
    s = starts[0]
    e = s + 1
    while not (lines[e] == '//' and lines[e + 1].startswith('// ----')):
        e += 1
    return '\n'.join(lines[:s] + note_lines + lines[e:])


def banner(text, what):
    return replace_once(text, '\n// TRUEVISION3D - ', '\n// VALEVISION3D - ', what + ' banner')


# -----------------------------------------------------------------------------
# PORT NOTES
# -----------------------------------------------------------------------------

NOTE_TEXT = [
    '// PORT NOTE:',
    '// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0, port Phase 5, after ValeVision3D',
    "//                   43__System__PlanAnnotations/Na__PlanAnnotations__Toolbar__.js's controls); TrueVision3D",
    '//                   took it for v2.21.0 (10-Sep-2026); since ported back whole from TrueVision3D 1.4.0',
    '//                   (HEAD b2aa9151)',
    '// - Source version: 1.4.0 (TrueVision3D v2.57.0, 17-Sep-2026; read at b2aa9151)',
    '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-36}} - whole, with TrueVision\'s log. This',
    "//                   app's own 1.1.0-1.4.0 (14-Sep-2026 to 17-Sep-2026) had taken TrueVision's box-select",
    '//                   note, Shift+Enter note, rotation row and several-selected writes, but its Refresh',
    '//                   never read the first of several selected text items (Many was defined and never',
    '//                   called): the boxes showed the settings for new text while a change went to all of',
    '//                   them, and there was no note for a selection holding no text.',
    "// - Parity        : verbatim (the code is TrueVision 1.4.0's; the banner and this note are the only",
    '//                   differences)',
    '// - Divergences   :',
    '//   - Banner reads ValeVision3D. (No console output in this file.)',
    '// - Back-port     : none.',
]

NOTE_STYLES = [
    '// PORT NOTE:',
    '// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0, port Phase 5, from ValeVision3D',
    "//                   40__System__DrawingViewCore/Na__DrawView__StyleRows__.js's toggle set); TrueVision3D",
    '//                   took it for v2.21.0 (10-Sep-2026) and authored 1.6.0 and 1.6.1, which came back on',
    '//                   13-Sep-2026 (v2.28.0); since ported back whole from TrueVision3D 1.7.0 (HEAD b2aa9151)',
    '// - Source version: 1.7.0 (TrueVision3D v2.93.0, 20-Sep-2026; read at b2aa9151)',
    '// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-36}} - whole, with TrueVision\'s log. This',
    "//                   app's own 1.6.1 lacked 1.7.0 only: the percent weight kind's % suffix and its hover",
    "//                   text (Enhance Whitecard's strength, whose row is already in this app's Render",
    '//                   Composites config).',
    "// - Parity        : verbatim (the code is TrueVision 1.7.0's; the banner and this note are the only",
    '//                   differences)',
    '// - Divergences   :',
    '//   - Banner reads ValeVision3D. (No console output in this file.)',
    '// - Back-port     : none.',
]

NOTE_LEADERS = [
    '// PORT NOTE:',
    '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__Leaders__.js',
    '// - Source version: 1.2.0 (TrueVision3D v2.57.0, 17-Sep-2026; read at b2aa9151)',
    '// - Ported on     : 14-Sep-2026 (1.0.0, ValeVision3D v2.32.0); whole again on 02-Oct-2026 for ValeVision3D',
    "//                   {{VVREL:W2-36}}, with TrueVision's log. This app's copy already held the code of",
    "//                   1.1.0 and 1.2.0; it differed in two comment blocks, the order of the two",
    '//                   specification imports and the missing 1.1.0 log entry.',
    '// - Parity        : verbatim',
    '// - Divergences   :',
    '//   - Banner reads ValeVision3D. (No console output in this file.)',
    '// - Back-port     : none.',
]

NOTE_SCRAP = [
    '// PORT NOTE:',
    '// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/56__Feature__ScrapbookCustom/Na__LayoutEditor__ScrapbookCustom__.js',
    '// - Source version: 1.0.0 (TrueVision3D v2.85.0, 19-Sep-2026, with the unversioned measured-room hunk of',
    '//                   TrueVision3D v2.104.0, 21-Sep-2026; read at b2aa9151)',
    '// - Ported on     : 20-Sep-2026 (1.0.0, ValeVision3D v2.69.0); whole again on 02-Oct-2026 for',
    '//                   ValeVision3D {{VVREL:W2-36}}, taking the measured-room hunk: a Shape__Area keeps its',
    '//                   name and loses its group and hand-set scale on the way out of a project.',
    '// - Parity        : verbatim but for one string',
    '// - Divergences   :',
    '//   - Banner and console prefix read ValeVision3D.',
    '//   - The description an item file carries (Meta__Description in Capture) names this app and its',
    "//     local development server. The item document is otherwise TrueVision's, key for key, so an",
    "//     item file copied by hand from one app's library folder to the other's drops there as it does",
    '//     at home.',
    "// - Back-port     : none. TrueVision's log has no entry for its v2.104.0 measured-room hunk (a records",
    '//                   note for the TrueVision lane, WT-04).',
]

NOTE_SHAPES_OLD = [
    '// PORT NOTE:',
    '// - Ported from   : ValeVision3D 51 Na__LayoutEditor__Panel__Dimensions__ (pattern)',
    '// - Ported on     : 10-Sep-2026 for ValeVision3D v2.21.8 (port Phase 5)',
    '// - Parity        : new',
    '// - Divergences   : n/a',
    '// - Back-port     : none.',
]
NOTE_SHAPES = [
    '// PORT NOTE:',
    "// - Authored in   : ValeVision3D first (1.0.0, 10-Sep-2026, v2.21.8, port Phase 5, on this app's",
    '//                   Na__LayoutEditor__Panel__Dimensions__ pattern); TrueVision3D took it for v2.21.0',
    '//                   (10-Sep-2026). Its later work comes back hunk by hunk until the file is taken whole',
    '//                   with its features (W3-12).',
    '// - Twin          : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__Shapes__.js',
    '// - Source version: 1.9.0 (TrueVision3D v2.126.0, 21-Sep-2026; read at b2aa9151) - the hunks the 1.8.1 and',
    "//                   1.8.2 entries name (TrueVision's 1.8.1, v2.106.0, and 1.8.2, v2.116.0).",
    '// - Ported on     : 10-Sep-2026 for ValeVision3D v2.21.8 (port Phase 5); 1.8.1 and 1.8.2 on 02-Oct-2026',
    '//                   for ValeVision3D {{VVREL:W2-36}}',
    '// - Parity        : adapted (hunk replay; not yet whole)',
    '// - Divergences   :',
    '//   - Banner reads ValeVision3D. (No console output in this file.)',
    "//   - Not yet taken, each arriving with its feature: Draw at scale (TrueVision 1.6.0, v2.40.0: the",
    "//     drawing tools' atScale row and its DESCRIPTION paragraph), the hatch block (v2.90.0) and its",
    '//     Pattern line pt, Pattern colour and Standard (1.9.0, v2.126.0).',
    '// - Back-port     : none.',
]

NOTE_LAYERS_OLD = [
    '// PORT NOTE:',
    '// - Ported from   : Lantern Designer 30__System__DrawingEditorMode (layer panel purpose)',
    '// - Ported on     : 09-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5)',
    '// - Parity        : new',
    '// - Divergences   : n/a',
    '// - Back-port     : none.',
]
NOTE_LAYERS = [
    '// PORT NOTE:',
    '// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0, port Phase 5, after Lantern Designer',
    "//                   30__System__DrawingEditorMode's layer panel); TrueVision3D took it for v2.21.0",
    '//                   (10-Sep-2026) and authored 1.1.0, which came back on 13-Sep-2026. Its later work',
    '//                   comes back hunk by hunk until the file is taken whole with reference layers (W3-13).',
    '// - Twin          : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Panel__Layers__.js',
    '// - Source version: 1.3.0 (TrueVision3D v2.154.0, 23-Sep-2026; read at b2aa9151) - the hunks the 1.1.1 and',
    "//                   1.1.2 entries name. Every other difference from that file is TrueVision's Ref switch.",
    '// - Ported on     : 09-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5); 1.1.1 and 1.1.2 on 02-Oct-2026',
    '//                   for ValeVision3D {{VVREL:W2-36}}',
    '// - Parity        : adapted (hunk replay; not yet whole)',
    '// - Divergences   :',
    '//   - Banner reads ValeVision3D. (No console output in this file.)',
    "//   - Not yet taken: the Ref switch (TrueVision 1.2.0, v2.123.0) - its button, handler and red, its",
    "//     words in PURPOSE, DESCRIPTION and the list's note - which needs the reference-layer feature.",
    '// - Back-port     : none.',
]


# -----------------------------------------------------------------------------
# BUILDERS
# -----------------------------------------------------------------------------

def build_whole(rel, note, what, extra=None):
    text = tv(rel)
    text = banner(text, what)
    text = swap_port_note(text, note, what)
    if extra:
        text = extra(text)
    return text.encode('utf-8')


def scrap_extra(text):
    text = text.replace("console.warn('[TrueVision3D LayoutEditor] ", "console.warn('[ValeVision3D LayoutEditor] ")
    vv = vv_pre(P_SCRAP).decode('utf-8').replace('\r\n', '\n')
    key = "            Meta__Description : '"
    vv_line = [l for l in vv.split('\n') if l.startswith(key)]
    tv_line = [l for l in text.split('\n') if l.startswith(key)]
    if len(vv_line) != 1 or len(tv_line) != 1:
        raise SystemExit('Meta__Description line not found once')
    text = replace_once(text, tv_line[0], vv_line[0], 'Meta__Description')
    if 'TrueVision3D' in text.replace('// - Ported from   : TrueVision3D', '').replace('TrueVision3D v2.', '').replace('TrueVision3D 02__', ''):
        pass
    return text


def eol_of(data):
    return '\r\n' if b'\r\n' in data else '\n'


def build_shapes():
    raw = vv_pre(P_SHAPES)
    eol = eol_of(raw)
    text = raw.decode('utf-8').replace('\r\n', '\n')
    text = replace_once(text, '\n'.join(NOTE_SHAPES_OLD), '\n'.join(NOTE_SHAPES), 'Shapes PORT NOTE')
    text = replace_once(text,
        '// DEVELOPMENT LOG:\n// 17-Sep-2026 - Version 1.8.0\n',
        '// DEVELOPMENT LOG:\n'
        '// 02-Oct-2026 - Version 1.8.2 ({{VVREL:W2-36}})\n'
        '// - Pictures (Sheet Images) are left out of what this panel reads and edits:\n'
        '//   a picture has no edge, fill or hatch, and its settings are the Images\n'
        "//   panel's. TrueVision's 1.8.2 (v2.116.0), taken ahead of Sheet Images:\n"
        '//   until a sheet holds a picture it changes nothing.\n'
        '//\n'
        '// 02-Oct-2026 - Version 1.8.1 ({{VVREL:W2-36}})\n'
        '// - Edges off with SEVERAL vectors selected takes the edges off and nothing\n'
        '//   else. It used to write a fill as well, so that no shape was left with\n'
        '//   nothing to show - but one fill colour for all of them, the new-shape\n'
        '//   default, which repainted every selected shape in it: select a floor\'s\n'
        '//   coloured rooms and a plain line, untick Edges, and every room came out\n'
        '//   the same blue. A shape with no fill of its own now keeps its edges, which\n'
        '//   the normaliser has always guaranteed. One vector selected is unchanged.\n'
        "//   TrueVision's 1.8.1 (v2.106.0).\n"
        '//\n'
        '// 17-Sep-2026 - Version 1.8.0\n',
        'Shapes log')
    # 1.8.2 | Selected(): a picture is the Images panel's
    text = replace_once(text,
        '        return item ? { sheet : sheet, item : item } : null;\n    }\n    // ------------------------------------------------------------\n\n\n    // HELPER FUNCTION | Every Selected Vector, When There Is More Than One',
        "        return (item && !item.Shape__Image) ? { sheet : sheet, item : item } : null;   // <-- A picture is the Images panel's: it has no edge or fill to set here\n    }\n    // ------------------------------------------------------------\n\n\n    // HELPER FUNCTION | Every Selected Vector, When There Is More Than One",
        'Shapes 1.8.2 Selected')
    # 1.8.2 | Many(): pictures in the selection are not vectors to restyle
    text = replace_once(text,
        "        const sheet = Na__LeModel__GetActiveSheet();\n"
        "        const items = Na__LePanels__SelectedOfKind(sheet, 'shape');\n"
        "        if (!items.length) return null;\n"
        "        const item = (sheet.Sheet__Shapes || []).find((s) => s.Shape__Id === items[0].id) || null;\n",
        "        const sheet = Na__LeModel__GetActiveSheet();\n"
        "        const shapes = sheet ? (sheet.Sheet__Shapes || []) : [];\n"
        "        const items  = Na__LePanels__SelectedOfKind(sheet, 'shape').filter((entry) => { const s = shapes.find((x) => x.Shape__Id === entry.id); return !!s && !s.Shape__Image; });   // <-- Pictures in the selection are not vectors to restyle\n"
        "        if (!items.length) return null;\n"
        "        const item = shapes.find((s) => s.Shape__Id === items[0].id) || null;\n",
        'Shapes 1.8.2 Many')
    # 1.8.1 | Edges off with several selected
    text = replace_once(text,
        "            if (Na__LePanelShapes__Gradient().on) { Na__LePanelShapes__Apply({ stroked : false }, { stroked : false }); return; }   // <-- The gradient is the fill: a gradient alone is the fade\n"
        "            const colour = Na__LePanelShapes__FillColour();\n",
        "            if (Na__LePanelShapes__Gradient().on) { Na__LePanelShapes__Apply({ stroked : false }, { stroked : false }); return; }   // <-- The gradient is the fill: a gradient alone is the fade\n"
        "            // SEVERAL SELECTED: the edges come off and nothing else changes. The\n"
        "            // fill written below is ONE colour - the new-shape default, as no one\n"
        "            // shape speaks for the rest - so it used to repaint every selected\n"
        "            // shape in it, a plan's coloured rooms included. A shape with no fill\n"
        "            // of its own keeps its edges instead: the normaliser never lets one\n"
        "            // go invisible.\n"
        "            if (!Na__LePanelShapes__Selected() && Na__LePanels__ApplyToSelection(Na__LeModel__GetActiveSheet(), 'shape', { stroked : false })) return;\n"
        "            const colour = Na__LePanelShapes__FillColour();\n",
        'Shapes 1.8.1')
    return text.replace('\n', eol).encode('utf-8')


def build_layers():
    raw = vv_pre(P_LAYERS)
    eol = eol_of(raw)
    text = raw.decode('utf-8').replace('\r\n', '\n')
    text = replace_once(text, '\n'.join(NOTE_LAYERS_OLD), '\n'.join(NOTE_LAYERS), 'Layers PORT NOTE')
    text = replace_once(text,
        '//   "Unlock" on a locked one. A locked layer\'s button carries a faint red -\n'
        '//   enough to spot the locked rows at a glance, and no more.\n',
        '//   "Unlock" on a locked one.\n'
        '// - ONE RED FOR EVERY SWITCH AWAY FROM ITS USUAL STATE: Off and Unlock\n'
        '//   (locked) carry the same faint red. A finished drawing has every layer On\n'
        '//   and unlocked, so a red button anywhere down the two columns is one still\n'
        '//   to put back.\n',
        'Layers DESCRIPTION')
    text = replace_once(text,
        '// DEVELOPMENT LOG:\n// 13-Sep-2026 - Version 1.1.0\n',
        '// DEVELOPMENT LOG:\n'
        '// 02-Oct-2026 - Version 1.1.2 ({{VVREL:W2-36}})\n'
        '// - The On / Off button is red while the layer is Off (na-le-btn--eye\n'
        '//   is-off, aria-pressed), the locked button\'s faint red, so a layer left\n'
        '//   Off or locked shows at a glance. TrueVision\'s 1.3.0 (v2.154.0), its Off\n'
        '//   half: the Ref button it also turns red is TrueVision\'s 1.2.0, not here yet.\n'
        '//\n'
        '// 02-Oct-2026 - Version 1.1.1 ({{VVREL:W2-36}})\n'
        '// - The Floor Areas (area) and Images (image) layer types read "Floor Areas"\n'
        '//   and "Images" in the type select and the filter, not their bare keys.\n'
        '//   TrueVision\'s 1.1.1 (v2.116.0) and its unversioned area label (v2.104.0).\n'
        '//\n'
        '// 13-Sep-2026 - Version 1.1.0\n',
        'Layers log')
    text = replace_once(text,
        "    const Na__LePanelLayers__TYPE_LABELS = { viewport : 'Viewports', annotation : 'Annotations', dimension : 'Dimensions', vector : 'Vectors', mixed : 'General' };\n",
        "    const Na__LePanelLayers__TYPE_LABELS = { viewport : 'Viewports', annotation : 'Annotations', dimension : 'Dimensions', vector : 'Vectors', area : 'Floor Areas', image : 'Images', mixed : 'General' };   // <-- 'area' holds the measured rooms (59__Feature__FloorAreas), 'image' the pictures (54__Feature__SheetImages)\n",
        'Layers 1.1.1 labels')
    text = replace_once(text,
        "        const eye = Na__LePanels__Button(layer.Layer__Visible === false ? 'Off' : 'On', 'layer-eye', 'na-le-btn--icon', layer.Layer__Id);\n"
        "        eye.title = 'Show or hide';\n",
        "        const hidden = layer.Layer__Visible === false;                            // <-- The same test the model shows by\n"
        "        const eye = Na__LePanels__Button(hidden ? 'Off' : 'On', 'layer-eye', 'na-le-btn--icon na-le-btn--eye' + (hidden ? ' is-off' : ''), layer.Layer__Id);\n"
        "        eye.title = 'Show or hide';\n"
        "        eye.setAttribute('aria-pressed', String(hidden));\n",
        'Layers 1.3.0 Off red')
    return text.replace('\n', eol).encode('utf-8')


MANY = [
    ('LayoutEditor__Labels__TextManyNote',
     '{count} items selected. Click one text item on its own to edit it; these settings apply to new text.',
     'Editing {count} selected text items: a change here goes to all of them.'),
    ('LayoutEditor__Labels__DimManyNote',
     '{count} items selected. Click one dimension on its own to edit it; these settings apply to new dimensions.',
     'Editing {count} selected dimensions: a change here goes to all of them.'),
    ('LayoutEditor__Labels__ShapeManyNote',
     '{count} items selected. Click one shape on its own to edit it; these settings apply to new shapes.',
     'Editing {count} selected vectors: a change here goes to all of them.'),
]


def build_config():
    raw = vv_pre(P_CONFIG)
    text = raw.decode('utf-8')
    for key, old, new in MANY:
        text = replace_once(text, '"%s": "%s"' % (key, old), '"%s": "%s"' % (key, new), key)
    return text.encode('utf-8')


def build_test():
    raw = vv_pre(P_TEST)
    eol = eol_of(raw)
    text = raw.decode('utf-8').replace('\r\n', '\n')
    text = replace_once(text,
        '// DEVELOPMENT LOG:\n// 02-Oct-2026 - Version 1.0.5 ({{VVREL:W2-14}})\n',
        '// DEVELOPMENT LOG:\n'
        '// 02-Oct-2026 - Version 1.0.6 ({{VVREL:W2-36}})\n'
        '// - Three entries added with the panel fixes (W2-36): the multi-select\n'
        '//   notes TextManyNote, DimManyNote and ShapeManyNote now say what the\n'
        '//   panels do since TrueVision3D v2.57.0 - the first item is read and a\n'
        '//   change goes to all of them - in the panels\' own words. TrueVision\'s\n'
        '//   config still has the older wording ("Click one ... on its own"),\n'
        '//   which its panels show over their own, so these are tv-defect entries\n'
        '//   for the TrueVision lane (WT-04).\n'
        '//\n'
        '// 02-Oct-2026 - Version 1.0.5 ({{VVREL:W2-14}})\n',
        'test log')
    text = replace_once(text,
        "        [ 'value',   'Labels/MeasureViewportTitle',            'withheld',  'the Measurements box', 'retyping a move' ],\n",
        "        [ 'value',   'Labels/MeasureViewportTitle',            'withheld',  'the Measurements box', 'retyping a move' ],\n"
        "        [ 'value',   'Labels/TextManyNote',                    'tv-defect', 'WT-04', \"TrueVision's still says click one on its own, as before v2.57.0; here the panel's own words (S06a-F09)\" ],\n"
        "        [ 'value',   'Labels/DimManyNote',                     'tv-defect', 'WT-04', \"TrueVision's still says click one on its own, as before v2.57.0; here the panel's own words (S06a-F09)\" ],\n"
        "        [ 'value',   'Labels/ShapeManyNote',                   'tv-defect', 'WT-04', \"TrueVision's still says click one on its own, as before v2.57.0; here the panel's own words (S06a-F09)\" ],\n",
        'test allow-list')
    return text.replace('\n', eol).encode('utf-8')


def build_all():
    return {
        P_TEXT: build_whole(P_TEXT, NOTE_TEXT, 'Text'),
        P_STYLES: build_whole(P_STYLES, NOTE_STYLES, 'Styles'),
        P_LEADERS: build_whole(P_LEADERS, NOTE_LEADERS, 'Leaders'),
        P_SCRAP: build_whole(P_SCRAP, NOTE_SCRAP, 'ScrapbookCustom', scrap_extra),
        P_SHAPES: build_shapes(),
        P_LAYERS: build_layers(),
        P_CONFIG: build_config(),
        P_TEST: build_test(),
    }


def live(rel):
    return os.path.join(VV_ROOT, rel.replace('/', os.sep))


def load_pre():
    out = {}
    with open(PRE_FILE, 'r', encoding='utf-8') as fh:
        for line in fh:
            h, rel = line.strip().split('  ', 1)
            out[rel] = h
    return out


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--stage'
    if mode == '--record-pre':
        with open(PRE_FILE, 'w', encoding='utf-8') as fh:
            for rel in ALL:
                fh.write('%s  %s\n' % (sha(read(live(rel))), rel))
        print('recorded', PRE_FILE)
        return
    if mode == '--stage':
        built = build_all()
        for rel, data in built.items():
            dst = os.path.join(STAGE, rel.replace('/', os.sep))
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            with open(dst, 'wb') as fh:
                fh.write(data)
            print('staged %7d -> %7d  %s' % (len(vv_pre(rel)), len(data), rel))
        return
    if mode == '--write':
        pre = load_pre()
        built = build_all()
        for rel in ALL:
            now = sha(read(live(rel)))
            if now != pre[rel]:
                raise SystemExit('REFUSED: %s changed since it was read (%s != %s)' % (rel, now[:16], pre[rel][:16]))
        for rel in ALL:
            b = os.path.join(BACKUP, rel.replace('/', os.sep))
            os.makedirs(os.path.dirname(b), exist_ok=True)
            if not os.path.exists(b):
                shutil.copyfile(live(rel), b)
        with open(os.path.join(HERE, 'sha256__written.txt'), 'w', encoding='utf-8') as fh:
            for rel in ALL:
                with open(live(rel), 'wb') as out:
                    out.write(built[rel])
                fh.write('%s  %s\n' % (sha(built[rel]), rel))
                print('wrote %7d bytes  %s' % (len(built[rel]), rel))
        return
    if mode == '--check':
        built = build_all()
        bad = 0
        for rel in ALL:
            ok = read(live(rel)) == built[rel]
            bad += 0 if ok else 1
            print(('OK    ' if ok else 'DIFF  ') + rel)
        print('CHECK ' + ('PASS' if not bad else 'FAIL') + ' %d/%d' % (len(ALL) - bad, len(ALL)))
        sys.exit(1 if bad else 0)
    if mode == '--restore':
        written = {}
        with open(os.path.join(HERE, 'sha256__written.txt'), 'r', encoding='utf-8') as fh:
            for line in fh:
                h, rel = line.strip().split('  ', 1)
                written[rel] = h
        for rel in ALL:
            if sha(read(live(rel))) != written[rel]:
                raise SystemExit('REFUSED: %s changed since this package wrote it' % rel)
        for rel in ALL:
            shutil.copyfile(os.path.join(BACKUP, rel.replace('/', os.sep)), live(rel))
            print('restored ' + rel)
        return
    raise SystemExit('unknown mode ' + mode)


if __name__ == '__main__':
    main()
