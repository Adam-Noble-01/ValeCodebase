# =============================================================================
# W1-08 scratch - build the seven candidates from TrueVision's bytes at the pin
# =============================================================================
#
# Every TrueVision file is read with `git show b2aa9151:<path>` (bytes, LF) and
# its sha1 checked against the copy fetched at the start of the package. Each
# seam is an exact replacement asserted to match ONCE; nothing else changes.
# The two existing ValeVision files whose own content survives (the AppConfig
# and the stylesheet's Style Toggles region) are read live and sha1-checked
# against the baseline recorded before any write.
#
# Output: scratch/W1-08/candidates/<file name> (LF, as TrueVision's text is)
# and scratch/W1-08/candidates/manifest.json (sha1 of every candidate and of
# every live file it was built against).
#
# Usage: python -B build_w1_08.py
# =============================================================================

import hashlib
import json
import os
import re
import subprocess
import sys

PIN    = 'b2aa9151'
NAWEB  = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
TVAPP  = 'na-apps/30__TrueVision__CoreAppCode/'
VV     = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE   = os.path.dirname(os.path.abspath(__file__))
OUT    = os.path.join(HERE, 'candidates')
WP     = 'W1-08'
PORTED = '01-Oct-2026'

FP_DIR   = '02__Src__AppModules/42__System__FloorPlanViews/'
TEST_DIR = '80__Testing__PrototypeEnvironment/'

# sha1 of TrueVision's bytes, as fetched at the start of the package (fetch_tv.py)
TV_SHA1_PREFIX = {
    'Na__FloorPlan__StoreyLevel__.js'           : '351c4305',
    'Na__FloorPlan__DevMenu__StoreyRow__.js'    : '5be011ed',
    'Na__FloorPlan__ConfigState__.js'           : 'a7e05432',
    'Na__FloorPlan__ProjectJson__Data__.js'     : 'ec2fa62c',
    'Na__FloorPlan__AppConfig__.json'           : '96bf7c93',
    'Na__FloorPlan__Styles__DevMenu__.css'      : 'edd3dbaf',
    'Na__Test__FloorPlanStoreyLevel__.test.mjs' : '93dc2ad0',
}

# sha1 of the live ValeVision files before this package wrote anything (eol_scan.py -> baseline_sha1.txt)
VV_SHA1_PREFIX = {
    'Na__FloorPlan__AppConfig__.json'       : 'd9ace0c3',
    'Na__FloorPlan__ConfigState__.js'       : 'afc76ef8',
    'Na__FloorPlan__ProjectJson__Data__.js' : '3d3e538b',
    'Na__FloorPlan__Styles__DevMenu__.css'  : '5fd866fa',
}


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

def sha1(data):
    return hashlib.sha1(data).hexdigest()


def tv_text(rel):
    name = rel.split('/')[-1]
    data = subprocess.run(['git', '-C', NAWEB, 'show', PIN + ':' + TVAPP + rel], capture_output=True, check=True).stdout
    assert sha1(data).startswith(TV_SHA1_PREFIX[name]), 'TrueVision bytes changed for ' + name
    assert b'\r' not in data, 'TrueVision text is not LF: ' + name
    return data.decode('utf-8')


def vv_text(rel):
    name = rel.split('/')[-1]
    path = os.path.join(VV, rel.replace('/', os.sep))
    data = open(path, 'rb').read()
    assert sha1(data).startswith(VV_SHA1_PREFIX[name]), 'ValeVision file changed since the baseline: ' + name
    assert b'\r' not in data, 'ValeVision file is not LF: ' + name
    return data.decode('utf-8'), sha1(data)


def once(text, old, new, label):
    count = text.count(old)
    assert count == 1, '%s: anchor found %d times' % (label, count)
    return text.replace(old, new)


