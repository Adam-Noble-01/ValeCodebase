/* =============================================================================
   VGHLANTERN - VALE DATABASE API | CLIENT LOOKUP
   =============================================================================

   FILE       : VghLantern__ValeDatabase__ClientLookup__.js
   NAMESPACE  : VghLantern
   MODULE     : ValeDatabase - ClientLookup
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Job number validation and simulated client record fetch
   CREATED    : 06-Aug-2026

   DESCRIPTION:
   - Validates Vale standard job numbers (4 or 5 digits, no leading zero)
   - Fetches a client record by job number from the phoney client table JSON
   - Simulates database latency so the fetch step is demonstrable in the UI
   - Composes a single site address line from the record's address fields

   -----------------------------------------------------------------------------

   WHY THIS IS A PLACEHOLDER:
   The real system will query the Vale Garden Houses SQL client database for
   the record behind a job number. Until that endpoint exists, this module
   resolves lookups against Na__ValeDatabase__ClientRecords__.json so the
   entry, fetch, preview and confirm flow can be built and demonstrated now.
   Only FetchClientRecord changes when the SQL integration lands - callers
   already treat the lookup as async. See Na__ValeDatabase__FutureDeveloperNotes__.md.

   ============================================================================= */

// =============================================================================
// REGION | Vale Database Client Lookup Module
// =============================================================================

const VghLantern__ValeDatabase__ClientLookup = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Config Section Keys
    // ------------------------------------------------------------
    const LOOKUP_CONFIG_KEY    =  'VghLantern__ValeDatabase__Config__Lookup';                    // <-- Merged config section holding lookup tunables
    const LOOKUP_CONFIG_LABEL  =  'Na__ValeDatabase__Config.json -> VghLantern__ValeDatabase__Config__Lookup';
    // ------------------------------------------------------------


// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Lookup Config Block from Merged App Config
    // ------------------------------------------------------------
    function VghLantern__ValeDatabase__LookupConfig() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return {};

        var appConfig  =  StateManager.VghLantern__StateManager__GetAppConfig();
        if (!appConfig) return {};

        return appConfig[LOOKUP_CONFIG_KEY] || {};
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Job Number Validation
// -----------------------------------------------------------------------------

    // FUNCTION | Validate a Job Number Entry Against the Vale Format Rules
    // ------------------------------------------------------------
    // Returns { IsValid, Reason } where Reason is one of:
    // 'empty' | 'nonNumeric' | 'leadingZero' | 'tooShort' | 'tooLong' | 'ok'.
    // The caller maps Reason to its own user-facing copy, so the rule and the
    // wording of its violation live in their own homes.
    function VghLantern__ValeDatabase__ValidateJobNumber(entryText) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var config        =  VghLantern__ValeDatabase__LookupConfig();
        var minDigits     =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(config, 'JobNumberMinDigits', LOOKUP_CONFIG_LABEL);
        var maxDigits     =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(config, 'JobNumberMaxDigits', LOOKUP_CONFIG_LABEL);

        var text  =  (entryText || '').trim();

        if (text.length === 0)        return { IsValid: false, Reason: 'empty' };
        if (!/^\d+$/.test(text))      return { IsValid: false, Reason: 'nonNumeric' };
        if (text.charAt(0) === '0')   return { IsValid: false, Reason: 'leadingZero' };
        if (text.length < minDigits)  return { IsValid: false, Reason: 'tooShort' };
        if (text.length > maxDigits)  return { IsValid: false, Reason: 'tooLong' };

        return { IsValid: true, Reason: 'ok' };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Client Record Fetch - Simulated Database Round Trip
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch the Phoney Client Table Fresh From Disk
    // ------------------------------------------------------------
    // Deliberately NOT cached in the module: the table is hand-edited between
    // demonstrations, and a session cache kept serving the old records until
    // the whole app was reloaded, immune to every cache bust because the
    // request never left the page. Every lookup reads the current file - it
    // is a few kilobytes, the request is no-store end to end, and a real
    // database round trip behaves exactly the same way.
    function VghLantern__ValeDatabase__FetchTable() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var config        =  VghLantern__ValeDatabase__LookupConfig();
        var tablePath     =  ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'ClientTablePath', LOOKUP_CONFIG_LABEL);

        return fetch(tablePath, { cache: 'no-store' })
            .then(function(response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            })
            .catch(function(fetchError) {
                console.error('[VghLantern__ValeDatabase] Could not load the client table:', fetchError);
                return null;
            });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve a Value After the Simulated Latency
    // ------------------------------------------------------------
    function VghLantern__ValeDatabase__AfterSimulatedLatency(resultValue) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var config        =  VghLantern__ValeDatabase__LookupConfig();
        var latencyMs     =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(config, 'SimulatedLatencyMs', LOOKUP_CONFIG_LABEL);

        return new Promise(function(resolve) {
            setTimeout(function() { resolve(resultValue); }, latencyMs);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Fetch the Client Record Behind a Job Number
    // ------------------------------------------------------------
    // Async by contract even though the placeholder reads a local JSON file,
    // so the caller code is already correct for the real SQL round trip.
    // Resolves { Ok: true, Record } on a hit, { Ok: false, Error } otherwise
    // where Error is 'not-found' or 'unavailable'.
    async function VghLantern__ValeDatabase__FetchClientRecord(jobNumberText) {
        var tableData  =  await VghLantern__ValeDatabase__FetchTable();
        if (!tableData) {
            return VghLantern__ValeDatabase__AfterSimulatedLatency({ Ok: false, Error: 'unavailable' });
        }

        var rows       =  tableData['VghLantern__ValeDatabase__ClientTable__Rows'] || [];
        var jobNumber  =  Number((jobNumberText || '').trim());

        for (var i = 0; i < rows.length; i++) {
            if (rows[i] && rows[i].JobNumber === jobNumber) {
                return VghLantern__ValeDatabase__AfterSimulatedLatency({ Ok: true, Record: rows[i] });
            }
        }

        return VghLantern__ValeDatabase__AfterSimulatedLatency({ Ok: false, Error: 'not-found' });
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Client Table Column Descriptors
    // ------------------------------------------------------------
    // Resolves the Columns array (Key / SqlType / Label per column) so the
    // preview UI renders whatever the table declares rather than keeping its
    // own parallel field list. Resolves [] when the table is unavailable.
    async function VghLantern__ValeDatabase__GetColumns() {
        var tableData  =  await VghLantern__ValeDatabase__FetchTable();
        if (!tableData) return [];
        return tableData['VghLantern__ValeDatabase__ClientTable__Columns'] || [];
    }
    // ------------------------------------------------------------


    // FUNCTION | Compose a Single Site Address Line from a Client Record
    // ------------------------------------------------------------
    // The project file stores one SiteAddress string; the table stores the
    // address broken into fields as the real database will. Joined here in
    // one place so every consumer composes the identical line.
    function VghLantern__ValeDatabase__ComposeSiteAddress(record) {
        if (!record) return '';

        var parts  =  [record.SiteName, record.SiteAddress, record.PostTown, record.County, record.Postcode];
        return parts
            .filter(function(part) { return typeof part === 'string' && part.trim().length > 0; })
            .join(', ');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ValeDatabase__ValidateJobNumber    : VghLantern__ValeDatabase__ValidateJobNumber,
        VghLantern__ValeDatabase__FetchClientRecord    : VghLantern__ValeDatabase__FetchClientRecord,
        VghLantern__ValeDatabase__GetColumns           : VghLantern__ValeDatabase__GetColumns,
        VghLantern__ValeDatabase__ComposeSiteAddress   : VghLantern__ValeDatabase__ComposeSiteAddress
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__ValeDatabase__ClientLookup  =  VghLantern__ValeDatabase__ClientLookup;
