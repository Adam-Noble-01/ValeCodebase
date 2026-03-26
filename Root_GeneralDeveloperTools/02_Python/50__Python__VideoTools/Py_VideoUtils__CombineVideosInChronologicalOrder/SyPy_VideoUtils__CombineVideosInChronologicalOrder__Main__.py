# =========================================================
# VIDEO COMBINER - CHRONOLOGICAL ORDER
# =========================================================
#
# FILENAME  |  SyPy_VideoUtils__CombineVideosInChronologicalOrder.py
# DIRECTORY |  C:\03_-_Adam-Noble-Tools\02_-_Python\SyPy_VideoUtils__CombineVideosInChronologicalOrder\SyPy_VideoUtils__CombineVideosInChronologicalOrder.py
#
# AUTHOR    |  Adam Noble - Studio NoodlFjord 
# DATE      |  2025-07-01
#
# DESCRIPTION
# - This script combines multiple video files into a single video in chronological order.
# - Videos are sorted by their creation/modification date before combining.
# - For pip install dependencies, see: .\SnPY_CommonDependencyFiles\SnPy_MasterPipDependencies.txt
#
# PIP DEPENDENCIES COMMAND LINE
# pip install moviepy tqdm pillow
#
# DEVELOPMENT LOG
# 1.0.0 - 01-Jul-2025 |  Initial Development
# - Development Started on video combining utility.
# - GUI interface for selecting multiple video files.
# - Chronological sorting based on file modification time.
# - Output filename format: "Output__CombineVideoFiles__DD-MMM-YYYY.mp4"
# - User can select output directory for the combined video.
# - Progress tracking during video processing.
# - Uses same icon loading and GUI patterns as other SnPy scripts.
#
# =========================================================

import os
import sys
import logging
import subprocess
import tkinter as tk
from tkinter import messagebox, filedialog, ttk
from datetime import datetime
from pathlib import Path
from tqdm import tqdm
import shutil


# ------------------------------------------------------------
# LOADER | Icon Loader setup for the script
# ------------------------------------------------------------
# Add the common local code libraries directory to sys.path for imports                                   # <-- This adds the icon loader path
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))                                 # <-- Navigate up three levels to 02_Python root
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
# ------------------------------------------------------------


