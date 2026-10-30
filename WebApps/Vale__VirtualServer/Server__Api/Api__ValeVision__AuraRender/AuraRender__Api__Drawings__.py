#!/usr/bin/env python3
# =============================================================================
# VALEVISION AURA - API - PROJECTS AND DRAWING SETS
# =============================================================================
#
# FILE       : AuraRender__Api__Drawings__.py
# MODULE     : AURA API Drawings
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : The health check, the page's config, a project's name and number,
#              and a project's AURA drawing set: read it, save it
# CREATED    : 30-Oct-2026
#
# DESCRIPTION:
# - A DRAWING SET is one JSON document per project (sheets, viewports, notes and
#   their written ink, saved 3D views, the engine's settings), kept in the
#   project's library folder as user data (AuraRender__Api__Core__ drawings_path).
# - SAVE is a whole-document PUT carrying the _rev it was loaded at. Someone else
#   saving first answers 409 with nothing overwritten; every save keeps the
#   previous copy as a revision in the project (ValeShared__Library__ WriteJson).
# - A PROJECT IS NAMED IN THE GALLERY, never here (its Display Name Alias, else
#   its projectName).
# - A PROJECT OPENS ONLY WHEN SWITCHED ON in the Gallery's Project Editor
#   (auraEnabled). Every project route answers the rest 403 with notSwitchedOn,
#   so the page can say why; nothing of theirs is read or written.
#
# ROUTES:
#   GET  /api/health
#   GET  /api/config                          the app's config (public: no data in it)
#   GET  /api/projects/<id>                   the project's id, number, name (Management, switched on)
#   GET  /api/projects/<id>/drawings          the drawing set and its _rev, or null (Management, switched on)
#   PUT  /api/projects/<id>/drawings          the whole set, with the _rev it was loaded at (Management, switched on);
#                                             stores in the scene any placed library asset it has not stored yet
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 30-Oct-2026 - Version 1.2.0
# - A save stores the library assets it places that the project's scene has
#   not stored yet (AuraRender__Api__Scene__ store_assets: MOD and DAT copied
#   once into Content__AuraScene__AssetFiles); the answer lists them in
#   assetsStored. Storing never fails the save: the set is written first.
#
# 30-Oct-2026 - Version 1.1.0
# - Projects not switched on for AURA in the Gallery's Project Editor are refused
#   (403, notSwitchedOn): _open_project replaces _project_or_404.
#
# 30-Oct-2026 - Version 1.0.0
# - Initial build.
#
# =============================================================================

# #region ---------------------------------------------------------------------
# REGION | Imports
# -----------------------------------------------------------------------------

import json

from flask import Blueprint, jsonify, request

import AuraRender__Api__Core__ as aura_core
import AuraRender__Api__Scene__ as aura_scene
from ValeShared__Library__ import Na__Library__Conflict, Na__Library__ReadJson, Na__Library__WriteJson

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Configuration
# -----------------------------------------------------------------------------

aura_drawings_api        = Blueprint('aura_drawings_api', __name__)

ROOT_KEYS                = ('AuraDrawingSet__Meta', 'AuraDrawingSet__Engine', 'AuraDrawingSet__SavedViews', 'AuraDrawingSet__Sheets')
MAX_SHEETS               = 60

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Helpers
# -----------------------------------------------------------------------------

def _open_project(pid):
    """The project's folder, or the refusal: 404 when the library has no such project, 403 when
    it is not switched on for AURA (the Gallery's Project Editor)."""
    folder = aura_core.project_folder(pid)
    if not folder:
        return None, aura_core.fail(f'no project {pid!r}', 404)
    if not aura_core.project_switched_on(folder):
        return None, aura_core.fail('This project is not switched on for ValeVision AURA. Projects are switched on '
                                    'one at a time, in ValeVision Gallery\'s Project Editor.', 403, notSwitchedOn=True)
    return folder, None


