# W1-26 scratch: (1) load the logo before any sheet is built, so every strip in every run has the picture
# (the first sheets of a run otherwise caught the asset cache still loading); (2) on A4 portrait, prove the
# prefix is DROPPED rather than allowed to cut another cell further: the strip drawn equals the strip solved
# with bare values, and the strip solved with "Revision B" would have cut the date more.
P = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-26\browser_w1_26.mjs"
t = open(P, encoding="utf-8").read()


def rep(old, new):
    global t
    assert t.count(old) == 1, old[:90]
    t = t.replace(old, new)


rep('''  // 1. THE LOCAL SHEETS: chrome (title block and frames) and markup, screen and PDF
  await step('sheets', async () => {''',
    '''  // 0. THE LOGO, loaded before any sheet is built (as a session that has drawn once has it)
  await step('logo', async () => ({ loaded : !!(await CHROME.Na__LeChrome__LoadAsset(CFG.Na__LeCfg__GetTitleBlockSetup().logoAssetPath)) }));

  // 1. THE LOCAL SHEETS: chrome (title block and frames) and markup, screen and PDF
  await step('sheets', async () => {''')

rep('''      out[paper + ' ' + orientation] = { strip : +band.WidthMm.toFixed(3), texts, widths, cut : texts.filter((x) => /\\.\\.\\.$/.test(x)), fields : { Date : f.Date, Scale : f.Scale, Revision : f.Revision } };''',
    '''      out[paper + ' ' + orientation] = { strip : +band.WidthMm.toFixed(3), texts, widths, cut : texts.filter((x) => /\\.\\.\\.$/.test(x)), fields : { Date : f.Date, Scale : f.Scale, Revision : f.Revision } };
      // THE PREFIX RULE, solved by hand with the cells module and the chrome's own measure (new tree only)
      const CELLS = await import(LE + '10__Core__SheetSurface/Na__LayoutEditor__TitleBlock__Cells__.js');
      if (typeof CELLS.Na__LeTitleCells__Widen === 'function') {
        const setup = CFG.Na__LeCfg__GetTitleBlockSetup(), style = CFG.Na__LeCfg__GetStyleSetup();
        const logoW = Math.min(setup.logoCellWidthMm, band.WidthMm / 3);
        const stripW = band.WidthMm - logoW;
        const factor = (setup.rowWidthFactorByPaper || {})[paper] > 1 ? setup.rowWidthFactorByPaper[paper] : 1;
        const solve = (bare) => CELLS.Na__LeTitleCells__Solve(stripW, CELLS.Na__LeTitleCells__Widen(stripW, setup.rows.map((row) => {
          let label = String(row.Label || row.Key || ''); if (style.titleLabelUppercase) label = label.toUpperCase();
          const raw = f[row.Key] !== undefined && f[row.Key] !== null ? String(f[row.Key]) : '';
          const value = (!bare && row.ValuePrefix && raw) ? row.ValuePrefix + ' ' + raw : raw;
          const labelMm = CHROME.Na__LeChrome__MeasureTextMm(label, setup.fontSizeLabelMm, style.titleLabelWeight, style.titleLabelTrackingMm);
          const valueMm = CHROME.Na__LeChrome__MeasureTextMm(value, setup.fontSizeValueMm, style.titleValueWeight);
          return CELLS.Na__LeTitleCells__Cell(row, Math.max(labelMm, valueMm) + setup.fieldPaddingHMm * 2, labelMm + setup.fieldPaddingHMm * 2);
        }), factor));
        const keys = setup.rows.map((r) => r.Key);
        const prefixed = solve(false), bare = solve(true);
        out[paper + ' ' + orientation].prefixRule = { keys, prefixed : prefixed.map((x) => +x.toFixed(3)), bare : bare.map((x) => +x.toFixed(3)) };
      }''')
open(P, "w", encoding="utf-8", newline="\n").write(t)
print("ok")
