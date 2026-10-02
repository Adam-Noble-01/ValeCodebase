# =============================================================================
# W1-23 build script (scratch; not shipped)
# =============================================================================
# Render signature alignment and the Describe stub (no behaviour change).
#
#   python -B build_w1_23.py --build        candidates into scratch/W1-23/candidate/ (live untouched)
#   python -B build_w1_23.py --apply        write the candidates over the live files (each live file must
#                                           still hash as recorded in sha256__before.txt)
#   python -B build_w1_23.py --check-live   live == candidate for all seven
#   python -B build_w1_23.py --restore      put the pre-images back (only where live == candidate)
#
# Every replacement must match exactly once in the file's LF-normalised text. The seven files are
# CRLF throughout; they are written back CRLF throughout. New text is ASCII only.
# =============================================================================

import hashlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))          # the ValeVision3D app root
LE = os.path.join(VV, '02__Src__AppModules', '51__System__LayoutEditor')
BEFORE = os.path.join(HERE, 'before')
CANDIDATE = os.path.join(HERE, 'candidate')

FILES = {
    'Na__LayoutEditor__SnapshotRenderer__.js': os.path.join(LE, '25__System__RenderStyles', 'Na__LayoutEditor__SnapshotRenderer__.js'),
    'Na__LayoutEditor__Viewport2d__Window__.js': os.path.join(LE, '20__System__Viewports', 'Na__LayoutEditor__Viewport2d__Window__.js'),
    'Na__LayoutEditor__Viewport2d__Frame__.js': os.path.join(LE, '20__System__Viewports', 'Na__LayoutEditor__Viewport2d__Frame__.js'),
    'Na__LayoutEditor__Viewport2d__Linework__.js': os.path.join(LE, '20__System__Viewports', 'Na__LayoutEditor__Viewport2d__Linework__.js'),
    'Na__LayoutEditor__Viewport2d__.js': os.path.join(LE, '20__System__Viewports', 'Na__LayoutEditor__Viewport2d__.js'),
    'Na__LayoutEditor__Viewport3d__.js': os.path.join(LE, '20__System__Viewports', 'Na__LayoutEditor__Viewport3d__.js'),
    'Na__LayoutEditor__PdfExporter__.js': os.path.join(LE, '60__Feature__PdfExport', 'Na__LayoutEditor__PdfExporter__.js'),
}


# -----------------------------------------------------------------------------
# The split units share one old PORT NOTE text
# -----------------------------------------------------------------------------
SPLIT_NOTE_OLD = """// PORT NOTE:
// - Ported from   : split out of Na__LayoutEditor__Viewport2d__.js (15-Sep-2026, ValeVision3D v2.47.0)
// - Parity        : verbatim (moved code)
// - Divergences   : n/a
// - Back-port     : the same split applies to TrueVision's copy.
"""


EDITS = {}

