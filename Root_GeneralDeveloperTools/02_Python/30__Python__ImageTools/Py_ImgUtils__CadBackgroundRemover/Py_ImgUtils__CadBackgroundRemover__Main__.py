# =============================================================================
# VALEDESIGNSUITE - CAD BACKGROUND REMOVER
# =============================================================================
#
# FILE      : Py_ImgUtils__CadBackgroundRemover__Main__.py
# NAMESPACE : Py_ImgUtils__CadBackgroundRemover
# MODULE    : CadBackgroundRemoverApp
# AUTHOR    : Adam Noble - Noble Architecture
# PURPOSE   : Remove light/white backgrounds from CAD linework images
# CREATED   : 09-Jun-2026
#
# DESCRIPTION:
# - Accepts PNG, JPG and JPEG files via a persistent GUI.
# - Converts images to greyscale luminance and derives per-pixel alpha.
# - Pixels brighter than WHITE_THRESHOLD become fully transparent.
# - Pixels darker than BLACK_THRESHOLD become fully opaque dark linework.
# - Pixels between the two thresholds fade smoothly (anti-aliased edges).
# - Outputs a fixed dark CAD line colour (LINE_RGB) with computed transparency.
# - Saves each output as a transparent PNG beside the original source file.
# - Appends "__BackroundRemvoed" to each output filename (intentional spelling).
# - White and Black thresholds are adjustable via live GUI sliders.
# - Pillow is installed automatically if it is missing.
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 09-Jun-2026 - Version 1.0.0
# - Initial Release - refactored from Background_Remover_Tkinter_FULL.py
# - Full persistent GUI with threshold sliders and progress bar.
# - Integrated with Noble Python App Launcher (30__Python__ImageTools).
#
# =============================================================================


# =============================================================================
# PHASE 1 : LOADING LIBRARIES
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Standard Library Imports
# -----------------------------------------------------------------------------
import os                                                                     # <-- File system operations
import sys                                                                    # <-- System path manipulation
import logging                                                                # <-- Logging functionality
import subprocess                                                             # <-- Auto-install Pillow
import tkinter as tk                                                          # <-- GUI framework
from tkinter import filedialog, messagebox, ttk                               # <-- Dialog boxes and widgets
from pathlib import Path                                                      # <-- Path handling
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Load PIL (Pillow) - with auto-install fallback
# -----------------------------------------------------------------------------
def _Na__DependencyUtil__InstallPillowIfMissing() -> None:
    # Silently returns if Pillow is already available. Otherwise prompts the
    # user before calling pip, so no silent network activity occurs.
    try:
        import PIL  # noqa: F401                                              # <-- Test if Pillow is installed
        return
    except ImportError:
        pass

    try:
        _probe_root = tk.Tk()                                                 # <-- Temporary root for dialog
        _probe_root.withdraw()
        _probe_root.attributes("-topmost", True)

        should_install = messagebox.askyesno(
            "Pillow is required",
            "This tool needs the Pillow image library.\n\n"
            "Pillow is not currently installed.\n\n"
            "Click Yes to install it automatically."
        )
        _probe_root.destroy()

        if not should_install:
            sys.exit("Pillow is required. Install with: pip install pillow")

        subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow"])

    except Exception as install_error:
        try:
            _err_root = tk.Tk()
            _err_root.withdraw()
            _err_root.attributes("-topmost", True)
            messagebox.showerror(
                "Could not install Pillow",
                "Pillow could not be installed automatically.\n\n"
                "Open Command Prompt and run:\n\n"
                "pip install pillow\n\n"
                f"Error:\n{install_error}"
            )
            _err_root.destroy()
        except Exception:
            pass

        sys.exit(1)


_Na__DependencyUtil__InstallPillowIfMissing()

from PIL import Image, ImageOps  # noqa: E402                                # <-- Import after install check
# endregion -------------------------------------------------------------------


# =============================================================================
# PHASE 2 : INITIALISATION
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Logging Setup
# -----------------------------------------------------------------------------
_script_dir = os.path.dirname(os.path.abspath(__file__))                     # <-- Resolve script directory

