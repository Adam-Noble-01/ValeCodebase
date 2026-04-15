/* =============================================================================
   VALESPEC - HARDWARE INDEX LOADER
   =============================================================================

   FILE       : ValeSpec__AppData__HardwareIndexLoader__.js
   NAMESPACE  : ValeSpec
   MODULE     : AppData - HardwareIndexLoader
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Fetch, cache, and query the hardware data index
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Fetches ValeSpec__HardwareDataIndex__.json via fetch()
   - Caches the parsed index in StateManager
   - Provides lookup functions by code, type, and name
   - Supports filtering for lever handles and other hardware categories

   ============================================================================= */

// =============================================================================
// REGION | Hardware Index Loader Module
// =============================================================================

const ValeSpec__AppData__HardwareIndexLoader = (function() {

    // MODULE VARIABLES | Cached Index Data
    // ------------------------------------------------------------
    let ValeSpec__HardwareIndexLoader__IndexData  =  null;
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Root Index Object
    // ------------------------------------------------------------
    function ValeSpec__HardwareIndexLoader__GetRoot() {
        if (!ValeSpec__HardwareIndexLoader__IndexData) return null;
        return ValeSpec__HardwareIndexLoader__IndexData['ValeSpec__Data__HardwareIndex__'] || ValeSpec__HardwareIndexLoader__IndexData;
    }
    // ------------------------------------------------------------


    // FUNCTION | Load Hardware Index from JSON File
    // ------------------------------------------------------------
    async function ValeSpec__HardwareIndexLoader__LoadIndex(indexPath) {
        try {
            var response  =  await fetch(indexPath);
            if (!response.ok) throw new Error('Hardware index fetch failed: ' + response.status);

            ValeSpec__HardwareIndexLoader__IndexData  =  await response.json();

            var root  =  ValeSpec__HardwareIndexLoader__GetRoot();

            if (window.ValeSpec__AppCore__StateManager) {
                window.ValeSpec__AppCore__StateManager.ValeSpec__StateManager__SetHardwareIndex(root);
            }

            var itemCount  =  Object.keys(root).length;
            console.log('[ValeSpec__HardwareIndexLoader] Hardware index loaded: ' + itemCount + ' items');

            return root;

        } catch (e) {
            console.warn('[ValeSpec__HardwareIndexLoader] Failed to load hardware index:', e.message);
            return null;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Load Full Vector Data for All Index Entries
    // ------------------------------------------------------------
    async function ValeSpec__HardwareIndexLoader__LoadVectorData() {
        var root  =  ValeSpec__HardwareIndexLoader__GetRoot();
        if (!root) return;

        var keys    =  Object.keys(root);
        var loaded  =  0;

        for (var i = 0; i < keys.length; i++) {
            var item  =  root[keys[i]];
            if (!item || item['HardwareItem__VectorData']) continue;

            var dataFileUrl  =  item['HardwareItem__DataFile'];
            if (!dataFileUrl) continue;

            try {
                var localPath  =  dataFileUrl;
                var ghPrefix   =  'https://adam-noble-01.github.io/ValeCodebase/WebApps/ValeSpec/';
                if (dataFileUrl.indexOf(ghPrefix) === 0) {
                    localPath  =  dataFileUrl.substring(ghPrefix.length);
                }

                var resp  =  await fetch(localPath);
                if (!resp.ok) continue;

                var fullData  =  await resp.json();
                if (fullData['HardwareItem__VectorData']) {
                    item['HardwareItem__VectorData']  =  fullData['HardwareItem__VectorData'];
                    loaded++;
                }
            } catch (e) {
                console.warn('[ValeSpec__HardwareIndexLoader] Could not load vector data for ' + keys[i] + ':', e.message);
            }
        }

        if (window.ValeSpec__AppCore__StateManager) {
            window.ValeSpec__AppCore__StateManager.ValeSpec__StateManager__SetHardwareIndex(root);
        }

        console.log('[ValeSpec__HardwareIndexLoader] Vector data loaded for ' + loaded + ' of ' + keys.length + ' items');
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Hardware Item by Code
    // ------------------------------------------------------------
    function ValeSpec__HardwareIndexLoader__GetHardwareByCode(code) {
        var root  =  ValeSpec__HardwareIndexLoader__GetRoot();
        if (!root) return null;
        var keys  =  Object.keys(root);
        for (var i = 0; i < keys.length; i++) {
            var item  =  root[keys[i]];
            if (item['HardwareItem__Code'] === code) return item;
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Hardware Items by Type
    // ------------------------------------------------------------
    function ValeSpec__HardwareIndexLoader__GetHardwareByType(type) {
        var root    =  ValeSpec__HardwareIndexLoader__GetRoot();
        if (!root) return [];
        var result  =  [];
        var keys    =  Object.keys(root);
        for (var i = 0; i < keys.length; i++) {
            var item  =  root[keys[i]];
            if (item['HardwareItem__Type'] === type) result.push(item);
        }
        return result;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get All Lever Handles
    // ------------------------------------------------------------
    function ValeSpec__HardwareIndexLoader__GetAllLeverHandles() {
        return ValeSpec__HardwareIndexLoader__GetHardwareByType('Door Handle');
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Hardware Item by Name
    // ------------------------------------------------------------
    function ValeSpec__HardwareIndexLoader__GetHardwareByName(name) {
        var root  =  ValeSpec__HardwareIndexLoader__GetRoot();
        if (!root) return null;
        return root[name] || null;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__HardwareIndexLoader__LoadIndex           : ValeSpec__HardwareIndexLoader__LoadIndex,
        ValeSpec__HardwareIndexLoader__LoadVectorData      : ValeSpec__HardwareIndexLoader__LoadVectorData,
        ValeSpec__HardwareIndexLoader__GetHardwareByCode   : ValeSpec__HardwareIndexLoader__GetHardwareByCode,
        ValeSpec__HardwareIndexLoader__GetHardwareByType   : ValeSpec__HardwareIndexLoader__GetHardwareByType,
        ValeSpec__HardwareIndexLoader__GetHardwareByName   : ValeSpec__HardwareIndexLoader__GetHardwareByName,
        ValeSpec__HardwareIndexLoader__GetAllLeverHandles  : ValeSpec__HardwareIndexLoader__GetAllLeverHandles
    };

})();

// endregion ===================================================================

window.ValeSpec__AppData__HardwareIndexLoader  =  ValeSpec__AppData__HardwareIndexLoader;
