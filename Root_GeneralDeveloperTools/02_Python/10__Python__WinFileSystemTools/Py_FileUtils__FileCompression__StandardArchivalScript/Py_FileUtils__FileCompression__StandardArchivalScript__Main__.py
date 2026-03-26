#!/usr/bin/env python3
"""
Python  -  Standard Archival Compression Script
Py_FileUtils__FileCompression__StandardArchivalScript__Main__.py

Purpose: Standardize and automate the task of archiving long-term project files
using advanced .7z compression with PAR2 recovery files for data integrity.

-----------------------------------
SCRIPT METADATA
Author    :  Adam Noble
Created   :  07-Sep-2025
-----------------------------------

-----------------------------------
VERSION HISTORY
Version     :  07-Sep-2025  -  1.1.0
Description :  Added PreProcessing 
  - BackUp Files Removal Step to reduce the size of the project files before the compression process.
  - This preprocessing step runs early in the stack prior to the compression process.

Version     :  07-Sep-2025  -  1.0.0
Description :  Initial Release
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
class CompressionConfig:
    """Configuration settings for compression operations"""
    # Script Mode
    script_mode: str = "GUI"  # GUI, GUI_Dump, HEADLESS
    
    # Archive Settings
    archive_format: str = "7Z"
    compression_method: str = "LZMA2"  # LZMA2, LZMA, PPMD, BZIP2, DEFLATE, COPY
    compression_level: str = "Highest Compression"  # Highest Compression, Fastest Processing Time
    
    # Compression Options
    solid_mode: str = "On"  # On, Off, Auto
    dictionary_size: str = "Auto"  # Auto, 64MB, 128MB, 256MB, 512MB, 1GB
    threads: str = "Auto"  # Auto, 1, 2, 4, 8, 16
    split_volumes: str = "None"  # None, 1GB, 4GB, 8GB
    
    # Tool Paths
    seven_zip_library: str = "./02__LocalScope__ExternalCodeLibraries/"
    par2_engine_path: str = "./02__LocalScope__ExternalCodeLibraries/02_01__ExternalCodeLibraries__Par2Library/par2j.exe"
    
    # PAR2 Settings
    par2_required: str = "Yes"  # Yes, No
    par2_engine: str = "AUTO"  # AUTO, PAR2, PAR2J
    par2_scope: str = "PerArchive"  # PerArchive, PerSplitSet
    par2_slice_size: str = "AUTO"  # AUTO, 512KB, 1MB, 2MB, 4MB
    par2_recovery_files: str = "AUTO"  # AUTO, 4, 8, 12
    par2_redundancy: str = "10.0%"  # 0.0%, 5.0%, 10.0%, 15.0%, 20.0%, 30.0%
    par2_verify_mode: str = "AfterCreate"  # AfterCreate, Skip
    
    # Verification Settings
    verify_after_create: bool = True
    verify_after_copy: bool = True
    checksum_algorithm: str = "SHA256"
    encryption: str = "None"

@dataclass
class ArchiveStatistics:
    """Statistics for a single archive compression operation"""
    archive_name: str
    success: bool = False
    compression_time: float = 0.0
    original_size: int = 0
    compressed_size: int = 0
    compression_ratio: float = 0.0
    compression_speed: float = 0.0
    error_message: str = ""
    checksum: str = ""
    par2_created: bool = False
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION |  PreProcessing - BackUp File Removal Step
# -----------------------------------------------------------------------------

@dataclass
class BackupPurgeStatistics:
    """Statistics for backup file purging operations"""
    sketchup_backups_found: int = 0
    sketchup_backups_removed: int = 0
    layout_backups_found: int = 0
    layout_backups_removed: int = 0
    total_size_freed: int = 0
    errors: List[str] = field(default_factory=list)

class BackupFilePurger:
    """Handles removal of backup files before compression"""
    
    def __init__(self, log_callback=None):
        self.log_callback = log_callback or print
        
    # FUNCTION | Log message with callback
    # ------------------------------------------------------------
    def log(self, message: str):
        """Log message using provided callback"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        self.log_callback(log_entry)
    # ------------------------------------------------------------
    
    # FUNCTION | Purge SketchUp backup files (.skb)
    # ------------------------------------------------------------
    def purge_sketchup_backup_files(self, folder_path: Path) -> Tuple[int, int, int]:
        """
        Remove SketchUp backup files (.skb) from folder recursively
        Returns: (files_found, files_removed, size_freed)
        """
        files_found = 0
        files_removed = 0
        size_freed = 0
        
        try:
            self.log(f"Scanning for SketchUp backup files (.skb) in: {folder_path.name}")
            
            # Find all .skb files recursively
            skb_files = list(folder_path.rglob('*.skb'))
            files_found = len(skb_files)
            
            if files_found == 0:
                self.log("  No SketchUp backup files found")
                return files_found, files_removed, size_freed
                
            self.log(f"  Found {files_found} SketchUp backup files")
            
            # Remove each .skb file
            for skb_file in skb_files:
                try:
                    file_size = skb_file.stat().st_size
                    skb_file.unlink()
                    files_removed += 1
                    size_freed += file_size
                    self.log(f"    Removed: {skb_file.name} ({file_size / (1024*1024):.2f} MB)")
                except Exception as e:
                    self.log(f"    ERROR removing {skb_file.name}: {e}")
                    
            self.log(f"  SketchUp cleanup complete: {files_removed}/{files_found} files removed")
            self.log(f"  Space freed: {size_freed / (1024*1024):.2f} MB")
            
        except Exception as e:
            self.log(f"ERROR during SketchUp backup cleanup: {e}")
            
        return files_found, files_removed, size_freed
    # ------------------------------------------------------------
    
    # FUNCTION | Purge SketchUp Layout backup files
    # ------------------------------------------------------------
    def purge_layout_backup_files(self, folder_path: Path) -> Tuple[int, int, int]:
        """
        Remove SketchUp Layout backup files (files with 'Backup of ' prefix)
        Returns: (files_found, files_removed, size_freed)
        """
        files_found = 0
        files_removed = 0
        size_freed = 0
        
        try:
            self.log(f"Scanning for Layout backup files (Backup of *.layout) in: {folder_path.name}")
            
            # Find all .layout files recursively
            layout_files = list(folder_path.rglob('*.layout'))
            
            # Filter for backup files (those with 'Backup of ' prefix)
            backup_files = []
            for layout_file in layout_files:
                if layout_file.name.startswith('Backup of '):
                    backup_files.append(layout_file)
                    
            files_found = len(backup_files)
            
            if files_found == 0:
                self.log("  No Layout backup files found")
                return files_found, files_removed, size_freed
                
            self.log(f"  Found {files_found} Layout backup files")
            
            # Remove each backup file
            for backup_file in backup_files:
                try:
                    file_size = backup_file.stat().st_size
                    backup_file.unlink()
                    files_removed += 1
                    size_freed += file_size
                    
                    # Show original filename for clarity
                    original_name = backup_file.name.replace('Backup of ', '')
                    self.log(f"    Removed: {backup_file.name}")
                    self.log(f"             (backup of: {original_name}) ({file_size / (1024*1024):.2f} MB)")
                    
                except Exception as e:
                    self.log(f"    ERROR removing {backup_file.name}: {e}")
                    
            self.log(f"  Layout cleanup complete: {files_removed}/{files_found} files removed")
            self.log(f"  Space freed: {size_freed / (1024*1024):.2f} MB")
            
        except Exception as e:
            self.log(f"ERROR during Layout backup cleanup: {e}")
            
        return files_found, files_removed, size_freed
    # ------------------------------------------------------------
    
    # FUNCTION | Comprehensive backup purge for single folder
    # ------------------------------------------------------------
    def purge_all_backup_files(self, folder_path: Path) -> BackupPurgeStatistics:
        """
        Remove all backup files from a single folder
        Returns comprehensive statistics
        """
        stats = BackupPurgeStatistics()
        
        self.log(f"\n{'='*50}")
        self.log(f"BACKUP FILE PURGE - {folder_path.name}")
        self.log(f"{'='*50}")
        
        try:
            # Purge SketchUp backup files
            skb_found, skb_removed, skb_size = self.purge_sketchup_backup_files(folder_path)
            stats.sketchup_backups_found = skb_found
            stats.sketchup_backups_removed = skb_removed
            
            # Purge Layout backup files  
            layout_found, layout_removed, layout_size = self.purge_layout_backup_files(folder_path)
            stats.layout_backups_found = layout_found
            stats.layout_backups_removed = layout_removed
            
            # Calculate totals
            stats.total_size_freed = skb_size + layout_size
            
            # Summary log
            total_found = stats.sketchup_backups_found + stats.layout_backups_found
            total_removed = stats.sketchup_backups_removed + stats.layout_backups_removed
            
            self.log(f"\nBACKUP PURGE SUMMARY:")
            self.log(f"  Total backup files found: {total_found}")
            self.log(f"  Total backup files removed: {total_removed}")
            self.log(f"  Total space freed: {stats.total_size_freed / (1024*1024):.2f} MB")
            
            if total_removed < total_found:
                failed = total_found - total_removed
                self.log(f"  WARNING: {failed} files could not be removed")
                stats.errors.append(f"{failed} backup files could not be removed from {folder_path.name}")
                
        except Exception as e:
            error_msg = f"Backup purge failed for {folder_path.name}: {e}"
            self.log(f"ERROR: {error_msg}")
            stats.errors.append(error_msg)
            
        self.log(f"{'='*50}\n")
        return stats
    # ------------------------------------------------------------
    
    # FUNCTION | Batch purge for multiple folders
    # ------------------------------------------------------------
    def purge_backup_files_batch(self, folder_paths: List[Path]) -> List[BackupPurgeStatistics]:
        """
        Remove backup files from multiple folders
        Returns list of statistics for each folder
        """
        all_stats = []
        
        self.log(f"\n{'#'*60}")
        self.log(f"STARTING BACKUP FILE PURGE - {len(folder_paths)} FOLDERS")
        self.log(f"{'#'*60}")
        
        for i, folder_path in enumerate(folder_paths, 1):
            self.log(f"\nProcessing folder {i} of {len(folder_paths)}")
            stats = self.purge_all_backup_files(folder_path)
            all_stats.append(stats)
            
        # Overall summary
        total_skb_found = sum(s.sketchup_backups_found for s in all_stats)
        total_skb_removed = sum(s.sketchup_backups_removed for s in all_stats)
        total_layout_found = sum(s.layout_backups_found for s in all_stats)
        total_layout_removed = sum(s.layout_backups_removed for s in all_stats)
        total_size_freed = sum(s.total_size_freed for s in all_stats)
        total_errors = sum(len(s.errors) for s in all_stats)
        
        self.log(f"\n{'#'*60}")
        self.log(f"BACKUP PURGE COMPLETE - OVERALL SUMMARY")
        self.log(f"{'#'*60}")
        self.log(f"SketchUp backups: {total_skb_removed}/{total_skb_found} removed")
        self.log(f"Layout backups: {total_layout_removed}/{total_layout_found} removed") 
        self.log(f"Total space freed: {total_size_freed / (1024*1024):.2f} MB")
        self.log(f"Errors encountered: {total_errors}")
        self.log(f"{'#'*60}\n")
        
        return all_stats
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Compression Engine Class
# -----------------------------------------------------------------------------
class CompressionEngine:
    """Main compression engine handling all archival operations"""
    
    def __init__(self, config: CompressionConfig):
        self.config = config
        self.archives_to_process: List[Path] = []
        self.archive_statistics: List[ArchiveStatistics] = []
        self.backup_purge_statistics: List[BackupPurgeStatistics] = []
        self.log_messages: List[str] = []
        self.is_processing = False
        self.current_archive_index = 0
        
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
    
    # FUNCTION | Generate archive filename
    # ------------------------------------------------------------
    def generate_archive_filename(self, folder_path: Path) -> str:
        """Generate standardized archive filename"""
        folder_name = folder_path.name
        date_str = datetime.now().strftime("%d-%b-%Y")
        return f"Archive__{folder_name}__{date_str}__LongTermArchive.7z"
    # ------------------------------------------------------------
    
    # FUNCTION | Calculate compression parameters
    # ------------------------------------------------------------
    def get_compression_parameters(self) -> Dict[str, Any]:
        """Convert configuration to py7zr parameters"""
        # py7zr uses filters for compression configuration
        filters = []
        
        # Map compression method to py7zr filter
        if self.config.compression_method == "LZMA2":
            filter_dict = {'id': py7zr.FILTER_LZMA2}
            
            # Set preset based on compression level
            if self.config.compression_level == "Highest Compression":
                filter_dict['preset'] = 9
            else:  # Fastest Processing Time
                filter_dict['preset'] = 1
                
            # Add dictionary size if specified
            if self.config.dictionary_size != "Auto":
                size_map = {
                    "64MB": 26,   # 2^26 = 64MB
                    "128MB": 27,  # 2^27 = 128MB
                    "256MB": 28,  # 2^28 = 256MB
                    "512MB": 29,  # 2^29 = 512MB
                    "1GB": 30     # 2^30 = 1GB
                }
                if self.config.dictionary_size in size_map:
                    filter_dict['dict_size'] = size_map[self.config.dictionary_size]
                    
            filters.append(filter_dict)
            
        elif self.config.compression_method == "LZMA":
            filter_dict = {'id': py7zr.FILTER_LZMA}
            if self.config.compression_level == "Highest Compression":
                filter_dict['preset'] = 9
            else:
                filter_dict['preset'] = 1
            filters.append(filter_dict)
            
        elif self.config.compression_method == "BZIP2":
            filters.append({'id': py7zr.FILTER_BZIP2})
            
        elif self.config.compression_method == "DEFLATE":
            filters.append({'id': py7zr.FILTER_DEFLATE})
            
        elif self.config.compression_method == "COPY":
            filters.append({'id': py7zr.FILTER_COPY})
            
        elif self.config.compression_method == "PPMD":
            filter_dict = {'id': py7zr.FILTER_PPMD}
            if self.config.compression_level == "Highest Compression":
                filter_dict['order'] = 16
                filter_dict['mem_size'] = 28  # 256MB
            else:
                filter_dict['order'] = 4
                filter_dict['mem_size'] = 24  # 16MB
            filters.append(filter_dict)
        else:
            # Default to LZMA2
            filters.append({'id': py7zr.FILTER_LZMA2, 'preset': 9})
            
        return filters
    # ------------------------------------------------------------
    
    # FUNCTION | Compress single archive
    # ------------------------------------------------------------
    def compress_archive(self, folder_path: Path, archive_index: int, total_archives: int) -> ArchiveStatistics:
        """Compress a single folder to 7z archive"""
        stats = ArchiveStatistics(archive_name=folder_path.name)
        
        try:
            start_time = time.time()
            
            # Get original size
            self.log(f"Calculating size for: {folder_path.name}")
            stats.original_size = self.get_folder_size(folder_path)
            
            # Generate archive filename
            archive_filename = self.generate_archive_filename(folder_path)
            archive_path = folder_path.parent / archive_filename
            
            # Get compression filters
            filters = self.get_compression_parameters()
            
            self.log(f"Creating archive: {archive_filename}")
            self.log(f"Compression method: {self.config.compression_method}")
            self.log(f"Compression level: {self.config.compression_level}")
            
            # Create archive using py7zr with proper filter configuration
            with py7zr.SevenZipFile(archive_path, 'w') as archive:
                # Set compression filters
                if filters:
                    archive.set_encoded_header_mode(False)  # For better compatibility
                    
                # Add all files from folder
                file_count = 0
                for item in folder_path.rglob('*'):
                    if item.is_file():
                        arcname = item.relative_to(folder_path.parent)
                        archive.write(item, arcname)
                        file_count += 1
                        
                        # Log progress every 100 files
                        if file_count % 100 == 0:
                            self.log(f"  Added {file_count} files...")
                            
                self.log(f"Total files compressed: {file_count}")
                
            # Verify archive was created
            if not archive_path.exists():
                raise Exception("Archive file was not created")
                
            # Calculate statistics
            stats.compression_time = time.time() - start_time
            stats.compressed_size = archive_path.stat().st_size
            
            if stats.original_size > 0:
                stats.compression_ratio = (1 - stats.compressed_size / stats.original_size) * 100
            else:
                stats.compression_ratio = 0
                
            if stats.compression_time > 0:
                stats.compression_speed = stats.original_size / stats.compression_time / (1024 * 1024)
            else:
                stats.compression_speed = 0
            
            self.log(f"Archive size: {stats.compressed_size / (1024*1024):.2f} MB")
            self.log(f"Compression ratio: {stats.compression_ratio:.1f}%")
            self.log(f"Compression speed: {stats.compression_speed:.1f} MB/s")
            
            # Verify archive if configured
            if self.config.verify_after_create:
                self.log(f"Verifying archive: {archive_filename}")
                try:
                    with py7zr.SevenZipFile(archive_path, 'r') as archive:
                        # Test archive integrity
                        test_result = archive.test()
                        if test_result is None or test_result:
                            self.log(f"Archive verification successful")
                        else:
                            raise Exception("Archive verification failed")
                except Exception as e:
                    self.log(f"Verification error: {e}")
                    # Continue anyway as archive may still be valid
                    
            # Generate checksum
            if self.config.checksum_algorithm == "SHA256":
                self.log(f"Generating SHA256 checksum")
                stats.checksum = self.calculate_sha256(archive_path)
                if stats.checksum:
                    self.log(f"Checksum: {stats.checksum[:16]}...")
                
            # Create PAR2 recovery files
            if self.config.par2_required == "Yes":
                stats.par2_created = self.create_par2_files(archive_path)
                
            stats.success = True
            self.log(f"Archive created successfully: {archive_filename}")
            
        except Exception as e:
            stats.success = False
            stats.error_message = str(e)
            self.log(f"ERROR: Failed to compress {folder_path.name}: {e}")
            import traceback
            self.log(f"Traceback: {traceback.format_exc()}")
            
        return stats
    # ------------------------------------------------------------
    
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
    
    # FUNCTION | Create PAR2 recovery files
    # ------------------------------------------------------------
    def create_par2_files(self, archive_path: Path) -> bool:
        """Create PAR2 recovery files for archive"""
        try:
            par2_path = Path(self.config.par2_engine_path)
            
            # Check if PAR2 engine exists
            if not par2_path.exists():
                self.log(f"PAR2 engine not found: {par2_path}")
                if self.config.par2_required == "Yes":
                    raise FileNotFoundError(f"PAR2 engine required but not found: {par2_path}")
                return False
                
            # Determine PAR2 engine type
            if "par2j" in par2_path.name.lower():
                engine_type = "par2j"
            else:
                engine_type = "par2"
                
            # Build PAR2 command
            redundancy = self.config.par2_redundancy.replace("%", "")
            
            if engine_type == "par2j":
                # MultiPar PAR2J syntax
                cmd = [
                    str(par2_path),
                    "c",  # Create
                    f"/rr{redundancy}",  # Redundancy percentage
                    f"/rd2",  # Recovery data distribution
                    str(archive_path)
                ]
            else:
                # Standard PAR2 syntax
                cmd = [
                    str(par2_path),
                    "create",
                    f"-r{redundancy}",
                    str(archive_path)
                ]
                
            self.log(f"Creating PAR2 recovery files with {redundancy}% redundancy")
            
            # Execute PAR2 command
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                self.log(f"PAR2 recovery files created successfully")
                
                # Verify PAR2 files if configured
                if self.config.par2_verify_mode == "AfterCreate":
                    verify_cmd = cmd.copy()
                    verify_cmd[1] = "v" if engine_type == "par2j" else "verify"
                    verify_result = subprocess.run(verify_cmd, capture_output=True, text=True)
                    
                    if verify_result.returncode == 0:
                        self.log(f"PAR2 verification successful")
                    else:
                        self.log(f"PAR2 verification failed: {verify_result.stderr}")
                        
                return True
            else:
                self.log(f"PAR2 creation failed: {result.stderr}")
                return False
                
        except Exception as e:
            self.log(f"Error creating PAR2 files: {e}")
            return False
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
    
    # FUNCTION | Format archive statistics for console
    # ------------------------------------------------------------
    def format_archive_log(self, stats: ArchiveStatistics, index: int, total: int) -> str:
        """Format archive statistics in specified console format"""
        time_str = time.strftime('%H:%M:%S', time.gmtime(stats.compression_time))
        
        log_output = []
        log_output.append("\n")
        log_output.append("-" * 30)
        log_output.append("ARCHIVE METADATA")
        log_output.append(f"Archive       =  {index}  of {total}")
        log_output.append(f"Archive Name  =  {stats.archive_name}")
        log_output.append(f"Compressed    =  {'Successful' if stats.success else 'Failed'}")
        log_output.append("")
        log_output.append("ARCHIVE COMPRESSION")
        log_output.append(f"Compression Time   =  {time_str}")
        log_output.append(f"Compression Level  =  {self.config.compression_level}")
        log_output.append(f"Compression Speed  =  {stats.compression_speed:.1f}MB/s")
        log_output.append(f"Compression Method =  {self.config.compression_method}")
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
            log_filename = f"ArchiveCompressionLog__{date_str}__LongTermArchive.txt"
            
            try:
                with open(log_filename, "w") as f:
                    # Write header
                    f.write("STANDARD ARCHIVAL COMPRESSION LOG\n")
                    f.write("=" * 60 + "\n")
                    f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                    f.write("=" * 60 + "\n\n")
                    
                    # Write all log messages (everything that was displayed in UI/console)
                    for log_entry in self.log_messages:
                        f.write(log_entry + "\n")
                        
                self.log(f"Log saved to: {log_filename}")
            except Exception as e:
                self.log(f"Error saving log to file: {e}")
    # ------------------------------------------------------------
