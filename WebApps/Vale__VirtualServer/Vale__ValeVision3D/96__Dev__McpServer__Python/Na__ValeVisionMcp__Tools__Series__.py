# =============================================================================
# VALEVISION 3D MCP - TOOLS - A SERIES OF PICTURES
# =============================================================================
#
# FILE       : Na__ValeVisionMcp__Tools__Series__.py
# PURPOSE    : Take many pictures in one call, a view and a change at a time, for judging a look
#              across several cameras and several settings
# CREATED    : 10-Nov-2026
#
# DESCRIPTION:
# - Written for the linework density tests (10-Nov-2026): a look is judged from four cameras and a
#   dozen settings, and at two calls a picture (move, then shoot) that was a hundred calls. Here a
#   whole grid is one.
#     vv3d_shot_series   For each shot: its camera or saved scene, its change (a scratch module run
#                        with the shot's own arguments, as vv3d_run_module runs one), a wait for the
#                        view to refine, a PNG named for the shot.
# - IT RETURNS PATHS, NOT PICTURES. Look at them with vv3d_contact_sheet and vv3d_shot_compare.
# - THE SAME VIEW TWICE IS THE SAME PICTURE, to the pixel, on the graphics card: the refiner's
#   sixteen samples are the same sixteen. So two shots that differ are a change, not noise.
# - SANDBOX ONLY, as everything that opens the app is.
#
# =============================================================================

import json
import os
import re

import Na__ValeVisionMcp__Tools__LiveApp__ as Na__LiveApp
import Na__ValeVisionMcp__Tools__Testing__ as Na__Testing
from Na__ValeVisionMcp__Server__Core__ import Na__Result__Data, Na__Tool, Na__ToolError

NA_POINT = {'type': 'array', 'items': {'type': 'number'}, 'minItems': 3, 'maxItems': 3}
NA_CLIP = {'type': 'array', 'items': {'type': 'number'}, 'minItems': 4, 'maxItems': 4, 'description': '[x, y, width, height] in client pixels.'}


# -----------------------------------------------------------------------------
# REGION | A Series of Pictures
# -----------------------------------------------------------------------------

@Na__Tool('vv3d_shot_series', 'Many pictures in one call',
          'Takes a series of pictures of the open page. For each shot, in order: goes to its saved scene or camera if it gives one (integer mm, three.js axes), '
          'runs the scratch module with the shot\'s module_args if it gives any (as vv3d_run_module does: its default export is called with them), waits for the view to refine, '
          'and saves <out_dir>/<name>.png with the app\'s panels hidden. A shot with no camera keeps the one before it, so a row of settings from one view is a list of module_args. '
          'Returns the paths and each module answer, not the pictures: look with vv3d_contact_sheet or vv3d_shot_compare.',
          {'shots': {'type': 'array', 'minItems': 1, 'maxItems': 80,
                     'items': {'type': 'object',
                               'properties': {'name': {'type': 'string', 'description': 'The file name, without .png.'},
                                              'scene': {'type': 'string'}, 'position_mm': NA_POINT, 'target_mm': NA_POINT, 'fov_deg': {'type': 'number'},
                                              'module_args': {'description': 'Handed to the module\'s default export before this picture.'},
                                              'clip': NA_CLIP,
                                              'settle_ms': {'type': 'integer'}},
                               'required': ['name']}},
           'module': {'type': 'string', 'description': 'A scratch .js on this PC, served among the app\'s own modules.'},
           'out_dir': {'type': 'string', 'description': 'A folder on this PC. Made if missing.'},
           'clip': NA_CLIP,
           'settle_ms': {'type': 'integer', 'description': 'Wait before each picture. Default 2500: a view refines in under a second on the graphics card.'},
           'hide_ui': {'type': 'boolean', 'description': 'Default true: the model alone.'}},
          required=['shots', 'out_dir'])
def Na__Tool__ShotSeries(arguments):
    page = Na__LiveApp.Na__Browser__RequirePage()
    out_dir = os.path.abspath(arguments['out_dir'])
    os.makedirs(out_dir, exist_ok=True)
    module = arguments.get('module')
    if module and not os.path.isfile(module):
        raise Na__ToolError('No such file: %s' % module)
    settle = int(arguments.get('settle_ms') or 2500)
    hide = arguments.get('hide_ui') is not False
    seen = len(Na__LiveApp.NA_STATE['errors'])

    rows = []
    if hide:
        Na__LiveApp.Na__Browser__Call('hideUi', True)
    try:
        for shot in arguments['shots']:
            name = re.sub(r'[^A-Za-z0-9_.\-]', '_', str(shot['name']))
            row = {'name': name}
            if shot.get('scene'):
                Na__LiveApp.Na__Browser__Call('gotoScene', shot['scene'])
            elif shot.get('position_mm') or shot.get('target_mm') or shot.get('fov_deg'):
                Na__LiveApp.Na__Browser__Call('setCamera', {key: shot[key] for key in ('position_mm', 'target_mm', 'fov_deg') if key in shot})
            if 'module_args' in shot:
                if not module:
                    raise Na__ToolError('Shot %s has module_args and no module was given.' % name)
                answer = Na__Testing.Na__Tool__RunModule({'file': module, 'args': shot['module_args']})
                text = answer['content'][0]['text']
                try:
                    value = json.loads(text).get('result', {}).get('value')
                    text = json.dumps(value, ensure_ascii=False)
                except ValueError:
                    pass
                row['module'] = text[:300]                                    # <-- Enough to see it ran; the whole answer is vv3d_run_module's job
            page.wait_for_timeout(int(shot.get('settle_ms') or settle))
            path = os.path.join(out_dir, name + '.png')
            clip = shot.get('clip') or arguments.get('clip')
            if clip:
                page.screenshot(path=path, clip={'x': clip[0], 'y': clip[1], 'width': clip[2], 'height': clip[3]})
            else:
                page.screenshot(path=path)
            row['path'] = path
            row['camera'] = Na__LiveApp.Na__Browser__Call('getCamera')
            rows.append(row)
    finally:
        if hide:
            Na__LiveApp.Na__Browser__Call('hideUi', False)
    return Na__Result__Data({'shots': rows, 'problems': Na__Testing.Na__Testing__NewProblems(seen)})

# endregion -------------------------------------------------------------------

# =============================================================================
# END OF FILE
# =============================================================================
