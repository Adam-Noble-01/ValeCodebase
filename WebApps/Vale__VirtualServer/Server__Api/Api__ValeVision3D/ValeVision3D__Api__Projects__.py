#!/usr/bin/env python3
# =============================================================================
# VALEVISION 3D - API - PROJECTS (THE PROJECT RECORD, ITS FILES AND ASSETS)
# =============================================================================
#
# FILE       : ValeVision3D__Api__Projects__.py
# MODULE     : ValeVision3D API Projects
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Read and write a project's record and ValeVision 3D files in the Projects
#              Master Library, for the app at /valevision/ (nginx proxies /valevision/api/)
# CREATED    : 06-Oct-2026
#
# DESCRIPTION:
# - The project routes ValeVision 3D used on the old local server
#   (WebApps/ValeVisionGallery/server.py), now the one store of record: no R2, no
#   Worker, no GitHub Pages copy. The app calls them RELATIVE to its page
#   (fetch('api/projects/64135__Washington')), so the same code runs on the
#   server and on Adam's PC.
# - READS ARE OPEN, WRITES NEED THE AUTHORING LEVEL. A project link
#   (/valevision/?project=<id>) is sent to clients, who have no account, so the
#   record, its drawings and its published files read without signing in, as
#   they always have. Every write needs a signed-in user at vv_shared.AUTHOR_LEVEL
#   (AppAdmin: the people who see the Dev Tools menu).
# - THE DRAWINGS SAVE GUARD (X-ValeVision-Drawings-Base) is kept exactly: a save
#   built on drawings that have since changed is refused with 409 and nothing
#   is written.
# - Every overwrite keeps the previous copy in <project>/ProjectData__Revisions/.
#
# ROUTES:
#   GET  /api/health
#   GET  /api/projects                                   every project (signed in)
#   GET  /api/projects/<id>                              the record, as stored
#   GET  /api/projects/<id>/location                     where its content is served from
#   POST /api/projects/<id>                              save the whole record (drawings guard)
#   PATCH /api/projects/<id>                             merge top-level keys into the record (drawings guard)
#   GET  /api/projects/<id>/drawings-fingerprint
#   GET|POST /api/projects/<id>/files/<name>             DrawingNotes / StatementDocs index
#   GET|POST /api/projects/<id>/drawing-notes            alias of files/ValeVision__DrawingNotes__.json
#   POST /api/projects/<id>/assets                       thumbnails, baked linework, snapshots
#   GET  /api/projects/<id>/userdata/<path>              a file the Layout Editor made
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 09-Oct-2026 - Version 1.2.0
# - _send_private moved into the core library as vv_shared.send_private_file (unchanged), with its
#   sandbox list, nginx prefix and content types, for the page layouts blueprint to share.
#
# 06-Oct-2026 - Version 1.1.0
# - Saves, merges and notes writes hold Na__Library__Locked(path) across processes (two
#   gunicorn workers, and the Gallery writing the same records); the drawings guard and the
#   merge read now happen inside the same cross-process lock as the write.
#
# 06-Oct-2026 - Version 1.0.0
# - Ported from ValeVisionGallery/server.py's project routes for the VPS (Master Library, sign-in,
#   revisions beside the project, the Worker's asset route folded in).
#
# =============================================================================

# #region ---------------------------------------------------------------------
# REGION | Imports
# -----------------------------------------------------------------------------

import os
import re

from flask import Blueprint, jsonify, request

import ValeVision3D__Api__Core__ as vv_shared
from ValeShared__Auth__ import Na__Auth__CurrentUser, Na__Auth__Require
from ValeShared__Library__ import (Na__Library__Conflict, Na__Library__ListProjects, Na__Library__Locked,
                                   Na__Library__ReadJson, Na__Library__WriteJson)

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Configuration
# -----------------------------------------------------------------------------

valevision_projects_api  = Blueprint('valevision_projects_api', __name__)

DRAWING_NOTES_FILE       = 'ValeVision__DrawingNotes__.json'
REQUIRED_RECORD_KEYS     = ('projectName', 'projectCode')                         # <-- A save without them would blank the Gallery's card
MERGE_UNSET_KEY          = '_unset'                                               # <-- PATCH: the keys to remove

