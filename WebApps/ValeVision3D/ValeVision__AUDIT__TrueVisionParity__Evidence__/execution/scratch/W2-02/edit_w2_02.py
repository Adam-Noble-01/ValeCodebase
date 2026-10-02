# =============================================================================
# W2-02 edit script - Section adapter (DIV-2) completion in ValeVision3D
# =============================================================================
# Edits exactly two files, each only if it is still byte-identical to the
# pre-image this package recorded (sha256 below), every anchor asserted to
# occur exactly once, bytes in / bytes out with the file's own LF endings.
#
#   python edit_w2_02.py --dry-run    report what would change, write nothing
#   python edit_w2_02.py              apply (refuses if a file moved under us)
#   python edit_w2_02.py --restore    put both pre-images back (from ./preimage)
# =============================================================================

import hashlib
import os
import shutil
import sys

VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))

ADAPTER = os.path.join(VV, r'02__Src__AppModules\40__System__DrawingViewCore\Na__DrawView__SectionAdapter__.js')
TOOL = os.path.join(VV, r'02__Src__AppModules\41__System__CrossSectionView\Na__CrossSectionView__SystemLogic.js')

PRE_SHA = {
    ADAPTER: '152afa51dbb9faafcef8c3d8c615f9cd73d1c9b28f528dc585b4eec27317899c',
    TOOL: 'fddcd3edb5c76a16e088d69a451e5ef0cc61d49121c5df422bc19a73a3d98bb4',
}


# -----------------------------------------------------------------------------
# The adapter: header, imports, the six calls, exports
# -----------------------------------------------------------------------------

ADAPTER_EDITS = []

ADAPTER_EDITS.append(('description and integration', """// - Material swaps made by the drawing presets after the cut is applied need
//   the clip planes re-assigned; ReapplyClipping does that through the tool.
//
// INTEGRATION:
// - Na__FloorPlan__ModeController__ and the elevation controller call this in
//   place of TrueVision's Na__SectionCut__Engine__.
// - Requires the Cross Sections tool to be initialised (index.html does that
//   during the loading sequence).
//
""", """// - Material swaps made by the drawing presets after the cut is applied need
//   the clip planes re-assigned; ReapplyClipping does that through the tool.
// - THE OFFSCREEN RENDERS AND THE DEPTH FOG COME THROUGH HERE TOO, never
//   through the tool's own folder, so the files that make them carry the
//   same imports in both apps. Six more calls, all but one handed straight
//   to the tool:
//
//       Serialize() / Apply(snapshot)        the tool's sections, saved and
//                                            put back around a 3D render
//       GetOutlineWidthPx()                  the cut outline width, which a
//       SetOutlineWidthPx(widthPx)           sheet viewport's weight overrides
//       SetModelRoot(modelRoot)              a no-op: design phases are dormant
//       RenderDepthInto(camera)              the cut faces into a depth buffer
//                                            the depth fog is building
//
// INTEGRATION:
// - Na__FloorPlan__ModeController__ and the elevation controller call this in
//   place of TrueVision's Na__SectionCut__Engine__.
// - The six calls are for the Layout Editor's snapshot renderer (sections
//   around a 3D render, a viewport's Section Outline weight) and the depth
//   fog's render layer in 49__System__ElevationDepthFog (the cut faces' depth).
// - Requires the Cross Sections tool to be initialised (index.html does that
//   during the loading sequence).
//
"""))

