# =============================================================================
# VALEVISION 3D MCP - TOOLS - A PROJECT'S PLANTS
# =============================================================================
#
# FILE       : Na__ValeVisionMcp__Tools__Vegetation__.py
# PURPOSE    : Read a project's planting as the app will draw it, and change it: the
#              library, palettes, paths, transparency, and the one record key they live in
# CREATED    : 04-Nov-2026
#
# DESCRIPTION:
# - WHAT A PATH DRAWS IS WORKED OUT BY THE APP'S OWN MODULES, in Node, not by a copy of its
#   sums (Na__ValeVisionMcp__VegetationSums__.mjs). A path saves rules and a seed, never its
#   plants, so that is the only way to say what it will look like without opening the page.
# - THE KEY IS WRITTEN WHOLE AND LAID OVER THE APP'S DEFAULTS FIRST, as Na__VegData__Normalise
#   does when the page reads it: every parameter present (Adam: "save all parameters"), and a
#   key this version does not know is kept.
# - A PATH'S PLANT SCALE MOVES ITS SPACING BY THE SAME RATIO, as Na__VegPath__SetPlantScale
#   does for the slider, unless spacing_mm is given too. Half size is the same bed, smaller.
# - EVERY ASSET A PALETTE NAMES IS PINNED, a plain copy of the library's file, as
#   Na__VegLib__PinAsset (plan, D14): a project keeps drawing what it was drawn with.
# - A CHANGE TO REAL DATA ASKS FOR confirm_real_data, and first asks the server whether its copy
#   is newer than this PC's: newer wins on a push, so a stale edit would overwrite someone's work.
#
# FRAMES:
# - Integer mm in three.js axes, Y up, as saved.
#
# =============================================================================

import copy
import json
import subprocess

import Na__ValeVisionMcp__Server__Core__ as Na__Core
from Na__ValeVisionMcp__Server__Core__ import Na__Result__Data, Na__Tool, Na__ToolError
import Na__ValeVisionMcp__Tools__LiveApp__ as Na__LiveApp
from Na__ValeVisionMcp__Tools__Project__ import NA_TARGET_SCHEMA

NA_KEY = 'Vegetation__SceneData'
NA_SUMS_FILE = Na__Core.NA_HERE / 'Na__ValeVisionMcp__VegetationSums__.mjs'
NA_PATH_ADVANCED = {
    'rotation_variation_deg': 'Vegetation__PathAdvanced__RotationVariationDeg',
    'scale_variation_percent': 'Vegetation__PathAdvanced__ScaleVariationPercent',
    'height_variation_percent': 'Vegetation__PathAdvanced__HeightVariationPercent',
    'spacing_variation_percent': 'Vegetation__PathAdvanced__SpacingVariationPercent',
    'side_offset_mm': 'Vegetation__PathAdvanced__SideOffsetMm',
    'depth_across_mm': 'Vegetation__PathAdvanced__DepthAcrossMm',
    'height_fit_mm': 'Vegetation__PathAdvanced__HeightFitMm',
    'align_to_path': 'Vegetation__PathAdvanced__AlignToPath',
    'fit_last_plant': 'Vegetation__PathAdvanced__FitLastPlant'
}
NA_PATH_SCHEMA_ADVANCED = {
    'rotation_variation_deg': {'type': 'number'},
    'scale_variation_percent': {'type': 'number'},
    'height_variation_percent': {'type': 'number'},
    'spacing_variation_percent': {'type': 'number'},
    'side_offset_mm': {'type': 'number'},
    'depth_across_mm': {'type': 'number', 'description': 'Fit plants to a bed this deep. 0 is off.'},
    'height_fit_mm': {'type': 'number', 'description': 'Fit plants to this height. 0 is off.'},
    'align_to_path': {'type': 'boolean'},
    'fit_last_plant': {'type': 'boolean'}
}


# -----------------------------------------------------------------------------
# REGION | The Library
# -----------------------------------------------------------------------------

