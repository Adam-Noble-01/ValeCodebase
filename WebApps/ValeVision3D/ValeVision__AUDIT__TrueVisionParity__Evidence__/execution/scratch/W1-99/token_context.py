"""W1-99: where each resolved placeholder sat in its pre-image - a comment line (//, *, /*, #, <!--) or a block-comment
continuation, or anything else (printed in full). Read-only."""
import json, os, re, sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
HERE = os.path.dirname(os.path.abspath(__file__))
PRE = os.path.join(HERE, 'preimage')
rows = json.load(open(os.path.join(HERE, 'preimage_manifest.json'), encoding='utf-8'))
TOK = re.compile(rb'\{\{VVREL:W1-\d\d\}\}')
comment, other = 0, []
for r in rows:
    b = open(os.path.join(PRE, *r['rel'].split('/')), 'rb').read()
    text = b.decode('utf-8', 'replace')
    in_block = False
    for n, ln in enumerate(text.split('\n'), 1):
        s = ln.strip()
        starts_block = '/*' in s and '*/' not in s[s.find('/*'):]
        is_comment = in_block or s.startswith(('//', '*', '/*', '#', '<!--'))
        if TOK.search(ln.encode('utf-8', 'replace')):
            k = len(TOK.findall(ln.encode('utf-8', 'replace')))
            if is_comment:
                comment += k
            else:
                other.append('%s:%d  %s' % (r['rel'], n, s[:160]))
        if in_block and '*/' in s:
            in_block = False
        elif starts_block:
            in_block = True
print('placeholders on comment lines: %d; elsewhere: %d' % (comment, len(other)))
for o in other:
    print('  ' + o)
