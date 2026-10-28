#!/usr/bin/env python3
# =============================================================================
# VALEVISION 3D - API - CLIENT LINKS (THE 3D MODEL FOR A CLIENT, NOTHING ELSE)
# =============================================================================
#
# FILE       : ValeVision3D__Api__ClientLinks__.py
# MODULE     : ValeVision3D API Client Links
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Make, list and switch off the links Vale sends clients, let a
#              client's browser in from one, and refuse every project read that
#              comes with neither a Vale sign-in nor a live client link
# CREATED    : 28-Oct-2026
#
# DESCRIPTION:
# - THEIA'S CLIENT LINKS (TheiaVideoPlayer__Api__ShareLinks__), for the 3D model.
#   A CLIENT LINK is /valevision/?project=<id>&share=<token>. The token is 24
#   random URL-safe characters (secrets.token_urlsafe), so it cannot be guessed,
#   and it only opens the project it was made for. A link may:
#     - carry a label ("Mr and Mrs Holt") so staff know who has it;
#     - expire after a number of days (0 = never).
# - A PLAIN LINK (/valevision/?project=<id>) is a STAFF LINK since 28-Oct-2026
#   (Adam): it opens only for a signed-in Vale account, as Theia's staff link.
# - WHO: any member of staff (Employee and up) can make a client link and switch
#   off their own; managers can switch off anyone's. Links are never deleted:
#   switching one off stamps RevokedIso, so the list stays a record of who was
#   sent what.
# - THE DOOR: GET api/projects/<id>/client-link?share=<token> checks the link.
#   A live one lets this browser in: the cookie vale_vv3d_client (HttpOnly, the
#   API's own path only) holds the tokens it opened, newest first, up to eight,
#   and the cookie vale_vv3d_files (HttpOnly, that project's library folder
#   only) holds this link's token for the model files nginx sends.
#   ?view=1 counts one view (the page asks once per browser session) and puts it
#   in the activity ledger; a dead link tried is recorded too.
# - THE GUARD (Na__Vv3dClientLinks__Install, before every request): a GET or
#   HEAD of a ValeVision 3D route needs a signed-in Vale account, or a live
#   client link for THE PROJECT IT NAMES (the cookie, the X-ValeVision-Share
#   header or ?share=). A route that names no project needs a sign-in. Open:
#   health, the door, the shared sign-in and activity routes.
# - A CLIENT LINK OPENS READS ONLY. Every write keeps its own decorator, and
#   every one needs a signed-in account at its level (AppAdmin for authoring),
#   so no client link can ever reach an admin feature.
# - LINKS LIVE IN THE PROJECT, user data (nginx denies UserData folders, and
#   every UserData__ShareLinks folder is git-ignored):
#     <project>/ValeVision3D/UserData__ShareLinks/<id>__ValeVision3DShareLinks__.json
#
# - THE MODEL FILES AND THE RECORD (the library gate, since 28-Oct-2026): nginx
#   sends a project's ProjectData__<id>__.json and its ValeVision3D model
#   folders (the valevision route's LibraryProtected list in the Server
#   Manager's routes file) only after asking GET api/library-access
#   (auth_request). It answers 204 for any signed-in Vale account, as the guard
#   reads, or for a live client link to that very project in vale_vv3d_files;
#   401 otherwise (403: an account that must choose a new password first).
#   ValeShared__LibraryGate__ reads the question and sets the cookie.
#
# ROUTES:
#   GET  /api/projects/<id>/shares                       every link for the project  (Employee)
#   POST /api/projects/<id>/shares                       {label, expiresDays}  (Employee)
#   POST /api/projects/<id>/shares/<share>/revoke        switch a link off (its maker, or Management)
#   GET  /api/projects/<id>/client-link?share=&view=&path=   let a client's browser in (no account)
#   GET  /api/library-access                             nginx: may this browser have this library file?
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 28-Oct-2026 - Version 1.1.0
# - The library gate: GET api/library-access answers nginx's auth_request for a
#   project's model files and record, and the door sets vale_vv3d_files on the
#   project's library folder (cleared by a dead link). Before it, anyone holding
#   a model file's exact address could download it.
#
# 28-Oct-2026 - Version 1.0.0
# - Initial build (ValeVision3D v2.77.0).
#
# =============================================================================

