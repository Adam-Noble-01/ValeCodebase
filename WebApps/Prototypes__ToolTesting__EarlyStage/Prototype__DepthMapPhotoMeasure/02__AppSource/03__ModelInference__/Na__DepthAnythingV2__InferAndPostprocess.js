// Na__DepthAnythingV2__InferAndPostprocess
// Runs Depth Anything V2 Metric (vKITTI outdoor) on a source ImageBitmap and
// returns a metric depth map in image-space coordinates. This model does NOT
// emit a focal length, so focalPxImageSpace is null - the intrinsics fallback
// chain is responsible for resolving it from EXIF/manual/calibration sources.

import { Na__OnnxRuntime__GetSession, Na__OnnxRuntime__GetOrt } from './Na__OnnxRuntime__SessionLoader.js';
import { Na__ImagePreprocess__NormalizeForModel }              from './Na__ImagePreprocess__NormalizeForModel.js';

const Na__DepthAnythingV2__ModelId = 'DepthAnythingV2MetricOutdoor';

export async function Na__DepthAnythingV2__InferAndPostprocess(sourceImageBitmap, modelConfig, inferenceConfig, onProgress) {
    const ort     = Na__OnnxRuntime__GetOrt();
    const session = await Na__OnnxRuntime__GetSession(Na__DepthAnythingV2__ModelId, modelConfig, inferenceConfig, onProgress);

    if (typeof onProgress === 'function') onProgress({ phase: 'preprocess', modelId: Na__DepthAnythingV2__ModelId, status: 'starting' });
    const { tensorData, tensorShape, resize } = Na__ImagePreprocess__NormalizeForModel(sourceImageBitmap, modelConfig);

    if (typeof onProgress === 'function') onProgress({ phase: 'inference', modelId: Na__DepthAnythingV2__ModelId, status: 'starting' });
    const inputTensor = new ort.Tensor('float32', tensorData, tensorShape);
    const feeds       = { [modelConfig.inputName]: inputTensor };
    const t0          = performance.now();
    const results     = await session.run(feeds);
    const inferMs     = performance.now() - t0;

    const depthOut = results[modelConfig.outputs.depth];
    if (!depthOut) throw new Error(`Depth output '${modelConfig.outputs.depth}' missing from DA V2 result.`);

    const dims = depthOut.dims;
    let modelDepthH, modelDepthW;
    if (dims.length === 4) {
        modelDepthH = dims[2];
        modelDepthW = dims[3];
    } else if (dims.length === 3) {
        modelDepthH = dims[1];
        modelDepthW = dims[2];
    } else {
        throw new Error(`Unexpected DA V2 depth tensor dims: [${dims.join(',')}]`);
    }

    const resampled = Na__DepthAnythingV2__ResampleDepthToImageSpace(
        depthOut.data, modelDepthW, modelDepthH,
        resize, sourceImageBitmap.width, sourceImageBitmap.height
    );

    if (typeof onProgress === 'function') onProgress({ phase: 'inference', modelId: Na__DepthAnythingV2__ModelId, status: 'done', durationMs: inferMs });

    return {
        modelId:           Na__DepthAnythingV2__ModelId,
        depth:             resampled.data,
        depthWidth:        resampled.width,
        depthHeight:       resampled.height,
        depthMin:          resampled.min,
        depthMax:          resampled.max,
        focalPxImageSpace: null,
        inferenceMs:       inferMs,
        unit:              modelConfig.outputDepthUnit
    };
}

function Na__DepthAnythingV2__ResampleDepthToImageSpace(modelDepthData, modelW, modelH, resize, origW, origH) {
    // DA V2 doesn't pad to square (padToSquare=false) so the entire model output
    // covers the resized image directly. We sample the full model grid into
    // the original image resolution.
    const scaleX = modelW / resize.dstWidth;
    const scaleY = modelH / resize.dstHeight;
    const cropX0 = Math.round(resize.padX * scaleX);
    const cropY0 = Math.round(resize.padY * scaleY);
    const cropW  = Math.max(1, Math.round(resize.paddedSrcW * scaleX));
    const cropH  = Math.max(1, Math.round(resize.paddedSrcH * scaleY));

    const out = new Float32Array(origW * origH);
    let min = Infinity;
    let max = -Infinity;
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
