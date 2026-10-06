"""
=============================================================================
 VALE SHARED API - SIGN-IN SESSIONS AND PERMISSION LEVELS
=============================================================================

FILE       : ValeShared__Auth__.py
AUTHOR     : Adam Noble - Noble Architecture
PURPOSE    : Who is signed in, and may they do this? Used by every app's Flask
             API (Server__Api/Api__<App>/wsgi.py) and by the shared accounts
             blueprint (ValeShared__Accounts__.py).
CREATED    : 06-Oct-2026

DESCRIPTION:
- People are the records in Server__UserAccountData/UserAccountData__ValeUsers__Register__.json
  (edited in the Vale Virtual Server Manager, tab 04). Read here, never copied.
- A session is one signed cookie, "vale_session", Path=/, so signing in on one
  app (/project-gallery/, /valevision/ ...) signs you in on all of them.
  It carries the USR code plus a fingerprint of the password hash and the
  user's last forced sign-out: changing a password, a reset or Sign out in the
  Server Manager (tab 04), or deactivating the user, ends every old session.
- Sessions never expire on the server. The cookie asks the browser to keep it
  for 400 days (the most Chrome allows) and /api/accounts/me renews it on every
  visit, so a device stays signed in until it signs out or is signed out.
- Levels (lower rank = more rights): AppAdmin 1, Management 2, Employee 3,
  Affiliate 4. Clients never sign in.
- Errors are JSON (401 sign-in required, 403 not allowed), never redirects.

ENVIRONMENT:
  VALE_ROOT        the mirror / server root (default: two folders above this file)
  VALE_SECRET_KEY  signs the session cookie; the SAME value for every app service.
                   On the server it lives in /etc/vale/secrets/vale-shared.env.
  VALE_DEV=1       local development only: allows a fixed development key.

USAGE (in an app's wsgi.py):
  sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "Api__Shared"))
  from ValeShared__Auth__ import Na__Auth__CurrentUser, Na__Auth__Require, Na__Auth__Level

  @app.post("/api/projects/<pid>")
  @Na__Auth__Require("Management")
  def save(pid): user = Na__Auth__CurrentUser(); ...

-----------------------------------------------------------------------------

DEVELOPMENT LOG:
06-Oct-2026 - Version 1.1.0
- Devices stay signed in: no server-side age limit, a 400-day cookie renewed on
  every visit (was 30 days).
- ValeUser__Session__SignedOutDate (set by the Server Manager's Sign out and
  Reset) is part of the fingerprint, so changing it ends that user's sessions.
  Empty for most users, which keeps sessions issued before this version valid.

06-Oct-2026 - Version 1.0.0
- Initial build (shared by ValeVision Gallery and ValeVision 3D).

=============================================================================
"""

from __future__ import annotations

import functools
import hashlib
import json
import os
import threading
from pathlib import Path

from flask import jsonify, request
from itsdangerous import BadSignature, URLSafeTimedSerializer


# -----------------------------------------------------------------------------
# REGION | Constants
# -----------------------------------------------------------------------------

NA__AUTH__ROOT                    = Path(os.environ.get("VALE_ROOT") or Path(__file__).resolve().parents[2])
NA__AUTH__REGISTER                = NA__AUTH__ROOT / "Server__UserAccountData" / "UserAccountData__ValeUsers__Register__.json"
NA__AUTH__RECORDS                 = "UserAccountData__ValeUsers__Records"
NA__AUTH__COOKIE                  = "vale_session"
NA__AUTH__MAX_AGE_S               = 400 * 24 * 3600                            # <-- Browser cookie life (Chrome's ceiling); renewed on every visit
NA__AUTH__SIGNED_OUT              = "ValeUser__Session__SignedOutDate"         # <-- Server Manager Sign out / Reset: ends every session
NA__AUTH__DEFAULT_RANKS           = {"AppAdmin": 1, "Management": 2, "Employee": 3, "Affiliate": 4}
NA__AUTH__DEV_KEY                 = "vale-local-development-only"
NA__AUTH__CACHE                   = {"mtime": None, "doc": None}
NA__AUTH__LOCK                    = threading.Lock()

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Register and Users
# -----------------------------------------------------------------------------

# FUNCTION | Load the Users Register (re-read whenever the file changes)
# ------------------------------------------------------------
def Na__Auth__LoadRegister() -> dict:
    with NA__AUTH__LOCK:
        try:
            mtime = NA__AUTH__REGISTER.stat().st_mtime_ns
        except FileNotFoundError:
            return {NA__AUTH__RECORDS: []}
        if NA__AUTH__CACHE["mtime"] != mtime:
            NA__AUTH__CACHE["doc"] = json.loads(NA__AUTH__REGISTER.read_text(encoding="utf-8"))
            NA__AUTH__CACHE["mtime"] = mtime
        return NA__AUTH__CACHE["doc"]
# ---------------------------------------------------------------

# HELPER FUNCTION | Level Ranks From the Register (AppAdmin 1 ... Affiliate 4)
# ------------------------------------------------------------
def Na__Auth__Ranks() -> dict:
    levels = Na__Auth__LoadRegister().get("UserAccountData__ValeUsers__PermissionLevels") or []
    ranks = {lv.get("PermissionLevel__Code"): lv.get("PermissionLevel__Rank") for lv in levels
             if lv.get("PermissionLevel__HasAccount")}
    return ranks or dict(NA__AUTH__DEFAULT_RANKS)
# ---------------------------------------------------------------

