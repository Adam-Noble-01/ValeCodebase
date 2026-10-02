"""W1-36 builder: Navigation 1.3.0, Controls__Pc 1.4.0, Controls__TouchScreen 1.1.0 whole; the ModeController's
keyboard hunks (RestartSheetKeys, StepSheet and its STEP_SHEET_EVENT listener, TakeKeyboard, ReloadKeyMap); the Fly
controls 1.0.1 render-loop hunk (OC-08); the three TV tests with their identity seams.

Every TV text is read with git show at the pin (bytes). Every replacement is asserted to happen exactly once.

Modes
  --build              write every built file under scratch/W1-36/out/ (nothing in the live tree)
  --apply              check each live target still equals its pre-image (scratch/W1-36/pre), then write the built
                       code files and the two landed tests; Na__Test__DrawingTabKeys__ stays in out/ (held, see
                       the Port Record) unless --land-drawingtabkeys is given
  --land-held-test     copy the held Na__Test__DrawingTabKeys__ from out/ into the live tree (only if absent); for
                       the orchestrator or W3-03 once SheetTools__Keyboard__ is TrueVision's (1.10.0 or later)
  --check-live         compare the live files with out/
  --restore            write the pre-images back byte for byte and delete the tests this package created
"""
import hashlib
import os
import subprocess
import sys

PIN = "b2aa9151"
NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
TVAPP = "na-apps/30__TrueVision__CoreAppCode/"
VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
PRE = os.path.join(HERE, "pre")

LE = "02__Src__AppModules/51__System__LayoutEditor/"
P_NAV = LE + "10__Core__SheetSurface/Na__LayoutEditor__Navigation__.js"
P_PC = LE + "10__Core__SheetSurface/Na__LayoutEditor__Controls__Pc__.js"
P_TOUCH = LE + "10__Core__SheetSurface/Na__LayoutEditor__Controls__TouchScreen__.js"
P_MC = LE + "05__Core__ModeController/Na__LayoutEditor__ModeController__.js"
P_FLY = "02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__FlyModeControls.js"
T_ZOOM = "80__Testing__PrototypeEnvironment/Na__Test__AuthoringZoomMax__.test.mjs"
T_PAGE = "80__Testing__PrototypeEnvironment/Na__Test__SheetPagingWalkExit__.test.mjs"
T_KEYS = "80__Testing__PrototypeEnvironment/Na__Test__DrawingTabKeys__.test.mjs"

CODE_FILES = [P_NAV, P_PC, P_TOUCH, P_MC, P_FLY]
LANDED_TESTS = [T_ZOOM, T_PAGE]
HELD_TESTS = [T_KEYS]

RULE = "// -----------------------------------------------------------------------------"


def sha(b):
    return hashlib.sha256(b).hexdigest()


def tv_text(rel):
    r = subprocess.run(["git", "-C", NAWEB, "show", PIN + ":" + TVAPP + rel], capture_output=True)
    if r.returncode != 0:
        raise SystemExit("cannot read TV " + rel + ": " + r.stderr.decode("utf-8", "replace"))
    b = r.stdout
    if b"\r\n" in b:
        raise SystemExit("TV text unexpectedly has CRLF: " + rel)
    return b.decode("utf-8")


def once(text, old, new, what):
    n = text.count(old)
    if n != 1:
        raise SystemExit("replacement '%s': expected exactly 1 occurrence, found %d" % (what, n))
    return text.replace(old, new)


def between(text, start_marker, end_marker, what):
    a = text.find(start_marker)
    if a == -1 or text.find(start_marker, a + 1) != -1:
        raise SystemExit("block '%s': start marker not found exactly once" % what)
    b = text.find(end_marker, a)
    if b == -1:
        raise SystemExit("block '%s': end marker not found" % what)
    return text[a:b]


def line_with(text, needle, what):
    lines = [l for l in text.split("\n") if needle in l]
    if len(lines) != 1:
        raise SystemExit("line '%s': expected exactly 1 line, found %d" % (what, len(lines)))
    return lines[0]


