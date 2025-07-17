import tkinter as tk
from tkinter import filedialog, messagebox
import imageio
from PIL import Image
import os

def select_png_files():
    root = tk.Tk()
    root.withdraw()
    file_paths = filedialog.askopenfilenames(
        title="Select PNG Files",
        filetypes=[("PNG Files", "*.png")])
    return root.tk.splitlist(file_paths)

def save_animation_dialog(default_ext):
    root = tk.Tk()
    root.withdraw()
    save_path = filedialog.asksaveasfilename(
        defaultextension=default_ext,
        filetypes=[("MP4 Video", "*.mp4"), ("GIF Animation", "*.gif")],
        title="Save Animation As")
    return save_path

def create_animation():
    png_files = select_png_files()
    if not png_files:
        messagebox.showerror("No Files", "No PNG files selected.")
        return

    png_files = sorted(png_files)  # Ensure correct order

    # Ask save location and type
    save_path = save_animation_dialog(default_ext=".mp4")
    if not save_path:
        messagebox.showerror("No Output", "No save location selected.")
        return

    # Load images (ensuring all same mode/size)
    images = []
    for file in png_files:
        img = Image.open(file).convert("RGBA")
        images.append(img)

    # Convert to numpy arrays for imageio
    frames = [imageio.v3.imread(file) for file in png_files]

    fps = 24

    if save_path.lower().endswith(".gif"):
        imageio.mimsave(save_path, frames, format='gif', duration=1/fps)
    else:
        # For mp4 use 'libx264' codec for best compatibility
        imageio.mimsave(save_path, frames, format='mp4', fps=fps, codec='libx264')

    messagebox.showinfo("Done", f"Animation saved:\n{save_path}")

if __name__ == "__main__":
    create_animation()