# =============================================================================
# 1. SNAPSHOT RENDERER  1.7.0 -> 1.7.1
# =============================================================================
EDITS['Na__LayoutEditor__SnapshotRenderer__.js'] = [
    # PORT NOTE -> K2 H5, the ValeVision-first twin form
    ("""// PORT NOTE:
// - Ported from   : ValeVision3D 42__System__FloorPlanViews/Na__FloorPlan__ModeController__.js and 46 (enter and exit sequences)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5)
// - Parity        : new
// - Divergences   : n/a
// - Back-port     : none.
""",
     """// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, ValeVision3D v2.21.0, port Phase 5), from the
//                   enter and exit sequences of the floor plan and elevation mode controllers
//                   (42__System__FloorPlanViews/Na__FloorPlan__ModeController__.js and
//                   45__System__ElevationViews/Na__Elevation__ModeController__.js)
// - Twin          : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js,
//                   ported from this file (TrueVision3D v2.21.0). Its later hunks are replayed into this
//                   file's own sequence, never the whole file; the log below names each one
// - Source version: 1.13.0 (TrueVision3D v2.161.0, 28-Sep-2026; read at HEAD b2aa9151)
// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-23}} (TrueVision3D's render signatures, 1.7.1)
// - Parity        : diverged (DIV-1: ValeVision3D's composer route)
// - Divergences   :
//   - DIV-1. The 2D picture is drawn through the composer preset with the main camera (the preset
//     swaps the framed ortho in), and each width goes in through the system that owns it: the composer
//     preset (profile), the Cross Sections tool (section outline), Na__LineworkSettings (the model's
//     edges). TrueVision3D draws through RenderPreset__RenderFrame and sets its widths itself.
//   - A 3D render's sections are saved and put back through the Cross Sections tool
//     (41__System__CrossSectionView), not TrueVision3D's section engine serializer.
//   - The context categories carry the ValeVision__ token, entourage silhouettes included.
//   - TrueVision3D's arguments in TrueVision3D's positions (1.7.1). The design phase (modelSourceId) is
//     taken and not used - ValeVision3D has no design phases (DR-09) - and a depth fog source answers
//     null.
//   - Not here yet: TrueVision3D's design phases (1.6.0), door pose (1.7.0, 1.12.1), depth fog image
//     (1.12.0), Enhance strength and nested linework modifier rules.
//   - Console prefix [ValeVision3D LayoutEditor].
// - Back-port     : none.
"""),
    # DEVELOPMENT LOG entry
    ("""// DEVELOPMENT LOG:
// 28-Sep-2026 - Version 1.7.0 (per-scene lighting, ValeVision v2.71.0)
""",
     """// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.7.1 (TrueVision3D's render signatures, {{VVREL:W1-23}})
// - Render2d, Render3d, GetModelRoot, GetModelFingerprint and
//   GetPipelineFingerprint take TrueVision3D's arguments in TrueVision3D's
//   positions: Render2d (..., weights, modelSourceId, stillWanted, depthFog),
//   Render3d (..., weights, modelSourceId, viewWindow, stillWanted) and an
//   optional modelSourceId on the other three. stillWanted sat ninth in
//   Render2d and viewWindow eighth in Render3d, so a TrueVision3D caller
//   would have handed a 3D render its stillWanted as the view window and
//   drawn a zoomed viewport's whole picture, with no error.
// - modelSourceId is the design phase a viewport draws. ValeVision3D has no
//   design phases, every viewport's Model Source is the live model and its
//   renderId null, so it is taken and not used: every picture and every
//   fingerprint is what it was. A depth fog source answers null, no fog
//   image, rather than the picture standing in for its fog, until
//   ValeVision3D draws depth fog.
// - Every caller moved with it: the Viewport 2D units, Viewport3d and the
//   PDF exporter. No behaviour change.
//
// 28-Sep-2026 - Version 1.7.0 (per-scene lighting, ValeVision v2.71.0)
"""),
    # GetModelRoot takes TrueVision's optional design phase
    ("""    function Na__LeSnap__IsReady() { return !!Na__LeSnap__Renderer; }
    function Na__LeSnap__GetModelRoot() { return Na__LeSnap__ModelRoot; }
    // ------------------------------------------------------------
""",
     """    function Na__LeSnap__IsReady() { return !!Na__LeSnap__Renderer; }
    // ------------------------------------------------------------


    // FUNCTION | The Model Root a Viewport Is Drawn From
    // ------------------------------------------------------------
    // modelSourceId is TrueVision3D's design phase (a viewport's Model Source
    // renderId; null is the live model). ValeVision3D has no design phases
    // (DR-09), so every viewport is drawn from the live model root.
    // ------------------------------------------------------------
    function Na__LeSnap__GetModelRoot(modelSourceId) { return Na__LeSnap__ModelRoot; }
    // ------------------------------------------------------------
"""),
    # The two fingerprints
    ("""    // exactly what the projection cache keys use.
    // ------------------------------------------------------------
    function Na__LeSnap__GetModelFingerprint() {
""",
     """    // exactly what the projection cache keys use.
    //
    // modelSourceId (optional) is TrueVision3D's design phase. ValeVision3D
    // has no design phases (DR-09): both answer for the live model whatever
    // it says, so every key is the one it always was.
    // ------------------------------------------------------------
    function Na__LeSnap__GetModelFingerprint(modelSourceId) {
"""),
    ("""    function Na__LeSnap__GetPipelineFingerprint() {
""",
     """    function Na__LeSnap__GetPipelineFingerprint(modelSourceId) {
"""),
    # Render2d
    ("""    // one render and put back afterwards. Each goes in through the system that
    // owns it, so ValeVision's export line-width compensation still applies on top.
    // ------------------------------------------------------------
    function Na__LeSnap__Render2d(definition, windowMm, styles, widthPx, heightPx, modelLayers, antiAliasSamples, weights, stillWanted) {
        if (!Na__LeSnap__IsReady() || !definition) return Promise.resolve(null);
""",
     """    // one render and put back afterwards. Each goes in through the system that
    // owns it, so ValeVision's export line-width compensation still applies on top.
    //
    // modelSourceId is TrueVision3D's design phase (a viewport's Model Source
    // renderId). It is taken in TrueVision3D's position and not used:
    // ValeVision3D has no design phases (DR-09), so the live model is drawn and
    // every caller hands null.
    //
    // stillWanted: optional. Asked when this render's turn in the queue comes;
    // false answers null and nothing is drawn (a viewport whose sheet has been
    // left meanwhile). The PDF and the forced renders never pass it.
    //
    // depthFog: optional, TrueVision3D's depth fog source, which asks for the
    // viewport's fog image instead of its picture. ValeVision3D draws no depth
    // fog yet, so a fog source answers null - no fog image - and nothing is
    // queued: the picture must never stand in for its fog. Left out, this is
    // the picture, as always.
    // ------------------------------------------------------------
    function Na__LeSnap__Render2d(definition, windowMm, styles, widthPx, heightPx, modelLayers, antiAliasSamples, weights, modelSourceId, stillWanted, depthFog) {
        if (!Na__LeSnap__IsReady() || !definition) return Promise.resolve(null);
        if (depthFog) return Promise.resolve(null);                               // <-- A fog image is asked for, and none can be drawn here yet
"""),
    # Render3d: the design phase slot before the view window
    ("""    // drawing's cut.
    //
    // viewWindow: null for the camera's whole picture, or { u0, v0, u1, v1 } -
""",
     """    // drawing's cut.
    //
    // modelSourceId: as Render2d - TrueVision3D's design phase, taken in its
    // position (before the view window) and not used.
    //
    // viewWindow: null for the camera's whole picture, or { u0, v0, u1, v1 } -
"""),
    ("""    // draws that window of the scene's own camera.
    // ------------------------------------------------------------
    function Na__LeSnap__Render3d(sceneRecord, styles, widthPx, heightPx, modelLayers, antiAliasSamples, weights, viewWindow, stillWanted) {
""",
     """    // draws that window of the scene's own camera.
    //
    // stillWanted: as Render2d.
    // ------------------------------------------------------------
    function Na__LeSnap__Render3d(sceneRecord, styles, widthPx, heightPx, modelLayers, antiAliasSamples, weights, modelSourceId, viewWindow, stillWanted) {
"""),
]


