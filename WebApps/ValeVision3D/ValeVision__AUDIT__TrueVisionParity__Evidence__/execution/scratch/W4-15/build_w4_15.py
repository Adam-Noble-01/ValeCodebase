# W4-15 - Statement Writer stylesheets (inert, verbatim).
# Builds the two ValeVision copies from TrueVision's bytes at the pin, proves that
# reversing the header seams gives TrueVision's bytes exactly, and stages them
# under held/ (OC-07 form). --land writes the staged bytes into the live tree
# (only for the package that lands their home - W4-12 - or the orchestrator).
#
#   python build_w4_15.py --build     build + verify + write held/ copies
#   python build_w4_15.py --verify    verify held/ copies against TV at the pin
#   python build_w4_15.py --land      copy held/ -> live (refuses if a live file has other bytes)
#   python build_w4_15.py --status    print live / held state
import subprocess, hashlib, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN = "b2aa9151"
VV_ROOT = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
REL_DIR = "02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/08__Style__Stylesheets"
TV_DIR = "na-apps/30__TrueVision__CoreAppCode/" + REL_DIR
CHROME = "Na__LayoutEditor__Styles__Statement__.css"
DOC = "Na__LayoutEditor__Styles__Statement__Document__.css"

TV_BANNER = {
    CHROME: b"/* REGION  |  TrueVision3D - Layout Editor Styles (statement writer)  */\n",
    DOC:    b"/* REGION  |  TrueVision3D - Layout Editor Styles (statement document)*/\n",
}

TV_CHROME_NOTE = (
    b" * PORT NOTE:\n"
    b" * - Ported from : n/a (TrueVision3D first, 20-Sep-2026)\n"
    b" * - Back-port   : offer to ValeVision3D with the statement tab.\n"
    b" */\n"
)

VV_CHROME_NOTE = (
    " * PORT NOTE:\n"
    " * - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/08__Style__Stylesheets/Na__LayoutEditor__Styles__Statement__.css\n"
    " * - Source version: none of its own - the sheet carries no version or log; taken as TrueVision3D\n"
    " *                   left it at v2.169.0 (29-Sep-2026: a reader keeps the statement picker), on the\n"
    " *                   sheet v2.95.0 created (20-Sep-2026, commit 62dade1c) and v2.97.0, v2.157.0,\n"
    " *                   v2.162.0, v2.165.0 and v2.167.0 changed (commits 6076ec10, f0eb56e3, 55014c6a,\n"
    " *                   cbb05234); unchanged to the pin (read at b2aa9151, blob 5d161275)\n"
    " * - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W4-15}} - landed inert: linked only by the\n"
    " *                   Statement Page when the tab first mounts (W4-12; TrueVision's Page :827-828), as\n"
    " *                   in TrueVision, so no loader-list or CSS-index entry. The Statement Writer stays\n"
    " *                   switched off (LayoutEditor__Statement__Enabled = false, DR-10). Every release\n"
    " *                   named above is not yet confirmed by Adam in TrueVision (DR-01 (c)).\n"
    " * - Parity        : verbatim (every rule and comment is TrueVision's; the banner and this note\n"
    " *                   are the only differences)\n"
    " * - Divergences   :\n"
    " *   - Banner reads ValeVision3D.\n"
    " *   - TrueVision's own PORT NOTE (TrueVision first; back-port offered to ValeVision3D with the\n"
    " *     statement tab) is replaced by this one.\n"
    " * - Legacy        : the sheet has no module version and no DEVELOPMENT LOG in TrueVision, so the\n"
    " *                   Source version line names the releases that made it (R6 OC-07 form).\n"
    " * - Back-port     : none.\n"
    " */\n"
).encode("utf-8")

TV_DOC_TAIL = (
    b" *   it stands at publishing, over the app's own reset and fonts - it was drawn\n"
    b" *   on them, so it is only right on top of them (v2.170.0).\n"
    b" */\n"
)

VV_DOC_NOTE = (
    " *\n"
    " * PORT NOTE:\n"
    " * - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/08__Style__Stylesheets/Na__LayoutEditor__Styles__Statement__Document__.css\n"
    " * - Source version: none of its own - the sheet carries no version or log (the 2.1.1 above is the\n"
    " *                   Typora theme's); taken as TrueVision3D left it at v2.170.0 (29-Sep-2026: the\n"
    " *                   published page writes this sheet into itself), on the sheet v2.95.0 created\n"
    " *                   (20-Sep-2026, commit 62dade1c) and v2.99.0, v2.162.0, v2.165.0, v2.167.0 and\n"
    " *                   v2.168.0 changed (commits 6076ec10, 55014c6a, cbb05234, 089a02df); unchanged to\n"
    " *                   the pin (read at b2aa9151, blob dd1fbc52)\n"
    " * - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W4-15}} - landed inert: linked only by the\n"
    " *                   Statement Page when the tab first mounts and read by the publisher (W4-12;\n"
    " *                   TrueVision's Page :827-828, Publish :130), as in TrueVision, so no loader-list\n"
    " *                   or CSS-index entry. The Statement Writer stays switched off\n"
    " *                   (LayoutEditor__Statement__Enabled = false, DR-10). Every release named above is\n"
    " *                   not yet confirmed by Adam in TrueVision (DR-01 (c)).\n"
    " * - Parity        : verbatim (every rule and comment is TrueVision's; the banner and this note\n"
    " *                   are the only differences). The house style is the Noble Architecture Typora\n"
    " *                   theme's, kept as it is (olive #555041); a Vale token layer only if Adam asks\n"
    " *                   (DR-43). The project hub section's rules (.na-le-stmt-std-tvh) style a section\n"
    " *                   this app never renders (DR-43: excluded from DEFINITIONS by config).\n"
    " * - Divergences   :\n"
    " *   - Banner reads ValeVision3D.\n"
    " * - Legacy        : the sheet has no module version and no DEVELOPMENT LOG in TrueVision, so the\n"
    " *                   Source version line names the releases that made it (R6 OC-07 form).\n"
    " * - Back-port     : none.\n"
    " */\n"
).encode("utf-8")