ADAPTER_EDITS.append(('port note', """// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/41__System__SectionCutEngine/Na__SectionCut__Engine__.js
//                   (public surface only; the engine itself is not ported)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.18.0 (port Phase 2)
// - Parity        : diverged (D07)
// - Divergences   :
//   - Implemented over Na__CrossSectionView__SystemLogic.js instead of a dedicated engine.
//   - Slider drags are clamped to the model bounds plus a margin, as the tool's own gizmo drag is.
//   - The overlay is the tool's own; there is no separate cap mesh module.
// - Back-port     : none.
""", """// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, ValeVision3D v2.18.0, port Phase 2), presenting the
//                   public surface of TrueVision3D's section engine (41__System__SectionCutEngine/
//                   Na__SectionCut__Engine__.js, not ported) over the live Cross Sections tool
// - Twin          : TrueVision3D 02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js,
//                   ported FROM this file's 1.2.0, interface only: the same 13 exports as pass-throughs
// - Source version: 1.0.0 (TrueVision3D v2.21.0, 10-Sep-2026; read at b2aa9151) for the twin. The six calls of
//                   R6 F.8 C25 stand for TrueVision3D's own calls at the same pin: Na__SectSerialize__Serialize and
//                   __Apply (1.0.0, v2.21.0), the ConfigState appearance width, and the engine's SetModelRoot and
//                   RenderDepthInto (engine 1.2.0; RenderDepthInto arrived in TrueVision3D v2.94.0, 20-Sep-2026)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-02}} (version 1.3.0: the six calls)
// - Parity        : diverged (DIV-2: TrueVision3D's FILE, MODULE, banner and export names, the six included as
//                   F.8 C25 fixes them for both apps; ValeVision3D's body)
// - Divergences   :
//   - The body drives 41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js, the live user tool,
//     instead of a dedicated engine; NAMESPACE keeps the private Na__DrawSection (K2 H3).
//   - SuspendLiveTool and Release park and hand back the author's sections, colours and feature flag, and the
//     drawing cut takes the drawing colours from the drawing config while parked (TrueVision3D's are no-ops).
//   - Slider drags are clamped to the model bounds plus a margin, as the tool's own gizmo drag is.
//   - The overlay is the tool's own; there is no separate cap mesh module.
//   - GetPlaneDefinition answers { normal : [x, y, z], positionMm, depthMm }, positionMm along the normal with the
//     TD06 sign (DR-41); TrueVision3D's twin answers { id, normal : { x, y, z }, positionMm, depthMm, enabled }
//     with the opposite sign. Nothing in either app reads it yet.
//   - The six calls of F.8 C25 have ValeVision3D bodies over the tool: Serialize / Apply are its
//     SerializeSections / ApplySerializedSections (the TD06 snapshot); the outline width is its appearance
//     (GetAppearance / SetLineWidth), and a width that is not a positive number changes nothing; SetModelRoot is
//     a no-op that answers false, design phases being dormant (DR-09); RenderDepthInto draws the tool's cap root
//     (fills and outlines, never a gizmo) into the bound target with autoClear off, clearing and binding nothing.
//   - TrueVision3D's twin at b2aa9151 has the 13 exports only; its snapshot renderer and its 49 render layer
//     still import the six calls' counterparts from its 41 folder.
// - Back-port     : WT-02 (TrueVision lane, DR-36; DR-42 item 1): the six names as thin pass-throughs in
//                   TrueVision3D's twin, with its snapshot renderer and 49 render layer pointed at them.
"""))

ADAPTER_EDITS.append(('development log', """// DEVELOPMENT LOG:
// 09-Sep-2026 - Version 1.2.0
""", """// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.3.0 (the six section calls, {{VVREL:W2-02}})
// - Serialize, Apply, GetOutlineWidthPx, SetOutlineWidthPx, SetModelRoot and
//   RenderDepthInto beside the thirteen: the six names R6 F.8 C25 fixes for
//   both apps, so the Layout Editor's snapshot renderer and the depth fog's
//   render layer stop importing the tool's folder for sections.
// - Each hands straight to the Cross Sections tool. Serialize and Apply are
//   its TD06 snapshot pair; the outline width is its appearance, and a width
//   that is not a positive number changes nothing; RenderDepthInto draws its
//   cap root alone into the bound target, clearing nothing. SetModelRoot is a
//   no-op that answers false while design phases are dormant (DR-09).
// - The thirteen are untouched.
//
// 09-Sep-2026 - Version 1.2.0
"""))

ADAPTER_EDITS.append(('tool import', """        Na__CrossSection__SetLineColor,
        Na__CrossSection__SetLineWidth
    } from '../41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js';
""", """        Na__CrossSection__SetLineColor,
        Na__CrossSection__SetLineWidth,
        Na__CrossSection__RenderDepthInto
    } from '../41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js';
"""))

