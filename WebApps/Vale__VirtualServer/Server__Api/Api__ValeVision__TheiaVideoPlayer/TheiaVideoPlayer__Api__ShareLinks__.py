#!/usr/bin/env python3
# =============================================================================
# VALEVISION THEIA - API - SHARE LINKS (CLIENT LINKS: THE VIDEOS AND NOTHING ELSE)
# =============================================================================
#
# FILE       : TheiaVideoPlayer__Api__ShareLinks__.py
# MODULE     : Theia API Share Links
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Make, list and switch off the links Vale sends clients: a link opens
#              the player and the video list only - no gallery, no editing
# CREATED    : 07-Oct-2026
#
# DESCRIPTION:
# - A CLIENT LINK is /theia/?project=<id>&share=<token>. The token is 24 random
#   URL-safe characters (secrets.token_urlsafe), so it cannot be guessed, and it
#   only opens the project it was made for. A link may:
#     - carry a label ("Mr and Mrs Holt") so staff know who has it;
#     - expire after a number of days (0 = never);
#     - show only some of the project's videos (empty = all of them, including
#       videos published after the link was made).
# - A STAFF LINK needs no token: it is /theia/?project=<id>[&video=<id>][&t=<s>]
#   and opens only for a signed-in member of staff. The page builds it itself.
# - WHO: any member of staff (Employee and up) can make a client link and switch
#   off their own; managers can switch off anyone's. Links are never deleted:
#   switching one off stamps RevokedIso, so the list stays a record of who was
#   sent what.
# - The view counter is bumped by the videos route (one count per visit).
#
# ROUTES:
#   GET  /api/projects/<id>/shares                    every link for the project  (Employee)
#   POST /api/projects/<id>/shares                    {label, expiresDays, videoIds}  (Employee)
#   POST /api/projects/<id>/shares/<token>/revoke     switch a link off (its maker, or Management)
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
import secrets

from flask import Blueprint, jsonify, request

import TheiaVideoPlayer__Api__Core__ as theia_core
import ValeShared__TheiaVideo__ as theia
from ValeShared__Auth__ import Na__Auth__CurrentUser, Na__Auth__FindRecord, Na__Auth__Require
from ValeShared__Library__ import Na__Library__Locked

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Configuration
# -----------------------------------------------------------------------------

theia_shares_api         = Blueprint('theia_shares_api', __name__)

MAX_LABEL                = 120
MAX_LINKS_PER_PROJECT    = 500

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Helpers
# -----------------------------------------------------------------------------

def _project_or_404(pid):
    folder = theia_core.project_folder(pid)
    if not folder:
        return None, theia_core.fail(f'no project {pid!r}', 404)
    return folder, None


def _maker_name(code, names):
    if code not in names:
        rec = Na__Auth__FindRecord(code=code) if code else None
        names[code] = (f"{rec.get('ValeUser__Name__First') or ''} {rec.get('ValeUser__Name__Last') or ''}".strip()
                       if rec else code)
    return names[code]


def _public(record, user, names):
    """A link as the page shows it (who made it by name, never their code alone)."""
    made_by = str(record.get('TheiaShare__Link__CreatedBy') or '')
    rank = user.get('levelRank', 99)
    return {
        'token'        : record.get('TheiaShare__Link__Token'),
        'label'        : record.get('TheiaShare__Link__Label') or '',
        'videoIds'     : record.get('TheiaShare__Link__VideoIds') or [],
        'createdIso'   : record.get('TheiaShare__Link__CreatedIso'),
        'createdBy'    : _maker_name(made_by, names),
        'expiresIso'   : record.get('TheiaShare__Link__ExpiresIso'),
        'revokedIso'   : record.get('TheiaShare__Link__RevokedIso'),
        'state'        : theia_core.share_state(record),
        'viewCount'    : int(record.get('TheiaShare__Link__ViewCount') or 0),
        'lastViewedIso': record.get('TheiaShare__Link__LastViewedIso'),
        'canRevoke'    : theia_core.share_state(record) == 'active' and
                         (made_by == user.get('code') or rank <= theia_core.rank_of(theia_core.EDIT_LEVEL)),
    }

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Routes
# -----------------------------------------------------------------------------

