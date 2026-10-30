#!/usr/bin/env python3
# =============================================================================
# VALEVISION AURA - API - A PROJECT'S SCENE (THE "AURA FILE")
# =============================================================================
#
# FILE       : AuraRender__Api__Scene__.py
# MODULE     : AURA API Scene
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : A project's AURA scene: read it, and make it (or bring it up to
#              date) from ValeVision 3D's whitecard GLBs - method one
# CREATED    : 30-Oct-2026
#
# DESCRIPTION:
# - THE SCENE is schema 1.0.0 (Vale__ValeVision__AuraRender/05__Contracts__
#   JsonSchemas/AuraRender__Schema__AuraScene__1.0.0__.json; the rules:
#   AuraRender__SCHEMA__AuraScene__.md): one per project, user data in
#     <project>/ValeVision__AuraRender/UserData__AuraScene/<id>__AuraScene__.json
#   written through ValeShared__Library__ (the _rev check, a kept revision).
# - THE IMPORT COPIES, never links (Adam: "copy all GLB files accross"): every
#   GLB of ValeVision3D/Content__3dModel__GlbFiles (checked against the
#   record's valeVision_ModelUrls) byte for byte into Content__AuraScene__
#   ModelFiles, names unchanged, each copy's SHA-256 checked against its
#   source. A SketchUp sync replacing ValeVision 3D's files never changes a
#   finished drawing. A copy already holding the same bytes is left as it is;
#   any other is written beside it and renamed into place, so a copy the
#   Server Manager pushed (its pusher's, mode 644) never stops the API.
# - A RE-IMPORT KEEPS THE LAST SAVE, ONE ZIP (Adam: "zipped and archived, keep
#   the last save, deleted each subiquent zip once one is backed up as a
#   failsage"): the files it replaces go into 00__Archive/<id>__Aura
#   ArchivedModelFiles__Import-NN__DD-Mon-YYYY__.zip, the zip is read back and
#   every file's hash checked, and only then are older zips deleted.
# - OBJECT IDS NEVER MOVE: a re-import finds each node again by its file and
#   name, then by SketchUp's persistent id, keeps its Id (and its name,
#   category, material and role); a new node takes the next free Id; a node
#   that has gone keeps its Id, marked Object__Missing. Material assignments
#   in the drawing set ('#Id') keep meaning the same object.
# - THE IMPORT RULES (use, role, category, starting material, by file name)
#   are AURA's config (AuraConfig__SceneImport__*), the same file the page reads.
# - A LIBRARY ASSET IS STORED ONCE (Adam: "save a copy but instance it where
#   possible"): when a drawing set is saved with an asset the scene has not
#   stored, its MOD .glb and DAT .json are copied, library names unchanged,
#   from the engine AURA's import map pins into Content__AuraScene__AssetFiles
#   and listed in AuraScene__AssetFiles (store_assets, called by the drawing
#   set's save). One record per asset Id however many placements; a project
#   with no scene yet stores nothing (the scene is made on its first open).
#   An asset the pin cannot give (no MOD .glb) is left for a later save.
# - TWO SOURCES, ONE IMPORT (Adam, 30-Oct-2026: "update the model on the Vale
#   server, exporting new GLBs, archiving the old one in a zip file, and
#   replacing it ... but keeping all of the other assets"): method one copies
#   ValeVision 3D's whitecard; method two (SketchUpScenePackage) copies the set
#   ValeVision Cloud Sync's Sync Aura pushes into Content__AuraScenePackages,
#   so AURA's model can follow SketchUp without touching what ValeVision 3D
#   shows. Both run the same archive, the same Id rules and keep the same
#   placement and stored assets. An import that names no source keeps the
#   scene's own; a new scene starts from ValeVision 3D.
# - WHO: Management and AppAdmin, on projects switched on for AURA, as every
#   project route.
#
# ROUTES:
#   GET  /api/projects/<id>/scene          the scene and its _rev, or null; where its model and asset files are served;
#                                          whether its source has a set, and a newer one than the scene's
#   POST /api/projects/<id>/scene/import   make the scene, or bring it up to date, from a source:
#                                          {"source": "ValeVision3D" | "SketchUp", "modelName": "..."}, both optional
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 30-Oct-2026 - Version 1.2.0
# - Method two: the import reads Content__AuraScenePackages (ValeVision Cloud
#   Sync's Sync Aura) when asked for source "SketchUp", or when the scene was
#   made that way and the call names no source. GET scene's source block says
#   which source it compared against (Method, Label), so the page's "newer"
#   note names the right app.
#
# 30-Oct-2026 - Version 1.1.0
# - Library assets stored: store_assets copies a placed asset's MOD and DAT
#   from the pinned engine (the import map's PainterlyNPR/ folder) into
#   Content__AuraScene__AssetFiles once, and adds its AuraScene__AssetFiles
#   record, under the import's lock and through the library writer (_rev).
#   GET scene also says where the asset files are served (assetBase).
#
# 30-Oct-2026 - Version 1.0.1
# - A copy is never opened over an existing file: same bytes are left alone,
#   anything else is written beside it and renamed into place. Thrower's first
#   import on the server could not have written over the 7 copies pushed from
#   the PC (adam, mode 644; the API runs as valeapp).
#
# 30-Oct-2026 - Version 1.0.0
# - Initial build, at Adam's word ("STOP GIVING UP": AURA loads the whitecard).
#
# =============================================================================

