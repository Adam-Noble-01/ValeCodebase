"""W2-23 - the Measurements box's context contract against VV's pre-hub orchestrator.
Every ctx.<name> the ported box calls is either typeof-guarded or handed in by VV's
Na__LayoutEditor__SheetTools__.js Na__LeMeasure__Attach({...})."""
import re, sys
LE = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\30__System__SheetTools"
box = open(LE + r"\Na__LayoutEditor__Measurements__.js", encoding="utf-8").read()
hub = open(LE + r"\Na__LayoutEditor__SheetTools__.js", encoding="utf-8").read()

code = re.sub(r"^\s*//[^\n]*", "", box, flags=re.M)
used    = set(re.findall(r"\bctx\.([A-Za-z_]+)\s*\(", code))
guarded = set(re.findall(r"typeof\s+ctx\.([A-Za-z_]+)\s*[!=]==\s*'function'", code))

m = re.search(r"Na__LeMeasure__Attach\(\{(.*?)\}\);", hub, flags=re.S)
given = set(re.findall(r"^\s*([A-Za-z_]+)\s*:", m.group(1), flags=re.M))

unguarded = used - guarded
print("used     :", sorted(used))
print("guarded  :", sorted(guarded))
print("VV gives :", sorted(given))
print("unguarded, must be given:", sorted(unguarded))
missing = unguarded - given
print("guarded and not given yet (inert until the hub):", sorted(guarded - given))
if missing:
    print("FAIL - unguarded calls VV does not hand in:", sorted(missing)); sys.exit(1)
print("PASS")
