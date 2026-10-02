"""Scratch (W0-02): the two hand edits the package allows after the scripted renumber.

1. FR-09  VVM/40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js
   - PORT NOTE rewritten per K2__NamingRulebook.md section 3 (VV-bodied twin filled example). The
     example's old file name is written "the Composer Preset": the literal old token is a retired
     name for k2_path_gate.py G1 and acceptance item 5, and history documents keep the full name.
   - RenderFrame gains an optional camera argument (S02a-F14) - the one non-mechanical edit.
   - DEVELOPMENT LOG entry with {{VVREL:W0-02}}.
2. FR-11  VVM/05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js
   - Banner line 2 takes TV's text (K2 H1); the MaxEngine-only qualifier moves into a PORT NOTE
     (R2 B.2.3, R6 F.8 C11). DEVELOPMENT LOG entry with {{VVREL:W0-02}}.

Byte-level: each file is read as bytes, normalised to LF for matching, and written back with its own
line ending (CRLF stays CRLF). Every old block must occur exactly once or nothing is written.
A copy of each file as the renumber script left it is saved beside this script (postscript/).
"""
import hashlib, os, sys

VVM = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules'
HERE = os.path.dirname(os.path.abspath(__file__))
POST = os.path.join(HERE, 'postscript')

RENDER_PRESET = os.path.join(VVM, '40__System__DrawingViewCore', 'Na__DrawView__RenderPreset__.js')
DISTANCE_CULLING = os.path.join(VVM, '05__RenderPipeline', 'Na__RenderEffect__DistanceCulling__.js')


# ---------------------------------------------------------------------------
# 1. RenderPreset
# ---------------------------------------------------------------------------
RP_PORTNOTE_OLD = """// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__ProfileLines__.js (purpose only)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.18.0 (port Phase 2)
// - Parity        : diverged (D12)
// - Divergences   :
//   - TrueVision bypasses its composer and inks silhouettes with its own Sobel overlay; ValeVision keeps
//     the composer and reuses Na__2dProfileLines__Create from the legacy Elevation View.
//   - The fixed 2D edge width is written straight to the pass uniform (the 3D pre-pass rewrites it every
//     frame, so nothing needs restoring); the LineworkSettings profile factor still multiplies it.
// - Back-port     : none.
"""

RP_PORTNOTE_NEW = """// PORT NOTE:
// - Authored in   : ValeVision3D first (as the Composer Preset 1.0.0, 09-Sep-2026, for ValeVision3D v2.18.0);
//                   renamed to TrueVision's interface name in ValeVision3D {{VVREL:W0-02}} (folder renumber, W0-02)
// - Twin          : TrueVision3D 02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js 1.1.0
//                   (ported FROM this file, interface only)
// - Parity        : diverged (DIV-1: identical eight exports, composer route instead of TV's overlay route)
// - Divergences   :
//   - Body drives VV's EffectComposer (D12); NAMESPACE keeps the private Na__DrawPreset. The silhouettes come
//     from the ortho-aware Na__2dProfileLines__ pre-pass, and the fixed 2D edge width is written straight to
//     the pass uniform (the LineworkSettings profile factor still multiplies it).
//   - RenderFrame takes an optional camera, as TV's RenderFrame(camera) does.
// - Back-port     : none (the interface is the seam).
"""

RP_LOG_OLD = """// DEVELOPMENT LOG:
// 13-Sep-2026 - Version 1.3.0
"""

RP_LOG_NEW = """// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.3.1 (drawing-folder renumber, {{VVREL:W0-02}})
// - Takes TrueVision's interface name: this file and its eight exports are
//   Na__DrawView__RenderPreset__ in 40__System__DrawingViewCore, so TrueVision's
//   callers (the Layout Editor snapshot renderer first) import it unchanged.
//   The composer body is ValeVision's, as before (DIV-1).
// - RenderFrame takes an optional camera, as TrueVision's RenderFrame(camera)
//   does: given one, this frame draws through it; given none, through the
//   camera Enter was handed, exactly as before.
//
// 13-Sep-2026 - Version 1.3.0
"""

