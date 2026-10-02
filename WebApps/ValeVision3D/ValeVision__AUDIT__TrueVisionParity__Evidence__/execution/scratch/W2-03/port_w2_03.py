# =============================================================================
# W2-03 - Elevation Depth Fog core and 3D wiring - the port script
# =============================================================================
#
# New files: TrueVision's bytes at the pin b2aa9151 (LF, exactly as git show
# returns them) with ONLY the package's seams applied, written with 'xb'.
# Existing files: exact byte anchors, each asserted to match exactly once, in
# the file's own line ending (CRLF files get CRLF text), from a pre-image that
# is backed up first and re-checked immediately before the write.
#
#   python port_w2_03.py --stage     write everything to scratch/W2-03/staged/ (live tree untouched)
#   python port_w2_03.py --apply     land it in the live tree (refuses if a pre-image changed)
#   python port_w2_03.py --check     prove the new files reverse to TV's bytes and the edits are in place
#   python port_w2_03.py --restore   put the five pre-images back and delete the three new files
#                                    (only if each live file is still byte-equal to what this script landed)
# =============================================================================

import hashlib
import json
import os
import shutil
import subprocess
import sys

NAWEB   = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN     = "b2aa9151"
TV_APP  = "na-apps/30__TrueVision__CoreAppCode/"
VV_ROOT = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
HERE    = os.path.dirname(os.path.abspath(__file__))
STAGED  = os.path.join(HERE, "staged")
BACKUP  = os.path.join(HERE, "backup")
LANDED  = os.path.join(HERE, "landed_sha256.json")
FOG     = "02__Src__AppModules/49__System__ElevationDepthFog/"

DR01 = (
    "//                   TrueVision's own note said \"not yet ported\" and its fog plan still awaits Adam's\n"
    "//                   test; it comes across under DR-01 (c), and v2.94.0 is named as not yet confirmed by\n"
    "//                   Adam in TrueVision.\n"
)

# -----------------------------------------------------------------------------
# NEW FILE 1 - RENDER LAYER (adapted: DIV-2 import, console prefix)
# -----------------------------------------------------------------------------

RL_TV_NOTE = (
    "// PORT NOTE:\n"
    "// - Authored in   : TrueVision3D first (20-Sep-2026)\n"
    "// - ValeVision    : not yet ported. ValeVision keeps its composer running for a\n"
    "//                   drawing (DIV-1), so the two calls land in different places\n"
    "//                   there; the layer itself carries over as it stands.\n"
)
RL_VV_NOTE = (
    "// PORT NOTE:\n"
    "// - Ported from   : TrueVision3D " + FOG + "Na__ElevationDepthFog__RenderLayer__.js\n"
    "// - Source version: 1.0.0 (TrueVision3D v2.94.0, 20-Sep-2026; read at b2aa9151)\n"
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-03}}, with the fog's Dev row and its 3D wiring.\n"
    + DR01 +
    "// - Parity        : adapted. The layer is TrueVision's as it stands, as TrueVision's own note foresaw;\n"
    "//                   one import and its one call differ (DIV-2), and so do its callers (DIV-1).\n"
    "// - Divergences   :\n"
    "//   - Banner and console prefix read ValeVision3D.\n"
    "//   - The section cut's caps reach the depth pre-pass through Na__DrawView__SectionAdapter__RenderDepthInto\n"
    "//     (40__System__DrawingViewCore, over the live Cross Sections tool's cap root) in place of TrueVision's\n"
    "//     41__System__SectionCutEngine/Na__SectionCut__Engine__.js, which is never ported (DIV-2, R6 F.8 C25).\n"
    "//   - Callers (DIV-1). ValeVision draws a drawing through its composer, so ONE RenderOverlay call sits in\n"
    "//     Na__DrawView__RenderPreset__RenderFrame, after the composer and before the section overlay; the render\n"
    "//     loop's drawing branch and the card thumbnail both arrive there, and neither the loading sequence nor\n"
    "//     the thumbnail renderer calls it themselves. An image export calls it once per tile through the render\n"
    "//     preset's export overrides (renderDepthFog), before the tile's section overlay. The INTEGRATION lines\n"
    "//     above are TrueVision's.\n"
    "//   - Nothing calls RenderLayerFrame yet: the sheet's fog image and the snapshot renderer's borrowing of the\n"
    "//     source arrive with the Layout Editor packages (W2-12, W2-15).\n"
    "// - Back-port     : WT-02 (TrueVision lane, DR-36): TrueVision's twin section adapter gains RenderDepthInto as\n"
    "//                   a pass-through and this import points at it; the two files then differ by banner,\n"
    "//                   console prefix and this note only.\n"
)
RL_IMPORT_OLD = (
    "    // @delegate: ../41__System__SectionCutEngine/Na__SectionCut__Engine__.js\n"
    "    // ------------------------------------------------------------\n"
    "    import { Na__SectionCut__RenderDepthInto } from '../41__System__SectionCutEngine/Na__SectionCut__Engine__.js';\n"
)
RL_IMPORT_NEW = (
    "    // @delegate: ../40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js\n"
    "    // ------------------------------------------------------------\n"
    "    import { Na__DrawView__SectionAdapter__RenderDepthInto } from '../40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js';\n"
)
RL_CALL_OLD = "                Na__SectionCut__RenderDepthInto(camera);                         // <-- "
RL_CALL_NEW = "                Na__DrawView__SectionAdapter__RenderDepthInto(camera);           // <-- "

