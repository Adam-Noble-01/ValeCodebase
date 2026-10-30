# AURA Handwriting Engine (Python Reference)

The Vale Handwriting Studio's engine, brought into AURA on 30-Oct-2026 at Adam's word: "locate a demo on my system
we did with a Python Library for creating realistic humanised handwriting and bring that into a system subfolder in
the aura app modules".

| Part | What it is |
|---|---|
| `Na__Handwriting__Engine__.py` | The studio's `engine.py` (revision 2026-10-02.2), unchanged but for where it finds the toolkit |
| `AuraRender__Handwriting__Worker__.py` | Runs the engine for the AURA API: one JSON line in, one out, kept open |
| `01__Vendor__PyTorchHandwritingSynthesis__899e9432/` | X-rayLaser/pytorch-handwriting-synthesis-toolkit at 899e9432 (MIT), unmodified, and its Epoch 46 checkpoint |

## Where It Runs

**On the user's own machine, never on the server** (Adam, 30-Oct-2026: "the server is resource constrained"):

- The Server Manager never pushes `.py`, `.md` or `.log` files of a web app, and AURA's sync mapping excludes `*.pt`,
  so none of this folder's working parts reach the VPS. On app.valegardenhouses.com, `api/handwriting/status` answers
  `available: false` and a note keeps a typed stand-in.
- On a PC running `Server__DeveloperTools/ValeDev__LocalServer__.py`, the AURA API starts the worker with the
  engine's Python: `AURA_HANDWRITING_PYTHON`, else the studio's `.venv`
  (`Dev__EarlyStageDev__TestingFiles/Experiment__HandwritingTest/.venv`, Python 3.12, torch 2.8.0+cpu, numpy 2.2.6).
  The first note loads the model (a few seconds); later notes take 0.5 to 2.5 s.
- Written ink is saved with the note in the drawing set, so a note written on a PC shows on the server.

## Next

The engine rewritten for WebAssembly (or the toolkit's ONNX export run by onnxruntime-web), served as static files
and kept on the device by AURA's service worker, as PainterlyNPR is heading for WebGPU and WebAssembly. The browser
client (`../Na__Handwriting__Client__.js`) is written so that only its `Write` call changes.

## Cautions (from the studio's README)

- The weights were trained on IAM-OnDB: an evaluation asset, not for redistribution. They are git-ignored here
  (`.gitignore`): copy `checkpoints/Epoch_46/model.pt` from the studio on a new machine.
- The model can misform or omit letters. Retries catch some; proofread before a drawing is issued.
- It writes `` !"#%'()+,-./0-9:;?A-Z[a-z`` and the studio's hand-drawn technical strokes (numbers, mm, x, degrees,
  diameter); anything else is refused with the engine's own message.
