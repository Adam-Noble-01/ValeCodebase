# R5 hand-written analysis rows for the E.2 parity matrix (key gaps and actions per system).
# Evidence ids are slice findings (findings_verified.json); packages are K3 canonical ids; paths are K2 targets.

TOP = [
    # (row label, open_by_folder key, key gaps, action + packages)
    ("40__System__DrawingViewCore (VV 42 -> 40, TF-T22)", "40__System__DrawingViewCore",
     "ProjectData 1.2.0 -> 1.6.0 (save steps, IsLoaded, payload guard; v2.39.0, v2.86.0, v2.145.0, v2.146.0; S12-F10, S02a-F05); "
     "draft system DraftGuard/DraftMaths/DrawingUsage/DevRowShell (v2.86.0; S02a-F07..F09: VV Dev rows still write drawings live); "
     "Transitions 1.1.0 opt-in walk exit (v2.112.0; S03a-V03); Drawing2d keys (v2.27.0/v2.30.2; S09-F33). "
     "VV ahead: StyleRows is wired in VV and dead in TV (S11-V03).",
     "Renumber in W0-02 (ComposerPreset -> RenderPreset path, FR-09). Then W1-04, W1-05, W1-06, W2-08; ThumbnailBake kept and offered (WT-06). "
     "Never port TV ProfileLines (DIV-1)."),
    ("41__System__CrossSectionView (kept, TF-T21) vs TV 41__System__SectionCutEngine", "41__System__SectionCutEngine",
     "Different engines, same role (DIV-2). TV's 41 never ports; TV code reaches sections through the SectionAdapter, which in VV lacks "
     "Serialize/Apply, outline width, SetModelRoot and RenderDepthInto (W2-02). Scene-activation event names differ (S09-F37).",
     "keep_vv_divergence (DR-26, DR-41). W2-02 completes VV's adapter; W2-05 renames VV's five Cross Section Tool gate ids "
     "(48 row); TD06 schema fix is TV-side (WT-02)."),
    ("42__System__FloorPlanViews (VV 43 -> 42, TF-T23)", "42__System__FloorPlanViews",
     "Storey level StoreyLevel + StoreyRow + data 1.1.0 (v2.87.0; S02a-F23); Dev editor and row builders 2.0.0 rebuild with drafts and planes "
     "(v2.82.0, v2.86.0; S02a-F25, S02a-F26); TV editors pass the presentation config where VV data modules expect a drawings block "
     "(S02a-F04, critical).",
     "W0-02 renumber; W1-08 (storey, data-module convention); W2-04 (Dev menu 2.0.0) keeping VV seams: mode controller 1.2.2, "
     "Styles/Exclusions rows (D33), Ground Floor quick action (D11), thumbnail bake (DR-32)."),
    ("43__System__PlanAnnotations (VV 44 -> 43, TF-T24)", "43__System__PlanAnnotations",
     "7 of 8 shared files differ in headers only; the code gap is the colour-palette attach on the annotation toolbar swatch (v2.126.0).",
     "W0-02 renumber; W1-37 (palette attach)."),
    ("44__System__PlanDimensions (VV 45 -> 44, TF-T25)", "44__System__PlanDimensions",
     "VV is ahead: its Data/Editor import the split ConfigState/EditorPreview; TV's split landed as files only and is unwired "
     "(S02b-F08, S11-V03). 13 of 15 shared files differ in headers only.",
     "W0-02 renumber; keep_vv_divergence (never copy TV Data/Editor); W0-03 banner fix; TV rewire is WT-01 (DR-42 item 7)."),
    ("45__System__ElevationViews (VV 46 -> 45, TF-T26)", "45__System__ElevationViews",
     "Auto-name and identity AutoName/AutoNameText (v2.86.0; S02a-F30); Dev editor 2.1.0 and row builders with planes, drafts, auto names, "
     "fog block (S02a-F31, S02a-F32); data module 1.1.0 with fog accessors; fog-source hook in the mode controller (v2.94.0).",
     "W0-02 renumber; W1-10, W2-05 (with the 48 placeholder), W2-03 (fog hook); keep VV mode controller 1.1.1, D28 filing seam (DR-26), "
     "Styles/Exclusions rows (DR-32)."),
    ("46__System__NorthDirection (VV 47 -> 46, TF-T27)", "46__System__NorthDirection",
     "Show Compass needs TV CompassGizmo/DevMenu 1.1.0 whole, which needs the render-loop InteractiveOverlays registry (v2.84.0 half; "
     "S02a-F39).",
     "W0-02 renumber; W1-01 (registry), W1-11 (North 1.1.0 whole)."),
    ("47__System__DrawingPlanes (TV-only, TF-T39)", "47__System__DrawingPlanes",
     "Planes you can see, grab and snap for every plan and elevation, 9 files, 3,967 lines (v2.82.0, v2.84.0; S02a-F42, S01-F06). "
     "Supersedes VV's live FacePick/GizmoGrip (dead in TV since v2.82.0; S11-V09).",
     "Add: W2-40 (leaves inert), W2-01 (switch-on with start-up and stylesheet wiring). Gate DR-01."),
    ("48__System__CrossSectionViews (TV-only, TF-T40)", "48__System__CrossSectionViews",
     "Placeholder Dev panel 0.1.0 (v2.86.0), one 198-line file, whose three DOM ids `naCrossSectionDev{Item,Toggle,Panel}` "
     "(TV 48 :79-81, TV Index.html:600-605) are already VV's Cross Section Tool gate ids (S02a-F46, DR-26).",
     "Add with W2-05 after VV renames the five VV-only ids of that gate, `naCrossSectionDev{Item,Toggle,Panel,EnableCheck,Save}` "
     "(VV index.html:855-866, 41 DevControls :79-83; no CSS uses them), to `naCrossSectionToolDev*`, so TV's file ports byte "
     "for byte (DR-26, K2 S4)."),
    ("49__System__ElevationDepthFog (TV-only, TF-T41)", "49__System__ElevationDepthFog",
     "Elevation depth fog (v2.94.0) and its colour fix (v2.103.0), 8 files, 2,203 lines (S01-F08, S02b-F38); sheets need "
     "Viewport2d__DepthFog and a render-frame callback VV's tiled renderer lacks (S04a-F30, DIV-1).",
     "Add: W1-09 (pure leaves inert), W2-03 (core and 3D wiring), W2-12 (sheets). Gate DR-15."),
    ("50__System__ProjectedLinework (kept, TF-T28)", "50__System__ProjectedLinework",
     "3D-matching rules FlushJoins/SeamsOcclude/LineworkFirst (v2.37.0, v2.159.0), door pose (v2.42.0, v2.48.1), storeys (v2.105.0), "
     "hide swings (v2.140.0), unlogged LineworkModifier styling (v2.95.0/v2.98.0 commits; S04a-F47); ClipKernel 1.2.0, CpuBackend 1.4.0, "
     "Projector 1.5.0, Pipeline 1.5.0, ConfigAccess 1.2.0 (S02b-F11..F21); ModelStage 1.1.0 hidden by a no_action row (S11-V01).",
     "W2-43 (FlushJoins, Storeys inert), W2-06 (folder to TV HEAD), W1-02 (door module contract), W2-13 (modifiers), W0-14 (Persistence). "
     "Keep VV-only folder-50 integrations (S02b-V01). Gates DR-16, DR-31."),
    ("52__System__Layout__PublishedDocuments (TV-only, TF-T42)", "52__System__Layout__PublishedDocuments",
     "The published reader, 11 files, 3,998 lines (v2.155.0, v2.156.0); TV's web viewer shows published files only, VV's renders on the "
     "reader's device (S08-F01 critical, S08-F04, S01-V06).",
     "Add: W4-17 (leaves inert, and the folder README this section assigns to it, E.3), W4-02 (reader closure), W4-09 "
     "(viewer wiring). Gates DR-22, DR-25."),
    ("53__Data__Layout__PublishedSchema (TV-only, TF-T43)", "53__Data__Layout__PublishedSchema",
     "Shared publish/read contract, 4 files (v2.155.0, v2.166.0 share links; S08-F03).",
     "Add with a VV fixture: W4-01. Gates DR-22, DR-29."),
    ("54__Feature__ColourPalette (TV-only, TF-T44)", "54__Feature__ColourPalette",
     "Palette over every colour field (v2.126.0) and mixer placement (v2.133.0), 6 files.",
     "Add: W1-37 (+ PanelHost attach W1-38). Gate DR-20 (Vale palette name)."),
    ("55__Feature__SpellCheck (TV-only, TF-T45)", "55__Feature__SpellCheck",
     "Practice-dictionary spell check (v2.144.0), 7 files; needs a user-config route (TV ProjectVision UserConfig API).",
     "Add: W2-34 with the Vale dictionary route from W0-18 (50__ValeVision__UserConfig). Gate DR-20."),
    ("27__System__ContextMenuSystem (TV-only, TF-T38)", "27__System__ContextMenuSystem",
     "TV's 3D right-click menu (9 files); the Statement Writer imports only its renderer (v2.97.0; S09-F26).",
     "Renderer + stylesheet only with W4-11 (DR-10); the rest skipped for drawing parity (DR-44)."),
    ("80__CloudflareIntegration (TV-only, TF-T49)", "80__CloudflareIntegration",
     "TV's transport client (Na__CfApi, 33 exports) over na-truevision-api; imported by TV ProjectData, SheetModel__Sheets, "
     "Panel__ScrapbookParametric, SpecData__Transport, presentation SceneData (S11 Appendix D) and statement publishing (S07b-F18).",
     "Same path and names, VV bodies over whitecardopedia-editor-api and WCP Flask (FR-16, W0-12; DR-27). Never copy TV's body (gate G6)."),
    ("40__System__2dElevationsView (VV-only legacy -> 91, TF-T20)", None,
     "VV's legacy elevation tool; its 2dProfileLines effect feeds VV's composer (DIV-1).",
     "Move to 91 and 2dProfileLines to 05 (FR-01, FR-08; W0-02); retire later (FR-25, W6-03; DR-03)."),
]