# -----------------------------------------------------------------------------
# NEW FILE 2 - DEV MENU ROW (verbatim)
# -----------------------------------------------------------------------------

ROW_TV_NOTE = (
    "// PORT NOTE:\n"
    "// - Authored in   : TrueVision3D first (20-Sep-2026)\n"
    "// - ValeVision    : not yet ported.\n"
)
ROW_VV_NOTE = (
    "// PORT NOTE:\n"
    "// - Ported from   : TrueVision3D " + FOG + "Na__ElevationDepthFog__DevMenu__Row__.js\n"
    "// - Source version: 1.0.0 (TrueVision3D v2.94.0, 20-Sep-2026; read at b2aa9151)\n"
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-03}}, with the fog's render layer and its 3D wiring.\n"
    + DR01 +
    "// - Parity        : verbatim, and inert until the Elevations Dev menu rebuild (W2-05) places it under View\n"
    "//                   depth and hands it the elevation's accessors; nothing imports it before then.\n"
    "// - Divergences   :\n"
    "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
    "// - Back-port     : none.\n"
)

# -----------------------------------------------------------------------------
# NEW FILE 3 - DEV MENU STYLESHEET (verbatim)
# -----------------------------------------------------------------------------

CSS_BANNER_OLD = "/* REGION  |  TrueVision3D - Elevation Depth Fog Dev Menu Styles     */\n"
CSS_BANNER_NEW = "/* REGION  |  ValeVision3D - Elevation Depth Fog Dev Menu Styles     */\n"
CSS_HEAD_OLD = (
    " * sits in; only what has no equivalent there is defined here.\n"
    " */\n"
    "/* ================================================================= */\n"
)
CSS_HEAD_NEW = CSS_HEAD_OLD + (
    "/*\n"
    "   PORT NOTE:\n"
    "   - Ported from   : TrueVision3D " + FOG + "Na__ElevationDepthFog__Styles__DevMenu__.css\n"
    "   - Source version: none of its own - the sheet as TrueVision3D v2.94.0 left it (20-Sep-2026, commit\n"
    "                     62dade1c; read at b2aa9151)\n"
    "   - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-03}}, with the fog's render layer and Dev row.\n"
    "                     TrueVision's fog plan still awaits Adam's test; it comes across under DR-01 (c),\n"
    "                     named as such.\n"
    "   - Parity        : verbatim (the rules are TrueVision's; the banner and this note are the only\n"
    "                     differences). Imported by 03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css\n"
    "                     after the elevation, north and drawing-plane Dev sheets and before the Drawing View\n"
    "                     Core sheet, where TrueVision's index has it.\n"
    "   - Divergences   :\n"
    "     - Banner reads ValeVision3D.\n"
    "   - Legacy        : TrueVision's copy of this sheet has no module version, so the Source version names\n"
    "                     the release and the commit instead.\n"
    "   - Back-port     : none.\n"
    "*/\n"
)


def banner(title):
    return ("// TRUEVISION3D - " + title + "\n", "// VALEVISION3D - " + title + "\n")


NEW_FILES = [
    {
        "rel": FOG + "Na__ElevationDepthFog__RenderLayer__.js",
        "seams": [
            ("banner (H1)", banner("ELEVATION DEPTH FOG - RENDER LAYER")[0], banner("ELEVATION DEPTH FOG - RENDER LAYER")[1], 1),
            ("PORT NOTE (H5)", RL_TV_NOTE, RL_VV_NOTE, 1),
            ("section caps import through the VV adapter (DIV-2)", RL_IMPORT_OLD, RL_IMPORT_NEW, 1),
            ("section caps call through the VV adapter (DIV-2)", RL_CALL_OLD, RL_CALL_NEW, 1),
            ("console prefix (C1)", "console.warn('[TrueVision3D] Elevation depth fog", "console.warn('[ValeVision3D] Elevation depth fog", 4),
        ],
    },
    {
        "rel": FOG + "Na__ElevationDepthFog__DevMenu__Row__.js",
        "seams": [
            ("banner (H1)", banner("ELEVATION DEPTH FOG - DEV MENU ROW")[0], banner("ELEVATION DEPTH FOG - DEV MENU ROW")[1], 1),
            ("PORT NOTE (H5)", ROW_TV_NOTE, ROW_VV_NOTE, 1),
        ],
    },
    {
        "rel": FOG + "Na__ElevationDepthFog__Styles__DevMenu__.css",
        "seams": [
            ("REGION banner token (H1)", CSS_BANNER_OLD, CSS_BANNER_NEW, 1),
            ("PORT NOTE comment block (H5)", CSS_HEAD_OLD, CSS_HEAD_NEW, 1),
        ],
    },
]

# -----------------------------------------------------------------------------
# EDIT 1 - ELEVATION MODE CONTROLLER (LF; TV 1.1.0's depth-fog hook replayed)
# -----------------------------------------------------------------------------

