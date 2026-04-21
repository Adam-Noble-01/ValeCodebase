// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Ortho Warp And Export Engine
// -----------------------------------------------------------------------------
const PhotoMeasurePro__System__OrthoWarpAndExport__Engine = (function() {

    // FUNCTION | Get Plane Label For UI
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoWarpAndExport__GetPlaneLabel(planeCode) {
        if (planeCode === "XY") return "Facade (XY)";
        if (planeCode === "XZ") return "Floor (XZ)";
        return "Side (YZ)";
    }
    // ------------------------------------------------------------

    // FUNCTION | Export Current Image And Overlay As PNG
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoWarpAndExport__ExportPng(domRefs) {
        const sourceImage = domRefs.PhotoMeasurePro__OrthoWarpAndExport__BaseImageElement;
        const sourceSvg = domRefs.PhotoMeasurePro__OrthoWarpAndExport__OverlaySvgElement;
        if (!sourceImage || !sourceImage.src || !sourceSvg) return;

        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = sourceImage.naturalWidth || sourceImage.width;
        exportCanvas.height = sourceImage.naturalHeight || sourceImage.height;
        const canvasContext = exportCanvas.getContext("2d");
        if (!canvasContext) return;

        canvasContext.drawImage(sourceImage, 0, 0, exportCanvas.width, exportCanvas.height);

        const svgMarkup = new XMLSerializer().serializeToString(sourceSvg).replace(
            "<svg",
            "<svg width=\"" + exportCanvas.width + "\" height=\"" + exportCanvas.height + "\""
        );

        const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
        const blobUrl = URL.createObjectURL(svgBlob);
        const overlayImage = new Image();

        overlayImage.onload = function() {
            canvasContext.drawImage(overlayImage, 0, 0, exportCanvas.width, exportCanvas.height);
            URL.revokeObjectURL(blobUrl);

            const downloadLink = document.createElement("a");
            downloadLink.href = exportCanvas.toDataURL("image/png");
            downloadLink.download = "PhotoMeasurePro__Export.png";
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        };
        overlayImage.src = blobUrl;
    }
    // ------------------------------------------------------------

    return {
        PhotoMeasurePro__OrthoWarpAndExport__GetPlaneLabel: PhotoMeasurePro__OrthoWarpAndExport__GetPlaneLabel,
        PhotoMeasurePro__OrthoWarpAndExport__ExportPng: PhotoMeasurePro__OrthoWarpAndExport__ExportPng
    };
})();

window.PhotoMeasurePro__System__OrthoWarpAndExport__Engine = PhotoMeasurePro__System__OrthoWarpAndExport__Engine;
// endregion ----------------------------------------------------
