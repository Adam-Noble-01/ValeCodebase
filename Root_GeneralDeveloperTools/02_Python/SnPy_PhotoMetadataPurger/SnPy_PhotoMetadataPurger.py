# =========================================================
# PHOTO METADATA PURGER
# =========================================================
#
# FILENAME  |  SnPy_PhotoMetadataPurger.py
# DIRECTORY |  C:\03_-_Adam-Noble-Tools\02_-_Python\SnPy_PhotoMetadataPurger\SnPy_PhotoMetadataPurger.py
#
# AUTHOR    |  Adam Noble - Studio NoodlFjord
# DATE      |  2025-06-18
#
# DESCRIPTION
# - This script provides a GUI to securely remove all metadata from image files.
# - It purges EXIF data, including GPS coordinates, camera information, and timestamps.
# - By re-saving the raw pixel data, it ensures no forensic metadata can be recovered.
# - The file's system creation and modification times are also reset upon saving the new file.
# - Users can process multiple images in a batch.
#
# PIP DEPENDENCIES COMMAND LINE
# pip install Pillow
#
# DEVELOPMENT LOG
# 1.0.0 - 18-Jun-2025 |  Initial Development
# - Created a Tkinter GUI for selecting and processing images.
# - Implemented the core metadata purging logic using the Pillow library.
# - The script loads an image, extracts only its raw pixel data, and saves it to a new file.
#   This method is highly effective at stripping all non-pixel information.
# - By default, purged images are saved with a "_purged" suffix to prevent data loss.
# - Added an optional (and dangerous) "Overwrite original files" checkbox with a confirmation dialog.
# - Included a progress bar and summary message for a clear user experience.
# - Adopted the standard icon loader utility and logging setup from sibling projects.
#
# =========================================================

import os
import sys
import logging
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from pathlib import Path
from PIL import Image

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
    filename=os.path.join(script_dir, "SnPy_PhotoMetadataPurger.log"),
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)

