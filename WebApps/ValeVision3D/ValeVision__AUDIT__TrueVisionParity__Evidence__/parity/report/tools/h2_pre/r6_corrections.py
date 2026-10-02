# -*- coding: utf-8 -*-
"""R6 (Section F) - package-level corrections to K3, rows C10 onward of F.8, and the display overlay.

One source for two things:
  1. the F.8 rows C10 onward (finding, evidence, exact replacement text), and
  2. the overlay that F.3 (catalogue) and F.6.1 (the filled W1-33 brief) show, so a delegator that
     reads either sees the corrected text, marked "[F.8 Cn]".

The overlay changes TEXT ONLY (acceptance, targets, adaptations, goal, risk, notes, est_note,
hard_gate) on a deep copy. It never changes depends_on, est_lines, edits or hard-gate presence, so
every count, level, path and hot-file order in F.2, F.4 and F.7 is still computed from
wp_canonical.json as it stands. Each operation is guarded: it applies when its old text is present,
is skipped when the new text is already there (wp_canonical.json patched by the planner), and
raises when neither is true (the correction has gone stale and must be re-checked).

Every fact below was re-checked on 01-Oct-2026 against the file or command it cites
(read-only on both apps; TV read at b2aa9151, VV at 7b4e593a).
"""
import copy

# Op: dict(pkg, kind, field, [index], [old], new)
#   kind 'list_sub'   - replace old with new inside item <index> (1-based) of a list field
#   kind 'list_add'   - append new to a list field
#   kind 'str_sub'    - replace old with new inside a string field
#   kind 'str_add'    - append new to a string field
#   kind 'source_note'- add a note inside the annotation of tv_sources item <index>


def _op(pkg, kind, field, new, old=None, index=None):
    return {'pkg': pkg, 'kind': kind, 'field': field, 'index': index, 'old': old, 'new': new}


# Ops for two of this section's own earlier rows (C1, C7), so the catalogue shows them applied too.
EARLIER_ROW_OPS = {
    'C1': [_op('W0-01', 'list_sub', 'acceptance', index=5,
               old='if unanswered, W3-04 lands them held (W3-05 switches them on later)',
               new='if unanswered, W3-03 writes the four guards and W3-04 stays held')],
    'C7': [_op('W6-01', 'list_sub', 'acceptance', index=2,
               old='The TV test inventory closes with zero unaccounted files.',
               new="The TV test inventory closes with zero unaccounted files; Na__Test__MoveAnchor__ and CopyDrag's guarded parts may read 'held with W3-04' while DR-40 items 7-10 are unanswered.")],
}

SEAM_IMMEDIATE = (
    "The immediate seam (VV-only; recorded under PORT NOTE Divergences in LoadingScreen, ModeController and LoadingVeil): "
    "LoadingScreen gains and exports Na__LeLoadScreen__IsShown() - true while its loading state is up, not fading and not the error state "
    "(the test Show already makes, VV LoadingScreen :166, :168); the ModeController imports it from "
    "../01__Core__Loader/Na__LayoutEditor__LoadingScreen__.js (a leaf with no imports) and calls "
    "Na__LeVeil__FirstOpen(Na__LeMode__Host, { specification, textMetrics, viewportCount, immediate : Na__LeLoadScreen__IsShown() }) "
    "at TV's call site (TV ModeController :733); FirstOpen with immediate true adds na-le-veil--visible and na-le-veil--shown together, "
    "with no reflow between them, before it returns - one frame at full opacity, because a display and an opacity change in the same frame "
    "skip the 320 ms fade (TV's own note, LoadingOverlays :275-277, :294-308) - instead of arming the 550 ms timer (TV LoadingVeil :103, :353); "
    "the fade-out stays TV's. Enter(sheetId) keeps TV's signature; the warm path, quiet Dev actions and Quiet document tabs never see the "
    "boot cover, so they keep TV's 550 ms rule or no veil.")

