"""W2-16 ModeController hunks (TV 1.32.0 at b2aa9151, Model Source and site plan composites) -> mc_candidate/.
Reads the PRE-IMAGE (CRLF), works on LF text, writes CRLF back. Every replacement asserted exactly once."""
import os, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
REL = r'02__Src__AppModules\51__System__LayoutEditor\05__Core__ModeController\Na__LayoutEditor__ModeController__.js'
PRE = os.path.join(HERE, 'preimage', REL)

raw = open(PRE, 'rb').read()
assert raw.count(b'\r\n') == raw.count(b'\n'), 'mixed line endings'
t = raw.decode('utf-8').replace('\r\n', '\n')


def rep(old, new):
    global t
    n = t.count(old)
    assert n == 1, (n, old[:120])
    t = t.replace(old, new)


# 1. Imports: the site plan composites beside Panel__Styles (TV :342-:344), and the phase library and
#    Model Source after the projection events (TV :377-:379), and two SheetModel names (TV :313-:314).
rep("""    import { Na__LePanelStyles__Register } from '../40__Ui__Panels/Na__LayoutEditor__Panel__Styles__.js';
    import { Na__LePanelModelLayers__Register } from '../40__Ui__Panels/Na__LayoutEditor__Panel__ModelLayers__.js';
""", """    import { Na__LePanelStyles__Register } from '../40__Ui__Panels/Na__LayoutEditor__Panel__Styles__.js';
    import { Na__LePanelSpComp__Register } from '../40__Ui__Panels/Na__LayoutEditor__Panel__SitePlanComposites__.js';
    import { Na__LeSpComp__Ready } from '../25__System__RenderStyles/Na__LayoutEditor__SitePlanComposites__.js';
    import { Na__LePanelModelLayers__Register } from '../40__Ui__Panels/Na__LayoutEditor__Panel__ModelLayers__.js';
""")
rep("""    import { Na__PlPipe__CHANGED_EVENT, Na__PlPipe__STATUS_READY } from '../../50__System__ProjectedLinework/Na__ProjectedLinework__Pipeline__.js';
""", """    import { Na__PlPipe__CHANGED_EVENT, Na__PlPipe__STATUS_READY } from '../../50__System__ProjectedLinework/Na__ProjectedLinework__Pipeline__.js';
    import { Na__PhaseLib__CHANGED_EVENT } from '../../26__System__ToggleModelElements/Na__ModelGroup__PhaseLibrary__.js';
    import { Na__LeSource__Initialize } from '../20__System__Viewports/Na__LayoutEditor__ModelSource__.js';
""")
rep("""        Na__LeModel__GetSelectionItems,
        Na__LeModel__GetViewports
    } from '../07__Core__SheetData/Na__LayoutEditor__SheetModel__.js';
""", """        Na__LeModel__GetSelectionItems,
        Na__LeModel__GetViewportById,
        Na__LeModel__IsSitePlanViewport,
        Na__LeModel__GetViewports
    } from '../07__Core__SheetData/Na__LayoutEditor__SheetModel__.js';
""")

# 2. The panel registration after Styles (TV :533)
rep("""        Na__LePanelStyles__Register();
        Na__LePanelModelLayers__Register();
""", """        Na__LePanelStyles__Register();
        Na__LePanelSpComp__Register();                                         // <-- Site Plan Render Composites: the same controls, the site plan's three decks; hidden off a site plan sheet
        Na__LePanelModelLayers__Register();
""")

# 3. SectionForKind: a single site plan viewport opens Patterns (TV :1060-:1077)
rep("""        // A VIEWPORT FOLDS THE GROUP. Its own section is not one of them, and
        // leaving the markup sections as they were - the choice made in
        // TrueVision3D v2.57.0 - left Text, Dimensions, Vectors and Leaders
        // standing open over a selected drawing, which is the clutter the
        // group exists to prevent. Adam: "They should only be open when
        // active."
        if (kind === 'viewport')   return Na__LeMode__FOLD_GROUP;
        return null;
    }
""", """        // A VIEWPORT FOLDS THE GROUP. Its own section is not one of them, and
        // leaving the markup sections as they were - the choice made in
        // TrueVision3D v2.57.0 - left Text, Dimensions, Vectors and Leaders
        // standing open over a selected drawing, which is the clutter the
        // group exists to prevent. Adam: "They should only be open when
        // active." A site plan viewport is the one drawing a group section
        // edits - its hatches are Patterns' - so one of those opens Patterns
        // instead.
        if (kind === 'viewport')   return Na__LeMode__OneSitePlan(items) ? 'patterns' : Na__LeMode__FOLD_GROUP;
        return null;
    }
    function Na__LeMode__OneSitePlan(items) {
        const sheet     = Na__LeModel__GetActiveSheet();
        const viewports = (Array.isArray(items) ? items : []).filter((item) => item && item.kind === 'viewport');
        if (!sheet || viewports.length !== 1) return false;                     // <-- Patterns edits one viewport's layers at a time
        const viewport = Na__LeModel__GetViewportById(sheet, viewports[0].id);
        return !!viewport && Na__LeModel__IsSitePlanViewport(viewport);
    }
""")

