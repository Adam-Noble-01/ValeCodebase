# =========================================================
# HEIC TO PNG CONVERTER
# =========================================================
#
# FILENAME  |  SnPy__ImgUtil__HeicToPngConverter.py
# DIRECTORY |  SnPy__ImgUtil__HeicToPngConverter/SnPy__ImgUtil__HeicToPngConverter.py
#
# AUTHOR    |  Adam Noble - Studio NoodlFjord
# DATE      |  2025-01-27
#
# DESCRIPTION
# - GUI utility for converting HEIC image files to PNG format
# - Supports batch conversion of multiple HEIC files
# - Preserves image quality and transparency during conversion
# - Uses PIL (Pillow) for image processing
# - Provides progress tracking and error handling
#
# DEVELOPMENT LOG
# 1.0.0 - 27-Jan-2025 |  Initial Development
# - Created basic HEIC to PNG conversion functionality
# - Implemented GUI with file selection and output directory selection
# - Added progress bar and status updates
# - Included error handling for file operations
#
# =========================================================

# IMPORTS | Standard and third-party libraries
# ------------------------------------------------------------
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from PIL import Image
import os
import sys
import logging

# HEIC SUPPORT | Import and register HEIC/HEIF support
# ------------------------------------------------------------
try:
    import pillow_heif
    pillow_heif.register_heif_opener()
    HEIC_SUPPORT = True
except ImportError:
    HEIC_SUPPORT = False
    logging.warning("HEIC/HEIF support not available. Install 'pillow-heif' package for HEIC support.")

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