# #region ---------------------------------------------------------------------
# REGION | Imports
# -----------------------------------------------------------------------------

import hashlib
import json
import os
import re
import shutil
import struct
import zipfile
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

import AuraRender__Api__Core__ as aura_core
from ValeShared__Library__ import (Na__Library__Conflict, Na__Library__Locked, Na__Library__ReadJson, Na__Library__Url,
                                   Na__Library__WriteJson)

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Configuration
# -----------------------------------------------------------------------------

aura_scene_api           = Blueprint('aura_scene_api', __name__)

SCENE_DIR                = 'UserData__AuraScene'
MODEL_DIR                = 'Content__AuraScene__ModelFiles'
ASSET_DIR                = 'Content__AuraScene__AssetFiles'
IMPORT_MAP               = aura_core.APP_DIR / '04__Lib__CoreEngine__VersionLocked' / 'Vale__CoreEngine__ImportMap__Index__.json'
ENGINE_PREFIX            = 'PainterlyNPR/'                                        # <-- The one prefix AURA imports the engine through
ASSET_LIBRARY            = '12__Data__AssetLibrary'                               # <-- Beside the pin's 02__Src__AppModules (the sync's runtime folders)
ASSET_ID                 = re.compile(r'^NPR_[0-9]{2}_[0-9]{4}$')
ARCHIVE_DIR              = '00__Archive'
SOURCE_PARTS             = ('ValeVision3D', 'Content__3dModel__GlbFiles')
LIST_KEY                 = 'valeVision_ModelUrls'
PACKAGE_DIR              = 'Content__AuraScenePackages'                           # <-- Cloud Sync's Sync Aura pushes SketchUp's set here (an exact copy: --prune)
METHOD_WHITECARD         = 'ValeVision3dWhitecard'
METHOD_SKETCHUP          = 'SketchUpScenePackage'
SOURCE_NAMES             = {'ValeVision3D': METHOD_WHITECARD, 'SketchUp': METHOD_SKETCHUP}   # <-- What a caller asks for -> the scene's Method
SOURCE_LABELS            = {METHOD_WHITECARD: 'ValeVision 3D', METHOD_SKETCHUP: 'SketchUp'}
SCHEMA_VERSION           = '1.0.0'
SCHEMA_PATH              = '05__Contracts__JsonSchemas/AuraRender__Schema__AuraScene__1.0.0__.json'
KINDS                    = {'MeshModel': 'Mesh', 'LineworkModel': 'Linework'}
PERSISTENT_ID            = re.compile(r'_ID(\d+)$')
ID_PART                  = re.compile(r'^_?\d*_?ID\d+$')
DESCRIPTION              = ("ValeVision AURA's scene for one project (schema 1.0.0: AuraRender__SCHEMA__AuraScene__.md): the model files it "
                            "draws (copies of ValeVision 3D's whitecard GLBs, or later a SketchUp Painterly Scene Package), the objects made from "
                            "them, and the library assets stored in the project. Placed assets and given materials are the drawing set's "
                            "(AuraDrawingSet__Engine.Settings.Assets and .Materials); a material's #Id is this file's Object__Id. World metres are "
                            "the engine's: +Y up, the front of the building facing +Z.")
PLACEMENT_NOTE           = ("One transform for every model file, applied before the engine builds the scene: turn about +Y by RotationDeg, then "
                            "move by OffsetM (metres). Set once: changing it later moves the building under every saved view.")

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Paths and Small Helpers
# -----------------------------------------------------------------------------

def scene_path(folder):
    """<project>/ValeVision__AuraRender/UserData__AuraScene/<id>__AuraScene__.json"""
    return folder / aura_core.BUCKET / SCENE_DIR / f'{folder.name}__AuraScene__.json'


def model_dir(folder):
    return folder / aura_core.BUCKET / MODEL_DIR


def asset_dir(folder):
    return folder / aura_core.BUCKET / ASSET_DIR


def source_dir(folder, method=METHOD_WHITECARD):
    return folder / aura_core.BUCKET / PACKAGE_DIR if method == METHOD_SKETCHUP else folder.joinpath(*SOURCE_PARTS)


