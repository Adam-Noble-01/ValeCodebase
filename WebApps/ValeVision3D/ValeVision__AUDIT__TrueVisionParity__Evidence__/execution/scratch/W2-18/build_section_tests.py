"""W2-18 - run the in-scope SECTIONS of TrueVision's three drafting-aid suites against this app's shipped modules.

The suites themselves are W3-05's to port (its edits list); W2-18 only runs sections of them early
(wp_canonical tests: sections_run_earlier_by W2-18). This builds scratch copies - never in the app tree:

  - read TrueVision's test at the pin b2aa9151 (scratch/W2-18/tv, fetched by fetch_tv.py);
  - SRC points at THIS app's 02__Src__AppModules (absolute), the bundle import at this app's
    80__Testing__PrototypeEnvironment/Na__TestEnv__ObjectSnapBundle__.cjs;
  - keep the harness regions and the named sections; drop every other '// REGION | ...' block whole;
  - seams: the title line's app token, and the Ortho switch's console filter
    '[TrueVision3D LayoutEditor] Ortho' -> '[ValeVision3D LayoutEditor] Ortho' (the C1 prefix of the
    ported controller), so the filter keeps swallowing the controller's own console line;
  - Drawing Axes 'Switching': the one check that reads the TOOLBAR's source for the Axes button's words
    is taken out (the toolbar is TrueVision's only with W5-01; that check belongs to the toolbar sections).

    python build_section_tests.py    writes scratch/W2-18/sections/*.test.mjs
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D'
SRC_ABS = os.path.join(VV, '02__Src__AppModules').replace('\\', '/')
BUNDLE_URL = 'file:///' + os.path.join(VV, '80__Testing__PrototypeEnvironment', 'Na__TestEnv__ObjectSnapBundle__.cjs').replace('\\', '/')
OUT = os.path.join(HERE, 'sections')

TESTS = {
    'Na__Test__OrthoMode__.test.mjs': ['A Browser Just Big Enough', 'Loading a Module With Its Imports Stubbed', 'Checks',
                                       'The Rule', 'The Switch'],
    'Na__Test__DrawingGrid__.test.mjs': ['A Browser Just Big Enough, and the Loader', 'The State'],
    'Na__Test__DrawingAxes__.test.mjs': ['A Browser Just Big Enough', 'Loading a Module With Its Imports Stubbed',
                                         'Checks, and the Sheet the Axes Are Drawn On', 'Switching', 'Following the Pointer',
                                         'Switching Off and Detaching', "The Config's Switches"],
}


def once(text, old, new, what):
    assert text.count(old) == 1, (what, text.count(old))
    return text.replace(old, new)


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, keep in TESTS.items():
        text = open(os.path.join(HERE, 'tv', name), 'r', encoding='utf-8', newline='').read()
        assert '\r\n' not in text
        lines = text.split('\n')
        out, i, kept, dropped = [], 0, [], []
        while i < len(lines):
            if i + 1 < len(lines) and lines[i + 1].startswith('// REGION | ') and lines[i].startswith('// ----'):
                title = lines[i + 1][len('// REGION | '):].strip()
                j = i + 2
                while not lines[j].startswith('// endregion'):
                    j += 1
                if title in keep:
                    out.extend(lines[i:j + 1]); kept.append(title)
                else:
                    dropped.append(title)
                i = j + 1
                continue
            out.append(lines[i])
            i += 1
        assert sorted(kept) == sorted(keep), (name, kept)
        t = '\n'.join(out)
        t = once(t, "resolve(SCRIPT_DIR, '..', '02__Src__AppModules')", "'" + SRC_ABS + "'", name + ' SRC')
        if "from './Na__TestEnv__ObjectSnapBundle__.cjs'" in t:
            t = once(t, "from './Na__TestEnv__ObjectSnapBundle__.cjs'", "from '" + BUNDLE_URL + "'", name + ' bundle')
        t = once(t, "console.log('TrueVision3D - ", "console.log('ValeVision3D (W2-18 sections) - ", name + ' title')
        if name == 'Na__Test__OrthoMode__.test.mjs':
            t = once(t, "'[TrueVision3D LayoutEditor] Ortho'", "'[ValeVision3D LayoutEditor] Ortho'", 'ortho filter')
        if name == 'Na__Test__DrawingAxes__.test.mjs':
            tb = ("    const TOOLBAR_SRC = readFileSync(resolve(SRC, LE + '40__Ui__Panels/Na__LayoutEditor__Toolbar__.js'), 'utf8');\n"
                  "    check('the toolbar\\'s own words are the config\\'s, so a config that fails to load shows the same button',\n"
                  "        [ ...TOOLBAR_SRC.matchAll(/Na__LeAxes__Label\\('Toggle', '([^']*)'\\)/g) ].map((m) => m[1]), [ 'Axes', 'Axes' ]);\n")
            t = once(t, tb, '', 'axes toolbar check')
        assert 'TrueVision3D' not in t.replace('[ValeVision3D', ''), name
        with open(os.path.join(OUT, name), 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(t)
        print(name, 'kept', kept, 'dropped', dropped)


if __name__ == '__main__':
    main()
