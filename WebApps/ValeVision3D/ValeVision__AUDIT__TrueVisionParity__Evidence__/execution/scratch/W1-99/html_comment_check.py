"""W1-99: for the two HTML test pages, whether each line that held a placeholder lies inside an HTML comment
(<!-- ... -->) or a script block comment (/* ... */) in the pre-image. Read-only."""
import os, re

HERE = os.path.dirname(os.path.abspath(__file__))
PRE = os.path.join(HERE, 'preimage', 'WebApps', 'ValeVision3D', '80__Testing__PrototypeEnvironment')
for name in ('Na__Test__ElevationGeometry__.html', 'Na__Test__ProjectRecordAddress__.html'):
    text = open(os.path.join(PRE, name), 'rb').read().decode('utf-8')
    spans = [(m.start(), m.end(), 'html') for m in re.finditer(r'<!--.*?-->', text, re.S)]
    spans += [(m.start(), m.end(), 'block') for m in re.finditer(r'/\*.*?\*/', text, re.S)]
    for m in re.finditer(r'\{\{VVREL:W1-\d\d\}\}', text):
        line = text.count('\n', 0, m.start()) + 1
        inside = [k for a, b, k in spans if a <= m.start() < b]
        print('%s:%d  %s  inside: %s' % (name, line, m.group(0)[2:-2], inside or 'NOT IN A COMMENT'))