# 4. Ready chain: the site plan composites' deck inventory after the hatches (TV :1193)
rep("""Na__LeHatch__Ready(), Na__LeDocKeys__Ready(), Na__DrawCfg__Load() ]).then(() => {   // <-- None of the eight rejects, so a missing file cannot hold the editor back
""", """Na__LeHatch__Ready(), Na__LeSpComp__Ready(), Na__LeDocKeys__Ready(), Na__DrawCfg__Load() ]).then(() => {   // <-- None of the nine rejects, so a missing file cannot hold the editor back
""")

# 5. Model Source initialised after the snapshot renderer; the identity comment as TrueVision's (TV :1205-:1207)
rep("""            Na__LeSnap__Initialize(context);
            Na__LeViewId__Initialize();                                      // <-- Unnamed elevation viewports are named from the project's north
""", """            Na__LeSnap__Initialize(context);
            Na__LeSource__Initialize();                                      // <-- How many design phases stay loaded off-scene
            Na__LeViewId__Initialize();                                      // <-- Unnamed elevation viewports are named from their model and the project's north
""")

# 6. The phase library listener after the projection listener (TV :1242-:1251)
rep("""                if (detail.status && detail.status !== Na__PlPipe__STATUS_READY) return;   // <-- Only finished linework repaints the frames
                Na__LeSurface__Refresh('frames');
            });
""", """                if (detail.status && detail.status !== Na__PlPipe__STATUS_READY) return;   // <-- Only finished linework repaints the frames
                Na__LeSurface__Refresh('frames');
            });
            // A DESIGN PHASE LOADED, FAILED, WENT, OR MOVED INTO THE 3D VIEW: every
            // frame re-resolves what it draws. The panels follow every change but
            // the per-file progress, which only the frames' badges show - a panel
            // refresh refills selects, and one per model file would snap an open
            // dropdown shut while a phase loads.
            window.addEventListener(Na__PhaseLib__CHANGED_EVENT, (event) => {
                if (!Na__LeMode__Active) return;
                Na__LeSurface__Refresh('frames');
                if (!event.detail || event.detail.kind !== 'progress') Na__LePanels__Refresh();
            });
""")

# 7. PORT NOTE and DEVELOPMENT LOG
rep("""//                   1.18.2, 1.18.3, 1.18.4, 1.18.5, 1.18.6, 1.18.7 and 1.18.8 entries name.""",
    """//                   1.18.2, 1.18.3, 1.18.4, 1.18.5, 1.18.6, 1.18.7, 1.18.8 and 1.18.9 entries name.""")
rep("""//                   v2.71.3 (the drawing tabs' keyboard: its restart, and Page Up / Page Down)
""", """//                   v2.71.3 (the drawing tabs' keyboard: its restart, and Page Up / Page Down);
//                   02-Oct-2026 for ValeVision3D {{VVREL:W2-16}} (Model Source and the site plan composites)
""")
rep("""//   - Not yet taken, each arriving with its feature: the register and statements pages, the
//     drawing grid and axes, vector tools, sheet images, floor areas, site plans and
//     design phases, note regions, the
//     published viewer's guards, and SectionForKind's site plan, floor area and picture rules.
""", """//   - Not yet taken, each arriving with its feature: the register and statements pages, the
//     drawing grid and axes, vector tools, sheet images, floor areas, note regions, the
//     published viewer's guards, and SectionForKind's floor area and picture rules.
//   - Design phases and site plans are wired as TrueVision wires them and stay dormant: the phase
//     library registers no groups (DR-09 (a)), so its listener never fires; the site plan
//     composites panel shows only on a site plan sheet, and none exists while
//     LayoutEditor__Sheet__SitePlanDrawingsEnabled is off (DR-08 (B)).
""")
rep("""// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.18.8 (the left column's two tabs, {{VVREL:W2-35}})
""", """// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.18.9 (Model Source and the site plan composites, {{VVREL:W2-16}})
// - MODEL SOURCE AND THE SITE PLAN COMPOSITES ARE WIRED as TrueVision3D
//   1.32.0 wires them (b2aa9151), at this app's sites: Na__LeSource__Initialize
//   after the snapshot renderer (the phase library's cache limit) and a
//   listener on Na__PhaseLib__CHANGED_EVENT that refreshes the frames and,
//   but for per-file progress, the panels; Na__LeSpComp__Ready joins the
//   ready Promise.all after the hatches; Na__LePanelSpComp__Register follows
//   Render Composites; SectionForKind opens Patterns for one selected site
//   plan viewport (OneSitePlan). All dormant here: the phase library has no
//   groups (DR-09 (a)) and no sheet is a site plan (DR-08 (B)), so nothing
//   a Vale author sees changes. TrueVision's v2.32.0, v2.49.0 and v2.89.0
//   carry no try by Adam.
//
// 02-Oct-2026 - Version 1.18.8 (the left column's two tabs, {{VVREL:W2-35}})
""")

out = t.replace('\n', '\r\n').encode('utf-8')
os.makedirs(os.path.join(HERE, 'mc_candidate'), exist_ok=True)
open(os.path.join(HERE, 'mc_candidate', 'Na__LayoutEditor__ModeController__.js'), 'wb').write(out)
print('mc candidate', hashlib.sha1(out).hexdigest()[:8], out.count(b'\n'), 'lines')
