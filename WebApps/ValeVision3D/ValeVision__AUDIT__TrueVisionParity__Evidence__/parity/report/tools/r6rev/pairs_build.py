# Exact (old, new) replacements for r6_build_sectionF.py (applied by crlf_patch.py; each old occurs once).
PAIRS = [
    ("import r6_prose as T            # noqa: E402\n",
     "import r6_prose as T            # noqa: E402\nimport r6_corrections as K      # noqa: E402\n"),
    ("P = C.P\n",
     "P = C.P\nPV = K.overlaid(P)              # display copy with the F.8 corrections applied (text only)\n"),
    # ---- headline
    ("more agents add lock contention without shortening the path.'",
     "more agents add lock contention without shortening the path. One further conditional package, W5-07 (retiring the Layout Mode switch, F.8 C33), is proposed but not yet in `wp_canonical.json`, so no count here includes it.'"),
    # ---- catalogue: conventions bullet, overlay rows, the proposed package
    ("A('- Tests: TV tests ported (or VV-only tests written) by the package, then its harness gates (F.5.1).')\n",
     "A('- Tests: TV tests ported (or VV-only tests written) by the package, then its harness gates (F.5.1).')\n"
     "A('- `[F.8 Cn]` after a line, or `(F.8 Cn)` on a target: text that F.8 row Cn corrects or adds (%d packages carry one). `wp_canonical.json` still holds K3\\'s original wording until the planner patches it; brief from this catalogue or apply F.8 first.' % len(K.touched()))\n"),
    ("    for x in members:\n        p = P[x]\n        A('| %s | %s | %s | %s | %s | %s | %s | %s | %s |' % (\n            x, cell(p['title']), sources_targets(p), hot_cell(p), deps_cell(p), gated_cell(p), size_cell(p), acc_cell(p), tests_cell(p)))\n    A('')\n",
     "    for x in members:\n        p = PV[x]\n        A('| %s | %s | %s | %s | %s | %s | %s | %s | %s |' % (\n            x, cell(p['title']), sources_targets(p), hot_cell(p), deps_cell(p), gated_cell(p), size_cell(p), acc_cell(p), tests_cell(p)))\n    A('')\n"
     "    if w == 'W5':\n"
     "        A('Proposed, not yet in `wp_canonical.json`: **%s** - retire the per-project Layout Mode switch, only if DR-25 is answered \"retire\" at W4-09 (hard-gated; depends on W5-03 and W5-05; W5-99 waits for it or for its SKIPPED-HELD mark). Targets, hot-file slots and acceptance are in F.8 C33; the planner adds it before W5 is dispatched.' % K.PROPOSED_ID)\n"
     "        A('')\n"),
    # ---- the W1-33 brief reads the overlaid record
    ("p = P['W1-33']\n", "p = PV['W1-33']\n"),
    ("        'whole-file port of TV 1.1.0 (`TLE/05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js`); re-add VV-only export `Na__LeVeil__DrawingSettled`; add the `immediate` option to `FirstOpen`; rewrite the PORT NOTE (VV `:53-62` says the going-in veil is deliberately not ported - no longer true)',",
     "        'whole-file port of TV 1.1.0 (`TLE/05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js`); re-add VV-only export `Na__LeVeil__DrawingSettled`; add the `immediate` option to `FirstOpen`: with `jobs.immediate === true` it adds `na-le-veil--visible` and `na-le-veil--shown` together, with no reflow between them, before returning (full opacity in the first frame, TV LoadingOverlays `:275-277`), instead of arming the 550 ms timer (TV `:103`, `:353`); rewrite the PORT NOTE (VV `:53-62` says the going-in veil is deliberately not ported - no longer true)',"),
    ("hide the boot veil straight after `action(editor)`; `WaitForFirstDrawing` resolves at once off the sheet view',",
     "hide the boot veil straight after `action(editor)` returns (Enter has by then put the in-host veil up at full opacity); `WaitForFirstDrawing` resolves at once off the sheet view',"),
    ("Title Case statuses (\"Fetching the Drawing Tools\", \"Reading the Drawing Settings\"); the VV-only error state unchanged',",
     "Title Case statuses (\"Fetching the Drawing Tools\", \"Reading the Drawing Settings\"); add and export `Na__LeLoadScreen__IsShown()` (true while the loading state is up, not fading and not the error state - the test `Show` makes at `:166`, `:168`; F.8 C22); the VV-only error state unchanged',"),
    ("`body.na-layout-editor--active .na-le-veil--boot { top: var(--Vale_LayoutTabStripHeight) }`',",
     "`body.na-layout-editor--active .na-le-veil--boot { top: var(--Vale_LayoutTabStripHeight) }`; add the VV-only `body.na-layout-editor--active .na-vs-tl` to the moved block (S10-V03, F.8 C22)',"),
    ("call `Na__LeVeil__FirstOpen(host, { specification, textMetrics, viewportCount, immediate })` exactly as TV `:713`, `:733` (the promise from `PreloadMetrics` comes from W1-32); import `Na__LeVeil__FirstOpen` beside ReturnTo3d and Dismiss3d (TV `:289`)',",
     "call `Na__LeVeil__FirstOpen(host, { specification, textMetrics, viewportCount, immediate: Na__LeLoadScreen__IsShown() })` at TV\\'s call site (TV `:733`; the promises from `:712-713`, `PreloadMetrics` returning its promise comes from W1-32); import `Na__LeVeil__FirstOpen` beside ReturnTo3d and Dismiss3d (TV `:289`) and `Na__LeLoadScreen__IsShown` from `../01__Core__Loader/Na__LayoutEditor__LoadingScreen__.js` (a leaf with no imports); list that read under PORT NOTE Divergences (F.8 C22)',"),
    ("A('- Package record: PARITY/data/wp_canonical.json -> packages[wp_id = \"W1-33\"].')\n",
     "A('- Package record: PARITY/data/wp_canonical.json -> packages[wp_id = \"W1-33\"].')\n"
     "A('- F.8 corrections already applied to the text below: C22 (the seam that carries \"immediate\", the .na-vs-tl')\n"
     "A('  selector and the bare-stage check).')\n"),
    ("A('   DrawingSettled export (VV-only), the immediate option.')\n",
     "A('   DrawingSettled export (VV-only), the immediate option (F.8 C22).')\n"),
    ("A('   LoadingScreen is LF).')\n",
     "A('   LoadingScreen is LF: 0 CRLF in its 240 lines and git ls-files --eol w/lf on 01-Oct-2026).')\n"),
    ("A('5. Return the Port Record. SHARED SERVICE WORKER: new export Na__LeVeil__FirstOpen on an existing module ->')\n",
     "A('5. Return the Port Record. SHARED SERVICE WORKER: new exports Na__LeVeil__FirstOpen (LoadingVeil) and')\n"
     "A('   Na__LeLoadScreen__IsShown (LoadingScreen) on existing modules ->')\n"),
    # ---- F.8: intro and the rows from r6_corrections
    ("These are content corrections and additions, each from evidence; the delegator applies them when it writes the briefs.')",
     "C1-C9 were found while building this section. C10-C33 carry the package-level corrections raised in Sections A-E and in review, each re-checked against the code on 01-Oct-2026; C33 proposes one new conditional package. `wp_canonical.json` does not carry them yet: F.3 and the F.6.1 brief show them applied (marked `[F.8 Cn]`, from `r6_corrections.py`, as are C1 and C7), and the delegator applies every row that names a package when it writes that package\\'s brief - or the planner patches `wp_canonical.json` (and `hot_file_ownership.json` for C20 and C33), re-runs `r6_build_sectionF.py` and `k3_verify_outputs.py`, and the overlay then finds nothing left to change.')"),
    ("for cid, item, finding, ev, applied in T.CORRECTIONS:\n    A('| %s | %s | %s | %s | %s |' % (cid, cell(item), cell(finding), cell(ev), cell(applied)))\n",
     "for cid, item, finding, ev, applied in list(T.CORRECTIONS) + K.rows():\n    A('| %s | %s | %s | %s | %s |' % (cid, cell(item), cell(finding), cell(ev), cell(applied)))\n"),
]
