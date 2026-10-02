"""W2-04 - Floor Plans Dev menu rebuild (TV 2.0.0 editor and row builders) with ValeVision's seams.

Builds the five files of the package:
  - Editor and RowBuilders: TrueVision's bytes at b2aa9151 (git show), then ONLY the listed seams, each an exact
    byte replacement asserted to match exactly once.
  - AppConfig: TrueVision's bytes, ValeVision's description, ValeVision-only label keys unioned in.
  - Floor plan Dev stylesheet and ThumbnailBake: ValeVision's current bytes plus listed hunks.

Usage:
  python port_w2_04.py --out <dir>     write the five results into <dir> (no live file touched)
  python port_w2_04.py --land          write them over the live files, refusing if any live file changed
                                       since the backup in scratch/W2-04/backup was taken
  python port_w2_04.py --check         rebuild in memory and compare with the live files (CHECK PASS / FAIL)
All files are LF (as TrueVision's git show and ValeVision's current files are).
"""
import hashlib, json, os, subprocess, sys

PIN      = "b2aa9151"
TV_REPO  = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
TV_APP   = "na-apps/30__TrueVision__CoreAppCode/"
VV_ROOT  = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
SCRATCH  = os.path.join(VV_ROOT, r"ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W2-04")
BACKUP   = os.path.join(SCRATCH, "backup")

FP  = "02__Src__AppModules/42__System__FloorPlanViews/"
DVC = "02__Src__AppModules/40__System__DrawingViewCore/"

TARGETS = {
    "editor"  : FP + "Na__FloorPlan__DevMenu__Editor__.js",
    "rows"    : FP + "Na__FloorPlan__DevMenu__RowBuilders__.js",
    "config"  : FP + "Na__FloorPlan__AppConfig__.json",
    "css"     : FP + "Na__FloorPlan__Styles__DevMenu__.css",
    "bake"    : DVC + "Na__DrawView__ThumbnailBake__.js",
}

RULE = "// -----------------------------------------------------------------------------\n"


def tv_bytes(rel):
    return subprocess.run(["git", "-C", TV_REPO, "show", PIN + ":" + TV_APP + rel],
                          capture_output=True, check=True).stdout


def live_path(rel):
    return os.path.join(VV_ROOT, rel.replace("/", os.sep))


def apply(text, pairs, name):
    for i, (old, new) in enumerate(pairs):
        count = text.count(old)
        if count != 1:
            raise SystemExit("SEAM %s #%d matched %d times (expected 1):\n%r" % (name, i + 1, count, old[:200]))
        text = text.replace(old, new)
    return text


# =============================================================================
# EDITOR
# =============================================================================

