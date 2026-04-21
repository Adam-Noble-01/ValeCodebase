// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Scene3D Depth Map Scaler
// -----------------------------------------------------------------------------
const PhotoMeasurePro__System__SceneReconstruction3D__DepthMapScaler = (function() {

    function PhotoMeasurePro__DepthMapScaler__FitLinearScale(samplePairs) {
        if (!Array.isArray(samplePairs) || samplePairs.length < 2) {
            return { slope: 1, intercept: 0, rms: null, sampleCount: 0 };
        }

        let sumRaw = 0;
        let sumMetric = 0;
        let sumRawRaw = 0;
        let sumRawMetric = 0;
        const sampleCount = samplePairs.length;

        samplePairs.forEach(function(samplePair) {
            sumRaw += samplePair.rawDepth;
            sumMetric += samplePair.metricDepth;
            sumRawRaw += samplePair.rawDepth * samplePair.rawDepth;
            sumRawMetric += samplePair.rawDepth * samplePair.metricDepth;
        });

        const denominator = (sampleCount * sumRawRaw) - (sumRaw * sumRaw);
        const slope = Math.abs(denominator) < 1e-12
            ? 1
            : ((sampleCount * sumRawMetric) - (sumRaw * sumMetric)) / denominator;
        const intercept = (sumMetric - (slope * sumRaw)) / sampleCount;

        let squaredError = 0;
        samplePairs.forEach(function(samplePair) {
            const fittedValue = (slope * samplePair.rawDepth) + intercept;
            const errorValue = fittedValue - samplePair.metricDepth;
            squaredError += errorValue * errorValue;
        });

        return {
            slope: slope,
            intercept: intercept,
            rms: Math.sqrt(squaredError / sampleCount),
            sampleCount: sampleCount
        };
    }

    function PhotoMeasurePro__DepthMapScaler__ScaleDepthValue(rawDepthValue, depthScaling) {
        if (!depthScaling || !Number.isFinite(rawDepthValue)) return null;
        return rawDepthValue * depthScaling.slope + depthScaling.intercept;
    }

    return {
        PhotoMeasurePro__DepthMapScaler__FitLinearScale: PhotoMeasurePro__DepthMapScaler__FitLinearScale,
        PhotoMeasurePro__DepthMapScaler__ScaleDepthValue: PhotoMeasurePro__DepthMapScaler__ScaleDepthValue
    };
})();

window.PhotoMeasurePro__System__SceneReconstruction3D__DepthMapScaler = PhotoMeasurePro__System__SceneReconstruction3D__DepthMapScaler;
// endregion ----------------------------------------------------
