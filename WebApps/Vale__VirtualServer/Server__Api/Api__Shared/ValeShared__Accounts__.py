"""
=============================================================================
 VALE SHARED API - ACCOUNTS BLUEPRINT (SIGN IN, SIGN OUT, ME, NEW PASSWORD)
=============================================================================

FILE       : ValeShared__Accounts__.py
AUTHOR     : Adam Noble - Noble Architecture
PURPOSE    : The sign-in routes every Vale app shares. Each app's API mounts it:
               app.register_blueprint(Na__Accounts__Blueprint, url_prefix="/api/accounts")
             so the browser calls it relative to the app: fetch("api/accounts/login").
CREATED    : 06-Oct-2026

DESCRIPTION:
- POST /api/accounts/login            {email, password}  -> {ok, user} + session cookie
- POST /api/accounts/logout                               -> {ok}
- GET  /api/accounts/me                                   -> {ok, user} + renewed cookie | 401
- POST /api/accounts/change-password  {current, new}      -> {ok, user} + fresh cookie
- Email is the sign-in name. Passwords are checked against the register's
  Werkzeug pbkdf2:sha256 hashes; a first sign-in with the temporary password
  returns mustChangePassword, and every other API refuses until it is changed.
- A new password is written into the register (locked, atomic, in the same
  aligned JSON style the Server Manager writes), with IsTemporary false. The
  register syncs both ways, so collect it before editing users on the PC.
- Failed sign-ins are slowed: 8 failures from one address in 10 minutes earn
  a 10 minute wait.

-----------------------------------------------------------------------------

DEVELOPMENT LOG:
06-Oct-2026 - Version 1.1.0
- /me renews the session cookie, so a device that keeps using any Vale app
  stays signed in (ValeShared__Auth__ 1.1.0).
- A password change writes the register as 0660 (it was world-readable 0664).

06-Oct-2026 - Version 1.0.0
- Initial build (shared by ValeVision Gallery and ValeVision 3D).

=============================================================================
"""

from __future__ import annotations

import json
import os
import re
import threading
import time
from pathlib import Path

from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from ValeShared__Auth__ import (NA__AUTH__RECORDS, NA__AUTH__REGISTER, Na__Auth__ClearCookie, Na__Auth__CurrentRecord,
                                Na__Auth__FindRecord, Na__Auth__IssueCookie, Na__Auth__PublicUser, Na__Auth__Ranks)

Na__Accounts__Blueprint = Blueprint("vale_accounts", __name__)


# -----------------------------------------------------------------------------
# REGION | Constants and Throttle
# -----------------------------------------------------------------------------

NA__ACCOUNTS__FAIL_LIMIT          = 8                                          # <-- Failures per address ...
NA__ACCOUNTS__FAIL_WINDOW_S       = 600                                        # <-- ... in 10 minutes ...
NA__ACCOUNTS__FAIL_BLOCK_S        = 600                                        # <-- ... earn a 10 minute wait
NA__ACCOUNTS__MIN_PASSWORD        = 8
NA__ACCOUNTS__MONTHS              = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
NA__ACCOUNTS__FAILS               = {}                                         # <-- address -> [failure times]
NA__ACCOUNTS__THROTTLE_LOCK       = threading.Lock()

# HELPER FUNCTION | Caller Address (Cloudflare, then nginx, then the socket)
# ------------------------------------------------------------
def Na__Accounts__Address() -> str:
    return (request.headers.get("CF-Connecting-IP") or request.headers.get("X-Real-IP")
            or request.remote_addr or "?")
# ---------------------------------------------------------------

# HELPER FUNCTION | Too Many Recent Failures From This Address?
# ------------------------------------------------------------
def Na__Accounts__Blocked(addr: str) -> int:
    now = time.time()
    with NA__ACCOUNTS__THROTTLE_LOCK:
        fails = [t for t in NA__ACCOUNTS__FAILS.get(addr, []) if now - t < NA__ACCOUNTS__FAIL_WINDOW_S + NA__ACCOUNTS__FAIL_BLOCK_S]
        NA__ACCOUNTS__FAILS[addr] = fails
        recent = [t for t in fails if now - t < NA__ACCOUNTS__FAIL_WINDOW_S]
        if len(recent) >= NA__ACCOUNTS__FAIL_LIMIT:
            return int(NA__ACCOUNTS__FAIL_BLOCK_S - (now - recent[-1])) + 1
    return 0

