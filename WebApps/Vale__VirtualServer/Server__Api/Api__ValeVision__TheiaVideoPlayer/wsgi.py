#!/usr/bin/env python3
# =============================================================================
# VALEVISION THEIA - API ENTRY POINT (gunicorn wsgi:app)
# =============================================================================
#
# FILE       : wsgi.py
# MODULE     : Api__ValeVision__TheiaVideoPlayer
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : The Flask app behind https://app.valegardenhouses.com/theia/api/ -
#              Vale's own video library: lists, titles, client links, and the
#              chunked uploads ValeVision 3D publishes through
# CREATED    : 07-Oct-2026
#
# DESCRIPTION:
# - nginx proxies /theia/api/ to 127.0.0.1:<VALE_PORT>/api/ (the theia route's
#   ApiPort in the URL Configurator: 8005; systemd's vale@ValeVision__TheiaVideoPlayer
#   binds it). Locally, Server__DeveloperTools/ValeDev__LocalServer__.py mounts it
#   under /theia/api/ the same way.
# - THE VIDEOS THEMSELVES ARE NOT SERVED HERE: nginx serves the library's
#   Content__VideoFiles straight from disk, with byte ranges. This API only
#   says which files exist, who may see them, and takes new ones in.
# - ValeVision 3D's page (/valevision/) calls this API directly - same site,
#   same session cookie - to publish videos and keep titles in step.
# - The shared sign-in is mounted at /api/accounts (ValeShared__Accounts__).
#
# ENVIRONMENT (see the skill's flask-services.md):
#   VALE_ROOT         the mirror root (/srv/vale)          VALE_SECRET_KEY   the shared session key
#   VALE_PORT         8005 on the server                    VALE_DEV=1        local development only
#
# RUN LOCALLY (on its own):
#   set VALE_DEV=1 && python wsgi.py        ->  http://127.0.0.1:8005/api/health
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 07-Oct-2026 - Version 1.0.0
# - First build: videos (per audience), titles and order kept in step with
#   ValeVision 3D, client share links, chunked resumable uploads, publish.
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
from TheiaVideoPlayer__Api__ShareLinks__ import theia_shares_api                  # noqa: E402
from TheiaVideoPlayer__Api__Uploads__ import theia_uploads_api                    # noqa: E402
from TheiaVideoPlayer__Api__Videos__ import theia_videos_api                      # noqa: E402


def create_app() -> Flask:
    app = Flask('ValeVisionTheia')
    app.config['MAX_CONTENT_LENGTH'] = 66 * 1024 * 1024                           # <-- A 64 MB chunk or head, and its headers; Cloudflare allows 100 MB
    app.json.sort_keys = False                                                    # <-- Keys stay in the order they were written
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)           # <-- Behind nginx: the real scheme (Secure cookies) and visitor IP

    app.register_blueprint(Na__Accounts__Blueprint, url_prefix='/api/accounts')
    for bp in (theia_videos_api, theia_uploads_api, theia_shares_api):
        app.register_blueprint(bp)

    @app.errorhandler(404)
    def not_found(_e):
        return jsonify({'ok': False, 'error': 'no such API route'}), 404          # <-- JSON, never a page

    @app.errorhandler(405)
    def not_allowed(_e):
        return jsonify({'ok': False, 'error': 'method not allowed'}), 405

    @app.errorhandler(413)
    def too_large(_e):
        return jsonify({'ok': False, 'error': 'request too large (send the file in chunks of 64 MB or less)'}), 413

    return app


app = create_app()


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=int(os.environ.get('VALE_PORT') or 8005), debug=False)
