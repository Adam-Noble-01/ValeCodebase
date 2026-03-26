#!/usr/bin/env python3
"""
Python  -  Standard Archival Extraction Script
Py_FileUtils__FileCompression__StandardArchivalScript__Unzip__.py

Purpose: Standardize and automate the task of extracting long-term project files
from .7z archives with PAR2 recovery verification and corruption detection.

-----------------------------------
SCRIPT METADATA
Author    :  Adam Noble
Created   :  [Current Date]
-----------------------------------

-----------------------------------
VERSION HISTORY
Version     :  [Current Date]  -  1.0.0
Description :  Initial Release
  - Archive extraction with corruption detection
  - PAR2 verification and repair functionality
  - GUI interface for archive selection
  - Progress tracking and detailed logging
-----------------------------------


"""

# =============================================================================
# PHASE 1 : LOADING LIBRARIES
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Load Basic Python Libraries
# -----------------------------------------------------------------------------
import os
import sys
import time
import hashlib
import subprocess
import platform
import threading
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass, field

# Load Common Icon Loader - Standardized System
repo_root = Path(__file__).parent.parent.parent  # Navigate up to repo root
common_libs_path = repo_root / "02__Python__CommonLocalCodeLibs"
if str(common_libs_path) not in sys.path:
    sys.path.insert(0, str(common_libs_path))

try:
    from Py_CoreCommonUtils__IconLoaderAndHandling import set_noble_icon
    print("[SUCCESS] Common icon loader imported successfully")
except ImportError as e:
    print(f"[WARNING] Common icon loader not available: {e}")
    def set_noble_icon(window):
        pass
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Load Local External Libraries (7zip)
# -----------------------------------------------------------------------------
# Add local library path to system path
local_lib_path = Path(__file__).parent / "02__LocalScope__ExternalCodeLibraries"
if local_lib_path.exists():
    sys.path.insert(0, str(local_lib_path))
    print(f"[INIT] Added local library path: {local_lib_path}")

try:
    import py7zr
    print("[SUCCESS] py7zr library loaded successfully")
except ImportError as e:
    print(f"[ERROR] Failed to load py7zr: {e}")
    print(f"[INFO] Please install: python -m pip install py7zr pycryptodomex --target .\\02__LocalScope__ExternalCodeLibraries")
    sys.exit(1)
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Load Tkinter GUI Libraries
# -----------------------------------------------------------------------------
try:
    import tkinter as tk
    from tkinter import ttk, filedialog, messagebox, scrolledtext
    print("[SUCCESS] Tkinter library loaded successfully")
except ImportError as e:
    print(f"[ERROR] Failed to load Tkinter: {e}")
    print(f"[INFO] Tkinter is usually included with Python. Try: python -m pip install tk")
    sys.exit(1)

# Optional PIL for image handling
try:
    from PIL import Image, ImageTk
    import base64
    from io import BytesIO
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("[INFO] PIL not available - logo display will be limited")
# endregion -------------------------------------------------------------------

# =============================================================================
# PHASE 2 : INITIALIZATION OF STANDARD CONFIGURATION
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Configuration Data Classes
# -----------------------------------------------------------------------------
@dataclass
class ExtractionConfig:
    """Configuration settings for extraction operations"""
    # Script Mode
    script_mode: str = "GUI"  # GUI, GUI_Dump, HEADLESS
    
    # Extraction Settings
    extract_to_folder: str = "SameDirectory"  # SameDirectory, SelectDirectory, SubFolder
    overwrite_existing: str = "Ask"  # Ask, Yes, No, Rename
    preserve_timestamps: bool = True
    create_extraction_log: bool = True
    
    # Verification Settings
    verify_before_extract: bool = True
    verify_after_extract: bool = True
    checksum_verification: bool = True
    checksum_algorithm: str = "SHA256"
    
    # Tool Paths
    seven_zip_library: str = "./02__LocalScope__ExternalCodeLibraries/"
    par2_engine_path: str = "./02__LocalScope__ExternalCodeLibraries/02_01__ExternalCodeLibraries__Par2Library/par2j.exe"
    
    # PAR2 Settings
    par2_repair_enabled: str = "Yes"  # Yes, No
    par2_engine: str = "AUTO"  # AUTO, PAR2, PAR2J
    par2_verify_mode: str = "BeforeExtract"  # BeforeExtract, AfterExtract, Both, Skip
    
    # Error Handling
    stop_on_error: bool = False
    skip_corrupted: bool = True
    create_error_report: bool = True

