"""W1-33 - the unavoidable importer update to W1-31's Na__Test__LoaderFacade__.test.mjs (LF kept).

The test runs the real loader and its real loading screen and reads their internals. W1-33's mandated
changes invalidate four of its checks: the screen's title and status classes (the loading state is now
TrueVision's veil, .na-le-veil__text / .na-le-veil__status) and the loader's drawing wait and drawing-count
line (retired: the first-open veil owns the drawing). Each is rewritten to test the same concern under the
new design; nothing else in the test changes.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from w133_common import HERE, VV, FILES, sha1, split_eol, join_eol, replace_once  # noqa: E402

TEST_SHA1 = "2ecf7abf"  # W1-31's recorded sha1 prefix of the test it wrote


def build():
    data = open(os.path.join(VV, FILES["test"]), "rb").read()
    if not sha1(data).startswith(TEST_SHA1):
        raise SystemExit("LoaderFacade test is not the bytes W1-31 recorded (" + sha1(data)[:8] + ")")
    text, eol = split_eol(data)
    if eol != "\n":
        raise SystemExit("the test was LF")

    text = replace_once(text,
        "//   - the loading screen's title and the drawing-count label are\n"
        "//     TrueVision's first-open veil wording (VeilDrawingsHeadline,\n"
        "//     VeilDrawingViews).\n",
        "//   - the loading screen's title is TrueVision's first-open veil headline\n"
        "//     (VeilDrawingsHeadline), and the drawing-count line is the veil's own\n"
        "//     (VeilDrawingViews): the loader keeps no drawing wait of its own.\n",
        "description")

    text = replace_once(text,
        "// DEVELOPMENT LOG:\n"
        "// 01-Oct-2026 - Version 1.0.0 ({{VVREL:W1-31}})\n",
        "// DEVELOPMENT LOG:\n"
        "// 02-Oct-2026 - Version 1.0.1 ({{VVREL:W1-33}})\n"
        "// - The loading screen is TrueVision's veil and the loader no longer waits\n"
        "//   for the drawing (W1-33): the title and the status line are read from\n"
        "//   the veil's classes, the drawing-count check reads the first-open veil\n"
        "//   (this app's LoadingVeil) and proves the loader has no drawing line or\n"
        "//   wait of its own, and the case that drove a configured drawing label\n"
        "//   through the loader is retired with the loader's drawing line.\n"
        "//\n"
        "// 01-Oct-2026 - Version 1.0.0 ({{VVREL:W1-31}})\n",
        "log")

    text = replace_once(text,
        r"""    check('the drawing-count line reads the veil label VeilDrawingViews, falling back to TrueVision\'s "' + drawing + '"',
        copies.get('Na__LeLoad__LABEL_DRAWING') === 'VeilDrawingViews' && copies.get('Na__LeLoad__STATUS_DRAWING') === drawing
        && /Na__LeLoad__GetLabel\(\s*Na__LeLoad__LABEL_DRAWING\s*,\s*Na__LeLoad__STATUS_DRAWING\s*\)/.test(FunctionBody(LOADER_CODE, 'Na__LeLoad__AwaitFirstDrawing') || ''),
        { label : copies.get('Na__LeLoad__LABEL_DRAWING'), fallback : copies.get('Na__LeLoad__STATUS_DRAWING'), tv : drawing });
""",
        r"""    const vvVeilDrawing = (StripComments(ReadVv(P.veil) || '').match(/GetLabel\(\s*'VeilDrawingViews'\s*,\s*'([^']*)'\s*\)/) || [])[1];
    check('the drawing-count line is the first-open veil\'s: this app\'s LoadingVeil reads VeilDrawingViews, falling back to TrueVision\'s "' + drawing + '", and the loader keeps no drawing line or drawing wait of its own',
        vvVeilDrawing === drawing && !/VeilDrawingViews|WaitForFirstDrawing/.test(LOADER_CODE),
        { veil : vvVeilDrawing, tv : drawing });
""",
        "D drawing line")

    text = replace_once(text,
        r"""        const entering = L.Na__LeLoad__Enter('Sheet_003');
        await tick();
        const rootDuring = ScreenRoot(world);
        if (rootDuring) titleDuringLoad = (rootDuring.querySelector('.loading-text') || { textContent : null }).textContent;
""",
        r"""        const entering = L.Na__LeLoad__Enter('Sheet_003');
        const pressed  = ScreenRoot(world);
        const statusAtPress = pressed ? (pressed.querySelector('.na-le-veil__status') || { textContent : null }).textContent : null;
        await tick();
        const rootDuring = ScreenRoot(world);
        if (rootDuring) titleDuringLoad = (rootDuring.querySelector('.na-le-veil__text') || { textContent : null }).textContent;
""",
        "F title")

    text = replace_once(text,
        r"""        const status = rootDuring ? (rootDuring.querySelector('.na-le-loading__status') || { textContent : null }).textContent : null;
        check('the load: the drawing count reads the veil label\'s words, "Drawing the Views  -  1 of 2"', status === 'Drawing the Views  -  1 of 2', status);
""",
        r"""        const status = rootDuring ? (rootDuring.querySelector('.na-le-veil__status') || { textContent : null }).textContent : null;
        const waits  = world.Called('mode', 'Na__LeMode__WaitForFirstDrawing').length;
        check('the load: the screen named the load\'s own two steps in Title Case ("Fetching the Drawing Tools" at the press, "Reading the Drawing Settings" last) and asked for no drawing wait - the first-open veil owns the drawing',
            statusAtPress === 'Fetching the Drawing Tools' && status === 'Reading the Drawing Settings' && waits === 0, { statusAtPress, status, waits });
""",
        "F status")

    text = replace_once(text,
        r"""    await RunSection('G. CheckNames bites, the label is the config\'s, and an editor switched off or failing answers Ready false', async () => {""",
        r"""    await RunSection('G. CheckNames bites, and an editor switched off or failing answers Ready false', async () => {""",
        "G title")

    text = replace_once(text,
        r"""        const labelled = await OpenCase({ Block : { LayoutMode : true, Sheets : Sheets() }, Labels : Object.assign({}, CONFIG_LABELS, { VeilDrawingViews : 'Your Views Are Being Drawn' }), Progress : [ [ 2, 3 ] ] });
        labelled.Loader.Na__LeLoad__Initialize(Context(labelled));
        await labelled.Loader.Na__LeLoad__Enter('Sheet_001');
        const root = ScreenRoot(labelled);
        const line = root ? (root.querySelector('.na-le-loading__status') || { textContent : null }).textContent : null;
        check('the drawing count follows the editor\'s VeilDrawingViews label when the config sets one', line === 'Your Views Are Being Drawn  -  2 of 3', line);

""",
        "",
        "G labelled case")

    for gone in ("na-le-loading__status", "'.loading-text'", "AwaitFirstDrawing'", "LABEL_DRAWING", "STATUS_DRAWING"):
        if gone in text:
            raise SystemExit("an old loading-screen reading is left: " + gone)
    return join_eol(text, eol)


if __name__ == "__main__":
    data = build()
    out = os.path.join(HERE, "built")
    os.makedirs(out, exist_ok=True)
    open(os.path.join(out, "Na__Test__LoaderFacade__.test.mjs"), "wb").write(data)
    print("built LoaderFacade test:", len(data), "bytes,", data.count(b"\n"), "lines, CR", data.count(b"\r"))
