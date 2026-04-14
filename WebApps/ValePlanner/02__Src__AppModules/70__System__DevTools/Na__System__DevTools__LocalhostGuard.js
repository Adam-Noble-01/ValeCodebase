// -----------------------------------------------------------------------------
// REGION | Localhost Helper Utilities
// -----------------------------------------------------------------------------

 // FUNCTION | Check if App is Running on Localhost
 // ------------------------------------------------------------
 export function Na__System__IsRunningOnLocalhost() {
     const hostnameValue = window.location.hostname;
     const portValue = window.location.port;
     return hostnameValue === 'localhost' || hostnameValue === '127.0.0.1' || portValue === '8000' || portValue === '8001' || portValue === '8081';
 }
 // ------------------------------------------------------------

// endregion ----------------------------------------------------
