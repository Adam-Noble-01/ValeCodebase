"""W2-06 build script (scratch): projected linework folder 50 to TrueVision HEAD, with ValeVision's seams.

Package W2-06 - "Projected linework (folder 50) to TV HEAD: flush joins, seams occlude, storeys, door pose,
modifiers config".

Reads every TrueVision file ONLY at the pin (git show b2aa9151, bytes, LF), re-applies the named ValeVision seams
as exact, counted replacements, and nothing else:

  13 modules + the folder's AppConfig JSON (whole-file takes; DoorPose new) and the StoreyBand test (new).

Every seam is an (old, new, count) triple. The verify step applies the triples backwards to the built text and
must get TrueVision's bytes back exactly, so the only differences from TrueVision are the listed seams.

Usage:
  python build_w2_06.py --check     build in memory, write diffs to diffs/, write nothing in the app
  python build_w2_06.py --write     land the files (refuses unless every live file still equals its pre-image)
  python build_w2_06.py --verify    live files == this build, and reverse seams == TrueVision bytes
  python build_w2_06.py --restore   put the pre-images back and remove the two new files (only if unchanged)
"""
import difflib
import hashlib
import json
import os
import re
import subprocess
import sys

TV_REPO = r'D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb'
PIN     = 'b2aa9151'
TV_APP  = 'na-apps/30__TrueVision__CoreAppCode'
VV_ROOT = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
HERE    = os.path.dirname(os.path.abspath(__file__))
PKG     = 'W2-06'
TOKEN   = '{{VVREL:' + PKG + '}}'
TODAY   = '02-Oct-2026'
F50     = '02__Src__AppModules/50__System__ProjectedLinework/'
VV_BUILD_TOKEN = '2026-10-02-tv-parity'
RULE    = '// ' + '-' * 77


def tv_bytes(rel):
    return subprocess.run(['git', '-C', TV_REPO, 'show', PIN + ':' + TV_APP + '/' + rel],
                          check=True, stdout=subprocess.PIPE).stdout


def lines(*rows):
    return ''.join(row + '\n' for row in rows)


def tv_port_note(tv):
    """TrueVision's own PORT NOTE block: from its heading to the line before the closing '//' + rule."""
    start = tv.index('// PORT NOTE:\n')
    end = tv.index('//\n' + RULE + '\n', start)
    block = tv[start:end]
    if tv.count(block) != 1:
        raise SystemExit('PORT NOTE block not unique')
    return block


def banner(tv_title):
    return ('// TRUEVISION3D - ' + tv_title + '\n', '// VALEVISION3D - ' + tv_title + '\n', 1)


def console(count):
    return ('[TrueVision3D ProjectedLinework]', '[ValeVision3D ProjectedLinework]', count)


def authored(lantern_file, vv_history):
    """The K2 H5 'Authored in' lines for a folder-50 module ValeVision wrote first (port Phase 4)."""
    if lantern_file is None:
        first = ['// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.20.0, port Phase 4, a ValeVision',
                 '//                   original (D18);']
    else:
        first = ['// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.20.0, port Phase 4, from the Lantern',
                 "//                   Designer's " + lantern_file + ' of 07-Aug-2026;']
    return first + [
        '//                   ' + vv_history + ');',
        '//                   since ported back whole from TrueVision3D (HEAD b2aa9151)',
    ]


PORTED_ON = '// - Ported on     : ' + TODAY + ' for ValeVision3D ' + TOKEN + ' (folder 50 to TrueVision HEAD)'


def note(*rows):
    return lines('// PORT NOTE:', *rows)


# -----------------------------------------------------------------------------
# The PORT NOTEs (K2 H5) - one per module
# -----------------------------------------------------------------------------

NOTES = {}

NOTES['AuthoredEdges'] = note(
    *authored(None,
              "ValeVision's own 1.1.0 (13-Sep-2026) took TrueVision's owner tags"),
    '// - Source version: 1.2.0 (TrueVision3D v2.37.0, 14-Sep-2026; read at b2aa9151), with the per-node',
    '//                   LineworkModifier owners TrueVision added unlogged on 21-Sep-2026 (the commit of',
    '//                   TrueVision3D v2.98.0; its DEVELOPMENT LOG does not record them)',
    PORTED_ON,
    '// - Parity        : verbatim',
    '// - Divergences   :',
    '//   - Banner reads ValeVision3D; DESCRIPTION says "Every ValeVision model" (the running app). No console',
    '//     output in this file.',
    '// - Back-port     : none (TrueVision could log the per-node owners in its DEVELOPMENT LOG).')

