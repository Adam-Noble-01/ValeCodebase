"""W2-35 build: LE/58 Specification Scrapbook (five files, new), the ModeController's left tabs, and
Na__Test__SpecInlineEdit__ (adapted). TV bytes come from git show at the pin; every seam is an exact
replacement asserted to its count. --apply writes; without it only candidates are written to scratch/out.
"""
import hashlib, os, subprocess, sys

PIN = 'b2aa9151'
TVGIT = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TVAPP = 'na-apps/30__TrueVision__CoreAppCode/'
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
LE58 = '02__Src__AppModules/51__System__LayoutEditor/58__Feature__ScrapbookSpecification/'
MC = '02__Src__AppModules/51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js'
TEST = '80__Testing__PrototypeEnvironment/Na__Test__SpecInlineEdit__.test.mjs'
VVREL = '{{VVREL:W2-35}}'


def tv(rel):
    data = subprocess.run(['git', '-C', TVGIT, 'show', PIN + ':' + TVAPP + rel], capture_output=True, check=True).stdout
    assert b'\r\n' not in data, rel + ' is not LF'
    return data.decode('utf-8')


def rep(text, old, new, count=1, where=''):
    n = text.count(old)
    assert n == count, '%s: expected %d of %r, found %d' % (where, count, old[:70], n)
    return text.replace(old, new)


results = {}

# -----------------------------------------------------------------------------
# 1. The library
# -----------------------------------------------------------------------------
f = 'Na__LayoutEditor__ScrapbookSpecification__.js'
t = tv('02__Src__AppModules/51__System__LayoutEditor/58__Feature__ScrapbookSpecification/' + f)
t = rep(t, '// TRUEVISION3D - LAYOUT EDITOR - SPECIFICATION SCRAPBOOK\n', '// VALEVISION3D - LAYOUT EDITOR - SPECIFICATION SCRAPBOOK\n', 1, f)
t = rep(t, '//   ARE the project\'s drawing notes (TrueVision__DrawingNotes__.json, read by\n',
        '//   ARE the project\'s drawing notes (ValeVision__DrawingNotes__.json, read by\n', 1, f)
t = rep(t, "console.warn('[TrueVision3D LayoutEditor] ", "console.warn('[ValeVision3D LayoutEditor] ", 1, f)
t = rep(t,
"""// PORT NOTE:
// - Authored in   : TrueVision3D first (20-Sep-2026)
// - ValeVision    : not yet ported. Nothing here is app-specific, but ValeVision
//                   must hold the Project Specification and the scrapbook host
//                   (its v2.68.0) first - it does.
""",
"""// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/58__Feature__ScrapbookSpecification/Na__LayoutEditor__ScrapbookSpecification__.js
// - Source version: 1.0.1 (TrueVision3D v2.138.0, 21-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D """ + VVREL + """, new in this app with the left
//                   column's Specification tab. 1.0.0 (v2.91.0; no try recorded by Adam, who
//                   used the tab before v2.144.0) and 1.0.1 (v2.138.0; NOT tried by Adam) are not
//                   confirmed in TrueVision: ported under DR-01 (c) and named.
// - Parity        : verbatim
// - Divergences   :
//   - Banner and console prefix read ValeVision3D; DESCRIPTION names ValeVision__DrawingNotes__.json.
// - Back-port     : none.
""", 1, f)
results[LE58 + f] = t

# -----------------------------------------------------------------------------
# 2. The panel
# -----------------------------------------------------------------------------
f = 'Na__LayoutEditor__Panel__ScrapbookSpecification__.js'
t = tv('02__Src__AppModules/51__System__LayoutEditor/58__Feature__ScrapbookSpecification/' + f)
t = rep(t, '// TRUEVISION3D - LAYOUT EDITOR - PANEL: SPECIFICATION SCRAPBOOK\n', '// VALEVISION3D - LAYOUT EDITOR - PANEL: SPECIFICATION SCRAPBOOK\n', 1, f)
t = rep(t,
"""// PORT NOTE:
// - Authored in   : TrueVision3D first (20-Sep-2026)
// - ValeVision    : not yet ported. Nothing here is app-specific.
""",
"""// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/58__Feature__ScrapbookSpecification/Na__LayoutEditor__Panel__ScrapbookSpecification__.js
// - Source version: 1.2.0 (TrueVision3D v2.151.0, 22-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D """ + VVREL + """, new in this app. 1.2.0 sits in
//                   TrueVision's git a2e0a836 (22-Sep, devlog top v2.151.0) with no devlog entry of
//                   its own; 1.0.0 (v2.91.0) and 1.1.0 (v2.144.0, NOT tried by Adam) are not
//                   confirmed in TrueVision: ported under DR-01 (c) and named.
// - Parity        : verbatim
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : none.
""", 1, f)
results[LE58 + f] = t

