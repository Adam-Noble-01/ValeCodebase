import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import cv2
import numpy as np
import os
import threading
import logging
from skimage.metrics import structural_similarity as ssim

# --- Configuration for Logging ---
LOG_FORMAT = '%(asctime)s - %(levelname)s - %(message)s'
# logging.basicConfig(level=logging.INFO, format=LOG_FORMAT, filename='photogrammetry_processor.log', filemode='a') # Optional: Log to file
logger = logging.getLogger(__name__)
if not logger.handlers: # Avoid duplicate handlers if script is re-run in some environments
    logger.setLevel(logging.INFO)
    console_handler = logging.StreamHandler() # For console output (if running without GUI for debugging)
    console_handler.setFormatter(logging.Formatter(LOG_FORMAT))
    logger.addHandler(console_handler)


# --- Core Image Processing Functions ---

def calculate_laplacian_variance(image):
    """Calculates the variance of the Laplacian: a measure of blur.
    Lower values indicate more blur.
    """
    if len(image.shape) == 3: # Color image
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else: # Already grayscale
        gray = image
    return cv2.Laplacian(gray, cv2.CV_64F).var()

def apply_clahe(image, clip_limit=2.0, tile_grid_size=(8, 8)):
    """Applies CLAHE to the L channel of an LAB image for contrast enhancement."""
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
    cl = clahe.apply(l_channel)
    limg = cv2.merge((cl, a_channel, b_channel))
    return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

def sharpen_image(image):
    """Applies a simple sharpening kernel."""
    kernel = np.array([[0, -1, 0],
                       [-1, 5, -1],
                       [0, -1, 0]])
    return cv2.filter2D(image, -1, kernel)

def denoise_image(image, h_luminance=10, h_color=10, template_window_size=7, search_window_size=21):
    """Applies Fast Non-Local Means Denoising."""
    return cv2.fastNlMeansDenoisingColored(image, None, h_luminance, h_color, template_window_size, search_window_size)


# --- Main Video Processing Logic ---

def process_video_file(video_path, output_dir_base, params, progress_callback, log_callback):
    """
    Processes a single video file for photogrammetry.
    """
    video_filename = os.path.basename(video_path)
    video_name_no_ext = os.path.splitext(video_filename)[0]
    output_frames_dir = os.path.join(output_dir_base, f"{video_name_no_ext}_frames")

    try:
        os.makedirs(output_frames_dir, exist_ok=True)
        log_callback(f"Created output directory: {output_frames_dir}")
    except OSError as e:
        log_callback(f"Error creating directory {output_frames_dir}: {e}", "error")
        return

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        log_callback(f"Error: Could not open video file {video_path}", "error")
        return

    video_fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    log_callback(f"Processing '{video_filename}': FPS={video_fps:.2f}, Total Frames={total_frames}")

    if video_fps == 0:
        log_callback(f"Warning: Video FPS reported as 0 for '{video_filename}'. Assuming 30 FPS for extraction rate calculation.", "warning")
        video_fps = 30 # Default if FPS is not readable

    extract_every_n_frames = max(1, int(video_fps / params['target_fps_extract']))
    log_callback(f"Extraction target: {params['target_fps_extract']} FPS from video. Will extract 1 frame every {extract_every_n_frames} video frames.")

    frame_count = 0
    extracted_count = 0
    skipped_blur_count = 0
    skipped_ssim_count = 0
    last_kept_frame_gray = None

    while True:
        ret, frame = cap.read()
        if not ret:
            break # End of video or error

        frame_count += 1
        progress_callback(frame_count, total_frames, f"Reading frame {frame_count}/{total_frames}")

        if frame_count % extract_every_n_frames != 0:
            continue # Skip this frame based on extraction rate

        # 1. Blur Detection
        laplacian_var = calculate_laplacian_variance(frame)
        if laplacian_var < params['blur_threshold']:
            # log_callback(f"Frame {frame_count}: Skipped (Blurry - Laplacian Var: {laplacian_var:.2f})", "debug") # Too verbose for main log
            skipped_blur_count +=1
            continue
        
        # --- Start Pre-processing ---
        processed_frame = frame.copy()

        # 2. Denoising (if enabled)
        if params['apply_denoise']:
            processed_frame = denoise_image(processed_frame, 
                                            h_luminance=params['denoise_h_lum'], 
                                            h_color=params['denoise_h_col'])

        # 3. CLAHE (Contrast Enhancement - if enabled)
        if params['apply_clahe']:
            processed_frame = apply_clahe(processed_frame)

        # 4. Sharpening (if enabled)
        if params['apply_sharpen']:
            processed_frame = sharpen_image(processed_frame)
        
        # --- End Pre-processing ---

        # 5. Redundant Frame Culling (SSIM)
        # Convert current processed frame to grayscale for SSIM
        current_frame_gray = cv2.cvtColor(processed_frame, cv2.COLOR_BGR2GRAY)
        if last_kept_frame_gray is not None and params['apply_ssim_culling']:
            # Resize for faster SSIM comparison, maintain aspect ratio
            h, w = current_frame_gray.shape
            th, tw = last_kept_frame_gray.shape
            
            # Ensure dimensions are compatible for SSIM. If very different (unlikely for video frames), skip SSIM.
            if h != th or w != tw:
                 # Should not happen often with video frames, but as a safeguard
                 log_callback(f"Frame {frame_count}: Dimension mismatch for SSIM. Skipping comparison.", "warning")
            else:
                similarity_index = ssim(last_kept_frame_gray, current_frame_gray)
                if similarity_index > params['ssim_threshold']:
                    # log_callback(f"Frame {frame_count}: Skipped (Too similar to previous - SSIM: {similarity_index:.4f})", "debug")
                    skipped_ssim_count += 1
                    continue
        
        last_kept_frame_gray = current_frame_gray # Update last_kept_frame *after* successful SSIM check and before saving

        # Save the processed frame
        extracted_count += 1
        output_frame_filename = f"frame_{extracted_count:05d}.png"
        output_frame_path = os.path.join(output_frames_dir, output_frame_filename)
        
        try:
            cv2.imwrite(output_frame_path, processed_frame, [cv2.IMWRITE_PNG_COMPRESSION, params['png_compression']]) # 0-9, 3 is default
            if extracted_count % 10 == 0: # Log every 10th saved frame to avoid flooding
                 log_callback(f"Saved: {output_frame_path} (Laplacian: {laplacian_var:.2f})")
        except Exception as e:
            log_callback(f"Error writing frame {output_frame_path}: {e}", "error")

    cap.release()
    log_callback(f"Finished processing '{video_filename}'.")
    log_callback(f"Extracted: {extracted_count} frames.")
    log_callback(f"Skipped (Blurry): {skipped_blur_count} frames.")
    log_callback(f"Skipped (Redundant by SSIM): {skipped_ssim_count} frames.")
    log_callback("-" * 30)


