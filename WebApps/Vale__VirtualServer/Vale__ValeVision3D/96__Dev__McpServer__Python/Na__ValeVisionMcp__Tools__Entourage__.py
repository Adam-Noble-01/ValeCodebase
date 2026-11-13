# =============================================================================
# VALEVISION 3D MCP - TOOLS - A PROJECT'S PEOPLE
# =============================================================================
#
# FILE       : Na__ValeVisionMcp__Tools__Entourage__.py
# PURPOSE    : List the entourage library, bring new figures into it from SketchUp, read a
#              project's figures as the app will draw them, and change them
# CREATED    : 05-Nov-2026
#
# DESCRIPTION:
# - Adam, 05-Nov-2026: "Utilise MCP Tools, and write new ones if needed". The plants' tools
#   (Na__ValeVisionMcp__Tools__Vegetation__.py) in the same shape.
# - WHAT A FIGURE DRAWS IS WORKED OUT BY THE APP'S OWN MODULES, in Node, not by a copy of its sums
#   (Na__ValeVisionMcp__EntourageSums__.mjs).
# - THE KEY IS WRITTEN WHOLE AND LAID OVER THE APP'S DEFAULTS FIRST, as Na__EntData__Normalise does
#   when the page reads it: every parameter present, and a key this version does not know is kept.
# - EVERY ASSET A FIGURE NAMES IS PINNED, a plain copy of the library's file, as Na__EntLib__PinAsset:
#   a project keeps drawing what it was drawn with.
# - A CHANGE TO REAL DATA ASKS FOR confirm_real_data, and first asks the server whether its copy is
#   newer than this PC's: newer wins on a push.
# - IMPORTING A COMPONENT TALKS TO SKETCHUP through the Na SketchUp MCP's bridge, with its own client,
#   su_bridge.py. It loads each .skp inside an operation it then aborts, so the open model ends as
#   it began. The core component library stays the master of a figure's drawing.
#
# FRAMES:
# - Integer mm in three.js axes, Y up, as saved. A figure has no turn: it always faces the camera.
#
# =============================================================================

import copy
import importlib.util
import json
import os
import random
import subprocess
import sys
import tempfile
from pathlib import Path

import Na__ValeVisionMcp__Server__Core__ as Na__Core
from Na__ValeVisionMcp__Server__Core__ import Na__Result__Data, Na__Tool, Na__ToolError
import Na__ValeVisionMcp__Tools__LiveApp__ as Na__LiveApp
from Na__ValeVisionMcp__Tools__Project__ import NA_TARGET_SCHEMA
from Na__ValeVisionMcp__Tools__Vegetation__ import Na__VegEdit__RefuseIfServerNewer

NA_KEY = 'Entourage__SceneData'
NA_LIBRARY_DIR = Na__Core.NA_APP_DIR / '54__Entourage__AssetLibrary'
NA_BUILD_UTIL = NA_LIBRARY_DIR / 'Na__Entourage__BuildUtil__Library__.py'
NA_CONFIG_FILE = Na__Core.NA_APP_DIR / '02__Src__AppModules' / '23__System__Entourage' / 'Na__Entourage__AppConfig__.json'
NA_SUMS_FILE = Na__Core.NA_HERE / 'Na__ValeVisionMcp__EntourageSums__.mjs'
NA_SKP_READER = Na__Core.NA_HERE / 'Na__ValeVisionMcp__EntourageSkpReader__.rb'
NA_SOURCE_FOLDER = r'D:\06_CoreLib__Web3D\SketchUp__SourceFiles\10__SketchUp__CoreComponentLib\Na__CoreLib__3dAssets\60__Scene__Entourage__2D'
NA_SU_BRIDGE = Na__Core.NA_APP_DIR.parents[3] / '08__Cloud__Repo__AgentSkills__Private' / '10-mcp-sketchup-3d-modeling-expert' / 'mcp-sketchup-3d-modeling-expert' / 'scripts' / 'su_bridge.py'
NA_SEED_RANGE = 1000000000


# -----------------------------------------------------------------------------
# REGION | The Library
# -----------------------------------------------------------------------------

