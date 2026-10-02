import sys

p = sys.argv[1]
t = open(p, encoding="utf-8").read()
old = "{   // B3 - Enhance strength on both paths\n"
new = "if (!REAL_ENHANCE) {   // B3 - Enhance strength on both paths (the real-Enhance run proves the same through the pass itself, part C)\n"
assert t.count(old) == 1
t = t.replace(old, new)
open(p, "w", encoding="utf-8", newline="\n").write(t)
print("ok")
