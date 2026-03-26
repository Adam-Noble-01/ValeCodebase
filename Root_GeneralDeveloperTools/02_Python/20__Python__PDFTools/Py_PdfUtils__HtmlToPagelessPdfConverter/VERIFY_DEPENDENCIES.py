#!/usr/bin/env python3
"""
Dependency Verification Script for HTML to Pageless PDF Converter
Verifies that all required dependencies are properly installed and locally scoped
"""

import sys
import os
from pathlib import Path
import importlib.util
import locale

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# =============================================================================
# VERIFICATION CONFIGURATION
# =============================================================================

# Define colors for terminal output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_colored(msg, color=Colors.RESET, bold=False):
    """Print colored message to console"""
    try:
        if bold:
            print(f"{Colors.BOLD}{color}{msg}{Colors.RESET}")
        else:
            print(f"{color}{msg}{Colors.RESET}")
    except UnicodeEncodeError:
        # Fallback for terminals that don't support unicode
        plain_msg = msg.replace('✓', '[OK]').replace('✗', '[FAIL]').replace('⚠', '[WARN]')
        print(plain_msg)

def print_header(title):
    """Print formatted header"""
    print()
    print_colored("=" * 60, Colors.CYAN, bold=True)
    print_colored(title, Colors.CYAN, bold=True)
    print_colored("=" * 60, Colors.CYAN, bold=True)

def print_section(title):
    """Print formatted section"""
    print()
    print_colored("-" * 60, Colors.CYAN)
    print_colored(title, Colors.CYAN, bold=True)
    print_colored("-" * 60, Colors.CYAN)

# =============================================================================
# VERIFICATION FUNCTIONS
# =============================================================================

def verify_local_library_path():
    """Verify local library path exists and is accessible"""
    local_lib_path = Path(__file__).parent / "01__LocalScope__ExternalCodeLibraries"
    
    if not local_lib_path.exists():
        print_colored(f"  [FAIL] Local library folder not found: {local_lib_path}", Colors.RED)
        return None
    
    if not local_lib_path.is_dir():
        print_colored(f"  [FAIL] Path exists but is not a directory: {local_lib_path}", Colors.RED)
        return None
    
    print_colored(f"  [OK] Local library folder found: {local_lib_path}", Colors.GREEN)
    return local_lib_path

def check_dependency_installed(lib_path, module_name, package_name=None):
    """Check if a specific dependency is installed locally"""
    if package_name is None:
        package_name = module_name
    
    # Check if module folder exists
    module_path = lib_path / module_name
    if not module_path.exists():
        print_colored(f"  [FAIL] {package_name} not found in local folder", Colors.RED)
        return False
    
    # Try to find the module spec from local path
    try:
        # Add local path to sys.path temporarily
        if str(lib_path) not in sys.path:
            sys.path.insert(0, str(lib_path))
        
        spec = importlib.util.find_spec(module_name)
        if spec is None:
            print_colored(f"  [FAIL] {package_name} found but not importable", Colors.RED)
            return False
        
        # Verify it's loading from local path
        if spec.origin and str(lib_path) in str(spec.origin):
            print_colored(f"  [OK] {package_name} installed locally", Colors.GREEN)
            return True
        else:
            print_colored(f"  [WARN] {package_name} found but loading from system path: {spec.origin}", Colors.YELLOW)
            return False
            
    except Exception as e:
        print_colored(f"  [FAIL] Error checking {package_name}: {e}", Colors.RED)
        return False

def test_import_dependency(lib_path, import_statement, description):
    """Test if a dependency can be imported and used"""
    # Ensure local lib path is first in sys.path
    if str(lib_path) not in sys.path:
        sys.path.insert(0, str(lib_path))
    
    try:
        exec(import_statement, {'__builtins__': __builtins__})
        print_colored(f"    [OK] {description}", Colors.GREEN)
        return True
    except ImportError as e:
        print_colored(f"    [FAIL] {description}: {e}", Colors.RED)
        return False
    except Exception as e:
        print_colored(f"    [FAIL] {description} (unexpected error): {e}", Colors.RED)
        return False

