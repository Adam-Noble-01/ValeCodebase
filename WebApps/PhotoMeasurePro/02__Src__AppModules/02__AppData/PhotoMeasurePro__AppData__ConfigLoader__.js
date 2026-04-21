// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro App Config Loader
// -----------------------------------------------------------------------------
const PhotoMeasurePro__AppData__ConfigLoader = (function() {
    const PhotoMeasurePro__ConfigLoader__ConfigPath = "02__Src__AppModules/02__AppData/PhotoMeasurePro__AppConfig__Main__.json";
    let PhotoMeasurePro__ConfigLoader__CachedConfig = null;

    // FUNCTION | Load Config JSON
    // ------------------------------------------------------------
    async function PhotoMeasurePro__ConfigLoader__LoadConfig() {
        if (PhotoMeasurePro__ConfigLoader__CachedConfig) {
            return PhotoMeasurePro__ConfigLoader__CachedConfig;
        }

        const inlineConfig = window.PhotoMeasurePro__AppData__InlineConfig;
        if (inlineConfig) {
            PhotoMeasurePro__ConfigLoader__CachedConfig = inlineConfig;
        }

        if (window.location && window.location.protocol === "file:") {
            if (PhotoMeasurePro__ConfigLoader__CachedConfig) {
                return PhotoMeasurePro__ConfigLoader__CachedConfig;
            }
            PhotoMeasurePro__ConfigLoader__CachedConfig = PhotoMeasurePro__ConfigLoader__BuildHardcodedFallbackConfig();
            return PhotoMeasurePro__ConfigLoader__CachedConfig;
        }

        try {
            const response = await fetch(PhotoMeasurePro__ConfigLoader__ConfigPath, { cache: "no-store" });
            if (!response.ok) {
                throw new Error("Failed to load config: " + PhotoMeasurePro__ConfigLoader__ConfigPath);
            }

            PhotoMeasurePro__ConfigLoader__CachedConfig = await response.json();
            return PhotoMeasurePro__ConfigLoader__CachedConfig;
        } catch (configError) {
            if (PhotoMeasurePro__ConfigLoader__CachedConfig) {
                console.warn("PhotoMeasurePro config fetch blocked; using inline fallback config.", configError);
                return PhotoMeasurePro__ConfigLoader__CachedConfig;
            }

            PhotoMeasurePro__ConfigLoader__CachedConfig = PhotoMeasurePro__ConfigLoader__BuildHardcodedFallbackConfig();
            console.warn("PhotoMeasurePro config fetch failed; using hardcoded fallback config.", configError);
            return PhotoMeasurePro__ConfigLoader__CachedConfig;
        }
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build Hardcoded Fallback Config
    // ------------------------------------------------------------
    function PhotoMeasurePro__ConfigLoader__BuildHardcodedFallbackConfig() {
        return {
            "PhotoMeasurePro__Application__Config": {
                "PhotoMeasurePro__Application__Version": "1.0.0-rebuild",
                "PhotoMeasurePro__Application__DefaultMode": "setup",
                "PhotoMeasurePro__Application__ViewportMarginScale": 0.95,
                "PhotoMeasurePro__Application__MinZoomScale": 0.1,
                "PhotoMeasurePro__Application__MaxZoomScale": 30
            },
            "PhotoMeasurePro__Measurement__Config": {
                "PhotoMeasurePro__Measurement__DefaultDimensionSize": 20,
                "PhotoMeasurePro__Measurement__ConstraintDefaultLengthMm": 1000,
                "PhotoMeasurePro__Measurement__DragThresholdPixels": 10,
                "PhotoMeasurePro__Measurement__HitRadiusPixels": 30
            },
            "PhotoMeasurePro__Server__Config": {
                "PhotoMeasurePro__Server__Host": "127.0.0.1",
                "PhotoMeasurePro__Server__Port": 8003
            }
        };
    }
    // ------------------------------------------------------------

    // FUNCTION | Get Config Section By Key
    // ------------------------------------------------------------
    function PhotoMeasurePro__ConfigLoader__GetSection(sectionName) {
        if (!PhotoMeasurePro__ConfigLoader__CachedConfig) return null;
        return PhotoMeasurePro__ConfigLoader__CachedConfig[sectionName] || null;
    }
    // ------------------------------------------------------------

    return {
        PhotoMeasurePro__ConfigLoader__LoadConfig: PhotoMeasurePro__ConfigLoader__LoadConfig,
        PhotoMeasurePro__ConfigLoader__GetSection: PhotoMeasurePro__ConfigLoader__GetSection
    };
})();

window.PhotoMeasurePro__AppData__ConfigLoader = PhotoMeasurePro__AppData__ConfigLoader;
// endregion ----------------------------------------------------
