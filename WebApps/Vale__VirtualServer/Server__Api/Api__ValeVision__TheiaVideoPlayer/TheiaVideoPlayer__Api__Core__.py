#!/usr/bin/env python3
# =============================================================================
# VALEVISION THEIA - API CORE (WHO IS ASKING, AND THE FILES EVERY ROUTE SHARES)
# =============================================================================
#
# FILE       : TheiaVideoPlayer__Api__Core__.py
# MODULE     : Theia API Core
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : The helpers every Theia API route shares: who is asking (signed-in
#              staff, a manager, or a client holding a share link), the project,
#              the share links file and atomic writes of small JSON files
# CREATED    : 07-Oct-2026
#
# DESCRIPTION:
# - ONE LIBRARY, NO ROUTES. The blueprints import it as theia_core.
# - THE AUDIENCE of a read decides what it sees (ValeShared__TheiaVideo__.ForAudience):
#     manager  Management and AppAdmin: everything, hidden and below-2K videos flagged
#     staff    Employee: the visible videos at or above the 2K floor
#     client   no account: a share link (?share=<token> with ?project=<id>), the
#              same videos, minus every internal field, only those the link allows
#   A signed-in member of staff opening a share link sees what the client sees.
#   Affiliates (consultants) have no route of their own: they watch through a
#   share link like a client.
# - SHARE LINKS live in the project, user data:
#     <project>/ValeVision__TheiaVideo/UserData__ShareLinks/<id>__TheiaShareLinks__.json
#   nginx denies UserData folders, so a token is never readable as a file.
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 07-Oct-2026 - Version 1.0.0
# - Initial build.
#
# =============================================================================

# #region ---------------------------------------------------------------------
# REGION | Imports
# -----------------------------------------------------------------------------

import hmac
import json
import os
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from flask import jsonify, request

from ValeShared__Activity__ import Na__Activity__Record
from ValeShared__Auth__ import Na__Auth__CurrentUser, Na__Auth__Ranks
from ValeShared__Library__ import Na__Library__Find, Na__Library__Locked, Na__Library__ReadJson, Na__Library__WriteJson
import ValeShared__TheiaVideo__ as theia

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Configuration
# -----------------------------------------------------------------------------

APP_NAME                 = 'ValeVision__TheiaVideoPlayer'
ACTIVITY_APP             = 'ValeVision Theia'                                     # <-- Its name in the activity ledger (Server Manager tab 05)
SERVICE_NAME             = 'theia-api'                                            # <-- What GET /api/health names
SHARE_HEADER             = 'X-Theia-Share'                                        # <-- A share token may come as a header instead of ?share=
EDIT_LEVEL               = 'Management'                                           # <-- Titles, descriptions, order, publishing
DELETE_LEVEL             = 'AppAdmin'                                             # <-- Removing a published video and its files
VIEW_LEVEL               = 'Employee'                                             # <-- The full app; below this, share links only

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


def activity(action, text, folder=None, **extra):
    """One line in the shared activity ledger (who did what, from where). Never fails the request."""
    Na__Activity__Record(ACTIVITY_APP, action, text, project=folder.name if folder else '', **extra)


def fail(message, status=400, **extra):
    body = {'ok': False, 'error': message}
    body.update({k: v for k, v in extra.items() if k not in ('ok', 'error')})   # <-- An attached answer never turns a failure into ok
    return jsonify(body), status


def rank_of(level):
    return Na__Auth__Ranks().get(level, 99)


def user_code():
    return (Na__Auth__CurrentUser() or {}).get('code') or ''


def write_json_atomic(path, doc):
    """A small JSON file through a temporary file beside it (its name ends .tmp, so a crash leaves nothing that syncs)."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + '.w.tmp')
    tmp.write_text(json.dumps(doc, indent=4, ensure_ascii=False), encoding='utf-8')
    os.replace(tmp, path)


def project_folder(pid):
    """The library folder of a project id, or None."""
    return Na__Library__Find(pid)


def project_public(folder, library):
    """What the page may know about the project itself."""
    record = library.get('record') or {}
    return {
        'id'    : folder.name,
        'code'  : str(record.get('projectCode') or ''),
        'name'  : str(record.get('projectName') or folder.name),
        'title' : library['title'],
    }

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Share Links (the client's key)
# -----------------------------------------------------------------------------

SHARE_RECORDS            = 'TheiaShare__Links__Records'


def read_shares(folder):
    """The project's share links file, or an empty one."""
    doc = Na__Library__ReadJson(theia.Na__Theia__SharesPath(folder))
    if not isinstance(doc, dict):
        doc = {}
    doc.setdefault('TheiaShare__Links__Description',
                   'ValeVision Theia client links for this project. A link opens the videos only: no gallery, no editing. '
                   'Written by the Theia API; user data (never web-served, collected to the PC).')
    doc.setdefault('TheiaShare__Links__ProjectId', folder.name)
    if not isinstance(doc.get(SHARE_RECORDS), list):
        doc[SHARE_RECORDS] = []
    return doc


def write_shares(folder, doc, code, keep_revision=True):
    path = theia.Na__Theia__SharesPath(folder)
    if keep_revision:
        return Na__Library__WriteJson(path, doc, code, Path(folder))
    with Na__Library__Locked(path):
        write_json_atomic(path, doc)
    return {}


def share_state(record, now_iso=None):
    """'active', 'expired' or 'revoked'."""
    if record.get('TheiaShare__Link__RevokedIso'):
        return 'revoked'
    expires = record.get('TheiaShare__Link__ExpiresIso')
    if expires and str(expires) < (now_iso or theia.Na__Theia__NowIso()):
        return 'expired'
    return 'active'


def find_share(folder, token):
    """The share record a token opens, or None (compared in constant time)."""
    token = str(token or '').strip()
    if len(token) < 16:
        return None
    for record in read_shares(folder)[SHARE_RECORDS]:
        stored = str(record.get('TheiaShare__Link__Token') or '')
        if stored and hmac.compare_digest(stored, token):
            return record if share_state(record) == 'active' else None
    return None


def note_share_view(folder, token):
    """Count one view of a link (no revision: this is a counter, not an edit)."""
    path = theia.Na__Theia__SharesPath(folder)
    with Na__Library__Locked(path):
        doc = read_shares(folder)
        for record in doc[SHARE_RECORDS]:
            if hmac.compare_digest(str(record.get('TheiaShare__Link__Token') or ''), str(token)):
                record['TheiaShare__Link__ViewCount'] = int(record.get('TheiaShare__Link__ViewCount') or 0) + 1
                record['TheiaShare__Link__LastViewedIso'] = theia.Na__Theia__NowIso()
                write_json_atomic(path, doc)
                return


def expiry_iso(days):
    try:
        days = int(days or 0)
    except (TypeError, ValueError):
        days = 0
    if days <= 0:
        return None
    when = datetime.now(timezone.utc) + timedelta(days=min(days, 3650))
    return when.strftime('%Y-%m-%dT%H:%M:%S.') + f'{when.microsecond // 1000:03d}Z'

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Who Is Asking
# -----------------------------------------------------------------------------

def audience_for(folder):
    """
    (audience, user, share_record, None) for a read of this project, or
    (None, None, None, error_response). A share token wins over a session, so
    staff opening a client link see the client's view.
    """
    token = request.args.get('share') or request.headers.get(SHARE_HEADER) or ''
    if token:
        share = find_share(folder, token)
        if not share:
            return None, None, None, fail('This link has expired or has been switched off. Ask Vale Garden Houses for a new one.', 404,
                                          shareInvalid=True)
        return 'client', None, share, None
    user = Na__Auth__CurrentUser()
    if not user:
        return None, None, None, fail('sign-in required', 401)
    if user['mustChangePassword']:
        return None, None, None, fail('choose a new password first', 403, mustChangePassword=True)
    if user['levelRank'] > rank_of(VIEW_LEVEL):
        return None, None, None, fail('Theia is for Vale staff. Use the link you were sent to watch these videos.', 403)
    return ('manager' if user['levelRank'] <= rank_of(EDIT_LEVEL) else 'staff'), user, None, None


def can_for(user):
    """What the page may offer this user (the routes check again on every write)."""
    rank = (user or {}).get('levelRank', 99)
    return {
        'edit'    : rank <= rank_of(EDIT_LEVEL),
        'publish' : rank <= rank_of(EDIT_LEVEL),
        'share'   : rank <= rank_of(VIEW_LEVEL),
        'delete'  : rank <= rank_of(DELETE_LEVEL),
    }

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Upload Sessions (staging files: *.tmp never syncs, nginx denies UserData)
# -----------------------------------------------------------------------------

UPLOAD_ID_PATTERN        = r'^UP\d{8}T\d{6}_[0-9a-f]{8}$'


def staging_paths(folder, upload_id):
    staging = theia.Na__Theia__StagingDir(folder)
    return staging / f'{upload_id}.upload.tmp', staging / f'{upload_id}.session.tmp'


def read_session(folder, upload_id):
    _, session_path = staging_paths(folder, upload_id)
    try:
        return json.loads(session_path.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return None


def clean_stale_uploads(folder, max_age_hours):
    """Drop uploads nobody finished: their bytes and session files, and their lock files."""
    staging = theia.Na__Theia__StagingDir(folder)
    if not staging.is_dir():
        return 0
    cutoff = time.time() - max(1, float(max_age_hours or 48)) * 3600
    removed = 0
    for f in staging.iterdir():
        try:
            if f.is_file() and f.stat().st_mtime < cutoff:
                f.unlink()
                removed += 1
        except OSError:
            pass
    return removed


def merge_ranges(ranges):
    """Sorted, merged [start, end) byte ranges."""
    out = []
    for start, end in sorted((int(a), int(b)) for a, b in ranges if int(b) > int(a)):
        if out and start <= out[-1][1]:
            out[-1][1] = max(out[-1][1], end)
        else:
            out.append([start, end])
    return out

# endregion -------------------------------------------------------------------
