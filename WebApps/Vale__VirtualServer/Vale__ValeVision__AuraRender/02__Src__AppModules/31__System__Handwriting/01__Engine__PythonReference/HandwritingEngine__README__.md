# AURA Handwriting Engine (Python Reference)

The Vale Handwriting Studio's engine, brought into AURA on 30-Oct-2026 at Adam's word: "locate a demo on my system
we did with a Python Library for creating realistic humanised handwriting and bring that into a system subfolder in
the aura app modules". **Since AURA 0.2.1 it is the reference only**: the engine AURA runs is its WebAssembly port in
`../02__Engine__Wasm` (Adam, 30-Oct-2026: "Refactor the Handwriting tool from python to WASM").

| Part | What it is |
|---|---|
| `Na__Handwriting__Engine__.py` | The studio's `engine.py` (revision 2026-10-02.2), unchanged but for where it finds the toolkit: what the port's note layout (`Na__HandwritingEngine__Layout__.js`) and neural pen (`Na__HandwritingEngine__Neural__.js`) were ported from, line by line |
| `01__Vendor__PyTorchHandwritingSynthesis__899e9432/` | X-rayLaser/pytorch-handwriting-synthesis-toolkit at 899e9432 (MIT), unmodified, and its Epoch 46 checkpoint: the network the WebAssembly (`Na__HandwritingEngine__Network__.ts`) is checked against |

## What It Is Used For Now

- **The weights**: `60__Dev__WebBuildUtils/AuraRender__BuildUtil__HandwritingWeights__.py` reads
  `checkpoints/Epoch_46/model.pt` and writes the 32-bit weights the browser's engine reads (into
  `Server__Api/Api__ValeVision__AuraRender/Content__AuraHandwritingModel`).
- **The parity check**: `60__Dev__WebBuildUtils/AuraRender__BuildUtil__HandwritingParity__.py` runs this toolkit's
  network step by step along a pen path, and `...Parity__.mjs` proves the WebAssembly gives the same mixture, window
  and kappa at every step (within 2e-5 on 30-Oct-2026), and that its SIMD and scalar builds agree to the bit.
- Both need a Python with torch: the studio's `.venv`
  (`Dev__EarlyStageDev__TestingFiles/Experiment__HandwritingTest/.venv`, Python 3.12, torch 2.8.0+cpu).

**Nothing runs it in AURA any more.** The worker that let the AURA API start it on a PC
(`AuraRender__Handwriting__Worker__.py`) was retired with the API's `handwriting/status` and `handwriting/write`
routes (git history keeps it, 0f15deaf). Its `.py` files never reach the server anyway (the Server Manager's web
excludes), and `*.pt` is excluded from the `aura` mapping.

## Cautions (from the studio's README)

- The weights were trained on IAM-OnDB: an evaluation asset, not for redistribution. They are git-ignored here
  (`.gitignore`): copy `checkpoints/Epoch_46/model.pt` from the studio on a new machine. The converted weights are
  served only to signed-in Managers and App Admins (Adam, 30-Oct-2026: "Signed-in only").
- The model can misform or omit letters. Retries catch some; proofread before a drawing is issued.
- It writes `` !"#%'()+,-./0-9:;?A-Z[a-z`` and the studio's hand-drawn technical strokes (numbers, mm, x, degrees,
  diameter); anything else is refused with the engine's own message.
