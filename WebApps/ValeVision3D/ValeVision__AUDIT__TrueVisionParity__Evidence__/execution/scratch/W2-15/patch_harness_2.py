import sys

p = sys.argv[1]
t = open(p, encoding="utf-8").read()
old = """        check(tag + ': same calls in the same order (line-width clears aside)', J(WithoutEdgeClears(o.norm)) === J(WithoutEdgeClears(n.norm)), { old : WithoutEdgeClears(o.norm).map((c) => c.name), new : WithoutEdgeClears(n.norm).map((c) => c.name) });"""
new = """        check(tag + ': same calls in the same order (line-width clears aside)', J(WithoutEdgeClears(o.norm)) === J(WithoutEdgeClears(n.norm)), FirstDiff(WithoutEdgeClears(o.norm), WithoutEdgeClears(n.norm)));"""
assert t.count(old) == 1
t = t.replace(old, new)
anchor = "function WithoutEdgeClears(seq)"
assert t.count(anchor) == 1
t = t.replace(anchor, """function FirstDiff(a, b) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) if (J(a[i]) !== J(b[i])) return { at : i, old : a[i], new : b[i], oldLen : a.length, newLen : b.length };
    return null;
}
""" + anchor)
open(p, "w", encoding="utf-8", newline="\n").write(t)
print("ok")