MC = "02__Src__AppModules/45__System__ElevationViews/Na__Elevation__ModeController__.js"
MC_EDITS = [
    ("PORT NOTE Source version: TV 1.1.0's hook",
     "// - Source version: 1.0.0 (TrueVision3D v2.18.0, 07-Sep-2026); TrueVision's file is at 1.1.0 (v2.94.0,\n"
     "//                   20-Sep-2026, the depth-fog source not yet taken; read at HEAD b2aa9151)\n"
     "// - Ported on     : 09-Sep-2026 for ValeVision3D v2.19.0 (port Phase 3)\n",
     "// - Source version: 1.1.0 (TrueVision3D v2.94.0, 20-Sep-2026; read at b2aa9151) - its depth-fog source hook,\n"
     "//                   replayed onto the 1.0.0 port of TrueVision3D v2.18.0 (07-Sep-2026)\n"
     "// - Ported on     : 09-Sep-2026 for ValeVision3D v2.19.0 (port Phase 3); the depth-fog hook on 02-Oct-2026\n"
     "//                   for ValeVision3D {{VVREL:W2-03}} (v2.94.0 not yet confirmed by Adam in TrueVision, DR-01 (c))\n"),
    ("PORT NOTE divergence: who draws the fog",
     "//   - Records read from the drawings block; live style application added.\n"
     "// - Back-port     : none pending.\n",
     "//   - Records read from the drawings block; live style application added.\n"
     "//   - The fog source it sets is drawn by Na__DrawView__RenderPreset__RenderFrame (DIV-1), which the render loop's\n"
     "//     drawing branch and the card thumbnail both call; TrueVision's render loop draws it itself.\n"
     "// - Back-port     : none pending.\n"),
    ("DEVELOPMENT LOG 1.1.3",
     "// DEVELOPMENT LOG:\n"
     "// 01-Oct-2026 - Version 1.1.2 (v2.71.2)\n",
     "// DEVELOPMENT LOG:\n"
     "// 02-Oct-2026 - Version 1.1.3 ({{VVREL:W2-03}})\n"
     "// - TrueVision's 1.1.0 depth-fog hook (TrueVision3D v2.94.0). Registering the\n"
     "//   drawing view hands the fog layer two closures over the live record - its\n"
     "//   fog, and its plane - and leaving elevation mode takes them away. The\n"
     "//   controller draws nothing itself: the render preset's RenderFrame does,\n"
     "//   on screen and in the card thumbnail alike.\n"
     "//\n"
     "// 01-Oct-2026 - Version 1.1.2 (v2.71.2)\n"),
    ("data import: the two fog accessors (TV order)",
     "        Na__ElevData__GetViewDepthMm,\n"
     "        Na__ElevData__IsSection,\n",
     "        Na__ElevData__GetViewDepthMm,\n"
     "        Na__ElevData__GetDepthFog,\n"
     "        Na__ElevData__GetDepthFogPlane,\n"
     "        Na__ElevData__IsSection,\n"),
    ("import: the fog layer's SetSource (TV position, after the gizmo import)",
     "    import { Na__ElevGizmo__Hide } from './Na__Elevation__PlaneGizmo__.js';\n"
     "    // ------------------------------------------------------------\n",
     "    import { Na__ElevGizmo__Hide } from './Na__Elevation__PlaneGizmo__.js';\n"
     "    // ------------------------------------------------------------\n"
     "\n"
     "    // MODULE IMPORTS | The Drawing's Depth Fog Layer\n"
     "    // ------------------------------------------------------------\n"
     "    // Only told WHOSE fog to draw. The render preset's RenderFrame - which the\n"
     "    // render loop's drawing branch and the card thumbnail both call - is what\n"
     "    // draws it, after the composer and before the cut fills.\n"
     "    // @delegate: ../49__System__ElevationDepthFog/Na__ElevationDepthFog__RenderLayer__.js\n"
     "    // ------------------------------------------------------------\n"
     "    import { Na__ElevFog__SetSource } from '../49__System__ElevationDepthFog/Na__ElevationDepthFog__RenderLayer__.js';\n"
     "    // ------------------------------------------------------------\n"),
    ("RegisterDrawingView: set the source (TV :465-474 verbatim)",
     "            panByPlaneUnits : (du, dv) => Na__ElevCam__PanByPlaneUnits(du, dv),\n"
     "            zoomByFactor    : Na__ElevCam__ZoomByFactor\n"
     "        });\n"
     "    }\n",
     "            panByPlaneUnits : (du, dv) => Na__ElevCam__PanByPlaneUnits(du, dv),\n"
     "            zoomByFactor    : Na__ElevCam__ZoomByFactor\n"
     "        });\n"
     "\n"
     "        // DEPTH FOG | The drawing on screen is the one whose fog is drawn. Two\n"
     "        // closures over the LIVE record, read by the fog layer on every frame,\n"
     "        // so a number typed in the Dev menu, a plane dragged in the 3D view and\n"
     "        // a draft reverted are all on screen with nothing told to refresh. The\n"
     "        // record's fog is off until its author asks, and an off fog costs the\n"
     "        // loop one null check.\n"
     "        Na__ElevFog__SetSource({\n"
     "            getSettings : () => Na__ElevData__GetDepthFog(elevation),\n"
     "            getPlane    : () => Na__ElevData__GetDepthFogPlane(elevation)\n"
     "        });\n"
     "    }\n"),
    ("ExitElevation: clear the source (TV :644 verbatim)",
     "        Na__DrawView__ClearActiveView();                                         // <-- 3D owns the viewport again\n",
     "        Na__DrawView__ClearActiveView();                                         // <-- 3D owns the viewport again\n"
     "        Na__ElevFog__SetSource(null);                                            // <-- And no drawing's fog follows it there\n"),
]

