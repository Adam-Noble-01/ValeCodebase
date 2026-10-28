#!/usr/bin/env python3
# =============================================================================
# VALEVISION 3D - API - EMAIL (SEND THROUGH MICROSOFT GRAPH)
# =============================================================================
#
# FILE       : ValeVision3D__Api__Email__.py
# MODULE     : ValeVision3D API Email
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Send the app's share and notification emails to Vale staff, and the
#              client email to clients, from the server, as the signed-in user asked
# CREATED    : 06-Oct-2026
#
# DESCRIPTION:
# - Replaces the Cloudflare Worker valevision3d-email-worker. Same Microsoft
#   Graph client-credentials send - but the sender is whoever is signed in
#   (Employee or above), so the separate email password, its token and the
#   encrypted address book on R2 are gone. The address book is the users
#   register: every active user with an email address.
# - TWO KINDS OF SEND (1.2.0, Adam, 28-Oct-2026):
#     INTERNAL  every address in Vale's own domains (ALLOWED_SEND_DOMAINS): the
#               Internal tab's share and notification emails. 30 sends an hour
#               per sender. Blind copies to the sender and the admin.
#     CLIENT    any address outside Vale: ONLY the client email of Share Project
#               Link > External Client Sharing, which names its project and a
#               client link ({ project, share }). The link must be that project's,
#               live, and in the email. 10 sends an hour per sender, 20 for
#               Management and App Admins; at most 10 client addresses a send.
#               The sender is CC'd (the client sees who sent it, and Reply All
#               reaches them); the admin copy stays blind, so a client's replies
#               never reach the admin.
#   A send counts once against its own hour, whatever number of addresses.
# - THE HOUR IS SHARED BY BOTH GUNICORN WORKERS: the send times live in one small
#   file in the temp folder, read and changed under a cross-process lock
#   (Na__Library__Locked), so a limit means what it says (1.1.0 counted in each
#   worker, so twice the limit could pass). A send Graph refuses gives its place
#   back. With no usable temp folder each worker counts on its own, as 1.1.0.
# - EVERY ADDRESS IS CHECKED before anything is sent (one plain address: no name,
#   no spaces, a domain with a dot), and the answer names the addresses Graph
#   accepted (sentTo, cc), so the page can say exactly where the email went.
# - Credentials never reach the browser. They are read from the environment,
#   which systemd fills from /etc/vale/apps/ValeVision3D.env (ids) and
#   /etc/vale/secrets/ValeVision3D.env (the client secret):
#     MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET,
#     MICROSOFT_SENDER_USER (no-reply-apps@valegardenhouses.com),
#     ALLOWED_SEND_DOMAINS (Vale's own domains, default valegardenhouses.com),
#     EMAIL_LIMIT_INTERNAL_PER_HOUR (default 30),
#     EMAIL_LIMIT_CLIENT_PER_HOUR (default 10),
#     EMAIL_LIMIT_CLIENT_MANAGEMENT_PER_HOUR (default 20),
#     VALE_EMAIL_BCC (the admin record copy: comma-separated, blind, on every send)
#   RATE_LIMIT_MAX_PER_HOUR (1.1.0's one limit) is no longer read: remove it.
#   Without the Microsoft values, send answers 503 "email is not set up on this server".
# - Who may send: AppAdmin, Management and Employee (Na__Auth__Require
#   'Employee'). Affiliates get 403; clients have no account.
#
# ROUTES:
#   GET  /api/email/health      { ok, configured, adminBcc, limits }
#   GET  /api/email/contacts    active Vale users with an email (signed in)
#   POST /api/email/send        { to: [..], subject, htmlBody } (signed in, Employee or above),
#                               plus { project, share } for the client email (any address)
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 06-Oct-2026 - Version 1.0.0
# - Ported from the email Worker (src/index.js, 09-Apr-2026) for app.valegardenhouses.com.
# 08-Oct-2026 - Version 1.1.0
# - Blind copy to the sender on every send, plus the admin copy (VALE_EMAIL_BCC,
#   now a list); addresses in To are not copied twice. health reports whether
#   the admin copy is set.
# 28-Oct-2026 - Version 1.2.0 (ValeVision3D v2.79.0, client emails)
# - The client email goes to clients: any address, with its live client link,
#   the sender CC'd. Limits 30 internal, 10 client (20 for Management and up)
#   an hour, counted across both workers; a failed send gives its place back.
# - Every address checked; the answer carries sentTo and cc; health the limits.
#   Outside addresses without a client link are refused, and so are client
#   sends over the limit, both recorded in the activity ledger.
#
# =============================================================================

