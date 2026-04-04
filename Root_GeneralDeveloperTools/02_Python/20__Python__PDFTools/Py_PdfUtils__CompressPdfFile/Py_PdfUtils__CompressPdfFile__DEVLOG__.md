# =============================================================================
# Py_PdfUtils__CompressPdfFile__DEVLOG__.md
# =============================================================================
# Description : Development log for PDF compression utility updates
# Author      : Adam Noble
# Created     : 16-Dec-2024
# Last Update : 04-Apr-2026
# Version     : 1.1.0
# =============================================================================

## Version History

# -----------------------------------------------------------------------------

### 1.1.0 - 04-Apr-2026 | Batch Processing Update
- Added multi-file selection via `askopenfilenames()` so multiple PDFs can be selected at once
- Implemented sequential per-file compression for selected PDFs
- Updated UI button label from single-file wording to multi-file wording
- Added batch completion summary with success and failure counts
- Added per-file error handling so failed files do not stop the entire batch
- Improved status label updates to show current file index and filename during processing

# -----------------------------------------------------------------------------

### 1.0.0 - 16-Dec-2024 | Initial Release
- Released GUI-based PDF flatten + compress tool
- Added DPI slider controls for output resolution tuning
- Added optional JPEG compression with quality controls
- Added PNG output mode for lossless page raster embedding
- Added progress bar and status feedback during page processing
- Added output filename convention with compression settings included

# =============================================================================
# End of File
# =============================================================================