EDITOR_PORT_NOTE = (
    "//\n"
    "// PORT NOTE:\n"
    "// - Ported from   : TrueVision3D 02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__DevMenu__Editor__.js\n"
    "// - Source version: 2.0.0 (TrueVision3D v2.86.0, 20-Sep-2026; read at b2aa9151) - with 1.1.0 (v2.82.0) and\n"
    "//                   the storey row of v2.87.0. None of the three is confirmed by Adam in TrueVision yet;\n"
    "//                   ported under DR-01 (c)\n"
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-04}}, whole; first ported 09-Sep-2026 for\n"
    "//                   ValeVision3D v2.18.0 (port Phase 2)\n"
    "// - Parity        : adapted\n"
    "// - Divergences   :\n"
    "//   - Banner and console prefix read ValeVision3D.\n"
    "//   - The live cut goes through Na__DrawView__SectionAdapter__SetPlaneHeightMm (DIV-2), not TrueVision's\n"
    "//     41__System__SectionCutEngine.\n"
    "//   - The client-measuring labels come from 44 Na__PlanDimensions__ConfigState__ (ValeVision's split of\n"
    "//     PlanDimensions__Data__).\n"
    "//   - Ground Floor Plan quick action in the panel head, beside the + (D11, DR-32).\n"
    "//   - Styles and Exclusions sit under each row's Advanced fold; a style change re-applies the presets to\n"
    "//     the plan on screen through Na__FloorPlanMode__ApplyStyles. Both are draft edits (D33, DR-32).\n"
    "//   - Thumbnail bake (Na__DrawView__ThumbnailBake__, v2.46.0): a plan added, seeded or given a card is\n"
    "//     queued for a baked thumbnail, the run saving once through the draft guard's SaveBlock; Bake Missing\n"
    "//     Thumbnails in the panel foot; Update waits while a bake is flipping drawings on screen (DR-32).\n"
    "//   - Update bakes projected linework (Na__PlStore__BakeBeforeSave) before its save (D20, DR-32), until\n"
    "//     ValeVision adopts TrueVision's publish-time bake (DR-22).\n"
    "// - History       : ValeVision's own 1.1.0 and 1.2.0 (09-Sep and 15-Sep-2026: drawings-block save, section\n"
    "//                   adapter, R2 thumbnails, Ground Floor Plan, style handlers, linework and thumbnail bakes)\n"
    "//                   are superseded by this port; what survives is the Divergences above.\n"
    "// - Back-port     : the Ground Floor quick action, the style rows and the thumbnail bake (WT-06, WT-09);\n"
    "//                   not the linework bake (TrueVision bakes drawings at publish time).\n"
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
    "// REGION | ValeVision Additions - Ground Floor Quick Action and Thumbnail Bake\n"
    "// -----------------------------------------------------------------------------\n"
    "\n"
    "    // HELPER FUNCTION | Put the Ground Floor Plan Quick Action Beside the +\n"
    "    // ------------------------------------------------------------\n"
    "    // The one-click start most jobs need (D11): a plan at floor level 0 with\n"
    "    // the standard cut, named as the config names it. It is added exactly as\n"
    "    // the + adds one - asked about first if the open row has changes, saved\n"
    "    // at once, opened, and its card given a baked thumbnail.\n"
    "    // ------------------------------------------------------------\n"
    "    function Na__FpDev__AddGroundFloorQuickAction(head) {\n"
    "        if (!head || !head.lastChild) return;\n"
    "        const button = Na__DrawShell__Button(\n"
    "            Na__FpCfg__GetLabel('GroundFloorPlanLabel', '+ Ground Floor'), 'na-fp-dev__quick-add',\n"
    "            'Add the ground floor plan: floor level 0, the standard cut height. Saved at once.',\n"
    "            () => { void Na__FpDev__AddGroundFloorPlan(); }\n"
    "        );\n"
    "        head.insertBefore(button, head.lastChild);                               // <-- The + is the head's last child\n"
    "    }\n"
    "    // ------------------------------------------------------------\n"
    "\n"
    "\n"
    "    // FUNCTION | Add the Standard Ground Floor Plan (floor level 0, standard cut)\n"
    "    // ------------------------------------------------------------\n"
    "    function Na__FpDev__AddGroundFloorPlan() {\n"
    "        return Na__FpDev__AddPlan({\n"
    "            name         : Na__FpCfg__GetLabel('GroundFloorPlanName', 'Ground Floor Plan'),\n"
    "            floorDatumMm : 0\n"
    "        });\n"
    "    }\n"
    "    // ------------------------------------------------------------\n"
    "\n"
    "\n"
    "    // HELPER FUNCTION | How the Thumbnail Bake Opens, Checks and Closes a Plan\n"
    "    // ------------------------------------------------------------\n"
    "    // Opening is what the Preview button does, face pick cancelled first.\n"
    "    // ------------------------------------------------------------\n"
    "    function Na__FpDev__ThumbAdapter() {\n"
    "        return {\n"
    "            kind         : 'plan',\n"
    "            enter        : (plan) => {\n"
    "                Na__PlaneGrip__CancelFacePick(Na__PlaneUi__TYPE_PLAN);\n"
    "                return Na__FloorPlanMode__EnterPlan(plan);\n"
    "            },\n"
    "            isShowing    : (plan) => Na__FpDev__IsPreviewing(plan),\n"
    "            getActive    : () => (Na__FloorPlanMode__IsActive() ? Na__FloorPlanMode__GetActivePlan() : null),\n"
    "            exit         : () => Na__FloorPlanMode__ExitPlan(null),\n"
    "            storeFraming : () => Na__FloorPlanMode__StoreActiveFraming()\n"
    "        };\n"
    "    }\n"
    "    // ------------------------------------------------------------\n"
    "\n"
    "\n"
    "    // HELPER FUNCTION | A Plan as a Bake Item (null when it has no card)\n"
    "    // ------------------------------------------------------------\n"
    "    function Na__FpDev__ThumbItem(plan) {\n"
    "        const config = Na__FpDev__GetConfig();\n"
    "        const scene  = (config && plan) ? Na__FpData__FindSceneForPlan(config, plan) : null;\n"
    "        return scene ? { drawing : plan, sceneId : scene.PresentationMode__Scene__Id, label : plan.FloorPlan__Name } : null;\n"
    "    }\n"
    "    // ------------------------------------------------------------\n"
    "\n"
    "\n"
    "    // HELPER FUNCTION | The Bake's One Save: the Drawings Block, Guarded\n"
    "    // ------------------------------------------------------------\n"
    "    // There is no Save Floor Plans any more. A bake writes the framing and the\n"
    "    // card's picture through SaveBlock, so a row still being edited goes out\n"
    "    // as it was last updated - the bake never keeps a half-moved plan.\n"
    "    // ------------------------------------------------------------\n"
    "    function Na__FpDev__ThumbSave() {\n"
    "        const report = {};\n"
    "        return Na__DrawDraft__SaveBlock(Na__FpDev__RelayErrors, report);\n"
    "    }\n"
    "    // ------------------------------------------------------------\n"
    "\n"
    "\n"
    "    // FUNCTION | Bake the Thumbnails of Plans Just Added (one run, one save)\n"
    "    // ------------------------------------------------------------\n"
    "    function Na__FpDev__QueueThumbnails(plans) {\n"
    "        const items = (plans || []).map(Na__FpDev__ThumbItem).filter(Boolean);\n"
    "        return Na__DrawThumb__Queue({ items : items, adapter : Na__FpDev__ThumbAdapter(), save : Na__FpDev__ThumbSave, showToast : Na__FpDev__ShowToast });\n"
    "    }\n"
    "    // ------------------------------------------------------------\n"
    "\n"
    "\n"
    "    // FUNCTION | Bake Every Plan Card Whose Picture Does Not Load\n"
    "    // ------------------------------------------------------------\n"
    "    async function Na__FpDev__BakeMissingThumbnails() {\n"
    "        const items   = Na__FpData__GetFloorPlans(null).map(Na__FpDev__ThumbItem).filter(Boolean);\n"
    "        const missing = await Na__DrawThumb__FindMissing(items);\n"
    "        if (missing.length === 0) {\n"
    "            Na__FpDev__Toast(items.length === 0 ? 'No floor plan has a carousel card to bake a thumbnail for.' : 'Every floor plan card already has a picture.');\n"
    "            return 0;\n"
    "        }\n"
    "        Na__DrawThumb__Queue({ items : missing, adapter : Na__FpDev__ThumbAdapter(), save : Na__FpDev__ThumbSave, showToast : Na__FpDev__ShowToast });\n"
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
    text = tv_bytes(FP + "Na__FloorPlan__DevMenu__Editor__.js").decode("utf-8")
    pairs = [
        # 1 Banner (K2 H1)
        ("// TRUEVISION3D - FLOOR PLAN VIEWS - DEV MENU EDITOR\n",
         "// VALEVISION3D - FLOOR PLAN VIEWS - DEV MENU EDITOR\n"),
        # 2 PORT NOTE (K2 H5) - TrueVision's file has none
        ("//\n" + RULE + "//\n// DEVELOPMENT LOG:\n", "//\n" + RULE + EDITOR_PORT_NOTE),
        # 3 Mode controller: ApplyStyles for the style rows (D33)
        ("        Na__FloorPlanMode__IsEditMode,\n        Na__FloorPlanMode__IsActive,\n",
         "        Na__FloorPlanMode__IsEditMode,\n        Na__FloorPlanMode__ApplyStyles,\n        Na__FloorPlanMode__IsActive,\n"),
        # 4 Section cut through the adapter (DIV-2)
        ("    import {\n        Na__SectionCut__SetPlaneHeightMm\n    } from '../41__System__SectionCutEngine/Na__SectionCut__Engine__.js';\n",
         "    // @delegate: ../40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js\n"
         "    import {\n        Na__DrawView__SectionAdapter__SetPlaneHeightMm\n    } from '../40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js';\n"),
        ("        Na__SectionCut__SetPlaneHeightMm(\n",
         "        Na__DrawView__SectionAdapter__SetPlaneHeightMm(\n"),
        # 5 PlanDim labels from ValeVision's ConfigState split
        ("    import { Na__PlanDim__GetLabel } from '../44__System__PlanDimensions/Na__PlanDimensions__Data__.js';\n",
         "    import { Na__PlanDim__GetLabel } from '../44__System__PlanDimensions/Na__PlanDimensions__ConfigState__.js';\n"),
        # 6 ValeVision imports: the two bakes
        ("    // MODULE IMPORTS | Drawing Planes (the planes shown in the 3D view)\n", EDITOR_VV_IMPORTS),
        # 7 Console prefix (K2 C1)
        ("console.error('[TrueVision3D] Floor plan thumbnail error:', shotError);",
         "console.error('[ValeVision3D] Floor plan thumbnail error:', shotError);"),
        ("console.error('[TrueVision3D] Floor plan update error:', error);",
         "console.error('[ValeVision3D] Floor plan update error:', error);"),
        # 8 Card created: its picture is baked
        ("                    Na__FpDev__Toast('Added \"' + plan.FloorPlan__Name + '\" to the scene carousel. ' + where.text, where.isError);\n"
         "                }\n"
         "                Na__FpDev__Render();\n",
         "                    Na__FpDev__Toast('Added \"' + plan.FloorPlan__Name + '\" to the scene carousel. ' + where.text, where.isError);\n"
         "                }\n"
         "                Na__FpDev__Render();\n"
         "                Na__FpDev__QueueThumbnails([ plan ]);                            // <-- ValeVision: the new card needs its picture (v2.46.0)\n"),
        # 9 Style rows' handlers (D33)
        ("            onDepthChange : () => {\n"
         "                if (isActive) Na__FloorPlanMode__EnterPlan(plan);\n"
         "                Na__FpDev__AfterEdit(plan);\n"
         "            },\n",
         "            onDepthChange : () => {\n"
         "                if (isActive) Na__FloorPlanMode__EnterPlan(plan);\n"
         "                Na__FpDev__AfterEdit(plan);\n"
         "            },\n"
         "\n"
         "            // VALEVISION | The Advanced fold's style rows (D33). Styles re-apply\n"
         "            // live to the plan on screen; exclusions matter only to the\n"
         "            // projection stage, which reads them when it next runs. Both are\n"
         "            // draft edits, kept by Update like everything else.\n"
         "            onStyleChange : () => {\n"
         "                if (isActive) Na__FloorPlanMode__ApplyStyles(plan);\n"
         "                Na__FpDev__AfterEdit(plan);\n"
         "            },\n"
         "            onExclusionsChange : () => Na__FpDev__AfterEdit(plan),\n"),
        # 10 Update waits for a running thumbnail bake
        ("    async function Na__FpDev__UpdatePlan(plan) {\n        if (Na__FpDev__Busy) return false;\n",
         "    async function Na__FpDev__UpdatePlan(plan) {\n        if (Na__FpDev__Busy) return false;\n"
         "        if (Na__DrawThumb__IsBusy()) {                                           // <-- ValeVision: a bake is flipping drawings on screen\n"
         "            Na__FpDev__Toast('Thumbnails are still being baked. Press Update again when they have finished.', true);\n"
         "            return false;\n"
         "        }\n"),
        # 11 Update bakes projected linework before its save (D20)
        ("            staged = await Na__DrawRename__StageFloorPlan(plan);\n",
         "            staged = await Na__DrawRename__StageFloorPlan(plan);\n"
         "\n"
         "            // VALEVISION | Projected linework baked first, so the records carry\n"
         "            // their assets (D20). Never throws and never blocks the save.\n"
         "            await Na__PlStore__BakeBeforeSave(Na__FpDev__ShowToast);\n"),
        # 12 The ValeVision region, ahead of Panel Mutations
        ("// -----------------------------------------------------------------------------\n"
         "// REGION | Panel Mutations\n"
         "// -----------------------------------------------------------------------------\n",
         EDITOR_VV_REGION),
        # 13 Add: the new card's picture is baked
        ("            Na__FpDev__Toast('\"' + plan.FloorPlan__Name + '\" added. ' + where.text, where.isError);\n"
         "        }\n"
         "        return plan;\n",
         "            Na__FpDev__Toast('\"' + plan.FloorPlan__Name + '\" added. ' + where.text, where.isError);\n"
         "        }\n"
         "        Na__FpDev__QueueThumbnails([ plan ]);                                    // <-- ValeVision: a card without a picture is a broken image\n"
         "        return plan;\n"),
        # 14 Seed: keep the plans made, then bake their cards in one run
        ("        let made = 0;\n"
         "        for (let i = 0; i < storeys.length; i++) {\n"
         "            if (Na__FpDev__CreateOne(config, { name : storeys[i].name, floorDatumMm : storeys[i].floorDatumMm })) made++;\n"
         "        }\n",
         "        let made = 0;\n"
         "        const seeded = [];                                                       // <-- ValeVision: the plans whose cards get a baked thumbnail\n"
         "        for (let i = 0; i < storeys.length; i++) {\n"
         "            const seededPlan = Na__FpDev__CreateOne(config, { name : storeys[i].name, floorDatumMm : storeys[i].floorDatumMm });\n"
         "            if (seededPlan) { made++; seeded.push(seededPlan); }\n"
         "        }\n"),
        ("            Na__FpDev__Toast('Created ' + made + ' floor plan(s) from the model storeys. ' + where.text, where.isError);\n"
         "        }\n"
         "        return made;\n",
         "            Na__FpDev__Toast('Created ' + made + ' floor plan(s) from the model storeys. ' + where.text, where.isError);\n"
         "        }\n"
         "        Na__FpDev__QueueThumbnails(seeded);                                      // <-- ValeVision: one bake run for the lot\n"
         "        return made;\n"),
        # 15 Ground Floor quick action beside the +
        ("            onAdd    : () => { void Na__FpDev__AddPlan({}); }\n"
         "        }));\n",
         "            onAdd    : () => { void Na__FpDev__AddPlan({}); }\n"
         "        }));\n"
         "        Na__FpDev__AddGroundFloorQuickAction(Na__FpDev__Panel.lastChild);        // <-- ValeVision: Ground Floor Plan beside the + (D11)\n"),
        # 16 Bake Missing Thumbnails in the foot
        ("            'One floor plan for each storey the model names', () => { void Na__FpDev__SeedFromStoreys(); }\n"
         "        ));\n",
         "            'One floor plan for each storey the model names', () => { void Na__FpDev__SeedFromStoreys(); }\n"
         "        ));\n"
         "        actions.appendChild(Na__DrawShell__Button(                               // <-- ValeVision: cards that never had a picture (v2.46.0)\n"
         "            Na__FpCfg__GetLabel('BakeThumbnailsLabel', 'Bake Missing Thumbnails'), '',\n"
         "            'Bake a thumbnail for every floor plan card whose picture does not load. Hand-framed thumbnails are left alone.',\n"
         "            () => { void Na__FpDev__BakeMissingThumbnails(); }\n"
         "        ));\n"),
    ]
    return apply(text, pairs, "editor")