# --- Tkinter GUI Application ---

class PhotogrammetryProcessorApp:
    def __init__(self, root_tk):
        self.root = root_tk
        self.root.title("Photogrammetry Video Processor")
        self.root.geometry("800x700")

        self.video_paths = []
        self.output_dir = tk.StringVar(value=os.getcwd())

        # --- UI Elements ---
        # Frame for file selection
        file_frame = ttk.LabelFrame(root_tk, text="Input/Output", padding=10)
        file_frame.pack(padx=10, pady=10, fill="x")

        ttk.Button(file_frame, text="Select Video Files", command=self.select_video_files).pack(side=tk.LEFT, padx=5)
        self.selected_files_label = ttk.Label(file_frame, text="No files selected.")
        self.selected_files_label.pack(side=tk.LEFT, padx=5, fill="x", expand=True)

        ttk.Button(file_frame, text="Select Output Folder", command=self.select_output_folder).pack(side=tk.LEFT, padx=5, pady=5)
        self.output_dir_label = ttk.Label(file_frame, textvariable=self.output_dir, wraplength=200)
        self.output_dir_label.pack(side=tk.LEFT, padx=5, pady=5, fill="x", expand=True)
        
        # --- Parameters Frame ---
        params_frame = ttk.LabelFrame(root_tk, text="Processing Parameters", padding=10)
        params_frame.pack(padx=10, pady=10, fill="both", expand=True)

        # Using a canvas and scrollbar for parameters if they grow too numerous
        canvas = tk.Canvas(params_frame)
        scrollbar = ttk.Scrollbar(params_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)

        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(
                scrollregion=canvas.bbox("all")
            )
        )
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        # Parameter variables
        self.target_fps_extract = tk.DoubleVar(value=5.0)
        self.blur_threshold = tk.DoubleVar(value=100.0) # Higher means less strict (more frames pass)
        
        self.apply_denoise = tk.BooleanVar(value=True)
        self.denoise_h_lum = tk.IntVar(value=7) # Strength for luminance
        self.denoise_h_col = tk.IntVar(value=7) # Strength for color
        
        self.apply_clahe = tk.BooleanVar(value=True)
        self.clahe_clip_limit = tk.DoubleVar(value=2.0)
        self.clahe_tile_size = tk.IntVar(value=8)

        self.apply_sharpen = tk.BooleanVar(value=True)
        
        self.apply_ssim_culling = tk.BooleanVar(value=True)
        self.ssim_threshold = tk.DoubleVar(value=0.98) # Higher means more strict (more frames culled as redundant)
        self.png_compression = tk.IntVar(value=3) # 0 (no compression) to 9 (max compression)

        # Layout parameters in scrollable_frame
        current_row = 0
        ttk.Label(scrollable_frame, text="Target FPS for Extraction:").grid(row=current_row, column=0, sticky="w", padx=5, pady=2)
        ttk.Entry(scrollable_frame, textvariable=self.target_fps_extract, width=10).grid(row=current_row, column=1, sticky="w", padx=5, pady=2)
        current_row += 1

        ttk.Label(scrollable_frame, text="Blur Threshold (Laplacian Var):").grid(row=current_row, column=0, sticky="w", padx=5, pady=2)
        ttk.Entry(scrollable_frame, textvariable=self.blur_threshold, width=10).grid(row=current_row, column=1, sticky="w", padx=5, pady=2)
        current_row += 1
        
        ttk.Separator(scrollable_frame, orient='horizontal').grid(row=current_row, columnspan=2, sticky='ew', pady=5)
        current_row += 1

        # Denoise
        ttk.Checkbutton(scrollable_frame, text="Apply Denoising", variable=self.apply_denoise).grid(row=current_row, column=0, sticky="w", padx=5, pady=2)
        current_row += 1
        ttk.Label(scrollable_frame, text="  Denoise Strength (Luminance):").grid(row=current_row, column=0, sticky="w", padx=20, pady=2)
        ttk.Entry(scrollable_frame, textvariable=self.denoise_h_lum, width=5).grid(row=current_row, column=1, sticky="w", padx=5, pady=2)
        current_row += 1
        ttk.Label(scrollable_frame, text="  Denoise Strength (Color):").grid(row=current_row, column=0, sticky="w", padx=20, pady=2)
        ttk.Entry(scrollable_frame, textvariable=self.denoise_h_col, width=5).grid(row=current_row, column=1, sticky="w", padx=5, pady=2)
        current_row += 1
        
        ttk.Separator(scrollable_frame, orient='horizontal').grid(row=current_row, columnspan=2, sticky='ew', pady=5)
        current_row += 1
        
        # CLAHE
        ttk.Checkbutton(scrollable_frame, text="Apply CLAHE (Contrast)", variable=self.apply_clahe).grid(row=current_row, column=0, sticky="w", padx=5, pady=2)
        current_row += 1
        ttk.Label(scrollable_frame, text="  CLAHE Clip Limit:").grid(row=current_row, column=0, sticky="w", padx=20, pady=2)
        ttk.Entry(scrollable_frame, textvariable=self.clahe_clip_limit, width=5).grid(row=current_row, column=1, sticky="w", padx=5, pady=2)
        current_row += 1
        ttk.Label(scrollable_frame, text="  CLAHE Tile Size:").grid(row=current_row, column=0, sticky="w", padx=20, pady=2)
        ttk.Entry(scrollable_frame, textvariable=self.clahe_tile_size, width=5).grid(row=current_row, column=1, sticky="w", padx=5, pady=2)
        current_row += 1

        ttk.Separator(scrollable_frame, orient='horizontal').grid(row=current_row, columnspan=2, sticky='ew', pady=5)
        current_row += 1

        # Sharpen
        ttk.Checkbutton(scrollable_frame, text="Apply Sharpening", variable=self.apply_sharpen).grid(row=current_row, column=0, sticky="w", padx=5, pady=2)
        current_row += 1

        ttk.Separator(scrollable_frame, orient='horizontal').grid(row=current_row, columnspan=2, sticky='ew', pady=5)
        current_row += 1

        # SSIM
        ttk.Checkbutton(scrollable_frame, text="Apply SSIM Redundancy Culling", variable=self.apply_ssim_culling).grid(row=current_row, column=0, sticky="w", padx=5, pady=2)
        current_row += 1
        ttk.Label(scrollable_frame, text="  SSIM Threshold (0.0-1.0):").grid(row=current_row, column=0, sticky="w", padx=20, pady=2)
        ttk.Entry(scrollable_frame, textvariable=self.ssim_threshold, width=5).grid(row=current_row, column=1, sticky="w", padx=5, pady=2)
        current_row += 1

        ttk.Separator(scrollable_frame, orient='horizontal').grid(row=current_row, columnspan=2, sticky='ew', pady=5)
        current_row += 1

        ttk.Label(scrollable_frame, text="PNG Compression (0-9):").grid(row=current_row, column=0, sticky="w", padx=5, pady=2)
        ttk.Entry(scrollable_frame, textvariable=self.png_compression, width=5).grid(row=current_row, column=1, sticky="w", padx=5, pady=2)
        current_row += 1

        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")


        # --- Controls and Progress Frame ---
        control_frame = ttk.Frame(root_tk, padding=10)
        control_frame.pack(padx=10, pady=10, fill="x")

        self.start_button = ttk.Button(control_frame, text="Start Processing", command=self.start_processing_thread)
        self.start_button.pack(side=tk.LEFT, padx=5)

        self.progress_var = tk.DoubleVar()
        self.progressbar = ttk.Progressbar(control_frame, orient="horizontal", mode="determinate", variable=self.progress_var)
        self.progressbar.pack(side=tk.LEFT, padx=5, fill="x", expand=True)
        
        self.status_label = ttk.Label(control_frame, text="")
        self.status_label.pack(side=tk.LEFT, padx=5)


        # --- Log Text Area ---
        log_frame = ttk.LabelFrame(root_tk, text="Log", padding=10)
        log_frame.pack(padx=10, pady=10, fill="both", expand=True)
        
        self.log_text = tk.Text(log_frame, height=10, wrap=tk.WORD, state=tk.DISABLED)
        log_scroll_y = ttk.Scrollbar(log_frame, orient="vertical", command=self.log_text.yview)
        self.log_text['yscrollcommand'] = log_scroll_y.set
        
        log_scroll_y.pack(side=tk.RIGHT, fill=tk.Y)
        self.log_text.pack(side=tk.LEFT, fill="both", expand=True)

        # Add custom handler to logger
        gui_log_handler = GUILogHandler(self.log_text)
        gui_log_handler.setFormatter(logging.Formatter(LOG_FORMAT))
        logger.addHandler(gui_log_handler)


    def select_video_files(self):
        # Your research focuses on MP4 from Pixel, but other common types are fine
        filetypes = (("Video files", "*.mp4 *.mov *.avi *.mkv"), ("All files", "*.*"))
        selected = filedialog.askopenfilenames(title="Select Video Files", filetypes=filetypes)
        if selected:
            self.video_paths = selected
            self.selected_files_label.config(text=f"{len(self.video_paths)} file(s) selected: {', '.join(map(os.path.basename, self.video_paths[:2]))}{'...' if len(self.video_paths) > 2 else ''}")
            logger.info(f"Selected video files: {self.video_paths}")
        else:
            self.selected_files_label.config(text="No files selected.")


    def select_output_folder(self):
        selected_dir = filedialog.askdirectory(title="Select Output Folder", initialdir=self.output_dir.get())
        if selected_dir:
            self.output_dir.set(selected_dir)
            logger.info(f"Selected output directory: {self.output_dir.get()}")

    def update_gui_progress(self, current, total, message):
        if total > 0:
            self.progress_var.set((current / total) * 100)
        else:
            self.progress_var.set(0)
        self.status_label.config(text=message)
        self.root.update_idletasks() # Crucial for UI updates from thread

    def log_to_gui(self, message, level="info"):
        """Logs message to GUI text area and Python logger."""
        # This is now handled by the GUILogHandler for logger messages
        # For direct GUI messages (like button clicks) or simple status, use:
        # self.log_text.config(state=tk.NORMAL)
        # self.log_text.insert(tk.END, f"{message}\n")
        # self.log_text.config(state=tk.DISABLED)
        # self.log_text.see(tk.END)
        # self.root.update_idletasks()
        
        # We can still use this to send to logger which then updates GUI
        if level == "info":
            logger.info(message)
        elif level == "warning":
            logger.warning(message)
        elif level == "error":
            logger.error(message)
        elif level == "debug":
            logger.debug(message)


    def start_processing_thread(self):
        if not self.video_paths:
            messagebox.showerror("Error", "No video files selected.")
            return
        if not self.output_dir.get() or not os.path.isdir(self.output_dir.get()):
            messagebox.showerror("Error", "Invalid output directory selected.")
            return

        try:
            params = {
                'target_fps_extract': self.target_fps_extract.get(),
                'blur_threshold': self.blur_threshold.get(),
                'apply_denoise': self.apply_denoise.get(),
                'denoise_h_lum': self.denoise_h_lum.get(),
                'denoise_h_col': self.denoise_h_col.get(),
                'apply_clahe': self.apply_clahe.get(),
                'clahe_clip_limit': self.clahe_clip_limit.get(),
                'clahe_tile_size': self.clahe_tile_size.get(),
                'apply_sharpen': self.apply_sharpen.get(),
                'apply_ssim_culling': self.apply_ssim_culling.get(),
                'ssim_threshold': self.ssim_threshold.get(),
                'png_compression': self.png_compression.get()
            }
            # Basic validation
            if not (0 <= params['png_compression'] <= 9):
                messagebox.showerror("Error", "PNG Compression must be between 0 and 9.")
                return
            if not (0.0 <= params['ssim_threshold'] <= 1.0):
                messagebox.showerror("Error", "SSIM Threshold must be between 0.0 and 1.0.")
                return
            if params['target_fps_extract'] <= 0:
                 messagebox.showerror("Error", "Target FPS for extraction must be greater than 0.")
                 return

        except tk.TclError as e:
            messagebox.showerror("Input Error", f"Invalid parameter value: {e}")
            return
        
        self.start_button.config(state=tk.DISABLED)
        self.progress_var.set(0)
        self.status_label.config(text="Starting...")

        # Run processing in a separate thread
        thread = threading.Thread(target=self.run_all_videos, args=(params,), daemon=True)
        thread.start()

    def run_all_videos(self, params):
        total_videos = len(self.video_paths)
        for i, video_path in enumerate(self.video_paths):
            self.root.after(0, self.update_gui_progress, 0, 0, f"Processing video {i+1}/{total_videos}: {os.path.basename(video_path)}")
            self.root.after(0, self.log_to_gui, f"Starting processing for video {i+1}/{total_videos}: {video_path}")
            
            # For progress within a single video:
            # Need to pass self.root.after wrapped calls to process_video_file
            # progress_callback for a single video processing
            def single_video_progress_updater(current, total, message):
                 self.root.after(0, self.update_gui_progress, current, total, message)
            
            # log_callback (will use logger that updates GUI)
            def single_video_log_updater(message, level="info"):
                if level == "info": logger.info(message)
                elif level == "warning": logger.warning(message)
                elif level == "error": logger.error(message)
                elif level == "debug": logger.debug(message)


            process_video_file(video_path, self.output_dir.get(), params, 
                               single_video_progress_updater,
                               single_video_log_updater)
            
        self.root.after(0, self.processing_finished)

    def processing_finished(self):
        self.status_label.config(text="All videos processed!")
        self.start_button.config(state=tk.NORMAL)
        self.progress_var.set(100) # Or set to 0 if preferred post-completion
        messagebox.showinfo("Complete", "All video processing finished.")
        logger.info("All video processing finished.")

