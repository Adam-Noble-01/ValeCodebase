/* =============================================================================
   VALESPEC - PROJECT FILE MANAGER
   =============================================================================

   FILE       : ValeSpec__AppData__ProjectFileManager__.js
   NAMESPACE  : ValeSpec
   MODULE     : AppData - ProjectFileManager
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Project CRUD operations using localStorage persistence
   CREATED    : 2026

   DESCRIPTION:
   - Creates, loads, saves, and deletes project files
   - Uses localStorage for persistence in v0.1.0 (static site)
   - Provides import/export for manual JSON file management
   - Maintains a project manifest for listing available projects

   ============================================================================= */

// =============================================================================
// REGION | Project File Manager Module
// =============================================================================

const ValeSpec__AppData__ProjectFileManager = (function() {

    // MODULE CONSTANTS | Storage Keys
    // ------------------------------------------------------------
    const STORAGE_PREFIX     =  'ValeSpec__Project__';
    const MANIFEST_KEY       =  'ValeSpec__ProjectManifest';
    // ------------------------------------------------------------


    // FUNCTION | List All Projects
    // ------------------------------------------------------------
    function listProjects() {
        var manifest  =  _getManifest();
        return manifest;
    }
    // ------------------------------------------------------------


    // FUNCTION | Create New Project
    // ------------------------------------------------------------
    function createProject(projectCode, projectName, documentName) {
        var storageKey  =  STORAGE_PREFIX + projectCode;

        var now  =  new Date().toISOString().split('T')[0];

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

        localStorage.setItem(storageKey, JSON.stringify(projectData));
        _addToManifest(projectCode, projectName, documentName || projectName + ' Doors', now);

        console.log('[ValeSpec__ProjectFileManager] Project created: ' + projectCode + ' - ' + projectName);
        return projectData;
    }
    // ------------------------------------------------------------


    // FUNCTION | Load Project by Code
    // ------------------------------------------------------------
    function loadProject(projectCode) {
        var storageKey  =  STORAGE_PREFIX + projectCode;
        var raw         =  localStorage.getItem(storageKey);
        if (!raw) {
            console.warn('[ValeSpec__ProjectFileManager] Project not found: ' + projectCode);
            return null;
        }

        try {
            var projectData  =  JSON.parse(raw);
            console.log('[ValeSpec__ProjectFileManager] Project loaded: ' + projectCode);
            return projectData;
        } catch (e) {
            console.error('[ValeSpec__ProjectFileManager] Failed to parse project: ' + projectCode, e);
            return null;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Save Project
    // ------------------------------------------------------------
    function saveProject(projectData) {
        var metadata     =  projectData['ValeSpec__ProjectFile__Metadata'];
        if (!metadata) return false;

        var projectCode  =  metadata['ValeSpec__ProjectFile__Metadata__ProjectCode'];
        var storageKey   =  STORAGE_PREFIX + projectCode;

        metadata['ValeSpec__ProjectFile__Metadata__DateModified']  =  new Date().toISOString().split('T')[0];

        localStorage.setItem(storageKey, JSON.stringify(projectData));
        _updateManifestEntry(projectCode, metadata);

        console.log('[ValeSpec__ProjectFileManager] Project saved: ' + projectCode);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Delete Project
    // ------------------------------------------------------------
    function deleteProject(projectCode) {
        var storageKey  =  STORAGE_PREFIX + projectCode;
        localStorage.removeItem(storageKey);
        _removeFromManifest(projectCode);

        console.log('[ValeSpec__ProjectFileManager] Project deleted: ' + projectCode);
    }
    // ------------------------------------------------------------


    // FUNCTION | Export Project as JSON File Download
    // ------------------------------------------------------------
    function exportProjectAsJson(projectData) {
        var metadata      =  projectData['ValeSpec__ProjectFile__Metadata'];
        var code          =  metadata['ValeSpec__ProjectFile__Metadata__ProjectCode'] || 'unknown';
        var name          =  metadata['ValeSpec__ProjectFile__Metadata__ProjectName'] || 'Project';
        var safeName      =  name.replace(/[^a-zA-Z0-9]/g, '_');
        var filename      =  'ValeSpec__ProjectFile__' + code + '__' + safeName + '__.json';

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
    function importProjectFromJson(file) {
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
                    _addToManifest(
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


    // HELPER FUNCTION | Get Manifest from localStorage
    // ------------------------------------------------------------
    function _getManifest() {
        var raw  =  localStorage.getItem(MANIFEST_KEY);
        if (!raw) return [];
        try { return JSON.parse(raw); }
        catch (e) { return []; }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Save Manifest to localStorage
    // ------------------------------------------------------------
    function _saveManifest(manifest) {
        localStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Add Entry to Manifest
    // ------------------------------------------------------------
    function _addToManifest(code, name, docName, dateCreated) {
        var manifest  =  _getManifest();
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
        _saveManifest(manifest);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update Manifest Entry from Metadata
    // ------------------------------------------------------------
    function _updateManifestEntry(code, metadata) {
        var manifest  =  _getManifest();
        var idx       =  manifest.findIndex(function(p) { return p.projectCode === code; });
        if (idx < 0) return;

        manifest[idx].projectName   =  metadata['ValeSpec__ProjectFile__Metadata__ProjectName'];
        manifest[idx].documentName  =  metadata['ValeSpec__ProjectFile__Metadata__DocumentName'];
        manifest[idx].dateModified  =  metadata['ValeSpec__ProjectFile__Metadata__DateModified'];
        _saveManifest(manifest);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Remove Entry from Manifest
    // ------------------------------------------------------------
    function _removeFromManifest(code) {
        var manifest  =  _getManifest();
        manifest      =  manifest.filter(function(p) { return p.projectCode !== code; });
        _saveManifest(manifest);
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        listProjects            : listProjects,
        createProject           : createProject,
        loadProject             : loadProject,
        saveProject             : saveProject,
        deleteProject           : deleteProject,
        exportProjectAsJson     : exportProjectAsJson,
        importProjectFromJson   : importProjectFromJson
    };

})();

// endregion ===================================================================

window.ValeSpec__AppData__ProjectFileManager  =  ValeSpec__AppData__ProjectFileManager;