def Na__VegLibrary__Files():
    """Every asset in the library: {id: file}. An asset's file name starts with its id."""
    files = {}
    for path in sorted((Na__Core.NA_VEG_LIBRARY_DIR / '07__VegetationElements').glob('VVL_*.json')):
        files['_'.join(path.name.split('_')[:3])] = path
    return files


@Na__Tool('vv3d_vegetation_library', 'List the plants in the library',
          'Every asset that can be planted: id, name, what it measures at scale 1, whether it is clipped, what it is for.', read_only=True)
def Na__Tool__VegetationLibrary(_arguments):
    rows = []
    for asset_id, path in Na__VegLibrary__Files().items():
        recipe = json.loads(path.read_text(encoding='utf-8'))
        size = recipe['Asset__Size']
        place = recipe.get('Asset__Placement') or {}
        rows.append({'id': asset_id, 'name': recipe.get('Asset__Name'),
                     'measuresMm': {'width': size.get('Size__WidthMm'), 'depth': size.get('Size__DepthMm'), 'height': size.get('Size__HeightMm')},
                     'clipped': place.get('Placement__Clipped') is True, 'stretchesAlongPath': place.get('Placement__StretchAlongPath') is True,
                     'description': recipe.get('Asset__Description')})
    return Na__Result__Data({'assets': rows})

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | The Sums
# -----------------------------------------------------------------------------

def Na__VegSums__Run(scene_data):
    payload = {'sceneData': scene_data, 'appDir': str(Na__Core.NA_APP_DIR),
               'libraryFiles': {asset_id: str(path) for asset_id, path in Na__VegLibrary__Files().items()}}
    done = subprocess.run(['node', str(NA_SUMS_FILE)], input=json.dumps(payload), capture_output=True, text=True, encoding='utf-8', timeout=120)
    if done.returncode != 0:
        raise Na__ToolError('The plant sums failed: %s' % done.stderr.strip()[:800], 'Is Node 22 on the PATH?')
    return json.loads(done.stdout)


def Na__VegSums__Summary(sums):
    """Per path and overall: how many plants, of what, measuring what."""
    def ranges(plants):
        if not plants:
            return None
        sizes = [plant['measuresMm'] for plant in plants if plant['measuresMm']]
        return {name: [min(size[index] for size in sizes), max(size[index] for size in sizes)]
                for index, name in enumerate(('widthMm', 'depthMm', 'heightMm'))} if sizes else None

    def counts(plants):
        tally = {}
        for plant in plants:
            label = plant['assetName'] or plant['assetId']
            tally[label] = tally.get(label, 0) + 1
        return tally

    every = list(sums['plops'])
    paths = []
    for path in sums['paths']:
        every += path['plants']
        paths.append({'uid': path['uid'], 'name': path['name'], 'lengthMm': path['lengthMm'], 'spacingMm': path['spacingMm'],
                      'plantScale': path['plantScale'], 'plants': len(path['plants']), 'byAsset': counts(path['plants']), 'measures': ranges(path['plants'])})
    return {'totalPlants': len(every), 'byAsset': counts(every), 'measures': ranges(every), 'paths': paths, 'singlePlants': len(sums['plops'])}

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Reading
# -----------------------------------------------------------------------------

@Na__Tool('vv3d_vegetation_get', 'Read a project\'s planting',
          'The planting as the app will draw it: transparency, palettes, each path\'s length, spacing, scale and how many plants of what, with what they really measure. With include_plants, every plant\'s position and size too.',
          {'project': {'type': 'string'}, 'target': NA_TARGET_SCHEMA, 'include_plants': {'type': 'boolean'}},
          required=['project'], read_only=True)
