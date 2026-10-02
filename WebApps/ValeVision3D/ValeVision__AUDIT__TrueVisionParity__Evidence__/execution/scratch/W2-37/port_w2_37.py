"""W2-37 - Parametric Scrapbook engine and core types to TrueVision (read at b2aa9151).

    python port_w2_37.py --stage     build every file from TrueVision's bytes into staged/ (nothing live touched)
    python port_w2_37.py --apply     check the live files still match vv_before/, then write each staged file whole
    python port_w2_37.py --check     rebuild from TrueVision and compare with the landed bytes
    python port_w2_37.py --restore   put vv_before/ back (only files this package owns)

Whole-file takes are written LF, exactly as git show returns TrueVision's text (P18). Every seam is a named,
asserted substitution: a substitution that does not find its text stops the build.
"""
import hashlib, json, os, re, subprocess, sys

PIN = 'b2aa9151'
TVREPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TVAPP = 'na-apps/30__TrueVision__CoreAppCode/'
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE = os.path.dirname(os.path.abspath(__file__))
STAGED = os.path.join(HERE, 'staged')
BEFORE = os.path.join(HERE, 'vv_before')
WP = 'W2-37'
VVREL = '{{VVREL:' + WP + '}}'
TODAY = '02-Oct-2026'

LE = '02__Src__AppModules/51__System__LayoutEditor/'
P57 = LE + '57__Feature__ScrapbookParametric/'
P55 = LE + '55__Feature__Scrapbook/'
TST = '80__Testing__PrototypeEnvironment/'

ENGINE = P57 + 'Na__LayoutEditor__ScrapbookParametric__.js'
BAR = P57 + 'Na__LayoutEditor__ScrapbookParametric__ScaleBar__.js'
TITLE = P57 + 'Na__LayoutEditor__ScrapbookParametric__DrawingTitle__.js'
GRIPS = P57 + 'Na__LayoutEditor__ScrapbookParametric__Grips__.js'
NOODLE = P57 + 'Na__LayoutEditor__ScrapbookParametric__LinkNoodle__.js'
LINK = P57 + 'Na__LayoutEditor__ScrapbookParametric__ViewportLink__.js'
CSS = P57 + 'Na__LayoutEditor__Styles__ScrapbookParametric__.css'
CONFIG = P57 + 'Na__LayoutEditor__ScrapbookParametric__Config__.json'
TILE = P55 + 'Na__LayoutEditor__Scrapbook__TileDrag__.js'
T_BAR = TST + 'Na__Test__ScrapbookScaleBar__.test.mjs'
T_TITLE = TST + 'Na__Test__ScrapbookDrawingTitle__.test.mjs'
OWNED = [ENGINE, BAR, TITLE, GRIPS, NOODLE, LINK, CSS, CONFIG, TILE, T_BAR, T_TITLE]


def tv(path, rev=PIN):
    r = subprocess.run(['git', '-C', TVREPO, 'show', f'{rev}:{TVAPP}{path}'], capture_output=True)
    if r.returncode != 0:
        raise SystemExit(f'git show failed for {rev}:{path}: {r.stderr.decode(errors="replace")}')
    return r.stdout.decode('utf-8')


def sub_once(text, old, new, what):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f'SEAM NOT FOUND EXACTLY ONCE ({n}): {what}')
    return text.replace(old, new)


def banner(text, what):
    return sub_once(text, '// TRUEVISION3D - ', '// VALEVISION3D - ', what + ' banner')


def console(text, count, what):
    n = text.count('[TrueVision3D LayoutEditor]')
    if n != count:
        raise SystemExit(f'{what}: expected {count} console prefixes, found {n}')
    return text.replace('[TrueVision3D LayoutEditor]', '[ValeVision3D LayoutEditor]')


def port_note(text, lines, what):
    """Replace TrueVision's own PORT NOTE block (from its first line up to the blank '//' before the next rule)."""
    start = text.index('// PORT NOTE:\n')
    rule = text.index('\n//\n// ----', start)
    block = '\n'.join(lines)
    return text[:start] + block + text[rule:]


