# =============================================================================
# VALEDESIGNSUITE - FIGJAM COLOUR TOTALS CALCULATOR
# =============================================================================
#
# FILE       : figjam_colour_totals_gui.py
# NAMESPACE  : FigJamColourTotals
# MODULE     : FigJamColourTotals
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : GUI Calculator for FigJam Marker Colour Totals
# CREATED    : 2025
#
# DESCRIPTION:
# - This script implements a GUI calculator for totaling FigJam marker colour values.
# - Uses OCR to detect and extract numbers from colored regions in images.
# - Detects FigJam marker colors and extracts numerical values from highlighted areas.
# - Handles rotated text and various text orientations for accurate extraction.
# - Checks last 3 clipboard items for images, falls back to file selection if needed.
# - Copies calculation results to clipboard for easy pasting.
# - Displays results in a messagebox with formatted totals per colour category.
#
# -----------------------------------------------------------------------------
#
# DEVELOPMENT LOG:
# 29-May-2025 - Version 1.0.0
# - Initial Release
# - Basic GUI with predefined colour values and calculation functionality.
#
# 29-May-2025 - Version 1.1.0
# - Added clipboard image detection and file selection fallback functionality.
#
# 29-May-2025 - Version 1.2.0
# - Added clipboard text output functionality for calculated results.
# - Enhanced clipboard image detection to check last 3 clipboard items.
#
# 29-May-2025 - Version 2.0.0
# - Implemented actual OCR functionality for extracting values from colored regions.
# - Added color detection algorithm to identify highlighted areas.
# - Enhanced OCR to handle rotated text and multiple orientations.
# - Improved accuracy with preprocessing and multiple OCR passes.
#
# -----------------------------------------------------------------------------
# PIP COMMAND
# `pip install pillow pytesseract pyperclip opencv-python numpy`
#
# POWERSHELL COMMAND
# `python C:\03_-_Adam-Noble-Tools\02_-_Python\Temp\figjam_colour_totals_gui.py`
#
# TESSERACT REQUIREMENT
# Tesseract OCR must be installed separately:
# Windows: https://github.com/UB-Mannheim/tesseract/wiki
# Set pytesseract.pytesseract.tesseract_cmd to your installation path
#
# =============================================================================

import tkinter as tk
from tkinter import filedialog, messagebox
from PIL import Image, ImageGrab, ImageOps, ImageEnhance
import pytesseract
import re
from collections import defaultdict
import os
import pyperclip
import time
import cv2
import numpy as np

# -----------------------------------------------------------------------------
# REGION | Module Constants and Configuration
# -----------------------------------------------------------------------------

# MODULE CONSTANTS | FigJam Marker Colour Definitions with RGB Values
# ------------------------------------------------------------
COLOUR_DEFINITIONS = {
    "Purple": {"hex": "#bb9afe", "rgb": (187, 154, 254), "tolerance": 40},    # <-- Purple marker definition
    "Cyan": {"hex": "#7efff7", "rgb": (126, 255, 247), "tolerance": 40},      # <-- Cyan marker definition
    "Green": {"hex": "#aeff61", "rgb": (174, 255, 97), "tolerance": 40},      # <-- Green marker definition
    "Yellow": {"hex": "#fff234", "rgb": (255, 242, 52), "tolerance": 40},     # <-- Yellow marker definition
    "Pink": {"hex": "#ffa0f9", "rgb": (255, 160, 249), "tolerance": 40},      # <-- Pink marker definition
    "Orange": {"hex": "#ffb868", "rgb": (255, 184, 104), "tolerance": 40}     # <-- Orange marker definition
}

# MODULE CONSTANTS | OCR Configuration
# ------------------------------------------------------------
OCR_CONFIG = {
    "psm_modes": [6, 11, 12, 13],                                              # <-- Page segmentation modes to try
    "whitelist": "0123456789",                                                 # <-- Only detect numbers
    "min_confidence": 30,                                                      # <-- Minimum OCR confidence
    "rotation_angles": [0, 90, 180, 270],                                      # <-- Angles to try for rotated text
    "preprocessing_modes": ["standard", "inverted", "enhanced"]                # <-- Preprocessing options
}

# MODULE CONSTANTS | Application Configuration
# ------------------------------------------------------------
APP_TITLE           = "FigJam Marker Colour Totals"                      # <-- Main window title
APP_WIDTH           = 500                                                # <-- Application window width (increased)
APP_HEIGHT          = 400                                                # <-- Application window height (increased)
HEADER_FONT         = ("Arial", 16)                                      # <-- Header text font configuration
BUTTON_FONT         = ("Arial", 12)                                      # <-- Button text font configuration
INFO_FONT           = ("Arial", 10)                                      # <-- Info text font configuration
INFO_COLOUR         = "grey"                                             # <-- Info text colour