# =============================================================================
# ROW BUILDERS
# =============================================================================

ROWS_PORT_NOTE = (
    "//\n"
    "// PORT NOTE:\n"
    "// - Ported from   : TrueVision3D 02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__DevMenu__RowBuilders__.js\n"
    "// - Source version: 2.0.0 (TrueVision3D v2.86.0, 20-Sep-2026; read at b2aa9151) - with the storey row of\n"
    "//                   v2.87.0. Neither is confirmed by Adam in TrueVision yet; ported under DR-01 (c)\n"
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-04}}, whole; first ported 09-Sep-2026 for\n"
    "//                   ValeVision3D v2.18.0 (port Phase 2)\n"
    "// - Parity        : adapted\n"
    "// - Divergences   :\n"
    "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
    "//   - An Advanced fold under View depth holds the Styles toggles and the Exclude field, built by the\n"
    "//     shared Na__DrawView__StyleRows__ with the plan record's accessors; the editor's onStyleChange and\n"
    "//     onExclusionsChange handlers take the edits (D33, DR-32).\n"
    "// - History       : ValeVision's own 1.1.0 and 1.2.0 (09-Sep-2026: the styles row and exclusion field, then\n"
    "//                   the shared StyleRows) are superseded by this port; the style rows live on as the seam above.\n"
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
    "    // MODULE IMPORTS | ValeVision: the Shared Style Rows and the Plan's Style Accessors (D33)\n"
    "    // ------------------------------------------------------------\n"
    "    // @delegate: ../40__System__DrawingViewCore/Na__DrawView__StyleRows__.js\n"
    "    // ------------------------------------------------------------\n"
    "    import {\n"
    "        Na__DrawStyleRow__BuildStylesRow,\n"
    "        Na__DrawStyleRow__BuildExclusionsRow\n"
    "    } from '../40__System__DrawingViewCore/Na__DrawView__StyleRows__.js';\n"
    "    import {\n"
    "        Na__FpData__GetStyles,\n"
    "        Na__FpData__SetStyle,\n"
    "        Na__FpData__GetExcludeTokens,\n"
    "        Na__FpData__SetExcludeTokens\n"
    "    } from './Na__FloorPlan__ProjectJson__Data__.js';\n"
    "    // ------------------------------------------------------------\n"
)


