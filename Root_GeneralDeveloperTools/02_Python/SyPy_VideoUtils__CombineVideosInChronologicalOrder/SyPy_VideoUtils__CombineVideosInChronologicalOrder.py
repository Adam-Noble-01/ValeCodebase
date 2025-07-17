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
import tkinter as tk
from tkinter import messagebox, filedialog, ttk
from datetime import datetime
from pathlib import Path
from tqdm import tqdm
import shutil


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
        set_window_icon(self.root)

        self.selected_videos: list[str] = []
        self.output_directory: str = ""

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
            
            for video_path in self.selected_videos:
                filename = Path(video_path).name
                mod_time = datetime.fromtimestamp(os.path.getmtime(video_path))
                display_text = f"{mod_time.strftime('%Y-%m-%d %H:%M')} - {filename}"
                self.video_list.insert(tk.END, display_text)

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

        # Use after() to avoid blocking the GUI
        self.root.after(100, lambda: self._combine_videos(output_path))

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

    def _combine_videos(self, output_path: str) -> None:
        """Combine the selected videos into a single file."""
        try:
            # Try MoviePy v2.0+ syntax first (current version)
            try:
                from moviepy import VideoFileClip, concatenate_videoclips
            except ImportError:
                # Fallback to v1.x syntax for older installations
                from moviepy.editor import VideoFileClip, concatenate_videoclips

            self.progress_label.config(text="Loading video clips...")
            self.root.update()

            # Load all video clips
            clips = []
            for i, video_path in enumerate(self.selected_videos):
                try:
                    self.progress_label.config(text=f"Loading video {i+1}/{len(self.selected_videos)}: {Path(video_path).name}")
                    self.root.update()
                    
                    clip = VideoFileClip(video_path)
                    clips.append(clip)
                    
                    self.progress["value"] = i + 1
                    self.root.update()
                    
                except Exception as e:
                    logging.error(f"Error loading video {video_path}: {str(e)}")
                    messagebox.showerror("Video Load Error", f"Failed to load video:\n{Path(video_path).name}\n\nError: {str(e)}")
                    # Clean up loaded clips
                    for clip in clips:
                        clip.close()
                    return

            if not clips:
                messagebox.showerror("No Videos Loaded", "No videos could be loaded successfully.")
                return

            # Combine clips
            self.progress_label.config(text="Combining videos...")
            self.root.update()

            final_clip = concatenate_videoclips(clips, method="compose")
            
            self.progress_label.config(text="Writing combined video file...")
            self.root.update()

            # Write the final video
            # Try MoviePy v2.0+ method signature first
            try:
                final_clip.write_videofile(
                    output_path,
                    codec='libx264',
                    audio_codec='aac',
                    logger=None  # Suppress moviepy logs
                )
            except TypeError:
                # Fallback for MoviePy v1.x which uses verbose parameter
                final_clip.write_videofile(
                    output_path,
                    codec='libx264',
                    audio_codec='aac',
                    verbose=False,
                    logger=None
                )

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
                f"Videos have been combined successfully!\n\nOutput file:\n{output_path}\n\nTotal videos combined: {len(self.selected_videos)}"
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
4. Click 'Combine Videos' to start the process

Supported formats:
• MP4, AVI, MOV, MKV, WMV, FLV, WebM, M4V

Output:
• Combined video saved as: Output__CombineVideoFiles__DD-MMM-YYYY.mp4
• Videos are joined in chronological order based on file modification time

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