# ASSET PATHS | The three families the app uploads, and where each lands in the project
ASSET_PATH_GUARD         = re.compile(r'^(PresentationMode/Thumbnails|LayoutEditor/(Linework|Snapshots))/[A-Za-z0-9_.-]+\.(webp|png|json)$')
ASSET_THUMBS_PREFIX      = 'PresentationMode/Thumbnails/'                         # <-- -> ValeVision3D/Content__AnimationScenes__Thumbnails/ (public)

# USER DATA | What a GET of userdata/<path> may send (the Layout Editor's own files)
USERDATA_EXTENSIONS      = ('.webp', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tif', '.tiff', '.json', '.pdf', '.svg',
                            '.md', '.txt', '.html', '.zip')                       # <-- Sent by vv_shared.send_private_file (HTML and SVG sandboxed)

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Helpers
# -----------------------------------------------------------------------------

def _project_or_404(token):
    folder = vv_shared.resolve_project(token)
    if not folder:
        return None, (jsonify({'error': f'Project not found: {token}'}), 404)
    return folder, None


def _user_code():
    user = Na__Auth__CurrentUser()
    return (user or {}).get('code') or ''

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Health and the Project List
# -----------------------------------------------------------------------------

@valevision_projects_api.get('/api/health')
def health():
    return jsonify({'ok': True, 'status': 'ok', 'app': vv_shared.APP_NAME, 'service': vv_shared.SERVICE_NAME})


@valevision_projects_api.get('/api/projects')
@Na__Auth__Require('Affiliate')
def list_projects():
    """Every project in the library: id, name, code, year, shown or hidden. Client names, so signed in only."""
    out = []
    for pid, folder in Na__Library__ListProjects():
        rec = Na__Library__ReadJson(vv_shared.project_record_path(folder)) or {}
        out.append({
            'id'      : pid,
            'year'    : vv_shared.Na__Library__Year(folder),
            'code'    : rec.get('projectCode') or '',
            'name'    : rec.get('displayName') or rec.get('projectName') or pid,
            'enabled' : rec.get('enabled', True) is not False,
            'hasModel': bool(rec.get('valeVision_ModelUrls') or rec.get('valeVision_ModelUrl')
                             or rec.get('valeVision_ModelUrl_BaseMesh')),
        })
    return jsonify({'ok': True, 'projects': out})

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | The Project Record
# -----------------------------------------------------------------------------

@valevision_projects_api.get('/api/projects/<path:token>')
def get_project(token):
    """The project record, as stored (keys in the order they were written), never cached."""
    folder, missing = _project_or_404(token)
    if missing:
        return missing
    path = vv_shared.project_record_path(folder)
    if not path.is_file():
        return jsonify({'error': f'Project not found: {token}'}), 404
    return vv_shared.send_json_file(str(path))


@valevision_projects_api.get('/api/projects/<path:token>/location')
def project_location(token):
    """Where the project's content is served from: { id, year, folder, webBase, modelsUrl, scenesUrl, galleryUrl }."""
    folder, missing = _project_or_404(token)
    if missing:
        return missing
    response = jsonify({'ok': True, **vv_shared.project_summary(folder.name, folder)})
    response.headers['Cache-Control'] = 'no-store'
    return response


@valevision_projects_api.post('/api/projects/<path:token>')
@Na__Auth__Require(vv_shared.AUTHOR_LEVEL)
def save_project(token):
    """
    Save the whole record. A save carrying X-ValeVision-Drawings-Base is refused
    with 409 { error, conflict, drawings } when the drawings block on disk is no
    longer the one its window loaded; nothing is written. The previous copy is
    kept as a revision; the answer carries the fingerprint now on disk.
    """
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not data:
        return jsonify({'error': 'No project data provided'}), 400
    missing_keys = [k for k in REQUIRED_RECORD_KEYS if not data.get(k)]
    if missing_keys:
        return jsonify({'error': f'Project data is missing {", ".join(missing_keys)}'}), 400
    folder, missing = _project_or_404(token)
    if missing:
        return missing
    path = vv_shared.project_record_path(folder)

    with Na__Library__Locked(path):
        base_sent = request.headers.get(vv_shared.DRAWINGS_BASE_HEADER)
        if base_sent is not None:
            on_disk = vv_shared.drawings_fingerprint(vv_shared.read_json_file(str(path)))
            if (base_sent.strip() or 'none') != (on_disk['digest'] or 'none'):
                vv_shared.log(f' [SAVE GUARD] Refused a drawings save for {folder.name}: the block on disk is not the one the window loaded')
                return jsonify({
                    'error'    : 'The drawings on the server are not the ones this window loaded: they were saved '
                                 'elsewhere since. Reload to pick them up before saving.',
                    'conflict' : True,
                    'drawings' : on_disk
                }), 409
        try:
            written = Na__Library__WriteJson(path, data, user_code=_user_code(), project_folder=folder)
        except Na__Library__Conflict as conflict:                                 # <-- Only when an expected _rev is sent (not used by this app yet)
            return jsonify({'error': 'The project changed on the server since it was loaded.', 'conflict': True,
                            'current': conflict.current}), 409

    return jsonify({
        'success'  : True,
        'message'  : f'Project {folder.name} saved',
        'drawings' : vv_shared.drawings_fingerprint(data),
        'revision' : written.get('revision'),                                     # <-- The copy kept, inside the project
        'rev'      : written.get('rev')                                           # <-- The record's _rev now on the server
    })