logging.basicConfig(
    filename=os.path.join(_script_dir, "Py_ImgUtils__CadBackgroundRemover.log"),
    level=logging.INFO,                                                       # <-- Log level INFO
    format="%(asctime)s | %(levelname)s | %(message)s",                      # <-- Timestamp pipe format
)
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Application Constants
# -----------------------------------------------------------------------------
OUTPUT_SUFFIX             = "__BackroundRemvoed"                              # <-- Intentional spelling preserved
LINE_RGB                  = (20, 20, 20)                                     # <-- Dark CAD-style output colour
VALID_INPUT_EXTENSIONS    = {".png", ".jpg", ".jpeg"}                        # <-- Accepted input formats

DEFAULT_WHITE_THRESHOLD   = 238                                              # <-- Default fully-transparent cutoff
DEFAULT_BLACK_THRESHOLD   = 135                                              # <-- Default fully-opaque cutoff
WHITE_THRESHOLD_MIN       = 150                                              # <-- Slider lower bound (white)
WHITE_THRESHOLD_MAX       = 255                                              # <-- Slider upper bound (white)
BLACK_THRESHOLD_MIN       = 50                                               # <-- Slider lower bound (black)
BLACK_THRESHOLD_MAX       = 230                                              # <-- Slider upper bound (black)

WINDOW_TITLE              = "CAD Background Remover"                         # <-- Main window title
WINDOW_GEOMETRY           = "540x520"                                        # <-- Fixed window size
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Load Common Icon Loader
# -----------------------------------------------------------------------------
_parent_dir       = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))    # <-- Navigate up to 02_Python root
_icon_loader_path = os.path.join(_parent_dir, "02__Python__CommonLocalCodeLibs")   # <-- Path to shared libs

if _icon_loader_path not in sys.path:                                              # <-- Avoid duplicate entries
    sys.path.insert(0, os.path.abspath(_icon_loader_path))                         # <-- Prepend for import priority

try:
    from Py_CoreCommonUtils__IconLoaderAndHandling import set_noble_icon  # type: ignore  # <-- Noble icon handler
    logging.info("Noble Architecture icon loader imported successfully")
except ImportError as _icon_err:
    logging.warning(f"Icon loader unavailable: {_icon_err}. Default icon will be used.")

    def set_noble_icon(window) -> None:                                       # <-- Fallback no-op
        pass
# endregion -------------------------------------------------------------------


