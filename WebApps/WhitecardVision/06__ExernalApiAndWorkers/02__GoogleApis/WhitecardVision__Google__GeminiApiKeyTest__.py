#!/usr/bin/env python3
"""
=============================================================================
 WHITECARDVISION - GEMINI API KEY PING TEST
=============================================================================
 FILE       : WhitecardVision__Google__GeminiApiKeyTest__.py
 NAMESPACE  : Wv
 MODULE     : ExternalApi - GoogleApis - GeminiApiKeyTest
 PURPOSE    : Standalone script that verifies the GEMINI_API_KEY in the
              project .env is valid and can reach the configured model.

 HOW TO RUN : python 06__ExernalApiAndWorkers/02__GoogleApis/WhitecardVision__Google__GeminiApiKeyTest__.py
              (run from the WhitecardVision project root)

 PASS       : Key is valid - model replied with text snippet.
 FAIL       : Key is missing, rejected (401/403), or model is unreachable.

 NOTE       : Uses stdlib urllib only - no google-genai package required.
              Reads key from 06__ExernalApiAndWorkers/01__Secrets/.env
=============================================================================
"""

from __future__ import annotations

import sys
from pathlib import Path

# -----------------------------------------------------------------------------
# REGION | Path bootstrap
# -----------------------------------------------------------------------------

SCRIPT_DIR   = Path(__file__).resolve().parent
APP_ROOT     = SCRIPT_DIR.parent.parent
FLASK_SCRIPTS = APP_ROOT / "05__FlaskServerScripts"
SECRETS_DIR   = APP_ROOT / "06__ExernalApiAndWorkers" / "01__Secrets"

sys.path.insert(0, str(FLASK_SCRIPTS))
sys.path.insert(0, str(SCRIPT_DIR))

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Imports from project modules
# -----------------------------------------------------------------------------

from WhitecardVision__FlaskServer__EnvLoader__ import Wv__EnvLoader__ReadEnvFile
from WhitecardVision__Google__GeminiClient__ import (
    Wv__GeminiClient__GenerateContent,
    Wv__Gemini__ApiKeyMissingError,
    Wv__Gemini__BlockedModelError,
    Wv__Gemini__TransportError,
)

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Constants
# -----------------------------------------------------------------------------

WV__PING_TEST__TIMEOUT_SECONDS = 30
WV__PING_TEST__PROMPT          = "Reply with exactly one word: PONG"
WV__PING_TEST__PLACEHOLDER_KEY = "{YOUR_GEMINI_API_KEY}"

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Test runner
# -----------------------------------------------------------------------------


# FUNCTION | Load env vars and validate key/model are present
# ------------------------------------------------------------
def Wv__PingTest__LoadAndValidateEnv() -> dict[str, str] | None:
    env_path = SECRETS_DIR / ".env"

    if not env_path.is_file():
        print(f"[FAIL] .env file not found at: {env_path}")
        print("       Copy .env.example to .env and populate GEMINI_API_KEY.")
        return None

    env_vars = Wv__EnvLoader__ReadEnvFile(env_path)
    api_key  = env_vars.get("GEMINI_API_KEY", "")

    if not api_key or api_key == WV__PING_TEST__PLACEHOLDER_KEY:
        print("[FAIL] GEMINI_API_KEY is missing or still contains the placeholder value.")
        print(f"       Edit: {env_path}")
        return None

    return env_vars
# ------------------------------------------------------------


# FUNCTION | Extract a text snippet from a generateContent response
# ------------------------------------------------------------
def Wv__PingTest__ExtractTextSnippet(response: dict) -> str | None:
    candidates = response.get("candidates") or []
    if not candidates:
        return None
    parts = (candidates[0].get("content") or {}).get("parts") or []
    for part in parts:
        if "text" in part:
            return part["text"].strip()
    return None
# ------------------------------------------------------------


# FUNCTION | Run the full ping test and return True on success
# ------------------------------------------------------------
def Wv__PingTest__Run() -> bool:
    print("=" * 60)
    print(" WHITECARDVISION - GEMINI API KEY PING TEST")
    print("=" * 60)

    env_vars = Wv__PingTest__LoadAndValidateEnv()
    if env_vars is None:
        return False

    api_key  = env_vars["GEMINI_API_KEY"]
    model_id = env_vars.get("GEMINI_MODEL_ID", "gemini-3-pro-image-preview")
    base_url = env_vars.get("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")

    masked_key = f"{api_key[:8]}...{api_key[-4:]}"
    print(f"  API Key  : {masked_key}")
    print(f"  Model    : {model_id}")
    print(f"  Endpoint : {base_url}")
    print(f"  Prompt   : \"{WV__PING_TEST__PROMPT}\"")
    print(f"  Timeout  : {WV__PING_TEST__TIMEOUT_SECONDS}s")
    print("-" * 60)
    print("  Sending request...")

    request_body: dict = {
        "contents": [
            {
                "parts": [{"text": WV__PING_TEST__PROMPT}]
            }
        ],
        "generationConfig": {
            "responseModalities": ["TEXT"],
        },
    }

    try:
        response = Wv__GeminiClient__GenerateContent(
            api_key        = api_key,
            base_url       = base_url,
            model_id       = model_id,
            request_body   = request_body,
            timeout_seconds= WV__PING_TEST__TIMEOUT_SECONDS,
        )

        text_snippet = Wv__PingTest__ExtractTextSnippet(response)

        if text_snippet:
            print(f"  [PASS] Key is valid. Model replied: \"{text_snippet}\"")
        else:
            candidate_keys = list(response.keys())
            print(f"  [PASS] Key is valid. Response received (keys: {candidate_keys})")

        print("=" * 60)
        return True

    except Wv__Gemini__ApiKeyMissingError as err:
        print(f"  [FAIL] API key error     : {err}")
    except Wv__Gemini__BlockedModelError as err:
        print(f"  [FAIL] Blocked model     : {err}")
    except Wv__Gemini__TransportError as err:
        print(f"  [FAIL] Transport/HTTP err: {err}")
    except Exception as err:
        print(f"  [FAIL] Unexpected error  : {err}")

    print("=" * 60)
    return False
# ------------------------------------------------------------


# endregion -------------------------------------------------------------------


if __name__ == "__main__":
    success = Wv__PingTest__Run()
    sys.exit(0 if success else 1)