# =============================================================================
# 2. VIEWPORT 2D - WINDOW  1.0.0 -> 1.0.1 (Describe's Model Source stub)
# =============================================================================
EDITS['Na__LayoutEditor__Viewport2d__Window__.js'] = [
    ("""// - Describe: the source records, the projection definition (the viewport's
//   own Render Composites toggles and Model Layers exclusion tokens folded
//   in) and the window, in one go.
""",
     """// - Describe: the source records, the projection definition (the viewport's
//   own Render Composites toggles and Model Layers exclusion tokens folded
//   in), the window and the viewport's Model Source, in one go. The Model
//   Source is always the live model here (ValeVision3D has no design
//   phases), answered in the shape TrueVision3D's callers read.
"""),
    (SPLIT_NOTE_OLD,
     """// PORT NOTE:
// - Ported from   : split out of Na__LayoutEditor__Viewport2d__.js (15-Sep-2026, ValeVision3D v2.47.0)
// - Twin          : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__Window__.js,
//                   ported from this unit (TrueVision3D v2.55.0). Describe's Model Source is replayed
//                   here as a hunk, the live model's answer standing in for Na__LeSource__Resolve
// - Source version: 1.2.0 (TrueVision3D v2.140.0, 22-Sep-2026; read at HEAD b2aa9151)
// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-23}} (Describe's Model Source)
// - Parity        : adapted (the moved code, and that hunk)
// - Divergences   :
//   - Describe's modelSource is a fixed answer in Resolve's shape for the live model
//     (Na__LeVp2d__LiveModelSource): ValeVision3D has no design phases and no Model Source module
//     (DR-09). TrueVision3D's callers read modelSource.renderId and .status unguarded, so it is never
//     null.
//   - Not here yet: TrueVision3D's turned viewport (1.1.0: ToFrame, FrameToPaper, RotationDeg and the
//     turn in ToPaper and FromPaper) and the door pose and Hide swings tokens in Describe (1.2.0).
// - Back-port     : none (TrueVision3D took the split in v2.55.0).
"""),
    ("""// DEVELOPMENT LOG:
// 15-Sep-2026 - Version 1.0.0
""",
     """// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.1 (Describe's Model Source, {{VVREL:W1-23}})
// - Describe hands back the viewport's Model Source with the source, the
//   definition and the window, as TrueVision3D's Describe does. ValeVision3D
//   has no design phases, so it is always the live model, in the shape
//   TrueVision3D's Na__LeSource__Resolve gives it: groupId null, label '',
//   storedId null, explicit false, missing false, isLive true, renderId null,
//   status 'live' - a new object each time. Never null: TrueVision3D's
//   callers read modelSource.renderId and .status with no guard. The
//   definition and the window are unchanged, so every key is too.
//
// 15-Sep-2026 - Version 1.0.0
"""),
    ("""    // FUNCTION | Source Records, Projection Definition and Window in One Go
    // ------------------------------------------------------------
    function Na__LeVp2d__Describe(viewport) {
""",
     """    // HELPER FUNCTION | The Model Source Every Viewport Draws Here: the Live Model
    // ------------------------------------------------------------
    // TrueVision3D's Describe hands back Na__LeSource__Resolve(viewport), and
    // its callers read modelSource.renderId and .status with no guard.
    // ValeVision3D has no design phases (DR-09), so every viewport draws the
    // model the 3D view holds: the answer Resolve gives a viewport of the live
    // model on a project with no model groups, a new object each time so no
    // caller can change another's.
    // ------------------------------------------------------------
    function Na__LeVp2d__LiveModelSource() {
        return { groupId : null, label : '', storedId : null, explicit : false, missing : false, isLive : true, renderId : null, status : 'live' };
    }
    // ------------------------------------------------------------


    // FUNCTION | Source Records, Projection Definition and Window in One Go
    // ------------------------------------------------------------
    function Na__LeVp2d__Describe(viewport) {
"""),
    ("""        return { source : source, definition : definition, window : Na__LeVp2d__Window(viewport) };
""",
     """        return { source : source, definition : definition, window : Na__LeVp2d__Window(viewport), modelSource : Na__LeVp2d__LiveModelSource() };
"""),
]


