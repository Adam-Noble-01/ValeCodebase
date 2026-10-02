"""Build scratch/W1-28/testroot: the staged test files plus the live modules they read, so both ported tests
can run against the staged Paper CSS before anything live is written."""
import os
import shutil

VV = r"D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D"
SCRATCH = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(SCRATCH, "testroot")
STAGED = os.path.join(SCRATCH, "staged")

LIVE = [
    "02__Src__AppModules/51__System__LayoutEditor/15__Core__Markup/Na__LayoutEditor__PaintOrder__.js",
    "02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js",
    "02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__VectorQuality__.js",
]
FROM_STAGED = [
    "02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css",
    "80__Testing__PrototypeEnvironment/Na__Test__LayerStack__.test.mjs",
    "80__Testing__PrototypeEnvironment/Na__Test__VectorQuality__.test.mjs",
]

if os.path.exists(ROOT):
    shutil.rmtree(ROOT)
for rel in LIVE:
    dst = os.path.join(ROOT, rel.replace("/", os.sep))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(os.path.join(VV, rel.replace("/", os.sep)), dst)
for rel in FROM_STAGED:
    dst = os.path.join(ROOT, rel.replace("/", os.sep))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(os.path.join(STAGED, rel.replace("/", os.sep)), dst)
print("testroot ready:", ROOT)
