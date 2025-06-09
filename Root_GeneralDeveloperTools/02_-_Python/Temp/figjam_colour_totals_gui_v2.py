# =============================================================================
# VALEDESIGNSUITE - FIGJAM COLOUR TOTALS CALCULATOR V2
# =============================================================================
#
# FILE       : figjam_colour_totals_gui_v2.py
# NAMESPACE  : FigJamColourTotals
# MODULE     : FigJamColourTotals
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Improved GUI Calculator for FigJam Marker Colour Totals
# CREATED    : 2025
#
# DESCRIPTION:
# - Improved version that detects text first, then checks highlight colors
# - Better handling of handwritten text and various orientations
# - More accurate color detection for highlighted regions
#
# -----------------------------------------------------------------------------

import tkinter as tk
from tkinter import filedialog, messagebox
from PIL import Image, ImageGrab
import pytesseract
import re
from collections import defaultdict
import os
import pyperclip
import cv2
import numpy as np

# -----------------------------------------------------------------------------
# REGION | Module Constants and Configuration
# -----------------------------------------------------------------------------

# FigJam Marker Colour Definitions - Using HSV for better detection
COLOUR_DEFINITIONS_HSV = {
    "Purple": {"hsv_lower": (130, 30, 180), "hsv_upper": (160, 255, 255)},
    "Cyan": {"hsv_lower": (165, 30, 180), "hsv_upper": (185, 255, 255)},
    "Green": {"hsv_lower": (35, 30, 180), "hsv_upper": (85, 255, 255)},
    "Yellow": {"hsv_lower": (20, 30, 180), "hsv_upper": (35, 255, 255)},
    "Pink": {"hsv_lower": (160, 30, 180), "hsv_upper": (180, 255, 255)},
    "Orange": {"hsv_lower": (5, 30, 180), "hsv_upper": (20, 255, 255)}
}

# OCR Configuration
OCR_CONFIG = {
    "psm_mode": 11,  # Sparse text mode
    "whitelist": "0123456789",
    "min_text_height": 15,
    "max_text_height": 100
}

# Application Configuration
APP_TITLE = "FigJam Marker Colour Totals V2"
APP_WIDTH = 500
APP_HEIGHT = 400
TESSERACT_PATH = r"C:\03_-_Adam-Noble-Tools\02_-_Python\Temp\dependencies\tesseract.exe"

if os.path.exists(TESSERACT_PATH):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

# -----------------------------------------------------------------------------
# REGION | Improved Image Processing Functions
# -----------------------------------------------------------------------------