# #region ---------------------------------------------------------------------
# REGION | Imports
# -----------------------------------------------------------------------------

import json
import os
import re
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from flask import Blueprint, g, jsonify, request

import ValeVision3D__Api__Core__ as vv_shared
from ValeShared__Activity__ import Na__Activity__Record
from ValeShared__Auth__ import NA__AUTH__RECORDS, Na__Auth__CurrentUser, Na__Auth__LoadRegister, Na__Auth__Ranks, Na__Auth__Require
from ValeShared__Library__ import Na__Library__Locked
from ValeVision3D__Api__ClientLinks__ import find_share, read_shares, share_state

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Configuration
# -----------------------------------------------------------------------------

valevision_email_api     = Blueprint('valevision_email_api', __name__)

ACTIVITY_APP             = 'ValeVision 3D'                                        # <-- Its name in the activity ledger
DEFAULT_DOMAINS          = ('valegardenhouses.com',)
DEFAULT_SUBJECT          = 'ValeVision 3D'
MAX_RECIPIENTS           = 20
MAX_CLIENT_RECIPIENTS    = 10                                                     # <-- Client addresses in one send (Adam, 28-Oct-2026)
MAX_BODY_CHARS           = 400_000                                                # <-- A share email is a few KB; this stops a runaway request

LIMIT_INTERNAL           = 30                                                     # <-- Sends an hour, every sender: Vale addresses only
LIMIT_CLIENT             = 10                                                     # <-- Client email sends an hour: Employee
LIMIT_CLIENT_MANAGEMENT  = 20                                                     # <-- ... Management and App Admins
CLIENT_MANAGEMENT_LEVEL  = 'Management'                                           # <-- This level and up have LIMIT_CLIENT_MANAGEMENT

SEND_LOG_PATH            = Path(tempfile.gettempdir()) / 'Vale__EmailSendLog' / 'ValeVision3D__EmailSendLog__.json'
SEND_LOG                 = {}                                                     # <-- Fallback only: "<USR code>|<kind>" -> [send times], this process
SEND_LOG_LOCK            = threading.Lock()

ADDRESS_LOCAL            = re.compile(r"^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$")
ADDRESS_LABEL            = re.compile(r'^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$')
CLIENT_ONLY_MESSAGE      = ('Only the client email can go to an address outside Vale: use Share Project Link, '
                            'External Client Sharing, Client email.')


def _env(name, default=''):
    return str(os.environ.get(name) or default).strip()


def _configured():
    return all(_env(k) for k in ('MICROSOFT_TENANT_ID', 'MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET', 'MICROSOFT_SENDER_USER'))


def _allowed_domains():
    """Vale's own domains: an address in one is internal, any other is a client's."""
    raw = _env('ALLOWED_SEND_DOMAINS')
    return {d.strip().lower() for d in raw.split(',') if d.strip()} if raw else set(DEFAULT_DOMAINS)


def _admin_bcc():
    return [a.strip().lower() for a in _env('VALE_EMAIL_BCC').split(',') if '@' in a]


def _limit(name, default):
    """A whole number from the environment, else the default (never zero or less)."""
    try:
        value = int(_env(name, str(default)))
    except ValueError:
        return default
    return value if value > 0 else default


def _limits():
    return {
        'internal'         : _limit('EMAIL_LIMIT_INTERNAL_PER_HOUR', LIMIT_INTERNAL),
        'client'           : _limit('EMAIL_LIMIT_CLIENT_PER_HOUR', LIMIT_CLIENT),
        'clientManagement' : _limit('EMAIL_LIMIT_CLIENT_MANAGEMENT_PER_HOUR', LIMIT_CLIENT_MANAGEMENT),
    }


def _client_limit(user):
    """The client emails this sender may send in an hour: Management and up have more."""
    limits = _limits()
    if user.get('levelRank', 99) <= Na__Auth__Ranks().get(CLIENT_MANAGEMENT_LEVEL, 2):
        return limits['clientManagement']
    return limits['client']