def Na__Accounts__NoteFailure(addr: str) -> None:
    with NA__ACCOUNTS__THROTTLE_LOCK:
        NA__ACCOUNTS__FAILS.setdefault(addr, []).append(time.time())
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Writing the Register (password changes only)
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Aligned JSON (identical to the Server Manager's writer, so files never churn)
# ------------------------------------------------------------
def Na__Accounts__Aligned(value, depth: int = 0) -> str:
    pad, inner = "    " * depth, "    " * (depth + 1)
    if isinstance(value, dict):
        if not value:
            return "{}"
        width = max(len(json.dumps(k, ensure_ascii=False)) for k in value)
        out, prev_box = "", False
        for i, (k, v) in enumerate(value.items()):
            box = isinstance(v, (dict, list))
            if i:
                out += ",\n" + ("\n" if depth == 0 and (box or prev_box) else "")
            out += f"{inner}{json.dumps(k, ensure_ascii=False).ljust(width)} : {Na__Accounts__Aligned(v, depth + 1)}"
            prev_box = box
        return "{\n" + out + "\n" + pad + "}"
    if isinstance(value, list):
        if not value:
            return "[]"
        if all(not isinstance(v, (dict, list)) for v in value):
            line = "[" + ", ".join(json.dumps(v, ensure_ascii=False) for v in value) + "]"
            if len(inner) + len(line) <= 120:
                return line
        return "[\n" + ",\n".join(inner + Na__Accounts__Aligned(v, depth + 1) for v in value) + "\n" + pad + "]"
    return json.dumps(value, ensure_ascii=False)
# ---------------------------------------------------------------

# HELPER FUNCTION | Cross-Process Lock on the Register (every app service may write)
# ------------------------------------------------------------
class Na__Accounts__FileLock:
    def __init__(self, path: Path):
        self.path = path
        self.fh = None

    def __enter__(self):
        self.fh = open(self.path, "a+")
        if os.name == "nt":
            import msvcrt
            while True:
                try:
                    msvcrt.locking(self.fh.fileno(), msvcrt.LK_LOCK, 1)
                    break
                except OSError:
                    time.sleep(0.05)
        else:
            import fcntl
            fcntl.flock(self.fh.fileno(), fcntl.LOCK_EX)
        return self

    def __exit__(self, *exc):
        try:
            if os.name == "nt":
                import msvcrt
                self.fh.seek(0)
                msvcrt.locking(self.fh.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl
                fcntl.flock(self.fh.fileno(), fcntl.LOCK_UN)
        finally:
            self.fh.close()
# ---------------------------------------------------------------

# HELPER FUNCTION | A User's Temporary Password, From the Register's Own Rule (never written in code)
# ------------------------------------------------------------
def Na__Accounts__TempPassword(rec: dict) -> str:
    from ValeShared__Auth__ import Na__Auth__LoadRegister
    rule = str(Na__Auth__LoadRegister().get("UserAccountData__ValeUsers__TempPasswordRule") or "")
    first = re.sub(r"[^A-Za-z0-9]", "", rec.get("ValeUser__Name__First") or "")
    return rule.replace("{{UserFirstName}}", first) if rule else ""
# ---------------------------------------------------------------

# FUNCTION | Set a User's Own Password in the Register
# ------------------------------------------------------------
def Na__Accounts__WritePassword(code: str, new_password: str) -> dict:
    lock = NA__AUTH__REGISTER.with_name(".UserAccountData__Register.lock")       # <-- *.lock never syncs
    with Na__Accounts__FileLock(lock):
        doc = json.loads(NA__AUTH__REGISTER.read_text(encoding="utf-8"))
        rec = next((r for r in doc.get(NA__AUTH__RECORDS) or [] if r.get("ValeUser__UniqueCode") == code), None)
        if rec is None:
            raise KeyError(code)
        t = time.localtime()
        today = f"{t.tm_mday:02d}-{NA__ACCOUNTS__MONTHS[t.tm_mon - 1]}-{t.tm_year}"
        rec["ValeUser__Password__Hash"] = generate_password_hash(new_password, method="pbkdf2:sha256:600000")
        rec["ValeUser__Password__IsTemporary"] = False
        rec["ValeUser__Password__SetDate"] = today
        doc["UserAccountData__ValeUsers__UpdatedDate"] = today
        tmp = NA__AUTH__REGISTER.with_suffix(".tmp")
        tmp.write_text(Na__Accounts__Aligned(doc) + "\n", encoding="utf-8", newline="\n")
        os.chmod(tmp, 0o660)                                                   # <-- Owner and group vale only
        os.replace(tmp, NA__AUTH__REGISTER)
        return rec
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Routes
# -----------------------------------------------------------------------------

# FUNCTION | Sign In With Email and Password
# ------------------------------------------------------------
@Na__Accounts__Blueprint.post("/login")
def Na__Accounts__Login():
    addr = Na__Accounts__Address()
    wait = Na__Accounts__Blocked(addr)
    if wait:
        return jsonify({"ok": False, "error": f"Too many attempts. Try again in {wait // 60 + 1} minutes."}), 429
    body = request.get_json(silent=True) or {}
    email, password = str(body.get("email") or "").strip(), str(body.get("password") or "")
    if not email or not password:
        return jsonify({"ok": False, "error": "Enter your email address and password."}), 400
    rec = Na__Accounts__FindRecord(email)
    ok = bool(rec) and rec.get("ValeUser__Employee__IsActive") and \
        rec.get("ValeUser__Permission__Level") in Na__Auth__Ranks() and \
        check_password_hash(rec.get("ValeUser__Password__Hash") or "", password)
    if not ok:
        Na__Accounts__NoteFailure(addr)
        return jsonify({"ok": False, "error": "Email address or password not recognised."}), 401
    return Na__Auth__IssueCookie(jsonify({"ok": True, "user": Na__Auth__PublicUser(rec)}), rec)

def Na__Accounts__FindRecord(email: str):
    return Na__Auth__FindRecord(email=email)
# ---------------------------------------------------------------

# FUNCTION | Sign Out
# ------------------------------------------------------------
@Na__Accounts__Blueprint.post("/logout")
def Na__Accounts__Logout():
    return Na__Auth__ClearCookie(jsonify({"ok": True}))
# ---------------------------------------------------------------

# FUNCTION | Who Am I (renews the cookie: every visit keeps the device signed in)
# ------------------------------------------------------------
@Na__Accounts__Blueprint.get("/me")
def Na__Accounts__Me():
    rec = Na__Auth__CurrentRecord()
    if not rec:
        return jsonify({"ok": False, "error": "sign-in required"}), 401
    return Na__Auth__IssueCookie(jsonify({"ok": True, "user": Na__Auth__PublicUser(rec)}), rec)
# ---------------------------------------------------------------

# FUNCTION | Choose a New Password (also the forced first-sign-in change)
# ------------------------------------------------------------
@Na__Accounts__Blueprint.post("/change-password")
def Na__Accounts__ChangePassword():
    rec = Na__Auth__CurrentRecord()
    if not rec:
        return jsonify({"ok": False, "error": "sign-in required"}), 401
    body = request.get_json(silent=True) or {}
    current, new = str(body.get("current") or ""), str(body.get("new") or "")
    if not check_password_hash(rec.get("ValeUser__Password__Hash") or "", current):
        return jsonify({"ok": False, "error": "Your current password is not right."}), 400
    if len(new) < NA__ACCOUNTS__MIN_PASSWORD or not re.search(r"[A-Za-z]", new) or not re.search(r"\d", new):
        return jsonify({"ok": False, "error": f"Use at least {NA__ACCOUNTS__MIN_PASSWORD} characters, with letters and a number."}), 400
    if new == current or new.lower() == Na__Accounts__TempPassword(rec).lower():
        return jsonify({"ok": False, "error": "Choose a password that is not your temporary one."}), 400
    try:
        rec = Na__Accounts__WritePassword(rec["ValeUser__UniqueCode"], new)
    except (OSError, KeyError, ValueError) as e:
        return jsonify({"ok": False, "error": f"Could not save the new password ({type(e).__name__})."}), 500
    return Na__Auth__IssueCookie(jsonify({"ok": True, "user": Na__Auth__PublicUser(rec)}), rec)
# ---------------------------------------------------------------

# endregion ----------------------------------------------------
