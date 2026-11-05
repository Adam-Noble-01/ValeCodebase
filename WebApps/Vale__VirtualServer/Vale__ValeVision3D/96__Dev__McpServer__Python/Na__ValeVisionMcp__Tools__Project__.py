# =============================================================================
# VALEVISION 3D MCP - TOOLS - STATUS AND PROJECTS
# =============================================================================
#
# FILE       : Na__ValeVisionMcp__Tools__Project__.py
# PURPOSE    : Where everything stands, which projects there are, and what a
#              project's record holds. Reading only.
# CREATED    : 04-Nov-2026
#
# DESCRIPTION:
# - A RECORD IS READ BY KEY NAME FIRST. A record's keys are listed with their sizes, and a
#   value comes back only when named, because some keys are large and productionData and
#   scheduleData are nobody's business but staff's.
#
# =============================================================================

import json

import Na__ValeVisionMcp__Server__Core__ as Na__Core
from Na__ValeVisionMcp__Server__Core__ import Na__Result__Data, Na__Tool, Na__ToolError
import Na__ValeVisionMcp__Tools__LiveApp__ as Na__LiveApp

NA_TARGET_SCHEMA = {'type': 'string', 'enum': ['real', 'sandbox'],
                    'description': 'real: the PC mirror, which a push sends to the live server. sandbox: this server\'s own copy on its testing server.'}


# -----------------------------------------------------------------------------
# REGION | Status
# -----------------------------------------------------------------------------

@Na__Tool('vv3d_status', 'Where everything stands',
          'Start here. The app version on this PC, the version the live server last took, this server\'s testing server and browser, and whether the gateway to the server is ready. Opens no ssh.',
          read_only=True)
def Na__Tool__Status(_arguments):
    code, text, _report = Na__Core.Na__Engine__Run(['check'], timeout_s=30)
    status, body = Na__Core.Na__Live__Peek('/ValeApps__DeployStamp__.json')
    stamp = None
    if status == 200:
        marker = '"ValeDeploy__Stamp__Latest"'
        at = body.find(marker)
        if at >= 0:
            stamp = body[at + len(marker):].split('"')[1] if '"' in body[at + len(marker):] else None
    return Na__Result__Data({
        'app': {'version': Na__Core.Na__App__Version(), 'folder': str(Na__Core.NA_APP_DIR)},
        'live': {'site': Na__Core.NA_LIVE_SITE, 'answers': status, 'lastDeployStamp': stamp},
        'gateway': {'ready': code == 0, 'report': text[:600]},
        'sandbox': Na__LiveApp.Na__Sandbox__Describe(),
        'browser': Na__LiveApp.Na__Browser__Describe(),
        'ways': 'Try a change: vv3d_sandbox_start, vv3d_sandbox_load_project, vv3d_vegetation_edit on target sandbox, vv3d_open, vv3d_view, vv3d_screenshot. '
                'Make it real: vv3d_server_collect_project, vv3d_vegetation_edit or vv3d_promote_to_real with confirm_real_data, vv3d_server_push_project.'
    })

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Projects
# -----------------------------------------------------------------------------

@Na__Tool('vv3d_project_list', 'List projects',
          'Projects in the PC\'s library, newest job folders as they sort. Optional text filter on the id. With vegetation_only, only projects whose record holds Vegetation__SceneData.',
          {'filter': {'type': 'string', 'description': 'Part of the id, any case.'},
           'vegetation_only': {'type': 'boolean'},
           'limit': {'type': 'integer', 'minimum': 1, 'maximum': 500}},
          read_only=True)
def Na__Tool__ProjectList(arguments):
    wanted = (arguments.get('filter') or '').lower()
    rows = []
    for name, folder in sorted(Na__Core.Na__Project__Folders().items(), key=lambda item: item[0]):
        if wanted and wanted not in name.lower():
            continue
        has_vegetation = None
        if arguments.get('vegetation_only') or wanted:
            try:
                has_vegetation = 'Vegetation__SceneData' in Na__Core.Na__Project__Read(Na__Core.Na__Project__RecordPath(folder))
            except ValueError:
                has_vegetation = False
            if arguments.get('vegetation_only') and not has_vegetation:
                continue
        rows.append({'id': name, 'year': folder.parent.name.split('__')[-1], 'hasVegetation': has_vegetation})
    limit = arguments.get('limit') or 100
    return Na__Result__Data({'count': len(rows), 'shown': min(len(rows), limit), 'projects': rows[:limit]})


@Na__Tool('vv3d_project_get', 'Read a project\'s record',
          'Lists the record\'s top-level keys with their sizes, its _rev, its models and saved SketchUp scenes. A key\'s value comes back only when named in keys.',
          {'project': {'type': 'string', 'description': 'The library id, such as 64616__Garnett.'},
           'keys': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Top-level keys to return whole.'},
           'target': NA_TARGET_SCHEMA},
          required=['project'], read_only=True)
def Na__Tool__ProjectGet(arguments):
    folder, path = Na__LiveApp.Na__Record__Locate(arguments['project'], arguments.get('target') or 'real')
    record = Na__Core.Na__Project__Read(path)
    camera = record.get('ValeVison3D__SketchUpCameraData')
    scenes = [scene.get('scene_name') for scene in camera.get('scenes', [])] if isinstance(camera, dict) else []
    answer = {
        'id': folder.name,
        'file': str(path),
        'rev': record.get('_rev', 0),
        'name': record.get('projectName'),
        'type': record.get('ProjectType'),
        'models': record.get('valeVision_ModelUrls') or [],
        'sketchUpScenes': scenes,
        'keys': {key: len(json.dumps(value)) for key, value in record.items()},
        'values': {}
    }
    for key in arguments.get('keys') or []:
        if key not in record:
            raise Na__ToolError('The record of %s has no key %s.' % (folder.name, key), 'Its keys are listed by calling this with no keys.')
        answer['values'][key] = record[key]
    return Na__Result__Data(answer)

# endregion -------------------------------------------------------------------

# =============================================================================
# END OF FILE
# =============================================================================
