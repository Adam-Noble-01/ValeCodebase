"""PORT NOTE blocks and the gesture-guard text W3-03 writes (imported by port_w3_03.py)."""

GUARD_RULE = '// -----------------------------------------------------------------------------\n'

# -----------------------------------------------------------------------------
# Gesture guards (DR-40 items 7-10 held; W3-04 deletes every line marked VV GUARD)
# -----------------------------------------------------------------------------

HIT_GUARD_REGION = """// -----------------------------------------------------------------------------
// REGION | ValeVision Gesture Guards (DR-40 items 7 and 9, held)
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Gestures Held Until Adam Confirms Them (ValeVision only)
    // ------------------------------------------------------------
    // VV GUARD (DR-40). TrueVision's Select picks Move up by itself (item 7,
    // v2.78.0), and a press on a viewport's own linework carries the viewport
    // by that point (item 9, ViewportSnapMove). Both change gestures Vale
    // authors already use, so ValeVision holds them until Adam says yes:
    // PicksUpMove answers false (so neither the press nor the four-way cursor
    // offers Move under Select) and CarryTarget answers null (so no point is
    // marked and the frame moves the plain way under Move). Package W3-04
    // deletes this region and every line marked VV GUARD.
    // ------------------------------------------------------------
    const Na__LeTools__VV_HOLD_AUTO_MOVE      = true;                       // <-- VV GUARD (DR-40 item 7): also read by the pointer drag's box
    const Na__LeTools__VV_HOLD_VIEWPORT_CARRY = true;                       // <-- VV GUARD (DR-40 item 9)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


"""

HIT_GUARD_PICKS = "        if (Na__LeTools__VV_HOLD_AUTO_MOVE) return false;                   // <-- VV GUARD (DR-40 item 7, held): Select never picks Move up\n"
HIT_GUARD_CARRY = "        if (Na__LeTools__VV_HOLD_VIEWPORT_CARRY) return null;               // <-- VV GUARD (DR-40 item 9, held): never carried by a point\n"

PRESS_GUARD_REGION = """// -----------------------------------------------------------------------------
// REGION | ValeVision Gesture Guards (DR-40 items 8 and 10, held)
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Gestures Held Until Adam Confirms Them (ValeVision only)
    // ------------------------------------------------------------
    // VV GUARD (DR-40). TrueVision's Ctrl-drag copies (item 8, v2.117.0,
    // Na__LayoutEditor__SheetTools__CopyDrag__) and its Ctrl+click arms the
    // move anchor (item 10, v2.149.0). Both change what Ctrl does under a
    // Vale author's hand, so ValeVision holds them until Adam says yes: no
    // drag is copyable (so neither Ctrl on the press nor Ctrl pressed during
    // a move makes a copy) and the press never reads the anchor's modifier
    // (so Ctrl only adds to the selection, as it always has). Package W3-04
    // deletes this region and every line marked VV GUARD.
    // ------------------------------------------------------------
    const Na__LeTools__VV_HOLD_COPY_DRAG   = true;                          // <-- VV GUARD (DR-40 item 8)
    const Na__LeTools__VV_HOLD_MOVE_ANCHOR = true;                          // <-- VV GUARD (DR-40 item 10)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


"""

PRESS_GUARD_ANCHOR = "        if (Na__LeTools__VV_HOLD_MOVE_ANCHOR) intent.anchor = false;         // <-- VV GUARD (DR-40 item 10, held): Ctrl+click never arms the move anchor\n"
PRESS_GUARD_COPY = "        if (Na__LeTools__VV_HOLD_COPY_DRAG) drag.copyable = false;           // <-- VV GUARD (DR-40 item 8, held): no Ctrl-drag copy, at the press or mid-move\n"
DRAG_GUARD_BOX = "        if (Na__LeTools__VV_HOLD_AUTO_MOVE) return;                          // <-- VV GUARD (DR-40 item 7, held): a box never picks Move up either\n"

# -----------------------------------------------------------------------------
# PORT NOTE blocks (K2 H5); every one ends with the blank comment line before the rule
# -----------------------------------------------------------------------------

REL = '{{VVREL:W3-03}}'

NOTES = {}

