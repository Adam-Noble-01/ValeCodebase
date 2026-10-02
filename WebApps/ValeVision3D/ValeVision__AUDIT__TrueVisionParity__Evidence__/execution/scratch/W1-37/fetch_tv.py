"""Fetch the TrueVision files W1-37 reads, at the pin, as bytes (git show returns LF)."""
import hashlib
import os
import subprocess

NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
PIN = "b2aa9151"
APP = "na-apps/30__TrueVision__CoreAppCode/"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tv")

FILES = [
    "02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__.js",
    "02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__Manager__.js",
    "02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__Picker__.js",
    "02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__Config__.json",
    "02__Src__AppModules/54__Feature__ColourPalette/Na__ColourPalette__Styles__.css",
    "02__Src__AppModules/54__Feature__ColourPalette/README__ColourPalette__.md",
    "02__Src__AppModules/43__System__PlanAnnotations/Na__PlanAnnotations__Toolbar__.js",
    "03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css",
    "80__Testing__PrototypeEnvironment/Na__Test__ColourPalette__.test.mjs",
    "02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__PanelHost__.js",
]

os.makedirs(OUT, exist_ok=True)
for rel in FILES:
    blob = subprocess.run(
        ["git", "-C", NAWEB, "show", f"{PIN}:{APP}{rel}"],
        capture_output=True, check=True,
    ).stdout
    dest = os.path.join(OUT, rel.replace("/", os.sep))
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "wb") as f:
        f.write(blob)
    crlf = blob.count(b"\r\n")
    print(f"{hashlib.sha1(blob).hexdigest()[:8]}  {len(blob):6d} B  {blob.count(b'\n'):5d} lines  CRLF={crlf}  {rel}")
