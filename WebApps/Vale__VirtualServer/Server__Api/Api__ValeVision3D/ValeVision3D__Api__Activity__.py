#!/usr/bin/env python3
# =============================================================================
# VALEVISION 3D - API - ACTIVITY (WHAT EACH SAVE DID, IN THE SHARED LEDGER)
# =============================================================================
#
# FILE       : ValeVision3D__Api__Activity__.py
# MODULE     : ValeVision3D API Activity
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Write ValeVision 3D's important actions into the shared activity
#              ledger (Api__Shared/ValeShared__Activity__.py), read by the Vale
#              Virtual Server Manager's tab 05 (User activity)
# CREATED    : 08-Oct-2026
#
# DESCRIPTION:
# - ONE HOOK, NO ROUTE EDITS: Na__Vv3dActivity__Install(app) adds a before- and
#   an after-request hook. After every write route in NA__VV3D__WRITES answers
#   below 400, one line is written: who, which project, what.
# - A PROJECT SAVE SAYS WHAT CHANGED: for the whole-record save and the merge,
#   the record is read before and after, and every changed top-level key is
#   named ("Saved video paths (created Garden walk)"). Lists of items with an
#   "__Id" are compared by id, so a new scene, video path or drawing is named.
#   A save that changed nothing is not recorded (autosaves stay quiet).
# - QUIET ON PURPOSE: asset uploads (scene thumbnails, baked linework), the
#   published-files prune and the sheet-pictures reconcile come with the saves
#   above and would only repeat them.
# - A ROUTE THAT KNOWS BETTER NAMES WHAT IT DID: a write may leave
#   g.na_vv3d_activity = { text, target, detail } and those words are recorded in
#   place of the table's (the page layouts: "Created page layout Rear view").
# - Never fails a request: the ledger writer swallows its own errors, and so
#   does every step here.
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 09-Oct-2026 - Version 1.1.0
# - The page layouts' save and delete (ValeVision3D__Api__PageLayouts__), and g.na_vv3d_activity
#   for a route to name what it did.
#
# 08-Oct-2026 - Version 1.0.0
# - Initial build.
#
# =============================================================================

# #region ---------------------------------------------------------------------
# REGION | Imports
# -----------------------------------------------------------------------------

from flask import g, request

import ValeVision3D__Api__Core__ as vv_shared
from ValeShared__Activity__ import Na__Activity__Changes, Na__Activity__ChangesText, Na__Activity__Record

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Configuration
# -----------------------------------------------------------------------------

NA__VV3D__ACTIVITY_APP   = 'ValeVision 3D'

# WRITES | endpoint -> (action, text). None: a project save, described by what changed
NA__VV3D__WRITES         = {
    'valevision_projects_api.save_project'               : ('project.save', None),
    'valevision_projects_api.merge_project_keys'         : ('project.save', None),
    'valevision_projects_api.write_project_file'         : ('drawing.notes', 'Saved {name}'),
    'valevision_projects_api.write_drawing_notes'        : ('drawing.notes', 'Saved the drawing notes'),
    'valevision_published_api.published_write'           : ('drawing.publish', 'Published a drawing file'),
    'valevision_published_api.published_archive'         : ('drawing.archive', 'Archived a published revision'),
    'valevision_sheet_images_api.sheet_images_upload'    : ('drawing.image', 'Uploaded a sheet picture'),
    'valevision_scrapbook_api.scrapbook_save_item'       : ('scrapbook.save', 'Saved a scrapbook item'),
    'valevision_scrapbook_api.scrapbook_delete_item'     : ('scrapbook.delete', 'Deleted a scrapbook item'),
    'valevision_statements_api.statements_write_file'    : ('statement.save', 'Saved a statement'),
    'valevision_statements_api.statements_write_image'   : ('statement.save', 'Added a picture to a statement'),
    'valevision_statements_api.statements_make_folder'   : ('statement.save', 'Made a statements folder'),
    'valevision_statements_api.statements_move'          : ('statement.save', 'Moved a statement'),
    'valevision_statements_api.statements_delete'        : ('statement.delete', 'Deleted a statement'),
    'valevision_user_config_api.spellings_change'        : ('dictionary.change', 'Changed the spelling dictionary'),
    'valevision_email_api.email_send'                    : ('email.send', 'Sent an email'),
    'valevision_page_layouts_api.page_layouts_save'      : ('drawing.layout', 'Saved a page layout'),
    'valevision_page_layouts_api.page_layouts_delete'    : ('drawing.delete', 'Deleted a page layout'),
}
NA__VV3D__RECORD_SAVES   = ('valevision_projects_api.save_project', 'valevision_projects_api.merge_project_keys')