NOTES['ClipKernel'] = note(
    *authored('VghLantern__ProjectedEdges__ClipKernel__.mjs',
              "ValeVision's own 1.1.0 (13-Sep-2026) took TrueVision's owner tags"),
    '// - Source version: 1.2.0 (TrueVision3D v2.37.0, 14-Sep-2026; read at b2aa9151)',
    PORTED_ON,
    '// - Parity        : verbatim. Without SeamsOcclude the output is byte-identical to 1.1.0.',
    '// - Divergences   :',
    '//   - Banner reads ValeVision3D; DESCRIPTION calls SeamsOcclude "a ValeVision switch" (the running app',
    "//     adds it to the vendored kernel). No console output in this file.",
    '// - Back-port     : none.')

NOTES['ConfigAccess'] = note(
    *authored('VghLantern__ProjectedEdges__ConfigAccess__.mjs',
              "ValeVision's own 1.0.1 (18-Sep-2026) was TrueVision's 1.1.1"),
    '// - Source version: 1.2.0 (TrueVision3D v2.105.0, 21-Sep-2026; read at b2aa9151), with GetLineworkModifiers,',
    '//                   which TrueVision added unlogged on 20-21 Sep-2026 (the commits of TrueVision3D v2.95.0',
    '//                   and v2.98.0)',
    PORTED_ON,
    '// - Parity        : adapted',
    '// - Divergences   :',
    '//   - Banner and console prefix read ValeVision3D.',
    '//   - The LineworkModifier fallbacks name ValeVision__LineworkModifier__FineDetail / VeryFineDetail',
    "//     (TrueVision__ in TrueVision): a runtime owner key carries the app's token (K2 K3), as in the JSON.",
    "//   - The fallback buildToken is this app's own, '" + VV_BUILD_TOKEN + "', equal to",
    "//     ProjectedLinework__Model__BuildToken in the shipped JSON (DR-31 (4)). TrueVision's fallback",
    "//     ('2026-09-21-storey-swings') lags its own JSON ('2026-09-23-flush-tolerance'), which its",
    '//     Na__Test__StoreyBand__ reports (S02b-F33); this app\'s copy of that test checks the two are equal.',
    "// - Back-port     : TrueVision: set the fallback build token equal to the JSON's, and correct the heading",
    "//                   above GetAnnotationSetup, which reads \"Get the Model Sampling Setup\" (kept here as",
    "//                   TrueVision wrote it; WP-S02b-10R item 2, TrueVision lane).")

NOTES['CpuBackend'] = note(
    *authored('VghLantern__ProjectedEdges__CpuBackend__.mjs',
              "ValeVision's own 1.1.0, 1.2.0 and 1.2.1 followed, 1.2.1 being TrueVision's 1.3.1"),
    '// - Source version: 1.4.0 (TrueVision3D v2.105.0, 21-Sep-2026; read at b2aa9151)',
    PORTED_ON,
    "// - Parity        : verbatim. The 1.3.1 log entry's \"Back-port PENDING to ValeVision3D\" is TrueVision's",
    "//                   history: this app took that change as its own 1.2.1 on 18-Sep-2026.",
    '// - Divergences   :',
    '//   - Banner reads ValeVision3D. (No console output in this file.)',
    '// - Back-port     : none.')

NOTES['DevMenu__Controls'] = note(
    *authored('VghLantern__ProjectedEdges__ToolbarButton__.mjs (purpose only)',
              "ValeVision's own 1.1.0 (13-Sep-2026, the backend picker wording) is a different 1.1.0"),
    '// - Source version: 1.1.0 (TrueVision3D v2.37.0, 14-Sep-2026; read at b2aa9151)',
    PORTED_ON,
    '// - Parity        : verbatim',
    '// - Divergences   :',
    '//   - Banner and console prefix read ValeVision3D.',
    '// - Back-port     : none.')