def insert_port_note_before_log(text, note_lines, label):
    # TrueVision's header: ... '//' , rule, '//', '// DEVELOPMENT LOG:' - the PORT NOTE goes
    # between the rule and the log, in its own ruled section (K2 H5, P10 skeleton).
    lines = text.split('\n')
    idx = [i for i, line in enumerate(lines) if line == '// DEVELOPMENT LOG:']
    assert len(idx) == 1, label + ': DEVELOPMENT LOG heading found %d times' % len(idx)
    i = idx[0]
    rule = lines[i - 2]
    assert lines[i - 1] == '//' and re.match(r'^// -{70,}$', rule), label + ': unexpected header shape above the log'
    assert not any(line.startswith('// PORT NOTE') for line in lines[:i]), label + ': already has a PORT NOTE'
    new_lines = lines[:i] + note_lines + ['//', rule, '//'] + lines[i:]
    return '\n'.join(new_lines)


def replace_tv_port_note(text, note_lines, label):
    old = ('// PORT NOTE:\n'
           '// - Authored in   : TrueVision3D first (20-Sep-2026)\n'
           '// - ValeVision    : not yet ported.\n')
    return once(text, old, '\n'.join(note_lines) + '\n', label + ' PORT NOTE')


def pad_to(code, column):
    return code + ' ' * max(1, column - len(code))


# -----------------------------------------------------------------------------
# The PORT NOTE blocks (K2 H5)
# -----------------------------------------------------------------------------

VVREL = '{{VVREL:' + WP + '}}'

NOTE_STOREY_LEVEL = [
    '// PORT NOTE:',
    '// - Ported from   : TrueVision3D 02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__StoreyLevel__.js',
    '// - Source version: 1.0.0 (TrueVision3D v2.87.0, 20-Sep-2026; read at b2aa9151)',
    '// - Ported on     : ' + PORTED + ' for ValeVision3D ' + VVREL,
    '// - Parity        : verbatim',
    '// - Divergences   :',
    '//   - Banner reads ValeVision3D. (No console output in this file.)',
    '// - Back-port     : none.',
]

NOTE_STOREY_ROW = [
    '// PORT NOTE:',
    '// - Ported from   : TrueVision3D 02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__DevMenu__StoreyRow__.js',
    '// - Source version: 1.0.0 (TrueVision3D v2.87.0, 20-Sep-2026; read at b2aa9151)',
    '// - Ported on     : ' + PORTED + ' for ValeVision3D ' + VVREL,
    '// - Parity        : verbatim',
    '// - Divergences   :',
    '//   - Banner reads ValeVision3D. (No console output in this file.)',
    '//   - Nothing mounts the row yet. INTEGRATION names TrueVision\'s caller, the Floor Plans row builders',
    '//     2.0.0; this app\'s are 1.2.0 until package W2-04 takes TrueVision\'s, so the dropdown lands inert -',
    '//     its data and config calls resolve, and no Dev menu shows it.',
    '// - Back-port     : none.',
]

NOTE_CONFIG_STATE = [
    '// PORT NOTE:',
    '// - Ported from   : TrueVision3D 02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__ConfigState__.js',
    '// - Source version: 1.1.0 (TrueVision3D v2.87.0, 20-Sep-2026; read at b2aa9151)',
    '// - Ported on     : ' + PORTED + ' for ValeVision3D ' + VVREL + ', whole; first ported (1.0.0) 09-Sep-2026',
    '//                   for ValeVision3D v2.18.0 (port Phase 2)',
    '// - Parity        : verbatim',
    '// - Divergences   :',
    '//   - Banner and console prefix read ValeVision3D.',
    '// - Back-port     : none.',
]

