"""PORT NOTE blocks (K2 H5) for the W2-16 whole-file ports. Each is the text between
'// PORT NOTE:' and the closing '//' line before the separator, exactly as written to the file."""

PIN = 'b2aa9151'
TVP = 'TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/'

NOTES = {}

NOTES['20__System__Viewports/Na__LayoutEditor__Viewport2d__.js'] = """// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0, port Phase 5, from Lantern Designer
//                   30__System__DrawingEditorMode and ValeVision3D's projected linework SVG overlay);
//                   TrueVision3D took it for its v2.21.0 re-alignment (10-Sep-2026); since ported back whole
//                   from TrueVision3D 1.16.0 (HEAD b2aa9151)
// - Source version: 1.16.0 (TrueVision3D v2.164.0, 29-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-16}}, the whole file. This app's copy before it
//                   was its own 1.8.1 (hunk replays of TrueVision3D up to the Model Source call shapes). TrueVision
//                   1.6.0 to 1.16.0 come across under DR-01 (c); none is recorded as tried by Adam in TrueVision.
// - Parity        : verbatim (the code is TrueVision 1.16.0's; the banner and this note are the only differences)
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
//   - Live but dormant here: design phases (the phase library is never initialised, DR-09 (a), so every
//     Model Source resolves to the live model and renderId is null) and site plan viewports (no sheet is a
//     site plan until LayoutEditor__Sheet__SitePlanDrawingsEnabled is on and a Vale data pipeline exists,
//     DR-08 (B)).
// - Back-port     : none.
//"""

NOTES['20__System__Viewports/Na__LayoutEditor__Viewport2d__Frame__.js'] = """// PORT NOTE:
// - Authored in   : ValeVision3D first (split out of Na__LayoutEditor__Viewport2d__.js, 15-Sep-2026,
//                   v2.47.0); TrueVision3D took the split for its v2.55.0; since ported back whole from
//                   TrueVision3D 1.4.0 (HEAD b2aa9151)
// - Source version: 1.4.0 (TrueVision3D v2.140.0, 22-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-16}}, the whole file. This app's copy before it
//                   was its own 1.1.1. TrueVision 1.2.0 (v2.94.0, the fog layer), 1.3.0 (v2.107.0, Draft) and
//                   1.4.0 (v2.140.0, Hide swings), and the unlogged Enhance strength and linework modifier
//                   weights, come across under DR-01 (c); none is recorded as tried by Adam in TrueVision.
// - Parity        : verbatim (the code is TrueVision 1.4.0's; the banner and this note are the only differences)
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
//   - RasterModifierToken is not empty while the linework modifier rows are configured, so every underlay key
//     gains that token once, whether or not the loaded model carries a 76-79 tag (W2-13 F2): the pictures
//     are the same, each is drawn once more on first sight. TrueVision's behaviour, kept.
// - Back-port     : none.
//"""

NOTES['20__System__Viewports/Na__LayoutEditor__Viewport2d__Linework__.js'] = """// PORT NOTE:
// - Authored in   : ValeVision3D first (split out of Na__LayoutEditor__Viewport2d__.js, 15-Sep-2026,
//                   v2.47.0); TrueVision3D took the split for its v2.55.0; since ported back whole from
//                   TrueVision3D 1.2.0 (HEAD b2aa9151)
// - Source version: 1.2.0 (TrueVision3D v2.95.0, 20-Sep-2026, git 62dade1c, unlogged in its devlog; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-16}}, the whole file. This app's copy before it
//                   was its own 1.1.1. TrueVision 1.2.0 (Model Layers owners, site plan Z-bands, BandPaths)
//                   comes across under DR-01 (c); it is not recorded as tried by Adam in TrueVision.
// - Parity        : verbatim (the code is TrueVision 1.2.0's; the banner, the console prefix and this note are
//                   the only differences)
// - Divergences   :
//   - Banner and console prefix read ValeVision3D.
//   - Its import of Model Source closes the cycle Linework -> ModelSource -> Viewport2d__SitePlan ->
//     Linework, as in TrueVision; nothing in it runs at load time, so the cycle is harmless.
// - Back-port     : none.
//"""

