// Na__DepthPro__InferAndPostprocess
// Runs Apple Depth Pro on a source ImageBitmap and returns a metric depth map
// in image-space coordinates, plus the model-estimated focal length in pixels
// (in the model's input frame, which we then scale back to original image px).

import { Na__OnnxRuntime__GetSession, Na__OnnxRuntime__GetOrt } from './Na__OnnxRuntime__SessionLoader.js';
import { Na__ImagePreprocess__NormalizeForModel }              from './Na__ImagePreprocess__NormalizeForModel.js';

const Na__DepthPro__ModelId = 'DepthPro';

export async function Na__DepthPro__InferAndPostprocess(sourceImageBitmap, modelConfig, inferenceConfig, onProgress) {
    const ort     = Na__OnnxRuntime__GetOrt();
    const session = await Na__OnnxRuntime__GetSession(Na__DepthPro__ModelId, modelConfig, inferenceConfig, onProgress);

    if (typeof onProgress === 'function') onProgress({ phase: 'preprocess', modelId: Na__DepthPro__ModelId, status: 'starting' });
    const { tensorData, tensorShape, resize } = Na__ImagePreprocess__NormalizeForModel(sourceImageBitmap, modelConfig);

    if (typeof onProgress === 'function') onProgress({ phase: 'inference', modelId: Na__DepthPro__ModelId, status: 'starting' });
    const inputTensor = new ort.Tensor('float32', tensorData, tensorShape);
    const feeds       = { [modelConfig.inputName]: inputTensor };
    const t0          = performance.now();
    const results     = await session.run(feeds);
    const inferMs     = performance.now() - t0;

    const depthOut       = results[modelConfig.outputs.depth];
    const focalOut       = results[modelConfig.outputs.focalLength];
    if (!depthOut)       throw new Error(`Depth output '${modelConfig.outputs.depth}' missing from DepthPro result.`);
    if (!focalOut)       console.warn('[Na__DepthPro] focal_length output missing; falling back to other intrinsics sources.');

    const [, modelDepthH, modelDepthW] = depthOut.dims;
    const modelDepthData               = depthOut.data;

    const depthMapInImageSpace = Na__DepthPro__ResampleDepthToImageSpace(
        modelDepthData, modelDepthW, modelDepthH,
        resize, sourceImageBitmap.width, sourceImageBitmap.height
    );

    const focalPxImageSpace = Na__DepthPro__ResolveFocalLengthInImagePixels(focalOut, resize);

    if (typeof onProgress === 'function') onProgress({ phase: 'inference', modelId: Na__DepthPro__ModelId, status: 'done', durationMs: inferMs });

    return {
        modelId:           Na__DepthPro__ModelId,
        depth:             depthMapInImageSpace.data,
        depthWidth:        depthMapInImageSpace.width,
        depthHeight:       depthMapInImageSpace.height,
        depthMin:          depthMapInImageSpace.min,
        depthMax:          depthMapInImageSpace.max,
        focalPxImageSpace,
        inferenceMs:       inferMs,
        unit:              modelConfig.outputDepthUnit
    };
}

function Na__DepthPro__ResampleDepthToImageSpace(modelDepthData, modelW, modelH, resize, origW, origH) {
    // Crop out the model-output region that corresponds to the un-padded image,
    // then resample (nearest neighbour) to the original image size.
    // resize tells us where in model-input space the original image was placed:
    //   model input was dstW x dstH, image placed at (padX,padY) sized paddedSrcW x paddedSrcH.
    // model OUTPUT is in (modelW, modelH) which usually equals (dstW, dstH) for DepthPro.
    const scaleX = modelW / resize.dstWidth;
    const scaleY = modelH / resize.dstHeight;
    const cropX0 = Math.round(resize.padX * scaleX);
    const cropY0 = Math.round(resize.padY * scaleY);
    const cropW  = Math.max(1, Math.round(resize.paddedSrcW * scaleX));
    const cropH  = Math.max(1, Math.round(resize.paddedSrcH * scaleY));

    const out = new Float32Array(origW * origH);
    let min   = Infinity;
    let max   = -Infinity;

    for (let y = 0; y < origH; y++) {
        const fy = (y / origH) * cropH + cropY0;
        const sy = Math.min(modelH - 1, Math.max(0, Math.floor(fy)));
        for (let x = 0; x < origW; x++) {
            const fx = (x / origW) * cropW + cropX0;
            const sx = Math.min(modelW - 1, Math.max(0, Math.floor(fx)));
            const v  = modelDepthData[sy * modelW + sx];
            out[y * origW + x] = v;
            if (v < min) min = v;
            if (v > max) max = v;
        }
    }
    return { data: out, width: origW, height: origH, min, max };
}

function Na__DepthPro__ResolveFocalLengthInImagePixels(focalOutTensor, resize) {
    if (!focalOutTensor || !focalOutTensor.data || focalOutTensor.data.length === 0) {
        return null;
    }
    // DepthPro focallength_px is in MODEL-INPUT pixels (i.e. relative to dstW x dstH).
    // We want it expressed in ORIGINAL image pixels, so divide by scale.
    const focalModelPx = focalOutTensor.data[0];
    if (!isFinite(focalModelPx) || focalModelPx <= 0) return null;
    const focalImagePx = focalModelPx / resize.scale;
    return focalImagePx;
}