def Na__Tool__VegetationGet(arguments):
    folder, path = Na__LiveApp.Na__Record__Locate(arguments['project'], arguments.get('target') or 'real')
    record = Na__Core.Na__Project__Read(path)
    raw = record.get(NA_KEY)
    if not raw:
        return Na__Result__Data({'project': folder.name, 'vegetation': None, 'note': 'No key: this project has no vegetation. Dev Tools > Vegetation switches it on.'})
    sums = Na__VegSums__Run(raw)
    scene = sums['normalised']
    answer = {
        'project': folder.name,
        'rev': record.get('_rev', 0),
        'enabled': scene['Vegetation__SceneData__Enabled'],
        'showByDefault': scene['Vegetation__SceneData__ShowByDefault'],
        'defaultTransparencyPercent': scene['Vegetation__SceneData__DefaultTransparencyPercent'],
        'pinnedAssets': sorted(scene['Vegetation__SceneData__Assets']),
        'palettes': [{'uid': row['Vegetation__Palette__Uid'], 'name': row.get('Vegetation__Palette__Name'),
                      'items': [{'assetId': item['Vegetation__PaletteItem__AssetId'], 'weight': item.get('Vegetation__PaletteItem__Weight'),
                                 'plantScale': item.get('Vegetation__PaletteItem__PlantScale', 1)} for item in row.get('Vegetation__Palette__Items') or []]}
                     for row in scene['Vegetation__SceneData__Palettes']],
        'summary': Na__VegSums__Summary(sums)
    }
    if arguments.get('include_plants'):
        answer['plants'] = {'paths': {row['uid']: row['plants'] for row in sums['paths']}, 'singlePlants': sums['plops']}
    return Na__Result__Data(answer)

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Changing
# -----------------------------------------------------------------------------

def Na__VegEdit__Palette(scene, spec):
    palettes = scene['Vegetation__SceneData__Palettes']
    uid = spec.get('uid')
    palette = next((row for row in palettes if row.get('Vegetation__Palette__Uid') == uid), None) if uid else None
    if palette is None:
        highest = 0
        for row in palettes:
            text = str(row.get('Vegetation__Palette__Uid', ''))
            if text.startswith('PAL') and text[3:].isdigit():
                highest = max(highest, int(text[3:]))
        palette = {'Vegetation__Palette__Uid': uid or 'PAL%04d' % (highest + 1), 'Vegetation__Palette__Name': spec.get('name') or 'Planting', 'Vegetation__Palette__Items': []}
        palettes.append(palette)
    if spec.get('name'):
        palette['Vegetation__Palette__Name'] = spec['name']
    if 'items' in spec:
        library = Na__VegLibrary__Files()
        items = []
        for item in spec['items']:
            asset_id = item['asset_id']
            if asset_id not in library and asset_id not in scene['Vegetation__SceneData__Assets']:
                raise Na__ToolError('There is no asset %s.' % asset_id, 'vv3d_vegetation_library lists them.')
            row = {'Vegetation__PaletteItem__AssetId': asset_id, 'Vegetation__PaletteItem__Weight': item.get('weight', 1)}
            if item.get('plant_scale') not in (None, 1):
                row['Vegetation__PaletteItem__PlantScale'] = item['plant_scale']
            items.append(row)
        palette['Vegetation__Palette__Items'] = items
    return palette['Vegetation__Palette__Uid']


def Na__VegEdit__PinNamed(scene):
    library = Na__VegLibrary__Files()
    pinned = scene['Vegetation__SceneData__Assets']
    named = {plop.get('Vegetation__Plop__AssetId') for plop in scene['Vegetation__SceneData__Plops']}
    for palette in scene['Vegetation__SceneData__Palettes']:
        named |= {item.get('Vegetation__PaletteItem__AssetId') for item in palette.get('Vegetation__Palette__Items') or []}
    added = []
    for asset_id in sorted(name for name in named if name):
        if asset_id not in pinned and asset_id in library:
            pinned[asset_id] = json.loads(library[asset_id].read_text(encoding='utf-8'))
            added.append(asset_id)
    return added


