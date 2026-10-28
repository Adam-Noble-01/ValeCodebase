"""
=============================================================================
 VALE SHARED API - THE LIBRARY GATE (WHO MAY HAVE A PROTECTED PROJECT FILE)
=============================================================================

FILE       : ValeShared__LibraryGate__.py
AUTHOR     : Adam Noble - Noble Architecture
PURPOSE    : The half of nginx's check before it sends a protected file from the
             Projects Master Library that every app shares: which project the
             file belongs to, the bare answers nginx reads, and the cookie that
             carries a client link to that project's files
CREATED    : 28-Oct-2026

DESCRIPTION:
- PROTECTED FILES are named per app route in the Server Manager's routes file
  (LibraryProtected, e.g. "ValeVision3D/Content__3dModel__GlbFiles/"), inside
  every library project. Before nginx sends one it asks that app's own API
  (auth_request: GET /api/library-access, the file's path in the
  X-Vale-Library-Path header) and sends the file only on a 2xx. Locally,
  Server__DeveloperTools/ValeDev__LocalServer__.py asks the same route the
  same way. Each app decides who may have its files; this module only reads
  the question and writes the answer.
- THE ANSWER IS 204, 401 OR 403, never anything else: nginx passes a 401 or a
  403 to the browser and turns every other code into a 500.
- THE PROJECT IS THE ONE NGINX WILL SEND FROM. The path is nginx's $uri,
  already decoded and normalised: /Vale__Projects__MasterLibrary/<year
  folder>/<id>/<rest>. The year folder must be the one the library index holds
  for <id>, so a check can never pass for one folder while nginx sends
  another's file.
- THE CLIENT'S COOKIE. A file request carries no ?share= and no header, only
  cookies. So the API that opens a client link also sets a cookie scoped to
  that project's folder in the library (Path=/Vale__Projects__MasterLibrary/
  <year>/<id>/ plus the app's bucket), holding that link's token: HttpOnly,
  SameSite=Lax, Secure on https, 30 days, renewed by every visit. A browser
  sends it with that project's files and nothing else. The token is checked
  on every request, so a link switched off stops at once.

ENVIRONMENT:
  VALE_ROOT   the mirror / server root (through ValeShared__Library__)

-----------------------------------------------------------------------------

DEVELOPMENT LOG:
28-Oct-2026 - Version 1.0.0
- Initial build: ValeVision 3D's model files and project records, and Theia's
  videos, open only for a Vale sign-in or a live client link to that project.

=============================================================================
"""

from __future__ import annotations

import re
from pathlib import Path

from flask import Response, request

from ValeShared__Library__ import Na__Library__Find, Na__Library__Url


# -----------------------------------------------------------------------------
# REGION | Constants
# -----------------------------------------------------------------------------

NA__LIBGATE__PATH_HEADER          = "X-Vale-Library-Path"                       # <-- Set by nginx (and the dev server), never trusted from a browser
NA__LIBGATE__PREFIX               = "/Vale__Projects__MasterLibrary/"
NA__LIBGATE__TOKEN                = re.compile(r"^[A-Za-z0-9_-]{16,64}$")       # <-- A client link's token (secrets.token_urlsafe)
NA__LIBGATE__COOKIE_MAX_AGE_S     = 30 * 24 * 3600                              # <-- Renewed by every visit; a link switched off stops at once anyway

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | The Question (which project, which file)
# -----------------------------------------------------------------------------

# FUNCTION | The Library Project and the Path Inside It That nginx Is About to Send: (folder, rest), or (None, "")
# ------------------------------------------------------------
def Na__LibraryGate__Target() -> tuple:
    raw = str(request.headers.get(NA__LIBGATE__PATH_HEADER) or "")
    if not raw.startswith(NA__LIBGATE__PREFIX):
        return None, ""
    parts = raw[len(NA__LIBGATE__PREFIX):].split("/")
    if len(parts) < 3 or any(p in (".", "..") for p in parts) or not parts[0] or not parts[1]:
        return None, ""
    folder = Na__Library__Find(parts[1])
    if folder is None or folder.parent.name != parts[0]:
        return None, ""                                                        # <-- Not this year's folder: never the one nginx sends
    return folder, "/".join(parts[2:])
# ---------------------------------------------------------------

# HELPER FUNCTION | The Token a Cookie Holds, or ""
# ------------------------------------------------------------
def Na__LibraryGate__CookieToken(name: str) -> str:
    token = str(request.cookies.get(name) or "").strip()
    return token if NA__LIBGATE__TOKEN.match(token) else ""
# ---------------------------------------------------------------

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | The Answer, and the Client's Cookie
# -----------------------------------------------------------------------------

# FUNCTION | nginx's Answer: 204 Send It, 401 or 403 Refuse (empty, never cached)
# ------------------------------------------------------------
def Na__LibraryGate__Answer(status: int) -> Response:
    response = Response(status=status if status in (204, 401, 403) else 403)
    response.headers["Cache-Control"] = "no-store"
    return response
# ---------------------------------------------------------------

# FUNCTION | Set (token) or Clear (None) a Client Link's Cookie on One Project's Library Folder
# ------------------------------------------------------------
# sub: the app's bucket inside the project ("ValeVision__TheiaVideo/"), or ""
# for the whole project folder.
# ------------------------------------------------------------
def Na__LibraryGate__SetCookie(response, name: str, folder: Path, token: str | None, sub: str = ""):
    path = Na__Library__Url(folder).rstrip("/") + "/" + sub.strip("/") + ("/" if sub.strip("/") else "")
    if token and NA__LIBGATE__TOKEN.match(token):
        secure = request.is_secure or request.headers.get("X-Forwarded-Proto", "") == "https"
        response.set_cookie(name, token, max_age=NA__LIBGATE__COOKIE_MAX_AGE_S, path=path, httponly=True,
                            samesite="Lax", secure=secure)
    else:
        response.delete_cookie(name, path=path)
    return response
# ---------------------------------------------------------------

# endregion ----------------------------------------------------