# -----------------------------------------------------------------------------
# EDIT 2 - RENDER PRESET (CRLF; DIV-1 twin: one fog call, the export member)
# -----------------------------------------------------------------------------

RP = "02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js"
RP_EDITS = [
    ("DESCRIPTION: the frame sequence names the fog",
     "// - Owns the ONE way a drawing frame is rendered: RenderFrame runs the 2D\n"
     "//   normals pre-pass, the composer, then the section overlay through the\n"
     "//   drawing camera. The render loop calls it each frame and the thumbnail\n"
     "//   renderer calls it for captures, so the card can never differ from the\n"
     "//   viewport.\n",
     "// - Owns the ONE way a drawing frame is rendered: RenderFrame runs the 2D\n"
     "//   normals pre-pass, the composer, the drawing's depth fog, then the section\n"
     "//   overlay through the drawing camera. The render loop calls it each frame\n"
     "//   and the thumbnail renderer calls it for captures, so the card can never\n"
     "//   differ from the viewport - fog included.\n"),
    ("INTEGRATION: the fog layer and the tiled renderer",
     "// - Na__AppFlow__LoadingSequence.js calls RenderFrame from the drawing branch.\n",
     "// - Na__AppFlow__LoadingSequence.js calls RenderFrame from the drawing branch.\n"
     "// - Na__ElevationDepthFog__RenderLayer__ draws the fog of whichever drawing\n"
     "//   its source names (the elevation mode controller sets it); the image\n"
     "//   export's tiled renderer calls GetExportOverrides().renderDepthFog per tile.\n"),
    ("PORT NOTE divergence: the depth fog (DIV-1)",
     "//   - RenderFrame takes an optional camera, as TV's RenderFrame(camera) does.\n"
     "// - Back-port     : none (the interface is the seam).\n",
     "//   - RenderFrame takes an optional camera, as TV's RenderFrame(camera) does.\n"
     "//   - Depth fog (DIV-1): RenderFrame draws Na__ElevFog__RenderOverlay between the composer and the section\n"
     "//     overlay, where TrueVision's flat render draws it between its silhouette overlay and its cut fills.\n"
     "//     GetExportOverrides is this app's export contract (camera, profile normals, frustum) and adds\n"
     "//     renderDepthFog for the tiled renderer; TrueVision's returns the drawing's style record and draws a\n"
     "//     sheet's fog through its snapshot renderer's callback route.\n"
     "// - Back-port     : none (the interface is the seam).\n"),
    ("DEVELOPMENT LOG 1.4.0",
     "// DEVELOPMENT LOG:\n"
     "// 01-Oct-2026 - Version 1.3.1 (drawing-folder renumber, v2.71.1)\n",
     "// DEVELOPMENT LOG:\n"
     "// 02-Oct-2026 - Version 1.4.0 (elevation depth fog, {{VVREL:W2-03}})\n"
     "// - RenderFrame lays the drawing's depth fog over the picture after the\n"
     "//   composer and before the section overlay: Na__ElevFog__RenderOverlay,\n"
     "//   TrueVision's own call, at the point of the sequence where TrueVision's\n"
     "//   RenderPreset 1.1.0 draws it (after the silhouettes, before the cut\n"
     "//   fills). The render loop's drawing branch and the card thumbnail both\n"
     "//   come through here, so one call covers both; with no fog source, or the\n"
     "//   drawing's fog off, nothing is drawn.\n"
     "// - GetExportOverrides gains renderDepthFog(camera): the same layer over one\n"
     "//   tile of an image export, which the tiled renderer calls per tile before\n"
     "//   the section overlay. Fog only - the overlay stays the tiled renderer's.\n"
     "//\n"
     "// 01-Oct-2026 - Version 1.3.1 (drawing-folder renumber, v2.71.1)\n"),
    ("import: the fog layer's RenderOverlay (TV's import line)",
     "    import { Na__PresentationMode__Thumbnail__SetFrameRenderer } from '../21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js';\n"
     "    // ------------------------------------------------------------\n",
     "    import { Na__PresentationMode__Thumbnail__SetFrameRenderer } from '../21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js';\n"
     "    // ------------------------------------------------------------\n"
     "\n"
     "    // MODULE IMPORTS | The Drawing's Depth Fog Layer\n"
     "    // ------------------------------------------------------------\n"
     "    // @delegate: ../49__System__ElevationDepthFog/Na__ElevationDepthFog__RenderLayer__.js\n"
     "    // ------------------------------------------------------------\n"
     "    import { Na__ElevFog__RenderOverlay } from '../49__System__ElevationDepthFog/Na__ElevationDepthFog__RenderLayer__.js';\n"
     "    // ------------------------------------------------------------\n"),
    ("RenderFrame: the function rule names the fog",
     "    // FUNCTION | Render One Drawing Frame (pre-pass, composer, section overlay)\n",
     "    // FUNCTION | Render One Drawing Frame (pre-pass, composer, depth fog, section overlay)\n"),
    ("RenderFrame: why the fog sits where it does",
     "    //   before. A different camera holds the composer's RenderPass for this\n"
     "    //   frame only.\n"
     "    // ------------------------------------------------------------\n"
     "    function Na__DrawView__RenderPreset__RenderFrame(camera) {\n",
     "    //   before. A different camera holds the composer's RenderPass for this\n"
     "    //   frame only.\n"
     "    //\n"
     "    // THE DEPTH FOG goes over the finished picture and under the cut fills:\n"
     "    // after the composer, so it fades the surfaces, the fat linework and the\n"
     "    // 2D profile lines alike; before the section overlay, so a poche - which\n"
     "    // lies ON the plane, in front of any fog - stays solid. Whose fog it is\n"
     "    // is the fog layer's business (Na__ElevFog__SetSource); with none it\n"
     "    // draws nothing and costs one null check.\n"
     "    // ------------------------------------------------------------\n"
     "    function Na__DrawView__RenderPreset__RenderFrame(camera) {\n"),
    ("RenderFrame: the one fog call (DIV-1)",
     "            Na__DrawPreset__Renderer.render(Na__DrawPreset__Scene, frameCamera);               // <-- No composer yet: plain render\n"
     "        }\n"
     "\n"
     "        const drawOverlay = Na__SectionClipping__GetOverlayRenderer();\n",
     "            Na__DrawPreset__Renderer.render(Na__DrawPreset__Scene, frameCamera);               // <-- No composer yet: plain render\n"
     "        }\n"
     "\n"
     "        Na__ElevFog__RenderOverlay(frameCamera);                                               // <-- The depth fog of whichever drawing the fog layer has been given; nothing when it has been given none\n"
     "\n"
     "        const drawOverlay = Na__SectionClipping__GetOverlayRenderer();\n"),
    ("GetExportOverrides: comment for the fog member",
     "    // drawing is cropped or extended sideways rather than rescaled.\n"
     "    // ------------------------------------------------------------\n"
     "    function Na__DrawView__RenderPreset__GetExportOverrides() {\n",
     "    // drawing is cropped or extended sideways rather than rescaled.\n"
     "    // renderDepthFog(camera) lays the drawing's depth fog over one finished\n"
     "    // tile through that tile's camera - FOG ONLY: the tiled renderer draws\n"
     "    // the section overlay itself, once per tile, straight after it.\n"
     "    // ------------------------------------------------------------\n"
     "    function Na__DrawView__RenderPreset__GetExportOverrides() {\n"),
    ("GetExportOverrides: the fog-only member",
     "            renderProfileNormals : Na__DrawPreset__RenderProfileNormals,\n",
     "            renderProfileNormals : Na__DrawPreset__RenderProfileNormals,\n"
     "            renderDepthFog       : (tileCamera) => Na__ElevFog__RenderOverlay(tileCamera || camera),   // <-- Per tile, after the composer and before the tiled renderer's section overlay\n"),
]

