# TrueVision -> ValeVision Parity Audit - Evidence (01-Oct-2026)

Supporting material for `../ValeVision__AUDIT__TrueVisionParity__DrawingSystems__.md`. Compared TrueVision3D v2.172.0 (NaWeb HEAD b2aa9151) with ValeVision3D v2.71.0 (ValeCodebase HEAD 7b4e593a). 18 survey agents, each checked by an adversarial verifier; then K1 (decisions), K2 (target maps), K3 (work packages); Sections A-F written, critiqued, revised and harmonised. `parity/` keeps the working layout, so every `parity/...` path in the report resolves here.

- `parity/slices/` - the 18 verified slice reports (each ends with its verifier's `## Verification`).
- `parity/data/` - canonical JSON; query with `python parity/data/q.py --help`.
- `parity/report/` - K1-K3, the R0-R6 sources, HARMONISATION_LOG.md and `tools/`.
- `parity/ref/` - per-file drift, file trees, devlog / ledger indices, PORT NOTE marker greps.