def _copies_for(sender_email, to, client):
    """
    (cc, bcc). A client email CCs its sender; every send blind-copies the admin
    record copy, and the sender too when they are not CC'd. Never an address
    already in To, never one twice.
    """
    sender = str(sender_email or '').strip().lower()
    cc = [sender] if client and '@' in sender and sender not in to else []
    bcc = []
    for addr in ([] if client else [sender]) + _admin_bcc():
        if '@' in addr and addr not in to and addr not in cc and addr not in bcc:
            bcc.append(addr)
    return cc, bcc

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Addresses
# -----------------------------------------------------------------------------

def _valid_address(addr):
    """One plain address (holt@example.co.uk): no name, no spaces, no brackets, a domain with a dot."""
    if not addr or len(addr) > 254 or addr.count('@') != 1:
        return False
    local, domain = addr.split('@')
    if not local or len(local) > 64 or not ADDRESS_LOCAL.match(local):
        return False
    labels = domain.split('.')
    if len(labels) < 2 or len(domain) > 253 or not all(ADDRESS_LABEL.match(label) for label in labels):
        return False
    return len(labels[-1]) >= 2 and not labels[-1].isdigit()


def _recipients(payload):
    """The To addresses as sent: trimmed, lower case, each once, in the order given."""
    raw = payload.get('to') if isinstance(payload.get('to'), list) else []
    return list(dict.fromkeys(str(x or '').strip().lower() for x in raw if str(x or '').strip()))

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Rate Limit (per signed-in sender, per hour, shared by every worker)
# -----------------------------------------------------------------------------

def _take(log, key, max_per_hour, now):
    """Count one send in `log` ({key: [times]}) if the hour allows: (allowed, remaining, retry_after_s)."""
    recent = [t for t in log.get(key, []) if now - t < 3600]
    if len(recent) >= max_per_hour:
        log[key] = recent
        return False, 0, int(3600 - (now - min(recent))) + 1
    recent.append(now)
    log[key] = recent
    return True, max_per_hour - len(recent), 0


def _read_send_log(now):
    """{key: [send times in the last hour]} from the shared file; an unreadable one starts empty."""
    try:
        doc = json.loads(SEND_LOG_PATH.read_text(encoding='utf-8'))
    except FileNotFoundError:
        return {}
    except ValueError:
        doc = {}
    out = {}
    for key, times in (doc.items() if isinstance(doc, dict) else []):
        kept = [t for t in times if isinstance(t, (int, float)) and now - t < 3600] if isinstance(times, list) else []
        if kept:
            out[str(key)] = kept
    return out


def _write_send_log(log):
    SEND_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = SEND_LOG_PATH.with_name(SEND_LOG_PATH.name + '.tmp')
    tmp.write_text(json.dumps(log), encoding='utf-8')
    os.replace(tmp, SEND_LOG_PATH)


def _take_quota(key, max_per_hour):
    """(allowed, remaining, retry_after_s, stamp) - records the send (at `stamp`) when allowed."""
    now = time.time()
    try:
        with Na__Library__Locked(SEND_LOG_PATH):
            log = _read_send_log(now)
            allowed, remaining, retry = _take(log, key, max_per_hour, now)
            if allowed:
                _write_send_log(log)
            return allowed, remaining, retry, now
    except OSError as error:                                                   # <-- No usable temp folder: this worker's own count, as 1.1.0
        vv_shared.log(f' [EMAIL] send log unusable ({type(error).__name__}: {error}); counting in this worker only')
        with SEND_LOG_LOCK:
            return _take(SEND_LOG, key, max_per_hour, now) + (now,)


def _give_back(key, stamp):
    """A send that did not go gives its place in the hour back."""
    try:
        with Na__Library__Locked(SEND_LOG_PATH):
            log = _read_send_log(time.time())
            if stamp in log.get(key, []):
                log[key].remove(stamp)
                _write_send_log(log)
                return
    except OSError:
        pass
    with SEND_LOG_LOCK:
        if stamp in SEND_LOG.get(key, []):
            SEND_LOG[key].remove(stamp)

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Microsoft Graph
# -----------------------------------------------------------------------------

def _graph_token():
    body = urllib.parse.urlencode({
        'client_id'    : _env('MICROSOFT_CLIENT_ID'),
        'scope'        : 'https://graph.microsoft.com/.default',
        'client_secret': _env('MICROSOFT_CLIENT_SECRET'),
        'grant_type'   : 'client_credentials',
    }).encode('ascii')
    url = f"https://login.microsoftonline.com/{urllib.parse.quote(_env('MICROSOFT_TENANT_ID'))}/oauth2/v2.0/token"
    req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/x-www-form-urlencoded'})
    with urllib.request.urlopen(req, timeout=20) as resp:
        token = json.loads(resp.read().decode('utf-8')).get('access_token')
    if not token:
        raise RuntimeError('Microsoft Graph gave no access token')
    return token


