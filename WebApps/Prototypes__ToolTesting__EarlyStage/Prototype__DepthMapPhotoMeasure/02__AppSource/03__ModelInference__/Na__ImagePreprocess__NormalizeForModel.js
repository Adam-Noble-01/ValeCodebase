// Na__ImagePreprocess__NormalizeForModel
// Generic image-to-tensor preprocessor driven by a model preprocessing config.
//
// Steps:
//   1. Resize (or letterbox-pad) the source image to the model's expected H x W.
//   2. Convert from RGBA bytes to RGB floats in [0, 1] (rescaleFactor).
//   3. Apply per-channel mean/std normalization.
//   4. Layout into NCHW Float32Array.
//
// Returns:
//   {
//     tensorData: Float32Array,            // NCHW float
//     tensorShape: [1, 3, H, W],
//     resize:     { srcWidth, srcHeight, dstWidth, dstHeight, scale, padX, padY, paddedSrcW, paddedSrcH }
//   }
// The resize block is needed at post-processing time to map depth-map pixels
// back to original image coordinates.

export function Na__ImagePreprocess__NormalizeForModel(sourceImageBitmap, modelConfig) {
    const { inputSize, preprocessing } = modelConfig;
    const { height: dstH, width: dstW } = inputSize;

    const resize = Na__ImagePreprocess__ComputeResizeBlock(
        sourceImageBitmap.width,
        sourceImageBitmap.height,
        dstW,
        dstH,
        preprocessing.padToSquare === true
    );

    const canvas = new OffscreenCanvas(dstW, dstH);
    const ctx    = canvas.getContext('2d', { willReadFrequently: true });

    if (preprocessing.padToSquare) {
        const fill = preprocessing.padFillRgb || [0, 0, 0];
        ctx.fillStyle = `rgb(${Math.round(fill[0]*255)}, ${Math.round(fill[1]*255)}, ${Math.round(fill[2]*255)})`;
        ctx.fillRect(0, 0, dstW, dstH);
        ctx.drawImage(
            sourceImageBitmap,
            0, 0, sourceImageBitmap.width, sourceImageBitmap.height,
            resize.padX, resize.padY, resize.paddedSrcW, resize.paddedSrcH
        );
    } else {
        ctx.drawImage(sourceImageBitmap, 0, 0, dstW, dstH);
    }

    const imageData  = ctx.getImageData(0, 0, dstW, dstH);
    const tensorData = Na__ImagePreprocess__ImageDataToNchw(imageData, preprocessing);

    return {
        tensorData,
        tensorShape: [1, 3, dstH, dstW],
        resize
    };
}

function Na__ImagePreprocess__ComputeResizeBlock(srcW, srcH, dstW, dstH, padToSquare) {
    if (!padToSquare) {
        return {
            srcWidth: srcW, srcHeight: srcH,
            dstWidth: dstW, dstHeight: dstH,
            scale:    Math.min(dstW / srcW, dstH / srcH),
            padX: 0, padY: 0,
            paddedSrcW: dstW, paddedSrcH: dstH
        };
    }
    const scale       = Math.min(dstW / srcW, dstH / srcH);
    const paddedSrcW  = Math.round(srcW * scale);
    const paddedSrcH  = Math.round(srcH * scale);
    const padX        = Math.floor((dstW - paddedSrcW) / 2);
    const padY        = Math.floor((dstH - paddedSrcH) / 2);
    return {
        srcWidth: srcW, srcHeight: srcH,
        dstWidth: dstW, dstHeight: dstH,
        scale,
        padX, padY,
        paddedSrcW, paddedSrcH
    };
}

function Na__ImagePreprocess__ImageDataToNchw(imageData, preprocessing) {
    const { width, height, data: rgba } = imageData;
    const totalPixels = width * height;

    const rescale = preprocessing.rescaleFactor || (1 / 255);
    const mean    = preprocessing.imageMean || [0, 0, 0];
    const std     = preprocessing.imageStd  || [1, 1, 1];

    const out = new Float32Array(3 * totalPixels);
    const planeR = 0;
    const planeG = totalPixels;
    const planeB = 2 * totalPixels;

    for (let i = 0, p = 0; i < rgba.length; i += 4, p++) {
        out[planeR + p] = (rgba[i    ] * rescale - mean[0]) / std[0];
        out[planeG + p] = (rgba[i + 1] * rescale - mean[1]) / std[1];
        out[planeB + p] = (rgba[i + 2] * rescale - mean[2]) / std[2];
    }
    return out;
}

// Inverse mapping helper used by depth-sampling code:
// converts a pixel (modelX, modelY) in the resized model output space back to
// the original image's (origX, origY).
export function Na__ImagePreprocess__ResizeBlock_InverseMap(resize, modelX, modelY) {
    const localX = modelX - resize.padX;
    const localY = modelY - resize.padY;
    return {
        x: localX / resize.scale,
        y: localY / resize.scale
    };
}

// Forward mapping: original image pixel to model-space pixel.
export function Na__ImagePreprocess__ResizeBlock_ForwardMap(resize, origX, origY) {
    return {
        x: resize.padX + origX * resize.scale,
        y: resize.padY + origY * resize.scale
    };
}
