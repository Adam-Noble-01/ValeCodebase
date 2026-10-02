# W1-12 scratch: copy the test page's module script out to a .mjs so `node --check` can parse it.
import os
import re
import sys

PAGE = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\80__Testing__PrototypeEnvironment\Na__Test__ProjectRecordAddress__.html'
OUT  = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'page_script_extracted.mjs')

html  = open(PAGE, encoding='utf-8').read()
found = re.findall(r'<script type="module">([\s\S]*?)</script>', html)
if len(found) != 1:
    sys.exit('STOP: expected one module script, found %d' % len(found))
open(OUT, 'w', encoding='utf-8', newline='\n').write(found[0])
print('extracted %d characters to %s' % (len(found[0]), OUT))
