# =============================================================================
# VALEVISION3D API - PLACED ASSETS - THE ROUTES
# =============================================================================
#
# FILE       : ValeVision3D__Api__SceneAssets__.py
# NAMESPACE  : valevision_scene_assets_api
# MODULE     : API - Placed Assets
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Let Employees place people and plants, keep who did what, hold what is
#              waiting for an admin, and put anyone's changes back
# CREATED    : 05-Nov-2026
#
# DESCRIPTION:
# - THE RECORD ROUTES STAY AT THE ADMIN'S LEVEL. These four are the only way an Employee changes
#   anything here. Since v2.96.0 (NA_STAFF_SAVES_GO_STRAIGHT_IN) an Employee's save and own put back
#   go straight into the record, and a save publishes whatever was left waiting from before; with the
#   switch off, what an Employee sends waits for an admin's approval as v2.89.0 built it. Approve
#   stays, for an admin, for anything waiting. The sums, and why, are in
#   ./ValeVision3D__Api__SceneAssets__Logic__.py.
# - THE LAST SEGMENT OF EVERY ROUTE IS FIXED (note 14, section 3.2). The system is in the body or
#   the query. A write resolves through resolve_project_exact, so a path that fell through can
#   never land on another project.
# - EVERY READ NEEDS AN EMPLOYEE. These endpoints are not in CLIENT_READ_ENDPOINTS, so a client link
#   is refused by the guard before it gets here, and they hold staff names.
# - THE SERVER DECIDES WHO IS AN ADMIN. A page saying so counts for nothing. The level is
#   vv_shared.AUTHOR_LEVEL, the same as the record's writes.
#
# ROUTES:
#   GET  /api/projects/<token>/scene-assets/working?system=Entourage   what staff work on, and who did what
#   POST /api/projects/<token>/scene-assets/save     { system, base, object }
#   POST /api/projects/<token>/scene-assets/approve  { system, by? }    admin
#   POST /api/projects/<token>/scene-assets/revert   { system, of? }    of: anyone's for an admin, else your own
#
# FILES:
#   <project>/ValeVision3D/UserData__SceneAssets/ValeVision__SceneAssets__Changes__.json
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 11-Nov-2026 - Version 1.1.0 (ValeVision3D v2.96.0)
# - Staff saves and their own put back go straight into the record; a save publishes what was
#   left waiting, and says how many (published).
#
# 05-Nov-2026 - Version 1.0.0 (ValeVision3D v2.89.0)
# - Initial build.
#
# =============================================================================

from flask import Blueprint, g, jsonify, request

import ValeVision3D__Api__Core__ as vv_shared
import ValeVision3D__Api__SceneAssets__Logic__ as na_assets
from ValeShared__Auth__ import Na__Auth__CurrentUser, Na__Auth__Level, Na__Auth__Ranks, Na__Auth__Require
from ValeShared__Library__ import Na__Library__Locked, Na__Library__ReadJson, Na__Library__WriteJson

# #region ---------------------------------------------------------------------
# REGION | Configuration
# -----------------------------------------------------------------------------

valevision_scene_assets_api = Blueprint('valevision_scene_assets_api', __name__)

CHANGES_DIR   = 'UserData__SceneAssets'                                           # <-- <project>/ValeVision3D/<this>/: nginx denies it, and it is never pushed over
CHANGES_FILE  = 'ValeVision__SceneAssets__Changes__.json'
KEEP_REVISIONS = 20

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Helpers
# -----------------------------------------------------------------------------

def changes_path(folder):
    return folder / 'ValeVision3D' / CHANGES_DIR / CHANGES_FILE


def read_changes(folder):
    path = changes_path(folder)
    found = Na__Library__ReadJson(path) if path.is_file() else None
    return found if isinstance(found, dict) else na_assets.na_new_changes()


def write_changes(folder, changes, who):
    Na__Library__WriteJson(changes_path(folder), changes, user_code=who['code'], project_folder=folder, keep_revisions=KEEP_REVISIONS, revision_every_s=60)