# #region ---------------------------------------------------------------------
# REGION | Imports
# -----------------------------------------------------------------------------

import hmac
import re
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

from flask import Blueprint, jsonify, request

import ValeVision3D__Api__Core__ as vv_shared
from ValeShared__Activity__ import Na__Activity__Record
from ValeShared__Auth__ import Na__Auth__CurrentUser, Na__Auth__FindRecord, Na__Auth__Ranks, Na__Auth__Require
from ValeShared__Library__ import Na__Library__DisplayName, Na__Library__Locked, Na__Library__ReadJson, Na__Library__WriteJson
from ValeShared__LibraryGate__ import (Na__LibraryGate__Answer, Na__LibraryGate__CookieToken, Na__LibraryGate__SetCookie,
                                       Na__LibraryGate__Target)

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Configuration
# -----------------------------------------------------------------------------

valevision_client_links_api = Blueprint('valevision_client_links_api', __name__)

ACTIVITY_APP             = 'ValeVision 3D'                                        # <-- Its name in the activity ledger
VIEW_LEVEL               = 'Employee'                                             # <-- Make, list, switch off your own
EDIT_LEVEL               = 'Management'                                           # <-- Switch off anyone's

SHARES_DIR               = 'UserData__ShareLinks'                                 # <-- <project>/ValeVision3D/<this>/
SHARE_RECORDS            = 'ValeVision3DShare__Links__Records'
SHARE_HEADER             = 'X-ValeVision-Share'                                   # <-- A token may come as a header instead of ?share=
CLIENT_COOKIE            = 'vale_vv3d_client'                                     # <-- The tokens this browser opened, newest first
CLIENT_COOKIE_TOKENS     = 8
FILES_COOKIE             = 'vale_vv3d_files'                                      # <-- One project's library folder only: the link that opens its model files
CLIENT_COOKIE_MAX_AGE_S  = 30 * 24 * 3600                                         # <-- Renewed by every visit; a link switched off stops at once anyway
TOKEN_BYTES              = 18                                                     # <-- 24 URL-safe characters, as Theia's
TOKEN_PATTERN            = re.compile(r'^[A-Za-z0-9_-]{16,64}$')
COOKIE_PATH_PATTERN      = re.compile(r'^/(?:[A-Za-z0-9._~-]+/){0,6}$')          # <-- The page's own API path ("/valevision/api/")

MAX_LABEL                = 120
MAX_LINKS_PER_PROJECT    = 500
MODEL_KEYS               = ('valeVision_ModelUrls', 'valeVision_ModelUrl', 'valeVision_ModelUrl_BaseMesh')

# THE GUARD | Open without a sign-in (everything else: a sign-in or a client link)
OPEN_BLUEPRINTS          = ('vale_accounts', 'vale_activity')                     # <-- The shared sign-in and activity routes keep their own rules
OPEN_ENDPOINTS           = frozenset({
    'static',
    'valevision_projects_api.health',
    'valevision_email_api.email_health',
    'valevision_client_links_api.open_client_link',                               # <-- The door itself
    'valevision_client_links_api.library_access',                                 # <-- nginx's question: it decides for itself
})

# KEYS | One link's record
KEY_TOKEN                = 'ValeVision3DShare__Link__Token'
KEY_KIND                 = 'ValeVision3DShare__Link__Kind'
KEY_LABEL                = 'ValeVision3DShare__Link__Label'
KEY_CREATED_ISO          = 'ValeVision3DShare__Link__CreatedIso'
KEY_CREATED_BY           = 'ValeVision3DShare__Link__CreatedBy'
KEY_EXPIRES_ISO          = 'ValeVision3DShare__Link__ExpiresIso'
KEY_REVOKED_ISO          = 'ValeVision3DShare__Link__RevokedIso'
KEY_REVOKED_BY           = 'ValeVision3DShare__Link__RevokedBy'
KEY_VIEW_COUNT           = 'ValeVision3DShare__Link__ViewCount'
KEY_LAST_VIEWED_ISO      = 'ValeVision3DShare__Link__LastViewedIso'