CORRECTIONS = [
    {
        'id': 'C10',
        'item': 'W0-01 and W0-02: two commits inside Wave 0',
        'finding': "W0-01 writes `VV/ValeVision__PLAN__TrueVisionPort__LayoutEditor__.md`, inside the VV app root, and W0-02 depends on it. W0-02's preflight and `k2_renumber_apply.py --mode git` refuse any change under that root, and no agent commits (P19), so W0-02 could never start; a W0-02 rollback to HEAD would also discard W0-01's Decisions block. R1 A.3.2 Step 4 already has Adam commit W0-02 alone, which K3's one-commit-per-wave rule did not provide for.",
        'evidence': "`wp_canonical.json` W0-01 `edits`, W0-02 `depends_on` and acceptance item 1; `k2_renumber_apply.py:269-273` (`git status --porcelain -- .` under the app root); R1 A.3.2 Steps 0 and 4, A.4 #8.",
        'also': 'F.2.1 diagram, P19, F.4.2 step 2, F.5.2 W0 entry and F.5.7.',
        'ops': [
            _op('W0-01', 'list_add', 'acceptance',
                "Adam commits this PLAN edit on its own (that one path) before W0-02 is dispatched, so W0-02's preflight sees a clean VV tree (F.5.2)."),
            _op('W0-02', 'list_sub', 'acceptance', index=1,
                old='Step 0 preflight per K2 section 9: clean git status',
                new="Step 0 preflight per K2 section 9: Adam's W0-01 commit is in HEAD; clean git status"),
            _op('W0-02', 'list_add', 'acceptance',
                'When every other item of this list passes, Adam commits W0-02 alone (code only; its records follow in W0-06 and W0-99) before any other W0 package is dispatched; from then on a W0-02 rollback is a git revert of that commit (F.5.7).'),
        ],
    },
    {
        'id': 'C11',
        'item': 'W0-02: the DistanceCulling banner',
        'finding': "R2 B.5 #12 gives W0-02 a hand edit that neither the K2 script nor W0-02's adaptations name: after FR-11 the moved file keeps VV's '(MAXENGINE ONLY)' banner qualifier, so its banner differs from TV's (K2 H1).",
        'evidence': "VV `05__RenderPipeline/02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__.js:2` `VALEVISION3D - DISTANCE CULLING (MAXENGINE ONLY)`; TV `05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js:2` `TRUEVISION3D - DISTANCE CULLING`; R2 B.3.1.",
        'ops': [
            _op('W0-02', 'list_add', 'vv_adaptations',
                'Hand edit after FR-11: the DistanceCulling banner becomes `VALEVISION3D - DISTANCE CULLING` (TV\'s text, K2 H1) and the MaxEngine-only qualifier moves into its PORT NOTE (R2 B.2.3).'),
            _op('W0-02', 'list_add', 'acceptance',
                'Line 2 of VVM/05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js reads `// VALEVISION3D - DISTANCE CULLING`; the MaxEngine-only qualifier is in its PORT NOTE.'),
        ],
    },
    {
        'id': 'C12',
        'item': 'W0-03: the SectionClipping__State header',
        'finding': 'No package owns the header fix R2 B.3.1 rules for `05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js`: VV says `NAMESPACE : Na__RenderEffect` although its 7 exports are `Na__SectionClipping__*`, and its MODULE line differs from TV\'s. W0-03 already does identity hygiene in W0 and the file has no other editor.',
        'evidence': 'VV file `:6-7` (`Na__RenderEffect`, `Section Clipping State`) and exports `:146-153`; TV `:6-7` (`Na__SectionClipping`, `Render Pipeline - Section Clipping State`); no `wp_canonical.json` package lists the file.',
        'ops': [
            _op('W0-03', 'list_add', 'vv_targets', 'VVM/05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js (header only)'),
            _op('W0-03', 'list_add', 'vv_adaptations',
                "Na__RenderEffect__SectionClipping__State.js: `NAMESPACE : Na__SectionClipping` and TV's `MODULE : Render Pipeline - Section Clipping State`; VV's DESCRIPTION and INTEGRATION (dual engine, 41 CrossSectionView) stay as declared divergences (R2 B.3.1)."),
            _op('W0-03', 'list_add', 'acceptance',
                'git diff -w of Na__RenderEffect__SectionClipping__State.js shows only its NAMESPACE and MODULE lines (and their divergence note).'),
        ],
    },
    {
        'id': 'C13',
        'item': 'W0-04: the G4 exemptions, the TrueVisionHub exception and a baseline allow-list',
        'finding': "G4 cannot pass when it starts. W0-04's lint exempts only PORT NOTE 'Ported from' lines and history, but `AutoSave__.js:48` names `window.TrueVision__Pwa__HasUnsavedWork` in a PORT NOTE 'Divergences' line, and `SpecPdf__.js:147` reads `window.TrueVision__Pwa__ProjectContext` until W0-12, which W0-04 does not depend on. W4-12 keeps `Na__LayoutEditor__Statement__Standard__TrueVisionHub__.js` at TV's path, so W4-12 would fail its own gate. The PortNotes half has the same problem at scale: W0-04's acceptance item 2 has it report missing 'Source version' lines, and only 72 of the 257 VV source and style files with a PORT NOTE carry one. Adding W0-12 to W0-04's `depends_on` would cure only the first hit and lengthen W0's critical path from 5,599 to 6,699 lines, so a baseline allow-list is used.",
        'evidence': 'Grep of VV `02__Src__AppModules`, `03__Style__AppStylesheets`, `80__Testing__PrototypeEnvironment` and `index.html` for `TrueVision__`, `TRUEVISION3D`, `[TrueVision3D`, `NaProjectPortal` outside \'Ported from\' lines: 4 lines - `PlanDimensions__Styles__.css:8` and `SpecPdf__.js:431` (W0-03 fixes both), `SpecPdf__.js:147` (W0-12), `AutoSave__.js:48` (PORT NOTE); grep of VV `02__Src__AppModules` and `03__Style__AppStylesheets` (.js, .mjs, .css) for files containing \'PORT NOTE\' (257) and \'Source version\' (72); W0-04 `depends_on` [W0-03, W0-06] and acceptance item 2; TV TrueVisionHub file: 19 `TrueVision` strings at b2aa9151; W4-12 vv_adaptations.',
        'also': 'P7 (G3 and G4 foreign failures), F.5.1 G4 row.',
        'ops': [
            _op('W0-04', 'list_sub', 'vv_adaptations', index=1,
                old='PORT NOTE "Ported from" lines and history are exempt.',
                new="Exempt from the identity checks: the whole PORT NOTE block of a file (from its `// PORT NOTE:` line to the next `// ----` rule), history documents (devlog, ledger, `__PLAN__`, `__NOTES__`, `Research__` and `TASK__` files) and one named file, `LE/52__Feature__StatementWriter/09__Standard__Sections/Na__LayoutEditor__Statement__Standard__TrueVisionHub__.js` (kept at TV's path by W4-12 with ID TrueVisionHub, excluded from VV's DEFINITIONS by config, DR-43)."),
            _op('W0-04', 'list_add', 'vv_adaptations',
                "A baseline allow-list beside the verifiers holds every pre-existing hit outside those exemptions, recorded on the tree W0-04 lands on: for ParityNaming the one read at `LE/50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js:147` (`window.TrueVision__Pwa__ProjectContext`, removed by W0-12); for PortNotes the PORT NOTE blocks written before the K2 H5 format (on 01-Oct, 257 VV source and style files carry a PORT NOTE and 72 a 'Source version' line). An allow-listed hit prints WARN; a file leaves the list when a package next writes it, and its own G4 then applies in full; the ParityNaming part must be empty at W0-99."),
            _op('W0-04', 'list_sub', 'acceptance', index=1,
                old="Na__Verify__ParityNaming__ runs clean on VV after W0-02/W0-03;",
                new="Na__Verify__ParityNaming__ runs clean on VV after W0-02/W0-03 apart from the allow-listed SpecPdf__.js:147 WARN (gone after W0-12);"),
            _op('W0-04', 'list_sub', 'acceptance', index=1,
                old="it PASSES VV's cdn.noble-architecture.com/VaApps and font URLs.",
                new="it PASSES VV's cdn.noble-architecture.com/VaApps and font URLs, a TrueVision string inside a PORT NOTE block (AutoSave__.js:48) and the named TrueVisionHub file."),
        ],
    },
    {
        'id': 'C14',
        'item': 'W0-06: the 41 README',
        'finding': 'K2 N6 and F6 and DR-26 require `41__System__CrossSectionView/README__CrossSectionView__.md` naming the DIV-2 twins, but no package creates it.',
        'evidence': 'K2 rulebook N6, F6; DR-26 `blocks` ("41__System__CrossSectionView (README)"); the folder holds 7 files and no README on 01-Oct; no `vv_targets` entry in `wp_canonical.json`; R1 A.4 #3, R2 B.5 #2.',
        'ops': [
            _op('W0-06', 'list_add', 'vv_targets', 'VVM/41__System__CrossSectionView/README__CrossSectionView__.md (new)'),
            _op('W0-06', 'list_add', 'acceptance',
                "VVM/41__System__CrossSectionView/README__CrossSectionView__.md names the DIV-2 twins (VV 41 CrossSectionView, the live Cross Sections tool; TV 41 SectionCutEngine) and tells them apart from TV's 48 CrossSectionViews placeholder (K2 N6, F6; DR-26)."),
        ],
    },
    {
        'id': 'C15',
        'item': "W0-06 note and W1-34 adaptation: who writes WP-S10-08R's header lines",
        'finding': "W0-06's note sends WP-S10-08R's VV header lines to W1-29/W1-30/W1-31, but the raw map splits WP-S10-08R into W1-33; W1-33 and W1-34 already say they write those lines, and none of W1-29..W1-31 edits the TabStrip or the Toolbar. W1-34's adaptation also claims the Toolbar PORT NOTE, but W1-34 does not edit the Toolbar; W0-06 does (comment-only).",
        'evidence': '`wp_raw_map.json` WP-S10-08R -> canonical W0-06, split_into [W1-33]; W1-33 vv_adaptations (last item); W1-34 `vv_targets` (no Toolbar); W0-06 `vv_targets` (Toolbar); raw WP-S10-08R scope ("TabStrip and Toolbar PORT NOTEs ... Toolbar\'s duplicate 1.8.0 / 1.9.0 entries"); R4 D.5 #7.',
        'ops': [
            _op('W0-06', 'list_sub', 'notes', index=1,
                old="WP-S10-08R's header-line items for ModeController/Loader/TabStrip/Toolbar are folded into W1-29/W1-30/W1-31 (they edit those files); its ledger rows are done here.",
                new="WP-S10-08R's VV header lines are written by W1-33 (the ModeController and Loader entries for the v2.70.0 veil wiring, and LoadingVeil) and W1-34 (the TabStrip PORT NOTE); the Toolbar PORT NOTE and its duplicate 1.8.0 / 1.9.0 log entries are written here (comment-only); its ledger rows are done here."),
            _op('W1-34', 'list_sub', 'vv_adaptations', index=4,
                old='TabStrip/Toolbar PORT NOTE lines of WP-S10-08R.',
                new="the TabStrip PORT NOTE line of WP-S10-08R (the Toolbar's is W0-06's: W1-34 does not edit the Toolbar)."),
        ],
    },
    {
        'id': 'C16',
        'item': 'W0-09, W0-18 and W4-99: who restarts Flask',
        'finding': "W0-09's risk says Flask does not reload routes and W4-99 has Adam run a Flask restart, while F.4.1 gives the WCP Flask lifecycle to the integrator. `server.py` starts with `app.run(..., debug=True)`, so the Werkzeug reloader restarts it on a change when it was started with `python server.py` (not confirmed at runtime, R3 C.6). The integrator is the only owner of restarts; the worker redeploy stays Adam's.",
        'evidence': '`WCP/server.py:1007-1011`; W0-09 and W0-18 `risk`; W4-99 acceptance item 1; R3 C.6.',
        'also': 'F.5.2 W0 and W4 exits, F.5.4 W4 item 6.',
        'ops': [
            _op('W0-09', 'str_sub', 'risk',
                old="; Flask does not reload routes (restart needed).",
                new=". server.py starts with app.run(..., debug=True), so the reloader picks up route changes when it was started with python server.py; the integrator owns restarts and checks that the new routes answer (F.4.1)."),
            _op('W0-18', 'str_sub', 'risk',
                old='; Flask restart needed.',
                new='; the integrator checks that the new routes answer and restarts Flask if needed (F.4.1).'),
            _op('W4-99', 'list_sub', 'acceptance', index=1,
                old='(the worker redeploy and Flask restart Adam must run are named)',
                new="(the worker redeploy Adam must run is named; Flask restarts are the integrator's, F.4.1)"),
        ],
    },
    {
        'id': 'C17',
        'item': 'W0-10: merge-keys and the editor-owned key list',
        'finding': "The worker's merge-keys guard works on prefix families while `ProjectData__EditorOwnedKeys` lists exact keys: a listed key outside the families would be refused by the worker, and an unlisted key inside a family would pass the worker but be dropped by the sync.",
        'evidence': 'R3 C.2 (d6) and C.6; S12 b.5, b.7; W0-07 writes the list into `VVM/02__AppData/Na__AppConfig__Main.json`; W0-10 `depends_on` [W0-07].',
        'ops': [
            _op('W0-10', 'list_add', 'vv_adaptations',
                "merge-keys takes its allowed keys from ProjectData__EditorOwnedKeys (VVM/02__AppData/Na__AppConfig__Main.json, written by W0-07): the worker's family table is generated from that list or tested against it, so one list governs the localhost overlay, the worker and the sync."),
            _op('W0-10', 'list_add', 'acceptance',
                'The node tests cover both directions: every key in ProjectData__EditorOwnedKeys passes merge-keys, and a key absent from the list - inside a prefix family or not - is refused.'),
        ],
    },
    {
        'id': 'C18',
        'item': "W0-14: R2AssetUpload's MODULE line",
        'finding': "W0-14 adopts TV's upload contract but its adaptations do not mention the header; the MODULE line differs from TV's (K2 H3).",
        'evidence': 'VV `03__AppUtils/Na__AppUtils__R2AssetUpload__.js:7` `MODULE : R2AssetUpload`; TV `:7` `MODULE : App Utils - R2 Asset Upload`; R2 B.3.1, B.5 #5.',
        'ops': [
            _op('W0-14', 'list_add', 'vv_adaptations',
                "Na__AppUtils__R2AssetUpload__.js takes TV's `MODULE : App Utils - R2 Asset Upload` (K2 H3)."),
            _op('W0-14', 'list_sub', 'acceptance', index=4,
                old='PORT NOTEs record the gate, DB name and Description divergences.',
                new="PORT NOTEs record the gate, DB name and Description divergences; R2AssetUpload's MODULE line equals TV's."),
        ],
    },
    {
        'id': 'C19',
        'item': 'W0-18 and W3-09: sheet-image rasters under the DR-29 default',
        'finding': "DR-29's default commits JSON only. W0-18 adds a .gitignore allow-list for hashed picture names and checks that git sees them, and W3-09 relies on committed pictures as a GitHub Pages fallback, while W0-19 already ignores statement pictures: two packages applied opposite raster rules under one default. TV's own read order (localhost: the repository copy, then R2; web: R2, the site's copy, then Pages) is kept.",
        'evidence': "`decision_register.json` DR-29 default_if_unanswered: \"(A); commit JSON only; rasters, PDFs and archives not committed until you decide\"; W0-18 goal, vv_adaptations item 3, acceptance item 3; W0-19 acceptance item 3; W3-09 acceptance item 3; TV `LE/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Source__.js:108-113`.",
        'ops': [
            _op('W0-18', 'str_sub', 'goal',
                old='and allow-list hashed picture names in the ValeCodebase .gitignore.',
                new='and keep sheet-image rasters out of the ValeCodebase repository through its .gitignore (DR-29 default).'),
            _op('W0-18', 'list_sub', 'vv_adaptations', index=3,
                old='.gitignore allow-list for hashed picture names, excluding 00__Archive (DR-29: JSON committed, rasters per Adam).',
                new=".gitignore ignores every raster under */05__Layout__DrawingDocs__Images/, its 00__Archive included (DR-29 default: JSON only; rasters, PDFs and archives are not committed until Adam decides). Only if Adam answers DR-29 'commit pictures' does it become an allow-list of hashed picture names, still excluding 00__Archive, and W0-19 follows the same answer."),
            _op('W0-18', 'list_sub', 'acceptance', index=3,
                old='git status shows only hashed picture names under the images folder.',
                new='git check-ignore: every raster under */05__Layout__DrawingDocs__Images/ (its 00__Archive included) is ignored; git status shows no raster under the images folder.'),
            _op('W3-09', 'list_sub', 'acceptance', index=3,
                old='The read-only web build reads the picture from R2, then GitHub Pages;',
                new="The read-only web build reads the picture from R2 first; the site's own copy and GitHub Pages hold one only if Adam answers DR-29 'commit pictures'. On localhost the Flask copy is read first, then R2 (TV SheetImages__Source__ :108-113);"),
        ],
    },
    {
        'id': 'C20',
        'item': 'W1-10 and W2-05: the VV-only exports of the elevation data module',
        'finding': "W1-10 takes TV's elevation data module 1.1.0 whole; TV's export list has no `Na__ElevData__STYLE_KEYS`, `SetAzimuthDeg` or `SetSeededFrom`, but W1-10's adaptations re-add only the SeededFrom field. VV's Elevation DevMenu Editor imports both setters until W2-05 replaces it with TV 2.1.0, whose ApplyFacePick sets Elevation__AzimuthDeg directly. Ruling: keep both setters through W1 and retire them in W2-05; STYLE_KEYS has no importer outside its module but stays as a VV-only export (K2 X2, DR-32 D33).",
        'evidence': 'VV `46__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js` exports `:795`, `:805`, `:817`; VV `Na__Elevation__DevMenu__Editor__.js:130-131`, `:402-404`, `:450`; TV `45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js` export list; TV `Na__Elevation__DevMenu__Editor__.js:730-739`; DR-32; R2 B.3.4, B.5 #4.',
        'planner': "add the data module to W2-05's `edits` and to `hot_file_ownership.json` (barrier-ordered W1-10 -> W2-05).",
        'ops': [
            _op('W1-10', 'list_add', 'vv_adaptations',
                "After the whole-file take, re-add the VV-only exports (K2 X2): Na__ElevData__STYLE_KEYS (DR-32 D33) and, only while VV's pre-2.1.0 Elevation DevMenu Editor still imports them (VV Editor :130-131), Na__ElevData__SetAzimuthDeg and Na__ElevData__SetSeededFrom. Both setters retire in W2-05, whose TV 2.1.0 editor sets Elevation__AzimuthDeg in ApplyFacePick (TV Editor :730-739) and never writes Elevation__SeededFrom; their PORT NOTE Divergences lines say 'retire with W2-05'."),
            _op('W1-10', 'list_add', 'acceptance',
                "G2 passes with VV's current Elevation DevMenu Editor still importing SetAzimuthDeg and SetSeededFrom; Na__ElevData__STYLE_KEYS is exported."),
            _op('W2-05', 'list_add', 'vv_targets',
                'VVM/45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js (hunk: delete SetAzimuthDeg and SetSeededFrom)'),
            _op('W2-05', 'list_add', 'acceptance',
                'Na__ElevData__SetAzimuthDeg and Na__ElevData__SetSeededFrom are gone from the elevation data module and nothing imports them (G2); Elevation__SeededFrom is still preserved on read and save (DR-32).'),
        ],
    },
    {
        'id': 'C21',
        'item': "W1-22, W4-06 and W4-10: no NA job phases in Vale acceptance text",
        'finding': "Three acceptance lines use TV's T01/T02 codes, which are Noble Architecture job stages (TV config `LayoutEditor__DrawingRegister__Phases`: T01 Concept ...). That contradicts DR-11's default ({project}_{drawing} until Adam supplies Vale phases) and PD-15; an agent would fail the line or seed NA phases.",
        'evidence': 'DR-11 default_if_unanswered; R0 PD-15; R3 C.2 (c) phases row; TV LE AppConfig `:1232-1242` at b2aa9151; TV `Na__LayoutEditor__Register__Transactions__.js:228-229` (the prompt composes the code through ComposeDocumentId).',
        'ops': [
            _op('W1-22', 'list_sub', 'acceptance', index=3,
                old='(or <code>_T01_D01 once phases exist)',
                new="(or <code>_<phase>_D01 once Adam supplies Vale phases, DR-11 - never NA's T01-T04, PD-15)"),
            _op('W4-06', 'list_sub', 'acceptance', index=1,
                old='the file is named like 3047_T01_S01__Doous__<Title>__.md',
                new="the file is named like 3047_S01__Doous__<Title>__.md (a phase segment appears only once Adam supplies Vale phases, DR-11; never NA's T01-T04)"),
            _op('W4-10', 'list_sub', 'acceptance', index=2,
                old='A phase change asks "Its document code becomes <code>_T02_D01.";',
                new='With a test config holding a Vale phase list (LayoutEditor__DrawingRegister__Phases) and the format {project}_{phase}_{drawing}, a phase change asks "Move D01 - <name> to phase <phase>? Its document code becomes <code>_<phase>_D01." (TV Register__Transactions :228-229); with the shipped DR-11 default ({project}_{drawing}) codes read <code>_D01 and no T01-T04 appears in VV config or output;'),
        ],
    },
    {
        'id': 'C22',
        'item': 'W1-33: the seam that carries "immediate", and the .na-vs-tl selector',
        'finding': "W1-33 adds an `immediate` option to FirstOpen but no source says how Enter learns that the loader's cover is up: TV's Enter(sheetId) takes no option (R4 D.5 #5). Without a recorded seam the brief's own stop rule halts the agent. The seam is recorded here (LoadingScreen predicate; Enter's signature unchanged). The VV-only Video Studio timeline (`.na-vs-tl`, fixed, z 1000) also stays over drawing tabs; the selector is added to the moved hiding block (S10-V03), in VV's own Boot sheet.",
        'evidence': 'TV ModeController `:678` (`Enter(sheetId)`), `:703`, `:733-737`; TV LoadingVeil `:103`, `:164-170`, `:315-358`; TV LoadingOverlays `:275-277`, `:291-308`; VV LoadingScreen `:164-171`, exports `:232-237`; VV Loader `:388-423` (`action(editor)` `:408`, Hide `:419`); VV ModeController `:383` (host appended to body); S10-V03; R4 D.1.4, D.5 #5 and #9.',
        'also': 'F.6.1 brief sections 3, 4 and 6; F.5.4 W1 item 1.',
        'ops': [
            _op('W1-33', 'list_add', 'vv_adaptations', SEAM_IMMEDIATE),
            _op('W1-33', 'list_add', 'vv_adaptations',
                'Add `body.na-layout-editor--active .na-vs-tl` (the VV-only Video Studio timeline, S10-V03) to the moved hiding block in Styles__Boot, recorded in Boot\'s header and in the ledger as a VV-only selector.'),
            _op('W1-33', 'list_add', 'acceptance',
                "No frame of bare stage shows between the boot cover and the in-host veil: on a cold first press FirstOpen's veil is at full opacity before Enter returns, and the loader hides the boot cover only after action(editor) (DevTools performance recording with screenshots; Adam's W1 smoke item 1). With a Video Studio path open, a drawing tab hides the timeline."),
        ],
    },
    {
        'id': 'C23',
        'item': 'W1-34 acceptance item 1: the menu after the fold',
        'finding': 'The menu cannot hang under the strip "during" the fold: PlaceMenu runs only on open, on a rebuild while open, on scroll and on resize, and a mode change shuts the menu. Identical in TV.',
        'evidence': 'TV TabStrip at b2aa9151: PlaceMenu `:508-519`, called `:370`, `:574`, `:649`, `:655-658`; mode change closes the menu `:662`; R4 D.5 #2.',
        'ops': [
            _op('W1-34', 'list_sub', 'acceptance', index=1,
                old='the menu hangs under the strip during and after the header fold.',
                new='the menu hangs under the strip after the header fold (PlaceMenu runs on open, on a rebuild while open, on scroll and on resize, TV TabStrip :370, :574, :649, :655-658; a mode change shuts it, :662).'),
        ],
    },
    {
        'id': 'C24',
        'item': 'W1-37 and W2-03: the PlanDimensions getter seam',
        'finding': "VV moved the `Na__PlanDim__*` config getters into `44__System__PlanDimensions/Na__PlanDimensions__ConfigState__.js`; every TV file that imports them from `Data__` needs that import seam in VV. W2-04 states it; W1-37 (PlanAnnotations Toolbar) and W2-03 (Elevation ModeController hunk) do not.",
        'evidence': 'TV PlanAnnotations Toolbar `:102` (from `44 .../Na__PlanDimensions__Data__.js`); VV Toolbar `:109` (from `ConfigState__`) and PORT NOTE `:42`; TV Elevation ModeController `:179` (`Na__PlanDim__Load` from `Data__`); R2 B.3.3, B.5 #7.',
        'ops': [
            _op('W1-37', 'list_add', 'vv_adaptations',
                'PlanAnnotations Toolbar: the Na__PlanDim__* config getters TV imports from 44 Data__ (TV Toolbar :102) are imported from 44__System__PlanDimensions/Na__PlanDimensions__ConfigState__.js in VV (VV Toolbar :109, PORT NOTE :42), until WT-01 makes TV match.'),
            _op('W2-03', 'list_add', 'vv_adaptations',
                'Elevation ModeController hunk: any Na__PlanDim__* getter it brings in (TV :179 imports Na__PlanDim__Load from Data__) is imported from Na__PlanDimensions__ConfigState__.js (R2 B.3.3).'),
        ],
    },
    {
        'id': 'C25',
        'item': 'W2-02 and WT-02: the SectionAdapter names',
        'finding': "Four of the six adapter calls were named only from K3's wording (R2 B.3.5) and WT-02 (TrueVision lane, outside the VV barrier) may run before W2-02. The six names are fixed here so both sides write the same ones whatever the order.",
        'evidence': 'R2 B.3.5 and B.5 #6; R3 C.6; VV SectionAdapter exports 13 names today (`42__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js:480-494`); WT-02 `depends_on` [WT-09] only.',
        'ops': [
            _op('W2-02', 'list_add', 'vv_adaptations',
                'The six adapter exports are fixed (F.8 C25): Na__DrawView__SectionAdapter__Serialize, __Apply, __GetOutlineWidthPx, __SetOutlineWidthPx, __SetModelRoot and __RenderDepthInto, beside the 13 existing exports; the Port Record lists them for WT-02.'),
            _op('W2-02', 'list_add', 'acceptance',
                'The adapter exports exactly those six names beside its existing 13; SnapshotRenderer (W2-15) and 49 RenderLayer (W2-03) import only these for sections.'),
            _op('WT-02', 'list_add', 'notes',
                'Uses the six adapter names fixed by F.8 C25 (Na__DrawView__SectionAdapter__Serialize, __Apply, __GetOutlineWidthPx, __SetOutlineWidthPx, __SetModelRoot, __RenderDepthInto), whether or not W2-02 has landed.'),
        ],
    },
    {
        'id': 'C26',
        'item': "W2-03: TiledRenderer's TilePlan re-export and header",
        'finding': "VV's TiledRenderer wraps `Na__TilePlan__ClampToDeviceLimits` and `IsIosDevice` in `Na__StaticExport__*` functions that nothing imports; TV re-exports the TilePlan names (K2 X1). Its banner and MODULE text also differ. W2-03 is the first VV editor of the file (R2 B.5 #12, B.3.1, B.3.2).",
        'evidence': 'VV `30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js:173-186`, exports `:671-672`; no importer in VV `02__Src__AppModules`, `80__Testing__PrototypeEnvironment` or `index.html` (grep); TV `:541-542`.',
        'ops': [
            _op('W2-03', 'list_add', 'vv_adaptations',
                "TiledRenderer: replace the Na__StaticExport__ClampToDeviceLimits / IsIosDevice wrappers (VV :173-186, exported :671-672; no importer) with TV's re-export of Na__TilePlan__ClampToDeviceLimits and Na__TilePlan__IsIosDevice (TV :541-542, K2 X1), and take TV's banner and MODULE text (STATIC EXPORT TILED RENDERER)."),
            _op('W2-03', 'list_add', 'acceptance',
                'TiledRenderer re-exports Na__TilePlan__ClampToDeviceLimits and Na__TilePlan__IsIosDevice as TV does and defines no Na__StaticExport__ wrapper for them; G2 passes.'),
        ],
    },
    {
        'id': 'C27',
        'item': 'W2-15 catalogue row: SnapshotRenderer is hunk-replayed, never moved',
        'finding': "`r6_build_sectionF.py` read the '->' inside K3's annotation '(1.7.0 -> 1.13.0 hunks)' as a move and printed TV's SnapshotRenderer under **move:**; an agent could take or move the file whole, which DIV-1 forbids. Fixed in `r6_compute.parse_item` (only a top-level ' -> ' marks a move; W2-15 was the only item affected) and the annotation now says so.",
        'evidence': '`wp_canonical.json` W2-15 `tv_sources`; W2-15 vv_adaptations ("SnapshotRenderer stays a hunk-replayed file (never taken whole)"); R0 Permanent Divergence Register, DIV-1 row ("SnapshotRenderer is hunk-replayed only (W2-15), never taken whole"); `r6_compute.py` `top_level_arrow`.',
        'ops': [
            _op('W2-15', 'source_note', 'tv_sources', index=1, new='DIV-1 hunk replay, never whole'),
        ],
    },
    {
        'id': 'C28',
        'item': 'W2-34: the local-server probe',
        'finding': "W2-34 still names the `/api/check-localhost` probe. DR-28 (A) adds `GET /api/health {status:'ok', service:'whitecardopedia-local-dev'}` to WCP/server.py (W0-09) and changes one SERVICE constant per ported module; TV's spell check already probes `/api/health` through such a constant.",
        'evidence': 'DR-28 options and recommendation ("/api/health (A)"); TV `55__Feature__SpellCheck/Na__SpellCheck__Dictionary__.js:97` (`Na__SpellCheck__SERVER_SERVICE`), `:355-357`; `WCP/server.py:322-328` (only `/api/check-localhost` today); W0-09 goal; R3 C.6.',
        'ops': [
            _op('W2-34', 'str_sub', 'goal',
                old='/api/check-localhost probe',
                new="the SERVICE constant of TV's /api/health probe (Na__SpellCheck__SERVER_SERVICE = 'whitecardopedia-local-dev', DR-28 (A); W0-09 adds the route)"),
            _op('W2-34', 'list_sub', 'acceptance', index=1,
                old='A server without the route reads as "restart" (via /api/check-localhost)',
                new="A server whose GET /api/health answers service 'whitecardopedia-local-dev' but has no spellings route reads as \"restart\""),
        ],
    },
    {
        'id': 'C29',
        'item': "W3-09 acceptance item 2: sheet images on R2 need worker 1.6.0",
        'finding': "W3-09 waits only for the W0-07 sync fix before writing pictures to R2, but the sheet-image routes (list, upload, copy, delete) are new in worker 1.6.0; the deployed `/assets` route accepts only PresentationMode/Thumbnails and LayoutEditor/(Linework|Snapshots) keys.",
        'evidence': '`WCP/CloudflareWorker/src/handlers/CloudflareHandler__ProjectAsset__.js:51` (`Na__Asset__PATH_GUARD`); W0-10 family F-IMG; R3 C.2 (g) sheet-image rows; R0 P9.',
        'also': 'F.2.1 diagram (D1 edge), P12, F.5.2 W3 entry.',
        'ops': [
            _op('W3-09', 'list_sub', 'acceptance', index=2,
                old='(only after Adam ran W0-07, R8)',
                new='(only after Adam has applied W0-07 and deployed worker 1.6.0, whose sheet-image routes are new: the deployed /assets route accepts only PresentationMode/Thumbnails and LayoutEditor/(Linework|Snapshots) keys, CloudflareHandler__ProjectAsset__.js:51; R8)'),
        ],
    },
    {
        'id': 'C30',
        'item': "W4-17 (and W0-19's goal): the reader's localhost path and the 52 README",
        'finding': "W4-17's localhost URL `http://127.0.0.1:8000/Projects/{folderId}/06__...` reaches WCP/server.py's catch-all, which answers index.html with 200 for a missing file, breaking the reader's 'a 404 is an answer' rule; `/Whitecardopedia/<path>` answers a real JSON 404. W0-19's goal says 'give /Projects/ real 404s' but no acceptance item checks it and its adaptation routes nothing through serve_static. No package creates `52__System__Layout__PublishedDocuments/README__PublishedDocuments__.md` (TV's names `30__TrueVision__AppContent`). The 55 README is already W2-34's (`vv_targets`), so R5's open issue holds for 52 only.",
        'evidence': '`WCP/server.py:899-910` (JSON 404), `:956-977` (catch-all); VV `03__AppUtils/Na__AppUtils__ProjectLoader.js:464-475`; TV `52__System__Layout__PublishedDocuments/README__PublishedDocuments__.md` (60 lines; `:13`); `wp_canonical.json` W2-34 and W4-17 `vv_targets`; R3 C.2 (g), C.5, C.6.',
        'ops': [
            _op('W4-17', 'list_sub', 'vv_adaptations', index=1,
                old='on localhost the Flask copy first (http://127.0.0.1:8000/Projects/{folderId}/06__...), live the VaApps CDN.',
                new="on localhost the Flask copy first at new URL('../Whitecardopedia/Projects/' + folderId + '/06__Layout__PublishedDocuments/...', AppRootUrl) - the facade's repoUrl form, whose /Whitecardopedia/<path> route answers a real JSON 404 (WCP/server.py:899-910), where /Projects/... reaches the catch-all that answers index.html with 200 (:956-977) - then R2; live the R2 URL from ProjectData__AssetUrls__R2BaseUrl, never ResolveAssetUrl's hasImages_R2 gate (ProjectLoader :464-475)."),
            _op('W4-17', 'list_add', 'vv_targets', 'VVM/52__System__Layout__PublishedDocuments/README__PublishedDocuments__.md (new)'),
            _op('W4-17', 'list_add', 'vv_adaptations',
                "README__PublishedDocuments__.md: TV's README (60 lines at b2aa9151) with VV storage words (VaApps/Projects/<folderId>/06__Layout__PublishedDocuments/ on R2, WCP/Projects/{yyyy}/{folder}/06__Layout__PublishedDocuments/ locally); never 30__TrueVision__AppContent."),
            _op('W4-17', 'list_add', 'acceptance',
                "A missing published file on localhost answers 404 and the reader shows its 'not published' mask, never an index.html parse failure (checked once W4-02 imports the leaves); README__PublishedDocuments__.md exists and names no NA path."),
            _op('W0-19', 'str_sub', 'goal',
                old='give /Projects/ real 404s',
                new='answer missing published and statement files with a JSON 404 through the blueprints (nothing reads through serve_static)'),
        ],
    },
    {
        'id': 'C31',
        'item': "W6-03: the 91 count and the keep-or-archive choice for 35's title blocks",
        'finding': "W6-03's estimate note counts 4 files in 91; after FR-08 moves 2dProfileLines out, 7 remain. Folder 35 also holds Vale title-block material no package keeps: the VizDpt A3 variant and 12 per-size A1-A3 layouts.",
        'evidence': '`ls` of `VVM/40__System__2dElevationsView/` (8 files, 7 after FR-08); `VVM/35__System__PageLayoutSystem/02__VizDpt__TitleBlock__Pdf__/` (A3 pdf and png) and `03__TitleBlock__LayoutPdfs__RecConcept__Feb-2026__/` (6 pdf, 6 png); R1 A.4 #2; R2 B.5 #8.',
        'ops': [
            _op('W6-03', 'str_sub', 'est_note',
                old='91 (4 files after FR-08 moved 2dProfileLines out)',
                new='91 (7 files after FR-08 moved 2dProfileLines out)'),
            _op('W6-03', 'str_add', 'hard_gate',
                'Adam also chooses keep or archive for the Vale title-block material in 35 that no package keeps: 02__VizDpt__TitleBlock__Pdf__ (the VizDpt A3 variant, pdf and png) and 03__TitleBlock__LayoutPdfs__RecConcept__Feb-2026__ (12 A1-A3 layouts).'),
        ],
    },
    {
        'id': 'C32',
        'item': "WT-08: TrueVision's twin of the folder-number registry",
        'finding': "K2 says both repos keep the same registry table; W0-06 writes VV's, and TV already reuses its own numbers (52/53), but WT-08 does not list a TV twin.",
        'evidence': '`K2__TargetMaps.md:344` ("both repos keep the same table ... and a TV twin"); WT-08 `tv_targets`; R1 A.4 #10.',
        'ops': [
            _op('WT-08', 'list_add', 'tv_targets', 'TV/TrueVision__NOTES__FolderNumberRegistry__.md (new)'),
            _op('WT-08', 'list_add', 'acceptance',
                'TV/TrueVision__NOTES__FolderNumberRegistry__.md carries the same number table as VV/ValeVision__NOTES__FolderNumberRegistry__.md (W0-06; K2 section 8).'),
        ],
    },
]

