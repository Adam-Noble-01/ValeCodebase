# =============================================================================
# FIGJAM COLOUR TOTALS CALCULATOR - FIXED VERSION
# =============================================================================
# Robust version that handles handwritten text on colored highlights

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
# Configuration
# -----------------------------------------------------------------------------

# Set Tesseract path
TESSERACT_PATH = r"C:\03_-_Adam-Noble-Tools\02_-_Python\Temp\dependencies\tesseract.exe"
if os.path.exists(TESSERACT_PATH):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

# FigJam colors in HSV (more reliable than RGB for highlights)
FIGJAM_COLORS_HSV = {
    "Green": [(40, 40, 40), (80, 255, 255)],      # Green highlighter
    "Yellow": [(20, 40, 40), (40, 255, 255)],     # Yellow highlighter  
    "Pink": [(140, 40, 40), (180, 255, 255)],     # Pink/Magenta highlighter
    "Purple": [(100, 40, 40), (140, 255, 255)],   # Purple highlighter
    "Cyan": [(80, 40, 40), (100, 255, 255)],      # Cyan highlighter
    "Orange": [(10, 40, 40), (20, 255, 255)]      # Orange highlighter
}

# -----------------------------------------------------------------------------
# Core Processing Functions
# -----------------------------------------------------------------------------

def preprocess_for_text_detection(image):
    """Preprocess image to extract text regions regardless of color."""
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply CLAHE for better contrast
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(gray)
    
    # Use adaptive threshold to handle varying backgrounds
    binary = cv2.adaptiveThreshold(enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                  cv2.THRESH_BINARY_INV, 21, 10)
    
    # Morphological operations to clean up
    kernel = np.ones((2,2), np.uint8)
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
    
    return cleaned, gray

