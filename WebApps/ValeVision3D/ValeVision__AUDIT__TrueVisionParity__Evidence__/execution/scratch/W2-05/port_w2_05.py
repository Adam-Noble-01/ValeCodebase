"""W2-05 - Elevations Dev menu rebuild (TV 2.1.0 editor and row builders, fog block included), the Cross Sections
placeholder (48), and ValeVision's own colliding Cross Section Tool ids renamed.

Builds the nine files of the package:
  - Elevation Editor and RowBuilders, 48 CrossSection Editor: TrueVision's bytes at b2aa9151 (git show), then ONLY the
    listed seams, each an exact replacement asserted to match exactly once.
  - Elevation AppConfig: TrueVision's text, ValeVision's description and section-filing keys, the ValeVision labels
    whose features stay; proven against the pre-port union.
  - Elevation stylesheet, data module, ThumbnailBake, 41 DevControls and index.html: ValeVision's current bytes
    (backup/) plus the listed hunks, each file in its own line ending.

Usage:
  python port_w2_05.py --out <dir>   write the results into <dir> (no live file touched)
  python port_w2_05.py --land        write them over the live files, refusing if any live file changed since backup/
  python port_w2_05.py --check       rebuild in memory and compare with the live files (CHECK PASS / FAIL)
  python port_w2_05.py --restore     put the backups back and remove the new 48 file (refuses if a landed file moved)
"""
import hashlib, json, os, subprocess, sys

PIN      = "b2aa9151"
TV_REPO  = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
TV_APP   = "na-apps/30__TrueVision__CoreAppCode/"
VV_ROOT  = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
SCRATCH  = os.path.join(VV_ROOT, r"ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W2-05")
BACKUP   = os.path.join(SCRATCH, "backup")
LANDED   = os.path.join(SCRATCH, "landed_sha256.json")

EV  = "02__Src__AppModules/45__System__ElevationViews/"
DVC = "02__Src__AppModules/40__System__DrawingViewCore/"
XS  = "02__Src__AppModules/48__System__CrossSectionViews/"
CSV = "02__Src__AppModules/41__System__CrossSectionView/"

TARGETS = {
    "editor"  : EV + "Na__Elevation__DevMenu__Editor__.js",
    "rows"    : EV + "Na__Elevation__DevMenu__RowBuilders__.js",
    "config"  : EV + "Na__Elevation__AppConfig__.json",
    "css"     : EV + "Na__Elevation__Styles__DevMenu__.css",
    "data"    : EV + "Na__Elevation__ProjectJson__Data__.js",
    "bake"    : DVC + "Na__DrawView__ThumbnailBake__.js",
    "xsec"    : XS + "Na__CrossSection__DevMenu__Editor__.js",
    "devctl"  : CSV + "Na__UiFeature__CrossSectionView__DevControls.js",
    "index"   : "index.html",
}
NEW_FILES = {"xsec"}
CRLF_FILES = {"devctl", "index"}

RULE = "// -----------------------------------------------------------------------------\n"


def tv_bytes(rel):
    return subprocess.run(["git", "-C", TV_REPO, "show", PIN + ":" + TV_APP + rel],
                          capture_output=True, check=True).stdout


def tv_text(rel):
    b = tv_bytes(rel)
    if b"\r\n" in b:
        raise SystemExit("TV file unexpectedly CRLF: " + rel)
    return b.decode("utf-8")


def backup_text(key):
    b = open(os.path.join(BACKUP, os.path.basename(TARGETS[key])), "rb").read()
    if key in CRLF_FILES:
        if b.count(b"\n") != b.count(b"\r\n"):
            raise SystemExit("mixed line endings in " + TARGETS[key])
        return b.decode("utf-8").replace("\r\n", "\n")
    if b"\r\n" in b:
        raise SystemExit("unexpected CRLF in " + TARGETS[key])
    return b.decode("utf-8")


def live_path(rel):
    return os.path.join(VV_ROOT, rel.replace("/", os.sep))


def apply(text, pairs, name):
    for i, (old, new) in enumerate(pairs):
        count = text.count(old)
        if count != 1:
            raise SystemExit("SEAM %s #%d matched %d times (expected 1):\n%r" % (name, i + 1, count, old[:240]))
        text = text.replace(old, new)
    return text


# =============================================================================
# ELEVATION EDITOR (TrueVision 2.1.0 whole + ValeVision's seams)
# =============================================================================

EDITOR_PORT_NOTE = (
    "//\n"
    "// PORT NOTE:\n"
    "// - Ported from   : TrueVision3D 02__Src__AppModules/45__System__ElevationViews/Na__Elevation__DevMenu__Editor__.js\n"
    "// - Source version: 2.1.0 (TrueVision3D v2.94.0, 20-Sep-2026; read at b2aa9151) - with 2.0.0 (v2.86.0) and\n"
    "//                   1.1.0 (v2.82.0). None of the three is confirmed by Adam in TrueVision yet; ported\n"
    "//                   under DR-01 (c)\n"
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-05}}, whole; first ported 09-Sep-2026 for\n"
    "//                   ValeVision3D v2.19.0 (port Phase 3)\n"
    "// - Parity        : adapted\n"
    "// - Divergences   :\n"
    "//   - Banner and console prefix read ValeVision3D.\n"
    "//   - The live cut goes through Na__DrawView__SectionAdapter__SetPlaneDistanceMm (DIV-2), not TrueVision's\n"
    "//     41__System__SectionCutEngine.\n"
    "//   - Sections filed by drawing type (D28, DR-26): a section's card belongs in the Cross Sections group and\n"
    "//     an elevation's in Elevations. Update moves the card (Na__ElevLink__SyncSceneGroup) in the save that\n"
    "//     keeps the new type, as it brings the card's camera into step, so nothing of a draft reaches the\n"
    "//     presentation block early; the card status names the group the type files into. Kept until\n"
    "//     TrueVision's 48 Cross Sections system passes 0.1.0.\n"
    "//   - Styles and Exclusions sit under each row's Advanced fold; a style change re-applies the presets to\n"
    "//     the elevation on screen through Na__ElevationMode__ApplyStyles. Both are draft edits (D33, DR-32).\n"
    "//   - Thumbnail bake (Na__DrawView__ThumbnailBake__, v2.46.0): an elevation added, seeded or given a card\n"
    "//     is queued for a baked thumbnail, the run saving once through the draft guard's SaveBlock; Bake\n"
    "//     Missing Thumbnails in the panel foot; Update waits while a bake is flipping drawings on screen (DR-32).\n"
    "//   - Update bakes projected linework (Na__PlStore__BakeBeforeSave) before its save (D20, DR-32), until\n"
    "//     ValeVision adopts TrueVision's publish-time bake (DR-22).\n"
    "// - History       : ValeVision's own 1.1.0 and 1.2.0 (09-Sep and 15-Sep-2026: drawings-block save, section\n"
    "//                   adapter, Pick Face and the gizmo grip, section filing, R2 thumbnails, style handlers,\n"
    "//                   linework and thumbnail bakes) are superseded by this port. Pick Face, Re-pick and the\n"
    "//                   grip gave way to the Drawing Planes' Aim at face, Move to face and drag; what survives\n"
    "//                   is the Divergences above.\n"
    "// - Back-port     : section filing, the style rows and the thumbnail bake (WT-06, WT-09); not the\n"
    "//                   linework bake (TrueVision bakes drawings at publish time).\n"
    "//\n"
    + RULE +
    "//\n"
    "// DEVELOPMENT LOG:\n"
)

