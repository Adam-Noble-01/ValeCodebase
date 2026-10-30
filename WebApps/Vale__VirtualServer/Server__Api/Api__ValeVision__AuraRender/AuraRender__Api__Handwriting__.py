#!/usr/bin/env python3
# =============================================================================
# VALEVISION AURA - API - HANDWRITING (ON THE USER'S MACHINE ONLY)
# =============================================================================
#
# FILE       : AuraRender__Api__Handwriting__.py
# MODULE     : AURA API Handwriting
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Write a note's words as handwritten strokes with the Vale
#              Handwriting Studio's engine, where that engine is: a PC running the
#              Vale dev server. On the server it says it is not there
# CREATED    : 30-Oct-2026
#
# DESCRIPTION:
# - NEVER ON THE SERVER (Adam, 30-Oct-2026: "the server is resource
#   constrained"). The engine needs torch; it is never installed on the VPS, and
#   its .py files never sync there. So on app.valegardenhouses.com status
#   answers available: false, and a note keeps its typed stand-in until it is
#   written on a PC; the written ink is saved with the drawing set and shows
#   everywhere. Next: the engine rewritten for WebAssembly, run in the browser
#   and kept on the device by AURA's service worker.
# - ON A PC: the worker (Vale__ValeVision__AuraRender/02__Src__AppModules/
#   31__System__Handwriting/01__Engine__PythonReference/
#   AuraRender__Handwriting__Worker__.py) runs in the engine's own Python
#   (AURA_HANDWRITING_PYTHON, else the studio's .venv), started on the first
#   note and kept open, one note at a time; it stops after 15 idle minutes.
#
# ROUTES:
#   GET  /api/handwriting/status     { available, reason, engine }       (Management)
#   POST /api/handwriting/write      { text, size, width, pen, neatness, variation, spacing, seed }
#                                    -> { ink: { paths: [{d, w}], inkWidth, height, lines, warnings, seconds } }
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 30-Oct-2026 - Version 1.0.0
# - Initial build.
#
# =============================================================================

# #region ---------------------------------------------------------------------
# REGION | Imports
# -----------------------------------------------------------------------------

import json
import os
import queue
import subprocess
import threading
import time

from flask import Blueprint, jsonify, request

import AuraRender__Api__Core__ as aura_core

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Configuration
# -----------------------------------------------------------------------------

aura_handwriting_api     = Blueprint('aura_handwriting_api', __name__)

ENGINE_DIR               = aura_core.APP_DIR / '02__Src__AppModules' / '31__System__Handwriting' / '01__Engine__PythonReference'
WORKER_FILE              = ENGINE_DIR / 'AuraRender__Handwriting__Worker__.py'
STUDIO_DIR               = aura_core.MIRROR_ROOT.parents[1] / 'Dev__EarlyStageDev__TestingFiles' / 'Experiment__HandwritingTest'
PYTHON_CANDIDATES        = (STUDIO_DIR / '.venv' / 'Scripts' / 'python.exe',     # <-- The studio's venv on Windows (torch 2.8.0+cpu, numpy)
                            STUDIO_DIR / '.venv' / 'bin' / 'python')
START_TIMEOUT_S          = 60                                                     # <-- Python and numpy coming up
WRITE_TIMEOUT_S          = 120                                                    # <-- The first note also loads torch and the model
IDLE_STOP_S              = 15 * 60
MAX_TEXT                 = 600
NOT_HERE                 = ('The handwriting engine runs on a PC with its own Python, never on the server. '
                            'Notes written there keep their ink in the drawing set and show here.')

_WORKER                  = {'proc': None, 'lines': None, 'engine': None, 'last': 0.0, 'next_id': 0, 'timer': None}
_LOCK                    = threading.Lock()

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | The Worker
# -----------------------------------------------------------------------------

def _interpreter():
    """The engine's Python: AURA_HANDWRITING_PYTHON, else the studio's venv, else None."""
    named = os.environ.get('AURA_HANDWRITING_PYTHON') or ''
    if named and os.path.isfile(named):
        return named
    return next((str(p) for p in PYTHON_CANDIDATES if p.is_file()), None)


def _availability():
    """(available, reason) without starting anything."""
    if not WORKER_FILE.is_file():
        return False, NOT_HERE                                                   # <-- The server: no .py files synced there
    if not _interpreter():
        return False, ('The handwriting engine is here but its Python is not: set AURA_HANDWRITING_PYTHON to a Python with torch '
                       '(the Vale Handwriting Studio\'s .venv has it).')
    return True, ''