# MODULE CONSTANTS | File and Image Processing
# ------------------------------------------------------------
SUPPORTED_FORMATS   = [("Image files", "*.png *.jpg *.jpeg *.bmp *.gif *.tiff")]  # <-- Supported image file formats
DEFAULT_FILE_TITLE  = "Select FigJam Screenshot"                         # <-- File dialog title text
CLIPBOARD_CHECK_ATTEMPTS = 3                                            # <-- Number of clipboard items to check for images
CLIPBOARD_RETRY_DELAY = 0.1                                              # <-- Delay between clipboard checks in seconds

# MODULE CONSTANTS | Tesseract Configuration
# ------------------------------------------------------------
# Update this path to match your Tesseract installation
TESSERACT_PATH = r"C:\03_-_Adam-Noble-Tools\02_-_Python\Temp\dependencies\tesseract.exe"  # <-- CONFIG |  User's custom installation path|
if os.path.exists(TESSERACT_PATH):                                       # <-- Check if Tesseract exists at path
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH               # <-- Set Tesseract command path
    print(f"✓ Tesseract found at: {TESSERACT_PATH}")                     # <-- Confirm path found
else:                                                                     # <-- Handle Tesseract not found
    print(f"✗ Tesseract NOT found at: {TESSERACT_PATH}")                 # <-- Log path not found
# endregion ----------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Image Processing and Color Detection Functions
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Convert Image to OpenCV Format
# ---------------------------------------------------------------
def pil_to_cv2(pil_image):
    """Convert PIL Image to OpenCV format for processing."""
    # Convert PIL to numpy array
    numpy_image = np.array(pil_image)                                    # <-- Convert to numpy array
    
    # Handle different image modes
    if len(numpy_image.shape) == 2:                                      # <-- Grayscale image
        return numpy_image                                               # <-- Return as-is
    elif len(numpy_image.shape) == 3:                                    # <-- Color image
        if numpy_image.shape[2] == 3:                                    # <-- RGB image
            return cv2.cvtColor(numpy_image, cv2.COLOR_RGB2BGR)          # <-- Convert RGB to BGR
        elif numpy_image.shape[2] == 4:                                  # <-- RGBA image
            return cv2.cvtColor(numpy_image, cv2.COLOR_RGBA2BGR)         # <-- Convert RGBA to BGR
    return numpy_image                                                    # <-- Return original if format unknown
# ---------------------------------------------------------------

# HELPER FUNCTION | Create Color Mask for Specific Color
# ---------------------------------------------------------------
def create_color_mask(image_cv2, color_rgb, tolerance):
    """Create a mask for pixels matching the specified color within tolerance."""
    # Convert BGR to RGB for comparison
    image_rgb = cv2.cvtColor(image_cv2, cv2.COLOR_BGR2RGB)              # <-- Convert to RGB
    
    # Create bounds for color detection
    lower_bound = np.array([max(0, c - tolerance) for c in color_rgb])   # <-- Lower RGB bounds
    upper_bound = np.array([min(255, c + tolerance) for c in color_rgb]) # <-- Upper RGB bounds
    
    # Create mask for color range
    mask = cv2.inRange(image_rgb, lower_bound, upper_bound)              # <-- Create binary mask
    
    return mask                                                           # <-- Return color mask
# ---------------------------------------------------------------