ADAPTER_EDITS.append(('the six calls', """    function Na__DrawView__SectionAdapter__GetActivePlaneId() {
        return Na__DrawSection__ActiveId;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------
""", """    function Na__DrawView__SectionAdapter__GetActivePlaneId() {
        return Na__DrawSection__ActiveId;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Offscreen Renders and the Depth Fog (R6 F.8 C25)
// -----------------------------------------------------------------------------

    // FUNCTION | Capture the Tool's Sections as a Snapshot
    // ------------------------------------------------------------
    // The tool's own TD06 snapshot, read as it stands: { gizmosVisible,
    // sliceDepthM, fillColor, lineColor, lineWidthPx, sections }. A 3D render
    // takes one before it poses its scene and hands it to Apply afterwards.
    // ------------------------------------------------------------
    function Na__DrawView__SectionAdapter__Serialize() {
        return Na__CrossSection__SerializeSections();
    }
    // ------------------------------------------------------------


    // FUNCTION | Put a Snapshot Back on the Tool (a Replacement, Never a Merge)
    // ------------------------------------------------------------
    // true when the tool took it; false when it refused one - no snapshot, the
    // tool not initialised yet, or switched off for the project.
    // ------------------------------------------------------------
    function Na__DrawView__SectionAdapter__Apply(snapshot) {
        return Na__CrossSection__ApplySerializedSections(snapshot);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Cut Outline Width in Pixels
    // ------------------------------------------------------------
    function Na__DrawView__SectionAdapter__GetOutlineWidthPx() {
        return Na__CrossSection__GetAppearance().lineWidthPx;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set the Cut Outline Width in Pixels
    // ------------------------------------------------------------
    // Every outline the tool holds takes it at once, and so does every cut it
    // builds afterwards. A width that is not a positive number changes nothing
    // and answers false: the tool itself would read it as its 2 px fallback.
    // The tool keeps its own 0.5 px floor.
    // ------------------------------------------------------------
    function Na__DrawView__SectionAdapter__SetOutlineWidthPx(widthPx) {
        const width = Number(widthPx);
        if (!Number.isFinite(width) || width <= 0) return false;
        Na__CrossSection__SetLineWidth(width);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Point the Cut at Another Model Root (a No-Op Here)
    // ------------------------------------------------------------
    // TrueVision3D puts a design phase's model in the scene for an offscreen
    // render and points its cut engine at it. ValeVision3D's design phases
    // are dormant (DR-09) - no phase is ever entered - so the tool keeps the
    // model root it was initialised with and nothing is re-pointed. Answers
    // false: nothing changed. A live design phase would need a root setter
    // in the tool first.
    // ------------------------------------------------------------
    function Na__DrawView__SectionAdapter__SetModelRoot(modelRoot) {
        return false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Add the Cut Faces to a Depth Buffer Being Built
    // ------------------------------------------------------------
    // For the drawing's depth fog, between its own scene render and its fog
    // quad: the cut faces go into the depth target it has bound, so a poche
    // reads as ON the plane, not as far back as the room behind it. The tool
    // draws its cap root alone - never a gizmo - with autoClear off, and
    // clears and binds nothing. A no-op with nothing cutting, which is every
    // plain elevation. Answers whether anything was drawn.
    // ------------------------------------------------------------
    function Na__DrawView__SectionAdapter__RenderDepthInto(camera) {
        return Na__CrossSection__RenderDepthInto(camera);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------
"""))

ADAPTER_EDITS.append(('exports', """        Na__DrawView__SectionAdapter__IsCutting,
        Na__DrawView__SectionAdapter__GetActivePlaneId
    };
""", """        Na__DrawView__SectionAdapter__IsCutting,
        Na__DrawView__SectionAdapter__GetActivePlaneId,
        Na__DrawView__SectionAdapter__Serialize,
        Na__DrawView__SectionAdapter__Apply,
        Na__DrawView__SectionAdapter__GetOutlineWidthPx,
        Na__DrawView__SectionAdapter__SetOutlineWidthPx,
        Na__DrawView__SectionAdapter__SetModelRoot,
        Na__DrawView__SectionAdapter__RenderDepthInto
    };
"""))


# -----------------------------------------------------------------------------
# The Cross Sections tool: one additive export, its log entry and integration line
# -----------------------------------------------------------------------------

TOOL_EDITS = []

TOOL_EDITS.append(('integration', """// - Na__UiFeature__CrossSectionView__DevControls persists CrossSection__Config.
// - Dispatches 'na-crosssection-state-changed' after every state mutation.
""", """// - Na__UiFeature__CrossSectionView__DevControls persists CrossSection__Config.
// - Na__DrawView__SectionAdapter__ drives it as every drawing's cut engine
//   through the drawing adapter exports below (RenderDepthInto included).
// - Dispatches 'na-crosssection-state-changed' after every state mutation.
"""))

TOOL_EDITS.append(('development log', """// DEVELOPMENT LOG:
// 09-Sep-2026 - Drawing adapter exports (port Phase 2)
""", """// DEVELOPMENT LOG:
// 02-Oct-2026 - Drawing adapter export RenderDepthInto ({{VVREL:W2-02}})
// - Additive export RenderDepthInto(camera) for Na__DrawView__SectionAdapter__,
//   the depth fog's cut-face pre-pass: the cap root alone (fills and outlines,
//   never the gizmos) drawn into the caller's bound target with autoClear
//   off, nothing cleared or bound; no existing behaviour changed.
//
// 09-Sep-2026 - Drawing adapter exports (port Phase 2)
"""))