# -----------------------------------------------------------------------------
# 3. The row editor
# -----------------------------------------------------------------------------
f = 'Na__LayoutEditor__ScrapbookSpecification__RowEditor__.js'
t = tv('02__Src__AppModules/51__System__LayoutEditor/58__Feature__ScrapbookSpecification/' + f)
t = rep(t, '// TRUEVISION3D - LAYOUT EDITOR - SPECIFICATION SCRAPBOOK - ROW EDITOR\n', '// VALEVISION3D - LAYOUT EDITOR - SPECIFICATION SCRAPBOOK - ROW EDITOR\n', 1, f)
t = rep(t, '//     2. the local TrueVision__DrawingNotes__.json is written and READ BACK\n',
        '//     2. the local ValeVision__DrawingNotes__.json is written and READ BACK\n', 1, f)
t = rep(t, "console.warn('[TrueVision3D LayoutEditor] ", "console.warn('[ValeVision3D LayoutEditor] ", 1, f)
t = rep(t,
"""// PORT NOTE:
// - Authored in   : TrueVision3D first (22-Sep-2026)
// - ValeVision    : not yet ported. Nothing here is app-specific but the
//                   local-file write, which is the Transport unit's.
""",
"""// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/58__Feature__ScrapbookSpecification/Na__LayoutEditor__ScrapbookSpecification__RowEditor__.js
// - Source version: 1.1.0 (TrueVision3D v2.163.0, 29-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D """ + VVREL + """, new in this app. 1.0.0 (v2.144.0)
//                   and 1.1.0 (v2.162.0/v2.163.0) are NOT tried by Adam in TrueVision: ported under
//                   DR-01 (c) and named.
// - Parity        : verbatim
// - Divergences   :
//   - Banner and console prefix read ValeVision3D; DESCRIPTION names ValeVision__DrawingNotes__.json.
//   - The local-file write is TrueVision's call, Na__LeSpec__WriteLocalCopy from the specification's
//     barrel: in this app the Lockstep unit writes ValeVision__DrawingNotes__.json beside the project
//     through the Whitecardopedia local server (the transport facade, Na__LocalMirror__WriteSiblingFile),
//     with TrueVision's answers { ok, skipped, held, verified, error }. Nothing here changes for it.
// - Back-port     : none.
""", 1, f)
results[LE58 + f] = t

# -----------------------------------------------------------------------------
# 4. The config
# -----------------------------------------------------------------------------
f = 'Na__LayoutEditor__ScrapbookSpecification__Config__.json'
t = tv('02__Src__AppModules/51__System__LayoutEditor/58__Feature__ScrapbookSpecification/' + f)
t = rep(t, 'read through Na__LayoutEditor__SpecData__', 'read through Na__LayoutEditor__SpecData__', 1, f)
t = rep(t, "the project's drawing notes - TrueVision__DrawingNotes__.json beside the project data",
        "the project's drawing notes - ValeVision__DrawingNotes__.json beside the project data", 1, f)
t = rep(t, "(55__Feature__SpellCheck; the words are in 50__TrueVision__UserConfig/TrueVision__UserSpellings__.json)",
        "(55__Feature__SpellCheck; the words are in 50__ValeVision__UserConfig/ValeVision__UserSpellings__.json)", 1, f)
t = rep(t, "written at once to the local TrueVision__DrawingNotes__.json and read back",
        "written at once to the local ValeVision__DrawingNotes__.json and read back", 1, f)