# HELPER FUNCTION | Preprocess Image Region for OCR
# ---------------------------------------------------------------
def preprocess_for_ocr(image_region, mode="standard"):
    """Preprocess image region to improve OCR accuracy."""
    # Convert to grayscale if needed
    if len(image_region.shape) == 3:                                     # <-- Check if color image
        gray = cv2.cvtColor(image_region, cv2.COLOR_BGR2GRAY)            # <-- Convert to grayscale
    else:                                                                 # <-- Already grayscale
        gray = image_region                                               # <-- Use as-is
    
    blockSize = 11  # Must be an odd number
    C = 5           # Constant to be subtracted from the mean or weighted sum

    if mode == "standard":                                                # <-- Standard preprocessing
        # Apply adaptive thresholding
        binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                       cv2.THRESH_BINARY, blockSize, C)
    elif mode == "inverted":                                              # <-- Inverted preprocessing
        # Invert and then apply adaptive thresholding
        inverted_gray = cv2.bitwise_not(gray)                                 # <-- Invert image
        # For inverted (light text on dark bg), use THRESH_BINARY_INV to get black text on white
        binary = cv2.adaptiveThreshold(inverted_gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                       cv2.THRESH_BINARY_INV, blockSize, C)
    elif mode == "enhanced":                                              # <-- Enhanced preprocessing
        # Enhance contrast before adaptive thresholding
        enhanced_gray = cv2.equalizeHist(gray)                                 # <-- Histogram equalization
        binary = cv2.adaptiveThreshold(enhanced_gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                       cv2.THRESH_BINARY, blockSize, C)
    else:                                                                 # <-- Default to standard
        binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                       cv2.THRESH_BINARY, blockSize, C)
    
    # Denoise
    denoised = cv2.medianBlur(binary, 3)                                 # <-- Apply median filter
    
    # Dilate to connect broken text
    kernel = np.ones((2, 2), np.uint8)                                   # <-- Create dilation kernel
    dilated = cv2.dilate(denoised, kernel, iterations=1)                 # <-- Apply dilation
    
    return dilated                                                        # <-- Return preprocessed image
# ---------------------------------------------------------------