def Na__EntLibrary__Files():
    """Every asset in the library: {id: file}. An asset's file name starts with its id."""
    files = {}
    for path in sorted((NA_LIBRARY_DIR / '60__SceneEntourage').glob('VVL_*.json')):
        files['_'.join(path.name.split('_')[:3])] = path
    return files


@Na__Tool('vv3d_entourage_library', 'List the people in the library',
          'Every figure that can be placed: id, name, what it measures at scale 1, its keywords, and the SketchUp component it came from.', read_only=True)
def Na__Tool__EntourageLibrary(_arguments):
    rows = []
    for asset_id, path in Na__EntLibrary__Files().items():
        asset = json.loads(path.read_text(encoding='utf-8'))
        size = asset['Asset__Size']
        rows.append({'id': asset_id, 'name': asset.get('Asset__Name'), 'kind': asset['Asset__Figure']['Figure__Kind'],
                     'measuresMm': {'width': size.get('Size__WidthMm'), 'height': size.get('Size__HeightMm')},
                     'keywords': asset['Asset__Catalogue']['Catalogue__Keywords'], 'source': asset['Asset__Source']['Source__SketchUpFile']})
    return Na__Result__Data({'assets': rows})


def Na__EntLibrary__Bridge():
    """The Na SketchUp MCP's own client, loaded from its skill."""
    if not NA_SU_BRIDGE.is_file():
        raise Na__ToolError('su_bridge.py is not at %s.' % NA_SU_BRIDGE, 'It belongs to the mcp-sketchup-3d-modeling-expert skill.')
    spec = importlib.util.spec_from_file_location('na_su_bridge', NA_SU_BRIDGE)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def Na__EntLibrary__RunTool(arguments):
    done = subprocess.run([sys.executable, str(NA_BUILD_UTIL)] + arguments, capture_output=True, text=True, encoding='utf-8', timeout=120)
    return done.returncode, (done.stdout + done.stderr).strip()


@Na__Tool('vv3d_entourage_import_skp', 'Bring SketchUp figures into the library',
          'Reads flat figure components from a folder of .skp files (default: the core component library\'s 60__Scene__Entourage__2D) through the running SketchUp, converts each to one asset file in 54__Entourage__AssetLibrary, then rewrites the index and validates. It changes nothing in the open model. A figure already in the library is left alone unless force is true. A new file needs a name: add it to NA__ENTLIB__NAMES in the build util, or rename it in the asset. Refuses with more than one SketchUp window running unless pid is given.',
          {'folder': {'type': 'string', 'description': 'Default: the core component library\'s entourage folder.'},
           'files': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Only these file names in the folder.'},
           'force': {'type': 'boolean', 'description': 'Replace assets already in the library. The drawing changes for new projects only: a project keeps its pinned copy.'},
           'pid': {'type': 'integer', 'description': 'Which SketchUp window, from sketchup_status.'}})
