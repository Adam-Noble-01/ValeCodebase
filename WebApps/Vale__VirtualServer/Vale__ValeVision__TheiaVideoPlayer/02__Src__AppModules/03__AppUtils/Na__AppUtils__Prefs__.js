// =============================================================================
// VALEVISION THEIA - APP UTILS - PREFERENCES ON THIS DEVICE
// =============================================================================
//
// FILE       : Na__AppUtils__Prefs__.js
// NAMESPACE  : Na__Prefs
// MODULE     : App Utils - Preferences
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Remember, on this device only, the viewer's volume, quality choice
//              and where they stopped in each video
// CREATED    : 07-Oct-2026
//
// DESCRIPTION:
// - localStorage, every read and write wrapped: a private window or blocked
//   storage simply forgets, and nothing breaks.
// - Resume points are kept per project and video, for 60 days, at most 200.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Storage
// -----------------------------------------------------------------------------

    const Na__Prefs__KEY        = 'ValeVisionTheia__Prefs';
    const Na__Prefs__RESUME_KEY = 'ValeVisionTheia__ResumePoints';
    const Na__Prefs__RESUME_DAYS = 60;
    const Na__Prefs__RESUME_MAX  = 200;


    function Na__Prefs__Read(key, fallback) {
        try {
            const raw = window.localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) { return fallback; }
    }

    function Na__Prefs__Write(key, value) {
        try { window.localStorage.setItem(key, JSON.stringify(value)); return true; }
        catch (error) { return false; }
    }


    // FUNCTION | One Preference (volume, muted, qualityMode, autoAdvance)
    // ------------------------------------------------------------
    function Na__Prefs__Get(name, fallback) {
        const prefs = Na__Prefs__Read(Na__Prefs__KEY, {});
        return Object.prototype.hasOwnProperty.call(prefs, name) ? prefs[name] : fallback;
    }

    function Na__Prefs__Set(name, value) {
        const prefs = Na__Prefs__Read(Na__Prefs__KEY, {});
        prefs[name] = value;
        Na__Prefs__Write(Na__Prefs__KEY, prefs);
    }
    // ------------------------------------------------------------


    // FUNCTION | Where the Viewer Stopped in a Video (seconds), or 0
    // ------------------------------------------------------------
    function Na__Prefs__GetResume(projectId, videoId) {
        const points = Na__Prefs__Read(Na__Prefs__RESUME_KEY, {});
        const point = points[`${projectId}::${videoId}`];
        return point && (Date.now() - point.at) < Na__Prefs__RESUME_DAYS * 86400000 ? Number(point.t) || 0 : 0;
    }

    function Na__Prefs__SetResume(projectId, videoId, seconds) {
        const points = Na__Prefs__Read(Na__Prefs__RESUME_KEY, {});
        const key = `${projectId}::${videoId}`;
        if (seconds > 0) points[key] = { t: Math.round(seconds), at: Date.now() };
        else delete points[key];
        const keys = Object.keys(points);
        if (keys.length > Na__Prefs__RESUME_MAX) {
            keys.sort((a, b) => points[a].at - points[b].at).slice(0, keys.length - Na__Prefs__RESUME_MAX).forEach((k) => delete points[k]);
        }
        Na__Prefs__Write(Na__Prefs__RESUME_KEY, points);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Prefs__Get,
        Na__Prefs__Set,
        Na__Prefs__GetResume,
        Na__Prefs__SetResume
    };

// endregion -------------------------------------------------------------------
