# =============================================================================
# VALEDESIGNSUITE - SVG COLOR CONVERTER GUI
# =============================================================================
#
# FILE       : Temp__RecolourSvgToValeColours__Main__.py
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : GUI tool for batch converting SVG colors
# CREATED    : 2025
#
# DESCRIPTION:
# - Tkinter-based GUI for selecting a folder containing SVG files
# - Converts all SVG files to a target color: Black, White, or Vale Blue
# - Replaces all fill and stroke colors in SVG files
# - Saves converted files with color-specific suffix
# - Provides status feedback during processing
#
# =============================================================================

import re
import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext
from pathlib import Path

# -----------------------------------------------------------------------------
# REGION | Color Configuration and Constants
# -----------------------------------------------------------------------------

# MODULE CONSTANTS | Color Definitions and Suffix Mappings
# ------------------------------------------------------------
COLOR_BLACK         = "#000000"                                      # <-- Black color target
COLOR_WHITE         = "#ffffff"                                      # <-- White color target
COLOR_VALE_BLUE     = "#172b3a"                                      # <-- Vale blue brand color

COLOR_OPTIONS = {
    "Black":      {"color": COLOR_BLACK,      "suffix": "__Black__"},
    "White":      {"color": COLOR_WHITE,      "suffix": "__White__"},
    "Vale Blue":  {"color": COLOR_VALE_BLUE,  "suffix": "__ValeBlue__"}
}
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Color Conversion Logic
# -----------------------------------------------------------------------------

# FUNCTION | Replace Black Colors in SVG with Target Color
# ------------------------------------------------------------
def replace_all_colors_with_target(svg_text, target_color):
    """
    Replaces black color values in SVG content with the target color.
    Handles various black representations: #000, #000000, rgb(0,0,0), 'black'.
    Preserves 'none' values for transparent fills/strokes.
    Based on proven color replacement logic.
    """
    replaced = svg_text
    
    # PATTERN LIST | Black color format patterns to match
    # ------------------------------------------------------------
    black_patterns = [
        r"(?i)#000\b",                                               # <-- 3-digit hex black
        r"(?i)#000000\b",                                            # <-- 6-digit hex black
        r"(?i)rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)",                      # <-- RGB black format
        r"(?i)\bblack\b",                                            # <-- Named 'black' color
    ]
    # ---------------------------------------------------------------
    
    # Replace all black color patterns with target color
    for pattern in black_patterns:
        replaced = re.sub(pattern, target_color, replaced)
    
    # Handle color property specifically (for currentColor inheritance)
    replaced = re.sub(r"(?i)color\s*:\s*black\b", f"color:{target_color}", replaced)
    
    # Handle fill and stroke in CSS style blocks
    replaced = re.sub(r"(?i)fill\s*:\s*black\b", f"fill:{target_color}", replaced)
    replaced = re.sub(r"(?i)stroke\s*:\s*black\b", f"stroke:{target_color}", replaced)
    
    return replaced
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | File Processing and Batch Operations
# -----------------------------------------------------------------------------

# FUNCTION | Process All SVG Files in Target Folder
# ------------------------------------------------------------
def process_svg_folder(folder_path, color_option, status_callback):
    """
    Batch processes all SVG files in the selected folder.
    Creates new files with color-specific suffix.
    """
    folder = Path(folder_path)
    svg_files = list(folder.glob("*.svg"))
    
    if not svg_files:
        status_callback("No SVG files found in selected folder.\n")
        return 0
    
    color_config = COLOR_OPTIONS[color_option]                       # <-- Get color and suffix
    target_color = color_config["color"]
    suffix = color_config["suffix"]
    
    processed_count = 0                                              # <-- Track successful conversions
    
    status_callback(f"Processing {len(svg_files)} SVG file(s)...\n")
    status_callback(f"Target color: {color_option} ({target_color})\n")
    status_callback("-" * 60 + "\n")
    
    for svg_file in svg_files:
        try:
            # Read original SVG content
            svg_content = svg_file.read_text(encoding="utf-8")
            
            # Convert colors
            converted_svg = replace_all_colors_with_target(svg_content, target_color)
            
            # Generate output filename with suffix
            output_name = svg_file.stem + suffix + svg_file.suffix
            output_path = svg_file.parent / output_name
            
            # Save converted file
            output_path.write_text(converted_svg, encoding="utf-8")
            
            status_callback(f"✓ Converted: {svg_file.name} → {output_name}\n")
            processed_count += 1
            
        except Exception as e:
            status_callback(f"✗ Error processing {svg_file.name}: {str(e)}\n")
    
    status_callback("-" * 60 + "\n")
    status_callback(f"Completed: {processed_count} of {len(svg_files)} files converted.\n")
    
    return processed_count
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | GUI Setup and Main Application
# -----------------------------------------------------------------------------

