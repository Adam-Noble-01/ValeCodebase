p = r"D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__Styles__Specification__Notes__.css"
d = open(p, "rb").read()
old = b" *     imports it from Na__CoreUi__Styles__Index__.css), so the cascade order is the same.\n * - Back-port     : none.\n"
new = (b" *     imports it from Na__CoreUi__Styles__Index__.css), so the cascade order is the same.\n"
       b" * - Legacy        : TrueVision's copy of this sheet has no module version, so the Source version names\n"
       b" *                   the release that left it instead.\n"
       b" * - Back-port     : none.\n")
assert d.count(old) == 1, d.count(old)
d = d.replace(old, new)
assert b"\r\n" not in d
open(p, "wb").write(d)
print("patched")