EDITOR_VV_IMPORTS = (
    "    // MODULE IMPORTS | ValeVision: Thumbnail Bake and Projected Linework Bake (DR-32)\n"
    "    // ------------------------------------------------------------\n"
    "    // @delegate: ../40__System__DrawingViewCore/Na__DrawView__ThumbnailBake__.js\n"
    "    // @delegate: ../50__System__ProjectedLinework/Na__ProjectedLinework__Persistence__.js\n"
    "    // ------------------------------------------------------------\n"
    "    import {\n"
    "        Na__DrawThumb__Queue,\n"
    "        Na__DrawThumb__FindMissing,\n"
    "        Na__DrawThumb__IsBusy\n"
    "    } from '../40__System__DrawingViewCore/Na__DrawView__ThumbnailBake__.js';\n"
    "    import { Na__PlStore__BakeBeforeSave } from '../50__System__ProjectedLinework/Na__ProjectedLinework__Persistence__.js';\n"
    "    // ------------------------------------------------------------\n"
    "\n"
    "    // MODULE IMPORTS | Drawing Planes (the planes shown in the 3D view)\n"
)

EDITOR_VV_REGION = (
    "// -----------------------------------------------------------------------------\n"
    "// REGION | ValeVision Additions - Thumbnail Bake\n"
    "// -----------------------------------------------------------------------------\n"
    "\n"
    "    // HELPER FUNCTION | How the Thumbnail Bake Opens, Checks and Closes an Elevation\n"
    "    // ------------------------------------------------------------\n"
    "    // Opening is what the Preview button does, face pick cancelled first.\n"
    "    // ------------------------------------------------------------\n"
    "    function Na__ElevDev__ThumbAdapter() {\n"
    "        return {\n"
    "            kind         : 'elevation',\n"
    "            enter        : (elevation) => {\n"
    "                Na__PlaneGrip__CancelFacePick(Na__PlaneUi__TYPE_ELEVATION);\n"
    "                return Na__ElevationMode__EnterElevation(elevation);\n"
    "            },\n"
    "            isShowing    : (elevation) => Na__ElevDev__IsPreviewing(elevation),\n"
    "            getActive    : () => (Na__ElevationMode__IsActive() ? Na__ElevationMode__GetActiveElevation() : null),\n"
    "            exit         : () => Na__ElevationMode__ExitElevation(null),\n"
    "            storeFraming : () => Na__ElevationMode__StoreActiveFraming()\n"
    "        };\n"
    "    }\n"
    "    // ------------------------------------------------------------\n"
    "\n"
    "\n"
    "    // HELPER FUNCTION | An Elevation as a Bake Item (null when it has no card)\n"
    "    // ------------------------------------------------------------\n"
    "    function Na__ElevDev__ThumbItem(elevation) {\n"
    "        const config = Na__ElevDev__GetConfig();\n"
    "        const scene  = (config && elevation) ? Na__ElevData__FindSceneFor(config, elevation) : null;\n"
    "        return scene ? { drawing : elevation, sceneId : scene.PresentationMode__Scene__Id, label : elevation.Elevation__Name } : null;\n"
    "    }\n"
    "    // ------------------------------------------------------------\n"
    "\n"
    "\n"
    "    // HELPER FUNCTION | The Bake's One Save: the Drawings Block, Guarded\n"
    "    // ------------------------------------------------------------\n"
    "    // There is no Save Elevations any more. A bake writes the framing and the\n"
    "    // card's picture through SaveBlock, so a row still being edited goes out\n"
    "    // as it was last updated - the bake never keeps a half-moved elevation.\n"
    "    // ------------------------------------------------------------\n"
    "    function Na__ElevDev__ThumbSave() {\n"
    "        const report = {};\n"
    "        return Na__DrawDraft__SaveBlock(Na__ElevDev__RelayErrors, report);\n"
    "    }\n"
    "    // ------------------------------------------------------------\n"
    "\n"
    "\n"
    "    // FUNCTION | Bake the Thumbnails of Elevations Just Added (one run, one save)\n"
    "    // ------------------------------------------------------------\n"
    "    function Na__ElevDev__QueueThumbnails(elevations) {\n"
    "        const items = (elevations || []).map(Na__ElevDev__ThumbItem).filter(Boolean);\n"
    "        return Na__DrawThumb__Queue({ items : items, adapter : Na__ElevDev__ThumbAdapter(), save : Na__ElevDev__ThumbSave, showToast : Na__ElevDev__ShowToast });\n"
    "    }\n"
    "    // ------------------------------------------------------------\n"
    "\n"
    "\n"
    "    // FUNCTION | Bake Every Elevation Card Whose Picture Does Not Load\n"
    "    // ------------------------------------------------------------\n"
    "    async function Na__ElevDev__BakeMissingThumbnails() {\n"
    "        const items   = Na__ElevData__GetElevations(null).map(Na__ElevDev__ThumbItem).filter(Boolean);\n"
    "        const missing = await Na__DrawThumb__FindMissing(items);\n"
    "        if (missing.length === 0) {\n"
    "            Na__ElevDev__Toast(items.length === 0 ? 'No elevation has a carousel card to bake a thumbnail for.' : 'Every elevation card already has a picture.');\n"
    "            return 0;\n"
    "        }\n"
    "        Na__DrawThumb__Queue({ items : missing, adapter : Na__ElevDev__ThumbAdapter(), save : Na__ElevDev__ThumbSave, showToast : Na__ElevDev__ShowToast });\n"
    "        return missing.length;\n"
    "    }\n"
    "    // ------------------------------------------------------------\n"
    "\n"
    "// endregion -------------------------------------------------------------------\n"
    "\n"
    "\n"
    "// -----------------------------------------------------------------------------\n"
    "// REGION | Panel Mutations\n"
    "// -----------------------------------------------------------------------------\n"
)


