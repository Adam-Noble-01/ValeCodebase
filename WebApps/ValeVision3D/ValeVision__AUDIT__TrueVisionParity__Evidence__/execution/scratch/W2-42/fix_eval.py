p = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W2-42\leaf_eval.mjs'
s = open(p, encoding='utf-8').read()
a = "Na__LeOsnapGeo__Centroid([ { x : 0, y : 0 }, { x : 10, y : 0 }, { x : 10, y : 4 }, { x : 0, y : 4 } ])"
b = "ok('State STORE_KEY is the F3 key VV already uses', st.Na__LeOsnap__STORE_KEY === 'na-layouteditor-osnap');"
assert s.count(a) == 1 and s.count(b) == 1
s = s.replace(a, "Na__LeOsnapGeo__Centroid([ [0, 0], [10, 0], [10, 4], [0, 4] ])")
s = s.replace(b, "ok('State reads on in a window-less run (default enabled, storage read wrapped)', st.Na__LeOsnap__IsEnabled() === true);")
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