# The proposed package (no wp_canonical.json record yet, so no overlay): rendered as F.8 C33.
PROPOSED_ID = 'W5-07'
PROPOSED = {
    'id': 'C33',
    'item': 'New conditional package W5-07 (proposed here; not yet in wp_canonical.json): retire the per-project Layout Mode switch',
    'finding': "DR-25 keeps VV's Layout Mode switch now and recommends retiring it at the publishing port, but no package retires it: W4-09 only records the re-decision. The switch spans ProjectData (key, getter, setter), the ModeController and Loader (IsAvailable, IsLayoutModeOn, SetLayoutMode), the TabStrip, the Dev menu row and three LE AppConfig labels.",
    'evidence': "DR-25 recommendation (\"(a) now, re-decided at the publishing port (DR-22) with retirement recommended then\"); W4-09 vv_adaptations; VV `42__System__DrawingViewCore/Na__DrawView__ProjectData__.js:112`, `:323-331`, `:487-488`; VV ModeController `:327-330`; VV Loader `:503-513`, `:614`; VV LE AppConfig `:502-504`; TV TabStrip `:316` (`Na__LeCfg__IsEnabled() && sheets.length > 0`); S03a-F26.",
    'applied': "The planner adds W5-07 'Retire the Layout Mode switch (only if DR-25 is answered retire at W4-09)'. Hard gate: runs only on that answer, else SKIPPED-HELD (F.4.2 step 6) and DR-25 (a) stands. depends_on W5-03 and W5-05; W5-99 gains it. Targets: `VVM/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js` (drop LAYOUT_MODE_KEY and Get/SetLayoutModeEnabled; the stored key stays in existing project.json files, never read or written again); `VLE/05__Core__ModeController/Na__LayoutEditor__ModeController__.js` (IsAvailable on TV's rule; drop IsLayoutModeOn and SetLayoutMode); `VLE/01__Core__Loader/Na__LayoutEditor__Loader__.js` (IsAvailable on the same rule from the raw block; drop its two Layout Mode exports); `VLE/05__Core__ModeController/Na__LayoutEditor__TabStrip__.js` (visibility exactly TV :316, through the facade); `VLE/70__DevTools__DevMenu/Na__LayoutEditor__DevMenu__Controls__.js` (Layout Mode row removed); `VLE/03__Core__Config/Na__LayoutEditor__AppConfig__.json` (the three LayoutMode labels removed). Hot-file slots: ModeController and Loader after W5-03, AppConfig after W5-05; ProjectData, TabStrip and Dev menu Controls barrier-ordered after W1-12, W4-13 and W2-17. Acceptance: on a project whose stored switch is off, the strip shows when IsEnabled() and at least one sheet hold, exactly as TV TabStrip :316; the live site still shows clients published drawings only (W4-09); G1 and G2 pass with no importer of a removed name; the Layout Mode PORT NOTE Divergences lines are deleted. Size S (about 250 lines; this section's estimate, not K3's). Smoke: F.5.4 W5 item 3.",
}

