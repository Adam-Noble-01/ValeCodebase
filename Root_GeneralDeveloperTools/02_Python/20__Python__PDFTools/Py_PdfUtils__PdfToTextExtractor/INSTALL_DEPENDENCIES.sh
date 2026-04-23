#!/usr/bin/env bash
# ============================================================================
# INSTALL_DEPENDENCIES.sh
# ============================================================================
# Installs each exterior Python package into its own isolated subfolder inside
# 00__ThirdParty__VersionLockedDependencies so the tool stays portable.
#
# After the Ghostscript-free OCR refactor, PyMuPDF is the ONLY Python package
# this app needs. OCR is performed by calling tesseract directly via
# subprocess - no ocrmypdf / pdfplumber / Pillow / pdfminer bundles required.
# ============================================================================

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPS="${PROJECT_ROOT}/00__ThirdParty__VersionLockedDependencies"

echo
echo "=== Installing PyMuPDF =========================================="
python -m pip install --upgrade --target "${DEPS}/00__PyMuPDF__PythonPackage__" "PyMuPDF==1.24.10"

echo
echo "All dependencies installed successfully."
echo "Remember: OCR also needs Tesseract-OCR installed (auto-detected at"
echo "Program Files / Program Files (x86) / \$LOCALAPPDATA/Programs/Tesseract-OCR)."