# =============================================================================
# PHASE 3 : MAIN APPLICATION CLASS
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | CAD Background Remover Application Class
# -----------------------------------------------------------------------------
class CadBackgroundRemoverApp:
    # Persistent Tkinter GUI for removing light backgrounds from CAD linework.
    # Threshold sliders allow live-tuning without restarting the tool.

    # FUNCTION | Class Initialisation
    # ------------------------------------------------------------
    def __init__(self, root: tk.Tk) -> None:
        self.root = root                                                      # <-- Store root window reference
        self.root.title(WINDOW_TITLE)                                         # <-- Set window title from constant
        self.root.geometry(WINDOW_GEOMETRY)                                   # <-- Apply fixed window size
        self.root.resizable(False, False)                                     # <-- Lock window dimensions
        set_noble_icon(self.root)                                             # <-- Apply Noble Architecture icon

        self.white_threshold_var = tk.IntVar(value=DEFAULT_WHITE_THRESHOLD)   # <-- White threshold slider state
        self.black_threshold_var = tk.IntVar(value=DEFAULT_BLACK_THRESHOLD)   # <-- Black threshold slider state

        self.white_label   = None                                             # <-- Live white threshold label ref
        self.black_label   = None                                             # <-- Live black threshold label ref
        self.progress      = None                                             # <-- Progress bar ref
        self.status_label  = None                                             # <-- Status label ref

        self._build_gui()                                                     # <-- Construct the GUI layout
        logging.info("CadBackgroundRemoverApp initialised")
    # ------------------------------------------------------------

    # FUNCTION | Build GUI Layout
    # ------------------------------------------------------------
    def _build_gui(self) -> None:
        # Construct the complete GUI layout: title, threshold controls,
        # action button, progress bar and status label.

        # Title
        tk.Label(
            self.root,
            text="CAD Background Remover",
            font=("Arial", 12, "bold")
        ).pack(pady=(12, 2))

        tk.Label(
            self.root,
            text="Remove light backgrounds from CAD linework images",
            font=("Arial", 9),
            fg="gray"
        ).pack(pady=(0, 10))

        # Threshold controls frame
        threshold_frame = tk.LabelFrame(
            self.root,
            text="Luminance Thresholds",
            font=("Arial", 10, "bold"),
            padx=15,
            pady=12
        )
        threshold_frame.pack(pady=6, padx=20, fill="x")

        # White threshold section
        tk.Label(
            threshold_frame,
            text="White Threshold  —  pixels brighter than this become transparent",
            font=("Arial", 9)
        ).pack(anchor="w")

        white_slider_row = tk.Frame(threshold_frame)                          # <-- Row for slider + value label
        white_slider_row.pack(fill="x", pady=(4, 0))

        tk.Scale(
            white_slider_row,
            from_=WHITE_THRESHOLD_MIN,                                        # <-- Lower slider bound
            to=WHITE_THRESHOLD_MAX,                                           # <-- Upper slider bound
            orient="horizontal",
            variable=self.white_threshold_var,                                # <-- Bound IntVar
            command=self._update_white_label,                                 # <-- Update label on drag
            showvalue=False,                                                  # <-- Hide native value bubble
            length=370
        ).pack(side="left", fill="x", expand=True)

        self.white_label = tk.Label(
            white_slider_row,
            text=str(DEFAULT_WHITE_THRESHOLD),
            font=("Arial", 10, "bold"),
            width=5
        )
        self.white_label.pack(side="left", padx=(6, 0))

        tk.Label(
            threshold_frame,
            text="Lower = fewer transparent pixels  |  Raise if background still shows",
            font=("Arial", 8),
            fg="#888888"
        ).pack(anchor="w", pady=(2, 12))

        # Separator
        tk.Frame(threshold_frame, height=1, bg="#cccccc").pack(fill="x", pady=(0, 10))

        # Black threshold section
        tk.Label(
            threshold_frame,
            text="Black Threshold  —  pixels darker than this become fully opaque",
            font=("Arial", 9)
        ).pack(anchor="w")

        black_slider_row = tk.Frame(threshold_frame)                          # <-- Row for slider + value label
        black_slider_row.pack(fill="x", pady=(4, 0))

        tk.Scale(
            black_slider_row,
            from_=BLACK_THRESHOLD_MIN,                                        # <-- Lower slider bound
            to=BLACK_THRESHOLD_MAX,                                           # <-- Upper slider bound
            orient="horizontal",
            variable=self.black_threshold_var,                                # <-- Bound IntVar
            command=self._update_black_label,                                 # <-- Update label on drag
            showvalue=False,                                                  # <-- Hide native value bubble
            length=370
        ).pack(side="left", fill="x", expand=True)

        self.black_label = tk.Label(
            black_slider_row,
            text=str(DEFAULT_BLACK_THRESHOLD),
            font=("Arial", 10, "bold"),
            width=5
        )
        self.black_label.pack(side="left", padx=(6, 0))

        tk.Label(
            threshold_frame,
            text="Lower = lighter linework retained  |  Raise to keep only dark lines",
            font=("Arial", 8),
            fg="#888888"
        ).pack(anchor="w", pady=(2, 8))

        # Reset button (right-aligned within frame)
        tk.Button(
            threshold_frame,
            text="Reset to Defaults",
            command=self._reset_defaults,                                     # <-- Restore default values
            font=("Arial", 8),
            cursor="hand2"
        ).pack(anchor="e")

        # Action button
        tk.Button(
            self.root,
            text="Select Images & Remove Background",
            command=self._select_and_process,                                 # <-- Launch file dialog + batch
            font=("Arial", 10, "bold"),
            bg="#4a7cb1",
            fg="white",
            activebackground="#3a6ca1",
            activeforeground="white",
            cursor="hand2",
            padx=12,
            pady=6
        ).pack(pady=16)

        # Progress bar
        self.progress = ttk.Progressbar(
            self.root,
            orient="horizontal",
            length=490,
            mode="determinate"
        )
        self.progress.pack(pady=(0, 6))

        # Status label
        self.status_label = tk.Label(
            self.root,
            text="Ready",
            font=("Arial", 9),
            fg="green"
        )
        self.status_label.pack(pady=(0, 10))
    # ------------------------------------------------------------

    # FUNCTION | Update White Threshold Label
    # ------------------------------------------------------------
    def _update_white_label(self, value=None) -> None:
        # Refresh the live value label beside the white threshold slider.
        self.white_label.config(text=str(self.white_threshold_var.get()))     # <-- Show current slider value
    # ------------------------------------------------------------

    # FUNCTION | Update Black Threshold Label
    # ------------------------------------------------------------
    def _update_black_label(self, value=None) -> None:
        # Refresh the live value label beside the black threshold slider.
        self.black_label.config(text=str(self.black_threshold_var.get()))     # <-- Show current slider value
    # ------------------------------------------------------------

    # FUNCTION | Reset Sliders to Default Values
    # ------------------------------------------------------------
    def _reset_defaults(self) -> None:
        # Restore both threshold sliders to their original default values.
        self.white_threshold_var.set(DEFAULT_WHITE_THRESHOLD)                 # <-- Restore white threshold
        self.black_threshold_var.set(DEFAULT_BLACK_THRESHOLD)                 # <-- Restore black threshold
        self._update_white_label()                                            # <-- Sync white label
        self._update_black_label()                                            # <-- Sync black label
        logging.info("Thresholds reset to defaults")
    # ------------------------------------------------------------

    # FUNCTION | Select Images and Run Batch Processing
    # ------------------------------------------------------------
    def _select_and_process(self) -> None:
        # Open a multi-file dialog, validate selections, then process each
        # image through the background removal pipeline in sequence.

        input_paths = filedialog.askopenfilenames(
            title="Select PNG or JPEG images",
            filetypes=[
                ("Image files", "*.png *.jpg *.jpeg"),
                ("PNG files",   "*.png"),
                ("JPEG files",  "*.jpg *.jpeg"),
                ("All files",   "*.*"),
            ]
        )

        if not input_paths:                                                   # <-- User cancelled dialog
            return

        white_threshold = self.white_threshold_var.get()                     # <-- Snapshot slider values
        black_threshold = self.black_threshold_var.get()                     # <-- Snapshot slider values

        total            = len(input_paths)                                  # <-- Total selected files
        processed_count  = 0                                                 # <-- Successful conversions
        output_paths     = []                                                # <-- Paths of saved outputs
        failed_items     = []                                                # <-- Error descriptions

        self.progress.config(maximum=total, value=0)                         # <-- Configure progress bar
        self.status_label.config(text=f"Processing 0 of {total}...", fg="blue")
        self.root.update_idletasks()

        logging.info(
            f"Batch started: {total} file(s) | "
            f"white={white_threshold} black={black_threshold}"
        )

        for index, raw_path in enumerate(input_paths, start=1):
            input_path = Path(raw_path)

            self.status_label.config(
                text=f"Processing {index} of {total}:  {input_path.name}",
                fg="blue"
            )
            self.root.update_idletasks()                                     # <-- Refresh UI mid-batch

            if input_path.suffix.lower() not in VALID_INPUT_EXTENSIONS:
                failed_items.append(f"{input_path.name}  —  unsupported file type")
                self.progress["value"] = index
                continue

            output_path = self._build_output_path(input_path)               # <-- Derive output path

            try:
                self._process_single_image(input_path, output_path, white_threshold, black_threshold)
                processed_count += 1
                output_paths.append(output_path)
                logging.info(f"Saved: {output_path}")

            except Exception as proc_error:
                failed_items.append(f"{input_path.name}  —  {proc_error}")
                logging.error(f"Failed: {input_path} | {proc_error}", exc_info=True)

            self.progress["value"] = index                                   # <-- Advance progress bar
            self.root.update_idletasks()

        self._show_completion(processed_count, output_paths, failed_items)  # <-- Final result dialog
    # ------------------------------------------------------------

    # FUNCTION | Process a Single Image
    # ------------------------------------------------------------
    def _process_single_image(
        self,
        input_path: Path,
        output_path: Path,
        white_threshold: int,
        black_threshold: int
    ) -> None:
        # Load one image, derive luminance-based alpha, rebuild as dark
        # linework with transparency, and save as PNG.

        source_image = Image.open(input_path)                                # <-- Open source image
        source_image = ImageOps.exif_transpose(source_image)                 # <-- Correct EXIF rotation

        rgba_image     = source_image.convert("RGBA")                        # <-- Ensure RGBA colour mode
        luminance_image = rgba_image.convert("L")                            # <-- Derive greyscale luminance

        alpha_image = luminance_image.point(                                 # <-- Map luminance → alpha values
            lambda lum: self._luminance_to_alpha(lum, white_threshold, black_threshold)
        )

        output_image = Image.new("RGBA", rgba_image.size, LINE_RGB + (0,))   # <-- Base layer: dark CAD colour
        output_image.putalpha(alpha_image)                                   # <-- Apply computed alpha channel

        output_image.save(output_path, "PNG")                               # <-- Save transparent PNG
    # ------------------------------------------------------------

    # HELPER FUNCTION | Convert Luminance Value to Alpha
    # ------------------------------------------------------------
    def _luminance_to_alpha(self, luminance: int, white_threshold: int, black_threshold: int) -> int:
        # Returns 0 (transparent) for bright pixels, 255 (opaque) for dark
        # pixels, and a smooth linear fade between the two thresholds.

        if luminance >= white_threshold:                                      # <-- Bright pixel → transparent
            return 0

        if luminance <= black_threshold:                                      # <-- Dark pixel → fully opaque
            return 255

        alpha_range = max(1, white_threshold - black_threshold)              # <-- Guard against zero division
        alpha_ratio = (white_threshold - luminance) / alpha_range            # <-- Normalised fade position
        return int(max(0, min(255, round(alpha_ratio * 255))))               # <-- Clamp to valid alpha range
    # ------------------------------------------------------------

    # HELPER FUNCTION | Build Output File Path
    # ------------------------------------------------------------
    def _build_output_path(self, input_path: Path) -> Path:
        # Constructs the output path by appending OUTPUT_SUFFIX and
        # changing the extension to .png, saved beside the source file.
        return input_path.with_name(f"{input_path.stem}{OUTPUT_SUFFIX}.png") # <-- Same folder as source
    # ------------------------------------------------------------

    # FUNCTION | Show Completion Result Dialog
    # ------------------------------------------------------------
    def _show_completion(
        self,
        processed_count: int,
        output_paths: list,
        failed_items: list
    ) -> None:
        # Display a summary messagebox and update the status bar after
        # the batch run finishes, whether or not there were failures.

        if failed_items:
            fail_preview = "\n".join(failed_items[:12])                      # <-- Show up to 12 failures

            if len(failed_items) > 12:
                fail_preview += f"\n\n...and {len(failed_items) - 12} more."

            self.status_label.config(
                text=f"Done with errors  —  {processed_count} ok, {len(failed_items)} failed",
                fg="orange"
            )
            messagebox.showwarning(
                "Background Removal Complete (with errors)",
                f"Processed successfully: {processed_count}\n"
                f"Failed: {len(failed_items)}\n\n"
                f"Failed files:\n{fail_preview}"
            )

        else:
            example_line = ""
            if output_paths:
                example_line = f"\n\nExample output:\n{output_paths[0]}"

            self.status_label.config(
                text=f"Complete  —  {processed_count} image(s) processed",
                fg="green"
            )
            messagebox.showinfo(
                "Background Removal Complete",
                f"Processed successfully: {processed_count}\n\n"
                f"Transparent PNGs saved beside each source image."
                f"{example_line}"
            )

        self.progress["value"] = 0                                           # <-- Reset progress bar
        self.root.update_idletasks()
        logging.info(f"Batch complete: {processed_count} ok, {len(failed_items)} failed")
    # ------------------------------------------------------------

# endregion -------------------------------------------------------------------


# =============================================================================
# PHASE 4 : MAIN ENTRY POINT
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Main Execution
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    try:
        import ctypes
        ctypes.windll.user32.ShowWindow(ctypes.windll.kernel32.GetConsoleWindow(), 0)  # <-- Hide console window
    except Exception:
        pass                                                                  # <-- Non-Windows fallback

    root_app = tk.Tk()                                                        # <-- Create Tkinter root
    app = CadBackgroundRemoverApp(root_app)                                   # <-- Instantiate application
    root_app.mainloop()                                                       # <-- Start GUI event loop
# endregion -------------------------------------------------------------------
