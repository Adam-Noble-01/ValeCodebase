# Cross Section View

**Folder:** `02__Src__AppModules/41__System__CrossSectionView/`
**Author:** Adam Noble - Noble Architecture
**Created:** 01-Oct-2026 (records only; the folder's code dates from 14-Jul-2026)

ValeVision's live **Cross Sections** tool: SketchUp-style section planes that cut the loaded model, with solid cap
fills, clean profile outlines and a draggable plane gizmo, switched on per project from the Dev Tools menu. It is also
the section engine behind every ValeVision drawing: floor plans, elevations and sections cut the model through this
folder, by way of the drawing core's section adapter.

The folder keeps its own name. TrueVision has a folder at the same number for the same job, written differently, and
a second, unrelated folder with "Cross Section" in its name. This note tells the three apart so that nobody ports
one over another.

---

## The twins: same number, same job, different engines (DIV-2)

| | ValeVision | TrueVision |
| --- | --- | --- |
| Folder | `41__System__CrossSectionView/` (this folder) | `41__System__SectionCutEngine/` |
| What it is | The **live Cross Sections user tool** (Tools menu, per-project gate), which also cuts every drawing | A purpose-built clipping engine with **no user tool**, written for TrueVision's drawings |
| Files | 7 files, 3,697 lines (below) | 7 files, 2,638 lines at TrueVision commit `b2aa9151`: `Na__SectionCut__Engine__`, `__CapGeometry__`, `__CapMeshes__`, `__ConfigState__`, `__SceneData__`, `__Serialize__` and `Na__SectionCut__Engine__AppConfig__.json` |
| Saved data | `CrossSection__SceneData`, keyed by scene name, written by `Na__CrossSectionView__SceneData.js` | The same block since TrueVision v2.21.0 (its decision TD06: "Section data is recorded in ValeVision's structure, exactly") |
| How drawings reach it | Through `40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js` | Through its own `Na__DrawView__SectionAdapter__.js`, a pass-through to `Na__SectionCut__*` |

The two folders share **no file name**, so renaming this folder to TrueVision's would resolve none of TrueVision's
imports into its 41; that is why the name stays (K2 rulebook N6; decision DR-26, recorded as D66 in
`ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md`). Both apps' numbers say 41; the folder-number registry
(`ValeVision__NOTES__FolderNumberRegistry__.md` at the app root) records 41 as one number with two engines.

**The schema is ValeVision's.** TrueVision's decision TD06 makes this folder's `CrossSection__SceneData` the reference
both apps write. TrueVision still deviates from it in two places (the sign of `positionMm` and its per-scene entry
keys); those are fixed in TrueVision only, by the TrueVision-lane package WT-02, if Adam approves it (DR-41, DR-36).

## Rules for anyone porting TrueVision code

- **Never port `41__System__SectionCutEngine/` into ValeVision** - above all `Na__SectionCut__Serialize__.js` and
  `Na__SectionCut__SceneData__.js`, which would write a second, deviating copy of this folder's block (DR-41, D81;
  K2 rule K2).
- **A TrueVision file that imports `Na__SectionCut__*` is ported against the section adapter**, never against this
  folder directly: `Na__DrawView__SectionAdapter__.js` keeps TrueVision's path, file name and 13 export names, with
  ValeVision's body and its private NAMESPACE `Na__DrawSection` (K2 rule H3). The adapter's remaining TrueVision calls
  (serialize and apply, the outline width, the model root, the depth render for the fog) are completed by W2-02.
- **This folder's own files are ValeVision-only** and are never overwritten by a port. A change here is a ValeVision
  change, recorded in the parity ledger's Module Register as a ValeVision-only row.

## Not to be confused with TrueVision's `48__System__CrossSectionViews`