NOTE_DATA = [
    '// PORT NOTE:',
    '// - Ported from   : TrueVision3D 02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__ProjectJson__Data__.js',
    '// - Source version: 1.1.0 (TrueVision3D v2.87.0, 20-Sep-2026; read at b2aa9151)',
    '// - Ported on     : ' + PORTED + ' for ValeVision3D ' + VVREL + ', whole; first ported 09-Sep-2026 for',
    '//                   ValeVision3D v2.18.0 (port Phase 2) and kept since as this app\'s own 1.1.0 / 1.1.1',
    '//                   (records in the drawings block, styles, exclusions, the linework asset slot)',
    '// - Parity        : adapted',
    '// - Divergences   :',
    '//   - Banner reads ValeVision3D. (No console output in this file.)',
    '//   - DESCRIPTION and INTEGRATION are TrueVision\'s word for word, and their first paragraph is its',
    '//     history: the records left the presentation block for LayoutEditor__DrawingsData in TrueVision3D',
    '//     v2.21.0 (the import comment below says so), and here they have only ever lived there. The block\'s',
    '//     one save is Na__DrawData__Save, and the one list a new top-level editor key must join is',
    '//     ProjectData__EditorOwnedKeys (Na__AppConfig__Main.json). FLOOR_PLANS_KEY keeps TrueVision\'s',
    '//     legacy value; nothing in this app reads it.',
    '//   - FloorPlan__Dimensions is seeded as an empty array on every read and on a new plan (this app\'s own',
    '//     normalisation, kept; the dimensioning system also seeds it on first use, as TrueVision\'s does).',
    '//   - SetExcludeTokens trims each token and drops the empty ones; TrueVision stores the list as given.',
    '//   - Na__FpData__STYLE_KEYS is exported (K2 X2), as this app\'s data module always has.',
    '// - Back-port     : none.',
]

NOTE_CSS = [
    '/*',
    ' * PORT NOTE:',
    ' * - Ported from   : TrueVision3D 02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__Styles__DevMenu__.css',
    ' * - Source version: none of its own - the sheet as TrueVision3D v2.87.0 left it, with its Storey Dropdown',
    ' *                   region (20-Sep-2026, commit bef15277; read at b2aa9151)',
    ' * - Ported on     : ' + PORTED + ' for ValeVision3D ' + VVREL + ', whole; first ported 09-Sep-2026 for',
    ' *                   ValeVision3D v2.18.0 (port Phase 2)',
    ' * - Parity        : adapted',
    ' * - Divergences   :',
    ' *   - Banner reads ValeVision3D.',
    ' *   - The Style Toggles region at the end is this app\'s: the per-drawing style rows (D33), which',
    ' *     DR-32 keeps (.na-fp-dev__styles, .na-fp-dev__style).',
    ' * - Legacy        : TrueVision\'s copy of this sheet has no module version, so the Source version names',
    ' *                   the release and the commit instead.',
    ' * - Back-port     : none.',
    ' */',
]

NOTE_TEST = [
    '// PORT NOTE:',
    '// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__FloorPlanStoreyLevel__.test.mjs',
    '// - Source version: 1.0.0 (TrueVision3D v2.87.0, 20-Sep-2026; read at b2aa9151)',
    '// - Ported on     : ' + PORTED + ' for ValeVision3D ' + VVREL + ', with the module it proves',
    '// - Parity        : verbatim - every check is TrueVision\'s, run against this app\'s own module and its',
    '//                   shipped config',
    '// - Divergences   :',
    '//   - Banner and the printed title read ValeVision3D.',
    '// - Back-port     : none.',
]


# -----------------------------------------------------------------------------
# Builders
# -----------------------------------------------------------------------------

def build_storey_level():
    text = tv_text(FP_DIR + 'Na__FloorPlan__StoreyLevel__.js')
    text = once(text, '// TRUEVISION3D - FLOOR PLAN VIEWS - STOREY LEVEL\n', '// VALEVISION3D - FLOOR PLAN VIEWS - STOREY LEVEL\n', 'StoreyLevel banner')
    text = replace_tv_port_note(text, NOTE_STOREY_LEVEL, 'StoreyLevel')
    return text


def build_storey_row():
    text = tv_text(FP_DIR + 'Na__FloorPlan__DevMenu__StoreyRow__.js')
    text = once(text, '// TRUEVISION3D - FLOOR PLAN VIEWS - DEV MENU STOREY ROW\n', '// VALEVISION3D - FLOOR PLAN VIEWS - DEV MENU STOREY ROW\n', 'StoreyRow banner')
    text = replace_tv_port_note(text, NOTE_STOREY_ROW, 'StoreyRow')
    return text