TOOL_EDITS.append(('render depth into', """    function Na__CrossSection__ReapplyClipping() {
        if (!Na__Sect__Initialized) return false;
        Na__Sect__SyncActivePlanes();
        Na__Sect__InvalidateProfileCache();
        Na__RenderLoop__RequestRender();
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
""", """    function Na__CrossSection__ReapplyClipping() {
        if (!Na__Sect__Initialized) return false;
        Na__Sect__SyncActivePlanes();
        Na__Sect__InvalidateProfileCache();
        Na__RenderLoop__RequestRender();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Add the Live Caps to a Depth Buffer Somebody Else Is Building
    // ------------------------------------------------------------
    // For the drawing's depth fog, through Na__DrawView__SectionAdapter__: a
    // pass that reads depth, not colour, so the cut faces count as what they
    // are - ON the plane, not as far back as the room behind them. The
    // overlay above clears depth and draws to the screen, because it lands on
    // a finished picture; this does neither. Only the cap root is drawn -
    // every section's fill and outline, clipped by the other sections' planes
    // as on screen - never the gizmos in the helper root, into whatever target
    // the caller has bound, tested against the model depth already there.
    // autoClear is handed back as found, even when the draw throws. A no-op,
    // answering false, with no section cutting or no camera: depth drawn
    // through any camera but the caller's would land in the wrong place.
    // ------------------------------------------------------------
    function Na__CrossSection__RenderDepthInto(activeCamera) {
        if (!Na__Sect__Renderer || !Na__Sect__CapRoot || !activeCamera) return false;
        if (!Na__Sect__Sections.some((s) => s.enabled)) return false;            // <-- Nothing cutting: every plain elevation

        const savedAutoClear = Na__Sect__Renderer.autoClear;
        Na__Sect__Renderer.autoClear = false;                                    // <-- The model's depth must survive: the caps are tested against it
        try {
            Na__Sect__Renderer.render(Na__Sect__CapRoot, activeCamera);         // <-- The cap root alone, into the bound target
        } finally {
            Na__Sect__Renderer.autoClear = savedAutoClear;
        }
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
"""))

TOOL_EDITS.append(('exports', """        Na__CrossSection__SetSectionPositionMm,
        Na__CrossSection__ReapplyClipping
    };
""", """        Na__CrossSection__SetSectionPositionMm,
        Na__CrossSection__ReapplyClipping,
        Na__CrossSection__RenderDepthInto
    };
"""))


# -----------------------------------------------------------------------------
# Runner
# -----------------------------------------------------------------------------

def sha256(data):
    return hashlib.sha256(data).hexdigest()


def apply_edits(path, edits):
    data = open(path, 'rb').read()
    if sha256(data) != PRE_SHA[path]:
        raise SystemExit('REFUSED: %s is not the recorded pre-image (sha256 %s) - it changed under this package'
                         % (path, sha256(data)))
    if b'\r\n' in data:
        raise SystemExit('REFUSED: %s has CRLF line endings; this script writes LF anchors only' % path)
    text = data.decode('utf-8')
    for name, old, new in edits:
        count = text.count(old)
        if count != 1:
            raise SystemExit('REFUSED: anchor "%s" occurs %d times in %s' % (name, count, path))
        text = text.replace(old, new, 1)
    out = text.encode('utf-8')
    return data, out


def main():
    args = sys.argv[1:]
    if '--restore' in args:
        for path in (ADAPTER, TOOL):
            src = os.path.join(HERE, 'preimage', os.path.basename(path))
            if sha256(open(src, 'rb').read()) != PRE_SHA[path]:
                raise SystemExit('REFUSED: preimage copy %s does not match its recorded hash' % src)
            shutil.copyfile(src, path)
            print('restored', path)
        return

    results = []
    for path, edits in ((TOOL, TOOL_EDITS), (ADAPTER, ADAPTER_EDITS)):     # <-- The tool first: its export is additive, so the adapter never names a missing one
        before, after = apply_edits(path, edits)
        results.append((path, before, after))
        print('%s: %d -> %d bytes, %d -> %d lines, sha256 %s'
              % (os.path.basename(path), len(before), len(after), before.count(b'\n'), after.count(b'\n'), sha256(after)))

    if '--dry-run' in args:
        print('dry run: nothing written')
        return

    if '--stage' in args:
        stage = os.path.join(HERE, 'staged')
        os.makedirs(stage, exist_ok=True)
        for path, before, after in results:
            with open(os.path.join(stage, os.path.basename(path)), 'wb') as handle:
                handle.write(after)
            print('staged', os.path.join(stage, os.path.basename(path)))
        return

    for path, before, after in results:
        with open(path, 'wb') as handle:
            handle.write(after)
        check = open(path, 'rb').read()
        if check != after:
            raise SystemExit('write check failed for %s' % path)
        print('written', path)


if __name__ == '__main__':
    main()
