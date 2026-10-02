# Third pass on r6_prose.py.
PAIRS = [
    ('("P12", "No new R2 subfolder content until the sync fix is applied",',
     '("P12", "No new R2 subfolder content until the sync fix is applied and worker 1.6.0 is deployed",'),
    ("Adam commits per wave (one commit per allocated VV version, S11 B10 item 7), plus two fixed commits inside W0 - W0-01's PLAN edit alone before W0-02 is dispatched, and W0-02 alone (code only) before any other W0 package (F.8 C10) - staging only the integrator's path list - never `git add -A` at `VCB/`, whose working tree holds unrelated sync data today (F.0).",
     "Adam commits per wave (one commit per allocated VV version, S11 B10 item 7) and twice more inside W0: W0-01's PLAN edit alone before W0-02 is dispatched, then W0-02 alone (code only) before any other W0 package (F.8 C10). Every commit stages only the integrator's path list - never `git add -A` at `VCB/`, whose working tree holds unrelated sync data today (F.0)."),
    ("W5 committed; Adam confirmed the user-visible removals (DR-03) and, for 62 -> 92, answered D-S01-08 (a).",
     "W5 committed; Adam confirmed the user-visible removals (DR-03), chose keep or archive for 35's Vale title-block material (F.8 C31) and, for 62 -> 92, answered D-S01-08 (a)."),
    ("Save Sheets files it (R2 only after W0-07 is applied) (W3-09).",
     "Save Sheets files it (R2 only after W0-07 is applied and worker 1.6.0 deployed) (W3-09)."),
    ("1. Image Export still exports; the Tools menu no longer offers the legacy Create Drawing page; the email form still works (W6-03).",
     "1. Image Export still exports; the Tools menu no longer offers the legacy Create Drawing page; the email form still works; 35's VizDpt and RecConcept title-block files are kept or archived as Adam chose (W6-03, F.8 C31)."),
]
