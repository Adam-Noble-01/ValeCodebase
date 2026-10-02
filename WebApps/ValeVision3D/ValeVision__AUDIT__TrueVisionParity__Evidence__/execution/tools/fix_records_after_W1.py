"""Records fix after Wave 1: ValeVision's column for 54__Feature__ColourPalette (W1-37) and LE/59__Feature__FloorAreas (W1-27).
Byte-preserving, exact-once."""
import os
VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
REG = os.path.join(VV, "ValeVision__NOTES__FolderNumberRegistry__.md")
assert os.path.isdir(os.path.join(VV, "02__Src__AppModules", "54__Feature__ColourPalette"))
assert os.path.isdir(os.path.join(VV, "02__Src__AppModules", "51__System__LayoutEditor", "59__Feature__FloorAreas"))
b = open(REG, "rb").read()
pairs = [
    (b"| 54 | `54__Feature__ColourPalette` | - | - | shared |", b"| 54 | `54__Feature__ColourPalette` | `54__Feature__ColourPalette` | - | shared |"),
    (b"| LE/59 | `59__Feature__FloorAreas` | - | shared |", b"| LE/59 | `59__Feature__FloorAreas` | `59__Feature__FloorAreas` | shared |"),
]
for old, new in pairs:
    assert b.count(old) == 1, (old, b.count(old))
    b = b.replace(old, new)
open(REG, "wb").write(b)
print("registry rows 54 and LE/59 filled")
