/* =============================================================================
   VALESPEC - HARDWARE INDEX LOADER
   =============================================================================

   FILE       : ValeSpec__AppData__HardwareIndexLoader__.js
   NAMESPACE  : ValeSpec
   MODULE     : AppData - HardwareIndexLoader
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Fetch, cache, and query the hardware data index
   CREATED    : 2026

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
    let _indexData  =  null;
    // ------------------------------------------------------------


    // FUNCTION | Load Hardware Index from JSON File
    // ------------------------------------------------------------
    async function loadIndex(indexPath) {
        try {
            var response  =  await fetch(indexPath);
            if (!response.ok) throw new Error('Hardware index fetch failed: ' + response.status);

            _indexData  =  await response.json();

            var root  =  _indexData['ValeSpec__Data__HardwareIndex__'] || _indexData;

            if (window.ValeSpec__AppCore__StateManager) {
                window.ValeSpec__AppCore__StateManager.setHardwareIndex(root);
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


    // FUNCTION | Get Hardware Item by Code
    // ------------------------------------------------------------
    function getHardwareByCode(code) {
        var root  =  _getRoot();
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
    function getHardwareByType(type) {
        var root    =  _getRoot();
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
    function getAllLeverHandles() {
        return getHardwareByType('Door Handle');
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Hardware Item by Name
    // ------------------------------------------------------------
    function getHardwareByName(name) {
        var root  =  _getRoot();
        if (!root) return null;
        return root[name] || null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Root Index Object
    // ------------------------------------------------------------
    function _getRoot() {
        if (!_indexData) return null;
        return _indexData['ValeSpec__Data__HardwareIndex__'] || _indexData;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        loadIndex           : loadIndex,
        getHardwareByCode   : getHardwareByCode,
        getHardwareByType   : getHardwareByType,
        getHardwareByName   : getHardwareByName,
        getAllLeverHandles   : getAllLeverHandles
    };

})();

// endregion ===================================================================

window.ValeSpec__AppData__HardwareIndexLoader  =  ValeSpec__AppData__HardwareIndexLoader;