def note(*rows):
    return ['// PORT NOTE:'] + ['// ' + r if r else '//' for r in rows]


# -----------------------------------------------------------------------------
# The JavaScript modules
# -----------------------------------------------------------------------------

def build_engine():
    t = tv(ENGINE)
    t = banner(t, 'engine')
    t = console(t, 1, 'engine')
    t = sub_once(t,
                 "        const type = Na__LeModel__IsSitePlanSheet(sheet) ? Na__LeModel__DRAWING_SITEPLAN : Na__LeModel__DRAWING_ARCHITECTURAL;\n",
                 "        const type = 'architectural';                                            // <-- This app has the one drawing type: no sheet is a site plan\n",
                 'engine ElementsFor site-plan seam')
    t = port_note(t, note(
        '- Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__.js',
        '- Source version: 1.7.0 (TrueVision3D v2.134.0, 21-Sep-2026; read at b2aa9151)',
        f'- Ported on     : {TODAY} for ValeVision3D {VVREL}, the whole file. This app\'s copy before',
        '                  it was 1.0.0 (TrueVision\'s 1.2.0, ValeVision3D v2.68.0, 20-Sep-2026). 1.3.0',
        '                  (v2.96.0), 1.4.0 (v2.100.0), 1.5.0 (v2.122.0), 1.6.0 (v2.128.0) and 1.7.0',
        '                  (v2.134.0) are "NOT tried by Adam" in TrueVision: ported under DR-01 (c) and',
        '                  named for the Parity Scribe.',
        '- Parity        : adapted - TrueVision 1.7.0\'s code with the one seam below',
        '- Divergences   :',
        '  - Banner and console prefix read ValeVision3D.',
        '  - ElementsFor files every sheet as an architectural one (const type = \'architectural\'),',
        '    as this app\'s Na__LayoutEditor__Scrapbook__ does: site plans are dormant here (DR-08 (B)),',
        '    so no sheet is one. TrueVision asks Na__LeModel__IsSitePlanSheet; its three imports are',
        '    kept as TrueVision has them, unused.',
        '  - Until the panel 1.8.0 lands (W3-14) this app\'s panel (TrueVision\'s 1.2.0) registers the',
        '    scale bar and the drawing title only and hands SetTools no metricsReady, so Refit rebuilds',
        '    nothing yet and the 1.4.0, 1.6.0 and 1.7.0 hooks (choices, linkable, adopt, base) wait',
        '    for the types that use them (W2-38, W3-14).',
        '- Back-port     : none.',
    ), 'engine')
    return t


def build_bar():
    t = tv(BAR)
    t = banner(t, 'scale bar')
    if '[TrueVision3D' in t:
        raise SystemExit('scale bar: unexpected console output')
    t = port_note(t, note(
        '- Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__ScaleBar__.js',
        '- Source version: 1.1.0 (TrueVision3D v2.96.0, 20-Sep-2026; read at b2aa9151)',
        f'- Ported on     : {TODAY} for ValeVision3D {VVREL}, the whole file. This app\'s copy before',
        '                  it was 1.0.0 (ValeVision3D v2.68.0, 20-Sep-2026). TrueVision\'s v2.96.0 entry',
        '                  says "Adam has not tried it": ported under DR-01 (c) and named. The checker',
        '                  fill (#858585, v2.96.0) is a config value, ScaleBar__FillColour.',
        '- Parity        : verbatim',
        '- Divergences   :',
        '  - Banner reads ValeVision3D. (No console output in this file.)',
        '- Back-port     : none.',
    ), 'scale bar')
    return t