LE = {
    "01__Core__Loader": ("VV-only lazy loader (3 files). It must expose every TV editor entry point (S09-F11, S03a-F24), list every ported "
                         "LE stylesheet in TV's cascade order (S03a-F23, S10-F16) and host the boot veil (S10-F04).",
                         "keep (DR-24 a; offer to TV under DR-36): W1-31 facade, W1-33 boot veil, W1-34 strip; stylesheet list gated by W0-04's test."),
    "03__Core__Config": ("AppConfig 356 key-level differences (S03a-F01); ConfigState barrel lacks nine re-exports (S03a-F06); KeyMap 1.0.0 vs "
                         "1.11.0 with a live fallback bug (S03a-F07); register, statement and picture blocks absent (S07a-F13, S07b-F31).",
                         "W0-15 (XL, atomic) first; W0-03 renames KeyMappings -> Na__Hotkeys__DrawingTabs (FR-12); feature rows by owners."),
    "05__Core__ModeController": ("MC 1.18.0 vs 1.32.0, the integration hub (S03a-F13 critical); 27 TV-only imports block a whole-file "
                                 "take (S11 Appendix D); VV-only API and listeners must survive (S09-F12).",
                                 "W1-32 core hunks; each feature package adds its own hunk; W5-03 convergence check."),
    "07__Core__SheetData": ("SheetRecords 1.15.0 vs 1.39.0 (S03b-F01 critical); RestackLegacyLayers before paint order (S03b-F03); "
                            "Document ID (v2.71.0; S07a-F14 critical); SheetModel facade 1.18.0 vs 1.35.1, Sheets 1.1.0 vs 1.4.0, Layers "
                            "1.0.0 vs 1.4.0 with a VV orphan bug (S03b-F06, F08, F10); NormaliseMarginNotes drops region keys "
                            "(S06b-F23 critical); AutoSave 1.5.0 (S03b-F16).",
                            "W1-13 (leaves), W1-19 (SheetRecords 1.39.0), W1-20 (units + AreaGroups), W1-21 (facade, History), "
                            "W1-07 (AutoSave), W1-22 (identity); DrawingCode leaf kept (WT-10 offer)."),
    "10__Core__SheetSurface": ("SheetChrome code 1.8.0 vs 1.14.0 (S03b-F23); SheetSurface 1.6.0 vs 1.13.0 (S03b-F24); zoom-settle event "
                               "(v2.111.0; S04b-F06); hatch deck and holed polylines (S05b-F28); TV-only TitleBlock__QrCell (S07a-F33).",
                               "W1-26 (chrome), W1-28 (surface, paint order), W1-22 (Cells 1.2.0, Modern 1.5.0, QR cell)."),
    "15__Core__Markup": ("MarkupBridge 1.10.0 vs 1.20.0 (S03b-F26); ShapeGeometry 1.5.0 vs 1.9.0 as a hunk seam (S05b-F21, S04b-V03); "
                         "TV-only PaintOrder, ShapeRings, DimensionRounding (S03b-F25, S05b-F11).",
                         "W1-13 (leaves), W1-26 (ShapeGeometry 1.9.0, DimensionGeometry 1.6.0), W1-28 (MarkupBridge 1.20.0)."),
    "20__System__Viewports": ("Viewport2d 1.8.0 vs 1.16.0 (S04a-F09); render entry points take different arguments (S04a-F06); TV-only "
                              "PlanDoors, ModelSource, Viewport2d__SitePlan, Viewport2d__DepthFog, ViewportRotation, VectorQuality.",
                              "W1-14, W1-23, W2-10, W2-11, W2-12, W2-16 (one import cycle with Model Source and the painter), W3-06."),
    "21__System__SitePlanData": ("TV-only site-plan store and GLB parser (v2.48.0, v2.49.0, v2.132.0).",
                                 "Add dormant: W2-14 (DR-08 B); live only with W5-06 (DR-08 A)."),
    "25__System__RenderStyles": ("SnapshotRenderer 1.7.0 vs 1.13.0 (S04a-F05, DIV-1 hunks); Enhance/RenderComposites percent weight "
                                 "(v2.93.0); ModelLayers, EdgeStyles (S04a-F21, F23); TV-only SitePlanComposites.",
                                 "W2-15 (one owner, hunk replay), W2-09, W2-13, W2-16; SitePlanComposites leaf in W1-13."),
    "26__System__DraftMode": ("Draft mode on K (v2.107.0) and zoom-settle redraw (v2.111.0).", "Add: W1-14 (state), W2-18, W3-05 (on). DR-01."),
    "27__System__DrawingGrid": ("Drawing Grid F6/F7 (v2.114.0).", "Add: W1-14, W2-18, W3-05 (on); defaults per DR-40 item 5."),
    "28__System__ObjectSnap": ("Object snap folder (v2.129.0, v2.137.0), viewport snap move (v2.28.0), move anchor (v2.149.0); Sources "
                               "statically imports VectorTools Curves (S05b-F08 critical load-order trap).",
                               "Add: W2-42 (leaves), W2-19 (switch-over; Snapping shim FR-14), W2-25 (anchor, snap move inert), "
                               "W3-04 (gestures on, DR-40), W3-08 (retire Snapping, FR-15)."),
    "30__System__SheetTools": ("Hubs 12-15 TV versions behind: PointerDrag, PointerPress, HitResolution, Keyboard, orchestrator "
                               "(S05a-F12..F16); TV-only CopyDrag, HoverTooltip, NoteTooltip, LayerMenu; unlogged ItemClipboard 1.3.0 "
                               "(S05a-F22); 12 TV-only systems must exist first (S05a-F30 critical).",
                               "W2-20, W2-21, W2-23, W2-24, W3-01, W3-03 (XL, atomic hub), W3-04; W3-08 retires VV Snapping."),
    "31__System__DocumentKeys": ("Document-tab keyboard (v2.110.0, v2.115.0).", "Add: W1-30 (DR-33 a, inert until the register and statements)."),
    "32__System__OrthoMode": ("Ortho on F8 (v2.113.0).", "Add: W1-14, W2-18, W3-05."),
    "33__System__DrawingAxes": ("Drawing axes F9 (v2.131.0).", "Add: W2-18, W3-05."),
    "35__System__DrawingTools": ("DimensionTool 1.5.0 vs 1.12.0 plus an unlogged v2.152.0 hunk (S05b-F13); tools must move onto object "
                                 "snap, grid and ortho (S04b-F29) without the TONE import trap (S04b-F63).",
                                 "W1-18 (Gradient/LineStyle 1.1.0), W2-26, W3-07 (ShapeTool 1.10.0)."),
    "36__System__HatchPatternTools": ("Hatch on any vector (v2.90.0), patterns panel, hatch line weight/colour (v2.126.0), site packs "
                                      "(v2.101.0).", "Add: W1-17 (leaf + app-root library), W2-29 (panel). DR-19."),
    "37__System__VectorTools": ("Trim/extend/join/split/offset/fillet/chamfer, circles, arcs (v2.130.0), Booleans and holes (v2.150.0, "
                                "v2.151.0), 18 files.", "Add: W1-14 (Curves), W2-27, W2-28, W2-41 (inert), W3-07 (on). DR-18."),
    "40__Ui__Panels": ("PanelHost 1.4.0 vs 1.6.0 (S06a-F04); toolbar keeps buttons TV removed and lacks 11 tools (S06a-F06, F07); Panel__Text "
                       "multi-select bug (S06a-F08); Viewport panel 1.4.1 vs 1.10.0 (S06a-F18); Dimensions/Vectors panels (S05b-F23, F24).",
                       "W1-38, W1-35, W2-36, W3-12, W3-13, W3-15, W4-10 (Panel__Sheet), W5-01 (toolbar whole)."),
    "50__Feature__Specification": ("SpecData barrel/State/Document behind (S06b-F07..F10); SpecMargin 1.3.0 vs 1.5.0 (S06b-F20); lockstep "
                                   "(S06b-F02); Reload Local loses an unsynced edit (S06b-F03); TV-only regions, leaderless notes, "
                                   "lockstep units.",
                                   "W2-22, W2-30, W2-31, W2-32, W3-11; SpecPdf fonts with W1-25."),
    "51__Feature__DrawingRegister": ("Register tab, numbering, transactions, PDF (v2.69.0-v2.79.1, v2.112.0, v2.167.0); Editor statically "
                                     "imports 31, 65 and 66 (S07a-F22).", "Add: W1-13 (Numbering), W4-18 (core inert), W4-10 (on). DR-11."),
    "52__Feature__StatementWriter": ("Design Statements, 33 files, 16,898 lines, 12 releases v2.95.0-v2.172.0; NA planning content; live-file "
                                     "tests (S07b-F45).", "Add last, switched off: W2-30 (Lockstep leaf), W4-04, W4-05, W4-06, W4-12 (XL), "
                                     "W4-13, W4-14, W4-15, W4-16. DR-10, DR-43."),
    "53__Feature__ProjectQrCode": ("Project QR, title-block QR cell and Portal block (v2.81.0 ... v2.162.0); NA URLs.",
                                   "Add switched off with a VV ProjectLink: W1-15; Vale resolver W5-05 (DR-12, DR-43)."),
    "54__Feature__SheetImages": ("Pictures on sheets filed by drawing number (v2.116.0, v2.121.0), 17 files; hub cycle (S05a-V01).",
                                 "Add: W1-16, W3-18 (inert), W3-02, W3-09 (on); Flask route W0-18. DR-13, DR-29."),
    "55__Feature__Scrapbook": ("Scrapbook tab hover text (TV 1.2.1, v2.91.0; S06a-F24).", "W1-32 (Panel__Scrapbook), W2-37 (TileDrag)."),
    "56__Feature__ScrapbookCustom": ("Measured-room portability hunk (v2.104.0; S06a-F27).", "W2-36."),
    "57__Feature__ScrapbookParametric": ("Engine TV 1.2.0 -> 1.7.0 (slide, choices, Refit, adopt, base; S06a-F32); grips (S06a-F36); "
                                         "ViewportLink Refit and FactsPatch (S06a-F35); panel's static NA-only imports (S06a-F38 critical).",
                                         "W2-37, W2-38, W2-39 (types inert), W3-13, W3-14 (panel 1.8.0), W3-17 (Area Schedule)."),
    "58__Feature__ScrapbookSpecification": ("Specification Scrapbook, the left Specification tab (v2.91.0, v2.144.0; S06a-F45).", "Add: W2-35."),
    "59__Feature__FloorAreas": ("Floor areas, 10 files (v2.104.0, v2.125.0, v2.148.0); touches about 25 shared modules (S06b-F38).",
                                "Add: W1-27 (core inert), W3-10 (on). DR-14."),
    "60__Feature__PdfExport": ("PdfExporter 1.2.0 vs 1.12.0 (S08-F12); PdfFonts absent (S08-F13).", "W1-24 (interim), W1-25 (PdfFonts), W3-16 (full re-sync). DR-21."),
    "65__Feature__DocumentPublishing": ("Publishing (v2.155.0, confirmed by Adam in TV; v2.160.0; statement publishing v2.170.0-v2.172.0 lives in LE/52).", "Add: W4-03, W4-07. DR-22."),
    "66__Feature__DocumentSharing": ("Share links (v2.166.0).", "Add: W4-07, W4-08. DR-23."),
    "70__DevTools__DevMenu": ("Live-phase bake filter and the Layout Mode row.", "W2-17 (DR-25 keeps the VV row)."),
    "80__Feature__WebViewer": ("WebViewer 1.1.0 vs 1.2.0 plus the unlogged published-reader integration (S08-F14).", "W4-09 (DR-22, DR-25)."),
}