def source_folder_rel(method):
    """The source folder as the scene records it, relative to the project."""
    return f'{aura_core.BUCKET}/{PACKAGE_DIR}' if method == METHOD_SKETCHUP else '/'.join(SOURCE_PARTS)


def scene_method(scene):
    """The source a scene was made from (method one when it says nothing else)."""
    method = ((scene or {}).get('AuraScene__Source') or {}).get('Method')
    return method if method in SOURCE_LABELS else METHOD_WHITECARD


def copy_in(source, target, digest):
    """Copy a file byte for byte, checked. Same bytes already there: nothing written. Anything else is written beside
    it and renamed into place, so a copy the Server Manager pushed (its pusher's, mode 644) never stops the API."""
    if not target.is_file() or sha256(target) != digest:
        temp = target.with_name(f'.{target.name}.importing')
        try:
            shutil.copyfile(source, temp)
            os.replace(temp, target)                                              # <-- Renamed into place: the folder's group write is enough, whoever owns the old copy
        finally:
            temp.unlink(missing_ok=True)
    if sha256(target) != digest:
        raise OSError(f'the copy of {target.name} did not match its source')


def sha256(path):
    digest = hashlib.sha256()
    with open(path, 'rb') as handle:
        for block in iter(lambda: handle.read(1 << 20), b''):
            digest.update(block)
    return digest.hexdigest()


def iso_now():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')


def iso_of(path):
    return datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')


def rules():
    """The import rules from AURA's config: ([file rules], [component rules], note pattern)."""
    cfg = aura_core.config()
    return (cfg.get('AuraConfig__SceneImport__Rules') or [],
            cfg.get('AuraConfig__SceneImport__ComponentRules') or [],
            re.compile(cfg.get('AuraConfig__SceneImport__SkipNodes') or r'^90_\d{4}__Note__'))


def source_files(folder, method=METHOD_WHITECARD):
    """A source's GLBs: (names in the order the record lists them, then any it does not, listed, missing).
    SketchUp's package has no list in the record: the push makes the folder an exact copy of the sync's set, so the
    folder is the list."""
    record = aura_core.project_record(folder)
    src = source_dir(folder, method)
    on_disk = sorted(p.name for p in src.glob('*.glb')) if src.is_dir() else []
    if method == METHOD_SKETCHUP:
        return on_disk, list(on_disk), [], record
    listed = [str(n) for n in (record.get(LIST_KEY) or []) if str(n).lower().endswith('.glb')]
    names = [n for n in listed if n in on_disk] + [n for n in on_disk if n not in listed]
    return names, listed, [n for n in listed if n not in on_disk], record

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Reading a GLB (its JSON chunk: nodes, meshes, accessor bounds)
# -----------------------------------------------------------------------------

def glb_json(path):
    with open(path, 'rb') as handle:
        data = handle.read()
    if data[:4] != b'glTF':
        raise ValueError(f'{path.name} is not a GLB file')
    at = 12
    while at + 8 <= len(data):
        length, kind = struct.unpack_from('<I4s', data, at)
        if kind == b'JSON':
            return json.loads(data[at + 8:at + 8 + length].decode('utf-8'))
        at += 8 + length
    raise ValueError(f'{path.name} has no JSON chunk')


def _mul(a, b):
    out = [0.0] * 16
    for c in range(4):
        for r in range(4):
            out[c * 4 + r] = sum(a[k * 4 + r] * b[c * 4 + k] for k in range(4))
    return out