def build_config_state():
    text = tv_text(FP_DIR + 'Na__FloorPlan__ConfigState__.js')
    text = once(text, '// TRUEVISION3D - FLOOR PLAN VIEWS - CONFIG STATE\n', '// VALEVISION3D - FLOOR PLAN VIEWS - CONFIG STATE\n', 'ConfigState banner')
    text = once(text, "console.warn('[TrueVision3D] Floor plan config fetch failed (", "console.warn('[ValeVision3D] Floor plan config fetch failed (", 'ConfigState console 1')
    text = once(text, "console.warn('[TrueVision3D] Floor plan config unreadable", "console.warn('[ValeVision3D] Floor plan config unreadable", 'ConfigState console 2')
    text = insert_port_note_before_log(text, NOTE_CONFIG_STATE, 'ConfigState')
    return text


def build_data():
    text = tv_text(FP_DIR + 'Na__FloorPlan__ProjectJson__Data__.js')
    text = once(text, '// TRUEVISION3D - FLOOR PLAN VIEWS - PROJECT DATA\n', '// VALEVISION3D - FLOOR PLAN VIEWS - PROJECT DATA\n', 'Data banner')
    text = insert_port_note_before_log(text, NOTE_DATA, 'Data')

    # SEAM | Dimensions default (1/3): the record field name, beside the annotations it mirrors
    storey_line = [l for l in text.split('\n') if l.startswith("    const Na__FpData__PLAN_STOREY       = 'FloorPlan__StoreyLevel';")]
    assert len(storey_line) == 1
    comment_col = storey_line[0].index('// <--')
    dims_line = pad_to("    const Na__FpData__PLAN_DIMENSIONS   = 'FloorPlan__Dimensions';", comment_col) + '// <-- ValeVision only: seeded empty on read and on a new plan (PORT NOTE)'
    text = once(text,
                "    const Na__FpData__PLAN_ANNOTATIONS  = 'FloorPlan__Annotations';\n",
                "    const Na__FpData__PLAN_ANNOTATIONS  = 'FloorPlan__Annotations';\n" + dims_line + '\n',
                'Data dimensions constant')

    # SEAM | Dimensions default (2/3): NormalisePlan
    old = ('        if (!Array.isArray(plan[Na__FpData__PLAN_ANNOTATIONS])) {\n'
           '            plan[Na__FpData__PLAN_ANNOTATIONS] = [];\n'
           '        }\n'
           '        // View depth is deliberately allowed to stay null - that is the\n')
    new = ('        if (!Array.isArray(plan[Na__FpData__PLAN_ANNOTATIONS])) {\n'
           '            plan[Na__FpData__PLAN_ANNOTATIONS] = [];\n'
           '        }\n'
           '        if (!Array.isArray(plan[Na__FpData__PLAN_DIMENSIONS])) {\n'
           + pad_to('            plan[Na__FpData__PLAN_DIMENSIONS] = [];', 81) + '// <-- ValeVision only (PORT NOTE)\n'
           '        }\n'
           '        // View depth is deliberately allowed to stay null - that is the\n')
    text = once(text, old, new, 'Data dimensions normalise')

    # SEAM | Dimensions default (3/3): CreatePlan
    old = ('        plan[Na__FpData__PLAN_ANNOTATIONS] = [];\n'
           '\n'
           '        array.push(plan);\n')
    new = ('        plan[Na__FpData__PLAN_ANNOTATIONS] = [];\n'
           + pad_to('        plan[Na__FpData__PLAN_DIMENSIONS]  = [];', 81) + '// <-- ValeVision only (PORT NOTE)\n'
           '\n'
           '        array.push(plan);\n')
    text = once(text, old, new, 'Data dimensions create')

    # SEAM | Trimmed exclusion tokens
    old = '        plan[Na__FpData__REC_EXCLUDE] = Array.isArray(tokens) ? tokens.slice() : null;\n'
    new = ('        plan[Na__FpData__REC_EXCLUDE] = Array.isArray(tokens)\n'
           + pad_to('            ? tokens.map((t) => String(t).trim()).filter((t) => t.length > 0)', 81) + '// <-- ValeVision only: trimmed, empties dropped (PORT NOTE)\n'
           '            : null;\n')
    text = once(text, old, new, 'Data trimmed tokens')

    # SEAM | STYLE_KEYS export (K2 X2)
    old = '        Na__FpData__SCENE_PLAN_ID_KEY,\n'
    new = ('        Na__FpData__SCENE_PLAN_ID_KEY,\n'
           + pad_to('        Na__FpData__STYLE_KEYS,', 77) + '// <-- ValeVision only (K2 X2)\n')
    text = once(text, old, new, 'Data STYLE_KEYS export')
    return text


