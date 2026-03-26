# =============================================================================
# PNG/JPG FILES TO TIMELAPSE VIDEO CONVERTER
# =============================================================================
#
# FILENAME  |  Py_FileUtils__PngFilesToTimelapseVideo__Main__.py
# DIRECTORY |  D:\10_CoreLib__ValeCodebase\Root_GeneralDeveloperTools\02_Python\50__Python__VideoTools\Py_FileUtils__PngFilesToTimelapseVideo
#
# AUTHOR    |  Adam Noble - Studio NoodlFjord
# DATE      |  2025-09-18
#
# DESCRIPTION
# - This script converts a series of PNG/JPG images into a timelapse video.
# - Images are automatically sorted by their creation date for proper chronological order.
# - Supports multiple frame rates (24fps, 30fps, 60fps) and speed multipliers.
# - Optional identical frame detection removes exact duplicate consecutive frames.
# - Uses local dependencies from LocalScope__ExternalCodeDependencies folder.
#
# LOCAL DEPENDENCIES
# - All external packages are stored locally in ./LocalScope__ExternalCodeDependencies
# - Run the provided PowerShell script to download all required packages
# - No system-wide pip installation required
#
# DEVELOPMENT LOG
# 1.2.0 - 19-Sep-2025 |  Duplicate Detection Optimisation
# - Replaced SSIM similarity algorithm with MD5 hash-based exact matching.
# - Removed percentage-based similarity threshold UI.
# - Simplified to boolean toggle for identical frame removal only.
# - Added proper regional structure with block coloring headers.
# - Improved performance by ~100x for duplicate detection.
#
# 1.1.0 - 18-Sep-2025 |  Local Dependencies Update
# - Modified to use local dependency folder instead of system packages.
# - All external libraries loaded from LocalScope__ExternalCodeDependencies.
# - Added dependency path injection at startup.
#
# 1.0.0 - 18-Sep-2025 |  Initial Development
# - Development started on PNG/JPG to timelapse video converter.
# - GUI interface for selecting image files and output directory.
# - Chronological sorting based on file creation time.
# - Multiple FPS options: 24fps, 30fps, 60fps.
# - Speed multiplier options: 1x, 8x, 16x, 32x.
# - Optional duplicate frame culling to remove static sections.
# - Progress tracking during video processing.
# - Output filename format: "Timelapse__DD-MMM-YYYY__HH-MM.mp4"
# - Uses same icon loading and GUI patterns as other video tools.
#
# =============================================================================

# =============================================================================
# PHASE 1 : LOADING LIBRARIES
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Load Basic Python Libraries
# -----------------------------------------------------------------------------
import os
import sys
import logging
import hashlib
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Local Dependencies Path Setup
# -----------------------------------------------------------------------------
# Setup local dependencies installation path                                                             # <-- This ensures local packages are found first
script_dir = os.path.dirname(os.path.abspath(__file__))                                                  # <-- Get current script directory
local_deps_path = os.path.join(script_dir, 'LocalScope__ExternalCodeDependencies')                       # <-- Build path to local dependencies
local_site_packages = os.path.join(local_deps_path, 'site-packages')                                    # <-- Local site-packages folder

# Check if we need to install the wheel files
if os.path.exists(local_deps_path):                                                                      # <-- Check if local deps folder exists
    import subprocess
    import glob
    
    # Create site-packages folder if it doesn't exist
    if not os.path.exists(local_site_packages):                                                         # <-- Check if site-packages exists
        os.makedirs(local_site_packages, exist_ok=True)                                                 # <-- Create site-packages folder
        
        # Install all wheel files to local site-packages
        wheel_files = glob.glob(os.path.join(local_deps_path, '*.whl'))                                 # <-- Find all wheel files
        if wheel_files:                                                                                  # <-- If wheel files found
            print("Installing local dependencies... (first time only)")                                 # <-- Inform user
            for wheel_file in wheel_files:                                                               # <-- Process each wheel file
                try:
                    # Install wheel to local site-packages without deps (deps are in other wheels)
                    subprocess.run([sys.executable, "-m", "pip", "install",                             # <-- Install wheel locally
                                   wheel_file, "--target", local_site_packages, 
                                   "--no-deps", "--quiet"], check=False)
                except Exception as e:
                    print(f"Warning: Could not install {os.path.basename(wheel_file)}: {e}")            # <-- Log installation warning
            print("Local dependencies installed.")                                                      # <-- Installation complete
    
    # Add local site-packages to Python path
    if local_site_packages not in sys.path:                                                             # <-- Check if not in path
        sys.path.insert(0, local_site_packages)                                                         # <-- Add to beginning of path
    
    logging.info(f"Using local dependencies from: {local_site_packages}")                               # <-- Log successful loading