def Na__VegEdit__Path(scene, spec, limits):
    paths = scene['Vegetation__SceneData__Paths']
    uid = spec.get('uid')
    if spec.get('all'):
        targets = paths
    else:
        targets = [row for row in paths if row.get('Vegetation__Path__Uid') == uid]
        if not targets:
            raise Na__ToolError('There is no path %s.' % uid, 'It has: %s.' % ', '.join(row.get('Vegetation__Path__Uid', '?') for row in paths))
    for path in targets:
        if 'plant_scale' in spec:
            scale = float(spec['plant_scale'])
            if not limits['min'] <= scale <= limits['max']:
                raise Na__ToolError('A plant scale runs from %s to %s.' % (limits['min'], limits['max']))
            was = path.get('Vegetation__Path__PlantScale') or 1
            path['Vegetation__Path__PlantScale'] = scale
            path['Vegetation__Path__SpacingMm'] = int(round(path['Vegetation__Path__SpacingMm'] * scale / was))
        if 'spacing_mm' in spec:
            path['Vegetation__Path__SpacingMm'] = int(round(spec['spacing_mm']))
        if 'palette_uid' in spec:
            if not any(row.get('Vegetation__Palette__Uid') == spec['palette_uid'] for row in scene['Vegetation__SceneData__Palettes']):
                raise Na__ToolError('There is no palette %s.' % spec['palette_uid'])
            path['Vegetation__Path__PaletteUid'] = spec['palette_uid']
        if 'name' in spec:
            path['Vegetation__Path__Name'] = spec['name']
        if 'seed' in spec:
            path['Vegetation__Path__Seed'] = int(spec['seed'])
        if 'curved' in spec:
            path['Vegetation__Path__Curved'] = spec['curved'] is True
        if 'points_mm' in spec:
            path['Vegetation__Path__PointsMm'] = [[int(round(value)) for value in point] for point in spec['points_mm']]
        advanced = path.setdefault('Vegetation__Path__Advanced', {})
        for name, key in NA_PATH_ADVANCED.items():
            if name in spec:
                advanced[key] = spec[name]
        if 'spacing_mm' in spec and spec['spacing_mm'] < 200:
            raise Na__ToolError('Spacing has a floor of 200 mm: below it a slip makes thousands of plants.')


def Na__VegEdit__ToolDefaultsFrom(scene, uid):
    path = next((row for row in scene['Vegetation__SceneData__Paths'] if row.get('Vegetation__Path__Uid') == uid), None)
    if path is None:
        raise Na__ToolError('There is no path %s to take the tool\'s settings from.' % uid)
    own = ('Vegetation__Path__Uid', 'Vegetation__Path__Name', 'Vegetation__Path__PointsMm', 'Vegetation__Path__Seed')
    scene['Vegetation__SceneData__Tools']['Vegetation__Tools__Linear'] = {key: copy.deepcopy(value) for key, value in path.items() if key not in own}


def Na__VegEdit__NewPath(scene, spec):
    tools = scene.get('Vegetation__SceneData__Tools', {}).get('Vegetation__Tools__Linear', {})
    path = copy.deepcopy(tools)
    highest = 0
    for row in scene['Vegetation__SceneData__Paths']:
        text = str(row.get('Vegetation__Path__Uid', ''))
        if text.startswith('P') and text[1:].isdigit():
            highest = max(highest, int(text[1:]))
    uid = 'P%04d' % (highest + 1)
    path.update({'Vegetation__Path__Uid': uid, 'Vegetation__Path__Name': spec.get('name') or 'Path %d' % (highest + 1),
                 'Vegetation__Path__PointsMm': [[int(round(value)) for value in point] for point in spec['points_mm']],
                 'Vegetation__Path__Seed': int(spec.get('seed') or (highest + 1) * 104729)})
    scene['Vegetation__SceneData__Paths'].append(path)
    return uid


