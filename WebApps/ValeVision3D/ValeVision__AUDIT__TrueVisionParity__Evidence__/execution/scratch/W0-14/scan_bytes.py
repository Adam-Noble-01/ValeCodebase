"""Report non-ASCII bytes, BOM, EOL style and final newline of the W0-14 TV sources and VV pre-images (read only)."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))

for sub in ("tv", "preimage"):
    folder = os.path.join(HERE, sub)
    for name in sorted(os.listdir(folder)):
        data = open(os.path.join(folder, name), "rb").read()
        text = data.decode("utf-8")
        non_ascii = sorted({ch for ch in text if ord(ch) > 127})
        lines_with = [i + 1 for i, line in enumerate(text.split("\n")) if any(ord(c) > 127 for c in line)]
        print(f"{sub:<9} {name:<52} bytes={len(data):>6} crlf={data.count(b'\r\n'):>4} lf={data.count(b'\n'):>4} "
              f"bom={data.startswith(b'\xef\xbb\xbf')} endsLF={data.endswith(b'\n')} nonascii={non_ascii} lines={lines_with[:12]}")