# CLASS | SVG Color Converter Application
# ------------------------------------------------------------
class SvgColorConverterApp:
    """
    Main GUI application for SVG color conversion.
    Provides folder selection and color option controls.
    """
    
    def __init__(self, root):
        self.root = root
        self.root.title("SVG Color Converter - Vale Design Suite")
        self.root.geometry("700x500")
        self.root.resizable(True, True)
        
        self.selected_folder = None                                  # <-- Store selected folder path
        self.color_choice = tk.StringVar(value="Vale Blue")         # <-- Default to Vale Blue
        
        self.setup_ui()                                              # <-- Build interface
    
    # SUB FUNCTION | Setup User Interface Components
    # ---------------------------------------------------------------
    def setup_ui(self):
        """Creates all UI elements and layout."""
        
        # TITLE SECTION
        title_frame = tk.Frame(self.root, bg="#172b3a", pady=15)
        title_frame.pack(fill=tk.X)
        
        title_label = tk.Label(
            title_frame,
            text="SVG Color Converter",
            font=("Segoe UI", 18, "bold"),
            bg="#172b3a",
            fg="white"
        )
        title_label.pack()
        
        subtitle_label = tk.Label(
            title_frame,
            text="Batch convert SVG files to Vale Design Suite colors",
            font=("Segoe UI", 10),
            bg="#172b3a",
            fg="#cccccc"
        )
        subtitle_label.pack()
        
        # CONTROL SECTION
        control_frame = tk.Frame(self.root, padx=20, pady=20)
        control_frame.pack(fill=tk.X)
        
        # Color option radio buttons
        color_label = tk.Label(
            control_frame,
            text="Select target color:",
            font=("Segoe UI", 11, "bold")
        )
        color_label.pack(anchor=tk.W, pady=(0, 10))
        
        radio_frame = tk.Frame(control_frame)
        radio_frame.pack(anchor=tk.W, pady=(0, 15))
        
        for color_name in COLOR_OPTIONS.keys():
            rb = tk.Radiobutton(
                radio_frame,
                text=f"{color_name}  ({COLOR_OPTIONS[color_name]['color']})",
                variable=self.color_choice,
                value=color_name,
                font=("Segoe UI", 10)
            )
            rb.pack(anchor=tk.W, pady=2)
        
        # Select folder and convert button
        button_frame = tk.Frame(control_frame)
        button_frame.pack(fill=tk.X)
        
        self.convert_button = tk.Button(
            button_frame,
            text="Select Folder & Convert",
            command=self.select_and_convert,
            font=("Segoe UI", 11, "bold"),
            bg="#172b3a",
            fg="white",
            activebackground="#2a4a5f",
            activeforeground="white",
            padx=20,
            pady=10,
            cursor="hand2"
        )
        self.convert_button.pack()
        
        # STATUS OUTPUT SECTION
        status_label = tk.Label(
            self.root,
            text="Status:",
            font=("Segoe UI", 11, "bold"),
            anchor=tk.W
        )
        status_label.pack(fill=tk.X, padx=20, pady=(10, 5))
        
        self.status_text = scrolledtext.ScrolledText(
            self.root,
            height=15,
            font=("Consolas", 9),
            bg="#f5f5f5",
            fg="#1e1e1e",
            wrap=tk.WORD
        )
        self.status_text.pack(fill=tk.BOTH, expand=True, padx=20, pady=(0, 20))
        
        # Initial status message
        self.append_status("Ready. Select a folder to begin conversion.\n")
    # ---------------------------------------------------------------
    
    # SUB FUNCTION | Append Status Message to Text Widget
    # ---------------------------------------------------------------
    def append_status(self, message):
        """Adds a status message to the scrolled text widget."""
        self.status_text.insert(tk.END, message)
        self.status_text.see(tk.END)                                 # <-- Auto-scroll to bottom
        self.root.update_idletasks()                                 # <-- Update UI immediately
    # ---------------------------------------------------------------
    
    # SUB FUNCTION | Select Folder and Perform Conversion
    # ---------------------------------------------------------------
    def select_and_convert(self):
        """Handles folder selection and initiates batch conversion."""
        
        # Open folder selection dialog
        folder_path = filedialog.askdirectory(
            title="Select folder containing SVG files",
            initialdir=Path.cwd()
        )
        
        if not folder_path:
            return                                                   # <-- User cancelled
        
        self.selected_folder = folder_path
        selected_color = self.color_choice.get()
        
        # Clear previous status
        self.status_text.delete(1.0, tk.END)
        
        self.append_status(f"Selected folder: {folder_path}\n")
        self.append_status(f"Selected color: {selected_color}\n")
        self.append_status("=" * 60 + "\n\n")
        
        # Disable button during processing
        self.convert_button.config(state=tk.DISABLED)
        
        try:
            # Process all SVG files
            count = process_svg_folder(
                folder_path,
                selected_color,
                self.append_status
            )
            
            # Show completion message
            if count > 0:
                messagebox.showinfo(
                    "Conversion Complete",
                    f"Successfully converted {count} SVG file(s)!"
                )
            else:
                messagebox.showwarning(
                    "No Files Processed",
                    "No SVG files were found or converted."
                )
                
        except Exception as e:
            self.append_status(f"\n✗ CRITICAL ERROR: {str(e)}\n")
            messagebox.showerror(
                "Conversion Error",
                f"An error occurred during conversion:\n{str(e)}"
            )
        
        finally:
            # Re-enable button
            self.convert_button.config(state=tk.NORMAL)
    # ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Application Entry Point
# -----------------------------------------------------------------------------

# FUNCTION | Main Application Entry Point
# ------------------------------------------------------------
def main():
    """Initialize and run the GUI application."""
    root = tk.Tk()
    app = SvgColorConverterApp(root)
    root.mainloop()
# ---------------------------------------------------------------

# endregion -------------------------------------------------------------------

if __name__ == "__main__":
    main()