NOTES['Na__LayoutEditor__SheetTools__HitResolution__.js'] = """// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 15-Sep-2026, v2.47.0: split out of
//                   Na__LayoutEditor__SheetTools__.js); TrueVision3D took the split back and grew it
//                   to 1.11.0, while this app's copy stayed at its 1.2.0; since ported back whole
//                   from TrueVision3D 1.11.0 (HEAD b2aa9151)
// - Source version: 1.11.0 (TrueVision3D v2.150.0, 22-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D """ + REL + """ - whole, in the hub's atomic
//                   sub-wave B: PicksUpMove (1.3.0, v2.78.0), the grid fallback (1.4.0, v2.114.0),
//                   the held axis through a snap (1.5.0, v2.118.0), reference layers (1.6.0,
//                   v2.123.0), snapping moved to 28__System__ObjectSnap (1.7.0, v2.129.0: this
//                   app's SnapShapeTranslation goes with it), the viewport rotate grip (1.8.0,
//                   v2.138.0), viewports in groups (1.9.0, v2.142.0), the move anchor (1.10.0,
//                   v2.149.0) and EdgeEnd (1.11.0, v2.150.0), with DoorAt (v2.42.0) and CarryTarget
//                   (v2.28.0). TrueVision releases Adam has not confirmed are named in the Port
//                   Record (DR-01 (c)).
// - Parity        : adapted - TrueVision's file plus the two held gesture guards below; package
//                   W3-04 deletes them when Adam confirms DR-40 items 7 and 9, and the file is then
//                   verbatim.
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
//   - VV GUARD (DR-40 item 7, held): Na__LeTools__VV_HOLD_AUTO_MOVE makes PicksUpMove answer
//     false, so Select never picks Move up and its cursor never promises it. A VV-only export
//     (K2 X2): the pointer drag's box reads it too. SelectionPicksUpMove is TrueVision's, as
//     the ported tests require.
//   - VV GUARD (DR-40 item 9, held): Na__LeTools__VV_HOLD_VIEWPORT_CARRY makes CarryTarget answer
//     null, so a viewport is never carried by a point of its linework (no marker, no grab).
// - Back-port     : none.
//
"""

NOTES['Na__LayoutEditor__SheetTools__PointerPress__.js'] = """// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 15-Sep-2026, v2.47.0: split out of
//                   Na__LayoutEditor__SheetTools__.js); TrueVision3D took the split back and grew it
//                   to 1.10.0, while this app's copy stayed at its 1.1.0; since ported back whole
//                   from TrueVision3D 1.10.0 (HEAD b2aa9151)
// - Source version: 1.10.0 (TrueVision3D v2.153.0, 23-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D """ + REL + """ - whole, in the hub's atomic
//                   sub-wave B: the automatic Move and the pick's dead zone (1.2.0, v2.78.0), a
//                   picture's crop (1.3.0, v2.116.0), the copy marks (1.4.0, v2.117.0), the vector
//                   tools (1.5.0, v2.130.0), the rotate grip (1.6.0, v2.138.0), the note-region
//                   tool (1.7.0, v2.143.0), the move anchor (1.8.0, v2.149.0), holes (1.9.0,
//                   v2.150.0) and a box started over a viewport (1.10.0, v2.153.0), with the door
//                   press (v2.42.0) and the carry in DragFor (v2.28.0). Releases Adam has not
//                   confirmed in TrueVision are named in the Port Record (DR-01 (c)).
// - Parity        : adapted - TrueVision's file plus the two held gesture guards below; package
//                   W3-04 deletes them when Adam confirms DR-40 items 8 and 10, and the file is then
//                   verbatim.
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
//   - VV GUARD (DR-40 item 8, held): Na__LeTools__VV_HOLD_COPY_DRAG makes no drag copyable, so
//     Ctrl on the press, or pressed during a move (the keyboard's CopyKey), never makes a copy.
//   - VV GUARD (DR-40 item 10, held): Na__LeTools__VV_HOLD_MOVE_ANCHOR clears the press's anchor
//     intent, so a Ctrl+click only adds to the selection and never arms the move anchor.
//   - DR-40 item 7 (the automatic Move) is held in HitResolution's PicksUpMove, which this file
//     asks.
// - Back-port     : none.
//
"""

NOTES['Na__LayoutEditor__SheetTools__PointerDrag__.js'] = """// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 15-Sep-2026, v2.47.0: split out of
//                   Na__LayoutEditor__SheetTools__.js); TrueVision3D took the split back and grew it
//                   to 1.19.0, while this app's copy stayed at its 1.4.0; since ported back whole
//                   from TrueVision3D 1.19.0 (HEAD b2aa9151)
// - Source version: 1.19.0 (TrueVision3D v2.149.0, 22-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D """ + REL + """ - whole, in the hub's atomic
//                   sub-wave B: TrueVision 1.5.0 to 1.19.0 (the broken-bubble tooltip, v2.65.0
//                   commit 4f6bb9ef, through the move anchor, v2.149.0), with the carry by a point
//                   and the door drag. Snapping now comes from 28__System__ObjectSnap and the held
//                   axis from Na__LeOrtho__Resolve, TrueVision's imports. Releases Adam has not
//                   confirmed in TrueVision are named in the Port Record (DR-01 (c)).
// - Parity        : adapted - TrueVision's file plus one held gesture guard below; package W3-04
//                   deletes it when Adam confirms DR-40 item 7, and the file is then verbatim.
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
//   - VV GUARD (DR-40 item 7, held): the box release returns before it picks Move up
//     (Na__LeTools__VV_HOLD_AUTO_MOVE, imported from HitResolution, where the guard is set).
// - Back-port     : none.
//
"""

