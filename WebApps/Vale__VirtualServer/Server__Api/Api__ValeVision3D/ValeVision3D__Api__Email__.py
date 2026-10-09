#!/usr/bin/env python3
# =============================================================================
# VALEVISION 3D - API - EMAIL (SEND THROUGH MICROSOFT GRAPH)
# =============================================================================
#
# FILE       : ValeVision3D__Api__Email__.py
# MODULE     : ValeVision3D API Email
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Send the app's share and notification emails from the server, to Vale
#              staff only, as the signed-in user asked
# CREATED    : 06-Oct-2026
#
# DESCRIPTION:
# - Replaces the Cloudflare Worker valevision3d-email-worker. Same Microsoft
#   Graph client-credentials send, same recipient-domain allow-list, same
#   per-sender hourly limit - but the sender is whoever is signed in (Employee
#   or above), so the separate email password, its token and the encrypted
#   address book on R2 are gone. The address book is the users register:
#   every active user with an email address.
# - Credentials never reach the browser. They are read from the environment,
#   which systemd fills from /etc/vale/apps/ValeVision3D.env (ids) and
#   /etc/vale/secrets/ValeVision3D.env (the client secret):
#     MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET,
#     MICROSOFT_SENDER_USER (no-reply-apps@valegardenhouses.com),
#     ALLOWED_SEND_DOMAINS (default valegardenhouses.com),
#     RATE_LIMIT_MAX_PER_HOUR (default 10),
#     VALE_EMAIL_BCC (the admin record copy: comma-separated, on every send)
#   Without the Microsoft values, send answers 503 "email is not set up on this server".
# - Every send is blind-copied to the sender (their confirmation and record)
#   and to VALE_EMAIL_BCC (the admin's record of every send, as the Worker did).
#   An address already in To is not copied again.
# - Who may send: AppAdmin, Management and Employee (Na__Auth__Require
#   'Employee'). Affiliates get 403; clients have no account.
#
# ROUTES:
#   GET  /api/email/health      { ok, configured, adminBcc }
#   GET  /api/email/contacts    active Vale users with an email (signed in)
#   POST /api/email/send        { to: [..], subject, htmlBody } (signed in, Employee or above)
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
#
# =============================================================================

# #region ---------------------------------------------------------------------
# REGION | Imports
# -----------------------------------------------------------------------------

import json
import os
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

from flask import Blueprint, jsonify, request

import ValeVision3D__Api__Core__ as vv_shared
from ValeShared__Auth__ import NA__AUTH__RECORDS, Na__Auth__CurrentUser, Na__Auth__LoadRegister, Na__Auth__Require

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Configuration
# -----------------------------------------------------------------------------

valevision_email_api     = Blueprint('valevision_email_api', __name__)

DEFAULT_DOMAINS          = ('valegardenhouses.com',)
DEFAULT_SUBJECT          = 'ValeVision 3D'
MAX_RECIPIENTS           = 20
MAX_BODY_CHARS           = 400_000                                                # <-- A share email is a few KB; this stops a runaway request
SEND_LOG                 = {}                                                     # <-- USR code -> [send times], this process
SEND_LOG_LOCK            = threading.Lock()


def _env(name, default=''):
    return str(os.environ.get(name) or default).strip()


def _configured():
    return all(_env(k) for k in ('MICROSOFT_TENANT_ID', 'MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET', 'MICROSOFT_SENDER_USER'))


def _allowed_domains():
    raw = _env('ALLOWED_SEND_DOMAINS')
    return {d.strip().lower() for d in raw.split(',') if d.strip()} if raw else set(DEFAULT_DOMAINS)


def _admin_bcc():
    return [a.strip().lower() for a in _env('VALE_EMAIL_BCC').split(',') if '@' in a]


def _bcc_for(sender_email, to):
    """The blind copies: the sender, then the admin record copies - never one already in To, never twice."""
    out = []
    for addr in [str(sender_email or '').strip().lower()] + _admin_bcc():
        if '@' in addr and addr not in to and addr not in out:
            out.append(addr)
    return out

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Rate Limit (per signed-in sender, per hour)
# -----------------------------------------------------------------------------

def _take_quota(user_code, max_per_hour):
    """(allowed, remaining, retry_after_s) - records the send when allowed."""
    now = time.time()
    with SEND_LOG_LOCK:
        recent = [t for t in SEND_LOG.get(user_code, []) if now - t < 3600]
        if len(recent) >= max_per_hour:
            SEND_LOG[user_code] = recent
            return False, 0, int(3600 - (now - recent[0])) + 1
        recent.append(now)
        SEND_LOG[user_code] = recent
        return True, max_per_hour - len(recent), 0

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


def _graph_send(recipients, subject, html, reply_to, bcc=()):
    message = {
        'subject'     : subject,
        'body'        : {'contentType': 'HTML', 'content': html},
        'toRecipients': [{'emailAddress': {'address': r}} for r in recipients],
    }
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
# REGION | Routes
# -----------------------------------------------------------------------------

@valevision_email_api.get('/api/email/health')
def email_health():
    return jsonify({'ok': True, 'configured': _configured(), 'adminBcc': bool(_admin_bcc())})


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
    raw_to  = payload.get('to') if isinstance(payload.get('to'), list) else []
    to      = sorted({str(x or '').strip().lower() for x in raw_to if str(x or '').strip()})
    if not to:
        return jsonify({'ok': False, 'error': 'At least one recipient is required.'}), 400
    if len(to) > MAX_RECIPIENTS:
        return jsonify({'ok': False, 'error': f'At most {MAX_RECIPIENTS} recipients.'}), 400
    domains = _allowed_domains()
    if any('@' not in r or r.rsplit('@', 1)[-1] not in domains for r in to):
        return jsonify({'ok': False, 'error': 'One or more recipients are not in an allowed domain.'}), 400
    html = str(payload.get('htmlBody') or '')
    if len(html) > MAX_BODY_CHARS:
        return jsonify({'ok': False, 'error': 'The email is too large.'}), 400

    max_per_hour = int(_env('RATE_LIMIT_MAX_PER_HOUR', '10') or 10)
    allowed, remaining, retry = _take_quota(user['code'], max_per_hour)
    if not allowed:
        resp = jsonify({'ok': False, 'error': f'Rate limit reached: {max_per_hour} emails an hour.', 'retryAfterSec': retry})
        resp.headers['Retry-After'] = str(retry)
        return resp, 429
    bcc = _bcc_for(user.get('email'), to)
    try:
        _graph_send(to, str(payload.get('subject') or DEFAULT_SUBJECT)[:250], html, user.get('email') or '', bcc)
    except (urllib.error.URLError, RuntimeError, ValueError) as error:
        vv_shared.log(f' [EMAIL] Send by {user["code"]} failed: {type(error).__name__}: {error}')
        return jsonify({'ok': False, 'error': 'The email could not be sent.'}), 502
    vv_shared.log(f' [EMAIL] {user["code"]} sent "{str(payload.get("subject") or "")[:60]}" to {len(to)} recipient(s), {len(bcc)} blind copy(ies)')
    return jsonify({'ok': True, 'sentCount': len(to), 'bccCount': len(bcc), 'remainingQuota': remaining})

# endregion -------------------------------------------------------------------