def build_app_config():
    tv = tv_text(FP_DIR + 'Na__FloorPlan__AppConfig__.json')
    vv, vv_sha = vv_text('02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__AppConfig__.json')

    # TrueVision's storey levels block, its lines exactly
    tv_lines = tv.split('\n')
    start = tv_lines.index('    "FloorPlanViews__StoreyLevels__Config": {')
    end = start
    while tv_lines[end] != '    },':
        end += 1
    block = '\n'.join(tv_lines[start:end + 1]) + '\n'

    # TrueVision's six storey labels, its lines exactly (the last one gains the comma ValeVision's labels after it need)
    labels = [l for l in tv_lines if l.startswith('        "FloorPlanViews__Labels__Storey')]
    assert len(labels) == 6, labels
    assert labels[-1].endswith('"') and not labels[-1].endswith(',')
    labels[-1] = labels[-1] + ','
    assert all(l.endswith(',') for l in labels)

    # Into ValeVision's file at TrueVision's positions: the block between the scene group and the labels,
    # the labels straight after NoStoreysMessage (before this app's own GroundFloorPlan, Style and Exclusions labels)
    vv = once(vv, '        "FloorPlanViews__SceneGroup__AutoEnableTargetGroup": true\n    },\n    "FloorPlanViews__Labels__Config": {\n',
              '        "FloorPlanViews__SceneGroup__AutoEnableTargetGroup": true\n    },\n' + block + '    "FloorPlanViews__Labels__Config": {\n',
              'AppConfig storey block')
    vv = once(vv, '        "FloorPlanViews__Labels__NoStoreysMessage": "No named storeys detected in this model.",\n',
              '        "FloorPlanViews__Labels__NoStoreysMessage": "No named storeys detected in this model.",\n' + '\n'.join(labels) + '\n',
              'AppConfig storey labels')

    # Proof: valid JSON; every TrueVision key present with TrueVision's value, except the one description
    # ValeVision words for itself; ValeVision's extras unchanged
    tv_obj = json.loads(tv)
    vv_obj = json.loads(vv)
    old_obj = json.loads(vv_text('02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__AppConfig__.json')[0])
    for key, value in tv_obj.items():
        if key == 'FloorPlanViews__Description':
            assert vv_obj[key] == old_obj[key]
            continue
        if isinstance(value, dict):
            for sub, subval in value.items():
                assert vv_obj[key][sub] == subval, (key, sub)
        else:
            assert vv_obj[key] == value, key
    for key, value in old_obj.items():
        if isinstance(value, dict):
            for sub, subval in value.items():
                assert vv_obj[key][sub] == subval, (key, sub)
        else:
            assert vv_obj[key] == value, key
    assert list(vv_obj.keys()) == list(tv_obj.keys()), 'top-level block order differs from TrueVision'
    return vv, vv_sha


def build_css():
    tv = tv_text(FP_DIR + 'Na__FloorPlan__Styles__DevMenu__.css')
    vv, vv_sha = vv_text('02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__Styles__DevMenu__.css')

    text = once(tv, '/* REGION  |  TrueVision3D - Floor Plan Dev Menu Styles             */\n',
                '/* REGION  |  ValeVision3D - Floor Plan Dev Menu Styles             */\n', 'CSS banner')
    anchor = (' * cut-height readout, and the words under a guessed storey.\n'
              ' */\n'
              '/* ================================================================= */\n')
    text = once(text, anchor, anchor + '\n'.join(NOTE_CSS) + '\n', 'CSS PORT NOTE')

    # ValeVision's Style Toggles region (D33), its bytes exactly, after TrueVision's last region
    marker = '\n\n/* ----------------------------------------------------------------- */\n/* REGION  |  Style Toggles (ValeVision addition, D33)               */\n'
    at = vv.index(marker)
    assert vv.count(marker) == 1
    region = vv[at:]
    assert region.endswith('/* endregion ------------------------------------------------------- */\n')
    assert text.endswith('/* endregion ------------------------------------------------------- */\n')
    text = text + region                                            # <-- endregion line, two blank lines, the region (house spacing)
    return text, vv_sha


