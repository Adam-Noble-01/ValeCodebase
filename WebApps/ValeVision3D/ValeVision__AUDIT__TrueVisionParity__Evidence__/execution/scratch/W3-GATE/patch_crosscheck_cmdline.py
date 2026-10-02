"""W3 gate: the W3 untouched set is too long for one Windows command line - diff by app roots instead of named paths."""
p = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W3-GATE\crosscheck_w3.py'
s = open(p, encoding='utf-8').read()
a = "git('diff', 'HEAD', '--binary', '-M', '--', *sorted(sides), text=False).stdout"
b = "git('diff', 'HEAD', '--binary', '-M', '--', *sorted(set(x.split('/', 2)[0] + '/' + x.split('/', 2)[1] if x.count('/') >= 2 else x for x in sides)), text=False).stdout"
assert s.count(a) == 1
s = s.replace(a, b)
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