RP_FRAME_OLD = """    // FUNCTION | Render One Drawing Frame (pre-pass, composer, section overlay)
    // ------------------------------------------------------------
    // Returns false when the preset is not active so the caller can fall back
    // to the ordinary 3D frame.
    // ------------------------------------------------------------
    function Na__DrawView__RenderPreset__RenderFrame() {
        if (!Na__DrawPreset__Active || !Na__DrawPreset__Camera) return false;
        const pipeline = Na__DrawPreset__Pipeline();

        if (pipeline && pipeline.composer) {
            if (typeof pipeline.renderDepthPrePass === 'function') pipeline.renderDepthPrePass(); // <-- MaxEngine depth texture (no-op when shared)
            Na__DrawPreset__RenderProfileNormals(Na__DrawPreset__Camera);
            pipeline.composer.render();
        } else if (Na__DrawPreset__Renderer && Na__DrawPreset__Scene) {
            Na__DrawPreset__Renderer.render(Na__DrawPreset__Scene, Na__DrawPreset__Camera);       // <-- No composer yet: plain render
        }

        const drawOverlay = Na__SectionClipping__GetOverlayRenderer();
        if (typeof drawOverlay === 'function') drawOverlay(Na__DrawPreset__Camera);              // <-- Cap fills and outlines on top
        return true;
    }
"""

RP_FRAME_NEW = """    // FUNCTION | Render One Drawing Frame (pre-pass, composer, section overlay)
    // ------------------------------------------------------------
    // Returns false when the preset is not active so the caller can fall back
    // to the ordinary 3D frame.
    // camera (optional) - the camera this one frame draws through, as
    //   TrueVision's RenderFrame(camera) takes it, so a TrueVision caller that
    //   passes its camera stays correct. With none (the render loop and the
    //   thumbnail hook pass none) the drawing camera Enter was handed draws, as
    //   before. A different camera holds the composer's RenderPass for this
    //   frame only.
    // ------------------------------------------------------------
    function Na__DrawView__RenderPreset__RenderFrame(camera) {
        if (!Na__DrawPreset__Active || !Na__DrawPreset__Camera) return false;
        const frameCamera = (camera && camera.isCamera) ? camera : Na__DrawPreset__Camera;  // <-- A caller's camera for this frame, else the drawing camera
        const pipeline    = Na__DrawPreset__Pipeline();

        if (pipeline && pipeline.composer) {
            const renderPass = (frameCamera !== Na__DrawPreset__Camera) ? Na__DrawPreset__GetRenderPass() : null;
            const passCamera = renderPass ? renderPass.camera : null;
            if (renderPass) renderPass.camera = frameCamera;                                   // <-- This frame only
            try {
                if (typeof pipeline.renderDepthPrePass === 'function') pipeline.renderDepthPrePass(); // <-- MaxEngine depth texture (no-op when shared)
                Na__DrawPreset__RenderProfileNormals(frameCamera);
                pipeline.composer.render();
            } finally {
                if (renderPass) renderPass.camera = passCamera;                                // <-- The pass gets its drawing camera back
            }
        } else if (Na__DrawPreset__Renderer && Na__DrawPreset__Scene) {
            Na__DrawPreset__Renderer.render(Na__DrawPreset__Scene, frameCamera);               // <-- No composer yet: plain render
        }

        const drawOverlay = Na__SectionClipping__GetOverlayRenderer();
        if (typeof drawOverlay === 'function') drawOverlay(frameCamera);                       // <-- Cap fills and outlines on top
        return true;
    }
"""

# ---------------------------------------------------------------------------
# 2. DistanceCulling
# ---------------------------------------------------------------------------
DC_BANNER_OLD = """// =============================================================================
// VALEVISION3D - DISTANCE CULLING (MAXENGINE ONLY)
// =============================================================================
"""

DC_BANNER_NEW = """// =============================================================================
// VALEVISION3D - DISTANCE CULLING
// =============================================================================
"""

DC_TAIL_OLD = """// - MaxEngine-only optional feature; disabled by default in ValeVision config.
// - Ported from TrueVision3D (07-Jun-2026).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 10-Jun-2026 - Version 1.0.0
// - Ported verbatim from TrueVision3D Na__RenderEffect__DistanceCulling__.js.
//
// =============================================================================
"""

