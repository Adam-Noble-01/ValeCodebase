// =============================================================================
// VALEVISION THEIA - APP UTILS - API CLIENT
// =============================================================================
//
// FILE       : Na__AppUtils__ApiClient__.js
// NAMESPACE  : Na__Api
// MODULE     : App Utils - API Client
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Every call to the Theia API (api/..., relative to the page), with
//              the client's share token when there is one
// CREATED    : 07-Oct-2026
//
// DESCRIPTION:
// - Staff calls go through the shared sign-in's ValeUserLogin.Fetch, so a lapsed
//   session re-opens the sign-in card instead of failing silently.
// - A client (share link) never signs in: their token travels as the
//   X-Theia-Share header on every call.
// - Errors throw Na__Api__Error with the server's own words, its HTTP status
//   and whatever else it sent (for example the current list after a 409).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Client
// -----------------------------------------------------------------------------

    const Na__Api__BASE = new URL('../../api/', import.meta.url).href;            // <-- <app>/api/ wherever the app is served
    let   Na__Api__ShareToken = '';


    // CLASS | A Refused or Failed Call
    // ------------------------------------------------------------
    class Na__Api__Error extends Error {
        constructor(message, status, data) {
            super(message);
            this.status = status;
            this.data = data || {};
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Use a Share Token on Every Call (client mode)
    // ------------------------------------------------------------
    function Na__Api__SetShareToken(token) {
        Na__Api__ShareToken = String(token || '');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | fetch, Through the Sign-In When Signed In
    // ------------------------------------------------------------
    function Na__Api__Fetch(url, init) {
        const options = Object.assign({ credentials: 'same-origin', cache: 'no-store' }, init || {});
        options.headers = Object.assign({}, options.headers || {});
        if (Na__Api__ShareToken) options.headers['X-Theia-Share'] = Na__Api__ShareToken;
        const login = window.ValeUserLogin;
        return (!Na__Api__ShareToken && login && typeof login.Fetch === 'function') ? login.Fetch(url, options) : fetch(url, options);
    }
    // ------------------------------------------------------------


    // FUNCTION | Call the API: method, path (after api/), JSON body or FormData
    // ------------------------------------------------------------
    async function Na__Api__Call(method, path, body) {
        const init = { method };
        if (body instanceof FormData) init.body = body;
        else if (body !== undefined) {
            init.body = JSON.stringify(body);
            init.headers = { 'Content-Type': 'application/json' };
        }
        let response;
        try {
            response = await Na__Api__Fetch(Na__Api__BASE + String(path).replace(/^\/+/, ''), init);
        } catch (error) {
            throw new Na__Api__Error('The server could not be reached. Check your connection.', 0, {});
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.ok === false) {
            throw new Na__Api__Error(data.error || `The server answered ${response.status}.`, response.status, data);
        }
        return data;
    }
    // ------------------------------------------------------------


    // FUNCTION | Shorthands
    // ------------------------------------------------------------
    const Na__Api__Get    = (path)       => Na__Api__Call('GET', path);
    const Na__Api__Post   = (path, body) => Na__Api__Call('POST', path, body === undefined ? {} : body);
    const Na__Api__Patch  = (path, body) => Na__Api__Call('PATCH', path, body);
    const Na__Api__Delete = (path)       => Na__Api__Call('DELETE', path);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Api__BASE,
        Na__Api__Error,
        Na__Api__SetShareToken,
        Na__Api__Call,
        Na__Api__Get,
        Na__Api__Post,
        Na__Api__Patch,
        Na__Api__Delete
    };

// endregion -------------------------------------------------------------------