NOTES['DoorPose'] = note(
    '// - Ported from   : TrueVision3D 02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__DoorPose__.js',
    '// - Source version: 1.3.0 (TrueVision3D v2.140.0, 22-Sep-2026; read at b2aa9151)',
    PORTED_ON + ';',
    '//                   1.0.0 to 1.3.0 are TrueVision3D v2.42.0, v2.48.1, v2.105.0 and v2.140.0, none of them yet',
    "//                   confirmed by Adam in TrueVision.",
    '// - Parity        : verbatim. The door module 1.9.0 contract and FindDoorGroups it imports landed with W1-02.',
    "//                   Only the projector and the pipeline call it so far, and no drawing outside the Layout",
    "//                   Editor carries a DoorPose, so they read the model exactly as before; its Layout Editor",
    "//                   callers (PlanDoors, SnapshotRenderer) arrive with later packages.",
    '// - Divergences   :',
    '//   - Banner reads ValeVision3D. (No console output in this file.)',
    '// - Back-port     : none.')

NOTES['EdgeExtractor'] = note(
    *authored('VghLantern__ProjectedEdges__EdgeExtractor__.mjs',
              "ValeVision's own 1.1.0 and 1.2.0 followed, 1.2.0 taking TrueVision's owner tags"),
    '// - Source version: 1.3.0 (TrueVision3D v2.37.0, 14-Sep-2026; read at b2aa9151)',
    PORTED_ON,
    '// - Parity        : verbatim',
    '// - Divergences   :',
    '//   - Banner and console prefix read ValeVision3D; DESCRIPTION says "No ValeVision GLB" (the running app).',
    '// - Back-port     : none.')

NOTES['ModelStage'] = note(
    *authored('VghLantern__ProjectedEdges__ModelStage__.mjs',
              "ValeVision's own 1.1.0 (18-Sep-2026) was TrueVision's 1.2.0, the content stamp"),
    '// - Source version: 1.2.0 (TrueVision3D v2.64.1, 18-Sep-2026; read at b2aa9151) - new here is its 1.1.0,',
    '//                   the edge rules in the fingerprint (TrueVision3D v2.37.0, 14-Sep-2026)',
    PORTED_ON,
    '// - Parity        : verbatim',
    '// - Divergences   :',
    '//   - Banner reads ValeVision3D. (No console output in this file.)',
    '// - Back-port     : none.')

NOTES['Pipeline'] = note(
    *authored('VghLantern__ProjectedEdges__Pipeline__.mjs',
              "ValeVision's own 1.1.0 (10-Sep-2026) followed, and ForgetCollections (unlogged, v2.57.0)"),
    '// - Source version: 1.5.0 (TrueVision3D v2.105.0, 21-Sep-2026; read at b2aa9151)',
    PORTED_ON,
    '// - Parity        : verbatim. The optional model root and fingerprint of 1.2.0 (TrueVision3D v2.32.0, its',
    '//                   design phases) come across as TrueVision wrote them (DR-09 (a)): no caller in this app',
    '//                   passes either, so every render describes and collects the live model as before; the two',
    '//                   comments that name TrueVision as their caller are kept. The VV-only consumers',
    '//                   (Na__PlOverlay__SyncFrame each drawing frame, Na__PlStore__BakeBeforeSave in the drawing',
    '//                   editors, Na__PlExport__Apply in image export, the na-model-visibility-changed dispatch)',
    '//                   live in their own host files and are untouched (S02b-V01).',
    '// - Divergences   :',
    '//   - Banner and console prefix read ValeVision3D.',
    '// - Back-port     : none.')

NOTES['Projector'] = note(
    *authored('VghLantern__ProjectedEdges__Projector__.mjs',
              "ValeVision's own 1.1.0 and 1.1.1 followed, 1.1.1 being TrueVision's 1.4.1"),
    '// - Source version: 1.5.0 (TrueVision3D v2.105.0, 21-Sep-2026; read at b2aa9151)',
    PORTED_ON,
    '// - Parity        : verbatim',
    '// - Divergences   :',
    '//   - Banner and console prefix read ValeVision3D.',
    '// - Back-port     : none.')