# =============================================================================
# 3. VIEWPORT 2D - FRAME  1.1.0 -> 1.1.1
# =============================================================================
EDITS['Na__LayoutEditor__Viewport2d__Frame__.js'] = [
    (SPLIT_NOTE_OLD,
     """// PORT NOTE:
// - Ported from   : split out of Na__LayoutEditor__Viewport2d__.js (15-Sep-2026, ValeVision3D v2.47.0)
// - Twin          : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__Frame__.js,
//                   ported from this unit (TrueVision3D v2.55.0). Its 1.1.0 (the viewport cache) is here,
//                   less its design phase lines, and the underlay render's call takes its shape
// - Source version: 1.4.0 (TrueVision3D v2.140.0, 22-Sep-2026; read at HEAD b2aa9151)
// - Ported on     : 18-Sep-2026 for ValeVision3D v2.57.0 (1.1.0); the underlay render's call 01-Oct-2026
//                   for ValeVision3D {{VVREL:W1-23}}
// - Parity        : adapted
// - Divergences   :
//   - The underlay render hands Render2d the viewport's Model Source renderId, then stillWanted, in
//     TrueVision3D's positions. The renderId is always null here, the live model (DR-09), so there is
//     no design phase fingerprint to wait for or keep.
//   - Not here yet: TrueVision3D's depth fog layer (1.2.0), Draft mode (1.3.0), the door raster layers
//     (1.4.0), and the Enhance strength and linework modifiers in RasterWeights.
// - Back-port     : none (TrueVision3D took the split in v2.55.0).
"""),
    ("""// DEVELOPMENT LOG:
// 18-Sep-2026 - Version 1.1.0
""",
     """// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.1.1 (TrueVision3D's render signature, {{VVREL:W1-23}})
// - The debounced underlay render hands Render2d the viewport's Model Source
//   renderId and then stillWanted, in TrueVision3D's positions: Render2d's
//   design phase slot now sits before stillWanted, as it does there. The
//   renderId is always null, the live model, so the same picture is rendered,
//   and a render still queued when its sheet is left is skipped as before.
//
// 18-Sep-2026 - Version 1.1.0
"""),
    ("""            const described = Na__LeVp2d__Describe(args.viewport);
            if (!described.definition) return;
            const key = state.wantedKey;
""",
     """            const described = Na__LeVp2d__Describe(args.viewport);
            if (!described.definition) return;
            const phaseId = described.modelSource.renderId;                       // <-- The design phase drawn: null, the live model (no design phases here)
            const key = state.wantedKey;
"""),
    ("""            Na__LeSnap__Render2d(described.definition, windowSnapshot, args.viewport.Viewport__Styles, px.w, px.h, args.viewport.Viewport__ModelLayers, px.samples, Na__LeVp2d__RasterWeights(args.viewport), () => !state.parked).then((result) => {   // <-- Still queued when its sheet is left: skipped, not rendered for nobody
""",
     """            Na__LeSnap__Render2d(described.definition, windowSnapshot, args.viewport.Viewport__Styles, px.w, px.h, args.viewport.Viewport__ModelLayers, px.samples, Na__LeVp2d__RasterWeights(args.viewport), phaseId, () => !state.parked).then((result) => {   // <-- Still queued when its sheet is left: skipped, not rendered for nobody
"""),
]


