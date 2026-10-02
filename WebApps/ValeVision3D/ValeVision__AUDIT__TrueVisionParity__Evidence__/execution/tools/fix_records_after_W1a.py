"""Records fixes after Wave 1 part 1 (byte-preserving, exact-once, LF/CRLF untouched).

1. Folder registry: ValeVision's column for the ten folders Waves 0-1 created (top-level 49; LE/26, 27, 31, 32, 36, 37, 51, 53, 54).
2. The W0-16 release placeholder left in the version-lock README (should read v2.71.1).
"""
VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
REG = VV + r"\ValeVision__NOTES__FolderNumberRegistry__.md"
README = VV + r"\04__Lib__ThirdParty__VersionLocked\Vale__Dependencies__VersionLock__README__.md"

def patch(path, pairs):
    b = open(path, "rb").read()
    for old, new in pairs:
        n = b.count(old)
        assert n == 1, (path, old, n)
        b = b.replace(old, new)
    open(path, "wb").write(b)

rows = [b"| 49 | `49__System__ElevationDepthFog` | - | - | shared |"]
le = {"26": "26__System__DraftMode", "27": "27__System__DrawingGrid", "31": "31__System__DocumentKeys",
      "32": "32__System__OrthoMode", "36": "36__System__HatchPatternTools", "37": "37__System__VectorTools",
      "51": "51__Feature__DrawingRegister", "53": "53__Feature__ProjectQrCode", "54": "54__Feature__SheetImages"}
pairs = [(rows[0], b"| 49 | `49__System__ElevationDepthFog` | `49__System__ElevationDepthFog` | - | shared |")]
for n, name in le.items():
    old = f"| LE/{n} | `{name}` | - | shared |".encode()
    new = f"| LE/{n} | `{name}` | `{name}` | shared |".encode()
    pairs.append((old, new))
patch(REG, pairs)
patch(README, [(b"{{VVREL:W0-16}}", b"v2.71.1")])
print("registry: 10 rows filled; README placeholder resolved")
