#!/usr/bin/env python3
"""
=============================================================================
 VALEVISION AURA - HANDWRITING - THE WORKER (ONE PEN, KEPT OPEN)
=============================================================================

FILE       : AuraRender__Handwriting__Worker__.py
AUTHOR     : Adam Noble - Noble Architecture
PURPOSE    : Run the handwriting engine in its own Python (the one with torch),
             one note at a time, for the AURA API: one JSON line in, one out
CREATED    : 30-Oct-2026

DESCRIPTION:
- STARTED BY THE AURA API (Server__Api/Api__ValeVision__AuraRender/
  AuraRender__Api__Handwriting__.py) with the engine's interpreter: the Vale
  Handwriting Studio's .venv, or AURA_HANDWRITING_PYTHON. The API's own Python
  needs no torch, and the model loads once, on the first note, then stays.
- ON THE USER'S MACHINE ONLY: .py files never sync to the server (the Server
  Manager's web excludes), so on app.valegardenhouses.com this worker is never
  there to start (Adam, 30-Oct-2026: the server is resource constrained).
- PROTOCOL: on start it prints {"ready": true, "engine": {...}}. Then each line
  in is {"id": n, "options": {text, size, width, pen, neatness, variation,
  spacing, seed}}; each line out is {"id": n, "ok": true, "result": {paths:
  [{d, w}], width, inkWidth, height, lines, warnings, seconds}} or {"id": n,
  "ok": false, "error": "..."}. Paths are millimetres from the note's top left.

-----------------------------------------------------------------------------

DEVELOPMENT LOG:
30-Oct-2026 - Version 1.0.0
- Initial build.

=============================================================================
"""

import json
import re
import sys
import traceback
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import Na__Handwriting__Engine__ as engine                                       # noqa: E402  (numpy now; torch on the first note)

PATH_PATTERN = re.compile(r'<path d="([^"]+)" stroke-width="([0-9.]+)"/>')
ALLOWED      = ('text', 'size', 'width', 'pen', 'neatness', 'variation', 'spacing', 'seed')


def Na__Worker__Write(options):
    """One note: the engine's own validation and render, its SVG paths as data."""
    clean = {k: options[k] for k in ALLOWED if k in options}
    clean.update(engine='neural', color='#000000', protect_numbers=True)         # <-- The colour is AURA's to apply
    result = engine.render(engine.validate(clean))
    return {
        'paths'    : [{'d': d, 'w': float(w)} for d, w in PATH_PATTERN.findall(result['svg'])],
        'width'    : result['width'],
        'inkWidth' : result['ink_width'],
        'height'   : result['height'],
        'lines'    : result['lines'],
        'warnings' : result['warnings'],
        'seconds'  : result['seconds'],
    }


def main():
    sys.stdout.write(json.dumps({'ready': True, 'engine': {'name': 'Graves / PyTorch (the Vale Handwriting Studio)', 'checkpoint': 'Epoch_46',
                                                           'commit': '899e9432', 'charset': engine.CHARSET}}) + '\n')
    sys.stdout.flush()
    for line in sys.stdin:
        line = line.lstrip('﻿').strip()                                     # <-- A shell's pipe may lead with a byte order mark
        if not line:
            continue
        reply = {'id': None, 'ok': False}
        try:
            message = json.loads(line)
            reply['id'] = message.get('id')
            reply['result'] = Na__Worker__Write(dict(message.get('options') or {}))
            reply['ok'] = True
        except ValueError as error:                                              # <-- The engine's own words for what it cannot write
            reply['error'] = str(error)
        except Exception:
            traceback.print_exc(file=sys.stderr)
            reply['error'] = 'The handwriting engine failed on this note; its log has the detail.'
        sys.stdout.write(json.dumps(reply) + '\n')
        sys.stdout.flush()


if __name__ == '__main__':
    main()
