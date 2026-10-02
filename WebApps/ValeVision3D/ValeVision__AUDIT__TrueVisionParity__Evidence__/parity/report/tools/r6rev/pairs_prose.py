# Exact (old, new) replacements for r6_prose.py (applied by crlf_patch.py; each old occurs once).
PAIRS = [
    # ---- INTRO: the overlay
    ("Tables marked *generated* come from `parity/report/tools/r6_build_sectionF.py` (with `r6_compute.py`, `r6_prose.py` and the read-only line-ending scan `r6_eol_scan.py`). If `wp_canonical.json` changes, re-run the script; never hand-edit a generated table.",
     "Tables marked *generated* come from `parity/report/tools/r6_build_sectionF.py` (with `r6_compute.py`, `r6_prose.py`, `r6_corrections.py` and the read-only line-ending scan `r6_eol_scan.py`). If `wp_canonical.json` changes, re-run the script; never hand-edit a generated table. The F.3 catalogue and the F.6.1 brief show every package-level correction of F.8 applied, each marked `[F.8 Cn]` (`r6_corrections.py`). `wp_canonical.json` does not carry them yet, so every count, level, path and serial order in F.2, F.4 and F.7 is computed from it as it stands, and a delegator that briefs straight from the JSON must apply F.8 first."),
    # ---- F.0: the Url constructor line
    ("the registrar registers `Na__Pwa__ServiceWorker__.js` (Url constructor `:19`, `:225-231`)",
     "the registrar registers `Na__Pwa__ServiceWorker__.js` (Url constructor `:38` names the file, `:225-231` builds its URL)"),
    # ---- P7: G3 and G4 failures attributed by file too
    ("A G1/G2 failure that names only files outside your `edits` list is foreign: re-run once after the other agent's turn, then report it - never fix it.",
     "A G1, G2, G3 or G4 failure that names only files outside your `edits` list is foreign: re-run once after the other agent's turn, then report it - never fix it (a hit on W0-04's baseline allow-list is a WARN, not a failure, F.8 C13)."),
    ("One agent's half-landed set therefore fails another agent's run.",
     "One agent's half-landed set therefore fails another agent's run. The G3 path gate (`k2_path_gate.py --root`) and W0-04's G4 lint scan the whole tree too, so the same attribution applies to them."),
    # ---- P12: worker 1.6.0 as well as the sync fix
    ("until Adam has applied the W0-07 sync fix. Save-path work",
     "until Adam has applied the W0-07 sync fix and deployed worker 1.6.0: their routes are new in W0-10, and the deployed `/assets` route accepts only thumbnail, linework and snapshot keys (F.8 C29). Save-path work"),
    ("DR-06; K3 R8; W0-12 and W1-05 risks.",
     "DR-06; K3 R8; W0-12 and W1-05 risks; `WCP/CloudflareWorker/src/handlers/CloudflareHandler__ProjectAsset__.js:51`; R0 P9."),
    # ---- P15: the one named identity exception
    ("brand lives in config values, keys stay TV's.\",",
     "brand lives in config values, keys stay TV's. One named exception: the TrueVisionHub statement section lands at TV's path, excluded from VV's DEFINITIONS by config and exempt from G4 by name (W4-12, F.8 C13).\","),
    # ---- P19: the two W0 commits
    ("Adam commits per wave (one commit per allocated VV version, S11 B10 item 7), staging only the integrator's path list",
     "Adam commits per wave (one commit per allocated VV version, S11 B10 item 7), plus two fixed commits inside W0 - W0-01's PLAN edit alone before W0-02 is dispatched, and W0-02 alone (code only) before any other W0 package (F.8 C10) - staging only the integrator's path list"),
    ("K3 R11; S11 B10 item 7; `git status` 01-Oct.",
     "K3 R11; S11 B10 item 7; `git status` 01-Oct; `k2_renumber_apply.py:269-273`; R1 A.3.2 Step 4."),
    # ---- F.2.1 diagram: W0 commit points, the D1 edge to W3, DR-25
    ('    W0["W0 Foundations: 20 packages, 15,619 lines"]\n',
     '    W0A["W0-01 decision record: 200 lines"]\n'
     '    C0A[/"Adam commits W0-01\'s PLAN edit alone - F.8 C10"/]\n'
     '    W0B["W0-02 renumber, alone: 1,049 lines"]\n'
     '    C0B[/"Adam commits W0-02 alone, code only, after its gates and smoke test - F.8 C10"/]\n'
     '    W0["W0-03 to W0-19: 17 packages, 13,970 lines - W0 in all: 20 packages, 15,619 lines"]\n'),
    ('    A0 --> W0 --> S0 --> G0 --> W1',
     '    A0 --> W0A --> C0A --> W0B --> C0B --> W0 --> S0 --> G0 --> W1'),
    ('    D4[/"Adam: DR-12 resolver, DR-08 A, DR-44 for the optional packages"/]',
     '    D4[/"Adam: DR-12 resolver, DR-08 A, DR-44, DR-25 retire for the optional packages"/]'),
    ('    D2 -.->|"before W3-09 and W4-07 write R2 subfolders - R8"| W3\n',
     '    D2 -.->|"before W3-09 and W4-07 write R2 subfolders - R8"| W3\n'
     '    D1 -.->|"before W3-09 writes R2 - the sheet-image routes are new in 1.6.0"| W3\n'),
    ('    D4 -.->|"W5-04, W5-05, W5-06"| W5',
     '    D4 -.->|"W5-04, W5-05, W5-06 and the proposed W5-07"| W5'),
    ("Rules the diagram encodes: a wave starts only after the previous scribe pass and Adam's commit (K3 R11);",
     "Rules the diagram encodes: a wave starts only after the previous scribe pass and Adam's commit (K3 R11); inside W0, W0-01 and W0-02 each end in a commit of Adam's before the next package is dispatched (F.8 C10);"),
    # ---- F.4.1 integrator owns Flask restarts and the headless harness runs
    ("the WCP Flask server's lifecycle (start, restart after a `server.py` or blueprint change);",
     "the WCP Flask server's lifecycle (start, and restart after a `server.py` or blueprint change if the debug reloader has not - the only owner of Flask restarts; worker deploys are Adam's); the headless runs of the `.html` harnesses (F.5.1 G5);"),
    # ---- F.4.2 step 2 and step 6
    ("and for each hot file in its `edits` the previous editor in that file's same-wave serial order is DONE.",
     "and for each hot file in its `edits` the previous editor in that file's same-wave serial order is DONE. In W0, W0-02 is dispatchable only once Adam's W0-01 commit is in HEAD, and every other W0 package only once Adam's W0-02 commit is (F.8 C10)."),
    ("W5-06 (DR-08 (A)) (dependent W5-99) and W6-03 (DR-03 removals; dependents W6-01, W6-02, W6-04).",
     "W5-06 (DR-08 (A)) (dependent W5-99), W6-03 (DR-03 removals; dependents W6-01, W6-02, W6-04) and, once the planner adds it, the proposed W5-07 (DR-25 answered 'retire' at W4-09; dependent W5-99; F.8 C33)."),
    ("W5-04 shares the CSS index and `index.html` with W6-03 and then works in hunks on W6-03's result.",
     "W5-04 shares the CSS index and `index.html` with W6-03 and then works in hunks on W6-03's result; the proposed W5-07 follows W5-05 in the LE AppConfig, so a W5-05 released after W5-07 ran works in hunks on W5-07's result."),
    # ---- F.5.1 G4 and G5 rows, and the runner note
    ("| from W0-04; zero `{{VVREL:` only after the scribe | not yet written | agent, then integrator, then scribe |",
     "| from W0-04, blocking on the package's own files (P7). Exempt: the whole PORT NOTE block, history documents and the named TrueVisionHub file; W0-04's baseline allow-list (`SpecPdf__.js:147` until W0-12) prints WARN and is empty by W0-99 (F.8 C13); zero `{{VVREL:` only after the scribe | not yet written; today 4 identity hits outside 'Ported from' lines (F.8 C13) | agent, then integrator, then scribe |"),
    ("an `.html` harness in a browser at `http://localhost:8000/ValeVision3D/80__Testing__PrototypeEnvironment/<name>.html` with the WCP Flask server running | per package; the whole VV suite at every wave gate (F.5.3) | 6 of 6 VV node tests exit 0 | agent, then integrator |",
     "an `.html` harness headless in Chromium through Playwright at `http://localhost:8000/ValeVision3D/80__Testing__PrototypeEnvironment/<name>.html` with the WCP Flask server running (runner below) | per package; the whole VV suite at every wave gate (F.5.3) | 6 of 6 VV node tests exit 0 | node and Python: agent, then integrator; `.html`: integrator, headless |"),
    ("then Adam's commit of the integrator's path list | end of every wave | - | integrator, scribe, Adam |",
     "then Adam's commit of the integrator's path list | end of every wave | - | integrator, scribe, Adam |\n\n"
     "**Headless runner for the `.html` harnesses (G5).** Playwright 1.62.1 (`~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright`) and Chromium (`%LOCALAPPDATA%/ms-playwright/chromium-1208/chrome-win64/chrome.exe`) are both installed on Adam's machine (checked 01-Oct-2026; the same pair runs Vegetation Sketcher's UI tests, Adam's memory note of 25-Sep-2026). The integrator keeps a small runner script with the durable copy of the tools (RK-26, outside both repos), opens each harness against the WCP Flask server and records the result the page prints: a summary line (TV `Na__Test__ElevationGeometry__.html:239`, `Na__Test__SpellCheckField__.html:191`), `document.title` (`Na__Test__StatementTyping__.html:225`), `window.__TEST_RESULT` (VV `Na__Test__TitleBlockCells__.html:191`) or a console 'HARNESS:' line (`Na__Test__ProjectRecordAddress__.html:143`). Pages that only draw captions for a person (`Na__Test__PublishedReader__Harness__.html`, `Na__Test__SitePlanComposites__Output__.html`) get a saved headless screenshot in the Port Record and a line on Adam's smoke list (F.5.4 W2 and W4). If the runner is unavailable, every `.html` check moves to Adam's smoke list for that wave and the package's acceptance names Adam. Packages whose acceptance uses a harness (from `wp_canonical.json`): W0-16, W1-10, W1-12, W1-22, W1-25, W1-26, W2-14, W2-34, W4-02, W4-12, W4-14."),
    # ---- F.5.2 wave gates
    ("WCP sync data committed or set aside so W0-02's preflight (clean WebApps/ValeVision3D AND WebApps/Whitecardopedia) passes;",
     "WCP sync data committed or set aside so W0-02's preflight (clean WebApps/ValeVision3D AND WebApps/Whitecardopedia) passes; inside the wave Adam commits W0-01's PLAN edit before W0-02 is dispatched, and W0-02 alone before the rest of W0 (F.8 C10);"),
    ("W0-99 done; G1, G2 and (for the first time) G3 PASS; G4 clean; Flask restarted with the W0-09/W0-18/W0-19 blueprints;",
     "W0-99 done; G1, G2 and (for the first time) G3 PASS; G4 clean with an empty baseline allow-list (F.8 C13); the integrator has confirmed the W0-09/W0-18/W0-19 routes answer (restarting Flask if the reloader did not);"),
    ("W0-07 applied by Adam before W3-09 is dispatched - otherwise W3-09 lands with its R2 acceptance item deferred (R8).",
     "W0-07 applied AND worker 1.6.0 deployed by Adam before W3-09's R2 item - otherwise that item is deferred and W3-09 lands with local writes only (R8, P12, F.8 C29)."),
    ("W4-99 done (it names the worker redeploy and Flask restart Adam must run); Statement Writer still off unless Adam answered DR-10; DR-25 re-decided;",
     "W4-99 done (it names the worker redeploy Adam must run; Flask restarts are the integrator's); Statement Writer still off unless Adam answered DR-10; DR-25 re-decided (a 'retire' answer releases the proposed W5-07, F.8 C33);"),
    ("the optional packages run only on Adam's answers (W5-04 DR-44, W5-05 DR-12 resolver, W5-06 DR-08 (A)).",
     "the optional packages run only on Adam's answers (W5-04 DR-44, W5-05 DR-12 resolver, W5-06 DR-08 (A); the proposed W5-07 on DR-25 'retire', F.8 C33)."),
    ("W5-04, W5-05 and W5-06 each landed or SKIPPED-HELD;",
     "W5-04, W5-05, W5-06 (and W5-07 once added) each landed or SKIPPED-HELD;"),
    # ---- F.5.4 smoke
    ("the Specification tab opens (W0-02).",
     "the Specification tab opens (W0-02; run straight after W0-02, before Adam's W0-02 commit, F.8 C10)."),
    ("the cover hands over to the in-host veil with no blink (W1-33).",
     "the cover hands over to the in-host veil with no blink and no frame of bare stage; with a Video Studio path open the timeline hides too (W1-33, F.8 C22)."),
    ("parametric scale bar and drawing title (W2-37). |",
     "parametric scale bar and drawing title (W2-37). 8. The site-plan composites page renders as expected (`Na__Test__SitePlanComposites__Output__.html`, W2-14; the integrator's headless screenshot is in the Port Record). |"),
    ("6. Run the worker redeploy and Flask restart that W4-99 names.",
     "6. Run the worker redeploy that W4-99 names (Flask restarts are the integrator's). 7. The published-reader harness shows every sheet's pictures loaded (`Na__Test__PublishedReader__Harness__.html`, W4-02; the integrator's headless screenshot is in the Port Record)."),
    ("3. Only if chosen: Cache & Storage panel (W5-04); a printed QR scans to the Vale resolver (W5-05); site-plan data (W5-06).",
     "3. Only if chosen: Cache & Storage panel (W5-04); a printed QR scans to the Vale resolver (W5-05); site-plan data (W5-06); with Layout Mode retired, a project whose stored switch was off shows its strip once it has a sheet while the live site shows published drawings only (proposed W5-07)."),
    # ---- F.5.7 rollback
    ("Rollback is cheap only because the swarm never commits inside a wave (P19) and the integrator keeps pre-images (F.4.2).",
     "Rollback is cheap only because the swarm never commits inside a wave (P19; Adam's two W0 commits are the only exceptions, F.8 C10) and the integrator keeps pre-images (F.4.2)."),
    ("| W0-02 renumber | G1, G2 or G3 fails after `k2_renumber_apply.py --mode git` | as a whole wave, scoped to `WebApps/ValeVision3D`; the script refuses a dirty tree (`k2_renumber_apply.py:271`), so HEAD is the exact pre-image | Adam |",
     "| W0-02 renumber | G1, G2 or G3 fails after `k2_renumber_apply.py --mode git`, or Adam's smoke test fails | before Adam's W0-02 commit: restore `WebApps/ValeVision3D` to HEAD - Adam's W0-01 commit, which is the exact pre-image because the script refuses a dirty tree (`k2_renumber_apply.py:269-273`), so W0-01's Decisions block survives - then delete new-named folders left holding ignored files (R1 A.3.2). After that commit: `git revert` of it (F.8 C10) | Adam |"),
    # ---- F.6 template: the F.8 rows go into section 2
    ("- Package record: PARITY/data/wp_canonical.json -> packages[wp_id = \"<wp_id>\"] (pasted below).",
     "- Package record: PARITY/data/wp_canonical.json -> packages[wp_id = \"<wp_id>\"] (pasted below).\n- F.8 corrections that name <wp_id>: <row ids>, already applied to the text below."),
    # ---- F.6.1 intro: the seam is recorded
    ("Section D.1 has the fold's full anatomy (header, strip, host, canvas, menu) and agrees that the fold CSS needs no port.",
     "Section D.1 has the fold's full anatomy (header, strip, host, canvas, menu) and agrees that the fold CSS needs no port. The one seam no source specified - how Enter learns that the loader's cover is up (R4 D.5 #5) - is recorded in F.8 C22 and carried in section 4 below, with the `.na-vs-tl` selector."),
    # ---- F.7.2 risks
    ("R8: no subfolder writes until Adam applies W0-07;",
     "R8: no subfolder writes until Adam applies W0-07 and deploys worker 1.6.0 (P12);"),
    ("G4 naming lint (W0-04) with the K2 V2 marker list; NA-only features land off (DR-12, DR-10, DR-08).",
     "G4 naming lint (W0-04) with the K2 V2 marker list, exempting only PORT NOTE blocks, history and the named TrueVisionHub file (F.8 C13); NA-only features land off (DR-12, DR-10, DR-08); no acceptance text carries an NA phase code (F.8 C21)."),
    ("Additive blueprints; the integrator restarts Flask after each server change; Adam's W0 smoke item 4.",
     "Additive blueprints; the integrator owns Flask restarts and checks the routes answer after each server change (`server.py` runs the debug reloader, F.8 C16); Adam's W0 smoke item 4."),
    ("     \"Before W0 the delegator copies PARITY/data and PARITY/report/tools to a durable folder outside both repos and points every brief at it; optionally W0-04 also lands the path gate as a VV verifier (name per K2 F7, e.g. Na__Verify__PathGate__.py - a proposal, not a K3 package).\", \"delegator\"),\n]",
     "     \"Before W0 the delegator copies PARITY/data and PARITY/report/tools to a durable folder outside both repos and points every brief at it; optionally W0-04 also lands the path gate as a VV verifier (name per K2 F7, e.g. Na__Verify__PathGate__.py - a proposal, not a K3 package).\", \"delegator\"),\n"
     "    (\"RK-27\", \"A package is briefed straight from wp_canonical.json without its F.8 corrections, so it builds the wrong probe, URL, raster rule or gate text.\", \"M\", \"M\", \"every package F.8 C10-C33 names\",\n"
     "     \"F.3 and F.6.1 show every correction applied and marked [F.8 Cn]; r6_corrections.py raises when a correction no longer matches the JSON; before dispatch the planner patches wp_canonical.json (and hot_file_ownership.json for C20 and C33) and re-runs r6_build_sectionF.py and k3_verify_outputs.py.\", \"delegator\"),\n]"),
    # ---- F.8 C5 evidence
    ("Url constructor `:19`, `:225-231`; stub `:24`, `:31`;",
     "Url constructor `:38`, `:225-231`; stub `:24`, `:31`;"),
]