def _node_matrix(node):
    if 'matrix' in node:
        return list(node['matrix'])
    tx, ty, tz = node.get('translation', [0, 0, 0])
    x, y, z, w = node.get('rotation', [0, 0, 0, 1])
    sx, sy, sz = node.get('scale', [1, 1, 1])
    return [(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
            2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
            2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
            tx, ty, tz, 1]


def glb_bounds(doc):
    """The file's contents in its own metres, node transforms applied: ([min], [max])."""
    nodes, accessors, meshes = doc.get('nodes', []), doc.get('accessors', []), doc.get('meshes', [])
    lo, hi = [float('inf')] * 3, [float('-inf')] * 3

    def visit(index, parent):
        node = nodes[index]
        world = _mul(parent, _node_matrix(node))
        if 'mesh' in node:
            for prim in meshes[node['mesh']].get('primitives', []):
                acc = accessors[prim['attributes']['POSITION']]
                if 'min' not in acc or 'max' not in acc:
                    continue
                for cx in (acc['min'][0], acc['max'][0]):
                    for cy in (acc['min'][1], acc['max'][1]):
                        for cz in (acc['min'][2], acc['max'][2]):
                            p = [world[0] * cx + world[4] * cy + world[8] * cz + world[12],
                                 world[1] * cx + world[5] * cy + world[9] * cz + world[13],
                                 world[2] * cx + world[6] * cy + world[10] * cz + world[14]]
                            for k in range(3):
                                lo[k], hi[k] = min(lo[k], p[k]), max(hi[k], p[k])
        for child in node.get('children', []):
            visit(child, world)

    ident = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
    scenes = doc.get('scenes') or [{'nodes': list(range(len(nodes)))}]
    for root in scenes[doc.get('scene', 0)].get('nodes', []):
        visit(root, ident)
    if lo[0] == float('inf'):
        lo, hi = [0.0, 0.0, 0.0], [0.0, 0.0, 0.0]
    return [round(v, 3) for v in lo], [round(v, 3) for v in hi]

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | The Import Rules: a File's Part, Use and Role; a Node's Object
# -----------------------------------------------------------------------------

def parse_model_file(name):
    """'Thrower__TrueVision__MainBuildingModel__Proposed__MeshModel__.glb' -> its Id, Group, Variant, Kind (None: not a model file)."""
    tokens = name[:-4].strip('_').split('__')
    rest = tokens[1:]                                                             # <-- tokens[0] is the project's short name
    if rest and rest[0] == 'TrueVision':
        rest = rest[1:]
    elif rest and rest[0].isdigit():                                              # <-- 'Thrower__01__OrbitHelperCube__...'
        rest = rest[1:]
    if len(rest) < 2 or rest[-1] not in KINDS:
        return None
    return {'Id': '__'.join(rest), 'Group': rest[0], 'Variant': '__'.join(rest[1:-1]) or None, 'Kind': KINDS[rest[-1]]}


def file_rule(part, file_rules):
    """The first rule every condition of which the file meets (Match, Kind, Group, VariantStarts, VariantContains)."""
    variant = part['Variant'] or ''
    for rule in file_rules:
        if rule.get('Match') and rule['Match'] not in part['Id']:
            continue
        if rule.get('Kind') and rule['Kind'] != part['Kind']:
            continue
        if rule.get('Group') and rule['Group'] != part['Group']:
            continue
        if rule.get('VariantStarts') and not variant.startswith(rule['VariantStarts']):
            continue
        if rule.get('VariantContains') and rule['VariantContains'] not in variant:
            continue
        return rule
    return {'Use': 'Draw', 'Role': 'Architecture', 'Category': 'Wall', 'Material': 'Render'}


def humanise(tag):
    words = re.sub(r'(?<=[a-z])(?=[A-Z])', ' ', tag).split()
    return ' '.join([words[0]] + [w.lower() for w in words[1:]]) if words else tag


def node_object(node_name, file_id, rule, component_rules, skip, mesh_index):
    """One object from one mesh node (no Id yet), or None for a node never drawn (a drawing note)."""
    if not node_name or skip.match(node_name):
        return None
    pid = PERSISTENT_ID.search(node_name)
    category, material, role = rule.get('Category', 'Wall'), rule.get('Material', 'Render'), rule.get('Role', 'Architecture')
    if '::' in node_name:                                                         # <-- A flattened tag: '20__ProposedBuilding::Default'
        name = humanise(node_name.split('::')[0].split('__')[-1])
    else:                                                                         # <-- An instanced component: '10_2001__Column__StopChamfer__...___ID32059153'
        parts = [t for t in node_name.split('__') if t and not ID_PART.match(t)]
        type_word = parts[1] if len(parts) > 1 else ''
        for comp in component_rules:
            if comp.get('Type') == type_word:
                category, material, role = comp.get('Category', category), comp.get('Material', material), comp.get('Role', role)
                break
        name = ' '.join(parts[1:]) + (f', ID{pid.group(1)}' if pid else '')
    return {'Object__Name': name, 'Object__ModelFile': file_id, 'Object__Node': node_name, 'Object__Mesh': mesh_index,
            'Object__PersistentId': int(pid.group(1)) if pid else None,
            'Object__Category': category, 'Object__Material': material, 'Object__Role': role}

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | The Import (Method One: ValeVision 3D's Whitecard)
# -----------------------------------------------------------------------------

def archive_current(folder, scene, stamp_day):
    """Zip the scene's current model files, read the zip back, check every hash, then delete older zips. Returns the zip's name."""
    models = model_dir(folder)
    archive = models / ARCHIVE_DIR
    archive.mkdir(parents=True, exist_ok=True)
    number = int(scene['AuraScene__Source'].get('ImportNumber') or 1)
    name = f'{folder.name}__AuraArchivedModelFiles__Import-{number:02d}__{stamp_day}__.zip'
    target = archive / name
    expected = {f['ModelFile__FileName']: f['ModelFile__Sha256'] for f in scene.get('AuraScene__ModelFiles', [])
                if (models / f['ModelFile__FileName']).is_file()}
    with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        for file_name in expected:
            zf.write(models / file_name, arcname=file_name)
    with zipfile.ZipFile(target) as zf:                                           # <-- The failsafe: read it back before anything older goes
        for file_name, digest in expected.items():
            if hashlib.sha256(zf.read(file_name)).hexdigest() != digest:
                target.unlink()
                raise OSError(f'the archive of {file_name} did not read back true')
    for old in archive.glob('*__AuraArchivedModelFiles__*.zip'):
        if old.name != name:
            old.unlink()
    return name


def build_import(folder, previous, method=METHOD_WHITECARD, model_name=None):
    """Copy the source's set, then the scene document (not yet written). previous: the scene now, or None.
    model_name: the SketchUp model a package came from (Cloud Sync says; the record's camera block names method one's)."""
    names, listed, missing, record = source_files(folder, method)
    file_rules, component_rules, skip = rules()
    src, dst = source_dir(folder, method), model_dir(folder)
    dst.mkdir(parents=True, exist_ok=True)
    now, user = iso_now(), aura_core.user_code()

    archived_as = archive_current(folder, previous, datetime.now(timezone.utc).strftime('%d-%b-%Y')) if previous else None
    if previous:                                                                  # <-- Files the new set no longer has go (they are in the zip)
        for old in previous.get('AuraScene__ModelFiles', []):
            if old['ModelFile__FileName'] not in names and (dst / old['ModelFile__FileName']).is_file():
                (dst / old['ModelFile__FileName']).unlink()

    model_files, fresh, total, focal, building = [], [], 0, None, None
    for file_name in names:
        part = parse_model_file(file_name)
        if part is None:
            continue
        source = src / file_name
        target = dst / file_name
        digest = sha256(source)
        copy_in(source, target, digest)
        doc = glb_json(source)
        lo, hi = glb_bounds(doc)
        rule = file_rule(part, file_rules)
        total += source.stat().st_size
        twin_kind = 'LineworkModel' if part['Kind'] == 'Mesh' else 'MeshModel'
        twin_name = file_name.replace('__MeshModel__', '__LineworkModel__') if part['Kind'] == 'Mesh' else file_name.replace('__LineworkModel__', '__MeshModel__')
        entry = {'ModelFile__Id': part['Id'], 'ModelFile__FileName': file_name, 'ModelFile__Group': part['Group'],
                 'ModelFile__Variant': part['Variant'], 'ModelFile__Kind': part['Kind'], 'ModelFile__Use': rule.get('Use', 'Draw')}
        if rule.get('UseNote'):
            entry['ModelFile__UseNote'] = rule['UseNote']
        entry.update({'ModelFile__Twin': '__'.join(part['Id'].split('__')[:-1] + [twin_kind]) if twin_name in names else None,
                      'ModelFile__Role': rule.get('Role') if rule.get('Use', 'Draw') == 'Draw' else None,
                      'ModelFile__ShowByDefault': rule.get('Use', 'Draw') == 'Draw', 'ModelFile__Bytes': source.stat().st_size,
                      'ModelFile__Sha256': digest, 'ModelFile__SourceModifiedIso': iso_of(source),
                      'ModelFile__Generator': (doc.get('asset') or {}).get('generator'), 'ModelFile__Nodes': len(doc.get('nodes', [])),
                      'ModelFile__BoundsM': {'Min': lo, 'Max': hi}})
        model_files.append(entry)
        if entry['ModelFile__Use'] == 'Draw' and part['Kind'] == 'Mesh':
            for node in doc.get('nodes', []):
                if 'mesh' in node:
                    made = node_object(node.get('name'), part['Id'], rule, component_rules, skip, node['mesh'])
                    if made:
                        fresh.append(made)
            box = (lo, hi)
            if rule.get('Role') == 'Focal':
                focal = box if not focal else ([min(a, b) for a, b in zip(focal[0], lo)], [max(a, b) for a, b in zip(focal[1], hi)])
            elif rule.get('Role') == 'Architecture':
                building = box if not building else ([min(a, b) for a, b in zip(building[0], lo)], [max(a, b) for a, b in zip(building[1], hi)])

    # Object Ids: kept for every node found again, the next free one for a new node, a gone node marked missing
    objects = []
    if previous:
        old = previous.get('AuraScene__Objects', [])
        by_node = {(o['Object__ModelFile'], o['Object__Node']): o for o in old}
        by_pid = {o['Object__PersistentId']: o for o in old if o.get('Object__PersistentId')}
        kept, next_id = set(), max([o['Object__Id'] for o in old] or [0]) + 1
        for made in fresh:
            match = by_node.get((made['Object__ModelFile'], made['Object__Node'])) or by_pid.get(made['Object__PersistentId'])
            if match and match['Object__Id'] not in kept:
                kept.add(match['Object__Id'])
                carried = dict(made)
                for key in ('Object__Name', 'Object__Category', 'Object__Material', 'Object__Role'):
                    carried[key] = match[key]                                     # <-- What the scene said of it stays: a re-import never undoes a choice
                objects.append(dict([('Object__Id', match['Object__Id'])] + list(carried.items())))
            else:
                objects.append(dict([('Object__Id', next_id)] + list(made.items())))
                next_id += 1
        for o in old:
            if o['Object__Id'] not in kept:
                gone = dict(o)
                gone['Object__Missing'] = True
                objects.append(gone)
        objects.sort(key=lambda o: o['Object__Id'])
    else:
        objects = [dict([('Object__Id', i)] + list(o.items())) for i, o in enumerate(fresh, start=1)]

    if previous:
        placement = previous['AuraScene__ModelPlacement']                        # <-- Set once: the building stays under every saved view
    else:
        box = focal or building
        cx = round((box[0][0] + box[1][0]) / 2, 3) if box else 0.0
        cz = round((box[0][2] + box[1][2]) / 2, 3) if box else 0.0
        placement = {'OffsetM': [-cx, 0.0, -cz], 'RotationDeg': 0.0, 'FrontFacing': '+Z',
                     'CentredOn': 'Focal' if focal else 'Architecture', 'Note': PLACEMENT_NOTE}

    number = int(previous['AuraScene__Source']['ImportNumber']) + 1 if previous else 1
    history = [dict(h) for h in previous['AuraScene__Source'].get('History', [])] if previous else []
    if history and archived_as:
        history[-1]['Import__ArchivedAs'] = archived_as
    history.append({'Import__Number': number, 'Import__Iso': now, 'Import__By': user, 'Import__Files': len(model_files),
                    'Import__Bytes': total, 'Import__ArchivedAs': None})
    meta = previous['AuraScene__Meta'] if previous else {}
    if method == METHOD_SKETCHUP:
        sketchup_name = model_name or ((previous or {}).get('AuraScene__Source') or {}).get('SketchUpModelName')
    else:
        sketchup_name = (record.get('ValeVison3D__SketchUpCameraData') or {}).get('model_name')
    scene = {
        'AuraScene__Meta': {'SchemaVersion': SCHEMA_VERSION, 'Schema': SCHEMA_PATH, 'ProjectId': folder.name,
                            'CreatedIso': meta.get('CreatedIso') or now, 'UpdatedIso': now,
                            'CreatedBy': meta.get('CreatedBy') or user, 'UpdatedBy': user, 'Description': DESCRIPTION},
        'AuraScene__Source': {'Method': method, 'Folder': source_folder_rel(method),
                              'ListKey': None if method == METHOD_SKETCHUP else LIST_KEY,
                              'ListedFiles': len(listed), 'Unlisted': [n for n in names if n not in listed], 'Missing': missing,
                              'SketchUpModelName': sketchup_name,
                              'ImportNumber': number, 'ImportedIso': now, 'ImportedBy': user, 'History': history},
        'AuraScene__ModelPlacement': placement,
        'AuraScene__ModelFiles': model_files,
        'AuraScene__Objects': objects,
        'AuraScene__AssetFiles': previous.get('AuraScene__AssetFiles', []) if previous else [],
    }
    return scene


def source_state(folder, scene, method=None):
    """{ Available, Files, Newer, Method, Label }: does the scene's source (or the one named) have a set, and is it newer
    than the scene's copies? A scene made from SketchUp is compared with SketchUp's package, never with ValeVision 3D."""
    method = method or scene_method(scene)
    names, _listed, _missing, _record = source_files(folder, method)
    names = [n for n in names if parse_model_file(n)]
    state = {'Available': bool(names), 'Files': len(names), 'Newer': False, 'Method': method, 'Label': SOURCE_LABELS[method]}
    if scene:
        copies = {f['ModelFile__FileName']: f for f in scene.get('AuraScene__ModelFiles', [])}
        if set(copies) != set(names):
            state['Newer'] = True
        else:
            for n in names:
                p = source_dir(folder, method) / n
                if p.stat().st_size != copies[n]['ModelFile__Bytes'] or iso_of(p) > copies[n]['ModelFile__SourceModifiedIso']:
                    state['Newer'] = True
                    break
    return state

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Library Assets: Stored Once, However Often Placed
# -----------------------------------------------------------------------------

def pinned_library():
    """(the pinned engine's asset library folder, 'PainterlyNPR v<version>'): the engine AURA's import map names, so the
    API stores what the page draws. (None, None) when the record cannot be read."""
    try:
        record = json.loads(IMPORT_MAP.read_text(encoding='utf-8'))
        imports = next(v for k, v in record.items() if k.endswith('__Imports'))
        modules = (IMPORT_MAP.parent.parent / imports[ENGINE_PREFIX]).resolve()  # <-- './04__Lib__.../01__CoreLib__PainterlyNPR__v0.8.9/02__Src__AppModules/'
    except (OSError, ValueError, StopIteration, KeyError, TypeError) as error:
        aura_core.log(f'[AURA API] the engine pin could not be found: {error}')
        return None, None
    pin = modules.parent
    lock = (Na__Library__ReadJson(pin / 'PainterlyNPR__CoreLib__VersionLock__.json') or {}).get('AuraRender__CoreEngine__VersionLock') or {}
    version = (lock.get('AuraRender__CoreEngine__VersionLock__Source') or {}).get('EngineVersion') or pin.name.rsplit('__v', 1)[-1]
    return pin / ASSET_LIBRARY, f'PainterlyNPR v{version}'


def placed_asset_ids(drawing_set):
    """The library asset Ids a drawing set places (AuraDrawingSet__Engine.Settings.Assets), each once, in first-placed order."""
    settings = ((drawing_set or {}).get('AuraDrawingSet__Engine') or {}).get('Settings') or {}
    ids = []
    for placement in settings.get('Assets') or []:
        asset_id = str(placement.get('AssetId') or '') if isinstance(placement, dict) else ''
        if ASSET_ID.match(asset_id) and asset_id not in ids:                     # <-- The Id's own form only: it becomes part of a file path
            ids.append(asset_id)
    return ids


def store_one(folder, library, version, asset_id, now, user):
    """Copy one asset's MOD and DAT from the pinned library into the project: its AuraScene__AssetFiles record, or None
    when the pin cannot give it (no such asset, or no MOD .glb: a pin synced before the sync's 1.2.0)."""
    found = sorted(library.glob(f'*/{asset_id}__*/{asset_id}__DAT__*.json'))     # <-- '<collection>/<Id>__<Type>__<Name>__<Var>__/<Id>__DAT__...json'
    if not found:
        aura_core.log(f'[AURA API] asset {asset_id} is not in the pinned library: not stored')
        return None
    dat_path = found[0]
    doc = (json.loads(dat_path.read_text(encoding='utf-8')) or {}).get('PainterlyNPR__AssetData') or {}
    mod_name = ((doc.get('PainterlyNPR__AssetData__Files') or {}).get('MOD') or {}).get('File') or ''
    mod_path = dat_path.parent / mod_name
    if not mod_name.endswith('.glb') or '/' in mod_name or '\\' in mod_name or not mod_path.is_file():
        aura_core.log(f'[AURA API] asset {asset_id}: the pinned library has no MOD .glb for it: not stored yet')
        return None
    target = asset_dir(folder)
    target.mkdir(parents=True, exist_ok=True)
    glb_digest = sha256(mod_path)
    copy_in(mod_path, target / mod_name, glb_digest)
    copy_in(dat_path, target / dat_path.name, sha256(dat_path))                  # <-- The record as it was when copied
    return {'AssetFile__AssetId': asset_id,
            'AssetFile__Name': (doc.get('PainterlyNPR__AssetData__Identity') or {}).get('DisplayName') or asset_id,
            'AssetFile__GlbFile': mod_name, 'AssetFile__DatFile': dat_path.name,
            'AssetFile__LibraryFolder': dat_path.parent.relative_to(library).as_posix(),
            'AssetFile__LibraryVersion': version,
            'AssetFile__Instanced': not (doc.get('PainterlyNPR__AssetData__Placement') or {}).get('NewShapeEachPlop'),
            'AssetFile__GlbBytes': mod_path.stat().st_size, 'AssetFile__GlbSha256': glb_digest,
            'AssetFile__CopiedIso': now, 'AssetFile__CopiedBy': user}


def store_assets(folder, drawing_set):
    """Store every asset the drawing set places that the scene has not stored yet: its MOD and DAT copied once into
    Content__AuraScene__AssetFiles, its record added to AuraScene__AssetFiles (a new _rev). Returns the Ids stored.
    No scene yet: nothing (the scene is made on the project's first open, and the next save stores them)."""
    wanted = placed_asset_ids(drawing_set)
    path = scene_path(folder)
    if not wanted or not path.is_file():
        return []
    stored = {a.get('AssetFile__AssetId') for a in (Na__Library__ReadJson(path) or {}).get('AuraScene__AssetFiles') or []}
    if all(asset_id in stored for asset_id in wanted):                           # <-- Every autosave of a set with nothing new: one read, no lock
        return []
    with Na__Library__Locked(folder / aura_core.BUCKET / 'SceneImport'):         # <-- The import's lock: a re-import never writes over an asset just stored
        scene = Na__Library__ReadJson(path)
        library, version = pinned_library()
        if not scene or library is None:
            return []
        records = list(scene.get('AuraScene__AssetFiles') or [])
        stored = {a.get('AssetFile__AssetId') for a in records}
        now, user = iso_now(), aura_core.user_code()
        added = []
        for asset_id in wanted:
            if asset_id not in stored:
                record = store_one(folder, library, version, asset_id, now, user)
                if record:
                    records.append(record)
                    added.append(asset_id)
        if not added:
            return []
        scene['AuraScene__AssetFiles'] = records
        scene['AuraScene__Meta'] = dict(scene['AuraScene__Meta'], UpdatedIso=now, UpdatedBy=user or scene['AuraScene__Meta'].get('UpdatedBy'))
        Na__Library__WriteJson(path, scene, user, folder, expected_rev=int(scene.get('_rev', 0) or 0))
    aura_core.activity('scene.assets', f'Stored {len(added)} library asset(s) in the AURA scene: {", ".join(added)}', folder)
    return added

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Routes
# -----------------------------------------------------------------------------

def _open(pid):
    folder = aura_core.project_folder(pid)
    if not folder:
        return None, aura_core.fail(f'no project {pid!r}', 404)
    if not aura_core.project_switched_on(folder):
        return None, aura_core.fail('This project is not switched on for ValeVision AURA. Projects are switched on one at a time, '
                                    'in ValeVision Gallery\'s Project Editor.', 403, notSwitchedOn=True)
    return folder, None


@aura_scene_api.get('/api/projects/<pid>/scene')
@aura_core.require_access
def read_scene(pid):
    folder, refused = _open(pid)
    if refused:
        return refused
    try:
        scene = Na__Library__ReadJson(scene_path(folder))
        source = source_state(folder, scene)
    except (OSError, ValueError) as error:
        aura_core.log(f'[AURA API] scene unreadable for {folder.name}: {error}')
        return aura_core.fail('The scene on the server could not be read.', 500)
    response = jsonify({'ok': True, 'scene': scene, 'rev': int((scene or {}).get('_rev', 0) or 0),
                        'modelBase': Na__Library__Url(folder) + f'{aura_core.BUCKET}/{MODEL_DIR}/',
                        'assetBase': Na__Library__Url(folder) + f'{aura_core.BUCKET}/{ASSET_DIR}/', 'source': source})
    response.headers['Cache-Control'] = 'no-store'
    return response


@aura_scene_api.post('/api/projects/<pid>/scene/import')
@aura_core.require_access
def import_scene(pid):
    folder, refused = _open(pid)
    if refused:
        return refused
    body = request.get_json(silent=True)
    body = body if isinstance(body, dict) else {}
    asked = str(body.get('source') or '')
    if asked and asked not in SOURCE_NAMES:
        return aura_core.fail(f'No scene source {asked!r}: ask for ValeVision3D or SketchUp.', 400)
    model_name = str(body.get('modelName') or '')[:200] or None
    path = scene_path(folder)
    method = SOURCE_NAMES[asked] if asked else scene_method(Na__Library__ReadJson(path))   # <-- No source named: the scene's own (a new one: ValeVision 3D)
    names = [n for n in source_files(folder, method)[0] if parse_model_file(n)]
    if not names:
        if method == METHOD_SKETCHUP:
            return aura_core.fail('No SketchUp model has been sent to AURA for this project yet: run Sync Aura in ValeVision Cloud Sync.', 409, noSource=True)
        return aura_core.fail('ValeVision 3D has no whitecard for this project yet: sync its GLBs from SketchUp first.', 409, noSource=True)
    try:
        with Na__Library__Locked(folder / aura_core.BUCKET / 'SceneImport'):   # <-- One import a project at a time, across workers
            previous = Na__Library__ReadJson(path)
            scene = build_import(folder, previous, method, model_name)
            result = Na__Library__WriteJson(path, scene, aura_core.user_code(), folder,
                                            expected_rev=int((previous or {}).get('_rev', 0) or 0) if previous else None)
    except Na__Library__Conflict as conflict:
        return aura_core.fail('Someone else changed this scene first.', 409, rev=int(conflict.current.get('_rev', 0) or 0))
    except (OSError, ValueError, KeyError, TypeError) as error:
        aura_core.log(f'[AURA API] scene import failed for {folder.name}: {error}')
        return aura_core.fail(f'The scene could not be made: {error}', 500)
    number = scene['AuraScene__Source']['ImportNumber']
    aura_core.activity('scene.import', f'Made the AURA scene from {SOURCE_LABELS[method]} (import {number}, {len(scene["AuraScene__ModelFiles"])} files)', folder)
    scene['_rev'] = result['rev']
    response = jsonify({'ok': True, 'scene': scene, 'rev': result['rev'],
                        'modelBase': Na__Library__Url(folder) + f'{aura_core.BUCKET}/{MODEL_DIR}/',
                        'assetBase': Na__Library__Url(folder) + f'{aura_core.BUCKET}/{ASSET_DIR}/', 'source': source_state(folder, scene)})
    response.headers['Cache-Control'] = 'no-store'
    return response

# endregion -------------------------------------------------------------------
