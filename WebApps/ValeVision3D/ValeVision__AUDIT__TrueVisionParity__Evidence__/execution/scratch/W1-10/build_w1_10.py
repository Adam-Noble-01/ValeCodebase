"""Scratch (W1-10, never shipped): build the six W1-10 files from TrueVision's bytes at the pin.

Every seam is an exact byte replacement asserted to match ONCE. TrueVision is read only with
`git show b2aa9151:<path>` (blob ids asserted); the two ValeVision files this package builds on
(the AppConfig, for the label union, and its old stylesheet, for the Compass Preset Strip region)
are read from the live tree and hash-checked against the copy this package read on 02-Oct-2026.

Usage:
    python -B build_w1_10.py            write the candidates to ./candidates/<app-relative path>
    python -B build_w1_10.py --verify   prove live == candidate, and that reversing every seam on the
                                        live files gives TrueVision's bytes back (the AppConfig: the
                                        union rules instead), then exit 0 / 1
"""
import hashlib, json, os, subprocess, sys

HERE   = os.path.dirname(os.path.abspath(__file__))
APP    = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
NAWEB  = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN    = 'b2aa9151'
TVAPP  = 'na-apps/30__TrueVision__CoreAppCode/'
ELEV   = '02__Src__AppModules/45__System__ElevationViews/'
CAND   = os.path.join(HERE, 'candidates')

REL_AUTONAMETEXT = ELEV + 'Na__Elevation__AutoNameText__.js'
REL_AUTONAME     = ELEV + 'Na__Elevation__AutoName__.js'
REL_DATA         = ELEV + 'Na__Elevation__ProjectJson__Data__.js'
REL_CONFIG       = ELEV + 'Na__Elevation__AppConfig__.json'
REL_CSS          = ELEV + 'Na__Elevation__Styles__DevMenu__.css'
REL_TEST         = '80__Testing__PrototypeEnvironment/Na__Test__ElevationGeometry__.html'

TV_BLOBS = {                                                     # git rev-parse b2aa9151:<path>, read 02-Oct-2026
    REL_AUTONAMETEXT : '33ac1ea92c1d69651093f6bd175da4af1197e905',
    REL_AUTONAME     : '0805958d8c9965a7b384efa3a602d4cecc2e6125',
    REL_DATA         : '1b7f656bc3ea2709164a0e7eb977a2d7a6d7cce1',
    REL_CONFIG       : '1b6709ff621e71c327e4a3e3b1165ada7f8f989a',
    REL_CSS          : 'fc4bf1b2fad1cca5a2eae5a7ec73b06e96e6a16c',
    REL_TEST         : '9633b0d0a9d9ba16cc16d859118993c6fbf413eb',
}
VV_PRE_SHA1 = {                                                  # the live files as this package read them
    REL_DATA   : '62ffc7d0cdb5',
    REL_CONFIG : '22a5a109c54b',
    REL_CSS    : '91661ae74b01',
}
VVREL = '{{VVREL:W1-10}}'
RULE  = '// -----------------------------------------------------------------------------'


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

def tv_text(rel):
    spec = PIN + ':' + TVAPP + rel
    blob = subprocess.run(['git', '-C', NAWEB, 'rev-parse', spec], capture_output=True, check=True).stdout.decode().strip()
    assert blob == TV_BLOBS[rel], 'TV blob changed for %s: %s' % (rel, blob)
    raw = subprocess.run(['git', '-C', NAWEB, 'show', spec], capture_output=True, check=True).stdout
    assert b'\r' not in raw, rel
    return raw.decode('utf-8')

def live_path(rel):
    return os.path.join(APP, rel.replace('/', os.sep))

def vv_pre_text(rel):
    raw = open(live_path(rel), 'rb').read()
    sha = hashlib.sha1(raw).hexdigest()[:12]
    if sha != VV_PRE_SHA1[rel]:
        # After landing the live file is the candidate; the pre-image is kept in ./preimage.
        pre = os.path.join(HERE, 'preimage', rel.replace('/', os.sep))
        raw = open(pre, 'rb').read()
        assert hashlib.sha1(raw).hexdigest()[:12] == VV_PRE_SHA1[rel], 'pre-image of %s is not the copy read' % rel
    assert b'\r' not in raw, rel
    return raw.decode('utf-8')