DEAD_LINK_MESSAGE        = ('This link has expired or has been switched off. Please ask your designer at Vale Garden Houses '
                            'for a new one.')

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Small Helpers
# -----------------------------------------------------------------------------

def _fail(message, status=400, **extra):
    body = {'ok': False, 'error': message}
    body.update({k: v for k, v in extra.items() if k not in ('ok', 'error')})
    return jsonify(body), status


def _rank(level):
    return Na__Auth__Ranks().get(level, 99)


def _project_or_404(token):
    folder = vv_shared.resolve_project(token)
    if not folder:
        return None, _fail(f'Project not found: {token}', 404)
    return folder, None


def _record_of(folder):
    """The project record, or an empty dict."""
    return vv_shared.read_json_file(str(vv_shared.project_record_path(folder))) or {}


def _project_public(folder, record=None):
    """What the page may know about the project (its name as the Gallery shows it)."""
    record = record if isinstance(record, dict) else _record_of(folder)
    return {
        'id'    : folder.name,
        'code'  : str(record.get('projectCode') or ''),
        'title' : Na__Library__DisplayName(record, folder.name),
    }


def _activity(action, text, folder, **extra):
    """One line in the shared activity ledger. Never fails the request."""
    Na__Activity__Record(ACTIVITY_APP, action, text, project=folder.name if folder else '', **extra)


def _expiry_iso(days):
    try:
        days = int(days or 0)
    except (TypeError, ValueError):
        days = 0
    if days <= 0:
        return None
    when = datetime.now(timezone.utc) + timedelta(days=min(days, 3650))
    return when.strftime('%Y-%m-%dT%H:%M:%S.') + f'{when.microsecond // 1000:03d}Z'   # <-- vv_shared.now_iso()'s form, so the two compare as text

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | The Links File (user data, in the project)
# -----------------------------------------------------------------------------

def shares_path(folder):
    folder = Path(folder)
    return folder / vv_shared.APP_BUCKET / SHARES_DIR / f'{folder.name}__ValeVision3DShareLinks__.json'


def read_shares(folder):
    """The project's links file, or an empty one (a file that cannot be read opens no link)."""
    try:
        doc = Na__Library__ReadJson(shares_path(folder))
    except (OSError, ValueError) as error:
        vv_shared.log(f' [CLIENT LINKS] {folder.name}: the links file could not be read ({type(error).__name__}: {error})')
        doc = None
    if not isinstance(doc, dict):
        doc = {}
    doc.setdefault('ValeVision3DShare__Links__Description',
                   'ValeVision 3D client links for this project. A link opens the 3D model only: no gallery, no editing. '
                   'Written by the ValeVision 3D API; user data (never web-served, collected to the PC).')
    doc.setdefault('ValeVision3DShare__Links__ProjectId', folder.name)
    if not isinstance(doc.get(SHARE_RECORDS), list):
        doc[SHARE_RECORDS] = []
    return doc


def share_state(record, now_iso=None):
    """'active', 'expired' or 'revoked'."""
    if record.get(KEY_REVOKED_ISO):
        return 'revoked'
    expires = record.get(KEY_EXPIRES_ISO)
    if expires and str(expires) < (now_iso or vv_shared.now_iso()):
        return 'expired'
    return 'active'


def find_share(doc, token):
    """The record a token names, whatever its state, or None (compared in constant time)."""
    token = str(token or '')
    if not TOKEN_PATTERN.match(token):
        return None
    for record in doc[SHARE_RECORDS]:
        stored = str(record.get(KEY_TOKEN) or '')
        if stored and hmac.compare_digest(stored, token):
            return record
    return None