KIND_WORDS = {'list_sub': 'item {index}: "{old}" becomes "{new}"',
              'list_add': 'gains "{new}"',
              'str_sub': '"{old}" becomes "{new}"',
              'str_add': 'gains "{new}"',
              'source_note': 'item {index} gains the annotation "{new}"'}


def describe(op):
    """Exact replacement text for the F.8 'Applied here as' cell."""
    field = op['field']
    words = KIND_WORDS[op['kind']].format(index=op['index'], old=op['old'], new=op['new'])
    if op['kind'] == 'list_add' and field in ('vv_targets', 'tv_targets'):
        words = 'gains `%s`' % op['new']
    return '%s %s: %s' % (op['pkg'], field, words)


def _mark(cid):
    return ' [F.8 %s]' % cid


def _apply(p, op, cid):
    k, field = op['kind'], op['field']
    mark = _mark(cid)
    if k == 'list_sub':
        lst = p.get(field) or []
        i = op['index'] - 1
        if i >= len(lst):
            raise ValueError('%s %s %s: no item %d' % (cid, p['wp_id'], field, op['index']))
        item = lst[i]
        if op['old'] in item:
            lst[i] = item.replace(op['old'], op['new'], 1) + ('' if mark in item else mark)
        elif op['new'] in item:
            pass
        else:
            raise ValueError('%s stale: %s %s item %d holds neither the old nor the new text' % (cid, p['wp_id'], field, op['index']))
    elif k == 'list_add':
        lst = p.setdefault(field, [])
        if field in ('vv_targets', 'tv_targets'):
            base = op['new'].split(' (')[0]
            if any(x.split(' (')[0] == base for x in lst):
                return
            lst.append(op['new'] + ' (F.8 %s)' % cid)
        else:
            if any(op['new'] in x for x in lst):
                return
            lst.append(op['new'] + mark)
    elif k == 'str_sub':
        s = p.get(field) or ''
        if op['old'] in s:
            p[field] = s.replace(op['old'], op['new'], 1) + ('' if mark in s else mark)
        elif op['new'] in s:
            pass
        else:
            raise ValueError('%s stale: %s %s holds neither the old nor the new text' % (cid, p['wp_id'], field))
    elif k == 'str_add':
        s = p.get(field) or ''
        if op['new'] in s:
            return
        p[field] = (s + ' ' if s else '') + op['new'] + mark
    elif k == 'source_note':
        lst = p[field]
        i = op['index'] - 1
        item = lst[i]
        if op['new'] in item:
            return
        if item.endswith(')'):
            lst[i] = item[:-1] + '; ' + op['new'] + ')' + ' (F.8 %s)' % cid
        else:
            lst[i] = item + ' (' + op['new'] + ') (F.8 %s)' % cid
    else:
        raise ValueError('unknown op kind ' + k)


