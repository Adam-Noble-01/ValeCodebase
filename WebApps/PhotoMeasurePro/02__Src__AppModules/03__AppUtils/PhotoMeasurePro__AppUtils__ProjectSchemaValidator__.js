// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Project Schema Validator
// -----------------------------------------------------------------------------
// Normalises a project JSON payload to the current schema. Fills in missing
// sections with empty defaults, stamps a schema version, and reports whether a
// mutation happened so the caller can write the repaired data back to disk or
// cache.
// -----------------------------------------------------------------------------
const PhotoMeasurePro__AppUtils__ProjectSchemaValidator = (function() {

    const PhotoMeasurePro__SchemaValidator__CurrentSchemaVersion = 2;

    // HELPER FUNCTION | Ensure A Top-Level Section Exists With Default Contents
    // ------------------------------------------------------------
    function PhotoMeasurePro__SchemaValidator__EnsureSection(target, sectionKey, defaultsBuilder) {
        if (target[sectionKey] && typeof target[sectionKey] === "object") return false;
        target[sectionKey] = defaultsBuilder();
        return true;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build Default Metadata Section
    // ------------------------------------------------------------
    function PhotoMeasurePro__SchemaValidator__BuildDefaultMetadata() {
        const isoDate = new Date().toISOString().split("T")[0];
        return {
            ProjectCode: "",
            ProjectName: "",
            Author: "",
            DateCreated: isoDate,
            DateModified: isoDate,
            SchemaVersion: PhotoMeasurePro__SchemaValidator__CurrentSchemaVersion
        };
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build Default Image Section
    // ------------------------------------------------------------
    function PhotoMeasurePro__SchemaValidator__BuildDefaultImage() {
        return {
            FileName: "",
            MimeType: "",
            WidthPx: 0,
            HeightPx: 0,
            FocalPixelsExif: null,
            DataUrlBase64: ""
        };
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build Default Perspective Section
    // ------------------------------------------------------------
    function PhotoMeasurePro__SchemaValidator__BuildDefaultPerspective() {
        return { Lines: [] };
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build Default Calibration Section
    // ------------------------------------------------------------
    function PhotoMeasurePro__SchemaValidator__BuildDefaultCalibration() {
        return {
            ConstraintsByPlane: {
                Facade: { lineId: null, lengthMm: 1000 },
                Side:   { lineId: null, lengthMm: 1000 },
                Ground: { lineId: null, lengthMm: 1000 }
            },
            AnchorPoint: null
        };
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build Default Measurements Section
    // ------------------------------------------------------------
    function PhotoMeasurePro__SchemaValidator__BuildDefaultMeasurements() {
        return { Lines: [] };
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build Default Visual Settings Section
    // ------------------------------------------------------------
    function PhotoMeasurePro__SchemaValidator__BuildDefaultVisualSettings() {
        return {
            AxisLineThickness: 1.5,
            DimensionLineThickness: 1.5,
            DimensionTextSize: 20
        };
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build Default Ortho View Section
    // ------------------------------------------------------------
    function PhotoMeasurePro__SchemaValidator__BuildDefaultOrthoView() {
        return {
            SelectedPlane: "Facade",
            Crop: null
        };
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build Default Scene3D Section
    // ------------------------------------------------------------
    function PhotoMeasurePro__SchemaValidator__BuildDefaultScene3d() {
        return {
            DepthCacheUrl: null,
            SegmentationCacheUrl: null,
            DepthScaling: null,
            WorldOrigin: null,
            OffsetPlanes: [],
            PlaneLabelMap: null,
            SnapTarget: "analytical",
            ViewMode: "3dOnly",
            CameraState: null
        };
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build Default Measurements3D Section
    // ------------------------------------------------------------
    function PhotoMeasurePro__SchemaValidator__BuildDefaultMeasurements3d() {
        return { Lines: [] };
    }
    // ------------------------------------------------------------

    // FUNCTION | Validate And Normalise A Project Payload
    // ------------------------------------------------------------
    function PhotoMeasurePro__SchemaValidator__ValidateAndNormaliseProject(projectData, sourceLabel) {
        const normalised = projectData && typeof projectData === "object" ? JSON.parse(JSON.stringify(projectData)) : {};
        let didMutate = !projectData || typeof projectData !== "object";

        if (PhotoMeasurePro__SchemaValidator__EnsureSection(normalised, "PhotoMeasurePro__ProjectFile__Metadata", PhotoMeasurePro__SchemaValidator__BuildDefaultMetadata)) didMutate = true;
        if (PhotoMeasurePro__SchemaValidator__EnsureSection(normalised, "PhotoMeasurePro__ProjectFile__Image", PhotoMeasurePro__SchemaValidator__BuildDefaultImage)) didMutate = true;
        if (PhotoMeasurePro__SchemaValidator__EnsureSection(normalised, "PhotoMeasurePro__ProjectFile__Perspective", PhotoMeasurePro__SchemaValidator__BuildDefaultPerspective)) didMutate = true;
        if (PhotoMeasurePro__SchemaValidator__EnsureSection(normalised, "PhotoMeasurePro__ProjectFile__Calibration", PhotoMeasurePro__SchemaValidator__BuildDefaultCalibration)) didMutate = true;
        if (PhotoMeasurePro__SchemaValidator__EnsureSection(normalised, "PhotoMeasurePro__ProjectFile__Measurements", PhotoMeasurePro__SchemaValidator__BuildDefaultMeasurements)) didMutate = true;
        if (PhotoMeasurePro__SchemaValidator__EnsureSection(normalised, "PhotoMeasurePro__ProjectFile__VisualSettings", PhotoMeasurePro__SchemaValidator__BuildDefaultVisualSettings)) didMutate = true;
        if (PhotoMeasurePro__SchemaValidator__EnsureSection(normalised, "PhotoMeasurePro__ProjectFile__OrthoView", PhotoMeasurePro__SchemaValidator__BuildDefaultOrthoView)) didMutate = true;
        if (PhotoMeasurePro__SchemaValidator__EnsureSection(normalised, "PhotoMeasurePro__ProjectFile__Scene3D", PhotoMeasurePro__SchemaValidator__BuildDefaultScene3d)) didMutate = true;
        if (PhotoMeasurePro__SchemaValidator__EnsureSection(normalised, "PhotoMeasurePro__ProjectFile__Measurements3D", PhotoMeasurePro__SchemaValidator__BuildDefaultMeasurements3d)) didMutate = true;

        const metadata = normalised.PhotoMeasurePro__ProjectFile__Metadata;
        const perspective = normalised.PhotoMeasurePro__ProjectFile__Perspective;
        const measurements = normalised.PhotoMeasurePro__ProjectFile__Measurements;
        const measurements3d = normalised.PhotoMeasurePro__ProjectFile__Measurements3D;
        const scene3d = normalised.PhotoMeasurePro__ProjectFile__Scene3D;
        if (!Array.isArray(perspective.Lines)) { perspective.Lines = []; didMutate = true; }
        if (!Array.isArray(measurements.Lines)) { measurements.Lines = []; didMutate = true; }
        if (!Array.isArray(measurements3d.Lines)) { measurements3d.Lines = []; didMutate = true; }
        if (!Array.isArray(scene3d.OffsetPlanes)) { scene3d.OffsetPlanes = []; didMutate = true; }
        if (metadata.SchemaVersion !== PhotoMeasurePro__SchemaValidator__CurrentSchemaVersion) {
            metadata.SchemaVersion = PhotoMeasurePro__SchemaValidator__CurrentSchemaVersion;
            didMutate = true;
        }

        if (didMutate && sourceLabel) {
            console.log("[PhotoMeasurePro__SchemaValidator] Normalised for source:", sourceLabel);
        }

        return { ProjectData: normalised, DidMutate: didMutate };
    }
    // ------------------------------------------------------------

    return {
        PhotoMeasurePro__SchemaValidator__CurrentSchemaVersion: PhotoMeasurePro__SchemaValidator__CurrentSchemaVersion,
        PhotoMeasurePro__SchemaValidator__ValidateAndNormaliseProject: PhotoMeasurePro__SchemaValidator__ValidateAndNormaliseProject
    };
})();

window.PhotoMeasurePro__AppUtils__ProjectSchemaValidator = PhotoMeasurePro__AppUtils__ProjectSchemaValidator;
// endregion ----------------------------------------------------
