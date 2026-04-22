// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Project File Manager
// -----------------------------------------------------------------------------
// Cloned from the ValeSpec pattern. Lightweight manifest in localStorage, full
// project payloads on disk via the Flask API, schema-normalised on every IO
// path. Images live inside the JSON as base64 so one file is a complete
// portable project.
// -----------------------------------------------------------------------------
const PhotoMeasurePro__AppData__ProjectFileManager = (function() {

    const PhotoMeasurePro__ProjectFileManager__ManifestKey = "PhotoMeasurePro__ProjectManifest";
    const PhotoMeasurePro__ProjectFileManager__ApiBase = "/api/projects";
    const PhotoMeasurePro__ProjectFileManager__Scene3dApiBase = "/api/scene3d";

    // HELPER FUNCTION | Read Manifest From localStorage
    // ------------------------------------------------------------
    function PhotoMeasurePro__ProjectFileManager__GetManifest() {
        const rawValue = localStorage.getItem(PhotoMeasurePro__ProjectFileManager__ManifestKey);
        if (!rawValue) return [];
        try { return JSON.parse(rawValue); } catch (e) { return []; }
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Write Manifest To localStorage
    // ------------------------------------------------------------
    function PhotoMeasurePro__ProjectFileManager__SaveManifest(manifestArray) {
        localStorage.setItem(PhotoMeasurePro__ProjectFileManager__ManifestKey, JSON.stringify(manifestArray));
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build A Manifest Entry From Project Metadata
    // ------------------------------------------------------------
    function PhotoMeasurePro__ProjectFileManager__BuildManifestEntryFromProject(projectData) {
        const metadata = (projectData && projectData.PhotoMeasurePro__ProjectFile__Metadata) || {};
        const image    = (projectData && projectData.PhotoMeasurePro__ProjectFile__Image) || {};
        return {
            projectCode:  metadata.ProjectCode  || "",
            projectName:  metadata.ProjectName  || "",
            author:       metadata.Author       || "",
            dateCreated:  metadata.DateCreated  || "",
            dateModified: metadata.DateModified || "",
            imageFileName: image.FileName || ""
        };
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Upsert Manifest Entry
    // ------------------------------------------------------------
    function PhotoMeasurePro__ProjectFileManager__UpsertManifestEntry(newEntry) {
        const manifestArray = PhotoMeasurePro__ProjectFileManager__GetManifest();
        const existingIndex = manifestArray.findIndex(function(entry) { return entry.projectCode === newEntry.projectCode; });
        if (existingIndex >= 0) {
            manifestArray[existingIndex] = newEntry;
        } else {
            manifestArray.push(newEntry);
        }
        PhotoMeasurePro__ProjectFileManager__SaveManifest(manifestArray);
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Remove Manifest Entry By Project Code
    // ------------------------------------------------------------
    function PhotoMeasurePro__ProjectFileManager__RemoveManifestEntry(projectCode) {
        const manifestArray = PhotoMeasurePro__ProjectFileManager__GetManifest();
        const filteredManifest = manifestArray.filter(function(entry) { return entry.projectCode !== projectCode; });
        PhotoMeasurePro__ProjectFileManager__SaveManifest(filteredManifest);
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Normalise Project Data Through Schema Validator
    // ------------------------------------------------------------
    function PhotoMeasurePro__ProjectFileManager__NormaliseProject(projectData, sourceLabel) {
        const validator = window.PhotoMeasurePro__AppUtils__ProjectSchemaValidator;
        if (!validator) return { ProjectData: projectData, DidMutate: false };
        return validator.PhotoMeasurePro__SchemaValidator__ValidateAndNormaliseProject(projectData, sourceLabel);
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Server Write (POST / DELETE)
    // ------------------------------------------------------------
    function PhotoMeasurePro__ProjectFileManager__ServerWrite(httpMethod, projectCode, bodyData) {
        const endpointUrl = PhotoMeasurePro__ProjectFileManager__ApiBase + "/" + encodeURIComponent(projectCode);
        const fetchOptions = {
            method: httpMethod,
            headers: { "Content-Type": "application/json" }
        };
        if (bodyData) fetchOptions.body = JSON.stringify(bodyData);

        return fetch(endpointUrl, fetchOptions)
            .then(function(response) {
                return response.json().then(function(jsonResult) {
                    if (!response.ok || !jsonResult || !jsonResult.ok) {
                        return { ok: false, error: (jsonResult && jsonResult.error) || ("HTTP " + response.status) };
                    }
                    return { ok: true, data: jsonResult.data };
                });
            })
            .catch(function(errorValue) {
                console.warn("[PhotoMeasurePro__ProjectFileManager] Server " + httpMethod + " unreachable:", errorValue.message);
                return { ok: false, error: errorValue.message || "Server unreachable" };
            });
    }
    // ------------------------------------------------------------

    // FUNCTION | Call Scene3D API Endpoint
    // ------------------------------------------------------------
    function PhotoMeasurePro__ProjectFileManager__Scene3dPost(apiRoute, projectCode, bodyData) {
        const endpointUrl = PhotoMeasurePro__ProjectFileManager__Scene3dApiBase + "/" + apiRoute + "/" + encodeURIComponent(projectCode);
        return fetch(endpointUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyData || {})
        }).then(function(response) {
            return response.json().then(function(jsonResult) {
                if (!response.ok || !jsonResult || !jsonResult.ok) {
                    return { ok: false, error: (jsonResult && jsonResult.error) || ("HTTP " + response.status) };
                }
                return { ok: true, data: jsonResult.data || {} };
            });
        }).catch(function(errorValue) {
            return { ok: false, error: errorValue.message || "Scene3D endpoint unreachable" };
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Build A Fresh Project Code
    // ------------------------------------------------------------
    function PhotoMeasurePro__ProjectFileManager__GenerateProjectCode() {
        const now = new Date();
        const pad = function(numericValue) { return String(numericValue).padStart(2, "0"); };
        return "PMP-" + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate())
            + "-" + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
    }
    // ------------------------------------------------------------

    // FUNCTION | Create An Empty Project Skeleton
    // ------------------------------------------------------------
    function PhotoMeasurePro__ProjectFileManager__CreateEmptyProject(projectCode, projectName) {
        const isoDate = new Date().toISOString().split("T")[0];
        const projectSkeleton = {
            PhotoMeasurePro__ProjectFile__Metadata: {
                ProjectCode: projectCode,
                ProjectName: projectName,
                Author: "",
                DateCreated: isoDate,
                DateModified: isoDate,
                SchemaVersion: (window.PhotoMeasurePro__AppUtils__ProjectSchemaValidator
                    && window.PhotoMeasurePro__AppUtils__ProjectSchemaValidator.PhotoMeasurePro__SchemaValidator__CurrentSchemaVersion) || 2
            }
        };
        const normalised = PhotoMeasurePro__ProjectFileManager__NormaliseProject(projectSkeleton, "createEmptyProject");
        return normalised.ProjectData;
    }
    // ------------------------------------------------------------

    // FUNCTION | List All Projects (From Manifest)
    // ------------------------------------------------------------
    function PhotoMeasurePro__ProjectFileManager__ListProjects() {
        return PhotoMeasurePro__ProjectFileManager__GetManifest();
    }
    // ------------------------------------------------------------

    // FUNCTION | Load Project Payload From Server By Code
    // ------------------------------------------------------------
    function PhotoMeasurePro__ProjectFileManager__LoadProject(projectCode) {
        const endpointUrl = PhotoMeasurePro__ProjectFileManager__ApiBase + "/" + encodeURIComponent(projectCode);
        return fetch(endpointUrl)
            .then(function(response) { return response.json(); })
            .then(function(jsonResult) {
                if (!jsonResult || !jsonResult.ok) {
                    return { ok: false, error: (jsonResult && jsonResult.error) || "Load failed" };
                }
                const normalised = PhotoMeasurePro__ProjectFileManager__NormaliseProject(jsonResult.data, "loadProject");
                return { ok: true, data: normalised.ProjectData };
            })
            .catch(function(errorValue) {
                console.warn("[PhotoMeasurePro__ProjectFileManager] Load failed:", errorValue.message);
                return { ok: false, error: errorValue.message || "Server unreachable" };
            });
    }
    // ------------------------------------------------------------

    // FUNCTION | Save Project Payload To Server + Update Manifest
    // ------------------------------------------------------------
    function PhotoMeasurePro__ProjectFileManager__SaveProject(projectData) {
        const normalised = PhotoMeasurePro__ProjectFileManager__NormaliseProject(projectData, "saveProject");
        const projectToSave = normalised.ProjectData;
        const metadata = projectToSave.PhotoMeasurePro__ProjectFile__Metadata;
        metadata.DateModified = new Date().toISOString().split("T")[0];
        const projectCode = metadata.ProjectCode;
        if (!projectCode) return Promise.resolve({ ok: false, error: "Project missing ProjectCode" });

        return PhotoMeasurePro__ProjectFileManager__ServerWrite("POST", projectCode, projectToSave).then(function(serverResult) {
            if (serverResult.ok) {
                PhotoMeasurePro__ProjectFileManager__UpsertManifestEntry(
                    PhotoMeasurePro__ProjectFileManager__BuildManifestEntryFromProject(projectToSave)
                );
            }
            return serverResult;
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Delete Project By Code
    // ------------------------------------------------------------
    function PhotoMeasurePro__ProjectFileManager__DeleteProject(projectCode) {
        return PhotoMeasurePro__ProjectFileManager__ServerWrite("DELETE", projectCode, null).then(function(serverResult) {
            PhotoMeasurePro__ProjectFileManager__RemoveManifestEntry(projectCode);
            return serverResult;
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Sync The Manifest From The Server's Disk Listing
    // ------------------------------------------------------------
    function PhotoMeasurePro__ProjectFileManager__SyncFromServer() {
        return fetch(PhotoMeasurePro__ProjectFileManager__ApiBase)
            .then(function(response) { return response.json(); })
            .then(function(jsonResult) {
                if (!jsonResult || !jsonResult.ok) throw new Error((jsonResult && jsonResult.error) || "Sync failed");
                const manifestFromServer = Array.isArray(jsonResult.data) ? jsonResult.data : [];
                PhotoMeasurePro__ProjectFileManager__SaveManifest(manifestFromServer);
                return manifestFromServer;
            })
            .catch(function(errorValue) {
                console.warn("[PhotoMeasurePro__ProjectFileManager] Sync unreachable, using cached manifest:", errorValue.message);
                return PhotoMeasurePro__ProjectFileManager__GetManifest();
            });
    }
    // ------------------------------------------------------------

    // FUNCTION | Export Project As A Downloadable JSON File
    // ------------------------------------------------------------
    function PhotoMeasurePro__ProjectFileManager__ExportProjectAsJson(projectData) {
        const metadata = projectData.PhotoMeasurePro__ProjectFile__Metadata || {};
        const safeName = (metadata.ProjectName || "Project").replace(/[^a-zA-Z0-9]/g, "_");
        const filename = "PhotoMeasurePro__ProjectFile__" + (metadata.ProjectCode || "unknown") + "__" + safeName + "__.json";
        const blobValue = new Blob([JSON.stringify(projectData, null, 4)], { type: "application/json" });
        const blobUrl = URL.createObjectURL(blobValue);
        const downloadLink = document.createElement("a");
        downloadLink.href = blobUrl;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(blobUrl);
    }
    // ------------------------------------------------------------

    // FUNCTION | Import Project From A User-Picked JSON File
    // ------------------------------------------------------------
    function PhotoMeasurePro__ProjectFileManager__ImportProjectFromJsonFile(fileObject) {
        return new Promise(function(resolvePromise, rejectPromise) {
            const fileReader = new FileReader();
            fileReader.onload = function() {
                try {
                    const parsed = JSON.parse(fileReader.result);
                    const normalised = PhotoMeasurePro__ProjectFileManager__NormaliseProject(parsed, "importFromJson");
                    resolvePromise(normalised.ProjectData);
                } catch (parseError) {
                    rejectPromise(parseError);
                }
            };
            fileReader.onerror = function() { rejectPromise(fileReader.error); };
            fileReader.readAsText(fileObject);
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Generate Depth Cache For Project
    // ------------------------------------------------------------
    function PhotoMeasurePro__ProjectFileManager__GenerateDepthForProject(projectCode) {
        return PhotoMeasurePro__ProjectFileManager__Scene3dPost("depth", projectCode, {});
    }
    // ------------------------------------------------------------

    // FUNCTION | Generate Segmentation Cache For Project
    // ------------------------------------------------------------
    function PhotoMeasurePro__ProjectFileManager__GenerateSegmentationForProject(projectCode) {
        return PhotoMeasurePro__ProjectFileManager__Scene3dPost("segmentation", projectCode, {});
    }
    // ------------------------------------------------------------

    // FUNCTION | Request Volume Detection (Depth + Offset-Plane Clustering)
    // ------------------------------------------------------------
    // Posts the client-solved perspective (f, basis, principal, anchor) and
    // current constraint lengths to the server so it can lift the ONNX depth
    // map into metric world coordinates and cluster wall pixels into offset
    // plane suggestions. The server never re-derives perspective itself.
    function PhotoMeasurePro__ProjectFileManager__DetectVolumesForProject(projectCode, detectionPayload) {
        return PhotoMeasurePro__ProjectFileManager__Scene3dPost("detect-volumes", projectCode, detectionPayload || {});
    }
    // ------------------------------------------------------------

    return {
        PhotoMeasurePro__ProjectFileManager__GenerateProjectCode: PhotoMeasurePro__ProjectFileManager__GenerateProjectCode,
        PhotoMeasurePro__ProjectFileManager__CreateEmptyProject: PhotoMeasurePro__ProjectFileManager__CreateEmptyProject,
        PhotoMeasurePro__ProjectFileManager__ListProjects: PhotoMeasurePro__ProjectFileManager__ListProjects,
        PhotoMeasurePro__ProjectFileManager__LoadProject: PhotoMeasurePro__ProjectFileManager__LoadProject,
        PhotoMeasurePro__ProjectFileManager__SaveProject: PhotoMeasurePro__ProjectFileManager__SaveProject,
        PhotoMeasurePro__ProjectFileManager__DeleteProject: PhotoMeasurePro__ProjectFileManager__DeleteProject,
        PhotoMeasurePro__ProjectFileManager__SyncFromServer: PhotoMeasurePro__ProjectFileManager__SyncFromServer,
        PhotoMeasurePro__ProjectFileManager__ExportProjectAsJson: PhotoMeasurePro__ProjectFileManager__ExportProjectAsJson,
        PhotoMeasurePro__ProjectFileManager__ImportProjectFromJsonFile: PhotoMeasurePro__ProjectFileManager__ImportProjectFromJsonFile,
        PhotoMeasurePro__ProjectFileManager__GenerateDepthForProject: PhotoMeasurePro__ProjectFileManager__GenerateDepthForProject,
        PhotoMeasurePro__ProjectFileManager__GenerateSegmentationForProject: PhotoMeasurePro__ProjectFileManager__GenerateSegmentationForProject,
        PhotoMeasurePro__ProjectFileManager__DetectVolumesForProject: PhotoMeasurePro__ProjectFileManager__DetectVolumesForProject
    };
})();

window.PhotoMeasurePro__AppData__ProjectFileManager = PhotoMeasurePro__AppData__ProjectFileManager;
// endregion ----------------------------------------------------
