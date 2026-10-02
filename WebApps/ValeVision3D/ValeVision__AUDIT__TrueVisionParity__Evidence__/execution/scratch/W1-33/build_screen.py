"""W1-33 - LoadingScreen 1.0.1 -> 1.0.2 (LF file, VV-only): the loading state restyled as TrueVision's veil
(.na-le-veil.na-le-veil--boot), Na__LeLoadScreen__IsShown added and exported (R6 F.8 C22), the error state
unchanged. Built from the pre-image with anchored replacements.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from w133_common import HERE, PRE, sha1, split_eol, join_eol, replace_once, preimage_sha1  # noqa: E402


def build():
    data = open(os.path.join(PRE, "Na__LayoutEditor__LoadingScreen__.js"), "rb").read()
    if sha1(data) != preimage_sha1("screen"):
        raise SystemExit("LoadingScreen pre-image moved")
    text, eol = split_eol(data)
    if eol != "\n":
        raise SystemExit("LoadingScreen was LF")

    # PURPOSE
    text = replace_once(text,
        "// PURPOSE    : The full-screen wait while the Layout Editor loads on first use\n",
        "// PURPOSE    : The cover over the wait while the Layout Editor loads on first use, sitting where the editor will\n",
        "purpose")

    # DESCRIPTION + INTEGRATION
    text = replace_once(text,
        "// DESCRIPTION:\n"
        "// - The ValeVision start-up screen again: the same white overlay, the same\n"
        "//   Vale blue spinner and the same title type, built from the start-up\n"
        "//   screen's own classes (Na__UiFeature__Styles__LoadingOverlays__.css) so\n"
        "//   the two cannot drift apart. A status line under the title says which\n"
        "//   step the load is on.\n"
        "// - Shown the moment a sheet tab or a Dev action asks for the editor, so the\n"
        "//   click answers at once. Hidden two frames after the caller has opened the\n"
        "//   sheet, so the fade reveals a painted sheet rather than an empty stage,\n"
        "//   and it fades out exactly as the start-up screen does.\n"
        "// - A load that fails turns the screen into its error state: what went\n"
        "//   wrong, Reload Page (a module that failed to load stays failed until the\n"
        "//   page is reloaded) and Back to 3D Model.\n"
        "// - TRUEVISION'S WORDS. The title is the headline of TrueVision's first-open\n"
        "//   veil, \"Your Drawings Are Loading\" (its label VeilDrawingsHeadline), so the\n"
        "//   reader is told the same thing whichever cover is up. The status lines\n"
        "//   under it are the loader's.\n"
        "//\n"
        "// INTEGRATION:\n"
        "// - Driven by Na__LayoutEditor__Loader__ only. Its extra rules live in\n"
        "//   Na__LayoutEditor__Styles__Boot__.css, which loads with the page.\n",
        "// DESCRIPTION:\n"
        "// - TRUEVISION'S VEIL, AT THE LOADER'S END. The loading state wears the\n"
        "//   first-open veil's own classes - .na-le-veil, with the app's spinner, the\n"
        "//   headline and the status line under it (Na__UiFeature__Styles__\n"
        "//   LoadingOverlays__.css) - and this app's --boot modifier\n"
        "//   (Na__LayoutEditor__Styles__Boot__.css): fixed where the editor host\n"
        "//   will be, below the tab strip, and opaque, because the 3D view is still\n"
        "//   drawn underneath until the editor hides it. The header and the tab\n"
        "//   strip stay above it, so the bar's hold and fold are watched over it\n"
        "//   exactly as TrueVision's are watched over its editor.\n"
        "// - Shown the moment a sheet tab or a Dev action asks for the editor, whole\n"
        "//   and at once, so the click answers in the same frame. The loader drops\n"
        "//   it as soon as its action has run: by then the editor's own first-open\n"
        "//   veil is up over the same rectangle at full opacity, and the drawing is\n"
        "//   that veil's to wait for. It fades out as the veil does.\n"
        "// - IS IT UP? Na__LeLoadScreen__IsShown answers for the mode controller,\n"
        "//   which hands it to the first-open veil as its immediate option: true only\n"
        "//   while the loading state is up and not fading, never for the error\n"
        "//   state, so the editor's veil takes over without a frame of bare stage\n"
        "//   between the two.\n"
        "// - A load that fails turns the screen into its error state, which keeps\n"
        "//   the start-up screen's full-screen look: what went wrong, Reload Page (a\n"
        "//   module that failed to load stays failed until the page is reloaded) and\n"
        "//   Back to 3D Model.\n"
        "// - TRUEVISION'S WORDS. The headline is the first-open veil's, \"Your\n"
        "//   Drawings Are Loading\" (its label VeilDrawingsHeadline), so the reader is\n"
        "//   told the same thing whichever cover is up. The status lines under it\n"
        "//   are the loader's own two steps, in Title Case.\n"
        "//\n"
        "// INTEGRATION:\n"
        "// - Driven by Na__LayoutEditor__Loader__. Na__LayoutEditor__ModeController__\n"
        "//   asks Na__LeLoadScreen__IsShown when it calls the first-open veil. Its\n"
        "//   extra rules live in Na__LayoutEditor__Styles__Boot__.css, which loads\n"
        "//   with the page.\n",
        "description")

    # PORT NOTE
    text = replace_once(text,
        "// - Mirrors       : the headline of TrueVision3D's first-open veil, \"Your Drawings Are Loading\"\n"
        "//                   (Na__LayoutEditor__LoadingVeil__ 1.1.0, label VeilDrawingsHeadline, TrueVision3D\n"
        "//                   v2.83.0, 20-Sep-2026; read at b2aa9151)\n"
        "// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-31}} (the wording)\n"
        "// - Parity        : new - a permanent ValeVision seam with the loader (DR-24 (a))\n"
        "// - Divergences   : n/a (no TrueVision twin)\n",
        "// - Mirrors       : TrueVision3D's first-open veil (Na__LayoutEditor__LoadingVeil__ 1.1.0, TrueVision3D\n"
        "//                   v2.83.0, 20-Sep-2026; read at b2aa9151): its headline \"Your Drawings Are Loading\"\n"
        "//                   (label VeilDrawingsHeadline), and its look - the .na-le-veil classes, the spinner,\n"
        "//                   the headline and the status line\n"
        "// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-31}} (the wording); 02-Oct-2026 for\n"
        "//                   ValeVision3D {{VVREL:W1-33}} (the veil's look and IsShown)\n"
        "// - Parity        : new - a permanent ValeVision seam with the loader (DR-24 (a))\n"
        "// - Divergences   :\n"
        "//   - The whole module: TrueVision has no loader, so nothing there covers an editor import.\n"
        "//   - The --boot modifier (Styles__Boot): fixed below the tab strip, opaque, at the editor host's\n"
        "//     z-index, where TrueVision's going-in veil sits inside the host.\n"
        "//   - Na__LeLoadScreen__IsShown, read by the mode controller for the first-open veil's immediate\n"
        "//     option (R6 F.8 C22; Q-COVER part 2).\n"
        "//   - The error state (Reload Page, Back to 3D Model) keeps the start-up screen's full-screen look.\n",
        "port note")

    # DEVELOPMENT LOG
    text = replace_once(text,
        "// DEVELOPMENT LOG:\n"
        "// 01-Oct-2026 - Version 1.0.1 (TrueVision's veil wording, {{VVREL:W1-31}})\n",
        "// DEVELOPMENT LOG:\n"
        "// 02-Oct-2026 - Version 1.0.2 (TrueVision's veil look and the hand-over, {{VVREL:W1-33}})\n"
        "// - THE LOADING STATE IS TRUEVISION'S VEIL. It wears the first-open veil's\n"
        "//   classes with this app's --boot modifier: fixed below the tab strip where\n"
        "//   the editor host will be, opaque, under the header and the strip, so the\n"
        "//   bar's hold and fold are seen over it. Shown whole at the click; faded\n"
        "//   out as the veil is (320ms).\n"
        "// - Na__LeLoadScreen__IsShown: true while the loading state is up and not\n"
        "//   fading, never for the error state. The mode controller hands it to the\n"
        "//   first-open veil as its immediate option (R6 F.8 C22), so the editor's\n"
        "//   own veil takes over from this one in the same frame.\n"
        "// - The error state keeps the start-up screen's full-screen look.\n"
        "//\n"
        "// 01-Oct-2026 - Version 1.0.1 (TrueVision's veil wording, {{VVREL:W1-31}})\n",
        "log")

    # CONSTANTS
    text = replace_once(text,
        "    // MODULE CONSTANTS | Element Id, Start-Up Screen Classes, Timing and Wording\n"
        "    // ------------------------------------------------------------\n"
        "    // The wording cannot come from the editor's config: the screen is up\n"
        "    // precisely because that config has not loaded yet. So the title is the\n"
        "    // veil label's own fallback, word for word, and the loader reads the\n"
        "    // drawing count's label from the config once it is there.\n"
        "    // ------------------------------------------------------------\n"
        "    const Na__LeLoadScreen__ID          = 'naLayoutEditorLoading';\n"
        "    const Na__LeLoadScreen__HIDDEN      = 'hidden';                           // <-- The start-up screen's fade-out class\n"
        "    const Na__LeLoadScreen__ERROR       = 'loading-overlay--error';           // <-- The start-up screen's error class (hides the spinner)\n"
        "    const Na__LeLoadScreen__FADE_MS     = 500;                                // <-- .loading-overlay's opacity transition\n",
        "    // MODULE CONSTANTS | Element Id, the Two Looks, Timing and Wording\n"
        "    // ------------------------------------------------------------\n"
        "    // The wording cannot come from the editor's config: the screen is up\n"
        "    // precisely because that config has not loaded yet. So the headline is\n"
        "    // the veil label's own fallback, word for word; the status lines are the\n"
        "    // loader's.\n"
        "    // ------------------------------------------------------------\n"
        "    const Na__LeLoadScreen__ID           = 'naLayoutEditorLoading';\n"
        "    const Na__LeLoadScreen__VEIL         = 'na-le-veil na-le-veil--boot';      // <-- The loading state: the first-open veil's look, fixed below the strip (Styles__Boot)\n"
        "    const Na__LeLoadScreen__VISIBLE      = 'na-le-veil--visible';               // <-- The veil's display class\n"
        "    const Na__LeLoadScreen__SHOWN        = 'na-le-veil--shown';                 // <-- The veil's opacity class: on means up, and not fading\n"
        "    const Na__LeLoadScreen__OVERLAY      = 'loading-overlay na-le-loading';     // <-- The error state: the start-up screen's look, plus this screen's own additions\n"
        "    const Na__LeLoadScreen__HIDDEN       = 'hidden';                            // <-- The start-up screen's fade-out class\n"
        "    const Na__LeLoadScreen__ERROR        = 'loading-overlay--error';            // <-- The start-up screen's error class (hides the spinner)\n"
        "    const Na__LeLoadScreen__VEIL_FADE_MS = 320;                                 // <-- .na-le-veil's opacity transition (LoadingOverlays)\n"
        "    const Na__LeLoadScreen__FADE_MS      = 500;                                 // <-- .loading-overlay's opacity transition\n",
        "constants")
    text = replace_once(text,
        "    const Na__LeLoadScreen__TITLE       = 'Your Drawings Are Loading';        // <-- The first-open veil's headline (label VeilDrawingsHeadline; TrueVision's wording, DR-39)\n"
        "    const Na__LeLoadScreen__ERROR_TITLE = 'The Layout Editor could not load.';\n"
        "    const Na__LeLoadScreen__RELOAD      = 'Reload Page';\n"
        "    const Na__LeLoadScreen__BACK        = 'Back to 3D Model';\n",
        "    const Na__LeLoadScreen__TITLE        = 'Your Drawings Are Loading';         // <-- The first-open veil's headline (label VeilDrawingsHeadline; TrueVision's wording, DR-39)\n"
        "    const Na__LeLoadScreen__ERROR_TITLE  = 'The Layout Editor could not load.';\n"
        "    const Na__LeLoadScreen__RELOAD       = 'Reload Page';\n"
        "    const Na__LeLoadScreen__BACK         = 'Back to 3D Model';\n",
        "wording")

    # MODULE VARIABLES comment
    text = replace_once(text,
        "    let Na__LeLoadScreen__HideFrame = 0;       // <-- requestAnimationFrame id of a hide waiting for the sheet's first paint\n",
        "    let Na__LeLoadScreen__HideFrame = 0;       // <-- requestAnimationFrame id of a hide waiting for what is underneath to paint\n",
        "variables")

    # ENSURE
    text = replace_once(text,
        "        root.className = 'loading-overlay na-le-loading';                       // <-- The start-up screen's look, plus this screen's own additions\n",
        "        root.className = Na__LeLoadScreen__VEIL;                                // <-- Each state sets its own look as it is built\n",
        "ensure")

    # BUILD
    text = replace_once(text,
        "    function Na__LeLoadScreen__Build(isError, detail) {\n"
        "        const root = Na__LeLoadScreen__Root;\n"
        "        root.classList.toggle(Na__LeLoadScreen__ERROR, isError);\n"
        "        root.innerHTML = '';\n"
        "\n"
        "        if (!isError) {\n"
        "            const spinner = document.createElement('div');\n"
        "            spinner.className = 'loading-spinner';\n"
        "            const title = document.createElement('p');\n"
        "            title.className   = 'loading-text';\n"
        "            title.textContent = Na__LeLoadScreen__TITLE;\n"
        "            const status = document.createElement('p');\n"
        "            status.className = 'na-le-loading__status';\n"
        "            root.append(spinner, title, status);\n"
        "            return;\n"
        "        }\n",
        "    function Na__LeLoadScreen__Build(isError, detail) {\n"
        "        const root = Na__LeLoadScreen__Root;\n"
        "        root.className = isError ? Na__LeLoadScreen__OVERLAY + ' ' + Na__LeLoadScreen__ERROR : Na__LeLoadScreen__VEIL;   // <-- The veil's look while loading, the start-up screen's for the error\n"
        "        root.innerHTML = '';\n"
        "\n"
        "        if (!isError) {\n"
        "            const spinner = document.createElement('div');\n"
        "            spinner.className = 'loading-spinner';                              // <-- The app's own spinner, as the veil's is\n"
        "            const title = document.createElement('p');\n"
        "            title.className   = 'na-le-veil__text';\n"
        "            title.textContent = Na__LeLoadScreen__TITLE;\n"
        "            const status = document.createElement('p');\n"
        "            status.className = 'na-le-veil__status';\n"
        "            root.append(spinner, title, status);\n"
        "            return;\n"
        "        }\n",
        "build")

    # SHOW (+ IsShown before it)
    text = replace_once(text,
        "    // FUNCTION | Show the Loading State (a second request keeps the screen already up)\n"
        "    // ------------------------------------------------------------\n"
        "    function Na__LeLoadScreen__Show() {\n"
        "        const root    = Na__LeLoadScreen__Ensure();\n"
        "        const showing = root.style.display !== 'none' && !root.classList.contains(Na__LeLoadScreen__HIDDEN);\n"
        "        Na__LeLoadScreen__CancelHide();\n"
        "        if (showing && !root.classList.contains(Na__LeLoadScreen__ERROR)) return;\n"
        "        Na__LeLoadScreen__Build(false);\n"
        "        root.classList.remove(Na__LeLoadScreen__HIDDEN);\n"
        "        root.style.display = '';                                                // <-- Back to the stylesheet's flex\n"
        "    }\n",
        "    // FUNCTION | Is the Loading State Up? (the mode controller asks, for the first-open veil)\n"
        "    // ------------------------------------------------------------\n"
        "    // True while the loading state is on screen and not fading out - the\n"
        "    // test Na__LeLoadScreen__Show makes before it builds anything - and never\n"
        "    // for the error state. The mode controller passes it to\n"
        "    // Na__LeVeil__FirstOpen as its immediate option: the editor's own veil\n"
        "    // then goes up whole in the same frame, over the same rectangle, and\n"
        "    // this cover is dropped behind it (R6 F.8 C22).\n"
        "    // ------------------------------------------------------------\n"
        "    function Na__LeLoadScreen__IsShown() {\n"
        "        const root = Na__LeLoadScreen__Root;\n"
        "        return !!root && root.style.display !== 'none'\n"
        "            && root.classList.contains(Na__LeLoadScreen__SHOWN)\n"
        "            && !root.classList.contains(Na__LeLoadScreen__ERROR);\n"
        "    }\n"
        "    // ------------------------------------------------------------\n"
        "\n"
        "\n"
        "    // FUNCTION | Show the Loading State (a second request keeps the screen already up)\n"
        "    // ------------------------------------------------------------\n"
        "    // Whole and at once: the click is answered in the same frame, and a\n"
        "    // cover that faded in would let the 3D view show through it after the\n"
        "    // 3D furniture has already gone.\n"
        "    // ------------------------------------------------------------\n"
        "    function Na__LeLoadScreen__Show() {\n"
        "        const root    = Na__LeLoadScreen__Ensure();\n"
        "        const showing = Na__LeLoadScreen__IsShown();\n"
        "        Na__LeLoadScreen__CancelHide();\n"
        "        if (showing) return;\n"
        "        Na__LeLoadScreen__Build(false);\n"
        "        root.style.display = '';\n"
        "        root.classList.add(Na__LeLoadScreen__VISIBLE, Na__LeLoadScreen__SHOWN);   // <-- Display and opacity in one frame: no fade in\n"
        "    }\n",
        "show")

    # SET STATUS
    text = replace_once(text,
        "        const status = root.querySelector('.na-le-loading__status');\n",
        "        const status = root.querySelector('.na-le-veil__status');\n",
        "status")

    # HIDE
    text = replace_once(text,
        "    // FUNCTION | Hide Once What Is Underneath Has Painted, Then Fade Out\n"
        "    // ------------------------------------------------------------\n"
        "    // immediate: fade now, without waiting for a paint (Back to 3D Model).\n"
        "    // ------------------------------------------------------------\n"
        "    function Na__LeLoadScreen__Hide(immediate) {\n"
        "        const root = Na__LeLoadScreen__Root;\n"
        "        if (!root || root.style.display === 'none') return;\n"
        "        Na__LeLoadScreen__CancelHide();\n"
        "        const fade = () => {\n"
        "            Na__LeLoadScreen__HideFrame = 0;\n"
        "            root.classList.add(Na__LeLoadScreen__HIDDEN);\n"
        "            Na__LeLoadScreen__HideTimer = window.setTimeout(() => {\n"
        "                Na__LeLoadScreen__HideTimer = null;\n"
        "                root.style.display = 'none';\n"
        "                root.classList.remove(Na__LeLoadScreen__ERROR);\n"
        "            }, Na__LeLoadScreen__FADE_MS);\n"
        "        };\n"
        "        if (immediate === true) { fade(); return; }\n"
        "        Na__LeLoadScreen__HideFrame = window.requestAnimationFrame(() => {\n"
        "            Na__LeLoadScreen__HideFrame = window.requestAnimationFrame(fade);   // <-- Two frames: the sheet's layout, then its first paint\n"
        "        });\n"
        "    }\n",
        "    // FUNCTION | Hide Once What Is Underneath Has Painted, Then Fade Out\n"
        "    // ------------------------------------------------------------\n"
        "    // immediate: fade now, without waiting for a paint (Back to 3D Model).\n"
        "    // The loading state fades as the veil does, the error state as the\n"
        "    // start-up screen does.\n"
        "    // ------------------------------------------------------------\n"
        "    function Na__LeLoadScreen__Hide(immediate) {\n"
        "        const root = Na__LeLoadScreen__Root;\n"
        "        if (!root || root.style.display === 'none') return;\n"
        "        Na__LeLoadScreen__CancelHide();\n"
        "        const isError = root.classList.contains(Na__LeLoadScreen__ERROR);\n"
        "        const fade = () => {\n"
        "            Na__LeLoadScreen__HideFrame = 0;\n"
        "            if (isError) root.classList.add(Na__LeLoadScreen__HIDDEN);\n"
        "            else root.classList.remove(Na__LeLoadScreen__SHOWN);\n"
        "            Na__LeLoadScreen__HideTimer = window.setTimeout(() => {\n"
        "                Na__LeLoadScreen__HideTimer = null;\n"
        "                root.style.display = 'none';\n"
        "                root.classList.remove(Na__LeLoadScreen__VISIBLE, Na__LeLoadScreen__HIDDEN, Na__LeLoadScreen__ERROR);\n"
        "            }, isError ? Na__LeLoadScreen__FADE_MS : Na__LeLoadScreen__VEIL_FADE_MS);\n"
        "        };\n"
        "        if (immediate === true) { fade(); return; }\n"
        "        Na__LeLoadScreen__HideFrame = window.requestAnimationFrame(() => {\n"
        "            Na__LeLoadScreen__HideFrame = window.requestAnimationFrame(fade);   // <-- Two frames: what is underneath lays out, then paints\n"
        "        });\n"
        "    }\n",
        "hide")

    # SHOW ERROR - its look is set by Build now
    text = replace_once(text,
        "        Na__LeLoadScreen__Build(true, detail);\n"
        "        root.classList.remove(Na__LeLoadScreen__HIDDEN);\n"
        "        root.style.display = '';\n",
        "        Na__LeLoadScreen__Build(true, detail);                                  // <-- The start-up screen's full-screen look, appearing at once\n"
        "        root.style.display = '';\n",
        "show error")

    # EXPORTS
    text = replace_once(text,
        "    export {\n"
        "        Na__LeLoadScreen__Show,\n"
        "        Na__LeLoadScreen__SetStatus,\n",
        "    export {\n"
        "        Na__LeLoadScreen__Show,\n"
        "        Na__LeLoadScreen__IsShown,\n"
        "        Na__LeLoadScreen__SetStatus,\n",
        "exports")

    for gone in ("na-le-loading__status", "'loading-text'"):
        if gone in text:
            raise SystemExit("old loading-state class left: " + gone)
    return join_eol(text, eol)


if __name__ == "__main__":
    data = build()
    out = os.path.join(HERE, "built")
    os.makedirs(out, exist_ok=True)
    open(os.path.join(out, "Na__LayoutEditor__LoadingScreen__.js"), "wb").write(data)
    print("built LoadingScreen:", len(data), "bytes,", data.count(b"\n"), "lines, CR", data.count(b"\r"))