t = rep(t, '        "Meta__Author"      : "Adam Noble - Noble Architecture",\n',
        '        "Meta__Author"      : "Adam Noble - Noble Architecture",\n'
        '        "Meta__PortedFrom"  : "TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/58__Feature__ScrapbookSpecification/Na__LayoutEditor__ScrapbookSpecification__Config__.json, Meta 1.2.0 (TrueVision3D v2.151.0, 22-Sep-2026; read at HEAD b2aa9151), ported 02-Oct-2026 (parity package W2-35). Every key, number and label is TrueVision\'s. This app\'s own words: Meta__Data and Meta__Editing name ValeVision__DrawingNotes__.json and this app\'s dictionary, 50__ValeVision__UserConfig/ValeVision__UserSpellings__.json. Not confirmed by Adam in TrueVision (v2.91.0, v2.144.0): ported under DR-01 (c) and named.",\n', 1, f)
assert 'TrueVision__' not in t and '50__TrueVision' not in t, f + ' still names a TrueVision file'
results[LE58 + f] = t

# -----------------------------------------------------------------------------
# 5. The stylesheet
# -----------------------------------------------------------------------------
f = 'Na__LayoutEditor__Styles__ScrapbookSpecification__.css'
t = tv('02__Src__AppModules/51__System__LayoutEditor/58__Feature__ScrapbookSpecification/' + f)
t = rep(t, '/* TRUEVISION3D - LAYOUT EDITOR - STYLES: SPECIFICATION SCRAPBOOK     */\n',
        '/* VALEVISION3D - LAYOUT EDITOR - STYLES: SPECIFICATION SCRAPBOOK     */\n', 1, f)
t = rep(t,
""" * PORT NOTE:
 * - Authored in : TrueVision3D first (20-Sep-2026)
 * - ValeVision  : not yet ported.
""",
""" * PORT NOTE:
 * - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/58__Feature__ScrapbookSpecification/Na__LayoutEditor__Styles__ScrapbookSpecification__.css
 * - Source version: 1.2.0 (TrueVision3D v2.151.0, 22-Sep-2026; read at b2aa9151)
 * - Ported on     : 02-Oct-2026 for ValeVision3D """ + VVREL + """, new in this app, linked by
 *                   Na__LayoutEditor__Panel__ScrapbookSpecification__ itself (no loader or CSS index
 *                   line). 1.0.0 (v2.91.0), 1.1.0 (v2.144.0, NOT tried by Adam) and 1.2.0 (git
 *                   a2e0a836, no devlog entry) are not confirmed in TrueVision: ported under
 *                   DR-01 (c) and named.
 * - Parity        : verbatim
 * - Divergences   :
 *   - Banner reads ValeVision3D.
 * - Back-port     : none.
""", 1, f)
results[LE58 + f] = t

for rel, text in results.items():
    if rel.endswith('.js') or rel.endswith('.css'):
        assert 'TRUEVISION3D' not in text and '[TrueVision3D' not in text, rel

# -----------------------------------------------------------------------------
# 6. The test (adapted, with a ValeVision region)
# -----------------------------------------------------------------------------
t = tv('80__Testing__PrototypeEnvironment/Na__Test__SpecInlineEdit__.test.mjs')
t = rep(t, '// TRUEVISION3D - TEST - SPECIFICATION NOTE EDITED IN THE DRAWING\n', '// VALEVISION3D - TEST - SPECIFICATION NOTE EDITED IN THE DRAWING\n', 1, 'test')
t = rep(t, '//   ProjectVision local server (a map standing in for the disk, served back\n',
        '//   Whitecardopedia local server (a map standing in for the disk, served back\n', 1, 'test')
