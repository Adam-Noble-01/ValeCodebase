// Na__ModelRegistry__SelectActiveModel
// Maps model ids -> inference functions and tracks which one is active.
// UI calls Na__ModelRegistry__SetActiveModel(id) and
// Na__ModelRegistry__RunActiveModel(image, ...) to dispatch.

import { Na__DepthPro__InferAndPostprocess }        from './Na__DepthPro__InferAndPostprocess.js';
import { Na__DepthAnythingV2__InferAndPostprocess } from './Na__DepthAnythingV2__InferAndPostprocess.js';

const Na__ModelRegistry__InferenceById = {
    DepthPro:                       Na__DepthPro__InferAndPostprocess,
    DepthAnythingV2MetricOutdoor:   Na__DepthAnythingV2__InferAndPostprocess
};

let Na__ModelRegistry__ActiveModelId = null;

export function Na__ModelRegistry__ListAvailableIds(appConfig) {
    return Object.keys(appConfig.models || {});
}

export function Na__ModelRegistry__SetActiveModel(modelId, appConfig) {
    if (!appConfig.models[modelId]) {
        throw new Error(`Model id '${modelId}' is not declared in AppConfig.models.`);
    }
    if (!Na__ModelRegistry__InferenceById[modelId]) {
        throw new Error(`No inference function registered for model id '${modelId}'.`);
    }
    Na__ModelRegistry__ActiveModelId = modelId;
}

export function Na__ModelRegistry__GetActiveModelId() {
    return Na__ModelRegistry__ActiveModelId;
}

export async function Na__ModelRegistry__RunActiveModel(sourceImageBitmap, appConfig, onProgress) {
    if (!Na__ModelRegistry__ActiveModelId) {
        throw new Error('No active model selected. Call Na__ModelRegistry__SetActiveModel first.');
    }
    const id          = Na__ModelRegistry__ActiveModelId;
    const modelConfig = appConfig.models[id];
    const inferFn     = Na__ModelRegistry__InferenceById[id];
    return inferFn(sourceImageBitmap, modelConfig, appConfig.inference, onProgress);
}