def pre_bytes(rel):
    return open(os.path.join(PRE, os.path.basename(rel)), "rb").read()


def crlf_decode(b, what):
    """A pure-CRLF file as LF text (asserted pure), and whether it carried a BOM."""
    bom = b.startswith(b"\xef\xbb\xbf")
    if bom:
        b = b[3:]
    crlf = b.count(b"\r\n")
    lf = b.count(b"\n")
    if crlf != lf or b.count(b"\r") != crlf:
        raise SystemExit("%s is not pure CRLF (crlf=%d lf=%d)" % (what, crlf, lf))
    return b.decode("utf-8").replace("\r\n", "\n"), bom


def crlf_encode(text, bom):
    b = text.replace("\n", "\r\n").encode("utf-8")
    return (b"\xef\xbb\xbf" + b) if bom else b


# -----------------------------------------------------------------------------
# Whole-file ports (TV's text, LF, with the header seams only)
# -----------------------------------------------------------------------------

NAV_TV_NOTE = """// PORT NOTE:
// - Ported from   : ValeVision3D 51__System__LayoutEditor/Na__LayoutEditor__Navigation__.js
// - Ported on     : 10-Sep-2026 for TrueVision3D v2.21.0 (re-alignment)
// - Parity        : verbatim
// - Divergences   : Console prefix, header and folder numbers only.
// - Back-port     : n/a (this IS the back-port)
"""

NAV_VV_NOTE = """// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0, port Phase 5, from Lantern Designer's
//                   30__System__DrawingEditorMode/VghLantern__DrawingEditor__SheetManager__.js, ZoomAt and
//                   ApplySheetZoom); TrueVision3D took it whole on 10-Sep-2026 (its v2.21.0) and grew it to
//                   1.3.0; since ported back whole from TrueVision3D 1.3.0 (HEAD b2aa9151)
// - Source version: 1.3.0 (TrueVision3D v2.135.0, 21-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-36}} - whole. This app's copy was its 1.1.0
//                   (10-Sep-2026, the gesture handling lifted out into the two control modules). A wheel or
//                   pinch step is now a zoom gesture step that the sheet surface settles once (1.2.0,
//                   TrueVision3D v2.111.0), and the ceiling follows the authoring gate: 6400% where this
//                   session may author, 800% for every reader (1.3.0). INTEGRATION now has TrueVision's
//                   words: the editor's toolbar lost its zoom buttons with the toolbar's subtractive phase.
// - Parity        : verbatim
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
"""

PC_TV_NOTE = """// PORT NOTE:
// - Ported from   : ValeVision3D 51__System__LayoutEditor/Na__LayoutEditor__Controls__Pc__.js
// - Ported on     : 10-Sep-2026 for TrueVision3D v2.21.0 (re-alignment)
// - Parity        : verbatim
// - Divergences   : Console prefix, header and folder numbers; the 3D viewport zoom of 1.1.0,
//                   authored here first and PENDING to ValeVision3D on Adam's sign-off.
// - Back-port     : n/a (this IS the back-port)
"""

PC_VV_NOTE = """// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 10-Sep-2026, v2.21.0, port Phase 5, from Lantern Designer's
//                   30__System__DrawingEditorMode/VghLantern__DrawingEditor__SheetManager__.js, BindSheetNavigation
//                   region); TrueVision3D took it whole on 10-Sep-2026 (its v2.21.0) and grew it to 1.4.0;
//                   since ported back whole from TrueVision3D 1.4.0 (HEAD b2aa9151)
// - Source version: 1.4.0 (TrueVision3D v2.115.0, 21-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-36}} - whole. This app's copy was its 1.1.0
//                   (14-Sep-2026, TrueVision's 3D viewport zoom wheel, v2.50.0). The wheel's steps are now
//                   gathered into one zoom a frame, each a zoom gesture step (1.2.0, v2.111.0); Page Up and
//                   Page Down ask the mode controller for the drawing before or after this one (1.3.0,
//                   v2.112.0); a press on the stage takes the keyboard, and a focused control keeps only the
//                   keys it uses (1.4.0).
// - Parity        : verbatim
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
"""

