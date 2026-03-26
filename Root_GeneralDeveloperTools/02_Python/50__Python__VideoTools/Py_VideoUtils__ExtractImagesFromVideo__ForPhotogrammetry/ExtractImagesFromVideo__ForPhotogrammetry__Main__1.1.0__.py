# ExtractImagesFromVideo__ForPhotogrammetry.py
# Version | 1.1.0 - 29-Oct-2025
# Author  | Adam Noble
# -------------------------------------
# Description:
# - Using TkInter, create a GUI for the user to select a video file and then extract the images from the video.
# - The images will be saved to a folder named after the video file.
# - Multiple Videos may be selected, each individually processed and images extracted and saved in their own folder.
# - Image extraction optimised for photogrammetry downstream processing, default 1 frame per second
#   - Optimized for Reality Capture and other photogrammetry software
#   - 1 FPS default (better for photogrammetry than higher rates)
# - Images exported with photogrammetry-optimized metadata:
#   - Preserves camera technical data (focal length, exposure, etc.)
#   - Removes GPS data that interferes with Reality Capture
#   - Uses PIL for proper color space handling (RGB instead of BGR)
# - Image exports are PNG Files with lossless compression.
# - A progress bar should be displayed to the user to indicate the progress of the image extraction.
# -------------------------------------

import tkinter as tk
from tkinter import filedialog, ttk, messagebox
import cv2
import os
from pathlib import Path
import threading
from PIL import Image, PngImagePlugin
import json
from datetime import datetime