def build_title():
    t = tv(TITLE)
    t = banner(t, 'drawing title')
    if '[TrueVision3D' in t:
        raise SystemExit('drawing title: unexpected console output')
    t = port_note(t, note(
        '- Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__DrawingTitle__.js',
        '- Source version: 1.3.0 (TrueVision3D v2.122.0, 21-Sep-2026; read at b2aa9151)',
        f'- Ported on     : {TODAY} for ValeVision3D {VVREL}, the whole file, with the grips that',
        '                  import its PLACE_BELOW and PLACE_RIGHT. This app\'s copy before it was 1.0.0',
        '                  (ValeVision3D v2.68.0, 20-Sep-2026). 1.1.0 (v2.87.0), 1.2.0 (v2.96.0) and',
        '                  1.3.0 (v2.122.0) are not confirmed by Adam in TrueVision: ported under DR-01',
        '                  (c) and named. ViewLevel stays \'\' until the viewport identity module answers a',
        '                  storey (ViewportIdentity 1.1.0, W2-16), so every title reads as 1.0.0 wrote it.',
        '- Parity        : verbatim',
        '- Divergences   :',
        '  - Banner reads ValeVision3D. (No console output in this file.)',
        '- Back-port     : none.',
    ), 'drawing title')
    return t


def build_grips():
    t = tv(GRIPS)
    t = banner(t, 'grips')
    if '[TrueVision3D' in t:
        raise SystemExit('grips: unexpected console output')
    t = port_note(t, note(
        '- Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__Grips__.js',
        '- Source version: 1.6.0 (TrueVision3D v2.134.0, 21-Sep-2026; read at b2aa9151)',
        f'- Ported on     : {TODAY} for ValeVision3D {VVREL}, the whole file, with the drawing title',
        '                  1.3.0 whose PLACE_BELOW and PLACE_RIGHT it imports. This app\'s copy before',
        '                  it was 1.0.0 (TrueVision\'s 1.1.0, ValeVision3D v2.68.0, 20-Sep-2026). 1.2.0',
        '                  (v2.96.0), 1.3.0 (v2.100.0), 1.4.0 (v2.114.0), 1.5.0 (v2.128.0) and 1.6.0',
        '                  (v2.134.0) are not confirmed by Adam in TrueVision: ported under DR-01 (c)',
        '                  and named. It snaps through 28__System__ObjectSnap (W2-19); no Snapping__ seam.',
        '                  The corner and base grips wait for the cabinet infill (W2-38, W3-14).',
        '- Parity        : verbatim',
        '- Divergences   :',
        '  - Banner reads ValeVision3D. (No console output in this file.)',
        '- Back-port     : none.',
    ), 'grips')
    return t


def build_noodle():
    t = tv(NOODLE)
    t = banner(t, 'link noodle')
    if '[TrueVision3D' in t:
        raise SystemExit('link noodle: unexpected console output')
    t = port_note(t, note(
        '- Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__LinkNoodle__.js',
        '- Source version: 1.2.2 (TrueVision3D v2.138.0, 21-Sep-2026; read at b2aa9151)',
        f'- Ported on     : {TODAY} for ValeVision3D {VVREL}, the whole file. This app\'s copy before',
        '                  it was TrueVision\'s 1.2.0 (ValeVision3D v2.68.0) with the 1.2.1 chrome-slot',
        '                  hunk replayed by parity package W1-28. 1.2.1 (v2.106.0) records no try and',
        '                  1.2.2 (v2.138.0) is "NOT tried by Adam" in TrueVision: ported under DR-01 (c)',
        '                  and named. 1.2.2 reads a turned frame through the ViewportRotation leaf (W1-14);',
        '                  frames turn only once the rotation handles land (W3-06).',
        '- Parity        : verbatim',
        '- Divergences   :',
        '  - Banner reads ValeVision3D. (No console output in this file.)',
        '- Back-port     : none.',
    ), 'link noodle')
    return t


