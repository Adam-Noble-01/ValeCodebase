"""Acceptance 1: a normalised diff (header block removed; console prefix and app token mapped back) of each
whole-file port against TV at the pin is empty. Reads the LIVE files when given --live, else the candidates."""
import os, sys, difflib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_w2_16 import WHOLE, JSON_VERBATIM, LE, HERE, VV, header_end  # noqa: E402

live = '--live' in sys.argv


def norm(t):
    t = t.replace('\r\n', '\n')
    body = t[header_end(t):]
    return body.replace('[ValeVision3D', '[TrueVision3D').replace('ValeVision__', 'TrueVision__')


bad = 0
for rel in WHOLE:
    tv = open(os.path.join(HERE, 'tv', (LE + rel).replace('/', os.sep)), encoding='utf-8').read()
    src = os.path.join(VV if live else os.path.join(HERE, 'candidate'), (LE + rel).replace('/', os.sep))
    c = open(src, encoding='utf-8').read()
    d = list(difflib.unified_diff(norm(tv).splitlines(), norm(c).splitlines(), lineterm=''))
    # the header block itself: everything before the PORT NOTE must be TV's but for the banner token
    th, ch = tv[:tv.index('// PORT NOTE:') if '// PORT NOTE:' in tv else tv.index('// DEVELOPMENT LOG:')], c[:c.index('// PORT NOTE:')]
    hd = list(difflib.unified_diff(th.replace('TRUEVISION3D', 'VALEVISION3D').splitlines(), ch.replace('\r\n', '\n').splitlines(), lineterm=''))
    # the log: TV's DEVELOPMENT LOG verbatim
    tl = tv[tv.index('// DEVELOPMENT LOG:'):header_end(tv)]
    cl = c.replace('\r\n', '\n'); cl = cl[cl.index('// DEVELOPMENT LOG:'):header_end(cl)]
    print('%-62s body diff %d lines | pre-note header diff %d | log identical %s' % (rel.split('/')[-1], len(d), len(hd), tl == cl))
    bad += bool(d) + bool(hd) + (tl != cl)
for rel in JSON_VERBATIM:
    a = open(os.path.join(HERE, 'tv', (LE + rel).replace('/', os.sep)), 'rb').read()
    b = open(os.path.join(VV if live else os.path.join(HERE, 'candidate'), (LE + rel).replace('/', os.sep)), 'rb').read()
    print('%-62s byte-identical %s' % (rel.split('/')[-1], a == b))
    bad += a != b
print('NORMALISED DIFF EMPTY' if not bad else 'DIFFERENCES: %d' % bad)
sys.exit(1 if bad else 0)