TOUCH_TV_NOTE = """// PORT NOTE:
// - Ported from   : ValeVision3D 51__System__LayoutEditor/Na__LayoutEditor__Controls__TouchScreen__.js
// - Ported on     : 10-Sep-2026 for TrueVision3D v2.21.0 (re-alignment)
// - Parity        : verbatim
// - Divergences   : Console prefix, header and folder numbers only.
// - Back-port     : n/a (this IS the back-port)
"""

TOUCH_VV_NOTE = """// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 10-Sep-2026, v2.21.0, port Phase 5, from Lantern Designer's
//                   30__System__DrawingEditorMode/VghLantern__DrawingEditor__SheetManager__.js, navigation
//                   region, where LD binds no touch gesture at all); TrueVision3D took it whole on
//                   10-Sep-2026 (its v2.21.0) and grew it to 1.1.0; since ported back whole from
//                   TrueVision3D 1.1.0 (HEAD b2aa9151)
// - Source version: 1.1.0 (TrueVision3D v2.111.0, 21-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-36}} - whole. This app's copy was its 1.0.0
//                   (10-Sep-2026); a pinch step is now a zoom gesture step, held until the pinch rests.
// - Parity        : verbatim
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
"""


def build_whole(rel, banner_old, banner_new, tv_note, vv_note):
    text = tv_text(rel)
    text = once(text, banner_old, banner_new, rel + " banner")
    text = once(text, tv_note, vv_note, rel + " PORT NOTE")
    if "TRUEVISION3D" in text or "[TrueVision3D" in text:
        raise SystemExit(rel + ": a TrueVision identity token survived")
    return text.encode("utf-8")


def build_nav():
    return build_whole(P_NAV, "// TRUEVISION3D - LAYOUT EDITOR - NAVIGATION\n",
                       "// VALEVISION3D - LAYOUT EDITOR - NAVIGATION\n", NAV_TV_NOTE, NAV_VV_NOTE)


def build_pc():
    return build_whole(P_PC, "// TRUEVISION3D - LAYOUT EDITOR - CONTROLS - PC\n",
                       "// VALEVISION3D - LAYOUT EDITOR - CONTROLS - PC\n", PC_TV_NOTE, PC_VV_NOTE)


def build_touch():
    return build_whole(P_TOUCH, "// TRUEVISION3D - LAYOUT EDITOR - CONTROLS - TOUCHSCREEN\n",
                       "// VALEVISION3D - LAYOUT EDITOR - CONTROLS - TOUCHSCREEN\n", TOUCH_TV_NOTE, TOUCH_VV_NOTE)


# -----------------------------------------------------------------------------
# The ModeController's keyboard hunks (VV's file, CRLF kept)
# -----------------------------------------------------------------------------

MC_SOURCE_OLD = """// - Source version: 1.32.0 (TrueVision3D v2.166.0, 29-Sep-2026; read at b2aa9151) - the hunks the 1.18.1,
//                   1.18.2 and 1.18.3 entries name. Every other difference from that file is a seam listed
//                   here or a hunk that arrives with its own feature.
// - Ported on     : 02-Oct-2026 for ValeVision3D v2.71.2; 02-Oct-2026 for ValeVision3D
//                   v2.71.2 (the first-open veil); 02-Oct-2026 for ValeVision3D v2.71.2
//                   (the specification under its own tab)
"""

MC_SOURCE_NEW = """// - Source version: 1.32.0 (TrueVision3D v2.166.0, 29-Sep-2026; read at b2aa9151) - the hunks the 1.18.1,
//                   1.18.2, 1.18.3 and 1.18.4 entries name. Every other difference from that file is a seam
//                   listed here or a hunk that arrives with its own feature.
// - Ported on     : 02-Oct-2026 for ValeVision3D v2.71.2; 02-Oct-2026 for ValeVision3D
//                   v2.71.2 (the first-open veil); 02-Oct-2026 for ValeVision3D v2.71.2
//                   (the specification under its own tab); 02-Oct-2026 for ValeVision3D
//                   {{VVREL:W1-36}} (the drawing tabs' keyboard: its restart, and Page Up / Page Down)
"""