# TrueVision's 1.5.0 and 1.5.1 hunks, taken back out (W3-13 takes 1.5.1 whole). Each pair is (pin text, 1.4.0 text).
LINK_REVERTS = [
    ('dev log 1.5.1',
     '// 21-Sep-2026 - Version 1.5.1\n'
     '// - DistanceTo measures to the frame as it stands, turned\n'
     '//   (Viewport__RotationDeg) or not.\n'
     '//\n',
     ''),
    ('dev log 1.5.0',
     '// 21-Sep-2026 - Version 1.5.0\n'
     '// - Nearest leaves out a viewport on a REFERENCE layer (the Layers panel\'s\n'
     '//   Ref), so a scale bar or a title dropped beside one, or asked to Link to\n'
     '//   nearest, never binds to it: Adam wants nothing to "snap or bind to" a\n'
     '//   reference layer. The panel\'s list still offers it, and the noodle can\n'
     '//   still be dragged onto it - a link chosen by hand is the user\'s.\n'
     '//\n',
     ''),
    ('1.5.0 import IsLayerSelectable',
     '        Na__LeModel__IsLayerVisible,\n        Na__LeModel__IsLayerSelectable,\n',
     '        Na__LeModel__IsLayerVisible,\n'),
    ('1.5.1 import ViewportRotation',
     "    import { Na__LeVpRot__DistanceTo } from '../20__System__Viewports/Na__LayoutEditor__ViewportRotation__.js';   // <-- A leaf: distance to a turned frame\n",
     ''),
    ('1.5.1 DistanceTo body',
     '        return Na__LeVpRot__DistanceTo(viewport, pointMm);                       // <-- The frame as it stands, turned or not\n',
     '        const frame = viewport.Viewport__FrameMm || {};\n'
     '        const dx = Math.max(frame.X - pointMm.x, 0, pointMm.x - (frame.X + frame.WidthMm));\n'
     '        const dy = Math.max(frame.Y - pointMm.y, 0, pointMm.y - (frame.Y + frame.HeightMm));\n'
     '        return Math.hypot(dx, dy);\n'),
    ('1.5.0 Nearest comment',
     '    // see - nor to one on a reference layer, which nothing binds to. The\n'
     '    // panel\'s list and the noodle can still pick either by hand.\n'
     '    // maxDistanceMm defaults to the config\'s; pass Infinity to take the\n',
     '    // see. maxDistanceMm defaults to the config\'s; pass Infinity to take the\n'),
    ('1.5.0 Nearest test',
     '            if (!Na__LeModel__IsLayerVisible(sheet, viewport.Viewport__LayerId) || !Na__LeModel__IsLayerSelectable(sheet, viewport.Viewport__LayerId)) return;\n',
     '            if (!Na__LeModel__IsLayerVisible(sheet, viewport.Viewport__LayerId)) return;\n'),
]


def link_140(text):
    for what, old, new in LINK_REVERTS:
        text = sub_once(text, old, new, 'viewport link ' + what)
    return text


def build_link():
    t = link_140(tv(LINK))
    # Proof the result is TrueVision's 1.4.0: d76d7638 holds 1.4.0 + 1.5.0 and nothing later (git log at the pin).
    ref = tv(LINK, 'd76d7638')
    for what, old, new in LINK_REVERTS:
        if what.startswith('1.5.0') or what == 'dev log 1.5.0':
            ref = sub_once(ref, old, new, 'reference ' + what)
    if ref != t:
        raise SystemExit('viewport link: the 1.4.0 rebuild does not equal TrueVision d76d7638 less its 1.5.0 hunk')
    t = banner(t, 'viewport link')
    t = console(t, 3, 'viewport link')
    t = port_note(t, note(
        '- Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__ViewportLink__.js',
        '- Source version: 1.4.0 (TrueVision3D v2.122.0, 21-Sep-2026; read at b2aa9151 - TrueVision\'s',
        '                  1.5.1 there with the 1.5.0 and 1.5.1 hunks taken back out; equal to its',
        '                  commit d76d7638 less 1.5.0, so 1.4.0 exactly as TrueVision wrote it)',
        f'- Ported on     : {TODAY} for ValeVision3D {VVREL}, the whole 1.4.0 file. This app\'s copy',
        '                  before it was 1.0.0 (TrueVision\'s 1.2.0, ValeVision3D v2.68.0, 20-Sep-2026).',
        '                  1.3.0 (v2.87.0 ViewLevel; v2.100.0 linkable) and 1.4.0 (v2.122.0 Refit and the',
        '                  FactsPatch normalise fix) are not confirmed by Adam in TrueVision: ported under',
        '                  DR-01 (c) and named.',
        '- Parity        : adapted - TrueVision 1.4.0; 1.5.0 and 1.5.1 not yet taken',
        '- Divergences   :',
        '  - Banner and console prefix read ValeVision3D.',
        '  - Behind TrueVision by 1.5.0 (v2.123.0: Nearest leaves out a viewport on a reference',
        '    layer) and 1.5.1 (v2.138.0: DistanceTo through the ViewportRotation leaf). W3-13 takes',
        '    1.5.1 whole with the Layers panel\'s Ref switch; delete this line then.',
        '- Legacy        : TrueVision\'s DEVELOPMENT LOG, taken verbatim (DR-34), carries two 1.3.0 entries',
        '                  (20-Sep-2026 ViewLevel above 21-Sep-2026 linkable) - TrueVision\'s own numbering,',
        '                  kept as written.',
        '- Back-port     : none.',
    ), 'viewport link')
    return t