NOTES['StageSampler'] = note(
    *authored('VghLantern__ProjectedEdges__StageSampler__.mjs',
              "ValeVision's own 1.1.0 (13-Sep-2026) took TrueVision's owner table"),
    '// - Source version: 1.2.0 (TrueVision3D v2.98.0, 21-Sep-2026; read at b2aa9151) - the module log dates',
    '//                   1.2.0 20-Sep-2026; it shipped in the commits of v2.95.0 and v2.98.0 and no TrueVision',
    '//                   devlog entry names it. Its 1.1.0 is TrueVision3D v2.42.0 (posed door panels).',
    PORTED_ON,
    '// - Parity        : verbatim',
    '// - Divergences   :',
    '//   - Banner reads ValeVision3D. (No console output in this file.)',
    '//   - The name-matching comment\'s example category reads ValeVision__MainBuildingModel__Existing',
    "//     (TrueVision__ in TrueVision): a runtime category key carries the app's token (K2 K3).",
    '// - Back-port     : none.')

NOTES['ViewDefinition'] = note(
    *authored('VghLantern__ProjectedEdges__Projector__.mjs (basis table only)',
              "it stayed at 1.0.0 here until this port"),
    '// - Source version: 1.2.0 (TrueVision3D v2.48.1, 14-Sep-2026; read at b2aa9151)',
    PORTED_ON,
    '// - Parity        : verbatim. A definition built outside the Layout Editor carries DoorPose null, which the',
    '//                   record hash leaves out, so every existing hash is unchanged. Flags reads both the',
    "//                   record's Styles__X and the viewport's x spelling; this app's GetStyles answers the",
    '//                   viewport spelling, so the value read is the same as before.',
    '// - Divergences   :',
    '//   - Banner reads ValeVision3D. (No console output in this file.)',
    '// - Back-port     : none.')

NOTES['WebGpuBackend'] = note(
    *authored('VghLantern__ProjectedEdges__WebGpuBackend__.mjs',
              "the code is unchanged since; only TrueVision's comments differ"),
    '// - Source version: 1.0.0 (TrueVision3D v2.21.0, 10-Sep-2026; read at b2aa9151)',
    PORTED_ON,
    '// - Parity        : verbatim (a comment sync: the code was already identical)',
    '// - Divergences   :',
    '//   - Banner and console prefix read ValeVision3D.',
    '// - Back-port     : none.')


# -----------------------------------------------------------------------------
# Per-file seams (after the banner and the PORT NOTE): (old, new, count)
# -----------------------------------------------------------------------------

SEAMS = {
    'AuthoredEdges': [
        ('// - Every TrueVision model ships a linework GLB beside its mesh GLB: the\n',
         '// - Every ValeVision model ships a linework GLB beside its mesh GLB: the\n', 1),
    ],
    'ClipKernel': [
        ('//   5  SEAMS OCCLUDE (options.SeamsOcclude - a TrueVision switch, off for Run Diff)\n',
         '//   5  SEAMS OCCLUDE (options.SeamsOcclude - a ValeVision switch, off for Run Diff)\n', 1),
    ],
    'ConfigAccess': [
        console(2),
        ("OwnerKey : 'TrueVision__LineworkModifier__", "OwnerKey : 'ValeVision__LineworkModifier__", 4),
        ("        buildToken              : '2026-09-21-storey-swings',\n",
         "        buildToken              : '" + VV_BUILD_TOKEN + "',\n", 1),
    ],
    'CpuBackend': [],
    'DevMenu__Controls': [console(1)],
    'DoorPose': [],
    'EdgeExtractor': [
        console(1),
        ('//   component metadata. No TrueVision GLB carries it yet; the branch is kept\n',
         '//   component metadata. No ValeVision GLB carries it yet; the branch is kept\n', 1),
    ],
    'ModelStage': [],
    'Pipeline': [console(8)],
    'Projector': [console(5)],
    'StageSampler': [
        ('"TrueVision__MainBuildingModel__Existing"', '"ValeVision__MainBuildingModel__Existing"', 1),
    ],
    'ViewDefinition': [],
    'WebGpuBackend': [console(2)],
}