# RECORD KEYS | top-level key -> (words, action). A save touching keys of one action takes it
NA__VV3D__KEYS           = {
    'PresentationMode__SavedCameraScenes' : ('animation scenes', 'scene.save'),
    'VideoStudio__Config'                 : ('video paths', 'video.path'),
    'LayoutEditor__DrawingsData'          : ('drawings', 'drawing.save'),
    'CrossSection__SceneData'             : ('cross sections', 'scene.save'),
    'CrossSection__Config'                : ('cross-section settings', 'settings.save'),
    'FogPlane__Config'                    : ('fog settings', 'settings.save'),
    'RenderEngine__Config'                : ('render settings', 'settings.save'),
    'Navmode__EnabledModes'               : ('navigation modes', 'settings.save'),
    'Navmode__OrbitMaxDistanceMm'         : ('orbit distance', 'settings.save'),
    'OrbitHelperCube__Position'           : ('orbit cube', 'settings.save'),
    'Camera__DefaultPosition'             : ('default camera', 'settings.save'),
    'valeVision_Camera__DefaultPosition'  : ('default camera', 'settings.save'),
    'GridLine__Grid__Offset__Config'      : ('grid', 'settings.save'),
    'ValeVison3D__SketchUpCameraData'     : ('SketchUp cameras', 'project.sync'),
    'valeVision_ModelUrls'                : ('3D model files', 'project.sync'),
    'valeVision_ModelUrl'                 : ('3D model files', 'project.sync'),
    'projectName'                         : ('project details', 'project.save'),
    'projectCode'                         : ('project details', 'project.save'),
    'projectNameAlias'                    : ('project details', 'project.save'),
    'description'                         : ('project details', 'project.save'),
}

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Helpers
# -----------------------------------------------------------------------------

def _project():
    """The library folder the request names (a route's <token>, or the query / body), or None."""
    token = (request.view_args or {}).get('token')
    if not token:
        project_folder, _year, folder_id = vv_shared.project_context()
        token = folder_id or project_folder
    return vv_shared.resolve_project(token) if token else None


def _body():
    body = request.get_json(silent=True) if request.is_json else None
    return body if isinstance(body, dict) else {}


def _target(body):
    """What the write acted on: a file or folder name, the word, the email's subject."""
    for value in (request.args.get('path'), body.get('path'), body.get('relativePath'), body.get('to') if
                  isinstance(body.get('to'), str) else None, body.get('name'), body.get('word')):
        if isinstance(value, str) and value.strip():
            return value.strip().replace('\\', '/').rstrip('/').split('/')[-1]
    return ''


def _record_text(before, after, unset):
    """('video.path', 'Saved video paths (created Garden walk)') or (None, '') when nothing changed."""
    words = {k: v[0] for k, v in NA__VV3D__KEYS.items()}
    changes = Na__Activity__Changes(before, after, words, removed_keys=unset)
    if not changes:
        return None, '', []
    actions = {NA__VV3D__KEYS[k][1] for k in after if k in NA__VV3D__KEYS and (before or {}).get(k) != after.get(k)}
    action = actions.pop() if len(actions) == 1 and not any(c['What'] == 'other settings' for c in changes) else 'project.save'
    return action, 'Saved ' + Na__Activity__ChangesText(changes), changes

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Hooks
# -----------------------------------------------------------------------------

def _before():
    """For a project save: keep the record as it was, to name what changed."""
    if request.endpoint in NA__VV3D__RECORD_SAVES:
        try:
            folder = _project()
            g.na_vv3d_before = vv_shared.read_json_file(str(vv_shared.project_record_path(folder))) if folder else None
        except Exception:
            g.na_vv3d_before = None


def _after(response):
    known = NA__VV3D__WRITES.get(request.endpoint or '')
    if not known or response.status_code >= 400:
        return response
    try:
        action, text = known
        folder, body, detail = _project(), _body(), None
        target = _target(body)
        if request.endpoint in NA__VV3D__RECORD_SAVES:
            after = vv_shared.read_json_file(str(vv_shared.project_record_path(folder))) if folder else None
            unset = body.get('_unset') if isinstance(body.get('_unset'), list) else []
            action, text, changes = _record_text(getattr(g, 'na_vv3d_before', None), after or {}, unset)
            if not action:
                return response                                                # <-- Saved, but nothing changed
            target = (after or {}).get('displayName') or (after or {}).get('projectName') or ''
            detail = {c['What']: ', '.join(bit for bit in (f"{len(c['Added'])} new" if c['Added'] else '',
                                                           f"{len(c['Removed'])} removed" if c['Removed'] else '',
                                                           f"{c['Changed']} changed" if c['Changed'] else '') if bit) or 'changed'
                      for c in changes[:6]}
        elif action == 'dictionary.change':
            text = f"{'Added' if body.get('action') == 'add' else 'Removed'} a word {'to' if body.get('action') == 'add' else 'from'} the spelling dictionary"
        elif action == 'email.send':
            to = body.get('to') if isinstance(body.get('to'), list) else []
            text = f"Sent an email to {len(to)} {'person' if len(to) == 1 else 'people'}"
            target = str(body.get('subject') or '')[:120]
            detail = {'To': [str(x)[:80] for x in to[:6]]}
        else:
            text = text.format(name=(request.view_args or {}).get('name') or target or 'a file')
        named = getattr(g, 'na_vv3d_activity', None)                           # <-- A route that knows better names what it did
        if isinstance(named, dict):
            text   = named.get('text') or text
            target = named.get('target') or target
            detail = named.get('detail') or detail
        Na__Activity__Record(NA__VV3D__ACTIVITY_APP, action, text, project=folder.name if folder else '',
                             target=target, detail=detail)
    except Exception as error:                                                 # <-- Never fails the save it describes
        vv_shared.log(f' [ACTIVITY] not recorded ({type(error).__name__}: {error})')
    return response


def Na__Vv3dActivity__Install(app):
    """Hook the ledger into the ValeVision 3D API (wsgi.create_app)."""
    app.config['VALE_ACTIVITY_APP'] = NA__VV3D__ACTIVITY_APP
    app.before_request(_before)
    app.after_request(_after)

# endregion -------------------------------------------------------------------