def find_text_contours(binary_image):
    """Find contours that likely contain text."""
    contours, _ = cv2.findContours(binary_image, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    text_contours = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        
        # Filter based on realistic text dimensions
        area = cv2.contourArea(contour)
        if (15 < h < 80 and          # Height range for text
            10 < w < 200 and         # Width range
            0.2 < w/h < 8 and        # Aspect ratio
            area > 100):             # Minimum area
            text_contours.append((x, y, w, h))
    
    return text_contours

def extract_number_from_region(gray_image, x, y, w, h):
    """Extract number from a specific region using multiple OCR attempts."""
    # Add padding
    pad = 5
    y1 = max(0, y - pad)
    y2 = min(gray_image.shape[0], y + h + pad)
    x1 = max(0, x - pad)
    x2 = min(gray_image.shape[1], x + w + pad)
    
    region = gray_image[y1:y2, x1:x2]
    
    # Scale up for better OCR
    scale = 3
    scaled = cv2.resize(region, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    
    # Try different preprocessing methods
    methods = []
    
    # Method 1: OTSU thresholding
    _, thresh1 = cv2.threshold(scaled, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    methods.append(thresh1)
    
    # Method 2: Inverted OTSU
    methods.append(cv2.bitwise_not(thresh1))
    
    # Method 3: Adaptive threshold
    thresh2 = cv2.adaptiveThreshold(scaled, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                   cv2.THRESH_BINARY, 11, 2)
    methods.append(thresh2)
    
    # Method 4: Inverted adaptive
    methods.append(cv2.bitwise_not(thresh2))
    
    # Try OCR on each method
    for method_img in methods:
        try:
            # Use PSM 8 for single word/number
            text = pytesseract.image_to_string(
                method_img,
                config='--psm 8 -c tessedit_char_whitelist=0123456789'
            ).strip()
            
            # Extract valid numbers
            numbers = re.findall(r'\d+', text)
            for num_str in numbers:
                if 2 <= len(num_str) <= 4:  # 2-4 digit numbers
                    num = int(num_str)
                    if 10 <= num <= 9999:  # Reasonable range
                        return num
        except:
            continue
    
    return None

def get_color_at_location(hsv_image, x, y, w, h):
    """Determine the highlight color at a text location."""
    # Sample the area around the text
    margin = 10
    y1 = max(0, y - margin)
    y2 = min(hsv_image.shape[0], y + h + margin)
    x1 = max(0, x - margin)
    x2 = min(hsv_image.shape[1], x + w + margin)
    
    region = hsv_image[y1:y2, x1:x2]
    
    # Check each color
    best_match = None
    best_count = 0
    
    for color_name, (lower, upper) in FIGJAM_COLORS_HSV.items():
        mask = cv2.inRange(region, np.array(lower), np.array(upper))
        count = cv2.countNonZero(mask)
        
        if count > best_count and count > region.size * 0.1:  # At least 10% match
            best_match = color_name
            best_count = count
    
    return best_match

def process_figjam_image(pil_image):
    """Main processing function."""
    # Convert to OpenCV format
    cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
    hsv_image = cv2.cvtColor(cv_image, cv2.COLOR_BGR2HSV)
    
    # Preprocess for text detection
    binary, gray = preprocess_for_text_detection(cv_image)
    
    # Find text regions
    text_regions = find_text_contours(binary)
    print(f"Found {len(text_regions)} potential text regions")
    
    # Extract numbers and their colors
    results = defaultdict(list)
    
    for x, y, w, h in text_regions:
        # Extract number
        number = extract_number_from_region(gray, x, y, w, h)
        if number:
            # Get color at this location
            color = get_color_at_location(hsv_image, x, y, w, h)
            if color:
                results[color].append(number)
                print(f"  Found {number} in {color} region")
    
    return dict(results)

# -----------------------------------------------------------------------------
# GUI Functions
# -----------------------------------------------------------------------------

def get_image():
    """Get image from clipboard or file."""
    # Try clipboard first
    try:
        img = ImageGrab.grabclipboard()
        if img:
            return img
    except:
        pass
    
    # File dialog
    path = filedialog.askopenfilename(
        title="Select FigJam Image",
        filetypes=[("Images", "*.png *.jpg *.jpeg *.bmp")]
    )
    if path:
        return Image.open(path)
    return None

def format_results(color_totals):
    """Format results for display."""
    if not color_totals:
        return "No highlighted numbers found"
    
    lines = []
    grand_total = 0
    
    for color in sorted(color_totals.keys()):
        values = sorted(color_totals[color])
        total = sum(values)
        grand_total += total
        
        lines.append(f"{color}:")
        lines.append(f"  Values: {' + '.join(map(str, values))}")
        lines.append(f"  Total: {total:,} mm")
        lines.append("")
    
    lines.append(f"Grand Total: {grand_total:,} mm")
    
    return "\n".join(lines)

def process_image():
    """Main processing function called by GUI."""
    img = get_image()
    if not img:
        return
    
    # Show processing dialog
    processing = tk.Toplevel()
    processing.title("Processing")
    processing.geometry("250x80")
    tk.Label(processing, text="Analyzing image...", font=("Arial", 12)).pack(pady=20)
    processing.update()
    
    try:
        # Process image
        results = process_figjam_image(img)
        
        # Format results
        output = format_results(results)
        
        # Copy to clipboard
        pyperclip.copy(output)
        
        # Close processing dialog
        processing.destroy()
        
        # Show results
        messagebox.showinfo(
            "FigJam Colour Totals",
            output + "\n\n✓ Results copied to clipboard"
        )
        
    except Exception as e:
        processing.destroy()
        messagebox.showerror("Error", f"Processing failed:\n{str(e)}")

def create_gui():
    """Create main GUI window."""
    root = tk.Tk()
    root.title("FigJam Colour Calculator")
    root.geometry("400x300")
    
    # Title
    tk.Label(
        root,
        text="FigJam Colour Totals",
        font=("Arial", 18, "bold")
    ).pack(pady=20)
    
    # Info
    tk.Label(
        root,
        text="Extracts numbers from colored highlights\nin FigJam screenshots",
        font=("Arial", 11),
        fg="gray"
    ).pack(pady=10)
    
    # Process button
    tk.Button(
        root,
        text="Process Image",
        command=process_image,
        font=("Arial", 14),
        bg="#4CAF50",
        fg="white",
        padx=30,
        pady=10
    ).pack(pady=20)
    
    # Instructions
    tk.Label(
        root,
        text="Image source:\n1. Copy image to clipboard, or\n2. Select from file dialog",
        font=("Arial", 10),
        fg="gray",
        justify="center"
    ).pack(pady=10)
    
    root.mainloop()

if __name__ == "__main__":
    # Check Tesseract
    try:
        pytesseract.get_tesseract_version()
    except:
        messagebox.showerror(
            "Tesseract Not Found",
            "Tesseract OCR is required but not found.\n"
            "Please install from:\n"
            "https://github.com/UB-Mannheim/tesseract/wiki"
        )
        exit(1)
    
    create_gui() 