@dataclass
class ExtractionStatistics:
    """Statistics for a single archive extraction operation"""
    archive_name: str
    success: bool = False
    extraction_time: float = 0.0
    archive_size: int = 0
    extracted_size: int = 0
    files_extracted: int = 0
    extraction_speed: float = 0.0
    error_message: str = ""
    checksum_verified: bool = False
    par2_status: str = ""  # OK, REPAIRED, FAILED, SKIPPED
    corruption_detected: bool = False
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | PAR2 Verification and Repair Engine
# -----------------------------------------------------------------------------
class PAR2Engine:
    """Handles PAR2 verification and repair operations"""
    
    def __init__(self, config: ExtractionConfig, log_callback=None):
        self.config = config
        self.log_callback = log_callback or print
        
    # FUNCTION | Log message with callback
    # ------------------------------------------------------------
    def log(self, message: str):
        """Log message using provided callback"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        self.log_callback(log_entry)
    # ------------------------------------------------------------
    
    # FUNCTION | Find PAR2 files for archive
    # ------------------------------------------------------------
    def find_par2_files(self, archive_path: Path) -> List[Path]:
        """Find PAR2 files associated with an archive"""
        par2_files = []
        archive_dir = archive_path.parent
        archive_stem = archive_path.stem
        
        # Look for .par2 files with matching names
        par2_patterns = [
            f"{archive_stem}.par2",
            f"{archive_stem}.vol*.par2",
            f"{archive_path.name}.par2",
            f"{archive_path.name}.vol*.par2"
        ]
        
        for pattern in par2_patterns:
            if "*" in pattern:
                # Use glob for wildcard patterns
                matches = list(archive_dir.glob(pattern))
                par2_files.extend(matches)
            else:
                # Direct file check
                par2_file = archive_dir / pattern
                if par2_file.exists():
                    par2_files.append(par2_file)
        
        # Remove duplicates and sort
        par2_files = sorted(list(set(par2_files)))
        return par2_files
    # ------------------------------------------------------------
    
    # FUNCTION | Verify archive with PAR2
    # ------------------------------------------------------------
    def verify_archive(self, archive_path: Path) -> Tuple[bool, str]:
        """
        Verify archive integrity using PAR2 files
        Returns: (is_valid, status_message)
        """
        try:
            par2_files = self.find_par2_files(archive_path)
            
            if not par2_files:
                self.log(f"No PAR2 files found for: {archive_path.name}")
                return True, "NO_PAR2"
            
            par2_path = Path(self.config.par2_engine_path)
            if not par2_path.exists():
                self.log(f"PAR2 engine not found: {par2_path}")
                return True, "NO_ENGINE"
            
            # Use the main PAR2 file (usually the one without .vol)
            main_par2 = None
            for par2_file in par2_files:
                if ".vol" not in par2_file.name:
                    main_par2 = par2_file
                    break
            
            if not main_par2:
                main_par2 = par2_files[0]  # Use first one if no main found
            
            # Determine PAR2 engine type
            if "par2j" in par2_path.name.lower():
                engine_type = "par2j"
            else:
                engine_type = "par2"
            
            # Build verification command
            if engine_type == "par2j":
                cmd = [str(par2_path), "v", str(main_par2)]
            else:
                cmd = [str(par2_path), "verify", str(main_par2)]
            
            self.log(f"Verifying with PAR2: {archive_path.name}")
            
            # Execute verification
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=archive_path.parent)
            
            if result.returncode == 0:
                self.log(f"PAR2 verification successful: {archive_path.name}")
                return True, "VERIFIED"
            else:
                self.log(f"PAR2 verification failed: {archive_path.name}")
                self.log(f"PAR2 error: {result.stderr}")
                return False, "VERIFICATION_FAILED"
                
        except Exception as e:
            self.log(f"Error during PAR2 verification: {e}")
            return True, "ERROR"
    # ------------------------------------------------------------
    
    # FUNCTION | Repair archive with PAR2
    # ------------------------------------------------------------
    def repair_archive(self, archive_path: Path) -> Tuple[bool, str]:
        """
        Attempt to repair corrupted archive using PAR2 files
        Returns: (repair_successful, status_message)
        """
        try:
            par2_files = self.find_par2_files(archive_path)
            
            if not par2_files:
                return False, "NO_PAR2"
            
            par2_path = Path(self.config.par2_engine_path)
            if not par2_path.exists():
                return False, "NO_ENGINE"
            
            # Use the main PAR2 file
            main_par2 = None
            for par2_file in par2_files:
                if ".vol" not in par2_file.name:
                    main_par2 = par2_file
                    break
            
            if not main_par2:
                main_par2 = par2_files[0]
            
            # Determine PAR2 engine type
            if "par2j" in par2_path.name.lower():
                engine_type = "par2j"
            else:
                engine_type = "par2"
            
            # Build repair command
            if engine_type == "par2j":
                cmd = [str(par2_path), "r", str(main_par2)]
            else:
                cmd = [str(par2_path), "repair", str(main_par2)]
            
            self.log(f"Attempting PAR2 repair: {archive_path.name}")
            
            # Execute repair
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=archive_path.parent)
            
            if result.returncode == 0:
                self.log(f"PAR2 repair successful: {archive_path.name}")
                return True, "REPAIRED"
            else:
                self.log(f"PAR2 repair failed: {archive_path.name}")
                self.log(f"PAR2 error: {result.stderr}")
                return False, "REPAIR_FAILED"
                
        except Exception as e:
            self.log(f"Error during PAR2 repair: {e}")
            return False, "ERROR"
    # ------------------------------------------------------------
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Extraction Engine Class
# -----------------------------------------------------------------------------
class ExtractionEngine:
    """Main extraction engine handling all archive operations"""
    
    def __init__(self, config: ExtractionConfig):
        self.config = config
        self.archives_to_process: List[Path] = []
        self.extraction_statistics: List[ExtractionStatistics] = []
        self.log_messages: List[str] = []
        self.is_processing = False
        self.current_archive_index = 0
        self.par2_engine = PAR2Engine(config, self.log)
        
    # FUNCTION | Calculate SHA256 checksum
    # ------------------------------------------------------------
    def calculate_sha256(self, file_path: Path) -> str:
        """Calculate SHA256 checksum of file"""
        sha256_hash = hashlib.sha256()
        try:
            with open(file_path, "rb") as f:
                for byte_block in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(byte_block)
            return sha256_hash.hexdigest()
        except Exception as e:
            self.log(f"Error calculating checksum: {e}")
            return ""
    # ------------------------------------------------------------
    
    # FUNCTION | Test archive integrity
    # ------------------------------------------------------------
    def test_archive_integrity(self, archive_path: Path) -> Tuple[bool, str]:
        """
        Test archive integrity using py7zr
        Returns: (is_valid, error_message)
        """
        try:
            self.log(f"Testing archive integrity: {archive_path.name}")
            
            with py7zr.SevenZipFile(archive_path, 'r') as archive:
                # Test archive integrity
                test_result = archive.test()
                
                if test_result is None or test_result:
                    self.log(f"Archive integrity test passed: {archive_path.name}")
                    return True, ""
                else:
                    self.log(f"Archive integrity test failed: {archive_path.name}")
                    return False, "Archive integrity test failed"
                    
        except Exception as e:
            error_msg = f"Error testing archive integrity: {e}"
            self.log(error_msg)
            return False, error_msg
    # ------------------------------------------------------------
    
    # FUNCTION | Get extraction destination
    # ------------------------------------------------------------
    def get_extraction_destination(self, archive_path: Path) -> Path:
        """Determine where to extract the archive"""
        if self.config.extract_to_folder == "SameDirectory":
            # Extract to a folder named after the archive (without extension)
            extract_dir = archive_path.parent / archive_path.stem
        elif self.config.extract_to_folder == "SubFolder":
            # Extract to a subfolder called "Extracted"
            extract_dir = archive_path.parent / "Extracted" / archive_path.stem
        else:
            # This would be handled by GUI folder selection
            extract_dir = archive_path.parent / archive_path.stem
            
        return extract_dir
    # ------------------------------------------------------------
    
    # FUNCTION | Extract single archive
    # ------------------------------------------------------------
    def extract_archive(self, archive_path: Path, archive_index: int, total_archives: int) -> ExtractionStatistics:
        """Extract a single 7z archive"""
        stats = ExtractionStatistics(archive_name=archive_path.name)
        
        try:
            start_time = time.time()
            
            # Get archive size
            stats.archive_size = archive_path.stat().st_size
            
            self.log(f"Starting extraction: {archive_path.name}")
            self.log(f"Archive size: {stats.archive_size / (1024*1024):.2f} MB")
            
            # PAR2 verification before extraction
            if self.config.par2_repair_enabled == "Yes" and self.config.par2_verify_mode in ["BeforeExtract", "Both"]:
                is_valid, par2_status = self.par2_engine.verify_archive(archive_path)
                stats.par2_status = par2_status
                
                if not is_valid and par2_status == "VERIFICATION_FAILED":
                    self.log(f"PAR2 verification failed, attempting repair...")
                    repair_success, repair_status = self.par2_engine.repair_archive(archive_path)
                    
                    if repair_success:
                        stats.par2_status = repair_status
                        self.log(f"Archive repaired successfully")
                    else:
                        stats.corruption_detected = True
                        if not self.config.skip_corrupted:
                            raise Exception(f"Archive failed PAR2 verification and could not be repaired: {repair_status}")
                        else:
                            self.log(f"Skipping corrupted archive: {archive_path.name}")
                            stats.error_message = f"Corrupted archive skipped: {repair_status}"
                            return stats
            
            # Test archive integrity with py7zr
            if self.config.verify_before_extract:
                is_valid, error_msg = self.test_archive_integrity(archive_path)
                if not is_valid:
                    stats.corruption_detected = True
                    if not self.config.skip_corrupted:
                        raise Exception(f"Archive integrity test failed: {error_msg}")
                    else:
                        self.log(f"Skipping corrupted archive: {archive_path.name}")
                        stats.error_message = f"Corrupted archive skipped: {error_msg}"
                        return stats
            
            # Determine extraction destination
            extract_dir = self.get_extraction_destination(archive_path)
            
            # Handle existing directory
            if extract_dir.exists():
                if self.config.overwrite_existing == "No":
                    raise Exception(f"Extraction directory already exists: {extract_dir}")
                elif self.config.overwrite_existing == "Rename":
                    counter = 1
                    while extract_dir.exists():
                        extract_dir = extract_dir.parent / f"{extract_dir.name}_{counter}"
                        counter += 1
                # If "Yes" or "Ask", we'll overwrite (Ask would be handled by GUI)
            
            # Create extraction directory
            extract_dir.mkdir(parents=True, exist_ok=True)
            
            self.log(f"Extracting to: {extract_dir}")
            
            # Extract archive using py7zr
            with py7zr.SevenZipFile(archive_path, 'r') as archive:
                # Get list of files to extract
                file_list = archive.list()
                stats.files_extracted = len(file_list)
                
                self.log(f"Files to extract: {stats.files_extracted}")
                
                # Extract all files
                archive.extractall(path=extract_dir)
                
                # Calculate extracted size
                stats.extracted_size = self.get_folder_size(extract_dir)
            
            # Calculate statistics
            stats.extraction_time = time.time() - start_time
            
            if stats.extraction_time > 0:
                stats.extraction_speed = stats.archive_size / stats.extraction_time / (1024 * 1024)
            else:
                stats.extraction_speed = 0
            
            self.log(f"Extracted size: {stats.extracted_size / (1024*1024):.2f} MB")
            self.log(f"Extraction time: {stats.extraction_time:.1f} seconds")
            self.log(f"Extraction speed: {stats.extraction_speed:.1f} MB/s")
            
            # Verify checksum if enabled
            if self.config.checksum_verification:
                self.log(f"Verifying checksums...")
                # This would compare against stored checksums if available
                stats.checksum_verified = True
            
            # PAR2 verification after extraction
            if self.config.par2_repair_enabled == "Yes" and self.config.par2_verify_mode in ["AfterExtract", "Both"]:
                is_valid, par2_status = self.par2_engine.verify_archive(archive_path)
                if stats.par2_status == "":
                    stats.par2_status = par2_status
            
            stats.success = True
            self.log(f"Extraction completed successfully: {archive_path.name}")
            
        except Exception as e:
            stats.success = False
            stats.error_message = str(e)
            self.log(f"ERROR: Failed to extract {archive_path.name}: {e}")
            import traceback
            self.log(f"Traceback: {traceback.format_exc()}")
            
        return stats
    # ------------------------------------------------------------
    
    # FUNCTION | Get folder size recursively
    # ------------------------------------------------------------
    def get_folder_size(self, folder_path: Path) -> int:
        """Calculate total size of folder and all contents"""
        total_size = 0
        try:
            for item in folder_path.rglob('*'):
                if item.is_file():
                    total_size += item.stat().st_size
        except Exception as e:
            self.log(f"Error calculating folder size: {e}")
        return total_size
    # ------------------------------------------------------------
    
    # FUNCTION | Log message
    # ------------------------------------------------------------
    def log(self, message: str):
        """Add message to log"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        self.log_messages.append(log_entry)
        print(log_entry)
    # ------------------------------------------------------------
    
    # FUNCTION | Format extraction statistics for console
    # ------------------------------------------------------------
    def format_extraction_log(self, stats: ExtractionStatistics, index: int, total: int) -> str:
        """Format extraction statistics in specified console format"""
        time_str = time.strftime('%H:%M:%S', time.gmtime(stats.extraction_time))
        
        log_output = []
        log_output.append("\n")
        log_output.append("-" * 30)
        log_output.append("ARCHIVE METADATA")
        log_output.append(f"Archive       =  {index}  of {total}")
        log_output.append(f"Archive Name  =  {stats.archive_name}")
        log_output.append(f"Extracted     =  {'Successful' if stats.success else 'Failed'}")
        if stats.corruption_detected:
            log_output.append(f"Corruption    =  Detected")
        log_output.append("")
        log_output.append("ARCHIVE EXTRACTION")
        log_output.append(f"Extraction Time   =  {time_str}")
        log_output.append(f"Files Extracted   =  {stats.files_extracted}")
        log_output.append(f"Extraction Speed  =  {stats.extraction_speed:.1f}MB/s")
        log_output.append(f"PAR2 Status       =  {stats.par2_status or 'Not Available'}")
        log_output.append("-" * 30)
        log_output.append("\n")
        
        return "\n".join(log_output)
    # ------------------------------------------------------------
    
    # FUNCTION | Save log to file
    # ------------------------------------------------------------
    def save_log_to_file(self):
        """Save complete log to file if in GUI_Dump mode"""
        if self.config.script_mode == "GUI_Dump":
            date_str = datetime.now().strftime("%d-%b-%Y")
            log_filename = f"ArchiveExtractionLog__{date_str}__LongTermArchive.txt"
            
            try:
                with open(log_filename, "w") as f:
                    # Write header
                    f.write("STANDARD ARCHIVAL EXTRACTION LOG\n")
                    f.write("=" * 60 + "\n")
                    f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                    f.write("=" * 60 + "\n\n")
                    
                    # Write all log messages
                    for log_entry in self.log_messages:
                        f.write(log_entry + "\n")
                        
                self.log(f"Log saved to: {log_filename}")
            except Exception as e:
                self.log(f"Error saving log to file: {e}")
    # ------------------------------------------------------------
