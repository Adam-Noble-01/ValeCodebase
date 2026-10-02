import sys, difflib, re
def body(path):
    t=open(path,encoding='utf-8').read().replace('\r\n','\n').split('\n')
    # header ends at the 2nd full '=' rule line after line 3
    rules=[i for i,l in enumerate(t) if re.match(r'^// ={20,}$',l)]
    start=rules[2]+1 if len(rules)>2 else 0
    return t[start:]
a=body(sys.argv[1]); b=body(sys.argv[2])
d=list(difflib.unified_diff(a,b,'a','b',n=0,lineterm=''))
print('\n'.join(d) if len(sys.argv)<4 else len(d))