BANNERS = {
    'AuthoredEdges': 'PROJECTED LINEWORK - AUTHORED EDGES',
    'ClipKernel': 'PROJECTED LINEWORK - CLIP KERNEL',
    'ConfigAccess': 'PROJECTED LINEWORK - CONFIG ACCESS',
    'CpuBackend': 'PROJECTED LINEWORK - CPU BACKEND',
    'DevMenu__Controls': 'PROJECTED LINEWORK - DEV MENU CONTROLS',
    'DoorPose': 'PROJECTED LINEWORK - DOOR POSE',
    'EdgeExtractor': 'PROJECTED LINEWORK - EDGE EXTRACTOR',
    'ModelStage': 'PROJECTED LINEWORK - MODEL STAGE',
    'Pipeline': 'PROJECTED LINEWORK - PIPELINE',
    'Projector': 'PROJECTED LINEWORK - PROJECTOR',
    'StageSampler': 'PROJECTED LINEWORK - STAGE SAMPLER',
    'ViewDefinition': 'PROJECTED LINEWORK - VIEW DEFINITION',
    'WebGpuBackend': 'PROJECTED LINEWORK - WEBGPU BACKEND',
}

# Lines that may still say "TrueVision" outside the PORT NOTE and the DEVELOPMENT LOG (they name TrueVision as
# the app that uses the feature, never the running app).
ALLOWED_TV_WORD = {
    'Pipeline': ['    // modelRoot (TrueVision) projects a model other than the live one: a',
                 '    // modelFingerprint (TrueVision) names a model other than the live one - a'],
}


def module_triples(name, tv):
    triples = [banner(BANNERS[name]), (tv_port_note(tv), NOTES[name], 1)]
    return triples + SEAMS[name]


def json_triples(tv):
    return [
        ('"OwnerKey": "TrueVision__LineworkModifier__', '"OwnerKey": "ValeVision__LineworkModifier__', 4),
        (' Exact match against the tag name, not a substring.', '', 1),
        ('"ProjectedLinework__Model__BuildToken": "2026-09-23-flush-tolerance"',
         '"ProjectedLinework__Model__BuildToken": "' + VV_BUILD_TOKEN + '"', 1),
    ]


TEST_PORT_NOTE = lines(
    '// PORT NOTE:',
    '// - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__StoreyBand__.test.mjs',
    '// - Source version: 1.0.0 (TrueVision3D v2.105.0, 21-Sep-2026; read at b2aa9151)',
    '// - Ported on     : ' + TODAY + ' for ValeVision3D ' + TOKEN + ', with the folder-50 port it proves',
    "// - Parity        : verbatim - every check is TrueVision's, run against this app's own Storeys module,",
    '//                   ConfigAccess fallbacks and shipped AppConfig. TrueVision\'s own run fails one check',
    "//                   (\"the fallback build token equals the shipped one\", S02b-F33); this app's pass.",
    '// - Divergences   :',
    '//   - Banner and the run title read ValeVision3D.',
    "//   - The fixture keeps every number but no longer names the TrueVision project it was measured on",
    "//     (DESCRIPTION, the fixture region and its constant, three check labels and one comment; S02b-F49),",
    "//     and the project prefix in front of a storey key is a neutral PRJ01__.",
    "//   - The model category keys read ValeVision__ (TrueVision__ in TrueVision), as this app's loader",
    '//     names them (K2 K3); every expected answer is unchanged.',
    '// - Back-port     : none.',
    '//',
    RULE,
    '//')


def test_triples(tv):
    return [
        ('// TRUEVISION3D - TEST - PROJECTED LINEWORK - STOREY BAND\n',
         '// VALEVISION3D - TEST - PROJECTED LINEWORK - STOREY BAND\n', 1),
        ('// DEVELOPMENT LOG:\n', TEST_PORT_NOTE + '// DEVELOPMENT LOG:\n', 1),
        ('// - THE FIXTURE IS RB05 WEST FARM, the house that showed the fault: three\n',
         '// - THE FIXTURE IS A MEASURED HOUSE, the house that showed the fault: three\n', 1),
        ('// REGION | Fixture - RB05 West Farm\n', '// REGION | Fixture - A Measured House\n', 1),
        ("'RB05__Storey__GroundFloor__ProposedWalls'", "'PRJ01__Storey__GroundFloor__ProposedWalls'", 1),
        ("'RB05 has three floors, bottom to top'", "'the house has three floors, bottom to top'", 1),
        ("'RB05 floors stand at 0, 4.2 and 7.5 m'", "'the house floors stand at 0, 4.2 and 7.5 m'", 1),
        ('door swings drawn at their floor, RB05 heights', 'door swings drawn at their floor, the measured heights', 1),
        ("'the automatic swings of RB05 land on their own plan only", "'the automatic swings of the house land on their own plan only", 1),
        ('RB05', 'DOORS', 5),
        ("console.log('TrueVision3D - projected linework storey band');",
         "console.log('ValeVision3D - projected linework storey band');", 1),
        ("'TrueVision__MainBuildingModel__ProposedDoors'", "'ValeVision__MainBuildingModel__ProposedDoors'", 1),
        ("'TrueVision__Linetype__", "'ValeVision__Linetype__", 5),
    ]


