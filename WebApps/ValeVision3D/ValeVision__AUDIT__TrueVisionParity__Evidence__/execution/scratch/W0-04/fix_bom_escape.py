# Replace the literal U+FEFF characters inside UiParity's BOM regexes with the ASCII escape \uFEFF.
p = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\80__Testing__PrototypeEnvironment\Na__Verify__UiParity__.mjs"
raw = open(p, "rb").read()
bom = "\ufeff".encode("utf-8")
n = raw.count(bom)
fixed = raw.replace(b"/^" + bom + b"/", b"/^\\uFEFF/")
print("literal BOM chars:", n, "remaining after fix:", fixed.count(bom))
open(p, "wb").write(fixed)
