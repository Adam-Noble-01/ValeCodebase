"""W2-99 - the Release Watermark data for Wave 2 (ValeVision3D v2.71.4): one entry per TrueVision release the wave
carried. Keys: cls (the new class, when it flips), vv (the VV release cell, when it was '-'), vv_app (appended to it),
pk (packages added to the Packages cell), note (the dated note's text). Every fact is from the Port Records of W2-01 ..
W2-43 and the W2 gate report; Adam's confirmation from TrueVision's devlog at b2aa9151 as the records quote it."""

WM = {
    'v2.24.0': dict(pk=['W2-02'], note=(
        "v2.71.4 completes the section adapter from ValeVision's side: the six calls R6 F.8 C25 fixes for both apps "
        "(Serialize, Apply, the outline width get and set, SetModelRoot, RenderDepthInto) over the live Cross Sections "
        "tool (W2-02, DIV-2); TrueVision's twin lacks them until WT-02 (held). No confirmation line either way")),
    'v2.25.0': dict(pk=['W2-12'], note=(
        "v2.71.4 takes the tiled renderer's renderFrame route as a design, opt-in and for a sheet viewport's fog image "
        "only (W2-12; D-S04a-05 (a)), knowingly reversing TrueVision's note that the route was not worth carrying back")),
    'v2.27.0': dict(pk=[], note=(
        "v2.71.4 aligns the main config as this release did: Drawing2dEdgeWidth removed with its moved-note; the drawing "
        "views read the drawing config's 1.0 and bakes the profileLinework weight (W2-08). Signed off by Adam in "
        "TrueVision on 13-Sep-2026")),
    'v2.28.0': dict(vv_app="VV v2.71.4 (part: ViewportSnapMove 1.0.0-1.6.0 whole, inert, W2-25)", pk=[], note=(
        "landed in v2.71.4, inert: TrueVision's ViewportSnapMove at its own path, LE/28__System__ObjectSnap, with the "
        "carry rules in the Paper sheet (W2-25); nothing imports it - the carry is DR-40 item 9, held. Waiting: W3-03, "
        "W3-04 (with Adam's answer) and W3-06. No try recorded in TrueVision")),
    'v2.30.2': dict(cls='PORTED', vv_app="VV v2.71.4 (W2-08)", pk=[], note=(
        "PORTED in v2.71.4: the main config's Drawing2d keys as this release left them - Drawing2d__Description and the "
        "Drawing2dEdgeWidthMoved note - proven by the getter diff its entry describes (W2-08), after the start-up order "
        "(W0-17, v2.71.1). No sign-off line in TrueVision")),
    'v2.31.0': dict(pk=['W2-25'], note=(
        "v2.71.4 carries ViewportSnapMove 1.1.0 inside the whole 1.6.0 module (W2-25; inert). No try recorded in "
        "TrueVision")),
    'v2.32.0': dict(cls='PORTED', vv_app="VV v2.71.4 (W2-16, W2-15, W2-17, W2-06; dormant, DR-09 (a))",
                    pk=['W2-15', 'W2-17', 'W2-06'], note=(
        "PORTED in v2.71.4, dormant (DR-09 (a)): Model Source 1.1.0 whole (W2-16), the snapshot renderer's phase lines "
        "(W2-15), the Dev menu's live-phase bake (W2-17) and folder 50's optional model root (W2-06); the design-phase "
        "library stays uninitialised, so every viewport resolves to the live model. No confirmation line either way in "
        "TrueVision")),
    'v2.36.0': dict(pk=['W2-26', 'W2-36'], note=(
        "v2.71.4 carries LeaderTool 1.1.0's log line (its code was already here; W2-26) and Panel__Leaders 1.1.0's "
        "(W2-36). 'Waits for Adam's sign-off' in TrueVision")),
    'v2.37.0': dict(cls='PORTED', vv="VV v2.71.4 (W2-43, W2-06)", pk=[], note=(
        "PORTED in v2.71.4: FlushJoins 1.1.0 (W2-43) and the 3D-matching rules across folder 50 - ClipKernel 1.2.0, "
        "EdgeExtractor 1.3.0, AuthoredEdges 1.2.0, CpuBackend, Projector, Pipeline, ConfigAccess, ModelStage, the Dev "
        "controls and the config's rule switches, whole (W2-06); every live project needs a re-bake (DR-31 (4)). Signed "
        "off by Adam in TrueVision on 14-Sep-2026 ('That works great'); only the ValeVision port had been parked")),
    'v2.40.0': dict(vv_app="VV v2.71.4 (part: DimensionTool 1.12.0's atScale on create, W2-26)", pk=[], note=(
        "v2.71.4 takes DimensionTool whole: a new dimension carries Measure at scale (W2-26). Waiting: the Dimensions "
        "panel's row (W3-12). 'Waits for Adam's sign-off' in TrueVision")),
    'v2.41.0': dict(vv_app="VV v2.71.4 (part: DimensionTool's extension-line fields on create, W2-26)", pk=['W2-26'],
                    note=(
        "v2.71.4 takes DimensionTool whole: a new dimension carries the extension-line settings (W2-26). Waiting: the "
        "Dimensions panel's rows (W3-12). 'Waits for Adam's sign-off' in TrueVision")),
    'v2.42.0': dict(vv_app=("VV v2.71.4 (part: DoorPose, ViewDefinition, StageSampler, Projector and Pipeline W2-06; "
                            "PlanDoors W2-11; SnapshotRenderer's door pose W2-15; the viewport units W2-16)"),
                    pk=['W2-15'], note=(
        "landed in v2.71.4 and LIVE: plan viewports draw their doors open with their swings (DR-16 (a)) - folder 50's "
        "door pose (W2-06), PlanDoors (W2-11), the snapshot renderer (W2-15) and the viewport units (W2-16). Waiting: "
        "the Viewport panel's Doors row (W3-15) and a click on a door (W3-03). 'Tested by Adam' blank in TrueVision's "
        "realign plan (row AA)")),
    'v2.48.0': dict(vv_app="VV v2.71.4 (part: GlbParse 1.0.0 and the site plan store, dormant, W2-14)", pk=[], note=(
        "landed in v2.71.4, dormant (DR-08 (B)): GlbParse and the site plan store over the facade, with ValeVision__"
        "SitePlan__ stems and the project's own store folders (W2-14). Waiting: the Sheet panel's Drawing Type row "
        "(W4-10) and a Vale site plan pipeline (W5-06, held). Verified by TrueVision's session on PS01; no line says "
        "Adam tried it")),
    'v2.48.1': dict(cls='PORTED', vv="VV v2.71.4 (W2-06, W2-11, W2-15, W2-16)", pk=['W2-16'], note=(
        "PORTED in v2.71.4 and LIVE: elevations and sections draw every door shut - DoorPose 1.1.0, ViewDefinition 1.2.0 "
        "and Projector 1.4.0 (W2-06), PlanDoors' ShutPoseFor (W2-11), SnapshotRenderer 1.7.1 (W2-15) and Viewport2d "
        "1.8.0 (W2-16); the 3D view's doors never move. Not confirmed by Adam in TrueVision (it rides with row AA)")),
    'v2.49.0': dict(cls='PORTED', vv_app="VV v2.71.4 (W2-14, W2-16; dormant, DR-08 (B))", pk=[], note=(
        "PORTED in v2.71.4, dormant (DR-08 (B)): the store 1.0.1 (W2-14), EdgeStyles 1.1.0, ModelLayers 1.3.0, the Model "
        "Layers panel 1.3.0, ModelSource 1.1.0 and Viewport2d 1.9.0 whole (W2-16). No Vale sheet is a site plan while "
        "LayoutEditor__Sheet__SitePlanDrawingsEnabled is false; a Vale pipeline is W5-06 (held). The S11 verifier "
        "records Adam confirming site plan viewports in TrueVision")),
    'v2.55.0': dict(pk=['W2-16'], note=(
        "v2.71.4 takes TrueVision's site plan painter split, Viewport2d__SitePlan (1.0.0 in this release, now 1.2.0), "
        "whole and dormant (W2-16). No confirmation line")),
    'v2.57.0': dict(cls='PORTED', vv_app="VV v2.71.4 (W2-36)", pk=[], note=(
        "PORTED in v2.71.4: Panel__Text 1.4.0 (read the first of several, write all) and Panel__Leaders 1.2.0 whole "
        "(W2-36); ValeVision's own 1.4.0 had claimed this release without calling Many(). No 'tried' line in "
        "TrueVision")),
    'v2.58.2': dict(cls='PORTED', vv_app="VV v2.71.4 (W2-07, W2-16)", pk=[], note=(
        "PORTED in v2.71.4: ProgressiveRefine 1.0.3 whole and the render loop's guards in the loading sequence (W2-07), "
        "and Viewport3d's sampled-enough reuse rule with the viewport units (W2-16); Asset__Samples came with the "
        "records in v2.71.3. TrueVision's entry closes on its agent's PS01 check; no confirmation line either way")),
    'v2.65.0': dict(vv_app="VV v2.71.4 (part: the hover tooltip, inert, W2-20)", pk=[], note=(
        "v2.71.4 lands the hover tooltip (its 1.0.0 came with this release's commit 4f6bb9ef, unnamed in the entry; "
        "now 1.1.0), inert until W3-03. No confirmation recorded")),
    'v2.75.0': dict(cls='PARTIAL', vv="VV v2.71.4 (part: ItemClipboard 1.3.0 inside 1.7.0, W2-21)", pk=[], note=(
        "landed in v2.71.4: the one selection clipboard - cut, exact in-place and cross-sheet paste - inside "
        "ItemClipboard 1.7.0 (W2-21; commit 32767407, unnamed in this entry), DR-40 item 1 adopted. Waiting: the "
        "shared service-worker package (W0-08, superseded by the move to the OVH server). No confirmation recorded")),
    'v2.78.0': dict(pk=['W2-32'], note=(
        "v2.71.4 carries MarginGrip 1.1.0's log entry within TrueVision's 1.3.0 but holds its automatic-Move term "
        "(DR-40 item 7) for W3-03 (W2-32). No status line in TrueVision")),
    'v2.80.0': dict(pk=['W2-10'], note=(
        "v2.71.4 adds the identity config's Phase block (Phase__ExistingLabelContains), which ValeVision's v2.67.0 port "
        "had left out - the config byte-identical to TrueVision's, the block dormant under DR-09 (a) (W2-10)")),
    'v2.82.0': dict(cls='PORTED', vv_app="VV v2.71.4 (W2-40, W2-01, W2-04, W2-05)", pk=['W2-04', 'W2-05'], note=(
        "PORTED in v2.71.4: the Drawing Planes system whole - the five core leaves and their config (W2-40), the "
        "overlay, grip, Dev controls and stylesheet with index.html's imports and inits and the CSS index line (W2-01) "
        "- and the editors' plane rows (1.1.0 inside 2.x; W2-04, W2-05); Na__Test__DrawingPlanes__ 47 of 47. 'Not yet "
        "signed off by Adam' in TrueVision")),
    'v2.84.0': dict(cls='PORTED', vv_app="VV v2.71.4 (W2-01)", pk=[], note=(
        "PORTED in v2.71.4: the planes half - the overlay 1.1.0 keeps the shown set per project, guards Live and hears "
        "the drawings block (W2-01). 'NOT yet confirmed by Adam' in TrueVision")),
    'v2.86.0': dict(cls='PORTED', vv_app="VV v2.71.4 (W2-04, W2-05)", pk=[], note=(
        "PORTED in v2.71.4: the Floor Plans and Elevations Dev menus 2.x whole with ValeVision's seams (the ground-floor "
        "action, the style rows, the thumbnail bake, bake-before-save, section filing) and TrueVision's 48 Cross "
        "Sections placeholder with its Dev Tools item (W2-04, W2-05). Pending Adam's sign-off in TrueVision (its "
        "DrawingMenus plan, section 6)")),
    'v2.87.0': dict(vv_app=("VV v2.71.4 (part: the storey row mounted W2-04; ViewportTitleText 1.1.0 W2-10; "
                            "ViewportIdentity 1.1.0 W2-16; DrawingTitle 1.1.0 and ViewportLink's level W2-37)"),
                    pk=['W2-04', 'W2-16', 'W2-37'], note=(
        "v2.71.4 mounts the storey row (W2-04) and takes the title text 1.1.0 with its test (W2-10), ViewportIdentity "
        "1.1.0 (W2-16) and the parametric title's level (W2-37): a plan with a storey titles itself PROPOSED GROUND "
        "FLOOR PLAN. Waiting: the parametric scrapbook panel's level field (W3-14). No sign-off line in TrueVision")),
    'v2.89.0': dict(cls='PORTED', vv_app="VV v2.71.4 (W2-14, W2-16, W2-29; dormant, DR-08 (B))", pk=['W2-29'], note=(
        "PORTED in v2.71.4, dormant (DR-08 (B)): the site plan composites panel and Na__Test__SitePlanComposites__ "
        "(151 of 151; W2-14), the painter (W2-16) and the Patterns panel, which first drew nothing until a reload "
        "(W2-29). Not confirmed by Adam in TrueVision (its composites plan P10 is open)")),
    'v2.90.0': dict(vv_app=("VV v2.71.4 (part: the Patterns panel's per-layer Fill switch W2-29; the eyedropper's hatch "
                            "trait W2-21)"), pk=['W2-21'], note=(
        "v2.71.4 adds the Patterns panel (W2-29) and the eyedropper's hatch trait (W2-21; unlogged in its file). "
        "Waiting: the Shapes panel's hatch block (W3-12). No confirmation recorded")),
    'v2.91.0': dict(cls='PORTED', vv_app="VV v2.71.4 (W2-35, W2-37)", pk=['W2-37'], note=(
        "PORTED in v2.71.4: the Specification Scrapbook (LE/58, W2-35) with the mode controller's left-column tabs, and "
        "the scrapbook tile's caption (TileDrag 1.1.0 inside 1.2.0, W2-37). Adam used the tab before asking for "
        "v2.144.0; no sign-off line in TrueVision")),
    'v2.93.0': dict(cls='PORTED', vv="VV v2.71.4 (W2-09, W2-15, W2-16, W2-36)", pk=['W2-15', 'W2-36'], note=(
        "PORTED in v2.71.4: Enhance 1.1.0, Render Composites 1.2.0 and the config's percent Enhance Whitecard row and "
        "test (W2-09), the strength on both render paths (W2-15, W2-16) and the % in the Styles panel (W2-36); the "
        "default 100 changes no sheet. 'NOT SIGNED OFF BY ADAM' in TrueVision")),
    'v2.94.0': dict(vv_app=("VV v2.71.4 (part: the render layer, Dev row and stylesheet, the elevation mode controller's "
                            "hook and the render preset's call W2-03; RenderDepthInto W2-02; the editors' Fog block "
                            "W2-05; Viewport2d__DepthFog and the composites row W2-09, W2-12; the fog image W2-15; "
                            "Viewport2d and Frame W2-16)"), pk=['W2-02', 'W2-05', 'W2-15'], note=(
        "landed in v2.71.4 and LIVE: an elevation's depth fog on screen, in image exports and on sheet viewports "
        "(DR-15 (a); W2-02, W2-03, W2-05, W2-09, W2-12, W2-15, W2-16). Waiting: the PDF exporter's fog layer (W3-16). "
        "'Awaiting Adam's test' in TrueVision's fog plan")),
    'v2.95.0': dict(pk=['W2-06', 'W2-16'], note=(
        "v2.71.4 carries the unlogged nested LineworkModifier owners of this release's commit 62dade1c in folder 50 "
        "(W2-06), the rules through LineworkSettings (W2-13) and Linework 1.2.0 (W2-16). Waiting: the Statement Writer "
        "chain (Wave 4). No devlog entry for the modifier work")),
    'v2.96.0': dict(cls='PORTED', vv="VV v2.71.4 (W2-37)", pk=[], note=(
        "PORTED in v2.71.4: the bar under the far corner - engine 1.3.0's slide point, ScaleBar 1.1.0 (PaperMm, "
        "#858585), DrawingTitle 1.2.0, Grips 1.2.0 and the stylesheet, inside the whole 1.7.0 set, and the ScaleBar "
        "test's fixture (W2-37). 'Adam has not tried it' in TrueVision")),
    'v2.98.0': dict(cls='PARTIAL', vv=("VV v2.71.4 (part: ViewportSnapMove 1.2.0 inside 1.6.0, inert, W2-25; the "
                                       "modifier owners W2-06, W2-13)"), pk=['W2-06'], note=(
        "landed in v2.71.4, inert: ViewportSnapMove 1.2.0's carry (W2-25) and the unlogged modifier owners its commit "
        "carried (W2-06, W2-13). Waiting: the hub (W3-03) and the held carry gesture (W3-04, DR-40 item 9). 'NOT YET "
        "CONFIRMED BY ADAM' in TrueVision")),
    'v2.100.0': dict(vv_app=("VV v2.71.4 (part: the Project QR element, off, W2-38; the engine's choices and linkable, "
                             "Grips 1.3.0 and ViewportLink 1.3.0, W2-37)"), pk=['W3-14'], note=(
        "v2.71.4 lands the Project QR element switched off (DR-12 (A); W2-38) and the engine's choices and linkable "
        "(W2-37). Waiting: its config blocks, tiles and the panel (W3-14); Na__Test__ScrapbookProjectQr__ exits 1 until "
        "then (gate item 4.1). 'NOT YET TRIED BY ADAM' in TrueVision")),
    'v2.101.0': dict(cls='PORTED', vv_app="VV v2.71.4 (W2-16; dormant)", pk=[], note=(
        "PORTED in v2.71.4, dormant (DR-08 (B)): Viewport2d__SitePlan 1.1.0 inside 1.2.0 (W2-16). 'NOT YET TRIED BY "
        "ADAM' in TrueVision")),
    'v2.102.0': dict(cls='PARTIAL', vv="VV v2.71.4 (part: the Project QR element 1.1.0 inside 1.3.0, off, W2-38)",
                     pk=['W3-14'], note=(
        "landed in v2.71.4, off (DR-12 (A)): the element's type set baseline to baseline (W2-38). Waiting: its config "
        "and tiles (W3-14). No try recorded in TrueVision")),
    'v2.104.0': dict(vv_app=("VV v2.71.4 (part: RectangleTool 1.3.0's area W2-26; the custom scrapbook's room hunk and "
                             "the Layers 'area' label W2-36)"), pk=['W2-26', 'W2-36'], note=(
        "v2.71.4 adds RectangleTool's area and layerId (W2-26), the custom scrapbook's measured-room hunk and the "
        "Layers panel's 'area' label (W2-36). Waiting: the Floor Areas panel and schedules (W3-10, W3-17). Adam's notes "
        "drove later releases; no sign-off")),
    'v2.105.0': dict(cls='PORTED', vv="VV v2.71.4 (W2-43, W2-06, W2-15)", pk=[], note=(
        "PORTED in v2.71.4: a floor plan is one storey - Storeys 1.0.0 (W2-43), DoorPose 1.2.0, Projector 1.5.0, "
        "CpuBackend 1.4.0, Pipeline 1.5.0, ConfigAccess 1.2.0, the Storeys block and Na__Test__StoreyBand__ (54 of 54; "
        "W2-06), and the snapshot renderer's storey doors (W2-15). TrueVision's entry: 'Not yet ported: rides with the "
        "pending plan doors port, on Adam's sign-off'")),
    'v2.106.0': dict(cls='PORTED', vv_app="VV v2.71.4 (W2-29, W2-36, W2-37, W2-38)",
                     pk=['W2-29', 'W2-36', 'W2-37', 'W2-38'], note=(
        "PORTED in v2.71.4: the parametric scrapbook's halves (the engine and ViewportLink, W2-37; the Project QR "
        "element, off, W2-38), Patterns joining the accordion (W2-29) and Panel__Shapes 1.8.1 (W2-36). No line either "
        "way in TrueVision")),
    'v2.107.0': dict(vv_app=("VV v2.71.4 (part: Draft mode, its config and stylesheet W2-18; the viewport units' draft "
                             "guards W2-16)"), pk=[], note=(
        "landed in v2.71.4, inert: Draft mode's controller 1.1.0, config and stylesheet (W2-18) and the viewport units' "
        "render guards (W2-16). Waiting: the switch-on (W3-05). No try recorded; 'it waits for Adam's sign-off' in "
        "TrueVision")),
    'v2.108.0': dict(cls='PARTIAL', vv="VV v2.71.4 (part: the Project QR element 1.2.0 inside 1.3.0, off, W2-38)",
                     pk=['W3-14'], note=(
        "landed in v2.71.4, off: the modern handset glyph (W2-38). Waiting: the element's config and tiles (W3-14). "
        "'NOT tried by Adam' in TrueVision")),
    'v2.109.0': dict(vv_app="VV v2.71.4 (part: the Project QR element 1.3.0, off, W2-38)", pk=['W3-14'], note=(
        "v2.71.4 lands the element's 20 mm default and its type sizes (W2-38). Waiting: its config and tiles (W3-14). "
        "'NOT tried by Adam' in TrueVision")),
    'v2.111.0': dict(vv_app=("VV v2.71.4 (part: Draft mode 1.1.0 W2-18; the Measurements box on the zoom settle W2-23; "
                             "MarginGrip 1.2.0 W2-32)"), pk=['W2-23', 'W2-32', 'W3-05'], note=(
        "v2.71.4 adds Draft mode 1.1.0 (inert, W2-18), the Measurements box placed on the zoom settle (W2-23) and the "
        "margin grip with it (W2-32). Waiting: Draft's switch-on (W3-05). 'NOT tried by Adam' in TrueVision")),
    'v2.113.0': dict(vv_app=("VV v2.71.4 (part: Ortho mode and its config W2-18; Measurements' Say W2-23; "
                             "DimensionTool 1.8.0's Ortho XOR Shift W2-26)"), pk=['W2-23', 'W2-26'], note=(
        "v2.71.4 lands Ortho mode, inert (W2-18), the Measurements box's echo line (W2-23) and the dimension tool's "
        "Ortho XOR Shift (W2-26). Waiting: F8 and the toolbar (W3-05). 'NOT tried by Adam' in TrueVision")),
    'v2.114.0': dict(vv_app=("VV v2.71.4 (part: the Drawing Grid, its panel, config and stylesheet W2-18; GridMoves and "
                             "the title-block snaps W2-19, W2-42; ViewportSnapMove 1.3.0 W2-25; the tools' grid snap "
                             "W2-26; Grips 1.4.0 W2-37)"), pk=['W2-19', 'W2-42', 'W2-25', 'W2-26', 'W2-37'], note=(
        "landed in v2.71.4, inert until W3-05: the Drawing Grid with TrueVision's defaults (DR-40 item 5; W2-18), grid "
        "moves and the title-block snaps (W2-19, W2-42), and the drawing tools' and grips' grid snap (W2-25, W2-26, "
        "W2-37). Waiting: F7 and the toolbar (W3-05). 'Adam has not tried it' in TrueVision")),
    'v2.116.0': dict(vv_app=("VV v2.71.4 (part: Grips' shape provider W2-24; EditScope 1.1.1 and Eyedropper 1.8.1 "
                             "W2-21; Panel__Shapes 1.8.2 and Panel__Layers 1.1.1 W2-36)"),
                     pk=['W2-24', 'W2-21', 'W2-36'], note=(
        "v2.71.4 adds the grips' shape provider (W2-24), the selection units' picture rules (W2-21) and the panels' "
        "(W2-36). Waiting: the Sheet Images tools (W3-02, W3-09, W3-18). Adam's own run on his server; no sign-off "
        "line")),
    'v2.117.0': dict(cls='PARTIAL', vv=("VV v2.71.4 (part: ItemClipboard 1.4.0's CloneInPlace W2-21; ViewportSnapMove "
                                        "1.4.0, inert, W2-25)"), pk=[], note=(
        "landed in v2.71.4: CloneInPlace (W2-21) and ViewportSnapMove 1.4.0 (inert, W2-25). Waiting: the hub's copy "
        "drag (W3-03) and the held carry (W3-04). 'NOT tried by Adam' in TrueVision")),
    'v2.118.0': dict(cls='PARTIAL', vv="VV v2.71.4 (part: Measurements 1.7.0, W2-23)", pk=[], note=(
        "landed in v2.71.4: the box reads every step and a move is retypable once the hub hands it in (W2-23). "
        "Waiting: W3-01, W3-03 and W3-04. 'Adam has not tried it' in TrueVision")),
    'v2.119.0': dict(vv_app="VV v2.71.4 (part: Measurements 1.8.0's copy arrays, W2-23)", pk=[], note=(
        "v2.71.4 adds the box's copy-array readings (W2-23). Waiting: the hub's array (W3-03, W3-04). 'Adam has not "
        "tried it' in TrueVision")),
    'v2.120.0': dict(vv_app="VV v2.71.4 (part: the Project QR element's test 1.1.0, W2-38)", pk=['W3-14'], note=(
        "v2.71.4 lands the element's test (the Portal grey through the real painters), red until its config blocks "
        "arrive (W2-38; gate item 4.1). Waiting: W3-14. 'NOT tried by Adam' in TrueVision")),
    'v2.122.0': dict(cls='PARTIAL', vv=("VV v2.71.4 (part: engine 1.5.0's Refit, DrawingTitle 1.3.0, ViewportLink 1.4.0, "
                                        "config 1.4.0's underline and the title test 1.3.0, W2-37)"), pk=['W3-14'],
                     note=(
        "landed in v2.71.4: a drawing title's underline runs 5 mm past its words, and a linked title refits (W2-37). "
        "Waiting: the panel's metricsReady (W3-14) and ViewportLink 1.5.x (W3-13). 'NOT tried by Adam' in "
        "TrueVision")),
    'v2.123.0': dict(vv_app=("VV v2.71.4 (part: EditScope 1.2.0, ItemClipboard 1.5.0, SelectionBox 1.5.0 and LayerMenu "
                             "W2-21; ContextMenu 1.1.0 and the menu rules W2-20; object snap's reference-layer rule "
                             "W2-19, W2-42; DimensionTool 1.10.0 W2-26)"), pk=['W2-20', 'W2-19', 'W2-42', 'W2-26'],
                     note=(
        "v2.71.4 adds the selection units and the layer menu (W2-21; the menu inert), the context menu's flyouts "
        "(W2-20), object snap offering nothing on a reference layer (W2-19, W2-42) and the dimension tool's rule "
        "(W2-26). Waiting: the Layers panel's Ref switch (W3-13) and the hub (W3-03). 'NOT tried by Adam' in "
        "TrueVision")),
    'v2.124.0': dict(pk=['W2-21'], note=(
        "v2.71.4 takes the Eyedropper's v2.124.0 comment with the whole file (W2-21; OC-11)")),
    'v2.126.0': dict(vv_app="VV v2.71.4 (part: Panel__Patterns 1.1.0, W2-29)", pk=[], note=(
        "v2.71.4 adds the Patterns panel's line pt, line colour and Standard per layer, its tiles in the pack's own ink "
        "(W2-29; the per-layer rows out of sight while site plans are dormant). Waiting: Panel__Shapes 1.9.0's pattern "
        "rows (W3-12). 'NOT tried by Adam' in TrueVision")),
    'v2.127.0': dict(vv_app="VV v2.71.4 (part: ItemClipboard 1.6.0 and Na__Test__LayerMenu__ 1.1.0, W2-21)", pk=[],
                     note=(
        "v2.71.4 adds the clipboard's 1.6.0 and the layer menu's test (76 checks; W2-21). Waiting: the hub (W3-03). "
        "'NOT tried by Adam' in TrueVision")),
    'v2.128.0': dict(cls='PARTIAL', vv=("VV v2.71.4 (part: CabinetInfill 1.0.0 inside 1.2.0 and its test W2-38; engine "
                                        "1.6.0's adopt, Grips 1.5.0 and Styles 1.2.0 W2-37)"), pk=['W3-14'], note=(
        "landed in v2.71.4, inert: the Cabinet Infill element (W2-38) and the engine's adopt and corner grip (W2-37). "
        "Waiting: its config block, tile and the panel (W3-14); Na__Test__ScrapbookCabinetInfill__ exits 1 until then "
        "(gate item 4.1). 'NOT tried by Adam' in TrueVision")),
    'v2.129.0': dict(cls='PARTIAL', vv=("VV v2.71.4 (part: the object snap folder - leaves W2-42, switch-over W2-19; "
                                        "Grips 1.10.0 and its CSS W2-24; the drawing tools onto Search W2-26; "
                                        "ViewportSnapMove 1.5.0 W2-25; the grid ring's move W2-18)"),
                     pk=['W2-24', 'W2-26', 'W2-25', 'W2-18'], note=(
        "landed in v2.71.4 and LIVE: object snap in its own folder with TrueVision's modes and the marker coloured by "
        "what it found (DR-40 item 2; W2-42, W2-19), grips coloured by where their point stands (W2-24) and the drawing "
        "tools snapping through Search (W2-26). Waiting: the hub's Moves (W3-03) and the drafting aids (W3-05). 'NOT "
        "tried by Adam' in TrueVision")),
    'v2.130.0': dict(vv_app=("VV v2.71.4 (part: State, Setup, Geometry, Offset and the config W2-27; Preview, Targets, "
                             "Circle, Arc, Trim and Join W2-28; OffsetTool, the adapter, the panel and stylesheet W2-41; "
                             "Measurements 1.9.0 W2-23)"), pk=['W2-41', 'W2-23'], note=(
        "landed in v2.71.4, inert: every vector-tools unit of this release (W2-27, W2-28, W2-41) and the box's vector "
        "readings (W2-23). Waiting: the switch-on (W3-07). 'NOT tried by Adam' in TrueVision")),
    'v2.131.0': dict(cls='PARTIAL', vv="VV v2.71.4 (part: Drawing Axes, its config and stylesheet, inert, W2-18)",
                     pk=[], note=(
        "landed in v2.71.4, inert: the Drawing Axes overlay (W2-18). Waiting: F9 and the toolbar (W3-05). 'NOT tried "
        "by Adam' in TrueVision")),
    'v2.132.0': dict(cls='PORTED', vv="VV v2.71.4 (W2-14; dormant)", pk=[], note=(
        "PORTED in v2.71.4, dormant (DR-08 (B)): the store's faces-only fill layers (Store 1.2.0, W2-14). 'NOT YET "
        "TRIED BY ADAM' in TrueVision")),
    'v2.134.0': dict(cls='PARTIAL', vv=("VV v2.71.4 (part: CabinetInfill 1.1.0 inside 1.2.0 W2-38; engine 1.7.0's base "
                                        "point, Grips 1.6.0, TileDrag 1.2.0 and Styles 1.3.0 W2-37)"),
                     pk=['W2-37', 'W3-14'], note=(
        "landed in v2.71.4: the base point and corner grips (W2-37) and the Cabinet Infill held by its bottom-left "
        "corner (inert, W2-38). Waiting: the element's config and tile (W3-14). 'NOT tried by Adam' in TrueVision")),
    'v2.137.0': dict(cls='PORTED', vv_app="VV v2.71.4 (W2-42, W2-19, W2-24)", pk=['W2-19'], note=(
        "PORTED in v2.71.4: the snap marker placed by its transform (Marker 1.1.0, W2-42; its stylesheet, W2-19), and "
        "Grips 1.11.0's Place and PlaceBand with the 2 px band and Na__Test__PaintedOnThePoint__ (116 of 116; W2-24). "
        "'NOT tried by Adam' in TrueVision")),
    'v2.138.0': dict(vv_app=("VV v2.71.4 (part: PlanDoors 1.2.0 W2-11; Window 1.1.0 and Viewport2d 1.14.0 W2-16; the "
                             "selection units W2-21; Search 1.1.0, GridMoves 1.2.0 and Index 1.1.0 W2-19, W2-42; "
                             "ViewportSnapMove 1.6.0 W2-25; Targets 1.1.0 W2-28; LinkNoodle 1.2.2 W2-37; "
                             "ScrapbookSpecification 1.0.1 W2-35)"),
                     pk=['W2-11', 'W2-16', 'W2-21', 'W2-19', 'W2-42', 'W2-25', 'W2-28', 'W2-37', 'W2-35'], note=(
        "v2.71.4 lets every unit it carried read a turned viewport (W2-11, W2-16, W2-19, W2-21, W2-25, W2-28, W2-35, "
        "W2-37, W2-42). Waiting: the rotation itself (W3-06) and the hub (W3-03). 'NOT tried by Adam' in TrueVision")),
    'v2.139.0': dict(vv_app="VV v2.71.4 (part: DimensionTool 1.12.0's Round up W2-26; Eyedropper 1.9.0 W2-21)",
                     pk=['W2-21'], note=(
        "v2.71.4 carries Round up on create (W2-26) and in the eyedropper (W2-21). Waiting: the Dimensions panel "
        "(W3-12). 'NOT tried by Adam' in TrueVision")),
    'v2.140.0': dict(vv_app=("VV v2.71.4 (part: DoorPose 1.3.0 W2-06; PlanDoors 1.3.0 W2-11; Window 1.2.0, Frame 1.4.0, "
                             "Viewport2d 1.15.0 and Na__Test__HideSwings__ W2-16)"), pk=['W2-06'], note=(
        "landed in v2.71.4 and LIVE: a plan guessed or picked as the roof hides its door swings (W2-06, W2-11, W2-16; "
        "Na__Test__HideSwings__ 47 checks). Waiting: the Viewport panel's control (W3-15). 'NOT tried by Adam' in "
        "TrueVision")),
    'v2.141.0': dict(vv_app="VV v2.71.4 (part: EditScope 1.3.0 and SelectionSet 1.2.0, W2-21)", pk=[], note=(
        "v2.71.4 adds the selection units' group rules (W2-21). Waiting: the hub (W3-03). 'NOT tried by Adam' in "
        "TrueVision")),
    'v2.142.0': dict(vv_app=("VV v2.71.4 (part: EditScope 1.4.0 and ItemClipboard 1.7.0, W2-21; the vector config's "
                             "open-group note, W2-27)"), pk=['W2-27'], note=(
        "v2.71.4 adds adoption into an open group (W2-21) and the vector tools' note (W2-27). Waiting: the hub "
        "(W3-03). 'NOT tried by Adam' in TrueVision")),
    'v2.143.0': dict(vv_app=("VV v2.71.4 (part: the region tool W2-22; SpecMargin 1.4.0, Column, NoteRegions, "
                             "MarginGrip 1.3.0 and the region rules W2-32; Measurements 1.10.0 W2-23; RectangleTool "
                             "1.4.0's land hook W2-26; Sources 1.1.0 W2-42; the object snap test 1.1.0 W2-19)"),
                     pk=['W2-23', 'W2-26', 'W2-42', 'W2-19'], note=(
        "v2.71.4 lands the overspill regions' margin planning, column and placement (W2-32), the region tool (inert, "
        "W2-22) and the readings, hook and snap sources they need (W2-19, W2-23, W2-26, W2-42). Waiting: the regions' "
        "panel and grips (W3-11) and the hub (W3-03). 'NOT tried by Adam' in TrueVision")),
    'v2.144.0': dict(vv_app=("VV v2.71.4 (part: spell check W2-34; the row editor W2-35; the specification's State, "
                             "Transport, barrel and SpecLinks 1.2.0 W2-30; NoteTooltip and the hover tooltip 1.1.0 "
                             "W2-21, W2-20)"), pk=['W2-30', 'W2-21', 'W2-20'], note=(
        "v2.71.4 lands spell check with the Vale dictionary (DR-20; W2-34), the row editor (F2 rewords a note beside the "
        "drawing; W2-35), Locate and the broken-link resolver (W2-30) and the two tooltips (inert; W2-20, W2-21). "
        "Waiting: the tooltips' hover pass (W3-03). 'NOT tried by Adam' in TrueVision")),
    'v2.147.0': dict(vv_app=("VV v2.71.4 (part: SpecMargin 1.5.0, NoteRegions 1.0.1, the Leaderless panel and its rules, "
                             "W2-32)"), pk=['W3-11'], note=(
        "v2.71.4 plans leaderless groups first in the margin and lands the Leaderless Notes panel, inert (W2-32). "
        "Waiting: the Margin Notes panel 1.2.0 that registers it (W3-11). 'NOT tried by Adam' in TrueVision")),
    'v2.149.0': dict(cls='PARTIAL', vv=("VV v2.71.4 (part: MoveAnchor and its config, inert, W2-25; the stylesheet's "
                                        "Move Anchor region, W2-19)"), pk=['W2-19'], note=(
        "landed in v2.71.4, inert: the move anchor and its rules (W2-25, W2-19); nothing imports it. Waiting: the hub "
        "(W3-03) and the held gesture (W3-04, DR-40 item 10). No try recorded in TrueVision")),
    'v2.150.0': dict(vv_app=("VV v2.71.4 (part: the Boolean leaf, State 1.1.0 and config 1.1.0 W2-27; Targets 1.2.0, "
                             "Trim and Join 1.1.0 W2-28; BooleanTool, the adapter, OffsetTool and the panel 1.1.0 "
                             "W2-41; SelectionBox 1.7.0 W2-21; Sources 1.2.0 W2-42)"),
                     pk=['W2-28', 'W2-21', 'W2-42'], note=(
        "v2.71.4 lands the Boolean tools and every unit's holed-vector rules, inert (W2-21, W2-27, W2-28, W2-41, "
        "W2-42). Waiting: the switch-on (W3-07) and the hub (W3-03). Adam tried the Boolean tools in TrueVision ('It "
        "works INCREDIBLE!', recorded in v2.151.0); its own status line still reads not tried")),
    'v2.151.0': dict(cls='PARTIAL', vv=("VV v2.71.4 (part: the adapter 1.2.0 and BooleanTool 1.1.0 W2-41; the config's "
                                        "tooltips and words W2-27)"), pk=['W2-27'], note=(
        "landed in v2.71.4, inert: the Boolean keys' commands and words (W2-41, W2-27); the key rows came with W0-15. "
        "Waiting: the keyboard (W3-03) and the switch-on (W3-07). Shift+T is Trim, as TrueVision read Adam's note. "
        "'NOT tried by Adam' in TrueVision")),
    'v2.152.0': dict(vv_app=("VV v2.71.4 (part: DimensionTool's linePt and dash on create W2-26; the eyedropper's "
                             "traits W2-21)"), pk=['W2-26', 'W2-21'], note=(
        "v2.71.4 carries a new dimension's line weight and style (W2-26; logged here as 1.13.0, unlogged in "
        "TrueVision's file) and the eyedropper's traits (W2-21). Waiting: the Dimensions panel (W3-12). 'NOT tried by "
        "Adam' in TrueVision")),
    'v2.153.0': dict(cls='PARTIAL', vv="VV v2.71.4 (part: SelectionBox's description, W2-21)", pk=[], note=(
        "v2.71.4 carries only SelectionBox 1.7.0's box-select description (W2-21). Waiting: PointerPress 1.10.0's "
        "ViewportHoldsStill (W3-03). CONFIRMED by Adam in TrueVision ('It works fantastically')")),
    'v2.155.0': dict(vv_app=("VV v2.71.4 (part: the Patterns panel's moved import path W2-29; the Project QR element's "
                             "comment and test paths W2-38)"), pk=['W2-29', 'W2-38'], note=(
        "v2.71.4 adds Phase 0's moved paths in the Patterns panel (W2-29) and the Project QR element (W2-38). Adam's "
        "confirmation covers this release's PDF exporter fix (v2.71.2), not these moves; publishing waits for Wave 4")),
    'v2.157.0': dict(cls='PARTIAL', vv=("VV v2.71.4 (part: the Statement Writer's lockstep rules 1.0.0 and "
                                        "Na__Test__StatementLockstep__, W2-30)"), pk=[], note=(
        "landed in v2.71.4: the pure lockstep rules at TrueVision's path, LE/52__Feature__StatementWriter/"
        "01__Core__Data (W2-30), which the specification's lockstep imports. Waiting: the Statement Writer, switched "
        "off (W4-06, W4-12; DR-10). 'NOT tried by Adam' in TrueVision")),
    'v2.159.0': dict(cls='PORTED', vv="VV v2.71.4 (W2-43, W2-06)", pk=['W2-06'], note=(
        "PORTED in v2.71.4: FlushJoins 1.1.0 at modelling tolerance with Na__Test__FlushJoins__ (8 of 8; W2-43); its "
        "BuildToken bump is ValeVision's own token (DR-31 (4), W2-06). TrueVision's entry says ValeVision had "
        "FlushJoins 1.0.0 - it had none (section 7). No confirmation recorded")),
    'v2.160.0': dict(vv_app="VV v2.71.4 (part: Na__Test__SitePlanFaces__, W2-16)", pk=['W2-16'], note=(
        "v2.71.4 lands the site plan faces test (9 of 9, one skip with no data on this PC; W2-16). Waiting: the PDF "
        "exporter's site fills and the publisher (W3-16, W4-03). No confirmation line")),
    'v2.161.0': dict(pk=[], note=(
        "v2.71.4 takes Viewport3d 1.8.1 whole and the snapshot renderer's 1.13.0 numbering; their lighting lines are "
        "ValeVision's own (W2-15, W2-16)")),
    'v2.163.0': dict(cls='PARTIAL', vv=("VV v2.71.4 (part: the lockstep core over the facade W2-30; SpecLockstep, the "
                                        "bar 1.3.0, the stylesheet's region and the mode controller's three lines "
                                        "W2-31; the row editor 1.1.0 W2-35)"), pk=['W5-01'], note=(
        "landed in v2.71.4 and LIVE on localhost: the specification kept in step with ValeVision__DrawingNotes__.json, "
        "the question card and the bar's statuses (W2-30, W2-31, W2-35). Waiting: the toolbar's 'specification held' "
        "toast (W5-01). 'NOT tried by Adam' in TrueVision")),
    'v2.164.0': dict(vv_app=("VV v2.71.4 (part: Viewport2d 1.16.0 and Viewport2d__SitePlan 1.2.0 W2-16; SiteLegend and "
                             "SiteLegendLink W2-39; the config's Meta 1.8.0 number W2-37)"), pk=['W2-16', 'W2-37'],
                     note=(
        "v2.71.4 lands the site plan legend's type and data feed, dormant (W2-39), and the legend exports they read "
        "(W2-16). Waiting: the panel 1.8.0 and the SiteLegend block with ValeVision__SitePlan__ stems (W3-14); "
        "Na__Test__ScrapbookSiteLegend__ exits 1 until then (gate item 4.1). 'NOT tried by Adam' in TrueVision")),
}

EXPECT_FLIP_COUNTS = {('PARTIAL', 'PORTED'): 13, ('PENDING-SIGNOFF', 'PORTED'): 5, ('NOT-CONSIDERED', 'PORTED'): 2,
                      ('NOT-CONSIDERED', 'PARTIAL'): 16}
