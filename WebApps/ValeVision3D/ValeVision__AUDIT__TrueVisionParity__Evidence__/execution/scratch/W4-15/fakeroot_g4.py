# Runs the G4 verifiers on the held stylesheets inside a throwaway app root
# (scratch/W4-15/fakeroot), so the live tree is never touched. Three cases:
#   A  the sheets alone (what landing them now would mean)
#   B  plus a stand-in Statement Page carrying TrueVision's own link loop (Page :827-835)
#   C  plus a stand-in module with one literal new URL('...css', import.meta.url) per sheet
import os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
FAKE = os.path.join(HERE, "fakeroot")
REL = "02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/08__Style__Stylesheets"
NAMES = ["Na__LayoutEditor__Styles__Statement__.css", "Na__LayoutEditor__Styles__Statement__Document__.css"]
PAGE_DIR = os.path.join(FAKE, *"02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/03__Ui__Page".split("/"))

TV_LOOP = """        for (const sheet of [ '../08__Style__Stylesheets/Na__LayoutEditor__Styles__Statement__.css',
                              '../08__Style__Stylesheets/Na__LayoutEditor__Styles__Statement__Document__.css' ]) {
            const href = new URL(sheet, import.meta.url).href;
        }
"""
LITERAL = """        const a = new URL('../08__Style__Stylesheets/Na__LayoutEditor__Styles__Statement__.css', import.meta.url).href;
        const b = new URL('../08__Style__Stylesheets/Na__LayoutEditor__Styles__Statement__Document__.css', import.meta.url).href;
"""


def reset():
    if os.path.isdir(FAKE):
        shutil.rmtree(FAKE)
    os.makedirs(os.path.join(FAKE, *REL.split("/")))
    shutil.copy(os.path.join(VV, "ValeVision__NOTES__FolderNumberRegistry__.md"), FAKE)
    for n in NAMES:
        shutil.copy(os.path.join(HERE, "held", *REL.split("/"), n), os.path.join(FAKE, *REL.split("/"), n))


def run(label, extra_page):
    reset()
    if extra_page is not None:
        os.makedirs(PAGE_DIR, exist_ok=True)
        open(os.path.join(PAGE_DIR, "Stand__In__.js"), "w", newline="\n").write(extra_page)
    files = [REL + "/" + n for n in NAMES]
    for script in ("Na__Verify__ParityNaming__.mjs", "Na__Verify__PortNotes__.mjs"):
        cmd = ["node", os.path.join(VV, "80__Testing__PrototypeEnvironment", script), "--root", FAKE, "--files"] + files
        p = subprocess.run(cmd, capture_output=True, text=True)
        print("=== case", label, script, "exit", p.returncode)
        print(p.stdout.strip())
        if p.stderr.strip():
            print("STDERR", p.stderr.strip())


run("A (sheets alone)", None)
run("B (TV's Page link loop)", TV_LOOP)
run("C (literal new URL per sheet)", LITERAL)
shutil.rmtree(FAKE)
