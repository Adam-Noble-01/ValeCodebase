"""Make scratch copies of TrueVision's Na__Test__SheetPagingWalkExit__ test (read at pin b2aa9151).

Scratch helper for W1-04. The test locates the modules it loads from its own folder
(SCRIPT_DIR/../02__Src__AppModules); a scratch copy needs that one line pointed at
ValeVision's live 02__Src__AppModules. Two copies are written:

  1. walkexit__full.test.mjs        - TV's test with ONLY the SRC line changed.
  2. walkexit__transitions.test.mjs - the same, with the PAGING section (key map + PC
     controls, which W1-36 ports) skipped, so the Transitions and render-hold sections
     run on their own. The loader, the stubs and the checks are TV's text unchanged.

Nothing under the ValeVision app root is written.
"""
import subprocess

PIN = "b2aa9151"
TV_REL = "na-apps/30__TrueVision__CoreAppCode/80__Testing__PrototypeEnvironment/Na__Test__SheetPagingWalkExit__.test.mjs"
NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
OUT = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-04"
VV_SRC = "D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules"

src = subprocess.run(["git", "-C", NAWEB, "show", PIN + ":" + TV_REL], capture_output=True, check=True).stdout.decode("utf-8")

old_src_line = "const SRC        = resolve(SCRIPT_DIR, '..', '02__Src__AppModules');"
assert src.count(old_src_line) == 1, "SRC line not found exactly once"
full = src.replace(old_src_line, "const SRC        = '" + VV_SRC + "';   // <-- scratch copy: ValeVision's live tree")

with open(OUT + r"\walkexit__full.test.mjs", "w", encoding="utf-8", newline="\n") as fh:
    fh.write(full)

# Transitions-only copy: skip the paging loads and checks (W1-36's half).
start_load = "    const SHIPPED_KEY_MAP = JSON.parse("
end_load = "    globalThis.__Stage = STAGE;\n"
a = full.index(start_load)
b = full.index(end_load) + len(end_load)
trans = full[:a] + "    // (scratch: key map and PC controls not loaded - W1-36 ports them)\n" + full[b:]

start_checks = "    // PAGING\n"
end_checks = "    check('detached with the drawing tab, it hears nothing', listeners.some((l) => l.type === 'keydown'), false);\n"
c = trans.index(start_checks)
d = trans.index(end_checks) + len(end_checks)
trans = trans[:c] + "    // (scratch: PAGING checks skipped - W1-36 ports the PC controls)\n" + trans[d:]

with open(OUT + r"\walkexit__transitions.test.mjs", "w", encoding="utf-8", newline="\n") as fh:
    fh.write(trans)

print("written: walkexit__full.test.mjs, walkexit__transitions.test.mjs")