def who_is_asking():
    user = Na__Auth__CurrentUser() or {}
    return {'code': user.get('code') or '', 'name': user.get('name') or user.get('code') or 'Someone'}


def is_admin():
    return Na__Auth__Level(Na__Auth__CurrentUser()) <= Na__Auth__Ranks().get(vv_shared.AUTHOR_LEVEL, 1)


def system_named(name):
    return name if name in na_assets.NA_SYSTEMS else None


def answer_for(system, approved_object, changes, who, **extra):
    """What a page needs after anything here: what staff now work on, and who did what."""
    return jsonify({
        'ok'       : True,
        'system'   : system,
        'object'   : na_assets.na_working(system, approved_object, changes),
        'summary'  : na_assets.na_summary(system, changes, who['code']),
        'me'       : who,
        'isAdmin'  : is_admin(),
        **extra
    })


def write_record_key(folder, record_path, record, system, approved, who):
    """The approved object into the record, under the lock the caller holds."""
    key = na_assets.NA_SYSTEMS[system]['Key']
    merged = dict(record)
    merged[key] = approved
    Na__Library__WriteJson(record_path, merged, user_code=who['code'], project_folder=folder)


def named_activity(action, text, folder, detail):
    """Who did what, in the shared activity ledger: the route knows better than the hook."""
    g.na_vv3d_activity = {'action': action, 'text': text, 'target': folder.name, 'detail': detail}

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Routes
# -----------------------------------------------------------------------------

@valevision_scene_assets_api.get('/api/projects/<path:token>/scene-assets/working')
@Na__Auth__Require('Employee')
def scene_assets_working(token):
    system = system_named(request.args.get('system'))
    folder = vv_shared.resolve_project_exact(token)
    if not system or not folder:
        return jsonify({'error': 'That is not a project and a system of placed assets'}), 404
    record = vv_shared.read_json_file(str(vv_shared.project_record_path(folder))) or {}
    response = answer_for(system, record.get(na_assets.NA_SYSTEMS[system]['Key']), read_changes(folder), who_is_asking())
    response.headers['Cache-Control'] = 'no-store'
    return response


@valevision_scene_assets_api.post('/api/projects/<path:token>/scene-assets/save')
@Na__Auth__Require('Employee')
def scene_assets_save(token):
    body = request.get_json(silent=True)
    if not isinstance(body, dict) or not isinstance(body.get('object'), dict):
        return jsonify({'error': 'Nothing to save'}), 400
    system = system_named(body.get('system'))
    folder = vv_shared.resolve_project_exact(token)
    if not system or not folder:
        return jsonify({'error': 'That is not a project and a system of placed assets'}), 404

    who = who_is_asking()
    admin = is_admin()
    straight = admin or na_assets.NA_STAFF_SAVES_GO_STRAIGHT_IN
    record_path = vv_shared.project_record_path(folder)
    key = na_assets.NA_SYSTEMS[system]['Key']
    published = 0
    with Na__Library__Locked(record_path):
        record = vv_shared.read_json_file(str(record_path))
        if record is None:
            return jsonify({'error': f'The record of {folder.name} could not be read'}), 500
        before = record.get(key)
        changes = read_changes(folder)
        approved, changes, counts, renamed = na_assets.na_save(system, before, changes, body.get('base'), body['object'], who, admin, straight)
        if straight and na_assets.na_system_block(changes, system)['Waiting']:
            approved, changes, published = na_assets.na_approve(system, approved, changes, who)   # <-- Left waiting from before staff saves went straight in
        if straight and approved is not None and not na_assets.na_same(approved, before):
            write_record_key(folder, record_path, record, system, approved, who)
        write_changes(folder, changes, who)

    named_activity('settings.save', f"Saved {system.lower()}" + ('' if straight else ', waiting for approval'), folder, counts)
    return answer_for(system, approved if straight else before, changes, who, counts=counts, renamed=renamed, approvedNow=straight, published=published)


