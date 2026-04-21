// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Id Generator Utilities
// -----------------------------------------------------------------------------
const PhotoMeasurePro__AppUtils__IdGenerator = (function() {

    // FUNCTION | Build Time Based Identifier
    // ------------------------------------------------------------
    function PhotoMeasurePro__IdGenerator__Create(prefixLabel) {
        return prefixLabel + "_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
    }
    // ------------------------------------------------------------

    return {
        PhotoMeasurePro__IdGenerator__Create: PhotoMeasurePro__IdGenerator__Create
    };
})();

window.PhotoMeasurePro__AppUtils__IdGenerator = PhotoMeasurePro__AppUtils__IdGenerator;
// endregion ----------------------------------------------------