def note_share_view(folder, token):
    """Count one view of a link (no revision: this is a counter, not an edit)."""
    path = shares_path(folder)
    with Na__Library__Locked(path):
        doc = read_shares(folder)
        record = find_share(doc, token)
        if record is None:
            return
        record[KEY_VIEW_COUNT] = int(record.get(KEY_VIEW_COUNT) or 0) + 1
        record[KEY_LAST_VIEWED_ISO] = vv_shared.now_iso()
        vv_shared.write_json_file(str(path), doc)

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Who Holds a Client Link (the cookie, a header, ?share=)
# -----------------------------------------------------------------------------

def _cookie_tokens():
    raw = str(request.cookies.get(CLIENT_COOKIE) or '')
    return [t for t in raw.split('.') if TOKEN_PATTERN.match(t)][:CLIENT_COOKIE_TOKENS]


def _asked_tokens():
    """Every token this request carries: the header, ?share=, then the cookies' (the API's, or a project folder's)."""
    tokens = [str(request.headers.get(SHARE_HEADER) or '').strip(), str(request.args.get('share') or '').strip()]
    tokens += _cookie_tokens() + [Na__LibraryGate__CookieToken(FILES_COOKIE)]    # <-- A browser sends each on its own path only
    return list(dict.fromkeys(t for t in tokens if TOKEN_PATTERN.match(t)))


def client_may_read(folder):
    """True when this request carries a live client link for this project."""
    tokens = _asked_tokens()
    if not tokens:
        return False
    now = vv_shared.now_iso()
    for record in read_shares(folder)[SHARE_RECORDS]:
        stored = str(record.get(KEY_TOKEN) or '')
        if stored and share_state(record, now) == 'active' and any(hmac.compare_digest(stored, t) for t in tokens):
            return True
    return False


def _with_client_cookie(response, tokens):
    """Set (or clear) the client cookie on the page's own API path (?path=), else on the site's root."""
    tokens = list(dict.fromkeys(t for t in tokens if TOKEN_PATTERN.match(t)))[:CLIENT_COOKIE_TOKENS]
    path = str(request.args.get('path') or '')
    path = path if COOKIE_PATH_PATTERN.match(path) and len(path) <= 120 else '/'
    secure = request.is_secure or request.headers.get('X-Forwarded-Proto', '') == 'https'
    if tokens:
        response.set_cookie(CLIENT_COOKIE, '.'.join(tokens), max_age=CLIENT_COOKIE_MAX_AGE_S, path=path, httponly=True,
                            samesite='Lax', secure=secure)
    else:
        response.delete_cookie(CLIENT_COOKIE, path=path)
    return response

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | The Guard (a sign-in, or a live client link for the project read)
# -----------------------------------------------------------------------------

def _request_project():
    """The library folder the request names (a route's <token>, or the query), or None."""
    token = (request.view_args or {}).get('token')
    if not token:
        project_folder, _year, folder_id = vv_shared.project_context()
        token = folder_id or project_folder
    return vv_shared.resolve_project(token) if token else None


def _guard():
    if request.method not in ('GET', 'HEAD'):
        return None                                                            # <-- Every write route needs a signed-in account at its own level
    endpoint = request.endpoint or ''
    if not endpoint or endpoint in OPEN_ENDPOINTS or request.blueprint in OPEN_BLUEPRINTS:
        return None                                                            # <-- No such route (its own 404), or open by design
    user = Na__Auth__CurrentUser()
    if user:
        if user['mustChangePassword']:
            return _fail('choose a new password first', 403, mustChangePassword=True)
        return None                                                            # <-- Any Vale account reads, as the project list
    try:
        folder = _request_project()
        if folder is not None and client_may_read(folder):
            return None
    except Exception as error:                                                 # noqa: BLE001  <-- A guard that cannot decide refuses
        vv_shared.log(f' [CLIENT LINKS] guard refused {request.path} ({type(error).__name__}: {error})')
    return _fail('sign-in required', 401, signIn=True)


def Na__Vv3dClientLinks__Install(app):
    """Hook the guard into the ValeVision 3D API (wsgi.create_app)."""
    app.before_request(_guard)

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | A Link as the Page Shows It
# -----------------------------------------------------------------------------