def build_editor():
    text = tv_text(EV + "Na__Elevation__DevMenu__Editor__.js")
    pairs = [
        # 1 Banner (K2 H1)
        ("// TRUEVISION3D - ELEVATION VIEWS - DEV MENU EDITOR\n",
         "// VALEVISION3D - ELEVATION VIEWS - DEV MENU EDITOR\n"),
        # 2 PORT NOTE (K2 H5) - TrueVision's file has none
        ("//\n" + RULE + "//\n// DEVELOPMENT LOG:\n", "//\n" + RULE + EDITOR_PORT_NOTE),
        # 3 Section cut through the adapter (DIV-2)
        ("    import {\n        Na__SectionCut__SetPlaneDistanceMm\n    } from '../41__System__SectionCutEngine/Na__SectionCut__Engine__.js';\n",
         "    // @delegate: ../40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js\n"
         "    import {\n        Na__DrawView__SectionAdapter__SetPlaneDistanceMm\n    } from '../40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js';\n"),
        ("        Na__SectionCut__SetPlaneDistanceMm(\n",
         "        Na__DrawView__SectionAdapter__SetPlaneDistanceMm(\n"),
        # 4 Section filing: the section target group (D28)
        ("        Na__ElevCfg__GetSceneGroupTarget\n    } from './Na__Elevation__ConfigState__.js';\n",
         "        Na__ElevCfg__GetSceneGroupTarget,\n        Na__ElevCfg__GetSectionGroupTarget\n    } from './Na__Elevation__ConfigState__.js';\n"),
        ("        Na__ElevLink__RemoveSceneForElevation,\n        Na__ElevLink__SyncSceneCamera\n    } from './Na__Elevation__SceneLink__.js';\n",
         "        Na__ElevLink__RemoveSceneForElevation,\n        Na__ElevLink__SyncSceneCamera,\n        Na__ElevLink__SyncSceneGroup\n    } from './Na__Elevation__SceneLink__.js';\n"),
        # 5 Mode controller: ApplyStyles for the style rows (D33)
        ("        Na__ElevationMode__IsEditMode,\n        Na__ElevationMode__IsActive,\n",
         "        Na__ElevationMode__IsEditMode,\n        Na__ElevationMode__ApplyStyles,\n        Na__ElevationMode__IsActive,\n"),
        # 6 ValeVision imports: the two bakes
        ("    // MODULE IMPORTS | Drawing Planes (the planes shown in the 3D view)\n", EDITOR_VV_IMPORTS),
        # 7 Console prefix (K2 C1)
        ("console.error('[TrueVision3D] Elevation thumbnail error:', shotError);",
         "console.error('[ValeVision3D] Elevation thumbnail error:', shotError);"),
        ("console.error('[TrueVision3D] Elevation update error:', error);",
         "console.error('[ValeVision3D] Elevation update error:', error);"),
        # 8 The card status names the group the drawing type files into (D28)
        ("            groupName   : Na__ElevCfg__GetSceneGroupTarget().groupName,\n"
         "            drawingWord : 'elevation',\n",
         "            groupName   : (Na__ElevData__IsSection(elevation)                     // <-- ValeVision: a section is filed in Cross Sections (D28)\n"
         "                ? Na__ElevCfg__GetSectionGroupTarget() : Na__ElevCfg__GetSceneGroupTarget()).groupName,\n"
         "            drawingWord : Na__ElevData__IsSection(elevation) ? 'section' : 'elevation',\n"),
        # 9 Card created: its picture is baked
        ("                    Na__ElevDev__Toast('Added \"' + elevation.Elevation__Name + '\" to the scene carousel. ' + where.text, where.isError);\n"
         "                }\n"
         "                Na__ElevDev__Render();\n",
         "                    Na__ElevDev__Toast('Added \"' + elevation.Elevation__Name + '\" to the scene carousel. ' + where.text, where.isError);\n"
         "                }\n"
         "                Na__ElevDev__Render();\n"
         "                Na__ElevDev__QueueThumbnails([ elevation ]);                     // <-- ValeVision: the new card needs its picture (v2.46.0)\n"),
        # 10 Style rows' handlers (D33)
        ("            onFogChange : () => {\n"
         "                Na__RenderLoop__RequestRender();\n"
         "                Na__ElevDev__AfterEdit(elevation, false);\n"
         "            },\n",
         "            onFogChange : () => {\n"
         "                Na__RenderLoop__RequestRender();\n"
         "                Na__ElevDev__AfterEdit(elevation, false);\n"
         "            },\n"
         "\n"
         "            // VALEVISION | The Advanced fold's style rows (D33). Styles re-apply\n"
         "            // live to the elevation on screen; exclusions matter only to the\n"
         "            // projection stage, which reads them when it next runs. Both are\n"
         "            // draft edits, kept by Update like everything else.\n"
         "            onStyleChange : () => {\n"
         "                if (isActive) Na__ElevationMode__ApplyStyles(elevation);\n"
         "                Na__ElevDev__AfterEdit(elevation, false);\n"
         "            },\n"
         "            onExclusionsChange : () => Na__ElevDev__AfterEdit(elevation, false),\n"),
        # 11 Update waits for a running thumbnail bake
        ("    async function Na__ElevDev__UpdateElevation(elevation) {\n        if (Na__ElevDev__Busy) return false;\n",
         "    async function Na__ElevDev__UpdateElevation(elevation) {\n        if (Na__ElevDev__Busy) return false;\n"
         "        if (Na__DrawThumb__IsBusy()) {                                           // <-- ValeVision: a bake is flipping drawings on screen\n"
         "            Na__ElevDev__Toast('Thumbnails are still being baked. Press Update again when they have finished.', true);\n"
         "            return false;\n"
         "        }\n"),
        # 12 Update: the card joins the group its type files into (D28); projected linework baked first (D20)
        ("            if (config) Na__ElevLink__SyncSceneCamera(config, elevation, Na__ElevDev__Measure(elevation), Na__ElevDev__Fov());\n"
         "            staged = await Na__DrawRename__StageElevation(elevation);\n",
         "            if (config) Na__ElevLink__SyncSceneCamera(config, elevation, Na__ElevDev__Measure(elevation), Na__ElevDev__Fov());\n"
         "\n"
         "            // VALEVISION | Sections filed by drawing type (D28). The card moves\n"
         "            // in the same save that keeps the new type - never on the button\n"
         "            // press, which is a draft the presentation block must not carry.\n"
         "            if (config) Na__ElevLink__SyncSceneGroup(config, elevation);\n"
         "            staged = await Na__DrawRename__StageElevation(elevation);\n"
         "\n"
         "            // VALEVISION | Projected linework baked first, so the records carry\n"
         "            // their assets (D20). Never throws and never blocks the save.\n"
         "            await Na__PlStore__BakeBeforeSave(Na__ElevDev__ShowToast);\n"),
        # 13 The ValeVision region, ahead of Panel Mutations
        ("// -----------------------------------------------------------------------------\n"
         "// REGION | Panel Mutations\n"
         "// -----------------------------------------------------------------------------\n",
         EDITOR_VV_REGION),
        # 14 Add: the new card's picture is baked
        ("            Na__ElevDev__Toast('\"' + elevation.Elevation__Name + '\" added. ' + where.text + ' Point it with Aim at face.', where.isError);\n"
         "        }\n"
         "        return elevation;\n",
         "            Na__ElevDev__Toast('\"' + elevation.Elevation__Name + '\" added. ' + where.text + ' Point it with Aim at face.', where.isError);\n"
         "        }\n"
         "        Na__ElevDev__QueueThumbnails([ elevation ]);                             // <-- ValeVision: a card without a picture is a broken image\n"
         "        return elevation;\n"),
        # 15 Seed: keep the elevations made, then bake their cards in one run
        ("        let made = 0;\n"
         "        for (let i = 0; i < presets.length; i++) {\n"
         "            if (Na__ElevDev__CreateOne(config, {\n"
         "                azimuthDeg : presets[i].azimuthDeg,\n"
         "                originXMm  : centred.xMm,\n"
         "                originZMm  : centred.zMm\n"
         "            })) made++;\n"
         "        }\n",
         "        let made = 0;\n"
         "        const seeded = [];                                                       // <-- ValeVision: the elevations whose cards get a baked thumbnail\n"
         "        for (let i = 0; i < presets.length; i++) {\n"
         "            const seededElevation = Na__ElevDev__CreateOne(config, {\n"
         "                azimuthDeg : presets[i].azimuthDeg,\n"
         "                originXMm  : centred.xMm,\n"
         "                originZMm  : centred.zMm\n"
         "            });\n"
         "            if (seededElevation) { made++; seeded.push(seededElevation); }\n"
         "        }\n"),
        ("            Na__ElevDev__Toast('Created ' + made + ' elevation(s) around the building. ' + where.text, where.isError);\n"
         "        }\n"
         "        return made;\n",
         "            Na__ElevDev__Toast('Created ' + made + ' elevation(s) around the building. ' + where.text, where.isError);\n"
         "        }\n"
         "        Na__ElevDev__QueueThumbnails(seeded);                                    // <-- ValeVision: one bake run for the lot\n"
         "        return made;\n"),
        # 16 Bake Missing Thumbnails in the foot
        ("            'One elevation for each side of the building, named from the project\\'s north',\n"
         "            () => { void Na__ElevDev__SeedFourSides(); }\n"
         "        ));\n",
         "            'One elevation for each side of the building, named from the project\\'s north',\n"
         "            () => { void Na__ElevDev__SeedFourSides(); }\n"
         "        ));\n"
         "        actions.appendChild(Na__DrawShell__Button(                               // <-- ValeVision: cards that never had a picture (v2.46.0)\n"
         "            Na__ElevCfg__GetLabel('BakeThumbnailsLabel', 'Bake Missing Thumbnails'), '',\n"
         "            'Bake a thumbnail for every elevation card whose picture does not load. Hand-framed thumbnails are left alone.',\n"
         "            () => { void Na__ElevDev__BakeMissingThumbnails(); }\n"
         "        ));\n"),
    ]
    return apply(text, pairs, "editor")


