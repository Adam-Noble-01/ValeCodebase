"""W2-15: planted faults in a copy of the candidate; the harness must fail on every one.

  python -B w2_15_mutants.py
Writes the mutants under scratch/W2-15/mutants/ only; the harness reads them through W215_NEWFILE.
"""
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(HERE, "candidate", "Na__LayoutEditor__SnapshotRenderer__.js")
OUT = os.path.join(HERE, "mutants")

MUTANTS = [
    ("fog source not nulled for an underlay",
     "const fogWas      = Na__ElevFog__SetSource(fogLayer);", "const fogWas      = undefined;", 1),
    ("fog image drawn on the composer route",
     "? (cam) => Na__ElevFog__RenderLayerFrame(cam)", "? null", 1),
    ("Enhance run on the fog image",
     "if (!fogLayer && styles && styles.enhanceWhitecard === true)", "if (styles && styles.enhanceWhitecard === true)", 1),
    ("2D Enhance strength dropped",
     "await Na__LeEnhance__Apply(result.canvas, weights ? weights.enhancePct : null);   // <-- Levels", "await Na__LeEnhance__Apply(result.canvas, null);   // <-- Levels", 1),
    ("2D modifier rules dropped",
     "Na__LineworkSettings__SetLineworkBaseOverride(weights.modelEdgePx, weights.modifiers);   // <-- The tiled", "Na__LineworkSettings__SetLineworkBaseOverride(weights.modelEdgePx);   // <-- The tiled", 1),
    ("the old outline-width order: read after the live tool is suspended AND put back after the release (either alone is harmless: the release hands the parked width back)",
     [ ("const sectionWas  = wantSection ? Na__DrawView__SectionAdapter__GetOutlineWidthPx() : null;", "let   sectionWas  = null;"),
       ("if (sectionWas !== null) Na__DrawView__SectionAdapter__SetOutlineWidthPx(sectionWas);   // <-- Before the release, so the author's sections come back at their own width\r\n                Na__DrawView__SectionAdapter__Release();",
        "Na__DrawView__SectionAdapter__Release();\r\n                if (sectionWas !== null) Na__DrawView__SectionAdapter__SetOutlineWidthPx(sectionWas);"),
       ("Na__DrawView__SectionAdapter__SuspendLiveTool();\r\n                // THE DOORS", "Na__DrawView__SectionAdapter__SuspendLiveTool();\r\n                if (wantSection) sectionWas = Na__DrawView__SectionAdapter__GetOutlineWidthPx();\r\n                // THE DOORS") ], None, 1),
    ("doors never put back",
     "Na__PlDoors__Restore(doorsPosed);", "void doorsPosed;", 1),
    ("context by exact key only",
     "Na__LeSnap__ContextKeys().forEach(", "Na__LeSnap__CONTEXT_CATEGORIES.forEach(", 1),
    ("3D sections not saved",
     "sections   : Na__DrawView__SectionAdapter__Serialize(),", "sections   : null,", 1),
    ("unloaded design phase drawn as the live model",
     "if (modelSourceId && !phase && !Na__PhaseLib__IsLive(modelSourceId)) return null;\r\n            const wasSuspended", "const wasSuspended", 1),
    ("lighting not put back after a 2D render",
     "if (lightingWas) Na__SceneLighting__Apply(lightingWas, { requestRender : false });   // <-- The light the viewport had before this picture", "void lightingWas;", 1),
    ("Model Layers hide by the silent context setter dropped",
     "hidden.forEach((key) => Na__ModelToggle__SetCategoryVisibleByKey(key, false));", "hidden.forEach((key) => void key);", 1),
]

os.makedirs(OUT, exist_ok=True)
src = open(CAND, "rb").read().decode("utf-8")
caught = 0
for i, (label, old, new, n) in enumerate(MUTANTS, 1):
    pairs = old if isinstance(old, list) else [ (old, new) ]
    text = src
    for a, b in pairs:
        assert text.count(a) == n, (label, text.count(a))
        text = text.replace(a, b)
    path = os.path.join(OUT, "mutant_%02d.js" % i)
    with open(path, "wb") as f:
        f.write(text.encode("utf-8"))
    env = dict(os.environ, W215_NEWFILE=path)
    r = subprocess.run(["node", "--import", "./harness/register.mjs", "w2_15_unit.mjs"], cwd=HERE, env=env, capture_output=True, text=True)
    fails = [l.strip() for l in r.stdout.splitlines() if l.strip().startswith("FAIL")]
    ok = r.returncode != 0 and len(fails) > 0
    caught += ok
    print(("CAUGHT " if ok else "MISSED ") + "%02d %s - %d failing checks%s" % (i, label, len(fails), (": " + fails[0][:110]) if fails else ""))
print("%d/%d planted faults caught" % (caught, len(MUTANTS)))
