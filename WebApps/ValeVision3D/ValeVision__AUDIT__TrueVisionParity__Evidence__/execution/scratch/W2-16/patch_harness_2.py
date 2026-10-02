p = 'w2_16_harness.mjs'
t = open(p, encoding='utf-8').read()
old = """    Na__LeModelLayers__EdgeStyleFor : () => ({ weight : 0.8, colour : 'black', lineType : 'dashed' }),
    Na__LeModelLayers__EdgeStyle : () => ({ weight : 0.8, colour : 'black', lineType : 'dashed' }),"""
assert t.count(old) == 1
t = t.replace(old, """    Na__LeModelLayers__EdgeDefault : (key) => (/LineworkModifier/.test(key) ? { weight : 0.5, colour : 'mid-grey', lineType : 'solid' } : { weight : 0.8, colour : 'black', lineType : 'dashed' }),
    Na__LeModelLayers__IsLoaded : () => true,""")
dbg = "const segs = (bands) =>"
assert t.count(dbg) == 1
t = t.replace(dbg, "if (process.env.W216_DEBUG) console.log(JSON.stringify(bandsOn), JSON.stringify(bandsOff));\n" + dbg)
open(p, 'w', encoding='utf-8', newline='\n').write(t)
print('patched')