# =============================================================================
# ROW BUILDERS (TrueVision 2.1.0 whole + the style rows in the Advanced fold)
# =============================================================================

ROWS_PORT_NOTE = (
    "//\n"
    "// PORT NOTE:\n"
    "// - Ported from   : TrueVision3D 02__Src__AppModules/45__System__ElevationViews/Na__Elevation__DevMenu__RowBuilders__.js\n"
    "// - Source version: 2.1.0 (TrueVision3D v2.94.0, 20-Sep-2026; read at b2aa9151) - with 2.0.0 (v2.86.0).\n"
    "//                   Neither is confirmed by Adam in TrueVision yet; ported under DR-01 (c)\n"
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-05}}, whole; first ported 09-Sep-2026 for\n"
    "//                   ValeVision3D v2.19.0 (port Phase 3)\n"
    "// - Parity        : adapted\n"
    "// - Divergences   :\n"
    "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
    "//   - The Advanced fold holds, under the model bearing, the Styles toggles and the Exclude field, built by\n"
    "//     the shared Na__DrawView__StyleRows__ with the elevation record's accessors; the editor's\n"
    "//     onStyleChange and onExclusionsChange handlers take the edits (D33, DR-32).\n"
    "// - History       : ValeVision's own 1.1.0 (09-Sep-2026: Re-pick beside the compass, the styles row and the\n"
    "//                   exclusion field) is superseded by this port; the style rows live on as the seam above.\n"
    "// - Back-port     : the style rows, once TrueVision carries per-drawing styles (WT-09).\n"
    "//\n"
    + RULE +
    "//\n"
    "// DEVELOPMENT LOG:\n"
)

ROWS_VV_IMPORTS = (
    "    } from '../40__System__DrawingViewCore/Na__DrawView__DevRowShell__.js';\n"
    "    // ------------------------------------------------------------\n"
    "\n"
    "    // MODULE IMPORTS | ValeVision: the Shared Style Rows and the Elevation's Style Accessors (D33)\n"
    "    // ------------------------------------------------------------\n"
    "    // @delegate: ../40__System__DrawingViewCore/Na__DrawView__StyleRows__.js\n"
    "    // ------------------------------------------------------------\n"
    "    import {\n"
    "        Na__DrawStyleRow__BuildStylesRow,\n"
    "        Na__DrawStyleRow__BuildExclusionsRow\n"
    "    } from '../40__System__DrawingViewCore/Na__DrawView__StyleRows__.js';\n"
    "    import {\n"
    "        Na__ElevData__GetStyles,\n"
    "        Na__ElevData__SetStyle,\n"
    "        Na__ElevData__GetExcludeTokens,\n"
    "        Na__ElevData__SetExcludeTokens\n"
    "    } from './Na__Elevation__ProjectJson__Data__.js';\n"
    "    // ------------------------------------------------------------\n"
)


def build_rows():
    text = tv_text(EV + "Na__Elevation__DevMenu__RowBuilders__.js")
    pairs = [
        ("// TRUEVISION3D - ELEVATION VIEWS - DEV MENU ROW BUILDERS\n",
         "// VALEVISION3D - ELEVATION VIEWS - DEV MENU ROW BUILDERS\n"),
        ("//\n" + RULE + "//\n// DEVELOPMENT LOG:\n", "//\n" + RULE + ROWS_PORT_NOTE),
        ("    } from '../40__System__DrawingViewCore/Na__DrawView__DevRowShell__.js';\n"
         "    // ------------------------------------------------------------\n",
         ROWS_VV_IMPORTS),
        ("    const Na__ElevRow__AZIMUTH_MAX    = 359;\n"
         "    // ------------------------------------------------------------\n",
         "    const Na__ElevRow__AZIMUTH_MAX    = 359;\n"
         "    // ------------------------------------------------------------\n"
         "\n"
         "    // MODULE CONSTANTS | ValeVision: Style Row Accessors (the elevation record's own, D33)\n"
         "    // ------------------------------------------------------------\n"
         "    const Na__ElevRow__STYLE_ACCESSORS = Object.freeze({\n"
         "        getStyles : Na__ElevData__GetStyles,\n"
         "        setStyle  : Na__ElevData__SetStyle,\n"
         "        getTokens : Na__ElevData__GetExcludeTokens,\n"
         "        setTokens : Na__ElevData__SetExcludeTokens,\n"
         "        getLabel  : Na__ElevCfg__GetLabel\n"
         "    });\n"
         "    // ------------------------------------------------------------\n"),
        ("    //   onPreviewToggle, onAnnotate, onUpdate, onRevert\n    // }\n",
         "    //   onPreviewToggle, onAnnotate, onUpdate, onRevert,\n"
         "    //   onStyleChange, onExclusionsChange   (ValeVision: the Advanced fold's style rows)\n"
         "    // }\n"),
        ("        advanced.body.appendChild(bearing.wrapper);\n"
         "        rowRoot.appendChild(advanced.element);\n",
         "        advanced.body.appendChild(bearing.wrapper);\n"
         "\n"
         "        // ValeVision: the drawing's styles and the categories left out of its\n"
         "        // linework - set once, rarely revisited, and read by the Layout\n"
         "        // Editor viewports of this elevation too (D33).\n"
         "        advanced.body.appendChild(Na__DrawStyleRow__BuildStylesRow(elevation, Na__ElevRow__STYLE_ACCESSORS, handlers.onStyleChange));\n"
         "        advanced.body.appendChild(Na__DrawStyleRow__BuildExclusionsRow(elevation, Na__ElevRow__STYLE_ACCESSORS, handlers.onExclusionsChange));\n"
         "        rowRoot.appendChild(advanced.element);\n"),
    ]
    return apply(text, pairs, "rows")


# =============================================================================
# CROSS SECTIONS PLACEHOLDER (48, TrueVision 0.1.0 verbatim + banner and PORT NOTE)
# =============================================================================

XSEC_PORT_NOTE_OLD = (
    "// PORT NOTE:\n"
    "// - Authored in   : TrueVision3D first (20-Sep-2026)\n"
    "// - ValeVision    : not yet ported.\n"
)
XSEC_PORT_NOTE_NEW = (
    "// PORT NOTE:\n"
    "// - Ported from   : TrueVision3D 02__Src__AppModules/48__System__CrossSectionViews/Na__CrossSection__DevMenu__Editor__.js\n"
    "// - Source version: 0.1.0 (TrueVision3D v2.86.0, 20-Sep-2026; read at b2aa9151) - not confirmed by Adam in\n"
    "//                   TrueVision yet; ported under DR-01 (c)\n"
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-05}}\n"
    "// - Parity        : verbatim. Its DOM ids are TrueVision's: ValeVision's own Cross Section Tool gate gave\n"
    "//                   them up and is naCrossSectionToolDev* (K2 S4, DR-26).\n"
    "// - Divergences   :\n"
    "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
    "// - Back-port     : none.\n"
)


def build_xsec():
    text = tv_text(XS + "Na__CrossSection__DevMenu__Editor__.js")
    pairs = [
        ("// TRUEVISION3D - CROSS SECTION VIEWS - DEV MENU EDITOR (PLACEHOLDER)\n",
         "// VALEVISION3D - CROSS SECTION VIEWS - DEV MENU EDITOR (PLACEHOLDER)\n"),
        (XSEC_PORT_NOTE_OLD, XSEC_PORT_NOTE_NEW),
    ]
    return apply(text, pairs, "xsec")


# =============================================================================
# APP CONFIG (TrueVision's text; ValeVision's description, section filing and live labels)
# =============================================================================

