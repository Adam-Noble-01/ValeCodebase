"""W2-17 patch: live-phase bake filter through the loader (DevMenu 1.4.2, Loader 1.1.7, LoaderFacade test 1.0.2).

Reads bytes, replaces exact LF-text blocks (each must occur exactly once), writes bytes back.
Run with --check to only verify every anchor is found once.
"""
import hashlib
import sys

APP = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
LE = APP + r"\02__Src__AppModules\51__System__LayoutEditor"
DEV = LE + r"\70__DevTools__DevMenu\Na__LayoutEditor__DevMenu__Controls__.js"
LOADER = LE + r"\01__Core__Loader\Na__LayoutEditor__Loader__.js"
TEST = APP + r"\80__Testing__PrototypeEnvironment\Na__Test__LoaderFacade__.test.mjs"

EXPECTED_SHA1 = {
    DEV: "0a4c616c8276d78bc6cf3c8bef1ef3635a6109f8",
    LOADER: "027c151727237c5e833d14742831daa99e62438e",
}

VVREL = "{{VVREL:W2-17}}"

# ---------------------------------------------------------------------------
# DEV MENU
# ---------------------------------------------------------------------------
DEV_EDITS = [
    # PORT NOTE
    (
        """// PORT NOTE:
// - Ported from   : ValeVision3D 50__System__ProjectedLinework/Na__ProjectedLinework__DevMenu__Controls__.js (section pattern)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5)
// - Parity        : new
// - Divergences   : n/a
// - Back-port     : none.
""",
        """// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, ValeVision3D v2.21.0, after the section
//                   pattern of 50__System__ProjectedLinework/Na__ProjectedLinework__DevMenu__Controls__.js);
//                   TrueVision3D's twin was ported from it (TrueVision3D v2.21.0, 10-Sep-2026).
// - Mirrors       : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/70__DevTools__DevMenu/
//                   Na__LayoutEditor__DevMenu__Controls__.js 1.3.0, read at b2aa9151 (v2.172.0): its
//                   live-phase linework bake (1.2.0, TrueVision3D v2.32.0, 13-Sep-2026) and its sheet
//                   names as tabs (1.3.0, TrueVision3D v2.70.0, 19-Sep-2026)
// - Ported on     : 19-Sep-2026 (the tab names, 1.4.0); 02-Oct-2026 for ValeVision3D """ + VVREL + """
//                   (the live-phase bake, 1.4.2)
// - Parity        : diverged - this app's module, newer than TrueVision's in its architecture
//                   (WP-S03a-08: keep this file, take TrueVision's behaviour through the loader)
// - Divergences   :
//   - Reaches the editor only through Na__LayoutEditor__Loader__ (DR-24 (a)): the sheets, the
//     labels and every action are facade calls; Open, New Sheet, Duplicate, Delete and Bake load
//     the editor first, and the bake reaches Viewport3d and Model Source as the loaded editor's
//     viewport3d and modelSource parts. TrueVision imports its editor modules directly.
//   - The Enable Layout Mode switch heads the section (DR-25 (a), a recorded divergence); while it
//     is off the section holds only the switch and its note. TrueVision has no switch.
//   - Delete asks before anything loads; Initialize takes { showToast, open }, wires its toggle
//     once, and listens to the loader's sheets, mode and state events.
//   - The empty list's fallback is the config's wording (TrueVision's tab strip 2.0.0); TrueVision's
//     own module fallback still reads its older line.
//   - Banner and console prefix read ValeVision3D.
// - Back-port     : none - TrueVision has no loader to reach its editor through (DR-24 (a)); its
//                   stale NoSheets fallback is listed for the TrueVision lane (WP-S03a-10, DR-36).
""",
    ),
    # DEVELOPMENT LOG entry
    (
        """// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.4.1 (v2.71.2)
""",
        """// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.4.2 (""" + VVREL + """)
// - THE BAKE PROJECTS THE LIVE DESIGN PHASE ONLY, as TrueVision's 1.2.0
//   does (TrueVision3D v2.32.0): a drawing is named for a linework bake only
//   by a viewport that draws the live design phase
//   (Na__LeSource__Resolve(viewport).isLive). The stored linework asset is
//   one per drawing, of the live model; a viewport of another phase keeps
//   its lines in the browser store. Model Source is reached as the loaded
//   editor's modelSource part (Na__LayoutEditor__Loader__ 1.1.7), so the
//   section still imports nothing from the editor and still loads before
//   it. A project with no design phases (every ValeVision project today,
//   DR-09 (a)) resolves every viewport as live, so its bake names the same
//   drawings as before.
// - The PORT NOTE says what this file is: this app's module, taking
//   TrueVision's behaviour through the loader (WP-S03a-08), with the Layout
//   Mode switch a recorded divergence (DR-25 (a)).
//
// 02-Oct-2026 - Version 1.4.1 (v2.71.2)
""",
    ),
    # Bake comment
    (
        """    // HELPER FUNCTION | Bake Every 3D Snapshot and Every Drawing's Linework to R2
    // ------------------------------------------------------------
    // The snapshots are rendered by the editor, so it is loaded first.
    // ------------------------------------------------------------
""",
        """    // HELPER FUNCTION | Bake Every 3D Snapshot and Every Drawing's Linework to R2
    // ------------------------------------------------------------
    // The snapshots are rendered by the editor, so it is loaded first; the
    // design phase a viewport draws is the loaded editor's Model Source.
    // ------------------------------------------------------------
""",
    ),
    # The live-phase filter
    (
        """            if (v.Viewport__Kind === model.Na__LeModel__KIND_2D && v.Viewport__Styles.projectedLinework && v.Viewport__DrawingId) wanted.push(v.Viewport__DrawingId);
""",
        """            if (v.Viewport__Kind === model.Na__LeModel__KIND_2D && v.Viewport__Styles.projectedLinework && v.Viewport__DrawingId && editor.modelSource.Na__LeSource__Resolve(v).isLive) wanted.push(v.Viewport__DrawingId);   // <-- The bake projects the live model only
""",
    ),
]

