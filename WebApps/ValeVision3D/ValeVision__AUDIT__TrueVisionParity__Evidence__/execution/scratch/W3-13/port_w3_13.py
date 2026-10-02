"""W3-13: take TV Panel__Layers 1.3.0 and ScrapbookParametric__ViewportLink 1.5.1 whole (at b2aa9151) and
re-apply only the VV seams: banner (H1), console prefix (C1), PORT NOTE (H5).

  python port_w3_13.py --stage    build staged/<name> from tv/<name> (asserts each replacement exactly once)
  python port_w3_13.py --apply    write staged files to the live tree (asserts the live file still equals backup/)
  python port_w3_13.py --restore  put backup/ back (refuses if the live file is not the staged file)
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/'
LE = '02__Src__AppModules/51__System__LayoutEditor/'
LAYERS = LE + '40__Ui__Panels/Na__LayoutEditor__Panel__Layers__.js'
LINK = LE + '57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__ViewportLink__.js'

LAYERS_TV_NOTE = """// PORT NOTE:
// - Ported from   : ValeVision3D 51__System__LayoutEditor/Na__LayoutEditor__Panel__Layers__.js
// - Ported on     : 10-Sep-2026 for TrueVision3D v2.21.0 (re-alignment)
// - Parity        : verbatim; v1.1.0 authored here first and ported to ValeVision on 13-Sep-2026
// - Divergences   : Console prefix, header and folder numbers only.
// - Back-port     : n/a (this IS the back-port)
"""

LAYERS_VV_NOTE = """// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0, port Phase 5, after Lantern Designer
//                   30__System__DrawingEditorMode's layer panel); TrueVision3D took it for v2.21.0
//                   (10-Sep-2026) and authored 1.1.0 to 1.3.0. This app's copy took 1.1.0 back on
//                   13-Sep-2026, then its own 1.1.1 and 1.1.2 (TrueVision's 1.1.1 labels and the Off
//                   half of 1.3.0, hunk replay, ValeVision3D v2.71.4); since ported back whole from
//                   TrueVision3D 1.3.0 (HEAD b2aa9151)
// - Source version: 1.3.0 (TrueVision3D v2.154.0, 23-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-13}} - whole: the Ref switch (1.2.0,
//                   v2.123.0: its button, handler, words and the list's note) and Ref's share of the
//                   one red (1.3.0, v2.154.0). Releases Adam has not confirmed in TrueVision are named
//                   in the Port Record (DR-01 (c)).
// - Parity        : verbatim - TrueVision's file; the banner and this note are the only differences.
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
"""

LINK_TV_NOTE = """// PORT NOTE:
// - Authored in   : TrueVision3D first (19-Sep-2026)
// - ValeVision    : 1.2.0 ported 20-Sep-2026 as ValeVision3D v2.68.0, verbatim
// - Ahead of it   : 1.3.0 (ViewLevel) is TrueVision only. ValeVision holds
//                   1.2.0 and its floor plans have no storey field.
"""

LINK_VV_NOTE = """// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__ViewportLink__.js
// - Source version: 1.5.1 (TrueVision3D v2.138.0, 21-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W3-13}}, the whole 1.5.1 file: Nearest leaves
//                   out a viewport on a reference layer (1.5.0, v2.123.0) and DistanceTo measures to
//                   the frame as it stands through the ViewportRotation leaf (1.5.1, v2.138.0). This
//                   app's copy before it was 1.4.0 (ValeVision3D v2.71.4; its first copy, 1.0.0, was
//                   TrueVision's 1.2.0 at v2.68.0, 20-Sep-2026). Neither release is confirmed by Adam
//                   in TrueVision: ported under DR-01 (c) and named.
// - Parity        : verbatim - TrueVision's file; the banner, the console prefix and this note are
//                   the only differences.
// - Divergences   :
//   - Banner and console prefix read ValeVision3D.
// - Legacy        : TrueVision's DEVELOPMENT LOG, taken verbatim (DR-34), carries two 1.3.0 entries
//                   (20-Sep-2026 ViewLevel above 21-Sep-2026 linkable) - TrueVision's own numbering,
//                   kept as written.
// - Back-port     : none.
"""

PLAN = {
    LAYERS: [
        ('// TRUEVISION3D - LAYOUT EDITOR - PANEL: LAYERS\n', '// VALEVISION3D - LAYOUT EDITOR - PANEL: LAYERS\n', 1),
        (LAYERS_TV_NOTE, LAYERS_VV_NOTE, 1),
    ],
    LINK: [
        ('// TRUEVISION3D - LAYOUT EDITOR - PARAMETRIC SCRAPBOOK - VIEWPORT LINK\n',
         '// VALEVISION3D - LAYOUT EDITOR - PARAMETRIC SCRAPBOOK - VIEWPORT LINK\n', 1),
        (LINK_TV_NOTE, LINK_VV_NOTE, 1),
        ("'[TrueVision3D LayoutEditor] ", "'[ValeVision3D LayoutEditor] ", 3),
    ],
}


def path(kind, rel):
    return os.path.join(HERE, kind, os.path.basename(rel))


def read(p):
    with open(p, 'rb') as f:
        return f.read()


def stage():
    os.makedirs(os.path.join(HERE, 'staged'), exist_ok=True)
    for rel, reps in PLAN.items():
        data = read(path('tv', rel))
        assert b'\r' not in data, rel
        text = data.decode('utf-8')
        for old, new, n in reps:
            c = text.count(old)
            assert c == n, (rel, old[:60], c, n)
            text = text.replace(old, new)
        for bad in ('TRUEVISION3D', '[TrueVision3D', 'NaProjectPortal', '/na-apps/'):
            assert bad not in text, (rel, bad)
        with open(path('staged', rel), 'wb') as f:
            f.write(text.encode('utf-8'))
        print('staged', len(text), os.path.basename(rel))


def apply():
    for rel in PLAN:
        live = os.path.join(VV, rel)
        assert read(live) == read(path('backup', rel)), 'live file changed since backup: ' + rel
    for rel in PLAN:
        with open(os.path.join(VV, rel), 'wb') as f:
            f.write(read(path('staged', rel)))
        print('applied', os.path.basename(rel))


def restore():
    for rel in PLAN:
        live = os.path.join(VV, rel)
        assert read(live) == read(path('staged', rel)), 'live file is not this package\'s landing: ' + rel
        with open(live, 'wb') as f:
            f.write(read(path('backup', rel)))
        print('restored', os.path.basename(rel))


if __name__ == '__main__':
    {'--stage': stage, '--apply': apply, '--restore': restore}[sys.argv[1]]()