def build_rows():
    text = tv_bytes(FP + "Na__FloorPlan__DevMenu__RowBuilders__.js").decode("utf-8")
    pairs = [
        ("// TRUEVISION3D - FLOOR PLAN VIEWS - DEV MENU ROW BUILDERS\n",
         "// VALEVISION3D - FLOOR PLAN VIEWS - DEV MENU ROW BUILDERS\n"),
        ("//\n" + RULE + "//\n// DEVELOPMENT LOG:\n", "//\n" + RULE + ROWS_PORT_NOTE),
        ("        Na__DrawShell__BuildCommitActions\n"
         "    } from '../40__System__DrawingViewCore/Na__DrawView__DevRowShell__.js';\n"
         "    // ------------------------------------------------------------\n",
         "        Na__DrawShell__BuildCommitActions,\n"
         "        Na__DrawShell__BuildAdvanced\n"
         + ROWS_VV_IMPORTS),
        ("    const Na__FpRow__OFFSET_STEP_MM = 50;\n"
         "    // ------------------------------------------------------------\n",
         "    const Na__FpRow__OFFSET_STEP_MM = 50;\n"
         "    // ------------------------------------------------------------\n"
         "\n"
         "    // MODULE CONSTANTS | ValeVision: Style Row Accessors (the plan record's own, D33)\n"
         "    // ------------------------------------------------------------\n"
         "    const Na__FpRow__STYLE_ACCESSORS = Object.freeze({\n"
         "        getStyles : Na__FpData__GetStyles,\n"
         "        setStyle  : Na__FpData__SetStyle,\n"
         "        getTokens : Na__FpData__GetExcludeTokens,\n"
         "        setTokens : Na__FpData__SetExcludeTokens,\n"
         "        getLabel  : Na__FpCfg__GetLabel\n"
         "    });\n"
         "    // ------------------------------------------------------------\n"),
        ("    //   onPreviewToggle, onAnnotate, onUpdate, onRevert\n    // }\n",
         "    //   onPreviewToggle, onAnnotate, onUpdate, onRevert,\n"
         "    //   onStyleChange, onExclusionsChange   (ValeVision: the Advanced fold's style rows)\n"
         "    // }\n"),
        ("                plan.FloorPlan__ViewDepthMm = (Number.isFinite(value) && value > 0) ? value : null;\n"
         "                handlers.onDepthChange();\n"
         "            }\n"
         "        ).row);\n",
         "                plan.FloorPlan__ViewDepthMm = (Number.isFinite(value) && value > 0) ? value : null;\n"
         "                handlers.onDepthChange();\n"
         "            }\n"
         "        ).row);\n"
         "\n"
         "        // ADVANCED | ValeVision: the drawing's styles and the categories left\n"
         "        // out of its linework - set once, rarely revisited, and read by the\n"
         "        // Layout Editor viewports of this plan too (D33). Folded, as the\n"
         "        // Elevations row's model bearing is.\n"
         "        const advanced = Na__DrawShell__BuildAdvanced(plan.FloorPlan__Id, 'Advanced');\n"
         "        advanced.body.appendChild(Na__DrawStyleRow__BuildStylesRow(plan, Na__FpRow__STYLE_ACCESSORS, handlers.onStyleChange));\n"
         "        advanced.body.appendChild(Na__DrawStyleRow__BuildExclusionsRow(plan, Na__FpRow__STYLE_ACCESSORS, handlers.onExclusionsChange));\n"
         "        rowRoot.appendChild(advanced.element);\n"),
    ]
    return apply(text, pairs, "rows")