@Na__Tool('vv3d_vegetation_edit', 'Change a project\'s planting',
          'Changes the planting and writes the record\'s Vegetation__SceneData, with a revision kept, as a save in the app does. On target sandbox, try anything. On target real it needs confirm_real_data, and refuses if the server\'s copy is newer. dry_run says what would be drawn and writes nothing.',
          {'project': {'type': 'string'},
           'target': NA_TARGET_SCHEMA,
           'confirm_real_data': {'type': 'boolean'},
           'dry_run': {'type': 'boolean'},
           'transparency_percent': {'type': 'number', 'minimum': 0, 'maximum': 100, 'description': 'Where a viewer starts on a device that has not chosen. A device that has moved the slider keeps its own.'},
           'show_by_default': {'type': 'boolean'},
           'palettes': {'type': 'array', 'description': 'Change or add palettes. A palette with items has them replaced whole.',
                        'items': {'type': 'object', 'properties': {
                            'uid': {'type': 'string'}, 'name': {'type': 'string'},
                            'items': {'type': 'array', 'items': {'type': 'object', 'required': ['asset_id'], 'properties': {
                                'asset_id': {'type': 'string'}, 'weight': {'type': 'number'},
                                'plant_scale': {'type': 'number', 'description': 'This plant\'s own scale, on top of the path\'s.'}}}}}}},
           'paths': {'type': 'array', 'description': 'Change existing paths, by uid, or all: true for every path.',
                     'items': {'type': 'object', 'properties': dict({
                         'uid': {'type': 'string'}, 'all': {'type': 'boolean'}, 'name': {'type': 'string'},
                         'plant_scale': {'type': 'number', 'description': 'The whole plant, 0.10 to 3.00. Spacing follows by the same ratio unless spacing_mm is given too.'},
                         'spacing_mm': {'type': 'number'}, 'palette_uid': {'type': 'string'}, 'seed': {'type': 'integer'}, 'curved': {'type': 'boolean'},
                         'points_mm': {'type': 'array', 'items': {'type': 'array', 'items': {'type': 'number'}, 'minItems': 3, 'maxItems': 3}}},
                         **NA_PATH_SCHEMA_ADVANCED)}},
           'new_paths': {'type': 'array', 'description': 'Add paths, starting from the Linear Tool\'s saved settings. Give points_mm, then change them through paths in a later call if need be.',
                         'items': {'type': 'object', 'required': ['points_mm'], 'properties': {
                             'points_mm': {'type': 'array', 'items': {'type': 'array', 'items': {'type': 'number'}, 'minItems': 3, 'maxItems': 3}},
                             'name': {'type': 'string'}, 'seed': {'type': 'integer'}}}},
           'tool_defaults_from_path': {'type': 'string', 'description': 'A path\'s uid: the Linear Tool starts its next path from this one\'s scale, spacing, palette and rules, so a path someone draws later matches.'}},
          required=['project'], destructive=True)
