#!/usr/bin/env python3
"""
PhotoMeasurePro model downloader for version-locked ONNX dependencies.

Safe to re-run:
- skips files with matching SHA256
- re-downloads only if missing or hash mismatch
"""

from __future__ import annotations

import hashlib
import os
import sys
import urllib.request
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent

MODEL_SPECS = [
    {
        "name": "DepthAnythingV2__Small",
        "url": "https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main/onnx/model.onnx",
        "relative_path": Path("00__DepthAnythingV2__Small__Onnx") / "depth_anything_v2_vits.onnx",
        "sha256": "afb6a5c28f3b6bf1618c6e43f02073ef9dfdc70e937502d51603e57b0a1df10c",
        "required": True,
    },
    # MobileSAM is deferred. Depth-driven volume detection does not need it.
    # Re-enable once a pinned ONNX export URL has been audited.
]


def compute_sha256(file_path: Path) -> str:
    digest = hashlib.sha256()
    with file_path.open("rb") as file_handle:
        while True:
            chunk = file_handle.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def download_file(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url) as response, destination.open("wb") as output_file:
        while True:
            block = response.read(1024 * 1024)
            if not block:
                break
            output_file.write(block)


def ensure_model(model_spec: dict) -> bool:
    destination = ROOT_DIR / model_spec["relative_path"]
    expected_sha = (model_spec.get("sha256") or "").strip().lower()

    if destination.exists() and expected_sha:
        existing_sha = compute_sha256(destination).lower()
        if existing_sha == expected_sha:
            print(f"[ok] {model_spec['name']}: already present and hash verified")
            return True
        print(f"[warn] {model_spec['name']}: hash mismatch, re-downloading")
    elif destination.exists():
        print(f"[ok] {model_spec['name']}: already present (sha256 check skipped)")
        return True

    print(f"[download] {model_spec['name']}: {model_spec['url']}")
    download_file(model_spec["url"], destination)
    if expected_sha:
        actual_sha = compute_sha256(destination).lower()
        if actual_sha != expected_sha:
            print(f"[error] {model_spec['name']}: sha256 mismatch after download")
            return False
        print(f"[ok] {model_spec['name']}: downloaded and hash verified")
    else:
        print(f"[ok] {model_spec['name']}: downloaded (sha256 not pinned yet)")
    return True


def main() -> int:
    print("PhotoMeasurePro | Download version-locked ONNX models")
    all_ok = True
    for model_spec in MODEL_SPECS:
        model_ok = ensure_model(model_spec)
        all_ok = all_ok and model_ok
    if not all_ok:
        return 1
    print("Completed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
