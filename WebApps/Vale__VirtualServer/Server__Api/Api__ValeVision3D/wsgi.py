#!/usr/bin/env python3
# =============================================================================
# VALEVISION 3D - API ENTRY POINT (gunicorn wsgi:app)
# =============================================================================
#
# FILE       : wsgi.py
# MODULE     : Api__ValeVision3D
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : The Flask app behind https://app.valegardenhouses.com/valevision/api/
# CREATED    : 06-Oct-2026
#
# DESCRIPTION:
# - nginx proxies /valevision/api/ to 127.0.0.1:<VALE_PORT>/api/ (the port is the
#   route's ApiPort in the URL Configurator; systemd's vale@ValeVision3D binds it).
#   Locally, Server__DeveloperTools/ValeDev__LocalServer__.py mounts this app
#   under /valevision/api/ the same way, so the page's relative fetch('api/...')
#   reaches it on both.
# - One app, the blueprints beside this file, plus the shared sign-in routes
#   (Api__Shared/ValeShared__Accounts__.py at /api/accounts) and the activity
#   route (Api__Shared/ValeShared__Activity__.py at /api/activity).
# - Every important write goes into the shared activity ledger
#   (ValeVision3D__Api__Activity__.py: one hook, what each save changed).
#
# ENVIRONMENT (see Server__Api README / the skill's flask-services.md):
#   VALE_ROOT        the mirror root (/srv/vale)        VALE_SECRET_KEY   shared session key
#   VALE_ACCEL_REDIRECT=1  let nginx stream private files   VALE_DEV=1    local development only
#   MICROSOFT_* / ALLOWED_SEND_DOMAINS / RATE_LIMIT_MAX_PER_HOUR / VALE_EMAIL_BCC   (email)
#
# RUN LOCALLY (on its own):
#   set VALE_DEV=1 && python wsgi.py        ->  http://127.0.0.1:8002/api/health
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 09-Oct-2026 - Version 1.2.0
# - Page layouts: Create Drawing's saved layouts per job (ValeVision3D__Api__PageLayouts__.py).
#
# 08-Oct-2026 - Version 1.1.0
# - Activity ledger: /api/activity mounted; saves, publishes, statements, scrapbook,
#   dictionary and email recorded (ValeVision3D__Api__Activity__.py).
#
# 06-Oct-2026 - Version 1.0.0
# - First build for the VPS: projects, drawings, sheet images, published documents,
#   statements, scrapbook, spellings, email, sign-in.
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
from ValeVision3D__Api__Activity__ import Na__Vv3dActivity__Install               # noqa: E402
from ValeVision3D__Api__Email__ import valevision_email_api                       # noqa: E402
from ValeVision3D__Api__PageLayouts__ import valevision_page_layouts_api          # noqa: E402
from ValeVision3D__Api__Projects__ import valevision_projects_api                 # noqa: E402
from ValeVision3D__Api__Published__ import valevision_published_api               # noqa: E402
from ValeVision3D__Api__Scrapbook__ import valevision_scrapbook_api               # noqa: E402
from ValeVision3D__Api__SheetImages__ import valevision_sheet_images_api          # noqa: E402
from ValeVision3D__Api__Statements__ import valevision_statements_api             # noqa: E402
from ValeVision3D__Api__UserConfig__ import valevision_user_config_api            # noqa: E402


def create_app() -> Flask:
    app = Flask('ValeVision3D')
    app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024                          # <-- Cloudflare and nginx cap a request at 100 MB too
    app.config['JSON_SORT_KEYS'] = False
    app.json.sort_keys = False                                                    # <-- Keys stay in the order they were written
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)           # <-- Behind nginx: the real scheme (Secure cookies) and visitor IP

    app.register_blueprint(Na__Accounts__Blueprint, url_prefix='/api/accounts')
    app.register_blueprint(Na__Activity__Blueprint, url_prefix='/api/activity')
    Na__Vv3dActivity__Install(app)                                                # <-- Who saved what: the shared activity ledger
    for bp in (valevision_projects_api, valevision_published_api, valevision_scrapbook_api, valevision_sheet_images_api,
               valevision_statements_api, valevision_user_config_api, valevision_email_api, valevision_page_layouts_api):
        app.register_blueprint(bp)

    @app.errorhandler(404)
    def not_found(_e):
        return jsonify({'error': 'no such API route'}), 404                       # <-- JSON, never a page

    @app.errorhandler(405)
    def not_allowed(_e):
        return jsonify({'error': 'method not allowed'}), 405

    @app.errorhandler(413)
    def too_large(_e):
        return jsonify({'error': 'upload too large (100 MB at most)'}), 413

    return app


app = create_app()


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=int(os.environ.get('VALE_PORT') or 8002), debug=False)
