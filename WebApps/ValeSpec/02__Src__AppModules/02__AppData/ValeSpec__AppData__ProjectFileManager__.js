/* =============================================================================
   VALESPEC - PROJECT FILE MANAGER
   =============================================================================

   FILE       : ValeSpec__AppData__ProjectFileManager__.js
   NAMESPACE  : ValeSpec
   MODULE     : AppData - ProjectFileManager
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Project CRUD operations with server-backed disk persistence
   CREATED    : 2026

   DESCRIPTION:
   - Creates, loads, saves, and deletes project files
   - Primary storage: server API writing JSON files to 04__LocalProjectData/
   - Fast read cache: localStorage mirrors server data for synchronous access
   - syncFromServer() fetches all projects from disk and rebuilds the cache
   - Provides import/export for manual JSON file management

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


    // HELPER FUNCTION | Add Entry to Manifest
    // ------------------------------------------------------------
    function ValeSpec__ProjectFileManager__AddToManifest(code, name, docName, dateCreated) {
        var manifest  =  ValeSpec__ProjectFileManager__GetManifest();
        var existing  =  manifest.findIndex(function(p) { return p.projectCode === code; });
        var entry     =  {
            projectCode    : code,
            projectName    : name,
            documentName   : docName,
            dateCreated    : dateCreated,
            dateModified   : new Date().toISOString().split('T')[0]
        };

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

        manifest[idx].projectName   =  metadata['ValeSpec__ProjectFile__Metadata__ProjectName'];
        manifest[idx].documentName  =  metadata['ValeSpec__ProjectFile__Metadata__DocumentName'];
        manifest[idx].dateModified  =  metadata['ValeSpec__ProjectFile__Metadata__DateModified'];
        ValeSpec__ProjectFileManager__SaveManifest(manifest);
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


    // HELPER FUNCTION | POST or DELETE to Server API and Return Result
    // ------------------------------------------------------------
    function ValeSpec__ProjectFileManager__ServerWrite(method, projectCode, bodyData) {
        var url   =  API_BASE + '/' + encodeURIComponent(projectCode);
        var opts  =  { method: method, headers: { 'Content-Type': 'application/json' } };
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


    // FUNCTION | List All Projects
    // ------------------------------------------------------------
    function ValeSpec__ProjectFileManager__ListProjects() {
        return ValeSpec__ProjectFileManager__GetManifest();
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
                'ValeSpec__ProjectFile__GlobalSettings__Description'          : 'Document-wide settings that cascade to all assemblies.',
                'ValeSpec__ProjectFile__GlobalSettings__IronmongeryFinish'    : 'Unlacquered Brass',
                'ValeSpec__ProjectFile__GlobalSettings__LeverType'            : 'Scroll',
                'ValeSpec__ProjectFile__GlobalSettings__JobNotes'             : ''
            },
            'ValeSpec__ProjectFile__Assemblies': []
        };

        localStorage.setItem(storageKey, JSON.stringify(projectData));                              // <-- Write to local cache
        ValeSpec__ProjectFileManager__AddToManifest(projectCode, projectName, documentName || projectName + ' Doors', now);

        ValeSpec__ProjectFileManager__ServerWrite('POST', projectCode, projectData);                // <-- Persist to disk async

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
    function ValeSpec__ProjectFileManager__SaveProject(projectData) {
        var metadata  =  projectData['ValeSpec__ProjectFile__Metadata'];
        if (!metadata) return Promise.resolve({ ok: false, error: 'Missing project metadata' });

        var projectCode  =  metadata['ValeSpec__ProjectFile__Metadata__ProjectCode'];
        var storageKey   =  STORAGE_PREFIX + projectCode;

        metadata['ValeSpec__ProjectFile__Metadata__DateModified']  =  new Date().toISOString().split('T')[0];

        localStorage.setItem(storageKey, JSON.stringify(projectData));                              // <-- Update local cache
        ValeSpec__ProjectFileManager__UpdateManifestEntry(projectCode, metadata);

        return ValeSpec__ProjectFileManager__ServerWrite('POST', projectCode, projectData)          // <-- Persist to disk async
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

        ValeSpec__ProjectFileManager__ServerWrite('DELETE', projectCode, null);                     // <-- Delete from disk async

        console.log('[ValeSpec__ProjectFileManager] Project deleted: ' + projectCode);
    }
    // ------------------------------------------------------------


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
                                localStorage.setItem(storageKey, JSON.stringify(pJson.data));       // <-- Populate cache from disk
                                freshManifest.push(entry);
                            });
                        loadPromises.push(promise);
                    })(projects[i]);
                }

                return Promise.all(loadPromises).then(function() {
                    localStorage.setItem(MANIFEST_KEY, JSON.stringify(freshManifest));              // <-- Rebuild manifest from disk
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


    // FUNCTION | Import Project from JSON File
    // ------------------------------------------------------------
    function ValeSpec__ProjectFileManager__ImportProjectFromJson(file) {
        return new Promise(function(resolve, reject) {
            var reader  =  new FileReader();
            reader.onload  =  function(e) {
                try {
                    var projectData  =  JSON.parse(e.target.result);
                    if (!projectData['ValeSpec__ProjectFile__Metadata']) {
                        reject(new Error('Invalid project file: missing metadata'));
                        return;
                    }

                    var metadata     =  projectData['ValeSpec__ProjectFile__Metadata'];
                    var projectCode  =  metadata['ValeSpec__ProjectFile__Metadata__ProjectCode'];
                    var storageKey   =  STORAGE_PREFIX + projectCode;

                    localStorage.setItem(storageKey, JSON.stringify(projectData));
                    ValeSpec__ProjectFileManager__AddToManifest(
                        projectCode,
                        metadata['ValeSpec__ProjectFile__Metadata__ProjectName'],
                        metadata['ValeSpec__ProjectFile__Metadata__DocumentName'],
                        metadata['ValeSpec__ProjectFile__Metadata__DateCreated']
                    );

                    resolve(projectData);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror  =  function() { reject(new Error('File read failed')); };
            reader.readAsText(file);
        });
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__ProjectFileManager__ListProjects          : ValeSpec__ProjectFileManager__ListProjects,
        ValeSpec__ProjectFileManager__CreateProject         : ValeSpec__ProjectFileManager__CreateProject,
        ValeSpec__ProjectFileManager__LoadProject           : ValeSpec__ProjectFileManager__LoadProject,
        ValeSpec__ProjectFileManager__SaveProject           : ValeSpec__ProjectFileManager__SaveProject,
        ValeSpec__ProjectFileManager__DeleteProject         : ValeSpec__ProjectFileManager__DeleteProject,
        ValeSpec__ProjectFileManager__SyncFromServer        : ValeSpec__ProjectFileManager__SyncFromServer,
        ValeSpec__ProjectFileManager__ExportProjectAsJson   : ValeSpec__ProjectFileManager__ExportProjectAsJson,
        ValeSpec__ProjectFileManager__ImportProjectFromJson : ValeSpec__ProjectFileManager__ImportProjectFromJson
    };

})();

// endregion ===================================================================

window.ValeSpec__AppData__ProjectFileManager  =  ValeSpec__AppData__ProjectFileManager;
