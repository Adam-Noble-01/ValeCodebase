## Depth Anything V2 (Small) ONNX

- Model file target: `depth_anything_v2_vits.onnx`
- Intended runtime: `onnxruntime` (CPU)
- License: follow upstream model license terms before redistribution
- Source URL: configured in `../download_models.py`
- Integrity: SHA256 is validated by `../download_models.py`

This folder is version-locked for PhotoMeasurePro depth inference wiring.
If the `.onnx` file is absent, the app server automatically falls back to the heuristic depth pipeline.