def build_tile():
    t = tv(TILE)
    t = banner(t, 'tile drag')
    t = console(t, 2, 'tile drag')
    t = port_note(t, note(
        '- Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/55__Feature__Scrapbook/Na__LayoutEditor__Scrapbook__TileDrag__.js',
        '- Source version: 1.2.0 (TrueVision3D v2.134.0, 21-Sep-2026; read at b2aa9151)',
        f'- Ported on     : {TODAY} for ValeVision3D {VVREL}, the whole file. This app\'s copy before',
        '                  it was 1.0.0 (ValeVision3D v2.68.0, 20-Sep-2026). 1.1.0 (v2.91.0, the caption)',
        '                  records no try and 1.2.0 (v2.134.0, hold and snap) is "NOT tried by Adam" in',
        '                  TrueVision: ported under DR-01 (c) and named. It snaps through',
        '                  28__System__ObjectSnap (W2-19); no Snapping__ seam.',
        '- Parity        : verbatim',
        '- Divergences   :',
        '  - Banner and console prefix read ValeVision3D.',
        '- Back-port     : none.',
    ), 'tile drag')
    return t


# -----------------------------------------------------------------------------
# The stylesheet
# -----------------------------------------------------------------------------

def build_css():
    t = tv(CSS)
    t = sub_once(t, '/* TRUEVISION3D - ', '/* VALEVISION3D - ', 'css banner')
    start = t.index(' * PORT NOTE:\n')
    end = t.index(' *\n * DEVELOPMENT LOG:', start)
    rows = [
        ' * PORT NOTE:',
        ' * - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__Styles__ScrapbookParametric__.css',
        ' * - Source version: 1.3.0 (TrueVision3D v2.134.0, 21-Sep-2026; read at b2aa9151)',
        f' * - Ported on     : {TODAY} for ValeVision3D {VVREL}, the whole sheet, still linked by',
        ' *                   Na__LayoutEditor__Panel__ScrapbookParametric__ itself. This app\'s copy before',
        ' *                   it was 1.0.0 (ValeVision3D v2.68.0, 20-Sep-2026). 1.1.0 (v2.96.0), 1.2.0',
        ' *                   (v2.128.0) and 1.3.0 (v2.134.0) are not confirmed by Adam in TrueVision:',
        ' *                   ported under DR-01 (c) and named.',
        ' * - Parity        : verbatim',
        ' * - Divergences   :',
        ' *   - Banner reads ValeVision3D.',
        ' * - Back-port     : none.',
    ]
    return t[:start] + '\n'.join(rows) + '\n' + t[end:]


# -----------------------------------------------------------------------------
# The two tests
# -----------------------------------------------------------------------------

def test_note(t, rows, what):
    anchor = '// -----------------------------------------------------------------------------\n//\n// DEVELOPMENT LOG:\n'
    block = '\n'.join(note(*rows)) + '\n//\n'
    return sub_once(t, anchor, '// -----------------------------------------------------------------------------\n//\n' + block + anchor, what + ' port note')