# =============================================================================
# 4. VIEWPORT 2D - LINEWORK  1.1.0 -> 1.1.1
# =============================================================================
EDITS['Na__LayoutEditor__Viewport2d__Linework__.js'] = [
    (SPLIT_NOTE_OLD,
     """// PORT NOTE:
// - Ported from   : split out of Na__LayoutEditor__Viewport2d__.js (15-Sep-2026, ValeVision3D v2.47.0)
// - Twin          : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__Linework__.js,
//                   ported from this unit (TrueVision3D v2.55.0). Its 1.1.0 (ForgetPaths) is here, and
//                   EnsureLinework takes its arguments
// - Source version: 1.2.0 (TrueVision3D v2.95.0, 20-Sep-2026; read at HEAD b2aa9151)
// - Ported on     : 18-Sep-2026 for ValeVision3D v2.57.0 (1.1.0); EnsureLinework's arguments 01-Oct-2026
//                   for ValeVision3D {{VVREL:W1-23}}
// - Parity        : adapted
// - Divergences   :
//   - EnsureLinework takes TrueVision3D's modelSource and waited and keys by the Model Source's
//     fingerprint, which is always the live model's here (DR-09): nothing waits for a design phase and
//     the live model is projected.
//   - Not here yet: TrueVision3D's per-owner Model Layers check in StyleBands and the Model Layers
//     token in StyleToken (1.2.0), the site plan rules in StyleBands, and BandPaths among the exports.
//   - Console prefix [ValeVision3D LayoutEditor].
// - Back-port     : none (TrueVision3D took the split in v2.55.0).
"""),
    ("""// DEVELOPMENT LOG:
// 18-Sep-2026 - Version 1.1.0
""",
     """// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.1.1 (TrueVision3D's EnsureLinework arguments, {{VVREL:W1-23}})
// - EnsureLinework(definition, onPhase, force, modelSource, waited), as
//   TrueVision3D's. modelSource is the viewport's Model Source
//   (Describe().modelSource), and its renderId picks the fingerprint the
//   cache is keyed by; waited is TrueVision3D's once-only wait for a design
//   phase still loading. ValeVision3D has no design phases, so the renderId
//   is always null and the key, the baked asset read and the projection are
//   exactly what they were.
//
// 18-Sep-2026 - Version 1.1.0
"""),
    ("""    // FUNCTION | The Four Classes for a Definition: Cache, Baked Asset, Then Render
    // ------------------------------------------------------------
    function Na__LeVp2d__EnsureLinework(definition, onPhase, force) {
        if (!definition) return Promise.resolve(null);
""",
     """    // FUNCTION | The Four Classes for a Definition: Cache, Baked Asset, Then Render
    // ------------------------------------------------------------
    // modelSource is the viewport's Model Source (Describe().modelSource);
    // omitted, the live model. waited is TrueVision3D's once-only wait for a
    // design phase still loading. ValeVision3D has no design phases (DR-09):
    // every Model Source is the live model, renderId null, so the fingerprint
    // asked for below is the live one and nothing is ever waited for.
    // ------------------------------------------------------------
    function Na__LeVp2d__EnsureLinework(definition, onPhase, force, modelSource, waited) {
        if (!definition) return Promise.resolve(null);
        const phaseId = (modelSource && modelSource.renderId) ? modelSource.renderId : null;
"""),
    ("""        const modelFp = Na__LeSnap__GetPipelineFingerprint();
        const key     = Na__PlView__CacheKey(definition, modelFp);
""",
     """        const modelFp = Na__LeSnap__GetPipelineFingerprint(phaseId);
        const key     = Na__PlView__CacheKey(definition, modelFp);
"""),
]