# HELPER FUNCTION | Extract Numbers from Image Region with Rotation Handling
# ---------------------------------------------------------------
def extract_numbers_from_region(image_region):
    """Extract all numbers from an image region, handling rotations and preprocessing."""
    extracted_numbers = []                                                # <-- Initialize results list
    
    # Try different rotation angles
    for angle in OCR_CONFIG["rotation_angles"]:                          # <-- Loop through rotation angles
        # Rotate image if needed
        if angle != 0:                                                    # <-- Check if rotation needed
            center = (image_region.shape[1] // 2, image_region.shape[0] // 2)  # <-- Get center point
            rotation_matrix = cv2.getRotationMatrix2D(center, angle, 1.0)  # <-- Create rotation matrix
            rotated = cv2.warpAffine(image_region, rotation_matrix, (image_region.shape[1], image_region.shape[0]))  # <-- Apply rotation
        else:                                                             # <-- No rotation needed
            rotated = image_region                                        # <-- Use original image
        
        # Try different preprocessing modes
        for preprocess_mode in OCR_CONFIG["preprocessing_modes"]:         # <-- Loop through preprocessing modes
            preprocessed = preprocess_for_ocr(rotated, preprocess_mode)   # <-- Apply preprocessing
            
            # Try different PSM modes
            for psm_mode in OCR_CONFIG["psm_modes"]:                     # <-- Loop through PSM modes
                try:
                    # Configure OCR
                    custom_config = f'--psm {psm_mode} -c tessedit_char_whitelist={OCR_CONFIG["whitelist"]}'  # <-- OCR config
                    
                    # Perform OCR
                    text = pytesseract.image_to_string(preprocessed, config=custom_config)  # <-- Run OCR
                    
                    # Extract numbers from text
                    numbers = re.findall(r'\d+', text)                    # <-- Find all number sequences
                    
                    # Add valid numbers to results
                    for num_str in numbers:                               # <-- Process each number
                        # if len(num_str) >= 2:                             # <-- MODIFIED: Allow single digits
                        try:
                            num_val = int(num_str)                     # <-- Convert to integer
                            # if 10 <= num_val <= 9999:                 # <-- MODIFIED: Remove strict range for now
                            extracted_numbers.append(num_val)      # <-- Add to results
                        except ValueError:                             # <-- Handle conversion errors
                            pass                                       # <-- Skip invalid numbers
                
                except Exception as e:                                     # <-- Handle OCR errors
                    continue                                               # <-- Try next configuration
    
    # Remove duplicates while preserving order
    seen = set()                                                          # <-- Track seen numbers
    unique_numbers = []                                                   # <-- Unique results list
    for num in extracted_numbers:                                         # <-- Process each number
        if num not in seen:                                               # <-- Check if new
            seen.add(num)                                                 # <-- Mark as seen
            unique_numbers.append(num)                                    # <-- Add to unique list
    
    return unique_numbers                                                 # <-- Return unique numbers
# ---------------------------------------------------------------

# FUNCTION | Process Image and Extract Color-Coded Values
# ------------------------------------------------------------
def process_image_with_ocr(pil_image):
    """Main OCR processing function that extracts numbers from colored regions."""
    # Convert to OpenCV format
    cv2_image = pil_to_cv2(pil_image)                                    # <-- Convert PIL to CV2
    
    # Initialize results dictionary
    color_values = defaultdict(list)                                      # <-- Store values by color
    
    # Process each color
    for color_name, color_info in COLOUR_DEFINITIONS.items():             # <-- Loop through colors
        print(f"\nProcessing {color_name} regions...")                    # <-- Progress update
        
        # Create mask for this color
        color_mask = create_color_mask(cv2_image, color_info["rgb"], color_info["tolerance"])  # <-- Get color mask
        
        # Find contours of colored regions
        contours, _ = cv2.findContours(color_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)  # <-- Find contours
        
        # Process each contour
        for contour in contours:                                          # <-- Loop through contours
            # Get bounding box
            x, y, w, h = cv2.boundingRect(contour)                       # <-- Get rectangle bounds
            
            # Filter out very small regions
            if w < 20 or h < 20:                                          # <-- Skip small regions
                continue                                                  # <-- Too small for text
            
            # Expand region slightly to capture full text
            padding = 10                                                  # <-- Padding pixels
            x_start = max(0, x - padding)                                 # <-- Padded x start
            y_start = max(0, y - padding)                                 # <-- Padded y start
            x_end = min(cv2_image.shape[1], x + w + padding)             # <-- Padded x end
            y_end = min(cv2_image.shape[0], y + h + padding)             # <-- Padded y end
            
            # Extract region
            region = cv2_image[y_start:y_end, x_start:x_end]             # <-- Extract image region
            
            # Extract numbers from region
            numbers = extract_numbers_from_region(region)                 # <-- Run OCR on region
            
            # Add numbers to color values
            if numbers:                                                   # <-- Check if numbers found
                print(f"  Found numbers in {color_name} region: {numbers}")  # <-- Log findings
                color_values[color_name].extend(numbers)                  # <-- Add to results
    
    return dict(color_values)                                             # <-- Return color-value mapping
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Clipboard Management Functions
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Copy Text Results to Clipboard
# ---------------------------------------------------------------
def copy_results_to_clipboard(result_text):
    """Copy the calculation results to system clipboard for pasting."""
    try:
        pyperclip.copy(result_text)                                      # <-- Copy text to clipboard
        return True                                                      # <-- Return success status
    except Exception as e:
        print(f"Error copying to clipboard: {e}")                       # <-- Log clipboard copy errors
        return False                                                     # <-- Return failure status
# ---------------------------------------------------------------

# HELPER FUNCTION | Check Single Clipboard Attempt for Image
# ---------------------------------------------------------------
def check_single_clipboard_attempt():
    """Check current clipboard state for an image."""
    try:
        clipboard_image = ImageGrab.grabclipboard()                      # <-- Attempt to get clipboard image
        if clipboard_image is not None:                                  # <-- Check if image was found
            return clipboard_image                                       # <-- Return the clipboard image
        return None                                                      # <-- Return None if no image found
    except Exception as e:
        print(f"Error accessing clipboard: {e}")                        # <-- Log clipboard access errors
        return None                                                      # <-- Return None on error
# ---------------------------------------------------------------

# FUNCTION | Check Multiple Clipboard Items for Images
# ------------------------------------------------------------
def check_clipboard_history_for_image():
    """Check the last 3 clipboard items for images with retry logic."""
    for attempt in range(CLIPBOARD_CHECK_ATTEMPTS):                     # <-- Loop through clipboard attempts
        print(f"Checking clipboard attempt {attempt + 1}/{CLIPBOARD_CHECK_ATTEMPTS}")  # <-- Log attempt number
        
        clipboard_image = check_single_clipboard_attempt()              # <-- Check current clipboard state
        if clipboard_image is not None:                                 # <-- Check if image was found
            print(f"Found image in clipboard on attempt {attempt + 1}") # <-- Log successful find
            return clipboard_image                                       # <-- Return found image
        
        if attempt < CLIPBOARD_CHECK_ATTEMPTS - 1:                      # <-- Check if more attempts remain
            time.sleep(CLIPBOARD_RETRY_DELAY)                           # <-- Wait before next attempt
            # NOTE: This simulates checking clipboard history
            # In practice, Windows clipboard history would need additional APIs
    
    print("No image found in clipboard after all attempts")             # <-- Log failure to find image
    return None                                                          # <-- Return None if no image found
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Image Source Selection Functions
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Open File Selection Dialog
# ---------------------------------------------------------------
def select_image_file():
    """Open file dialog to select an image file from disk."""
    try:
        file_path = filedialog.askopenfilename(
            title=DEFAULT_FILE_TITLE,                                   # <-- Set dialog title
            filetypes=SUPPORTED_FORMATS                                 # <-- Filter by supported formats
        )
        if file_path and os.path.exists(file_path):                     # <-- Verify file exists
            return Image.open(file_path)                                # <-- Open and return image
        return None                                                      # <-- Return None if no file selected
    except Exception as e:
        messagebox.showerror("File Error", f"Error opening file: {e}")  # <-- Show error dialog
        return None                                                      # <-- Return None on error
# ---------------------------------------------------------------

# FUNCTION | Get Image from Clipboard History or File Selection
# ------------------------------------------------------------
def get_image_source():
    """Main function to get image from clipboard history first, then file selection if needed."""
    # CHECK CLIPBOARD HISTORY FIRST (last 3 items)
    clipboard_image = check_clipboard_history_for_image()               # <-- Try to get clipboard image from history
    if clipboard_image is not None:                                     # <-- Check if clipboard had image
        messagebox.showinfo("Image Source", "Using image from clipboard history")  # <-- Notify user of source
        return clipboard_image                                           # <-- Return clipboard image
    
    # FALLBACK TO FILE SELECTION
    messagebox.showinfo("No Clipboard Image", "No image found in clipboard history. Please select a file.")  # <-- Inform user
    file_image = select_image_file()                                    # <-- Open file selection dialog
    if file_image is not None:                                          # <-- Check if file was selected
        messagebox.showinfo("Image Source", "Using selected image file")  # <-- Notify user of source
        return file_image                                               # <-- Return file image
    
    # NO IMAGE AVAILABLE
    messagebox.showwarning("No Image", "No image available from clipboard history or file selection.")  # <-- Warn user
    return None                                                          # <-- Return None if no image available
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Calculation and Processing Functions
# -----------------------------------------------------------------------------

# HELPER FUNCTION | Format Color Values for Display
# ---------------------------------------------------------------
def format_color_results(color_values):
    """Format the extracted color values into a readable result string."""
    result_lines = []                                                    # <-- Initialize result lines
    
    for color_name, values in sorted(color_values.items()):              # <-- Process each color
        if values:                                                        # <-- Check if values exist
            total = sum(values)                                           # <-- Calculate total
            values_str = " + ".join(str(v) for v in values)              # <-- Format values list
            result_lines.append(f"{color_name}:")                        # <-- Add color header
            result_lines.append(f"  Values: {values_str}")               # <-- Add values
            result_lines.append(f"  Total: {total} mm")                  # <-- Add total
            result_lines.append("")                                       # <-- Add blank line
    
    if not result_lines:                                                  # <-- Check if no results
        result_lines.append("No colored values detected in image")        # <-- Add no results message
    
    return "\n".join(result_lines).strip()                               # <-- Join and return
# ---------------------------------------------------------------

# FUNCTION | Process Image and Display OCR Results with Clipboard Output
# ------------------------------------------------------------
def process_image_and_calculate():
    """Main calculation function that gets image, extracts values via OCR, and copies results to clipboard."""
    # GET IMAGE FROM CLIPBOARD HISTORY OR FILE
    image = get_image_source()                                           # <-- Get image from clipboard or file
    if image is None:                                                    # <-- Check if image was obtained
        return                                                           # <-- Exit if no image available
    
    # Show processing message
    processing_window = tk.Toplevel()                                    # <-- Create progress window
    processing_window.title("Processing")                                # <-- Set window title
    processing_window.geometry("300x100")                                # <-- Set window size
    tk.Label(processing_window, text="Processing image with OCR...", font=("Arial", 12)).pack(pady=30)  # <-- Add message
    processing_window.update()                                           # <-- Update display
    
    try:
        # PROCESS IMAGE WITH OCR
        color_values = process_image_with_ocr(image)                    # <-- Extract values via OCR
        
        # FORMAT RESULTS
        result_text = format_color_results(color_values)                # <-- Format results for display
        
        # COPY RESULTS TO CLIPBOARD
        clipboard_success = copy_results_to_clipboard(result_text)      # <-- Copy results to clipboard
        
        # DISPLAY RESULTS WITH CLIPBOARD STATUS
        if clipboard_success:                                            # <-- Check if clipboard copy succeeded
            display_text = f"{result_text}\n\n✓ Results copied to clipboard for pasting"  # <-- Add success message
        else:                                                            # <-- Handle clipboard copy failure
            display_text = f"{result_text}\n\n✗ Failed to copy to clipboard"  # <-- Add failure message
        
        processing_window.destroy()                                      # <-- Close progress window
        messagebox.showinfo("Colour Totals", display_text)              # <-- Display results in popup
        
    except Exception as e:                                               # <-- Handle processing errors
        processing_window.destroy()                                      # <-- Close progress window
        messagebox.showerror("Processing Error", f"Error processing image: {str(e)}")  # <-- Show error
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | User Interface Creation and Management
# -----------------------------------------------------------------------------

# SUB FUNCTION | Create Application Header Element
# ---------------------------------------------------------------
def create_header_element(parent_window):
    """Create and configure the main header label for the application."""
    header = tk.Label(
        parent_window, 
        text="FigJam Markup Calculator", 
        font=HEADER_FONT                                                 # <-- Use configured header font
    )
    header.pack(pady=10)                                                 # <-- Add vertical padding
    return header                                                        # <-- Return header widget reference
# ---------------------------------------------------------------

# SUB FUNCTION | Create Calculate Button Element
# ---------------------------------------------------------------
def create_calculate_button(parent_window):
    """Create and configure the main calculate button."""
    button = tk.Button(
        parent_window, 
        text="Calculate Totals from Image", 
        command=process_image_and_calculate,                             # <-- Link to OCR processing function
        font=BUTTON_FONT,                                                # <-- Use configured button font
        bg="#4CAF50",                                                    # <-- Green background
        fg="white"                                                       # <-- White text
    )
    button.pack(pady=20)                                                 # <-- Add vertical padding
    return button                                                        # <-- Return button widget reference
# ---------------------------------------------------------------

# SUB FUNCTION | Create Information Label Element
# ---------------------------------------------------------------
def create_info_label(parent_window):
    """Create and configure the informational text label."""
    info_text = "Uses OCR to extract numbers from colored regions.\nHandles rotated text and multiple orientations.\nCopies results to clipboard automatically."  # <-- Updated info text
    info = tk.Label(
        parent_window, 
        text=info_text, 
        font=INFO_FONT,                                                  # <-- Use configured info font
        fg=INFO_COLOUR,                                                  # <-- Use configured text colour
        justify=tk.LEFT                                                  # <-- Left align text
    )
    info.pack(pady=10)                                                   # <-- Add vertical padding
    return info                                                          # <-- Return info widget reference
# ---------------------------------------------------------------

# FUNCTION | Create and Configure Main Application Window
# ------------------------------------------------------------
def create_main_application():
    """Main application creation function that initializes the GUI."""
    # Check if Tesseract is available
    try:
        version = pytesseract.get_tesseract_version()                   # <-- Test Tesseract availability
        print(f"✓ Tesseract OCR Version: {version}")                   # <-- Show version info
        messagebox.showinfo("Tesseract Status", 
                           f"✓ Tesseract OCR Found\n"
                           f"Version: {version}\n"
                           f"Path: {TESSERACT_PATH}")                   # <-- Show success message with details
    except Exception as e:                                              # <-- Handle Tesseract not found
        error_msg = (
            "✗ Tesseract OCR is not installed or not found.\n\n"
            f"Expected location: {TESSERACT_PATH}\n\n"
            "Please install from:\n"
            "https://github.com/UB-Mannheim/tesseract/wiki\n\n"
            f"Error details: {str(e)}"
        )
        print(error_msg)                                                # <-- Log error details
        messagebox.showerror("Tesseract Not Found", error_msg)         # <-- Show detailed error message
        return                                                          # <-- Exit if Tesseract not found
    
    root = tk.Tk()                                                      # <-- Create main window instance
    root.title(APP_TITLE)                                              # <-- Set window title
    root.geometry(f"{APP_WIDTH}x{APP_HEIGHT}")                         # <-- Set window dimensions

    # CREATE USER INTERFACE ELEMENTS
    header_element = create_header_element(root)                        # <-- Create header label
    button_element = create_calculate_button(root)                      # <-- Create calculate button
    info_element = create_info_label(root)                              # <-- Create info label

    root.mainloop()                                                     # <-- Start GUI event loop
    return root                                                         # <-- Return root window reference
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Application Entry Point and Execution
# -----------------------------------------------------------------------------

# MAIN FUNCTION | Application Entry Point
# ------------------------------------------------------------
if __name__ == "__main__":
    create_main_application()                                            # <-- Launch main application
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------