NOTES['Na__LayoutEditor__SheetTools__Keyboard__.js'] = """// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 15-Sep-2026, v2.47.0: split out of
//                   Na__LayoutEditor__SheetTools__.js); TrueVision3D took the split back and grew it
//                   to 1.18.0, while this app's copy stayed at its 1.3.1 (TrueVision's 1.6.0 and
//                   the ObjectSnap import line); since ported back whole from TrueVision3D 1.18.0
//                   (HEAD b2aa9151)
// - Source version: 1.18.0 (TrueVision3D v2.151.0, 22-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D """ + REL + """ - whole, in the hub's atomic
//                   sub-wave B: K (1.7.0), F8 (1.8.0), F6 / F7 (1.9.0), the focused-control rule and
//                   Enter leaving a field (1.10.0, v2.115.0), CopyKey (1.11.0, v2.117.0), the vector
//                   keys (1.12.0), F9 (1.13.0), the region tool (1.14.0), Backspace mid-draw
//                   (1.15.0), the anchor's axis lock (1.16.0), holed deletes (1.17.0) and the
//                   Boolean keys (1.18.0, v2.151.0), with Ctrl+X (v2.75.0 commit 32767407) and the
//                   viewport frame's arrow lock (v2.98.0). Releases Adam has not confirmed in
//                   TrueVision are named in the Port Record (DR-01 (c)).
// - Parity        : verbatim - TrueVision's file; the banner and this note are the only differences.
//                   TrueVision's ViewportSnapMove divergence no longer applies: this app has it too.
//                   CopyKey stays inert while DR-40 item 8 is held (PointerPress makes no drag
//                   copyable).
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
//
"""

NOTES['Na__LayoutEditor__SheetTools__.js'] = """// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0, port Phase 5, from the pointer
//                   conventions of 35__System__PageLayoutSystem/Na__PageLayoutSystem__Controls__Pc__.js);
//                   TrueVision3D took it back and grew it to 1.39.0, while this app's copy stayed at
//                   its 1.25.0 (TrueVision's 1.30.0); since ported back whole from TrueVision3D 1.39.0
//                   (HEAD b2aa9151)
// - Source version: 1.39.0 (TrueVision3D v2.149.0, 22-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D """ + REL + """ - whole, in the hub's atomic
//                   sub-wave B: the automatic Move's listeners (1.31.0, v2.78.0), the zoom-settled
//                   redraw (1.32.0, v2.111.0), the copy key (1.33.0, v2.117.0), the retype and array
//                   context (1.34.0 / 1.35.0, v2.118.0 / v2.119.0), the vector tools (1.36.0,
//                   v2.130.0), the region tool (1.37.0, v2.143.0), the note tooltip (1.38.0,
//                   v2.144.0) and the move anchor (1.39.0, v2.149.0). Releases Adam has not
//                   confirmed in TrueVision are named in the Port Record (DR-01 (c)).
// - Parity        : verbatim - TrueVision's file; the banner and this note are the only differences.
//                   The four DR-40 gestures (items 7-10) are held in HitResolution and PointerPress.
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
//
"""

NOTES['Na__LayoutEditor__SheetTools__ContextMenu__.js'] = """// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 15-Sep-2026, v2.47.0: split out of
//                   Na__LayoutEditor__SheetTools__.js); TrueVision3D took the split back and grew it
//                   to 1.7.0, while this app's copy stayed at its "1.2.1" (TrueVision's 1.1.0, the
//                   leader clipboard rows and the ObjectSnap import line - its "1.2.0" was not
//                   TrueVision's 1.2.0); since ported back whole from TrueVision3D 1.7.0 (HEAD b2aa9151)
// - Source version: 1.7.0 (TrueVision3D v2.150.0, 22-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D """ + REL + """ - whole, in the hub's atomic
//                   sub-wave B: a picture's rows (1.2.0, v2.116.0), the Layer row (1.3.0, v2.123.0),
//                   the Vector tools row (1.4.0, v2.130.0), Rotate 90 and Reset rotation (1.5.0,
//                   v2.138.0), Show in Specification (1.6.0, v2.144.0) and holes and the Boolean row
//                   (1.7.0, v2.150.0), with the door rows (v2.42.0), the design-phase Model rows
//                   (v2.32.0; empty on a one-model project, DR-09) and the floor-area rows. The leader
//                   clipboard rows are ItemClipboard's selection rows now. Releases Adam has not
//                   confirmed in TrueVision are named in the Port Record (DR-01 (c)).
// - Parity        : verbatim - TrueVision's file; the banner and this note are the only differences.
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
// - Legacy        : TrueVision's DEVELOPMENT LOG, taken verbatim (DR-34), has two 17-Sep-2026
//                   Version 1.1.0 entries (the open container's menu, then Paste properties to N);
//                   kept as TrueVision wrote it rather than renumbering its history.
//
"""