# =============================================================================
# APP CONFIG (TrueVision's text, ValeVision's description, labels unioned)
# =============================================================================

def build_config():
    text = tv_bytes(FP + "Na__FloorPlan__AppConfig__.json").decode("utf-8")
    live = json.loads(open(os.path.join(BACKUP, "Na__FloorPlan__AppConfig__.json"), encoding="utf-8").read())
    vv_desc = live["FloorPlanViews__Description"]
    pairs = [
        ('    "FloorPlanViews__Description": "Configuration for the Floor Plan Views system - the developer-authored 2D plan cuts built on top of the section cut engine. Per-project floor plan definitions live in the project\'s own TrueVision__ProjectData__.json, nested inside PresentationMode__SavedCameraScenes so they ride the existing R2 dev-key sync path. All distance values are integer millimetres and are converted to Three.js units in code.",\n',
         '    "FloorPlanViews__Description": ' + json.dumps(vv_desc) + ',\n'),
        ('        "FloorPlanViews__Labels__ThumbnailLabel": "Save Thumbnail",\n',
         '        "FloorPlanViews__Labels__ThumbnailLabel": "Save Thumbnail",\n'
         '        "FloorPlanViews__Labels__BakeThumbnailsLabel": "Bake Missing Thumbnails",\n'),
        ('        "FloorPlanViews__Labels__StoreyConfirmHint": "Keep this storey, wherever the cut is moved to."\n',
         '        "FloorPlanViews__Labels__StoreyConfirmHint": "Keep this storey, wherever the cut is moved to.",\n'
         '        "FloorPlanViews__Labels__GroundFloorPlanLabel": "+ Ground Floor",\n'
         '        "FloorPlanViews__Labels__GroundFloorPlanName": "Ground Floor Plan",\n'
         '        "FloorPlanViews__Labels__StylesTitle": "Styles",\n'
         '        "FloorPlanViews__Labels__StyleProjectedLineworkLabel": "Projected Linework",\n'
         '        "FloorPlanViews__Labels__StyleProfileLineworkLabel": "Profile Linework Effect",\n'
         '        "FloorPlanViews__Labels__StyleGlassOpaqueLabel": "Glass Transparency Off",\n'
         '        "FloorPlanViews__Labels__StyleWhitecardLabel": "Whitecard",\n'
         '        "FloorPlanViews__Labels__ExclusionsFieldLabel": "Exclude",\n'
         '        "FloorPlanViews__Labels__ExclusionsPlaceholder": "Default list"\n'),
    ]
    out = apply(text, pairs, "config")

    # PROOF | Same keys and values as the live file, but for the one value this package changes
    built = json.loads(out)
    expected = json.loads(json.dumps(live))
    expected["FloorPlanViews__Labels__Config"]["FloorPlanViews__Labels__GroundFloorPlanLabel"] = "+ Ground Floor"
    if built != expected:
        raise SystemExit("CONFIG union check failed: the rebuilt JSON differs from the live union beyond the one label")
    tv = json.loads(text)
    def flat(d, p=""):
        r = {}
        for k, v in d.items():
            if isinstance(v, dict): r.update(flat(v, p + k + "/"))
            else: r[p + k] = v
        return r
    ft, fb = flat(tv), flat(built)
    missing = [k for k in ft if k not in fb]
    if missing:
        raise SystemExit("CONFIG lost TrueVision keys: %r" % missing)
    return out