@valevision_scene_assets_api.post('/api/projects/<path:token>/scene-assets/approve')
@Na__Auth__Require(vv_shared.AUTHOR_LEVEL)
def scene_assets_approve(token):
    body = request.get_json(silent=True)
    body = body if isinstance(body, dict) else {}
    system = system_named(body.get('system'))
    folder = vv_shared.resolve_project_exact(token)
    if not system or not folder:
        return jsonify({'error': 'That is not a project and a system of placed assets'}), 404

    who = who_is_asking()
    record_path = vv_shared.project_record_path(folder)
    key = na_assets.NA_SYSTEMS[system]['Key']
    with Na__Library__Locked(record_path):
        record = vv_shared.read_json_file(str(record_path))
        if record is None:
            return jsonify({'error': f'The record of {folder.name} could not be read'}), 500
        changes = read_changes(folder)
        approved, changes, count = na_assets.na_approve(system, record.get(key), changes, who, body.get('by') or None)
        if count:
            write_record_key(folder, record_path, record, system, approved, who)
            write_changes(folder, changes, who)

    named_activity('settings.save', f"Approved {count} {system.lower()} change{'' if count == 1 else 's'}", folder, {'Approved': count})
    return answer_for(system, approved, changes, who, approved=count)


@valevision_scene_assets_api.post('/api/projects/<path:token>/scene-assets/revert')
@Na__Auth__Require('Employee')
def scene_assets_revert(token):
    body = request.get_json(silent=True)
    body = body if isinstance(body, dict) else {}
    system = system_named(body.get('system'))
    folder = vv_shared.resolve_project_exact(token)
    if not system or not folder:
        return jsonify({'error': 'That is not a project and a system of placed assets'}), 404

    who = who_is_asking()
    admin = is_admin()
    of_code = body.get('of') or who['code']
    if of_code != who['code'] and not admin:
        return jsonify({'error': f'Only an {vv_shared.AUTHOR_LEVEL} can remove someone else\'s changes'}), 403

    straight = admin or na_assets.NA_STAFF_SAVES_GO_STRAIGHT_IN                   # <-- Someone else's still needs an admin: refused above
    record_path = vv_shared.project_record_path(folder)
    key = na_assets.NA_SYSTEMS[system]['Key']
    with Na__Library__Locked(record_path):
        record = vv_shared.read_json_file(str(record_path))
        if record is None:
            return jsonify({'error': f'The record of {folder.name} could not be read'}), 500
        before = record.get(key)
        changes = read_changes(folder)
        approved, changes, restored, left_alone = na_assets.na_revert(system, before, changes, who, of_code, straight)
        if straight and approved is not None and not na_assets.na_same(approved, before):
            write_record_key(folder, record_path, record, system, approved, who)
        write_changes(folder, changes, who)

    named_activity('settings.save', f"Put back {len(restored)} {system.lower()} change{'' if len(restored) == 1 else 's'}", folder,
                   {'Put back': len(restored), 'Left alone': len(left_alone)})
    return answer_for(system, approved if straight else before, changes, who, restored=restored, leftAlone=left_alone, approvedNow=straight)

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | The Record's Own Routes, Told of What They Wrote
# -----------------------------------------------------------------------------

def note_record_write(folder, before_record, after_record, removed_keys):
    """A whole-key write: a SketchUp sync, Remove All. Already approved, and on the record all the same.
    A key taken out takes its waiting changes and its history of who did what with it. It never fails the save."""
    try:
        who = who_is_asking()
        for system, settings in na_assets.NA_SYSTEMS.items():
            key = settings['Key']
            if key not in removed_keys and na_assets.na_same(before_record.get(key), after_record.get(key)):
                continue
            changes = read_changes(folder)
            if key in removed_keys:
                changes.get('SceneAssets__Changes__Systems', {}).pop(system, None)
            else:
                na_assets.na_note_direct(system, before_record.get(key), after_record.get(key), changes, who)
            write_changes(folder, changes, who)
    except Exception as error:                                                    # <-- Who did what must never cost anyone their save
        vv_shared.log(f' [SCENE ASSETS] not noted ({type(error).__name__}: {error})')

# endregion -------------------------------------------------------------------