def Na__Tool__EntourageImportSkp(arguments):
    folder = arguments.get('folder') or NA_SOURCE_FOLDER
    if not os.path.isdir(folder):
        raise Na__ToolError('There is no folder %s.' % folder)
    bridge = Na__EntLibrary__Bridge()
    try:
        info = bridge.na_pick(arguments.get('pid'))
    except SystemExit as stop:
        raise Na__ToolError(str(stop), 'Open SketchUp and tick Extensions > Na SketchUp MCP > Bridge Running, or pass pid.')

    # A SAVED MODEL IS SOMEONE'S WORK | The read changes nothing, but it must not land there by default
    ping = bridge.na_live(info) or {}
    if (ping.get('result') or {}).get('model_path') and arguments.get('pid') is None:
        raise Na__ToolError('The only SketchUp window has a saved model open: %s.' % bridge.na_title(ping),
                            'Ask the person to open an empty window, or pass that window\'s pid if they have said to use it.')

    handle, out_path = tempfile.mkstemp(prefix='Na__EntourageSkpRead__', suffix='.json')
    os.close(handle)
    forward = lambda text: Path(text).as_posix()
    only = json.dumps(arguments.get('files')) if arguments.get('files') else 'nil'
    code = "load %s\nNa__EntourageSkpReader.run(%s, %s, %s)" % (json.dumps(forward(NA_SKP_READER)), json.dumps(forward(folder)), json.dumps(forward(out_path)), only)
    reply = bridge.na_send(info, 'ruby_eval', {'code': code, 'transaction': False, 'operation_name': 'Read entourage components'}, timeout_s=180.0)
    if not reply.get('ok'):
        raise Na__ToolError('SketchUp could not read them: %s' % json.dumps(reply)[:800])
    try:
        steps = {}
        arguments_convert = ['convert', out_path] + (['--force'] if arguments.get('force') else [])
        code_convert, steps['convert'] = Na__EntLibrary__RunTool(arguments_convert)
        if code_convert != 0:
            raise Na__ToolError('The conversion failed: %s' % steps['convert'][-800:])
        _code_index, steps['index'] = Na__EntLibrary__RunTool(['index'])
        code_valid, steps['validate'] = Na__EntLibrary__RunTool(['validate'])
    finally:
        os.remove(out_path)
    return Na__Result__Data({'folder': folder, 'valid': code_valid == 0, 'steps': steps})

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | The Sums
# -----------------------------------------------------------------------------

def Na__EntSums__Run(scene_data):
    payload = {'sceneData': scene_data, 'appDir': str(Na__Core.NA_APP_DIR),
               'libraryFiles': {asset_id: str(path) for asset_id, path in Na__EntLibrary__Files().items()}}
    done = subprocess.run(['node', str(NA_SUMS_FILE)], input=json.dumps(payload), capture_output=True, text=True, encoding='utf-8', timeout=120)
    if done.returncode != 0:
        raise Na__ToolError('The figure sums failed: %s' % done.stderr.strip()[:800], 'Is Node 22 on the PATH?')
    return json.loads(done.stdout)

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Reading
# -----------------------------------------------------------------------------

@Na__Tool('vv3d_entourage_get', 'Read a project\'s people',
          'The figures as the app will draw them: whether it is switched on, transparency, line rules, and each figure\'s uid, asset, position, scale and what it measures.',
          {'project': {'type': 'string'}, 'target': NA_TARGET_SCHEMA},
          required=['project'], read_only=True)
def Na__Tool__EntourageGet(arguments):
    folder, path = Na__LiveApp.Na__Record__Locate(arguments['project'], arguments.get('target') or 'real')
    record = Na__Core.Na__Project__Read(path)
    raw = record.get(NA_KEY)
    if not raw:
        return Na__Result__Data({'project': folder.name, 'entourage': None, 'note': 'No key: this project has no entourage. Dev Tools > Assets > Entourage switches it on, or vv3d_entourage_edit with enabled true.'})
    sums = Na__EntSums__Run(raw)
    scene = sums['normalised']
    return Na__Result__Data({
        'project': folder.name,
        'rev': record.get('_rev', 0),
        'enabled': scene['Entourage__SceneData__Enabled'],
        'showByDefault': scene['Entourage__SceneData__ShowByDefault'],
        'defaultTransparencyPercent': scene['Entourage__SceneData__DefaultTransparencyPercent'],
        'showOnLiveDrawings': scene['Entourage__SceneData__ShowOnLiveDrawings'],
        'lineRules': scene['Entourage__SceneData__LineRules'],
        'pinnedAssets': sorted(scene['Entourage__SceneData__Assets']),
        'figures': sums['figures']
    })

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Changing
# -----------------------------------------------------------------------------

def Na__EntEdit__NextUid(figures):
    highest = 0
    for row in figures:
        text = str(row.get('Entourage__Figure__Uid', ''))
        if text.startswith('E') and text[1:].isdigit():
            highest = max(highest, int(text[1:]))
    return 'E%04d' % (highest + 1)