def once(text, old, new, label):
    count = text.count(old)
    assert count == 1, '%s: expected the anchor once, found %d' % (label, count)
    return text.replace(old, new)


# -----------------------------------------------------------------------------
# The seams, as (label, TrueVision text, ValeVision text) - reversible
# -----------------------------------------------------------------------------

def seams_autonametext():
    note_tv = (
        '// PORT NOTE:\n'
        '// - Authored in   : TrueVision3D first (20-Sep-2026)\n'
        '// - ValeVision    : not yet ported (ValeVision has no north system).\n')
    note_vv = (
        '// PORT NOTE:\n'
        '// - Ported from   : TrueVision3D 02__Src__AppModules/45__System__ElevationViews/Na__Elevation__AutoNameText__.js\n'
        '// - Source version: 1.0.0 (TrueVision3D v2.86.0, 20-Sep-2026; read at b2aa9151)\n'
        '// - Ported on     : 02-Oct-2026 for ValeVision3D ' + VVREL + ', with Na__Elevation__AutoName__. TrueVision\'s\n'
        '//                   own note said "not yet ported (ValeVision has no north system)"; this app has had its\n'
        '//                   north since v2.67.0. It comes across under DR-01 (c), and v2.86.0 is named as not yet\n'
        '//                   confirmed by Adam in TrueVision.\n'
        '// - Parity        : verbatim. Pure and imports nothing: its callers here are Na__Elevation__AutoName__\n'
        '//                   (inert until the Elevations Dev menu 2.1.0, W2-05) and the drawing-drafts test named\n'
        '//                   under INTEGRATION.\n'
        '// - Divergences   :\n'
        '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
        '// - Back-port     : none (TrueVision\'s "not yet ported" line is stale: a records item for the\n'
        '//                   TrueVision lane, WT-08).\n')
    return [
        ('banner', '// TRUEVISION3D - ELEVATION VIEWS - AUTO NAME TEXT\n', '// VALEVISION3D - ELEVATION VIEWS - AUTO NAME TEXT\n'),
        ('port note', note_tv, note_vv),
    ]


def seams_autoname():
    note_tv = (
        '// PORT NOTE:\n'
        '// - Authored in   : TrueVision3D first (20-Sep-2026)\n'
        '// - ValeVision    : not yet ported (ValeVision has no north system).\n')
    note_vv = (
        '// PORT NOTE:\n'
        '// - Ported from   : TrueVision3D 02__Src__AppModules/45__System__ElevationViews/Na__Elevation__AutoName__.js\n'
        '// - Source version: 1.0.0 (TrueVision3D v2.86.0, 20-Sep-2026; read at b2aa9151)\n'
        '// - Ported on     : 02-Oct-2026 for ValeVision3D ' + VVREL + ', with Na__Elevation__AutoNameText__ and the\n'
        '//                   elevation data module 1.1.0. TrueVision\'s own note said "not yet ported (ValeVision has\n'
        '//                   no north system)"; this app has had its north since v2.67.0 (46__System__NorthDirection).\n'
        '//                   It comes across under DR-01 (c), and v2.86.0 is named as not yet confirmed by Adam in\n'
        '//                   TrueVision.\n'
        '// - Parity        : verbatim, and inert: nothing in ValeVision calls it until the Elevations Dev menu\n'
        '//                   2.1.0 (editor and row builders, W2-05) replaces this app\'s 1.x editor, which still\n'
        '//                   names elevations by hand. Until then no record here carries Elevation__NameIsAuto, and\n'
        '//                   the Layout Editor\'s viewport identity (1.0.0 here; 1.1.0, which reads the flag, comes\n'
        '//                   with W2-10) titles every elevation exactly as before.\n'
        '// - Divergences   :\n'
        '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
        '// - Back-port     : none (TrueVision\'s "not yet ported" line is stale: a records item for the\n'
        '//                   TrueVision lane, WT-08).\n')
    return [
        ('banner', '// TRUEVISION3D - ELEVATION VIEWS - AUTO NAME\n', '// VALEVISION3D - ELEVATION VIEWS - AUTO NAME\n'),
        ('port note', note_tv, note_vv),
    ]


