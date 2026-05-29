# =============================================================================
# NOBLEIMAGETOOLS - DOWNLOAD SAM2 MODEL CHECKPOINTS
# =============================================================================
#
# FILE       : download_models.py
# PURPOSE    : One-click download of Meta SAM 2.1 model checkpoints from the
#              official Meta CDN. Run this script once before first use.
#
# USAGE:
#   python download_models.py                  (downloads large model only)
#   python download_models.py --all            (downloads all 4 model sizes)
#   python download_models.py --model small    (downloads a specific size)
#
# MODELS:
#   large      : 224MB - sam2.1_hiera_large.pt      (best quality, recommended)
#   base_plus  : 81MB  - sam2.1_hiera_base_plus.pt  (good balance)
#   small      : 46MB  - sam2.1_hiera_small.pt       (faster)
#   tiny       : 38MB  - sam2.1_hiera_tiny.pt        (fastest)
#
# SOURCE:
#   https://github.com/facebookresearch/sam2
#   SAM 2.1 checkpoints released 30-Sep-2024
#
# =============================================================================

import argparse
import os
import sys
import urllib.request
from pathlib import Path

# -----------------------------------------------------------------------------
# REGION | Model Definitions
# -----------------------------------------------------------------------------

SAM2_BASE_URL   = "https://dl.fbaipublicfiles.com/segment_anything_2/092824/"

MODELS          = {
    "large"     : {
        "filename"    : "sam2.1_hiera_large.pt",
        "size_mb"     : 224.4,
        "description" : "SAM 2.1 Hiera-Large — highest accuracy (recommended)"
    },
    "base_plus" : {
        "filename"    : "sam2.1_hiera_base_plus.pt",
        "size_mb"     : 80.8,
        "description" : "SAM 2.1 Hiera-Base+ — best quality/speed balance"
    },
    "small"     : {
        "filename"    : "sam2.1_hiera_small.pt",
        "size_mb"     : 46.0,
        "description" : "SAM 2.1 Hiera-Small — faster inference"
    },
    "tiny"      : {
        "filename"    : "sam2.1_hiera_tiny.pt",
        "size_mb"     : 38.5,
        "description" : "SAM 2.1 Hiera-Tiny — fastest, lowest memory"
    }
}

SCRIPT_DIR      = Path(__file__).parent
OUTPUT_DIR      = SCRIPT_DIR / "Sam2__Checkpoints"

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Download Helpers
# -----------------------------------------------------------------------------

def NobleImageTools__Download__Progress(block_count, block_size, total_size):
    """
    HELPER FUNCTION | urllib reporthook — prints an inline progress bar.
    """
    downloaded  = block_count * block_size
    if total_size > 0:
        pct     = min(downloaded / total_size * 100, 100)
        mb_done = downloaded / (1024 * 1024)
        mb_total = total_size / (1024 * 1024)
        bar     = "#" * int(pct / 2)
        sys.stdout.write(f"\r  [{bar:<50}] {pct:5.1f}%  {mb_done:.1f}/{mb_total:.1f} MB")
        sys.stdout.flush()
    else:
        mb_done = downloaded / (1024 * 1024)
        sys.stdout.write(f"\r  Downloaded: {mb_done:.1f} MB")
        sys.stdout.flush()


def NobleImageTools__Download__SingleModel(model_key: str) -> None:
    """
    FUNCTION | Download a single SAM2 model checkpoint.
    """
    if model_key not in MODELS:
        print(f"  Unknown model: {model_key}. Options: {list(MODELS.keys())}")
        return

    model       = MODELS[model_key]
    filename    = model["filename"]
    url         = SAM2_BASE_URL + filename
    out_path    = OUTPUT_DIR / filename

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    if out_path.exists():
        actual_mb = out_path.stat().st_size / (1024 * 1024)
        print(f"  Already exists: {filename}  ({actual_mb:.1f} MB)  — skipping")
        return

    print(f"\n  Downloading: {model['description']}")
    print(f"  URL : {url}")
    print(f"  Size: ~{model['size_mb']} MB")
    print(f"  Dest: {out_path}")
    print()

    try:
        urllib.request.urlretrieve(url, str(out_path), reporthook=NobleImageTools__Download__Progress)
        print()
        actual_mb = out_path.stat().st_size / (1024 * 1024)
        print(f"  Done: {filename}  ({actual_mb:.1f} MB)")
    except Exception as err:
        print(f"\n  ERROR downloading {filename}: {err}")
        if out_path.exists():
            out_path.unlink()

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Entry Point
# -----------------------------------------------------------------------------

def main():
    parser  = argparse.ArgumentParser(description="Download SAM 2.1 model checkpoints")
    parser.add_argument("--all",   action="store_true", help="Download all 4 model sizes")
    parser.add_argument("--model", choices=list(MODELS.keys()),
                        help="Download a specific model size (default: large)")
    args    = parser.parse_args()

    print("=" * 77)
    print(" NOBLEIMAGETOOLS - SAM 2.1 MODEL DOWNLOAD")
    print("=" * 77)
    print()
    print(f"  Output directory: {OUTPUT_DIR}")
    print()

    if args.all:
        for key in MODELS:
            NobleImageTools__Download__SingleModel(key)
    elif args.model:
        NobleImageTools__Download__SingleModel(args.model)
    else:
        NobleImageTools__Download__SingleModel("large")

    print()
    print("  Download complete. Run the launcher to start NobleImageTools.")
    print()

if __name__ == "__main__":
    main()

# endregion -------------------------------------------------------------------