NOTES['20__System__Viewports/Na__LayoutEditor__Viewport2d__Window__.js'] = """// PORT NOTE:
// - Authored in   : ValeVision3D first (split out of Na__LayoutEditor__Viewport2d__.js, 15-Sep-2026,
//                   v2.47.0); TrueVision3D took the split for its v2.55.0; since ported back whole from
//                   TrueVision3D 1.2.0 (HEAD b2aa9151)
// - Source version: 1.2.0 (TrueVision3D v2.140.0, 22-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-16}}, the whole file. This app's copy before it
//                   was its own 1.0.1 (Describe's Model Source as a fixed live-model answer, now Model Source
//                   itself). TrueVision 1.1.0 (v2.138.0, turned viewports) and 1.2.0 (v2.140.0, door pose and
//                   Hide swings) come across under DR-01 (c); neither is recorded as tried by Adam in TrueVision.
// - Parity        : verbatim (the code is TrueVision 1.2.0's; the banner and this note are the only differences)
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
//"""

NOTES['20__System__Viewports/Na__LayoutEditor__Viewport3d__.js'] = """// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0, port Phase 5, from the Presentation
//                   Mode thumbnail renderer's capture and upload pattern); TrueVision3D took it for its
//                   v2.21.0 re-alignment (10-Sep-2026); since ported back whole from TrueVision3D 1.8.1
//                   (HEAD b2aa9151)
// - Source version: 1.8.1 (TrueVision3D v2.161.0, 28-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-16}}, the whole file. This app's copy before it
//                   was its own 1.6.2. TrueVision 1.5.0 (v2.32.0, Model Source) and 1.8.0 (v2.107.0, Draft) and
//                   the Enhance strength in the scene weights come across under DR-01 (c); none is recorded as
//                   tried by Adam in TrueVision. 1.8.1 is this app's own per-scene lighting (v2.71.0).
// - Parity        : verbatim (the code is TrueVision 1.8.1's; the banner and this note are the only differences)
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
//   - Design phases are dormant here (DR-09 (a)): Model Source always resolves to the live model, so the
//     fingerprint and every stored snapshot key are the live model's, as before.
// - Back-port     : none.
//"""

NOTES['20__System__Viewports/Na__LayoutEditor__ViewportIdentity__.js'] = """// PORT NOTE:
// - Ported from   : """ + TVP + """20__System__Viewports/Na__LayoutEditor__ViewportIdentity__.js
// - Source version: 1.1.0 (TrueVision3D v2.87.0, 20-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-16}}, the whole file. This app's copy before it
//                   was TrueVision's 1.0.0 less its phase and site plan branches (ValeVision3D v2.67.0). 1.1.0
//                   (the storey level) comes across under DR-01 (c); it is not recorded as tried by Adam in
//                   TrueVision.
// - Parity        : verbatim (the code is TrueVision 1.1.0's; the banner, the console prefix and this note are
//                   the only differences)
// - Divergences   :
//   - Banner and console prefix read ValeVision3D.
//   - PhaseOf reads Model Source and the phase library, which register no groups here (DR-09 (a)), so it
//     answers unknown for every viewport and a title writes Existing or Proposed only when its own settings
//     say so; the site plan branch is dormant (DR-08 (B)).
// - Back-port     : none.
//"""

NOTES['25__System__RenderStyles/Na__LayoutEditor__EdgeStyles__.js'] = """// PORT NOTE:
// - Ported from   : """ + TVP + """25__System__RenderStyles/Na__LayoutEditor__EdgeStyles__.js
// - Source version: 1.1.0 (TrueVision3D v2.49.0, 14-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-16}}, the whole file. This app's copy before it
//                   was TrueVision's 1.0.0 (ValeVision3D v2.30.0). 1.1.0 and the unlogged later work (the
//                   accent colours, Weight__Max 10.00, the per-viewport Line scale on any dashed category and
//                   the site plan FillHex, git 55014c6a) come across under DR-01 (c); none is recorded as tried
//                   by Adam in TrueVision.
// - Parity        : adapted (app token only)
// - Divergences   :
//   - Banner and console prefix read ValeVision3D.
//   - SITEPLAN_PREFIX is 'ValeVision__SitePlan__' (K2 K3): the site plan store renames the exporter's
//     TrueVision__SitePlan__ stems to this app's token as it reads them (W2-14). Dormant with site plans
//     (DR-08 (B)).
// - Back-port     : none.
//"""

