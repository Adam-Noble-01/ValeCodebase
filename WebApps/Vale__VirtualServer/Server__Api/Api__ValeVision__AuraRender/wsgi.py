#!/usr/bin/env python3
# =============================================================================
# VALEVISION AURA - API ENTRY POINT (gunicorn wsgi:app)
# =============================================================================
#
# FILE       : wsgi.py
# MODULE     : Api__ValeVision__AuraRender
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : The Flask app behind https://app.valegardenhouses.com/aura/api/ -
#              projects' AURA drawing sets, and the handwriting model for the
#              browser's engine
# CREATED    : 30-Oct-2026
#
# DESCRIPTION:
# - nginx proxies /aura/api/ to 127.0.0.1:<VALE_PORT>/api/ (the aura route's
#   ApiPort in the URL Configurator: 8006; systemd's vale@ValeVision__AuraRender
#   binds it). Locally, Server__DeveloperTools/ValeDev__LocalServer__.py mounts it
#   under /aura/api/ the same way.
# - LIGHT ON THE SERVER: it reads and writes small JSON files and sends files,
#   nothing else. The drawing is done by the PainterlyNPR engine in the user's
#   browser, and so is the handwriting (WebAssembly; AuraRender__Api__Handwriting__
#   only hands over its model, once per device): the server is resource
#   constrained (Adam, 30-Oct-2026).
# - Management and AppAdmin only (AuraRender__Api__Core__ require_access).
# - The shared sign-in is mounted at /api/accounts (ValeShared__Accounts__), and
#   the activity route at /api/activity (ValeShared__Activity__).
#
# ENVIRONMENT (see the skill's flask-services.md):
#   VALE_ROOT         the mirror root (/srv/vale)          VALE_SECRET_KEY   the shared session key
#   VALE_PORT         8006 on the server                    VALE_DEV=1        local development only
#   VALE_ACCEL_REDIRECT=1     optional on the server: nginx streams the handwriting weights (else Flask sends them)
#
# RUN LOCALLY (on its own):
#   set VALE_DEV=1 && python wsgi.py        ->  http://127.0.0.1:8006/api/health
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 30-Oct-2026 - Version 1.2.0
# - The handwriting moved into the browser (AURA 0.2.1): handwriting/status and
#   handwriting/write (the PC's Python) are retired; handwriting/model and
#   handwriting/weights/<sha256> hand the model to the WebAssembly engine.
#
# 30-Oct-2026 - Version 1.0.0
# - First build: config, project, drawing sets (read, save with _rev and kept
#   revisions), handwriting status and write (PC only).
#
# =============================================================================

import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
for p in (HERE, HERE.parent / 'Api__Shared'):                                     # <-- This app's modules, then the shared ones
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from flask import Flask, jsonify                                                  # noqa: E402
from werkzeug.middleware.proxy_fix import ProxyFix                                # noqa: E402

from ValeShared__Accounts__ import Na__Accounts__Blueprint                        # noqa: E402
from ValeShared__Activity__ import Na__Activity__Blueprint                        # noqa: E402
from AuraRender__Api__Drawings__ import aura_drawings_api                         # noqa: E402
from AuraRender__Api__Handwriting__ import aura_handwriting_api                   # noqa: E402
from AuraRender__Api__Scene__ import aura_scene_api                               # noqa: E402


def create_app() -> Flask:
    app = Flask('ValeVisionAura')
    app.config['MAX_CONTENT_LENGTH'] = 6 * 1024 * 1024                            # <-- A drawing set with its written ink; the app refuses past 4 MB
    app.json.sort_keys = False                                                    # <-- Keys stay in the order they were written
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)           # <-- Behind nginx: the real scheme (Secure cookies) and visitor IP

    app.config['VALE_ACTIVITY_APP'] = 'ValeVision AURA'                           # <-- Its name in the activity ledger
    app.register_blueprint(Na__Accounts__Blueprint, url_prefix='/api/accounts')
    app.register_blueprint(Na__Activity__Blueprint, url_prefix='/api/activity')
    for bp in (aura_drawings_api, aura_handwriting_api, aura_scene_api):
        app.register_blueprint(bp)

    @app.errorhandler(404)
    def not_found(_e):
        return jsonify({'ok': False, 'error': 'no such API route'}), 404          # <-- JSON, never a page

    @app.errorhandler(405)
    def not_allowed(_e):
        return jsonify({'ok': False, 'error': 'method not allowed'}), 405

    @app.errorhandler(413)
    def too_large(_e):
        return jsonify({'ok': False, 'error': 'The drawing set is too large to save.'}), 413

    return app


app = create_app()


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=int(os.environ.get('VALE_PORT') or 8006), debug=False)