def _maker_name(code, names):
    if code not in names:
        rec = Na__Auth__FindRecord(code=code) if code else None
        names[code] = (f"{rec.get('ValeUser__Name__First') or ''} {rec.get('ValeUser__Name__Last') or ''}".strip()
                       if rec else code)
    return names[code]


def _public(record, user, names):
    """Who made it by name, never their code alone."""
    made_by = str(record.get(KEY_CREATED_BY) or '')
    state = share_state(record)
    return {
        'token'        : record.get(KEY_TOKEN),
        'label'        : record.get(KEY_LABEL) or '',
        'createdIso'   : record.get(KEY_CREATED_ISO),
        'createdBy'    : _maker_name(made_by, names),
        'expiresIso'   : record.get(KEY_EXPIRES_ISO),
        'revokedIso'   : record.get(KEY_REVOKED_ISO),
        'state'        : state,
        'viewCount'    : int(record.get(KEY_VIEW_COUNT) or 0),
        'lastViewedIso': record.get(KEY_LAST_VIEWED_ISO),
        'canRevoke'    : state == 'active' and (made_by == user.get('code') or user.get('levelRank', 99) <= _rank(EDIT_LEVEL)),
    }

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Routes - Staff (make, list, switch off)
# -----------------------------------------------------------------------------

@valevision_client_links_api.get('/api/projects/<path:token>/shares')
@Na__Auth__Require(VIEW_LEVEL)
def list_shares(token):
    folder, missing = _project_or_404(token)
    if missing:
        return missing
    user, names = Na__Auth__CurrentUser(), {}
    records = read_shares(folder)[SHARE_RECORDS]
    links = [_public(r, user, names) for r in sorted(records, key=lambda r: str(r.get(KEY_CREATED_ISO) or ''), reverse=True)]
    response = jsonify({'ok': True, 'project': _project_public(folder), 'links': links})
    response.headers['Cache-Control'] = 'no-store'
    return response


@valevision_client_links_api.post('/api/projects/<path:token>/shares')
@Na__Auth__Require(VIEW_LEVEL)
def create_share(token):
    folder, missing = _project_or_404(token)
    if missing:
        return missing
    record_doc = _record_of(folder)
    if not any(record_doc.get(k) for k in MODEL_KEYS):
        return _fail('This project has no 3D model a client can open yet.', 400)
    body = request.get_json(silent=True) or {}
    label = str(body.get('label') or '').strip()[:MAX_LABEL]
    user = Na__Auth__CurrentUser()
    record = {
        KEY_TOKEN           : secrets.token_urlsafe(TOKEN_BYTES),
        KEY_KIND            : 'Client',
        KEY_LABEL           : label,
        KEY_CREATED_ISO     : vv_shared.now_iso(),
        KEY_CREATED_BY      : user['code'],
        KEY_EXPIRES_ISO     : _expiry_iso(body.get('expiresDays')),
        KEY_REVOKED_ISO     : None,
        KEY_REVOKED_BY      : None,
        KEY_VIEW_COUNT      : 0,
        KEY_LAST_VIEWED_ISO : None,
    }
    path = shares_path(folder)
    with Na__Library__Locked(path):
        doc = read_shares(folder)
        if len(doc[SHARE_RECORDS]) >= MAX_LINKS_PER_PROJECT:
            return _fail('This project has too many links. Switch some off first.', 400)
        doc[SHARE_RECORDS].append(record)
        Na__Library__WriteJson(path, doc, user['code'], folder)                 # <-- The copy overwritten is kept as a revision
    vv_shared.log(f" [CLIENT LINKS] {user['code']} made a client link for {folder.name} ({label or 'no label'})")
    _activity('link.create', 'Generated a client link', folder, target=label, link=record[KEY_TOKEN],
              detail={'Expires': record[KEY_EXPIRES_ISO] or 'never'})
    return jsonify({'ok': True, 'project': _project_public(folder, record_doc), 'link': _public(record, user, {})})