VV_LABELS_DROPPED = [   # ValeVision-only labels of the 1.x editor whose features left with it
    "PresetNameFormat", "DirectionFieldLabel", "ThumbnailLabel", "DeleteElevationPrompt", "SaveLabel",
    "SavedMessage", "SaveFailedMessage", "PickFaceLabel", "RepickLabel", "PickCancelLabel", "PickingHint",
    "PickNeeds3dMessage", "GripHint",
]
TV_DESCRIPTIONS = [     # shared descriptions that now describe TrueVision's editor in both apps
    ("ElevationViews__Plane__Config", "ElevationViews__Plane__Description"),
    ("ElevationViews__Gizmo__Config", "ElevationViews__Gizmo__Description"),
    ("ElevationViews__FacePick__Config", "ElevationViews__FacePick__Description"),
    ("ElevationViews__Grip__Config", "ElevationViews__Grip__Description"),
]


def build_config():
    text = tv_text(EV + "Na__Elevation__AppConfig__.json")
    live = json.loads(backup_text("config"))
    vv_desc = live["ElevationViews__Description"]
    vv_group_desc = live["ElevationViews__SceneGroup__Config"]["ElevationViews__SceneGroup__Description"]
    tv = json.loads(text)
    pairs = [
        ('    "ElevationViews__Description": ' + json.dumps(tv["ElevationViews__Description"]) + ',\n',
         '    "ElevationViews__Description": ' + json.dumps(vv_desc) + ',\n'),
        ('        "ElevationViews__SceneGroup__Description": '
         + json.dumps(tv["ElevationViews__SceneGroup__Config"]["ElevationViews__SceneGroup__Description"]) + ',\n',
         '        "ElevationViews__SceneGroup__Description": ' + json.dumps(vv_group_desc) + ',\n'),
        ('        "ElevationViews__SceneGroup__AutoEnableTargetGroup": true\n',
         '        "ElevationViews__SceneGroup__AutoEnableTargetGroup": true,\n'
         '        "ElevationViews__SceneGroup__SectionTargetGroupName": "Cross Sections",\n'
         '        "ElevationViews__SceneGroup__SectionTargetGroupId": "Group_006"\n'),
        ('        "ElevationViews__Labels__DeleteLabel": "Delete Elevation",\n',
         '        "ElevationViews__Labels__DeleteLabel": "Delete Elevation",\n'
         '        "ElevationViews__Labels__BakeThumbnailsLabel": "Bake Missing Thumbnails",\n'),
        ('        "ElevationViews__Labels__CutDepthReadoutFormat": "cut {depth} mm into the model"\n',
         '        "ElevationViews__Labels__CutDepthReadoutFormat": "cut {depth} mm into the model",\n'
         '        "ElevationViews__Labels__StylesTitle": "Styles",\n'
         '        "ElevationViews__Labels__StyleProjectedLineworkLabel": "Projected Linework",\n'
         '        "ElevationViews__Labels__StyleProfileLineworkLabel": "Profile Linework Effect",\n'
         '        "ElevationViews__Labels__StyleGlassOpaqueLabel": "Glass Transparency Off",\n'
         '        "ElevationViews__Labels__StyleWhitecardLabel": "Whitecard",\n'
         '        "ElevationViews__Labels__ExclusionsFieldLabel": "Exclude",\n'
         '        "ElevationViews__Labels__ExclusionsPlaceholder": "Default list"\n'),
    ]
    out = apply(text, pairs, "config")

    # PROOF 1 | The pre-port union, less the dead 1.x labels, with TrueVision's four shared descriptions
    built = json.loads(out)
    expected = json.loads(json.dumps(live))
    for key in VV_LABELS_DROPPED:
        full = "ElevationViews__Labels__" + key
        if full not in expected["ElevationViews__Labels__Config"]:
            raise SystemExit("CONFIG: expected VV label missing from the pre-port file: " + full)
        if full in tv["ElevationViews__Labels__Config"]:
            raise SystemExit("CONFIG: refusing to drop a TrueVision key: " + full)
        del expected["ElevationViews__Labels__Config"][full]
    for block, key in TV_DESCRIPTIONS:
        expected[block][key] = tv[block][key]
    if built != expected:
        raise SystemExit("CONFIG union check failed")

    # PROOF 2 | Every TrueVision key is present
    def flat(d, p=""):
        r = {}
        for k, v in d.items():
            if isinstance(v, dict): r.update(flat(v, p + k + "/"))
            else: r[p + k] = v
        return r
    missing = [k for k in flat(tv) if k not in flat(built)]
    if missing:
        raise SystemExit("CONFIG lost TrueVision keys: %r" % missing)

    # PROOF 3 | Key ORDER of the Labels block is TrueVision's, VV keys only inserted
    tv_order = list(tv["ElevationViews__Labels__Config"].keys())
    built_order = [k for k in built["ElevationViews__Labels__Config"].keys() if k in tv["ElevationViews__Labels__Config"]]
    if tv_order != built_order:
        raise SystemExit("CONFIG label order differs from TrueVision's")
    return out


# =============================================================================
# STYLESHEET (ValeVision's file less the Compass Preset Strip = TrueVision's + banner + PORT NOTE)
# =============================================================================

CSS_NOTE_OLD = (
    " * - Ported on     : 02-Oct-2026 for ValeVision3D v2.71.2, whole; first ported 09-Sep-2026 for\n"
    " *                   ValeVision3D v2.19.0 (port Phase 3)\n"
    " * - Parity        : adapted. The identity region styles nothing yet: its classes arrive with the 2.1.0\n"
    " *                   row builders (W2-05). The Carousel Card Status rules are also in\n"
    " *                   40__System__DrawingViewCore/Na__DrawView__Styles__DevMenu__.css, word for word and\n"
    " *                   imported after this sheet, as in TrueVision.\n"
    " * - Divergences   :\n"
    " *   - Banner reads ValeVision3D.\n"
    " *   - The Compass Preset Strip region and its narrow-panel rule are this app's: its 1.x Elevations Dev\n"
    " *     menu still draws the N / E / S / W strip that TrueVision replaced with the identity region on\n"
    " *     20-Sep-2026. Retire with W2-05, whose row builders draw that region.\n"
)
CSS_NOTE_NEW = (
    " * - Ported on     : 02-Oct-2026 for ValeVision3D v2.71.2, whole; first ported 09-Sep-2026 for\n"
    " *                   ValeVision3D v2.19.0 (port Phase 3). Since {{VVREL:W2-05}} TrueVision's rules only:\n"
    " *                   the Compass Preset Strip went with the 1.x Elevations Dev menu, and the identity\n"
    " *                   region now styles the 2.1.0 row builders.\n"
    " * - Parity        : verbatim. The Carousel Card Status rules are also in\n"
    " *                   40__System__DrawingViewCore/Na__DrawView__Styles__DevMenu__.css, word for word and\n"
    " *                   imported after this sheet, as in TrueVision.\n"
    " * - Divergences   :\n"
    " *   - Banner reads ValeVision3D.\n"
)
CSS_STRIP = (
    "/* ----------------------------------------------------------------- */\n"
    "/* REGION  |  Compass Preset Strip                                   */\n"
    "/* ----------------------------------------------------------------- */\n"
    "/* ValeVision3D only (see the PORT NOTE): the 1.x Elevations Dev menu still\n"
    "   draws the N / E / S / W strip. It goes with W2-05. */\n"
    "\n"
    "/* Four equal buttons on one line. They are the ordinary way to set an\n"
    "   elevation's direction, so they get the full width rather than being\n"
    "   tucked beside the free-bearing field. */\n"
    ".na-elev-dev__compass {\n"
    "    display                            : grid;\n"
    "    grid-template-columns              : repeat(4, 1fr);\n"
    "    gap                                : 4px;\n"
    "    margin                             : 2px 0 4px;\n"
    "}\n"
    "\n"
    ".na-elev-dev__compass .na-pm-dev__btn {\n"
    "    width                              : 100%;\n"
    "    padding-left                       : 0;\n"
    "    padding-right                      : 0;\n"
    "    text-align                         : center;\n"
    "}\n"
    "\n"
    "/* endregion ------------------------------------------------------- */\n"
    "\n"
    "\n"
)
CSS_NARROW = (
    "    /* Two rows of two rather than four squeezed buttons. */\n"
    "    .na-elev-dev__compass {\n"
    "        grid-template-columns          : repeat(2, 1fr);\n"
    "    }\n"
    "\n"
)