def seams_data():
    note = (
        '// PORT NOTE:\n'
        '// - Ported from   : TrueVision3D 02__Src__AppModules/45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js\n'
        '// - Source version: 1.1.0 (TrueVision3D v2.94.0, 20-Sep-2026; read at b2aa9151)\n'
        '// - Ported on     : 02-Oct-2026 for ValeVision3D ' + VVREL + ', whole. First ported 09-Sep-2026 for\n'
        '//                   ValeVision3D v2.19.0 (port Phase 3) as this app\'s 1.1.0 - records in the drawings block,\n'
        '//                   styles, exclusions, the asset slot and face-pick provenance - then 1.1.1 (10-Sep-2026:\n'
        '//                   projected linework off on a new drawing, which TrueVision\'s defaults say too). v2.94.0,\n'
        '//                   the depth fog, is not yet confirmed by Adam in TrueVision; it comes across under\n'
        '//                   DR-01 (c), and nothing draws the fog until W2-03.\n'
        '// - Parity        : adapted. TrueVision\'s code and its first-argument convention: sceneConfig is the\n'
        '//                   presentation block, read only to find a drawing\'s scene, and the records are read from\n'
        '//                   LayoutEditor__DrawingsData through Na__DrawData__GetElevationsArray. The normaliser and\n'
        '//                   the creator write Elevation__DepthFog, switched off, onto a record that has none\n'
        '//                   (49__System__ElevationDepthFog). DESCRIPTION and INTEGRATION are TrueVision\'s verbatim\n'
        '//                   and still describe its storage before v2.21.0 (records nested in the presentation block,\n'
        '//                   three dev-owned key lists, the whole presentation block saved): in both apps the records\n'
        '//                   live in LayoutEditor__DrawingsData and are saved by Na__DrawData__Save, and in ValeVision\n'
        '//                   that block is on the one ProjectData__EditorOwnedKeys list. Na__ElevData__ELEVATIONS_KEY\n'
        '//                   is TrueVision\'s value, the old nested key; nothing in ValeVision imports it.\n'
        '// - Divergences   :\n'
        '//   - Banner reads ValeVision3D. (No console output in this file.)\n'
        '//   - Na__ElevData__STYLE_KEYS is exported (K2 X2): this app\'s per-drawing style rows keep it (DR-32, D33).\n'
        '//   - Na__ElevData__SetAzimuthDeg and Na__ElevData__SetSeededFrom, with the two constants the second\n'
        '//     needs, are this app\'s (K2 X2), kept only because its pre-2.1.0 Elevations Dev menu editor still\n'
        '//     imports them (Pick Face, Re-pick, a change of direction) - retire with W2-05 (R0.2.11 Q-AZIMUTH (b),\n'
        '//     R6 F.8 C20). Their region sits just above Module Exports.\n'
        '//   - Elevation__SeededFrom (this app\'s record key, DR-32) is no longer written on read or on create -\n'
        '//     TrueVision\'s normaliser and creator do not know it - but a value already on a record stays on the\n'
        '//     live record, so every read and save keeps it. Only SetSeededFrom writes it now - retire with W2-05.\n'
        '// - Back-port     : TrueVision\'s DESCRIPTION and INTEGRATION still describe the storage before v2.21.0\n'
        '//                   (a records item for the TrueVision lane, WT-08). Otherwise none.\n'
        '//\n' + RULE + '\n'
        '//\n')
    vv_region = (
        '// -----------------------------------------------------------------------------\n'
        '// REGION | ValeVision Only - Two Setters Its Pre-2.1.0 Dev Menu Editor Imports (Retire With W2-05)\n'
        '// -----------------------------------------------------------------------------\n'
        '\n'
        '    // MODULE CONSTANTS | Seeding Provenance (Elevation__SeededFrom, This App\'s Own Record Key)\n'
        '    // ------------------------------------------------------------\n'
        '    // How a record was first aimed: \'facepick\', \'preset\' or \'manual\'. A value\n'
        '    // already on a record is kept (DR-32); only the setter below writes one -\n'
        '    // the normaliser and the creator above do not.\n'
        '    // ------------------------------------------------------------\n'
        '    const Na__ElevData__F_SEEDED_FROM = \'Elevation__SeededFrom\';\n'
        '    const Na__ElevData__SEEDED_VALUES = Object.freeze([\'facepick\', \'preset\', \'manual\']);\n'
        '    // ------------------------------------------------------------\n'
        '\n'
        '\n'
        '    // FUNCTION | Set the Azimuth Directly (wrapped, whole degrees)\n'
        '    // ------------------------------------------------------------\n'
        '    function Na__ElevData__SetAzimuthDeg(elevation, degrees) {\n'
        '        if (!elevation || !Number.isFinite(degrees)) return false;\n'
        '        elevation[Na__ElevData__F_AZIMUTH] = Na__ElevData__WrapAzimuth(Math.round(degrees));\n'
        '        return true;\n'
        '    }\n'
        '    // ------------------------------------------------------------\n'
        '\n'
        '\n'
        '    // FUNCTION | Record How an Elevation Was Seeded (informational)\n'
        '    // ------------------------------------------------------------\n'
        '    function Na__ElevData__SetSeededFrom(elevation, source) {\n'
        '        if (!elevation) return false;\n'
        '        elevation[Na__ElevData__F_SEEDED_FROM] = (Na__ElevData__SEEDED_VALUES.indexOf(source) !== -1) ? source : \'manual\';\n'
        '        return true;\n'
        '    }\n'
        '    // ------------------------------------------------------------\n'
        '\n'
        '// endregion -------------------------------------------------------------------\n'
        '\n'
        '\n')
    exports_tv = '        Na__ElevData__GetDimensions\n    };\n'
    exports_vv = (
        '        Na__ElevData__GetDimensions,\n'
        '        Na__ElevData__STYLE_KEYS,                                            // <-- ValeVision only (DR-32 D33, K2 X2)\n'
        '        Na__ElevData__SetAzimuthDeg,                                         // <-- ValeVision only: retire with W2-05 (Q-AZIMUTH, F.8 C20)\n'
        '        Na__ElevData__SetSeededFrom                                          // <-- ValeVision only: retire with W2-05 (DR-32, F.8 C20)\n'
        '    };\n')
    region_anchor = '// -----------------------------------------------------------------------------\n// REGION | Module Exports\n'
    log_anchor    = '//\n' + RULE + '\n//\n// DEVELOPMENT LOG:\n'
    return [
        ('banner', '// TRUEVISION3D - ELEVATION VIEWS - PROJECT DATA\n', '// VALEVISION3D - ELEVATION VIEWS - PROJECT DATA\n'),
        ('port note', log_anchor, '//\n' + RULE + '\n//\n' + note + '// DEVELOPMENT LOG:\n'),
        ('vv-only region', region_anchor, vv_region + region_anchor),
        ('vv-only exports', exports_tv, exports_vv),
    ]