t = rep(t,
"""//   that was typed into is written - never a field left alone.
//
// USAGE:""",
"""//   that was typed into is written - never a field left alone.
// - WHAT IS PROVED FOR VALEVISION (its own region, after TrueVision's cases;
//   package W2-35's acceptance that runs without a browser)
//   - The filter: "rf" finds only the notes whose code starts RF - never a
//     note that merely says "surface" - and the shipped panel's own filter
//     puts away a group it has emptied.
//   - The drop: the shipped library builds the note's bubble linked to its
//     note, its circle centred on the drop point, its tail aimed at the
//     nearest drawing, and hands it to the item clipboard's InsertSet once
//     (one undo step) at its own origin.
//   - The wiring: the mode controller registers the left column's Document
//     Preferences tab, then the Specification tab, and the Specification
//     section after Model Layers; the config names this app's files only.
//
// USAGE:""", 1, 'test')
t = rep(t,
"""// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:""",
"""// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__SpecInlineEdit__.test.mjs
// - Source version: 1.0.0 (TrueVision3D v2.144.0, 22-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D """ + VVREL + """, with the Specification tab
// - Parity        : adapted
// - Divergences   :
//   - Banner and heading read ValeVision3D. The file is ValeVision__DrawingNotes__.json and its local
//     copy is served the way the Whitecardopedia server serves it (/Whitecardopedia/Projects/<folderId>/...);
//     the refusing server is the Whitecardopedia local server.
//   - A ValeVision region after TrueVision's cases (DESCRIPTION) proves package W2-35's acceptance.
// - Back-port     : the ValeVision region could join TrueVision's copy.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:""", 1, 'test')
t = rep(t, "fileName : 'TrueVision__DrawingNotes__.json'", "fileName : 'ValeVision__DrawingNotes__.json'", 1, 'test')
t = rep(t, "const REPO_URL = 'http://localhost:8090/na-project-portal/26-Projects/TT01__Test/30__TrueVision__AppContent/TrueVision__DrawingNotes__.json';",
        "const REPO_URL = 'http://localhost:8000/Whitecardopedia/Projects/2026/TT01__Test/ValeVision__DrawingNotes__.json';", 1, 'test')
t = rep(t, "location            : { origin : 'http://localhost:8090', hostname : 'localhost', port : '8090' },",
        "location            : { origin : 'http://localhost:8000', hostname : 'localhost', port : '8000' },", 1, 'test')
t = rep(t, "'the ProjectVision local server refused this write (405)'", "'the Whitecardopedia local server refused this write (405)'", 2, 'test')
t = rep(t, "console.log('\\nTrueVision3D - a specification note edited in the drawing\\n\\n  The save');",
        "console.log('\\nValeVision3D - a specification note edited in the drawing\\n\\n  The save');", 1, 'test')
REGION = open(os.path.join(HERE, 'test_vv_region.mjs.txt'), encoding='utf-8').read().replace('\r\n', '\n')
t = rep(t, "\nconsole.log('\\n  ' + (failures === 0 ? 'ALL PASSED' : failures + ' FAILED') + '\\n');",
        '\n' + REGION + "\nconsole.log('\\n  ' + (failures === 0 ? 'ALL PASSED' : failures + ' FAILED') + '\\n');", 1, 'test')
assert 'TrueVision__DrawingNotes' not in t and 'na-project-portal' not in t and '8090' not in t and 'ProjectVision' not in t and 'TrueVision__AppContent' not in t, 'test still names NA'
results[TEST] = t

