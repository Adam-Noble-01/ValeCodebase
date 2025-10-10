# Load, update black fills and strokes in the provided SVG to #172b3a, and save a new file.
import re
from pathlib import Path

src_path = Path("/mnt/data/326639_download_file_icon.svg")
dst_path = Path("/mnt/data/326639_download_file_icon__na-172b3a.svg")

svg = src_path.read_text(encoding="utf-8")

# Normalise common black representations
# Matches: #000, #000000, rgb(0,0,0), black (case-insensitive), with optional spaces
patterns = [
    r"(?i)#000\b",
    r"(?i)#000000\b",
    r"(?i)rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)",
    r"(?i)\bblack\b",
]

def replace_colour_attributes(svg_text):
    # Replace explicit colour values in style attributes and direct fill/stroke attributes
    replaced = svg_text
    for pat in patterns:
        replaced = re.sub(pat, "#172b3a", replaced)
    # Handle cases like fill:#000 or stroke:#000 within style strings without spaces
    # Already covered by the patterns, but ensure we also catch 'currentColor' when overall color is black
    # If the root or any group sets color:black; change to #172b3a
    replaced = re.sub(r"(?i)color\s*:\s*black\b", "color:#172b3a", replaced)
    # Also handle CSS embedded in <style> blocks
    replaced = re.sub(r"(?i)fill\s*:\s*black\b", "fill:#172b3a", replaced)
    replaced = re.sub(r"(?i)stroke\s*:\s*black\b", "stroke:#172b3a", replaced)
    return replaced

updated_svg = replace_colour_attributes(svg)

# Additionally, ensure any fill or stroke explicitly set to none remains none
# No change needed, but ensure we did not accidentally touch 'none'

dst_path.write_text(updated_svg, encoding="utf-8")

dst_path.as_posix()