# -----------------------------------------------------------------------------
# EDIT 3 - TILED RENDERER (CRLF; per-tile fog, TV banner/MODULE, TilePlan re-export)
# -----------------------------------------------------------------------------

TR = "02__Src__AppModules/30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js"
TR_EDITS = [
    ("banner text (TV's, R2 B.3.1 / F.8 C26)",
     "// VALEVISION3D - IMAGE EXPORT - STATIC TILED EXPORT RENDERER\n",
     "// VALEVISION3D - IMAGE EXPORT - STATIC EXPORT TILED RENDERER\n"),
    ("MODULE line (TV's, F.8 C26)",
     "// MODULE     : Static Tiled Export Renderer\n",
     "// MODULE     : Image Export - Static Export Tiled Renderer\n"),
    ("DESCRIPTION bullet: the depth fog per tile; PORT NOTE",
     "// - All mutated renderer / composer / camera state is restored in finally.\n"
     "//\n"
     "// -----------------------------------------------------------------------------\n"
     "//\n"
     "// DEVELOPMENT LOG:\n",
     "// - A 2D drawing's depth fog (1.5.0) is laid over each tile's finished\n"
     "//   picture through the drawing's export overrides, before the tile's\n"
     "//   section overlay, so an exported elevation fades into the paper as it\n"
     "//   does on screen.\n"
     "// - All mutated renderer / composer / camera state is restored in finally.\n"
     "//\n"
     "// -----------------------------------------------------------------------------\n"
     "//\n"
     "// PORT NOTE:\n"
     "// - Authored in   : ValeVision3D first (1.0.0, 08-Jul-2026)\n"
     "// - Twin          : TrueVision3D 02__Src__AppModules/30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js\n"
     "//                   2.1.0 (read at b2aa9151), rebuilt in TrueVision from this file's 1.2.0\n"
     "// - Parity        : diverged (the same tile plan, gutter, sub-frustum and restore discipline; every tile here\n"
     "//                   goes through the live EffectComposer, DIV-1)\n"
     "// - Divergences   :\n"
     "//   - A 2D drawing brings its camera, profile normals, frustum and (1.5.0) depth fog in the render preset's\n"
     "//     export overrides; TrueVision's renderFrame callback route is not here (W2-12 adds it, opt-in, for the\n"
     "//     sheet's fog image).\n"
     "//   - Linework export scales, the vertical perspective correction shear and the Fog Plane per-tile refresh are\n"
     "//     this app's own systems.\n"
     "//   - The banner, the MODULE line and the tile planner re-exports are TrueVision's (1.5.0, R6 F.8 C26); the\n"
     "//     rest of TrueVision's header and its log are not taken: this file is not a whole-file port.\n"
     "// - Back-port     : none from this release.\n"
     "//\n"
     "// -----------------------------------------------------------------------------\n"
     "//\n"
     "// DEVELOPMENT LOG:\n"),
    ("DEVELOPMENT LOG 1.5.0 (this log runs oldest first)",
     "// - Ported from TrueVision3D 2.1.0 (v2.50.0).\n"
     "//\n",
     "// - Ported from TrueVision3D 2.1.0 (v2.50.0).\n"
     "//\n"
     "// 02-Oct-2026 - Version 1.5.0 ({{VVREL:W2-03}})\n"
     "// - DEPTH FOG PER TILE. When a 2D drawing's export overrides carry\n"
     "//   renderDepthFog (the render preset's, from this release), each tile calls\n"
     "//   it with the tile camera after the composer - or the supersampler's\n"
     "//   average - and before the section overlay: the order the screen draws\n"
     "//   in, so the fog fades surfaces and linework and a poche stays solid. Fog\n"
     "//   only; the section overlay is still drawn once per tile, here. A 3D\n"
     "//   export, and a drawing without fog, render exactly as before.\n"
     "// - TrueVision's banner and MODULE text, and its re-export of the tile\n"
     "//   planner's ClampToDeviceLimits and IsIosDevice in place of the two\n"
     "//   Na__StaticExport__ wrappers nothing imported (R6 F.8 C26, K2 X1).\n"
     "//\n"),
    ("the two Na__StaticExport__ wrappers go (F.8 C26)",
     "    // @delegate: ./Na__ImageExport__StaticExport__TilePlan__.js\n"
     "    // ------------------------------------------------------------\n"
     "\n"
     "\n"
     "    // FUNCTION | Clamp Requested Export Dimensions to Device Limits\n"
     "    // ------------------------------------------------------------\n"
     "    // Preserved as a public export for existing consumers; the maths\n"
     "    // itself lives in the shared tile planner.\n"
     "    // ------------------------------------------------------------\n"
     "    function Na__StaticExport__ClampToDeviceLimits(targetWidth, targetHeight) {\n"
     "        return Na__TilePlan__ClampToDeviceLimits(targetWidth, targetHeight);\n"
     "    }\n"
     "    // ------------------------------------------------------------\n"
     "\n"
     "\n"
     "    // FUNCTION | Detect iOS / iPadOS Devices\n"
     "    // ------------------------------------------------------------\n"
     "    // Preserved as a public export for existing consumers; the detection\n"
     "    // itself lives in the shared tile planner.\n"
     "    // ------------------------------------------------------------\n"
     "    function Na__StaticExport__IsIosDevice() {\n"
     "        return Na__TilePlan__IsIosDevice();\n"
     "    }\n"
     "    // ------------------------------------------------------------\n",
     "    // @delegate: ./Na__ImageExport__StaticExport__TilePlan__.js\n"
     "    // The planner's ClampToDeviceLimits and IsIosDevice are re-exported from\n"
     "    // this module under their own names (Module Exports), as TrueVision's\n"
     "    // copy of this file re-exports them (K2 X1).\n"
     "    // ------------------------------------------------------------\n"),
    ("per-tile depth fog, before the section overlay",
     "                    } else {\n"
     "                        renderer.render(scene, activeCamera);        // <-- Direct render fallback (no pipeline)\n"
     "                    }\n"
     "\n"
     "                    // CROSS SECTION OVERLAY | Caps + profile lines on this tile's\n",
     "                    } else {\n"
     "                        renderer.render(scene, activeCamera);        // <-- Direct render fallback (no pipeline)\n"
     "                    }\n"
     "\n"
     "                    // DEPTH FOG | A 2D drawing's own fog over this tile's finished\n"
     "                    // picture, through the tile's sub-frustum, BEFORE the cut fills\n"
     "                    // so a poche stays solid - the order the screen draws in. Fog\n"
     "                    // ONLY: the section overlay below is still drawn once, here.\n"
     "                    // After the average, as the overlay is: the fog reads this\n"
     "                    // tile's depth itself and lands on the canvas.\n"
     "                    if (isElevationMode && typeof elevationOverrides.renderDepthFog === 'function') {\n"
     "                        elevationOverrides.renderDepthFog(activeCamera);\n"
     "                    }\n"
     "\n"
     "                    // CROSS SECTION OVERLAY | Caps + profile lines on this tile's\n"),
    ("exports: TV's TilePlan re-export (K2 X1, F.8 C26)",
     "        Na__StaticExport__RenderToCanvas,\n"
     "        Na__StaticExport__ClampToDeviceLimits,\n"
     "        Na__StaticExport__IsIosDevice\n",
     "        Na__StaticExport__RenderToCanvas,\n"
     "        Na__TilePlan__ClampToDeviceLimits,\n"
     "        Na__TilePlan__IsIosDevice\n"),
]