def build_t_bar():
    t = tv(T_BAR)
    t = banner(t, 'scale bar test')
    t = sub_once(t, "console.log('\\nTrueVision3D - parametric scale bar\\n');", "console.log('\\nValeVision3D - parametric scale bar\\n');", 'scale bar test title')
    t = test_note(t, [
        '- Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__ScrapbookScaleBar__.test.mjs',
        '- Source version: 1.0.0 (TrueVision3D v2.96.0, 20-Sep-2026 - the checker fill #858585, unlogged in',
        '                  the file; read at b2aa9151)',
        f'- Ported on     : {TODAY} for ValeVision3D {VVREL}, with the scale bar 1.1.0 and the config',
        '                  fill. This app\'s copy before it was TrueVision\'s 1.0.0 with #666666',
        '                  (ValeVision3D v2.68.0, 20-Sep-2026).',
        '- Parity        : verbatim - every check is TrueVision\'s, run against this app\'s own module',
        '                  and config. The fixtures are TrueVision project sheets (PS02): they are what',
        '                  the house style was measured from.',
        '- Divergences   :',
        '  - Banner and the printed title read ValeVision3D.',
        '- Back-port     : none.',
    ], 'scale bar test')
    return t


def build_t_title():
    t = tv(T_TITLE)
    t = banner(t, 'drawing title test')
    t = sub_once(t, "console.log('TrueVision3D - parametric scrapbook drawing title');", "console.log('ValeVision3D - parametric scrapbook drawing title');", 'drawing title test title')
    t = test_note(t, [
        '- Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__ScrapbookDrawingTitle__.test.mjs',
        '- Source version: 1.3.0 (TrueVision3D v2.122.0, 21-Sep-2026; read at b2aa9151)',
        f'- Ported on     : {TODAY} for ValeVision3D {VVREL}, with the drawing title 1.3.0. This',
        '                  app\'s copy before it was TrueVision\'s 1.0.0 (ValeVision3D v2.68.0, 20-Sep-2026).',
        '- Parity        : verbatim - every check is TrueVision\'s, run against this app\'s own modules',
        '                  and config. The fixtures are TrueVision project sheets (PS02, RB05): they are',
        '                  what the house style was measured from.',
        '- Divergences   :',
        '  - Banner and the printed title read ValeVision3D.',
        '- Back-port     : none.',
    ], 'drawing title test')
    return t


# -----------------------------------------------------------------------------
# The config: TrueVision's file, less the blocks of the types this app does not register yet
# -----------------------------------------------------------------------------

LATER_BLOCKS = ['ProjectQr', 'AreaSchedule', 'CabinetInfill', 'SiteLegend']
LATER_ELEMENTS = ['ProjectPortalCompact', 'ProjectPortalFull', 'AreaScheduleRooms', 'AreaScheduleGroups', 'AreaScheduleProject', 'CabinetInfill', 'SiteLegend']
LATER_LABEL = re.compile(r'^        "Labels__(Props|Menu)(Qr|Area|Infill|Legend)\w*"\s*:')
VV_WORDED = ['DrawingTitle__PhaseModeNote', 'Labels__PropsPhaseAuto', 'Labels__PropsTitleNamed', 'ScaleBar__MenuScaleNote']
JSTR = r'"(?:[^"\\]|\\.)*"'

PORTED_FROM = (
    'TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/'
    'Na__LayoutEditor__ScrapbookParametric__Config__.json, Meta 1.8.0 (TrueVision3D v2.164.0, 29-Sep-2026; read at '
    'HEAD b2aa9151), ported 02-Oct-2026 (parity package W2-37) for the types this app registers: the scale bar, the '
    'drawing title (with the bar to the right and the 5 mm underline rule), the viewport link, the grips and the link '
    'noodle. Every key, number and colour of those is TrueVision\'s, the checker fill #858585 included. Not here yet: '
    'the ProjectQr, AreaSchedule, CabinetInfill and SiteLegend blocks, their tiles, type names, Meta notes and labels, '
    'which come with their types (W2-38, W2-39, W3-14). This app\'s own words: DrawingTitle__PhaseModeNote, '
    'Labels__PropsPhaseAuto, Labels__PropsTitleNamed, the Drawing Title + Scale Bar tile\'s description and the '
    'title tiles\' previews without a phase (one model per project, so no phase is read), and '
    'ScaleBar__MenuScaleNote. The notes that cite PS01, PS02 and RB05 are TrueVision\'s measurements, kept as the '
    'record of how each number was chosen.'
)


