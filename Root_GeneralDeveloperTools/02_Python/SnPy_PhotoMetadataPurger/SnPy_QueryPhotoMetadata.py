# =========================================================
# PHOTO METADATA REPORTER
# =========================================================
#
# FILENAME  |  SnPy_PhotoMetadataReporter.py
# DIRECTORY |  C:\03_-_Adam-Noble-Tools\02_-_Python\SnPy_PhotoMetadataReporter\SnPy_PhotoMetadataReporter.py
#
# AUTHOR    |  Adam Noble - Studio NoodlFjord
# DATE      |  2025-06-18
#
# DESCRIPTION
# - This script provides a GUI to query and report all metadata from image files.
# - It is designed to validate the effectiveness of the 'SnPy_PhotoMetadataPurger.py' script.
# - The tool generates a comprehensive report in Markdown (.md) format.
# - The report details all found EXIF tags, IPTC, and other embedded information for each selected file.
# - This allows for a clear before-and-after comparison of image metadata.
#
# PIP DEPENDENCIES COMMAND LINE
# pip install Pillow
#
# DEVELOPMENT LOG
# 1.0.0 - 18-Jun-2025 |  Initial Development
# - Created a Tkinter GUI for selecting image files and generating a report.
# - Implemented core metadata extraction logic using Pillow, including the `ExifTags` module
#   to translate numeric tag IDs into human-readable names.
# - The output is a clean, well-formatted Markdown (.md) file.
# - The report includes a main header with the generation date and separate sections for each file.
# - For each file, both EXIF data (if present) and other `info` dictionary data are listed in tables.
# - A progress bar provides user feedback during report generation.
# - Follows the established coding conventions, including the icon loader and logging setup.
#
# =========================================================

import os
import sys
import logging
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from datetime import datetime
from pathlib import Path
from PIL import Image, ExifTags

# ------------------------------------------------------------
# LOADER | Icon Loader setup for the script
# ------------------------------------------------------------
# Add the sibling dependency directory to sys.path for imports                                            # <-- This adds the dependency path
dependency_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'SnPY_CommonDependencyFiles')  # <-- This builds the path
if dependency_path not in sys.path:                                                                       # <-- This checks if path exists in sys.path
    sys.path.append(os.path.abspath(dependency_path))                                                     # <-- This adds path if needed

try:
    from SnPy_Core_Utils_IconLoaderAndHandling import set_window_icon                                # type: ignore  # <-- This imports icon handler
except ImportError as e:                                                                             # <-- This catches import errors
    logging.warning(f"Could not import icon handling module: {e}. Windows will use default icons.")  # <-- This logs warning
    def set_window_icon(window):                                                                     # <-- This creates fallback function
        pass                                                                                         # <-- This does nothing as fallback
# ------------------------------------------------------------

# ------------------------------------------------------------
# LOADER | Logging setup for the script
# ------------------------------------------------------------
script_dir = os.path.dirname(os.path.abspath(__file__))
logging.basicConfig(
    filename=os.path.join(script_dir, "SnPy_PhotoMetadataReporter.log"),
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)