# ------------------------------------------------------------
# Photo Metadata Purger Class Definition
# ------------------------------------------------------------
class PhotoMetadataPurgerApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Photo Metadata Purger")
        self.root.geometry("540x380")
        self.root.resizable(False, False)
        set_window_icon(self.root)

        self.selected_files: list[str] = []
        self.overwrite_var = tk.BooleanVar(value=False)

        self._build_gui()

    # --------------------------------------------------
    # GUI Layout
    # --------------------------------------------------
    def _build_gui(self) -> None:
        tk.Label(self.root, text="Select images to securely remove all metadata.").pack(pady=8)

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

        # Main Action and Options
        action_frame = tk.Frame(self.root)
        action_frame.pack(pady=5)

        ttk.Checkbutton(
            action_frame,
            text="Overwrite original files (DANGEROUS)",
            variable=self.overwrite_var
        ).pack(side=tk.LEFT, padx=10)

        tk.Button(
            action_frame, text="Purge Metadata", width=20,
            command=self._begin_purging, bg="#a83232", fg="white"
        ).pack(side="left", padx=10)

        # Progress bar
        self.progress = ttk.Progressbar(self.root, orient="horizontal", length=500, mode="determinate")
        self.progress.pack(pady=12)

    # --------------------------------------------------
    # File Selection Handlers
    # --------------------------------------------------
    def _add_images(self) -> None:
        """Opens file dialog to select image files."""
        files = filedialog.askopenfilenames(
            title="Select image files",
            filetypes=[
                ("Image Files", "*.jpg *.jpeg *.png *.bmp *.tiff"),
                ("All Files", "*.*")
            ]
        )
        if not files:
            return
        
        for f in files:
            if f not in self.selected_files:
                self.selected_files.append(f)
        self._refresh_listbox()

    def _remove_selection(self) -> None:
        """Removes the currently selected items from the list."""
        selected_indices = list(self.file_list.curselection())
        if not selected_indices:
            return
        # Iterate backwards to avoid index shifting issues
        for idx in reversed(selected_indices):
            del self.selected_files[idx]
        self._refresh_listbox()
        
    def _clear_all(self) -> None:
        """Removes all files from the list."""
        self.selected_files.clear()
        self._refresh_listbox()

    def _refresh_listbox(self) -> None:
        """Updates the listbox with the current file list."""
        self.file_list.delete(0, tk.END)
        for f in self.selected_files:
            self.file_list.insert(tk.END, Path(f).name)

    # --------------------------------------------------
    # Core Processing Logic
    # --------------------------------------------------
    def _begin_purging(self) -> None:
        """Initiates the metadata purging process after checks."""
        if not self.selected_files:
            messagebox.showwarning("No Images", "Please add at least one image file to process.")
            return

        # <-- Confirmation dialog for the dangerous overwrite option
        if self.overwrite_var.get():
            confirm = messagebox.askyesno(
                "Confirm Overwrite",
                "WARNING: You have chosen to overwrite the original files.\n\n"
                "This action is permanent and cannot be undone.\n"
                "Are you absolutely sure you want to continue?",
                icon='warning'
            )
            if not confirm:
                return

        self.progress["value"] = 0
        self.progress["maximum"] = len(self.selected_files)
        # <-- Use 'after' to allow the GUI to update before starting the heavy work
        self.root.after(50, self._process_images)

    def _process_images(self) -> None:
        """Iterates through selected files and purges them one by one."""
        success_count = 0
        fail_count = 0
        overwrite = self.overwrite_var.get()

        for file_path in self.selected_files:
            try:
                purged_path = self._purge_single_image(file_path, overwrite)
                logging.info(f"Successfully purged: {file_path} -> {purged_path}")
                success_count += 1
            except Exception as e:
                logging.error(f"Failed to purge: {file_path}. Reason: {e}", exc_info=True)
                fail_count += 1
            self._tick_progress()
        
        # <-- Final summary message
        summary_message = (
            f"Purging complete.\n\n"
            f"Successfully processed: {success_count}\n"
            f"Failed: {fail_count}"
        )
        messagebox.showinfo("Process Complete", summary_message)
        self.progress["value"] = 0 # Reset progress bar

    def _purge_single_image(self, image_path: str, overwrite: bool) -> str:
        """
        Loads an image, strips its metadata, and saves it.
        This is the most critical function. It ensures a deep purge.
        """
        path = Path(image_path)
        
        with Image.open(image_path) as img:
            # --- CRITICAL SECTION ---
            # 1. Load the raw pixel data. `img.getdata()` could also be used.
            #    By creating a new image from raw bytes, we leave all metadata behind.
            pixel_data = img.tobytes()
            # 2. Create a new, clean image object from only the essential components.
            clean_img = Image.frombytes(img.mode, img.size, pixel_data)
            # --- END CRITICAL SECTION ---
        
        if overwrite:
            output_path = path
        else:
            # <-- Create new filename, e.g., "photo.jpg" -> "photo_purged.jpg"
            output_path = path.with_name(f"{path.stem}_purged{path.suffix}")
        
        # <-- Save the clean image. No metadata from the original is passed.
        #     Pillow may add a minimal header, but all EXIF/GPS/XMP data is gone.
        clean_img.save(output_path)
        
        return str(output_path)

    def _tick_progress(self) -> None:
        """Helper to advance the progress bar and update the GUI."""
        self.progress["value"] += 1
        self.root.update_idletasks() #<-- Forces GUI to redraw immediately

# ------------------------------------------------------------
# Main Entry Point
# ------------------------------------------------------------
if __name__ == "__main__":
    logging.info("Starting Photo Metadata Purger application.")
    root_app = tk.Tk()
    app = PhotoMetadataPurgerApp(root_app)
    root_app.mainloop()
    logging.info("Application closed.")