@valevision_projects_api.patch('/api/projects/<path:token>')
@Na__Auth__Require(vv_shared.AUTHOR_LEVEL)
def merge_project_keys(token):
    """
    Merge top-level keys into the record AS IT IS ON THE SERVER, in one locked
    step: the body is { key: value, ..., "_unset": [names to remove] }; every
    other key - the Gallery's, the SketchUp sync's, another window's - stays
    exactly as the file has it. The drawings save guard applies as for a
    whole save.
    """
    keys = request.get_json(silent=True)
    if not isinstance(keys, dict) or not keys:
        return jsonify({'error': 'Nothing to merge'}), 400
    unset = keys.pop(MERGE_UNSET_KEY, None) or []                                  # <-- Keys to remove, named in the same request
    if not isinstance(unset, list) or not all(isinstance(k, str) for k in unset):
        return jsonify({'error': f'{MERGE_UNSET_KEY} must be a list of key names'}), 400
    folder, missing = _project_or_404(token)
    if missing:
        return missing
    path = vv_shared.project_record_path(folder)

    with Na__Library__Locked(path):
        current = vv_shared.read_json_file(str(path))
        if current is None:
            return jsonify({'error': f'The record of {folder.name} could not be read'}), 500
        base_sent = request.headers.get(vv_shared.DRAWINGS_BASE_HEADER)
        if base_sent is not None:
            on_disk = vv_shared.drawings_fingerprint(current)
            if (base_sent.strip() or 'none') != (on_disk['digest'] or 'none'):
                vv_shared.log(f' [SAVE GUARD] Refused a drawings merge for {folder.name}: the block on disk is not the one the window loaded')
                return jsonify({
                    'error'    : 'The drawings on the server are not the ones this window loaded: they were saved '
                                 'elsewhere since. Reload to pick them up before saving.',
                    'conflict' : True,
                    'drawings' : on_disk
                }), 409
        merged = dict(current)
        merged.update(keys)
        for name in unset:
            merged.pop(name, None)
        written = Na__Library__WriteJson(path, merged, user_code=_user_code(), project_folder=folder)

    return jsonify({'success': True, 'message': f'Project {folder.name} updated', 'keys': sorted(keys), 'removed': sorted(unset),
                    'drawings': vv_shared.drawings_fingerprint(merged), 'revision': written.get('revision'),
                    'rev': written.get('rev')})


@valevision_projects_api.get('/api/projects/<path:token>/drawings-fingerprint')
def project_drawings_fingerprint(token):
    folder, missing = _project_or_404(token)
    if missing:
        return missing
    path = vv_shared.project_record_path(folder)
    response = jsonify({
        'status'   : 'ok',
        'folderId' : folder.name,
        'drawings' : vv_shared.drawings_fingerprint(vv_shared.read_json_file(str(path)))
    })
    response.headers['Cache-Control'] = 'no-store'
    return response

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | The Record's Sibling Files (Drawing Notes, Statement Index)
# -----------------------------------------------------------------------------