def seams_css(vv_old_css):
    # The Compass Preset Strip region, word for word from this app's sheet as it stood (lines 26-47).
    start = vv_old_css.index('/* ----------------------------------------------------------------- */\n/* REGION  |  Compass Preset Strip ')
    end   = vv_old_css.index('/* endregion ------------------------------------------------------- */\n', start) + len('/* endregion ------------------------------------------------------- */\n')
    compass = vv_old_css[start:end]
    header_end = '/* REGION  |  Compass Preset Strip                                   */\n/* ----------------------------------------------------------------- */\n'
    assert compass.count(header_end) == 1
    compass = compass.replace(header_end, header_end + (
        '/* ValeVision3D only (see the PORT NOTE): the 1.x Elevations Dev menu still\n'
        '   draws the N / E / S / W strip. It goes with W2-05. */\n'))
    narrow_vv = (
        '    /* Two rows of two rather than four squeezed buttons. */\n'
        '    .na-elev-dev__compass {\n'
        '        grid-template-columns          : repeat(2, 1fr);\n'
        '    }\n'
        '\n')
    assert vv_old_css.count(narrow_vv) == 1, 'the old narrow rule moved'
    note = (
        '/*\n'
        ' * PORT NOTE:\n'
        ' * - Ported from   : TrueVision3D 02__Src__AppModules/45__System__ElevationViews/Na__Elevation__Styles__DevMenu__.css\n'
        ' * - Source version: none of its own - the sheet as TrueVision3D v2.86.0 left it, with its Name, and Which\n'
        ' *                   Elevation This Is region (20-Sep-2026, commit bef15277; read at b2aa9151)\n'
        ' * - Ported on     : 02-Oct-2026 for ValeVision3D ' + VVREL + ', whole; first ported 09-Sep-2026 for\n'
        ' *                   ValeVision3D v2.19.0 (port Phase 3)\n'
        ' * - Parity        : adapted. The identity region styles nothing yet: its classes arrive with the 2.1.0\n'
        ' *                   row builders (W2-05). The Carousel Card Status rules are also in\n'
        ' *                   40__System__DrawingViewCore/Na__DrawView__Styles__DevMenu__.css, word for word and\n'
        ' *                   imported after this sheet, as in TrueVision.\n'
        ' * - Divergences   :\n'
        ' *   - Banner reads ValeVision3D.\n'
        ' *   - The Compass Preset Strip region and its narrow-panel rule are this app\'s: its 1.x Elevations Dev\n'
        ' *     menu still draws the N / E / S / W strip that TrueVision replaced with the identity region on\n'
        ' *     20-Sep-2026. Retire with W2-05, whose row builders draw that region.\n'
        ' * - Legacy        : TrueVision\'s copy of this sheet has no module version, so the Source version names\n'
        ' *                   the release and the commit instead.\n'
        ' * - Back-port     : none.\n'
        ' */\n')
    header_close = ' the derived cut readout.\n */\n/* ================================================================= */\n'
    sliders = '/* ----------------------------------------------------------------- */\n/* REGION  |  Drawing Plane Sliders                                  */\n'
    media   = '@media (max-width: 520px) {\n\n'
    return [
        ('banner', '/* REGION  |  TrueVision3D - Elevation Dev Menu Styles              */\n',
                   '/* REGION  |  ValeVision3D - Elevation Dev Menu Styles              */\n'),
        ('port note', header_close, header_close + note),
        ('compass region', sliders, compass + '\n\n' + sliders),
        ('compass narrow rule', media, media + narrow_vv),
    ]


