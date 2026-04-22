## MobileSAM ONNX

- Model file target: `mobile_sam.onnx`
- Intended runtime: `onnxruntime` (CPU)
- License: follow upstream model license terms before redistribution
- Source URL: configured in `../download_models.py`
- Integrity: SHA256 is validated by `../download_models.py`

This folder is version-locked for PhotoMeasurePro segmentation inference wiring.
If the `.onnx` file is absent, the app server automatically falls back to heuristic segmentation.