# =============================================================================
# 5. VIEWPORT 2D  1.8.0 -> 1.8.1
# =============================================================================
EDITS['Na__LayoutEditor__Viewport2d__.js'] = [
    ("""// PORT NOTE:
// - Ported from   : Lantern Designer 30__System__DrawingEditorMode (drawing view slots) and ValeVision3D 50__System__ProjectedLinework/Na__ProjectedLinework__SvgOverlay__.js
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5)
// - Parity        : adapted
// - Divergences   : free window with a pan instead of a fitted view; underlay from the composer preset; paper-width strokes.
// - Back-port     : none.
""",
     """// PORT NOTE:
// - Ported from   : Lantern Designer 30__System__DrawingEditorMode (drawing view slots) and ValeVision3D 50__System__ProjectedLinework/Na__ProjectedLinework__SvgOverlay__.js
// - Twin          : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__.js,
//                   ported from this file (TrueVision3D v2.21.0). Its later hunks are replayed into this
//                   file's own sequence; the log below names each one
// - Source version: 1.16.0 (TrueVision3D v2.164.0, 29-Sep-2026; read at HEAD b2aa9151)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5); the Model Source call shapes
//                   01-Oct-2026 for ValeVision3D {{VVREL:W1-23}}
// - Parity        : adapted
// - Divergences   :
//   - Against its sources: a free window with a pan instead of a fitted view; the underlay from the
//     composer preset; paper-width strokes.
//   - Render2d, EnsureLinework and the pipeline fingerprint are handed the viewport's Model Source in
//     TrueVision3D's positions (its 1.6.0, v2.32.0). It is always the live model here (DR-09), so no
//     frame waits for a design phase and every key is the live model's.
//   - Not here yet: TrueVision3D's door poses and Hide swings (1.7.0, 1.8.0, 1.15.0), site plan
//     viewports (1.9.0), depth fog (1.12.0), Draft mode (1.13.0), the turn in the snap key (1.14.0),
//     the site plan legend exports (1.16.0) and the raster modifier token in the underlay key.
// - Back-port     : none.
"""),
    ("""// DEVELOPMENT LOG:
// 18-Sep-2026 - Version 1.8.0
""",
     """// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.8.1 (TrueVision3D's Model Source call shapes, {{VVREL:W1-23}})
// - Fill, ForceRender and RenderForExport hand the viewport's Model Source
//   (Describe().modelSource) where TrueVision3D's do: its renderId to
//   Render2d (the design phase slot before stillWanted) and to the pipeline
//   fingerprint, the whole Model Source to EnsureLinework. ValeVision3D has
//   no design phases, so the renderId is always null, the live model: every
//   key, picture and line is what it was.
//
// 18-Sep-2026 - Version 1.8.0
"""),
    ("""        const modelFp = Na__LeSnap__GetPipelineFingerprint();
        if (styles.baseImage === false) {
""",
     """        const modelFp = Na__LeSnap__GetPipelineFingerprint(described.modelSource.renderId);   // <-- The Model Source's: always the live model's here (no design phases)
        if (styles.baseImage === false) {
"""),
    ("""                    Na__LeVp2d__EnsureLinework(described.definition, (phase) => Na__LeVp2d__ShowProgress(state, phase)).then((loaded) => {
""",
     """                    Na__LeVp2d__EnsureLinework(described.definition, (phase) => Na__LeVp2d__ShowProgress(state, phase), false, described.modelSource).then((loaded) => {
"""),
    ("""        const described = Na__LeVp2d__Describe(viewport);
        if (!described.definition) return false;
        const ppm    = state.lastArgs.ppm;
""",
     """        const described = Na__LeVp2d__Describe(viewport);
        if (!described.definition) return false;
        const phaseId = described.modelSource.renderId;                          // <-- The design phase drawn: null, the live model
        const ppm    = state.lastArgs.ppm;
"""),
    ("""            const classes = await Na__LeVp2d__EnsureLinework(described.definition, (phase) => { Na__LeVp2d__ShowProgress(state, phase); if (onPhase) onPhase(phase); }, true);
""",
     """            const classes = await Na__LeVp2d__EnsureLinework(described.definition, (phase) => { Na__LeVp2d__ShowProgress(state, phase); if (onPhase) onPhase(phase); }, true, described.modelSource);
"""),
    ("""                Na__LeVp2d__PaintLinework(state, viewport, Na__PlView__CacheKey(described.definition, Na__LeSnap__GetPipelineFingerprint()), classes, ppm);
""",
     """                Na__LeVp2d__PaintLinework(state, viewport, Na__PlView__CacheKey(described.definition, Na__LeSnap__GetPipelineFingerprint(phaseId)), classes, ppm);
"""),
    ("""                result = await Na__LeSnap__Render2d(described.definition, window0, styles, px.w, px.h, viewport.Viewport__ModelLayers, px.samples, Na__LeVp2d__RasterWeights(viewport));
""",
     """                result = await Na__LeSnap__Render2d(described.definition, window0, styles, px.w, px.h, viewport.Viewport__ModelLayers, px.samples, Na__LeVp2d__RasterWeights(viewport), phaseId);
"""),
    ("""        return Na__LeSnap__Render2d(described.definition, described.window, viewport.Viewport__Styles, px.w, px.h, viewport.Viewport__ModelLayers, px.samples, Na__LeVp2d__RasterWeights(viewport));
""",
     """        return Na__LeSnap__Render2d(described.definition, described.window, viewport.Viewport__Styles, px.w, px.h, viewport.Viewport__ModelLayers, px.samples, Na__LeVp2d__RasterWeights(viewport), described.modelSource.renderId);
"""),
]


