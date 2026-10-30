#!/usr/bin/env python3
# =============================================================================
# VALEVISION AURA - API - HANDWRITING (THE MODEL, FOR THE BROWSER'S ENGINE)
# =============================================================================
#
# FILE       : AuraRender__Api__Handwriting__.py
# MODULE     : AURA API Handwriting
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Hand the handwriting model to the browser's WebAssembly engine,
#              for signed-in Managers and App Admins only: its manifest, then
#              its weights, once per device
# CREATED    : 30-Oct-2026
#
# DESCRIPTION:
# - THE ENGINE RUNS IN THE BROWSER (Vale__ValeVision__AuraRender/02__Src__AppModules/
#   31__System__Handwriting/02__Engine__Wasm: the Vale Handwriting Studio's Graves
#   model in WebAssembly, in a Web Worker). Nothing is computed here (Adam,
#   30-Oct-2026: "the server is resource constrained"): this module only sends
#   two files, and the worker keeps the weights in the device's own cache, so a
#   device asks for them once.
# - THE MODEL lives beside this file in Content__AuraHandwritingModel/ (never
#   web-served: nginx denies Server__ paths), written by Vale__ValeVision__AuraRender/
#   60__Dev__WebBuildUtils/AuraRender__BuildUtil__HandwritingWeights__.py:
#     AuraRender__HandwritingModel__Epoch46__Manifest__.json   layout, charset, size, SHA-256
#     AuraRender__HandwritingModel__Epoch46__Weights__.bin      15 MB of 32-bit weights (git-ignored)
# - SIGNED-IN ONLY (Adam, 30-Oct-2026: "Signed-in only"): the weights were trained
#   on IAM-OnDB, an evaluation asset, so both routes need AURA's own level
#   (require_access: Management and AppAdmin today), as every AURA route does.
# - THE WEIGHTS' URL CARRIES THEIR SHA-256, so a new model is a new URL and the
#   old copy is never served under it. On the server nginx streams the file
#   (X-Accel-Redirect to its internal location, when VALE_ACCEL_REDIRECT=1 is in
#   the service's env, as ValeVision 3D's API does); otherwise Flask sends it.
#
# ROUTES:
#   GET  /api/handwriting/model                 { available, reason, model: <manifest>, weights: 'handwriting/weights/<sha256>' }
#   GET  /api/handwriting/weights/<sha256>      the weights (application/octet-stream)
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 30-Oct-2026 - Version 2.0.0
# - The engine moved into the browser (AURA 0.2.1): the PC-only Python worker,
#   its status and write routes are retired; the model and weights routes hand
#   the model to the WebAssembly engine.
#
# 30-Oct-2026 - Version 1.0.0
# - Initial build: the Python worker on a PC.
#
# =============================================================================

# #region ---------------------------------------------------------------------
# REGION | Imports
# -----------------------------------------------------------------------------

import hashlib
import json
import os
import re
import threading
from pathlib import Path

from flask import Blueprint, jsonify, send_file

import AuraRender__Api__Core__ as aura_core

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Configuration
# -----------------------------------------------------------------------------

aura_handwriting_api     = Blueprint('aura_handwriting_api', __name__)

MODEL_DIR                = Path(__file__).resolve().parent / 'Content__AuraHandwritingModel'
MANIFEST_FILE            = MODEL_DIR / 'AuraRender__HandwritingModel__Epoch46__Manifest__.json'
ACCEL_PREFIX             = '/_internal/'                                          # <-- nginx's internal location (alias of the server root)
SHA_PATTERN              = re.compile(r'^[0-9a-f]{64}$')
NOT_HERE                 = ('The handwriting model is not on this server yet. It is built on a PC by '
                            '60__Dev__WebBuildUtils/AuraRender__BuildUtil__HandwritingWeights__.py and pushed with the API.')

_CHECKED                 = {'key': None, 'manifest': None, 'reason': NOT_HERE}     # <-- The manifest, checked against its weights once per change
_LOCK                    = threading.Lock()

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | The Model
# -----------------------------------------------------------------------------

def _model():
    """(manifest, '') when the manifest and its weights are here and agree, else (None, reason)."""
    try:
        m_stat = MANIFEST_FILE.stat()
        manifest = json.loads(MANIFEST_FILE.read_text(encoding='utf-8'))
        name = str(manifest.get('HandwritingModel__File') or '')
        if not name or Path(name).name != name:
            return None, 'The handwriting model\'s manifest names no weights file.'
        weights = MODEL_DIR / name
        w_stat = weights.stat()
    except FileNotFoundError:
        return None, NOT_HERE
    except (OSError, ValueError) as error:
        aura_core.log(f'[AURA API] handwriting model unreadable: {error}')
        return None, 'The handwriting model on this server cannot be read.'

    key = (m_stat.st_mtime_ns, m_stat.st_size, w_stat.st_mtime_ns, w_stat.st_size)
    with _LOCK:
        if _CHECKED['key'] != key:                                               # <-- Hash the 15 MB once per change, never per request
            digest = hashlib.sha256()
            with open(weights, 'rb') as fh:
                for block in iter(lambda: fh.read(1 << 20), b''):
                    digest.update(block)
            ok = (w_stat.st_size == manifest.get('HandwritingModel__Bytes')
                  and digest.hexdigest() == manifest.get('HandwritingModel__Sha256'))
            _CHECKED.update(key=key, manifest=manifest if ok else None,
                            reason='' if ok else 'The handwriting model\'s weights do not match its manifest: rebuild and push them.')
            if not ok:
                aura_core.log('[AURA API] handwriting weights do not match their manifest')
        return _CHECKED['manifest'], _CHECKED['reason']

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Routes
# -----------------------------------------------------------------------------

@aura_handwriting_api.get('/api/handwriting/model')
@aura_core.require_access
def model():
    manifest, reason = _model()
    if not manifest:
        return jsonify({'ok': True, 'available': False, 'reason': reason})
    return jsonify({'ok': True, 'available': True, 'reason': '', 'model': manifest,
                    'weights': f'handwriting/weights/{manifest["HandwritingModel__Sha256"]}'})


@aura_handwriting_api.get('/api/handwriting/weights/<sha>')
@aura_core.require_access
def weights(sha):
    manifest, reason = _model()
    if not manifest:
        return aura_core.fail(reason, 404)
    if not SHA_PATTERN.match(sha) or sha != manifest['HandwritingModel__Sha256']:
        return aura_core.fail('That handwriting model is not on this server any more: reload AURA.', 404)
    path = MODEL_DIR / manifest['HandwritingModel__File']
    if os.environ.get('VALE_ACCEL_REDIRECT') == '1':                              # <-- nginx streams it; no 15 MB through Python
        response = jsonify({})
        response.headers['X-Accel-Redirect'] = ACCEL_PREFIX + path.relative_to(aura_core.MIRROR_ROOT).as_posix()
        response.headers['Content-Type'] = 'application/octet-stream'
    else:
        response = send_file(path, mimetype='application/octet-stream', conditional=True, etag=sha, max_age=0)
    response.headers['Cache-Control'] = 'private, max-age=31536000, immutable'   # <-- The URL is the hash: it never changes under it
    return response

# endregion -------------------------------------------------------------------