@valevision_client_links_api.post('/api/projects/<path:token>/shares/<share_token>/revoke')
@Na__Auth__Require(VIEW_LEVEL)
def revoke_share(token, share_token):
    folder, missing = _project_or_404(token)
    if missing:
        return missing
    user = Na__Auth__CurrentUser()
    path = shares_path(folder)
    with Na__Library__Locked(path):
        doc = read_shares(folder)
        record = find_share(doc, share_token)
        if record is None:
            return _fail('no such link', 404)
        if record.get(KEY_CREATED_BY) != user['code'] and user['levelRank'] > _rank(EDIT_LEVEL):
            return _fail('Only the person who made a link, or a manager, can switch it off.', 403)
        if not record.get(KEY_REVOKED_ISO):
            record[KEY_REVOKED_ISO] = vv_shared.now_iso()
            record[KEY_REVOKED_BY] = user['code']
            Na__Library__WriteJson(path, doc, user['code'], folder)
            _activity('link.revoke', 'Switched off a client link', folder, target=record.get(KEY_LABEL) or '',
                      link=record.get(KEY_TOKEN) or '')
    return jsonify({'ok': True, 'link': _public(record, user, {})})

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Route - The Door (a client's browser, no account)
# -----------------------------------------------------------------------------

@valevision_client_links_api.get('/api/projects/<path:token>/client-link')
def open_client_link(token):
    """
    ?share=<token> (or the X-ValeVision-Share header), ?view=1 to count a visit,
    ?path=<the page's API path> for the cookie. A live link answers the project's
    name and the link's end date and lets this browser in (the API's cookie, and
    the project folder's for its model files); a dead one answers 404
    { shareInvalid } and leaves both cookies without it.
    """
    folder, missing = _project_or_404(token)
    if missing:
        return missing
    share_token = str(request.args.get('share') or request.headers.get(SHARE_HEADER) or '').strip()
    view = request.args.get('view') == '1'
    record = find_share(read_shares(folder), share_token)
    if record is None or share_state(record) != 'active':
        if view and share_token:                                               # <-- Someone opened a dead link: who, and from where
            _activity('link.open-refused', 'Opened a client link that has expired or been switched off', folder,
                      link=share_token[:64], ok=False)
        response, status = _fail(DEAD_LINK_MESSAGE, 404, shareInvalid=True)
        response.headers['Cache-Control'] = 'no-store'
        Na__LibraryGate__SetCookie(response, FILES_COOKIE, folder, None)
        return _with_client_cookie(response, [t for t in _cookie_tokens() if t != share_token]), status
    if view:
        note_share_view(folder, share_token)
        _activity('link.open', 'Opened ValeVision 3D from a client link', folder, target=record.get(KEY_LABEL) or '',
                  link=share_token)
    response = jsonify({'ok': True, 'project': _project_public(folder), 'share': {'expiresIso': record.get(KEY_EXPIRES_ISO)}})
    response.headers['Cache-Control'] = 'no-store'
    Na__LibraryGate__SetCookie(response, FILES_COOKIE, folder, share_token)    # <-- The model files nginx sends: this project's folder only
    return _with_client_cookie(response, [share_token] + [t for t in _cookie_tokens() if t != share_token])

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Route - nginx's Question (may this browser have this library file?)
# -----------------------------------------------------------------------------

@valevision_client_links_api.get('/api/library-access')
def library_access():
    """
    auth_request for a protected file of a project (its record, its model
    folders), the file's path in X-Vale-Library-Path: 204 for any signed-in Vale
    account, as the guard reads; 204 for a live client link to that very
    project; 403 for an account that must choose a new password first; else 401.
    Never another code: nginx would turn it into a 500.
    """
    user = Na__Auth__CurrentUser()
    if user:
        return Na__LibraryGate__Answer(403 if user['mustChangePassword'] else 204)
    try:
        folder, _rest = Na__LibraryGate__Target()
        if folder is not None and client_may_read(folder):
            return Na__LibraryGate__Answer(204)
    except Exception as error:                                                 # noqa: BLE001  <-- A check that cannot decide refuses
        vv_shared.log(f' [CLIENT LINKS] library check refused ({type(error).__name__}: {error})')
    return Na__LibraryGate__Answer(401)

# endregion -------------------------------------------------------------------