def _reader(stream, lines):
    for line in iter(stream.readline, ''):
        lines.put(line)
    lines.put(None)                                                              # <-- The worker has gone


def _stop_worker():
    proc = _WORKER['proc']
    _WORKER.update(proc=None, lines=None, engine=None)
    if proc and proc.poll() is None:
        try:
            proc.stdin.close()
            proc.wait(timeout=5)
        except Exception:
            proc.kill()


def _idle_check():
    with _LOCK:
        if _WORKER['proc'] and time.time() - _WORKER['last'] >= IDLE_STOP_S:
            aura_core.log('[AURA API] handwriting worker idle: stopped')
            _stop_worker()
            return
    _arm_idle()


def _arm_idle():
    timer = threading.Timer(IDLE_STOP_S / 3, _idle_check)
    timer.daemon = True
    _WORKER['timer'] = timer
    timer.start()


def _ensure_worker():
    """The running worker (started if need be). Raises RuntimeError with a sentence a person can act on."""
    proc = _WORKER['proc']
    if proc and proc.poll() is None:
        return
    python = _interpreter()
    log_file = open(ENGINE_DIR / 'AuraRender__Handwriting__Worker.log', 'a', encoding='utf-8')   # <-- .log never syncs
    proc = subprocess.Popen([python, '-u', str(WORKER_FILE)], cwd=str(ENGINE_DIR), stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                            stderr=log_file, text=True, encoding='utf-8', bufsize=1,
                            creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    lines = queue.Queue()
    threading.Thread(target=_reader, args=(proc.stdout, lines), daemon=True).start()
    try:
        first = lines.get(timeout=START_TIMEOUT_S)
        hello = json.loads(first) if first else None
    except (queue.Empty, ValueError):
        hello = None
    if not hello or not hello.get('ready'):
        proc.kill()
        raise RuntimeError('The handwriting engine did not start: see AuraRender__Handwriting__Worker.log beside it.')
    _WORKER.update(proc=proc, lines=lines, engine=hello.get('engine'), last=time.time())
    if not _WORKER['timer']:
        _arm_idle()
    aura_core.log(f'[AURA API] handwriting worker started with {python}')


def _write(options):
    """One note through the worker: its result, or ValueError (the engine's words) / RuntimeError."""
    with _LOCK:
        _ensure_worker()
        _WORKER['next_id'] += 1
        msg_id = _WORKER['next_id']
        _WORKER['proc'].stdin.write(json.dumps({'id': msg_id, 'options': options}) + '\n')
        _WORKER['proc'].stdin.flush()
        deadline = time.time() + WRITE_TIMEOUT_S
        while True:
            try:
                line = _WORKER['lines'].get(timeout=max(0.1, deadline - time.time()))
            except queue.Empty:
                _stop_worker()
                raise RuntimeError('The handwriting engine took too long with this note and was stopped. Try a shorter note.')
            if line is None:
                _stop_worker()
                raise RuntimeError('The handwriting engine stopped: see AuraRender__Handwriting__Worker.log beside it.')
            reply = json.loads(line)
            if reply.get('id') != msg_id:
                continue                                                          # <-- A late answer to a note given up on
            _WORKER['last'] = time.time()
            if not reply.get('ok'):
                raise ValueError(reply.get('error') or 'The handwriting engine could not write this note.')
            return reply['result']

# endregion -------------------------------------------------------------------


# #region ---------------------------------------------------------------------
# REGION | Routes
# -----------------------------------------------------------------------------

@aura_handwriting_api.get('/api/handwriting/status')
@aura_core.require_access
def status():
    available, reason = _availability()
    return jsonify({'ok': True, 'available': available, 'reason': reason, 'engine': _WORKER['engine']})


@aura_handwriting_api.post('/api/handwriting/write')
@aura_core.require_access
def write():
    available, reason = _availability()
    if not available:
        return aura_core.fail(reason, 503, available=False)
    body = request.get_json(silent=True) or {}
    text = body.get('text')
    if not isinstance(text, str) or not text.strip() or len(text) > MAX_TEXT:
        return aura_core.fail(f'Write 1 to {MAX_TEXT} characters.', 400)
    options = {k: body[k] for k in ('text', 'size', 'width', 'pen', 'neatness', 'variation', 'spacing', 'seed') if k in body}
    try:
        ink = _write(options)
    except ValueError as error:
        return aura_core.fail(str(error), 422)
    except (RuntimeError, OSError) as error:
        aura_core.log(f'[AURA API] handwriting failed: {error}')
        return aura_core.fail(str(error), 500)
    return jsonify({'ok': True, 'ink': ink})

# endregion -------------------------------------------------------------------
