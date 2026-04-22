#!/usr/bin/env python3
"""
=============================================================================
 WHITECARDVISION - GEMINI CLIENT WRAPPER
=============================================================================
 FILE       : WhitecardVision__Google__GeminiClient__.py
 NAMESPACE  : Wv
 MODULE     : ExternalApi - GoogleApis - GeminiClient
 PURPOSE    : Thin client that POSTs a fully-formed request body to the
              Gemini generateContent endpoint and parses the first inline
              image part from the response.

 DESCRIPTION:
 - Zero external dependencies (stdlib urllib only).
 - Called exclusively by the Flask Gemini proxy - never by the browser.
 - Hard-blocks any model id containing "flash-image" (per WcVis CRITICAL
   note about Gemini 3 Flash Image being unfit for professional use).
 - Returns the raw PNG bytes plus metadata so the caller can write to disk.

 DOC REFERENCE:
   https://ai.google.dev/gemini-api/docs/image-generation
=============================================================================
"""

from __future__ import annotations

import base64
import json
import urllib.error
import urllib.request
from typing import Any


# -----------------------------------------------------------------------------
# REGION | Constants
# -----------------------------------------------------------------------------

WV__GEMINI__BLOCKED_MODEL_SUBSTRINGS = ("flash-image",)                          # <-- Hard guard per spec; flash models are banned.
WV__GEMINI__DEFAULT_USER_AGENT       = "WhitecardVision/0.1 (+local-proxy)"

# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Exceptions
# -----------------------------------------------------------------------------

class Wv__Gemini__BlockedModelError(Exception):
    pass


class Wv__Gemini__ApiKeyMissingError(Exception):
    pass


class Wv__Gemini__TransportError(Exception):
    pass


class Wv__Gemini__ResponseShapeError(Exception):
    pass


# endregion ----------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Public API
# -----------------------------------------------------------------------------


# FUNCTION | Call Gemini generateContent with a pre-built request body
# ------------------------------------------------------------
def Wv__GeminiClient__GenerateContent(
    api_key: str,
    base_url: str,
    model_id: str,
    request_body: dict[str, Any],
    timeout_seconds: int = 180,
) -> dict[str, Any]:
    if not api_key:
        raise Wv__Gemini__ApiKeyMissingError("GEMINI_API_KEY is empty or missing.")

    Wv__GeminiClient__AssertModelAllowed(model_id)                               # <-- Fail fast before any network IO.

    endpoint_url = f"{base_url.rstrip('/')}/models/{model_id}:generateContent"
    encoded_body = json.dumps(request_body, ensure_ascii=False).encode("utf-8")

    http_request = urllib.request.Request(
        url=endpoint_url,
        data=encoded_body,
        method="POST",
        headers={
            "Content-Type"   : "application/json; charset=utf-8",
            "x-goog-api-key" : api_key,
            "User-Agent"     : WV__GEMINI__DEFAULT_USER_AGENT,
        },
    )

    try:
        with urllib.request.urlopen(http_request, timeout=timeout_seconds) as response:
            response_bytes = response.read()
            response_json  = json.loads(response_bytes.decode("utf-8"))
    except urllib.error.HTTPError as http_error:
        error_payload = http_error.read().decode("utf-8", errors="replace") if http_error.fp else ""
        raise Wv__Gemini__TransportError(
            f"HTTP {http_error.code} from Gemini: {error_payload[:500]}"
        ) from http_error
    except urllib.error.URLError as url_error:
        raise Wv__Gemini__TransportError(f"Network error calling Gemini: {url_error}") from url_error

    return response_json
# ------------------------------------------------------------


# FUNCTION | Extract first inline PNG image from a generateContent response
# ------------------------------------------------------------
def Wv__GeminiClient__ExtractFirstImage(response_json: dict[str, Any]) -> tuple[bytes, str]:
    candidates = response_json.get("candidates") or []
    if not candidates:
        raise Wv__Gemini__ResponseShapeError("Gemini response contained no candidates.")

    content_parts = (candidates[0].get("content") or {}).get("parts") or []
    for part in content_parts:
        inline_data = part.get("inlineData") or part.get("inline_data")
        if not inline_data:
            continue
        base64_data = inline_data.get("data")
        mime_type   = inline_data.get("mimeType") or inline_data.get("mime_type") or "image/png"
        if not base64_data:
            continue
        try:
            image_bytes = base64.b64decode(base64_data)
        except Exception as decode_error:
            raise Wv__Gemini__ResponseShapeError(f"Could not decode base64 image: {decode_error}") from decode_error
        return image_bytes, mime_type

    raise Wv__Gemini__ResponseShapeError("Gemini response had no inlineData image parts.")
# ------------------------------------------------------------


# HELPER FUNCTION | Guard against blocked model ids
# ------------------------------------------------------------
def Wv__GeminiClient__AssertModelAllowed(model_id: str) -> None:
    lowered = (model_id or "").lower()
    for blocked_fragment in WV__GEMINI__BLOCKED_MODEL_SUBSTRINGS:
        if blocked_fragment in lowered:
            raise Wv__Gemini__BlockedModelError(
                f"Model '{model_id}' is blocked by the WhitecardVision spec "
                f"(contains banned fragment '{blocked_fragment}'). Use the Pro image model only."
            )
# ------------------------------------------------------------


# endregion ----------------------------------------------------
