#!/usr/bin/env python3
# =============================================================================
# VALEVISION3D - TEST - SCRAPBOOK END-TO-END SERVER
# =============================================================================
#
# FILE       : Na__Test__ScrapbookServer__.py
# MODULE     : ScrapbookTestServer
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Serve the app for an in-browser test of the Custom Scrapbook that saves for real and never writes the real scrapbook folder, a project file or a byte-code cache
# CREATED    : 20-Sep-2026
#
# DESCRIPTION:
# - Serves the ValeCodebase root, uncached, like a static server: the app is
#   at /WebApps/ValeVision3D/index.html?project=<code>.
# - Registers the REAL Custom Scrapbook blueprint
#   (WebApps/Whitecardopedia/Server__ValeVisionScrapbook__Api__.py), pointed at
#   a TEMPORARY folder holding empty copies of the category folders, and
#   serves .../51__LayoutEditor__UserScrapbookContent/... from that same
#   folder. A save, the index and the item files therefore all round-trip
#   through the real code, and the real scrapbook folder is never touched.
# - ANSWERS THE TWO READS THE APP MAKES OF ITS LOCAL SERVER, and nothing that
#   writes: /api/check-localhost as server.py answers it, and GET
#   /api/projects/<code>, found with server.py's own get_project_path so a
#   numeric code resolves as it does for real. On 127.0.0.1 the app asks its
#   local server for project.json rather than the CDN, so without that route
#   no project loads.
# - HAS NO ROUTE THAT WRITES A PROJECT: a local mirror POST answers 405. A
#   browser test must STILL guard fetch against the Cloudflare worker's
#   /r2/write - this server cannot stop the app talking to Cloudflare.
# - Writes no byte-code: the repository tracks the bundled Flask's
#   __pycache__ files, and a run must leave the working tree as it found it.
#
# USAGE:
#     python 80__Testing__PrototypeEnvironment/Na__Test__ScrapbookServer__.py [port]
#
#   Default port 8766.
#
# -----
#
# PORT NOTE:
# - Ported from   : TrueVision3D 80__Testing__PrototypeEnvironment/Na__Test__ScrapbookServer__.py, its 1.0.0
# - Ported on     : 20-Sep-2026 for ValeVision3D v2.69.0
# - Parity        : adapted - this app's server is known by /api/check-localhost, not /api/health, and on
#                   127.0.0.1 the app reads project.json from its local server, so a read-only copy of that
#                   route is here too
#
# -----
#
# DEVELOPMENT LOG:
# 20-Sep-2026 - Version 1.0.0
# - Ported from TrueVision3D with the Custom Scrapbook.
#
# =============================================================================

import os
import sys
import json
import shutil
import tempfile

sys.dont_write_bytecode = True                                      # <-- Before any import below: the bundled dependencies' __pycache__ files are tracked

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR    = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))                       # <-- WebApps/ValeVision3D
SERVER_DIR = os.path.abspath(os.path.join(APP_DIR, '..', 'Whitecardopedia'))       # <-- Where server.py and the blueprint are
REPO_ROOT  = os.path.abspath(os.path.join(APP_DIR, '..', '..'))                    # <-- ValeCodebase
PORT       = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
CONTENT    = 'WebApps/ValeVision3D/51__LayoutEditor__UserScrapbookContent/'

BUNDLED    = os.path.join(SERVER_DIR, 'src', 'ThirdParty__VersionLockedDependencies', 'SERVER__FlaskServerDepencies')
if os.path.exists(BUNDLED):
    sys.path.insert(0, BUNDLED)                                     # <-- The same flask server.py itself runs on
sys.path.insert(0, SERVER_DIR)

import server as vale_server                                        # noqa: E402  <-- Imported, never run: only get_project_path is used
import Server__ValeVisionScrapbook__Api__ as scrapbook_api          # noqa: E402
from flask import Flask, send_from_directory, abort, jsonify        # noqa: E402

TEMP_DIR = tempfile.mkdtemp(prefix='vv_scrapbook_live_')
for name in sorted(os.listdir(scrapbook_api.SCRAPBOOK_DIR)):
    if scrapbook_api.CATEGORY_PATTERN.match(name):
        os.makedirs(os.path.join(TEMP_DIR, name), exist_ok=True)    # <-- The same categories, empty
scrapbook_api.SCRAPBOOK_DIR = TEMP_DIR                              # <-- Read at call time by every route
print(f'[ScrapbookTestServer] scrapbook folder for this run: {TEMP_DIR}', flush=True)

app = Flask(__name__, static_folder=None)
app.register_blueprint(scrapbook_api.valevision_scrapbook_api)


@app.route('/api/check-localhost')
def check_localhost():
    return jsonify({'isLocalhost': True, 'message': 'Server running on localhost', 'test': True})


@app.route('/api/projects/<path:folder_id>', methods=['GET'])
def get_project(folder_id):
    """Read-only: project.json as server.py would find it. There is no POST."""
    json_path = os.path.join(vale_server.get_project_path(folder_id), 'project.json')
    if not os.path.isfile(json_path):
        return jsonify({'error': f'Project not found: {folder_id}'}), 404
    with open(json_path, 'r', encoding='utf-8') as file_handle:
        return jsonify(json.load(file_handle))


@app.route('/', defaults={'filepath': ''})
@app.route('/<path:filepath>')
def static_files(filepath):
    normalized = filepath.replace('\\', '/')
    if normalized.startswith('api/'):
        abort(404)                                                  # <-- An API this server does not have is not a file
    if normalized.startswith(CONTENT):
        return send_from_directory(TEMP_DIR, normalized[len(CONTENT):])
    full_path = os.path.join(REPO_ROOT, *normalized.split('/')) if normalized else REPO_ROOT
    if not os.path.realpath(full_path).startswith(os.path.realpath(REPO_ROOT)):
        abort(404)                                                  # <-- Nothing above the repository is served
    if os.path.isdir(full_path):
        if os.path.isfile(os.path.join(full_path, 'index.html')):
            return send_from_directory(full_path, 'index.html')
        abort(404)
    if os.path.isfile(full_path):
        return send_from_directory(os.path.dirname(full_path), os.path.basename(full_path))
    abort(404)


@app.after_request
def no_cache(response):
    response.headers['Cache-Control'] = 'no-store, max-age=0'
    return response


if __name__ == '__main__':
    try:
        app.run(host='127.0.0.1', port=PORT, debug=False, threaded=True)
    finally:
        shutil.rmtree(TEMP_DIR, ignore_errors=True)
