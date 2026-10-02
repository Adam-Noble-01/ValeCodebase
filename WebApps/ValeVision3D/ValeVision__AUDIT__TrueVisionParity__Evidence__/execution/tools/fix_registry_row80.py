"""Registry row 80: ValeVision now has 80__CloudflareIntegration (created by W0-12). Byte-preserving, exact-once."""
p = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__NOTES__FolderNumberRegistry__.md"
b = open(p, "rb").read()
old = b"| 80 | `80__CloudflareIntegration` | - | - | shared |"
new = b"| 80 | `80__CloudflareIntegration` | `80__CloudflareIntegration` (W0-12 facade, VV body) | - | shared |"
assert b.count(old) == 1, b.count(old)
open(p, "wb").write(b.replace(old, new))
print("row 80 updated")