# =============================================================================
# STYLESHEET (ValeVision's current file, which is TrueVision's + the Style Toggles region)
# =============================================================================

def build_css():
    text = open(os.path.join(BACKUP, "Na__FloorPlan__Styles__DevMenu__.css"), "rb").read().decode("utf-8")
    pairs = [
        (" *   - The Style Toggles region at the end is this app's: the per-drawing style rows (D33), which\n"
         " *     DR-32 keeps (.na-fp-dev__styles, .na-fp-dev__style).\n",
         " *   - The Style Toggles region at the end is this app's: the per-drawing style rows (D33), which\n"
         " *     DR-32 keeps (.na-fp-dev__styles, .na-fp-dev__style); since {{VVREL:W2-04}} they sit under the\n"
         " *     row's Advanced fold.\n"
         " *   - The Ground Floor Quick Action region is this app's too: the Ground Floor Plan button beside\n"
         " *     the panel head's + (.na-fp-dev__quick-add, D11, DR-32; added {{VVREL:W2-04}}).\n"),
    ]
    out = apply(text, pairs, "css")
    tail = (
        "\n"
        "\n"
        "/* ----------------------------------------------------------------- */\n"
        "/* REGION  |  Ground Floor Quick Action (ValeVision addition, D11)   */\n"
        "/* ----------------------------------------------------------------- */\n"
        "\n"
        "/* Beside the panel head's square +, at the +'s height, so the head reads\n"
        "   as one line: the title, then the two ways to add a plan. */\n"
        ".na-draw-dev__panel-head .na-fp-dev__quick-add {\n"
        "    flex                               : 0 0 auto;\n"
        "    height                             : 26px;\n"
        "    padding                            : 0 8px;\n"
        "    line-height                        : 1;\n"
        "    white-space                        : nowrap;\n"
        "}\n"
        "\n"
        "/* endregion ------------------------------------------------------- */\n"
    )
    if not out.endswith("/* endregion ------------------------------------------------------- */\n"):
        raise SystemExit("CSS does not end with its Style Toggles endregion line")
    return out + tail