MC_NOTYET_OLD = """//   - Not yet taken, each arriving with its feature: the register and statements pages, the
//     sheet keyboard's restart and Page Up / Page Down, the drawing grid and axes, vector tools,
//     sheet images, floor areas, patterns, site plans and design phases, the specification
//     lockstep, note regions, the left column's two tabs, the published viewer's guards, and
//     SectionForKind's site plan, floor area and picture rules.
"""

MC_NOTYET_NEW = """//   - Not yet taken, each arriving with its feature: the register and statements pages, the
//     drawing grid and axes, vector tools, sheet images, floor areas, patterns, site plans and
//     design phases, the specification lockstep, note regions, the left column's two tabs, the
//     published viewer's guards, and SectionForKind's site plan, floor area and picture rules.
"""

MC_LOG_ANCHOR = "// 02-Oct-2026 - Version 1.18.3 (the specification under its own tab, v2.71.2)\n"

MC_LOG_ENTRY = """// 02-Oct-2026 - Version 1.18.4 (the drawing tabs' keyboard, {{VVREL:W1-36}})
// - PAGE UP AND PAGE DOWN TURN THE DRAWINGS. StepSheet answers the PC
//   controls' STEP_SHEET_EVENT (Na__LayoutEditor__Controls__Pc__ 1.4.0) by
//   entering the drawing before or after this one, in tab order, exactly as
//   clicking that tab does. Drawings only; the ends stop. From TrueVision3D
//   1.23.0 (v2.112.0).
// - THE DRAWING TABS' KEYBOARD IS STARTED AFRESH EVERY TIME A DRAWING IS
//   OPENED FROM ANOTHER TAB (RestartSheetKeys): from the 3D Model tab or the
//   Project Specification. Every listener comes off and goes back on - a key
//   held, a value half typed and a tool half used go with them, and Select is
//   up - the drawing tabs' key file is read again (Na__LeCfg__ReloadKeyMap:
//   the map in force stays until it lands, and a failed read keeps it), and
//   the stage is given the keyboard (Na__LePc__TakeKeyboard), so a field left
//   with the focus on the tab just closed cannot keep the sheet's keys. One
//   drawing to another keeps its keyboard as it is. From TrueVision3D 1.25.0
//   (v2.115.0), with TrueVision's comment over the function; the register and
//   the statements restart it the same way once their pages come.
//
"""

MC_CFG_IMPORT_OLD = "    import { Na__LeCfg__SetAppConfig, Na__LeCfg__Ready, Na__LeCfg__IsEnabled, Na__LeCfg__IsReadOnlyOnWeb, Na__LeCfg__GetLabel, Na__LeCfg__GetPanelSetup, Na__LeCfg__MatchKeyBinding } from '../03__Core__Config/Na__LayoutEditor__ConfigState__.js';\n"
MC_PC_IMPORT_OLD = "    import { Na__LePc__Attach, Na__LePc__Detach } from '../10__Core__SheetSurface/Na__LayoutEditor__Controls__Pc__.js';\n"

MC_FROMSPEC_OLD = """            Na__LeMode__View = Na__LeMode__VIEW_SHEET;                           // <-- In the viewer, ShowDrawing puts the specification away below
            Na__LeMode__AttachSheetInput();
        }
"""

MC_FROM3D_OLD = "            Na__LeMode__AttachSheetInput();                                // <-- Pointer, keys, tools and the margin grip\n"

MC_RESTART_ANCHOR = "    // HELPER FUNCTION | Load the PDF Library's Text Metrics Once, Then Redraw the Paper\n"
MC_STEP_ANCHOR = "    // FUNCTION | Wait Until the Sheet Just Opened Has Actually Been Drawn\n"
MC_LISTENER_ANCHOR = "            window.addEventListener(Na__LePanelViewport__EDIT_EVENT, Na__LeMode__OnRequestDrawing);\n"