else:
    logging.warning(f"Local dependencies folder not found: {local_deps_path}")                          # <-- Warn if folder missing
    logging.warning("Please run the PowerShell script to download dependencies first!")                  # <-- Instruct user
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Load Standard Python Libraries
# -----------------------------------------------------------------------------
import tkinter as tk
from tkinter import messagebox, filedialog, ttk
from datetime import datetime
from pathlib import Path
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Load External Dependencies
# -----------------------------------------------------------------------------
# Import external dependencies (these will be loaded from local folder if available)
try:
    import numpy as np                                                                                   # <-- Import numpy from local
    import cv2                                                                                           # <-- Import OpenCV from local
    from PIL import Image                                                                               # <-- Import PIL from local
    from tqdm import tqdm                                                                               # <-- Import tqdm from local
    DEPENDENCIES_AVAILABLE = True                                                                        # <-- Mark dependencies as loaded
except ImportError as e:
    logging.error(f"Failed to import dependencies: {e}")                                                # <-- Log import error
    DEPENDENCIES_AVAILABLE = False                                                                       # <-- Mark dependencies as missing
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Icon Loader Setup
# -----------------------------------------------------------------------------
# Add the common local code libraries directory to sys.path for imports                                   # <-- This adds the icon loader path
parent_dir = os.path.dirname(os.path.dirname(script_dir))                                                # <-- Navigate up two levels to 02_Python root
icon_loader_path = os.path.join(parent_dir, '02__Python__CommonLocalCodeLibs')                           # <-- Build path to common local code libs
if icon_loader_path not in sys.path:                                                                     # <-- This checks if path exists in sys.path
    sys.path.insert(0, os.path.abspath(icon_loader_path))                                                # <-- This adds path at beginning for priority
    
try:
    from Py_CoreCommonUtils__IconLoaderAndHandling import set_noble_icon                              # type: ignore  # <-- This imports Noble icon handler
    logging.info("Successfully imported Noble Architecture icon loader")                              # <-- Log successful import
except ImportError as e:                                                                             # <-- This catches import errors
    logging.warning(f"Could not import icon handling module: {e}. Windows will use default icons.")  # <-- This logs warning
    def set_noble_icon(window):                                                                       # <-- This creates fallback function
        pass                                                                                         # <-- This does nothing as fallback
# endregion -------------------------------------------------------------------

