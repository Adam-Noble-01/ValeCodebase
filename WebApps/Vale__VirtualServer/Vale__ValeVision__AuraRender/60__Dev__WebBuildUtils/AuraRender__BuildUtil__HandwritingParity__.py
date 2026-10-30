#!/usr/bin/env python3
"""
=============================================================================
 VALEVISION AURA - BUILD UTIL | HANDWRITING PARITY: TORCH'S SIDE
=============================================================================

FILE       : AuraRender__BuildUtil__HandwritingParity__.py
AUTHOR     : Adam Noble - Noble Architecture
PURPOSE    : Run the toolkit's own network (PyTorch) step by step along a pen
             path, and write what it says at every step, so the WebAssembly
             engine can be checked against it number for number
CREATED    : 30-Oct-2026

DESCRIPTION:
- THE REFERENCE is the toolkit's models.py (01__Engine__PythonReference/
  01__Vendor__PyTorchHandwritingSynthesis__899e9432), loaded exactly as the
  studio's engine loads it, Epoch_46.
- THE PEN PATH is the model's own: one stochastic sample of each phrase (torch's
  draws), so the check walks the paths real handwriting takes. Then the network
  is run again along that path ("teacher forcing"), and each step's mixture
  (pi, mu, sd, ro, eos), window (phi) and kappa are written out.
- THE OTHER HALF (AuraRender__BuildUtil__HandwritingParity__.mjs) feeds the same
  path to both WebAssembly builds and compares.
- WRITES 21__Generated__HandwritingParity/HandwritingParity__Reference__.json
  beside this script (git-ignored).

USAGE (with the Vale Handwriting Studio's .venv, which has torch):
  <studio>\\.venv\\Scripts\\python.exe AuraRender__BuildUtil__HandwritingParity__.py
  then: node AuraRender__BuildUtil__HandwritingParity__.mjs

-----------------------------------------------------------------------------

DEVELOPMENT LOG:
30-Oct-2026 - Version 1.0.0
- Initial build (AURA 0.2.1).

=============================================================================
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


# -----------------------------------------------------------------------------
# REGION | Constants
# -----------------------------------------------------------------------------

NA__PARITY__HERE          = Path(__file__).resolve().parent
NA__PARITY__VENDOR        = (NA__PARITY__HERE.parent / '02__Src__AppModules' / '31__System__Handwriting'
                             / '01__Engine__PythonReference' / '01__Vendor__PyTorchHandwritingSynthesis__899e9432')
NA__PARITY__CHECKPOINT    = NA__PARITY__VENDOR / 'checkpoints' / 'Epoch_46'
NA__PARITY__OUT           = NA__PARITY__HERE / '21__Generated__HandwritingParity' / 'HandwritingParity__Reference__.json'
NA__PARITY__CASES         = [                                                    # <-- (words, bias, torch seed); the bias is the studio's neatness
    ('Painted timber frames', 1.1, 42),
    ('Oak porch, slate roof', 0.75, 7),
]

# endregion -------------------------------------------------------------------


# -----------------------------------------------------------------------------
# REGION | Reference
# -----------------------------------------------------------------------------

def Na__Parity__Case(model, charset, words, bias, seed):
    import torch
    text = words + '  '                                                         # <-- The studio's engine always adds two spaces
    codes = [charset.index(ch) + 1 for ch in text]
    context = torch.zeros(1, len(text), len(charset) + 1)
    for i, code in enumerate(codes):
        context[0, i, code] = 1
    model.mixture.bias = float(bias)
    with torch.inference_mode():
        torch.manual_seed(seed)
        path, _ = model.sample_means_with_attention(context, steps=1500, stochastic=True)

        x = model.get_initial_input().unsqueeze(0)
        w = model.get_initial_window(1)
        k = torch.zeros(1, model.gaussian_components)
        hidden1, hidden2, hidden3 = model.get_all_initial_states(1)
        steps = []
        for t in range(len(path)):
            x_with_w = torch.cat([x, w], dim=-1)
            h1, hidden1 = model.lstm1(x_with_w, hidden1)
            phi, k = model.window(h1, context, k)
            w = model.window.matmul_3d(phi, context)
            mixture, hidden2, hidden3 = model.compute_mixture(x, h1, w, hidden2, hidden3)
            pi, mu, sd, ro, eos = model.squeeze(mixture)
            steps.append({
                'pi': pi.tolist(), 'mu': mu.tolist(), 'sd': sd.tolist(), 'ro': ro.tolist(), 'eos': float(eos.reshape(-1)[0]),
                'phi': phi.reshape(-1).tolist(), 'kappa': k.reshape(-1).tolist(),
            })
            x = path[t].reshape(1, 1, 3)
    return {'words': words, 'codes': codes, 'bias': bias, 'seed': seed, 'path': path.tolist(), 'steps': steps}


def main():
    import os
    import torch
    NA__PARITY__OUT.parent.mkdir(parents=True, exist_ok=True)
    os.chdir(NA__PARITY__OUT.parent)                                            # <-- models.py opens errors.log where it runs: keep it in the generated folder
    sys.path.insert(0, str(NA__PARITY__VENDOR))
    from handwriting_synthesis.models import SynthesisNetwork

    torch.set_num_threads(1)
    meta = json.loads((NA__PARITY__CHECKPOINT / 'meta.json').read_text(encoding='utf-8'))
    charset = meta['charset']
    model = SynthesisNetwork.get_default_model(len(charset) + 1, torch.device('cpu'), bias=1.0)
    model.load_state_dict(torch.load(NA__PARITY__CHECKPOINT / 'model.pt', map_location='cpu', weights_only=True))
    model.eval()

    cases = [Na__Parity__Case(model, charset, *case) for case in NA__PARITY__CASES]
    NA__PARITY__OUT.parent.mkdir(parents=True, exist_ok=True)
    NA__PARITY__OUT.write_text(json.dumps({'charset': charset, 'cases': cases}), encoding='utf-8')
    for case in cases:
        print(f'{case["words"]!r}: {len(case["steps"])} steps at bias {case["bias"]}')
    print(f'wrote {NA__PARITY__OUT}')
    return 0


if __name__ == '__main__':
    sys.exit(main())

# endregion -------------------------------------------------------------------