class VideoFrameExtractor:
    """
    Extract frames from video files for photogrammetry processing.
    Optimized for drone footage with configurable frame rate extraction.
    """
    
    def __init__(self, root):
        self.root = root
        self.root.title("Video Frame Extractor for Photogrammetry")
        self.root.geometry("700x500")
        self.root.resizable(False, False)
        
        self.video_files = []
        self.is_processing = False
        
        self._setup_ui()
    
    
    def _extract_video_metadata(self, video_path):
        """
        Extract metadata from video file for embedding in frame images.
        
        Args:
            video_path: Path to the video file
            
        Returns:
            Dictionary containing video metadata for EXIF embedding
        """
        try:
            cap = cv2.VideoCapture(str(video_path))
            if not cap.isOpened():
                return {}
            
            # Get basic video properties
            fps = cap.get(cv2.CAP_PROP_FPS)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            cap.release()
            
            # Create metadata dictionary
            metadata = {
                'source_video': Path(video_path).name,
                'video_fps': fps,
                'video_width': width,
                'video_height': height,
                'total_frames': total_frames,
                'extraction_date': datetime.now().isoformat(),
                'software': 'VideoFrameExtractor for Photogrammetry v1.1.0'
            }
            
            return metadata
            
        except Exception as e:
            print(f"Warning: Could not extract video metadata: {e}")
            return {}
    
    
    def _create_photogrammetry_exif(self, video_metadata, frame_number, target_fps):
        """
        Create EXIF data optimized for photogrammetry software.
        Preserves camera-like metadata while excluding GPS data.
        
        Args:
            video_metadata: Dictionary of video metadata
            frame_number: Current frame number
            target_fps: Target extraction FPS
            
        Returns:
            Dictionary with EXIF data for PIL
        """
        try:
            # Create EXIF data dictionary using PIL's format
            exif_data = {}
            
            # Software information
            exif_data['Software'] = video_metadata.get('software', 'VideoFrameExtractor for Photogrammetry v1.1.0')
            
            # Date and time
            exif_data['DateTime'] = datetime.now().strftime("%Y:%m:%d %H:%M:%S")
            
            # Camera-like settings (synthetic but helpful for photogrammetry)
            exif_data['ExposureTime'] = f"1/{int(target_fps)}"  # Synthetic shutter speed
            exif_data['FNumber'] = "2.8"  # Synthetic f-stop
            exif_data['ISO'] = "100"  # Synthetic ISO
            
            # Focal length (synthetic based on video dimensions for photogrammetry)
            if 'video_width' in video_metadata:
                # Synthetic 35mm equivalent focal length based on video width
                synthetic_focal = max(35, video_metadata['video_width'] // 50)
                exif_data['FocalLength'] = f"{synthetic_focal}mm"
            
            # Custom metadata in ImageDescription
            custom_info = {
                'source_video': video_metadata.get('source_video', 'unknown'),
                'frame_number': frame_number,
                'video_fps': video_metadata.get('video_fps', 0),
                'extraction_fps': target_fps,
                'extraction_date': video_metadata.get('extraction_date', ''),
                'video_dimensions': f"{video_metadata.get('video_width', 0)}x{video_metadata.get('video_height', 0)}"
            }
            exif_data['ImageDescription'] = json.dumps(custom_info)
            
            # Explicitly exclude GPS data (don't add any GPS fields)
            # This ensures no GPS interference with Reality Capture
            
            return exif_data
            
        except Exception as e:
            print(f"Warning: Could not create EXIF data: {e}")
            return {}
    
    
    def _save_frame_with_metadata(self, frame, output_path, video_metadata, frame_number, target_fps):
        """
        Save frame as PNG with photogrammetry-optimized metadata.
        Converts BGR to RGB and embeds camera-like metadata without GPS.
        
        Args:
            frame: OpenCV frame (BGR format)
            output_path: Path to save the image
            video_metadata: Video metadata dictionary
            frame_number: Current frame number
            target_fps: Target extraction FPS
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Convert BGR (OpenCV) to RGB (PIL/standard)
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Create PIL Image from RGB array
            pil_image = Image.fromarray(frame_rgb)
            
            # Create photogrammetry-optimized metadata
            metadata_dict = self._create_photogrammetry_exif(video_metadata, frame_number, target_fps)
            
            # Create PNG info for metadata embedding
            pnginfo = PngImagePlugin.PngInfo()
            
            # Add metadata as PNG text chunks (more reliable than EXIF for PNG)
            for key, value in metadata_dict.items():
                pnginfo.add_text(key, str(value))
            
            # Save as PNG with metadata (lossless compression)
            pil_image.save(
                str(output_path), 
                format='PNG',
                optimize=True,
                compress_level=1,  # Light compression for speed while maintaining quality
                pnginfo=pnginfo
            )
            
            return True
            
        except Exception as e:
            print(f"Error saving frame with metadata: {e}")
            # Fallback: save without metadata if there's an issue
            try:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(frame_rgb)
                pil_image.save(str(output_path), format='PNG', optimize=True)
                print(f"Saved frame {frame_number} without metadata as fallback")
                return True
            except Exception as fallback_error:
                print(f"Fallback save also failed: {fallback_error}")
                return False
    
    
    def _setup_ui(self):
        """Setup the user interface components."""
        
        # Frame rate configuration section at top
        config_frame = tk.LabelFrame(self.root, text="Extraction Settings", padx=10, pady=10)
        config_frame.pack(padx=10, pady=10, fill="x")
        
        tk.Label(config_frame, text="Frames Per Second:").grid(row=0, column=0, sticky="w", padx=5)
        
        self.fps_var = tk.DoubleVar(value=1.0)
        fps_spinbox = tk.Spinbox(
            config_frame,
            from_=0.5,
            to=30.0,
            increment=0.5,
            textvariable=self.fps_var,
            width=10,
            state="readonly"
        )
        fps_spinbox.grid(row=0, column=1, sticky="w", padx=5)
        
        tk.Label(
            config_frame,
            text="(Optimized for photogrammetry: 1 FPS recommended)",
            fg="gray"
        ).grid(row=0, column=2, sticky="w", padx=10)
        
        # Video selection section
        select_frame = tk.LabelFrame(self.root, text="Video Files", padx=10, pady=10)
        select_frame.pack(padx=10, pady=10, fill="both", expand=True)
        
        # Listbox with scrollbar for selected videos
        list_frame = tk.Frame(select_frame)
        list_frame.pack(fill="both", expand=True)
        
        scrollbar = tk.Scrollbar(list_frame)
        scrollbar.pack(side="right", fill="y")
        
        self.video_listbox = tk.Listbox(
            list_frame,
            yscrollcommand=scrollbar.set,
            height=10,
            selectmode=tk.EXTENDED
        )
        self.video_listbox.pack(side="left", fill="both", expand=True)
        scrollbar.config(command=self.video_listbox.yview)
        
        # Buttons for file management
        button_frame = tk.Frame(select_frame)
        button_frame.pack(pady=5)
        
        tk.Button(
            button_frame,
            text="Add Videos",
            command=self._add_videos,
            width=15
        ).pack(side="left", padx=5)
        
        tk.Button(
            button_frame,
            text="Remove Selected",
            command=self._remove_selected,
            width=15
        ).pack(side="left", padx=5)
        
        tk.Button(
            button_frame,
            text="Clear All",
            command=self._clear_all,
            width=15
        ).pack(side="left", padx=5)
        
        # Progress section
        progress_frame = tk.LabelFrame(self.root, text="Progress", padx=10, pady=10)
        progress_frame.pack(padx=10, pady=10, fill="x")
        
        self.status_label = tk.Label(progress_frame, text="Ready", anchor="w")
        self.status_label.pack(fill="x", pady=5)
        
        self.progress_bar = ttk.Progressbar(
            progress_frame,
            mode='determinate',
            length=300
        )
        self.progress_bar.pack(fill="x", pady=5)
        
        # Process button
        self.process_button = tk.Button(
            self.root,
            text="Extract Frames",
            command=self._start_processing,
            bg="#4CAF50",
            fg="white",
            font=("Arial", 12, "bold"),
            height=2
        )
        self.process_button.pack(padx=10, pady=10, fill="x")
    
    
    def _add_videos(self):
        """Open file dialog to select video files."""
        files = filedialog.askopenfilenames(
            title="Select Video Files",
            filetypes=[
                ("Video Files", "*.mp4 *.avi *.mov *.mkv *.flv *.wmv"),
                ("All Files", "*.*")
            ]
        )
        
        invalid_files = []
        
        for file in files:
            if file not in self.video_files:
                # Validate file exists and is readable
                if os.path.exists(file) and os.path.isfile(file):
                    self.video_files.append(file)
                    self.video_listbox.insert(tk.END, os.path.basename(file))
                else:
                    invalid_files.append(os.path.basename(file))
        
        if invalid_files:
            messagebox.showwarning(
                "Invalid Files",
                f"The following files could not be added:\n" + "\n".join(invalid_files)
            )
    
    
    def _remove_selected(self):
        """Remove selected videos from the list."""
        selected_indices = self.video_listbox.curselection()
        
        # Remove in reverse order to maintain indices
        for index in reversed(selected_indices):
            self.video_listbox.delete(index)
            del self.video_files[index]
    
    
    def _clear_all(self):
        """Clear all videos from the list."""
        self.video_listbox.delete(0, tk.END)
        self.video_files.clear()
    
    
    def _start_processing(self):
        """Start the frame extraction process in a separate thread."""
        if self.is_processing:
            return
        
        if not self.video_files:
            messagebox.showwarning("No Videos", "Please add at least one video file.")
            return
        
        self.is_processing = True
        self.process_button.config(state="disabled")
        
        # Reset progress bar to clear stale values
        self._update_progress(0)
        
        # Run processing in separate thread to keep UI responsive
        thread = threading.Thread(target=self._process_videos)
        thread.daemon = True
        thread.start()
    
    
    def _process_videos(self):
        """Process all selected video files."""
        total_videos = len(self.video_files)
        target_fps = self.fps_var.get()
        
        for idx, video_path in enumerate(self.video_files):
            video_name = Path(video_path).stem
            
            # Update status
            self._update_status(f"Processing video {idx + 1}/{total_videos}: {video_name}")
            
            # Create output folder
            output_folder = Path(video_path).parent / video_name
            output_folder.mkdir(exist_ok=True)
            
            # Extract frames
            success = self._extract_frames(video_path, output_folder, target_fps, idx, total_videos)
            
            if not success:
                self._show_error(f"Failed to process: {video_name}")
        
        # Processing complete
        self._update_status(f"Complete! Processed {total_videos} video(s)")
        self._update_progress(100)
        self.is_processing = False
        self.root.after(0, lambda btn=self.process_button: btn.config(state="normal"))
        self._show_info(f"Frame extraction complete!\nProcessed {total_videos} video(s)")
    
    
    def _extract_frames(self, video_path, output_folder, target_fps, video_index, total_videos):
        """
        Extract frames from a video file at specified frame rate.
        Uses PIL for metadata-aware saving with photogrammetry optimization.
        
        Args:
            video_path: Path to the video file
            output_folder: Folder to save extracted frames
            target_fps: Target frames per second to extract
            video_index: Current video index (for progress calculation)
            total_videos: Total number of videos to process
        
        Returns:
            True if successful, False otherwise
        """
        # Cache video name for efficiency
        video_name = Path(video_path).name
        cap = None
        
        try:
            # Extract video metadata for EXIF embedding
            video_metadata = self._extract_video_metadata(video_path)
            
            # Convert to string explicitly for cv2
            cap = cv2.VideoCapture(str(video_path))
            
            if not cap.isOpened():
                self._show_error(f"Could not open video: {video_name}")
                return False
            
            # Get video properties
            video_fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            # Validate video properties
            if video_fps <= 0 or video_fps > 1000:
                self._show_error(f"Invalid video FPS ({video_fps}) for: {video_name}")
                return False
            
            if total_frames <= 0:
                self._show_error(f"Invalid frame count ({total_frames}) for: {video_name}")
                return False
            
            # Validate target FPS
            if target_fps <= 0:
                self._show_error(f"Invalid target FPS ({target_fps})")
                return False
            
            # Calculate frame interval
            frame_interval = int(video_fps / target_fps) if target_fps < video_fps else 1
            
            frame_count = 0
            saved_count = 0
            
            while True:
                ret, frame = cap.read()
                
                if not ret:
                    break
                
                # Save frame at specified interval
                if frame_count % frame_interval == 0:
                    output_path = output_folder / f"frame_{saved_count:06d}.png"
                    
                    # Save with photogrammetry-optimized metadata (BGR->RGB conversion + EXIF)
                    success = self._save_frame_with_metadata(
                        frame, output_path, video_metadata, saved_count, target_fps
                    )
                    
                    if success:
                        saved_count += 1
                    else:
                        print(f"Warning: Failed to save frame {saved_count}")
                
                frame_count += 1
                
                # Throttle UI updates to every 30 frames for efficiency
                if frame_count % 30 == 0:
                    # Update progress
                    video_progress = (frame_count / total_frames) * 100
                    overall_progress = ((video_index + (frame_count / total_frames)) / total_videos) * 100
                    self._update_progress(overall_progress)
                    
                    # Update status with frame info
                    self._update_status(
                        f"Processing: {video_name} - "
                        f"Frame {frame_count}/{total_frames} ({video_progress:.1f}%) - "
                        f"Saved: {saved_count} frames"
                    )
            
            self._update_status(f"Completed: {video_name} - Saved {saved_count} frames with metadata")
            
            return True
            
        except Exception as e:
            error_msg = f"Error processing {video_name}: {str(e)}"
            print(error_msg)
            self._show_error(error_msg)
            return False
        
        finally:
            # Always release video capture resource
            if cap is not None:
                cap.release()
    
    
    def _update_status(self, message):
        """Update status label (thread-safe)."""
        self.root.after(0, lambda: self.status_label.config(text=message))
    
    
    def _update_progress(self, value):
        """Update progress bar (thread-safe)."""
        self.root.after(0, lambda: self.progress_bar.config(value=value))
    
    
    def _show_error(self, message):
        """Show error message (thread-safe)."""
        self.root.after(0, lambda: messagebox.showerror("Error", message))
    
    
    def _show_info(self, message):
        """Show info message (thread-safe)."""
        self.root.after(0, lambda: messagebox.showinfo("Complete", message))


def main():
    """Entry point for the application."""
    root = tk.Tk()
    app = VideoFrameExtractor(root)
    root.mainloop()


if __name__ == "__main__":
    main()