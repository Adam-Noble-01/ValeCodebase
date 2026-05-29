# =============================================================================
# NOBLEIMAGETOOLS - SERVER LAUNCHER (Python Shim)
# =============================================================================
#
# FILE       : NobleImageTools__LaunchServer__Localhost__8005__.py
# PURPOSE    : Thin launcher shim that adds the server directory to sys.path
#              and starts the Flask server. Run from the NobleImageTools root.
#
# USAGE:
#   python NobleImageTools__LaunchServer__Localhost__8005__.py
#
#   Or use the PowerShell launcher which handles venv activation:
#   .\NobleImageTools__LaunchServer__Localhost__8005__.ps1
#
# =============================================================================

import os
import sys

SCRIPT_DIR      = os.path.dirname(os.path.abspath(__file__))
SERVER_DIR      = os.path.join(SCRIPT_DIR, "05__Server__Sam2Backend")

sys.path.insert(0, SERVER_DIR)
os.chdir(SCRIPT_DIR)

from NobleImageTools__FlaskServer__Main__ import (
    app,
    NobleImageTools__Server__EnsureDirectories,
    AI_MODELS_DIR
)
from NobleImageTools__Server__Sam2Inference__ import NobleImageTools__Sam2__PreloadInBackground
from NobleImageTools__Server__Florence2__    import NobleImageTools__Florence2__PreloadInBackground

SERVER_HOST     = "127.0.0.1"
SERVER_PORT     = 8005
APP_SHELL       = "NobleImageTools__App__.html"

NobleImageTools__Server__EnsureDirectories()
NobleImageTools__Sam2__PreloadInBackground(str(AI_MODELS_DIR))
NobleImageTools__Florence2__PreloadInBackground()

print("=" * 77)
print(" NOBLEIMAGETOOLS - FLASK LOCALHOST SERVER")
print("=" * 77)
print()
print(f" Server running at: http://{SERVER_HOST}:{SERVER_PORT}/{APP_SHELL}")
print(f" SAM2 + Florence-2 preloading in background (~30s first load).")
print(f" Press Ctrl+C to stop")
print()
print("=" * 77)
print()

app.run(
    host=SERVER_HOST,
    port=SERVER_PORT,
    debug=False,
    threaded=True
)
