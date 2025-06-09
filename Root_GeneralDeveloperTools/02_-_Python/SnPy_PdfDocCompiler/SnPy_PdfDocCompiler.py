# ========================================================================================================================
# SnPy_PdfDocCompiler.py
# ========================================================================================================================
# Description: GUI application for combining multiple PDF files into a single document while retaining A3 format
# Author: Adam Noble
# Created: 2024
# Version: 1.0
# Dependencies: tkinter, PyPDF2, threading, os, sys, PIL, urllib
# Usage: Run script to launch GUI for selecting and combining PDF files
# ========================================================================================================================

import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from PyPDF2 import PdfReader, PdfWriter
import threading
import os
import sys
from PIL import Image, ImageTk
import urllib.request

# Add the sibling dependency directory to sys.path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../SnPY_CommonDependencyFiles')))
from SnPy_Core_Utils_IconLoaderAndHandling import set_window_icon  # type: ignore

# ------------------------------------------------------------------------------------------------------------------------
# PDF Combiner Class
# ------------------------------------------------------------------------------------------------------------------------

class PDFCombinerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Combine PDFs - A3 Format Retained")
        self.root.geometry("500x300")
        self.root.resizable(False, False)
        
        # Apply custom logo
        set_window_icon(self.root)

        self.selected_files = []

        self.create_widgets()

    def create_widgets(self):
        # Instruction Label
        tk.Label(self.root, text="Select PDF files to combine into a single A3-size document:").pack(pady=10)

        # File List Display
        self.file_list = tk.Listbox(self.root, height=6, width=60)
        self.file_list.pack(pady=5)

        # Button to Select Files
        tk.Button(self.root, text="Select PDF Files", command=self.select_files).pack(pady=5)

        # Combine Button
        tk.Button(self.root, text="Combine PDFs", command=self.start_combination_thread).pack(pady=10)

        # Progress Bar
        self.progress = ttk.Progressbar(self.root, orient="horizontal", length=400, mode="determinate")
        self.progress.pack(pady=10)

    def select_files(self):
        files = filedialog.askopenfilenames(filetypes=[("PDF files", "*.pdf")])
        if files:
            self.selected_files = list(files)
            self.file_list.delete(0, tk.END)
            for f in self.selected_files:
                self.file_list.insert(tk.END, os.path.basename(f))

    def start_combination_thread(self):
        if not self.selected_files:
            # Create temporary window for message box with custom icon
            temp_root = tk.Tk()
            temp_root.withdraw()
            set_window_icon(temp_root)
            messagebox.showwarning("No Files Selected", "Please select at least one PDF file.")
            temp_root.destroy()
            return

        threading.Thread(target=self.combine_pdfs, daemon=True).start()

    def combine_pdfs(self):
        try:
            output = PdfWriter()

            # Load first file to determine original page size
            first_pdf = PdfReader(self.selected_files[0])
            base_width = first_pdf.pages[0].mediabox.width
            base_height = first_pdf.pages[0].mediabox.height

            total_pages = 0
            for path in self.selected_files:
                reader = PdfReader(path)
                total_pages += len(reader.pages)

            if total_pages > 50:
                # Create temporary window for message box with custom icon
                temp_root = tk.Tk()
                temp_root.withdraw()
                set_window_icon(temp_root)
                messagebox.showwarning("Large Document", f"The combined document has {total_pages} pages. Consider splitting it.")
                temp_root.destroy()

            self.progress["maximum"] = total_pages
            self.progress["value"] = 0

            for path in self.selected_files:
                reader = PdfReader(path)
                for page in reader.pages:
                    # Force same page size as first document
                    page.mediabox.upper_right = (base_width, base_height)
                    output.add_page(page)
                    self.progress["value"] += 1
                    self.root.update_idletasks()

            save_path = filedialog.asksaveasfilename(defaultextension=".pdf", filetypes=[("PDF file", "*.pdf")], title="Save Combined PDF As")
            if save_path:
                with open(save_path, "wb") as f_out:
                    output.write(f_out)
                # Create temporary window for message box with custom icon
                temp_root = tk.Tk()
                temp_root.withdraw()
                set_window_icon(temp_root)
                messagebox.showinfo("Success", f"PDFs successfully combined into:\n{save_path}")
                temp_root.destroy()

        except Exception as e:
            # Create temporary window for message box with custom icon
            temp_root = tk.Tk()
            temp_root.withdraw()
            set_window_icon(temp_root)
            messagebox.showerror("Error", f"An error occurred:\n{str(e)}")
            temp_root.destroy()

# ------------------------------------------------------------------------------------------------------------------------
# Run App
# ------------------------------------------------------------------------------------------------------------------------

if __name__ == "__main__":
    root = tk.Tk()
    set_window_icon(root)  # Apply custom logo to main window
    app = PDFCombinerApp(root)
    root.mainloop()