@theia_shares_api.get('/api/projects/<pid>/shares')
@Na__Auth__Require(theia_core.VIEW_LEVEL)
def list_shares(pid):
    folder, missing = _project_or_404(pid)
    if missing:
        return missing
    user, names = Na__Auth__CurrentUser(), {}
    records = theia_core.read_shares(folder)[theia_core.SHARE_RECORDS]
    links = [_public(r, user, names) for r in sorted(records, key=lambda r: str(r.get('TheiaShare__Link__CreatedIso') or ''), reverse=True)]
    response = jsonify({'ok': True, 'links': links})
    response.headers['Cache-Control'] = 'no-store'
    return response


@theia_shares_api.post('/api/projects/<pid>/shares')
@Na__Auth__Require(theia_core.VIEW_LEVEL)
def create_share(pid):
    folder, missing = _project_or_404(pid)
    if missing:
        return missing
    body = request.get_json(silent=True) or {}
    label = str(body.get('label') or '').strip()[:MAX_LABEL]
    library = theia.Na__Theia__Library(folder)
    known = {v['id'] for v in library['videos'] if v['visible'] and v['playable']}
    video_ids = [str(i) for i in (body.get('videoIds') or []) if str(i) in known]
    if body.get('videoIds') and not video_ids:
        return theia_core.fail('None of those videos can be shared (hidden, below 2K, or not in this project).', 400)
    if not known:
        return theia_core.fail('This project has no videos clients can watch yet.', 400)
    user = Na__Auth__CurrentUser()
    cfg = theia.Na__Theia__Config()
    record = {
        'TheiaShare__Link__Token'        : secrets.token_urlsafe(int(cfg.get('TheiaConfig__Share__TokenBytes') or 18)),
        'TheiaShare__Link__Kind'         : 'Client',
        'TheiaShare__Link__Label'        : label,
        'TheiaShare__Link__VideoIds'     : video_ids,
        'TheiaShare__Link__CreatedIso'   : theia.Na__Theia__NowIso(),
        'TheiaShare__Link__CreatedBy'    : user['code'],
        'TheiaShare__Link__ExpiresIso'   : theia_core.expiry_iso(body.get('expiresDays')),
        'TheiaShare__Link__RevokedIso'   : None,
        'TheiaShare__Link__RevokedBy'    : None,
        'TheiaShare__Link__ViewCount'    : 0,
        'TheiaShare__Link__LastViewedIso': None,
    }
    with Na__Library__Locked(theia.Na__Theia__SharesPath(folder)):
        doc = theia_core.read_shares(folder)
        if len(doc[theia_core.SHARE_RECORDS]) >= MAX_LINKS_PER_PROJECT:
            return theia_core.fail('This project has too many links. Switch some off first.', 400)
        doc[theia_core.SHARE_RECORDS].append(record)
        theia_core.write_shares(folder, doc, user['code'])
    theia_core.log(f" [THEIA] {user['code']} made a client link for {folder.name} ({label or 'no label'})")
    theia_core.activity('link.create', 'Generated a client link', folder, target=label, link=record['TheiaShare__Link__Token'],
                        detail={'Expires': record['TheiaShare__Link__ExpiresIso'] or 'never',
                                'Videos': len(video_ids) or 'all'})
    return jsonify({'ok': True, 'link': _public(record, user, {})})


@theia_shares_api.post('/api/projects/<pid>/shares/<token>/revoke')
@Na__Auth__Require(theia_core.VIEW_LEVEL)
def revoke_share(pid, token):
    folder, missing = _project_or_404(pid)
    if missing:
        return missing
    user = Na__Auth__CurrentUser()
    with Na__Library__Locked(theia.Na__Theia__SharesPath(folder)):
        doc = theia_core.read_shares(folder)
        record = next((r for r in doc[theia_core.SHARE_RECORDS]
                       if hmac.compare_digest(str(r.get('TheiaShare__Link__Token') or ''), str(token))), None)
        if record is None:
            return theia_core.fail('no such link', 404)
        if record.get('TheiaShare__Link__CreatedBy') != user['code'] and user['levelRank'] > theia_core.rank_of(theia_core.EDIT_LEVEL):
            return theia_core.fail('Only the person who made a link, or a manager, can switch it off.', 403)
        if not record.get('TheiaShare__Link__RevokedIso'):
            record['TheiaShare__Link__RevokedIso'] = theia.Na__Theia__NowIso()
            record['TheiaShare__Link__RevokedBy'] = user['code']
            theia_core.write_shares(folder, doc, user['code'])
            theia_core.activity('link.revoke', 'Switched off a client link', folder,
                                target=record.get('TheiaShare__Link__Label') or '', link=record.get('TheiaShare__Link__Token') or '')
    return jsonify({'ok': True, 'link': _public(record, user, {})})

# endregion -------------------------------------------------------------------