def _sibling_file(token, file_name, label):
    safe_name = vv_shared.sanitize_sibling_filename(file_name)
    if not safe_name:
        return jsonify({'error': f'Refused project file "{file_name}"'}), 400
    drawings = vv_shared.resolve_project_dir(folder_id=token)
    if not drawings:
        return jsonify({'error': f'Project not found: {token}'}), 404
    path = os.path.join(drawings, safe_name)

    if request.method == 'GET':
        if not os.path.isfile(path):
            return jsonify({'error': f'{safe_name} is not on the server yet', 'missing': True}), 404
        return vv_shared.send_json_file(path)

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({'error': f'{label} must be a JSON object'}), 400
    with Na__Library__Locked(path):
        revision = vv_shared.keep_revision(path, _user_code())
        vv_shared.write_json_file(path, data)
    return jsonify({'success': True, 'message': f'{label} saved for {token}', 'revision': revision})


@valevision_projects_api.get('/api/projects/<path:token>/files/<name>')
def read_project_file(token, name):
    return _sibling_file(token, name, name)


@valevision_projects_api.post('/api/projects/<path:token>/files/<name>')
@Na__Auth__Require(vv_shared.AUTHOR_LEVEL)
def write_project_file(token, name):
    return _sibling_file(token, name, name)


@valevision_projects_api.get('/api/projects/<path:token>/drawing-notes')
def read_drawing_notes(token):
    return _sibling_file(token, DRAWING_NOTES_FILE, 'Drawing notes')


@valevision_projects_api.post('/api/projects/<path:token>/drawing-notes')
@Na__Auth__Require(vv_shared.AUTHOR_LEVEL)
def write_drawing_notes(token):
    return _sibling_file(token, DRAWING_NOTES_FILE, 'Drawing notes')

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Assets the App Makes, and the Files It Reads Back
# -----------------------------------------------------------------------------

@valevision_projects_api.post('/api/projects/<path:token>/assets')
@Na__Auth__Require(vv_shared.AUTHOR_LEVEL)
def save_project_asset(token):
    """
    One binary asset (multipart: path, file). Paths are the app's own, relative
    to the project: PresentationMode/Thumbnails/<f> lands in the public scene
    thumbnails bucket; LayoutEditor/{Linework,Snapshots}/<f> in the drawings
    user-data folder. Answers { success, path, url } - url is where to read it.
    """
    rel_path = (request.form.get('path') or '').strip()
    asset    = request.files.get('file')
    if not asset:
        return jsonify({'error': 'No asset file provided'}), 400
    if not ASSET_PATH_GUARD.match(rel_path):
        return jsonify({'error': f'Asset path not allowed: {rel_path}'}), 400
    folder, missing = _project_or_404(token)
    if missing:
        return missing

    if rel_path.startswith(ASSET_THUMBS_PREFIX):
        dest = folder / vv_shared.APP_BUCKET / vv_shared.SCENE_THUMBS_DIR / rel_path[len(ASSET_THUMBS_PREFIX):]
        url  = vv_shared.project_web_base(folder) + f'{vv_shared.APP_BUCKET}/{vv_shared.SCENE_THUMBS_DIR}/{dest.name}'
    else:
        dest = folder / vv_shared.APP_BUCKET / vv_shared.DRAWINGS_DIR / rel_path
        url  = f'api/projects/{folder.name}/userdata/{rel_path}'
    if not vv_shared.is_inside(dest.parent, vv_shared.PROJECTS_ROOT):
        return jsonify({'error': f'Asset path not allowed: {rel_path}'}), 400
    vv_shared.write_bytes_atomic(str(dest), asset.read())
    return jsonify({'success': True, 'path': rel_path, 'url': url, 'message': f'Asset saved: {rel_path}'})


@valevision_projects_api.get('/api/projects/<path:token>/userdata/<path:rel_path>')
def read_project_userdata(token, rel_path):
    """A file the Layout Editor made (snapshots, baked linework, sheet images, published files)."""
    drawings = vv_shared.resolve_project_dir(folder_id=token)
    if not drawings:
        return jsonify({'error': f'Project not found: {token}'}), 404
    parts = [p for p in rel_path.replace('\\', '/').split('/') if p]
    if not parts or any(p in ('.', '..') or p.startswith('.') for p in parts) or not parts[-1].lower().endswith(USERDATA_EXTENSIONS):
        return jsonify({'error': 'Refused path'}), 400
    path = os.path.join(drawings, *parts)
    if not vv_shared.is_inside(path, drawings) or not os.path.isfile(path):
        return jsonify({'error': f'Not on the server: {rel_path}', 'missing': True}), 404
    return vv_shared.send_private_file(path)

# endregion -------------------------------------------------------------------
