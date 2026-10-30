#!/usr/bin/env python3
"""
=============================================================================
 VALEVISION AURA - BUILD UTIL | THE HANDWRITING MODEL'S WEIGHTS FOR THE BROWSER
=============================================================================

FILE       : AuraRender__BuildUtil__HandwritingWeights__.py
AUTHOR     : Adam Noble - Noble Architecture
PURPOSE    : Turn the handwriting model's PyTorch checkpoint into the one flat
             file of 32-bit floats the WebAssembly engine reads, laid out in the
             order it runs, with a manifest that says what it is and its SHA-256
CREATED    : 30-Oct-2026

DESCRIPTION:
- THE MODEL is the Vale Handwriting Studio's: X-rayLaser/pytorch-handwriting-
  synthesis-toolkit at 899e9432 (MIT), checkpoint Epoch_46, a Graves synthesis
  network (three peephole LSTMs of 400, a soft window of 10 Gaussians over the
  words, a mixture of 20 bivariate Gaussians for the pen). Its checkpoint sits in
  02__Src__AppModules/31__System__Handwriting/01__Engine__PythonReference/
  01__Vendor__PyTorchHandwritingSynthesis__899e9432/checkpoints/Epoch_46.
- 32-BIT, THE CHECKPOINT'S OWN NUMBERS (Adam, 30-Oct-2026: "32-bit, 15 MB"),
  little-endian, in the order the engine's network runs (its layout is in
  31__System__Handwriting/02__Engine__Wasm/Na__HandwritingEngine__Network__.ts):
    1. lstm1: W_xh (483 x 1600, rows [x, window, h1]), then W_ci, b_i, W_cf,
       b_f, b_c, W_co, b_o (400 each)
    2. the window: alpha, beta, k weights TRANSPOSED to 400 x 32 (columns
       alpha 0-9, beta 10-19, k 20-29, two zero columns), then their 32 biases
    3. lstm2 and 4. lstm3: W_xh (883 x 1600, rows [x, h below, window, h]),
       then the same seven vectors
    5. the mixture: pi, mu, sd, ro, eos weights TRANSPOSED to 1200 x 128
       (columns pi 0-19, mu 20-59, sd 60-99, ro 100-119, eos 120, seven zero
       columns), then their 128 biases
  Transposed and padded so every matrix is multiplied row by row in blocks of
  16 floats (four SIMD lanes, four registers): the engine sums each output in
  the same order with SIMD or without, so both builds write the same strokes.
- WHERE IT GOES: Server__Api/Api__ValeVision__AuraRender/Content__AuraHandwritingModel/
  (never web-served; pushed by the Server Manager's server-api mapping) as
      AuraRender__HandwritingModel__Epoch46__Weights__.bin
      AuraRender__HandwritingModel__Epoch46__Manifest__.json
  The AURA API sends both to signed-in Managers and App Admins only (Adam,
  30-Oct-2026: "Signed-in only"); the weights were trained on IAM-OnDB, an
  evaluation asset, so the .bin is git-ignored (ValeCodebase is public).

USAGE (with a Python that has torch: the Vale Handwriting Studio's .venv):
  <studio>\\.venv\\Scripts\\python.exe AuraRender__BuildUtil__HandwritingWeights__.py
                                       write the weights and the manifest
  ... AuraRender__BuildUtil__HandwritingWeights__.py --check
                                       rebuild in memory and compare with the files (writes nothing)

REQUIRES:
- Python 3.9 or later with torch (CPU): the studio's .venv has torch 2.8.0+cpu.

-----------------------------------------------------------------------------

DEVELOPMENT LOG:
30-Oct-2026 - Version 1.0.0
- Initial build: Epoch_46 into 3,773,360 floats (15,093,440 bytes).

=============================================================================
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path


# -----------------------------------------------------------------------------
# REGION | Constants
# -----------------------------------------------------------------------------

NA__WEIGHTS__AURA_ROOT        = Path(__file__).resolve().parents[1]                          # <-- Vale__ValeVision__AuraRender
NA__WEIGHTS__VENDOR           = (NA__WEIGHTS__AURA_ROOT / '02__Src__AppModules' / '31__System__Handwriting'
                                 / '01__Engine__PythonReference' / '01__Vendor__PyTorchHandwritingSynthesis__899e9432')
NA__WEIGHTS__CHECKPOINT       = 'Epoch_46'
NA__WEIGHTS__COMMIT           = '899e9432dfe0998ba2ef31582d11c2d5f24a5185'
NA__WEIGHTS__OUT_DIR          = NA__WEIGHTS__AURA_ROOT.parent / 'Server__Api' / 'Api__ValeVision__AuraRender' / 'Content__AuraHandwritingModel'
NA__WEIGHTS__BIN_NAME         = 'AuraRender__HandwritingModel__Epoch46__Weights__.bin'
NA__WEIGHTS__MANIFEST_NAME    = 'AuraRender__HandwritingModel__Epoch46__Manifest__.json'
NA__WEIGHTS__FORMAT           = 'Na__HandwritingModel__Graves__f32le__1'                      # <-- The engine refuses any other (Na__Network__FORMAT)

NA__WEIGHTS__INPUT            = 3                                                             # <-- dx, dy, pen up
NA__WEIGHTS__HIDDEN           = 400
NA__WEIGHTS__GATES            = 4 * NA__WEIGHTS__HIDDEN                                       # <-- input, forget, cell, output
NA__WEIGHTS__WINDOW_K         = 10
NA__WEIGHTS__WINDOW_OUT       = 32                                                            # <-- 30 used, padded to two blocks of 16
NA__WEIGHTS__MIXTURES         = 20
NA__WEIGHTS__MIXTURE_OUT      = 128                                                           # <-- 121 used, padded to eight blocks of 16
NA__WEIGHTS__VECTORS          = ('W_ci', 'b_i', 'W_cf', 'b_f', 'b_c', 'W_co', 'b_o')          # <-- An LSTM's peepholes and biases, in this order
NA__WEIGHTS__RIGHTS_NOTE      = ('Trained by the toolkit\'s author on IAM-OnDB: an evaluation asset (the Vale Handwriting Studio\'s README). '
                                 'Served only to signed-in Vale Managers and App Admins through the AURA API; never committed to git '
                                 '(ValeCodebase is public) and never placed where nginx serves files.')

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | The Layout
# -----------------------------------------------------------------------------

def Na__Weights__Blocks(state, alphabet):
    """[(name, 2-D or 1-D float32 tensor)] in the engine's order, transposed and padded."""
    import torch

    def lstm(prefix, rows):
        w = state[f'{prefix}.W_xh']
        if tuple(w.shape) != (rows, NA__WEIGHTS__GATES):
            raise SystemExit(f'{prefix}.W_xh is {tuple(w.shape)}, expected ({rows}, {NA__WEIGHTS__GATES})')
        return [(f'{prefix}.W_xh', w)] + [(f'{prefix}.{v}', state[f'{prefix}.{v}']) for v in NA__WEIGHTS__VECTORS]

    def stacked(parts, inputs, width):
        """Linear layers' weights (out x in each) side by side as one in x width matrix, and their biases."""
        weight = torch.zeros(inputs, width, dtype=torch.float32)
        bias = torch.zeros(width, dtype=torch.float32)
        column = 0
        for name in parts:
            w, b = state[f'{name}.weight'], state[f'{name}.bias']
            n = w.shape[0]
            weight[:, column:column + n] = w.t()
            bias[column:column + n] = b
            column += n
        return weight, bias, column

    h = NA__WEIGHTS__HIDDEN
    blocks = lstm('lstm1', NA__WEIGHTS__INPUT + alphabet + h)

    win_w, win_b, used = stacked(('window.alpha', 'window.beta', 'window.k'), h, NA__WEIGHTS__WINDOW_OUT)
    if used != 3 * NA__WEIGHTS__WINDOW_K:
        raise SystemExit(f'the window has {used} outputs, expected {3 * NA__WEIGHTS__WINDOW_K}')
    blocks += [('window.W', win_w), ('window.b', win_b)]

    blocks += lstm('lstm2', NA__WEIGHTS__INPUT + h + alphabet + h)
    blocks += lstm('lstm3', NA__WEIGHTS__INPUT + h + alphabet + h)

    mix_w, mix_b, used = stacked(('mixture.pi', 'mixture.mu', 'mixture.sd', 'mixture.ro', 'mixture.eos'), 3 * h, NA__WEIGHTS__MIXTURE_OUT)
    if used != 6 * NA__WEIGHTS__MIXTURES + 1:
        raise SystemExit(f'the mixture has {used} outputs, expected {6 * NA__WEIGHTS__MIXTURES + 1}')
    blocks += [('mixture.W', mix_w), ('mixture.b', mix_b)]

    known = {k for k in state}
    taken = {f'{p}.{v}' for p in ('lstm1', 'lstm2', 'lstm3') for v in NA__WEIGHTS__VECTORS + ('W_xh',)}
    taken |= {f'{n}.{t}' for n in ('window.alpha', 'window.beta', 'window.k', 'mixture.pi', 'mixture.mu', 'mixture.sd',
                                    'mixture.ro', 'mixture.eos') for t in ('weight', 'bias')}
    if known != taken:
        raise SystemExit(f'the checkpoint has tensors this layout does not know: {sorted(known ^ taken)}')
    return blocks


