# W0-04 acceptance proofs on a scratch copy of the app (session scratchpad, outside the repo).
# Every planted change is made in the copy, the verifier run, and the file restored byte for byte.
# A snapshot of the whole copy before and after proves the verifiers wrote nothing.
# Outputs: scratch/W0-04/proofs/*.txt and proofs/summary.json. Reads the live tree and TrueVision (at the pin) only.
import hashlib, json, os, re, shutil, subprocess, sys, time

VCB = r"D:\10_CoreLib__ValeCodebase"
VV = os.path.join(VCB, "WebApps", "ValeVision3D")
NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
TV = os.path.join(NAWEB, "na-apps", "30__TrueVision__CoreAppCode")
PIN = "b2aa9151"
HEAD = "7b4e593a"
SCRATCHPAD = r"C:\Users\adamw\AppData\Local\Temp\claude\C--Users-adamw-AppData-Roaming-SketchUp-SketchUp-2026-SketchUp-Plugins\a1674149-918e-4d62-a79a-e7961f105155\scratchpad"
TREE = os.path.join(SCRATCHPAD, "w0_04_tree")
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "proofs")
T80 = "80__Testing__PrototypeEnvironment"
LE = "02__Src__AppModules/51__System__LayoutEditor"

IGNORE = shutil.ignore_patterns("node_modules", ".wrangler", ".git", "__pycache__", ".claude")


def p(rel):
    return os.path.join(TREE, rel.replace("/", os.sep))


def build_tree():
    if os.path.exists(TREE):
        shutil.rmtree(TREE)
    os.makedirs(TREE)
    for d in ["02__Src__AppModules", "03__Style__AppStylesheets", "04__Lib__ThirdParty__VersionLocked"]:
        shutil.copytree(os.path.join(VV, d), p(d), ignore=IGNORE)
    for f in ["index.html", "install-guide.html", "ValeVision__NOTES__FolderNumberRegistry__.md", "ValeVision__DEVLOG__.md"]:
        shutil.copyfile(os.path.join(VV, f), p(f))
    os.makedirs(p(T80))
    for f in os.listdir(os.path.join(VV, T80)):
        if f.startswith("Na__Verify__") or f == "Na__Test__LoaderStylesheets__.test.mjs":
            shutil.copyfile(os.path.join(VV, T80, f), p(T80 + "/" + f))
    pre = os.path.join(HERE, "preimage")
    shutil.copyfile(os.path.join(pre, "Na__Verify__ModuleGraph__.mjs"), p(T80 + "/Na__Verify__ModuleGraph__OLD__.mjs"))
    shutil.copyfile(os.path.join(pre, "Na__Verify__Exports__.mjs"), p(T80 + "/Na__Verify__Exports__OLD__.mjs"))


def snapshot():
    snap = {}
    for root, dirs, files in os.walk(TREE):
        for f in files:
            full = os.path.join(root, f)
            snap[os.path.relpath(full, TREE)] = hashlib.sha1(open(full, "rb").read()).hexdigest()
    return snap


def node(args, label):
    t0 = time.time()
    r = subprocess.run(["node"] + args, capture_output=True, cwd=TREE)
    dt = time.time() - t0
    text = r.stdout.decode("utf-8", "replace") + r.stderr.decode("utf-8", "replace")
    with open(os.path.join(OUT, label + ".txt"), "w", encoding="utf-8") as f:
        f.write("$ node " + " ".join(args) + "\n(exit " + str(r.returncode) + ", " + ("%.2f" % dt) + " s)\n\n" + text)
    return r.returncode, text, dt


class Planted:
    """Change a file in the copy for one run, then put its exact bytes back (or remove it if new)."""
    def __init__(self, rel, new_bytes):
        self.path = p(rel)
        self.new = new_bytes

    def __enter__(self):
        self.old = open(self.path, "rb").read() if os.path.exists(self.path) else None
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        open(self.path, "wb").write(self.new)
        return self

    def __exit__(self, *a):
        if self.old is None:
            os.remove(self.path)
        else:
            open(self.path, "wb").write(self.old)


def git_show(repo, spec):
    return subprocess.run(["git", "-C", repo, "show", spec], capture_output=True, check=True).stdout


def fails(text):
    return re.findall(r"^\s*FAIL\s+(\S+?)(?::(\d+))?\s+(\S+)\s+\(", text, re.M)