# =============================================================================
# 6. VIEWPORT 3D  1.6.1 -> 1.6.2
# =============================================================================
EDITS['Na__LayoutEditor__Viewport3d__.js'] = [
    ("""// PORT NOTE:
// - Ported from   : ValeVision3D 21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js (capture and upload pattern)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5)
// - Parity        : new
// - Divergences   : TrueVision's 1.5.0 (Model Source - the design phase in the fingerprint
//                   and the render) is not here: ValeVision has no model groups. The zoom
//                   window of 1.5.0 is TrueVision's 1.6.0, less its design phase lines.
// - Back-port     : none.
""",
     """// PORT NOTE:
// - Ported from   : ValeVision3D 21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js (capture and upload pattern)
// - Twin          : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport3d__.js,
//                   ported from this file (TrueVision3D v2.21.0). Its later hunks are replayed into this
//                   file's own sequence; the log below names each one
// - Source version: 1.8.1 (TrueVision3D v2.161.0, 28-Sep-2026; read at HEAD b2aa9151)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5); the render call's shape
//                   01-Oct-2026 for ValeVision3D {{VVREL:W1-23}}
// - Parity        : adapted
// - Divergences   :
//   - TrueVision's 1.5.0 (Model Source - the design phase in the fingerprint and the render) is not
//     here: ValeVision has no model groups. The render hands Render3d a null design phase in
//     TrueVision3D's position, before the view window, and the fingerprint asks for the live model.
//     The zoom window of 1.5.0 is TrueVision's 1.6.0, less its design phase lines.
//   - Not here yet: TrueVision3D's Draft mode (1.8.0) and the Enhance strength in the render weights.
// - Back-port     : none.
"""),
    ("""// DEVELOPMENT LOG:
// 28-Sep-2026 - Version 1.6.1 (per-scene lighting, ValeVision v2.71.0)
""",
     """// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.6.2 (TrueVision3D's render signature, {{VVREL:W1-23}})
// - RenderNow hands Render3d the design phase, the view window and
//   stillWanted in TrueVision3D's positions (weights, renderId, view,
//   stillWanted): Render3d's design phase slot now sits before the view
//   window. Called the old way, a zoomed viewport's window would have gone
//   in as the design phase and its stillWanted as the window, and the whole
//   picture would have been drawn. The design phase is always null here,
//   the live model, so every picture and key is what it was.
//
// 28-Sep-2026 - Version 1.6.1 (per-scene lighting, ValeVision v2.71.0)
"""),
    ("""        const view = Na__LeVp3d__Window(viewport);                                 // <-- What the frame shows of the picture (null: all of it), read with the key, before the wait
        state.inFlight = true;
""",
     """        const view = Na__LeVp3d__Window(viewport);                                 // <-- What the frame shows of the picture (null: all of it), read with the key, before the wait
        const renderId = null;                                                     // <-- The design phase drawn: always the live model here (no design phases; TrueVision3D resolves the viewport's Model Source)
        state.inFlight = true;
"""),
    ("""            const result = await Na__LeSnap__Render3d(scene, viewport.Viewport__Styles, px.w, px.h, viewport.Viewport__ModelLayers, px.samples, { modelEdgePx : Na__LeComposite__Weight(viewport, 'baseImage') }, view, stillWanted);
""",
     """            const result = await Na__LeSnap__Render3d(scene, viewport.Viewport__Styles, px.w, px.h, viewport.Viewport__ModelLayers, px.samples, { modelEdgePx : Na__LeComposite__Weight(viewport, 'baseImage') }, renderId, view, stillWanted);
"""),
]


# =============================================================================
# 7. PDF EXPORTER  1.2.0 -> 1.2.1 (the :213 call site)
# =============================================================================
EDITS['Na__LayoutEditor__PdfExporter__.js'] = [
    ("""// PORT NOTE:
// - Ported from   : ValeVision3D 35__System__PageLayoutSystem/Na__PageLayoutSystem__PdfExport__A3__.js and Lantern Designer SheetChrome DrawToPdf
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5)
// - Parity        : adapted
// - Divergences   : any paper size; vector content; primitives shared with the screen.
// - Back-port     : none.
""",
     """// PORT NOTE:
// - Ported from   : ValeVision3D 35__System__PageLayoutSystem/Na__PageLayoutSystem__PdfExport__A3__.js and Lantern Designer SheetChrome DrawToPdf
// - Twin          : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js,
//                   ported from this file (TrueVision3D v2.21.0). Its later hunks are replayed into this
//                   file's own sequence; the log below names each one
// - Source version: 1.12.0 (TrueVision3D v2.160.0, 23-Sep-2026; read at HEAD b2aa9151)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5); the linework call's shape
//                   01-Oct-2026 for ValeVision3D {{VVREL:W1-23}}
// - Parity        : adapted
// - Divergences   :
//   - Against its sources: any paper size; vector content; primitives shared with the screen.
//   - EnsureLinework is handed the viewport's Model Source, as TrueVision3D's exporter does; it is
//     always the live model here (ValeVision3D has no design phases).
//   - Not here yet: TrueVision3D's 1.4.0 to 1.12.0.
// - Back-port     : none.
"""),
    ("""// DEVELOPMENT LOG:
// 14-Sep-2026 - Version 1.2.0
""",
     """// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.2.1 (TrueVision3D's linework call, {{VVREL:W1-23}})
// - A 2D viewport's linework is asked for with the viewport's Model Source,
//   as TrueVision3D's exporter asks: EnsureLinework(definition, null, false,
//   described.modelSource). ValeVision3D has no design phases, so it is the
//   live model and the PDF prints exactly the lines it did.
//
// 14-Sep-2026 - Version 1.2.0
"""),
    ("""                    const classes = await Na__LeVp2d__EnsureLinework(described.definition);
""",
     """                    const classes = await Na__LeVp2d__EnsureLinework(described.definition, null, false, described.modelSource);   // <-- The viewport's own Model Source (the live model here)
"""),
]


