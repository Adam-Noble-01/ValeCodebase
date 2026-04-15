/* =============================================================================
   VALESPEC - PROJECT FILE MANAGER
   =============================================================================

   FILE       : ValeSpec__AppData__ProjectFileManager__.js
   NAMESPACE  : ValeSpec
   MODULE     : AppData - ProjectFileManager
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Project CRUD operations with server-backed disk persistence
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Creates, loads, saves, and deletes project files
   - Primary storage: server API writing JSON files to 04__LocalProjectData/
   - Fast read cache: localStorage mirrors server data for synchronous access
   - syncFromServer() fetches all projects from disk and rebuilds the cache
   - Provides export for manual JSON file download
   - IMPORTANT: all create/load/save/sync paths normalise project JSON via AppUtils ProjectSchemaValidator
   - IMPORTANT: do not add IO paths that bypass schema normalisation

   ============================================================================= */

// =============================================================================
// REGION | Project File Manager Module
// =============================================================================

const ValeSpec__AppData__ProjectFileManager = (function() {

    // MODULE CONSTANTS | Storage Keys and API Base
    // ------------------------------------------------------------
    const STORAGE_PREFIX  =  'ValeSpec__Project__';
    const MANIFEST_KEY    =  'ValeSpec__ProjectManifest';
    const API_BASE        =  '/api/projects';          // <-- Server project API root
    // ------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Manifest Read and Write Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get Manifest from localStorage
    // ------------------------------------------------------------
    function ValeSpec__ProjectFileManager__GetManifest() {
        var raw  =  localStorage.getItem(MANIFEST_KEY);
        if (!raw) return [];
        try { return JSON.parse(raw); }
        catch (e) { return []; }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Save Manifest to localStorage
    // ------------------------------------------------------------
    function ValeSpec__ProjectFileManager__SaveManifest(manifest) {
        localStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Normalized Manifest Entry Object
    // ------------------------------------------------------------
    function ValeSpec__ProjectFileManager__BuildManifestEntry(code, name, docName, status, dateCreated, dateModified) {
        var safeStatus       =  (typeof status === 'string' && status.trim()) ? status.trim() : 'Draft';
        var safeDateCreated  =  dateCreated || '';
        var safeDateModified =  dateModified || safeDateCreated || new Date().toISOString().split('T')[0];

        return {
            projectCode   : code     || '',
            projectName   : name     || '',
            documentName  : docName  || '',
            status        : safeStatus,
            dateCreated   : safeDateCreated,
            dateModified  : safeDateModified
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Manifest Entry from Project Metadata
    // ------------------------------------------------------------
    function ValeSpec__ProjectFileManager__BuildManifestEntryFromMetadata(code, metadata, fallbackEntry) {
        var fallback      =  fallbackEntry || {};
        var projectName   =  metadata['ValeSpec__ProjectFile__Metadata__ProjectName']    || fallback.projectName;
        var documentName  =  metadata['ValeSpec__ProjectFile__Metadata__DocumentName']   || fallback.documentName;
        var status        =  metadata['ValeSpec__ProjectFile__Metadata__DocumentStatus'] || fallback.status;
        var dateCreated   =  metadata['ValeSpec__ProjectFile__Metadata__DateCreated']    || fallback.dateCreated;
        var dateModified  =  metadata['ValeSpec__ProjectFile__Metadata__DateModified']   || fallback.dateModified;

        return ValeSpec__ProjectFileManager__BuildManifestEntry(code, projectName, documentName, status, dateCreated, dateModified);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Normalise Project Data to Current Schema
    // ------------------------------------------------------------
    function ValeSpec__ProjectFileManager__NormaliseProjectData(projectData, sourceLabel) {
        var SchemaValidator  =  window.ValeSpec__AppUtils__ProjectSchemaValidator;
        if (!SchemaValidator || !SchemaValidator.ValeSpec__SchemaValidator__ValidateAndNormaliseProject) return { projectData: projectData, didMutate: false };

        var result  =  SchemaValidator.ValeSpec__SchemaValidator__ValidateAndNormaliseProject(projectData, sourceLabel);
        if (!result || !result.ProjectData) return { projectData: projectData, didMutate: false };

        if (result.DidMutate) {
            console.log('[ValeSpec__ProjectFileManager] Schema normalised for source:', sourceLabel || 'unknown');
        }

        return { projectData: result.ProjectData, didMutate: !!result.DidMutate };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Add Entry to Manifest
    // ------------------------------------------------------------
    function ValeSpec__ProjectFileManager__AddToManifest(code, name, docName, status, dateCreated, dateModified) {
        var manifest  =  ValeSpec__ProjectFileManager__GetManifest();
        var existing  =  manifest.findIndex(function(p) { return p.projectCode === code; });
        var previous  =  existing >= 0 ? manifest[existing] : null;
        var entry     =  ValeSpec__ProjectFileManager__BuildManifestEntry(code, name, docName, status, dateCreated, dateModified);

        if (previous) {
            if (!entry.projectName)  entry.projectName   =  previous.projectName   || '';
            if (!entry.documentName) entry.documentName  =  previous.documentName  || '';
            if (!entry.dateCreated)  entry.dateCreated   =  previous.dateCreated   || '';
        }

        if (existing >= 0) {
            manifest[existing]  =  entry;
        } else {
            manifest.push(entry);
        }
        ValeSpec__ProjectFileManager__SaveManifest(manifest);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update Manifest Entry from Metadata
    // ------------------------------------------------------------
    function ValeSpec__ProjectFileManager__UpdateManifestEntry(code, metadata) {
        var manifest  =  ValeSpec__ProjectFileManager__GetManifest();
        var idx       =  manifest.findIndex(function(p) { return p.projectCode === code; });
        if (idx < 0) return;

        manifest[idx]  =  ValeSpec__ProjectFileManager__BuildManifestEntryFromMetadata(code, metadata || {}, manifest[idx]);
        ValeSpec__ProjectFileManager__SaveManifest(manifest);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Hydrate Manifest Entry from Cached Project Metadata
    // ------------------------------------------------------------
    function ValeSpec__ProjectFileManager__HydrateManifestEntryFromCache(entry) {
        var source      =  entry || {};
        var projectCode =  source.projectCode || '';
        if (!projectCode) {
            return ValeSpec__ProjectFileManager__BuildManifestEntry(
                '',
                source.projectName,
                source.documentName,
                source.status,
                source.dateCreated,
                source.dateModified
            );
        }

        var storageKey    =  STORAGE_PREFIX + projectCode;
        var cachedProject =  null;
        var metadata      =  null;
        try {
            cachedProject  =  JSON.parse(localStorage.getItem(storageKey) || 'null');
            metadata       =  cachedProject ? cachedProject['ValeSpec__ProjectFile__Metadata'] : null;
        } catch (e) {
            metadata  =  null;
        }

        if (metadata) {
            return ValeSpec__ProjectFileManager__BuildManifestEntryFromMetadata(projectCode, metadata, source);
        }

        return ValeSpec__ProjectFileManager__BuildManifestEntry(
            projectCode,
            source.projectName,
            source.documentName,
            source.status,
            source.dateCreated,
            source.dateModified
        );
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Compare Two Manifest Entries
    // ------------------------------------------------------------
    function ValeSpec__ProjectFileManager__ManifestEntriesMatch(a, b) {
        var left   =  a || {};
        var right  =  b || {};
        return (
            (left.projectCode  || '')      === (right.projectCode  || '')      &&
            (left.projectName  || '')      === (right.projectName  || '')      &&
            (left.documentName || '')      === (right.documentName || '')      &&
            (left.status       || 'Draft') === (right.status       || 'Draft') &&
            (left.dateCreated  || '')      === (right.dateCreated  || '')      &&
            (left.dateModified || '')      === (right.dateModified || '')
        );
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Remove Entry from Manifest
    // ------------------------------------------------------------
    function ValeSpec__ProjectFileManager__RemoveFromManifest(code) {
        var manifest  =  ValeSpec__ProjectFileManager__GetManifest();
        manifest      =  manifest.filter(function(p) { return p.projectCode !== code; });
        ValeSpec__ProjectFileManager__SaveManifest(manifest);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Server API Communication
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | POST or DELETE to Server API and Return Result
    // ------------------------------------------------------------
    function ValeSpec__ProjectFileManager__ServerWrite(method, projectCode, bodyData, updateSource) {
        var url   =  API_BASE + '/' + encodeURIComponent(projectCode);
        var opts  =  {
            method  :  method,
            headers :  {
                'Content-Type'            : 'application/json',
                'X-ValeSpec-UpdateSource' : updateSource || 'unspecified'
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
                    console.error('[ValeSpec__ProjectFileManager] Server ' + method + ' failed for ' + projectCode + ':', errorText);
                    return { ok: false, error: errorText };
                }
                return { ok: true };
            })
            .catch(function(err) {
                console.warn('[ValeSpec__ProjectFileManager] Server ' + method + ' unreachable for ' + projectCode + ' (localStorage-only fallback):', err.message);
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
    function ValeSpec__ProjectFileManager__ListProjects() {
        var manifest        =  ValeSpec__ProjectFileManager__GetManifest();
        var repaired        =  [];
        var needsWriteback  =  false;

        for (var i = 0; i < manifest.length; i++) {
            var sourceEntry  =  manifest[i] || {};
            var hydrated     =  ValeSpec__ProjectFileManager__HydrateManifestEntryFromCache(sourceEntry);
            repaired.push(hydrated);

            if (!ValeSpec__ProjectFileManager__ManifestEntriesMatch(sourceEntry, hydrated)) {
                needsWriteback  =  true;                                         // <-- Repair stale/missing manifest fields (status/date/name) in-place
            }
        }

        if (needsWriteback) {
            ValeSpec__ProjectFileManager__SaveManifest(repaired);
        }

        return repaired;
    }
    // ------------------------------------------------------------


    // FUNCTION | Create New Project
    // ------------------------------------------------------------
    function ValeSpec__ProjectFileManager__CreateProject(projectCode, projectName, documentName) {
        var storageKey  =  STORAGE_PREFIX + projectCode;
        var now         =  new Date().toISOString().split('T')[0];

        var projectData  =  {
            'ValeSpec__ProjectFile__Metadata': {
                'ValeSpec__ProjectFile__Metadata__Description'     : 'Project identity and document tracking metadata.',
                'ValeSpec__ProjectFile__Metadata__ProjectCode'     : projectCode,
                'ValeSpec__ProjectFile__Metadata__ProjectName'     : projectName,
                'ValeSpec__ProjectFile__Metadata__DocumentName'    : documentName || projectName + ' Doors',
                'ValeSpec__ProjectFile__Metadata__DocumentStatus'  : 'Draft',
                'ValeSpec__ProjectFile__Metadata__DateCreated'     : now,
                'ValeSpec__ProjectFile__Metadata__DateModified'    : now,
                'ValeSpec__ProjectFile__Metadata__RevisionCode'    : 'A'
            },
            'ValeSpec__ProjectFile__GlobalSettings': {
                'ValeSpec__ProjectFile__GlobalSettings__Description'        : 'Document-wide settings that cascade to all assemblies.',
                'ValeSpec__ProjectFile__GlobalSettings__IronmongeryFinish'  : 'Unlacquered Brass',
                'ValeSpec__ProjectFile__GlobalSettings__LeverType'          : 'Scroll',
                'ValeSpec__ProjectFile__GlobalSettings__JobNotes'           : ''
            },
            'ValeSpec__ProjectFile__Assemblies': []
        };

        var normalisedCreate  =  ValeSpec__ProjectFileManager__NormaliseProjectData(projectData, 'createProject');
        projectData  =  normalisedCreate.projectData || projectData;

        localStorage.setItem(storageKey, JSON.stringify(projectData));                              // <-- Write to local cache
        ValeSpec__ProjectFileManager__AddToManifest(
            projectCode,
            projectName,
            documentName || projectName + ' Doors',
            'Draft',
            now,
            now
        );

        ValeSpec__ProjectFileManager__ServerWrite('POST', projectCode, projectData, 'manual:createProject'); // <-- Persist to disk async

        console.log('[ValeSpec__ProjectFileManager] Project created: ' + projectCode + ' - ' + projectName);
        return projectData;
    }
    // ------------------------------------------------------------


    // FUNCTION | Load Project by Code
    // ------------------------------------------------------------
    function ValeSpec__ProjectFileManager__LoadProject(projectCode) {
        var storageKey  =  STORAGE_PREFIX + projectCode;
        var raw         =  localStorage.getItem(storageKey);
        if (!raw) {
            console.warn('[ValeSpec__ProjectFileManager] Project not found in cache: ' + projectCode);
            return null;
        }

        try {
            var projectData  =  JSON.parse(raw);
            var normalisedLoad  =  ValeSpec__ProjectFileManager__NormaliseProjectData(projectData, 'loadProject:cache');
            projectData  =  normalisedLoad.projectData || projectData;
            if (normalisedLoad.didMutate) {
                localStorage.setItem(storageKey, JSON.stringify(projectData));                      // <-- Repair stale project schema directly in cache
                var metadataAfterNormalise  =  projectData['ValeSpec__ProjectFile__Metadata'] || {};
                ValeSpec__ProjectFileManager__UpdateManifestEntry(projectCode, metadataAfterNormalise);
            }
            console.log('[ValeSpec__ProjectFileManager] Project loaded from cache: ' + projectCode);
            return projectData;
        } catch (e) {
            console.error('[ValeSpec__ProjectFileManager] Failed to parse cached project: ' + projectCode, e);
            return null;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Save Project — write to localStorage cache and persist to disk
    // ------------------------------------------------------------
    function ValeSpec__ProjectFileManager__SaveProject(projectData, updateSource) {
        var normalisedSave  =  ValeSpec__ProjectFileManager__NormaliseProjectData(projectData, updateSource || 'saveProject');
        projectData  =  normalisedSave.projectData || projectData;

        var metadata  =  projectData['ValeSpec__ProjectFile__Metadata'];
        if (!metadata) return Promise.resolve({ ok: false, error: 'Missing project metadata' });

        var projectCode  =  metadata['ValeSpec__ProjectFile__Metadata__ProjectCode'];
        var storageKey   =  STORAGE_PREFIX + projectCode;

        metadata['ValeSpec__ProjectFile__Metadata__DateModified']  =  new Date().toISOString().split('T')[0];

        localStorage.setItem(storageKey, JSON.stringify(projectData));                              // <-- Update local cache
        ValeSpec__ProjectFileManager__UpdateManifestEntry(projectCode, metadata);

        return ValeSpec__ProjectFileManager__ServerWrite('POST', projectCode, projectData, updateSource || 'manual:save') // <-- Persist to disk async
            .then(function(serverResult) {
                if (serverResult && serverResult.ok) {
                    console.log('[ValeSpec__ProjectFileManager] Project saved: ' + projectCode);
                }
                return serverResult;
            });
    }
    // ------------------------------------------------------------


    // FUNCTION | Delete Project — remove from cache and disk
    // ------------------------------------------------------------
    function ValeSpec__ProjectFileManager__DeleteProject(projectCode) {
        var storageKey  =  STORAGE_PREFIX + projectCode;
        localStorage.removeItem(storageKey);                                                        // <-- Remove from local cache
        ValeSpec__ProjectFileManager__RemoveFromManifest(projectCode);

        ValeSpec__ProjectFileManager__ServerWrite('DELETE', projectCode, null, 'manual:deleteProject'); // <-- Delete from disk async

        console.log('[ValeSpec__ProjectFileManager] Project deleted: ' + projectCode);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Server Sync and JSON Export
// -----------------------------------------------------------------------------

    // FUNCTION | Sync All Projects from Disk into localStorage Cache
    // ------------------------------------------------------------
    function ValeSpec__ProjectFileManager__SyncFromServer() {
        return fetch(API_BASE)
            .then(function(res) { return res.json(); })
            .then(function(json) {
                if (!json.ok) throw new Error(json.error || 'Unknown error');

                var projects  =  json.data;

                var freshManifest  =  [];
                var loadPromises   =  [];

                for (var i = 0; i < projects.length; i++) {
                    (function(entry) {
                        var promise  =  fetch(API_BASE + '/' + encodeURIComponent(entry.projectCode))
                            .then(function(r) { return r.json(); })
                            .then(function(pJson) {
                                if (!pJson.ok) return;
                                var storageKey  =  STORAGE_PREFIX + entry.projectCode;
                                var diskProjectData  =  pJson.data || null;
                                var normalisedServer  =  ValeSpec__ProjectFileManager__NormaliseProjectData(diskProjectData, 'syncFromServer:disk');
                                var mergedProjectData =  normalisedServer.projectData || diskProjectData;

                                localStorage.setItem(storageKey, JSON.stringify(mergedProjectData)); // <-- Populate cache from disk using normalised schema
                                var metadata  =  mergedProjectData ? mergedProjectData['ValeSpec__ProjectFile__Metadata'] : null;
                                if (metadata) {
                                    freshManifest.push(
                                        ValeSpec__ProjectFileManager__BuildManifestEntryFromMetadata(entry.projectCode, metadata, entry)
                                    );
                                } else {
                                    freshManifest.push(
                                        ValeSpec__ProjectFileManager__BuildManifestEntry(
                                            entry.projectCode,
                                            entry.projectName,
                                            entry.documentName,
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
                    ValeSpec__ProjectFileManager__SaveManifest(freshManifest);                      // <-- Rebuild manifest from disk
                    console.log('[ValeSpec__ProjectFileManager] Synced ' + freshManifest.length + ' project(s) from server.');
                    return freshManifest;
                });
            })
            .catch(function(err) {
                console.warn('[ValeSpec__ProjectFileManager] Server sync unavailable — using localStorage cache:', err.message);
                return ValeSpec__ProjectFileManager__GetManifest();                                 // <-- Fall back to existing cache
            });
    }
    // ------------------------------------------------------------


    // FUNCTION | Export Project as JSON File Download
    // ------------------------------------------------------------
    function ValeSpec__ProjectFileManager__ExportProjectAsJson(projectData) {
        var metadata  =  projectData['ValeSpec__ProjectFile__Metadata'];
        var code      =  metadata['ValeSpec__ProjectFile__Metadata__ProjectCode'] || 'unknown';
        var name      =  metadata['ValeSpec__ProjectFile__Metadata__ProjectName'] || 'Project';
        var safeName  =  name.replace(/[^a-zA-Z0-9]/g, '_');
        var filename  =  'ValeSpec__ProjectFile__' + code + '__' + safeName + '__.json';

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
        ValeSpec__ProjectFileManager__ListProjects          : ValeSpec__ProjectFileManager__ListProjects,
        ValeSpec__ProjectFileManager__CreateProject         : ValeSpec__ProjectFileManager__CreateProject,
        ValeSpec__ProjectFileManager__LoadProject           : ValeSpec__ProjectFileManager__LoadProject,
        ValeSpec__ProjectFileManager__SaveProject           : ValeSpec__ProjectFileManager__SaveProject,
        ValeSpec__ProjectFileManager__DeleteProject         : ValeSpec__ProjectFileManager__DeleteProject,
        ValeSpec__ProjectFileManager__SyncFromServer        : ValeSpec__ProjectFileManager__SyncFromServer,
        ValeSpec__ProjectFileManager__ExportProjectAsJson   : ValeSpec__ProjectFileManager__ExportProjectAsJson
    };

// endregion ===================================================================

})();

window.ValeSpec__AppData__ProjectFileManager  =  ValeSpec__AppData__ProjectFileManager;
