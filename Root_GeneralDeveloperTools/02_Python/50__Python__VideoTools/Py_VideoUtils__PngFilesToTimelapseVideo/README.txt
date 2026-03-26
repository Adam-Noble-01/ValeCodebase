==========================================
PNG/JPG TO TIMELAPSE VIDEO CONVERTER
==========================================

SETUP INSTRUCTIONS:
-------------------
1. First time setup - Install dependencies:
   - Double-click: INSTALL_DEPENDENCIES.bat
   - This will download all required packages locally
   - No system-wide installation needed!

2. Run the application:
   - Double-click: Py_FileUtils__PngFilesToTimelapseVideo__Main__.py
   - Or run from command line: python Py_FileUtils__PngFilesToTimelapseVideo__Main__.py

FEATURES:
---------
• Converts PNG/JPG images to timelapse video (MP4)
• Automatically sorts images by creation date
• Frame rates: 24fps, 30fps, 60fps
• Speed options: 1x, 8x, 16x, 32x
• Optional duplicate frame removal (for static sections)
• Progress tracking with visual progress bar
• Batch processing support

HOW TO USE:
-----------
1. Launch the application
2. Add images using "Add Image Files" or "Add Folder of Images"
3. Select output directory for the video
4. Choose frame rate and speed settings
5. Optionally enable duplicate frame removal
6. Click "Create Timelapse Video"

OUTPUT:
-------
• Format: MP4 with H.264 encoding
• Filename: Timelapse__DD-MMM-YYYY__HH-MM.mp4
• Optimized for web and standard video players

TROUBLESHOOTING:
----------------
• If you see "Dependencies Missing" error:
  Run INSTALL_DEPENDENCIES.bat first

• If PowerShell script doesn't run:
  1. Open PowerShell as Administrator
  2. Navigate to this folder
  3. Run: .\Download_Dependencies.ps1

• Dependencies are stored locally in:
  LocalScope__ExternalCodeDependencies folder
  
• On first run after downloading dependencies:
  The script will automatically install them to a local
  site-packages folder (one-time process, takes ~30 seconds)

• To reset/reinstall dependencies:
  Just run INSTALL_DEPENDENCIES.bat again

==========================================
Author: Adam Noble - Studio NoodlFjord
Date: 2025-09-18
Version: 1.0.1
==========================================