# FUNCTION | Find a Record by Email (case-insensitive) or by USR Code
# ------------------------------------------------------------
def Na__Auth__FindRecord(email: str = "", code: str = "") -> dict | None:
    email = (email or "").strip().lower()
    for rec in Na__Auth__LoadRegister().get(NA__AUTH__RECORDS) or []:
        if code and rec.get("ValeUser__UniqueCode") == code:
            return rec
        if email and (rec.get("ValeUser__Email__Address") or "").lower() == email:
            return rec
    return None
# ---------------------------------------------------------------

# FUNCTION | The User as Apps See It (never the hash)
# ------------------------------------------------------------
def Na__Auth__PublicUser(rec: dict) -> dict:
    first, last = rec.get("ValeUser__Name__First") or "", rec.get("ValeUser__Name__Last") or ""
    level = rec.get("ValeUser__Permission__Level") or ""
    return {"code": rec.get("ValeUser__UniqueCode"), "first": first, "last": last,
            "name": f"{first} {last}".strip(), "email": rec.get("ValeUser__Email__Address") or "",
            "role": rec.get("ValeUser__Employee__Role") or "", "department": rec.get("ValeUser__Employee__Department") or "",
            "level": level, "levelRank": Na__Auth__Ranks().get(level, 99),
            "mustChangePassword": bool(rec.get("ValeUser__Password__IsTemporary"))}
# ---------------------------------------------------------------

# HELPER FUNCTION | Rank of a User (lower = more rights; 99 = none)
# ------------------------------------------------------------
def Na__Auth__Level(user: dict | None) -> int:
    return (user or {}).get("levelRank", 99)
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Session Cookie
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Cookie Signer (one secret for every app service)
# ------------------------------------------------------------
def Na__Auth__Signer() -> URLSafeTimedSerializer:
    secret = os.environ.get("VALE_SECRET_KEY")
    if not secret:
        if os.environ.get("VALE_DEV") != "1":
            raise RuntimeError("VALE_SECRET_KEY is not set (see /etc/vale/secrets/vale-shared.env)")
        secret = NA__AUTH__DEV_KEY
    return URLSafeTimedSerializer(secret, salt="vale-session-v1")
# ---------------------------------------------------------------

# HELPER FUNCTION | Fingerprint of the Password Hash and Last Forced Sign-Out (a change to either ends old sessions)
# ------------------------------------------------------------
def Na__Auth__Fingerprint(rec: dict) -> str:
    text = rec.get("ValeUser__Password__Hash") or ""
    if rec.get(NA__AUTH__SIGNED_OUT):
        text += "|" + rec[NA__AUTH__SIGNED_OUT]                                # <-- Absent: the 1.0.0 fingerprint, so old sessions hold
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]
# ---------------------------------------------------------------

# FUNCTION | Set / Clear the Session Cookie on a Response
# ------------------------------------------------------------
def Na__Auth__IssueCookie(response, rec: dict):
    token = Na__Auth__Signer().dumps({"c": rec.get("ValeUser__UniqueCode"), "f": Na__Auth__Fingerprint(rec)})
    secure = request.is_secure or request.headers.get("X-Forwarded-Proto", "") == "https"
    response.set_cookie(NA__AUTH__COOKIE, token, max_age=NA__AUTH__MAX_AGE_S, path="/", httponly=True,
                        samesite="Lax", secure=secure)
    return response

def Na__Auth__ClearCookie(response):
    response.delete_cookie(NA__AUTH__COOKIE, path="/")
    return response
# ---------------------------------------------------------------

# FUNCTION | The Signed-In User for This Request, or None
# ------------------------------------------------------------
def Na__Auth__CurrentRecord() -> dict | None:
    token = request.cookies.get(NA__AUTH__COOKIE)
    if not token:
        return None
    try:
        data = Na__Auth__Signer().loads(token)                                 # <-- No age limit: valid until signed out
    except BadSignature:
        return None
    rec = Na__Auth__FindRecord(code=str(data.get("c") or ""))
    if not rec or not rec.get("ValeUser__Employee__IsActive") or data.get("f") != Na__Auth__Fingerprint(rec):
        return None                                                            # <-- Deactivated, new password, or signed out
    if rec.get("ValeUser__Permission__Level") not in Na__Auth__Ranks():
        return None
    return rec

def Na__Auth__CurrentUser() -> dict | None:
    rec = Na__Auth__CurrentRecord()
    return Na__Auth__PublicUser(rec) if rec else None
# ---------------------------------------------------------------

# FUNCTION | Decorator: Signed In, at Least This Level, Password Not Temporary
# ------------------------------------------------------------
def Na__Auth__Require(min_level: str = "Employee", allow_temporary: bool = False):
    def wrap(view):
        @functools.wraps(view)
        def inner(*args, **kwargs):
            user = Na__Auth__CurrentUser()
            if not user:
                return jsonify({"ok": False, "error": "sign-in required"}), 401
            if user["mustChangePassword"] and not allow_temporary:
                return jsonify({"ok": False, "error": "choose a new password first", "mustChangePassword": True}), 403
            need = Na__Auth__Ranks().get(min_level, NA__AUTH__DEFAULT_RANKS.get(min_level, 0))
            if Na__Auth__Level(user) > need:
                return jsonify({"ok": False, "error": f"needs {min_level} permission"}), 403
            return view(*args, **kwargs)
        return inner
    return wrap
# ---------------------------------------------------------------

# endregion ----------------------------------------------------
