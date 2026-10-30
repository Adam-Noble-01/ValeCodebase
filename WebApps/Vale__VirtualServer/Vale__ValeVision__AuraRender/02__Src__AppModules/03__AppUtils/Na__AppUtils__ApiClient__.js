// =============================================================================
// VALEVISION AURA - APP UTILS - API CLIENT
// =============================================================================
//
// FILE       : Na__AppUtils__ApiClient__.js
// NAMESPACE  : Na__Api
// MODULE     : App Utils - API Client
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Every call to the AURA API (api/..., relative to the page)
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - Calls go through the shared sign-in's ValeUserLogin.Fetch, so a lapsed
//   session re-opens the sign-in card instead of failing silently.
// - Errors throw Na__Api__Error with the server's own words, its HTTP status
//   and whatever else it sent (for example the drawing set as it is now after
//   a 409, when someone else saved first).
// - AURA has no client links (Managers and App Admins only), so unlike
//   Theia's client there is no share token.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0
// - Initial build, from ValeVision Theia's API client.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Client
// -----------------------------------------------------------------------------

    const Na__Api__BASE = new URL('../../api/', import.meta.url).href;            // <-- <app>/api/ wherever the app is served


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


    // HELPER FUNCTION | fetch, Through the Sign-In When It Is There
    // ------------------------------------------------------------
    function Na__Api__Fetch(url, init) {
        const options = Object.assign({ credentials: 'same-origin', cache: 'no-store' }, init || {});
        const login = window.ValeUserLogin;
        return (login && typeof login.Fetch === 'function') ? login.Fetch(url, options) : fetch(url, options);
    }
    // ------------------------------------------------------------


    // FUNCTION | Call the API: method, path (after api/), JSON body
    // ------------------------------------------------------------
    async function Na__Api__Call(method, path, body) {
        const init = { method };
        if (body !== undefined) {
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
    const Na__Api__Put    = (path, body) => Na__Api__Call('PUT', path, body);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Api__BASE,
        Na__Api__Error,
        Na__Api__Call,
        Na__Api__Get,
        Na__Api__Post,
        Na__Api__Put
    };

// endregion -------------------------------------------------------------------