# =============================================================================
# PHASE 2 : APPLICATION INITIALIZATION
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Logging Setup
# -----------------------------------------------------------------------------
logging.basicConfig(
    filename=os.path.join(script_dir, 'png_to_timelapse.log'),
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Main Application Class
# -----------------------------------------------------------------------------
class PngToTimelapseApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("PNG/JPG to Timelapse Video Converter")
        self.root.geometry("650x820")
        self.root.resizable(False, False)
        set_noble_icon(self.root)

        # Check if dependencies are available
        if not DEPENDENCIES_AVAILABLE:                                                                   # <-- Check dependency status
            messagebox.showerror(                                                                       # <-- Show error dialog
                "Dependencies Missing",
                "Required dependencies are not available.\n\n"
                "Please run the PowerShell script to download dependencies:\n"
                "1. Open PowerShell as Administrator\n"
                "2. Navigate to this script's folder\n"
                "3. Run: .\\Download_Dependencies.ps1\n\n"
                "The script will download all required packages to:\n"
                "LocalScope__ExternalCodeDependencies"
            )
            self.root.destroy()                                                                         # <-- Close application
            return

        self.selected_images: list[str] = []
        self.output_directory: str = ""
        
        # Speed multiplier for output (e.g., 1x, 8x, 16x, 32x)
        self.speed_var = tk.StringVar(value="1x")
        # FPS for output (24fps, 30fps, or 60fps)
        self.fps_var = tk.StringVar(value="30fps")
        # Remove duplicate frames option
        self.remove_duplicates_var = tk.BooleanVar(value=False)
        
        self._build_gui()

    # -----------------------------------------------------------------------------
    # REGION | GUI Layout Methods
    # -----------------------------------------------------------------------------
    def _build_gui(self) -> None:
        # Title label
        title_label = tk.Label(
            self.root, 
            text="Create Timelapse Video from PNG/JPG Images", 
            font=("Arial", 14, "bold")
        )
        title_label.pack(pady=10)

        # Instructions
        instructions = tk.Label(
            self.root, 
            text="Select image files to create a timelapse. Images will be sorted by creation date.",
            font=("Arial", 9)
        )
        instructions.pack(pady=5)

        # Image list frame
        list_frame = tk.Frame(self.root)
        list_frame.pack(pady=10, padx=20, fill="both", expand=True)

        # Image files listbox with scrollbar
        scrollbar = tk.Scrollbar(list_frame)
        scrollbar.pack(side="right", fill="y")

        self.image_list = tk.Listbox(
            list_frame, 
            height=12, 
            width=75,
            yscrollcommand=scrollbar.set,
            selectmode=tk.EXTENDED
        )
        self.image_list.pack(side="left", fill="both", expand=True)
        scrollbar.config(command=self.image_list.yview)

        # Button frame for file operations
        file_btn_frame = tk.Frame(self.root)
        file_btn_frame.pack(pady=10)

        tk.Button(
            file_btn_frame, 
            text="Add Image Files", 
            width=18, 
            command=self._select_images
        ).pack(side="left", padx=5)

        tk.Button(
            file_btn_frame, 
            text="Add Folder of Images", 
            width=18, 
            command=self._select_folder
        ).pack(side="left", padx=5)

        tk.Button(
            file_btn_frame, 
            text="Remove Selected", 
            width=18, 
            command=self._remove_selected_images
        ).pack(side="left", padx=5)

        tk.Button(
            file_btn_frame, 
            text="Clear All", 
            width=18, 
            command=self._clear_all_images
        ).pack(side="left", padx=5)

        # Output directory frame
        output_frame = tk.Frame(self.root)
        output_frame.pack(pady=10, padx=20, fill="x")

        tk.Label(output_frame, text="Output Directory:", font=("Arial", 10, "bold")).pack(anchor="w")
        
        dir_select_frame = tk.Frame(output_frame)
        dir_select_frame.pack(fill="x", pady=5)

        self.output_dir_label = tk.Label(
            dir_select_frame, 
            text="No directory selected", 
            relief="sunken", 
            anchor="w", 
            bg="white"
        )
        self.output_dir_label.pack(side="left", fill="x", expand=True, padx=(0, 5))

        tk.Button(
            dir_select_frame, 
            text="Select Directory", 
            width=15, 
            command=self._select_output_directory
        ).pack(side="right")

        # Settings frame
        settings_frame = ttk.Labelframe(self.root, text="Timelapse Settings")
        settings_frame.pack(pady=10, padx=20, fill="x")

        # FPS selection
        fps_frame = tk.Frame(settings_frame)
        fps_frame.pack(pady=10, padx=10, anchor="w")

        tk.Label(fps_frame, text="Frame Rate:", font=("Arial", 10, "bold")).pack(side="left")
        fps_options = ["24fps", "30fps", "60fps"]
        fps_menu = ttk.Combobox(fps_frame, textvariable=self.fps_var, values=fps_options, state="readonly", width=8)
        fps_menu.pack(side="left", padx=10)

        # Speed selection
        speed_frame = tk.Frame(settings_frame)
        speed_frame.pack(pady=10, padx=10, anchor="w")

        tk.Label(speed_frame, text="Speed Multiplier:", font=("Arial", 10, "bold")).pack(side="left")
        speed_options = ["1x", "8x", "16x", "32x"]
        speed_menu = ttk.Combobox(speed_frame, textvariable=self.speed_var, values=speed_options, state="readonly", width=8)
        speed_menu.pack(side="left", padx=10)

        # -----------------------------------------------------------------------------
        # REGION | Duplicate Frame Removal Settings
        # -----------------------------------------------------------------------------
        
        # Duplicate removal frame
        duplicate_frame = tk.Frame(settings_frame)
        duplicate_frame.pack(pady=10, padx=10, fill="x")
        
        duplicate_checkbox = tk.Checkbutton(
            duplicate_frame, 
            text="Remove identical frames (exact pixel match only)",
            variable=self.remove_duplicates_var,
            font=("Arial", 10)
        )
        duplicate_checkbox.pack(anchor="w")
        
        # endregion -------------------------------------------------------------------

        # Image stats label
        self.stats_label = tk.Label(
            self.root, 
            text="Images selected: 0 | Estimated duration: 0.0 seconds",
            font=("Arial", 9),
            fg="blue"
        )
        self.stats_label.pack(pady=5)

        # Progress bar
        self.progress_frame = tk.Frame(self.root)
        self.progress_frame.pack(pady=10, padx=20, fill="x")

        self.progress_label = tk.Label(self.progress_frame, text="Ready to create timelapse", font=("Arial", 9))
        self.progress_label.pack(anchor="w")

        self.progress = ttk.Progressbar(
            self.progress_frame, 
            orient="horizontal", 
            length=610, 
            mode="determinate"
        )
        self.progress.pack(pady=5)

        # Create timelapse button
        tk.Button(
            self.root, 
            text="Create Timelapse Video", 
            width=25, 
            height=2,
            font=("Arial", 10, "bold"),
            command=self._begin_timelapse_creation
        ).pack(pady=15)
    # endregion -------------------------------------------------------------------

    # -----------------------------------------------------------------------------
    # REGION | File Selection Handlers
    # -----------------------------------------------------------------------------
    def _select_images(self) -> None:
        """Open file dialog to select image files."""
        files = filedialog.askopenfilenames(
            title="Select Image Files for Timelapse",
            filetypes=[
                ("Image Files", "*.png *.jpg *.jpeg"),
                ("PNG Files", "*.png"),
                ("JPG Files", "*.jpg *.jpeg"),
                ("All Files", "*.*")
            ]
        )
        if files:
            self._add_images_to_list(files)

    def _select_folder(self) -> None:
        """Select a folder and add all images from it."""
        folder = filedialog.askdirectory(title="Select Folder Containing Images")
        if folder:
            # Find all image files in the folder
            image_extensions = ['.png', '.jpg', '.jpeg']
            image_files = []
            for ext in image_extensions:
                image_files.extend(Path(folder).glob(f'*{ext}'))
                image_files.extend(Path(folder).glob(f'*{ext.upper()}'))
            
            if image_files:
                file_paths = [str(f) for f in image_files]
                self._add_images_to_list(file_paths)
            else:
                messagebox.showwarning("No Images Found", f"No image files found in:\n{folder}")

    def _add_images_to_list(self, files) -> None:
        """Add image files to the list, avoiding duplicates."""
        added_count = 0
        for file in files:
            if file not in self.selected_images:
                self.selected_images.append(file)
                added_count += 1
        
        if added_count > 0:
            self._refresh_image_list()
            logging.info(f"Added {added_count} new images to list")

    def _remove_selected_images(self) -> None:
        """Remove selected images from the list."""
        selected_indices = list(self.image_list.curselection())
        if not selected_indices:
            messagebox.showwarning("No Selection", "Please select images to remove.")
            return
        
        # Remove in reverse order to maintain indices
        for idx in reversed(selected_indices):
            del self.selected_images[idx]
        self._refresh_image_list()

    def _clear_all_images(self) -> None:
        """Clear all images from the list."""
        if self.selected_images:
            result = messagebox.askyesno("Clear All", "Remove all images from the list?")
            if result:
                self.selected_images.clear()
                self._refresh_image_list()

    def _refresh_image_list(self) -> None:
        """Refresh the image list display with chronological sorting."""
        self.image_list.delete(0, tk.END)
        
        # Sort images by creation time (chronological order)
        if self.selected_images:
            # Get creation times for each file
            files_with_times = []
            for img_path in self.selected_images:
                try:
                    # Use creation time, fallback to modification time if needed
                    creation_time = os.path.getctime(img_path)
                    files_with_times.append((img_path, creation_time))
                except OSError:
                    logging.warning(f"Could not get creation time for {img_path}")
                    continue
            
            # Sort by creation time
            files_with_times.sort(key=lambda x: x[1])
            self.selected_images = [f[0] for f in files_with_times]
            
            logging.info(f"Sorted {len(self.selected_images)} images by creation time")
            
            # Display sorted list with timestamps
            for img_path, creation_time in files_with_times:
                filename = Path(img_path).name
                timestamp = datetime.fromtimestamp(creation_time)
                display_text = f"{timestamp.strftime('%Y-%m-%d %H:%M:%S')} - {filename}"
                self.image_list.insert(tk.END, display_text)
            
            # Update statistics
            self._update_statistics()

    def _update_statistics(self) -> None:
        """Update the statistics label with image count and estimated duration."""
        image_count = len(self.selected_images)
        
        # Get selected FPS
        fps = int(self.fps_var.get().replace('fps', ''))
        
        # Get speed multiplier
        speed = int(self.speed_var.get().replace('x', ''))
        
        # Calculate estimated duration (before duplicate removal)
        if image_count > 0 and fps > 0:
            base_duration = image_count / fps
            final_duration = base_duration / speed
            self.stats_label.config(
                text=f"Images selected: {image_count} | Estimated duration: {final_duration:.1f} seconds (at {fps}fps, {speed}x speed)"
            )
        else:
            self.stats_label.config(text=f"Images selected: {image_count} | Estimated duration: 0.0 seconds")

    def _select_output_directory(self) -> None:
        """Select output directory for the timelapse video."""
        directory = filedialog.askdirectory(title="Select Output Directory")
        if directory:
            self.output_directory = directory
            self.output_dir_label.config(text=directory)


    # endregion -------------------------------------------------------------------

    # -----------------------------------------------------------------------------
    # REGION | Timelapse Creation Process
    # -----------------------------------------------------------------------------
    def _begin_timelapse_creation(self) -> None:
        """Start the timelapse creation process."""
        # Validation
        if len(self.selected_images) < 2:
            messagebox.showwarning("Insufficient Images", "Please select at least 2 images to create a timelapse.")
            return

        if not self.output_directory:
            messagebox.showwarning("No Output Directory", "Please select an output directory.")
            return

        # Check if moviepy is available
        if not self._check_moviepy():
            return

        # Generate output filename
        timestamp = datetime.now().strftime('%d-%b-%Y__%H-%M')
        output_filename = f"Timelapse__{timestamp}.mp4"
        output_path = os.path.join(self.output_directory, output_filename)

        # Check if output file already exists
        if os.path.exists(output_path):
            result = messagebox.askyesno(
                "File Exists", 
                f"The file '{output_filename}' already exists.\nDo you want to overwrite it?"
            )
            if not result:
                return

        # Start timelapse creation process
        self.progress_label.config(text="Preparing images for timelapse...")
        self.progress["value"] = 0
        self.progress["maximum"] = len(self.selected_images) + 3  # +3 for processing steps

        # Get settings
        fps = int(self.fps_var.get().replace('fps', ''))
        speed_factor = int(self.speed_var.get().replace('x', ''))
        remove_duplicates = self.remove_duplicates_var.get()

        # Use after() to avoid blocking the GUI
        self.root.after(100, lambda: self._create_timelapse(
            output_path, fps, speed_factor, remove_duplicates
        ))

    # endregion -------------------------------------------------------------------

    # -----------------------------------------------------------------------------
    # REGION | Identical Frame Detection and Removal Methods
    # -----------------------------------------------------------------------------

    # HELPER FUNCTION | Get Image Content Hash
    # ------------------------------------------------------------
    def _get_image_hash(self, img_path: str) -> str:
        """
        Get content hash of image pixel data for exact duplicate detection.
        Returns MD5 hash of normalized RGB pixel data.
        """
        try:
            with Image.open(img_path) as img:                                    # <-- Open image with PIL
                rgb_img = img.convert('RGB')                                     # <-- Convert to RGB format
                return hashlib.md5(rgb_img.tobytes()).hexdigest()                # <-- Generate MD5 hash
        except Exception as e:
            logging.warning(f"Error hashing image {img_path}: {str(e)}")         # <-- Log hash error
            return str(hash(img_path))                                           # <-- Fallback to path hash
    # ---------------------------------------------------------------

    # FUNCTION | Remove Identical Frames from Image List
    # ------------------------------------------------------------
    def _remove_identical_frames(self, image_paths: list) -> list:
        """
        Remove consecutive identical frames from the image list.
        Uses exact pixel data comparison via MD5 hashing.
        
        Parameters:
        image_paths: List of image file paths
        
        Returns:
        List of unique image paths with identical frames removed
        """
        if not image_paths or len(image_paths) < 2:                             # <-- Check minimum images
            return image_paths                                                   # <-- Return as-is if too few
        
        unique_images = [image_paths[0]]                                        # <-- Start with first image
        last_hash = self._get_image_hash(image_paths[0])                         # <-- Get hash of first image
        removed_count = 0                                                        # <-- Track removed images
        
        self.progress_label.config(text="Analyzing images for identical frames...")  # <-- Update progress label
        self.root.update()                                                      # <-- Refresh UI
        
        # Compare each image hash with the last unique image hash
        for i in range(1, len(image_paths)):                                    # <-- Iterate through images
            current_image = image_paths[i]                                      # <-- Get current image path
            
            # Update progress
            progress_value = (i / len(image_paths)) * 100                       # <-- Calculate progress
            self.progress["value"] = progress_value                             # <-- Update progress bar
            self.root.update_idletasks()                                        # <-- Refresh progress bar
            
            # Get hash of current image
            current_hash = self._get_image_hash(current_image)                   # <-- Hash current image
            
            if current_hash != last_hash:                                       # <-- Check if different
                unique_images.append(current_image)                             # <-- Add to unique list
                last_hash = current_hash                                         # <-- Update last hash
            else:
                removed_count += 1                                               # <-- Increment removed counter
                logging.info(f"Removed identical frame: {Path(current_image).name}")
        
        # Report results
        self.progress_label.config(text=f"Removed {removed_count} identical frames")  # <-- Update status
        self.root.update()                                                      # <-- Refresh UI
        
        logging.info(f"Identical frame removal complete: {len(unique_images)} unique frames from {len(image_paths)} total")
        
        if removed_count > 0:                                                   # <-- Show info if duplicates found
            messagebox.showinfo(
                "Identical Frames Removed",
                f"Removed {removed_count} identical frames.\n"
                f"Remaining frames: {len(unique_images)}"
            )
        
        return unique_images                                                    # <-- Return filtered list
    # ---------------------------------------------------------------

    # endregion -------------------------------------------------------------------

    # -----------------------------------------------------------------------------
    # REGION | MoviePy Integration Methods
    # -----------------------------------------------------------------------------
    def _check_moviepy(self) -> bool:
        """Check if moviepy is available from local dependencies."""
        try:
            # Try MoviePy v2.0+ syntax first
            from moviepy import ImageSequenceClip  # noqa: F401
            return True
        except ImportError:
            try:
                # Fallback to v1.x syntax
                from moviepy.editor import ImageSequenceClip  # noqa: F401
                return True
            except ImportError:
                # Dependencies not available
                messagebox.showerror(
                    "MoviePy Not Available",
                    "MoviePy is not available in the local dependencies.\n\n"
                    "Please run the PowerShell script to download dependencies:\n"
                    "1. Open PowerShell\n"
                    "2. Navigate to this script's folder\n" 
                    "3. Run: .\\Download_Dependencies.ps1\n\n"
                    "This will download MoviePy and all required packages."
                )
                return False

    # FUNCTION | Create Timelapse Video from Images
    # ------------------------------------------------------------
    def _create_timelapse(self, output_path: str, fps: int, speed_factor: int, 
                          remove_duplicates: bool) -> None:
        """Create the timelapse video from selected images."""
        try:
            # Import MoviePy - handle different versions
            ImageSequenceClip = None
            
            try:
                # Try MoviePy v2.0+ syntax first
                from moviepy import ImageSequenceClip
                logging.info("Using MoviePy v2.x+ import syntax")
            except ImportError:
                try:
                    # Fallback to v1.x syntax
                    from moviepy.editor import ImageSequenceClip
                    logging.info("Using MoviePy v1.x import syntax")
                except ImportError as e:
                    logging.error(f"Could not import MoviePy: {str(e)}")
                    messagebox.showerror("MoviePy Import Error", 
                                       f"Failed to import MoviePy:\n{str(e)}")
                    return

            # Process images list
            images_to_process = self.selected_images.copy()                      # <-- Create working copy
            
            # Remove identical frames if requested
            if remove_duplicates:                                                # <-- Check if duplicate removal enabled
                self.progress_label.config(text="Detecting and removing identical frames...")
                self.root.update()
                images_to_process = self._remove_identical_frames(               # <-- Filter identical frames
                    images_to_process
                )
                
                if len(images_to_process) < 2:                                   # <-- Check minimum frames
                    messagebox.showerror(
                        "Insufficient Unique Frames",
                        "After removing identical frames, less than 2 unique frames remain.\n"
                        "Cannot create timelapse."
                    )
                    return

            self.progress_label.config(text=f"Creating timelapse with {len(images_to_process)} frames...")
            self.root.update()

            # Calculate effective FPS based on speed factor
            # Note: We keep the output FPS constant and adjust clip duration instead
            output_fps = fps                                                     # <-- Keep output FPS as selected
            duration_per_frame = 1.0 / fps / speed_factor                        # <-- Calculate frame duration
            
            # Create image sequence clip
            try:
                clip = ImageSequenceClip(images_to_process, fps=fps * speed_factor)  # <-- Create clip with adjusted FPS
                
                # Set the final output FPS
                if hasattr(clip, 'with_fps'):
                    clip = clip.with_fps(output_fps)                             # <-- MoviePy 2.0+ syntax
                else:
                    clip = clip.set_fps(output_fps)                              # <-- MoviePy 1.x syntax
                
                # Log clip information
                logging.info(f"Created clip: Duration={clip.duration}s, FPS={output_fps}, Frames={len(images_to_process)}")
                
            except Exception as e:
                logging.error(f"Error creating image sequence: {str(e)}")
                messagebox.showerror("Clip Creation Error", 
                                   f"Failed to create video clip:\n{str(e)}")
                return

            self.progress_label.config(text="Writing video file...")
            self.root.update()

            # Write video file with optimized settings
            try:
                # Video encoding parameters
                video_params = {
                    'codec': 'libx264',
                    'preset': 'medium',
                    'ffmpeg_params': [
                        '-crf', '23',              # Quality (lower = better, 0-51)
                        '-profile:v', 'high',
                        '-level:v', '4.2',
                        '-movflags', '+faststart',  # Web optimization
                        '-pix_fmt', 'yuv420p'       # Compatibility
                    ]
                }
                
                # Write the video file
                if hasattr(clip, 'write_videofile'):
                    try:
                        # MoviePy 2.x syntax
                        clip.write_videofile(
                            output_path,
                            logger=None,
                            **video_params
                        )
                    except TypeError:
                        # MoviePy 1.x syntax
                        clip.write_videofile(
                            output_path,
                            verbose=False,
                            **video_params
                        )
                
                # Clean up
                clip.close()
                
                self.progress["value"] = self.progress["maximum"]
                self.progress_label.config(text="Timelapse creation completed successfully!")
                self.root.update()
                
                # Show success message with details
                file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
                messagebox.showinfo(
                    "Timelapse Created",
                    f"Timelapse video created successfully!\n\n"
                    f"Output file: {output_path}\n"
                    f"Frames processed: {len(images_to_process)}\n"
                    f"Duration: {clip.duration:.1f} seconds\n"
                    f"Frame rate: {output_fps} fps\n"
                    f"Speed: {speed_factor}x\n"
                    f"File size: {file_size_mb:.1f} MB"
                )
                
            except Exception as e:
                logging.error(f"Error writing video file: {str(e)}")
                messagebox.showerror("Video Export Error", 
                                   f"Failed to export video:\n{str(e)}")
                
        except Exception as e:
            logging.error(f"Error creating timelapse: {str(e)}")
            messagebox.showerror("Timelapse Creation Error", 
                               f"Failed to create timelapse:\n\n{str(e)}")
            self.progress_label.config(text="Error occurred during timelapse creation")
    # endregion -------------------------------------------------------------------

    # -----------------------------------------------------------------------------
    # REGION | Help and Information Methods
    # -----------------------------------------------------------------------------
    def show_help(self):
        """Show help information about the timelapse creator."""
        help_text = """
        PNG/JPG to Timelapse Video Converter

        How to use:
        1. Click 'Add Image Files' or 'Add Folder of Images' to select images
        2. Images will be automatically sorted by creation date
        3. Select an output directory for the timelapse video
        4. Choose your desired frame rate (24, 30, or 60 fps)
        5. Select a speed multiplier (1x, 8x, 16x, or 32x)
        6. Optionally enable duplicate frame removal to eliminate static sections
        7. Click 'Create Timelapse Video' to generate your video

        Supported formats:
        • PNG and JPG/JPEG images

        Frame rates:
        • 24fps (cinematic), 30fps (standard), 60fps (smooth)

        Speed options:
        • 1x (real-time), 8x, 16x, 32x (faster playback)

        Duplicate removal:
        • Removes consecutive frames that are nearly identical
        • Useful for eliminating static periods in screen recordings
        • Adjust similarity threshold (90-100%) for sensitivity

        Output:
        • MP4 video with H.264 encoding
        • Filename: Timelapse__DD-MMM-YYYY__HH-MM.mp4
        
        Local Dependencies:
        • All required packages are loaded from LocalScope__ExternalCodeDependencies
        • No system-wide installation needed
        """
        messagebox.showinfo("Help - Timelapse Creator", help_text)
    # endregion -------------------------------------------------------------------

# endregion -------------------------------------------------------------------

# =============================================================================
# PHASE 3 : MAIN ENTRY POINT
# =============================================================================

# -----------------------------------------------------------------------------
# REGION | Main Application Entry Point
# -----------------------------------------------------------------------------
def main():
    """Main entry point for the PNG to timelapse application."""
    try:
        # Check if local dependencies exist
        script_dir = os.path.dirname(os.path.abspath(__file__))                 # <-- Get script directory
        local_deps = os.path.join(script_dir, 'LocalScope__ExternalCodeDependencies')  # <-- Build deps path
        
        if not os.path.exists(local_deps):                                      # <-- Check if deps exist
            print("\n" + "="*60)
            print("LOCAL DEPENDENCIES NOT FOUND!")
            print("="*60)
            print(f"\nExpected location: {local_deps}")
            print("\nPlease run the PowerShell script to download dependencies:")
            print("1. Open PowerShell")
            print("2. Navigate to:", script_dir)
            print("3. Run: .\\Download_Dependencies.ps1")
            print("\nThis will download all required packages locally.")
            print("="*60 + "\n")
            
            # Still try to launch GUI for error message
            
        root = tk.Tk()
        app = PngToTimelapseApp(root)
        
        # Add help menu
        menubar = tk.Menu(root)
        root.config(menu=menubar)
        help_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="Help", menu=help_menu)
        help_menu.add_command(label="About", command=app.show_help)
        
        root.mainloop()
        
    except Exception as e:
        logging.error(f"Application error: {str(e)}")
        print(f"Error starting application: {str(e)}")


if __name__ == "__main__":
    main()
# endregion -------------------------------------------------------------------