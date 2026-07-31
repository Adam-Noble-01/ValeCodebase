/* =============================================================================
   VGHLANTERN - PROJECT FILE MANAGER
   =============================================================================

   FILE       : VghLantern__AppData__ProjectFileManager__.js
   NAMESPACE  : VghLantern
   MODULE     : AppData - ProjectFileManager
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Project CRUD operations with server-backed disk persistence
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Creates, loads, saves, and deletes project files.
   - Primary storage: server API writing JSON files to 07__LocalProjectData/.
   - Fast read cache: localStorage mirrors server data for synchronous access.
   - SyncFromServer() fetches all projects from disk and rebuilds the cache.
   - Provides export for manual JSON file download.
   - IMPORTANT: every create/load/save/sync path normalises project JSON through
     AppUtils ProjectSchemaValidator. Do not add IO paths that bypass it.

   ============================================================================= */

// =============================================================================
// REGION | Project File Manager Module
// =============================================================================

const VghLantern__AppData__ProjectFileManager = (function() {

    // MODULE CONSTANTS | Storage Keys and API Base
    // ------------------------------------------------------------
    const STORAGE_PREFIX  =  'VghLantern__Project__';
    const MANIFEST_KEY    =  'VghLantern__ProjectManifest';
    const API_BASE        =  '/api/projects';                                // <-- Server project API root
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Today's Date in Vale Storage Format "30-Jul-2026"
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__GetTodayStamp() {
        return window.VghLantern__AppUtils__DateFormatter
            .VghLantern__DateFormatter__FormatDdMmmYyyy(new Date());         // <-- DateFormatter is the date format SSOT
    }
    // ------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Manifest Read and Write Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get Manifest from localStorage
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__GetManifest() {
        var raw  =  localStorage.getItem(MANIFEST_KEY);
        if (!raw) return [];
        try { return JSON.parse(raw); }
        catch (e) { return []; }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Save Manifest to localStorage
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__SaveManifest(manifest) {
        localStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Normalised Manifest Entry Object
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__BuildManifestEntry(code, name, docName, clientName, status, dateCreated, dateModified) {
        var safeStatus        =  (typeof status === 'string' && status.trim()) ? status.trim() : 'Draft';
        var safeDateCreated   =  dateCreated || '';
        var safeDateModified  =  dateModified || safeDateCreated || VghLantern__ProjectFileManager__GetTodayStamp();

        return {
            projectCode   : code       || '',
            projectName   : name       || '',
            documentName  : docName    || '',
            clientName    : clientName || '',
            status        : safeStatus,
            dateCreated   : safeDateCreated,
            dateModified  : safeDateModified
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Manifest Entry from Project Metadata
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__BuildManifestEntryFromMetadata(code, metadata, fallbackEntry) {
        var fallback      =  fallbackEntry || {};
        var projectName   =  metadata['VghLantern__ProjectFile__Metadata__ProjectName']    || fallback.projectName;
        var documentName  =  metadata['VghLantern__ProjectFile__Metadata__DocumentName']   || fallback.documentName;
        var clientName    =  metadata['VghLantern__ProjectFile__Metadata__ClientName']     || fallback.clientName;
        var status        =  metadata['VghLantern__ProjectFile__Metadata__DocumentStatus'] || fallback.status;
        var dateCreated   =  metadata['VghLantern__ProjectFile__Metadata__DateCreated']    || fallback.dateCreated;
        var dateModified  =  metadata['VghLantern__ProjectFile__Metadata__DateModified']   || fallback.dateModified;

        return VghLantern__ProjectFileManager__BuildManifestEntry(code, projectName, documentName, clientName, status, dateCreated, dateModified);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Normalise Project Data to Current Schema
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__NormaliseProjectData(projectData, sourceLabel) {
        var SchemaValidator  =  window.VghLantern__AppUtils__ProjectSchemaValidator;
        if (!SchemaValidator || !SchemaValidator.VghLantern__SchemaValidator__ValidateAndNormaliseProject) return { projectData: projectData, didMutate: false };

        var result  =  SchemaValidator.VghLantern__SchemaValidator__ValidateAndNormaliseProject(projectData, sourceLabel);
        if (!result || !result.ProjectData) return { projectData: projectData, didMutate: false };

        if (result.DidMutate) {
            console.log('[VghLantern__ProjectFileManager] Schema normalised for source:', sourceLabel || 'unknown');
        }

        return { projectData: result.ProjectData, didMutate: !!result.DidMutate };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Add Entry to Manifest
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__AddToManifest(code, name, docName, clientName, status, dateCreated, dateModified) {
        var manifest  =  VghLantern__ProjectFileManager__GetManifest();
        var existing  =  manifest.findIndex(function(p) { return p.projectCode === code; });
        var previous  =  existing >= 0 ? manifest[existing] : null;
        var entry     =  VghLantern__ProjectFileManager__BuildManifestEntry(code, name, docName, clientName, status, dateCreated, dateModified);

        if (previous) {
            if (!entry.projectName)  entry.projectName   =  previous.projectName   || '';
            if (!entry.documentName) entry.documentName  =  previous.documentName  || '';
            if (!entry.clientName)   entry.clientName    =  previous.clientName    || '';
            if (!entry.dateCreated)  entry.dateCreated   =  previous.dateCreated   || '';
        }

        if (existing >= 0) {
            manifest[existing]  =  entry;
        } else {
            manifest.push(entry);
        }
        VghLantern__ProjectFileManager__SaveManifest(manifest);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update Manifest Entry from Metadata
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__UpdateManifestEntry(code, metadata) {
        var manifest  =  VghLantern__ProjectFileManager__GetManifest();
        var idx       =  manifest.findIndex(function(p) { return p.projectCode === code; });
        if (idx < 0) return;

        manifest[idx]  =  VghLantern__ProjectFileManager__BuildManifestEntryFromMetadata(code, metadata || {}, manifest[idx]);
        VghLantern__ProjectFileManager__SaveManifest(manifest);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Hydrate Manifest Entry from Cached Project Metadata
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__HydrateManifestEntryFromCache(entry) {
        var source       =  entry || {};
        var projectCode  =  source.projectCode || '';
        if (!projectCode) {
            return VghLantern__ProjectFileManager__BuildManifestEntry(
                '',
                source.projectName,
                source.documentName,
                source.clientName,
                source.status,
                source.dateCreated,
                source.dateModified
            );
        }

        var storageKey     =  STORAGE_PREFIX + projectCode;
        var cachedProject  =  null;
        var metadata       =  null;
        try {
            cachedProject  =  JSON.parse(localStorage.getItem(storageKey) || 'null');
            metadata       =  cachedProject ? cachedProject['VghLantern__ProjectFile__Metadata'] : null;
        } catch (e) {
            metadata  =  null;
        }

        if (metadata) {
            return VghLantern__ProjectFileManager__BuildManifestEntryFromMetadata(projectCode, metadata, source);
        }

        return VghLantern__ProjectFileManager__BuildManifestEntry(
            projectCode,
            source.projectName,
            source.documentName,
            source.clientName,
            source.status,
            source.dateCreated,
            source.dateModified
        );
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Compare Two Manifest Entries
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__ManifestEntriesMatch(a, b) {
        var left   =  a || {};
        var right  =  b || {};
        return (
            (left.projectCode  || '')      === (right.projectCode  || '')      &&
            (left.projectName  || '')      === (right.projectName  || '')      &&
            (left.documentName || '')      === (right.documentName || '')      &&
            (left.clientName   || '')      === (right.clientName   || '')      &&
            (left.status       || 'Draft') === (right.status       || 'Draft') &&
            (left.dateCreated  || '')      === (right.dateCreated  || '')      &&
            (left.dateModified || '')      === (right.dateModified || '')
        );
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Remove Entry from Manifest
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__RemoveFromManifest(code) {
        var manifest  =  VghLantern__ProjectFileManager__GetManifest();
        manifest      =  manifest.filter(function(p) { return p.projectCode !== code; });
        VghLantern__ProjectFileManager__SaveManifest(manifest);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Server API Communication
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | POST or DELETE to Server API and Return Result
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__ServerWrite(method, projectCode, bodyData, updateSource) {
        var url   =  API_BASE + '/' + encodeURIComponent(projectCode);
        var opts  =  {
            method  :  method,
            headers :  {
                'Content-Type'              : 'application/json',
                'X-VghLantern-UpdateSource' : updateSource || 'unspecified'
            }
        };
        if (bodyData) opts.body  =  JSON.stringify(bodyData);

        return fetch(url, opts)
            .then(function(res) {
                return res.json().then(function(json) {
                    if (!res.ok) {
                        return { ok: false, error: (json && json.error) ? json.error : ('HTTP ' + res.status) };
                    }
                    return json;
                });
            })
            .then(function(json) {
                if (!json || !json.ok) {
                    var errorText  =  json && json.error ? json.error : 'Unknown error';
                    console.error('[VghLantern__ProjectFileManager] Server ' + method + ' failed for ' + projectCode + ':', errorText);
                    return { ok: false, error: errorText };
                }
                return { ok: true };
            })
            .catch(function(err) {
                console.warn('[VghLantern__ProjectFileManager] Server ' + method + ' unreachable for ' + projectCode + ' (localStorage-only fallback):', err.message);
                return { ok: false, error: err.message || 'Server unreachable' };
            });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Project CRUD Operations
// -----------------------------------------------------------------------------

    // FUNCTION | List All Projects
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__ListProjects() {
        var manifest        =  VghLantern__ProjectFileManager__GetManifest();
        var repaired        =  [];
        var needsWriteback  =  false;

        for (var i = 0; i < manifest.length; i++) {
            var sourceEntry  =  manifest[i] || {};
            var hydrated     =  VghLantern__ProjectFileManager__HydrateManifestEntryFromCache(sourceEntry);
            repaired.push(hydrated);

            if (!VghLantern__ProjectFileManager__ManifestEntriesMatch(sourceEntry, hydrated)) {
                needsWriteback  =  true;                                     // <-- Repair stale/missing manifest fields in place
            }
        }

        if (needsWriteback) {
            VghLantern__ProjectFileManager__SaveManifest(repaired);
        }

        return repaired;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build a Fresh Project Data Object
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__BuildNewProjectData(projectCode, projectName, documentName, clientName) {
        var now  =  VghLantern__ProjectFileManager__GetTodayStamp();

        return {
            'VghLantern__ProjectFile__Metadata': {
                'VghLantern__ProjectFile__Metadata__Description'     : 'Project identity and document tracking metadata.',
                'VghLantern__ProjectFile__Metadata__ProjectCode'     : projectCode,
                'VghLantern__ProjectFile__Metadata__ProjectName'     : projectName,
                'VghLantern__ProjectFile__Metadata__DocumentName'    : documentName || projectName + ' Roof Lanterns',
                'VghLantern__ProjectFile__Metadata__ClientName'      : clientName || '',
                'VghLantern__ProjectFile__Metadata__SiteAddress'     : '',
                'VghLantern__ProjectFile__Metadata__DocumentStatus'  : 'Draft',
                'VghLantern__ProjectFile__Metadata__DateCreated'     : now,
                'VghLantern__ProjectFile__Metadata__DateModified'    : now,
                'VghLantern__ProjectFile__Metadata__DateIssued'      : '',
                'VghLantern__ProjectFile__Metadata__RevisionCode'    : 'A',
                'VghLantern__ProjectFile__Metadata__Author'          : ''
            },
            'VghLantern__ProjectFile__GlobalSettings': {
                'VghLantern__ProjectFile__GlobalSettings__Description'      : 'Document-wide settings that cascade to all lanterns.',
                'VghLantern__ProjectFile__GlobalSettings__FrameFinish'      : '',
                'VghLantern__ProjectFile__GlobalSettings__GlazingSpec'      : '',
                'VghLantern__ProjectFile__GlobalSettings__DrawingScaleRef'  : '',
                'VghLantern__ProjectFile__GlobalSettings__JobNotes'         : ''
            },
            'VghLantern__ProjectFile__DrawingLayout': {
                'VghLantern__ProjectFile__DrawingLayout__Description'       : 'How the Drawing Editor sheet was last set up. Null means fall back to the Drawing Editor config default.',
                'VghLantern__ProjectFile__DrawingLayout__SheetSizeKey'      : null,
                'VghLantern__ProjectFile__DrawingLayout__Orientation'       : null,
                'VghLantern__ProjectFile__DrawingLayout__ScaleDenominator'  : null,
                'VghLantern__ProjectFile__DrawingLayout__ScaleIsManual'     : false,
                'VghLantern__ProjectFile__DrawingLayout__ColumnSharesPct'   : null,
                'VghLantern__ProjectFile__DrawingLayout__RowSharesPct'      : null,
                'VghLantern__ProjectFile__DrawingLayout__SheetZoomFactor'   : 1,
                'VghLantern__ProjectFile__DrawingLayout__ViewCameraStates'  : {}
            },
            'VghLantern__ProjectFile__Lanterns': []
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Create New Project
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__CreateProject(projectCode, projectName, documentName, clientName) {
        var storageKey   =  STORAGE_PREFIX + projectCode;
        var now          =  VghLantern__ProjectFileManager__GetTodayStamp();
        var projectData  =  VghLantern__ProjectFileManager__BuildNewProjectData(projectCode, projectName, documentName, clientName);

        var normalisedCreate  =  VghLantern__ProjectFileManager__NormaliseProjectData(projectData, 'createProject');
        projectData  =  normalisedCreate.projectData || projectData;

        localStorage.setItem(storageKey, JSON.stringify(projectData));       // <-- Write to local cache
        VghLantern__ProjectFileManager__AddToManifest(
            projectCode,
            projectName,
            documentName || projectName + ' Roof Lanterns',
            clientName || '',
            'Draft',
            now,
            now
        );

        VghLantern__ProjectFileManager__ServerWrite('POST', projectCode, projectData, 'manual:createProject'); // <-- Persist to disk async

        console.log('[VghLantern__ProjectFileManager] Project created: ' + projectCode + ' - ' + projectName);
        return projectData;
    }
    // ------------------------------------------------------------


    // FUNCTION | Load Project by Code
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__LoadProject(projectCode) {
        var storageKey  =  STORAGE_PREFIX + projectCode;
        var raw         =  localStorage.getItem(storageKey);
        if (!raw) {
            console.warn('[VghLantern__ProjectFileManager] Project not found in cache: ' + projectCode);
            return null;
        }

        try {
            var projectData     =  JSON.parse(raw);
            var normalisedLoad  =  VghLantern__ProjectFileManager__NormaliseProjectData(projectData, 'loadProject:cache');
            projectData  =  normalisedLoad.projectData || projectData;
            if (normalisedLoad.didMutate) {
                localStorage.setItem(storageKey, JSON.stringify(projectData));   // <-- Repair stale project schema directly in cache
                var metadataAfterNormalise  =  projectData['VghLantern__ProjectFile__Metadata'] || {};
                VghLantern__ProjectFileManager__UpdateManifestEntry(projectCode, metadataAfterNormalise);
            }
            console.log('[VghLantern__ProjectFileManager] Project loaded from cache: ' + projectCode);
            return projectData;
        } catch (e) {
            console.error('[VghLantern__ProjectFileManager] Failed to parse cached project: ' + projectCode, e);
            return null;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Save Project - Write to Cache and Persist to Disk
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__SaveProject(projectData, updateSource) {
        var normalisedSave  =  VghLantern__ProjectFileManager__NormaliseProjectData(projectData, updateSource || 'saveProject');
        projectData  =  normalisedSave.projectData || projectData;

        var metadata  =  projectData['VghLantern__ProjectFile__Metadata'];
        if (!metadata) return Promise.resolve({ ok: false, error: 'Missing project metadata' });

        var projectCode  =  metadata['VghLantern__ProjectFile__Metadata__ProjectCode'];
        var storageKey   =  STORAGE_PREFIX + projectCode;

        metadata['VghLantern__ProjectFile__Metadata__DateModified']  =  VghLantern__ProjectFileManager__GetTodayStamp();

        localStorage.setItem(storageKey, JSON.stringify(projectData));       // <-- Update local cache
        VghLantern__ProjectFileManager__UpdateManifestEntry(projectCode, metadata);

        return VghLantern__ProjectFileManager__ServerWrite('POST', projectCode, projectData, updateSource || 'manual:save')
            .then(function(serverResult) {
                if (serverResult && serverResult.ok) {
                    console.log('[VghLantern__ProjectFileManager] Project saved: ' + projectCode);
                }
                return serverResult;
            });
    }
    // ------------------------------------------------------------


    // FUNCTION | Delete Project - Remove from Cache and Disk
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__DeleteProject(projectCode) {
        var storageKey  =  STORAGE_PREFIX + projectCode;
        localStorage.removeItem(storageKey);                                 // <-- Remove from local cache
        VghLantern__ProjectFileManager__RemoveFromManifest(projectCode);

        VghLantern__ProjectFileManager__ServerWrite('DELETE', projectCode, null, 'manual:deleteProject'); // <-- Delete from disk async

        console.log('[VghLantern__ProjectFileManager] Project deleted: ' + projectCode);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Server Sync and JSON Export
// -----------------------------------------------------------------------------

    // FUNCTION | Sync All Projects from Disk into localStorage Cache
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__SyncFromServer() {
        return fetch(API_BASE)
            .then(function(res) { return res.json(); })
            .then(function(json) {
                if (!json.ok) throw new Error(json.error || 'Unknown error');

                var projects       =  json.data;
                var freshManifest  =  [];
                var loadPromises   =  [];

                for (var i = 0; i < projects.length; i++) {
                    (function(entry) {
                        var promise  =  fetch(API_BASE + '/' + encodeURIComponent(entry.projectCode))
                            .then(function(r) { return r.json(); })
                            .then(function(pJson) {
                                if (!pJson.ok) return;
                                var storageKey         =  STORAGE_PREFIX + entry.projectCode;
                                var diskProjectData    =  pJson.data || null;
                                var normalisedServer   =  VghLantern__ProjectFileManager__NormaliseProjectData(diskProjectData, 'syncFromServer:disk');
                                var mergedProjectData  =  normalisedServer.projectData || diskProjectData;

                                localStorage.setItem(storageKey, JSON.stringify(mergedProjectData)); // <-- Populate cache from disk using normalised schema
                                var metadata  =  mergedProjectData ? mergedProjectData['VghLantern__ProjectFile__Metadata'] : null;
                                if (metadata) {
                                    freshManifest.push(
                                        VghLantern__ProjectFileManager__BuildManifestEntryFromMetadata(entry.projectCode, metadata, entry)
                                    );
                                } else {
                                    freshManifest.push(
                                        VghLantern__ProjectFileManager__BuildManifestEntry(
                                            entry.projectCode,
                                            entry.projectName,
                                            entry.documentName,
                                            entry.clientName,
                                            entry.status,
                                            entry.dateCreated,
                                            entry.dateModified
                                        )
                                    );
                                }
                            });
                        loadPromises.push(promise);
                    })(projects[i]);
                }

                return Promise.all(loadPromises).then(function() {
                    VghLantern__ProjectFileManager__SaveManifest(freshManifest);  // <-- Rebuild manifest from disk
                    console.log('[VghLantern__ProjectFileManager] Synced ' + freshManifest.length + ' project(s) from server.');
                    return freshManifest;
                });
            })
            .catch(function(err) {
                console.warn('[VghLantern__ProjectFileManager] Server sync unavailable - using localStorage cache:', err.message);
                return VghLantern__ProjectFileManager__GetManifest();        // <-- Fall back to existing cache
            });
    }
    // ------------------------------------------------------------


    // FUNCTION | Export Project as JSON File Download
    // ------------------------------------------------------------
    function VghLantern__ProjectFileManager__ExportProjectAsJson(projectData) {
        var metadata  =  projectData['VghLantern__ProjectFile__Metadata'];
        var code      =  metadata['VghLantern__ProjectFile__Metadata__ProjectCode'] || 'unknown';
        var name      =  metadata['VghLantern__ProjectFile__Metadata__ProjectName'] || 'Project';
        var safeName  =  name.replace(/[^a-zA-Z0-9]/g, '_');
        var filename  =  'VghLantern__ProjectFile__' + code + '__' + safeName + '__.json';

        var blob  =  new Blob([JSON.stringify(projectData, null, 4)], { type: 'application/json' });
        var url   =  URL.createObjectURL(blob);
        var link  =  document.createElement('a');
        link.href      =  url;
        link.download  =  filename;
        link.click();
        URL.revokeObjectURL(url);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ProjectFileManager__ListProjects         : VghLantern__ProjectFileManager__ListProjects,
        VghLantern__ProjectFileManager__CreateProject        : VghLantern__ProjectFileManager__CreateProject,
        VghLantern__ProjectFileManager__LoadProject          : VghLantern__ProjectFileManager__LoadProject,
        VghLantern__ProjectFileManager__SaveProject          : VghLantern__ProjectFileManager__SaveProject,
        VghLantern__ProjectFileManager__DeleteProject        : VghLantern__ProjectFileManager__DeleteProject,
        VghLantern__ProjectFileManager__SyncFromServer       : VghLantern__ProjectFileManager__SyncFromServer,
        VghLantern__ProjectFileManager__ExportProjectAsJson  : VghLantern__ProjectFileManager__ExportProjectAsJson
    };

// endregion ===================================================================

})();

window.VghLantern__AppData__ProjectFileManager  =  VghLantern__AppData__ProjectFileManager;