def build_mc():
    tv = tv_text(LE + "05__Core__ModeController/Na__LayoutEditor__ModeController__.js")
    text, bom = crlf_decode(pre_bytes(P_MC), "VV ModeController")

    # Records: PORT NOTE and the log entry
    text = once(text, MC_SOURCE_OLD, MC_SOURCE_NEW, "MC Source version / Ported on")
    text = once(text, MC_NOTYET_OLD, MC_NOTYET_NEW, "MC not-yet-taken bullet")
    text = once(text, MC_LOG_ANCHOR, MC_LOG_ENTRY + MC_LOG_ANCHOR, "MC log entry 1.18.4")

    # Imports: TrueVision's two lines, verbatim
    tv_cfg = line_with(tv, "import { Na__LeCfg__SetAppConfig,", "TV config import") + "\n"
    tv_pc = line_with(tv, "Na__LayoutEditor__Controls__Pc__.js';", "TV PC controls import") + "\n"
    if "Na__LeCfg__ReloadKeyMap" not in tv_cfg or "Na__LePc__TakeKeyboard" not in tv_pc or "Na__LePc__STEP_SHEET_EVENT" not in tv_pc:
        raise SystemExit("TV import lines are not the expected ones")
    text = once(text, MC_CFG_IMPORT_OLD, tv_cfg, "MC config import")
    text = once(text, MC_PC_IMPORT_OLD, tv_pc, "MC PC controls import")

    # RestartSheetKeys: TrueVision's block verbatim, at its position (after Detach, before PreloadMetrics)
    restart = between(tv, "    // HELPER FUNCTION | A Drawing Tab Opened From Another Tab: Its Keyboard Started Afresh\n",
                      "\n\n\n" + MC_RESTART_ANCHOR, "TV RestartSheetKeys")
    if "function Na__LeMode__RestartSheetKeys()" not in restart:
        raise SystemExit("TV RestartSheetKeys block not as expected")
    text = once(text, MC_RESTART_ANCHOR, restart + "\n\n\n" + MC_RESTART_ANCHOR, "MC RestartSheetKeys block")

    # Enter: both ways in restart the sheet's keyboard (TrueVision's two lines)
    tv_fromspec = line_with(tv, "Na__LeMode__RestartSheetKeys();                                      // <-- Back from a document tab", "TV fromSpec restart") + "\n"
    tv_from3d = line_with(tv, "Na__LeMode__RestartSheetKeys();                                // <-- Pointer, keys, tools and the margin grip, started afresh", "TV from-3D restart") + "\n"
    text = once(text, MC_FROMSPEC_OLD,
                "            Na__LeMode__View = Na__LeMode__VIEW_SHEET;                           // <-- In the viewer, ShowDrawing puts the specification away below\n"
                + tv_fromspec + "        }\n", "MC Enter fromSpec restart")
    text = once(text, MC_FROM3D_OLD, tv_from3d, "MC Enter from-3D restart")

    # StepSheet: TrueVision's block verbatim, straight after Leave (TrueVision's position)
    step = between(tv, "    // FUNCTION | Page Up / Page Down: the Drawing Before or After This One\n",
                   "\n\n\n    // FUNCTION | Ctrl+S Saves, From Anywhere in the Editor\n", "TV StepSheet")
    if "function Na__LeMode__StepSheet(direction)" not in step:
        raise SystemExit("TV StepSheet block not as expected")
    text = once(text, MC_STEP_ANCHOR, step + "\n\n\n" + MC_STEP_ANCHOR, "MC StepSheet block")

    # The listener: TrueVision's line, after the viewport panel's (TrueVision's position)
    tv_listener = line_with(tv, "window.addEventListener(Na__LePc__STEP_SHEET_EVENT,", "TV STEP_SHEET listener") + "\n"
    text = once(text, MC_LISTENER_ANCHOR, MC_LISTENER_ANCHOR + tv_listener, "MC STEP_SHEET listener")

    return crlf_encode(text, bom)