# -----------------------------------------------------------------------------
# EDIT 4 - index.html (CRLF; import with the drawing imports, init after the planes block)
# -----------------------------------------------------------------------------

IX = "index.html"
IX_EDITS = [
    ("import: TV's line, last of the drawing-system imports",
     "    import { Na__NorthPick__Initialize } from './02__Src__AppModules/46__System__NorthDirection/Na__North__PickTool__.js';\n",
     "    import { Na__NorthPick__Initialize } from './02__Src__AppModules/46__System__NorthDirection/Na__North__PickTool__.js';\n"
     "    import { Na__ElevFog__Initialise } from './02__Src__AppModules/49__System__ElevationDepthFog/Na__ElevationDepthFog__RenderLayer__.js';\n"),
    ("init: TV's ELEVATION DEPTH FOG block, after the linework, editor and planes blocks",
     "    Na__PlaneUi__Initialize({ showToast : Na__UiFeature__ShowToast });\n"
     "    // ------------------------------------------------------------\n"
     "\n"
     "    // VIDEO STUDIO | Initialize path overlay, preview playback and dev controls\n",
     "    Na__PlaneUi__Initialize({ showToast : Na__UiFeature__ShowToast });\n"
     "    // ------------------------------------------------------------\n"
     "\n"
     "    // ELEVATION DEPTH FOG | A drawing's own fog, behind its plane, laid over the finished drawing as a render layer\n"
     "    // @delegate: ./02__Src__AppModules/49__System__ElevationDepthFog/\n"
     "    // Off on every drawing until its author switches it on in the drawing's Dev\n"
     "    // menu row, and nothing is allocated until one is: a project without fog\n"
     "    // pays one null check per drawing frame. The values are the drawing's own\n"
     "    // and are saved with it (Elevation__DepthFog). NOT localhost-only - a\n"
     "    // client opening a fogged elevation from the carousel sees it fogged.\n"
     "    Na__ElevFog__Initialise({ renderer : Na__Renderer__Main, scene : Na__Scene__Main });\n"
     "    // ------------------------------------------------------------\n"
     "\n"
     "    // VIDEO STUDIO | Initialize path overlay, preview playback and dev controls\n"),
]