def build_css():
    text = backup_text("css")
    out = apply(text, [(CSS_NOTE_OLD, CSS_NOTE_NEW), (CSS_STRIP, ""), (CSS_NARROW, "")], "css")

    # PROOF | Take away the banner token and the PORT NOTE block and it is TrueVision's sheet
    tv = tv_text(EV + "Na__Elevation__Styles__DevMenu__.css")
    start = out.index("/*\n * PORT NOTE:\n")
    end = out.index(" */\n", start) + len(" */\n")
    back = out[:start] + out[end:]
    back = back.replace("/* REGION  |  ValeVision3D - Elevation Dev Menu Styles              */",
                        "/* REGION  |  TrueVision3D - Elevation Dev Menu Styles              */", 1)
    if back != tv:
        raise SystemExit("CSS: less the banner and the PORT NOTE it is not TrueVision's sheet")
    return out


# =============================================================================
# DATA MODULE (ValeVision's file: the two 1.x setters retired, the exclusion trim aligned with the plans)
# =============================================================================

DATA_VV_REGION = (
    "// -----------------------------------------------------------------------------\n"
    "// REGION | ValeVision Only - Two Setters Its Pre-2.1.0 Dev Menu Editor Imports (Retire With W2-05)\n"
    "// -----------------------------------------------------------------------------\n"
    "\n"
    "    // MODULE CONSTANTS | Seeding Provenance (Elevation__SeededFrom, This App's Own Record Key)\n"
    "    // ------------------------------------------------------------\n"
    "    // How a record was first aimed: 'facepick', 'preset' or 'manual'. A value\n"
    "    // already on a record is kept (DR-32); only the setter below writes one -\n"
    "    // the normaliser and the creator above do not.\n"
    "    // ------------------------------------------------------------\n"
    "    const Na__ElevData__F_SEEDED_FROM = 'Elevation__SeededFrom';\n"
    "    const Na__ElevData__SEEDED_VALUES = Object.freeze(['facepick', 'preset', 'manual']);\n"
    "    // ------------------------------------------------------------\n"
    "\n"
    "\n"
    "    // FUNCTION | Set the Azimuth Directly (wrapped, whole degrees)\n"
    "    // ------------------------------------------------------------\n"
    "    function Na__ElevData__SetAzimuthDeg(elevation, degrees) {\n"
    "        if (!elevation || !Number.isFinite(degrees)) return false;\n"
    "        elevation[Na__ElevData__F_AZIMUTH] = Na__ElevData__WrapAzimuth(Math.round(degrees));\n"
    "        return true;\n"
    "    }\n"
    "    // ------------------------------------------------------------\n"
    "\n"
    "\n"
    "    // FUNCTION | Record How an Elevation Was Seeded (informational)\n"
    "    // ------------------------------------------------------------\n"
    "    function Na__ElevData__SetSeededFrom(elevation, source) {\n"
    "        if (!elevation) return false;\n"
    "        elevation[Na__ElevData__F_SEEDED_FROM] = (Na__ElevData__SEEDED_VALUES.indexOf(source) !== -1) ? source : 'manual';\n"
    "        return true;\n"
    "    }\n"
    "    // ------------------------------------------------------------\n"
    "\n"
    "// endregion -------------------------------------------------------------------\n"
    "\n"
    "\n"
)

DATA_NOTE_PAIRS = [
    ("//                   DR-01 (c), and nothing draws the fog until W2-03.\n",
     "//                   DR-01 (c), and nothing draws the fog until W2-03. The two setters kept for this\n"
     "//                   app's 1.x Elevations Dev menu (SetAzimuthDeg, SetSeededFrom) were retired with it\n"
     "//                   in {{VVREL:W2-05}} (R0.2.11 Q-AZIMUTH (b), R6 F.8 C20).\n"),
    ("//   - Na__ElevData__SetAzimuthDeg and Na__ElevData__SetSeededFrom, with the two constants the second\n"
     "//     needs, are this app's (K2 X2), kept only because its pre-2.1.0 Elevations Dev menu editor still\n"
     "//     imports them (Pick Face, Re-pick, a change of direction) - retire with W2-05 (R0.2.11 Q-AZIMUTH (b),\n"
     "//     R6 F.8 C20). Their region sits just above Module Exports.\n"
     "//   - Elevation__SeededFrom (this app's record key, DR-32) is no longer written on read or on create -\n"
     "//     TrueVision's normaliser and creator do not know it - but a value already on a record stays on the\n"
     "//     live record, so every read and save keeps it. Only SetSeededFrom writes it now - retire with W2-05.\n",
     "//   - SetExcludeTokens trims each token and drops the empty ones, as the floor plans' data module does\n"
     "//     (OC-11, since {{VVREL:W2-05}}); TrueVision stores the list as given. The projection trims either\n"
     "//     way, so the linework is the same; only the stored text differs.\n"
     "//   - Elevation__SeededFrom (this app's record key, DR-32) is written by nothing any more - TrueVision's\n"
     "//     normaliser, creator and 2.1.0 Elevations Dev menu do not know it - but a value already on a record\n"
     "//     stays on the live record, so every read and save keeps it.\n"),
]


def build_data():
    text = backup_text("data")
    pairs = DATA_NOTE_PAIRS + [
        (DATA_VV_REGION, ""),
        ("        Na__ElevData__GetDimensions,\n"
         "        Na__ElevData__STYLE_KEYS,                                            // <-- ValeVision only (DR-32 D33, K2 X2)\n"
         "        Na__ElevData__SetAzimuthDeg,                                         // <-- ValeVision only: retire with W2-05 (Q-AZIMUTH, F.8 C20)\n"
         "        Na__ElevData__SetSeededFrom                                          // <-- ValeVision only: retire with W2-05 (DR-32, F.8 C20)\n"
         "    };\n",
         "        Na__ElevData__GetDimensions,\n"
         "        Na__ElevData__STYLE_KEYS                                             // <-- ValeVision only (DR-32 D33, K2 X2)\n"
         "    };\n"),
        ("    function Na__ElevData__SetExcludeTokens(elevation, tokens) {\n"
         "        if (!elevation) return false;\n"
         "        elevation[Na__ElevData__REC_EXCLUDE] = Array.isArray(tokens) ? tokens.slice() : null;\n",
         "    function Na__ElevData__SetExcludeTokens(elevation, tokens) {\n"
         "        if (!elevation) return false;\n"
         "        elevation[Na__ElevData__REC_EXCLUDE] = Array.isArray(tokens)\n"
         "            ? tokens.map((t) => String(t).trim()).filter((t) => t.length > 0)    // <-- ValeVision only: trimmed, empties dropped, as the plans (OC-11, PORT NOTE)\n"
         "            : null;\n"),
    ]
    out = apply(text, pairs, "data")
    for name in ("SetAzimuthDeg", "SetSeededFrom", "F_SEEDED_FROM", "SEEDED_VALUES"):
        if ("Na__ElevData__" + name) in out:
            raise SystemExit("DATA still names Na__ElevData__" + name)
    return out