MODULES = ['AuthoredEdges', 'ClipKernel', 'ConfigAccess', 'CpuBackend', 'DevMenu__Controls', 'DoorPose',
           'EdgeExtractor', 'ModelStage', 'Pipeline', 'Projector', 'StageSampler', 'ViewDefinition', 'WebGpuBackend']

FILES = [(F50 + 'Na__ProjectedLinework__' + m + '__.js', 'module', m) for m in MODULES]
FILES.append((F50 + 'Na__ProjectedLinework__AppConfig__.json', 'json', None))
FILES.append(('80__Testing__PrototypeEnvironment/Na__Test__StoreyBand__.test.mjs', 'test', None))
NEW_FILES = {F50 + 'Na__ProjectedLinework__DoorPose__.js', '80__Testing__PrototypeEnvironment/Na__Test__StoreyBand__.test.mjs'}


def apply(text, triples, label):
    for old, new, count in triples:
        found = text.count(old)
        if found != count:
            raise SystemExit('ANCHOR FAILED (%s): %r expected %d, found %d' % (label, old[:70], count, found))
        text = text.replace(old, new)
    return text


def reverse(text, triples, label):
    for old, new, count in reversed(triples):
        if new == '':
            raise SystemExit('cannot reverse a deletion blindly (%s)' % label)
        found = text.count(new)
        if found != count:
            raise SystemExit('REVERSE FAILED (%s): %r expected %d, found %d' % (label, new[:70], count, found))
        text = text.replace(new, old)
    return text


def triples_for(kind, name, tv):
    if kind == 'module':
        return module_triples(name, tv)
    if kind == 'json':
        return json_triples(tv)
    return test_triples(tv)


def section_bounds(text):
    rows = text.split('\n')
    start = next(i for i, r in enumerate(rows) if r.startswith('// PORT NOTE:'))
    log = next(i for i, r in enumerate(rows) if r.startswith('// DEVELOPMENT LOG:'))
    end_log = next(i for i in range(log + 1, len(rows)) if r_is_close(rows[i]))
    return rows, start, log, end_log


def r_is_close(row):
    return row.startswith('// ====')


def checks(kind, name, tv, vv, triples):
    problems = []
    if '\r' in vv:
        problems.append('CR found')
    if kind == 'json':
        try:
            json.loads(vv)
        except ValueError as error:
            problems.append('JSON does not parse: %s' % error)
        if 'TrueVision' in vv:
            problems.append('TrueVision left in the JSON')
        return problems
    if 'TRUEVISION3D' in vv:
        problems.append('TRUEVISION3D banner token left')
    if '[TrueVision3D' in vv:
        problems.append('[TrueVision3D console prefix left')
    if vv.count(TOKEN) != 1:
        problems.append('expected one %s, found %d' % (TOKEN, vv.count(TOKEN)))
    rows, start, log, end_log = section_bounds(vv)
    allowed = ALLOWED_TV_WORD.get(name, [])
    for i, row in enumerate(rows):
        in_note = start <= i < log
        in_log = log <= i <= end_log
        if in_note or in_log:
            continue
        if kind == 'test' and i < start:
            pass
        if 'TrueVision__' in row:
            problems.append('TrueVision__ literal outside PORT NOTE/log at %d: %s' % (i + 1, row.strip()))
        elif 'TrueVision' in row and row not in allowed:
            problems.append('TrueVision named outside PORT NOTE/log at %d: %s' % (i + 1, row.strip()))
    if kind == 'test' and 'RB05' in vv:
        problems.append('RB05 left in the test')
    back = reverse(vv, triples, name or kind)
    if back != tv:
        problems.append('reverse seams do not give TrueVision\'s bytes back')
    return problems