# =============================================================================
# THUMBNAIL BAKE (ValeVision-only module: documentation of the new save, version 1.0.2)
# =============================================================================

def build_bake():
    text = open(os.path.join(BACKUP, "Na__DrawView__ThumbnailBake__.js"), "rb").read().decode("utf-8")
    pairs = [
        ("// - ONE SAVE. When something baked, the owning editor's own Save runs once at\n"
         "//   the end, so the recorded framing lands with the linework bake and the\n"
         "//   drawings block exactly as Save Elevations or Save Floor Plans writes them.\n"
         "//   The scenes are re-broadcast so every card fetches its picture again.\n",
         "// - ONE SAVE. When something baked, the save the owning editor hands in runs\n"
         "//   once at the end, and the scenes are re-broadcast so every card fetches\n"
         "//   its picture again. The Floor Plans editor (TrueVision's 2.0.0 menu, rows\n"
         "//   that are drafts) hands in its draft guard's SaveBlock, so a plan row\n"
         "//   still being edited goes out as it was last updated and a bake never\n"
         "//   keeps a half-moved plan; the Elevations editor hands in Save Elevations\n"
         "//   until its own rebuild.\n"),
        ("// DEVELOPMENT LOG:\n"
         "// 28-Sep-2026 - Version 1.0.1 (per-scene lighting, v2.71.0)\n",
         "// DEVELOPMENT LOG:\n"
         "// 02-Oct-2026 - Version 1.0.2 (Floor Plans menu rebuild, {{VVREL:W2-04}})\n"
         "// - The Floor Plans editor's save is its draft guard's SaveBlock: TrueVision's\n"
         "//   2.0.0 menu has no Save Floor Plans, and a bake's one save must not carry\n"
         "//   a plan row that is still being edited. The run itself is unchanged.\n"
         "//\n"
         "// 28-Sep-2026 - Version 1.0.1 (per-scene lighting, v2.71.0)\n"),
        ("    //   save      : async () => boolean   the owning editor's Save, run once when something baked\n",
         "    //   save      : async () => boolean   the owning editor's save, run once when something baked\n"
         "    //                                     (Floor Plans: the draft guard's SaveBlock)\n"),
    ]
    return apply(text, pairs, "bake")