# =============================================================================
# THUMBNAIL BAKE (ValeVision-only module: documentation of the elevation save, version 1.0.3)
# =============================================================================

def build_bake():
    text = backup_text("bake")
    pairs = [
        ("//   once at the end, and the scenes are re-broadcast so every card fetches\n"
         "//   its picture again. The Floor Plans editor (TrueVision's 2.0.0 menu, rows\n"
         "//   that are drafts) hands in its draft guard's SaveBlock, so a plan row\n"
         "//   still being edited goes out as it was last updated and a bake never\n"
         "//   keeps a half-moved plan; the Elevations editor hands in Save Elevations\n"
         "//   until its own rebuild.\n",
         "//   once at the end, and the scenes are re-broadcast so every card fetches\n"
         "//   its picture again. The Floor Plans and Elevations editors (TrueVision's\n"
         "//   2.x menus, rows that are drafts) hand in their draft guard's SaveBlock,\n"
         "//   so a row still being edited goes out as it was last updated and a bake\n"
         "//   never keeps a half-moved drawing.\n"),
        ("// DEVELOPMENT LOG:\n"
         "// 02-Oct-2026 - Version 1.0.2 (Floor Plans menu rebuild, {{VVREL:W2-04}})\n",
         "// DEVELOPMENT LOG:\n"
         "// 02-Oct-2026 - Version 1.0.3 (Elevations menu rebuild, {{VVREL:W2-05}})\n"
         "// - The Elevations editor's save is its draft guard's SaveBlock too: the\n"
         "//   2.1.0 menu has no Save Elevations. The run itself is unchanged.\n"
         "//\n"
         "// 02-Oct-2026 - Version 1.0.2 (Floor Plans menu rebuild, {{VVREL:W2-04}})\n"),
        ("    //   save      : async () => boolean   the owning editor's save, run once when something baked\n"
         "    //                                     (Floor Plans: the draft guard's SaveBlock)\n",
         "    //   save      : async () => boolean   the owning editor's save, run once when something baked\n"
         "    //                                     (both editors: the draft guard's SaveBlock)\n"),
    ]
    return apply(text, pairs, "bake")


# =============================================================================
# 41 DEV CONTROLS (ValeVision's Cross Section Tool gate: its own ids give way to TrueVision's 48)
# =============================================================================

ID_RENAMES = [
    ("naCrossSectionDevItem",        "naCrossSectionToolDevItem"),
    ("naCrossSectionDevToggle",      "naCrossSectionToolDevToggle"),
    ("naCrossSectionDevPanel",       "naCrossSectionToolDevPanel"),
    ("naCrossSectionDevEnableCheck", "naCrossSectionToolDevEnableCheck"),
    ("naCrossSectionDevSave",        "naCrossSectionToolDevSave"),
]


def build_devctl():
    text = backup_text("devctl")
    pairs = [
        ("    const Na__SectDevMenu__ItemId      = 'naCrossSectionDevItem';        // <-- Dev menu list item container\n"
         "    const Na__SectDevMenu__ToggleId    = 'naCrossSectionDevToggle';      // <-- Submenu open/close button\n"
         "    const Na__SectDevMenu__PanelId     = 'naCrossSectionDevPanel';       // <-- Collapsible submenu panel\n"
         "    const Na__SectDevMenu__EnableId    = 'naCrossSectionDevEnableCheck'; // <-- Enable-for-project checkbox\n"
         "    const Na__SectDevMenu__SaveBtnId   = 'naCrossSectionDevSave';        // <-- Save Cross Section Config button\n",
         "    // The ids are naCrossSectionToolDev*: naCrossSectionDev* belongs to the\n"
         "    // Cross Sections drawing panel (48), whose ids are TrueVision's (K2 S4).\n"
         "    const Na__SectDevMenu__ItemId      = 'naCrossSectionToolDevItem';        // <-- Dev menu list item container\n"
         "    const Na__SectDevMenu__ToggleId    = 'naCrossSectionToolDevToggle';      // <-- Submenu open/close button\n"
         "    const Na__SectDevMenu__PanelId     = 'naCrossSectionToolDevPanel';       // <-- Collapsible submenu panel\n"
         "    const Na__SectDevMenu__EnableId    = 'naCrossSectionToolDevEnableCheck'; // <-- Enable-for-project checkbox\n"
         "    const Na__SectDevMenu__SaveBtnId   = 'naCrossSectionToolDevSave';        // <-- Save Cross Section Config button\n"),
        ("// DEVELOPMENT LOG:\n"
         "// 14-Jul-2026 - Version 1.0.0\n",
         "// DEVELOPMENT LOG:\n"
         "// 02-Oct-2026 - Version 1.0.1 (Cross Sections placeholder, {{VVREL:W2-05}})\n"
         "// - The gate's DOM ids are naCrossSectionToolDev*. TrueVision's Cross\n"
         "//   Sections placeholder panel (48) uses naCrossSectionDev*, and this app's\n"
         "//   own ids give way so that file ports unchanged (K2 S4, DR-26).\n"
         "//\n"
         "// 14-Jul-2026 - Version 1.0.0\n"),
    ]
    out = apply(text, pairs, "devctl")
    for old, _new in ID_RENAMES:
        if ("'" + old + "'") in out:
            raise SystemExit("DEVCTL still binds " + old)
    return out


# =============================================================================
# INDEX.HTML (the 48 item between Elevations and North, its import and init; the gate's ids renamed)
# =============================================================================

INDEX_XSEC_ITEM = (
    "                <!-- -------------------------------------------------------- -->\n"
    "                <!-- CROSS SECTIONS (localhost dev only, placeholder, TV 48)  -->\n"
    "                <!-- -------------------------------------------------------- -->\n"
    "                <!-- @delegate: ./02__Src__AppModules/48__System__CrossSectionViews/Na__CrossSection__DevMenu__Editor__.js -->\n"
    "                <li class=\"na-dropdown-menu__item na-dropdown-menu__item--localhost-only\" id=\"naCrossSectionDevItem\" style=\"display:none;\">\n"
    "                    <button class=\"na-dropdown-menu__button na-dropdown-menu__button--has-submenu\" id=\"naCrossSectionDevToggle\" aria-expanded=\"false\">\n"
    "                        Cross Sections\n"
    "                        <span class=\"na-dropdown-menu__subarrow\">&#9662;</span>\n"
    "                    </button>\n"
    "                    <div class=\"na-dropdown-menu__panel na-pm-dev__panel\" id=\"naCrossSectionDevPanel\">\n"
    "                        <!-- Placeholder panel generated by Na__CrossSection__DevMenu__Editor__.js - the system itself is not built yet -->\n"
    "                    </div>\n"
    "                </li>\n"
    "                <!-- -------------------------------------------------------- -->\n"
)


