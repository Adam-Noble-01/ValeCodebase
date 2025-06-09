#!/usr/bin/env python3
"""
Simple test script to validate Tesseract OCR installation and connectivity.
"""

import os
import pytesseract

# Set the path to your Tesseract installation
TESSERACT_PATH = r"C:\03_-_Adam-Noble-Tools\02_-_Python\Temp\dependencies\tesseract.exe"

def test_tesseract_installation():
    """Test if Tesseract is properly installed and accessible."""
    print("=" * 60)
    print("TESSERACT OCR INSTALLATION TEST")
    print("=" * 60)
    
    # Test 1: Check if executable exists
    print(f"\n1. Checking if Tesseract executable exists...")
    print(f"   Path: {TESSERACT_PATH}")
    
    if os.path.exists(TESSERACT_PATH):
        print("   ✓ Tesseract executable found!")
    else:
        print("   ✗ Tesseract executable NOT found!")
        return False
    
    # Test 2: Set pytesseract path
    print(f"\n2. Setting pytesseract path...")
    try:
        pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH
        print("   ✓ Pytesseract path set successfully!")
    except Exception as e:
        print(f"   ✗ Failed to set pytesseract path: {e}")
        return False
    
    # Test 3: Get version
    print(f"\n3. Getting Tesseract version...")
    try:
        version = pytesseract.get_tesseract_version()
        print(f"   ✓ Tesseract version: {version}")
    except Exception as e:
        print(f"   ✗ Failed to get Tesseract version: {e}")
        return False
    
    print(f"\n" + "=" * 60)
    print("✓ ALL TESTS PASSED - Tesseract is ready for OCR!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = test_tesseract_installation()
    if success:
        print("\nYou can now run the FigJam Color Totals GUI script!")
    else:
        print("\nPlease fix the Tesseract installation issues before proceeding.") 