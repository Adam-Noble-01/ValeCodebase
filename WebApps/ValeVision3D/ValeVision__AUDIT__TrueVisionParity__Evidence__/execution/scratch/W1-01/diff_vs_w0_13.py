"""Show how the live LoadingSequence differs from W0-13's candidate (expected: only the scribe's placeholder resolution)."""
import difflib
live = open(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\01__AppCore\Na__AppFlow__LoadingSequence.js', 'rb').read().decode('utf-8')
cand = open(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W0-13\candidate__Na__AppFlow__LoadingSequence.js', 'rb').read().decode('utf-8')
a = cand.splitlines(keepends=False)
b = live.splitlines(keepends=False)
for line in difflib.unified_diff(a, b, 'W0-13 candidate', 'live', n=0, lineterm=''):
    print(line)