def build_index():
    text = backup_text("index")
    tv_index = tv_text("Index.html")
    # The <li> lines are TrueVision's verbatim (Index.html :600-608)
    li = INDEX_XSEC_ITEM[INDEX_XSEC_ITEM.index("                <li "):INDEX_XSEC_ITEM.index("                </li>\n") + len("                </li>\n")]
    if li not in tv_index:
        raise SystemExit("INDEX: the 48 <li> is not TrueVision's verbatim")
    tv_import = "    import { Na__CrossSection__DevMenu__Initialize } from './02__Src__AppModules/48__System__CrossSectionViews/Na__CrossSection__DevMenu__Editor__.js';\n"
    tv_init = "        Na__CrossSection__DevMenu__Initialize();                // <-- Placeholder panel under Elevations; a section is an elevation whose type is Section until that system is built\n"
    if tv_import not in tv_index or tv_init not in tv_index:
        raise SystemExit("INDEX: TrueVision's import or init line not found verbatim")

    pairs = [
        # 1 The gate's ids (the 41 Cross Section Tool block) give way (K2 S4, DR-26)
        ("                <!-- CROSS SECTION TOOL (per-project feature gate)            -->\n"
         "                <!-- @delegate: ./02__Src__AppModules/41__System__CrossSectionView/Na__UiFeature__CrossSectionView__DevControls.js -->\n"
         "                <!-- -------------------------------------------------------- -->\n"
         "                <li class=\"na-dropdown-menu__item\" id=\"naCrossSectionDevItem\" style=\"display:none;\">\n"
         "                    <button class=\"na-dropdown-menu__button na-dropdown-menu__button--has-submenu\" id=\"naCrossSectionDevToggle\" aria-expanded=\"false\">\n",
         "                <!-- CROSS SECTION TOOL (per-project feature gate)            -->\n"
         "                <!-- @delegate: ./02__Src__AppModules/41__System__CrossSectionView/Na__UiFeature__CrossSectionView__DevControls.js -->\n"
         "                <!-- Ids naCrossSectionToolDev*: naCrossSectionDev* is the Cross Sections drawing panel (48, K2 S4) -->\n"
         "                <!-- -------------------------------------------------------- -->\n"
         "                <li class=\"na-dropdown-menu__item\" id=\"naCrossSectionToolDevItem\" style=\"display:none;\">\n"
         "                    <button class=\"na-dropdown-menu__button na-dropdown-menu__button--has-submenu\" id=\"naCrossSectionToolDevToggle\" aria-expanded=\"false\">\n"),
        ("                    <div class=\"na-dropdown-menu__panel\" id=\"naCrossSectionDevPanel\">\n",
         "                    <div class=\"na-dropdown-menu__panel\" id=\"naCrossSectionToolDevPanel\">\n"),
        ("<input type=\"checkbox\" id=\"naCrossSectionDevEnableCheck\" class=\"na-dropdown-menu__checkbox\" />",
         "<input type=\"checkbox\" id=\"naCrossSectionToolDevEnableCheck\" class=\"na-dropdown-menu__checkbox\" />"),
        ("<button class=\"na-dropdown-menu__action\" id=\"naCrossSectionDevSave\">Save Cross Section Config</button>",
         "<button class=\"na-dropdown-menu__action\" id=\"naCrossSectionToolDevSave\">Save Cross Section Config</button>"),
        # 2 The Cross Sections <li> between Elevations and North Direction (TrueVision's place)
        ("                        <!-- Elevation rows generated dynamically by Na__Elevation__DevMenu__Editor__.js -->\n"
         "                    </div>\n"
         "                </li>\n"
         "                <!-- -------------------------------------------------------- -->\n",
         "                        <!-- Elevation rows generated dynamically by Na__Elevation__DevMenu__Editor__.js -->\n"
         "                    </div>\n"
         "                </li>\n"
         "                <!-- -------------------------------------------------------- -->\n"
         + INDEX_XSEC_ITEM),
        # 3 The import, after the elevation editor's (TrueVision :909)
        ("    import { Na__Elevation__DevMenu__Initialize } from './02__Src__AppModules/45__System__ElevationViews/Na__Elevation__DevMenu__Editor__.js';\n",
         "    import { Na__Elevation__DevMenu__Initialize } from './02__Src__AppModules/45__System__ElevationViews/Na__Elevation__DevMenu__Editor__.js';\n"
         + tv_import),
        # 4 The init, in the elevation mode's .then after the elevation editor (TrueVision :1767)
        ("        Na__Elevation__DevMenu__Initialize({\n"
         "            modelRoot : Na__ModelGroup__Root,\n"
         "            camera    : Na__Camera__Main,\n"
         "            showToast : Na__UiFeature__ShowToast\n"
         "        });\n"
         "    });\n",
         "        Na__Elevation__DevMenu__Initialize({\n"
         "            modelRoot : Na__ModelGroup__Root,\n"
         "            camera    : Na__Camera__Main,\n"
         "            showToast : Na__UiFeature__ShowToast\n"
         "        });\n"
         + tv_init +
         "    });\n"),
    ]
    out = apply(text, pairs, "index")
    # Each id now appears exactly once
    for old, new in ID_RENAMES:
        if out.count('id="' + new + '"') != 1:
            raise SystemExit("INDEX: id %s not exactly once" % new)
    for old in ("naCrossSectionDevItem", "naCrossSectionDevToggle", "naCrossSectionDevPanel"):
        if out.count('id="' + old + '"') != 1:
            raise SystemExit("INDEX: id %s not exactly once" % old)
    for old in ("naCrossSectionDevEnableCheck", "naCrossSectionDevSave"):
        if old in out:
            raise SystemExit("INDEX: %s still present" % old)
    return out


BUILDERS = {
    "editor": build_editor, "rows": build_rows, "config": build_config, "css": build_css, "data": build_data,
    "bake": build_bake, "xsec": build_xsec, "devctl": build_devctl, "index": build_index,
}


def encode(key, text):
    if key in CRLF_FILES:
        if "\r" in text:
            raise SystemExit("stray CR in " + key)
        return text.replace("\n", "\r\n").encode("utf-8")
    if "\r" in text:
        raise SystemExit("CR in LF file " + key)
    return text.encode("utf-8")


def sha(b):
    return hashlib.sha256(b).hexdigest()


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "--check"
    results = {k: encode(k, f()) for k, f in BUILDERS.items()}

    if mode == "--out":
        out = sys.argv[2]
        os.makedirs(out, exist_ok=True)
        for k, b in results.items():
            p = os.path.join(out, os.path.basename(TARGETS[k]))
            open(p, "wb").write(b)
            print("wrote", p, len(b))
        return

    if mode == "--land":
        for k in results:
            p = live_path(TARGETS[k])
            if k in NEW_FILES:
                if os.path.exists(p):
                    raise SystemExit("REFUSED: %s already exists - nothing written" % TARGETS[k])
                continue
            live = open(p, "rb").read()
            back = open(os.path.join(BACKUP, os.path.basename(TARGETS[k])), "rb").read()
            if sha(live) != sha(back):
                raise SystemExit("REFUSED: %s changed since the backup - nothing written" % TARGETS[k])
        landed = {}
        for k, b in results.items():
            p = live_path(TARGETS[k])
            if k in NEW_FILES:
                os.makedirs(os.path.dirname(p), exist_ok=True)
                with open(p, "xb") as fh:
                    fh.write(b)
            else:
                with open(p, "wb") as fh:
                    fh.write(b)
            landed[TARGETS[k]] = sha(b)
            print("landed", TARGETS[k], len(b))
        json.dump(landed, open(LANDED, "w"), indent=1)
        return

    if mode == "--restore":
        landed = json.load(open(LANDED))
        for k in results:
            p = live_path(TARGETS[k])
            if os.path.exists(p) and sha(open(p, "rb").read()) != landed.get(TARGETS[k]):
                raise SystemExit("REFUSED: %s changed since landing - nothing restored" % TARGETS[k])
        for k in results:
            p = live_path(TARGETS[k])
            if k in NEW_FILES:
                if os.path.exists(p):
                    os.remove(p)
                    print("removed", TARGETS[k])
                continue
            back = open(os.path.join(BACKUP, os.path.basename(TARGETS[k])), "rb").read()
            open(p, "wb").write(back)
            print("restored", TARGETS[k])
        return

    ok = True
    for k, b in results.items():
        p = live_path(TARGETS[k])
        live = open(p, "rb").read() if os.path.exists(p) else None
        same = (live == b)
        ok = ok and same
        print(("same " if same else "DIFF ") + TARGETS[k])
    print("CHECK PASS" if ok else "CHECK FAIL")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