# endregion -------------------------------------------------------------------

# =============================================================================
# PHASE 3 : USER INTERACTION & ARCHIVE CREATION
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | GUI Application Class
# -----------------------------------------------------------------------------
class ArchivalCompressionGUI:
    """Main GUI application for archival compression"""
    
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Noble Architecture | Standard Archival Compression Tool")
        self.root.geometry("1200x720")
        self.root.minsize(1000, 650)
        
        # Apply Noble Architecture icon if available
        self.apply_window_icon()
        
        self.config = CompressionConfig()
        self.engine = CompressionEngine(self.config)
        
        self.selected_folders: List[Path] = []
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
        main_container.columnconfigure(0, weight=1)  # Left panel weight (branding)
        main_container.columnconfigure(1, weight=3)  # Right panel weight (main controls)
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
        title_label = ttk.Label(right_panel, text="Archive Selection", 
                               font=self.font_semibold)
        title_label.grid(row=0, column=0, columnspan=2, pady=(0, 10), sticky=tk.W)
        
        # Folder selection section
        self.create_folder_selection_section(right_panel, row=1)
        
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
        app_label = ttk.Label(brand_frame, text="Standard Archival\nCompression Tool", 
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
        
        # Selected folders info
        self.selected_info_label = ttk.Label(info_frame, text="Selected Folders: 0", 
                                            font=self.font_regular, background='#f8f9fa')
        self.selected_info_label.grid(row=0, column=0, sticky=tk.W, pady=3)
        
        # Archives to create info
        self.archives_info_label = ttk.Label(info_frame, text="Archives to create: 0", 
                                            font=self.font_regular, background='#f8f9fa')
        self.archives_info_label.grid(row=1, column=0, sticky=tk.W, pady=3)
        
        # Separator
        sep2 = ttk.Separator(parent, orient='horizontal')
        sep2.grid(row=3, column=0, sticky=(tk.W, tk.E), pady=15, padx=20)
        
        # Compression info section
        comp_frame = ttk.LabelFrame(parent, text="Compression Configuration", padding="15", style='Brand.TLabelframe')
        comp_frame.grid(row=4, column=0, sticky=(tk.W, tk.E), pady=10, padx=20)
        comp_frame.columnconfigure(1, weight=1)
        
        # Method
        ttk.Label(comp_frame, text="Method:", font=self.font_regular, background='#f8f9fa').grid(
            row=0, column=0, sticky=tk.W, pady=3)
        self.method_info_label = ttk.Label(comp_frame, text="LZMA2", font=self.font_light, background='#f8f9fa')
        self.method_info_label.grid(row=0, column=1, sticky=tk.W, pady=3, padx=(15, 0))
        
        # Level
        ttk.Label(comp_frame, text="Level:", font=self.font_regular, background='#f8f9fa').grid(
            row=1, column=0, sticky=tk.W, pady=3)
        self.level_info_label = ttk.Label(comp_frame, text="Highest Compression", font=self.font_light, background='#f8f9fa')
        self.level_info_label.grid(row=1, column=1, sticky=tk.W, pady=3, padx=(15, 0))
        
        # PAR2
        ttk.Label(comp_frame, text="PAR2:", font=self.font_regular, background='#f8f9fa').grid(
            row=2, column=0, sticky=tk.W, pady=3)
        self.par2_info_label = ttk.Label(comp_frame, text="Yes (10.0%)", font=self.font_light, background='#f8f9fa')
        self.par2_info_label.grid(row=2, column=1, sticky=tk.W, pady=3, padx=(15, 0))
    # ------------------------------------------------------------
    
    # FUNCTION | Create folder selection section
    # ------------------------------------------------------------
    def create_folder_selection_section(self, parent, row):
        """Create folder selection UI section"""
        frame = ttk.LabelFrame(parent, text="Archive Selection", padding="10")
        frame.grid(row=row, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=5)
        frame.columnconfigure(1, weight=1)
        
        # Selected folders display
        ttk.Label(frame, text="Selected Folders:").grid(row=0, column=0, sticky=tk.W)
        
        self.folders_listbox = tk.Listbox(frame, height=4)
        self.folders_listbox.grid(row=0, column=1, sticky=(tk.W, tk.E), padx=(10, 0))
        
        # Scrollbar for listbox
        scrollbar = ttk.Scrollbar(frame, orient="vertical", command=self.folders_listbox.yview)
        scrollbar.grid(row=0, column=2, sticky=(tk.N, tk.S))
        self.folders_listbox.configure(yscrollcommand=scrollbar.set)
        
        # Buttons
        button_frame = ttk.Frame(frame)
        button_frame.grid(row=1, column=1, pady=5)
        
        ttk.Button(button_frame, text="Add Folders", 
                  command=self.select_folders).pack(side=tk.LEFT, padx=2)
        ttk.Button(button_frame, text="Clear Selection", 
                  command=self.clear_selection).pack(side=tk.LEFT, padx=2)
        
        # Archive count label
        self.archive_count_label = ttk.Label(frame, text="Archives to create: 0")
        self.archive_count_label.grid(row=2, column=1, sticky=tk.W, padx=(10, 0))
    # ------------------------------------------------------------
    
    # FUNCTION | Create configuration section
    # ------------------------------------------------------------
    def create_configuration_section(self, parent, row):
        """Create configuration UI section"""
        frame = ttk.LabelFrame(parent, text="Compression Configuration", padding="10")
        frame.grid(row=row, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=5)
        frame.columnconfigure(1, weight=1)
        frame.columnconfigure(3, weight=1)
        
        # Row 1: Compression Method and Level
        ttk.Label(frame, text="Compression Method:").grid(row=0, column=0, sticky=tk.W, padx=5)
        self.method_var = tk.StringVar(value=self.config.compression_method)
        method_combo = ttk.Combobox(frame, textvariable=self.method_var, 
                                   values=["LZMA2", "LZMA", "PPMD", "BZIP2", "DEFLATE", "COPY"],
                                   state="readonly", width=15)
        method_combo.grid(row=0, column=1, sticky=tk.W, padx=5)
        
        ttk.Label(frame, text="Compression Level:").grid(row=0, column=2, sticky=tk.W, padx=5)
        self.level_var = tk.StringVar(value=self.config.compression_level)
        level_combo = ttk.Combobox(frame, textvariable=self.level_var,
                                  values=["Highest Compression", "Fastest Processing Time"],
                                  state="readonly", width=20)
        level_combo.grid(row=0, column=3, sticky=tk.W, padx=5)
        
        # Row 2: Solid Mode and Dictionary Size
        ttk.Label(frame, text="Solid Mode:").grid(row=1, column=0, sticky=tk.W, padx=5, pady=5)
        self.solid_var = tk.StringVar(value=self.config.solid_mode)
        solid_combo = ttk.Combobox(frame, textvariable=self.solid_var,
                                  values=["On", "Off", "Auto"],
                                  state="readonly", width=15)
        solid_combo.grid(row=1, column=1, sticky=tk.W, padx=5, pady=5)
        
        ttk.Label(frame, text="Dictionary Size:").grid(row=1, column=2, sticky=tk.W, padx=5, pady=5)
        self.dict_var = tk.StringVar(value=self.config.dictionary_size)
        dict_combo = ttk.Combobox(frame, textvariable=self.dict_var,
                                 values=["Auto", "64MB", "128MB", "256MB", "512MB", "1GB"],
                                 state="readonly", width=20)
        dict_combo.grid(row=1, column=3, sticky=tk.W, padx=5, pady=5)
        
        # Row 3: PAR2 and Verification
        ttk.Label(frame, text="PAR2 Recovery:").grid(row=2, column=0, sticky=tk.W, padx=5, pady=5)
        self.par2_var = tk.StringVar(value=self.config.par2_required)
        par2_combo = ttk.Combobox(frame, textvariable=self.par2_var,
                                 values=["Yes", "No"],
                                 state="readonly", width=15)
        par2_combo.grid(row=2, column=1, sticky=tk.W, padx=5, pady=5)
        
        ttk.Label(frame, text="PAR2 Redundancy:").grid(row=2, column=2, sticky=tk.W, padx=5, pady=5)
        self.redundancy_var = tk.StringVar(value=self.config.par2_redundancy)
        redundancy_combo = ttk.Combobox(frame, textvariable=self.redundancy_var,
                                       values=["5.0%", "10.0%", "15.0%", "20.0%", "30.0%"],
                                       state="readonly", width=20)
        redundancy_combo.grid(row=2, column=3, sticky=tk.W, padx=5, pady=5)
        
        # Row 4: Threads and Script Mode
        ttk.Label(frame, text="Threads:").grid(row=3, column=0, sticky=tk.W, padx=5, pady=5)
        self.threads_var = tk.StringVar(value=self.config.threads)
        threads_combo = ttk.Combobox(frame, textvariable=self.threads_var,
                                    values=["Auto", "1", "2", "4", "8", "16"],
                                    state="readonly", width=15)
        threads_combo.grid(row=3, column=1, sticky=tk.W, padx=5, pady=5)
        
        ttk.Label(frame, text="Script Mode:").grid(row=3, column=2, sticky=tk.W, padx=5, pady=5)
        self.mode_var = tk.StringVar(value=self.config.script_mode)
        mode_combo = ttk.Combobox(frame, textvariable=self.mode_var,
                                 values=["GUI", "GUI_Dump"],
                                 state="readonly", width=20)
        mode_combo.grid(row=3, column=3, sticky=tk.W, padx=5, pady=5)
        
        # Checkboxes
        self.verify_var = tk.BooleanVar(value=self.config.verify_after_create)
        ttk.Checkbutton(frame, text="Verify after creation", 
                       variable=self.verify_var).grid(row=4, column=0, columnspan=2, 
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
        self.current_archive_label = ttk.Label(frame, text="Ready to compress")
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
        frame = ttk.LabelFrame(parent, text="Compression Log", padding="10")
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
        
        self.start_button = ttk.Button(frame, text="Start Compression", 
                                      command=self.start_compression,
                                      style="Accent.TButton")
        self.start_button.pack(side=tk.LEFT, padx=5)
        
        self.stop_button = ttk.Button(frame, text="Stop", 
                                     command=self.stop_compression,
                                     state="disabled")
        self.stop_button.pack(side=tk.LEFT, padx=5)
        
        ttk.Button(frame, text="Exit", command=self.root.quit).pack(side=tk.LEFT, padx=5)
    # ------------------------------------------------------------
    
    # FUNCTION | Select folders for compression
    # ------------------------------------------------------------
    def select_folders(self):
        """Open dialog to select multiple folders"""
        # Windows specific: Allow multiple folder selection
        import ctypes
        from ctypes import wintypes
        
        # Use native Windows dialog for folder selection
        folder = filedialog.askdirectory(title="Select folder containing archives to compress")
        
        if folder:
            folder_path = Path(folder)
            # Get all subdirectories as individual archives
            for item in folder_path.iterdir():
                if item.is_dir() and item not in self.selected_folders:
                    self.selected_folders.append(item)
                    self.folders_listbox.insert(tk.END, str(item))
                    
            self.update_archive_count()
    # ------------------------------------------------------------
    
    # FUNCTION | Clear folder selection
    # ------------------------------------------------------------
    def clear_selection(self):
        """Clear all selected folders"""
        self.selected_folders.clear()
        self.folders_listbox.delete(0, tk.END)
        self.update_archive_count()
    # ------------------------------------------------------------
    
    # FUNCTION | Update archive count display
    # ------------------------------------------------------------
    def update_archive_count(self):
        """Update the archive count label"""
        count = len(self.selected_folders)
        self.archive_count_label.config(text=f"Archives to create: {count}")
        
        # Also update branding panel info
        self.update_branding_info()
    # ------------------------------------------------------------
    
    # FUNCTION | Update branding panel info
    # ------------------------------------------------------------
    def update_branding_info(self):
        """Update the info labels in the branding panel"""
        if hasattr(self, 'selected_info_label'):
            count = len(self.selected_folders)
            self.selected_info_label.config(text=f"Selected Folders: {count}")
            self.archives_info_label.config(text=f"Archives to create: {count}")
            
            # Update compression info from current settings
            if hasattr(self, 'method_var'):
                self.method_info_label.config(text=self.method_var.get())
                self.level_info_label.config(text=self.level_var.get())
                par2_text = f"{self.par2_var.get()}"
                if self.par2_var.get() == "Yes":
                    par2_text += f" ({self.redundancy_var.get()})"
                self.par2_info_label.config(text=par2_text)
    # ------------------------------------------------------------
    
    # FUNCTION | Update configuration from UI
    # ------------------------------------------------------------
    def update_config_from_ui(self):
        """Update configuration object from UI values"""
        self.config.compression_method = self.method_var.get()
        self.config.compression_level = self.level_var.get()
        self.config.solid_mode = self.solid_var.get()
        self.config.dictionary_size = self.dict_var.get()
        self.config.threads = self.threads_var.get()
        self.config.par2_required = self.par2_var.get()
        self.config.par2_redundancy = self.redundancy_var.get()
        self.config.script_mode = self.mode_var.get()
        self.config.verify_after_create = self.verify_var.get()
    # ------------------------------------------------------------
    
    # FUNCTION | Start compression process
    # ------------------------------------------------------------
    def start_compression(self):
        """Start the compression process in a separate thread"""
        if not self.selected_folders:
            messagebox.showwarning("No Folders Selected", 
                                  "Please select folders to compress first.")
            return
            
        # Update configuration
        self.update_config_from_ui()
        
        # Update engine configuration
        self.engine.config = self.config
        self.engine.archives_to_process = self.selected_folders.copy()
        
        # Disable controls
        self.start_button.config(state="disabled")
        self.stop_button.config(state="normal")
        
        # Clear log
        self.log_text.delete(1.0, tk.END)
        self.engine.log_messages.clear()
        self.engine.archive_statistics.clear()
        
        # Start compression in separate thread
        self.engine.is_processing = True
        self.processing_thread = threading.Thread(target=self.compression_worker)
        self.processing_thread.start()
        
        # Start UI update timer
        self.root.after(100, self.update_ui)
    # ------------------------------------------------------------
    
    # FUNCTION | Compression worker thread
    # ------------------------------------------------------------
    def compression_worker(self):
        """Worker thread for compression operations"""
        total_archives = len(self.engine.archives_to_process)
        
        # PREPROCESSING STEP: Purge backup files from all folders
        if total_archives > 0:
            self.engine.log(f"\n{'#'*60}")
            self.engine.log(f"PHASE: PREPROCESSING - BACKUP FILE REMOVAL")
            self.engine.log(f"{'#'*60}")
            
            # Create backup purger with engine's log callback
            backup_purger = BackupFilePurger(log_callback=self.engine.log)
            
            # Purge backup files from all selected folders
            backup_stats = backup_purger.purge_backup_files_batch(self.engine.archives_to_process)
            
            # Store backup statistics in engine for potential reporting
            self.engine.backup_purge_statistics = backup_stats
        
        # MAIN COMPRESSION LOOP
        for index, folder in enumerate(self.engine.archives_to_process, 1):
            if not self.engine.is_processing:
                break
                
            self.engine.current_archive_index = index
            
            # Log start of archive
            self.engine.log(f"\n{'='*50}")
            self.engine.log(f"PHASE: COMPRESSION - Archive {index} of {total_archives}")
            self.engine.log(f"Folder: {folder.name}")
            self.engine.log(f"{'='*50}")
            
            # Compress archive
            stats = self.engine.compress_archive(folder, index, total_archives)
            self.engine.archive_statistics.append(stats)
            
            # Log formatted statistics
            log_output = self.engine.format_archive_log(stats, index, total_archives)
            for line in log_output.split('\n'):
                self.engine.log(line)
                
        self.engine.is_processing = False
    # ------------------------------------------------------------
    
    # FUNCTION | Update UI during processing
    # ------------------------------------------------------------
    def update_ui(self):
        """Update UI elements during compression"""
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
                current_folder = self.engine.archives_to_process[current - 1]
                self.current_archive_label.config(
                    text=f"Compressing: {current_folder.name} ({current}/{total})"
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
            # Compression complete
            self.compression_complete()
    # ------------------------------------------------------------
    
    # FUNCTION | Handle compression completion
    # ------------------------------------------------------------
    def compression_complete(self):
        """Handle completion of compression process"""
        # Update progress to 100%
        self.progress_var.set(100)
        self.progress_label.config(text="100%")
        
        # Count successes and failures
        successful = sum(1 for s in self.engine.archive_statistics if s.success)
        failed = sum(1 for s in self.engine.archive_statistics if not s.success)
        
        # Update status
        self.current_archive_label.config(text="Compression complete")
        self.status_label.config(
            text=f"Status: Complete - {successful} successful, {failed} failed"
        )
        
        # Re-enable controls
        self.start_button.config(state="normal")
        self.stop_button.config(state="disabled")
        
        # Save log to file if GUI_Dump mode is selected
        self.engine.save_log_to_file()
        
        # Show completion message
        if failed == 0:
            messagebox.showinfo("Compression Complete", 
                              f"Successfully compressed {successful} archives!")
        else:
            messagebox.showwarning("Compression Complete with Errors",
                                 f"Compressed {successful} archives.\n{failed} archives failed.")
    # ------------------------------------------------------------
    
    # FUNCTION | Stop compression process
    # ------------------------------------------------------------
    def stop_compression(self):
        """Stop the compression process"""
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
    print("STANDARD ARCHIVAL COMPRESSION SCRIPT")
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
        app = ArchivalCompressionGUI()
        app.run()

if __name__ == "__main__":
    main()
# endregion -------------------------------------------------------------------