def _check_set(doc):
    """None when the document is a drawing set AURA can keep, else what is wrong with it."""
    if not isinstance(doc, dict):
        return 'expected a JSON object'
    unknown = [k for k in doc if k not in ROOT_KEYS and k != '_rev']
    if unknown:
        return f'unknown keys: {", ".join(unknown[:5])}'
    sheets = doc.get('AuraDrawingSet__Sheets')
    if not isinstance(sheets, list):
        return 'AuraDrawingSet__Sheets must be a list'
    if len(sheets) > int(aura_core.config().get('AuraConfig__Save__MaxSheets') or MAX_SHEETS):
        return 'too many sheets'
    if any(not isinstance(s, dict) or not s.get('Sheet__Id') for s in sheets):
        return 'every sheet needs a Sheet__Id'
    if not isinstance(doc.get('AuraDrawingSet__SavedViews', []), list):
        return 'AuraDrawingSet__SavedViews must be a list'
    return None

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Health and Config
# -----------------------------------------------------------------------------

@aura_drawings_api.get('/api/health')
def health():
    return jsonify({'ok': True, 'app': aura_core.APP_NAME, 'service': aura_core.SERVICE_NAME})


@aura_drawings_api.get('/api/config')
def client_config():
    """The app's config: sheets, title block, scales, parameters, annotations. No project data."""
    response = jsonify({'ok': True, 'config': aura_core.config()})
    response.headers['Cache-Control'] = 'no-cache'
    return response

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | A Project and Its Drawing Set
# -----------------------------------------------------------------------------

@aura_drawings_api.get('/api/projects/<pid>')
@aura_core.require_access
def project(pid):
    folder, missing = _open_project(pid)
    if missing:
        return missing
    response = jsonify({'ok': True, 'project': aura_core.project_public(folder)})
    response.headers['Cache-Control'] = 'no-store'
    return response


@aura_drawings_api.get('/api/projects/<pid>/drawings')
@aura_core.require_access
def read_drawings(pid):
    folder, missing = _open_project(pid)
    if missing:
        return missing
    try:
        doc = Na__Library__ReadJson(aura_core.drawings_path(folder))
    except (OSError, ValueError) as error:
        aura_core.log(f'[AURA API] drawing set unreadable for {folder.name}: {error}')
        return aura_core.fail('The drawing set on the server could not be read.', 500)
    response = jsonify({'ok': True, 'drawings': doc, 'rev': int((doc or {}).get('_rev', 0) or 0)})
    response.headers['Cache-Control'] = 'no-store'
    return response


@aura_drawings_api.put('/api/projects/<pid>/drawings')
@aura_core.require_access
def save_drawings(pid):
    folder, missing = _open_project(pid)
    if missing:
        return missing
    if (request.content_length or 0) > aura_core.max_bytes():
        return aura_core.fail('The drawing set is too large to save.', 413)
    doc = request.get_json(silent=True)
    problem = _check_set(doc)
    if problem:
        return aura_core.fail(f'Not a drawing set AURA can save: {problem}.', 400)
    expected = doc.pop('_rev', None)
    path = aura_core.drawings_path(folder)
    first = not path.is_file()
    try:
        result = Na__Library__WriteJson(path, doc, aura_core.user_code(), folder,
                                        expected_rev=int(expected) if expected is not None else None,
                                        revision_every_s=300)                      # <-- Autosave: one kept revision every five minutes at most
    except Na__Library__Conflict as conflict:
        return aura_core.fail('Someone else saved this drawing set first.', 409, rev=int(conflict.current.get('_rev', 0) or 0))
    except (OSError, ValueError, TypeError) as error:
        aura_core.log(f'[AURA API] save failed for {folder.name}: {error}')
        return aura_core.fail('The drawing set could not be saved on the server.', 500)
    if first:
        aura_core.activity('drawings.create', 'Started an AURA drawing set', folder)
    try:
        stored = aura_scene.store_assets(folder, doc)                             # <-- A placed asset the scene has not stored yet: its MOD and DAT copied once
    except (OSError, ValueError, KeyError, TypeError, Na__Library__Conflict) as error:
        aura_core.log(f'[AURA API] assets not stored for {folder.name}: {error}')  # <-- The set is saved; the next save tries again
        stored = []
    sheets = doc.get('AuraDrawingSet__Sheets') or []
    response = jsonify({'ok': True, 'rev': result['rev'], 'sheets': len(sheets), 'bytes': len(json.dumps(doc)), 'assetsStored': stored})
    response.headers['Cache-Control'] = 'no-store'
    return response

# endregion -------------------------------------------------------------------