NOTES['25__System__RenderStyles/Na__LayoutEditor__ModelLayers__.js'] = """// PORT NOTE:
// - Ported from   : """ + TVP + """25__System__RenderStyles/Na__LayoutEditor__ModelLayers__.js
// - Source version: 1.4.0 (TrueVision3D v2.95.0, 20-Sep-2026, git 62dade1c, unlogged in its devlog; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-16}}, the whole file. This app's copy before it
//                   was TrueVision's 1.1.0 (ValeVision3D v2.30.0). 1.2.0 (v2.32.0, phase categories), 1.3.0
//                   (v2.49.0, site plan layers), 1.4.0 (Group__AlwaysShow) and the unlogged storey equivalent
//                   key come across under DR-01 (c); none is recorded as tried by Adam in TrueVision.
// - Parity        : adapted (app token only)
// - Divergences   :
//   - Banner and console prefix read ValeVision3D.
//   - Category keys carry this app's token (K2 K3): the fallback stripPrefix is 'ValeVision__', the storey
//     fallback prefix is 'ValeVision__MainBuildingModel__' (the config's Fallback__StoreyElementPrefix says
//     the same), and three comments name ValeVision__ categories. The config beside it keeps this app's own
//     rows (ValeVision__ keys, the coarse Existing / Proposed rows and the legacy group).
// - Back-port     : none.
//"""

NOTES['40__Ui__Panels/Na__LayoutEditor__Panel__ModelLayers__.js'] = """// PORT NOTE:
// - Ported from   : """ + TVP + """40__Ui__Panels/Na__LayoutEditor__Panel__ModelLayers__.js
// - Source version: 1.3.0 (TrueVision3D v2.49.0, 14-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-16}}, the whole file. This app's copy before it
//                   was TrueVision's 1.1.0 (ValeVision3D v2.30.0). 1.2.0 (v2.32.0, phase categories), 1.3.0
//                   (v2.49.0, site plan rows) and the unlogged Fill and Line scale columns (git 55014c6a) come
//                   across under DR-01 (c); none is recorded as tried by Adam in TrueVision.
// - Parity        : verbatim (the code is TrueVision 1.3.0's; the banner and this note are the only differences)
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
//"""

NOTES['20__System__Viewports/Na__LayoutEditor__ModelSource__.js'] = """// PORT NOTE:
// - Ported from   : """ + TVP + """20__System__Viewports/Na__LayoutEditor__ModelSource__.js
// - Source version: 1.1.0 (TrueVision3D v2.49.0, 14-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-16}}. 1.0.0 (v2.32.0) and 1.1.0 (v2.49.0) come
//                   across under DR-01 (c); neither is recorded as tried by Adam in TrueVision.
// - Parity        : verbatim (dormant). The design phase library is never initialised here (DR-09 (a)): it
//                   registers no groups, so HasChoices is false, Resolve answers the live model (renderId
//                   null) for every viewport, WaitFor(null) resolves true at once, MenuItems is empty and the
//                   Viewport panel's Model Source row stays hidden - exactly what a one-model project shows in
//                   TrueVision. Initialize only sets the library's cache limit.
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
//"""

NOTES['20__System__Viewports/Na__LayoutEditor__Viewport2d__SitePlan__.js'] = """// PORT NOTE:
// - Ported from   : """ + TVP + """20__System__Viewports/Na__LayoutEditor__Viewport2d__SitePlan__.js
// - Source version: 1.2.0 (TrueVision3D v2.164.0, 29-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-16}}. 1.0.0 (v2.55.0), 1.1.0 (v2.101.0) and 1.2.0
//                   (v2.164.0) come across under DR-01 (c); none is recorded as tried by Adam in TrueVision.
// - Parity        : verbatim (dormant, DR-08 (B)): no sheet is a site plan until
//                   LayoutEditor__Sheet__SitePlanDrawingsEnabled is switched on and a Vale data pipeline
//                   publishes a site plan store, so nothing here paints.
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
//"""