def extract_text_regions(image_cv2):
    """Extract all text regions from the image first."""
    # Convert to grayscale
    gray = cv2.cvtColor(image_cv2, cv2.COLOR_BGR2GRAY)
    
    # Apply adaptive thresholding for better text detection
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                  cv2.THRESH_BINARY_INV, 11, 2)
    
    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    text_regions = []
    
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        
        # Filter by size - text should be reasonable size
        if (OCR_CONFIG["min_text_height"] < h < OCR_CONFIG["max_text_height"] and 
            w > 10 and w/h < 10):  # Aspect ratio check
            
            # Extract region with padding
            padding = 5
            y1 = max(0, y - padding)
            y2 = min(image_cv2.shape[0], y + h + padding)
            x1 = max(0, x - padding)
            x2 = min(image_cv2.shape[1], x + w + padding)
            
            region = gray[y1:y2, x1:x2]
            
            # Try OCR on this region
            try:
                # Use better preprocessing for handwritten text
                _, binary = cv2.threshold(region, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                
                # Try normal and inverted
                for img in [binary, cv2.bitwise_not(binary)]:
                    text = pytesseract.image_to_string(
                        img, 
                        config=f'--psm {OCR_CONFIG["psm_mode"]} -c tessedit_char_whitelist={OCR_CONFIG["whitelist"]}'
                    )
                    
                    numbers = re.findall(r'\d+', text)
                    for num_str in numbers:
                        if len(num_str) >= 2:
                            try:
                                num_val = int(num_str)
                                if 10 <= num_val <= 9999:
                                    # Store the number and its location
                                    text_regions.append({
                                        'value': num_val,
                                        'x': x + w//2,  # Center point
                                        'y': y + h//2,
                                        'bbox': (x, y, w, h)
                                    })
                                    break
                            except:
                                pass
            except:
                continue
    
    return text_regions

def get_highlight_color_at_point(image_cv2, x, y, radius=15):
    """Determine what highlight color (if any) is at a given point."""
    # Convert to HSV for better color detection
    hsv = cv2.cvtColor(image_cv2, cv2.COLOR_BGR2HSV)
    
    # Sample area around the point
    y1 = max(0, y - radius)
    y2 = min(hsv.shape[0], y + radius)
    x1 = max(0, x - radius)
    x2 = min(hsv.shape[1], x + radius)
    
    region = hsv[y1:y2, x1:x2]
    
    # Check each color
    for color_name, hsv_range in COLOUR_DEFINITIONS_HSV.items():
        lower = np.array(hsv_range["hsv_lower"])
        upper = np.array(hsv_range["hsv_upper"])
        
        # Handle hue wrap-around for pink/red
        if lower[0] > upper[0]:
            mask1 = cv2.inRange(region, np.array([0, lower[1], lower[2]]), np.array([upper[0], upper[1], upper[2]]))
            mask2 = cv2.inRange(region, np.array([lower[0], lower[1], lower[2]]), np.array([180, upper[1], upper[2]]))
            mask = cv2.bitwise_or(mask1, mask2)
        else:
            mask = cv2.inRange(region, lower, upper)
        
        # If significant portion of region matches this color
        if np.sum(mask) > 255 * region.size * 0.3:  # 30% threshold
            return color_name
    
    return None

def process_image_improved(pil_image):
    """Improved processing that extracts text first, then checks colors."""
    # Convert to OpenCV format
    image_cv2 = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
    
    # Extract all text regions
    print("Extracting text regions...")
    text_regions = extract_text_regions(image_cv2)
    print(f"Found {len(text_regions)} text regions")
    
    # Group by highlight color
    color_values = defaultdict(list)
    
    for region in text_regions:
        # Determine highlight color at text location
        color = get_highlight_color_at_point(image_cv2, region['x'], region['y'])
        
        if color:
            color_values[color].append(region['value'])
            print(f"  {region['value']} -> {color}")
    
    return dict(color_values)

# -----------------------------------------------------------------------------
# REGION | UI and Main Functions (reuse from original with modifications)
# -----------------------------------------------------------------------------

def format_color_results(color_values):
    """Format the extracted color values into a readable result string."""
    result_lines = []
    
    for color_name, values in sorted(color_values.items()):
        if values:
            total = sum(values)
            values_str = " + ".join(str(v) for v in sorted(values))
            result_lines.append(f"{color_name}:")
            result_lines.append(f"  Values: {values_str}")
            result_lines.append(f"  Total: {total} mm")
            result_lines.append("")
    
    if not result_lines:
        result_lines.append("No colored values detected in image")
    
    return "\n".join(result_lines).strip()

def get_image_source():
    """Get image from clipboard or file selection."""
    try:
        clipboard_image = ImageGrab.grabclipboard()
        if clipboard_image:
            return clipboard_image
    except:
        pass
    
    # File selection
    file_path = filedialog.askopenfilename(
        title="Select FigJam Screenshot",
        filetypes=[("Image files", "*.png *.jpg *.jpeg *.bmp *.gif")]
    )
    
    if file_path:
        return Image.open(file_path)
    
    return None

def process_and_calculate():
    """Main processing function."""
    image = get_image_source()
    if not image:
        return
    
    processing_window = tk.Toplevel()
    processing_window.title("Processing")
    processing_window.geometry("300x100")
    tk.Label(processing_window, text="Processing image...", font=("Arial", 12)).pack(pady=30)
    processing_window.update()
    
    try:
        # Process with improved method
        color_values = process_image_improved(image)
        
        # Format and display results
        result_text = format_color_results(color_values)
        
        # Copy to clipboard
        pyperclip.copy(result_text)
        
        processing_window.destroy()
        messagebox.showinfo("Colour Totals", 
                          f"{result_text}\n\n✓ Results copied to clipboard")
        
    except Exception as e:
        processing_window.destroy()
        messagebox.showerror("Error", f"Processing failed: {str(e)}")

def create_gui():
    """Create the main GUI."""
    root = tk.Tk()
    root.title(APP_TITLE)
    root.geometry(f"{APP_WIDTH}x{APP_HEIGHT}")
    
    # Header
    tk.Label(root, text="FigJam Colour Calculator V2", 
             font=("Arial", 16)).pack(pady=10)
    
    # Main button
    tk.Button(root, text="Process Image", 
              command=process_and_calculate,
              font=("Arial", 12),
              bg="#4CAF50", fg="white").pack(pady=20)
    
    # Info
    tk.Label(root, text="Improved text detection and color matching",
             font=("Arial", 10), fg="gray").pack(pady=10)
    
    root.mainloop()

if __name__ == "__main__":
    create_gui() 