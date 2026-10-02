"""W2-99 scratch: corrections to the draft devlog entry (devlog_entry_w2.txt), each anchor asserted once."""
import os

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'devlog_entry_w2.txt')
t = open(P, encoding='ascii').read()
FIX = [
    ('v2.104.0 to v2.109.0 (but v2.103.0), ', 'v2.104.0 to v2.109.0, '),
    ('tokens; on the 91 Vale projects with models the tokens already match, and `2026/60834__Clough` (an older single-bucket\n'
     '  export) sizes its planes from the whole model until it is re-exported.',
     'tokens; on 90 of the 91 Vale projects with models the tokens already match, and `2026/60834__Clough` (an older\n'
     '  single-bucket export) sizes its planes from the whole model until it is re-exported.'),
    ('  SitePlanFaces (9, one skip: no site plan data on this PC), SitePlanStore (44), SpecInlineEdit (51), SpecLockstep (63),\n'
     '  SpellCheckDictionary (52), StatementLockstep (28) and StoreyBand (54); ViewportTitleText (48) and the LoaderFacade\n'
     '  (118), ScrapbookDrawingTitle and ScrapbookScaleBar tests updated and passing; the other 30 unchanged and passing. The\n',
     '  SitePlanFaces (9, one skip: no site plan data on this PC), SitePlanStore (44), SpecInlineEdit (51), SpecLockstep (63),\n'
     '  SpellCheckDictionary (52), StatementLockstep (28) and StoreyBand (54); ViewportTitleText (48), LoaderFacade (118),\n'
     '  AppConfigParity, ScrapbookDrawingTitle and ScrapbookScaleBar updated and passing; the other 28 unchanged and passing. The\n'),
    ('rows, config, Dev sheet, mode controller 1.1.3 and data module; folder 50\'s thirteen modules and its config; in',
     'rows, config, Dev sheet, mode controller 1.1.3 and data module; folder 50\'s twelve modules and its config; in'),
    ('specification files, TileDrag', 'specification files, TileDrag'),
    ('  with their configs), twelve SheetTools units, the four drawing tools, seven panels and the toolbar 1.9.5, twelve\n',
     '  with their configs), twelve SheetTools units, the four drawing tools, six panels and the toolbar 1.9.5, twelve\n'),
    ('- Until W3-03 lands, a press on the Ortho, Grid or Axes keys does nothing, the move anchor and the carry are absent, and\n'
     '  the Measurements box reads only what ValeVision\'s orchestrator hands it.',
     '- Until W3-05, Draft, Grid, Ortho and Axes have no key or button; until W3-03 the move anchor and the carry are absent\n'
     '  and the Measurements box reads only what ValeVision\'s sheet tools hand it today.'),
]
for old, new in FIX:
    n = t.count(old)
    if n != 1:
        raise SystemExit('anchor found %d times: %r' % (n, old[:70]))
    t = t.replace(old, new)
open(P, 'w', encoding='ascii', newline='\n').write(t)
print('fixed', len(FIX))