# LOADER | Logging setup for the script
# ------------------------------------------------------------
logging.basicConfig(
    filename=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'video_combiner.log'),
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# LOADER | Main Video Combiner class definition
# ------------------------------------------------------------
class VideoCombinerApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Video Combiner - Chronological Order")
        self.root.geometry("600x750")
        self.root.resizable(False, False)
        set_noble_icon(self.root)

        self.selected_videos: list[str] = []
        self.output_directory: str = ""
        # Speed multiplier for output (e.g., 1x, 8x, 16x, 32x)
        self.speed_var = tk.StringVar(value="1x")
        # FPS limit for output (24fps or 32fps)
        self.fps_var = tk.StringVar(value="24fps")
        # Remove audio option
        self.remove_audio_var = tk.BooleanVar(value=False)
        
        self._build_gui()

    # --------------------------------------------------
    # GUI Layout
    # --------------------------------------------------
    def _build_gui(self) -> None:
        # Title label
        title_label = tk.Label(
            self.root, 
            text="Combine Videos in Chronological Order", 
            font=("Arial", 14, "bold")
        )
        title_label.pack(pady=10)

        # Instructions
        instructions = tk.Label(
            self.root, 
            text="Select multiple video files to combine. Videos will be sorted by creation date.",
            font=("Arial", 9)
        )
        instructions.pack(pady=5)

        # Video list frame
        list_frame = tk.Frame(self.root)
        list_frame.pack(pady=10, padx=20, fill="both", expand=True)

        # Video files listbox with scrollbar
        scrollbar = tk.Scrollbar(list_frame)
        scrollbar.pack(side="right", fill="y")

        self.video_list = tk.Listbox(
            list_frame, 
            height=12, 
            width=70,
            yscrollcommand=scrollbar.set,
            selectmode=tk.EXTENDED
        )
        self.video_list.pack(side="left", fill="both", expand=True)
        scrollbar.config(command=self.video_list.yview)

        # Button frame for file operations
        file_btn_frame = tk.Frame(self.root)
        file_btn_frame.pack(pady=10)

        tk.Button(
            file_btn_frame, 
            text="Add Video Files", 
            width=18, 
            command=self._select_videos
        ).pack(side="left", padx=5)

        tk.Button(
            file_btn_frame, 
            text="Remove Selected", 
            width=18, 
            command=self._remove_selected_videos
        ).pack(side="left", padx=5)

        tk.Button(
            file_btn_frame, 
            text="Clear All", 
            width=18, 
            command=self._clear_all_videos
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

        # Speed selection frame
        speed_frame = tk.Frame(self.root)
        speed_frame.pack(pady=10, padx=20, fill="x")

        tk.Label(speed_frame, text="Output Speed:", font=("Arial", 10, "bold")).pack(side="left")

        speed_options = ["1x", "8x", "16x", "32x"]
        speed_menu = ttk.Combobox(speed_frame, textvariable=self.speed_var, values=speed_options, state="readonly", width=5)
        speed_menu.pack(side="left", padx=10)

        # FPS limit selection frame
        fps_frame = tk.Frame(self.root)
        fps_frame.pack(pady=10, padx=20, fill="x")

        tk.Label(fps_frame, text="Max FPS:", font=("Arial", 10, "bold")).pack(side="left")

        fps_options = ["24fps", "32fps"]
        fps_menu = ttk.Combobox(fps_frame, textvariable=self.fps_var, values=fps_options, state="readonly", width=6)
        fps_menu.pack(side="left", padx=10)

        # Remove audio checkbox
        audio_frame = tk.Frame(self.root)
        audio_frame.pack(pady=10, padx=20, fill="x")
        
        audio_checkbox = tk.Checkbutton(
            audio_frame, 
            text="Remove Audio Channel (reduces file size for timelapses)",
            variable=self.remove_audio_var,
            font=("Arial", 10)
        )
        audio_checkbox.pack(side="left")

        # Progress bar
        self.progress_frame = tk.Frame(self.root)
        self.progress_frame.pack(pady=10, padx=20, fill="x")

        self.progress_label = tk.Label(self.progress_frame, text="Ready to combine videos", font=("Arial", 9))
        self.progress_label.pack(anchor="w")

        self.progress = ttk.Progressbar(
            self.progress_frame, 
            orient="horizontal", 
            length=560, 
            mode="determinate"
        )
        self.progress.pack(pady=5)

        # Combine button
        tk.Button(
            self.root, 
            text="Combine Videos", 
            width=20, 
            height=2,
            font=("Arial", 10, "bold"),
            command=self._begin_combination
        ).pack(pady=15)

    # --------------------------------------------------
    # File Selection Handlers
    # --------------------------------------------------
    def _select_videos(self) -> None:
        """Open file dialog to select multiple video files."""
        files = filedialog.askopenfilenames(
            title="Select Video Files to Combine",
            filetypes=[
                ("Video Files", "*.mp4 *.avi *.mov *.mkv *.wmv *.flv *.webm *.m4v"),
                ("MP4 Files", "*.mp4"),
                ("AVI Files", "*.avi"),
                ("MOV Files", "*.mov"),
                ("All Files", "*.*")
            ]
        )
        if files:
            self.selected_videos.extend(files)
            self._refresh_video_list()

    def _remove_selected_videos(self) -> None:
        """Remove selected videos from the list."""
        selected_indices = list(self.video_list.curselection())
        if not selected_indices:
            messagebox.showwarning("No Selection", "Please select videos to remove.")
            return
        
        # Remove in reverse order to maintain indices
        for idx in reversed(selected_indices):
            del self.selected_videos[idx]
        self._refresh_video_list()

    def _clear_all_videos(self) -> None:
        """Clear all videos from the list."""
        if self.selected_videos:
            result = messagebox.askyesno("Clear All", "Remove all videos from the list?")
            if result:
                self.selected_videos.clear()
                self._refresh_video_list()

    def _refresh_video_list(self) -> None:
        """Refresh the video list display."""
        self.video_list.delete(0, tk.END)
        
        # Sort videos by modification time (chronological order)
        if self.selected_videos:
            sorted_videos = sorted(self.selected_videos, key=lambda x: os.path.getmtime(x))
            self.selected_videos = sorted_videos
            
            logging.info(f"Refreshed video list with {len(self.selected_videos)} videos:")
            for i, video_path in enumerate(self.selected_videos):
                filename = Path(video_path).name
                mod_time = datetime.fromtimestamp(os.path.getmtime(video_path))
                display_text = f"{mod_time.strftime('%Y-%m-%d %H:%M')} - {filename}"
                self.video_list.insert(tk.END, display_text)
                logging.info(f"  {i+1}. {display_text}")

    def _select_output_directory(self) -> None:
        """Select output directory for the combined video."""
        directory = filedialog.askdirectory(title="Select Output Directory")
        if directory:
            self.output_directory = directory
            self.output_dir_label.config(text=directory)

    # --------------------------------------------------
    # Video Combination Process
    # --------------------------------------------------
    def _begin_combination(self) -> None:
        """Start the video combination process."""
        # Validation
        if len(self.selected_videos) < 2:
            messagebox.showwarning("Insufficient Videos", "Please select at least 2 videos to combine.")
            return

        if not self.output_directory:
            messagebox.showwarning("No Output Directory", "Please select an output directory.")
            return

        # Check if moviepy is available
        if not self._check_moviepy():
            return

        # Generate output filename
        date_str = datetime.now().strftime('%d-%b-%Y')
        output_filename = f"Output__CombineVideoFiles__{date_str}.mp4"
        output_path = os.path.join(self.output_directory, output_filename)

        # Check if output file already exists
        if os.path.exists(output_path):
            result = messagebox.askyesno(
                "File Exists", 
                f"The file '{output_filename}' already exists.\nDo you want to overwrite it?"
            )
            if not result:
                return

        # Start combination process
        self.progress_label.config(text="Preparing videos for combination...")
        self.progress["value"] = 0
        self.progress["maximum"] = len(self.selected_videos) + 1

        # Determine speed factor
        try:
            speed_factor = int(self.speed_var.get().replace('x', ''))
        except ValueError:
            speed_factor = 1
        
        # Determine FPS limit
        try:
            fps_limit = int(self.fps_var.get().replace('fps', ''))
        except ValueError:
            fps_limit = 24

        # Use after() to avoid blocking the GUI
        self.root.after(100, lambda: self._combine_videos(output_path, speed_factor, fps_limit))

    # --------------------------------------------------
    # Video Validation and Processing Methods
    # --------------------------------------------------
    def _validate_and_process_clip(self, clip, video_path: str):
        """Enhanced validation and processing for all video clips, especially low FPS."""
        try:
            # Test frame reading capability
            try:
                test_frame = clip.get_frame(0)
                if test_frame is None or test_frame.size == 0:
                    raise ValueError("Cannot read frames")
            except Exception as e:
                logging.warning(f"Frame reading test failed for {Path(video_path).name}: {str(e)}")
                return None
            
            # Log video properties for debugging
            fps = getattr(clip, 'fps', 'Unknown')
            duration = getattr(clip, 'duration', 'Unknown')
            size = getattr(clip, 'size', 'Unknown')
            logging.info(f"Video: {Path(video_path).name} | FPS: {fps} | Duration: {duration}s | Size: {size}")
            
            # CRITICAL: Handle very low FPS videos (like 2fps)
            if hasattr(clip, 'fps') and clip.fps and clip.fps < 5:
                logging.info(f"Processing low FPS video: {fps}fps - {Path(video_path).name}")
                
                # Reduce duration slightly to prevent index errors
                # This prevents the "index out of bounds" error
                safe_duration = max(0.1, clip.duration - (2.0 / clip.fps))  # Remove ~2 frames worth
                try:
                    # Try different MoviePy methods for clipping
                    if hasattr(clip, 'subclipped'):
                        clip = clip.subclipped(0, safe_duration)
                    elif hasattr(clip, 'with_duration'):
                        clip = clip.with_duration(safe_duration)
                    else:
                        # Fallback: try the old subclip method
                        clip = clip.subclip(0, safe_duration)
                except AttributeError as ae:
                    logging.warning(f"Could not clip video {Path(video_path).name}: {str(ae)}")
                    # Continue without clipping - accept the risk
                    pass
                
                # For very low FPS, ensure we have enough frames
                expected_frames = int(clip.fps * clip.duration)
                if expected_frames < 2:
                    logging.warning(f"Very few frames ({expected_frames}) in {Path(video_path).name}")
            
            # Handle frame rate normalization for concatenation
            if hasattr(clip, 'fps') and clip.fps:
                if clip.fps < 1:
                    # Extremely low FPS - normalize to 1fps minimum
                    clip = clip.set_fps(1)
                    logging.info(f"Normalized extremely low FPS to 1fps: {Path(video_path).name}")
                elif clip.fps > 120:
                    # Extremely high FPS - cap at 120fps
                    clip = clip.set_fps(120)
                    logging.info(f"Capped high FPS to 120fps: {Path(video_path).name}")
            
            return clip
            
        except Exception as e:
            logging.error(f"Failed to process clip {Path(video_path).name}: {str(e)}")
            return None

    def _check_gpu_acceleration(self) -> bool:
        """Check if RTX 5080 GPU acceleration is available."""
        try:
            import subprocess
            
            # Check for nvidia-smi
            result = subprocess.run(['nvidia-smi', '--query-gpu=name,driver_version', '--format=csv,noheader'], 
                                  capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                gpu_info = result.stdout.strip()
                logging.info(f"GPU detected: {gpu_info}")
                
                # Check for ffmpeg with NVENC support
                try:
                    ffmpeg_result = subprocess.run(['ffmpeg', '-encoders'], 
                                                 capture_output=True, text=True, timeout=10)
                    
                    if ffmpeg_result.returncode == 0 and 'h264_nvenc' in ffmpeg_result.stdout:
                        logging.info("NVENC hardware acceleration available")
                        return True
                    else:
                        logging.warning("FFmpeg compiled without NVENC support")
                        return False
                except FileNotFoundError:
                    logging.warning("FFmpeg not found in system PATH - GPU acceleration unavailable")
                    return False
            else:
                logging.warning("nvidia-smi not found or failed")
                return False
                
        except Exception as e:
            logging.warning(f"GPU check failed: {str(e)}")
            return False

    def _write_video_with_gpu_acceleration(self, final_clip, output_path: str) -> None:
        """Write video using GPU acceleration if available, with fallback to CPU."""
        
        # Check if GPU acceleration is available
        gpu_available = getattr(self, 'gpu_available', False)
        
        # Remove audio if requested
        if self.remove_audio_var.get():
            logging.info("Removing audio channel as requested")
            final_clip = final_clip.without_audio()
        
        if gpu_available:
            # RTX 5080 optimized encoding parameters
            rtx_params = {
                # Use NVIDIA NVENC hardware encoder
                'codec': 'h264_nvenc',  # Hardware accelerated H.264
                
                # RTX 5080 specific optimizations
                'ffmpeg_params': [
                    '-preset', 'p4',           # Balanced preset for quality/speed
                    '-profile:v', 'high',      # H.264 High profile
                    '-level:v', '4.2',         # Level 4.2 for compatibility
                    '-rc:v', 'vbr',            # Variable bitrate
                    '-cq:v', '19',             # Constant quality (lower = better, 0-51)
                    '-b:v', '10M',             # Target bitrate 10Mbps
                    '-maxrate:v', '15M',       # Max bitrate 15Mbps
                    '-bufsize', '20M',         # Buffer size
                    '-spatial_aq', '1',        # Spatial adaptive quantization
                    '-temporal_aq', '1',       # Temporal adaptive quantization
                    '-b_ref_mode', '2',        # B-frame reference mode
                ]
            }
            
            # Only add audio codec if audio is present
            if hasattr(final_clip, 'audio') and final_clip.audio is not None:
                rtx_params['audio_codec'] = 'aac'
            
            try:
                self.progress_label.config(text="Encoding with GPU acceleration...")
                self.root.update()
                
                # Try GPU encoding
                if hasattr(final_clip, 'write_videofile'):
                    try:
                        # MoviePy 2.x syntax
                        final_clip.write_videofile(
                            output_path,
                            logger=None,
                            **rtx_params
                        )
                    except TypeError:
                        # MoviePy 1.x syntax
                        final_clip.write_videofile(
                            output_path,
                            verbose=False,
                            **rtx_params
                        )
                
                logging.info("Successfully encoded using GPU acceleration")
                return
                
            except Exception as gpu_error:
                logging.warning(f"GPU encoding failed: {str(gpu_error)}")
                # Continue to CPU fallback
        
        # CPU fallback parameters
        cpu_params = {
            'codec': 'libx264',
            'preset': 'medium',  # CPU preset
            'ffmpeg_params': [
                '-crf', '19',           # Quality (same as GPU CQ)
                '-profile:v', 'high',
                '-level:v', '4.2',
                '-movflags', '+faststart',  # Web optimization
            ]
        }
        
        # Only add audio codec if audio is present
        if hasattr(final_clip, 'audio') and final_clip.audio is not None:
            cpu_params['audio_codec'] = 'aac'
        
        try:
            self.progress_label.config(text="Encoding with CPU (fallback)...")
            self.root.update()
            
            # Clean up corrupted file if exists
            if gpu_available and os.path.exists(output_path):
                try:
                    os.remove(output_path)
                except:
                    pass
            
            # Try CPU encoding
            if hasattr(final_clip, 'write_videofile'):
                try:
                    # MoviePy 2.x syntax
                    final_clip.write_videofile(
                        output_path,
                        logger=None,
                        **cpu_params
                    )
                except TypeError:
                    # MoviePy 1.x syntax
                    final_clip.write_videofile(
                        output_path,
                        verbose=False,
                        **cpu_params
                    )
            
            logging.info("Successfully encoded using CPU")
            
        except Exception as cpu_error:
            logging.error(f"Both GPU and CPU encoding failed: {str(cpu_error)}")
            raise cpu_error

    # --------------------------------------------------
    # MoviePy Check Method
    # --------------------------------------------------
    def _check_moviepy(self) -> bool:
        """Check if moviepy is available and offer to install if not."""
        try:
            # Try MoviePy v2.0+ syntax first (current version)
            from moviepy import VideoFileClip, concatenate_videoclips  # noqa: F401
            return True
        except ImportError:
            try:
                # Fallback to v1.x syntax for older installations
                from moviepy.editor import VideoFileClip, concatenate_videoclips  # noqa: F401
                return True
            except ImportError:
                # Neither version works, offer to install
                install = messagebox.askyesno(
                    "MoviePy Not Found",
                    "MoviePy is required for video processing.\nWould you like to install it now?\n\n(This may take a few minutes)"
                )
                if install:
                    import subprocess
                    try:
                        self.progress_label.config(text="Installing MoviePy...")
                        self.root.update()
                        subprocess.check_call([sys.executable, "-m", "pip", "install", "moviepy"])
                        messagebox.showinfo("Installation Complete", "MoviePy has been installed successfully!")
                        return True
                    except Exception as e:
                        logging.error(f"MoviePy installation failed: {str(e)}")
                        messagebox.showerror("Installation Failed", f"Failed to install MoviePy:\n{str(e)}")
                return False

    def _combine_videos(self, output_path: str, speed_factor: int = 1, fps_limit: int = 24) -> None:
        """Combine the selected videos into a single file."""
        try:
            # Try importing MoviePy - handle different versions
            VideoFileClip = None
            concatenate_videoclips = None
            
            try:
                # Try MoviePy v2.0+ syntax first (current version)
                from moviepy import VideoFileClip, concatenate_videoclips
                logging.info("Using MoviePy v2.x+ import syntax")
            except ImportError:
                try:
                    # Fallback to v1.x syntax for older installations
                    from moviepy.editor import VideoFileClip, concatenate_videoclips
                    logging.info("Using MoviePy v1.x import syntax")
                except ImportError as e:
                    logging.error(f"Could not import MoviePy: {str(e)}")
                    messagebox.showerror("MoviePy Import Error", f"Failed to import MoviePy:\n{str(e)}\n\nPlease ensure MoviePy is properly installed.")
                    return

            self.progress_label.config(text="Loading video clips...")
            self.root.update()

            # Check GPU acceleration availability
            self.gpu_available = self._check_gpu_acceleration()
            
            # Load all video clips
            clips = []
            for i, video_path in enumerate(self.selected_videos):
                try:
                    self.progress_label.config(text=f"Loading video {i+1}/{len(self.selected_videos)}: {Path(video_path).name}")
                    self.root.update()
                    
                    clip = VideoFileClip(video_path)
                    
                    # Basic validation
                    if clip.duration is None or clip.duration <= 0:
                        logging.warning(f"Skipping video with no duration: {Path(video_path).name}")
                        clip.close()
                        continue
                    
                    if not hasattr(clip, 'size') or clip.size is None or clip.size[0] <= 0 or clip.size[1] <= 0:
                        logging.warning(f"Skipping video with invalid dimensions: {Path(video_path).name}")
                        clip.close()
                        continue
                    
                    # ENHANCED: Process and validate the clip (handles 2fps videos)
                    processed_clip = self._validate_and_process_clip(clip, video_path)
                    if processed_clip is None:
                        if hasattr(clip, 'close'):
                            clip.close()
                        continue
                    
                    clips.append(processed_clip)
                    self.progress["value"] = i + 1
                    self.root.update()
                    
                except Exception as e:
                    logging.error(f"Error loading video {video_path}: {str(e)}")
                    # Continue with other videos instead of stopping
                    continue

            if not clips:
                messagebox.showerror("No Videos Loaded", "No videos could be loaded successfully.")
                return

            # Check if we have enough videos to actually combine
            if len(clips) == 1:
                result = messagebox.askyesno(
                    "Only One Video Loaded", 
                    f"Only 1 out of {len(self.selected_videos)} videos could be loaded successfully.\n\n"
                    f"This means {len(self.selected_videos) - 1} videos failed to load (likely due to format issues).\n\n"
                    f"Do you want to proceed with processing just the single video?\n\n"
                    f"Successfully loaded: {clips[0] if clips else 'None'}"
                )
                if not result:
                    # Clean up
                    for clip in clips:
                        clip.close()
                    return

            # Log information about clips to concatenate
            logging.info(f"Successfully loaded {len(clips)} out of {len(self.selected_videos)} videos for concatenation")
            for i, clip in enumerate(clips):
                logging.info(f"Clip {i+1}: Duration={clip.duration}s, FPS={getattr(clip, 'fps', 'N/A')}, Size={getattr(clip, 'size', 'N/A')}")

            # Safer concatenation method for mixed frame rate videos
            self.progress_label.config(text=f"Combining {len(clips)} videos...")
            self.root.update()

            try:
                # Method 1: Try compose (better quality)
                final_clip = concatenate_videoclips(clips, method="compose")
            except Exception as e:
                logging.warning(f"Compose method failed: {str(e)}")
                try:
                    # Method 2: Try chain (more forgiving for problematic videos)
                    self.progress_label.config(text="Using alternative concatenation method...")
                    self.root.update()
                    final_clip = concatenate_videoclips(clips, method="chain")
                except Exception as e2:
                    # Method 3: Manual concatenation with forced timing
                    logging.warning(f"Chain method also failed: {str(e2)}")
                    self.progress_label.config(text="Using manual concatenation...")
                    self.root.update()
                    
                    # Force consistent FPS for all clips
                    target_fps = fps_limit or 24  # Use user's FPS limit or default to 24
                    normalized_clips = []
                    for clip in clips:
                        if hasattr(clip, 'fps') and clip.fps:
                            if clip.fps != target_fps:
                                clip = clip.set_fps(target_fps)
                        normalized_clips.append(clip)
                    
                    final_clip = concatenate_videoclips(normalized_clips, method="compose")
            
            # Log final concatenated clip info
            logging.info(f"Final concatenated clip: Duration={final_clip.duration}s, FPS={getattr(final_clip, 'fps', 'N/A')}")
            
            # Apply speed factor if requested
            # NOTE: Fixed CompositeVideoClip speed methods based on MoviePy 2.0+ documentation
            # - speedx() method is the most reliable approach
            # - with_effects([vfx.MultiplySpeed()]) is the v2.0+ effects method
            # - fx() method is legacy fallback for older versions
            if speed_factor != 1:
                self.progress_label.config(text=f"Applying {speed_factor}x speed...")
                self.root.update()
                try:
                    # Use speedx method - the most reliable approach in MoviePy 2.0+
                    final_clip = final_clip.speedx(speed_factor)
                except AttributeError:
                    # Fallback: try with effects method for MoviePy 2.0+
                    try:
                        from moviepy import vfx
                        final_clip = final_clip.with_effects([vfx.MultiplySpeed(speed_factor)])
                    except:
                        # Final fallback: try fx method for older MoviePy versions  
                        try:
                            try:
                                from moviepy import vfx
                                final_clip = final_clip.fx(vfx.speedx, speed_factor)
                            except ImportError:
                                from moviepy.video.fx import speedx
                                final_clip = final_clip.fx(speedx, speed_factor)
                        except Exception as e:
                            logging.error(f"Could not apply speed factor: {str(e)}")
                            messagebox.showwarning(
                                "Speed Warning", 
                                f"Could not apply {speed_factor}x speed. Video will be saved at normal speed.\n\nError: {str(e)}"
                            )

            # Apply FPS limit if needed
            if hasattr(final_clip, 'fps') and final_clip.fps and final_clip.fps > fps_limit:
                self.progress_label.config(text=f"Limiting FPS to {fps_limit}...")
                self.root.update()
                try:
                    # Use with_fps method for MoviePy 2.0+ 
                    if hasattr(final_clip, 'with_fps'):
                        final_clip = final_clip.with_fps(fps_limit)
                    else:
                        # Fallback for older MoviePy versions
                        final_clip = final_clip.set_fps(fps_limit)
                except Exception as e:
                    logging.warning(f"Could not limit FPS: {str(e)}")

            self.progress_label.config(text="Writing combined video file...")
            self.root.update()

            # Use GPU-accelerated encoding if available
            self._write_video_with_gpu_acceleration(final_clip, output_path)

            # Clean up
            for clip in clips:
                clip.close()
            final_clip.close()

            self.progress["value"] = self.progress["maximum"]
            self.progress_label.config(text="Video combination completed successfully!")
            self.root.update()

            # Show success message
            messagebox.showinfo(
                "Combination Complete",
                f"Videos have been combined successfully!\n\nOutput file:\n{output_path}\n\nTotal videos processed: {len(clips)}\nTotal videos selected: {len(self.selected_videos)}"
            )

        except Exception as e:
            logging.error(f"Error combining videos: {str(e)}")
            messagebox.showerror("Combination Error", f"Failed to combine videos:\n\n{str(e)}")
            self.progress_label.config(text="Error occurred during combination")

    # METHOD | Show help information
    # ------------------------------------------------------------
    def show_help(self):
        """Show help information about the video combiner."""
        help_text = """
        Video Combiner - Chronological Order

        How to use:
        1. Click 'Add Video Files' to select multiple video files
        2. Videos will be automatically sorted by creation date
        3. Select an output directory where the combined video will be saved
        4. Choose the desired output speed (1x, 8x, 16x, 32x)
        5. Choose the maximum FPS limit (24fps or 32fps)
        6. Click 'Combine Videos' to start the process

        Supported formats:
        • MP4, AVI, MOV, MKV, WMV, FLV, WebM, M4V

        Speed options:
        • 1x (normal), 8x, 16x, 32x

        FPS options:
        • 24fps (standard video), 32fps (higher quality)

        Output:
        • Combined video saved as: Output__CombineVideoFiles__DD-MMM-YYYY.mp4
        • Videos are joined in chronological order based on file modification time
        • FPS will be limited to your selected maximum if original is higher

        Requirements:
        • MoviePy library (will be installed automatically if needed)
        """
        messagebox.showinfo("Help - Video Combiner", help_text)


# FUNCTION | Main entry point for the script
# ------------------------------------------------------------
def main():
    """Main entry point for the video combiner application."""
    try:
        root = tk.Tk()
        app = VideoCombinerApp(root)
        
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

# ------------------------------------------------------------
# END OF FILE
# ------------------------------------------------------------