def check_playwright_browsers():
    """Check if Playwright browsers are installed"""
    try:
        import subprocess
        import os
        
        # Set PYTHONPATH to include local library
        lib_path = Path(__file__).parent / "01__LocalScope__ExternalCodeLibraries"
        env = os.environ.copy()
        env['PYTHONPATH'] = str(lib_path)
        
        result = subprocess.run([sys.executable, "-m", "playwright", "show", "chromium"], 
                              capture_output=True, text=True, env=env)
        if result.returncode == 0:
            print_colored("  [OK] Chromium browser is installed for Playwright", Colors.GREEN)
            return True
        else:
            # Check if chromium exists in standard location
            chromium_path = Path.home() / "AppData" / "Local" / "ms-playwright"
            if chromium_path.exists():
                chromium_dirs = list(chromium_path.glob("chromium-*"))
                if chromium_dirs:
                    print_colored("  [OK] Chromium browser is installed for Playwright", Colors.GREEN)
                    print_colored(f"    Location: {chromium_dirs[0]}", Colors.GREEN)
                    return True
            
            print_colored("  [FAIL] Chromium browser not installed", Colors.RED)
            print_colored("    Run: python -m playwright install chromium", Colors.YELLOW)
            return False
    except Exception as e:
        print_colored(f"  [FAIL] Could not check browser status: {e}", Colors.RED)
        return False

def verify_file_sizes(lib_path):
    """Verify that installed packages have reasonable sizes"""
    print_section("Package Size Verification")
    
    packages_to_check = [
        ("PIL", "Pillow (Image Processing)"),
        ("reportlab", "ReportLab (PDF Generation)"),
        ("playwright", "Playwright (Browser Automation)"),
        ("pyee", "PyEE (Event Emitter)"),
        ("greenlet", "Greenlet (Concurrency)"),
        ("charset_normalizer", "Charset Normalizer"),
        ("typing_extensions.py", "Typing Extensions")
    ]
    
    total_size = 0
    for package_dir, package_name in packages_to_check:
        package_path = lib_path / package_dir
        if package_path.exists():
            if package_path.is_file():
                size = package_path.stat().st_size
            else:
                size = sum(f.stat().st_size for f in package_path.rglob('*') if f.is_file())
            size_mb = size / (1024 * 1024)
            total_size += size_mb
            print(f"  {package_name:30} {size_mb:>8.2f} MB")
        else:
            print_colored(f"  {package_name:30} Not found", Colors.RED)
    
    print(f"  {'='*39}")
    print(f"  {'Total':30} {total_size:>8.2f} MB")

