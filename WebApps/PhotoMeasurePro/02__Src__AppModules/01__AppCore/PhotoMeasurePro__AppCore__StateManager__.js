// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Application State Manager
// -----------------------------------------------------------------------------
const PhotoMeasurePro__AppCore__StateManager = (function() {
    let PhotoMeasurePro__StateManager__State = null;
    const PhotoMeasurePro__StateManager__Subscribers = [];

    // FUNCTION | Build Initial Application State
    // ------------------------------------------------------------
    function PhotoMeasurePro__StateManager__BuildInitialState(applicationConfig, measurementConfig) {
        const defaultMode = applicationConfig.PhotoMeasurePro__Application__DefaultMode || "setup";
        const defaultDimensionSize = measurementConfig.PhotoMeasurePro__Measurement__DefaultDimensionSize || 20;
        const defaultConstraintLength = measurementConfig.PhotoMeasurePro__Measurement__ConstraintDefaultLengthMm || 1000;

        return {
            mode: defaultMode,
            imageUrl: null,
            imageName: "",
            metadataFocalPixels: null,
            imgSize: { w: 1, h: 1 },
            transform: { x: 0, y: 0, scale: 1 },
            lines: [],
            selectedLineId: null,
            drawingLine: null,
            draggingPoint: null,
            isPanning: false,
            lastPan: { x: 0, y: 0 },
            dimensionSize: defaultDimensionSize,
            measurePlane: "XZ",
            constraintPlane: "XZ",
            constraintLengthMm: defaultConstraintLength,
            showDepthMap: false,
            scale: 1,
            perspectiveData: null,
            orthoStyle: null,
            appConfig: applicationConfig,
            measurementConfig: measurementConfig
        };
    }
    // ------------------------------------------------------------

    // FUNCTION | Initialize State Store
    // ------------------------------------------------------------
    function PhotoMeasurePro__StateManager__Initialize(applicationConfig, measurementConfig) {
        PhotoMeasurePro__StateManager__State = PhotoMeasurePro__StateManager__BuildInitialState(applicationConfig, measurementConfig);
        PhotoMeasurePro__StateManager__NotifySubscribers();
    }
    // ------------------------------------------------------------

    // FUNCTION | Get Current State Snapshot
    // ------------------------------------------------------------
    function PhotoMeasurePro__StateManager__GetState() {
        return PhotoMeasurePro__StateManager__State;
    }
    // ------------------------------------------------------------

    // FUNCTION | Replace State Using Producer
    // ------------------------------------------------------------
    function PhotoMeasurePro__StateManager__PatchState(stateProducerFunction) {
        if (!PhotoMeasurePro__StateManager__State) return;
        const nextStatePatch = stateProducerFunction(PhotoMeasurePro__StateManager__State) || {};
        PhotoMeasurePro__StateManager__State = Object.assign({}, PhotoMeasurePro__StateManager__State, nextStatePatch);
        PhotoMeasurePro__StateManager__NotifySubscribers();
    }
    // ------------------------------------------------------------

    // FUNCTION | Subscribe To State Changes
    // ------------------------------------------------------------
    function PhotoMeasurePro__StateManager__Subscribe(changeHandler) {
        PhotoMeasurePro__StateManager__Subscribers.push(changeHandler);
        return function PhotoMeasurePro__StateManager__Unsubscribe() {
            const subscriberIndex = PhotoMeasurePro__StateManager__Subscribers.indexOf(changeHandler);
            if (subscriberIndex >= 0) PhotoMeasurePro__StateManager__Subscribers.splice(subscriberIndex, 1);
        };
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Notify State Subscribers
    // ------------------------------------------------------------
    function PhotoMeasurePro__StateManager__NotifySubscribers() {
        PhotoMeasurePro__StateManager__Subscribers.forEach(function(changeHandler) {
            changeHandler(PhotoMeasurePro__StateManager__State);
        });
    }
    // ------------------------------------------------------------

    return {
        PhotoMeasurePro__StateManager__Initialize: PhotoMeasurePro__StateManager__Initialize,
        PhotoMeasurePro__StateManager__GetState: PhotoMeasurePro__StateManager__GetState,
        PhotoMeasurePro__StateManager__PatchState: PhotoMeasurePro__StateManager__PatchState,
        PhotoMeasurePro__StateManager__Subscribe: PhotoMeasurePro__StateManager__Subscribe
    };
})();

window.PhotoMeasurePro__AppCore__StateManager = PhotoMeasurePro__AppCore__StateManager;
// endregion ----------------------------------------------------