def Na__Tool__VegetationEdit(arguments):
    target = arguments.get('target') or 'sandbox'
    dry_run = arguments.get('dry_run') is True
    folder, path = Na__LiveApp.Na__Record__Locate(arguments['project'], target)
    if target == 'real' and not dry_run:
        Na__Core.Na__Require__RealDataConfirmed(arguments)
        Na__VegEdit__RefuseIfServerNewer(folder)

    config = json.loads(Na__Core.NA_VEG_CONFIG_FILE.read_text(encoding='utf-8'))
    dev = config.get('Vegetation__DevTools__Config') or {}
    limits = {'min': dev.get('Vegetation__DevTools__PlantScaleMin', 0.1), 'max': dev.get('Vegetation__DevTools__PlantScaleMax', 3.0)}
    outcome = {}

    def change(current):
        raw = current.get(NA_KEY)
        if not raw:
            raise Na__ToolError('This project has no vegetation.', 'An author switches it on in Dev Tools > Vegetation.')
        before = Na__VegSums__Run(raw)
        scene = copy.deepcopy(before['normalised'])
        if 'transparency_percent' in arguments:
            scene['Vegetation__SceneData__DefaultTransparencyPercent'] = arguments['transparency_percent']
        if 'show_by_default' in arguments:
            scene['Vegetation__SceneData__ShowByDefault'] = arguments['show_by_default'] is True
        for spec in arguments.get('palettes') or []:
            Na__VegEdit__Palette(scene, spec)
        for spec in arguments.get('paths') or []:
            Na__VegEdit__Path(scene, spec, limits)
        for spec in arguments.get('new_paths') or []:
            Na__VegEdit__NewPath(scene, spec)
        if arguments.get('tool_defaults_from_path'):
            Na__VegEdit__ToolDefaultsFrom(scene, arguments['tool_defaults_from_path'])
        outcome['pinned'] = Na__VegEdit__PinNamed(scene)
        after = Na__VegSums__Run(scene)
        outcome['before'] = Na__VegSums__Summary(before)
        outcome['after'] = Na__VegSums__Summary(after)
        outcome['transparency'] = [before['normalised']['Vegetation__SceneData__DefaultTransparencyPercent'],
                                   after['normalised']['Vegetation__SceneData__DefaultTransparencyPercent']]
        return {NA_KEY: after['normalised']}, []

    if dry_run:
        change(Na__Core.Na__Project__Read(path))
        written = None
    else:
        written = Na__Core.Na__Record__Merge(folder, change)
    return Na__Result__Data({'project': folder.name, 'target': target, 'dryRun': dry_run, 'written': written, **outcome})


def Na__VegEdit__RefuseIfServerNewer(folder):
    scope = Na__Core.Na__Project__ScopeOf(folder)
    code, text, report = Na__Core.Na__Engine__Run(['compare', 'projects', '--scope', scope], timeout_s=180)
    if code != 0 or not report or not report.get('ok'):
        raise Na__ToolError('Could not ask the server about %s: %s' % (folder.name, text[-400:]), 'A gateway refusal is not retried: read it and tell the person.')
    counts = report['plans']['projects']['counts']
    if counts.get('shared_collect', 0) > 0:
        raise Na__ToolError('The server\'s copy of %s is newer than this PC\'s, and newer wins on a push.' % folder.name,
                            'Call vv3d_server_collect_project first, so this change is made on top of it.')


@Na__Tool('vv3d_promote_to_real', 'Copy a sandbox key to the real record',
          'Copies named top-level keys from the sandbox record into the real one on this PC, with a revision kept. Only keys that changed in the sandbox and that the person asked for. Refuses if the server\'s copy is newer. Then vv3d_server_push_project sends it.',
          {'project': {'type': 'string'}, 'keys': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Default Vegetation__SceneData.'},
           'confirm_real_data': {'type': 'boolean'}},
          required=['project'], destructive=True)
def Na__Tool__PromoteToReal(arguments):
    Na__Core.Na__Require__RealDataConfirmed(arguments)
    keys = arguments.get('keys') or [NA_KEY]
    if '_rev' in keys:
        raise Na__ToolError('_rev belongs to the writer.')
    _sandbox_folder, sandbox_path = Na__LiveApp.Na__Record__Locate(arguments['project'], 'sandbox')
    folder, _real_path = Na__LiveApp.Na__Record__Locate(arguments['project'], 'real')
    Na__VegEdit__RefuseIfServerNewer(folder)
    sandbox = Na__Core.Na__Project__Read(sandbox_path)
    missing = [key for key in keys if key not in sandbox]
    if missing:
        raise Na__ToolError('The sandbox record has no %s.' % ', '.join(missing))
    written = Na__Core.Na__Record__Merge(folder, lambda current: ({key: sandbox[key] for key in keys}, []))
    return Na__Result__Data({'project': folder.name, 'keys': keys, 'written': written})

# endregion -------------------------------------------------------------------

# =============================================================================
# END OF FILE
# =============================================================================
