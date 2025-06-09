# Debug version to analyze OCR issues
import cv2
import numpy as np
from PIL import Image, ImageGrab
import pytesseract
import os
from datetime import datetime

# Set Tesseract path
TESSERACT_PATH = r"C:\03_-_Adam-Noble-Tools\02_-_Python\Temp\dependencies\tesseract.exe"
if os.path.exists(TESSERACT_PATH):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

def create_debug_folder():
    """Create a debug folder with timestamp."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    folder = f"debug_output_{timestamp}"
    os.makedirs(folder, exist_ok=True)
    return folder

def analyze_image(image_path=None):
    """Analyze image and save debug outputs."""
    # Get image
    if image_path:
        image = Image.open(image_path)
    else:
        image = ImageGrab.grabclipboard()
        if not image:
            print("No image in clipboard!")
            return
    
    # Create debug folder
    debug_folder = create_debug_folder()
    print(f"Debug output folder: {debug_folder}")
    
    # Save original
    image.save(os.path.join(debug_folder, "00_original.png"))
    
    # Convert to OpenCV
    img_cv2 = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    
    # 1. Analyze color ranges in HSV
    hsv = cv2.cvtColor(img_cv2, cv2.COLOR_BGR2HSV)
    cv2.imwrite(os.path.join(debug_folder, "01_hsv.png"), hsv)
    
    # 2. Create color masks
    color_masks = {
        "Yellow": {"lower": np.array([20, 50, 100]), "upper": np.array([35, 255, 255])},
        "Green": {"lower": np.array([35, 50, 100]), "upper": np.array([85, 255, 255])},
        "Pink": {"lower": np.array([150, 50, 100]), "upper": np.array([180, 255, 255])},
    }
    
    for color_name, bounds in color_masks.items():
        mask = cv2.inRange(hsv, bounds["lower"], bounds["upper"])
        cv2.imwrite(os.path.join(debug_folder, f"02_mask_{color_name}.png"), mask)
        
        # Apply mask to original
        masked = cv2.bitwise_and(img_cv2, img_cv2, mask=mask)
        cv2.imwrite(os.path.join(debug_folder, f"03_masked_{color_name}.png"), masked)
    
    # 3. Text detection preprocessing
    gray = cv2.cvtColor(img_cv2, cv2.COLOR_BGR2GRAY)
    cv2.imwrite(os.path.join(debug_folder, "04_gray.png"), gray)
    
    # Different thresholding methods
    _, thresh1 = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)
    cv2.imwrite(os.path.join(debug_folder, "05_thresh_binary.png"), thresh1)
    
    _, thresh2 = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    cv2.imwrite(os.path.join(debug_folder, "06_thresh_otsu.png"), thresh2)
    
    thresh3 = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                   cv2.THRESH_BINARY, 11, 2)
    cv2.imwrite(os.path.join(debug_folder, "07_thresh_adaptive.png"), thresh3)
    
    # 4. Find and extract text regions
    contours, _ = cv2.findContours(thresh3, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Draw all contours
    contour_img = img_cv2.copy()
    cv2.drawContours(contour_img, contours, -1, (0, 255, 0), 2)
    cv2.imwrite(os.path.join(debug_folder, "08_all_contours.png"), contour_img)
    
    # Filter contours and extract text
    text_img = img_cv2.copy()
    valid_regions = []
    
    for i, contour in enumerate(contours):
        x, y, w, h = cv2.boundingRect(contour)
        
        # Filter by size
        if 15 < h < 100 and w > 10 and w/h < 10:
            cv2.rectangle(text_img, (x, y), (x+w, y+h), (255, 0, 0), 2)
            
            # Extract region
            region = gray[y:y+h, x:x+w]
            cv2.imwrite(os.path.join(debug_folder, f"09_region_{i}_raw.png"), region)
            
            # Try OCR on different preprocessed versions
            _, binary = cv2.threshold(region, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            cv2.imwrite(os.path.join(debug_folder, f"10_region_{i}_binary.png"), binary)
            
            # OCR attempts
            for j, img_to_ocr in enumerate([region, binary, cv2.bitwise_not(binary)]):
                try:
                    text = pytesseract.image_to_string(img_to_ocr, config='--psm 8 -c tessedit_char_whitelist=0123456789')
                    if text.strip():
                        print(f"Region {i} variant {j}: '{text.strip()}'")
                        valid_regions.append({
                            'text': text.strip(),
                            'x': x + w//2,
                            'y': y + h//2
                        })
                except:
                    pass
    
    cv2.imwrite(os.path.join(debug_folder, "11_text_regions.png"), text_img)
    
    # 5. Check color at text locations
    for region in valid_regions:
        x, y = region['x'], region['y']
        
        # Sample color in HSV
        sample_radius = 20
        y1 = max(0, y - sample_radius)
        y2 = min(hsv.shape[0], y + sample_radius)
        x1 = max(0, x - sample_radius)
        x2 = min(hsv.shape[1], x + sample_radius)
        
        sample = hsv[y1:y2, x1:x2]
        avg_hsv = np.mean(sample.reshape(-1, 3), axis=0)
        
        print(f"Text '{region['text']}' at ({x},{y}) - Average HSV: {avg_hsv}")
    
    print(f"\nDebug images saved to: {debug_folder}")

if __name__ == "__main__":
    # Try clipboard first, then use a file path if needed
    analyze_image() 