# -----------------------------------------------------------------------------
# The Fly controls 1.0.1 render-loop hunk (VV's file, CRLF kept) - OC-08
# -----------------------------------------------------------------------------

FLY_IMPORT_OLD = """    import {
        Na__RenderLoop__RequestActiveRender,
        Na__RenderLoop__RequestRender
    } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
"""

FLY_DEACTIVATE_OLD = """            Na__RenderLoop__RequestRender();                                     // <-- Redraw once after returning to orbit mode
            if (onDeactivate) onDeactivate();                                    // <-- Fire caller UI callback
"""

FLY_HEADER_OLD = """//   Pass onActivate / onDeactivate callbacks for caller-side UI reactions.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Jun-2026 - Version 1.0.0
// - Ported from TrueVision3D Na__UiFeature__FlyModeControls.js.
// - Re-headered for ValeVision3D namespace.
//
// 09-Jun-2026 - Version 1.1.0
// - Added FOV compensation: passes camera ref + fly FOV to ModeTransition so
//   the camera is nudged forward before activation to counteract the apparent
//   zoom-out from the wider fly FOV compared to the orbit lens.
//
// =============================================================================
"""

FLY_HEADER_NEW = """//   Pass onActivate / onDeactivate callbacks for caller-side UI reactions.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__FlyModeControls.js
//                   (its 1.0.0 of 25-May-2026, as this file's 1.0.0 on 09-Jun-2026); TrueVision's later work
//                   comes back hunk by hunk
// - Source version: 1.0.1 (TrueVision3D v2.112.0, 21-Sep-2026; read at b2aa9151) - its render-loop release,
//                   the one hunk the 1.1.1 entry names
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-36}}
// - Parity        : adapted (hunk replay; this app's own 1.1.0 stays)
// - Divergences   :
//   - FOV compensation (this app's 1.1.0): Initialize takes a seventh argument, fovCompensationConfig,
//     and the orbit-to-fly transition is handed the camera, the fly FOV and the compensation scale, so
//     the fly config is read before the transition rather than after it succeeds.
//   - The header is this app's: CREATED is its port date, DESCRIPTION names the port, and the log keeps
//     this app's versions. Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : the FOV compensation could be offered to TrueVision through the TrueVision lane
//                   (DR-36); not done here.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.1.1 ({{VVREL:W1-36}})
// - Leaving Fly now stops the 'fly-mode' active render it asked for on the
//   way in. Nothing ever stopped it, so after one flight the render loop kept
//   drawing every frame for the rest of the session, idle or not; the Walk
//   controls already let theirs go. From TrueVision3D 1.0.1 (v2.112.0).
// - The log runs newest first, as the logs of files ported from TrueVision
//   do.
//
// 09-Jun-2026 - Version 1.1.0
// - Added FOV compensation: passes camera ref + fly FOV to ModeTransition so
//   the camera is nudged forward before activation to counteract the apparent
//   zoom-out from the wider fly FOV compared to the orbit lens.
//
// 09-Jun-2026 - Version 1.0.0
// - Ported from TrueVision3D Na__UiFeature__FlyModeControls.js.
// - Re-headered for ValeVision3D namespace.
//
// =============================================================================
"""


def build_fly():
    tv = tv_text("02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__FlyModeControls.js")
    text, bom = crlf_decode(pre_bytes(P_FLY), "VV Fly controls")
    tv_import = between(tv, "    import {\n        Na__RenderLoop__RequestActiveRender,\n",
                        "    // ------------------------------------------------------------\n\n// endregion", "TV render-loop import")
    if "Na__RenderLoop__StopActiveRender" not in tv_import:
        raise SystemExit("TV Fly import not as expected")
    tv_stop = line_with(tv, "Na__RenderLoop__StopActiveRender('fly-mode');", "TV fly stop line") + "\n"
    text = once(text, FLY_IMPORT_OLD, tv_import, "Fly render-loop import")
    text = once(text, FLY_DEACTIVATE_OLD, tv_stop + FLY_DEACTIVATE_OLD, "Fly deactivate stop")
    text = once(text, FLY_HEADER_OLD, FLY_HEADER_NEW, "Fly header (PORT NOTE and log)")
    return crlf_encode(text, bom)