def main():
    os.makedirs(OUT, exist_ok=True)
    build_tree()
    before = snapshot()
    results = {}

    # S0 - the copy as it stands: every verifier runs, and how long it takes
    for label, args in [
        ("S0_ParityNaming", [T80 + "/Na__Verify__ParityNaming__.mjs"]),
        ("S0_PortNotes", [T80 + "/Na__Verify__PortNotes__.mjs", "--fails-only"]),
        ("S0_UiParity", [T80 + "/Na__Verify__UiParity__.mjs", TV, "--pin", PIN]),
        ("S0_ModuleGraph", [T80 + "/Na__Verify__ModuleGraph__.mjs"]),
        ("S0_Exports", [T80 + "/Na__Verify__Exports__.mjs"]),
        ("S0_LoaderStylesheets", [T80 + "/Na__Test__LoaderStylesheets__.test.mjs"]),
    ]:
        code, text, dt = node(args, label)
        results[label] = {"exit": code, "seconds": round(dt, 2)}

    # S1 - ParityNaming: planted literal, window read, NaProjectPortal and an unregistered folder FAIL;
    #      the VaApps and font URLs, the AutoSave PORT NOTE and the named TrueVisionHub file PASS.
    planted_js = (
        "// =============================================================================\n"
        "// VALEVISION3D - PROOF - PLANTED IDENTITY HITS\n"
        "// =============================================================================\n"
        "//\n"
        "// FILE       : Na__LayoutEditor__Planted__.js\n"
        "//\n"
        "// =============================================================================\n"
        "const Na__Planted__A = 'TrueVision__Vegetation';\n"
        "const Na__Planted__B = window.TrueVision__Pwa__ProjectContext;\n"
        "const Na__Planted__C = 'NaProjectPortal/2026/RB05/project.json';\n"
        "const Na__Planted__D = 'https://cdn.noble-architecture.com/VaApps/Projects';\n"
        "const Na__Planted__E = 'https://www.noble-architecture.com/assets/AD04_-_LIBR_-_Common_-_Front-Files/AD04_01_-_Standard-Font_-_Open-Sans-Regular.ttf';\n"
        "export { Na__Planted__A, Na__Planted__B, Na__Planted__C, Na__Planted__D, Na__Planted__E };\n"
    ).encode()
    hub_rel = LE + "/52__Feature__StatementWriter/09__Standard__Sections/Na__LayoutEditor__Statement__Standard__TrueVisionHub__.js"
    hub = git_show(NAWEB, PIN + ":na-apps/30__TrueVision__CoreAppCode/02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/09__Standard__Sections/Na__LayoutEditor__Statement__Standard__TrueVisionHub__.js")
    planted_dir = p("02__Src__AppModules/08__System__PlantedForProof")
    os.makedirs(planted_dir)
    try:
        with Planted(LE + "/07__Core__SheetData/Na__LayoutEditor__Planted__.js", planted_js), Planted(hub_rel, hub):
            code, text, dt = node([T80 + "/Na__Verify__ParityNaming__.mjs"], "S1_ParityNaming_planted")
    finally:
        os.rmdir(planted_dir)
        for d in [LE + "/52__Feature__StatementWriter/09__Standard__Sections", LE + "/52__Feature__StatementWriter"]:
            if os.path.isdir(p(d)) and not os.listdir(p(d)):
                os.rmdir(p(d))
    got = set((f[0].split("/")[-1], f[2]) for f in fails(text))
    want = {("Na__LayoutEditor__Planted__.js", "identity-literal"), ("Na__LayoutEditor__Planted__.js", "window-global"),
            ("Na__LayoutEditor__Planted__.js", "na-marker"), ("08__System__PlantedForProof", "folder-unregistered")}
    planted_lines = [l for l in text.splitlines() if "Na__LayoutEditor__Planted__.js" in l]
    results["S1_ParityNaming_planted"] = {
        "exit": code, "fails": sorted("%s %s" % g for g in got),
        "planted_four_fail": want <= got,
        "nothing_else_fails": got <= want,
        "vaapps_and_font_urls_pass": not any(":11 " in l or ":12 " in l for l in planted_lines),
        "hub_and_autosave_pass": "TrueVisionHub" not in "".join(f[0] for f in fails(text)) and "AutoSave" not in "".join(f[0] for f in fails(text)),
    }

    # S2 - the C13 SpecPdf case: HEAD's SpecPdf (window.TrueVision__Pwa__ProjectContext at :147, '[TrueVision3D' at :431)
    #      with a baseline holding only the :147 read -> WARN for it, FAIL for :431; one changed byte -> both FAIL.
    spec_rel = LE + "/50__Feature__Specification/Na__LayoutEditor__SpecPdf__.js"
    head_spec = git_show(VCB, HEAD + ":WebApps/ValeVision3D/" + spec_rel)
    baseline_path = p(T80 + "/Na__Verify__ParityBaseline__.json")
    had_baseline = open(baseline_path, "rb").read() if os.path.exists(baseline_path) else None
    with Planted(spec_rel, head_spec):
        code, text, dt = node([T80 + "/Na__Verify__ParityNaming__.mjs", "--print-baseline"], "S2_print_baseline")
        doc = json.loads(text)
        entry = [e for e in doc["parityNaming"]["files"] if e["file"].endswith("Na__LayoutEditor__SpecPdf__.js")][0]
        entry["findings"] = [f for f in entry["findings"] if f["code"] == "window-global"]
        doc["parityNaming"]["files"] = [entry]
        with Planted(T80 + "/Na__Verify__ParityBaseline__.json", (json.dumps(doc, indent=1) + "\n").encode()):
            code1, text1, _ = node([T80 + "/Na__Verify__ParityNaming__.mjs"], "S2_SpecPdf_held")
            with Planted(spec_rel, head_spec + b"\n// a package writes the file\n"):
                code2, text2, _ = node([T80 + "/Na__Verify__ParityNaming__.mjs"], "S2_SpecPdf_rewritten")
    results["S2_SpecPdf_baseline"] = {
        "held_run_exit": code1,
        "line147_warn_when_held": bool(re.search(r"WARN\s+\S*SpecPdf__\.js:147\s+window-global", text1)),
        "line431_fails_not_held": bool(re.search(r"FAIL\s+\S*SpecPdf__\.js:431\s+console-prefix", text1)),
        "rewritten_run_exit": code2,
        "line147_fails_once_rewritten": bool(re.search(r"FAIL\s+\S*SpecPdf__\.js:147\s+window-global", text2)),
    }

    # S3 - PortNotes reports the History and Toolbar log faults as they stood (W0-06's pre-images)
    w06 = os.path.join(os.path.dirname(HERE), "W0-06", "preimage")
    hist_rel = LE + "/07__Core__SheetData/Na__LayoutEditor__History__.js"
    tool_rel = LE + "/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js"
    hist = open(os.path.join(w06, "02__Src__AppModules__SLASH__51__System__LayoutEditor__SLASH__07__Core__SheetData__SLASH__Na__LayoutEditor__History__.js"), "rb").read()
    tool = open(os.path.join(w06, "02__Src__AppModules__SLASH__51__System__LayoutEditor__SLASH__40__Ui__Panels__SLASH__Na__LayoutEditor__Toolbar__.js"), "rb").read()
    with Planted(hist_rel, hist), Planted(tool_rel, tool):
        code, text, dt = node([T80 + "/Na__Verify__PortNotes__.mjs", "--files", hist_rel, tool_rel], "S3_PortNotes_History_Toolbar_preimages")
    results["S3_History_Toolbar_faults"] = {
        "exit": code,
        "history_faults": re.findall(r"FAIL\s+:\d+\s+(log-\w+)\s+([^\n]*)", text.split("Toolbar__.js")[0]),
        "toolbar_faults": re.findall(r"FAIL\s+:\d+\s+(log-\w+)\s+([^\n]*)", text.split("Toolbar__.js", 1)[1]) if "Toolbar__.js" in text else [],
    }

    # S4 - PortNotes catches a planted malformed placeholder and a planted out-of-order entry in a real file
    live_hist = open(p(hist_rel), "rb").read().decode("utf-8")
    first_entry = re.search(r"^// (\d\d-[A-Z][a-z]{2}-\d{4}) - Version (\d+\.\d+\.\d+)[^\r\n]*", live_hist, re.M)
    token_x = "{" + "{VVREL:x}" + "}"
    bad_token = live_hist.replace(first_entry.group(0), first_entry.group(0) + " " + token_x, 1)
    nl = "\r\n" if "\r\n" in live_hist else "\n"
    out_of_order = live_hist.replace(first_entry.group(0), "// 01-Jan-2026 - Version 0.0.1" + nl + "// - Planted for the W0-04 proof." + nl + "//" + nl + first_entry.group(0), 1)
    with Planted(hist_rel, bad_token.encode("utf-8")):
        c1, t1, _ = node([T80 + "/Na__Verify__PortNotes__.mjs", "--files", hist_rel], "S4_PortNotes_planted_token")
    with Planted(hist_rel, out_of_order.encode("utf-8")):
        c2, t2, _ = node([T80 + "/Na__Verify__PortNotes__.mjs", "--files", hist_rel], "S4_PortNotes_planted_order")
    results["S4_planted"] = {"token_exit": c1, "token_caught": "placeholder-bad" in t1,
                             "order_exit": c2, "order_caught": "log-order" in t2}

    # S6 - ModuleGraph with TrueVision's scene-editor string case in the graph: 1.0.0 fails, 1.1.0 passes
    se_rel = "02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__SceneEditor.js"
    se = open(p(se_rel), "rb").read()
    eol = b"\r\n" if b"\r\n" in se else b"\n"
    case = eol.join([
        b"",
        b"    // W0-04 PROOF ONLY (scratch copy): TrueVision's scene-editor string case, its lines verbatim",
        b"    // (TV 21/Na__PresentationMode__DevMenu__SceneEditor.js :1790-1794 at b2aa9151).",
        b"    function Na__PmDev__PlantedStringCase(groupName, walkable) {",
        b"        const hint = walkable > 0",
        b"            ? 'Download an image of each scene in \"' + groupName + '\", at the current Image Export settings'",
        b"            : 'No 3D scenes in \"' + groupName + '\" to export';",
        b"",
        b"        const cameraBtn = document.createElement('button');",
        b"        cameraBtn.title = hint;",
        b"        return cameraBtn;",
        b"    }",
        b""])
    with Planted(se_rel, se + case):
        c_old, t_old, _ = node([T80 + "/Na__Verify__ModuleGraph__OLD__.mjs"], "S6_ModuleGraph_1.0.0_with_string_case")
        c_new, t_new, d_new = node([T80 + "/Na__Verify__ModuleGraph__.mjs"], "S6_ModuleGraph_1.1.0_with_string_case")
    results["S6_ModuleGraph_string_case"] = {"old_exit": c_old, "old_fails_on_scene_editor": "SceneEditor" in t_old and c_old == 1,
                                             "new_exit": c_new, "new_seconds": round(d_new, 2),
                                             "new_modules": (re.search(r"app graph\s*:\s*(\d+) modules", t_new) or [None, None])[1]}

    # S7 - Exports facade check: a misspelt Na__LeMode__ name fails 1.1.0 (1.0.0 could not see it)
    loader_rel = LE + "/01__Core__Loader/Na__LayoutEditor__Loader__.js"
    loader = open(p(loader_rel), "rb").read()
    misspelt = loader.replace(b".Na__LeMode__Enter(", b".Na__LeMode__Entr(")
    with Planted(loader_rel, misspelt):
        c_new, t_new, d_new = node([T80 + "/Na__Verify__Exports__.mjs"], "S7_Exports_1.1.0_misspelt")
        c_old, t_old, _ = node([T80 + "/Na__Verify__Exports__OLD__.mjs"], "S7_Exports_1.0.0_misspelt")
    results["S7_Exports_facade"] = {"new_exit": c_new, "new_names_it": "Na__LeMode__Entr" in t_new, "new_seconds": round(d_new, 2),
                                    "old_exit": c_old, "old_blind": c_old == 0}

    # S8 - LoaderStylesheets: two entries swapped, and a sheet registered before its file lands, both fail
    text_loader = loader.decode("utf-8")
    lst = re.findall(r"new URL\('\.\./([^']+\.css)'", text_loader.split("Na__LeLoad__STYLESHEETS", 1)[1].split("];", 1)[0])
    swapped = text_loader.replace(lst[1], "\x00").replace(lst[2], lst[1]).replace("\x00", lst[2])
    early = text_loader.replace("new URL('../" + lst[0], "new URL('../26__System__DraftMode/Na__LayoutEditor__Styles__DraftMode__.css', import.meta.url).href,\n        new URL('../" + lst[0], 1)
    with Planted(loader_rel, swapped.encode("utf-8")):
        c1, t1, _ = node([T80 + "/Na__Test__LoaderStylesheets__.test.mjs"], "S8_LoaderStylesheets_swapped")
    with Planted(loader_rel, early.encode("utf-8")):
        c2, t2, _ = node([T80 + "/Na__Test__LoaderStylesheets__.test.mjs"], "S8_LoaderStylesheets_preregistered")
    results["S8_LoaderStylesheets"] = {"swapped_exit": c1, "preregistered_exit": c2}

    # S9 - UiParity blocking: --block all fails today (checks 2-4 await W1-33/W1-34/W1-38); 1,5,6 pass
    c1, t1, _ = node([T80 + "/Na__Verify__UiParity__.mjs", TV, "--pin", PIN, "--block", "all"], "S9_UiParity_block_all")
    c2, t2, _ = node([T80 + "/Na__Verify__UiParity__.mjs", TV, "--pin", PIN, "--block", "fold,order,motion"], "S9_UiParity_block_1_5_6")
    c3, t3, d3 = node([T80 + "/Na__Verify__UiParity__.mjs", TV, "--pin", PIN, "--self-test"], "S9_UiParity_self_test")
    results["S9_UiParity"] = {"block_all_exit": c1, "block_1_5_6_exit": c2, "self_test_exit": c3, "self_test_seconds": round(d3, 2)}

    # S10 - nothing was written by any verifier (every planted file was put back byte for byte)
    after = snapshot()
    changed = sorted(k for k in set(before) | set(after) if before.get(k) != after.get(k))
    results["S10_wrote_nothing"] = {"files_in_copy": len(before), "changed": changed}

    with open(os.path.join(OUT, "summary.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, indent=1)
    print(json.dumps(results, indent=1))


main()