def build_test():
    text = tv_text(TEST_DIR + 'Na__Test__FloorPlanStoreyLevel__.test.mjs')
    text = once(text, '// TRUEVISION3D - TEST - FLOOR PLAN VIEWS - STOREY LEVEL\n', '// VALEVISION3D - TEST - FLOOR PLAN VIEWS - STOREY LEVEL\n', 'Test banner')
    text = once(text, "    console.log('TrueVision3D - floor plan storey level');\n", "    console.log('ValeVision3D - floor plan storey level');\n", 'Test title')
    text = insert_port_note_before_log(text, NOTE_TEST, 'Test')
    return text


# -----------------------------------------------------------------------------
# Identity sweep (outside the PORT NOTE and DEVELOPMENT LOG blocks) - G4 repeats it on the landed files
# -----------------------------------------------------------------------------

MARKERS = [ 'True' + 'Vision__', 'TRUE' + 'VISION3D', '[True' + 'Vision3D', 'True' + 'Vision3D__', 'Na' + 'ProjectPortal', '/na-' + 'apps/',
            'na-' + 'truevision-api', '/api/' + 'truevision', 'X-' + 'TrueVision-', 'noble-' + 'architecture.com' ]


def identity_hits(name, text):
    hits = []
    in_block = False
    for number, line in enumerate(text.split('\n'), 1):
        stripped = line.strip()
        if re.match(r'^(//|\*|/\*)\s*(PORT NOTE\b|DEVELOPMENT LOG\b)', stripped):
            in_block = True
            continue
        if in_block and (re.match(r'^(//|/\*|\*)\s*[-=]{4,}', stripped) or stripped == '*/'):
            in_block = False
            continue
        if in_block:
            continue
        for marker in MARKERS:
            if marker in line:
                hits.append('%s:%d %s' % (name, number, line.strip()[:120]))
    return hits


# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

def main():
    os.makedirs(OUT, exist_ok=True)
    built = {}
    built['Na__FloorPlan__StoreyLevel__.js']           = (build_storey_level(), None)
    built['Na__FloorPlan__DevMenu__StoreyRow__.js']    = (build_storey_row(), None)
    built['Na__FloorPlan__ConfigState__.js']           = (build_config_state(), VV_SHA1_PREFIX['Na__FloorPlan__ConfigState__.js'])
    built['Na__FloorPlan__ProjectJson__Data__.js']     = (build_data(), VV_SHA1_PREFIX['Na__FloorPlan__ProjectJson__Data__.js'])
    app_text, app_sha = build_app_config()
    built['Na__FloorPlan__AppConfig__.json']           = (app_text, app_sha)
    css_text, css_sha = build_css()
    built['Na__FloorPlan__Styles__DevMenu__.css']      = (css_text, css_sha)
    built['Na__Test__FloorPlanStoreyLevel__.test.mjs'] = (build_test(), None)

    manifest = {}
    all_hits = []
    for name, (text, _) in built.items():
        data = text.encode('utf-8')
        assert b'\r' not in data
        assert data.endswith(b'\n')
        with open(os.path.join(OUT, name), 'wb') as f:
            f.write(data)
        manifest[name] = { 'sha1' : sha1(data), 'bytes' : len(data), 'lines' : data.count(b'\n') }
        if not name.endswith('.json'):
            all_hits += identity_hits(name, text)
        print('%-45s %6d bytes %4d lines sha1 %s' % (name, len(data), data.count(b'\n'), sha1(data)[:8]))

    with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)

    if all_hits:
        print('IDENTITY HITS outside PORT NOTE / DEVELOPMENT LOG:')
        for hit in all_hits:
            print('  ' + hit)
        sys.exit(1)
    print('identity sweep: clean')


if __name__ == '__main__':
    main()