BUILDERS = {"editor": build_editor, "rows": build_rows, "config": build_config, "css": build_css, "bake": build_bake}


def sha(b):
    return hashlib.sha256(b).hexdigest()


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "--check"
    results = {k: f().encode("utf-8") for k, f in BUILDERS.items()}
    for k, b in results.items():
        if b"\r\n" in b:
            raise SystemExit("CRLF in " + k)

    if mode == "--out":
        out = sys.argv[2]
        for k, b in results.items():
            p = os.path.join(out, os.path.basename(TARGETS[k]))
            os.makedirs(out, exist_ok=True)
            open(p, "wb").write(b)
            print("wrote", p, len(b))
        return

    if mode == "--land":
        for k in results:
            live = open(live_path(TARGETS[k]), "rb").read()
            back = open(os.path.join(BACKUP, os.path.basename(TARGETS[k])), "rb").read()
            if sha(live) != sha(back):
                raise SystemExit("REFUSED: %s changed since the backup - nothing written" % TARGETS[k])
        for k, b in results.items():
            open(live_path(TARGETS[k]), "wb").write(b)
            print("landed", TARGETS[k], len(b))
        return

    if mode == "--restore":
        for k in results:
            back = open(os.path.join(BACKUP, os.path.basename(TARGETS[k])), "rb").read()
            open(live_path(TARGETS[k]), "wb").write(back)
            print("restored", TARGETS[k])
        return

    ok = True
    for k, b in results.items():
        live = open(live_path(TARGETS[k]), "rb").read()
        same = (live == b)
        ok = ok and same
        print(("same " if same else "DIFF ") + TARGETS[k])
    print("CHECK PASS" if ok else "CHECK FAIL")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