# ------------------------------------------------------------
# Photo Metadata Reporter Class Definition
# ------------------------------------------------------------
class PhotoMetadataReporterApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Photo Metadata Reporter")
        self.root.geometry("540x360")
        self.root.resizable(False, False)
        set_window_icon(self.root)

        self.selected_files: list[str] = []
        self._build_gui()

    # --------------------------------------------------
    # GUI Layout
    # --------------------------------------------------
    def _build_gui(self) -> None:
        tk.Label(self.root, text="Select images to generate a detailed metadata report.").pack(pady=8)

        # Listbox to show chosen files
        list_frame = tk.Frame(self.root)
        list_frame.pack(pady=5, padx=10)
        self.file_list = tk.Listbox(list_frame, height=10, width=80, selectmode=tk.EXTENDED)
        self.file_list.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=self.file_list.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.file_list.config(yscrollcommand=scrollbar.set)

        # Action buttons
        btn_frame = tk.Frame(self.root)
        btn_frame.pack(pady=10)
        tk.Button(btn_frame, text="Add Images", width=15, command=self._add_images).pack(side="left", padx=6)
        tk.Button(btn_frame, text="Remove Selected", width=15, command=self._remove_selection).pack(side="left", padx=6)
        tk.Button(btn_frame, text="Clear All", width=15, command=self._clear_all).pack(side="left", padx=6)
        
        # Main Action Button
        action_frame = tk.Frame(self.root)
        action_frame.pack(pady=5)
        tk.Button(
            action_frame, text="Generate Metadata Report", width=25,
            command=self._begin_report_generation, bg="#2a6e38", fg="white"
        ).pack()

        # Progress bar
        self.progress = ttk.Progressbar(self.root, orient="horizontal", length=500, mode="determinate")
        self.progress.pack(pady=12)

    # --------------------------------------------------
    # File Selection Handlers (Identical to Purger for consistency)
    # --------------------------------------------------
    def _add_images(self) -> None:
        files = filedialog.askopenfilenames(
            title="Select image files to analyze",
            filetypes=[("Image Files", "*.jpg *.jpeg *.png *.bmp *.tiff"), ("All Files", "*.*")]
        )
        if not files: return
        for f in files:
            if f not in self.selected_files:
                self.selected_files.append(f)
        self._refresh_listbox()

    def _remove_selection(self) -> None:
        selected_indices = list(self.file_list.curselection())
        if not selected_indices: return
        for idx in reversed(selected_indices):
            del self.selected_files[idx]
        self._refresh_listbox()
        
    def _clear_all(self) -> None:
        self.selected_files.clear()
        self._refresh_listbox()

    def _refresh_listbox(self) -> None:
        self.file_list.delete(0, tk.END)
        for f in self.selected_files:
            self.file_list.insert(tk.END, Path(f).name)
    
    # --------------------------------------------------
    # Report Generation Logic
    # --------------------------------------------------
    def _begin_report_generation(self) -> None:
        """Initiates the report generation process."""
        if not self.selected_files:
            messagebox.showwarning("No Images", "Please add at least one image file to analyze.")
            return

        report_path = self._get_output_path()
        if not report_path: # User cancelled save dialog
            return

        self.progress["value"] = 0
        self.progress["maximum"] = len(self.selected_files)
        # Use 'after' to allow the GUI to update before starting file I/O
        self.root.after(50, lambda p=report_path: self._generate_report(p))

    def _get_output_path(self) -> str | None:
        """Opens a save dialog and suggests a filename for the report."""
        date_fmt = datetime.now().strftime('%d-%b-%Y')
        default_name = f"Metadata_Report__{date_fmt}.md"
        return filedialog.asksaveasfilename(
            defaultextension=".md",
            initialfile=default_name,
            filetypes=[("Markdown File", "*.md"), ("Text File", "*.txt")],
            title="Save Metadata Report As",
        )
    
    def _generate_report(self, report_path: str) -> None:
        """Processes images and writes the metadata to a Markdown file."""
        try:
            with open(report_path, "w", encoding="utf-8") as f:
                # --- Write Report Header ---
                f.write("# Photo Metadata Report\n")
                f.write(f"**Generated on:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
                f.write("---\n\n")

                # --- Process Each File ---
                for image_path in self.selected_files:
                    f.write(f"## File: `{Path(image_path).name}`\n\n")
                    
                    exif_data, info_data = self._extract_metadata(image_path)
                    
                    # --- Write EXIF Data Table ---
                    f.write("### EXIF Data\n")
                    if exif_data:
                        f.write("| Tag ID | Tag Name | Value |\n")
                        f.write("|:-------|:---------|:------|\n")
                        for tag_id, name, value in exif_data:
                            # Sanitize value for Markdown table (replace pipes)
                            value_str = str(value).replace("|", "\\|")
                            f.write(f"| {tag_id} | `{name}` | {value_str} |\n")
                        f.write("\n")
                    else:
                        f.write("*No EXIF data found.*\n\n")

                    # --- Write Other Info Table ---
                    f.write("### Other Embedded Info (`image.info`)\n")
                    if info_data:
                        f.write("| Key | Value |\n")
                        f.write("|:----|:------|\n")
                        for key, value in info_data.items():
                            # Truncate long binary data for readability
                            value_str = str(value)
                            if isinstance(value, bytes):
                                value_str = f"Binary Data (first 64 bytes): {value[:64]}..."
                            value_str = value_str.replace("|", "\\|")
                            f.write(f"| `{key}` | {value_str} |\n")
                        f.write("\n")
                    else:
                        f.write("*No other embedded info found.*\n\n")

                    f.write("---\n\n")
                    self._tick_progress()

            messagebox.showinfo("Success", f"Metadata report generated successfully:\n\n{report_path}")

        except Exception as e:
            logging.error(f"Failed to generate report: {e}", exc_info=True)
            messagebox.showerror("Error", f"Could not generate report.\n\nReason: {e}")
        
        self.progress["value"] = 0

    def _extract_metadata(self, image_path: str) -> tuple[list, dict]:
        """Extracts EXIF and other info from a single image file."""
        exif_list = []
        info_dict = {}
        try:
            with Image.open(image_path) as img:
                # 1. Extract raw EXIF data
                raw_exif = img._getexif()
                if raw_exif:
                    for tag_id, value in raw_exif.items():
                        # Get human-readable tag name, fallback to tag_id if unknown
                        tag_name = ExifTags.TAGS.get(tag_id, tag_id)
                        # Decode bytes for readability, replace errors
                        if isinstance(value, bytes):
                            value = value.decode(errors='replace').strip('\x00')
                        exif_list.append((tag_id, tag_name, value))
                
                # 2. Extract other info (XMP, IPTC, etc., stored in the 'info' dict)
                if img.info:
                    info_dict = img.info

        except Exception as e:
            logging.warning(f"Could not read metadata from {image_path}. Reason: {e}")
        
        return exif_list, info_dict
    
    def _tick_progress(self) -> None:
        """Helper to advance the progress bar and update the GUI."""
        self.progress["value"] += 1
        self.root.update_idletasks()

# ------------------------------------------------------------
# Main Entry Point
# ------------------------------------------------------------
if __name__ == "__main__":
    logging.info("Starting Photo Metadata Reporter application.")
    root_app = tk.Tk()
    app = PhotoMetadataReporterApp(root_app)
    root_app.mainloop()
    logging.info("Application closed.")