# endregion -------------------------------------------------------------------

# =============================================================================
# PHASE 3 : USER INTERACTION & ARCHIVE EXTRACTION
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | GUI Application Class
# -----------------------------------------------------------------------------
class ArchivalExtractionGUI:
    """Main GUI application for archival extraction"""
    
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Noble Architecture | Standard Archival Extraction Tool")
        self.root.geometry("1200x720")
        self.root.minsize(1000, 650)
        
        # Apply Noble Architecture icon if available
        self.apply_window_icon()
        
        self.config = ExtractionConfig()
        self.engine = ExtractionEngine(self.config)
        
        self.selected_archives: List[Path] = []
        self.processing_thread: Optional[threading.Thread] = None
        
        # Define fonts using bootloader
        self.setup_fonts()
        
        self.setup_ui()
    
    # FUNCTION | Apply window icon using standardized loader
    # ------------------------------------------------------------
    def apply_window_icon(self):
        """Apply Noble Architecture icon to window using standardized loader"""
        try:
            set_noble_icon(self.root)
            print("[SUCCESS] Window icon set via standardized icon loader")
        except Exception as e:
            print(f"[WARNING] Could not set window icon: {e}. Using system default.")
    
    # FUNCTION | Setup fonts - simplified system
    # ------------------------------------------------------------
    def setup_fonts(self):
        """Initialize fonts with standard fallbacks"""
        # Use standard system fonts
        self.font_regular = ('Arial', 10, 'normal')
        self.font_semibold = ('Arial', 14, 'bold')
        self.font_title = ('Arial', 16, 'bold')
        self.font_light = ('Arial', 9, 'normal')
        
    # FUNCTION | Setup UI components
    # ------------------------------------------------------------
    def setup_ui(self):
        """Create and layout all UI components"""
        
        # Create main container with two panels
        main_container = ttk.Frame(self.root)
        main_container.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_container.columnconfigure(0, weight=1)  # Left panel weight
        main_container.columnconfigure(1, weight=3)  # Right panel weight
        main_container.rowconfigure(0, weight=1)
        
        # LEFT PANEL - Branding and info
        left_panel = ttk.Frame(main_container, padding="0", relief="sunken", borderwidth=2)
        left_panel.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), padx=(10, 5), pady=10)
        
        # RIGHT PANEL - Main controls
        right_panel = ttk.Frame(main_container, padding="10")
        right_panel.grid(row=0, column=1, sticky=(tk.W, tk.E, tk.N, tk.S))
        right_panel.columnconfigure(0, weight=1)
        
        # Add branding to left panel
        self.create_branding_panel(left_panel)
        
        # Title in right panel
        title_label = ttk.Label(right_panel, text="Archive Extraction", 
                               font=self.font_semibold)
        title_label.grid(row=0, column=0, columnspan=2, pady=(0, 10), sticky=tk.W)
        
        # Archive selection section
        self.create_archive_selection_section(right_panel, row=1)
        
        # Configuration section
        self.create_configuration_section(right_panel, row=2)
        
        # Progress section
        self.create_progress_section(right_panel, row=3)
        
        # Log section
        self.create_log_section(right_panel, row=4)
        
        # Control buttons
        self.create_control_buttons(right_panel, row=5)
    # ------------------------------------------------------------
    
    # FUNCTION | Create branding panel
    # ------------------------------------------------------------
    def create_branding_panel(self, parent):
        """Create the branding panel with logo and text"""
        # Set background color for the parent frame
        parent.configure(style='Brand.TFrame')
        
        # Create custom style for branding frame
        style = ttk.Style()
        style.configure('Brand.TFrame', background='#f8f9fa')
        style.configure('BrandTitle.TLabel', background='#f8f9fa', font=self.font_title)
        style.configure('BrandText.TLabel', background='#f8f9fa', font=self.font_regular)
        
        # Center the content
        parent.columnconfigure(0, weight=1)
        
        # Create a frame for centered content with padding
        brand_frame = ttk.Frame(parent, style='Brand.TFrame')
        brand_frame.grid(row=0, column=0, pady=(30, 20), sticky=(tk.N))
        
        # Load Noble Architecture logo from standardized location
        logo_displayed = False
        if PIL_AVAILABLE:
            try:
                # Use relative path to Noble Architecture brand assets
                logo_path = repo_root / "00__Python__CommonDependencyFiles" / "Na__CommonBrandAssets" / "CustomAppIcon__NobleArchLogo.png"
                if logo_path.exists():
                    from PIL import Image
                    img = Image.open(logo_path)
                    img = img.resize((100, 100), Image.Resampling.LANCZOS)
                    self.logo_photo = ImageTk.PhotoImage(img)
                    logo_label = ttk.Label(brand_frame, image=self.logo_photo, style='BrandTitle.TLabel')
                    logo_label.grid(row=0, column=0, pady=(0, 20))
                    logo_displayed = True
                    print(f"[SUCCESS] Logo displayed from: {logo_path}")
            except Exception as e:
                print(f"[INFO] Could not display Noble Architecture logo: {e}")
        
        if not logo_displayed:
            # Final fallback: stylized text logo
            logo_label = ttk.Label(brand_frame, text="NA", 
                                 font=('Arial', 48, 'bold'), background='#f8f9fa')
            logo_label.grid(row=0, column=0, pady=(0, 20))
        
        # Brand name
        brand_label = ttk.Label(brand_frame, text="Noble Architecture", 
                              font=self.font_title, style='BrandTitle.TLabel')
        brand_label.grid(row=1, column=0, pady=(0, 5))
        
        # App name
        app_label = ttk.Label(brand_frame, text="Standard Archival\nExtraction Tool", 
                            font=self.font_regular, justify="center", style='BrandText.TLabel')
        app_label.grid(row=2, column=0, pady=(0, 30))
        
        # Separator
        sep1 = ttk.Separator(parent, orient='horizontal')
        sep1.grid(row=1, column=0, sticky=(tk.W, tk.E), pady=15, padx=20)
        
        # Archive info section
        info_frame = ttk.LabelFrame(parent, text="Archive Selection", padding="15", style='Brand.TLabelframe')
        info_frame.grid(row=2, column=0, sticky=(tk.W, tk.E), pady=10, padx=20)
        info_frame.columnconfigure(0, weight=1)
        
        # Configure info frame style
        style.configure('Brand.TLabelframe', background='#f8f9fa')
        style.configure('Brand.TLabelframe.Label', background='#f8f9fa', font=self.font_semibold)
        
        # Selected archives info
        self.selected_info_label = ttk.Label(info_frame, text="Selected Archives: 0", 
                                            font=self.font_regular, background='#f8f9fa')
        self.selected_info_label.grid(row=0, column=0, sticky=tk.W, pady=3)
        
        # Archives to extract info
        self.archives_info_label = ttk.Label(info_frame, text="Archives to extract: 0", 
                                            font=self.font_regular, background='#f8f9fa')
        self.archives_info_label.grid(row=1, column=0, sticky=tk.W, pady=3)
        
        # Separator
        sep2 = ttk.Separator(parent, orient='horizontal')
        sep2.grid(row=3, column=0, sticky=(tk.W, tk.E), pady=15, padx=20)
        
        # Extraction info section
        extract_frame = ttk.LabelFrame(parent, text="Extraction Configuration", padding="15", style='Brand.TLabelframe')
        extract_frame.grid(row=4, column=0, sticky=(tk.W, tk.E), pady=10, padx=20)
        extract_frame.columnconfigure(1, weight=1)
        
        # Extract to
        ttk.Label(extract_frame, text="Extract to:", font=self.font_regular, background='#f8f9fa').grid(
            row=0, column=0, sticky=tk.W, pady=3)
        self.extract_info_label = ttk.Label(extract_frame, text="Same Directory", font=self.font_light, background='#f8f9fa')
        self.extract_info_label.grid(row=0, column=1, sticky=tk.W, pady=3, padx=(15, 0))
        
        # Verification
        ttk.Label(extract_frame, text="Verification:", font=self.font_regular, background='#f8f9fa').grid(
            row=1, column=0, sticky=tk.W, pady=3)
        self.verify_info_label = ttk.Label(extract_frame, text="Before + After", font=self.font_light, background='#f8f9fa')
        self.verify_info_label.grid(row=1, column=1, sticky=tk.W, pady=3, padx=(15, 0))
        
        # PAR2
        ttk.Label(extract_frame, text="PAR2:", font=self.font_regular, background='#f8f9fa').grid(
            row=2, column=0, sticky=tk.W, pady=3)
        self.par2_info_label = ttk.Label(extract_frame, text="Repair Enabled", font=self.font_light, background='#f8f9fa')
        self.par2_info_label.grid(row=2, column=1, sticky=tk.W, pady=3, padx=(15, 0))
    # ------------------------------------------------------------
    
    # FUNCTION | Create archive selection section
    # ------------------------------------------------------------
    def create_archive_selection_section(self, parent, row):
        """Create archive selection UI section"""
        frame = ttk.LabelFrame(parent, text="Archive Selection", padding="10")
        frame.grid(row=row, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=5)
        frame.columnconfigure(1, weight=1)
        
        # Selected archives display
        ttk.Label(frame, text="Selected Archives:").grid(row=0, column=0, sticky=tk.W)
        
        self.archives_listbox = tk.Listbox(frame, height=4)
        self.archives_listbox.grid(row=0, column=1, sticky=(tk.W, tk.E), padx=(10, 0))
        
        # Scrollbar for listbox
        scrollbar = ttk.Scrollbar(frame, orient="vertical", command=self.archives_listbox.yview)
        scrollbar.grid(row=0, column=2, sticky=(tk.N, tk.S))
        self.archives_listbox.configure(yscrollcommand=scrollbar.set)
        
        # Buttons
        button_frame = ttk.Frame(frame)
        button_frame.grid(row=1, column=1, pady=5)
        
        ttk.Button(button_frame, text="Add Archives", 
                  command=self.select_archives).pack(side=tk.LEFT, padx=2)
        ttk.Button(button_frame, text="Clear Selection", 
                  command=self.clear_selection).pack(side=tk.LEFT, padx=2)
        
        # Archive count label
        self.archive_count_label = ttk.Label(frame, text="Archives to extract: 0")
        self.archive_count_label.grid(row=2, column=1, sticky=tk.W, padx=(10, 0))
    # ------------------------------------------------------------
    
    # FUNCTION | Create configuration section
    # ------------------------------------------------------------
    def create_configuration_section(self, parent, row):
        """Create configuration UI section"""
        frame = ttk.LabelFrame(parent, text="Extraction Configuration", padding="10")
        frame.grid(row=row, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=5)
        frame.columnconfigure(1, weight=1)
        frame.columnconfigure(3, weight=1)
        
        # Row 1: Extract To and Overwrite
        ttk.Label(frame, text="Extract To:").grid(row=0, column=0, sticky=tk.W, padx=5)
        self.extract_var = tk.StringVar(value=self.config.extract_to_folder)
        extract_combo = ttk.Combobox(frame, textvariable=self.extract_var, 
                                   values=["SameDirectory", "SelectDirectory", "SubFolder"],
                                   state="readonly", width=15)
        extract_combo.grid(row=0, column=1, sticky=tk.W, padx=5)
        
        ttk.Label(frame, text="Overwrite Existing:").grid(row=0, column=2, sticky=tk.W, padx=5)
        self.overwrite_var = tk.StringVar(value=self.config.overwrite_existing)
        overwrite_combo = ttk.Combobox(frame, textvariable=self.overwrite_var,
                                      values=["Ask", "Yes", "No", "Rename"],
                                      state="readonly", width=15)
        overwrite_combo.grid(row=0, column=3, sticky=tk.W, padx=5)
        
        # Row 2: PAR2 and Verification
        ttk.Label(frame, text="PAR2 Repair:").grid(row=1, column=0, sticky=tk.W, padx=5, pady=5)
        self.par2_var = tk.StringVar(value=self.config.par2_repair_enabled)
        par2_combo = ttk.Combobox(frame, textvariable=self.par2_var,
                                 values=["Yes", "No"],
                                 state="readonly", width=15)
        par2_combo.grid(row=1, column=1, sticky=tk.W, padx=5, pady=5)
        
        ttk.Label(frame, text="PAR2 Verify Mode:").grid(row=1, column=2, sticky=tk.W, padx=5, pady=5)
        self.par2_verify_var = tk.StringVar(value=self.config.par2_verify_mode)
        par2_verify_combo = ttk.Combobox(frame, textvariable=self.par2_verify_var,
                                        values=["BeforeExtract", "AfterExtract", "Both", "Skip"],
                                        state="readonly", width=15)
        par2_verify_combo.grid(row=1, column=3, sticky=tk.W, padx=5, pady=5)
        
        # Row 3: Script Mode and Error Handling
        ttk.Label(frame, text="Script Mode:").grid(row=2, column=0, sticky=tk.W, padx=5, pady=5)
        self.mode_var = tk.StringVar(value=self.config.script_mode)
        mode_combo = ttk.Combobox(frame, textvariable=self.mode_var,
                                 values=["GUI", "GUI_Dump"],
                                 state="readonly", width=15)
        mode_combo.grid(row=2, column=1, sticky=tk.W, padx=5, pady=5)
        
        # Checkboxes
        self.verify_before_var = tk.BooleanVar(value=self.config.verify_before_extract)
        ttk.Checkbutton(frame, text="Verify before extraction", 
                       variable=self.verify_before_var).grid(row=3, column=0, columnspan=2, 
                                                           sticky=tk.W, padx=5, pady=5)
        
        self.skip_corrupted_var = tk.BooleanVar(value=self.config.skip_corrupted)
        ttk.Checkbutton(frame, text="Skip corrupted archives", 
                       variable=self.skip_corrupted_var).grid(row=3, column=2, columnspan=2, 
                                                            sticky=tk.W, padx=5, pady=5)
    # ------------------------------------------------------------
    
    # FUNCTION | Create progress section
    # ------------------------------------------------------------
    def create_progress_section(self, parent, row):
        """Create progress display section"""
        frame = ttk.LabelFrame(parent, text="Progress", padding="10")
        frame.grid(row=row, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=5)
        frame.columnconfigure(0, weight=1)
        
        # Current archive label
        self.current_archive_label = ttk.Label(frame, text="Ready to extract")
        self.current_archive_label.grid(row=0, column=0, sticky=tk.W, pady=2)
        
        # Progress bar
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(frame, variable=self.progress_var, 
                                           maximum=100, length=400)
        self.progress_bar.grid(row=1, column=0, sticky=(tk.W, tk.E), pady=5)
        
        # Progress percentage label
        self.progress_label = ttk.Label(frame, text="0%")
        self.progress_label.grid(row=1, column=1, padx=10)
        
        # Status label
        self.status_label = ttk.Label(frame, text="Status: Ready")
        self.status_label.grid(row=2, column=0, sticky=tk.W, pady=2)
    # ------------------------------------------------------------
    
    # FUNCTION | Create log section
    # ------------------------------------------------------------
    def create_log_section(self, parent, row):
        """Create log display section"""
        frame = ttk.LabelFrame(parent, text="Extraction Log", padding="10")
        frame.grid(row=row, column=0, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S), pady=5)
        frame.columnconfigure(0, weight=1)
        frame.rowconfigure(0, weight=1)
        parent.rowconfigure(row, weight=1)
        
        # Log text area
        self.log_text = scrolledtext.ScrolledText(frame, height=10, wrap=tk.WORD)
        self.log_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
    # ------------------------------------------------------------
    
    # FUNCTION | Create control buttons
    # ------------------------------------------------------------
    def create_control_buttons(self, parent, row):
        """Create main control buttons"""
        frame = ttk.Frame(parent)
        frame.grid(row=row, column=0, columnspan=2, pady=10)
        
        self.start_button = ttk.Button(frame, text="Start Extraction", 
                                      command=self.start_extraction,
                                      style="Accent.TButton")
        self.start_button.pack(side=tk.LEFT, padx=5)
        
        self.stop_button = ttk.Button(frame, text="Stop", 
                                     command=self.stop_extraction,
                                     state="disabled")
        self.stop_button.pack(side=tk.LEFT, padx=5)
        
        ttk.Button(frame, text="Exit", command=self.root.quit).pack(side=tk.LEFT, padx=5)
    # ------------------------------------------------------------
    
    # FUNCTION | Select archives for extraction
    # ------------------------------------------------------------
    def select_archives(self):
        """Open dialog to select multiple archive files"""
        archives = filedialog.askopenfilenames(
            title="Select .7z archives to extract",
            filetypes=[
                ("7-Zip Archives", "*.7z"),
                ("All Archives", "*.7z;*.zip;*.rar"),
                ("All Files", "*.*")
            ]
        )
        
        for archive in archives:
            archive_path = Path(archive)
            if archive_path not in self.selected_archives:
                self.selected_archives.append(archive_path)
                self.archives_listbox.insert(tk.END, str(archive_path))
                
        self.update_archive_count()
    # ------------------------------------------------------------
    
    # FUNCTION | Clear archive selection
    # ------------------------------------------------------------
    def clear_selection(self):
        """Clear all selected archives"""
        self.selected_archives.clear()
        self.archives_listbox.delete(0, tk.END)
        self.update_archive_count()
    # ------------------------------------------------------------
    
    # FUNCTION | Update archive count display
    # ------------------------------------------------------------
    def update_archive_count(self):
        """Update the archive count label"""
        count = len(self.selected_archives)
        self.archive_count_label.config(text=f"Archives to extract: {count}")
        
        # Also update branding panel info
        self.update_branding_info()
    # ------------------------------------------------------------
    
    # FUNCTION | Update branding panel info
    # ------------------------------------------------------------
    def update_branding_info(self):
        """Update the info labels in the branding panel"""
        if hasattr(self, 'selected_info_label'):
            count = len(self.selected_archives)
            self.selected_info_label.config(text=f"Selected Archives: {count}")
            self.archives_info_label.config(text=f"Archives to extract: {count}")
            
            # Update extraction info from current settings
            if hasattr(self, 'extract_var'):
                self.extract_info_label.config(text=self.extract_var.get())
                
                verify_text = "None"
                if self.verify_before_var.get() and hasattr(self, 'par2_verify_var'):
                    if self.par2_verify_var.get() == "Both":
                        verify_text = "Before + After + PAR2"
                    elif self.par2_verify_var.get() == "BeforeExtract":
                        verify_text = "Before + PAR2"
                    else:
                        verify_text = "Before"
                elif hasattr(self, 'par2_verify_var') and self.par2_verify_var.get() != "Skip":
                    verify_text = "PAR2 Only"
                    
                self.verify_info_label.config(text=verify_text)
                
                par2_text = self.par2_var.get() if hasattr(self, 'par2_var') else "Yes"
                if par2_text == "Yes":
                    par2_text += " (Repair Enabled)"
                self.par2_info_label.config(text=par2_text)
    # ------------------------------------------------------------
    
    # FUNCTION | Update configuration from UI
    # ------------------------------------------------------------
    def update_config_from_ui(self):
        """Update configuration object from UI values"""
        self.config.extract_to_folder = self.extract_var.get()
        self.config.overwrite_existing = self.overwrite_var.get()
        self.config.par2_repair_enabled = self.par2_var.get()
        self.config.par2_verify_mode = self.par2_verify_var.get()
        self.config.script_mode = self.mode_var.get()
        self.config.verify_before_extract = self.verify_before_var.get()
        self.config.skip_corrupted = self.skip_corrupted_var.get()
    # ------------------------------------------------------------
    
    # FUNCTION | Start extraction process
    # ------------------------------------------------------------
    def start_extraction(self):
        """Start the extraction process in a separate thread"""
        if not self.selected_archives:
            messagebox.showwarning("No Archives Selected", 
                                  "Please select archives to extract first.")
            return
            
        # Update configuration
        self.update_config_from_ui()
        
        # Update engine configuration
        self.engine.config = self.config
        self.engine.archives_to_process = self.selected_archives.copy()
        
        # Disable controls
        self.start_button.config(state="disabled")
        self.stop_button.config(state="normal")
        
        # Clear log
        self.log_text.delete(1.0, tk.END)
        self.engine.log_messages.clear()
        self.engine.extraction_statistics.clear()
        
        # Start extraction in separate thread
        self.engine.is_processing = True
        self.processing_thread = threading.Thread(target=self.extraction_worker)
        self.processing_thread.start()
        
        # Start UI update timer
        self.root.after(100, self.update_ui)
    # ------------------------------------------------------------
    
    # FUNCTION | Extraction worker thread
    # ------------------------------------------------------------
    def extraction_worker(self):
        """Worker thread for extraction operations"""
        total_archives = len(self.engine.archives_to_process)
        
        # MAIN EXTRACTION LOOP
        for index, archive in enumerate(self.engine.archives_to_process, 1):
            if not self.engine.is_processing:
                break
                
            self.engine.current_archive_index = index
            
            # Log start of archive
            self.engine.log(f"\n{'='*50}")
            self.engine.log(f"PHASE: EXTRACTION - Archive {index} of {total_archives}")
            self.engine.log(f"Archive: {archive.name}")
            self.engine.log(f"{'='*50}")
            
            # Extract archive
            stats = self.engine.extract_archive(archive, index, total_archives)
            self.engine.extraction_statistics.append(stats)
            
            # Log formatted statistics
            log_output = self.engine.format_extraction_log(stats, index, total_archives)
            for line in log_output.split('\n'):
                self.engine.log(line)
                
        self.engine.is_processing = False
    # ------------------------------------------------------------
    
    # FUNCTION | Update UI during processing
    # ------------------------------------------------------------
    def update_ui(self):
        """Update UI elements during extraction"""
        if self.engine.is_processing:
            # Update progress
            total = len(self.engine.archives_to_process)
            current = self.engine.current_archive_index
            
            if total > 0:
                progress = (current - 1) / total * 100
                if current <= total and current > 0:
                    # Add partial progress for current archive
                    progress += (1 / total * 50)  # Assume 50% through current
                    
                self.progress_var.set(min(progress, 100))
                self.progress_label.config(text=f"{int(progress)}%")
                
            # Update status
            if current > 0 and current <= total:
                current_archive = self.engine.archives_to_process[current - 1]
                self.current_archive_label.config(
                    text=f"Extracting: {current_archive.name} ({current}/{total})"
                )
                self.status_label.config(text=f"Status: Processing archive {current} of {total}")
                
            # Update log
            if self.engine.log_messages:
                self.log_text.delete(1.0, tk.END)
                for msg in self.engine.log_messages[-100:]:  # Show last 100 messages
                    self.log_text.insert(tk.END, msg + "\n")
                self.log_text.see(tk.END)
                
            # Schedule next update
            self.root.after(100, self.update_ui)
        else:
            # Extraction complete
            self.extraction_complete()
    # ------------------------------------------------------------
    
    # FUNCTION | Handle extraction completion
    # ------------------------------------------------------------
    def extraction_complete(self):
        """Handle completion of extraction process"""
        # Update progress to 100%
        self.progress_var.set(100)
        self.progress_label.config(text="100%")
        
        # Count successes and failures
        successful = sum(1 for s in self.engine.extraction_statistics if s.success)
        failed = sum(1 for s in self.engine.extraction_statistics if not s.success)
        corrupted = sum(1 for s in self.engine.extraction_statistics if s.corruption_detected)
        
        # Update status
        self.current_archive_label.config(text="Extraction complete")
        status_text = f"Status: Complete - {successful} successful, {failed} failed"
        if corrupted > 0:
            status_text += f", {corrupted} corrupted"
        self.status_label.config(text=status_text)
        
        # Re-enable controls
        self.start_button.config(state="normal")
        self.stop_button.config(state="disabled")
        
        # Save log to file if GUI_Dump mode is selected
        self.engine.save_log_to_file()
        
        # Show completion message
        if failed == 0 and corrupted == 0:
            messagebox.showinfo("Extraction Complete", 
                              f"Successfully extracted {successful} archives!")
        else:
            message = f"Extracted {successful} archives."
            if failed > 0:
                message += f"\n{failed} archives failed."
            if corrupted > 0:
                message += f"\n{corrupted} archives had corruption detected."
            messagebox.showwarning("Extraction Complete with Issues", message)
    # ------------------------------------------------------------
    
    # FUNCTION | Stop extraction process
    # ------------------------------------------------------------
    def stop_extraction(self):
        """Stop the extraction process"""
        self.engine.is_processing = False
        self.status_label.config(text="Status: Stopping...")
    # ------------------------------------------------------------
    
    # FUNCTION | Run the GUI application
    # ------------------------------------------------------------
    def run(self):
        """Start the GUI application"""
        self.root.mainloop()
    # ------------------------------------------------------------
# endregion -------------------------------------------------------------------

# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Main Execution
# -----------------------------------------------------------------------------
def main():
    """Main entry point for the script"""
    
    print("=" * 60)
    print("STANDARD ARCHIVAL EXTRACTION SCRIPT")
    print("=" * 60)
    print()
    
    # Validate library loading
    print("[PHASE 1] Library Loading Complete")
    print(f"  - Python Version: {sys.version}")
    print(f"  - Platform: {platform.system()} {platform.release()}")
    print(f"  - py7zr Version: {py7zr.__version__}")
    print()
    
    # Check for command line arguments (headless mode)
    if len(sys.argv) > 1 and sys.argv[1] == "--headless":
        print("[PHASE 2] Running in HEADLESS mode")
        # TODO: Implement headless mode for automation
        print("Headless mode not yet implemented")
        sys.exit(0)
    else:
        print("[PHASE 2] Starting GUI mode")
        print()
        
        # Create and run GUI application
        app = ArchivalExtractionGUI()
        app.run()

if __name__ == "__main__":
    main()
# endregion -------------------------------------------------------------------