def main():
    """Main verification process"""
    print_header("DEPENDENCY VERIFICATION FOR HTML TO PDF CONVERTER")
    
    # Step 1: Check local library path
    print_section("Step 1: Local Library Path")
    lib_path = verify_local_library_path()
    if not lib_path:
        print_colored("\n[FAIL] VERIFICATION FAILED: No local library folder found", Colors.RED, bold=True)
        print_colored("\nRun one of these commands to install dependencies:", Colors.YELLOW)
        print("  - Windows CMD: INSTALL_DEPENDENCIES.bat")
        print("  - PowerShell:  .\\INSTALL_DEPENDENCIES.ps1")
        print("  - Manual:      python -m pip install pillow reportlab playwright --target ./01__LocalScope__ExternalCodeLibraries")
        return False
    
    # Step 2: Check required dependencies
    print_section("Step 2: Required Dependencies")
    
    dependencies = [
        ("PIL", "Pillow"),
        ("reportlab", "ReportLab"),
        ("playwright", "Playwright")
    ]
    
    all_installed = True
    for module_name, package_name in dependencies:
        if not check_dependency_installed(lib_path, module_name, package_name):
            all_installed = False
    
    # Step 3: Check supporting dependencies
    print_section("Step 3: Supporting Dependencies")
    
    support_deps = [
        ("pyee", "PyEE (Playwright dependency)"),
        ("greenlet", "Greenlet"),
        ("charset_normalizer", "Charset-Normalizer")
    ]
    
    for module_name, package_name in support_deps:
        check_dependency_installed(lib_path, module_name, package_name)
    
    # Step 4: Test imports
    print_section("Step 4: Import Tests")
    
    import_tests = [
        ("from PIL import Image, ImageTk", "PIL/Pillow Image processing"),
        ("from reportlab.pdfgen import canvas", "ReportLab PDF generation"),
        ("from reportlab.lib.units import mm", "ReportLab units"),
        ("import playwright", "Playwright base module"),
        ("from playwright.sync_api import sync_playwright", "Playwright sync API")
    ]
    
    all_imports_ok = True
    for import_stmt, description in import_tests:
        if not test_import_dependency(lib_path, import_stmt, description):
            all_imports_ok = False
    
    # Step 5: Check Playwright browsers
    print_section("Step 5: Browser Installation")
    browser_ok = check_playwright_browsers()
    
    # Step 6: Verify file sizes
    verify_file_sizes(lib_path)
    
    # Step 7: Test main script imports
    print_section("Step 6: Main Script Compatibility Test")
    
    main_script = Path(__file__).parent / "Py_PdfUtils__HtmlToPagelessPdfConverter__Main__.py"
    if main_script.exists():
        print_colored(f"  [OK] Main script found: {main_script.name}", Colors.GREEN)
        
        # Try importing the main script dependencies
        sys.path.insert(0, str(lib_path))
        try:
            from PIL import Image, ImageTk
            from reportlab.pdfgen import canvas
            from reportlab.lib.units import mm
            print_colored("  [OK] All main script dependencies importable", Colors.GREEN)
        except ImportError as e:
            print_colored(f"  [FAIL] Failed to import main script dependencies: {e}", Colors.RED)
    else:
        print_colored(f"  [FAIL] Main script not found", Colors.RED)
    
    # Final verdict
    print_header("VERIFICATION SUMMARY")
    
    if all_installed and all_imports_ok:
        print_colored("[OK] All core dependencies are properly installed and locally scoped!", Colors.GREEN, bold=True)
        
        if not browser_ok:
            print_colored("\n[WARN] Warning: Chromium browser not installed", Colors.YELLOW)
            print("  Run: python -m playwright install chromium")
        
        print_colored("\n[OK] The application is ready to run!", Colors.GREEN, bold=True)
        print("\n  Run: python Py_PdfUtils__HtmlToPagelessPdfConverter__Main__.py")
        return True
    else:
        print_colored("[FAIL] Some dependencies are missing or not properly installed", Colors.RED, bold=True)
        print_colored("\nTo fix:", Colors.YELLOW)
        print("  1. Run: INSTALL_DEPENDENCIES.bat (Windows)")
        print("     Or:  .\\INSTALL_DEPENDENCIES.ps1 (PowerShell)")
        print("  2. Then run this verification script again")
        return False

if __name__ == "__main__":
    try:
        success = main()
        print()
        # Only prompt if running interactively
        if sys.stdin.isatty():
            input("Press Enter to exit...")
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print_colored("\n\nVerification cancelled by user", Colors.YELLOW)
        sys.exit(1)
    except EOFError:
        # Running non-interactively, just exit
        sys.exit(0 if 'success' in locals() and success else 1)
    except Exception as e:
        print_colored(f"\n\nUnexpected error: {e}", Colors.RED)
        import traceback
        traceback.print_exc()
        # Only prompt if running interactively
        if sys.stdin.isatty():
            input("\nPress Enter to exit...")
        sys.exit(1)