# -----------------------------------------------------------------------------
# EDIT 5 - CSS index (CRLF; the fog sheet at TV's position)
# -----------------------------------------------------------------------------

CX = "03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css"
CX_EDITS = [
    ("group comment names the fog",
     "/* Floor Plans, Elevations, North, Drawing Planes, Plan Annotations, Plan Dimensions, then the Drawing View Core Dev rows: TrueVision's order (port Phases 2 and 3) */\n",
     "/* Floor Plans, Elevations, North, Drawing Planes, Elevation Depth Fog, Plan Annotations, Plan Dimensions, then the Drawing View Core Dev rows: TrueVision's order (port Phases 2 and 3) */\n"),
    ("the 49 Dev sheet after 47, before 43 and the DrawView sheet (TV :130)",
     "@import url('../02__Src__AppModules/47__System__DrawingPlanes/Na__DrawingPlanes__Styles__DevMenu__.css');",
     "@import url('../02__Src__AppModules/47__System__DrawingPlanes/Na__DrawingPlanes__Styles__DevMenu__.css');"),
]
# The second CSS edit inserts a whole line after the 47 line; done as a line insert below so the 47 line's own
# trailing comment is never retyped.
CX_LINE_AFTER = "@import url('../02__Src__AppModules/47__System__DrawingPlanes/Na__DrawingPlanes__Styles__DevMenu__.css');"
CX_NEW_LINE = ("@import url('../02__Src__AppModules/49__System__ElevationDepthFog/Na__ElevationDepthFog__Styles__DevMenu__.css');"
               "   /* <-- After the elevation and plane sheets: the Fog block sits inside a drawing's row and reuses its caption, button and input classes; before the Drawing View Core sheet, as TrueVision's index has it */")

EDITED = [(MC, MC_EDITS), (RP, RP_EDITS), (TR, TR_EDITS), (IX, IX_EDITS), (CX, CX_EDITS[:1])]


# -----------------------------------------------------------------------------
# Machinery
# -----------------------------------------------------------------------------

def sha(data):
    return hashlib.sha256(data).hexdigest()


def tv_bytes(rel):
    return subprocess.run(["git", "-C", NAWEB, "show", PIN + ":" + TV_APP + rel], capture_output=True, check=True).stdout


def vv_path(rel, root=VV_ROOT):
    return os.path.join(root, rel.replace("/", os.sep))


def replace_counted(data, name, old, new, expected, problems):
    count = data.count(old)
    if count != expected:
        problems.append("%s: expected %d match(es), found %d" % (name, expected, count))
        return data
    return data.replace(old, new)


def build_new(entry, problems):
    data = tv_bytes(entry["rel"])
    for name, old, new, expected in entry["seams"]:
        data = replace_counted(data, entry["rel"] + " | " + name, old.encode("utf-8"), new.encode("utf-8"), expected, problems)
    return data


def build_edit(rel, edits, data, problems):
    eol = b"\r\n" if b"\r\n" in data else b"\n"
    for name, old, new in edits:
        o = old.encode("utf-8").replace(b"\n", eol)
        n = new.encode("utf-8").replace(b"\n", eol)
        data = replace_counted(data, rel + " | " + name, o, n, 1, problems)
    if rel == CX:
        anchor = CX_LINE_AFTER.encode("utf-8")
        at = data.find(anchor)
        if at < 0 or data.count(anchor) != 1:
            problems.append(CX + " | 49 line insert: anchor not found exactly once")
        else:
            line_end = data.find(eol, at) + len(eol)
            data = data[:line_end] + CX_NEW_LINE.encode("utf-8") + eol + data[line_end:]
    return data