def Na__EntEdit__FindFigure(scene, uid):
    figures = scene['Entourage__SceneData__Figures']
    figure = next((row for row in figures if row.get('Entourage__Figure__Uid') == uid), None)
    if figure is None:
        raise Na__ToolError('There is no figure %s.' % uid, 'It has: %s.' % ', '.join(row.get('Entourage__Figure__Uid', '?') for row in figures))
    return figure


def Na__EntEdit__WriteScale(figure, scale, limits):
    value = float(scale)
    if not limits['min'] <= value <= limits['max']:
        raise Na__ToolError('A figure\'s scale runs from %s to %s.' % (limits['min'], limits['max']))
    if value == 1:
        figure.pop('Entourage__Figure__Scale', None)
    else:
        figure['Entourage__Figure__Scale'] = value


def Na__EntEdit__RequireAsset(scene, asset_id):
    if asset_id not in Na__EntLibrary__Files() and asset_id not in scene['Entourage__SceneData__Assets']:
        raise Na__ToolError('There is no asset %s.' % asset_id, 'vv3d_entourage_library lists them.')


def Na__EntEdit__PinNamed(scene):
    library = Na__EntLibrary__Files()
    pinned = scene['Entourage__SceneData__Assets']
    added = []
    for asset_id in sorted({row.get('Entourage__Figure__AssetId') for row in scene['Entourage__SceneData__Figures']}):
        if asset_id and asset_id not in pinned and asset_id in library:
            pinned[asset_id] = json.loads(library[asset_id].read_text(encoding='utf-8'))
            added.append(asset_id)
    return added