# -----------------------------------------------------------------------------
# Machinery
# -----------------------------------------------------------------------------
def sha256(data):
    return hashlib.sha256(data).hexdigest()


def read_before_hashes():
    hashes = {}
    with open(os.path.join(HERE, 'sha256__before.txt'), 'r', encoding='utf-8-sig') as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            digest, rel = line.split(None, 1)
            hashes[os.path.basename(rel.replace('\\', '/'))] = digest
    return hashes


def build_one(leaf, data):
    if data.startswith(b'\xef\xbb\xbf'):
        raise SystemExit(leaf + ': unexpected BOM')
    text = data.decode('utf-8')
    crlf = text.count('\r\n')
    lf = text.count('\n')
    if crlf != lf or text.count('\r') != crlf:
        raise SystemExit(leaf + ': not pure CRLF (crlf=%d lf=%d cr=%d)' % (crlf, lf, text.count('\r')))
    body = text.replace('\r\n', '\n')
    for index, (old, new) in enumerate(EDITS[leaf], 1):
        try:
            new.encode('ascii')
        except UnicodeEncodeError:
            raise SystemExit(leaf + ' edit %d: new text is not ASCII' % index)
        count = body.count(old)
        if count != 1:
            raise SystemExit(leaf + ' edit %d: old text found %d times (want exactly 1):\n%s' % (index, count, old[:300]))
        body = body.replace(old, new)
    out = body.replace('\n', '\r\n').encode('utf-8')
    return out


def main(argv):
    mode = argv[1] if len(argv) > 1 else '--build'
    before = read_before_hashes()
    os.makedirs(CANDIDATE, exist_ok=True)
    if mode == '--build':
        for leaf, live in FILES.items():
            data = open(live, 'rb').read()
            if sha256(data) != before[leaf]:
                raise SystemExit(leaf + ': the live file changed since it was read (hash differs) - stop')
            out = build_one(leaf, data)
            with open(os.path.join(CANDIDATE, leaf), 'wb') as fh:
                fh.write(out)
            print('%-45s %6d -> %6d bytes  %4d -> %4d lines  candidate sha256 %s' % (
                leaf, len(data), len(out), data.count(b'\n'), out.count(b'\n'), sha256(out)[:16]))
        return 0
    if mode == '--apply':
        planned = []
        for leaf, live in FILES.items():
            data = open(live, 'rb').read()
            if sha256(data) != before[leaf]:
                raise SystemExit(leaf + ': the live file changed since it was read (hash differs) - nothing written')
            cand = open(os.path.join(CANDIDATE, leaf), 'rb').read()
            if build_one(leaf, data) != cand:
                raise SystemExit(leaf + ': the candidate is not the build of the live file - rebuild first')
            planned.append((leaf, live, cand))
        for leaf, live, cand in planned:
            with open(live, 'wb') as fh:
                fh.write(cand)
            print('written', leaf, sha256(cand)[:16])
        return 0
    if mode == '--check-live':
        bad = 0
        for leaf, live in FILES.items():
            same = open(live, 'rb').read() == open(os.path.join(CANDIDATE, leaf), 'rb').read()
            print(('LIVE == CANDIDATE  ' if same else 'LIVE != CANDIDATE  ') + leaf)
            bad += 0 if same else 1
        return 1 if bad else 0
    if mode == '--restore':
        for leaf, live in FILES.items():
            data = open(live, 'rb').read()
            cand = open(os.path.join(CANDIDATE, leaf), 'rb').read()
            pre = open(os.path.join(BEFORE, leaf), 'rb').read()
            if data == pre:
                print('already the pre-image', leaf)
                continue
            if data != cand:
                print('NOT restored (changed by someone else since):', leaf)
                continue
            with open(live, 'wb') as fh:
                fh.write(pre)
            print('restored', leaf)
        return 0
    raise SystemExit('unknown mode ' + mode)


if __name__ == '__main__':
    sys.exit(main(sys.argv))
