// Na__ImageCanvas__RenderBaseImage
// Sizes the three stacked canvases (base / depth-overlay / measurement) to the
// loaded image's pixel dimensions, then draws the image onto the base canvas.
//
// All canvases share the same logical pixel size as the source image so we can
// work in image-space coordinates throughout the app. CSS handles fitting the
// stack into the visible stage region.

export function Na__ImageCanvas__RenderBaseImage(canvases, sourceImageBitmap) {
    const { base, depth, measurement } = canvases;
    const w = sourceImageBitmap.width;
    const h = sourceImageBitmap.height;

    for (const canvas of [base, depth, measurement]) {
        canvas.width  = w;
        canvas.height = h;
        canvas.style.width  = '';
        canvas.style.height = '';
    }

    const ctx = base.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(sourceImageBitmap, 0, 0, w, h);

    return { width: w, height: h };
}

export function Na__ImageCanvas__ClearAll(canvases) {
    const { base, depth, measurement } = canvases;
    for (const canvas of [base, depth, measurement]) {
        if (canvas.width === 0) continue;
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    }
}
