"""overlay_old/: the pre-images of every file the package writes, at their app-relative paths, so the browser
harness can run the app as it was (old) against the landed live tree (new) after landing."""
import os
import shutil

SCRATCH = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(SCRATCH, "overlay_old")
LE = "02__Src__AppModules/51__System__LayoutEditor/"
FILES = {
    LE + "15__Core__Markup/Na__LayoutEditor__MarkupBridge__.js": "Na__LayoutEditor__MarkupBridge__.js",
    LE + "15__Core__Markup/Na__LayoutEditor__Groups__.js": "Na__LayoutEditor__Groups__.js",
    LE + "10__Core__SheetSurface/Na__LayoutEditor__SheetSurface__.js": "Na__LayoutEditor__SheetSurface__.js",
    LE + "10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css": "Na__LayoutEditor__Styles__Main__Paper__.css",
    LE + "60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js": "Na__LayoutEditor__PdfExporter__.js",
    LE + "57__Feature__ScrapbookParametric/Na__LayoutEditor__ScrapbookParametric__LinkNoodle__.js": "Na__LayoutEditor__ScrapbookParametric__LinkNoodle__.js",
}
if os.path.exists(OUT):
    shutil.rmtree(OUT)
for rel, name in FILES.items():
    dst = os.path.join(OUT, rel.replace("/", os.sep))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(os.path.join(SCRATCH, "vv_before", name), dst)
print("overlay_old ready:", len(FILES), "files")
