#!/usr/bin/env python3
# =============================================================================
# VALEVISION AURA - API CORE (WHO MAY ASK, AND THE FILES EVERY ROUTE SHARES)
# =============================================================================
#
# FILE       : AuraRender__Api__Core__.py
# MODULE     : AURA API Core
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : The helpers every AURA API route shares: the app's config, who may
#              use AURA (Management and AppAdmin only, for now), the project and
#              where its drawing set lives, and the activity ledger
# CREATED    : 30-Oct-2026
#
# DESCRIPTION:
# - ONE LIBRARY, NO ROUTES. The blueprints import it as aura_core.
# - WHO: Management and AppAdmin (Adam, 30-Oct-2026: "only give managers and
#   admin access, not employees, yet"). The level comes from the app config
#   (AuraConfig__Access__MinimumLevel), so opening AURA to Employees later is
#   one value. Every project route is decorated with Na__Auth__Require(LEVEL).
# - WHICH PROJECTS: only those switched on in ValeVision Gallery's Project Editor
#   (auraEnabled true in the project record; Adam, 30-Oct-2026: "Make all
#   projects NOT available for Aura unless I enable in the project form per
#   project"). A record without it is off. The Gallery writes it; AURA only
#   reads it (project_switched_on).
# - A PROJECT'S DRAWING SET is user data in the Projects Master Library:
#     <project>/ValeVision__AuraRender/UserData__AuraDrawings/<id>__AuraDrawingSet__.json
#   written through ValeShared__Library__ (the _rev check and a kept revision on
#   every save); nginx denies UserData folders, so it is read only through here.
# - The app's config is read from the app's own folder
#   (Vale__ValeVision__AuraRender/02__Src__AppModules/02__AppData), the same file
#   the page reads, so the server and the page never disagree.
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 30-Oct-2026 - Version 1.1.0
# - project_switched_on: AURA opens only the projects switched on in the
#   Gallery's Project Editor (auraEnabled).
#
# 30-Oct-2026 - Version 1.0.0
# - Initial build.
#
# =============================================================================

# #region ---------------------------------------------------------------------
# REGION | Imports
# -----------------------------------------------------------------------------

import functools
import json
import time
from pathlib import Path

from flask import jsonify

from ValeShared__Activity__ import Na__Activity__Record
from ValeShared__Auth__ import NA__AUTH__DEFAULT_RANKS, Na__Auth__CurrentUser, Na__Auth__Level, Na__Auth__Ranks
from ValeShared__Library__ import Na__Library__DisplayName, Na__Library__Find, Na__Library__ReadJson, Na__Library__Year

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Configuration
# -----------------------------------------------------------------------------

APP_NAME                 = 'ValeVision__AuraRender'
ACTIVITY_APP             = 'ValeVision AURA'                                      # <-- Its name in the activity ledger (Server Manager tab 05)
SERVICE_NAME             = 'aura-api'                                             # <-- What GET /api/health names
MIRROR_ROOT              = Path(__file__).resolve().parents[2]                    # <-- The code's own mirror (the server root on the VPS)
APP_DIR                  = MIRROR_ROOT / 'Vale__ValeVision__AuraRender'
CONFIG_FILE              = APP_DIR / '02__Src__AppModules' / '02__AppData' / 'Na__AppConfig__AuraRender__.json'
BUCKET                   = 'ValeVision__AuraRender'                               # <-- AURA's folder in each project
SWITCH_KEY               = 'auraEnabled'                                          # <-- In the project record, ticked in the Gallery's Project Editor
DRAWINGS_DIR             = 'UserData__AuraDrawings'
CONFIG_TTL_S             = 10
_CONFIG                  = {'at': 0.0, 'value': {}}

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Config and Access
# -----------------------------------------------------------------------------

def config():
    """The app's config (re-read at most every few seconds); {} if it cannot be read."""
    now = time.time()
    if now - _CONFIG['at'] > CONFIG_TTL_S:
        try:
            _CONFIG['value'] = json.loads(CONFIG_FILE.read_text(encoding='utf-8'))
        except (OSError, ValueError) as error:
            log(f'[AURA API] config unreadable: {error}')
        _CONFIG['at'] = now
    return _CONFIG['value']


def access_level():
    """The level AURA needs: Management, unless the config says otherwise."""
    level = str(config().get('AuraConfig__Access__MinimumLevel') or 'Management')
    return level if level in ('AppAdmin', 'Management', 'Employee') else 'Management'


def max_bytes():
    return int(config().get('AuraConfig__Save__MaxBytes') or 4 * 1024 * 1024)


def require_access(view):
    """Signed in, a permanent password, and at least AURA's level, read on every request
    (ValeShared__Auth__'s Na__Auth__Require, with the level from the app config)."""
    @functools.wraps(view)
    def inner(*args, **kwargs):
        user = Na__Auth__CurrentUser()
        if not user:
            return fail('sign-in required', 401)
        if user['mustChangePassword']:
            return fail('choose a new password first', 403, mustChangePassword=True)
        level = access_level()
        need = Na__Auth__Ranks().get(level, NA__AUTH__DEFAULT_RANKS.get(level, 0))
        if Na__Auth__Level(user) > need:
            return fail('ValeVision AURA is open to Vale managers only for now.', 403)
        return view(*args, **kwargs)
    return inner

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Small Helpers
# -----------------------------------------------------------------------------

def log(message):
    """A line in the service's output that can never fail the request it describes."""
    try:
        print(message, flush=True)
    except Exception:
        pass


def fail(message, status=400, **extra):
    body = {'ok': False, 'error': message}
    body.update({k: v for k, v in extra.items() if k not in ('ok', 'error')})
    return jsonify(body), status


def activity(action, text, folder=None, **extra):
    """One line in the shared activity ledger (who did what, from where). Never fails the request."""
    try:
        Na__Activity__Record(ACTIVITY_APP, action, text, project=folder.name if folder else '', **extra)
    except Exception as error:
        log(f'[AURA API] activity not recorded: {error}')


def user_code():
    return (Na__Auth__CurrentUser() or {}).get('code') or ''

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Projects and Their Drawing Sets
# -----------------------------------------------------------------------------

def project_folder(pid):
    """The library folder of a project id, or None."""
    return Na__Library__Find(pid)


def project_record(folder):
    """The project's ProjectData record, or {}."""
    try:
        return Na__Library__ReadJson(folder / f'ProjectData__{folder.name}__.json') or {}
    except (OSError, ValueError):
        return {}


def project_switched_on(folder):
    """True only when the project is ticked "Available in ValeVision AURA" in the Gallery's Project Editor."""
    return project_record(folder).get(SWITCH_KEY) is True


def project_public(folder):
    """What the page may know about the project: its id, number, name (the Gallery's), year."""
    record = project_record(folder)
    return {
        'id'      : folder.name,
        'code'    : str(record.get('projectCode') or ''),
        'title'   : Na__Library__DisplayName(record, folder.name),
        'name'    : str(record.get('projectName') or folder.name),
        'address' : str(record.get('siteAddress') or record.get('projectAddress') or ''),
        'year'    : Na__Library__Year(folder),
        'type'    : str(record.get('ProjectType') or ''),
    }


def drawings_path(folder):
    """<project>/ValeVision__AuraRender/UserData__AuraDrawings/<id>__AuraDrawingSet__.json"""
    return folder / BUCKET / DRAWINGS_DIR / f'{folder.name}__AuraDrawingSet__.json'

# endregion -------------------------------------------------------------------