def vv_raw_value(vvtext, key):
    m = re.search(r'^\s*"' + re.escape(key) + r'"\s*:\s*(' + JSTR + ')', vvtext, re.M)
    if not m:
        raise SystemExit('config: VV value not found for ' + key)
    return m.group(1)


def set_raw_value(text, key, raw):
    pat = re.compile(r'^(\s*"' + re.escape(key) + r'"\s*:\s*)(' + JSTR + ')', re.M)
    hits = pat.findall(text)
    if len(hits) != 1:
        raise SystemExit(f'config: key {key} found {len(hits)} times')
    return pat.sub(lambda m: m.group(1) + raw, text)


def drop_block(lines, name):
    head = f'    "LayoutEditor__ScrapbookParametric__{name}": {{'
    i = lines.index(head)
    j = i
    while lines[j] != '    },':
        j += 1
    if lines[j + 1] != '':
        raise SystemExit('config: no blank line after block ' + name)
    return lines[:i] + lines[j + 2:]


def drop_element(lines, element_id):
    idline = [k for k, l in enumerate(lines) if re.match(r'^\s*"Element__Id"\s*:\s*"' + re.escape(element_id) + '"', l)]
    if len(idline) != 1:
        raise SystemExit('config: element not found once: ' + element_id)
    k = idline[0]
    i = k
    while lines[i].strip() != '{':
        i -= 1
    j = k
    while not lines[j].startswith('            }'):
        j += 1
    return lines[:i] + lines[j + 1:]


def build_config():
    tvtext = tv(CONFIG)
    vvtext = open(os.path.join(BEFORE, os.path.basename(CONFIG)), encoding='utf-8').read().replace('\r\n', '\n')
    lines = tvtext.split('\n')

    # Meta: no Portal or Infill notes yet; a PortedFrom line after the author.
    for key in ('Meta__Portal', 'Meta__Infill'):
        idx = [k for k, l in enumerate(lines) if l.startswith(f'        "{key}"')]
        if len(idx) != 1:
            raise SystemExit('config: ' + key)
        del lines[idx[0]]
    k = [i for i, l in enumerate(lines) if l.startswith('        "Meta__BarRight"')][0]
    if lines[k + 1] != '    },' or not lines[k].endswith('",'):
        raise SystemExit('config: Meta__BarRight is not the last Meta line')
    lines[k] = lines[k][:-1]
    k = [i for i, l in enumerate(lines) if l.startswith('        "Meta__Author"')][0]
    lines.insert(k + 1, '        "Meta__PortedFrom"  : ' + json.dumps(PORTED_FROM, ensure_ascii=False) + ',')

    # Elements: the later tiles out, the type names they bring out.
    for element_id in LATER_ELEMENTS:
        lines = drop_element(lines, element_id)
    k = [i for i, l in enumerate(lines) if '"Element__Type"        : "ScaleBar"' in l][0]
    if lines[k + 3] != '            },' or lines[k + 4] != '        ]':
        raise SystemExit('config: the scale bar tile is not the last')
    lines[k + 3] = '            }'
    k = [i for i, l in enumerate(lines) if l.startswith('        "Elements__TypeNames"')]
    if len(k) != 1:
        raise SystemExit('config: TypeNames')
    lines[k[0]] = '        "Elements__TypeNames"   : { "ScaleBar" : "Scale Bar", "DrawingTitle" : "Drawing Title" },'

    # The later types' blocks.
    for name in LATER_BLOCKS:
        lines = drop_block(lines, name)

    # Their labels, and the blank line a removed group leaves doubled.
    lines = [l for l in lines if not LATER_LABEL.match(l)]
    out = []
    for l in lines:
        if l == '' and out and out[-1] == '':
            continue
        out.append(l)
    text = '\n'.join(out)

    # This app's words.
    for key in VV_WORDED:
        text = set_raw_value(text, key, vv_raw_value(vvtext, key))
    tv_desc = re.search(r'"Element__Id"\s*:\s*"DrawingTitleWithBar",\n(?:.*\n){2}\s*"Element__Description"\s*:\s*(' + JSTR + ')', tvtext).group(1)
    vv_desc = re.search(r'"Element__Id"\s*:\s*"DrawingTitleWithBar",\n(?:.*\n){2}\s*"Element__Description"\s*:\s*(' + JSTR + ')', vvtext).group(1)
    text = sub_once(text, tv_desc, vv_desc, 'config DrawingTitleWithBar description')
    for old, new in [
        ('"Element__PreviewParams" : { "ViewKind" : "elevation", "ViewPhase" : "existing", "ViewFacing" : "East" }',
         '"Element__PreviewParams" : { "ViewKind" : "elevation", "ViewFacing" : "East" }'),
        ('"Element__PreviewParams" : { "ViewKind" : "elevation", "ViewPhase" : "proposed", "ViewFacing" : "South", "BarOffsetMm" : 70 }',
         '"Element__PreviewParams" : { "ViewKind" : "elevation", "ViewFacing" : "South", "BarOffsetMm" : 70 }'),
        ('"Element__PreviewParams" : { "ViewKind" : "elevation", "ViewPhase" : "proposed", "ViewFacing" : "North" }',
         '"Element__PreviewParams" : { "ViewKind" : "elevation", "ViewFacing" : "North" }'),
    ]:
        text = sub_once(text, old, new, 'config preview ' + old[40:80])
    json.loads(text)
    return text