def seams_test():
    header = (
        '<!-- =============================================================================\n'
        '     VALEVISION3D - TEST HARNESS - ELEVATION GEOMETRY\n'
        '     =============================================================================\n'
        '\n'
        '     FILE    : Na__Test__ElevationGeometry__.html\n'
        '\n'
        '     PORT NOTE:\n'
        '     - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__ElevationGeometry__.html\n'
        '     - Source version: none of its own - the page as TrueVision3D v2.20.0 left it (10-Sep-2026, commit\n'
        '                       e654e8f7, three r184 vendored; read at b2aa9151)\n'
        '     - Ported on     : 02-Oct-2026 for ValeVision3D ' + VVREL + '\n'
        '     - Parity        : verbatim, every check. It drives the REAL elevation modules - the data module 1.1.0\n'
        '                       (TrueVision\'s first-argument convention: the empty sceneConfig it passes is ignored\n'
        '                       and its records land in the drawings block, in memory only), the config, the\n'
        '                       ortho camera and the framing - over this app\'s own three r184.\n'
        '     - Divergences   :\n'
        '       - This header block (TrueVision\'s page has none); the title reads ValeVision3D; the import-map\n'
        '         note names this app\'s index.html.\n'
        '     - Legacy        : TrueVision\'s page has no version of its own, so the Source version names the\n'
        '                       release and the commit instead.\n'
        '     - Back-port     : none.\n'
        '\n'
        '     HOW TO SERVE IT:\n'
        '     - On the Whitecardopedia Flask server (WebApps/Whitecardopedia/server.py, port 8000):\n'
        '       http://localhost:8000/ValeVision3D/80__Testing__PrototypeEnvironment/Na__Test__ElevationGeometry__.html\n'
        '       It reads the app\'s modules and the elevation config, and writes nothing.\n'
        '     ============================================================================= -->\n')
    return [
        ('header', '<!DOCTYPE html>\n<html lang="en">\n', '<!DOCTYPE html>\n' + header + '<html lang="en">\n'),
        ('title', '<title>TrueVision3D - Elevation Geometry Harness</title>', '<title>ValeVision3D - Elevation Geometry Harness</title>'),
        ('import map note', '<!-- REGION  |  Three.js Import Map (mirrors Index.html exactly)       -->',
                            '<!-- REGION  |  Three.js Import Map (mirrors index.html exactly)       -->'),
    ]


# -----------------------------------------------------------------------------
# The AppConfig: this app's file with TrueVision's twelve labels at TrueVision's places
# -----------------------------------------------------------------------------