def all_ops():
    for cid, ops in EARLIER_ROW_OPS.items():
        for op in ops:
            yield cid, op
    for c in CORRECTIONS:
        for op in c['ops']:
            yield c['id'], op


def overlaid(P):
    """Deep copy of the package map with every correction applied for display (text only)."""
    PV = copy.deepcopy(P)
    for cid, op in all_ops():
        _apply(PV[op['pkg']], op, cid)
    return PV


def touched():
    """Package id -> sorted correction ids that change its displayed text."""
    out = {}
    for cid, op in all_ops():
        out.setdefault(op['pkg'], set()).add(cid)
    return {k: sorted(v, key=lambda c: int(c[1:])) for k, v in out.items()}


def rows():
    """F.8 rows C10 onward: (id, item, finding, evidence, applied)."""
    out = []
    for c in CORRECTIONS:
        applied = '; '.join(describe(op) for op in c['ops'])
        if c.get('also'):
            applied += '. Also applied in ' + c['also']
        if c.get('planner'):
            applied += '. Planner: ' + c['planner']
        out.append((c['id'], c['item'], c['finding'], c['evidence'], applied))
    out.append((PROPOSED['id'], PROPOSED['item'], PROPOSED['finding'], PROPOSED['evidence'], PROPOSED['applied']))
    return out
