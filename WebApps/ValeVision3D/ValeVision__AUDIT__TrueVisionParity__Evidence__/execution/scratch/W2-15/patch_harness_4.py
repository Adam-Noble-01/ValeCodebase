import sys

p = sys.argv[1]
t = open(p, encoding="utf-8").read()
old = """        if (name === 'Na__LineworkSettings__SetLineworkBaseOverride' && c.args.length > 1 && c.args[1] === undefined) args = args.slice(0, 1);"""
new = old + """
        if (name === 'Na__StaticExport__RenderToCanvas' && args[0] && args[0].renderFrame === null) { const o = { ...args[0] }; delete o.renderFrame; args = [ o ]; }   // <-- renderFrame null is the tiled renderer's own default: the composer route (TiledRenderer 1.6.0 :324, :332; W2-12 3A.8)"""
assert t.count(old) == 1
t = t.replace(old, new)
open(p, "w", encoding="utf-8", newline="\n").write(t)
print("ok")