class GUILogHandler(logging.Handler):
    """Custom logging handler to redirect logs to a Tkinter Text widget."""
    def __init__(self, text_widget):
        super().__init__()
        self.text_widget = text_widget
        self.text_widget.config(state=tk.NORMAL) # Ensure it's writable initially
        self.text_widget.delete(1.0, tk.END) # Clear previous logs on init
        self.text_widget.config(state=tk.DISABLED)


    def emit(self, record):
        msg = self.format(record)
        self.text_widget.config(state=tk.NORMAL)
        
        # Basic coloring based on log level
        level_tag = f"log_level_{record.levelname.lower()}"
        self.text_widget.tag_configure(level_tag, foreground=self.get_color_for_level(record.levelname))
        
        self.text_widget.insert(tk.END, msg + "\n", level_tag)
        self.text_widget.config(state=tk.DISABLED)
        self.text_widget.see(tk.END) # Auto-scroll
        self.text_widget.master.master.update_idletasks() # Refresh GUI

    def get_color_for_level(self, levelname):
        if levelname == "WARNING":
            return "orange"
        elif levelname == "ERROR" or levelname == "CRITICAL":
            return "red"
        elif levelname == "DEBUG":
            return "gray"
        return "black" # INFO and others


if __name__ == "__main__":
    root = tk.Tk()
    app = PhotogrammetryProcessorApp(root)
    root.mainloop()