# -----------------------------------------------------------------------------
# The tests: TV's text, LF, with the banner, the printed title and a PORT NOTE
# -----------------------------------------------------------------------------

LOG_HEAD = RULE + "\n//\n// DEVELOPMENT LOG:\n"


def test_note(lines):
    return RULE + "\n//\n" + "".join("// " + l + "\n" if l else "//\n" for l in lines) + "//\n" + LOG_HEAD


def build_test(rel, banner_old, banner_new, title_old, title_new, note_lines):
    text = tv_text(rel)
    text = once(text, banner_old, banner_new, rel + " banner")
    if title_old:
        text = once(text, title_old, title_new, rel + " printed title")
    text = once(text, LOG_HEAD, test_note(note_lines), rel + " PORT NOTE")
    if "TRUEVISION3D" in text:
        raise SystemExit(rel + ": the TrueVision banner token survived")
    return text.encode("utf-8")


def build_zoom():
    return build_test(T_ZOOM,
        "// TRUEVISION3D - TEST - HOW FAR THE SHEET ZOOMS IN, FOR AN AUTHOR AND FOR A READER\n",
        "// VALEVISION3D - TEST - HOW FAR THE SHEET ZOOMS IN, FOR AN AUTHOR AND FOR A READER\n",
        None, None, [
            "PORT NOTE:",
            "- Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__AuthoringZoomMax__.test.mjs",
            "- Source version: 1.0.0 (TrueVision3D v2.135.0, 21-Sep-2026; read at b2aa9151)",
            "- Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-36}}, with Navigation 1.3.0 (its config half",
            "                  ran earlier, from a scratch copy, with the config units of W0-15)",
            "- Parity        : verbatim",
            "- Divergences   :",
            "  - Banner reads ValeVision3D.",
            "- Back-port     : none.",
        ])


def build_page():
    return build_test(T_PAGE,
        "// TRUEVISION3D - TEST - PAGE UP / PAGE DOWN ON A DRAWING, AND LEAVING WALK\n",
        "// VALEVISION3D - TEST - PAGE UP / PAGE DOWN ON A DRAWING, AND LEAVING WALK\n",
        "    console.log('TrueVision3D - Page Up / Page Down on a drawing, and leaving Walk');\n",
        "    console.log('ValeVision3D - Page Up / Page Down on a drawing, and leaving Walk');\n", [
            "PORT NOTE:",
            "- Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__SheetPagingWalkExit__.test.mjs",
            "- Source version: 1.1.0 (TrueVision3D v2.115.0, 21-Sep-2026; read at b2aa9151)",
            "- Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-36}}, with the PC controls 1.4.0, the mode",
            "                  controller's StepSheet and the Fly controls' render-loop release",
            "- Parity        : verbatim",
            "- Divergences   :",
            "  - Banner and the printed title read ValeVision3D.",
            "  - Nothing in what it loads: the transitions sit at TrueVision's 40__System__DrawingViewCore path",
            "    since this app's folder renumber, and the Walk and Fly controls at 10__NavigationAndCameras.",
            "- Back-port     : none.",
        ])


def build_keys():
    return build_test(T_KEYS,
        "// TRUEVISION3D - TEST - THE DRAWING TABS' KEYS: M, THE FOCUS AND THE FALLBACK\n",
        "// VALEVISION3D - TEST - THE DRAWING TABS' KEYS: M, THE FOCUS AND THE FALLBACK\n",
        "    console.log('TrueVision3D - the drawing tabs\\' keys: M, the focus and the fallback');\n",
        "    console.log('ValeVision3D - the drawing tabs\\' keys: M, the focus and the fallback');\n", [
            "PORT NOTE:",
            "- Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__DrawingTabKeys__.test.mjs",
            "- Source version: 1.0.0 (TrueVision3D v2.115.0, 21-Sep-2026; read at b2aa9151)",
            "- Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-36}}, with the PC controls 1.4.0 (its key map",
            "                  sections ran earlier, from a scratch copy, with KeyMap 1.11.0 of W0-15)",
            "- Parity        : verbatim",
            "- Divergences   :",
            "  - Banner and the printed title read ValeVision3D.",
            "- Back-port     : none.",
        ])