LABEL = '        "ElevationViews__Labels__'
TV_ONLY_LABELS = [
    'AutoNameElevationFormat', 'AutoNameSectionFormat', 'FacingStatementElevationFormat',
    'FacingStatementSectionFormat', 'FacingStatementNorthNotSet', 'PlaneControlsCaption',
    'PlanePositionCaption', 'ModelBearingFieldLabel', 'ModelBearingNote', 'UpdateLabel',
    'RevertLabel', 'DeleteLabel'
]
VV_KEPT_VALUES = [                                                # shared keys whose ValeVision value stays
    ('ElevationViews__Description',),
    ('ElevationViews__Plane__Config', 'ElevationViews__Plane__Description'),
    ('ElevationViews__Gizmo__Config', 'ElevationViews__Gizmo__Description'),
    ('ElevationViews__SceneGroup__Config', 'ElevationViews__SceneGroup__Description'),
    ('ElevationViews__FacePick__Config', 'ElevationViews__FacePick__Description'),
    ('ElevationViews__Grip__Config', 'ElevationViews__Grip__Description'),
]

def tv_label_line(tv, name):
    lines = [l for l in tv.split('\n') if l.startswith(LABEL + name + '":')]
    assert len(lines) == 1, name
    assert lines[0].endswith(','), name
    return lines[0] + '\n'

def config_inserts(tv):
    L = lambda *names: ''.join(tv_label_line(tv, n) for n in names)
    return [
        ('after NewElevationNameFormat', 'after', LABEL + 'NewElevationNameFormat": "Elevation {index}",\n',
            L('AutoNameElevationFormat', 'AutoNameSectionFormat', 'FacingStatementElevationFormat', 'FacingStatementSectionFormat', 'FacingStatementNorthNotSet')),
        ('before ModeFieldLabel', 'before', LABEL + 'ModeFieldLabel": "Drawing type",\n', L('PlaneControlsCaption')),
        ('before PlaneXFieldLabel', 'before', LABEL + 'PlaneXFieldLabel": "Plane X",\n', L('PlanePositionCaption')),
        ('after CentrePlaneLabel', 'after', LABEL + 'CentrePlaneLabel": "Centre on model",\n', L('ModelBearingFieldLabel', 'ModelBearingNote')),
        ('after AnnotateLabel', 'after', LABEL + 'AnnotateLabel": "Annotate",\n', L('UpdateLabel', 'RevertLabel', 'DeleteLabel')),
    ]

def build_config(tv, vv):
    out = vv
    for label, where, anchor, lines in config_inserts(tv):
        out = once(out, anchor, (anchor + lines) if where == 'after' else (lines + anchor), 'config ' + label)
    return out

def flatten(doc, prefix=()):
    flat = {}
    for key, value in doc.items():
        if isinstance(value, dict):
            flat.update(flatten(value, prefix + (key,)))
        else:
            flat[prefix + (key,)] = value
    return flat

def check_config(tv_text_, vv_text_, built_text):
    problems = []
    tv, vv, built = json.loads(tv_text_), json.loads(vv_text_), json.loads(built_text)
    ftv, fvv, fb = flatten(tv), flatten(vv), flatten(built)
    tv_only = sorted(set(ftv) - set(fvv))
    want_tv_only = sorted(('ElevationViews__Labels__Config', 'ElevationViews__Labels__' + n) for n in TV_ONLY_LABELS)
    if tv_only != want_tv_only: problems.append('TrueVision-only keys are not the twelve labels: %r' % tv_only)
    differing = sorted(k for k in set(ftv) & set(fvv) if ftv[k] != fvv[k])
    if differing != sorted(VV_KEPT_VALUES): problems.append('shared keys with differing values: %r' % differing)
    if set(fb) != set(ftv) | set(fvv): problems.append('built key set is not the union')
    for k in fb:
        want = fvv[k] if k in fvv else ftv[k]
        if fb[k] != want: problems.append('built value differs at %r' % (k,))
    if list(built.keys()) != list(vv.keys()): problems.append('top-level block order changed')
    for block in vv:
        if isinstance(vv[block], dict) and block != 'ElevationViews__Labels__Config':
            if list(built[block].keys()) != list(vv[block].keys()): problems.append('key order changed in ' + block)
    # TrueVision's own relative order of its Labels keys is kept
    tv_order = [k for k in tv['ElevationViews__Labels__Config']]
    b_order  = [k for k in built['ElevationViews__Labels__Config'] if k in tv['ElevationViews__Labels__Config']]
    if tv_order != b_order: problems.append('TrueVision\'s label order is not kept')
    vv_order = [k for k in vv['ElevationViews__Labels__Config']]
    b_order2 = [k for k in built['ElevationViews__Labels__Config'] if k in vv['ElevationViews__Labels__Config']]
    if vv_order != b_order2: problems.append('this app\'s label order is not kept')
    added = [l for l in built_text.split('\n') if l not in vv_text_.split('\n')]
    if len(added) != 12 or len(built_text.split('\n')) != len(vv_text_.split('\n')) + 12:
        problems.append('the built file is not the old one plus twelve lines (%d new lines)' % len(added))
    return problems


