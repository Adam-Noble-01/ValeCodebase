/* =============================================================================
   VALEVISION 3D - APP UTILS - ACTIVITY LOG (WHAT PEOPLE DO IN THE 3D APP)
   =============================================================================

   FILE       : Na__AppUtils__ActivityLog__.js
   NAMESPACE  : (none: listens to the app's own window events)
   MODULE     : AppUtils - Activity Log
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Report ValeVision 3D's mode changes to the activity ledger through
                the shared ValeShared__ActivityLog__.js (window.ValeActivity): the
                model loaded, the Layout Editor or the client drawings opened, the
                floor plan or elevations opened, presentation scenes viewed, the
                navigation mode changed
   CREATED    : 08-Oct-2026

   DESCRIPTION:
   - NO APP CODE CHANGED: the app already announces every mode change as a window
     event (na-app-scene-ready, na-layouteditor-mode-changed, na-drawing-view-changed,
     na-pm-scene-activated, na-navigation-mode-changed); this file listens.
   - PEOPLE, NOT START-UP: the app picks a scene and a navigation mode by itself
     while it loads. Those are reported only after the person has touched, clicked
     or pressed a key, and only when they differ from the last one reported.
   - The few actions with no event (a drawing a client opens, a sheet PDF, the
     specification printed, a cross section placed, the measure tool, a Video
     Studio preview, the project link email) call window.ValeActivity.Log where
     they happen.
   - Who, where from and which project are added by the shared script and the
     server; nothing here can fail the app (no ValeActivity: nothing happens).

   =============================================================================

   DEVELOPMENT LOG:
   09-Oct-2026 - Version 1.1.0 (ValeVision3D v2.76.0)
   - The Drawing Editor page opening (na-app-page-changed, page 'drawing') is
     reported as a view, like the Layout Editor.

   08-Oct-2026 - Version 1.0.0
   - Initial build (activity ledger; the Server Manager's tab 05).

   ============================================================================= */

(function() {

// -----------------------------------------------------------------------------
// REGION | State and Helpers
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | What Was Last Reported
    // ------------------------------------------------------------
    var Na__ActLog__UserActed = false;                                         // <-- Set by the first touch, click or key
    var Na__ActLog__Last      = {};                                            // <-- kind -> last value reported
    var Na__ActLog__EditorOn  = false;
    // ------------------------------------------------------------


    // HELPER FUNCTION | Report One Thing (never throws)
    // ------------------------------------------------------------
    function Na__ActLog__Send(action, target, detail) {
        try {
            if (window.ValeActivity) window.ValeActivity.Log(action, { target: target || '', detail: detail });
        } catch (e) { /* never in the way */ }
    }

    function Na__ActLog__Changed(kind, value) {
        if (Na__ActLog__Last[kind] === value) return false;
        Na__ActLog__Last[kind] = value;
        return true;
    }

    function Na__ActLog__IsClient() {                                          // <-- No sign-in: a client on a project link
        try { return !(window.ValeUserLogin && window.ValeUserLogin.User && window.ValeUserLogin.User()); }
        catch (e) { return false; }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Listeners
// -----------------------------------------------------------------------------

    ['pointerdown', 'keydown', 'touchstart'].forEach(function(name) {
        document.addEventListener(name, function() { Na__ActLog__UserActed = true; }, { capture: true, passive: true });
    });

    // MODEL | Loaded and on screen (with the load time)
    window.addEventListener('na-app-scene-ready', function() {
        if (!Na__ActLog__Changed('model', 'ready')) return;
        var seconds = window.performance ? Math.round(window.performance.now() / 100) / 10 : null;
        Na__ActLog__Send('model.open', '', seconds ? { LoadSeconds: seconds } : undefined);
    });

    // LAYOUT EDITOR | Opened (an author) or the drawings opened (a client); each change of state once
    window.addEventListener('na-layouteditor-mode-changed', function(e) {
        var d = (e && e.detail) || {};
        if (!!d.isActive === Na__ActLog__EditorOn) return;
        Na__ActLog__EditorOn = !!d.isActive;
        if (Na__ActLog__EditorOn) Na__ActLog__Send('view.open', Na__ActLog__IsClient() ? 'the drawings' : 'the Layout Editor');
    });

    // APP PAGES | The Drawing Editor opened (Create Drawing, Saved Drawings, Forward); each change of page once
    window.addEventListener('na-app-page-changed', function(e) {
        var d = (e && e.detail) || {};
        if (!Na__ActLog__Changed('page', d.page || 'model')) return;
        if (d.page === 'drawing') Na__ActLog__Send('view.open', 'the Drawing Editor');
    });

    // DRAWING VIEW | The floor plan or the elevations
    window.addEventListener('na-drawing-view-changed', function(e) {
        var d = (e && e.detail) || {};
        if (!d.isActive) { Na__ActLog__Last.drawing = ''; return; }
        var what = d.kind === 'plan' ? 'the floor plan' : d.kind === 'elevation' ? 'the elevations' : 'a drawing view';
        if (Na__ActLog__Changed('drawing', what)) Na__ActLog__Send('view.open', what);
    });

    // PRESENTATION | A scene viewed (the one picked at start-up is the app's, not the person's)
    window.addEventListener('na-pm-scene-activated', function(e) {
        var d = (e && e.detail) || {};
        var name = d.sceneName || d.sceneId || '';
        if (!name || !Na__ActLog__Changed('scene', name) || !Na__ActLog__UserActed) return;
        Na__ActLog__Send('scene.view', name);
    });

    // NAVIGATION | Walk, orbit, fly
    window.addEventListener('na-navigation-mode-changed', function(e) {
        var mode = String(((e && e.detail) || {}).mode || '');
        if (!mode || !Na__ActLog__Changed('nav', mode) || !Na__ActLog__UserActed) return;
        Na__ActLog__Send('view.mode', mode.toLowerCase() + ' mode');
    });

// endregion -------------------------------------------------------------------

})();