# CLASS | Main HEIC to PNG Converter class
# ------------------------------------------------------------
class HeicToPngConverter:
    def __init__(self, root):
        self.root = root
        self.root.title("HEIC to PNG Converter")
        self.root.geometry("500x400")
        self.root.resizable(False, False)  # Prevent resizing for a more stable layout
        
        # Apply custom logo
        set_window_icon(self.root)

        self.heic_files = []
        self.output_dir = ""

        # Check HEIC support on startup
        if not HEIC_SUPPORT:
            self._show_heic_warning()

        # INTERFACE | GUI Elements setup
        # ------------------------------------------------------------
        self._build_gui()

    # METHOD | Show warning about missing HEIC support
    # ------------------------------------------------------------
    def _show_heic_warning(self):
        """Show a warning dialog about missing HEIC support."""
        messagebox.showwarning(
            "Limited HEIC Support",
            "HEIC/HEIF support is not available.\n\n"
            "To enable HEIC file conversion, please install the required package:\n\n"
            "pip install pillow-heif\n\n"
            "The application will continue to run, but HEIC files may not be processed correctly."
        )

    # METHOD | Build the main GUI layout and components
    # ------------------------------------------------------------
    def _build_gui(self):
        """Build the main GUI layout with all components."""
        
        # Input File Selection Frame
        self.input_frame = tk.LabelFrame(self.root, text="Input HEIC Files", padx=10, pady=10)
        self.input_frame.pack(pady=10, padx=10, fill="x")

        self.select_files_button = tk.Button(self.input_frame, text="Select HEIC Files", command=self.select_heic_files)
        self.select_files_button.pack(side=tk.LEFT, padx=5)

        self.file_count_label = tk.Label(self.input_frame, text="No files selected")
        self.file_count_label.pack(side=tk.LEFT, padx=10)

        # Output Directory Selection Frame
        self.output_frame = tk.LabelFrame(self.root, text="Output Directory", padx=10, pady=10)
        self.output_frame.pack(pady=10, padx=10, fill="x")

        self.select_output_button = tk.Button(self.output_frame, text="Select Output Directory", command=self.select_output_directory)
        self.select_output_button.pack(side=tk.LEFT, padx=5)

        self.output_dir_label = tk.Label(self.output_frame, text="No directory selected")
        self.output_dir_label.pack(side=tk.LEFT, padx=10)

        # Conversion Controls
        self.convert_button = tk.Button(self.root, text="Convert Selected Files", command=self.start_conversion, state=tk.DISABLED)
        self.convert_button.pack(pady=15)

        # Status and Progress
        self.status_label = tk.Label(self.root, text="Status: Idle", bd=1, relief=tk.SUNKEN, anchor=tk.W)
        self.status_label.pack(fill=tk.X, side=tk.BOTTOM, ipady=2)

        self.progress_bar = ttk.Progressbar(self.root, orient=tk.HORIZONTAL, length=480, mode='determinate')
        self.progress_bar.pack(pady=5, padx=10, fill="x")

    # METHOD | Open file dialog to select multiple HEIC files
    # ------------------------------------------------------------
    def select_heic_files(self):
        """Opens a file dialog to select multiple HEIC files."""
        filetypes = (("HEIC files", "*.heic *.HEIC"), ("All files", "*.*"))
        selected_files = filedialog.askopenfilenames(
            title="Select HEIC Files",
            filetypes=filetypes
        )
        if selected_files:
            self.heic_files = list(selected_files)
            self.file_count_label.config(text=f"{len(self.heic_files)} files selected")
            self.update_convert_button_state()
        else:
            self.heic_files = []
            self.file_count_label.config(text="No files selected")
            self.convert_button.config(state=tk.DISABLED)

    # METHOD | Open directory dialog to select output destination
    # ------------------------------------------------------------
    def select_output_directory(self):
        """Opens a directory dialog to select the output destination."""
        selected_dir = filedialog.askdirectory(
            title="Select Output Directory"
        )
        if selected_dir:
            self.output_dir = selected_dir
            self.output_dir_label.config(text=self.output_dir)
            self.update_convert_button_state()
        else:
            self.output_dir = ""
            self.output_dir_label.config(text="No directory selected")
            self.convert_button.config(state=tk.DISABLED)

    # HELPER FUNC | Enable convert button only when files and output directory are selected
    # ------------------------------------------------------------
    def update_convert_button_state(self):
        """Enables the convert button only if files and output directory are selected."""
        if self.heic_files and self.output_dir:
            self.convert_button.config(state=tk.NORMAL)
        else:
            self.convert_button.config(state=tk.DISABLED)

    # METHOD | Initiate the HEIC to PNG conversion process
    # ------------------------------------------------------------
    def start_conversion(self):
        """Initiates the HEIC to PNG conversion process."""
        if not self.heic_files or not self.output_dir:
            messagebox.showwarning("Missing Information", "Please select HEIC files and an output directory.")
            return

        # Check HEIC support before conversion
        if not HEIC_SUPPORT:
            result = messagebox.askyesno(
                "HEIC Support Warning",
                "HEIC support is not available. Conversion may fail.\n\n"
                "Do you want to continue anyway?"
            )
            if not result:
                return

        # Disable buttons during conversion
        self.select_files_button.config(state=tk.DISABLED)
        self.select_output_button.config(state=tk.DISABLED)
        self.convert_button.config(state=tk.DISABLED)
        self.status_label.config(text="Status: Converting...")
        self.progress_bar.config(maximum=len(self.heic_files), value=0)

        # CONVERSION | Process each HEIC file
        # ------------------------------------------------------------
        successful_conversions = 0
        for i, heic_path in enumerate(self.heic_files):
            base_name = os.path.splitext(os.path.basename(heic_path))[0]
            png_filename = f"{base_name}.png"
            output_path = os.path.join(self.output_dir, png_filename)

            self.status_label.config(text=f"Status: Converting {os.path.basename(heic_path)}...")
            self.progress_bar['value'] = i + 1
            self.root.update_idletasks()  # Update GUI immediately

            try:
                with Image.open(heic_path) as img:
                    # Ensure the image is in RGBA mode for proper PNG saving
                    if img.mode != 'RGBA':
                        img = img.convert('RGBA')
                    img.save(output_path, 'PNG')
                successful_conversions += 1
            except FileNotFoundError:
                self.status_label.config(text=f"Status: Error - File not found: {os.path.basename(heic_path)}")
                messagebox.showerror("Conversion Error", f"File not found: {heic_path}")
                # Continue processing other files
            except Exception as e:
                self.status_label.config(text=f"Status: Error converting {os.path.basename(heic_path)} - {e}")
                messagebox.showerror("Conversion Error", f"Failed to convert {os.path.basename(heic_path)}:\n{e}")
                # Continue processing other files

        # Re-enable buttons
        self.select_files_button.config(state=tk.NORMAL)
        self.select_output_button.config(state=tk.NORMAL)
        self.update_convert_button_state()  # Might be disabled again if files were processed

        self.status_label.config(text=f"Status: Conversion Complete. {successful_conversions}/{len(self.heic_files)} successful.")
        messagebox.showinfo("Conversion Finished", f"All conversions finished.\nSuccessful: {successful_conversions}\nFailed: {len(self.heic_files) - successful_conversions}")


# BLOCK | Main execution block
# ------------------------------------------------------------
if __name__ == "__main__":
    # Prevent console window from opening on Windows
    try:
        import ctypes
        ctypes.windll.user32.ShowWindow(ctypes.windll.kernel32.GetConsoleWindow(), 0)
    except:
        pass  # Fallback if console hiding fails
    
    root = tk.Tk()
    app = HeicToPngConverter(root)
    root.mainloop()