def _graph_send(recipients, subject, html, reply_to, cc=(), bcc=()):
    message = {
        'subject'     : subject,
        'body'        : {'contentType': 'HTML', 'content': html},
        'toRecipients': [{'emailAddress': {'address': r}} for r in recipients],
    }
    if cc:
        message['ccRecipients'] = [{'emailAddress': {'address': c}} for c in cc]    # <-- A client email's sender, in plain sight
    if bcc:
        message['bccRecipients'] = [{'emailAddress': {'address': b}} for b in bcc]  # <-- The sender's and the admin's record copies
    if reply_to:
        message['replyTo'] = [{'emailAddress': {'address': reply_to}}]          # <-- Replies reach the person who sent it
    url = f"https://graph.microsoft.com/v1.0/users/{urllib.parse.quote(_env('MICROSOFT_SENDER_USER'))}/sendMail"
    req = urllib.request.Request(url, data=json.dumps({'message': message, 'saveToSentItems': False}).encode('utf-8'),
                                 headers={'Authorization': f'Bearer {_graph_token()}', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        if resp.status not in (200, 202):
            raise RuntimeError(f'Graph sendMail answered {resp.status}')

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | The Client Email's Link (the project's, live, in the email)
# -----------------------------------------------------------------------------

def _client_link_problem(project, share, html):
    """(folder, None) when the client email's link is the project's, live and in the email; else (folder, (message, status))."""
    folder = vv_shared.resolve_project(project) if project else None
    if folder is None:
        return None, (f'Project not found: {project or "(none given)"}', 404)
    record = find_share(read_shares(folder), share)
    if record is None or share_state(record) != 'active':
        return folder, ('The client link in this email has expired or been switched off. Choose another, or make a new one.', 400)
    if share not in html:
        return folder, ('The email does not carry its client link.', 400)
    return folder, None


def _refused(text, folder=None, share='', to=(), reason=''):
    """A refused send to a client, in the activity ledger (never fails the request)."""
    Na__Activity__Record(ACTIVITY_APP, 'email.client', text, project=folder.name if folder else '', ok=False,
                         target=', '.join(to), link=share, detail={'To': list(to)[:6], 'Reason': reason})

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Routes
# -----------------------------------------------------------------------------

@valevision_email_api.get('/api/email/health')
def email_health():
    return jsonify({'ok': True, 'configured': _configured(), 'adminBcc': bool(_admin_bcc()), 'limits': _limits()})


@valevision_email_api.get('/api/email/contacts')
@Na__Auth__Require('Employee')
def email_contacts():
    """The address book: every active Vale user with an email address (names, roles, emails)."""
    domains = _allowed_domains()
    out = []
    for rec in Na__Auth__LoadRegister().get(NA__AUTH__RECORDS) or []:
        email = (rec.get('ValeUser__Email__Address') or '').strip().lower()
        if not email or not rec.get('ValeUser__Employee__IsActive') or email.rsplit('@', 1)[-1] not in domains:
            continue
        name = f"{rec.get('ValeUser__Name__First') or ''} {rec.get('ValeUser__Name__Last') or ''}".strip()
        out.append({'name': name or email, 'email': email,
                    'role': rec.get('ValeUser__Employee__Role') or '', 'department': rec.get('ValeUser__Employee__Department') or ''})
    out.sort(key=lambda c: c['name'].lower())
    return jsonify({'ok': True, 'contacts': out})


@valevision_email_api.post('/api/email/send')
@Na__Auth__Require('Employee')
def email_send():
    if not _configured():
        return jsonify({'ok': False, 'error': 'Email is not set up on this server yet.'}), 503
    user    = Na__Auth__CurrentUser()
    payload = request.get_json(silent=True) or {}
    to      = _recipients(payload)
    if not to:
        return jsonify({'ok': False, 'error': 'At least one recipient is required.'}), 400
    if len(to) > MAX_RECIPIENTS:
        return jsonify({'ok': False, 'error': f'At most {MAX_RECIPIENTS} recipients.'}), 400
    invalid = [r for r in to if not _valid_address(r)]
    if invalid:
        return jsonify({'ok': False, 'error': f'Not a valid email address: {invalid[0]}', 'invalid': invalid}), 400
    html = str(payload.get('htmlBody') or '')
    if len(html) > MAX_BODY_CHARS:
        return jsonify({'ok': False, 'error': 'The email is too large.'}), 400
    subject = re.sub(r'[\r\n]+', ' ', str(payload.get('subject') or DEFAULT_SUBJECT)).strip()[:250] or DEFAULT_SUBJECT

    # THE KIND | Outside addresses only with the client email and its live link
    domains = _allowed_domains()
    outside = [r for r in to if r.rsplit('@', 1)[-1] not in domains]
    project = str(payload.get('project') or '').strip()
    share   = str(payload.get('share') or '').strip()
    client  = bool(project or share)
    folder  = None
    if outside and not client:
        _refused('Refused an email to an address outside Vale (no client link)', to=outside, reason='not the client email')
        return jsonify({'ok': False, 'error': CLIENT_ONLY_MESSAGE, 'outside': outside}), 403
    if client:
        if len(outside) > MAX_CLIENT_RECIPIENTS:
            return jsonify({'ok': False, 'error': f'At most {MAX_CLIENT_RECIPIENTS} client addresses in one email.'}), 400
        folder, problem = _client_link_problem(project, share, html)
        if problem:
            return jsonify({'ok': False, 'error': problem[0]}), problem[1]

    # THE HOUR | Client sends and internal sends each have their own
    kind  = 'client' if outside else 'internal'
    limit = _client_limit(user) if outside else _limits()['internal']
    key   = f"{user['code']}|{kind}"
    allowed, remaining, retry, stamp = _take_quota(key, limit)
    if not allowed:
        minutes = max(1, -(-retry // 60))
        what = 'client emails' if outside else 'emails'
        if outside:
            _refused('Refused a client email (the hourly limit)', folder, share, to, reason=f'{limit} an hour')
        resp = jsonify({'ok': False, 'retryAfterSec': retry, 'limitPerHour': limit,
                        'error': f'You have sent {limit} {what} in the last hour, the most allowed. '
                                 f'You can send the next one in {minutes} minute{"" if minutes == 1 else "s"}.'})
        resp.headers['Retry-After'] = str(retry)
        return resp, 429

    # THE SEND | The sender CC'd on a client email; blind copies otherwise
    cc, bcc = _copies_for(user.get('email'), to, client)
    try:
        _graph_send(to, subject, html, user.get('email') or '', cc, bcc)
    except urllib.error.HTTPError as error:
        _give_back(key, stamp)
        detail = ''
        try:
            detail = error.read().decode('utf-8', 'replace')[:300]
        except Exception:                                                      # noqa: BLE001  <-- The log line is a courtesy
            pass
        vv_shared.log(f' [EMAIL] Send by {user["code"]} refused by Graph: HTTP {error.code} {detail}')
        message = ('Microsoft 365 refused the email, so nothing was sent. Check the addresses and try again.'
                   if error.code == 400 else 'The email could not be sent.')
        return jsonify({'ok': False, 'error': message}), 502
    except (urllib.error.URLError, RuntimeError, ValueError, OSError) as error:
        _give_back(key, stamp)
        vv_shared.log(f' [EMAIL] Send by {user["code"]} failed: {type(error).__name__}: {error}')
        return jsonify({'ok': False, 'error': 'The email could not be sent.'}), 502

    vv_shared.log(f' [EMAIL] {user["code"]} sent "{subject[:60]}" to {len(to)} recipient(s) ({len(outside)} outside Vale), '
                  f'{len(cc)} copy(ies), {len(bcc)} blind copy(ies)')
    if client:
        g.na_vv3d_activity = {                                                 # <-- The ledger line (ValeVision3D__Api__Activity__)
            'action' : 'email.client',
            'text'   : 'Sent a client email',
            'target' : ', '.join(to),
            'link'   : share,
            'detail' : {'To': to[:6], 'Cc': cc, 'Subject': subject[:120], 'Outside': len(outside)},
        }
    return jsonify({'ok': True, 'sentTo': to, 'cc': cc, 'sentCount': len(to), 'bccCount': len(bcc),
                    'outside': bool(outside), 'limitPerHour': limit, 'remainingQuota': remaining})

# endregion -------------------------------------------------------------------