# -----------------------------------------------------------------------------
# Build and verify
# -----------------------------------------------------------------------------

def plan():
    vv_css_old = vv_pre_text(REL_CSS)
    return {
        REL_AUTONAMETEXT : (tv_text(REL_AUTONAMETEXT), seams_autonametext()),
        REL_AUTONAME     : (tv_text(REL_AUTONAME),     seams_autoname()),
        REL_DATA         : (tv_text(REL_DATA),         seams_data()),
        REL_CSS          : (tv_text(REL_CSS),          seams_css(vv_css_old)),
        REL_TEST         : (tv_text(REL_TEST),         seams_test()),
    }

def apply_seams(text, seams, rel):
    for label, old, new in seams:
        text = once(text, old, new, rel + ' ' + label)
    return text

def reverse_seams(text, seams, rel):
    for label, old, new in reversed(seams):
        text = once(text, new, old, rel + ' reverse ' + label)
    return text

def build_all():
    built = {}
    for rel, (tv, seams) in plan().items():
        built[rel] = apply_seams(tv, seams, rel)
    tv_cfg, vv_cfg = tv_text(REL_CONFIG), vv_pre_text(REL_CONFIG)
    built[REL_CONFIG] = build_config(tv_cfg, vv_cfg)
    problems = check_config(tv_cfg, vv_cfg, built[REL_CONFIG])
    assert not problems, problems
    for rel, text in built.items():
        assert '\r' not in text and text.endswith('\n') or rel == REL_CONFIG, rel
        for bad in ('TRUEVISION3D -', 'TrueVision__', '[TrueVision3D', 'NaProjectPortal', '/na-apps/', 'Noble Architecture Ltd'):
            hits = [i for i, line in enumerate(text.split('\n'), 1) if bad in line]
            # Allowed: none of these may appear anywhere in the built files
            assert not hits, '%s carries %r at %r' % (rel, bad, hits)
    return built

def main():
    built = build_all()
    if '--verify' not in sys.argv:
        for rel, text in built.items():
            path = os.path.join(CAND, rel.replace('/', os.sep))
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'wb') as fh:
                fh.write(text.encode('utf-8'))
            print('candidate  %-80s %6d bytes  sha256 %s' % (rel, len(text.encode('utf-8')), hashlib.sha256(text.encode('utf-8')).hexdigest()[:16]))
        return 0
    problems = 0
    for rel, text in built.items():
        live = open(live_path(rel), 'rb').read().decode('utf-8')
        same = (live == text)
        print('%-82s live == candidate: %s' % (rel, same))
        if not same: problems += 1
    for rel, (tv, seams) in plan().items():
        live = open(live_path(rel), 'rb').read().decode('utf-8')
        back = reverse_seams(live, seams, rel)
        ok = (back == tv)
        print('%-82s reverse seams == TrueVision at %s: %s' % (rel, PIN, ok))
        if not ok: problems += 1
    cfg_problems = check_config(tv_text(REL_CONFIG), vv_pre_text(REL_CONFIG), open(live_path(REL_CONFIG), 'rb').read().decode('utf-8'))
    print('%-82s union rules: %s' % (REL_CONFIG, 'OK' if not cfg_problems else cfg_problems))
    problems += len(cfg_problems)
    print('verify: %d problem(s)' % problems)
    return 1 if problems else 0

if __name__ == '__main__':
    sys.exit(main())