@Na__Tool('vv3d_entourage_edit', 'Change a project\'s people',
          'Switches entourage on, places, moves, scales, swaps and removes figures, and sets where viewers start and the line rules, then writes the record\'s Entourage__SceneData, with a revision kept, as a save in the app does. On target sandbox, try anything. On target real it needs confirm_real_data, and refuses if the server\'s copy is newer. dry_run says what would be drawn and writes nothing. Find a level to stand on with vv3d_probe_surface.',
          {'project': {'type': 'string'},
           'target': NA_TARGET_SCHEMA,
           'confirm_real_data': {'type': 'boolean'},
           'dry_run': {'type': 'boolean'},
           'enabled': {'type': 'boolean', 'description': 'The Dev Tools switch. true makes the key, every parameter in it, on a project that has none.'},
           'transparency_percent': {'type': 'number', 'minimum': 0, 'maximum': 100, 'description': 'Where every viewer opens the project. Staff also set it by moving the slider and saving.'},
           'show_by_default': {'type': 'boolean'},
           'show_on_live_drawings': {'type': 'boolean'},
           'line_rules': {'type': 'object', 'description': 'Any keys of Entourage__SceneData__LineRules, or of its Entourage__LineRules__Advanced, by their full names.'},
           'add': {'type': 'array', 'description': 'New figures.',
                   'items': {'type': 'object', 'required': ['asset_id', 'position_mm'], 'properties': {
                       'asset_id': {'type': 'string'},
                       'position_mm': {'type': 'array', 'items': {'type': 'number'}, 'minItems': 3, 'maxItems': 3, 'description': 'Where its feet stand. Integer mm, three.js axes.'},
                       'scale': {'type': 'number'}, 'seed': {'type': 'integer'}}}},
           'change': {'type': 'array', 'description': 'Figures already placed, by uid.',
                      'items': {'type': 'object', 'required': ['uid'], 'properties': {
                          'uid': {'type': 'string'}, 'asset_id': {'type': 'string', 'description': 'Swap the character: it keeps its spot, seed and scale.'},
                          'position_mm': {'type': 'array', 'items': {'type': 'number'}, 'minItems': 3, 'maxItems': 3},
                          'scale': {'type': 'number'}, 'seed': {'type': 'integer'}}}},
           'remove': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Uids to take out.'}},
          required=['project'], destructive=True)
def Na__Tool__EntourageEdit(arguments):
    target = arguments.get('target') or 'sandbox'
    dry_run = arguments.get('dry_run') is True
    folder, path = Na__LiveApp.Na__Record__Locate(arguments['project'], target)
    if target == 'real' and not dry_run:
        Na__Core.Na__Require__RealDataConfirmed(arguments)
        Na__VegEdit__RefuseIfServerNewer(folder)

    config = json.loads(NA_CONFIG_FILE.read_text(encoding='utf-8'))
    dev = config.get('Entourage__DevTools__Config') or {}
    limits = {'min': dev.get('Entourage__DevTools__ScaleMin', 0.5), 'max': dev.get('Entourage__DevTools__ScaleMax', 1.5)}
    outcome = {}

    def change(current):
        raw = current.get(NA_KEY)
        if not raw and arguments.get('enabled') is not True:
            raise Na__ToolError('This project has no entourage.', 'Pass enabled true to switch it on.')
        before = Na__EntSums__Run(raw or {})
        scene = copy.deepcopy(before['normalised'])
        if 'enabled' in arguments:
            scene['Entourage__SceneData__Enabled'] = arguments['enabled'] is True
        if 'transparency_percent' in arguments:
            scene['Entourage__SceneData__DefaultTransparencyPercent'] = arguments['transparency_percent']
        if 'show_by_default' in arguments:
            scene['Entourage__SceneData__ShowByDefault'] = arguments['show_by_default'] is True
        if 'show_on_live_drawings' in arguments:
            scene['Entourage__SceneData__ShowOnLiveDrawings'] = arguments['show_on_live_drawings'] is True
        rules = scene['Entourage__SceneData__LineRules']
        for key, value in (arguments.get('line_rules') or {}).items():
            if key in rules and key != 'Entourage__LineRules__Advanced':
                rules[key] = value
            elif key in rules['Entourage__LineRules__Advanced']:
                rules['Entourage__LineRules__Advanced'][key] = value
            else:
                raise Na__ToolError('There is no line rule %s.' % key, 'vv3d_entourage_get shows them all.')

        figures = scene['Entourage__SceneData__Figures']
        for uid in arguments.get('remove') or []:
            figures.remove(Na__EntEdit__FindFigure(scene, uid))
        for spec in arguments.get('change') or []:
            figure = Na__EntEdit__FindFigure(scene, spec['uid'])
            if 'asset_id' in spec:
                Na__EntEdit__RequireAsset(scene, spec['asset_id'])
                figure['Entourage__Figure__AssetId'] = spec['asset_id']
            if 'position_mm' in spec:
                figure['Entourage__Figure__PositionMm'] = [int(round(value)) for value in spec['position_mm']]
            if 'seed' in spec:
                figure['Entourage__Figure__Seed'] = int(spec['seed'])
            if 'scale' in spec:
                Na__EntEdit__WriteScale(figure, spec['scale'], limits)
        for spec in arguments.get('add') or []:
            Na__EntEdit__RequireAsset(scene, spec['asset_id'])
            figure = {'Entourage__Figure__Uid': Na__EntEdit__NextUid(figures),
                      'Entourage__Figure__AssetId': spec['asset_id'],
                      'Entourage__Figure__Seed': int(spec.get('seed') or random.randrange(NA_SEED_RANGE)),
                      'Entourage__Figure__PositionMm': [int(round(value)) for value in spec['position_mm']]}
            if 'scale' in spec:
                Na__EntEdit__WriteScale(figure, spec['scale'], limits)
            figures.append(figure)

        outcome['pinned'] = Na__EntEdit__PinNamed(scene)
        after = Na__EntSums__Run(scene)
        outcome['figures'] = after['figures']
        outcome['transparency'] = [before['normalised']['Entourage__SceneData__DefaultTransparencyPercent'],
                                   after['normalised']['Entourage__SceneData__DefaultTransparencyPercent']]
        return {NA_KEY: after['normalised']}, []

    if dry_run:
        change(Na__Core.Na__Project__Read(path))
        written = None
    else:
        written = Na__Core.Na__Record__Merge(folder, change)
    return Na__Result__Data({'project': folder.name, 'target': target, 'dryRun': dry_run, 'written': written, **outcome})

# endregion -------------------------------------------------------------------

# =============================================================================
# END OF FILE
# =============================================================================