# -----------------------------------------------------------------------------
# 7. The mode controller (hot file, CRLF preserved)
# -----------------------------------------------------------------------------
mc_path = os.path.join(VV, MC)
mc_bytes = open(mc_path, 'rb').read()
eol = '\r\n' if b'\r\n' in mc_bytes else '\n'
m = mc_bytes.decode('utf-8').replace('\r\n', '\n')
assert 'ScrapSpec' not in m, 'ModeController already carries the Specification tab'
L = lambda s: s  # readability
m = rep(m,
"""    import { Na__LePanelParam__RegisterLibrary, Na__LePanelParam__RegisterProperties } from '../57__Feature__ScrapbookParametric/Na__LayoutEditor__Panel__ScrapbookParametric__.js';
""",
"""    import { Na__LePanelParam__RegisterLibrary, Na__LePanelParam__RegisterProperties } from '../57__Feature__ScrapbookParametric/Na__LayoutEditor__Panel__ScrapbookParametric__.js';
    import { Na__LePanelScrapSpec__RegisterTab, Na__LePanelScrapSpec__Register } from '../58__Feature__ScrapbookSpecification/Na__LayoutEditor__Panel__ScrapbookSpecification__.js';
""", 1, 'MC import')
m = rep(m,
"""        // LEFT COLUMN | Sheet, then the three things a drawing is made of:
        // its own layers, the render composites that make its picture, and the
        // model categories that picture is allowed to see. Left to right is
        // "what is on the paper" against "what the selection's properties
        // are". Registration order is what orders a column, so these come
        // first even though only the sides say which column they land in.
        Na__LePanelSheet__Register();
""",
"""        // LEFT COLUMN | Two tabs, as the right column has: the document's own
        // preferences, and the project specification as bubbles to drag in.
        // Everything the column held before the tabs is on the first.
        Na__LePanels__RegisterTab('left', { id : 'document', title : Na__LeCfg__GetLabel('PanelTabDocument', 'Document Preferences'), hint : Na__LeCfg__GetLabel('PanelTabDocumentHint', 'The sheet, its notes margin, its layers and what its drawings show.') });   // <-- First, so every section that names no tab is on it
        Na__LePanelScrapSpec__RegisterTab();                                   // <-- The Specification tab: its one section below names it
        // DOCUMENT PREFERENCES | Sheet, then the three things a drawing is made of:
        // its own layers, the render composites that make its picture, and the
        // model categories that picture is allowed to see. Left to right is
        // now "what is on the paper" against "what the selection's properties
        // are", instead of layers on one side and everything else on the other.
        Na__LePanelSheet__Register();
""", 1, 'MC left tabs')
m = rep(m,
"""        Na__LePanelModelLayers__Register();
        // RIGHT COLUMN | Two tabs: the selected item's properties, and the scrapbooks
""",
"""        Na__LePanelModelLayers__Register();
        // THE SPECIFICATION TAB | The project's notes, each code in a bubble that is dragged onto the paper
        Na__LePanelScrapSpec__Register();
        // RIGHT COLUMN | Two tabs: the selected item's properties, and the scrapbooks
""", 1, 'MC register')
m = rep(m,
"""//                   1.18.2, 1.18.3, 1.18.4, 1.18.5, 1.18.6 and 1.18.7 entries name. Every other difference from that
""",
"""//                   1.18.2, 1.18.3, 1.18.4, 1.18.5, 1.18.6, 1.18.7 and 1.18.8 entries name. Every other difference from that
""", 1, 'MC source version')
m = rep(m, "//     design phases, note regions, the left column's two tabs, the\n",
        "//     design phases, note regions, the\n", 1, 'MC not yet taken')
m = rep(m,
"""// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.18.7 (the specification lockstep, {{VVREL:W2-31}})
""",
"""// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.18.8 (the left column's two tabs, """ + VVREL + """)
// - THE LEFT COLUMN HAS TWO TABS, Document Preferences and Specification, as
//   the right column has Properties and Scrapbook. Document Preferences is
//   registered first, so every section the column held stays on it; the
//   Specification tab follows at once, and its one section - the
//   Specification Scrapbook (58__Feature__ScrapbookSpecification), the
//   project's notes, each code in a bubble dragged onto the paper - is
//   registered after Model Layers. From TrueVision3D 1.20.0 (v2.91.0,
//   20-Sep-2026): TrueVision's import, lines and comments at this app's
//   sites; the drawing grid's and the site plan composites' lines between
//   them arrive with their own features. No try by Adam is recorded in
//   TrueVision for v2.91.0.
//
// 02-Oct-2026 - Version 1.18.7 (the specification lockstep, {{VVREL:W2-31}})
""", 1, 'MC log')
results[MC] = m.replace('\n', eol)

# -----------------------------------------------------------------------------
# Write
# -----------------------------------------------------------------------------
apply = '--apply' in sys.argv
snap_file = os.path.join(HERE, 'mc_snapshot.sha1')
if apply:
    want = open(snap_file).read().strip()
    have = hashlib.sha1(open(mc_path, 'rb').read()).hexdigest()
    assert want == have, 'ModeController changed since the snapshot: %s != %s' % (have, want)
    for rel in results:
        if rel != MC:
            assert not os.path.exists(os.path.join(VV, rel)), rel + ' already exists'
for rel, text in results.items():
    data = text.encode('utf-8')
    dest = os.path.join(VV if apply else OUT, rel)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    open(dest, 'wb').write(data)
    print(('APPLIED ' if apply else 'candidate ') + rel, len(data), 'B', text.count('\n'), 'lines', hashlib.sha1(data).hexdigest()[:8])
if not apply and not os.path.exists(snap_file):
    open(snap_file, 'w').write(hashlib.sha1(mc_bytes).hexdigest())
    print('snapshot', hashlib.sha1(mc_bytes).hexdigest())
