#!/usr/bin/env python3
"""
Python - Icon Loader & Handling Utils - Single Source of Truth
Py_CoreCommonUtils__IconLoaderAndHandling.py

Purpose: Provide standardized icon loading functionality for all Python GUI applications
in the codebase, with intelligent fallback hierarchy and brand asset management.

-----------------------------------
SCRIPT METADATA
Author    :  Adam Noble
Created   :  10-May-2025
Updated   :  19-Sep-2025
-----------------------------------

-----------------------------------
RELATIVE FILE NAVIGATION
From this file's location (02__Python__CommonLocalCodeLibs/):
- Dependencies file: ./SnPy_MasterPipDependencies.txt
- Noble brand assets: ../00__Python__CommonDependencyFiles/Na__CommonBrandAssets/
- Vale brand assets: ../00__Python__CommonDependencyFiles/Vale__CommonBrandAssets/
- Config files backup: ../03__Python__CommonConfigFiles/
-----------------------------------

-----------------------------------
VERSION HISTORY
Version     :  19-Sep-2025  -  1.1.0
Description :  Updated paths for new directory structure, made single source of truth
  - Updated all file paths to use relative navigation from current location
  - Added support for both Noble Architecture and Vale brand assets
  - Removed hardcoded absolute paths, now uses relative paths for portability
  - Added intelligent fallback hierarchy and brand preference support
  - Restructured with proper regional organization and Adam Noble coding style

Version     :  10-May-2025  -  1.0.0
Description :  Initial utility version (extracted from main script, tested)
  - Provides set_window_icon for use in all SnPy GUI scripts
-----------------------------------


"""

# =============================================================================
# PHASE 1 : LOADING LIBRARIES
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Load Standard Python Libraries
# -----------------------------------------------------------------------------
import os
import urllib.request
from pathlib import Path
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Load Third-Party Libraries  
# -----------------------------------------------------------------------------
from PIL import Image, ImageTk
# endregion -------------------------------------------------------------------

# =============================================================================
# PHASE 2 : ICON LOADING CORE FUNCTIONS
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Primary Icon Loading Functions
# -----------------------------------------------------------------------------

# FUNCTION | Set custom PNG icon for Tkinter window with intelligent fallback hierarchy
# ------------------------------------------------------------
def set_window_icon(root, brand_preference="noble"):
    """
    Set a custom PNG icon for the Tkinter window with intelligent fallback hierarchy.
    
    Args:
        root: Tkinter root window
        brand_preference: "noble" or "vale" - determines which brand assets to use first
    
    Fallback hierarchy:
        1. Downloaded icon from URL (cached locally)
        2. Brand-specific asset from CommonDependencyFiles
        3. Alternative brand asset as final fallback
    """
    try:
        # Get the directory of this script for relative path calculations
        script_dir                = os.path.dirname(os.path.abspath(__file__))        # <-- Current script location
        
        # Define icon URL and local cache path
        icon_url                  = "https://www.noble-architecture.com/assets/AD05_-_LIBR_-_Common_-_Icons-and-favicons/AD05_05_-_NA_Favicon_-_PNG-h192px.png"  # <-- Remote icon source
        cached_icon_path          = os.path.join(script_dir, "custom_icon.png")       # <-- Local cache file
        
        # Define brand asset paths using relative navigation
        noble_asset_path          = os.path.join(script_dir, "..", "00__Python__CommonDependencyFiles", "Na__CommonBrandAssets", "CustomAppIcon__NobleArchLogo.png")      # <-- Noble Architecture brand asset
        vale_asset_path           = os.path.join(script_dir, "..", "00__Python__CommonDependencyFiles", "Vale__CommonBrandAssets", "Logo__ValeLogo__HorizontalFormat.png")  # <-- Vale brand asset
        
        # Normalize paths for cross-platform compatibility
        noble_asset_path          = os.path.normpath(noble_asset_path)                # <-- Normalized Noble path
        vale_asset_path           = os.path.normpath(vale_asset_path)                 # <-- Normalized Vale path
        
        # Determine primary and fallback paths based on brand preference
        if brand_preference.lower() == "vale":
            primary_fallback      = vale_asset_path                                   # <-- Primary: Vale asset
            secondary_fallback    = noble_asset_path                                  # <-- Secondary: Noble asset
        else:  # Default to noble
            primary_fallback      = noble_asset_path                                  # <-- Primary: Noble asset
            secondary_fallback    = vale_asset_path                                   # <-- Secondary: Vale asset
        
        # Try to download and cache icon if not present
        if not os.path.exists(cached_icon_path):
            try:
                urllib.request.urlretrieve(icon_url, cached_icon_path)
            except Exception:
                pass  # Continue to fallback options
        
        # Try to load icon with fallback hierarchy
        img = None
        for icon_path in [cached_icon_path, primary_fallback, secondary_fallback]:
            try:
                if os.path.exists(icon_path):
                    img = Image.open(icon_path)
                    break
            except Exception:
                continue
        
        if img:
            # Resize and apply icon
            img = img.resize((32, 32), Image.LANCZOS)
            icon = ImageTk.PhotoImage(img)
            root.iconphoto(True, icon)
            root._icon_ref = icon  # Prevent garbage collection
            
    except Exception:
        pass  # Fallback to default system icon if all else fails
# ------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Convenience Brand-Specific Functions
# -----------------------------------------------------------------------------

# FUNCTION | Convenience function for Noble Architecture branding
# ------------------------------------------------------------
def set_noble_icon(root):
    """Convenience function to set Noble Architecture icon."""
    set_window_icon(root, brand_preference="noble")
# ------------------------------------------------------------

# FUNCTION | Convenience function for Vale branding  
# ------------------------------------------------------------
def set_vale_icon(root):
    """Convenience function to set Vale icon."""
    set_window_icon(root, brand_preference="vale")
# ------------------------------------------------------------

# endregion -------------------------------------------------------------------

# =============================================================================
# PHASE 3 : USAGE DOCUMENTATION & EXAMPLES
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Import Usage Examples and Documentation
# -----------------------------------------------------------------------------
"""
USAGE EXAMPLES FOR IMPORT IN OTHER SCRIPTS:

Method 1 - Direct import and use:
    from Py_CoreCommonUtils__IconLoaderAndHandling import set_window_icon
    set_window_icon(root, "noble")  # or "vale"

Method 2 - Import convenience functions:
    from Py_CoreCommonUtils__IconLoaderAndHandling import set_noble_icon, set_vale_icon
    set_noble_icon(root)  # or set_vale_icon(root)

Method 3 - Import entire module:
    import sys, os
    sys.path.append(os.path.join(os.path.dirname(__file__), '..', '02__Python__CommonLocalCodeLibs'))
    from Py_CoreCommonUtils__IconLoaderAndHandling import set_window_icon

Method 4 - Path-agnostic import (recommended for production):
    from pathlib import Path
    import sys
    common_libs_path = Path(__file__).parent.parent / "02__Python__CommonLocalCodeLibs"
    sys.path.insert(0, str(common_libs_path))
    from Py_CoreCommonUtils__IconLoaderAndHandling import set_noble_icon, set_vale_icon
"""
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# END OF FILE
# -----------------------------------------------------------------------------