# ---------------------------------------------------------------------------
# LOADER
# ---------------------------------------------------------------------------
LOADER_EDITS = [
    (
        """// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.1.6 ({{VVREL:W2-18}})
""",
        """// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.1.7 (""" + VVREL + """)
// - MODEL SOURCE IS AN EDITOR PART. Na__LeLoad__ImportEditor names
//   20__System__Viewports/Na__LayoutEditor__ModelSource__.js as modelSource,
//   a literal import() like the other six (rule 2 above), so the Dev
//   section's bake asks the loaded editor which design phase a viewport
//   draws (Na__LeSource__Resolve) and names a drawing for linework only
//   when it is the live one, as TrueVision's Dev menu 1.2.0 does. The
//   module is already in the mode controller's graph, so the load fetches
//   nothing new; the export harness proves the name.
//
// 02-Oct-2026 - Version 1.1.6 ({{VVREL:W2-18}})
""",
    ),
    (
        """    let Na__LeLoad__Editor     = null;    // <-- { mode, model, spec, config, viewport3d, pdf } once loaded
""",
        """    let Na__LeLoad__Editor     = null;    // <-- { mode, model, spec, config, viewport3d, pdf, modelSource } once loaded
""",
    ),
    (
        """    // The mode controller brings the rest of the editor with it. The other five
    // are already in its graph; they are named here for the facade to call.
    // Literal specifiers, so the module graph harness walks the editor too.
    // ------------------------------------------------------------
    function Na__LeLoad__ImportEditor() {
        return Promise.all([
            import('../05__Core__ModeController/Na__LayoutEditor__ModeController__.js'),
            import('../07__Core__SheetData/Na__LayoutEditor__SheetModel__.js'),
            import('../50__Feature__Specification/Na__LayoutEditor__SpecData__.js'),
            import('../03__Core__Config/Na__LayoutEditor__ConfigState__.js'),
            import('../20__System__Viewports/Na__LayoutEditor__Viewport3d__.js'),
            import('../60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js')
        ]).then(([mode, model, spec, config, viewport3d, pdf]) => ({ mode, model, spec, config, viewport3d, pdf }));
    }
""",
        """    // The mode controller brings the rest of the editor with it. The other six
    // are already in its graph; they are named here for the facade and the
    // Dev section to call (modelSource: the design phase a viewport draws,
    // for the Dev bake). Literal specifiers, so the module graph harness
    // walks the editor too.
    // ------------------------------------------------------------
    function Na__LeLoad__ImportEditor() {
        return Promise.all([
            import('../05__Core__ModeController/Na__LayoutEditor__ModeController__.js'),
            import('../07__Core__SheetData/Na__LayoutEditor__SheetModel__.js'),
            import('../50__Feature__Specification/Na__LayoutEditor__SpecData__.js'),
            import('../03__Core__Config/Na__LayoutEditor__ConfigState__.js'),
            import('../20__System__Viewports/Na__LayoutEditor__Viewport3d__.js'),
            import('../60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js'),
            import('../20__System__Viewports/Na__LayoutEditor__ModelSource__.js')
        ]).then(([mode, model, spec, config, viewport3d, pdf, modelSource]) => ({ mode, model, spec, config, viewport3d, pdf, modelSource }));
    }
""",
    ),
]