def vv_banner(name):
    return TV_BANNER[name].replace(b"TrueVision3D - ", b"ValeVision3D - ", 1)


def tv_bytes(name):
    return subprocess.run(["git", "-C", REPO, "show", PIN + ":" + TV_DIR + "/" + name],
                          capture_output=True, check=True).stdout


def once(data, old, new, what):
    n = data.count(old)
    if n != 1:
        raise SystemExit("ABORT: anchor %s found %d times" % (what, n))
    return data.replace(old, new, 1)


def build(name, tv):
    if b"\r\n" in tv:
        raise SystemExit("ABORT: TV text is not LF")
    out = once(tv, TV_BANNER[name], vv_banner(name), name + " banner")
    if name == CHROME:
        out = once(out, TV_CHROME_NOTE, VV_CHROME_NOTE, "chrome PORT NOTE")
    else:
        out = once(out, TV_DOC_TAIL, TV_DOC_TAIL[:-len(b" */\n")] + VV_DOC_NOTE, "document header tail")
    return out


def reverse(name, vv):
    out = once(vv, vv_banner(name), TV_BANNER[name], name + " banner (reverse)")
    if name == CHROME:
        out = once(out, VV_CHROME_NOTE, TV_CHROME_NOTE, "chrome PORT NOTE (reverse)")
    else:
        out = once(out, VV_DOC_NOTE, b" */\n", "document PORT NOTE (reverse)")
    return out


def header_end(data):
    # first line index (1-based) after the header comment block closes
    lines = data.split(b"\n")
    for i, l in enumerate(lines[3:], 4):
        if l.strip() == b"*/":
            return i
    return None


def sha(b):
    return hashlib.sha256(b).hexdigest()


def held_path(name):
    return os.path.join(HERE, "held", *REL_DIR.split("/"), name)


def live_path(name):
    return os.path.join(VV_ROOT, *REL_DIR.split("/"), name)


def verify_one(name, vv, tv):
    ok = True
    if reverse(name, vv) != tv:
        print("FAIL", name, "reversing the seams does not give TV's bytes"); ok = False
    # Everything after the header block byte-identical to TV
    hv, ht = header_end(vv), header_end(tv)
    body_v = b"\n".join(vv.split(b"\n")[hv:])
    body_t = b"\n".join(tv.split(b"\n")[ht:])
    if body_v != body_t:
        print("FAIL", name, "body after the header differs from TV"); ok = False
    if b"\r" in vv:
        print("FAIL", name, "CR present"); ok = False
    if b"TRUEVISION3D" in vv or b"REGION  |  TrueVision3D" in vv:
        print("FAIL", name, "TrueVision banner token left"); ok = False
    if vv.count(b"{{VVREL:W4-15}}") != 1:
        print("FAIL", name, "placeholder count", vv.count(b"{{VVREL:W4-15}}")); ok = False
    print(("OK  " if ok else "BAD ") + name, "tv", len(tv), "B", tv.count(b"\n"), "lines sha256", sha(tv)[:8],
          "| vv", len(vv), "B", vv.count(b"\n"), "lines sha256", sha(vv)[:8],
          "| header ends tv:%d vv:%d | body %d lines identical" % (ht, hv, body_t.count(b"\n")))
    return ok


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "--status"
    ok = True
    for name in (CHROME, DOC):
        tv = tv_bytes(name)
        if mode == "--build":
            vv = build(name, tv)
            ok &= verify_one(name, vv, tv)
            if ok:
                os.makedirs(os.path.dirname(held_path(name)), exist_ok=True)
                open(held_path(name), "wb").write(vv)
        elif mode == "--verify":
            vv = open(held_path(name), "rb").read()
            ok &= verify_one(name, vv, tv)
            ok &= (vv == build(name, tv)) or (print("FAIL", name, "held != fresh build") or False)
        elif mode == "--land":
            vv = open(held_path(name), "rb").read()
            if not verify_one(name, vv, tv):
                raise SystemExit("ABORT: held copy does not verify")
            lp = live_path(name)
            if os.path.exists(lp) and open(lp, "rb").read() != vv:
                raise SystemExit("ABORT: live file exists with other bytes: " + lp)
            os.makedirs(os.path.dirname(lp), exist_ok=True)
            open(lp, "wb").write(vv)
            print("LANDED", lp, sha(vv)[:8])
        else:
            hp, lp = held_path(name), live_path(name)
            print(name, "| held:", sha(open(hp, "rb").read())[:8] if os.path.exists(hp) else "absent",
                  "| live:", sha(open(lp, "rb").read())[:8] if os.path.exists(lp) else "absent")
    if not ok:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
