# W1-26 scratch: two more harness steps - every paper size with typical Vale values (the Rev prefix, the
# fifth on A2/A1, the A4 portrait prefix drop) - and a node-side pass that screenshots each local sheet's
# title block strip as drawn on screen (inline SVG, the page's own Open Sans), for a pixel comparison.
P = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-26\browser_w1_26.mjs"
t = open(P, encoding="utf-8").read()


def rep(old, new):
    global t
    assert t.count(old) == 1, old[:90]
    t = t.replace(old, new)


rep('''  // 7. DIMENSION GEOMETRY: a plain spec is what it always was; a length and a dash are new and opt-in''',
    '''  // 8. EVERY PAPER, WITH A VALE SHEET'S VALUES: the Rev prefix, a fifth more on A2/A1, the prefix dropped on A4 portrait
  await step('papers', async () => {
    const out = {};
    const fields = { Sheet__Fields__Client : 'Mordaunt', Sheet__Fields__SiteAddress : 'The Old Rectory, Church Lane, Melton Mowbray, LE13 1AE',
                     Sheet__Fields__Title : 'Proposed Orangery - Elevations', Sheet__Fields__DocumentId : '57079_D02', Sheet__Fields__Revision : 'B', Sheet__Fields__Status : 'FOR PLANNING' };
    for (const [ paper, orientation ] of [ [ 'A1', 'landscape' ], [ 'A2', 'landscape' ], [ 'A2', 'portrait' ], [ 'A3', 'landscape' ], [ 'A3', 'portrait' ], [ 'A4', 'landscape' ], [ 'A4', 'portrait' ] ]) {
      const s = REC.Na__LeRec__NormaliseSheet({ Sheet__Id : 'Sheet_p', Sheet__Name : 'Elevations', Sheet__Order : 2, Sheet__PaperSize : paper, Sheet__Orientation : orientation,
                                                Sheet__CommonFields : false, Sheet__Fields : J(fields), Sheet__Viewports : [ { Viewport__Id : 'Vp_0', Viewport__Kind : '2d', Viewport__ScaleDenominator : 50 } ] });
      const layout = LAYOUT.Na__LeLayout__Solve(s);
      const f = REC.Na__LeRec__BuildFields(s);
      const prims = CHROME.Na__LeChrome__Build(layout, s, { fields : f, includeFrames : false });
      const band = layout.TitleBlock;
      const texts = textsIn(prims, band.Y, band.Y + band.HeightMm).map((x) => x[0]);
      const rules = linesIn(prims, band.Y, band.Y + band.HeightMm);
      const widths = rules.slice(1).map((x, i) => +(x - rules[i]).toFixed(3));
      out[paper + ' ' + orientation] = { strip : +band.WidthMm.toFixed(3), texts, widths, cut : texts.filter((x) => /\\.\\.\\.$/.test(x)), fields : { Date : f.Date, Scale : f.Scale, Revision : f.Revision } };
    }
    return out;
  });

  // 7. DIMENSION GEOMETRY: a plain spec is what it always was; a length and a dash are new and opt-in''')

rep('''    const R = await page.evaluate(() => window.__W126);
    await context.close();''',
    '''    const R = await page.evaluate(() => window.__W126);
    // THE STRIP AS THE SCREEN DRAWS IT: each local sheet's title block band, inline SVG in this page (so the
    // page's own Open Sans), 10 px to the millimetre, saved as PNG for a pixel comparison before / after.
    if (!existsSync(join(SCRATCH, 'png'))) mkdirSync(join(SCRATCH, 'png'));
    for (const s of (R.sheets || [])) {
        const [ bx, by, bw, bh ] = s.band;
        const strip = s.chrome.filter((p) => p.Kind !== 'image');                       // the logo image comes and goes with the asset cache; the band is the subject
        const markup = await page.evaluate(([ list, x, y, w, h ]) => {
            const shifted = JSON.parse(JSON.stringify(list)).map((p) => { for (const k of [ 'Y', 'Y1', 'Y2', 'BaselineY' ]) if (typeof p[k] === 'number') p[k] -= y; for (const k of [ 'X', 'X1', 'X2' ]) if (typeof p[k] === 'number') p[k] -= x; return p; });
            return window.__W126svg ? window.__W126svg(shifted, w, h) : null;
        }, [ strip, bx, by, bw, bh ]);
        if (!markup) continue;
        await page.evaluate(([ m, w ]) => { const host = document.getElementById('host'); host.innerHTML = m; const svg = host.querySelector('svg'); svg.style.width = (w * 10) + 'px'; svg.style.height = 'auto'; }, [ markup, bw ]);
        const png = join(SCRATCH, 'png', scenario + '__' + s.folder.split('/')[1] + '__' + s.sheet + '__band.png');
        await page.locator('#host svg').screenshot({ path : png });
        s.bandPng = png;
    }
    await context.close();''')

rep('''  R.scenario = new URLSearchParams(location.search).get('scenario');''',
    '''  R.scenario = new URLSearchParams(location.search).get('scenario');
  window.__W126svg = (list, w, h) => CHROME.Na__LeChrome__ToSvgMarkup(list, w, h);''')

# keep the per-sheet chrome list for the screenshot pass, drop it before the JSON is written
rep('''    R.aborted = aborted; R.console = consoleLines; R.overlayFiles = Object.keys(overlay).length;''',
    '''    R.aborted = aborted; R.console = consoleLines; R.overlayFiles = Object.keys(overlay).length;
    (R.sheets || []).forEach((s) => { delete s.widthsRaw; });''')
open(P, "w", encoding="utf-8", newline="\n").write(t)
print("ok")