TrueVision also has `48__System__CrossSectionViews/` - one file, `Na__CrossSection__DevMenu__Editor__.js`, version
0.1.0, 198 lines. It is **not a section engine**. It is a placeholder panel in TrueVision's Dev Tools menu that Adam
asked for on 20-Sep-2026, holding the place where a future "Cross Sections" drawing system will be authored (free cuts
anywhere through the building, in the same style of menu as Floor Plans and Elevations). Today it authors nothing,
stores nothing and only lists the sections already drawn as elevations.

- It lands in ValeVision at TrueVision's number, `48__System__CrossSectionViews/`, byte for byte, with the
  Elevations Dev-menu rebuild (package W2-05; DR-26, D66).
- **Its DOM ids collide with this folder's Dev gate today.** TrueVision's panel uses `naCrossSectionDevItem`,
  `naCrossSectionDevToggle` and `naCrossSectionDevPanel`; this folder's per-project gate uses the same three ids, plus
  `naCrossSectionDevEnableCheck` and `naCrossSectionDevSave` (ValeVision `index.html` lines 855-866 and
  `Na__UiFeature__CrossSectionView__DevControls.js` lines 79-83 on 01-Oct-2026). W2-05 renames **ValeVision's own** gate
  ids (to `naCrossSectionToolDev*`, no stylesheet uses them), so TrueVision's file ports with no TrueVision edit
  (K2 rule S4).

## Where sections are filed (a temporary divergence)

ValeVision files a Section-mode elevation into the **Cross Sections** scene group (VV plan D28); TrueVision files every
elevation, sections included, into **Elevations**. ValeVision keeps D28 until TrueVision's 48 grows past its 0.1.0
placeholder, then the two apps settle on one rule (DR-26, D66). The rule lives in
`45__System__ElevationViews/Na__Elevation__SceneLink__.js`, not in this folder.

---

## The files

| File | Lines | What it is |
| --- | --- | --- |
| `Na__CrossSectionView__SystemLogic.js` | 1,753 | The section planes: per-material clipping, cap fills, profile outlines, the gizmo, the per-project gate; the additive exports the section adapter calls (`GetSectionById`, `SetSectionPositionMm`, `ReapplyClipping`). |
| `Na__CrossSectionView__CapGeometry.js` | 597 | Boolean-style cap fills and clean outer profile loops for one plane. |
| `Na__CrossSectionView__PlaneGizmo.js` | 204 | The draggable in-scene plane widget. |
| `Na__CrossSectionView__SceneData.js` | 503 | The `CrossSection__SceneData` block: section states bound to Presentation Mode scenes by name, with the drawing approach scenes skipped. |
| `Na__UiFeature__CrossSectionView__Controls.js` | 387 | The Tools menu Cross Section dropdown. |
| `Na__UiFeature__CrossSectionView__DevControls.js` | 211 | The Dev Tools menu section that switches the tool on for a project and saves `CrossSection__Config` (the ids W2-05 renames). |
| `Na__CrossSectionView__Config.json` | 42 | The tool's defaults. |

Outside this folder: `40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js` (the adapter, 497 lines),
`05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js` (the plane list the profile-line materials read), and
the drawing core's `Na__DrawView__ProjectData__.js` and `Na__DrawView__RenameDrawing__.js`, which import this folder's
SceneData so a drawings save carries the block and a renamed scene keeps its section binding.

## Records

- Decisions: VV plan D07 (drawing sections drive this tool through an adapter), D28 (filing), D66 (DR-26: name kept,
  this README, TrueVision's 48 ported after VV renames its gate ids), D81 (DR-41: schema), D76 (DR-36: TrueVision is
  not edited by the ValeVision waves).
- Parity ledger (`ValeVision__PARITY__TrueVisionLedger__.md`): DIV-2 in its header; this folder's rows in its Module
  Register.
- This README was added on 01-Oct-2026 by the parity programme's records package W0-06 (audit Section F, correction
  C14; K2 rulebook N6 and F6). Nothing in the folder's code changed.