BUILDERS = {
    P_NAV: build_nav, P_PC: build_pc, P_TOUCH: build_touch, P_MC: build_mc, P_FLY: build_fly,
    T_ZOOM: build_zoom, T_PAGE: build_page, T_KEYS: build_keys,
}


def out_path(rel):
    return os.path.join(OUT, rel.replace("/", os.sep))


def live_path(rel):
    return os.path.join(VV, rel.replace("/", os.sep))


def do_build():
    for rel, fn in BUILDERS.items():
        b = fn()
        p = out_path(rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "wb") as f:
            f.write(b)
        print("built %-95s %7d B crlf=%-5d sha=%s" % (rel, len(b), b.count(b"\r\n"), sha(b)[:16]))


def do_apply(land_keys):
    targets = CODE_FILES + LANDED_TESTS + (HELD_TESTS if land_keys else [])
    # 1. Everything still as recorded before anything is written
    for rel in CODE_FILES:
        live = open(live_path(rel), "rb").read()
        if sha(live) != sha(pre_bytes(rel)):
            raise SystemExit("REFUSED: %s changed since the pre-image was taken" % rel)
    for rel in LANDED_TESTS + HELD_TESTS:
        if os.path.exists(live_path(rel)):
            raise SystemExit("REFUSED: %s already exists in the live tree" % rel)
    # 2. Write each file whole, one write each
    for rel in targets:
        b = open(out_path(rel), "rb").read()
        with open(live_path(rel), "wb") as f:
            f.write(b)
        print("wrote", rel, sha(b)[:16])


def do_land_held_test():
    """Land the held Na__Test__DrawingTabKeys__ alone (for the orchestrator or W3-03, once the sheet keyboard is
    TrueVision's): refuses if a file of that name is already in the live tree."""
    for rel in HELD_TESTS:
        lp = live_path(rel)
        if os.path.exists(lp):
            raise SystemExit("REFUSED: %s already exists in the live tree" % rel)
        b = open(out_path(rel), "rb").read()
        with open(lp, "wb") as f:
            f.write(b)
        print("wrote", rel, sha(b)[:16])


def do_check_live():
    ok = True
    for rel in CODE_FILES + LANDED_TESTS + HELD_TESTS:
        lp = live_path(rel)
        if not os.path.exists(lp):
            print("ABSENT  ", rel)
            continue
        same = open(lp, "rb").read() == open(out_path(rel), "rb").read()
        ok = ok and same
        print(("SAME    " if same else "DIFFERS ") + rel)
    return 0 if ok else 1


def do_restore():
    """Only a file still exactly as this package wrote it is put back (a later package's edit is never undone)."""
    for rel in CODE_FILES + LANDED_TESTS + HELD_TESTS:
        lp = live_path(rel)
        if os.path.exists(lp) and open(lp, "rb").read() != open(out_path(rel), "rb").read():
            raise SystemExit("REFUSED: %s changed since this package wrote it; restore by hand" % rel)
    for rel in CODE_FILES:
        with open(live_path(rel), "wb") as f:
            f.write(pre_bytes(rel))
        print("restored", rel)
    for rel in LANDED_TESTS + HELD_TESTS:
        lp = live_path(rel)
        if os.path.exists(lp):
            os.remove(lp)
            print("removed", rel)


def main(argv):
    if "--build" in argv:
        do_build()
    elif "--apply" in argv:
        do_apply("--land-drawingtabkeys" in argv)
    elif "--land-held-test" in argv:
        do_land_held_test()
    elif "--check-live" in argv:
        return do_check_live()
    elif "--restore" in argv:
        do_restore()
    else:
        print(__doc__)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