# ---------------------------------------------------------------------------
# LOADER FACADE TEST (unavoidable: it pins the parts ImportEditor binds)
# ---------------------------------------------------------------------------
TEST_EDITS = [
    (
        """// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.0.1 (v2.71.2)
""",
        """// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.0.2 (""" + VVREL + """)
// - The loader binds a seventh editor part, modelSource (Model Source, for
//   the Dev bake's live-phase filter): the parts check, the import() check,
//   the stand-ins and the load case read it.
//
// 02-Oct-2026 - Version 1.0.1 (v2.71.2)
""",
    ),
    (
        """        pdf        : LE + '/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js',
        tabs       : LE""",
        """        pdf        : LE + '/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js',
        modelSource : LE + '/20__System__Viewports/Na__LayoutEditor__ModelSource__.js',
        tabs       : LE""",
    ),
    (
        """    const PARTS = [ 'mode', 'model', 'spec', 'config', 'viewport3d', 'pdf' ];
""",
        """    const PARTS = [ 'mode', 'model', 'spec', 'config', 'viewport3d', 'pdf', 'modelSource' ];
""",
    ),
    (
        """    check('the six editor entry modules, the tab strip and the Dev section are reached only through import()',
        [ P.mode, P.model, P.spec, P.config, P.viewport3d, P.pdf, P.tabs, P.dev ].every(""",
        """    check('the seven editor entry modules, the tab strip and the Dev section are reached only through import()',
        [ P.mode, P.model, P.spec, P.config, P.viewport3d, P.pdf, P.modelSource, P.tabs, P.dev ].every(""",
    ),
    (
        """    check('Na__LeLoad__ImportEditor binds mode, model, spec, config, viewport3d and pdf to the modules this test reads',
""",
        """    check('Na__LeLoad__ImportEditor binds mode, model, spec, config, viewport3d, pdf and modelSource to the modules this test reads',
""",
    ),
    (
        """    const EDITOR_STANDINS = { mode : P.mode, model : P.model, spec : P.spec, config : P.config, viewport3d : P.viewport3d, pdf : P.pdf, tabs : P.tabs, dev : P.dev };
""",
        """    const EDITOR_STANDINS = { mode : P.mode, model : P.model, spec : P.spec, config : P.config, viewport3d : P.viewport3d, pdf : P.pdf, modelSource : P.modelSource, tabs : P.tabs, dev : P.dev };
""",
    ),
    (
        """        check('the load: the six editor entry modules were fetched, nothing unexpected', [ P.mode, P.model, P.spec, P.config, P.viewport3d, P.pdf ].every(""",
        """        check('the load: the seven editor entry modules were fetched, nothing unexpected', [ P.mode, P.model, P.spec, P.config, P.viewport3d, P.pdf, P.modelSource ].every(""",
    ),
]


def patch(path, edits, expected_sha=None, check_only=False):
    data = open(path, "rb").read()
    if expected_sha and hashlib.sha1(data).hexdigest() != expected_sha:
        raise SystemExit("CHANGED UNDER ME: " + path)
    crlf = b"\r\n" in data
    text = data.decode("utf-8")
    nl = "\r\n" if crlf else "\n"
    for old, new in edits:
        o = old.replace("\n", nl)
        n = new.replace("\n", nl)
        count = text.count(o)
        if count != 1:
            raise SystemExit("anchor found %d times in %s:\n%s" % (count, path, old[:200]))
        text = text.replace(o, n)
    if not check_only:
        open(path, "wb").write(text.encode("utf-8"))
    print(("checked " if check_only else "patched ") + path)


if __name__ == "__main__":
    only = "--check" in sys.argv
    patch(DEV, DEV_EDITS, EXPECTED_SHA1[DEV], only)
    patch(LOADER, LOADER_EDITS, EXPECTED_SHA1[LOADER], only)
    patch(TEST, TEST_EDITS, None, only)
