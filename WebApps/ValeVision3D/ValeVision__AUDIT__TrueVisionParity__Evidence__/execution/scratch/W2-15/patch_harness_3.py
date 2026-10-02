import sys

p = sys.argv[1]
t = open(p, encoding="utf-8").read()
old = """    if (v && v.tag) return v.tag;
    return v;
}"""
new = """    if (v && v.tag) return v.tag;
    if (v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype) {
        const o = {}; Object.keys(v).forEach((k) => { o[k] = Arg(v[k]); }); return o;   // <-- Each copy frames its OWN ortho camera: compared by what it is, not its uuid
    }
    return v;
}"""
assert t.count(old) == 1
t = t.replace(old, new)
open(p, "w", encoding="utf-8", newline="\n").write(t)
print("ok")
