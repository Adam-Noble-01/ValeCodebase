# =============================================================================
# Py_ImgUtils__CadBackgroundRemover__DEVLOG__.md
# =============================================================================
# Description : Development log for CAD Background Remover utility
# Author      : Adam Noble
# Created     : 09-Jun-2026
# Last Update : 09-Jun-2026
# Version     : 1.0.0
# =============================================================================

## Version History

# -----------------------------------------------------------------------------

### 1.0.0 - 09-Jun-2026 | Initial Release
- Refactored from Background_Remover_Tkinter_FULL.py into Noble Python App Launcher structure
- Full persistent GUI replacing the original one-shot dialog chain
- Added White Threshold slider (range 150–255, default 238) for transparency cutoff
- Added Black Threshold slider (range 50–230, default 135) for linework opacity cutoff
- Added live value labels beside each slider updating on drag
- Added Reset to Defaults button restoring both thresholds to original values
- Added progress bar updating per-file through the batch
- Added status label cycling green / blue / orange for ready / processing / error states
- Preserved all original image processing logic exactly (luminance → alpha fade, EXIF transpose, LINE_RGB)
- Preserved intentional OUTPUT_SUFFIX spelling "__BackroundRemvoed"
- Added Noble Architecture icon branding via shared icon loader
- Added logging to Py_ImgUtils__CadBackgroundRemover.log beside the script
- Integrated into launcher as 30__Python__ImageTools with curated display name and description

# =============================================================================
# End of File
# =============================================================================