BUILDERS = {
    ENGINE: build_engine, BAR: build_bar, TITLE: build_title, GRIPS: build_grips, NOODLE: build_noodle,
    LINK: build_link, CSS: build_css, CONFIG: build_config, TILE: build_tile, T_BAR: build_t_bar, T_TITLE: build_t_title,
}


def live(path):
    return os.path.join(VV, path.replace('/', os.sep))


def sha(b):
    return hashlib.sha256(b).hexdigest()


def stage():
    os.makedirs(STAGED, exist_ok=True)
    for path in OWNED:
        data = BUILDERS[path]().encode('utf-8')
        if b'\r' in data:
            raise SystemExit('CR in staged ' + path)
        open(os.path.join(STAGED, os.path.basename(path)), 'wb').write(data)
        print(f'staged {os.path.basename(path):62s} {len(data):>7} bytes  sha {sha(data)[:12]}')


def apply():
    for path in OWNED:
        now = open(live(path), 'rb').read()
        was = open(os.path.join(BEFORE, os.path.basename(path)), 'rb').read()
        if now != was:
            raise SystemExit('CHANGED UNDER ME (stop): ' + path)
    for path in OWNED:
        data = open(os.path.join(STAGED, os.path.basename(path)), 'rb').read()
        with open(live(path), 'wb') as f:
            f.write(data)
        print('landed', path, len(data), sha(data)[:12])


def check():
    bad = 0
    for path in OWNED:
        want = BUILDERS[path]().encode('utf-8')
        got = open(live(path), 'rb').read()
        ok = want == got
        bad += not ok
        print('ok  ' if ok else 'DIFF', path)
    print('CHECK PASS' if not bad else f'CHECK FAIL ({bad})')
    return bad


def restore():
    for path in OWNED:
        data = open(os.path.join(BEFORE, os.path.basename(path)), 'rb').read()
        with open(live(path), 'wb') as f:
            f.write(data)
        print('restored', path)


if __name__ == '__main__':
    arg = sys.argv[1] if len(sys.argv) > 1 else '--stage'
    {'--stage': stage, '--apply': apply, '--check': lambda: sys.exit(check()), '--restore': restore}[arg]()