NOTES['Na__LayoutEditor__SheetTools__CopyDrag__.js'] = """// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__CopyDrag__.js
// - Source version: 1.2.0 (TrueVision3D v2.141.0, 22-Sep-2026; 1.1.0 v2.119.0, 1.0.0 v2.117.0; read
//                   at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D """ + REL + """ - new, in the hub's atomic sub-wave B:
//                   LayOut's Ctrl-drag copy (v2.117.0), SketchUp's 3x and /3 arrays (v2.119.0) and a
//                   copy carrying its leader tips (v2.141.0). Unreachable while DR-40 item 8 is held:
//                   PointerPress makes no drag copyable, so nothing here runs until W3-04.
// - Parity        : verbatim - TrueVision's file; the banner and this note are the only differences.
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
//
"""

NOTES['Na__LayoutEditor__AxisLock__.js'] = """// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 10-Sep-2026, v2.21.13, port Phase 5); TrueVision3D
//                   took it back unchanged and added the INTEGRATION paragraph naming
//                   ViewportSnapMove (v2.98.0, no version step); since ported back whole from
//                   TrueVision3D 1.0.0 (HEAD b2aa9151)
// - Source version: 1.0.0 (TrueVision3D v2.98.0, 21-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D """ + REL + """ - header sync with the hub (the code and
//                   the INTEGRATION paragraph were already TrueVision's since v2.71.4).
// - Parity        : verbatim - TrueVision's file; the banner and this note are the only differences.
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
//
"""

NOTES['Na__LayoutEditor__SheetTools__ContentEditing__.js'] = """// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 15-Sep-2026, v2.47.0: split out of
//                   Na__LayoutEditor__SheetTools__.js); TrueVision3D took the split back unchanged
//                   (v2.55.0); since ported back whole from TrueVision3D 1.0.0 (HEAD b2aa9151)
// - Source version: 1.0.0 (TrueVision3D v2.55.0, 15-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D """ + REL + """ - header sync with the hub (the code was
//                   already identical).
// - Parity        : verbatim - TrueVision's file; the banner and this note are the only differences.
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
//
"""

NOTES['Na__LayoutEditor__ViewportHandles__.js'] = """// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0, port Phase 5, from the handle
//                   conventions of 35__System__PageLayoutSystem/Na__PageLayoutSystem__Controls__Pc__.js);
//                   TrueVision3D took it back and grew it to 1.5.0, while this app's copy stayed at
//                   its 1.4.0; since ported back whole from TrueVision3D 1.5.0 (HEAD b2aa9151)
// - Source version: 1.5.0 (TrueVision3D v2.138.0, 21-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D """ + REL + """ - whole, inside the SheetTools hub's
//                   atomic change (orchestrator correction OC-02: HitResolution, PointerPress and
//                   PointerDrag import OnRotateGrip, RotateStart and RotateTo): rotatable viewports -
//                   the turned outline and handles, the rotate grip, RotateStart and RotateTo, the
//                   crop worked in the frame's own axes, and placement by transform. TrueVision's
//                   v2.138.0 is NOT tried by Adam; ported under DR-01 (c). The rest of the rotation
//                   set (Viewport3dZoom 1.1.0, ViewportClipboard 1.4.0) stays with package W3-06.
// - Parity        : verbatim - TrueVision's file; the banner and this note are the only differences.
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
//
"""


def test_note(source_line, extra=None):
    lines = [
        '// PORT NOTE:',
        source_line[0],
        source_line[1],
        '// - Ported on     : 02-Oct-2026 for ValeVision3D ' + REL + ', with the SheetTools hub (W3-03)',
    ]
    if extra:
        lines.extend(extra)
    lines.extend([
        '// - Parity        : verbatim',
        '// - Divergences   :',
        '//   - Banner reads ValeVision3D' + ('' if not (extra and 'title' in ''.join(extra)) else '') + '.',
        '// - Back-port     : none.',
        '//',
        GUARD_RULE.rstrip('\n'),
        '//',
    ])
    return '\n'.join(lines) + '\n'