def Na__Weights__Build(source):
    """(bytes, manifest) for a checkpoint folder."""
    import torch

    meta = json.loads((source / 'meta.json').read_text(encoding='utf-8'))
    alphabet = len(meta['charset']) + 1                                                     # <-- Index 0 is never a character (the toolkit's tokenizer)
    state = torch.load(source / 'model.pt', map_location='cpu', weights_only=True)
    layout, chunks, offset = [], [], 0
    for name, tensor in Na__Weights__Blocks(state, alphabet):
        t = tensor.detach().to(torch.float32).contiguous()
        layout.append({'Name': name, 'Offset': offset, 'Shape': list(t.shape)})
        chunks.append(t.reshape(-1).numpy().astype('<f4').tobytes())
        offset += t.numel()
    blob = b''.join(chunks)
    manifest = {
        'HandwritingModel__Format'       : NA__WEIGHTS__FORMAT,
        'HandwritingModel__Name'         : 'Graves handwriting synthesis (X-rayLaser/pytorch-handwriting-synthesis-toolkit)',
        'HandwritingModel__Checkpoint'   : NA__WEIGHTS__CHECKPOINT,
        'HandwritingModel__Commit'       : NA__WEIGHTS__COMMIT,
        'HandwritingModel__SourceSha256' : hashlib.sha256((source / 'model.pt').read_bytes()).hexdigest(),
        'HandwritingModel__File'         : NA__WEIGHTS__BIN_NAME,
        'HandwritingModel__Floats'       : offset,
        'HandwritingModel__Bytes'        : len(blob),
        'HandwritingModel__Sha256'       : hashlib.sha256(blob).hexdigest(),
        'HandwritingModel__Charset'      : meta['charset'],
        'HandwritingModel__Mu'           : meta['mu'],
        'HandwritingModel__Std'          : meta['std'],
        'HandwritingModel__Shape'        : {'Input': NA__WEIGHTS__INPUT, 'Hidden': NA__WEIGHTS__HIDDEN, 'Alphabet': alphabet,
                                            'WindowGaussians': NA__WEIGHTS__WINDOW_K, 'WindowOut': NA__WEIGHTS__WINDOW_OUT,
                                            'Mixtures': NA__WEIGHTS__MIXTURES, 'MixtureOut': NA__WEIGHTS__MIXTURE_OUT},
        'HandwritingModel__Layout'       : layout,
        'HandwritingModel__RightsNote'   : NA__WEIGHTS__RIGHTS_NOTE,
        'HandwritingModel__Built'        : datetime.now(timezone.utc).strftime('%d-%b-%Y %H:%M UTC'),
        'HandwritingModel__BuiltBy'      : 'Vale__ValeVision__AuraRender/60__Dev__WebBuildUtils/AuraRender__BuildUtil__HandwritingWeights__.py',
    }
    return blob, manifest

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Main
# -----------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description='The handwriting model for AURA\'s WebAssembly engine.')
    parser.add_argument('--check', action='store_true', help='compare with the files already written (writes nothing)')
    parser.add_argument('--source', type=Path, default=NA__WEIGHTS__VENDOR / 'checkpoints' / NA__WEIGHTS__CHECKPOINT)
    parser.add_argument('--out', type=Path, default=NA__WEIGHTS__OUT_DIR)
    args = parser.parse_args()

    blob, manifest = Na__Weights__Build(args.source)
    bin_path, manifest_path = args.out / NA__WEIGHTS__BIN_NAME, args.out / NA__WEIGHTS__MANIFEST_NAME
    print(f'{manifest["HandwritingModel__Floats"]:,} floats, {len(blob):,} bytes, sha256 {manifest["HandwritingModel__Sha256"]}')

    if args.check:
        ok = bin_path.is_file() and hashlib.sha256(bin_path.read_bytes()).hexdigest() == manifest['HandwritingModel__Sha256']
        written = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.is_file() else {}
        ok = ok and written.get('HandwritingModel__Sha256') == manifest['HandwritingModel__Sha256']
        print('check: the files match the checkpoint' if ok else 'check: MISMATCH - run without --check to rebuild')
        return 0 if ok else 1

    args.out.mkdir(parents=True, exist_ok=True)
    temp = bin_path.with_suffix('.bin.tmp')
    temp.write_bytes(blob)
    temp.replace(bin_path)
    manifest_path.write_text(json.dumps(manifest, indent=4, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'wrote {bin_path}')
    print(f'wrote {manifest_path}')
    return 0


if __name__ == '__main__':
    sys.exit(main())

# endregion -------------------------------------------------------------------