def sha1(data):
    return hashlib.sha1(data).hexdigest()


def build_all():
    built = []
    failed = False
    os.makedirs(os.path.join(HERE, 'diffs'), exist_ok=True)
    for rel, kind, name in FILES:
        raw = tv_bytes(rel)
        if b'\r' in raw:
            raise SystemExit('TrueVision bytes for %s carry CR' % rel)
        tv = raw.decode('utf-8')
        triples = triples_for(kind, name, tv)
        vv = apply(tv, triples, rel)
        problems = checks(kind, name, tv, vv, triples) if kind != 'json' else checks(kind, name, tv, vv, triples)
        if kind == 'json':
            # the deletion cannot be reversed blindly: reverse by re-inserting at the one known place
            back = vv.replace('"' + VV_BUILD_TOKEN + '"', '"2026-09-23-flush-tolerance"')
            back = back.replace('ValeVision__LineworkModifier__', 'TrueVision__LineworkModifier__')
            anchor = 'the parent\'s tag is never inspected.'
            back = back.replace(anchor, anchor + ' Exact match against the tag name, not a substring.', 1)
            if back != tv:
                problems.append('JSON reverse seams do not give TrueVision\'s bytes back')
        data = vv.encode('utf-8')
        target = os.path.join(VV_ROOT, rel.replace('/', os.sep))
        built.append((rel, target, data, raw))
        diff = ''.join(difflib.unified_diff(tv.splitlines(True), vv.splitlines(True), 'TV@' + PIN + '/' + rel, 'VV/' + rel))
        with open(os.path.join(HERE, 'diffs', os.path.basename(rel) + '.diff'), 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(diff)
        print('%-82s TV %5d lines %s -> VV %5d lines %s' % (rel, tv.count('\n'), sha1(raw)[:10], vv.count('\n'), sha1(data)[:10]))
        for p in problems:
            print('    PROBLEM: ' + p)
            failed = True
    if failed:
        raise SystemExit('Checks failed: nothing written.')
    return built


def preimage_path(rel):
    return os.path.join(HERE, 'vv_pre', os.path.basename(rel))


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--check'
    if mode not in ('--check', '--write', '--verify', '--restore'):
        raise SystemExit(__doc__)
    built = build_all()
    if mode == '--check':
        print('\n--check: built and checked in memory; diffs in diffs/; nothing written.')
        return
    if mode == '--write':
        for rel, target, data, _ in built:
            if rel in NEW_FILES:
                if os.path.exists(target) and open(target, 'rb').read() != data:
                    raise SystemExit('REFUSED: new file %s already exists with other content' % rel)
                continue
            pre = open(preimage_path(rel), 'rb').read()
            live = open(target, 'rb').read()
            if live != pre and live != data:
                raise SystemExit('REFUSED: %s changed since its pre-image was taken' % rel)
        for rel, target, data, _ in built:
            if os.path.exists(target) and open(target, 'rb').read() == data:
                print('unchanged  ' + rel)
                continue
            with open(target, 'wb') as fh:
                fh.write(data)
            print('written    %s (%d bytes, sha1 %s)' % (rel, len(data), sha1(data)))
        return
    if mode == '--verify':
        bad = 0
        for rel, target, data, _ in built:
            live = open(target, 'rb').read() if os.path.exists(target) else None
            ok = live == data
            bad += 0 if ok else 1
            print('%-6s %s' % ('ok' if ok else 'DIFF', rel))
        print('verify: %d problem(s)' % bad)
        sys.exit(1 if bad else 0)
    if mode == '--restore':
        for rel, target, data, _ in built:
            if os.path.exists(target) and open(target, 'rb').read() != data:
                raise SystemExit('REFUSED: %s differs from this build; left alone' % rel)
        for rel, target, data, _ in built:
            if rel in NEW_FILES:
                if os.path.exists(target):
                    os.remove(target)
                    print('removed    ' + rel)
            else:
                with open(target, 'wb') as fh:
                    fh.write(open(preimage_path(rel), 'rb').read())
                print('restored   ' + rel)


if __name__ == '__main__':
    main()