def compute():
    problems = []
    out_new = {}
    for entry in NEW_FILES:
        out_new[entry["rel"]] = build_new(entry, problems)
    pre = {}
    out_edit = {}
    for rel, edits in EDITED:
        with open(vv_path(rel), "rb") as f:
            data = f.read()
        pre[rel] = data
        out_edit[rel] = build_edit(rel, edits, data, problems)
    return problems, out_new, pre, out_edit


def write_tree(root, out_new, out_edit):
    for rel, data in list(out_new.items()) + list(out_edit.items()):
        p = vv_path(rel, root)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "wb") as f:
            f.write(data)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "--stage"

    if mode == "--restore":
        landed = json.load(open(LANDED))
        for rel, digest in landed["new"].items():
            p = vv_path(rel)
            if os.path.exists(p):
                if sha(open(p, "rb").read()) != digest:
                    sys.exit("REFUSED: %s changed since this script landed it" % rel)
        for rel, digest in landed["edit"].items():
            if sha(open(vv_path(rel), "rb").read()) != digest:
                sys.exit("REFUSED: %s changed since this script landed it" % rel)
        for rel in landed["edit"]:
            shutil.copyfile(os.path.join(BACKUP, rel.replace("/", "__")), vv_path(rel))
            print("restored", rel)
        for rel in landed["new"]:
            if os.path.exists(vv_path(rel)):
                os.remove(vv_path(rel))
                print("removed ", rel)
        return

    problems, out_new, pre, out_edit = compute()

    if mode == "--check":
        # New files: reverse every seam on the LIVE bytes and get TV's bytes back.
        bad = []
        for entry in NEW_FILES:
            live = open(vv_path(entry["rel"]), "rb").read()
            rev = live
            for name, old, new, expected in entry["seams"]:
                rev = replace_counted(rev, entry["rel"] + " | reverse " + name, new.encode("utf-8"), old.encode("utf-8"), expected, bad)
            if rev != tv_bytes(entry["rel"]):
                bad.append(entry["rel"] + ": reversed bytes differ from TV at the pin")
            if live != out_new[entry["rel"]]:
                bad.append(entry["rel"] + ": live bytes differ from what this script builds")
        landed = json.load(open(LANDED)) if os.path.exists(LANDED) else {"edit": {}}
        for rel, edits in EDITED:
            live = open(vv_path(rel), "rb").read()
            if rel in landed["edit"] and sha(live) != landed["edit"][rel]:
                bad.append(rel + ": changed since this script landed it")
            eol = b"\r\n" if b"\r\n" in live else b"\n"
            for name, old, new in edits:
                if live.count(new.encode("utf-8").replace(b"\n", eol)) != 1:
                    bad.append(rel + " | " + name + ": not in place exactly once")
            if live.count(b"\r\n") and live.count(b"\n") != live.count(b"\r\n"):
                bad.append(rel + ": mixed line endings")
        if rel == CX and live.count(CX_NEW_LINE.encode("utf-8")) != 1:
            bad.append(CX + ": 49 line not in place exactly once")
        print("CHECK PASS" if not bad else "CHECK FAIL\n  " + "\n  ".join(bad))
        sys.exit(0 if not bad else 1)

    if problems:
        print("PROBLEMS - nothing written:")
        for p in problems:
            print("  -", p)
        sys.exit(1)

    if mode == "--stage":
        if os.path.exists(STAGED):
            shutil.rmtree(STAGED)
        write_tree(STAGED, out_new, out_edit)
        for rel, data in list(out_new.items()) + list(out_edit.items()):
            print("staged %-100s %7d bytes" % (rel, len(data)))
        return

    if mode == "--apply":
        os.makedirs(BACKUP, exist_ok=True)
        for rel in out_new:
            if os.path.exists(vv_path(rel)):
                sys.exit("REFUSED: %s already exists" % rel)
        for rel, data in pre.items():
            b = os.path.join(BACKUP, rel.replace("/", "__"))
            if not os.path.exists(b):
                with open(b, "wb") as f:
                    f.write(data)
        landed = {"pre": {rel: sha(d) for rel, d in pre.items()}, "new": {}, "edit": {}}
        # Edited files first only after re-reading: refuse if anything moved since compute().
        for rel, data in pre.items():
            if open(vv_path(rel), "rb").read() != data:
                sys.exit("REFUSED: %s changed under this script" % rel)
        # New files first (leaves), then the importers.
        for rel, data in out_new.items():
            os.makedirs(os.path.dirname(vv_path(rel)), exist_ok=True)
            with open(vv_path(rel), "xb") as f:
                f.write(data)
            landed["new"][rel] = sha(data)
            print("new   ", rel, len(data))
        for rel, data in out_edit.items():
            if open(vv_path(rel), "rb").read() != pre[rel]:
                sys.exit("REFUSED (partial: run --restore): %s changed under this script" % rel)
            with open(vv_path(rel), "wb") as f:
                f.write(data)
            landed["edit"][rel] = sha(data)
            print("edited", rel, len(pre[rel]), "->", len(data))
        with open(LANDED, "w") as f:
            json.dump(landed, f, indent=1)
        return

    sys.exit("unknown mode " + mode)


if __name__ == "__main__":
    main()