DC_TAIL_NEW = """// - MaxEngine-only optional feature; disabled by default in ValeVision config.
// - Ported from TrueVision3D (07-Jun-2026).
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js
// - Source version: 1.1.0 (TrueVision3D v2.6.0, 07-Jun-2026); TrueVision's file is at 1.2.0 (v2.16.2,
//                   31-Aug-2026; read at HEAD b2aa9151)
// - Ported on     : 10-Jun-2026 for ValeVision3D v2.4.0 (the dual render engine)
// - Parity        : verbatim (the code is TrueVision 1.1.0's; header and region rules in ValeVision's layout)
// - Divergences   :
//   - MaxEngine only: the loading sequence initialises and registers it only for a model on MaxEngine
//     and switches it off under PureEngine; RenderEffect__DistanceCulling is off by default in
//     ValeVision's config. (The banner carried "(MAXENGINE ONLY)" until the folder renumber.)
//   - Console prefix and banner read ValeVision3D.
//   - Not yet TrueVision 1.2.0: no SetCullDistanceMm, GetCullDistanceMm or GetStats (the runtime
//     retune and the Dev Tools "Asset Cull Distance" readout, both 3D-tab features).
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.1 (drawing-folder renumber, {{VVREL:W0-02}})
// - Moved from 05__RenderPipeline/02__Engine__MaxEngine/ to TrueVision's path,
//   05__RenderPipeline/, so its Units import is one level shallower, as in
//   TrueVision. The banner takes TrueVision's text and the MaxEngine-only note
//   moves into the PORT NOTE. No behaviour change.
//
// 10-Jun-2026 - Version 1.0.0
// - Ported verbatim from TrueVision3D Na__RenderEffect__DistanceCulling__.js.
//
// =============================================================================
"""

PLAN = [
    (RENDER_PRESET, [(RP_PORTNOTE_OLD, RP_PORTNOTE_NEW), (RP_LOG_OLD, RP_LOG_NEW), (RP_FRAME_OLD, RP_FRAME_NEW)]),
    (DISTANCE_CULLING, [(DC_BANNER_OLD, DC_BANNER_NEW), (DC_TAIL_OLD, DC_TAIL_NEW)]),
]

RETIRED = ['42__System__DrawingViewCore', '43__System__FloorPlanViews', '44__System__PlanAnnotations',
           '45__System__PlanDimensions', '46__System__ElevationViews', '47__System__NorthDirection',
           '40__System__2dElevationsView', 'Na__AppUtils__SnapshotHistory__', 'Na__DrawView__ComposerPreset',
           '02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__']


def main():
    dry = '--dry-run' in sys.argv
    staged = []
    for path, reps in PLAN:
        data = open(path, 'rb').read()
        crlf = data.count(b'\r\n')
        lf_only = data.count(b'\n') - crlf
        if crlf and lf_only:
            raise SystemExit('mixed line endings, refusing: %s (crlf %d, lf %d)' % (path, crlf, lf_only))
        eol = '\r\n' if crlf else '\n'
        text = data.decode('utf-8')
        if eol == '\r\n':
            text = text.replace('\r\n', '\n')
        for old, new in reps:
            n = text.count(old)
            if n != 1:
                raise SystemExit('expected exactly one match, found %d, in %s for block starting %r' % (n, path, old[:70]))
            text = text.replace(old, new)
        for name in RETIRED:
            if name in text:
                raise SystemExit('retired name %r would remain in %s' % (name, path))
        out = text.replace('\n', '\r\n') if eol == '\r\n' else text
        staged.append((path, data, out.encode('utf-8'), eol))
        print('%s  sha1 %s  eol %s  %d -> %d bytes' % (os.path.basename(path), hashlib.sha1(data).hexdigest(),
                                                     'CRLF' if eol == '\r\n' else 'LF', len(data), len(out.encode('utf-8'))))
    if dry:
        print('DRY RUN - nothing written.')
        return
    os.makedirs(POST, exist_ok=True)
    for path, before, after, eol in staged:
        with open(os.path.join(POST, os.path.basename(path)), 'wb') as f:
            f.write(before)
    for path, before, after, eol in staged:
        with open(path, 'wb') as f:
            f.write(after)
        print('written: %s' % path)


if __name__ == '__main__':
    main()
