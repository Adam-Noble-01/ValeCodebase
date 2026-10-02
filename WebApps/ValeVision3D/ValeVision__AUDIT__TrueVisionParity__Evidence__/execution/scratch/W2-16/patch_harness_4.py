p = 'w2_16_harness.mjs'
t = open(p, encoding='utf-8').read()
old = "Na__LeModelLayers__EdgeDefault : (key) => (/LineworkModifier/.test(key) ? { weight : 0.5, colour : 'mid-grey', lineType : 'solid' } : { weight : 0.8, colour : 'black', lineType : 'dashed' }),"
assert t.count(old) == 1
t = t.replace(old, "Na__LeModelLayers__EdgeDefault : (key) => (/LineworkModifier/.test(key) ? { weight : 0.5, colour : 'mid-grey', lineType : 'solid' } : (/Windows/.test(key) ? { weight : 0.6, colour : 'dark-grey', lineType : 'solid' } : { weight : 0.8, colour : 'black', lineType : 'dashed' })),")
open(p, 'w', encoding='utf-8', newline='\n').write(t)
print('patched')
